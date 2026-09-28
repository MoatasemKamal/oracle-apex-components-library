# Empty State: partial region (APEXlang)

Static settings only, so no source query is needed. Show it with a server-side condition
(for example `not exists (select 1 from orders)`), next to the report it replaces.

```apexlang
region orders_empty (
    name: No Orders
    type: plugin/emptyState
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
        icon: fa-inbox
        title: No orders yet
        message: Orders you create will appear here.
        linkUrl: f?p=&APP_ID.:15:&SESSION.
        linkLabel: Create Order
        bordered: true
    }
)
```

Whether static text is accepted directly for a *Session State Value* setting varies by
build; if the compiler rejects it, select the text as a column from `dual` instead.
