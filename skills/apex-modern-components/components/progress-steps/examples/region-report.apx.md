# Progress Steps: approval workflow for the current record (APEXlang)

```apexlang
region approval_steps (
    name: Approval Progress
    type: plugin/progressSteps
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
            select s.step_name                                   as title,
                   to_char(s.completed_on, 'DD Mon')             as description,
                   case
                     when s.failed = 'Y'          then 'error'
                     when s.completed_on is not null then 'complete'
                     when s.step_seq = r.current_step then 'current'
                     else 'upcoming'
                   end                                           as status
              from request_steps s
              join requests r on r.id = s.request_id
             where s.request_id = :P10_ID
             order by s.step_seq
            ```
        pageItemsToSubmit: [
            P10_ID
        ]
    }
    settings {
        title: TITLE
        description: DESCRIPTION
        status: STATUS
        orientation: horizontal
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
    column DESCRIPTION (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: DESCRIPTION
            dataType: varchar2
            primaryKey: false
        }
    )
    column STATUS (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: STATUS
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Confirm `pageItemsToSubmit` placement with the apexlang grammar contract for your
build (`apexctl apexlang grammar contract --components region --groups source`).
