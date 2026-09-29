# Motion Effect: faces and label from a SQL query (APEXlang)

Label, Text and Back Text are Session State Values. A flip card can show this month's sales on the front and the target on the back, straight from the data. Partial mode renders **one row**: make the query return exactly one row (aggregate, or filter by the page's key). If it returns no row the region renders nothing; add `fetch first 1 rows only` when several rows are possible.

Tables and columns (`orders`, `invoices`, `employees`, `customers` and so on) are **placeholders**: replace them with objects proven from your schema before generating the page.

```apexlang
region sales_flip (
    name: Sales vs Target
    type: plugin/motionEffect
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
            select 'Sales this month against target'                                 as label,
                   to_char(sum(o.order_total), 'FML999G999G990')                       as text,
                   'Target ' || to_char(max(t.target_amount), 'FML999G999G990')        as back_text
              from orders o
              join sales_targets t on t.region_code = o.region_code
                                  and t.period = trunc(sysdate, 'MM')
             where o.order_date >= trunc(sysdate, 'MM')
               and o.region_code = :P1_REGION
            ```
        pageItemsToSubmit: [
            P1_REGION
        ]
    }
    settings {
        effect: flipCard
        speed: half
        label: LABEL
        text: TEXT
        backText: BACK_TEXT
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
    column BACK_TEXT (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: BACK_TEXT
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Effect, Size, Speed and Replay on Click are region settings: they pick the animation markup, which APEX renders once per region.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Motion Effect [Plug-in]** > Source: SQL Query > Appearance: *Single (Partial)*, Effect **Flip Card**, then map Label, Text and Back Text.
