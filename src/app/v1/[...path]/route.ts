import { NextRequest } from "next/server";

/**
 * Passes /v1/* through to the backend's /v1 API.
 *
 * The browser stays on this site's origin, so the session cookie is first-party. The request goes
 * through as sent (method, query, body, CSRF header, cookie) and the answer comes back as sent:
 * status (404, 422, 204 ...), body streamed (files and PDFs included), and redirects not followed,
 * so a download that points at storage reaches the browser as the redirect. Set-Cookie loses its
 * Domain and gets Secure only on HTTPS, as on the /api/method proxy.
 */

export const dynamic = "force-dynamic";

const FORWARD_REQUEST_HEADERS = [
  "accept",
  "content-type",
  "cookie",
  "authorization",
  "x-frappe-csrf-token",
  "range",
  "if-none-match",
  "if-modified-since",
];

const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  // not content-length: fetch hands over the body decompressed, so the backend's length is wrong
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
  "last-modified",
  "location",
];

function backendUrl(): string | null {
  const url =
    process.env.BACKEND_URL ||
    process.env.GO_BACKEND_URL ||
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL;
  return url ? url.replace(/\/$/, "") : null;
}

function isHttps(req: NextRequest) {
  return req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";
}

function sanitizeCookie(cookie: string, https: boolean) {
  let cleaned = cookie.replace(/;\s*Domain=[^;]+/gi, "");
  if (!/;\s*SameSite=/i.test(cleaned)) cleaned += "; SameSite=Lax";
  if (https) {
    if (!/;\s*Secure/i.test(cleaned)) cleaned += "; Secure";
  } else {
    cleaned = cleaned.replace(/;\s*Secure/gi, "");
  }
  return cleaned;
}

function problem(status: number, detail: string) {
  return new Response(
    JSON.stringify({ status, title: status === 504 ? "Gateway Timeout" : "Bad Gateway", detail, kind: "BackendConnectionError" }),
    { status, headers: { "content-type": "application/problem+json" } }
  );
}

async function pass(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const base = backendUrl();
  if (!base) return problem(502, "The backend address is not configured.");
  const { path } = await ctx.params;
  const target = `${base}/v1/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const h of FORWARD_REQUEST_HEADERS) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (base.includes("ngrok")) headers.set("ngrok-skip-browser-warning", "true");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const isGetOrHead = req.method === "GET" || req.method === "HEAD";
  // Long work (CV and PDF rendering, OCR) answers slowly; everything else gets 45s.
  const slow = /\/(cv|cv\.pdf|invoice\.pdf|injaz-paper\.pdf|parse\/[a-z]+)$/.test(req.nextUrl.pathname);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), slow ? 180000 : 45000);

  let res: Response;
  try {
    res = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: isGetOrHead ? "follow" : "manual",
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if ((err as Error)?.name === "AbortError") return problem(504, "The server took too long to respond. Please try again in a moment.");
    console.error("[PROXY /v1]", req.method, req.nextUrl.pathname, err);
    return problem(502, "Unable to connect to the server. Please check your network connection and try again.");
  }

  const out = new Headers();
  for (const h of FORWARD_RESPONSE_HEADERS) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  if (out.has("content-disposition")) {
    out.set("Access-Control-Expose-Headers", "Content-Disposition, Content-Type");
  }
  const isFileOrMedia = req.nextUrl.pathname.includes("/files/") || req.nextUrl.pathname.includes("/photo");
  if (isFileOrMedia && res.ok && !out.has("cache-control")) {
    out.set("cache-control", "private, max-age=3600, stale-while-revalidate=86400");
  }
  const https = isHttps(req);
  const cookies: string[] =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie")
      ? [res.headers.get("set-cookie") as string]
      : [];
  // Never pass auth-clearing cookies back on file/media requests
  if (!isFileOrMedia) {
    for (const c of cookies) out.append("set-cookie", sanitizeCookie(c, https));
  }

  // A body can't go with 204/304; otherwise stream it (the timer covers the wait for headers only).
  const noBody = res.status === 204 || res.status === 304 || req.method === "HEAD";
  const body = noBody ? null : res.body;
  clearTimeout(timer);
  return new Response(body, { status: res.status, headers: out });
}

export const GET = pass;
export const POST = pass;
export const PUT = pass;
export const PATCH = pass;
export const DELETE = pass;
export const HEAD = pass;
