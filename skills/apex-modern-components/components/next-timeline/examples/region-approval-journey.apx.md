# Next Timeline: approval journey with a pulsing current step (APEXlang)

```apexlang
region approval_journey (
    name: Approval Progress
    type: plugin/nextTimeline
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
            select s.step_name                                    as title,
                   s.step_note                                    as body,
                   to_char(s.due_on, 'DD Mon YYYY')            as event_date,
                   s.icon_class                                   as icon,
                   case s.status
                     when 'DONE'    then 'success'
                     when 'ACTIVE'  then 'current'
                     when 'WARN'    then 'warning'
                     when 'FAIL'    then 'danger'
                     else 'neutral'
                   end                                            as state,
                   s.owner_team                                   as tag
              from approval_steps s
             where s.request_id = :P20_ID
             order by s.seq
            ```
        pageItemsToSubmit: [
            P20_ID
        ]
    }
    settings {
        style: pulseNow
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

Change `style` to any entry name (`beamRail`, `perspectiveRoad`, `stackedCards3d`, `neoBrutal`,
`clay`, `kineticYears`, `metroLine`, `scrollProgress`, `expandSteps`). Return `current` for the
active step and `neutral` for steps not reached yet. Confirm `pageItemsToSubmit` placement with
the apexlang grammar contract for your build
(`apexctl apexlang grammar contract --components region --groups source`).
