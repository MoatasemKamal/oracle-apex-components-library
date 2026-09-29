# Design Collection: spec for the design-family components

The Design Collection is a set of template components named `design<Family>`. Each one
is a **family** of 8 to 12 modern designs, chosen with its **Style** setting. Every style
is a real, distinct design (different structure, shape or treatment), never the same design
in another color. All families follow `native-look-contract.md`, `component-authoring.md`
and `design-quality.md`. This file adds the rules that keep the families consistent.

## Families

| Slug | apexlangName | Modes | Styles (entry names) |
|---|---|---|---|
| `design-card` | `designCard` | partial, report | elevated, outline, glass, gradientBorder, imageTop, imageOverlay, horizontal, accentTop, ticket, stackedPaper, softInset, cornerIcon |
| `design-badge` | `designBadge` | partial, report | soft, solid, outline, dot, live, gradientPill, counter, iconTag, chip, ribbon, code, statusBar |
| `design-alert` | `designAlert` | partial, report | soft, sideIcon, solid, gradientBanner, toastCard, announcement, tip, quote, inline, panel |
| `design-timeline` | `designTimeline` | report | dots, iconRail, alternating, cards, log, milestones, changelog, numbered, dateBlocks, branch |
| `design-list` | `designList` | report | avatarRows, fileRows, checklist, leaderboard, contacts, settings, notifications, inbox, metricRows, compact, pills |
| `design-kpi` | `designKpi` | partial, report | bigNumber, deltaChip, glass, gradient, compare, targetBar, ring, sparkBars, iconLeft, minimal |
| `design-profile` | `designProfile` | partial, report | centered, cover, horizontal, glass, minimal, stats, gradientRing, businessCard, chip, compactRow |
| `design-pricing` | `designPricing` | partial, report | classic, highlighted, glass, gradientHeader, minimal, horizontal, checklist, compact, darkEnterprise, outlineBold |
| `design-button` | `designButton` | partial, report | soft, gradient, glass, outlineDraw, pillArrow, iconCircle, press3d, shimmer, underline, ghostGlow, splitIcon, neonBorder |
| `design-header` | `designHeader` | partial | gradientHero, split, minimal, imageOverlay, dottedGrid, cardHeader, centeredIcon, waveBottom, glassPanel, eyebrow |
| `design-avatar` | `designAvatar` | partial, report | ring, statusDot, squircle, gradientRing, initialsSoft, withName, countBadge, squareTile |
| `design-divider` | `designDivider` | partial | lineTitle, eyebrowTitle, gradientLine, iconCenter, pillLabel, accentUnderline, dotted, sideLabel |

The owner may add styles; never rename or renumber an existing entry or attribute.

## Shared conventions

- **Style attribute:** `staticId: STYLE`, `apexlangName: style`, `attribute: 1`, type
  `selectList`, required, default = first style, `escapeMode: htmlAttribute`. Entry `name`
  and `return` are the same lowerCamelCase value; `display` is a short human label
  (no ( ) { } characters).
- **State attribute** (where a family has status): `staticId: STATE`, sessionStateValue,
  values `success | warning | danger | info | neutral`, mapped to classes only through
  `{case STATE/}` so unknown values fall back to neutral.
- **Root markup:** `<div class="amc-D<Family> amc-D<Family>--#STYLE#{...}">`, for example
  `amc-DCard amc-DCard--glass`. Styles share one markup where possible and use `{case STYLE/}`
  only where the structure really differs.
- **Report body/row:** a grid or list wrapper with `#APEX$ROWS#`, row wrapper with
  `#APEX$PARTIAL#`; the style class also goes on the report body (repeat the STYLE
  attribute there) when layout depends on it.
- **CSS:** one file `files/amc-design-<family>.css`. A token block on the root and report
  body classes maps to `--ut-*` variables with literal fallbacks. Only `amc-` classes in
  selectors. Literal colors only as `var()` fallbacks. Decorative gradients are built
  from palette variables with `color-mix()`. Use logical properties. Include
  `@media (prefers-reduced-motion: reduce)` for any transition or animation, and
  `@media (forced-colors: active)` where borders or fills carry meaning.
- **Glass styles:** `backdrop-filter: blur(...)` on a translucent
  `color-mix(in srgb, var(--ut-component-background-color) 60%, transparent)` surface plus a
  hairline border. They must stay readable on a plain page background (no text contrast
  relying on a backdrop).
- **Icons:** Font APEX classes via a sessionStateValue `ICON` attribute with
  `escapeMode: htmlAttribute`, rendered as `<span class="fa #ICON#" aria-hidden="true"></span>`.
- **Links:** `LINK_URL` (htmlAttribute) plus a visible label; whole-card click uses a
  stretched link (`a::after { position:absolute; inset:0 }`), never a click handler.
- **Images:** `<img ... width height alt="" loading="lazy">` (the validator requires width,
  height and alt).
- **JavaScript:** only when a style cannot be done in HTML/CSS (for example splitting a
  `|`-separated feature list or series). Plain ES5-compatible IIFE, `window.amc...` guard,
  `textContent` only, MutationObserver re-init like the Motion components. No values
  injected into `style` attributes from data; JS may set CSS custom properties only after
  parsing numbers.
- **Accessibility:** semantic elements (`h3` headings, `ul/li`, `dl`, `figure`); decorative
  shapes `aria-hidden`; state never by color alone.

## Definition of done per family

1. `node tools/build.mjs --only <apexlangName>` prints `ok` with no errors.
2. `examples/preview.json` has one sample per style (report mode with 2 to 4 rows where
   the family is data-driven), with realistic business content (orders, customers, projects,
   invoices), never lorem ipsum.
3. The preview (`node tools/preview.mjs`, then a screenshot) shows every style correctly in
   Vita (light), Vita Dark and the RTL panel: no overflow, readable contrast, no broken
   layout at a 220px wide column.
4. `examples/region-*.apx.md` shows one APEXlang usage (settings use entry names).
5. The component README is generated by the build (do not hand-edit it).
