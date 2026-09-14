---
id: "09"
title: "09. DNS Enumeration & Reconnaissance Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "09_dns_workflow.md"
refs_out: ["03","04","05","06","07","08","10","11","13","15","16","35","37"]
refs_in: ["04","08","10"]
---

# 09. DNS Enumeration & Reconnaissance Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Service Enumeration & Reconnaissance Workflow
SERVICE TARGET     : Domain Name System (DNS / BIND / Windows DNS)
DEFAULT PORTS      : UDP 53 (Standard Queries), TCP 53 (Zone Transfers & Large Payloads)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master), [04. Service Identification & Master Decision Tree — Pentest GPS Navigator](/docs/service-identification-decision-tree), [08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide](/docs/smtp)
==================================================================================
```

---

## 🧠 BAGIAN 1: DNS FUNDAMENTALS

### 1.1 Apa itu DNS dan Cara Kerjanya? (Analogi Buku Telepon Global)

**Domain Name System (DNS)** adalah sistem database terdistribusi dan hierarkis yang berfungsi sebagai "buku telepon" jaringan komputer. Komputer berkomunikasi menggunakan alamat IP numerik (seperti `10.10.11.200` atau `142.250.190.46`), sedangkan manusia lebih mudah mengingat nama domain alfabetis (seperti `megacorp.htb` atau `google.com`). DNS bertugas menerjemahkan nama host yang mudah dibaca manusia menjadi alamat IP biner yang dimengerti mesin.

```text
+=============================================================================+
|                      ANALOGI BUKU TELEPON GLOBAL                            |
+=============================================================================+
|                                                                             |
|  Manusia Mengingat Nama:         "PT Megacorp Finance"                      |
|  Katalog Buku Telepon (DNS):     "PT Megacorp Finance" ──> 021-555-0199     |
|  Perangkat Memutar Nomor (IP):   Menghubungi 10.10.11.200                   |
|                                                                             |
+=============================================================================+
```

---

### 1.2 Hierarki DNS (Struktur Pohon Terbalik)

DNS diatur dalam struktur hierarkis berbentuk pohon terbalik (*Inverted Tree Structure*):

```text
                                [ . ] (Root Zone)
                                  │
         ┌────────────────────────┼────────────────────────┐
       [ .com ]                [ .org ]                 [ .htb / .local ] (TLD)
         │                                                 │
   [ megacorp ]                                       [ targetcorp ]      (Second-Level Domain)
         │                                                 │
   ┌─────┴─────┐                                     ┌─────┴─────┐
[ www ]     [ mail ]                              [ dev ]     [ dc01 ]    (Subdomain / Host)
```

1. **Root Domain (`.`)**: Puncak hierarki yang dikelola oleh 13 kluster root server global.
2. **Top-Level Domain (TLD)**: Tingkat teratas (`.com`, `.net`, `.org`, atau private TLD di CTF seperti `.htb`, `.local`, `.thm`).
3. **Second-Level Domain (SLD)**: Nama entitas atau perusahaan yang didaftarkan (`megacorp.htb`).
4. **Subdomain / Hostname**: Server spesifik di dalam domain (`admin.megacorp.htb`, `dc01.corp.local`).

---

### 1.3 Rekursif vs. Iteratif Query

```text
REKURSIF QUERY (Client meminta DNS Server menyelesaikan semuanya hingga selesai):

 [ Client ] ────── 1. "Apa IP dari app.target.htb?" ──────> [ Local DNS Resolver ]
 [ Client ] <───── 8. "IP-nya adalah 10.10.11.50" ───────── [ Local DNS Resolver ]
                                                                   │  ▲
                                                                   │  │
ITERATIF QUERY (Resolver berkeliling sendiri menanyakan satu per satu):
                                                                   │  │
 2. "Tahu app.target.htb?" ──> [ Root Server (.) ]                 │  │
 3. "Tidak tahu, tanya TLD .htb di IP X" <─────────────────────────┘  │
 4. "Tahu app.target.htb?" ──> [ TLD Server (.htb) ]                  │
 5. "Tidak tahu, tanya NS target.htb di IP Y" <───────────────────────┘
 6. "Apa IP app.target.htb?" ──> [ Authoritative NS target.htb ]
 7. "IP-nya adalah 10.10.11.50" <─────────────────────────────────────┘
```

* **Rekursif**: Resolver menanggung seluruh beban pencarian hingga mendapatkan jawaban final (IP atau error `NXDOMAIN`).
* **Iteratif**: Resolver menerima petunjuk (*referral*) ke server berikutnya yang memiliki otoritas lebih dekat.

---

### 1.4 Master DNS Record Types untuk Penetration Testing

Setiap tipe DNS record menyimpan metadata tertentu yang memiliki nilai intelijen krusial bagi pentester:

```text
+--------+------------------------+------------------------------------+-------------------------------------------+
| Tipe   | Nama Lengkap           | Data yang Disimpan                 | Nilai Intelijen Bagi Pentester            |
+--------+------------------------+------------------------------------+-------------------------------------------+
| A      | IPv4 Address Record    | Hostname ──> IPv4 (32-bit)         | Memetakan server target ke alamat IP IPv4.|
+--------+------------------------+------------------------------------+-------------------------------------------+
| AAAA   | IPv6 Address Record    | Hostname ──> IPv6 (128-bit)        | Sering membypass WAF IPv4 & firewall lama.|
+--------+------------------------+------------------------------------+-------------------------------------------+
| CNAME  | Canonical Name         | Alias ──> Hostname Asli            | Menemukan third-party provider/subdomain  |
|        |                        | (dev.htb ──> aws.internal)         | takeover vulnerability.                   |
+--------+------------------------+------------------------------------+-------------------------------------------+
| MX     | Mail Exchange          | Prioritas + Mail Server FQDN       | Menemukan server mail ([08_smtp_workflow])|
|        |                        | (10 mail.target.htb)               | untuk user enum & phishing.               |
+--------+------------------------+------------------------------------+-------------------------------------------+
| TXT    | Text Strings           | String konfigurasi bebas           | Membocorkan SPF (daftar IP internal),     |
|        |                        | (SPF, DKIM, site verification)     | API tokens, dan password rahasia.         |
+--------+------------------------+------------------------------------+-------------------------------------------+
| NS     | Name Server            | Server yang memegang otoritas zone | Mengidentifikasi target DNS server utama  |
|        |                        | (ns1.target.htb)                   | untuk pengujian Zone Transfer (AXFR).     |
+--------+------------------------+------------------------------------+-------------------------------------------+
| PTR    | Pointer Record         | IP ──> Hostname (Reverse DNS)      | Reverse sweep subnet untuk membongkar     |
|        |                        | (10.10.11.5 ──> backup-srv.htb)    | seluruh server internal yang tersembunyi. |
+--------+------------------------+------------------------------------+-------------------------------------------+
| SOA    | Start of Authority     | Parameter zona, serial, admin email| Mengungkap email admin, hostname master,  |
|        |                        | (admin.target.htb)                 | dan siklus update zona.                   |
+--------+------------------------+------------------------------------+-------------------------------------------+
| SRV    | Service Locator        | Hostname, port, bobot layanan      | **EMAS DI AD!** Menemukan DC, Kerberos,   |
|        |                        | (_ldap._tcp ──> dc01:389)          | LDAP, Global Catalog secara instan.       |
+--------+------------------------+------------------------------------+-------------------------------------------+
| AXFR   | Authoritative Transfer | Perintah replikasi zona penuh      | Mengunduh SELURUH peta DNS dalam 1 detik. |
+--------+------------------------+------------------------------------+-------------------------------------------+
```

---

### 1.5 Apa itu Zone Transfer (AXFR) dan Mengapa Sangat Berbahaya?

**Asynchronous Full Transfer (AXFR)** adalah mekanisme replikasi data zona DNS antar-nameserver (antara *Master/Primary DNS* dan *Slave/Secondary DNS*).

```text
[ PRIMARY DNS SERVER ] ═══════ Replikasi Seluruh Database Zona ═══════> [ SECONDARY DNS ]
         │
         │ (Jika Master DNS salah konfigurasi mengizinkan query AXFR dari IP publik/attacker)
         ▼
[ ATTACKER MACHINE ] ──> Menerima SEMUA record A, CNAME, MX, SRV, TXT, IP internal!
```

* **Dampak**: Penyerang mendapatkan peta topologi jaringan internal lengkap dalam hitungan detik tanpa perlu melakukan brute force satu per satu.

---

### 1.6 DNS Internal vs. DNS Publik (Split-Horizon DNS)

Organisasi enterprise umumnya menerapkan **Split-Horizon (Split-View) DNS**:
* **DNS Publik**: Hanya mengekspos record publik (seperti `www.corp.com` dan `mail.corp.com`).
* **DNS Internal**: Berada di balik VPN/jaringan lokal dan menyelesaikan record sensitif (`gitlab.corp.local`, `vault.corp.local`, `dc01.corp.local`).
* **Di Lingkungan CTF**: Server target sering kali merangkap sebagai DNS server internal. Jika Anda tidak mengarahkan query DNS Anda langsung ke IP target (`@$TARGET`), Anda tidak akan bisa menyelesaikan subdomain internal mesin tersebut!

---

### 1.7 Wildcard DNS dan Implikasinya

**Wildcard DNS** adalah konfigurasi di mana record `*.target.htb` diarahkan ke alamat IP tertentu:
* Apapun query yang Anda kirim (misal `blabla123random.target.htb`), server akan selalu menjawab dengan IP yang sama (`200 OK` / status `NOERROR`).
* **Implikasi**: Tool brute force subdomain (seperti Gobuster atau FFuF) akan mengalami ribuan *False Positive* karena semua kata acak dianggap valid.

---

### 1.8 DNS Cache Snooping

DNS Cache Snooping adalah teknik query ke resolver non-otoritatif dengan flag `+norecurse` untuk memeriksa apakah server pernah menyelesaikan domain tertentu baru-baru ini:
* Jika server mengembalikan IP dengan nilai TTL yang tersisa, berarti ada pengguna atau administrator di jaringan internal yang baru saja mengunjungi domain tersebut.

---

### 1.9 Port DNS: UDP 53 vs. TCP 53

* **Port 53 UDP**: Digunakan untuk query DNS standar berukuran kecil (kurang dari 512 byte, atau hingga 4096 byte dengan EDNS0). Cepat dan tanpa overhead *connection state*.
* **Port 53 TCP**: Digunakan saat respon melebihi batas buffer UDP (*Truncation flag `TC` aktif*) dan **Wajib digunakan untuk Zone Transfer (AXFR)**. Jika port 53 TCP tertutup firewall, Zone Transfer tidak akan pernah berhasil!

---

## 🛠️ BAGIAN 2: TOOL ARSENAL DNS

```text
=======================================================================================================
TOOL            FUNGSI UTAMA                     KECEPATAN   TIPE RECON     OUTPUT UTAMA
=======================================================================================================
dig             Swiss-Army Knife Query & AXFR    Sangat Cepat Active/Direct Standard BIND Records
nslookup        Query Bawaan Windows/Linux       Cepat       Active/Direct  Human-readable Text
host            Simple Command-line Lookup       Sangat Cepat Active/Direct Minimalist Text
dnsenum         Full Auto-Recon, Brute & AXFR    Cepat       Active/Direct  Struktur Subdomain Lengkap
dnsrecon        Comprehensive DNS Audit & Sweep  Tinggi      Active/Direct  Table Record & Reverse PTR
fierce          Domain Recon & IP Range Scanner  Sedang      Active/Brute   Subdomain & Neighbor Range
gobuster dns    High-Speed Subdomain Fuzzing     Ekstrem     Active/Brute   Valid Subdomain List
ffuf            Virtual Host (VHost) / DNS Fuzz  Ekstrem     Active/HTTP    VHost Header Discovery
subfinder       Passive OSINT Reconnaissance     Sangat Cepat Passive/API   Passive Subdomain List
amass           Enterprise-Grade Network Mapping Sedang      Hybrid/Graph   Full Infrastructure Graph
=======================================================================================================
```

---

### 2.1 `dig` (Domain Information Groper)

`dig` adalah tool standar industri paling fleksibel di Linux untuk menguji server DNS.

* **Flag Utama**:
  * `@<server>` : Mengarahkan query ke IP nameserver target secara langsung.
  * `-t <type>` : Menentukan tipe record (`A`, `ANY`, `AXFR`, `SRV`, `TXT`).
  * `+short` : Menghilangkan header berlebih, hanya menampilkan jawaban bersih.
  * `-x <IP>` : Melakukan reverse DNS lookup.
  * `+trace` : Melacak query hierarkis dari root server ke authoritative server.

```bash
# 1. Query record tipe ANY secara langsung ke target
dig @10.10.11.200 target.htb ANY

# 2. Mencoba Full Zone Transfer (AXFR)
dig @10.10.11.200 target.htb AXFR

# 3. Query bersih satu baris untuk script automation
dig @10.10.11.200 target.htb A +short
```

* **Contoh Output Nyata `dig` (Zone Transfer Berhasil)**:
```text
; <<>> DiG 9.18.28-1~deb12u2-Debian <<>> @10.10.11.200 target.htb AXFR
; (1 server found)
;; global options: +cmd
target.htb.             86400   IN      SOA     ns1.target.htb. admin.target.htb. 2024090101 3600 1800 604800 86400
target.htb.             86400   IN      NS      ns1.target.htb.
target.htb.             86400   IN      A       10.10.11.200
admin.target.htb.       86400   IN      A       10.10.11.201
dev.target.htb.         86400   IN      CNAME   target.htb.
mail.target.htb.        86400   IN      A       10.10.11.205
vpn.target.htb.         86400   IN      A       10.10.11.254
target.htb.             86400   IN      SOA     ns1.target.htb. admin.target.htb. 2024090101 3600 1800 604800 86400
;; Query time: 18 msec
;; SERVER: 10.10.11.200#53(10.10.11.200) (TCP)
;; XFR size: 8 records (messages 1, bytes 289)
```

---

### 2.2 `nslookup` (Cross-Platform CLI Query)

Tool bawaan yang selalu ada di sistem Linux maupun Windows Command Prompt/PowerShell.

```bash
# Non-interactive query spesifik type
nslookup -type=MX target.htb 10.10.11.200
```

---

### 2.3 `host` (Minimalist Quick Probe)

```bash
# Cek cepat seluruh record utama
host -a target.htb 10.10.11.200
```

---

### 2.4 `dnsenum` (Automated Enumeration Suite)

Tool serbaguna yang secara otomatis mencoba zone transfer, mengekstrak record penting (NS, MX), dan melakukan brute force subdomain.

```bash
# Standard full enumeration dengan wordlist SecLists:
dnsenum --dnsserver 10.10.11.200 \
  --enum \
  -p 0 \
  -s 0 \
  -f /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  target.htb \
  -o dnsenum_output.xml
```

* **Penjelasan Flag Penting**:
  * `-p 0` : Nonaktifkan Google scraping (sangat penting di lab CTF agar tidak hang/lambat).
  * `-s 0` : Nonaktifkan Bing scraping.
  * `--enum` : Shortcut aktivasi seluruh modul enumerasi (NS, MX, AXFR, brute force).
  * `-f <wordlist>` : Menentukan wordlist subdomain kustom.
  * `-o <file>` : Menyimpan output laporan ke format XML.

---

### 2.5 `dnsrecon` (Comprehensive Audit & Subnet Sweep)

Mendukung AXFR check, standard query, reverse IP range lookup, dan cache snooping.

```bash
# 1. Reverse lookup subnet /24 (TIDAK memerlukan flag -d domain):
dnsrecon -r 10.10.11.0/24 -n 10.10.11.200

# 2. Standard recon dengan nama domain:
dnsrecon -d target.htb -n 10.10.11.200 -t std

# 3. Zone Transfer eksklusif (AXFR):
dnsrecon -d target.htb -t axfr -n 10.10.11.200
```

---

### 2.6 `gobuster dns` (High-Speed Subdomain Fuzzing)

Tool brute force subdomain berbasis multithreading Golang berkecepatan tinggi.

```bash
# Opsi 1: Menggunakan custom resolver (Format IP:PORT WAJIB!)
gobuster dns -d target.htb \
  -r 10.10.11.200:53 \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  -t 25 \
  --wildcard

# Opsi 2: Menggunakan resolver sistem /etc/resolv.conf
# (Setelah: echo "nameserver 10.10.11.200" | sudo tee /etc/resolv.conf)
gobuster dns -d target.htb \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  -t 25
```

---

### 2.7 `ffuf` (VHost / DNS HTTP Header Fuzzing)

Digunakan ketika web server merespon subdomain berbasis HTTP header `Host:` (Virtual Host) di port 80/443.

```bash
ffuf -u http://target.htb/ -H "Host: FUZZ.target.htb" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 154
```

---

### 2.8 `subfinder` & `amass` (Passive Discovery)

Mengumpulkan subdomain dari puluhan database OSINT publik tanpa mengirim satu paket pun ke server target.

```bash
# Passive subdomain enumeration via Subfinder
subfinder -d megacorp.com -silent -o subdomains_passive.txt
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

```bash
# Setup Environment Variable Target di Terminal Parrot OS:
export TARGET="10.10.11.200"
export DOMAIN="target.htb"
echo "Target DNS: $TARGET | Domain: $DOMAIN"
```

---

### FASE 1: INITIAL DNS FINGERPRINT & DOMAIN DISCOVERY

#### 0. Cara Menemukan Nama Domain Jika Belum Diketahui
Seringkali saat mulai bermain CTF, Anda hanya diberikan IP target tanpa nama domain. Gunakan 5 teknik berikut untuk mengungkap nama domain utama:

```bash
# Cara 1: Dari Nmap script DNS NSID
nmap -p 53 --script dns-nsid $TARGET

# Cara 2: Dari SSL/TLS Certificate di Port HTTPS 443 (Sangat Efektif!)
openssl s_client -connect $TARGET:443 2>/dev/null | openssl x509 -noout -text | grep -E "DNS:|Subject:"

# Cara 3: Dari NetBIOS / SMB Banner Inspection
nxc smb $TARGET

# Cara 4: Dari HTTP Response Headers / Redirection Location
curl -I http://$TARGET/ 2>/dev/null | grep -iE "location|server|host"

# Cara 5: Dari Nmap Script NetBIOS nbstat (Port UDP 137)
nmap -sU -p 137 --script nbstat $TARGET
# Contoh Output: Domain: MEGACORP.LOCAL <-- Inilah nama domainnya!
```

Setelah domain ditemukan, ekspor variabel dan mulai fingerprinting DNS:

```bash
# 1. Query Start of Authority (Mengungkap Email Admin & Master Host)
dig @$TARGET $DOMAIN SOA

# 2. Query Nameservers Resmi
dig @$TARGET $DOMAIN NS

# 3. Query Record IPv4 Utama
dig @$TARGET $DOMAIN A

# 4. Deteksi Open Resolver (Menguji apakah DNS resolver mau menyelesaikan domain eksternal)
dig @$TARGET google.com A +short
```

* **Cara Membaca Respon**:
  * Jika query `google.com` mengembalikan IP eksternal ➔ Target adalah **Open DNS Resolver** (rentan DNS amplification & cache poisoning).
  * Email admin pada record SOA diformat dengan titik sebagai pengganti `@` (contoh: `admin.target.htb.` ➔ `admin@target.htb`). Ini adalah username valid untuk modul [08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide](/docs/smtp) dan [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)!

---

### FASE 2: ZONE TRANSFER (AXFR) — JACKPOT JIKA BERHASIL

> [!IMPORTANT]
> **PRIORITAS NOMOR 1:** Selalu uji AXFR terlebih dahulu sebelum melakukan brute force subdomain! Jika berhasil, Anda menghemat waktu dan mendapatkan seluruh peta infrastruktur server target.

```bash
# 1. Uji AXFR Menggunakan dig
dig @$TARGET $DOMAIN AXFR

# 2. Uji AXFR Menggunakan dnsrecon
dnsrecon -d $DOMAIN -t axfr -n $TARGET

# 3. Uji AXFR Menggunakan host
host -l $DOMAIN $TARGET
```

* **Analisis Hasil Zone Transfer**:
  1. Catat semua subdomain baru (misal: `gitlab.target.htb`, `dev.target.htb`, `internal.target.htb`).
  2. Catat IP internal lain yang bukan `$TARGET` (misal: `10.10.11.205` untuk mail server, `10.10.11.254` untuk firewall gateway).

#### One-Liner Otomatis: Parse Output AXFR Langsung ke `/etc/hosts`
Jika Zone Transfer berhasil, jalankan one-liner praktis ini untuk mem-parsing dan mendaftarkan seluruh host yang ditemukan ke `/etc/hosts`:

```bash
dig @$TARGET $DOMAIN AXFR \
  | grep -E "\sIN\s+A\s+" \
  | awk '{print $5, $1}' \
  | sed 's/\.$//g' \
  | sort -u \
  | while read ip host; do
      echo "[+] Menambahkan: $ip $host"
      echo "$ip $host" | sudo tee -a /etc/hosts
    done

echo "[+] Selesai! Verifikasi hasil registrasi /etc/hosts:"
cat /etc/hosts | tail -n 15
```

---

### FASE 3: PASSIVE SUBDOMAIN ENUMERATION (OSINT)

> [!WARNING]
> **CATATAN PENTING CTF:**  
> Passive enumeration (`subfinder`, `amass`, `crt.sh`, VirusTotal) **HANYA** bekerja untuk domain publik yang terdaftar di internet publik (`.com`, `.org`, `.io`).  
> Untuk target lab CTF internal (`.htb`, `.local`, `.thm`):
> ➔ **LANGSUNG SKIP FASE 3 DAN MENUJU KE FASE 4 (ACTIVE BRUTE FORCE)!**

Jika target adalah domain publik (*Bug Bounty / Proving Grounds*), kumpulkan subdomain secara pasif:

```bash
# 1. Menggunakan Subfinder
subfinder -d megacorp.com -silent | tee subfinder_out.txt

# 2. Menggunakan Amass Passive Mode
amass enum -passive -d megacorp.com -o amass_out.txt

# 3. Query Certificate Transparency Logs via crt.sh (Curl + jq)
curl -s "https://crt.sh/?q=%.megacorp.com&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | sort -u | tee crtsh_out.txt

# 4. Gabungkan dan Deduplikasi Hasil
cat subfinder_out.txt amass_out.txt crtsh_out.txt | sort -u > all_passive_subdomains.txt
```

---

### FASE 4: ACTIVE SUBDOMAIN BRUTE FORCE

Jika Zone Transfer ditolak (*REFUSED*) dan target berada di lab CTF internal (`.htb` / `.local`):

```bash
# 1. Brute Force Subdomain Menggunakan Gobuster DNS (Gunakan -r IP:53 WAJIB!)
gobuster dns -d $DOMAIN \
  -r $TARGET:53 \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  -t 25 \
  --wildcard \
  -o gobuster_subdomains.txt

# 2. Jika Gobuster Lambat, Gunakan dnsrecon Brute Force Mode
dnsrecon -d $DOMAIN -D /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -t brt -n $TARGET
```

* **Pilihan Wordlist Standar SecLists**:
  * Cepat (Fast): `/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt`
  * Standar (Medium): `/usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt`
  * Komprehensif (Deep): `/usr/share/seclists/Discovery/DNS/dns-Jhaddix.txt`

---

### FASE 5: REVERSE DNS LOOKUP (PTR RECORDS)

**Tujuan**: Menemukan nama host dari alamat IP lain di subnet yang sama. Seringkali server internal tidak terdaftar di wordlist subdomain, namun terdaftar di tabel PTR.

```bash
# 1. Single IP PTR Lookup via dig
dig @$TARGET -x 10.10.11.200 +short

# 2. Reverse Sweep Seluruh Subnet /24 via dnsrecon
dnsrecon -r 10.10.11.0/24 -n $TARGET

# 3. Reverse Sweep Bash One-Liner (Cepat & Mandiri)
for ip in $(seq 1 254); do
  result=$(dig @$TARGET -x 10.10.11.$ip +short)
  if [ -n "$result" ]; then
    echo "[+] 10.10.11.$ip -> $result"
  fi
done | tee subnet_reverse_ptr.txt
```

---

### FASE 6: DNS CACHE SNOOPING

**Tujuan**: Mengintip riwayat domain yang pernah diakses oleh pengguna internal di resolver DNS target.

```bash
# Query dengan flag non-recursive (+norecurse)
dig @$TARGET internal-portal.corp.local A +norecurse
```
* **Hasil**:
  * Status `NOERROR` dan nilai `TTL > 0` di ANSWER SECTION ➔ Domain tersebut **ada di cache** dan baru saja dikunjungi!
  * Status `SERVFAIL` atau `AUTHORITY SECTION` kosong ➔ Domain tidak ada di cache.

---

### FASE 7: DNS TXT RECORD ANALYSIS

Record TXT sering menyimpan informasi rahasia atau rincian infrastruktur email:

```bash
# 1. Query Semua Record TXT
dig @$TARGET $DOMAIN TXT +short
```

* **Contoh Output Nyata**:
```text
"v=spf1 ip4:10.10.11.0/24 include:_spf.google.com ~all"
"cisco-site-verification=89af3b1c90"
"vault-token-backup=s.1298410294810294810"
```
* **Analisis**:
  * `ip4:10.10.11.0/24`: Membocorkan blok subnet internal perusahaan!
  * `vault-token-backup`: Administrator ceroboh menyimpan token backup rahasia di record publik.

---

### FASE 8: SRV RECORDS (SERVICE DISCOVERY)

Record **SRV (Service Locator)** mendefinisikan lokasi (nama host dan nomor port) dari service tertentu di dalam domain.

```bash
# 1. Query Layanan LDAP
dig @$TARGET _ldap._tcp.$DOMAIN SRV +short

# 2. Query Layanan Kerberos Authentication
dig @$TARGET _kerberos._tcp.$DOMAIN SRV +short

# 3. Query Layanan SIP / Voice
dig @$TARGET _sip._tcp.$DOMAIN SRV +short
```

---

## 🏢 BAGIAN 4: DNS DI ACTIVE DIRECTORY ENVIRONMENT

Di lingkungan Windows Active Directory, DNS **bukan sekadar penunjuk alamat**, melainkan tulang punggung operasional domain (*Service Directory*):

```text
+=============================================================================+
|                 ACTIVE DIRECTORY DNS SERVICE LOCATORS                       |
+=============================================================================+
| Layanan Target           | Format Query SRV                                 |
+--------------------------+--------------------------------------------------+
| Domain Controller (PDC)  | _ldap._tcp.pdc._msdcs.<domain>                   |
| Semua Domain Controller  | _ldap._tcp.dc._msdcs.<domain>                    |
| Kerberos KDC (Port 88)   | _kerberos._tcp.<domain>                          |
| Global Catalog (Port 3268| _gc._tcp.<domain>                                |
| Kerberos Password Change | _kpasswd._tcp.<domain>                           |
+--------------------------+--------------------------------------------------+
```

```bash
# 1. Temukan Seluruh Domain Controller (DC) di Domain AD:
dig @$TARGET _ldap._tcp.dc._msdcs.corp.local SRV
```

* **Contoh Output Nyata**:
```text
;; ANSWER SECTION:
_ldap._tcp.dc._msdcs.corp.local. 600 IN SRV 0 100 389 dc01.corp.local.
_ldap._tcp.dc._msdcs.corp.local. 600 IN SRV 0 100 389 dc02.corp.local.
```
* **Analisis**: Anda langsung mengetahui nama hostname dari dua Domain Controller utama (`dc01.corp.local` dan `dc02.corp.local`) untuk penyerangan [05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba) dan Kerberoasting!

```bash
# 2. Temukan Server Global Catalog (Port 3268):
dig @$TARGET _gc._tcp.corp.local SRV +short

# 3. Uji Zone Transfer pada Windows DNS (Sering diizinkan ke sesama subnet):
dig @$TARGET corp.local AXFR
```

---

## 🌐 BAGIAN 5: VIRTUAL HOST (VHOST) ENUMERATION

### 5.1 Perbedaan Mendasar: Subdomain Fuzzing vs. VHost Fuzzing

```text
+-----------------------+-----------------------------+----------------------------------------------+
| Kategori              | Lapisan Jaringan / Protokol | Mekanisme & Syarat                           |
+-----------------------+-----------------------------+----------------------------------------------+
| Subdomain Fuzzing     | DNS Layer (UDP/TCP 53)      | Mengirim query DNS untuk memvalidasi apakah  |
|                       |                             | hostname terdaftar di server DNS.            |
+-----------------------+-----------------------------+----------------------------------------------+
| VHost Fuzzing         | HTTP Layer (TCP 80 / 443)   | Mengirim request HTTP ke IP yang sama, namun |
|                       |                             | mengubah header "Host: <name>.target.htb".   |
+-----------------------+-----------------------------+----------------------------------------------+
```

> **Kapan Harus Menggunakan VHost Fuzzing?**  
> Di CTF, banyak mesin hanya memiliki satu server DNS publik yang tidak mencatat subdomain internal, tetapi web server Apache/Nginx di port 80 dikonfigurasi dengan blok `VirtualHost` tersembunyi. Anda **wajib** melakukan VHost fuzzing!

---

### 5.2 VHost Fuzzing Menggunakan FFuF

```bash
# Langkah 1: Kirim request awal untuk mengidentifikasi baseline response size
curl -s -I http://$TARGET/ -H "Host: randomdomainyangtidakada.target.htb"
# Catat Content-Length halaman default (misal: 154 byte)

# Langkah 2: Fuzzing VHost dengan memfilter baseline size (-fs 154)
ffuf -u http://$TARGET/ \
     -H "Host: FUZZ.$DOMAIN" \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -fs 154 \
     -c -v
```

* **Contoh Output FFuF**:
```text
[Status: 200, Size: 4120, Words: 890, Lines: 120, Duration: 22ms]
    * FUZZ: dev

[Status: 200, Size: 6850, Words: 1240, Lines: 180, Duration: 24ms]
    * FUZZ: admin
```

* **Langkah Lanjutan**: Segera tambahkan hasil valid ke `/etc/hosts`:
```bash
echo "$TARGET dev.$DOMAIN admin.$DOMAIN" | sudo tee -a /etc/hosts
```

---

### 5.3 VHost Fuzzing Menggunakan Gobuster

```bash
gobuster vhost -u http://$TARGET/ \
  --domain $DOMAIN \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  --append-domain \
  -t 30
```

---

## 🔗 BAGIAN 6: DNS + ATTACK CHAINING

```text
+=============================================================================+
|                       DNS ATTACK CHAINING TAXONOMY                          |
+=============================================================================+
```

### 🔗 Chain 1: Zone Transfer (AXFR) ➔ Internal Network Map Leakage

```text
[ AXFR QUERY ] ──(Sukses: Download Semua Records)──> [ Daftar 15 Host Internal ]
                                                               │
                                         ┌─────────────────────┴─────────────────────┐
                                         ▼                                           ▼
                              [ dev-api.target.htb ]                     [ backup-nas.target.htb ]
                                         │                                           │
                           (Akses HTTP: Swagger UI Leak)               (Akses SMB: Anonymous Share)
                                         │                                           │
                                         ▼                                           ▼
                                 Initial Shell Foothold                  Looting Database Credentials
```

```bash
# Eksekusi AXFR dan parsing semua record A:
dig @$TARGET $DOMAIN AXFR | grep -E "\sIN\s+A\s+" | awk '{print $1, $5}' | sed 's/\.$//'
```

---

### 🔗 Chain 2: VHost Fuzzing ➔ Hidden Admin Panel ➔ Web Exploitation

```bash
# 1. Temukan VHost tersembunyi
ffuf -u http://$TARGET/ -H "Host: FUZZ.$DOMAIN" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 154

# 2. Akses panel admin yang baru ditemukan di browser:
curl -s -L "http://admin.$DOMAIN/" | grep -i "<title>"
```

---

### 🔗 Chain 3: DNS SRV Records ➔ Active Directory Domain Controller Discovery

```bash
# 1. Ekstrak FQDN Domain Controller dari SRV record
DC_HOST=$(dig @$TARGET _ldap._tcp.dc._msdcs.$DOMAIN SRV +short | awk '{print $4}' | sed 's/\.$//')
echo "[+] Target Primary Domain Controller: $DC_HOST"

# 2. Mulai enumerasi SMB & LDAP terhadap DC
nxc smb $TARGET -u '' -p ''
```

---

### 🔗 Chain 4: Reverse PTR Sweep ➔ Penemuan Database Server Tersembunyi

```bash
# Sweep IP range dan cari database / vault
for ip in $(seq 1 254); do
  dig @$TARGET -x 10.10.11.$ip +short | grep -iE "db|sql|vault|backup" && echo "Host: 10.10.11.$ip"
done
```

---

### 🔗 Chain 5: TXT SPF Records ➔ Email Phishing & Relay Targeting

```bash
# Ekstrak subnet pengirim resmi dari SPF
dig @$TARGET $DOMAIN TXT +short | grep "v=spf1"
# Gunakan IP yang diizinkan untuk mengonfigurasi tool relay di File 08 (SMTP Workflow)
```

---

## 🌳 BAGIAN 7: DECISION TREE LENGKAP

```text
                          [PORT 53 (DNS) TERBUKA]
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
           [UDP PORT 53]                           [TCP PORT 53]
                 │                                       │
     ┌───────────┴───────────┐                           ▼
     │                       │                 [UJI ZONE TRANSFER (AXFR)]
[INITIAL RECON]      [OPEN RESOLVER?]          dig @$TARGET $DOMAIN AXFR
dig SOA / NS / A     dig @$TARGET google.com             │
     │                       │             ┌─────────────┴─────────────┐
     ▼                       ▼             │                           │
[Domain Valid?]         [VULNERABLE]   [SUCCESS / 200]             [REFUSED / 502]
Tambah ke /etc/hosts    DNS Cache      PETA LENGKAP BOCOR!         Beralih ke Brute Force
     │                  Poisoning      Unduh semua host            │
     │                                 ke /etc/hosts               │
     └───────────────────────┬─────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
   [PUBLIC / BUG BOUNTY]             [INTERNAL CTF / HTB]
            │                                 │
   [PASSIVE OSINT RECON]             [CEK WILDCARD DNS]
   Subfinder + Amass + crt.sh        dig @$TARGET randomxyz.$DOMAIN
            │                                 │
            │                         ┌───────┴───────┐
            │                         │               │
            │                    [WILDCARD AKTIF] [NORMAL]
            │                    Filter size/words    │
            │                         │               │
            └─────────────────────────┼───────────────┘
                                      │
                         [ACTIVE SUBDOMAIN BRUTE]
                         gobuster dns -d $DOMAIN -w seclists
                                      │
                         [APAKAH ADA PORT 80/443?]
                                      │
                        ┌─────────────┴─────────────┐
                        │                           │
                      [YES]                        [NO]
                        │                           │
               [VHOST HTTP FUZZING]          [REVERSE PTR SWEEP]
               ffuf -H "Host: FUZZ.$DOMAIN"  dnsrecon -r subnet/24
                        │                           │
                        ▼                           ▼
               [WEB EXPLOITATION]            [INTERNAL SERVICES]
               Admin Login / RCE             Lanjut ke Port 161 (SNMP)
```

---

## 🔧 BAGIAN 8: COMMON ERRORS & TROUBLESHOOTING (10 ERROR SOLUTIONS)

### 1. `connection timed out; no servers could be reached`
* **Penyebab**: Service DNS mati, IP target salah, atau paket UDP/TCP port 53 diblokir oleh firewall host.
* **Solusi CLI**: Verifikasi status port menggunakan Nmap scan TCP dan UDP:
```bash
nmap -p 53 -sU -sS -Pn $TARGET
```

---

### 2. `AXFR transfer failed: REFUSED` atau `SERVFAIL`
* **Penyebab**: Server DNS dikonfigurasi dengan aman dan menolak replikasi zona dari IP yang tidak sah.
* **Solusi**: Zone transfer bukan satu-satunya jalan. Beralihlah ke **Fase 4 (Active Subdomain Brute Force)** dan **Bagian 5 (VHost Fuzzing)**.

---

### 3. Wildcard DNS Mengacaukan Subdomain Brute Force
* **Penyebab**: Server DNS memiliki wildcard entry (`*.target.htb`), sehingga ribuan nama subdomain palsu menghasilkan respon `NOERROR` dengan IP yang sama.
* **Solusi Deteksi**:
```bash
dig @$TARGET non-existent-subdomain-12345.$DOMAIN +short
```
* **Solusi Bypass**:
  * Pada **Gobuster DNS**: Gunakan flag `--wildcard`.
  * Pada **FFuF VHost**: Identifikasi ukuran respon palsu lalu gunakan opsi filter `-fs <size>` atau `-fw <word_count>`.

---

### 4. `Gobuster DNS` Mengalami Banyak Timeout
* **Penyebab**: Thread default terlalu tinggi (`-t 50`) sehingga UDP buffer overload atau server menerapkan *rate limiting*.
* **Solusi CLI**: Turunkan jumlah thread dan tambahkan timeout delay:
```bash
gobuster dns -d $DOMAIN -r $TARGET -w wordlist.txt -t 10 --timeout 3s
```

---

### 5. `Subfinder` Tidak Mengembalikan Hasil
* **Penyebab**: Domain target adalah domain private CTF (seperti `.htb` atau `.local`) yang tidak terdaftar di internet publik.
* **Solusi**: `subfinder` dan `crt.sh` hanya bekerja untuk domain publik TLD asli (`.com`, `.org`, dll). Untuk lab lokal/CTF, gunakan metode brute force aktif via Gobuster/FFuF.

---

### 6. Semua Query Mengembalikan Respon `NXDOMAIN`
* **Penyebab**: Nama domain induk yang Anda tentukan salah eja, atau target menggunakan nama domain AD internal yang berbeda dari nama mesin.
* **Solusi CLI**: Ambil nama domain resmi dari modul [08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide](/docs/smtp) banner atau periksa Nmap NetBIOS scan:
```bash
nmap -sU -p 137 --script nbstat $TARGET
```

---

### 7. DNS Over TCP Tidak Bisa Diakses (Gagal AXFR)
* **Penyebab**: Port 53 UDP terbuka, tetapi port 53 TCP ditutup oleh firewall host.
* **Solusi CLI**: Pastikan port TCP 53 terbuka:
```bash
nc -vn -z $TARGET 53
```

---

### 8. SOA Query Mengembalikan Referral, Bukan Answer
* **Penyebab**: Server DNS target bukan nameserver otoritatif utama untuk domain tersebut, melainkan hanya caching forwarding resolver.
* **Solusi CLI**: Query NS record untuk menemukan IP nameserver otoritatif yang sebenarnya:
```bash
dig @$TARGET $DOMAIN NS
```

---

### 9. Subdomain Hasil Brute Force Tidak Bisa Dibuka di Browser
* **Penyebab**: Subdomain baru belum didaftarkan di file `/etc/hosts` lokal mesin Parrot OS Anda.
* **Solusi CLI**:
```bash
echo "$TARGET newsubdomain.$DOMAIN" | sudo tee -a /etc/hosts
```

---

### 10. False Positive Berlebihan di Gobuster DNS
* **Penyebab**: Resolver lokal Parrot OS Anda (`/etc/resolv.conf`) mengintervensi resolusi domain internal.
* **Solusi CLI**: Selalu paksa flag resolver `-r $TARGET` agar Gobuster bertanya secara eksklusif ke server DNS target.

---

## 🏆 BAGIAN 9: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: Zone Transfer (AXFR) ➔ Hidden Dev Portal ➔ Web Flag

**Target**: Linux Box (HTB Cronos Style)

#### Step 1: Enumerasi Port 53 & Coba Zone Transfer
```bash
dig @10.10.11.200 cronos.htb AXFR
```
* **Output Terminal**:
```text
cronos.htb.             86400   IN      SOA     admin.cronos.htb. ...
cronos.htb.             86400   IN      NS      ns1.cronos.htb.
cronos.htb.             86400   IN      A       10.10.11.200
admin.cronos.htb.       86400   IN      A       10.10.11.200
dev.cronos.htb.         86400   IN      A       10.10.11.200
cronos.htb.             86400   IN      SOA     admin.cronos.htb. ...
```

#### Step 2: Registrasi Subdomain ke Local Hosts
```bash
echo "10.10.11.200 cronos.htb admin.cronos.htb dev.cronos.htb" | sudo tee -a /etc/hosts
```

#### Step 3: Akses Portal Tersembunyi via Web Browser
Navigasi ke `http://admin.cronos.htb/` menghasilkan panel login autentikasi admin yang rentan SQL Injection (`' OR 1=1--`), menghasilkan akses foothold instan!

---

### 📝 EXAMPLE 2: SRV Record Query ➔ AD Domain Controller Discovery

**Target**: Windows Enterprise Box (HTB Active / Sauna Style)

#### Step 1: Query SRV Record untuk Mencari Primary DC
```bash
dig @10.10.11.175 _ldap._tcp.dc._msdcs.egotistical-bank.local SRV
```
* **Output Terminal**:
```text
;; ANSWER SECTION:
_ldap._tcp.dc._msdcs.egotistical-bank.local. 600 IN SRV 0 100 389 SAUNA.egotistical-bank.local.
```

#### Step 2: Registrasi FQDN Domain Controller
```bash
echo "10.10.11.175 egotistical-bank.local SAUNA.egotistical-bank.local SAUNA" | sudo tee -a /etc/hosts
```

#### Step 3: Melanjutkan Serangan Active Directory
Mengetahui DC bernama `SAUNA.egotistical-bank.local`, kita langsung menjalankan serangan AS-REP Roasting (`impacket-GetNPUsers`) tanpa perlu menebak nama domain!

---

### 📝 EXAMPLE 3: Subdomain Brute Force ➔ VHost Discovery ➔ RCE

**Target**: Linux Box dengan Apache Virtual Hosting

#### Step 1: Subdomain Gobuster Standard Gagal (AXFR Refused)
```bash
dig @10.10.11.95 faculty.htb AXFR
# Respon: Transfer failed: REFUSED
```

#### Step 2: Fuzzing Virtual Host Menggunakan FFuF
```bash
ffuf -u http://10.10.11.95/ \
     -H "Host: FUZZ.faculty.htb" \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -fs 195 -c
```
* **Output**:
```text
[Status: 200, Size: 5214, Words: 840, Lines: 110]
    * FUZZ: mpd
```

#### Step 3: Eksploitasi VHost Baru
Menambahkan `10.10.11.95 mpd.faculty.htb` ke `/etc/hosts`. Halaman tersebut menjalankan aplikasi Music Player Daemon (MPD) web frontend dengan kerentanan command execution bawaan!

---

## ⚡ BAGIAN 10: CHEATSHEET DNS (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

```bash
export TARGET="10.10.11.200"
export DOMAIN="target.htb"
export WORDLIST="/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"
```

```bash
# ==========================================
# 1. QUICK RECON & RECORD DUMPING
# ==========================================
dig @$TARGET $DOMAIN ANY                                 # Query all available records
dig @$TARGET $DOMAIN SOA                                 # Get zone admin & serial
dig @$TARGET $DOMAIN NS                                  # Get authoritative nameservers
dig @$TARGET $DOMAIN MX                                  # Get mail servers
dig @$TARGET $DOMAIN TXT                                 # Inspect TXT & SPF configurations
dig @$TARGET $DOMAIN A +short                            # Get clean IPv4 address

# ==========================================
# 2. ZONE TRANSFER (AXFR)
# ==========================================
dig @$TARGET $DOMAIN AXFR                                # Standard dig zone transfer
dnsrecon -d $DOMAIN -t axfr -n $TARGET                   # Automated dnsrecon AXFR check
host -l $DOMAIN $TARGET                                  # Host command AXFR fallback

# ==========================================
# 3. SUBDOMAIN BRUTE FORCE (ACTIVE)
# ==========================================
gobuster dns -d $DOMAIN -r $TARGET:53 -w $WORDLIST -t 25 --wildcard # High-speed DNS fuzzing
dnsrecon -d $DOMAIN -D $WORDLIST -t brt -n $TARGET       # Dnsrecon brute force mode

# ==========================================
# 4. REVERSE DNS LOOKUP (PTR SWEEP)
# ==========================================
dig @$TARGET -x $TARGET +short                           # Single IP reverse lookup
dnsrecon -r 10.10.11.0/24 -n $TARGET                     # Reverse sweep whole /24 subnet (tanpa flag -d)

# ==========================================
# 5. VIRTUAL HOST (VHOST) FUZZING
# ==========================================
# Deteksi baseline response size:
# curl -s -I http://$TARGET/ -H "Host: fake.$DOMAIN"
ffuf -u http://$TARGET/ -H "Host: FUZZ.$DOMAIN" -w $WORDLIST -fs 154 # Fuzz VHosts via FFuF
gobuster vhost -u http://$TARGET/ -d $DOMAIN -w $WORDLIST --append-domain # Fuzz VHosts via Gobuster

# ==========================================
# 6. ACTIVE DIRECTORY DNS SERVICE LOCATORS
# ==========================================
dig @$TARGET _ldap._tcp.dc._msdcs.$DOMAIN SRV            # Locate Domain Controllers
dig @$TARGET _kerberos._tcp.$DOMAIN SRV                  # Locate Kerberos KDC
dig @$TARGET _gc._tcp.$DOMAIN SRV                        # Locate Global Catalog
```

---

## ⚡ BAGIAN 11: AUTOMATION SCRIPT — `dns_auto_recon.sh`

Script otomasi siap pakai di Parrot OS XFCE untuk menjalankan seluruh pipeline DNS reconnaissance secara berurutan:

```bash
#!/bin/bash
# ==============================================================================
# Script Name : dns_auto_recon.sh
# Description : Otomasi Reconnaissance DNS & Auto-Hosts Discovery
# Usage       : ./dns_auto_recon.sh <TARGET_IP> <DOMAIN_NAME>
# Example     : ./dns_auto_recon.sh 10.10.11.200 target.htb
# ==============================================================================

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <TARGET_IP> <DOMAIN>"
    echo "Contoh: $0 10.10.11.200 target.htb"
    exit 1
fi

TARGET="$1"
DOMAIN="$2"
WORDLIST="/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"
OUTPUT_DIR="./dns_results_${DOMAIN}"

mkdir -p "$OUTPUT_DIR"

echo -e "\033[1;34m[*] ========================================================\033[0m"
echo -e "\033[1;34m[*] STARTING DNS RECON: Target $TARGET | Domain: $DOMAIN\033[0m"
echo -e "\033[1;34m[*] ========================================================\033[0m"

# 1. Fingerprint & Core Records
echo -e "\n\033[1;33m[+] Step 1: Gathering Basic DNS Records (SOA, NS, MX, TXT)...\033[0m"
dig @$TARGET $DOMAIN SOA +noall +answer > "$OUTPUT_DIR/soa.txt"
dig @$TARGET $DOMAIN NS +noall +answer > "$OUTPUT_DIR/ns.txt"
dig @$TARGET $DOMAIN MX +noall +answer > "$OUTPUT_DIR/mx.txt"
dig @$TARGET $DOMAIN TXT +noall +answer > "$OUTPUT_DIR/txt.txt"
cat "$OUTPUT_DIR/soa.txt" "$OUTPUT_DIR/ns.txt"

# 2. Testing Zone Transfer (AXFR)
echo -e "\n\033[1;33m[+] Step 2: Testing Zone Transfer (AXFR)...\033[0m"
dig @$TARGET $DOMAIN AXFR > "$OUTPUT_DIR/axfr.txt"

if grep -q "IN[[:space:]]\+A" "$OUTPUT_DIR/axfr.txt"; then
    echo -e "\033[1;32m[!] JACKPOT: Zone Transfer BERHASIL!\033[0m"
    echo -e "[*] Mengekstrak semua host dari AXFR ke $OUTPUT_DIR/hosts_discovered.txt:"
    grep -E "\sIN\s+A\s+" "$OUTPUT_DIR/axfr.txt" | awk '{print $5, $1}' | sed 's/\.$//g' | sort -u | tee "$OUTPUT_DIR/hosts_discovered.txt"
    
    echo -e "\n[*] Mendaftarkan ke /etc/hosts secara otomatis..."
    while read -r ip host; do
        if ! grep -q "$host" /etc/hosts 2>/dev/null; then
            echo "$ip $host" | sudo tee -a /etc/hosts
        fi
    done < "$OUTPUT_DIR/hosts_discovered.txt"
else
    echo -e "\033[1;31m[-] Zone Transfer ditolak (REFUSED/SERVFAIL).\033[0m"
    
    # 3. Active Brute Force Subdomain
    echo -e "\n\033[1;33m[+] Step 3: Running Active Subdomain Brute Force (Gobuster)...\033[0m"
    if [ -f "$WORDLIST" ]; then
        gobuster dns -d "$DOMAIN" \
          -r "${TARGET}:53" \
          -w "$WORDLIST" \
          -t 25 \
          --wildcard \
          -o "$OUTPUT_DIR/gobuster_subdomains.txt"
    else
        echo "[-] Wordlist $WORDLIST tidak ditemukan. Lewati brute force."
    fi
fi

# 4. Check Active Directory SRV Records
echo -e "\n\033[1;33m[+] Step 4: Checking Active Directory SRV Locators...\033[0m"
dig @$TARGET _ldap._tcp.dc._msdcs.$DOMAIN SRV +short > "$OUTPUT_DIR/ad_dc.txt"
if [ -s "$OUTPUT_DIR/ad_dc.txt" ]; then
    echo -e "\033[1;32m[!] Domain Controller Ditemukan:\033[0m"
    cat "$OUTPUT_DIR/ad_dc.txt"
else
    echo "[-] Bukan Active Directory domain atau SRV record disembunyikan."
fi

echo -e "\n\033[1;34m[*] Recon selesai! Seluruh bukti tersimpan di: $OUTPUT_DIR\033[0m"
```

```bash
# Cara Menggunakan Script di Parrot OS:
chmod +x dns_auto_recon.sh
./dns_auto_recon.sh 10.10.11.200 target.htb
```

---

# DNS Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export DOMAIN="target.htb"
export LHOST="10.10.14.5"
export WORDLIST="/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"
mkdir -p ~/dns_loot/{records,subdomains,vhosts,axfr}
cd ~/dns_loot

echo "[*] Target: $TARGET | Domain: $DOMAIN"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | Domain: target.htb
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI PORT & DOMAIN DISCOVERY

## ═══════════════════════════════════════

### Langkah 0.1 — Konfirmasi Port DNS Aktif

Bash

```
# Command 1: Cek port UDP dan TCP 53 sekaligus
nmap -sU -sS -p 53 $TARGET

# Command 2: Quick check via netcat
nc -zv -u -w 3 $TARGET 53  # UDP
nc -zv -w 3 $TARGET 53     # TCP (wajib untuk AXFR)

# Command 3: Cek apakah DNS menjawab query basic
dig @$TARGET version.bind TXT CHAOS 2>/dev/null | grep -i "version"
```

**OUTPUT BERHASIL ✅ — Port 53 terbuka:**

text

```
53/tcp open  domain
53/udp open  domain
```

➡️ DNS aktif. Lanjut ke **Langkah 0.2**

**OUTPUT GAGAL ❌ — Port filtered:**

text

```
53/tcp filtered domain
53/udp filtered domain
```

➡️ DNS tidak bisa diakses langsung. Kemungkinan:

1. Port di-filter firewall — lanjut cek service lain
2. DNS berjalan di port non-standard:

Bash

```
nmap -p- --min-rate 5000 $TARGET | grep -E "53|dns|domain"
```

---

### Langkah 0.2 — Domain Discovery (Jika Domain Belum Diketahui)

> **Ini KRITIS!** Tanpa nama domain, DNS enumeration tidak bisa maksimal. Di CTF sering hanya diberi IP.

Bash

```
# Cara 1: Dari Nmap script NSID (paling cepat)
nmap -p 53 --script dns-nsid $TARGET

# Cara 2: Dari SSL/TLS Certificate di port 443 (sangat efektif!)
openssl s_client -connect $TARGET:443 2>/dev/null \
    | openssl x509 -noout -text \
    | grep -E "DNS:|Subject:" 2>/dev/null

# Cara 3: Dari SMB/NetBIOS banner
nxc smb $TARGET 2>/dev/null | grep -oE "domain:[A-Za-z0-9._-]+"

# Cara 4: Dari HTTP header dan redirect
curl -sI http://$TARGET/ 2>/dev/null | grep -iE "location|server|host"
curl -sL http://$TARGET/ 2>/dev/null | grep -oE '[a-zA-Z0-9._-]+\.(htb|local|thm|com)' | sort -u | head -10

# Cara 5: Dari NetBIOS broadcast (UDP 137)
nmap -sU -p 137 --script nbstat $TARGET
```

**OUTPUT BERHASIL ✅ — Domain dari SSL cert:**

text

```
Subject: CN=*.megacorp.htb
X509v3 Subject Alternative Name:
    DNS:megacorp.htb
    DNS:www.megacorp.htb
    DNS:mail.megacorp.htb
```

➡️ Domain adalah `megacorp.htb`:

Bash

```
export DOMAIN="megacorp.htb"
echo "$TARGET $DOMAIN www.$DOMAIN mail.$DOMAIN" | sudo tee -a /etc/hosts
```

**OUTPUT BERHASIL ✅ — Domain dari SMB:**

text

```
SMB  10.10.11.200  445  DC01  [*] domain:CORP.LOCAL
```

➡️ Domain adalah `CORP.LOCAL` (environment AD!):

Bash

```
export DOMAIN="corp.local"
echo "$TARGET corp.local dc01.corp.local" | sudo tee -a /etc/hosts
```

**OUTPUT BERHASIL ✅ — Domain dari nbstat:**

text

```
| nbstat:
|   NetBIOS name: DC01, NetBIOS user: <unknown>
|   NetBIOS MAC: xx:xx:xx:xx:xx:xx
|_  Domain: MEGACORP.LOCAL
```

**OUTPUT GAGAL ❌ — Tidak bisa dapat domain dari manapun:**

➡️ Coba reverse DNS lookup ke IP itu sendiri:

Bash

```
dig @$TARGET -x $TARGET +short
# Atau
host $TARGET $TARGET
```

➡️ Jika masih tidak dapat, gunakan nama IP sebagai domain dan lanjut scanning:

Bash

```
# CTF trick: Coba domain umum yang sering dipakai
for domain in "htb.local" "target.htb" "corp.htb" "lab.local"; do
    result=$(dig @$TARGET $domain SOA +short 2>/dev/null)
    [ -n "$result" ] && echo "[+] Domain valid: $domain → $result"
done
```

**Lanjut ke FASE 1.**

---

## ═══════════════════════════════════════

## FASE 1: DNS FINGERPRINT & RECORD COLLECTION

## ═══════════════════════════════════════

> **Tujuan:** Kumpulkan semua informasi DNS yang tersedia. Setiap record bisa kasih intel berharga.

### Langkah 1.1 — Query Semua Record Utama (Jalankan Semua Sekaligus)

Bash

```
# Command 1: Query ANY — minta semua record sekaligus
dig @$TARGET $DOMAIN ANY

# Command 2: SOA — Start of Authority (email admin, hostname master)
dig @$TARGET $DOMAIN SOA

# Command 3: NS — Nameservers resmi
dig @$TARGET $DOMAIN NS

# Command 4: MX — Mail servers (untuk SMTP workflow)
dig @$TARGET $DOMAIN MX

# Command 5: TXT — Sering bocorkan kredensial, token, subnet internal!
dig @$TARGET $DOMAIN TXT

# Command 6: A — IPv4 address
dig @$TARGET $DOMAIN A +short

# Simpan semua ke file
dig @$TARGET $DOMAIN SOA +noall +answer > ~/dns_loot/records/soa.txt
dig @$TARGET $DOMAIN NS +noall +answer > ~/dns_loot/records/ns.txt
dig @$TARGET $DOMAIN MX +noall +answer > ~/dns_loot/records/mx.txt
dig @$TARGET $DOMAIN TXT +noall +answer > ~/dns_loot/records/txt.txt
dig @$TARGET $DOMAIN A +noall +answer > ~/dns_loot/records/a.txt

echo "[*] Records saved. Analyzing..."
cat ~/dns_loot/records/*.txt
```

**OUTPUT BERHASIL ✅ — SOA Record:**

text

```
;; ANSWER SECTION:
target.htb.  86400  IN  SOA  ns1.target.htb. admin.target.htb. 2024090101 3600 1800 604800 86400
```

**Cara baca SOA — PENTING:**

|Field|Nilai Contoh|Arti & Tindakan|
|---|---|---|
|`ns1.target.htb.`|Primary Nameserver|NS server untuk query AXFR|
|`admin.target.htb.`|Admin Email|**[admin@target.htb](mailto:admin@target.htb)** → kandidat username!|
|`2024090101`|Serial Number|Format YYYYMMDDNN, jarang berguna|

Bash

```
# Langsung ekstrak email admin dari SOA
SOA_EMAIL=$(dig @$TARGET $DOMAIN SOA +short | awk '{print $2}' | sed 's/\.$// ; s/\./@ /1' | tr -d ' ')
echo "[+] Admin email dari SOA: $SOA_EMAIL"
echo "$SOA_EMAIL" >> ~/dns_loot/records/candidate_users.txt
```

**OUTPUT BERHASIL ✅ — MX Record:**

text

```
;; ANSWER SECTION:
target.htb.  86400  IN  MX  10 mail.target.htb.
```

➡️ Ada mail server! Tambahkan ke /etc/hosts dan simpan untuk SMTP workflow:

Bash

```
echo "$TARGET mail.target.htb" | sudo tee -a /etc/hosts
echo "mail.target.htb" >> ~/dns_loot/records/mail_servers.txt
# → Nanti pivot ke <a href="/docs/smtp" class="text-[#00b4d8] hover:underline font-mono font-semibold">08_smtp_workflow.md</a>
```

**OUTPUT BERHASIL ✅ — TXT Record (JACKPOT!):**

text

```
;; ANSWER SECTION:
target.htb.  86400  IN  TXT  "v=spf1 ip4:10.10.11.0/24 include:_spf.google.com ~all"
target.htb.  86400  IN  TXT  "vault-token=s.1298410294810294810"
target.htb.  86400  IN  TXT  "gitea-admin-pass=Admin@2024!"
```

➡️ **JACKPOT!** Ekstrak semua intel dari TXT:

Bash

```
# Ekstrak subnet internal dari SPF
echo "$(dig @$TARGET $DOMAIN TXT +short | grep spf)" | grep -oE "ip4:[0-9./]+" | cut -d: -f2
# → Ini adalah subnet internal! Simpan untuk reverse sweep

# Simpan credentials yang bocor
echo "vault-token:s.1298410294810294810" >> ~/dns_loot/records/found_credentials.txt
echo "gitea-admin:Admin@2024!" >> ~/dns_loot/records/found_credentials.txt
```

**OUTPUT GAGAL ❌ — NXDOMAIN atau SERVFAIL:**

text

```
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN
```

➡️ Domain yang dipakai salah. Cek ulang Langkah 0.2:

Bash

```
# Coba domain variations
for dom in "$DOMAIN" "${DOMAIN%.htb}.local" "${DOMAIN%.htb}.com"; do
    result=$(dig @$TARGET $dom SOA +short 2>/dev/null)
    echo "[$dom] → $result"
done
```

---

### Langkah 1.2 — Cek Open DNS Resolver

Bash

```
# Test apakah DNS server mau resolve domain eksternal
dig @$TARGET google.com A +short
dig @$TARGET 8.8.8.8 A +short
```

**OUTPUT BERHASIL ✅ — Mengembalikan IP eksternal:**

text

```
142.250.190.46
```

➡️ Target adalah **Open DNS Resolver** — rentan untuk DNS amplification dan cache poisoning. Catat:

Bash

```
echo "[!] OPEN DNS RESOLVER DITEMUKAN: $TARGET" >> ~/dns_loot/records/notes.txt
```

**OUTPUT GAGAL ❌ — REFUSED atau tidak ada jawaban:**

text

```
;; ->>HEADER<<- opcode: QUERY, status: REFUSED
```

➡️ Server tidak mau resolve domain eksternal. Normal untuk internal DNS. Lanjut.

**Lanjut ke FASE 2.**

---

## ═══════════════════════════════════════

## FASE 2: ZONE TRANSFER (AXFR) — PRIORITAS UTAMA!

## ═══════════════════════════════════════

> **WAJIB DICOBA DULU!** Zone Transfer bisa kasih seluruh peta infrastruktur dalam 1 detik. Jangan brute force dulu sebelum coba ini.  
> **Syarat:** Port 53 TCP harus terbuka!

### Langkah 2.1 — Verifikasi TCP 53 Terbuka

Bash

```
# WAJIB: Cek TCP 53 dulu, karena AXFR butuh TCP!
nc -vn -z -w 3 $TARGET 53
nmap -p 53 -sT $TARGET
```

**OUTPUT BERHASIL ✅ — TCP 53 terbuka:**

text

```
Connection to 10.10.11.200 53 port [tcp/domain] succeeded!
53/tcp open domain
```

➡️ Lanjut ke Langkah 2.2

**OUTPUT GAGAL ❌ — TCP 53 closed/filtered:**

text

```
nc: connect to 10.10.11.200 port 53 (tcp) failed: Connection refused
```

➡️ AXFR tidak akan berhasil tanpa TCP 53. Skip ke **Fase 3** (Passive) atau **Fase 4** (Brute Force).

---

### Langkah 2.2 — Eksekusi Zone Transfer (3 Tool)

Bash

```
# Method 1: dig (paling reliable dan verbose)
dig @$TARGET $DOMAIN AXFR | tee ~/dns_loot/axfr/axfr_dig.txt

# Method 2: host (simple fallback)
host -l $DOMAIN $TARGET | tee ~/dns_loot/axfr/axfr_host.txt

# Method 3: dnsrecon (automated + format bagus)
dnsrecon -d $DOMAIN -t axfr -n $TARGET | tee ~/dns_loot/axfr/axfr_dnsrecon.txt

# Method 4: fierce (jika ada NS lain)
NS=$(dig @$TARGET $DOMAIN NS +short | head -1 | sed 's/\.$//') 
dig @$TARGET $NS A +short  # Resolve IP nameserver
dig @$(dig @$TARGET $NS A +short) $DOMAIN AXFR  # AXFR ke NS server
```

**OUTPUT BERHASIL ✅ — AXFR berhasil (JACKPOT!):**

text

```
; <<>> DiG 9.18.28 <<>> @10.10.11.200 target.htb AXFR
;; global options: +cmd
target.htb.       86400 IN SOA   ns1.target.htb. admin.target.htb. 2024090101 3600 1800 604800 86400
target.htb.       86400 IN NS    ns1.target.htb.
target.htb.       86400 IN A     10.10.11.200
admin.target.htb. 86400 IN A     10.10.11.201
dev.target.htb.   86400 IN CNAME target.htb.
mail.target.htb.  86400 IN A     10.10.11.205
gitlab.target.htb. 86400 IN A    10.10.11.210
vpn.target.htb.   86400 IN A     10.10.11.254
backup.target.htb. 86400 IN A    10.10.11.220
target.htb.       86400 IN SOA   ns1.target.htb. admin.target.htb. 2024090101 3600 1800 604800 86400

;; XFR size: 9 records (messages 1, bytes 289)
```

**Cara baca dan tindakan:**

|Record|Value|Tindakan|
|---|---|---|
|`admin.target.htb`|`10.10.11.201`|Server admin — scan port 80/443/22|
|`gitlab.target.htb`|`10.10.11.210`|GitLab = source code! Enum repos|
|`mail.target.htb`|`10.10.11.205`|→ SMTP workflow (08)|
|`backup.target.htb`|`10.10.11.220`|Backup server — cek NFS/FTP/SMB|
|`vpn.target.htb`|`10.10.11.254`|VPN gateway — catat, mungkin butuh tunnel|

➡️ **Parse dan tambahkan semua ke /etc/hosts:**

Bash

```
# One-liner: Parse AXFR dan auto-register ke /etc/hosts
dig @$TARGET $DOMAIN AXFR \
    | grep -E "\sIN\s+A\s+" \
    | awk '{print $5, $1}' \
    | sed 's/\.$//g' \
    | sort -u \
    | while read ip host; do
        echo "[+] Menambahkan: $ip $host"
        grep -q "$host" /etc/hosts || echo "$ip $host" | sudo tee -a /etc/hosts
    done

echo "[*] Verifikasi /etc/hosts:"
cat /etc/hosts | tail -20
```

➡️ **Setelah semua host terdaftar, scan setiap host baru:**

Bash

```
# Ekstrak semua IP baru dari AXFR (kecuali $TARGET)
cat ~/dns_loot/axfr/axfr_dig.txt \
    | grep -E "\sIN\s+A\s+" \
    | awk '{print $5}' \
    | sort -u \
    | grep -v "^$TARGET$" \
    > ~/dns_loot/axfr/new_hosts.txt

echo "[*] New hosts to scan:"
cat ~/dns_loot/axfr/new_hosts.txt

# Quick scan semua host baru
while read newip; do
    echo "=== Scanning $newip ==="
    nmap -sV -p 22,80,443,21,25,445,3306,8080,8443 --open $newip -oN ~/dns_loot/axfr/scan_${newip}.txt
done < ~/dns_loot/axfr/new_hosts.txt
```

**OUTPUT GAGAL ❌ — AXFR REFUSED:**

text

```
; Transfer failed.
;; communications error to 10.10.11.200#53: end of file
```

ATAU:

text

```
; Transfer failed: REFUSED
```

➡️ Zone transfer dikonfigurasi aman. Coba beberapa variasi dulu:

Bash

```
# Coba dengan NS server yang berbeda (jika ada multiple NS)
for ns in $(dig @$TARGET $DOMAIN NS +short); do
    ns_ip=$(dig @$TARGET $ns A +short)
    echo "[*] Mencoba AXFR ke $ns ($ns_ip)"
    dig @$ns_ip $DOMAIN AXFR
done

# Coba dengan IXFR (Incremental Zone Transfer)
dig @$TARGET $DOMAIN IXFR=0
```

➡️ Jika masih REFUSED, lanjut ke **Fase 3** (Passive OSINT) atau **Fase 4** (Active Brute Force).

---

## ═══════════════════════════════════════

## FASE 3: PASSIVE SUBDOMAIN ENUMERATION (OSINT)

## ═══════════════════════════════════════

> **⚠️ CATATAN PENTING:** Fase ini HANYA untuk domain publik (.com, .org, .io).  
> Untuk domain CTF/lab (.htb, .local, .thm) → **SKIP KE FASE 4 LANGSUNG!**

### Langkah 3.1 — Passive Recon untuk Domain Publik

Bash

```
# Cek dulu apakah domain bisa diakses dari internet
nslookup $DOMAIN 8.8.8.8

# Jika resolve → domain publik, jalankan passive recon
# Jika tidak → domain internal CTF, skip ke Fase 4
```

**OUTPUT BERHASIL ✅ — Domain publik, lanjut passive recon:**

Bash

```
# Method 1: Subfinder (paling cepat, pakai multiple API)
subfinder -d $DOMAIN -silent -o ~/dns_loot/subdomains/subfinder.txt
echo "[*] Subfinder found: $(wc -l < ~/dns_loot/subdomains/subfinder.txt) subdomains"

# Method 2: Amass passive mode
amass enum -passive -d $DOMAIN -o ~/dns_loot/subdomains/amass.txt
echo "[*] Amass found: $(wc -l < ~/dns_loot/subdomains/amass.txt) subdomains"

# Method 3: Certificate Transparency via crt.sh
curl -s "https://crt.sh/?q=%.${DOMAIN}&output=json" \
    | jq -r '.[].name_value' \
    | sed 's/\*\.//g' \
    | sort -u \
    | tee ~/dns_loot/subdomains/crtsh.txt
echo "[*] crt.sh found: $(wc -l < ~/dns_loot/subdomains/crtsh.txt) subdomains"

# Method 4: VirusTotal (butuh API key)
# curl -s "https://www.virustotal.com/vtapi/v2/domain/report?apikey=APIKEY&domain=$DOMAIN"

# Gabungkan dan deduplikasi
cat ~/dns_loot/subdomains/*.txt | sort -u > ~/dns_loot/subdomains/all_passive.txt
echo "[*] Total unique subdomains: $(wc -l < ~/dns_loot/subdomains/all_passive.txt)"
cat ~/dns_loot/subdomains/all_passive.txt
```

**OUTPUT BERHASIL ✅ — Subdomain ditemukan:**

text

```
[*] Subfinder found: 47 subdomains
[*] Amass found: 82 subdomains
[*] crt.sh found: 31 subdomains
[*] Total unique subdomains: 95

admin.megacorp.com
dev.megacorp.com
api.megacorp.com
staging.megacorp.com
jenkins.megacorp.com
```

➡️ Resolve semua ke IP dan simpan:

Bash

```
# Resolve semua subdomain ke IP
while read sub; do
    ip=$(dig @8.8.8.8 $sub A +short 2>/dev/null | head -1)
    [ -n "$ip" ] && echo "$ip $sub" && echo "$ip $sub" | sudo tee -a /etc/hosts
done < ~/dns_loot/subdomains/all_passive.txt
```

**OUTPUT GAGAL ❌ — Subfinder tidak mengembalikan hasil:**

text

```
[INF] No results found for megacorp.htb
```

➡️ Domain private/internal. Langsung ke **Fase 4**.

---

## ═══════════════════════════════════════

## FASE 4: ACTIVE SUBDOMAIN BRUTE FORCE

## ═══════════════════════════════════════

> **Tujuan:** Temukan subdomain tersembunyi yang tidak ada di AXFR atau OSINT.

### Langkah 4.1 — Cek Wildcard DNS Dulu (WAJIB!)

Bash

```
# Test wildcard: Query nama yang pasti tidak ada
dig @$TARGET "randomxyz123abc456.$DOMAIN" A +short
dig @$TARGET "thisdoesntexist99999.$DOMAIN" A +short
```

**OUTPUT BERHASIL ✅ — Tidak ada wildcard:**

text

```
(kosong / NXDOMAIN)
```

➡️ Tidak ada wildcard. Brute force bisa berjalan normal.

**OUTPUT GAGAL ❌ — Wildcard aktif:**

text

```
10.10.11.200
```

➡️ Wildcard aktif! Semua nama domain akan resolve ke IP yang sama. Brute force DNS akan penuh false positive.

Bash

```
# Catat IP wildcard
WILDCARD_IP=$(dig @$TARGET "randomxyz123abc456.$DOMAIN" A +short)
echo "[!] Wildcard DNS aktif! IP: $WILDCARD_IP"
echo "[*] Akan gunakan VHost fuzzing (Fase 5) sebagai gantinya"
# → Skip ke Fase 5 (VHost Fuzzing) untuk bypass wildcard
```

---

### Langkah 4.2 — Gobuster DNS Brute Force

Bash

```
# Command utama: Gobuster DNS dengan custom resolver
# PENTING: -r $TARGET:53 WAJIB agar query ke DNS target, bukan DNS lokal!
gobuster dns -d $DOMAIN \
    -r $TARGET:53 \
    -w $WORDLIST \
    -t 25 \
    --wildcard \
    -o ~/dns_loot/subdomains/gobuster_results.txt

# Lihat hasil real-time
tail -f ~/dns_loot/subdomains/gobuster_results.txt
```

**OUTPUT BERHASIL ✅ — Subdomain ditemukan:**

text

```
===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Domain:     target.htb
[+] Threads:    25
[+] Resolver:   10.10.11.200:53
[+] Wildcard:   false
===============================================================
Found: dev.target.htb
Found: admin.target.htb
Found: gitlab.target.htb
Found: api.target.htb
===============================================================
```

➡️ Parse dan tambahkan ke /etc/hosts:

Bash

```
# Ekstrak subdomain yang ditemukan
cat ~/dns_loot/subdomains/gobuster_results.txt \
    | grep "Found:" \
    | awk '{print $2}' \
    > ~/dns_loot/subdomains/found_subdomains.txt

# Resolve ke IP dan tambahkan ke /etc/hosts
while read sub; do
    ip=$(dig @$TARGET $sub A +short 2>/dev/null | head -1)
    if [ -n "$ip" ]; then
        echo "[+] $sub → $ip"
        grep -q "$sub" /etc/hosts || echo "$ip $sub" | sudo tee -a /etc/hosts
    fi
done < ~/dns_loot/subdomains/found_subdomains.txt
```

**OUTPUT GAGAL ❌ — Gobuster: Many timeouts:**

text

```
2024/01/15 10:23:45 [-] Timeout error for: mail.target.htb
2024/01/15 10:23:45 [-] Timeout error for: dev.target.htb
```

➡️ Thread terlalu tinggi, server rate-limiting:

Bash

```
# Turunkan thread dan tambahkan timeout
gobuster dns -d $DOMAIN -r $TARGET:53 -w $WORDLIST -t 10 --timeout 5s

# Atau coba dnsrecon sebagai alternatif
dnsrecon -d $DOMAIN -D $WORDLIST -t brt -n $TARGET \
    | tee ~/dns_loot/subdomains/dnsrecon_brute.txt
```

**OUTPUT GAGAL ❌ — Gobuster: Wildcard blocking:**

text

```
[WARNING] Wildcard DNS found: *.target.htb. Wildcard responses will be filtered out
```

➡️ Gobuster mendeteksi wildcard dan otomatis filter. Coba ffuf untuk bypass lebih efektif:

Bash

```
# ffuf untuk bypass wildcard via HTTP VHost (Fase 5)
# Atau paksa gobuster ignore wildcard:
WILDCARD_IP=$(dig @$TARGET "xyz123.$DOMAIN" A +short)
gobuster dns -d $DOMAIN -r $TARGET:53 -w $WORDLIST -t 25 \
    --wildcard \
    --no-error
```

---

### Langkah 4.3 — dnsrecon Comprehensive Scan

Bash

```
# Standard recon: query semua tipe record untuk domain
dnsrecon -d $DOMAIN -n $TARGET -t std \
    | tee ~/dns_loot/subdomains/dnsrecon_std.txt

# Cari juga wildcard record
dnsrecon -d $DOMAIN -n $TARGET -t zonewalk \
    | tee ~/dns_loot/subdomains/dnsrecon_zonewalk.txt

# Full scan dengan dnsenum
dnsenum --dnsserver $TARGET \
    --enum \
    -p 0 \
    -s 0 \
    -f $WORDLIST \
    $DOMAIN \
    -o ~/dns_loot/subdomains/dnsenum_output.xml
```

**OUTPUT BERHASIL ✅ — dnsrecon menemukan subdomain:**

text

```
[*] Performing General Enumeration of Domain: target.htb
[-] DNSSEC is not configured for target.htb
[*]      SOA ns1.target.htb 10.10.11.200
[*]       NS ns1.target.htb 10.10.11.200
[*]       MX mail.target.htb 10.10.11.205
[*]       A  target.htb 10.10.11.200
[*]       A  dev.target.htb 10.10.11.200
[*]       A  admin.target.htb 10.10.11.201
```

---

## ═══════════════════════════════════════

## FASE 5: VIRTUAL HOST (VHOST) FUZZING

## ═══════════════════════════════════════

> **Tujuan:** Temukan subdomain tersembunyi yang hanya accessible via HTTP Host header, bukan via DNS.  
> **Kapan dipakai:** Saat brute force DNS tidak dapat hasil, atau saat ada wildcard DNS.

### Langkah 5.1 — Cek Apakah Ada Web Server di Port 80/443

Bash

```
# Quick check web server
curl -s -I http://$TARGET/ | head -5
curl -s -I https://$TARGET/ 2>/dev/null | head -5

# Atau via nmap
nmap -p 80,443,8080,8443 --open $TARGET
```

**OUTPUT BERHASIL ✅ — Ada web server:**

text

```
HTTP/1.1 200 OK
Server: Apache/2.4.41 (Ubuntu)
```

➡️ Ada web server! Lanjut ke VHost fuzzing.

**OUTPUT GAGAL ❌ — Tidak ada web server:**

text

```
curl: (7) Failed to connect to 10.10.11.200 port 80: Connection refused
```

➡️ Tidak ada web server. VHost fuzzing tidak relevan. Skip ke **Fase 6** (Reverse PTR).

---

### Langkah 5.2 — Identifikasi Baseline Response Size

Bash

```
# Step WAJIB: Kirim request dengan hostname yang pasti tidak ada
# Catat Content-Length dan response code dari halaman default
curl -s -I http://$TARGET/ -H "Host: randomnotexist123456.$DOMAIN"
curl -s http://$TARGET/ -H "Host: randomnotexist123456.$DOMAIN" | wc -c
```

**OUTPUT BERHASIL ✅ — Dapat baseline:**

text

```
HTTP/1.1 200 OK
Content-Length: 154
```

➡️ Baseline size adalah **154**. Pakai ini untuk filter di ffuf:

Bash

```
export BASELINE_SIZE=154
echo "[*] Baseline response size: $BASELINE_SIZE bytes"
```

---

### Langkah 5.3 — VHost Fuzzing dengan ffuf

Bash

```
# Main command: ffuf VHost fuzzing
ffuf -u http://$TARGET/ \
    -H "Host: FUZZ.$DOMAIN" \
    -w $WORDLIST \
    -fs $BASELINE_SIZE \
    -c \
    -v \
    -o ~/dns_loot/vhosts/ffuf_results.json

# Versi HTTPS (jika ada)
ffuf -u https://$TARGET/ \
    -H "Host: FUZZ.$DOMAIN" \
    -w $WORDLIST \
    -fs $BASELINE_SIZE \
    -c \
    -k \
    -v
```

**OUTPUT BERHASIL ✅ — VHost ditemukan:**

text

```
[Status: 200, Size: 4120, Words: 890, Lines: 120, Duration: 22ms]
    * FUZZ: dev

[Status: 200, Size: 6850, Words: 1240, Lines: 180, Duration: 24ms]
    * FUZZ: admin

[Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 15ms]
    * FUZZ: gitlab
```

➡️ **VHost ditemukan!** Tambahkan ke /etc/hosts dan akses:

Bash

```
# Tambahkan semua VHost yang ditemukan
for vhost in dev admin gitlab; do
    echo "[+] Menambahkan: $vhost.$DOMAIN"
    grep -q "$vhost.$DOMAIN" /etc/hosts || \
        echo "$TARGET $vhost.$DOMAIN" | sudo tee -a /etc/hosts
done

# Verifikasi bisa diakses
curl -s -L "http://admin.$DOMAIN/" | grep -i "<title>"
curl -s -L "http://dev.$DOMAIN/" | grep -i "<title>"

# Simpan untuk web exploitation
echo "admin.$DOMAIN" >> ~/dns_loot/vhosts/found_vhosts.txt
echo "dev.$DOMAIN" >> ~/dns_loot/vhosts/found_vhosts.txt
# → Lanjut ke <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a> untuk setiap VHost
```

**OUTPUT GAGAL ❌ — Semua response sama size (false positives):**

text

```
[Status: 200, Size: 154, Words: 21, Lines: 8, Duration: 12ms]  ← Ini baseline!
[Status: 200, Size: 154, Words: 21, Lines: 8, Duration: 11ms]  ← Ini juga baseline!
```

➡️ Filter tidak cukup. Coba filter berdasarkan kata:

Bash

```
# Identifikasi baseline word count
BASELINE_WORDS=$(curl -s http://$TARGET/ -H "Host: fake123.$DOMAIN" | wc -w)
echo "[*] Baseline word count: $BASELINE_WORDS"

# Jalankan dengan filter word count
ffuf -u http://$TARGET/ \
    -H "Host: FUZZ.$DOMAIN" \
    -w $WORDLIST \
    -fw $BASELINE_WORDS \
    -c -v
```

**OUTPUT GAGAL ❌ — Tidak ada VHost yang berbeda:**

text

```
:: Progress: [5000/5000] :: 0 matches ::
```

➡️ Tidak ada VHost tersembunyi, atau perlu wordlist yang lebih besar:

Bash

```
# Coba wordlist yang lebih besar
ffuf -u http://$TARGET/ \
    -H "Host: FUZZ.$DOMAIN" \
    -w /usr/share/seclists/Discovery/DNS/dns-Jhaddix.txt \
    -fs $BASELINE_SIZE \
    -c
```

---

### Langkah 5.4 — Gobuster VHost (Alternatif ffuf)

Bash

```
# Gobuster vhost mode
gobuster vhost \
    -u http://$TARGET/ \
    --domain $DOMAIN \
    -w $WORDLIST \
    --append-domain \
    -t 30 \
    -o ~/dns_loot/vhosts/gobuster_vhost.txt
```

**OUTPUT BERHASIL ✅:**

text

```
Found: dev.target.htb Status: 200 [Size: 4120]
Found: admin.target.htb Status: 302 [Size: 0]
```

---

## ═══════════════════════════════════════

## FASE 6: REVERSE DNS LOOKUP (PTR SWEEP)

## ═══════════════════════════════════════

> **Tujuan:** Temukan server tersembunyi yang tidak terdaftar di DNS forward, tapi punya PTR record.

### Langkah 6.1 — Single IP Reverse Lookup

Bash

```
# Test reverse lookup untuk IP target
dig @$TARGET -x $TARGET +short
host $TARGET $TARGET
```

**OUTPUT BERHASIL ✅:**

text

```
dc01.corp.local.
```

➡️ IP `$TARGET` adalah `dc01.corp.local`. Tambahkan ke /etc/hosts jika belum ada.

---

### Langkah 6.2 — Subnet Reverse Sweep

Bash

```
# Method 1: dnsrecon sweep /24 subnet (paling mudah)
# CATATAN: Tidak perlu flag -d saat sweep PTR!
dnsrecon -r 10.10.11.0/24 -n $TARGET \
    | tee ~/dns_loot/records/ptr_sweep.txt

# Method 2: Bash one-liner (cepat dan mandiri)
echo "[*] Starting PTR sweep on 10.10.11.0/24"
for ip in $(seq 1 254); do
    result=$(dig @$TARGET -x 10.10.11.$ip +short 2>/dev/null)
    if [ -n "$result" ]; then
        echo "[+] 10.10.11.$ip → $result"
        echo "10.10.11.$ip $result" | sed 's/\.$//g' | sudo tee -a /etc/hosts
    fi
done | tee ~/dns_loot/records/ptr_results.txt

echo "[*] PTR sweep selesai. Found:"
cat ~/dns_loot/records/ptr_results.txt
```

**OUTPUT BERHASIL ✅ — Server tersembunyi ditemukan:**

text

```
[+] 10.10.11.200 → dc01.corp.local.
[+] 10.10.11.205 → mail.corp.local.
[+] 10.10.11.210 → gitlab.corp.local.    ← Tidak ada di DNS forward!
[+] 10.10.11.220 → backup-nas.corp.local.← Tidak ada di DNS forward!
```

➡️ **BONUS HOSTS ditemukan!** Scan port mereka:

Bash

```
echo "[*] Scanning hidden hosts..."
for ip in 10.10.11.210 10.10.11.220; do
    echo "=== $ip ==="
    nmap -sV -p 22,80,443,445,21,3306 --open $ip --min-rate 1000 -oN ~/dns_loot/records/scan_$ip.txt
done
```

**OUTPUT GAGAL ❌ — Tidak ada PTR record:**

text

```
(semua kosong / NXDOMAIN)
```

➡️ Administrator tidak mengkonfigurasi PTR records, atau subnet berbeda. Lanjut ke **Fase 7**.

---

## ═══════════════════════════════════════

## FASE 7: SRV RECORDS & AD DNS DISCOVERY

## ═══════════════════════════════════════

> **Tujuan:** Jika ini environment Active Directory, SRV records akan langsung tunjukkan lokasi Domain Controller, Kerberos, dan LDAP.

### Langkah 7.1 — Query SRV Records AD

Bash

```
# Temukan Domain Controllers
dig @$TARGET _ldap._tcp.dc._msdcs.$DOMAIN SRV
dig @$TARGET _ldap._tcp.$DOMAIN SRV

# Temukan Kerberos KDC
dig @$TARGET _kerberos._tcp.$DOMAIN SRV

# Temukan Global Catalog
dig @$TARGET _gc._tcp.$DOMAIN SRV

# Temukan PDC (Primary DC)
dig @$TARGET _ldap._tcp.pdc._msdcs.$DOMAIN SRV
```

**OUTPUT BERHASIL ✅ — Domain Controller ditemukan:**

text

```
;; ANSWER SECTION:
_ldap._tcp.dc._msdcs.corp.local.  600  IN  SRV  0 100 389 dc01.corp.local.
_ldap._tcp.dc._msdcs.corp.local.  600  IN  SRV  0 100 389 dc02.corp.local.
```

➡️ **JACKPOT!** Domain Controller teridentifikasi:

Bash

```
# Ekstrak DC hostname
DC_HOST=$(dig @$TARGET _ldap._tcp.dc._msdcs.$DOMAIN SRV +short | awk '{print $4}' | sed 's/\.$//' | head -1)
DC_IP=$(dig @$TARGET $DC_HOST A +short)
echo "[+] Primary DC: $DC_HOST ($DC_IP)"

# Tambahkan ke /etc/hosts
echo "$DC_IP $DC_HOST $DOMAIN" | sudo tee -a /etc/hosts

# Set variabel untuk AD attacks
export DC_IP
export DC_HOST

echo "[*] Siap untuk AD enumeration!"
echo "[*] → Lanjut ke <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>"
echo "[*] → Kerberoasting: <a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>"
```

**OUTPUT GAGAL ❌ — Tidak ada SRV record:**

text

```
;; AUTHORITY SECTION:
$DOMAIN.  SOA  ...  (NXDOMAIN)
```

➡️ Bukan AD environment, atau domain salah. Lanjut ke **Fase 8**.

---

## ═══════════════════════════════════════

## FASE 8: TXT & SPF ANALYSIS

## ═══════════════════════════════════════

### Langkah 8.1 — Deep TXT Record Analysis

Bash

```
# Query TXT records
dig @$TARGET $DOMAIN TXT +short
dig @$TARGET $DOMAIN TXT

# Cari di semua subdomain yang sudah ditemukan
while read sub; do
    result=$(dig @$TARGET $sub TXT +short 2>/dev/null)
    [ -n "$result" ] && echo "[$sub] $result"
done < ~/dns_loot/subdomains/found_subdomains.txt
```

**OUTPUT BERHASIL ✅ — SPF bocorkan subnet internal:**

text

```
"v=spf1 ip4:10.10.11.0/24 ip4:192.168.1.0/24 include:_spf.google.com ~all"
```

➡️ Subnet internal terungkap! Sweep subnet tersebut:

Bash

```
# Ekstrak subnet dari SPF
SPF=$(dig @$TARGET $DOMAIN TXT +short | grep "spf1")
echo "$SPF" | grep -oE "ip4:[0-9./]+" | cut -d: -f2 \
    | while read subnet; do
        echo "[*] Sweeping subnet: $subnet"
        nmap -sn $subnet --min-rate 5000 | grep "Nmap scan report"
    done
```

**OUTPUT BERHASIL ✅ — Credentials di TXT record:**

text

```
"gitea-admin=Admin@2024! server=10.10.11.210"
```

➡️ **Credentials ditemukan di DNS TXT record!**

Bash

```
echo "gitea-admin:Admin@2024!" >> ~/dns_loot/records/found_credentials.txt
echo "10.10.11.210" >> ~/dns_loot/records/notes.txt
# Test credentials ke semua service di 10.10.11.210
nmap -sV -p 22,80,443,3000,8080 10.10.11.210
```

---

## ═══════════════════════════════════════

## FASE 9: DNS CACHE SNOOPING

## ═══════════════════════════════════════

> **Tujuan:** Intip domain apa saja yang baru-baru ini dikunjungi pengguna di jaringan internal.

### Langkah 9.1 — Cache Snooping

Bash

```
# Flag +norecurse = tidak minta resolver untuk cari jawaban baru
# Jika ada jawaban dengan TTL > 0, domain itu ada di cache!

# Daftar domain yang menarik untuk di-snoop
DOMAINS_TO_CHECK=(
    "internal-portal.$DOMAIN"
    "vpn.$DOMAIN"
    "git.$DOMAIN"
    "jenkins.$DOMAIN"
    "jira.$DOMAIN"
    "confluence.$DOMAIN"
    "admin.$DOMAIN"
    "backup.$DOMAIN"
)

echo "[*] Checking DNS cache for visited domains..."
for dom in "${DOMAINS_TO_CHECK[@]}"; do
    result=$(dig @$TARGET $dom A +norecurse +short 2>/dev/null)
    if [ -n "$result" ]; then
        echo "[+] IN CACHE (recently visited): $dom → $result"
    fi
done
```

**OUTPUT BERHASIL ✅ — Domain ada di cache:**

text

```
[+] IN CACHE (recently visited): internal-portal.corp.local → 10.10.11.250
[+] IN CACHE (recently visited): jenkins.corp.local → 10.10.11.215
```

➡️ Ada pengguna internal yang baru mengakses `internal-portal` dan `jenkins`:

Bash

```
echo "10.10.11.250 internal-portal.corp.local" | sudo tee -a /etc/hosts
echo "10.10.11.215 jenkins.corp.local" | sudo tee -a /etc/hosts

# Scan port kedua host baru
nmap -sV -p 22,80,443,8080,8443 10.10.11.250 10.10.11.215
```

---

## ═══════════════════════════════════════

## FASE 10: POST-ENUM — PIVOT & CROSS-SERVICE

## ═══════════════════════════════════════

### Langkah 10.1 — Konsolidasi Temuan dan Tentukan Target Berikutnya

Bash

```
# Summary semua yang ditemukan
echo "========================================="
echo "DNS ENUMERATION SUMMARY"
echo "========================================="
echo "[*] Domain: $DOMAIN"
echo "[*] Subdomains found:"
cat ~/dns_loot/subdomains/found_subdomains.txt 2>/dev/null || echo "  None"
echo "[*] VHosts found:"
cat ~/dns_loot/vhosts/found_vhosts.txt 2>/dev/null || echo "  None"
echo "[*] Credentials found:"
cat ~/dns_loot/records/found_credentials.txt 2>/dev/null || echo "  None"
echo "[*] New IPs discovered:"
cat ~/dns_loot/axfr/new_hosts.txt 2>/dev/null || echo "  None"
echo "========================================="
```

**Cross-Service Routing dari DNS:**

text

```
DNS Findings
     │
     ├─ ─ mail.domain → Port 25 (SMTP)    → <a href="/docs/smtp" class="text-[#00b4d8] hover:underline font-mono font-semibold">08_smtp_workflow.md</a>
     │                 Port 110/143       → Baca email
     │
     ├─ ─ Subdomain baru → Port 80/443     → <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>
     │   (admin, dev, api, gitlab)         [16. Directory & Virtual Host (VHost) Fuzzing Workflow — Master Field Guide](/docs/directory-vhost-fuzzing)
     │
     ├─ ─ DC hostname → Port 445 (SMB)    → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     │   (dc01.corp.local)  Port 389 (LDAP) → <a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a>
     │                      Port 88 (Kerb)  → <a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>
     │
     ├─ ─ backup.domain → Port 21 (FTP)   → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
     │                   Port 2049 (NFS) → <a href="/docs/nfs" class="text-[#00b4d8] hover:underline font-mono font-semibold">13_nfs_workflow.md</a>
     │                   Port 445 (SMB)  → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     │
     ├── Subnet dari SPF → Host discovery → Scan semua host
     │
     └── Credentials dari TXT → Test ke semua service
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`connection timed out; no servers could be reached`|Port 53 diblokir atau DNS mati|`nmap -sU -sS -p 53 $TARGET` untuk verifikasi|
|`AXFR transfer failed: REFUSED`|Zone transfer dikonfigurasi aman|Beralih ke brute force (Fase 4) dan VHost (Fase 5)|
|`Wildcard DNS` mengacaukan brute force|`*.domain` resolve ke IP sama|Gunakan `--wildcard` di Gobuster, filter `-fs` di ffuf|
|Gobuster banyak timeout|Rate limit atau thread terlalu tinggi|Turunkan `-t 10`, tambahkan `--timeout 5s`|
|Subfinder tidak ada hasil|Domain private/internal CTF|Domain `.htb/.local` tidak ada di OSINT publik, skip ke Fase 4|
|Semua query NXDOMAIN|Domain salah eja atau berbeda|Cek ulang dari banner SSH/HTTP/SMB, coba variasi nama|
|DNS over TCP tidak bisa|Port 53 TCP di-firewall|Cek `nc -vn -z $TARGET 53`, AXFR butuh TCP|
|SOA query mengembalikan referral|Target bukan authoritative NS|Query NS record, cari IP nameserver authoritative|
|Subdomain di browser 404|Belum ditambahkan ke `/etc/hosts`|`echo "$TARGET subdomain.$DOMAIN" \| sudo tee -a /etc/hosts`|
|False positives berlebihan di Gobuster|Resolver lokal ikut campur|Selalu pakai `-r $TARGET:53` untuk query langsung ke target|
|`Transfer failed: end of file`|TCP 53 closed|Verifikasi TCP 53 dengan `nmap -p 53 -sT $TARGET`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Port 53 Open
│
├─ FASE 0: Domain Discovery
│   ├─ Dari SSL cert → export DOMAIN
│   ├─ Dari SMB/banner → export DOMAIN
│   └─ Tidak dapat → coba variasi nama
│
├─ FASE 1: Record Collection
│   ├─ SOA → email admin → kandidat username
│   ├─ MX → mail server → pivot ke SMTP (08)
│   ├─ TXT → SPF subnet, credentials bocor!
│   └─ NS → nameserver untuk AXFR
│
├─ FASE 2: Zone Transfer (AXFR) ← PRIORITAS!
│   ├─ [BERHASIL] → Peta infrastruktur lengkap
│   │   ├─ Auto-register ke /etc/hosts
│   │   └─ Scan semua host baru
│   └─ [REFUSED] → Lanjut ke Fase 3/4
│
├─ FASE 3: Passive OSINT (hanya domain publik!)
│   ├─ Domain .htb/.local → SKIP langsung ke Fase 4
│   └─ Domain publik → subfinder + amass + crt.sh
│
├─ FASE 4: Active Brute Force
│   ├─ Cek wildcard dulu!
│   ├─ [Wildcard aktif] → ke Fase 5 (VHost)
│   └─ [Tidak ada wildcard] → gobuster dns
│
├─ FASE 5: VHost Fuzzing (jika ada port 80/443)
│   ├─ Identifikasi baseline size
│   ├─ ffuf dengan filter -fs
│   └─ [VHost ditemukan] → scan + web exploitation
│
├─ FASE 6: Reverse PTR Sweep
│   └─ [Host tersembunyi] → scan port baru
│
├─ FASE 7: SRV Records (AD Environment)
│   └─ [DC ditemukan] → AD enumeration (35)
│
└─ FASE 8-10: TXT Analysis, Cache Snooping, Pivot
    └─ Konsolidasi semua temuan → routing ke workflow berikutnya
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export DOMAIN="target.htb"
export WORDLIST="/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"
mkdir -p ~/dns_loot/{records,subdomains,vhosts,axfr}

# === DOMAIN DISCOVERY ===
openssl s_client -connect $TARGET:443 2>/dev/null | openssl x509 -noout -text | grep "DNS:"
nxc smb $TARGET 2>/dev/null | grep "domain:"
curl -sI http://$TARGET/ | grep -i "location"

# === RECORD COLLECTION ===
dig @$TARGET $DOMAIN ANY          # Semua record
dig @$TARGET $DOMAIN SOA          # Email admin
dig @$TARGET $DOMAIN NS           # Nameservers
dig @$TARGET $DOMAIN MX           # Mail server → pivot ke 08
dig @$TARGET $DOMAIN TXT +short   # Secrets, SPF subnet
dig @$TARGET $DOMAIN A +short     # IPv4 address

# === ZONE TRANSFER (PRIORITAS PERTAMA!) ===
dig @$TARGET $DOMAIN AXFR                      # dig AXFR
host -l $DOMAIN $TARGET                         # host AXFR
dnsrecon -d $DOMAIN -t axfr -n $TARGET          # dnsrecon AXFR

# Parse & register ke /etc/hosts:
dig @$TARGET $DOMAIN AXFR | grep -E "\sIN\s+A\s+" | awk '{print $5, $1}' | sed 's/\.$//g' | sort -u | sudo tee -a /etc/hosts

# === PASSIVE OSINT (domain publik saja) ===
subfinder -d $DOMAIN -silent -o ~/dns_loot/subdomains/subfinder.txt
amass enum -passive -d $DOMAIN -o ~/dns_loot/subdomains/amass.txt
curl -s "https://crt.sh/?q=%.${DOMAIN}&output=json" | jq -r '.[].name_value' | sort -u

# === ACTIVE BRUTE FORCE ===
# Cek wildcard dulu!
dig @$TARGET "randomxyz123.$DOMAIN" A +short
# Kalau kosong (tidak wildcard):
gobuster dns -d $DOMAIN -r $TARGET:53 -w $WORDLIST -t 25 --wildcard
dnsrecon -d $DOMAIN -D $WORDLIST -t brt -n $TARGET

# === VHOST FUZZING ===
# Cek baseline size:
curl -s http://$TARGET/ -H "Host: fake123.$DOMAIN" | wc -c  # → catat sebagai BASELINE
ffuf -u http://$TARGET/ -H "Host: FUZZ.$DOMAIN" -w $WORDLIST -fs BASELINE -c -v
gobuster vhost -u http://$TARGET/ --domain $DOMAIN -w $WORDLIST --append-domain -t 30

# === REVERSE PTR SWEEP ===
dnsrecon -r 10.10.11.0/24 -n $TARGET                         # sweep /24
dig @$TARGET -x $TARGET +short                                 # single IP

# === ACTIVE DIRECTORY DNS ===
dig @$TARGET _ldap._tcp.dc._msdcs.$DOMAIN SRV                 # Locate DCs → pivot ke 35
dig @$TARGET _kerberos._tcp.$DOMAIN SRV                        # Locate Kerberos → pivot ke 37
dig @$TARGET _gc._tcp.$DOMAIN SRV                              # Locate Global Catalog

# === CACHE SNOOPING ===
dig @$TARGET internal.$DOMAIN A +norecurse +short             # Cek cache
```

---

> **➡️ NEXT:** Setelah DNS selesai dan peta infrastruktur sudah terbentuk, lanjut ke **`[10. SNMP Enumeration & Information Gathering Workflow — Master Field Guide](/docs/snmp)`** untuk dump MIB tree dan ekstrak daftar proses, routing table, serta credentials plaintext yang tersimpan di memory sistem target.