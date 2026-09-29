# PWA audit for an APEX app

Walk every line. Record Pass / Fail / N/A and the fix. Report blockers first.

## A. Installability (blockers)

| # | Check | How |
|---|---|---|
| A1 | Served over HTTPS with a valid certificate | URL bar, DevTools > Security |
| A2 | Enable PWA and Installable are on | Shared Components > Progressive Web App |
| A3 | Manifest has no errors and icons 192 and 512 load | DevTools > Application > Manifest |
| A4 | One active service worker whose scope covers the app path | DevTools > Application > Service Workers |
| A5 | Start URL opens without a session id or item values and survives an expired session | Open the start URL in a private window |
| A6 | ORDS / reverse proxy does not block `sw.js` or the manifest (content type, CSP `worker-src`, `manifest-src`) | Network tab, Console |

## B. Identity and look

| # | Check |
|---|---|
| B1 | App name and short name (<= 12 chars) read well under the icon |
| B2 | Icon is maskable-safe, sharp, and not transparent; `apple-touch-icon` present for iOS |
| B3 | Theme color equals the header color of the current Theme Style (light and dark) |
| B4 | Background color equals the page background (no flash between splash and first paint) |
| B5 | Display mode Standalone (or a stated reason for another) |
| B6 | Header and fixed footers clear the notch and home indicator on a notched phone |

## C. Mobile design

| # | Check |
|---|---|
| C1 | Every deep page has a visible back path (breadcrumb, back/close button, nav) |
| C2 | Top-level navigation has 3-5 destinations and works one-handed |
| C3 | Tap targets >= 44 px, inputs >= 16 px font, labels above or floating |
| C4 | No horizontal scroll at 360 px width; reports use Cards / Content Row on phones |
| C5 | Dialogs are drawers or full width on phones |
| C6 | Every server round trip shows feedback within 100 ms |
| C7 | Light, dark and RTL (if used) look right; focus is visible |
| C8 | Nothing browser-only is left in standalone (Install App after install, "open in new tab") |

## D. Behavior

| # | Check |
|---|---|
| D1 | Offline state is visible and submits are prevented or queued intentionally |
| D2 | Failed AJAX (DA, region refresh) tells the user |
| D3 | After a deploy, users see a "new version" prompt or get new files on next open |
| D4 | Reopening after session expiry lands on login, then on the requested page (Deep Linking) |
| D5 | Session timeout warning is on for pages with long forms |
| D6 | Install prompt is offered at a sensible moment; iOS gets a hint |
| D7 | Push (if used): permission asked from a gesture, no sensitive content, tested on Android and iOS 16.4+ |
| D8 | Logout clears local drafts / queues |
| D9 | Custom service worker hooks never cache pages or AJAX responses |

## E. Performance

| # | Check |
|---|---|
| E1 | Lighthouse Performance >= 80 on the home page on "Mobile" |
| E2 | Heavy regions lazy-load; images sized and compressed |
| E3 | Static files come from `#APP_FILES#` / `#WORKSPACE_FILES#` (versioned, cached) |
| E4 | Application is not in Debug mode in production |
