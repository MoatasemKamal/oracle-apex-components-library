# Peak End Summary on an order confirmation page

The Submit process branches to page 31. Its Static Content region shows the order total as the
peak, the recap and what happens next. Values come from page items set by the process (or a
Before Header computation that queries the order).

```sql
-- Before Header process on page 31 (placeholder tables)
select o.order_no,
       to_char(o.total_amount, 'FML999G999G990D00', 'NLS_NUMERIC_CHARACTERS=''.,'' NLS_CURRENCY=''SAR ''') ,
       c.customer_name,
       to_char(o.expected_delivery, 'fmDay DD Month')
  into :P31_ORDER_NO, :P31_TOTAL, :P31_CUSTOMER, :P31_DELIVERY
  from orders o join customers c on c.customer_id = o.customer_id
 where o.order_id = :P31_ORDER_ID;
```

```apexlang
region order-placed (
    name: Order &P31_ORDER_NO. is placed
    type: staticContent
    source {
        htmlCode:
            ```html
            <p data-amc-peak><span>Order total</span>&P31_TOTAL.<small>VAT included</small></p>
            <dl>
              <div><dt>Customer</dt><dd>&P31_CUSTOMER.</dd></div>
              <div><dt>Expected delivery</dt><dd>&P31_DELIVERY.</dd></div>
            </dl>
            <h3>What happens next</h3>
            <ol data-amc-next>
              <li>The warehouse picks your order today.</li>
              <li>The driver calls ahead on the morning of delivery.</li>
            </ol>
            <p data-amc-end>A confirmation is on its way to your email. Nothing else is needed from you.</p>
            ```
    }
    appearance {
        template: @amc-peak-end-summary
        templateOptions: [
            #DEFAULT#
        ]
        icon: fa-check
    }
    advanced {
        staticId: order-placed
    }
)
```

Add a `Track this order` button in the Next position and `Back to orders` in Previous.

The template reference (`@amc-peak-end-summary`) and property names are not yet confirmed by the
APEXlang compiler; check with apexlang's compiler-truth audit.
