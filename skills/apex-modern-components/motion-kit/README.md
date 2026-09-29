# Motion Kit

App-wide motion for the **native** Universal Theme elements every APEX page already has:
buttons, forms, reports, icons, breadcrumbs, the navigation bar, the menu bar and all APEX
menus. You don't change any pages; load two files once and existing pages move.

Works on APEX 23.1 and later with Universal Theme (every theme style, Theme Roller and dark mode).
Users who ask for reduced motion get no movement at all.

## What it does

| Area | Motion |
|---|---|
| `buttons` | Press feedback; ripple from the pointer; shine sweep on hot buttons; icon nudge toward the reading direction; spinner on the button that submitted the page (cleared when returning with Back) |
| `forms` | Focus glow; floating labels glide; one shake when APEX marks a field invalid; error text slides in; checkbox, radio and switch pop |
| `reports` | Rows arrive in sequence on load and after every refresh (Classic Report, Interactive Report, Cards, UT Cards, Content Row, Media List, Timeline; first 30 rows); region dims while refreshing; cards lift on hover |
| `icons` | Utility classes for any icon field: `amc-icon-wiggle`, `amc-icon-bounce`, `amc-icon-beat`, `amc-icon-spin`, `amc-icon-tada`, `amc-icon-float`, and hover-only versions `amc-icon-hover-wiggle`, `-bounce`, `-spin`, `-tada` (they play when the icon or its button, link, card or list item is hovered) |
| `breadcrumbs` | Items slide in one after another (mirrored in RTL); link underline grows on hover |
| `navbar` | Icons lift on hover; the notification badge bumps whenever its number changes |
| `menubar` | A highlight glides under the hovered or focused top-menu item and returns to the current page; side-navigation icons nudge on hover |
| `menus` | Every APEX menu (navigation bar, menu bar submenus, button menus, report action menus) opens with a short fade and scale |
| `alerts` | Page success and error messages drop in |
| `regions` | Optional, off by default: regions fade up one after another on page load |

## Install

### APEX 26.1+ (APEXlang)

1. Copy `dist/apexlang/shared-components/static-files/amc-motion-kit/` into
   `applications/<app>/shared-components/static-files/`.
2. Append `dist/apexlang/static-files.snippet.apx` to `shared-components/static-files.apx`.
3. Add the `javaScript` and `css` blocks from `dist/apexlang/application.snippet.apx` to
   `application.apx` (merge with existing `fileUrls` if the app already has some).
4. Run the apexlang skill's gates (format, compiler-truth audit, runtime validate).

### APEX 23.1 to 25.x (or any version through the Builder)

1. Import `dist/legacy/install_amc_motion_kit.sql` (Shared Components > Export/Import > Import),
   or upload `amc-motion-kit.css` and `amc-motion-kit.js` as Static Application Files into a
   folder `amc-motion-kit/`.
2. Shared Components > User Interface Attributes > JavaScript > File URLs:
   `#APP_FILES#amc-motion-kit/amc-motion-kit.js`
3. Same page > Cascading Style Sheets > File URLs:
   `#APP_FILES#amc-motion-kit/amc-motion-kit.css`

## Configure

All areas except `regions` are on by default.

| To | Do |
|---|---|
| Choose the areas for the whole app | Before the kit loads (for example in a JavaScript file listed first): `window.amcMotionKitConfig = { areas: "buttons forms reports icons" };` Use `"all"` to include `regions`. |
| Choose areas on one page | Page > HTML Header > Page HTML Body Attribute: `data-amc-motion="buttons reports"` |
| Turn one area off on one page | Page > Appearance > CSS Classes: `amc-mk-no-reports` (any area name) |
| Exclude one element | Add `amc-mk-off` to its CSS Classes (region, button or item) |
| Replay the row entrance yourself | `amcMotionKit.enterRows(document.getElementById("my_region"))` |
| Change the accent color | Override `--amc-mk-accent` in your CSS (defaults to the theme's primary color) |

## Notes

- The kit targets Universal Theme class names (`t-Button`, `t-Form-fieldContainer`,
  `t-Report-report`, `a-IRR-table`, `a-CardView-item`, `t-Breadcrumb-item`,
  `t-NavigationBar-item`, `a-MenuBar-item`, `a-Menu`, `t-Alert`). They are stable from 23.1
  to 26.x, but test after APEX upgrades; the kit degrades to plain native behavior if a class
  changes. It never changes layout, colors or content, only adds motion.
- Interactive Grid rows are not animated on purpose (virtual scrolling reuses rows).
- `demo.html` in this folder is an offline demo with a small Universal Theme stand-in; open it
  in a browser to try every area without APEX.
