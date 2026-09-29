# Brutal Links on a List region

A home-page launchpad built from a static navigation list. Attribute 1 (Description) holds one
line that says what the module is for.

```apexlang
region launchpad (
    name: Launchpad
    type: list
    source {
        list: @home-launchpad
    }
    componentAppearance {
        listTemplate: @amc-brutal-links
        templateOptions: [
            #DEFAULT#
            amc-TBrutalLinks--sticker
        ]
    }
)
```

Use `amc-TBrutalLinks--rows` in narrow side columns. The template reference
(`@amc-brutal-links`) and the theme-template folder layout are not yet confirmed by the
APEXlang compiler; check with apexlang's compiler-truth audit.
