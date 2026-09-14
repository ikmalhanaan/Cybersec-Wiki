---
id: "03"
title: "03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif"
category: "1. Fondasi"
categoryId: "fondasi"
filename: "03_nmap_master_workflow.md"
refs_out: ["01","02","04"]
refs_in: ["02","04","05","09","10","12","13","14a","14c","15","16"]
---

# 03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif

---

## 🎯 Pendahuluan

Selamat datang di modul inti **Network Scanning & Enumeration** menggunakan **Nmap (*Network Mapper*)**. Pada dua modul terdahulu ([01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi) dan [02. Parrot OS Setup, Tools Ecosystem, dan Workspace Optimization](/docs/parrot-os-setup-dan-tools)), Anda telah membekali diri dengan mindset pentester terstruktur serta lingkungan kerja Parrot OS XFCE yang optimal.

Nmap adalah senjata nomor satu (*industry standard*) yang menjadi jembatan antara fase *Reconnaissance* dan *Exploitation*. Dokumen ini disusun sebagai panduan menyeluruh dari nol, mengupas anatomi flag, urutan workflow standar CTF (HackTheBox, TryHackMe, Proving Grounds), analisis output, decision tree pasca-scan, integrasi antar-tool, hingga troubleshooting error di lapangan.

---

## 🧭 Bagian 1: Filosofi Scanning

```text
+=============================================================================+
|                      THE STAGED SCANNING PHILOSOPHY                         |
+=============================================================================+
|                                                                             |
|   [ KESALAHAN PEMULA ]                                                      |
|   $ nmap -p- -sC -sV -A 10.10.10.10                                         |
|   └─> Scan 65.535 port + script berat sekaligus.                            |
|   └─> Menunggu 45+ menit melamun di depan layar tanpa hasil apa-apa.         |
|                                                                             |
|   [ PENDEKATAN PROFESIONAL (STAGED SCANNING) ]                              |
|   Langkah 1: Fast Probe (Top 1000 ports) ──> Dapatkan Port 80 & 22 (5 detik)|
|   Langkah 2: Langsung selidiki Port 80 (Web) di browser & FFUF              |
|   Langkah 3: Jalankan Full Port Scan (1-65535) di Background Tmux Pane      |
|   Langkah 4: Jalankan Targeted Deep NSE pada port yang ditemukan            |
|                                                                             |
+=============================================================================+
```

### 1.1 Kenapa Urutan Scanning Sangat Penting?

Banyak pemula melakukan kesalahan fatal: langsung menjalankan perintah scan paling berat pada semua port (`nmap -p- -sC -sV $TARGET`). 

**Mengapa ini buruk?**
1. **Membuang Waktu (*Time Inefficiency*)**: Menjalankan deteksi versi (`-sV`) dan default script (`-sC`) pada 65.535 port membutuhkan waktu puluhan menit. Padahal, port 80 (HTTP) dan port 22 (SSH) sudah terdeteksi di 5 detik pertama.
2. **Kehilangan Momentum Eksploitasi**: Selagi Anda menunggu scan full selesai, Anda seharusnya sudah bisa membuka web browser, memeriksa direktori tersembunyi, atau membaca source code.
3. **Risiko Network Congestion / Packet Loss**: Mengirim terlalu banyak probe sekaligus pada jaringan lab VPN (HackTheBox/TryHackMe) dapat menyebabkan paket *dropped*, menghasilkan false negative (port terbuka dianggap filtered/closed).

---

### 1.2 Konsep "Staged Scanning" (Scan Bertahap)

Strategi terbaik adalah membagi pemindaian menjadi beberapa lapis kecepatan:
* **Tahap 1 (Fast Probe)**: Scan 1.000 port paling populer (TCP SYN). Selesai dalam 3–10 detik.
* **Tahap 2 (Immediate Enumeration)**: Sambil port populer dianalisis, jalankan web fuzzer atau manual probing pada port yang ditemukan.
* **Tahap 3 (Background Full Sweep)**: Jalankan pemindaian port 1–65535 dengan laju paket teratur (`--min-rate 2000`) di jendela Tmux terpisah.
* **Tahap 4 (Targeted Deep Scan)**: Tembakkan script NSE dan deteksi versi *hanya* pada port yang terbukti `open`.

---

### 1.3 Kenapa Nmap Bisa Lambat dan Cara Mengatasinya?

Nmap melambat karena beberapa faktor utama:
1. **Round Trip Time (RTT) & Timeout**: Jika target lambat merespon, Nmap menunggu sebelum mengirim ulang paket (*retransmit*).
2. **Firewall Rate-Limiting**: Firewall yang menjatuhkan (*drop*) paket memaksa Nmap menunggu sampai waktu timeout habis.
3. **DNS Reverse Resolution**: Secara default, Nmap mencoba menerjemahkan setiap IP menjadi domain name. **Solusi:** Gunakan flag `-n` untuk mematikan DNS resolution.
4. **ICMP Ping Probe**: Nmap mengirim ICMP echo sebelum scan. Jika firewall memblokir ping, Nmap mengira host mati. **Solusi:** Gunakan flag `-Pn` (*No Ping*).

---

### 1.4 Perbedaan TCP vs UDP Scanning

```text
[ TCP 3-Way Handshake ]                     [ UDP Stateless Probe ]
Client               Server                Client               Server
  │                    │                     │                    │
  ├─── SYN ───────────>│                     ├─── UDP Packet ────>│
  │<── SYN-ACK ────────┤ (Port Open)         │                    │ (Jika Open: Aplikasi
  ├─── ACK/RST ───────>│                     │   (Hening/No Resp) │  sering Hening/Diam)
  │                    │                     │                    │
  │                    │                     │<── ICMP Unreach ───┤ (Jika Closed: Kirim
  │                    │                     │   (Type 3 Code 3)  │  ICMP Port Unreach)
```

| Karakteristik          | TCP Scanning (`-sS` / `-sT`)                          | UDP Scanning (`-sU`)                                                     |
| :--------------------- | :---------------------------------------------------- | :----------------------------------------------------------------------- |
| **Sifat Protokol**     | *Connection-Oriented* (Ada status ACK/RST yang pasti) | *Stateless* (Tidak ada handshake konfirmasi)                             |
| **Kecepatan**          | Sangat Cepat (Ribuan port per detik)                  | Sangat Lambat (Tunduk pada OS rate-limiting)                             |
| **Respon Port Open**   | Menerima paket `SYN-ACK`                              | Biasanya **tidak ada respon** (*silent*) kecuali diberi payload spesifik |
| **Respon Port Closed** | Menerima paket `RST-ACK`                              | Menerima paket `ICMP Port Unreachable (Type 3, Code 3)`                  |
| **Kapan Dipakai**      | Selalu dilakukan pertama kali untuk semua target      | Dilakukan terarah pada port kritis (SNMP 161, TFTP 69, DNS 53)           |

> [!WARNING]
> Linux kernel membatasi pengiriman pesan ICMP Port Unreachable maksimal 1 pesan per detik (RFC 1812). Oleh karena itu, memindai 65.535 port UDP secara membabi buta bisa memakan waktu berjam-jam!

---

### 1.5 Apa itu "Noise" dan Kenapa Penting?

* **Di Lingkungan CTF (TryHackMe / HTB)**: Noise bukan masalah besar. Anda dapat menggunakan `--min-rate 2000` atau `-T4` karena tidak ada Security Operations Center (SOC) manusia yang akan memblokir Anda.
* **Di Real Penetration Testing**: Scanning agresif menghasilkan ribuan log peringatan di SIEM (Splunk, Elastic, Sentinel), memicu IPS/IDS (Suricata, Snort), dan mengakibatkan IP pentester diblokir oleh Web Application Firewall (WAF). Di dunia nyata, pentester menggunakan scan lambat (`-T2`), timing acak, dan teknik evasion (*fragmentation*, *source port spoofing*).

---

## 🔬 Bagian 2: Anatomy Perintah Nmap

Mari kita bedah setiap flag penting di Nmap dengan penjelasan cara kerja, analogi, kapan digunakan, dan contoh output terminal nyatanya.

```text
+=============================================================================+
|                           NMAP COMMAND ANATOMY                              |
+=============================================================================+
|                                                                             |
|   sudo nmap  -sS  -sC  -sV  -p 22,80  -Pn  -n  -oA nmap/target  10.10.10.10 |
|    │   │      │    │    │      │       │    │   │       │            │        |
|    │   │      │    │    │      │       │    │   │       │            └ Target |
|    │   │      │    │    │      │       │    │   │       └ Output Path/Prefix  |
|    │   │      │    │    │      │       │    │   └ Format Semua Output         |
|    │   │      │    │    │      │       │    └ Jangan Resolve DNS              |
|    │   │      │    │    │      │       └ Jangan Ping (Anggap Host Hidup)     |
|    │   │      │    │    │      └ Port Spesifik                              |
|    │   │      │    │    └ Deteksi Versi Daemon                               |
|    │   │      │    └ Jalankan Default Script NSE                            |
|    │   │      └ Tipe Scan: TCP SYN (Stealth)                                |
|    │   └ Tool Name                                                          |
|    └ Privilese Root (Diperlukan untuk Raw Packet Transmission)               |
+=============================================================================+
```

---

### 2.1 Scan Types (Tipe Pemindaian)

#### 1. Flag: `-sS` (TCP SYN Stealth Scan)
* **Nama**: TCP SYN Scan / Half-Open Scan.
* **Cara Kerja & Analogi**: Nmap mengirim paket `SYN` (mengetuk pintu). Jika target membalas `SYN-ACK` (pintu dibuka dan tuan rumah menyapa), Nmap langsung mengirim `RST` (memutus koneksi seketika tanpa menyelesaikan 3-way handshake). 
  * *Analogi:* Anda mengetuk pintu rumah seseorang; begitu pemilik rumah menjawab "Halo?", Anda langsung kabur tanpa bicara. Anda tahu ada orang di dalam tanpa tercatat sebagai tamu resmi.
* **Kapan Dipakai**: **Default dan terbaik** untuk scanning port TCP. Membutuhkan hak akses `sudo`.
* **Contoh Output Nyata**:
```text
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

#### 2. Flag: `-sT` (TCP Connect Scan)
* **Nama**: Full TCP Connection Scan.
* **Cara Kerja & Analogi**: Menggunakan sistem panggilan OS (*system call* `connect()`) untuk menyelesaikan 3-way handshake penuh (`SYN` -> `SYN-ACK` -> `ACK`), lalu memutuskan koneksi secara normal.
  * *Analogi:* Anda mengetuk pintu, masuk ke ruang tamu, bersalaman, lalu pamit pulang.
* **Kapan Dipakai**: Digunakan saat Anda **tidak memiliki akses root/sudo** di mesin penyerang, atau saat scanning melalui SOCKS Proxy (misal via `proxychains`).
* **Contoh Output Nyata**:
```text
PORT    STATE SERVICE
445/tcp open  microsoft-ds
```

#### 3. Flag: `-sU` (UDP Scan)
* **Nama**: UDP Port Scan.
* **Cara Kerja**: Mengirim paket UDP kosong atau paket ber-payload spesifik ke port tujuan. Jika tidak ada balasan, port dianggap `open|filtered`. Jika menerima ICMP Port Unreachable, port berstatus `closed`.
* **Kapan Dipakai**: Untuk mencari service UDP penting seperti SNMP (161), DNS (53), TFTP (69), DHCP (67/68), dan NTP (123).
* **Contoh Output Nyata**:
```text
PORT    STATE         SERVICE
53/udp  open          domain
161/udp open|filtered snmp
```

#### 4. Flag: `-sA` (TCP ACK Scan)
* **Nama**: ACK Firewall Probing Scan.
* **Cara Kerja**: Nmap mengirim paket dengan TCP flag `ACK`. Port tidak akan pernah terbuka dengan paket ACK; namun jika firewall tidak memblokir, target akan membalas dengan `RST`.
* **Kapan Dipakai**: Memetakan aturan firewall (*stateless vs stateful firewall*) dan menentukan port mana yang difilter.
* **Contoh Output Nyata**:
```text
PORT   STATE      SERVICE
80/tcp unfiltered http
22/tcp filtered   ssh
```

#### 5. Flag: `-sN`, `-sF`, `-sX` (Null, FIN, Xmas Scans)
* **Nama**: Advanced Stealth / RFC 793 Inverted Scans.
  * `-sN` (Null): Tidak ada flag TCP yang diset (semua 0).
  * `-sF` (FIN): Hanya flag FIN yang diset.
  * `-sX` (Xmas): Flag FIN, PSH, dan URG diset bersamaan (menyala seperti pohon natal).
* **Cara Kerja**: Menurut standar RFC 793, jika port tertutup menerima paket aneh ini, target harus membalas dengan `RST`. Jika port terbuka, paket akan diabaikan (*silent drop*).
* **Kapan Dipakai**: Menembus stateless firewall atau IDS lawas yang hanya memonitor paket SYN. Tidak berfungsi pada sistem operasi modern Windows.
* **Contoh Output Nyata**:
```text
PORT   STATE         SERVICE
80/tcp open|filtered http
```

---

### 2.2 Target Specification (Penentuan Target)

* **`-iL <file>`**: Mengambil daftar target dari file teks (*input list*).
  * *Contoh:* `nmap -iL targets.txt` (Sangat berguna saat menguji subnet dengan 50 server).
* **`--exclude <IP/Subnet>`**: Mengecualikan IP tertentu dari proses pemindaian.
  * *Contoh:* `nmap 192.168.1.0/24 --exclude 192.168.1.1` (Mencegah scanning pada gateway router).

---

### 2.3 Port Specification (Pemilihan Rentang Port)

* **`-p <port>`**: Menentukan port tertentu atau rentang port.
  * *Contoh:* `-p 22,80,443,8000-8500` atau `-p U:53,161,T:80,443` (Kombinasi TCP & UDP).
* **`-p-`**: Memindai **seluruh 65.535 port TCP** (dari port 1 hingga 65535).
  * *Analogi:* Memeriksa setiap jengkal dinding dan pintu di seluruh gedung tanpa ada yang terlewat.
* **`--top-ports <angka>`**: Memindai sejumlah *N* port paling umum berdasarkan database `nmap-services`.
  * *Contoh:* `--top-ports 100` (Sangat cepat untuk quick survey).
* **`-F`**: Fast Mode — Memindai 100 port paling umum (identik dengan `--top-ports 100`).

---

### 2.4 Service & OS Detection (Deteksi Layanan & Sistem Operasi)

#### 1. Flag: `-sV` (Service Version Detection)
* **Cara Kerja**: Setelah port terdeteksi terbuka, Nmap mengirim *probes* (permintaan data awal) dan membandingkan *banner* balasan dengan database ribuan signature di `nmap-service-probes`.
* **Contoh Output Nyata**:
```text
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
```

#### 2. Flag: `-sC` (Default Script Scan)
* **Cara Kerja**: Menjalankan skrip NSE (*Nmap Scripting Engine*) kategori `default`. Skrip ini aman, cepat, dan otomatis mengambil banner tambahan, sertifikat SSL, HTTP title, hingga anonymous login FTP/SMB.
* **Contoh Output Nyata**:
```text
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.3
|_ftp-anon: Anonymous FTP login allowed (FTP code 230)
| ftp-syst: 
|   STAT: 
| Server status: FTP server ready.
```

#### 3. Flag: `-O` (OS Detection)
* **Cara Kerja**: Mengirim serangkaian paket TCP dan UDP dengan opsi khusus, lalu menganalisis perbedaan implementasi TCP/IP stack (*TCP Window size, IP ID, TCP options*) untuk menebak Sistem Operasi target.
* **Contoh Output Nyata**:
```text
Device type: general purpose
Running: Linux 5.X
OS CPE: cpe:/o:linux:linux_kernel:5
OS details: Linux 5.0 - 5.4
```

#### 4. Flag: `-A` (Aggressive Scan Mode)
* **Cara Kerja**: Menggabungkan empat fungsi sekaligus dalam satu flag: `-sV` (Version), `-sC` (Default Scripts), `-O` (OS Detection), dan `--traceroute`.
* **Kapan Dipakai**: Sangat nyaman di CTF saat Anda ingin informasi maksimal dalam 1 kali perintah.

---

### 2.5 Timing & Performance Templates (`-T0` s/d `-T5`)

Nmap menyediakan 6 profil kecepatan bawaan untuk mengatur delay antar-paket dan batas waktu timeout:

```text
SLOW / STEALTHY <───────────────────────────────────────────> FAST / AGGRESSIVE
     -T0             -T1           -T2        -T3        -T4          -T5
 (Paranoid)       (Sneaky)      (Polite)   (Normal)  (Aggressive)   (Insane)
 Delay: 5 min   Delay: 15 sec  Delay: 0.4s  Default   Timeout: 1.25s Timeout: 0.3s
```

| Timing Flag | Nama Profil | Karakteristik & Delay | Kapan Dipakai |
| :--- | :--- | :--- | :--- |
| **`-T0`** | Paranoid | Delay 5 menit per paket. Sangat lambat. | Evasion level tinggi menghindari IDS/IPS militer. |
| **`-T1`** | Sneaky | Delay 15 detik per paket. | Evasion firewall yang sensitif terhadap threshold port scanning. |
| **`-T2`** | Polite | Memperlambat scan untuk menghemat bandwidth. | Mencegah server target yang rapuh mengalami crash (*DoS*). |
| **`-T3`** | Normal | Mode bawaan Nmap (Dynamic timing adaptif). | Jaringan standar tanpa batasan waktu mendesak. |
| **`-T4`** | Aggressive | Mengurangi timeout retransmisi menjadi 1.25 detik. | **Rekomendasi Utama CTF & Lab** dengan koneksi internet/VPN stabil. |
| **`-T5`** | Insane | Timeout sangat pendek (0.3 detik), pengiriman sangat cepat. | Hanya untuk jaringan Gigabit lokal (bisa false negative di VPN). |

---

### 2.6 Output Formats (Format Penyimpanan Hasil)

Menyimpan hasil scan adalah kewajiban mutlak (*reproducibility*). Nmap menyediakan 4 opsi format:

* **`-oN <file.nmap>`**: Output teks standar (*Human-Readable*), persis seperti yang tampil di layar terminal.
* **`-oX <file.xml>`**: Output format XML terstruktur, digunakan untuk diimpor ke tool lain seperti Metasploit, Faraday, atau Zenmap.
* **`-oG <file.gnmap>`**: Output format Grepable (satu baris per host), sangat mudah diproses menggunakan perintah Linux `grep`, `awk`, dan `cut`.
* **`-oA <nama_base>`**: **Opsi Terbaik!** Menyimpan hasil ke dalam **ketiga format sekaligus** (`.nmap`, `.xml`, dan `.gnmap`) secara otomatis.

```bash
# Contoh menyimpan ke 3 format sekaligus ke folder nmap/
nmap -sC -sV -oA nmap/target_full $TARGET
# Akan menghasilkan: nmap/target_full.nmap, nmap/target_full.xml, nmap/target_full.gnmap
```

---

### 2.7 Miscellaneous & Performance Tuning

* **`-Pn`**: Melewati fase Host Discovery (*Disable Ping*). Nmap menganggap target selalu aktif (*alive*). Wajib dipakai di lab CTF karena banyak mesin memblokir paket ICMP.
* **`-n`**: Menonaktifkan *Reverse DNS Resolution*. Menghemat waktu scan hingga 20-30%.
* **`--min-rate <angka>`**: Memaksa Nmap mengirim minimal *N* paket per detik.
  * *Contoh:* `--min-rate 2000` (Scan 65.535 port selesai dalam ~15-20 detik di jaringan lab).
* **`--max-retries <angka>`**: Membatasi berapa kali Nmap mencoba mengirim ulang paket jika tidak dijawab.
  * *Contoh:* `--max-retries 1` (Mempercepat scan pada port yang filtered).
* **`-v` / `-vv`**: *Verbosity Level*. Menampilkan port terbuka secara *real-time* di terminal saat scan sedang berlangsung tanpa harus menunggu scan selesai 100%.

---

### 2.8 NSE (Nmap Scripting Engine)

NSE adalah mesin otomasi canggih Nmap yang ditulis dalam bahasa pemrograman **Lua**. Terdapat lebih dari 600 skrip yang diklasifikasikan ke dalam beberapa kategori:

```text
+-----------------------------------------------------------------------------+
|                            NSE SCRIPT CATEGORIES                            |
+-----------------------------------------------------------------------------+
| default     : Skrip standar yang cepat dan aman (dijalankan via -sC)        |
| vuln        : Memeriksa keberadaan CVE dan celah keamanan spesifik          |
| auth        : Menguji autentikasi, anonymous login, dan default credentials |
| discovery   : Mengekstrak informasi publik (SNMP info, SMB shares, HTTP DNS)|
| safe        : Skrip yang tidak akan menjatuhkan layanan server              |
| intrusive   : Skrip agresif berisiko tinggi yang dapat memicu crash/alarm   |
| exploit     : Mencoba mengeksploitasi celah secara otomatis                 |
+-----------------------------------------------------------------------------+
```

**Sintaks Penggunaan:**
```bash
# 1. Menjalankan seluruh skrip dalam satu kategori
nmap --script vuln -p 80,445 $TARGET

# 2. Menjalankan skrip spesifik berdasarkan wildcard
nmap --script "smb-vuln*" -p 445 $TARGET

# 3. Menjalankan skrip dengan argumen kustom
nmap --script http-form-brute --script-args "http-form-brute.path=/login.php" -p 80 $TARGET
```

---

## ⚡ Bagian 3: Workflow Scanning Standar CTF

Ikuti urutan 6 langkah baku berikut setiap kali Anda memulai pengerjaan mesin target baru di HackTheBox, TryHackMe, atau Proving Grounds.

```text
+=============================================================================+
|                      CTF SCANNING STANDARD WORKFLOW                         |
+=============================================================================+
|                                                                             |
|   [ LANGKAH 1 ] Host Discovery ───> Pastikan IP Hidup (ping / -sn)          |
|         │                                                                   |
|         ▼                                                                   |
|   [ LANGKAH 2 ] Fast Top-1000 ────> Dapatkan Port Utama (5 Detik)           |
|         │                                                                   |
|         ├────────────────────────────────────────┐                          |
|         ▼                                        ▼                          |
|   [ LANGKAH 3: Background ]              [ LANGKAH 4: Foreground ]          |
|   Full 65535 Port Scan                   Targeted Deep Scan (-sC -sV)       |
|   (sudo nmap -p- --min-rate 2000)        (Pada port terbuka Langkah 2)      |
|         │                                        │                          |
|         └────────────────────┬───────────────────┘                          |
|                              ▼                                              |
|   [ LANGKAH 5 ] Targeted UDP Scan ─> Cek Port 53, 161, 69, 123              |
|                              │                                              |
|                              ▼                                              |
|   [ LANGKAH 6 ] Targeted NSE Scan ─> Cek Celah Khusus (--script vuln/auth)  |
|                                                                             |
+=============================================================================+
```

---

### LANGKAH 1: Host Discovery / Ping Check
* **Tujuan**: Memastikan rute jaringan VPN dan mesin target aktif sebelum memulai pemindaian mendalam.
* **Perintah Utama**:
```bash
# Kirim 2 paket ICMP Ping untuk cek konektivitas dan latency
ping -c 2 $TARGET
```

* **Perintah Alternatif (Jika ICMP diblokir Firewall)**:
```bash
# Lakukan host discovery TCP SYN ke port umum tanpa ICMP
sudo nmap -sn -PS22,80,443 -Pn $TARGET
```
* **Analisis Output**:
  * Jika `TTL ≈ 64` → Kemungkinan besar target adalah **Linux**.
  * Jika `TTL ≈ 128` → Kemungkinan besar target adalah **Windows**.
  * Jika `100% packet loss` → Target memblokir ping, **wajib selalu sertakan flag `-Pn` di langkah berikutnya**.

---

### LANGKAH 2: Fast Port Scan (Top 1000 Ports)
* **Tujuan**: Menemukan port-port populer dalam hitungan detik agar kita bisa langsung melakukan investigasi awal.
* **Perintah Utama**:
```bash
sudo nmap -sS -T4 -Pn -n -v $TARGET -oN nmap/fast.nmap
```
* **Penjelasan Flag**:
  * `sudo`: Menjalankan dengan hak root untuk mengaktifkan raw socket SYN scan.
  * `-sS`: TCP SYN Stealth Scan (cepat dan akurat).
  * `-T4`: Timing agresif untuk mempercepat scan.
  * `-Pn`: Melewati ping probe (mengasumsikan host hidup).
  * `-n`: Matikan reverse DNS lookup.
  * `-v`: Tampilkan port terbuka seketika di layar terminal saat ditemukan.
  * `-oN nmap/fast.nmap`: Simpan ke file teks.
* **Estimasi Waktu**: 3 – 8 detik.

---

### LANGKAH 3: Full Port Scan (All 65535 Ports)
* **Tujuan**: Menemukan port non-standar yang sering disembunyikan pembuat soal CTF (misal: SSH di port 2222, Web di port 8080/9001, custom socket di port 31337).
* **Perintah Utama**:
```bash
# Jalankan di Tmux Pane / Background Terminal
sudo nmap -sS -p- --min-rate 20 -00Pn -n -v $TARGET -oN nmap/allports.nmap
```
* **Tips Optimasi**:
  * Flag `--min-rate 2000` memastikan scan selesai dalam waktu kurang dari 30 detik pada koneksi VPN normal.
  * Jangan jalankan `-sC -sV` pada langkah ini! Cukup cari nomor port yang `open`.
* **Contoh Output Terminal Nyata**:
```text
Starting Nmap 7.94SVN ( https://nmap.org ) at 2026-09-02 00:15 WIB
Initiating SYN Stealth Scan at 00:15
Scanning 10.10.11.205 [65535 ports]
Discovered open port 22/tcp on 10.10.11.205
Discovered open port 80/tcp on 10.10.11.205
Discovered open port 8080/tcp on 10.10.11.205
Discovered open port 9001/tcp on 10.10.11.205
Completed SYN Stealth Scan at 00:15, 24.12s elapsed (65535 total ports)
Nmap scan report for 10.10.11.205
Host is up (0.045s latency).
Not shown: 65531 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
8080/tcp open  http-proxy
9001/tcp open  tor-orport

Nmap done: 1 IP address (1 host up) scanned in 24.28 seconds
```

---
### LANGKAH 4: Targeted Deep Service Scan
* **Tujuan**: Melakukan fingerprinting mendalam (nama daemon, versi aplikasi, OS details, dan script default) **hanya pada port-port yang ditemukan terbuka** dari Langkah 2 & 3.
* **Perintah Utama**:
```bash
# Contoh jika port terbuka adalah 22, 80, 8080, dan 9001:
sudo nmap -sC -sV -O -p 22,80,8080,9001 -Pn -n $TARGET -oA nmap/services
```
* **Kapan Menggunakan Flag `-A`?**
  * Anda bisa mengganti `-sC -sV -O` dengan flag `-A` jika menginginkan ringkasan terlengkap beserta traceroute.
* **Output**: Menghasilkan file `nmap/services.nmap`, `nmap/services.xml`, dan `nmap/services.gnmap` yang siap dianalisis.

---
### LANGKAH 5: Targeted UDP Scan
* **Tujuan**: Memindai port UDP krusial yang sering menjadi titik masuk celah pada mesin CTF namun sering diabaikan pemula.
* **Perintah Utama**:
```bash
# Pindai 20 port UDP paling kritis dengan timing terukur
sudo nmap -sU -Pn -n --top-ports 20 -T4 -v $TARGET -oN nmap/udp.nmap

# ATAU pindai port UDP spesifik berisiko tinggi:
sudo nmap -sU -sV -p 53,69,123,161,500,1434 -Pn -n $TARGET -oN nmap/udp_critical.nmap
```
* **Port UDP Krusial di CTF**:
  * **Port 53 (DNS)**: Zone Transfer, DNS tunneling.
  * **Port 69 (TFTP)**: Unauthenticated file download/upload.
  * **Port 161 (SNMP)**: Information disclosure via community string (`public`/`private`).
  * **Port 500 (IKE VPN)**: IPsec VPN enumeration via `ike-scan`.
* **Contoh Output Terminal Nyata**:
```text
Starting Nmap 7.94SVN ( https://nmap.org ) at 2026-09-02 00:18 WIB
Nmap scan report for 10.10.11.205
Host is up (0.046s latency).

PORT    STATE SERVICE VERSION
53/udp  open  domain  ISC BIND 9.16.1 (Ubuntu Linux)
161/udp open  snmp    SNMPv1 server; net-snmp (public)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel, cpe:/a:net-snmp:net-snmp

Nmap done: 1 IP address (1 host up) scanned in 12.35 seconds
```

---

### LANGKAH 6: Targeted NSE Script Scan
* **Tujuan**: Menjalankan pengujian celah keamanan spesifik terhadap layanan yang ditemukan.
* **Perintah Contoh**:
```bash
# 1. Cek kerentanan umum pada Web Server (Port 80/443)
sudo nmap --script "http-vuln*,http-enum,http-methods" -p 80 $TARGET -oN nmap/nse_web.nmap

# 2. Cek kerentanan kritis pada SMB (EternalBlue, MS17-010, SMBGhost)
sudo nmap --script "smb-vuln*,smb-enum-shares,smb-enum-users" -p 445 $TARGET -oN nmap/nse_smb.nmap

# 3. Cek Anonymous Login pada FTP
sudo nmap --script ftp-anon,ftp-syst -p 21 $TARGET -oN nmap/nse_ftp.nmap
```

* **Contoh Output Terminal Nyata (SMB Vuln Scan)**:
```text
PORT    STATE SERVICE
445/tcp open  microsoft-ds

Host script results:
| smb-vuln-ms17-010: 
|   VULNERABLE:
|   Remote Code Execution vulnerability in Microsoft SMBv1 servers (ms17-010)
|     State: VULNERABLE
|     IDs:  CVE:CVE-2017-0143
|     Risk factor: HIGH
|       A critical remote code execution vulnerability exists in Microsoft SMBv1
|       servers (aka EternalBlue).
|           
|     Disclosure date: 2017-03-14
|     References:
|       https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2017-0143
|_      https://blogs.technet.microsoft.com/msrc/2017/05/12/customer-guidance-for-wannacrypt-attacks/
```

---
### 3.7 Cara Simpan & Mengorganisasi Output Nmap

Pemula sering kali hanya melihat output di layar terminal lalu menutup terminalnya, sehingga harus mengulang scan dari awal saat mencari detail port 1 jam kemudian. Selalu terapkan manajemen output terstruktur:

```text
~/ctf/htb/10.10.11.205_TargetName/
└── nmap/
    ├── fast.nmap        <-- Hasil scan cepat top-1000 (Human-readable text)
    ├── allports.nmap    <-- Hasil scan 65535 port TCP
    ├── services.nmap    <-- Detail banner & script default (Text format)
    ├── services.gnmap   <-- Format Grepable (Untuk parsing bash one-liner)
    ├── services.xml     <-- Format XML (Untuk import ke Searchsploit / Metasploit)
    └── udp.nmap         <-- Hasil scan UDP kritis
```

#### 1. Kapan Menggunakan File `.gnmap` (Grepable Output)?
Format `.gnmap` menyusun seluruh informasi per host dalam 1 baris panjang. Sangat cocok diproses dengan `grep`, `awk`, dan `cut`:
```bash
# Ekstrak seluruh port TCP yang 'open' dari file .gnmap
grep -i "ports:" nmap/services.gnmap | grep -oP '\d+/open/tcp//[^/]+'
# Output:
# 22/open/tcp//ssh
# 80/open/tcp//http
# 445/open/tcp//microsoft-ds
```

#### 2. Kapan Menggunakan File `.xml`?
Format `.xml` adalah standar mesin untuk dibaca oleh alat eksternal:
```bash
# 1. Feed ke Searchsploit untuk mencocokkan CVE secara instan
searchsploit --nmap nmap/services.xml

# 2. Import ke database Metasploit di terminal msfconsole
msf6 > db_import nmap/services.xml
```

#### 3. Kapan Menggunakan File `.nmap`?
Format `.nmap` adalah catatan teks manusia (*human-readable*). Buka file ini menggunakan `mousepad nmap/services.nmap` atau `less -R` untuk membaca konfigurasi banner, SSL cert, dan catatan script tanpa perlu menjalankan Nmap ulang.

---

### 3.8 ⚡ BONUS: One-Liner Workflow Komplet (All-in-One Automation)

Bagi Anda yang ingin menjalankan seluruh alur pemindaian secara otomatis dan teratur dalam 1 kali eksekusi:

```bash
# =============================================================================
# BONUS: ONE-LINER WORKFLOW KOMPLET UNTUK CTF
# =============================================================================

# Step 1: Set target IP (sesuaikan IP)
settarget 10.10.11.205

# Step 2: Buat folder penyimpanan nmap
mkdir -p nmap

# Step 3: Fast scan top 1000 port (selesai dalam ~5 detik)
echo -e "\033[1;34m[*] Menjalankan Fast Scan Top-1000...\033[0m"
sudo nmap -sS -T4 -Pn -n -v $TARGET -oN nmap/fast.nmap

# Step 4: Ekstrak port terbuka secara otomatis dan jalankan Deep Scan
PORTS=$(grep "^[0-9]" nmap/fast.nmap | grep "open" | cut -d'/' -f1 | tr '\n' ',' | sed 's/,$//')
echo -e "\033[1;32m[+] Port terbuka awal ditemukan: $PORTS\033[0m"

echo -e "\033[1;34m[*] Menjalankan Targeted Deep Service Scan pada port: $PORTS...\033[0m"
sudo nmap -sC -sV -p$PORTS -Pn -n $TARGET -oA nmap/services

# Step 5: Jalankan Full Scan 65535 Port di background agar tidak memblokir terminal
echo -e "\033[1;33m[*] Menjalankan Full 65535 Port Scan di Background...\033[0m"
sudo nmap -sS -p- --min-rate 2000 -Pn -n $TARGET -oN nmap/allports.nmap &

echo -e "\033[1;32m[✓] Scan awal selesai! Hasil disimpan di folder ./nmap/\033[0m"
echo -e "\033[1;32m[✓] Mulai analisa port $PORTS sekarang selagi full scan berjalan di background.\033[0m"
```

---

## 📊 Bagian 4: Analisis Output Nmap

Membaca output Nmap bukan hanya melihat apa yang terbuka, melainkan memahami implikasi keamanan dari status dan nomor versinya.

### 4.1 Pemahaman Status Port (Port States)

```text
+-------------------+------------------------------------+------------------------------------+
| Status Port       | Makna Teknis                       | Langkah Tindakan Pentester         |
+-------------------+------------------------------------+------------------------------------+
| **open**          | Aplikasi aktif menerima koneksi    | LANGSUNG jadikan prioritas utama!  |
|                   | (Respon: SYN-ACK / Data balasan)   | Lakukan banner grabbing & exploit. |
|                   |                                    |                                    |
| **closed**        | Tidak ada aplikasi listening       | Abaikan sementara. Target merespon |
|                   | (Respon: RST-ACK diterima)         | RST, berarti host aktif & hidup.   |
|                   |                                    |                                    |
| **filtered**      | Paket diblokir Firewall / Filter   | Coba teknik evasion, cek port lain,|
|                   | (Respon: Dropped / ICMP Type 3)    | atau gunakan port fragmenting.     |
|                   |                                    |                                    |
| **open|filtered** | Nmap tidak dapat memastikan apakah | Kirim payload spesifik aplikasi    |
|                   | port open atau filtered (Khas UDP) | (misal: snmp-check, tftp client).  |
+-------------------+------------------------------------+------------------------------------+
```

---

### 4.2 Service Fingerprint Patterns (Tabel Pengenalan Pola Serangan)

Tabel berikut adalah kamus cepat bagi pentester saat membaca kolom `SERVICE` dan `VERSION` pada output Nmap:

| No     | Service & Banner Nmap                      | Kemungkinan Vektor Serangan / Langkah Selanjutnya                                                                             |
| :----- | :----------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **1**  | `vsftpd 2.3.4`                             | **Critical Backdoor (Smile Exploit)**. Langsung gunakan `exploit/unix/ftp/vsftpd_234_backdoor` di Metasploit.                 |
| **2**  | `vsftpd 3.0.x`                             | Cek Anonymous Login (`anonymous:anonymous`), cari file backup atau konfigurasi yang tertinggal.                               |
| **3**  | `ProFTPD 1.3.5`                            | **Mod_copy Vulnerability (CVE-2015-3306)**. Eksploitasi untuk copy file web shell via perintah `SITE CPFR/CPTO`.              |
| **4**  | `OpenSSH (Versi < 7.7)`                    | Cek **User Enumeration (CVE-2018-15473)**. Cari kredensial dari service web/SMB dahulu.                                       |
| **5**  | `Apache httpd 2.4.49 / 2.4.50`             | **Path Traversal & RCE (CVE-2021-41773 / CVE-2021-42013)**. Coba payload `/cgi-bin/.%%32%65/`.                                |
| **6**  | `Apache Tomcat / Coyote 8.x/9.x`           | Akses `/manager/html` dengan kredensial default (`tomcat:s3cret`, `admin:admin`) atau cek Ghostcat (AJP port 8009).           |
| **7**  | `Microsoft IIS httpd 7.5 / 8.5 / 10`       | Cek web extension `.aspx`, `.asp`, upload web shell, atau IIS Short File/Directory Name Disclosure.                           |
| **8**  | `Samba smbd 3.X - 4.X (Port 445)`          | Cek Null Session (`smbclient -N -L`), enum shares, cek EternalBlue (`MS17-010`) atau SambaCry.                                |
| **9**  | `Microsoft-DS Windows (Port 445)`          | Cek Anonymous SMB, cek user enum via `enum4linux-ng` / `nxc smb`, periksa CVE SMBGhost (CVE-2020-0796).                       |
| **10** | `MySQL 5.x / MariaDB (Port 3306)`          | Coba login remote user `root` tanpa password (`mysql -h $TARGET -u root`), cari password database di file web.                |
| **11** | `Microsoft SQL Server 2017/2019 (1433)`    | Gunakan `nxc mssql` untuk test default login `sa:sa`, lalu eksekusi command via `xp_cmdshell`.                                |
| **12** | `Redis key-value store (Port 6379)`        | Cek unauthenticated access via `redis-cli -h $TARGET`. Tulis SSH public key ke `/root/.ssh/authorized_keys` atau web shell.   |
| **13** | `MongoDB 3.x/4.x (Port 27017)`             | Cek NoSQL unauthenticated login via `mongosh mongodb://$TARGET:27017/`, dump database collections.                            |
| **14** | `NFS rpcbind / mountd (Port 111, 2049)`    | Jalankan `showmount -e $TARGET`. Mount share ke mesin penyerang (`mount -t nfs ...`), cek file `id_rsa` atau root permission. |
| **15** | `SNMP v1/v2c (UDP Port 161)`               | Bruteforce SNMP community string (`onesixtyone`), lalu dump seluruh informasi sistem menggunakan `snmpwalk`.                  |
| **16** | `Microsoft Terminal Services (3389)`       | Cek BlueKeep (CVE-2019-0708) pada Windows 7/2008, atau bruteforce password jika username sudah ditemukan.                     |
| **17** | `WinRM [HTTP/HTTPS] (5985/5986)`           | Gunakan `evil-winrm -i $TARGET -u username -p password` untuk mendapatkan remote PowerShell terminal langsung.                |
| **18** | `Werkzeug / Flask Python (Port 5000/8000)` | Cek Server-Side Template Injection (SSTI `{{7*7}}`) atau akses console debugger PIN exploit di `/console`.                    |

---

### 4.3 Cara Membaca & Mem-parse Output Script NSE (`-sC`)

Banyak pemula bingung saat melihat blok teks bersarang (*indented output*) setelah menjalankan flag `-sC`. Berikut adalah cara membedah dan mengambil kesimpulan keamanan dari hasil script NSE paling umum:

#### 1. SMB Security Mode & Message Signing
```text
Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
```
* **Arti Teknis**: Server mendukung penandatanganan paket SMB (*signing*), namun **TIDAK DIWAJIBKAN** (*not required*).
* **Vektor Eksploitasi**: Ini adalah lampu hijau untuk **SMB Relay Attack**. Anda bisa menangkap NTLM hash menggunakan `Responder` dan meneruskannya (*relay*) langsung via `ntlmrelayx.py` ke server ini untuk mengeksekusi shell atau men-dump SAM database tanpa perlu meng-crack hash!

#### 2. SSL Certificate (Subdomain & Virtual Host Leak)
```text
| ssl-cert: Subject: commonName=app.target.htb/organizationName=Target Corp
| Subject Alternative Name: DNS:app.target.htb, DNS:dev.target.htb, DNS:internal-api.target.htb
|_SSL-Date: 2026-09-02T00:15:30+00:00; 0s from local time.
```
* **Arti Teknis**: Sertifikat HTTPS memvalidasi beberapa nama domain sekaligus (*Subject Alternative Name*).
* **Vektor Eksploitasi**: Anda menemukan 3 Virtual Host tersembunyi (`app.target.htb`, `dev.target.htb`, `internal-api.target.htb`).
* **Langkah Pentester**: Segera tambahkan ketiga domain tersebut ke file `/etc/hosts` Anda:
  ```bash
  sudo bash -c "echo '$TARGET app.target.htb dev.target.htb internal-api.target.htb' >> /etc/hosts"
  ```

#### 3. Web Title, Generator, & Disallowed Robots.txt
```text
| http-title: Dashboard - WordPress 6.2
| http-generator: WordPress 6.2
| http-robots.txt: 3 disallowed entries 
|_/wp-admin/ /secret_backup/ /dev_portal/
```
* **Arti Teknis**: Target menjalankan CMS WordPress versi 6.2. File `robots.txt` melarang web crawler mengindeks folder tertentu.
* **Langkah Pentester**: Langsung akses URL `http://$TARGET/secret_backup/` dan `http://$TARGET/dev_portal/` di browser. Folder yang disembunyikan developer sering kali berisi source code mentah atau file konfigurasi `.env`.

#### 4. FTP Anonymous Access & Directory Content
```text
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
| -rw-r--r--   1 root  root     2048 Sep 01 22:00 backup_database.sql
| -rw-r--r--   1 user  user     1024 Sep 01 22:05 id_rsa
```
* **Arti Teknis**: Server FTP mengizinkan login tanpa akun (`anonymous:anonymous` dengan FTP return code 230).
* **Langkah Pentester**: Masuk dengan `ftp $TARGET`, login sebagai `anonymous`, dan unduh file private key SSH `id_rsa` serta dump database `backup_database.sql`.

#### 5. SSH Hostkey Fingerprint
```text
| ssh-hostkey: 
|   3072 20:41:5b:9e:33:0c:4a:6f:d7:4a:49:a3:23:41:40:9a (RSA)
|_  256 12:8e:66:bc:cd:88:21:4a:90:54:33:11:80:bc:df:99 (ED25519)
```
* **Arti Teknis**: Kunci publik unik dari daemon SSH target.
* **Kegunaan**: Jika Anda sedang menghadapi target lab yang memiliki banyak IP atau container, bandingkan fingerprint ini untuk memastikan apakah dua port SSH berbeda sebenarnya berada pada mesin yang sama.

---

## 🌳 Bagian 5: Decision Tree & Multi-Port Scenarios

Gunakan panduan alur keputusan ini untuk menentukan arah tindakan setelah pemindaian Nmap selesai.

### 5.1 Diagram Alur Keputusan Vertikal (Per Layanan)

```text
[ PORT 21: FTP ]
   │──> Cek Anonymous Login (user: anonymous / pass: anonymous)
   │──> Cek Versi Software: vsftpd 2.3.4 (Backdoor), ProFTPD 1.3.5 (mod_copy)
   └──> Jika ada hak upload -> Upload file PHP/ASPX web shell

[ PORT 22: SSH ]
   │──> BUKAN target eksploitasi langsung (Bruteforce hanya opsi terakhir)
   │──> Cari kredensial (user:password) atau private key (id_rsa) dari Web/FTP/SMB
   └──> Jika dapat id_rsa -> chmod 600 id_rsa && ssh -i id_rsa user@$TARGET

[ PORT 80 / 443 / 8080: WEB ]
   │──> Buka di Browser: Periksa halaman utama & Source Code (Ctrl+U)
   │──> Fuzzing Direktori & File: ffuf -u http://$TARGET/FUZZ -w wordlist.txt
   │──> Fuzzing Virtual Hosts (VHost): Ffuf mencari subdomain tersembunyi
   │──> Periksa Teknologi: CMS (WordPress/Joomla/Drupal), Framework (Laravel/Django)
   └──> Cari Form Input: SQL Injection, File Upload, LFI/RFI, Command Injection

[ PORT 139 / 445: SMB ]
   │──> Cek Null Session: smbclient -N -L //$TARGET/
   │──> Enumerasi Shares & Users: enum4linux-ng -A $TARGET / nxc smb $TARGET -u '' -p ''
   └──> Cek Exploit Kritis: MS17-010 (EternalBlue), CVE-2020-0796 (SMBGhost)

[ PORT 111 / 2049: NFS ]
   │──> Cek Share yang di-export: showmount -e $TARGET
   │──> Mount Share Lokal: sudo mount -t nfs $TARGET:/share /mnt/nfs
   └──> Cek Permission: Cari file SSH keys, atau eksploitasi no_root_squash

[ PORT 161: SNMP (UDP) ]
   │──> Bruteforce Community String: onesixtyone -c /usr/share/seclists/... $TARGET
   └──> Dump Konfigurasi: snmpwalk -v2c -c public $TARGET hrSWRunName

[ PORT 1433 / 3306 / 5432: DATABASE (MSSQL / MySQL / PostgreSQL) ]
   │──> Coba login default creds: root:root, sa:sa, postgres:postgres
   │──> MSSQL: Eksekusi command via nxc mssql $TARGET -u sa -p sa -M xp_cmdshell
   └──> MySQL: SELECT INTO OUTFILE untuk menulis web shell jika root

[ PORT 5985 / 5986: WinRM ]
   └──> Akses remote shell langsung: evil-winrm -i $TARGET -u <user> -p <pass>
```

---

### 5.2 Analisis Kombinasi Port Kompleks (Multi-Port Scenarios)

Di lab CTF dan penetrasi riil, Anda jarang menemukan hanya 1 port terbuka. Berikut adalah strategi membedah kombinasi port yang sering muncul:

```text
+=============================================================================+
|                      COMPLEX MULTI-PORT SCENARIOS                           |
+=============================================================================+
```

#### Skenario 1: Web Multi-Port (Port 80 + 443 + 8080 / 8443)
* **Karakteristik Target**: Port 80/443 menjalankan web utama (Apache/Nginx), sedangkan port 8080/8443 menjalankan backend portal (Tomcat/Jenkins/NodeJS).
* **Strategi Pentester**:
  1. Halaman di port 80 sering kali hanya website profil statis (*distraction/rabbit hole*).
  2. **Prioritaskan port 8080**: Periksa apakah ada software automasi seperti Jenkins, Apache Tomcat Manager, atau Grafana.
  3. Coba kredensial default vendor (`admin:admin`, `tomcat:s3cret`, `admin:password`).

#### Skenario 2: Linux Web + Modern API Stack (Port 22 + 80 + 3000 / 5000)
* **Karakteristik Target**: Port 80 adalah PHP frontend, Port 3000 adalah Node.js API, Port 5000 adalah Flask API.
* **Strategi Pentester**:
  1. Periksa interaksi antara port 80 dan port 3000 via Network Tab di Inspect Element (F12).
  2. Fuzzing API endpoints di port 3000 (`/api/v1/users`, `/graphql`, `/debug`).
  3. Cari kelemahan NoSQL Injection, JWT Hardcoded Secret, atau Server-Side Template Injection (SSTI) di port 5000.
  4. Manfaatkan kebocoran password untuk login ke SSH (Port 22).

#### Skenario 3: Windows Active Directory Domain Controller (Port 53 + 88 + 135 + 139 + 389 + 445 + 5985)
* **Karakteristik Target**: Mesin Domain Controller (DC) Windows Server lengkap.
* **Strategi Pentester**:
  1. **Kerberos (Port 88)**: Lakukan user enumeration tanpa password menggunakan `kerbrute userenum -d domain.local userlist.txt`.
  2. **AS-REP Roasting**: Cek user yang memiliki atribut *Do not require Kerberos preauthentication* via `GetNPUsers.py`.
  3. **LDAP (Port 389)**: Lakukan anonymous LDAP bind untuk mengekstrak seluruh daftar user domain.
  4. **WinRM (Port 5985)**: Setelah mendapatkan 1 pasang kredensial yang valid, langsung masuki server via `evil-winrm`.

#### Skenario 4: Port Tidak Lazim / Ganjil Tunggal (Hanya Port 9001 atau 31337)
* **Karakteristik Target**: Custom socket server / binary service buatan pembuat CTF.
* **Strategi Pentester**:
  1. **Manual Banner Grabbing**: Sambungkan terminal menggunakan Netcat:
     ```bash
     nc -vn $TARGET 9001
     ```
  2. **Kirim HTTP Request**: Uji apakah port ini merespon protokol HTTP:
     ```bash
     curl -i http://$TARGET:9001/
     ```
  3. **Kirim Input Ekstrem**: Masukkan string panjang (1000 karakter 'A') untuk menguji potensi Buffer Overflow / Crash.

#### Skenario 5: Classic Linux CTF Triad (Port 21 + 22 + 80)
* **Strategi Pentester**:
  1. **Tahap 1**: Cek anonymous login di FTP (21). Jika ada file backup, unduh dan baca.
  2. **Tahap 2**: Jika FTP tidak ada apa-apa, fokus 100% pada Web (80). Cari celah LFI untuk membaca `/etc/passwd` atau upload web shell.
  3. **Tahap 3**: Dapatkan akses shell awal (user `www-data`), lalu temukan kredensial user lokal untuk login SSH (22).

---

## 🤝 Bagian 6: Nmap + Tools Lain (Kombinasi Ekosistem)

Menggabungkan Nmap dengan tool lain akan melipatgandakan kecepatan dan efisiensi workflow Anda.

### 6.1 RustScan ➔ Pipe ke Nmap (Super Cepat)
RustScan memindai 65.535 port dalam beberapa detik, lalu otomatis meneruskan port terbuka ke Nmap untuk scan versi dan script NSE:

```bash
# Menjalankan RustScan dengan auto-pipe ke nmap deep scan
rustscan -a $TARGET -b 5000 --tries 1 -- -sC -sV -Pn -n -oA nmap/rustscan_result
# KENAPA: 
# -b 5000: Menyetel batch size paket (menggantikan flag --ulimit yang deprecated).
# --tries 1: Jumlah percobaan per port agar scan selesai instan.
# --: Segala argumen setelah tanda ini diteruskan langsung ke Nmap.
```

---

### 6.2 Masscan ➔ Feed ke Nmap (Untuk Subnet Besar)
Gunakan Masscan untuk sweeping jaringan skala besar, lalu feed hasilnya ke Nmap:

```bash
# 1. Masscan mencari semua port terbuka pada subnet /24
sudo masscan 10.10.10.0/24 -p1-65535 --rate=5000 -e tun0 -oL masscan.txt

# 2. Ekstrak IP dan Port, lalu feed ke Nmap untuk analisis mendalam
sudo nmap -sC -sV -p 80,445 -iL live_hosts.txt -oA nmap/masscan_nmap
```

---

### 6.3 Nmap XML ➔ Searchsploit (Cari Exploit Otomatis)
Anda dapat langsung mencari exploit dari seluruh service yang ditemukan oleh Nmap tanpa perlu mengetik satu per satu di Google:

```bash
# Otomatis mencocokkan setiap banner service di nmap XML dengan database Exploit-DB
searchsploit --nmap nmap/services.xml
# KENAPA: Menghemat waktu riset manual terhadap belasan nomor versi software.
```

---

### 6.4 Nmap ➔ Metasploit Database Integration (`db_nmap`)
Jalankan Nmap langsung dari dalam konsol Metasploit agar semua host dan service otomatis tersimpan di database internal:

```bash
# Di dalam msfconsole:
msf6 > db_nmap -sC -sV -p- -Pn 10.10.10.10

# Lihat seluruh host yang tersimpan di database:
msf6 > hosts

# Lihat seluruh service dan port terbuka:
msf6 > services -p 80,445
```

---

### 6.5 Grep / AWK One-Liner untuk Ekstraksi Port Terbuka
Ekstrak daftar port terbuka dari file `.nmap` atau `.gnmap` menjadi format ringkas satu baris (`22,80,445`):

```bash
# Ekstrak port terbuka dari file fast.nmap ke format CSV port list
PORTS=$(grep "^[0-9]" nmap/fast.nmap | grep "open" | cut -d '/' -f 1 | tr '\n' ',' | sed 's/,$//')
echo "Port Terbuka: $PORTS"

# Langsung jalankan targeted deep scan menggunakan variable $PORTS
sudo nmap -sC -sV -p$PORTS -Pn $TARGET -oA nmap/targeted_deep
```

---

## 🛠️ Bagian 7: Common Errors & Troubleshooting

Berikut adalah 10 masalah umum yang sering dihadapi saat menggunakan Nmap beserta penyebab dan solusinya:

```text
+=============================================================================+
|                      NMAP TROUBLESHOOTING GUIDE                             |
+=============================================================================+
```

#### 1. ERROR: `Failed to resolve target`
* **Penyebab**: Format penulisan IP/domain salah, atau DNS lokal mesin penyerang tidak dapat menyelesaikan nama host.
* **Solusi**: Periksa apakah IP sudah disetel di environment (`echo $TARGET`). Jika menggunakan nama domain (misal: `target.htb`), tambahkan baris domain ke `/etc/hosts`:
```bash
sudo bash -c "echo '$TARGET target.htb' >> /etc/hosts"
```

#### 2. ERROR: `Host seems down. If it is really up, but blocking our ping probes, try -Pn`
* **Penyebab**: Mesin target menyalakan firewall (seperti Windows Defender Firewall) yang membuang (*drop*) paket ICMP echo request.
* **Solusi**: Tambahkan flag **`-Pn`** untuk memaksa Nmap memindai tanpa melakukan tes ping awal:
```bash
sudo nmap -Pn $TARGET
```

#### 3. ERROR: `You requested a scan type which requires root privileges`
* **Penyebab**: Pemindaian tipe Raw Socket seperti TCP SYN Scan (`-sS`), UDP Scan (`-sU`), atau OS Detection (`-O`) membutuhkan privilese kernel Linux.
* **Solusi**: Gunakan perintah **`sudo`** di depan perintah Nmap:
```bash
sudo nmap -sS $TARGET
```

#### 4. ERROR: `All 1000 scanned ports on target are in ignored states (filtered)`
* **Penyebab**: Firewall target memblokir IP Anda, koneksi VPN putus, atau target berada di subnet lain yang belum di-routing.
* **Solusi**: Cek koneksi VPN (`ping 10.10.10.2`), restart OpenVPN interface, atau gunakan opsi evasion fragmentasi:
```bash
sudo nmap -sS -Pn -f --mtu 24 $TARGET
```

#### 5. ERROR: `Scan taking too long / est. finish in 4 hours`
* **Penyebab**: Nmap memindai terlalu banyak port filtered dengan timing bawaan yang lambat (`-T3`) dan retransmit timeout tinggi.
* **Solusi**: Gunakan batasan minimum packet rate dan timing agresif:
```bash
sudo nmap -p- --min-rate 2000 --max-retries 1 -T4 -Pn -n $TARGET
```

#### 6. ERROR: `WARNING: No targets were specified, so 0 hosts scanned`
* **Penyebab**: Variabel `$TARGET` kosong atau argumen IP terlupa ditulis.
* **Solusi**: Setel variabel target terlebih dahulu menggunakan fungsi `settarget` yang telah kita buat di Modul 02:
```bash
settarget 10.10.11.205
```

#### 7. ERROR: `NSE: Script Error on [script-name]: failed to connect`
* **Penyebab**: Skrip mencoba menghubungi service yang membutuhkan autentikasi khusus atau koneksi terputus saat skrip berjalan.
* **Solusi**: Jalankan skrip secara spesifik dengan flag verbosity debug (`-d` atau `-vv`) dan sertakan argumen skrip jika diperlukan:
```bash
sudo nmap --script [script-name] --script-args "timeout=10" -d -p [port] $TARGET
```

#### 8. ERROR: `quitting: [tun0] is not up`
* **Penyebab**: Interface VPN HackTheBox/TryHackMe terputus di tengah sesi scanning.
* **Solusi**: Cek status koneksi VPN di terminal terpisah dan sambungkan ulang file konfigurasi `.ovpn`:
```bash
sudo openvpn ~/lab.ovpn
```

#### 9. ERROR: `UDP scan results showing all ports open|filtered`
* **Penyebab**: Target membuang paket UDP tanpa mengirim balasan ICMP Port Unreachable.
* **Solusi**: Jangan memindai semua port UDP. Gunakan Nmap script version scan (`-sU -sV`) hanya pada port UDP yang spesifik agar Nmap mengirim payload aplikasi nyata:
```bash
sudo nmap -sU -sV -p 53,161,69 -Pn $TARGET
```

#### 10. ERROR: `TCP / IP stack packet drops (--min-rate too high)`
* **Penyebab**: Nilai `--min-rate` disetel terlalu tinggi (misal: `--min-rate 10000`) pada koneksi VPN yang memiliki latency tinggi, menyebabkan buffer overflow dan port open terlewat.
* **Solusi**: Turunkan nilai rate ke angka aman dan optimal untuk koneksi VPN:
```bash
# Nilai ideal untuk koneksi VPN lab adalah 1500 - 2500
sudo nmap -p- --min-rate 1500 -Pn $TARGET
```

---

## 📋 Bagian 8: Nmap Cheatsheet Akhir (Copy-Paste Ready)

Simpan cheatsheet ini untuk penggunaan sehari-hari. Seluruh perintah di bawah telah dioptimalkan untuk variabel `$TARGET`:

```bash
# =============================================================================
# NMAP ULTIMATE CHEATSHEET UNTUK CTF & PENTEST
# =============================================================================

# 1. Quick Recon (Top 1000 Ports - Selesai dalam 5 Detik)
sudo nmap -sS -T4 -Pn -n -v $TARGET -oN nmap/fast.nmap

# 2. Full Port Sweep (Semua 65535 Port TCP di Background)
sudo nmap -sS -p- --min-rate 2000 -Pn -n -v $TARGET -oN nmap/allports.nmap

# 3. Targeted Deep Service Scan (Ganti nomor port sesuai temuan)
sudo nmap -sC -sV -O -p 22,80,445 -Pn -n $TARGET -oA nmap/services

# 4. Critical UDP Scan (Port UDP Penting Saja)
sudo nmap -sU -p 53,69,123,161,500 -Pn -n -v $TARGET -oN nmap/udp.nmap

# 5. Vulnerability Assessment Scan (Seluruh Kategori Vuln)
sudo nmap --script vuln -p 80,445 $TARGET -oN nmap/vulnerabilities.nmap

# 6. SMB Security & Share Audit
sudo nmap --script "smb-vuln*,smb-enum-shares,smb-enum-users" -p 139,445 $TARGET -oN nmap/smb_audit.nmap

# 7. Web Technologies & Endpoint Enumeration
sudo nmap --script "http-enum,http-title,http-methods,http-robots.txt" -p 80,443,8080 $TARGET -oN nmap/web_enum.nmap

# 8. Firewall & WAF Evasion Scan (MTU Fragmentation)
sudo nmap -sS -Pn -f --mtu 24 --source-port 53 $TARGET -oN nmap/evasion.nmap
```

---

## 🚀 9. Lanjut ke File Berikutnya

Sekarang Anda telah menguasai seluruh alur pemindaian jaringan: mulai dari pemilihan flag presisi, eksekusi bertahap (*staged scanning*), hingga membaca pola sinyal pada output Nmap.

Setelah port terbuka dan service terdeteksi, langkah kritis selanjutnya adalah melakukan analisis mendalam terhadap versi software yang ditemukan:
👉 **[04. Service Identification & Master Decision Tree — Pentest GPS Navigator](/docs/service-identification-decision-tree)** (*Service Identification, Decision Tree, & Vulnerability Matching*)

### Mengapa File 04 Dibutuhkan Setelah Ini?
1. **Banner Grabbing Manual**: Mempelajari teknik mengambil informasi mentah menggunakan `nc`, `curl -I`, dan `telnet` ketika Nmap memberikan hasil ambigu.
2. **Kompilasi Database CVE & Exploit Matching**: Menghubungkan nomor versi yang didapat dari Nmap ke exploit nyata di Exploit-DB, GitHub PoC, dan Metasploit.
3. **Mendeteksi WAF & Defense Mechanism**: Mengetahui apakah service dilindungi oleh Cloudflare, ModSecurity, atau filtering reverse proxy sebelum meluncurkan exploit.

Buka file [04. Service Identification & Master Decision Tree — Pentest GPS Navigator](/docs/service-identification-decision-tree) dan mulailah menganalisis target Anda secara presisi!
