# Accordion Rail as side navigation

A list with one level of sub entries in the Left Column. Parents render their own link plus a
disclosure toggle, so give each parent a real target page (or repeat it as a child).
Attribute 1 is the badge.

```apexlang
region side-navigation (
    name: Side navigation
    type: list
    slot: leftColumn
    source {
        list: @sales-navigation
    }
    componentAppearance {
        listTemplate: @amc-accordion-rail
        templateOptions: [
            #DEFAULT#
            amc-TAccordionRail--panel
        ]
    }
)
```

The template reference (`@amc-accordion-rail`), the `slot` value and the theme-template folder
layout are not yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
