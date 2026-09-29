# Motion Effect: celebration and hero regions (APEXlang)

Confetti on an order-confirmation page, replayed when clicked:

```apexlang
region order_celebration (
    name: Order Placed
    type: plugin/motionEffect
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
        effect: confetti
        size: large
        replayOnClick: true
        label: Order placed
    }
)
```

A flipping card whose faces come from page items:

```apexlang
region kpi_flip (
    name: Target Flip
    type: plugin/motionEffect
    layout {
        sequence: 20
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: #DEFAULT#
    }
    componentAppearance {
        display: partial
    }
    settings {
        effect: flipCard
        text: &P1_ACTUAL.
        backText: &P1_TARGET.
        speed: half
    }
)
```

Effect values: `bounce elastic spring pendulum cradle gravity jelly circleSquare blob polygon
polySpin goo pillRing signature ants check pathMorph motionPath heartbeat flipCard cube
carousel fold coin layers confetti starfield fireworks network flowField galaxy`.
Select-list settings take the entry name (for Speed: `half`, `oneAndHalf`, `double`).

Replay from a Dynamic Action (Execute JavaScript Code):
`amcMotionEffect.replay(document.querySelector("#order_celebration .amc-Motion"));`
