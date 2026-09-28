# Stat Card: report region (APEXlang, APEX 26.1+)

Replace table/column names with objects proven from your schema. Settings reference
**projected column aliases**; select-list settings take the entry **name** (`three`),
not the return value.

```apexlang
region sales_kpis (
    name: Sales KPIs
    type: plugin/statCard
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
            select kpi_label                                   as label,
                   to_char(kpi_value, 'FML999G999G999G990')    as value_fmt,
                   kpi_unit                                    as unit,
                   to_char(change_pct, 'S990D0') || '%'        as change_txt,
                   case when change_pct > 0 then 'up'
                        when change_pct < 0 then 'down'
                        else 'flat' end                        as trend,
                   kpi_icon                                    as icon,
                   'vs. last month'                            as description
              from sales_kpi_v
             order by display_seq
            ```
    }
    settings {
        label: LABEL
        value: VALUE_FMT
        suffix: UNIT
        change: CHANGE_TXT
        trend: TREND
        icon: ICON
        description: DESCRIPTION
        columns: three
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
    column VALUE_FMT (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE_FMT
            dataType: varchar2
            primaryKey: false
        }
    )
    column UNIT (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: UNIT
            dataType: varchar2
            primaryKey: false
        }
    )
    column CHANGE_TXT (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: CHANGE_TXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column TREND (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: TREND
            dataType: varchar2
            primaryKey: false
        }
    )
    column ICON (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: ICON
            dataType: varchar2
            primaryKey: false
        }
    )
    column DESCRIPTION (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: DESCRIPTION
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Stat Card [Plug-in]** > Appearance: *Multiple (Report)*, then map
Label, Value, Unit, Change, Trend, Icon and Description to the columns above.
