# Hick Menu as a report catalogue

A Reports page lists every report the user may run, 20 to 80 of them. Hick Menu groups them by
module (Attribute 1), shows at most seven per group with Show all 12 in Finance for the rest,
adds a filter box because the list is longer than 15, and puts the reports this user opened
last on top.

```apexlang
region report-catalogue (
    name: Reports
    type: list
    source {
        list: @report-catalogue
    }
    componentAppearance {
        listTemplate: @amc-hick-menu
        templateOptions: [
            #DEFAULT#
            amc-THickMenu--columns
        ]
    }
)
```

## Dynamic list from SQL

Create the list as **Dynamic** (Shared Components > Lists > Create > From Scratch > Dynamic)
with this query. Columns are positional: level, label, target, is_current, image,
image_attribute, image_alt_attribute, attribute1 .. attribute3. Order by group first, then by
importance inside the group: the first seven of each group are the ones people see before
Show all, so put the most used first.

```sql
select 1                                                   as lvl,
       r.report_name                                       as label,
       apex_page.get_url(p_page => r.page_id)              as target,
       case when r.page_id = :APP_PAGE_ID then 'YES' end   as is_current,
       r.icon_class                                        as image,
       null                                                as image_attribute,
       r.report_name                                       as image_alt_attribute,
       m.module_name                                       as attribute1,   -- a01 group
       r.short_description                                 as attribute2,   -- a02 description
       r.refresh_frequency                                 as attribute3    -- a03 meta, e.g. Daily
  from app_reports r                                       -- placeholder
  join app_modules m on m.module_code = r.module_code      -- placeholder
 where r.is_active = 'Y'
   and (r.authorization_scheme is null
        or apex_authorization.is_authorized(r.authorization_scheme))
 order by m.display_seq, r.usage_rank nulls last, r.report_name
```

Static list alternative:

| Entry | Target | Attribute 1 | Attribute 2 | Attribute 3 |
|---|---|---|---|---|
| Trial balance | Page 110 | Finance | Balances by account for any period | Daily |
| VAT return, 15% | Page 118 | Finance | Output and input VAT ready for the ZATCA filing | Monthly |
| WPS salary file | Page 402 | HR and payroll | Wage protection file for the bank upload | Monthly |

## Numbers and strings

The wrapper in Before List Entry carries the numbers and the English strings; edit them in
the template (a copy in your theme) to change them:

| Attribute | Default | Meaning |
|---|---|---|
| `data-chunk` | 7 | Entries shown per group before Show all (4 with Tight chunks) |
| `data-threshold` | 15 | The filter appears when the list has more entries than this |
| `data-recent-max` | 5 | Recent chips shown |
| `data-show-all` | Show all {count} in {group} | Button under a group |

What is stored, in `localStorage` only: the keys of recently opened entries (link without the
session and checksum, plus the label) under `amc-tpl-hick-menu:<application id>:<list id>`.
Clear recent, or `amcTplHickMenu.clearRecent()`, forgets them. Nothing leaves the browser.

The list template reference `@amc-hick-menu` and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
