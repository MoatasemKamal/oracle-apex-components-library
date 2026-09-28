// Single place that maps library-neutral values to APEXlang tokens (26.1+)
// and to legacy export values (wwv_flow_imp_shared, 23.1+).
// If the compiler-truth gate reports a wrong token, fix it here and rebuild.

export const PLUGIN_TYPES = {
  templateComponent: { apexlang: "templateComponent", legacy: "TEMPLATE COMPONENT", legacyFolder: "template_component" },
  item: { apexlang: "item", legacy: "ITEM TYPE", legacyFolder: "item_type" },
  region: { apexlang: "region", legacy: "REGION TYPE", legacyFolder: "region_type" },
  dynamicAction: { apexlang: "dynamicAction", legacy: "DYNAMIC ACTION", legacyFolder: "dynamic_action" }
};

export const ATTRIBUTE_TYPES = {
  text: { apexlang: "text", legacy: "TEXT" },
  textarea: { apexlang: "textarea", legacy: "TEXTAREA" },
  sessionStateValue: { apexlang: "sessionStateValue", legacy: "SESSION STATE VALUE" },
  selectList: { apexlang: "selectList", legacy: "SELECT LIST" },
  yesNo: { apexlang: "yesNo", legacy: "CHECKBOX" },
  icon: { apexlang: "icon", legacy: "ICON" },
  integer: { apexlang: "integer", legacy: "INTEGER" },
  number: { apexlang: "number", legacy: "NUMBER" }
};

export const ESCAPE_MODES = {
  html: { apexlang: "html", legacy: "HTML" },
  htmlAttribute: { apexlang: "htmlAttribute", legacy: "ATTR" },
  stripHtml: { apexlang: "stripHtml", legacy: "STRIPHTML" },
  raw: { apexlang: "raw", legacy: "RAW" }
};

export const AVAILABLE_AS = {
  partial: { apexlang: "partial", legacy: "PARTIAL" },
  report: { apexlang: "report", legacy: "REPORT" }
};

export const CONDITION_TYPES = {
  equals: { apexlang: "=", legacy: "EQUALS" },
  notEquals: { apexlang: "!=", legacy: "NOT_EQUALS" },
  inList: { apexlang: "inList", legacy: "IN_LIST" },
  notInList: { apexlang: "notInList", legacy: "NOT_IN_LIST" },
  isNull: { apexlang: "isNull", legacy: "NULL" },
  isNotNull: { apexlang: "isNotNull", legacy: "NOT_NULL" }
};

// Legacy exports are stamped with the lowest supported release so one file
// imports into every later APEX release (23.1, 23.2, 24.1, 24.2, 26.x, ...).
export const LEGACY_BASELINE = {
  release: "23.1.0",
  versionDate: "2023.04.28"
};

export function lookup(table, key, what) {
  const hit = table[key];
  if (!hit) {
    throw new Error(`Unknown ${what} '${key}'. Allowed: ${Object.keys(table).join(", ")}`);
  }
  return hit;
}
