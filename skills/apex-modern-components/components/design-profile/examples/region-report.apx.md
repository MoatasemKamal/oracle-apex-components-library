# Design Profile: report region (APEXlang, APEX 26.1+)

Replace table/column names with objects proven from your schema. Settings reference
**projected column aliases**; select-list settings take the entry **name** (`stats`),
not the display label. Captions are selected as literal columns so they can be
translated or changed in SQL.

```apexlang
region sales_team (
    name: Sales Team
    type: plugin/designProfile
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: [
            #DEFAULT#
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
            select e.first_name || ' ' || e.last_name                  as full_name,
                   e.job_title                                         as job_title,
                   case when e.photo_blob is not null then
                        apex_util.get_blob_file_src('P10_PHOTO', e.emp_id)
                   end                                                 as photo_url,
                   upper(substr(e.first_name, 1, 1)
                         || substr(e.last_name, 1, 1))                 as initials,
                   e.short_bio                                         as bio,
                   e.presence                                          as presence,
                   to_char(s.open_deals, 'FM999G990')                  as open_deals,
                   to_char(s.pipeline_amount / 1e6, 'FM990D0') || 'M'  as pipeline_fmt,
                   to_char(s.win_rate_pct, 'FM990') || '%'             as win_rate,
                   apex_page.get_url(p_page => 20,
                                     p_items => 'P20_EMP_ID',
                                     p_values => e.emp_id)             as profile_url,
                   'Deals'                                             as deals_lbl,
                   'Pipeline'                                          as pipeline_lbl,
                   'Win rate'                                          as win_rate_lbl,
                   'View profile'                                      as link_lbl
              from employees e
              join sales_rep_stats_v s on s.emp_id = e.emp_id
             where e.department_id = :P10_DEPARTMENT_ID
             order by e.last_name
            ```
    }
    settings {
        style: stats
        name: FULL_NAME
        role: JOB_TITLE
        imageUrl: PHOTO_URL
        initials: INITIALS
        bio: BIO
        status: PRESENCE
        stat1Value: OPEN_DEALS
        stat1Label: DEALS_LBL
        stat2Value: PIPELINE_FMT
        stat2Label: PIPELINE_LBL
        stat3Value: WIN_RATE
        stat3Label: WIN_RATE_LBL
        linkUrl: PROFILE_URL
        linkLabel: LINK_LBL
    }
    column FULL_NAME (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: FULL_NAME
            dataType: varchar2
            primaryKey: false
        }
    )
    column JOB_TITLE (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: JOB_TITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column PHOTO_URL (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: PHOTO_URL
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
    column BIO (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: BIO
            dataType: varchar2
            primaryKey: false
        }
    )
    column PRESENCE (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: PRESENCE
            dataType: varchar2
            primaryKey: false
        }
    )
    column OPEN_DEALS (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: OPEN_DEALS
            dataType: varchar2
            primaryKey: false
        }
    )
    column PIPELINE_FMT (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: PIPELINE_FMT
            dataType: varchar2
            primaryKey: false
        }
    )
    column WIN_RATE (
        layout {
            sequence: 90
        }
        source {
            type: databaseColumn
            databaseColumn: WIN_RATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column PROFILE_URL (
        layout {
            sequence: 100
        }
        source {
            type: databaseColumn
            databaseColumn: PROFILE_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column DEALS_LBL (
        layout {
            sequence: 110
        }
        source {
            type: databaseColumn
            databaseColumn: DEALS_LBL
            dataType: varchar2
            primaryKey: false
        }
    )
    column PIPELINE_LBL (
        layout {
            sequence: 120
        }
        source {
            type: databaseColumn
            databaseColumn: PIPELINE_LBL
            dataType: varchar2
            primaryKey: false
        }
    )
    column WIN_RATE_LBL (
        layout {
            sequence: 130
        }
        source {
            type: databaseColumn
            databaseColumn: WIN_RATE_LBL
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_LBL (
        layout {
            sequence: 140
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_LBL
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

`PRESENCE` should return online, away, busy or offline; any other text is shown
as a neutral status.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Design Profile [Plug-in]** > Appearance: *Multiple (Report)*,
set Style to *Stats*, then map Name, Role, Image URL, Initials, Bio, Status, the
Stat values and Link URL and the caption columns to the columns above.
