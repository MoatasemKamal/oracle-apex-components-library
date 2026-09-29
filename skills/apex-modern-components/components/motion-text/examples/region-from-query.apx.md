# Motion Text: headline from a SQL query (APEXlang)

Text is a Session State Value: the headline, or several `|`-separated phrases for Typewriter and Scramble, can come from one query row. Partial mode renders **one row**: make the query return exactly one row (aggregate, or filter by the page's key). If it returns no row the region renders nothing; add `fetch first 1 rows only` when several rows are possible.

Tables and columns (`orders`, `invoices`, `employees`, `customers` and so on) are **placeholders**: replace them with objects proven from your schema before generating the page.

```apexlang
region welcome_headline (
    name: Welcome
    type: plugin/motionText
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
        display: partial
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select 'Welcome back, ' || e.first_name
                   || '|You have ' || count(t.task_id) || ' open tasks'
                   || '|' || count(case when t.due_date < trunc(sysdate) then 1 end)
                   || ' of them are overdue'                                      as headline
              from employees e
              left join tasks t on t.assignee_id = e.employee_id and t.status = 'OPEN'
             where e.user_name = :APP_USER
             group by e.first_name
            ```
    }
    settings {
        text: HEADLINE
        effect: typewriter
        size: large
        alignStart: true
    }
    column HEADLINE (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: HEADLINE
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Effect, Size and Align Start stay region settings because they choose the animation and layout for the whole region.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Motion Text [Plug-in]** > Source: SQL Query > Appearance: *Single (Partial)* > Text: column HEADLINE.
