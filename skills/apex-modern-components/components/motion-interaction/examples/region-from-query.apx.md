# Motion Interaction: like state from a SQL query (APEXlang)

Label, Text, Link URL and Liked are Session State Values, so a like toggle can start in the state stored for the current user. Partial mode renders **one row**: make the query return exactly one row (aggregate, or filter by the page's key). If it returns no row the region renders nothing; add `fetch first 1 rows only` when several rows are possible.

Tables and columns (`orders`, `invoices`, `employees`, `customers` and so on) are **placeholders**: replace them with objects proven from your schema before generating the page.

```apexlang
region article_like (
    name: Like
    type: plugin/motionInteraction
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: #DEFAULT#
    }
    componentAppearance {
        display: partial
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select 'Like this article'                                       as label,
                   to_char(a.article_id)                                      as text,
                   case when exists (select 1 from article_likes l
                                      where l.article_id = a.article_id
                                        and l.user_name  = :APP_USER)
                        then 'Y' else 'N' end                                 as liked
              from articles a
             where a.article_id = :P10_ARTICLE_ID
            ```
        pageItemsToSubmit: [
            P10_ARTICLE_ID
        ]
    }
    settings {
        effect: like
        label: LABEL
        text: TEXT
        liked: LIKED
    }
    column LABEL (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: LABEL
            dataType: varchar2
            primaryKey: false
        }
    )
    column TEXT (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: TEXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column LIKED (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: LIKED
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Save changes with the Dynamic Action on `amc-like-change` shown in `region-partial.apx.md`; the event detail carries `value` (the TEXT column, here the article id) and `liked`.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Motion Interaction [Plug-in]** > Source: SQL Query > Appearance: *Single (Partial)*, Effect **Like**, then map Label, Text and Liked.
