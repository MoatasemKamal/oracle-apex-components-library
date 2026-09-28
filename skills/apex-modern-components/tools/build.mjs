#!/usr/bin/env node
// Builds every component under ../components from its component.json.
//
//   node tools/build.mjs            validate + write dist/ + catalog
//   node tools/build.mjs --check    validate + fail if dist/ or catalog is stale (CI)
//   node tools/build.mjs --only statCard
//
// Outputs per component:
//   dist/apexlang/shared-components/plugins/<slug>/plugin.apx   (APEX 26.1+, APEXlang)
//   dist/apexlang/shared-components/plugins/<slug>/files/*       (plug-in file content)
//   dist/legacy/<static_id>.sql                                  (APEX 23.1+ plug-in export)
//   README.md                                                    (settings reference)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emitApexlangPlugin } from "./lib/emit-apexlang.mjs";
import { emitLegacySql } from "./lib/emit-legacy-sql.mjs";
import { emitReadme } from "./lib/emit-readme.mjs";
import { listComponentDirs, loadComponent } from "./lib/load.mjs";
import { validateComponent } from "./lib/validate.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPONENTS = path.join(SKILL_ROOT, "components");
const CATALOG = path.join(SKILL_ROOT, "assets", "components.catalog.json");

const args = process.argv.slice(2);
const check = args.includes("--check");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const outputs = new Map();
const catalog = [];
let failed = false;

for (const dir of listComponentDirs(COMPONENTS)) {
  const unit = loadComponent(dir);
  const { component: c, loaded, slug } = unit;
  if (only && c.apexlangName !== only && slug !== only) continue;

  const { errors, warnings } = validateComponent(unit);
  warnings.forEach((w) => console.warn(`warn  ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.error(`error ${e}`));
    failed = true;
    continue;
  }

  const pluginDir = path.join(dir, "dist", "apexlang", "shared-components", "plugins", slug);
  outputs.set(path.join(pluginDir, "plugin.apx"), emitApexlangPlugin(c, loaded));
  for (const f of loaded.files) outputs.set(path.join(pluginDir, "files", f.fileName), f.content);
  outputs.set(path.join(dir, "dist", "legacy", `${c.staticId.toLowerCase()}.sql`), emitLegacySql(c, loaded));
  outputs.set(path.join(dir, "README.md"), emitReadme(unit));

  catalog.push({
    slug,
    name: c.name,
    apexlangName: c.apexlangName,
    staticId: c.staticId,
    pluginType: c.pluginType,
    version: c.version,
    minApexVersion: c.minApexVersion,
    availableAs: c.templateComponent?.availableAs || null,
    apexlangRegionType: c.pluginType === "templateComponent" || c.pluginType === "region" ? `plugin/${c.apexlangName}` : null,
    apexlangItemType: c.pluginType === "item" ? `plugin/${c.apexlangName}` : null,
    keywords: c.keywords || [],
    description: c.description,
    settings: c.attributes.map((a) => ({
      apexlangName: a.apexlangName,
      staticId: a.staticId,
      type: a.type,
      required: !!a.required,
      values: a.entries?.map((e) => e.name)
    })),
    paths: {
      readme: path.relative(SKILL_ROOT, path.join(dir, "README.md")),
      example: path.relative(SKILL_ROOT, path.join(dir, "examples")),
      apexlang: path.relative(SKILL_ROOT, pluginDir),
      legacySql: path.relative(SKILL_ROOT, path.join(dir, "dist", "legacy", `${c.staticId.toLowerCase()}.sql`))
    }
  });
}

if (failed) {
  console.error("build failed: fix the errors above");
  process.exit(1);
}

if (!only) {
  outputs.set(
    CATALOG,
    JSON.stringify(
      {
        schemaVersion: 1,
        library: "apex-modern-components",
        cssPrefix: "amc-",
        supportedApex: { min: "23.1", apexlang: "26.1" },
        components: catalog
      },
      null,
      2
    ) + "\n"
  );
}

let stale = 0;
for (const [file, content] of outputs) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  const current = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (current && current.equals(buf)) continue;
  if (check) {
    console.error(`stale ${path.relative(SKILL_ROOT, file)}`);
    stale += 1;
    continue;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log(`wrote ${path.relative(SKILL_ROOT, file)}`);
}

if (check && stale) {
  console.error(`${stale} generated file(s) are stale: run node tools/build.mjs`);
  process.exit(1);
}
console.log(`ok    ${catalog.length} component(s)`);
