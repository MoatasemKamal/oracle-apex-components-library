# Motion Text: animated page headline (APEXlang)

```apexlang
region welcome_headline (
    name: Welcome
    type: plugin/motionText
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: [
            #DEFAULT#
            t-Region--hideHeader
            t-Region--noUI
        ]
    }
    componentAppearance {
        display: partial
    }
    settings {
        text: Welcome back, &APP_USER.|You have &P1_OPEN_TASKS. open tasks
        effect: typewriter
        size: large
        alignStart: true
    }
)
```

The value can also map to a column when the component is used as a report column
(partial mode), for example to animate a status headline per row. Typewriter and
Scramble take several phrases separated by `|`.
