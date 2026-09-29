# Auth Card on an OTP verification page

One real text item `P9992_CODE` with CSS class `amc-auth-otp` is shown as six boxes; the real
item always holds the code, so session state, validations and processes are unchanged. The
"Resend code" button has `amc-auth-resend` and a 30-second countdown. With **Auto-submit OTP**
the Verify button is pressed once all six digits are in.

> APEXlang below is a sketch and **unverified**.

```apexlang
page 9992 (
    name: Verify your sign-in
    alias: VERIFY
    appearance {
        pageTemplate: @/login
    }

    region verify (
        name: Enter the 6-digit code
        type: staticContent
        source {
            htmlCode:
                ```html
                <p>We sent a code to &P9992_MASKED_TARGET.. It expires in 5 minutes.</p>
                ```
        }
        appearance {
            template: @amc-auth-card
            templateOptions: [
                #DEFAULT#
                amc-TAuthCard--neon
                amc-TAuthCard--sceneGrid
                amc-TAuthCard--otpAutoSubmit
            ]
            icon: fa-shield
        }
    )

    pageItem P9992_CODE (
        type: textField
        label {
            label: Verification code
        }
        layout {
            sequence: 10
            region: @verify
            slot: regionBody
        }
        appearance {
            template: @/required-above
        }
        validation {
            valueRequired: true
            maxLength: 6
        }
        advanced {
            cssClasses: amc-auth-otp
            customAttributes: data-amc-length="6" inputmode="numeric" autocomplete="one-time-code"
        }
        sessionState {
            storage: request
        }
    )

    button verify (
        buttonName: VERIFY
        label: Verify
        layout {
            sequence: 20
            region: @verify
            slot: next
        }
        appearance {
            buttonTemplate: @/text
            hot: true
        }
    )

    button resend (
        buttonName: RESEND
        label: Resend code
        layout {
            sequence: 30
            region: @verify
            slot: help
        }
        appearance {
            buttonTemplate: @/text
            cssClasses: amc-auth-resend
        }
        advanced {
            customAttributes: data-amc-seconds="30"
        }
    )
)
```

## Server-side checklist

- Store only a hash of the code with `created_at`, `expires_at` (5 minutes) and `attempts`.
- Validation: code matches the latest unexpired hash for this session's pending user, compared
  in constant time; increment `attempts` on every try and invalidate after 5 failures.
- Resend: server-side cooldown (the button countdown is only UI), at most N codes per hour; a new
  code invalidates the previous one. Send with `apex_mail.send` / an SMS gateway.
- Bind the pending verification to the session (`APEX_CUSTOM_AUTH.GET_SESSION_ID`) so a code
  cannot be replayed from another session; only set the authenticated state after success.
- Error messages stay generic ("That code is not valid or has expired").
