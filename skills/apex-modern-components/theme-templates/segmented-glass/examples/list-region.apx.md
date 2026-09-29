# Segmented Glass as a view switcher

A static list with one entry per view page (Board, List, Calendar). Every entry should have
an icon when the Icon only option is used.

```apexlang
region order-views (
    name: Order views
    type: list
    source {
        list: @order-views
    }
    componentAppearance {
        listTemplate: @amc-segmented-glass
        templateOptions: [
            #DEFAULT#
            amc-TSegmentedGlass--primary
        ]
    }
)
```

The template reference (`@amc-segmented-glass`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
