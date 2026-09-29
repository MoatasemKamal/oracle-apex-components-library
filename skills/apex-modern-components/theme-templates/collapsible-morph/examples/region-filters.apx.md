# Collapsible Morph around a filter Form

A search filter region above a report that starts collapsed and remembers the user's choice.
Give the region a Static ID so Remember state can key on it.

```apexlang
region advanced-filters (
    name: Advanced filters
    type: staticContent
    appearance {
        template: @amc-collapsible-morph
        templateOptions: [
            #DEFAULT#
            amc-TCollapsibleMorph--collapsed
            amc-TCollapsibleMorph--remember
        ]
        icon: fa-filter
    }
    advanced {
        staticId: advanced-filters
    }
)
```

The template reference (`@amc-collapsible-morph`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
