# Progressive Disclosure around a sales order form

Four items everyone fills in stay in view; six that only some orders need get the CSS class
`amc-pd-more` and collapse behind "Show 6 more options". An order that already has a customer PO
reference opens the section and shows "1 filled".

```apexlang
region sales-order (
    name: New sales order
    type: form
    source {
        tableName: SALES_ORDERS
    }
    appearance {
        template: @amc-progressive-disclosure
        templateOptions: [
            #DEFAULT#
            amc-TProgressiveDisclosure--tinted
        ]
        icon: fa-shopping-cart
    }
    advanced {
        staticId: sales-order
    }
)

pageItem P50_PO_REF (
    name: P50_PO_REF
    type: textField
    label: Customer PO reference
    region: @sales-order
    advanced {
        cssClasses: amc-pd-more
    }
)

pageItem P50_CURRENCY (
    name: P50_CURRENCY
    type: selectList
    label: Invoice currency
    region: @sales-order
    advanced {
        cssClasses: amc-pd-more
        customAttributes: data-amc-default="SAR"
    }
)
```

`data-amc-default` tells the frame which value counts as "not set", so a currency left at SAR does
not count as filled. Arabic UI: translate the `data-amc-label-*` strings on the region.

The template reference and property names are not yet confirmed by the APEXlang compiler; check
with apexlang's compiler-truth audit.
