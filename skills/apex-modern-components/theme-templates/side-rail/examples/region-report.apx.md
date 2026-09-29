# Side Rail around a Classic Report

In a wide body column the title runs vertically in the rail; in a narrow column the same
region shows a normal top header, with no extra setting.

```apexlang
region orders-at-risk (
    name: Orders at risk
    type: classicReport
    appearance {
        template: @amc-side-rail
        templateOptions: [
            #DEFAULT#
            amc-TSideRail--noPadding
        ]
        icon: fa-exclamation-circle
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

The template reference (`@amc-side-rail`) and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
