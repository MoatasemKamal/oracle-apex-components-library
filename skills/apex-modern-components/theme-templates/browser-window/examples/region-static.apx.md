# Browser Window around a page preview

A Static Content (or Cards) region that previews what customers see. The phone frame
constrains the width, so a responsive layout inside can be judged at mobile size.

```apexlang
region portal-preview (
    name: Customer portal home
    type: staticContent
    appearance {
        template: @amc-browser-window
        templateOptions: [
            #DEFAULT#
            amc-TBrowserWindow--stacked
        ]
        icon: fa-globe
    }
)

region mobile-checkout (
    name: Mobile checkout
    type: staticContent
    appearance {
        template: @amc-browser-window
        templateOptions: [
            #DEFAULT#
            amc-TBrowserWindow--phone
        ]
        icon: fa-mobile
    }
)
```

The template reference (`@amc-browser-window`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
