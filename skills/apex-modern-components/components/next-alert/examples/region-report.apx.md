# Next Alert: report region (APEXlang, APEX 26.1+)

Recent order events as a 3D stack of toasts that fans out on hover, keyboard focus and
touch devices. Style is region-level and takes the entry **name** (`stackedToasts`);
the other settings reference **projected column aliases**. Replace table and column
names with objects proven from your schema. Danger rows are announced with role=alert,
all others with role=status.

```apexlang
region order_alerts (
    name: Order Alerts
    type: plugin/nextAlert
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
            select case e.severity
                     when 'ERROR' then 'danger'
                     when 'WARN'  then 'warning'
                     when 'OK'    then 'success'
                     else 'info' end                           as alert_state,
                   e.headline                                  as alert_title,
                   e.details                                   as alert_message,
                   apex_util.get_since(e.created_on)           as alert_meta,
                   apex_page.get_url(p_page   => 20,
                                     p_items  => 'P20_ORDER_ID',
                                     p_values => e.order_id)   as alert_url,
                   'Open order'                                as alert_link_label
              from order_events e
             where e.created_on > sysdate - 1
             order by e.created_on desc
             fetch first 3 rows only
            ```
    }
    settings {
        style: stackedToasts
        state: ALERT_STATE
        title: ALERT_TITLE
        message: ALERT_MESSAGE
        meta: ALERT_META
        linkUrl: ALERT_URL
        linkLabel: ALERT_LINK_LABEL
    }
    column ALERT_STATE (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: ALERT_STATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column ALERT_TITLE (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: ALERT_TITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column ALERT_MESSAGE (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: ALERT_MESSAGE
            dataType: varchar2
            primaryKey: false
        }
    )
    column ALERT_META (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: ALERT_META
            dataType: varchar2
            primaryKey: false
        }
    )
    column ALERT_URL (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: ALERT_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column ALERT_LINK_LABEL (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: ALERT_LINK_LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

For a single banner choose `display: partial` with static values, for example
`style: pulseCritical`, `state: danger`, or `style: tickerBar` for an announcement bar.
Stacked Toasts shows the first three rows as the stack; fetch three to five rows.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Next Alert [Plug-in]** > Appearance: *Multiple (Report)*, set
Style, then map State, Title, Message, Meta Text, Link URL and Link Label to the columns
above. For a single alert choose *Single (Partial)* and enter static values.
