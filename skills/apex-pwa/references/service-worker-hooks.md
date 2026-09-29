# Service worker customization (21.2+)

APEX generates the service worker. Shared Components > Progressive Web App > Service
Worker Hooks lets you inject JavaScript at fixed points of that generated file
(initialization/configuration, install, activate, fetch, and on push-enabled releases the
push and notification-click events). The exact hook names differ slightly by release:
open the page and read the help of each hook before writing code into it.

Field report (APEX 26.1): Service Worker Hooks written into a SQL export through
`create_flow`'s `p_pwa_service_worker_hooks` JSON parameter were not imported (stored empty).
After importing an app, open its generated `sw.js` and check that your hook code is really in
it; if not, enter the hooks through the Builder or APEXlang and check again.

## 1. Rules

- Code runs in the service worker, not the page: no `apex.*`, no DOM, no jQuery.
- Never cache responses from `wwv_flow.*`, `/ords/r/...` page URLs, or anything with a
  `session=` / `p_session` parameter. Pages are per-user.
- Cache only versioned static files. Put your cache name behind a version constant and
  delete old caches in the activate hook.
- Keep hooks small and wrapped in `try/catch`; an exception can stop the worker from
  installing, which silently disables the PWA for every user.

## 2. Pre-cache extra static files

In the initialization hook:

```js
const AMC_CACHE = "amc-static-v3";   // bump on every deploy that changes these files
const AMC_PRECACHE = [
  // absolute, versioned URLs of files that the offline page or first paint needs
];
```

In the install hook:

```js
event.waitUntil(
  caches.open(AMC_CACHE).then((c) => c.addAll(AMC_PRECACHE)).catch(() => {})
);
```

In the activate hook:

```js
event.waitUntil(
  caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k.startsWith("amc-static-") && k !== AMC_CACHE).map((k) => caches.delete(k))
  ))
);
```

## 3. Branded offline page

APEX already shows an offline page for failed navigations; customize its text in the
PWA settings when the release offers it. For a fully branded page, pre-cache a static
HTML file (uploaded to Static Application Files, no APEX substitutions inside, inline
CSS using the theme colors) and in the fetch hook answer failed navigations with it:

```js
if (event.request.mode === "navigate") {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(AMC_OFFLINE_URL))
  );
  return;
}
```

Only do this if the release's generated fetch handler does not already respond first;
read the generated `sw.js` in DevTools > Sources to check the order.

## 4. Let the "new version" toast activate the update

`pwa-kit` posts `{ type: "SKIP_WAITING" }` to a waiting worker when the user taps Reload.
If the generated worker does not already activate new versions immediately, add to the
initialization hook:

```js
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
```

Without it the toast still reloads the page, and the new files arrive the next time every
window of the app is closed.

## 5. Testing

- DevTools > Application > Service Workers: "Update on reload" while developing, then
  turn it off and test the real update path (see `pwa-behavior.md` section 3).
- DevTools > Network > Offline, and a real device in airplane mode.
- After each deploy, confirm the new worker activates and old caches are gone.
