# Brutal Block around a Classic Report

Set the region's `appearance.template` to the Brutal Block template. The region needs a
little room above it for the label and at the end side for the hard shadow; the template adds
those margins itself.

```apexlang
region tickets-breaching-sla (
    name: Tickets breaching SLA
    type: classicReport
    appearance {
        template: @amc-brutal-block
        templateOptions: [
            #DEFAULT#
            amc-TBrutalBlock--danger
            amc-TBrutalBlock--noPadding
        ]
        icon: fa-bolt
    }
    componentAppearance {
        template: @/standard
        templateOptions: [
            #DEFAULT#
            t-Report--stretch
        ]
    }
)
```

The template reference (`@amc-brutal-block`) and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
