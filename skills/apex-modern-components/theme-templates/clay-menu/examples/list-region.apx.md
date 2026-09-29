# Clay Menu on a List region

Order views above an Interactive Report. Attribute 1 (Badge) carries the count per view,
for example from a dynamic list query.

```apexlang
region order-views (
    name: Order views
    type: list
    source {
        list: @order-views
    }
    componentAppearance {
        listTemplate: @amc-clay-menu
        templateOptions: [
            #DEFAULT#
        ]
    }
)
```

For a side column add `amc-TClayMenu--vertical`. The template reference (`@amc-clay-menu`)
and the theme-template folder layout are not yet confirmed by the APEXlang compiler; check
with apexlang's compiler-truth audit.
