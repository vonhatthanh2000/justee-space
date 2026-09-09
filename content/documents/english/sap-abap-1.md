---
title: ABAP BASIC Statements
part: ABAP
summary: ABAP Basic Statements
category: Technical
tags:
  - sap
  - abap
publishedAt: 2026-06-07
---


## ABAP Basic Statements

### 1. Basic Syntax Rules & Comments

- **Statement Termination**: Every ABAP statement must end with a **period (****.****)**. A statement can span across multiple lines until a period is encountered.
- **Case Insensitivity**: ABAP code is case-insensitive; keywords, additions, and operands can be written in uppercase or lowercase.
- **Comments**:
    - An **asterisk (*********)** at the very first position of a line comments out the entire line.
    - A **double quote (****"****)** comments out everything from that position to the end of the line.
- **Chained Statements**: Multiple statements repeating the same keyword can be chained using a **colon (****:****)** and separated by **commas (****,****)** (e.g., `WRITE: var1, var2.`).

---

### 2. Data Objects & Type Declarations

- **Data Objects**: ABAP distinguishes between **Variables** (`DATA`), **Constants** (`CONSTANTS`), and **Literals** (text in `'...'`, string in `` `...` ``, or numbers).
- **Variable Declaration**: Declared using `DATA <variable_name> TYPE <data_type>` with an optional `VALUE` addition. To copy the type of an existing data object, use `LIKE`.
- **Local vs. Global Types**:
    - **Local Data Types** (`TYPES`): Defined locally within a program. If a local type shares the same name as a global type, the local definition takes **precedence**.
    - **Global Data Types**: Created and managed system-wide via the **ABAP Dictionary** (transaction code `SE11`).
- **Predefined Data Types**:
    - **Complete Data Types** (fixed length): `D` (Date - 8 characters `YYYYMMDD`), `T` (Time - 6 characters `HHMMSS`), `I` (Integer - 4 bytes, range -2^31 to +2^31), `STRING` (dynamic character string).
    - **Incomplete Data Types** (length required): `C` (Character), `N` (Numeric text), and `P` (Packed number - used for calculations/currencies with `DECIMALS` specification).
- **Internal Tables**: Declared using `DATA <table_name> TYPE TABLE OF <line_type>` to hold lists of structured data.

---

### 3. Control Structures & Loops

- **Conditional Branching (IF)**: Implemented using `IF ... ELSEIF ... ELSE ... ENDIF`.
- **Multi-way Branching (CASE)**: Implemented using `CASE <var> WHEN <val> ... WHEN OTHERS ... ENDCASE`. Each `WHEN` branch operates independently and exits automatically without requiring a `BREAK` statement.
- **Logical Operators & Initial Check**: Conditions can be combined using `AND`, `OR`, `NOT`, and parenthetical grouping `()`. Use `IS INITIAL` to check if a variable holds its initial/uninitialized default value.
- **Loops (DO / WHILE)**: Unconditional/conditional looping via `DO ... ENDDO` or `WHILE ... ENDWHILE`, exited using the `EXIT` statement.
- **Internal Table Loop (LOOP AT)**: Iterates through internal tables via `LOOP AT <itab> INTO <work_area> [WHERE <condition>] ... ENDLOOP`. Supports pattern matching such as `CP` (Contains Pattern with wildcard `*`) or `CF`.

---

### 4. Output & Screen Formatting

- **Output Command (WRITE)**: In classical report programs, `WRITE <data>` outputs data to the list screen. Advanced formatting uses `WRITE /<pos>(<length>) <data>` to specify newlines (`/`), starting position, and display length.
- **Spacing & Dividers**: `SKIP <n>` skips blank lines, and `ULINE` draws horizontal divider lines.
- **Multilingual Labels (Text Symbols)**: Avoid hardcoding text strings; use **Text Symbols** (`TEXT-xxx` or `text-001`) so labels can be translated into multiple system languages.

---

### 5. Message Handling

- **Displaying Messages**: Triggered using `MESSAGE <text/code> TYPE <type>`. Message types include `S` (Success), `I` (Information), `W` (Warning), `E` (Error), `A` (Abort), and `X` (Exit / Exception).
- **Message Class (SE91)**: Manages centralized messages and supports passing up to 4 dynamic parameters (`WITH var1 var2 var3 var4`) into placeholders (`&1` through `&4`).

---

### 6. Selection Screens & User Inputs

- **Single Parameters (PARAMETERS)**: Generates single input fields (parameter names are limited to 8 characters). Additions include `OBLIGATORY` (mandatory field) and `DEFAULT <value>`.
- **Range Selection (SELECT-OPTIONS)**: Creates a range input control (`FROM` ... `TO`) using `SELECT-OPTIONS <name> FOR <field>`.
- **Screen Blocks**: Encloses parameters in visual frames using `SELECTION-SCREEN BEGIN OF BLOCK <id> WITH FRAME TITLE <title> ... END OF BLOCK`.

---

### 7. Program Events in Report Programs

- **INITIALIZATION**: Executes first when opening a report program, used for initializing defaults.
- **AT SELECTION-SCREEN**: Triggers when user interacts with or submits the selection screen, ideal for input validation.
- **START-OF-SELECTION**: Kicks off upon pressing Execute (**F8**), containing core business processing and data queries.

---

### 8. Operations, Date/Time Arithmetic & System Variables

- **Arithmetic Operations**: Uses standard operators (`+`, `-`, `*`, `/`), integer division (`DIV`), modulo (`MOD`), and square root (`SQRT`).
- **Date (D) & Time (T) Calculations**: Automatically calculates date/time rollovers (e.g., adding 1 day to `20231231` yields `20240101`). Substring offset access uses `<var>+<offset>(<length>)`.
- **Key System Variables (sy-)**:
    - `sy-subrc`: Return code of the previous statement (`0` = success, non-zero e.g., `4` = failure).
    - `sy-tabix`: Current line index inside an internal table loop (`LOOP AT`).
    - `sy-datum`: Current system date.
    - `sy-uzeit`: Current system time.
    - `sy-uname`: Logged-in user name.
    - `sy-langu`: Logged-in language.
    - `sy-tcode`: Current transaction code.
    - `sy-repid`: Current program ID.

---

### 9. Debugging Capabilities

- **ABAP Debugger**: Allows setting breakpoints to step line-by-line (using **F6** to step over, **F8** to continue) to monitor real-time data transformations and diagnose runtime dumps or logic errors.