# Next Button: report region (APEXlang, APEX 26.1+)

An action bar of Next Collection buttons for a customer page. Replace table and column names
with objects proven from your schema. Settings reference **projected column aliases**;
select-list settings take the entry **name** (`keycap`, `large`).

```apexlang
region customer_actions (
    name: Customer Actions
    type: plugin/nextButton
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
                   a.icon_class                                      as icon,
                   a.shortcut_label                                  as hint,
                   case when a.is_destructive = 'Y' then 'danger'
                        else 'primary' end                           as color
              from customer_quick_actions a
             where a.is_enabled = 'Y'
             order by a.display_seq
            ```
    }
    settings {
        style: keycap
        label: LABEL
        linkUrl: LINK_URL
        icon: ICON
        hint: HINT
        color: COLOR
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
    column HINT (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: HINT
            dataType: varchar2
            primaryKey: false
        }
    )
    column COLOR (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: COLOR
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Next Button [Plug-in]** > Appearance: *Multiple (Report)*, set Style,
then map Label, Link, Icon, Hint and Color to the columns above. For a single call to action
use *Single (Partial)* with static values, for example Style *Confirm hold*, Label
*Delete Invoice*, Hint *Hold to confirm*, Color *danger*.
