# Design direction: frontend-design inside APEX

The `frontend-design` plugin (Anthropic, `frontend-design@claude-code-plugins`) supplies the
**taste**: ground the look in the subject, plan a token system, avoid generic AI defaults,
spend boldness in one place. APEX supplies the **constraints**: Universal Theme renders every
page, colors live in `--ut-*` variables, and users work in the app all day. This file maps one
onto the other. When the plugin is installed, load it first and follow its process; when it is
not, follow the same steps here.

## 1. Brief (from the app, not invented)

Read the app before designing: `application.apx`, the page list, the home page, the busiest
list and form pages, and the users' job. Write the brief in four lines:

- Subject and vernacular: what the app handles (parcels and trips, invoices, patients...).
- Audience and context: who, on which device, where (a courier in sunlight with one hand,
  a clerk at a desk, a manager on a tablet).
- Primary job of the home page: the one thing users open the app to do.
- Constraints already fixed: brand color, logo, language/RTL, existing Theme Style.

Confirm the brief with the user before building.

## 2. Plan: frontend-design tokens -> Universal Theme

frontend-design asks for 4-6 named colors, typefaces, a layout concept and principles. Record
them, then map each one:

| frontend-design token | Where it goes in APEX |
|---|---|
| Base / page color | `--ut-body-background-color`, manifest **Background color** |
| Surface color | `--ut-component-background-color` |
| Ink (text) | `--ut-body-text-color`, `--ut-component-text-default-color`, muted: `--ut-component-text-muted-color` |
| Brand / action color | `--ut-palette-primary` (+ `-contrast`), manifest **Theme color**, `<meta name="theme-color">` |
| Header / chrome | `--ut-header-background-color`, `--ut-header-text-color`, `--ut-nav-background-color` |
| Semantic colors | `--ut-palette-success/-warning/-danger/-info` (keep their meaning; tune hue only) |
| Radius and elevation | `--ut-component-border-radius`, `--ut-component-box-shadow` (vary by hierarchy, not one value everywhere) |
| Typeface(s) | `--ut-font-family` in the style; font files uploaded as Static Application Files and loaded with `@font-face` (no runtime CDN: installed apps must work on bad networks) |
| Layout concept | Page template choice, region templates, Navigation Menu position, the phone tab bar |
| Principles | Written into the style's `README.md` so later pages follow them |

Implement the result as a Universal Theme style (`skills/apex-modern-components`,
section G and `references/theme-styles.md`): copy the closest style, edit `style.json` and the
CSS, run `node tools/build-styles.mjs` (WCAG AA contrast gate) and `preview-styles.mjs`. One style
restyles native APEX, the library components and the PWA Kit together.

## 3. Review the plan (frontend-design's second pass, APEX edition)

Revise any part that is a default rather than a choice. In APEX apps the defaults are:

- Stock Vita blue with no link to the brand or subject.
- Every region the same Standard region with the same shadow; KPI cards with a big number,
  small label and a gradient on every home page.
- Interactive Reports as the main phone surface.
- ALL-CAPS region titles, eyebrow labels, icons on every button, `fa-arrow-right` on links.
- Motion on everything (Motion Kit with all areas on): pick the few areas that answer user
  actions (buttons, forms, alerts) and at most one load moment.
- Plus frontend-design's own list (cream + terracotta, black + acid green, SaaS-card kit...).

Say what you changed and why.

## 4. Where to spend the boldness

Pick one, per app:

- The home page's first screen (the "hero" of an app is the task that starts the day: a
  scan button, today's route, the approval queue).
- The header and install identity (icon, theme color, splash) so the installed app is
  recognisable on the home screen.
- A signature component (status timeline, trip card) reused across pages.

Keep forms, reports and dialogs quiet, dense enough for work, and native.

## 5. Quality floor (both skills agree)

- Responsive down to 360 px, touch targets >= 44 px, inputs >= 16 px.
- Visible keyboard focus, AA contrast (build gate), `prefers-reduced-motion` respected,
  RTL mirrored with logical properties.
- Light and dark if the app offers both; theme-color follows.
- Screenshot the real pages (APEX instance or the style preview) on a phone viewport and
  critique before reporting; "remove one accessory" before you finish.
