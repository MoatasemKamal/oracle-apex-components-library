// Creative theme templates (List Templates and Region Templates) for Universal Theme apps.
// Loads theme-templates/<slug>/, validates it, emits APEXlang (26.1+) and a 23.1 SQL export,
// and renders offline previews. APEX itself remains the real renderer.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { LEGACY_BASELINE } from "./tokens.mjs";
import { checkCss, versionAtLeast } from "./validate.mjs";

export const THEME_DIR = "universal-theme"; // theme folder name in an APEXlang app (scaffold default)
export const THEME_ID = 42; // Universal Theme
export const STATIC_FOLDER = "amc-templates";
const DIRECTIONS = ["motion", "depth", "bold", "smart", "living"];

// ---------------------------------------------------------------- parts

// List template parts: file name -> APEXlang group/key and legacy parameter.
export const LIST_PARTS = [
  { file: "before.html", group: "list", key: "beforeEntries", legacy: "p_list_template_before_rows", required: true },
  { file: "between.html", group: "list", key: "betweenEntries", legacy: "p_between_items" },
  { file: "after.html", group: "list", key: "afterEntries", legacy: "p_list_template_after_rows", required: true },
  { file: "current.html", group: "entry", key: "current", legacy: "p_list_template_current", required: true },
  { file: "current-with-sublist.html", group: "entry", key: "currentWithSublist", legacy: "p_item_templ_curr_w_child" },
  { file: "noncurrent.html", group: "entry", key: "noncurrent", legacy: "p_list_template_noncurrent", required: true },
  { file: "noncurrent-with-sublist.html", group: "entry", key: "noncurrentWithSublist", legacy: "p_item_templ_noncurr_w_child" },
  { file: "first-current.html", group: "firstEntry", key: "current", legacy: "p_first_list_template_current" },
  { file: "first-noncurrent.html", group: "firstEntry", key: "noncurrent", legacy: "p_first_list_template_noncurrent" },
  { file: "sublist-before.html", group: "sublist", key: "beforeEntries", legacy: "p_before_sub_list" },
  { file: "sublist-after.html", group: "sublist", key: "afterEntries", legacy: "p_after_sub_list" },
  { file: "sublist-current.html", group: "sublistEntry", key: "current", legacy: "p_sub_list_item_current" },
  { file: "sublist-noncurrent.html", group: "sublistEntry", key: "noncurrent", legacy: "p_sub_list_item_noncurrent" }
];
export const REGION_PARTS = [{ file: "region.html", group: "region", key: "template", legacy: "p_template", required: true }];

const ATTR_TOKENS = Array.from({ length: 20 }, (_, i) => `A${String(i + 1).padStart(2, "0")}`);
const LIST_WRAP_TOKENS = new Set(["COMPONENT_CSS_CLASSES", "LIST_ID", "PARENT_STATIC_ID", "APP_FILES", "THEME_FILES", "APEX_FILES"]);
const LIST_ENTRY_TOKENS = new Set([
  "TEXT", "TEXT_ESC_SC", "LINK", "IMAGE", "IMAGE_ATTR", "IMAGE_ALT", "ICON_CSS_CLASSES",
  "LIST_ITEM_ID", "PARENT_LIST_ITEM_ID", "LIST_STATUS", ...ATTR_TOKENS, "APP_FILES", "THEME_FILES", "APEX_FILES"
]);
// Button positions of Universal Theme region templates (all exist in 23.1).
export const REGION_BUTTON_POSITIONS = ["CLOSE", "EDIT", "HELP", "DELETE", "CHANGE", "COPY", "CREATE", "EXPAND", "NEXT", "PREVIOUS"];
const REGION_TOKENS = new Set([
  "TITLE", "BODY", "SUB_REGIONS", "REGION_STATIC_ID", "REGION_CSS_CLASSES", "REGION_ATTRIBUTES",
  "ICON_CSS_CLASSES", ...REGION_BUTTON_POSITIONS, "APP_FILES", "THEME_FILES", "APEX_FILES"
]);

// ---------------------------------------------------------------- load

export function listTemplateDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "dist")
    .map((d) => path.join(root, d.name))
    .filter((d) => fs.existsSync(path.join(d, "template.json")))
    .sort();
}

export function loadTemplate(dir) {
  const slug = path.basename(dir);
  const spec = JSON.parse(fs.readFileSync(path.join(dir, "template.json"), "utf8"));
  const partsDef = spec.kind === "region" ? REGION_PARTS : LIST_PARTS;
  const parts = {};
  for (const p of partsDef) {
    const file = path.join(dir, "parts", p.file);
    if (fs.existsSync(file)) parts[p.file] = fs.readFileSync(file, "utf8").replace(/\s+$/, "");
  }
  const files = [];
  const filesDir = path.join(dir, "files");
  if (fs.existsSync(filesDir)) {
    for (const name of fs.readdirSync(filesDir).sort()) {
      if (!/\.(css|js)$/.test(name)) continue;
      files.push({ name, content: fs.readFileSync(path.join(filesDir, name)) });
    }
  }
  const previewFile = path.join(dir, "examples", "preview.json");
  const preview = fs.existsSync(previewFile) ? JSON.parse(fs.readFileSync(previewFile, "utf8")) : null;
  return { dir, slug, spec, parts, partsDef, files, preview };
}

// ---------------------------------------------------------------- validate

const tokensIn = (text) => [...text.matchAll(/#([A-Z][A-Z0-9_$]*)#/g)].map((m) => m[1]);

export function validateTemplate(t) {
  const { slug, spec: s, parts, partsDef, files } = t;
  const errors = [];
  const warnings = [];
  const need = (cond, msg) => cond || errors.push(`${slug}: ${msg}`);

  need(/^[a-z][a-z0-9-]*$/.test(slug), "folder name must be kebab-case");
  need(s.kind === "list" || s.kind === "region", "kind must be list or region");
  need(typeof s.name === "string" && s.name.length > 0, "name is required");
  need(/^AMC_TPL_[A-Z0-9_]+$/.test(s.staticId || ""), "staticId must match AMC_TPL_[A-Z0-9_]+");
  need(/^\d+\.\d+\.\d+$/.test(s.version || ""), "version must be semver x.y.z");
  need(/^\d{2}\.\d$/.test(s.minApexVersion || "") && versionAtLeast(s.minApexVersion, "23.1"), "minApexVersion must be 23.1 or later");
  need(DIRECTIONS.includes(s.direction), `direction must be one of ${DIRECTIONS.join(", ")}`);
  need(s.description, "description is required");
  need(s.helpText, "helpText is required (it is shown as the template comment)");
  need(s.useFor, "useFor is required (which native regions or lists to pair it with)");
  if (s.source) {
    need(s.source.url && s.source.license, "source needs url and license");
    if (s.source.license && !/^(MIT|Apache-2\.0|ISC|BSD-2-Clause|BSD-3-Clause|0BSD|CC0-1\.0|Original)$/.test(s.source.license)) {
      errors.push(`${slug}: source license '${s.source.license}' is not on the permissive allow-list`);
    }
  }
  // apexlang treats ( ) { } on unfenced lines as structure.
  const inline = [s.name, ...(s.templateOptions || []).map((o) => o.name), ...Object.values(s.attributes || {})];
  for (const v of inline) if (v && /[(){}:]/.test(String(v))) errors.push(`${slug}: value "${v}" contains ( ) { } or a colon, which APEXlang reads as structure; rephrase it`);

  for (const p of partsDef) if (p.required) need(parts[p.file] !== undefined, `parts/${p.file} is required`);
  const allowedFor = (file) => (s.kind === "region" ? REGION_TOKENS : /^(before|after|between|sublist-before|sublist-after)\.html$/.test(file) ? LIST_WRAP_TOKENS : LIST_ENTRY_TOKENS);
  for (const [file, text] of Object.entries(parts)) {
    for (const tok of tokensIn(text)) if (!allowedFor(file).has(tok)) errors.push(`${slug}: parts/${file} uses unknown substitution #${tok}#`);
    if (/<script/i.test(text)) errors.push(`${slug}: parts/${file} contains <script>; ship JS as a file`);
    if (/style\s*=\s*"[^"]*#[A-Z]/.test(text)) errors.push(`${slug}: parts/${file} substitutes a value into a style attribute`);
    if (/\{(if|case|with|apply|loop)\b/.test(text)) errors.push(`${slug}: parts/${file} uses template directives; theme templates here use plain substitutions only`);
    if (/<img\b/i.test(text) && !/<img\b[^>]*\balt=/i.test(text)) errors.push(`${slug}: parts/${file} has an <img> without alt`);
  }
  const partText = Object.values(parts).join("\n");
  if (s.kind === "list") {
    need(/#COMPONENT_CSS_CLASSES#/.test(parts["before.html"] || ""), "parts/before.html must carry #COMPONENT_CSS_CLASSES# so template options apply");
    const hasChild = parts["current-with-sublist.html"] || parts["noncurrent-with-sublist.html"];
    const hasSub = parts["sublist-before.html"] || parts["sublist-current.html"];
    if (hasChild || hasSub) {
      for (const f of ["current-with-sublist.html", "noncurrent-with-sublist.html", "sublist-before.html", "sublist-after.html", "sublist-current.html", "sublist-noncurrent.html"]) {
        need(parts[f] !== undefined, `sublist support needs parts/${f}`);
      }
    }
    for (const k of Object.keys(s.attributes || {})) need(/^a(0[1-9]|1\d|20)$/.test(k), `attributes key ${k} must be a01..a20`);
  } else {
    for (const tok of ["TITLE", "BODY", "SUB_REGIONS", "REGION_STATIC_ID", "REGION_CSS_CLASSES", "REGION_ATTRIBUTES"]) {
      need(partText.includes(`#${tok}#`), `parts/region.html must contain #${tok}#`);
    }
    if (s.landmarkType) need(["region", "complementary", "form", "navigation", "search", "main", "banner", "contentInfo"].includes(s.landmarkType), "landmarkType is not valid");
  }

  const css = files.filter((f) => f.name.endsWith(".css")).map((f) => f.content.toString("utf8")).join("\n");
  need(files.some((f) => f.name === `amc-tpl-${slug}.css`), `files/amc-tpl-${slug}.css is required`);
  for (const f of files) need(f.name === `amc-tpl-${slug}.css` || f.name === `amc-tpl-${slug}.js`, `files/${f.name}: only amc-tpl-${slug}.css and .js are allowed`);
  checkCss(slug, css, errors, warnings);
  const js = files.filter((f) => f.name.endsWith(".js")).map((f) => f.content.toString("utf8")).join("\n");
  if (js && /\.innerHTML\s*=/.test(js)) errors.push(`${slug}: JS assigns innerHTML; build DOM with textContent`);
  if (js && /[^\x00-\x7F]/.test(js)) errors.push(`${slug}: JS contains non-ASCII characters; write them as \\uXXXX escapes (files may be served without a UTF-8 charset)`);

  const optIds = new Set();
  for (const o of s.templateOptions || []) {
    need(/^[A-Z][A-Z0-9_]*$/.test(o.staticId || ""), `template option ${o.name}: staticId must be UPPER_SNAKE`);
    need(!optIds.has(o.staticId), `duplicate template option ${o.staticId}`);
    optIds.add(o.staticId);
    need(/^amc-T[A-Za-z0-9-]*$/.test(o.cssClass || ""), `template option ${o.staticId}: cssClass must be one amc-T... class`);
    need(css.includes(`.${o.cssClass}`), `template option ${o.staticId}: .${o.cssClass} is not styled in the CSS`);
    need(Number.isInteger(o.sequence), `template option ${o.staticId}: sequence must be an integer`);
    need(o.help, `template option ${o.staticId}: help is required`);
  }
  for (const v of [...(s.defaultOptions || []), ...(s.presetOptions || [])]) {
    need((s.templateOptions || []).some((o) => o.cssClass === v), `default/preset option ${v} is not a declared template option class`);
  }
  if (!t.preview) errors.push(`${slug}: examples/preview.json is required`);
  if (!fs.existsSync(path.join(t.dir, "examples")) || !fs.readdirSync(path.join(t.dir, "examples")).some((n) => n.endsWith(".apx.md"))) {
    errors.push(`${slug}: examples/*.apx.md with an APEXlang usage example is required`);
  }
  return { errors, warnings };
}

// ---------------------------------------------------------------- APEXlang

const IND = "    ";
const ind = (n) => IND.repeat(n);
function fence(key, text, level) {
  const pad = ind(level + 1);
  return [`${ind(level)}${key}:`, `${pad}\`\`\`html`, ...text.split("\n").map((l) => (l ? pad + l : l)), `${pad}\`\`\``];
}
function group(name, lines, level) {
  const body = lines.filter(Boolean).flat();
  return body.length ? [`${ind(level)}${name} {`, ...body, `${ind(level)}}`] : [];
}
function array(key, values, level) {
  return [`${ind(level)}${key}: [`, ...values.map((v) => `${ind(level + 1)}${v}`), `${ind(level)}]`];
}
export const componentId = (t) => `amc-${t.slug}`;
export const fileUrls = (t, ext) =>
  t.files.filter((f) => f.name.endsWith(ext)).map((f) => `#APP_FILES#${STATIC_FOLDER}/${f.name}`);

export function emitApexlang(t) {
  const { spec: s, parts, partsDef } = t;
  const out = [`${s.kind === "list" ? "listTemplate" : "regionTemplate"} ${componentId(t)} (`, `${ind(1)}name: ${s.name}`];
  const opts = [];
  if ((s.presetOptions || []).length) opts.push(array("preset", s.presetOptions, 2));
  if ((s.defaultOptions || []).length) opts.push(array("default", s.defaultOptions, 2));
  out.push(...group("templateOptions", opts, 1));
  const groups = [...new Set(partsDef.map((p) => p.group))];
  for (const g of groups) {
    const lines = partsDef.filter((p) => p.group === g && parts[p.file] !== undefined).map((p) => fence(p.key, parts[p.file], 2));
    out.push(...group(g, lines, 1));
  }
  if (s.kind === "region") out.push(...group("accessibility", [`${ind(2)}landmarkType: ${s.landmarkType || "region"}`], 1));
  const js = fileUrls(t, ".js");
  if (js.length) out.push(...group("javaScript", [array("fileUrls", js, 2)], 1));
  out.push(...group("css", [array("fileUrls", fileUrls(t, ".css"), 2)], 1));
  if (s.kind === "list" && Object.keys(s.attributes || {}).length) {
    out.push(...group("attributeDescriptions", Object.entries(s.attributes).map(([k, v]) => `${ind(2)}${k}: ${v}`), 1));
  }
  out.push(...group("advanced", [`${ind(2)}staticId: ${s.staticId}`, `${ind(2)}translatable: false`], 1));
  out.push(...group("comments", fence("comments", s.helpText, 2).map((l) => l.replace("```html", "```text")), 1));
  for (const o of s.templateOptions || []) {
    out.push(
      "",
      `${ind(1)}templateOption ${componentId(t)}-${o.staticId.toLowerCase().replace(/_/g, "-")} (`,
      `${ind(2)}name: ${o.name}`,
      `${ind(2)}sequence: ${o.sequence}`,
      ...group("appearance", [`${ind(3)}cssClasses: ${o.cssClass}`], 2),
      ...group("help", fence("helpText", o.help, 3).map((l) => l.replace("```html", "```text")), 2),
      ...group("advanced", [`${ind(3)}isAdvancedOption: false`, `${ind(3)}staticId: ${o.staticId}`], 2),
      `${ind(1)})`
    );
  }
  out.push(")", "");
  return out.join("\n");
}

export function apexlangPath(t) {
  return path.join("shared-components", "themes", THEME_DIR, t.spec.kind === "list" ? "list-templates" : "region-templates", `${componentId(t)}.apx`);
}

export function staticFilesSnippet(t) {
  return t.files
    .map((f) => [`file "${STATIC_FOLDER}/${f.name}" (`, `    mimeType: ${f.name.endsWith(".css") ? "text/css" : "application/javascript"}`, "    charSet: utf-8", ")", ""].join("\n"))
    .join("\n");
}

// ---------------------------------------------------------------- legacy SQL (23.1 baseline)

export function makeId(...parts) {
  const h = crypto.createHash("sha256").update(parts.join("|")).digest();
  return (h.readBigUInt64BE(0) % 900000000000000000n) + 100000000000000000n;
}
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
function joined(text) {
  const lines = String(text).split("\n");
  if (lines.length === 1 && lines[0].length < 3000) return q(lines[0]);
  return `wwv_flow_string.join(wwv_flow_t_varchar2(\n${lines.map(q).join(",\n")}))`;
}
const params = (list) => list.filter(([, v]) => v !== null && v !== undefined).map(([k, v], i) => `${i ? "," : " "}${k}=>${v}`).join("\n");

export function legacyHeader(title) {
  return [
    "prompt --application/set_environment",
    "set define off verify off feedback off",
    "whenever sqlerror exit sql.sqlcode rollback",
    "--------------------------------------------------------------------------------",
    `-- APEX Modern Components: ${title}`,
    `-- Stamped for APEX ${LEGACY_BASELINE.release}; imports into every later release.`,
    "-- Generated by skills/apex-modern-components/tools/build-templates.mjs. Do not edit by hand.",
    "--",
    "-- Import with App Builder > (your app) > Shared Components > Export/Import > Import,",
    "-- file type Application, Page or Component Export. The target app must use Universal Theme (42).",
    "--------------------------------------------------------------------------------",
    "begin",
    "wwv_flow_imp.import_begin (",
    ` p_version_yyyy_mm_dd=>${q(LEGACY_BASELINE.versionDate)}`,
    `,p_release=>${q(LEGACY_BASELINE.release)}`,
    ",p_default_workspace_id=>apex_application_install.get_workspace_id",
    ",p_default_application_id=>apex_application_install.get_application_id",
    ",p_default_id_offset=>apex_application_install.get_offset",
    ",p_default_owner=>apex_application_install.get_schema",
    ");",
    "end;",
    "/"
  ];
}
export const legacyFooter = () => [
  "prompt --application/end_environment",
  "begin",
  "wwv_flow_imp.import_end(p_auto_install_sup_obj => nvl(wwv_flow_application_install.get_auto_install_sup_obj, false));",
  "commit;",
  "end;",
  "/",
  "set verify on feedback on define on",
  "prompt  ...done",
  ""
];

export function legacyBody(t) {
  const { spec: s, parts, partsDef } = t;
  const out = [];
  for (const f of t.files) {
    const published = `${STATIC_FOLDER}/${f.name}`;
    const hex = f.content.toString("hex").toUpperCase();
    out.push(`prompt --application/shared_components/files/${published.replace(/[^a-z0-9]+/gi, "_")}`, "begin", "wwv_flow_imp.g_varchar2_table := wwv_flow_imp.empty_varchar2_table;");
    for (let i = 0, n = 1; i < hex.length; i += 400, n++) out.push(`wwv_flow_imp.g_varchar2_table(${n}) := '${hex.slice(i, i + 400)}';`);
    out.push("end;", "/", "begin", "wwv_flow_imp_shared.create_app_static_file(",
      params([
        ["p_id", `wwv_flow_imp.id(${makeId(published)})`],
        ["p_file_name", q(published)],
        ["p_mime_type", q(f.name.endsWith(".css") ? "text/css" : "application/javascript")],
        ["p_file_charset", "'utf-8'"],
        ["p_file_content", "wwv_flow_imp.varchar2_to_blob(wwv_flow_imp.g_varchar2_table)"]
      ]), ");", "end;", "/");
  }
  const tplId = makeId(s.staticId, "template");
  const partParams = partsDef.filter((p) => parts[p.file] !== undefined).map((p) => [p.legacy, joined(parts[p.file])]);
  const css = fileUrls(t, ".css").join("\n");
  const js = fileUrls(t, ".js").join("\n");
  const opts = (list) => ((list || []).length ? q(list.join(":")) : null);
  if (s.kind === "list") {
    out.push(`prompt --application/shared_components/user_interface/templates/list/${t.slug.replace(/-/g, "_")}`, "begin", "wwv_flow_imp_shared.create_list_template(",
      params([
        ["p_id", `wwv_flow_imp.id(${tplId})`],
        ...partParams,
        ["p_list_template_name", q(s.name)],
        ["p_internal_name", q(s.staticId)],
        ["p_javascript_file_urls", js ? q(js) : null],
        ["p_theme_id", THEME_ID],
        ["p_css_file_urls", q(css)],
        ...Object.entries(s.attributes || {}).map(([k, v]) => [`p_${k}_label`, q(v)]),
        ["p_preset_template_options", opts(s.presetOptions)],
        ["p_default_template_options", opts(s.defaultOptions)],
        ["p_list_template_comment", joined(s.helpText)]
      ]), ");", "end;", "/");
  } else {
    out.push(`prompt --application/shared_components/user_interface/templates/region/${t.slug.replace(/-/g, "_")}`, "begin", "wwv_flow_imp_shared.create_plug_template(",
      params([
        ["p_id", `wwv_flow_imp.id(${tplId})`],
        ["p_layout", "'TABLE'"],
        ...partParams,
        ["p_page_plug_template_name", q(s.name)],
        ["p_internal_name", q(s.staticId)],
        ["p_javascript_file_urls", js ? q(js) : null],
        ["p_css_file_urls", q(css)],
        ["p_theme_id", THEME_ID],
        ["p_preset_template_options", opts(s.presetOptions)],
        ["p_default_template_options", opts(s.defaultOptions)],
        ["p_default_label_alignment", "'RIGHT'"],
        ["p_default_field_alignment", "'LEFT'"],
        ["p_translate_this_template", "'N'"],
        ["p_template_comment", joined(s.helpText)]
      ]), ");", "end;", "/");
    const points = [
      { name: "Region Body", ph: "BODY", grid: true },
      { name: "Sub Regions", ph: "SUB_REGIONS", grid: true },
      ...REGION_BUTTON_POSITIONS.filter((p) => parts["region.html"].includes(`#${p}#`)).map((p) => ({ name: p[0] + p.slice(1).toLowerCase(), ph: p, grid: false }))
    ];
    for (const p of points) {
      out.push("begin", "wwv_flow_imp_shared.create_plug_tmpl_display_point(",
        params([
          ["p_id", `wwv_flow_imp.id(${makeId(s.staticId, "dp", p.ph)})`],
          ["p_plug_template_id", `wwv_flow_imp.id(${tplId})`],
          ["p_name", q(p.name)],
          ["p_placeholder", q(p.ph)],
          ["p_has_grid_support", p.grid ? "true" : "false"],
          ["p_glv_new_row", "true"],
          ...(p.grid ? [["p_max_fixed_grid_columns", 12]] : [])
        ]), ");", "end;", "/");
    }
  }
  for (const o of s.templateOptions || []) {
    out.push("begin", "wwv_flow_imp_shared.create_template_option(",
      params([
        ["p_id", `wwv_flow_imp.id(${makeId(s.staticId, "opt", o.staticId)})`],
        ["p_theme_id", THEME_ID],
        ["p_name", q(o.staticId)],
        ["p_display_name", q(o.name)],
        ["p_display_sequence", o.sequence],
        [s.kind === "list" ? "p_list_template_id" : "p_region_template_id", `wwv_flow_imp.id(${tplId})`],
        ["p_css_classes", q(o.cssClass)],
        ["p_template_types", q(s.kind === "list" ? "LIST" : "REGION")],
        ["p_help_text", joined(o.help)]
      ]), ");", "end;", "/");
  }
  return out;
}

// ---------------------------------------------------------------- preview renderer

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const fill = (text, values) => text.replace(/#([A-Z][A-Z0-9_$]*)#/g, (m, k) => (k in values ? values[k] : ""));

let seq = 0;
function entryValues(e, parentId) {
  const id = String(++seq);
  const v = {
    TEXT: esc(e.text), TEXT_ESC_SC: esc(e.text), LINK: esc(e.link || "#"), IMAGE: esc(e.image || ""), IMAGE_ATTR: "",
    IMAGE_ALT: esc(e.text), ICON_CSS_CLASSES: esc(e.icon || ""), LIST_ITEM_ID: id, PARENT_LIST_ITEM_ID: parentId || "",
    LIST_STATUS: e.current ? "is-current" : "", APP_FILES: "", THEME_FILES: "", APEX_FILES: ""
  };
  for (const a of ATTR_TOKENS) v[a] = esc(e[a.toLowerCase()] ?? "");
  return v;
}

export function renderList(t, sample, n = 0) {
  const p = t.parts;
  const wrap = { COMPONENT_CSS_CLASSES: esc((sample.options || []).join(" ")), LIST_ID: `amc-pv-${t.slug}-${n}`, PARENT_STATIC_ID: `amc-pv-${t.slug}-${n}` };
  const items = (sample.entries || []).map((e, i) => {
    const values = entryValues(e);
    const kids = e.children && e.children.length && p["sublist-before.html"];
    let part;
    if (kids) part = e.current ? p["current-with-sublist.html"] : p["noncurrent-with-sublist.html"];
    else if (i === 0 && p[e.current ? "first-current.html" : "first-noncurrent.html"]) part = p[e.current ? "first-current.html" : "first-noncurrent.html"];
    else part = e.current ? p["current.html"] : p["noncurrent.html"];
    let html = fill(part, values);
    if (kids) {
      html += fill(p["sublist-before.html"], { ...wrap, ...values });
      html += e.children.map((c) => fill(c.current ? p["sublist-current.html"] : p["sublist-noncurrent.html"], entryValues(c, values.LIST_ITEM_ID))).join("");
      html += fill(p["sublist-after.html"], { ...wrap, ...values });
    }
    return html;
  });
  return fill(p["before.html"], wrap) + items.join(p["between.html"] ? fill(p["between.html"], wrap) : "\n") + fill(p["after.html"], wrap);
}

export function renderRegion(t, sample, body, n = 0) {
  const values = {
    TITLE: esc(sample.regionTitle || sample.title),
    BODY: body,
    SUB_REGIONS: "",
    REGION_STATIC_ID: `amc-pv-${t.slug}-${n}`,
    REGION_CSS_CLASSES: esc((sample.options || []).join(" ")),
    REGION_ATTRIBUTES: "",
    ICON_CSS_CLASSES: esc(sample.icon || ""),
    APP_FILES: "", THEME_FILES: "", APEX_FILES: ""
  };
  for (const b of REGION_BUTTON_POSITIONS) {
    const label = sample.buttons?.[b];
    values[b] = label ? `<button type="button" class="t-Button${b === "CREATE" || b === "NEXT" ? " t-Button--hot" : ""}">${esc(label)}</button>` : "";
  }
  return fill(t.parts["region.html"], values);
}
