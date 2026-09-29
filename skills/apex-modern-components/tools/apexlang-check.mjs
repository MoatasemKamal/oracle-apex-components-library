#!/usr/bin/env node
// Runs the Oracle apexlang skill's offline structure checks against every
// generated plugin.apx, inside a throwaway copy of apexlang's scaffold app.
//
//   node tools/apexlang-check.mjs --apexlang /path/to/oracle-skills/apex/apexlang
//
// Checks: `apexlang format --strict-structure` (no structural rewrite needed for
// plug-in files) and `apexlang grammar audit` per plug-in. Compiler-truth and live
// runtime validation still require an APEX/SQLcl runtime (see apexlang-integration.md).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listComponentDirs } from "./lib/load.mjs";
import { apexlangPath, listTemplateDirs, loadTemplate } from "./lib/theme-templates.mjs";
import * as styles from "./lib/theme-styles.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const apexlang = args.includes("--apexlang") ? path.resolve(args[args.indexOf("--apexlang") + 1]) : null;
if (!apexlang || !fs.existsSync(path.join(apexlang, "tools", "apexctl.mjs"))) {
  console.error("usage: node tools/apexlang-check.mjs --apexlang <path to the apexlang skill root>");
  process.exit(2);
}

const app = fs.mkdtempSync(path.join(os.tmpdir(), "amc-apexlang-"));
fs.cpSync(path.join(apexlang, "templates", "base-app-structure", "scaffold-example"), app, { recursive: true });
const pluginsRoot = path.join(app, "shared-components", "plugins");
fs.mkdirSync(pluginsRoot, { recursive: true });

const plugins = [];
for (const dir of listComponentDirs(path.join(SKILL_ROOT, "components"))) {
  const slug = path.basename(dir);
  const src = path.join(dir, "dist", "apexlang", "shared-components", "plugins", slug);
  if (!fs.existsSync(src)) {
    console.error(`missing build output for ${slug}: run node tools/build.mjs`);
    process.exit(1);
  }
  fs.cpSync(src, path.join(pluginsRoot, slug), { recursive: true });
  plugins.push(slug);
}

// Creative theme templates (theme-templates/<slug>/dist/apexlang) go into the scaffold's theme folder.
const themeTemplates = [];
for (const dir of listTemplateDirs(path.join(SKILL_ROOT, "theme-templates"))) {
  const t = loadTemplate(dir);
  const src = path.join(dir, "dist", "apexlang", apexlangPath(t));
  if (!fs.existsSync(src)) {
    console.error(`missing build output for theme template ${t.slug}: run node tools/build-templates.mjs`);
    process.exit(1);
  }
  const dest = path.join(app, apexlangPath(t));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  themeTemplates.push({ t, dest });
}

// Theme styles (theme-styles/<slug>/dist/apexlang) go into the scaffold's theme styles folder.
const themeStyles = [];
for (const dir of styles.listStyleDirs(path.join(SKILL_ROOT, "theme-styles"))) {
  const t = styles.loadStyle(dir);
  const src = path.join(dir, "dist", "apexlang", styles.apexlangPath(t));
  if (!fs.existsSync(src)) {
    console.error(`missing build output for theme style ${t.slug}: run node tools/build-styles.mjs`);
    process.exit(1);
  }
  const dest = path.join(app, styles.apexlangPath(t));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  themeStyles.push({ t, dest });
}

const run = (cmdArgs) => {
  try {
    return execFileSync(process.execPath, [path.join(apexlang, "tools", "apexctl.mjs"), ...cmdArgs], {
      cwd: apexlang,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    return error.stdout || "";
  }
};

let failed = 0;
const format = JSON.parse(run(["apexlang", "format", "--app-path", app, "--strict-structure"]) || "{}");
const ours = (p) => p.includes(`${path.sep}plugins${path.sep}`) || /(-templates|styles)[\\/]amc-[^\\/]+\.apx$/.test(p);
const structural = (format.findings || []).filter((f) => ours(f.path) && f.finding !== "compact structural line expanded");
const rewritten = (format.files || []).filter(ours);
for (const f of [...structural.map((s) => `${s.path}: ${s.finding}`), ...rewritten.map((f) => `${f}: formatter would rewrite`)]) {
  console.error(`format ${path.relative(app, f.split(":")[0])}${f.slice(f.indexOf(":"))}`);
  failed += 1;
}

for (const slug of plugins) {
  const out = run([
    "apexlang", "grammar", "audit",
    "--artifact-path", path.join(pluginsRoot, slug, "plugin.apx"),
    "--components", "plugin",
    "--children", "plugin.customAttribute,plugin.file"
  ]);
  const status = /"status":\s*"(\w+)"/.exec(out)?.[1] || "error";
  console.log(`${status === "passed" ? "ok   " : "FAIL "} ${slug} (grammar audit: ${status})`);
  if (status !== "passed") failed += 1;
}

for (const { t, dest } of themeTemplates) {
  const production = t.spec.kind === "list" ? "list-template" : "region-template";
  const out = run(["apexlang", "grammar", "audit", "--artifact-path", dest, "--components", production]);
  const status = /"status":\s*"(\w+)"/.exec(out)?.[1] || "error";
  console.log(`${status === "passed" ? "ok   " : "FAIL "} theme template ${t.slug} (formatter structure; grammar audit: ${status})`);
  if (status !== "passed") failed += 1;
}

for (const { t, dest } of themeStyles) {
  const out = run(["apexlang", "grammar", "audit", "--artifact-path", dest, "--components", "style"]);
  const status = /"status":\s*"(\w+)"/.exec(out)?.[1] || "error";
  console.log(`${status === "passed" ? "ok   " : "FAIL "} theme style ${t.slug} (formatter structure; grammar audit: ${status})`);
  if (status !== "passed") failed += 1;
}

fs.rmSync(app, { recursive: true, force: true });
if (failed) {
  console.error(`${failed} apexlang check(s) failed`);
  process.exit(1);
}
console.log(`ok    ${plugins.length} plug-in(s) ${themeTemplates.length} theme template(s) and ${themeStyles.length} theme style(s) pass apexlang offline structure checks`);
console.log("note  compiler-truth audit and runtime validate still need an APEX/SQLcl runtime");
