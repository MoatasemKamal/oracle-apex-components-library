# Oracle APEX Components Library

Modern custom components for Oracle APEX that **look and behave like native Universal
Theme components**, packaged as an agent **skill** that works together with Oracle's
[`apexlang`](https://github.com/oracle/skills/tree/main/apex/apexlang) skill.

- **Native look**: every color, radius and shadow comes from Universal Theme variables,
  so components follow Vita, Vita Dark, Redwood Light and any Theme Roller style,
  including dark mode and RTL.
- **APEX 23.1 to 26.x and later**: each component ships as an APEXlang plug-in
  definition (APEX 26.1+) **and** as a plug-in export stamped for 23.1, which imports
  into every later release.
- **Agent-ready**: `skills/apex-modern-components/SKILL.md` tells a coding agent how to
  choose, install, place, create and port components, and hands off to `apexlang`
  for grammar, compiler and runtime validation.

## Components

| Component | Type | Modes | Use it for |
|---|---|---|---|
| [Stat Card](skills/apex-modern-components/components/stat-card) | template component | partial, report | KPI tiles with trend delta, icon and accent |
| [Progress Meter](skills/apex-modern-components/components/progress-meter) | template component | partial, report | Accessible progress bars, including in report columns |
| [Progress Steps](skills/apex-modern-components/components/progress-steps) | template component | report | Data-driven stepper for approvals and order workflows |
| [Key-Value List](skills/apex-modern-components/components/key-value-list) | template component | report | Record detail panels (`<dl>`), inline / stacked / grid |
| [Empty State](skills/apex-modern-components/components/empty-state) | template component | partial | No-data and first-run placeholders with a native button |
| [Star Rating](skills/apex-modern-components/components/star-rating) | item plug-in | page item | 1..N rating item with DA, read-only and `apex.item` support |

Each folder has a generated README (settings, install) and `examples/` with APEXlang
usage.

## Install into an app

**APEX 26.1+ (APEXlang)**: copy
`components/<name>/dist/apexlang/shared-components/plugins/<name>/` into your app's
`shared-components/plugins/`, reference it from pages as `type: plugin/<apexlangName>`,
then run the apexlang skill's gates (format, compiler-truth audit, runtime validate).

**APEX 23.1 to 25.x (or any version, through the Builder)**: App Builder > Shared
Components > Plug-ins > Import `components/<name>/dist/legacy/amc_<name>.sql`.

## Use the skill with an agent

Install both skills where your agent loads skills, for example with Claude Code:

```bash
cp -r skills/apex-modern-components ~/.claude/skills/
# plus Oracle's apexlang skill: https://github.com/oracle/skills/tree/main/apex/apexlang
```

Then ask, for example: *"Add a KPI row with Stat Cards for open orders, revenue and
average response time to page 1"*, or *"Port this 21st.dev pricing card into an APEX
template component"*.

## Develop

Node 18+; no npm dependencies.

```bash
cd skills/apex-modern-components
node tools/new-component.mjs pricing-card "Pricing Card"   # scaffold
node tools/build.mjs          # validate + generate APEXlang, legacy SQL, READMEs, catalog
node tools/preview.mjs        # preview/index.html: light, dark, RTL
node tools/apexlang-check.mjs --apexlang <path>/oracle-skills/apex/apexlang
```

See [`SKILL.md`](skills/apex-modern-components/SKILL.md) and the
[`references/`](skills/apex-modern-components/references) folder for the theme contract,
version rules, authoring guide, apexlang integration, and porting designs from
21st.dev and similar galleries.

## Verification status

Checked offline: the library validator (theme tokens, escaping, 23.1 feature
baseline, template references), Oracle apexlang `format --strict-structure` and
`grammar audit` on every generated `plugin.apx`, and visual rendering in simulated
light, dark and RTL styles. **Not yet run against a live APEX instance**: APEXlang
compiler-truth, runtime validate, and importing the legacy SQL. Run those before
production use and report token corrections back into `tools/lib/tokens.mjs`. The
item plug-in's APEXlang tokens are flagged in its README as needing compiler
confirmation.
