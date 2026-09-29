# Motion Count Up: KPI row (APEXlang)

```apexlang
region kpi_counters (
    name: This Year
    type: plugin/motionCountUp
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
            select 'Revenue this year' as label, 'SAR' as prefix, null as suffix, 'fa-money' as icon,
                   to_char(sum(amount), 'FM999999999990D00', 'NLS_NUMERIC_CHARACTERS=''.,''') as value
              from orders
             where order_date >= trunc(sysdate, 'YYYY')
            union all
            select 'Orders shipped', null, null, 'fa-truck', to_char(count(*))
              from orders
             where status = 'SHIPPED'
            ```
    }
    settings {
        value: VALUE
        label: LABEL
        prefix: PREFIX
        suffix: SUFFIX
        icon: ICON
        accent: primary
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
    column VALUE (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE
            dataType: varchar2
            primaryKey: false
        }
    )
    column PREFIX (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: PREFIX
            dataType: varchar2
            primaryKey: false
        }
    )
    column SUFFIX (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: SUFFIX
            dataType: varchar2
            primaryKey: false
        }
    )
    column ICON (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: ICON
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Return Value as a plain number with a period as decimal separator (as above); the
component formats it for display in the page language.

## Per-row values: accent

Accent is a region select list. Since 1.1.0 **Row Accent** (`accentValue`, attribute 9,
Session State Value) colors each tile from the data: primary, success, warning or danger;
anything else, or null, uses the region Accent. Add to the query

```sql
       case when o.late_count > 0 then 'danger'
            when o.on_time_pct >= 95 then 'success' end as accent_value
```

and map `accentValue: ACCENT_VALUE` with a `column ACCENT_VALUE` entry. Decimals and
Duration stay region settings.
