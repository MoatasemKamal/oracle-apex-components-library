# Design Header: header fed by a SQL query (APEXlang)

The header's texts, icon, image and links come from one row of the region's source query, so the page title can say what is really waiting. Partial mode renders **one row**: make the query return exactly one row (aggregate, or filter by the page's key). If it returns no row the region renders nothing; add `fetch first 1 rows only` when several rows are possible.

Tables and columns (`orders`, `invoices`, `employees`, `customers` and so on) are **placeholders**: replace them with objects proven from your schema before generating the page.

```apexlang
region customer_header (
    name: Customer Header
    type: plugin/designHeader
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
            select 'Customer ' || c.customer_no                                   as eyebrow,
                   c.customer_name                                                   as title,
                   (select count(*) from orders o
                     where o.customer_id = c.customer_id and o.status = 'OPEN')
                     || ' open orders, '
                     || (select count(*) from invoices i
                          where i.customer_id = c.customer_id and i.status = 'OVERDUE')
                     || ' overdue invoices'                                          as subtitle,
                   case when c.is_key_account = 'Y' then 'fa-star' else 'fa-building-o' end as icon,
                   apex_page.get_url(p_page => 31, p_items => 'P31_CUSTOMER_ID',
                                     p_values => c.customer_id)                      as primary_url,
                   'New order'                                                        as primary_label
              from customers c
             where c.customer_id = :P30_CUSTOMER_ID
            ```
        pageItemsToSubmit: [
            P30_CUSTOMER_ID
        ]
    }
    settings {
        style: gradientHero
        eyebrow: EYEBROW
        title: TITLE
        subtitle: SUBTITLE
        icon: ICON
        primaryUrl: PRIMARY_URL
        primaryLabel: PRIMARY_LABEL
    }
    column EYEBROW (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: EYEBROW
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
    column SUBTITLE (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: SUBTITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column ICON (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: ICON
            dataType: varchar2
            primaryKey: false
        }
    )
    column PRIMARY_URL (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: PRIMARY_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column PRIMARY_LABEL (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: PRIMARY_LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Style stays a region setting (it chooses the markup); every text, the icon and the links are data.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Design Header [Plug-in]** > Source: SQL Query (the query above) > Appearance: *Single (Partial)*, then map Eyebrow, Title, Subtitle, Icon, Primary URL and Primary Label to the columns.
