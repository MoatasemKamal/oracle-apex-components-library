# Next Hero: partial region (APEXlang)

A home-page hero at the top of the Finance workspace. Static settings only, so no
source query is needed. Style takes the entry **name** (`aurora`); the buttons render
as native Universal Theme buttons (hot + normal).

```apexlang
region finance_hero (
    name: Finance Hero
    type: plugin/nextHero
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
        style: aurora
        eyebrow: New: recurring invoices are live
        title: Close the quarter
        highlight: without the spreadsheet chase
        subtitle: Invoices, approvals and payments for all 14 entities in one place.
        primaryUrl: f?p=&APP_ID.:15:&SESSION.
        primaryLabel: Review Approvals
        secondaryUrl: f?p=&APP_ID.:30:&SESSION.
        secondaryLabel: Open Ledger
    }
)
```

Other styles: `meteors` suits a login page, `gridSpotlight` and `parallaxLayers` follow
the pointer (add `icon: fa-shopping-cart` for the parallax tile), `splitMorph` adapts to
the column width and uses `imageUrl: #APP_FILES#hero-warehouse.jpg` when set, and
`scrollReveal` is meant for a hero further down a long page. Whether static text is
accepted directly for a *Session State Value* setting varies by build; if the compiler
rejects it, select the text as a column from `dual` instead.
