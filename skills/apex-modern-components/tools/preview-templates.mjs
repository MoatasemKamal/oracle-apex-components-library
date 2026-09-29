#!/usr/bin/env node
// Offline preview of the creative theme templates in simulated theme styles.
//
//   node tools/preview-templates.mjs                 -> preview/templates.html
//   node tools/preview-templates.mjs --only <slug>   -> preview/templates-<slug>.html
//
// Region templates wrap stand-ins for native content (report, form, chart, cards, text) so
// you can judge the frame the way it looks around real APEX regions.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { THEME_STYLES } from "./lib/preview-themes.mjs";
import { listTemplateDirs, loadTemplate, renderList, renderRegion } from "./lib/theme-templates.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const styles = THEME_STYLES.slice(0, 3);

const BODIES = {
  report: `<table class="pv-report"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th class="pv-num">Amount</th></tr></thead><tbody>
<tr><td>SO-55120</td><td>Al Noor Trading</td><td>Shipped</td><td class="pv-num">48,300</td></tr>
<tr><td>SO-55127</td><td>Gulf Medical Supplies</td><td>Picking</td><td class="pv-num">12,780</td></tr>
<tr><td>SO-55131</td><td>Red Sea Logistics</td><td>On hold</td><td class="pv-num">7,450</td></tr></tbody></table>`,
  form: `<div class="pv-form"><label>Customer<input value="Al Noor Trading Co." readonly></label><label>Credit limit<input value="SAR 250,000" readonly></label><label class="pv-wide">Notes<textarea readonly>Net-30 terms. Key account for wholesale electronics.</textarea></label></div>`,
  chart: `<svg class="pv-chart" viewBox="0 0 320 120" role="img" aria-label="Monthly revenue"><g>${[48, 62, 55, 80, 72, 95, 88].map((v, i) => `<rect x="${12 + i * 44}" y="${110 - v}" width="28" height="${v}" rx="4"></rect>`).join("")}</g></svg>`,
  cards: `<div class="pv-cards">${["Open orders|128", "Revenue|SAR 4.2M", "Avg. response|3.4 h"].map((s) => `<div><span>${s.split("|")[0]}</span><strong>${s.split("|")[1]}</strong></div>`).join("")}</div>`,
  text: `<p class="pv-text">Quarter close runs on 30 September. Post all supplier invoices by the 27th so accruals are complete; late items move to October.</p>`
};

let dirs = listTemplateDirs(path.join(SKILL_ROOT, "theme-templates"));
if (only) dirs = dirs.filter((d) => path.basename(d) === only);
const templates = dirs.flatMap((d) => {
  try { return [loadTemplate(d)]; } catch (e) { console.warn(`skip ${path.basename(d)}: ${e.message}`); return []; }
});

const css = templates.flatMap((t) => t.files.filter((f) => f.name.endsWith(".css")).map((f) => f.content.toString("utf8")));
const js = templates.flatMap((t) => t.files.filter((f) => f.name.endsWith(".js")).map((f) => f.content.toString("utf8")));

function samples(t) {
  return (t.preview?.samples || []).flatMap((s, n) => {
    try {
      const html = t.spec.kind === "list" ? renderList(t, s, n) : renderRegion(t, s, s.body ?? BODIES[s.bodyKind || "report"] ?? "", n);
      return [{ title: s.title, html, wide: s.wide }];
    } catch (e) {
      console.warn(`skip ${t.slug} sample "${s.title}": ${e.message}`);
      return [];
    }
  });
}

const styleBlocks = styles.map((s) => `.pv-${s.id} { ${Object.entries(s.vars).map(([k, v]) => `${k}: ${v};`).join(" ")} }`).join("\n");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>APEX Creative Templates Preview</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<style>
${styleBlocks}
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 14px; background: #e9e9e9; }
h1 { margin: 0; padding: 16px; font-size: 18px; }
.pv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(460px, 100%), 1fr)); gap: 16px; padding: 0 16px 16px; }
.pv-theme { padding: 16px; border-radius: 8px; background: var(--ut-body-background-color); color: var(--ut-component-text-default-color); min-width: 0; }
.pv-theme > h2 { margin: 0 0 12px; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; opacity: .7; }
.pv-sample { margin-block-end: 22px; }
.pv-sample > h3 { margin: 0 0 8px; font-size: 12px; font-weight: 600; opacity: .7; }
/* Stand-ins for native Universal Theme content inside region templates */
.pv-report { width: 100%; border-collapse: collapse; font-size: 13px; }
.pv-report th, .pv-report td { padding: 8px 10px; border-bottom: 1px solid var(--ut-component-border-color); text-align: start; }
.pv-report th { font-weight: 600; color: var(--ut-component-text-muted-color); font-size: 12px; }
.pv-num { text-align: end !important; font-variant-numeric: tabular-nums; }
.pv-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.pv-form label { display: grid; gap: 4px; font-size: 12px; color: var(--ut-component-text-muted-color); }
.pv-form .pv-wide { grid-column: 1 / -1; }
.pv-form input, .pv-form textarea { font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 4px; border: 1px solid var(--ut-component-border-color); background: var(--ut-component-background-color); color: var(--ut-component-text-default-color); }
.pv-chart { width: 100%; height: auto; display: block; } .pv-chart rect { fill: var(--ut-palette-primary); opacity: .85; }
.pv-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
.pv-cards div { display: grid; gap: 2px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--ut-component-border-color); background: var(--ut-component-background-color); }
.pv-cards span { font-size: 12px; color: var(--ut-component-text-muted-color); } .pv-cards strong { font-size: 18px; }
.pv-text { margin: 0; line-height: 1.5; max-width: 65ch; }
.t-Button { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--ut-component-border-color); font: inherit; font-size: 12px; background: var(--ut-component-background-color); color: var(--ut-component-text-default-color); }
.t-Button--hot { background: var(--ut-palette-primary); border-color: transparent; color: var(--ut-palette-primary-contrast, #fff); }
.fa { font-style: normal; }
${css.join("\n")}
</style>
</head>
<body>
<h1>APEX creative theme templates &middot; offline preview</h1>
<div class="pv-grid">
${styles.map((s) => `<div class="pv-theme pv-${s.id}" dir="${s.dir}">
<h2>${s.label}</h2>
${templates.map((t) => samples(t).map((x) => `<section class="pv-sample" data-template="${t.slug}"><h3>${t.spec.name} &middot; ${x.title}</h3>
${x.html}
</section>`).join("\n")).join("\n")}
</div>`).join("\n")}
</div>
${js.map((code) => `<script>${code.replace(/<\/script/gi, "<\\/script")}</script>`).join("\n")}
</body>
</html>
`;

const out = path.join(SKILL_ROOT, "preview", only ? `templates-${only}.html` : "templates.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(SKILL_ROOT, out)}`);
