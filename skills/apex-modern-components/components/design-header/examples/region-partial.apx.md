# Design Header: partial region (APEXlang)

A compact page hero at the top of the Orders page. Static settings only, so no source
query is needed. The buttons render as native Universal Theme buttons (hot + normal).

```apexlang
region orders_hero (
    name: Orders Hero
    type: plugin/designHeader
    layout {
        sequence: 5
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
    settings {
        style: gradientHero
        eyebrow: Sales workspace
        title: Customer Orders
        subtitle: 12 orders are waiting for approval and 3 invoices are due this week.
        icon: fa-shopping-cart
        primaryUrl: f?p=&APP_ID.:15:&SESSION.
        primaryLabel: Create Order
        secondaryUrl: f?p=&APP_ID.:30:&SESSION.
        secondaryLabel: Import Orders
    }
)
```

For `style: imageOverlay` or `style: split`, add `imageUrl: #APP_FILES#hero-warehouse.jpg`.
Whether static text is accepted directly for a *Session State Value* setting varies by
build; if the compiler rejects it, select the text as a column from `dual` instead.
