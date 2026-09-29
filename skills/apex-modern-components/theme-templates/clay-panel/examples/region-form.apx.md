# Clay Panel around a Form

Set the region's `appearance.template` to the Clay Panel template. Items keep their own
native templates; the tray behind them keeps a solid surface.

```apexlang
region delivery-address (
    name: Your delivery address
    type: staticContent
    appearance {
        template: @amc-clay-panel
        templateOptions: [
            #DEFAULT#
        ]
        icon: fa-home
    }
)
```

Use `amc-TClayPanel--success` for a savings or rewards summary and
`amc-TClayPanel--noPadding` around a Classic Report. The template reference
(`@amc-clay-panel`) and the theme-template folder layout are not yet confirmed by the APEXlang
compiler; check with apexlang's compiler-truth audit.
