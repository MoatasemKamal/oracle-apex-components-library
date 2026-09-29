# Kinetic Title around a Chart

Short titles work best: the title is set very large.

```apexlang
region revenue (
    name: Revenue
    type: chart
    appearance {
        template: @amc-kinetic-title
        templateOptions: [
            #DEFAULT#
            amc-TKineticTitle--ghost
        ]
        icon: fa-line-chart
    }
)
```

The template reference (`@amc-kinetic-title`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
