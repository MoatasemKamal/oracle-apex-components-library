# Holo Edge around a Cards region

Set the region's `appearance.template` to the Holo Edge template. The template references
`amc-tpl-holo-edge.js` for the pointer sheen; without it the foil drifts slowly on its own.

```apexlang
region member-benefits (
    name: Gold member benefits
    type: cards
    appearance {
        template: @amc-holo-edge
        templateOptions: [
            #DEFAULT#
            amc-THoloEdge--thick
        ]
        icon: fa-diamond
    }
)
```

Use it for one or two special regions per page; a page full of foil loses the effect. The
template reference (`@amc-holo-edge`) and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
