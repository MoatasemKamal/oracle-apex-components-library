# Freshness Frame around a Classic Report

An operational report that users keep open all day. The frame shows how old the rows are and
turns to an Out of date state after 5 minutes, with a Refresh button. The page item
`P10_LOADED_AT` holds the time the data was loaded (for example from the job that fills the
table), in ISO format, so the frame shows the real age of the data rather than the page age.

```apexlang
region warehouse-stock (
    name: Warehouse stock
    type: classicReport
    source {
        sqlQuery:
            ```sql
            select item, warehouse, on_hand
              from stock_levels
            ```
    }
    appearance {
        template: @amc-freshness-frame
        templateOptions: [
            #DEFAULT#
            amc-TFreshnessFrame--stale5
            amc-TFreshnessFrame--autoRefresh
        ]
        icon: fa-cubes
    }
    advanced {
        staticId: warehouse-stock
        customAttributes: data-amc-updated="&P10_LOADED_AT."
    }
)
```

Instead of the region attribute you can put the time inside the report, for example a hidden
column or a report footer `<span hidden data-amc-updated="...">`; it is re-read after every
refresh. Compute `P10_LOADED_AT` with `to_char(sys_extract_utc(systimestamp), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`.

The template reference (`@amc-freshness-frame`), the theme-template folder layout and the
`customAttributes` property name are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit.
