# Readable Article on a policy page

A Static Content region holds the travel policy, written with h2 and h3 headings in the rich
text editor. The template caps the measure, sets the heading scale, builds the Contents from the
headings, shows the reading time and a copy-link anchor on every heading, and prints cleanly.

```apexlang
region travel-policy (
    name: Travel and expense policy
    type: staticContent
    source {
        htmlCode:
            ```html
            <p>This policy explains what Northwind Gulf Trading pays for when you travel ...</p>
            <h2>Before you travel</h2>
            <p>Every trip needs an approved travel request ...</p>
            <h3>Booking flights</h3>
            <p>Book all flights through the travel desk ...</p>
            ```
    }
    appearance {
        template: @amc-readable-article
        templateOptions: [
            #DEFAULT#
        ]
        icon: fa-plane
    }
    advanced {
        staticId: travel-policy
    }
)
```

## Text from a table (Dynamic Content)

Policies that legal maintains in a table can be served by a Dynamic Content region. The
function returns the stored, already sanitised HTML; the template reads its headings after
every refresh, so publishing a new version and refreshing the region rebuilds the Contents.

```apexlang
region leave-policy (
    name: سياسة الإجازة السنوية
    type: dynamicContent
    source {
        plsqlFunctionBodyReturningAClob:
            ```sql
            declare
              l_html clob;
            begin
              select p.body_html into l_html      -- placeholder table; store sanitised HTML only
                from hr_policies p
               where p.policy_code = 'ANNUAL_LEAVE'
                 and p.lang = apex_util.get_session_lang
                 and p.status = 'PUBLISHED';
              return l_html;
            end;
            ```
    }
    appearance {
        template: @amc-readable-article
        templateOptions: [
            #DEFAULT#
            amc-TReadableArticle--numbered
        ]
    }
    advanced {
        staticId: leave-policy
        customAttributes: data-amc-text-minutes="%0 دقائق قراءة" data-amc-wpm="170"
    }
)
```

Translate the Contents label in the template markup, or add a translated copy of the template
for the Arabic application. Under a fixed header, add `:root{--amc-sticky-offset:48px}` to the
page's inline CSS.

The template reference (`@amc-readable-article`), the `customAttributes` property name and the
Dynamic Content source property name are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit.
