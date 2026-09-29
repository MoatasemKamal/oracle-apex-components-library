# Next Badge: report region (APEXlang, APEX 26.1+)

Status badges for the open orders of a customer. Replace table and column names with objects
proven from your schema. Settings reference **projected column aliases**; select-list
settings take the entry **name** (`beamOutline`).

```apexlang
region order_status_badges (
    name: Order Status
    type: plugin/nextBadge
    layout {
        sequence: 20
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
            select o.status_label                                  as label,
                   case o.status_code
                        when 'SHIPPED'  then 'success'
                        when 'HOLD'     then 'warning'
                        when 'OVERDUE'  then 'danger'
                        when 'REVIEW'   then 'info'
                        else 'neutral' end                         as state,
                   o.status_icon                                   as icon,
                   to_char(count(*))                               as value
              from customer_orders o
             where o.customer_id = :P10_CUSTOMER_ID
             group by o.status_label, o.status_code, o.status_icon
             order by o.status_code
            ```
    }
    settings {
        style: beamOutline
        label: LABEL
        state: STATE
        icon: ICON
        value: VALUE
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
    column ICON (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: ICON
            dataType: varchar2
            primaryKey: false
        }
    )
    column VALUE (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Next Badge [Plug-in]** > Appearance: *Multiple (Report)*, set Style,
then map Label, State, Icon and Value to the columns above. Use Style *Stack count* for a
compact group such as the teams reviewing a contract; it shows the total and fans out on
hover or keyboard focus. For a single badge use *Single (Partial)* with static values or
page items.
