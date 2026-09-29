# Constellation Map on a List region

An app map on the home page. Every entry of the navigation list gets its group in User
Defined Attribute 1 (Sales, Finance, Operations, Admin) and a short description in
Attribute 2. Keep each group's entries together in the list: stars are joined in list order.

```apexlang
region app-map (
    name: App map
    type: list
    source {
        list: @desktop-navigation-menu
    }
    componentAppearance {
        listTemplate: @amc-constellation-map
        templateOptions: [
            #DEFAULT#
            amc-TConstellationMap--recent
            amc-TConstellationMap--tall
        ]
    }
)
```

With the Recently used option the counts stay in the user's browser (localStorage) and the
toolbar offers Reset brightness. The list template reference (`@amc-constellation-map`) and the
theme-template folder layout are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit.
