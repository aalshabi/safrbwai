// Usage: node deps.mjs <repoRoot> <outDir>
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
const root = path.resolve(process.argv[2]); const out = process.argv[3];
const exts = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css"];
function tryFile(p) {
  for (const e of exts) { const f = p + e; if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
  for (const e of exts.slice(1)) { const f = path.join(p, "index" + e); if (fs.existsSync(f)) return f; }
  return null;
}
const external = new Set(); const seen = new Set(); const unresolved = [];
function resolveSpec(spec, from) {
  if (spec.startsWith("@/")) return tryFile(path.join(root, "src", spec.slice(2)));
  if (spec.startsWith(".")) return tryFile(path.resolve(path.dirname(from), spec));
  return undefined; // package
}
const seeds = ["src/app/page.tsx", "src/app/layout.tsx", "src/app/loading.tsx", "src/app/manifest.ts", "src/middleware.ts"];
const stack = seeds.map((s) => path.join(root, s));
while (stack.length) {
  const f = stack.pop(); if (seen.has(f)) continue; seen.add(f);
  if (!/\.(tsx?|jsx?|mjs|css)$/.test(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  const re = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)|@import\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1] || m[2] || m[3] || m[4];
    const r = resolveSpec(spec, f);
    if (r === undefined) { external.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]); continue; }
    if (r === null) { unresolved.push(`${path.relative(root, f)} -> ${spec}`); continue; }
    stack.push(r);
  }
}
// public assets referenced as string literals "/x.ext" in dep files
const pub = new Set();
for (const f of seen) {
  if (!fs.existsSync(f) || !/\.(tsx?|css|mjs)$/.test(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/["'(](\/[A-Za-z0-9_\-./]+\.(?:svg|png|jpe?g|webp|ico|gif|avif|woff2?|json|txt|xml))["')]/g)) {
    const p = path.join(root, "public", m[1]); if (fs.existsSync(p)) pub.add(p);
  }
}
const extra = ["src/app/globals.css", "src/app/icon.svg", "src/app/apple-icon.png", "tailwind.config.ts", "postcss.config.mjs", "next.config.mjs", "tsconfig.json", "package.json", "package-lock.json"].map((s) => path.join(root, s)).filter((p) => fs.existsSync(p));
const all = [...new Set([...seen, ...pub, ...extra])].map((p) => path.relative(root, p)).sort();
fs.writeFileSync(path.join(out, "deps.txt"), all.join("\n") + "\n");
fs.writeFileSync(path.join(out, "deps.sha256"), all.map((p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, p))).digest("hex") + "  " + p).join("\n") + "\n");
fs.writeFileSync(path.join(out, "deps-external-packages.txt"), [...external].sort().join("\n") + "\n");
console.log("files:", all.length, "external pkgs:", external.size, "unresolved:", unresolved);
