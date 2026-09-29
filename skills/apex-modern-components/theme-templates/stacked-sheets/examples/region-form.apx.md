# Stacked Sheets around a Form

The top sheet keeps the Form on the normal surface; only the sheets behind are tinted and move.

```apexlang
region expense-claim (
    name: Expense claim EC-2291
    type: form
    appearance {
        template: @amc-stacked-sheets
        templateOptions: [
            #DEFAULT#
        ]
        icon: fa-file-text-o
    }
)
```

For a report of documents use `amc-TStackedSheets--straight` and
`amc-TStackedSheets--noPadding`. The template reference (`@amc-stacked-sheets`) and the
theme-template folder layout are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit.
