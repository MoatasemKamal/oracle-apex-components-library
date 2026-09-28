# Avatar Group: task assignees (APEXlang)

The last row (`+N`) is added with a `union all`; its Overflow Text turns it into a counter.

```apexlang
region task_team (
    name: Team
    type: plugin/avatarGroup
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
            select name, initials, overflow_text
              from (
                    select u.display_name                         as name,
                           apex_string.get_initials(u.display_name) as initials,
                           null                                   as overflow_text,
                           row_number() over (order by u.display_name) as rn
                      from task_members m
                      join app_users u on u.id = m.user_id
                     where m.task_id = :P30_ID
                   )
             where rn <= 5
            union all
            select 'more', null, '+' || (count(*) - 5)
              from task_members
             where task_id = :P30_ID
            having count(*) > 5
            ```
        pageItemsToSubmit: [
            P30_ID
        ]
    }
    settings {
        name: NAME
        initials: INITIALS
        overflowText: OVERFLOW_TEXT
    }
    column NAME (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: NAME
            dataType: varchar2
            primaryKey: false
        }
    )
    column INITIALS (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: INITIALS
            dataType: varchar2
            primaryKey: false
        }
    )
    column OVERFLOW_TEXT (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: OVERFLOW_TEXT
            dataType: varchar2
            primaryKey: false
        }
    )
)
```
