# Form Progress around a supplier registration form

A Form region on `SUPPLIERS`. Items with **Value Required** get the `is-required` container and the
hidden "(Value Required)" label text from Universal Theme, so the frame finds them without extra
setup. The header shows "4 of 7 required fields done", the meter has one segment per required
item, and the Next button jumps to the next empty one.

```apexlang
region supplier-registration (
    name: Supplier registration
    type: form
    source {
        tableName: SUPPLIERS
    }
    appearance {
        template: @amc-form-progress
        templateOptions: [
            #DEFAULT#
            amc-TFormProgress--draftHint
            amc-TFormProgress--markOptional
        ]
        icon: fa-building-o
    }
    advanced {
        staticId: supplier-registration
        customAttributes: data-amc-label-count="%0 of %1 required fields done" data-amc-required-marker="Value Required"
    }
)

pageItem P20_VAT_NO (
    name: P20_VAT_NO
    type: textField
    label: VAT registration number
    region: @supplier-registration
    validation {
        valueRequired: true
    }
)
```

The draft-hint option only makes sense when the page has a Save draft button (a process that
saves with status `DRAFT`) or autosave. Arabic UI: translate the `data-amc-*` strings, including
`data-amc-required-marker` (the text of the hidden required label in your language).

The template reference (`@amc-form-progress`), the theme-template folder layout and the property
names above are not yet confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
