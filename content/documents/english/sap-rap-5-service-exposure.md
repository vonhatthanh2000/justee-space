---
title: SAP RAP Service Exposure and Fiori Elements
part: RAP
summary: This document explains how a reusable RAP business object becomes a consumer-facing OData service and a metadata-driven SAP Fiori elements application. It covers service projections, behavior projections, metadata extensions, value helps, side effects, service definitions, service bindings, OData V4 UI and Web API contracts, publication, and runtime diagnosis.
category: Technical
tags:
  - sap
  - rap
publishedAt: 2026-09-12
---

# SAP RAP Service Exposure and Fiori Elements — Technical Reference

This document explains how a reusable RAP business object becomes a
consumer-facing OData service and a metadata-driven SAP Fiori elements
application. It covers service projections, behavior projections, metadata
extensions, value helps, side effects, service definitions, service bindings,
OData V4 UI and Web API contracts, publication, and runtime diagnosis.

The central exposure principle is:

> A service projection defines the data and behavior contract for one
> consumption scenario. A service definition groups the entities exposed by
> that contract. A service binding chooses the protocol and service category.
> UI annotations describe presentation; they do not implement or secure the
> underlying business rules.

Primary SAP sources:

- [SAP Help — Business Object Projection](https://help.sap.com/docs/abap-cloud/abap-rap/business-object-projection-6e7a10d30b74412a9482a80b0b88e005-194)
- [SAP Help — Metadata-Driven UI Annotations](https://help.sap.com/docs/abap-cloud/abap-rap/defining-cds-annotations-for-metadata-driven-uis)
- [SAP Help — Providing Value Help](https://help.sap.com/docs/abap-cloud/abap-rap/providing-value-help-for-selection-fields)
- [SAP Help — Side Effects](https://help.sap.com/docs/abap-cloud/abap-rap/side-effects)
- [SAP Help — Service Definition](https://help.sap.com/docs/abap-cloud/abap-rap/service-definition)
- [SAP Help — Business Service](https://help.sap.com/docs/abap-cloud/abap-rap/business-service)
- [SAP Help — OData V4 Service Binding Editor](https://help.sap.com/docs/abap-cloud/abap-development-tools-user-guide/using-service-binding-editor-for-odata-v4-service)

---

## 1. Consumer-Facing RAP Stack

```text
Reusable RAP BO
  Base CDS + Base BDEF + Behavior Pool
                    │
                    ▼
Service Projection
  CDS Projection + Behavior Projection
                    │
                    ├──────── Metadata Extension
                    │          UI semantics
                    │
                    ▼
Service Definition
  entity exposure and service aliases
                    │
                    ▼
Service Binding
  OData V4 UI / OData V4 Web API / other supported type
                    │
                    ▼
Published endpoint and metadata
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
Fiori elements UI       External API consumer
```

Each artifact makes a different decision:

| Artifact            | Decision                                                    |
| ------------------- | ----------------------------------------------------------- |
| CDS projection      | Which fields and relationships this consumer sees           |
| Behavior projection | Which BO capabilities this consumer may call                |
| Metadata extension  | How a metadata-driven UI presents the model                 |
| Service definition  | Which CDS entities belong to the service                    |
| Service binding     | Which protocol and service category expose it               |
| Fiori application   | How users navigate and interact with the published contract |

The service layer does not replace the BO. It exposes a selected view of it.

---

## 2. Business Object Projection

### 2.1 Purpose

A BO projection adapts a reusable business object for one service use case.

```text
Base SalesOrderRequest BO
  create, update, delete, Submit, Cancel, Approve, internal fields
                         │
          ┌──────────────┼────────────────┐
          ▼              ▼                ▼
Requester UI       Processor UI       Integration API
  Create              Approve            stable machine fields
  Edit draft           Reject             Submit
  Submit               internal status    no UI-only annotations
```

The base BO remains the invariant and transaction boundary. Each projection
can narrow fields, navigation, and operations.

### 2.2 CDS projection

```abap
@EndUserText.label: 'Sales Order Request UI'
@AccessControl.authorizationCheck: #CHECK
@Metadata.allowExtensions: true
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

The projection:

- exposes consumer-relevant fields;
- redirects the composition to projected child nodes;
- can add consumer-specific aliases and annotations where supported;
- omits implementation-only fields;
- forms the data side of the service contract.

`transactional_query` means this projection is intended as a transactional
service-consumption layer. It does not mean the entity is read-only.

### 2.3 Behavior projection

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

The behavior projection exposes capabilities already supported by the
underlying BO. Omitting `use action Submit` prevents this projection's OData
consumer from calling the base action.

### 2.4 Projection is not business-rule enforcement

Omitting `TotalAmount` or `Cancel` can narrow one service. Another projection
or EML consumer may still reach the base BO. Therefore these rules remain in
base behavior:

- Customer must be valid;
- quantity must be positive;
- calculated amount must be consistent;
- only permitted status transitions may be saved;
- user must be authorized for the operation.

Projection decides exposure. Base behavior guarantees correctness.

---

## 3. Metadata Extensions

### 3.1 Purpose

A metadata extension, or MDE, stores annotations separately from the CDS data
definition:

```abap
@Metadata.layer: #CORE
@UI.headerInfo: {
  typeName:       'Sales Order Request',
  typeNamePlural: 'Sales Order Requests',
  title:          { type: #STANDARD, value: 'RequestNumber' },
  description:    { value: 'SoldToParty' }
}
annotate entity ZC_SalesOrderRequest with
{
  ...
}
```

This separation keeps the reusable semantic/query model readable while
allowing the UI contract to evolve in its own repository object.

### 3.2 Enabling extensions

The annotated CDS entity normally allows metadata extensions:

```abap
@Metadata.allowExtensions: true
define root view entity ZC_SalesOrderRequest ...
```

The effective annotation set can include:

- annotations declared directly on source entities;
- propagated annotations;
- annotations declared on the projection;
- annotations from metadata extensions at defined layers.

Use ADT's Active Annotations view when the runtime result differs from the
source file being inspected.

### 3.3 Metadata layers

`@Metadata.layer` participates in annotation layering and precedence. Select
the layer that matches ownership of the artifact rather than using one value
for every extension without understanding its purpose.

In a custom application, `#CORE` commonly represents the application owner's
base UI semantics. Partner and customer adaptation layers have different
ownership expectations where supported.

### 3.4 Metadata extension does not execute ABAP

An MDE can:

- place fields in a list report or object page;
- define labels, importance, facets, and action placement;
- describe text and value-help behavior;
- hide a field from a generated UI;
- instruct a client about refresh dependencies.

It cannot:

- calculate `NetAmount`;
- reject an invalid Customer as a universal BO invariant;
- authorize a user;
- commit a transaction;
- update a database table;
- create a service endpoint.

---

## 4. Core Fiori Elements Annotations

### 4.1 `@UI.lineItem`

Controls columns or actions in a list/table presentation:

```abap
@UI.lineItem: [ { position: 10, importance: #HIGH } ]
RequestNumber;
```

Typical use:

```text
List report table
  RequestNumber | Customer | Status | TotalAmount
```

`position` establishes relative order. `importance` helps responsive clients
decide what to retain when screen space becomes constrained.

### 4.2 `@UI.identification`

Defines fields or actions associated with the object identity/detail area:

```abap
@UI.identification: [ { position: 10 } ]
RequestNumber;
```

It is commonly rendered on an object page, but exact rendering remains a
consumer responsibility.

### 4.3 `@UI.selectionField`

Defines fields proposed for the filter bar:

```abap
@UI.selectionField: [ { position: 10 } ]
Status;
```

This makes the field available prominently for selection. It does not add a
backend authorization restriction.

### 4.4 `@UI.facet`

Defines object-page sections and navigation structure:

```abap
@UI.facet: [
  {
    id:       'General',
    purpose:  #STANDARD,
    type:     #IDENTIFICATION_REFERENCE,
    label:    'General Information',
    position: 10
  },
  {
    id:            'Items',
    purpose:       #STANDARD,
    type:          #LINEITEM_REFERENCE,
    label:         'Items',
    position:      20,
    targetElement: '_Items'
  }
]
RequestUUID;
```

The Item facet requires a valid projected composition and service navigation.
An annotation cannot compensate for a broken `_Items` relationship.

### 4.5 `@UI.fieldGroup`

Groups related fields into a reusable UI collection:

```abap
@UI.fieldGroup: [ { qualifier: 'Commercial', position: 10 } ]
SoldToParty;
```

A facet can reference the qualified group to form an object-page section.

### 4.6 `@UI.hidden`

```abap
@UI.hidden: true
LocalLastChangedAt;
```

This removes the field from ordinary generated presentation. The field can
still remain in OData metadata and be used technically, for example as an
ETag. UI hiding is not a security control.

---

## 5. Complete Root Metadata Example

```abap
@Metadata.layer: #CORE

@UI.headerInfo: {
  typeName:       'Sales Order Request',
  typeNamePlural: 'Sales Order Requests',
  title:          { type: #STANDARD, value: 'RequestNumber' },
  description:    { value: 'Status' }
}

annotate entity ZC_SalesOrderRequest with
{
  @UI.facet: [
    {
      id:       'General',
      purpose:  #STANDARD,
      type:     #IDENTIFICATION_REFERENCE,
      label:    'General Information',
      position: 10
    },
    {
      id:            'Items',
      purpose:       #STANDARD,
      type:          #LINEITEM_REFERENCE,
      label:         'Items',
      position:      20,
      targetElement: '_Items'
    }
  ]
  RequestUUID;

  @UI: {
    lineItem:       [ { position: 10, importance: #HIGH } ],
    identification: [ { position: 10 } ]
  }
  @EndUserText.label: 'Request'
  RequestNumber;

  @UI: {
    lineItem:       [ { position: 20, importance: #HIGH } ],
    identification: [ { position: 20 } ],
    selectionField: [ { position: 10 } ]
  }
  @EndUserText.label: 'Sold-to Party'
  SoldToParty;

  @UI: {
    lineItem:       [ { position: 30, importance: #HIGH } ],
    identification: [ { position: 30 } ],
    selectionField: [ { position: 20 } ]
  }
  Status;

  @UI: {
    lineItem:       [ { position: 40, importance: #HIGH } ],
    identification: [ { position: 40 } ]
  }
  TotalAmount;

  @UI.hidden: true
  RequestUUID;

  @UI.hidden: true
  LocalLastChangedAt;
}
```

The amount/currency relationship should already exist in the CDS semantic
model. The UI annotation places `TotalAmount`; it does not need to recreate the
calculation.

---

## 6. Child Metadata and Composition Rendering

```abap
@Metadata.layer: #CORE
annotate entity ZC_SalesOrderItem with
{
  @UI.lineItem: [ { position: 10, importance: #HIGH } ]
  Product;

  @UI.lineItem: [ { position: 20, importance: #HIGH } ]
  RequestedQuantity;

  @UI.lineItem: [ { position: 30, importance: #MEDIUM } ]
  UnitPrice;

  @UI.lineItem: [ { position: 40, importance: #HIGH } ]
  NetAmount;

  @UI.hidden: true
  ItemUUID;

  @UI.hidden: true
  RequestUUID;

  @UI.hidden: true
  LocalLastChangedAt;
}
```

For the object page to render editable Items correctly, all of these layers
must align:

```text
Base CDS composition
  → base BDEF create-by-association
  → projected CDS redirection
  → projected BDEF association create
  → service entity exposure/navigation
  → root facet targets `_Items`
  → child has `@UI.lineItem`
```

A problem at any layer can appear as a missing table, missing Create button,
empty navigation, or read-only child section.

---

## 7. UI Actions

### 7.1 Action placement

The action must exist in base behavior and be used in the behavior projection.
Metadata can then place it:

```abap
@UI.lineItem: [
  {
    type:     #FOR_ACTION,
    dataAction: 'Submit',
    label:    'Submit',
    position: 50
  }
]
RequestNumber;
```

Action naming in metadata must match the service-visible action name, including
any projection aliasing or external naming.

### 7.2 End-to-end action visibility

```text
Base BDEF
  action Submit
       │
       ▼
Behavior Projection
  use action Submit
       │
       ▼
OData metadata
  action import/bound action contract
       │
       ▼
UI annotation
  #FOR_ACTION + dataAction
       │
       ▼
Fiori button
```

### 7.3 Feature control

Instance feature control can disable Submit when Status is already Submitted.
The UI consumes the result and adjusts affordance. Backend behavior remains the
source of truth; do not implement the state rule only as frontend visibility.

---

## 8. Texts and Text Arrangement

### 8.1 Code and description

Business fields often contain a compact key and a human-readable text:

```text
Product = HT-1000
ProductName = Notebook Basic 15
```

CDS associations and text annotations allow consumers to present both without
copying the text into transactional persistence.

### 8.2 Text arrangement

```abap
@UI.textArrangement: #TEXT_LAST
Product;
```

Possible arrangements depend on supported metadata and can favor:

- key only;
- text only;
- text followed by key;
- key followed by text.

The annotation controls presentation. It does not change the stored Product ID.

### 8.3 Historical snapshot boundary

Use a live association when the UI should show the current master-data text.
Persist a copied description only when the transaction has a genuine historical
snapshot requirement. Those are different domain semantics.

---

## 9. Value Help

### 9.1 Purpose

A value help connects an input field to a lookup provider:

```abap
@Consumption.valueHelpDefinition: [
  {
    entity: {
      name:    'ZI_CustomerValueHelp',
      element: 'CustomerID'
    }
  }
]
SoldToParty;
```

The consumer can query the provider, display key/text/filter columns, and copy
the selected key into `SoldToParty`.

### 9.2 Provider model

```abap
@EndUserText.label: 'Customer Value Help'
@ObjectModel.resultSet.sizeCategory: #XS
define view entity ZI_CustomerValueHelp
  as select from ZI_CustomerReference
{
  key CustomerID,
      CustomerName,
      CountryCode
}
```

A good value-help provider has:

- stable key element;
- useful descriptive text;
- fields required for search/filter/display;
- correct authorization behavior;
- an appropriate result-set shape and size strategy;
- no accidental exposure of sensitive master data.

### 9.3 Service exposure

The value-help provider must be reachable through the service contract when
the consumer needs to query it. In many RAP OData services, that means exposing
the provider entity in the service definition:

```abap
expose ZI_CustomerValueHelp as CustomerValueHelp;
```

Defining the annotation alone does not publish an entity set.

### 9.4 `useForValidation: true`

```abap
@Consumption.valueHelpDefinition: [
  {
    entity: {
      name:    'ZI_CustomerValueHelp',
      element: 'CustomerID'
    },
    useForValidation: true
  }
]
SoldToParty;
```

This marks the value-help definition for validation of user input. Supported
consumer/framework processing can check entered values against the provider's
allowed result set.

It does not replace a RAP behavior validation when:

- validity depends on Status, date, Sales Area, role, or other BO state;
- the rule must protect direct EML and every service projection;
- the provider list is a convenience subset rather than the domain truth;
- the rule requires a precise backend error message;
- security or transactional consistency is involved;
- the referenced object can change between input and save.

Use value-help validation for the lookup constraint and backend validation for
the durable business invariant.

### 9.5 Additional binding

A value help can pass context fields into or out of the provider, for example
filtering Product by Sales Organization or returning a related Unit. Model
those bindings explicitly and ensure their fields are exposed in the service
metadata.

Do not hide a missing business determination inside a value-help side effect.
Returned values should have a clearly owned source of truth.

---

## 10. Why a Service Definition May Expose Reference Entities

Representative Travel service:

```abap
define service ZUI_TRAVEL {
  expose ZC_Travel      as Travel;
  expose ZC_Booking     as Booking;
  expose ZI_AgencyVH    as Agency;
  expose ZI_CustomerVH  as Customer;
  expose ZI_FlightVH    as Flight;
  expose I_Currency     as Currency;
  expose I_Country      as Country;
}
```

Reference entities can be exposed because the consumer needs them for:

- value-help queries;
- text retrieval;
- direct navigation targets;
- filtering or autocomplete;
- dependent lookup fields;
- service metadata relationships;
- an API operation that legitimately reads the reference collection.

Do not expose every CDS association automatically. Expose an entity when the
service contract requires it and when its authorization/data surface is safe.

The correct rule is broader than “expose it only when it appears as a scalar
field in the projection.” A provider may need exposure even when used through
value help or navigation rather than displayed as a root field.

---

## 11. Service Definition

### 11.1 Responsibility

A service definition is a protocol-independent repository object that groups
the CDS entities exposed by one business service.

```abap
@EndUserText.label: 'Sales Order Request UI Service'
@ObjectModel.leadingEntity.name: 'ZC_SalesOrderRequest'
define service ZUI_SALESORDERREQUEST {
  expose ZC_SalesOrderRequest as SalesOrderRequests;
  expose ZC_SalesOrderItem    as SalesOrderItems;
  expose ZI_CustomerValueHelp as Customers;
  expose ZI_ProductValueHelp  as Products;
  expose I_Currency           as Currencies;
}
```

The service definition decides:

- which entity models belong to this service;
- their service-visible aliases;
- the primary/leading entity where declared;
- which navigation and lookup targets can become reachable.

It does not decide:

- whether the service uses OData V2 or V4;
- whether it is a UI service or Web API;
- the HTTP endpoint URL;
- how CRUD is implemented;
- whether the current user is authorized;
- whether the service is published.

### 11.2 Service aliases

```abap
expose ZC_SalesOrderRequest as SalesOrderRequests;
```

The alias decouples the external entity-set name from the CDS technical object
name. Choose a stable consumer-oriented name and treat changes as API contract
changes.

### 11.3 Complete service graph

For a composition-based UI, expose all nodes needed by the business service.
The root alone is not always sufficient when child entity sets, navigation,
metadata, or value helps must be reachable.

At the same time, exposure should be minimal. Every extra entity adds:

- metadata and compatibility surface;
- possible direct query access;
- authorization and performance responsibility;
- maintenance and release obligations.

---

## 12. Service Binding

### 12.1 Responsibility

A service binding assigns the service definition to a supported protocol and
service category.

```text
Service Definition
  protocol-independent model
         │
         ├── OData V4 UI binding
         ├── OData V4 Web API binding
         └── another supported binding type
```

One service definition can be used by multiple bindings when the same service
contract is appropriate. If UI and integration consumers require materially
different fields, operations, versioning, or lifecycle promises, use separate
projections and often separate service definitions rather than forcing one
oversized contract.

### 12.2 OData V4 UI

Designed for metadata-driven user interfaces such as Fiori elements. It
consumes UI annotations, draft metadata, actions, value helps, side effects,
messages, field control, and navigation.

### 12.3 OData V4 Web API

Designed for machine-to-machine consumption. Its contract should emphasize:

- stable external names;
- explicit operation semantics;
- controlled versioning;
- predictable messages and HTTP outcomes;
- API authorization;
- idempotency and concurrency behavior;
- minimal UI-specific metadata.

A UI projection is not automatically a good public API merely because both use
OData V4.

### 12.4 OData V2 and `@OData.publish: true`

Older examples often use OData V2 or `@OData.publish: true`. Current RAP design
normally favors explicit service definitions and bindings because they provide
a clearer service contract, category, protocol choice, versioning, and
publication lifecycle.

Do not copy an older workshop's V2 binding solely because the sample predates
OData V4 support. Confirm the target ABAP release and consumer requirement.

---

## 13. Metadata Request Runtime

```text
Fiori client requests $metadata
            │
            ▼
Published Service Binding
            │
            ▼
Service Definition
  exposed entity aliases and relationships
            │
            ▼
CDS Projection + Behavior Projection
  fields, navigation, actions, field/ETag/draft contract
            │
            ▼
Metadata Extension + annotations
  line items, facets, labels, value help, side effects
            │
            ▼
OData metadata document
            │
            ▼
Fiori elements generates list/object-page behavior
```

No behavior-pool method is normally called merely to compile static metadata.
Dynamic feature or authorization requests occur when the client asks for the
corresponding runtime permissions or data.

### 13.1 Metadata caching

After changing CDS, behavior projection, or annotations:

- activate all dependent artifacts;
- verify the intended service version is published;
- inspect live `$metadata` rather than only source code;
- refresh or clear relevant client metadata caches;
- confirm the browser is calling the expected endpoint.

Many apparent annotation defects are stale-metadata defects.

---

## 14. Query and Navigation Runtime

### 14.1 List report read

```text
Fiori GET SalesOrderRequests
  → OData V4 binding
  → service entity alias
  → CDS transactional query projection
  → CDS access control and query runtime
  → database query
  → OData response
  → lineItem rendering
```

The normal CDS-backed query path does not require a behavior-pool read method
for a managed query.

### 14.2 Object-page navigation

```text
Select one Request
  → GET by key
  → object-page identification/facets rendered
  → expand or navigate `_Items`
  → projected composition target
  → child query
  → child line items rendered
```

### 14.3 Value-help request

```text
User opens SoldToParty value help
  → metadata identifies provider entity/element
  → client queries Customers entity set
  → DCL and service authorization apply
  → search/filter/order/page options processed
  → key and text returned
  → selected CustomerID copied to SoldToParty
```

The provider may return no values because of authorization or filters even when
the underlying table contains records.

---

## 15. Side Effects

### 15.1 Purpose

Side effects describe which fields, entities, permissions, or messages should
be refreshed after a source value or action changes.

```text
RequestedQuantity changes
  → determination recalculates NetAmount
  → root aggregation recalculates TotalAmount
  → side-effect metadata tells UI what to reread
```

The determination performs the calculation. The side effect synchronizes the
consumer presentation with backend state.

### 15.2 Representative declaration

Exact supported syntax depends on the BDEF and target release, but the model is:

```abap
side effects
{
  field RequestedQuantity affects field NetAmount;
  field UnitPrice affects field NetAmount;
  action Submit affects field Status, permissions ( action Submit );
}
```

Cross-entity dependencies can require association or entity targets supported
by the release and service protocol.

### 15.3 Side effects are not determinations

```text
Determination
  changes backend BO state

Side effect
  declares consumer refresh dependency
```

If a side effect exists but no backend logic updates `NetAmount`, the reread
returns the same value. If determination exists but side effects are missing,
the backend state can be correct while the UI continues showing an old value.

---

## 16. Security Boundaries

### 16.1 UI hiding

`@UI.hidden: true` controls presentation. A malicious or custom client can
still inspect or request an OData property if the service exposes it and the
protocol permits access.

### 16.2 Projection omission

Omitting `InternalProcessingCode` from the CDS projection removes it from that
service contract. This is stronger than UI hiding but still does not replace
authorization for remaining fields and operations.

### 16.3 CDS DCL

DCL restricts readable rows for the CDS entity where it is applied. Test the
actual consumption entity; do not assume access controls automatically
propagate through every view stack.

### 16.4 RAP authorization

RAP authorization controls create, update, delete, associations, actions, and
other modifying capabilities based on the current user and context.

### 16.5 Value-help security

A value-help entity is a query surface. Apply appropriate authorization and
expose only the columns needed for selection. Do not treat lookup data as
automatically harmless.

```text
UI annotation     presentation
Projection        contract surface
DCL               read-row restriction
RAP authorization modify-operation permission
Backend validation business invariant
```

All five can be required in one service.

---

## 17. Activate, Publish, Transport, and Deploy

### 17.1 Activate

Creates the active repository version after syntax and dependency checks.

```text
CDS/MDE/BDEF/service source
  → Activate in ADT
  → active ABAP repository object
```

Activation does not make an OData endpoint externally available by itself.

### 17.2 Publish

Publishing a service binding enables/registers the service endpoint in the
connected ABAP system according to that environment's lifecycle.

```text
Active service definition + binding
  → Publish
  → callable local system endpoint/version
```

### 17.3 Transport

Transport moves repository and configuration artifacts through the system
landscape, for example development to quality to production. Local publication
status and environment-specific service setup can still require lifecycle
handling in each target system.

### 17.4 Deploy

Deployment often refers to delivering a separate frontend application to its
runtime or making a complete solution available. It is not a synonym for ABAP
artifact activation.

```text
Activate  repository code becomes active in one ABAP system
Publish   service endpoint becomes available in that system
Transport artifacts move between ABAP systems
Deploy    separate application/content reaches its target runtime
```

---

## 18. Fiori Elements Preview

The service-binding editor can launch a Fiori elements preview for suitable UI
services. Preview is valuable for validating:

- entity-set availability;
- list report columns;
- object-page facets;
- composition navigation;
- value helps;
- draft actions;
- action placement;
- field control and messages;
- side-effect refresh.

Preview is not a substitute for a production Fiori application. It does not
prove:

- launchpad role/catalog configuration;
- semantic-object and target-mapping correctness;
- production authorization roles;
- frontend deployment and routing;
- accessibility and UX review;
- API compatibility;
- performance under real volume.

---

## 19. End-to-End Sales Order Request UI Flow

### 19.1 Open list report

```text
1. Browser loads Fiori elements application.
2. Client requests OData `$metadata`.
3. Service binding resolves ZUI_SALESORDERREQUEST.
4. Metadata describes SalesOrderRequests, Items, actions, value helps, and UI.
5. Client requests SalesOrderRequests with query options.
6. RAP query runtime reads ZC_SalesOrderRequest under DCL.
7. `@UI.lineItem` fields form the table.
```

### 19.2 Create request draft

```text
1. Create visibility comes from projected behavior.
2. Client creates a draft root.
3. Managed RAP assigns RequestUUID and persists draft state.
4. Object page uses headerInfo and identification annotations.
5. SoldToParty value help queries the exposed Customers provider.
6. Item facet navigates through projected `_Items` composition.
```

### 19.3 Change quantity

```text
1. UI PATCH changes RequestedQuantity on draft Item.
2. Behavior determination recalculates NetAmount and TotalAmount.
3. Side-effect metadata tells UI to reread affected fields.
4. Refreshed values are formatted with unit/currency semantics.
5. No active business data changes until activation.
```

### 19.4 Submit

```text
1. Action exists in base BDEF and behavior pool.
2. Behavior projection exposes Submit.
3. UI annotation renders the action button.
4. Instance feature control enables it for eligible Status.
5. RAP authorization checks the user's permission.
6. Handler changes buffered state and returns action result/messages.
7. Draft Prepare/Activate validations protect final persistence.
8. UI refreshes Status and action permissions.
```

---

## 20. Technical Diagnostics

### 20.1 Entity is absent from the service

Check:

```text
CDS projection active
  → service definition `expose`
  → correct service alias
  → service binding references intended definition/version
  → binding published
  → live `$metadata`
  → client endpoint and cache
```

### 20.2 Field is absent

Check:

1. base CDS element;
2. CDS projection list;
3. active metadata annotations;
4. service metadata property;
5. UI annotation placement;
6. client personalization and cache.

If the property is absent from `$metadata`, the defect is before UI rendering.

### 20.3 Create/Edit/Delete button is missing

Check:

1. base BDEF operation;
2. behavior projection `use` declaration;
3. draft actions if draft is enabled;
4. dynamic feature result;
5. RAP authorization result;
6. current service metadata;
7. Fiori page mode and client cache.

### 20.4 Action button is missing

Trace:

```text
Base action declaration
  → behavior-pool method
  → behavior projection `use action`
  → service-visible action name
  → `@UI.lineItem` or `@UI.identification` action annotation
  → feature control
  → live metadata
```

### 20.5 Item facet is empty

Check:

- root facet `targetElement` spelling;
- projected composition redirection;
- child projection and service exposure;
- active/draft navigation context;
- parent/child keys and `ON` condition;
- DCL on child query;
- whether Items exist in the relevant active/draft state.

### 20.6 Value-help icon or values are missing

Check:

1. active `@Consumption.valueHelpDefinition`;
2. exact provider entity and element names;
3. provider exposed/reachable in the service;
4. provider appears in `$metadata`;
5. DCL/authorization permits provider rows;
6. additional-binding fields exist and contain values;
7. search/filter metadata and data types are compatible;
8. browser calls the expected endpoint.

### 20.7 Value accepted by UI but save fails

This can be correct when value help and business validation enforce different
rules. Capture:

- selected provider row;
- `useForValidation` setting;
- current BO Status, Sales Area, date, and other context;
- backend validation message;
- whether the reference changed between selection and save.

The business validation remains authoritative.

### 20.8 Derived value changes in backend but not UI

Check:

```text
Determination actually updates buffer
  → nested EML messages/failures
  → side-effect source field/action
  → affected target field/entity
  → target property exposed
  → UI reread network request
  → response value and metadata cache
```

### 20.9 Works in preview but not launchpad

Inspect the application-level delivery chain:

- deployed frontend application/component;
- destination and service URL;
- OData service activation/publication in the target system;
- launchpad catalog and role;
- semantic object and action;
- target mapping;
- user frontend/backend authorizations;
- cache and gateway error logs;
- transport completeness.

Preview proves the local service/UI metadata path, not the full launchpad setup.

---

## 21. UI and API Contract Design

### 21.1 Separate contracts when promises differ

```text
UI service
  draft editing
  UI annotations
  role-specific actions
  user-facing state messages

Web API
  versioned stable schema
  machine-oriented operation names
  explicit concurrency requirements
  integration authorization
  minimal navigation and lookup surface
```

Reusing one service definition can be appropriate for closely aligned
consumers. Separate projections are appropriate when the contract lifecycle and
exposed capabilities differ materially.

### 21.2 Avoid exposing implementation details

Do not expose:

- internal processing codes without a consumer contract;
- raw administrative fields that consumers do not need;
- direct write access to derived fields;
- unrestricted master-data lookup collections;
- legacy persistence names as public API names;
- actions whose semantics are not stable.

### 21.3 Versioning

Treat service aliases, field types, nullability, actions, navigation paths, and
message behavior as compatibility surface. A published Web API requires a
stronger compatibility policy than a private preview service.

---

## 22. Exposure Review Checklist

### Projection

- CDS projection contains only consumer-relevant fields and navigation.
- `transactional_query` provider contract is explicit.
- Compositions and parents redirect to projected nodes.
- Behavior projection exposes only required operations and actions.
- Derived/internal fields have consistent behavior and visibility.
- UI and API consumers use separate contracts when their promises differ.

### Metadata

- UI annotations are stored in metadata extensions where practical.
- Header, line item, identification, filters, and facets reflect the entity
  grain.
- Item facet targets a valid projected composition.
- Technical fields are hidden for presentation but retained when runtime needs
  them.
- Action metadata matches the service-visible action name.
- Text associations and arrangements do not change stored identity.

### Value help and side effects

- Lookup provider exposes only needed, authorized fields.
- Provider and key element are reachable in the service.
- `useForValidation` is used intentionally and not confused with BO validation.
- Additional bindings pass complete context.
- Determinations calculate; side effects trigger consumer refresh.
- Cross-entity refresh is verified through actual network responses.

### Service

- Service definition exposes the complete required graph and no accidental
  entities.
- External aliases are stable and consumer-oriented.
- Binding type matches UI or API use.
- Intended service version is active and published.
- Live `$metadata` is reviewed after changes.
- Transport and frontend deployment requirements are documented separately.

### Security

- UI hiding is never treated as access control.
- Projection omission, DCL, RAP authorization, and validation are all applied
  at their proper boundaries.
- Value-help endpoints are treated as data APIs.
- Preview and launchpad authorization are tested independently.

---

## 23. Compact Exposure Map

```text
BASE RAP BO

ZI_SalesOrderRequest + Base BDEF + Behavior Pool
  reusable data, operations, invariants, transaction handling
                           │
                           ▼
SERVICE PROJECTION

ZC_SalesOrderRequest       CDS fields/navigation
Projection BDEF            use CRUD/actions/draft
Metadata Extension         lineItem/facet/value help/action/side effect
                           │
                           ▼
SERVICE DEFINITION

SalesOrderRequests
SalesOrderItems
Customers value help
Products value help
Currencies
                           │
                           ▼
SERVICE BINDING

OData V4 UI                Fiori elements metadata-driven application
OData V4 Web API           machine-oriented integration contract
                           │
                           ▼
RUNTIME

$metadata                  contract and annotations
GET                        CDS query + DCL
PATCH/POST/action           RAP behavior + authorization + transaction
value-help GET             lookup provider query
side-effect reread          synchronize UI with backend derivation
```

The consumer layer should always be read through five separate concerns:

```text
Projection narrows the reusable BO.
Metadata describes presentation.
Service definition selects entity exposure.
Service binding selects protocol and service category.
Backend behavior and authorization protect correctness.
```
