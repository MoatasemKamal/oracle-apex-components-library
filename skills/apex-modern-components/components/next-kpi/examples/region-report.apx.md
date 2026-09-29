# Next KPI: report region (APEXlang, APEX 26.1+)

Replace table/column names with objects proven from your schema. Settings reference
**projected column aliases**; select-list settings take the entry **name** (`bentoTile`),
not the display label. The same query feeds every style: `liquidFill` and `adaptive`
use `percent`, `tilt`, `auroraGlow` and `neoBrutal` use `series`. For `flipDetail`, also
project `compareValue`, `compareLabel` and `breakdown` (`name: value|name: value`).
In `bentoTile` the first row becomes the large tile when the region is at least 30rem wide;
in `adaptive` the first row becomes a full-width row, the next two big numbers and the rest chips.

```apexlang
region revenue_kpis (
    name: Revenue KPIs
    type: plugin/nextKpi
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
                   k.lower_is_better                               as lower_is_better,
                   to_char(round(100 * k.actual_amount
                         / nullif(k.target_amount, 0), 1),
                           'FM990D0', 'NLS_NUMERIC_CHARACTERS=''.,''') as pct,
                   (select listagg(to_char(h.amount, 'TM9',
                                   'NLS_NUMERIC_CHARACTERS=''.,'''), ',')
                             within group (order by h.period_start)
                      from kpi_history h
                     where h.kpi_id = k.kpi_id)                    as series_txt,
                   k.icon_class                                    as icon,
                   k.footnote                                      as description
              from sales_kpi_v k
             order by k.display_seq
            ```
    }
    settings {
        style: bentoTile
        label: LABEL
        value: VALUE_FMT
        unit: UNIT
        change: CHANGE_TXT
        trend: TREND
        lowerIsBetter: LOWER_IS_BETTER
        percent: PCT
        series: SERIES_TXT
        icon: ICON
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
    column LOWER_IS_BETTER (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: LOWER_IS_BETTER
            dataType: varchar2
            primaryKey: false
        }
    )
    column PCT (
        layout {
            sequence: 70
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
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: SERIES_TXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column ICON (
        layout {
            sequence: 90
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
            sequence: 100
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

`LOWER_IS_BETTER` returns `Y` or `N` per row and maps to the per-row **Row Lower Is Better** setting (attribute 15); the region-level `invertTrend` switch (yes/no, static) is the fallback for rows that return null. `PCT` and `SERIES_TXT` are produced with a period as
decimal separator, as the Percent and Series settings expect.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Next KPI [Plug-in]** > Appearance: *Multiple (Report)*, set Style to
*Bento Tile - smart*, then map the settings to the columns above.
