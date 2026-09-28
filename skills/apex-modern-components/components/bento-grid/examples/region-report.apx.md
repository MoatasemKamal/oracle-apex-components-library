# Bento Grid: home page launchpad (APEXlang)

```apexlang
region launchpad (
    name: Launchpad
    type: plugin/bentoGrid
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
                   t.description,
                   t.icon_class                                   as icon,
                   apex_page.get_url(p_page => t.target_page)     as link_url,
                   'Open'                                         as link_label,
                   t.tile_span                                    as span
              from launchpad_tiles t
             where apex_authorization.is_authorized(t.auth_scheme) = true
             order by t.display_seq
            ```
    }
    settings {
        title: TITLE
        description: DESCRIPTION
        icon: ICON
        linkUrl: LINK_URL
        linkLabel: LINK_LABEL
        span: SPAN
        rowHeight: compact
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
    column LINK_URL (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_LABEL (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
    column SPAN (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: SPAN
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

`apex_authorization.is_authorized(...) = true` in SQL needs APEX 23.1+ boolean-in-SQL
support on Oracle Database 23ai; on older databases filter tiles with a PL/SQL function
that returns 'Y'/'N', or use the region's server-side conditions per tile source.
