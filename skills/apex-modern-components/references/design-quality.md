# Design Quality Gate

Use this before designing a new component and again before calling it done. It adapts
the research-first method and craft checklists of the **Refero design skill**
(<https://github.com/referodesign/refero_skill>, MIT License, (c) Refero) to APEX,
where the target is "looks like it shipped with Universal Theme", not "looks like a
landing page".

## 1. Research before designing

A new component needs evidence, not a guess about what looks modern.

- **Refero MCP (optional, paid Refero plan):**
  `claude mcp add --transport http refero https://api.refero.design/mcp`, then sign in
  with `/mcp`. Useful tools:
  - `refero_search_screens` / `refero_get_screen`: how real products lay out the same
    pattern (for example "approval stepper", "KPI dashboard", "team avatars").
  - `refero_search_flows` / `refero_get_flow`: for multi-step components such as wizards
    and approval flows.
  - `refero_search_styles`: visual direction, when the user wants a new look. Then
    express it as `--ut-*` variables (see `design-systems.md`), not as component CSS.
- **Without Refero:** use the user's screenshots, the native Universal Theme
  components (Cards, Content Row, Metric Card, Timeline), and the sources in
  `porting-external-components.md`, `magicui.md` and `design-systems.md`.

Write down, in the component's `component.json` `description`, which pattern it
follows and why. Look at several references and keep one clear direction; a blend of
all of them ends up generic.

## 2. Anti-generic rules for APEX components

Most "AI slop" tells come from inventing a look instead of inheriting one. In APEX the
theme owns the look, so:

| Tell | APEX rule |
|---|---|
| Default indigo/violet accent | Never pick an accent. Use `--ut-palette-primary`, which the app's theme style sets. |
| Cards everywhere | A tile/card is justified only if it groups an interaction or a record. Card test: if removing border, shadow, background and radius hurts nothing, drop them (Key-Value List and Progress Steps have no cards for this reason). |
| Decorative left accent stripes | Not used. State is shown by semantic color on the element that carries meaning (marker, delta, bar). |
| Emoji as icons | Font APEX `fa-*` icons only, `aria-hidden="true"`, with a text alternative when meaningful. |
| Dark mode by default | Components have no mode. They follow the theme style (Vita, Vita Dark, Redwood, ...). |
| Token role drift | `success/warning/danger/info` only for status; `primary` for the main action or current state. Never as decoration. |
| Fake graphics | No CSS blobs or fake illustrations. Use a real image column (`IMAGE_URL`) or leave it out. |
| Effects without purpose | Motion only to show a change of state (progress filling, hover affordance), always with a reduced-motion override. |
| ALL CAPS without spacing | Avoid all caps; if used, add `letter-spacing: .04em` or more. |

## 3. Craft checklist (enforced items marked)

Focus and keyboard
- [ ] `:focus-visible` styles on every interactive part; never a bare `outline: none`
  without a visible replacement.
- [ ] Real `<a>` for navigation, `<button>` for actions, native inputs for values.
- [ ] Icon-only buttons have `aria-label`.

Images
- [ ] Every `<img>` has `width`, `height` and `alt` **(enforced)**; decorative images use
  `alt=""`, and `loading="lazy"` below the fold.

Motion and performance
- [ ] No `transition: all` **(enforced)**; transition named properties only.
- [ ] Every transition or animation has a `prefers-reduced-motion` override **(enforced)**.
- [ ] Large report-mode components rely on APEX pagination / lazy loading, not
  rendering hundreds of rows.

Numbers, dates, text
- [ ] Format numbers and dates in SQL with the app's NLS settings (or `Intl.*` in JS),
  never hard-coded patterns in templates.
- [ ] Numeric and mixed-direction text has bidi isolation (`unicode-bidi: plaintext` or
  `isolate`).
- [ ] Copy: specific labels ("Create Order", not "Submit"); empty states say what to
  do next; errors say how to fix them.

Accessibility
- [ ] Semantic elements (`<dl>`, `<ol>`, `<progress>`, `<fieldset>`, `<figure>`).
- [ ] State not conveyed by color alone (screen-reader text or an icon).
- [ ] Heading levels fit inside a region (components use `h3`).
- [ ] Changes that happen without a page load are announced (`role="status"` or
  `aria-live`).

## 4. Validate the rendered result

1. `node tools/preview.mjs`, then screenshot the preview (light, dark, RTL, plus any
   `styles/` panels) and compare it with the chosen reference.
2. Check narrow widths (a 390px viewport) and long values (numbers with units,
   long names).
3. Fix drift before handoff; do not treat research alone as proof of quality.
4. Final proof is a real APEX page: switch theme styles in Theme Roller and toggle
   dark mode.
