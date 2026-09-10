---
title: ABAP Internal Table
part: ABAP
summary: ABAP Internal Table
category: Technical
tags:
  - sap
  - abap
publishedAt: 2026-06-28
---

## 1. Mental Model: Type, Structure, Work Area, and Internal Table

Do not treat these as four equivalent objects.

```text
TYPES declaration
  defines a type; it does not hold runtime values
          │
          ├── DATA structure       one structured data object
          │      └── may serve as a work area
          │
          └── DATA internal table  zero or more lines of one line type
```

### 1.1 Structured type

A structured type defines named components and their types. `TYPES` creates a
type, not a runtime data object.

```abap
TYPES: BEGIN OF ty_flight,
         carrier_id   TYPE c LENGTH 3,
         connection_id TYPE n LENGTH 4,
         city_from    TYPE c LENGTH 40,
         city_to      TYPE c LENGTH 40,
         price        TYPE p LENGTH 8 DECIMALS 2,
         currency     TYPE c LENGTH 3,
       END OF ty_flight.
```

The type can be local, defined globally in a class/interface, or supplied by a
released Dictionary/CDS artifact. `SE11` is a classic Dictionary maintenance
tool, not the definition of the ABAP concept itself.

### 1.2 Structure data object

`DATA` instantiates a data object and therefore allocates runtime state.

```abap
DATA flight TYPE ty_flight.
```

The word **structure** can mean either a structured type or a structured data
object, depending on context. Say which one you mean in technical explanations.

### 1.3 Work area

A **work area** is a role played by a single data object when a table statement
copies one line into it or reads a line from it. It is not a separate ABAP type
category.

```abap
DATA flight TYPE ty_flight.

LOOP AT flights INTO flight.
  " flight is the work area for this loop
ENDLOOP.
```

### 1.4 Internal table

An internal table is an in-memory ABAP data object containing zero or more
lines. Its type is defined by:

1. line type;
2. table category;
3. primary table key;
4. optional secondary table keys.

It is not a database table and is not persisted by `COMMIT WORK`. Its lifetime
follows the lifetime and scope of its owning ABAP data object.

```abap
TYPES ty_flights TYPE STANDARD TABLE OF ty_flight WITH EMPTY KEY.
DATA flights TYPE ty_flights.
```

### 1.5 Database boundary

```text
Database table / CDS entity
        │  SELECT
        ▼
Internal table in ABAP application-server memory
        │  processing
        ▼
INSERT / UPDATE / MODIFY / DELETE or EML, when explicitly executed
```

Changing an internal-table line does not automatically update a database table
or a RAP business object.

---

## 2. Complete, Reusable Example Types

The examples below use explicit keys so their behavior is visible.

```abap
TYPES: BEGIN OF ty_flight,
         carrier_id    TYPE c LENGTH 3,
         connection_id TYPE n LENGTH 4,
         city_from     TYPE c LENGTH 40,
         city_to       TYPE c LENGTH 40,
         price         TYPE p LENGTH 8 DECIMALS 2,
         currency      TYPE c LENGTH 3,
       END OF ty_flight.

TYPES ty_flights_seq TYPE STANDARD TABLE OF ty_flight
                     WITH EMPTY KEY.

TYPES ty_flights_sorted TYPE SORTED TABLE OF ty_flight
                        WITH UNIQUE KEY primary_key
                        COMPONENTS carrier_id connection_id.

TYPES ty_flights_hashed TYPE HASHED TABLE OF ty_flight
                        WITH UNIQUE KEY primary_key
                        COMPONENTS carrier_id connection_id.

DATA flights_seq    TYPE ty_flights_seq.
DATA flights_sorted TYPE ty_flights_sorted.
DATA flights_hashed TYPE ty_flights_hashed.
```

`WITH EMPTY KEY` is a deliberate statement: the standard table is being used
as a sequence, not as a keyed collection.

---

## 3. Table Categories

Big-O values below are useful mental models, not promises about every kernel,
row width, cache state, or access form.

| Category         | Primary organization                       | Primary-key uniqueness | Efficient access                                            | Typical use                                          |
| ---------------- | ------------------------------------------ | ---------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `STANDARD TABLE` | Primary index in insertion order           | Non-unique or empty    | Index access; sequential processing                         | Append-heavy lists, ordered processing, small tables |
| `SORTED TABLE`   | Primary index always sorted by primary key | Unique or non-unique   | Left-aligned primary-key access, approximately `O(log n)`   | Range reads and frequent ordered key access          |
| `HASHED TABLE`   | Hash administration; no primary index      | Must be unique         | Complete primary-key equality, approximately `O(1)` average | Fast exact lookup by a unique key                    |

### 3.1 Standard table

- Fast append and index access.
- A normal key search is linear unless an appropriate secondary key or a valid
  binary-search pattern is used.
- The primary key does not enforce uniqueness.
- Prefer `WITH EMPTY KEY` when the table is intentionally only a sequence.

### 3.2 Sorted table

- Lines are always maintained in ascending primary-key order.
- The primary key may be unique or non-unique.
- Optimized access requires the search components to form a usable left-aligned
  part of the sorted key.
- It supports index access because it is an index table.

For a key `(carrier_id, connection_id)`, searching by `carrier_id` can use the
sorted prefix; searching only by `connection_id` cannot use that primary-key
prefix efficiently.

### 3.3 Hashed table

- The primary key must be unique.
- Best for equality lookup using the complete hash key.
- No primary index access such as `INDEX 1`.
- Partial-key and range searches do not receive the main hash advantage.

### 3.4 Selection rule

```text
Need stable index/insertion order or mostly append/loop?
  → STANDARD

Need sorted traversal, ranges, or prefix-key lookup?
  → SORTED

Need exact lookup by one complete unique key?
  → HASHED

Need several access paths?
  → Add justified secondary keys; do not copy the table automatically
```

---

## 4. Primary and Secondary Table Keys

A table key is not merely documentation. It determines uniqueness, access
optimization, ordering for sorted keys, and maintenance cost.

### 4.1 Secondary-key example

```abap
TYPES ty_flights_multi TYPE STANDARD TABLE OF ty_flight
  WITH EMPTY KEY
  WITH UNIQUE HASHED KEY by_connection
       COMPONENTS carrier_id connection_id
  WITH NON-UNIQUE SORTED KEY by_route
       COMPONENTS city_from city_to.
```

```abap
READ TABLE flights_multi
  WITH TABLE KEY by_connection
  COMPONENTS carrier_id    = 'LH'
             connection_id = '0400'
  INTO DATA(flight).

LOOP AT flights_multi
  INTO DATA(route_flight)
  USING KEY by_route
  WHERE city_from = 'FRANKFURT'.
  " Uses the named sorted access path when the condition fits the key
ENDLOOP.
```

### 4.2 Secondary-key trade-off

Secondary keys can make reads much faster, but they require extra memory and
must be maintained when table content changes. Add one only for a demonstrated
access pattern, not “for performance” in the abstract.

---

## 5. Assignment and Name-Based Mapping

The original claim that normal assignment can silently “misalign” fields is too
broad. ABAP checks assignment compatibility and applies the defined assignment
rules. It does not simply scramble fields because their names differ.

Use direct assignment when source and target types are compatible:

```abap
target = source.
```

Use `CORRESPONDING` when the desired contract is name-based component mapping:

```abap
DATA(target) = CORRESPONDING ty_target(
  source
  MAPPING target_id = source_id ).
```

Use the statement form when updating an existing target:

```abap
MOVE-CORRESPONDING source TO target.
```

Unmatched target components keep or receive values according to the exact
statement/operator variant. Check `BASE`, `MAPPING`, `EXCEPT`, and deep-mapping
semantics when preservation matters.

---

## 6. Constructing and Adding Lines

### 6.1 Constructor expressions

```abap
flights_seq = VALUE #(
  ( carrier_id = 'LH' connection_id = '0400'
    city_from = 'FRANKFURT' city_to = 'NEW YORK'
    price = '800.00' currency = 'EUR' )
  ( carrier_id = 'SQ' connection_id = '0012'
    city_from = 'SINGAPORE' city_to = 'TOKYO'
    price = '650.00' currency = 'SGD' ) ).
```

### 6.2 `APPEND`

`APPEND` adds at the end of an index table. It is natural for a standard table.

```abap
APPEND VALUE #(
  carrier_id = 'VN'
  connection_id = '0030'
  city_from = 'HO CHI MINH CITY'
  city_to = 'TOKYO' ) TO flights_seq.
```

Although `APPEND` is possible for sorted index tables, the new line must fit
after the existing last line and obey key uniqueness. Otherwise the operation
fails at runtime. Prefer semantic insertion for sorted tables.

### 6.3 `INSERT ... INTO TABLE`

This key-based form works with all table categories and lets the table choose
the physical position.

```abap
INSERT VALUE #(
  carrier_id = 'LH'
  connection_id = '0400' )
  INTO TABLE flights_sorted.

IF sy-subrc = 4.
  " Duplicate unique key; no line inserted
ENDIF.
```

For a standard table, use `INSERT ... INDEX index` only when position has
business meaning.

---

## 7. Reading One Line Safely

### 7.1 `READ TABLE ... INTO`: copy the row

```abap
READ TABLE flights_sorted
  WITH TABLE KEY primary_key
  COMPONENTS carrier_id    = 'LH'
             connection_id = '0400'
  INTO DATA(flight).

IF sy-subrc = 0.
  " flight is a copy
ENDIF.
```

Modifying `flight` does not modify the table until it is written back.

### 7.2 `READ TABLE ... ASSIGNING`: alias the row

```abap
READ TABLE flights_sorted
  WITH TABLE KEY primary_key
  COMPONENTS carrier_id    = 'LH'
             connection_id = '0400'
  ASSIGNING FIELD-SYMBOL(<flight>).

IF sy-subrc = 0.
  <flight>-price = '825.00'. " Changes the table line directly
ENDIF.
```

A field symbol is an alias to an assigned data object, not a separately copied
row. It must be assigned before dereferencing.

### 7.3 `REFERENCE INTO`: retain a data reference

```abap
READ TABLE flights_sorted
  WITH TABLE KEY primary_key
  COMPONENTS carrier_id    = 'LH'
             connection_id = '0400'
  REFERENCE INTO DATA(flight_ref).

IF sy-subrc = 0.
  flight_ref->price = '825.00'.
ENDIF.
```

### 7.4 Table expressions

```abap
TRY.
    DATA(lh_price) = flights_sorted[
      carrier_id    = 'LH'
      connection_id = '0400' ]-price.
  CATCH cx_sy_itab_line_not_found.
    " Handle the missing row
ENDTRY.
```

A failed table expression normally raises
`CX_SY_ITAB_LINE_NOT_FOUND`; it does not simply set `sy-subrc` like
`READ TABLE`.

For existence only:

```abap
IF line_exists( flights_sorted[
     carrier_id    = 'LH'
     connection_id = '0400' ] ).
  " Do not perform a second lookup unless the row content is also needed
ENDIF.
```

Use one `READ TABLE`, assignment, or reference when the next step needs the
line; `line_exists` followed by a second read repeats the lookup.

### 7.5 System fields

For common `READ TABLE` forms, `sy-subrc = 0` means a line was found and
`sy-subrc = 4` commonly means no matching line was found. For index tables,
`sy-tabix` can identify the affected or current primary/secondary index, but its
meaning depends on the statement and key used. Hashed primary-key access has no
primary table index.

Table expressions do not generally set `sy-subrc` and do not generally update
`sy-tabix`; use their expression/exception semantics instead. Never rely on a
system field without tying it to the immediately preceding statement.

---

## 8. Iteration: Copy, Alias, or Reference

| Form                      | Row handling                                | Use when                                   |
| ------------------------- | ------------------------------------------- | ------------------------------------------ |
| `LOOP ... INTO`           | Copies each row                             | Readability or independent copy is desired |
| `LOOP ... ASSIGNING`      | Assigns a field symbol to the current row   | Direct mutation or avoiding row copies     |
| `LOOP ... REFERENCE INTO` | Returns a data reference to the current row | A reference must be passed or retained     |

```abap
LOOP AT flights_seq INTO DATA(flight_copy)
  WHERE city_from = 'FRANKFURT'.
  " Changes to flight_copy do not automatically change flights_seq
ENDLOOP.

LOOP AT flights_seq ASSIGNING FIELD-SYMBOL(<flight_row>)
  WHERE city_from = 'FRANKFURT'.
  <flight_row>-price += 25. " Direct table-line modification
ENDLOOP.
```

`ASSIGNING` can avoid copying wide or deep rows, but do not claim it is always
faster in a meaningful way. Choose it first for semantics—direct mutation—and
measure performance where it matters.

The primary-key components of sorted and hashed tables are protected from
changes that would invalidate their administration. Delete and reinsert a line
when its primary identity must change.

---

## 9. Modifying Lines

### 9.1 Modify by table key

```abap
DATA changed_flight TYPE ty_flight.
changed_flight-carrier_id = 'LH'.
changed_flight-connection_id = '0400'.
changed_flight-price = '850.00'.

MODIFY TABLE flights_sorted FROM changed_flight.
IF sy-subrc <> 0.
  " No row matched the primary key
ENDIF.
```

### 9.2 Modify selected components

```abap
MODIFY flights_seq FROM VALUE #(
    price = '700.00'
    currency = 'EUR' )
  TRANSPORTING price currency
  WHERE carrier_id = 'LH'.
```

### 9.3 Modify by field symbol

```abap
LOOP AT flights_seq ASSIGNING FIELD-SYMBOL(<flight>)
  WHERE carrier_id = 'LH'.
  <flight>-price *= '0.95'.
ENDLOOP.
```

No `MODIFY` is needed in the last example because `<flight>` aliases the table
line. By contrast, a changed work-area copy from `LOOP ... INTO` must be written
back explicitly, normally with a clear key or index.

---

## 10. Deleting and Clearing

```abap
DELETE flights_seq INDEX 1.

DELETE flights_sorted
  USING KEY primary_key
  WHERE carrier_id = 'LH'.

DELETE TABLE flights_hashed
  WITH TABLE KEY primary_key
  COMPONENTS carrier_id    = 'LH'
             connection_id = '0400'.
```

### 10.1 Remove duplicates

`DELETE ADJACENT DUPLICATES` removes only neighboring duplicates according to
the comparison. For a standard table, sort into the required adjacency first.

```abap
SORT flights_seq BY city_from city_to.
DELETE ADJACENT DUPLICATES FROM flights_seq
  COMPARING city_from city_to.
```

The sort fields and comparison fields must express the same intended identity.

### 10.2 `CLEAR` versus `FREE`

```abap
CLEAR flights_seq. " Remove rows; retain initial allocation for reuse
FREE flights_seq.  " Remove rows and release the initial table allocation
```

Use `CLEAR` when the table will probably be filled again soon. Use `FREE` when
releasing a large table's allocation is useful. The ABAP runtime still owns the
details of dynamic memory management; do not assume an operating-system memory
change at that exact statement.

---

## 11. Sorting and Binary Search

```abap
SORT flights_seq BY carrier_id connection_id.

READ TABLE flights_seq
  WITH KEY carrier_id    = 'LH'
           connection_id = '0400'
  BINARY SEARCH
  INTO DATA(flight).
```

For `BINARY SEARCH` to be correct, the standard table must already be sorted in
ascending order with a compatible leading field sequence. If later code
changes the order, the search contract silently becomes fragile.

Prefer a sorted table or named sorted secondary key when repeated optimized key
access is part of the data model. Use one-off `SORT` plus `BINARY SEARCH` only
when the local lifecycle makes the ordering invariant obvious.

---

## 12. Aggregation with `COLLECT`

`COLLECT` finds a line using the internal table's **primary key**. If found, it
adds the source's numeric non-key components to the existing line. If not
found, it inserts the line.

```abap
TYPES: BEGIN OF ty_route_total,
         city_from TYPE c LENGTH 40,
         city_to   TYPE c LENGTH 40,
         revenue   TYPE decfloat34,
       END OF ty_route_total.

TYPES ty_route_totals TYPE HASHED TABLE OF ty_route_total
  WITH UNIQUE KEY primary_key COMPONENTS city_from city_to.

DATA route_totals TYPE ty_route_totals.

LOOP AT flights_seq INTO DATA(flight).
  COLLECT VALUE ty_route_total(
    city_from = flight-city_from
    city_to   = flight-city_to
    revenue   = flight-price )
    INTO route_totals.
ENDLOOP.
```

All components outside the primary key must be numeric for this aggregation
form. An explicit sorted or hashed key makes the aggregation identity and lookup
behavior clearer than relying on a standard table's implicit standard key.

Do not confuse ABAP `COLLECT` with database aggregation. When a large dataset
can be aggregated correctly by the database, prefer `SELECT ... GROUP BY` so
fewer rows cross into application-server memory.

---

## 13. Modern Group Processing

Prefer `LOOP AT ... GROUP BY` over legacy control-break processing when writing
new code. Grouping is explicit and does not depend on physical component order
or temporary masking of work-area fields.

```abap
LOOP AT flights_seq INTO DATA(flight)
  GROUP BY ( carrier_id = flight-carrier_id
             members    = GROUP SIZE )
  ASSIGNING FIELD-SYMBOL(<carrier_group>).

  DATA(total_price) = REDUCE decfloat34(
    INIT total = CONV decfloat34( 0 )
    FOR member IN GROUP <carrier_group>
    NEXT total += member-price ).

  " <carrier_group>-carrier_id, <carrier_group>-members, total_price
ENDLOOP.
```

Grouping happens in two phases: ABAP assigns rows to group keys, then iterates
over the groups. Member iteration uses `LOOP AT GROUP` or `FOR ... IN GROUP`.

### 13.1 Modern table transformations

Constructor and iteration expressions can make pure transformations concise:

```abap
DATA(lh_flights) = VALUE ty_flights_seq(
  FOR flight IN flights_seq
  WHERE ( carrier_id = 'LH' )
  ( flight ) ).
```

Use expression syntax when it makes the transformation clearer. A conventional
loop is still appropriate when error handling, tracing, or several side effects
would make one expression difficult to understand.

---

## 14. Legacy Constructs You Must Recognize

### 14.1 Header lines

```abap
" Obsolete — recognize it; do not introduce it
DATA old_flights TYPE STANDARD TABLE OF ty_flight WITH HEADER LINE.
```

This declaration creates both:

```text
old_flights    implicit single-line header area
old_flights[]  internal table body
```

That name collision makes statements ambiguous:

```abap
CLEAR old_flights.   " Historically addresses the header line
CLEAR old_flights[]. " Addresses the table body
```

Header-line declarations are obsolete and are not allowed in classes. Modern
code uses an explicit table plus an explicit work area, inline declaration, or
field symbol.

### 14.2 `AT NEW`, `AT END OF`, and `SUM`

Legacy control-break events include:

- `AT FIRST`
- `AT NEW component`
- `AT END OF component`
- `AT LAST`

They depend on the processing order and on the component order of the row
structure. During classic control-break blocks, character-like components to
the right of the break component can be represented by asterisks and other
components can receive initial values temporarily. This behavior is one reason
the code is difficult to maintain.

When reading old code:

1. inspect the row-type component order;
2. inspect the table's actual processing order;
3. identify the exact break component;
4. check which values are valid inside the event block;
5. inspect any `SUM` behavior carefully.

For new code, prefer explicit `GROUP BY` and `REDUCE`.

---

## 15. Database and RAP Boundaries

### 15.1 Avoid `SELECT` inside a loop

```abap
" Avoid repeated database round trips
LOOP AT requests INTO DATA(request).
  SELECT SINGLE ... WHERE request_uuid = @request-request_uuid ...
ENDLOOP.
```

Prefer set-oriented retrieval using a join, association, subquery, range, or a
carefully guarded `FOR ALL ENTRIES`, depending on the problem and release.

When using `FOR ALL ENTRIES`:

- guard against an initial driver table;
- select only necessary columns;
- understand duplicate elimination and key semantics;
- measure against a join or other set-oriented alternative.

### 15.2 Internal table versus RAP transactional buffer

RAP method parameters and EML results are represented using generated internal
table types, but the RAP transactional buffer is a framework-managed business
object state. It is not identical to one local variable such as `DATA(items)`.

```text
Local internal table variable
  → ordinary ABAP runtime data

RAP transactional buffer
  → framework-managed pending BO changes, addressed through EML
```

Changing a local EML result table does not change the business object. Use
`MODIFY ENTITIES` when the BO state must change.

---

## 16. Performance Rules That Survive Interviews

1. **Choose the table category from access patterns.** Do not choose hashed only
   because the dataset is “large.”
2. **Use the key explicitly.** Optimized lookup depends on the key and search
   components actually used.
3. **Keep processing set-oriented.** Avoid repeated database access inside
   internal-table loops.
4. **Avoid unnecessary row copies.** Use `ASSIGNING` or `REFERENCE INTO` when
   direct access is the intended semantic, especially for wide/deep rows.
5. **Do not over-index.** Secondary keys consume memory and add mutation cost.
6. **Do not sort repeatedly.** If sorted access is a stable requirement, model
   it with a sorted table or secondary key.
7. **Push suitable filtering and aggregation to the database.** Internal tables
   are not a replacement for SQL execution on large persisted datasets.
8. **Measure material paths.** Runtime depends on row count, width, mutation
   frequency, selectivity, and release—not only theoretical complexity.

---

## 17. Common Failure Modes

| Symptom                             | Likely cause                                                | Correction                                       |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| Lookup is still slow                | Search does not use a suitable primary/secondary key        | Name the key and align the search components     |
| `BINARY SEARCH` misses a row        | Standard table is not sorted compatibly                     | Sort correctly or model a sorted key             |
| Duplicate insert fails              | Unique sorted/hashed key already exists                     | Handle `sy-subrc` or choose non-unique semantics |
| Table expression dumps              | Row is absent and exception/default was not handled         | Use `TRY`, `OPTIONAL`, or `READ TABLE`           |
| Work-area change is lost            | `LOOP ... INTO` created a copy                              | Write it back or use `ASSIGNING` intentionally   |
| Sorted/hashed key cannot be changed | Direct mutation would invalidate primary-key administration | Delete and reinsert with the new identity        |
| Duplicate deletion misses rows      | Equal comparison values are not adjacent                    | Sort by the comparison identity first            |
| `COLLECT` groups unexpectedly       | Primary table key does not match aggregation identity       | Define an explicit unique key                    |
| RAP BO did not change               | Only a local result internal table was modified             | Use EML `MODIFY ENTITIES`                        |

---

## 18. Compact Decision and Syntax Sheet

```text
Declare a sequence
  STANDARD TABLE ... WITH EMPTY KEY

Repeated ordered/range access
  SORTED TABLE ... WITH [NON-]UNIQUE KEY ...

Exact unique lookup
  HASHED TABLE ... WITH UNIQUE KEY ...

Read a copy
  READ TABLE ... INTO ...

Read and mutate the row
  READ TABLE ... ASSIGNING ...

Read with a durable reference
  READ TABLE ... REFERENCE INTO ...

Expression lookup
  itab[ key = value ]

Existence only
  line_exists( itab[ key = value ] )

Insert by table semantics
  INSERT line INTO TABLE itab

Aggregate by explicit primary key
  COLLECT line INTO itab

Group modern ABAP data
  LOOP AT itab ... GROUP BY ...
```

### Useful whole-table operations

```abap
" Value-copy one compatible table
target_flights = source_flights.

" Append all source lines
APPEND LINES OF source_flights TO target_flights.

" Current number of lines
DATA(line_count) = lines( target_flights ).

" Older statement form still encountered
DESCRIBE TABLE target_flights LINES DATA(described_count).
```
