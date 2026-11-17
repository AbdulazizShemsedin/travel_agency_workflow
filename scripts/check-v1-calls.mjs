// Checks every requestV2 call against the generated /v1 route table: which route it reaches, the
// arguments that route does not take (DROPPED), path arguments it lacks, and calls with no /v1 route.
// usage: npm run check:v1-calls
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tableSrc = fs.readFileSync(path.join(root, "src/lib/api/v2/v1Routes.generated.ts"), "utf8");
const V1_ROUTES = JSON.parse(tableSrc.slice(tableSrc.indexOf("= {") + 2).replace(/;\s*$/, ""));
const ALIASES = { list_assigned_steps: "list_my_clearance_steps" };

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".generated.ts") ? [p] : [];
  });
}

function literalText(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((s) => "${}" + s.literal.text).join("");
  return null;
}

function opOf(endpoint, bodyKeys) {
  const m = endpoint.match(/[?&]op=([a-z_]+)/);
  if (m) return m[1];
  const p = endpoint.split("?")[0].match(/\/api\/method\/(.+)$/);
  return p ? p[1].split(".").pop() : null;
}

// Keys of an object literal; spreads and computed keys make the set open ("...").
function objectKeys(node, sf) {
  if (!node) return { keys: [], open: false, opValue: null };
  if (!ts.isObjectLiteralExpression(node)) return { keys: [], open: true, opValue: null };
  const keys = [];
  let open = false;
  let opValue = null;
  for (const p of node.properties) {
    if (ts.isSpreadAssignment(p)) {
      // `...(cond ? { a: x } : {})` is common: take the keys of both branches.
      let e = p.expression;
      while (ts.isParenthesizedExpression(e)) e = e.expression;
      if (ts.isConditionalExpression(e)) {
        for (const br of [e.whenTrue, e.whenFalse]) {
          let b = br;
          while (ts.isParenthesizedExpression(b)) b = b.expression;
          const sub = objectKeys(b, sf);
          keys.push(...sub.keys);
          open ||= sub.open;
        }
      } else if (ts.isObjectLiteralExpression(e)) {
        keys.push(...objectKeys(e, sf).keys);
      } else open = true;
      continue;
    }
    if ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name) {
      const k = ts.isComputedPropertyName(p.name) ? null : p.name.text ?? p.name.getText(sf);
      if (!k) {
        open = true;
        continue;
      }
      keys.push(k);
      if (k === "op" && ts.isPropertyAssignment(p)) opValue = literalText(p.initializer);
    } else open = true;
  }
  return { keys, open, opValue };
}

const report = [];
for (const file of files(path.join(root, "src"))) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("requestV2")) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "requestV2") {
      const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
      const where = `${path.relative(root, file)}:${line}`;
      const endpoint = literalText(n.arguments[0]);
      const opts = n.arguments[1];
      let body = { keys: [], open: false, opValue: null };
      let bodyExpr = null;
      if (opts && ts.isObjectLiteralExpression(opts)) {
        for (const p of opts.properties) {
          if (ts.isPropertyAssignment(p) && p.name.getText(sf) === "body") bodyExpr = p.initializer;
          if (ts.isShorthandPropertyAssignment(p) && p.name.text === "body") bodyExpr = p.name;
        }
        if (bodyExpr) body = objectKeys(bodyExpr, sf);
      }
      const isLegacy = opts && ts.isObjectLiteralExpression(opts) && opts.properties.some((p) => p.name?.getText(sf) === "legacy");
      if (isLegacy) {
        report.push({ where, kind: "ok-legacy" });
      } else if (!endpoint) {
        report.push({ where, kind: "dynamic-endpoint", detail: n.arguments[0]?.getText(sf).slice(0, 80) });
      } else if (endpoint.startsWith("/v1/")) {
        report.push({ where, kind: "direct-v1", detail: endpoint });
      } else {
        const named = body.opValue || opOf(endpoint);
        const op = ALIASES[named] || named;
        const r = V1_ROUTES[op];
        if (!r) report.push({ where, kind: "NO-ROUTE", op: named, detail: endpoint });
        else {
          const qArgs = new Set(Object.values(r.q || {}).map((v) => (Array.isArray(v) ? v[0] : v)).concat(Object.keys(r.q || {})));
          const pArgs = Object.entries(r.path || {});
          // query-string args in the endpoint count as sent
          const endpointArgs = [...(endpoint.split("?")[1] || "").matchAll(/([a-z_]+)=/g)].map((m) => m[1]).filter((k) => k !== "op");
          const sent = new Set([...body.keys, ...endpointArgs].filter((k) => k !== "op"));
          const missingPath = pArgs.filter(([param, old]) => !sent.has(old) && !sent.has(param)).map(([, old]) => old);
          const rest = [...sent].filter((k) => !qArgs.has(k) && !pArgs.some(([param, old]) => k === old || k === param));
          let dropped = [];
          if (r.body === "json" && r.props) dropped = rest.filter((k) => !r.props.includes(k));
          else if (!r.body) dropped = rest;
          const entry = { where, op, route: `${r.m} ${r.p}` };
          if (missingPath.length && !body.open) report.push({ ...entry, kind: "MISSING-PATH-ARG", detail: missingPath.join(",") });
          if (dropped.length) report.push({ ...entry, kind: "DROPPED", detail: dropped.join(",") });
          if (body.open) report.push({ ...entry, kind: "open-body", detail: bodyExpr ? bodyExpr.getText(sf).slice(0, 70).replace(/\s+/g, " ") : "" });
          if (!body.open && !missingPath.length && !dropped.length) report.push({ ...entry, kind: "ok" });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

const counts = report.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
console.log(JSON.stringify(counts));
for (const r of report.filter((r) => !r.kind.startsWith("ok"))) {
  console.log(`${r.kind.padEnd(17)} ${r.where.padEnd(58)} ${r.op || ""} ${r.route || ""} :: ${r.detail || ""}`);
}
