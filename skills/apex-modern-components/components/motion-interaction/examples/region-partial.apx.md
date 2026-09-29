# Motion Interaction: buttons, cards and a like toggle (APEXlang)

A magnetic call-to-action that navigates:

```apexlang
region start_cta (
    name: Get Started
    type: plugin/motionInteraction
    layout {
        sequence: 30
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
        effect: magnetic
        label: Create your first project
        linkUrl: f?p=&APP_ID.:20:&SESSION.
    }
)
```

A like toggle per record, saved with a Dynamic Action:

```apexlang
region article_like (
    name: Like
    type: plugin/motionInteraction
    layout {
        sequence: 40
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
        effect: like
        label: Like this article
        text: &P10_ARTICLE_ID.
        liked: &P10_LIKED.
    }
)
```

Dynamic Action: *Event* Custom, *Custom Event* `amc-like-change`, *Selection Type*
jQuery Selector `#article_like` (set that Static ID on the region). True action
*Execute JavaScript Code*:

```javascript
apex.server.process("SAVE_LIKE", {
    x01: this.browserEvent.originalEvent.detail.value,
    x02: this.browserEvent.originalEvent.detail.liked ? "Y" : "N"
});
```

`SAVE_LIKE` is an Ajax Callback process you write; the event only reports the change.
