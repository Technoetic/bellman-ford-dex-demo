const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const SRC_HTML = path.join(ROOT, "index.html");
const DIST = path.join(ROOT, "dist");
const DIST_HTML = path.join(DIST, "index.html");

fs.mkdirSync(DIST, { recursive: true });

// 1. Inline CSS (follow @import chain in main.css)
function resolveCss(entry) {
  const dir = path.dirname(entry);
  let text = fs.readFileSync(entry, "utf8");
  const importRe = /@import\s+url\(["']?([^"')]+)["']?\);?/g;
  text = text.replace(importRe, (_, p) => {
    const child = path.resolve(dir, p);
    return resolveCss(child);
  });
  return text;
}

const cssText = resolveCss(path.join(ROOT, "src/css/main.css"));

// 2. Inline JS modules in dependency order
const JS_ORDER = [
  "src/js/dexData.js",
  "src/js/BellmanFord.js",
  "src/js/DexController.js",
  "src/js/app.js",
];

function stripEsm(code) {
  return code
    .replace(/^\s*import\s+[^;]+;?\s*$/gm, "")
    .replace(/^\s*export\s+(class|const|let|var|function)/gm, "$1")
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, "")
    .replace(/^\s*export\s+default\s+/gm, "");
}

const jsText = JS_ORDER.map((f) => {
  const raw = fs.readFileSync(path.join(ROOT, f), "utf8");
  return `// ${f}\n${stripEsm(raw)}`;
}).join("\n\n");

// 3. Rewrite index.html: replace <link> and <script> with inline
let html = fs.readFileSync(SRC_HTML, "utf8");
html = html.replace(
  /<link rel="stylesheet" href="src\/css\/main\.css" \/>/,
  `<style>\n${cssText}\n</style>`,
);
html = html.replace(
  /<script type="module" src="src\/js\/app\.js"><\/script>/,
  `<script>\n${jsText}\n</script>`,
);

fs.writeFileSync(DIST_HTML, html, "utf8");

// 4. Copy static images (real-apps screenshots) preserving relative paths
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(path.join(ROOT, "src/images"), path.join(DIST, "src/images"));

console.log(
  "bundle OK:",
  DIST_HTML,
  `(${(fs.statSync(DIST_HTML).size / 1024).toFixed(1)} KB)`,
);
