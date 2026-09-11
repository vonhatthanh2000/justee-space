---
title: SAP ABAP ALV Report
part: ABAP
summary: SAP ABAP ALV Report
category: Technical
tags:
  - sap
  - abap
publishedAt: 2026-07-21
---

## 1. What ALV Is — and Is Not

ALV, the SAP List Viewer, is a presentation framework for structured datasets.
It can supply standard user functions such as sorting, filtering, totals,
subtotals, layouts, printing, and export.

```text
Database / CDS / released API
              │
              ▼
Application reads, authorizes, and derives data
              │
              ▼
Internal table = report output model
              │
              ▼
ALV renders List, Grid, or Tree
              │
              ▼
User sorts, filters, selects, navigates, or edits
```

ALV does **not** by itself:

- read the correct business data;
- authorize a user to see or change that data;
- enforce business invariants;
- persist edited cells;
- fix duplicate rows caused by an incorrect SQL join;
- turn a classic report into a Fiori or RAP application.

Think of ALV as the report's **view and interaction adapter**. The internal
table is its input model; application methods own the business behavior.

---

## 2. End-to-End Runtime Flow

For a read-only executable report using SALV:

```text
Program/report starts
    │
    ▼
Selection-screen lifecycle
    │  defaults → dynamic PBO → user input → validation
    ▼
START-OF-SELECTION
    │
    ├─ authorize requested scope
    ├─ read through an appropriate CDS view/API/Open SQL
    ├─ calculate and map the output model
    └─ return an internal table
    │
    ▼
CL_SALV_TABLE=>FACTORY
    │
    ├─ configure functions, columns, sorts, layout, events
    └─ DISPLAY
    │
    ▼
User sorts/filters/totals/exports or triggers navigation
```

For an editable GUI grid, the display is only half the workflow:

```text
Application internal table
    │
    ▼
CL_GUI_ALV_GRID display
    │
    ▼
User edits a frontend cell
    │
    ├─ REGISTER_EDIT_EVENT / DATA_CHANGED
    └─ CHECK_CHANGED_DATA transfers/checks pending frontend changes
    │
    ▼
Application validates values and authorization
    │
    ├─ invalid → protocol/message; do not save
    └─ valid   → released update API / BAPI / application service / EML
                    │
                    ▼
              transaction owner commits
                    │
                    ▼
              refresh application data and ALV
```

The decisive point is: **an editable cell is not a database update**.
`CHECK_CHANGED_DATA` is part of synchronizing/validating the grid state; it is
not persistence.

---

## 3. The Three Presentation Shapes

People often say “ALV list, grid, and tree.” These are presentation shapes, not
three levels of the same report.

| Shape    | Data relationship                                | Best fit                                 | Typical technology                                                         |
| -------- | ------------------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------- |
| **List** | Flat rows or classic two-level sequential output | Printing, spool, legacy reports          | Classic ALV list; `CL_SALV_HIERSEQ_TABLE` for two-level header/item output |
| **Grid** | Flat two-dimensional table                       | Interactive analysis; optionally editing | `CL_SALV_TABLE` or `CL_GUI_ALV_GRID`                                       |
| **Tree** | Nodes with explicit parent/child relationships   | Hierarchy navigation                     | `CL_SALV_TREE` or `CL_GUI_ALV_TREE`                                        |

SAP's ALV object model names the core structural forms more precisely:

- `CL_SALV_TABLE`: simple, two-dimensional table;
- `CL_SALV_HIERSEQ_TABLE`: hierarchical-sequential header/item list;
- `CL_SALV_TREE`: arbitrary tree structure.

Therefore, “list versus grid” can also describe the **rendering technology** of
a simple table, while table versus hierarchy describes the **data shape**. Ask
which meaning a colleague intends before choosing a class.

### 3.1 List view

A list-oriented result is appropriate when printable sequential output matters
more than rich cell interaction. It is also the conceptually safer direction
for a background job that must create spool output.

For the SALV simple-table model, the factory's `LIST_DISPLAY` choice selects a
classic list-style rendering instead of the normal fullscreen grid rendering:

```abap
cl_salv_table=>factory(
  EXPORTING
    list_display = abap_true
  IMPORTING
    r_salv_table = DATA(alv)
  CHANGING
    t_table      = output ).

alv->display( ).
```

This is an important distinction: `CL_SALV_TABLE` identifies the simple
two-dimensional **data model**; `LIST_DISPLAY` influences its **display mode**.
Always test printing and background behavior on the target release rather than
inferring it only from the class name.

Classic APIs such as `REUSE_ALV_LIST_DISPLAY` and
`REUSE_ALV_GRID_DISPLAY_LVC` still appear in existing systems. Their `SLIS_*`
and `LVC_*` metadata must be understood for maintenance, but new OO-oriented
code should normally consider the ALV object model first when its capabilities
fit.

### 3.2 Grid view

A grid displays a flat table with columns and rows. Choose:

- `CL_SALV_TABLE` for concise, mostly read-only reporting;
- `CL_GUI_ALV_GRID` when you need editable cells, detailed grid events, a custom
  toolbar, or precise embedding in a screen/container.

### 3.3 Tree view

A tree represents real hierarchy. Each node has identity and a relationship to
a parent node. Sorting a flat table and indenting text does not create a sound
tree model.

Examples:

```text
Sales Order 50000123
├─ Item 10
│  ├─ Schedule line 1
│  └─ Schedule line 2
└─ Item 20
   └─ Schedule line 1
```

Use `CL_SALV_TREE` for a high-level tree display and `CL_GUI_ALV_TREE` when the
application needs lower-level control. Use `CL_SALV_HIERSEQ_TABLE` when the
model is exactly two sequential levels, such as header and items, rather than
an arbitrary-depth tree.

---

## 4. Selection Guide

| Requirement                             | Recommended starting point                   | Reason                                   |
| --------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| Quick read-only flat report             | `CL_SALV_TABLE`                              | Minimal setup and standard ALV functions |
| Editable cells                          | `CL_GUI_ALV_GRID`                            | Supported grid edit/event lifecycle      |
| Custom toolbar and fine-grained events  | `CL_GUI_ALV_GRID`                            | Direct Control Framework integration     |
| Arbitrary parent/child hierarchy        | `CL_SALV_TREE`                               | Node-oriented hierarchy model            |
| Highly customized hierarchy control     | `CL_GUI_ALV_TREE`                            | Lower-level tree behavior                |
| Exactly header + item sequential levels | `CL_SALV_HIERSEQ_TABLE`                      | Matches the two-level data shape         |
| Background/spool-oriented output        | List/spool-safe design                       | GUI controls require a frontend          |
| Very large HANA-backed result           | Consider ALV with IDA, if available/released | Pushes paging/filtering toward HANA      |

Do not choose `CL_GUI_ALV_GRID` merely because it is more powerful. Its screen,
container, frontend-state, event, and lifetime responsibilities are real
complexity.

---

## 5. The Output Internal Table Is a View Model

Do not send a persistence table to ALV merely because it already has fields.
Define the output grain and only expose columns that serve the report.

```abap
TYPES:
  BEGIN OF ty_order_output,
    sales_order     TYPE vbak-vbeln,
    sold_to_party   TYPE vbak-kunnr,
    overall_status  TYPE c LENGTH 1,
    net_amount      TYPE p LENGTH 15 DECIMALS 2,
    currency        TYPE waers,
  END OF ty_order_output,
  ty_order_output_tab TYPE STANDARD TABLE OF ty_order_output
    WITH EMPTY KEY.
```

The model should contain:

- the business key needed for navigation or update;
- display values at one explicitly chosen grain;
- currency/unit reference fields for amounts and quantities;
- optional technical style/color fields required by an editable grid;
- no sensitive fields merely “hidden” from the initial layout.

Hiding a field with `NO_OUT` or a saved layout is presentation, not security.
Protect the read before building the output table, and assume export/layout
features can reveal any field supplied to the frontend.

### 5.1 Preserve the grain

If one order header is joined to ten items and the header amount repeats ten
times, ALV totals will correctly total the rows it received—and produce the
wrong business answer. Fix the query/output grain rather than blaming ALV.

---

## 6. `CL_SALV_TABLE`: Read-Only Table with Minimal Ceremony

`CL_SALV_TABLE` is the normal first choice for a flat display-only report. The
factory receives the output internal table, creates the ALV model, and returns
the main SALV object.

```abap
CLASS lcl_output DEFINITION FINAL.
  PUBLIC SECTION.
    CLASS-METHODS display
      CHANGING orders TYPE ty_order_output_tab.
ENDCLASS.

CLASS lcl_output IMPLEMENTATION.
  METHOD display.
    TRY.
        cl_salv_table=>factory(
          IMPORTING
            r_salv_table = DATA(alv)
          CHANGING
            t_table      = orders ).

        alv->get_functions( )->set_all( abap_true ).
        alv->get_columns( )->set_optimize( abap_true ).
        alv->get_display_settings( )->set_striped_pattern( abap_true ).

        alv->display( ).

      CATCH cx_salv_msg INTO DATA(error).
        MESSAGE error->get_text( ) TYPE 'E'.
    ENDTRY.
  ENDMETHOD.
ENDCLASS.
```

Typical caller:

```abap
START-OF-SELECTION.
  DATA(orders) = lcl_order_query=>execute(
    sales_orders = s_vbeln[] ).

  lcl_output=>display( CHANGING orders = orders ).
```

### 6.1 What SALV owns

SALV offers subobjects for configuration:

```text
CL_SALV_TABLE
├─ GET_FUNCTIONS( )         standard toolbar functions
├─ GET_COLUMNS( )           column collection
├─ GET_SORTS( )             initial sorting
├─ GET_AGGREGATIONS( )      totals/aggregations
├─ GET_SELECTIONS( )        selection behavior/state
├─ GET_DISPLAY_SETTINGS( )  general appearance
├─ GET_LAYOUT( )            layout variants
└─ GET_EVENT( )             SALV events
```

### 6.2 Configure one column

```abap
TRY.
    DATA(columns) = alv->get_columns( ).
    DATA(column)  = columns->get_column( 'NET_AMOUNT' ).

    column->set_short_text(  'Net' ).
    column->set_medium_text( 'Net Amount' ).
    column->set_long_text(   'Sales Order Net Amount' ).

  CATCH cx_salv_not_found.
    " Programming/configuration mismatch: field is not in the output model
ENDTRY.
```

Names passed to SALV refer to the ABAP component names in the output line type,
usually interpreted in uppercase. A DDIC-backed component lets ALV reuse field
labels, conversion exits, value help, and type semantics more reliably than an
unrelated primitive type.

### 6.3 SALV editing boundary

The supported `CL_SALV_TABLE` public model is display-oriented. Do not rely on
release-dependent or unsupported tricks that extract an underlying GUI grid to
make SALV editable. If editing is a real requirement, choose
`CL_GUI_ALV_GRID` and implement the complete edit, validation, authorization,
and persistence lifecycle explicitly.

---

## 7. SALV Events: Navigation, Not Business Trust

A SALV double-click can navigate to an order detail, but the row number is only
presentation state. After users sort and filter, row position is not a stable
business identity.

Conceptual event-handler shape:

```abap
CLASS lcl_salv_handler DEFINITION FINAL.
  PUBLIC SECTION.
    METHODS on_double_click
      FOR EVENT double_click OF cl_salv_events_table
      IMPORTING row column.
ENDCLASS.
```

Registration:

```abap
DATA(events)  = alv->get_event( ).
DATA(handler) = NEW lcl_salv_handler( ).
SET HANDLER handler->on_double_click FOR events.
```

Keep the handler object alive for as long as the ALV can raise events. In the
handler:

1. resolve the selected row against the current output model;
2. extract its business key;
3. recheck authorization and current state;
4. call an application navigation/action method.

Never treat “the user could see or select row 5” as authorization to update the
business object represented by row 5.

---

## 8. `CL_GUI_ALV_GRID`: Control-Based Grid Architecture

`CL_GUI_ALV_GRID` is a SAP GUI Control Framework control. It requires a parent
container and therefore participates in a dynpro's PBO/PAI lifecycle.

```text
Executable report
    │
    └─ CALL SCREEN 0100
          │
          ├─ PBO: create custom container once
          │       create grid once
          │       register handlers once
          │       first display once
          │
          ├─ SAP GUI: user interacts with grid
          │
          └─ PAI: synchronize changes and process command
                  then return to PBO for refresh
```

Screen 0100 normally contains a Custom Control element named, for example,
`ALV_CONTAINER`.

### 8.1 Persistent controller attributes

The grid, container, event handler, and output table must outlive a single PBO
method call. Keep them as suitable program-global references or, preferably,
attributes of a screen-controller object.

```abap
DATA:
  container    TYPE REF TO cl_gui_custom_container,
  grid         TYPE REF TO cl_gui_alv_grid,
  output       TYPE ty_order_output_tab,
  field_catalog TYPE lvc_t_fcat,
  layout       TYPE lvc_s_layo.
```

### 8.2 PBO: create once, refresh later

```abap
MODULE status_0100 OUTPUT.
  SET PF-STATUS 'MAIN'.

  IF grid IS INITIAL.
    container = NEW cl_gui_custom_container(
      container_name = 'ALV_CONTAINER' ).

    grid = NEW cl_gui_alv_grid(
      i_parent = container ).

    " Register event handlers here, before user interaction

    grid->set_table_for_first_display(
      EXPORTING
        is_layout       = layout
      CHANGING
        it_outtab       = output
        it_fieldcatalog = field_catalog ).
  ELSE.
    grid->refresh_table_display(
      is_stable = VALUE lvc_s_stbl( row = abap_true
                                    col = abap_true ) ).
  ENDIF.
ENDMODULE.
```

SAP documents `SET_TABLE_FOR_FIRST_DISPLAY` as the initial binding operation.
Call `REFRESH_TABLE_DISPLAY` when only the data changes. Repeat the initial call
only when the output structure changes.

### 8.3 PAI: process commands

```abap
MODULE user_command_0100 INPUT.
  CASE sy-ucomm.
    WHEN 'SAVE'.
      lcl_screen_controller=>save( ).
    WHEN 'BACK' OR 'EXIT' OR 'CANC'.
      LEAVE TO SCREEN 0.
  ENDCASE.
ENDMODULE.
```

The GUI status decides which function codes exist. The ALV grid can also raise
toolbar and `USER_COMMAND` events for grid-specific functions.

---

## 9. Field Catalog: Structural and UI Metadata

`CL_GUI_ALV_GRID` commonly uses `LVC_T_FCAT`, whose line type is
`LVC_S_FCAT`.

Important fields include:

| Field                      | Meaning                                          |
| -------------------------- | ------------------------------------------------ |
| `FIELDNAME`                | Component in the output line type                |
| `COLTEXT`, `SCRTEXT_S/M/L` | Column labels                                    |
| `KEY`                      | Visually identifies a key column                 |
| `NO_OUT`                   | Initially hides a column; not a security control |
| `EDIT`                     | Makes a cell/column input-enabled in the grid    |
| `HOTSPOT`                  | Enables hotspot interaction                      |
| `CHECKBOX`                 | Displays a checkbox-compatible field             |
| `DO_SUM`                   | Requests totals where supported                  |
| `REF_TABLE`, `REF_FIELD`   | Reuses DDIC metadata                             |
| `CFIELDNAME`               | Currency-reference component for an amount       |
| `QFIELDNAME`               | Unit-reference component for a quantity          |

You can let the grid derive metadata from a single DDIC structure by passing
`I_STRUCTURE_NAME`, or pass an explicit field catalog for a local/mixed output
type and custom UI behavior.

Example helper:

```abap
APPEND VALUE lvc_s_fcat(
  fieldname  = 'NET_AMOUNT'
  coltext    = 'Net Amount'
  cfieldname = 'CURRENCY'
  do_sum     = abap_true )
  TO field_catalog.
```

Metadata names must match the actual output structure. A field catalog does not
map database fields into differently named ABAP components; build that mapping
when selecting or transforming the output model.

---

## 10. Editable Grid Lifecycle

Setting `EDIT = abap_true` only changes the frontend interaction. A complete
edit flow has five separate responsibilities.

### 10.1 Enable and register

```abap
grid->register_edit_event(
  i_event_id = cl_gui_alv_grid=>mc_evt_modified ).

SET HANDLER handler->on_data_changed FOR grid.
```

Common grid events include `DATA_CHANGED`, `DATA_CHANGED_FINISHED`,
`DOUBLE_CLICK`, `HOTSPOT_CLICK`, `TOOLBAR`, and `USER_COMMAND`.

### 10.2 Validate pending changes

Before a Save command uses the output table, synchronize pending frontend
edits:

```abap
DATA valid TYPE abap_bool.

grid->check_changed_data(
  IMPORTING
    e_valid = valid ).

CHECK valid = abap_true.
```

This is especially important when a user types into a cell and immediately
presses Save without first leaving the cell or pressing Enter.

### 10.3 Separate UI checks from business checks

The `DATA_CHANGED` handler can give immediate feedback about syntax, domains,
or cross-cell relationships. The application service must still enforce:

- current authorization;
- optimistic-lock/version rules;
- business invariants;
- current database state;
- transactional consistency.

Client-side or ALV-event validation is not a security boundary.

### 10.4 Persist explicitly

Use the system's supported change contract: for example a released API, BAPI,
application service, or EML for a RAP BO. Do not perform an arbitrary direct
table update simply because the grid output resembles the table.

The transaction owner decides the commit/rollback boundary. Reusable methods
should not casually issue `COMMIT WORK` when their caller owns the larger unit
of work.

### 10.5 Re-read and refresh

After successful persistence, re-read authoritative state when calculations,
status changes, locks, or other users may have changed the record. Then refresh
the grid while preserving row/column stability where appropriate.

---

## 11. Row Index Versus Business Identity

ALV selection APIs frequently return display row indexes. Sorting and filtering
can change what an index refers to.

```text
Unsafe assumption:
  selected index 3 = database record originally loaded at index 3

Safe flow:
  current selected index
      → current output row
      → immutable business key
      → fresh authorization/state check
      → business operation
```

For SD-style data, carry `VBELN`, `POSNR`, and `ETENR` at the appropriate grain
even if some technical key columns are not initially prominent. For a RAP BO,
carry its actual entity key; an ALV row number is not `%tky`.

---

## 12. List and Background Processing

`CL_GUI_ALV_GRID` needs the SAP GUI Control Framework and a frontend container.
It is not a background-processing output mechanism.

For a report that also runs as a job, design output behind an interface:

```text
Application produces typed result table
                  │
                  ├─ dialog renderer → SALV/grid
                  ├─ job renderer    → spool/list or file
                  └─ test renderer   → assertions on result table
```

In background:

- there is no user-driven grid interaction;
- frontend-dependent controls are unavailable;
- selection variants supply input;
- operational evidence belongs in job log, spool, application log, or a
  deliberately produced file.

Do not assume that a SALV call automatically provides the exact background
spool behavior the business needs. Test the chosen display mode in the target
release and execution environment.

---

## 13. Tree Data Modeling

A tree has two distinct concerns:

```text
Hierarchy model                  Display data
------------------------------   --------------------------
node key                         node text
parent/related node key          amount/status/attributes
relationship type               icons and column values
```

With `CL_SALV_TREE`, the application creates nodes individually, relates each
node to a parent or sibling, and assigns the node's data row. Node keys are ALV
technical identities; keep business keys separately for navigation.

Choose a tree only when users need to reason about containment or dependency.
If they mainly compare amounts across many orders, a flat grid grouped and
sorted by order is usually easier to scan.

### Tree risks

- one cyclic or missing parent breaks hierarchy construction;
- eager expansion of a huge tree overwhelms users and memory;
- totals across levels can double count parent and child values;
- a selected node key is still not authorization;
- loading every deep child before it is expanded can be unnecessarily costly.

---

## 14. Currency, Quantity, Totals, and Semantics

An amount without its currency and a quantity without its unit are incomplete
business values.

For a grid field catalog, connect amount/quantity components to the output
components holding currency/unit via `CFIELDNAME` and `QFIELDNAME`. Prefer DDIC
reference fields where available.

Do not total values across different currencies merely because ALV permits a
numeric total. Either:

- group/subtotal by currency;
- convert using an explicit business rule and date/rate type;
- suppress a meaningless grand total.

The same principle applies to incompatible quantity units.

---

## 15. Layout Variants

ALV layouts can store presentation preferences such as column order, width,
visibility, sorting, filtering, and totals. Variant identity is commonly
described using `DISVARIANT` values such as report and handle, with save scope
controlled by the ALV API.

Keep three ideas separate:

```text
Selection variant  → input parameters and select-options
ALV layout variant → result presentation
Business variant   → domain-specific configuration, if any
```

An ALV layout filter does not reduce the database query or replace read
authorization. The data may already have reached the frontend before the user
hides it.

When changing an output structure, test existing saved layouts. Renamed or
removed columns can make old variants behave unexpectedly.

---

## 16. Performance Model

ALV can sort and filter its supplied dataset, but it cannot undo an
over-fetching query.

```text
Best order of responsibility:
1. database/API restricts rows and columns
2. application derives the exact report grain
3. ALV provides interactive presentation operations
```

For performance diagnosis:

1. measure the data-access phase separately from rendering;
2. inspect SQL with SQL Monitor/ST05 when appropriate;
3. check row count and output width;
4. look for joins that multiply rows;
5. avoid expensive per-row database queries;
6. consider HANA-oriented ALV with IDA for supported large-data scenarios;
7. test frontend rendering and export separately.

`CL_SALV_GUI_TABLE_IDA` can support database-oriented paging/filtering on HANA
in systems where the class and data source are suitable. It is not a drop-in
reason to ignore data authorization, released-object rules, or the target
system's API state.

---

## 17. Authorization and Data Protection

Apply authorization before sensitive data enters the ALV output model.

```text
Wrong boundary:
  SELECT everything → send to ALV → hide unauthorized column

Correct boundary:
  authorize scope → select allowed data/fields → build output → display
```

For an action or save, authorize again against the current record and requested
operation. Read authorization does not imply update, delete, approve, or export
authorization.

Also consider:

- spreadsheet/local-file export;
- print/spool access;
- saved layout variants;
- personal data displayed in diagnostic columns;
- transaction navigation from double-click/hotspot events.

---

## 18. Error and Message Design

Handle errors at the layer that understands them:

| Error                          | Owning layer                       | Example response                           |
| ------------------------------ | ---------------------------------- | ------------------------------------------ |
| Invalid selection interval     | Selection-screen/application input | Field/cross-field message                  |
| User cannot read company code  | Authorization/application service  | Reject before output                       |
| SALV column not found          | ALV configuration                  | Developer-facing handling/log              |
| Invalid edited amount          | Grid handler + business service    | Cell protocol and no save                  |
| Record changed by another user | Persistence/business API           | Conflict message and refresh               |
| Database/API failure           | Data-access layer                  | Logged technical cause + safe user message |

An empty result is not always an error. Distinguish “no matching authorized
records” from a broken query or swallowed exception.

---

## 19. Common Failure Patterns

| Symptom                             | Likely cause                           | Diagnostic move                               |
| ----------------------------------- | -------------------------------------- | --------------------------------------------- |
| Empty ALV                           | Query/filter/auth produced no rows     | Inspect result table before display           |
| Wrong/missing columns               | Field catalog and line type disagree   | Compare `FIELDNAME` with actual components    |
| Amount displayed without currency   | Missing DDIC/currency reference        | Set reference metadata/`CFIELDNAME`           |
| Total is multiplied                 | Header repeated by item/schedule join  | Reconstruct result grain before ALV           |
| Edit disappears on Save             | Pending frontend edit not synchronized | Call `CHECK_CHANGED_DATA` and inspect handler |
| Edit appears saved but DB unchanged | Only output internal table changed     | Trace explicit persistence call/transaction   |
| Grid resets on every action         | Grid recreated in every PBO            | Create once; refresh subsequently             |
| Handler stops firing                | Handler reference went out of scope    | Keep handler alive with the control           |
| Wrong record opened after sort      | Original index treated as identity     | Resolve current row and use business key      |
| Background job fails                | GUI control requires frontend          | Use a background-safe renderer                |
| Hidden data appears in export       | UI hiding treated as security          | Do not send unauthorized fields               |
| Refresh jumps/loses context         | Unstable refresh                       | Use stable row/column options where suitable  |

---

## 20. Classic ALV APIs Versus Modern Direction

| Technology                     | Status/use                                     | Main concern                               |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------ |
| `REUSE_ALV_LIST_DISPLAY`       | Common legacy list reports                     | Procedural callback and `SLIS_*` patterns  |
| `REUSE_ALV_GRID_DISPLAY(_LVC)` | Common legacy grid reports                     | Function-module callbacks and global state |
| `CL_SALV_TABLE`                | Preferred concise OO display where it fits     | Read-only/public display model             |
| `CL_GUI_ALV_GRID`              | Appropriate for rich classic GUI control needs | More lifecycle and event responsibility    |
| RAP + Fiori elements           | Service/UI architecture, not ALV               | CDS/behavior/OData/UI annotation lifecycle |

When maintaining a legacy report, improve boundaries without rewriting solely
for fashion. Extract authorization, query, transformation, and update logic
from callbacks first. Then the renderer can be replaced independently if the
business case justifies it.

---

## 21. SD Technical-Consultant Example

Suppose a report shows sales-order schedule fulfillment.

### Output grain

One row per sales order item schedule line:

```text
VBELN + POSNR + ETENR
```

### Flow

```text
Selection: sales org, document/date range, status
    │
    ├─ authorize organizational scope
    ├─ read released CDS/API or appropriate classic source
    ├─ construct one row per schedule line
    ├─ preserve order/item/schedule keys
    ├─ derive open quantity without mixing units
    └─ render read-only with CL_SALV_TABLE
```

A double-click can navigate to display the business document after a fresh
authorization check. If the requirement becomes “mass-change requested dates,”
that is not just `EDIT = X`: choose `CL_GUI_ALV_GRID`, capture changes, validate
SD rules, call a supported sales-order change contract, handle conflicts and
messages, and refresh authoritative results.

In clean-core design, prefer released CDS views/APIs and verify API State in the
target release. Directly updating `VBAK`, `VBAP`, or `VBEP` is not a valid
business update mechanism.

---

## 22. Tools and Debugging Landmarks

| Tool/object                    | Use                                                 |
| ------------------------------ | --------------------------------------------------- |
| `SE38` / `SA38`                | Execute or inspect classic reports, where available |
| ADT debugger                   | Break before display, handlers, and save service    |
| `SE24`                         | Inspect class interfaces in classic systems         |
| `DWDM`, `SE83`, `BCALV*` demos | Explore installed Control Framework examples        |
| `ST22`                         | Analyze runtime dumps                               |
| `SAT`                          | Separate query/transformation/rendering time        |
| `ST05`, SQL Monitor            | Diagnose data access, not ALV formatting            |
| `SU53` / authorization trace   | Diagnose authorization failure appropriately        |
| `SM37` and `SP01`              | Background job and spool evidence                   |

Availability and recommended tools vary by edition and authorization. A demo
program illustrates an API; it is not automatically a production architecture.

---

## 23. Implementation Checklist

### Before coding

- What is one output row?
- Is the result flat, exactly two-level, or an arbitrary hierarchy?
- Is it read-only or genuinely transactional?
- Must it run in background?
- Which fields and rows may the user read/export?
- What is the supported data/change API in this system edition?

### For `CL_SALV_TABLE`

- Build a typed, authorized result table.
- Call `FACTORY`, configure subobjects, then `DISPLAY`.
- Keep event handlers alive.
- Resolve navigation through business keys, not row indexes.
- Do not use unsupported SALV-edit hacks.

### For `CL_GUI_ALV_GRID`

- Create a custom screen and parent container.
- Keep container, grid, handler, and output alive.
- Call `SET_TABLE_FOR_FIRST_DISPLAY` once.
- Register required events.
- Synchronize pending edits before Save.
- Validate and authorize in the business layer.
- Persist through the supported contract.
- Re-read and call `REFRESH_TABLE_DISPLAY`.
- Provide a separate output path for background processing.

---
