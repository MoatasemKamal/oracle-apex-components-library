# Spotlight Grid on a List region

A procurement hub. Put a one-line description in each entry's User Defined Attribute 1 and an
optional tag in Attribute 2. The template loads `amc-tpl-spotlight-grid.js`, which moves the
spotlight with the pointer; the grid is complete without it.

```apexlang
region procurement-hub (
    name: Procurement
    type: list
    source {
        list: @procurement-hub
    }
    componentAppearance {
        listTemplate: @amc-spotlight-grid
        templateOptions: [
            #DEFAULT#
            amc-TSpotlightGrid--intense
        ]
    }
)
```

The list template reference (`@amc-spotlight-grid`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
