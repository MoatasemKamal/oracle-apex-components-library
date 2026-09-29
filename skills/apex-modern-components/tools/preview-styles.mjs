#!/usr/bin/env node
// Offline preview of the theme styles on a Universal Theme mock page, one isolated frame per
// style, with a sample of the library's components inside the page.
//
//   node tools/preview-styles.mjs                 -> preview/styles.html
//   node tools/preview-styles.mjs --only <slug>   -> preview/styles-<slug>.html (also a dark-mode frame for auto styles)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listComponentDirs, loadComponent } from "./lib/load.mjs";
import { renderComponent } from "./lib/template-engine.mjs";
import { listStyleDirs, loadStyle } from "./lib/theme-styles.mjs";
import { UT_LITE_CSS, mockPage } from "./lib/ut-mock.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

let dirs = listStyleDirs(path.join(SKILL_ROOT, "theme-styles"));
if (only) dirs = dirs.filter((d) => path.basename(d) === only);
const styles = dirs.map(loadStyle).filter((t) => t.css);

// A few library components shown inside the mock page (first sample of each).
const SHOWCASE = ["next-kpi", "next-badge", "next-button"];
const compCss = [];
const compJs = [];
const blocks = [];
for (const dir of listComponentDirs(path.join(SKILL_ROOT, "components"))) {
  if (!SHOWCASE.includes(path.basename(dir))) continue;
  try {
    const unit = loadComponent(dir);
    unit.loaded.files.forEach((f) => (f.fileName.endsWith(".css") ? compCss : f.fileName.endsWith(".js") ? compJs : []).push(f.content.toString("utf8")));
    const sample = JSON.parse(fs.readFileSync(path.join(dir, "examples", "preview.json"), "utf8")).samples[0];
    blocks.push(renderComponent(unit.loaded.templates, sample));
  } catch (e) {
    console.warn(`skip ${path.basename(dir)}: ${e.message}`);
  }
}
const components = `<div style="display:grid;gap:16px">${blocks.join("")}</div>`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
function frame(t, { dir = "ltr", dark = false } = {}) {
  const doc = `<!doctype html><html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<style>${UT_LITE_CSS}
${compCss.join("\n")}
${t.css.toString("utf8")}</style></head><body class="t-PageBody ${t.spec.cssClasses || ""}">${mockPage({ components, dir })}
${compJs.map((c) => `<script>${c.replace(/<\/script/gi, "<\\/script")}</script>`).join("")}</body></html>`;
  return `<figure class="pv-frame"><figcaption>${t.spec.name} &middot; ${t.spec.scheme}${dark ? " (system dark)" : ""}${dir === "rtl" ? " &middot; RTL" : ""}</figcaption>
<iframe title="${esc(t.spec.name)}" data-style="${t.slug}"${dark ? ' data-dark="1"' : ""} srcdoc="${esc(doc)}"></iframe></figure>`;
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>APEX Theme Styles Preview</title>
<style>
body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #e9e9e9; }
h1 { font-size: 18px; margin: 0 0 12px; }
.pv-frame { margin: 0 0 24px; }
figcaption { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
iframe { width: 100%; height: 900px; border: 1px solid #bbb; border-radius: 8px; background: #fff; }
</style></head><body>
<h1>APEX theme styles &middot; offline preview on a Universal Theme mock page</h1>
${styles.map((t) => frame(t) + (only ? frame(t, { dir: "rtl" }) : "") + (only && t.spec.scheme === "auto" ? frame(t, { dark: true }) : "")).join("\n")}
</body></html>`;

const out = path.join(SKILL_ROOT, "preview", only ? `styles-${only}.html` : "styles.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(SKILL_ROOT, out)}`);
