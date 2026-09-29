# Spotlight Frame around a Classic Report

Set the region's `appearance.template` to the Spotlight Frame template and load
`amc-tpl-spotlight-frame.js` (the template references it, so APEX loads it with the page).
Keep the Classic Report's own `componentAppearance` as apexlang's defaults require.

```apexlang
region shipments-at-risk (
    name: Shipments at risk
    type: classicReport
    appearance {
        template: @amc-spotlight-frame
        templateOptions: [
            #DEFAULT#
            amc-TSpotlightFrame--noPadding
        ]
        icon: fa-truck
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

Use `amc-TSpotlightFrame--danger` on an exception Form and `amc-TSpotlightFrame--wide`
on a full-width Chart. The template reference (`@amc-spotlight-frame`) and the theme-template
folder layout are not yet confirmed by the APEXlang compiler; check with apexlang's
compiler-truth audit.
