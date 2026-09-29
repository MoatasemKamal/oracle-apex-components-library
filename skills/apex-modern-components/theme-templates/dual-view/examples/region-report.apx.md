# Dual View around a Classic Report

Spend per category as a report that users can flip into a donut. The chart is drawn from the
rows the report shows, so filters, pagination and refreshes apply to both views.

```apexlang
region spend-by-category (
    name: Spend by category
    type: classicReport
    source {
        sqlQuery:
            ```sql
            select category, count(*) invoices, sum(amount) spend
              from invoices
             group by category
             order by spend desc
            ```
    }
    appearance {
        template: @amc-dual-view
        templateOptions: [
            #DEFAULT#
            amc-TDualView--chartFirst
            amc-TDualView--donut
        ]
        icon: fa-pie-chart
    }
    advanced {
        staticId: spend-by-category
        customAttributes: data-amc-column="Spend"
    }
)
```

Give the region a Static ID so the user's Table / Chart choice is remembered for it.
`data-amc-column` is optional; without it the last numeric column (SPEND) is charted.

The template reference (`@amc-dual-view`), the theme-template folder layout and the
`customAttributes` property name are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit.
