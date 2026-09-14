---
title: SAP RAP Architecture and End-to-End Runtime
part: ABAP
summary: This document explains the architecture and runtime of the ABAP RESTful Application Programming Model (RAP). It traces metadata, read, and transactional requests through CDS, behavior, service exposure, the RAP transactional buffer, the save sequence, and database persistence.
category: Technical
tags:
  - sap
  - rap
publishedAt: 2026-08-30
---

# SAP RAP Architecture and End-to-End Runtime — Technical Reference

This document explains the architecture and runtime of the ABAP RESTful
Application Programming Model (RAP). It traces metadata, read, and
transactional requests through CDS, behavior, service exposure, the RAP
transactional buffer, the save sequence, and database persistence.

The central technical principle is:

> CDS defines the semantic data model, the behavior definition declares the
> transactional contract, the behavior pool implements application-specific
> behavior, and the service layer exposes a consumer-specific projection. The
> RAP runtime coordinates these artifacts as one business-object contract.

This reference focuses on architectural responsibility and runtime flow.
Detailed CDS modeling, EML syntax, draft, authorization, business-rule
implementation, UI annotations, and testing are developed in the remaining
documents of the RAP technical-reference set.

Primary SAP sources:

- [SAP Help — ABAP RESTful Application Programming Model](https://help.sap.com/docs/abap-cloud/abap-rap/abap-restful-application-programming-model)
- [SAP Learning — Exploring the Concept and Architecture of RAP](https://learning.sap.com/courses/building-transactional-apps-with-the-abap-restful-application-programming-model/exploring-the-concept-and-architecture-of-rap)
- [SAP Help — RAP BO Runtime](https://help.sap.com/docs/abap-cloud/abap-rap/rap-bo-runtime)
- [SAP Help — RAP Business Object Contract](https://help.sap.com/docs/abap-cloud/abap-rap/rap-business-object-contract)
- [SAP Help — Entity Manipulation Language](https://help.sap.com/docs/abap-cloud/abap-rap/entity-manipulation-language-eml)
- [SAP Help — Business Service](https://help.sap.com/docs/abap-cloud/abap-rap/business-service)
- [SAP Help — Service Definition](https://help.sap.com/docs/abap-cloud/abap-rap/service-definition)
- [SAP Help — OData V4 Service Binding Editor](https://help.sap.com/docs/abap-cloud/abap-development-tools-user-guide/using-service-binding-editor-for-odata-v4-service)

---

## 1. RAP in One Architectural View

### 1.1 Design-time stack

```text
Consumer
  Fiori elements / external API client / ABAP EML consumer
                              │
                              ▼
Business service exposure
  Service Binding + Service Definition
                              │
                              ▼
Consumer projection
  CDS Projection + Behavior Projection + Metadata Extension
                              │
                              ▼
RAP Business Object
  CDS root/composition model + Base Behavior Definition
                              │
                              ▼
Behavior implementation
  Behavior Pool: handlers and saver where implementation is required
                              │
                              ▼
Persistence and external capabilities
  Database tables / released APIs / legacy implementation
```

The stack is not a sequence of duplicate models. Each layer makes a different
decision:

| Layer              | Primary decision                                             |
| ------------------ | ------------------------------------------------------------ |
| Persistence        | Where durable state is stored                                |
| CDS data model     | What the business data means and how entities relate         |
| Base behavior      | Which operations and transactional rules the BO supports     |
| Behavior pool      | How application-specific operations and rules execute        |
| Projection         | Which data and behavior one consumer may use                 |
| Service definition | Which CDS entities form one business service                 |
| Service binding    | Which protocol and service category expose that service      |
| Metadata extension | How a metadata-driven UI presents the service                |
| Consumer           | Which operations are requested and how results are displayed |

### 1.2 Runtime services supplied by RAP

Depending on the implementation type and declared features, RAP can coordinate:

- query processing and OData query options;
- typed standard and custom operations;
- transactional buffering;
- optimistic and pessimistic concurrency;
- authorization and feature control;
- draft lifecycle;
- determinations, validations, actions, and prechecks;
- message propagation;
- save-sequence orchestration;
- OData exposure and metadata generation.

RAP is therefore not only an OData generator. It is a business-object runtime
and programming model whose operations can also be consumed locally through
EML without HTTP.

### 1.3 Provider and consumer sides

```text
BO provider
  defines CDS + behavior + implementation
  guarantees the business-object contract

BO consumer
  invokes exposed operations through OData or EML
  depends on the projected or released contract
```

An OData client is one possible consumer. A behavior implementation can also
consume its own BO through local EML, and one ABAP component can consume a
released BO interface through EML.

---

## 2. RAP Business Object

### 2.1 Aggregate structure

A RAP Business Object is an entity tree with one root and optional composed
children.

```text
SalesOrderRequest                         root entity
  ├── Items                               composition child
  │     └── Schedules                     composition child
  └── OrderPartners                       composition child

Item ───────────── association ─────────> Product
OrderPartner ───── association ─────────> BusinessPartner
```

Composition expresses lifecycle ownership inside the aggregate. Association
expresses a relationship to an independently meaningful entity or BO.

The root provides the aggregate entry point and coordinates transaction-level
concerns such as locking, authorization dependency, draft ownership, and total
ETag behavior according to the model.

### 2.2 Data contract plus behavior contract

```text
CDS entity tree
  fields + keys + associations + compositions + semantics

Base Behavior Definition
  operations + field control + locks + authorization + ETags
  + actions + determinations + validations + draft + mapping

Together
  RAP Business Object contract
```

A CDS entity without transactional behavior can still support a read model. A
transactional RAP BO needs a behavior definition that states which changes are
legal and how the runtime should coordinate them.

### 2.3 Aggregate consistency

The aggregate boundary determines which state should change consistently in a
single BO transaction.

For an order request:

- an Item normally cannot exist without its Request;
- deleting the Request normally removes its lifecycle-owned Items;
- Product and Customer remain independent;
- root and children can participate in one transactional buffer and save
  sequence.

The boundary should follow business ownership rather than screen layout or
foreign-key existence alone.

---

## 3. Repository Artifact Responsibilities

### 3.1 Persistence table

The database table stores durable state. It does not itself define:

- business names and semantic associations;
- transactional operations;
- authorization behavior;
- draft lifecycle;
- OData exposure;
- Fiori presentation.

```abap
define table zsor_request {
  key client                 : abap.clnt not null;
  key request_uuid           : sysuuid_x16 not null;
      request_number         : abap.char(10);
      sold_to_party          : abap.char(10);
      status                 : abap.char(2);
      total_amount           : abap.curr(15,2);
      transaction_currency   : abap.cuky;
      local_last_changed_at  : abp_locinst_lastchange_tstmpl;
}
```

The table is persistence, not the public business API.

### 3.2 Base CDS entity

The base CDS entity gives persistence business meaning and defines BO
topology.

```abap
define root view entity ZI_SalesOrderRequest
  as select from zsor_request as Request
  composition [0..*] of ZI_SalesOrderItem as _Items
  association [0..1] to ZI_CustomerReference as _Customer
    on $projection.SoldToParty = _Customer.CustomerID
{
  key Request.request_uuid         as RequestUUID,
      Request.request_number       as RequestNumber,
      Request.sold_to_party        as SoldToParty,
      Request.status               as Status,

      @Semantics.amount.currencyCode: 'TransactionCurrency'
      Request.total_amount         as TotalAmount,
      Request.transaction_currency as TransactionCurrency,

      Request.local_last_changed_at as LocalLastChangedAt,
      _Items,
      _Customer
}
```

`ZI_` is a customer naming convention. The prefix does not create an interface
contract or behavior by itself.

### 3.3 Base Behavior Definition

The base BDEF declares the reusable BO's transactional capabilities.

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

  field ( readonly ) RequestUUID, TotalAmount;
  field ( mandatory : create ) SoldToParty;

  association _Items { create; }
}
```

The BDEF says what exists in the BO contract. It does not make every capability
available to every service consumer.

### 3.4 Behavior pool

The behavior pool is the ABAP class pool associated with a behavior
definition. Its local handler classes implement application-specific
interaction logic such as actions, determinations, validations,
authorizations, and feature control. Saver logic participates where the
implementation scenario requires it.

```text
Behavior Definition
  declares action Submit
          │
          ▼
Behavior Pool handler method
  implements Submit business logic
```

The behavior pool is not a service and does not link HTTP directly to the BDEF.
The RAP runtime dispatches BO operations to it according to the behavior
contract.

### 3.5 CDS projection

A CDS projection defines a consumer-specific data shape over the reusable
model.

```abap
define root view entity ZC_SalesOrderRequest
  provider contract transactional_query
  as projection on ZI_SalesOrderRequest
{
  key RequestUUID,
      RequestNumber,
      SoldToParty,
      Status,
      TotalAmount,
      TransactionCurrency,
      _Items : redirected to composition child ZC_SalesOrderItem,
      _Customer
}
```

Redirection keeps navigation within the projected topology. Without proper
redirection, navigation can target the underlying model rather than the
corresponding consumer projection. Redirection does not “copy data” and its
absence does not universally mean that fields become blank.

### 3.6 Behavior projection

The behavior projection exposes selected base-BO behavior to one consumer.

```abap
projection;
strict ( 2 );

define behavior for ZC_SalesOrderRequest alias SalesOrderRequest
{
  use create;
  use update;
  use delete;
  use association _Items { create; }
  use action Submit;
}
```

Custom business logic is not implemented in the behavior projection. It stays
in the base BO's behavior pool so every permitted consumer receives the same
invariants.

### 3.7 Metadata extension

A metadata extension commonly holds UI vocabulary annotations separately from
the core CDS model.

```abap
@Metadata.layer: #CORE
annotate entity ZC_SalesOrderRequest with
{
  @UI.lineItem:       [{ position: 10 }]
  @UI.identification: [{ position: 10 }]
  RequestNumber;
}
```

Metadata can control presentation, field grouping, value help, and UI actions.
It must not be the only enforcement point for business invariants.

### 3.8 Service definition

The service definition chooses which CDS entities form the protocol-agnostic
business service.

```abap
@EndUserText.label: 'Sales Order Request Service'
define service ZUI_SALES_ORDER_REQUEST {
  expose ZC_SalesOrderRequest as SalesOrderRequests;
  expose ZC_SalesOrderItem    as SalesOrderItems;
  expose ZI_CustomerReference as Customers;
  expose ZI_ProductReference  as Products;
}
```

Reference entities are exposed when the consumer needs to address or query
them—for example through value help or navigation. An association in CDS does
not automatically guarantee that every target is available as an entity set in
the service.

### 3.9 Service binding

The service binding attaches a service definition to a concrete protocol and
service category, such as:

- OData V4 UI;
- OData V4 Web API;
- another binding type supported by the target platform.

One service definition can support multiple bindings or service versions. The
binding owns protocol-level exposure; it does not implement domain logic.

### 3.10 Fiori elements or API client

Fiori elements interprets OData metadata and annotations to generate floorplan
behavior. An external API client reads the service document and metadata to
construct requests.

Both are consumers:

```text
Consumer requests operation
  → RAP BO enforces business behavior
  → consumer renders success, state, and messages
```

The UI can improve usability but cannot replace BO validation or authorization.

---

## 4. Three Runtime Paths

RAP is easier to reason about when metadata, query, and transactional paths are
separated.

```text
Metadata path
  describe entities, fields, annotations, navigation, and operations

Query path
  retrieve data with filtering, sorting, paging, search, and authorization

Transactional path
  execute create/update/delete/action in a RAP LUW and save accepted changes
```

A single Fiori screen can use all three paths, but they do not execute the same
runtime work.

---

## 5. Metadata Request Path

### 5.1 Flow

```text
Fiori elements or API client requests $metadata
       │
       ▼
OData service binding identifies protocol/service version
       │
       ▼
Service definition identifies exposed CDS entities
       │
       ▼
Projection CDS and Behavior Projection define exposed shape/capabilities
       │
       ▼
CDS annotations and metadata extensions contribute vocabulary
       │
       ▼
OData metadata document returned to consumer
```

The metadata describes fields, types, entity sets, associations/navigation,
actions, capabilities, and annotations according to the exposed contract.

### 5.2 Metadata is descriptive, not transactional execution

When Fiori elements renders a column because of `@UI.lineItem`, the annotation
has influenced presentation. It has not read a database row or executed an
amount calculation.

Likewise, a value-help annotation describes lookup behavior. Backend
validation must still protect the business rule against direct OData, EML, and
other consumers.

### 5.3 Metadata troubleshooting boundary

```text
Annotation source
  → active CDS/metadata extension
  → service metadata
  → Fiori metadata cache
  → rendered control
```

If the expected annotation is absent from `$metadata`, debugging the browser
layout first is premature.

---

## 6. Managed Query Path

### 6.1 OData read flow

```text
Client GET
  + $select / $filter / $orderby / $top / $skip / $expand
       │
       ▼
Service binding parses the OData request
       │
       ▼
Service definition and projection identify entity/query contract
       │
       ▼
RAP query runtime interprets requested fields and query options
       │
       ▼
CDS query + access control + supported query semantics
       │
       ▼
Optimized database query
       │
       ▼
OData response serialized to the client
```

For a normal CDS-based managed query, the framework generates and executes the
database query. The behavior pool is not automatically called merely because a
client reads a list.

Additional behavior-related calls can still occur for requested functions,
instance features, authorizations, draft state, messages, or other declared
capabilities.

### 6.2 Pushdown

The query runtime can translate supported OData options into database work:

```text
$filter  → SQL filter
$orderby → database ordering
$top     → result limit
$skip    → paging offset
$select  → required columns
```

This reduces data transfer and application-server processing. The exact query
plan remains database- and model-dependent.

### 6.3 CDS access control

CDS DCL can restrict which rows a user may read. It participates in the query
path according to the access-control model.

```text
Service exposure says the entity is reachable
CDS access control says which rows are readable
BO authorization says which operations are permitted
```

These are complementary controls.

### 6.4 Unmanaged query path

When a CDS-backed SQL query is insufficient—for example when data comes from a
remote service—a CDS custom entity can delegate retrieval to an ABAP class
implementing the RAP query-provider interface.

```text
OData query
  → CDS custom entity
  → IF_RAP_QUERY_PROVIDER implementation
  → remote/nonstandard data source
  → response object
```

In an unmanaged query, the developer must handle supported paging, sorting,
filtering, total count, and authorization responsibilities correctly. It is not
a shortcut around the managed query model.

---

## 7. Transactional Request Path

### 7.1 OData modification flow

```text
Fiori or API request
  POST / PATCH / DELETE / action
       │
       ▼
Service Binding
  protocol, request parsing, changeset boundary
       │
       ▼
Service Definition + Projection
  exposed entity and permitted projected behavior
       │
       ▼
Base Behavior Definition
  operation contract, field control, concurrency, authorization
       │
       ▼
RAP interaction phase
  precheck / standard operation / handler / determination / action
       │
       ▼
Transactional buffer
  current uncommitted BO state
       │
       ▼
RAP save sequence
  finalization / validation / late numbering / persistence / cleanup
       │
       ▼
Database commit or rollback
       │
       ▼
MAPPED / FAILED / REPORTED and operation result returned to consumer
```

The exact callbacks depend on implementation type, operation, draft state, and
declared behavior. The diagram is a responsibility map, not a promise that
every hook runs for every request.

### 7.2 Projected operation first

A base action can exist but remain unavailable through a given service if the
Behavior Projection does not expose it.

```text
Base BDEF declares Release
  + Behavior Projection uses Release
  + Service exposes the projected entity
  = OData consumer can discover/invoke Release, subject to controls
```

The projection narrows the contract; it does not duplicate the implementation.

### 7.3 Runtime entity name

In EML:

```abap
MODIFY ENTITIES OF ZI_SalesOrderRequest IN LOCAL MODE
  ENTITY SalesOrderItem
    UPDATE FIELDS ( NetAmount )
    WITH CORRESPONDING #( items ).
```

`ZI_SalesOrderRequest` identifies the RAP BO through its root entity.
`SalesOrderItem` identifies an entity or alias declared inside that BO's
behavior definition. It is not a free-form operation name.

### 7.4 One root names the BO

An EML statement uses `ENTITIES OF <root>` because operations are coordinated
within the BO contract rooted at that entity. The selected `ENTITY` can still
be a composed child.

```text
BO identifier: ZI_SalesOrderRequest
Selected node: SalesOrderItem
Operation:     UPDATE
```

This is why a child update is written as an operation “of” the root BO.

---

## 8. RAP BO Runtime Phases

### 8.1 Interaction phase

SAP divides BO runtime into an interaction phase and a save sequence. During
the interaction phase, consumers invoke operations and the BO maintains the
current transaction state in its buffer.

```text
Initial persisted state
       │
       ▼
CREATE / UPDATE / DELETE / ACTION
       │
       ├── field and operation control
       ├── authorization / feature checks
       ├── prechecks where declared
       ├── determinations and action logic
       └── messages and failures
       │
       ▼
Current transactional-buffer state
```

Multiple operations can participate in one RAP Logical Unit of Work (LUW)
before persistence.

### 8.2 Transactional buffer

The transactional buffer represents the current BO state including accepted,
unsaved changes.

```text
Database state at transaction start
  + buffered creates
  + buffered updates
  - buffered deletes
  = current transactional state
```

Every transactional RAP BO requires a buffer. In managed RAP, the framework
provides it. In unmanaged RAP, the provider assumes responsibility for the
essential implementation, including correct buffering semantics.

### 8.3 Save sequence

The save sequence turns an acceptable buffered state into durable state.

Representative stages are:

```text
FINALIZE
  last permitted final calculations/changes before save checks complete
       │
       ▼
CHECK_BEFORE_SAVE
  validations and consistency checks can reject the save
       │
       ▼
ADJUST_NUMBERS
  final keys assigned for late-numbered instances where applicable
       │
       ▼
SAVE
  persist accepted state
       │
       ▼
CLEANUP
  release/reset transaction resources
```

The actual framework callbacks vary between managed, unmanaged, and additional
save scenarios. Application code must respect the phase contract; late errors
after the point of no return can cause runtime failure rather than ordinary
business rejection.

### 8.4 Successful save

```text
Buffered state accepted
  → persistence operations succeed
  → database transaction commits
  → response returns keys/results/messages
  → buffer is cleaned up
```

### 8.5 Rejected save

```text
Validation or check-before-save failure
  → failed instances and messages returned
  → persistence does not commit for the failed transactional request
  → consumer retains or corrects editable state according to scenario
```

For draft-enabled BOs, the invalid draft can remain persisted and editable
while activation of that draft is rejected. Draft semantics are separate from
ordinary transient buffering.

---

## 9. Three States That Must Not Be Confused

| State                | Durable | Cross-session | Purpose                                 |
| -------------------- | ------- | ------------- | --------------------------------------- |
| Transactional buffer | No      | No            | Hold current changes inside RAP LUW     |
| Draft persistence    | Yes     | Yes           | Preserve an unfinished editable version |
| Active persistence   | Yes     | Yes           | Store committed official business state |

```text
Transactional buffer
  temporary transaction memory

Draft
  persistent editing state managed through RAP draft lifecycle

Active database state
  committed business data
```

A draft still uses a transactional buffer while a request modifies it. Draft
does not replace the buffer.

### 9.1 SQL versus EML visibility

An ordinary ABAP SQL `SELECT` reads database state. It does not automatically
represent unsaved changes in the RAP transactional buffer.

```text
SELECT from persistence
  → committed database representation

READ ENTITIES
  → BO operation and transactional-state semantics
```

Behavior implementations should use EML when they need the current BO state,
especially when calculations depend on changes made earlier in the same RAP
LUW.

---

## 10. Managed, Unmanaged, and Additional Save

### 10.1 Managed implementation

Managed RAP is appropriate when framework-managed transactional processing and
persistence fit the business object.

RAP can provide:

- standard create, update, delete, and create-by-association processing;
- managed transactional buffer;
- persistence mapping;
- locking and ETag support as declared;
- save orchestration.

The developer still owns:

- the CDS and behavior model;
- domain actions;
- determinations and validations;
- authorization and feature-control implementation;
- field control and business messages;
- tests and operational behavior.

Managed does not mean “no ABAP” or “all business logic is generated.”

### 10.2 Unmanaged implementation

Unmanaged RAP is appropriate when an existing implementation, legacy business
logic, remote source, or nonstandard persistence mechanism must remain
authoritative.

The developer implements more of the interaction and save responsibilities,
including correct transactional buffering, standard operations, and
persistence orchestration according to the BO contract.

```text
Managed
  framework owns generic transactional mechanics

Unmanaged
  application provider owns essential transactional mechanics
```

Unmanaged is not inherently more powerful or more professional. It carries
more responsibility and should be selected because the integration boundary
requires it.

### 10.3 Managed with additional or unmanaged save

Hybrid variants let the managed interaction phase coexist with application-
specific save work. They are useful when the normal managed buffer is valuable
but persistence must also invoke a legacy API, write extra durable data, or
perform another supported save responsibility.

The selected variant must follow the platform's exact release-specific
contract. It must not perform uncontrolled commits inside BO implementation.

### 10.4 Draft is an independent choice

```text
Managed or unmanaged
  = who implements transaction mechanics

Draft or non-draft
  = whether a persistent editing lifecycle is provided
```

These are different architectural dimensions.

---

## 11. Entity Manipulation Language

### 11.1 Purpose

EML is part of the ABAP language and provides type-safe access to RAP BO
operations without using HTTP.

```text
OData consumer
  → service contract → RAP BO

ABAP consumer
  → EML → RAP BO
```

Both paths reach the business-object contract, although service projections,
authorization context, and permitted EML modes can differ.

### 11.2 Main statement families

```text
READ ENTITIES
  read instances, associations, functions, permissions

MODIFY ENTITIES
  create, update, delete, create by association, execute actions

COMMIT ENTITIES
  trigger the RAP save sequence for external/non-RAP consumption

ROLLBACK ENTITIES
  discard RAP LUW changes and reset the transactional buffer
```

### 11.3 Consumer EML example

```abap
MODIFY ENTITIES OF ZI_SalesOrderRequest
  ENTITY SalesOrderRequest
    CREATE FIELDS ( SoldToParty TransactionCurrency )
    WITH VALUE #(
      ( %cid                = 'REQ_1'
        SoldToParty         = 'C1000'
        TransactionCurrency = 'EUR' ) )
  MAPPED   DATA(mapped)
  FAILED   DATA(failed)
  REPORTED DATA(reported).

IF failed IS INITIAL.
  COMMIT ENTITIES
    RESPONSE OF ZI_SalesOrderRequest
    FAILED   DATA(commit_failed)
    REPORTED DATA(commit_reported).
ENDIF.
```

The consumer checks interaction-phase and commit responses separately. A
successful `MODIFY` only means the change entered the RAP transaction; it does
not itself prove database persistence.

### 11.4 `IN LOCAL MODE`

Inside its own behavior pool, a BO implementation can use EML `IN LOCAL MODE`
to call its BO directly.

According to the operation, local mode bypasses controls such as:

- authorization checks;
- feature control;
- prechecks;
- CDS access control for applicable reads;
- readonly restrictions for internal derived-field updates.

It remains within RAP transactional processing. It is not a general privilege
for external callers and is not available merely because two BOs participate
in the same transaction.

```text
Own behavior pool + own BO
  → IN LOCAL MODE can be valid

External/cross-BO consumer
  → consume the published/released contract and controls
```

Using local mode creates a responsibility: internal logic must preserve the
invariants that consumer-facing controls normally protect.

---

## 12. Typed RAP Responses

### 12.1 `MAPPED`

`MAPPED` returns key mapping, especially from a content identifier such as
`%cid` to the assigned transactional or final key.

```text
Caller temporary identity %cid
  → RAP-created instance identity
```

It does not map CDS field names to database-column names. Persistence mapping
belongs to the behavior model.

### 12.2 `FAILED`

`FAILED` identifies instances for which an operation or save could not
complete. It controls transactional outcome for those instances according to
the RAP contract.

```text
FAILED entry
  = this entity instance did not pass the requested processing
```

### 12.3 `REPORTED`

`REPORTED` carries messages and related information for consumers. A reported
message by itself is not universally the mechanism that rejects an operation.
The failure marker and RAP contract determine failure; the message explains
the outcome.

```text
FAILED   → affected instance failed
REPORTED → explanation, severity, field highlighting, state area
```

Warning and success messages can also be reported without rejecting the
operation.

### 12.4 Action result

An action can return an updated entity or custom result through its declared
result contract.

```abap
result = VALUE #(
  FOR request IN requests
  ( %tky   = request-%tky
    %param = request ) ).
```

`%tky` correlates the response with the precise transactional instance. It can
contain more transactional identity context than the visible persistent key,
including draft identity where relevant.

---

## 13. Transaction Ownership and Commit

### 13.1 Framework-managed service request

When OData invokes a RAP BO, the RAP framework owns request and changeset
transaction orchestration. Behavior implementation code must not issue its own
`COMMIT WORK` or `COMMIT ENTITIES` inside the handler.

```text
OData changeset
  → framework collects operations
  → interaction phase
  → save sequence
  → one controlled commit or rollback
```

### 13.2 External EML consumer

An ABAP report, class, or test consuming a BO through EML owns the RAP LUW
boundary and normally uses `COMMIT ENTITIES` to persist successful changes.

```text
MODIFY ENTITIES
  → inspect FAILED and REPORTED
  → COMMIT ENTITIES
  → inspect commit FAILED and REPORTED
```

### 13.3 Behavior implementation

Inside a behavior pool:

- use EML to request additional BO operations when allowed;
- do not independently commit;
- let the framework preserve atomicity across affected BOs;
- propagate failures and messages through RAP response structures.

An explicit commit inside reusable business logic would split the transaction
and prevent the framework from rolling the entire request back consistently.

---

## 14. Authorization, Feature, and Field-Control Boundaries

These controls answer different runtime questions:

| Control                  | Responsibility                                               |
| ------------------------ | ------------------------------------------------------------ |
| CDS access control       | Restrict readable data according to DCL model                |
| Global authorization     | Decide user permission independent of one instance           |
| Instance authorization   | Decide user permission using instance context                |
| Global feature control   | Enable/disable capability globally at runtime                |
| Instance feature control | Enable/disable operation or field for current instance state |
| Static field control     | Declare readonly or mandatory characteristics in BDEF        |
| Dynamic field control    | Return instance-specific field behavior where supported      |
| Validation               | Reject inconsistent business state                           |

```text
User may update orders
  → authorization

Released order cannot be edited
  → feature/state control

Requested quantity must be positive
  → validation
```

Disabling a button is not security. A direct OData or EML consumer must still
be constrained by the BO contract.

---

## 15. Activation, Publishing, Transport, and Deployment

### 15.1 Activation

Activation creates or updates the active repository version of an ABAP
development object after syntax and dependency checks. RAP artifacts depend on
one another, so activation is usually performed from lower-level persistence
and CDS artifacts toward behavior and service exposure.

```text
Table
  → base CDS
  → projection CDS
  → BDEF and behavior implementation
  → Behavior Projection
  → metadata extension
  → service definition
  → service binding
```

Activation is not end-user deployment and does not automatically publish every
service endpoint.

### 15.2 Service publishing

Publishing a service binding makes the configured service/version accessible
in the current ABAP system according to its platform and authorization setup.

```text
Active Service Definition
  + active Service Binding
  + publish
  = reachable service endpoint in that system
```

The preview is a consumer of that endpoint. “Local publish” means local to the
current ABAP system/tenant, not execution on the developer's laptop.

### 15.3 Transport

A transport moves repository and configuration changes through the system
landscape. It does not mean that an independently built Fiori application has
already been deployed to its frontend runtime or that every target-system
service is configured and authorized.

### 15.4 Deployment

Deployment delivers a separately packaged application to its runtime, for
example a standalone Fiori application. Generated Fiori preview, service
publication, ABAP transport, and frontend deployment are related but different
lifecycle steps.

### 15.5 ADT and execution location

RAP development can be performed in ABAP Development Tools in Eclipse. ADT is
the development client; activation, OData execution, ABAP runtime, and database
access occur in the connected ABAP system.

```text
Developer machine
  Eclipse / ADT source editor and repository tools
             │
             ▼
ABAP system
  active repository + RAP runtime + application server
             │
             ▼
Configured database
  persistence read by ABAP SQL and CDS
```

CDS does not use a separate database from ABAP. It models data in the database
connected to the ABAP system, subject to the CDS source and runtime contract.

---

## 16. End-to-End Sales Order Request Trace

### 16.1 Read a list

```text
1. Fiori elements obtains OData metadata
2. UI builds a List Report from annotations
3. UI sends GET with filter/select/order/paging options
4. Service Binding resolves the service version
5. Projection determines exposed fields and navigation
6. RAP managed query evaluates CDS, query options, and access control
7. Database returns matching rows
8. OData serializes the projected result
9. Fiori renders the list
```

### 16.2 Create a request with items

```text
1. Consumer sends root CREATE and item create-by-association
2. Projection contract permits the exposed operations
3. Base BDEF supplies field/operation/authorization contract
4. RAP assigns early UUIDs when configured
5. Managed runtime places root and items in transactional buffer
6. Determinations initialize or derive BO-owned values
7. MAPPED correlates client identifiers with instance keys
8. Save is requested at the request/changeset boundary
9. On-save validations inspect current aggregate state
10. Accepted instances persist atomically
11. FAILED/REPORTED and created keys return to consumer
```

### 16.3 Submit action

```text
1. UI annotation exposes an action button
2. Behavior Projection exposes Submit
3. Client invokes bound OData action for selected instance
4. RAP resolves %tky and checks authorization/feature control
5. Behavior Pool Submit method executes
6. Method reads current BO state through EML
7. Invalid transition appends FAILED and REPORTED
8. Valid transition updates Status through local EML
9. Transactional buffer holds updated state
10. Save sequence validates and persists
11. Action result and messages return to UI
12. Side-effect metadata can instruct UI to reread affected fields
```

The UI annotation causes discoverability and rendering. The action contract and
behavior pool own the business transition.

### 16.4 Derived amount update

```text
RequestedQuantity or UnitPrice changes
  → determination trigger
  → read current Item state from transactional buffer
  → calculate Item.NetAmount
  → update derived field through local EML
  → recalculate parent TotalAmount from current Items
  → buffer contains consistent aggregate
  → side effect tells UI which values to refresh
  → save sequence persists accepted result
```

The side effect does not calculate the amount. It describes which consumer data
became stale after backend logic ran.

---

## 17. Runtime Diagnostics by Layer

### 17.1 Universal trace

```text
Observed symptom
  → identify metadata, query, interaction, or save path
  → capture exact entity, operation, key/%tky, and payload
  → inspect projected capability
  → inspect base behavior contract
  → inspect behavior implementation when it participates
  → inspect FAILED, REPORTED, HTTP error, and application log
  → inspect transactional versus persistent state
  → inspect service/cache/UI only at its responsible boundary
```

### 17.2 UI field or action missing

```text
Metadata extension / CDS annotation
  → active projection
  → exposed entity in Service Definition
  → active/published Service Binding
  → $metadata contains annotation/capability
  → Fiori cache and floorplan interpretation
```

For an action, also verify:

```text
Base BDEF declaration
  → Behavior Projection use action
  → action annotation
  → feature-control result
  → authorization result
```

### 17.3 Read returns no rows

```text
OData request and filter values
  → correct entity set and service version
  → projection filters/parameters
  → CDS associations and join cardinality
  → DCL/access control
  → database data and client context
  → unmanaged query implementation if applicable
```

An entity exposed in a service can correctly return no rows because DCL denies
all data.

### 17.4 Modification rejected before handler logic

Possible earlier boundaries include:

- operation not exposed by Behavior Projection;
- readonly or mandatory field contract;
- authorization or feature control;
- precheck;
- stale ETag;
- invalid payload/type or missing key;
- draft/active instance mismatch.

The absence of a breakpoint hit in an action or validation does not prove that
the request reached that implementation method.

### 17.5 Modify succeeds but save fails

```text
Interaction-phase MODIFY accepted
  → current change exists in transactional buffer
  → save-sequence validation/check fails
  → COMMIT ENTITIES or OData changeset fails
  → database remains unchanged
```

Inspect both interaction and commit response structures. The final business
error can be returned only when save is attempted.

### 17.6 Database is unchanged

```text
Verify operation response
  → verify save boundary occurred
  → verify validation/late-numbering/save messages
  → verify correct client and persistence table
  → verify draft versus active instance
  → verify rollback or failed changeset
```

Do not add direct SQL writes to “fix” a missing save. That bypasses the BO
contract and hides the actual transaction error.

---

## 18. Performance and Correctness Boundaries

### 18.1 RAP requests are set-oriented

Handler methods receive tables of keys or instances because one request can
process several entities. Implementations should avoid assuming one row.

```text
keys table
  → bulk EML read
  → set-based lookup/calculation
  → bulk EML modify
  → correlated FAILED/REPORTED/result rows
```

### 18.2 Avoid database reads per entity

Poor pattern:

```text
LOOP over keys
  SELECT one row
  SELECT reference row
  MODIFY one entity
ENDLOOP
```

Preferred direction:

```text
READ ENTITIES for all keys
  → extract distinct reference keys
  → one set-oriented lookup
  → process in memory
  → one bulk MODIFY ENTITIES
```

### 18.3 Read the correct state

Business logic depending on current transaction changes should read via EML,
not assume the database already contains earlier modifications.

### 18.4 Idempotent determinations

The runtime does not guarantee a simple user-imagined order across all
determinations. Derived-value logic should be safe when triggered repeatedly
and should converge to the same result for the same BO state.

### 18.5 No commits in handlers

Independent commits break RAP atomicity and can leave partial cross-entity or
cross-BO results. The framework or external EML consumer owns the save boundary.

---

## 19. Clean-Core and Release Contracts

### 19.1 Internal existence is not release

A CDS entity, class, or function can exist in the system without being released
for Cloud development or stable cross-component consumption.

```text
Exists in repository
  ≠ released API
  ≠ permitted in ABAP Cloud
  ≠ stable across upgrades
```

Check API State and supported capabilities in the target system.

### 19.2 BO interface versus ordinary service projection

A formal RAP BO interface can use a projection with provider contract
`transactional_interface` and a Behavior Definition Interface to provide a
lifecycle-stable cross-component contract.

An ordinary service projection commonly uses `transactional_query` and shapes
one business service. Naming a CDS entity `ZI_...` does not automatically make
it a released RAP BO interface.

```text
Base BO
  → optional released BO interface for cross-component stability
  → service-specific projection for OData consumer
```

### 19.3 Extension hierarchy

Preferred extension dependencies move toward released contracts:

```text
Released BO interface / API / event
  → custom adapter or extension
  → custom service projection

Avoid
  direct dependency on SAP internal table or unreleased implementation class
```

### 19.4 Protocol does not define the domain boundary

OData V4, EML, and events are consumption mechanisms. Aggregate ownership,
business rules, and transaction boundaries should be defined from the domain
and provider contract first.

---

## 20. Common Architectural Misinterpretations

### 20.1 CDS is not only a database view

CDS can define semantic elements, associations, compositions, annotations,
authorization relevance, and BO topology in addition to database projection.

### 20.2 The behavior pool is not the service

It implements BO behavior. Service Definition and Service Binding expose a
projected contract through a protocol.

### 20.3 The Behavior Projection contains no domain implementation

It selects capabilities for a consumer. The base behavior pool remains the
implementation owner.

### 20.4 `REPORTED` does not universally reject an operation

It transports messages. `FAILED`, validation outcome, and RAP transaction
semantics determine rejection.

### 20.5 Managed RAP is not zero-code CRUD

The framework supplies generic transaction mechanics, while the developer owns
the domain model, rules, security implementation, messages, and tests.

### 20.6 Transactional buffer is not draft

The buffer is temporary LUW state used by every transactional BO. Draft is a
persistent editing version with its own lifecycle.

### 20.7 Service publication is not application deployment

Publication exposes an endpoint in the ABAP system. Transport and frontend
deployment solve different lifecycle problems.

### 20.8 OData is not required for local BO consumption

EML invokes RAP BO operations directly from ABAP and preserves the declared BO
contract according to the consumption mode.

### 20.9 Direct SQL does not participate in RAP state automatically

Database reads do not automatically include unsaved transactional-buffer data,
and direct writes bypass RAP behavior.

### 20.10 UI control is not backend protection

Annotations and disabled buttons improve interaction. Authorization,
validation, and feature control must protect the BO for every consumer.

---

## 21. Compact Architecture Map

```text
DESIGN TIME

Persistence table
  durable columns and technical keys
        │
        ▼
Base CDS root + compositions + associations
  semantic data model and aggregate topology
        │
        ├── Base BDEF
        │     transactional contract
        │       │
        │       └── Behavior Pool
        │             custom interaction/save implementation
        │
        ▼
CDS Projection + Behavior Projection
  consumer-specific data and capability contract
        │
        ├── Metadata Extension
        │     UI vocabulary and presentation
        │
        ▼
Service Definition
  exposed entity set
        │
        ▼
Service Binding
  OData protocol, category, version, publication


RUNTIME — METADATA

Client → Binding → Service → Projection/Behavior metadata → $metadata


RUNTIME — QUERY

Client GET
  → Binding
  → projected query contract
  → RAP query runtime + DCL
  → CDS/SQL or unmanaged query provider
  → response


RUNTIME — MODIFY

Client or EML consumer
  → projected/released BO operation
  → Base BDEF controls
  → Behavior Pool/framework interaction logic
  → transactional buffer
  → save sequence
  → database commit or rollback
  → MAPPED / FAILED / REPORTED / result


STATE

Transactional buffer  temporary LUW state
Draft persistence      durable editable state
Active persistence     durable committed business state
```

The architecture should always be read in two directions:

```text
Design
  persistence → semantic model → behavior → projection → service

Diagnosis
  client symptom → service metadata/request → projection → BO contract
  → runtime phase → buffer/save → persistence
```

That two-way trace is the foundation for implementing and debugging every
other RAP feature.
