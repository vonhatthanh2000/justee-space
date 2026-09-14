---
title: SAP RAP Behavior Modeling and Implementation
part: RAP
summary: This document explains how a RAP business object becomes transactional. It covers the base behavior definition, behavior projection, managed and unmanaged implementation choices, behavior pools, standard operations, field control, determinations, validations, actions, prechecks, feature control, EML, and RAP response structures.
category: Technical
tags:
  - sap
  - rap
publishedAt: 2026-09-07
---

# SAP RAP Behavior Modeling and Implementation — Technical Reference

This document explains how a RAP business object becomes transactional. It
covers the base behavior definition, behavior projection, managed and unmanaged
implementation choices, behavior pools, standard operations, field control,
determinations, validations, actions, prechecks, feature control, EML, and RAP
response structures.

The central implementation principle is:

> The behavior definition declares what the business object can do. The RAP
> runtime enforces the declared contract and supplies framework behavior. The
> behavior pool implements only the application-specific logic required by
> that contract. The behavior projection selects which capabilities a consumer
> may use.

Primary SAP sources:

- [SAP Help — Defining Standard Behavior](https://help.sap.com/docs/abap-cloud/abap-rap/defining-standard-behavior)
- [SAP Help — Implementing Behavior](https://help.sap.com/docs/abap-cloud/abap-rap/implementing-behavior-of-business-object)
- [SAP Help — Projecting Behavior](https://help.sap.com/docs/abap-cloud/abap-rap/projecting-behavior)
- [SAP Help — Determinations](https://help.sap.com/docs/abap-cloud/abap-rap/determinations)
- [SAP Help — Validation Implementation](https://help.sap.com/docs/abap-cloud/abap-rap/validation-implementation)
- [SAP Help — Action Runtime](https://help.sap.com/docs/abap-cloud/abap-rap/action-runtime)
- [SAP Help — Feature Control](https://help.sap.com/docs/abap-cloud/abap-rap/implementation-contract-feature-control)

---

## 1. Position of Behavior in RAP

```text
CDS data model
  entities, fields, composition tree, associations
                         │
                         ▼
Base Behavior Definition
  transactional capabilities and implementation contract
                         │
                         ├──────── RAP managed runtime
                         │          generic CRUD, buffer, mapping,
                         │          locking and ETag support
                         │
                         └──────── Behavior Pool
                                    custom rules and operations
                         │
                         ▼
Behavior Projection
  capabilities exposed for one consumer
                         │
                         ▼
OData service or EML consumer
```

The behavior definition, often abbreviated as BDEF, is attached to the CDS
business-object model. It declares:

- managed, unmanaged, projection, or interface behavior;
- standard create, update, and delete operations;
- create-by-association for child nodes;
- persistence tables and field mappings;
- locks and ETags;
- static and dynamic field characteristics;
- determinations and validations;
- actions and functions;
- authorization and feature-control hooks;
- draft behavior where applicable.

The BDEF contains declarations, not the ABAP implementation of custom business
logic.

---

## 2. Base Behavior Definition Versus Behavior Projection

### 2.1 Base behavior definition

The base BDEF defines the reusable transactional contract:

```abap
managed implementation in class zbp_i_salesorderrequest unique;
strict ( 2 );

define behavior for ZI_SalesOrderRequest alias SalesOrderRequest
  persistent table zsor_request
  lock master
  authorization master ( instance )
  etag master LocalLastChangedAt
{
  create;
  update;
  delete;

  association _Items { create; }

  field ( numbering : managed, readonly ) RequestUUID;
  field ( readonly ) RequestNumber,
                     Status,
                     TotalAmount,
                     LocalLastChangedAt;
  field ( mandatory : create ) SoldToParty;

  determination DeriveAmounts on modify
    { create; field TransactionCurrency; }

  validation ValidateCustomer on save
    { create; field SoldToParty; }

  action ( features : instance ) Submit result [1] $self;

  mapping for zsor_request
  {
    RequestUUID         = request_uuid;
    RequestNumber       = request_number;
    SoldToParty         = sold_to_party;
    Status              = status;
    TotalAmount         = total_amount;
    TransactionCurrency = transaction_currency;
    LocalLastChangedAt  = local_last_changed_at;
  }
}

define behavior for ZI_SalesOrderItem alias SalesOrderItem
  persistent table zsor_item
  lock dependent by _Request
  authorization dependent by _Request
  etag master LocalLastChangedAt
{
  update;
  delete;

  field ( numbering : managed, readonly ) ItemUUID;
  field ( readonly ) RequestUUID,
                     UnitPrice,
                     NetAmount,
                     TransactionCurrency,
                     LocalLastChangedAt;
  field ( mandatory : create ) Product,
                               RequestedQuantity;

  determination DeriveItemAmount on modify
    { create; field RequestedQuantity, UnitPrice; }

  validation ValidateProduct on save
    { create; field Product; }

  validation ValidateQuantity on save
    { create; field RequestedQuantity; }

  association _Request;
  association _Product;

  mapping for zsor_item
  {
    ItemUUID            = item_uuid;
    RequestUUID         = request_uuid;
    Product             = product;
    RequestedQuantity   = requested_quantity;
    QuantityUnit        = quantity_unit;
    UnitPrice           = unit_price;
    NetAmount           = net_amount;
    TransactionCurrency = transaction_currency;
    LocalLastChangedAt  = local_last_changed_at;
  }
}
```

### 2.2 Behavior projection

The behavior projection selects capabilities from the underlying BO for one
consumption contract:

```abap
projection;
strict ( 2 );

define behavior for ZC_SalesOrderRequest alias SalesOrderRequest
  use etag
{
  use create;
  use update;
  use delete;
  use action Submit;
  use association _Items { create; }
}

define behavior for ZC_SalesOrderItem alias SalesOrderItem
  use etag
{
  use update;
  use delete;
  use association _Request;
  use association _Product;
}
```

The projection does not contain the implementation of `Submit`, a validation,
or a determination. It can only expose behavior supported by the underlying
contract.

### 2.3 Responsibility boundary

| Artifact            | Technical responsibility               |
| ------------------- | -------------------------------------- |
| Base CDS            | Entity data model and relationships    |
| Base BDEF           | Reusable transactional contract        |
| Behavior pool       | Custom ABAP implementation             |
| CDS projection      | Consumer-visible fields and navigation |
| Behavior projection | Consumer-visible operations            |
| Metadata extension  | UI presentation and action placement   |

A field being present in a CDS projection does not make it editable. Editability
is governed by behavior field control and the exposed operation contract.

---

## 3. Behavior Entity Aliases

```abap
define behavior for ZI_SalesOrderRequest alias SalesOrderRequest
```

`SalesOrderRequest` is the BDEF entity alias. EML uses it to identify a node
inside the business object:

```abap
READ ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
  ENTITY SalesOrderRequest
  ...
```

The alias is not random at the call site. `ENTITY UpdateRequest` is valid only
if `UpdateRequest` is the declared alias of a BO entity in that behavior
contract.

One CDS entity belongs to one base behavior contract. Defining the same CDS
entity twice with aliases such as `Travel` and `UpdateTravel` does not create
two independent behavior modes. Different business operations are declared as
operations or actions on the one entity behavior:

```abap
define behavior for ZI_Travel alias Travel
{
  update;
  action AcceptTravel result [1] $self;
  action RejectTravel result [1] $self;
}
```

---

## 4. Managed and Unmanaged Implementation

### 4.1 Managed behavior

Managed RAP supplies generic transactional processing for standard operations.
Depending on the model and declarations, the framework handles:

- standard create, update, and delete;
- create-by-association;
- transactional buffering;
- persistence mapping;
- managed UUID numbering;
- lock handling;
- ETag handling;
- orchestration of determinations, validations, and save processing.

The developer still owns:

- the CDS and behavior model;
- field control;
- validations and determinations;
- actions and functions;
- authorization and feature control;
- business messages;
- integration with other BOs or released APIs;
- tests and operational diagnostics.

Managed does not mean “no ABAP.” It means the framework owns generic CRUD and
transaction mechanics while application code owns business-specific behavior.

### 4.2 Unmanaged behavior

Unmanaged RAP is appropriate when the application must control the operational
implementation, commonly because it:

- reuses an existing transactional API or legacy business object;
- has persistence that does not fit managed table handling;
- requires custom buffering or locking;
- maps operations to BAPIs, function modules, or other released capabilities;
- has an established save protocol that RAP must wrap.

The developer implements operation handlers such as create, update, delete,
read-by-association, create-by-association, and locking as required by the
contract.

Unmanaged does not mean direct SQL is automatically appropriate. The wrapped
application contract, released APIs, LUW rules, and clean-core restrictions
still apply.

### 4.3 Additional save

Managed with additional save keeps managed interaction and persistence while
allowing controlled save-phase additions such as writing an audit record or
outbox entry. It is not a reason to duplicate ordinary managed table updates.

Detailed save-sequence and additional-save design belongs to the transaction
and draft reference.

### 4.4 Selection guide

```text
New custom persistence with standard CRUD
  → managed

Existing released transactional API owns the real operation
  → unmanaged wrapper or façade

Managed persistence plus controlled post-save integration record
  → managed with additional save, where supported and appropriate
```

Choose by ownership of transaction mechanics, not by which syntax appears
shorter.

---

## 5. Strict Mode

```abap
strict ( 2 );
```

Strict mode applies the current RAP contract rules and syntax restrictions to
the behavior definition and its implementation. It improves consistency and
helps prevent reliance on obsolete or ambiguous behavior patterns.

Strict mode does not provide:

- CRUD;
- validation;
- determination;
- authorization;
- locking;
- persistence;
- business correctness.

Those features still require the corresponding implementation type and
declarations.

Use the strongest strict mode supported by the target ABAP release and keep the
behavior artifacts internally consistent.

---

## 6. Standard Operations and Child Creation

### 6.1 Root operations

```abap
create;
update;
delete;
```

These lines add standard operations to the BO contract. In a managed BO, the
framework can implement their generic persistence behavior.

### 6.2 Create-by-association

A composition child is created through its parent relationship:

```abap
define behavior for ZI_SalesOrderRequest alias SalesOrderRequest
{
  association _Items { create; }
}
```

The child behavior normally does not declare standalone `create`:

```abap
define behavior for ZI_SalesOrderItem alias SalesOrderItem
{
  update;
  delete;
  association _Request;
}
```

This preserves aggregate ownership:

```text
Create Request
  root create

Create Item for Request
  create by association through SalesOrderRequest._Items

Create Item with no Request
  not part of the BO contract
```

### 6.3 Operation declaration is not consumer exposure

An operation must pass through both layers:

```text
Base BDEF declares update
         │
         ▼
Behavior Projection uses update
         │
         ▼
Consumer sees update capability
```

If the base BDEF supports `delete` but the behavior projection omits
`use delete`, that service consumer cannot request delete through that
projection.

---

## 7. Persistence and Mapping

### 7.1 Persistent table

```abap
define behavior for ZI_SalesOrderItem alias SalesOrderItem
  persistent table zsor_item
```

The persistent-table declaration connects a managed entity to durable storage.
It does not mean every CDS element is automatically writable. Field control,
mapping, and framework-managed fields still apply.

### 7.2 Mapping block

```abap
mapping for zsor_item
{
  ItemUUID           = item_uuid;
  RequestUUID        = request_uuid;
  Product            = product;
  RequestedQuantity  = requested_quantity;
  QuantityUnit       = quantity_unit;
  UnitPrice          = unit_price;
  NetAmount          = net_amount;
  TransactionCurrency = transaction_currency;
}
```

The left side is the CDS element. The right side is the persistence field.

This mapping is unrelated to EML `MAPPED` output:

```text
BDEF mapping for table
  CDS field name ↔ persistence column name

EML MAPPED response
  client correlation ID ↔ generated/final entity key
```

### 7.3 Read-only and generated fields

Technical UUID:

```abap
field ( numbering : managed, readonly ) ItemUUID;
```

Managed early numbering assigns the key during the create interaction so the
new instance can be addressed immediately. A `RAW(16)` UUID is a common key
type for this pattern.

Read-only means the external consumer cannot change the field. The framework
or behavior implementation may still set it through its defined internal
mechanism.

---

## 8. Field Characteristics

### 8.1 Read-only

```abap
field ( readonly ) RequestNumber,
                   TotalAmount,
                   LocalLastChangedAt;
```

Use read-only for fields whose source of truth is the framework or backend
logic. Examples include technical keys, administrative timestamps, calculated
amounts, and controlled status fields.

### 8.2 Mandatory on create

```abap
field ( mandatory : create ) SoldToParty,
                             TransactionCurrency;
```

This describes a structural create requirement to RAP consumers. It is not a
substitute for semantic validation.

```text
mandatory : create
  field must be supplied as part of creation contract

validation
  supplied value must satisfy a business invariant
```

For example, `SoldToParty` can be supplied but reference a nonexistent or
blocked Customer. Backend validation must still reject that state.

### 8.3 Dynamic field control

Field mutability can depend on instance state:

```abap
field ( features : instance ) SoldToParty,
                              TransactionCurrency;
```

The behavior pool returns permission markers from an instance-feature method.
A submitted request can make commercial fields read-only while a draft request
keeps them editable.

Dynamic field control represents availability, not authorization. If the rule
depends on user identity or permission, implement authorization control.

---

## 9. Behavior Pool Architecture

### 9.1 Global container and local classes

A behavior pool is a special global ABAP class declared for the behavior of a
root CDS entity. Its relevant implementation normally resides in local classes:

```abap
CLASS lhc_SalesOrderRequest DEFINITION
  INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    METHODS DeriveAmounts FOR DETERMINE ON MODIFY
      IMPORTING keys FOR SalesOrderRequest~DeriveAmounts.

    METHODS ValidateCustomer FOR VALIDATE ON SAVE
      IMPORTING keys FOR SalesOrderRequest~ValidateCustomer.

    METHODS Submit FOR MODIFY
      IMPORTING keys FOR ACTION SalesOrderRequest~Submit RESULT result.

    METHODS GetInstanceFeatures FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features
      FOR SalesOrderRequest RESULT result.
ENDCLASS.
```

Handler classes inherit from `CL_ABAP_BEHAVIOR_HANDLER`. Saver classes inherit
from the appropriate RAP saver base class when the implementation type requires
save callbacks.

### 9.2 Framework invocation

The application does not instantiate `lhc_SalesOrderRequest` directly. RAP
generates and invokes the handler signatures from BDEF declarations.

```text
BDEF action Submit
       │
       ▼ generates contract
METHODS Submit FOR MODIFY ...
       │
       ▼ runtime dispatch
RAP calls handler when consumer invokes action
```

### 9.3 Do not keep transaction state in handler instance attributes

Handler and saver instances can be reinstantiated during nested calls. Do not
assume an instance attribute written by one method will remain available to a
later method.

Use:

- RAP transactional state;
- EML reads and modifications;
- method-local data;
- defined saver mechanisms;
- dedicated stable helper abstractions where appropriate.

Do not use behavior-handler instance memory as an undocumented transaction
buffer.

### 9.4 Keep orchestration separate from domain calculation

A strong behavior method has two layers:

```text
RAP adapter layer
  read keys and BO state
  call domain calculation
  write changes through EML
  map failures and messages

Domain helper
  calculate amount
  evaluate status transition
  validate date interval
```

Pure calculations are easier to unit-test when separated from EML orchestration.

---

## 10. Determinations

### 10.1 Purpose

A determination automatically modifies BO state when declared trigger
conditions occur.

```abap
determination DeriveItemAmount on modify
  { create; field RequestedQuantity, UnitPrice; }
```

Typical uses:

- calculate `NetAmount` after quantity or price changes;
- copy root currency to a newly created child;
- derive a default status;
- update a root aggregate from child data.

A determination is not a guard. It changes or derives state.

### 10.2 Runtime requirements

Determinations must be designed for RAP runtime semantics:

- execution order between separate determinations is not fixed;
- each determination must work independently;
- repeated execution under the same state must give the same result;
- trigger fields must include every input that can change the calculation;
- logic must work for active and draft keys when the BO supports both;
- a determination does not have a `FAILED` response like a validation.

Avoid two determinations that silently depend on one another:

```text
Determination A calculates Item.NetAmount
Determination B assumes A already ran and calculates Request.TotalAmount
```

Because ordering is not guaranteed, either make B read a state that is always
valid or centralize the dependent derivation in one orchestrated calculation.

### 10.3 Business flow for item amount derivation

```text
1. Consumer changes quantity or unit price.
2. RAP places the change in the transactional buffer.
3. Trigger condition invokes DeriveItemAmount.
4. Handler reads current item state from the buffer.
5. Domain logic calculates quantity × price.
6. Handler updates NetAmount in local mode.
7. Consumer receives or rereads the derived value.
8. Save validation later decides whether the complete BO is valid.
```

### 10.4 Representative implementation

```abap
METHOD DeriveItemAmount.

  READ ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
    ENTITY SalesOrderItem
      FIELDS ( RequestedQuantity UnitPrice )
      WITH CORRESPONDING #( keys )
    RESULT DATA(items).

  MODIFY ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
    ENTITY SalesOrderItem
      UPDATE FIELDS ( NetAmount )
      WITH VALUE #(
        FOR item IN items
        ( %tky      = item-%tky
          NetAmount = item-RequestedQuantity * item-UnitPrice ) )
    REPORTED DATA(update_reported).

  reported = CORRESPONDING #( DEEP update_reported ).

ENDMETHOD.
```

Code-to-business mapping:

| Code                               | Business meaning                                                   |
| ---------------------------------- | ------------------------------------------------------------------ |
| `READ ENTITIES ... IN LOCAL MODE`  | Read the current item values within this BO transaction            |
| `FIELDS (...)`                     | Fetch only calculation inputs                                      |
| `WITH CORRESPONDING #( keys )`     | Convert the trigger-key table into the typed EML request shape     |
| `RESULT DATA(items)`               | Hold current buffered item state                                   |
| `UPDATE FIELDS ( NetAmount )`      | Restrict the internal modification to the derived field            |
| `VALUE #( FOR item IN items ... )` | Construct one update row per item explicitly                       |
| `%tky = item-%tky`                 | Preserve the exact transactional identity, including draft context |
| `REPORTED`                         | Preserve messages returned by nested EML processing                |

`WITH VALUE #( ... )` is used because the update payload must be constructed:
it contains transactional identity plus a newly calculated value.

### 10.5 Why `ENTITIES OF` names the root

```abap
MODIFY ENTITIES OF ZI_SalesOrderRequest
  ENTITY SalesOrderItem
```

`ZI_SalesOrderRequest` identifies the business-object behavior contract.
`SalesOrderItem` identifies one entity alias inside that BO. This is correct
even though the operation changes an item rather than the root.

---

## 11. Validations

### 11.1 Purpose

A validation checks the BO state and rejects invalid instances during save
processing.

```abap
validation ValidateCustomer on save
  { create; field SoldToParty; }
```

Typical invariants:

- Customer or Product reference must exist;
- quantity must be positive;
- requested date must be permitted;
- submitted request must contain at least one valid item;
- status transition must not violate the lifecycle;
- item and root currencies must be consistent.

### 11.2 Determination versus validation

```text
Determination
  derives or changes BO state
  result: modified buffer and optional messages

Validation
  evaluates whether BO state is acceptable
  result: pass, or FAILED plus REPORTED messages
```

Do not use a determination merely to reject an invalid value. Do not use a
validation to calculate a field that must remain derived throughout editing.

### 11.3 Validation business flow

```text
1. Consumer requests save.
2. RAP invokes validations whose triggers apply.
3. Handler reads current BO state through local EML.
4. Handler obtains trusted reference data if required.
5. Each invalid instance is appended to FAILED.
6. A consumer-facing message is appended to REPORTED.
7. RAP rejects the affected save and retains or rolls back state according to
   the transaction/draft lifecycle.
```

### 11.4 Simplified Customer validation

```abap
METHOD ValidateCustomer.

  READ ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
    ENTITY SalesOrderRequest
      FIELDS ( SoldToParty )
      WITH CORRESPONDING #( keys )
    RESULT DATA(requests).

  LOOP AT requests INTO DATA(request).

    APPEND VALUE #(
      %tky        = request-%tky
      %state_area = 'VALIDATE_CUSTOMER' )
      TO reported-SalesOrderRequest.

    SELECT SINGLE FROM ZI_CustomerReference
      FIELDS CustomerID
      WHERE CustomerID = @request-SoldToParty
      INTO @DATA(customer_id).

    IF request-SoldToParty IS INITIAL OR customer_id IS INITIAL.

      APPEND VALUE #(
        %tky = request-%tky )
        TO failed-SalesOrderRequest.

      APPEND VALUE #(
        %tky                 = request-%tky
        %state_area          = 'VALIDATE_CUSTOMER'
        %msg                 = NEW zcm_salesorderrequest(
                                 severity   = if_abap_behv_message=>severity-error
                                 textid     = zcm_salesorderrequest=>customer_unknown
                                 customerid = request-SoldToParty )
        %element-SoldToParty = if_abap_behv=>mk-on )
        TO reported-SalesOrderRequest.

    ENDIF.
  ENDLOOP.

ENDMETHOD.
```

For many instances, collect distinct non-initial Customer IDs and issue one
set-oriented read instead of `SELECT SINGLE` inside the loop. The simplified
version exposes the control flow; the production version should avoid N+1
database access.

### 11.5 Meaning of response components

```text
failed-SalesOrderRequest
  marks the exact instances whose operation must fail

reported-SalesOrderRequest
  carries state messages and field markers for the consumer
```

Appending only a message to `REPORTED` does not necessarily reject an
operation. `FAILED` is the validation failure signal. For authorization
methods, returned authorization values decide whether the operation is allowed.

---

## 12. RAP Messages

### 12.1 Message class role

A behavior message class commonly:

- inherits from `CX_STATIC_CHECK`;
- implements `IF_ABAP_BEHV_MESSAGE`;
- implements T100 message interfaces;
- defines text IDs and placeholder attributes;
- receives severity and business values in its constructor.

Example construction:

```abap
%msg = NEW zcm_salesorderrequest(
  severity   = if_abap_behv_message=>severity-error
  textid     = zcm_salesorderrequest=>customer_unknown
  customerid = request-SoldToParty )
```

The message object converts a technical failure into a stable, localizable
business message.

### 12.2 `%tky`

`%tky` is the transactional key generated by the RAP type system. It identifies
the exact entity instance in the current transactional context. In a
draft-enabled BO, it also carries draft identity information such as
`%is_draft`.

Prefer `%tky` in behavior logic when matching and returning instances. A plain
business key may not distinguish active from draft state.

### 12.3 `%state_area`

`%state_area` groups a state message by validation or business concern:

```abap
%state_area = 'VALIDATE_CUSTOMER'
```

A message row with the same `%tky` and `%state_area` but no `%msg` clears older
state messages for that area before the current validation result is reported.

This prevents an old “Customer unknown” error from remaining after the user
corrects the Customer.

### 12.4 `%element`

```abap
%element-SoldToParty = if_abap_behv=>mk-on
```

The field marker connects the message to a specific element. Metadata-driven
consumers can highlight the field rather than displaying only a document-level
error.

### 12.5 `%msg`

`%msg` carries the RAP message object. It can be used for error, warning,
information, or success messages where the contract permits. It is not limited
to failed cases.

---

## 13. Actions

### 13.1 Purpose

An action is a named, non-standard modifying operation that expresses business
intent:

```abap
action ( features : instance ) Submit result [1] $self;
action ( features : instance ) Cancel result [1] $self;
```

Actions are preferable to exposing arbitrary status editing:

```text
Direct Status update
  consumer chooses any raw value

Submit action
  backend evaluates transition, changes status, derives dependent state,
  returns messages, and exposes a stable business command
```

### 13.2 Submit workflow

```text
1. Consumer invokes Submit for selected request keys.
2. RAP dispatches to the Submit handler.
3. Handler reads current buffered request and item state.
4. Handler checks action-specific preconditions.
5. Invalid instances are returned in FAILED with REPORTED messages.
6. Valid instances are updated through EML in local mode.
7. Handler rereads the changed instances.
8. Handler builds `result` using `%tky` and `%param`.
9. RAP later runs save validations and the save sequence.
```

### 13.3 Representative action implementation

```abap
METHOD Submit.

  MODIFY ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
    ENTITY SalesOrderRequest
      UPDATE FIELDS ( Status )
      WITH VALUE #(
        FOR key IN keys
        ( %tky   = key-%tky
          Status = zif_sor_status=>submitted ) )
    FAILED failed
    REPORTED reported.

  READ ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
    ENTITY SalesOrderRequest
      ALL FIELDS
      WITH CORRESPONDING #( keys )
    RESULT DATA(requests).

  result = VALUE #(
    FOR request IN requests
    ( %tky   = request-%tky
      %param = request ) ).

ENDMETHOD.
```

The first EML request changes buffered state. The read retrieves the resulting
representation. `%param` carries the action result declared as `$self`.

### 13.4 Why update uses `VALUE` and read uses `CORRESPONDING`

```abap
WITH VALUE #( FOR key IN keys
  ( %tky = key-%tky Status = ... ) )
```

The update payload contains a new value that does not already exist in `keys`,
so the method constructs rows explicitly.

```abap
WITH CORRESPONDING #( keys )
```

The read request only needs matching key components already present in `keys`,
so a name-based type conversion is sufficient.

The choice follows the required payload, not a special update-versus-read
syntax rule.

---

## 14. Prechecks and Save Validations

### 14.1 Precheck

A precheck evaluates a modify request before the requested change is accepted
into transactional state. It is useful when the incoming delta itself must be
rejected early.

Examples:

- prevent an update to an immutable external reference;
- reject a requested operation based on the before-image and incoming values;
- avoid accepting a change that must never enter the buffer.

### 14.2 Validation on save

An on-save validation evaluates the coherent BO state before persistence. It is
appropriate for invariants that depend on multiple fields or child instances.

Examples:

- submitted request must contain at least one valid item;
- begin date must not be after end date;
- aggregate total must match item state;
- Customer/Product references must be valid at save time.

### 14.3 Boundary

```text
Precheck
  incoming request + relevant current state
  rejects before accepting the modification

Validation on save
  resulting transactional BO state
  rejects before persistence
```

A precheck does not “pass data to a validation.” They are separate runtime
contracts. Use each at the phase where its evidence is available.

---

## 15. Feature Control

### 15.1 Purpose

Feature control determines whether fields, standard operations, associations,
actions, or functions are available. It can be global or instance-specific.

```abap
action ( features : instance ) Submit result [1] $self;
```

Representative implementation:

```abap
METHOD GetInstanceFeatures.

  READ ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
    ENTITY SalesOrderRequest
      FIELDS ( Status )
      WITH CORRESPONDING #( keys )
    RESULT DATA(requests).

  result = VALUE #(
    FOR request IN requests
    ( %tky = request-%tky
      %action-Submit = COND #(
        WHEN request-Status = zif_sor_status=>draft
        THEN if_abap_behv=>fc-o-enabled
        ELSE if_abap_behv=>fc-o-disabled ) ) ).

ENDMETHOD.
```

The consumer can disable or hide Submit for an already submitted request, and
the RAP runtime receives the operation permission state.

### 15.2 Feature control versus validation

Feature control improves affordance and prevents unavailable operations from
being offered. Validation remains necessary for save-time invariants and
race-resistant backend enforcement.

### 15.3 Feature control versus authorization

```text
Feature control
  Is Submit meaningful for this object state?

Authorization
  Is this user permitted to Submit?
```

An action can be enabled by status and still unauthorized for the current user.
Both conditions must pass.

---

## 16. EML Inside Behavior Implementations

### 16.1 Why EML is used

Behavior logic should work with the current BO transaction, including unsaved
changes. EML provides typed access to that state:

```abap
READ ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE ...
MODIFY ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE ...
```

Ordinary SQL primarily sees database persistence. It does not automatically
represent the latest RAP transactional buffer state.

### 16.2 `IN LOCAL MODE`

Inside the implementation of the same BO, `IN LOCAL MODE` enables internal BO
orchestration and bypasses selected external controls such as authorization,
feature control, and prechecks according to the EML contract.

It does not mean:

- a draft is created;
- changes are already committed;
- validations never run;
- the database is updated immediately;
- arbitrary data corruption is acceptable.

The implementation becomes responsible for preserving the invariant while
using this privileged internal path.

### 16.3 Do not issue commit in a behavior handler

Behavior code participates in the RAP transaction controlled by the consumer
and framework. Do not execute `COMMIT WORK` or `COMMIT ENTITIES` inside the
behavior pool to finalize only part of the operation.

An external EML consumer owns its transaction boundary:

```abap
MODIFY ENTITIES OF ZI_SalesOrderRequest
  ...
  FAILED DATA(failed)
  REPORTED DATA(reported).

IF failed IS INITIAL.
  COMMIT ENTITIES
    RESPONSE OF ZI_SalesOrderRequest
    FAILED DATA(commit_failed)
    REPORTED DATA(commit_reported).
ENDIF.
```

---

## 17. Typed RAP Responses

### 17.1 `MAPPED`

`MAPPED` associates preliminary identities or client correlation IDs with keys
assigned during create processing.

Typical use:

```text
Consumer sends %cid = 'REQ_1'
Managed early numbering assigns RequestUUID
MAPPED returns %cid ↔ RequestUUID
```

It is not a persistence field-name mapping.

### 17.2 `FAILED`

`FAILED` identifies entity instances for which an operation could not be
completed. Its cause may be validation, authorization, missing data,
conflict, or an implementation-specific failure.

### 17.3 `REPORTED`

`REPORTED` communicates messages associated with instances, state areas, or
elements. A reported row can explain a failure, clear a prior state message, or
provide non-error feedback.

### 17.4 Action `result`

An action result is separate from the generic response structures:

```abap
result = VALUE #(
  ( %tky = request-%tky
    %param = request ) ).
```

`%param` contains the result type declared by the action. With `result [1]
$self`, it contains the returned entity representation.

### 17.5 Response interpretation

```text
MAPPED
  Which generated key belongs to which create request?

FAILED
  Which instance did not complete the operation?

REPORTED
  What should the consumer be told about an instance or field?

result
  What business result did the action/function return?
```

---

## 18. Aggregate Business Logic

### 18.1 Sales Order Request invariants

A coherent custom request aggregate can use these rules:

```text
Request
  Customer must be valid before submission.
  Submitted request must contain at least one valid Item.
  TotalAmount equals the sum of Item.NetAmount.

Item
  Product must exist.
  RequestedQuantity must be positive.
  TransactionCurrency follows the Request currency.
  NetAmount is derived, not entered.
```

### 18.2 Single derivation path

Keep one authoritative path for each calculated value:

```text
RequestedQuantity or UnitPrice changes
             │
             ▼
derive Item.NetAmount
             │
             ▼
aggregate Request.TotalAmount
```

If UI code, action code, and determination code each calculate the amount,
their formulas will eventually diverge. The UI should display and refresh the
backend-derived result rather than become another source of truth.

### 18.3 Child deletion

Deletion requires special care because fields needed for aggregation may no
longer be readable after the child has been removed from the buffer. Design the
trigger and key flow so the parent identity is available before or as part of
the delete processing, then recompute the parent from the surviving buffered
children.

Avoid subtracting an assumed old amount without reliable before-image data.
Re-aggregation from current authoritative state is usually safer when the
aggregate size permits it.

### 18.4 UI refresh

A determination updates backend transactional state. A Fiori client does not
continuously reread every dependent field. Declare appropriate side effects or
return/reread affected data so `NetAmount` and `TotalAmount` refresh after their
inputs change.

Side effects control refresh behavior; they do not perform the calculation.

---

## 19. Runtime Flow by Operation

### 19.1 Managed create

```text
Consumer CREATE
  → projection allows create
  → RAP checks external contract
  → managed numbering assigns UUID
  → instance enters transactional buffer
  → on-modify determinations run
  → consumer receives interaction response and key mapping
  → save requested
  → on-save validations run
  → framework persists mapped fields
  → commit succeeds or save is rejected
```

### 19.2 Managed update

```text
Consumer UPDATE
  → entity and ETag identify current instance
  → authorization/feature/field controls apply
  → update enters buffer
  → determinations react to changed fields
  → save validations inspect final BO state
  → framework writes changed persistence state
```

### 19.3 Action

```text
Consumer invokes Submit
  → behavior projection exposes action
  → RAP checks action authorization and feature state
  → handler runs
  → handler reads/modifies through local EML
  → handler returns FAILED/REPORTED/result
  → save sequence validates and persists valid state
```

### 19.4 Validation failure

```text
Save requested
  → ValidateCustomer reads SoldToParty
  → target not found
  → %tky appended to FAILED
  → error object appended to REPORTED
  → field marker identifies SoldToParty
  → save of affected instance is rejected
  → consumer receives actionable business message
```

---

## 20. Technical Diagnostics

### 20.1 Create or Edit button is missing

Check in this order:

```text
Base BDEF operation declaration
  → Behavior Projection `use` declaration
  → CDS projection/service exposure
  → active OData metadata
  → authorization and feature-control result
  → UI metadata and client cache
```

Do not add another action before proving which contract layer omitted the
standard operation.

### 20.2 Determination does not run

Verify:

1. determination is declared on the correct entity;
2. operation or field trigger includes the actual changed input;
3. handler signature matches the generated contract;
4. behavior pool is assigned and active;
5. modification reaches this BO rather than a different projection/interface;
6. handler reads current state with the correct `%tky`;
7. nested EML does not produce ignored `REPORTED` messages;
8. consumer refresh behavior is not hiding a successful calculation.

### 20.3 Validation does not block save

Verify:

1. validation is `on save` with the correct triggers;
2. invalid entity `%tky` is appended to the correct `FAILED-<entity>` table;
3. validation reads buffered state rather than stale persistence;
4. reference query is not accidentally empty because of type conversion or
   access control;
5. the consumer actually requests save/activation;
6. only writing `REPORTED` was not mistaken for marking a failure.

### 20.4 Action changes status but returns old data

Check that the action:

1. updates through EML;
2. preserves failures from the update;
3. rereads after the modification;
4. fills `result-%tky` and `result-%param` from the reread state;
5. does not read the database before the buffer is saved.

### 20.5 Child creation fails

Check:

```text
Root composition exists
  → Base BDEF association permits create
  → Behavior projection uses association create
  → request uses create-by-association payload
  → parent transactional key is valid
  → child mapping and numbering are correct
```

Do not add standalone child `create` to bypass aggregate ownership.

### 20.6 Derived fields are editable

Check base BDEF `field ( readonly )`, dynamic field control if used, behavior
projection, active metadata, and client cache. A semantic CDS annotation does
not make a field read-only.

### 20.7 Duplicate or recursive determination execution

Inspect trigger fields and nested local EML. A determination that updates one
of its own trigger fields can retrigger itself. Make the operation idempotent,
update only when the derived value actually differs, and avoid hidden ordering
dependencies.

---

## 21. Implementation Review Checklist

### Behavior contract

- Implementation type matches ownership of CRUD and save mechanics.
- `strict ( 2 )` is used where supported.
- Each CDS node has one clear BDEF alias.
- Root owns create and child creation occurs by association.
- Persistent tables and mappings are complete and correctly oriented.
- Framework-generated and derived fields are read-only to consumers.
- Structural mandatory fields are declared without replacing semantic
  validation.
- Locks, ETags, and authorization dependencies follow aggregate ownership.

### Business logic

- Determinations derive state and are idempotent.
- Determination triggers cover every calculation input.
- Separate determinations do not depend on execution order.
- Validations append invalid instances to `FAILED`.
- `REPORTED` messages identify state area and field where useful.
- Actions express business intent rather than raw status editing.
- Feature control depends on object state; authorization depends on user
  permission.
- All invariants are enforced at the reusable BO layer.

### ABAP implementation

- Behavior methods use EML for current transactional BO state.
- Internal EML uses `IN LOCAL MODE` intentionally.
- `%tky` is preserved across reads, writes, results, and messages.
- Set-oriented reference reads replace database access inside large loops.
- Nested EML failures and messages are propagated.
- Handler attributes are not used as a persistent transaction buffer.
- No commit is issued inside the behavior pool.
- Pure domain calculations are separated from RAP orchestration where useful.

### Consumer contract

- Behavior projection exposes only intended operations.
- CDS field exposure and behavior editability are consistent.
- Side effects refresh fields affected by backend derivation.
- OData metadata is verified after activation and publication.
- API consumers receive stable action results and actionable messages.

---

## 22. Compact Behavior Map

```text
BASE BDEF

SalesOrderRequest
  create / update / delete
  association _Items { create }
  readonly RequestUUID, TotalAmount, timestamps
  mandatory:create SoldToParty
  determination DeriveAmounts
  validation ValidateCustomer
  action Submit
  feature + authorization hooks
          │
          ▼
BEHAVIOR POOL

Handler methods
  DeriveAmounts      read buffer → calculate → local EML update
  ValidateCustomer   read buffer → check reference → FAILED/REPORTED
  Submit             change status → reread → action result
  GetFeatures        inspect status → enabled/disabled
          │
          ▼
RAP TRANSACTION

interaction buffer
  → determinations
  → action/standard-operation responses
  → on-save validations
  → managed/unmanaged save processing
          │
          ▼
BEHAVIOR PROJECTION

use create / update / delete
use action Submit
use association _Items { create }
          │
          ▼
CONSUMER
```

The behavior layer should always be read as four separate decisions:

```text
BDEF declares capability.
Runtime supplies framework mechanics.
Behavior pool implements business-specific logic.
Behavior projection exposes selected capability.
```
