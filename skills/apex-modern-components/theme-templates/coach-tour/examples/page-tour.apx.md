# Coach Tour on an Invoices page

A redesigned Invoices page (page 40) gets a short tour for its first visit. A List region with
Coach Tour sits above the grid; each list entry points at an element by selector. Give the
elements you point at a Static ID so the selectors stay stable.

```apexlang
region page-tour (
    name: Tour of this page
    type: list
    source {
        list: @invoices-tour
    }
    componentAppearance {
        listTemplate: @amc-coach-tour
        templateOptions: [
            #DEFAULT#
            amc-TCoachTour--launcherOnly
        ]
    }
)
```

| Entry | Attribute 1, target selector | Attribute 2, step text |
|---|---|---|
| Welcome to Invoices | | Every supplier invoice for your cost centres lands here. |
| Find any invoice | `#invoices_ig .a-IG-searchField` | Search by invoice number, supplier or VAT number. |
| Approve in bulk | `#APPROVE_SELECTED` | Tick the invoices under SAR 5,000 and approve them in one go. |
| Month-end cut-off | | Invoices approved after the 25th are paid in next month's run. |

A step with an empty selector is a centred message. A step whose target is missing (a button
hidden by an authorization scheme, a region not rendered for this user) is skipped and the
progress counts only the steps shown.

## Dynamic list from SQL

Steps can come from a table so administrators can edit tours without a deployment. Columns
are positional: level, label, target, is_current, image, image_attribute,
image_alt_attribute, attribute1, attribute2.

```sql
select 1                     as lvl,
       s.step_title          as label,
       null                  as target,
       null                  as is_current,
       null                  as image,
       null                  as image_attribute,
       null                  as image_alt_attribute,
       s.target_selector     as attribute1,   -- a01 CSS selector, empty for a centred step
       s.step_text           as attribute2    -- a02 step text
  from app_tour_steps s                       -- placeholder
 where s.app_id  = :APP_ID
   and s.page_id = :APP_PAGE_ID
   and s.is_active = 'Y'
 order by s.step_seq
```

## Start, restart, reset

- The tour starts by itself about a second after the first visit and never again once it
  was finished or skipped, per application and list (localStorage key
  `amc-tpl-coach-tour:<application id>:<list id>`). With `amc-TCoachTour--manual` it only
  starts from the launcher.
- A Help button can restart it: a dynamic action on click, Execute JavaScript Code
  `amcTplCoachTour.start("page-tour");` (the region's static ID, a list id or an element).
- `amcTplCoachTour.reset()` forgets the outcome so the tour starts by itself on the next visit,
  for example after a release that changes the page.

The tour is UI only and stores nothing on the server. The list template reference
`@amc-coach-tour` and the z-index of the tour layer (1060) against Universal Theme dialogs and
menus must be confirmed on a live APEX page.
