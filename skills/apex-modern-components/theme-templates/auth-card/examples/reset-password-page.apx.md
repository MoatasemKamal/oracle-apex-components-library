# Auth Card on a Reset password page

Reached from the emailed link with a token. New password with `amc-auth-password
amc-auth-strength`, confirmation with `amc-auth-password amc-auth-match`. The Paper look and the
Aurora scene (no scene option = Aurora).

> APEXlang below is a sketch and **unverified**.

```apexlang
page 9993 (
    name: Choose a new password
    alias: RESET-PASSWORD
    appearance {
        pageTemplate: @/login
    }
    security {
        authentication: public
    }

    region reset (
        name: Choose a new password
        type: staticContent
        appearance {
            template: @amc-auth-card
            templateOptions: [
                #DEFAULT#
                amc-TAuthCard--paper
            ]
            icon: fa-unlock-alt
        }
    )

    pageItem P9993_TOKEN (
        type: hidden
        layout {
            sequence: 5
            region: @reset
            slot: regionBody
        }
        security {
            sessionStateProtection: checksumRequiredSessionLevel
        }
    )

    pageItem P9993_PASSWORD (
        type: password
        label {
            label: New password
        }
        layout {
            sequence: 10
            region: @reset
            slot: regionBody
        }
        appearance {
            template: @/required-floating
        }
        advanced {
            cssClasses: amc-auth-password amc-auth-strength
            customAttributes: autocomplete="new-password" minlength="12"
        }
        sessionState {
            storage: request
        }
    )

    pageItem P9993_PASSWORD_CONFIRM (
        type: password
        label {
            label: Confirm new password
        }
        layout {
            sequence: 20
            region: @reset
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

    button save (
        buttonName: SAVE
        label: Save new password
        layout {
            sequence: 30
            region: @reset
            slot: next
        }
        appearance {
            buttonTemplate: @/text
            hot: true
        }
    )
)
```

## Server-side checklist

- Validate the token first (hash lookup, not expired, not used); on failure show the neutral
  "This link has expired" outcome (see `auth-result`) without saying why.
- Validations: passwords match, password policy (length, blocklist, not equal to the previous
  password; `APEX_UTIL.STRONG_PASSWORD_VALIDATION` for APEX accounts).
- Process: set the new hash (or `APEX_UTIL.EDIT_USER` / `APEX_UTIL.RESET_PASSWORD` for APEX
  accounts), mark the token used, invalidate other tokens and sessions of the user.
- Notify the user by email (`apex_mail.send`) that the password changed.
- Rate limit attempts per token and per IP.
