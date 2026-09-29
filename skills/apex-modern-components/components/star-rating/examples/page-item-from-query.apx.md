# Star Rating: value from a SQL query or a table column (APEXlang)

Star Rating is an **item plug-in**, so its value comes from the page item's **Source**, like
any native item; its own settings (Max Stars, Icon, Clearable, Clear Label) are static item
settings. Tables and columns (`orders`, `order_reviews`, `employees`) are **placeholders**:
replace them with objects proven from your schema.

## 1. Value from a SQL query (read the current rating)

```apexlang
pageItem P20_RATING (
    type: plugin/starRating
    label {
        label: Delivery rating
    }
    layout {
        sequence: 40
        region: @order_feedback
        slot: regionBody
    }
    appearance {
        template: @/optional-floating
        templateOptions: #DEFAULT#
    }
    source {
        type: sqlQuery
        sqlQuery:
            ```sql
            select to_char(r.rating)
              from order_reviews r
             where r.order_id  = :P20_ORDER_ID
               and r.reviewer  = :APP_USER
            ```
        used: onlyWhenCurrentValueInSessionStateIsNull
    }
    settings {
        maxStars: 5
        icon: fa-star
        clearable: true
        clearLabel: Clear rating
    }
)
```

The query must return **one column and at most one row**, a whole number from 1 to Max Stars
(or null for no rating). Save it with a page process, for example

```sql
merge into order_reviews r
using (select :P20_ORDER_ID order_id, :APP_USER reviewer from dual) s
   on (r.order_id = s.order_id and r.reviewer = s.reviewer)
 when matched then update set r.rating = to_number(:P20_RATING)
 when not matched then insert (order_id, reviewer, rating)
      values (s.order_id, s.reviewer, to_number(:P20_RATING));
```

## 2. Value from a table column (Form region)

On a Form region whose source is a table, set the item's source to the column:
Builder **Source > Type: Database Column, Database Column: RATING** (form on
`employee_reviews`, for example). The rating is then fetched and saved by the form's
Automatic Row Processing like any native item.

## 3. Read-only in reports

Item plug-ins are page items, not report columns. To show stored ratings per row, use a
template component with per-row values, for example `progressMeter` with Value = RATING,
Max = 5 and Value Text = `rating || ' / 5'`.

The APEXlang property names of the item `source` group (`type: sqlQuery`, `used`) are best
knowledge; confirm them with `apexctl apexlang grammar contract --components pageItem --groups source`
for your build.

## Builder (APEX 23.1 - 25.x, legacy import)

Page item > Type **Star Rating [Plug-in]** > Source: Type **SQL Query (return single value)**
with the query above, Used **Only when current value in session state is null**. Or, on a
Form region, Source Type **Database Column**.
