# Motion Stagger List: activity feed (APEXlang)

```apexlang
region activity_feed (
    name: Recent Activity
    type: plugin/motionStaggerList
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
            select e.title,
                   e.details                                       as description,
                   apex_util.get_since(e.created_on)               as meta,
                   e.icon_class                                    as icon,
                   apex_page.get_url(p_page => 30, p_items => 'P30_ID', p_values => e.id) as link_url
              from activity_events e
             order by e.created_on desc
             fetch first 15 rows only
            ```
    }
    settings {
        title: TITLE
        description: DESCRIPTION
        meta: META
        icon: ICON
        linkUrl: LINK_URL
        entrance: slide
        dividers: true
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
    column LINK_URL (
        layout {
            sequence: 50
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

Refreshing the region (for example from a Dynamic Action every minute) replays the
entrance for the new rows.
