# Journey Trail on a home page and Page 0

On the home page the template shows "Continue where you left off" above the destinations.
A second list region on Page 0 with the Trail only option records every page the user opens
(it can also be hidden with a Server-side Condition on the home page to avoid showing it twice).

```apexlang
region continue (
    name: Continue
    type: list
    source {
        list: @sales-destinations
    }
    componentAppearance {
        listTemplate: @amc-journey-trail
        templateOptions: [
            #DEFAULT#
        ]
    }
)
```

```apexlang
region recent-pages (
    name: Recently visited
    type: list
    source {
        list: @sales-destinations
    }
    componentAppearance {
        listTemplate: @amc-journey-trail
        templateOptions: [
            #DEFAULT#
            amc-TJourneyTrail--trailOnly
            amc-TJourneyTrail--noTimes
        ]
    }
)
```

What is stored: in `sessionStorage` (this tab only) under `amc-tpl-journey-trail:<application id>`,
the last 25 pages with key, link, title, time and visit count. Nothing leaves the browser; Clear
trail forgets it. The reference `@amc-journey-trail` and the theme-template folder layout are not
yet confirmed by the APEXlang compiler.
