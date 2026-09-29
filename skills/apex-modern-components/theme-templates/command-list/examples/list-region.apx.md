# Command List on a List region

A Quick actions region on a sales dashboard. Attribute 1 (Description) explains the action,
Attribute 2 (Shortcut) shows a key combination such as `Ctrl+Shift+O` (display only; bind real
shortcuts with a Dynamic Action or `apex.actions` if you need them).

```apexlang
region quick-actions (
    name: Quick actions
    type: list
    source {
        list: @sales-quick-actions
    }
    componentAppearance {
        listTemplate: @amc-command-list
        templateOptions: [
            #DEFAULT#
            amc-TCommandList--elevated
        ]
    }
)
```

The template loads `amc-tpl-command-list.js` for the search box and arrow keys. The template
reference (`@amc-command-list`) and the theme-template folder layout are not yet confirmed by
the APEXlang compiler; check with apexlang's compiler-truth audit.
