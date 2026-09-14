---
id: "01"
title: "01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental"
category: "1. Fondasi"
categoryId: "fondasi"
filename: "01_mindset_dan_metodologi.md"
refs_out: ["02"]
refs_in: ["02","03","13","14a","14c","15","16","26","61","62","63","64"]
---

# 01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental

---

## 🎯 Pendahuluan & Filosofi Dasar

Selamat datang di dunia *Penetration Testing* dan *Capture The Flag* (CTF). Menjadi seorang ethical hacker bukan sekadar menghafal perintah terminal atau menjalankan script otomatis (*script kiddie*). Keberhasilan seorang pentester 90% ditentukan oleh **pola pikir (mindset)**, **ketelitian observasi**, dan **metodologi kerja yang terstruktur**.

Dokumen ini adalah fondasi utama yang wajib dipahami sebelum menyentuh tool scanning seperti Nmap, exploit framework, atau script privilege escalation. Jadikan panduan ini sebagai pegangan dan *muscle memory* di sistem **Parrot OS XFCE** Anda.

---

## 🧠 1. Mindset Pentester

```text
+=============================================================================+
|                          THE HACKER MINDSET ENGINE                          |
+=============================================================================+
|                                                                             |
|   [ Defender Mindset ]                        [ Attacker Mindset ]          |
|   "Bagaimana cara mengamankan                 "Sistem ini dibuat untuk apa? |
|    semua pintu & jendela?"                     Asumsi apa yang dilanggar?   |
|                                                Bagaimana saya bisa meman-   |
|                                                faatkannya di luar desain?"  |
|                                                                             |
|         |                                           |                       |
|         v                                           v                       |
|   Harus benar 100% setiap saat                Hanya butuh 1 celah kecil     |
|   (Asymmetric Advantage)                      yang terlewatkan              |
+=============================================================================+
```

### 1.1 Cara Berpikir: Attacker vs Defender

Dunia keamanan siber adalah arena **peperangan asimetris (*asymmetric warfare*)**:

* **Defender (Blue Team)** harus mengamankan **semua** port, konfigurasi, source code, dan permission. Jika ada 1000 pintu dan 999 terkunci rapat tetapi 1 lupa dikunci, defender tetap gagal.
* **Attacker / Pentester (Red Team)** hanya membutuhkan **satu kesalahan kecil**, satu default password, satu port yang lupa ditutup, atau satu parameter yang tidak disanitasi untuk menembus perimeter.

> [!IMPORTANT]
> **Assume Breach Mentality**: Jangan pernah berasumsi sistem aman hanya karena tampilannya modern. Setiap software ditulis oleh manusia yang bisa membuat kesalahan. Tugas Anda adalah menemukan asumsi developer yang keliru (*broken assumptions*).

---

### 1.2 Perbedaan CTF vs Real Pentest

Dalam proses belajar, Anda akan banyak bermain CTF (*Hack The Box, TryHackMe, Proving Grounds*). Pahami perbedaan fundamental antara lingkungan CTF dan penetrasi dunia nyata agar Anda tidak kaget saat terjun ke industri profesional.

| Aspek                    | CTF (Capture The Flag)                                               | Real Penetration Testing                                                      |
| :----------------------- | :------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Tujuan Utama**         | Mencari *flag* (string acak seperti `THM{...}` atau `HTB{...}`)      | Mengidentifikasi risiko bisnis, celah keamanan, dan dampak nyata              |
| **Desain Lab**           | Sengaja dibuat memiliki celah (*intentional vulnerability / puzzle*) | Sistem riil yang didesain aman, namun memiliki cacat konfigurasi/kode         |
| **Scope (Cakupan)**      | Biasanya 1 mesin tunggal (*standalone*) atau lab kecil               | Luas (seluruh subnet, active directory, aplikasi web, cloud, karyawan)        |
| **Batasan Waktu**        | Fleksibel / bergantung kenyamanan pemain                             | Terikat kontrak (misal: 5-10 hari kerja)                                      |
| **Metode Celah**         | Seringkali ada jalur eksploitasi tunggal (*intended path*)           | Banyak variasi celah dari low-risk yang dirangkai (*exploit chaining*)        |
| **Output Akhir**         | Submit flag & dapat skor di leaderboard                              | Dokumen Laporan Eksekutif & Teknis Remediasi                                  |
| **Stealth / Kebisingan** | Bebas mengirim ribuan request (tanpa takut alarm)                    | Harus hati-hati agar tidak menjatuhkan server (*DoS*) atau terdeteksi WAF/SOC |

> [!NOTE]
> Gunakan CTF sebagai **taman bermain isolasi** untuk melatih skill teknis, pemahaman protokol, dan kecepatan problem-solving. Namun, terapkan standar pencatatan dan metodologi seperti real pentest.

---

### 1.3 Kenapa Enumeration adalah Segalanya ("Enumeration is Key")

Di forum-forum cybersecurity, Anda akan sering melihat pepatah:
> *"Try Harder? No, Enumerate Harder!"*

```text
+-----------------------------------------------------------------------------+
|                     DISTRIBUSI WAKTU PENTESTING EFEKTIF                     |
+-----------------------------------------------------------------------------+
|  [████████████████████████████████████░░░░░░░░░░░░░░░░] 75% ENUMERATION    |
|  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 15% EXPLOITATION    |
|  [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 10% REPORT & CLEAN  |
+-----------------------------------------------------------------------------+
```

**Analogi Dunia Nyata:**
Bayangkan Anda seorang inspektur kunci gedung. 
* Pemula yang buruk akan langsung mencoba mendobrak pintu depan dengan linggis (menembakkan exploit tanpa tahu target). Hasilnya: alarm berbunyi, linggis patah, dan waktu terbuang.
* Pentester handal akan mengitari gedung, memeriksa setiap jendela, membaca merk gembok di pintu belakang, mengecek apakah ada kunci cadangan di bawah keset, memeriksa ventilasi, dan mendengarkan suara di dalam. Ketika pintu belakang ternyata tidak terkunci sama sekali, ia masuk tanpa perlu mendobrak.

**Fakta Keras:**
Jika exploit Anda gagal, **bukan exploit-nya yang rusak — 90% masalahnya adalah Anda salah mengidentifikasi target (kurang enumerasi)**. Anda menembakkan exploit Apache 2.4.49 padahal server menjalankan Apache 2.4.50.

---

### 1.4 Prinsip "Low Hanging Fruit First"

Jangan pernah mencari celah rumit seperti *Memory Corruption / Binary Exploitation* jika Anda belum memeriksa hal-hal paling mendasar:

```text
               /\
              /  \      [LEVEL 4: 0-Day / Custom Binary Buffer Overflow]
             /----\      (Sangat jarang, butuh waktu berhari-hari)
            /      \
           /--------\    [LEVEL 3: Complex Web Exploitation / Deserialization]
          /          \   (Butuh analisis source code mendalam)
         /------------\
        /              \  [LEVEL 2: Known CVEs with Public POC]
       /----------------\ (Searchsploit, GitHub, Metasploit)
      /                  \
     /--------------------\ [LEVEL 1: LOW HANGING FRUITS]
    /                      \ (Default Creds: admin/admin, Anonymous FTP,
   /________________________\ Robots.txt, Exposed Backup Files .bak, SUID bash)
```

**Checklist Low Hanging Fruits:**
1. **Default Credentials**: `admin:admin`, `root:root`, `admin:password`, `guest:guest`, `tomcat:s3cret`.
2. **Anonymous Access**: FTP login `anonymous:anonymous`, SMB share tanpa password, NFS share terbuka.
3. **Information Disclosure**: File `robots.txt`, source code comment (`Ctrl+U`), backup files (`index.php.bak`, `config.php.old`, `.git/`).
4. **Outdated Common CMS**: WordPress plugin rentan, phpMyAdmin terekspos tanpa auth.

> [!TIP]
> Selalu habiskan 15 menit pertama untuk memetik *Low Hanging Fruits*. Seringkali mesin CTF atau server perusahaan jebol hanya karena kelalaian administrator mengganti password bawaan vendor!

---

### 1.5 Kenapa Dokumentasi itu Wajib

Banyak pemula berpikir mencatat itu membuang waktu. Ini adalah kesalahan fatal.
* **Memori Otak Manusia Terbatas**: Setelah mencoba 10 port dan 5 direktori web, Anda akan lupa kredensial apa yang sudah dicoba di form login mana.
* **Reproducibility (Bukti & Pengulangan)**: Temuan yang tidak bisa diulang langkah-langkahnya dianggap tidak pernah ada oleh klien atau penguji sertifikasi (seperti OSCP/eJPT).
* **Second Brain**: Catatan Anda hari ini adalah solusi instan untuk mesin CTF yang akan Anda hadapi 6 bulan lagi.

---

## 🔄 2. Metodologi Umum Pentest / CTF

Berikut adalah siklus hidup (*lifecycle*) standar penetrasi sistem yang harus menjadi urutan kerja otomatis di kepala Anda:

```text
+=============================================================================+
|                      STANDAR PENTEST / CTF LIFECYCLE                         |
+=============================================================================+
|                                                                             |
|   +---------------------------------------------------------------------+   |
|   |                        1. RECONNAISSANCE                            |   |
|   |  - Passive OSINT & Active Target Identification                     |   |
|   |  - Menentukan IP, domain, subnet, dan teknologi permukaan           |   |
|   +---------------------------------------------------------------------+   |
|                                      |                                      |
|                                      v                                      |
|   +---------------------------------------------------------------------+   |
|   |                        2. ENUMERATION                               |   |
|   |  - Port Scanning, Service Fingerprinting, Directory Fuzzing         |   |
|   |  - Menemukan banner, parameter, user, endpoint tersembunyi          |   |
|   +---------------------------------------------------------------------+   |
|                                      |                                      |
|                                      v                                      |
|   +---------------------------------------------------------------------+   |
|   |                        3. EXPLOITATION                              |   |
|   |  - Memanfaatkan celah (CVE, auth bypass, injection, misconfig)      |   |
|   |  - Mendapatkan Initial Foothold / Reverse Shell                     |   |
|   +---------------------------------------------------------------------+   |
|                                      |                                      |
|                                      v                                      |
|   +---------------------------------------------------------------------+   |
|   |                     4. POST-EXPLOITATION                            |   |
|   |  - Shell Stabilization, Internal Enum, Privilege Escalation         |   |
|   |  - Lateral Movement, Looting Flag / Sensitive Data                  |   |
|   +---------------------------------------------------------------------+   |
|                                      |                                      |
|                                      v                                      |
|   +---------------------------------------------------------------------+   |
|   |                    5. REPORTING & CLEANUP                           |   |
|   |  - Dokumentasi PoC, Timeline, Rekomendasi Mitigasi                  |   |
|   |  - Menghapus payload / backdoors yang dipasang                      |   |
|   +---------------------------------------------------------------------+   |
|                                                                             |
+=============================================================================+
```

### Rincian Setiap Fase:

#### 1. Reconnaissance (Pengumpulan Informasi)
* **Apa yang dicari:** Siapa targetnya? Berapa IP-nya? Apakah ada subdomain lain? Apakah target hidup (*alive*)?
* **Tools Utama:** `ping`, `whois`, `dig`, `nslookup`, `theHarvester`.
* **Output:** Daftar IP aktif, blok subnet, nama domain, informasi WHOIS.
* **Handover ke fase berikutnya:** Alamat IP target yang terverifikasi aktif untuk di-scan secara agresif.

#### 2. Enumeration (Pemeriksaan Mendalam)
* **Apa yang dicari:** Port apa yang terbuka? Daemon apa yang berjalan? Versi berapa (`Apache 2.4.41`, `OpenSSH 8.2p1`, `vsftpd 2.3.4`)? Direktori tersembunyi apa yang ada di web server?
* **Tools Utama:** `nmap`, `rustscan`, `gobuster`, `ffuf`, `nikto`, `smbclient`, `rpcclient`.
* **Output:** Pemetaan lengkap attack surface, daftar versi software spesifik, URL endpoints, list user potensial.
* **Handover ke fase berikutnya:** Titik masuk paling rentan (*vulnerable vector*) yang memiliki celah atau miskonfigurasi.

#### 3. Exploitation (Penetrasi & Initial Foothold)
* **Apa yang dicari:** Membuktikan kelemahan dan mendapatkan akses awal sebagai user biasa (*unprivileged shell* seperti `www-data` atau user lokal).
* **Tools Utama:** `msfconsole`, `searchsploit`, custom python/bash scripts, `netcat`, Burp Suite.
* **Output:** Sesi reverse shell interaktif di sistem target.
* **Handover ke fase berikutnya:** Akses terminal (*low-privilege shell*) dan kredensial user awal.

#### 4. Post-Exploitation & Privilege Escalation (Eskalasi Hak Akses)
* **Apa yang dicari:** Menstabilkan shell, memeriksa konfigurasi internal yang tidak bisa dilihat dari luar, mencari file konfigurasi berisi password database, memeriksa privilege `sudo -l`, SUID binaries, cron jobs, dan exploit kernel untuk menjadi `root` / `NT AUTHORITY\SYSTEM`.
* **Tools Utama:** `LinPEAS`, `WinPEAS`, `pspy`, `sudo`, `find`, `chisel` (untuk pivoting jaringan internal).
* **Output:** Akses administrator tertinggi (`root`), flag user & root (`user.txt`, `root.txt`), akses ke jaringan internal (*pivoting*).
* **Handover ke fase berikutnya:** Bukti kompromi penuh (*proof of concept*).

#### 5. Reporting & Cleanup (Pelaporan & Pembersihan)
* **Apa yang dicari:** Menyusun langkah reproduksi yang bersih, bukti screenshot, mitigasi yang bisa dilakukan oleh sysadmin, dan membersihkan artifact/temporary files di target.
* **Output:** Laporan akhir (*executive summary + technical writeup*).

---

## 🔍 3. Cara Membaca Output Tools

Saat menjalankan tool seperti Nmap, Gobuster, atau LinPEAS, terminal Anda akan dibanjiri ratusan hingga ribuan baris teks. Pemula sering merasa pusing (*overwhelmed*). Kuncinya adalah **filter and focus**.

```text
RAW OUTPUT (1000+ baris) ───[ Grep / Regex Filter ]───> SIGNAL (Informasi Kritis 5%)
                                                        NOISE (Info Standar 95% dibuang)
```

### 3.1 Teknik Identifikasi Informasi Penting

Gunakan hukum eliminasi:
1. **Abaikan yang Normal**: Port 80 menjalankan Apache standar versi terbaru tanpa direktori aneh? Abaikan sementara.
2. **Cari yang "Aneh / Tidak Standar"**:
   * Port tidak lazim terbuka (misal: port 8080, 8443, 9001, 1337, 31337).
   * Service versi usang (*legacy version* yang rilis 5-10 tahun lalu).
   * Header HTTP kustom (`X-Powered-By`, `Server: Werkzeug/0.16.1 Python/3.8`).
   * Direktori web dengan status code non-404 (`Status: 200`, `Status: 301`, `Status: 403`).

### 3.2 Linux Command Piping untuk Menyaring Output

Di Parrot OS, manfaatkan kekuatan Unix Pipe (`|`) agar tidak perlu membaca seluruh teks manual:

```bash
# 1. Menjalankan scan Nmap sambil menyimpan ke file teks dan menampilkannya di layar
nmap -sC -sV 10.10.10.10 | tee nmap_scan.txt
# KENAPA: 'tee' membagi output ke dua arah: terminal (agar bisa dilihat langsung) 
# dan file (agar tidak hilang saat terminal ditutup).

# 2. Mengambil hanya port yang TERBUKA dari hasil scan nmap
grep "open" nmap_scan.txt
# KENAPA: Menghilangkan baris "filtered", "closed", dan header yang tidak perlu.

# 3. Mencari kata kunci sensitif di dalam output linpeas atau dump file
grep -iE "password|pass|cred|token|secret|key" output_pe.txt
# KENAPA: '-i' (case-insensitive) dan '-E' (extended regex) mencari variasi kata penting.

# 4. Membaca output panjang secara bertahap
less -R output_pe.txt
# KENAPA: 'less' memungkinkan scroll atas/bawah dengan tombol panah/j/k, '-R' mempertahankan warna terminal.
```

---

### 3.3 Pattern yang Sering Muncul di CTF

Hampir semua lab CTF (*easy to medium*) mengikuti pola desain tertentu:

| Sinyal Output               | Makna Tersembunyi / Vektor Eksploitasi Potensial                                                                  |
| :-------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| **Port 21 (vsftpd)**        | Periksa Anonymous Login (`anonymous:anonymous`) atau versi `vsftpd 2.3.4` (Backdoor Smile).                       |
| **Port 22 (SSH)**           | Jarang dieksploitasi langsung; butuh dapat kredensial login atau file `id_rsa` (private key) dari web/SMB dahulu. |
| **Port 80/443 (HTTP)**      | Vektor utama: LFI/RFI, SQL Injection, Arbitrary File Upload, Command Injection.                                   |
| **Port 139/445 (SMB)**      | Periksa anonymous share / null session (`smbclient -N -L //IP`).                                                  |
| **Port 8080 / 8000**        | Web dev server, Jenkins, Tomcat (sering memiliki default credential seperti `admin:admin`).                       |
| **Port 3306 (MySQL)**       | Coba login remote user `root` tanpa password.                                                                     |
| **Custom Port (e.g. 9999)** | Custom binary / socket application yang butuh reverse engineering atau buffer overflow sederhana.                 |

---

### 3.4 Apa itu "Rabbit Hole" dan Cara Menghindarinya

```text
[ TARGET MESIN ] 
       │
       ├───> [ JALUR ASLI ] ──> Port 80 ──> Cek Source ──> Password DB ──> ROOT! (15 Menit)
       │
       └───> [ RABBIT HOLE ] ──> Port 8080 (Halaman Konstruksi kosong)
                                      └──> Bruteforce jutaan kata (Macet)
                                      └──> Mencoba exploit rumit tanpa dasar (Pusing)
                                      └──> Terjebak 4 Jam tanpa hasil!
```

> [!WARNING]
> **Definisi Rabbit Hole:** Jalur palsu, teknologi yang sengaja dibiarkan membingungkan, atau masalah non-vulnerable yang menghabiskan waktu berjam-jam tanpa memberikan progres apapun.

**Aturan Emas Menghindari Rabbit Hole:**
1. **Aturan 30 Menit (The 30-Minute Rule)**: Jika Anda mengutak-atik satu port/vektor selama 30 menit tanpa mendapatkan petunjuk baru sama sekali, **BERHENTI**. Kembali ke hasil Nmap scan awal dan telusuri port lain.
2. **Validasi Sebelum Bruteforce**: Jangan menjalankan wordlist 10 juta kata jika Anda belum yakin 100% parameter tersebut memang rentan terhadap bruteforce.
3. **Minta Bukti**: "Apakah ada bukti kuat teknologi ini rentan, atau saya hanya menebak-nebak?" Jika hanya tebak-tebakan, catat sebagai prioritas rendah.

---

## 📝 4. Note Taking Workflow

Kerapian catatan adalah pembeda antara amatir dan profesional. Kita akan menyiapkan struktur direktori rapi di **Parrot OS XFCE** Anda.

### 4.1 Rekomendasi Struktur Direktori Kerja di Parrot OS

```text
/home/user/
└── ctf/
    ├── htb/                    <-- Mesin Hack The Box
    │   └── 10.10.11.205_MonitorsTwo/
    │       ├── nmap/           <-- Output raw nmap (.nmap, .gnmap, .xml)
    │       ├── web/            <-- Gobuster, ffuf, request burp, source code
    │       ├── exploits/       <-- Script exploit yang didownload & diedit
    │       ├── loot/           <-- Flags, hashes, password dumps, id_rsa
    │       └── notes.md        <-- Catatan langkah per langkah
    ├── thm/                    <-- TryHackMe rooms
    └── tools/                  <-- Script otomatisasi & payload siap pakai
```

---

### 4.2 Bash Script Setup Folder Otomatis

Buat script bash pembantu ini agar setiap kali Anda mulai mengerjakan target baru, struktur folder dibuat dalam 1 detik.

Jalankan perintah ini di terminal Parrot OS Anda:

```bash
# 1. Pindah ke direktori home dan buat folder ctf utama
mkdir -p ~/ctf/tools ~/ctf/htb ~/ctf/thm

# 2. Buat script pembuat target otomatis
cat << 'EOF' > ~/ctf/tools/init_target.sh
#!/bin/bash

# Pastikan user memasukkan argumen yang cukup
if [ "$#" -ne 2 ]; then
    echo -e "\033[1;31m[-] Penggunaan: $0 <PLATFORM: htb/thm> <NAMA_TARGET_DAN_IP>\033[0m"
    echo -e "Contoh: $0 htb 10.10.11.205_MonitorsTwo"
    exit 1
fi

PLATFORM=$1
TARGET_NAME=$2
BASE_DIR="$HOME/ctf/$PLATFORM/$TARGET_NAME"

# Buat struktur folder
echo -e "\033[1;34m[*] Membuat struktur folder di: $BASE_DIR\033[0m"
mkdir -p "$BASE_DIR/nmap"
mkdir -p "$BASE_DIR/web"
mkdir -p "$BASE_DIR/exploits"
mkdir -p "$BASE_DIR/loot"

# Buat file template notes.md
cat << 'NOTE_EOF' > "$BASE_DIR/notes.md"
# Target: TARGET_REPLACE

- **IP Target:** 
- **OS:** 
- **Tingkat Kesulitan:** 
- **Tanggal Mulai:** 

---

## 1. Network Recon (Nmap Summary)
| Port | Protocol | Service | Version | Notes |
| :--- | :--- | :--- | :--- | :--- |
|      |          |         |         |       |

---

## 2. Web Enumeration
- **Technologies:** 
- **Hidden Directories:** 
- **Parameters & Input Forms:** 

---

## 3. Foothold / Initial Access
- **Vulnerability / CVE:** 
- **Exploit Used:** 
- **Credentials Found:** 
- **User Flag:** `cat ~/ctf/.../loot/user.txt`

---

## 4. Privilege Escalation
- **Internal Recon (linpeas/manual):** 
- **Vector (SUID/Sudo/Cron/Kernel):** 
- **Root Flag:** `cat ~/ctf/.../loot/root.txt`

---

## 5. Lessons Learned / Key Takeaways
- Mengapa celah ini bisa terjadi?
- Apa perintah baru yang saya pelajari hari ini?
NOTE_EOF

# Ganti placeholder nama di notes.md
sed -i "s/TARGET_REPLACE/$TARGET_NAME/g" "$BASE_DIR/notes.md"

echo -e "\033[1;32m[+] Sukses! Folder target siap. Ketik:\033[0m"
echo -e "cd $BASE_DIR"
EOF

# 3. Berikan permission execute pada script
chmod +x ~/ctf/tools/init_target.sh

# 4. Tambahkan alias di ~/.bashrc agar bisa dipanggil dari mana saja
echo "alias inittarget='~/ctf/tools/init_target.sh'" >> ~/.bashrc
source ~/.bashrc
```

**Penjelasan Mengapa Perintah Ini Dijalankan:**
* `mkdir -p`: Membuat folder beserta direktori induknya jika belum ada tanpa menghasilkan error.
* `cat << 'EOF'`: Menulis file multi-baris secara langsung ke dalam file script tanpa repot membuka editor teks.
* `sed -i`: Mengganti placeholder teks `TARGET_REPLACE` dengan nama target aktual secara otomatis.
* `chmod +x`: Memberikan izin eksekusi (*execute bit*) pada file script bash di Linux.
* `alias inittarget`: Membuat shortcut global di Parrot OS sehingga cukup mengetik `inittarget htb 10.10.11.50_Lame`.

---

### 4.3 Format Catatan Per Target (Markdown Template)

Gunakan text editor bawaan Parrot XFCE (`mousepad notes.md`) atau Obsidian. Selalu catat:
1. **Perintah yang berhasil DAN yang gagal** (agar tidak mengulang perintah yang salah).
2. **Kredensial yang didapat** (`username:password`).
3. **Lokasi flag** dan nilai hash-nya.
4. **Screenshot bukti eksekusi** (di Parrot XFCE, gunakan shortcut tombol `Print Screen` atau buka program `xfce4-screenshooter`).

---

## 🛑 5. Mindset Ketika Stuck (Buntu)

Setiap pentester — dari pemula hingga level master — pasti pernah mengalami kondisi *stuck*. Yang membedakan hacker sukses adalah **prosedur de-escalation** ketika macet.

```text
+=============================================================================+
|                       WHEN STUCK: THE UNSTICK PROTOCOL                      |
+=============================================================================+
|                                                                             |
|   1. AMBIL NAFAS (Step Back)                                                |
|      Tinggalkan layar selama 10-15 menit. Minum air, regangkan badan.        |
|                                                                             |
|   2. REVIEW CATATAN (Audit Your Trail)                                      |
|      Baca kembali notes.md dari baris pertama. Apa yang Anda lewati?        |
|                                                                             |
|   3. JALANKAN THE "DID I CHECK?" CHECKLIST                                  |
|      [ ] Apakah ada port UDP atau port TCP tinggi (10000-65535)?            |
|      [ ] Apakah ada subdomain / Virtual Host (VHost) yang belum di-fuzz?    |
|      [ ] Apakah sudah membaca source code HTML/JS (Ctrl+U)?                 |
|      [ ] Apakah sudah mencoba password reuse di SSH/FTP/Web?                |
|      [ ] Apakah ada file tersembunyi (hidden dot files `.env`, `.bash_hist`)|
|      [ ] Apakah sudah cek koneksi internal (netstat -tuln / ss -tuln)?      |
|                                                                             |
|   4. PROGRESSIVE WRITEUP HINT (Jika dalam konteks belajar)                  |
|      Buka writeup secara bertingkat, JANGAN baca solusi langsung!           |
+=============================================================================+
```

### 5.1 Checklist "Sudah Coba Apa Saja?"

Sebelum menyimpulkan Anda buntu total, tanyakan checklist ini:

```text
[ ] NETWORK SCANNING:
    - Apakah sudah full port scan (-p-)? (Bukan cuma top 1000).
    - Apakah sudah scan UDP port penting (snmp 161, tftp 69, dns 53)?

[ ] WEB APPLICATION:
    - Apakah sudah cek /robots.txt, /sitemap.xml, /.git/?
    - Apakah sudah fuzzing ekstensi file (.php, .txt, .bak, .old, .zip, .json)?
    - Apakah ada input field yang bisa disisipi tanda petik tunggal (') untuk cek SQLi?
    - Apakah ada cookie session yang bisa didecode (Base64/JWT)?

[ ] PRIVILEGE ESCALATION:
    - Apakah sudah cek 'sudo -l'?
    - Apakah sudah mencari SUID binary ('find / -perm -4000 2>/dev/null')?
    - Apakah ada cronjob yang berjalan sebagai root ('pspy' atau '/etc/crontab')?
    - Apakah ada password database di file konfigurasi web (wp-config.php, .env)?
```

---

### 5.2 Cara Membaca Writeup Tanpa Spoiler (Progressive Hints)

Bermain CTF tujuannya adalah belajar, bukan mengumpulkan poin palsu. Jika Anda stuck lebih dari 2 jam setelah menjalankan seluruh checklist:

```text
TINGKAT 1: THE VECTOR HINT
Buka writeup, scroll cepat HANYA untuk melihat subjudulnya.
Contoh subjudul: "SQL Injection on Login Parameter" -> STOP! Tutup writeup.
Sekarang Anda tahu jalurnya adalah SQLi, coba temukan payload-nya sendiri!
      │
      ▼ (Jika masih stuck 30 menit)
TINGKAT 2: THE TOOL HINT
Lihat tool apa yang dipakai penulis (misal: "sqlmap -u ... --os-shell").
Pelajari dokumentasi tool tersebut dan jalankan sendiri.
      │
      ▼ (Jika masih gagal)
TINGKAT 3: THE FULL WALKTHROUGH
Baca solusi lengkapnya. Pahami *MENGAPA* teknik itu berhasil dan *KENAPA* Anda
tadi melewatkannya. Catat teknik baru tersebut ke dalam personal knowledge base!
```

> [!TIP]
> Jadikan writeup sebagai **buku teks interaktif**, bukan contekan instan. Anda hanya benar-benar belajar ketika Anda memahami logika di balik eksploitasi tersebut.

---

## ❓ 6. Pertanyaan Kunci Pentester

Seorang pentester ulung selalu melakukan *internal dialogue* (dialog batin) di setiap langkah. Tanyakan pertanyaan-pertanyaan ini ke diri Anda sendiri:

```text
+=============================================================================+
|                      THE 5-PHASE INTERNAL DIALOGUE                          |
+=============================================================================+
```

### Fase 1: Network & Port Scanning
* *"Port berapa saja yang terbuka dan daemon apa yang mendengarkan (*listening*)?"*
* *"Apakah service ini versi bawaan distro (*default package*) atau aplikasi kustom?"*
* *"Berapa nomor versinya? Apakah versi ini memiliki CVE publik atau exploit di Searchsploit?"*

### Fase 2: Web Enumeration
* *"Web ini dibangun menggunakan framework apa (Node.js, PHP, Django, Flask, ASP.NET)?"*
* *"Di mana letak input pengguna (Form login, search bar, URL parameter, upload form, HTTP headers)?"*
* *"Apakah input tersebut diproses oleh database (SQLi), sistem operasi (Command Injection), atau dirender kembali ke browser (XSS)?"*
* *"Apakah ada direktori admin, backup, atau endpoint API yang tidak dilindungi autentikasi?"*

### Fase 3: Initial Foothold (Eksploitasi)
* *"Kredensial apa yang saya miliki saat ini? Bisakah dipakai ulang (*credential stuffing*) di service lain (SSH, FTP, Database)?"*
* *"Jika saya bisa mengunggah file, apakah server memvalidasi tipe file dan ekstensi?"*
* *"Apakah saya bisa mendapatkan reverse shell interaktif, atau hanya output terbatas (*blind / web shell*)?"*

### Fase 4: Post-Exploitation & Privilege Escalation
* *"Saya sekarang siapa (`whoami`) dan berada di grup apa (`id`)?"*
* *"Perintah apa yang diizinkan untuk dijalankan sebagai root tanpa password (`sudo -l`)?"*
* *"Binary apa saja yang memiliki SUID bit aktif milik root?"*
* *"Service internal apa yang mendengarkan koneksi di `127.0.0.1` yang sebelumnya tidak terlihat dari luar?"*
* *"Apakah ada file password, SSH private key (`id_rsa`), atau token API yang tertinggal di folder `/var/www/html/`, `/opt/`, atau `/home/`?"*

### Fase 5: Reporting
* *"Bagaimana cara saya menjelaskan temuan ini ke orang non-teknis (Manajer/Direktur)?"*
* *"Langkah mitigasi paling efektif apa yang harus diambil developer untuk menutup celah ini secara permanen?"*

---

## 🚀 7. Lanjut ke File Berikutnya

Selamat! Anda kini telah memiliki **peta navigasi mental**, metodologi terstruktur, dan pemahaman fundamental tentang alur kerja pentesting.

Sebelum kita mulai memindai port dan mengeksploitasi target, langkah wajib berikutnya adalah menyiapkan sistem operasi dan persenjataan tools Anda:
👉 **[02. Parrot OS Setup, Tools Ecosystem, dan Workspace Optimization](/docs/parrot-os-setup-dan-tools)** (*Parrot OS Setup, Tools Ecosystem, dan Workspace Optimization*)

### Mengapa File 02 Dibutuhkan Setelah Ini?
1. **Kesiapan Ekosistem Tools**: Mengetahui tools mana yang sudah pre-installed di Parrot OS XFCE dan mana yang harus dipasang manual (RustScan, Feroxbuster, NetExec, BloodHound-Python).
2. **Efisiensi Workspace (Tmux & Aliases)**: Mengonfigurasi terminal multi-pane dan shortcut perintah agar alur kerja Anda secepat refleks (*muscle memory*).
3. **Environment Management**: Mempersiapkan variabel target (`$TARGET`, `$LHOST`, `$LPORT`) untuk mencegah salah ketik dan mempercepat eksekusi perintah.

Buka file [02. Parrot OS Setup, Tools Ecosystem, dan Workspace Optimization](/docs/parrot-os-setup-dan-tools) dan siapkan stasiun kerja pentest Anda!
