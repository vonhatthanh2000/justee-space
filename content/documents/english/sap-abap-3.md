---
title: ABAP Open SQL
part: ABAP
summary: ABAP Open SQL
category: Technical
tags:
  - sap
  - abap
publishedAt: 2026-06-24
---

## 1. Architecture & Execution Model

**Open SQL** is an embedded subset of ANSI SQL fully integrated into the ABAP programming language. It acts as an abstraction layer between application programs and the underlying database management system (DBMS).

```
+-------------------------------------------------------+
|                 ABAP Application Layer                |
|             (Open SQL Statements / SE38)              |
+-------------------------------------------------------+
                           |
                           v  (ABAP Syntax Check & Compilation)
+-------------------------------------------------------+
|                 ABAP Database Interface               |
|      (Translates Open SQL into Native SQL DML)        |
+-------------------------------------------------------+
                           |
                           v  (Database-Specific SQL Execution)
+-------------------------------------------------------+
|               Underlying RDBMS Layer                  |
|          (Oracle, MS SQL Server, SAP HANA)            |
+-------------------------------------------------------+
```

### 1.1 Key Architectural Properties

- **Database Independence**: Open SQL statements are uniform across all supported database platforms. The **Database Interface** automatically converts Open SQL statements into the platform-specific **Native SQL** required by the underlying RDBMS (e.g., Oracle, MS SQL Server).
- **Integrated Syntax Validation**: Because Open SQL is a native component of the ABAP language, the ABAP compiler validates SQL syntax directly during program compilation.
- **Open SQL vs. Native SQL**:
  - **Open SQL**: Portable, database-agnostic, statically syntax-checked by the ABAP IDE, and automatically managed by the database interface.
  - **Native SQL**: Executes database-specific DML/DDL scripts directly. It bypasses the Database Interface, sacrificing portability and static compile-time syntax checks.
- **Legacy Table Declarations**: The obsolete `TABLES <table>` statement implicitly creates a structure/work area sharing the table's name. Modern ABAP standards explicitly discourage this statement in favor of explicit type definitions.

---

## 2. Fundamental Query Syntax & Row Selection

A standard Open SQL data retrieval statement consists of four core clauses: `SELECT`, `FROM`, `INTO`, and `WHERE`.

```abap
SELECT <fields>
  FROM <table>
  INTO <target>
  WHERE <conditions>.
```

### 2.1 Filtering & Evaluation (`WHERE`)

- **Conditional Operators**: Supports standard comparison operators (`=`, `<`, `>`, `<=`, `>=`, `<>`), string pattern matching (`CP`, `CF`), range operators (`BETWEEN`, `IN`), and logical connectors (`AND`, `OR`, `NOT`).
- **Selection Tables**: The `IN` operator evaluates field values against selection tables or range tables.

### 2.2 Row-Limiting Techniques

- **`SELECT SINGLE`**:
  - Fetches a single record matching the query criteria.
  - **Best Practice**: Pass the complete primary key in the `WHERE` clause to guarantee deterministic behavior.
  - Does not open a database loop and does not require an `ENDSELECT` statement.
- **`UP TO n ROWS`**:
  - Limits the result set to `n` rows.
  - **Best Practice**: Recommended over `SELECT SINGLE` when filtering on partial key fields.
  - Requires an `ENDSELECT` statement when selecting row-by-row into a work area.

### 2.3 Result Ordering & Deduplication

- **`ORDER BY`**: Guarantees output row ordering. Can sort by `PRIMARY KEY` or by specific columns using `ASCENDING` or `DESCENDING` modifiers.
- **`DISTINCT`**: Eliminates duplicate result rows prior to populating the target data object.

### 2.4 System Fields

- **`sy-subrc`**: Returns `0` if the query successfully retrieves data, and `4` if no matching records are found.
- **`sy-dbcnt`**: Contains the total count of records retrieved or processed by the query.

---

## 3. Aggregation & Grouping

Open SQL provides built-in aggregation functions to perform calculations directly on the database engine prior to returning results.

| Aggregation Function            | Description                                               |
| :------------------------------ | :-------------------------------------------------------- |
| `COUNT( * )` / `COUNT( field )` | Returns the total count of rows or non-null field values. |
| `MAX( field )`                  | Identifies the maximum value in a column.                 |
| `MIN( field )`                  | Identifies the minimum value in a column.                 |
| `SUM( field )`                  | Calculates the total sum of a numeric column.             |
| `AVG( field )`                  | Computes the average value of a numeric column.           |

### 3.1 Grouping Requirement (`GROUP BY`)

When an Open SQL statement includes both scalar columns and aggregate functions in the `SELECT` clause, **all non-aggregated columns must be explicitly listed in the `GROUP BY` clause**.

```abap
SELECT carrid, MAX( flytime ), MIN( flytime )
  FROM spfli
  INTO (lv_carrid, lv_max_time, lv_min_time)
  GROUP BY carrid.
```

---

## 4. Target Data Objects & Mapping Strategies

Data retrieved via Open SQL can be mapped into single-row **Work Areas** or multi-row **Internal Tables**.

```
 positional mapping (INTO TABLE):
 Database Columns:    [ MANDT ]  [ CARRID ]  [ CONNID ]  [ COUNTRYFR ]
                         |           |           |            |
 Target Structure:    [ MANDT ]  [ CARRID ]  [ CONNID ]  [ COUNTRYFR ]

 name-based mapping (INTO CORRESPONDING FIELDS OF TABLE):
 Database Columns:    [ CARRID ]  [ CONNID ]  [ COUNTRYFR ]
                          |           |            |
                          +-----------+------------+ (Matches by Name)
                                      |
 Target Structure:    [ STATUS ]  [ CARRID ]  [ CONNID ]  [ COUNTRYFR ]
```

### 4.1 Target Object Comparison

| Feature           | Work Area (`STRUCTURE`)                            | Internal Table (`INTERNAL TABLE`)               |
| :---------------- | :------------------------------------------------- | :---------------------------------------------- |
| **Capacity**      | Holds a single row of data at a time.              | Holds multi-row datasets in application memory. |
| **Access Syntax** | Direct field component selection (`<wa>-<field>`). | Iterated using `LOOP AT <itab> INTO <wa>`.      |
| **Target Clause** | `INTO <work_area>`.                                | `INTO TABLE <internal_table>`.                  |

### 4.2 Positional Mapping vs. Name-Based Mapping

- **`INTO TABLE <itab>`**: Transfers column data sequentially based on field positions. If the target structure layout differs from the `SELECT` clause field order, data misalignment or truncation occurs.
- **`INTO CORRESPONDING FIELDS OF TABLE <itab>`**: Matches database table columns to internal table fields strictly by **field name**, ignoring structural field sequence. Unmapped target fields remain set to their initial values.

---

## 5. Multi-Table Operations & Advanced Filtering

### 5.1 Relational Joins (`JOIN`)

Joins combine records across multiple database tables within a single database request. Fields are qualified using tilde syntax (`<table>~<field>` or `<alias>~<field>`).

- **`INNER JOIN`**: Returns combined records only when join conditions match in both left and right tables.
- **`LEFT OUTER JOIN`**: Returns all rows from the left table. If no matching row exists in the right table, right-table fields are populated with type-specific initial values.

```abap
SELECT header~vbeln, header~kunnr, item~posnr, item~matnr
  FROM vbak AS header
  INNER JOIN vbap AS item
    ON header~vbeln = item~vbeln
  INTO TABLE @DATA(lt_orders).
```

### 5.2 Internal Table Filtering (`FOR ALL ENTRIES IN`)

The `FOR ALL ENTRIES IN` clause evaluates an Open SQL query against all entries in a pre-populated driver internal table.

- **Behavior**: Replaces large, complex database joins by using in-memory driver tables as filter criteria.
- **Syntax**:

```abap
SELECT doc_type, company_code, doc_num
  FROM bkpf
  INTO TABLE lt_headers
  FOR ALL ENTRIES IN lt_filter_tab
  WHERE doc_type = lt_filter_tab-doc_type.
```

---
