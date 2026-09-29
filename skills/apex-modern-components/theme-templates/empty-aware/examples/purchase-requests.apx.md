# Empty Aware around a Classic Report of open requests

When the query returns no rows, the report's own When No Data Found text becomes the empty
state's message, and the Create button of the region moves into it. After the user creates a
request and the region refreshes, the rows appear and the button goes back to the header.

```apexlang
region open-requests (
    name: Open purchase requests
    type: classicReport
    source {
        sqlQuery:
            ```sql
            select request_no, requested_on, description, status, amount
              from purchase_requests              -- placeholder
             where requester = :APP_USER
               and status in ('DRAFT', 'SUBMITTED', 'IN_APPROVAL')
             order by requested_on desc
            ```
    }
    appearance {
        template: @amc-empty-aware
        templateOptions: [
            #DEFAULT#
        ]
        icon: fa-file-text-o
    }
    attributes {
        whenNoDataFound: No open purchase requests.
    }
    advanced {
        staticId: open-requests
        customAttributes: data-amc-empty-hint="Requests you raise appear here until procurement orders them."
    }
)

button new-request (
    label: New purchase request
    region: @open-requests
    position: create
    hot: true
    behavior {
        action: redirectToPage
        target: f?p=&APP_ID.:21:&SESSION.::&DEBUGDEMO.:21::
    }
)
```

## A filtered Interactive Report

Use the Search drawing and let the message come from a page item that holds the active search,
so the empty state names what did not match:

```
Custom Attributes:  data-amc-empty-title="No invoices match &P40_SEARCH!ATTR." data-amc-empty-hint="Check the spelling or clear the filters."
```

The template reference (`@amc-empty-aware`), `whenNoDataFound`, the button properties and
`customAttributes` are not yet confirmed by the APEXlang compiler; check with apexlang's
compiler-truth audit.
