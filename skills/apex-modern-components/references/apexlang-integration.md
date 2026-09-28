# Working With the `apexlang` Skill

This skill **defines** components (plug-ins). The Oracle `apexlang` skill
(<https://github.com/oracle/skills/tree/main/apex/apexlang>) **places** them in apps
and checks and imports the result. Follow the `apexlang` skill's rules for everything
it owns: app resolution, generation plans, grammar contracts, compiler truth, live
validation and the check-then-import choice.

## 1. Install the plug-in definition into the app

```text
applications/<app>/shared-components/plugins/<slug>/plugin.apx
applications/<app>/shared-components/plugins/<slug>/files/*.css|*.js
```

Copy from `components/<slug>/dist/apexlang/shared-components/plugins/<slug>/`. Copy
only the plug-ins the app uses, and only after `apexlang` has resolved the target app
(`node tools/apexctl.mjs workspace probe`).

The generated `plugin.apx` follows the `<plugin>` production of the apexlang grammar
(`assets/grammar/apexlang.ebnf`): identification properties, `templateComponent {}`
or `component {} / source {} / callbacks {}`, `advanced {}`, `css {}`/`javaScript {}`,
`information {}`, inline `customAttribute` children with `entry` values, and `file`
children. Multiline values use the fenced form, with the fence on its own line, so the
apexlang formatter keeps template directives such as `{if X/}` opaque.

## 2. Gates, run from the apexlang package root

Shortcut for the offline part (format + grammar audit of every library plug-in):
`node tools/apexlang-check.mjs --apexlang <apexlang skill root>` (run from this skill).

```bash
node tools/apexctl.mjs apexlang format --app-path <app> --strict-structure
node tools/apexctl.mjs apexlang grammar audit \
  --artifact-path <app>/shared-components/plugins/<slug>/plugin.apx \
  --components plugin --children plugin.customAttribute,plugin.file
node tools/apexctl.mjs apexlang compiler-truth audit --app-path <app>
node tools/apexctl.mjs runtime validate --app-path <abs app> --db-connection-name <conn> --apex-root <root>
```

Compiler truth is authoritative. Token choices that are not proven by Oracle's own
exports are centralized in `tools/lib/tokens.mjs` (APEXlang column) and in each
item plug-in's `item.*` fields. If the compiler rejects a token:

1. Look up the legal value: `node tools/query-valid-props.mjs --component plugin`
   (add `--when type=ITEM`, or `--component customAttribute --parent plugin`).
2. Fix it in `tools/lib/tokens.mjs` (or `component.json`), run `node tools/build.mjs`,
   copy again, re-run the gates.
3. Commit the fix to this library so every later build is right.

Also confirm the reference form a page uses for the plug-in. This library assumes
`type: plugin/<apexlangName>`, matching how apexlang templates reference app-level
plug-ins; native theme components use `themeTemplateComponent/<name>` instead.

## 3. Use the component in pages

Treat an `amc` template component like a native template component family
(`themeTemplateComponent/*`) in the apexlang skill, with these differences:

| Topic | Rule |
|---|---|
| Region type | `type: plugin/<apexlangName>` (for example `plugin/statCard`) |
| Mode | `componentAppearance { display: partial | report }`, only a mode listed in the catalog's `availableAs` |
| Settings | `settings { <attribute apexlangName>: <value> }` |
| Column-mapped settings | Bare projected column alias, uppercase: `value: VALUE_FMT` |
| Select-list settings | Entry **name** (left side), for example `columns: three`, never the return value |
| Yes/No settings | `true` / `false` |
| Report columns | One `column <ALIAS> (...)` child per projected column (`source.type: databaseColumn`, `databaseColumn`, `dataType`, `primaryKey`), same as native report template components |
| Partial in a report column | `column X ( type: plugin/<name> ... settings {...} )` on an Interactive or Classic Report, like `comments.partial-column` in apexlang |
| Item plug-ins | `pageItem P1_X ( type: plugin/<name> ... settings {...} )` |

Look up setting names, types and allowed values in `assets/components.catalog.json`
(`components[].settings`), which is generated from the definitions. Each component's
`examples/*.apx.md` holds a full, adaptable example. Like apexlang templates, these are
exact-shape examples: substitute only names, labels, aliases and SQL, and prove every
table and column from authoritative schema context first.

Include the component in the apexlang **Generation Plan** as:
`component: amc/<slug> (plugin/<apexlangName>), mode: report, settings: {...}, source columns: [...]`.

## 4. Apps on APEX 23.1 to 25.x

APEXlang is unavailable before 26.1. Import `dist/legacy/*.sql` (Builder or SQLcl) and
build pages in App Builder. When such an app is later upgraded to 26.x, its exported
APEXlang already contains the plug-ins, so no reinstall is needed.
