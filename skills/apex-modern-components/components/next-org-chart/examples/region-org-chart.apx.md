# Next Org Chart: reporting lines from a CONNECT BY query (APEXlang)

```apexlang
region org_chart (
    name: Organization Chart
    type: plugin/nextOrgChart
    layout {
        sequence: 20
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
            select p.position_id,
                   p.parent_position_id                                   as parent_id,
                   e.first_name || ' ' || e.last_name                     as name,
                   p.job_title                                            as title,
                   d.department_name                                      as department,
                   case when e.photo is not null then
                     apex_util.get_blob_file_src('P40_PHOTO', e.employee_id)
                   end                                                    as image_url,
                   upper(substr(e.first_name, 1, 1) || substr(e.last_name, 1, 1)) as initials,
                   case when e.employee_id is not null then
                     apex_page.get_url(p_page => 30, p_items => 'P30_EMP_ID', p_values => e.employee_id)
                   end                                                    as link_url,
                   case when e.employee_id is null then 'Y' else 'N' end  as vacant,
                   p.approved_headcount                                   as headcount,
                   level                                                  as tree_level
              from hr_positions p
              left join hr_employees   e on e.employee_id   = p.holder_employee_id
              left join hr_departments d on d.department_id = p.department_id
             start with p.parent_position_id is null
           connect by nocycle prior p.position_id = p.parent_position_id
             order siblings by p.sort_order, p.job_title
            ```
    }
    settings {
        style: topDown
        id: POSITION_ID
        parentId: PARENT_ID
        name: NAME
        title: TITLE
        department: DEPARTMENT
        imageUrl: IMAGE_URL
        initials: INITIALS
        linkUrl: LINK_URL
        vacant: VACANT
        headcount: HEADCOUNT
        level: TREE_LEVEL
        expandLevels: 2
        showSearch: Y
    }
    column POSITION_ID (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: POSITION_ID
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
    column NAME (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: NAME
            dataType: varchar2
            primaryKey: false
        }
    )
    column TITLE (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: TITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column DEPARTMENT (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: DEPARTMENT
            dataType: varchar2
            primaryKey: false
        }
    )
    column IMAGE_URL (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: IMAGE_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column INITIALS (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: INITIALS
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_URL (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column VACANT (
        layout {
            sequence: 90
        }
        source {
            type: databaseColumn
            databaseColumn: VACANT
            dataType: varchar2
            primaryKey: false
        }
    )
    column HEADCOUNT (
        layout {
            sequence: 100
        }
        source {
            type: databaseColumn
            databaseColumn: HEADCOUNT
            dataType: number
            primaryKey: false
        }
    )
    column TREE_LEVEL (
        layout {
            sequence: 110
        }
        source {
            type: databaseColumn
            databaseColumn: TREE_LEVEL
            dataType: number
            primaryKey: false
        }
    )
)
```

Change `style` to `leftToRight`, `swimlanes`, `radial` or `directory`. `expandLevels` (1 to 12)
sets how many levels are open on load; search opens any branch it needs.

Notes:
- The chart builds the tree from `ID` and `PARENT_ID`, so any row order works, for example a
  plain `select ... from hr_positions` with a `where` clause. `CONNECT BY` with
  `ORDER SIBLINGS BY` and `LEVEL` is still worth it: siblings keep your order and the outline
  shown without JavaScript is indented by `level`.
- A filtered query (one department, or `start with p.position_id = :P20_POSITION_ID` for one
  branch) still renders: a row whose manager is not in the result becomes a top-level person.
  Rows that would form a loop are cut once, so `nocycle` data never breaks the page.
- Positions are the rows, so an open position is a row without a holder (`vacant = 'Y'`); its
  name may stay empty and it reads Vacant position.
- `headcount` is optional; when empty the chart counts the filled positions below each
  person that are in the query.
- Report pagination: set the region's rows per page above the number of positions (for
  example 1000); the chart only knows the rows it receives.
- Refresh: after changing a position in a dialog, refresh the region (Dynamic Action
  "Refresh" on Dialog Closed); the chart rebuilds itself. To open the chart on a person, call
  `amcNextOrgChart.reveal(document.getElementById("org_chart"), 42)` with the row ID.
- Confirm column and setting placement with the apexlang grammar contract for your build
  (`apexctl apexlang grammar contract --components region --groups source`).
