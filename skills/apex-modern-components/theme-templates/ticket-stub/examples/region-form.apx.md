# Ticket Stub around a Form

Set the region's `appearance.template` to the Ticket Stub template. Put the region's buttons
in any button position; they all render in the stub.

```apexlang
region booking (
    name: Booking RUH to JED
    type: staticContent
    appearance {
        template: @amc-ticket-stub
        templateOptions: [
            #DEFAULT#
            amc-TTicketStub--success
        ]
        icon: fa-plane
    }
)
```

Around a Classic Report add `amc-TTicketStub--noPadding`. In a narrow column or a modal
dialog the stub moves on top by itself; `amc-TTicketStub--top` forces that layout. The
template reference (`@amc-ticket-stub`) and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
