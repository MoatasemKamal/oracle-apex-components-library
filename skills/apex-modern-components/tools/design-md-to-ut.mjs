#!/usr/bin/env node
// Converts a DESIGN.md (Google Stitch format, e.g. from
// https://github.com/VoltAgent/awesome-design-md, MIT) into a Universal Theme
// style: a CSS file that sets --ut-* variables. Native APEX components and every
// amc component read these variables, so the whole app takes on the design's
// colors and corner radius.
//
//   node tools/design-md-to-ut.mjs <path/to/DESIGN.md> [--name <slug>] [--out styles]
//
// Writes styles/<slug>.css (apply it to the app) and styles/<slug>.vars.json
// (used by tools/preview.mjs to add a preview panel).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--name" && args[args.indexOf(a) - 1] !== "--out");
const opt = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
if (!input || !fs.existsSync(input)) {
  console.error("usage: node tools/design-md-to-ut.mjs <DESIGN.md> [--name <slug>] [--out <dir>]");
  process.exit(2);
}

// ---- minimal YAML front-matter reader (nested maps of scalars) -------------
function parseFrontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) throw new Error("no YAML front matter: this DESIGN.md has no machine-readable tokens");
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  for (const raw of m[1].split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    const kv = /^("?[^":]+"?):\s*(.*)$/.exec(line);
    if (!kv) continue;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    const key = kv[1].replace(/^"|"$/g, "");
    const value = kv[2];
    if (value === "") {
      parent[key] = {};
      stack.push({ indent, obj: parent[key] });
    } else {
      parent[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return root;
}

let doc;
try {
  doc = parseFrontMatter(fs.readFileSync(input, "utf8"));
} catch (error) {
  console.error(`${path.basename(path.dirname(path.resolve(input)))}: ${error.message}`);
  process.exit(1);
}
const colors = doc.colors || {};
const rounded = doc.rounded || {};
const components = doc.components || {};

function resolve(value) {
  if (typeof value !== "string") return null;
  const ref = /^\{(colors|rounded|spacing)\.([^}]+)\}$/.exec(value.trim());
  if (!ref) return value.trim();
  return resolve((doc[ref[1]] || {})[ref[2]]);
}
const isColor = (v) => typeof v === "string" && /^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\()/.test(v.trim());
const pickColor = (...keys) => {
  for (const k of keys) {
    const v = resolve(colors[k]);
    if (isColor(v)) return v;
  }
  return null;
};
const fromComponent = (names, prop) => {
  for (const n of names) {
    const v = resolve(components[n]?.[prop]);
    if (v) return v;
  }
  return null;
};

function luminance(hex) {
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec((hex || "").trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrastOn = (bg) => (luminance(bg) !== null && luminance(bg) > 0.45 ? "#000000" : "#ffffff");

// ---- token mapping ----------------------------------------------------------
// Designs either have one palette, or light and dark variants distinguished by
// suffixes (canvas-light / canvas-dark, hairline-on-dark, canvas-night, ...).
const SUFFIX = {
  light: ["", "-light", "-on-light", "-day"],
  dark: ["-dark", "-on-dark", "-night", ""]
};
const hasDarkVariant = Object.keys(colors).some((k) => /-(dark|night)$|^(surface-)?canvas-(dark|night)|on-dark$/.test(k));
const hasLightVariant = Object.keys(colors).some((k) => /-(light|day)$|on-light$/.test(k));

function mapTokens(mode) {
  const pick = (...bases) => {
    for (const base of bases) {
      for (const suf of SUFFIX[mode]) {
        const v = resolve(colors[base + suf]);
        if (isColor(v)) return v;
      }
    }
    return null;
  };
  const lum = (c) => luminance(c) ?? 0.5;
  const bodyBg = pick("canvas", "surface-canvas", "background", "surface");
  if (!bodyBg) return null;
  const bgIsDark = lum(bodyBg) < 0.2;
  // The design's own component definitions win when they exist.
  const compCard = fromComponent(["card", "card-default", "feature-card", "surface-card"], "backgroundColor");
  const cardBg =
    (isColor(compCard) && (lum(compCard) < 0.2) === bgIsDark && compCard) ||
    pick("surface-card", "surface-1", "surface", "surface-elevated", "canvas-soft", "surface-soft", "canvas-night-soft", "canvas-night-elevated", "canvas", "surface-canvas");
  // Text must contrast with the background whatever the token is called.
  const readable = (...cands) => cands.find((c) => c && Math.abs(lum(c) - lum(bodyBg)) > 0.35) || null;
  const text = readable(
    pick("ink", "body-strong", "body", "on-canvas"),
    bgIsDark ? resolve(colors["on-dark"]) : resolve(colors["ink"]),
    bgIsDark ? "#f2f2f2" : "#161616"
  );
  const muted = readable(
    pick("muted", "mute", "ink-muted", "ink-mute", "ink-subtle", "body", "slate", "stone", "ash", "charcoal"),
    bgIsDark ? resolve(colors["on-dark-mute"]) || resolve(colors["on-dark-muted"]) : null
  ) || (bgIsDark ? "#a8a8a8" : "#6b6b6b");
  const border = pick("hairline", "hairline-soft", "border", "divider", "hairline-strong", "border-strong");
  const primary = pick("primary");
  const onPrimary = pick("on-primary") || (primary && contrastOn(primary));
  const success = pick("success", "semantic-success", "trading-up", "accent-green", "green");
  const warning = pick("warning", "semantic-warning", "accent-yellow", "accent-orange", "yellow");
  const danger = pick("error", "semantic-error", "danger", "semantic-danger", "trading-down", "accent-red", "red", "ruby");
  const info = pick("info", "semantic-info", "link", "accent-blue", "primary");
  const radius =
    resolve(fromComponent(["card", "card-default", "feature-card"], "rounded")) || resolve(rounded.md) || resolve(rounded.sm) || null;

  const vars = {
    "--ut-body-background-color": bodyBg,
    "--ut-body-text-color": text,
    "--ut-component-background-color": cardBg,
    "--ut-component-text-default-color": text,
    "--ut-component-text-muted-color": muted,
    "--ut-component-border-color": border,
    "--ut-component-border-radius": radius && /px|rem|em/.test(radius) && !/9999/.test(radius) ? radius : null,
    "--ut-link-text-color": pick("link", "primary"),
    "--ut-palette-primary": primary,
    "--ut-palette-primary-contrast": onPrimary,
    "--ut-palette-success": success,
    "--ut-palette-success-contrast": success && contrastOn(success),
    "--ut-palette-warning": warning,
    "--ut-palette-warning-contrast": warning && contrastOn(warning),
    "--ut-palette-danger": danger,
    "--ut-palette-danger-contrast": danger && contrastOn(danger),
    "--ut-palette-info": info,
    "--ut-palette-info-contrast": info && contrastOn(info)
  };
  for (const k of Object.keys(vars)) if (!vars[k]) delete vars[k];
  if (!vars["--ut-component-background-color"] || !vars["--ut-palette-primary"]) return null;
  return { dark: bgIsDark, vars };
}

const requested = opt("--mode");
const modes = requested ? [requested] : hasDarkVariant && hasLightVariant ? ["light", "dark"] : ["light"];
const results = modes.map((m) => ({ mode: m, out: mapTokens(m) })).filter((r) => r.out);
// A single-palette design maps once; drop a duplicate "dark" result identical to "light".
if (results.length === 2 && JSON.stringify(results[0].out.vars) === JSON.stringify(results[1].out.vars)) results.pop();
if (!results.length) {
  console.error("cannot map required tokens (canvas/background, card surface, primary)");
  process.exit(1);
}

// ---- output -----------------------------------------------------------------
const baseSlug = opt("--name") || path.basename(path.dirname(path.resolve(input))).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
const outDir = path.resolve(opt("--out") || path.join(SKILL_ROOT, "styles"));
const font = doc.typography && Object.values(doc.typography).find((t) => t && t.fontFamily)?.fontFamily;
fs.mkdirSync(outDir, { recursive: true });

for (const { mode, out } of results) {
  const slug = results.length > 1 && mode === "dark" ? `${baseSlug}-dark` : baseSlug;
  const { dark, vars } = out;
  const css = `/* Universal Theme style generated from DESIGN.md: ${doc.name || baseSlug}${results.length > 1 ? ` (${mode} variant)` : ""}
 * Source: ${path.basename(path.dirname(path.resolve(input)))}/DESIGN.md (awesome-design-md, MIT License, (c) VoltAgent)
 * Polarity: ${dark ? "dark" : "light"}. Generated by tools/design-md-to-ut.mjs; do not edit by hand.
 *
 * Apply to an app (any APEX 23.1+):
 *   Theme Roller > open the ${dark ? "Vita - Dark" : "Vita"} style > Custom CSS > paste this file > Save As a new style, or
 *   upload as a Static Application File and add #APP_FILES#${slug}.css to
 *   Shared Components > Themes > Styles > (your style) > File URLs.
 *
 * Covers body, regions/cards, text, borders, radius, links and the semantic palette.
 * Header and navigation colors are theme-style specific: finish them in Theme Roller.
 * Inspired design only: do not use third-party logos or brand names in your app.
 */
:root {
${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n")}
}
${font ? `\n/* Optional font from the design (proprietary fonts fall back to the system stack):\nbody { font-family: ${font}; }\n*/\n` : ""}`;
  fs.writeFileSync(path.join(outDir, `${slug}.css`), css);
  fs.writeFileSync(
    path.join(outDir, `${slug}.vars.json`),
    JSON.stringify({ name: doc.name || baseSlug, slug, dark, vars }, null, 2) + "\n"
  );
  console.log(`wrote ${path.relative(process.cwd(), path.join(outDir, `${slug}.css`))} (${dark ? "dark" : "light"}, ${Object.keys(vars).length} variables)`);
}
