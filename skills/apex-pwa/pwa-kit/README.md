# PWA Kit

Two app-wide files that add what APEX's generated PWA does not: installed-app CSS hooks,
an offline banner, offline submit guard, network-error messages, a smart install button,
and a "new version" toast. APEX 21.1+ with Universal Theme; works with every Theme Style,
dark mode and RTL. No page changes needed.

## Install

1. Shared Components > Static Application Files: upload `amc-pwa-kit.css` and
   `amc-pwa-kit.js` into a folder `amc-pwa-kit/`.
   **APEXlang (26.1+)** instead of steps 1-3: copy
   `dist/apexlang/shared-components/static-files/amc-pwa-kit/` into
   `applications/<app>/shared-components/static-files/`, append
   `dist/apexlang/static-files.snippet.apx` to `shared-components/static-files.apx`, merge the
   blocks of `dist/apexlang/application.snippet.apx` into `application.apx` (add to existing
   `fileUrls`, e.g. next to the Motion Kit), then run apexlang's gates.
2. Shared Components > User Interface Attributes > JavaScript > File URLs:
   `#APP_FILES#amc-pwa-kit/amc-pwa-kit.js`
3. Same page > Cascading Style Sheets > File URLs: `#APP_FILES#amc-pwa-kit/amc-pwa-kit.css`

## Use

| To | Do |
|---|---|
| Show an install button only when the app can be installed | Add the custom attribute `data-amc-pwa-install` to a button (Button > Advanced > Custom Attributes) or a Navigation Bar entry (List entry > Attributes). It is hidden when not installable and inside the installed app. |
| Show the iOS "Add to Home Screen" hint once | Dynamic Action on Page Load > Execute JavaScript: `amcPwa.showIosHint();` |
| Hide something in the installed app | CSS class `amc-pwa-browser-only` |
| Dim and disable something while offline | CSS class `amc-pwa-online-only` |
| Show something only while offline | CSS class `amc-pwa-offline-only` |
| Allow page submits while offline on one page | Page > Appearance > CSS Classes: `amc-pwa-allow-offline` |
| Bigger touch targets and no iOS zoom on focus | Page > Appearance > CSS Classes: `amc-pwa-touch` (phones and tablets only) |
| Floating primary action on phones | CSS class `amc-pwa-fab` on a Buttons Container region (static on wide screens) |
| Clear local drafts on logout | `amcPwa.clearLocal();` before logout; keys you store yourself should start with `amc-pwa.` |
| Show your own message in the banner | `amcPwa.showMessage("Saved offline", "success", 3000);` |
| Keep `dist/` in sync | After editing `amc-pwa-kit.{css,js}`, copy them again into `dist/apexlang/shared-components/static-files/amc-pwa-kit/`. |
| Translate texts | Before the kit: `window.amcPwaConfig = { offlineText: "...", onlineText: "...", networkErrorText: "...", updateText: "...", reloadText: "...", iosHintText: "..." };` or from Text Messages with `apex.lang.getMessage`. |

`<html>` gets `amc-is-standalone`, `amc-is-ios`, `amc-is-offline` and (after install in this
window) `amc-is-installed` for your own CSS.

For the Reload button to activate a new service worker immediately, add the small message
listener from `../references/service-worker-hooks.md` section 4.
