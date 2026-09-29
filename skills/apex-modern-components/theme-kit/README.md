# Theme Kit

Brand colors and corner radius **from data**: one application, many tenants (or users), each
with its own primary color, header color and radius, read from a table at runtime. The kit
takes a JSON object of tokens produced by SQL, checks every key and value, checks contrast,
and sets the accepted tokens on `:root`. Universal Theme, every component, template and kit
in this library read the same `--ut-*` variables, so the whole app follows.

Works on APEX 23.1 and later with Universal Theme. Plug-in free: two Static Application Files.

## When to use it, and when not

| Need | Use |
|---|---|
| A fixed new look for the whole app | A theme style (`theme-styles/`, `references/theme-styles.md`) |
| Users pick one of several looks | Theme styles with *End users can pick* (Customization), or `apex_theme.set_user_style` |
| Colors differ per tenant, customer or user and live in a table | **Theme Kit** (on top of any theme style) |

## Install

### APEX 26.1+ (APEXlang)

1. `node tools/build-kit.mjs` (from the skill root) if `dist/` is missing or stale.
2. Copy `dist/apexlang/shared-components/static-files/amc-theme-kit/` into
   `applications/<app>/shared-components/static-files/`.
3. Append `dist/apexlang/static-files.snippet.apx` to `shared-components/static-files.apx`.
4. Merge the `javaScript` and `css` blocks from `dist/apexlang/application.snippet.apx` into
   `application.apx` (next to the Motion Kit's and Message Kit's `fileUrls`, if used).
5. Run the apexlang skill's gates.

### APEX 23.1 to 25.x (Builder)

1. Import `dist/legacy/install_amc_theme_kit.sql`, or upload the two files as Static
   Application Files into a folder `amc-theme-kit/`.
2. Shared Components > User Interface Attributes > JavaScript > File URLs:
   `#APP_FILES#amc-theme-kit/amc-theme-kit.js`
3. Cascading Style Sheets > File URLs: `#APP_FILES#amc-theme-kit/amc-theme-kit.css`

## Produce the tokens with SQL

Store brand settings per tenant (the table and column names below are **placeholders**):

```sql
create table tenant_brand (
  tenant_id          number primary key,
  primary_color      varchar2(32),   -- '#0f766e'
  primary_contrast   varchar2(32),   -- '#ffffff' or null (the kit picks black or white)
  header_color       varchar2(32),
  link_color         varchar2(32),
  corner_radius      varchar2(16)    -- '12px'
);
```

Create an application item or Page 0 item `P0_THEME_TOKENS` (Session State Protection:
*Restricted - may not be set from browser*) and compute it once per session, for example in
an Application Process *On New Session* or a Page 0 computation *Before Header*.

**JSON_OBJECT** (Oracle Database 12.2+):

```sql
select json_object(
         '--ut-palette-primary'           value b.primary_color,
         '--ut-palette-primary-contrast'  value b.primary_contrast,
         '--ut-header-background-color'   value b.header_color,
         '--ut-link-text-color'           value b.link_color,
         '--ut-component-border-radius'   value b.corner_radius
         absent on null
         returning varchar2(4000))
  into :P0_THEME_TOKENS
  from tenant_brand b
 where b.tenant_id = :G_TENANT_ID;
```

**APEX_JSON** (any database version APEX supports):

```sql
declare
  l_brand tenant_brand%rowtype;
begin
  select * into l_brand from tenant_brand where tenant_id = :G_TENANT_ID;
  apex_json.initialize_clob_output;
  apex_json.open_object;
  apex_json.write('--ut-palette-primary',          l_brand.primary_color);
  apex_json.write('--ut-palette-primary-contrast', l_brand.primary_contrast);
  apex_json.write('--ut-header-background-color',  l_brand.header_color);
  apex_json.write('--ut-component-border-radius',  l_brand.corner_radius);
  apex_json.close_object;
  :P0_THEME_TOKENS := apex_json.get_clob_output;
  apex_json.free_output;
exception
  when no_data_found then :P0_THEME_TOKENS := null;
end;
```

Per user rather than per tenant: select from your own user-preferences table
`where user_name = :APP_USER`. For dark and light variants, store one row per style and select by the user's
current style (`apex_theme.get_user_style(:APP_ID, :APP_USER, <theme number>)`).

## Hand the JSON to the page

Pick one; the kit reads them in this order on page load.

1. **Body attribute** (every page that uses the page template, including the login page if
   you want): Page > HTML Header > **Page HTML Body Attribute**, or once in the page
   template's body attributes:

   ```
   data-amc-theme-tokens="&P0_THEME_TOKENS!ATTR."
   ```

   `!ATTR` escapes the JSON for an HTML attribute; the browser decodes it again.

2. **Page 0 region** (Global Page, so every page gets it): a Static Content region with
   template *Blank with Attributes* and this source:

   ```html
   <div id="amc-theme-tokens" hidden>&P0_THEME_TOKENS!HTML.</div>
   ```

   The kit reads the element's `textContent` (entities are decoded, nothing is parsed as
   HTML). An `<input>` or `<textarea>` with that id is read by its value instead.

3. **From a Dynamic Action** (for example a live preview while an administrator edits the
   brand):

   ```javascript
   var report = amcThemeKit.apply({
     "--ut-palette-primary": apex.item("P5_PRIMARY_COLOR").getValue(),
     "--ut-component-border-radius": apex.item("P5_RADIUS").getValue() + "px"
   });
   // report.applied, report.adjusted, report.rejected, report.skipped
   ```

## What is accepted

| Keys | Value |
|---|---|
| `--ut-palette-primary`, `-success`, `-warning`, `-danger`, `-info` and each `-contrast` | color |
| `--ut-body-background-color`, `--ut-body-text-color` | color |
| `--ut-component-background-color`, `--ut-component-text-default-color`, `--ut-component-text-muted-color`, `--ut-component-border-color` | color |
| `--ut-link-text-color`, `--ut-focus-outline-color` | color |
| `--ut-header-background-color`, `--ut-header-text-color`, `--ut-nav-background-color`, `--ut-nav-text-color` | color |
| `--ut-field-background-color`, `--ut-field-border-color`, `--ut-field-text-color`, `--ut-field-label-text-color` | color |
| `--ut-component-border-radius` | length |
| `--amc-theme-<name>` (your own tokens for app CSS, lower case) | color; length when the name ends in `-radius` |

- **Color**: anything the browser accepts for `color` (`CSS.supports("color", v)`): hex,
  `rgb()`, `hsl()`, `oklch()`, named colors.
- **Length**: `0` or a number with `px`, `rem`, `em` or `%` (for example `12px`, `.5rem`).
- Rejected: any other key, `var()`, `url()`, `attr()`, `env()`, `expression`, `; { } < > \`,
  CSS-wide keywords (`inherit`, `initial`, `unset`, `revert`, `currentcolor`), values over
  64 characters, more than 64 tokens, JSON over 16 KB. Null or empty values are ignored,
  so `absent on null` and nulls behave the same.

## Contrast

After merging the new tokens with the values already in effect (from the theme style):

| Check | Minimum | When it fails (default `contrast: "auto"`) |
|---|---|---|
| `--ut-palette-<name>-contrast` on `--ut-palette-<name>` | 4.5:1 | The kit sets the contrast color to black or white, whichever is stronger, and warns. So a tenant can send only a primary color. |
| Body text, region text, muted text, links, header, navigation, field text on their backgrounds | 4.5:1 | The new tokens of that pair are **not applied** (listed in `report.skipped`, warned in the console); every other token is. |
| Primary on the region background | 3:1 | Warning only. |

`amcThemeKit.apply(tokens, { contrast: "warn" })` applies everything and only warns;
`contrast: "off"` skips the checks; `minText: 7` asks for AAA text contrast.

## Security

- **Whitelist only**: a key that is not listed above is dropped; the kit cannot set
  `font-family`, `content`, `background-image` or any property, only these variables.
- **Values are validated** (color or length rules above) and set with
  `style.setProperty` on `<html>`; nothing is concatenated into CSS text or HTML.
- **Never innerHTML**: the JSON is read with `getAttribute`, `textContent` or `value` and
  parsed with `JSON.parse`.
- Keep the item **server-computed**: Session State Protection *Restricted* (or an
  Application Item), so users cannot post their own tokens. Values an administrator types
  into the brand table are still validated in the browser, but also validate them on save
  (for example `regexp_like(primary_color, '^#[0-9a-fA-F]{6}$')`).
- Escape where you output: `!ATTR` in attributes, `!HTML` in HTML text. Do not use `!RAW`.

## API

| Call | Does |
|---|---|
| `amcThemeKit.apply(tokens, options)` | Validates, checks contrast, sets tokens; returns `{ applied, adjusted, rejected, skipped }` and fires `amc-theme-kit-applied` on `document` |
| `amcThemeKit.reset()` | Removes every token the kit set (the theme style's values return) |
| `amcThemeKit.read()` | The token object found in the page, or `null` |
| `amcThemeKit.contrast(fg, bg)` | Contrast ratio of two CSS colors |
| `amcThemeKit.allowed()` | The accepted keys |

A runtime change made after load (a second `apply`) cross-fades colors for 0.3 s, only when
the user has not asked for reduced motion. The first apply on page load never animates.

## Limits

- Universal Theme derives some shades (hover, active, gradients) from the palette when Theme
  Roller compiles a style; runtime tokens change the base variables only, so a few derived
  shades may keep the style's color. Pick a base theme style close to your tenants' brands.
- Tokens apply after the page's HTML is parsed; on slow devices the default colors can show
  for a moment. Keep the JSON small.
- Verified offline in a browser (`demo.html` and a Playwright script); confirm on a real APEX
  page with your page template, including the login page.
