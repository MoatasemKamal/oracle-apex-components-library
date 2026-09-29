# Design Button: report region (APEXlang, APEX 26.1+)

An action bar of link buttons. Replace table/column names with objects proven from your
schema. Settings reference **projected column aliases**; select-list settings take the
entry **name** (`pillArrow`, `large`).

```apexlang
region order_actions (
    name: Order Actions
    type: plugin/designButton
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
            select a.action_label                                    as label,
                   apex_page.get_url(p_page => a.target_page)        as link_url,
                   a.icon_class                                      as icon
              from order_quick_actions a
             where a.is_enabled = 'Y'
             order by a.display_seq
            ```
    }
    settings {
        style: pillArrow
        label: LABEL
        linkUrl: LINK_URL
        icon: ICON
        size: large
    }
    column LABEL (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_URL (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_URL
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
)
```

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Design Button [Plug-in]** > Appearance: *Multiple (Report)*, set Style
and Size, then map Label, Link and Icon to the columns above. For a single button use
*Single (Partial)* and enter static values or page items.
