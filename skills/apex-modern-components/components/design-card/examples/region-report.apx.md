# Design Card: report region (APEXlang, APEX 26.1+)

Replace table/column names with objects proven from your schema. Settings reference
**projected column aliases**; select-list settings take the entry **name** (`ticket`,
`three`), not the return value. This region shows open sales orders as ticket cards.

```apexlang
region open_orders (
    name: Open Orders
    type: plugin/designCard
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
        display: report
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select 'Order ' || o.order_number                        as title_txt,
                   c.customer_name                                    as eyebrow_txt,
                   o.item_count || ' items, ' || o.delivery_note      as description_txt,
                   'fa-shopping-cart'                                 as icon,
                   s.status_label                                     as badge_txt,
                   case s.status_code
                        when 'SHIPPED'   then 'success'
                        when 'BACKORDER' then 'warning'
                        when 'CANCELLED' then 'danger'
                        else 'neutral' end                            as state,
                   to_char(o.order_total, 'FML999G999G990')           as total_fmt,
                   'Total'                                            as value_label,
                   o.payment_terms                                    as meta_txt,
                   apex_page.get_url(p_page => 12,
                                     p_items => 'P12_ORDER_ID',
                                     p_values => o.order_id)          as link_url,
                   'View Order'                                       as link_label
              from sales_orders o
              join customers c on c.customer_id = o.customer_id
              join order_statuses s on s.status_code = o.status_code
             where o.status_code <> 'CLOSED'
             order by o.order_date desc
            ```
    }
    settings {
        style: ticket
        title: TITLE_TXT
        eyebrow: EYEBROW_TXT
        description: DESCRIPTION_TXT
        icon: ICON
        badge: BADGE_TXT
        state: STATE
        value: TOTAL_FMT
        valueLabel: VALUE_LABEL
        meta: META_TXT
        linkUrl: LINK_URL
        linkLabel: LINK_LABEL
        columns: three
    }
    column TITLE_TXT (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: TITLE_TXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column EYEBROW_TXT (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: EYEBROW_TXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column DESCRIPTION_TXT (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: DESCRIPTION_TXT
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
    column BADGE_TXT (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: BADGE_TXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column STATE (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: STATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column TOTAL_FMT (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: TOTAL_FMT
            dataType: varchar2
            primaryKey: false
        }
    )
    column VALUE_LABEL (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE_LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
    column META_TXT (
        layout {
            sequence: 90
        }
        source {
            type: databaseColumn
            databaseColumn: META_TXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_URL (
        layout {
            sequence: 100
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
            sequence: 110
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

Switch `style:` to any other entry name (`elevated`, `outline`, `glass`, `gradientBorder`,
`imageTop`, `imageOverlay`, `horizontal`, `accentTop`, `stackedPaper`, `softInset`,
`cornerIcon`) without changing the query. The image styles also read `imageUrl:` (map a
column returning a developer-controlled URL, for example from `#APP_FILES#`).

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Design Card [Plug-in]** > Appearance: *Multiple (Report)*, choose
Style **Ticket**, then map Title, Eyebrow, Description, Icon, Badge, State, Value,
Value Label, Meta, Link URL and Link Label to the columns above.
