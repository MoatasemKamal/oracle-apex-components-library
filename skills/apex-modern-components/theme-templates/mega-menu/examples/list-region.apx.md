# Mega Menu as top navigation

A navigation list with one level of children. Attribute 1 holds a short description: for a
parent it is shown on the feature card, for a child under its title. Give parents their own
target page; the feature card links to it (or use the Hide feature card option).

```apexlang
region top-menu (
    name: Top menu
    type: list
    source {
        list: @main-menu
    }
    componentAppearance {
        listTemplate: @amc-mega-menu
        templateOptions: [
            #DEFAULT#
            amc-TMegaMenu--fullBar
        ]
    }
)
```

The template reference (`@amc-mega-menu`) and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
