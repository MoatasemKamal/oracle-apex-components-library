# Empty State: message and icon from a SQL query (APEXlang)

One empty-state region can explain both no data and no search results: the query returns the title, message, link and the new **Icon Value** (attribute 8), which replaces the static Icon when not empty. Partial mode renders **one row**: make the query return exactly one row (aggregate, or filter by the page's key). If it returns no row the region renders nothing; add `fetch first 1 rows only` when several rows are possible.

Tables and columns (`orders`, `invoices`, `employees`, `customers` and so on) are **placeholders**: replace them with objects proven from your schema before generating the page.

```apexlang
region orders_empty (
    name: No Orders
    type: plugin/emptyState
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
            select case when :P10_SEARCH is not null then 'fa-search' else 'fa-inbox' end as icon_value,
                   case when :P10_SEARCH is not null
                        then 'No orders match ' || :P10_SEARCH
                        else 'No orders yet' end                                      as title,
                   case when :P10_SEARCH is not null
                        then 'Try another customer or order number.'
                        else 'Orders you create will appear here.' end                as message,
                   apex_page.get_url(p_page => 15)                                    as link_url,
                   'Create order'                                                     as link_label
              from dual
            ```
        pageItemsToSubmit: [
            P10_SEARCH
        ]
    }
    settings {
        icon: fa-inbox
        iconValue: ICON_VALUE
        title: TITLE
        message: MESSAGE
        linkUrl: LINK_URL
        linkLabel: LINK_LABEL
        bordered: true
    }
    column ICON_VALUE (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: ICON_VALUE
            dataType: varchar2
            primaryKey: false
        }
    )
    column TITLE (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: TITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column MESSAGE (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: MESSAGE
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_URL (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_LABEL (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Show the region with a server-side condition such as `not exists (select 1 from orders where ...)` and refresh it together with the report. `:P10_SEARCH` is escaped by the component (HTML escaping), so user input is safe to echo.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Empty State [Plug-in]** > Source: SQL Query > Appearance: *Single (Partial)*, then map Icon Value, Title, Message, Link URL and Link Label to the columns.
