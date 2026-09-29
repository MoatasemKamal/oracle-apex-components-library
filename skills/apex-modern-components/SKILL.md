---
name: apex-modern-components
description: Library and workflow for modern Oracle APEX custom components (template component and item plug-ins) that look native in Universal Theme (Vita, Vita Dark, Redwood, Theme Roller), work on APEX 23.1 through 26.x and later, and are emitted as APEXlang for the Oracle apexlang skill plus a 23.1-baseline SQL export. Use when a user wants KPI/stat cards, progress bars, steppers, key-value detail lists, empty states, rating items, or any new custom/"modern"/"beautiful" APEX component, wants to port a design from 21st.dev, shadcn, Tailwind or CodePen into APEX, or asks to install, use, or extend these plug-ins in an APEX app.
---

# Skill: APEX Modern Components (`amc`)

Companion to the Oracle **apexlang** skill. This skill owns **plug-in definitions**
(what a component is, how it looks, which settings it has). apexlang owns **apps and
pages** (placing a component, grammar/compiler gates, live validation, import).
Never bypass apexlang's gates for app artifacts.

## Start order

1. Read `assets/components.catalog.json`: the generated list of components with
   `apexlangName`, modes (`availableAs`), settings (names, types, allowed values),
   `minApexVersion` and file paths. Match the user's request against `keywords`
   and `description`.
2. Decide the path:
   - **Use an existing component in an app**: section A.
   - **Create a new component, or port one from 21st.dev and similar galleries**: section B.
   - **Install on APEX 23.1-25.x**: section C.
   - **Make the app look like a design system (DESIGN.md, "make it look like X")**: section D.
   - **Add motion to native buttons, forms, reports, icons, breadcrumbs, nav bar, menu bar or menus**: section E (Motion Kit, not a component).
3. Load only the reference you need:
   - `references/apexlang-integration.md`: installing plug-ins into an APEXlang app, page usage rules, gates
   - `references/native-look-contract.md`: theme variables, UT classes, RTL, a11y, security
   - `references/version-compatibility.md`: 23.1 baseline, gated features, upgrades
   - `references/component-authoring.md`: `component.json` fields, template and item rules
   - `references/porting-external-components.md`: 21st.dev / React / Tailwind / 3D to APEX
   - `references/design-systems.md`: turn a DESIGN.md (awesome-design-md) into a Universal Theme style
   - `references/magicui.md`: Magic UI (MIT): what is ported, what is worth porting, how to fetch source
   - `references/design-quality.md`: research-first quality gate and craft checklist (adapted from Refero, MIT)
   - `references/design-collection.md`: the `design*` families (100+ styles chosen with a Style setting) and their shared conventions

All `node tools/...` commands run from this skill's root (the folder holding this file).

## A. Use a component in an APEXlang app (APEX 26.1+)

1. Let apexlang resolve the target app (`workspace probe`) and its APEX version.
   If the app is on 23.1-25.x, go to C.
2. Copy `components/<slug>/dist/apexlang/shared-components/plugins/<slug>/` into
   `applications/<app>/shared-components/plugins/` (only the plug-ins used).
3. Write the region / column / page item from the component's
   `examples/*.apx.md`. Settings use the attribute `apexlangName`; column-mapped
   settings take uppercase projected aliases; select-list settings take the entry
   **name**; yes/no takes `true`/`false`. Emit one `column` child per projected column
   for report mode. Prove every table and column from authoritative schema context;
   never keep example table names.
4. Put the component in apexlang's Generation Plan, then run apexlang's gates:
   format `--strict-structure`, grammar contract/audit, compiler-truth audit, and
   runtime validate. Import only after the user chooses it in apexlang's post-check
   choice.
5. If compiler truth rejects a plug-in token, fix it in `tools/lib/tokens.mjs` (or
   the component's `component.json`), rebuild, re-copy, re-run the gates. For item
   plug-ins, first confirm `item.apexlangUnverifiedTokens` with
   `query-valid-props --component plugin`.

## B. Create or port a component

1. Check the catalog; extend an existing component rather than duplicating it. For a new
   look of an existing kind (card, badge, alert, timeline, list, KPI, profile, pricing,
   button, header, avatar, divider), add a **style** to its `design*` family
   (`references/design-collection.md`) instead of a new component. Research
   the pattern first (`references/design-quality.md` section 1; use the Refero MCP if
   it is connected).
2. For external designs (21st.dev, Magic UI, etc.), first run the **licence check** and
   classification in `references/porting-external-components.md`. Stop if the
   licence is not permissive; recreate the design instead.
3. `node tools/new-component.mjs <kebab-slug> "<Display Name>"`
4. Edit `component.json`, `templates/*.html`, `files/amc-<slug>.css` (and
   `src/render.plsql` + JS for items) following `native-look-contract.md` and
   `component-authoring.md`. Default `minApexVersion` is `23.1`; use a gated
   feature only by raising it.
5. Add `examples/preview.json` and `examples/<usage>.apx.md`.
6. `node tools/build.mjs` must print `ok` with no errors. Fix the sources, never
   `dist/`. If the apexlang skill is available locally, also run
   `node tools/apexlang-check.mjs --apexlang <apexlang skill root>`.
7. `node tools/preview.mjs`, then inspect `preview/index.html` in light, dark and RTL
   (screenshot it if a browser is available) and fix visual defects. Walk the
   checklist in `references/design-quality.md` sections 2 and 3.
8. Continue with section A to test in an app. Report what was verified offline and
   what still needs a live APEX check.

## C. APEX 23.1 to 25.x (no APEXlang)

Give the user `components/<slug>/dist/legacy/amc_<name>.sql`. Install with App
Builder > Shared Components > Plug-ins > Import (any version 23.1+), or with SQLcl
after `apex_application_install.set_workspace/set_application_id/generate_offset/set_schema`.
Then describe the page setup in Builder terms using the component README's
"Builder label" column.

## D. Apply a design system (DESIGN.md)

1. Get the DESIGN.md, for example from `https://github.com/VoltAgent/awesome-design-md`
   (MIT): `design-md/<design>/DESIGN.md`.
2. `node tools/design-md-to-ut.mjs <DESIGN.md>` writes `styles/<design>.css` (and
   `-dark.css` when the design has both palettes).
3. `node tools/preview.mjs`: the style appears as its own panel. Check contrast.
4. Give the user the CSS and the Theme Roller steps from `references/design-systems.md`.
   Components need no changes, because they already read the `--ut-*` variables.
   Never put the source brand's name or logo in the app.

## E. Motion Kit for native elements

Native Universal Theme elements (buttons, form fields, reports, breadcrumbs, navigation bar,
menu bar, menus, icons, alerts) are not components, so they get motion from the app-wide
**Motion Kit** in `motion-kit/`: `amc-motion-kit.css` + `amc-motion-kit.js`, loaded once as
Static Application Files and referenced from the application's CSS and JavaScript File URLs.
Follow `motion-kit/README.md` to install (APEXlang snippets in `motion-kit/dist/apexlang/`,
23.1+ SQL in `motion-kit/dist/legacy/`) and configure areas. Edit only
`motion-kit/amc-motion-kit.{css,js}`, then run `node tools/build-kit.mjs`. The kit may target
Universal Theme classes (unlike components) but must keep every animation inside
`@media (prefers-reduced-motion: no-preference)` and must not change layout or colors.

## Rules

- Generated files (`dist/**`, `components/*/README.md`, `assets/components.catalog.json`)
  are build output. Edit sources and run `node tools/build.mjs`.
- Never change an existing component's `staticId`, attribute numbers or attribute
  static IDs: existing apps would lose their settings. Add new attributes with new
  numbers and bump `version`.
- No `raw` escaping, no values substituted into `style` attributes, no `<script>` in
  templates, no hard-coded colors (the build enforces all four).
- Do not claim a component was validated in APEX unless apexlang's runtime validate
  (or a real import) actually ran. The offline build, apexlang format and grammar
  audit check structure only.
- Do not fetch external libraries at runtime. Ship them as plug-in files or app
  static files.
