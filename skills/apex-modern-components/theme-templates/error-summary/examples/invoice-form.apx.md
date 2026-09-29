# Error Summary around a supplier invoice form

A Form region with validations. After a failed submit, APEX shows inline errors (and, depending on
the application's error display setting, a page notification). The frame lists them at the top:
"4 fields need attention", one link per field, and a plain-language hint.

```apexlang
region supplier-invoice (
    name: Supplier invoice
    type: form
    source {
        tableName: AP_INVOICES
    }
    appearance {
        template: @amc-error-summary
        templateOptions: [
            #DEFAULT#
        ]
        icon: fa-file-text-o
    }
    advanced {
        staticId: supplier-invoice
    }
)

pageItem P40_VAT_NO (
    name: P40_VAT_NO
    type: textField
    label: Supplier VAT number
    region: @supplier-invoice
    advanced {
        customAttributes: data-amc-hint="Copy the 15-digit number from the invoice header; it starts and ends with 3."
    }
)
```

```sql
-- Validation (PL/SQL Function Body returning Error Text), associated with item P40_INV_NO:
select 'Invoice number ' || :P40_INV_NO || ' already exists for this supplier.'
  from ap_invoices                                  -- placeholder
 where supplier_id = :P40_SUPPLIER_ID and invoice_no = :P40_INV_NO
```

Associate every validation with its item (Associated Item) so the error is shown inline and the
summary can link to it. Page-level errors appear with the Include page errors option.

The template reference and property names are not yet confirmed by the APEXlang compiler; check
with apexlang's compiler-truth audit.
