# Design gate with the frontend-design plugin

When the `frontend-design` plugin (from the `anthropics/claude-code` marketplace:
`/plugin marketplace add anthropics/claude-code`, then
`/plugin install frontend-design@claude-code-plugins`) is installed, load its skill before
designing or reworking any component, template or style, and apply it together with
`design-quality.md`. It is guidance, not a dependency: the library builds without it.

## How it applies to APEX work

1. **Ground the design in the subject.** Every component here serves a business app
   (orders, invoices, approvals, HR, logistics, government services). Name the concrete
   subject, the audience and the component's single job before choosing a look, and use
   that domain's real content and vocabulary in previews.
2. **Plan, then review the plan before code.** Write a compact token plan (palette as
   `--ut-*` roles, type roles, layout sketch, one principle that makes it distinct). Compare
   it with the generic defaults the skill lists; change any part that you would have
   produced for any other brief, and note what changed.
3. **One memorable element.** Spend boldness in one place per component and keep the rest
   quiet. Remove one accessory before shipping.
4. **Motion only with a reason.** Motion that answers a user action (open, expand, confirm,
   drag) is welcome. Avoid decorative entrance animations on every item and hover
   transitions on every card; keep at most one orchestrated moment.
5. **Structure is information.** Borders, numbering, eyebrows and dividers must encode
   something true (a sequence, a group, a state). Numbered markers only for real sequences.
6. **Copy is design.** Plain, specific, sentence case, active voice; a button says what
   happens ("Approve invoice", then the toast "Invoice approved"). Errors say what went wrong
   and how to fix it. Empty states invite the next action.

## Tells to remove in this library (audit checklist)

- Decorative ALL-CAPS eyebrow labels above headings (a real, short status chip may stay).
- Meta strings joined with middle dots ("A · B · C") where a clearer structure fits.
- "→" or "›" appended to link and button text by default.
- The same radius, the same soft grey shadow and the same gradient wash on every surface.
- Entrance fade-and-slide on every row or card, hover lift on everything.
- A monospace face used only as decoration for small labels.
- Placeholder or salesy copy in previews ("Unlock insights", "Seamless", "Lorem").

These are style defaults, not bans: keep one when it is the right choice for the brief, and
never change a component's `staticId`, attribute numbers or attribute static IDs while
fixing them (bump the patch version instead).
