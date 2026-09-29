# Quest List as a Getting started region

A Getting started region on the home page for new finance users. Each list entry links to the
page of the task; Attribute 2 holds the points. The task "Create your first invoice" links to
the Invoices page but is only really done after saving, so Attribute 3 names the confirmation
page alias `invoice-created`.

```apexlang
region getting-started (
    name: Getting started
    type: list
    source {
        list: @finance-onboarding
    }
    componentAppearance {
        listTemplate: @amc-quest-list
        templateOptions: [
            #DEFAULT#
            amc-TQuestList--hero
            amc-TQuestList--fold
        ]
    }
)
```

| Entry | Link | Attribute 1 | Attribute 2 | Attribute 3 |
|---|---|---|---|---|
| Open your orders | Page 10 | See what is waiting | 10 | |
| Create your first invoice | Page 20 | Issue an invoice | 30 | `invoice-created` |
| Submit a timesheet | Page 30 | Log this week's hours | 20 | |

What is stored, in `localStorage` only: visited page keys under
`amc-tpl-quest-list:<application id>:visits`, and ticks plus completed-task bookkeeping under
`amc-tpl-quest-list:<application id>:<list id>`. Reset progress forgets both for this list.
The template works on the home page alone; to catch visits to pages the user opens without
coming back through the home page, add `amc-tpl-quest-list.js` to the application's
JavaScript File URLs. The reference `@amc-quest-list` and the theme-template folder layout are
not yet confirmed by the APEXlang compiler.
