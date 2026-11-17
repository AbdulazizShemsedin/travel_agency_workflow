import { V1_ROUTES, type V1Route } from "./v1Routes.generated";

/**
 * Sends old-style calls to the backend's /v1 routes.
 *
 * The API modules still name an operation the old way (`/api/method/agency_tracking.api.X.read?op=Y`
 * or a legacy dotted name) with its old arguments. Every /v1 route names the operation it replaces
 * and which old argument each path or renamed query parameter fills, so one table (generated from
 * the backend's /openapi.json, see scripts/gen-v1-routes.mjs) turns such a call into its /v1 request:
 * path parameters and query parameters filled from the arguments, the rest in the body.
 *
 * A /v1 JSON body is closed: a field it doesn't declare fails the whole call (422). Such fields are
 * left out and reported in `dropped`, so a test run lists every argument the backend no longer reads.
 */

/** Old names that /v1 serves under another operation. */
const OP_ALIASES: Record<string, string> = {
  list_assigned_steps: "list_my_clearance_steps",
};

/** Arguments that were part of the old transport, not of any operation. */
const TRANSPORT_ARGS = new Set(["op", "cmd"]);

export interface V1Call {
  op: string;
  url: string;
  method: V1Route["m"];
  body?: Record<string, unknown> | FormData;
  /** The answer field that holds what the old operation answered, if not the whole body. */
  answer?: string;
  /** Arguments the route doesn't take, left out of the request. */
  dropped: string[];
}

/** The operation an old endpoint names: `?op=` (or `op` in the body), else its last name segment. */
export function oldOperation(endpoint: string, payload?: unknown): string | null {
  const [pathPart, query = ""] = endpoint.split("?");
  const fromQuery = new URLSearchParams(query).get("op");
  if (fromQuery) return fromQuery;
  if (payload instanceof FormData) {
    const v = payload.get("op");
    if (typeof v === "string" && v) return v;
  } else if (payload && typeof payload === "object") {
    const op = (payload as Record<string, unknown>).op;
    if (typeof op === "string" && op) return op;
  }
  const m = pathPart.match(/\/api\/method\/(.+)$/);
  if (!m) return null;
  return m[1].split(".").pop() || null;
}

function queryValue(v: unknown, asList: boolean): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (Array.isArray(v)) {
    if (asList) {
      const parts = v.map((x) => String(x).trim()).filter(Boolean);
      return parts.length ? parts.join(",") : null;
    }
    return JSON.stringify(v);
  }
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

/** A list argument may arrive as a JSON array string or comma-separated text. */
function listArg(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not JSON: comma-separated
    }
  }
  return s;
}

/**
 * The /v1 request for an old-style call, or null when /v1 has no route for the operation.
 * Throws when an argument the route's path needs is missing.
 */
export function toV1Call(endpoint: string, payload?: unknown): V1Call | null {
  const named = oldOperation(endpoint, payload);
  if (!named) return null;
  const op = OP_ALIASES[named] || named;
  const route = V1_ROUTES[op];
  if (!route) return null;

  // Every argument, from the query string and the body. The body wins, as on the old routes.
  const args: Record<string, unknown> = {};
  const query = endpoint.includes("?") ? endpoint.slice(endpoint.indexOf("?") + 1) : "";
  new URLSearchParams(query).forEach((v, k) => {
    args[k] = v;
  });
  const files: [string, Blob, string | undefined][] = [];
  if (payload instanceof FormData) {
    payload.forEach((v, k) => {
      if (typeof v === "string") args[k] = v;
      else files.push([k, v, (v as File).name]);
    });
  } else if (payload && typeof payload === "object") {
    Object.assign(args, payload as Record<string, unknown>);
  }
  for (const k of TRANSPORT_ARGS) delete args[k];

  // Path parameters.
  let url = route.p;
  for (const [param, old] of Object.entries(route.path || {})) {
    const v = args[old] ?? args[param];
    if (v === undefined || v === null || String(v).trim() === "") {
      throw new Error(`${op}: missing ${old}`);
    }
    url = url.replace(`{${param}}`, encodeURIComponent(String(v).trim()));
    delete args[old];
    delete args[param];
  }

  // Query parameters.
  const qs = new URLSearchParams();
  for (const [param, spec] of Object.entries(route.q || {})) {
    const asList = Array.isArray(spec);
    const old = asList ? spec[0] : spec;
    const has = old in args;
    const raw = has ? args[old] : args[param];
    const v = queryValue(asList ? listArg(raw) : raw, asList);
    if (v !== null) qs.set(param, v);
    delete args[old];
    delete args[param];
  }
  const qstr = qs.toString();
  if (qstr) url += `?${qstr}`;

  const dropped: string[] = [];
  let body: V1Call["body"];
  if (route.body === "multipart") {
    const fd = new FormData();
    for (const [k, v] of Object.entries(args)) {
      if (v === undefined || v === null) continue;
      fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    }
    for (const [k, blob, name] of files) {
      if (name) fd.append(k, blob, name);
      else fd.append(k, blob);
    }
    body = fd;
  } else if (route.body === "json") {
    const out: Record<string, unknown> = {};
    const accepts = route.props ? new Set(route.props) : null;
    for (const [k, v] of Object.entries(args)) {
      if (v === undefined) continue;
      if (accepts && !accepts.has(k)) {
        dropped.push(k);
        continue;
      }
      out[k] = v;
    }
    body = out;
  } else {
    dropped.push(...Object.keys(args).filter((k) => args[k] !== undefined));
  }
  if (files.length && route.body !== "multipart") {
    dropped.push(...files.map(([k]) => k));
  }

  return { op, url, method: route.m, body, answer: route.ans, dropped };
}

/** Whether /v1 has a route for this operation. */
export function hasV1Route(op: string): boolean {
  return Boolean(V1_ROUTES[OP_ALIASES[op] || op]);
}

/**
 * The /v1 address for an old-style GET link (an image, a download, a media link the backend wrote),
 * or the link unchanged when it isn't an old route or /v1 has no GET route for it.
 */
export function toV1Url(link: string): string {
  if (!link || !link.includes("/api/method/")) return link;
  try {
    const call = toV1Call(link.slice(link.indexOf("/api/method/")));
    if (!call || call.method !== "GET") return link;
    return call.url;
  } catch {
    return link;
  }
}
