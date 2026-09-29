# Aurora Header around a Cards region

Use it once per page, on the region that opens the page. Set the region's
`appearance.template` to the Aurora Header template; the Cards region keeps its own
`componentAppearance`.

```apexlang
region welcome (
    name: Good morning, operations
    type: cards
    appearance {
        template: @amc-aurora-header
        templateOptions: [
            #DEFAULT#
            amc-TAuroraHeader--tall
        ]
        icon: fa-sun-o
    }
)
```

For a Classic Report that should run edge to edge, add `amc-TAuroraHeader--noPadding`.
The template reference (`@amc-aurora-header`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
