# Insight Frame around a Classic Report

A Classic Report of open orders. The frame finds the numeric AMOUNT column (the last numeric
column), shows the total, average and largest order in its header, and draws a share bar under
every row. It recomputes after every refresh, for example when a filter item changes.

```apexlang
region open-orders (
    name: Open orders
    type: classicReport
    source {
        sqlQuery:
            ```sql
            select order_no, customer, status, amount
              from orders
             where status <> 'CLOSED'
            ```
    }
    appearance {
        template: @amc-insight-frame
        templateOptions: [
            #DEFAULT#
            amc-TInsightFrame--minMax
        ]
        icon: fa-shopping-cart
    }
    advanced {
        staticId: open-orders
        customAttributes: data-amc-column="Amount" data-amc-label-total="Open value"
    }
)
```

`data-amc-column` is optional; without it the last numeric column is used. Format the column in
SQL or with a format mask as usual; the insight strip copies the report's separators and currency.

The template reference (`@amc-insight-frame`), the theme-template folder layout and the
`customAttributes` property name are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit.
