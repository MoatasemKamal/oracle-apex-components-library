# Glass Depth around a Cards region

Set the region's `appearance.template` to the Glass Depth template. The body keeps an almost
opaque surface, so the native Cards, Classic Report or Form inside stays fully readable.

```apexlang
region today-at-a-glance (
    name: Today at a glance
    type: cards
    appearance {
        template: @amc-glass-depth
        templateOptions: [
            #DEFAULT#
            amc-TGlassDepth--success
        ]
        icon: fa-sun-o
    }
)
```

Add `amc-TGlassDepth--noPadding` around a Classic Report so rows run edge to edge inside the
sheet. The template reference (`@amc-glass-depth`) and the theme-template folder layout are
not yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
