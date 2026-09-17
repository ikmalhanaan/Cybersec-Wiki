---
id: "62"
title: "⚡ Quick Start: Urutan Kerja OSINT (Untuk Pemula)"
category: "9. OSINT & Misc"
categoryId: "osint_misc"
filename: "62_osint_workflow.md"
refs_out: ["01","05","06","14a","15","17a","17b","17c","18","57","61","63"]
refs_in: ["61","63"]
---

> **Target Environment:** Parrot OS XFCE (Debian-based)  
> **Prerequisites:** Memahami dasar Linux CLI, konsep dasar DNS/HTTP, dan network tools (referensi: [01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi), [🏛️ Bagian 0: Fondasi PCAP Analysis](/docs/pcap-analysis)).  
> **Fokus Utama:** Investigasi intelijen sumber terbuka (_Open Source Intelligence_), passive footprinting, recon bug bounty, dan pemecahan tantangan CTF OSINT/GeoCTF.

---

## 📑 Daftar Isi

1. [Bagian 0: Fondasi OSINT & OPSEC](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-0-fondasi-osint--opsec)
2. [Bagian 1: Setup Tools OSINT di Parrot OS](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-1-setup-tools-osint-di-parrot-os)
3. [Bagian 2: Domain & Website Intelligence](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-2-domain--website-intelligence)
4. [Bagian 3: Email Intelligence & Verification](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-3-email-intelligence--verification)
5. [Bagian 4: Username & Social Media Investigation](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-4-username--social-media-investigation)
6. [Bagian 5: Image & Geolocation Investigation (GeoINT)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-5-image--geolocation-investigation-geoint)
7. [Bagian 6: IP & Infrastructure Intelligence](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-6-ip--infrastructure-intelligence)
8. [Bagian 7: Breach & Credential Intelligence](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-7-breach--credential-intelligence)
9. [Bagian 8: 8 Common CTF OSINT Patterns](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-8-8-common-ctf-osint-patterns)
10. [Bagian 9: Automation & Reporting](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-9-automation--reporting)
11. [Bagian 10: Master OSINT Decision Tree](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-10-master-osint-decision-tree)
12. [Bagian 11: Common Errors & Troubleshooting](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-11-common-errors--troubleshooting)
13. [Bagian 12: Cheatsheet Copy-Paste Ready](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-12-cheatsheet-copy-paste-ready)

---

## ⚡ Quick Start: Urutan Kerja OSINT (Untuk Pemula)

Setiap kali Anda mendapatkan target baru (domain, email, username), ikuti urutan kerja standar berikut:

- [ ] 1. **Verifikasi IP Publik & OPSEC:** `curl -s ifconfig.me` (Pastikan IP publik/VPN terpasang).
- [ ] 2. **Buat Workspace Terisolasi:** `mkdir -p ~/osint/targets/$TARGET && cd ~/osint/targets/$TARGET`
- [ ] 3. **Pemeriksaan WHOIS & RDAP:** `whois $TARGET > whois.txt`
- [ ] 4. **Audit Record DNS:** `dig $TARGET ANY +noall +answer`
- [ ] 5. **Enumerasi Subdomain Pasif:** `subfinder -d $TARGET -silent -o subdomains.txt`
- [ ] 6. **Filter Subdomain Aktif:** `cat subdomains.txt | httpx -silent -status-code -title -o live_subs.txt`
- [ ] 7. **Ekstraksi Log Sertifikat TLS:** `curl -s "https://crt.sh/?q=%.$TARGET&output=json" | jq -r '.[].name_value' | sed 's/^\*\.//' | grep -v '^\*' | sort -u`
- [ ] 8. **Ambil Histori Endpoint URL:** `waybackurls $TARGET | head -n 50`
- [ ] 9. **Google Dorking:** Cari file sensitif (`site:$TARGET filetype:env` / `filetype:pdf`).
- [ ] 10. **Infrastruktur & Port Scanning (Shodan):** `shodan search hostname:$TARGET`
- [ ] 11. **Pemeriksaan Email & Breach:** `holehe target_email@domain.com` / `haveibeenpwned.com`

---

## 🕵️ Bagian 0: Fondasi OSINT & OPSEC

### 0.1 Apa Itu OSINT?

**OSINT (Open Source Intelligence)** adalah metodologi pengumpulan, pemrosesan, dan analisis data yang tersedia secara publik dan legal untuk menghasilkan data intelijen yang dapat ditindaklanjuti (_actionable intelligence_).

> **Analogi Operasional:**  
> Menjalankan OSINT seperti menjadi seorang **detektif swasta yang memecahkan kasus hanya dari kliping koran, buku telepon umum, rekaman CCTV publik, dan jejak sampah yang dibuang ke trotoar**. Anda tidak mendobrak pintu (eksploitasi/hacking) atau menyadap kabel privat (wiretapping). Anda menyusun kepingan teka-teki dari apa yang sengaja maupun tidak sengaja ditinggalkan target di ruang publik.

text

```
                    SIKLUS OPERASIONAL OSINT
 ┌────────────────────────────────────────────────────────┐
 │ 1. PLANNING & DIRECTION                                │
 │    (Tentukan sasaran: Domain? Email? Handle medsos?)   │
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. COLLECTION                                          │
 │    (Scraping, DNS harvest, search engine dorking)      │
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. PROCESSING                                          │
 │    (Normalisasi data, deduplikasi, konversi format)    │
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │ 4. ANALYSIS & CORRELATION                              │
 │    (Menghubungkan titik: Username A == Email B == IP C)│
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │ 5. DISSEMINATION / REPORTING                           │
 │    (Dokumentasi temuan, visualisasi graf relasi, bukti)│
 └────────────────────────────────────────────────────────┘
```

#### Perbedaan Konteks OSINT:

- **CTF OSINT:** Berorientasi pada pencarian _flag_ spesifik. Data target bersifat statis, sering kali melibatkan koordinat tersembunyi, post lawas yang diarsip, atau akun boneka buatan pembuat soal.
- **Bug Bounty Reconnaissance:** Berorientasi pada perluasan _attack surface_. Mencari subdomain tersembunyi, origin IP bypass Cloudflare, bucket S3 publik, atau repository GitHub karyawan yang membocorkan API key.
- **Threat Intelligence / Real Investigation:** Memetakan aktor ancaman, infrastruktur Command and Control (C2), atribusi serangan, atau verifikasi identitas fisik.

---

### 0.2 OPSEC (Operational Security) untuk OSINT

Melakukan investigasi tanpa proteksi identitas dapat memperingatkan target (_alerting the target_). Contoh: Melihat profil LinkedIn target menggunakan akun pribadi akan meninggalkan notifikasi _"Someone viewed your profile"_.

#### 1. Verifikasi Alamat IP Publik Workstation

Sebelum membuka tools OSINT, selalu periksa identitas IP yang terpapar:

Bash

```
# Cek alamat IP publik saat ini
curl -s ifconfig.me
echo ""

# Cek metadata IP publik (ISP, Negara, Koordinat)
curl -s https://ipinfo.io/json | jq '{ip: .ip, org: .org, city: .city, country: .country}'
```

#### 2. Prinsip Perlindungan Identitas Penyelidik:

- **Gunakan Jalur VPN / Tor:** Pastikan IP asli residensial Anda tertutup sebelum melakukan scanning pasif atau scraping web.
- **Dedicated Browser Profiles:** Buat profil browser terpisah di Firefox (tanpa cookies pribadi, tanpa akun Google/sosmed asli).
    
    Bash
    
    ```
    # Buka profile manager Firefox di Parrot OS
    firefox -P &
    ```
    
- **Sock Puppet Accounts:** Buat akun media sosial anonim khusus riset. Jangan gunakan nomor HP pribadi, gunakan foto AI (_thispersondoesnotexist.com_), dan buat histori aktivitas yang tampak natural.
- **Metadata Hygiene:** Hapus EXIF data dari screenshot atau dokumen investigasi Anda sebelum membagikannya ke tim atau platform publik.
    
    Bash
    
    ```
    # Hapus seluruh metadata gambar hasil investigasi
    exiftool -all= target_screenshot.png
    ```
    

---

### 0.3 Perbedaan Passive vs Active OSINT

|Metode|Kategori|Penjelasan Operasional|Risiko Deteksi Target|
|---|---|---|---|
|**Google Dorking**|Passive|Meminta data cache dari indeks Google, bukan dari server target.|Hampir Nol|
|**Shodan / Censys**|Passive|Membaca database port scanner milik pihak ketiga.|Nol|
|**Wayback Machine**|Passive|Mengakses snapshot arsip historis.|Nol|
|**Certificate Transparency**|Passive|Membaca log publik sertifikat TLS (crt.sh).|Nol|
|**WHOIS / RDAP**|Passive|Query ke registrar domain database publik.|Sangat Rendah|
|**DNS Query Standar**|Passive / Semi|Resolusi record publik melalui DNS resolver umum (1.1.1.1).|Rendah|
|**Akses Web Target**|Active|Browser/cURL langsung menghubungi server web target.|Sedang (Masuk access log)|
|**DNS Brute Force**|Active|Mengirimkan jutaan request sub-domain ke name server target.|Tinggi (Terdeteksi WAF/IDS)|

---

## 🛠️ Bagian 1: Setup Tools OSINT di Parrot OS

### 1.1 Tools Pre-installed di Parrot OS

Parrot OS Security Edition sudah menyertakan utility dasar berikut:

- `whois` & `dig` (Domain dan DNS queries)
- `curl` & `wget` (Web requests & file fetching)
- `exiftool` (Metadata reading)
- `theHarvester` (OSINT aggregation)
- `maltego` (GUI link analysis)

---

### 1.2 Instalasi Manual Tools Tambahan

Jalankan rangkaian instalasi berikut di terminal Parrot OS untuk melengkapi seluruh kebutuhan investigasi:

Bash

```
# 1. Update paket sistem
sudo apt update -y && sudo apt install -y python3-pip golang git jq chromium-driver

# Setup Go binary path di environment
export PATH="$HOME/go/bin:$PATH"
echo 'export PATH="$HOME/go/bin:$PATH"' >> ~/.bashrc

# 2. Subfinder & httpx (HTTP probe untuk filter subdomain aktif)
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# 3. Amass (In-depth attack surface mapping)
sudo apt install -y amass

# 4. Sherlock (Memburu username di 350+ platform)
git clone https://github.com/sherlock-project/sherlock.git /opt/sherlock
cd /opt/sherlock && pip3 install -r requirements.txt --break-system-packages

# Buat wrapper script sherlock yang robust
cat << 'EOF' | sudo tee /usr/local/bin/sherlock > /dev/null
#!/bin/bash
python3 /opt/sherlock/sherlock/sherlock.py "$@"
EOF
sudo chmod +x /usr/local/bin/sherlock

# 5. Holehe (Cek pendaftaran email di platform tanpa password alert)
pip3 install holehe --break-system-packages

# 6. Waybackurls (Ambil historical URLs dari Wayback Machine)
go install github.com/tomnomnom/waybackurls@latest

# 7. GHunt (Google Account Profiler - Email, Docs, Photos, Reviews)
pip3 install ghunt --break-system-packages
# CATATAN SETUP GHUNT: Jalankan `ghunt login` sekali di terminal untuk mengonfigurasi Google cookies via browser sebelum digunakan!

# 8. TruffleHog (Scan secret leaks di git commit & repo)
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sudo sh -s -- -b /usr/local/bin

# 9. SpiderFoot (Open Source Intelligence Automation Tool)
git clone https://github.com/smicallef/spiderfoot.git /opt/spiderfoot
cd /opt/spiderfoot && pip3 install -r requirements.txt --break-system-packages
```

|Tool|Fungsi Utama|Kebutuhan API Key?|Command Verifikasi|
|---|---|---|---|
|**subfinder**|Subdomain discovery via multi-source API|Parsial (Bisa tanpa key)|`subfinder -version`|
|**amass**|Network mapping & DNS asset enumeration|Parsial|`amass -version`|
|**sherlock**|Pencarian username silang platform sosial|Tidak|`sherlock --version`|
|**holehe**|Pemetaan keterdaftaran alamat email|Tidak|`holehe --version`|
|**waybackurls**|Ekstraksi histori endpoint URL web|Tidak|`waybackurls -h`|
|**ghunt**|Investigasi profil akun Google/Gmail|Diperlukan Cookies|`ghunt --help`|
|**exiftool**|Membaca & memodifikasi metadata file|Tidak|`exiftool -ver`|

---

### 1.3 Struktur Direktori Workspace OSINT

Untuk menjaga kerapian barang bukti selama investigasi, buat struktur workspace standar:

Bash

```
mkdir -p ~/osint/{targets,domains,emails,usernames,images,social_media,documents,screenshots,reports}
cd ~/osint/
```

---

## 🌐 Bagian 2: Domain & Website Intelligence

Inisialisasi variabel target:

Bash

```
TARGET="insecurebank.com"
```

### 2.1 WHOIS & Domain Registration

WHOIS memberikan informasi pemilik domain, registrar, name server, tanggal pendaftaran, dan tanggal kedaluwarsa.

Bash

```
# 1. WHOIS Query Standar
whois "$TARGET" > ~/osint/domains/whois_raw.txt
cat ~/osint/domains/whois_raw.txt | grep -iE "Registrar:|Creation Date:|Registry Expiry Date:|Name Server:|Registrant Email:"

# 2. RDAP Query (Registration Data Access Protocol - Format JSON Terstruktur)
curl -s "https://rdap.org/domain/$TARGET" | jq '{name: .ldhName, status: .status, entities: .entities[].vcardArray}'
```

_Analisis Hasil:_

- **Registrant Email:** Cari email admin. Jika tidak disamarkan oleh _Privacy Protection_, cari domain lain yang didaftarkan menggunakan email yang sama melalui layanan Reverse WHOIS (`viewdns.info/reversewhois/`).
- **Expiry Date:** Domain yang hampir kedaluwarsa memiliki potensi pengambilalihan (_Domain Hijacking / Takeover_).
- **Name Server:** Mengidentifikasi penyedia cloud/DNS target (misal: Cloudflare, AWS Route 53).

---

### 2.2 DNS Intelligence & Record Auditing

Bash

```
# 1. Query Record A (IPv4), AAAA (IPv6), dan CNAME
dig "$TARGET" A +short
dig "$TARGET" CNAME +short

# 2. Query Mail Server (MX) - Menentukan provider email korporat (Google Workspace, M365)
dig "$TARGET" MX +short

# 3. Query Record TXT (SPF, DKIM, DMARC, Domain Verification Strings)
dig "$TARGET" TXT +short

# 4. Reverse DNS (PTR Record) dari IP hasil lookup
dig -x $(dig "$TARGET" +short | head -n 1) +short

# 5. Uji Zone Transfer (AXFR) terhadap seluruh Name Server
# Jika miskonfigurasi, server akan memuntahkan seluruh zona internal jaringan
for ns in $(dig "$TARGET" NS +short); do
    echo "[*] Mencoba Zone Transfer ke: $ns"
    dig axfr "@$ns" "$TARGET"
done
```

---

### 2.3 Subdomain Enumeration

Bash

```
# 1. Subfinder: Discovery pasif dari lusinan engine
subfinder -d "$TARGET" -silent -o ~/osint/domains/subfinder.txt

# 2. Amass: Enumerasi pasif mendalam
amass enum -passive -d "$TARGET" -o ~/osint/domains/amass.txt

# 3. Certificate Transparency Logs (crt.sh via CLI) - Cleansing wildcard *.
curl -s "https://crt.sh/?q=%.$TARGET&output=json" | \
  jq -r '.[].name_value' | sed 's/^\*\.//' | grep -v '^\*' | sort -u > ~/osint/domains/crtsh.txt

# 4. theHarvester: Mengumpulkan subdomain dan email dari search engine publik
theHarvester -d "$TARGET" -b bing,duckduckgo,yahoo -f ~/osint/domains/theharvester_out

# 5. Konsolidasi seluruh subdomain unik
cat ~/osint/domains/*.txt | sort -u | grep -E "\.$TARGET$" > ~/osint/domains/all_subdomains.txt
echo "[+] Total Subdomain Unik Ditemukan: $(wc -l < ~/osint/domains/all_subdomains.txt)"

# 6. Filter Subdomain Aktif Menggunakan httpx
cat ~/osint/domains/all_subdomains.txt | \
  httpx -silent -status-code -title -tech-detect \
  -o ~/osint/domains/live_subdomains.txt
head -n 20 ~/osint/domains/live_subdomains.txt
```

---

### 2.4 Website Fingerprinting & Historical Scraping

Bash

```
# 1. Identifikasi Web Server, Framework, CMS, dan Header Teknologi
whatweb -a 3 "https://$TARGET"

# 2. Deteksi Web Application Firewall (WAF)
wafw00f "https://$TARGET"

# 3. Periksa File Konfigurasi Indeks Crawling
curl -s -L "https://$TARGET/robots.txt"
curl -s -L "https://$TARGET/sitemap.xml"

# 4. Ekstraksi Histori URL dari Wayback Machine
waybackurls "$TARGET" | sort -u > ~/osint/domains/wayback_endpoints.txt
head -n 25 ~/osint/domains/wayback_endpoints.txt

# Filter endpoint yang memuat ekstensi sensitif
grep -iE "\.sql|\.env|\.bak|\.kdbx|\.json|\.php\?|\.action\?" ~/osint/domains/wayback_endpoints.txt
```

---

### 2.5 Google Dorking Reference

Gunakan operator pencarian lanjutan Google untuk membedah data yang terindeks secara tidak sengaja:

|Operator|Fungsi Operasional|Contoh Sintaks|
|---|---|---|
|`site:`|Membatasi hasil pencarian hanya pada domain target|`site:insecurebank.com`|
|`filetype:` / `ext:`|Mencari file dengan ekstensi tertentu|`site:insecurebank.com filetype:pdf`|
|`inurl:`|Mencari kata kunci yang muncul pada baris URL|`site:insecurebank.com inurl:login`|
|`intitle:`|Mencari kata kunci pada title tag HTML|`site:insecurebank.com intitle:"dashboard"`|
|`intext:`|Mencari teks tertentu di dalam body halaman web|`site:insecurebank.com intext:"api key"`|
|`cache:`|Menampilkan snapshot halaman versi cache Google|`cache:insecurebank.com`|
|`""` (Quotes)|Pencarian kata/frasa persis (_Exact Match_)|`"internal use only" site:insecurebank.com`|
|`-` (Minus)|Mengabaikan kata tertentu dari hasil pencarian|`site:insecurebank.com -www`|

#### Kombinasi Google Dork Siap Pakai:

text

```
# 1. Mencari File Dokumen dan Database Sensitif
site:insecurebank.com (filetype:pdf OR filetype:xlsx OR filetype:docx OR filetype:sql OR filetype:env)

# 2. Mencari Halaman Login, Admin Panel, dan Dashboard
site:insecurebank.com (inurl:admin OR inurl:login OR inurl:portal OR intitle:"Admin Panel")

# 3. Mencari Direktori Tanpa Index (Directory Listing Enabled)
site:insecurebank.com intitle:"Index of /"

# 4. Mencari Credential Leaks di Eksternal Pastebin
site:pastebin.com "insecurebank.com"

# 5. Mencari Kode Sumber Target yang Bocor di GitHub
site:github.com "insecurebank.com" (password OR token OR secret OR API_KEY)
```

---

## 📧 Bagian 3: Email Intelligence & Verification

### 3.1 Email Discovery

Bash

```
# 1. Memanen alamat email publik menggunakan theHarvester
theHarvester -d "$TARGET" -b google,bing,linkedin,duckduckgo -f ~/osint/emails/harvest_emails

# 2. Menghubungi Hunter.io API (Jika memiliki API Key)
HUNTER_API="YOUR_API_KEY_HERE"
curl -s "https://api.hunter.io/v2/domain-search?domain=$TARGET&api_key=$HUNTER_API" | jq '.data.emails[].value'
```

---

### 3.2 Email Verification & Platform Mapping (`holehe` & `GHunt`)

`holehe` memeriksa apakah alamat email terdaftar pada 120+ platform digital (Twitter, GitHub, Instagram, Discord, WordPress, dll.) dengan mengeksploitasi fungsi *forgot password* tanpa memicu pengiriman notifikasi/alert ke target.

Bash

```bash
TARGET_EMAIL="admin@insecurebank.com"

# 1. Jalankan holehe untuk memetakan keberadaan akun
holehe "$TARGET_EMAIL"

# Filter hanya platform tempat email TERDAFTAR ([+])
holehe "$TARGET_EMAIL" | grep "\[+\]"
```

_Contoh Output:_

text

```text
[+] twitter.com (Registered)
[+] github.com (Registered)
[+] instagram.com (Registered)
[-] spotify.com (Not Registered)
```

#### Investigasi Akun Google/Gmail (`GHunt`)

Jika target menggunakan email Gmail (`@gmail.com`), gunakan `GHunt` untuk mengekstrak identitas Google Account (Gaia ID, nama asli, Google Maps reviews, Google Drive public files):

Bash

```bash
# 1. Login GHunt terlebih dahulu (membutuhkan cookies dari browser)
ghunt login

# 2. Investigasi alamat email Gmail target
ghunt email "$TARGET_EMAIL"

# 3. Investigasi Gaia ID spesifik (jika ditemukan)
# ghunt gaia TARGET_GAIA_ID
```

---

### 3.3 Analisis Header Email

Saat menganalisis email phishing atau email yang ditemukan di CTF:

text

```
                      STRUKTUR MAIL RELAY PATH
 [ Pengirim Asli ] (X-Originating-IP: 198.51.100.4)
        │
        ▼ SMTP
 [ Mail Server 1 ] (Received: from mail.attacker.com [198.51.100.4])
        │
        ▼ SMTP
 [ Mail Relay 2  ] (Received: from relay.relayprovider.net [203.0.113.15])
        │
        ▼
 [ Server Korban ] (Authentication-Results: spf=pass dkim=pass dmarc=pass)
```

#### Komponen Kritis Header:

- `Received:` Baca header dari **paling bawah ke paling atas** untuk melacak rantai hop pengiriman dari server asal ke server tujuan.
- `X-Originating-IP:` IP publik dari perangkat client pengirim asli saat men-submit email.
- `Authentication-Results:`
    - **SPF (Sender Policy Framework):** Memvalidasi apakah IP pengirim diizinkan oleh DNS TXT domain tersebut.
    - **DKIM (DomainKeys Identified Mail):** Memverifikasi tanda tangan digital kriptografis dari body email.
    - **DMARC:** Kebijakan penanganan jika SPF/DKIM gagal.

---

## 👤 Bagian 4: Username & Social Media Investigation

### 4.1 Cross-Platform Username Hunting (`sherlock`)

Di CTF dan investigasi nyata, user sering menggunakan _handle / pseudonym_ yang sama di berbagai forum dan media sosial.

Bash

```bash
TARGET_USER="shadow_alex99"

# 1. Jalankan Sherlock untuk mencari akun di 350+ platform
sherlock "$TARGET_USER" --timeout 10 --print-found

# 2. Simpan hasil temuan ke file spesifik
sherlock "$TARGET_USER" --timeout 10 --print-found --output ~/osint/usernames/"${TARGET_USER}_results.txt"
```

_Contoh Output:_

text

```
[*] Checking username shadow_alex99 on:
[+] GitHub: https://github.com/shadow_alex99
[+] Reddit: https://www.reddit.com/user/shadow_alex99
[+] Steam: https://steamcommunity.com/id/shadow_alex99
[+] Twitter: https://twitter.com/shadow_alex99
```

---

### 4.2 Analisis Profil Media Sosial

|Platform|Vektor Informasi yang Dicari|Metode Ekstraksi & Pencegahan Alert|
|---|---|---|
|**LinkedIn**|Riwayat pekerjaan, stack teknologi perusahaan, nama rekan kerja.|**Wajib Logout** atau gunakan sock puppet untuk menghindari notifikasi profil.|
|**GitHub**|Repositori publik, commit history, branch tersembunyi, personal access tokens.|Periksa commit message dan file `.gitignore` yang bocor.|
|**Twitter / X**|Minat, opini teknis, interaksi lingkaran pertemanan, metadata waktu posting.|Analisis jam aktif untuk memperkirakan zona waktu (timezone) target.|
|**Instagram**|Foto lingkungan, geotag lokasi, tanggal liburan, relasi keluarga.|Cari bayangan gedung, landmark, atau pantulan kaca pada foto.|
|**Reddit**|Pertanyaan teknis pemecahan masalah coding, keluhan sistem internal.|Menggunakan tool seperti `karmadecay` atau arsip `pullpush.io`.|

---

### 4.3 GitHub Intelligence & Secret Hunting

Developer sering tidak sengaja memasukkan private key atau kredensial ke dalam repositori publik:

Bash

```
# 1. Clone repositori target ke direktori investigasi
git clone "https://github.com/$TARGET_USER/project-api.git" ~/osint/documents/project-api
cd ~/osint/documents/project-api

# 2. Scanning secrets di seluruh commit history menggunakan TruffleHog
trufflehog git file://. --only-verified

# 3. Pencarian manual string rahasia dan credentials
grep -rniE "api[_-]?key|password|secret|token|bearer|aws" . --exclude-dir=".git"

# 4. Periksa log commit untuk melihat data yang sempat di-commit lalu di-revert
git log -p | grep -iE "password|api_key|token"
```

---

## 📸 Bagian 5: Image & Geolocation Investigation (GeoINT)

### 5.1 Ekstraksi Metadata EXIF Menggunakan ExifTool

Foto digital yang diambil oleh kamera smartphone atau kamera DSLR tanpa sanitasi sering kali memuat koordinat GPS presisi dan informasi hardware.

Bash

```
TARGET_IMG="mystery_photo.jpg"

# 1. Tampilkan seluruh metadata gambar
exiftool "$TARGET_IMG"

# 2. Ekstraksi spesifik koordinat GPS
exiftool -GPSLatitude -GPSLongitude -DateTimeOriginal -Make -Model "$TARGET_IMG"
```

_Contoh Output Nyata:_

text

```
GPS Latitude                    : 40 deg 44' 54.36" N
GPS Longitude                   : 73 deg 59' 8.52" W
Date/Time Original              : 2023:10:18 14:23:10
Camera Make                     : Apple
Camera Model Name               : iPhone 14 Pro
```

#### Konversi Format DMS ke Decimal Degrees (DD):

Untuk memasukkan koordinat ke Google Maps, ubah format _Degrees-Minutes-Seconds_ (DMS) menjadi _Decimal Degrees_:  
Decimal=Degrees+(Minutes60)+(Seconds3600)Decimal=Degrees+(60Minutes​)+(3600Seconds​)

- Latitude: 40+(44/60)+(54.36/3600)=40.74843340+(44/60)+(54.36/3600)=40.748433 (North = Positif)
- Longitude: 73+(59/60)+(8.52/3600)=−73.98570073+(59/60)+(8.52/3600)=−73.985700 (West = Negatif)
- **Query Google Maps:** `40.748433, -73.985700` (Mengarah ke Empire State Building, NY).

---

### 5.2 Reverse Image Search Engines

Jika gambar tidak memiliki metadata EXIF (sudah dihapus oleh platform WhatsApp/Twitter), gunakan pencarian visual:

- **Google Images (`images.google.com`):** Unggul untuk landmark umum, produk, dan logo korporat.
- **Yandex Images (`yandex.com/images`):** Mesin pencari visual paling akurat untuk pengenalan wajah (_facial recognition_), bangunan di Eropa/Asia, dan background kompleks.
- **TinEye (`tineye.com`):** Unggul dalam mencari versi asli gambar pertama kali diunggah (_oldest crawled image_) dan pelacakan modifikasi resolusi.
- **PimEyes (`pimeyes.com`):** Search engine pengenalan wajah khusus untuk melacak profil seseorang di internet hanya dari satu sampel foto wajah.

---

### 5.3 Metodologi Analisis Geolokasi (GeoINT)

Dalam tantangan GeoCTF, amati petunjuk lingkungan pada gambar:

text

```
                         ANATOMI ANALISIS GEOINT
 ┌────────────────────────────────────────────────────────┐
 │ 1. Langit & Bayangan  ──► Arah matahari, jam pemotretan│
 │ 2. Infrastruktur      ──► Bentuk tiang listrik, marka  │
 │ 3. Bahasa / Teks      ──► Plat nomor, iklan jalan, toko│
 │ 4. Flora & Kontur     ──► Tipe pohon, jenis tanah      │
 │ 5. Arsitektur         ──► Gaya genteng, jendela        │
 └────────────────────────────────────────────────────────┘
```

- **SunCalc (`suncalc.org`):** Menghitung sudut elevasi matahari dan panjang bayangan pada tanggal tertentu untuk menentukan orientasi mata angin (Utara/Selatan).
- **Overpass Turbo (`overpass-turbo.eu`):** Menjalankan query OpenStreetMap.  
    _Contoh Query:_ Cari gereja Katolik yang berjarak 50 meter dari rel kereta api di kota tertentu.

---

## 🖥️ Bagian 6: IP & Infrastructure Intelligence

### 6.1 Analisis Alamat IP & ASN

Bash

```
TARGET_IP="185.199.108.153"

# 1. Identifikasi ASN, Organisasi, dan Lokasi Geografis IP
curl -s "https://ipinfo.io/$TARGET_IP/json" | jq .

# 2. Periksa Reputasi IP (Abuse Database via AbuseIPDB)
curl -s "https://api.abuseipdb.com/api/v2/check?ipAddress=$TARGET_IP" \
  -H "Key: YOUR_API_KEY" | jq '.data.abuseConfidenceScore'

# 3. Query BGP Routing & Upstream Provider via RADb
whois -h whois.radb.net "$TARGET_IP" | grep -iE "route:|origin:|descr:"
```

---

### 6.2 Shodan Intelligence Framework

Shodan memindai seluruh alamat IPv4 di internet secara terus-menerus dan mengindeks banner layanan (HTTP, SSH, FTP, Telnet, RDP).

Bash

```
# 1. Inisialisasi API Key Shodan (Daftar gratis di shodan.io)
shodan init "YOUR_SHODAN_API_KEY"

# 2. Cek status satu host IP spesifik (Port terbuka, CVE, ISP)
shodan host "$TARGET_IP"

# 3. Pencarian Berdasarkan Organisasi atau Nama Domain
shodan search "org:'Target Corporation'" --fields ip_str,port,hostnames

# 4. Download hasil pencarian dalam bentuk file terkompresi
shodan download ~/osint/reports/shodan_results "hostname:$TARGET"
shodan parse --fields ip_str,port,transport ~/osint/reports/shodan_results.json.gz
```

#### Kueri Shodan Dork Penting:

text

```
# Mencari host target yang rentan Log4j (CVE-2021-44228)
org:"InsecureBank" vuln:CVE-2021-44228

# Mencari database MongoDB terbuka tanpa autentikasi milik target
org:"InsecureBank" port:27017 "MongoDB Server Information"

# Mencari service RDP (Port 3389) yang terekspos
org:"InsecureBank" port:3389

# Mencari title Login Panel
org:"InsecureBank" http.title:"Login"
```

---

### 6.3 Komparasi Search Engine Infrastruktur

- **Shodan:** Fokus utama pada perangkat IoT, server, industrial control systems (ICS), dan banner port mentah.
- **Censys (`search.censys.io`):** Fokus pada validasi sertifikat SSL/TLS X.509 dan mapping infrastruktur web virtual hosts.
- **FOFA (`fofa.info`):** Database scanning global yang sangat kuat untuk aset-aset di wilayah Asia Pasifik.

---

## 🔓 Bagian 7: Breach & Credential Intelligence

### 7.1 Pencarian Data Breach Publik

Bash

```
# 1. Memeriksa keterlibatan email dalam kebocoran data historis
# Layanan resmi: https://haveibeenpwned.com
# Menggunakan API HIBP:
HIBP_KEY="YOUR_HIBP_API_KEY"
curl -s "https://haveibeenpwned.com/api/v3/breachedaccount/$TARGET_EMAIL?truncateResponse=false" \
  -H "hibp-api-key: $HIBP_KEY" | jq '.[].Name'

# 2. Layanan Investigasi Kredensial Agregator
# DeHashed (dehashed.com) & IntelX (intelx.io)
# Digunakan untuk mencari hash password, plaintext password lama, dan username history.
```

---

### 7.2 Monitoring Paste Sites

Pastebin sering digunakan hacker untuk membuang database dump atau dokumen rahasia perusahaan:

Bash

```
# Menggunakan cURL scraping terhadap Google Search untuk paste site
curl -s "https://html.duckduckgo.com/html/?q=site:pastebin.com+$TARGET" | grep -oE "https://pastebin.com/[a-zA-Z0-9]+" | sort -u
```

---

### 7.3 Dark Web Mentions (Konteks CTF & Threat Intelligence)

> **Catatan Legal & Etika:**  
> Menelusuri dark web harus dilakukan strictly untuk riset defensif. Jangan pernah mengunduh konten ilegal atau berinteraksi secara finansial di pasar underground.

Bash

```
# 1. Pastikan service Tor berjalan di Parrot OS
sudo systemctl enable --now tor
curl --socks5-hostname 127.0.0.1:9050 -s https://check.torproject.org/ | grep -i "Congratulations"

# 2. OnionSearch CLI (Mencari term di berbagai search engine .onion seperti Ahmia)
pip3 install onionsearch --break-system-packages
onionsearch "$TARGET" --engines ahmia,torch,haystak --output ~/osint/reports/onion_results.txt
```

---

## 🎯 Bagian 8: 8 Common CTF OSINT Patterns

### Pattern 1: Person Identification via Social Handle

- **Indikasi / Trigger:** Deskripsi challenge memberikan username fiksi (contoh: `c00lh4ck3r_2024`).
- **Tools:** `sherlock`
- **Command:**
    
    Bash
    
    ```
    sherlock c00lh4ck3r_2024
    ```
    
- **Cara Baca Hasil:** Kunjungi akun GitHub atau Twitter yang ditemukan. Periksa bio, commit code pertama, atau pinned tweet untuk menemukan flag: `flag{us3rn4m3_r3us3_f41l}`.

---

### Pattern 2: Geolocation dari Foto (Landmark / Street Sign)

- **Indikasi / Trigger:** Challenge memberikan file `challenge.jpg` berupa foto jalan tanpa metadata EXIF.
- **Tools:** Yandex Images, Google Street View.
- **Metode:**
    1. Crop bagian plang toko atau rambu jalan.
    2. Unggah ke Yandex Visual Search.
    3. Cocokkan nama jalan dan nomor bangunan di Google Street View untuk mendapatkan koordinat presisi.

---

### Pattern 3: Ekstraksi Koordinat GPS dari EXIF

- **Indikasi / Trigger:** Challenge menyediakan file gambar asli langsung dari kamera.
- **Tools:** `exiftool`
- **Command:**
    
    Bash
    
    ```
    exiftool -c "%.6f" -GPSPosition image.jpg
    ```
    
- **Output:** `GPS Position: 48.858370 N, 2.294481 E` (Koordinat Menara Eiffel →→ Format flag: `flag{48.858370,2.294481}`).

---

### Pattern 4: Menemukan Secret di Commit History GitHub

- **Indikasi / Trigger:** Challenge memberikan URL profil GitHub developer.
- **Tools:** Git CLI & `trufflehog`
- **Command:**
    
    Bash
    
    ```
    git clone https://github.com/target/challenge-repo.git
    cd challenge-repo
    git log -p -S "flag"
    ```
    
- **Cara Baca Hasil:** Flag tersembunyi pada baris diff berwarna merah (baris yang dihapus pada commit perbaikan).

---

### Pattern 5: Subdomain Discovery Menuju Hidden Admin Panel

- **Indikasi / Trigger:** Website utama tidak memiliki celah, deskripsi menyebutkan "layanan internal kami aman".
- **Tools:** `subfinder` & `httpx`
- **Command:**
    
    Bash
    
    ```
    subfinder -d target.ctf -silent | httpx -title -status-code
    ```
    
- **Cara Baca Hasil:** Subdomain `dev-portal.target.ctf` mengembalikan status `200 OK` dengan form login default.

---

### Pattern 6: Email Enumeration & Platform Registration Mapping

- **Indikasi / Trigger:** Soal CTF hanya memberikan email: `target_agent@gmail.com`.
- **Tools:** `holehe`
- **Command:**
    
    Bash
    
    ```
    holehe target_agent@gmail.com
    ```
    
- **Cara Baca Hasil:** Output menunjukkan email terdaftar di platform tertentu (misal: Chess.com atau Pinterest). Cari profile target pada platform tersebut untuk menemukan pesan rahasia.

---

### Pattern 7: Menemukan File/Halaman Dihapus via Wayback Machine

- **Indikasi / Trigger:** Halaman target menghasilkan 404 Not Found, deskripsi soal berkata "kami sudah menghapus pengumuman tersebut kemarin".
- **Tools:** `waybackurls` / `web.archive.org`
- **Command:**
    
    Bash
    
    ```
    waybackurls target.com | grep -i "announcement"
    ```
    
- **Cara Baca Hasil:** Ambil URL snapshot lama di `web.archive.org/web/*/<URL>` untuk membaca teks sebelum dihapus.

---

### Pattern 8: Analisis DNS TXT Record

- **Indikasi / Trigger:** Domain challenge tidak memiliki website aktif (connection refused pada port 80/443).
- **Tools:** `dig`
- **Command:**
    
    Bash
    
    ```
    dig target.ctf TXT +short
    ```
    
- **Cara Baca Hasil:** Output menampilkan TXT record: `"flag=picoCTF{dns_txt_r3c0rds_c4n_h1d3_s3cr3ts}"`.

---

## 🤖 Bagian 9: Automation & Reporting

### 9.1 Bash Script Reconnaissance Otomatis (`osint_recon.sh`)

Simpan script berikut sebagai `/usr/local/bin/osint_recon.sh` dan berikan izin eksekusi (`chmod +x`):

Bash

```bash
#!/bin/bash
# ==============================================================================
# Automated OSINT Reconnaissance Script for Target Domain
# Target Environment: Parrot OS
# ==============================================================================

set -uo pipefail
trap 'echo "[!] Warning: Operational error at line $LINENO, continuing execution..."' ERR

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <target-domain.com>"
    exit 1
fi

TARGET="$1"
OUT_DIR="$HOME/osint/targets/$TARGET"
mkdir -p "$OUT_DIR"

echo "=============================================================================="
echo "                  AUTOMATED OSINT RECONNAISSANCE REPORT                       "
echo "=============================================================================="
echo "[*] Target Domain : $TARGET"
echo "[*] Output Folder : $OUT_DIR"
echo "=============================================================================="

# 1. WHOIS
echo "[+] 1. Menjalankan WHOIS lookup..."
whois "$TARGET" > "$OUT_DIR/whois.txt" 2>&1 || true

# 2. DNS RECORDS
echo "[+] 2. Mengumpulkan DNS records..."
{
    echo "=== RECORD A ==="
    dig "$TARGET" A +short
    echo "=== RECORD MX ==="
    dig "$TARGET" MX +short
    echo "=== RECORD TXT ==="
    dig "$TARGET" TXT +short
    echo "=== RECORD NS ==="
    dig "$TARGET" NS +short
} > "$OUT_DIR/dns_records.txt" || true

# 3. SUBDOMAINS & HTTP PROBE
echo "[+] 3. Enumerasi Subdomain (Subfinder & crt.sh)..."
subfinder -d "$TARGET" -silent > "$OUT_DIR/subfinder.txt" 2>/dev/null || true
curl -s "https://crt.sh/?q=%.$TARGET&output=json" 2>/dev/null | jq -r '.[].name_value' 2>/dev/null | sed 's/^\*\.//' | grep -v '^\*' | sort -u > "$OUT_DIR/crtsh.txt" || true
cat "$OUT_DIR/subfinder.txt" "$OUT_DIR/crtsh.txt" | sort -u | grep -E "\.$TARGET$" > "$OUT_DIR/final_subdomains.txt" || true

echo "[+] 3b. Filtering Subdomain Aktif via httpx..."
cat "$OUT_DIR/final_subdomains.txt" | httpx -silent -status-code -title -o "$OUT_DIR/live_subdomains.txt" 2>/dev/null || true

# 4. WEB FINGERPRINTING
echo "[+] 4. Web fingerprinting & technologies..."
whatweb -a 1 "https://$TARGET" > "$OUT_DIR/whatweb.txt" 2>&1 || true
curl -s -L "https://$TARGET/robots.txt" > "$OUT_DIR/robots.txt" 2>/dev/null || true

# 5. WAYBACK URLs
echo "[+] 5. Mengambil histori URL dari Wayback Machine..."
waybackurls "$TARGET" 2>/dev/null | head -n 100 > "$OUT_DIR/wayback_urls.txt" || true

echo ""
echo "=============================================================================="
echo "[+] RECONNAISSANCE SELESAI!"
echo "[+] Ringkasan:"
echo "    - Subdomain unik ditemukan : $(wc -l < "$OUT_DIR/final_subdomains.txt" 2>/dev/null || echo 0)"
echo "    - Subdomain aktif (live)   : $(wc -l < "$OUT_DIR/live_subdomains.txt" 2>/dev/null || echo 0)"
echo "    - URL arsip ditemukan      : $(wc -l < "$OUT_DIR/wayback_urls.txt" 2>/dev/null || echo 0)"
echo "    - Direktori laporan        : $OUT_DIR"
```

---

### 9.2 SpiderFoot Automation

SpiderFoot adalah engine otomasi OSINT modular yang mengintegrasikan ratusan data source:

Bash

```
# 1. Menjalankan SpiderFoot Web Server di Localhost
cd /opt/spiderfoot
python3 ./sf.py -l 127.0.0.1:5001 &

# 2. Akses Web UI di browser Parrot OS:
# http://127.0.0.1:5001

# 3. Eksekusi Headless Scanning via CLI:
python3 ./sf.py -s "$TARGET" -t INTERNET_NAME -m sfp_whois,sfp_dnsresolve,sfp_crt -o tab
```

---

### 9.3 Template Laporan Investigasi OSINT

Gunakan format laporan Markdown berikut untuk mendokumentasikan temuan secara profesional:

Markdown

```
# Laporan Investigasi OSINT: [Nama Target / Organisasi]

## 1. Ringkasan Eksekutif
- **Target Utama:** target.com / @username
- **Tanggal Investigasi:** YYYY-MM-DD
- **Penyelidik:** [Nama/Handle]
- **Tujuan:** (CTF Flag Recovery / Attack Surface Assessment)

## 2. Infrastruktur & Domain
- **Registrar & Expiry:** [Data WHOIS]
- **Name Servers:** [Cloudflare / Route53]
- **Mail Server (MX):** [Google Workspace / M365]
- **Subdomain Kritis Teridentifikasi:**
  - `vpn.target.com` (IP: x.x.x.x)
  - `dev-api.target.com` (IP: x.x.x.x)

## 3. Identitas & Email
- **Email Terpapar:**
  - `ceo@target.com` -> Terdaftar di LinkedIn, Twitter
  - `dev@target.com` -> Terlibat dalam Data Breach Adobe (2013)

## 4. Temuan Kredensial & Secrets
- **GitHub Leaks:** URL repo memuat token AWS S3 aktif pada commit hash `abc1234`.
- **Pastebin Mentions:** Dump database internal pada `pastebin.com/xyz`.

## 5. Analisis Risiko & Rekomendasi
- Nonaktifkan direktori listing pada sub-domain dev.
- Revoke API key yang terpapar di repositori publik.
```

---

## 🗺️ Bagian 10: Master OSINT Decision Tree

text

```
                          [ TARGET AWAL DITERIMA ]
                                     │
         ┌──────────────┬────────────┼────────────┬──────────────┐
         ▼              ▼            ▼            ▼              ▼
    [ DOMAIN ]      [ EMAIL ]   [ USERNAME ]   [ FOTO/IMAGE ]  [ IP ADDR ]
         │              │            │            │              │
         ├► WHOIS/RDAP  ├► holehe    ├► sherlock  ├► exiftool    ├► ipinfo
         ├► DNS (dig)   ├► HIBP      ├► GitHub    │  (Cek GPS)   ├► Shodan
         ├► Subfinder   └► Hunter.io └► Medsos    ├► Yandex      ├► Censys
         ├► crt.sh                                │  Reverse Img └► AbuseIPDB
         └► Wayback                               └► SunCalc/OSM
```

---

## 🛠️ Bagian 11: Common Errors & Troubleshooting

|Gejala Masalah / Error|Akar Penyebab|Solusi Penanganan Pentester|
|---|---|---|
|`Amass scanning berjalan sangat lambat`|Default konfigurasi Amass menjalankan brute force aktif dan resolusi DNS massal.|Gunakan flag pasif murni: `amass enum -passive -d target.com`.|
|`Shodan CLI: "Invalid API key"`|API key belum diinisialisasi atau kuota bulanan free tier habis.|Periksa key: `shodan info`. Buat akun baru atau gunakan Censys sebagai alternatif.|
|`Sherlock: Menampilkan false positive`|Beberapa website merespons status HTTP 200 pada halaman user not found.|Verifikasi manual: buka tautan yang ditemukan di browser untuk memastikan profil benar-benar eksis.|
|`ExifTool: Tidak menampilkan koordinat GPS`|Metadata telah dihapus (_stripped_) oleh platform saat diunggah (WhatsApp/Twitter/IG).|Lanjutkan investigasi visual: reverse image search di Yandex atau analisis landmark lingkungan.|
|`WHOIS: Registrant Data Redacted for Privacy`|Aturan kepatuhan GDPR menyamarkan identitas pemilik domain.|Gunakan Reverse DNS, periksa record historical WHOIS di `securitytrails.com`, atau audit sertifikat TLS di crt.sh.|
|`Google Dorking memunculkan CAPTCHA blocking`|Mengirimkan dork query berulang secara cepat dari satu IP publik.|Gunakan search engine alternatif yang tidak memblokir: DuckDuckGo (`html.duckduckgo.com`) atau Startpage.|
|`theHarvester: Mengembalikan 0 hasil`|Search engine publik mengubah tata letak HTML atau memblokir scraper default.|Tentukan spesifik data sources aktif: `theHarvester -d target.com -b crtsh,bing,duckduckgo`.|
|`HaveIBeenPwned API: 401 Unauthorized`|Sejak versi v3, API HIBP mewajibkan API key berbayar untuk direct query email.|Gunakan antarmuka web langsung (`haveibeenpwned.com`) atau gunakan tool `holehe` untuk platform mapping.|
|`Subdomain hasil enumerasi tidak aktif (NXDOMAIN)`|File arsip crt.sh atau wayback mencatat domain lama yang sudah mati.|Filter subdomain aktif secara otomatis menggunakan `httpx`: `cat subs.txt \| httpx -silent > live_subs.txt`.|
|`Holehe: Rate limit pada platform tertentu`|Mengirim terlalu banyak pengecekan email dalam rentang waktu singkat ke satu provider.|Gunakan koneksi VPN atau alihkan IP melalui Tor proxy menggunakan `torsocks holehe target@email.com`.|

---

## 📋 Bagian 12: Cheatsheet Copy-Paste Ready

### 1. Domain Quick Recon

Bash

```
# Query WHOIS dan DNS penting
whois "$TARGET" | grep -iE "Registrar:|Creation Date:|Name Server:"
dig "$TARGET" ANY +noall +answer
dig "$TARGET" TXT +short

# Subdomain discovery pasif instan
subfinder -d "$TARGET" -silent -o subfinder.txt
curl -s "https://crt.sh/?q=%.$TARGET&output=json" | jq -r '.[].name_value' | sort -u > crtsh.txt
```

### 2. Email Investigation

Bash

```
# Pemetaan akun media sosial terdaftar dari email
holehe "$TARGET_EMAIL" --only-used

# Validasi mail exchanger domain email target
dig $(echo "$TARGET_EMAIL" | cut -d@ -f2) MX +short
```

### 3. Username Hunting

Bash

```
# Pemburuan username silang 350+ platform
sherlock "$TARGET_USER" --timeout 10

# Pencarian repositori GitHub milik user
curl -s "https://api.github.com/users/$TARGET_USER/repos" | jq '.[].html_url'
```

### 4. Image & Metadata Analysis

Bash

```
# Ekstraksi koordinat GPS decimal
exiftool -c "%.6f" -GPSLatitude -GPSLongitude "$TARGET_IMG"

# Membersihkan seluruh metadata gambar (Sanitasi OPSEC)
exiftool -all= "$TARGET_IMG"
```

### 5. IP & Infrastructure

Bash

```
# Resolusi IP geolocation dan organisasi ASN
curl -s "https://ipinfo.io/$TARGET_IP/json" | jq .

# Inspeksi banner host via Shodan CLI
shodan host "$TARGET_IP"
```

### 6. CTF OSINT Quick Wins

Bash

```
# Ekstraksi seluruh URL arsip Wayback Machine
waybackurls "$TARGET" | sort -u > wayback.txt

# Menemukan file konfigurasi rahasia yang terindeks
curl -s "https://html.duckduckgo.com/html/?q=site:$TARGET+filetype:env" | grep -oE "https?://[^ ]+"
```

---

## 🔗 Navigasi Workflow

# [⚡ Quick Start: Urutan Kerja OSINT (Untuk Pemula)](/docs/osint) — Interactive Decision Workflow

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment & OPSEC

Bash

```
# Jalankan INI DULU sebelum apapun — Satu kali di awal sesi
export TARGET="insecurebank.com"           # Domain target
export TARGET_IP=""                         # Isi setelah resolve
export TARGET_EMAIL="admin@insecurebank.com"
export TARGET_USER="shadow_alex99"

# Buat workspace terisolasi
mkdir -p ~/osint/targets/$TARGET/{domains,emails,usernames,images,social,creds,reports}
cd ~/osint/targets/$TARGET

# WAJIB: Verifikasi IP publik sebelum mulai (OPSEC check)
curl -s ifconfig.me
echo ""
curl -s https://ipinfo.io/json | python3 -m json.tool | grep -E '"ip"|"org"|"country"'
```

**Output yang diharapkan:**

text

```
185.220.101.45
{
  "ip": "185.220.101.45",
  "org": "AS0 VPN Provider",
  "country": "NL"
}
```

**OUTPUT GAGAL ❌ — IP asli terlihat (bukan VPN/Tor):**

text

```
{
  "ip": "112.215.xx.xx",
  "org": "AS17451 TELKOM-AS",
  "country": "ID"
}
```

➡️ **STOP! Jangan lanjut sebelum nyalakan VPN.** IP asli kamu akan masuk ke access log target jika melakukan active OSINT.

Bash

```
# Nyalakan VPN dulu, lalu verifikasi ulang
curl -s ifconfig.me
# Atau gunakan Tor untuk anonimitas lebih tinggi:
sudo systemctl start tor
curl --socks5-hostname 127.0.0.1:9050 -s ifconfig.me
```

---

## ═══════════════════════════════════════

## FASE 0: TENTUKAN TIPE TARGET & STRATEGI

## ═══════════════════════════════════════

> **Tujuan:** Sebelum mulai, pahami jenis input yang kamu punya. Setiap tipe target punya jalur investigasi yang berbeda.

### Langkah 0.1 — Identifikasi Tipe Target

Bash

```
# Tentukan apa yang kamu punya:
echo "=== TIPE TARGET ==="
echo "1. Domain/URL  → contoh: insecurebank.com"
echo "2. Email       → contoh: admin@insecurebank.com"
echo "3. Username    → contoh: shadow_alex99"
echo "4. IP Address  → contoh: 185.199.108.153"
echo "5. Foto/Image  → contoh: mystery.jpg"
echo "6. Nama Orang  → contoh: John Smith"
```

**Berdasarkan tipe target, pilih jalur:**

|Tipe Target|Mulai Dari|Estimasi Waktu|
|---|---|---|
|Domain|Fase 1 (WHOIS + DNS)|30-60 menit|
|Email|Fase 4 (Email Intel)|15-30 menit|
|Username|Fase 5 (Username Hunt)|10-20 menit|
|IP Address|Fase 6 (IP Intel)|10-15 menit|
|Foto/Image|Fase 7 (GeoINT)|20-60 menit|
|Nama Orang|Fase 5 + Google Dorks|30-90 menit|

> **📌 CTF TIP:** Di CTF, seringkali clue ada di deskripsi soal. Keywords seperti "username", "website", "foto" langsung menunjukkan jalur mana yang harus diambil pertama.

---

## ═══════════════════════════════════════

## FASE 1: DOMAIN INTELLIGENCE (WHOIS & DNS)

## ═══════════════════════════════════════

> **Tujuan:** Kumpulkan semua informasi publik tentang domain target — siapa yang mendaftarkan, kapan, server apa yang digunakan, dan records DNS yang ada.

### Langkah 1.1 — WHOIS Query

Bash

```
# Command 1: WHOIS standar
whois "$TARGET" > domains/whois_raw.txt

# Command 2: Filter info penting
cat domains/whois_raw.txt | grep -iE "Registrar:|Creation Date:|Registry Expiry Date:|Name Server:|Registrant Email:|Admin Email:"

# Command 3: RDAP (format JSON lebih terstruktur)
curl -s "https://rdap.org/domain/$TARGET" | python3 -m json.tool | grep -A3 -iE "ldhName|status|registrant"
```

**OUTPUT BERHASIL ✅ — Registrant email terlihat (tidak di-privacy):**

text

```
Registrar: GoDaddy.com, LLC
Creation Date: 2018-03-15T10:23:45Z
Registry Expiry Date: 2025-03-15T10:23:45Z
Name Server: ns1.cloudflare.com
Name Server: ns2.cloudflare.com
Registrant Email: john.admin@gmail.com
```

**Analisis dan tindakan:**

Bash

```
# Jika ketemu email registrant → lanjut ke Fase 4 (Email Intel)
export REG_EMAIL="john.admin@gmail.com"

# Cari domain lain yang didaftarkan email yang sama (Reverse WHOIS)
echo "[*] Cek Reverse WHOIS di: https://viewdns.info/reversewhois/?q=$REG_EMAIL"
# Buka di browser → bisa ketemu domain lain milik target

# Simpan nama server (penting untuk zone transfer)
echo "ns1.cloudflare.com" >> domains/nameservers.txt
echo "ns2.cloudflare.com" >> domains/nameservers.txt

# Jika target pakai Cloudflare → catat! Nanti perlu bypass untuk IP asli
echo "[!] Target menggunakan Cloudflare — IP yang terlihat bukan IP asli server"
```

**OUTPUT — Registrant Email tersembunyi (GDPR/Privacy):**

text

```
Registrant Email: Please query the RDDS service of the Registrar of Record
# atau: Registrant Email: REDACTED FOR PRIVACY
```

➡️ Email tersembunyi. Coba cara lain:

Bash

```
# Cara 1: Cek SecurityTrails untuk historical WHOIS (sebelum privacy aktif)
echo "[*] Buka: https://securitytrails.com/domain/$TARGET/history/whois"

# Cara 2: Cek sertifikat TLS untuk email tersembunyi
curl -s "https://crt.sh/?q=$TARGET&output=json" | python3 -m json.tool | grep -i "email" | head -5

# Cara 3: Lanjut ke DNS records untuk info lain
```

**OUTPUT GAGAL ❌ — Domain tidak ditemukan:**

text

```
No whois server is known for this kind of object.
# atau: WHOIS lookup failed
```

➡️ Coba format lain atau WHOIS server alternatif:

Bash

```
# Coba tanpa www
whois "${TARGET#www.}"

# Coba whois server spesifik untuk TLD
whois -h whois.verisign-grs.com "$TARGET"  # untuk .com
whois -h whois.nic.id "$TARGET"            # untuk .id
```

---

### Langkah 1.2 — DNS Intelligence (Semua Record Sekaligus)

Bash

```
# Command 1: Query semua record penting sekaligus
echo "=== DNS RECORDS: $TARGET ===" | tee domains/dns_records.txt

echo "--- A Record (IPv4) ---" >> domains/dns_records.txt
dig "$TARGET" A +short | tee -a domains/dns_records.txt

echo "--- AAAA Record (IPv6) ---" >> domains/dns_records.txt
dig "$TARGET" AAAA +short | tee -a domains/dns_records.txt

echo "--- MX Records (Mail Server) ---" >> domains/dns_records.txt
dig "$TARGET" MX +short | tee -a domains/dns_records.txt

echo "--- TXT Records (SPF/DKIM/DMARC/Verification) ---" >> domains/dns_records.txt
dig "$TARGET" TXT +short | tee -a domains/dns_records.txt

echo "--- NS Records (Name Server) ---" >> domains/dns_records.txt
dig "$TARGET" NS +short | tee -a domains/dns_records.txt

echo "--- SOA Record ---" >> domains/dns_records.txt
dig "$TARGET" SOA +short | tee -a domains/dns_records.txt

# Command 2: Reverse DNS dari IP yang ditemukan
TARGET_IP=$(dig "$TARGET" A +short | head -1)
echo "[*] IP: $TARGET_IP"
export TARGET_IP
dig -x "$TARGET_IP" +short | tee -a domains/dns_records.txt
```

**OUTPUT BERHASIL ✅ — DNS records normal:**

text

```
--- A Record (IPv4) ---
104.21.23.45

--- MX Records ---
10 aspmx.l.google.com.
20 alt1.aspmx.l.google.com.

--- TXT Records ---
"v=spf1 include:_spf.google.com ~all"
"google-site-verification=abc123def456"
"MS=ms12345678"
```

**Analisis TXT Records — KRITIS untuk OSINT:**

|TXT Record|Artinya|Info yang Bisa Didapat|
|---|---|---|
|`v=spf1 include:_spf.google.com`|Pakai Google Workspace|Email target pakai Gmail/Workspace|
|`include:spf.protection.outlook.com`|Pakai Microsoft 365|Email target pakai Outlook/M365|
|`google-site-verification=xxx`|Terverifikasi Google|Ada Google Search Console|
|`MS=ms12345`|Verifikasi Microsoft|Ada Microsoft 365 tenant|
|`DKIM` record ada|Email signing aktif|Email anti-spoofing lebih ketat|
|`flag=...`|**CTF!**|Flag ada di TXT record! Langsung submit|

Bash

```
# Cek apakah ada flag di TXT record (CTF pattern!)
dig "$TARGET" TXT +short | grep -iE "flag\{|ctf\{|picoctf\{"
```

**OUTPUT BERHASIL ✅ — Flag di DNS TXT (CTF Pattern 8):**

text

```
"flag=picoCTF{dns_txt_r3c0rds_c4n_h1d3_s3cr3ts}"
```

➡️ **JACKPOT! Submit flag langsung.**

---

### Langkah 1.3 — Zone Transfer Test (AXFR)

Bash

```
# Test zone transfer ke semua name server yang ditemukan
echo "[*] Testing Zone Transfer (AXFR)..."
for ns in $(dig "$TARGET" NS +short); do
    echo "--- Testing: $ns ---"
    dig axfr "@$ns" "$TARGET" 2>/dev/null | head -30
done
```

**OUTPUT BERHASIL ✅ — Zone Transfer BERHASIL (Miskonfigurasi serius!):**

text

```
; <<>> DiG 9.16.1 <<>> axfr @ns1.insecurebank.com insecurebank.com
;; global options: +cmd
insecurebank.com.    3600  IN  SOA   ns1.insecurebank.com. ...
insecurebank.com.    3600  IN  NS    ns1.insecurebank.com.
admin.insecurebank.com.  3600  IN  A  10.0.1.50
dev.insecurebank.com.    3600  IN  A  10.0.1.51
internal.insecurebank.com. 3600 IN  A  192.168.1.100
vpn.insecurebank.com.    3600  IN  A  203.45.67.89
```

➡️ **JACKPOT!** Semua subdomain internal terekspos. Simpan semua:

Bash

```
dig axfr "@$ns" "$TARGET" | grep -E "^[a-zA-Z]" | awk '{print $1}' | sed 's/\.$//' \
  > domains/axfr_subdomains.txt
echo "[+] Subdomain dari AXFR: $(wc -l < domains/axfr_subdomains.txt)"
```

**OUTPUT — Zone Transfer ditolak (Normal):**

text

```
; Transfer failed.
# atau: REFUSED
```

➡️ Normal. Lanjut ke Langkah 1.4.

---

### Langkah 1.4 — Subdomain Enumeration (Passive)

Bash

```
# Command 1: Subfinder (multi-source passive)
subfinder -d "$TARGET" -silent -o domains/subfinder.txt
echo "[+] Subfinder: $(wc -l < domains/subfinder.txt) subdomains"

# Command 2: Certificate Transparency Logs (crt.sh)
curl -s "https://crt.sh/?q=%.$TARGET&output=json" 2>/dev/null \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
names = set()
for entry in data:
    for name in entry['name_value'].split('\n'):
        name = name.strip().lstrip('*.')
        if name and not name.startswith('*'):
            names.add(name)
for n in sorted(names):
    print(n)
" > domains/crtsh.txt 2>/dev/null
echo "[+] crt.sh: $(wc -l < domains/crtsh.txt) subdomains"

# Command 3: theHarvester (search engine sources)
theHarvester -d "$TARGET" -b bing,duckduckgo,yahoo -f domains/theharvester_out 2>/dev/null
grep -oE "[a-zA-Z0-9._-]+\.$TARGET" domains/theharvester_out.xml 2>/dev/null \
  > domains/theharvester_subs.txt

# Konsolidasi semua subdomain
cat domains/subfinder.txt domains/crtsh.txt domains/theharvester_subs.txt 2>/dev/null \
  | grep -E "\.$TARGET$|^$TARGET$" \
  | sort -u > domains/all_subdomains.txt
echo "[+] Total subdomain unik: $(wc -l < domains/all_subdomains.txt)"
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Subfinder: 45 subdomains
[+] crt.sh: 67 subdomains
[+] Total subdomain unik: 89
```

Bash

```
# Filter subdomain yang aktif dengan httpx
cat domains/all_subdomains.txt | \
  httpx -silent -status-code -title -tech-detect -timeout 10 \
  -o domains/live_subdomains.txt 2>/dev/null
echo "[+] Live subdomains: $(wc -l < domains/live_subdomains.txt)"
cat domains/live_subdomains.txt
```

**OUTPUT BERHASIL ✅ — Subdomain menarik ditemukan:**

text

```
https://dev.insecurebank.com [200] [Developer Portal - Login]
https://admin.insecurebank.com [302] [Admin Panel]
https://api.insecurebank.com [200] [API Gateway]
https://staging.insecurebank.com [200] [Staging Environment - DO NOT USE]
https://vpn.insecurebank.com [200] [OpenVPN Access Server]
https://jenkins.insecurebank.com [200] [Jenkins]
```

**Prioritas subdomain untuk investigasi lebih lanjut:**

|Subdomain|Mengapa Menarik|Tindakan|
|---|---|---|
|`admin.*`|Admin panel → coba default creds|→ ke 18_authentication_bypass|
|`dev.*`|Dev environment → sering tidak di-hardening|→ akses dan recon|
|`api.*`|API → bisa test endpoints tanpa auth|→ ke 30_api_security|
|`staging.*`|Testing env → debug info, verbose errors|→ recon langsung|
|`jenkins.*`|CI/CD → sering exposed credentials|→ coba akses|
|`*.s3.*`|S3 bucket → cek public access|→ `aws s3 ls s3://bucket-name`|

**OUTPUT GAGAL ❌ — Tidak ada subdomain ditemukan:**

text

```
[+] Total subdomain unik: 0
```

➡️ Domain sangat baru atau terlindungi. Coba:

Bash

```
# Coba dengan amass (lebih dalam)
amass enum -passive -d "$TARGET" -o domains/amass.txt 2>/dev/null

# Coba brute force subdomain (aktif — lebih berisiko terdeteksi)
# HANYA JIKA DIIZINKAN (CTF/lab environment)
subfinder -d "$TARGET" -silent -all | httpx -silent > domains/brute_live.txt

# Cek apakah ada wildcard DNS (bisa menyebabkan false positive)
dig "randomthiscannotexist123.${TARGET}" A +short
```

---

## ═══════════════════════════════════════

## FASE 2: WEBSITE INTELLIGENCE & FINGERPRINTING

## ═══════════════════════════════════════

> **Tujuan:** Kenali teknologi yang digunakan, temukan endpoint tersembunyi di arsip, dan cari file sensitif yang ter-index Google.

### Langkah 2.1 — Website Fingerprinting

Bash

```
# Command 1: WhatWeb — identifikasi teknologi web
whatweb -a 3 "https://$TARGET" 2>/dev/null | tee domains/whatweb.txt

# Command 2: Cek header HTTP
curl -s -I "https://$TARGET" | tee domains/http_headers.txt

# Command 3: Cek WAF
wafw00f "https://$TARGET" 2>/dev/null

# Command 4: File konfigurasi yang sering bocor
for path in robots.txt sitemap.xml .well-known/security.txt crossdomain.xml; do
    echo "--- /$path ---"
    curl -s -o /dev/null -w "%{http_code}" "https://$TARGET/$path"
    echo ""
done

# Command 5: Download robots.txt dan sitemap
curl -s "https://$TARGET/robots.txt" | tee domains/robots.txt
curl -s "https://$TARGET/sitemap.xml" | tee domains/sitemap.xml
```

**OUTPUT BERHASIL ✅ — robots.txt menarik:**

text

```
User-agent: *
Disallow: /admin/
Disallow: /internal/
Disallow: /backup/
Disallow: /api/v1/secret
# Flag: flag{r0b0ts_txt_h1d3s_s3cr3ts}
```

➡️ robots.txt mengandung path tersembunyi! Akses semua path yang di-disallow:

Bash

```
grep "Disallow:" domains/robots.txt | awk '{print $2}' | while read path; do
    echo "Testing: https://$TARGET$path"
    curl -s -o /dev/null -w "Status: %{http_code} → https://$TARGET$path\n" "https://$TARGET$path"
done
```

**OUTPUT BERHASIL ✅ — WhatWeb mendeteksi CMS/framework:**

text

```
WordPress[5.9.3], PHP[7.4.28], Apache[2.4.51]
# atau
jQuery[3.6.0], Bootstrap[5.1.3], React
# atau  
Django, nginx[1.18.0]
```

➡️ Identifikasi CMS → ke workflow sesuai:

- WordPress → `<a href="/docs/wordpress" class="text-[#00b4d8] hover:underline font-mono font-semibold">17a_wordpress_workflow.md</a>`
- Joomla → `<a href="/docs/joomla" class="text-[#00b4d8] hover:underline font-mono font-semibold">17b_joomla_workflow.md</a>`
- Drupal → `<a href="/docs/drupal-cms" class="text-[#00b4d8] hover:underline font-mono font-semibold">17c_drupal_workflow.md</a>`

---

### Langkah 2.2 — Wayback Machine & Historical URL Analysis

Bash

```
# Command 1: Ambil semua URL yang pernah di-crawl
waybackurls "$TARGET" | sort -u > domains/wayback_all.txt
echo "[+] Total historical URLs: $(wc -l < domains/wayback_all.txt)"

# Command 2: Filter URL yang mengandung file/path menarik
grep -iE "\.(sql|env|bak|backup|zip|tar|gz|config|conf|key|pem|cer)$" \
  domains/wayback_all.txt | tee domains/wayback_sensitive.txt

# Command 3: Filter endpoint API dan admin
grep -iE "/admin|/api/|/backup|/internal|/debug|/test|/dev" \
  domains/wayback_all.txt | sort -u | tee domains/wayback_interesting.txt

# Command 4: Filter parameter URL (kandidat SQLi, LFI, SSRF)
grep "?" domains/wayback_all.txt | sort -u | head -30 | tee domains/wayback_params.txt
```

**OUTPUT BERHASIL ✅ — File sensitif ditemukan di arsip:**

text

```
https://insecurebank.com/backup/db_backup_2023.sql
https://insecurebank.com/.env
https://insecurebank.com/api/v1/users?debug=true
```

➡️ Test apakah masih accessible:

Bash

```
# Test akses file yang ditemukan di wayback
while read url; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    echo "[$status] $url"
done < domains/wayback_sensitive.txt
```

**OUTPUT BERHASIL ✅ — Halaman lama 200 OK (CTF Pattern 7):**

text

```
[200] https://insecurebank.com/announcement-winner.html
```

➡️ Akses halaman tersebut langsung atau lewat Wayback Machine:

Bash

```
curl -s "https://insecurebank.com/announcement-winner.html" | grep -i "flag"
# Atau via Wayback Machine:
echo "https://web.archive.org/web/*/$url"
```

---

### Langkah 2.3 — Google Dorking (Passive)

Bash

```
# Google Dorks — buka di browser, JANGAN automasi (CAPTCHA)
# Simpan dork list untuk dijalankan manual

cat > domains/google_dorks.txt << EOF
# File sensitif
site:$TARGET filetype:env
site:$TARGET filetype:sql
site:$TARGET filetype:bak
site:$TARGET filetype:xlsx OR filetype:pdf
site:$TARGET filetype:config OR filetype:conf

# Admin dan login panel
site:$TARGET inurl:admin
site:$TARGET inurl:login
site:$TARGET intitle:"admin panel"
site:$TARGET intitle:"Index of /"

# Credential leaks
site:pastebin.com "$TARGET"
site:github.com "$TARGET" password
site:github.com "$TARGET" api_key OR secret OR token

# Subdomain discovery via Google
site:*.${TARGET}

# Error pages yang expose info
site:$TARGET intext:"Warning: mysql_"
site:$TARGET intext:"Fatal error"
EOF

echo "[*] Jalankan dork-dork berikut di browser:"
cat domains/google_dorks.txt | grep -v "^#" | head -20

# DuckDuckGo alternatif (tidak CAPTCHA, bisa semi-automasi)
for dork in "site:$TARGET filetype:env" "site:pastebin.com \"$TARGET\""; do
    echo "[*] DDG: $dork"
    curl -s "https://html.duckduckgo.com/html/?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$dork'))")" \
      | grep -oE "https?://[^ ']+" | grep -v "duckduckgo" | head -5
    sleep 2
done
```

**OUTPUT BERHASIL ✅ — File .env accessible:**

text

```
# Dari dork: site:insecurebank.com filetype:env
# URL: https://insecurebank.com/.env

DB_PASSWORD=SuperSecret123!
API_KEY=sk_live_abcdef123456
AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

➡️ Simpan semua credentials yang ditemukan:

Bash

```
echo "DB_PASSWORD=SuperSecret123!" >> creds/found_creds.txt
echo "API_KEY=sk_live_abcdef123456" >> creds/found_creds.txt
# → Lanjut ke Fase 8 untuk test credentials ini ke service lain
```

---

## ═══════════════════════════════════════

## FASE 3: GITHUB & CODE REPOSITORY INTELLIGENCE

## ═══════════════════════════════════════

> **Tujuan:** Developer sering tidak sengaja commit secrets ke GitHub. Ini salah satu sumber paling produktif untuk menemukan API key, password, dan credentials aktif.

### Langkah 3.1 — GitHub Organization & Repository Discovery

Bash

```
# Command 1: Cari organisasi GitHub terkait domain target
ORG_NAME=$(echo "$TARGET" | cut -d. -f1)   # ambil nama sebelum titik
echo "[*] Mencari GitHub org: $ORG_NAME"

# Cek via GitHub API
curl -s "https://api.github.com/orgs/$ORG_NAME/repos?per_page=50" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, list):
    for repo in data:
        print(f\"{repo['full_name']} - {repo['description']} - Stars: {repo['stargazers_count']}\")
else:
    print('Not found or private')
" 2>/dev/null | tee social/github_repos.txt

# Command 2: Cari user GitHub yang relate ke domain
curl -s "https://api.github.com/search/users?q=$TARGET" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for u in data.get('items', []):
    print(f\"{u['login']} - {u['html_url']}\")
" 2>/dev/null | head -10

# Command 3: Search code yang mention domain target
echo "[*] Buka browser: https://github.com/search?q=\"$TARGET\"&type=code"
```

**OUTPUT BERHASIL ✅ — Repository ditemukan:**

text

```
insecurebank/api-backend - Backend API for InsecureBank - Stars: 12
insecurebank/mobile-app - Android & iOS mobile app - Stars: 5
insecurebank/devops-scripts - Internal DevOps automation - Stars: 0
```

Bash

```
# Clone semua repo yang ditemukan
mkdir -p social/github_repos
cat social/github_repos.txt | awk '{print $1}' | while read repo; do
    git clone "https://github.com/$repo" "social/github_repos/$(echo $repo | tr '/' '_')" 2>/dev/null
    echo "[+] Cloned: $repo"
done
```

---

### Langkah 3.2 — Secret Scanning di Repository

Bash

```
# Untuk setiap repository yang di-clone:
for repo_dir in social/github_repos/*/; do
    echo "=== Scanning: $repo_dir ==="
    
    # TruffleHog — scanner secret paling akurat
    trufflehog git "file://$repo_dir" --only-verified 2>/dev/null | tee -a creds/trufflehog_findings.txt
    
    # Manual grep untuk patterns umum
    grep -rniE \
      "api[_-]?key|password|secret|token|bearer|aws_access|private_key|BEGIN RSA" \
      "$repo_dir" \
      --exclude-dir=".git" --include="*.py" --include="*.js" \
      --include="*.env" --include="*.config" --include="*.yml" \
      2>/dev/null | head -20 | tee -a creds/manual_scan.txt
done

# Scan commit history untuk secrets yang pernah di-commit lalu dihapus
for repo_dir in social/github_repos/*/; do
    echo "=== Commit History: $repo_dir ==="
    cd "$repo_dir"
    
    # Cari perubahan yang relate ke password/key di semua commit
    git log --all -p --follow -S "password" 2>/dev/null | grep "^+" | grep -i "password" | head -10
    git log --all -p --follow -S "api_key" 2>/dev/null | grep "^+" | grep -i "api_key" | head -10
    
    # Tampilkan commit messages yang mencurigakan
    git log --all --oneline 2>/dev/null | grep -iE "secret|password|key|fix|remove|delete|credential" | head -10
    
    cd - > /dev/null
done
```

**OUTPUT BERHASIL ✅ — TruffleHog menemukan secret:**

text

```
Found verified result 🐷🔑
Detector Type: AWS
Raw result: AKIAIOSFODNN7EXAMPLE
File: config/settings.py
Line: 45
Commit: abc123def456
```

**OUTPUT BERHASIL ✅ — Secret di commit yang sudah dihapus (CTF Pattern 4):**

text

```
git log --all -p -S "flag" 2>/dev/null | grep "^+" | grep -i "flag"
+    secret_flag = "flag{g1t_h1st0ry_n3v3r_l13s}"
```

➡️ **Flag ketemu di commit history!**

**OUTPUT GAGAL ❌ — Tidak ada secrets:**

text

```
(no output)
```

➡️ Lanjut ke Fase 4. Atau coba:

Bash

```
# Cari secrets di GitHub via search (manual di browser)
echo "[*] Buka: https://github.com/search?q=\"$TARGET\"+password&type=code"
echo "[*] Buka: https://github.com/search?q=\"$TARGET\"+api_key&type=code"
echo "[*] Coba juga Sourcegraph: https://sourcegraph.com/search?q=$TARGET"
```

---

## ═══════════════════════════════════════

## FASE 4: EMAIL INTELLIGENCE

## ═══════════════════════════════════════

> **Tujuan:** Dari sebuah email, kita bisa memetakan ke mana saja orang ini terdaftar, apakah emailnya ada di breach data, dan informasi akun Google mereka.

### Langkah 4.1 — Email Discovery dari Domain

Bash

```
# Command 1: theHarvester — harvest email dari search engines
theHarvester -d "$TARGET" -b google,bing,linkedin,duckduckgo \
  -f emails/theharvester_emails 2>/dev/null
grep -oE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" \
  emails/theharvester_emails.xml 2>/dev/null | sort -u | tee emails/discovered_emails.txt

# Command 2: Hunter.io via API (jika punya key)
# HUNTER_API="your_key_here"
# curl -s "https://api.hunter.io/v2/domain-search?domain=$TARGET&api_key=$HUNTER_API" \
#   | python3 -m json.tool | grep '"value"' | head -20

# Command 3: Cari email di Google
echo "[*] Dork: site:$TARGET intext:\"@$TARGET\""
echo "[*] Dork: \"@$TARGET\" filetype:pdf"

echo "[+] Emails found: $(wc -l < emails/discovered_emails.txt)"
cat emails/discovered_emails.txt
```

**OUTPUT BERHASIL ✅:**

text

```
admin@insecurebank.com
john.doe@insecurebank.com
support@insecurebank.com
hr@insecurebank.com
```

---

### Langkah 4.2 — Platform Registration Mapping (holehe)

Bash

```
# Untuk setiap email yang ditemukan
while read email; do
    echo "=== Checking: $email ==="
    holehe "$email" --only-used 2>/dev/null | grep "\[+\]" | tee -a emails/holehe_results.txt
    sleep 2  # Jangan terlalu cepat, bisa kena rate limit
done < emails/discovered_emails.txt

# Atau untuk satu email spesifik:
holehe "$TARGET_EMAIL" --only-used 2>/dev/null | tee emails/holehe_${TARGET_EMAIL//[@.]/_}.txt
```

**OUTPUT BERHASIL ✅:**

text

```
=== Checking: admin@insecurebank.com ===
[+] github.com (Registered)
[+] twitter.com (Registered)
[+] linkedin.com (Registered)
[+] chess.com (Registered)
[+] gitlab.com (Registered)
```

➡️ Username di GitHub/Twitter ketemu → ke Fase 5 untuk investigate profile.

Bash

```
# Kunjungi setiap platform yang terdeteksi
echo "[*] Cek profil GitHub: https://github.com/search?q=$TARGET_EMAIL"
echo "[*] Cek profil Twitter: cari email di Twitter search"
```

**OUTPUT BERHASIL ✅ — Email Gmail → GHunt:**

text

```
# Jika email adalah @gmail.com, gunakan GHunt untuk info lebih dalam
TARGET_GMAIL="target.person@gmail.com"
ghunt email "$TARGET_GMAIL" 2>/dev/null | tee emails/ghunt_result.txt
```

**Expected GHunt output:**

text

```
Name: John Administrator
Gaia ID: 123456789012345678901
Profile picture: https://lh3.googleusercontent.com/...
Maps Reviews: 15 reviews (mostly reviewed at "Jakarta, Indonesia")
Last activity: 2024-01-15
```

➡️ Dari Maps Reviews → bisa ketahui lokasi fisik target!

**OUTPUT GAGAL ❌ — holehe rate limited:**

text

```
[ERROR] Rate limited by platform
```

➡️ Gunakan Tor atau tunggu beberapa menit:

Bash

```
torsocks holehe "$TARGET_EMAIL" --only-used 2>/dev/null
```

---

### Langkah 4.3 — Breach Database Check

Bash

```
# Method 1: HaveIBeenPwned via API (butuh key berbayar)
# HIBP_KEY="your_key"
# curl -s "https://haveibeenpwned.com/api/v3/breachedaccount/$TARGET_EMAIL" \
#   -H "hibp-api-key: $HIBP_KEY" | python3 -m json.tool

# Method 2: Cek manual di web (GRATIS)
echo "[*] Cek breach di: https://haveibeenpwned.com/account/$TARGET_EMAIL"
echo "[*] Cek juga di: https://dehashed.com (berbayar, tapi cek gratis hash)"
echo "[*] IntelX search: https://intelx.io/?s=$TARGET_EMAIL"

# Method 3: Cari di paste sites
curl -s "https://html.duckduckgo.com/html/?q=site:pastebin.com+\"$TARGET_EMAIL\"" \
  | grep -oE "https://pastebin.com/[a-zA-Z0-9]+" | sort -u | head -10

# Method 4: Cari password dump di paste sites
for email in $(cat emails/discovered_emails.txt); do
    echo "--- Checking paste sites for: $email ---"
    curl -s "https://html.duckduckgo.com/html/?q=\"$email\"+password" \
      | grep -oE "https?://[a-zA-Z0-9./?=_-]+" | grep -iE "pastebin|hastebin|ghostbin" | head -3
    sleep 1
done
```

**OUTPUT BERHASIL ✅ — Email ada di breach:**

text

```
Breaches:
- Adobe (2013): Email + encrypted password
- LinkedIn (2016): Email + SHA-1 hashed password
- Collection #1 (2019): Email + plaintext password

# Dari paste site:
john.doe@insecurebank.com:Password123!   ← Plaintext password!
```

➡️ **Credentials dari breach → test ke service target:**

Bash

```
export BREACH_PASS="Password123!"
# Test langsung ke target
curl -s -X POST "https://$TARGET/login" \
  -d "email=$TARGET_EMAIL&password=$BREACH_PASS" | grep -i "success\|error\|flag"
# → ke <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a> jika ada SMB
# → ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a> jika ada SSH
```

---

## ═══════════════════════════════════════

## FASE 5: USERNAME & SOCIAL MEDIA INVESTIGATION

## ═══════════════════════════════════════

> **Tujuan:** Dari username target, lacak semua akun di internet, temukan informasi pribadi, dan hubungkan ke email/IP/identitas nyata.

### Langkah 5.1 — Cross-Platform Username Hunting (Sherlock)

Bash

```
# Command 1: Sherlock — cari di 350+ platform
sherlock "$TARGET_USER" --timeout 10 --print-found \
  --output usernames/${TARGET_USER}_sherlock.txt

echo "[+] Platforms found: $(grep -c "^\[+\]" usernames/${TARGET_USER}_sherlock.txt)"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Checking username shadow_alex99 on:
[+] GitHub: https://github.com/shadow_alex99
[+] Reddit: https://www.reddit.com/user/shadow_alex99
[+] Steam: https://steamcommunity.com/id/shadow_alex99
[+] Twitter: https://twitter.com/shadow_alex99
[+] HackerNews: https://news.ycombinator.com/user?id=shadow_alex99
[+] dev.to: https://dev.to/shadow_alex99
```

Bash

```
# Kunjungi setiap URL yang ditemukan dan simpan info penting
while read url; do
    echo "Visit: $url"
done < <(grep "^\[+\]" usernames/${TARGET_USER}_sherlock.txt | awk '{print $NF}')

# Investigasi GitHub profile secara mendalam
GH_USER="$TARGET_USER"
curl -s "https://api.github.com/users/$GH_USER" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Name:', d.get('name'))
print('Email:', d.get('email'))   # Sering bocor!
print('Location:', d.get('location'))
print('Company:', d.get('company'))
print('Blog:', d.get('blog'))
print('Bio:', d.get('bio'))
print('Repos:', d.get('public_repos'))
print('Created:', d.get('created_at'))
" 2>/dev/null | tee usernames/${GH_USER}_github_profile.txt
```

**OUTPUT BERHASIL ✅ — Email bocor di GitHub profile:**

text

```
Name: Alex Shadow
Email: alex.shadow99@gmail.com    ← EMAIL BOCOR!
Location: Jakarta, Indonesia
Company: InsecureBank Corp
Blog: https://alex-shadow.dev
Repos: 23
```

➡️ Email ketemu → ke Fase 4 untuk investigate email ini lebih lanjut.

**OUTPUT BERHASIL ✅ — Flag di GitHub bio/repo (CTF Pattern 1):**

text

```
Bio: CTF enthusiast | flag{us3rn4m3_c0nn3ct3d_4cr0ss_pl4tf0rms}
# atau di repo README:
grep -r "flag{" usernames/github_repos/
```

---

### Langkah 5.2 — Social Media Deep Dive

Bash

```
# Twitter/X investigation
TWITTER_USER="$TARGET_USER"
echo "[*] Twitter search: https://twitter.com/search?q=from:$TWITTER_USER"
echo "[*] Nitter (privacy): https://nitter.net/$TWITTER_USER"

# Analisis timeline untuk timezone (jam posting menunjukkan lokasi)
# Buka Nitter dan lihat jam posting terbanyak

# Reddit investigation
REDDIT_USER="$TARGET_USER"
curl -s "https://www.reddit.com/user/$REDDIT_USER/about.json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
print('Created:', d.get('created_utc'))
print('Comment karma:', d.get('comment_karma'))
print('Post karma:', d.get('link_karma'))
print('Verified email:', d.get('has_verified_email'))
" 2>/dev/null

# Lihat semua komentar user Reddit
curl -s "https://www.reddit.com/user/$REDDIT_USER/comments.json?limit=100" \
  | python3 -m json.tool | grep '"body"' | head -20

# LinkedIn intelligence (gunakan sock puppet account!)
echo "[*] LinkedIn: https://www.linkedin.com/search/results/people/?keywords=$TARGET_USER"
echo "[*] OPSEC: Pastikan pakai sock puppet atau anonymous browser!"
```

**OUTPUT BERHASIL ✅ — Info dari Reddit comments:**

text

```
"I'm a developer at InsecureBank, and we use AWS us-east-1 for our infrastructure"
"Our admin panel is at https://admin.insecurebank.com/dashboard"
"The API key format is IB-[16 hex chars]"
```

➡️ Informasi teknis internal bocor dari comment Reddit! Simpan semua:

Bash

```
echo "Infrastructure: AWS us-east-1" >> creds/intel_notes.txt
echo "Admin panel: https://admin.insecurebank.com/dashboard" >> creds/intel_notes.txt
```

---

## ═══════════════════════════════════════

## FASE 6: IP & INFRASTRUCTURE INTELLIGENCE

## ═══════════════════════════════════════

> **Tujuan:** Dari IP address, temukan semua port terbuka (tanpa scan aktif), CVE, hostname lain yang share IP, dan informasi infrastruktur cloud.

### Langkah 6.1 — IP Geolocation & ASN Analysis

Bash

```
# Command 1: ipinfo.io — detail lengkap
curl -s "https://ipinfo.io/$TARGET_IP/json" | python3 -m json.tool | tee domains/ip_info.txt

# Command 2: Reverse DNS
dig -x "$TARGET_IP" +short

# Command 3: BGP routing info
curl -s "https://api.bgpview.io/ip/$TARGET_IP" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', {})
prefixes = data.get('prefixes', [])
if prefixes:
    p = prefixes[0]
    print('ASN:', p.get('asn', {}).get('asn'))
    print('ASN Name:', p.get('asn', {}).get('name'))
    print('Prefix:', p.get('prefix'))
" 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

JSON

```
{
  "ip": "104.21.23.45",
  "hostname": "insecurebank.com",
  "org": "AS13335 Cloudflare, Inc.",
  "city": "San Francisco",
  "country": "US"
}
```

➡️ Jika **Cloudflare** → IP yang kelihatan adalah IP Cloudflare, bukan IP server asli. Perlu bypass:

Bash

```
# Cara bypass Cloudflare untuk dapatkan IP asli:

# Method 1: Historical DNS (sebelum pakai Cloudflare)
echo "[*] Cek: https://securitytrails.com/domain/$TARGET/history/a"

# Method 2: MX record sering tidak di-proxy
dig "$TARGET" MX +short
# Jika MX server bukan Cloudflare → IP server asli mail

# Method 3: Cari IP di certificate transparency
curl -s "https://crt.sh/?q=$TARGET&output=json" | python3 -m json.tool | grep "ip"

# Method 4: Shodan search
shodan search "ssl.cert.subject.cn:$TARGET" 2>/dev/null | head -5
```

---

### Langkah 6.2 — Shodan Intelligence

Bash

```
# Setup Shodan (daftar gratis di shodan.io, API key gratis tersedia)
# shodan init "YOUR_SHODAN_API_KEY"

# Command 1: Cek host spesifik
shodan host "$TARGET_IP" 2>/dev/null | tee domains/shodan_host.txt

# Command 2: Cari semua aset organisasi
shodan search "org:\"$TARGET\"" --fields ip_str,port,hostnames 2>/dev/null \
  | head -20 | tee domains/shodan_org.txt

# Command 3: Cari berdasarkan hostname
shodan search "hostname:$TARGET" --fields ip_str,port,transport 2>/dev/null \
  | head -20

# Command 4: Shodan dorks untuk find services
echo "=== SHODAN DORK REFERENCE ==="
echo "ssl:\"$TARGET\"                    ← Find all servers with cert"
echo "http.title:\"$TARGET\"             ← Find by page title"
echo "org:\"InsecureBank\" port:22       ← SSH servers"
echo "org:\"InsecureBank\" port:3389     ← RDP exposed"
echo "org:\"InsecureBank\" port:27017    ← MongoDB open"
echo "org:\"InsecureBank\" vuln:CVE-2021-44228  ← Log4Shell"
```

**OUTPUT BERHASIL ✅ — Shodan menunjukkan banyak port:**

text

```
104.21.23.45
Hostnames: insecurebank.com, api.insecurebank.com
Ports: 22, 80, 443, 3306, 8080, 8443
CVEs: CVE-2021-41773, CVE-2021-42013

22/tcp SSH → OpenSSH 7.4
3306/tcp MySQL → 5.7.36
8080/tcp HTTP → Apache Tomcat 9.0.45
```

➡️ **MySQL port 3306 exposed!** Dan ada CVE kritis:

Bash

```
# Note ke file
echo "Port 3306 (MySQL) terbuka di internet - coba akses langsung" >> creds/intel_notes.txt
echo "CVE-2021-41773 - Apache path traversal" >> creds/intel_notes.txt
# → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a> untuk MySQL
```

**OUTPUT GAGAL ❌ — Shodan tidak ada data:**

text

```
No information available for that IP.
```

➡️ IP baru atau di-block Shodan. Coba Censys:

Bash

```
# Censys sebagai alternatif Shodan (butuh API key gratis)
echo "[*] Cek: https://search.censys.io/hosts/$TARGET_IP"
echo "[*] Cek: https://fofa.info/result?qbase64=$(echo -n "ip=\"$TARGET_IP\"" | base64)"
```

---

## ═══════════════════════════════════════

## FASE 7: IMAGE & GEOLOCATION INTELLIGENCE (GeoINT)

## ═══════════════════════════════════════

> **Tujuan:** Dari sebuah foto, identifikasi lokasi fisik, waktu pengambilan, dan perangkat yang digunakan. Keterampilan krusial untuk CTF OSINT/GeoINT.

### Langkah 7.1 — EXIF Metadata Analysis

Bash

```
TARGET_IMG="mystery_photo.jpg"

# Command 1: Semua metadata
exiftool "$TARGET_IMG" | tee images/exif_full.txt

# Command 2: GPS spesifik (format decimal degree)
exiftool -c "%.6f" -GPSLatitude -GPSLongitude -GPSAltitude -DateTimeOriginal \
  -Make -Model -Software "$TARGET_IMG" | tee images/exif_key.txt

# Command 3: Konversi ke koordinat Google Maps
LAT=$(exiftool -c "%.6f" -GPSLatitude "$TARGET_IMG" 2>/dev/null | awk '{print $NF}')
LON=$(exiftool -c "%.6f" -GPSLongitude "$TARGET_IMG" 2>/dev/null | awk '{print $NF}')
echo "[*] Google Maps: https://maps.google.com/?q=$LAT,$LON"
```

**OUTPUT BERHASIL ✅ — GPS ditemukan (CTF Pattern 3):**

text

```
GPS Latitude  : 40.748433
GPS Longitude : -73.985700
Date/Time     : 2023:10:18 14:23:10
Camera Make   : Apple
Camera Model  : iPhone 14 Pro
```

➡️ Konversi dan submit:

Bash

```
echo "[*] Koordinat: $LAT, $LON"
echo "[*] Maps link: https://maps.google.com/?q=$LAT,$LON"
# Format flag biasanya: flag{LAT,LON} atau flag{LAT_LON}
echo "Possible flag: flag{${LAT},${LON}}"
echo "Possible flag: flag{${LAT}_${LON}}"
```

**OUTPUT GAGAL ❌ — Tidak ada GPS data:**

text

```
GPS Latitude  : (not set)
GPS Longitude : (not set)
```

➡️ Metadata GPS dihapus (WhatsApp, Twitter, Instagram menghapus EXIF). Lanjut ke visual analysis:

---

### Langkah 7.2 — Visual Analysis & Reverse Image Search

Bash

```
# Jika tidak ada EXIF, lakukan visual analysis
echo "=== VISUAL CLUE CHECKLIST ==="
echo "1. Screenshot atau foto foto? → Screenshot biasanya mengandung UI hints"
echo "2. Teks yang terlihat? → Plat nomor, tanda toko, nama jalan"
echo "3. Bahasa? → Identifikasi negara"
echo "4. Bangunan khas? → Arsitektur regional"
echo "5. Kendaraan? → Model mobil berbeda per negara"
echo "6. Tanaman? → Flora regional"
echo "7. Bayangan? → Tentukan arah utara/selatan"

# Upload foto ke mesin pencari visual (manual):
echo "[*] Google Images: https://images.google.com (Upload/drag foto)"
echo "[*] Yandex Visual: https://yandex.com/images (Terbaik untuk pengenalan wajah & bangunan)"
echo "[*] TinEye: https://tineye.com (Tracking versi asli gambar)"
echo "[*] PimEyes: https://pimeyes.com (Face recognition search)"

# Untuk foto outdoor, gunakan SunCalc
# 1. Identifikasi arah bayangan
# 2. Buka suncalc.org
# 3. Input tanggal dari EXIF
# 4. Cocokkan arah bayangan untuk verifikasi lokasi
echo "[*] SunCalc: https://suncalc.org (Untuk analisis bayangan & arah matahari)"
```

**OUTPUT BERHASIL ✅ — Clue dari foto (CTF Pattern 2):**

text

```
# Dari foto jalan:
Terlihat tanda jalan: "Jl. Sudirman No. 52"
Bahasa: Indonesia
Ada gedung BNI → Jakarta pusat
Plat nomor: B (DKI Jakarta)

# Verifikasi dengan Google Street View:
echo "[*] Street View: https://www.google.com/maps/@-6.2088,106.8456,3a,90y,0h,90t/data=!3m6!1e1"
```

---

## ═══════════════════════════════════════

## FASE 8: BREACH & CREDENTIAL INTELLIGENCE

## ═══════════════════════════════════════

> **Tujuan:** Cari semua credential yang pernah bocor yang relate ke target, termasuk dari paste sites dan breach databases.

### Langkah 8.1 — Paste Site Monitoring

Bash

```
# Command 1: Search paste sites untuk domain target
echo "=== SEARCHING PASTE SITES ==="

# DuckDuckGo search untuk paste sites
for site in pastebin.com hastebin.com ghostbin.com rentry.co; do
    echo "--- $site ---"
    results=$(curl -s "https://html.duckduckgo.com/html/?q=site:$site+\"$TARGET\"" \
      | grep -oE "https://$site/[a-zA-Z0-9]+" | head -5)
    echo "$results"
    sleep 2
done

# Command 2: Search credential dumps
curl -s "https://html.duckduckgo.com/html/?q=\"$TARGET\"+password+dump" \
  | grep -oE "https://pastebin.com/[a-zA-Z0-9]+" | sort -u | head -5
```

**OUTPUT BERHASIL ✅ — Pastebin ditemukan:**

text

```
https://pastebin.com/xKj4mNpQ
```

Bash

```
# Download dan analisis paste
curl -s "https://pastebin.com/raw/xKj4mNpQ" | tee creds/pastebin_dump.txt

# Cari credential patterns
grep -iE "[a-zA-Z0-9._%+-]+@insecurebank\.com" creds/pastebin_dump.txt
grep -iE "password|pass|passwd" creds/pastebin_dump.txt | head -10
```

---

### Langkah 8.2 — Dark Web Mentions (Tor)

Bash

```
# Setup Tor
sudo systemctl start tor
sleep 3
curl --socks5-hostname 127.0.0.1:9050 -s https://check.torproject.org/ | grep -i "Congratulations"
```

**OUTPUT BERHASIL ✅ — Tor aktif:**

text

```
Congratulations. This browser is configured to use Tor.
```

Bash

```
# Search di Ahmia (dark web search engine via Tor)
pip3 install onionsearch --break-system-packages 2>/dev/null
onionsearch "$TARGET" --engines ahmia,torch --output reports/darkweb_results.txt 2>/dev/null

# Manual search di dark web search engines:
echo "[*] Ahmia: http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion"
echo "[*] Search: $TARGET credentials"
```

---

## ═══════════════════════════════════════

## FASE 9: AUTOMATION & PIVOT

## ═══════════════════════════════════════

### Langkah 9.1 — Automated Recon Script

Bash

```
# Jalankan script recon otomatis untuk domain baru
cat > /usr/local/bin/osint_recon.sh << 'SCRIPT'
#!/bin/bash
TARGET="$1"
OUT="$HOME/osint/targets/$TARGET"
mkdir -p "$OUT"/{domains,emails,reports}
echo "=== OSINT Auto-Recon: $TARGET ==="

# 1. WHOIS
echo "[+] WHOIS..."
whois "$TARGET" > "$OUT/domains/whois.txt" 2>&1

# 2. DNS
echo "[+] DNS Records..."
{ dig "$TARGET" A +short; dig "$TARGET" MX +short; dig "$TARGET" TXT +short; \
  dig "$TARGET" NS +short; } > "$OUT/domains/dns.txt"

# 3. Subdomains
echo "[+] Subdomain Enum..."
subfinder -d "$TARGET" -silent > "$OUT/domains/subfinder.txt" 2>/dev/null
curl -s "https://crt.sh/?q=%.$TARGET&output=json" 2>/dev/null \
  | python3 -c "import sys,json; [print(e['name_value']) for e in json.load(sys.stdin)]" \
  | grep -v '^\*' | sort -u > "$OUT/domains/crtsh.txt"
cat "$OUT/domains/subfinder.txt" "$OUT/domains/crtsh.txt" | sort -u \
  > "$OUT/domains/all_subs.txt"

# 4. Live check
echo "[+] HTTP Probe..."
cat "$OUT/domains/all_subs.txt" \
  | httpx -silent -status-code -title -o "$OUT/domains/live_subs.txt" 2>/dev/null

# 5. Wayback
echo "[+] Wayback URLs..."
waybackurls "$TARGET" 2>/dev/null | head -200 > "$OUT/domains/wayback.txt"

# Summary
echo ""
echo "=== SUMMARY ==="
echo "Subdomains: $(wc -l < $OUT/domains/all_subs.txt)"
echo "Live subs:  $(wc -l < $OUT/domains/live_subs.txt)"
echo "Wayback:    $(wc -l < $OUT/domains/wayback.txt)"
echo "Output:     $OUT"
SCRIPT

chmod +x /usr/local/bin/osint_recon.sh
osint_recon.sh "$TARGET"
```

---

### Langkah 9.2 — Pivot dari OSINT ke Exploitation

Bash

```
# Setelah OSINT selesai, pivot ke exploitation berdasarkan temuan:

echo "=== PIVOT MATRIX ==="
echo "Temuan OSINT → Target Eksploitasi:"
echo ""
echo "1. Subdomain ditemukan → Web scanning (<a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>)"
echo "2. Email + password dari breach → Password spray ke service"
echo "3. GitHub token bocor → Test API endpoint"
echo "4. Port terbuka (Shodan) → Service-specific workflow"
echo "5. Admin panel URL → Authentication bypass (<a href="/docs/authentication-bypass" class="text-[#00b4d8] hover:underline font-mono font-semibold">18_auth_bypass_workflow.md</a>)"
echo "6. Cloud bucket public → Data extraction"
echo "7. Employee names → Generate username list → Password spray"
```

**Cross-service testing setelah dapat credentials:**

Bash

```
# Jika dapat email:password dari breach atau paste site
export FOUND_USER="john.doe@insecurebank.com"
export FOUND_PASS="Password123!"
export TARGET_IP="104.21.23.45"

# Test ke semua service yang ditemukan di Shodan
nxc smb $TARGET_IP -u "$FOUND_USER" -p "$FOUND_PASS" 2>/dev/null
nxc ssh $TARGET_IP -u "$FOUND_USER" -p "$FOUND_PASS" 2>/dev/null
nxc winrm $TARGET_IP -u "$FOUND_USER" -p "$FOUND_PASS" 2>/dev/null

# Test ke web login
curl -s -X POST "https://$TARGET/login" \
  -d "email=$FOUND_USER&password=$FOUND_PASS" -L | grep -i "dashboard\|welcome\|flag"

# Test ke API endpoint
curl -s -H "Authorization: Basic $(echo -n "$FOUND_USER:$FOUND_PASS" | base64)" \
  "https://api.$TARGET/v1/users" | python3 -m json.tool 2>/dev/null
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error / Gejala|Penyebab|Solusi|
|---|---|---|
|`subfinder: no results`|Domain baru / terlindungi|Coba amass passive, crt.sh manual|
|`WHOIS: REDACTED FOR PRIVACY`|GDPR privacy protection|SecurityTrails historical, reverse WHOIS di viewdns.info|
|`Shodan: Invalid API key`|Key expired/belum init|`shodan init YOUR_KEY`, daftar ulang gratis|
|`sherlock: false positive`|Website return 200 untuk semua user|Verifikasi manual setiap URL yang ditemukan di browser|
|`holehe: Rate limited`|Terlalu cepat|Pakai `torsocks holehe`, tunggu 5 menit|
|`exiftool: No GPS data`|Platform hapus EXIF (WhatsApp/IG/Twitter)|Gunakan reverse image search (Yandex), analisis visual|
|`Google Dorking: CAPTCHA`|Terlalu banyak query dari 1 IP|Ganti ke DuckDuckGo atau Startpage, pakai VPN|
|`theHarvester: 0 results`|Search engine changed HTML|`theHarvester -b crtsh,bing,duckduckgo` (pilih source spesifik)|
|`HIBP API: 401 Unauthorized`|API key berbayar required|Gunakan web langsung atau `holehe`|
|`waybackurls: empty`|Domain tidak pernah di-crawl Wayback|Cek manual di web.archive.org, coba `gau` tool sebagai alternatif|
|`httpx: all dead`|Subdomain dari arsip lama|Filter lebih ketat, coba resolver berbeda|
|`Amass sangat lambat`|Default mode jalankan active brute|Tambah flag `-passive`: `amass enum -passive -d target`|
|`GHunt: login required`|Cookie expired|Jalankan `ghunt login` ulang, ikuti instruksi setup|
|`TruffleHog: no results`|Repo bersih atau key di-revoke|Manual grep, cek commit messages, cek branch non-default|
|`Zone Transfer: REFUSED`|Dikonfigurasi dengan benar|Normal. Lanjut ke subdomain enum|
|IP Cloudflare terdeteksi|Target pakai CDN|Historical DNS, MX record, Shodan SSL cert search|

---

## 8 COMMON CTF OSINT PATTERNS — QUICK REFERENCE

|#|Pattern|Clue di Soal|Command Pertama|Expected Output|
|---|---|---|---|---|
|1|Flag di bio/profile social media|"Temukan siapa dia" + username|`sherlock <username>`|URL profil → buka → lihat bio|
|2|Geolocation dari foto (visual)|Foto jalan/bangunan tanpa EXIF|Upload ke Yandex Images|Identifikasi lokasi via landmark|
|3|GPS EXIF dari foto langsung|File .jpg dari kamera|`exiftool -GPSPosition foto.jpg`|Koordinat lat/lon|
|4|Secret di git commit history|URL repo GitHub|`git log -p -S "flag"`|Baris deleted yang mengandung flag|
|5|Subdomain hidden admin panel|"Layanan internal kami aman"|`subfinder -d target \| httpx`|`dev.target.com [200]`|
|6|Email → platform registration|Hanya ada email|`holehe email@target.com`|Platform terdaftar → cek profil|
|7|Halaman dihapus di Wayback|"Kami sudah hapus pengumuman"|`waybackurls target.com`|URL lama → akses via archive.org|
|8|Flag di DNS TXT record|Domain tanpa website aktif|`dig target.ctf TXT +short`|`"flag=..."` di TXT record|

---

## MASTER DECISION TREE (RINGKASAN)

text

```
START: Target OSINT Diterima
│
├─ FASE 0: Tentukan tipe target
│   ├─ Domain → FASE 1 (WHOIS + DNS)
│   ├─ Email → FASE 4 (Email Intel)
│   ├─ Username → FASE 5 (Social Hunt)
│   ├─ IP → FASE 6 (Shodan + ipinfo)
│   └─ Foto → FASE 7 (EXIF + GeoINT)
│
├─ FASE 1: Domain Intelligence
│   ├─ [Email registrant]   → FASE 4
│   ├─ [Zone Transfer OK]   → Semua subdomain exposed!
│   ├─ [Flag di TXT record] → DONE (CTF Pattern 8)
│   └─ Lanjut subdomain enum
│
├─ FASE 2: Website & Wayback
│   ├─ [File sensitif di wayback] → Download + analisis
│   ├─ [robots.txt paths]        → Test semua Disallow path
│   ├─ [Flag di robots.txt]      → DONE
│   └─ [Google dork ketemu]      → Credentials/file bocor
│
├─ FASE 3: GitHub/Code Intel
│   ├─ [TruffleHog secret]    → Credentials → test ke service
│   ├─ [Flag di commit]       → DONE (CTF Pattern 4)
│   └─ [Secrets di .env/code] → Simpan ke creds/
│
├─ FASE 4: Email Intelligence
│   ├─ [holehe → platforms]   → Investigate setiap platform
│   ├─ [Breach data]          → Password → spray ke service
│   └─ [GHunt → Gmail]        → Lokasi dari Maps reviews
│
├─ FASE 5: Username/Social
│   ├─ [Sherlock → accounts]  → Investigate setiap account
│   ├─ [Flag di bio]          → DONE (CTF Pattern 1)
│   └─ [Email bocor]          → ke FASE 4
│
├─ FASE 6: IP Intelligence
│   ├─ [Shodan → ports/CVE]   → Service-specific workflow
│   ├─ [Cloudflare bypass]    → IP asli server ditemukan
│   └─ [Exposed services]     → Test credentials yang ditemukan
│
├─ FASE 7: GeoINT
│   ├─ [EXIF GPS ada]         → Koordinat → Google Maps
│   ├─ [No EXIF → visual]     → Yandex/Google reverse image
│   └─ [Koordinat ditemukan]  → DONE / Format flag
│
└─ FASE 8-9: Breach + Pivot
    ├─ [Credentials dari breach] → Test ke SMB/SSH/Web/API
    ├─ [API key dari GitHub]      → Test ke cloud service
    └─ [Admin panel URL]          → ke <a href="/docs/authentication-bypass" class="text-[#00b4d8] hover:underline font-mono font-semibold">18_auth_bypass_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="insecurebank.com"
export TARGET_IP="104.21.23.45"
export TARGET_EMAIL="admin@insecurebank.com"
export TARGET_USER="shadow_alex99"
mkdir -p ~/osint/targets/$TARGET/{domains,emails,usernames,images,social,creds,reports}
cd ~/osint/targets/$TARGET

# === OPSEC CHECK ===
curl -s ifconfig.me    # Pastikan IP VPN/Tor

# === DOMAIN RECON ===
whois "$TARGET" | grep -iE "Registrar:|Creation|Expiry|Name Server:|Email:"
dig "$TARGET" TXT +short                                    # Flag di TXT?
dig "$TARGET" A +short; dig "$TARGET" MX +short
subfinder -d "$TARGET" -silent -o domains/subs.txt
curl -s "https://crt.sh/?q=%.$TARGET&output=json" | python3 -c "import sys,json;[print(e['name_value']) for e in json.load(sys.stdin)]" | sort -u
cat domains/subs.txt | httpx -silent -status-code -title    # Filter live subs
waybackurls "$TARGET" | grep -iE "\.env|\.sql|admin"        # Sensitive paths

# === EMAIL ===
theHarvester -d "$TARGET" -b google,bing -f emails/harvest
holehe "$TARGET_EMAIL" --only-used                          # Platform mapping
# HIBP: https://haveibeenpwned.com/account/$TARGET_EMAIL

# === USERNAME ===
sherlock "$TARGET_USER" --timeout 10 --print-found
curl -s "https://api.github.com/users/$TARGET_USER" | python3 -m json.tool

# === IP / INFRASTRUCTURE ===
curl -s "https://ipinfo.io/$TARGET_IP/json" | python3 -m json.tool
shodan host "$TARGET_IP"
shodan search "org:\"$TARGET\"" --fields ip_str,port

# === GITHUB SECRETS ===
git clone https://github.com/org/repo /tmp/repo
trufflehog git file:///tmp/repo --only-verified
git log -p -S "flag" 2>/dev/null | grep "^+" | grep -i "flag"
grep -rniE "api_key|password|secret|token" /tmp/repo --exclude-dir=.git

# === GEOINT ===
exiftool -c "%.6f" -GPSLatitude -GPSLongitude -DateTimeOriginal foto.jpg
# Yandex: https://yandex.com/images (reverse image)
# SunCalc: https://suncalc.org (shadow analysis)

# === GOOGLE DORKS (run di browser) ===
# site:$TARGET filetype:env
# site:$TARGET intitle:"Index of /"
# site:pastebin.com "$TARGET"
# site:github.com "$TARGET" password
```

---

> **➡️ NEXT:** Setelah informasi terkumpul dan credentials/hashes ditemukan, lanjut ke **[⚡ Quick Start: Urutan Kerja Password Cracking (Untuk Pemula)](/docs/password-cracking)** untuk crack hash dengan Hashcat/John dan optimasi wordlist.

> **⬅️ PREV:** **[⚡ Quick Start Checklist (Untuk Pemula)](/docs/android-apk)** — Android APK reverse engineering, Frida instrumentation, dan SSL pinning bypass.