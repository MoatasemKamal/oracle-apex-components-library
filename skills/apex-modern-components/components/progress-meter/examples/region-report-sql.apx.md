# Progress Meter: one bar per row from a SQL query (APEXlang)

Report mode renders one labelled bar per query row. Label, Value, Max, Value Text and State are all columns; only Size is a region setting.

Tables and columns (`orders`, `invoices`, `employees`, `customers` and so on) are **placeholders**: replace them with objects proven from your schema before generating the page.

```apexlang
region project_progress (
    name: Project Progress
    type: plugin/progressMeter
    layout {
        sequence: 10
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
            select p.project_name                                             as label,
                   p.tasks_done                                               as value_num,
                   p.tasks_total                                              as max_num,
                   p.tasks_done || ' of ' || p.tasks_total || ' tasks'        as value_text,
                   case when p.due_date < sysdate and p.tasks_done < p.tasks_total then 'danger'
                        when p.tasks_done = p.tasks_total then 'success'
                        when p.tasks_done / nullif(p.tasks_total, 0) < 0.3 then 'warning'
                   end                                                        as state
              from projects p
             where p.owner = :APP_USER
             order by p.due_date
            ```
    }
    settings {
        label: LABEL
        value: VALUE_NUM
        max: MAX_NUM
        valueText: VALUE_TEXT
        state: STATE
        size: small
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
    column VALUE_NUM (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE_NUM
            dataType: varchar2
            primaryKey: false
        }
    )
    column MAX_NUM (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: MAX_NUM
            dataType: varchar2
            primaryKey: false
        }
    )
    column VALUE_TEXT (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE_TEXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column STATE (
        layout {
            sequence: 50
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

Value and Max are plain numbers (period as decimal separator); format the visible text in Value Text. For a bar inside a report column use partial mode, as in `column-partial.apx.md`.

## Builder (APEX 23.1 - 25.x, legacy import)

Create region > Type **Progress Meter [Plug-in]** > Source: SQL Query > Appearance: *Multiple (Report)*, then map Label, Value, Max, Value Text and State to the columns.
