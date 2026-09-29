# PWA settings in APEX

## 1. What each release gives you

Release numbers are the first release where the feature is generally known to exist.
Confirm against the "New Features" page of the user's exact release before relying on
it, and open Shared Components > Progressive Web App to see what is really there.

| Feature | Since | Where |
|---|---|---|
| Enable PWA (manifest + generated service worker, static-file caching) | 20.2 | Shared Components > Progressive Web App |
| Display mode (Fullscreen, Standalone, Minimal UI, Browser) | 20.2 | same page |
| Installable app, "Install App" entry for the Navigation Bar, `apex.pwa` install API | 21.1 | same page, Navigation Bar List |
| Screen orientation, custom manifest JSON, Service Worker Hooks | 21.2 | same page |
| App icon (one upload, APEX generates the sizes) | 21.x-22.x | Shared Components > User Interface / App Icon |
| Push notifications (`APEX_PWA` package, subscription UI, `apex.pwa` push API) | 23.1 | same page, Automations, PL/SQL |
| Description and screenshots for the richer install dialog | 23.x+ | same page (check) |

APEXlang (26.1+): the same settings are properties of the application; let apexlang's
`query-valid-props` tell you their exact names before writing them.

## 2. Settings checklist

| Setting | Recommended | Why |
|---|---|---|
| Enable Progressive Web App | On | Without it nothing else applies. |
| Installable | On | Gives the browser install prompt and the Navigation Bar "Install App" entry. |
| Display | **Standalone** | App-like window with the OS status bar. Fullscreen hides the status bar and clock (only for kiosks and games). Minimal UI is poorly supported on iOS. |
| Screen Orientation | Any | Lock to Portrait only for single-purpose field apps (scanners, check-in). |
| App name / short name | short name <= 12 characters | Home-screen labels are truncated beyond that. |
| Description | One plain sentence | Shown in the richer install dialog on Android and desktop. |
| App icon | Square PNG, 512x512 minimum, logo inside the central 80% | Android crops icons into circles and squircles (maskable safe zone). |
| Theme color | The header color of the current Theme Style | Colors the status bar and the title bar of the installed window. A mismatch is the most visible "not native" defect. |
| Background color | The page background (`--ut-body-background-color`) of the style | Used for the splash screen on Android; must match the first painted frame to avoid a flash. |
| Friendly URLs | On | Short, stable URLs in the manifest `start_url` and in shared links. |
| Home page / start URL | A page that works right after login and does not need item values in the URL | The installed icon always opens `start_url`. |

## 3. Icons

- Start from an SVG or a 1024x1024 PNG. Keep the logo inside a centered circle of 80% of
  the width (maskable safe zone); fill the rest with the brand background, not transparency.
- Android: APEX-generated 192 and 512 sizes cover install and splash.
- iOS ignores manifest icons for older releases and uses `apple-touch-icon` (180x180).
  If the home-screen icon on iOS is a screenshot of the page, add to Page Template >
  Header or the application's HTML Head:
  `<link rel="apple-touch-icon" href="#APP_FILES#icons/apple-touch-icon.png">`
- Check the icon on a dark and a light wallpaper.

## 4. Custom manifest (21.2+)

Use only for keys APEX does not expose. Useful keys:

```json
{
  "id": "/ords/r/<workspace>/<app-alias>/",
  "categories": ["business", "productivity"],
  "shortcuts": [
    { "name": "New request", "url": "home?request=NEW", "icons": [{ "src": "...", "sizes": "96x96" }] }
  ],
  "display_override": ["window-controls-overlay", "standalone"]
}
```

- `id` keeps the installed app identity stable if the start page changes later.
- `shortcuts` give a long-press menu on the home-screen icon (Android, desktop). Point
  them at pages that do not need a session id; APEX redirects to login when required.
- Do not override `start_url`, `scope`, or `icons` unless you know why: APEX computes them
  from the app path, and a wrong scope disables the service worker.
