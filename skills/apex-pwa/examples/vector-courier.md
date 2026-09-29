# Worked example: VECTOR Courier (App 220)

A real run of this skill with the `frontend-design` process
(`references/design-direction.md`). Inputs were the app's PWA kit (settings, icons,
service-worker policy); page files were not available yet, so the result is the app-wide
look plus the icon fixes. Page-level work follows once the APEXlang app is shared.

## 1. Brief

- **Subject and vernacular:** parcel pickup and delivery, trips, custody hand-offs, shelves;
  waybills, scans, status tags, speed.
- **Audience and context:** couriers outdoors on phones (sunlight, one hand, moving) and
  warehouse keepers indoors (shelf aisles). Installed PWA, portrait.
- **Primary job:** scan first: start a pickup or delivery in one tap, then see today's run.
- **Fixed:** brand violet `#5B4BE1`, page `#F4F4F7`, bird logo in sky blue and orange,
  APEX 26.1, APEXlang.

## 2. Token plan

| Token | Value | Role |
|---|---|---|
| Dispatch violet | `#5B4BE1` | primary, header, PWA theme color (white text 5.9:1) |
| Deep violet | `#3F31B8` / `#4B3BD1` | pressed state, current menu text / links and focus (7.4:1) |
| Ink | `#17152E` | all text (16:1 on the page) |
| Label white | `#FFFFFF` | regions, fields |
| Dock grey | `#F4F4F7` | page, PWA background color |
| Streak orange + sky | `#F28A1E`, `#36A3F2` | decoration only (header speed trail); never text or status |

- **Type:** system stack, with Atkinson Hyperlegible first when shipped as a static file
  (designed for legibility, suits sunlight and small phones); tabular figures in reports.
- **Layout:** header / content / phone tab bar (the app's own `.app-tabbar`); nothing moves.
- **Principles:** one bold element (the header), everything else flat and quiet; radius shrinks
  with hierarchy (regions 14, buttons 10, fields 8, badges pill); darker field edges for outdoors.

## 3. Review against generic defaults (what changed)

- Rejected the SaaS-card kit (every region rounded with the same soft grey shadow): regions
  are flat with a hairline edge and no shadow.
- Rejected one radius everywhere: radius now encodes hierarchy.
- First draft put slanted streaks across the header's end; the screenshot showed them under
  the navigation bar text. Moved them to a thin trail on the header's bottom edge, mirrored
  for RTL.
- Kept status colors semantic; orange stays out of the warning role to avoid a false alarm.

## 4. Result

- Style: `skills/apex-modern-components/theme-styles/vector` (build: WCAG AA passed).
- Icons: full-bleed white icon, bird enlarged to about 72% width and cleaned, safe for the
  Android circle mask; 180 px `apple-touch-icon` for iOS.

## 5. Apply to the app (APEX 26.1, APEXlang)

1. Copy `theme-styles/vector/dist/apexlang/shared-components/**` into
   `applications/<app>/shared-components/`.
2. Append `theme-styles/vector/dist/apexlang/static-files.snippet.apx` to
   `shared-components/static-files.apx`.
3. In `theme.apx` set `style.currentThemeStyle: @amc-vector` (or let users pick it).
4. Keep the PWA settings: theme color `#5B4BE1`, background `#F4F4F7`.
5. Replace `img/app-icon-192.png` and `img/app-icon-512.png` with the new icons; optionally add
   `img/apple-touch-icon.png` and point the `apple-touch-icon` link at it.
6. Run apexlang's gates (format, compiler-truth audit, runtime validate), then import.

Without APEXlang: import `theme-styles/vector/dist/legacy/amc_style_vector.sql`.

## 6. Next, with the page files

Home page as the scan-first "hero" (one large scan action, today's run below), Cards or Content
Row instead of Interactive Reports on phones, drawer dialogs, 44 px targets, and PWA Kit for
offline state (its update toast text changed to "close and reopen", since the app never calls
`skipWaiting()`).
