// Universal Theme Styles (Theme Roller styles) shipped by this library.
// Loads theme-styles/<slug>/, validates it (incl. WCAG contrast of the key color pairs),
// emits an APEXlang `style` (26.1+) and a 23.1 export (create_theme_style + static file).

import fs from "node:fs";
import path from "node:path";
import { LEGACY_BASELINE } from "./tokens.mjs";
import { makeId, legacyFooter, legacyHeader } from "./theme-templates.mjs";

export const STYLE_FOLDER = "amc-styles";
export const THEME_DIR = "universal-theme";
// Built-in Universal Theme style CSS a custom style layers on top of (confirm on the target release).
export const BASES = {
  vita: "#THEME_FILES#css/Vita#MIN#.css?v=#APEX_VERSION#",
  "vita-dark": "#THEME_FILES#css/Vita-Dark#MIN#.css?v=#APEX_VERSION#",
  "vita-slate": "#THEME_FILES#css/Vita-Slate#MIN#.css?v=#APEX_VERSION#",
  redwood: "#THEME_FILES#css/Redwood-Light#MIN#.css?v=#APEX_VERSION#"
};
const SCHEMES = ["light", "dark", "auto"];
// Variables every style must set (the library's components and templates read them).
export const REQUIRED_VARS = [
  "--ut-body-background-color", "--ut-body-text-color",
  "--ut-component-background-color", "--ut-component-text-default-color", "--ut-component-text-muted-color",
  "--ut-component-border-color", "--ut-component-border-radius", "--ut-link-text-color",
  "--ut-palette-primary", "--ut-palette-primary-contrast",
  "--ut-palette-success", "--ut-palette-warning", "--ut-palette-danger", "--ut-palette-info"
];
// Text/background pairs that must pass WCAG AA (4.5:1), and non-text UI pairs (3:1).
const TEXT_PAIRS = [
  ["--ut-body-text-color", "--ut-body-background-color"],
  ["--ut-component-text-default-color", "--ut-component-background-color"],
  ["--ut-component-text-muted-color", "--ut-component-background-color"],
  ["--ut-link-text-color", "--ut-component-background-color"],
  ["--ut-palette-primary-contrast", "--ut-palette-primary"]
];
const UI_PAIRS = [["--ut-palette-primary", "--ut-component-background-color"]];

export function listStyleDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "dist")
    .map((d) => path.join(root, d.name))
    .filter((d) => fs.existsSync(path.join(d, "style.json")))
    .sort();
}

export function loadStyle(dir) {
  const slug = path.basename(dir);
  const spec = JSON.parse(fs.readFileSync(path.join(dir, "style.json"), "utf8"));
  const cssFile = path.join(dir, `amc-style-${slug}.css`);
  const css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile) : null;
  return { dir, slug, spec, css, fileName: `amc-style-${slug}.css` };
}

// ---------------------------------------------------------------- color math

function parseColor(v) {
  v = String(v).trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(v);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  if (v === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (v === "black") return { r: 0, g: 0, b: 0, a: 1 };
  return null;
}
const lum = ({ r, g, b }) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
export function contrast(fg, bg) {
  const f = lum(over(fg, bg)), b = lum(bg);
  return (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05);
}

// Split top-level CSS into @media blocks and the rest (brace matching, comments removed).
export function splitMedia(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const media = [];
  let rest = "";
  let i = 0;
  while (i < src.length) {
    const at = src.indexOf("@media", i);
    if (at < 0) { rest += src.slice(i); break; }
    rest += src.slice(i, at);
    const open = src.indexOf("{", at);
    let depth = 1, j = open + 1;
    while (j < src.length && depth) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; j++; }
    media.push({ query: src.slice(at + 6, open).trim(), body: src.slice(open + 1, j - 1) });
    i = j;
  }
  return { rest, media };
}

// Palette of a scheme: `:root` declarations outside any @media (light or only palette), or
// inside the prefers-color-scheme: dark media block (dark palette of an auto style).
export function schemeVars(css, scheme = "base") {
  const { rest, media } = splitMedia(css);
  if (scheme === "dark") {
    return media.filter((m) => /prefers-color-scheme:\s*dark/.test(m.query)).reduce((acc, m) => ({ ...acc, ...rootVars(m.body) }), {});
  }
  return rootVars(rest);
}

// Declarations inside plain `:root {` blocks of the given CSS text.
export function rootVars(css, selector = ":root") {
  const vars = {};
  const re = new RegExp(`(^|\\n)\\s*${selector.replace(/[[\]()*.:]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g");
  let m;
  while ((m = re.exec(css))) {
    for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) vars[d[1]] = d[2].trim();
  }
  return vars;
}

function resolve(vars, name, depth = 0) {
  const v = vars[name];
  if (!v || depth > 5) return null;
  const ref = /^var\((--[a-z0-9-]+)(?:\s*,\s*([^)]+))?\)$/i.exec(v);
  if (ref) return resolve(vars, ref[1], depth + 1) ?? (ref[2] ? parseColor(ref[2]) : null);
  return parseColor(v);
}

export function contrastReport(vars) {
  const rows = [];
  for (const [pairs, min] of [[TEXT_PAIRS, 4.5], [UI_PAIRS, 3]]) {
    for (const [f, b] of pairs) {
      const fg = resolve(vars, f), bg = resolve(vars, b);
      if (!fg || !bg) { rows.push({ f, b, min, ratio: null }); continue; }
      rows.push({ f, b, min, ratio: Math.round(contrast(fg, { ...bg, a: 1 }) * 100) / 100 });
    }
  }
  return rows;
}

// ---------------------------------------------------------------- validate

export function validateStyle(t) {
  const { slug, spec: s, css } = t;
  const errors = [];
  const warnings = [];
  const need = (c, msg) => c || errors.push(`${slug}: ${msg}`);
  need(/^[a-z][a-z0-9-]*$/.test(slug), "folder name must be kebab-case");
  need(typeof s.name === "string" && s.name.length > 0 && !/[(){}:]/.test(s.name), "name is required and must not contain ( ) { } or a colon");
  need(/^AMC_STYLE_[A-Z0-9_]+$/.test(s.staticId || ""), "staticId must match AMC_STYLE_[A-Z0-9_]+");
  need(/^\d+\.\d+\.\d+$/.test(s.version || ""), "version must be semver");
  need(BASES[s.base], `base must be one of ${Object.keys(BASES).join(", ")}`);
  need(SCHEMES.includes(s.scheme), "scheme must be light, dark or auto");
  need(s.description, "description is required");
  need(s.helpText, "helpText is required");
  need(Array.isArray(s.fonts || []), "fonts must be an array of font-family stacks");
  need(css, `amc-style-${slug}.css is required`);
  if (!css) return { errors, warnings, contrast: [] };
  const text = css.toString("utf8");

  const vars = schemeVars(text);
  for (const v of REQUIRED_VARS) need(v in vars, `:root must set ${v}`);
  if (/@import\b/.test(text)) errors.push(`${slug}: @import is not allowed (app CSP and offline installs); inline fonts are not shipped`);
  if (/url\(\s*["']?https?:/i.test(text)) errors.push(`${slug}: external url() is not allowed; use data: URIs`);
  if (/#[A-Za-z][\w-]*\s*[{,]/.test(text.replace(/#[0-9a-fA-F]{3,8}\b/g, ""))) warnings.push(`${slug}: id selectors found; prefer classes`);
  if (/(animation|transition)\s*:/.test(text) && !/prefers-reduced-motion/.test(text)) errors.push(`${slug}: CSS animates but has no prefers-reduced-motion override`);
  if (/transition\s*:\s*all\b/.test(text)) errors.push(`${slug}: transition: all is not allowed`);
  const selectors = [...text.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(^|})\s*([^{}@][^{}]*)\{/g)].map((m) => m[2].trim());
  for (const sel of selectors) {
    for (const cls of sel.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
      if (!/^(t-|a-|apex-|u-|amc-|ui-|is-|js-|has-)/.test(cls[1])) warnings.push(`${slug}: selector uses non-APEX class .${cls[1]}`);
    }
  }
  if (s.scheme === "auto") {
    need(/prefers-color-scheme:\s*dark/.test(text), "an auto style must redefine the palette under @media (prefers-color-scheme: dark)");
  }
  const report = contrastReport(vars).map((r) => ({ ...r, scheme: s.scheme === "auto" ? "light" : s.scheme }));
  if (s.scheme === "auto") {
    const dark = schemeVars(text, "dark");
    report.push(...contrastReport({ ...vars, ...dark }).map((r) => ({ ...r, scheme: "dark" })));
  }
  for (const r of report) {
    const tag = s.scheme === "auto" ? ` (${r.scheme})` : "";
    if (r.ratio === null) warnings.push(`${slug}${tag}: contrast of ${r.f} on ${r.b} not computed (non-literal color)`);
    else if (r.ratio < r.min) errors.push(`${slug}${tag}: contrast ${r.ratio}:1 of ${r.f} on ${r.b} is below ${r.min}:1`);
  }
  return { errors, warnings, contrast: report };
}

// ---------------------------------------------------------------- emit

const IND = "    ";
export const styleId = (t) => `amc-${t.slug}`;
export const fileUrl = (t) => `#APP_FILES#${STYLE_FOLDER}/${t.fileName}`;
export const apexlangPath = (t) => path.join("shared-components", "themes", THEME_DIR, "styles", `${styleId(t)}.apx`);

export function emitApexlang(t) {
  const s = t.spec;
  return [
    `style ${styleId(t)} (`,
    `${IND}name: ${s.name}`,
    `${IND}css {`,
    `${IND}${IND}fileUrls: [`,
    `${IND}${IND}${IND}${BASES[s.base]}`,
    `${IND}${IND}${IND}${fileUrl(t)}`,
    `${IND}${IND}]`,
    ...(s.cssClasses ? [`${IND}${IND}cssClasses: ${s.cssClasses}`] : []),
    `${IND}}`,
    `${IND}themeRollerAttributes {`,
    `${IND}${IND}readOnly: true`,
    `${IND}}`,
    `${IND}advanced {`,
    `${IND}${IND}staticId: ${s.staticId}`,
    `${IND}${IND}endUserCanPick: ${s.endUserCanPick === false ? "false" : "true"}`,
    `${IND}${IND}accessibilityTested: false`,
    `${IND}}`,
    `${IND}comments {`,
    `${IND}${IND}comments:`,
    `${IND}${IND}${IND}\`\`\`text`,
    ...s.helpText.split("\n").map((l) => `${IND}${IND}${IND}${l}`),
    `${IND}${IND}${IND}\`\`\``,
    `${IND}}`,
    ")",
    ""
  ].join("\n");
}

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const params = (list) => list.filter(([, v]) => v !== null && v !== undefined).map(([k, v], i) => `${i ? "," : " "}${k}=>${v}`).join("\n");

export function legacyBody(t) {
  const s = t.spec;
  const published = `${STYLE_FOLDER}/${t.fileName}`;
  const hex = t.css.toString("hex").toUpperCase();
  const out = [`prompt --application/shared_components/files/${published.replace(/[^a-z0-9]+/gi, "_")}`, "begin", "wwv_flow_imp.g_varchar2_table := wwv_flow_imp.empty_varchar2_table;"];
  for (let i = 0, n = 1; i < hex.length; i += 400, n++) out.push(`wwv_flow_imp.g_varchar2_table(${n}) := '${hex.slice(i, i + 400)}';`);
  out.push("end;", "/", "begin", "wwv_flow_imp_shared.create_app_static_file(",
    params([["p_id", `wwv_flow_imp.id(${makeId(published)})`], ["p_file_name", q(published)], ["p_mime_type", "'text/css'"], ["p_file_charset", "'utf-8'"], ["p_file_content", "wwv_flow_imp.varchar2_to_blob(wwv_flow_imp.g_varchar2_table)"]]),
    ");", "end;", "/");
  out.push(`prompt --application/shared_components/user_interface/themes/styles/${t.slug.replace(/-/g, "_")}`, "begin", "wwv_flow_imp_shared.create_theme_style(",
    params([
      ["p_id", `wwv_flow_imp.id(${makeId(s.staticId, "style")})`],
      ["p_theme_id", 42],
      ["p_name", q(s.name)],
      ["p_css_file_urls", q(fileUrl(t))],
      ["p_css_classes", s.cssClasses ? q(s.cssClasses) : null],
      ["p_is_public", s.endUserCanPick === false ? "false" : "true"],
      ["p_is_accessible", "false"],
      ["p_theme_roller_output_file_url", q(BASES[s.base])],
      ["p_theme_roller_read_only", "true"]
    ]), ");", "end;", "/");
  return out;
}

export { legacyHeader, legacyFooter, LEGACY_BASELINE };
