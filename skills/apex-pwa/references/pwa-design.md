# App-like design for an APEX PWA

An installed app has no browser chrome, so the page itself must supply what the browser
used to: a clear title, a back path, feedback for every tap, and correct edges.

## 1. Pick a coherent look first

- Choose one Theme Style (Vita, Redwood, or a style from
  `skills/apex-modern-components/theme-styles`) and set the manifest **Theme color** to
  its header color and **Background color** to its page background.
- If users can switch styles or use dark mode, add both theme colors so the status bar
  follows the scheme:
  ```html
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#101418" media="(prefers-color-scheme: dark)">
  ```
- `pwa-kit` adds `amc-is-standalone` on `<html>` so CSS can change only the installed
  experience.

## 2. Standalone chrome and safe areas

- Target the installed app with `@media (display-mode: standalone)` or
  `.amc-is-standalone` (the class also covers iOS, which does not always match the media
  query).
- Leave Universal Theme's viewport meta as it is. Adding `viewport-fit=cover` makes the page
  draw under the notch and home indicator, and then the fixed `.t-Header` needs
  `env(safe-area-inset-top)` handling that differs per UT version; only do it with a device
  to test on. `pwa-kit` already keeps its own fixed elements (banner, `amc-pwa-fab`) clear
  of the home indicator.
- Hide things that only make sense in a browser tab: "Open in new window" links,
  "Install App" once installed (`pwa-kit` does this), print-only buttons on phones.
- Standalone windows have no back button on iOS. Every page deeper than the home page needs
  a visible way back: breadcrumbs region, a back button in the page title bar (Dialog pages
  have Close), or the Command Rail / Navigation Menu.
- Disable text selection and callouts only on chrome (buttons, nav), never on content:
  `-webkit-user-select: none; -webkit-touch-callout: none;` on `.t-Header`, `.t-NavigationBar`.

## 3. Navigation that fits a phone

- Keep the top level to 3-5 destinations. Use **Navigation Menu > Top Navigation Tabs** or
  Command Rail (bottom sheet on phones) instead of a deep side tree.
- Put the primary action within thumb reach: at the bottom of the screen on list pages,
  for example a hot button in a region pinned with `pwa-kit`'s `amc-pwa-fab` class.
- Use Modal/Drawer dialogs for create/edit on phones; they feel like native sheets. Set
  the dialog template to Drawer and width to 100% below 640px.
- Avoid Interactive Reports as the main mobile surface; prefer Cards, Content Row or Media
  List regions and a search item. Use Interactive Grid only on tablets or desktop.

## 4. Touch ergonomics

- Minimum 44x44 px targets (WCAG 2.5.5 / Apple HIG); 8 px between adjacent targets.
  Universal Theme small buttons (`t-Button--small`) are below this: avoid them on phone
  pages or enlarge them with `pwa-kit`'s `amc-pwa-touch` page class.
- Form fields at least 16px font size, or iOS zooms the page on focus. Use the
  "Floating" or "Stretch/Above" label templates on phones, never labels on the left.
- Use the matching item types and subtypes (Number Field; Text Field subtype E-Mail,
  Phone Number, URL; Date Picker) so the right keyboard appears.
- `overscroll-behavior-y: contain` on scroll areas stops the whole page from bouncing or
  pull-to-refresh firing inside lists and dialogs.
- Remove the 300 ms tap delay (already gone with `width=device-width`) and the grey tap
  flash (`-webkit-tap-highlight-color: transparent`, then give a visible `:active` state).

## 5. Perceived speed and feedback

- First paint: keep the home page light (no heavy charts above the fold, lazy-load regions
  with "Lazy Loading" on and a skeleton or Motion Loader).
- Every tap that reaches the server needs feedback within 100 ms: Motion Kit `buttons`
  area (spinner on the submitting button) or the native `apex.util.showSpinner`.
- Use Page Transitions: dialogs as drawers, and Motion Kit `reports` for row entrances.
  Respect `prefers-reduced-motion`.
- Prefer partial page refresh (Dynamic Action > Refresh region) over full submits for
  filters and toggles; it keeps scroll position and feels native.

## 6. Accessibility and language

- Keep visible focus in standalone mode; external keyboards are common on tablets.
- RTL apps: the `pwa-kit` CSS uses logical properties; check the install dialog and the
  splash text language (manifest `lang`/`dir` via custom manifest if needed).
- Contrast AA at least; Theme Styles in this repo are already checked.
