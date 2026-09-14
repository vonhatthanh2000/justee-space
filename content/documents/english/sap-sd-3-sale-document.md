---
title: SAP SD Document Control and Pricing
part: ABAP
summary: This document explains how SAP Sales and Distribution controls a Sales Order at header, item, and schedule-line level and how the condition technique builds the document-specific pricing result. It connects business grain to determination inputs, Customizing, runtime persistence, diagnostic evidence, RAP concepts, and clean-core boundaries.
category: Technical
tags:
  - sap
  - sd
publishedAt: 2026-08-15
---

# SAP SD Sales Document Control and Pricing — Technical Reference

This document explains how SAP Sales and Distribution controls a Sales Order
at header, item, and schedule-line level and how the condition technique builds
the document-specific pricing result. It connects business grain to
determination inputs, Customizing, runtime persistence, diagnostic evidence,
RAP concepts, and clean-core boundaries.

The central technical principle is:

> First identify the grain and the selected control object. Then distinguish
> how that object was determined from what its definition makes it do.

This reference distinguishes three environments:

- **SAP S/4HANA on-premise or private edition**, where SAP GUI transactions,
  IMG activities, Pricing Analysis, and authorized table inspection are common
  diagnostic tools.
- **SAP S/4HANA Cloud Public Edition**, where Fiori applications and
  configuration activities provide the supported paths and may add features
  such as flexible item-category determination.
- **Clean-core extension development**, where released CDS entities, business
  objects, and APIs are contracts; classic tables and Customizing views are
  diagnostic landmarks rather than integration interfaces.

Primary SAP sources:

- [SAP Help — How Sales Documents Are Controlled](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/7b24a64d9d0941bda1afa753263d9e39/c264b65334e6b54ce10000000a174cb4.html)
- [SAP Learning — Configuring a Sales Document Type](https://learning.sap.com/courses/fundamental-customizing-in-sap-s-4hana-sales/configuring-a-sales-document-type)
- [SAP Learning — Configuring an Item Category](https://learning.sap.com/courses/fundamental-customizing-in-sap-s-4hana-sales/configuring-an-item-category-1)
- [SAP Help — Determining Sales Document Item Categories](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/7b24a64d9d0941bda1afa753263d9e39/dc89c95360267214e10000000a174cb4.html)
- [SAP Learning — Assigning Schedule Line Categories](https://learning.sap.com/courses/fundamental-customizing-in-sap-s-4hana-sales/assigning-schedule-line-categories)
- [SAP Learning — Introducing the Condition Technique](https://learning.sap.com/courses/configuring-pricing-in-sap-s-4hana-sales/introducing-the-condition-technique_dce0f313-dee6-470e-8851-3f1773cb5d45)
- [SAP Help — Pricing Information and Analysis](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/4dd8cb7b1c484b4b93af84d00f60fdb8/918dc95360267214e10000000a174cb4.html)
- [SAP Help — Sales Order Item Pricing Element](https://help.sap.com/docs/SAP_S4HANA_CLOUD/03c04db2a7434731b7fe21dca77440da/abf59161a5734e0393d30c5fa2f41053.html)

---

## 1. Sales Document Runtime Architecture

### 1.1 The control chain

```text
Header
  Sales document type
       │ supplies whole-transaction context
       ▼
Item
  Item category
       │ supplies product/service-line behavior
       ▼
Schedule line
  Schedule-line category
       │ supplies dated-quantity fulfillment behavior
       ▼
Subsequent processing
  delivery, requirements, procurement, goods movement, billing
```

The three controls cooperate, but they answer different questions:

| Level         | Business scope                | Main control object    | Stored result |
| ------------- | ----------------------------- | ---------------------- | ------------- |
| Header        | One commercial transaction    | Sales document type    | `VBAK-AUART`  |
| Item          | One product/service line      | Item category          | `VBAP-PSTYV`  |
| Schedule line | One quantity/date subdivision | Schedule-line category | `VBEP-ETTYP`  |

In common business speech, “line” often means Sales Order item or line item.
Technically, always clarify the grain because a Sales Order item can itself
contain several schedule lines and pricing-element rows.

### 1.2 Definition, assignment, and transaction result

These are three different objects:

```text
Category definition
  Describes what a category does

Determination assignment
  Maps runtime inputs to a proposed category

Selected transaction result
  Stores the category actually used in this document
```

Example:

```text
VOV7 / TVAP  → defines item category TAN
VOV4 / T184  → proposes TAN for OR + NORM + blank + blank
VBAP-PSTYV   → stores the item category selected for Item 10
```

A maintenance transaction changes reusable configuration. A selected
transaction result records which value one business document contains. They
must not be described as the same thing.

### 1.3 The primary diagnostic split

```text
Unexpected category in the document
  → reconstruct the determination input and assignment

Expected category, unexpected processing behavior
  → inspect the selected category's definition and dependent configuration
```

This split prevents unnecessary custom-code investigation. Standard
determination must first be explained with runtime evidence.

---

## 2. Header, Item, and Schedule-Line Grain

### 2.1 Placement rule

Place a value at the broadest level where it remains true without losing
business meaning:

```text
Entire commercial transaction  → Header
One product or service         → Item
One quantity on one date       → Schedule line
```

| Level         | Representative fields                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Header        | document type, Sales Area, sold-to party, customer reference, document currency, overall value/status |
| Item          | material, ordered quantity, sales unit, Plant, item category, rejection reason, net value             |
| Schedule line | requested date/quantity, confirmed date/quantity, schedule category, delivery block                   |

Screen position does not prove technical grain. A field shown in a page header
can be an aggregate, and a visually repeated value can be stored separately at
item level.

### 2.2 Classic persistence and keys

| Level         | Table landmark | Key excluding client    | One row represents                 |
| ------------- | -------------- | ----------------------- | ---------------------------------- |
| Header        | `VBAK`         | `VBELN`                 | One sales-document header          |
| Item          | `VBAP`         | `VBELN + POSNR`         | One item in the document           |
| Schedule line | `VBEP`         | `VBELN + POSNR + ETENR` | One dated-quantity row in the item |

```text
VBAK-VBELN
    =
VBAP-VBELN

VBAP-VBELN + VBAP-POSNR
    =
VBEP-VBELN + VBEP-POSNR
```

`ETENR` identifies the schedule line. It is not the requested date or quantity.

### 2.3 Downward propagation and upward aggregation

Selected header values can be copied or propagated into item fields, and an
item may hold a permitted exception. This is not dynamic inheritance.

```text
Header default ──copy/propagate──> aligned item value
                                     │
                                     └── item-specific override, if allowed
```

Results also roll upward:

```text
Schedule confirmations → item fulfillment state
Item values             → header total
Item statuses           → overall document status
```

Overall status is a summary, not proof that every child is in the same state.

### 2.4 Wrong-grain joins

If one item has two schedule lines, joining `VBAP` to `VBEP` produces two rows
for that item. Its item net value is repeated.

```text
Item 10 net value: 1,000

Schedule 0001 → joined item value 1,000
Schedule 0002 → joined item value 1,000

Naive SUM      → 2,000   incorrect
```

Aggregate a measure at its native grain before joining it to a lower grain.
The same rule applies when joining pricing-element rows to items.

---

## 3. Sales Document Type

### 3.1 Responsibility

The Sales Document Type describes the overall commercial transaction, such as
an inquiry, quotation, standard order, return, or credit memo request.

It can control or propose:

- the broad sales-document category;
- number-range and general document behavior;
- delivery and billing blocks;
- requested-delivery-date and other defaults;
- messages or checks for reference and master data;
- proposed follow-on delivery or billing document types;
- the document pricing procedure used later in pricing-procedure determination.

It does not fully determine the behavior of every item. The item category and
schedule-line category provide lower-grain controls.

### 3.2 Technical map

```text
Maintenance:          VOV8
Configuration table: TVAK
Transaction result:  VBAK-AUART
```

`AUART` identifies the Sales Document Type. Standard code `OR` commonly means a
standard Sales Order. The code is configuration, not an ABAP keyword, and a
customer can copy a standard type into a `Z...` type with different behavior.

SAP recommends creating a custom document type by copying a similar tested
type because many dependent assignments reference it. A copied code must still
be reviewed; copying does not prove that every inherited setting fits the new
business process.

---

## 4. Item Category

### 4.1 Responsibility

An Item Category controls how one product or service line participates in the
sales process. It can influence:

- whether pricing is relevant;
- whether and how the item is billed;
- whether business data may differ from the header;
- whether the line represents a material, service, value, or text item;
- the incompletion procedure;
- whether schedule lines are allowed;
- behavior of main items and subitems;
- delivery relevance for items without schedule lines.

The determination inputs select an Item Category. The Item Category definition
then controls the line. Selection and behavior are distinct stages.

### 4.2 Standard determination formula

```text
Sales document type
  + material item-category group
  + item usage
  + higher-level item category
  = proposed item category
```

| Input                        | Meaning                                                 | Common technical clue                                      |
| ---------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Sales document type          | Whole-document transaction context                      | `VBAK-AUART`                                               |
| Material item-category group | General sales-processing classification of the material | `MVKE-MTPOS`, scoped by Sales Org/Channel                  |
| Item usage                   | Special purpose in the current document                 | Often blank for an ordinary stock item                     |
| Higher-level item category   | Processing context from a parent item                   | Relevant to free goods, BOM components, and other subitems |

### 4.3 `OR + NORM + blank + blank → TAN`

The common standard illustration means:

| Code                        | Meaning in the example                                   |
| --------------------------- | -------------------------------------------------------- |
| `OR`                        | Standard Sales Order document type                       |
| `NORM`                      | Normal-item item-category group from material sales data |
| blank usage                 | No specialized item usage applies                        |
| blank higher-level category | Standalone item, not a subitem                           |
| `TAN`                       | Standard order item category proposed by the assignment  |

```text
OR       supplies order context
NORM     supplies material processing classification
blank    says no special usage
blank    says no parent-item context
TAN      is the configured default result
```

This is an example, not a universal invariant. The assignment can differ by
system configuration. In supported Public Cloud scenarios, flexible item-
category determination can additionally use configured business rules when
the feature and prerequisites apply.

### 4.4 Main item and subitem example

```text
Item 10  Material M1   100 EA   normal priced item
Item 20  Material M1    10 EA   free-of-charge subitem
          Higher-level item = 10
```

The higher-level Item Category lets the determination distinguish a subitem
from an unrelated standalone item even when both use the same material.

### 4.5 Technical map

```text
Determine/assign:      VOV4
Assignment table:      T184
Define behavior:       VOV7
Definition table:      TVAP
Selected result:       VBAP-PSTYV
Master-data input:     MVKE-MTPOS
```

The customer number is not one of the four standard item-category
determination keys. Customer context can influence other data and newer
flexible rule scenarios, but it should not be inserted into the classic formula.

---

## 5. Schedule-Line Category

### 5.1 Responsibility

A Schedule-Line Category controls how one dated quantity participates in
fulfillment. It can influence:

- delivery relevance;
- transfer of requirements;
- availability checking;
- the movement type used by a later goods movement;
- automatic procurement or purchase-requisition behavior;
- schedule-line delivery blocks.

The Item Category must permit schedule lines before schedule-line control can
participate.

### 5.2 Two-step determination

```text
Attempt 1: Item category + MRP type
Attempt 2: Item category + blank MRP type   fallback
────────────────────────────────────────────────────
Result:    proposed schedule-line category
```

The MRP type is Plant-specific material data, commonly `MARC-DISMM`.
Therefore, the runtime Plant from the affected item is part of the diagnostic
context even though Plant is not displayed as a direct key in `VOV5`.

### 5.3 Technical map

```text
Determine/assign:      VOV5
Assignment table:      TVEPZ
Define behavior:       VOV6
Definition table:      TVEP
Selected result:       VBEP-ETTYP
Master-data input:     MARC-DISMM
```

The assignment can also specify alternative Schedule-Line Categories that the
user is allowed to select instead of the proposal.

### 5.4 Delivery relevance nuance

For an ordinary item with schedule lines, schedule-line configuration is
central to delivery relevance of the dated quantity. The Item Category's
delivery-relevance indicator is particularly used for delivery-relevant items
without schedule lines, such as certain text items.

Therefore neither of these absolute claims is safe:

```text
“Only the item category controls delivery relevance.”
“Only the schedule-line category controls delivery relevance.”
```

The correct answer begins with whether the item has schedule lines and then
identifies the relevant control.

### 5.5 Movement type is a future posting rule

```text
Schedule category contains movement-type control
                 ≠
Inventory has already changed
```

Saving the Sales Order records demand and processing instructions. Inventory
changes only when the logistics process executes an applicable goods movement,
normally at Post Goods Issue for an outbound sell-from-stock scenario.

---

## 6. Complete Sales-Document Control Map

| Purpose                          | Maintenance | Configuration landmark | Runtime result           |
| -------------------------------- | ----------- | ---------------------- | ------------------------ |
| Define Sales Document Type       | `VOV8`      | `TVAK`                 | `VBAK-AUART`             |
| Determine Item Category          | `VOV4`      | `T184`                 | proposes `VBAP-PSTYV`    |
| Define Item Category             | `VOV7`      | `TVAP`                 | behavior of `VBAP-PSTYV` |
| Determine Schedule-Line Category | `VOV5`      | `TVEPZ`                | proposes `VBEP-ETTYP`    |
| Define Schedule-Line Category    | `VOV6`      | `TVEP`                 | behavior of `VBEP-ETTYP` |

Compact memory map:

```text
VOV8 defines the header transaction

VOV4 finds the Item Category
VOV7 defines the Item Category

VOV5 finds the Schedule-Line Category
VOV6 defines the Schedule-Line Category
```

All `VOV...` transactions are related to SD configuration, but they do not all
configure the same object. The prefix alone is not a diagnostic explanation.
Always name the IMG activity and the affected runtime result.

---

## 7. Pricing Architecture

### 7.1 Why pricing is not one material price

The transaction price can depend on:

- customer or customer group;
- product or product hierarchy;
- Sales Area;
- ordered quantity and scale;
- pricing date and validity interval;
- currency and unit of measure;
- negotiated discounts;
- freight, surcharge, promotion, and tax;
- exclusion, requirement, formula, or manual entry;
- document and billing repricing rules.

SAP therefore uses the condition technique: reusable configuration and
condition master data produce document-specific pricing-element rows.

### 7.2 Two separate pricing pipelines

```text
PIPELINE A — SELECT THE PRICING PROCEDURE

Sales Organization
  + Distribution Channel
  + Division
  + Document Pricing Procedure
  + Customer Pricing Procedure
  = Pricing Procedure


PIPELINE B — EXECUTE THE PRICING PROCEDURE

Pricing Procedure
  → Step / counter
  → Condition Type
  → Access Sequence
  → Condition Table key
  → Valid Condition Record
  → Rate / base / unit / scale / formula
  → Document Pricing Element
```

Pipeline A answers **which calculation framework applies**. Pipeline B answers
**how that framework calculated the item**.

---

## 8. Pricing-Procedure Determination

### 8.1 Inputs

```text
Sales Area
  = Sales Organization + Distribution Channel + Division

Document Pricing Procedure
  ← Sales Document Type
  ← classic clue TVAK-KALVG

Customer Pricing Procedure
  ← sold-to party Sales Area data
  ← classic clue KNVV-KALKS

Selected Pricing Procedure
  ← determination configured in OVKK
  ← common document clue VBAK-KALSM
```

The input is not simply “customer plus material.” Customer/material keys are
commonly used later by a condition-table access; they do not replace pricing-
procedure determination.

### 8.2 Technical map

| Object                    | Landmark                              | Purpose                                                            |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Procedure determination   | `OVKK` / `T683V`                      | Map Sales Area and two procedure indicators to a pricing procedure |
| Document procedure source | `VOV8` / `TVAK-KALVG`                 | Supply indicator from Sales Document Type                          |
| Customer procedure source | BP/customer sales data / `KNVV-KALKS` | Supply indicator for sold-to in the Sales Area                     |
| Selected result           | `VBAK-KALSM`                          | Record the procedure used by the document                          |

If the wrong pricing procedure was selected, tracing its condition records is
premature. First reconstruct all five inputs and prove the `OVKK` result.

---

## 9. Condition-Technique Components

### 9.1 Responsibility map

| Component         | Responsibility                                                               | Not the same as                      |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------ |
| Pricing Procedure | Orders condition types and step-level calculation controls                   | A customer's maintained price        |
| Condition Type    | Represents one concept such as price, discount, freight, surcharge, or tax   | The actual rate                      |
| Access Sequence   | Searches condition tables in priority order for one automatic Condition Type | The procedure's condition-type order |
| Condition Table   | Defines the fields forming one search key                                    | A record containing a rate           |
| Condition Record  | Stores rate, validity, currency/unit, and scales for one key value           | The calculated document result       |
| Pricing Element   | Stores how the condition participated in one document                        | Reusable master data                 |

The most important distinction is:

```text
Pricing Procedure sequence
  = calculation order across Condition Types

Access Sequence
  = record-search order inside one Condition Type
```

### 9.2 Specific-to-general access

```text
Access 10  Sales Org + Customer + Material
             ↓ no applicable record
Access 20  Customer Price Group + Material
             ↓ no applicable record
Access 30  Sales Org + Material
             ↓ record found
Result      use the applicable general material record
```

The order preserves commercial priority. A negotiated customer/material record
normally deserves priority over a general material fallback. An unsuccessful
specific access can be expected behavior rather than an error.

### 9.3 Condition table versus condition record

```text
Condition table definition
  Key fields: Sales Org + Customer + Material

Condition record instance
  1000 + C100 + M200
  90 EUR per 1 EA
  Valid 01 Jan–31 Dec
```

Generated `Axxx` tables commonly index condition records using the configured
key and point to condition-record identity such as `KNUMH`. The number and key
layout are configuration-dependent.

A record can exist but not apply because:

- the access was never executed;
- runtime key values differ;
- the pricing date is outside validity;
- an earlier access already satisfied the search;
- the condition was excluded or made inactive;
- unit, currency, scale, or other control does not match the expectation.

---

## 10. Pricing-Procedure Row Controls

### 10.1 Step and counter

The step controls sequence. The counter distinguishes multiple entries at the
same step.

```text
Step 10 / Counter 0 → base price
Step 20 / Counter 0 → discount
Step 30 / Counter 0 → subtotal
Step 40 / Counter 0 → freight
Step 50 / Counter 0 → tax
```

The actual procedure can contain more complex bases, subtotals, statistical
rows, exclusions, and formulas.

### 10.2 Important controls

| Control                         | Technical meaning                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Requirement                     | Routine decides whether the row is processed in the current context                               |
| Manual                          | Condition is intended for manual input rather than ordinary automatic access                      |
| Mandatory                       | The condition is expected; absence can affect completeness or messages according to configuration |
| Statistical                     | Condition is calculated and retained without normal contribution to net value                     |
| From/To                         | References earlier steps as a calculation or subtotal range                                       |
| Subtotal                        | Stores an intermediate result for subsequent use                                                  |
| Alternative base formula        | Replaces the ordinary condition base                                                              |
| Alternative calculation formula | Replaces ordinary condition-value calculation                                                     |

Statistical does not mean useless. A statistical condition can support cost,
credit, analytics, or another downstream purpose.

### 10.3 Inactive is not draft

An inactive pricing condition is a result row that does not currently
contribute to the effective calculation. It can have been found and then
deactivated through exclusion or competing-condition logic.

```text
Material discount: 5%    found, inactive
Customer discount: 10%   found, active
Rule: retain only the better discount
```

This is unrelated to a RAP draft, which is a persisted editing state for a
business-object instance.

---

## 11. Rate, Base, Unit, Scale, and Value

### 11.1 Core arithmetic concepts

```text
Condition rate  = maintained amount or percentage
Condition base  = amount or quantity affected by the rate
Condition value = calculated contribution in this document
```

Percentage example:

```text
Rate:   10%
Base:   1,000 EUR
Value:  -100 EUR
```

Pricing-unit example:

```text
Rate:           100 EUR
Pricing unit:    10
Condition unit:  EA

Meaning: 100 EUR per 10 EA
20 EA → 200 EUR
```

The numerical rate is incomplete without its currency, unit, pricing unit, and
scale context.

### 11.2 Pricing-result fields

| Field   | Meaning                                     | Diagnostic use                            |
| ------- | ------------------------------------------- | ----------------------------------------- |
| `KSCHL` | Condition Type                              | Identify the pricing concept              |
| `KBETR` | Condition rate                              | Compare with the master record/scale      |
| `KAWRT` | Condition base value                        | Verify quantity, amount, or base formula  |
| `KWERT` | Condition value                             | Verify calculated document contribution   |
| `KPEIN` | Pricing unit                                | Interpret rate per 1, 10, 100, and so on  |
| `KMEIN` | Condition unit                              | Interpret unit to which the rate applies  |
| `KNUMH` | Condition-record reference where applicable | Trace selected master record              |
| `KSTAT` | Statistical indicator                       | Explain net-value participation           |
| `KINAK` | Inactive context                            | Explain why a found row is ineffective    |
| `KHERK` | Condition origin                            | Help identify how the row entered pricing |

Diagnostic split:

```text
Wrong KBETR        → record, scale, conversion, or manual rate
Wrong KAWRT        → quantity, amount, or alternative-base logic
Wrong KPEIN/KMEIN  → pricing-unit or UoM interpretation
Inputs correct but KWERT wrong
                   → formula, sign, conversion, or rounding
```

---

## 12. Pricing Configuration and Master-Data Landmarks

### 12.1 Classic maintenance transactions

| Transaction            | Responsibility                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `OVKK`                 | Determine the Sales pricing procedure                                                    |
| `V/08`                 | Define procedure steps, counters, Condition Types, requirements, subtotals, and formulas |
| `V/06`                 | Define Condition Type behavior and assign its Access Sequence                            |
| `V/07`                 | Define ordered accesses and Condition Tables in an Access Sequence                       |
| `V/03`, `V/04`, `V/05` | Create, change, and display classic Condition Table definitions                          |
| `VK11`, `VK12`, `VK13` | Create, change, and display condition records                                            |

`VK13` displays condition master data. It is not the Sales Order Pricing
Analysis technical view.

```text
Pricing Analysis technical view
  → what fields and values the runtime searched

VK13
  → what condition record was maintained
```

Diagnosis compares them.

### 12.2 Configuration tables

| Object                          | Classic landmark  | Meaning                                  |
| ------------------------------- | ----------------- | ---------------------------------------- |
| Pricing-procedure determination | `T683V`           | Input combination selects procedure      |
| Pricing-procedure steps         | `T683S`           | Step/counter and row controls            |
| Condition Type                  | `T685`            | Condition-Type definition                |
| Access Sequence                 | `T682I` / `T682Z` | Accesses and access fields               |
| Condition Table                 | generated `Axxx`  | Business-key index for condition records |

```text
T683V   selects procedure
T683S   orders and controls calculation steps
T685    defines the Condition Type
T682I/Z defines the record-search strategy
Axxx    indexes condition records by configured business key
```

These objects must not be updated directly. Use authorized Customizing or
master-data applications and transport configuration through the landscape.

---

## 13. Document Pricing-Result Persistence

### 13.1 S/4HANA result model

```text
VBAK-KNUMV
    =
PRCD_ELEMENTS-KNUMV
```

One document pricing result contains items, procedure steps, and potentially
several entries at one step. A useful classic technical grain is:

```text
KNUMV + KPOSN + STUNR + ZAEHK
```

| Field   | Identifies                                                                   |
| ------- | ---------------------------------------------------------------------------- |
| `KNUMV` | Pricing result for a business document                                       |
| `KPOSN` | Item within that pricing result; header context can use a header-level value |
| `STUNR` | Procedure step                                                               |
| `ZAEHK` | Entry/counter within the step                                                |

`PRCD_ELEMENTS` stores the document result, not the reusable condition master
record. Joining it to `VBAP` creates multiple rows per Sales Order item.

### 13.2 `KONV` versus `PRCD_ELEMENTS`

```text
SAP ERP
  KONV → traditional persisted document pricing result

SAP S/4HANA
  PRCD_ELEMENTS → persisted pricing result
  KONV          → compatibility/application structure role, not old persistence
```

It is inaccurate to say that `KONV` can never appear in S/4HANA code. The
precise statement is that `PRCD_ELEMENTS` replaced it in the database
persistence role. Neither object should become a new clean-core integration
contract.

### 13.3 Result-grain aggregation risk

```text
Sales Order Item 10: net value 1,000
  Pricing row PR00:  1,200
  Pricing row K004:   -100
  Pricing row K007:   -100

Join result repeats Item.NetValue three times.
SUM(Item.NetValue) = 3,000   incorrect
```

Use pricing-element values for pricing analysis and item values for item-level
reporting. Aggregate each measure at its own grain before combining them.

---

## 14. Pricing Analysis Failure Classes

Pricing Analysis should classify the failure before the consultant searches
tables or enhancements.

| Runtime state                       | Meaning                                       | Primary investigation                                        |
| ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Condition Type skipped              | Procedure control prevented processing        | Requirement, manual-only setting, context, procedure row     |
| Access executed, no record found    | No applicable record matched                  | Runtime key, pricing date, validity, condition master        |
| Record found but condition inactive | Condition was considered but made ineffective | Exclusion, competition, manual replacement, limits           |
| Active condition, wrong value       | Selection succeeded but calculation differs   | Rate, base, scale, unit, formula, sign, conversion, rounding |

```text
Skipped     → procedure control
Not found   → access key and record
Inactive    → exclusion or competition
Wrong value → calculation inputs
```

“The record exists in `VK13`” does not prove that it applied. Pricing Analysis
must show that the expected Condition Type and access were executed with the
expected runtime key and date.

---

## 15. End-to-End Pricing Diagnostic Algorithm

### 15.1 Capture the exact grain

In `VA03` or the corresponding Fiori application, capture:

- Sales Order `VBELN` and item `POSNR`;
- expected and actual net value;
- expected and actual Condition Type/rate;
- Sales Area, sold-to party, material, quantity, unit, currency, and pricing date.

Do not begin from a screenshot containing only the final total.

### 15.2 Confirm item eligibility

Inspect:

- selected Item Category `VBAP-PSTYV`;
- whether the Item Category is pricing relevant;
- rejection, incompletion, status, or special item behavior;
- manual changes or reference-document copying.

### 15.3 Prove pricing-procedure selection

```text
Sales Area
  + TVAK-KALVG
  + KNVV-KALKS
  → OVKK / T683V
  → expected Pricing Procedure
  → compare with VBAK-KALSM
```

If the procedure is wrong, stop and diagnose its inputs or determination.

### 15.4 Verify procedure and Condition Type

In `V/08`, prove that the expected Condition Type exists at the expected
step/counter and inspect requirement, manual, mandatory, statistical, subtotal,
and formula controls. In `V/06`, prove its assigned Access Sequence and
Condition-Type behavior.

### 15.5 Trace the Access Sequence

Use Pricing Analysis to inspect each access in order:

```text
Condition Type processing status
  ├── no  → procedure/requirement/manual control
  └── yes
       ↓
Expected-access execution status
  ├── no  → access requirement or earlier exclusive success
  └── yes
       ↓
Condition-record search result
  ├── no  → compare runtime key/date with condition record
  └── yes
       ↓
Condition activity status
  ├── no  → exclusion/competition/inactive reason
  └── yes → validate calculation
```

### 15.6 Compare runtime key with condition master

From Pricing Analysis technical data, record the actual search values. Compare
them with `VK13` or the supported condition-record application:

- Condition Type;
- full Condition Table key;
- valid-from and valid-to dates;
- rate and currency;
- pricing unit and Condition Unit;
- quantity/value scale and selected tier.

### 15.7 Validate the calculation

Inspect `KBETR`, `KAWRT`, `KWERT`, `KPEIN`, `KMEIN`, formulas, sign,
conversion, and rounding. A correct record selection does not prove correct
arithmetic.

### 15.8 Widen only after standard logic is explained

Then investigate:

- manual conditions;
- condition exclusion;
- reference-document copy and repricing type;
- user exits, BAdIs, formulas, or custom routines;
- external pricing integration;
- API payload behavior;
- release-specific features.

The evidence chain should explain exactly where observed behavior diverges:

```text
grain → eligibility → procedure → step → access → record → calculation → result
```

---

## 16. Item- and Schedule-Category Diagnostic Algorithms

### 16.1 Wrong Item Category

```text
1. Capture VBAK-AUART and VBAP-PSTYV
2. Read MVKE-MTPOS for the exact Sales Org/Channel
3. Capture item usage
4. Capture higher-level Item Category when it is a subitem
5. Reconstruct the exact VOV4 / T184 combination
6. Compare proposed, allowed alternatives, and actual result
7. If result is expected, inspect behavior in VOV7 / TVAP
8. Only then inspect enhancements or flexible determination
```

### 16.2 Correct schedule category but no requirements transfer

```text
1. Identify VBELN + POSNR + ETENR
2. Capture VBAP-PSTYV and VBEP-ETTYP
3. Read MARC-DISMM for the exact Material and Plant
4. Verify exact Item Category/MRP Type assignment in VOV5
5. Verify blank-MRP fallback if exact assignment is absent
6. Inspect selected category in VOV6
7. Check requirements-transfer and availability controls
8. Check status, blocks, dates, and dependent configuration
9. Widen to custom code only after standard evidence is complete
```

### 16.3 Configuration result versus execution evidence

| Configuration says                   | It proves                                       | It does not prove                     |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------- |
| Item is pricing relevant             | Pricing may run for the item                    | Correct Condition Record was selected |
| Schedule line transfers requirements | Demand transfer is configured                   | ATP confirmed the requested quantity  |
| Movement type is assigned            | Later goods movement has a posting rule         | PGI occurred                          |
| Item is billing relevant             | Subsequent billing is permitted by that control | Billing document exists               |

---

## 17. Sales Order Pricing Versus Billing Pricing

A Billing Document can copy or redetermine pricing according to copy-control
pricing type and process design.

Potential differences include:

- different pricing date;
- updated Condition Records or validity;
- actual billed quantity and scale;
- exchange-rate or currency handling;
- tax redetermination;
- copied or redetermined manual conditions;
- selected pricing type in copy control.

```text
Sales Order pricing result
           ≠ guaranteed identity
Billing Document pricing result
```

Before classifying a difference as a defect, capture the document flow,
reference relationship, pricing dates, source/target pricing elements, billed
quantity, and copy-control pricing type.

---

## 18. RAP Translation and Portfolio Boundary

### 18.1 SD determination versus RAP determination

| Concept                   | Purpose                                                | Mechanism                                            |
| ------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| SD category determination | Select configured category from business inputs        | Customizing assignment such as `VOV4` or `VOV5`      |
| SD pricing determination  | Select and execute pricing configuration and records   | Condition technique                                  |
| RAP determination         | Automatically derive BO fields after declared triggers | Behavior definition and behavior-pool implementation |
| RAP validation            | Reject inconsistent BO state                           | Behavior definition and behavior pool                |

```text
SD:  OR + NORM + blank + blank → TAN
RAP: RequestedQuantity changes → recalculate NetAmount
```

The shared word “determination” does not make these mechanisms equivalent.

### 18.2 `deriveAmounts` is not the SD condition technique

A simple RAP portfolio calculation can be:

```text
RequestedQuantity × UnitPrice → Item.NetAmount
Σ Item.NetAmount              → Request.TotalAmount
```

Standard SD pricing is:

```text
Procedure determination
  → Condition Types
  → Access Sequences
  → Condition Records
  → rates, bases, units, scales, formulas
  → discounts, freight, tax, exclusion
  → document pricing result
```

The RAP calculation is credible for an SD-inspired order request, but it must
not be presented as a reimplementation of standard SAP Sales pricing.

### 18.3 Safe portfolio evolution

The custom BO can expose an explicit pricing status:

```text
Estimated
  → custom request-level calculation

Priced by S/4HANA
  → result returned by a released Sales Order/pricing contract
```

Keep the integration behind an adapter so the custom domain model does not
depend directly on `PRCD_ELEMENTS`, `KONV`, or generated `Axxx` tables.

---

## 19. Clean-Core Access and Extension Rules

### 19.1 Persistence is not a write interface

Never repair a pricing or category symptom by directly updating:

- `VBAK`, `VBAP`, or `VBEP`;
- `PRCD_ELEMENTS` or condition master tables;
- `TVAK`, `TVAP`, `TVEP`, `T184`, or other Customizing tables.

Such writes bypass business logic, dependent updates, authorization,
consistency, transport governance, and compatibility contracts.

### 19.2 Preferred contracts

Use, as available and released in the target system:

- Sales Order business objects and APIs for transactional operations;
- released CDS views for supported read and analytical use cases;
- Sales Order item-pricing-element API nodes for pricing-result consumption;
- supported pricing configuration and condition-record applications;
- released enhancement points for additional fields or rules.

Release status and supported capability must be checked in the target system.
An entity can exist without being released for Cloud development or without
supporting transactional writes.

### 19.3 Cloud configuration distinction

Public Cloud commonly exposes configuration activities through SAP Central
Business Configuration or the supported configuration environment rather than
classic transactions. Flexible Item Category Determination can supplement
standard assignment in supported scenarios by evaluating configured business
rules.

This does not invalidate the classic four-input model. It means the diagnostic
record must include edition, release, activated feature, and business-rule
result before concluding that `T184` alone explains the selected category.

---

## 20. Technical Insights and Common Misinterpretations

### 20.1 Category code does not explain behavior by itself

`TAN` is a selected classification. Its effective behavior comes from the
definition and dependent settings in the target system. Never diagnose only
from the label “standard item.”

### 20.2 Material classification does not fully determine the item

`NORM` supplies one input. Document type, usage, and higher-level category
allow the same material to participate differently across commercial contexts.

### 20.3 A valid Condition Record is not necessarily applicable

Applicability requires that the correct procedure and Condition Type execute
the expected access with matching runtime keys and pricing date, and that the
result remains active.

### 20.4 A selected price is not a material-master property

Pricing elements belong to the document result. They can depend on customer,
date, quantity, currency, commercial agreements, and calculation controls that
do not belong to the material alone.

### 20.5 Selection, calculation, and posting are separate boundaries

```text
Category selected       → classification result
Price calculated        → document commercial result
Delivery created        → execution document exists
PGI posted              → inventory movement occurred
Billing posted          → invoice/accounting boundary occurred
```

Evidence from one boundary must not be used to claim that a later boundary has
completed.

### 20.6 Configuration before customization

The strongest diagnostic order is:

```text
Capture actual grain
  → prove stored result
  → reconstruct inputs
  → prove assignment
  → inspect definition
  → inspect dependent master/configuration
  → investigate custom code
```

This is not an assumption that custom code is harmless. It is an evidence
strategy that first explains standard runtime behavior and gives custom-code
analysis precise input/output expectations.

---

## 21. Compact Technical Map

```text
SALES DOCUMENT CONTROL

Header
  VOV8 / TVAK
  → Sales Document Type
  → VBAK-AUART
         │
         ▼
Item Category determination
  VBAK-AUART
  + MVKE-MTPOS
  + item usage
  + higher-level Item Category
  → VOV4 / T184
  → VBAP-PSTYV
  → behavior in VOV7 / TVAP
         │
         ▼
Schedule-Line Category determination
  VBAP-PSTYV
  + MARC-DISMM for Material/Plant
  → VOV5 / TVEPZ, then blank-MRP fallback
  → VBEP-ETTYP
  → behavior in VOV6 / TVEP


PRICING CONTROL

Sales Area
  + TVAK-KALVG
  + KNVV-KALKS
  → OVKK / T683V
  → VBAK-KALSM Pricing Procedure
         │
         ▼
V/08 / T683S procedure step
  → V/06 / T685 Condition Type
  → V/07 / T682I/Z Access Sequence
  → generated Axxx Condition Table key
  → matching valid Condition Record
  → rate + base + unit + scale + formula
  → PRCD_ELEMENTS document result
```

Read both maps in the same order: capture the stored result, reconstruct the
inputs that selected it, inspect the reusable definition that controls its
behavior, and only then widen the investigation.
