# Peek Nav on a List region

Side navigation for a sales and finance app. Each list entry keeps its normal target; put a
one-line description in User Defined Attribute 1. Leave Attribute 2 empty to preview the
entry's own page, set it to `none` for pages that run processes when they load (Month-end
close), or to a developer-controlled, same-origin URL of a lighter page made for previews.

```apexlang
region finance-navigation (
    name: Finance navigation
    type: list
    source {
        list: @finance-navigation
    }
    componentAppearance {
        listTemplate: @amc-peek-nav
        templateOptions: [
            #DEFAULT#
            amc-TPeekNav--descriptions
        ]
    }
)
```

Target pages are loaded in a sandboxed iframe in the user's session, so set their
**Security > Embed in Frames** attribute to *Allow from same origin*; pages that deny framing
show "Preview not available for this page" on the card.

The list template reference (`@amc-peek-nav`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
