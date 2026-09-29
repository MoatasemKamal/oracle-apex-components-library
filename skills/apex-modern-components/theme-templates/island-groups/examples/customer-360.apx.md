# Island Groups on a Customer 360 page

A parent Static Content region with five sub regions. The parent and the sub regions all use
Island Groups: the parent becomes the frame and the grid, each sub region an island whose title
is its label. The report sub region asks for two thirds of the row with `data-amc-span="8"`;
the other islands are balanced by the template.

```apexlang
region customer (
    name: &P20_CUSTOMER_NAME.
    type: staticContent
    appearance {
        template: @amc-island-groups
        templateOptions: [
            #DEFAULT#
        ]
        icon: fa-building-o
    }
    advanced {
        staticId: customer
    }
)

region customer-contact (
    name: Contact
    type: staticContent
    parentRegion: @customer
    source {
        htmlCode:
            ```html
            <dl><dt>Account manager</dt><dd>&P20_ACCOUNT_MANAGER.</dd>
                <dt>Billing email</dt><dd>&P20_BILLING_EMAIL.</dd></dl>
            ```
    }
    appearance {
        template: @amc-island-groups
    }
)

region customer-orders (
    name: Open orders
    type: classicReport
    parentRegion: @customer
    source {
        sqlQuery:
            ```sql
            select order_no, order_date, status, amount
              from orders                        -- placeholder
             where customer_id = :P20_CUSTOMER_ID
               and status <> 'CLOSED'
             order by order_date desc
            ```
    }
    appearance {
        template: @amc-island-groups
    }
    advanced {
        customAttributes: data-amc-span="8"
    }
)
```

Credit, Documents and Notes follow the same pattern. When a dynamic action hides a sub region
(for example Credit for users without the finance role), the remaining islands rebalance.

## Form sections in one Static Content region

```html
<div data-amc-island><h3>Leave dates</h3> ... </div>
<div data-amc-island><h3>Cover while away</h3> ... </div>
```

Page items cannot be placed inside Static Content markup; for item groups use one sub region per
group with this template and the **Pairs** option on the parent.

The template reference (`@amc-island-groups`), `parentRegion` and `customAttributes` property
names are not yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
