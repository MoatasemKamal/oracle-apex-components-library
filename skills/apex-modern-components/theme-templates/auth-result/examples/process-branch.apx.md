# Auth Result after a process: success or expired, with a countdown redirect

The Reset password page (page 20) validates the token and sets the new password in a page
process. A branch then goes to page 21 and passes the outcome in `P21_OUTCOME`. Page 21 has two
Auth Result regions with server-side conditions, so exactly one renders:

- **Password changed**: Success outcome with confetti and *Redirect after countdown*; after
  8 seconds (Custom Attributes `data-amc-seconds="8"`) it follows the "Sign in" link in the text.
  The user can hover, tab into the card, press Escape or the visible "Stay on this page" button
  to stop it.
- **Link expired**: Link expired outcome (role alert), with Next = "Send a new link".

Token checks, expiry and attempt limits stay in the process and validations on page 20; the
template only shows the result.

```apexlang
page 20 (
    name: Reset password

    process reset-password (
        name: Reset password
        type: executeCode
        source {
            plsqlCode:
                ```plsql
                :P21_OUTCOME := case
                    when app_auth.reset_password(:P20_TOKEN, :P20_PASSWORD) then 'DONE'
                    else 'EXPIRED'
                end;
                ```
        }
    )

    branch to-result (
        name: Show result
        point: afterProcessing
        behavior {
            type: redirectToPageInThisApplication
            target: 21
            items {
                P21_OUTCOME: &P21_OUTCOME.
            }
        }
    )
)

page 21 (
    name: Reset result
    appearance {
        pageTemplate: @login
    }
    security {
        authentication: pageIsPublic
    }

    region password-changed (
        name: Password changed
        type: staticContent
        source {
            htmlCode:
                ```html
                <p>Your new password is active and other devices were signed out.
                <a href="f?p=&APP_ID.:9999:0">Sign in with your new password</a></p>
                ```
        }
        appearance {
            template: @amc-auth-result
            templateOptions: [
                #DEFAULT#
                amc-TAuthResult--confetti
                amc-TAuthResult--countdown
                amc-TAuthResult--particles
            ]
        }
        serverSideCondition {
            type: itemEqualsValue
            item: P21_OUTCOME
            value: DONE
        }
        advanced {
            staticId: password-changed
            customAttributes: data-amc-seconds="8" data-amc-text-cancel="Stay here"
        }
    )

    region link-expired (
        name: This link has expired
        type: staticContent
        source {
            htmlCode:
                ```html
                <p>Reset links work once and for 30 minutes. Request a new one and use the most
                recent email.</p>
                ```
        }
        appearance {
            template: @amc-auth-result
            templateOptions: [
                #DEFAULT#
                amc-TAuthResult--expired
            ]
        }
        serverSideCondition {
            type: itemNotEqualToValue
            item: P21_OUTCOME
            value: DONE
        }
    )

    button send-new-link (
        label: Send a new link
        region: @link-expired
        position: next
        hot: true
        behavior {
            action: redirectToPageInThisApplication
            target: 19
        }
    )
)
```

Load `amc-tpl-auth-result.js` (the build adds it to the template's JavaScript file URLs) for the
countdown and the role alert switch; without it the page still shows the full outcome.

The template reference, `serverSideCondition` type names, branch item syntax and the
`customAttributes` property name are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit.
