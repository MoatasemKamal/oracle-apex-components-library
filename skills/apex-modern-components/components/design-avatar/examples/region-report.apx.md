# Design Avatar: report region (APEXlang, APEX 26.1+)

Lists the members of a project team with photo (or initials), presence and job title.
Replace table/column names with objects proven from your schema. Settings reference
**projected column aliases**; the Style and Size settings take the entry **name**
(`withName`, `large`), not a display label.

```apexlang
region project_team (
    name: Project Team
    type: plugin/designAvatar
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: [
            #DEFAULT#
        ]
    }
    componentAppearance {
        display: report
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select e.first_name || ' ' || e.last_name                  as full_name,
                   upper(substr(e.first_name, 1, 1)
                      || substr(e.last_name, 1, 1))                   as initials,
                   case when e.photo is not null then
                        apex_util.get_blob_file_src('P10_PHOTO', e.emp_id)
                   end                                                as photo_url,
                   lower(e.presence)                                  as presence,
                   e.job_title                                        as job_title
              from project_members m
              join employees e on e.emp_id = m.emp_id
             where m.project_id = :P10_PROJECT_ID
             order by e.last_name
            ```
    }
    settings {
        style: withName
        name: FULL_NAME
        imageUrl: PHOTO_URL
        initials: INITIALS
        status: PRESENCE
        subtitle: JOB_TITLE
    }
    column FULL_NAME (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: FULL_NAME
            dataType: varchar2
            primaryKey: false
        }
    )
    column INITIALS (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: INITIALS
            dataType: varchar2
            primaryKey: false
        }
    )
    column PHOTO_URL (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: PHOTO_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column PRESENCE (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: PRESENCE
            dataType: varchar2
            primaryKey: false
        }
    )
    column JOB_TITLE (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: JOB_TITLE
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Design Avatar [Plug-in]** > Appearance: *Multiple (Report)*, set
Style to With Name, then map Name, Image URL, Initials, Status and Subtitle to the
columns above. The Presence column must return online, away, busy or offline.
