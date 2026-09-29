# Next Bento: home page launchpad (APEXlang)

A report-mode bento launchpad on the home page. Each row of `launchpad_tiles` is one
tile; `span` builds the bento layout and `featured` marks the tile the style emphasises
(the beam tile in `beamFeature`, the cover story in `magazine`, the panel that is open
first in `expandingTiles`). Change `style` to any of: spotlightGlow, beamFeature,
tiltTiles, layeredGlass, neoBrutal, clay, auroraMosaic, gridPattern, magazine,
expandingTiles.

```apexlang
region launchpad (
    name: Launchpad
    type: plugin/nextBento
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
                   t.module_name                                   as eyebrow,
                   t.description,
                   t.icon_class                                    as icon,
                   to_char(k.metric_value, 'FM999G999G990')        as value,
                   k.metric_label                                  as value_label,
                   case when k.overdue_count > 0 then 'danger'
                        when k.waiting_count > 0 then 'warning'
                   end                                             as state,
                   apex_page.get_url(p_page => t.target_page)      as link_url,
                   'Open'                                          as link_label,
                   t.tile_span                                     as span,
                   case when t.is_featured = 'Y' then 'Y' end      as featured
              from launchpad_tiles t
              left join launchpad_kpis k on k.tile_id = t.id
             where apex_authorization.is_authorized(t.auth_scheme) = true
             order by t.display_seq
            ```
    }
    settings {
        style: beamFeature
        title: TITLE
        eyebrow: EYEBROW
        description: DESCRIPTION
        icon: ICON
        value: VALUE
        valueLabel: VALUE_LABEL
        state: STATE
        linkUrl: LINK_URL
        linkLabel: LINK_LABEL
        span: SPAN
        featured: FEATURED
        rowHeight: standard
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
    column EYEBROW (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: EYEBROW
            dataType: varchar2
            primaryKey: false
        }
    )
    column DESCRIPTION (
        layout {
            sequence: 30
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
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: ICON
            dataType: varchar2
            primaryKey: false
        }
    )
    column VALUE (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE
            dataType: varchar2
            primaryKey: false
        }
    )
    column VALUE_LABEL (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE_LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
    column STATE (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: STATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_URL (
        layout {
            sequence: 80
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
            sequence: 90
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
            sequence: 100
        }
        source {
            type: databaseColumn
            databaseColumn: SPAN
            dataType: varchar2
            primaryKey: false
        }
    )
    column FEATURED (
        layout {
            sequence: 110
        }
        source {
            type: databaseColumn
            databaseColumn: FEATURED
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Notes

- `span` returns `normal`, `wide`, `tall` or `large`; four columns when the region is
  at least 48rem wide, two columns below that, one column below 30rem (container
  queries, so a narrow side column behaves like a phone).
- For a full four-column grid, let the spans add up to a multiple of four cells
  (large = 4, wide and tall = 2, normal = 1).
- `apex_authorization.is_authorized(...) = true` in SQL needs boolean-in-SQL support
  (Oracle Database 23ai); on older databases use a PL/SQL function returning 'Y'/'N'.
