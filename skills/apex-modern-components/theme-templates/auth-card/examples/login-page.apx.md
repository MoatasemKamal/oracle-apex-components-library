# Auth Card on the Login page (page 9999)

The app's Login page keeps Universal Theme's **Login** page template (centered column) and its
generated processes (`APEX_AUTHENTICATION.LOGIN`, username cookie). Only the region template
changes: the Auth Card draws the card and the full-screen scene behind the page. The password
item gets `amc-auth-password` (show/hide toggle, Caps Lock warning). A sub region holds the
"Forgot password? / Create account" links.

> APEXlang below is a sketch and **unverified**: `@amc-auth-card`, `advanced.cssClasses` on page
> items and the template option values are not yet confirmed by the APEXlang compiler. Check with
> apexlang's compiler-truth audit or a real import.

```apexlang
page 9999 (
    name: Login Page
    alias: LOGIN
    appearance {
        pageTemplate: @/login
    }
    security {
        authentication: public
        formAutoComplete: false
    }

    region sign-in (
        name: Sign in to Northwind
        type: staticContent
        layout {
            slot: contentBody
        }
        appearance {
            template: @amc-auth-card
            templateOptions: [
                #DEFAULT#
                amc-TAuthCard--sceneMeteors
            ]
            icon: fa-lock
        }
    )

    pageItem P9999_USERNAME (
        type: textField
        label {
            label: Email or username
        }
        layout {
            sequence: 10
            region: @sign-in
            slot: regionBody
        }
        appearance {
            template: @/optional-floating
        }
        validation {
            maxLength: 100
        }
        advanced {
            customAttributes: autocomplete="username" autocapitalize="none" spellcheck="false"
        }
        sessionState {
            storage: request
        }
    )

    pageItem P9999_PASSWORD (
        type: password
        label {
            label: Password
        }
        layout {
            sequence: 20
            region: @sign-in
            slot: regionBody
        }
        appearance {
            template: @/optional-floating
        }
        validation {
            maxLength: 100
        }
        advanced {
            cssClasses: amc-auth-password
            customAttributes: autocomplete="current-password"
        }
        sessionState {
            storage: request
        }
    )

    button login (
        buttonName: LOGIN
        label: Sign in
        layout {
            sequence: 40
            region: @sign-in
            slot: next
        }
        appearance {
            buttonTemplate: @/text
            hot: true
        }
    )

    region sign-in-links (
        name: Account links
        type: staticContent
        parentRegion: @sign-in
        source {
            htmlCode:
                ```html
                <p><a href="f?p=&APP_ID.:9990:&APP_SESSION.">Forgot password?</a> &middot;
                <a href="f?p=&APP_ID.:9991:&APP_SESSION.">Create account</a></p>
                ```
        }
        appearance {
            template: @/blank-with-attributes
        }
    )

    // Keep the generated processes of the Login page: Get Username Cookie,
    // Set Username Cookie, Login (APEX_AUTHENTICATION.LOGIN), Clear Page(s) Cache.
)
```

## Server-side checklist

- Keep the generated `APEX_AUTHENTICATION.LOGIN` process; never check passwords in JavaScript.
- Leave the authentication scheme's failure message neutral ("Invalid login credentials"), the
  same for unknown users and wrong passwords.
- Rate limiting and lockout: APEX workspace/instance settings (maximum login failures, account
  lock), plus your own counter per username and IP in a custom authentication function if needed.
- Items use `sessionState.storage: request` so the password is never stored in session state.
- The error the page shows after a failed login makes the card shake once and focuses the first
  invalid item; nothing is revealed that the server did not say.
