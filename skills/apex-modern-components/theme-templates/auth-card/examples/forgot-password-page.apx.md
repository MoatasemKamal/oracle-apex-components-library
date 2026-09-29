# Auth Card on a Forgot password page

One email item and a "Send reset link" button. The page always answers with the same neutral
message, whether or not the account exists (pair it with the `auth-result` template's "email
sent" outcome, or branch back with a success message).

> APEXlang below is a sketch and **unverified**.

```apexlang
page 9990 (
    name: Forgot password
    alias: FORGOT-PASSWORD
    appearance {
        pageTemplate: @/login
    }
    security {
        authentication: public
    }

    region forgot (
        name: Forgot your password?
        type: staticContent
        source {
            htmlCode:
                ```html
                <p>Enter the email you sign in with. If it belongs to an account, we will send a
                link to choose a new password.</p>
                ```
        }
        appearance {
            template: @amc-auth-card
            templateOptions: [
                #DEFAULT#
                amc-TAuthCard--clay
                amc-TAuthCard--sceneParticles
            ]
            icon: fa-key
        }
    )

    pageItem P9990_EMAIL (
        type: textField
        subtype: email
        label {
            label: Email
        }
        layout {
            sequence: 10
            region: @forgot
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

    button send-link (
        buttonName: SEND
        label: Send reset link
        layout {
            sequence: 20
            region: @forgot
            slot: next
        }
        appearance {
            buttonTemplate: @/text
            hot: true
        }
    )

    button back (
        label: Back to sign in
        layout {
            sequence: 30
            region: @forgot
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

- **Neutral wording**: the process does the same thing and the page shows the same message
  ("If an account exists for that email, we sent a link") for known and unknown addresses. Keep
  response time similar too (do the lookup and mail queueing in both branches, or queue a job).
- Token: random (`dbms_crypto.randombytes`), stored hashed, single use, expires in 15-30 minutes,
  invalidated when a newer one is issued or the password changes.
- Send with `apex_mail.send` (template or body) then `apex_mail.push_queue`; the link carries the
  token only, never the email or user id.
- Rate limit per email and per IP (for example 3 requests per 15 minutes) in a validation that
  still shows the neutral message.
- Log requests for auditing without storing the token in clear text.
