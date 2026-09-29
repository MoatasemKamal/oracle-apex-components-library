---
name: apex-pwa
description: Audit and improve the design and behavior of an Oracle APEX application running as a Progressive Web App (PWA) - installability, manifest and icons, standalone/app-like look, safe areas and notches, mobile touch ergonomics, offline and flaky-network behavior, update flow, session expiry, service worker hooks and push notifications - on APEX 20.2 through 26.x with Universal Theme. Use when a user mentions PWA, "install the app", "make my APEX app feel native/mobile", home screen icon, splash screen, offline page, service worker, push notifications, or asks to improve an APEX app on phones and tablets. Works together with the apex-modern-components skill (styles, templates, motion) and Oracle's apexlang skill (app files and validation).
---

# Skill: APEX PWA (`amc-pwa`)

Goal: an APEX app that installs cleanly, opens like a native app, stays usable on a bad
network and tells the user honestly what is happening. APEX generates the manifest and
the service worker for you; this skill is about **configuring them well** and fixing the
**design and behavior gaps** around them.

Division of work:
- **This skill**: PWA settings, app-like design rules, behavior patterns, `pwa-kit/`.
- **apex-modern-components** (`skills/apex-modern-components/SKILL.md`): whole-app looks
  (Theme Styles), navigation templates (Command Rail has a phone bottom sheet), Motion Kit.
- **apexlang** (Oracle, `github.com/oracle/skills/tree/main/apex/apexlang`): editing and
  validating APEXlang app files (26.1+). Never bypass its gates.

## Start order

1. Find the APEX version and whether PWA is enabled
   (Shared Components > Progressive Web App, or `application.apx` in APEXlang). Features
   differ by release; check `references/pwa-settings.md` section 1 before promising one.
2. Run the audit in `references/pwa-audit.md` and write down every failing item with its
   fix. Do this before changing anything; report it to the user as a prioritized list
   (blockers, then high-impact design, then polish).
3. Fix in this order, loading only the reference you need:
   1. Installability and manifest: `references/pwa-settings.md`
   2. App-like design (standalone chrome, safe areas, touch, navigation, theme color):
      `references/pwa-design.md`
   3. Behavior (offline, network errors, updates, session expiry, install prompt, push):
      `references/pwa-behavior.md`
   4. Service worker customization, only when 1-3 are not enough:
      `references/service-worker-hooks.md`
4. For design and behavior helpers that APEX does not provide, install `pwa-kit/`
   (`pwa-kit/README.md`): standalone and offline CSS hooks, safe-area padding, an offline
   banner, an install button that only shows when installable, and a "new version" toast.
5. Verify (section "Verification") and report what was checked on a real device versus
   only in desktop DevTools.

## Rules

- Serve over HTTPS; PWA features do nothing on plain HTTP (except `localhost`).
- Never cache APEX pages, `wwv_flow.ajax`/`wwv_flow.accept` requests, or anything with a
  session id in the URL in a custom service worker. APEX pages are per-session and
  per-user; a cached page leaks data between users and breaks session state. Cache only
  versioned static files (`#APP_FILES#`, `#APEX_FILES#`, theme files).
- Colors in custom CSS come from Universal Theme variables (`--ut-*`) with a literal
  fallback, like every file in this repo (see
  `skills/apex-modern-components/references/native-look-contract.md`). The manifest
  `theme_color`/`background_color` are the only places literal colors are needed; take
  them from the app's current Theme Style.
- Every animation sits inside `@media (prefers-reduced-motion: no-preference)`.
- Use logical CSS properties so right-to-left apps (Arabic, Hebrew) mirror correctly.
- Do not promise offline data entry. APEX has no built-in offline sync; say so and
  offer the patterns in `references/pwa-behavior.md` section 2 instead.
- Do not claim the app was verified as installable unless it was actually installed or
  Lighthouse / DevTools > Application > Manifest ran against the live URL.

## Verification

- Chrome/Edge DevTools > Application: Manifest (no errors, icons load, "installable"),
  Service Workers (one active worker, scope = app path), Storage.
- Lighthouse > PWA / Best practices on a public page and a page after login.
- Real devices: Android Chrome install and iOS Safari "Add to Home Screen"; open from the
  icon, rotate, go offline (airplane mode), come back, let the session expire, reopen.
- Light, dark and RTL if the app uses them.
