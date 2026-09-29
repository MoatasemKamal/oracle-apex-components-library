# Speed Dial on a List region

Quick create actions on a dashboard. Put an optional hint in each entry's User Defined
Attribute 1. For a button that floats on every page, put the region on page 0 and add
`amc-TSpeedDial--fixed`. The optional `amc-tpl-speed-dial.js` file (loaded by the template)
adds Escape and click-outside closing.

```apexlang
region create-actions (
    name: Create
    type: list
    source {
        list: @create-actions
    }
    componentAppearance {
        listTemplate: @amc-speed-dial
        templateOptions: [
            #DEFAULT#
            amc-TSpeedDial--arc
        ]
    }
)
```

The list template reference (`@amc-speed-dial`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
