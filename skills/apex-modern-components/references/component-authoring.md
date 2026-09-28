# Authoring a Component

A component is a folder under `components/<slug>/`. You edit only the **sources**;
everything under `dist/` and the `README.md` are generated.

```text
components/<slug>/
  component.json          source of truth (definition, settings, files)
  templates/*.html        template component markup (partial, report body/row)
  src/render.plsql        item/region plug-ins: PL/SQL callbacks
  files/amc-<slug>.css    plug-in files (CSS/JS), served from #PLUGIN_FILES#
  examples/preview.json   sample data for tools/preview.mjs
  examples/*.apx.md       APEXlang usage examples for the apexlang skill
  README.md               generated
  dist/apexlang/...       generated: plugin.apx + files (APEX 26.1+)
  dist/legacy/*.sql       generated: plug-in export (APEX 23.1+)
```

Start with `node tools/new-component.mjs <slug> "<Name>"`.

## component.json

| Field | Rule |
|---|---|
| `name` | Display name in the Builder, for example `Stat Card` |
| `apexlangName` | lowerCamelCase; pages reference `plugin/<apexlangName>` |
| `staticId` | `AMC_<UPPER_SNAKE>`; plug-in internal name. **Never change after release.** |
| `pluginType` | `templateComponent` or `item` (`region` / `dynamicAction` tokens exist; add emitter support before use) |
| `version` | semver; bump on every change |
| `filesVersion` | optional integer; increment when CSS/JS change (cache busting) |
| `minApexVersion` | `23.1` unless a gated feature is needed (see `version-compatibility.md`) |
| `keywords` | synonyms used by agents to pick the component |
| `description`, `helpText` | shown in catalog/README and the Builder help |
| `source` | only for ported designs: `{ url, author, license }` (permissive licences only) |
| `templateComponent.availableAs` | `["partial"]`, `["report"]` or both |
| `templateComponent.defaultEscapeMode` | `html` |
| `templateComponent.translateTemplates` | `true` when templates contain user-visible literal text (screen-reader labels) |
| `templateComponent.templates` | paths to `partial` (always) and `reportBody` / `reportRow` (report mode) |
| `files`, `cssFileUrls`, `jsFileUrls` | each URL is `#PLUGIN_FILES#<file name>` and must match an entry in `files` |
| `attributes[]` | see below |

### Attributes

| Field | Rule |
|---|---|
| `staticId` | UPPER_SNAKE; the `#STATIC_ID#` placeholder in templates |
| `apexlangName` | lowerCamelCase; the key under `settings {}` in pages |
| `attribute` | 1..25, unique, **never renumber** (existing regions store values by number) |
| `name` | Builder label |
| `type` | `sessionStateValue` (column-mappable text), `text`, `textarea`, `selectList`, `yesNo`, `icon`, `integer`, `number` |
| `required` | boolean |
| `escapeMode` | template components: `html` or `htmlAttribute`; `raw` is forbidden |
| `default` | string; `"Y"`/`"N"` for yesNo |
| `sequence` | display order (10, 20, ...) |
| `helpText` | required; tell the developer exactly which values are valid |
| `entries[]` | selectList values `{ name, display, return, sequence }`: `name` is what APEXlang pages write, `return` is what the template receives |
| `dependsOn` | `{ attribute, condition: equals|notEquals|inList|notInList|isNull|isNotNull, value | list }` |
| `translatable` | item plug-ins: true for user-visible text settings |

Choose the setting type by where the value comes from:
- a value that varies **per row** means `sessionStateValue` (mapped to a column);
- a fixed **region-level** choice means `selectList` / `yesNo`, which also lets
  the template trust the value;
- a per-row value that becomes a CSS class must pass through `{case}` in the template.

## Template rules

- `partial` renders one entity. `reportBody` wraps rows and must contain
  `#APEX$ROWS#`; `reportRow` wraps one partial and must contain `#APEX$PARTIAL#`.
  Row-level attributes may be referenced in `reportRow` (for example state classes).
- Only reference declared attributes plus the baseline built-ins; the build fails on
  anything else.
- `{if ?X/}` = "X is not empty"; `{if X/}` = "X is not empty and not N/false"
  (use it for yesNo).
- Visible literal text in templates (for example screen-reader labels) needs
  `translateTemplates: true` so it can be translated with the application.

## Item plug-in rules

- PL/SQL uses the procedure interface
  `render(p_item, p_plugin, p_param, p_result)`; custom settings arrive as
  `p_item.attribute_01..25` by attribute number.
- Handle `p_param.is_readonly` / `is_printer_friendly` with
  `apex_plugin_util.print_hidden_if_readonly` and a display-only rendering.
- The element with `id = p_item.name` is the item root. Post values with
  `name = apex_plugin.get_input_name_for_item`.
- Escape everything: `apex_escape.html_attribute`, `apex_escape.html`,
  `apex_javascript.add_value`.
- Register `apex.item.create(itemName, {...})` in the JS file so DAs and `apex.item`
  work; emit native `change` events.
- List any APEXlang token you could not prove in `item.apexlangUnverifiedTokens`; the
  README then flags it for the compiler-truth gate.

## Build, preview, check

```bash
node tools/build.mjs            # validate + generate dist/, READMEs, catalog
node tools/preview.mjs          # preview/index.html (light / dark / RTL)
node tools/build.mjs --check    # CI: fails if generated files are stale
```
