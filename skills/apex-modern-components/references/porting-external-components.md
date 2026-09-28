# Porting Components From External Galleries (21st.dev, shadcn/ui, Tailwind UI, CodePen, ...)

Galleries such as <https://21st.dev> are a good source of **modern designs**, but
their code is React (often Next.js + Tailwind + shadcn/ui + Framer Motion, three.js or
react-three-fiber for 3D). It cannot run in APEX as-is. APEX has no React runtime, and
Tailwind utility classes would fight Universal Theme. Port the **design and
behavior**, not the code.

## Getting the source from 21st.dev (optional, with the 21st CLI)

21st.dev publishes agent skills at <https://github.com/21st-dev/skill> (Apache-2.0).
Only **`21st-cli-use`** is useful for this workflow. `21st-registry`, `21st-ai` and
`21st-design-sync` publish or generate React work and do not apply here. Requirements:
network access to `21st.dev`, and a login (`npx @21st-dev/cli login`) or API key
(`TWENTYFIRST_TOKEN`). Retrieving code has a daily free quota.

```bash
npx @21st-dev/cli search "stats card" --type c --limit 10 --json   # metadata, free
npx @21st-dev/cli get <id> --json > /tmp/21st-<id>.json            # component + demo code
npx @21st-dev/cli theme <id> --json                                # a theme's CSS tokens
```

- Use `search` + `get` only. **Do not run `21st add`.** It installs into a React/shadcn
  project, which an APEX app is not.
- Keep the downloaded code in a scratch directory, not in `components/`. It is
  reference material for the port below, not library source.
- Record the component URL and author in `component.json` `source`, then do the licence
  check below. The CLI's output does not replace it.
- `21st theme` CSS (shadcn `--primary`, `--background`, ... for `:root` and
  `.dark`) can be converted to a Universal Theme look by mapping those tokens onto the
  `--ut-*` variables in the table in section 3, for example as Theme Roller custom CSS.
  Components in this library then pick it up automatically.

If `21st.dev` is blocked by your network, have the user paste the component code or
the page's "Copy code" output instead.

## 0. Licence check first (stop condition)

Open the component page and its source repository and record the licence in
`component.json` (`"source": { "url": ..., "author": ..., "license": ... }`).

- MIT / Apache-2.0 / ISC / BSD: OK. Keep the copyright notice in the CSS/JS header.
- No licence, "personal use", or paid (for example Tailwind UI): **do not copy code.**
  Recreate the look from scratch or ask the user for permission evidence.
- Never copy brand assets, logos or images.

## 1. Classify the component

| What the source component is | APEX target | Notes |
|---|---|---|
| Static display (card, badge, stat, list, hero, pricing table) | **Template component** (`partial` / `report`) | Most 21st.dev "UI" items. Pure HTML + CSS; no JS. |
| Display with light interaction (tabs, accordion, hover reveal, copy button) | Template component + small JS file | Prefer CSS-only (`<details>`, `:focus-within`) when possible |
| Input control (rating, toggle group, tag input, OTP, color picker, slider) | **Item plug-in** (PL/SQL render + `apex.item.create`) | Must post session state, support read-only, DAs, validations |
| Data widget with its own fetching (kanban, calendar, charts, 3D scene, globe) | **Region plug-in** (PL/SQL render + AJAX callback + JS) | Needs the region plug-in pattern; build as its own unit and test on a real instance |
| Page-level effect (animated background, cursor effect, confetti) | **Dynamic Action plug-in** or a static app file | Usually not worth a plug-in; respect reduced motion |

## 2. Translate the markup

1. From the React JSX, extract the **rendered HTML structure** (what the browser
   shows), not the component logic.
2. Props become **custom attributes**: text props become `sessionStateValue` (so they
   can map to columns); enum props (`variant="outline"`) become `selectList` with
   `entry` values; boolean props become `yesNo`.
3. `.map()` over an array becomes **report mode**: the array item is the partial, the
   wrapper is `reportBody` with `#APEX$ROWS#`, the item wrapper is `reportRow`.
4. Conditional JSX (`cond && <X/>`, ternaries) becomes `{if ?ATTR/}...{else/}...{endif/}`.
5. Variant-to-class maps (`cva`, `clsx`) become `{case ATTR/}{when a/}amc-X--a{when b/}...{endcase/}`.
6. Icons (lucide-react, heroicons) become Font APEX `fa-*` classes. Pick the closest
   Font APEX icon; do not embed an SVG icon set.

## 3. Translate the styling (Tailwind to theme tokens)

Rewrite Tailwind utilities as `amc-` CSS that reads Universal Theme variables
(see `native-look-contract.md`):

| Tailwind / shadcn | amc CSS |
|---|---|
| `bg-background`, `bg-card`, `bg-white` | `var(--ut-component-background-color)` |
| `text-foreground`, `text-gray-900` | `var(--ut-component-text-default-color)` |
| `text-muted-foreground`, `text-gray-500` | `var(--ut-component-text-muted-color)` |
| `border`, `border-border` | `1px solid var(--ut-component-border-color)` |
| `bg-primary`, `text-primary-foreground` | `var(--ut-palette-primary)`, `var(--ut-palette-primary-contrast)` |
| `text-green-600`, `text-red-600`, ... | `var(--ut-palette-success)`, `var(--ut-palette-danger)`, ... |
| `bg-primary/10` | `color-mix(in srgb, var(--ut-palette-primary) 10%, transparent)` |
| `rounded-lg`, `rounded-xl` | `var(--ut-component-border-radius)` (scale with `calc()`) |
| `shadow-sm` | `var(--ut-component-box-shadow)` |
| `dark:` variants | **delete**: the `--ut-*` variables already switch in dark styles |
| `ml-*`, `pl-*`, `left-*` | logical properties: `margin-inline-start`, `padding-inline-start`, `inset-inline-start` |
| `grid-cols-3 md:grid-cols-1` | `repeat(auto-fill, minmax(min(16rem, 100%), 1fr))` or `@container` |
| gradients / glows with fixed hex colors | build them from palette variables with `color-mix()` |
| Framer Motion enter/hover animations | CSS `transition` / `@keyframes`, **plus** a `prefers-reduced-motion` override |

Keep fonts, sizes and spacing close to Universal Theme (rem-based, inherit the
font). A ported component should look like it shipped with APEX, not like a different
design system dropped into the page.

## 4. Translate behavior (React state to APEX)

| React | APEX |
|---|---|
| `useState` for a value the server needs | Item plug-in; value lives in session state |
| `onChange` callback prop | Native `change` event on the item element; Dynamic Actions listen to it |
| `useEffect` data fetching | Region source SQL, or an AJAX callback (`apex.server.plugin`) in a region plug-in |
| Controlled props from a parent | Settings / columns |
| Imperative refs | `apex.item.create(id, {getValue, setValue, enable, disable, ...})` or `apex.region.create` |
| Portals / modals | APEX dialog pages or inline dialog regions |

JS files must be plain browser JavaScript (no build step, no JSX, no ES module
imports), wrap code in an IIFE, attach to `window.amc`, and escape any dynamic HTML
with `apex.util.escapeHTML`.

## 5. 3D and canvas components

21st.dev's 3D category (globes, 3D cards, WebGL backgrounds, particle fields) usually
depends on three.js / react-three-fiber.

- **CSS-only 3D effects** (tilt card, flip card, perspective hover, parallax layers)
  port well as template components: `transform: perspective() rotateX/Y()` driven by
  a tiny JS pointer handler that sets `--amc-tilt-x/y` custom properties. Disable the
  motion under `prefers-reduced-motion` and on touch devices.
- **WebGL scenes** need a **region plug-in** that loads three.js as a plug-in file,
  or from the app's static files, pinned to a version (no CDN at runtime; many APEX
  instances have no internet access). Render into a `<canvas>` inside the region,
  honor `prefers-reduced-motion` (render a still frame), size with a `ResizeObserver`,
  stop the animation loop when the region is hidden, and provide a text alternative.
  Set `minApexVersion` to the release you tested on.
- Keep 3D decorative. Data the user needs must also be available as text.

## 6. Finish like any library component

1. `node tools/new-component.mjs <slug> "<Name>"`
2. Fill `component.json`, templates, CSS (and JS / PL/SQL for items).
3. Add `examples/preview.json`; run `node tools/build.mjs && node tools/preview.mjs`
   and compare the preview (light, dark, RTL) with the original design.
4. Write an `examples/*.apx.md` usage example.
5. Hand over to the apexlang gates (`apexlang-integration.md`).
