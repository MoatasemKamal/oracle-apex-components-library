# Next Pricing: report region (APEXlang, APEX 26.1+)

Replace table/column names with objects proven from your schema. Settings reference
**projected column aliases**; select-list settings take the entry **name** (`flipAnnual`),
not the display label. Features are joined with `|`; the runtime file turns them into a
list. `highlight` returns `Y` for the recommended plan. `annualPrice` and `savings` are only
used by `flipAnnual`; the same query works for every other style.

```apexlang
region subscription_plans (
    name: Subscription Plans
    type: plugin/nextPricing
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
                   apex_page.get_url(p_page   => 20,
                                     p_items  => 'P20_PLAN_ID',
                                     p_values => p.plan_id)          as cta_url,
                   p.badge_text                                      as badge,
                   case when p.is_recommended = 1 then 'Y' end       as highlight,
                   to_char(p.annual_fee, 'FML999G999G990')           as annual_fmt,
                   'Save ' || round(100 * (1 - p.annual_fee
                         / nullif(12 * p.monthly_fee, 0))) || '%'    as savings
              from subscription_plans p
             where p.is_active = 1
             order by p.display_seq
            ```
    }
    settings {
        style: flipAnnual
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
        annualPrice: ANNUAL_FMT
        savings: SAVINGS
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
    column ANNUAL_FMT (
        layout {
            sequence: 110
        }
        source {
            type: databaseColumn
            databaseColumn: ANNUAL_FMT
            dataType: varchar2
            primaryKey: false
        }
    )
    column SAVINGS (
        layout {
            sequence: 120
        }
        source {
            type: databaseColumn
            databaseColumn: SAVINGS
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

`CTA_URL` is built by the application (developer-controlled), never taken from user input.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Next Pricing [Plug-in]** > Appearance: *Multiple (Report)*, set Style
to *Flip Annual - depth*, then map the settings to the columns above.
