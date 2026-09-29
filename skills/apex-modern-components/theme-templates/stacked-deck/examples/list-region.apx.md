# Stacked Deck on a List region

A static or dynamic list of pending work on a dashboard. Put a one-line summary in
Attribute 1 (Description) and a short value such as a count or amount in Attribute 2 (Meta).

```apexlang
region pending-approvals (
    name: Pending approvals
    type: list
    source {
        list: @pending-approvals
    }
    componentAppearance {
        listTemplate: @amc-stacked-deck
        templateOptions: [
            #DEFAULT#
            amc-TStackedDeck--solidCurrent
        ]
    }
)
```

Add `amc-TStackedDeck--open` where the region sits above other content and a layout change
on hover is not wanted. The template reference (`@amc-stacked-deck`) and the theme-template
folder layout are not yet confirmed by the APEXlang compiler; check with apexlang's
compiler-truth audit.
