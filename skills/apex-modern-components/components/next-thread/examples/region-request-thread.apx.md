# Next Thread: comments and history of a purchase request (APEXlang)

The region shows the thread of the record on page 20; a native form region below it posts new
comments. There is no composer inside the component on purpose, so the form can use the
app's own validations, rich text rules and file upload.

```apexlang
region request_thread (
    name: Comments and history
    type: plugin/nextThread
    layout {
        sequence: 30
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: #DEFAULT#
    }
    componentAppearance {
        display: report
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select c.comment_id,
                   c.parent_comment_id                                    as parent_id,
                   u.display_name                                         as author,
                   upper(substr(u.first_name, 1, 1) || substr(u.last_name, 1, 1)) as initials,
                   case when u.photo is not null then
                     apex_util.get_blob_file_src('P20_PHOTO', u.user_id)
                   end                                                    as image_url,
                   to_char(c.created_on, 'YYYY-MM-DD"T"HH24:MI:SS')       as created,
                   case c.kind when 'status' then s.status_name else c.body end as body,
                   c.kind                                                 as kind,
                   f.file_name                                            as attachment_name,
                   case when f.file_id is not null then
                     apex_page.get_url(p_request => 'APPLICATION_PROCESS=DOWNLOAD_FILE',
                                       p_items   => 'G_FILE_ID', p_values => f.file_id)
                   end                                                    as attachment_url,
                   (select listagg(m.display_name, '|') within group (order by m.display_name)
                      from pr_comment_mentions cm
                      join app_users m on m.user_id = cm.user_id
                     where cm.comment_id = c.comment_id)                 as mentions,
                   case when c.visibility = 'INTERNAL' then 'Y' end       as is_internal,
                   case when c.created_by = :APP_USER then 'Y' end        as is_mine,
                   case s.status_code
                     when 'APPROVED' then 'success'
                     when 'ON_HOLD'  then 'warning'
                     when 'REJECTED' then 'danger'
                     when 'SUBMITTED' then 'info'
                   end                                                    as state
              from pr_comments c
              join app_users u        on u.user_id    = c.created_by_id
              left join pr_statuses s on s.status_code = c.new_status_code
              left join pr_files f    on f.file_id     = c.file_id
             where c.request_id = :P20_REQUEST_ID
               and (c.visibility = 'PUBLIC' or apex_acl.has_user_role(p_role_static_id => 'PROCUREMENT'))
             order by c.created_on
            ```
    }
    settings {
        style: auditTimeline
        id: COMMENT_ID
        parentId: PARENT_ID
        author: AUTHOR
        initials: INITIALS
        imageUrl: IMAGE_URL
        created: CREATED
        body: BODY
        kind: KIND
        attachmentName: ATTACHMENT_NAME
        attachmentUrl: ATTACHMENT_URL
        mentions: MENTIONS
        isInternal: IS_INTERNAL
        isMine: IS_MINE
        state: STATE
        showLatest: 6
        sortOrder: oldestFirst
    }
    column COMMENT_ID (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: COMMENT_ID
            dataType: number
            primaryKey: true
        }
    )
    column PARENT_ID (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: PARENT_ID
            dataType: number
            primaryKey: false
        }
    )
    column AUTHOR (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: AUTHOR
            dataType: varchar2
            primaryKey: false
        }
    )
    column INITIALS (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: INITIALS
            dataType: varchar2
            primaryKey: false
        }
    )
    column IMAGE_URL (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: IMAGE_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column CREATED (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: CREATED
            dataType: varchar2
            primaryKey: false
        }
    )
    column BODY (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: BODY
            dataType: varchar2
            primaryKey: false
        }
    )
    column KIND (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: KIND
            dataType: varchar2
            primaryKey: false
        }
    )
    column ATTACHMENT_NAME (
        layout {
            sequence: 90
        }
        source {
            type: databaseColumn
            databaseColumn: ATTACHMENT_NAME
            dataType: varchar2
            primaryKey: false
        }
    )
    column ATTACHMENT_URL (
        layout {
            sequence: 100
        }
        source {
            type: databaseColumn
            databaseColumn: ATTACHMENT_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column MENTIONS (
        layout {
            sequence: 110
        }
        source {
            type: databaseColumn
            databaseColumn: MENTIONS
            dataType: varchar2
            primaryKey: false
        }
    )
    column IS_INTERNAL (
        layout {
            sequence: 120
        }
        source {
            type: databaseColumn
            databaseColumn: IS_INTERNAL
            dataType: varchar2
            primaryKey: false
        }
    )
    column IS_MINE (
        layout {
            sequence: 130
        }
        source {
            type: databaseColumn
            databaseColumn: IS_MINE
            dataType: varchar2
            primaryKey: false
        }
    )
    column STATE (
        layout {
            sequence: 140
        }
        source {
            type: databaseColumn
            databaseColumn: STATE
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Change `style` to `chat`, `emailThread`, `activityFeed` or `caseFile`. `showLatest` (0 to 200)
folds earlier top-level entries behind Show earlier updates; `sortOrder: newestFirst` suits
the activity feed.

## Posting and refreshing

1. Add a form region (or page items) under the thread: a textarea `P20_NEW_COMMENT`, an
   optional switch `P20_INTERNAL` for procurement users and a button `POST_COMMENT` labelled
   Post comment.
2. A page process (or an Ajax Callback run from a Dynamic Action) inserts the row into
   `pr_comments` with `created_on = systimestamp` and clears the textarea.
3. When the button submits the page, the thread renders again with the new row. To post
   without a page submit, use a Dynamic Action on the button: Execute Server-side Code (the
   insert, with `P20_NEW_COMMENT` and `P20_INTERNAL` in Items to Submit), then Refresh with
   Selection Type Region and Region Comments and history, then Set Value to clear the
   textarea.
4. After the refresh the runtime rebuilds the thread, keeps earlier updates open when the
   user had opened them, marks entries it has not seen before (your own slide in on the chat
   style) and announces "1 new update" to screen readers. Nothing else is needed; the
   runtime also reacts to `apexafterrefresh` and calls `amcNextThread.refresh()` if you rebuild
   the markup yourself.

Notes:
- Return `created` in the time zone users should see; the component does not convert it.
  Relative times ("12 minutes ago") use the browser clock, so keep server and client time in
  sync or return times in the session time zone (`from_tz(... ) at time zone sessiontimezone`).
- For status rows return only the new status in `body`; the thread writes "set the status to"
  around it. System rows (`kind = 'system'`) return their whole sentence.
- Replies (`parent_id`) are nested one level; a reply to a reply sits in the same group and
  says whom it answers.
- `body` is escaped by APEX (escape mode HTML); line breaks are kept.
- Confirm column and setting placement with the apexlang grammar contract for your build
  (`apexctl apexlang grammar contract --components region --groups source`).
