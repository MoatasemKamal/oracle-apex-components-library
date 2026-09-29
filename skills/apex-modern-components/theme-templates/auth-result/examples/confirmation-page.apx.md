# Auth Result on a "Check your email" confirmation page

Page 9998 is a public page (Authentication: Page Is Public) reached from the Forgot password
page. It uses Universal Theme's Login page template so it sits in the same centered column as the
login card. One Static Content region with the Auth Result template shows the outcome; the
wording stays neutral and never says whether an account exists. `P9998_MASKED_EMAIL` is set by
the process on the previous page (for example `m••••@northwind.sa`) and is session state
protected. A sub region holds the "Didn't get it? Resend" row.

```apexlang
page 9998 (
    name: Check your email
    alias: CHECK-EMAIL
    appearance {
        pageTemplate: @login
    }
    security {
        authentication: pageIsPublic
    }

    region check-email (
        name: Check your email
        type: staticContent
        source {
            htmlCode:
                ```html
                <p>If an account exists for <strong>&P9998_MASKED_EMAIL.</strong>, we sent a link
                to reset your password. The link works once and expires in 30 minutes.</p>
                ```
        }
        appearance {
            template: @amc-auth-result
            templateOptions: [
                #DEFAULT#
                amc-TAuthResult--email
                amc-TAuthResult--aurora
            ]
        }
        advanced {
            staticId: check-email
        }
    )

    region resend (
        name: Resend
        type: staticContent
        parentRegion: @check-email
        source {
            htmlCode:
                ```html
                Didn't get it? Check your spam folder, or
                ```
        }
        appearance {
            template: @blank-with-attributes
        }
    )

    button resend-link (
        label: Send another link
        region: @resend
        behavior {
            action: submitPage
        }
        appearance {
            buttonTemplate: @text
            hot: false
        }
    )

    button back-to-sign-in (
        label: Back to sign in
        region: @check-email
        position: previous
        behavior {
            action: redirectToPageInThisApplication
            target: 9999
        }
    )
)
```

The resend button submits the page; its process sends the mail again only when the server-side
rate limit allows it and always shows the same neutral message. Pair it with the `auth-card`
template's `amc-auth-resend` class on a page that uses that template if you want a visible
cooldown; this template does not add one.

The template reference (`@amc-auth-result`), the theme-template folder layout and the button
`position` names are not yet confirmed by the APEXlang compiler; check with apexlang's
compiler-truth audit.
