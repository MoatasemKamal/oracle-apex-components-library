# Next Collection: spec for the `next*` families

The **Next Collection** sits beside the Design Collection (`design-collection.md`), which
stays as the "classic" set. Each `next<Family>` template component is a family of 10 to 12
**current-generation** designs chosen with its **Style** setting. The goal is new thinking,
not restyled SaaS cards: every style must use at least one technique from the four
directions below as the core of its identity, and a family must cover all four
directions (at least two styles each).

## The four directions

| Direction | Tag | What it means here | Techniques |
|---|---|---|---|
| Motion and effects | `motion` | Light and movement carry the design (21st.dev / Magic UI level) | Border beam (`@property --amc-angle` + conic-gradient mask), shine sweep, pointer spotlight, meteors, animated gradient text, number ticker, marquee, animated list entry, pulse ring |
| 3D and depth | `depth` | Real perspective and layering | Pointer tilt (`perspective` + `rotateX/Y` from CSS variables), flip cards (`backface-visibility`), layered parallax on hover, perspective stacks, glass with light edge and depth shadow, floating elements |
| Bold aesthetics | `bold` | A strong, recognisable visual language | Neo-brutalism (2-3px ink border, hard offset shadow, flat fills), claymorphism (soft inner+outer shadows, pillowy radius), bento composition, aurora / mesh gradients, film grain (SVG `feTurbulence` data URI), oversized kinetic type, holographic foil, retro perspective grid, dot and grid patterns |
| Smart layout | `smart` | The component changes shape by itself | Container queries that switch composition (not just stack), scroll-driven reveals (`animation-timeline: view()` inside `@supports`), expanding / morphing cards (`:hover`, `:focus-within`, `details`), `interpolate-size`, `:has()`-driven states |

## Families

| Slug | apexlangName | Modes | Root class | Styles |
|---|---|---|---|---:|
| `next-card` | `nextCard` | partial, report | `amc-NCard` | 12 |
| `next-button` | `nextButton` | partial, report | `amc-NButton` | 12 |
| `next-hero` | `nextHero` | partial | `amc-NHero` | 10 |
| `next-kpi` | `nextKpi` | partial, report | `amc-NKpi` | 10 |
| `next-badge` | `nextBadge` | partial, report | `amc-NBadge` | 10 |
| `next-list` | `nextList` | report | `amc-NList` | 10 |
| `next-bento` | `nextBento` | report | `amc-NBento` | 10 |
| `next-pricing` | `nextPricing` | partial, report | `amc-NPricing` | 10 |
| `next-profile` | `nextProfile` | partial, report | `amc-NProfile` | 10 |
| `next-alert` | `nextAlert` | partial, report | `amc-NAlert` | 10 |
| `next-timeline` | `nextTimeline` | report | `amc-NTimeline` | 10 |
| `next-gallery` | `nextGallery` | report | `amc-NGallery` | 10 |
| `next-calendar` | `nextCalendar` | report | `amc-NCalendar` | 10 |

Total: 134 styles (Gallery and Calendar added later). Style entry names are chosen by the family author, lowerCamelCase, and
never renamed afterwards.

## Shared conventions

Everything in `design-collection.md` "Shared conventions" applies (STYLE attribute 1,
STATE through `{case}`, root markup `amc-N<Family> amc-N<Family>--#STYLE#`, one CSS file,
`--ut-*` tokens with literal fallbacks, logical properties, icons, stretched links, images,
accessibility). In addition:

- **Direction tag:** every sample in `examples/preview.json` has `"direction": "motion" |
  "depth" | "bold" | "smart"`, and the Style attribute `helpText` names each style's
  direction. The gallery uses this tag.
- **Complete at rest:** the first frame is the finished design. Never start content at
  `opacity: 0` waiting for JS or an observer; entry animations run from a visible state or
  only inside `@supports (animation-timeline: view())`.
- **Reduced motion:** under `prefers-reduced-motion: reduce` every moving part stops and the
  static design remains attractive (a beam becomes a static gradient border, tilt is
  disabled, marquees stop and wrap).
- **Touch and keyboard:** a hover effect is never the only way to reach content. Every
  hover effect also runs on `:focus-visible` / `:focus-within`, and pointer tracking uses
  `pointermove` with `(hover: hover)` guards.
- **Performance:** animate `transform`, `opacity`, custom properties registered with
  `@property`, and `background-position` only. At most one `backdrop-filter` layer per
  component. No canvas, no WebGL, no external libraries.
- **Brutal / clay colors:** neo-brutal ink is `var(--ut-component-text-default-color)`, so it
  inverts correctly in dark themes; clay shadows are `color-mix()` of the palette with the
  body background. No literal colors outside `var()` fallbacks (the validator enforces it).
- **JavaScript (one file per family, optional):** for pointer tracking (sets
  `--amc-mx`, `--amc-my`, `--amc-rx`, `--amc-ry` from parsed numbers), number tickers
  and splitting `|` lists. ES5-compatible IIFE, `window.amcNext<Family>` guard, delegated
  listeners on `document` so refreshed regions keep working, `textContent` only,
  `requestAnimationFrame` throttling, and nothing at all when reduced motion is on.
- **Attribution:** designs adapted from Magic UI (MIT) keep the notice in the CSS/JS header
  and `"source": { "url", "author": "Magic UI", "license": "MIT" }` in `component.json`.

## Definition of done per family

Same as `design-collection.md`, plus:

1. Every style clearly belongs to its direction when you look at a still screenshot (a
   motion style must still look distinctive at rest).
2. The family screenshot next to its Design Collection counterpart shows an obvious
   generational difference; if a style could pass as a classic one, redo it.
3. Checked in Vita, Vita Dark and the RTL panel, at 220px column width and wide.

## Gallery and Calendar

**nextGallery** renders images from a report (IMAGE_URL, THUMB_URL, TITLE, CAPTION, ALT,
LINK_URL, WIDTH, HEIGHT, GROUP). For BLOB columns the developer selects
`apex_util.get_blob_file_src(...)` or a REST/Object Storage URL as IMAGE_URL. Every image has
`alt`, `width`, `height` and `loading="lazy"`; aspect ratios come from WIDTH/HEIGHT through a
parsed CSS variable set by JS (never a style attribute). A shared, accessible lightbox
(dialog with focus trap, Escape, arrow keys, swipe, zoom, caption, counter) belongs to the
family JS and opens from any style.

**nextCalendar** renders events from a report (START_DATE, END_DATE, TITLE, DESCRIPTION,
CATEGORY, STATE, LINK_URL, ALL_DAY). Dates are ISO strings in the row (`TO_CHAR(... ,
'YYYY-MM-DD"T"HH24:MI')`); JS builds the calendar grid with `Intl.DateTimeFormat` for month
and weekday names, honours the first day of week (setting), RTL and the Islamic/Gregorian
choice only through `Intl` (no hard-coded names). Without JS the rows render as a readable
agenda list. Keyboard: arrow keys move between days, Enter opens the day's events.
