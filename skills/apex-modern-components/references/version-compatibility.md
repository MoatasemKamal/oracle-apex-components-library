# Version Compatibility (APEX 23.1 to 26.x and later)

## Delivery formats

Every component is built from one `component.json` into two outputs:

| Output | Works on | How it is installed |
|---|---|---|
| `dist/apexlang/shared-components/plugins/<slug>/plugin.apx` | APEX **26.1+** (APEXlang) | Copied into `applications/<app>/shared-components/plugins/`, then checked and imported with the apexlang skill |
| `dist/legacy/amc_<name>.sql` | APEX **23.1, 23.2, 24.1, 24.2, 26.x, ...** | App Builder > Shared Components > Plug-ins > Import, or SQLcl |

The legacy export is stamped `p_release => '23.1.0'`. APEX always imports exports from
older releases, so one file covers every release from 23.1 upwards. APEXlang does not
exist before 26.1, so on 23.x-25.x the SQL file is the only route. On 26.x either route
works, and once the plug-in is imported, an app export shows it in APEXlang form.

## Feature baseline (what a component may use)

The default `minApexVersion` is **23.1**. At that level, use only:

| Feature | Available |
|---|---|
| Template component `partial` and `report` (Available As single/multiple) | 23.1 |
| Custom attributes: text, textarea, session state value, select list, yes/no (checkbox), icon, number, integer | 23.1 |
| `#ATTR#`, `#ATTR!ATTR#`, `{if}`, `{if ?X/}`, `{else}`, `{case}/{when}/{otherwise}` | 23.1 |
| `#APEX$ROWS#` in report body, `#APEX$PARTIAL#` in report row | 23.1 |
| Item plug-ins with the `apex_plugin.t_item` procedure interface, `apex.item.create` | long before 23.1 |

Gated features. The validator rejects them unless `minApexVersion` is at least the
listed release. The listed releases are **conservative**: they are set to the release
where the feature is certainly present, not necessarily where it first appeared. Lower
the gate only after testing on that build.

| Feature | Gate used by the validator |
|---|---|
| `#APEX$ROW_IDENTIFICATION#` (row selection) | 24.2 |
| `#APEX$COMPONENT_CSS_CLASSES#` | 24.2 |
| `#APEX$DOM_ID#` | 24.2 |
| Template component **slots** | 24.2 |
| **Action positions / action templates** | 24.2 |

If a component really needs a gated feature, do one of the following:
1. Raise its `minApexVersion` (the build then documents it and gates it), or
2. Keep the 23.1 version and ship a second component (for example `stat-card-v2`)
   with the higher minimum.

Do not branch on the APEX version inside one plug-in; APEX substitutions have no
version test.

## Theme compatibility

- Universal Theme 42 across 23.1 to 26.x keeps the `--ut-*` variable names used here.
  Components follow Vita, Vita Dark, Vita Slate and Redwood Light, plus any Theme
  Roller style.
- Font APEX icon classes (`fa-*`) are stable across these releases.
- If an app uses a non-Universal-Theme theme, the literal fallbacks in each token
  layer still give a neutral look. Override the `--amc-*` tokens in the app's CSS to
  brand it.

## Browser features

APEX 23.1+ supports only current evergreen browsers, so the CSS may use:
`color-mix()`, container queries (`@container`, `cqi`), logical properties,
`:focus-visible`, and `unicode-bidi: plaintext/isolate`. Avoid `:has()` for anything
essential.

## Upgrading a component

Bump `version` in `component.json` (semver). If plug-in files change, increment
`filesVersion` too, so browsers fetch the new CSS/JS. Rebuild and re-import: an import
into an app that already has the plug-in replaces it, and existing regions keep their
settings as long as attribute numbers and static IDs are unchanged. **Never renumber
or rename an existing attribute.**
