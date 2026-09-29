# Motion Spotlight Cards: app launchpad (APEXlang)

```apexlang
region launchpad_cards (
    name: Launchpad
    type: plugin/motionSpotlightCards
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
        display: report
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select t.title,
                   t.description                               as text,
                   t.icon_class                                as icon,
                   t.badge_text                                as badge,
                   apex_page.get_url(p_page => t.target_page)  as link_url
              from launchpad_tiles t
             order by t.display_seq
            ```
    }
    settings {
        title: TITLE
        text: TEXT
        icon: ICON
        badge: BADGE
        linkUrl: LINK_URL
        columns: three
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
    column TEXT (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: TEXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column ICON (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: ICON
            dataType: varchar2
            primaryKey: false
        }
    )
    column BADGE (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: BADGE
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
