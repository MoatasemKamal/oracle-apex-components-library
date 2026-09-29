# Design Timeline: order history as a timeline (APEXlang)

```apexlang
region order_history (
    name: Order History
    type: plugin/designTimeline
    layout {
        sequence: 30
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
            select e.event_title                                  as title,
                   e.event_note                                   as body,
                   to_char(e.created_on, 'DD Mon YYYY, HH24:MI')  as event_date,
                   e.icon_class                                   as icon,
                   case e.outcome
                     when 'OK'      then 'success'
                     when 'WARN'    then 'warning'
                     when 'FAIL'    then 'danger'
                     else 'neutral'
                   end                                            as state,
                   e.carrier                                      as tag
              from order_events e
             where e.order_id = :P20_ID
             order by e.created_on desc
            ```
        pageItemsToSubmit: [
            P20_ID
        ]
    }
    settings {
        style: dots
        title: TITLE
        body: BODY
        date: EVENT_DATE
        icon: ICON
        state: STATE
        tag: TAG
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
    column BODY (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: BODY
            dataType: varchar2
            primaryKey: false
        }
    )
    column EVENT_DATE (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: EVENT_DATE
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
    column STATE (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: STATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column TAG (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: TAG
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Change `style` to any entry name (`iconRail`, `alternating`, `cards`, `log`, `milestones`,
`changelog`, `numbered`, `dateBlocks`, `branch`). Confirm `pageItemsToSubmit` placement with
the apexlang grammar contract for your build
(`apexctl apexlang grammar contract --components region --groups source`).
