// Library rules that keep components native-looking, theme-aware and
// importable on every supported APEX release. Returns { errors, warnings }.

import { ATTRIBUTE_TYPES, AVAILABLE_AS, ESCAPE_MODES, PLUGIN_TYPES } from "./tokens.mjs";

// Template substitutions that exist in the 23.1 baseline.
const BASELINE_BUILTINS = new Set(["APEX$ROWS", "APEX$PARTIAL"]);

// Tokens and directives that are NOT in the 23.1 baseline. A component may use
// them only when its minApexVersion is at least the listed release.
// The listed releases are conservative; confirm against the target build.
export const GATED_FEATURES = [
  { pattern: /#APEX\$ROW_IDENTIFICATION#/, name: "#APEX$ROW_IDENTIFICATION#", minVersion: "24.2" },
  { pattern: /#APEX\$COMPONENT_CSS_CLASSES#/, name: "#APEX$COMPONENT_CSS_CLASSES#", minVersion: "24.2" },
  { pattern: /#APEX\$DOM_ID#/, name: "#APEX$DOM_ID#", minVersion: "24.2" },
  { pattern: /#APEX\$SLOT_[A-Z_]+#|#[A-Z_]+_SLOT#/, name: "template component slots", minVersion: "24.2" },
  { pattern: /#APEX\$ACTIONS?[A-Z_]*#|\{with\/\}[\s\S]*APEX\$ACTION/, name: "action positions", minVersion: "24.2" }
];

const SEMVER = /^\d+\.\d+\.\d+$/;
const APEX_VERSION = /^\d{2}\.\d$/;

export function versionAtLeast(actual, required) {
  const [a1, a2] = actual.split(".").map(Number);
  const [r1, r2] = required.split(".").map(Number);
  return a1 > r1 || (a1 === r1 && a2 >= r2);
}

function templateRefs(text) {
  const subs = [...text.matchAll(/#([A-Z][A-Z0-9_$]*)(?:![A-Z]+)?#/g)].map((m) => m[1]);
  const directives = [...text.matchAll(/\{(?:if|case|elseif)\s+!?\??([A-Z][A-Z0-9_$]*)\s*\/\}/g)].map((m) => m[1]);
  return { subs, directives };
}

function checkCss(slug, css, errors, warnings) {
  const lines = css.split("\n");
  lines.forEach((line, i) => {
    const code = line.replace(/\/\*.*?\*\//g, "");
    if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(code) && !/var\(/.test(code)) {
      errors.push(`${slug}: CSS line ${i + 1} hardcodes a color outside a var() fallback: ${line.trim()}`);
    }
    if (/(^|[\s,>+~])\.(?!amc-)[a-zA-Z]/.test(code.split("{")[0]) && /\{/.test(code)) {
      const sel = code.split("{")[0].trim();
      if (!/^@|^:root|^from|^to|^\d/.test(sel)) {
        errors.push(`${slug}: CSS selector must use only amc- classes: ${sel}`);
      }
    }
    if (/!important/.test(code)) warnings.push(`${slug}: avoid !important (line ${i + 1})`);
    if (/\b(margin|padding)-(left|right)\b|\b(left|right)\s*:/.test(code)) {
      warnings.push(`${slug}: prefer logical properties for RTL (line ${i + 1}): ${line.trim()}`);
    }
  });
  if (!/prefers-reduced-motion/.test(css) && /(transition|animation)\s*:/.test(css)) {
    errors.push(`${slug}: CSS animates but has no prefers-reduced-motion override`);
  }
}

export function validateComponent({ slug, component: c, loaded }) {
  const errors = [];
  const warnings = [];
  const need = (cond, msg) => cond || errors.push(`${slug}: ${msg}`);

  need(typeof c.name === "string" && c.name.length > 0, "name is required");
  need(/^[a-z][a-zA-Z0-9]*$/.test(c.apexlangName || ""), "apexlangName must be lowerCamelCase");
  need(/^AMC_[A-Z0-9_]+$/.test(c.staticId || ""), "staticId must match AMC_[A-Z0-9_]+");
  need(PLUGIN_TYPES[c.pluginType], `unsupported pluginType ${c.pluginType}`);
  need(SEMVER.test(c.version || ""), "version must be semver x.y.z");
  need(APEX_VERSION.test(c.minApexVersion || ""), "minApexVersion must look like 23.1");
  if (APEX_VERSION.test(c.minApexVersion || "")) {
    need(versionAtLeast(c.minApexVersion, "23.1"), "minApexVersion below 23.1 is not supported by this library");
  }

  if (c.source) {
    need(c.source.url && c.source.license, "source needs url and license (see references/porting-external-components.md)");
    if (c.source.license && !/^(MIT|Apache-2\.0|ISC|BSD-2-Clause|BSD-3-Clause|0BSD|CC0-1\.0|Original)$/.test(c.source.license)) {
      errors.push(`${slug}: source license '${c.source.license}' is not on the permissive allow-list; recreate the design instead of copying`);
    }
  }

  const attrs = c.attributes || [];
  const ids = new Set();
  const numbers = new Set();
  for (const a of attrs) {
    need(/^[A-Z][A-Z0-9_]*$/.test(a.staticId), `attribute staticId ${a.staticId} must be UPPER_SNAKE`);
    need(!ids.has(a.staticId), `duplicate attribute ${a.staticId}`);
    need(!numbers.has(a.attribute), `duplicate attribute number ${a.attribute}`);
    need(Number.isInteger(a.attribute) && a.attribute >= 1 && a.attribute <= 25, `${a.staticId}: attribute must be 1..25`);
    need(/^[a-z][a-zA-Z0-9]*$/.test(a.apexlangName || ""), `${a.staticId}: apexlangName must be lowerCamelCase`);
    need(ATTRIBUTE_TYPES[a.type], `${a.staticId}: unsupported type ${a.type}`);
    need(Number.isInteger(a.sequence), `${a.staticId}: sequence must be an integer`);
    if (c.pluginType === "templateComponent") need(ESCAPE_MODES[a.escapeMode], `${a.staticId}: escapeMode is required`);
    if (a.escapeMode === "raw") errors.push(`${slug}: ${a.staticId} uses raw escaping; not allowed in this library`);
    if (a.type === "selectList") need((a.entries || []).length > 0, `${a.staticId}: selectList needs entries`);
    need(a.helpText, `${a.staticId}: helpText is required (it is what the Page Designer shows)`);
    ids.add(a.staticId);
    numbers.add(a.attribute);
  }
  for (const a of attrs) {
    if (a.dependsOn) need(ids.has(a.dependsOn.attribute), `${a.staticId}: dependsOn unknown ${a.dependsOn.attribute}`);
  }

  if (c.pluginType === "templateComponent") {
    const tc = c.templateComponent || {};
    need(Array.isArray(tc.availableAs) && tc.availableAs.length > 0, "templateComponent.availableAs is required");
    for (const v of tc.availableAs || []) need(AVAILABLE_AS[v], `availableAs value ${v} unsupported`);
    need(loaded.templates.partial, "partial template is required");
    if ((tc.availableAs || []).includes("report")) {
      need(loaded.templates.reportBody?.includes("#APEX$ROWS#"), "reportBody must contain #APEX$ROWS#");
      need(loaded.templates.reportRow?.includes("#APEX$PARTIAL#"), "reportRow must contain #APEX$PARTIAL#");
    }
    for (const [key, text] of Object.entries(loaded.templates)) {
      if (!text) continue;
      if (/\{\{|\}\}/.test(text)) errors.push(`${slug}: ${key} contains unresolved {{...}} placeholders`);
      if (/style\s*=\s*"[^"]*#[A-Z]/.test(text)) {
        errors.push(`${slug}: ${key} substitutes a value into a style attribute (CSS injection risk)`);
      }
      if (/<script/i.test(text)) errors.push(`${slug}: ${key} contains <script>; ship JS as a plug-in file`);
      const { subs, directives } = templateRefs(text);
      for (const ref of [...subs, ...directives]) {
        if (ids.has(ref) || BASELINE_BUILTINS.has(ref)) continue;
        const gated = GATED_FEATURES.find((g) => g.pattern.test(`#${ref}#`));
        if (gated) continue;
        errors.push(`${slug}: ${key} references #${ref}# which is not a declared attribute`);
      }
      for (const g of GATED_FEATURES) {
        if (g.pattern.test(text) && !versionAtLeast(c.minApexVersion, g.minVersion)) {
          errors.push(`${slug}: ${key} uses ${g.name} (APEX ${g.minVersion}+) but minApexVersion is ${c.minApexVersion}`);
        }
      }
    }
  }

  if (c.pluginType === "item") {
    need(loaded.plsql, "item plug-ins need item.plsqlFile");
    need(c.item?.renderProcedureName, "item.renderProcedureName is required");
    need(c.item?.legacyStandardAttributes, "item.legacyStandardAttributes is required");
  }

  const fileNames = new Set(loaded.files.map((f) => f.fileName));
  for (const url of [...(c.cssFileUrls || []), ...(c.jsFileUrls || [])]) {
    const m = /^#PLUGIN_FILES#(.+)$/.exec(url);
    need(m, `file URL ${url} must start with #PLUGIN_FILES#`);
    if (m) need(fileNames.has(m[1]), `file URL ${url} has no matching entry in files[]`);
  }
  for (const f of loaded.files) {
    const text = f.content.toString("utf8");
    if (f.fileName.endsWith(".css")) checkCss(slug, text, errors, warnings);
    if (f.fileName.endsWith(".js")) {
      if (/\beval\s*\(|document\.write|new Function\(/.test(text)) errors.push(`${slug}: ${f.fileName} uses eval/document.write`);
      if (/\.innerHTML\s*=/.test(text)) warnings.push(`${slug}: ${f.fileName} assigns innerHTML; escape with apex.util.escapeHTML`);
    }
  }
  return { errors, warnings };
}
