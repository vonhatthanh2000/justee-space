---
title: SAP ABAP Modularization
part: ABAP
summary: SAP ABAP Modularization
category: Technical
tags:
  - sap
  - abap
publishedAt: 2026-07-06
---

## 1. The Four Levels of Modularization

The word **module** is ambiguous. First identify what is being separated.

```text
Repository / deployment organization
  Package and software component
          │
Architectural contract
  Class, interface, released API
          │
Callable processing block
  Method, function module, legacy FORM routine
          │
Source-text organization
  INCLUDE
```

| Level                  | Main question                                                   | Examples                              |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------- |
| Package boundary       | Which objects belong, depend on one another, and move together? | Package, software component           |
| Architectural boundary | What stable responsibility and contract are exposed?            | Interface, global class, released API |
| Procedure boundary     | What inputs enter, what outputs leave, and what can fail?       | Method, function module, `FORM`       |
| Source organization    | In which source unit is this text maintained?                   | `INCLUDE` program                     |

Splitting 2,000 lines into ten includes improves navigation, but does not by
itself reduce shared state, coupling, side effects, or test difficulty.

---

## 2. Modern Decision Guide

| Need                                               | Preferred construct                                | Why                                                         |
| -------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Business/domain logic in new development           | Instance method behind an interface                | Encapsulation, substitution, testing, dependency injection  |
| Stateless utility with no substitutable dependency | Static method, used selectively                    | Simple call without object state                            |
| One calculated result                              | Functional method with `RETURNING`                 | Natural expression-oriented call                            |
| Existing classic reusable API                      | Existing function module                           | Preserve the supported contract; wrap when useful           |
| RFC or update-task infrastructure that requires it | Appropriately configured function module           | Function modules provide these classic runtime capabilities |
| Organizing a large legacy program                  | Include program                                    | Source separation only                                      |
| Reading old procedural code                        | `FORM`/`PERFORM`                                   | Compatibility and controlled refactoring                    |
| New RAP business logic                             | Behavior implementation method plus helper classes | Framework contract plus testable domain logic               |

Default rule for new code:

```text
Interface → class → small cohesive methods
```

Do not introduce a function module or `FORM` merely because code must be reused.

---

## 3. Methods: The Primary Modern Procedure

A method belongs to a class or interface. It has a statically known signature,
visibility, parameter directions, typing, and exception contract.

### 3.1 Instance method

```abap
INTERFACE zif_amount_calculator PUBLIC.
  METHODS calculate_net_amount
    IMPORTING
      quantity   TYPE decfloat34
      unit_price TYPE decfloat34
    RETURNING
      VALUE(net_amount) TYPE decfloat34.
ENDINTERFACE.

CLASS zcl_amount_calculator DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES zif_amount_calculator.
ENDCLASS.

CLASS zcl_amount_calculator IMPLEMENTATION.
  METHOD zif_amount_calculator~calculate_net_amount.
    net_amount = quantity * unit_price.
  ENDMETHOD.
ENDCLASS.
```

Call:

```abap
DATA(calculator) = NEW zcl_amount_calculator( ).

DATA(net_amount) = calculator->zif_amount_calculator~calculate_net_amount(
  quantity   = CONV decfloat34( '3' )
  unit_price = CONV decfloat34( '12.50' ) ).
```

The interface expresses the consumer contract. The class expresses one
implementation. Calling through the interface makes replacement and testing
possible.

### 3.2 Static method

```abap
CLASS-METHODS normalize_status
  IMPORTING raw_status TYPE string
  RETURNING VALUE(status) TYPE string.
```

Call:

```abap
DATA(status) = zcl_status_helper=>normalize_status( raw_status ).
```

Static methods are suitable for genuinely stateless operations. Excessive
static dependencies behave like globals: they are difficult to substitute and
can make isolated tests harder.

### 3.3 Visibility

| Visibility          | Meaning                                     |
| ------------------- | ------------------------------------------- |
| `PUBLIC SECTION`    | Callable by external consumers              |
| `PROTECTED SECTION` | Accessible to the class and subclasses      |
| `PRIVATE SECTION`   | Internal implementation detail of the class |

Expose the smallest useful public contract. Test public behavior; do not make
every helper public merely to call it from a test.

### 3.4 Functional methods

A functional method has exactly one `RETURNING` parameter and can appear in an
expression.

```abap
METHODS calculate_total
  IMPORTING items TYPE ztt_order_item
  RETURNING VALUE(total) TYPE decfloat34.

DATA(total) = calculator->calculate_total( items ).
```

The return value is completely typed and passed by value. Use `EXPORTING` or
`CHANGING` parameters only when the procedure naturally produces several
outputs or intentionally updates caller-owned state.

---

## 4. Method Interfaces and Parameter Directions

Directions are named from the **callee's** perspective.

| Formal parameter in method | Callee meaning                                     | Caller clause                                    |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `IMPORTING`                | Method receives input                              | `EXPORTING` or omitted in functional call syntax |
| `EXPORTING`                | Method produces output                             | `IMPORTING`                                      |
| `CHANGING`                 | Method receives and returns the same logical value | `CHANGING`                                       |
| `RETURNING`                | Functional result                                  | Operand position or `RECEIVING`                  |

Example:

```abap
METHODS determine_status
  IMPORTING current_quantity TYPE i
  EXPORTING reason           TYPE string
  CHANGING  status           TYPE string.

service->determine_status(
  EXPORTING current_quantity = quantity
  IMPORTING reason           = DATA(reason)
  CHANGING  status           = status ).
```

The caller's keywords are not an arbitrary “inversion.” Both sides describe
the same flow from their own perspective.

### 4.1 Optional and default parameters

Method input and changing parameters can be optional or have defaults where the
language permits.

```abap
METHODS format_amount
  IMPORTING
    amount       TYPE decfloat34
    currency     TYPE c LENGTH 3 DEFAULT 'EUR'
    show_currency TYPE abap_bool OPTIONAL
  RETURNING VALUE(text) TYPE string.
```

Inside a procedure, `IS SUPPLIED` distinguishes an omitted optional parameter
from one supplied with its type-initial value.

Use optional parameters carefully. Too many independent options often indicate
that the method has several responsibilities or needs a parameter object.

---

## 5. Parameter Passing: Reference, Value, and Value-Result

Parameter direction and parameter passing are different dimensions.

```text
Direction: IMPORTING / EXPORTING / CHANGING / RETURNING
Passing:   by reference / by value / value-result behavior
```

### 5.1 Pass by reference

The formal parameter refers to the actual parameter. No independent parameter
copy is created for the procedure contract.

- Changes through an output-capable reference parameter affect the caller.
- Aliasing can create side effects when the same object is reachable through
  several paths.
- Input parameters should be treated as inputs according to their contract.

### 5.2 Pass by value

`VALUE(parameter)` creates a local formal parameter. Input values are copied in;
output-capable values are copied back only when procedure processing completes
successfully.

For large or deep data, do not assume an immediate physical copy of every byte:
the ABAP runtime can optimize copying internally. Choose semantics first and
measure important paths.

### 5.3 Value-result

For an output-capable `VALUE(...)` parameter, the procedure works on a local
value and transfers the result to the caller at successful completion. If an
exception ends the procedure before successful completion, that copy-back does
not occur.

### 5.4 Prefer intention-revealing interfaces

```text
Input only             → IMPORTING
One new result         → RETURNING
Several new results    → EXPORTING or a result structure
Intentional in/out     → CHANGING
```

Do not use `CHANGING` as a convenient substitute for designing a result.

---

## 6. Class-Based Exceptions

Declare failures that the caller can reasonably handle.

```abap
METHODS submit_request
  IMPORTING request_uuid TYPE sysuuid_x16
  RAISING   zcx_request_invalid
            zcx_request_unauthorized.
```

```abap
TRY.
    service->submit_request( request_uuid ).
  CATCH zcx_request_invalid INTO DATA(invalid_error).
    DATA(message) = invalid_error->get_text( ).
  CATCH zcx_request_unauthorized INTO DATA(auth_error).
    message = auth_error->get_text( ).
ENDTRY.
```

Use class-based exceptions for exceptional failure paths. Do not return a
Boolean plus an unrelated global message when the caller needs structured error
information.

In RAP behavior methods, follow the generated `FAILED` and `REPORTED` contract
for business-operation failures instead of replacing it with an arbitrary
exception design.

---

## 7. Includes: Source Organization, Not Encapsulation

An include program is an ABAP repository source object that cannot be compiled
independently. `INCLUDE name.` incorporates its source into the compilation
unit of the including program.

```abap
REPORT zorder_report.

INCLUDE zorder_report_top. " declarations
INCLUDE zorder_report_sel. " selection screen
INCLUDE zorder_report_cls. " local classes
```

Conceptually:

```text
Main source + included source units
              ↓ activation/compilation
One compilation unit
```

### 7.1 What an include does

- Splits a large source into separately maintained source units.
- Participates in the including program's compilation and syntax context.
- Can organize declarations, procedural blocks, local classes, or event logic.
- Cannot execute independently.

### 7.2 What an include does not do

- It does not define a callable interface merely by being an include.
- It does not create a runtime call or stack frame.
- It does not isolate global variables from the including program.
- It does not make logic reusable in the architectural sense.
- It does not automatically improve unit testability.

Declarations in an include have the visibility and scope produced by their
position in the combined program. Source order therefore matters.

### 7.3 Parameters

An include itself has no parameter interface. A method or legacy `FORM` written
inside an include can have parameters because that procedure—not the include—
defines the call boundary.

### 7.4 Activation

An include must be syntax-checked in a compilation-unit context. When it
changes, activate the include and affected owning repository objects as a
consistent change set. Do not claim that an include is independently compiled
or that every include change always requires a manual activation of every main
program; tooling and dependency handling vary by development environment.

### 7.5 Reuse warning

SAP recommends assigning an include program to one compilation unit. Reusing
the same include across unrelated programs creates hidden dependencies on
global declarations, program type, source order, and event context. Extract a
class or interface when reuse is the real requirement.

---

## 8. Subroutines: Legacy `FORM` and `PERFORM`

SAP classifies subroutines as obsolete. You must recognize and safely maintain
them in classic code, but use methods for new designs.

```abap
PERFORM calculate_net
  USING    quantity unit_price
  CHANGING net_amount.

FORM calculate_net
  USING    quantity   TYPE decfloat34
           unit_price TYPE decfloat34
  CHANGING net_amount TYPE decfloat34.

  net_amount = quantity * unit_price.
ENDFORM.
```

At `PERFORM`, control enters the `FORM`, executes it, and returns after the call.

### 8.1 Scope

- A subroutine is implemented outside classes.
- It normally belongs to its program's procedural context.
- It can directly access that program's global data, which creates hidden input
  and output channels.
- Data declared inside the `FORM` is local to a call; `STATICS` data persists
  across calls in the relevant internal session.

`PERFORM ... IN PROGRAM` can call a subroutine in another program, but creates a
fragile cross-program dependency. Do not use it as a modern public API.

### 8.2 Subroutine parameter passing

| Declaration         | Passing behavior     | Caller effect                                                    |
| ------------------- | -------------------- | ---------------------------------------------------------------- |
| `USING p`           | Reference by default | A write can affect caller state, despite the input-oriented name |
| `USING VALUE(p)`    | Value                | Local copy; caller is not changed                                |
| `CHANGING p`        | Reference by default | Writes immediately affect caller state                           |
| `CHANGING VALUE(p)` | Value-result         | Local value copied back after successful completion              |

`USING` and `CHANGING` communicate intent; `VALUE(...)` determines value
passing. A reference-passed `USING` parameter is not protected from writes by
the language in the same way a strong immutable contract would be, so treat it
as read-only by convention.

### 8.3 Typing

Without explicit typing, a subroutine formal parameter is generically typed as
`any`. This defers useful checks and allows failures to appear at runtime.

```abap
" Avoid in maintained code
FORM process USING input.

" Better legacy form
FORM process USING input TYPE ty_request.
```

Subroutines do not support modern optional/default parameter interfaces. Static
calls should pass the declared parameter sequence exactly. Dynamic subroutine
calls weaken static checks further and introduce injection risk if an external
value controls the procedure/program name.

### 8.4 Obsolete `TABLES` parameters

```abap
" Obsolete — recognize, do not introduce
FORM process TABLES rows STRUCTURE zs_row.
```

Use typed `USING` or `CHANGING` parameters while maintaining a `FORM`, and use a
class method when refactoring the design.

```abap
TYPES ty_requests TYPE STANDARD TABLE OF ty_request WITH EMPTY KEY.

FORM process
  USING requests TYPE ty_requests.
  " Read-only by convention
ENDFORM.
```

---

## 9. Function Modules

A function module is a globally named procedure implemented inside a function
group. Classic maintenance uses transaction `SE37`; function groups can be
inspected with `SE80` or ADT tooling, depending on the environment.

```text
Function group (function pool)
  ├── global data shared by its function modules
  ├── generated and developer-managed includes
  ├── Function Module A
  └── Function Module B
```

The function module has a public interface. The function group's global data is
shared state within the loaded function pool and can make behavior order-
dependent if misused.

### 9.1 Call direction

Consider an illustrative custom function module whose interface imports an ID
and exports a result:

```abap
CALL FUNCTION 'Z_READ_REQUEST_STATUS'
  EXPORTING
    request_uuid = request_uuid
  IMPORTING
    status       = status
  EXCEPTIONS
    not_found    = 1
    OTHERS       = 2.

IF sy-subrc <> 0.
  " Handle classic exception result
ENDIF.
```

| Function-module interface | Caller uses                    | Flow                     |
| ------------------------- | ------------------------------ | ------------------------ |
| `IMPORTING request_uuid`  | `EXPORTING request_uuid = ...` | Caller → function module |
| `EXPORTING status`        | `IMPORTING status = ...`       | Function module → caller |
| `CHANGING data`           | `CHANGING data = ...`          | Both directions          |

This is the same callee/caller perspective used for method calls.

### 9.2 Interface typing and runtime checks

Function module names and interfaces are resolved at runtime by `CALL FUNCTION`,
even when the name is a literal. Incorrect names, missing parameters, unknown
parameters, length conflicts, and type conflicts therefore lead to dynamic-call
exceptions or runtime errors such as:

- `CALL_FUNCTION_NOT_FOUND`
- `CALL_FUNCTION_PARM_MISSING`
- `CALL_FUNCTION_PARM_UNKNOWN`
- `CALL_FUNCTION_CONFLICT_TYPE`
- `CALL_FUNCTION_CONFLICT_LENG`

The sample's generic `ILLEGAL_TYPE_PARAM` label is not the useful diagnostic
name for ordinary function-module parameter mismatches. Read the actual short
dump and identify the formal and actual parameter types.

### 9.3 Optional parameters

Unlike `FORM` routines, function module importing and changing parameters can
be optional or have default values. Exporting parameters are optional to the
caller. The function module can use `parameter IS SUPPLIED` where supported to
distinguish omission from an initial value.

### 9.4 Exceptions

#### Classic non-class-based exception

```abap
CALL FUNCTION 'Z_READ_REQUEST_STATUS'
  EXPORTING request_uuid = request_uuid
  IMPORTING status       = status
  EXCEPTIONS not_found   = 1
             OTHERS      = 2.

CASE sy-subrc.
  WHEN 0.
    " Success
  WHEN 1.
    " NOT_FOUND
  WHEN OTHERS.
    " Another mapped exception
ENDCASE.
```

The numeric values are assigned by the caller. `sy-subrc = 1` has meaning only
because this particular call maps `not_found = 1`.

#### Class-based exception

If the function module declares class-based exceptions, handle them with
`TRY ... CATCH` according to its interface.

```abap
TRY.
    CALL FUNCTION 'Z_READ_REQUEST_STATUS_NEW'
      EXPORTING request_uuid = request_uuid
      IMPORTING status       = status.
  CATCH zcx_request_not_found INTO DATA(error).
    DATA(message) = error->get_text( ).
ENDTRY.
```

SAP considers non-class-based exceptions a compatibility mechanism. Do not
define them for new general-purpose APIs when a class-based contract is
available and supported by the invocation type.

### 9.5 Obsolete `TABLES` interface parameters

The `TABLES` parameter style is legacy and reference-based. New interfaces use
typed importing, exporting, changing, or returning parameters. Be especially
careful with RFC restrictions: remote-enabled interfaces have serialization
and type constraints beyond local calls.

---

## 10. Specialized Function-Module Runtime Modes

Function modules remain important where the platform explicitly requires their
runtime capabilities.

### 10.1 Remote-enabled function module (RFC)

```abap
CALL FUNCTION 'Z_REMOTE_OPERATION'
  DESTINATION destination
  EXPORTING input = input
  IMPORTING output = output
  EXCEPTIONS
    system_failure        = 1 MESSAGE system_message
    communication_failure = 2 MESSAGE communication_message
    OTHERS                = 3.
```

RFC introduces a serialization and communication boundary. Never pass an
untrusted external string directly as a dynamic function or destination name.
Validate allowlisted values and use supported communication configuration.

### 10.2 Update function module

```abap
CALL FUNCTION 'Z_WRITE_AUDIT'
  IN UPDATE TASK
  EXPORTING audit_entry = audit_entry.
```

An update function module registers work for update processing associated with
the SAP LUW. It has strict interface and execution rules. Do not replace an
ordinary method call with `IN UPDATE TASK` merely to make it asynchronous.

### 10.3 Background/asynchronous mechanisms

Classic asynchronous RFC, background tasks, bgRFC, qRFC, application jobs, and
events solve different reliability and sequencing problems. “Function module”
alone does not imply remote, asynchronous, or transactional behavior; the call
variant and module attributes matter.

---

## 11. Other Legacy Processing Blocks

### 11.1 Macros

```abap
DEFINE set_status.
  &1-status = &2.
END-OF-DEFINITION.
```

Macros are source-level substitution constructs with positional placeholders,
not typed procedures. They can obscure control flow and tooling. Recognize them
in old code; prefer methods for new logic.

### 11.2 Dialog modules

```abap
MODULE validate_screen_input INPUT.
  " Classic dynpro PAI logic
ENDMODULE.
```

`MODULE ... ENDMODULE` processing blocks are called by classic screen flow
logic (`PBO`/`PAI`). They are relevant to dynpro maintenance, not a preferred
general-purpose reuse mechanism.

### 11.3 Event blocks

Blocks such as `START-OF-SELECTION` define framework-driven program events.
They are entry points, not reusable APIs. Keep them thin and delegate coherent
logic to methods.

---

## 12. Scope and State

| Location                   | Typical lifetime/visibility      | Main risk                                   |
| -------------------------- | -------------------------------- | ------------------------------------------- |
| Method local `DATA`        | One invocation                   | Low; explicit local state                   |
| Instance attribute         | Object lifetime                  | Hidden mutation if responsibility is broad  |
| Static/class attribute     | Internal-session/class lifetime  | Global-style coupling and test interference |
| Program global data        | Program/internal-session context | Hidden inputs and outputs across procedures |
| Function-group global data | Loaded function-pool context     | Calls depend on prior calls/state           |
| `STATICS` local data       | Retained across procedure calls  | Surprising state and test-order dependence  |

The phrase “local data is freed immediately on exit” is an oversimplification.
Local names leave scope at procedure exit, but referenced objects, shared data,
runtime optimizations, and garbage collection determine physical memory
lifetime.

Prefer explicit parameters and returned results over procedure access to global
state.

---

## 13. Refactoring a `FORM` into a Class

### 13.1 Legacy form

```abap
DATA orders TYPE ztt_order.
DATA total  TYPE decfloat34.

FORM calculate_total.
  LOOP AT orders INTO DATA(order).
    total += order-net_amount.
  ENDLOOP.
ENDFORM.
```

Hidden contract:

```text
Input:  global orders
Output: global total
Failure: undocumented
```

### 13.2 First safe step: expose the contract

```abap
FORM calculate_total
  USING    orders TYPE ztt_order
  CHANGING total  TYPE decfloat34.

  CLEAR total.
  LOOP AT orders INTO DATA(order).
    total += order-net_amount.
  ENDLOOP.
ENDFORM.
```

### 13.3 Modern result: functional method

```abap
METHODS calculate_total
  IMPORTING orders TYPE ztt_order
  RETURNING VALUE(total) TYPE decfloat34.

METHOD calculate_total.
  total = REDUCE decfloat34(
    INIT sum = CONV decfloat34( 0 )
    FOR order IN orders
    NEXT sum += order-net_amount ).
ENDMETHOD.
```

The improvement is not the shorter syntax. The method has an explicit input,
one explicit result, no dependency on program global state, and a contract that
can live behind an interface.

---

## 14. Testable Modular Design

Merely extracting code into a method does not make it testable. A method that
calls the database, system date, authorization, external service, and output UI
directly still has many hidden dependencies.

```text
Application service
  ├── zif_order_repository
  ├── zif_authorization
  ├── zif_clock
  └── pure amount/status policy
```

Inject dependencies through a constructor or factory-visible seam:

```abap
METHODS constructor
  IMPORTING
    repository    TYPE REF TO zif_order_repository
    authorization TYPE REF TO zif_order_authorization.
```

Then ABAP Unit tests can supply doubles implementing those interfaces.

### Design properties

- **High cohesion:** one module owns one closely related responsibility.
- **Low coupling:** consumers depend on small contracts, not implementation
  globals.
- **Explicit dependencies:** database, time, authorization, and external calls
  are visible.
- **Explicit effects:** mutation and persistence are not hidden in a “helper.”
- **Stable abstraction:** names express business intent, not implementation
  steps such as `do_processing_2`.

---

## 15. Transaction Ownership

A reusable procedure should not issue `COMMIT WORK` or `ROLLBACK WORK` unless
its documented contract truly owns the complete SAP LUW. Otherwise it can
prematurely commit changes made by its caller.

```text
Caller/application boundary
  starts orchestration
     ├── validate
     ├── calculate
     ├── persist/register changes
     └── decide transaction completion
```

This is especially important when wrapping legacy function modules: inspect
whether the called API performs commits, registers update tasks, sends messages,
or mutates function-group global state.

---

## 16. Modularization in RAP

### 16.1 Framework entry points

A RAP behavior pool is an ABAP class pool. The framework calls generated
handler/saver method signatures based on the behavior definition.

```text
Behavior definition
  declares operation/action/validation/determination
             ↓
RAP runtime invokes generated behavior-handler method
             ↓
Behavior method orchestrates EML and domain helpers
```

Do not rename generated method parameters or invent an unrelated callable name;
the framework contract determines the signature.

### 16.2 Keep behavior methods thin enough

```abap
METHOD validate_customer.
  " 1. Read required BO state with EML
  " 2. Delegate pure/customer-existence decision where useful
  " 3. Fill FAILED and REPORTED according to RAP contract
ENDMETHOD.
```

Good extraction candidates include:

- deterministic calculations;
- state-transition policies;
- message construction;
- adapters around released external APIs;
- repository/query logic with a test seam.

Keep `%tky`, `%cid`, `%is_draft`, `FAILED`, `MAPPED`, and `REPORTED` handling at
the RAP boundary unless a dedicated helper abstraction genuinely improves it.

### 16.3 Transaction rule

Do not execute `COMMIT WORK` inside RAP behavior implementation. RAP owns the
save sequence and transaction boundary. A legacy function module that commits
internally is therefore dangerous to call from a RAP interaction/save flow.

### 16.4 Local mode is not modularization

`IN LOCAL MODE` changes EML authorization/feature-control handling inside the
current BO implementation context. It does not make the called logic a separate
module and does not bypass validations or the transactional buffer.

---

## 17. ABAP Cloud and Clean-Core Boundary

ABAP Cloud uses a restricted language version and released APIs to provide
lifecycle-stable development.

For new cloud-ready code:

- use classes, interfaces, and methods;
- use ADT as the development environment;
- depend only on objects released for the required contract;
- check API State, not merely whether an object exists;
- avoid obsolete syntax such as `FORM`/`PERFORM`;
- do not call an unreleased classic function module directly from clean-core
  code;
- wrap permitted classic dependencies only within an intentional migration tier
  in applicable private/on-premise scenarios.

A function module is not automatically forbidden because it is old, and a
class is not automatically clean-core because it is object-oriented. The
decisive questions are release state, allowed language version, and stability
contract.

---

## 18. Naming Guidance

Prefixes such as `iv_`, `ev_`, `cv_`, `lt_`, and `gt_` are team conventions,
not ABAP language requirements.

Use names that expose intent:

```abap
METHODS calculate_total
  IMPORTING items TYPE ztt_order_item
  RETURNING VALUE(total) TYPE decfloat34.
```

This is usually clearer than encoding every implementation detail:

```abap
METHODS calc
  IMPORTING it_data TYPE ztt_order_item
  RETURNING VALUE(rv_val) TYPE decfloat34.
```

Follow the project's agreed style consistently, but do not mistake prefixes for
encapsulation or type safety.

---

## 19. Common Failure Modes

| Symptom                                   | Likely cause                                                        | Diagnostic direction                                           |
| ----------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Changing an include breaks several places | Shared source depends on different globals/contexts                 | Use where-used list; establish each compilation-unit contract  |
| `PERFORM` call dumps or behaves strangely | Parameter sequence/type mismatch or hidden globals                  | Compare caller/callee order and explicit types                 |
| Function module call dumps                | Missing, unknown, length-conflicting, or type-conflicting parameter | Read ST22 dump and compare SE37 interface with actual values   |
| `sy-subrc` handling is wrong              | Caller mapped classic exceptions differently or checked too late    | Read the exact `EXCEPTIONS` mapping immediately after the call |
| Unit test depends on execution order      | Static, global, `STATICS`, or function-group state                  | Reset/extract state; inject dependency                         |
| Helper unexpectedly commits data          | Procedure owns hidden transaction control                           | Inspect `COMMIT WORK`, update-task, RFC, and called APIs       |
| RAP transaction becomes inconsistent      | Legacy call commits or bypasses BO contract                         | Keep transaction under RAP and use released/compatible APIs    |
| “Reusable” method cannot be reused        | It reads globals, UI state, or database implicitly                  | Make inputs, outputs, effects, and dependencies explicit       |
| Static utility is impossible to fake      | Consumer depends directly on static implementation                  | Introduce a small interface and instance collaborator          |

---

## 20. Technical Review Workflow

When reviewing a modularization problem:

1. **Identify the construct:** include, method, function module, `FORM`, macro,
   screen module, or event block.
2. **Identify the owner:** program, class, interface, function group, package, or
   framework.
3. **Write the real contract:** inputs, outputs, exceptions/messages, database
   effects, global state, commits, and external calls.
4. **Check call resolution:** static method, dynamic method, local/external
   `PERFORM`, local FM, RFC, update task, or framework callback.
5. **Check typing and parameter passing:** direction, reference/value, optional
   parameters, table types, and aliasing.
6. **Check lifecycle:** local invocation, object state, class/global state,
   function-group state, or internal session.
7. **Check test seam:** can dependencies be substituted without a real database,
   clock, authorization, or remote system?
8. **Check transaction ownership:** who is allowed to save, commit, or roll back?
9. **Check release contract:** is the dependency permitted in the target ABAP
   language version and API contract?
10. **Refactor by risk:** first expose hidden parameters and effects, then move
    behavior behind a method/interface.

---

## 21. Compact Syntax Sheet

```text
Instance method
  object->method( ... )

Static method
  class=>method( ... )

Functional result
  DATA(result) = object->method( input )

Class-based failure
  TRY ... CATCH cx_... ENDTRY

Include source
  INCLUDE source_name.

Legacy subroutine
  PERFORM routine USING ... CHANGING ...
  FORM routine USING ... CHANGING ... ENDFORM.

Function module
  CALL FUNCTION 'NAME'
    EXPORTING ...
    IMPORTING ...
    CHANGING ...
    EXCEPTIONS ...

Remote function call
  CALL FUNCTION 'NAME' DESTINATION destination ...

Update registration
  CALL FUNCTION 'NAME' IN UPDATE TASK ...
```
