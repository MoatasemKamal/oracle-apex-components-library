# Data binding: where every part of the library takes its values from

Everything in this library can be driven by a SQL query. This guide says, for each part,
**exactly where the data comes from**, what is per row and what is per region, and gives a
SQL snippet. Table and column names (`orders`, `invoices`, `employees`, ...) are
placeholders: prove real objects from the schema before generating a page.

| Part | Data comes from | Per row? |
|---|---|---|
| Template components, report mode | The region's source query; each column maps to a **Session State Value** setting | Yes, Session State Value settings |
| Template components, partial mode | A one-row source query, page items (`&P1_X.`), or a report column | One entity |
| Item plug-in (Star Rating) | The page item's Source (SQL query, database column, item) | One value |
| List templates (incl. navigation) | A static List, or a **dynamic list** built from a SQL query | Per entry (`#A01#`..`#A03#`) |
| Region templates (incl. Living, auth) | The framed native region's own source; frame strings via **Custom Attributes** | Per region |
| Theme styles | Current style set per user or session with `apex_theme` from a query | Per user |
| Theme Kit | JSON of brand tokens from SQL in a Page 0 item | Per tenant / user |
| Message Kit | Page messages (with `&ITEM.`), `apex.message`, `amcMessageKit.toast` with values from an Ajax callback | Per message |
| Motion Kit | No data; areas can come from a user preference via a body attribute | Per user / page |

## 1. Template components (report and partial)

### How values reach the template

- **Session State Value** settings (`type: sessionStateValue`, 372 of the library's
  attributes) are mapped to a **column** of the region's source query: in APEXlang
  `settings { label: LABEL }` plus a `column LABEL (...)` child; in the Builder, pick the column
  in the attribute. Each row gets its own value. They can also hold static text or `&ITEM.`
  substitutions.
- **Select list** and **Yes/No** settings (and a few Text, Integer and Number settings such as
  `DAY_START`, `SCORE_MAX`, `DEFAULT_TAX_RATE`) have **one value per region**. They are stored
  on the region, not in the query.

```sql
-- report mode: one tile per row
select kpi_label                                    as label,
       to_char(kpi_value, 'FML999G999G990')         as value_fmt,
       case when change_pct > 0 then 'up'
            when change_pct < 0 then 'down' else 'flat' end as trend,
       case when kpi_code in ('COST','DSO') then 'Y' end    as lower_is_better,
       case status when 'RED' then 'danger' when 'AMBER' then 'warning'
                   else 'success' end               as accent_value
  from sales_kpi_v            -- placeholder
 order by display_seq
```

```apexlang
settings {
    label: LABEL
    value: VALUE_FMT
    trend: TREND
    lowerIsBetter: LOWER_IS_BETTER
    accentValue: ACCENT_VALUE
    accent: primary
    columns: three
}
```

Every component's `examples/*.apx.md` shows its region (or item) fed by a query with the
column mappings. Rules for the query:

- Format display text in SQL with the application's NLS settings (`to_char(..., 'FML999G999G990')`);
  settings documented as numbers (Percent, Value, Series, Max) take plain numbers with a period
  (`to_char(x, 'TM9', 'NLS_NUMERIC_CHARACTERS=''.,''')`).
- Dates for runtime files are ISO text: `to_char(d, 'YYYY-MM-DD"T"HH24:MI')`.
- URLs from `apex_page.get_url(...)`, images from `apex_util.get_blob_file_src(...)`.
- Values are HTML-escaped by the component (`html` / `htmlAttribute` escape modes); never
  build HTML in the query.

### Partial mode (one entity)

The source query must return **one row** (aggregate or filter by the page key). A partial can
also be a report column (Interactive or Classic Report column of type `plugin/<name>`) whose
settings map to sibling columns, or use `&P1_ITEM.` in its Session State Value settings.

```sql
-- motion-text headline from one row
select 'Welcome back, ' || e.first_name || '|You have ' || count(t.task_id) || ' open tasks' as headline
  from employees e left join tasks t on t.assignee_id = e.employee_id and t.status = 'OPEN'
 where e.user_name = :APP_USER
 group by e.first_name
```

Partial-only components and their data settings:

| Component | Query-fed settings | Static |
|---|---|---|
| designHeader, nextHero, designDivider | all texts, icon, image, links | style, align, spacing |
| emptyState | title, message, link, **iconValue** (8) | icon, size, bordered |
| motionText | text (`|`-separated phrases) | effect, size, alignStart |
| motionCelebrate | message | effect, trigger, intensity |
| motionEffect | label, text, backText | effect, size, speed, replayOnClick |
| motionInteraction | label, text, linkUrl, liked | effect |
| motionLoader | **labelValue** (4) | style, label, size |

### Per-row values for settings that are really data

Some region settings describe the data, not the layout. Each has a Session State Value
companion (added in the component's 1.1.0; existing apps keep working, the companion falls back
to the region setting when the column is null or holds an unknown value):

| Component | Region setting (static) | Per-row companion (column) | Values |
|---|---|---|---|
| statCard | `invertTrend` (6) | `lowerIsBetter` (11) | Y/N, yes/no, true/false, 1/0 |
| statCard | `accent` (9) | `accentValue` (12) | primary, info, success, warning, danger |
| designKpi | `invertTrend` (7) | `lowerIsBetter` (14) | as above |
| nextKpi | `invertTrend` (7) | `lowerIsBetter` (15) | as above |
| motionCountUp | `accent` (8) | `accentValue` (9) | primary, success, warning, danger |
| nextApproval | `parallelRule` (12) | `parallelRuleValue` (13) | all, any (first row of a step decides) |
| nextCalendar | `initialDate` (13, text) | `initialDateValue` (19) | YYYY-MM-DD (first row with a date decides) |
| emptyState | `icon` (1, icon) | `iconValue` (8) | Font APEX class |
| motionLoader | `label` (2, text) | `labelValue` (4) | text |

Many components already had per-row state columns: `STATE` (success, warning, danger, info),
`TREND`, `STATUS`, `CATEGORY`, `TAX_RATE` (nextDocument), `ALL_DAY` (nextCalendar) and so on.

`&ITEM.` in static Text settings: whether APEX substitutes page items inside a template
component's static **Text** setting (for example `initialDate: &P10_DATE.`) is not confirmed
for every release. Use the Session State Value companion (a column such as
`:P10_DATE as initial_date`) instead.

### Why Style, Size, Columns and Effect stay per region

A template component's select-list and yes/no settings are stored once on the region, and
the template uses them to **choose the markup** (`{case STYLE/}`) and the class names for the
whole region; APEX renders the report body and every row with the same values. The library
also trusts these values (they come from a fixed list), whereas a per-row value that becomes a
class must pass a `{case}` whitelist. So layout choices (`STYLE`, `SIZE`, `COLUMNS`, `EFFECT`,
`ORIENTATION`, `LAYOUT`, `ROW_HEIGHT`, `ENTRANCE`...) are not column-mappable, by design.

**Different look per row, the supported patterns:**

1. **Per-row state or accent**: map `STATE` / `accentValue` / `lowerIsBetter` to a column, so
   one style shows rows in different colors and meanings:
   `case when days_overdue > 30 then 'danger' when days_overdue > 0 then 'warning' else 'success' end as state`.
2. **Separate regions**: one region per style, each with its own `where` clause on the same
   view (for example `where tier = 'PREMIUM'` in a `holoPremium` pricing region and
   `where tier <> 'PREMIUM'` in a `classic` one), or with server-side conditions.
3. **Per-row CSS through the column value in `{case}`** is only for values the component
   already lists; unknown values fall back, so data can never inject a class.

## 2. Item plug-in: Star Rating

The value is the page item's **Source**, exactly like a native item; the settings (Max Stars,
Icon, Clearable, Clear Label) are static.

```sql
-- Source: SQL Query (return single value), Used: only when current value is null
select to_char(r.rating) from order_reviews r      -- placeholder
 where r.order_id = :P20_ORDER_ID and r.reviewer = :APP_USER
```

On a Form region the source is the table column (Database Column `RATING`) and Automatic Row
Processing saves it. See `components/star-rating/examples/page-item-from-query.apx.md`.

## 3. List templates (incl. navigation menu and navigation bar)

List templates render native Lists. A List is either **static** (entries typed in Shared
Components) or **dynamic**: a SQL query whose columns are, in order,

`level, label, target, is_current, image, image_attribute, image_alt_attribute, attribute1 .. attribute10`

The template receives `#TEXT#` (label), `#LINK#` (target), `#IMAGE#` / `#ICON_CSS_CLASSES#`
(image), `#IMAGE_ALT#`, `#LIST_STATUS#` (current or not) and `#A01#`..`#A10#` (attribute1..10).
The library's list templates use **only `#A01#`..`#A03#`**, so every one of them works with a
dynamic list. The meaning of a01..a03 per template is in `assets/templates.catalog.json`
(`attributes`), for example bento-launchpad: a01 Tile size, a02 Description, a03 Metric.

```sql
-- Dynamic list for bento-launchpad: one tile per module the user may open
select 1                                               as lvl,
       m.module_name                                   as label,
       apex_page.get_url(p_page => m.page_id)          as target,
       case when m.page_id = :APP_PAGE_ID then 'YES' end as is_current,
       m.icon_class                                    as image,
       null                                            as image_attribute,
       m.module_name                                   as image_alt_attribute,
       case when m.is_featured = 'Y' then 'wide' end   as attribute1,   -- a01 tile size
       m.description                                   as attribute2,   -- a02 description
       (select count(*) from orders o where o.status = 'OPEN'
           and m.module_code = 'SALES') || ' open'     as attribute3    -- a03 metric
  from app_modules m                                   -- placeholder
 where m.role_code in (select r.role_code from user_roles r where r.user_name = :APP_USER)
 order by m.display_seq
```

- **Hierarchy** (menus, mega-menu, accordion-rail, side navigation): return `level` from a
  `connect by` or recursive query; the templates render one sublevel.
- **Navigation Menu / Navigation Bar**: create the dynamic list, then set it in User Interface
  > Navigation Menu (or Navigation Bar) with the template (in APEXlang, `list:` and
  `listTemplate:` inside `navigationMenu` / `navigationBar` of `application.apx`). Badges (for
  example command-rail a02, smart-nav-bar a02 count) are just columns:
  `(select count(*) from notifications n where n.user_name = :APP_USER and n.read_at is null) as attribute2`.
- Values used as class names (such as a01 = `wide`) are listed in the template's help; the CSS
  ignores unknown values. Everything else is escaped by APEX in the list substitutions.
- The *user-aware* list templates (frecency-launcher, journey-trail, moment-launcher,
  quest-list, peek-nav) learn in the browser (`localStorage`) on top of the entries the query
  returns; the query decides what exists, the template decides the order and emphasis.

## 4. Region templates (incl. Living and authentication)

A region template **frames** a native region. The content comes from that region's own source:
a Classic or Interactive Report query, a Form's table, a Chart's series query, Cards, or Static
Content with `&ITEM.` substitutions. The template itself has no query.

Frame settings:

- **Template Options**: static per region (look, color, density).
- **Custom Attributes** (Region > Advanced > Custom Attributes): the `data-amc-*` strings and
  settings of the Living templates. They accept `&ITEM.` substitutions, so they can come from a
  page item computed by SQL. Escape with `!ATTR`.

```sql
-- Page computation / Before Header process for freshness-frame
select to_char(max(loaded_at), 'YYYY-MM-DD"T"HH24:MI:SS') into :P1_LOADED_AT
  from etl_runs where job_name = 'ORDERS_SYNC';          -- placeholder
```

```
Custom Attributes:  data-amc-updated="&P1_LOADED_AT!ATTR." data-amc-stale-seconds="&P1_STALE_SECS!ATTR."
```

| Template | Data it reads | Custom Attributes from data |
|---|---|---|
| insight-frame, dual-view | The report table rendered by the region (numbers read from cells) | `data-amc-column`, `data-amc-label-column`, translated labels |
| freshness-frame | Page load time, or `data-amc-updated` (region or any element in the body) | `data-amc-updated`, `data-amc-stale-seconds` |
| arrange-board, focus-stage, zoom-dial | The regions on the page; per-user state in `localStorage` | labels |
| auth-card | Native page items and buttons (their own Sources, processes, validations) | none needed |
| auth-result | Region text with `&ITEM.` (for example the masked email) | none needed |
| every other region template | The framed region's content | none |

```sql
-- auth-result text on an "email sent" page: mask the address in SQL, show it with &P9_MASKED.
select regexp_replace(:P9_EMAIL, '^(.).*(@.*)$', '\1*****\2') into :P9_MASKED from dual;
```

Authentication logic (OTP expiry, attempt limits, neutral wording) stays in processes and
validations; the templates are UI only.

## 5. Theme styles: current style per user

Styles (`theme-styles/`) are chosen per application, per user or per session. Pick one from
data in an Application Process (*On New Session*, or *Before Header* on Page 0):

```sql
declare
  l_style_id number;
begin
  select s.theme_style_id
    into l_style_id
    from apex_application_theme_styles s
   where s.application_id = :APP_ID
     and s.theme_number   = 42
     and s.name = (select nvl(u.preferred_style, 'AMC Aurora')
                     from app_users u where u.user_name = :APP_USER);   -- placeholder
  apex_theme.set_user_style(
    p_application_id => :APP_ID,
    p_user           => :APP_USER,
    p_theme_number   => 42,
    p_id             => l_style_id);
exception
  when no_data_found then null;   -- keep the application's current style
end;
```

For a session-only choice use `apex_theme.set_session_style(p_theme_number => 42, p_name => 'AMC Aurora')`.
End users can also pick a style themselves when the style allows it (Customization). Confirm the
`apex_theme` procedure names and parameters on your release.

## 6. Theme Kit: brand tokens from a query

`theme-kit/` sets `--ut-*` (and `--amc-theme-*`) tokens at runtime from a JSON object built in
SQL, per tenant or user, on top of any style. Only whitelisted variables with valid color or
length values are applied, contrast is checked, nothing is parsed as HTML.

```sql
select json_object(
         '--ut-palette-primary'          value b.primary_color,
         '--ut-header-background-color'  value b.header_color,
         '--ut-component-border-radius'  value b.corner_radius
         absent on null returning varchar2(4000))
  into :P0_THEME_TOKENS
  from tenant_brand b                                   -- placeholder
 where b.tenant_id = :G_TENANT_ID;
```

Hand it to the page with `data-amc-theme-tokens="&P0_THEME_TOKENS!ATTR."` (Page HTML Body
Attribute) or a Page 0 region `<div id="amc-theme-tokens" hidden>&P0_THEME_TOKENS!HTML.</div>`,
or call `amcThemeKit.apply({...})`. Details, APEX_JSON variant and security: `theme-kit/README.md`.

## 7. Message Kit

The kit restyles the messages APEX already shows, so the data is the message text:

- **Page success message** of a process or branch, with substitutions:
  `Invoice &P20_INVOICE_NO. was sent to &P20_CUSTOMER_NAME.` (APEX escapes item values).
- **Errors** from validations (`apex_error.add_error`), shown as the error panel.
- **From an Ajax callback** that queries data:

```sql
-- Ajax Callback process GET_OVERDUE
declare l_cnt number;
begin
  select count(*) into l_cnt from invoices where status = 'OVERDUE' and owner = :APP_USER;
  apex_json.open_object;
  apex_json.write('count', l_cnt);
  apex_json.close_object;
end;
```

```javascript
apex.server.process("GET_OVERDUE", {}, { success: function (d) {
  if (d.count > 0) {
    amcMessageKit.toast({ type: "warning", title: "Overdue invoices", message: d.count + " invoices are overdue" });
  }
}});
```

Toast text is set with `textContent`. Look, position and timeout can also come from data:
`data-amc-message-kit="look:&P0_MSG_LOOK!ATTR."` on the body.

## 8. Motion Kit

Motion has no data of its own. Which areas move can follow a user preference:

```sql
select nvl(p.motion_areas, 'buttons forms reports') into :P0_MOTION_AREAS
  from user_prefs p where p.user_name = :APP_USER;      -- placeholder
```

```
Page HTML Body Attribute:  data-amc-motion="&P0_MOTION_AREAS!ATTR."
```

Report rows animate after every refresh of the query; call
`amcMotionKit.enterRows(document.getElementById("orders"))` after custom refreshes. The user's
operating-system reduced-motion setting always wins.

## Not verified without a live APEX instance

- `&ITEM.` substitution inside static Text settings of template components.
- APEXlang property names of a page item's `source` group (`type: sqlQuery`, `used`).
- `apex_theme.set_user_style` / `set_session_style` parameter names on each release.
- Per-row companions are proven offline (template renderer + Playwright on the runtime files);
  run apexlang's runtime validate or a real import before production.
