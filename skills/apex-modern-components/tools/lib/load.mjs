import fs from "node:fs";
import path from "node:path";

const MIME = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

export function listComponentDirs(componentsRoot) {
  return fs
    .readdirSync(componentsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(componentsRoot, d.name, "component.json")))
    .map((d) => path.join(componentsRoot, d.name))
    .sort();
}

export function loadComponent(dir) {
  const component = JSON.parse(fs.readFileSync(path.join(dir, "component.json"), "utf8"));
  const read = (rel) => (rel ? fs.readFileSync(path.join(dir, rel), "utf8") : null);
  const templates = {};
  for (const [key, rel] of Object.entries(component.templateComponent?.templates || {})) {
    templates[key] = read(rel);
  }
  const files = (component.files || []).map((rel) => ({
    rel,
    fileName: path.basename(rel),
    mimeType: MIME[path.extname(rel)] || "application/octet-stream",
    content: fs.readFileSync(path.join(dir, rel))
  }));
  const plsql = component.item?.plsqlFile ? read(component.item.plsqlFile) : null;
  return { dir, slug: path.basename(dir), component, loaded: { templates, files, plsql } };
}
