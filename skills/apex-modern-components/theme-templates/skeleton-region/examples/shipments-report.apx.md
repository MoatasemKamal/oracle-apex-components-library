# Skeleton Region around a Classic Report that refreshes on a filter

The report refreshes when `P60_STATUS` changes (a Dynamic Action with a Refresh action). A fast
response (under 400 ms) shows nothing; a slow one shows a skeleton shaped like the current rows.

```apexlang
region shipments (
    name: Shipments this week
    type: classicReport
    source {
        sqlQuery:
            ```sql
            select shipment_no, consignee, route, status, weight_kg
              from shipments                         -- placeholder
             where ship_date >= trunc(sysdate, 'IW')
               and (:P60_STATUS is null or status = :P60_STATUS)
            ```
        pageItemsToSubmit: P60_STATUS
    }
    appearance {
        template: @amc-skeleton-region
        templateOptions: [
            #DEFAULT#
            amc-TSkeletonRegion--elapsed
        ]
        icon: fa-truck
    }
    advanced {
        staticId: shipments
        customAttributes: data-amc-delay="400" data-amc-min-show="350"
    }
)
```

Lazy-loading region (Performance > Lazy Loading on): add `amc-TSkeletonRegion--firstLoad` and
`customAttributes: data-amc-skeleton="report" data-amc-skeleton-rows="8"`.

Your own Ajax (apex.server.process) into a Static Content region:

```js
amcTplSkeletonRegion.start(document.getElementById("kpis"));
apex.server.process("GET_KPIS", {}).always(function () { amcTplSkeletonRegion.stop(document.getElementById("kpis")); });
```

The template reference and property names are not yet confirmed by the APEXlang compiler; check
with apexlang's compiler-truth audit.
