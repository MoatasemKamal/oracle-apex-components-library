# Design Pricing: report region (APEXlang, APEX 26.1+)

Replace table/column names with objects proven from your schema. Settings reference
**projected column aliases**; select-list settings take the entry **name** (`highlighted`),
not a display label. Features are joined with `|`; the runtime file turns them into a list.

```apexlang
region subscription_plans (
    name: Subscription Plans
    type: plugin/designPricing
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
            select p.plan_name                                       as plan_name,
                   to_char(p.monthly_fee, 'FML999G999G990')          as price_fmt,
                   p.currency_code                                   as currency,
                   '/ month'                                         as period,
                   p.tagline                                         as description,
                   (select listagg(f.feature_text, '|')
                             within group (order by f.display_seq)
                      from plan_features f
                     where f.plan_id = p.plan_id)                    as features,
                   'Choose ' || p.plan_name                          as cta_label,
                   apex_page.get_url(p_page => 20,
                                     p_items => 'P20_PLAN_ID',
                                     p_values => p.plan_id)          as cta_url,
                   p.badge_text                                      as badge,
                   case when p.is_recommended = 'Y' then 'Y'
                        else 'N' end                                 as highlight
              from subscription_plans p
             where p.is_active = 'Y'
             order by p.display_seq
            ```
    }
    settings {
        style: highlighted
        plan: PLAN_NAME
        price: PRICE_FMT
        currency: CURRENCY
        period: PERIOD
        description: DESCRIPTION
        features: FEATURES
        ctaLabel: CTA_LABEL
        ctaUrl: CTA_URL
        badge: BADGE
        highlight: HIGHLIGHT
    }
    column PLAN_NAME (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: PLAN_NAME
            dataType: varchar2
            primaryKey: false
        }
    )
    column PRICE_FMT (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: PRICE_FMT
            dataType: varchar2
            primaryKey: false
        }
    )
    column CURRENCY (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: CURRENCY
            dataType: varchar2
            primaryKey: false
        }
    )
    column PERIOD (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: PERIOD
            dataType: varchar2
            primaryKey: false
        }
    )
    column DESCRIPTION (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: DESCRIPTION
            dataType: varchar2
            primaryKey: false
        }
    )
    column FEATURES (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: FEATURES
            dataType: varchar2
            primaryKey: false
        }
    )
    column CTA_LABEL (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: CTA_LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
    column CTA_URL (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: CTA_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column BADGE (
        layout {
            sequence: 90
        }
        source {
            type: databaseColumn
            databaseColumn: BADGE
            dataType: varchar2
            primaryKey: false
        }
    )
    column HIGHLIGHT (
        layout {
            sequence: 100
        }
        source {
            type: databaseColumn
            databaseColumn: HIGHLIGHT
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Design Pricing [Plug-in]** > Appearance: *Multiple (Report)*, set Style,
then map Plan, Price, Currency, Period, Description, Features, Button Label, Button Link,
Badge and Highlight to the columns above.
