# Liquid Tabs on a List region

Put a static or dynamic list of sibling pages in a List region, usually in the Breadcrumb Bar
or at the top of the Body. Attribute 1 of a list entry is its count badge.

```apexlang
region order-tabs (
    name: Order tabs
    type: list
    source {
        list: @order-pages
    }
    componentAppearance {
        listTemplate: @amc-liquid-tabs
        templateOptions: [
            #DEFAULT#
            amc-TLiquidTabs--solid
        ]
    }
)
```

The template reference (`@amc-liquid-tabs`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
