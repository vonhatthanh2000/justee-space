---
title: SAP SD Organizational and Master Data
part: ABAP
summary: This document explains how SAP Sales and Distribution combines organizational configuration and reusable master data to establish a valid processing context for a sales transaction. It connects business meaning to classic persistence landmarks, maintenance transactions, runtime determination, diagnostic technique, RAP modeling, and clean-core boundaries.
category: Technical
tags:
  - sap
  - sd
publishedAt: 2026-08-06
---

# SAP SD Organizational Structure and Master Data — Technical Reference

This document explains how SAP Sales and Distribution combines organizational
configuration and reusable master data to establish a valid processing context
for a sales transaction. It connects business meaning to classic persistence
landmarks, maintenance transactions, runtime determination, diagnostic
technique, RAP modeling, and clean-core boundaries.

The central technical principle is:

> Organizational structure defines where a transaction is permitted to run;
> master data supplies reusable facts for that context; the Sales Order stores
> the resulting transactional values.

This reference distinguishes three environments:

- **SAP S/4HANA on-premise or private edition**, where SAP GUI transactions,
  IMG activities, and authorized table inspection are common diagnostic tools.
- **SAP S/4HANA Cloud Public Edition**, where Fiori applications and
  configuration activities replace many classic transaction-code paths.
- **Clean-core extension development**, where released CDS entities, business
  objects, events, and APIs are contracts; internal tables are not.

Primary SAP sources:

- [SAP Learning — Identifying Organizational Units in SAP S/4HANA Sales](https://learning.sap.com/courses/exploring-sap-s-4hana-sales-essentials/identifying-organizational-units-in-sap-s-4hana-sales_ddb48d1e-1f57-46bd-8d13-d8e4ef6d0560)
- [SAP Learning — Maintaining Organizational Units for Delivery Processing](https://learning.sap.com/courses/configuring-delivery-processing-in-sap-s-4hana-sales/maintaining-the-organizational-units-for-delivery-processing)
- [SAP Learning — Managing Business Partners](https://learning.sap.com/courses/customizing-core-settings-in-financial-accounting-in-sap-s4hana/managing-business-partners)
- [SAP Learning — Identifying the Source of Data in a Sales Document](https://learning.sap.com/courses/fundamental-customizing-in-sap-s-4hana-sales/identifying-the-source-of-data-in-a-sales-document)
- [SAP Learning — Applying the Partner Function Concept](https://learning.sap.com/courses/fundamental-customizing-in-sap-s-4hana-sales/applying-the-partner-function-concept)
- [SAP Help — Creating Customer-Material Information Records](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/7b24a64d9d0941bda1afa753263d9e39/3f8bc95360267214e10000000a174cb4.html)
- [SAP Help — Business Partner Address](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/74b0b157c81944ffaac6ebc07245b9dc/e84813a97a3645b38b41d374a17ae713.html)

---

## 1. The Runtime Model

### 1.1 Three kinds of data participate in one order

```text
Organizational configuration
  Which legal and commercial units may work together?
                    │
                    ▼
Master data
  Who is the customer? What is sold? Which context-specific defaults apply?
                    │
                    ▼
Sales Order transaction
  Which values were proposed, derived, copied, overridden, and accepted now?
```

These layers are related but not interchangeable:

| Layer                        | Examples                                                                              | Lifecycle                      | Technical role                                     |
| ---------------------------- | ------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------- |
| Organizational configuration | Company Code, Sales Organization, Sales Area, Plant assignment                        | Relatively stable Customizing  | Defines permitted processing contexts              |
| Master data                  | Business Partner, customer segments, product/material, customer-material relationship | Reusable across transactions   | Supplies identities, classifications, and defaults |
| Transaction data             | Sales Order header, items, partners, schedule lines                                   | Created for one business event | Records the actual agreement and processing state  |

A Sales Order does not continuously calculate every displayed field by joining
the latest master data. During creation or redetermination, the application
obtains values from several sources and places the accepted result in the
document. This is essential for traceability: a later master-data change must
not silently rewrite the commercial meaning of every historical order.

### 1.2 Configuration graph, not a flat list

SAP does not merely check whether each code exists. It checks whether the
required assignments and combinations exist.

```text
Company Code
    └── Sales Organization
          ├── Distribution Channel
          │      └── forms Distribution Chain
          └── Division
                 └── completes Sales Area

Distribution Chain ── permits ── Plant
Plant + Shipping Condition + Loading Group ── determines ── Shipping Point
```

For example, a Sales Organization, Distribution Channel, and Division may each
be valid individually while their exact Sales Area combination is invalid.
This is why technical diagnosis must reconstruct the full runtime key rather
than validate codes one at a time.

---

## 2. Company Code and Sales Organization

### 2.1 Company Code

The Company Code is an independent accounting unit for which a complete set of
financial statements can be produced. In an SD process it establishes the
legal and Financial Accounting context behind the selling organization.

Typical responsibilities include:

- accounting currency and fiscal-year context;
- customer receivables and reconciliation-account processing;
- tax and legal reporting context;
- accounting documents generated through SD integration.

The Company Code is not “the highest level of the whole SAP system.” SAP has
other enterprise structures and higher grouping concepts. Its precise meaning
is the smallest organizational unit for complete external accounting.

### 2.2 Sales Organization

The Sales Organization is the central commercial unit in Sales and
Distribution. It is responsible for selling and distributing products or
services and is commonly used to control commercial reporting, master-data
segments, and sales-document processing.

Standard assignment rule:

```text
One Company Code  ──<  many Sales Organizations
One Sales Organization  ──>  exactly one Company Code
```

This relationship makes the commercial operation accountable to one legal
accounting unit. It does not imply that every sales document in a Company Code
shares the same route to market, product division, pricing, or fulfillment
location.

---

## 3. Sales Area and Distribution Chain

### 3.1 Sales Area

The Sales Area is the exact commercial context in which a sales transaction is
processed:

```text
Sales Organization
      + Distribution Channel
      + Division
      = Sales Area
```

Each component answers a different question:

| Component            | Meaning                          | Example                     |
| -------------------- | -------------------------------- | --------------------------- |
| Sales Organization   | Which commercial unit sells?     | Domestic Sales              |
| Distribution Channel | Through which route to market?   | Wholesale, retail, online   |
| Division             | Which product or service family? | Finished goods, spare parts |

Two recurring misinterpretations should be avoided:

- A Distribution Channel is a commercial route to market, not a truck route or
  shipping method.
- A Division classifies a product/service range; it is not the individual
  material being ordered.

The Sales Area scopes important customer sales data, partner determination,
sales-document processing, and reporting. A valid combination must be
configured explicitly.

### 3.2 Distribution Chain

The Distribution Chain is the smaller combination:

```text
Sales Organization + Distribution Channel = Distribution Chain
```

It omits Division. This distinction matters because some assignments and
master-data views—such as material sales data and the assignment of a Plant for
sales processing—are organized by Sales Organization and Distribution Channel
rather than by the full Sales Area.

### 3.3 Example

```text
Sales Organization: 1000  Domestic Sales
Distribution Channel: 10  Direct Sales
Division: 00              Cross-division products

Distribution Chain: 1000 / 10
Sales Area:          1000 / 10 / 00
```

The combination `1000 / 10 / 00` can be valid while `1000 / 20 / 00` is not,
even if channel `20` exists elsewhere. The assignment is part of the business
rule.

---

## 4. Plant and Shipping Point

### 4.1 Plant

A Plant represents an operational location used by logistics. Depending on the
business it can represent manufacturing, distribution, inventory, service, or
another operational site.

The Plant is deliberately not part of the Sales Area formula:

- Sales Area defines the commercial selling context.
- Plant defines an operational sourcing or fulfillment context.
- One commercial route may use different Plants according to material,
  customer, stock, geography, or business rules.

A Plant is assigned to a Company Code for valuation and accounting purposes.
For Sales processing, a Plant must also be permitted for the relevant
Distribution Chain. That assignment makes the Plant available as a possible
delivering location; it does not prove that a specific order can be delivered.

### 4.2 Shipping Point

A Shipping Point is the organizational unit responsible for shipping
execution. It can represent a loading ramp, mail depot, express station, or
other dispatch unit.

SAP permits many-to-many assignment between Plants and Shipping Points, but an
individual outbound delivery is processed by one Shipping Point. Therefore a
different determined Shipping Point can be a delivery-split cause.

The standard determination inputs are:

```text
Delivering Plant
      + Shipping Condition
      + Loading Group
      = Shipping Point
```

Representative sources are:

- delivering Plant: determined from customer/material/document context;
- shipping condition: customer sales data or a document-type override;
- loading group: material/product sales-general Plant data.

The determination is performed for the Sales Order item because different
items may use different Plants or loading requirements.

### 4.3 Permission is not determination

These checks answer different questions:

| Check                                 | Meaning                                               |
| ------------------------------------- | ----------------------------------------------------- |
| Distribution Chain ↔ Plant assignment | May this sales route use this Plant?                  |
| Plant ↔ Shipping Point assignment     | May this Shipping Point serve this Plant?             |
| Shipping-point determination          | Which Shipping Point results for these exact inputs?  |
| ATP and scheduling                    | Can quantity be confirmed, and for what date?         |
| Delivery due processing               | Is the item currently eligible for delivery creation? |

Passing an organizational assignment does not guarantee ATP confirmation,
delivery creation, picking, or PGI.

---

## 5. Sales Office and Sales Group

A Sales Office represents a geographical or organizational sales location. A
Sales Group represents a responsible team or group of employees within the
sales organization, often within a Sales Office.

They support responsibility assignment, reporting, and operational ownership,
but they are not components of the Sales Area key. This separation lets one
commercial model scale across multiple offices and teams without creating a
different Sales Area for every reporting unit.

```text
Sales Area                    Responsibility dimensions
SO + Channel + Division       Sales Office → Sales Group → Sales Employee
```

Do not infer from this that Sales Office and Sales Group are unimportant.
Depending on configuration and reporting requirements, they can influence
defaulting, authorizations, workflow, output, or analytics. They simply do not
define the Sales Area itself.

---

## 6. Business Partner and Customer Data

### 6.1 Business Partner as the leading object

In SAP S/4HANA, Business Partner is the leading master-data object for parties
that can act as customers, suppliers, persons, or organizations. Customer and
supplier integration synchronizes the relevant application-specific views.

Three concepts must remain separate:

| Concept          | Purpose                                    | Examples                         |
| ---------------- | ------------------------------------------ | -------------------------------- |
| BP Category      | Fundamental nature of the party            | Person, Organization, Group      |
| BP Role          | Application-specific view and fields       | FI Customer, Customer            |
| Partner Function | Responsibility in one business transaction | Sold-to, Ship-to, Bill-to, Payer |

A BP Category is not a transaction role. A BP Role does not say which party
receives one particular shipment. Partner Function supplies that transactional
meaning.

### 6.2 Customer data segments

Customer information is separated according to organizational validity:

| Segment      | Scope                               | Representative content                                           | Classic landmark                                              |
| ------------ | ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| General      | Client-wide identity                | Name, address, communication, search data                        | `KNA1`; BP identity also uses BP persistence such as `BUT000` |
| Company Code | One customer in one accounting unit | Reconciliation account, payment methods, dunning, correspondence | `KNB1`                                                        |
| Sales Area   | One customer in SO/channel/division | Sales, shipping, billing, partner, pricing-related defaults      | `KNVV`                                                        |

The same customer can therefore be valid for one Company Code or Sales Area
and missing or blocked in another. “The customer exists” is not enough evidence
that the customer is usable in a given order.

Typical S/4HANA customer roles include:

- `FLCU00` — FI Customer, supplying Company Code/accounting context;
- `FLCU01` — Customer, supplying Sales Area/sales context.

Exact required roles, fields, and synchronization behavior depend on the
solution scope and release.

### 6.3 Address identity and time dependency

A Business Partner can have multiple addresses, address usages, and validity
periods. A delivery address and billing address need not be identical. Modern
multiple-address handling can determine address-dependent Sales Area data and
propagate it into a newly created or changed sales document.

This introduces two separate identities:

```text
Business Partner identity  ≠  Business Partner address identity
```

Released APIs can require a Business Partner address UUID when a specific
address must be selected. Technical designs should not assume that a BP number
always implies exactly one timeless address.

The document behavior also depends on the operation. Changing the selected
address in an existing document can redetermine address-dependent fields. A
later master-data change does not mean that all old transactions become live
views of the new address. The target release and address-handling configuration
must be checked before making historical-data assumptions.

---

## 7. Partner Functions and Partner Determination

### 7.1 Four core customer partner functions

| Partner function | Business responsibility             |
| ---------------- | ----------------------------------- |
| Sold-to Party    | Places or owns the commercial order |
| Ship-to Party    | Receives the goods or service       |
| Bill-to Party    | Receives the invoice                |
| Payer            | Pays the receivable                 |

One Business Partner may perform all four functions. Alternatively, several
partners can divide them—for example, headquarters places the order, a branch
receives the goods, a shared-services entity receives invoices, and a treasury
entity pays.

In classic persistence and configuration, internal keys are often language-
independent values inherited from German terminology, for example `AG`, `WE`,
`RE`, and `RG`. APIs may expose semantic values such as sold-to or ship-to, or
other codes depending on the contract. Integration logic must use the values
defined by the released interface, not assume that a UI label is the stored
key.

### 7.2 Partner determination

Partner determination controls which partner functions are:

- proposed from customer/BP relationships;
- required or optional;
- allowed at header or item level;
- unique or repeatable;
- changeable during document processing.

The result is transaction data. Sales-document partner assignments are stored
separately from the reusable Business Partner master because the same party can
have different responsibilities in different orders.

```text
BP/customer relationships + partner procedure + document context
                              │
                              ▼
                   Sales-document partner rows
```

`VBPA` is a classic persistence landmark for sales-document partners. It is
useful when diagnosing what was stored, but partner determination should be
changed through supported configuration rather than direct table updates.

---

## 8. Product and Material Master Organizational Views

### 8.1 One material, several scopes

The product/material master is not one flat record. Its views are organized by
the business scope in which attributes are valid.

| Scope                | Representative content                                                    | Classic landmark |
| -------------------- | ------------------------------------------------------------------------- | ---------------- |
| Client/general       | Material type, base unit, cross-application identity                      | `MARA`           |
| Description/language | Material descriptions                                                     | `MAKT`           |
| Distribution Chain   | Sales unit, item-category group, sales status, delivering-plant proposals | `MVKE`           |
| Plant                | MRP, procurement, availability, loading, planning                         | `MARC`           |
| Storage Location     | Storage-location stock and operational data                               | `MARD`           |
| Units of measure     | Alternative units and conversions                                         | `MARM`           |
| Valuation            | Valuation and price-control data                                          | `MBEW`           |

The appropriate record grain matters. Reading `MARA` proves that the material
exists globally; it does not prove that Sales data exists for the order's
Distribution Chain or that Plant data exists for the delivering Plant.

### 8.2 Fields reused by later determinations

Important examples include:

- `MVKE-MTPOS`: item-category group used in item-category determination;
- `MARC-DISMM`: MRP type used in schedule-line-category determination;
- `MARC-LADGR`: loading group used in Shipping Point determination.

These are inputs, not final decisions. The application combines them with
document context and Customizing to select the result.

```text
Material master classification
           + document context
           + configuration assignment
           = runtime document value
```

---

## 9. Customer-Material Information Record

A customer-material information record describes a relationship between one
customer and one internal material in a particular commercial context. It is
more specific than either master alone.

Representative key context:

```text
Customer
  + Sales Organization
  + Distribution Channel
  + Internal Material
  = Customer-material relationship
```

Typical content includes:

- the customer's own material number and description;
- customer-specific delivery agreements or tolerances;
- customer-material text;
- other customer/material-specific shipping information.

The classic table landmark is `KNMT`; common classic transactions are `VD51`
for creation, `VD52` for change, and `VD53` for display. Current S/4HANA
releases can also provide Fiori maintenance applications.

This record does not replace the product/material master. It maps customer-
specific commercial language and agreements to an internal material that must
already exist.

---

## 10. Sales Order Data-Provenance Pipeline

### 10.1 Sources

A Sales Order can receive values from several independent sources:

```text
Reference document ─────┐
Customer/BP master ─────┤
Material master ────────┤
Customer-material data ─┤
Condition records ──────┤──> determination and validation ──> order fields
Customizing ────────────┤
Existing document data ─┤
User or interface input ┘
```

No universal precedence rule covers every field. Each field has its own
proposal, copy, override, redetermination, and validation behavior.

Examples:

- Sales Area may come from the entry context or reference document.
- partner functions may be proposed from BP/customer relationships.
- Plant may be proposed from customer-material, customer, or material context
  and may then be changed if permitted.
- item category is determined from document type, material item-category
  group, item usage, and higher-level item category.
- pricing is executed using pricing-procedure and condition-technique inputs.
- schedule-line category uses item category and MRP type.

### 10.2 A practical provenance record

When diagnosing a wrong field, capture this chain:

| Evidence                       | Meaning                                              |
| ------------------------------ | ---------------------------------------------------- |
| Actual stored value            | What the transaction finally contains                |
| Source candidates              | Master, reference document, Customizing, input, code |
| Exact organizational key       | Scope under which each source was read               |
| Determination sequence         | Which source or rule had priority for this field     |
| Override/redetermination event | Why the original proposal may have changed           |
| Enhancement point or extension | Whether custom logic altered standard output         |

This is stronger than asking only, “Which table contains the field?” The same
field name can exist at several grains and represent a source, copied snapshot,
or calculated result.

---

## 11. Copy Semantics and Transactional Snapshots

### 11.1 Proposal is not live inheritance

When master data proposes a value into a Sales Order, the order normally stores
its own transactional value. The conceptual relationship is:

```text
Master value at determination time
             │ copy / derive / validate
             ▼
       Sales Order value
             │
             └── remains part of this transaction unless explicitly changed
```

Changing master data later normally affects newly created or explicitly
redetermined transactions. It does not retroactively rewrite all existing
orders.

This rule protects:

- commercial traceability;
- auditability;
- stable downstream processing;
- explanation of what the customer and seller agreed at that time.

### 11.2 Exceptions require field-specific analysis

Some values can be redetermined when a relevant document field changes.
Address-dependent Sales data is one example: selecting a different BP address
can cause the application to propose different Incoterms or a different Plant.
Pricing, texts, dates, partners, and output can have their own copy and
redetermination controls.

Therefore, “master data never changes an existing order” is too broad. The
precise statement is:

> Existing orders are transactional records, not live master-data projections;
> however, supported change operations may deliberately redetermine selected
> fields according to their configuration and application logic.

---

## 12. Classic Persistence Landmarks

The following objects are useful for authorized diagnosis in classic or
on-premise/private-edition environments. They are not clean-core integration
contracts.

### 12.1 Organizational Customizing

| Object  | Typical meaning                                             |
| ------- | ----------------------------------------------------------- |
| `T001`  | Company Code definition                                     |
| `TVKO`  | Sales Organization definition and related settings          |
| `TVTW`  | Distribution Channel definition                             |
| `TSPA`  | Division definition                                         |
| `TVTA`  | Valid Sales Area combinations                               |
| `T001W` | Plant definition                                            |
| `TVKWZ` | Plant assignment to Sales Organization/Distribution Channel |
| `TVST`  | Shipping Point definition                                   |
| `TVSWZ` | Shipping Point assignment to Plant                          |
| `TVSTZ` | Shipping Point determination combinations                   |
| `TVBUR` | Sales Office definition                                     |
| `TVKGR` | Sales Group definition                                      |

Some relationships are technically represented through additional tables or
valuation-area logic rather than one intuitive foreign-key field. The IMG and
data dictionary should be used to confirm the exact implementation in the
target release.

### 12.2 Business Partner and customer

| Object   | Typical meaning                                            |
| -------- | ---------------------------------------------------------- |
| `BUT000` | General Business Partner identity                          |
| `BUT020` | BP address assignment                                      |
| `ADRC`   | Address details referenced by address number               |
| `KNA1`   | General customer data                                      |
| `KNB1`   | Customer Company Code data                                 |
| `KNVV`   | Customer Sales Area data                                   |
| `KNVP`   | Customer master partner functions by Sales Area            |
| `VBPA`   | Partner assignments copied/determined for a sales document |

BP/customer synchronization is handled by Customer/Vendor Integration in
S/4HANA. Directly changing these tables can break consistency between the
leading BP object and customer application data.

### 12.3 Product/material and relationship records

| Object | Grain                                             |
| ------ | ------------------------------------------------- |
| `MARA` | Material/client                                   |
| `MAKT` | Material/language                                 |
| `MVKE` | Material/Sales Organization/Distribution Channel  |
| `MARC` | Material/Plant                                    |
| `MARD` | Material/Plant/Storage Location                   |
| `MARM` | Material/alternative unit                         |
| `MBEW` | Material/valuation area/valuation type context    |
| `KNMT` | Customer/material/commercial relationship context |

The correct join keys follow the grain. Joining only on material number can
multiply or mix Sales Organization, Plant, language, unit, or valuation rows.

---

## 13. Classic Maintenance and Diagnostic Transactions

These are common SAP GUI landmarks for classic/on-premise environments. Exact
availability and navigation vary by release, installed scope, and
authorization. For configuration work, prefer the IMG path in the target
system over memorizing a transaction code without its business activity.

| Area                         | Common landmark        | Purpose                                       |
| ---------------------------- | ---------------------- | --------------------------------------------- |
| Company Code                 | `OX02`                 | Define or inspect Company Codes               |
| Sales Organization           | `OVX5`                 | Define Sales Organizations                    |
| Distribution Channel         | `OVXB`                 | Define Distribution Channels                  |
| Division                     | `OVXA`                 | Define Divisions                              |
| Sales Area                   | `OVXG`                 | Set up valid Sales Areas                      |
| Sales Org → Company Code     | `OVX3`                 | Maintain assignment                           |
| Plant → Distribution Chain   | `OVXK`                 | Assign Plant to Sales Org/Channel             |
| Shipping Point → Plant       | `OVXC`                 | Maintain permitted assignments                |
| Shipping Point determination | `OVL2`                 | Maintain Plant/condition/loading-group result |
| Business Partner             | `BP`                   | Maintain BP roles and customer data           |
| Product/material             | `MM01`, `MM02`, `MM03` | Create, change, display material              |
| Customer-material info       | `VD51`, `VD52`, `VD53` | Create, change, display relationship          |
| Partner determination        | `VOPA`                 | Configure partner procedures and assignments  |
| Sales Order                  | `VA01`, `VA02`, `VA03` | Create, change, display transaction result    |

SAP S/4HANA Cloud Public Edition uses configuration activities and Fiori apps;
the same business concept may not expose a classic transaction.

---

## 14. Organizational-Key Diagnosis

### 14.1 Diagnostic sequence

For an error such as “customer/material not maintained,” “Plant not allowed,”
or “Shipping Point not determined,” follow the runtime dependency from broad
context to exact input:

```text
1. Capture the failing document and item
                ↓
2. Record the exact Sales Area and document type
                ↓
3. Verify customer/BP role and organizational segments
                ↓
4. Verify material Distribution Chain and Plant views
                ↓
5. Verify organizational assignments
                ↓
6. Reconstruct determination inputs and result
                ↓
7. Check blocks, validity, status, authorization, and enhancements
```

### 14.2 Evidence checklist

| Area              | Evidence to capture                                           |
| ----------------- | ------------------------------------------------------------- |
| Sales context     | Sales Org, Distribution Channel, Division, order type         |
| Partner           | BP/customer number, function, selected address, required role |
| Product           | material number, Sales Org/Channel view, Plant view, units    |
| Plant             | proposed/stored Plant and Distribution Chain assignment       |
| Shipping Point    | Plant, shipping condition, loading group, determined result   |
| Relationship data | customer-material record and organizational key               |
| Runtime result    | actual header/item/partner/schedule-line values               |
| Extensions        | user exits, BAdIs, custom determination, interface mapping    |

### 14.3 Diagnose the actual grain

Suppose material `M-100` works in Sales Area `1000/10/00` but fails in
`1000/20/00`. The global material record is not the first suspect because the
same material already works elsewhere. The diagnostic focus should move to:

- `MVKE` data for the failing Distribution Chain;
- customer `KNVV` data for the failing Sales Area;
- Plant assignment to that Distribution Chain;
- condition and determination records scoped by the failing key;
- blocks or validity specific to that context.

This is the reusable troubleshooting pattern:

> When behavior differs by organization, compare organizationally scoped data
> before investigating global identity data or custom code.

---

## 15. RAP Modeling Translation

### 15.1 Ownership versus reference

An SD-style RAP model should distinguish lifecycle ownership from reusable
references:

```text
SalesOrderRequest                         aggregate ownership
  ├── composition [0..*] Items
  │     └── composition [0..*] Schedules
  └── composition [0..*] OrderPartners

Item ───────── association ─────────> Product
OrderPartner ─ association ─────────> BusinessPartner
Request ───── association ──────────> SalesArea / Plant reference
```

The reasoning is:

- Item, Schedule, and OrderPartner rows describe this one request and normally
  lose their lifecycle meaning when the request is deleted.
- Product, Business Partner, Plant, and organizational reference entities exist
  independently and are therefore associations, not compositions.

`OrderPartner` can still be a composition even though it points to a Business
Partner. It owns the transaction-specific fact “this BP performs this function
in this request,” not the Business Partner master itself.

### 15.2 Snapshot versus live display

A custom RAP application must decide deliberately which data is stored and
which is dereferenced live:

| Design                                                        | Benefit                                     | Risk                                              |
| ------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| Store only BP/Product key and display live association fields | Simple and always shows current master data | Historical display can drift after master changes |
| Copy selected descriptive/commercial fields into transaction  | Preserves what was accepted at the time     | Requires clear redetermination/change rules       |
| Store key plus explicit snapshot fields                       | Separates identity from historical evidence | More fields and lifecycle logic                   |

An association such as `_Customer.Name` is not automatically a historical
snapshot. If auditability matters, the design needs explicit snapshot fields
or a released standard document API that already owns those semantics.

### 15.3 Validation and determination responsibilities

Representative RAP responsibilities are:

- determination proposes a Plant or copies transaction currency;
- validation rejects an invalid Business Partner, product, Sales Area, or
  organizational combination;
- feature control restricts changes based on state;
- authorization checks whether the user may perform the operation;
- value help assists selection but does not replace backend validation.

These rules belong in the business object, not only in Fiori annotations,
because EML, APIs, tests, and alternate projections must receive the same
protection.

---

## 16. Clean-Core and Integration Boundaries

### 16.1 Tables are landmarks, not APIs

Classic tables help an authorized consultant inspect persistence. They are not
stable contracts for extension or integration.

Avoid designs that:

- update `KNA1`, `KNVV`, `MARA`, `MVKE`, or Customizing tables directly;
- expose broad table joins as public APIs without business semantics;
- assume an internal table layout will remain stable across releases;
- bypass BP/CVI consistency or application validations.

Prefer:

- released Business Partner and Product APIs;
- released CDS views with the required supported capability;
- released transactional business objects and EML in ABAP Cloud;
- documented events or integration services;
- application configuration through supported activities.

Availability and release status must be checked in the target system. A CDS
entity that exists is not necessarily released for every use case.

### 16.2 Read model versus write contract

```text
Read/analytics
  released CDS view or analytical query

Transactional write
  released API / RAP BO / documented business operation

Internal diagnosis
  authorized app, transaction, trace, or table inspection
```

A released read model does not automatically authorize updates. Conversely, an
API can execute business logic that cannot be reproduced safely by inserting
database rows.

### 16.3 Extension ownership

Before copying standard SD concepts into a custom RAP application, define the
boundary:

- If SAP S/4HANA owns the real Sales Order, extend or consume the released
  standard contract when possible.
- If the RAP object is a request or pre-order, keep its lifecycle separate and
  hand off to S/4HANA through an explicit integration boundary.
- Do not label a simplified custom amount derivation as complete SD pricing or
  a request aggregate as a standard SAP Sales Order.

---

## 17. Technical Insights and Common Misinterpretations

### 17.1 Existence is weaker than usability

```text
BP exists
  ≠ customer role exists
  ≠ Company Code segment exists
  ≠ Sales Area segment exists
  ≠ partner function is valid in this document

Material exists
  ≠ Distribution Chain sales view exists
  ≠ Plant view exists
  ≠ Plant is permitted for the Distribution Chain
  ≠ quantity can be confirmed
```

### 17.2 Assignment is weaker than successful execution

Organizational assignment establishes permission and reachability. Execution
still depends on master data, determination, status, blocks, availability,
authorization, and transaction-specific rules.

### 17.3 Master data supplies facts; the document owns the transaction

The Business Partner owns reusable party identity. The Product owns reusable
product identity. The Sales Order owns the fact that a particular partner,
address, material, quantity, price, and date were accepted in this transaction.

### 17.4 Organizational keys explain many “same data, different result” cases

If the same customer and material behave differently across orders, compare the
full Sales Area, Distribution Chain, Plant, address, and document-type context.
The changed behavior is often correct because a more specific master-data or
configuration record applies.

### 17.5 The most specific record is not universally the winner

Customer-material data is more relationship-specific than customer-only or
material-only data, but field precedence is application-specific. The correct
technical explanation names the field, its source sequence, and the event that
triggered determination or redetermination.

---

## 18. Compact Technical Map

```text
LEGAL CONTEXT
  Company Code
       │ 1:n
       ▼
COMMERCIAL CONTEXT
  Sales Organization + Distribution Channel + Division = Sales Area
  Sales Organization + Distribution Channel            = Distribution Chain
                              │
                              ├── scopes customer and material sales data
                              └── permits Plant assignment
                                               │
                                               ▼
FULFILLMENT CONTEXT
  Plant + Shipping Condition + Loading Group = Shipping Point

REUSABLE MASTER DATA
  Business Partner
    ├── general identity/address
    ├── FI Customer / Company Code data
    └── Customer / Sales Area data

  Product/Material
    ├── general identity
    ├── Distribution Chain sales data
    └── Plant planning/loading data

  Customer-Material
    └── customer-specific material identity and agreements

TRANSACTIONAL RESULT
  Sales Order
    ├── header: Sales Area and commercial context
    ├── partners: sold-to / ship-to / bill-to / payer
    ├── items: material, Plant, quantity, price, behavior
    └── schedule lines: confirmed quantity and date
```

The map should be read from top to bottom: configuration permits the context,
master data supplies scoped inputs, application logic determines values, and
the Sales Order records the resulting transaction.
