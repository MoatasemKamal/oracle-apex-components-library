# Zoom Dial around an Interactive Report

A dense report that starts Compact; each user can make it larger and the choice is remembered
for this page and region in their browser. Give the region a Static ID so the stored choice
survives changes to the page.

```apexlang
region open-orders (
    name: Open orders
    type: interactiveReport
    appearance {
        template: @amc-zoom-dial
        templateOptions: [
            #DEFAULT#
            amc-TZoomDial--defCompact
            amc-TZoomDial--noPadding
        ]
        icon: fa-table
    }
    advanced {
        staticId: open-orders
    }
)
```

The template reference (`@amc-zoom-dial`) and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
