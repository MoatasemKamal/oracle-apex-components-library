# Spotlight Choice as a support plan chooser

A subscription form page (page 20) asks the customer to pick a support plan. The List region
uses Spotlight Choice; its Custom Attributes name the page item that receives the choice, so
the cards act as radio buttons and `P20_PLAN` holds the chosen plan code.

```apexlang
region support-plan (
    name: Support plan
    type: list
    source {
        list: @support-plans
    }
    advanced {
        customAttributes: data-amc-choice-item="P20_PLAN"
    }
    componentAppearance {
        listTemplate: @amc-spotlight-choice
        templateOptions: [
            #DEFAULT#
            amc-TSpotlightChoice--preselect
        ]
    }
)
```

`P20_PLAN` is a normal page item (Hidden, Value Protected off, or a Text Field you hide) with
its own Source and processing. Validations and the saved value stay server-side; a dynamic
action on its Change event can refresh a price summary.

Without `data-amc-choice-item` (and with the wrapper's `data-item` empty) the cards are links:
each entry's target opens, for example a sign-up page per plan.

## Dynamic list from SQL

Columns are positional: level, label, target, is_current, image, image_attribute,
image_alt_attribute, attribute1 .. attribute4.

```sql
select 1                                                  as lvl,
       p.plan_name                                        as label,
       apex_page.get_url(p_page => 21, p_items => 'P21_PLAN', p_values => p.plan_code)
                                                          as target,
       null                                               as is_current,
       p.icon_class                                       as image,
       null                                               as image_attribute,
       p.plan_name                                        as image_alt_attribute,
       p.short_description                                as attribute1,   -- a01 description
       case when p.plan_code = (select c.advised_plan from customers c
                                 where c.customer_id = :P20_CUSTOMER_ID)
            then 'recommended' end                        as attribute2,   -- a02 recommended
       'SAR ' || to_char(p.monthly_price, 'FM999G999G990') || ' / month'
                                                          as attribute3,   -- a03 price
       p.plan_code                                        as attribute4    -- a04 value for P20_PLAN
  from support_plans p                                    -- placeholder
 where p.is_active = 'Y'
 order by p.monthly_price
```

The query decides which plan is recommended (here the one advised for this customer); the
template makes sure only one is highlighted and places it first, or in the middle with
`amc-TSpotlightChoice--middle`.

The list template reference `@amc-spotlight-choice`, the `customAttributes` property name and
whether the List region renders Custom Attributes on its region element must be confirmed on a
live APEX page; `data-item="P20_PLAN"` on the wrapper in Before List Entry is the fallback.
