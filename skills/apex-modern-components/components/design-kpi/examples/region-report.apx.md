# Design KPI: report region (APEXlang, APEX 26.1+)

Replace table/column names with objects proven from your schema. Settings reference
**projected column aliases**; select-list settings take the entry **name** (`targetBar`),
not the display label. The same query also feeds the `ring` (uses `percent`),
`sparkBars` (uses `series`) and `compare` (uses `compareValue`) styles.

```apexlang
region sales_targets (
    name: Sales Targets
    type: plugin/designKpi
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
            select k.kpi_label                                     as label,
                   to_char(k.actual_amount, 'FML999G999G999G990')  as value_fmt,
                   k.unit_label                                    as unit,
                   to_char(k.change_pct, 'S990D0') || '%'          as change_txt,
                   case when k.change_pct > 0 then 'up'
                        when k.change_pct < 0 then 'down'
                        else 'flat' end                            as trend,
                   round(100 * k.actual_amount
                         / nullif(k.target_amount, 0), 1)          as pct,
                   (select listagg(to_char(h.amount, 'TM9',
                                   'NLS_NUMERIC_CHARACTERS=''.,'''), ',')
                             within group (order by h.period_start)
                      from kpi_history h
                     where h.kpi_id = k.kpi_id)                    as series_txt,
                   to_char(k.target_amount, 'FML999G999G999G990')  as target_fmt,
                   'Fiscal year 2026'                              as description
              from sales_kpi_v k
             order by k.display_seq
            ```
    }
    settings {
        style: targetBar
        label: LABEL
        value: VALUE_FMT
        unit: UNIT
        change: CHANGE_TXT
        trend: TREND
        percent: PCT
        series: SERIES_TXT
        compareValue: TARGET_FMT
        description: DESCRIPTION
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
    column PCT (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: PCT
            dataType: number
            primaryKey: false
        }
    )
    column SERIES_TXT (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: SERIES_TXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column TARGET_FMT (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: TARGET_FMT
            dataType: varchar2
            primaryKey: false
        }
    )
    column DESCRIPTION (
        layout {
            sequence: 90
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

`PCT` is converted to text with a period decimal separator when it is substituted;
if your session uses a comma decimal separator, select
`to_char(..., 'FM990D0', 'NLS_NUMERIC_CHARACTERS=''.,''')` instead.

## Per-row values: lower is better

Down Is Good (`invertTrend`) is a region switch. Since 1.1.0 **Row Lower Is Better**
(`lowerIsBetter`, attribute 14, Session State Value) decides per row: Y/N, yes/no, true/false
or 1/0; empty uses the region switch. Add to the query

```sql
       case when k.kpi_code in ('COST', 'RETURNS', 'DEFECTS') then 'Y' end as lower_is_better
```

and to the region `settings { lowerIsBetter: LOWER_IS_BETTER }` plus a `column LOWER_IS_BETTER`
entry like the others. Style stays a region setting: it chooses the markup for every tile.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Design KPI [Plug-in]** > Appearance: *Multiple (Report)*, set
Style to *Target Bar*, then map Label, Value, Unit, Change, Trend, Percent, Series,
Compare Value and Description to the columns above.
