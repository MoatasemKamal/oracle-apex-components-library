# Orbit Launcher on a List region

A home page launcher: the first entry of the list is the hub, the rest orbit it. Put a short
caption in each entry's User Defined Attribute 1 (for example the open count from an
application item).

```apexlang
region sales-launcher (
    name: Sales workspace
    type: list
    source {
        list: @sales-launcher
    }
    componentAppearance {
        listTemplate: @amc-orbit-launcher
        templateOptions: [
            #DEFAULT#
            amc-TOrbitLauncher--calm
        ]
    }
)
```

The list template reference (`@amc-orbit-launcher`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
