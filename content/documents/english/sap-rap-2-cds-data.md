---
title: SAP RAP CDS Data Modeling and Projection Design
part: RAP
summary: This document explains how ABAP CDS defines the structural and semantic model of a RAP business object and how CDS projection views adapt that model for a specific consumer. It focuses on entity boundaries, keys, compositions, associations, cardinality, semantic annotations, projection contracts, and navigation topology.
category: Technical
tags:
  - sap
  - rap
publishedAt: 2026-09-02
---

# SAP RAP CDS Data Modeling and Projection Design — Technical Reference

This document explains how ABAP CDS defines the structural and semantic model
of a RAP business object and how CDS projection views adapt that model for a
specific consumer. It focuses on entity boundaries, keys, compositions,
associations, cardinality, semantic annotations, projection contracts, and
navigation topology.

The central design principle is:

> The base CDS model describes the reusable business object and its
> relationships. A CDS projection selects and adapts that model for one
> consumption scenario. Neither layer replaces the behavior definition, which
> owns the transactional capabilities and business rules.

Primary SAP sources:

- [SAP Help — Defining the Data Model in CDS Views](https://help.sap.com/docs/abap-cloud/abap-rap/defining-data-model-in-cds-views)
- [SAP Help — CDS View Entities](https://help.sap.com/docs/abap-cloud/abap-data-models/cds-view-entities-8b3e8e8b8797432abecd7d1fbb6d5c12)
- [SAP Help — Associations](https://help.sap.com/docs/abap-cloud/abap-data-models/cds-associations)
- [SAP Help — Projection Views](https://help.sap.com/docs/abap-cloud/abap-data-models/cds-projection-views)
- [SAP Help — Creating CDS View Entities for RAP](https://help.sap.com/docs/abap-cloud/abap-rap/creating-cds-view-entities)
- [SAP Help — CDS Annotations for RAP](https://help.sap.com/docs/abap-cloud/abap-rap/cds-annotations)

---

## 1. Position of CDS in RAP

```text
Database tables or released data sources
                  │
                  ▼
Base CDS view entities
  fields, keys, aliases, compositions, associations, semantics
                  │
                  ├──────── Base Behavior Definition
                  │          operations and transactional contract
                  │
                  ▼
CDS projection views
  consumer-specific field and navigation shape
                  │
                  ├──────── Behavior Projection
                  │          consumer-visible operations
                  │
                  ├──────── Metadata Extension
                  │          presentation metadata
                  │
                  ▼
Service Definition and Service Binding
```

CDS is responsible for the data model. It can express:

- entity elements and their ABAP Dictionary types;
- semantic keys exposed by the entity;
- aliases that give technical columns business-oriented names;
- calculations supported by the CDS language;
- root, child, and reference relationships;
- semantic dependencies such as amount/currency and quantity/unit;
- reusable navigation paths;
- annotations consumed by the ABAP runtime and other frameworks.

CDS does not by itself implement:

- create, update, or delete behavior;
- validations, determinations, actions, or feature control;
- transactional buffering and save handling;
- a custom authorization decision for a modification;
- an OData endpoint.

Those responsibilities belong to other RAP artifacts.

---

## 2. Persistence Model Versus Semantic Model

### 2.1 Database table

A database table is the durable storage contract. It normally contains:

- technical keys;
- foreign-key columns;
- business data;
- administrative fields;
- ETag timestamps;
- internal processing fields;
- fields needed by persistence but not every consumer.

Example:

```abap
define table zsor_request {
  key client                  : abap.clnt not null;
  key request_uuid            : sysuuid_x16 not null;
      request_number          : abap.char(10);
      sold_to_party           : abap.char(10);
      status                  : abap.char(1);
      total_amount            : abap.curr(15,2);
      transaction_currency    : abap.cuky;
      internal_processing_code: abap.char(4);
      created_by              : abp_creation_user;
      created_at              : abp_creation_tstmpl;
      last_changed_at         : abp_lastchange_tstmpl;
      local_last_changed_at   : abp_locinst_lastchange_tstmpl;
}
```

The table proves how values are stored. It does not fully explain what the
business object means, which rows belong to one aggregate, or which fields a
consumer should see.

### 2.2 Base CDS view entity

A CDS view entity creates a reusable semantic layer over the data source:

```abap
define root view entity ZI_SalesOrderRequest
  as select from zsor_request as Request
{
  key Request.request_uuid         as RequestUUID,
      Request.request_number       as RequestNumber,
      Request.sold_to_party        as SoldToParty,
      Request.status               as Status,
      Request.total_amount         as TotalAmount,
      Request.transaction_currency as TransactionCurrency,
      Request.last_changed_at      as LastChangedAt,
      Request.local_last_changed_at as LocalLastChangedAt
}
```

The CDS entity:

- exposes business-oriented names;
- selects only the columns required by the model;
- can attach semantics and relationships;
- provides a typed source for behavior and projections;
- decouples consumers from the physical table layout.

The CDS view does not copy data out of the table. It is a repository definition
that the runtime translates into database access when queried.

### 2.3 Why the layers must remain separate

```text
Persistence concern                  Semantic/consumer concern
─────────────────────────────────    ─────────────────────────────────
How is the value stored?             What does the value mean?
Which technical column exists?       Which business name is stable?
Which administrative field exists?   Does this consumer need the field?
How are rows physically keyed?       How are BO nodes navigated?
```

Exposing a database table directly makes its storage design part of the
consumer contract. A CDS layer allows the persistence structure to evolve
behind a more stable semantic interface.

---

## 3. View Entities and Their Elements

### 3.1 Basic syntax

```abap
@EndUserText.label: 'Sales Order Request'
@AccessControl.authorizationCheck: #CHECK
define root view entity ZI_SalesOrderRequest
  as select from zsor_request as Request
{
  key Request.request_uuid   as RequestUUID,
      Request.request_number as RequestNumber,
      Request.status         as Status
}
```

Key parts:

| Construct            | Meaning                                           |
| -------------------- | ------------------------------------------------- |
| `define view entity` | Defines a CDS view entity                         |
| `root`               | Marks the root of a RAP composition tree          |
| `as select from`     | Defines the data source                           |
| `key`                | Declares an element as part of the CDS entity key |
| `as RequestUUID`     | Assigns a semantic alias                          |
| annotations          | Add technical or semantic metadata                |

`root` is a modeling statement. It says that this entity may anchor a RAP
business-object composition tree. It does not automatically create behavior.

### 3.2 CDS keys are not a substitute for database integrity

The CDS key describes how consumers and frameworks identify the result rows.
It should match the actual uniqueness of the result.

```text
Database primary key
  enforces uniqueness in persisted rows

CDS entity key
  declares the identity of rows exposed by the CDS entity
```

Declaring a field with `key` does not repair a query that returns duplicates.
If joins, path expressions, or incorrect cardinalities multiply rows, the model
is still incorrect even though the select list contains a key declaration.

For a UUID-based root, the technical key is commonly a `RAW(16)` UUID exposed
through a data element such as `sysuuid_x16`. A separate human-readable order
number can remain a business identifier rather than the technical key.

### 3.3 Aliases and persistence mapping

Aliases improve meaning:

```abap
Request.sold_to_party as SoldToParty
```

If the CDS element names differ from the persistence column names, a managed
behavior definition can use a mapping block:

```abap
mapping for zsor_request
{
  RequestUUID         = request_uuid;
  RequestNumber       = request_number;
  SoldToParty         = sold_to_party;
  TotalAmount         = total_amount;
  TransactionCurrency = transaction_currency;
}
```

This mapping belongs to the behavior definition. It is different from the RAP
response parameter `MAPPED`, which reports preliminary-to-final key mappings
during EML processing.

---

## 4. Designing the Business-Object Aggregate

### 4.1 Aggregate boundary

A RAP business object is normally modeled as a tree:

```text
SalesOrderRequest                       root
└── SalesOrderItem                      composition child
    └── RequestedSchedule               composition grandchild
```

The root is the transactional entry point and consistency boundary. It often
owns:

- aggregate status;
- aggregate totals;
- lifecycle transitions;
- locking and authorization dependencies;
- navigation to all owned child nodes.

The decisive question for a child is existential dependency: the child has no
business meaning outside its parent aggregate.

### 4.2 Composition

A composition is a specialized association that defines ownership and a
parent-child lifecycle dependency.

```abap
define root view entity ZI_SalesOrderRequest
  as select from zsor_request as Request

  composition [0..*] of ZI_SalesOrderItem as _Items
{
  key Request.request_uuid as RequestUUID,
      _Items
}
```

The root exposes the composition in its element list. The cardinality
`[0..*]` means that one request may relate to zero, one, or many items.

The composition states structure and ownership. Transactional operations on
the child are still declared in the behavior definition, for example creation
by association from the parent.

### 4.3 Association to parent

The child completes the composition relationship with a to-parent association:

```abap
define view entity ZI_SalesOrderItem
  as select from zsor_item as Item

  association to parent ZI_SalesOrderRequest as _Request
    on $projection.RequestUUID = _Request.RequestUUID
{
  key Item.item_uuid    as ItemUUID,
      Item.request_uuid as RequestUUID,
      Item.product      as Product,
      _Request
}
```

Important details:

- the target is the parent CDS entity;
- the `ON` condition connects the child's parent key to the root key;
- `$projection.RequestUUID` refers to the element name exposed by this CDS
  entity, not the database column name;
- the association must be published in the element list for navigation;
- the association alias is later used by behavior and projection artifacts.

For a deeper tree, a child can also carry an explicit association to the root
when root navigation is required. The direct `association to parent` still
points to the immediate parent node.

### 4.4 Composition is not an ordinary foreign-key link

```text
Composition
  SalesOrderRequest ─owns─> SalesOrderItem
  child lifecycle depends on parent

Association
  SalesOrderRequest ─refers to─> Customer
  target has an independent lifecycle
```

An item is a composition child because an order item without its request has no
meaning in this use case. Customer, Product, Plant, and Sales Area are normally
associations because those targets exist independently and are reused by many
transactions.

Do not choose composition merely because the database contains a foreign key.
Choose it because the domain says the parent owns the target's lifecycle.

---

## 5. Associations to Independent Entities

### 5.1 Definition

```abap
association [0..1] to ZI_CustomerReference as _Customer
  on $projection.SoldToParty = _Customer.CustomerID
```

```abap
association [0..1] to ZI_ProductReference as _Product
  on $projection.Product = _Product.ProductID
```

An association defines a reusable relationship. It behaves like a declared
join that is instantiated when a consumer follows the association or requests
a target field through a path expression.

### 5.2 Publishing versus consuming an association

Publishing the association:

```abap
{
  key Request.request_uuid as RequestUUID,
      Request.sold_to_party as SoldToParty,
      _Customer
}
```

Consuming a target field through a path:

```abap
{
  key Request.request_uuid as RequestUUID,
      Request.sold_to_party as SoldToParty,
      _Customer.CustomerName as CustomerName
}
```

These have different effects:

| Form                     | Effect                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| `_Customer`              | Publishes a navigation relationship                                  |
| `_Customer.CustomerName` | Adds a target field to the current result and causes join processing |

Associations can reduce unnecessary joins because navigation is instantiated
on demand. They do not guarantee good performance by themselves; deep paths,
incorrect cardinalities, and wide consumption can still produce expensive SQL.

### 5.3 Association naming

An underscore prefix such as `_Customer` is the established ABAP CDS
convention for an association alias. The underscore communicates navigation
rather than scalar data. It is a convention, not the business identity of the
target.

### 5.4 Referential validity

An association describes how a target is found. It does not automatically
reject an invalid foreign-key value during a transactional save.

```text
CDS association
  navigation and query relationship

Value help
  assists selection and can support consumer validation metadata

RAP validation
  enforces the business rule and can reject the save
```

If every submitted request must refer to an existing Customer, implement that
invariant in backend behavior even when the UI provides a Customer value help.

---

## 6. Cardinality

### 6.1 Meaning

Cardinality documents how many target rows may match one source row.

| Numeric form | Meaning from one source instance |
| ------------ | -------------------------------- |
| `[0..1]`     | Zero or one target               |
| `[1..1]`     | Exactly one target is expected   |
| `[0..*]`     | Zero, one, or many targets       |
| `[1..*]`     | One or many targets are expected |

Examples:

```abap
association [0..1] to ZI_CustomerReference as _Customer ...
composition [0..*] of ZI_SalesOrderItem as _Items
```

### 6.2 Cardinality is a model assertion, not general validation

`[0..1]` does not mean RAP will automatically reject two matching rows. It
states what the model expects and can influence syntax checks, generated SQL,
and optimizer decisions.

The actual data and `ON` condition must satisfy the declaration. If a declared
to-one association returns multiple targets, consumers can receive unstable or
unexpected results and database optimizations may be based on a false model.

### 6.3 Cardinality does not determine ownership

Both of these relationships can use `[0..*]`:

```text
Order ─composition→ Items
Customer ─association→ Addresses
```

The number of targets does not decide whether the relationship is a
composition. Ownership and lifecycle dependency decide that.

### 6.4 Optional during editing versus required business state

A `[0..1]` Customer association permits the relationship to be absent from a
modeling perspective. That can support incomplete creation or draft editing.
It does not express a rule such as “Customer is mandatory when Status is
Submitted.” That state-dependent rule belongs in behavior validation.

```text
Structural possibility
  Customer relationship may be empty while editing

Business invariant
  Customer must be valid before submission or activation
```

---

## 7. Complete Base CDS Aggregate Example

### 7.1 Root entity

```abap
@EndUserText.label: 'Sales Order Request'
@AccessControl.authorizationCheck: #CHECK
define root view entity ZI_SalesOrderRequest
  as select from zsor_request as Request

  composition [0..*] of ZI_SalesOrderItem as _Items

  association [0..1] to ZI_CustomerReference as _Customer
    on $projection.SoldToParty = _Customer.CustomerID
{
  key Request.request_uuid          as RequestUUID,
      Request.request_number        as RequestNumber,
      Request.sold_to_party         as SoldToParty,
      Request.status                as Status,

      @Semantics.amount.currencyCode: 'TransactionCurrency'
      Request.total_amount          as TotalAmount,

      Request.transaction_currency  as TransactionCurrency,
      Request.internal_processing_code as InternalProcessingCode,

      @Semantics.systemDateTime.createdAt: true
      Request.created_at            as CreatedAt,

      @Semantics.user.createdBy: true
      Request.created_by            as CreatedBy,

      @Semantics.systemDateTime.lastChangedAt: true
      Request.last_changed_at       as LastChangedAt,

      @Semantics.systemDateTime.localInstanceLastChangedAt: true
      Request.local_last_changed_at as LocalLastChangedAt,

      _Items,
      _Customer
}
```

### 7.2 Child entity

```abap
@EndUserText.label: 'Sales Order Request Item'
@AccessControl.authorizationCheck: #CHECK
define view entity ZI_SalesOrderItem
  as select from zsor_item as Item

  association to parent ZI_SalesOrderRequest as _Request
    on $projection.RequestUUID = _Request.RequestUUID

  association [0..1] to ZI_ProductReference as _Product
    on $projection.Product = _Product.ProductID
{
  key Item.item_uuid             as ItemUUID,
      Item.request_uuid          as RequestUUID,
      Item.product               as Product,

      @Semantics.quantity.unitOfMeasure: 'QuantityUnit'
      Item.requested_quantity    as RequestedQuantity,

      Item.quantity_unit         as QuantityUnit,

      @Semantics.amount.currencyCode: 'TransactionCurrency'
      Item.unit_price            as UnitPrice,

      @Semantics.amount.currencyCode: 'TransactionCurrency'
      Item.net_amount            as NetAmount,

      Item.transaction_currency  as TransactionCurrency,
      Item.local_last_changed_at as LocalLastChangedAt,

      _Request,
      _Product
}
```

### 7.3 Structural interpretation

```text
ZI_SalesOrderRequest
  key: RequestUUID
  owns: _Items
  references: _Customer
  aggregate values: Status, TotalAmount
  concurrency value: LocalLastChangedAt

ZI_SalesOrderItem
  key: ItemUUID
  belongs to: _Request
  references: _Product
  entered values: Product, RequestedQuantity
  derived candidates: UnitPrice, NetAmount, TransactionCurrency
```

“Entered” and “derived” in the last diagram are design classifications. CDS has
no `[entered]` or `[derived]` element syntax. The behavior definition marks
consumer restrictions such as `readonly`, and determinations implement the
derivation.

---

## 8. Semantic Annotations

### 8.1 Amount and currency

```abap
@Semantics.amount.currencyCode: 'TransactionCurrency'
Item.net_amount as NetAmount,

Item.transaction_currency as TransactionCurrency
```

This metadata declares that `NetAmount` must be interpreted together with
`TransactionCurrency`. Consumers can use it for formatting, decimal handling,
metadata generation, and display.

It does not:

- convert one currency to another;
- retrieve a price condition;
- calculate `NetAmount`;
- guarantee that header and item currencies match;
- validate that the currency key exists.

Those require business logic, a released conversion capability, or validation
as appropriate.

### 8.2 Quantity and unit

```abap
@Semantics.quantity.unitOfMeasure: 'QuantityUnit'
Item.requested_quantity as RequestedQuantity,

Item.quantity_unit as QuantityUnit
```

The annotation makes the quantity/unit dependency explicit. It does not
perform unit conversion or availability checking.

### 8.3 Administrative timestamps

Typical managed RAP administrative fields include:

```abap
@Semantics.systemDateTime.createdAt: true
CreatedAt,

@Semantics.user.createdBy: true
CreatedBy,

@Semantics.systemDateTime.lastChangedAt: true
LastChangedAt,

@Semantics.systemDateTime.localInstanceLastChangedAt: true
LocalLastChangedAt
```

Their exact use depends on the behavior definition. For example, an ETag must
be declared in behavior; annotating a timestamp alone does not activate ETag
concurrency control.

### 8.4 Annotation responsibility

Annotations are metadata interpreted by a particular framework or runtime.
Their presence does not imply arbitrary application logic.

```text
Semantic annotation
  describes meaning or framework relationship

Behavior implementation
  computes, validates, or changes transactional state
```

---

## 9. CDS Projection Views

### 9.1 Purpose

A projection view adapts a base CDS entity for a defined scenario:

```text
Reusable base model
  RequestUUID, RequestNumber, SoldToParty, Status,
  TotalAmount, InternalProcessingCode, admin fields, relationships
                         │
                         ▼
Customer-facing UI projection
  RequestUUID, RequestNumber, SoldToParty, Status,
  TotalAmount, relationships needed by UI
```

The projection decides which fields and associations are visible through that
projection. It does not erase excluded fields from the base entity or table.

### 9.2 Transactional query projection

```abap
@EndUserText.label: 'Sales Order Request Consumption'
@AccessControl.authorizationCheck: #CHECK
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
      LocalLastChangedAt,

      _Items : redirected to composition child ZC_SalesOrderItem,
      _Customer
}
```

`transactional_query` identifies the projection as a service-consumption layer
for a transactional RAP business object. Current CDS syntax expects the
provider contract to be stated explicitly.

### 9.3 Child projection

```abap
@EndUserText.label: 'Sales Order Request Item Consumption'
@AccessControl.authorizationCheck: #CHECK
define view entity ZC_SalesOrderItem
  provider contract transactional_query
  as projection on ZI_SalesOrderItem
{
  key ItemUUID,
      RequestUUID,
      Product,
      RequestedQuantity,
      QuantityUnit,
      UnitPrice,
      NetAmount,
      TransactionCurrency,
      LocalLastChangedAt,

      _Request : redirected to parent ZC_SalesOrderRequest,
      _Product
}
```

The child projection must use `as projection on` and a provider contract just
like the root projection. Omitting `as projection on ZI_SalesOrderItem` does
not define a projection.

### 9.4 Base versus projection responsibility

| Concern                 | Base CDS                                   | CDS projection                                    |
| ----------------------- | ------------------------------------------ | ------------------------------------------------- |
| BO node identity        | Defines reusable entity key                | Projects the required key                         |
| Aggregate topology      | Defines composition and parent association | Redirects topology to projected nodes             |
| Independent references  | Defines reusable associations              | Exposes or omits them for the consumer            |
| Internal field          | Can retain it for implementation           | Can omit it from the consumer contract            |
| Amount/unit semantics   | Usually defined close to reusable field    | Inherited or adapted when supported               |
| Transactional operation | Not a CDS concern                          | Not a CDS concern; behavior projection exposes it |
| UI layout               | Not a base-model concern                   | Usually placed in metadata extension              |

---

## 10. Projection Redirection

### 10.1 Why redirection exists

The base root composition points to the base child:

```text
ZI_SalesOrderRequest._Items ──> ZI_SalesOrderItem
```

The consumer should navigate within the projected graph:

```text
ZC_SalesOrderRequest._Items ──> ZC_SalesOrderItem
ZC_SalesOrderItem._Request ───> ZC_SalesOrderRequest
```

Redirection rewires the projected relationship to the corresponding projected
entity.

### 10.2 Syntax

Root to child:

```abap
_Items : redirected to composition child ZC_SalesOrderItem
```

Child to parent:

```abap
_Request : redirected to parent ZC_SalesOrderRequest
```

Ordinary association redirection, when a projected target is required, uses an
appropriate redirected association form supported by the projection model.

### 10.3 What redirection does not do

Redirection does not:

- copy records between base and projection entities;
- create child rows;
- calculate target data;
- map a field to a persistence column;
- make a blank database relationship valid;
- implement cascade deletion.

The base and projection views still operate over the same underlying business
data. Redirection changes the navigation contract visible from the projection.

### 10.4 Missing redirection is not universally “blank data”

The actual consequence depends on the artifact and syntax. Common outcomes
include activation errors, an inconsistent projected composition, navigation
to an unintended base target, or missing service navigation. It is inaccurate
to treat “blank data” as the universal result.

Diagnose the metadata target and projected topology rather than assuming the
persistence rows disappeared.

---

## 11. Projection Provider Contracts

Projection views support different use cases. The provider contract makes the
intended contract explicit.

| Provider contract         | Main purpose                                          |
| ------------------------- | ----------------------------------------------------- |
| `transactional_query`     | Consumer/service projection of a transactional RAP BO |
| `transactional_interface` | Stable BO interface intended for reuse and release    |
| `analytical_query`        | Analytical query projection                           |

These contracts are not interchangeable labels.

### 11.1 Transactional query

Use for a consumer-specific service projection:

```abap
define root view entity ZC_SalesOrderRequest
  provider contract transactional_query
  as projection on ZI_SalesOrderRequest
```

This projection can be paired with a behavior projection and exposed through a
service definition.

### 11.2 Transactional interface

Use when defining a formal BO interface intended as a stable reusable contract:

```abap
define root view entity ZI_SalesOrderRequestAPI
  provider contract transactional_interface
  as projection on ZI_SalesOrderRequest
```

A formal RAP BO interface also requires the corresponding behavior-interface
artifacts and release decisions. Merely naming a regular base entity `ZI_...`
does not make it a released BO interface.

### 11.3 Naming conventions do not establish semantics

Common project naming:

```text
ZI_*   interface/base-style CDS entity
ZC_*   consumption/service projection
ZR_*   root or reuse-oriented entity in some projects
```

These prefixes help humans but do not control RAP. The DDL syntax, provider
contract, behavior definitions, and release contract establish the technical
role.

---

## 12. Field Exposure and Information Boundaries

### 12.1 Excluding internal fields

The base entity may need an internal processing field:

```abap
Request.internal_processing_code as InternalProcessingCode
```

The service projection can omit it:

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
      TransactionCurrency
}
```

Omission reduces the field surface of this projection. It does not by itself
establish the entire security model. DCL, modification authorization, released
API boundaries, and service configuration must also be designed correctly.

### 12.2 Projection as consumer contract

Create separate projections when consumers require genuinely different
contracts:

```text
Processor UI projection
  editable business fields, internal workflow status, processor actions

Requester UI projection
  requester-visible fields and requester actions

Integration API projection
  stable machine contract, API-safe navigation, no UI-only design
```

Avoid creating projections that differ only cosmetically if one stable contract
and metadata extension would be sufficient. Every public contract creates
lifecycle and compatibility responsibilities.

### 12.3 Do not put business invariants in the projection

A projection can omit a field or operation, but another EML consumer or
projection might still reach the base BO. Therefore rules such as these belong
to base behavior:

- submitted request must contain at least one valid item;
- item product must exist;
- requested quantity must be positive;
- total amount must equal the sum of item amounts;
- status transition must follow the permitted state machine.

Projection is exposure. Behavior is enforcement.

---

## 13. Entered, Derived, and Technical Fields

Classify every element before implementing the model:

| Classification    | Example              | Source of truth         | Typical behavior                    |
| ----------------- | -------------------- | ----------------------- | ----------------------------------- |
| Entered           | `SoldToParty`        | Consumer input          | Editable, validated                 |
| Entered           | `RequestedQuantity`  | Consumer input          | Mandatory on create, validated      |
| Derived           | `UnitPrice`          | Pricing/reference logic | Read-only, determined               |
| Derived           | `NetAmount`          | Quantity × price logic  | Read-only, determined               |
| Aggregate-derived | `TotalAmount`        | Sum of item amounts     | Read-only, determined from children |
| Lifecycle         | `Status`             | BO state machine        | Changed by controlled action        |
| Technical         | `RequestUUID`        | Numbering/framework     | Read-only, generated                |
| Administrative    | `LocalLastChangedAt` | RAP runtime             | Read-only, ETag candidate           |

The CDS model exposes the typed fields. The behavior definition and behavior
pool turn this classification into executable controls.

Incorrect pseudo-syntax:

```abap
TotalAmount [derived]
UnitPrice   [entered]
```

RAP does not use these brackets. A real implementation combines:

```text
CDS element
  + behavior field control
  + determination/validation/action
  + UI metadata where useful
```

---

## 14. Access Control Boundary

### 14.1 Authorization-check annotation

```abap
@AccessControl.authorizationCheck: #CHECK
```

This annotation tells CDS access control how access to the entity should be
handled. A DCL role can restrict result rows when that entity is accessed as
the authorization-relevant entity.

It is not equivalent to RAP modification authorization.

```text
CDS DCL
  Which rows can the user read through this CDS access?

RAP authorization control
  May the user create, update, delete, or execute this operation?
```

### 14.2 Access control is evaluated at the accessed entity

Do not assume a lower CDS entity's DCL is automatically inherited through
every higher-level CDS entity. Define and test authorization at the actual
consumption entity and service boundary.

### 14.3 Association exposure and data exposure

Publishing `_Customer` allows consumers to request navigation if the service
exposes a reachable target. It is therefore part of the information surface.
Review associations with the same care as scalar fields.

---

## 15. Query Semantics and Performance

### 15.1 Association-on-demand does not remove SQL cost

```text
Association only exposed
  no target join required until consumer uses navigation/path

Target field selected through path
  database join is generated
```

Evaluate the generated query when a projection contains:

- multiple to-many paths;
- calculated elements over joined data;
- filters on associated entities;
- large text/value-help targets;
- nested expansions from OData;
- associations whose declared cardinality does not match data.

### 15.2 To-many joins can change result grain

Suppose one item has two schedule lines:

```text
Item 10  NetAmount 100
  Schedule 1
  Schedule 2
```

Joining item to schedule-line grain yields two rows containing the same item
amount. A naïve sum returns 200 instead of 100.

The problem is not fixed by declaring the item key in CDS. The query must
aggregate at the correct grain or separate item and schedule-line measures.

### 15.3 Prefer explicit grain

For each entity, document:

```text
One row represents: one Sales Order Request item
Key: ItemUUID
Parent identity: RequestUUID
Expected association multiplicity: one Product, many Schedules
```

Most CDS duplication defects are grain defects disguised as join defects.

### 15.4 Measure before denormalizing

Do not copy Customer or Product master fields into the transactional CDS model
solely to avoid associations. Copy data only when the transaction must preserve
a historical snapshot or the domain explicitly owns that value. Otherwise use
released associations and diagnose the actual SQL plan before denormalizing.

---

## 16. Clean-Core and Released-Source Design

In ABAP Cloud, use released CDS entities, released RAP BO interfaces, and other
released APIs as dependencies. A technically reachable classic table or class
is not automatically an allowed clean-core dependency.

```text
Custom RAP BO
  ├── own persistence tables
  ├── released Customer/Product reference CDS entities
  ├── released conversion or business APIs
  └── explicit projection and release contract
```

For an SD-inspired portfolio model, distinguish clearly between:

- a custom training object that resembles a Sales Order Request;
- a projection over released SAP business data;
- a released transactional SAP BO interface used through EML;
- direct access to classic SD persistence such as `VBAK` or `VBAP`.

These are different architectures. Do not present a custom RAP aggregate as an
extension of the standard SAP Sales Order unless the target system and released
extension contracts actually support that design.

---

## 17. Activation and Dependency Order

A practical bottom-up activation sequence is:

```text
1. Data elements/domains and database tables
2. Independent reference CDS entities
3. Child base CDS entities where dependencies allow
4. Root base CDS and completed composition topology
5. Base behavior definition and behavior pool
6. Child projection views
7. Root projection and redirections
8. Behavior projection
9. Metadata extension
10. Service definition and service binding
```

Circular root/child CDS dependencies are handled by the ADT activation process
and the repository object's supported creation flow. Activate related objects
together when necessary.

Activation:

- performs syntax and dependency checks;
- creates an active repository version;
- does not publish an OData endpoint;
- does not transport the artifact to another system;
- does not deploy a separate Fiori application.

---

## 18. Technical Diagnostics

### 18.1 Field is missing from OData metadata

Trace from the service inward:

```text
Service Definition
  Is the intended projection entity exposed?
        │
        ▼
CDS Projection
  Is the field in the projection list?
        │
        ▼
Base CDS
  Does the field exist and activate with the expected type?
        │
        ▼
Service Binding
  Is the correct active service version published?
```

If the field exists in the base entity but not the projection, omission is
working as designed.

### 18.2 Navigation target is incorrect or absent

Check:

1. root composition exists and is exposed in the base entity;
2. child contains the correct `association to parent`;
3. projection root redirects to the projected composition child;
4. projection child redirects to the projected parent;
5. both projected nodes are exposed where the service requires them;
6. service metadata points to the projected entity set;
7. `ON` conditions use the correct projected keys.

Do not begin by inspecting database rows if the navigation is absent from
`$metadata`; that is first a modeling or exposure defect.

### 18.3 Duplicate root or item rows

Check:

1. the declared row grain;
2. key uniqueness in the actual query result;
3. to-many associations consumed as path fields;
4. joins missing part of their conditions;
5. incorrect cardinality declarations;
6. language-dependent text joins without a language condition;
7. aggregation after a one-to-many expansion.

### 18.4 Association returns no target

Check:

```text
Source foreign-key value
  → target key format and conversion
  → complete ON condition
  → client/language/context fields
  → target data exists
  → DCL visibility
  → service target exposure
```

An empty association target is not automatically a redirection problem.

### 18.5 Amount displays incorrectly

Verify:

1. amount field type and decimal definition;
2. currency element type;
3. exact annotation element name and case;
4. both fields are projected;
5. metadata contains the semantic dependency;
6. stored currency/value pair is internally consistent;
7. no missing currency conversion is being mistaken for formatting.

### 18.6 Consumer can edit a derived field

The fix is not a CDS marker. Check the base behavior field control and behavior
projection, then verify the service metadata. Keep the derivation in one
backend behavior path so UI, API, and EML consumers observe the same result.

---

## 19. Common Modeling Errors

### 19.1 Defining the child as another root

Incorrect:

```abap
define root view entity ZI_SalesOrderItem ...
```

Use a non-root view entity with `association to parent` when Item is owned by
the Sales Order Request aggregate.

### 19.2 Using singular composition cardinality for a collection

Incorrect for a normal order:

```abap
composition [0..1] of ZI_SalesOrderItem as _Items
```

Use `[0..*]` when the root may contain multiple items.

### 19.3 Exposing an association name that was never defined

Incorrect:

```abap
_SalesOrderRequest,
_Product
```

when the definitions use `_Request` and contain no `_Product` association.
Association aliases must be consistent across the definition, select list,
behavior model, projection, and code.

### 19.4 Repeating scalar fields

Incorrect:

```abap
Request.status as Status,
Status,
```

The first line already defines the projected element. A duplicate element name
causes an activation problem.

### 19.5 Referencing persistence aliases inside a projection

Incorrect:

```abap
define root view entity ZC_SalesOrderRequest
  as projection on ZI_SalesOrderRequest
{
  Request.request_uuid as RequestUUID
}
```

The projection source is `ZI_SalesOrderRequest`, so project its element names:

```abap
{
  key RequestUUID,
      RequestNumber
}
```

### 19.6 Treating semantic annotations as calculations

`@Semantics.amount.currencyCode` does not calculate an amount. Declare a RAP
determination or use another appropriate calculation source.

### 19.7 Assuming a value help enforces the invariant

A consumer can bypass the UI. Preserve the value help for usability and enforce
the rule through backend validation.

### 19.8 Treating projection omission as complete security

Omitting a field narrows one contract. It does not replace DCL, RAP
authorization, released-object governance, or secure service design.

### 19.9 Treating cardinality as observed row count

Cardinality is a statement of the expected relationship, not a live counter.
Test the data and `ON` condition before relying on it.

### 19.10 Treating names as framework configuration

`ZI_`, `ZC_`, `_Items`, and `_Customer` communicate intent but do not activate
RAP features. Keywords, provider contracts, behavior definitions, and service
artifacts provide the executable contract.

---

## 20. Design Review Checklist

### Base model

- Each entity has a documented row grain.
- CDS keys match the actual result uniqueness.
- Technical column aliases express stable business meaning.
- The root represents the aggregate consistency boundary.
- Owned children use composition.
- Each composition child has the correct association to parent.
- Independent master/reference objects use ordinary associations.
- Association `ON` conditions include the complete identity.
- Cardinalities describe real data expectations.
- Amount/currency and quantity/unit pairs are modeled together.
- Technical and administrative fields are available where behavior needs them.

### Projection model

- Provider contract is explicit.
- Only consumer-relevant fields and associations are exposed.
- Keys required for identity remain projected.
- Root/child associations are redirected to projected nodes.
- Internal fields are omitted unless the consumer genuinely needs them.
- The projection does not attempt to enforce base business invariants.
- A separate projection exists only when it represents a real contract.

### Runtime and operations

- DCL is defined and tested at the actual accessed entity.
- Behavior field control protects derived and technical fields.
- Backend validation protects reference integrity and state-dependent rules.
- To-many navigation does not silently change the result grain.
- Generated SQL and OData expansions are measured for important access paths.
- Dependencies use released APIs when ABAP Cloud or clean-core rules require it.

---

## 21. Compact Model Map

```text
PERSISTENCE

zsor_request                              zsor_item
  request_uuid                              item_uuid
  request_number                            request_uuid
  sold_to_party                             product
  status                                    requested_quantity
  total_amount                              unit_price
  currency                                  net_amount
      │                                         │
      ▼                                         ▼

BASE CDS BUSINESS OBJECT

ZI_SalesOrderRequest                    ZI_SalesOrderItem
  root                                    child
  key RequestUUID                         key ItemUUID
  composition _Items ───────────────────> association to parent _Request
  association _Customer                  association _Product
  TotalAmount + Currency                 Quantity + Unit
                                         NetAmount + Currency
      │                                         │
      ▼                                         ▼

CONSUMER PROJECTION

ZC_SalesOrderRequest                    ZC_SalesOrderItem
  transactional_query                    transactional_query
  selected fields                        selected fields
  _Items redirected ───────────────────> projected child
                       <──────────────── _Request redirected
      │
      ▼

BEHAVIOR PROJECTION + SERVICE EXPOSURE
```

The model should be read as three separate decisions:

```text
Composition decides ownership.
Association decides navigation to an independent entity.
Projection decides which part of the reusable model a consumer receives.
```
