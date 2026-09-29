# Next Hero: hero fed by a SQL query (APEXlang)

Every text of the hero can come from one query row, for example a period-end banner that states the real counts. Partial mode renders **one row**: make the query return exactly one row (aggregate, or filter by the page's key). If it returns no row the region renders nothing; add `fetch first 1 rows only` when several rows are possible.

Tables and columns (`orders`, `invoices`, `employees`, `customers` and so on) are **placeholders**: replace them with objects proven from your schema before generating the page.

```apexlang
region close_hero (
    name: Close Hero
    type: plugin/nextHero
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
            select 'Period ' || to_char(sysdate, 'Mon YYYY')                          as eyebrow,
                   'Close the month'                                                   as title,
                   count(case when i.status = 'PENDING_APPROVAL' then 1 end)
                     || ' invoices still need approval'                                 as highlight,
                   'Overdue: ' || count(case when i.status = 'OVERDUE' then 1 end)
                     || ', paid this month: '
                     || count(case when i.paid_on >= trunc(sysdate, 'MM') then 1 end)    as subtitle,
                   apex_page.get_url(p_page => 15)                                     as primary_url,
                   'Review approvals'                                                  as primary_label
              from invoices i
            ```
    }
    settings {
        style: aurora
        eyebrow: EYEBROW
        title: TITLE
        highlight: HIGHLIGHT
        subtitle: SUBTITLE
        primaryUrl: PRIMARY_URL
        primaryLabel: PRIMARY_LABEL
    }
    column EYEBROW (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: EYEBROW
            dataType: varchar2
            primaryKey: false
        }
    )
    column TITLE (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: TITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column HIGHLIGHT (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: HIGHLIGHT
            dataType: varchar2
            primaryKey: false
        }
    )
    column SUBTITLE (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: SUBTITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column PRIMARY_URL (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: PRIMARY_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column PRIMARY_LABEL (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: PRIMARY_LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Style is a layout choice and stays on the region; show a different look to different users with two regions and server-side conditions.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Next Hero [Plug-in]** > Source: SQL Query > Appearance: *Single (Partial)*, then map each text setting to its column.
