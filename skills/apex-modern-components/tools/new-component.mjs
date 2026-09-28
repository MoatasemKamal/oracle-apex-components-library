#!/usr/bin/env node
// Scaffold a new template component from templates/template-component.
//
//   node tools/new-component.mjs <slug> "<Display Name>"
//   node tools/new-component.mjs pricing-card "Pricing Card"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [slug, name] = process.argv.slice(2);
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug || "") || !name) {
  console.error('usage: node tools/new-component.mjs <kebab-slug> "<Display Name>"');
  process.exit(1);
}

const parts = slug.split("-");
const apexlangName = parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
const cssClass = "amc-" + parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
const values = {
  __NAME__: name,
  __APEXLANG_NAME__: apexlangName,
  __STATIC_ID__: "AMC_" + slug.toUpperCase().replace(/-/g, "_"),
  __FILE__: "amc-" + slug,
  __CLASS__: cssClass
};
const fill = (text) => Object.entries(values).reduce((t, [k, v]) => t.split(k).join(v), text);

const src = path.join(SKILL_ROOT, "templates", "template-component");
const dest = path.join(SKILL_ROOT, "components", slug);
if (fs.existsSync(dest)) {
  console.error(`components/${slug} already exists`);
  process.exit(1);
}

(function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const target = path.join(to, fill(entry.name));
    if (entry.isDirectory()) copy(path.join(from, entry.name), target);
    else fs.writeFileSync(target, fill(fs.readFileSync(path.join(from, entry.name), "utf8")));
  }
})(src, dest);

console.log(`created components/${slug} (apexlangName ${apexlangName}, class ${cssClass})`);
console.log("next: edit component.json + templates + CSS, then node tools/build.mjs && node tools/preview.mjs");
