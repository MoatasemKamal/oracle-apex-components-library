// Emits one grammar-shaped APEXlang `plugin` declaration (APEX 26.1+).
// Shape follows the `<plugin>` production in the apexlang skill's
// assets/grammar/apexlang.ebnf; children are emitted inline in the plugin block.

import { ATTRIBUTE_TYPES, AVAILABLE_AS, CONDITION_TYPES, ESCAPE_MODES, PLUGIN_TYPES, lookup } from "./tokens.mjs";

const IND = "    ";

function ind(level) {
  return IND.repeat(level);
}

function multiline(key, lang, text, level) {
  // The key stands alone and the fence opens on its own line: the apexlang
  // formatter only treats lines that start with ``` as fence delimiters, so
  // template directives such as {if X/} inside the body stay opaque.
  const pad = ind(level + 1);
  const body = text.replace(/\s+$/, "").split("\n").map((l) => (l ? pad + l : l));
  return [`${ind(level)}${key}:`, `${pad}\`\`\`${lang}`, ...body, `${pad}\`\`\``];
}

function array(key, values, level) {
  return [`${ind(level)}${key}: [`, ...values.map((v) => `${ind(level + 1)}${v}`), `${ind(level)}]`];
}

function group(name, lines, level) {
  const body = lines.filter((l) => l !== null && l !== undefined).flat();
  if (body.length === 0) return [];
  return [`${ind(level)}${name} {`, ...body, `${ind(level)}}`];
}

function scalar(key, value, level) {
  if (value === null || value === undefined || value === "") return null;
  return `${ind(level)}${key}: ${value}`;
}

function customAttribute(attr, level) {
  const type = lookup(ATTRIBUTE_TYPES, attr.type, "attribute type").apexlang;
  const lines = [
    `${ind(level)}customAttribute ${attr.staticId} (`,
    scalar("apexlangName", attr.apexlangName, level + 1),
    scalar("attribute", attr.attribute, level + 1),
    scalar("name", attr.name, level + 1),
    scalar("scope", "component", level + 1),
    scalar("type", type, level + 1)
  ];
  lines.push(
    ...group("appearance", [
      scalar("attributeGroup", attr.attributeGroup ? `@${attr.attributeGroup}` : null, level + 2),
      scalar("sequence", attr.sequence, level + 2)
    ], level + 1)
  );
  if (attr.type === "selectList") {
    lines.push(...group("componentLov", [scalar("type", "static", level + 2)], level + 1));
  }
  if (attr.type !== "yesNo") {
    lines.push(...group("validation", [scalar("required", attr.required ? "true" : "false", level + 2)], level + 1));
  }
  if (attr.escapeMode) {
    lines.push(
      ...group("security", [
        scalar("escapeMode", lookup(ESCAPE_MODES, attr.escapeMode, "escape mode").apexlang, level + 2)
      ], level + 1)
    );
  }
  if (attr.default !== undefined && attr.default !== null) {
    const value = attr.type === "yesNo" ? (attr.default === "Y" ? "true" : "false") : attr.default;
    lines.push(...group("default", [scalar("value", value, level + 2)], level + 1));
  }
  if (attr.dependsOn) {
    const cond = lookup(CONDITION_TYPES, attr.dependsOn.condition, "condition type").apexlang;
    lines.push(
      ...group("dependingOn", [
        scalar("attribute", `@${attr.dependsOn.attribute}`, level + 2),
        scalar("conditionType", cond, level + 2),
        attr.dependsOn.value !== undefined ? scalar("value", attr.dependsOn.value, level + 2) : null,
        attr.dependsOn.list ? array("list", attr.dependsOn.list, level + 2) : null,
        scalar("alwaysEvaluate", "false", level + 2)
      ], level + 1)
    );
  }
  if (attr.helpText) {
    lines.push(...group("help", [multiline("helpText", "", attr.helpText, level + 2)], level + 1));
  }
  for (const entry of attr.entries || []) {
    lines.push(
      `${ind(level + 1)}entry ${entry.name} (`,
      scalar("sequence", entry.sequence, level + 2),
      scalar("display", entry.display, level + 2),
      scalar("return", entry.return, level + 2),
      `${ind(level + 1)})`
    );
  }
  lines.push(`${ind(level)})`);
  return lines.filter((l) => l !== null);
}

function pluginFile(file, level) {
  return [
    `${ind(level)}file "${file.fileName}" (`,
    scalar("fileName", file.fileName, level + 1),
    scalar("mimeType", file.mimeType, level + 1),
    scalar("charSet", "utf-8", level + 1),
    `${ind(level)})`
  ];
}

export function emitApexlangPlugin(component, loaded) {
  const t = lookup(PLUGIN_TYPES, component.pluginType, "plugin type");
  const lines = [
    `plugin ${component.apexlangName} (`,
    scalar("name", component.name, 1),
    scalar("staticId", component.staticId, 1),
    scalar("type", t.apexlang, 1)
  ];

  if (component.pluginType === "templateComponent") {
    const tc = component.templateComponent;
    const tpl = loaded.templates;
    lines.push(
      ...group("templateComponent", [
        array("availableAs", tc.availableAs.map((v) => lookup(AVAILABLE_AS, v, "availableAs").apexlang), 2),
        tpl.partial ? multiline("partial", "html", tpl.partial, 2) : null,
        tpl.reportBody ? multiline("reportBody", "html", tpl.reportBody, 2) : null,
        tpl.reportRow ? multiline("reportRow", "html", tpl.reportRow, 2) : null,
        tpl.reportContainer ? multiline("reportContainer", "html", tpl.reportContainer, 2) : null,
        scalar("translateTemplates", tc.translateTemplates ? "true" : "false", 2),
        scalar("defaultEscapeMode", lookup(ESCAPE_MODES, tc.defaultEscapeMode, "escape mode").apexlang, 2)
      ], 1)
    );
  }

  if (component.pluginType === "item") {
    const it = component.item;
    lines.push(
      ...group("component", [
        array("supports", it.supports, 2),
        array("supportsSessionStateDataTypes", it.sessionStateDataTypes, 2),
        array("standardAttributes", it.standardAttributes, 2)
      ], 1),
      ...group("source", [multiline("plsqlCode", "plsql", loaded.plsql, 2)], 1),
      ...group("callbacks", [
        scalar("apiInterface", it.apiInterface, 2),
        scalar("renderProcedureName", it.renderProcedureName, 2),
        it.ajaxProcedureName ? scalar("ajaxProcedureName", it.ajaxProcedureName, 2) : null
      ], 1)
    );
  }

  lines.push(
    ...group("advanced", [
      scalar("filePrefix", "#PLUGIN_FILES#", 2),
      component.pluginType === "templateComponent" ? scalar("quickPick", "false", 2) : null,
      scalar("substituteAttributeValues", "true", 2),
      scalar("deprecated", "false", 2),
      scalar("legacy", "false", 2)
    ], 1)
  );
  if (component.cssFileUrls?.length) lines.push(...group("css", [array("fileUrls", component.cssFileUrls, 2)], 1));
  if (component.jsFileUrls?.length) lines.push(...group("javaScript", [array("fileUrls", component.jsFileUrls, 2)], 1));
  lines.push(
    ...group("information", [
      scalar("version", component.version, 2),
      component.aboutUrl ? scalar("aboutUrl", component.aboutUrl, 2) : null,
      component.helpText ? multiline("helpText", "", component.helpText, 2) : null
    ], 1)
  );

  for (const g of component.attributeGroups || []) {
    lines.push(
      `${ind(1)}attributeGroup ${g.apexlangName} (`,
      scalar("name", g.name, 2),
      scalar("sequence", g.sequence, 2),
      ...group("advanced", [scalar("staticId", g.staticId, 3)], 2),
      `${ind(1)})`
    );
  }
  for (const attr of [...component.attributes].sort((a, b) => a.sequence - b.sequence)) {
    lines.push(...customAttribute(attr, 1));
  }
  for (const file of loaded.files) {
    lines.push(...pluginFile(file, 1));
  }
  lines.push(")");
  return lines.filter((l) => l !== null).join("\n") + "\n";
}
