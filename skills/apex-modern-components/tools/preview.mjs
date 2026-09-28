#!/usr/bin/env node
// Offline visual preview of every component in several simulated theme styles.
//
//   node tools/preview.mjs            -> preview/index.html (open in a browser)
//
// Theme styles are simulated by setting Universal Theme CSS variables, which is
// exactly what Theme Roller and the built-in styles do. The real check is still
// a page in APEX; this is for fast iteration and screenshots.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listComponentDirs, loadComponent } from "./lib/load.mjs";
import { renderComponent } from "./lib/template-engine.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(SKILL_ROOT, "preview");

const STYLES = [
  {
    id: "vita",
    label: "Vita (light)",
    dir: "ltr",
    vars: {
      "--ut-body-background-color": "#f8f8f8",
      "--ut-component-background-color": "#ffffff",
      "--ut-component-text-default-color": "#262626",
      "--ut-component-text-muted-color": "#707070",
      "--ut-component-border-color": "rgba(0,0,0,.1)",
      "--ut-palette-primary": "#056ac8",
      "--ut-palette-success": "#278701",
      "--ut-palette-warning": "#fbce4a",
      "--ut-palette-danger": "#cb1100",
      "--ut-palette-info": "#0076df"
    }
  },
  {
    id: "vita-dark",
    label: "Vita Dark",
    dir: "ltr",
    vars: {
      "--ut-body-background-color": "#161616",
      "--ut-component-background-color": "#262626",
      "--ut-component-text-default-color": "#f2f2f2",
      "--ut-component-text-muted-color": "#a8a8a8",
      "--ut-component-border-color": "rgba(255,255,255,.12)",
      "--ut-palette-primary": "#3f9eff",
      "--ut-palette-primary-contrast": "#0b0b0b",
      "--ut-palette-success": "#4fbf2a",
      "--ut-palette-success-contrast": "#0b0b0b",
      "--ut-palette-warning": "#ffd24d",
      "--ut-palette-danger": "#ff5a4a",
      "--ut-palette-danger-contrast": "#0b0b0b",
      "--ut-palette-info": "#5fb2ff"
    }
  },
  {
    id: "redwood-rtl",
    label: "Redwood-like, RTL",
    dir: "rtl",
    vars: {
      "--ut-body-background-color": "#f5f4f2",
      "--ut-component-background-color": "#fcfbfa",
      "--ut-component-text-default-color": "#161513",
      "--ut-component-text-muted-color": "#6f6964",
      "--ut-component-border-color": "rgba(22,21,19,.14)",
      "--ut-component-border-radius": "6px",
      "--ut-palette-primary": "#227e9e",
      "--ut-palette-success": "#508223",
      "--ut-palette-warning": "#ac630c",
      "--ut-palette-danger": "#b3261e",
      "--ut-palette-info": "#227e9e"
    }
  }
];

// Styles generated from DESIGN.md files (tools/design-md-to-ut.mjs) get their own panels.
const STYLES_DIR = path.join(SKILL_ROOT, "styles");
if (fs.existsSync(STYLES_DIR)) {
  for (const f of fs.readdirSync(STYLES_DIR).filter((n) => n.endsWith(".vars.json")).sort()) {
    const spec = JSON.parse(fs.readFileSync(path.join(STYLES_DIR, f), "utf8"));
    STYLES.push({ id: `ds-${spec.slug}`, label: `${spec.slug} (DESIGN.md${spec.dark ? ", dark" : ""})`, dir: "ltr", vars: spec.vars });
  }
}

const units = listComponentDirs(path.join(SKILL_ROOT, "components")).map(loadComponent);
const css = units.flatMap((u) => u.loaded.files.filter((f) => f.fileName.endsWith(".css")).map((f) => f.content.toString("utf8")));

function sampleHtml(unit) {
  const file = path.join(unit.dir, "examples", "preview.json");
  if (!fs.existsSync(file)) return [];
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  return spec.samples.map((s) => ({
    title: s.title,
    html: s.html ?? renderComponent(unit.loaded.templates, s)
  }));
}

const sections = units
  .map((u) => ({ unit: u, samples: sampleHtml(u) }))
  .filter((s) => s.samples.length);

const styleBlocks = STYLES.map(
  (s) => `.pv-${s.id} { ${Object.entries(s.vars).map(([k, v]) => `${k}: ${v};`).join(" ")} }`
).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>APEX Modern Components Preview</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<style>
${styleBlocks}
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #e9e9e9; }
h1 { margin: 0; padding: 16px; font-size: 18px; }
.pv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 16px; padding: 0 16px 16px; }
.pv-theme { padding: 16px; border-radius: 8px; background: var(--ut-body-background-color); color: var(--ut-component-text-default-color); }
.pv-theme > h2 { margin: 0 0 12px; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; opacity: .7; }
.pv-region { margin-block-end: 16px; padding: 12px 16px; border-radius: 8px; background: var(--ut-component-background-color); border: 1px solid var(--ut-component-border-color); }
.pv-region > h3 { margin: 0 0 10px; font-size: 14px; font-weight: 600; }
.pv-region.pv-bare { padding: 0; background: none; border: 0; }
/* Minimal stand-in for Universal Theme buttons used by Empty State */
.t-Button { display: inline-flex; align-items: center; padding: 8px 12px; border-radius: 4px; border: 0; font: inherit; font-size: 13px; text-decoration: none; background: var(--ut-palette-primary); color: var(--ut-palette-primary-contrast, #fff); }
/* Glyph fallbacks in case the icon font cannot load (APEX ships Font APEX) */
.fa-star::before { content: "\\2605"; } .fa-check::before { content: "\\2713"; } .fa-exclamation::before { content: "!"; }
.fa-arrow-up::before { content: "\\2191"; } .fa-arrow-down::before { content: "\\2193"; } .fa-minus::before { content: "\\2212"; }
.fa-times-circle-o::before { content: "\\2715"; } .fa-inbox::before, .fa-search::before, .fa-money::before, .fa-ticket::before,
.fa-clock-o::before, .fa-bug::before, .fa-user::before, .fa-building-o::before, .fa-calendar::before, .fa-sticky-note-o::before { content: "\\25CF"; }
.fa { font-style: normal; }
${css.join("\n")}
</style>
</head>
<body>
<h1>APEX Modern Components &middot; offline preview</h1>
<div class="pv-grid">
${STYLES.map(
  (s) => `<div class="pv-theme pv-${s.id}" dir="${s.dir}">
<h2>${s.label}</h2>
${sections
  .map((sec) =>
    sec.samples
      .map(
        (sample) => `<section class="pv-region${sample.bare ? " pv-bare" : ""}"><h3>${sec.unit.component.name} &middot; ${sample.title}</h3>
${sample.html}
</section>`
      )
      .join("\n")
  )
  .join("\n")}
</div>`
).join("\n")}
</div>
</body>
</html>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "index.html"), html);
console.log(`wrote ${path.relative(SKILL_ROOT, path.join(OUT_DIR, "index.html"))}`);
