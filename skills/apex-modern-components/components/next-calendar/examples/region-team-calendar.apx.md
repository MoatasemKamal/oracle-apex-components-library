# Next Calendar: team events as a smart month calendar (APEXlang)

```apexlang
region team_calendar (
    name: Team Calendar
    type: plugin/nextCalendar
    layout {
        sequence: 20
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
            select e.event_id,
                   to_char(e.starts_at, 'YYYY-MM-DD"T"HH24:MI')          as start_date,
                   to_char(e.ends_at,   'YYYY-MM-DD"T"HH24:MI')          as end_date,
                   case when e.all_day = 'Y' then 'Y' else 'N' end        as all_day,
                   e.title                                                as title,
                   e.location || ' - ' || e.owner_name                   as description,
                   e.team                                                 as category,
                   case e.status
                     when 'CONFIRMED' then 'success'
                     when 'AT_RISK'   then 'warning'
                     when 'OVERDUE'   then 'danger'
                     when 'FYI'       then 'info'
                     else 'neutral'
                   end                                                    as state,
                   apex_page.get_url(p_page => 20, p_items => 'P20_EVENT_ID', p_values => e.event_id) as link_url,
                   to_char(e.order_value, 'TM9', 'NLS_NUMERIC_CHARACTERS=''.,''') as event_value,
                   to_char(e.starts_at, 'Dy DD Mon HH24:MI')              as date_text
              from team_events e
             where e.starts_at >= add_months(trunc(sysdate, 'MM'), -3)
               and e.starts_at <  add_months(trunc(sysdate, 'MM'), 9)
             order by e.starts_at
            ```
    }
    settings {
        style: month
        startDate: START_DATE
        endDate: END_DATE
        title: TITLE
        description: DESCRIPTION
        category: CATEGORY
        state: STATE
        linkUrl: LINK_URL
        allDay: ALL_DAY
        value: EVENT_VALUE
        dateLabel: DATE_TEXT
        firstDay: monday
        calendarSystem: gregory
    }
    column EVENT_ID (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: EVENT_ID
            dataType: number
            primaryKey: true
        }
    )
    column START_DATE (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: START_DATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column END_DATE (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: END_DATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column ALL_DAY (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: ALL_DAY
            dataType: varchar2
            primaryKey: false
        }
    )
    column TITLE (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: TITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column DESCRIPTION (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: DESCRIPTION
            dataType: varchar2
            primaryKey: false
        }
    )
    column CATEGORY (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: CATEGORY
            dataType: varchar2
            primaryKey: false
        }
    )
    column STATE (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: STATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_URL (
        layout {
            sequence: 90
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column EVENT_VALUE (
        layout {
            sequence: 100
        }
        source {
            type: databaseColumn
            databaseColumn: EVENT_VALUE
            dataType: varchar2
            primaryKey: false
        }
    )
    column DATE_TEXT (
        layout {
            sequence: 110
        }
        source {
            type: databaseColumn
            databaseColumn: DATE_TEXT
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Change `style` to any entry name (`agenda`, `week`, `heatmap`, `timelineLanes`, `posterDay`,
`flipDate`, `countdown`, `circularYear`, `miniDots`). Style-specific settings: `dayStart` and
`dayEnd` (week, hours 0 to 24), `laneZoom` (timelineLanes: `day`, `week`, `month`) and
`upcomingCount` (countdown). Set `calendarSystem: islamicUmalqura` for Hijri months and
`initialDate` (YYYY-MM-DD, or `&P20_DATE.` holding that format) to open on another day.

Notes:
- Return dates as text with `TO_CHAR(..., 'YYYY-MM-DD"T"HH24:MI')`; for all-day rows return the
  last day as End Date (inclusive). Timed End Date is exclusive.
- Pagination: keep the query to the window users will browse (here -3 to +9 months) and set the
  region's rows per page high enough, because the calendar only knows the rows it receives.
- `EVENT_VALUE` is converted with `TO_CHAR(..., 'TM9', 'NLS_NUMERIC_CHARACTERS=''.,''')` so the heatmap
  gets a period decimal whatever the session language; `DATE_TEXT` is only shown
  when JavaScript is off.
- Confirm column and setting placement with the apexlang grammar contract for your build
  (`apexctl apexlang grammar contract --components region --groups source`).
