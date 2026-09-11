---
title: SAP ABAP Classical Report
part: ABAP
summary: SAP ABAP Classical Report
category: Technical
tags:
  - sap
  - abap
publishedAt: 2026-07-13
---

## 1. The Correct Overall Mental Model

A classic executable report is **event-driven**. Source-code position does not
mean that ABAP simply executes every line from top to bottom. The ABAP runtime
framework raises events and calls the matching event blocks.

The selection screen also creates a loop:

```text
Program requested
    │
    ▼
Program loaded into internal session, if not already loaded
    │
    ├─ global/static initialization performed by runtime
    └─ LOAD-OF-PROGRAM event block, if defined
    │
    ▼
INITIALIZATION
    │
    ▼
AT SELECTION-SCREEN OUTPUT             selection-screen PBO
    │
    ▼
Selection screen displayed
    │
    ▼
User action
    │
    ├─ F4 help ───────────────► ON VALUE-REQUEST FOR field
    │                              │
    │                              └─ redisplay loop
    │
    ├─ F1 help ───────────────► ON HELP-REQUEST FOR field
    │                              │
    │                              └─ redisplay loop
    │
    ├─ Enter / pushbutton /
    │  radio USER-COMMAND ────► selection-screen PAI events
    │                              │
    │                              └─ AT SELECTION-SCREEN OUTPUT
    │                                  → redisplay
    │
    └─ Execute F8 ─────────────► selection-screen PAI validation
                                   │
                                   ├─ validation error
                                   │    └─ OUTPUT → redisplay
                                   │
                                   └─ validation succeeds
                                        └─ START-OF-SELECTION
                                             │
                                             ├─ report application logic
                                             ├─ END-OF-SELECTION, if defined
                                             └─ output/list processing
```

The straight-line version from the initial draft omitted the redisplay cycle.
`AT SELECTION-SCREEN OUTPUT` can run many times; `INITIALIZATION` normally runs
once for that report execution before the standard selection screen first
appears.

---

## 2. Report Source Layout Versus Runtime Order

A maintainable report can be arranged like this:

```abap
REPORT zsales_order_report.

" Global declarations and selection-screen definition
TABLES sscrfields.

PARAMETERS:
  p_open RADIOBUTTON GROUP mode DEFAULT 'X' USER-COMMAND mode,
  p_all  RADIOBUTTON GROUP mode.

SELECT-OPTIONS s_order FOR vbak-vbeln.

CLASS lcl_application DEFINITION FINAL.
  PUBLIC SECTION.
    CLASS-METHODS run.
ENDCLASS.

CLASS lcl_application IMPLEMENTATION.
  METHOD run.
    " Application orchestration
  ENDMETHOD.
ENDCLASS.

INITIALIZATION.
  " One-time selection defaults

AT SELECTION-SCREEN OUTPUT.
  " Dynamic screen attributes before each display

AT SELECTION-SCREEN.
  " Cross-field/action validation

START-OF-SELECTION.
  lcl_application=>run( ).
```

The physical order improves readability, but runtime execution is determined by
events. Each event block begins with an event keyword and ends at the next
processing block or the end of the program; there is no `END-...` statement.

Keep event blocks thin and delegate application logic to methods. This prevents
the report framework, selection-screen state, database logic, and output logic
from becoming one inseparable procedure.

### 2.1 Declaration-scope trap

Most event blocks are not ordinary procedures. Declarations written inside them
belong to the compilation unit's global declarations and remain visible in
subsequent processing blocks. Selection-screen and logical-database event blocks
are special runtime implementations that can allow local declarations, but a
consistent design should still put working data inside called methods.

```abap
START-OF-SELECTION.
  DATA result TYPE string. " Do not assume method-local lifecycle semantics
  lcl_application=>run( ).
```

The safe architectural rule is not “declare globals inside an event.” It is
“use the event as a thin framework adapter and work locally inside methods.”

---

## 3. Phase 1 — Program Load

### 3.1 What “load” means

When the executable program is first needed in an internal session, its load is
made available and its global data context is initialized. Programs already
loaded in the same internal session need not be loaded again simply because a
procedure is called again.

Do not confuse:

```text
Repository activation/generation
  creates or updates executable program load

Runtime loading
  brings the program into an internal session for execution
```

### 3.2 `LOAD-OF-PROGRAM`

Contrary to the draft statement, this is a definable event block:

```abap
LOAD-OF-PROGRAM.
  " Rarely needed in an ordinary report
```

It is the program constructor event and occurs when the program is loaded into
an internal session. It is not the normal place for user defaults or report
business processing.

Typical guidance:

- Use declaration-time initialization for simple constants/default state.
- Use `INITIALIZATION` for initial selection-screen values.
- Use constructors for object initialization.
- Avoid database updates, user interaction, commits, or large queries in
  `LOAD-OF-PROGRAM`.

### 3.3 Why it may run less often than expected

`LOAD-OF-PROGRAM` is associated with loading the program, not every
selection-screen redisplay. If the program remains loaded in the internal
session, repeated calls or interactions do not imply repeated program-load
events.

---

## 4. Phase 2 — `INITIALIZATION`

`INITIALIZATION` occurs before the standard selection screen is first processed
for the report execution.

```abap
PARAMETERS p_date TYPE sy-datum.

INITIALIZATION.
  p_date = sy-datum.
```

Good uses:

- calculate initial date ranges;
- choose a sensible initial radio button;
- initialize selection-screen texts or pushbutton labels;
- supply lightweight defaults that should occur once.

Avoid:

- repeatedly controlling whether a field is visible or editable;
- expensive report data selection;
- changing database state;
- authorization enforcement that must also protect background execution or
  non-screen entry points.

### 4.1 `DEFAULT` versus `INITIALIZATION`

```abap
PARAMETERS p_status TYPE c LENGTH 1 DEFAULT 'O'.
```

Use declaration `DEFAULT` for a static initial value. Use `INITIALIZATION` when
the starting value requires runtime calculation.

### 4.2 Why not put dynamic screen logic here?

`INITIALIZATION` does not run on every redisplay. If screen input readiness
depends on the currently selected radio button, use
`AT SELECTION-SCREEN OUTPUT`.

Also distinguish an initial proposal from the effective runtime selection.
Selection variants, SPA/GPA memory values, `SUBMIT` parameters, or previous
user input can influence values later in the screen lifecycle. When debugging,
inspect the value at `AT SELECTION-SCREEN OUTPUT` and again in PAI instead of
assuming the value assigned during `INITIALIZATION` is still effective.

---

## 5. Phase 3 — Selection-Screen PBO

`AT SELECTION-SCREEN OUTPUT` is the Process Before Output event of the selection
screen. It runs directly before the screen is displayed and can run repeatedly.

```abap
PARAMETERS:
  p_file  RADIOBUTTON GROUP mode DEFAULT 'X' USER-COMMAND mode,
  p_order RADIOBUTTON GROUP mode,
  p_path  TYPE string LOWER CASE MODIF ID fil,
  p_vbeln TYPE vbak-vbeln MODIF ID ord.

AT SELECTION-SCREEN OUTPUT.
  LOOP AT SCREEN.
    CASE screen-group1.
      WHEN 'FIL'.
        screen-active = xsdbool( p_file = abap_true ).
      WHEN 'ORD'.
        screen-active = xsdbool( p_order = abap_true ).
    ENDCASE.
    MODIFY SCREEN.
  ENDLOOP.
```

`MODIF ID fil` is represented in `SCREEN-GROUP1` as uppercase `FIL`.

### 5.1 Common `SCREEN` fields

| Field                                   | Purpose                                   |
| --------------------------------------- | ----------------------------------------- |
| `SCREEN-GROUP1`                         | Modification group from `MODIF ID`        |
| `SCREEN-ACTIVE`                         | Combined active/inactive control          |
| `SCREEN-INPUT`                          | Input enabled/disabled                    |
| `SCREEN-INVISIBLE`                      | Visible/hidden behavior                   |
| `SCREEN-REQUIRED`                       | Visual/required-state control             |
| `SCREEN-DISPLAY_3D` or other attributes | Release/UI-specific presentation controls |

Always execute `MODIFY SCREEN` for a changed row of the special `SCREEN`
table.

### 5.2 Idempotence rule

Implement output logic so the correct screen state is recalculated from the
current selection values on every PBO. Do not rely on the event running only
once or on the previous display state.

---

## 6. Phase 4 — Screen Display and User Action

After PBO, the selection screen is sent to the presentation layer. The user can
enter values, request help, choose a command, press Enter, or execute.

The action determines the next event path. “User does something” is therefore
not one event.

| User action                                | Important event path                                          |
| ------------------------------------------ | ------------------------------------------------------------- |
| Press F4 on a field                        | `ON VALUE-REQUEST FOR field`                                  |
| Press F1 on a field                        | `ON HELP-REQUEST FOR field`                                   |
| Change radio/checkbox with `USER-COMMAND`  | Selection-screen PAI; then redisplay                          |
| Press a custom selection-screen pushbutton | Selection-screen PAI; then usually redisplay                  |
| Press Enter                                | Selection-screen PAI; then redisplay                          |
| Press Execute F8                           | Selection-screen PAI; if valid, leave screen and start report |
| Press Back/Exit/Cancel                     | Exit-command handling and screen termination path             |

---

## 7. F4 Value Help: `ON VALUE-REQUEST`

Use a custom value-request event only when Dictionary/search-help behavior does
not already provide the correct F4 help.

```abap
AT SELECTION-SCREEN ON VALUE-REQUEST FOR p_path.
  p_path = lcl_file_dialog=>choose_file( ).
```

Flow:

```text
User presses F4 on p_path
  → AT SELECTION-SCREEN ON VALUE-REQUEST FOR p_path
  → custom logic proposes/sets a value
  → selection screen is displayed again
```

This is not the report's business validation event and does not proceed to
`START-OF-SELECTION`.

### 7.1 Prefer metadata-driven value help

If the parameter refers to a DDIC field with a search help, check table, or
fixed domain values, the runtime can often supply value help automatically.
Do not replace correct metadata with unnecessary custom F4 code.

### 7.2 Security rule

Value help narrows or proposes input; it is not authorization enforcement and
does not guarantee that submitted input is valid. Validate the final value and
perform authorization checks at the execution boundary.

---

## 8. F1 Help: `ON HELP-REQUEST`

```abap
AT SELECTION-SCREEN ON HELP-REQUEST FOR p_path.
  lcl_help=>show_path_explanation( ).
```

Use this only when standard field/documentation help is insufficient. Like F4,
it is a help request, not successful report execution.

---

## 9. Radio Buttons and `USER-COMMAND`

Changing a radio button does **not** necessarily cause an immediate server
round trip. Associate a function code when the selection should trigger dynamic
screen modification:

```abap
PARAMETERS:
  p_file  RADIOBUTTON GROUP mode DEFAULT 'X' USER-COMMAND mode,
  p_order RADIOBUTTON GROUP mode.
```

The command is assigned to the group through the first declared radio button.
On selection:

```text
Radio selection changes
  → function code MODE is sent
  → selection-screen PAI events run
  → AT SELECTION-SCREEN OUTPUT recalculates field state
  → screen is redisplayed
```

Access the function code through `SSCRFIELDS-UCOMM` in classic code:

```abap
TABLES sscrfields.

AT SELECTION-SCREEN.
  CASE sscrfields-ucomm.
    WHEN 'MODE'.
      " Usually no business execution here; allow redisplay
  ENDCASE.
```

Radio-button user commands are well suited to screen adaptation, not to running
the main report. F8 remains the normal transition to report execution.

---

## 10. Phase 5 — Selection-Screen PAI and Validation

PAI transfers input from the screen and raises the relevant
`AT SELECTION-SCREEN` events. Think of validation as layers from narrow to
broad.

```text
Field or selection-criterion checks
  → end-of-multiple-selection checks
  → radio-button-group checks
  → block checks
  → generic AT SELECTION-SCREEN command/cross-field check
```

The exact triggered subset depends on the screen fields and user action.

### 10.1 Validate one parameter

```abap
AT SELECTION-SCREEN ON p_vbeln.
  IF p_order = abap_true AND p_vbeln IS INITIAL.
    MESSAGE e001(zreport) WITH 'Enter a sales order'.
  ENDIF.
```

Use for a rule local to that field. A radio-button field is validated with the
group event rather than an individual field event.

### 10.2 Validate a radio-button group

```abap
AT SELECTION-SCREEN ON RADIOBUTTON GROUP mode.
  IF p_file = abap_false AND p_order = abap_false.
    MESSAGE e002(zreport) WITH 'Choose a mode'.
  ENDIF.
```

### 10.3 Validate a block

```abap
SELECTION-SCREEN BEGIN OF BLOCK criteria WITH FRAME TITLE text-t01.
PARAMETERS p_vbeln TYPE vbak-vbeln.
SELECT-OPTIONS s_date FOR sy-datum.
SELECTION-SCREEN END OF BLOCK criteria.

AT SELECTION-SCREEN ON BLOCK criteria.
  IF p_vbeln IS INITIAL AND s_date[] IS INITIAL.
    MESSAGE e003(zreport) WITH 'Enter an order or date range'.
  ENDIF.
```

### 10.4 Validate a complete `SELECT-OPTIONS` criterion

```abap
AT SELECTION-SCREEN ON END OF s_date.
  LOOP AT s_date ASSIGNING FIELD-SYMBOL(<date_range>).
    IF <date_range>-option = 'BT'
       AND <date_range>-low > <date_range>-high.
      MESSAGE e004(zreport) WITH 'Invalid date interval'.
    ENDIF.
  ENDLOOP.
```

The selection criterion is a range-like table containing `SIGN`, `OPTION`,
`LOW`, and `HIGH`. Validate the whole selection table when intervals or multiple
rows interact.

### 10.5 Generic `AT SELECTION-SCREEN`

```abap
AT SELECTION-SCREEN.
  CASE sscrfields-ucomm.
    WHEN 'ONLI'. " Common Execute function code; verify in target context
      lcl_selection_validator=>validate(
        file_mode = p_file
        path      = p_path
        order     = p_vbeln ).
    WHEN 'MODE'.
      " Dynamic mode switch; return to screen
  ENDCASE.
```

Use the generic event for cross-field validation and command handling. Do not
hard-code a function code without confirming the actual selection-screen
context.

---

## 11. Validation Failure and Redisplay

An error message during selection-screen validation prevents the transition to
`START-OF-SELECTION` and returns control to the selection screen.

```text
Execute F8
  → PAI validation
  → MESSAGE E
  → validation stops
  → AT SELECTION-SCREEN OUTPUT
  → corrected screen displayed
```

This is why `AT SELECTION-SCREEN OUTPUT` must tolerate repeated execution.

`OBLIGATORY` provides basic required-input checking, but it does not replace
cross-field business validation, existence checks, or authorization checks.

### 11.1 Message types are context-sensitive

`MESSAGE E`, `W`, `I`, `S`, `A`, and `X` do not have one universal control-flow
meaning independent of their processing context. In selection-screen PAI,
error messages can return the user to input. In other report phases, the same
message type can have a different runtime consequence. Diagnose the event and
dialog context, not only the letter.

---

## 12. Exit Commands

Back, Exit, and Cancel are exit-type commands. Use the specialized event only
when cleanup or confirmation is genuinely necessary:

```abap
AT SELECTION-SCREEN ON EXIT-COMMAND.
  " Avoid validation that traps the user on a screen they are leaving
```

This event is designed to handle exit commands before ordinary selection-screen
validation prevents leaving because of invalid field content. Do not perform
report business processing here.

---

## 13. Phase 6 — `START-OF-SELECTION`

After the user chooses Execute and selection-screen processing succeeds, the
runtime raises `START-OF-SELECTION`.

```abap
START-OF-SELECTION.
  lcl_application=>run( ).
```

This is the report's standard processing block and should usually be its thin
application entry point.

Typical application flow:

```text
START-OF-SELECTION
  → create application/service objects
  → enforce execution authorization
  → convert selection-screen globals into an input structure
  → read data set-wise
  → apply business rules
  → prepare result model
  → render output
```

### 13.1 Implicit `START-OF-SELECTION`

Executable statements written before the first explicit processing block are
assigned to an implicit `START-OF-SELECTION` block. If no explicit event blocks
exist, all functional statements form the implicit standard event.

Avoid this confusing layout:

```abap
REPORT zbad_layout.

DATA value TYPE i.
value = 10. " Implicit START-OF-SELECTION

START-OF-SELECTION.
  value += 1. " A separate explicit event block
```

Prefer an explicit event keyword and a thin method call so runtime placement is
obvious.

---

## 14. `END-OF-SELECTION`

Historically, `END-OF-SELECTION` marks processing after a logical database has
finished supplying rows through `GET` events.

```abap
END-OF-SELECTION.
  " Final processing after logical-database selection
```

Without a logical database, it follows standard selection processing but often
adds no useful architectural boundary. Do not use it simply because its name
sounds like the required end of every report. A modern report can orchestrate
its complete flow from a method called at `START-OF-SELECTION`.

---

## 15. Logical-Database Events

Older reports can be linked to a logical database and receive node data through
events such as:

```abap
GET node.
  " Process one logical-database node instance

GET node LATE.
  " Process after subordinate nodes
```

Conceptual runtime:

```text
START-OF-SELECTION
  → logical database reads nodes
     → GET parent
       → GET child
     → GET parent LATE
  → END-OF-SELECTION
```

Recognize this in legacy reports. For new data access, prefer explicit Open SQL,
CDS entities, and released APIs according to the target development model.

---

## 16. Output and List Events

### 16.1 Simple/classic list

`WRITE` produces classic list output. Page/list processing can raise events such
as:

- `TOP-OF-PAGE`
- `END-OF-PAGE`
- `AT LINE-SELECTION`
- `AT USER-COMMAND`

Interactive list events happen after initial report processing, in response to
the user acting on the displayed list. They are not part of the selection-
screen validation sequence.

### 16.2 ALV/SALV

For tabular results, ALV/SALV typically provides sorting, filtering, totals,
layout variants, and event callbacks. Keep retrieval and business logic
independent from the chosen renderer so they can be tested without a GUI.

```text
Selection model → application service → result table → ALV adapter
```

---

## 17. Complete Worked Flow

```abap
REPORT zorder_extract.

TABLES sscrfields.

PARAMETERS:
  p_order RADIOBUTTON GROUP mode DEFAULT 'X' USER-COMMAND mode,
  p_file  RADIOBUTTON GROUP mode,
  p_vbeln TYPE vbak-vbeln MODIF ID ord,
  p_path  TYPE string LOWER CASE MODIF ID fil.

INITIALIZATION.
  p_order = abap_true.

AT SELECTION-SCREEN OUTPUT.
  LOOP AT SCREEN.
    CASE screen-group1.
      WHEN 'ORD'.
        screen-active = xsdbool( p_order = abap_true ).
      WHEN 'FIL'.
        screen-active = xsdbool( p_file = abap_true ).
    ENDCASE.
    MODIFY SCREEN.
  ENDLOOP.

AT SELECTION-SCREEN ON VALUE-REQUEST FOR p_path.
  p_path = lcl_file_dialog=>choose_file( ).

AT SELECTION-SCREEN.
  IF sscrfields-ucomm = 'ONLI'.
    IF p_order = abap_true AND p_vbeln IS INITIAL.
      MESSAGE e001(zreport) WITH 'Enter a sales order'.
    ENDIF.

    IF p_file = abap_true AND p_path IS INITIAL.
      MESSAGE e002(zreport) WITH 'Choose a file'.
    ENDIF.
  ENDIF.

START-OF-SELECTION.
  lcl_application=>run(
    order_mode = p_order
    order      = p_vbeln
    file_mode  = p_file
    path       = p_path ).
```

### 17.1 Initial display

```text
Program begins
  → INITIALIZATION selects order mode
  → OUTPUT activates p_vbeln and deactivates p_path
  → screen displayed
```

### 17.2 User selects file mode

```text
USER-COMMAND MODE
  → AT SELECTION-SCREEN handles round trip
  → OUTPUT deactivates p_vbeln and activates p_path
  → screen displayed again
```

### 17.3 User presses F4 on path

```text
F4
  → ON VALUE-REQUEST FOR p_path
  → dialog result assigned
  → screen displayed again
```

### 17.4 User presses Execute without a path

```text
F8 / ONLI
  → AT SELECTION-SCREEN
  → MESSAGE E
  → START-OF-SELECTION does not run
  → OUTPUT
  → screen displayed for correction
```

### 17.5 User presses Execute with valid input

```text
F8 / ONLI
  → AT SELECTION-SCREEN validation succeeds
  → START-OF-SELECTION
  → lcl_application=>run( )
  → result output
```

---

## 18. Dialog, Background, and `SUBMIT` Are Different Entry Modes

The main diagram describes an interactive SAP GUI execution. Reports can also
run through a background job or `SUBMIT`.

### 18.1 Background job

A job normally receives saved selection values through a variant and has no
interactive user available for F4 help, popups, or correction dialogs.

```abap
IF sy-batch = abap_true.
  " Use background-safe logging/output; never require a frontend file dialog
ENDIF.
```

Selection-screen UI convenience is therefore not a reliable business-security
boundary. Validate the effective execution input and authorization in a
background-safe application layer.

### 18.2 `SUBMIT`

```abap
SUBMIT ztarget_report
  WITH p_vbeln = order
  AND RETURN.
```

`SUBMIT` starts an executable program and supplies selection values. Additions
such as `VIA SELECTION-SCREEN`, `USING SELECTION-SET`, background-job options,
and list export change the invocation behavior.

Dynamic report names are a security risk when they originate externally. Use an
allowlist and proper authorization checks.

### 18.3 Design consequence

Do not place core business rules only in F4 handlers, screen PBO, or GUI-only
validation. Extract an application service that can receive the same input from
dialog, job, test, or another allowed entry point.

---

## 19. Selection Screen Versus Application Validation

| Concern                     | Selection-screen layer     | Application/domain layer                 |
| --------------------------- | -------------------------- | ---------------------------------------- |
| Enable/disable a field      | Yes                        | No                                       |
| Show F4 help                | Yes                        | No                                       |
| Basic cross-field usability | Yes                        | Often repeated as invariant if important |
| Authorization to read order | May provide early feedback | Must enforce before protected access     |
| Business invariant          | Helpful early feedback     | Must be authoritative                    |
| Database consistency        | No                         | Persistence/transaction boundary         |
| Background-safe execution   | Not guaranteed             | Required                                 |

This parallels RAP: UI metadata and value help improve interaction, while the
backend business object must still enforce invariants and authorization.

---

## 20. Program Structure Recommendation

```text
Executable report
  ├── selection-screen declarations
  ├── INITIALIZATION              initial UI defaults
  ├── AT SELECTION-SCREEN OUTPUT  dynamic UI state
  ├── AT SELECTION-SCREEN ...     early input feedback
  └── START-OF-SELECTION          thin application entry
          │
          ▼
      Application class
        ├── authorization
        ├── input validation
        ├── query/repository
        ├── domain transformation
        └── output adapter
```

Use includes only for source organization when necessary. They do not replace
the method/class boundaries described in the
[ABAP Modularization reference](./abap-modularization-technical-reference.md).

Use explicit internal-table types and access patterns from the
[ABAP Internal Tables reference](./abap-internal-tables-technical-reference.md).

---

## 21. Transaction and Side-Effect Rules

- Do not update persistent business data during `INITIALIZATION` or screen PBO.
- F4/F1 handlers should provide help, not perform commits.
- Separate report/query output from update transactions where possible.
- If the report performs updates, document authorization, locking, validation,
  update API, commit ownership, restart behavior, and audit logging.
- Do not call `COMMIT WORK` inside a reusable helper that does not own the whole
  SAP LUW.
- A report that calls a BAPI/function module must inspect whether that API
  performs commits or expects the caller to commit.
- For RAP business objects, use EML and allow RAP to own its transaction model;
  do not reproduce RAP save behavior in a classic report.

---

## 22. Debugging and Operations Map

| Need                        | Classic tool/transaction                                | Evidence                                    |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| Execute/test report         | `SE38` or `SA38`                                        | Selection values, event behavior, output    |
| Repository navigation       | `SE80` or ADT                                           | Program, includes, classes, where-used      |
| Debug event sequence        | ADT/SAP GUI debugger                                    | Breakpoints in each event block; call stack |
| Analyze short dump          | `ST22`                                                  | Runtime error, source position, call stack  |
| Runtime performance         | `SAT`                                                   | Call hierarchy and ABAP runtime cost        |
| SQL trace                   | `ST05`                                                  | SQL statements, executions, rows, duration  |
| System-wide SQL aggregation | `SQLM` where available                                  | Repeated SQL workload evidence              |
| Background execution        | `SM37`                                                  | Job step, variant, spool, status, job log   |
| Authorization failure       | `SU53` immediately after failure; trace when authorized | Failed authorization objects/fields         |
| Application log             | `SLG1` when the report writes application logs          | Durable business/technical messages         |

### 22.1 Event-flow debugging sequence

1. Set breakpoints in `LOAD-OF-PROGRAM`, `INITIALIZATION`,
   `AT SELECTION-SCREEN OUTPUT`, the relevant field/value-help event, generic
   `AT SELECTION-SCREEN`, and `START-OF-SELECTION`.
2. Start a new execution context and record which breakpoints occur.
3. Trigger a radio-button user command and observe the PAI → PBO redisplay loop.
4. Trigger F4 and distinguish its request path.
5. Execute once with invalid input and prove that `START-OF-SELECTION` is not
   reached.
6. Execute with valid input and inspect the transition to the application
   method.
7. Repeat in background only after removing GUI-dependent assumptions.

---

## 23. Common Misinterpretations

| Misinterpretation                                                | Correction                                                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| “ABAP executes a report top to bottom.”                          | The runtime invokes event blocks according to the report and screen lifecycle.           |
| “`LOAD-OF-PROGRAM` is implicit and cannot be defined.”           | It is a definable program-constructor event, though rarely needed in an ordinary report. |
| “`INITIALIZATION` runs before every display.”                    | It initializes before the first standard-screen processing; PBO can repeat.              |
| “Changing any radio button immediately triggers an event.”       | Immediate round trip requires an associated `USER-COMMAND` or another screen command.    |
| “F4 executes `AT SELECTION-SCREEN` like F8.”                     | Custom F4 uses `ON VALUE-REQUEST`; it does not start report execution.                   |
| “`OUTPUT` means report result output.”                           | `AT SELECTION-SCREEN OUTPUT` is selection-screen PBO before display.                     |
| “Every `AT SELECTION-SCREEN` event always runs.”                 | The triggered variants depend on fields and the user's action.                           |
| “F8 directly calls `START-OF-SELECTION`.”                        | Selection-screen PAI and validation must succeed first.                                  |
| “`END-OF-SELECTION` is mandatory.”                               | It is especially meaningful with logical databases and is not required for every report. |
| “A required screen field enforces the business rule everywhere.” | Screen checks do not replace application authorization and invariants.                   |
| “Report event blocks are local procedures.”                      | Most event blocks work with compilation-unit global data; keep them thin.                |
| “The same interactive flow occurs in background.”                | Background processing has no user-driven F4 or correction loop.                          |

---

## 24. Compact Event Reference

| Event                            | Frequency/trigger                                 | Main responsibility                    |
| -------------------------------- | ------------------------------------------------- | -------------------------------------- |
| `LOAD-OF-PROGRAM`                | When program is loaded into internal session      | Rare program-constructor logic         |
| `INITIALIZATION`                 | Before first standard selection-screen processing | Initial selection defaults             |
| `AT SELECTION-SCREEN OUTPUT`     | Before every relevant display                     | Dynamic screen attributes              |
| `... ON VALUE-REQUEST FOR field` | User presses F4                                   | Custom value help                      |
| `... ON HELP-REQUEST FOR field`  | User presses F1                                   | Custom field help                      |
| `... ON field`                   | Selection-screen PAI for field                    | Field validation                       |
| `... ON END OF selcrit`          | Whole selection criterion available               | Multiple/range validation              |
| `... ON RADIOBUTTON GROUP group` | Radio group processed in PAI                      | Group validation                       |
| `... ON BLOCK block`             | Block processed in PAI                            | Related-field validation               |
| `AT SELECTION-SCREEN`            | General PAI event                                 | Command and cross-field validation     |
| `... ON EXIT-COMMAND`            | Exit-type command                                 | Safe leave/cleanup behavior            |
| `START-OF-SELECTION`             | Selection processing succeeded                    | Main application entry                 |
| `GET node`                       | Logical database provides node                    | Legacy logical-database row processing |
| `END-OF-SELECTION`               | Selection/logical DB processing completes         | Legacy/final report processing         |
| List events                      | User/page activity on classic list                | Classic output interaction             |

---
