# Metro Steps on a wizard progress list

The progress list of a multi-page wizard: one list entry per wizard page, each entry current for
its own page (Current For Pages), so the entries before it render as completed stations.
Attribute 1 (Caption) holds a short line under the label.

```apexlang
region checkout-progress (
    name: Checkout progress
    type: list
    source {
        list: @checkout-wizard
    }
    componentAppearance {
        listTemplate: @amc-metro-steps
        templateOptions: [
            #DEFAULT#
        ]
    }
)
```

Add `amc-TMetroSteps--vertical` for a side column. The template reference (`@amc-metro-steps`)
and the theme-template folder layout are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit.
