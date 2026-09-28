# Circular Progress: KPI gauges (APEXlang)

```apexlang
region project_gauges (
    name: Project Health
    type: plugin/circularProgress
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: #DEFAULT#
    }
    componentAppearance {
        display: report
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select metric_name                                   as label,
                   metric_value                                  as value,
                   metric_target                                 as max,
                   case when metric_value / metric_target >= .9 then 'danger'
                        when metric_value / metric_target >= .7 then 'warning'
                        else 'success' end                       as state
              from project_metrics_v
             where project_id = :P10_ID
             order by display_seq
            ```
        pageItemsToSubmit: [
            P10_ID
        ]
    }
    settings {
        value: VALUE
        max: MAX
        label: LABEL
        state: STATE
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
            dataType: number
            primaryKey: false
        }
    )
    column MAX (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: MAX
            dataType: number
            primaryKey: false
        }
    )
    column STATE (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: STATE
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Numbers are substituted into `data-*` attributes using the session's NLS format. If
your decimal separator is a comma, select `to_char(metric_value, 'FM9999990D99', 'NLS_NUMERIC_CHARACTERS=''.,''')`
so the gauge can parse the value.
