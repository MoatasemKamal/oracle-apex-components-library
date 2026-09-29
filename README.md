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
| [Circular Progress](skills/apex-modern-components/components/circular-progress) | template component | partial, report | Animated ring gauges (adapted from Magic UI, MIT) |
| [Avatar Group](skills/apex-modern-components/components/avatar-group) | template component | report | Overlapping team avatars with +N counter (adapted from Magic UI, MIT) |
| [Bento Grid](skills/apex-modern-components/components/bento-grid) | template component | report | Home page launchpad tiles in a bento layout (adapted from Magic UI, MIT) |
| [Motion Loader](skills/apex-modern-components/components/motion-loader) | template component | partial | 7 animated loading indicators |
| [Motion Effect](skills/apex-modern-components/components/motion-effect) | template component | partial | 31 decorative animations: physics, morphing, SVG, 3D and canvas particles (confetti, fireworks, galaxy) |
| [Motion Text](skills/apex-modern-components/components/motion-text) | template component | partial | Animated headlines: wave, glitch, reveal, flip, typewriter, scramble |
| [Motion Interaction](skills/apex-modern-components/components/motion-interaction) | template component | partial | Ripple, magnetic and squish buttons, tilt card, spotlight, like toggle |
| [Motion Count Up](skills/apex-modern-components/components/motion-count-up) | template component | partial, report | KPI numbers that count up when scrolled into view, locale-formatted |
| [Motion Stagger List](skills/apex-modern-components/components/motion-stagger-list) | template component | report | Activity feeds whose rows rise, slide, scale or blur in one after another |
| [Motion Spotlight Cards](skills/apex-modern-components/components/motion-spotlight-cards) | template component | report | Card grid with a light and border glow that follow the pointer |
| [Motion Celebrate](skills/apex-modern-components/components/motion-celebrate) | template component | partial | Confetti cannons, confetti rain or fireworks on page load or from a Dynamic Action |

Each folder has a generated README (settings, install) and `examples/` with APEXlang
usage.

## Creative Templates (31 native List and Region templates)

Native **List Templates** and **Region Templates** for Universal Theme, not plug-ins: pick them in
**Appearance > List Template** or **Appearance > Template**, and switch variants with **Template Options**.
Region templates frame any native region (reports, forms, charts) without restyling its content.
Each template ships as an APEXlang file (26.1+) and a 23.1 component export that also installs its CSS/JS
as Static Application Files; `theme-templates/dist/legacy/install_amc_templates.sql` installs all of them.
See [`references/theme-templates.md`](skills/apex-modern-components/references/theme-templates.md).

**List templates**

| Template | Direction | Look |
|---|---|---|
| [Accordion Rail](skills/apex-modern-components/theme-templates/accordion-rail) | smart | Side navigation drawn as a rail: every entry is a node on one line, groups open like an accordion with a smooth height morph, and the path from the current parent down to the current page glows along the rail. |
| [Bento Launchpad](skills/apex-modern-components/theme-templates/bento-launchpad) | smart | A bento launchpad: list entries become tiles of mixed sizes with an oversized tilted icon, a description and a live metric, and the grid and every tile recompose with container queries as the region changes width. |
| [Brutal Links](skills/apex-modern-components/theme-templates/brutal-links) | bold | Neo-brutalist link cards with ink borders, hard offset shadows, flat palette fills that rotate per entry, an oversized arrow and a press-down click. |
| [Clay Menu](skills/apex-modern-components/theme-templates/clay-menu) | bold | A claymorphism pill menu on a soft tray: pillowy pills with glossy icon bubbles, soft inner and outer shadows, and the current entry pressed into the tray. |
| [Command List](skills/apex-modern-components/theme-templates/command-list) | smart | A command-palette list: a search box filters the entries as you type and highlights the match, arrow keys move between commands, and each row shows an icon, a description and its keyboard-shortcut chip. |
| [Dock Bar](skills/apex-modern-components/theme-templates/dock-bar) | depth | A desktop-style dock: glossy icon tiles stand on a 3D glass shelf with reflections, magnify with their neighbours under the pointer or keyboard focus, and show their label as a tooltip. |
| [Flip Tiles](skills/apex-modern-components/theme-templates/flip-tiles) | depth | Launch tiles that turn over in 3D on hover and keyboard focus: icon and label on the front, a description and a call to action on a colored back face, while each tile stays one real link. |
| [Liquid Tabs](skills/apex-modern-components/theme-templates/liquid-tabs) | motion | Tab navigation whose indicator behaves like a drop of liquid: it stretches toward the hovered or focused tab through an SVG goo filter and snaps back to the current page, instead of the flat underline of classic tabs. |
| [Marquee Links](skills/apex-modern-components/theme-templates/marquee-links) | motion | An announcement ticker: the list's links glide past in a seamless loop with faded edges and a live pulse, and pause on hover, keyboard focus or the pause button. |
| [Mega Menu](skills/apex-modern-components/theme-templates/mega-menu) | depth | A floating top menu bar whose parent entries swing open a glass mega panel on a perspective hinge, with a feature card for the parent page and a grid of sub pages with 3D icon tiles and descriptions. |
| [Metro Steps](skills/apex-modern-components/theme-templates/metro-steps) | bold | Wizard progress drawn as a transit line: completed stations are ticked on a solid colored line, the current station is a large pulsing stop with a station sign, and stations still to come sit on a dashed planned line. |
| [Orbit Launcher](skills/apex-modern-components/theme-templates/orbit-launcher) | motion | An app launcher where the first list entry is a glowing hub and the other entries orbit it on a slowly turning ring with a travelling comet, instead of a flat grid of tiles. |
| [Segmented Glass](skills/apex-modern-components/theme-templates/segmented-glass) | depth | A frosted-glass segmented control for page navigation: a recessed glass tray with a raised glass thumb that sits on the current page and glides to the segment under the pointer or keyboard focus, driven by CSS :has() alone. |
| [Speed Dial](skills/apex-modern-components/theme-templates/speed-dial) | motion | A floating action button that springs the list entries out as mini buttons in a stack or a quarter arc, with labels sliding out beside them, instead of a static button bar. |
| [Spotlight Grid](skills/apex-modern-components/theme-templates/spotlight-grid) | motion | A tile grid lit by one pointer spotlight that travels across all tiles at once, revealing a dot pattern and making nearby tile edges glow, while the current tile keeps a soft resting glow. |
| [Stacked Deck](skills/apex-modern-components/theme-templates/stacked-deck) | depth | List entries rest as a deck of cards stacked in perspective, each one peeking out behind the one in front, and fan out into a readable list while the deck has hover or keyboard focus. |

**Region templates**

| Template | Direction | Look |
|---|---|---|
| [Aurora Header](skills/apex-modern-components/theme-templates/aurora-header) | motion | A region with a tall header band of slowly drifting aurora light and film grain, carrying a large title and icon, and a calm content sheet that overlaps the band. |
| [Beam Frame](skills/apex-modern-components/theme-templates/beam-frame) | motion | A region frame with a beam of light that travels around its border and speeds up while the region has hover or focus. |
| [Browser Window](skills/apex-modern-components/theme-templates/browser-window) | depth | A browser-window mockup with real depth: a tab strip whose active tab carries the title and icon as favicon, a toolbar with an address pill, and a layered window shadow, with phone and tablet device frames for previewing pages. |
| [Brutal Block](skills/apex-modern-components/theme-templates/brutal-block) | bold | A neo-brutalist region: thick ink border, hard offset shadow, a flat striped palette band and the title in a tilted sticker label that breaks out of the top edge. |
| [Clay Panel](skills/apex-modern-components/theme-templates/clay-panel) | bold | A claymorphism region: a pillowy, softly lit panel with the title in a raised clay pill, the icon in a glossy clay bubble and the native content in a gently pressed tray. |
| [Collapsible Morph](skills/apex-modern-components/theme-templates/collapsible-morph) | smart | A collapsible region whose card morphs into a compact pill when collapsed: width, corners and header shape change together while the body folds away, instead of a classic chevron header with a sliding body. |
| [Folder Tab](skills/apex-modern-components/theme-templates/folder-tab) | bold | The region is a physical file folder: a trapezoid tab with the icon and title rises from the top edge, and the content sits on a sheet of grained paper tucked into a manila or palette-colored folder, optionally with more sheets peeking out behind it. |
| [Glass Depth](skills/apex-modern-components/theme-templates/glass-depth) | depth | A frosted-glass panel with a light top edge and layered depth shadow floats over soft colored light drawn on the region frame, with a second glass sheet peeking out beneath it, while the body sits on a calm readable sheet. |
| [Holo Edge](skills/apex-modern-components/theme-templates/holo-edge) | bold | A holographic foil edge and header strip built from the theme palette, with a sheen that shifts with the pointer or drifts slowly, around a calm, plain body. |
| [Kinetic Title](skills/apex-modern-components/theme-templates/kinetic-title) | bold | A magazine-style region: an oversized outlined title that fills with color in a wipe on hover or keyboard focus, a small eyebrow from the icon, a thin rule that grows an accent, and the native content on a plain sheet below. |
| [Side Rail](skills/apex-modern-components/theme-templates/side-rail) | smart | An editorial region: under a heavy top rule the title runs vertically in a side rail with the icon and header buttons stacked in it, and the native content takes the rest; in narrow containers it switches to a normal top header by itself. |
| [Spotlight Frame](skills/apex-modern-components/theme-templates/spotlight-frame) | motion | A region frame where a pointer spotlight and a glowing border follow the mouse, and a faint grid lights up under the beam in the header only. |
| [Stacked Sheets](skills/apex-modern-components/theme-templates/stacked-sheets) | depth | The region is the top sheet of a small pile of offset, palette-tinted paper sheets held by a strip of tape; the sheets fan out further on hover or keyboard focus. |
| [Terminal Window](skills/apex-modern-components/theme-templates/terminal-window) | bold | A desktop terminal window: an inverse-colored bezel and title bar with three window dots and the title centered in monospace after a prompt, around a readable content pane. |
| [Ticket Stub](skills/apex-modern-components/theme-templates/ticket-stub) | smart | The region is a ticket: a tinted stub with icon, title, buttons and a barcode is torn off from the body by a perforated line with punched notches, and the stub moves from the side to the top when the region gets narrow. |

## Next Collection (114 new-generation designs)

Eleven template components with designs in four directions: **motion** (border beams,
spotlights, shimmer, meteors, tickers, marquees), **3D depth** (pointer tilt, flip cards,
layered stacks, perspective), **bold aesthetics** (neo-brutalism, claymorphism, aurora and
film grain, holographic foil, kinetic type) and **smart layout** (container-query
recomposition, scroll-driven reveals, expanding cards). Every style still reads the
Universal Theme variables, works in RTL and stops all motion under reduced motion. See
[`references/next-collection.md`](skills/apex-modern-components/references/next-collection.md).

| Component | Styles | Modes | Designs |
|---|---:|---|---|
| [Next Card](skills/apex-modern-components/components/next-card) | 12 | partial, report | border beam, spotlight, meteors, tilt 3D, flip, layered stack, neo-brutal, clay, aurora grain, holo foil, expand reveal, adaptive |
| [Next Button](skills/apex-modern-components/components/next-button) | 12 | partial, report | border beam, shimmer, rainbow glow, pulse ring, keycap, layered, magnetic, neo-brutal, clay, holo, morph icon, confirm hold |
| [Next Badge](skills/apex-modern-components/components/next-badge) | 10 | partial, report | shine, pulse live, beam outline, sticker tilt, extruded, neo-brutal, clay, holo, expand label, stack count |
| [Next KPI](skills/apex-modern-components/components/next-kpi) | 10 | partial, report | odometer ticker, beam, liquid fill, tilt, flip detail, neo-brutal, clay, aurora glow, bento tile, adaptive |
| [Next Profile](skills/apex-modern-components/components/next-profile) | 10 | partial, report | orbit ring, beam frame, tilt holo ID, flip contact, lanyard badge, neo-brutal, clay, sticker, bento profile, expand bio |
| [Next List](skills/apex-modern-components/components/next-list) | 10 | report | animated feed, marquee logos, spotlight rows, 3D stack, lift rows, neo-brutal, clay, terminal, accordion rows, scroll reveal |
| [Next Timeline](skills/apex-modern-components/components/next-timeline) | 10 | report | beam rail, pulse now, perspective road, stacked 3D cards, neo-brutal, clay, kinetic years, metro line, scroll progress, expand steps |
| [Next Pricing](skills/apex-modern-components/components/next-pricing) | 10 | partial, report | beam featured, spotlight, tilt 3D, flip annual, neo-brutal, clay, holo premium, aurora dark, expand features, comparison adaptive |
| [Next Alert](skills/apex-modern-components/components/next-alert) | 10 | partial, report | beam toast, pulse critical, ticker bar, stacked toasts, lift glass, neo-brutal, clay, hazard stripe, expand details, adaptive bar |
| [Next Hero](skills/apex-modern-components/components/next-hero) | 10 | partial | aurora, meteors, grid spotlight, retro grid, parallax layers, kinetic type, neo-brutal, mesh grain, split morph, scroll reveal |
| [Next Bento](skills/apex-modern-components/components/next-bento) | 10 | report | spotlight glow, beam feature, tilt tiles, layered glass, neo-brutal, clay, aurora mosaic, grid pattern, magazine, expanding tiles |
| **Total** | **114** | | |

Techniques adapted from [Magic UI](https://magicui.design) (MIT) are credited in each
component's `source` and file headers.

## Design Collection (123 classic designs)

Twelve template components, each a **family** of distinct modern designs picked with one
**Style** setting. All of them read the Universal Theme variables, so every style follows
Vita, Vita Dark, Redwood and Theme Roller, and works in RTL. See
[`references/design-collection.md`](skills/apex-modern-components/references/design-collection.md).

| Component | Styles | Modes | Designs |
|---|---:|---|---|
| [Design Card](skills/apex-modern-components/components/design-card) | 12 | partial, report | elevated, outline, glass, gradient border, image top, image overlay, horizontal, accent top, ticket, stacked paper, soft inset, corner icon |
| [Design Badge](skills/apex-modern-components/components/design-badge) | 12 | partial, report | soft, solid, outline, dot, live, gradient pill, counter, icon tag, chip, ribbon, code, status bar |
| [Design Button](skills/apex-modern-components/components/design-button) | 12 | partial, report | soft, gradient, glass, outline draw, pill arrow, icon circle, 3D press, shimmer, underline, ghost glow, split icon, neon border |
| [Design List](skills/apex-modern-components/components/design-list) | 11 | report | avatar rows, file rows, checklist, leaderboard, contacts, settings, notifications, inbox, metric rows, compact, pills |
| [Design Alert](skills/apex-modern-components/components/design-alert) | 10 | partial, report | soft, side icon, solid, gradient banner, toast card, announcement, tip, quote, inline, panel |
| [Design Timeline](skills/apex-modern-components/components/design-timeline) | 10 | report | dots, icon rail, alternating, cards, log, milestones, changelog, numbered, date blocks, branch |
| [Design KPI](skills/apex-modern-components/components/design-kpi) | 10 | partial, report | big number, delta chip, glass, gradient, compare, target bar, ring, spark bars, icon left, minimal |
| [Design Profile](skills/apex-modern-components/components/design-profile) | 10 | partial, report | centered, cover, horizontal, glass, minimal, stats, gradient ring, business card, chip, compact row |
| [Design Pricing](skills/apex-modern-components/components/design-pricing) | 10 | partial, report | classic, highlighted, glass, gradient header, minimal, horizontal, checklist, compact, dark enterprise, outline bold |
| [Design Header](skills/apex-modern-components/components/design-header) | 10 | partial | gradient hero, split, minimal, image overlay, dotted grid, card header, centered icon, wave bottom, glass panel, eyebrow |
| [Design Avatar](skills/apex-modern-components/components/design-avatar) | 8 | partial, report | ring, status dot, squircle, gradient ring, initials, with name, count badge, square tile |
| [Design Divider](skills/apex-modern-components/components/design-divider) | 8 | partial | line title, eyebrow title, gradient line, icon center, pill label, accent underline, dotted, side label |
| **Total** | **123** | | |

## Motion Kit (native buttons, forms, reports, icons, breadcrumbs, nav bar, menu bar)

[`motion-kit/`](skills/apex-modern-components/motion-kit) adds motion to the native
Universal Theme elements every page already has, app-wide, from two static files: ripple and
busy states on buttons, focus glow and error shake on forms, row entrances on report refresh,
icon animation classes, sliding breadcrumbs, badge bumps in the navigation bar, a gliding
highlight in the menu bar and animated menus. See its README for install and configuration.

## Motion Gallery

[`motion-gallery/index.html`](motion-gallery/index.html) is a standalone showcase of 50
animations (pure CSS keyframes and vanilla JS). All 50 are available in APEX through the
four Motion components above.

## Design systems (DESIGN.md)

`tools/design-md-to-ut.mjs` converts a DESIGN.md, for example from
[awesome-design-md](https://github.com/VoltAgent/awesome-design-md), into a Universal
Theme style (`--ut-*` variables). Applied with Theme Roller, it restyles native APEX
components and this library together. Examples are in
[`skills/apex-modern-components/styles/`](skills/apex-modern-components/styles). See
[`references/design-systems.md`](skills/apex-modern-components/references/design-systems.md).

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
node tools/design-md-to-ut.mjs <path>/DESIGN.md             # design system -> UT style
node tools/build-kit.mjs                                    # package the Motion Kit
node tools/new-template.mjs orbit-menu list "Orbit Menu"   # scaffold a theme template
node tools/build-templates.mjs                              # validate + package theme templates
node tools/preview-templates.mjs                            # preview/templates.html
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
