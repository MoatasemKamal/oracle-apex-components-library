# Motion Loader: loading indicator region (APEXlang)

```apexlang
region orders_loading (
    name: Loading Orders
    type: plugin/motionLoader
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
        style: orbit
        label: Loading orders
        size: small
    }
)
```

Show it before a slow refresh and hide it afterwards with Dynamic Actions
(Show region `orders_loading` on *Before Refresh* of the report, Hide on *After Refresh*).
Give the region a Static ID if your Dynamic Actions select it by jQuery.
