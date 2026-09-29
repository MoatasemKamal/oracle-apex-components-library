# Beam Frame around a Classic Report

Set the region's `appearance.template` to the Beam Frame template. Keep the Classic
Report's own `componentAppearance` as apexlang's defaults require.

```apexlang
region open-orders (
    name: Open orders
    type: classicReport
    appearance {
        template: @amc-beam-frame
        templateOptions: [
            #DEFAULT#
            amc-TBeamFrame--noPadding
        ]
        icon: fa-shopping-cart
    }
    componentAppearance {
        template: @/standard
        templateOptions: [
            #DEFAULT#
            t-Report--stretch
            t-Report--horizontalBorders
        ]
    }
)
```

The template reference (`@amc-beam-frame`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
