# Key-Value List: record details (APEXlang)

Unpivot the current record into label/value rows:

```apexlang
region customer_details (
    name: Details
    type: plugin/keyValueList
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
            select label, value, icon
              from customers c
                   cross apply (
                     select 'Customer' label, c.name value, 'fa-building-o' icon, 1 seq from dual union all
                     select 'Account Manager', c.account_manager, 'fa-user', 2 from dual union all
                     select 'Contract End', to_char(c.contract_end, 'DD-Mon-YYYY'), 'fa-calendar', 3 from dual
                   )
             where c.id = :P20_ID
             order by seq
            ```
        pageItemsToSubmit: [
            P20_ID
        ]
    }
    settings {
        label: LABEL
        value: VALUE
        icon: ICON
        layout: inline
        dividers: true
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
    column VALUE (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: VALUE
            dataType: varchar2
            primaryKey: false
        }
    )
    column ICON (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: ICON
            dataType: varchar2
            primaryKey: false
        }
    )
)
```
