---
id: "16"
title: "16. Directory & Virtual Host (VHost) Fuzzing Workflow — Master Field Guide"
category: "3. Web Exploitation"
categoryId: "web"
filename: "16_directory_vhost_fuzzing_workflow.md"
refs_out: ["01","03","15","17","17a","25","30"]
refs_in: ["04","06","09","15"]
---

# 16. Directory & Virtual Host (VHost) Fuzzing Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Web Content Discovery & Virtual Host Enumeration Workflow
SERVICE TARGET     : HTTP (TCP 80), HTTPS (TCP 443), Custom Web Ports (8080, 8443, 5000, 3000)
PRIMARY TOOLS      : ffuf, gobuster, feroxbuster, dirsearch, wfuzz, arjun, cewl
TARGET AUDIENCE    : Penetration Testers, CTF Players (HackTheBox, TryHackMe, Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi), [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master), [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon)
==================================================================================
```

---

## 🧭 DAFTAR ISI

1. [Bagian 1: Konsep Fuzzing](#-bagian-1-konsep-fuzzing)
   - 1.1 [Apa itu Directory Fuzzing](#11-apa-itu-directory-fuzzing)
   - 1.2 [Apa itu Virtual Host (VHost) Fuzzing](#12-apa-itu-virtual-host-vhost-fuzzing)
   - 1.3 [Kapan Fuzzing Dilakukan dalam Kill Chain](#13-kapan-fuzzing-dilakukan-dalam-kill-chain)
   - 1.4 [Wordlist: Senjata Utama Fuzzing](#14-wordlist-senjata-utama-fuzzing)
2. [Bagian 2: Tools Fuzzing (Deep Dive & Real Output)](#-bagian-2-tools-fuzzing-deep-dive--real-output)
   - 2.1 [FFUF (Fuzz Faster U Fool) — Tool Utama](#21-ffuf-fuzz-faster-u-fool--tool-utama)
   - 2.2 [Gobuster — Cepat & Handal](#22-gobuster--cepat--handal)
   - 2.3 [Feroxbuster — Rust Recursive Powerhouse](#23-feroxbuster--rust-recursive-powerhouse)
   - 2.4 [Dirsearch — Python Classic](#24-dirsearch--python-classic)
   - 2.5 [Wfuzz — Legacy Advanced Fuzzer](#25-wfuzz--legacy-advanced-fuzzer)
3. [Bagian 3: Workflow Directory Fuzzing (Langkah 1-7)](#-bagian-3-workflow-directory-fuzzing-langkah-1-7)
   - [Langkah 1: Persiapan dan Setup Target](#langkah-1-persiapan-dan-setup-target)
   - [Langkah 2: Initial Response Check (Baseline Discovery)](#langkah-2-initial-response-check-baseline-discovery)
   - [Langkah 3: Quick Directory Scan (Small Wordlist)](#langkah-3-quick-directory-scan-small-wordlist)
   - [Langkah 4: Full Directory Scan (Medium Wordlist & Multi-Ext)](#langkah-4-full-directory-scan-medium-wordlist--multi-ext)
   - [Langkah 5: Targeted File Fuzzing (Sensitive Assets)](#langkah-5-targeted-file-fuzzing-sensitive-assets)
   - [Langkah 6: Recursive Fuzzing](#langkah-6-recursive-fuzzing)
   - [Langkah 7: Analisis Hasil dan Prioritasi Temuan](#langkah-7-analisis-hasil-dan-prioritasi-temuan)
4. [Bagian 4: Workflow VHost Fuzzing (Langkah 1-7)](#-bagian-4-workflow-vhost-fuzzing-langkah-1-7)
   - [Langkah 1: Konfirmasi Target Memakai Virtual Hosting](#langkah-1-konfirmasi-target-memakai-virtual-hosting)
   - [Langkah 2: Setup /etc/hosts yang Benar](#langkah-2-setup-etchosts-yang-benar)
   - [Langkah 3: Identifikasi Baseline Response VHost (Ukuran False Positive)](#langkah-3-identifikasi-baseline-response-vhost-ukuran-false-positive)
   - [Langkah 4: VHost Fuzzing dengan FFUF](#langkah-4-vhost-fuzzing-dengan-ffuf)
   - [Langkah 5: VHost Fuzzing dengan Gobuster](#langkah-5-vhost-fuzzing-dengan-gobuster)
   - [Langkah 6: Subdomain Fuzzing (External DNS Mode)](#langkah-6-subdomain-fuzzing-external-dns-mode)
   - [Langkah 7: Verifikasi dan Akses VHost Baru](#langkah-7-verifikasi-dan-akses-vhost-baru)
5. [Bagian 5: Analisis Output dan Decision Tree](#-bagian-5-analisis-output-dan-decision-tree)
   - 5.1 [Master Post-Fuzzing Decision Tree (ASCII)](#51-master-post-fuzzing-decision-tree-ascii)
   - 5.2 [Katalog File dan Direktori Sensitif di CTF (25+ Path)](#52-katalog-file-dan-direktori-sensitif-di-ctf-25-path)
   - 5.3 [HTTP Status Code Cheatsheet untuk Fuzzing](#53-http-status-code-cheatsheet-untuk-fuzzing)
6. [Bagian 6: Teknik Bypass Proteksi Web](#-bagian-6-teknik-bypass-proteksi-web)
   - 6.1 [Bypass 403 Forbidden (Header, Path, Method, & FFUF Automation)](#61-bypass-403-forbidden-header-path-method--ffuf-automation)
   - 6.2 [Bypass 401 Unauthorized (Default Creds & Hydra Brute Force)](#62-bypass-401-unauthorized-default-creds--hydra-brute-force)
7. [Bagian 7: Advanced Techniques](#-bagian-7-advanced-techniques)
   - 7.1 [Parameter Fuzzing (Arjun & FFUF)](#71-parameter-fuzzing-arjun--ffuf)
   - 7.2 [Custom Wordlist Generator dengan CeWL](#72-custom-wordlist-generator-dengan-cewl)
   - 7.3 [Fuzzing di Balik Autentikasi (Cookie & Bearer Token)](#73-fuzzing-di-balik-autentikasi-cookie--bearer-token)
   - 7.4 [Fuzzing HTTPS dengan Self-Signed Certificate](#74-fuzzing-https-dengan-self-signed-certificate)
   - 7.5 [Routing Fuzzing Melalui Proxy Burp Suite](#75-routing-fuzzing-melalui-proxy-burp-suite)
8. [Bagian 8: Automation Scripts Siap Pakai](#-bagian-8-automation-scripts-siap-pakai)
   - 8.1 [Script 1: `autofuzz.sh` (Directory Discovery Suite)](#81-script-1-autofuzzsh-directory-discovery-suite)
   - 8.2 [Script 2: `vhost_discover.sh` (VHost Hunter & Host Updater)](#82-script-2-vhost_discoversh-vhost-hunter--host-updater)
   - 8.3 [One-Liner Pipeline Berguna](#83-one-liner-pipeline-berguna)
9. [Bagian 9: Common Errors & Troubleshooting (12 Skenario Nyata)](#-bagian-9-common-errors--troubleshooting-12-skenario-nyata)
10. [Bagian 10: Cheatsheet Akhir & Muscle Memory](#-bagian-10-cheatsheet-akhir--muscle-memory)
    - [FFUF One-Liners](#ffuf-one-liners)
    - [Gobuster One-Liners](#gobuster-one-liners)
    - [Feroxbuster One-Liners](#feroxbuster-one-liners)
    - [Wordlist Quick Reference Table](#wordlist-quick-reference-table)
11. [Lanjut ke File Berikutnya: 17_cms_detection_workflow.md](#-lanjut-ke-file-berikutnya)

---

## 🧩 BAGIAN 1: KONSEP FUZZING

Dalam penetration testing dan CTF (HackTheBox, TryHackMe, Proving Grounds), apa yang terlihat di halaman depan (*landing page*) website hanyalah **5% hingga 10% dari total attack surface**. Developer sering kali menyembunyikan portal administrasi, dashboard debug, file backup database, dokumentasi internal, atau API endpoint tanpa menautkannya (*hyperlink*) ke menu navigasi publik.

Fuzzing adalah teknik otomatisasi untuk menebak (*brute-force discovery*) ribuan nama path, file, header, dan parameter secara sistematis menggunakan daftar kata (*wordlist*).

```text
+=============================================================================+
|                      ANALOGI FUZZING: RUMAH SAKIT MISTERIUS                 |
+=============================================================================+
|                                                                             |
|  1. Browsing Biasa (Manual Web Recon):                                      |
|     Anda masuk ke lobi rumah sakit, melihat papan petunjuk:                 |
|     - "Lobi Utama", "Poli Gigi", "Kantin".                                  |
|     Anda hanya mengunjungi ruangan yang tertulis di papan petunjuk.         |
|                                                                             |
|  2. Directory Fuzzing:                                                      |
|     Anda berjalan di lorong panjang, mengetuk setiap pintu tanpa label:     |
|     - Mencoba pintu bertuliskan: /admin, /backup, /secret, /server-status.  |
|     Jika pintu terbuka (HTTP 200) atau terkunci rapat (HTTP 403), Anda tahu |
|     ada ruangan rahasia di baliknya.                                        |
|                                                                             |
|  3. Virtual Host (VHost) Fuzzing:                                           |
|     Rumah sakit ini memiliki alamat fisik yang sama (IP 10.10.11.25),      |
|     tetapi di pintu masuk ada interkom. Jika Anda berkata "Halo saya mau    |
|     ke poli-gigi.rs.htb", satpam mengantar Anda ke ruangan A.               |
|     Tetapi jika Anda membisikkan "internal-dev.rs.htb", satpam membuka      |
|     pintu lift rahasia menuju laboratorium bawah tanah!                     |
|                                                                             |
+=============================================================================+
```

---

### 1.1 Apa itu Directory Fuzzing

Directory fuzzing adalah proses mengirimkan ratusan hingga ribuan HTTP request ke server web target dengan pola:
`http://TARGET/FUZZ/` atau `http://TARGET/FUZZ.ext`

Di mana `FUZZ` digantikan secara dinamis oleh setiap baris kata di dalam wordlist.

#### Perbedaan Directory Fuzzing vs File Fuzzing:
1. **Directory Fuzzing**:
   - Menargetkan folder atau path routing di server.
   - Pola: `http://target.htb/FUZZ` atau `http://target.htb/FUZZ/`.
   - Menguji apakah server memiliki direktori bernama `/admin/`, `/uploads/`, `/api/`, `/internal/`, `/dev/`.
   - Respons server biasanya berupa `301 Moved Permanently` (redirect ke trailing slash `/`), `200 OK` (jika ada index page atau directory listing), atau `403 Forbidden` (direktori ada tapi dilarang diakses secara direct).
2. **File Fuzzing**:
   - Menargetkan file spesifik dengan ekstensi yang disesuaikan dengan teknologi backend.
   - Pola: `http://target.htb/FUZZ.php`, `http://target.htb/FUZZ.bak`, `http://target.htb/.FUZZ`.
   - Menguji keberadaan file seperti `config.php`, `database.sql`, `backup.zip`, `.env`, `notes.txt`.

#### Kenapa Directory Fuzzing Dilakukan Setelah Web Recon (File 15)?
- **Hemat Waktu**: Jika WhatWeb di File 15 mendeteksi server berjalan di atas **Node.js/Express**, Anda tidak perlu membuang waktu mem-fuzzing file `.php` atau `.asp`.
- **Ekstensi Presisi**: Mengetahui sistem operasi (Linux vs Windows dari File 03/15) menentukan sensitivitas huruf besar/kecil (*case sensitivity*) dan ekstensi file konfigurasi (`web.config` di IIS vs `.htaccess` di Apache).
- **Mencegah False Positive**: Tanpa web recon, Anda tidak tahu halaman 404 target menghasilkan ukuran respons berapa byte, sehingga hasil scan Anda akan dipenuhi ribuan respons sampah (*wildcard responses*).

#### Apa yang Kita Cari Saat Fuzzing?
- **Direktori Tersembunyi**: `/admin/`, `/dashboard/`, `/portal/`, `/cpanel/`, `/manager/`.
- **File Sensitif & Source Code Leak**: `.git/`, `.env`, `web.config`, `config.php`, `id_rsa`, `shadow.bak`.
- **Endpoint Tersembunyi & API**: `/api/v1/users`, `/api/v2/debug`, `/graphql`, `/swagger.json`, `/actuator`.
- **Backup & Archive Files**: `site.tar.gz`, `backup.zip`, `db.sql`, `index.php.bak`, `index.php~`, `database.sql.old`.
- **Developer Staging / Testing Grounds**: `/dev/`, `/test/`, `/staging/`, `/old/`, `/temp/`, `/beta/`.

---

### 1.2 Apa itu Virtual Host (VHost) Fuzzing

**Virtual Hosting** adalah teknologi pada web server (seperti Apache `vhosts` atau Nginx `server_blocks`) yang memungkinkan **satu server fisik dengan satu alamat IP** untuk meng-host puluhan situs web yang berbeda secara independen.

```text
                                  ALAMAT IP SAMA: 10.10.11.120
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
       REQUEST HEADER:                 REQUEST HEADER:                 REQUEST HEADER:
       Host: megacorp.htb              Host: dev.megacorp.htb          Host: admin.megacorp.htb
               │                               │                               │
               ▼                               ▼                               ▼
      Nginx Virtual Host 1            Nginx Virtual Host 2            Nginx Virtual Host 3
      Document Root:                  Document Root:                  Document Root:
      /var/www/megacorp/              /var/www/dev-portal/            /var/www/admin-panel/
      (Website Publik Statis)        (Aplikasi Node.js Rentan)       (Dashboard Internal)
```

#### Perbedaan Subdomain Fuzzing vs VHost Fuzzing:

| Parameter | Subdomain Fuzzing (DNS Level) | Virtual Host (VHost) Fuzzing (HTTP Level) |
| :--- | :--- | :--- |
| **Lapisan (Layer)** | Protokol DNS (UDP Port 53) | Protokol HTTP/HTTPS (TCP Port 80/443) |
| **Mekanisme** | Mengirim query DNS `A record` ke nameserver target | Mengirim HTTP request ke IP target sambil mengganti header `Host:` |
| **Konteks CTF** | Jarang ada DNS server publik internal di lab CTF | **SANGAT SERING** di HackTheBox & Proving Grounds |
| **Ketergantungan DNS** | Butuh record DNS yang terdaftar | **Bypass DNS**: Bekerja meskipun DNS publik tidak tahu keberadaan domain tersebut |
| **Tool Utama** | `gobuster dns`, `ffuf` (DNS mode), `subfinder` | `ffuf -H "Host: FUZZ.target.htb"`, `gobuster vhost` |

#### Kenapa VHost Sering Tersembunyi dan Tidak Muncul di DNS Publik?
Dalam skenario enterprise dan CTF, developer membuat portal staging (`dev.target.htb`, `staging.corp.htb`, `internal.target.htb`) hanya untuk keperluan internal. Mereka tidak mendaftarkannya ke DNS publik internet. Konfigurasi virtual host disimpan langsung di web server (`/etc/nginx/sites-enabled/dev.conf` atau `/etc/apache2/sites-enabled/000-default.conf`).

Server web membedakan ke mana request diarahkan **hanya berdasarkan teks string di dalam HTTP Header `Host:`**. Jika penyerang mengirimkan header `Host: dev.target.htb` ke IP server, web server akan menyajikan aplikasi rahasia tersebut!

#### Cara Mengakses VHost yang Ditemukan:
Setelah menemukan vhost baru bernama `dev.target.htb`, Anda **wajib** memetakannya ke `/etc/hosts` di mesin Parrot OS Anda:
```bash

# Tambahkan vhost baru ke baris IP target di /etc/hosts
sudo sed -i '/10.10.11.120/ s/$/ dev.target.htb/' /etc/hosts

# Verifikasi isi /etc/hosts
cat /etc/hosts | grep 10.10.11.120

# Output: 10.10.11.120 target.htb dev.target.htb
```
Sekarang browser dan tools Anda dapat membuka `http://dev.target.htb/` secara langsung.

---

### 1.3 Kapan Fuzzing Dilakukan dalam Kill Chain

Fuzzing **bukanlah** langkah pertama saat menyerang mesin web. Mengikuti urutan metodologi yang disiplin adalah kunci sukses di HackTheBox dan Proving Grounds:

```text
+-----------------------------------------------------------------------------+
|                      WEB EXPLOITATION KILL CHAIN                            |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [Langkah 1] NMAP PORT SCAN (File 03)                                       |
|              -> Menemukan Port 80, 443, 8080, 8443, 5000 terbuka.           |
|                                                                             |
|  [Langkah 2] PASSIVE & ACTIVE WEB RECON (File 15)                           |
|              -> WhatWeb, Wappalyzer, curl -I (Cek server & teknologi).      |
|              -> Baca manual: robots.txt, sitemap.xml, page source (Ctrl+U). |
|              -> Pemetaan /etc/hosts untuk base domain.                      |
|                                                                             |
|  [Langkah 3] DIRECTORY & FILE FUZZING (File 16 - Bagian 3)                  |
|              -> Quick scan: common.txt (Cari folder utama).                 |
|              -> Full scan: medium.txt + ekstensi relevan (.php, .bak, dll). |
|              -> Sensitive file hunting (.env, .git, backup.zip).            |
|                                                                             |
|  [Langkah 4] VIRTUAL HOST FUZZING (File 16 - Bagian 4)                      |
|              -> Fuzzing Host header pada port web yang ditemukan.           |
|              -> Dapatkan vhost tersembunyi (dev, admin, api, internal).     |
|                                                                             |
|  [Langkah 5] CMS & VULNERABILITY EXPLOITATION (File 17 dst)                 |
|              -> Jika menemukan WordPress / Joomla -> CMS Workflow.          |
|              -> Jika menemukan form login / query param -> SQLi, LFI, RCE.  |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

### 1.4 Wordlist: Senjata Utama Fuzzing

Fuzzing tanpa wordlist yang tepat adalah seperti mencari jarum di tumpukan jerami dengan mata tertutup. Wordlist adalah kumpulan kamus nama folder, nama file, dan nama subdomain yang disusun berdasarkan data empiris ribuan website nyata di internet.

#### Lokasi Wordlist Bawaan di Parrot OS:
Di Parrot OS XFCE, wordlist tersimpan di:
- `/usr/share/wordlists/` (Dirb, Dirbuster, Rockyou)
- `/usr/share/seclists/` (SecLists — standar emas industri penetration testing)

#### Cara Install SecLists di Parrot OS (Jika Belum Terpasang):
SecLists adalah repositori wajib bagi setiap pentester. Repositori ini berisi ratusan megabyte daftar kata untuk discovery web, DNS, password, dan payload fuzzing.

```bash

# Update repository dan install SecLists secara resmi di Parrot OS
sudo apt update
sudo apt install seclists -y

# Jika paket debian tidak tersedia, clone langsung dari GitHub resmi:

# sudo git clone --depth 1 https://github.com/danielmiessler/SecLists.git /usr/share/seclists

# Verifikasi instalasi SecLists
ls -ld /usr/share/seclists/Discovery/Web-Content/
```

#### Strategi: Kapan Menggunakan Wordlist Kecil vs Besar?

| Ukuran Wordlist | Estimasi Baris | Waktu Eksekusi | Skenario Penggunaan |
| :--- | :--- | :--- | :--- |
| **Small / Common** | 4.000 - 10.000 | 5 - 20 Detik | Initial Quick Scan (Port 80 baru dibuka) |
| **Medium** | 80.000 - 220.000 | 1 - 5 Menit | Standard Comprehensive (Scan mendalam CTF) |
| **Large / Raft** | 500.000 - 1.000.000 | 15 - 45 Menit | Deep Dive / Hard Box (Ketika medium nihil) |

#### Wordlist yang WAJIB Dikuasai di SecLists:

1. **Web Content & Directory Discovery**:
   - `common.txt` (~4.700 kata):
     `/usr/share/seclists/Discovery/Web-Content/common.txt`
     *Gunakan untuk 10 detik pertama. Menemukan direktori standar seperti admin, login, images, css, js, api.*
   - `directory-list-2.3-small.txt` (~87.000 kata):
     `/usr/share/seclists/Discovery/Web-Content/directory-list-2.3-small.txt`
     *Wordlist standar untuk scan umum di HackTheBox dan TryHackMe.*
   - `directory-list-2.3-medium.txt` (~220.000 kata):
     `/usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt`
     *Standar resmi industri CTF. 90% box HTB terselesaikan dengan wordlist ini.*
   - `big.txt` (~20.000 kata):
     `/usr/share/seclists/Discovery/Web-Content/big.txt`
     *Alternatif cepat dengan variasi path umum yang lebih luas dari common.txt.*
   - `raft-large-directories.txt` & `raft-large-files.txt`:
     `/usr/share/seclists/Discovery/Web-Content/raft-large-directories.txt`
     `/usr/share/seclists/Discovery/Web-Content/raft-large-files.txt`
     *Diekstrak dari crawler internet riil. Sangat ampuh mencari file backup dan endpoint tersembunyi.*

2. **DNS & Subdomain / VHost Discovery**:
   - `subdomains-top1million-5000.txt` (~5.000 kata):
     `/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt`
     *Sangat cepat untuk VHost quick check.*
   - `bitquark-subdomains-top100000.txt` (~100.000 kata):
     `/usr/share/seclists/Discovery/DNS/bitquark-subdomains-top100000.txt`
     *Wordlist terlengkap untuk memburu vhost staging/dev yang obscure.*
   - `dns-Jhaddix.txt` (~160.000 kata):
     `/usr/share/seclists/Discovery/DNS/dns-Jhaddix.txt`
     *Kompilasi master dari bug hunter ternama Jason Haddix.*

---

## 🛠️ BAGIAN 2: TOOLS FUZZING (DEEP DIVE & REAL OUTPUT)

Berikut adalah 5 tool fuzzing utama di dunia cybersecurity. Kita akan membedah fungsionalitas, sintaks, flag esensial, dan cara membaca output terminalnya secara akurat.

---

### 2.1 FFUF (Fuzz Faster U Fool) — Tool Utama

`ffuf` adalah tool web fuzzer berkecepatan tinggi yang ditulis dalam bahasa pemrograman **Go**. `ffuf` adalah standar industri de-facto saat ini karena sangat hemat memori, mendukung multi-threading masif, memiliki sistem filtering terlengkap (size, words, lines, regex), dan fleksibel menempatkan keyword `FUZZ` di mana saja (URL, Header, Body POST, Cookie).

#### Cara Install di Parrot OS:
```bash
sudo apt update && sudo apt install ffuf -y
ffuf -V
```

#### Sintaks Dasar:
```bash
ffuf -u http://TARGET/FUZZ -w /path/to/wordlist.txt
```

#### Flag Penting FFUF yang Wajib Dipahami:

| Flag | Penjelasan & Kegunaan |
| :--- | :--- |
| `-u <URL>` | Target URL. Tempatkan keyword `FUZZ` di titik injeksi yang diinginkan. |
| `-w <FILE>[:KEYWORD]` | Path wordlist. Bisa multiple wordlist: `-w list1:W1 -w list2:W2` |
| `-H "Header: Val"` | Menambahkan HTTP Header kustom (cth: `"Host: FUZZ.htb"` atau Auth Cookie) |
| `-b <COOKIE_DATA>` | Cookie data shorthand (cth: `-b "PHPSESSID=123; session=abc"`) |
| `-mc <CODES>` | Match status code (default: `200,204,301,302,307,401,403,405,500`) |
| `-ms <SIZE>` | Match response size tertentu dalam byte. |
| `-mw <WORDS>` | Match jumlah kata tertentu dalam response. |
| `-ml <LINES>` | Match jumlah baris tertentu dalam response. |
| `-fc <CODES>` | FILTER status code (cth: `-fc 404,403` menyembunyikan 404 dan 403). |
| `-fs <SIZE>` | FILTER response size dalam byte (**SANGAT PENTING** untuk bypass soft 404). |
| `-fw <WORDS>` | FILTER response berdasarkan jumlah kata. |
| `-fl <LINES>` | FILTER response berdasarkan jumlah baris. |
| `-e <EXTENSIONS>` | Daftar ekstensi yang ditambahkan ke kata (cth: `-e .php,.html,.txt`). |
| `-r` | Follow HTTP Redirects (mengikuti 301/302 ke lokasi tujuan). |
| `-o <FILE>` | Simpan hasil scan ke file. |
| `-of <FORMAT>` | Format output file (`json`, `csv`, `md`, `html`, `ejson`). Default: `json`. |
| `-t <THREADS>` | Jumlah thread paralel (default: 40). Di lab CTF bisa dinaikkan ke 80. |
| `-rate <RPS>` | Rate limit (Request Per Second). Berguna jika target membatasi rate. |
| `-v` | Mode verbose (menampilkan URL lengkap dan header redirect target). |
| `-ic` | Ignore comments: mengabaikan baris komentar (`#`) di dalam wordlist. |
| `-c` | Colorize output terminal (wajib untuk kemudahan analisis visual). |
| `-ac` | Auto-Calibrate filter (ffuf otomatis menebak ukuran 404 dan membuangnya). |
| `-recursion` | Fuzzing rekursif (jika menemukan folder 301/200, ffuf lanjut masuk). |
| `-recursion-depth <N>` | Batas kedalaman rekursif (rekomendasi: 2 atau 3). |
| `-timeout <DETIK>` | Timeout per HTTP request (default: 10 detik). |
| `-x <PROXY_URL>` | Route request melalui proxy (cth: `-x http://127.0.0.1:8080` untuk Burp). |
| `-k` | Skip TLS/SSL certificate verification (abaikan self-signed cert). |

#### Penempatan Keyword `FUZZ`:
1. **Di URL (Directory/File)**: `http://10.10.11.120/FUZZ`
2. **Di Ekstensi**: `http://10.10.11.120/index.FUZZ`
3. **Di Header (VHost)**: `ffuf -u http://10.10.11.120/ -H "Host: FUZZ.target.htb"`
4. **Di Parameter GET**: `http://10.10.11.120/search.php?FUZZ=test`
5. **Di Body POST (Data)**: `ffuf -u http://10.10.11.120/login -d "user=FUZZ&pass=admin" -X POST`

#### Contoh Output Nyata FFUF di Terminal:

```text
$ ffuf -u http://target.htb/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt -c -ic

        /'___\  /'___\           /'___\
       /\ \__/ /\ \__/  __  __  /\ \__/
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/
         \ \_\   \ \_\  \ \____/  \ \_\
          \/_/    \/_/   \/___/    \/_/

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://target.htb/FUZZ
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/Web-Content/common.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

.hta                    [Status: 403, Size: 277, Words: 20, Lines: 10, Duration: 23ms]
.htaccess               [Status: 403, Size: 277, Words: 20, Lines: 10, Duration: 24ms]
.htpasswd               [Status: 403, Size: 277, Words: 20, Lines: 10, Duration: 25ms]
admin                   [Status: 301, Size: 312, Words: 20, Lines: 10, Duration: 28ms]
api                     [Status: 301, Size: 310, Words: 20, Lines: 10, Duration: 22ms]
assets                  [Status: 301, Size: 313, Words: 20, Lines: 10, Duration: 21ms]
css                     [Status: 301, Size: 310, Words: 20, Lines: 10, Duration: 23ms]
favicon.ico             [Status: 200, Size: 1150, Words: 3, Lines: 1, Duration: 20ms]
images                  [Status: 301, Size: 313, Words: 20, Lines: 10, Duration: 25ms]
index.html              [Status: 200, Size: 4521, Words: 312, Lines: 85, Duration: 21ms]
javascript              [Status: 301, Size: 317, Words: 20, Lines: 10, Duration: 24ms]
robots.txt              [Status: 200, Size: 85, Words: 7, Lines: 4, Duration: 20ms]
server-status           [Status: 403, Size: 277, Words: 20, Lines: 10, Duration: 22ms]
:: Progress: [4727/4727] :: Job [1/1] :: 1850 req/sec :: Duration: [0:00:03] :: Errors: 0 ::
```

#### Cara Membaca Kolom Output:
- **`Status: 301`**: Direktori ada di server, tetapi server meminta browser menambahkan garis miring (`/admin/`).
- **`Size: 312`**: Ukuran respon HTML dalam byte. Jika ribuan kata mengembalikan ukuran persis sama (misal Size: 312), itu adalah indikator halaman 404 kustom yang harus difilter dengan `-fs 312`.
- **`Words: 20`**: Jumlah kata pada respon body.
- **`Lines: 10`**: Jumlah baris teks respon body.
- **`Duration: 28ms`**: Waktu latensi dari request hingga response diterima. Berguna untuk mendeteksi time-based vulnerability.

---

### 2.2 Gobuster

`gobuster` adalah tool fuzzer berbasis **Go** yang dikembangkan oleh OJ Reeves. Berbeda dengan `ffuf` yang bersifat serba guna, `gobuster` membagi fungsinya ke dalam mode-mode spesifik (`dir`, `dns`, `vhost`, `fuzz`, `s3`). `gobuster` sangat populer di kalangan pemula karena sintaksnya yang mudah diingat dan minim false positive.

#### Cara Install di Parrot OS:
```bash
sudo apt update && sudo apt install gobuster -y
gobuster version
```

#### Flag Penting Gobuster:
- `dir` / `dns` / `vhost`: Menentukan mode operasi.
- `-u <URL>`: Target URL.
- `-w <WORDLIST>`: File wordlist.
- `-x <EXTS>`: Daftar ekstensi file yang dipisahkan koma (cth: `-x php,txt,html`).
- `-t <THREADS>`: Jumlah thread (default: 10, naikkan ke 40-50 di CTF).
- `-o <FILE>`: Simpan output ke file teks.
- `-b <CODES>`: Blacklist status code (default: 404).
- `-s <CODES>`: Whitelist status code (cth: `-s "200,204,301,302,307,403"`).
- `--no-error`: Sembunyikan pesan galat koneksi agar layar bersih.
- `-k`: Abaikan verifikasi SSL/TLS certificate.
- `-H "Header: Val"`: Header HTTP tambahan.
- `-P <PASS>` / `-U <USER>`: HTTP Basic Authentication.
- `-r`: Mengikuti redirect (Follow redirects).
- `--timeout <DURATION>`: Timeout HTTP (default: 10s).
- `-q`: Quiet mode (hanya mencetak hasil yang ditemukan).
- `-z`: No progress (tidak menampilkan progress bar).

#### Contoh Perintah Gobuster Berdasarkan Mode:

```bash

# 1. Mode Directory (Dir Mode)
gobuster dir -u http://target.htb/ \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -x php,txt,bak \
  -t 40 \
  -b 404 \
  --no-error \
  -o gobuster_dir.txt

# 2. Mode Virtual Host (VHost Mode)
gobuster vhost -u http://target.htb/ \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  --append-domain \
  -t 40 \
  -o gobuster_vhosts.txt

# 3. Mode DNS (Subdomain Resolving)
gobuster dns -d target.htb \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  -t 40 \
  -o gobuster_dns.txt
```

#### Contoh Output Nyata Gobuster:

```text
===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://target.htb/
[+] Method:                  GET
[+] Threads:                 40
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Extensions:              php,txt,bak
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/admin                (Status: 301) [Size: 312] [--> http://target.htb/admin/]
/config.php           (Status: 200) [Size: 0]
/config.php.bak       (Status: 200) [Size: 1420]
/index.php            (Status: 200) [Size: 4521]
/login.php            (Status: 200) [Size: 2890]
/robots.txt           (Status: 200) [Size: 85]
/uploads              (Status: 301) [Size: 314] [--> http://target.htb/uploads/]
Progress: 18908 / 18908 (100.00%)
===============================================================
Finished
===============================================================
```

---

### 2.3 Feroxbuster

`feroxbuster` adalah web fuzzer generasi baru yang ditulis dalam bahasa **Rust**. Keunggulan mutlak `feroxbuster` adalah **rekursif secara otomatis (recursive by default)** dan performa multithreading yang luar biasa cepat berkat asynchronous engine Tokio.

#### Cara Install di Parrot OS:
```bash
sudo apt update && sudo apt install feroxbuster -y
feroxbuster -V
```

#### Flag Penting Feroxbuster:
- `-u <URL>`: Target URL.
- `-w <WORDLIST>`: Wordlist file.
- `-x <EXTS>`: Ekstensi file (cth: `-x php html txt json`).
- `-t <THREADS>`: Threads per URL (default: 50).
- `-o <FILE>`: Simpan output ke file teks.
- `-C <CODES>`: Filter / Sembunyikan status code (cth: `-C 404 403`).
- `-S <SIZES>`: Filter response size tertentu.
- `-W <WORDS>`: Filter response word count.
- `-L <LINES>`: Filter response line count.
- `-r`: Follow redirects.
- `-k`: Insecure TLS (skip certificate verification).
- `-H <HEADER>`: Tambahkan kustom header.
- `-d <DEPTH>`: Maksimum recursion depth (default: 4. Untuk CTF disarankan `2` agar tidak terjebak loop).
- `-E` / `--auto-tune`: Secara dinamis menyesuaikan kecepatan scan jika server mulai overload.
- `--burp`: Shortcut otomatis untuk me-route traffic ke Burp Suite (`http://127.0.0.1:8080`).
- `--scan-limit <N>`: Batas jumlah concurrent scans direktori.
- `--rate-limit <N>`: Batas request per detik secara global.
- `-q`: Quiet mode.

#### Contoh Output Nyata Feroxbuster:

```text
$ feroxbuster -u http://target.htb/ -w /usr/share/seclists/Discovery/Web-Content/raft-large-directories.txt -x php,txt -d 2 -k

 ___  ___  __   __     __      __         __   ___
|__  |__  |__) |__) | /  `    /  \ \_/ | |  \ |__
|    |___ |  \ |  \ | \__,    \__/ / \ | |__/ |___
by Ben "epi" Risher

 🎯 Target            : http://target.htb/
 🚀 Threads           : 50
 📁 Wordlist          : /usr/share/seclists/Discovery/Web-Content/raft-large-directories.txt
 👌 Status Codes      : [200, 204, 301, 302, 307, 308, 401, 403, 405, 500]
 💥 Extensions        : [php, txt]
 递归 Recursion Depth  : 2
────────────────────────────────────────────────
200      GET        1L        7W       85B http://target.htb/robots.txt
301      GET        9L       28W      312B http://target.htb/admin => http://target.htb/admin/
200      GET       85L      312W     4521B http://target.htb/index.php
301      GET        9L       28W      314B http://target.htb/uploads => http://target.htb/uploads/
200      GET       45L      110W     2890B http://target.htb/admin/login.php
200      GET        0L        0W        0B http://target.htb/uploads/index.html
```

---

### 2.4 Dirsearch

`dirsearch` adalah web path fuzzer berbasis **Python**. Meskipun tidak secepat `ffuf` atau `feroxbuster`, `dirsearch` memiliki kelebihan dalam **heuristik otomatis**, manajemen ekstensi pintar, output berwarna yang sangat rapi, serta pelaporan otomatis terhadap header server yang aneh.

#### Cara Install di Parrot OS:
```bash
sudo apt update && sudo apt install dirsearch -y

# Atau jalankan langsung versi git:

# git clone https://github.com/maurosoria/dirsearch.git /opt/dirsearch
```

#### Flag Penting Dirsearch:
- `-u <URL>`: Target URL.
- `-w <WORDLIST>`: Wordlist kustom (jika tidak diisi, dirsearch memakai wordlist default-nya yang sangat bagus).
- `-e <EXTS>`: Ekstensi yang dicari (cth: `-e php,txt,html,bak`).
- `-t <THREADS>`: Jumlah thread.
- `-o <FILE>`: File output.
- `--include-status <CODES>`: Hanya tampilkan kode status ini (cth: `200,301,302`).
- `--exclude-status <CODES>`: Abaikan status kode ini (cth: `404,403`).
- `--exclude-sizes <SIZES>`: Sembunyikan ukuran respon tertentu (cth: `142B,0B`).
- `-r`: Rekursif scan.
- `--timeout <DETIK>`: HTTP timeout.
- `-H <HEADER>`: Tambahkan header kustom.
- `--proxy <URL>`: Kirim request via HTTP proxy.

#### Contoh Output Nyata Dirsearch:

```text
$ dirsearch -u http://target.htb/ -e php,txt -x 404 --format=plain

  _|. _ _  _  _  _|_|_
 (_||| _) (/_(_|| (_| )  v0.4.3

[14:22:01] Starting: http://target.htb/
[14:22:03] 301 -  312B  - /admin  ->  http://target.htb/admin/
[14:22:04] 200 -   85B  - /robots.txt
[14:22:05] 200 -    4KB - /index.php
[14:22:07] 200 -    1KB - /config.php.bak
[14:22:08] 403 -  277B  - /.htpasswd
[14:22:12] 301 -  314B  - /uploads  ->  http://target.htb/uploads/
```

---

### 2.5 Wfuzz (Legacy Tapi Tetap Relevan)

`wfuzz` adalah fuzzer generasi pertama yang sangat fleksibel. Meskipun performanya lebih lambat dibandingkan tool berbasis Go/Rust, `wfuzz` tetap relevan ketika Anda membutuhkan multi-point injection yang sangat kompleks (misalnya mem-fuzzing 3 parameter sekaligus: username, password, dan header cookies secara simultan).

#### Sintaks & Flag Filter:
- `wfuzz -z file,wordlist.txt -u http://TARGET/FUZZ`
- `--hc <CODES>`: Hide Code (sembunyikan respons status tertentu, cth: `--hc 404`).
- `--hl <LINES>`: Hide Lines (sembunyikan respons dengan jumlah baris tertentu).
- `--hw <WORDS>`: Hide Words (sembunyikan respons dengan jumlah kata tertentu).
- `--hh <CHARS/BYTES>`: Hide Chars/Size (sembunyikan respons dengan ukuran byte tertentu).

```bash

# Contoh command wfuzz dasar
wfuzz -c -z file,/usr/share/seclists/Discovery/Web-Content/common.txt \
  --hc 404,403 \
  -u http://target.htb/FUZZ
```

#### Kapan Wfuzz Lebih Baik dari FFUF?
Ketika Anda membutuhkan fitur *payload encoders* bawaan (seperti otomatis melakukan double urlencode, base64, MD5 hashing secara on-the-fly) tanpa harus membuat wordlist baru. Namun untuk CTF standar, **FFUF tetap merupakan prioritas utama**.

---

## 🚀 BAGIAN 3: WORKFLOW DIRECTORY FUZZING (LANGKAH 1-7)

Ikuti langkah-langkah terstruktur berikut secara disiplin setiap kali Anda berhadapan dengan port web di CTF.

```text
+-----------------------------------------------------------------------------+
|               URUTAN LOGIS WORKFLOW DIRECTORY DISCOVERY                     |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [1. Setup]        -> Buat direktori kerja, set $TARGET & /etc/hosts         |
|  [2. Baseline]     -> Cek respon 404 random (Dapatkan ukuran false-positive)|
|  [3. Quick Scan]   -> common.txt (Cari folder utama dalam 15 detik)         |
|  [4. Full Scan]    -> medium.txt + Ekstensi umum (Jalankan di background)   |
|  [5. Target Hunt]  -> Fuzzing file sensitif (.env, .git, backup, config)    |
|  [6. Recursion]    -> Masuk lebih dalam ke folder yang terbuka (admin/api)  |
|  [7. Prioritize]   -> Sort status code & mulai investigasi manual           |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

### Langkah 1: Persiapan dan Setup Target

Langkah pertama adalah memastikan lingkungan pengujian rapi dan terdokumentasi dengan baik. Jangan pernah melakukan fuzzing tanpa menyimpan output ke file log!

```bash

# 1. Definisikan variabel target di terminal bash Anda
export TARGET="10.10.11.120"
export DOMAIN="target.htb"
export URL="http://${DOMAIN}"

# 2. Pastikan domain terdaftar di /etc/hosts
if ! grep -q "$DOMAIN" /etc/hosts; then
    echo -e "${TARGET}\t${DOMAIN}" | sudo tee -a /etc/hosts
    echo "[+] Domain $DOMAIN berhasil ditambahkan ke /etc/hosts"
else
    echo "[!] Domain $DOMAIN sudah ada di /etc/hosts"
fi

# 3. Buat direktori kerja untuk menyimpan seluruh artefak fuzzing
mkdir -p ~/ctf/targets/${DOMAIN}/fuzzing
cd ~/ctf/targets/${DOMAIN}/fuzzing
pwd
```

*Kenapa langkah ini krusial?*
- Variabel `$URL` mencegah kesalahan ketik manual IP berkali-kali.
- Menyimpan hasil scan ke direktori khusus memastikan Anda bisa me-review ulang hasil temuan 2 jam kemudian tanpa harus melakukan scan ulang yang membuang waktu.

---

### Langkah 2: Initial Response Check (Baseline Discovery)

Banyak web server modern (seperti Express.js, Laravel, Django, atau Apache dengan `CustomLog`/`ErrorDocument`) mengembalikan **Soft 404** (halaman error custom yang mengembalikan status `HTTP 200 OK` atau `HTTP 302` ke halaman depan). Jika Anda langsung meluncurkan `ffuf`, terminal Anda akan dibanjiri 50.000 false positive!

Anda harus menetapkan **baseline ukuran halaman error** terlebih dahulu:

```bash

# 1. Request halaman normal yang ada
curl -s -I -X GET "${URL}/"

# 2. Request path acak yang 100% PASTI TIDAK ADA di server
RANDOM_PATH=$(tr -dc a-z0-9 </dev/urandom | head -c 16)
echo "[*] Menguji path acak: ${URL}/${RANDOM_PATH}"

curl -s -i -k "${URL}/${RANDOM_PATH}" > baseline_404.txt

# 3. Analisis ukuran (Size in bytes), jumlah kata (Words), dan baris (Lines)
wc -c baseline_404.txt  # Ukuran dalam Byte
wc -w baseline_404.txt  # Jumlah Kata (Words)
wc -l baseline_404.txt  # Jumlah Baris (Lines)

# Atau periksa status code langsung dengan curl
curl -s -o /dev/null -w "Status: %{http_code} | Size: %{size_download} bytes | Words: %{size_download} \n" "${URL}/${RANDOM_PATH}"
```

**Hasil Analisis Baseline:**
- Jika status: `404 Not Found` -> Server merespons normal. Anda cukup menggunakan filter standar.
- Jika status: `200 OK` dengan size `1420 bytes` -> **Waspada Soft 404!** Anda **WAJIB** menambahkan flag `-fs 1420` pada perintah `ffuf` Anda nanti.

---

### Langkah 3: Quick Directory Scan (Small Wordlist)

Mulai dengan wordlist kecil (`common.txt`). Tujuannya adalah memetakan kerangka website dalam 10-20 detik pertama.

```bash

# Jalankan ffuf quick scan dengan common.txt
ffuf -u "${URL}/FUZZ" \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -c \
  -ic \
  -t 50 \
  -o quick_dirs.json \
  -of json
```

*Penjelasan Flag:*
- `-u "${URL}/FUZZ"`: Menentukan URL target dengan kata kunci injeksi `FUZZ`.
- `-w .../common.txt`: Wordlist ringkas berisi 4.700 kata kunci paling umum.
- `-c`: Memberikan warna (hijau untuk 200, biru untuk 301, kuning untuk 403).
- `-ic`: Mengabaikan komentar di dalam wordlist.
- `-t 50`: Menjalankan 50 thread bersamaan untuk kecepatan optimal.
- `-o quick_dirs.json -of json`: Menyimpan hasil terstruktur dalam format JSON agar bisa diparsing script otomatis.

#### Analisis Hasil Quick Scan:
Jika menemukan:
- `/admin` (301/200): Catat segera! Ini adalah target investigasi manual prioritas tinggi.
- `/api` (301/200): Indikator adanya endpoint REST API.
- `/robots.txt` (200): Baca langsung menggunakan `curl -s "${URL}/robots.txt"`.

---

### Langkah 4: Full Directory Scan (Medium Wordlist & Multi-Ext)

Setelah quick scan selesai dan Anda sedang menginvestigasi temuan awal di browser, luncurkan scan komprehensif di background menggunakan `directory-list-2.3-medium.txt` yang dipadukan dengan ekstensi file umum.

```bash

# Jalankan Full Scan dengan ekstensi multi-bahasa
ffuf -u "${URL}/FUZZ" \
  -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt \
  -e .php,.html,.txt,.js,.json,.xml,.bak,.old,.zip \
  -c \
  -ic \
  -t 60 \
  -fc 404 \
  -o full_scan.json \
  -of json > full_scan.log 2>&1 &

# Pantau progres scan di background menggunakan tail
tail -f full_scan.log
```

*Tips Praktis CTF:*
- Menggunakan `> full_scan.log 2>&1 &` akan menjalankan scan di background. Terminal Anda tetap bebas untuk mengeksplorasi temuan lain, sementara proses fuzzing terus berjalan di balik layar tanpa terputus.

---

### Langkah 5: Targeted File Fuzzing (Sensitive Assets)

Setelah Anda mengetahui teknologi target dari File 15 (misalnya PHP + Apache), lakukan perburuan terarah terhadap file-file konfigurasi kritis dan backup source code.

```bash

# 1. Buat wordlist file sensitif kustom cepat di direktori lokal
cat << 'EOF' > sensitive_targets.txt
.env
.env.backup
.env.local
.git/HEAD
.git/config
.gitignore
.htaccess
.htpasswd
web.config
config.php
config.php.bak
config.php.old
config.inc.php
configuration.php
settings.py
database.sqlite
db.sql
database.sql
dump.sql
backup.zip
backup.tar.gz
site_backup.zip
robots.txt
sitemap.xml
phpinfo.php
info.php
server-status
EOF

# 2. Jalankan targeted scan khusus untuk file sensitif di atas
ffuf -u "${URL}/FUZZ" \
  -w sensitive_targets.txt \
  -mc 200,301,302,403 \
  -c \
  -v
```

*Kemenangan Cepat di CTF:*
- Menemukan `.git/HEAD` dengan status `200 OK` berarti seluruh source code website bisa didownload menggunakan `git-dumper` (lihat Bagian 5.2).
- Menemukan `.env` berarti Anda mendapatkan password database, AWS key, atau JWT Secret Key secara gratis!

---

### Langkah 6: Recursive Fuzzing

Jika Anda menemukan direktori seperti `/admin/`, `/api/`, atau `/uploads/`, jangan berhenti di sana! Sering kali developer memproteksi folder `/admin/`, tetapi lupa memproteksi sub-folder di dalamnya seperti `/admin/dev/` atau `/admin/uploads/`.

Gunakan `feroxbuster` untuk menangani rekursi secara otomatis dan bersih:

```bash

# Fuzzing rekursif terkontrol dengan feroxbuster
feroxbuster -u "${URL}/" \
  -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-small.txt \
  -x php,txt,json \
  -d 2 \
  --scan-limit 2 \
  -t 40 \
  -o recursive_results.txt
```

*Kenapa membatasi `-d 2` (Depth 2)?*
Jika Anda tidak membatasi depth, fuzzer bisa terjebak di dalam direktori kalender atau pagination tanpa akhir (`/calendar/2026/01/02/...`), menghabiskan RAM mesin Parrot OS Anda dan membuat target hang.

---

### Langkah 7: Analisis Hasil dan Prioritasi Temuan

Setelah scan menghasilkan ratusan baris, jangan membacanya dari atas ke bawah secara buta. Kelompokkan berdasarkan kode status HTTP untuk menentukan prioritas eksploitasi:

| Status Code | Karakteristik Temuan | Tindakan Eksploitasi Prioritas |
| :--- | :--- | :--- |
| **HTTP 200 OK** | File/Halaman Terbuka | Buka langsung di browser / curl. Unduh jika backup. |
| **HTTP 301/302** | Redirect URL | Periksa tujuan redirect (lokasi folder / portal). |
| **HTTP 401 Auth** | Terproteksi Password | Lakukan HTTP Basic Auth brute force (Hydra / default). |
| **HTTP 403 Forb** | Akses Ditolak | Lakukan teknik 403 Bypass (Header & Path trick). |
| **HTTP 500 Error** | Internal Server Error | Potensi input crash / debug stack trace disclosure. |

```bash

# Parsing cepat hasil JSON FFUF untuk melihat status 200 dan 301 saja
jq -r '.results[] | select(.status == 200 or .status == 301) | "\(.status) \t \(.length) bytes \t \(.url)"' quick_dirs.json | sort -n
```

---

## 🌐 BAGIAN 4: WORKFLOW VHOST FUZZING (LANGKAH 1-7)

Virtual Host enumeration adalah pembeda utama antara pemain CTF pemula dan profesional. Sering kali mesin HackTheBox berstatus "Hard" menjadi sangat mudah begitu vhost staging/developer ditemukan!

---

### Langkah 1: Konfirmasi Target Memakai Virtual Hosting

Tanda-tanda kuat bahwa web server menggunakan Virtual Hosting:
1. **Nmap Script Scan (File 03)**: Output `http-title` menunjukkan redirect ke domain nama, misalnya `Did not follow redirect to http://target.htb/`.
2. **TLS/SSL Certificate (HTTPS Port 443)**: Subject Alternative Name (SAN) pada sertifikat menampilkan nama domain seperti `*.target.htb` atau `mail.target.htb`.
3. **Pembedaan Konten via IP vs Domain**:
```bash

# Bandingkan response mengakses via IP vs mengakses via Domain
curl -s -I http://${TARGET}/ | grep -E "Server|Location|Content-Length"
curl -s -I -H "Host: ${DOMAIN}" http://${TARGET}/ | grep -E "Server|Location|Content-Length"
```
Jika nilai `Content-Length` atau konten berbeda, server dipastikan memiliki konfigurasi Virtual Host.

---

### Langkah 2: Setup /etc/hosts yang Benar

Sistem operasi tidak akan tahu ke mana harus mengirim paket untuk `target.htb` kecuali Anda mendefinisikannya di `/etc/hosts`:

```bash

# Format entri /etc/hosts:

# <IP_ADDRESS> <PRIMARY_DOMAIN> <ALIAS_1> <ALIAS_2>

# Tambahkan IP dan Base Domain
sudo bash -c "echo '${TARGET}  ${DOMAIN}' >> /etc/hosts"

# Uji resolusi
ping -c 1 ${DOMAIN}
```

---

### Langkah 3: Identifikasi Baseline Response VHost (Ukuran False Positive)

Saat Anda mengirim header `Host: apa_saja_yang_palsu.target.htb`, server web default biasanya akan mengembalikan halaman default (misal default Apache "It Works!" page) dengan ukuran byte yang **konstan**. Ukuran byte default inilah yang harus kita catat untuk kemudian kita buang (*filter out*) saat fuzzing.

```bash

# Kirim request dengan Host header acak yang pasti tidak ada
INVALID_VHOST="pasti-tidak-ada-$(tr -dc a-z0-9 </dev/urandom | head -c 8).${DOMAIN}"

curl -s -i -H "Host: ${INVALID_VHOST}" "http://${TARGET}/" > baseline_vhost.txt

# Ekstrak ukuran byte, kata, dan baris dari respon baseline
VHOST_SIZE=$(wc -c < baseline_vhost.txt | tr -d ' ')
VHOST_WORDS=$(wc -w < baseline_vhost.txt | tr -d ' ')
VHOST_LINES=$(wc -l < baseline_vhost.txt | tr -d ' ')

echo "[*] Baseline False Positive -> Size: ${VHOST_SIZE} bytes | Words: ${VHOST_WORDS} | Lines: ${VHOST_LINES}"
```

---

### Langkah 4: VHost Fuzzing dengan FFUF

Sekarang luncurkan `ffuf` dengan mengarahkan URL ke IP target, namun kita mem-fuzzing HTTP Header `Host:` menggunakan `-H "Host: FUZZ.${DOMAIN}"`.

```bash

# Command FFUF VHost Fuzzing Presisi Tinggi
ffuf -u "http://${TARGET}/" \
  -H "Host: FUZZ.${DOMAIN}" \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  -fs ${VHOST_SIZE} \
  -c \
  -ic \
  -t 50 \
  -o vhosts_found.json \
  -of json
```

*Kenapa `-fs ${VHOST_SIZE}` SANGAT KRUSIAL?*
Jika Anda tidak menyaring ukuran respon default (`-fs`), setiap request dari wordlist akan dianggap valid oleh `ffuf` karena server mengembalikan status `200 OK` (halaman default). Dengan `-fs`, `ffuf` hanya akan menampilkan vhost yang menghasilkan ukuran respons **berbeda** dari baseline!

#### Contoh Output Nyata FFUF VHost Discovery:

```text
$ ffuf -u "http://10.10.11.120/" -H "Host: FUZZ.target.htb" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 2854 -c

        /'___\  /'___\           /'___\
       /\ \__/ /\ \__/  __  __  /\ \__/
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/
         \ \_\   \ \_\  \ \____/  \ \_\
          \/_/    \/_/   \/___/    \/_/

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://10.10.11.120/
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
 :: Header           : Host: FUZZ.target.htb
 :: Filter           : Response size: 2854
________________________________________________

admin                   [Status: 200, Size: 4521, Words: 215, Lines: 75, Duration: 23ms]
dev                     [Status: 302, Size: 245, Words: 18, Lines: 8, Duration: 21ms]
beta                    [Status: 401, Size: 412, Words: 35, Lines: 14, Duration: 25ms]
api                     [Status: 200, Size: 1045, Words: 80, Lines: 25, Duration: 22ms]
:: Progress: [4989/4989] :: Job [1/1] :: 2100 req/sec :: Duration: [0:00:03] :: Errors: 0 ::
```

---

### Langkah 5: VHost Fuzzing dengan Gobuster

Anda juga dapat menggunakan `gobuster` mode `vhost` sebagai verifikasi pembanding:

```bash

# Gobuster VHost Scan
gobuster vhost \
  -u "http://${DOMAIN}/" \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  --append-domain \
  -t 40 \
  --no-error \
  -o gobuster_vhosts.txt
```

*Perbedaan Penting Flag `--append-domain`:*
Jika target URL Anda adalah `http://target.htb/`, flag `--append-domain` akan otomatis menggabungkan kata dari wordlist (misal `dev`) menjadi `dev.target.htb`. Jika flag ini tidak dipakai, gobuster hanya mengirim string `dev` mentah pada Host header, yang sering kali gagal direspon oleh web server.

---

### Langkah 6: Subdomain Fuzzing (External DNS Mode)

Jika target mengaktifkan port DNS (UDP 53) atau memiliki nameserver internal yang dapat diakses, Anda bisa melakukan DNS resolving query:

```bash

# Subdomain brute-force via DNS resolver langsung
gobuster dns \
  -d ${DOMAIN} \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  -r ${TARGET} \
  -t 30 \
  -o dns_subdomains.txt
```

*Kapan Pakai DNS Mode vs VHost Mode?*
- Jika Port 53 (DNS) terbuka di target -> Jalankan DNS mode terlebih dahulu.
- Jika Port 53 tertutup (hanya port 80/443 yang buka) -> **Wajib gunakan VHost mode** (Langkah 4).

---

### Langkah 7: Verifikasi dan Akses VHost Baru

Begitu Anda menemukan vhost baru (misalnya `dev.target.htb` dan `admin.target.htb`), segera lakukan verifikasi konten:

```bash

# 1. Update /etc/hosts dengan vhost baru
sudo sed -i "/${TARGET}/ s/$/ dev.${DOMAIN} admin.${DOMAIN}/" /etc/hosts

# 2. Verifikasi konten dengan curl
curl -s -L "http://dev.${DOMAIN}/" | head -n 20

# 3. Lakukan kembali Directory Fuzzing (Bagian 3) KHUSUS untuk vhost baru ini!
ffuf -u "http://dev.${DOMAIN}/FUZZ" \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -c -ic
```

*Ingat Kaidah Emas CTF:* Setiap VHost baru yang Anda temukan adalah **aplikasi web yang sama sekali berbeda**. Ulangi seluruh workflow reconnaissance dan directory fuzzing dari awal pada setiap VHost baru!

---

## 📊 BAGIAN 5: ANALISIS OUTPUT DAN DECISION TREE

---

### 5.1 Master Post-Fuzzing Decision Tree (ASCII)

Gunakan decision tree ini untuk menentukan langkah teknis selanjutnya begitu `ffuf` atau `gobuster` Anda menemukan endpoint tertentu:

```text
                                  HASIL TEMUAN FUZZING
                                            │
         ┌──────────────────────────────────┼──────────────────────────────────┐
         ▼                                  ▼                                  ▼
   PATH / DIREKTORI                   FILE SENSITIF                      VHOST BARU
         │                                  │                                  │
         ├─► /admin atau /portal            ├─► /.git/ ditemukan               └─► dev.target.htb
         │   │                              │   │                                  │
         │   ├── HTTP 200 OK                │   └── Jalankan git-dumper            ├── Tambah ke /etc/hosts
         │   │   └─► Test Default Creds     │       Dapatkan full source code!     └── Ulangi Directory Fuzzing
         │   ├── HTTP 401 Unauthorized      │                                          dari awal pada vhost baru!
         │   │   └─► Hydra Basic Auth       ├─► /.env atau config.php.bak
         │   └── HTTP 403 Forbidden         │   │
         │       └─► Lanjut ke 403 Bypass   │   └── Baca DB credentials / API Key
         │                                  │       Tes password reuse di SSH!
         ├─► /api atau /api/v1              │
         │   │                              ├─► /backup.zip atau /db.sql
         │   ├── Cari /docs, /swagger.json  │   │
         │   └── Lanjut ke:                 │   └── Download dengan curl/wget
         │       [🔌 30 — API Security Workflow](/docs/api-security)│       Ekstrak offline (unzip/strings)
         │                                  │
         ├─► /upload atau /uploads          │
         │   │                              └─► /robots.txt atau /sitemap.xml
         │   ├── Test File Upload Bypass        │
         │   └── Lanjut ke:                     └── Catat Disallow path terlarang!
         │       [25 — File Upload Workflow](/docs/file-upload) │
         └─► NIHIL / TIDAK ADA TEMUAN MENARIK
             │
             ├── Tingkatkan Wordlist: directory-list-2.3-medium.txt
             ├── Tambahkan Ekstensi File: .php, .txt, .bak, .old, .zip
             ├── Jalankan VHost Fuzzing dengan bitquark wordlist
             └── Cek kembali Port Web lain (8080, 8443, 5000, 3000)
```

---

### 5.2 Katalog File dan Direktori Sensitif di CTF (25+ Path)

Simpan tabel ini sebagai referensi cepat saat menganalisis hasil scan. Jika Anda melihat salah satu path di bawah ini mengembalikan status `200 OK`, Anda memiliki peluang 80% untuk mendapatkan foothold!

| Path Sensitif | Makna & Relevansi Teknis | Tool Eksploitasi | Langkah Selanjutnya |
| :--- | :--- | :--- | :--- |
| `/.git/HEAD` | Source code repository Git terbuka untuk publik | `git-dumper`, `git-extractor` | Dump seluruh riwayat commit: `git-dumper http://target/.git/ ./git_dump` lalu cek `git log -p`. |
| `/.git/config` | File konfigurasi git (berisi URL remote & token) | `curl`, `wget` | Periksa branch internal, commit hash tersembunyi, atau kredensial webhook. |
| `/.env` | Konfigurasi environment (Laravel, Node, Docker) | `curl -s http://target/.env` | Ambil database password, `APP_KEY`, AWS Secret, token API pihak ketiga. |
| `/wp-config.php.bak` | Backup kredensial database WordPress | `curl`, `wget` | Baca user & password DB MySQL, login via MySQL port 3306 atau SSH. |
| `/config.php` | File konfigurasi PHP (sering kosong jika 200) | `ffuf` (cari `.bak`/`.old`) | Cari versi backupnya: `config.php.bak`, `config.php~`, `config.php.save`. |
| `/config.yml` / `.json` | Konfigurasi format YAML/JSON (Spring, Express) | Browser, `curl` | Periksa endpoint internal, secret session keys, connection strings. |
| `/.htpasswd` | Hash password user Apache Basic Auth | `john`, `hashcat` | Ambil hash MD5/Bcrypt/Crypt, crack menggunakan `rockyou.txt`. |
| `/backup.zip` / `.tar.gz`| Arsip backup source code atau database web | `wget`, `unzip`, `tar` | Download offline, gunakan `grep -ri "password" .` untuk berburu password. |
| `/db.sql` / `database.sql`| Database dump SQL mentah | `grep`, `mysql` | Cari hash password admin aplikasi, salt, atau kredensial plain text. |
| `/phpinfo.php` | Konfigurasi runtime PHP lengkap | Browser | Cek `disable_functions` (apakah system/exec aktif), `allow_url_include` (LFI), environment vars. |
| `/.DS_Store` | Metadata folder macOS (bocoran nama file rahasia)| `ds_store_exp`, `curl` | Ekstrak nama-nama file tersembunyi di dalam folder target. |
| `/web.config` | Konfigurasi IIS / ASP.NET Microsoft | `curl` | Dapatkan connection string database MSSQL dan settingan upload IIS. |
| `/robots.txt` | Petunjuk crawler mesin pencari | `curl -s http://target/robots.txt` | Periksa baris `Disallow:`, sering kali mengarah langsung ke path rahasia. |
| `/sitemap.xml` | Peta seluruh URL website | Browser | Petakan seluruh endpoint aplikasi yang tersembunyi dari navigasi UI. |
| `/crossdomain.xml` | Kebijakan Flash/Silverlight cross-domain | Browser | Analisis potensi insecure cross-domain policy bypass. |
| `/.svn/entries` | Metadata repository Subversion (SVN) | `svn-extractor` | Dump source code seperti halnya dump git. |
| `/WEB-INF/web.xml` | Deployment descriptor aplikasi Java (Tomcat) | LFI exploit / `curl` | Petakan servlet mapping, class file rahasia, dan auth constraints. |
| `/actuator` | Spring Boot Actuator endpoints overview | `curl` | Indikator aplikasi Spring Boot Java modern. |
| `/actuator/env` | Environment properties Spring Boot | `curl` | Membocorkan environment variables, kredensial Eureka, config server properties. |
| `/actuator/heapdump` | Memory dump Java JVM aktif | `jhat`, VisualVM, Eclipse MAT | Analisis file HPROF untuk mengekstrak plain text password di memory heap! |
| `/api/swagger.json` | Dokumentasi OpenAPI / Swagger API | Browser, Postman | Dapatkan dokumentasi lengkap parameter API tersembunyi, metode POST, dan schema. |
| `/api/v1/docs` | Dokumentasi Swagger UI interactive | Browser | Uji langsung endpoint API yang tidak terautentikasi melalui Swagger console. |
| `/server-status` | Apache Server Status page | Browser | Melihat URL dan IP yang sedang diakses pengguna lain secara real-time. |
| `/server-info` | Informasi detail modul server Apache | Browser | Fingerprint modul server Apache dan path file konfigurasi. |
| `/adminer.php` | Single-file database management tool | Browser | Tool GUI MySQL/Postgres. Sering rentan terhadap SSRF / Arbitrary DB connection. |
| `/phpmyadmin` | Portal manajemen MySQL | Browser | Coba kredensial `root:root`, `root:toor`, `root:password`, `root:<kosong>`. |
| `/.well-known/security.txt`| Kontak keamanan & policy vulnerability | Browser | Kadang berisi nama tim pengembang, scope, atau PGP public key. |
| `/Dockerfile` | Blueprint image Docker aplikasi | Browser, `curl` | Mengetahui base OS, dependency versi rentan, dan lokasi hardcoded secrets. |
| `/docker-compose.yml` | Konfigurasi orkestrasi container lokal | Browser, `curl` | Mengetahui nama internal service (db, redis, backend), network internal, dan env password. |

#### Panduan Instalasi & Ekstraksi Source Code dengan `git-dumper`:

Jika menemukan endpoint `/.git/` atau `/.git/HEAD` dengan status `HTTP 200 OK`:

```bash

# 1. Install git-dumper di Parrot OS via pip / git clone
pip3 install git-dumper

# Atau jika repo pip dibatasi, clone langsung dari GitHub:

# git clone https://github.com/arthaud/git-dumper.git /opt/git-dumper

# cd /opt/git-dumper && pip3 install -r requirements.txt

# sudo ln -s /opt/git-dumper/git-dumper.py /usr/local/bin/git-dumper

# 2. Dump seluruh isi repository .git yang terekspos ke folder lokal
git-dumper "http://${DOMAIN}/.git/" ./source_code/

# 3. Setelah dump selesai, masuk ke direktori dan analisis commit history
cd source_code/
git status
git log --oneline   # Ringkasan riwayat commit
git log -p          # Melihat seluruh perbedaan kode di setiap commit
git show HEAD       # Melihat commit terakhir developer

# 4. Berburu kredensial, token, dan API key yang pernah di-commit lalu dihapus
git log -p | grep -iE "password|secret|key|token|api"
```

```bash

# ============================================

# QUICK EXPLOIT: Setelah temukan file sensitif

# ============================================

# .env ditemukan → ambil dan parse
curl -s http://$DOMAIN/.env | grep -E "PASSWORD|SECRET|KEY|TOKEN|DB_"

# .git/HEAD ditemukan → dump source code
git-dumper http://$DOMAIN/.git/ ./git_dump/
cd git_dump && git log --oneline | head -20
git log -p | grep -iE "password|secret|key|api" | head -50

# backup.zip ditemukan → download dan search
wget http://$DOMAIN/backup.zip
unzip backup.zip -d ./backup_extracted/
grep -ri "password\|secret\|mysql\|db_pass" ./backup_extracted/ 2>/dev/null

# robots.txt → extract disallow paths
curl -s http://$DOMAIN/robots.txt | grep "Disallow" | awk '{print $2}'
```

---

### 5.3 HTTP Status Code Cheatsheet untuk Fuzzing

Pahami arti kode status dalam konteks fuzzing agar Anda tidak membuang waktu:

| Status Code | Nama Status | Arti & Tindakan Nyata Fuzzing |
| :---: | :--- | :--- |
| `200` | OK | Resource ADA dan bisa dibaca langsung. Buka segera! |
| `204` | No Content | Endpoint menerima request tapi body kosong (sering di API). |
| `301` | Moved Permanently | Direktori ada! Server mengarahkan ke trailing slash (`/dir/`). |
| `302` | Found (Redirect) | Redirect ke halaman login / portal. Periksa header `Location:`. |
| `307` | Temporary Redirect | Redirect sementara dengan mempertahankan metode HTTP. |
| `400` | Bad Request | Sintaks salah. Mungkin butuh header atau format JSON valid. |
| `401` | Unauthorized | Membutuhkan HTTP Basic Authentication (`user:password`). |
| `403` | Forbidden | File/Folder ADA tapi akses direct dilarang -> Wajib Bypass! |
| `404` | Not Found | Resource tidak ada (kecuali jika target Soft 404). |
| `405` | Method Not Allowed | Endpoint menolak GET. Coba ubah metode ke POST/PUT/OPTIONS. |
| `500` | Internal Server Error | Kode aplikasi crash / unhandled exception -> Cek error leak. |
| `503` | Service Unavailable | Server overload atau rate limit terpicu -> Kurangi threads! |

---

## 🛡️ BAGIAN 6: TEKNIK BYPASS PROTEKSI WEB

---

### 6.1 Bypass 403 Forbidden (Header, Path, Method, & FFUF Automation)

Menemukan status `403 Forbidden` pada folder penting seperti `/admin` **bukanlah jalan buntu**, melainkan konfirmasi bahwa folder tersebut memang ada! Web server atau reverse proxy (Nginx/HAProxy) hanya memblokir akses langsung.

Berikut adalah 3 metode utama untuk membobol proteksi 403:

#### 1. Header Manipulation (Memanipulasi Reverse Proxy):
Reverse proxy sering mempercayai header tertentu untuk menentukan apakah client berasal dari `localhost` (internal):

```bash

# Uji manual satu per satu menggunakan curl
TARGET_PATH="http://${DOMAIN}/admin"

# Header 1: X-Forwarded-For
curl -s -k -i -H "X-Forwarded-For: 127.0.0.1" "${TARGET_PATH}"

# Header 2: X-Real-IP
curl -s -k -i -H "X-Real-IP: 127.0.0.1" "${TARGET_PATH}"

# Header 3: X-Custom-IP-Authorization
curl -s -k -i -H "X-Custom-IP-Authorization: 127.0.0.1" "${TARGET_PATH}"

# Header 4: X-Forwarded-Host (Mengelabui virtual routing)
curl -s -k -i -H "X-Forwarded-Host: localhost" "${TARGET_PATH}"

# Header 5: X-Original-URL & X-Rewrite-URL (Bypass routing Nginx / AWS ALB)
curl -s -k -i -H "X-Original-URL: /admin" "http://${DOMAIN}/"
curl -s -k -i -H "X-Rewrite-URL: /admin" "http://${DOMAIN}/"
```

#### 2. Path Manipulation (Mengelabui Parser Path URL):
Trik ini memanfaatkan perbedaan cara web server dan framework mem-parsing tanda baca pada URL:

```bash

# Path Variation Checklist:
curl -s -k -i "http://${DOMAIN}/admin/"           # Trailing slash
curl -s -k -i "http://${DOMAIN}/admin/."          # Trailing dot
curl -s -k -i "http://${DOMAIN}/ADMIN"           # Case variation (Kapital)
curl -s -k -i "http://${DOMAIN}/Admin"           # Case variation (Title)
curl -s -k -i "http://${DOMAIN}/admin%20"         # URL Encoded Space
curl -s -k -i "http://${DOMAIN}/admin%09"         # URL Encoded Tab
curl -s -k -i "http://${DOMAIN}/admin%00"         # Null Byte
curl -s -k -i "http://${DOMAIN}/admin..;/"        # Semicolon dot dot (Tomcat bypass klasik)
curl -s -k -i "http://${DOMAIN}/admin;/index.php" # Semicolon trick
curl -s -k -i "http://${DOMAIN}/admin/./"         # Dot-slash
curl -s -k -i "http://${DOMAIN}//admin//"         # Double slash
curl -s -k -i "http://${DOMAIN}/./admin/."        # Current directory traversal
```

#### 3. HTTP Method Manipulation:
Jika web server dikonfigurasi dengan `<Limit GET>` di Apache, server hanya memblokir metode `GET`. Mengganti HTTP method dapat membypass aturan tersebut:

```bash

# Uji berbagai method HTTP
curl -s -k -i -X POST "http://${DOMAIN}/admin"
curl -s -k -i -X HEAD "http://${DOMAIN}/admin"
curl -s -k -i -X OPTIONS "http://${DOMAIN}/admin"
curl -s -k -i -X PUT "http://${DOMAIN}/admin"
curl -s -k -i -X TRACE "http://${DOMAIN}/admin"
curl -s -k -i -X PATCH "http://${DOMAIN}/admin"
```

#### FFUF Automation untuk 403 Header Bypass:
Otomatisasi seluruh proses bypass header dengan `ffuf`:

```bash

# 1. Buat wordlist header bypass lokal
cat << 'EOF' > headers_bypass.txt
X-Forwarded-For: 127.0.0.1
X-Forwarded-For: localhost
X-Real-IP: 127.0.0.1
X-Client-IP: 127.0.0.1
X-Remote-IP: 127.0.0.1
X-Remote-Addr: 127.0.0.1
X-Host: 127.0.0.1
X-Custom-IP-Authorization: 127.0.0.1
X-Forwarded-Host: localhost
X-Forwarded-Host: 127.0.0.1
EOF

# 2. Jalankan FFUF untuk menguji setiap header ke endpoint 403
ffuf -u "http://${DOMAIN}/admin" \
  -w headers_bypass.txt:HEADER \
  -H "HEADER" \
  -mc 200,302 \
  -c -v
```

---

### 6.2 Bypass 401 Unauthorized (Default Creds & Hydra Brute Force)

Status `401 Unauthorized` menandakan adanya **HTTP Basic Authentication** (jendela pop-up meminta username dan password).

#### Daftar Default Credentials Klasik di CTF:
- `admin:admin`
- `admin:password`
- `admin:admin123`
- `root:root`
- `root:toor`
- `guest:guest`
- `tomcat:s3cret` / `tomcat:tomcat`
- `test:test`

#### Uji Cepat dengan cURL:
```bash

# Mengirim Basic Auth menggunakan curl (-u username:password)
curl -s -i -u "admin:admin" "http://${DOMAIN}/admin/"
curl -s -i -u "admin:password" "http://${DOMAIN}/admin/"
```

#### Brute Force HTTP Basic Auth Menggunakan Hydra:
Jika default credentials gagal, gunakan `hydra` untuk brute force secara terarah:

```bash

# 1. Siapkan wordlist user kecil
cat << 'EOF' > users.txt
admin
root
administrator
webadmin
test
EOF

# 2. Serang Basic Auth dengan Hydra
hydra -L users.txt \
  -P /usr/share/wordlists/rockyou.txt \
  ${DOMAIN} \
  http-get /admin/ \
  -t 16 \
  -V
```

---

## 🔬 BAGIAN 7: ADVANCED TECHNIQUES

---

### 7.1 Parameter Fuzzing (Arjun & FFUF)

Sering kali Anda menemukan file yang tampak kosong atau tidak menghasilkan respons apa pun (misal `index.php` atau `debug.php` dengan ukuran 0 byte). File tersebut biasanya menunggu input parameter query string (misal `?debug=true` atau `?page=home` atau `?cmd=id`).

#### Tool 1: Arjun — The Automatic Parameter Discovery
`arjun` adalah tool Python canggih yang dirancang khusus untuk memburu parameter HTTP yang tersembunyi.

```bash

# Cara Install Arjun yang Paling Andal (pip3 / git):
pip3 install arjun

# Atau instalasi manual dari GitHub jika pip dibatasi:

# git clone https://github.com/s0md3v/Arjun.git /opt/arjun

# cd /opt/arjun && pip3 install -r requirements.txt

# sudo ln -s /opt/arjun/arjun.py /usr/local/bin/arjun

# Verifikasi instalasi arjun
arjun --help

# 1. Temukan parameter GET tersembunyi
arjun -u "http://${DOMAIN}/debug.php" -m GET

# 2. Temukan parameter POST tersembunyi
arjun -u "http://${DOMAIN}/api/action" -m POST -oJ params_found.json
```

#### Tool 2: Parameter Fuzzing Menggunakan FFUF:
Jika ingin menggunakan `ffuf` untuk parameter hunting:

```bash

# Fuzzing nama parameter GET
ffuf -u "http://${DOMAIN}/debug.php?FUZZ=test" \
  -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
  -fs 0 \
  -c -mc 200
```

---

### 7.2 Custom Wordlist Generator dengan CeWL

Target enterprise atau CTF bertema sering kali menggunakan nama direktori yang berhubungan dengan nama perusahaan, nama proyek, atau nama staf internal yang **tidak ada** di wordlist umum. `cewl` akan meng-crawl website target dan mengekstrak semua kata unik menjadi wordlist kustom.

```bash

# 1. Install cewl di Parrot OS (biasanya sudah pre-installed)
sudo apt install cewl -y

# 2. Generate wordlist dengan kedalaman crawl 2, minimal panjang kata 5 karakter
cewl -d 2 -m 5 -w cewl_wordlist.txt "http://${DOMAIN}/"

# 3. Ubah semua kata menjadi huruf kecil (lowercase) untuk konsistensi Linux
tr '[:upper:]' '[:lower:]' < cewl_wordlist.txt | sort -u > custom_dirs.txt

# 4. Gabungkan dengan wordlist umum menggunakan ffuf
ffuf -u "http://${DOMAIN}/FUZZ" -w custom_dirs.txt -c
```

---

### 7.3 Fuzzing di Balik Autentikasi (Cookie & Bearer Token)

Setelah Anda berhasil login ke aplikasi web target, Anda harus mem-fuzzing area internal pengguna (authenticated area) untuk menemukan menu admin tersembunyi.

> [!NOTE]
> **Koreksi Teknis Flag Cookie FFUF:**
> Di `ffuf`, untuk menyertakan cookie Anda dapat menggunakan flag `-b` (shorthand cookie data) atau header `-H "Cookie: ..."`.
> **JANGAN** gunakan flag `-C` untuk cookie! Pada `ffuf`, flag `-C` adalah singkatan dari `--config` (memuat file konfigurasi), bukan cookie.

#### Menggunakan Header Cookie Session:
```bash

# Opsi 1: Menggunakan flag -b (Cookie shorthand resmi FFUF)
ffuf -u "http://${DOMAIN}/internal/FUZZ" \
  -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-small.txt \
  -b "PHPSESSID=d9a8c7b6e5f4a3b2c1d0e9f8a7b6c5d4; session=user_logged_in" \
  -c

# Opsi 2: Menggunakan header -H "Cookie: ..."
ffuf -u "http://${DOMAIN}/internal/FUZZ" \
  -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-small.txt \
  -H "Cookie: PHPSESSID=d9a8c7b6e5f4a3b2c1d0e9f8a7b6c5d4; session=user_logged_in" \
  -c
```

#### Menggunakan Authorization Bearer Token (JWT / API):
```bash

# Fuzzing API endpoint internal dengan JWT Bearer Token
ffuf -u "http://${DOMAIN}/api/v2/FUZZ" \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -c
```

---

### 7.4 Fuzzing HTTPS dengan Self-Signed Certificate

Hampir semua box HackTheBox dengan port 443 menggunakan sertifikat SSL self-signed palsu. Tanpa flag yang tepat, tool fuzzing Anda akan langsung crash dengan error `x509: certificate signed by unknown authority`.

Solusi: Gunakan flag `-k` (*insecure*) di semua tool:

```bash

# FFUF dengan HTTPS dan skip verifikasi sertifikat (-k)
ffuf -u "https://${DOMAIN}/FUZZ" \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -k \
  -c

# Gobuster dengan skip SSL (-k)
gobuster dir -u "https://${DOMAIN}/" \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -k
```

---

### 7.5 Routing Fuzzing Melalui Proxy Burp Suite

Kadang Anda ingin melihat request spesifik apa yang dikirim fuzzer ke server, atau menyimpan riwayat scan ke dalam HTTP History Burp Suite.

Gunakan flag `-x` pada `ffuf`:

```bash

# Route ffuf ke Burp Suite Proxy (127.0.0.1:8080)
ffuf -u "http://${DOMAIN}/FUZZ" \
  -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -x http://127.0.0.1:8080 \
  -t 10 \
  -k
```

*Peringatan Kinerja:* Kurangi thread menjadi `10` saat me-route ke Burp Suite agar Burp Suite tidak freeze akibat menangani ribuan request per detik!

---

## 🤖 BAGIAN 8: AUTOMATION SCRIPTS SIAP PAKAI

Semua skrip di bawah ini dirancang dan diuji khusus untuk terminal bash Parrot OS XFCE. Skrip dapat langsung disalin dan dijalankan.

---

### 8.1 Script 1: `autofuzz.sh` (Directory Discovery Suite)

Skrip ini mengotomatisasi pengecekan baseline 404, meluncurkan quick scan, menampilkan temuan penting, dan menawarkan opsi untuk melanjutkan ke deep scan tanpa mematikan sesi Anda.

```bash

#!/usr/bin/env bash

# ==============================================================================

# Script Name   : autofuzz.sh

# Description   : Automated Directory & Sensitive File Discovery Suite

# Author        : Cyber Security Field Specialist

# Platform      : Parrot OS / Debian CLI

# ==============================================================================

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}        AUTO-FUZZ DIRECTORY DISCOVERY SUITE        ${NC}"
echo -e "${BLUE}====================================================${NC}"

if [ -z "$1" ]; then
    echo -e "${RED}[!] Error: Target URL tidak dispesifikasikan.${NC}"
    echo -e "${YELLOW}Usage : ./autofuzz.sh <TARGET_URL>${NC}"
    echo -e "Contoh: ./autofuzz.sh http://target.htb"
    exit 1
fi

TARGET_URL="$1"
OUTPUT_DIR="./fuzz_results_$(date +%Y%m%d_%H%M%S)"
mkdir -p "${OUTPUT_DIR}"

WORDLIST_SMALL="/usr/share/seclists/Discovery/Web-Content/common.txt"
WORDLIST_MEDIUM="/usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt"

# 1. Verifikasi Ketersediaan Wordlist
if [ ! -f "$WORDLIST_SMALL" ]; then
    echo -e "${RED}[!] Error: SecLists tidak ditemukan di /usr/share/seclists/!${NC}"
    echo -e "${YELLOW}[*] Install dengan: sudo apt install seclists -y${NC}"
    exit 1
fi

# 2. Cek Baseline 404 Response
echo -e "\n${CYAN}[*] Langkah 1: Mengukur baseline respons error 404...${NC}"
RAND_PATH=$(tr -dc a-z0-9 </dev/urandom | head -c 16)
BASELINE_FILE="${OUTPUT_DIR}/baseline_test.txt"

curl -s -k -i "${TARGET_URL}/${RAND_PATH}" > "${BASELINE_FILE}"
SIZE_404=$(wc -c < "${BASELINE_FILE}" | tr -d ' ')
CODE_404=$(head -n 1 "${BASELINE_FILE}" | awk '{print $2}')

echo -e "${GREEN}[+] Status Code Path Acak : ${CODE_404}${NC}"
echo -e "${GREEN}[+] Ukuran Respons Baseline: ${SIZE_404} bytes${NC}"

FILTER_FLAG=""
if [ "$CODE_404" == "200" ] || [ "$CODE_404" == "302" ]; then
    echo -e "${YELLOW}[!] PERINGATAN: Target menggunakan Soft 404! Mengaktifkan filter -fs ${SIZE_404}${NC}"
    FILTER_FLAG="-fs ${SIZE_404}"
else
    FILTER_FLAG="-fc 404"
fi

# 3. Jalankan Quick Scan (common.txt)
echo -e "\n${CYAN}[*] Langkah 2: Menjalankan Quick Scan (common.txt)...${NC}"
ffuf -u "${TARGET_URL}/FUZZ" \
    -w "${WORDLIST_SMALL}" \
    ${FILTER_FLAG} \
    -c -ic -t 50 \
    -o "${OUTPUT_DIR}/quick_scan.json" \
    -of json

echo -e "\n${GREEN}[+] Ringkasan Temuan Penting Quick Scan:${NC}"
if command -v jq &> /dev/null; then
    jq -r '.results[] | select(.status == 200 or .status == 301 or .status == 403) | "[\(.status)] \t \(.length) bytes \t \(.url)"' "${OUTPUT_DIR}/quick_scan.json" | sort -u
fi

# 4. Konfirmasi untuk Full Scan
echo -e "\n${YELLOW}----------------------------------------------------${NC}"
read -p "[?] Apakah Anda ingin melanjutkan ke Full Scan (medium.txt + ekstensi)? [y/N]: " PROCEED
if [[ "$PROCEED" =~ ^[Yy]$ ]]; then
    echo -e "\n${CYAN}[*] Menjalankan Full Directory Scan di background...${NC}"
    ffuf -u "${TARGET_URL}/FUZZ" \
        -w "${WORDLIST_MEDIUM}" \
        -e .php,.html,.txt,.js,.json,.bak \
        ${FILTER_FLAG} \
        -c -ic -t 60 \
        -o "${OUTPUT_DIR}/full_scan.json" \
        -of json > "${OUTPUT_DIR}/full_scan.log" 2>&1 &

    PID=$!
    echo -e "${GREEN}[+] Full scan berjalan di background dengan PID: ${PID}${NC}"
    echo -e "${GREEN}[+] Log file: ${OUTPUT_DIR}/full_scan.log${NC}"
    echo -e "${CYAN}[*] Pantau progres dengan: tail -f ${OUTPUT_DIR}/full_scan.log${NC}"
else
    echo -e "${BLUE}[*] Full scan dilewati. Hasil tersimpan di: ${OUTPUT_DIR}${NC}"
fi
```

---

### 8.2 Script 2: `vhost_discover.sh` (VHost Hunter & Host Updater)

Skrip ini mem-fuzzing vhost, menyaring respons baseline secara otomatis, dan langsung menawarkan pembaruan `/etc/hosts` jika vhost baru ditemukan.

```bash

#!/usr/bin/env bash

# ==============================================================================

# Script Name   : vhost_discover.sh

# Description   : Automated VHost Discovery & /etc/hosts Updater

# Author        : Cyber Security Field Specialist

# Platform      : Parrot OS / Debian CLI

# ==============================================================================

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}          AUTOMATED VHOST HUNTER & UPDATER          ${NC}"
echo -e "${BLUE}====================================================${NC}"

if [ "$#" -ne 2 ]; then
    echo -e "${RED}[!] Error: Parameter tidak lengkap.${NC}"
    echo -e "${YELLOW}Usage : ./vhost_discover.sh <TARGET_IP> <BASE_DOMAIN>${NC}"
    echo -e "Contoh: ./vhost_discover.sh 10.10.11.120 target.htb"
    exit 1
fi

TARGET_IP="$1"
BASE_DOMAIN="$2"
WORDLIST="/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"
TMP_DIR="./vhost_results_$(date +%Y%m%d_%H%M%S)"
mkdir -p "${TMP_DIR}"

# 1. Verifikasi Wordlist
if [ ! -f "$WORDLIST" ]; then
    echo -e "${RED}[!] Error: Wordlist $WORDLIST tidak ditemukan.${NC}"
    exit 1
fi

# 2. Ukur Baseline Respons untuk Host Acak
echo -e "\n${CYAN}[*] Mengukur baseline respon untuk virtual host acak...${NC}"
RAND_HOST="random-dummy-test-$(tr -dc a-z0-9 </dev/urandom | head -c 8).${BASE_DOMAIN}"
BASELINE_VHOST_FILE="${TMP_DIR}/baseline_vhost.txt"

curl -s -i -H "Host: ${RAND_HOST}" "http://${TARGET_IP}/" > "${BASELINE_VHOST_FILE}"
BASELINE_SIZE=$(wc -c < "${BASELINE_VHOST_FILE}" | tr -d ' ')

echo -e "${GREEN}[+] Baseline Response Size: ${BASELINE_SIZE} bytes${NC}"
echo -e "${CYAN}[*] Memulai FFUF VHost scan (menyaring size: ${BASELINE_SIZE})...${NC}"

# 3. Jalankan FFUF
RESULT_JSON="${TMP_DIR}/vhosts.json"
ffuf -u "http://${TARGET_IP}/" \
    -H "Host: FUZZ.${BASE_DOMAIN}" \
    -w "${WORDLIST}" \
    -fs "${BASELINE_SIZE}" \
    -c -ic -t 50 \
    -o "${RESULT_JSON}" \
    -of json

# 4. Evaluasi Hasil Temuan
if [ -f "$RESULT_JSON" ] && command -v jq &> /dev/null; then
    FOUND_VHOSTS=$(jq -r '.results[].input.FUZZ' "$RESULT_JSON" | sort -u)

    if [ -n "$FOUND_VHOSTS" ]; then
        echo -e "\n${GREEN}[!] VHOST BARU DITEMUKAN:${NC}"
        NEW_ENTRIES=""
        for vhost in $FOUND_VHOSTS; do
            FULL_VHOST="${vhost}.${BASE_DOMAIN}"
            echo -e "${GREEN}  -> ${FULL_VHOST}${NC}"
            NEW_ENTRIES="${NEW_ENTRIES} ${FULL_VHOST}"
        done

        echo -e "\n${YELLOW}----------------------------------------------------${NC}"
        read -p "[?] Tambahkan vhost di atas ke /etc/hosts otomatis? [y/N]: " ADD_HOSTS
        if [[ "$ADD_HOSTS" =~ ^[Yy]$ ]]; then
            # Cek apakah IP target sudah ada di /etc/hosts
            if grep -q "${TARGET_IP}" /etc/hosts; then
                sudo sed -i "/${TARGET_IP}/ s/$/${NEW_ENTRIES}/" /etc/hosts
            else
                echo -e "${TARGET_IP}\t${BASE_DOMAIN}${NEW_ENTRIES}" | sudo tee -a /etc/hosts
            fi
            echo -e "${GREEN}[+] /etc/hosts berhasil diperbarui!${NC}"
            grep "${TARGET_IP}" /etc/hosts
        fi
    else
        echo -e "\n${YELLOW}[*] Tidak ditemukan VHost baru yang berbeda dari baseline.${NC}"
    fi
fi
```

---

### 8.3 One-Liner Pipeline Berguna

Simpan one-liner ini untuk mempercepat manipulasi data di terminal Parrot OS:

```bash

# 1. Ekstrak seluruh URL berstatus 200 OK dari hasil JSON ffuf
jq -r '.results[] | select(.status == 200) | .url' ffuf_output.json | sort -u > live_urls_200.txt

# 2. Urutkan temuan ffuf berdasarkan ukuran byte terkecil ke terbesar
jq -r '.results[] | "\(.length)\t\(.status)\t\(.url)"' ffuf_output.json | sort -n

# 3. Validasi seluruh direktori temuan ffuf dengan HTTPX untuk mengekstrak Title & Web Server
jq -r '.results[].url' ffuf_output.json | httpx -title -status-code -tech-detect -silent

# 4. Mengubah output JSON FFUF menjadi daftar URL bersih untuk tool lain (Burp / ZAP)
jq -r '.results[].url' ffuf_output.json | tr ' ' '\n' > clean_target_list.txt
```

---

## ⚠️ BAGIAN 9: COMMON ERRORS & TROUBLESHOOTING (12 SKENARIO NYATA)

Berikut adalah 12 masalah yang paling sering dihadapi saat melakukan fuzzing di HackTheBox, TryHackMe, atau pentest riil, beserta solusi konkretnya:

| No | Masalah / Pesan Error | Solusi Tindakan Konkret |
| :---: | :--- | :--- |
| 1 | Rate Limit / HTTP 429 Too Many Req | Tambahkan rate limiting: `-rate 20` atau `-t 5`. |
| 2 | WAF Memblokir IP / HTTP 403 Massal | Ubah User-Agent (`-H "User-Agent: Mozilla/5.0..."`). |
| 3 | Wildcard Response (Semua status 200) | Gunakan filter ukuran (`-fs <SIZE>`) atau kata (`-fw`). |
| 4 | Fuzzing Sangat Lambat (< 50 req/sec) | Naikkan thread (`-t 80`), nonaktifkan proxy (`-x`). |
| 5 | ffuf Crash / 'Out of Memory' (OOM) | Turunkan thread (`-t 30`), gunakan wordlist lebih kecil. |
| 6 | Redirect Loop (301 bolak-balik) | Hapus flag `-r`, filter status 301 dengan `-fc 301`. |
| 7 | SSL Error: certificate signed unknown | Tambahkan flag `-k` (Insecure / skip TLS verification). |
| 8 | Target Hanya Merespons UA Tertentu | Set custom User-Agent via `-H "User-Agent: TargetApp"`. |
| 9 | VHost Tidak Bisa Dibuka Pasca `/etc/hosts` | Cek apakah service jalan di HTTPS port 443 (`-k`). |
| 10 | File Output Kosong (`-o` tidak simpan) | Pastikan format output diset eksplisit: `-of json`. |
| 11 | Wordlist Path Tidak Ditemukan | Pastikan paket seclists terinstall via `sudo apt install seclists`. |
| 12 | Seluruh Request Mengalami Timeout | Naikkan timeout (`-timeout 20`), cek koneksi VPN lab! |

### Detail Solusi Masalah Kritis:

#### 1. Masalah: Wildcard Response (Semua Kata Menghasilkan HTTP 200 OK)
- **Gejala**: `ffuf` menemukan ribuan file dalam 2 detik dengan ukuran identik.
- **Penyebab**: Server web menangani halaman yang tidak ada dengan merender `index.html` (Single Page Application seperti React/Vue) atau custom 404 page tanpa mengirimkan status 404.
- **Solusi**:
  1. Hentikan scan segera (`Ctrl + C`).
  2. Perhatikan nilai kolom `Size`, `Words`, atau `Lines` yang selalu berulang (misal: `Size: 4521`).
  3. Jalankan kembali scan dengan menambahkan filter:
     ```bash
     ffuf -u http://target.htb/FUZZ -w wordlist.txt -fs 4521
     ```

#### 2. Masalah: WAF Memblokir Fuzzing (Cloudflare, ModSecurity, fail2ban)
- **Gejala**: Pada 10 detik pertama scan normal, tiba-tiba semua request menghasilkan `403 Forbidden` atau koneksi di-reset (`Connection reset by peer`).
- **Solusi**:
  1. Ganti User-Agent bawaan tool (`ffuf` / `gobuster`) yang sering di-blacklist WAF:
     ```bash
     ffuf -u http://target.htb/FUZZ -w wordlist.txt \
       -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0"
     ```
  2. Batasi kecepatan request per detik agar tidak memicu fail2ban:
     ```bash
     ffuf -u http://target.htb/FUZZ -w wordlist.txt -rate 15 -t 5
     ```

#### 3. Masalah: VHost Tidak Bisa Diakses Setelah Mengedit `/etc/hosts`
- **Gejala**: `ffuf` menemukan `dev.target.htb`, Anda sudah menambahkannya ke `/etc/hosts`, tetapi browser menampilkan `Server Not Found` atau `Connection Refused`.
- **Solusi**:
  1. Flush DNS cache lokal di Parrot OS:
     ```bash
     sudo systemd-resolve --flush-caches
     ```
  2. Periksa apakah target sebenarnya berjalan di atas **HTTPS (Port 443)** dan bukan HTTP biasa:
     ```bash
     curl -k -I https://dev.target.htb/
     ```

---

## 📋 BAGIAN 10: CHEATSHEET AKHIR & MUSCLE MEMORY

Salin dan tempel perintah-perintah di bawah ini ke terminal Anda. Pastikan variabel `$TARGET` dan `$DOMAIN` sudah didefinisikan sebelumnya (`export TARGET="10.10.11.120"`, `export DOMAIN="target.htb"`).

---

### FFUF One-Liners

```bash

# 1. Quick Directory Scan (Cepat & Ringan)
ffuf -u "http://${DOMAIN}/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -c -ic

# 2. Full Directory Scan dengan Ekstensi PHP
ffuf -u "http://${DOMAIN}/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -e .php -c -ic -t 60

# 3. Full Directory Scan Multi-Ekstensi
ffuf -u "http://${DOMAIN}/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -e .php,.html,.txt,.js,.json,.bak -c -ic -t 60

# 4. Virtual Host (VHost) Fuzzing
ffuf -u "http://${TARGET}/" -H "Host: FUZZ.${DOMAIN}" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs <SIZE_BASELINE> -c -ic

# 5. Subdomain Fuzzing (DNS Mode)
ffuf -u "http://FUZZ.${DOMAIN}/" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -c -ic

# 6. Parameter GET Fuzzing
ffuf -u "http://${DOMAIN}/index.php?FUZZ=test" -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -fs 0 -c

# 7. Parameter POST Fuzzing
ffuf -u "http://${DOMAIN}/api/login" -X POST -d "FUZZ=admin" -H "Content-Type: application/x-www-form-urlencoded" -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -c

# 8. Sensitive Files Hunting (.env, .git, backups)
ffuf -u "http://${DOMAIN}/FUZZ" -w sensitive_targets.txt -mc 200,301,302,403 -c

# 9. 403 Forbidden Header Bypass Fuzzing
ffuf -u "http://${DOMAIN}/admin" -w headers_bypass.txt:HEADER -H "HEADER" -mc 200,302 -c

# 10. Fuzzing dengan Cookie Autentikasi
ffuf -u "http://${DOMAIN}/admin/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -b "PHPSESSID=session_value_here" -c

# 11. Fuzzing dengan JWT Bearer Token
ffuf -u "http://${DOMAIN}/api/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -H "Authorization: Bearer <TOKEN>" -c

# 12. Recursive Fuzzing Otomatis
ffuf -u "http://${DOMAIN}/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -recursion -recursion-depth 2 -c

# 13. Simpan Output Lengkap ke JSON
ffuf -u "http://${DOMAIN}/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -o scan_result.json -of json
```

---

### Gobuster One-Liners

```bash

# 1. Directory Scan Standar
gobuster dir -u "http://${DOMAIN}/" -w /usr/share/seclists/Discovery/Web-Content/common.txt -t 40 -b 404 --no-error

# 2. Directory Scan dengan Ekstensi
gobuster dir -u "http://${DOMAIN}/" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -x php,txt,bak -t 40 -b 404

# 3. Virtual Host Fuzzing
gobuster vhost -u "http://${DOMAIN}/" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain -t 40

# 4. Subdomain DNS Bruteforce
gobuster dns -d "${DOMAIN}" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -t 30
```

---

### Feroxbuster One-Liners

```bash

# 1. Rekursif Scan Cepat Otomatis
feroxbuster -u "http://${DOMAIN}/" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-small.txt -x php,txt -d 2

# 2. Targeted Scan dengan Filter Status & Size
feroxbuster -u "http://${DOMAIN}/" -w /usr/share/seclists/Discovery/Web-Content/common.txt -C 404,403 -S 1420

# 3. Scan Melalui Burp Suite Proxy
feroxbuster -u "http://${DOMAIN}/" -w /usr/share/seclists/Discovery/Web-Content/common.txt --burp -k
```

---

### Wordlist Quick Reference Table

| Situasi & Kebutuhan Pengujian             | Wordlist yang Direkomendasikan      | Lokasi Path di Parrot OS / Kali Linux                                     |
| :---------------------------------------- | :---------------------------------- | :------------------------------------------------------------------------ |
| **Initial Quick Check (10 detik)**        | `common.txt`                        | `/usr/share/seclists/Discovery/Web-Content/common.txt`                    |
| **Standard CTF Directory Fuzzing**        | `directory-list-2.3-medium.txt`     | `/usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt` |
| **VHost / Subdomain Discovery (Cepat)**   | `subdomains-top1million-5000.txt`   | `/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt`       |
| **VHost / Subdomain Discovery (Lengkap)** | `bitquark-subdomains-top100000.txt` | `/usr/share/seclists/Discovery/DNS/bitquark-subdomains-top100000.txt`     |
| **File Backup & Source Code Leak**        | `raft-large-files.txt`              | `/usr/share/seclists/Discovery/Web-Content/raft-large-files.txt`          |
| **Parameter Fuzzing (GET / POST)**        | `burp-parameter-names.txt`          | `/usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt`      |
| **API Endpoints Discovery**               | `common-api-endpoints.txt`          | `/usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt`         |

---

# 6. Directory & Virtual Host (VHost) Fuzzing Workflow — Interactive Decision Guide

> **Panduan Penggunaan:** Setiap tahapan dilengkapi dengan **COMMAND**, **OUTPUT BERHASIL ✅**, **OUTPUT GAGAL/BERBEDA ❌**, serta **TINDAKAN LANJUTAN**. Jangan melewati langkah kalibrasi baseline (Fase 1) agar hasil scan tidak tertutup false positive.

---

## 🔧 PRE-FLIGHT: Setup Environment & Variabel Target

Jalankan perintah ini satu kali di awal sesi terminal untuk memastikan standarisasi path dan variabel.

Bash

```
# Inisialisasi variabel target
export TARGET_IP="10.10.11.120"
export DOMAIN="target.htb"
export PROTO="http"                  # Ganti https jika menggunakan SSL/TLS
export BASE_URL="${PROTO}://${DOMAIN}"
export PORT="80"                     # Sesuaikan jika web berjalan di 8080, 5000, 3000, dll.

# Buat direktori output terstruktur
mkdir -p ~/fuzzing_loot/${DOMAIN}/{dirs,vhosts,sensitive,logs}
cd ~/fuzzing_loot/${DOMAIN}

echo "[*] Target: ${BASE_URL} (IP: ${TARGET_IP}) | Workspace: $(pwd)"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Target: http://target.htb (IP: 10.10.11.120) | Workspace: /home/parrot/fuzzing_loot/target.htb
```

---

## ═══════════════════════════════════════

## FASE 0: VERIFIKASI KONEKSI & RESOLUSI DNS

## ═══════════════════════════════════════

### Langkah 0.1 — Validasi Mapping `/etc/hosts`

Sebelum melakukan fuzzing domain atau vhost, pastikan OS mengenali hostname target.

Bash

```
# Command 1: Cek apakah domain sudah dipetakan
grep -E "${DOMAIN}" /etc/hosts
```

**OUTPUT BERHASIL ✅ — Hostname sudah ada:**

text

```
10.10.11.120    target.htb
```

➡️ Lanjut ke **Langkah 0.2**.

**OUTPUT GAGAL ❌ — Output kosong (belum terdaftar):**

text

```
(tidak ada output)
```

➡️ **Solusi:** Daftarkan IP dan Domain ke `/etc/hosts`:

Bash

```
echo -e "${TARGET_IP}\t${DOMAIN}" | sudo tee -a /etc/hosts
ping -c 1 ${DOMAIN}
```

---

### Langkah 0.2 — Fast Web Service Header Inspection

Bash

```
# Command 1: Ambil respon header mentah untuk fingerprint server
curl -s -I -k "${BASE_URL}/"
```

**OUTPUT BERHASIL ✅ — Web Server Merespons:**

http

```
HTTP/1.1 200 OK
Date: Mon, 15 Jan 2024 10:00:00 GMT
Server: Apache/2.4.52 (Ubuntu)
X-Powered-By: PHP/8.1.2
Content-Type: text/html; charset=UTF-8
Content-Length: 4521
```

**Cara membaca output:**

- `Server: Apache/2.4.52`: Sistem operasi kemungkinan Linux. Ekstensi relevan: `.php`, `.conf`, `.bak`, `.tar.gz`.
- `Server: Microsoft-IIS/10.0`: Sistem operasi Windows. Ekstensi relevan: `.asp`, `.aspx`, `.config`, `.txt`. Tidak case-sensitive.
- `X-Powered-By: Express`: Node.js framework. Endpoint biasanya RESTful tanpa ekstensi file statis.

**OUTPUT GAGAL ❌ — Connection Refused / Timeout:**

text

```
curl: (7) Failed to connect to target.htb port 80: Connection refused
```

➡️ **Solusi:**

1. Cek port HTTPS: `curl -s -I -k "https://${DOMAIN}/"`
2. Periksa port non-standar melalui Nmap: `nmap -sV -Pn -p 80,443,8000,8080,8443,5000,3000 ${TARGET_IP}`
3. Update variabel `PORT` dan `PROTO` sesuai port yang aktif.

---

## ═══════════════════════════════════════

## FASE 1: KALIBRASI BASELINE & DETEKSI SOFT-404

## ═══════════════════════════════════════

> **PENTING:** Banyak web server modern mengembalikan custom error 404 dengan status HTTP 200 OK (Soft-404) atau 302 redirect. Tanpa mengukur respon baseline, fuzzer akan membanjiri output dengan false positive.

### Langkah 1.1 — Pengukuran Respon Halaman Fiktif

Bash

```
# Generate path acak yang dipastikan tidak ada di server
RANDOM_PATH=$(tr -dc a-z0-9 </dev/urandom | head -c 16)
echo "[*] Menguji path: ${BASE_URL}/${RANDOM_PATH}"

# Ambil metadata respon
curl -s -i -k "${BASE_URL}/${RANDOM_PATH}" > ./logs/baseline_404.txt

# Ekstrak Status Code, Ukuran (Bytes), Jumlah Kata (Words), dan Baris (Lines)
STATUS_404=$(head -n 1 ./logs/baseline_404.txt | awk '{print $2}')
SIZE_404=$(wc -c < ./logs/baseline_404.txt | tr -d ' ')
WORDS_404=$(wc -w < ./logs/baseline_404.txt | tr -d ' ')
LINES_404=$(wc -l < ./logs/baseline_404.txt | tr -d ' ')

echo "[+] Hasil Baseline -> Status: ${STATUS_404} | Size: ${SIZE_404} bytes | Words: ${WORDS_404} | Lines: ${LINES_404}"
```

**OUTPUT BERHASIL ✅ (Kasus Standar — Normal 404):**

text

```
[+] Hasil Baseline -> Status: 404 | Size: 275 bytes | Words: 21 | Lines: 10
```

➡️ **Keputusan Filter:** Target menggunakan respon standar. Cukup gunakan filter `-fc 404` pada fuzzer.

**OUTPUT BERBEDA ⚠️ (Kasus Soft-404 — Status 200/302 pada path fiktif):**

text

```
[+] Hasil Baseline -> Status: 200 | Size: 1420 bytes | Words: 85 | Lines: 24
```

➡️ **Keputusan Filter:** Target menggunakan Soft-404. **WAJIB** menyaring ukuran response byte: gunakan opsi `-fs ${SIZE_404}` atau `-fw ${WORDS_404}`. Jika tidak difilter, semua kata dalam wordlist akan dianggap temuan valid.

---

## ═══════════════════════════════════════

## FASE 2: OSINT & PASSIVE CONTENT DISCOVERY

## ═══════════════════════════════════════

> Memanfaatkan sumber publik untuk mengumpulkan path dan endpoint yang pernah terindeks tanpa mengirim trafik fuzzing masif.

### Langkah 2.1 — Query Historical Endpoints (Wayback Machine & Gau)

Bash

```
# Command 1: Ekstrak endpoint pasif melalui Wayback Machine
curl -s "http://web.archive.org/cdx/search/cdx?url=${DOMAIN}/*&output=text&fl=original" \
    | sort -u > ./dirs/passive_endpoints.txt

# Command 2: Jika terinstall tool gau (GetAllUrls)
gau --subs ${DOMAIN} >> ./dirs/passive_endpoints.txt 2>/dev/null

head -n 20 ./dirs/passive_endpoints.txt
```

**OUTPUT BERHASIL ✅ — Menemukan riwayat endpoint:**

text

```
http://target.htb/admin/login.php
http://target.htb/api/v1/users
http://target.htb/old_site/backup.sql
http://target.htb/dev/test.php
```

➡️ **Tindakan:** Masukkan temuan ini langsung ke file verifikasi manual dan targeted scan.

**OUTPUT GAGAL ❌ — Tidak ada data historis:**

text

```
(file kosong / respon 0 baris)
```

➡️ **Analisis:** Mesin CTF atau aplikasi internal biasanya tidak terindeks oleh web archive. Lewati fase ini dan langsung ke **Fase 3**.

---

## ═══════════════════════════════════════

## FASE 3: RAPID DIRECTORY SCAN (INITIAL MAPPING)

## ═══════════════════════════════════════

Tujuan: Memetakan direktori utama target dalam waktu 10-30 detik menggunakan wordlist berukuran kecil (`common.txt`).

### Langkah 3.1 — Fast Scan dengan FFUF

Bash

```
# Jalankan FFUF dengan auto-calibration atau filter eksplisit
ffuf -u "${BASE_URL}/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/common.txt \
    -fc 404 \
    -c -ic \
    -t 50 \
    -o ./dirs/quick_scan.json -of json
```

**OUTPUT BERHASIL ✅ — Direktori terdeteksi:**

text

```
.hta                    [Status: 403, Size: 277, Words: 20, Lines: 10, Duration: 23ms]
admin                   [Status: 301, Size: 312, Words: 20, Lines: 10, Duration: 28ms]
api                     [Status: 301, Size: 310, Words: 20, Lines: 10, Duration: 22ms]
images                  [Status: 301, Size: 313, Words: 20, Lines: 10, Duration: 25ms]
index.html              [Status: 200, Size: 4521, Words: 312, Lines: 85, Duration: 21ms]
robots.txt              [Status: 200, Size: 85, Words: 7, Lines: 4, Duration: 20ms]
server-status           [Status: 403, Size: 277, Words: 20, Lines: 10, Duration: 22ms]
```

**Tindakan Berdasarkan Hasil:**

- **`robots.txt` (200 OK):** Segera baca isinya:
    
    Bash
    
    ```
    curl -s "${BASE_URL}/robots.txt"
    ```
    
- **`/admin` (301/302 Redirect):** Target utama. Catat untuk eksplorasi autentikasi.
- **`/api` (301/200):** Indikator endpoint REST API. Buka di browser atau siapkan wordlist API.
- **`/server-status` (403):** Apache status page terproteksi (default behavior). Abaikan untuk sementara.

**OUTPUT GAGAL ❌ — Terjebak Wildcard (Ribuan 200 OK identik):**

text

```
test1                   [Status: 200, Size: 1420, Words: 85, Lines: 24]
test2                   [Status: 200, Size: 1420, Words: 85, Lines: 24]
...
```

➡️ **Solusi:** Hentikan scan (`Ctrl+C`). Tambahkan filter size hasil kalibrasi:

Bash

```
ffuf -u "${BASE_URL}/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/common.txt \
    -fs 1420 -c -ic -t 50
```

---

## ═══════════════════════════════════════

## FASE 4: COMPREHENSIVE DIRECTORY & FILE SCANNING

## ═══════════════════════════════════════

Gunakan `directory-list-2.3-medium.txt` dipadukan dengan ekstensi file yang relevan dengan teknologi backend.

### Langkah 4.1 — Full Scan Multi-Extension

Bash

```
# Tentukan ekstensi berdasarkan deteksi teknologi di Fase 0
# Contoh untuk PHP/Apache environment:
EXTS=".php,.html,.txt,.bak,.old,.zip"

ffuf -u "${BASE_URL}/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt \
    -e ${EXTS} \
    -fc 404 \
    -t 60 \
    -c -ic \
    -o ./dirs/full_scan.json -of json > ./logs/full_scan.log 2>&1 &

echo "[+] Scan berjalan di background. PID: $!"
echo "[*] Pantau progres: tail -f ./logs/full_scan.log"
```

**OUTPUT BERHASIL ✅ (Dipantau via `tail -f`):**

text

```
login.php               [Status: 200, Size: 2890, Words: 180, Lines: 65]
dashboard               [Status: 302, Size: 0, Words: 1, Lines: 1] --> /login.php
upload.php              [Status: 200, Size: 1205, Words: 75, Lines: 30]
config.php.bak          [Status: 200, Size: 845, Words: 40, Lines: 18]
backup.zip              [Status: 200, Size: 1542031, Words: 9812, Lines: 450]
```

**OUTPUT GAGAL ❌ — Rate Limiting Terpicu (Status 429 / Koneksi Drop):**

text

```
:: Errors: 45 :: Progress: [1200/220000] :: Job [1/1] :: 12 req/sec
[Status: 429, Size: 180] Too Many Requests
```

➡️ **Solusi:** Kurangi kecepatan pengiriman paket dengan flag `-rate` dan kurangi thread `-t`:

Bash

```
ffuf -u "${BASE_URL}/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt \
    -rate 15 -t 5 -fc 404,429 -c
```

---

## ═══════════════════════════════════════

## FASE 5: TARGETED SENSITIVE ASSET HUNTING

## ═══════════════════════════════════════

Menargetkan file konfigurasi, repository terbuka, dan arsip backup yang sering membocorkan kredensial.

### Langkah 5.1 — Scanning File Sensitif Kritis

Bash

```
# Buat wordlist khusus file sensitif
cat << 'EOF' > ./sensitive/critical_files.txt
.env
.env.backup
.env.local
.git/HEAD
.git/config
.gitignore
.htaccess
.htpasswd
web.config
config.php
config.php.bak
config.php.old
config.inc.php
configuration.php
database.sqlite
db.sql
database.sql
backup.zip
backup.tar.gz
site_backup.zip
phpinfo.php
info.php
server-status
Dockerfile
docker-compose.yml
id_rsa
authorized_keys
EOF

# Jalankan scan terarah
ffuf -u "${BASE_URL}/FUZZ" \
    -w ./sensitive/critical_files.txt \
    -mc 200,301,302,403 \
    -c -v -o ./sensitive/critical_hits.json -of json
```

**OUTPUT BERHASIL ✅ — Temuan Kritis:**

text

```
[Status: 200] http://target.htb/.git/HEAD
[Status: 200] http://target.htb/.env
[Status: 200] http://target.htb/config.php.bak
```

---

### Langkah 5.2 — Prosedur Penanganan Temuan Sensitif

#### Kasus A: Ditemukan `.env`

Bash

```
# Unduh dan filter variabel sensitif
curl -s "${BASE_URL}/.env" > ./sensitive/downloaded_env.txt
grep -E -i "password|secret|key|token|db_|admin" ./sensitive/downloaded_env.txt
```

**Tindakan Lanjutan:**

- Jika ditemukan `DB_PASSWORD`, catat untuk pengujian kredensial ke port SSH (22), FTP (21), MySQL (3306), atau panel login web.

#### Kasus B: Ditemukan `.git/HEAD`

Menandakan exposed Git repository. Source code aplikasi dapat di-dump secara utuh.

Bash

```
# Verifikasi keberadaan repository
curl -s "${BASE_URL}/.git/HEAD"
# Respon yang diharapkan: ref: refs/heads/master atau ref: refs/heads/main

# Unduh struktur repository menggunakan git-dumper
git-dumper "${BASE_URL}/.git/" ./sensitive/git_dump/

# Masuk dan periksa commit log untuk mencari password yang dihapus
cd ./sensitive/git_dump/
git log -p | grep -E -i "password|secret|api_key" | head -n 30
cd -
```

#### Kasus C: Ditemukan `backup.zip` atau `db.sql`

Bash

```
# Unduh file arsip
wget -q "${BASE_URL}/backup.zip" -O ./sensitive/backup.zip
unzip -q ./sensitive/backup.zip -d ./sensitive/backup_extracted/

# Analisis isi source code secara offline
grep -riE "pass|password|pwd|admin|conn" ./sensitive/backup_extracted/ 2>/dev/null | head -n 25
```

---

## ═══════════════════════════════════════

## FASE 6: VIRTUAL HOST (VHOST) FUZZING

## ═══════════════════════════════════════

Virtual Host memungkinkan satu web server meng-hosting beberapa domain internal yang tidak terdaftar di DNS publik (misal: `dev.target.htb`, `admin.target.htb`).

### Langkah 6.1 — Identifikasi Baseline Ukuran VHost Palsu

Saat kita mengirim Host header yang salah, server akan menyajikan default site dengan ukuran byte tertentu. Ukuran ini harus kita filter.

Bash

```
# Buat host fiktif untuk mengukur default page size
DUMMY_HOST="pasti-tidak-ada-$(tr -dc a-z0-9 </dev/urandom | head -c 8).${DOMAIN}"

curl -s -i -H "Host: ${DUMMY_HOST}" "${PROTO}://${TARGET_IP}/" > ./logs/baseline_vhost.txt
VHOST_SIZE=$(wc -c < ./logs/baseline_vhost.txt | tr -d ' ')
VHOST_WORDS=$(wc -w < ./logs/baseline_vhost.txt | tr -d ' ')

echo "[+] VHost Baseline False-Positive Size: ${VHOST_SIZE} bytes (${VHOST_WORDS} words)"
```

**OUTPUT BERHASIL ✅:**

text

```
[+] VHost Baseline False-Positive Size: 2854 bytes (215 words)
```

---

### Langkah 6.2 — Eksekusi VHost Fuzzing dengan FFUF

Arahkan request ke `TARGET_IP`, namun manipulasi HTTP Header `Host: FUZZ.${DOMAIN}`.

Bash

```
ffuf -u "${PROTO}://${TARGET_IP}/" \
    -H "Host: FUZZ.${DOMAIN}" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    -fs ${VHOST_SIZE} \
    -c -ic \
    -t 50 \
    -o ./vhosts/vhosts_found.json -of json
```

**OUTPUT BERHASIL ✅ — VHost Baru Ditemukan:**

text

```
dev                     [Status: 200, Size: 4120, Words: 310, Lines: 85]
api                     [Status: 200, Size: 1045, Words: 80, Lines: 25]
admin                   [Status: 401, Size: 412, Words: 35, Lines: 14]
```

**OUTPUT GAGAL ❌ — Seluruh kata lolos filter (False Positive Masif):**

text

```
mail                    [Status: 200, Size: 2854]
webmail                 [Status: 200, Size: 2854]
...
```

➡️ **Penyebab:** Ukuran baseline bergeser karena konten dinamis (misal terdapat timestamp pada halaman).  
➡️ **Solusi:** Gunakan filter kata (`-fw`) atau filter baris (`-fl`):

Bash

```
ffuf -u "${PROTO}://${TARGET_IP}/" \
    -H "Host: FUZZ.${DOMAIN}" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    -fw ${VHOST_WORDS} \
    -c -ic -t 50
```

---

### Langkah 6.3 — Daftarkan dan Investigasi VHost Baru

Setiap VHost yang ditemukan harus didaftarkan ke `/etc/hosts` agar resource CSS, JS, dan link internal dapat dimuat dengan benar oleh browser maupun scanner.

Bash

```
# Tambahkan vhost baru ke /etc/hosts
sudo sed -i "/${TARGET_IP}/ s/$/ dev.${DOMAIN} api.${DOMAIN}/" /etc/hosts

# Verifikasi aksesibilitas
curl -s -I "http://dev.${DOMAIN}/"
```

**OUTPUT BERHASIL ✅:**

http

```
HTTP/1.1 200 OK
Server: Apache/2.4.52 (Ubuntu)
Content-Length: 4120
```

➡️ **Langkah Wajib:** Lakukan siklus Directory Discovery (Fase 3 & 4) dari awal secara terpisah khusus untuk VHost baru ini:

Bash

```
ffuf -u "http://dev.${DOMAIN}/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -c
```

---

## ═══════════════════════════════════════

## FASE 7: RECURSIVE DIRECTORY ENUMERATION

## ═══════════════════════════════════════

Jika ditemukan sub-folder penting seperti `/admin/` atau `/api/`, sering kali terdapat endpoint internal di dalamnya yang tidak terlindungi otorisasi.

### Langkah 7.1 — Rekursi Terkontrol dengan Feroxbuster

Bash

```
# Jalankan feroxbuster dengan kedalaman (depth) maksimal 2
feroxbuster -u "${BASE_URL}/" \
    -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-small.txt \
    -x php,txt,json \
    -d 2 \
    --scan-limit 2 \
    -t 40 \
    -o ./dirs/recursive_output.txt
```

**OUTPUT BERHASIL ✅:**

text

```
200 GET    1L     7W    85B  http://target.htb/robots.txt
301 GET    9L    28W   312B  http://target.htb/admin => http://target.htb/admin/
200 GET   45L   110W  2890B  http://target.htb/admin/login.php
301 GET    9L    28W   310B  http://target.htb/admin/dev => http://target.htb/admin/dev/
200 GET   12L    34W   520B  http://target.htb/admin/dev/debug.log
```

➡️ **Temuan:** Ditemukan file log `debug.log` di dalam subfolder `/admin/dev/`.

---

## ═══════════════════════════════════════

## FASE 8: RESPON STATUS CODE & DECISION LOGIC

## ═══════════════════════════════════════

Berikut adalah matriks pengambilan keputusan berdasarkan kode status yang ditemukan:

|Status Code|Kondisi|Rekomendasi Tindakan Teknis|Modul Lanjutan|
|---|---|---|---|
|**200 OK**|Direktori/File statis|Periksa manual via curl/browser. Jika file arsip/db, unduh offline.|Analisis Source Code|
|**301 / 302**|Redirect URL|Periksa header `Location:`. Tambahkan trailing slash (`/`) pada fuzzer.|Navigasi Portal|
|**401 Unauthorized**|HTTP Basic Auth|Uji kredensial default (`admin:admin`, `guest:guest`).|Audit Otentikasi|
|**403 Forbidden**|Akses Ditolak|Uji manipulasi URL path (trailing slash, case sensitivity, header proxy).|403 Analysis|
|**405 Method Not Allowed**|Metode GET ditolak|Ubah metode HTTP menjadi POST, PUT, atau OPTIONS via curl.|`[🔌 30 — API Security Workflow](/docs/api-security)`|
|**500 Server Error**|Crash / Unhandled Code|Masukkan input tidak terduga pada parameter; cek error debug trace.|Parameter Discovery|

### Strategi Pencarian Teknis (Jika Menemui Jalan Buntu)

Jika fuzzing tidak menghasilkan file umum, gunakan teknik pencarian lanjutan:

1. **Google Dorking (Target Domain Terbuka):**
    
    - Cari file konfigurasi publik: `site:target.com ext:env OR ext:yml OR ext:json OR ext:conf`
    - Cari portal login internal: `site:target.com inurl:login OR inurl:admin OR inurl:dashboard`
    - Cari file backup terbuka: `site:target.com ext:bak OR ext:old OR ext:zip OR ext:sql`
2. **Custom Wordlist Generation (CeWL):**  
    Jika website menggunakan penamaan path berbasis bisnis target:
    
    Bash
    
    ```
    cewl -d 2 -m 5 -w ./dirs/custom_words.txt "${BASE_URL}/"
    tr '[:upper:]' '[:lower:]' < ./dirs/custom_words.txt | sort -u > ./dirs/custom_lower.txt
    ffuf -u "${BASE_URL}/FUZZ" -w ./dirs/custom_lower.txt -c
    ```
    

---

## ═══════════════════════════════════════

## FASE 9: CROSS-SERVICE PIVOTING & BRIDGING

## ═══════════════════════════════════════

Setiap artefak yang ditemukan pada web fuzzing harus dihubungkan dengan port lain pada target:

text

```
Hasil Web Fuzzing
  │
  ├──► .env / config.php.bak (Ditemukan DB / System Password)
  │      ├── Port 22 (SSH)       ──► Uji login: ssh user@$TARGET_IP
  │      ├── Port 3306 (MySQL)   ──► mysql -u user -p -h $TARGET_IP
  │      ├── Port 1433 (MSSQL)   ──► impacket-mssqlclient user:$PASS@$TARGET_IP
  │      └── Port 5985 (WinRM)   ──► evil-winrm -i $TARGET_IP -u user -p $PASS
  │
  ├──► /wp-content/ atau /wp-login.php
  │      └─ ─ Lanjut ke: <a href="/docs/wordpress" class="text-[#00b4d8] hover:underline font-mono font-semibold">17a_wordpress_workflow.md</a> (wpscan, plugin enumeration)
  │
  ├──► /api/v1/ atau /swagger.json
  │      └─ ─ Lanjut ke: <a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a> (BOLA, IDOR, Parameter Tampering)
  │
  └──► Upload Directory (/uploads/, /files/)
         └── Lanjut ke: <a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a> (File Extension & Content-Type Validation)
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING & PENANGANAN ERROR

## ═══════════════════════════════════════

|Gejala Error|Kemungkinan Masalah|Solusi Konkret|
|---|---|---|
|`x509: certificate signed by unknown authority`|Target menggunakan Self-Signed SSL certificate|Tambahkan flag `-k` pada FFUF, Gobuster, atau Feroxbuster.|
|`All responses return HTTP 200`|Wildcard DNS atau custom Soft-404 aktif|Ambil ukuran byte default via curl, gunakan `-fs <ukuran_bytes>` di ffuf.|
|`Request timed out / connection reset`|Thread fuzzer terlalu tinggi membuat service crash|Turunkan thread: `-t 10` atau batasi request per detik: `-rate 20`.|
|`VHost scan gives 0 results`|Host header tidak memuat domain yang tepat|Gunakan flag `--append-domain` di Gobuster atau `-H "Host: FUZZ.target.htb"` di FFUF.|
|`ffuf: out of memory (OOM killed)`|Wordlist terlalu besar dibaca langsung ke RAM|Bagi wordlist menjadi beberapa bagian (`split -l 50000`) atau gunakan wordlist medium.|
|`Redirect Loop (301 berulang)`|Target memaksa penambahan trailing slash|Jalankan fuzzer dengan URL berakhiran `/FUZZ/` atau filter status 301 dengan `-fc 301`.|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN FUZZING)

## ═══════════════════════════════════════

text

```
START: Web Port Aktif (80/443/8080)
│
├─ FASE 0: Mapping Host & Verifikasi Server Header
│   ├─ Header terdeteksi (Apache/Nginx/IIS) → Catat ekstensi relevan (.php / .aspx)
│   └─ Hostname berbeda dari IP → Update /etc/hosts
│
├─ FASE 1: Kalibrasi Baseline 404
│   ├─ Status 404 Normal → Gunakan filter standar (-fc 404)
│   └─ Status 200/302 (Soft-404) → Ukur byte size → Wajib filter (-fs <bytes>)
│
├─ FASE 2 & 3: Quick Scan (common.txt)
│   ├─ Ditemukan /robots.txt → Analisis direktori terlarang (Disallow)
│   ├─ Ditemukan /admin, /api → Prioritaskan inspeksi
│   └─ Hasil nihil → Lanjut ke FASE 4
│
├─ FASE 4 & 5: Deep Scan & File Sensitif
│   ├─ .env / config.php.bak → Loot kredensial → Pivot ke Port 22/3306/5985
│   ├─ .git/HEAD terbuka → Jalankan git-dumper → Audit source code offline
│   └─ backup.zip / db.sql → Unduh → Ekstrak credential string
│
├─ FASE 6: Virtual Host Discovery
│   ├─ Ukur baseline Host acak (-fs <vhost_baseline>)
│   ├─ Ditemukan VHost baru (dev/admin) → Tambahkan ke /etc/hosts
│   └─ Ulangi Directory Fuzzing khusus pada VHost baru
│
└─ FASE 7: Rekursif Terkontrol
    └─ Fuzzing subfolder spesifik (-d 2) → Identifikasi file log/debug internal
```

---

## ⚡ CHEATSHEET — READY TO EXECUTE

Bash

```
# === 1. SETUP ENV ===
export TARGET_IP="10.10.11.120"; export DOMAIN="target.htb"; export BASE_URL="http://${DOMAIN}"

# === 2. BASELINE MEASUREMENT ===
RAND_PATH=$(tr -dc a-z0-9 </dev/urandom | head -c 16)
curl -s -o /dev/null -w "Size: %{size_download}\n" "${BASE_URL}/${RAND_PATH}"

# === 3. QUICK SCAN (FFUF) ===
ffuf -u "${BASE_URL}/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -fc 404 -c -ic -t 50

# === 4. COMPREHENSIVE SCAN (MULTI-EXT) ===
ffuf -u "${BASE_URL}/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt \
    -e .php,.html,.txt,.bak,.zip -fc 404 -c -ic -t 60

# === 5. SENSITIVE FILE AUDITING ===
ffuf -u "${BASE_URL}/FUZZ" -w ./sensitive/critical_files.txt -mc 200,301,302,403 -c -v

# === 6. VIRTUAL HOST SCANNING ===
ffuf -u "http://${TARGET_IP}/" -H "Host: FUZZ.${DOMAIN}" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs <VHOST_SIZE> -c -ic -t 50

# === 7. RECURSIVE (FEROXBUSTER) ===
feroxbuster -u "${BASE_URL}/" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-small.txt -x php,txt -d 2

# === 8. PARSING TEMUAN VALID (JQ) ===
jq -r '.results[] | select(.status == 200 or .status == 301) | "\(.status)\t\(.length)b\t\(.url)"' output.json | sort -n
```

---

> **➡️ NEXT WORKFLOW:** Jika dari hasil fuzzing ini terdeteksi indikasi Content Management System (seperti `/wp-content/`, `/administrator/`, atau `/core/`), lanjutkan ke panduan: **`[🌐 File 17: CMS Detection, Fingerprinting & Exploitation Workflow](/docs/cms-detection)`** untuk fingerprinting modul, tema, dan celah otentikasi spesifik.