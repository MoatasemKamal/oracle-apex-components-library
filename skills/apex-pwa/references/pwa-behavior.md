# Behavior of an APEX PWA

## 1. Install experience

- Turn on Installable and add the "Install App" entry to the Navigation Bar List, or place
  your own button and call the install API (`pwa-kit` handles both: any element with
  `data-amc-pwa-install` stays hidden until the browser says the app is installable, and
  disappears once it is installed).
- Do not show an install prompt on first visit. Offer it after a success moment (first
  record saved, second visit) or on a dedicated "Get the app" page.
- iOS Safari never fires an install prompt. Show a short hint once on iOS in the browser
  (not standalone): "Tap Share, then Add to Home Screen". `pwa-kit` exposes
  `amcPwa.isIos` and `amcPwa.isStandalone` for a client-side condition, and
  `amcPwa.showIosHint()` shows that hint once per device.

## 2. Offline and flaky networks

What APEX gives you: the generated service worker caches static files and shows an
offline page when a navigation fails. APEX pages themselves need the database, so the app
is **online-first**. Make that honest and graceful:

- Show connectivity state: `pwa-kit` adds `amc-is-offline` on `<html>` and a polite live
  banner ("You are offline. Changes can't be saved until you reconnect.").
- Guard submits: while offline, `pwa-kit` cancels page submits (through the
  `apexbeforepagesubmit` event) and points the user at the banner instead of letting the
  request fail into the browser's error page. Opt a page out with the page CSS class
  `amc-pwa-allow-offline`.
- AJAX failures: add a global handler so a failed Dynamic Action or region refresh tells
  the user, rather than a silent spinner. `pwa-kit` shows a page error through
  `apex.message.showErrors` for network failures only (status 0, not aborted); APEX's own
  server errors are left to APEX.
- Real offline data entry needs your own design: capture in IndexedDB (or
  `localStorage` for tiny forms), queue, and send through an `apex.server.process` call
  when `online` fires, with conflict rules decided by the business. Keep it to one or two
  forms (inspection, check-in, time entry). Never queue data that must be validated by
  the server before the user can continue.
- A branded offline page: see `service-worker-hooks.md` section 3.

## 3. Updates

- After you deploy, the old service worker keeps serving cached static files until the new
  one activates. Users of an installed app may run old JS/CSS for a day.
- Always reference static files with `#APP_FILES#` / `#WORKSPACE_FILES#` (APEX adds a
  version to those URLs) and bump file versions; never hard-code `r/files/...` paths.
- `pwa-kit` watches for a new service worker and shows a toast "A new version is
  available" with a Reload button. Reload is user-triggered so unsaved form data is
  never lost.

## 4. Sessions and authentication

- An installed app is reopened hours later, when the APEX session has expired. Make that
  smooth:
  - Home page and start URL must not need item values or a session id in the URL.
  - Enable Deep Linking so a link or shortcut returns to the requested page after login.
  - Use the application's Session Timeout warning (Security > Session Management) so the
    user can extend a session before losing a form.
  - Consider persistent authentication ("Remember me", instance setting in recent releases)
    for low-risk apps; don't enable it for apps with sensitive data on shared devices.
- Social / SSO sign-in that opens another origin may leave the standalone window on iOS.
  Test the full login flow from the home-screen icon.
- Logout must clear anything `pwa-kit` or your own code stored locally (drafts, queued
  records): call `amcPwa.clearLocal()` in a Before-Logout Dynamic Action or on the
  logout page.

## 5. Push notifications (23.1+)

- Enable push in Shared Components > Progressive Web App. APEX creates the VAPID keys and
  a subscription list per user; the Create Page wizard / "Push Notifications" feature adds
  a settings page where users subscribe.
- Send from PL/SQL (automation, trigger, process):
  ```sql
  apex_pwa.send_push_notification(
      p_user_name  => :APP_USER_TO_NOTIFY,
      p_title      => 'Request approved',
      p_body       => 'Request 1042 was approved by ' || :APP_USER,
      p_target_url => apex_page.get_url(p_page => 20, p_items => 'P20_ID', p_values => 1042));
  ```
  Check the exact parameter list in the `APEX_PWA` package docs of the installed release;
  pushes are queued and delivered by a background job (`apex_pwa.push_queue` flushes it).
- Ask for permission only from a user gesture on the settings page, never on page load.
- Keep payloads free of sensitive data: notifications show on the lock screen.
- iOS supports web push only for apps added to the Home Screen (iOS 16.4+).

## 6. Small native touches

- Share: `navigator.share({ title, url })` behind a feature check, fallback to copy link.
- Vibration feedback on critical confirmations (Android): `navigator.vibrate?.(20)`.
- Keep the screen on during a scan or a timed task: Screen Wake Lock API with a check.
- Barcode / camera: File Browse item with `accept="image/*" capture="environment"`.
