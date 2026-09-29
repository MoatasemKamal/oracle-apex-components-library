# Dock Bar on a List region

An app switcher dock. Put a badge count in each entry's User Defined Attribute 1 (for example
`&P0_OPEN_ORDERS.`); an empty value hides the badge. For a dock that floats over every page, put
the region on page 0 and add `amc-TDockBar--fixed`.

```apexlang
region sales-dock (
    name: Sales apps
    type: list
    source {
        list: @sales-dock
    }
    componentAppearance {
        listTemplate: @amc-dock-bar
        templateOptions: [
            #DEFAULT#
            amc-TDockBar--labels
        ]
    }
)
```

The list template reference (`@amc-dock-bar`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
