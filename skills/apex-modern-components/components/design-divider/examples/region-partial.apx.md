# Design Divider: section heading region (APEXlang, APEX 26.1+)

The divider is a partial (single) template component. Static settings are enough; you
can also map Title or Meta to a page item or column. Select-list settings take the entry
**name** (`sideLabel`, `compact`), not the display label.

```apexlang
region pending_shipments_divider (
    name: Pending Shipments Divider
    type: plugin/designDivider
    layout {
        sequence: 20
        slot: body
    }
    appearance {
        template: @/blank-with-attributes
    }
    componentAppearance {
        display: partial
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select 'Pending Shipments'                    as title,
                   'Warehouse Riyadh'                     as eyebrow,
                   'fa-truck'                             as icon,
                   count(*) || ' orders'                  as meta
              from sales_orders
             where status_code = 'READY_TO_SHIP'
               and warehouse_code = 'RUH'
            ```
    }
    settings {
        style: sideLabel
        title: TITLE
        eyebrow: EYEBROW
        icon: ICON
        meta: META
        spacing: compact
    }
    column TITLE (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: TITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column EYEBROW (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: EYEBROW
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
    column META (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: META
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Switch `style:` to `lineTitle`, `eyebrowTitle`, `gradientLine`, `iconCenter`, `pillLabel`,
`accentUnderline` or `dotted` without other changes. Leave Title empty for a pure
separator (it then gets `role="separator"`).

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Design Divider [Plug-in]** > Appearance: *Single (Partial)*, choose
Style **Side Label**, then map Title, Eyebrow, Icon and Meta to the columns above and set
Spacing to **Compact**.
