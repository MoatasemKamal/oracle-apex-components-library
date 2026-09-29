# Thumb Bar on an invoice approval page

Approvers open invoices on their phones. The page's actions are a List region with Thumb Bar;
Approve invoice is the primary action (Attribute 2 = `primary`), Return to sender always goes
to the More sheet (Attribute 2 = `overflow`) so it is far from the thumb.

```apexlang
region invoice-actions (
    name: Invoice actions
    type: list
    source {
        list: @invoice-actions
    }
    componentAppearance {
        listTemplate: @amc-thumb-bar
        templateOptions: [
            #DEFAULT#
            amc-TThumbBar--success
        ]
    }
)
```

Put the region anywhere on the page (for example after the form). On phones it floats at the
bottom of the screen; on wider screens it renders as an inline row of buttons where it is.
Use one Thumb Bar per page.

## Dynamic list from SQL

Actions can depend on the invoice's status and the user's rights. Columns are positional:
level, label, target, is_current, image, image_attribute, image_alt_attribute, attribute1,
attribute2.

```sql
select 1                                     as lvl,
       a.action_label                        as label,
       case a.action_code
         when 'APPROVE' then 'javascript:apex.submit(''APPROVE'');'
         when 'RETURN'  then 'javascript:apex.submit(''RETURN'');'
         else apex_page.get_url(p_page => a.target_page,
                                p_items => 'P30_INVOICE_ID',
                                p_values => :P20_INVOICE_ID)
       end                                   as target,
       null                                  as is_current,
       a.icon_class                          as image,
       null                                  as image_attribute,
       a.action_label                        as image_alt_attribute,
       case a.action_code
         when 'NOTE' then (select to_char(count(*)) from invoice_notes n
                            where n.invoice_id = :P20_INVOICE_ID)
       end                                   as attribute1,   -- a01 badge
       case a.action_code
         when 'APPROVE' then 'primary'
         when 'RETURN'  then 'overflow'
       end                                   as attribute2    -- a02 role
  from invoice_actions a                     -- placeholder
 where a.allowed_status = (select i.status from invoices i where i.invoice_id = :P20_INVOICE_ID)
 order by a.display_seq
```

## Page padding helper

The floating bar must never cover the end of the page. The script adds `amc-TThumbBar-pad`
to `<body>` and sets `--amc-tthumb-h` to the bar's height; on phones that class adds the same
padding at the end of the page. If JavaScript is off, or to be explicit, add
`amc-TThumbBar-pad` in Page > Appearance > CSS Classes (the padding then uses 72px plus the
safe-area inset). For devices with a home indicator add `viewport-fit=cover` to the viewport
meta tag of the page template so `env(safe-area-inset-bottom)` is not zero.

`amcTplThumbBar.refresh()` lays the bar out again (for example after showing a hidden region);
`amcTplThumbBar.open()` and `.close()` open and close the More sheet.

The list template reference `@amc-thumb-bar`, and whether Universal Theme's own fixed footers
on your page template overlap the bar, must be confirmed on a live APEX page.
