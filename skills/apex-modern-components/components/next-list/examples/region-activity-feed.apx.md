# Next List: live activity feed (APEXlang)

```apexlang
region activity_feed (
    name: Activity
    type: plugin/nextList
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
            select a.headline                                        as title,
                   a.summary                                         as subtitle,
                   apex_util.get_since(a.created_on)                 as meta,
                   a.icon_class                                      as icon,
                   case a.kind
                     when 'PAYMENT' then 'success'
                     when 'ORDER'   then 'info'
                     when 'STOCK'   then 'warning'
                     when 'ERROR'   then 'danger'
                     else 'neutral'
                   end                                               as state,
                   a.status_text                                     as state_label,
                   apex_page.get_url(p_page   => 30,
                                     p_items  => 'P30_ID',
                                     p_values => a.id)               as link_url
              from app_activity a
             order by a.created_on desc
             fetch first 8 rows only
            ```
    }
    settings {
        style: animatedFeed
        title: TITLE
        subtitle: SUBTITLE
        meta: META
        icon: ICON
        state: STATE
        stateLabel: STATE_LABEL
        linkUrl: LINK_URL
    }
    column TITLE (
        source {
            type: databaseColumn
            databaseColumn: TITLE
            dataType: varchar2
        }
    )
    column SUBTITLE (
        source {
            type: databaseColumn
            databaseColumn: SUBTITLE
            dataType: varchar2
        }
    )
    column META (
        source {
            type: databaseColumn
            databaseColumn: META
            dataType: varchar2
        }
    )
    column ICON (
        source {
            type: databaseColumn
            databaseColumn: ICON
            dataType: varchar2
        }
    )
    column STATE (
        source {
            type: databaseColumn
            databaseColumn: STATE
            dataType: varchar2
        }
    )
    column STATE_LABEL (
        source {
            type: databaseColumn
            databaseColumn: STATE_LABEL
            dataType: varchar2
        }
    )
    column LINK_URL (
        source {
            type: databaseColumn
            databaseColumn: LINK_URL
            dataType: varchar2
        }
    )
)
```

Change `style` to any entry name: `marqueeLogos` (map `imageUrl` to a logo URL), `spotlightRows`,
`stack3d`, `liftRows`, `neoBrutal`, `clay`, `terminal` (return a time such as `09:41:07` as
`meta`), `accordionRows` (also map `details`) or `scrollReveal`. Confirm column attributes with
the apexlang grammar contract for your build
(`apexctl apexlang grammar contract --components region`).
