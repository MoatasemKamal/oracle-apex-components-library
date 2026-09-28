# Native Look & Theme Contract

A component in this library must be indistinguishable from a native Universal Theme
component in every theme style: Vita, Vita Dark, Vita Slate, Redwood Light, and any
Theme Roller variation or custom style. `tools/build.mjs` enforces the rules marked
**(enforced)**.

## 1. Colors come only from theme variables (enforced)

Universal Theme exposes its palette as CSS custom properties. Theme Roller and the
built-in styles only change these variables, so a component that reads them follows
every style change automatically, including dark mode.

Declare a component-scoped token layer on the root class, mapping each token to a
`--ut-*` variable **with a literal fallback** (the fallback is only for pages without
Universal Theme):

```css
.amc-Foo {
  --amc-foo-bg: var(--ut-component-background-color, #fff);
  --amc-foo-fg: var(--ut-component-text-default-color, #262626);
  --amc-foo-muted: var(--ut-component-text-muted-color, #6b6b6b);
  --amc-foo-line: var(--ut-component-border-color, rgba(0, 0, 0, .1));
  --amc-foo-accent: var(--ut-palette-primary, #056ac8);
}
```

Then use only `var(--amc-foo-*)` in rules. A literal color outside a `var()` fallback
fails the build.

| Purpose | Variable |
|---|---|
| Surface / card background | `--ut-component-background-color` |
| Body text | `--ut-component-text-default-color` |
| Secondary text | `--ut-component-text-muted-color` |
| Borders and dividers | `--ut-component-border-color` |
| Corner radius | `--ut-component-border-radius` |
| Elevation | `--ut-component-box-shadow` |
| Page background | `--ut-body-background-color` |
| Brand / hot actions | `--ut-palette-primary` (+ `-contrast`) |
| Semantic states | `--ut-palette-success`, `-warning`, `-danger`, `-info` (+ `-contrast`) |

Tints: `color-mix(in srgb, var(--amc-foo-accent) 12%, transparent)` produces a pale
tint of any palette color that stays correct in dark styles.

## 2. Reuse Universal Theme building blocks in markup

When a native element already exists, use its classes in the **template** instead of
restyling it: `t-Button t-Button--hot` for buttons, `fa fa-*` (Font APEX) for icons,
`t-Region` templates around the component (chosen in the region's Appearance).
The component's own CSS never targets `t-*` classes.

## 3. Own CSS is namespaced (enforced)

Every selector in a component stylesheet uses the `amc-` prefix, in SUIT style:
`amc-Component`, `amc-Component-part`, `amc-Component--modifier`, state `is-*`.
This prevents collisions with Universal Theme and with other plug-ins.

## 4. Layout rules

- **RTL:** use logical properties (`margin-inline-start`, `padding-block`,
  `inset-inline-start`, `border-block-start`). Physical `left/right` produce warnings.
- **Bidi:** numeric text that mixes signs, digits and units (`+12.4%`, `-9`) gets
  `unicode-bidi: plaintext`; general text gets `unicode-bidi: isolate`.
- **Responsive:** grids use `repeat(auto-fill, minmax(min(<min>, 100%), 1fr))`. When a
  component must adapt to its container rather than the viewport, put
  `container-type: inline-size` on the row element and use `@container`.
- **Typography:** inherit the theme font; do not set `font-family`. Sizes in `rem`.

## 5. Accessibility

- Semantic HTML first: `<progress>`, `<dl>`, `<ol>` with `aria-current="step"`,
  `<fieldset>` + radios for choices.
- Decorative icons get `aria-hidden="true"`; state conveyed by color also appears as
  text (visually hidden with `.amc-u-srOnly` if needed).
- Keyboard: every interactive part is a real focusable control with a visible
  `:focus-visible` outline.
- Motion: any `transition`/`animation` needs a `prefers-reduced-motion` override
  **(enforced)**.
- High contrast: add a `@media (forced-colors: active)` rule when borders or fills
  carry meaning.

## 6. Security (enforced)

- Escape mode `raw` is forbidden. Use `html` for text and `htmlAttribute` for values
  placed inside attributes.
- Never substitute a value into a `style` attribute (CSS injection). Map values to
  classes with `{case X/}{when a/}...{endcase/}`, which also whitelists them.
- No `<script>` in templates; JavaScript ships as a plug-in file.
- URLs from settings must be developer-controlled; say so in the setting's help text.

## 7. Verify visually

`node tools/preview.mjs` renders every component in simulated light, dark and RTL
Redwood-like styles (`preview/index.html`). The final check is a real APEX page:
switch styles with Theme Roller and toggle dark mode.
