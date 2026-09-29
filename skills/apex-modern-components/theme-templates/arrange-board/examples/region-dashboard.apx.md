# Arrange Board: a personal dashboard from plain regions (experimental)

Four regions placed as sub regions of one parent region. Each uses Arrange Board and has a
Static ID, so every user can reorder, resize and collapse them and the layout is remembered
per page in their browser. The parent can use any region template.

```apexlang
region sales-dashboard (
    name: Sales dashboard
    type: staticContent
    appearance {
        template: @t-region
    }
)

region open-orders (
    name: Open orders
    type: classicReport
    layout {
        parentRegion: @sales-dashboard
    }
    appearance {
        template: @amc-arrange-board
        templateOptions: [
            #DEFAULT#
            amc-TArrangeBoard--defL
            amc-TArrangeBoard--noPadding
        ]
        icon: fa-table
    }
    advanced {
        staticId: open-orders
    }
)

region revenue (
    name: Revenue
    type: chart
    layout {
        parentRegion: @sales-dashboard
    }
    appearance {
        template: @amc-arrange-board
        icon: fa-bar-chart
    }
    advanced {
        staticId: revenue
    }
)

region today (
    name: Today
    type: cards
    layout {
        parentRegion: @sales-dashboard
    }
    appearance {
        template: @amc-arrange-board
        templateOptions: [
            #DEFAULT#
            amc-TArrangeBoard--defS
        ]
        icon: fa-dashboard
    }
    advanced {
        staticId: today
    }
)
```

The same works for regions placed one after another in the same page position (for example
Body) without a parent region. The template reference (`@amc-arrange-board`), `@t-region`,
the `layout.parentRegion` property name and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit, and confirm the
APEX grid markup around the regions on a live page.
