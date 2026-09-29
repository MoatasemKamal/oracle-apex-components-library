# Motion Celebrate: message from a SQL query (APEXlang)

The celebration message is a Session State Value, so it can come from the region's query, for example the order that was just paid. Effect, Trigger and Intensity are region settings (they choose the animation, not data). Partial mode renders **one row**: make the query return exactly one row (aggregate, or filter by the page's key). If it returns no row the region renders nothing; add `fetch first 1 rows only` when several rows are possible.

Tables and columns (`orders`, `invoices`, `employees`, `customers` and so on) are **placeholders**: replace them with objects proven from your schema before generating the page.

```apexlang
region invoice_paid_celebrate (
    name: Celebrate
    type: plugin/motionCelebrate
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/blank-with-attributes
        templateOptions: #DEFAULT#
    }
    componentAppearance {
        display: partial
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select 'Invoice ' || i.invoice_no || ' is paid in full' as message
              from invoices i
             where i.invoice_id = :P20_INVOICE_ID
               and i.status = 'PAID'
            ```
        pageItemsToSubmit: [
            P20_INVOICE_ID
        ]
    }
    settings {
        effect: cannons
        trigger: load
        message: MESSAGE
    }
    column MESSAGE (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: MESSAGE
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Because the query returns no row until the invoice is paid, the region renders nothing (and nothing fires) for unpaid invoices. To celebrate from JavaScript with data, pass the text: `amcCelebrate.fire({ message: apex.item('P20_MESSAGE').getValue() })`.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Motion Celebrate [Plug-in]** > Source: SQL Query > Appearance: *Single (Partial)* > Message: column MESSAGE.
