# Next Compare: report region (APEXlang, APEX 26.1+)

One query row per option and criterion (a long, not wide, result). Order by option display
order, then criterion order: the runtime keeps the order of first appearance. Replace table and
column names with objects proven from your schema. Settings reference **projected column
aliases**; select-list settings take the entry **name** (`tenderTable`). Score and Weight are
plain numbers with a period as the decimal separator.

```apexlang
region bid_evaluation (
    name: Bid Evaluation
    type: plugin/nextCompare
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: [
            #DEFAULT#
        ]
    }
    componentAppearance {
        display: report
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select b.vendor_name                                  as option_name,
                   b.city || ', quotation ' || b.quotation_ref    as option_detail,
                   c.criterion_name                               as criterion,
                   c.group_name                                   as criterion_group,
                   e.value_text                                   as value_text,
                   to_char(e.score, 'FM990.0', 'NLS_NUMERIC_CHARACTERS=''.,''') as score,
                   to_char(c.weight_pct, 'FM990.0', 'NLS_NUMERIC_CHARACTERS=''.,''') as weight,
                   c.better_direction                             as better,
                   e.remark                                       as note,
                   case when e.is_non_compliant = 1 then 'danger' end as highlight
              from tender_bids b
              join tender_criteria c on c.tender_id = b.tender_id
              left join bid_evaluations e on e.bid_id = b.bid_id
                                        and e.criterion_id = c.criterion_id
             where b.tender_id = :P30_TENDER_ID
             order by b.display_seq, c.display_seq
            ```
    }
    settings {
        style: tenderTable
        option: OPTION_NAME
        optionDetail: OPTION_DETAIL
        criterion: CRITERION
        criterionGroup: CRITERION_GROUP
        value: VALUE_TEXT
        score: SCORE
        weight: WEIGHT
        better: BETTER
        note: NOTE
        highlight: HIGHLIGHT
        scoreMax: 10
        hideIdentical: N
        showTotals: Y
    }
    column OPTION_NAME (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: OPTION_NAME
            dataType: varchar2
            primaryKey: false
        }
    )
    column OPTION_DETAIL (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: OPTION_DETAIL
            dataType: varchar2
            primaryKey: false
        }
    )
    column CRITERION (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: CRITERION
            dataType: varchar2
            primaryKey: false
        }
    )
    column CRITERION_GROUP (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: CRITERION_GROUP
            dataType: varchar2
            primaryKey: false
        }
    )
    column VALUE_TEXT (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE_TEXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column SCORE (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: SCORE
            dataType: varchar2
            primaryKey: false
        }
    )
    column WEIGHT (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: WEIGHT
            dataType: varchar2
            primaryKey: false
        }
    )
    column BETTER (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: BETTER
            dataType: varchar2
            primaryKey: false
        }
    )
    column NOTE (
        layout {
            sequence: 90
        }
        source {
            type: databaseColumn
            databaseColumn: NOTE
            dataType: varchar2
            primaryKey: false
        }
    )
    column HIGHLIGHT (
        layout {
            sequence: 100
        }
        source {
            type: databaseColumn
            databaseColumn: HIGHLIGHT
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

For the price criterion return the price as the value (for example `'SAR ' || to_char(total_incl_vat, 'FM999G999G990')`),
leave Score empty and set Better to `lower`: the runtime scores it as lowest price / price x Score Maximum.
Diff View: set `pinnedOption` to the current supplier or policy, for example `&P30_CURRENT_VENDOR.`.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Next Compare [Plug-in]** > Appearance: *Multiple (Report)*, set Style to
*Tender Table - smart*, then map the settings to the columns above.
