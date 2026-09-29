# Frecency Launcher on a home page

A List region on the home page of a finance app. Each user gets their own "Your most used"
row after opening destinations a few times; a new user sees the list in the order you define.

```apexlang
region launchpad (
    name: Launchpad
    type: list
    source {
        list: @finance-launchpad
    }
    componentAppearance {
        listTemplate: @amc-frecency-launcher
        templateOptions: [
            #DEFAULT#
            amc-TFrecencyLauncher--filled
        ]
    }
)
```

List entries: Attribute 1 is the description, Attribute 2 a badge such as `14 overdue`
(an application item substitution keeps it live), Attribute 3 an optional learning key such as
`orders` when the link carries values that change per user or per day.

What is stored: time stamps of the user's opens per entry, in `localStorage` under
`amc-tpl-frecency-launcher:<application id>:<list id>`. Nothing leaves the browser; the
Reset order button clears it. The template loads `amc-tpl-frecency-launcher.js`; the
reference `@amc-frecency-launcher` and the theme-template folder layout are not yet confirmed by
the APEXlang compiler.
