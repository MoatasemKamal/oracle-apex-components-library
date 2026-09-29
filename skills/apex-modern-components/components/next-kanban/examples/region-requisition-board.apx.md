# Next Kanban: purchase requisition board that saves moves (APEXlang)

```apexlang
region requisition_board (
    name: Requisitions
    type: plugin/nextKanban
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
            select r.req_id                                          as card_id,
                   s.status_code                                     as column_key,
                   s.status_name                                     as column_label,
                   s.wip_limit                                       as column_limit,
                   r.req_no || ' ' || r.title                        as title,
                   r.summary                                         as description,
                   u.full_name                                       as assignee,
                   u.initials                                        as initials,
                   to_char(r.need_by, 'YYYY-MM-DD')                  as due_date,
                   lower(r.priority)                                 as priority,
                   r.branch || '|' || r.category                     as tags,
                   case
                     when r.status_code = 'APPROVED' then 'success'
                     when r.blocked_reason is not null then 'danger'
                     when r.need_by < trunc(sysdate) + 2 then 'warning'
                     else 'neutral'
                   end                                               as state,
                   apex_page.get_url(p_page => 12, p_items => 'P12_REQ_ID', p_values => r.req_id) as link_url
              from req_statuses s
              left join requisitions r on r.status_code = s.status_code
              left join app_users u    on u.user_id = r.owner_id
             order by s.seq, r.board_pos nulls last, r.req_id
            ```
    }
    settings {
        style: calmLanes
        cardId: CARD_ID
        columnKey: COLUMN_KEY
        columnLabel: COLUMN_LABEL
        columnLimit: COLUMN_LIMIT
        title: TITLE
        description: DESCRIPTION
        assignee: ASSIGNEE
        initials: INITIALS
        dueDate: DUE_DATE
        priority: PRIORITY
        tags: TAGS
        state: STATE
        linkUrl: LINK_URL
        allowMove: true
        cardItem: P10_CARD_ID
        fromItem: P10_FROM_COLUMN
        toItem: P10_TO_COLUMN
        indexItem: P10_POSITION
    }
)
```

The `left join` from the status table returns one row with an empty Card ID for every status
that has no cards, so empty columns still show and can receive cards.

## Saving a move

The board never writes to the database. Create four hidden items (`P10_CARD_ID`,
`P10_FROM_COLUMN`, `P10_TO_COLUMN`, `P10_POSITION`, value protected off) and a Dynamic Action:

- Event: Custom, custom event `amc:kanban-move`, selection type jQuery Selector `#requisition_board`
  after giving the region the Static ID `requisition_board` under Advanced (the event bubbles
  from the board to the region).
- True action 1: Execute Server-side Code, items to submit `P10_CARD_ID,P10_FROM_COLUMN,P10_TO_COLUMN,P10_POSITION`:

```sql
update requisitions
   set status_code = :P10_TO_COLUMN,
       board_pos   = to_number(:P10_POSITION)
 where req_id      = to_number(:P10_CARD_ID)
   and status_code = :P10_FROM_COLUMN;  -- ignores stale moves
-- renumber board_pos in the target column here if the order matters
```

- True action 2: Refresh the region, so counts and positions come from the database again.

The page items are set (without a change event) before the event fires. In JavaScript the same
values are in the event detail: `this.browserEvent.originalEvent.detail` in a Dynamic Action, or
`document.addEventListener("amc:kanban-move", function (e) { e.detail.id; e.detail.to; })`.
Call `e.preventDefault()` in a plain listener to refuse a move; the card goes back.

Change `style` to `opsBoard`, `stickyWall`, `dueTimeline` or `compactList`. Set
`allowMove: false` for a read-only board. Confirm DA and setting placement with the apexlang
grammar contract for your build (`apexctl apexlang grammar contract --components region`).
