#!/usr/bin/env node
// Scaffolds a creative theme template.
//   node tools/new-template.mjs <kebab-slug> <list|region> "<Display Name>"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [slug, kind, name] = process.argv.slice(2);
if (!/^[a-z][a-z0-9-]*$/.test(slug || "") || !["list", "region"].includes(kind) || !name) {
  console.error('usage: node tools/new-template.mjs <kebab-slug> <list|region> "<Display Name>"');
  process.exit(2);
}
const dir = path.join(SKILL_ROOT, "theme-templates", slug);
if (fs.existsSync(dir)) {
  console.error(`theme-templates/${slug} already exists`);
  process.exit(1);
}
const block = `amc-T${slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}`;
const write = (rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};

write("template.json", JSON.stringify({
  kind,
  name: `AMC ${name}`,
  staticId: `AMC_TPL_${slug.toUpperCase().replace(/-/g, "_")}`,
  version: "1.0.0",
  minApexVersion: "23.1",
  direction: "motion",
  description: "TODO one sentence: what it looks like and why it is not a traditional template.",
  useFor: kind === "list" ? "TODO which lists: navigation, launchpad, steps, menu" : "TODO which regions: Classic Report, Form, Chart, Static Content",
  keywords: [],
  helpText: "TODO how to use it, what each template option does, keyboard and reduced-motion behaviour.",
  ...(kind === "list" ? { attributes: { a01: "Description" } } : { landmarkType: "region" }),
  templateOptions: [],
  defaultOptions: [],
  presetOptions: []
}, null, 2) + "\n");

if (kind === "list") {
  write("parts/before.html", `<ul class="${block} #COMPONENT_CSS_CLASSES#" id="#LIST_ID#">\n`);
  write("parts/current.html", `<li class="${block}-item is-current"><a class="${block}-link" href="#LINK#" aria-current="page"><span class="${block}-icon fa #ICON_CSS_CLASSES#" aria-hidden="true"></span><span class="${block}-label">#TEXT#</span></a></li>\n`);
  write("parts/noncurrent.html", `<li class="${block}-item"><a class="${block}-link" href="#LINK#"><span class="${block}-icon fa #ICON_CSS_CLASSES#" aria-hidden="true"></span><span class="${block}-label">#TEXT#</span></a></li>\n`);
  write("parts/after.html", "</ul>\n");
  write("examples/preview.json", JSON.stringify({ samples: [{ title: "Default", options: [], entries: [
    { text: "Orders", link: "#", icon: "fa-shopping-cart", current: true, a01: "128 open" },
    { text: "Invoices", link: "#", icon: "fa-file-text-o", a01: "14 overdue" },
    { text: "Customers", link: "#", icon: "fa-users", a01: "2,340 active" }
  ] }] }, null, 2) + "\n");
  write("examples/list-region.apx.md", `# ${name} on a List region\n\n\`\`\`apexlang\nregion launchpad (\n    name: Launchpad\n    type: list\n    source {\n        list: @main-launchpad\n    }\n    componentAppearance {\n        listTemplate: @amc-${slug}\n        templateOptions: [\n            #DEFAULT#\n        ]\n    }\n)\n\`\`\`\n`);
} else {
  write("parts/region.html", `<section class="${block} #REGION_CSS_CLASSES#" id="#REGION_STATIC_ID#" #REGION_ATTRIBUTES# aria-labelledby="#REGION_STATIC_ID#_heading">\n  <header class="${block}-header">\n    <h2 class="${block}-title" id="#REGION_STATIC_ID#_heading">#TITLE#</h2>\n    <div class="${block}-actions">#EDIT##CREATE#</div>\n  </header>\n  <div class="${block}-body">#BODY##SUB_REGIONS#</div>\n</section>\n`);
  write("examples/preview.json", JSON.stringify({ samples: [
    { title: "Around a Classic Report", regionTitle: "Open orders", bodyKind: "report", options: [], buttons: { CREATE: "New order" } },
    { title: "Around a Form", regionTitle: "Customer", bodyKind: "form", options: [] }
  ] }, null, 2) + "\n");
  write("examples/region-report.apx.md", `# ${name} around a Classic Report\n\n\`\`\`apexlang\nregion open-orders (\n    name: Open orders\n    type: classicReport\n    appearance {\n        template: @amc-${slug}\n        templateOptions: [\n            #DEFAULT#\n        ]\n    }\n)\n\`\`\`\n`);
}
write(`files/amc-tpl-${slug}.css`, `/* ${name}: creative ${kind} template for Universal Theme. */\n.${block} {\n}\n`);
console.log(`created theme-templates/${slug}`);
