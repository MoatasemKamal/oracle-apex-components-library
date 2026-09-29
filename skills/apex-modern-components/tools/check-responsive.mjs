#!/usr/bin/env node
// Responsive check: renders every component sample, theme template sample and theme style
// (on the Universal Theme mock page) at several viewport widths in Chromium, and reports
//   - page-level horizontal scroll, and
//   - elements that stick out of their sample container (not inside a scrolling area).
//
//   node tools/check-responsive.mjs [--only <slug>] [--kind components|templates|styles]
//                                   [--widths 320,390,768,1024,1440] [--json]
//
// Needs the `playwright` package (npm i -D playwright, or NODE_PATH pointing at one) and a
// Chromium (PLAYWRIGHT_BROWSERS_PATH or CHROMIUM_PATH). Exit code 1 when problems are found.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { listComponentDirs, loadComponent } from "./lib/load.mjs";
import { renderComponent } from "./lib/template-engine.mjs";
import { THEME_STYLES } from "./lib/preview-themes.mjs";
import { listTemplateDirs, loadTemplate, renderList, renderRegion } from "./lib/theme-templates.mjs";
import { BODIES, PREVIEW_BODY_CSS } from "./lib/preview-bodies.mjs";
import { listStyleDirs, loadStyle } from "./lib/theme-styles.mjs";
import { UT_LITE_CSS, mockPage } from "./lib/ut-mock.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const only = opt("--only", null);
const kinds = (opt("--kind", "components,templates,styles")).split(",");
const widths = opt("--widths", "320,390,768,1024,1440").split(",").map(Number);
const asJson = args.includes("--json");

let chromium;
try {
  const req = createRequire(path.join(process.cwd(), "noop.js"));
  ({ chromium } = req("playwright"));
} catch {
  try { ({ chromium } = await import("playwright")); } catch {
    console.error("check-responsive needs the playwright package: npm i -D playwright (or set NODE_PATH)");
    process.exit(2);
  }
}

const vita = THEME_STYLES[0].vars;
const vars = `:root{${Object.entries(vita).map(([k, v]) => `${k}:${v}`).join(";")}}`;
const BASE = `*,*::before,*::after{box-sizing:border-box}body{margin:0;font:14px/1.4 system-ui,sans-serif;background:var(--ut-body-background-color);color:var(--ut-component-text-default-color)}
.rc-sample{padding:12px 16px;min-width:0}.t-Button{display:inline-flex;padding:6px 10px;border-radius:4px;border:1px solid var(--ut-component-border-color);font:inherit}.fa{font-style:normal}`;

// Each page: { id, kind, html (body), css, js }
const pages = [];
if (kinds.includes("components")) {
  for (const dir of listComponentDirs(path.join(SKILL_ROOT, "components"))) {
    const slug = path.basename(dir);
    if (only && slug !== only) continue;
    let unit;
    try { unit = loadComponent(dir); } catch (e) { console.warn(`skip ${slug}: ${e.message}`); continue; }
    const pv = path.join(dir, "examples", "preview.json");
    if (!fs.existsSync(pv)) continue;
    const css = unit.loaded.files.filter((f) => f.fileName.endsWith(".css")).map((f) => f.content.toString("utf8")).join("\n");
    const js = unit.loaded.files.filter((f) => f.fileName.endsWith(".js")).map((f) => f.content.toString("utf8")).join("\n;\n");
    JSON.parse(fs.readFileSync(pv, "utf8")).samples.forEach((s, i) => {
      let html;
      try { html = s.html ?? renderComponent(unit.loaded.templates, s); } catch { return; }
      pages.push({ id: `${slug} #${i + 1} ${s.title || ""}`.trim(), kind: "component", html: `<div class="rc-sample">${html}</div>`, css, js });
    });
  }
}
if (kinds.includes("templates")) {
  for (const dir of listTemplateDirs(path.join(SKILL_ROOT, "theme-templates"))) {
    const slug = path.basename(dir);
    if (only && slug !== only) continue;
    let t;
    try { t = loadTemplate(dir); } catch (e) { console.warn(`skip ${slug}: ${e.message}`); continue; }
    const css = PREVIEW_BODY_CSS + t.files.filter((f) => f.name.endsWith(".css")).map((f) => f.content.toString("utf8")).join("\n");
    const js = t.files.filter((f) => f.name.endsWith(".js")).map((f) => f.content.toString("utf8")).join("\n;\n");
    (t.preview?.samples || []).forEach((s, i) => {
      let html;
      try { html = t.spec.kind === "list" ? renderList(t, s, i) : renderRegion(t, s, s.body ?? BODIES[s.bodyKind || "report"] ?? "", i); } catch { return; }
      pages.push({ id: `${slug} #${i + 1} ${s.title || ""}`.trim(), kind: "template", html: `<div class="rc-sample">${html}</div>`, css, js });
    });
  }
}
if (kinds.includes("styles")) {
  for (const dir of listStyleDirs(path.join(SKILL_ROOT, "theme-styles"))) {
    const slug = path.basename(dir);
    if (only && slug !== only) continue;
    const t = loadStyle(dir);
    if (!t.css) continue;
    pages.push({ id: `${slug} (style)`, kind: "style", html: mockPage({}), css: UT_LITE_CSS + "\n" + t.css.toString("utf8"), js: "", bodyClass: `t-PageBody ${t.spec.cssClasses || ""}` });
  }
}

const exe = process.env.CHROMIUM_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const results = [];
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const pg of pages) {
    const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${vars}${BASE}${pg.css}</style></head><body class="${pg.bodyClass || ""}">${pg.html}<script>window.apex=window.apex||{item:function(){return{setValue:function(){},getValue:function(){return""}}}};${(pg.js || "").replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
    const errors = [];
    page.removeAllListeners("pageerror");
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setContent(doc, { waitUntil: "load" });
    await page.waitForTimeout(120);
    const found = await page.evaluate(() => {
      const out = [];
      const pageOverflow = document.documentElement.scrollWidth - window.innerWidth;
      if (pageOverflow > 1) out.push({ what: "page scrolls sideways", by: Math.round(pageOverflow) });
      const root = document.querySelector(".rc-sample") || document.body;
      const box = root.getBoundingClientRect();
      const scrollsX = (el) => {
        for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && a !== document.body && a !== document.documentElement) return true;
        }
        return false;
      };
      const seen = new Set();
      for (const el of root.querySelectorAll("*")) {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.display === "none" || cs.visibility === "hidden") continue;
        if (el.closest("[aria-hidden='true']") && cs.position === "absolute") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const over = Math.max(r.right - box.right, box.left - r.left);
        if (over > 2 && !scrollsX(el)) {
          const key = (el.className && String(el.className).split(" ")[0]) || el.tagName.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ what: `${el.tagName.toLowerCase()}.${String(el.className || "").split(" ").filter(Boolean).slice(0, 2).join(".")} sticks out`, by: Math.round(over) });
        }
      }
      return out.slice(0, 6);
    });
    if (errors.length) found.push({ what: `page error: ${errors[0]}`, by: 0 });
    if (found.length) results.push({ width, id: pg.id, kind: pg.kind, problems: found });
  }
  await ctx.close();
}
await browser.close();

if (asJson) {
  console.log(JSON.stringify({ widths, checked: pages.length, results }, null, 2));
} else {
  for (const r of results) console.log(`FAIL ${String(r.width).padStart(4)}px  ${r.id}: ${r.problems.map((p) => `${p.what}${p.by ? ` (${p.by}px)` : ""}`).join("; ")}`);
  console.log(`${results.length ? "FAIL" : "ok  "}  ${pages.length} sample(s) x ${widths.length} width(s), ${results.length} problem(s)`);
}
process.exit(results.length ? 1 : 0);
