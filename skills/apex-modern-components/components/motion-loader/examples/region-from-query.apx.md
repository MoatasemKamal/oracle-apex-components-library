# Motion Loader: label from a SQL query (APEXlang)

The spinner itself is presentation, but its accessible label can say what is loading. The new **Label Value** setting (attribute 4, Session State Value) replaces the static Label when not empty. Partial mode renders **one row**: make the query return exactly one row (aggregate, or filter by the page's key). If it returns no row the region renders nothing; add `fetch first 1 rows only` when several rows are possible.

Tables and columns (`orders`, `invoices`, `employees`, `customers` and so on) are **placeholders**: replace them with objects proven from your schema before generating the page.

```apexlang
region orders_loading (
    name: Loading Orders
    type: plugin/motionLoader
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: [
            #DEFAULT#
            t-Region--hideHeader
            t-Region--noUI
        ]
    }
    componentAppearance {
        display: partial
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select 'Loading ' || count(*) || ' ' || lower(:P10_STATUS) || ' orders' as label_value
              from orders
             where status = :P10_STATUS
            ```
        pageItemsToSubmit: [
            P10_STATUS
        ]
    }
    settings {
        style: orbit
        size: small
        label: Loading orders
        labelValue: LABEL_VALUE
    }
    column LABEL_VALUE (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: LABEL_VALUE
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Show it on *Before Refresh* of the report and hide it on *After Refresh* (see `region-partial.apx.md`).

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Motion Loader [Plug-in]** > Source: SQL Query > Appearance: *Single (Partial)* > Label Value: column LABEL_VALUE.
