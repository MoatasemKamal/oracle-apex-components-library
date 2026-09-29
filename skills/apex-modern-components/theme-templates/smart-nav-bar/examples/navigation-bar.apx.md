# Smart Nav Bar in the application Navigation Bar

Set the template on the application's Navigation Bar (User Interface > Navigation Bar >
List Template), in APEXlang in `application.apx`:

```apexlang
navigationBar {
    list: @navigation-bar
    listTemplate: @amc-smart-nav-bar
    templateOptions: [
        #DEFAULT#
        amc-TSmartNavBar--pulse
    ]
}
```

## A static Navigation Bar list

User Defined Attribute 1 is the role, Attribute 2 the badge count, Attribute 3 secondary
text. Sub entries of the user entry form the user menu; `---` with the URL `separator`
becomes a divider, as in Universal Theme's default list.

```apexlang
list navigation-bar (
    name: Navigation Bar

    entry search (
        label: Search
        icon {
            imageIconCssClasses: fa-search
        }
        layout {
            sequence: 10
        }
        link {
            target: {
                page: 20
            }
        }
        userDefinedAttributes {
            1: search
        }
    )

    entry help (
        label: Help
        icon {
            imageIconCssClasses: fa-question-circle-o
        }
        layout {
            sequence: 30
        }
        link {
            target: {
                page: 90
            }
        }
        userDefinedAttributes {
            1: help
        }
    )

    entry app-user (
        label: &APP_USER.
        icon {
            imageIconCssClasses: fa-user
        }
        layout {
            sequence: 40
        }
        link {
            target: {
                type: url
                url: #
            }
        }
        userDefinedAttributes {
            1: user
            3: &G_USER_EMAIL.
        }
    )

    entry preferences (
        label: Preferences
        icon {
            imageIconCssClasses: fa-sliders
        }
        layout {
            sequence: 50
            parentEntry: @app-user
        }
        link {
            target: {
                page: 95
            }
        }
    )

    entry sign-out (
        label: Sign Out
        icon {
            imageIconCssClasses: fa-sign-out
        }
        layout {
            sequence: 60
            parentEntry: @app-user
        }
        link {
            target: {
                type: url
                url: &LOGOUT_URL.
            }
        }
        serverSideCondition {
            type: userIsAuthenticated
        }
    )
)
```

`Preferences` (page 95) is where a theme-style switch belongs: a page with the Theme Style
item or the built-in Theme Style Selection region. The template has no built-in
Light / Dark / System control, because APEX has no stable client API for it.

## Notifications from a dynamic list query

The notification sub entries come from data, so the Navigation Bar list is usually a
**dynamic list** (Shared Components > Lists > Create > Dynamic, SQL Query). The query
returns the whole bar as a hierarchy: the fixed entries plus one child row per notification
under the `notifications` row. Columns follow APEX's dynamic list format: `level, label,
target, is_current, image, image_attribute, image_alt_attribute, attribute1 .. attribute10`.

```sql
with bar as (
    select 'SEARCH' id, null parent_id, 10 seq, 'Search' label,
           apex_page.get_url(p_page => 20) target, 'fa-search' image,
           'search' a1, null a2, null a3
      from dual
    union all
    select 'NOTIF', null, 20, 'Notifications',
           apex_page.get_url(p_page => 80), 'fa-bell-o',
           'notifications',
           to_char(nullif((select count(*) from app_notifications n
                            where n.recipient = :APP_USER and n.read_on is null), 0)),  -- empty, not 0: no badge without JS
           null
      from dual
    union all
    select 'N-' || n.notification_id, 'NOTIF',
           100 + row_number() over (order by n.created_on desc),
           n.message,
           apex_page.get_url(p_page => n.target_page, p_items => n.target_items, p_values => n.target_values),
           n.icon_class,
           'N-' || n.notification_id,                                -- stable key: read state survives reloads
           case when n.read_on is not null then 'read' end,          -- already read on the server
           apex_util.get_since(n.created_on)                         -- time shown in the feed
      from app_notifications n
     where n.recipient = :APP_USER
       and n.created_on > sysdate - 14
     fetch first 8 rows only
    union all
    select 'HELP', null, 30, 'Help', apex_page.get_url(p_page => 90), 'fa-question-circle-o', 'help', null, null from dual
    union all
    select 'USER', null, 40, :APP_USER, '#', 'fa-user', 'user', null,
           (select apex_escape.html(email) from app_users where username = :APP_USER)
      from dual
    union all
    select 'PREFS', 'USER', 50, 'Preferences', apex_page.get_url(p_page => 95), 'fa-sliders', null, null, null from dual
    union all
    select 'SIGNOUT', 'USER', 60, 'Sign Out', :LOGOUT_URL, 'fa-sign-out', null, null, null from dual
)
select level,
       label,
       target,
       null  is_current,
       image,
       null  image_attribute,
       null  image_alt_attribute,
       a1    attribute1,
       a2    attribute2,
       a3    attribute3
  from bar
 start with parent_id is null
connect by prior id = parent_id
 order siblings by seq
```

Notes:

- `attribute2` on the `notifications` row is the unread count shown on the bell. After
  **Mark all read** the browser remembers the keys and the count and hides the badge until
  the count grows; mark notifications read on the server too (for example on the
  notifications page) so the count stays honest across devices.
- Sub entry text is output with `#TEXT_ESC_SC#`. Escape any user-entered value you put in
  an attribute column (`apex_escape.html`), as the email above.
- To update the badge without a page load, call
  `amcTplSmartNavBar.setCount(document.querySelector('.amc-TSmartNavBar'), 5)` from a
  Dynamic Action (for example after a Push Notification or a timer), which also announces
  the new count.
- An AMC Command Rail or any other search on the page can take over the search button
  and Ctrl/Cmd+K:

  ```js
  document.addEventListener("amc:command-search", function (e) {
      e.preventDefault();          // the nav bar will not open its own dialog
      myPalette.open();
  });
  ```

The list template reference (`@amc-smart-nav-bar`), the `navigationBar` block and the
dynamic list syntax are not yet confirmed by the APEXlang compiler; check with apexlang's
compiler-truth audit or a real import.
