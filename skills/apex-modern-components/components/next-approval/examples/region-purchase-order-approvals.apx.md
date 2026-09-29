# Next Approval: purchase order approval chain (APEXlang)

```apexlang
region po_approvals (
    name: Approvals
    type: plugin/nextApproval
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
            select a.step_no                                           as step,
                   u.full_name                                         as approver,
                   a.role_name                                         as role,
                   u.initials                                          as initials,
                   case when u.photo is not null then
                     apex_util.get_blob_file_src('P20_PHOTO', u.user_id)
                   end                                                 as image_url,
                   case a.status
                     when 'APPROVED' then 'approved'
                     when 'OPEN'     then 'pending'
                     when 'REJECTED' then 'rejected'
                     when 'SKIPPED'  then 'skipped'
                     else 'waiting'
                   end                                                 as state,
                   to_char(a.acted_at, 'YYYY-MM-DD"T"HH24:MI')         as action_date,
                   a.comment_text                                      as approver_comment,
                   d.full_name                                         as delegated_from,
                   to_char(a.due_at, 'YYYY-MM-DD"T"HH24:MI')           as due_date
              from po_approvals a
              join app_users u      on u.user_id = a.approver_id
              left join app_users d on d.user_id = a.delegated_from_id
             where a.po_id = :P20_PO_ID
             order by a.step_no, a.approver_seq
            ```
        pageItemsToSubmit: [
            P20_PO_ID
        ]
    }
    settings {
        style: stepper
        step: STEP
        approver: APPROVER
        role: ROLE
        initials: INITIALS
        imageUrl: IMAGE_URL
        state: STATE
        actionDate: ACTION_DATE
        comment: APPROVER_COMMENT
        delegatedFrom: DELEGATED_FROM
        dueDate: DUE_DATE
        parallelRule: all
    }
)
```

Rows with the same `step_no` are parallel approvers; `parallelRule: any` completes the step
at the first approval. Return `pending` only for approvers who can act now and `waiting` for
later steps; the component works out the current step, overdue and due-soon states, and the
SLA ring (from the previous step's latest Action Date to Due Date). Change `style` to `chain`,
`signatureSheet`, `chipRow` or `auditLog`.

For the approver's own task page, use partial mode (`componentAppearance { display: partial }`)
with a single-row source such as `... where a.approver_id = :APP_USER_ID and a.status = 'OPEN'`.
Confirm column and setting placement with the apexlang grammar contract for your build
(`apexctl apexlang grammar contract --components region --groups source`).

## Per-row values: parallel rule per step

`parallelRule` is the region default. Since 1.1.0 **Row Parallel Rule**
(`parallelRuleValue`, attribute 13, Session State Value) lets each step carry its own rule:
`all` or `any`, repeated on every row of the step (the first row of the step with a valid
value decides); null or anything else uses `parallelRule`. Add to the query

```sql
                   case s.decision_mode
                     when 'ANY_OF' then 'any'
                     when 'ALL_OF' then 'all'
                   end                                                 as parallel_rule
              -- join po_approval_steps s on s.po_id = a.po_id and s.step_no = a.step_no
```

and to `settings` the line `parallelRuleValue: PARALLEL_RULE`. The step heading then reads
"Any one of 2 can approve" for that step while the others keep "All must approve".
