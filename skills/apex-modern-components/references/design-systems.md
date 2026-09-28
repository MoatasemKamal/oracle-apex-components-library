# Applying a Design System (DESIGN.md) to an APEX App

[`awesome-design-md`](https://github.com/VoltAgent/awesome-design-md) (MIT, VoltAgent)
collects DESIGN.md files: design-language analyses in Google Stitch format. In most
of them, the YAML front matter holds machine-readable tokens (`colors`, `typography`,
`rounded`, `spacing`, `components`).

APEX does not need a new component to take on such a look. Universal Theme and every
`amc` component read the same `--ut-*` CSS variables, so **setting those variables
restyles the whole app**: native regions, buttons, reports, forms, and this library.

## Convert

```bash
git clone --depth 1 https://github.com/VoltAgent/awesome-design-md.git /tmp/adm
node tools/design-md-to-ut.mjs /tmp/adm/design-md/<design>/DESIGN.md
```

Output in `styles/`:
- `<design>.css`: the Universal Theme style (a `:root { --ut-*: ... }` block).
- `<design>-dark.css`: generated as well when the design defines light and dark
  variants (`canvas-light` / `canvas-dark`, `-on-dark`, `canvas-night`, ...).
- `<design>.vars.json`: picked up by `node tools/preview.mjs` as an extra preview panel.

Of the 74 designs in the repository (September 2026), 64 have tokens and convert (7 with a dark
variant). The other 10 are prose only. For those, write the variables by hand from the
document's color section.

## What is mapped

| Universal Theme variable | DESIGN.md token (first match wins) |
|---|---|
| `--ut-body-background-color` | `canvas`, `surface-canvas`, `background`, `surface` |
| `--ut-component-background-color` | `components.card.backgroundColor`, else `surface-card`, `surface-1`, `surface`, ... |
| `--ut-component-text-default-color`, `--ut-body-text-color` | `ink`, `body-strong`, `body` (checked for contrast against the background) |
| `--ut-component-text-muted-color` | `muted`, `mute`, `ink-muted`, `ink-subtle`, `body`, `slate`, ... |
| `--ut-component-border-color` | `hairline`, `hairline-soft`, `border`, `divider` |
| `--ut-component-border-radius` | `components.card.rounded`, else `rounded.md` |
| `--ut-palette-primary` (+ `-contrast`) | `primary`, `on-primary` |
| `--ut-palette-success / warning / danger / info` | `success`/`semantic-success`/`trading-up`, `warning`, `error`/`semantic-error`/`trading-down`, `info`/`link` |
| `--ut-link-text-color` | `link`, `primary` |

Light/dark variants are resolved by suffix (`-light`, `-on-light` vs `-dark`,
`-on-dark`, `-night`). Contrast colors missing from the design are computed from
luminance.

## Apply to an app (APEX 23.1+)

1. Start from **Vita** (light result) or **Vita - Dark** (dark result).
2. Theme Roller > *Custom CSS*: paste the generated file > **Save As** a new style.
   Alternatively, upload it as a Static Application File and add
   `#APP_FILES#<design>.css` to the style's *File URLs*.
3. Finish header and navigation colors in Theme Roller. They are style-specific and
   not in the generated file.
4. Optional: the file includes the design's font stack as a commented-out rule.
   Most brand fonts are proprietary; ship only fonts you are licensed to use.

For an APEXlang app (26.1+), put the CSS in `shared-components/static-files/` and
reference it from the theme style's file URLs, then run apexlang's gates.

## Rules

- These are **inspired** analyses of third-party brands. Use them for look and feel;
  do not put the brand's name, logo or trademarks in your application.
- Keep the MIT attribution header that the generator writes.
- Check contrast after applying: `ink` on `surface-card`, and `on-primary` on
  `primary` (WCAG AA is 4.5:1 for body text).
