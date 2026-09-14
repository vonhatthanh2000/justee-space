---
title: SAP SD Fulfillment, Posting, and Integration
part: ABAP
summary: This document explains the technical execution path from a delivery-relevant Sales Order through Outbound Delivery, picking, packing, Post Goods Issue (PGI), billing, accounting, payment clearing, and external integration. It connects business-document boundaries to configuration, persistence, application logs, interfaces, reversals, diagnostic evidence, and clean-core extension design.
category: Technical
tags:
  - sap
  - sd
publishedAt: 2026-08-22
---

# SAP SD Fulfillment, Posting, and Integration — Technical Reference

This document explains the technical execution path from a delivery-relevant
Sales Order through Outbound Delivery, picking, packing, Post Goods Issue
(PGI), billing, accounting, payment clearing, and external integration. It
connects business-document boundaries to configuration, persistence,
application logs, interfaces, reversals, diagnostic evidence, and clean-core
extension design.

The central technical principle is:

> A planned or created document proves intent at its own boundary. Only the
> corresponding posting document and consistent process state prove that a
> physical or financial event occurred.

This reference distinguishes three environments:

- **SAP S/4HANA on-premise or private edition**, where SAP GUI transactions,
  IMG activities, and authorized persistence inspection are common diagnostic
  tools.
- **SAP S/4HANA Cloud Public Edition**, where Fiori applications,
  configuration activities, released APIs, and communication arrangements are
  the normal operational contracts.
- **Clean-core extension development**, where internal SD, MM, and FI tables
  are diagnostic landmarks—not write interfaces or lifecycle-stable APIs.

Primary SAP sources:

- [SAP Learning — Processing Outbound Deliveries](https://learning.sap.com/courses/configuring-delivery-processing-in-sap-s-4hana-sales/processing-outbound-deliveries)
- [SAP Learning — Posting a Goods Issue](https://learning.sap.com/courses/configuring-delivery-processing-in-sap-s-4hana-sales/posting-a-goods-issue)
- [SAP Help — Shipping Points](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/c7894a248ca14f74aca67f97528e5ad7/5d1bbf53d25ab64ce10000000a174cb4.html)
- [SAP Help — Goods Issue](https://help.sap.com/docs/SAP_S4HANA_CLOUD/aff0b3f5f46c42a2b2c0fabfc233bab2/64f81a71edf5490ab522a829be075827.html)
- [SAP Help — Outbound Delivery API Operations](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/2f36056ae9a044bba55bcbad204b7bc5/a4c5d84ecef2494985883829a24e393c.html)
- [SAP Learning — Billing and Integration to SAP S/4HANA Finance](https://learning.sap.com/courses/exploring-sap-s-4hana-sales-essentials/executing-the-billing-process-and-the-integration-to-sap-s-4hana-finance_e2dd5db3-73c3-4cda-8ad5-1e7f39f04fba)
- [SAP Help — Canceling Billing Documents](https://help.sap.com/docs/SAP_S4HANA_CLOUD/a376cd9ea00d476b96f18dea1247e6a5/2a70b6535fe6b74ce10000000a174cb4.html)
- [SAP Help — IDoc Inbound Processing](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/7b24a64d9d0941bda1afa753263d9e39/4b4c8e091c300a93e10000000a421937.html)

---

## 1. Execution Boundaries

### 1.1 Baseline sell-from-stock flow

```text
Sales Order
  accepted demand and commercial intent
        │
        ▼
Outbound Delivery
  shipping execution object
        │
        ├── picking
        ├── packing
        └── warehouse execution
        │
        ▼
Post Goods Issue
  inventory and relevant value posting
        │
        ▼
Billing Document
  customer invoice and FI transfer
        │
        ▼
Incoming Payment and Clearing
  cash receipt and receivable settlement
```

This is a baseline, not a universal sequence. Third-party sales, services,
intercompany processing, consignment, returns, pro forma billing, EWM-managed
warehouses, and other scenarios use different branches.

### 1.2 Each boundary proves one fact

| Evidence                     | Fact established                           | Fact not established                     |
| ---------------------------- | ------------------------------------------ | ---------------------------------------- |
| Sales Order exists           | Demand and processing intent were recorded | Goods were shipped                       |
| Outbound Delivery exists     | Shipping execution document was created    | Picking or PGI completed                 |
| Picking complete             | Required warehouse staging was recorded    | Inventory was posted out                 |
| PGI material document exists | Goods issue posting occurred               | Customer was billed or paid              |
| Billing Document exists      | Billing transaction was created            | FI transfer and payment always succeeded |
| FI customer open item exists | Receivable was posted                      | Incoming cash was matched and cleared    |
| Payment document exists      | Cash-related posting occurred              | The intended invoice was fully cleared   |

The technical investigation must move to the evidence owned by the failing
boundary rather than infer later events from an earlier document.

### 1.3 State transition versus data creation

```text
Create Delivery  → new delivery aggregate
Pick             → update warehouse/delivery execution state
Pack             → create or update handling-unit assignment
Post GI          → create posting documents and update delivery state
Create Billing   → new billing aggregate and possible FI posting
Receive Payment  → new FI posting and clearing relationship
```

These operations require business logic. Directly inserting or updating a row
cannot reproduce their cross-component effects.

---

## 2. From Sales Order to Delivery Due Processing

### 2.1 Delivery eligibility

A Sales Order item becomes relevant to delivery processing only when its
transactional and configured conditions permit it. Typical evidence includes:

- item and schedule-line delivery relevance;
- confirmed quantity remaining for delivery;
- material and Plant data;
- Shipping Point and route/shipping context;
- relevant delivery date within the due-list horizon;
- no blocking or rejection state preventing delivery;
- sufficient completion of required document data;
- no successor delivery already consuming the due quantity.

```text
Configured relevance
  + confirmed open quantity
  + due date in selection horizon
  + valid organizational/shipping data
  + no effective block or completion
  = candidate for delivery due processing
```

The due list is a selection and work-processing mechanism. Absence from it does
not by itself prove a program defect.

### 2.2 Quantity separation

| Measure            | Grain                        | Meaning                                     |
| ------------------ | ---------------------------- | ------------------------------------------- |
| Ordered quantity   | Sales Order item             | Total customer demand                       |
| Confirmed quantity | Schedule line/date           | Quantity currently committed                |
| Delivery quantity  | Delivery item                | Quantity placed into one execution document |
| Picked quantity    | Delivery/warehouse execution | Quantity staged for dispatch                |
| GI quantity        | Material-document item       | Quantity physically posted out              |
| Billed quantity    | Billing item                 | Quantity used by billing basis              |

“Open quantity” must be qualified:

```text
Open order quantity
Open confirmed quantity for delivery
Unpicked delivery quantity
Unposted GI quantity
Unbilled quantity
```

Each measure has a different source, relevance rule, and unit context.

### 2.3 Classic navigation

| Operation                             | Common classic landmark |
| ------------------------------------- | ----------------------- |
| Create delivery with order reference  | `VL01N`                 |
| Process delivery due list             | `VL10*` family          |
| Outbound Delivery Monitor             | `VL06O`                 |
| Display Sales Order and document flow | `VA03`                  |

Public Cloud uses role-specific Fiori apps and background processing rather
than assuming the same transaction set.

---

## 3. Delivery Creation, Combination, and Split

### 3.1 Delivery creation

Delivery creation copies and determines data into a new business document. It
does not turn a Sales Order item into a delivery row.

```text
Due predecessor item/schedule quantity
  + copy-control requirements
  + delivery type and item behavior
  + combination/split criteria
  + runtime determinations
  = Outbound Delivery header and items
```

The new delivery has its own identity, ownership, authorization, status,
change restrictions, and reversal path.

### 3.2 Many predecessors can combine

Compatible Sales Order items can be grouped into one delivery when all
combination-relevant values permit it.

```text
Order A / Item 10 ─┐
                    ├──> Delivery 800001
Order B / Item 20 ─┘
```

Typical commonality requirements include the same Shipping Point and Ship-to
Party, plus compatible route, delivery timing, and other delivery-header data.
The exact split-relevant set depends on process and release.

### 3.3 One predecessor can split

```text
Sales Order Item 10
  ├── Delivery 800001 for 6 EA
  └── Delivery 800025 for 4 EA
```

Split causes can include:

- different Shipping Points;
- different Ship-to Parties or addresses;
- incompatible routes or delivery dates;
- different delivery types or header-relevant data;
- capacity, warehouse, or business-process decisions;
- custom split logic or enhancements.

The correct diagnostic action is to compare the actual split-relevant values
and application split analysis—not guess from document count.

### 3.4 Copy control

Copy control governs whether and how predecessor data is transferred to a
successor. It can include:

- permitted source/target document combinations;
- header- and item-level copy requirements;
- data-transfer routines;
- quantity and completion behavior;
- document-flow updates.

Common classic landmarks include:

| Flow                            | Classic transaction |
| ------------------------------- | ------------------- |
| Sales document → Sales document | `VTAA`              |
| Sales document → Delivery       | `VTLA`              |
| Sales document → Billing        | `VTFA`              |
| Delivery → Billing              | `VTFL`              |
| Billing → Billing               | `VTFF`              |

Copy control is not a database-copy command. It is application configuration
executed during successor creation.

---

## 4. Outbound Delivery Data Model

### 4.1 Header and item grain

```text
LIKP — Outbound Delivery header
  key: VBELN
  │
  └── LIPS — Outbound Delivery item
        key: VBELN + POSNR
```

Representative fields include:

| Meaning                | Classic clue                       | Grain                                               |
| ---------------------- | ---------------------------------- | --------------------------------------------------- |
| Delivery type          | `LIKP-LFART`                       | Header                                              |
| Shipping Point         | `LIKP-VSTEL`                       | Header result; derived from compatible item context |
| Planned GI date        | `LIKP-WADAT`                       | Header expectation                                  |
| Actual GI date         | `LIKP-WADAT_IST`                   | Header posting result clue                          |
| Delivery item category | `LIPS-PSTYV`                       | Item                                                |
| Delivery quantity      | `LIPS-LFIMG` with unit             | Item                                                |
| Picked quantity        | `LIPS-PIKMG` with its unit context | Item                                                |
| Movement type proposal | `LIPS-BWART`                       | Item posting instruction                            |
| Immediate predecessor  | `LIPS-VGBEL + LIPS-VGPOS`          | Item source reference                               |

`LF` is a common standard delivery type and `601` a common sell-from-stock goods
issue movement type. Both are configurable examples, not universal constants.

### 4.2 Direct predecessor versus document flow

```text
LIPS-VGBEL / VGPOS
  → immediate source document/item copied into this delivery item

VBFA
  → broader predecessor/successor graph across SD document categories
```

The direct reference and document-flow graph have related but different
purposes. A robust trace can use both.

### 4.3 Delivery control configuration

Common classic landmarks include:

| Purpose                             | Transaction | Configuration clue                         |
| ----------------------------------- | ----------- | ------------------------------------------ |
| Define delivery type                | `OVLK`      | delivery-header behavior                   |
| Define delivery item category       | `OVLP`      | delivery-item behavior                     |
| Shipping Point determination        | `OVL2`      | Plant + shipping condition + loading group |
| Sales order → delivery copy control | `VTLA`      | source/target copying behavior             |

The selected delivery type and item category are transaction data. The
maintenance transactions define reusable behavior.

---

## 5. Picking, Packing, and Warehouse Execution

### 5.1 Different execution facts

| Activity         | Business meaning                                          | Technical result                                                       |
| ---------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Picking          | Remove and stage required stock from a warehouse location | Picking quantity/status or warehouse-task confirmation                 |
| Packing          | Assign products to physical shipping units                | Handling Units and packaging relationships                             |
| Loading/shipping | Prepare transport departure                               | Delivery/shipment execution state according to process                 |
| PGI              | Record goods departure in Inventory Management            | Material document, status, date, and accounting effects where relevant |

Packing is not required in every process. Picking can be controlled in the
delivery directly, through Lean Warehouse Management, classic Warehouse
Management, Stock Room Management, or Extended Warehouse Management.

### 5.2 Warehouse architecture changes the route

```text
Simple delivery execution
  Delivery → record picking → PGI

EWM-managed execution
  LE delivery → EWM delivery objects → warehouse tasks
              → pick/pack/stage → EWM goods issue
              → confirmation to LE delivery and ERP postings
```

The exact document chain differs, but the boundary remains the same: warehouse
task completion and picking status are not themselves Inventory Management
goods-issue posting.

### 5.3 Handling Units

A Handling Unit combines packaging material with packed goods. Classic
persistence landmarks include `VEKP` for HU header and `VEPO` for HU items, but
their use depends on scenario and architecture.

```text
Delivery item quantity
  └── packed into Handling Unit
        ├── packaging material
        ├── contained product quantity
        └── identification/status
```

Use supported HU and warehouse APIs for integration. Direct table updates
cannot safely maintain nested packing, status, serial/batch, and warehouse
relationships.

### 5.4 Picking status versus goods-movement status

| Status family  | Header clue  | Item clue    | Meaning                 |
| -------------- | ------------ | ------------ | ----------------------- |
| Picking        | `LIKP-KOSTK` | `LIPS-KOSTA` | Picking progress        |
| Goods movement | `LIKP-WBSTK` | `LIPS-WBSTA` | Goods-movement progress |

```text
Picking complete + goods movement not started
```

is a valid intermediate state. It proves warehouse staging but not stock
posting.

---

## 6. Post Goods Issue

### 6.1 PGI as the decisive posting boundary

For a common delivery-related sell-from-stock process, PGI records that the
goods left the company and produces the Inventory Management posting.

```text
Before PGI
  Delivery exists
  Quantity can be picked and packed
  Movement type is only an instruction

After successful PGI
  Material document exists
  Delivery goods-movement state is updated
  Actual GI date is recorded
  Inventory quantity is reduced
  Relevant inventory-value/accounting effects exist
  Delivery-related billing can normally continue
```

PGI must be executed through the application operation. Writing the actual GI
date or goods-movement status would not create the material and accounting
documents.

### 6.2 Typical accounting effect

For a valuated stock sale, a simplified posting is:

```text
Debit   Cost of Goods Sold
Credit  Inventory
```

Actual accounts and controlling/profitability effects depend on valuation,
movement type, account determination, account assignment, ledger design, and
process variant. The example is conceptual, not a universal journal template.

PGI accounting and billing accounting are separate:

```text
PGI posting
  inventory and cost-side effect

Billing posting
  customer receivable, revenue, and tax-side effect
```

### 6.3 Proof hierarchy

| Observation                                       | Evidential strength                              |
| ------------------------------------------------- | ------------------------------------------------ |
| Delivery exists                                   | proves delivery creation only                    |
| Picked quantity complete                          | proves picking state only                        |
| Movement type `601` present                       | proves proposed/configured posting behavior only |
| Actual GI date and completed goods-movement state | strong delivery-side evidence                    |
| Related material document and line item           | decisive posting evidence                        |
| Consistent inventory and accounting effects       | corroborating cross-component evidence           |

A successful UI message or HTTP status should be correlated with the resulting
business-document identity and state before downstream work is triggered.

### 6.4 Material-document persistence in S/4HANA

```text
SAP ERP model
  MKPF  material-document header
  MSEG  material-document item

SAP S/4HANA persistence
  MATDOC central material-document line-item persistence
  compatibility views preserve selected legacy read semantics
```

A common material-document identity uses document number, year, and item
context. Use released material-document CDS views or APIs for clean-core access
rather than binding new code to `MATDOC` layout.

### 6.5 PGI API operation

In supported releases, `API_OUTBOUND_DELIVERY_SRV` exposes a
`PostGoodsIssue` operation. SAP documents that the Delivery Document is
mandatory and the current ETag is required.

```text
GET delivery/current ETag
  → validate local intent
  → POST PostGoodsIssue with If-Match
  → inspect HTTP/business result
  → reread delivery and posting evidence
```

The ETag prevents a caller from posting against a stale delivery version. It
does not replace business validation, authorization, idempotency, or posting
evidence.

---

## 7. Reversing Goods Issue

### 7.1 Reversal preserves history

If PGI data is wrong, the normal correction is:

```text
Reverse PGI
  → create reversing material/accounting effects
  → restore delivery to an editable process state as permitted
  → correct delivery data
  → post PGI again
```

The classic landmark is `VL09`. Reversal does not delete the original posting
or rewrite history. It creates compensating evidence and updates process state.

### 7.2 Reversal dependency checks

Later documents can restrict reversal. Before reversing PGI, inspect:

- subsequent Billing Documents;
- warehouse/EWM state;
- period and posting-date controls;
- batch, serial number, and stock availability implications;
- authorization and business-process restrictions.

If billing already exists, the required sequence commonly starts by canceling
the downstream billing result before reversing PGI. The precise sequence is
process- and configuration-dependent.

### 7.3 Reversal is not negative direct SQL

```text
Original posting + reversal posting = auditable correction chain
Direct overwrite/delete             = lost lineage and inconsistency
```

This pattern repeats in billing and FI clearing.

---

## 8. Billing Eligibility and Creation

### 8.1 Order-related and delivery-related billing

```text
Order-related billing
  Sales Order item → Billing Document

Delivery-related billing
  Outbound Delivery item → Billing Document
```

The Item Category, billing relevance, copy control, process status, quantity,
and billing block determine how an item participates. Physical products are
commonly delivery-related; services and other processes can be order-related.

### 8.2 Billing due processing

Typical eligibility evidence includes:

- billing relevance of the source item;
- billable quantity or value;
- required predecessor processing state;
- billing date in the selection horizon;
- no effective billing block;
- complete required billing data;
- no existing successor already consuming the billable basis.

Classic landmarks:

| Operation                         | Transaction |
| --------------------------------- | ----------- |
| Create Billing Document           | `VF01`      |
| Process billing due list          | `VF04`      |
| Background billing                | `VF06`      |
| Display Billing Document          | `VF03`      |
| Display blocked billing documents | `VFX3`      |

### 8.3 Billing combination and split

Compatible source items can combine into one Billing Document. Differences in
billing-header criteria can cause a split, for example payer, billing date,
payment terms, destination country, Incoterms, or other configured data.

```text
Several deliveries ──compatible billing data──> one invoice

One delivery ──incompatible billing data──────> several invoices
```

Use Billing Split Analysis and compare actual header-relevant values. Do not
assume one delivery must always create one invoice.

### 8.4 Billing copy control and pricing

`VTFL` commonly maintains Delivery-to-Billing copy control, while `VTFA`
maintains Sales-Document-to-Billing copy control.

Copy control can govern:

- source and target document combinations;
- copying requirements and data-transfer routines;
- quantity/value basis;
- pricing type and repricing behavior;
- update of document flow.

A Billing Document may copy or redetermine pricing according to the pricing
type. Its result therefore need not be numerically identical to the Sales Order
pricing result.

---

## 9. Billing Data Model and Cancellation

### 9.1 Persistence grain

```text
VBRK — Billing Document header
  key: VBELN
  │
  └── VBRP — Billing Document item
        key: VBELN + POSNR
```

Related landmarks include:

| Object            | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `VBPA`            | Billing-document partner rows among other SD partners |
| `VBFA`            | Predecessor/successor document flow                   |
| `PRCD_ELEMENTS`   | S/4HANA document pricing-result rows                  |
| `BKPF` / `ACDOCA` | Accounting header/context and Universal Journal lines |

The repeated field `VBELN` is scoped by table and document category. A Sales
Order number, delivery number, and billing number are different identities
even where field names are shared.

### 9.2 Billing type and account determination

Common classic configuration landmarks include:

| Purpose                               | Transaction |
| ------------------------------------- | ----------- |
| Define Billing Types                  | `VOFA`      |
| Delivery → Billing copy control       | `VTFL`      |
| Sales document → Billing copy control | `VTFA`      |
| Revenue account determination         | `VKOA`      |

Revenue account determination commonly combines organizational and account-
assignment context such as:

```text
Chart of accounts
  + Sales Organization
  + customer account-assignment group
  + material account-assignment group
  + account key from pricing procedure
  = G/L account
```

The actual access combination and result are configuration-dependent. Typical
master-data clues include `KNVV-KTGRD` for customer account-assignment group and
`MVKE-KTGRM` for material account-assignment group.

### 9.3 Typical billing accounting effect

For a normal customer invoice, a simplified view is:

```text
Debit   Customer receivable
Credit  Revenue
Credit  Output tax, where applicable
```

Saving a standard billing document commonly transfers data to Financial
Accounting automatically. Exceptions include pro forma documents, posting
blocks, account-determination failures, closed periods, and other process
controls. Billing-document existence alone therefore does not prove successful
FI transfer.

### 9.4 Billing cancellation

The classic transaction is `VF11`. Cancellation creates a cancellation Billing
Document; it does not delete the original invoice.

```text
Original Billing Document
  → Cancellation Billing Document
  → offsetting FI entry when accounting transfer applies
  → predecessor can become open for correct rebilling
```

SAP's Billing Document API also exposes a cancellation action in supported
releases and requires ETag handling. A cancellation response must be correlated
with the cancellation document and accounting status.

---

## 10. Financial Accounting and Incoming Payment

### 10.1 Billing creates a receivable, not payment

```text
Billing posting
  → customer open item / receivable

Incoming payment
  → cash or bank-clearing posting
  → matching and clearing against open item
```

The Sales Order does not become “paid” by receiving a field update from FI.
Payment and clearing are Financial Accounting transactions with their own
document identities and states.

### 10.2 Common payment outcomes

| Outcome              | Meaning                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| Full clearing        | Payment settles the selected receivable completely                             |
| Partial payment      | Payment is posted while the original invoice remains open according to process |
| Residual item        | Original item is cleared and a new residual open item is created               |
| On-account payment   | Payment is posted without immediate invoice matching                           |
| Difference/write-off | Configured tolerance or reason handling resolves a difference                  |

One payment can clear multiple invoices, and one invoice can be settled by
multiple payment-related postings. The relationship is not inherently one-to-
one.

### 10.3 Classic navigation

| Purpose                              | Common classic landmark                                |
| ------------------------------------ | ------------------------------------------------------ |
| Display accounting document          | `FB03`                                                 |
| Display customer line items          | `FBL5N`                                                |
| Post incoming payment manually       | `F-28`                                                 |
| Electronic bank statement processing | release/process-specific applications and transactions |

### 10.4 Clearing evidence

```text
Billing Document
  → accounting document reference
  → customer receivable line
  → clearing document/date or remaining open state
  → payment/bank posting
```

Payment status in an SD-oriented report should be derived from an authorized,
documented FI source or released API/CDS model. A custom Boolean copied into an
order can become stale and cannot represent partial or residual settlement.

---

## 11. Document Flow and Status Architecture

### 11.1 The process is a graph

```text
Sales Order Item 10
  ├── Delivery A → Material Document A → Invoice A
  └── Delivery B → Material Document B → Invoice B

Invoice A
  ├── Payment 1
  └── Cancellation or credit branch, when applicable
```

Several Sales Orders can also combine into one delivery or invoice. Order-to-
Cash cannot be represented reliably as one foreign-key chain with one status.

### 11.2 `VBFA` as the SD relationship landmark

Representative fields include:

| Field                    | Meaning                                  |
| ------------------------ | ---------------------------------------- |
| `VBELV`                  | Preceding SD document                    |
| `POSNV`                  | Preceding item                           |
| `VBELN`                  | Subsequent SD document                   |
| `POSNN`                  | Subsequent item                          |
| document-category fields | Classify predecessor and successor types |
| `STUFE`                  | Document-flow level context              |

S/4HANA extended document-category semantics and simplified `VBFA`. New code
should not hard-code old one-character assumptions without checking the target
release.

### 11.3 Status is compressed evidence

Overall statuses answer whether processing is open, partial, complete, or not
relevant according to application rules. They do not explain the cause.

```text
Overall status
  → item statuses
  → source and successor quantities
  → document-flow edges
  → posting documents
```

S/4HANA moved many SD status fields from separate `VBUK`/`VBUP` persistence
into relevant document header/item tables. Compatibility artifacts can still
surface legacy names. Released CDS/API status fields are safer extension
contracts.

### 11.4 Reversed documents remain evidence

Reversal and cancellation append corrective documents and status transitions.
Reports must decide deliberately whether to show:

- gross posted quantity/value;
- reversing quantity/value;
- net current effect;
- original and reversal identities;
- current process eligibility.

Deleting reversed rows from a dataset can hide audit history; counting both as
positive can overstate activity.

---

## 12. Cross-Component Persistence Map

| Boundary                     | Header/primary landmark | Item/detail landmark                   | Native grain                            |
| ---------------------------- | ----------------------- | -------------------------------------- | --------------------------------------- |
| Sales Order                  | `VBAK`                  | `VBAP`, `VBEP`                         | order; item; schedule line              |
| Outbound Delivery            | `LIKP`                  | `LIPS`                                 | delivery; delivery item                 |
| SD document flow             | —                       | `VBFA`                                 | predecessor/successor item relationship |
| Handling Unit                | `VEKP`                  | `VEPO`                                 | HU; packed item                         |
| Material document in S/4HANA | —                       | `MATDOC`                               | material-document line                  |
| Billing Document             | `VBRK`                  | `VBRP`                                 | billing header; billing item            |
| Pricing result               | —                       | `PRCD_ELEMENTS`                        | pricing document/item/step/counter      |
| Accounting                   | `BKPF` context          | `ACDOCA`; classic views such as `BSEG` | journal-entry line                      |
| IDoc                         | `EDIDC`                 | `EDID4`, `EDIDS`                       | message control; segment; status event  |

These tables do not form one safe flat join. Document categories, fiscal year,
Company Code, item numbers, units, currencies, and one-to-many relationships
must be respected.

### 12.1 Grain-safe reporting

```text
Delivery item
  → may have several document-flow edges
  → may have several material-document lines
  → may contribute to several billing items

Naive join
  → row multiplication
  → repeated quantities and values
```

Safe design:

1. Choose one output grain.
2. Aggregate each child source to that grain.
3. Preserve units, currencies, reversal signs, and relevance rules.
4. Join summarized results.
5. Reconcile against application totals.

---

## 13. Classic Transaction and Configuration Map

These are on-premise/private-edition landmarks. Availability depends on
release, role, activated scope, and warehouse architecture.

### 13.1 Operational transactions

| Area                           | Common transaction          |
| ------------------------------ | --------------------------- |
| Sales Order display            | `VA03`                      |
| Delivery create/change/display | `VL01N` / `VL02N` / `VL03N` |
| Delivery due processing        | `VL10*`                     |
| Outbound Delivery Monitor      | `VL06O`                     |
| Reverse goods issue            | `VL09`                      |
| Billing create/change/display  | `VF01` / `VF02` / `VF03`    |
| Billing due list               | `VF04`                      |
| Cancel Billing Document        | `VF11`                      |
| Display accounting document    | `FB03`                      |
| Display customer line items    | `FBL5N`                     |
| Post incoming payment          | `F-28`                      |

### 13.2 Configuration transactions

| Area                            | Common transaction | Responsibility                                                     |
| ------------------------------- | ------------------ | ------------------------------------------------------------------ |
| Shipping Point determination    | `OVL2`             | Plant + shipping condition + loading group result                  |
| Delivery type                   | `OVLK`             | Header-level delivery behavior                                     |
| Delivery item category          | `OVLP`             | Item-level delivery behavior                                       |
| Sales → Delivery copy control   | `VTLA`             | Eligibility and data transfer                                      |
| Delivery → Billing copy control | `VTFL`             | Billing basis, routines, pricing type                              |
| Sales → Billing copy control    | `VTFA`             | Order-related billing transfer                                     |
| Billing type                    | `VOFA`             | Billing-header behavior and cancellation relation                  |
| Revenue account determination   | `VKOA`             | Pricing/account-assignment context to G/L account                  |
| Movement type control           | `OMJJ`             | Inventory movement behavior; cross-process impact requires caution |

Always begin from the IMG activity and business requirement. Transaction codes
are navigation shortcuts, not a substitute for configuration design and
transport governance.

---

## 14. Missing Delivery Diagnostic Flow

### 14.1 Evidence sequence

```text
Exact Sales Order item
  → item/schedule delivery relevance
  → confirmed quantity and requested/confirmed date
  → open quantity after existing successors
  → Plant, Shipping Point, route, and due-list selection
  → rejection, completion, block, and incompletion
  → copy-control requirement
  → application log and authorization
  → enhancements only after standard evidence
```

### 14.2 Common cause classes

| Cause class                | Evidence                                      |
| -------------------------- | --------------------------------------------- |
| Not due                    | relevant date outside selection horizon       |
| No open confirmed quantity | schedule-line and successor quantities        |
| Not delivery relevant      | Item/Schedule-Line Category control           |
| Blocked or rejected        | document/item/schedule state                  |
| Missing shipping data      | Plant, Shipping Point, route, partner/address |
| Already processed          | document flow and existing delivery quantity  |
| Copy requirement failed    | copy-control routine and runtime data         |
| Authorization/job issue    | application log, job log, authorization trace |

Do not change due-list configuration merely because one item is absent. First
prove the exact failing eligibility condition.

---

## 15. Unexpected Delivery Split Diagnostic Flow

```text
1. Identify all resulting delivery numbers and source items
2. Confirm quantities and source references
3. Compare Shipping Point and Ship-to Party/address
4. Compare route, delivery date, delivery type, and header-relevant values
5. Use available split analysis or application log
6. Verify copy-control and combination rules
7. Inspect warehouse/capacity process decisions
8. Investigate custom split logic only after the differing field is known
```

The strongest finding names the exact value that prevented combination:

```text
Source Item A: Shipping Point 1000
Source Item B: Shipping Point 2000
Result: separate delivery headers required
```

“SAP decided to split” is not a technical root cause.

---

## 16. PGI Failure Diagnostic Flow

```text
Delivery and exact item
  → picking/warehouse completion
  → delivery quantity, unit, batch, serial, stock type
  → Plant, storage location, movement type
  → posting date and open period
  → stock and negative-stock rules
  → account determination and valuation
  → delivery and goods-movement status
  → warehouse/EWM queues and application logs
  → authorization trace
  → custom code last
```

### 16.1 Failure families

| Failure family        | Typical evidence                                                     |
| --------------------- | -------------------------------------------------------------------- |
| Warehouse incomplete  | open warehouse tasks or picking status                               |
| Quantity mismatch     | delivery, picking, base-unit, or batch quantity conflict             |
| Master-data issue     | missing valuation, serial/batch, storage, or account-assignment data |
| Posting-period issue  | FI/MM period or posting date message                                 |
| Stock issue           | insufficient relevant stock or stock-type mismatch                   |
| Account determination | missing G/L account or valuation combination                         |
| Lock/concurrency      | enqueue or stale ETag conflict                                       |
| Integration           | queue, API, IDoc, tRFC, or middleware error                          |

The exact message class, number, variables, application log, and document
state are evidence. A paraphrase such as “PGI failed” is only the symptom.

---

## 17. Billing and Payment Diagnostic Flows

### 17.1 Source absent from billing due list

```text
Source document/item
  → billing relevance and billing basis
  → required predecessor state
  → billable quantity/value
  → billing date and due-list horizon
  → billing block/incompletion
  → existing successor Billing Documents
  → VTFA or VTFL copy requirement
  → application log and authorization
```

### 17.2 Billing Document exists but FI document is missing

```text
Billing Document and posting status
  → pro forma versus accounting-relevant billing type
  → account-determination result in VKOA
  → customer and material account-assignment groups
  → posting date and FI period
  → tax and G/L account configuration
  → accounting interface/application log
  → correction and authorized release/reprocessing path
```

### 17.3 Billing exists but receivable remains open

```text
Billing → FI accounting document → customer line item
  → payment document
  → clearing document/date
  → partial/residual/on-account outcome
  → payer, currency, amount, reference, and tolerance
```

The open item may be correct because payment has not arrived, was posted on
account, was only partial, or matched a different receivable.

---

## 18. Integration Contract Selection

### 18.1 Contract comparison

| Contract       | Style                                                | Appropriate use                                             | Main technical concerns                                         |
| -------------- | ---------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| BAPI           | Synchronous business operation, commonly RFC-enabled | Classic SAP-to-SAP or application call in supported systems | return messages, LUW ownership, commit, release status          |
| IDoc           | Persisted asynchronous business message              | Decoupled ALE/EDI and middleware exchange                   | statuses, retries, duplicates, partner profile, monitoring      |
| OData/REST API | Synchronous HTTP service contract                    | Cloud-ready transactional/read integration                  | authentication, CSRF, ETag, batching, version, business errors  |
| SOAP API       | Contract-first service                               | Enterprise integrations where delivered                     | reliable messaging, faults, version, communication arrangement  |
| Business event | Asynchronous notification                            | Inform consumers that a business fact occurred              | delivery guarantee, duplicate events, state retrieval, ordering |
| CDS view       | Semantic read model for supported capability         | Read, analytics, extraction where released                  | authorization, extraction delta, grain, not a write API         |

### 18.2 BAPI versus RFC

RFC is the remote-call mechanism. A BAPI is a business-oriented method/API
contract that is often implemented through an RFC-enabled function module.

```text
RFC  → how an ABAP callable unit can be invoked remotely
BAPI → released/stable business operation in the classic Business Object model
```

A common classic Sales Order creation BAPI is
`BAPI_SALESORDER_CREATEFROMDAT2`. Its availability does not automatically make
it the preferred clean-core interface for every S/4HANA edition.

Typical call responsibility:

```text
Call BAPI
  → inspect every RETURN/BAPIRET2 message
  → treat error/abort messages as failure
  → call BAPI_TRANSACTION_COMMIT with WAIT on success
  → call BAPI_TRANSACTION_ROLLBACK on failure when appropriate
  → store returned business-document identity
```

Do not commit inside a reusable helper without an explicit transaction-
ownership decision. The caller may need several operations in one SAP LUW.

### 18.3 API concurrency and evidence

Released delivery and billing operations can require ETags. The correct flow is:

```text
Read current representation and ETag
  → construct operation from current state
  → send If-Match and CSRF token as required
  → interpret HTTP and business error payload
  → persist correlation key
  → reread or consume event to confirm final state
```

HTTP `2xx` proves acceptance/success according to that API operation; it does
not by itself replace the business evidence required by the application. Some
operations return an empty body, making the correlation and reread especially
important.

---

## 19. IDoc Architecture

### 19.1 Message Type, Basic Type, and extension

```text
Message Type
  business meaning, such as order or invoice

Basic Type
  hierarchical technical segment structure

Extension
  customer-specific additional segments attached to a Basic Type
```

Common SD-oriented Message Type examples include:

| Business exchange             | Common Message Type example |
| ----------------------------- | --------------------------- |
| Order                         | `ORDERS`                    |
| Order response                | `ORDRSP`                    |
| Advance shipping notification | `DESADV`                    |
| Invoice                       | `INVOIC`                    |

Basic Type versions such as `ORDERS05`, `DELVRY...`, or `INVOIC02` depend on
the scenario, partner, release, and mapping contract. Message Type and Basic
Type must not be used as synonyms.

### 19.2 Runtime records

| Record         | Classic table | Purpose                                                               |
| -------------- | ------------- | --------------------------------------------------------------------- |
| Control record | `EDIDC`       | sender, receiver, Message Type, Basic Type, direction, current status |
| Data records   | `EDID4`       | ordered segment payload instances                                     |
| Status records | `EDIDS`       | append-only processing history and messages                           |

```text
One EDIDC control record
  ├── many EDID4 segment records
  └── many EDIDS status-history records
```

An IDoc is an integration document, not the Sales Order, delivery, or invoice
it may create. The application document has a separate identity.

### 19.3 Outbound flow

```text
Application/output/change event
  → build IDoc control and data records
  → check WE20 outbound partner profile
  → resolve WE21 port/transport
  → dispatch through tRFC/qRFC/file/middleware path
  → record status history
  → receiver processes business message
```

### 19.4 Inbound flow

```text
Sender/middleware
  → IDoc received and persisted
  → partner/message profile recognized
  → inbound process code resolves processing logic
  → application function executes
  → business document created or application error recorded
  → IDoc status appended
```

SAP explicitly separates receipt/persistence of an inbound IDoc from later
application processing. Successful technical receipt is therefore not proof
that the Sales Order or other application document was posted.

### 19.5 Configuration and monitoring landmarks

| Transaction     | Purpose                                                   |
| --------------- | --------------------------------------------------------- |
| `WE20`          | Partner profiles and inbound/outbound parameters          |
| `WE21`          | Ports and technical transport destination                 |
| `WE30`          | IDoc Basic Type structure                                 |
| `WE31`          | Segment type definition                                   |
| `WE42`          | Inbound process code                                      |
| `WE57`          | Function Module, Message Type, and Basic Type assignment  |
| `WE02` / `WE05` | Display and search IDocs/status history                   |
| `BD87`          | Controlled reprocessing of eligible IDocs                 |
| `WE19`          | Test tool; use only in a safe non-production test context |
| `SM58`          | tRFC backlog/error monitoring                             |
| `SMQ1` / `SMQ2` | outbound/inbound qRFC queue monitoring                    |
| `SLG1`          | application-log analysis where the process writes logs    |

Common status examples include:

| Status | Common meaning                                   |
| ------ | ------------------------------------------------ |
| `03`   | Outbound data passed to port                     |
| `02`   | Outbound error passing data to port              |
| `64`   | Inbound IDoc ready for application processing    |
| `53`   | Inbound application document posted successfully |
| `51`   | Inbound application posting error                |

Status meanings should be confirmed in the target system and scenario.
Status `53` is strong IDoc-side evidence of successful application processing,
but the created application-document identity should still be captured.

### 19.6 Safe reprocessing

```text
Failed IDoc
  → inspect current and previous statuses
  → read exact application message
  → correct root cause in master data/configuration/application
  → assess duplicate/idempotency risk
  → reprocess through supported tool
  → confirm new status and business document
```

Never edit `EDIDC`, `EDID4`, or `EDIDS` directly to make a message appear
successful. Repeated processing can create duplicate business documents unless
the receiving logic and business keys are idempotent.

---

## 20. Integration Observability and Failure Isolation

### 20.1 Four failure domains

```text
Caller/application
  request construction, mapping, credentials
        │
Transport/middleware
  HTTP, RFC, queue, routing, transformation
        │
SAP interface layer
  service activation, partner profile, deserialization, authorization
        │
SAP business application
  master data, configuration, validation, lock, posting, account determination
```

The same user symptom can originate in any domain. Record correlation IDs and
business keys across all layers.

### 20.2 Minimum integration evidence

```text
Source business key
Interface contract and version
Correlation/message/IDoc identifier
Request timestamp and sender/receiver
Sanitized request or mapped business fields
Transport response/status
SAP business messages
Created or changed document identity
Final application state/posting evidence
Retry/reversal history
```

### 20.3 Technical success versus business success

| Observation                                | Interpretation                                             |
| ------------------------------------------ | ---------------------------------------------------------- |
| HTTP connection succeeded                  | transport reached endpoint                                 |
| HTTP `2xx` returned                        | operation succeeded/was accepted according to API contract |
| IDoc received                              | integration document persisted                             |
| IDoc status `53`                           | inbound application processing reported success            |
| Business document number returned          | application object identity exists                         |
| Posting document and final state confirmed | decisive business boundary completed                       |

An integration monitor should expose both technical status and business result.

---

## 21. RAP Portfolio and Standard SD Boundary

### 21.1 Aggregate ownership

```text
Custom SalesOrderRequest BO
  ├── Items
  ├── Schedules
  └── OrderPartners

Standard S/4HANA Sales Order
  ── independent aggregate

Standard Outbound Delivery
  ── independent aggregate

Material Document, Billing Document, FI documents
  ── separate postings/aggregates
```

Do not place Delivery, Billing, and Payment beneath the custom request as RAP
composition children. They have separate identities, authorization, posting,
retention, and reversal lifecycles.

### 21.2 Honest integration state model

```text
Draft
  → Submitted
  → HandoffPending
  → HandoffSucceeded
  → ExternalOrderCreated
  → FulfillmentInProgress
  → Fulfilled / Failed / Reversed
```

The exact states should be based on events the custom application can prove.
If the portfolio does not call a real released PGI operation, label the action
as simulated fulfillment or handoff—not `PostGoodsIssue`.

### 21.3 Adapter boundary

```text
RAP action SubmitToS4
  → outbound port/interface
  → adapter maps custom request to released API contract
  → adapter records correlation and external identity
  → callback/event/polling updates integration projection
```

The domain logic should depend on a narrow port such as “submit order request”
rather than on generated OData field names, BAPI structures, or IDoc segments.

### 21.4 Transaction boundary

The local RAP save and remote S/4HANA transaction cannot usually be one atomic
database transaction.

```text
Local commit succeeds
  + remote call fails
  → recoverable integration state and retry required

Remote creation succeeds
  + response is lost
  → idempotent lookup/correlation required before retry
```

Use an outbox/event or controlled orchestration approach when reliability
matters. Never solve distributed failure by holding a database lock around a
long remote call.

---

## 22. Clean-Core and Security Rules

### 22.1 Prohibited write shortcuts

Do not directly update:

```text
LIKP / LIPS
VBFA
MATDOC
VBRK / VBRP
PRCD_ELEMENTS
BKPF / BSEG / ACDOCA
EDIDC / EDID4 / EDIDS
```

These objects participate in application invariants, postings, status,
document flow, output, change tracking, and integration.

### 22.2 Released contract selection

Before selecting an API or CDS entity, verify:

- API State/release status in the target system;
- supported operation and business scenario;
- communication scenario and authorization requirements;
- edition and minimum release;
- ETag, CSRF, batch/change-set, and error semantics;
- update versus read-only capability;
- rate, payload, and extensibility limitations.

### 22.3 Authorization layers

```text
Business authorization
  operation allowed for user and organizational context

Communication authorization
  technical client may call service/partner profile

Data authorization
  caller may read the requested business data

State/feature control
  operation permitted for current document state
```

A technically authenticated API client can still be correctly rejected by
business authorization or document state.

### 22.4 Sensitive operational data

Integration traces can contain customer data, addresses, prices, bank
references, tokens, and internal identifiers. Store sanitized payloads where
possible, restrict monitor access, and avoid copying secrets or full personal
data into application logs.

---

## 23. Technical Insights and Common Misinterpretations

### 23.1 Delivery is execution, but not posting

An Outbound Delivery is more than a plan because it owns warehouse/shipping
execution. Its existence still does not prove PGI.

### 23.2 Picking and packing are operational states

They prepare goods for dispatch. Neither reduces Inventory Management stock by
itself.

### 23.3 Movement type is instruction, not evidence

`LIPS-BWART = 601` can explain expected posting behavior. Only the executed
material document proves the goods issue.

### 23.4 Billing and payment belong to different components

Billing creates the customer invoice and normally the receivable. Incoming
payment and clearing belong to FI and can have partial, residual, or on-account
states.

### 23.5 Cancellation and reversal preserve audit history

Corrective documents offset earlier effects. They do not erase the original
transaction.

### 23.6 IDoc success is not transport success alone

Inbound receipt, application posting, and resulting business-document identity
are distinct checkpoints. An outbound sender status also cannot prove how the
receiver completed its business process.

### 23.7 API success needs correlation

Record the external document key and reread the resulting state. This protects
against lost responses, duplicate retries, and false assumptions about posting.

### 23.8 Document flow is not composition

Sales Order, Delivery, Material Document, Billing Document, and Payment are
independent objects linked by reference and process flow. Deleting a root must
not cascade across those legal and accounting records.

### 23.9 Status is navigation, posting document is proof

Status accelerates selection and diagnosis. Posting documents and their
reversal chain provide stronger event evidence.

---

## 24. Compact Technical Map

```text
FULFILLMENT

Sales Order item/schedule line
  delivery relevance + confirmed open quantity + due date + no block
       │
       ▼
Delivery creation
  VTLA copy control + split/combination rules
       │
       ▼
LIKP delivery header / LIPS delivery item
  pick → pack → warehouse execution
       │
       ▼
PGI operation
  actual GI date + goods-movement status
  MATDOC material-document line
  inventory and relevant accounting effect


BILLING AND FINANCE

Delivery or Sales Order billable item
  VTFL or VTFA copy control + billing relevance + no block
       │
       ▼
VBRK billing header / VBRP billing item
  PRCD_ELEMENTS pricing result
       │
       ▼
VKOA revenue account determination
  FI journal entry / customer receivable
       │
       ▼
Incoming payment
  full / partial / residual / on-account clearing state


PROCESS LINEAGE

VBFA predecessor/successor graph
  direct source references + statuses + reversal documents


INTEGRATION

BAPI       synchronous classic business operation
IDoc       persisted asynchronous business message
OData/API  released HTTP operation with ETag/CSRF where required
Event      asynchronous notification followed by state retrieval

Every path records
  correlation key → business document → final state → reversal/retry evidence
```

The map should be read boundary by boundary. At each transition, distinguish
configuration that permits an operation, transaction state that prepares it,
the application operation that executes it, and the document that proves its
business effect.
