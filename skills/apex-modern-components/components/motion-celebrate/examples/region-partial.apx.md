# Motion Celebrate: on page load or from a Dynamic Action (APEXlang)

On a success page, celebrate as soon as it opens:

```apexlang
region order_done_celebrate (
    name: Celebrate
    type: plugin/motionCelebrate
    layout {
        sequence: 1
        slot: body
    }
    appearance {
        template: @/blank-with-attributes
        templateOptions: #DEFAULT#
    }
    componentAppearance {
        display: partial
    }
    settings {
        effect: cannons
        trigger: load
        message: Order &P20_ORDER_NO. placed
    }
)
```

To celebrate after something happens on the same page, set `trigger: event` and fire it
from a Dynamic Action (for example after an Ajax process succeeds) with an
*Execute JavaScript Code* action:

```javascript
apex.event.trigger(document, "amc-celebrate");
// or pick the effect and message in code:
amcCelebrate.fire({ effect: "fireworks", message: "Milestone reached" });
```

The region template name `@/blank-with-attributes` is Universal Theme's Blank with
Attributes template; confirm the name with the apexlang grammar contract for your build.
The region renders nothing visible either way.
