# Progress Meter: partial inside an Interactive Report column (APEXlang)

```apexlang
column PCT_COMPLETE (
    type: plugin/progressMeter
    heading {
        heading: Progress
    }
    layout {
        sequence: 40
    }
    source {
        dataType: NUMBER
    }
    settings {
        value: PCT_COMPLETE
        valueText: PCT_LABEL
        state: PCT_STATE
        size: small
    }
)
```

Project `PCT_LABEL` (for example `pct_complete || '%'`) and `PCT_STATE`
(`case when pct_complete >= 90 then 'success' when pct_complete < 30 then 'danger' end`)
as sibling columns of the report. For a list of labelled bars use a region with
`type: plugin/progressMeter` and `componentAppearance.display: report`.
