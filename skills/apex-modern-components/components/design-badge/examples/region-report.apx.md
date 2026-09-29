# Design Badge: report region (APEXlang, APEX 26.1+)

Renders one badge per row as an inline wrapping group, for example the status mix of
a customer's open orders. Replace table/column names with objects proven from your
schema. Settings reference **projected column aliases**; the Style setting takes the
entry **name** (`counter`), not a display label.

```apexlang
region order_status_badges (
    name: Order Status
    type: plugin/designBadge
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
            select s.status_label                              as label,
                   case s.status_code
                        when 'PAID'    then 'success'
                        when 'PENDING' then 'warning'
                        when 'OVERDUE' then 'danger'
                        else 'neutral' end                     as state,
                   to_char(count(*), 'FM999G990')              as order_count
              from orders o
              join order_statuses s on s.status_code = o.status_code
             group by s.status_label, s.status_code, s.display_seq
             order by s.display_seq
            ```
    }
    settings {
        style: counter
        label: LABEL
        state: STATE
        value: ORDER_COUNT
    }
    column LABEL (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
    column STATE (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: STATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column ORDER_COUNT (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: ORDER_COUNT
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Design Badge [Plug-in]** > Appearance: *Multiple (Report)*, set
Style to Counter, then map Label, State and Value to the columns above. For a single
badge on a form, use *Single (Partial)* and set Label and State to static text or items.
