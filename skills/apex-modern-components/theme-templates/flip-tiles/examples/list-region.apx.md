# Flip Tiles on a List region

An employee self-service launchpad. Put a one- or two-line description in each entry's User
Defined Attribute 1 (the back of the tile) and the call-to-action text in Attribute 2, for
example `Request leave`.

```apexlang
region self-service (
    name: Self-service
    type: list
    source {
        list: @self-service
    }
    componentAppearance {
        listTemplate: @amc-flip-tiles
        templateOptions: [
            #DEFAULT#
            amc-TFlipTiles--palette
        ]
    }
)
```

The list template reference (`@amc-flip-tiles`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
