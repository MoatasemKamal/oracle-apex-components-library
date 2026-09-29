# Design List: account team as avatar rows (APEXlang)

```apexlang
region account_team (
    name: Account Team
    type: plugin/designList
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
            select u.full_name                                             as title,
                   u.job_title                                             as subtitle,
                   to_char(u.pipeline_amount, 'FML999G999G990')            as meta,
                   upper(substr(u.first_name, 1, 1) || substr(u.last_name, 1, 1)) as initials,
                   case when u.on_leave = 'Y' then 'warning' else 'neutral' end    as state,
                   case when u.on_leave = 'Y' then 'On leave' end          as state_label,
                   apex_page.get_url(p_page => 40, p_items => 'P40_USER_ID', p_values => u.user_id) as link_url
              from account_team_v u
             where u.account_id = :P30_ACCOUNT_ID
             order by u.pipeline_amount desc
            ```
        pageItemsToSubmit: [
            P30_ACCOUNT_ID
        ]
    }
    settings {
        style: avatarRows
        title: TITLE
        subtitle: SUBTITLE
        meta: META
        initials: INITIALS
        state: STATE
        stateLabel: STATE_LABEL
        linkUrl: LINK_URL
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
    column SUBTITLE (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: SUBTITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column META (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: META
            dataType: varchar2
            primaryKey: false
        }
    )
    column INITIALS (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: INITIALS
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
    column STATE_LABEL (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: STATE_LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_URL (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_URL
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Change `style` to any entry name (`fileRows`, `checklist`, `leaderboard`, `contacts`,
`settings`, `notifications`, `inbox`, `metricRows`, `compact`, `pills`). Leaderboard and
Metric rows also map `value` (a plain number) and `valueMax`. Confirm `pageItemsToSubmit`
placement with the apexlang grammar contract for your build
(`apexctl apexlang grammar contract --components region --groups source`).
