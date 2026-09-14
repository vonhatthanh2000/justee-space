---
title: SAP RAP Transactions, Draft, and Concurrency
part: RAP
summary: This document explains how RAP manages state from the first modification until database commit. It covers the interaction phase, transactional buffer, save sequence, draft persistence, draft actions, pessimistic locks, entity ETags, total ETags, early and late numbering, and transaction ownership.
category: Technical
tags:
  - sap
  - rap
publishedAt: 2026-09-10
---

# SAP RAP Transactions, Draft, and Concurrency — Technical Reference

This document explains how RAP manages state from the first modification until
database commit. It covers the interaction phase, transactional buffer, save
sequence, draft persistence, draft actions, pessimistic locks, entity ETags,
total ETags, early and late numbering, and transaction ownership.

The central runtime principle is:

> Every RAP modification first participates in a framework-controlled
> transaction. The transactional buffer holds the current logical BO state;
> the save sequence validates and persists that state. Draft adds a durable
> editing version, but it does not replace the transactional buffer or the save
> sequence used by each request.

Primary SAP sources:

- [SAP Help — RAP BO Runtime](https://help.sap.com/docs/abap-cloud/abap-rap/rap-bo-runtime)
- [SAP Help — Save Sequence Runtime](https://help.sap.com/docs/abap-cloud/abap-rap/save-sequence-runtime)
- [SAP Help — Draft Runtime](https://help.sap.com/docs/abap-cloud/abap-rap/draft-runtime)
- [SAP Help — Pessimistic Concurrency Control](https://help.sap.com/docs/abap-cloud/abap-rap/pessimistic-concurrency-control-locking)
- [SAP Help — Optimistic Concurrency Control](https://help.sap.com/docs/abap-cloud/abap-rap/optimistic-concurrency-control)
- [SAP Help — Total ETag](https://help.sap.com/docs/ABAP_PLATFORM_NEW/fc4c71aa50014fd1b43721701471913d/f5e8548c241b43ab82bceec030b5dc9a.html)
- [SAP Help — Numbering](https://help.sap.com/docs/abap-cloud/abap-rap/numbering)

---

## 1. RAP Transaction Model

### 1.1 Two runtime phases

```text
INTERACTION PHASE

Consumer request
  → authorization / feature / precheck controls
  → create, update, delete, or action
  → transactional buffer changes
  → on-modify determinations
  → interaction response

                         save requested
                               │
                               ▼

SAVE SEQUENCE

FINALIZE
  → CHECK_BEFORE_SAVE
  → point of no return
  → ADJUST_NUMBERS when late numbering is used
  → SAVE / managed persistence
  → database commit
  → CLEANUP
```

The interaction phase can contain multiple operations. Those operations build
one coherent logical transaction before persistence.

The save sequence begins only when the consumer or service runtime closes the
transaction with a save request.

### 1.2 RAP logical unit of work

A RAP LUW is the framework-controlled unit in which one or more business
objects participate in a transaction. Its boundary is not owned by an
individual behavior method.

```text
External EML consumer
  MODIFY ENTITIES ...
  MODIFY ENTITIES ...
  COMMIT ENTITIES

OData consumer
  sends transactional request/batch
  RAP service runtime owns save and commit orchestration

Behavior implementation
  participates in the current RAP LUW
  must not commit independently
```

This enables RAP to validate all participating BOs and either persist the
coherent result or reject the transaction.

---

## 2. Transactional Buffer

### 2.1 Purpose

The transactional buffer contains the current BO state during interaction. It
includes requested changes that have not yet reached active database
persistence.

```text
Database before request
  Status = Open
  TotalAmount = 100

Transactional buffer after local changes
  Status = Submitted
  TotalAmount = 130

Database until successful save
  Status = Open
  TotalAmount = 100
```

The buffer allows determinations, validations, actions, and several EML
operations to work on one coherent in-progress state.

### 2.2 Buffer is not a draft

```text
Transactional buffer
  temporary state inside the current RAP transaction
  required for draft and non-draft modifications
  discarded when its LUW ends or rolls back

Draft persistence
  durable editable state stored in draft tables
  survives stateless requests and interrupted UI sessions
  has a managed active/draft lifecycle

Active persistence
  committed business state stored in active tables
```

A draft request still has an interaction buffer. At the end of that request,
the save sequence persists the current editable state to the draft table.
Later activation uses another RAP transaction to transfer validated draft state
into active persistence.

### 2.3 Read the current state with EML

Behavior code normally uses local EML:

```abap
READ ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
  ENTITY SalesOrderRequest
    ALL FIELDS
    WITH CORRESPONDING #( keys )
  RESULT DATA(requests).
```

This reads the BO state known to RAP, including unsaved modifications in the
current transaction.

Ordinary SQL reads database persistence. It does not automatically merge the
RAP transactional buffer into the result.

### 2.4 Local mode is not a persistence mode

`IN LOCAL MODE` means the BO implementation accesses its own transactional
contract internally while bypassing selected external checks. It does not mean
“write locally to the database,” “create a draft,” or “commit immediately.”

---

## 3. Interaction Phase

### 3.1 Managed update flow

```text
1. Consumer sends entity key, changed fields, and ETag where required.
2. RAP resolves the projection operation to the base BO.
3. Authorization, feature control, field control, and prechecks apply.
4. RAP locks the relevant lock-master instance.
5. Requested values enter the transactional buffer.
6. Triggered determinations update derived buffered values.
7. FAILED and REPORTED responses are returned for interaction failures.
8. No active database commit has occurred yet.
```

### 3.2 Multiple modifications see one logical state

```abap
MODIFY ENTITIES OF ZI_SalesOrderRequest
  ENTITY SalesOrderRequest
    UPDATE FIELDS ( TransactionCurrency )
    WITH VALUE #( ( %tky = request_key
                    TransactionCurrency = 'USD' ) )
  ENTITY SalesOrderItem
    UPDATE FIELDS ( RequestedQuantity )
    WITH VALUE #( ( %tky = item_key
                    RequestedQuantity = 5 ) )
  FAILED DATA(failed)
  REPORTED DATA(reported).
```

Determinations and later validations should evaluate the resulting BO state,
not independently reread stale active values.

### 3.3 Interaction failure versus save failure

```text
Interaction failure
  operation cannot enter or complete in the buffer
  examples: authorization denied, invalid key, failed precheck

Save failure
  buffered state cannot be persisted coherently
  examples: on-save validation failed, ETag conflict, persistence error
```

Both can return typed RAP responses, but they occur at different points and
have different diagnostic evidence.

---

## 4. Save Sequence

### 4.1 Overall order

```text
Successful interaction modifications
                │
                ▼
FINALIZE
  last permitted buffered modifications
                │
                ▼
CHECK_BEFORE_SAVE
  consistency checks and managed validations
                │
       failure ─┴─ success
          │           │
          ▼           ▼
cleanup/failure   POINT OF NO RETURN
response                │
                        ▼
                 ADJUST_NUMBERS
                   if required
                        │
                        ▼
                 SAVE / SAVE_MODIFIED
                        │
                        ▼
                 database commit
                        │
                        ▼
                     CLEANUP
```

The exact framework callbacks depend on managed, unmanaged, draft, additional
save, and release-specific features. The conceptual boundaries remain stable.

### 4.2 `FINALIZE`

`FINALIZE` is the first save-sequence step and the last point where BO data can
be modified in the transactional buffer.

Managed BOs perform final derivation through applicable determinations. An
unmanaged saver can implement a `FINALIZE` callback.

After `FINALIZE`, modifying EML is not permitted in later saver methods.

Appropriate use:

- final calculations requiring all transactionally involved BO state;
- resolving values that can only be finalized when save begins;
- cross-BO finalization designed within RAP save rules.

Do not defer ordinary interactive derivations to `FINALIZE` if the consumer
needs to see them while editing.

### 4.3 `CHECK_BEFORE_SAVE`

This step establishes whether the complete transaction can be saved.

In managed BOs, on-save validations provide the consistency checks. In
unmanaged scenarios, the saver implementation supplies the corresponding
check.

```text
Check succeeds for every involved BO
  → point of no return

Any involved BO returns failed instances
  → save sequence is rejected before persistence
```

No recoverable business validation should be postponed beyond this boundary.

### 4.4 Point of no return

After all pre-save checks succeed, RAP reaches the point of no return. From
this boundary onward, providers must guarantee successful completion of the
save sequence.

Do not place predictable business rejection logic after this point. Failures
there represent technical or contract defects rather than normal user
correction flow.

### 4.5 `ADJUST_NUMBERS`

This phase assigns final keys when late numbering is used and maps preliminary
identities to final keys.

It occurs after the point of no return so gap-sensitive numbers are consumed
only for a transaction already accepted for saving.

### 4.6 `SAVE` and managed persistence

The save step persists buffered BO state:

- managed RAP writes mapped entity state to persistent tables;
- unmanaged RAP invokes provider save implementation;
- managed additional save invokes the relevant additional-save contract;
- multiple involved BOs must obey RAP save-order and consistency rules.

The provider must not execute an independent database commit inside the saver.
The RAP transaction manager owns the commit.

### 4.7 `CLEANUP`

Cleanup removes provider-specific transactional buffer state and releases
resources after save completion or rollback processing as defined by the
implementation contract.

`CLEANUP_FINALIZE` is available for cleanup when `FINALIZE` or
`CHECK_BEFORE_SAVE` fails, particularly where cross-BO finalization created
provider-side state that must be revoked.

---

## 5. Transaction Ownership and Commit

### 5.1 External EML consumer

```abap
MODIFY ENTITIES OF ZI_SalesOrderRequest
  ENTITY SalesOrderRequest
    CREATE FIELDS ( SoldToParty TransactionCurrency )
    WITH VALUE #(
      ( %cid                = 'REQUEST_1'
        SoldToParty         = '100000'
        TransactionCurrency = 'USD' ) )
  MAPPED DATA(mapped)
  FAILED DATA(failed)
  REPORTED DATA(reported).

IF failed IS INITIAL.
  COMMIT ENTITIES
    RESPONSE OF ZI_SalesOrderRequest
    FAILED DATA(commit_failed)
    REPORTED DATA(commit_reported).
ELSE.
  ROLLBACK ENTITIES.
ENDIF.
```

`MODIFY ENTITIES` changes RAP transactional state. `COMMIT ENTITIES` requests
the save sequence and transaction completion.

### 5.2 Behavior implementation

Inside a behavior handler:

```abap
MODIFY ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
  ...
```

The handler participates in the current consumer-owned transaction. It must
not call:

```abap
COMMIT WORK.
COMMIT ENTITIES.
ROLLBACK WORK.
```

Independent commit would split the atomic business transaction and can leave
one part durable when another part fails.

### 5.3 OData service consumer

The service runtime maps OData modification requests and change sets to RAP
interaction and save handling. The Fiori application does not directly commit
database tables.

```text
Fiori Save / OData change set
  → RAP interaction
  → RAP save sequence
  → ABAP database transaction commit
  → OData response
```

---

## 6. Draft Architecture

### 6.1 Why draft exists

REST communication is stateless across requests. A user can edit an object over
many interactions, navigate away, lose a frontend session, or resume from
another device. A purely in-memory transaction cannot safely span that period.

Draft provides a durable editing version:

```text
Active tables
  official committed business state

Draft tables
  persisted unfinished editing state plus draft administration

RAP draft runtime
  controls transitions, identity, ownership, locks, ETags, and activation
```

### 6.2 Draft table per BO entity

Each draft-enabled entity in the composition tree normally has corresponding
draft persistence because each node can contain editable state.

```text
zsor_request       ↔  zsor_request_d
zsor_item          ↔  zsor_item_d
```

Draft tables contain business fields, entity keys, and RAP draft
administration fields, commonly through the standard draft administration
include.

Representative structure:

```abap
define table zsor_request_d {
  key client               : abap.clnt not null;
  key request_uuid         : sysuuid_x16 not null;
      request_number       : abap.char(10);
      sold_to_party        : abap.char(10);
      status               : abap.char(1);
      total_amount         : abap.curr(15,2);
      transaction_currency : abap.cuky;
      local_last_changed_at: abp_locinst_lastchange_tstmpl;
      "%admin"             : include sych_bdl_draft_admin_inc;
}
```

Use the ADT quick fix/generator for a draft table instead of hand-maintaining a
structure that can drift from the active entity.

### 6.3 Do not access draft tables directly

Application code should not use direct SQL as the business interface to draft
tables. Direct access bypasses:

- active/draft identity;
- draft ownership and administration;
- lock and total-ETag checks;
- draft action lifecycle;
- behavior validations and determinations;
- composition consistency;
- framework evolution of draft persistence.

Use EML or OData against the draft-enabled BO contract.

---

## 7. Draft-Enabled Behavior Definition

### 7.1 Base BDEF

```abap
managed implementation in class zbp_i_salesorderrequest unique;
strict ( 2 );
with draft;

define behavior for ZI_SalesOrderRequest alias SalesOrderRequest
  persistent table zsor_request
  draft table zsor_request_d
  lock master
  total etag LastChangedAt
  authorization master ( instance )
  etag master LocalLastChangedAt
{
  create;
  update;
  delete;

  association _Items { create; with draft; }

  draft action Resume;
  draft action Edit;
  draft action Activate optimized;
  draft action Discard;

  draft determine action Prepare
  {
    validation ValidateCustomer;
    validation ValidateSubmittedRequest;
    validation SalesOrderItem~ValidateProduct;
    validation SalesOrderItem~ValidateQuantity;
  }

  field ( numbering : managed, readonly ) RequestUUID;
  field ( readonly ) LastChangedAt,
                     LocalLastChangedAt;
}

define behavior for ZI_SalesOrderItem alias SalesOrderItem
  persistent table zsor_item
  draft table zsor_item_d
  lock dependent by _Request
  authorization dependent by _Request
  etag master LocalLastChangedAt
{
  update;
  delete;

  association _Request { with draft; }
  association _Product;

  field ( numbering : managed, readonly ) ItemUUID;
  field ( readonly ) RequestUUID,
                     LocalLastChangedAt;
}
```

Important distinctions:

- `with draft` enables draft behavior for the BO;
- `draft table` declares node-specific draft persistence;
- `total etag` belongs to the lock-master/root entity;
- each composition path is explicitly marked `with draft` under strict mode;
- `Prepare` lists checks to execute for draft preparation/activation;
- ordinary reference associations such as `_Product` do not become owned draft
  nodes.

### 7.2 Behavior projection

```abap
projection;
strict ( 2 );

define behavior for ZC_SalesOrderRequest alias SalesOrderRequest
  use etag
{
  use create;
  use update;
  use delete;
  use association _Items { create; with draft; }

  use action Resume;
  use action Edit;
  use action Activate;
  use action Discard;
  use action Prepare;
}

define behavior for ZC_SalesOrderItem alias SalesOrderItem
  use etag
{
  use update;
  use delete;
  use association _Request { with draft; }
  use association _Product;
}
```

The consumer receives draft capabilities only when the base BO and projection
contracts expose them correctly.

---

## 8. Active, New-Draft, and Edit-Draft State

### 8.1 Active instance

```text
Active table row exists
Draft table row may or may not exist
Represents current official business state
```

### 8.2 New draft

```text
Draft table row exists
No corresponding active row exists
Represents a new object not yet activated
```

If the new draft is discarded, no active instance remains because one never
existed.

### 8.3 Edit draft

```text
Active row exists
Draft row exists in parallel
Draft began as a copy of active state
Further edits affect draft state
Active remains unchanged until activation
```

The active and edit-draft instances share business identity but differ by the
draft indicator and lifecycle metadata.

### 8.4 `%is_draft`

RAP typed keys include draft identity:

```abap
%tky
  business/entity key components
  %is_draft
```

In OData, the corresponding technical distinction is represented through
`IsActiveEntity`.

Preserving `%tky` in EML reads, updates, messages, and results prevents behavior
logic from accidentally reading the active version while processing a draft.

---

## 9. Draft Actions

### 9.1 `Edit`

Purpose:

```text
Active instance
  → lock active aggregate
  → copy active aggregate state to draft persistence
  → return editable draft identity
```

The active instance remains. Edits are applied to the draft version.

`Edit` is not a generic field update and does not activate code in the ABAP
repository.

### 9.2 `Prepare`

Purpose:

```text
Current draft state
  → run listed determinations and validations
  → return state messages and failures
  → keep result as draft
```

`Prepare` checks readiness for activation. It does not by itself transfer the
draft to active persistence.

The `draft determine action Prepare` explicitly lists the determinations and
validations that should be executed. Activation can execute Prepare processing
as part of its lifecycle.

### 9.3 `Activate`

Purpose:

```text
Draft state
  → prepare/check as required
  → verify concurrency against active state
  → run active save sequence
  → create or update active persistence
  → delete draft state after success
```

For a new draft, activation creates the first active instance. For an edit
draft, activation updates the corresponding active instance.

If activation fails validation, the draft remains available for correction;
invalid data does not become active.

### 9.4 `Discard`

Purpose:

```text
Edit draft
  delete draft version
  keep existing active version unchanged

New draft
  delete draft version
  no active version exists
```

Discard is destructive for the unfinished draft state. It does not create a
recoverable “discarded version” that `Resume` can restore.

### 9.5 `Resume`

Purpose:

```text
Existing draft survives after exclusive lock expires
  → reacquire lock on corresponding active aggregate
  → compare remembered total ETag with current active total ETag
  → continue editing if active state is still compatible
```

Resume continues an existing draft. It does not restore a discarded or deleted
draft.

---

## 10. Draft Composition Consistency

### 10.1 `with draft`

```abap
association _Items { create; with draft; }
association _Request { with draft; }
```

Draft-enabled BO-internal navigation keeps all nodes in the same active/draft
context:

```text
Navigate from active Request
  → active Items

Navigate from draft Request
  → draft Items

Create Item through draft Request
  → draft Item
```

Without consistent draft navigation, a user could edit a draft root while
accidentally reading or creating active children, breaking aggregate
consistency.

### 10.2 Independent reference associations

Customer and Product reference entities usually remain active reference data:

```text
Draft Request ─association→ active Customer reference
Draft Item    ─association→ active Product reference
```

They are not draft-owned merely because the draft transaction refers to them.

---

## 11. Pessimistic Concurrency: Locks

### 11.1 Purpose

Pessimistic concurrency prevents simultaneous modification by acquiring an
exclusive enqueue lock before modifying an existing instance.

```text
User A requests modification
  → lock acquired

User B requests conflicting modification
  → lock collision
  → request rejected while A owns lock
```

Locks prevent concurrent editing. They do not prove that a client is modifying
the exact version it previously read; that is the ETag responsibility.

### 11.2 Lock master and dependent

```abap
define behavior for ZI_SalesOrderRequest
  lock master

define behavior for ZI_SalesOrderItem
  lock dependent by _Request
```

The root is the aggregate lock master. Modifying an Item resolves its parent
Request and locks the relevant aggregate, so related root and child changes are
protected together.

```text
Request A + its Items  → one lock-master scope
Request B + its Items  → separate lock-master scope
```

### 11.3 Managed and unmanaged lock handling

Managed RAP can implement standard lock behavior from the BDEF declaration.
Unmanaged RAP requires provider implementation, normally using the SAP enqueue
lock concept and returning lock failures through RAP responses.

### 11.4 Lock limitations

A lock:

- does not validate a business rule;
- does not replace a database uniqueness constraint;
- does not automatically prevent two creates with the same externally supplied
  key before an existing instance is available to lock;
- does not replace an ETag check;
- does not make a long-running database transaction acceptable.

---

## 12. Optimistic Concurrency: Entity ETags

### 12.1 Purpose

An entity ETag represents a version of entity state known to the OData
consumer.

```text
Client reads entity with ETag V1
              │
Other client changes entity → current ETag V2
              │
First client sends update with V1
              │
RAP compares V1 with V2 → mismatch → reject
```

This prevents lost updates based on stale client state.

### 12.2 BDEF declaration

```abap
etag master LocalLastChangedAt
```

or, for a dependent entity:

```abap
etag dependent by _Request
```

An ETag master owns its ETag field. An ETag-dependent entity uses the ETag of a
reachable master according to the declared association.

### 12.3 Reliable ETag update

The field must change reliably whenever the protected entity state changes.
Managed RAP can maintain correctly annotated administrative timestamps.
Unmanaged providers must implement reliable updates themselves.

```abap
@Semantics.systemDateTime.localInstanceLastChangedAt: true
Request.local_last_changed_at as LocalLastChangedAt
```

Declaring `etag master` without reliably changing the value creates false
concurrency safety.

### 12.4 Lock versus ETag

```text
Lock
  prevents a conflicting writer during the current lock lifetime

ETag
  rejects a write based on a stale previously read version
```

RAP transactional services use both forms because they address different race
conditions.

---

## 13. Total ETag

### 13.1 Purpose

The total ETag is a root-level version of the complete active business object
used by draft concurrency transitions.

```abap
lock master
total etag LastChangedAt
```

It protects an edit draft from silently overwriting active changes made after
the draft's exclusive lock expired.

### 13.2 Aggregate scope

```text
Request root changes
  → total ETag changes

Relevant Item child changes
  → total ETag changes

Resume/Activate edit draft
  → remembered total ETag compared with current active total ETag
```

The total ETag is not a receipt proving that “the previous change applied
successfully.” It is active aggregate version evidence used for optimistic
concurrency.

### 13.3 Entity ETag versus total ETag

| Control     | Scope                                  | Main use                                                 |
| ----------- | -------------------------------------- | -------------------------------------------------------- |
| Entity ETag | One entity or declared ETag dependency | Protect an OData modification against stale entity state |
| Total ETag  | Complete active draft-enabled BO       | Protect active/draft transitions after lock expiry       |

Draft table administration also maintains draft-specific last-change evidence
to prevent stale edits of the same draft from different clients.

### 13.4 Root field annotation

A managed total-ETag timestamp is commonly annotated:

```abap
@Semantics.systemDateTime.lastChangedAt: true
Request.last_changed_at as LastChangedAt
```

It must also be present in persistence mapping when CDS and table field names
differ. The total ETag can remain an internal field and does not always need to
be exposed in the service projection.

---

## 14. Draft Lock Lifecycle

### 14.1 Exclusive phase

When an edit draft is created, RAP locks the corresponding active aggregate.
For the exclusive lock period, another user cannot modify that active instance.

```text
Edit action
  → create draft
  → exclusive lock on active aggregate
  → draft owner edits
```

### 14.2 Optimistic phase

The exclusive lock cannot remain forever across stateless interaction. After
its configured lifetime expires, the draft can still persist while the active
instance becomes available under optimistic control.

```text
Draft still exists
Exclusive lock expired
Total ETag remembers active version at draft boundary
```

### 14.3 Resume conflict

```text
Draft remembered total ETag = V1
Current active total ETag    = V2

Resume attempts lock + comparison
  V1 ≠ V2
  → conflict
  → stale draft cannot continue as if active were unchanged
```

The application should return a clear concurrency message and guide the user
toward reviewing current active data rather than hiding the conflict.

---

## 15. Numbering

### 15.1 Identity timing

```text
Early numbering
  key assigned during create interaction
  new instance is addressable before save

Late numbering
  final key assigned after point of no return
  useful when final business number should be consumed only for accepted save
```

Key timing is independent from whether a field is called an “order number.” A
BO can use a technical UUID early and assign a human-readable business number
late.

### 15.2 Managed internal early numbering

```abap
field ( numbering : managed, readonly ) RequestUUID;
```

Managed early numbering:

- is available for managed BO UUID keys with ABAP type `RAW(16)`;
- assigns the UUID during `CREATE`;
- lets the draft and child instances reference the root immediately;
- returns generated identity through RAP key mapping;
- requires no custom numbering handler.

Draft does not universally require every key to use this exact strategy, but a
stable early technical key is especially practical for draft composition
navigation.

### 15.3 Unmanaged early numbering

```abap
define behavior for ZI_SalesOrderRequest
  early numbering
```

The behavior pool implements a `FOR NUMBERING` method invoked during create or
create-by-association. The provider must guarantee uniqueness under concurrent
requests and return assigned keys in `MAPPED`.

For sequential business numbers, use a proper number-range or equivalent
released concurrency-safe mechanism. “Read MAX and add one” is not safe under
parallel creation without additional synchronization.

### 15.4 Late numbering

Late numbering assigns final key values in `ADJUST_NUMBERS` after the point of
no return.

Appropriate uses can include legally or operationally controlled document
numbers where gaps must be minimized according to the actual requirement.

Trade-offs:

- earlier interaction must use preliminary identity;
- parent/child key relationships must be remapped correctly;
- `MAPPED` results become central;
- provider must guarantee save success after consuming final numbers;
- error handling becomes more constrained after the point of no return.

### 15.5 Technical UUID plus business number

```text
RequestUUID
  technical immutable key
  managed early numbering
  used for composition and transactional identity

RequestNumber
  human-facing business identifier
  can be assigned by controlled application logic at the required phase
```

Separating the two reduces the pressure to use a mutable or late-assigned
business identifier as the relational key of the entire aggregate.

---

## 16. `MAPPED`, `%cid`, and Transactional Identity

### 16.1 Create correlation

```abap
WITH VALUE #(
  ( %cid                = 'REQUEST_1'
    SoldToParty         = '100000'
    TransactionCurrency = 'USD' ) )
MAPPED DATA(mapped)
```

The consumer supplies `%cid` as a request-local correlation identifier. RAP
returns the assigned key in `mapped-SalesOrderRequest`.

### 16.2 Child correlation

Deep or create-by-association requests use correlation IDs to connect newly
created instances before final keys are known. Preserve the exact generated
types rather than manually constructing partial key structures.

### 16.3 `%tky`

`%tky` identifies an existing or newly addressed entity in its current
transactional context. In a draft BO it includes the draft indicator.

```text
Business key alone
  RequestUUID

Transactional identity
  RequestUUID + draft/active context + framework key components
```

Use `%tky` across local reads, modifications, validation failures, messages,
and action results.

---

## 17. Managed, Unmanaged, and Additional Save

### 17.1 Managed save

The framework owns ordinary persistence based on:

- persistent and draft tables;
- CDS fields and BDEF mappings;
- managed administrative fields;
- validations and determinations;
- lock, ETag, and numbering declarations.

Application code should not duplicate standard table inserts or updates.

### 17.2 Unmanaged saver

An unmanaged provider implements save-sequence methods appropriate to its
contract, commonly including:

```abap
CLASS lsc_SalesOrderRequest DEFINITION
  INHERITING FROM cl_abap_behavior_saver.
  PROTECTED SECTION.
    METHODS finalize          REDEFINITION.
    METHODS check_before_save REDEFINITION.
    METHODS adjust_numbers    REDEFINITION.
    METHODS save              REDEFINITION.
    METHODS cleanup           REDEFINITION.
    METHODS cleanup_finalize  REDEFINITION.
ENDCLASS.
```

Implement only callbacks required by the design. Later saver phases cannot use
modifying EML to reopen interaction processing.

### 17.3 Additional save

Additional save supplements managed persistence with an allowed secondary save
effect. Suitable designs are durable and idempotent, such as an audit record or
transactional outbox entry tied to the same commit.

Unsafe design:

```text
SAVE calls remote HTTP service
  remote system commits
  local database later fails
  systems disagree
```

Prefer a durable local outbox/event record in the RAP transaction, followed by
asynchronous delivery with retry and idempotency.

### 17.4 Point-of-no-return discipline

After the point of no return:

- no normal user-correctable validation should fail;
- final numbering must be concurrency-safe;
- persistence must be guaranteed by the provider contract;
- external side effects must not create an uncoordinated partial commit;
- cleanup must release provider resources reliably.

---

## 18. Failure and Recovery Flows

### 18.1 Validation failure during activation

```text
Draft contains invalid Product
  → user invokes Prepare or Activate
  → ValidateProduct appends Item %tky to FAILED
  → REPORTED carries field message
  → activation rejected
  → active data remains unchanged
  → draft remains available for correction
```

### 18.2 Entity ETag conflict

```text
Client sends stale ETag
  → RAP compares current entity version
  → mismatch
  → modification rejected before overwriting newer state
  → client must reread and reconcile
```

### 18.3 Total ETag conflict on resume

```text
Draft lock expired
Active aggregate changed elsewhere
  → Resume reacquires lock
  → total ETag mismatch
  → stale draft cannot resume normally
  → user reviews current active version
```

### 18.4 Technical failure after point of no return

This indicates that the provider could not honor the save guarantee. Diagnose:

- unmanaged save implementation;
- key collision or unsafe numbering;
- direct database constraint violation;
- forbidden remote side effect;
- incorrect persistence mapping;
- save-order dependency between BOs;
- uncaught exception or runtime error.

Do not convert such defects into a generic validation message without fixing
the violated save contract.

### 18.5 Discard flow

```text
User discards edit draft
  → draft rows and administration removed
  → active row remains unchanged
  → draft editing state cannot be resumed
```

---

## 19. End-to-End Sales Order Request Traces

### 19.1 Create a new draft request

```text
1. UI sends CREATE for draft root.
2. Managed early numbering assigns RequestUUID.
3. Initial values enter transactional buffer.
4. Determinations set defaults.
5. Save sequence persists state to zsor_request_d.
6. Active zsor_request has no corresponding row yet.
7. UI can return later using draft identity.
```

### 19.2 Add a draft item

```text
1. UI creates by association through draft Request._Items.
2. ItemUUID is assigned early.
3. Parent RequestUUID and draft context are preserved.
4. Product/quantity enter buffer.
5. Determinations derive currency, price, and NetAmount.
6. Root TotalAmount is recomputed.
7. Save sequence persists Item and Request draft state.
8. No active Item is created yet.
```

### 19.3 Activate the new request

```text
1. UI invokes Prepare/Activate.
2. Listed validations inspect complete draft aggregate.
3. Customer and Products are valid; quantity is positive.
4. Final determinations produce coherent totals.
5. Concurrency and save checks succeed.
6. Managed save creates active Request and Items.
7. Draft rows are removed.
8. Active aggregate becomes the official state.
```

### 19.4 Edit an active request

```text
1. UI reads active Request and its ETag.
2. Edit verifies version and creates edit draft.
3. Active aggregate is exclusively locked.
4. Active Request and owned Items are represented in draft context.
5. User changes quantity; derivations update draft totals.
6. Active values remain unchanged during editing.
7. Activate validates and replaces active state atomically.
8. Draft is deleted after success.
```

---

## 20. Technical Diagnostics

### 20.1 Draft button or edit flow is absent

Check:

```text
Base BDEF `with draft`
  → draft tables for every owned entity
  → total ETag on root
  → draft actions declared
  → BO-internal associations `with draft`
  → behavior projection uses draft actions
  → service binding and current metadata
  → Fiori draft support
```

### 20.2 Draft changes appear in active data too early

Check whether:

- application code writes active tables directly;
- an unmanaged save maps draft requests to the wrong persistence;
- `%is_draft` was lost when reconstructing keys;
- a helper uses SQL rather than current BO context;
- navigation reaches active rather than draft child instances;
- a custom action intentionally modifies active data.

### 20.3 Draft navigation returns no Items

Check:

1. root composition and child parent association;
2. `with draft` on BO-internal relationships;
3. CDS projection redirection;
4. child draft table and key mapping;
5. `%is_draft` in EML keys;
6. service metadata and expansion path.

### 20.4 Activation fails with no useful message

Check:

- validations append exact `%tky` to `FAILED`;
- `REPORTED` contains a message object and field marker;
- validation is listed in `Prepare` when early feedback is expected;
- nested EML `REPORTED` data is propagated;
- late save failure is not being mislabeled as validation;
- service/client logs contain the full RAP response.

### 20.5 Lock conflict

Capture:

- root business key and child key if applicable;
- user/session owning the lock;
- lock-master resolution path;
- draft owner and draft age;
- enqueue table evidence;
- exact requested operation;
- whether the lock is exclusive or the draft is in optimistic phase.

Do not disable locking to make the symptom disappear.

### 20.6 ETag conflict

Capture:

```text
ETag read by client
ETag sent in modification
current ETag in active/draft entity
operation timestamp and competing change
entity ETag declaration and update annotation
```

An ETag conflict is normally evidence that concurrency protection worked. The
consumer should reread and reconcile rather than retry the stale update blindly.

### 20.7 Total ETag does not change after child update

Check:

- root total-ETag field annotation;
- persistence mapping;
- managed administrative update behavior;
- child is inside the same composition tree;
- unmanaged provider updates aggregate version correctly;
- update actually passed through RAP rather than direct SQL;
- the field read is active total ETag rather than local entity timestamp.

### 20.8 Number collision

Check:

- early versus late numbering declaration;
- managed UUID field type is `RAW(16)`;
- custom `FOR NUMBERING` returns every required key in `MAPPED`;
- number-range locking/concurrency;
- preliminary-to-final parent/child remapping;
- database uniqueness evidence;
- unsafe `MAX + 1` logic.

---

## 21. Transaction and Draft Review Checklist

### Transaction model

- Behavior code reads current state through EML where buffered data matters.
- Interaction and save failures are diagnosed separately.
- No handler or saver commits independently.
- Predictable validation completes before the point of no return.
- `FINALIZE` is the last phase that modifies buffered BO state.
- Save implementation can guarantee success after pre-save checks.
- Cross-BO save order and atomicity are explicit.

### Draft model

- Draft is required by the user workflow, not enabled automatically everywhere.
- Every draft-owned entity has correct generated draft persistence.
- Application logic never treats draft tables as public SQL interfaces.
- Active/draft identity is preserved through `%tky` and `%is_draft`.
- Composition navigation stays within active or draft context.
- `Prepare` lists the checks needed before activation.
- `Discard` and `Resume` semantics are correctly represented to users.

### Concurrency

- Root and dependent locks match aggregate ownership.
- Entity ETags change reliably for every protected modification.
- Draft root has a total ETag covering the aggregate.
- Lock conflicts and ETag conflicts produce distinct diagnostics.
- Consumers reread on stale-version conflicts rather than force overwrite.

### Numbering

- Technical identity and business document number are separated where useful.
- Managed UUID numbering uses the required type and read-only contract.
- Custom numbering is concurrency-safe.
- Late numbering occurs only after all normal rejection checks.
- `MAPPED` preserves correlation and parent/child identity.

---

## 22. Compact Runtime Map

```text
NON-DRAFT MODIFY

Client reads V1
  → sends modification + ETag V1
  → RAP lock + ETag check
  → interaction buffer
  → determinations
  → save request
  → FINALIZE
  → CHECK_BEFORE_SAVE
  → point of no return
  → numbering/save
  → active database V2
  → cleanup


DRAFT EDIT

Active V1
  → Edit
  → active lock + draft copy
  → repeated draft modifications
  → each request saves durable draft state
  → Prepare validates draft
  → Activate compares concurrency state
  → active save sequence
  → Active V2
  → draft removed


CONCURRENCY

Lock       prevents simultaneous modification during lock lifetime
Entity ETag rejects a write based on stale entity state
Total ETag rejects stale active/draft transition for the aggregate


STATE

Transactional buffer  temporary current RAP LUW state
Draft persistence      durable unfinished editing state
Active persistence     durable official business state
```

The transaction layer should always be understood through four boundaries:

```text
Buffer is not persistence.
Draft is not the transactional buffer.
Prepare is not activation.
Reported information is not automatically a rejected operation.
```
