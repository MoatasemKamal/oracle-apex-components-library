# Terminal Window around a Classic Report of job runs

The window chrome is inverse by default and the content pane keeps the theme surface, so a
Classic Report looks exactly as it does in a Standard region.

```apexlang
region scheduler-runs (
    name: scheduler runs
    type: classicReport
    appearance {
        template: @amc-terminal-window
        templateOptions: [
            #DEFAULT#
            amc-TTerminalWindow--caret
            amc-TTerminalWindow--noPadding
        ]
        icon: fa-terminal
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

Use `amc-TTerminalWindow--console` only around Static Content, logs, Charts and Cards: it
re-maps the component color variables inside the pane, which native Interactive Reports
and Forms do not all read.

The template reference (`@amc-terminal-window`) and the theme-template folder layout are not
yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
