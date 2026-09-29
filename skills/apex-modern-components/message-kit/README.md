# Message Kit

App-wide, plug-in free restyle of the messages every APEX page already shows: the page
success message, page and field error messages, and the `apex.message.alert` / `confirm`
dialogs. Load two files once; login pages and every other page get modern, animated,
accessible toasts and dialogs. APEX keeps doing its job: the kit only watches and restyles.

Works on APEX 23.1 and later with Universal Theme (every theme style, Theme Roller, Vita Dark).
Users who ask for reduced motion get no movement at all; everything stays readable.

## What it restyles

| Native APEX message | Becomes |
|---|---|
| Page success message (`#APEX_SUCCESS_MESSAGE`, `#t_Alert_Success`, `.t-Alert--success`), after a page submit or `apex.message.showPageSuccess` | A toast that slides in from the top end: icon, text, close button, progress bar. It closes itself after `timeout` seconds; the timer pauses while the pointer is over it or focus is inside it. Swipe it away on touch screens. Several toasts stack. |
| Page errors (`#APEX_ERROR_MESSAGE`, `#t_Alert_Notification`, `.t-Alert--danger`), after a failed validation or `apex.message.showErrors` | An error panel that stays until closed, with a subtle shake. Each error that belongs to an item is a link that focuses that item. Inline field errors stay where APEX puts them. |
| `apex.message.alert` and `apex.message.confirm` dialogs | A modern dialog: scale-in, clear primary and secondary buttons, a blurred backdrop. Destructive confirms get danger styling (see below). Modal and drawer pages are never touched. |
| Your own Dynamic Actions | `amcMessageKit.toast({...})` shows the same toasts (see API). |

How it stays safe:

- A `MutationObserver` watches the message containers. When a message appears, the kit
  builds a toast from its text (textContent only) and hides the original with the class
  `amc-msg-is-mirrored`. When APEX hides or removes the original (`clearErrors`,
  `hidePageSuccess`, Universal Theme's own auto-dismiss), the toast closes too.
- Closing a toast closes the original the APEX way: `apex.message.hidePageSuccess()` for
  success, the Universal Theme close button (`.t-Button--closeAlert`) for errors. It never
  calls `clearErrors`, so inline field errors stay until the user fixes them.
- `apex.message.showErrors`, `clearErrors`, `showPageSuccess` and `hidePageSuccess` are not
  replaced. `alert` and `confirm` are wrapped only to read `options.style`; the original is
  always called with the same arguments and its return value is passed back. Focus handling
  in dialogs stays APEX's.
- Without the JavaScript file nothing changes: the CSS only applies to elements the script
  marks.

## Install

### APEX 26.1+ (APEXlang)

1. Run `node tools/build-kit.mjs` (from the skill root) if `dist/` is missing or stale.
2. Copy `dist/apexlang/shared-components/static-files/amc-message-kit/` into
   `applications/<app>/shared-components/static-files/`.
3. Append `dist/apexlang/static-files.snippet.apx` to `shared-components/static-files.apx`.
4. Add the `javaScript` and `css` blocks from `dist/apexlang/application.snippet.apx` to
   `application.apx` (merge with existing `fileUrls`, for example the Motion Kit's).
5. Run the apexlang skill's gates (format, compiler-truth audit, runtime validate).

### APEX 23.1 to 25.x (or any version through the Builder)

1. Import `dist/legacy/install_amc_message_kit.sql` (Shared Components > Export/Import >
   Import, file type "Application, Page or Component Export"), or upload
   `amc-message-kit.css` and `amc-message-kit.js` as Static Application Files into a folder
   `amc-message-kit/`.
2. Shared Components > User Interface Attributes > JavaScript > File URLs:
   `#APP_FILES#amc-message-kit/amc-message-kit.js`
3. Same page > Cascading Style Sheets > File URLs:
   `#APP_FILES#amc-message-kit/amc-message-kit.css`

Because these are application-level File URLs, the login page and modal pages load the kit
too. Nothing else is needed on the authentication page.

## Configure

Later rows win: an app-wide setting, then the page attribute, then page CSS classes.

| Setting | Values | Default |
|---|---|---|
| `position` | `top-end`, `top-center`, `bottom-end`, `bottom-center` (end/start follow the page direction, so RTL mirrors) | `top-end` |
| `look` | `soft`, `glass`, `solid`, `brutal`, `minimal` | `soft` |
| `timeout` | Seconds before success, info and warning toasts close; `0` keeps them open. Errors never close by themselves. | `5` |
| `max` | Toasts on screen at once; the oldest non-error toast makes room | `4` |
| `dangerWords` | Words (regular expression alternatives) that make a confirm dialog destructive; `false` turns detection off | `delete\|remove\|discard\|destroy\|erase\|purge\|revoke\|drop` |
| `labels` | `{ close, success, info, warning, error }` screen-reader text (translate here) | English |

| To | Do |
|---|---|
| Set it for the whole app | In a JavaScript file listed before the kit, or in the page's Function and Global Variable Declaration (anything that runs before the page finishes loading): `window.amcMessageKitConfig = { position: "bottom-end", look: "glass", timeout: 6 };` |
| Set it on one page | Page > HTML Header > Page HTML Body Attribute (or the page template): `data-amc-message-kit="position:bottom-center look:solid timeout:8"` (bare values like `"bottom-center solid 8"` also work) |
| Use page CSS classes | Page > Appearance > CSS Classes: `amc-msg-pos-bottom-center`, `amc-msg-look-minimal` |
| Keep native messages on one page | CSS Classes `amc-msg-off` (page messages and dialogs), `amc-msg-no-page`, or `amc-msg-no-dialogs` |
| Keep one message native | Add `amc-msg-off` to the alert or a parent element |
| Make every confirm on a page destructive | Page CSS Classes: `amc-msg-confirm-danger` |
| Change settings at runtime | `amcMessageKit.configure({ look: "brutal" })` |
| Offset the stack (for example below a sticky header) | CSS: `.amc-msg-stack { --amc-msg-offset: 4rem; }`; stacking order: `--amc-msg-z` (default 1200) |

### Destructive confirms

A confirm dialog gets danger styling (danger-colored primary button and icon) when any of
these is true, in this order:

1. `amcMessageKit.nextDialog("danger")` was called just before the dialog opened.
2. `apex.message.confirm(message, callback, { style: "danger" })` (the `style` option exists
   from APEX 21.2; the Dynamic Action "Confirm" action exposes it as Style). `warning`,
   `success` and `information` are recognized too.
3. The dialog markup already carries a `--danger` modifier class.
4. The page has the CSS class `amc-msg-confirm-danger`.
5. The confirm text or title matches `dangerWords` (APEX's default delete confirmation,
   "Would you like to perform this delete action?", matches).

## API

For Dynamic Actions (Execute JavaScript Code) or any page script:

```js
amcMessageKit.toast({
  type: "success",            // "success" | "info" | "warning" | "error" ("danger" also works)
  title: "Invoice sent",
  message: "INV-2041 was emailed to Acme Trading.",
  timeout: 5                  // seconds, optional; 0 keeps it open; ignored for "error"
});
```

Text is set with `textContent`, so HTML in `title` or `message` is shown as text, never run.
The call returns `{ element, close() }`.

| Function | Does |
|---|---|
| `amcMessageKit.toast(options)` | Shows a toast (above) |
| `amcMessageKit.dismissAll()` | Closes every toast (and the APEX messages they mirror) |
| `amcMessageKit.configure(options)` | Changes `position`, `look`, `timeout`, `max`, `dangerWords`, `labels` |
| `amcMessageKit.config()` | Returns the current settings |
| `amcMessageKit.nextDialog(style)` | Styles the next `apex.message` dialog: `"danger"`, `"warning"`, `"success"`, `"info"` |

## Accessibility

- Success, info and warning toasts are `role="status"` (polite); errors are `role="alert"`.
  Each toast starts with visually hidden type text ("Error: ...") so the type is not
  carried by color alone; icons also differ in shape.
- Success toasts never take focus. Tab reaches the close button and error links; Escape
  closes the toast that holds focus and returns focus to where it was.
- Close buttons are labelled (Universal Theme's own close title when there is one).
- Timers pause on hover and focus; errors never close by themselves.
- `position` uses logical sides, so `top-end` sits top-left on RTL pages; slide direction,
  progress bar and brutal shadow mirror too. Each text line takes its direction from its
  own content (`unicode-bidi: plaintext`).
- Forced colors (Windows High Contrast): system-color borders, progress bar and bullets.

## Verify on a live page

The demo reproduces Universal Theme and `apex.message` markup from documentation and
observation; check these on your APEX version after installing:

1. Save a form with a success message and a branch: the message appears as a toast and
   the original `.t-Body-alert` message is not shown twice.
2. Submit with empty required items: one error panel with links; clicking a link focuses
   the item; inline errors still show; fixing and resubmitting clears the panel.
3. Run `apex.message.showErrors([...])` and `apex.message.clearErrors()` from the browser
   console: the panel appears and goes away.
4. A Dynamic Action "Confirm" with Style = Danger, and the delete button of a Form region:
   the dialog is restyled with the danger button; Cancel, OK and Escape still work and
   focus returns to the button that opened it.
5. A modal dialog page and a drawer still look native.
6. Theme Roller: Vita, Vita Dark and Redwood Light; one RTL language; a phone.
7. If the app already auto-dismisses success messages through Universal Theme
   (`apex.theme42.util.configAPEXMsgs({ autoDismiss: true })`), the toast closes when the
   original is hidden; either timer can win, so keep one of them.

If a message class changes in a future APEX release, the kit simply stops mirroring it and
the native message shows as before.

## Files

| File | Purpose |
|---|---|
| `amc-message-kit.css` | Styles: stack, toasts, looks, dialogs, motion (reduced-motion safe), forced colors |
| `amc-message-kit.js` | Runtime: ES5, no dependency, `window.amcMessageKit` |
| `demo.html` | Offline demo with a Universal Theme and `apex.message` stand-in: every message type, position, look, dialogs, RTL and Vita Dark toggles |
| `dist/` | Generated by `node tools/build-kit.mjs`; do not edit |

Works alongside the Motion Kit; its `alerts` area has nothing to animate once messages are
mirrored into toasts.
