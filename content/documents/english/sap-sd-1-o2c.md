---
title: SAP SD Order To Cash Overview
part: ABAP
summary: This document describes the technical structure and runtime boundaries of the SAP Sales and Distribution Order-to-Cash process. Its purpose is to connect the business-document chain to document grain, persistence landmarks, posting effects, document flow, diagnostic evidence, and clean-core integration contracts.
category: Technical
tags:
  - sap
  - sd
publishedAt: 2026-07-30
---

# SAP SD Order-to-Cash — Technical Architecture

This document describes the technical structure and runtime boundaries of the
SAP Sales and Distribution Order-to-Cash process. Its purpose is to connect the
business-document chain to document grain, persistence landmarks, posting
effects, document flow, diagnostic evidence, and clean-core integration
contracts.

The central architectural principle is:

> Order-to-Cash is a graph of independently meaningful business documents and
> postings. It is not one large database record, one status field, or one
> transactional aggregate.

This reference distinguishes three contexts:

- **Classic SAP ERP and SAP S/4HANA on-premise/private edition**, where SAP GUI
  transactions and direct table inspection may be available for authorized
  diagnosis.
- **SAP S/4HANA Cloud Public Edition**, where Fiori applications, configuration
  activities, and released APIs are the normal operational contracts.
- **Clean-core extension development**, where released CDS entities, business
  objects, events, and APIs should be preferred over dependencies on internal
  persistence.

Primary SAP sources:

- [SAP Help — Sales Documents](https://help.sap.com/docs/SAP_S4HANA_CLOUD/a376cd9ea00d476b96f18dea1247e6a5/aa64b65334e6b54ce10000000a174cb4.html)
- [SAP Learning — Navigating the Order-to-Cash Process Steps](https://learning.sap.com/courses/discovering-the-basics-of-sap-s-4hana-sales/executing-sales-order-management_cad9dfbe-bafc-4ed9-ac2e-6fd8422430e4)
- [SAP Help — Sales Order Item Schedule Line](https://help.sap.com/docs/SAP_S4HANA_CLOUD/03c04db2a7434731b7fe21dca77440da/37df44581efca007e10000000a441470.html)
- [SAP Help — Goods Issue](https://help.sap.com/docs/SAP_S4HANA_CLOUD/aff0b3f5f46c42a2b2c0fabfc233bab2/64f81a71edf5490ab522a829be075827.html?locale=en-US&version=LATEST)
- [SAP Help — Billing Data Flow](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/ed84b70c199d4470ae2e5ccb93b2e45b/e26fb6535fe6b74ce10000000a174cb4.html)
- [SAP Help — Displaying Goods Issue Documents](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/c7894a248ca14f74aca67f97528e5ad7/f91bbf53d25ab64ce10000000a174cb4.html)
- [SAP Help — Delivery Document CDS View](https://help.sap.com/docs/SAP_S4HANA_CLOUD/c0c54048d35849128be8e872df5bea6d/e2966bcba73a455299b4937151dfd0a3.html)

---

## 1. Scope and System Boundaries

### 1.1 Core process

The common sell-from-stock flow can be represented as:

```text
Optional presales                         Core execution

Inquiry → Quotation → Sales Order → Outbound Delivery → PGI → Billing → Payment
```

The technical meaning is clearer when the process is expressed as state
transitions:

```text
Customer interest
    ↓
Commercial offer
    ↓
Accepted demand and fulfillment intent
    ↓
Warehouse execution document
    ↓
Inventory and value posting
    ↓
Customer invoice and receivable
    ↓
Cash receipt and clearing
```

Inquiry and quotation are optional presales documents. Returns, credit memos,
third-party sales, intercompany sales, milestone billing, consignment, and
make-to-order processes follow different branches. The architecture in this
document is therefore a baseline, not a claim that every SD transaction follows
one identical path.

SAP describes sales, delivery, and billing documents as individual documents
that participate in a larger process flow and can be created with reference to
predecessors. That reference copies relevant information and records process
lineage; it does not merge all documents into one object. See
[SAP Help — Sales Documents](https://help.sap.com/docs/SAP_S4HANA_CLOUD/a376cd9ea00d476b96f18dea1247e6a5/aa64b65334e6b54ce10000000a174cb4.html).

### 1.2 Responsibility boundaries

| Boundary          | Primary responsibility                                 | New fact established                                     |
| ----------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| Presales          | Sales                                                  | Interest or an offer is recorded                         |
| Sales Order       | Sales/order management                                 | Accepted demand and commercial context are recorded      |
| Outbound Delivery | Shipping/warehouse execution                           | Deliverable quantities are organized for execution       |
| Post Goods Issue  | Shipping, Inventory Management, accounting integration | Goods have left; stock and value effects are posted      |
| Billing           | Billing and accounting integration                     | Customer invoice and accounting consequences are created |
| Incoming payment  | Financial Accounting                                   | Cash is posted and an open receivable can be cleared     |

These are separate boundaries because they have different owners, validations,
posting effects, reversal procedures, authorizations, and audit histories.

### 1.3 Architectural layers

```text
User interaction
  SAP GUI transaction / Fiori app / external consumer
                            │
                            ▼
Business operation
  create order / create delivery / post GI / create billing / post payment
                            │
                            ▼
Application logic
  determination / copy control / validation / status / authorization
                            │
                            ▼
Persistence and postings
  SD documents / material document / journal entry / clearing information
                            │
                            ▼
Integration and analytics
  released API / CDS / event / IDoc / process flow / reporting
```

The persistence tables are implementation landmarks. The business operation is
the contract. Creating a row that resembles an order or delivery is not
equivalent to executing the corresponding SAP business operation.

---

## 2. End-to-End Document Lifecycle

### 2.1 Lifecycle matrix

| Stage             | Technical object                                      | What becomes true                                                                             | What remains unproven                         |
| ----------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Inquiry           | Sales document                                        | Customer interest or request for information is recorded                                      | No formal offer or accepted order             |
| Quotation         | Sales document                                        | A commercial offer with validity and terms exists                                             | Customer acceptance is not guaranteed         |
| Sales Order       | Sales document                                        | Product, quantity, partner, price, date, and fulfillment intent are recorded                  | Delivery, PGI, invoice, and payment           |
| Outbound Delivery | Delivery document                                     | Shipping execution has a document for quantities, dates, picking, packing, and goods movement | Goods issue may not be posted                 |
| PGI               | Material and accounting posting connected to delivery | Goods departure, stock reduction, and relevant value effects are recorded                     | Customer billing and cash receipt             |
| Billing           | Billing document plus accounting integration          | Invoice values are recorded and normally transferred to accounting                            | Incoming cash                                 |
| Incoming Payment  | FI journal entry and clearing process                 | Cash receipt is recorded and can clear the open customer item                                 | Completion of every other branch or open item |

### 2.2 Inquiry and quotation

Inquiry and quotation normally use the sales-document architecture. They may
contain header and item data and can participate in reference chains. They do
not represent inventory movement or customer receivable postings.

The quotation is best understood as a versioned commercial offer. Its validity,
prices, quantities, and conditions can be copied into a subsequent order under
configured rules. The subsequent Sales Order is still its own business
document, with its own current values and lifecycle.

### 2.3 Sales Order

A Sales Order is a transactional snapshot assembled from user input, partner
and material master data, reference documents, pricing condition data,
Customizing, and runtime determinations.

Its main technical responsibilities include:

- establish the commercial parties and Sales Area;
- identify products or services and total demand;
- determine item and schedule-line processing behavior;
- determine price and commercial terms;
- schedule and confirm quantities and dates;
- provide a source for delivery- or order-related subsequent processing;
- maintain processing status and document flow.

Saving the Sales Order does not post physical goods movement. It records demand
and instructions that subsequent processes can consume.

### 2.4 Outbound Delivery

The Outbound Delivery is an execution document, not merely a visual plan. It
organizes delivery-relevant quantities for shipping and supports processes such
as picking, packing, batch/serial handling, route or shipping data, and PGI.

Delivery creation can copy data from one or more due predecessor items under
copy-control, combination, and split rules. The resulting delivery has its own
header/item identity and status. Changing the order afterward does not imply
that every copied delivery value dynamically changes.

### 2.5 Post Goods Issue

PGI is the decisive physical posting boundary for the ordinary outbound
sell-from-stock flow. SAP states that goods issue confirms that the goods have
left the company and reduces warehouse stock. If posted data must be corrected,
the normal flow is to reverse the goods issue, change the delivery, and post
again. See [SAP Help — Goods Issue](https://help.sap.com/docs/SAP_S4HANA_CLOUD/aff0b3f5f46c42a2b2c0fabfc233bab2/64f81a71edf5490ab522a829be075827.html?locale=en-US&version=LATEST).

PGI can create or update evidence across component boundaries:

```text
Outbound Delivery
      │
      ├─ goods-movement status and actual GI information
      ├─ material document / inventory quantity effect
      ├─ value and accounting consequences, when applicable
      └─ document-flow relationship
```

The goods issue document is not merely another Sales Order child. SAP identifies
it as belonging to Materials Management and Financial Accounting while still
being navigable from the delivery flow. See
[Displaying Goods Issue Documents](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/c7894a248ca14f74aca67f97528e5ad7/f91bbf53d25ab64ce10000000a174cb4.html).

### 2.6 Billing

A Billing Document is created from a billable predecessor such as a delivery or
Sales Order, depending on item billing relevance and process design. Data is
copied under billing copy-control rules.

For delivery-related billing, SAP gives the representative behavior that
quantities can be copied from the delivery while prices can be copied from the
Sales Order. Pricing may also be redetermined according to the configured
pricing type. See [SAP Help — Billing Data Flow](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/ed84b70c199d4470ae2e5ccb93b2e45b/e26fb6535fe6b74ce10000000a174cb4.html).

The Billing Document is a distinct SD business document. Its accounting
transfer normally creates the financial evidence for receivable, revenue, tax,
and related postings according to configuration.

### 2.7 Incoming payment

Incoming payment belongs primarily to Financial Accounting. It records the cash
receipt and applies clearing logic to one or more open customer items.

```text
Billing document
    ↓
Customer receivable/open item
    ↓
Incoming payment posting
    ↓
Full, partial, residual, or other configured clearing result
```

Payment must not be modeled as “a field sent back to the Sales Order.” It is a
financial posting with its own document identity, posting date, currency,
accounts, clearing state, and possible exceptions. One payment can relate to
multiple invoices, and one invoice can be settled through several payments or
adjustments.

---

## 3. Business Events Versus Document Creation

### 3.1 A document records intent or execution at a specific boundary

The existence of a document proves only the fact owned by that document.

```text
Sales Order exists
  proves: demand and commercial/fulfillment intent were recorded
  does not prove: stock moved

Outbound Delivery exists
  proves: shipping execution document was created
  does not prove: PGI was posted

Billing Document exists
  proves: billing document was created
  does not prove: customer paid

Payment document exists
  proves: payment posting exists
  does not automatically prove: every invoice/order branch is complete
```

This prevents a common diagnostic error: interpreting a planning or execution
document as proof that a later posting occurred.

### 3.2 Posting boundaries

Posting establishes a committed accounting or inventory fact. It typically has
stronger reversal and audit requirements than changing an unposted operational
document.

| Operation                          | Nature                         | Typical correction model                           |
| ---------------------------------- | ------------------------------ | -------------------------------------------------- |
| Change open Sales Order            | Transaction-document change    | Edit through supported Sales Order operation       |
| Change unposted delivery           | Execution-document change      | Edit through delivery operation, subject to status |
| Reverse PGI                        | Reversal posting               | Create reversal effect, correct delivery, repost   |
| Cancel billing                     | Cancellation/reversal document | Preserve traceable reversal relationship           |
| Reset clearing/reverse FI document | Financial correction           | Execute authorized FI reversal/reset process       |

Direct deletion or overwriting of posted persistence would destroy lineage and
violate component-level invariants.

### 3.3 Save is not universal business completion

Every document has a local save boundary, but Order-to-Cash completion is a
cross-document interpretation.

```text
Sales Order saved      ≠ delivery complete
Delivery saved         ≠ goods issued
PGI posted             ≠ billed
Billing posted         ≠ paid
Payment received       ≠ every order item complete
```

A process can contain partial deliveries, partial billing, rejected items,
returns, credit/debit documents, disputes, and residual open items. Completion
must therefore be evaluated at the correct document/item/quantity grain.

---

## 4. Sales Document Header, Item, and Schedule-Line Grain

### 4.1 Structural hierarchy

```text
Sales Document Header                  one commercial document
├── Item 0010                          one product/service line
│   ├── Schedule Line 0001             one dated quantity requirement/result
│   └── Schedule Line 0002             another dated quantity requirement/result
└── Item 0020
    └── Schedule Line 0001
```

The placement rule is:

> Store or expose a value at the broadest grain where it remains true without
> changing its business meaning.

### 4.2 Level responsibilities

| Level         | Technical grain                           | Responsibility                                                 | Representative values                                                                                               |
| ------------- | ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Header        | One sales document                        | Shared commercial context                                      | Document type, Sales Area, Sold-to Party, order date, document currency, overall state                              |
| Item          | One line inside the document              | Product/service demand and line processing                     | Material, total ordered quantity, sales unit, Plant, item category, price/net value, rejection reason               |
| Schedule line | One dated quantity segment inside an item | Requirement, confirmation, and logistics participation by date | Requested date/quantity, confirmed date/quantity, schedule-line category, delivery relevance, movement instructions |

SAP defines a Sales Order schedule line as the subdivision of an item according
to date and quantity. Multiple partial deliveries can therefore be represented
by multiple schedule lines. See
[SAP Help — Item Schedule Line](https://help.sap.com/docs/SAP_S4HANA_CLOUD/03c04db2a7434731b7fe21dca77440da/37df44581efca007e10000000a441470.html).

### 4.3 Classic key structure

Ignoring the client column for readability:

```text
VBAK
  key: VBELN

VBAP
  key: VBELN + POSNR

VBEP
  key: VBELN + POSNR + ETENR
```

The keys are nested identities:

- `VBELN` identifies the sales document.
- `POSNR` identifies an item within that document.
- `ETENR` identifies a schedule-line record within that item.

`ETENR` is not a quantity or date. It identifies the row that contains dated
quantity information.

### 4.4 Correct join path

```text
VBAK-VBELN
    =
VBAP-VBELN

VBAP-VBELN + VBAP-POSNR
    =
VBEP-VBELN + VBEP-POSNR
```

Joining `VBEP` using only `VBELN` mixes schedule lines from every item in the
document. A syntactically valid SQL join can therefore be semantically wrong.

### 4.5 Header-to-item propagation

Selected header values can be proposed or copied into item fields. This is not
object-oriented inheritance and is not necessarily a live reference.

```text
Header payment terms: 30 days
    ↓ copied/proposed
Item 0010:             30 days
Item 0020:             45 days   explicit permitted exception
```

If the header later changes, the behavior is field- and process-specific. An
item exception may remain unchanged. Diagnose the stored item value and the
relevant copy/redetermination behavior rather than assuming that the UI displays
one shared header variable.

### 4.6 Child-to-parent aggregation

Information also moves upward:

```text
Schedule-line results → item processing summary
Item values           → header totals
Item statuses         → overall document status
```

An overall status is compressed information. It is useful for selection and
navigation but does not explain which child caused a partial state. Diagnosis
must move from header summary to item and schedule-line evidence.

---

## 5. Quantity and Status Propagation

### 5.1 Quantity vocabulary

| Quantity           | Meaning                                                                       | Grain warning                           |
| ------------------ | ----------------------------------------------------------------------------- | --------------------------------------- |
| Ordered quantity   | Total customer demand for one Sales Order item                                | Item total                              |
| Requested quantity | Demand requested for a particular date                                        | Commonly schedule-line/date context     |
| Confirmed quantity | Quantity SAP currently commits for a date after scheduling/availability logic | Promise, not execution                  |
| Delivery quantity  | Quantity included in a delivery item                                          | Delivery-document grain                 |
| Picked quantity    | Quantity physically staged/picked according to warehouse process              | Does not alone prove PGI                |
| GI quantity        | Quantity posted as goods issue                                                | Material-document/posting evidence      |
| Billed quantity    | Quantity represented in billing according to billing basis                    | Billing-item grain                      |
| Open quantity      | Remaining quantity eligible for a defined next step                           | Must name which “open” measure is meant |

“Open quantity” is not one universal stored fact. It can mean, for example,
open order demand, open confirmed quantity for delivery, unpicked delivery
quantity, or unbilled quantity. Every technical report must define the formula,
source grain, status exclusions, unit, and process boundary.

### 5.2 Partial-flow example

Customer demand:

```text
Sales Order 50000123 / Item 0010
Ordered quantity: 10 EA

Schedule Line 0001
  Confirmed: 6 EA on 10 Sep

Schedule Line 0002
  Confirmed: 4 EA on 17 Sep
```

After the first branch is delivered, PGI-posted, and billed:

```text
Ordered:       10 EA
Confirmed:     10 EA across two dates
Delivered:      6 EA
PGI-posted:     6 EA
Billed:         6 EA
Open for later: 4 EA, assuming no rejection or cancellation
```

The exact number of schedule lines and status representation depends on runtime
results and configuration. The invariant is the separation of demand,
commitment, execution, posting, and billing.

### 5.3 Status is evidence, but not always sufficient proof

Examples of useful delivery status families include:

| Status family  | Header landmark | Item landmark | Meaning                            |
| -------------- | --------------- | ------------- | ---------------------------------- |
| Picking        | `LIKP-KOSTK`    | `LIPS-KOSTA`  | Progress of required picking       |
| Goods movement | `LIKP-WBSTK`    | `LIPS-WBSTA`  | Progress of goods-movement posting |

Status fields support diagnosis, but decisive posting evidence is stronger:

```text
PGI proof hierarchy

1. Material/goods-issue document and delivery relationship
2. Actual GI date and completed goods-movement state
3. Inventory/value/accounting effects where applicable
4. User message or visible delivery existence alone — insufficient
```

SAP S/4HANA simplified SD status persistence by moving status fields from the
separate `VBUK` and `VBUP` tables into corresponding document header/item
tables. Compatibility behavior and older-system documentation can still expose
legacy names, so code must be checked against the exact target release. The
safe extension contract is a released CDS/API rather than assumptions about a
legacy status table. See SAP's
[S/4HANA Simplification List](https://help.sap.com/doc/pdfa4322f56824ae221e10000000a4450e5/1511%20001/en-US/SIMPL_OP1511_FPS01.pdf).

### 5.4 Status aggregation is not arithmetic only

An overall state such as “partially processed” is not necessarily calculated by
simply summing quantities. Rejections, relevance indicators, blocks, document
categories, and completion rules influence whether a child participates in the
summary.

For diagnostics:

```text
Overall header status
    ↓
Relevant item statuses
    ↓
Schedule-line/delivery/billing quantities and states
    ↓
Document-flow and posting evidence
```

---

## 6. SD Document Flow and Predecessor–Successor Relationships

### 6.1 Document flow is a graph

The simple diagram appears linear:

```text
Order → Delivery → Billing
```

The real process is a graph:

```text
Quotation
    ↓
Sales Order Item 0010
    ├─ Delivery A Item 0010 → PGI A → Invoice A
    └─ Delivery B Item 0010 → PGI B → Invoice B

Sales Order Item 0020
    └─ rejected; no delivery
```

Several orders can also be combined into a delivery when combination criteria
permit it, while a single order can split into multiple deliveries or invoices.
The correct cardinality is therefore frequently one-to-many or many-to-many
across stages.

### 6.2 `VBFA` as a classic lineage landmark

`VBFA` represents SD predecessor/successor document relationships. Important
classic fields include:

| Field                                          | Meaning                         |
| ---------------------------------------------- | ------------------------------- |
| `VBELV`                                        | Preceding SD document           |
| `POSNV`                                        | Preceding SD document item      |
| `VBTYP_V` or release-equivalent category field | Preceding document category     |
| `VBELN`                                        | Subsequent SD document          |
| `POSNN`                                        | Subsequent SD document item     |
| `VBTYP_N` or release-equivalent category field | Subsequent document category    |
| `STUFE`                                        | Document-flow level information |

SAP S/4HANA simplified `VBFA` and extended the SD document-category model.
Avoid encoding old one-character category assumptions into new integrations.

### 6.3 Reference field versus document-flow graph

A delivery item can contain direct predecessor references such as
`LIPS-VGBEL/VGPOS`. These tell how that item was created. `VBFA`, by contrast,
represents broader predecessor/successor lineage across document categories.

```text
Direct source reference
  useful for: immediate originating document/item

Document-flow relationship
  useful for: traversing the wider process graph
```

Neither should be treated as a reason to update the predecessor or successor
table directly.

### 6.4 Process flow versus full document flow

Modern Fiori process-flow visualizations can deliberately show the documents
most relevant to a particular business role. The full document flow can contain
additional related documents. SAP notes that a process flow viewed from a Sales
Order can differ from one viewed from a Billing Document even though both refer
to the same broader process. See
[SAP Help — Manage Billing Documents Process Flow](https://help.sap.com/docs/SAP_S4HANA_CLOUD/a376cd9ea00d476b96f18dea1247e6a5/e097b4d95c9946d49f48bba5ddfd61b3.html).

Therefore:

```text
UI process flow = role-oriented visualization
Document flow   = business-document lineage
VBFA            = classic persistence landmark for SD relationships
```

### 6.5 Document flow is not RAP composition

RAP composition expresses lifecycle ownership inside one business-object
aggregate:

```text
SalesOrderRequest
└── Items
    └── Schedules
```

SD document flow links separate aggregates and postings:

```text
Sales Order ──reference/flow──> Delivery ──flow──> Billing
```

A Billing Document should not be modeled as a composition child deleted with a
Sales Order. It has independent identity, authorization, accounting effects,
status, reversal behavior, and retention requirements.

---

## 7. Core Persistence Landmarks

### 7.1 Persistence map

The following tables are classic technical landmarks for authorized diagnosis.
They are not stable public update interfaces.

| Process object               | Header landmark | Item/detail landmark                         | Representative grain                                         |
| ---------------------------- | --------------- | -------------------------------------------- | ------------------------------------------------------------ |
| Sales document               | `VBAK`          | `VBAP`                                       | `VBELN`; `VBELN + POSNR`                                     |
| Sales schedule line          | —               | `VBEP`                                       | `VBELN + POSNR + ETENR`                                      |
| Delivery                     | `LIKP`          | `LIPS`                                       | `VBELN`; `VBELN + POSNR`                                     |
| Billing document             | `VBRK`          | `VBRP`                                       | `VBELN`; `VBELN + POSNR`                                     |
| SD document flow             | —               | `VBFA`                                       | Predecessor/successor document-item relationship             |
| Material document in S/4HANA | —               | `MATDOC`                                     | Material-document item context                               |
| Accounting document          | `BKPF`          | `BSEG`; universal-journal detail in `ACDOCA` | Company code, fiscal year, accounting document, line context |

The repeated field name `VBELN` does not mean all tables contain the same
business object. Its meaning is scoped by the table/document category.

### 7.2 Sales Order persistence

```text
VBAK: one sales-document header
  ├─ document type and category
  ├─ Sales Area
  ├─ Sold-to/commercial context
  ├─ document currency/dates
  └─ header-level state

VBAP: one sales-document item
  ├─ material/product
  ├─ item category
  ├─ ordered quantity and unit
  ├─ Plant/shipping data
  └─ item-level value and state

VBEP: one schedule line
  ├─ schedule-line number/category
  ├─ requested/confirmed date and quantity context
  └─ fulfillment-control data
```

Additional partner, business-data, text, pricing, and status information can
reside in other structures. The three-table model is the structural spine, not
the complete Sales Order data model.

### 7.3 Delivery persistence

```text
LIKP: delivery header
  ├─ delivery type
  ├─ shipping point
  ├─ dates
  ├─ partners
  └─ overall execution/status information

LIPS: delivery item
  ├─ material and delivery quantity
  ├─ Plant/storage location/batch context
  ├─ predecessor reference
  ├─ picking and goods-movement information
  └─ movement-type and status context
```

A delivery row proves that delivery creation occurred. To prove PGI, correlate
delivery status and actual GI information with the material/goods-issue
document and relevant posting effects.

### 7.4 Billing persistence

```text
VBRK: billing header
  ├─ billing type/category
  ├─ payer and dates
  ├─ currency/accounting references
  └─ header status

VBRP: billing item
  ├─ billed product/quantity
  ├─ reference document/item
  ├─ item values
  └─ billing relevance/result context
```

Pricing-result details in SAP S/4HANA are associated with
`PRCD_ELEMENTS`; older code commonly references `KONV`. Pricing persistence is
covered in the separate Sales Document Control and Pricing reference.

### 7.5 Material and accounting evidence

In SAP S/4HANA, `MATDOC` is the central material-document line-item persistence
landmark. Financial postings use the accounting-document model, with `ACDOCA`
as the Universal Journal line-item store and classic document header/context
such as `BKPF` still relevant.

Do not join these areas only by visually similar identifiers. Use documented
reference keys, document flow, released CDS associations, or application APIs.

### 7.6 S/4HANA data-model changes

Relevant simplifications include:

- status fields moved from separate `VBUK`/`VBUP` persistence into relevant
  SD document header/item tables;
- `VBFA` document-flow simplification;
- extended SD document-category semantics;
- material-document consolidation centered on `MATDOC`;
- financial line-item consolidation in the Universal Journal.

Legacy names can still surface through compatibility views, extractors, or old
documentation. A technical design must declare its system release and avoid
treating compatibility behavior as a future-stable integration contract.

---

## 8. Grain-Safe Query and Reporting Design

### 8.1 The parent-measure multiplication trap

Suppose one Sales Order header stores a total of `1,000`, with two items and two
schedule lines per item:

```text
1 VBAK row
  → 2 VBAP rows
      → 4 VBEP rows
```

After a flat join, the header value appears four times:

| Order  | Item | Schedule line | Repeated header total |
| ------ | ---- | ------------- | --------------------: |
| 500001 | 0010 | 0001          |                 1,000 |
| 500001 | 0010 | 0002          |                 1,000 |
| 500001 | 0020 | 0001          |                 1,000 |
| 500001 | 0020 | 0002          |                 1,000 |

`SUM(HeaderTotal)` returns `4,000`, although the database join itself is
technically valid.

The governing rule is:

> Aggregate a measure at the grain where the measure is defined.

### 8.2 Safe strategies

- Read one header measure per `VBELN`.
- Aggregate schedule-line quantities to item grain before joining them to item
  measures.
- Aggregate item values to header grain before combining them with header
  measures.
- Include currency and unit semantics in grouping/conversion logic.
- Define whether rejected, cancelled, blocked, reversed, or statistically
  irrelevant rows participate.
- Use released analytical CDS content when it already defines the required
  semantics.

`SUM(DISTINCT HeaderTotal)` is not a general correction. Two different orders
can legitimately have the same total, causing valid values to be removed.

### 8.3 Choose one explicit report grain

Examples:

```text
One row per Sales Order
  key: Sales Order

One row per Sales Order Item
  key: Sales Order + Item

One row per Schedule Line
  key: Sales Order + Item + Schedule Line

One row per Order-to-Cash relationship
  key: predecessor + predecessor item + successor + successor item + category
```

A report that mixes these grains without an explicit bridge/aggregation design
will eventually produce duplicate counts, misleading totals, or ambiguous
statuses.

### 8.4 Currency and unit correctness

An amount without its currency and a quantity without its unit is incomplete.
Do not add `10 EA` to `10 KG`, or total document values across currencies
without a documented conversion date, exchange-rate type, and target currency.

```text
Measure
  + unit/currency
  + grain
  + relevance rule
  + time semantics
  = interpretable result
```

---

## 9. Classic Transaction Map

These transactions are on-premise/private-edition landmarks and depend on role,
release, and system configuration. Public Cloud uses available Fiori apps and
configuration activities instead of assuming these SAP GUI entry points.

| Purpose                                 | Classic transaction                              | Technical boundary                            |
| --------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Create/change/display Sales Order       | `VA01` / `VA02` / `VA03`                         | Sales document                                |
| List Sales Orders                       | `VA05`                                           | Sales-document selection/reporting            |
| Create/change/display Outbound Delivery | `VL01N` / `VL02N` / `VL03N`                      | Delivery execution                            |
| Delivery monitor/due processing         | `VL06O` and related delivery due-list processing | Delivery eligibility and collective execution |
| Reverse goods movement for delivery     | `VL09`                                           | PGI reversal boundary                         |
| Create/change/display Billing Document  | `VF01` / `VF02` / `VF03`                         | Billing                                       |
| Display accounting document             | `FB03`                                           | FI document evidence                          |
| Display customer line items             | `FBL5N`                                          | Receivable/open and cleared item analysis     |
| Post incoming payment                   | `F-28`                                           | Classic FI incoming-payment processing        |

Transaction availability does not define the API contract. A custom application
should not simulate `VA01` by updating `VBAK`, or simulate `VL02N` PGI by
updating delivery status.

### 9.1 Diagnostic navigation pattern

```text
Sales Order display
    ↓ document flow
Delivery display
    ↓ document flow / goods-issue evidence
Material and accounting documents
    ↓
Billing document and accounting document
    ↓
Customer open/cleared item evidence
```

The UI is the starting point for business context. Persistence inspection then
confirms grain and state. Posting documents provide the strongest evidence.

---

## 10. Released CDS and API Boundaries

### 10.1 Contract hierarchy

```text
Best extension/integration boundary
    released business object / API / event
        ↓
    released CDS entity for supported read scenario
        ↓
    internal table inspection for authorized diagnosis
        ↓
Worst write boundary
    direct update of SAP application tables
```

“Released” is system- and release-specific. Verify API State in the target
system and the current SAP Business Accelerator Hub/API documentation before
choosing an object.

### 10.2 Sales Order API hierarchy

The Sales Order A2X OData V2 family commonly exposes a hierarchy such as:

```text
A_SalesOrder
└── A_SalesOrderItem
    └── A_SalesOrderScheduleLine
```

SAP documents `A_SalesOrderScheduleLine` as the item schedule-line entity and
supports navigation from an order item to its schedule lines in the applicable
API. The `A_` prefix is a delivered entity naming convention, not an ABAP
language requirement. Service versions can use different names; always inspect
the service metadata.

### 10.3 Delivery read model

SAP documents `I_DeliveryDocument` as a released basic interface CDS view for
delivery objects, including attributes such as delivery number, shipping point,
dates, partners, and overall statuses. Authorization remains part of the
consumption context. See
[SAP Help — Delivery Document CDS View](https://help.sap.com/docs/SAP_S4HANA_CLOUD/c0c54048d35849128be8e872df5bea6d/e2966bcba73a455299b4937151dfd0a3.html).

A released read view does not automatically authorize a write. Delivery
creation, picking confirmation, PGI, reversal, and other operations need the
specific supported business API for that operation and release.

### 10.4 BAPI, IDoc, OData, and event boundaries

| Contract       | Interaction style                                    | Typical fit                                          | Architectural caution                                                                 |
| -------------- | ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| BAPI           | Usually synchronous business operation               | Classic/on-premise integration and application calls | Check release status, return messages, transaction ownership, and modern alternatives |
| IDoc           | Asynchronous persisted message                       | Decoupled reliable business-message exchange         | Monitor status, retries, duplicates, partner profile, and business idempotency        |
| OData/API      | Synchronous service contract                         | Cloud-ready business access and Fiori/API consumers  | Respect version, ETags, business errors, scope, and API limits                        |
| Business event | Asynchronous notification                            | Inform consumers that a business fact occurred       | Event is not necessarily a full state-transfer payload                                |
| CDS entity     | Read/analytical semantic model, depending on release | Queries, analytics, and supported read scenarios     | Released read access is not write authorization                                       |

For example, a Sales Order BAPI asks SAP application logic to create/change a
business object. An order IDoc represents a persisted integration message that
is processed asynchronously. Neither should be confused with directly inserting
rows into Sales Order tables.

### 10.5 Direct table updates are invalid business operations

Do not directly update:

```text
VBAK / VBAP / VBEP
LIKP / LIPS
VBRK / VBRP
VBFA
MATDOC
ACDOCA
```

These tables participate in application invariants, status propagation,
document flow, pricing, inventory valuation, accounting, change tracking,
authorization, output, and integration. Updating one table cannot reproduce the
complete operation and can corrupt cross-component consistency.

---

## 11. Technical Diagnostic Flow

### 11.1 Universal sequence

```text
Business symptom
    ↓
Identify exact document and item grain
    ↓
Capture actual stored/runtime result
    ↓
Traverse predecessor and successor documents
    ↓
Verify decisive posting evidence
    ↓
Reconstruct master data and configuration inputs
    ↓
Inspect logs/messages/authorizations/integration
    ↓
Investigate enhancements or custom code last
```

This sequence prevents configuration or code changes from being used to explain
a symptom that actually came from transaction input, data grain, missing
master data, an unexecuted posting, or a different document branch.

### 11.2 Missing or unexpected downstream document

When a delivery or billing document is missing:

1. Capture the exact predecessor `VBELN + POSNR` and expected quantity.
2. Inspect rejection, completion, block, and relevance state.
3. Inspect every schedule line, including confirmed quantity/date and delivery
   relevance.
4. Check whether the item is due in the selected horizon and organizational
   scope.
5. Check document flow for an already-created or differently split successor.
6. Verify copy-control requirements and successor type.
7. Inspect application logs and authorization failures.
8. Only then inspect exits, BAdIs, custom logic, or inbound payloads.

### 11.3 “Delivery exists, but stock did not change”

```text
Delivery identity
    ↓
Goods-movement status and actual GI date
    ↓
Material/goods-issue document in document flow
    ↓
MATDOC/released material-document view
    ↓
Stock quantity/value and accounting evidence
```

If the material document does not exist, delivery creation alone is not proof
of PGI. If it exists, check reversal documents and posting dates before
concluding that current stock should still show the original effect.

### 11.4 “Billing exists, but payment is still open”

```text
Billing document
    ↓
Accounting transfer/reference
    ↓
Customer receivable/open item
    ↓
Incoming payment document
    ↓
Clearing document/date or residual/partial state
```

The defect may be no payment, unmatched payment, partial payment, residual item,
currency/difference handling, clearing reset, or a different payer/account—not
a missing Sales Order update.

### 11.5 Technical evidence record

A strong technical incident note records:

```text
System/release and client
Business process variant
Document + item + schedule-line keys
Expected versus actual state
Predecessor/successor identities
Relevant quantities with units
Amounts with currencies
Status evidence
Posting document evidence
Configuration/master-data inputs
Application log/message identifiers
Enhancement/custom-code evidence, if reached
```

---

## 12. RAP Architecture Transfer

### 12.1 Honest aggregate boundary

A portfolio Sales Order Request can use composition for lifecycle-dependent
children:

```text
SalesOrderRequest                         aggregate root
├── composition [0..*] → Items            product/service demand
│   ├── composition [0..*] → Schedules    simplified dated promises
│   ├── association → Product
│   └── association → Plant
├── composition [0..*] → OrderPartners    order-specific role assignments
├── association → BusinessPartner
└── association → SalesArea
```

Product, Plant, Business Partner, and Sales Area exist independently and are
therefore associations rather than lifecycle-owned children.

### 12.2 Do not model the entire O2C chain as one RAP aggregate

```text
Incorrect ownership idea
SalesOrderRequest
└── Delivery
    └── Billing
        └── Payment

Better boundary
SalesOrderRequest BO
    ──handoff/reference/event──> Fulfillment capability
    ──reference/status snapshot─> External successor documents
```

Delivery, material movement, billing, and payment have independent transactional
and reversal lifecycles. If a portfolio cannot connect to a real S/4HANA Sales
or Delivery API, represent the boundary honestly as a simulated handoff or
integration adapter rather than claiming to perform standard SD PGI.

### 12.3 CDS and persistence

Custom RAP CDS entities can expose the same database persistence used by ABAP,
but a CDS model is not a separate database. During a RAP transaction, EML can
also observe unsaved transactional-buffer state that an ordinary database
`SELECT` does not automatically represent.

The analogy to SD is useful:

```text
RAP transactional buffer ≠ committed database state
Confirmed schedule line   ≠ executed PGI state
Editable UI value         ≠ persisted business operation
```

Every layer represents a different degree of commitment.

---

## 13. Technical Insights and Common Misinterpretations

### 13.1 The process is a graph, not a pipeline row

The happy path is drawn as a line for teaching, but partial fulfillment,
combination, splitting, returns, cancellations, and financial clearing create a
graph. Data models and reports must support branching rather than assume one
order equals one delivery equals one invoice.

### 13.2 Document existence and posting evidence are different

An Outbound Delivery is strong evidence of shipping execution preparation but
not of goods issue. A Billing Document is strong evidence of invoicing but not
of cash receipt. Diagnose the business event through its posting document and
status evidence.

### 13.3 Confirmation is commitment, not physical movement

Confirmed quantity answers what SAP currently commits for a date. Delivery and
PGI answer what was operationally processed and physically posted. Combining
these as one “fulfilled quantity” hides important failure states.

### 13.4 Copying is not a live foreign-key projection

Successor documents copy and redetermine data under business rules. The copied
value can intentionally differ from the current predecessor or master data.
Always inspect the value stored in the affected document and its copy-control
context.

### 13.5 Status is a summary, not the cause

An overall status compresses child results. It helps locate a problem but does
not replace inspection of the item, schedule line, delivery, billing, posting,
or clearing record that produced it.

### 13.6 Database correctness includes grain

SQL can be syntactically and relationally valid while producing a wrong
business total. Every quantity and amount must be interpreted with its document
level, unit/currency, relevance rules, and time semantics.

### 13.7 Persistence knowledge is not write authorization

Knowing that Sales Order headers are represented in `VBAK` does not authorize a
program to update `VBAK`. Table knowledge supports diagnosis; released business
operations preserve application invariants.

### 13.8 Component boundaries explain reversal flows

PGI belongs to an inventory/accounting posting boundary even though Shipping
initiates it from the delivery. Billing creates a separate billing/accounting
boundary. Payment is a financial clearing boundary. Separate reversal
operations exist because later documents cannot safely be erased by editing an
earlier Sales Order.

### 13.9 Clean core is a contract decision

Clean core does not mean a consultant must forget classic tables. It means the
extension or integration contract should use released, lifecycle-stable
interfaces. Classic tables and transactions remain valuable evidence in
authorized on-premise/private-edition diagnosis.

### 13.10 A portfolio must label simulation honestly

A custom RAP action named `SubmitForFulfillment` can demonstrate aggregate
validation, authorization, messaging, events, and integration architecture. It
does not become standard SD delivery or PGI unless it calls an appropriate
released S/4HANA contract and the real downstream posting succeeds.

---

## 14. Compact Technical Map

```text
SALES DOCUMENT
VBAK (VBELN)
└── VBAP (VBELN, POSNR)
    └── VBEP (VBELN, POSNR, ETENR)
          │
          │ delivery relevance, due processing, copy control
          ▼
DELIVERY
LIKP (VBELN)
└── LIPS (VBELN, POSNR)
          │
          │ picking / packing / PGI
          ▼
MATERIAL & VALUE POSTING
MATDOC + accounting evidence
          │
          ▼
BILLING
VBRK (VBELN)
└── VBRP (VBELN, POSNR)
          │
          ▼
FINANCIAL ACCOUNTING
BKPF / BSEG / ACDOCA
customer open item → payment → clearing

CROSS-DOCUMENT LINEAGE
VBFA: predecessor document/item → successor document/item

SUPPORTED EXTENSION BOUNDARY
Released CDS / business object / OData API / BAPI / IDoc / event

INVALID WRITE BOUNDARY
Direct updates to SAP application persistence
```

The compact map is intentionally layered. The header/item/schedule hierarchy
describes ownership inside a Sales document. `VBFA` describes lineage between
documents. `MATDOC` and accounting persistence prove postings in other
components. Released interfaces provide the supported integration boundary.
