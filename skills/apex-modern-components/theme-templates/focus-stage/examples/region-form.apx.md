# Focus Stage around a long Form

A data-entry Form on a busy page. With Focus on input the page dims as soon as the user starts
typing; Escape or the Focus button brings the page back.

```apexlang
region supplier-onboarding (
    name: Supplier onboarding
    type: form
    appearance {
        template: @amc-focus-stage
        templateOptions: [
            #DEFAULT#
            amc-TFocusStage--auto
            amc-TFocusStage--spotlight
        ]
        icon: fa-edit
    }
)
```

For an Interactive Report use `amc-TFocusStage--deep` and `amc-TFocusStage--noPadding` and let
users press Focus when they need it.

The template reference (`@amc-focus-stage`) and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
