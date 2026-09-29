# Marquee Links on a List region

An announcement ticker at the top of the home page. Attribute 1 (Tag) holds a short chip label
such as New or Due soon. The region usually sits in the Breadcrumb Bar or Body position with the
Blank with Attributes region template.

```apexlang
region announcements (
    name: Announcements
    type: list
    source {
        list: @home-announcements
    }
    appearance {
        template: @/blank-with-attributes
    }
    componentAppearance {
        listTemplate: @amc-marquee-links
        templateOptions: [
            #DEFAULT#
        ]
    }
)
```

The template loads `amc-tpl-marquee-links.js`, which repeats the entries so the loop is
seamless. The template reference (`@amc-marquee-links`), the region template reference and the
theme-template folder layout are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit.
