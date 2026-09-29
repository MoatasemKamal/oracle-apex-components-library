# Bento Launchpad on a List region

A finance home page. In the list entries set User Defined Attribute 1 to `large`, `wide` or
`tall` for the tiles that matter most, Attribute 2 to a short description and Attribute 3 to a
metric, for example `&P0_OVERDUE_INVOICES.` computed in an application process.

```apexlang
region finance-launchpad (
    name: Finance
    type: list
    source {
        list: @finance-launchpad
    }
    componentAppearance {
        listTemplate: @amc-bento-launchpad
        templateOptions: [
            #DEFAULT#
            amc-TBentoLaunchpad--tinted
        ]
    }
)
```

The list template reference (`@amc-bento-launchpad`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
