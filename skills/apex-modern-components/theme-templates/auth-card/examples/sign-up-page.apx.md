# Auth Card on a Create account page

A public page (for example 9991, Login page template) that creates an account. The password item
has `amc-auth-password amc-auth-strength`, the confirmation `amc-auth-password amc-auth-match`.
The Split look puts a brand panel beside the form; the sub region with CSS class
`amc-auth-brand` becomes its headline.

> APEXlang below is a sketch and **unverified** (template reference, `advanced.cssClasses` on
> items and regions, template option values).

```apexlang
page 9991 (
    name: Create account
    alias: SIGN-UP
    appearance {
        pageTemplate: @/login
    }
    security {
        authentication: public
    }

    region create-account (
        name: Create your account
        type: staticContent
        appearance {
            template: @amc-auth-card
            templateOptions: [
                #DEFAULT#
                amc-TAuthCard--split
                amc-TAuthCard--sceneMesh
            ]
            icon: fa-user-plus
        }
    )

    region brand-copy (
        name: Why join
        type: staticContent
        parentRegion: @create-account
        source {
            htmlCode:
                ```html
                <h3>Orders, invoices and stock in one place</h3>
                <p>Free for up to five users. No card needed.</p>
                ```
        }
        appearance {
            template: @/blank-with-attributes
        }
        advanced {
            cssClasses: amc-auth-brand
        }
    )

    pageItem P9991_EMAIL (
        type: textField
        subtype: email
        label {
            label: Work email
        }
        layout {
            sequence: 10
            region: @create-account
            slot: regionBody
        }
        appearance {
            template: @/required-floating
        }
        validation {
            valueRequired: true
            maxLength: 255
        }
        advanced {
            customAttributes: autocomplete="email"
        }
    )

    pageItem P9991_PASSWORD (
        type: password
        label {
            label: Password
        }
        layout {
            sequence: 20
            region: @create-account
            slot: regionBody
        }
        appearance {
            template: @/required-floating
        }
        validation {
            valueRequired: true
            maxLength: 128
        }
        advanced {
            cssClasses: amc-auth-password amc-auth-strength
            customAttributes: autocomplete="new-password" minlength="12"
        }
        sessionState {
            storage: request
        }
    )

    pageItem P9991_PASSWORD_CONFIRM (
        type: password
        label {
            label: Confirm password
        }
        layout {
            sequence: 30
            region: @create-account
            slot: regionBody
        }
        appearance {
            template: @/required-floating
        }
        advanced {
            cssClasses: amc-auth-password amc-auth-match
            customAttributes: autocomplete="new-password"
        }
        sessionState {
            storage: request
        }
    )

    button create (
        buttonName: CREATE
        label: Create account
        layout {
            sequence: 40
            region: @create-account
            slot: create
        }
        appearance {
            buttonTemplate: @/text
            hot: true
        }
    )

    button sign-in (
        label: I already have an account
        layout {
            sequence: 50
            region: @create-account
            slot: previous
        }
        behavior {
            action: redirectToPageInThisApplication
            target: 9999
        }
    )
)
```

## Server-side checklist

- Validation "Passwords match": `:P9991_PASSWORD = :P9991_PASSWORD_CONFIRM` (the meter and match
  hint are informative only and never block the submit).
- Password policy in a PL/SQL validation: minimum length (12+), not in a blocklist of common or
  breached passwords, not containing the email's local part. For APEX accounts
  `APEX_UTIL.STRONG_PASSWORD_CHECK` / `STRONG_PASSWORD_VALIDATION` apply the workspace policy.
- Store only a slow salted hash (for custom user tables) or create the user through your identity
  provider; never store or log the clear-text password. Items use `storage: request`.
- Neutral duplicate handling: if the email already exists, show the same "Check your email to
  finish" outcome and send an email to the existing owner instead of saying "already registered".
- Email verification with a single-use, expiring token (`apex_mail.send` + `apex_mail.push_queue`).
- Rate limit sign-ups per IP and per email domain (a table with timestamps checked in a validation).
