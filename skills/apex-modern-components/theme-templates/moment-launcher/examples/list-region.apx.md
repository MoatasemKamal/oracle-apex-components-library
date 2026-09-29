# Moment Launcher on a finance home page

Entries rise into "Right now" when the user's local date and time match their moments
(Attribute 1). Month-end close rises in the last 3 working days of the month, the Timesheet on
Friday afternoon (or the afternoon of the last working day of the week), the VAT return in the
last 5 working days of a quarter.

```apexlang
region my-day (
    name: My day
    type: list
    source {
        list: @finance-moments
    }
    componentAppearance {
        listTemplate: @amc-moment-launcher
        templateOptions: [
            #DEFAULT#
            amc-TMomentLauncher--spotlight
        ]
    }
)
```

| Entry | Attribute 1 (Moments) |
|---|---|
| Month-end close | `monthend` |
| Timesheet | `friday+afternoon weekclose+afternoon` |
| VAT return | `quarterend` |
| Morning briefing | `weekday+morning` |
| Payroll run | `day25` |

Working days follow the weekend of the page language (Intl week info). For a Saudi app whose
language is plain `ar` or `en`, set `data-weekend="friday saturday"` in the template's Before
List Entry so month-end counts Sunday to Thursday. Nothing is stored. Test a moment in the
browser console: `amcTplMomentLauncher.at("2026-12-29T09:00")`, then `amcTplMomentLauncher.at(null)`.
The reference `@amc-moment-launcher` and the theme-template folder layout are not yet confirmed
by the APEXlang compiler.
