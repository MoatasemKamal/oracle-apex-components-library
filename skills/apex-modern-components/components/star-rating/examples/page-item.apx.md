# Star Rating: page item (APEXlang)

```apexlang
pageItem P10_RATING (
    type: plugin/starRating
    label {
        label: Rating
    }
    layout {
        sequence: 40
        region: @feedback
        slot: regionBody
    }
    appearance {
        template: @/optional-floating
        templateOptions: #DEFAULT#
    }
    settings {
        maxStars: 5
        icon: fa-star
        clearable: true
        clearLabel: Clear rating
    }
)
```

Use it like a native item: `apex.item('P10_RATING').getValue()`, `setValue('4')`,
Dynamic Actions on *Change*, *Enable*/*Disable*, validations such as
`to_number(:P10_RATING) between 1 and 5`.

For the item template, the floating label templates render the label above the stars.
`@/optional` or `@/required` (non-floating) look best if your theme uses those names.
