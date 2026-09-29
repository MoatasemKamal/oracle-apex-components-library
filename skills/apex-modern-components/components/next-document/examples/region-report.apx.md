# Next Document: report region (APEXlang, APEX 26.1+)

One row per invoice line. Header columns are repeated on every row by the join; the runtime
reads them from the first row. Replace table and column names with objects proven from your
schema. Settings reference **projected column aliases**; select-list settings take the entry
**name** (`bilingualTax`), not the display label. Numbers are returned with a period as the
decimal separator (`TO_CHAR(n, 'FM9999999990.00', 'NLS_NUMERIC_CHARACTERS=''.,''')`), dates as
ISO text. The runtime computes subtotal, discount, VAT per rate and total; the database stays the
source of truth for the posted amounts.

```apexlang
region tax_invoice (
    name: Tax Invoice
    type: plugin/nextDocument
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: [
            #DEFAULT#
            t-Region--hideHeader
            t-Region--noUI
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
            select 'Tax invoice|فاتورة ضريبية'                        as doc_type,
                   h.invoice_no                                       as doc_number,
                   to_char(h.invoice_date, 'YYYY-MM-DD')              as doc_date,
                   to_char(h.due_date, 'YYYY-MM-DD')                  as due_date,
                   c.customer_name                                    as party_name,
                   c.address_line1 || '|' || c.city || ' ' || c.postal_code as party_address,
                   c.vat_number                                       as vat_number,
                   h.currency_code                                    as currency,
                   lower(h.status)                                    as status,
                   h.payment_terms                                    as notes,
                   :G_COMPANY_NAME                                    as issuer_name,
                   :G_COMPANY_ADDRESS || '|CR ' || :G_COMPANY_CR      as issuer_details,
                   :G_COMPANY_VAT                                     as issuer_vat,
                   h.qr_data_uri                                      as qr_image_url,
                   l.description                                      as line_desc,
                   to_char(l.quantity, 'FM9999990.999', 'NLS_NUMERIC_CHARACTERS=''.,''') as qty,
                   to_char(l.unit_price, 'FM999999990.00', 'NLS_NUMERIC_CHARACTERS=''.,''') as unit_price,
                   case when l.discount_pct > 0 then l.discount_pct || '%' end as discount,
                   to_char(l.vat_rate, 'FM990.99', 'NLS_NUMERIC_CHARACTERS=''.,''') as tax_rate
              from invoice_headers h
              join invoice_lines   l on l.invoice_id = h.invoice_id
              join customers       c on c.customer_id = h.customer_id
             where h.invoice_id = :P20_INVOICE_ID
             order by l.line_no
            ```
    }
    settings {
        style: bilingualTax
        docType: DOC_TYPE
        docNumber: DOC_NUMBER
        docDate: DOC_DATE
        dueDate: DUE_DATE
        partyName: PARTY_NAME
        partyAddress: PARTY_ADDRESS
        vatNumber: VAT_NUMBER
        currency: CURRENCY
        status: STATUS
        notes: NOTES
        lineDesc: LINE_DESC
        qty: QTY
        unitPrice: UNIT_PRICE
        discount: DISCOUNT
        taxRate: TAX_RATE
        issuerName: ISSUER_NAME
        issuerDetails: ISSUER_DETAILS
        issuerVat: ISSUER_VAT
        defaultTaxRate: 15
        amountInWords: both
        bilingual: Y
        qrImageUrl: QR_IMAGE_URL
        showPrint: Y
    }
    column DOC_TYPE (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: DOC_TYPE
            dataType: varchar2
            primaryKey: false
        }
    )
    column DOC_NUMBER (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: DOC_NUMBER
            dataType: varchar2
            primaryKey: false
        }
    )
    column DOC_DATE (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: DOC_DATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column DUE_DATE (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: DUE_DATE
            dataType: varchar2
            primaryKey: false
        }
    )
    column PARTY_NAME (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: PARTY_NAME
            dataType: varchar2
            primaryKey: false
        }
    )
    column PARTY_ADDRESS (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: PARTY_ADDRESS
            dataType: varchar2
            primaryKey: false
        }
    )
    column VAT_NUMBER (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: VAT_NUMBER
            dataType: varchar2
            primaryKey: false
        }
    )
    column CURRENCY (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: CURRENCY
            dataType: varchar2
            primaryKey: false
        }
    )
    column STATUS (
        layout {
            sequence: 90
        }
        source {
            type: databaseColumn
            databaseColumn: STATUS
            dataType: varchar2
            primaryKey: false
        }
    )
    column NOTES (
        layout {
            sequence: 100
        }
        source {
            type: databaseColumn
            databaseColumn: NOTES
            dataType: varchar2
            primaryKey: false
        }
    )
    column ISSUER_NAME (
        layout {
            sequence: 110
        }
        source {
            type: databaseColumn
            databaseColumn: ISSUER_NAME
            dataType: varchar2
            primaryKey: false
        }
    )
    column ISSUER_DETAILS (
        layout {
            sequence: 120
        }
        source {
            type: databaseColumn
            databaseColumn: ISSUER_DETAILS
            dataType: varchar2
            primaryKey: false
        }
    )
    column ISSUER_VAT (
        layout {
            sequence: 130
        }
        source {
            type: databaseColumn
            databaseColumn: ISSUER_VAT
            dataType: varchar2
            primaryKey: false
        }
    )
    column QR_IMAGE_URL (
        layout {
            sequence: 140
        }
        source {
            type: databaseColumn
            databaseColumn: QR_IMAGE_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINE_DESC (
        layout {
            sequence: 150
        }
        source {
            type: databaseColumn
            databaseColumn: LINE_DESC
            dataType: varchar2
            primaryKey: false
        }
    )
    column QTY (
        layout {
            sequence: 160
        }
        source {
            type: databaseColumn
            databaseColumn: QTY
            dataType: varchar2
            primaryKey: false
        }
    )
    column UNIT_PRICE (
        layout {
            sequence: 170
        }
        source {
            type: databaseColumn
            databaseColumn: UNIT_PRICE
            dataType: varchar2
            primaryKey: false
        }
    )
    column DISCOUNT (
        layout {
            sequence: 180
        }
        source {
            type: databaseColumn
            databaseColumn: DISCOUNT
            dataType: varchar2
            primaryKey: false
        }
    )
    column TAX_RATE (
        layout {
            sequence: 190
        }
        source {
            type: databaseColumn
            databaseColumn: TAX_RATE
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

`QR_IMAGE_URL` is built by the application, for example
`'data:image/png;base64,' || apex_web_service.blobtoclobbase64(apex_barcode.get_qrcode_png(p_value => h.zatca_tlv_base64))`
(check the APEX_BARCODE signature on your release), never taken from user input.

Payslip: map `lineTotal` to a signed amount column (earnings positive, deductions negative) and
leave Quantity and Unit Price empty; the payslip style ignores VAT.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Next Document [Plug-in]** > Appearance: *Multiple (Report)*, set Style to
*Bilingual Tax Invoice - smart*, then map the settings to the columns above.
